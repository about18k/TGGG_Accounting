from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

DOC_TYPE_CHOICES = [
    ('model-update', 'Model Update'),
    ('clash-detection', 'Clash Detection'),
    ('drawing-package', 'Drawing Package'),
    ('simulation', 'Simulation / Rendering'),
    ('bim-standards', 'BIM Standards'),
]

APPROVAL_STATUS_CHOICES = [
    ('draft', 'Draft'),
    ('pending_review', 'Pending Review'),
    ('approved', 'Approved'),
    ('rejected', 'Rejected'),
]


class BimDocumentation(models.Model):
    """
    Stores BIM documentation created by BIM Specialists.
    Tracks approval workflow from BIM Specialist → Studio Head → CEO
    """
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    doc_type = models.CharField(max_length=50, choices=DOC_TYPE_CHOICES)
    doc_date = models.DateField()
    
    # Creator (BIM Specialist)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_bim_docs'
    )
    
    # Approval Workflow
    status = models.CharField(
        max_length=20,
        choices=APPROVAL_STATUS_CHOICES,
        default='draft'
    )
    
    # Studio Head Review
    reviewed_by_studio_head = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_studio_head_docs'
    )
    studio_head_reviewed_at = models.DateTimeField(null=True, blank=True)
    studio_head_comments = models.TextField(blank=True, null=True)
    
    # CEO Review
    reviewed_by_ceo = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_ceo_docs'
    )
    ceo_reviewed_at = models.DateTimeField(null=True, blank=True)
    ceo_comments = models.TextField(blank=True, null=True)
    
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
        return f"{self.title} - {self.created_by}"
    
    def approve_studio_head(self, user, comments=''):
        """Mark as approved by Studio Head"""
        self.reviewed_by_studio_head = user
        self.studio_head_reviewed_at = timezone.now()
        self.studio_head_comments = comments
        self.status = 'pending_review'
        self.save()
    
    def approve_ceo(self, user, comments=''):
        """Mark as approved by CEO"""
        self.reviewed_by_ceo = user
        self.ceo_reviewed_at = timezone.now()
        self.ceo_comments = comments
        self.status = 'approved'
        self.save()
    
    def reject(self, user, reason, is_studio_head=False):
        """Reject documentation"""
        if is_studio_head:
            self.reviewed_by_studio_head = user
            self.studio_head_reviewed_at = timezone.now()
            self.studio_head_comments = reason
        else:
            self.reviewed_by_ceo = user
            self.ceo_reviewed_at = timezone.now()
            self.ceo_comments = reason
        self.status = 'rejected'
        self.save()


class BimDocumentationComment(models.Model):
    """
    Threaded comment/reply system for BIM documentation.
    Visible to all three roles (BIM Specialist, Studio Head, CEO).
    Top-level comments have parent=None; replies point to a parent comment.
    """
    documentation = models.ForeignKey(
        BimDocumentation,
        on_delete=models.CASCADE,
        related_name='doc_comments'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bim_doc_comments'
    )
    content = models.TextField()
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies'
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
        return f"Comment by {self.author} on {self.documentation.title}"


class BimDocumentationFile(models.Model):
    """
    Stores files (models and images) attached to BIM documentation.
    Supports file metadata and storage path.
    """
    FILE_TYPE_CHOICES = [
        ('model', '3D Model'),
        ('image', 'Image/Reference'),
    ]
    
    documentation = models.ForeignKey(
        BimDocumentation,
        on_delete=models.CASCADE,
        related_name='files'
    )
    
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES)
    uploaded_file = models.FileField(upload_to='bim-docs/%Y/%m/%d/', blank=True, null=True)
    file_path = models.CharField(
        max_length=500,
        help_text='Path to file in storage (Supabase, S3, etc.)'
    )
    file_size = models.BigIntegerField(default=0)  # in bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['uploaded_at']
    
    def __str__(self):
        return f"{self.file_name} - {self.documentation.title}"
