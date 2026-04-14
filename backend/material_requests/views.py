import uuid
import json
from decimal import Decimal, InvalidOperation
from django.conf import settings
from supabase import create_client, Client

from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import CustomUser
from todos.services import NotificationService
from .models import MaterialRequest, MaterialRequestComment, Project
from .serializers import (
    MaterialRequestApprovalSerializer,
    MaterialRequestSerializer,
    MaterialRequestCommentSerializer,
    ProjectSerializer,
)


def _notify_ceo_material_request_forwarded(material_request, actor):
    """Notify all active CEO/President users when Studio Head forwards a request."""
    recipients = (
        CustomUser.objects
        .filter(is_active=True, role__in=['ceo', 'president'])
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
    """Notify active Accounting users when CEO/president gives final approval."""
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


def upload_matreq_img_to_supabase(file_obj, user_id):
    supabase_url = getattr(settings, 'SUPABASE_URL', None)
    supabase_key = getattr(settings, 'SUPABASE_KEY', None)
    if not supabase_url or not supabase_key:
        return None
    
    supabase: Client = create_client(supabase_url, supabase_key)
    file_extension = file_obj.name.split('.')[-1]
    file_path = f"{user_id}/matreq_{uuid.uuid4().hex}.{file_extension}"
    
    file_content = file_obj.read()
    try:
        supabase.storage.from_('matrequest_img').upload(
            file=file_content,
            path=file_path,
            file_options={'content-type': file_obj.content_type, 'upsert': 'true'}
        )
    except Exception as e:
        raise Exception(f"Failed to upload image to Supabase: {str(e)}")
        
    public_url = supabase.storage.from_('matrequest_img').get_public_url(file_path)
    return public_url

def remove_matreq_img_from_supabase(public_url):
    if not public_url or "supabase.co/storage/v1/object/public/matrequest_img/" not in public_url:
        return
    supabase_url = getattr(settings, 'SUPABASE_URL', None)
    supabase_key = getattr(settings, 'SUPABASE_KEY', None)
    if not supabase_url or not supabase_key:
        return
    
    supabase: Client = create_client(supabase_url, supabase_key)
    try:
        old_path = public_url.split("matrequest_img/")[-1]
        supabase.storage.from_('matrequest_img').remove([old_path])
    except Exception as e:
        print(f"Failed to delete old material request image: {e}")

def upload_accounting_receipt_to_supabase(file_obj, user_id):
    supabase_url = getattr(settings, 'SUPABASE_URL', None)
    supabase_key = getattr(settings, 'SUPABASE_KEY', None)
    if not supabase_url or not supabase_key:
        return None
    
    supabase: Client = create_client(supabase_url, supabase_key)
    file_extension = file_obj.name.split('.')[-1]
    file_path = f"{user_id}/receipt_{uuid.uuid4().hex}.{file_extension}"
    
    file_content = file_obj.read()
    try:
        supabase.storage.from_('accounting_receipt').upload(
            file=file_content,
            path=file_path,
            file_options={'content-type': file_obj.content_type, 'upsert': 'true'}
        )
    except Exception as e:
        raise Exception(f"Failed to upload receipt to Supabase: {str(e)}")
        
    public_url = supabase.storage.from_('accounting_receipt').get_public_url(file_path)
    return public_url


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
        elif user.role in ['ceo', 'president']:
            queryset = self._visible_to_ceo_queryset()
        elif user.role == 'accounting':
            queryset = MaterialRequest.objects.filter(status='approved')
        elif user.role == 'admin':
            queryset = MaterialRequest.objects.all()

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
                public_url = upload_matreq_img_to_supabase(request_image_file, request.user.id)
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
                public_url = upload_matreq_img_to_supabase(request_image_file, request.user.id)
                if public_url:
                    if material_request.request_image:
                        remove_matreq_img_from_supabase(material_request.request_image)
                    data['request_image'] = public_url
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if 'request_image' in data and data['request_image'] in [None, 'null', '']:
                if material_request.request_image:
                    remove_matreq_img_from_supabase(material_request.request_image)
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
            remove_matreq_img_from_supabase(material_request.request_image)

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

        if user.role in ['ceo', 'president']:
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
        if request.user.role != 'accounting':
            return Response(
                {'error': 'Only accounting can allocate funds.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        material_request = self.get_object()

        if material_request.status != 'approved':
            return Response(
                {'error': 'Material request must be approved before funds can be allocated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        budget_allocated = request.data.get('budget_allocated')
        accounting_notes = request.data.get('accounting_notes', '')

        if not budget_allocated:
            return Response(
                {'error': 'Budget allocated amount is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            budget_val = Decimal(str(budget_allocated))
        except (InvalidOperation, TypeError, ValueError):
            return Response(
                {'error': 'Invalid budget amount.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item_discounts_raw = request.data.get('item_discounts', [])
        if isinstance(item_discounts_raw, str):
            try:
                item_discounts_raw = json.loads(item_discounts_raw)
            except (TypeError, ValueError):
                return Response(
                    {'error': 'Invalid item_discounts payload.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if item_discounts_raw is None:
            item_discounts_raw = []

        if not isinstance(item_discounts_raw, list):
            return Response(
                {'error': 'item_discounts must be a list.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request_items = list(material_request.items.all())
        request_items_by_id = {item.id: item for item in request_items}
        updated_items_count = 0
        total_discount_value = Decimal('0.00')

        for entry in item_discounts_raw:
            if not isinstance(entry, dict):
                return Response(
                    {'error': 'Each item_discounts entry must be an object.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            item_id_raw = entry.get('id')
            try:
                item_id = int(item_id_raw)
            except (TypeError, ValueError):
                return Response(
                    {'error': f'Invalid material item id: {item_id_raw}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if item_id not in request_items_by_id:
                return Response(
                    {'error': f'Invalid material item id: {item_id}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                discount_val = Decimal(str(entry.get('discount', '0')))
            except (InvalidOperation, TypeError, ValueError):
                return Response(
                    {'error': f'Invalid discount value for item id {item_id}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if discount_val < 0:
                return Response(
                    {'error': f'Discount cannot be negative for item id {item_id}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            item = request_items_by_id[item_id]
            gross_total = item.quantity * item.price
            if discount_val > gross_total:
                return Response(
                    {'error': f'Discount cannot exceed gross total for "{item.name}".'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            new_total = gross_total - discount_val
            if item.discount != discount_val or item.total != new_total:
                item.discount = discount_val
                item.total = new_total
                item.save(update_fields=['discount', 'total'])
                updated_items_count += 1

            total_discount_value += discount_val

        from django.utils import timezone

        # Handle accounting_receipt upload
        accounting_receipt_file = request.FILES.get('accounting_receipt')
        if accounting_receipt_file:
            try:
                public_url = upload_accounting_receipt_to_supabase(accounting_receipt_file, request.user.id)
                material_request.accounting_receipt = public_url
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        material_request.budget_allocated = budget_val
        material_request.accounting_notes = accounting_notes
        material_request.accounting_status = 'funds_released'
        material_request.fund_release_date = timezone.now()

        update_fields = [
            'budget_allocated',
            'accounting_notes',
            'accounting_status',
            'fund_release_date',
            'updated_at'
        ]
        if material_request.accounting_receipt:
            update_fields.append('accounting_receipt')

        material_request.save(update_fields=update_fields)

        # Create system comment for audit trail
        discount_note = (
            f" Item discounts updated: {updated_items_count} item(s), "
            f"total discount ₱{total_discount_value:,.2f}."
            if item_discounts_raw else ""
        )
        MaterialRequestComment.objects.create(
            material_request=material_request,
            author=request.user,
            content=(
                f"Accounting Decision: Funds Released (₱{budget_val:,.2f})."
                f"{discount_note} Note: {accounting_notes}"
            ) if accounting_notes else (
                f"Accounting Decision: Funds Released (₱{budget_val:,.2f}).{discount_note}"
            ),
            is_system_comment=True
        )

        serializer = MaterialRequestSerializer(material_request, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

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
        allowed_roles = ['studio_head', 'ceo', 'president', 'site_coordinator', 'site_engineer']
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


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProjectSerializer
    creator_roles = ['site_engineer', 'site_coordinator']

    def get_queryset(self):
        user = self.request.user

        if user.role in self.creator_roles:
            # Site Engineers and Coordinators can see all projects (for visibility across the site)
            return Project.objects.all().select_related('created_by').distinct()
        elif user.role in ['studio_head', 'ceo', 'president', 'accounting', 'admin']:
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
