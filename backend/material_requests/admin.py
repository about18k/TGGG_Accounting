from django.contrib import admin

from .models import MaterialRequest, MaterialRequestItem


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
