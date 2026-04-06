from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Q
import logging
import os

from accounts.models import CustomUser
from todos.services import NotificationService
from .models import BimDocumentation, BimDocumentationFile, BimDocumentationComment
from .serializers import (
    BimDocumentationSerializer,
    BimDocumentationListSerializer,
    BimDocumentationDetailSerializer,
    BimDocumentationApprovalSerializer,
    BimDocumentationFileSerializer,
    BimDocumentationCommentSerializer,
)
from .supabase_storage import upload_file_to_supabase, delete_file_from_supabase
from .tasks import upload_file_async

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'}
DOCUMENT_EXTENSIONS = {'.pdf', '.doc', '.docx'}


def _is_image_upload(file_obj):
    content_type = str(getattr(file_obj, 'content_type', '') or '').lower()
    if content_type.startswith('image/'):
        return True
    _, ext = os.path.splitext(str(getattr(file_obj, 'name', '') or '').lower())
    return ext in IMAGE_EXTENSIONS


def _is_document_upload(file_obj):
    """Check if file is a document file (PDF or Word)."""
    content_type = str(getattr(file_obj, 'content_type', '') or '').lower()
    if content_type == 'application/pdf':
        return True
    if content_type.startswith('application/msword'):
        return True
    if content_type.startswith('application/vnd.openxmlformats'):
        return True
    _, ext = os.path.splitext(str(getattr(file_obj, 'name', '') or '').lower())
    return ext in DOCUMENT_EXTENSIONS


def _is_image_or_document_upload(file_obj):
    """Check if file is an image or document file (image, PDF, or Word)."""
    return _is_image_upload(file_obj) or _is_document_upload(file_obj)


def _doc_has_image_attachment(doc):
    files_qs = doc.files.all()
    for file_obj in files_qs:
        if str(file_obj.file_type or '').lower() == 'image':
            return True
        _, ext = os.path.splitext(str(file_obj.file_name or '').lower())
        if ext in IMAGE_EXTENSIONS:
            return True
    return False


def _doc_has_file_attachment(doc):
    """Check if documentation has any file attachment (image, PDF, or Word)."""
    files_qs = doc.files.all()
    if not files_qs.exists():
        return False
    for file_obj in files_qs:
        if _is_image_or_document_upload(file_obj):
            return True
        # Also check by file_name extension
        _, ext = os.path.splitext(str(file_obj.file_name or '').lower())
        if ext in IMAGE_EXTENSIONS or ext in DOCUMENT_EXTENSIONS:
            return True
    return False


def _notify_ceo_documentation_forwarded(doc, actor):
    """Notify all active CEO/President users when Studio Head forwards a doc."""
    creator_role = str(getattr(doc.created_by, 'role', '') or '').strip().lower()
    if creator_role in ['junior_architect', 'junior_designer']:
        doc_origin = "Junior Architect documentation"
    elif creator_role == 'bim_specialist':
        doc_origin = "BIM Specialist documentation"
    else:
        doc_origin = "documentation"

    recipients = (
        CustomUser.objects
        .filter(is_active=True, role__in=['ceo', 'president'])
        .exclude(id=actor.id)
    )

    for recipient in recipients:
        NotificationService.create_notification(
            recipient=recipient,
            actor=actor,
            notif_type='bim_forwarded_to_ceo',
            title='Documentation Needs CEO Approval',
            message=(
                f'Studio Head forwarded {doc_origin}: "{doc.title}". '
                'Please review and approve or reject.'
            ),
        )


def _notify_studio_head_documentation_submitted(doc, actor):
    """Notify active Studio Heads when documentation is submitted for review."""
    creator_role = str(getattr(doc.created_by, 'role', '') or '').strip().lower()
    if creator_role in ['junior_architect', 'junior_designer']:
        doc_origin = 'Junior Architect documentation'
    elif creator_role == 'bim_specialist':
        doc_origin = 'BIM Specialist documentation'
    else:
        doc_origin = 'documentation'

    recipients = (
        CustomUser.objects
        .filter(is_active=True, role='studio_head')
        .exclude(id=actor.id)
    )

    for recipient in recipients:
        NotificationService.create_notification(
            recipient=recipient,
            actor=actor,
            notif_type='bim_submitted_to_sh',
            title='Documentation Needs Studio Head Approval',
            message=(
                f'{doc_origin} was submitted: "{doc.title}". '
                'Please review and approve or reject.'
            ),
        )


class BimDocumentationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for BIM Documentation management.
    
    Endpoints:
    - GET /bim-docs/ - List documentations (filtered by user role)
    - POST /bim-docs/ - Create new documentation
    - GET /bim-docs/{id}/ - Get documentation details
    - PUT /bim-docs/{id}/ - Update documentation (draft only)
    - DELETE /bim-docs/{id}/ - Delete documentation (draft only)
    - POST /bim-docs/{id}/submit/ - Submit for review
    - POST /bim-docs/{id}/approve/ - Approve/Reject documentation
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    junior_architect_role_aliases = ('junior_architect', 'junior_designer')

    @staticmethod
    def _is_studio_head_rejected(doc):
        return (
            doc.status == 'rejected'
            and doc.reviewed_by_studio_head_id is not None
            and doc.reviewed_by_ceo_id is None
        )

    @staticmethod
    def _visible_to_ceo_queryset():
        return BimDocumentation.objects.filter(
            Q(status='pending_review', reviewed_by_studio_head__isnull=False)
            | Q(status='approved', reviewed_by_ceo__isnull=False)
            | Q(status='rejected', reviewed_by_ceo__isnull=False)
        )

    @staticmethod
    def _normalize_junior_role_filter(role):
        if role in ['junior_architect', 'junior_designer']:
            return ['junior_architect', 'junior_designer']
        return [role]

    def _approved_junior_docs_queryset(self):
        return BimDocumentation.objects.filter(
            created_by__role__in=self.junior_architect_role_aliases,
            status='approved',
            reviewed_by_studio_head__isnull=False,
            reviewed_by_ceo__isnull=False,
        )
    
    def get_queryset(self):
        """
        Filter based on user role:
        - BIM Specialist: Can see own docs + Junior Architect docs approved by Studio Head and CEO
        - Junior Architect: Can see own docs
        - Studio Head: Can see all pending, approved, and rejected docs
        - CEO / President: Can only see docs forwarded to CEO or already decided by CEO
        - Admin: Can see all docs
        """
        user = self.request.user
        created_by_role = (self.request.query_params.get('created_by_role') or '').strip()
        queryset = BimDocumentation.objects.none()
        
        if user.role == 'bim_specialist':
            approved_junior_doc_ids = self._approved_junior_docs_queryset().values_list('id', flat=True)
            queryset = BimDocumentation.objects.filter(
                Q(created_by=user)
                | Q(id__in=approved_junior_doc_ids)
            )
        elif user.role in self.junior_architect_role_aliases:
            queryset = BimDocumentation.objects.filter(created_by=user)
        elif user.role == 'studio_head':
            queryset = BimDocumentation.objects.filter(
                Q(status__in=['pending_review', 'approved', 'rejected'])
            )
        elif user.role in ['ceo', 'president']:
            queryset = self._visible_to_ceo_queryset()
        elif user.role == 'admin':
            queryset = BimDocumentation.objects.all()

        if created_by_role:
            role_filters = self._normalize_junior_role_filter(created_by_role)
            queryset = queryset.filter(created_by__role__in=role_filters)

        queryset = queryset.select_related(
            'created_by',
            'reviewed_by_studio_head',
            'reviewed_by_ceo',
        ).prefetch_related('files')

        return queryset
    
    def get_serializer_class(self):
        """Use different serializers for list vs detail"""
        if self.action == 'list':
            return BimDocumentationListSerializer
        elif self.action == 'retrieve':
            return BimDocumentationDetailSerializer
        elif self.action == 'approval_action':
            return BimDocumentationApprovalSerializer
        return BimDocumentationSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Create new BIM documentation (synchronous file upload).
        BIM Specialists and Junior Architects can create documentation.
        Files are uploaded to Supabase Storage bucket synchronously for reliability.
        """
        if request.user.role not in ['bim_specialist', 'junior_architect', 'junior_designer']:
            return Response(
                {'error': 'Only BIM Specialists and Junior Architects can create documentation'},
                status=status.HTTP_403_FORBIDDEN
            )

        files = request.FILES.getlist('files')

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        doc = serializer.instance
        upload_errors = []
        uploaded_files = []

        from .supabase_storage import upload_file_to_supabase

        for file in files:
            file_type = request.POST.get(f'file_type_{file.name}', 'model')
            try:
                upload_result = upload_file_to_supabase(file, doc.id)
                if not upload_result['success']:
                    upload_errors.append({
                        'file': file.name,
                        'error': upload_result['error'] or 'Unknown error during upload.'
                    })
                    continue

                saved_file = BimDocumentationFile.objects.create(
                    documentation=doc,
                    file_name=file.name,
                    file_type=file_type,
                    file_path=upload_result['file_path'],
                    file_url=upload_result['file_url'],
                    file_size=file.size,
                )
                uploaded_files.append(saved_file.id)
            except Exception as e:
                upload_errors.append({
                    'file': file.name,
                    'error': str(e)
                })

        if upload_errors:
            # Optionally: Rollback doc if all files failed
            if not uploaded_files:
                doc.delete()
                error_details = upload_errors[0] if upload_errors else {}
                return Response({
                    'error': 'All file uploads failed. Documentation not saved.',
                    'details': upload_errors,
                    'message': error_details.get('error', 'Unknown upload error')
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            # Otherwise, partial success
            return Response({
                'warning': 'Some files failed to upload.',
                'uploaded_file_ids': uploaded_files,
                'upload_errors': upload_errors,
                'doc': serializer.data
            }, status=status.HTTP_207_MULTI_STATUS)

        # All files uploaded successfully
        response_data = serializer.data
        response_data['uploaded_file_ids'] = uploaded_files
        response_data['message'] = f'Documentation created. {len(uploaded_files)} file(s) uploaded.'
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """
        Update BIM documentation.
        Only the creator can update draft docs or docs rejected by Studio Head.
        Supports adding new files during update.
        """
        doc = self.get_object()
        
        if doc.created_by != request.user:
            return Response(
                {'error': 'You can only edit your own documentation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        can_edit = doc.status == 'draft' or self._is_studio_head_rejected(doc)

        if not can_edit:
            return Response(
                {'error': 'Can only edit draft or Studio Head-rejected documentation'},
                status=status.HTTP_400_BAD_REQUEST
            )

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(doc, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Handle file uploads if present
        files = request.FILES.getlist('files')
        if files:
            upload_errors = []
            uploaded_files = []

            for file in files:
                file_type = request.POST.get(f'file_type_{file.name}', 'image')
                try:
                    upload_result = upload_file_to_supabase(file, doc.id)
                    if not upload_result['success']:
                        upload_errors.append({
                            'file': file.name,
                            'error': upload_result['error'] or 'Unknown error during upload.'
                        })
                        continue

                    saved_file = BimDocumentationFile.objects.create(
                        documentation=doc,
                        file_name=file.name,
                        file_type=file_type,
                        file_path=upload_result['file_path'],
                        file_url=upload_result['file_url'],
                        file_size=file.size,
                    )
                    uploaded_files.append(saved_file.id)
                except Exception as e:
                    upload_errors.append({
                        'file': file.name,
                        'error': str(e)
                    })

            if upload_errors:
                logger.warning(f"Some files failed to upload during update: {upload_errors}")
                # Return partial success if some files uploaded
                if uploaded_files:
                    return Response({
                        'warning': 'Some files failed to upload.',
                        'uploaded_file_ids': uploaded_files,
                        'upload_errors': upload_errors,
                        'doc': serializer.data
                    }, status=status.HTTP_207_MULTI_STATUS)
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete BIM documentation (draft only).
        Only the creator can delete draft documentation.
        Deletes associated files from Supabase Storage.
        """
        doc = self.get_object()
        
        if doc.created_by != request.user:
            return Response(
                {'error': 'You can only delete your own documentation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if doc.status != 'draft':
            return Response(
                {'error': 'Can only delete draft documentation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete all associated files from Supabase Storage
        for file in doc.files.all():
            if file.file_path:
                delete_result = delete_file_from_supabase(file.file_path)
                if not delete_result['success']:
                    logger.warning(f"Failed to delete file from Supabase: {file.file_path} - {delete_result['error']}")
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Submit documentation for review.
        Changes status from draft/rejected to pending_review.
        """
        doc = self.get_object()
        
        if doc.created_by != request.user:
            return Response(
                {'error': 'You can only submit your own documentation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        can_resubmit_after_studio_head_rejection = self._is_studio_head_rejected(doc)

        if doc.status != 'draft' and not can_resubmit_after_studio_head_rejection:
            return Response(
                {'error': 'Only draft or Studio Head-rejected documentation can be submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )

        update_fields = ['status', 'updated_at']
        if can_resubmit_after_studio_head_rejection:
            doc.reviewed_by_studio_head = None
            doc.studio_head_reviewed_at = None
            doc.studio_head_comments = ''
            update_fields.extend([
                'reviewed_by_studio_head',
                'studio_head_reviewed_at',
                'studio_head_comments',
            ])

        doc.status = 'pending_review'
        doc.save(update_fields=update_fields)

        try:
            _notify_studio_head_documentation_submitted(doc, request.user)
        except Exception as exc:
            logger.warning('Failed to notify Studio Head for BIM doc %s submission: %s', doc.id, exc)
        
        serializer = self.get_serializer(doc)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def approval_action(self, request, pk=None):
        """
        Approve or reject documentation.
        - Studio Head: First level of approval/rejection
        - CEO: Final approval/rejection
        """
        doc = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action_type = serializer.validated_data['action']
        comments = serializer.validated_data.get('comments', '')
        
        user = request.user
        
        # Studio Head Review
        if user.role == 'studio_head':
            if doc.status != 'pending_review':
                return Response(
                    {'error': 'Documentation must be pending review'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if action_type == 'approve':
                doc.approve_studio_head(user, comments)
                if comments:
                    BimDocumentationComment.objects.create(
                        documentation=doc,
                        author=user,
                        content=f"✅ Approved by Studio Head: {comments}",
                        is_system_comment=True,
                    )
                else:
                    BimDocumentationComment.objects.create(
                        documentation=doc,
                        author=user,
                        content="✅ Approved by Studio Head — forwarded to CEO.",
                        is_system_comment=True,
                    )
                try:
                    _notify_ceo_documentation_forwarded(doc, user)
                except Exception as exc:
                    logger.warning('Failed to notify CEO for BIM doc %s forward: %s', doc.id, exc)
                return Response(
                    {'message': 'Documentation approved and forwarded to CEO'},
                    status=status.HTTP_200_OK
                )
            else:
                doc.reject(user, comments, is_studio_head=True)
                BimDocumentationComment.objects.create(
                    documentation=doc,
                    author=user,
                    content=f"❌ Rejected by Studio Head: {comments}" if comments else "❌ Rejected by Studio Head.",
                    is_system_comment=True,
                )
                return Response(
                    {'message': 'Documentation rejected'},
                    status=status.HTTP_200_OK
                )
        
        # CEO Review
        elif user.role in ['ceo', 'president']:
            if doc.status != 'pending_review':
                return Response(
                    {'error': 'Documentation must be pending review'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if action_type == 'approve':
                doc.approve_ceo(user, comments)
                if comments:
                    BimDocumentationComment.objects.create(
                        documentation=doc,
                        author=user,
                        content=f"✅ Approved by CEO: {comments}",
                        is_system_comment=True,
                    )
                else:
                    BimDocumentationComment.objects.create(
                        documentation=doc,
                        author=user,
                        content="✅ Approved by CEO — documentation finalized.",
                        is_system_comment=True,
                    )
                return Response(
                    {'message': 'Documentation approved'},
                    status=status.HTTP_200_OK
                )
            else:
                doc.reject(user, comments, is_studio_head=False)
                BimDocumentationComment.objects.create(
                    documentation=doc,
                    author=user,
                    content=f"❌ Rejected by CEO: {comments}" if comments else "❌ Rejected by CEO.",
                    is_system_comment=True,
                )
                return Response(
                    {'message': 'Documentation rejected'},
                    status=status.HTTP_200_OK
                )
        
        else:
            return Response(
                {'error': 'You do not have permission to approve documentation'},
                status=status.HTTP_403_FORBIDDEN
            )
    
    @action(detail=True, methods=['delete'])
    def remove_file(self, request, pk=None):
        """
        Remove a file from documentation.
        Only the creator of editable documentation can remove files.
        Deletes file from Supabase Storage.
        """
        doc = self.get_object()
        file_id = request.query_params.get('file_id')
        
        if not file_id:
            return Response(
                {'error': 'file_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if doc.created_by != request.user:
            return Response(
                {'error': 'You can only edit your own documentation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        can_edit_files = doc.status == 'draft' or self._is_studio_head_rejected(doc)

        if not can_edit_files:
            return Response(
                {'error': 'Can only edit draft or Studio Head-rejected documentation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = get_object_or_404(BimDocumentationFile, id=file_id, documentation=doc)
        
        # Delete file from Supabase Storage before removing from database
        if file.file_path:
            delete_result = delete_file_from_supabase(file.file_path)
            if not delete_result['success']:
                logger.warning(f"Failed to delete file from Supabase: {file.file_path} - {delete_result['error']}")
                # Still delete from DB even if Supabase deletion fails
        
        file.delete()
        
        return Response({'message': 'File removed successfully'})
    
    @action(detail=False, methods=['get'])
    def pending_approval(self, request):
        """
        Get documentations pending approval for the current user.
        """
        user = request.user
        
        if user.role == 'studio_head':
            docs = BimDocumentation.objects.filter(status='pending_review')
        elif user.role in ['ceo', 'president']:
            docs = BimDocumentation.objects.filter(
                status='pending_review',
                reviewed_by_studio_head__isnull=False
            )
        else:
            return Response(
                {'error': 'You do not have pending approvals'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = BimDocumentationListSerializer(docs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        """
        GET  /bim-docs/{id}/comments/ – list threaded comments for this doc
        POST /bim-docs/{id}/comments/ – post a new comment or reply
        """
        doc = self.get_object()  # respects get_queryset permission scoping

        if request.method == 'GET':
            top_level = (
                doc.doc_comments
                .filter(parent__isnull=True)
                .select_related('author')
                .prefetch_related('replies__author')
            )
            serializer = BimDocumentationCommentSerializer(top_level, many=True)
            return Response(serializer.data)

        # POST – create comment or reply
        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'error': 'Comment content cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        parent_id = request.data.get('parent_id')
        parent = None
        if parent_id:
            parent = get_object_or_404(BimDocumentationComment, id=parent_id, documentation=doc)
            # Flatten to one level: if replying to a reply, attach to its root
            if parent.parent_id is not None:
                parent = BimDocumentationComment.objects.get(id=parent.parent_id)

        comment = BimDocumentationComment.objects.create(
            documentation=doc,
            author=request.user,
            content=content,
            parent=parent,
        )
        serializer = BimDocumentationCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def my_documents(self, request):
        """
        Get all documents created by the current BIM Specialist.
        """
        if request.user.role != 'bim_specialist':
            return Response(
                {'error': 'This endpoint is for BIM Specialists only'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        docs = BimDocumentation.objects.filter(created_by=request.user)
        serializer = BimDocumentationListSerializer(docs, many=True)
        return Response(serializer.data)
