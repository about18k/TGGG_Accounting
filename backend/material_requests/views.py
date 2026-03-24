import uuid
from django.conf import settings
from supabase import create_client, Client

from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import MaterialRequest, MaterialRequestComment
from .serializers import (
    MaterialRequestApprovalSerializer,
    MaterialRequestSerializer,
    MaterialRequestCommentSerializer
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
            if 'request_image' in data:
                # DRF throws an error if we pass a file payload to a URLField, so we remove the file object
                if hasattr(data, 'pop'):
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
                return Response(
                    {'message': 'Material request approved and forwarded to CEO.'},
                    status=status.HTTP_200_OK,
                )

            material_request.reject(user, comments, is_studio_head=True)
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
                return Response(
                    {'message': 'Material request approved.'},
                    status=status.HTTP_200_OK,
                )

            material_request.reject(user, comments, is_studio_head=False)
            return Response(
                {'message': 'Material request rejected.'},
                status=status.HTTP_200_OK,
            )

        return Response(
            {'error': 'You do not have permission to approve material requests.'},
            status=status.HTTP_403_FORBIDDEN,
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
