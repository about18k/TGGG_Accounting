from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import BimDocumentation, BimDocumentationFile, BimDocumentationComment
from .serializers import (
    BimDocumentationSerializer,
    BimDocumentationListSerializer,
    BimDocumentationDetailSerializer,
    BimDocumentationApprovalSerializer,
    BimDocumentationFileSerializer,
    BimDocumentationCommentSerializer,
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
        Create new BIM documentation.
        BIM Specialists and Junior Architects can create documentation.
        """
        if request.user.role not in ['bim_specialist', 'junior_architect', 'junior_designer']:
            return Response(
                {'error': 'Only BIM Specialists and Junior Architects can create documentation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        doc = serializer.instance
        
        # Handle file uploads
        files = request.FILES.getlist('files')
        for file in files:
            saved_file = BimDocumentationFile.objects.create(
                documentation=doc,
                file_name=file.name,
                file_type=request.POST.get(f'file_type_{file.name}', 'model'),
                uploaded_file=file,
                file_path='',
                file_size=file.size,
            )
            saved_file.file_path = saved_file.uploaded_file.name if saved_file.uploaded_file else f'bim-docs/{doc.id}/{file.name}'
            saved_file.save(update_fields=['file_path'])
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """
        Update BIM documentation.
        Only the creator can update draft docs or docs rejected by Studio Head.
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
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete BIM documentation (draft only).
        Only the creator can delete draft documentation.
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
        file.delete()
        
        return Response({'message': 'File removed'})
    
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
