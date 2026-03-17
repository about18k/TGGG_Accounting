from django.contrib import admin
from .models import BimDocumentation, BimDocumentationFile


@admin.register(BimDocumentation)
class BimDocumentationAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'created_by',
        'status',
        'doc_type',
        'doc_date',
        'created_at',
    ]
    list_filter = ['status', 'doc_type', 'created_at']
    search_fields = ['title', 'description', 'created_by__email']
    readonly_fields = [
        'created_by',
        'created_at',
        'updated_at',
        'studio_head_reviewed_at',
        'ceo_reviewed_at',
    ]
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'doc_type', 'doc_date', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
        ('Studio Head Review', {
            'fields': (
                'reviewed_by_studio_head',
                'studio_head_reviewed_at',
                'studio_head_comments',
            ),
        }),
        ('CEO Review', {
            'fields': (
                'reviewed_by_ceo',
                'ceo_reviewed_at',
                'ceo_comments',
            ),
        }),
        ('Status', {
            'fields': ('status',),
        }),
    )


@admin.register(BimDocumentationFile)
class BimDocumentationFileAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'file_type', 'documentation', 'file_size', 'uploaded_at']
    list_filter = ['file_type', 'uploaded_at']
    search_fields = ['file_name', 'documentation__title']
    readonly_fields = ['uploaded_at']
