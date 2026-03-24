from rest_framework import serializers
from .models import BimDocumentation, BimDocumentationFile, BimDocumentationComment


class BimDocumentationFileSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    is_image = serializers.SerializerMethodField()

    class Meta:
        model = BimDocumentationFile
        fields = [
            'id',
            'file_name',
            'file_type',
            'file_path',
            'file_url',
            'is_image',
            'file_size',
            'uploaded_at',
        ]
        read_only_fields = ['uploaded_at']

    def get_file_url(self, obj):
        """
        Return the Supabase Storage public URL for the file.
        If file_url is stored in DB, use it directly (it's already a public URL from Supabase).
        """
        if obj.file_url:
            return obj.file_url
        
        # Fallback: if only file_path exists, generate URL based on file_path
        if obj.file_path:
            # Supabase Storage URL format: https://<project-id>.supabase.co/storage/v1/object/public/<bucket>/<path>
            from decouple import config
            supabase_url = config('SUPABASE_URL', default='')
            if supabase_url:
                return f"{supabase_url}/storage/v1/object/public/bim-docs/{obj.file_path}"
        
        return None

    def get_is_image(self, obj):
        if obj.file_type == 'image':
            return True
        filename = (obj.file_name or '').lower()
        return filename.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'))


class BimDocumentationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    reviewed_by_studio_head_name = serializers.CharField(
        source='reviewed_by_studio_head.get_full_name',
        read_only=True,
        allow_null=True
    )
    reviewed_by_ceo_name = serializers.CharField(
        source='reviewed_by_ceo.get_full_name',
        read_only=True,
        allow_null=True
    )
    files = BimDocumentationFileSerializer(many=True, read_only=True)
    
    class Meta:
        model = BimDocumentation
        fields = [
            'id',
            'title',
            'description',
            'doc_type',
            'doc_date',
            'created_by',
            'created_by_name',
            'created_by_email',
            'status',
            'reviewed_by_studio_head',
            'reviewed_by_studio_head_name',
            'studio_head_reviewed_at',
            'studio_head_comments',
            'reviewed_by_ceo',
            'reviewed_by_ceo_name',
            'ceo_reviewed_at',
            'ceo_comments',
            'files',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'created_by',
            'created_at',
            'updated_at',
            'reviewed_by_studio_head',
            'studio_head_reviewed_at',
            'studio_head_comments',
            'reviewed_by_ceo',
            'ceo_reviewed_at',
            'ceo_comments',
        ]

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class BimDocumentationDetailSerializer(BimDocumentationSerializer):
    """
    Detailed serializer that includes all file information
    """
    pass


class BimDocumentationListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    reviewed_by_studio_head_name = serializers.CharField(
        source='reviewed_by_studio_head.get_full_name',
        read_only=True,
        allow_null=True
    )
    reviewed_by_ceo_name = serializers.CharField(
        source='reviewed_by_ceo.get_full_name',
        read_only=True,
        allow_null=True
    )
    files = BimDocumentationFileSerializer(many=True, read_only=True)
    file_count = serializers.SerializerMethodField()
    
    class Meta:
        model = BimDocumentation
        fields = [
            'id',
            'title',
            'description',
            'doc_type',
            'doc_date',
            'created_by',
            'created_by_name',
            'created_by_email',
            'status',
            'reviewed_by_studio_head',
            'reviewed_by_studio_head_name',
            'studio_head_reviewed_at',
            'studio_head_comments',
            'reviewed_by_ceo',
            'reviewed_by_ceo_name',
            'ceo_reviewed_at',
            'ceo_comments',
            'files',
            'file_count',
            'created_at',
            'updated_at',
        ]
    
    def get_file_count(self, obj):
        prefetched = getattr(obj, '_prefetched_objects_cache', {})
        if 'files' in prefetched:
            return len(prefetched['files'])
        return obj.files.count()


class BimDocumentationApprovalSerializer(serializers.Serializer):
    """
    Serializer for approving/rejecting documentation
    """
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    comments = serializers.CharField(required=False, allow_blank=True)


class BimDocumentationCommentReplySerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_role = serializers.CharField(source='author.role', read_only=True)

    class Meta:
        model = BimDocumentationComment
        fields = ['id', 'content', 'author_name', 'author_role', 'is_system_comment', 'created_at']

    def get_author_name(self, obj):
        name = obj.author.get_full_name()
        return name if name.strip() else obj.author.email


class BimDocumentationCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_role = serializers.CharField(source='author.role', read_only=True)
    replies = BimDocumentationCommentReplySerializer(many=True, read_only=True)

    class Meta:
        model = BimDocumentationComment
        fields = ['id', 'content', 'author_name', 'author_role', 'is_system_comment', 'parent', 'replies', 'created_at']

    def get_author_name(self, obj):
        name = obj.author.get_full_name()
        return name if name.strip() else obj.author.email
