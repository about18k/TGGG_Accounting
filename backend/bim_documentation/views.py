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
    
    def get_queryset(self):
        """
        Filter based on user role:
        - BIM Specialist / Junior Architect: Can see their own docs
        - Studio Head: Can see all pending docs + approved docs
        - CEO: Can see all docs
        - Admin: Can see all docs
        """
        user = self.request.user
        created_by_role = (self.request.query_params.get('created_by_role') or '').strip()
        queryset = BimDocumentation.objects.none()
        
        if user.role in ['bim_specialist', 'junior_architect']:
            queryset = BimDocumentation.objects.filter(created_by=user)
        elif user.role == 'studio_head':
            queryset = BimDocumentation.objects.filter(
                Q(status__in=['pending_review', 'approved', 'rejected'])
            )
        elif user.role in ['ceo', 'admin', 'president']:
            queryset = BimDocumentation.objects.all()

        if created_by_role:
            queryset = queryset.filter(created_by__role=created_by_role)

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
        if request.user.role not in ['bim_specialist', 'junior_architect']:
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
        Update BIM documentation (draft only).
        Only the creator can update draft documentation.
        """
        doc = self.get_object()
        
        if doc.created_by != request.user:
            return Response(
                {'error': 'You can only edit your own documentation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if doc.status != 'draft':
            return Response(
                {'error': 'Can only edit draft documentation'},
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
        Changes status from draft to pending_review.
        """
        doc = self.get_object()
        
        if doc.created_by != request.user:
            return Response(
                {'error': 'You can only submit your own documentation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if doc.status != 'draft':
            return Response(
                {'error': 'Only draft documentation can be submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        doc.status = 'pending_review'
        doc.save()
        
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
        Only the creator of draft documentation can remove files.
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
        
        if doc.status != 'draft':
            return Response(
                {'error': 'Can only edit draft documentation'},
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
