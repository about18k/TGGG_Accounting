import uuid
import json
from decimal import Decimal, InvalidOperation
from django.conf import settings
import boto3
from core.storage_utils import build_storage_public_url, extract_object_key_from_url

from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import CustomUser
from todos.services import NotificationService
from .models import MaterialRequest, MaterialRequestItem, MaterialRequestComment, Project, PurchaseOrder, PurchaseOrderItem
from .serializers import (
    MaterialRequestApprovalSerializer,
    MaterialRequestSerializer,
    MaterialRequestCommentSerializer,
    ProjectSerializer,
    PurchaseOrderSerializer,
    PurchaseOrderItemSerializer,
)


def _notify_ceo_material_request_forwarded(material_request, actor):
    """Notify all active CEO/President users when Studio Head forwards a request."""
    recipients = (
        CustomUser.objects
        .filter(is_active=True, role__in=['ceo'])
        .exclude(id=actor.id)
    )

    for recipient in recipients:
        NotificationService.create_notification(
            recipient=recipient,
            actor=actor,
            notif_type='matreq_forwarded_to_ceo',
            title='Material Request Needs CEO Approval',
            message=(
                f'Studio Head forwarded material request "{material_request.project_name}" '
                'for your approval.'
            ),
        )


def _notify_studio_head_material_request_submitted(material_request, actor):
    """Notify active Studio Heads when a material request is submitted for review."""
    requester_role = str(getattr(material_request, 'requester_role', '') or '').replace('_', ' ').title()
    requester_label = requester_role or 'Requester'

    recipients = (
        CustomUser.objects
        .filter(is_active=True, role='studio_head')
        .exclude(id=actor.id)
    )

    for recipient in recipients:
        NotificationService.create_notification(
            recipient=recipient,
            actor=actor,
            notif_type='matreq_submitted_to_sh',
            title='Material Request Needs Studio Head Approval',
            message=(
                f'{requester_label} submitted "{material_request.project_name}" '
                'for Studio Head review.'
            ),
        )


def _notify_accounting_material_request_ceo_approved(material_request, actor):
    """Notify active Accounting users when CEO gives final approval."""
    recipients = (
        CustomUser.objects
        .filter(is_active=True, role='accounting')
        .exclude(id=actor.id)
    )

    for recipient in recipients:
        NotificationService.create_notification(
            recipient=recipient,
            actor=actor,
            notif_type='matreq_ceo_approved',
            title='Material Request Fully Approved',
            message=(
                f'CEO approved material request "{material_request.project_name}". '
                'It is now ready for Accounting processing.'
            ),
        )


def _notify_material_request_rejected(material_request, actor):
    """Notify the original requester when a material request is rejected."""
    requester = getattr(material_request, 'created_by', None)
    if not requester or not requester.is_active or requester.id == actor.id:
        return

    decision_role = 'Studio Head' if actor.role == 'studio_head' else 'CEO'
    NotificationService.create_notification(
        recipient=requester,
        actor=actor,
        notif_type='matreq_rejected',
        title='Material Request Rejected',
        message=(
            f'Your material request "{material_request.project_name}" was rejected by {decision_role}. '
            'Please review the comments and update your request if needed.'
        ),
    )


def upload_matreq_img_to_s3(file_obj, user_id):
    try:
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        file_extension = file_obj.name.split('.')[-1]
        import uuid
        file_path = f"{user_id}/matreq_{uuid.uuid4().hex}.{file_extension}"
        
        s3.upload_fileobj(
            file_obj,
            'matrequest-img',
            file_path,
            ExtraArgs={'ContentType': file_obj.content_type, 'ACL': 'public-read'}
        )
        
        return build_storage_public_url('matrequest-img', file_path)
    except Exception as e:
        raise Exception(f"Failed to upload image to S3: {str(e)}")

def remove_matreq_img_from_s3(public_url):
    if not public_url or "/matrequest-img/" not in public_url:
        return
        
    try:
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        old_path = extract_object_key_from_url(public_url, 'matrequest-img')
        if old_path:
            s3.delete_object(Bucket='matrequest-img', Key=old_path)
    except Exception as e:
        print(f"Failed to delete old material request image: {e}")

def upload_accounting_receipt_to_s3(file_obj, user_id):
    try:
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        file_extension = file_obj.name.split('.')[-1]
        import uuid
        file_path = f"{user_id}/receipt_{uuid.uuid4().hex}.{file_extension}"
        
        s3.upload_fileobj(
            file_obj,
            'accounting-receipt',
            file_path,
            ExtraArgs={'ContentType': file_obj.content_type, 'ACL': 'public-read'}
        )
        
        return build_storage_public_url('accounting-receipt', file_path)
    except Exception as e:
        raise Exception(f"Failed to upload receipt to S3: {str(e)}")


class MaterialRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    creator_roles = ['site_engineer', 'site_coordinator']

    @staticmethod
    def _is_studio_head_rejected(material_request):
        return (
            material_request.status == 'rejected'
            and material_request.reviewed_by_studio_head_id is not None
            and material_request.reviewed_by_ceo_id is None
        )

    @staticmethod
    def _visible_to_ceo_queryset():
        return MaterialRequest.objects.filter(
            Q(status='pending_review', reviewed_by_studio_head__isnull=False)
            | Q(status='approved', reviewed_by_ceo__isnull=False)
            | Q(status='rejected', reviewed_by_ceo__isnull=False)
        )

    def get_queryset(self):
        user = self.request.user
        queryset = MaterialRequest.objects.none()

        if user.role == 'site_engineer':
            queryset = MaterialRequest.objects.filter(created_by=user).filter(
                Q(requester_role='site_engineer') |
                Q(requester_role__isnull=True) |
                Q(requester_role='')
            )
        elif user.role == 'site_coordinator':
            queryset = MaterialRequest.objects.filter(
                created_by=user,
                requester_role='site_coordinator',
            )
        elif user.role == 'studio_head':
            queryset = MaterialRequest.objects.filter(
                Q(status__in=['pending_review', 'approved', 'rejected'])
            )
        elif user.role in ['ceo']:
            queryset = self._visible_to_ceo_queryset()
        elif user.role == 'accounting':
            queryset = MaterialRequest.objects.filter(status='approved')

        return queryset.select_related(
            'created_by',
            'reviewed_by_studio_head',
            'reviewed_by_ceo',
        ).prefetch_related('items')

    def get_serializer_class(self):
        if self.action == 'approval_action':
            return MaterialRequestApprovalSerializer
        return MaterialRequestSerializer

    def create(self, request, *args, **kwargs):
        if request.user.role not in self.creator_roles:
            return Response(
                {'error': 'Only Site Engineers and Site Coordinators can create material requests.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()

        request_image_file = request.FILES.get('request_image')
        if request_image_file:
            if 'request_image' in data and hasattr(data, 'pop'):
                # URLField expects a URL string, not file payload.
                data.pop('request_image')
            try:
                public_url = upload_matreq_img_to_s3(request_image_file, request.user.id)
                if public_url:
                    data['request_image'] = public_url
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        material_request = self.get_object()

        if material_request.created_by != request.user:
            return Response(
                {'error': 'You can only edit your own material requests.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        can_edit = (
            material_request.status == 'draft'
            or self._is_studio_head_rejected(material_request)
        )

        if not can_edit:
            return Response(
                {'error': 'Only draft or Studio Head-rejected material requests can be edited.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = request.data.copy()
        
        request_image_file = request.FILES.get('request_image')
        if request_image_file:
            if 'request_image' in data:
                if hasattr(data, 'pop'):
                    data.pop('request_image')
            try:
                public_url = upload_matreq_img_to_s3(request_image_file, request.user.id)
                if public_url:
                    if material_request.request_image:
                        remove_matreq_img_from_s3(material_request.request_image)
                    data['request_image'] = public_url
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if 'request_image' in data and data['request_image'] in [None, 'null', '']:
                if material_request.request_image:
                    remove_matreq_img_from_s3(material_request.request_image)
                data['request_image'] = None

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(material_request, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        material_request = self.get_object()

        if material_request.created_by != request.user:
            return Response(
                {'error': 'You can only delete your own material requests.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if material_request.status != 'draft':
            return Response(
                {'error': 'Only draft material requests can be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if material_request.request_image:
            remove_matreq_img_from_s3(material_request.request_image)

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        material_request = self.get_object()

        if material_request.created_by != request.user:
            return Response(
                {'error': 'You can only submit your own material requests.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        can_resubmit_after_studio_head_rejection = self._is_studio_head_rejected(material_request)

        if material_request.status != 'draft' and not can_resubmit_after_studio_head_rejection:
            return Response(
                {'error': 'Only draft or Studio Head-rejected material requests can be submitted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not material_request.items.exists() and not material_request.request_image:
            return Response(
                {'error': 'Add at least one material item or an uploaded image before submitting.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        update_fields = ['status', 'updated_at']

        if can_resubmit_after_studio_head_rejection:
            material_request.reviewed_by_studio_head = None
            material_request.studio_head_reviewed_at = None
            material_request.studio_head_comments = ''
            update_fields.extend([
                'reviewed_by_studio_head',
                'studio_head_reviewed_at',
                'studio_head_comments',
            ])

        material_request.status = 'pending_review'
        material_request.save(update_fields=update_fields)

        try:
            _notify_studio_head_material_request_submitted(material_request, request.user)
        except Exception as exc:
            print(f"⚠️ Material request Studio Head notification failed for request_id={material_request.id}: {exc}")

        serializer = MaterialRequestSerializer(material_request, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approval_action(self, request, pk=None):
        material_request = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_type = serializer.validated_data['action']
        comments = serializer.validated_data.get('comments', '')
        user = request.user

        if user.role == 'studio_head':
            if material_request.status != 'pending_review':
                return Response(
                    {'error': 'Material request must be pending review.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if material_request.reviewed_by_studio_head_id:
                return Response(
                    {'error': 'Material request has already been reviewed by Studio Head.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if action_type == 'approve':
                material_request.approve_studio_head(user, comments)
                try:
                    _notify_ceo_material_request_forwarded(material_request, user)
                except Exception as exc:
                    print(f"⚠️ Material request CEO notification failed for request_id={material_request.id}: {exc}")
                return Response(
                    {'message': 'Material request approved and forwarded to CEO.'},
                    status=status.HTTP_200_OK,
                )

            material_request.reject(user, comments, is_studio_head=True)
            try:
                _notify_material_request_rejected(material_request, user)
            except Exception as exc:
                print(f"⚠️ Material request rejection notification failed for request_id={material_request.id}: {exc}")
            return Response(
                {'message': 'Material request rejected.'},
                status=status.HTTP_200_OK,
            )

        if user.role in ['ceo']:
            if material_request.status != 'pending_review':
                return Response(
                    {'error': 'Material request must be pending review.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not material_request.reviewed_by_studio_head_id:
                return Response(
                    {'error': 'Material request must first pass Studio Head review.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if material_request.reviewed_by_ceo_id:
                return Response(
                    {'error': 'Material request has already been reviewed by the CEO.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if action_type == 'approve':
                material_request.approve_ceo(user, comments)
                try:
                    _notify_accounting_material_request_ceo_approved(material_request, user)
                except Exception as exc:
                    print(f"⚠️ Material request Accounting notification failed for request_id={material_request.id}: {exc}")
                return Response(
                    {'message': 'Material request approved.'},
                    status=status.HTTP_200_OK,
                )

            material_request.reject(user, comments, is_studio_head=False)
            try:
                _notify_material_request_rejected(material_request, user)
            except Exception as exc:
                print(f"⚠️ Material request rejection notification failed for request_id={material_request.id}: {exc}")
            return Response(
                {'message': 'Material request rejected.'},
                status=status.HTTP_200_OK,
            )

        return Response(
            {'error': 'You do not have permission to approve material requests.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    @action(detail=True, methods=['patch'])
    def allocate_funds(self, request, pk=None):
        return Response(
            {'error': 'Allocation of funds is deprecated. Please use Purchase Order Tally instead.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        """
        GET  /material-requests/{id}/comments/ – list threaded comments for this request
        POST /material-requests/{id}/comments/ – post a new comment or reply
        """
        material_request = self.get_object()  # respects get_queryset permission scoping

        if request.method == 'GET':
            top_level = (
                material_request.comments
                .filter(parent__isnull=True)
                .select_related('author')
                .prefetch_related('replies__author')
            )
            serializer = MaterialRequestCommentSerializer(top_level, many=True)
            return Response(serializer.data)

        # POST – create comment or reply
        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'error': 'Comment content cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        # Check permissions for commenting
        allowed_roles = ['studio_head', 'ceo', 'site_coordinator', 'site_engineer']
        if request.user.role not in allowed_roles:
            return Response(
                {'error': 'You do not have permission to comment on this request.'},
                status=status.HTTP_403_FORBIDDEN
            )

        parent_id = request.data.get('parent_id')
        parent = None
        if parent_id:
            try:
                parent = MaterialRequestComment.objects.get(id=parent_id, material_request=material_request)
            except MaterialRequestComment.DoesNotExist:
                return Response({'error': 'Parent comment not found.'}, status=status.HTTP_404_NOT_FOUND)
            
            # Flatten to one level like BIM: if replying to a reply, attach to its root
            if parent.parent_id is not None:
                parent = MaterialRequestComment.objects.get(id=parent.parent_id)

        comment = MaterialRequestComment.objects.create(
            material_request=material_request,
            author=request.user,
            content=content,
            parent=parent,
        )
        serializer = MaterialRequestCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch', 'delete'], url_path='comments/(?P<comment_id>[^/.]+)')
    def comment_detail(self, request, pk=None, comment_id=None):
        """
        PATCH  /material-requests/{id}/comments/{comment_id}/ – edit a comment
        DELETE /material-requests/{id}/comments/{comment_id}/ – delete a comment
        """
        material_request = self.get_object()
        try:
            comment = MaterialRequestComment.objects.get(id=comment_id, material_request=material_request)
        except MaterialRequestComment.DoesNotExist:
            return Response({'error': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Only the author can edit/delete their own comments
        if comment.author != request.user:
            return Response(
                {'error': 'You can only edit or delete your own comments'},
                status=status.HTTP_403_FORBIDDEN
            )

        # System comments cannot be edited or deleted
        if comment.is_system_comment:
            return Response(
                {'error': 'System comments cannot be modified'},
                status=status.HTTP_403_FORBIDDEN
            )

        if request.method == 'PATCH':
            content = (request.data.get('content') or '').strip()
            if not content:
                return Response(
                    {'error': 'Comment content cannot be empty'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            comment.content = content
            comment.save(update_fields=['content', 'updated_at'])
            serializer = MaterialRequestCommentSerializer(comment)
            return Response(serializer.data)

        elif request.method == 'DELETE':
            # Delete the comment and all its replies
            comment.delete()
            return Response(
                {'message': 'Comment deleted successfully'},
                status=status.HTTP_200_OK
            )


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProjectSerializer
    creator_roles = ['site_engineer', 'site_coordinator']

    def get_queryset(self):
        user = self.request.user

        if user.role in self.creator_roles:
            # Site Engineers and Coordinators can see all projects (for visibility across the site)
            return Project.objects.all().select_related('created_by').distinct()
        elif user.role in ['studio_head', 'ceo', 'accounting']:
            # See all projects that have at least one submitted mat req
            return Project.objects.filter(
                material_requests__status__in=['pending_review', 'approved', 'rejected']
            ).distinct().select_related('created_by')
        return Project.objects.none()

    def create(self, request, *args, **kwargs):
        if request.user.role not in self.creator_roles:
            return Response(
                {'error': 'Only Site Engineers and Site Coordinators can create projects.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        project = self.get_object()
        if project.created_by != request.user:
            return Response(
                {'error': 'You can only edit your own projects.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        if project.created_by != request.user:
            return Response(
                {'error': 'You can only delete your own projects.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'], url_path='approved-requests')
    def approved_requests(self, request, pk=None):
        """Return approved material requests for this project."""
        project = self.get_object()
        approved = MaterialRequest.objects.filter(
            project=project,
            status='approved',
        ).select_related(
            'created_by',
            'reviewed_by_studio_head',
            'reviewed_by_ceo',
        ).prefetch_related('items')
        serializer = MaterialRequestSerializer(approved, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='recent-approved-requests')
    def recent_approved_requests(self, request):
        """Return recent approved material requests across all projects (limit: 10)."""
        approved_requests = MaterialRequest.objects.filter(
            status='approved',
        ).order_by('-ceo_reviewed_at').select_related(
            'project',
            'created_by',
            'reviewed_by_studio_head',
            'reviewed_by_ceo',
        ).prefetch_related('items')[:10]
        
        serializer = MaterialRequestSerializer(approved_requests, many=True, context={'request': request})
        return Response(serializer.data)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PurchaseOrderSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = PurchaseOrder.objects.all()

        if user.role == 'studio_head':
            pass
        elif user.role == 'ceo':
            queryset = queryset.filter(status__in=['pending_approval', 'approved', 'rejected'])
        elif user.role == 'accounting':
            queryset = queryset.filter(status__in=['approved', 'rejected'])
        elif user.role in ['site_engineer', 'site_coordinator']:
            queryset = queryset.filter(material_request__created_by=user)
        else:
            queryset = PurchaseOrder.objects.none()

        return queryset.select_related(
            'material_request', 'prepared_by', 'approved_by', 'tallied_by'
        ).prefetch_related('items')

    def perform_create(self, serializer):
        mr = serializer.validated_data['material_request']
        supplier = serializer.validated_data['supplier']
        supplier_code = supplier.replace(' ', '').upper()[:3]
        year = timezone.now().year
        
        count = PurchaseOrder.objects.filter(material_request=mr, supplier=supplier).count() + 1
        po_number = f"PO-{year}-{mr.id}-{supplier_code}-{count}"
        
        serializer.save(
            po_number=po_number,
            prepared_by=self.request.user,
            status='draft'
        )

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        po = self.get_object()
        if request.user.role != 'studio_head':
            return Response({'error': 'Only the Studio Head can submit Purchase Orders.'}, status=status.HTTP_403_FORBIDDEN)
        if po.status != 'draft':
            return Response({'error': 'Only draft Purchase Orders can be submitted.'}, status=status.HTTP_400_BAD_REQUEST)
        
        po.status = 'pending_approval'
        po.save(update_fields=['status'])
        
        try:
            ceos = CustomUser.objects.filter(is_active=True, role='ceo')
            for ceo in ceos:
                NotificationService.create_notification(
                    recipient=ceo,
                    actor=request.user,
                    notif_type='po_pending_approval',
                    title='PO Pending Approval',
                    message=f'Studio Head submitted Purchase Order "{po.po_number}" for your approval.',
                )
        except Exception as e:
            print(f"Failed to notify CEO for PO {po.id}: {e}")

        return Response(PurchaseOrderSerializer(po, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        po = self.get_object()
        if request.user.role != 'ceo':
            return Response({'error': 'Only the CEO can approve Purchase Orders.'}, status=status.HTTP_403_FORBIDDEN)
        if po.status != 'pending_approval':
            return Response({'error': 'Purchase Order must be pending approval.'}, status=status.HTTP_400_BAD_REQUEST)
        
        po.status = 'approved'
        po.approved_by = request.user
        po.approved_at = timezone.now()
        po.save(update_fields=['status', 'approved_by', 'approved_at'])

        try:
            recipients = CustomUser.objects.filter(is_active=True, role__in=['studio_head', 'accounting'])
            for r in recipients:
                NotificationService.create_notification(
                    recipient=r,
                    actor=request.user,
                    notif_type='po_approved',
                    title='Purchase Order Approved',
                    message=f'CEO approved Purchase Order "{po.po_number}".',
                )
        except Exception as e:
            print(f"Failed to notify roles for PO approval {po.id}: {e}")

        return Response(PurchaseOrderSerializer(po, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        po = self.get_object()
        reason = request.data.get('reason', '')
        if not reason:
            return Response({'error': 'A rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role != 'ceo':
            return Response({'error': 'Only the CEO can reject Purchase Orders.'}, status=status.HTTP_403_FORBIDDEN)
        if po.status != 'pending_approval':
            return Response({'error': 'Purchase Order must be pending approval.'}, status=status.HTTP_400_BAD_REQUEST)
        
        po.status = 'rejected'
        po.rejection_reason = reason
        po.save(update_fields=['status', 'rejection_reason'])

        try:
            studio_heads = CustomUser.objects.filter(is_active=True, role='studio_head')
            for sh in studio_heads:
                NotificationService.create_notification(
                    recipient=sh,
                    actor=request.user,
                    notif_type='po_rejected',
                    title='Purchase Order Rejected',
                    message=f'CEO rejected Purchase Order "{po.po_number}". Reason: {reason}',
                )
        except Exception as e:
            print(f"Failed to notify Studio Head for PO rejection {po.id}: {e}")

        return Response(PurchaseOrderSerializer(po, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def tally_disbursement(self, request, pk=None):
        po = self.get_object()
        if request.user.role != 'accounting':
            return Response({'error': 'Only Accounting can tally disbursements.'}, status=status.HTTP_403_FORBIDDEN)
        if po.status != 'approved':
            return Response({'error': 'Purchase Order must be approved first.'}, status=status.HTTP_400_BAD_REQUEST)
        
        tally_notes = request.data.get('tally_notes', '')
        receipt_file = request.FILES.get('receipt')

        po.is_tallied = True
        po.tally_notes = tally_notes
        po.tallied_by = request.user
        po.tallied_at = timezone.now()

        if receipt_file:
            try:
                public_url = upload_accounting_receipt_to_s3(receipt_file, request.user.id)
                po.tally_receipt = public_url
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        po.save(update_fields=['is_tallied', 'tally_notes', 'tallied_by', 'tallied_at', 'tally_receipt'])

        try:
            MaterialRequestComment.objects.create(
                material_request=po.material_request,
                author=request.user,
                content=f"Accounting Tally Check: Disbursements settled for {po.supplier} PO ({po.po_number}).",
                is_system_comment=True
            )
        except Exception as e:
            print(f"Failed to post tally comment on MR {po.material_request.id}: {e}")

        return Response(PurchaseOrderSerializer(po, context={'request': request}).data)
