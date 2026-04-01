from django.contrib import admin

from .models import MaterialRequest, MaterialRequestItem, Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_by', 'date_started', 'location', 'created_at')
    list_filter = ('date_started', 'created_at')
    search_fields = ('name', 'location', 'created_by__email')


class MaterialRequestItemInline(admin.TabularInline):
    model = MaterialRequestItem
    extra = 0


@admin.register(MaterialRequest)
class MaterialRequestAdmin(admin.ModelAdmin):
    list_display = (
        'project_name',
        'created_by',
        'priority',
        'status',
        'request_date',
        'required_date',
        'created_at',
    )
    list_filter = ('status', 'priority', 'request_date', 'required_date')
    search_fields = ('project_name', 'delivery_location', 'created_by__email')
    inlines = [MaterialRequestItemInline]
