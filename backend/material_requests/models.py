from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone


User = get_user_model()

PRIORITY_CHOICES = [
    ('low', 'Low'),
    ('normal', 'Normal'),
    ('high', 'High'),
    ('urgent', 'Urgent'),
]

APPROVAL_STATUS_CHOICES = [
    ('draft', 'Draft'),
    ('pending_review', 'Pending Review'),
    ('approved', 'Approved'),
    ('rejected', 'Rejected'),
]

ACCOUNTING_STATUS_CHOICES = [
    ('pending_funds', 'Pending Funds'),
    ('funds_released', 'Funds Released'),
]


class Project(models.Model):
    name = models.CharField(max_length=255)
    date_started = models.DateField()
    location = models.CharField(max_length=255)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_projects',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_by']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return self.name


class MaterialRequest(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='material_requests',
    )
    project_name = models.CharField(max_length=255)
    request_date = models.DateField()
    required_date = models.DateField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    delivery_location = models.CharField(max_length=255)
    notes = models.TextField(blank=True, null=True)
    request_image = models.URLField(max_length=500, null=True, blank=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_material_requests',
    )
    requester_role = models.CharField(max_length=50, blank=True, null=True)

    status = models.CharField(
        max_length=20,
        choices=APPROVAL_STATUS_CHOICES,
        default='draft',
    )

    reviewed_by_studio_head = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_material_requests_as_studio_head',
    )
    studio_head_reviewed_at = models.DateTimeField(null=True, blank=True)
    studio_head_comments = models.TextField(blank=True, null=True)

    reviewed_by_ceo = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_material_requests_as_ceo',
    )
    ceo_reviewed_at = models.DateTimeField(null=True, blank=True)
    ceo_comments = models.TextField(blank=True, null=True)

    accounting_notes = models.TextField(blank=True, null=True)
    accounting_status = models.CharField(
        max_length=30,
        choices=ACCOUNTING_STATUS_CHOICES,
        default='pending_funds',
    )
    budget_allocated = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    fund_release_date = models.DateTimeField(null=True, blank=True)
    accounting_receipt = models.URLField(max_length=500, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_by', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f'{self.project_name} - {self.created_by}'

    def approve_studio_head(self, user, comments=''):
        self.reviewed_by_studio_head = user
        self.studio_head_reviewed_at = timezone.now()
        self.studio_head_comments = comments
        self.status = 'pending_review'
        self.save(update_fields=[
            'reviewed_by_studio_head',
            'studio_head_reviewed_at',
            'studio_head_comments',
            'status',
            'updated_at',
        ])
        
        # Create system comment
        MaterialRequestComment.objects.create(
            material_request=self,
            author=user,
            content=f"Studio Head Decision: Forwarded to CEO. Note: {comments}" if comments else "Studio Head Decision: Forwarded to CEO.",
            is_system_comment=True
        )

    def approve_ceo(self, user, comments=''):
        self.reviewed_by_ceo = user
        self.ceo_reviewed_at = timezone.now()
        self.ceo_comments = comments
        self.status = 'approved'
        self.save(update_fields=[
            'reviewed_by_ceo',
            'ceo_reviewed_at',
            'ceo_comments',
            'status',
            'updated_at',
        ])
        
        # Create system comment
        MaterialRequestComment.objects.create(
            material_request=self,
            author=user,
            content=f"CEO Decision: Approved. Note: {comments}" if comments else "CEO Decision: Approved.",
            is_system_comment=True
        )



    def reject(self, user, reason, is_studio_head=False):
        if is_studio_head:
            self.reviewed_by_studio_head = user
            self.studio_head_reviewed_at = timezone.now()
            self.studio_head_comments = reason
            update_fields = [
                'reviewed_by_studio_head',
                'studio_head_reviewed_at',
                'studio_head_comments',
                'status',
                'updated_at',
            ]
        else:
            self.reviewed_by_ceo = user
            self.ceo_reviewed_at = timezone.now()
            self.ceo_comments = reason
            update_fields = [
                'reviewed_by_ceo',
                'ceo_reviewed_at',
                'ceo_comments',
                'status',
                'updated_at',
            ]

        self.status = 'rejected'
        self.save(update_fields=update_fields)
        
        # Create system comment
        role_pref = "Studio Head" if is_studio_head else "CEO"
        MaterialRequestComment.objects.create(
            material_request=self,
            author=user,
            content=f"{role_pref} Decision: Rejected. Reason: {reason}",
            is_system_comment=True
        )


class MaterialRequestItem(models.Model):
    material_request = models.ForeignKey(
        MaterialRequest,
        on_delete=models.CASCADE,
        related_name='items',
    )
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    specifications = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return f'{self.name} ({self.quantity} {self.unit})'


class MaterialRequestComment(models.Model):
    """
    Threaded comment/reply system for Material Requests.
    Visible to Site Engineers, Site Coordinators, Studio Heads, and CEO.
    Top-level comments have parent=None; replies point to a parent comment.
    """
    material_request = models.ForeignKey(
        MaterialRequest,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='material_request_comments',
    )
    content = models.TextField()
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies',
    )
    is_system_comment = models.BooleanField(
        default=False,
        help_text='Auto-posted by the system on approval/rejection actions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author} on {self.material_request.project_name}"
