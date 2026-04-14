from datetime import date, time, timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import CustomUser
from todos.services import NotificationService
from .models import Attendance, CalendarEvent, Leave, OvertimeRequest, TimeLog
from .geocoding_service import reverse_geocode
from .services.supabase_storage import SupabaseStorageManager
from .session_service import (
    determine_session,
    is_late_for_session,
    calculate_late_deduction,
    calculate_session_hours,
    get_net_session_hours,
    SESSION_END_BASELINES,
)

# Create your views here.

OVERTIME_REVIEWER_ROLES = {
    'accounting',
}
ATTENDANCE_VIEWER_ROLES = {
    'accounting',
    'studio_head',
    'admin',
}
NON_WORKING_EVENT_TYPES = {
    'holiday',
    'downtime',
}

EVENT_TYPE_ALIASES = {
    'event': 'event',
    'working_day': 'event',
    'working day': 'event',
    'special_working_day': 'event',
    'special working day': 'event',
    'usual_day': 'event',
    'usual day': 'event',
    'holiday': 'holiday',
    'holidays': 'holiday',
    'downtime': 'downtime',
    'no_work_day': 'downtime',
    'no work day': 'downtime',
    'non_working_day': 'downtime',
    'non working day': 'downtime',
    'non-working day': 'downtime',
}

AUTO_PM_TIMEOUT_TIME = time(17, 30)
AUTO_PM_TIMEOUT_NOTE = 'System auto timeout: PM OUT recorded at 5:30 PM because no manual clock out was submitted.'

@api_view(['GET'])
def attendance_overview(request):
    """Overview of attendance module"""
    return Response({
        'message': 'Attendance module',
        'features': ['Time Tracking', 'Clock In/Out', 'Leave Management', 'Attendance Reports']
    })


def _display_name(user):
    return f"{user.first_name} {user.last_name}".strip() or user.email


def _notify_overtime_submitted(overtime_request, actor):
    requester_name = _display_name(overtime_request.employee)

    reviewer_recipients = CustomUser.objects.filter(
        is_active=True,
        role='accounting',
    ).exclude(id=actor.id)

    for recipient in reviewer_recipients:
        NotificationService.create_notification(
            recipient=recipient,
            actor=actor,
            notif_type='ot_submitted',
            title='New OT Request Submitted',
            message=(
                f'{requester_name} submitted an OT request '
                f'({overtime_request.anticipated_hours} hrs). Please review as Accounting.'
            ),
        )


def _notify_overtime_fully_approved(overtime_request, actor):
    NotificationService.create_notification(
        recipient=overtime_request.employee,
        actor=actor,
        notif_type='ot_fully_approved',
        title='OT Request Fully Approved',
        message=(
            'Your OT request has been approved by Accounting. '
            'You can now time in and time out for overtime during the approved dates.'
        ),
    )


def _notify_overtime_rejected(overtime_request, actor):
    NotificationService.create_notification(
        recipient=overtime_request.employee,
        actor=actor,
        notif_type='ot_rejected',
        title='OT Request Rejected',
        message=(
            'Your OT request was rejected by Accounting. '
            'Please submit a new request with corrected details if needed.'
        ),
    )


def _can_review_overtime(user):
    return bool(user.is_superuser or user.role in OVERTIME_REVIEWER_ROLES)


def _can_view_all_attendance(user):
    return bool(user.is_staff or user.is_superuser or user.role in ATTENDANCE_VIEWER_ROLES)


def _has_text(value):
    if value is None:
        return False
    return bool(str(value).strip())


def _is_overtime_fully_approved(overtime_request):
    return _has_text(overtime_request.management_signature)


def _overtime_request_last_valid_day(overtime_request):
    periods = overtime_request.periods if isinstance(overtime_request.periods, list) else []

    valid_end_days = []
    for period in periods:
        if not isinstance(period, dict):
            continue
        end_raw = period.get('end_date')
        if not end_raw:
            continue
        try:
            valid_end_days.append(date.fromisoformat(str(end_raw)))
        except ValueError:
            continue

    if valid_end_days:
        return max(valid_end_days)

    return overtime_request.date_completed


def _is_overtime_request_expired(overtime_request, today=None):
    comparison_day = today or timezone.localdate()
    last_valid_day = _overtime_request_last_valid_day(overtime_request)
    return comparison_day > last_valid_day


def _overtime_request_target_days(overtime_request):
    periods = overtime_request.periods if isinstance(overtime_request.periods, list) else []
    target_days = set()

    for period in periods:
        if not isinstance(period, dict):
            continue

        start_raw = period.get('start_date')
        end_raw = period.get('end_date')
        if not start_raw or not end_raw:
            continue

        try:
            start_day = date.fromisoformat(str(start_raw))
            end_day = date.fromisoformat(str(end_raw))
        except ValueError:
            continue

        if end_day < start_day:
            continue

        current = start_day
        while current <= end_day:
            target_days.add(current)
            current = current + timedelta(days=1)

    if not target_days:
        target_days.add(overtime_request.date_completed)

    return target_days


def _overtime_request_completion_info(overtime_request):
    if not _is_overtime_fully_approved(overtime_request):
        return {
            'is_completed': False,
            'completed_overtime_days': 0,
        }

    target_days = _overtime_request_target_days(overtime_request)

    completed_days = set(
        Attendance.objects.filter(
            employee=overtime_request.employee,
            session_type='overtime',
            date__in=target_days,
            time_in__isnull=False,
            time_out__isnull=False,
        ).values_list('date', flat=True)
    )

    return {
        'is_completed': len(completed_days) > 0,
        'completed_overtime_days': len(completed_days),
    }


def _approval_signature_for(user):
    timestamp = timezone.localtime().strftime('%Y-%m-%d %H:%M')
    return f"{_display_name(user)} ({timestamp})"


def _period_covers_day(period, day):
    if not isinstance(period, dict):
        return False

    start_raw = period.get('start_date')
    end_raw = period.get('end_date')
    if not start_raw or not end_raw:
        return False

    try:
        start_day = date.fromisoformat(str(start_raw))
        end_day = date.fromisoformat(str(end_raw))
    except ValueError:
        return False

    if end_day < start_day:
        return False

    return start_day <= day <= end_day


def _has_approved_overtime_for_day(user, day):
    approved_requests = (
        OvertimeRequest.objects
        .filter(employee=user)
        .exclude(management_signature__isnull=True)
        .exclude(management_signature='')
        .order_by('-created_at')
    )

    for overtime_request in approved_requests:
        periods = overtime_request.periods if isinstance(overtime_request.periods, list) else []

        if periods and any(_period_covers_day(period, day) for period in periods):
            return True

        # Backward compatibility for older rows that may not include period ranges.
        if not periods and (overtime_request.approval_date == day or overtime_request.date_completed == day):
            return True

    return False


def _is_saturday(day):
    return day.weekday() == 5


def _serialize_leave(leave):
    return {
        'id': leave.id,
        'employee_id': leave.employee_id,
        'employee_name': f"{leave.employee.first_name} {leave.employee.last_name}".strip() or leave.employee.email,
        'leave_type': leave.leave_type,
        'leave_type_label': leave.get_leave_type_display(),
        'start_date': leave.start_date,
        'end_date': leave.end_date,
        'reason': leave.reason,
        'status': leave.status,
        'status_label': leave.get_status_display(),
        'approved_by_id': leave.approved_by_id,
        'approved_by_name': (
            f"{leave.approved_by.first_name} {leave.approved_by.last_name}".strip()
            if leave.approved_by else None
        ),
        'approved_at': leave.approved_at,
        'rejection_reason': leave.rejection_reason,
        'created_at': leave.created_at,
        'updated_at': leave.updated_at,
    }


def _serialize_attendance(record):
    employee = record.employee
    # Use prefetched logs instead of querying DB (avoid N+1)
    latest_log = max(record.logs.all(), key=lambda log: log.timestamp, default=None) if record.logs.exists() else None
    
    # Get attachment URL and filename from the first file in work_doc_file_paths
    attachment_url = None
    attachment_filename = None
    if record.work_doc_file_paths and len(record.work_doc_file_paths) > 0:
        first_file_path = record.work_doc_file_paths[0]
        attachment_url = SupabaseStorageManager.get_public_url(first_file_path)
        # Extract filename from path (last part after /)
        attachment_filename = first_file_path.split('/')[-1] if '/' in first_file_path else first_file_path
    
    return {
        'id': record.id,
        'employee_id': employee.id,
        'employee_name': _display_name(employee),
        'employee_email': employee.email,
        'employee_department': employee.department.name if employee.department else None,
        'employee_role': employee.get_role_display() if employee.role else None,
        'date': record.date,
        'status': record.status,
        'status_label': record.get_status_display(),
        'time_in': record.time_in.strftime('%H:%M') if record.time_in else None,
        'time_out': record.time_out.strftime('%H:%M') if record.time_out else None,
        'location': latest_log.location if latest_log and latest_log.location else None,
        'session_type': record.session_type,
        'session_end_time': SESSION_END_BASELINES.get(record.session_type, None),
        'is_late': record.is_late,
        'late_deduction_hours': str(record.late_deduction_hours),
        'clock_in_address': record.clock_in_address,
        'clock_out_address': record.clock_out_address,
        'notes': record.notes,
        'work_doc_note': record.work_doc_note,
        'work_doc_file_paths': record.work_doc_file_paths,
        'work_doc_uploaded_at': record.work_doc_uploaded_at,
        'work_doc_uploaded_by_id': record.work_doc_uploaded_by_id,
        'attachment_url': attachment_url,
        'attachment_filename': attachment_filename,
        'created_at': record.created_at,
        'updated_at': record.updated_at,
    }


def _parse_date_or_none(value, field_name):
    if value in [None, '', 'null', 'None']:
        return None, None
    try:
        return date.fromisoformat(str(value)), None
    except ValueError:
        return None, Response(
            {'error': f'Invalid {field_name} format. Use YYYY-MM-DD.'},
            status=status.HTTP_400_BAD_REQUEST
        )

def _format_location(payload):
    """
    Compress geolocation payload into a short string that fits TimeLog.location (100 chars).
    """
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
    return formatted[:95]  # keep under 100 chars with buffer


def _serialize_overtime_request(request_obj):
    supervisor_confirmed = _has_text(request_obj.supervisor_signature)
    management_confirmed = _has_text(request_obj.management_signature)
    fully_approved = _is_overtime_fully_approved(request_obj)
    valid_until = _overtime_request_last_valid_day(request_obj)
    is_expired = _is_overtime_request_expired(request_obj)
    completion_info = _overtime_request_completion_info(request_obj)

    return {
        'id': request_obj.id,
        'employee_id': request_obj.employee_id,
        'employee_name': request_obj.employee_name or _display_name(request_obj.employee),
        'full_name': _display_name(request_obj.employee),
        'job_position': request_obj.job_position,
        'date_completed': request_obj.date_completed,
        'department': request_obj.department,
        'anticipated_hours': str(request_obj.anticipated_hours),
        'explanation': request_obj.explanation,
        'employee_signature': request_obj.employee_signature,
        'supervisor_signature': request_obj.supervisor_signature,
        'management_signature': request_obj.management_signature,
        'supervisor_confirmed': supervisor_confirmed,
        'management_confirmed': management_confirmed,
        'is_fully_approved': fully_approved,
        'is_expired': is_expired,
        'valid_until': valid_until,
        'is_completed': completion_info['is_completed'],
        'completed_overtime_days': completion_info['completed_overtime_days'],
        'approval_date': request_obj.approval_date,
        'periods': request_obj.periods or [],
        'created_at': request_obj.created_at,
        'updated_at': request_obj.updated_at,
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_leave_request(request):
    leave_type = request.data.get('leave_type')
    start_date_raw = request.data.get('start_date')
    end_date_raw = request.data.get('end_date')
    reason = (request.data.get('reason') or '').strip()

    allowed_types = {key for key, _ in Leave.LEAVE_TYPE_CHOICES}
    if leave_type not in allowed_types:
        return Response({'error': 'Invalid leave type.'}, status=status.HTTP_400_BAD_REQUEST)

    if not start_date_raw or not end_date_raw:
        return Response({'error': 'Start date and end date are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        start_date = date.fromisoformat(str(start_date_raw))
        end_date = date.fromisoformat(str(end_date_raw))
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

    if end_date < start_date:
        return Response({'error': 'End date cannot be earlier than start date.'}, status=status.HTTP_400_BAD_REQUEST)

    if not reason:
        return Response({'error': 'Reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

    leave = Leave.objects.create(
        employee=request.user,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        status='pending',
    )

    return Response({
        'success': True,
        'leave': _serialize_leave(leave),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_leave_requests(request):
    leaves = Leave.objects.filter(employee=request.user).select_related('approved_by').order_by('-created_at')
    return Response([_serialize_leave(leave) for leave in leaves])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_attendance_records(request):
    _auto_timeout_open_afternoon_sessions(user=request.user)

    records = (
        Attendance.objects
        .filter(employee=request.user)
        .select_related('employee', 'employee__department')
        .prefetch_related('logs')
        .order_by('-date', '-created_at')
    )
    return Response([_serialize_attendance(record) for record in records])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_attendance_records(request):
    if not _can_view_all_attendance(request.user):
        return Response({'error': 'Not authorized to view all attendance records.'}, status=status.HTTP_403_FORBIDDEN)

    _auto_timeout_open_afternoon_sessions()

    records = (
        Attendance.objects
        .select_related('employee', 'employee__department')
        .prefetch_related('logs')
        .order_by('-date', '-created_at')
    )
    return Response([_serialize_attendance(record) for record in records])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_attendance_today(request):
    """Return today's open session for the logged-in user, if any."""
    _auto_timeout_open_afternoon_sessions(user=request.user)

    today = timezone.localdate()
    # Find an open session (clocked in but not clocked out)
    open_record = (
        Attendance.objects
        .select_related('employee', 'employee__department')
        .prefetch_related('logs')
        .filter(employee=request.user, date=today, time_in__isnull=False, time_out__isnull=True)
        .first()
    )
    if open_record:
        return Response({'record': _serialize_attendance(open_record)})
    # No open session — return None so the user can start a new one
    return Response({'record': None})


def _apply_status_override(record, requested_status: str | None):
    valid_status = {choice[0] for choice in Attendance.STATUS_CHOICES}
    if requested_status in valid_status:
        record.status = requested_status
    elif record.status in [None, '', 'absent']:
        record.status = 'present'


def _append_notes(record, notes_text: str | None):
    if not notes_text:
        return
    notes_text = notes_text.strip()
    if not notes_text:
        return
    record.notes = f"{record.notes}\n{notes_text}" if record.notes else notes_text


def _auto_timeout_open_afternoon_sessions(user=None, now=None):
    """Auto-close open afternoon sessions at/after 5:30 PM local time."""
    local_now = timezone.localtime(now) if now else timezone.localtime()
    if local_now.time() < AUTO_PM_TIMEOUT_TIME:
        return 0

    today = local_now.date()

    with transaction.atomic():
        open_sessions = Attendance.objects.select_for_update().filter(
            date=today,
            session_type='afternoon',
            time_in__isnull=False,
            time_out__isnull=True,
        )

        if user is not None:
            open_sessions = open_sessions.filter(employee=user)

        records = list(open_sessions)
        for record in records:
            record.time_out = AUTO_PM_TIMEOUT_TIME
            if record.status in [None, '', 'absent']:
                record.status = 'present'
            _append_notes(record, AUTO_PM_TIMEOUT_NOTE)
            record.save(update_fields=['time_out', 'status', 'notes', 'updated_at'])

            TimeLog.objects.create(
                employee=record.employee,
                attendance=record,
                log_type='time_out',
                location='system:auto-pm-timeout',
            )

    return len(records)


def _event_blocks_attendance(event_type, is_holiday):
    normalized_type = EVENT_TYPE_ALIASES.get(
        str(event_type or '').strip().lower(),
        str(event_type or '').strip().lower(),
    )
    return bool(is_holiday) or normalized_type in NON_WORKING_EVENT_TYPES


def _get_non_working_event(day):
    for event in CalendarEvent.objects.filter(date=day).order_by('title'):
        if _event_blocks_attendance(event.event_type, event.is_holiday):
            return event
    return None


def _non_working_day_label(event):
    if not event:
        return 'Holiday/No Work Day'

    event_type = str(event.event_type or '').strip().lower()
    if event_type == 'holiday':
        return 'Holiday'
    if event_type == 'downtime':
        return 'No Work Day'
    return 'Holiday/No Work Day'


def _notify_non_working_event(event, actor):
    """Notify active employees when a date is set as non-working."""
    event_label = _non_working_day_label(event)
    event_date = event.date.strftime('%b %d, %Y')
    message = (
        f"{event.title} on {event_date} is marked as {event_label}. "
        "You cannot time in or time out on that date."
    )

    recipients = (
        CustomUser.objects
        .filter(is_active=True)
        .exclude(id=actor.id)
    )

    for recipient in recipients:
        NotificationService.create_notification(
            recipient=recipient,
            actor=actor,
            notif_type='calendar_non_work_day',
            title=f'{event_label} Notice',
            message=message,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clock_in(request):
    """Record time in for the authenticated user. Creates one record per session."""
    now = timezone.localtime()
    today = now.date()

    _auto_timeout_open_afternoon_sessions(user=request.user, now=now)

    non_working_event = _get_non_working_event(today)
    if non_working_event:
        return Response(
            {
                'error': (
                    f"It's {_non_working_day_label(non_working_event)} today "
                    f"({non_working_event.title}). You cannot make your attendance."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Determine which session window the current time falls into
    session = determine_session(now)
    if not session:
        return Response(
            {'error': 'Clock-in is not available at this time. Check the session schedule.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Saturday attendance is always categorized as overtime.
    auto_overtime_saturday = _is_saturday(today)
    if auto_overtime_saturday:
        session = 'overtime'

    if session == 'overtime' and not auto_overtime_saturday and not _has_approved_overtime_for_day(request.user, today):
        return Response(
            {
                'error': (
                    'Overtime clock-in requires an approved overtime request for today '
                    'confirmed by Accounting.'
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        # Reject if there is an open session (clocked in but not out)
        open_record = (
            Attendance.objects.select_for_update()
            .filter(employee=request.user, date=today, time_in__isnull=False, time_out__isnull=True)
            .first()
        )
        if open_record:
            return Response(
                {'error': f'You have an open {open_record.get_session_type_display() or ""} session. Please clock out first.',
                 'attendance': _serialize_attendance(open_record)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reject if already clocked in for this session today
        existing = (
            Attendance.objects.select_for_update()
            .filter(employee=request.user, date=today, session_type=session)
            .first()
        )
        if existing and existing.time_in:
            return Response(
                {'error': f'You already clocked in for the {session} session today.',
                 'attendance': _serialize_attendance(existing)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create new record for this session
        record = Attendance(
            employee=request.user,
            date=today,
            session_type=session,
            time_in=now.time(),
        )

        # Late detection
        late = is_late_for_session(session, now)
        record.is_late = late
        if late:
            record.late_deduction_hours = calculate_late_deduction(session, now)
            record.status = 'late'
        else:
            record.status = 'present'

        # Reverse geocode clock-in location
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        if latitude is not None and longitude is not None:
            record.clock_in_address = reverse_geocode(latitude, longitude)

        _append_notes(record, request.data.get('notes'))
        record.save()

        TimeLog.objects.create(
            employee=request.user,
            attendance=record,
            log_type='time_in',
            location=_format_location(request.data),
        )

    return Response({'success': True, 'attendance': _serialize_attendance(record)}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clock_out(request):
    """Record time out for the user's currently open session."""
    now = timezone.localtime()
    today = now.date()

    _auto_timeout_open_afternoon_sessions(user=request.user, now=now)

    non_working_event = _get_non_working_event(today)
    if non_working_event:
        return Response(
            {
                'error': (
                    f"It's {_non_working_day_label(non_working_event)} today "
                    f"({non_working_event.title}). You cannot make your attendance."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        # Find the open session (clocked in, not yet clocked out)
        record = (
            Attendance.objects.select_for_update()
            .filter(employee=request.user, date=today, time_in__isnull=False, time_out__isnull=True)
            .first()
        )

        if not record:
            return Response(
                {'error': 'No open session to clock out from.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Early timeout lock has been removed as per new policy.
        record.time_out = now.time()

        # Reverse geocode clock-out location
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        if latitude is not None and longitude is not None:
            record.clock_out_address = reverse_geocode(latitude, longitude)

        _append_notes(record, request.data.get('notes'))
        
        # Save work documentation note if provided
        work_doc_note = (request.data.get('work_doc_note') or '').strip()
        if work_doc_note:
            record.work_doc_note = work_doc_note
            record.work_doc_uploaded_by = request.user
            record.work_doc_uploaded_at = timezone.now()
        
        update_fields = [
            'time_out', 'notes', 'clock_out_address', 'updated_at',
        ]
        
        # Include work_doc fields in update if provided
        if work_doc_note:
            update_fields.extend(['work_doc_note', 'work_doc_uploaded_by', 'work_doc_uploaded_at'])
        
        record.save(update_fields=update_fields)

        TimeLog.objects.create(
            employee=request.user,
            attendance=record,
            log_type='time_out',
            location=_format_location(request.data),
        )

    return Response({'success': True, 'attendance': _serialize_attendance(record)}, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def calendar_events(request):
    """
    GET: list all events (optionally filter by upcoming)
    POST: create/update an event (Accounting only)
    """
    if request.method == 'GET':
        only_upcoming = request.query_params.get('upcoming') == 'true'
        qs = CalendarEvent.objects.all()
        if only_upcoming:
            qs = qs.filter(date__gte=date.today())
        qs = qs.order_by('date', 'title')[:100]
        return Response([
            {
                'id': event.id,
                'title': event.title,
                'date': event.date,
                'event_type': event.event_type,
                'is_holiday': event.is_holiday,
                'blocks_attendance': _event_blocks_attendance(event.event_type, event.is_holiday),
                'description': event.description,
                'created_by': event.created_by_id,
            }
            for event in qs
        ])

    # POST
    if request.user.role != 'accounting':
        return Response({'error': 'Only Accounting department can add events.'}, status=status.HTTP_403_FORBIDDEN)

    title = (request.data.get('title') or '').strip()
    event_date_raw = request.data.get('date')
    raw_event_type = (request.data.get('event_type') or 'event').strip().lower()
    event_type = EVENT_TYPE_ALIASES.get(raw_event_type, raw_event_type)
    description = (request.data.get('description') or '').strip()
    is_holiday_flag = bool(request.data.get('is_holiday'))

    if not title:
        return Response({'error': 'Title is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not event_date_raw:
        return Response({'error': 'Date is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        event_date = date.fromisoformat(str(event_date_raw))
    except ValueError:
        return Response({'error': 'Invalid date. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

    if event_date < date.today():
        return Response(
            {'error': 'Past dates are not allowed. Please choose today or a future date.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if event_type not in dict(CalendarEvent.EVENT_TYPES):
        event_type = 'event'

    is_holiday = bool(is_holiday_flag or event_type in NON_WORKING_EVENT_TYPES)

    existing_event = CalendarEvent.objects.filter(title=title, date=event_date).first()
    previous_blocked = (
        _event_blocks_attendance(existing_event.event_type, existing_event.is_holiday)
        if existing_event else False
    )

    event, created = CalendarEvent.objects.update_or_create(
        title=title,
        date=event_date,
        defaults={
          'event_type': event_type,
          'is_holiday': is_holiday,
          'description': description,
          'created_by': request.user,
        }
    )

    now_blocks_attendance = _event_blocks_attendance(event.event_type, event.is_holiday)
    if now_blocks_attendance and (created or not previous_blocked):
        try:
            _notify_non_working_event(event, request.user)
        except Exception as exc:
            print(f"⚠️ Calendar non-working notification failed for event_id={event.id}: {exc}")

    return Response({
        'id': event.id,
        'title': event.title,
        'date': event.date,
        'event_type': event.event_type,
        'is_holiday': event.is_holiday,
        'blocks_attendance': now_blocks_attendance,
        'description': event.description,
        'created_by': event.created_by_id,
    }, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def calendar_event_detail(request, event_id):
    if request.user.role != 'accounting':
        return Response({'error': 'Only Accounting department can manage events.'}, status=status.HTTP_403_FORBIDDEN)

    event = CalendarEvent.objects.filter(id=event_id).first()
    if not event:
        return Response({'error': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        event.delete()
        return Response({'success': True}, status=status.HTTP_200_OK)

    title = (request.data.get('title') or '').strip()
    event_date_raw = request.data.get('date')
    raw_event_type = (request.data.get('event_type') or 'event').strip().lower()
    event_type = EVENT_TYPE_ALIASES.get(raw_event_type, raw_event_type)
    description = (request.data.get('description') or '').strip()
    is_holiday_flag = bool(request.data.get('is_holiday'))

    if not title:
        return Response({'error': 'Title is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not event_date_raw:
        return Response({'error': 'Date is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        event_date = date.fromisoformat(str(event_date_raw))
    except ValueError:
        return Response({'error': 'Invalid date. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

    if event_date < date.today():
        return Response(
            {'error': 'Past dates are not allowed. Please choose today or a future date.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if event_type not in dict(CalendarEvent.EVENT_TYPES):
        event_type = 'event'

    duplicate = CalendarEvent.objects.filter(title=title, date=event_date).exclude(id=event.id).exists()
    if duplicate:
        return Response({'error': 'An event with the same title and date already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    previous_blocked = _event_blocks_attendance(event.event_type, event.is_holiday)
    is_holiday = bool(is_holiday_flag or event_type in NON_WORKING_EVENT_TYPES)

    event.title = title
    event.date = event_date
    event.event_type = event_type
    event.is_holiday = is_holiday
    event.description = description
    event.created_by = request.user
    event.save(update_fields=['title', 'date', 'event_type', 'is_holiday', 'description', 'created_by', 'updated_at'])

    now_blocks_attendance = _event_blocks_attendance(event.event_type, event.is_holiday)
    if now_blocks_attendance and not previous_blocked:
        try:
            _notify_non_working_event(event, request.user)
        except Exception as exc:
            print(f"⚠️ Calendar non-working notification failed for event_id={event.id}: {exc}")

    return Response({
        'id': event.id,
        'title': event.title,
        'date': event.date,
        'event_type': event.event_type,
        'is_holiday': event.is_holiday,
        'blocks_attendance': now_blocks_attendance,
        'description': event.description,
        'created_by': event.created_by_id,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def overtime_list_create(request):
    payload = request.data
    periods = payload.get('periods') or []
    if not isinstance(periods, list):
        return Response({'error': 'periods must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

    date_completed, date_error = _parse_date_or_none(payload.get('date_completed'), 'date_completed')
    if date_error:
        return date_error
    if not date_completed:
        date_completed = date.today()

    anticipated_hours_raw = payload.get('anticipated_hours', 0)
    try:
        anticipated_hours = Decimal(str(anticipated_hours_raw or 0))
    except (InvalidOperation, TypeError):
        return Response({'error': 'anticipated_hours must be numeric.'}, status=status.HTTP_400_BAD_REQUEST)

    explanation = (payload.get('explanation') or '').strip()
    if not explanation:
        return Response({'error': 'Explanation is required.'}, status=status.HTTP_400_BAD_REQUEST)

    overtime_request = OvertimeRequest.objects.create(
        employee=request.user,
        employee_name=(payload.get('employee_name') or _display_name(request.user)).strip(),
        job_position=(payload.get('job_position') or (request.user.get_role_display() if request.user.role else '')).strip(),
        date_completed=date_completed,
        department=(payload.get('department') or (request.user.department.name if request.user.department else '')).strip(),
        anticipated_hours=anticipated_hours,
        explanation=explanation,
        employee_signature=payload.get('employee_signature'),
        supervisor_signature=None,
        management_signature=None,
        approval_date=None,
        periods=periods,
    )

    try:
        _notify_overtime_submitted(overtime_request, request.user)
    except Exception as e:
        print(f"⚠️ Overtime submission notifications failed for request_id={overtime_request.id}: {e}")

    return Response(_serialize_overtime_request(overtime_request), status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_overtime_requests(request):
    requests = OvertimeRequest.objects.filter(employee=request.user).select_related('employee')
    return Response([_serialize_overtime_request(req) for req in requests])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_overtime_requests(request):
    if not _can_review_overtime(request.user):
        return Response({'error': 'Not authorized to view overtime requests.'}, status=status.HTTP_403_FORBIDDEN)

    requests = OvertimeRequest.objects.select_related('employee').all()
    return Response([_serialize_overtime_request(req) for req in requests])


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def approve_overtime_request(request, request_id):
    if not _can_review_overtime(request.user):
        return Response({'error': 'Not authorized to approve overtime requests.'}, status=status.HTTP_403_FORBIDDEN)

    overtime_request = OvertimeRequest.objects.select_related('employee').filter(id=request_id).first()
    if not overtime_request:
        return Response({'error': 'Overtime request not found.'}, status=status.HTTP_404_NOT_FOUND)

    if _is_overtime_request_expired(overtime_request) and not _is_overtime_fully_approved(overtime_request):
        return Response(
            {'error': 'This OT request has expired and can no longer be confirmed.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    request_data = request.data or {}
    was_fully_approved = _is_overtime_fully_approved(overtime_request)
    wants_supervisor = 'supervisor_signature' in request_data
    wants_management = 'management_signature' in request_data
    wants_approval_date = 'approval_date' in request_data

    if wants_supervisor:
        return Response(
            {'error': 'Supervisor approval is no longer required. Accounting approval only.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not (wants_management or wants_approval_date):
        return Response({'error': 'No approval fields provided.'}, status=status.HTTP_400_BAD_REQUEST)

    fields_to_update = []

    if wants_management:
        if _has_text(overtime_request.management_signature):
            return Response({'error': 'Management approval is already confirmed.'}, status=status.HTTP_400_BAD_REQUEST)

        overtime_request.management_signature = _approval_signature_for(request.user)
        fields_to_update.append('management_signature')

    is_fully_approved = _is_overtime_fully_approved(overtime_request)

    if wants_approval_date and not is_fully_approved:
        return Response(
            {'error': 'Approval date can only be set after accounting confirmation is complete.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if is_fully_approved:
        if wants_approval_date:
            approval_date, approval_error = _parse_date_or_none(request_data.get('approval_date'), 'approval_date')
            if approval_error:
                return approval_error
            if approval_date != overtime_request.approval_date:
                overtime_request.approval_date = approval_date
                fields_to_update.append('approval_date')
        elif overtime_request.approval_date is None:
            overtime_request.approval_date = timezone.localdate()
            fields_to_update.append('approval_date')

    if not fields_to_update:
        return Response({'error': 'No changes were applied.'}, status=status.HTTP_400_BAD_REQUEST)

    fields_to_update.append('updated_at')
    overtime_request.save(update_fields=fields_to_update)

    if not was_fully_approved and is_fully_approved:
        try:
            _notify_overtime_fully_approved(overtime_request, request.user)
        except Exception as e:
            print(f"⚠️ Overtime approval notification failed for request_id={overtime_request.id}: {e}")

    return Response(_serialize_overtime_request(overtime_request))


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_overtime_request(request, request_id):
    if not _can_review_overtime(request.user):
        return Response({'error': 'Not authorized to remove overtime requests.'}, status=status.HTTP_403_FORBIDDEN)

    overtime_request = OvertimeRequest.objects.filter(id=request_id).first()
    if not overtime_request:
        return Response({'error': 'Overtime request not found.'}, status=status.HTTP_404_NOT_FOUND)

    if _has_text(overtime_request.management_signature):
        return Response(
            {'error': 'Confirmed overtime requests cannot be removed.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        _notify_overtime_rejected(overtime_request, request.user)
    except Exception as e:
        print(f"⚠️ Overtime rejection notification failed for request_id={overtime_request.id}: {e}")

    overtime_request.delete()
    return Response({'message': 'Overtime request removed.'}, status=status.HTTP_200_OK)


# ============================================================================
# WORK DOCUMENTATION ENDPOINTS
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_work_documentation(request, attendance_id):
    """
    Upload work documentation files for an attendance record.
    Files are uploaded directly to Supabase bucket.
    Only the work_doc_note is saved in Django.
    
    Expected POST data:
    - file: File object (optional)
    - work_doc_note: Text note about work completed (optional but at least one required)
    """
    try:
        record = Attendance.objects.get(id=attendance_id, employee=request.user)
    except Attendance.DoesNotExist:
        return Response({'error': 'Attendance record not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if note or file is provided
    work_doc_note = (request.data.get('work_doc_note') or '').strip()
    has_file = 'file' in request.FILES
    
    if not work_doc_note and not has_file:
        return Response(
            {'error': 'Either a work documentation note or file is required.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Save note to record if provided
    if work_doc_note:
        record.work_doc_note = work_doc_note
    
    # Handle file upload if present
    uploaded_file_info = None
    if has_file:
        uploaded_file = request.FILES['file']
        
        # Upload to Supabase
        result = SupabaseStorageManager.upload_work_documentation(
            file_obj=uploaded_file,
            user_id=request.user.id,
            date_str=str(record.date),
            employee_id=record.employee_id
        )
        
        if not result.get('success'):
            return Response({'error': result.get('error')}, status=status.HTTP_400_BAD_REQUEST)
        
        # File uploaded successfully - save the path to DB so _serialize_attendance can find it
        file_path = result.get('file_path')
        if file_path:
            # Ensure it's a list since it defaults to []
            if not isinstance(record.work_doc_file_paths, list):
                record.work_doc_file_paths = []
            if file_path not in record.work_doc_file_paths:
                record.work_doc_file_paths.append(file_path)
            
        uploaded_file_info = {
            'filename': result['filename'],
            'file_url': result['file_url'],
        }
    
    # Update timestamps only if we have doc content
    if work_doc_note or has_file:
        record.work_doc_uploaded_at = timezone.now()
        record.work_doc_uploaded_by = request.user
    
    # Save record (only note, not file metadata)
    record.save()
    
    return Response({
        'success': True,
        'message': 'Work documentation saved successfully',
        'work_doc_note': record.work_doc_note,
        'uploaded_file': uploaded_file_info,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_work_documentation_files(request, attendance_id):
    """
    List all work documentation files from Supabase for an attendance record.
    Files are queried directly from the bucket, not from database.
    """
    try:
        record = Attendance.objects.get(id=attendance_id)
    except Attendance.DoesNotExist:
        return Response({'error': 'Attendance record not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check authorization - user can view own docs, admins can view all
    is_admin = request.user.is_staff or request.user.is_superuser
    is_owner = record.employee_id == request.user.id
    
    if not (is_admin or is_owner):
        return Response({'error': 'Not authorized to view this documentation.'}, status=status.HTTP_403_FORBIDDEN)
    
    # List files from Supabase bucket
    result = SupabaseStorageManager.list_work_documentation_files(
        employee_id=record.employee_id,
        date_str=str(record.date)
    )
    
    if not result.get('success'):
        return Response({
            'id': record.id,
            'files': [],
            'work_doc_note': record.work_doc_note,
            'error': result.get('error')
        }, status=status.HTTP_200_OK)
    
    return Response({
        'id': record.id,
        'employee_id': record.employee_id,
        'date': record.date,
        'work_doc_note': record.work_doc_note,
        'files': result.get('files', []),
        'file_count': len(result.get('files', []))
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_work_documentation(request, attendance_id):
    """
    Retrieve work documentation note for an attendance record.
    (Legacy endpoint - kept for compatibility)
    """
    try:
        record = Attendance.objects.get(id=attendance_id)
    except Attendance.DoesNotExist:
        return Response({'error': 'Attendance record not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check authorization - user can view own docs, admins can view all
    is_admin = request.user.is_staff or request.user.is_superuser
    is_owner = record.employee_id == request.user.id
    
    if not (is_admin or is_owner):
        return Response({'error': 'Not authorized to view this documentation.'}, status=status.HTTP_403_FORBIDDEN)
    
    return Response({
        'id': record.id,
        'employee_id': record.employee_id,
        'date': record.date,
        'work_doc_note': record.work_doc_note,
        'work_doc_file_paths': record.work_doc_file_paths,
        'work_doc_uploaded_at': record.work_doc_uploaded_at,
        'work_doc_uploaded_by_id': record.work_doc_uploaded_by_id,
        'file_count': len(record.work_doc_file_paths)
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_work_documentation_file(request, attendance_id, file_index):
    """
    Delete a specific work documentation file.
    """
    try:
        record = Attendance.objects.get(id=attendance_id)
    except Attendance.DoesNotExist:
        return Response({'error': 'Attendance record not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check authorization
    is_admin = request.user.is_staff or request.user.is_superuser
    is_owner = record.employee_id == request.user.id
    
    if not (is_admin or is_owner):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
    
    # Check if file index is valid
    try:
        file_index = int(file_index)
        if file_index < 0 or file_index >= len(record.work_doc_file_paths):
            return Response({'error': 'Invalid file index.'}, status=status.HTTP_400_BAD_REQUEST)
    except (ValueError, TypeError):
        return Response({'error': 'Invalid file index.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get file data before deletion
    file_data = record.work_doc_file_paths[file_index]
    
    # Delete from Supabase
    result = SupabaseStorageManager.delete_work_documentation(
        file_path=file_data['file_path'],
        user_id=request.user.id,
        employee_id=record.employee_id
    )
    
    if not result.get('success'):
        return Response({'error': result.get('error')}, status=status.HTTP_400_BAD_REQUEST)
    
    # Remove from list
    record.work_doc_file_paths.pop(file_index)
    record.save(update_fields=['work_doc_file_paths', 'updated_at'])
    
    return Response({
        'success': True,
        'message': 'File deleted successfully',
        'file_count': len(record.work_doc_file_paths)
    }, status=status.HTTP_200_OK)
