from django.db import models
from django.utils import timezone
from accounts.models import CustomUser

class Attendance(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('on_leave', 'On Leave'),
        ('excused', 'Excused Absence'),
    ]

    SESSION_TYPES = [
        ('morning', 'Morning'),
        ('afternoon', 'Afternoon'),
        ('overtime', 'Overtime'),
    ]
    
    employee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='absent')
    time_in = models.TimeField(null=True, blank=True)
    time_out = models.TimeField(null=True, blank=True)
    session_type = models.CharField(max_length=20, choices=SESSION_TYPES, blank=True, null=True)
    is_late = models.BooleanField(default=False)
    late_deduction_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    clock_in_address = models.TextField(blank=True, null=True)
    clock_out_address = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    # Work Documentation Fields
    work_doc_note = models.TextField(blank=True, null=True, help_text="Documentation note about work completed (required if files uploaded)")
    work_doc_file_paths = models.JSONField(default=list, blank=True, help_text="List of file paths in Supabase bucket")
    work_doc_uploaded_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when first file was uploaded")
    work_doc_uploaded_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_work_docs')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        unique_together = ('employee', 'date', 'session_type')

    def __str__(self):
        return f"{self.employee.email} - {self.date} ({self.status})"


class TimeLog(models.Model):
    LOG_TYPE_CHOICES = [
        ('time_in', 'Time In'),
        ('time_out', 'Time Out'),
        ('break_start', 'Break Start'),
        ('break_end', 'Break End'),
    ]
    
    employee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='time_logs')
    attendance = models.ForeignKey(Attendance, on_delete=models.CASCADE, related_name='logs', null=True, blank=True)
    log_type = models.CharField(max_length=20, choices=LOG_TYPE_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    device_info = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.employee.email} - {self.log_type} at {self.timestamp}"


class Leave(models.Model):
    LEAVE_TYPE_CHOICES = [
        ('sick', 'Sick Leave'),
        ('vacation', 'Vacation'),
        ('personal', 'Personal Leave'),
        ('emergency', 'Emergency Leave'),
        ('bereavement', 'Bereavement Leave'),
        ('maternity', 'Maternity Leave'),
        ('paternity', 'Paternity Leave'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    employee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_leaves')
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.employee.email} - {self.leave_type} ({self.start_date} to {self.end_date})"


class CalendarEvent(models.Model):
    """Company calendar events and holidays controlled by Studio Head/Admin."""

    EVENT_TYPES = [
        ('event', 'Event'),
        ('holiday', 'Holiday'),
        ('downtime', 'No Work Day'),
    ]

    title = models.CharField(max_length=200)
    date = models.DateField()
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES, default='event')
    description = models.TextField(blank=True)
    is_holiday = models.BooleanField(default=False)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='created_events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'title']
        unique_together = ('title', 'date')

    def __str__(self):
        return f"{self.title} on {self.date} ({self.event_type})"


class OvertimeRequest(models.Model):
    employee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='overtime_requests')
    employee_name = models.CharField(max_length=255, blank=True)
    job_position = models.CharField(max_length=255, blank=True)
    date_completed = models.DateField(default=timezone.localdate)
    department = models.CharField(max_length=255, blank=True)
    anticipated_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    explanation = models.TextField()
    employee_signature = models.URLField(max_length=1000, blank=True, null=True)
    supervisor_signature = models.TextField(blank=True, null=True)
    management_signature = models.TextField(blank=True, null=True)
    approval_date = models.DateField(blank=True, null=True)
    periods = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OT #{self.id} - {self.employee.email}"


class AttendancePolicy(models.Model):
    department = models.OneToOneField('accounts.Department', on_delete=models.CASCADE, related_name='attendance_policy')
    work_hours_per_day = models.IntegerField(default=8)  # in hours
    late_threshold_minutes = models.IntegerField(default=15)  # minutes allowed before marking late
    early_out_threshold_minutes = models.IntegerField(default=15)  # minutes early allowed
    break_duration_minutes = models.IntegerField(default=60)  # lunch break duration
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Attendance Policies'

    def __str__(self):
        return f"Policy for {self.department.name}"
