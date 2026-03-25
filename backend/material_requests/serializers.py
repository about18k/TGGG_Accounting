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
            'price',
            'discount',
            'total',
            'specifications',
            'sort_order',
        ]
        read_only_fields = ['id']


class MaterialRequestSerializer(serializers.ModelSerializer):
    items = MaterialRequestItemSerializer(many=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    reviewed_by_studio_head_name = serializers.SerializerMethodField()
    reviewed_by_ceo_name = serializers.SerializerMethodField()
    created_by_signature = serializers.SerializerMethodField()
    reviewed_by_studio_head_signature = serializers.SerializerMethodField()
    reviewed_by_ceo_signature = serializers.SerializerMethodField()
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
            'created_by_signature',
            'status',
            'reviewed_by_studio_head',
            'reviewed_by_studio_head_name',
            'reviewed_by_studio_head_signature',
            'studio_head_reviewed_at',
            'studio_head_comments',
            'reviewed_by_ceo',
            'reviewed_by_ceo_name',
            'reviewed_by_ceo_signature',
            'ceo_reviewed_at',
            'ceo_comments',
            'request_image',
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

    def get_reviewed_by_studio_head_name(self, obj):
        if obj.reviewed_by_studio_head:
            return obj.reviewed_by_studio_head.get_full_name() or obj.reviewed_by_studio_head.email
        return None

    def get_reviewed_by_ceo_name(self, obj):
        if obj.reviewed_by_ceo:
            return obj.reviewed_by_ceo.get_full_name() or obj.reviewed_by_ceo.email
        return None

    def get_created_by_signature(self, obj):
        if obj.created_by and obj.created_by.signature_image:
            return obj.created_by.signature_image
        return None

    def get_reviewed_by_studio_head_signature(self, obj):
        if obj.reviewed_by_studio_head and obj.reviewed_by_studio_head.signature_image:
            return obj.reviewed_by_studio_head.signature_image
        return None

    def get_reviewed_by_ceo_signature(self, obj):
        if obj.reviewed_by_ceo and obj.reviewed_by_ceo.signature_image:
            return obj.reviewed_by_ceo.signature_image
        return None

    def get_item_count(self, obj):
        prefetched = getattr(obj, '_prefetched_objects_cache', {})
        if 'items' in prefetched:
            return len(prefetched['items'])
        return obj.items.count()

    def to_internal_value(self, data):
        # Support stringified 'items' from FormData submissions
        if 'items' in data and isinstance(data['items'], str):
            try:
                import json
                # Convert QueryDict to a standard dict to avoid 'getlist' issues
                if hasattr(data, 'dict'):
                    data = data.dict()
                elif hasattr(data, 'copy'):
                    data = data.copy()
                
                data['items'] = json.loads(data['items'])
            except (ValueError, TypeError):
                pass
        return super().to_internal_value(data)

    def validate(self, attrs):
        items = attrs.get('items')
        request_image = attrs.get('request_image')

        # For new requests, ensure at least one is provided
        if self.instance is None:
            if not items and not request_image:
                raise serializers.ValidationError(
                    'At least one material item or an uploaded image is required.'
                )
        else:
            # For updates, check the combination of new data and existing instance data
            has_items = (items is not None and len(items) > 0) or \
                        (items is None and self.instance.items.exists())
            has_image = (request_image is not None) or \
                        ('request_image' not in attrs and self.instance.request_image)

            if not has_items and not has_image:
                raise serializers.ValidationError(
                    'At least one material item or an uploaded image is required.'
                )

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
