from django.contrib import admin
from .models import CustomUser, Department

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name']
    ordering = ['name']

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ['email', 'employee_id', 'first_name', 'last_name', 'department', 'role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'employee_id']
    list_filter = ['department', 'role', 'is_active', 'date_hired']
    ordering = ['-created_at']
    fieldsets = (
        ('Authentication', {'fields': ('email', 'password', 'username')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone_number', 'employee_id')}),
        ('Organization', {'fields': ('department', 'role', 'date_hired')}),
        ('Permissions', {'fields': ('permissions', 'is_active', 'is_staff', 'is_superuser')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )
    readonly_fields = ('created_at', 'updated_at')
    filter_horizontal = ['groups', 'user_permissions']
