"""
Business logic services for attendance app.
Handles time tracking, attendance, leave, and overtime.
"""
from datetime import date
from decimal import Decimal, InvalidOperation
from django.utils import timezone
from django.db import transaction

from .models import Attendance, CalendarEvent, Leave, OvertimeRequest, TimeLog

OVERTIME_REVIEWER_ROLES = {
    'accounting',
}

ATTENDANCE_VIEWER_ROLES = {
    'accounting',
    'studio_head',
    'admin',
}


class AttendanceService:
    """Handle attendance clock in/out."""

    @staticmethod
    def get_user_attendance_records(user):
        """Get all attendance records for a user."""
        return Attendance.objects.filter(employee=user).order_by('-date', '-created_at')

    @staticmethod
    def get_today_attendance(user):
        """Get today's attendance record for a user."""
        today = timezone.localdate()
        return Attendance.objects.select_related('employee', 'employee__department').prefetch_related(
            'logs'
        ).filter(employee=user, date=today).first()

    @staticmethod
    def get_all_attendance_records():
        """Get all attendance records (for authorized users)."""
        return Attendance.objects.select_related(
            'employee', 'employee__department'
        ).prefetch_related('logs').order_by('-date', '-created_at')

    @staticmethod
    def clock_in(user, request_data=None):
        """Record time in for user."""
        request_data = request_data or {}
        now = timezone.localtime()
        today = now.date()

        with transaction.atomic():
            record, _created = Attendance.objects.select_for_update().get_or_create(
                employee=user,
                date=today,
                defaults={'status': 'present'},
            )

            if record.time_in:
                raise ValueError('You already timed in today.')

            record.time_in = now.time()
            AttendanceService._apply_status_override(record, request_data.get('status'))
            AttendanceService._append_notes(record, request_data.get('notes'))
            record.save(update_fields=['time_in', 'status', 'notes', 'updated_at'])

            TimeLog.objects.create(
                employee=user,
                attendance=record,
                log_type='time_in',
                location=AttendanceService._format_location(request_data),
            )

            return record

    @staticmethod
    def clock_out(user, request_data=None):
        """Record time out for user."""
        request_data = request_data or {}
        now = timezone.localtime()
        today = now.date()

        with transaction.atomic():
            record, _created = Attendance.objects.select_for_update().get_or_create(
                employee=user,
                date=today,
                defaults={'status': 'present'},
            )

            if record.time_out:
                raise ValueError('You already timed out today.')

            if record.time_in and now.time() < record.time_in:
                raise ValueError('Time out cannot be earlier than time in.')

            record.time_out = now.time()
            AttendanceService._apply_status_override(record, request_data.get('status'))
            AttendanceService._append_notes(record, request_data.get('notes'))
            record.save(update_fields=['time_out', 'status', 'notes', 'updated_at'])

            TimeLog.objects.create(
                employee=user,
                attendance=record,
                log_type='time_out',
                location=AttendanceService._format_location(request_data),
            )

            return record

    @staticmethod
    def _apply_status_override(record, requested_status):
        """Apply status if valid."""
        valid_status = {choice[0] for choice in Attendance.STATUS_CHOICES}
        if requested_status in valid_status:
            record.status = requested_status
        elif record.status in [None, '', 'absent']:
            record.status = 'present'

    @staticmethod
    def _append_notes(record, notes_text):
        """Append notes to attendance record."""
        if not notes_text:
            return
        notes_text = notes_text.strip()
        if not notes_text:
            return
        record.notes = f"{record.notes}\n{notes_text}" if record.notes else notes_text

    @staticmethod
    def _format_location(payload):
        """Compress geolocation into short string."""
        if not payload:
            return None

        mode = (payload.get('mode') or '').strip()
        latitude = payload.get('latitude')
        longitude = payload.get('longitude')
        accuracy = payload.get('accuracy')
        label = (payload.get('location_label') or payload.get('location') or '').strip()

        parts = []
        if mode:
            parts.append(f"mode={mode}")
        if latitude not in [None, ''] and longitude not in [None, '']:
            try:
                lat_fmt = f"{float(latitude):.5f}"
                lng_fmt = f"{float(longitude):.5f}"
                parts.append(f"lat={lat_fmt} lng={lng_fmt}")
            except (TypeError, ValueError):
                parts.append(f"lat={latitude} lng={longitude}")
        if accuracy not in [None, '']:
            parts.append(f"±{accuracy}m")
        if label:
            parts.append(label[:30])

        if not parts:
            return None

        formatted = " | ".join(parts)
        return formatted[:95]


class LeaveService:
    """Handle leave requests."""

    @staticmethod
    def create_leave_request(user, leave_data):
        """Create a new leave request."""
        leave_type = leave_data.get('leave_type')
        start_date_raw = leave_data.get('start_date')
        end_date_raw = leave_data.get('end_date')
        reason = (leave_data.get('reason') or '').strip()

        allowed_types = {key for key, _ in Leave.LEAVE_TYPE_CHOICES}
        if leave_type not in allowed_types:
            raise ValueError('Invalid leave type.')

        if not start_date_raw or not end_date_raw:
            raise ValueError('Start date and end date are required.')

        try:
            start_date = date.fromisoformat(str(start_date_raw))
            end_date = date.fromisoformat(str(end_date_raw))
        except ValueError:
            raise ValueError('Invalid date format. Use YYYY-MM-DD.')

        if end_date < start_date:
            raise ValueError('End date cannot be earlier than start date.')

        if not reason:
            raise ValueError('Reason is required.')

        leave = Leave.objects.create(
            employee=user,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            reason=reason,
            status='pending',
        )

        return leave

    @staticmethod
    def get_user_leave_requests(user):
        """Get all leave requests for a user."""
        return Leave.objects.filter(employee=user).select_related('approved_by').order_by('-created_at')


class OvertimeService:
    """Handle overtime requests."""

    @staticmethod
    def create_overtime_request(user, overtime_data):
        """Create an overtime request."""
        periods = overtime_data.get('periods') or []
        if not isinstance(periods, list):
            raise ValueError('periods must be a list.')

        date_completed = OvertimeService._parse_date_or_none(overtime_data.get('date_completed'))
        if not date_completed:
            date_completed = date.today()

        anticipated_hours_raw = overtime_data.get('anticipated_hours', 0)
        try:
            anticipated_hours = Decimal(str(anticipated_hours_raw or 0))
        except (InvalidOperation, TypeError):
            raise ValueError('anticipated_hours must be numeric.')

        explanation = (overtime_data.get('explanation') or '').strip()
        if not explanation:
            raise ValueError('Explanation is required.')

        overtime_request = OvertimeRequest.objects.create(
            employee=user,
            employee_name=(overtime_data.get('employee_name') or OvertimeService._display_name(user)).strip(),
            job_position=(
                overtime_data.get('job_position') or
                (user.get_role_display() if user.role else '')
            ).strip(),
            date_completed=date_completed,
            department=(
                overtime_data.get('department') or
                (user.department.name if user.department else '')
            ).strip(),
            anticipated_hours=anticipated_hours,
            explanation=explanation,
            employee_signature=overtime_data.get('employee_signature'),
            supervisor_signature=None,
            management_signature=overtime_data.get('management_signature'),
            periods=periods,
        )

        approval_date = OvertimeService._parse_date_or_none(overtime_data.get('approval_date'))
        if approval_date:
            overtime_request.approval_date = approval_date
            overtime_request.save(update_fields=['approval_date', 'updated_at'])

        return overtime_request

    @staticmethod
    def get_user_overtime_requests(user):
        """Get all overtime requests for a user."""
        return OvertimeRequest.objects.filter(employee=user).select_related('employee')

    @staticmethod
    def get_all_overtime_requests():
        """Get all overtime requests (for authorized users)."""
        return OvertimeRequest.objects.select_related('employee').all()

    @staticmethod
    def approve_overtime_request(overtime_request, approval_data):
        """Update/approve an overtime request."""
        fields_to_update = []

        if 'supervisor_signature' in approval_data:
            raise ValueError('Supervisor approval is no longer required. Accounting approval only.')

        if 'management_signature' in approval_data:
            overtime_request.management_signature = approval_data.get('management_signature')
            fields_to_update.append('management_signature')

        if 'approval_date' in approval_data:
            approval_date = OvertimeService._parse_date_or_none(approval_data.get('approval_date'))
            overtime_request.approval_date = approval_date
            fields_to_update.append('approval_date')

        if not fields_to_update:
            raise ValueError('No approval fields provided.')

        fields_to_update.append('updated_at')
        overtime_request.save(update_fields=fields_to_update)
        return overtime_request

    @staticmethod
    def _parse_date_or_none(value):
        """Parse date string or return None."""
        if value in [None, '', 'null', 'None']:
            return None
        try:
            return date.fromisoformat(str(value))
        except ValueError:
            raise ValueError(f'Invalid date format. Use YYYY-MM-DD.')

    @staticmethod
    def _display_name(user):
        """Get display name for user."""
        return f"{user.first_name} {user.last_name}".strip() or user.email


class CalendarEventService:
    """Handle calendar events."""

    @staticmethod
    def get_calendar_events(upcoming_only=False):
        """Get calendar events."""
        qs = CalendarEvent.objects.all()
        if upcoming_only:
            qs = qs.filter(date__gte=date.today())
        return qs.order_by('date', 'title')[:100]

    @staticmethod
    def create_calendar_event(event_data):
        """Create a calendar event."""
        title = (event_data.get('title') or '').strip()
        event_date_raw = event_data.get('date')
        event_type = (event_data.get('event_type') or 'event').strip().lower()
        description = (event_data.get('description') or '').strip()
        is_holiday = bool(event_data.get('is_holiday') or event_type == 'holiday')

        if not title:
            raise ValueError('Title is required.')
        if not event_date_raw:
            raise ValueError('Date is required.')

        try:
            event_date = date.fromisoformat(str(event_date_raw))
        except ValueError:
            raise ValueError('Invalid date. Use YYYY-MM-DD.')

        if event_type not in dict(CalendarEvent.EVENT_TYPES):
            event_type = 'event'

        event, _ = CalendarEvent.objects.update_or_create(
            title=title,
            date=event_date,
            defaults={
                'event_type': event_type,
                'is_holiday': is_holiday,
                'description': description,
                'created_by': event_data.get('created_by'),
            }
        )

        return event
