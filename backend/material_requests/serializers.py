from rest_framework import serializers

from .models import MaterialRequest, MaterialRequestItem, MaterialRequestComment


class MaterialRequestItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialRequestItem
        fields = [
            'id',
            'name',
            'category',
            'quantity',
            'unit',
            'specifications',
            'sort_order',
        ]
        read_only_fields = ['id']


class MaterialRequestSerializer(serializers.ModelSerializer):
    items = MaterialRequestItemSerializer(many=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    reviewed_by_studio_head_name = serializers.CharField(
        source='reviewed_by_studio_head.get_full_name',
        read_only=True,
        allow_null=True,
    )
    reviewed_by_ceo_name = serializers.CharField(
        source='reviewed_by_ceo.get_full_name',
        read_only=True,
        allow_null=True,
    )
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = MaterialRequest
        fields = [
            'id',
            'project_name',
            'request_date',
            'required_date',
            'priority',
            'delivery_location',
            'notes',
            'created_by',
            'requester_role',
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
            'items',
            'item_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'created_by',
            'requester_role',
            'reviewed_by_studio_head',
            'reviewed_by_studio_head_name',
            'studio_head_reviewed_at',
            'studio_head_comments',
            'reviewed_by_ceo',
            'reviewed_by_ceo_name',
            'ceo_reviewed_at',
            'ceo_comments',
            'item_count',
            'created_at',
            'updated_at',
        ]

    def get_item_count(self, obj):
        prefetched = getattr(obj, '_prefetched_objects_cache', {})
        if 'items' in prefetched:
            return len(prefetched['items'])
        return obj.items.count()

    def validate(self, attrs):
        items = attrs.get('items')

        if self.instance is None and not items:
            raise serializers.ValidationError({'items': 'At least one material item is required.'})

        if items is not None and len(items) == 0:
            raise serializers.ValidationError({'items': 'At least one material item is required.'})

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        request_user = self.context['request'].user
        validated_data['created_by'] = request_user
        validated_data['requester_role'] = request_user.role
        material_request = MaterialRequest.objects.create(**validated_data)
        self._replace_items(material_request, items_data)
        return material_request

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if items_data is not None:
            self._replace_items(instance, items_data)

        return instance

    def _replace_items(self, material_request, items_data):
        material_request.items.all().delete()

        items = []
        for index, item_data in enumerate(items_data):
            normalized_item_data = dict(item_data)
            sort_order = normalized_item_data.pop('sort_order', index)
            items.append(MaterialRequestItem(
                material_request=material_request,
                sort_order=sort_order,
                **normalized_item_data,
            ))

        MaterialRequestItem.objects.bulk_create(items)


class MaterialRequestApprovalSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    comments = serializers.CharField(required=False, allow_blank=True)


class MaterialRequestCommentReplySerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_role = serializers.CharField(source='author.role', read_only=True)

    class Meta:
        model = MaterialRequestComment
        fields = ['id', 'content', 'author_name', 'author_role', 'is_system_comment', 'created_at']

    def get_author_name(self, obj):
        name = obj.author.get_full_name()
        return name if name.strip() else obj.author.email


class MaterialRequestCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_role = serializers.CharField(source='author.role', read_only=True)
    replies = MaterialRequestCommentReplySerializer(many=True, read_only=True)

    class Meta:
        model = MaterialRequestComment
        fields = ['id', 'content', 'author_name', 'author_role', 'is_system_comment', 'parent', 'replies', 'created_at']

    def get_author_name(self, obj):
        name = obj.author.get_full_name()
        return name if name.strip() else obj.author.email
