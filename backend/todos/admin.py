from django.contrib import admin
from .models import TaskGroup, TaskGroupMember, Todo, DepartmentTask, DepartmentTaskStats


@admin.register(TaskGroup)
class TaskGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'leader', 'created_at')
    search_fields = ('name',)
    list_filter = ('created_at',)


@admin.register(TaskGroupMember)
class TaskGroupMemberAdmin(admin.ModelAdmin):
    list_display = ('user', 'group', 'joined_at')
    list_filter = ('group',)


@admin.register(Todo)
class TodoAdmin(admin.ModelAdmin):
    list_display = ('task', 'user', 'todo_type', 'completed', 'is_confirmed', 'created_at')
    list_filter = ('todo_type', 'completed', 'is_confirmed')
    search_fields = ('task',)


@admin.register(DepartmentTask)
class DepartmentTaskAdmin(admin.ModelAdmin):
    list_display = ('task', 'department', 'status', 'suggested_by', 'grabbed_by', 'created_at')
    list_filter = ('status', 'department')
    search_fields = ('task',)


@admin.register(DepartmentTaskStats)
class DepartmentTaskStatsAdmin(admin.ModelAdmin):
    list_display = ('department', 'total_tasks', 'suggested_count', 'grabbed_count', 'completed_count', 'last_updated')
    list_filter = ('department',)
