from rest_framework import serializers

from .models import MaterialRequest, MaterialRequestItem, MaterialRequestComment, Project, PurchaseOrder, PurchaseOrderItem


class ProjectSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    material_request_count = serializers.SerializerMethodField()
    approved_request_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id',
            'name',
            'date_started',
            'location',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'material_request_count',
            'approved_request_count',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            name = obj.created_by.get_full_name()
            return name if name.strip() else obj.created_by.email
        return None

    def get_material_request_count(self, obj):
        return obj.material_requests.count()

    def get_approved_request_count(self, obj):
        return obj.material_requests.filter(status='approved').count()

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

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
    purchase_orders = serializers.SerializerMethodField()
    project_name_display = serializers.CharField(source='project.name', read_only=True, default=None)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = MaterialRequest
        fields = [
            'id',
            'project',
            'project_name',
            'project_name_display',
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
            'budget_allocated',
            'accounting_status',
            'fund_release_date',
            'accounting_notes',
            'accounting_receipt',
            'purchase_orders',
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
            'budget_allocated',
            'accounting_status',
            'fund_release_date',
            'accounting_notes',
            'accounting_receipt',
            'purchase_orders',
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

    def get_purchase_orders(self, obj):
        pos = obj.purchase_orders.all().prefetch_related('items')
        return PurchaseOrderSerializer(pos, many=True, context=self.context).data

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
        # Auto-populate project_name from project if linked
        project = validated_data.get('project')
        if project and not validated_data.get('project_name'):
            validated_data['project_name'] = project.name
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
    author_id = serializers.IntegerField(source='author.id', read_only=True)

    class Meta:
        model = MaterialRequestComment
        fields = ['id', 'content', 'author_id', 'author_name', 'author_role', 'is_system_comment', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        name = obj.author.get_full_name()
        return name if name.strip() else obj.author.email


class MaterialRequestCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_role = serializers.CharField(source='author.role', read_only=True)
    author_id = serializers.IntegerField(source='author.id', read_only=True)
    replies = MaterialRequestCommentReplySerializer(many=True, read_only=True)

    class Meta:
        model = MaterialRequestComment
        fields = ['id', 'content', 'author_id', 'author_name', 'author_role', 'is_system_comment', 'parent', 'replies', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        name = obj.author.get_full_name()
        return name if name.strip() else obj.author.email


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id',
            'purchase_order',
            'material_request_item',
            'name',
            'quantity',
            'unit',
            'price',
            'discount',
            'total',
        ]
        read_only_fields = ['id', 'purchase_order']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, required=False)
    prepared_by_name = serializers.CharField(source='prepared_by.get_full_name', read_only=True, default='')
    prepared_by_email = serializers.CharField(source='prepared_by.email', read_only=True, default='')
    prepared_by_signature = serializers.SerializerMethodField()

    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, default='')
    approved_by_email = serializers.CharField(source='approved_by.email', read_only=True, default='')
    approved_by_signature = serializers.SerializerMethodField()

    tallied_by_name = serializers.CharField(source='tallied_by.get_full_name', read_only=True, default='')
    tallied_by_email = serializers.CharField(source='tallied_by.email', read_only=True, default='')

    project_name = serializers.CharField(source='material_request.project_name', read_only=True)
    mr_status = serializers.CharField(source='material_request.status', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id',
            'material_request',
            'project_name',
            'mr_status',
            'po_number',
            'rfp_number',
            'date',
            'payment_terms',
            'bill_to',
            'account_name',
            'account_number',
            'supplier',
            'prepared_by',
            'prepared_by_name',
            'prepared_by_email',
            'prepared_by_signature',
            'prepared_at',
            'approved_by',
            'approved_by_name',
            'approved_by_email',
            'approved_by_signature',
            'approved_at',
            'rejection_reason',
            'status',
            'tally_notes',
            'tally_receipt',
            'tallied_by',
            'tallied_by_name',
            'tallied_by_email',
            'tallied_at',
            'is_tallied',
            'items',
        ]
        read_only_fields = [
            'id',
            'po_number',
            'prepared_by',
            'prepared_by_name',
            'prepared_by_email',
            'prepared_by_signature',
            'prepared_at',
            'approved_by',
            'approved_by_name',
            'approved_by_email',
            'approved_by_signature',
            'approved_at',
            'rejection_reason',
            'status',
            'tallied_by',
            'tallied_by_name',
            'tallied_by_email',
            'tallied_at',
            'is_tallied',
        ]

    def get_prepared_by_signature(self, obj):
        if obj.prepared_by and obj.prepared_by.signature_image:
            return obj.prepared_by.signature_image
        return None

    def get_approved_by_signature(self, obj):
        if obj.approved_by and obj.approved_by.signature_image:
            return obj.approved_by.signature_image
        return None
