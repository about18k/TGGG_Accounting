from django.db import models
from django.conf import settings
from accounts.models import Department

import uuid


class TaskGroup(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_groups'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_groups'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class TaskGroupMember(models.Model):
    group = models.ForeignKey(
        TaskGroup,
        on_delete=models.CASCADE,
        related_name='members'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='task_group_memberships'
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('group', 'user')
        # A user can only be in one group
        constraints = [
            models.UniqueConstraint(fields=['user'], name='unique_user_per_group')
        ]

    def __str__(self):
        return f"{self.user} in {self.group.name}"


TODO_TYPE_CHOICES = [
    ('personal', 'Personal'),
    ('group', 'Group'),
    ('assigned', 'Assigned'),
    ('global', 'Global'),
]


class Todo(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='todos'
    )
    task = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    completed = models.BooleanField(default=False)
    todo_type = models.CharField(
        max_length=20,
        choices=TODO_TYPE_CHOICES,
        default='personal'
    )
    group = models.ForeignKey(
        TaskGroup,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='todos'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_todos'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_by_todos'
    )
    suggested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='suggested_todos'
    )
    is_confirmed = models.BooleanField(default=False)
    pending_completion = models.BooleanField(default=False)
    start_date = models.DateField(blank=True, null=True)
    deadline = models.DateField(blank=True, null=True)
    date_assigned = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'todo_type']),
            models.Index(fields=['group', 'is_confirmed']),
        ]

    def __str__(self):
        return self.task[:50]


DEPARTMENT_TASK_STATUS_CHOICES = [
    ('suggested', 'Suggested'),
    ('grabbed', 'Grabbed'),
    ('completed', 'Completed'),
    ('abandoned', 'Abandoned'),
]

PRIORITY_CHOICES = [
    ('low', 'Low'),
    ('medium', 'Medium'),
    ('high', 'High'),
]


class DepartmentTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='department_tasks'
    )
    suggested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='suggested_department_tasks'
    )
    grabbed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='grabbed_department_tasks'
    )
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_department_tasks'
    )
    status = models.CharField(
        max_length=20,
        choices=DEPARTMENT_TASK_STATUS_CHOICES,
        default='suggested'
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        blank=True,
        null=True
    )
    start_date = models.DateField(blank=True, null=True)
    deadline = models.DateField(blank=True, null=True)
    suggested_at = models.DateTimeField(auto_now_add=True)
    grabbed_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    abandoned_at = models.DateTimeField(blank=True, null=True)
    deleted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['department', 'status']),
            models.Index(fields=['deleted_at']),
        ]

    def __str__(self):
        return f"{self.task[:50]} ({self.status})"


class DepartmentTaskStats(models.Model):
    department = models.OneToOneField(
        Department,
        on_delete=models.CASCADE,
        related_name='task_stats'
    )
    total_tasks = models.IntegerField(default=0)
    suggested_count = models.IntegerField(default=0)
    grabbed_count = models.IntegerField(default=0)
    completed_count = models.IntegerField(default=0)
    abandoned_count = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Department task stats'

    def __str__(self):
        return f"Stats for {self.department.name}"

    @classmethod
    def refresh_for_department(cls, department_id):
        """Recalculate stats for a department."""
        from django.db.models import Q, Count
        tasks = DepartmentTask.objects.filter(
            department_id=department_id,
            deleted_at__isnull=True
        )
        stats, _ = cls.objects.get_or_create(department_id=department_id)
        stats.total_tasks = tasks.count()
        stats.suggested_count = tasks.filter(status='suggested').count()
        stats.grabbed_count = tasks.filter(status='grabbed').count()
        stats.completed_count = tasks.filter(status='completed').count()
        stats.abandoned_count = tasks.filter(status='abandoned').count()
        stats.save()
        return stats


NOTIFICATION_TYPE_CHOICES = [
    ('task_suggested', 'Task Suggested'),
    ('task_confirmed', 'Task Confirmed'),
    ('task_rejected', 'Task Rejected'),
    ('task_assigned', 'Task Assigned'),
    ('completion_requested', 'Completion Requested'),
    ('completion_confirmed', 'Completion Confirmed'),
    ('completion_rejected', 'Completion Rejected'),
    ('dept_task_suggested', 'Department Task Suggested'),
    ('dept_task_grabbed', 'Department Task Grabbed'),
    ('dept_task_completed', 'Department Task Completed'),
    ('dept_task_abandoned', 'Department Task Abandoned'),
    ('user_verified', 'User Verified'),
    ('user_pending_approval', 'User Pending Approval'),
    ('payroll_processed', 'Payroll Processed'),
    ('contribution_added', 'Contribution Added'),
    ('contribution_updated', 'Contribution Updated'),
    ('ot_submitted', 'OT Submitted'),
    ('ot_fully_approved', 'OT Fully Approved'),
    ('calendar_non_work_day', 'Calendar Non-Work Day'),
    ('bim_submitted_to_sh', 'BIM Submitted To Studio Head'),
    ('matreq_submitted_to_sh', 'Material Request Submitted To Studio Head'),
    ('bim_forwarded_to_ceo', 'BIM Forwarded To CEO'),
    ('matreq_forwarded_to_ceo', 'Material Request Forwarded To CEO'),
    ('ceo_payroll_processed', 'CEO Payroll Processed'),
]


class TodoNotification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='todo_notifications'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_notifications'
    )
    type = models.CharField(max_length=30, choices=NOTIFICATION_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    todo = models.ForeignKey(
        Todo,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    department_task = models.ForeignKey(
        DepartmentTask,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"Notification for {self.recipient}: {self.title}"

