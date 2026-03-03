from datetime import date
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Attendance, CalendarEvent, Leave, OvertimeRequest, TimeLog

# Create your views here.

OVERTIME_REVIEWER_ROLES = {
    'site_coordinator',
    'studio_head',
    'admin',
    'accounting',
    'president',
    'ceo',
}
ATTENDANCE_VIEWER_ROLES = {
    'accounting',
    'studio_head',
    'admin',
}

@api_view(['GET'])
def attendance_overview(request):
    """Overview of attendance module"""
    return Response({
        'message': 'Attendance module',
        'features': ['Time Tracking', 'Clock In/Out', 'Leave Management', 'Attendance Reports']
    })


def _display_name(user):
    return f"{user.first_name} {user.last_name}".strip() or user.email


def _can_review_overtime(user):
    return bool(user.is_staff or user.is_superuser or user.role in OVERTIME_REVIEWER_ROLES)


def _can_view_all_attendance(user):
    return bool(user.is_staff or user.is_superuser or user.role in ATTENDANCE_VIEWER_ROLES)


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
    latest_log = record.logs.order_by('-timestamp').first()
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
        'notes': record.notes,
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
    records = Attendance.objects.filter(employee=request.user).order_by('-date', '-created_at')
    return Response([_serialize_attendance(record) for record in records])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_attendance_records(request):
    if not _can_view_all_attendance(request.user):
        return Response({'error': 'Not authorized to view all attendance records.'}, status=status.HTTP_403_FORBIDDEN)

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
    """Return today's attendance record for the logged-in user, if it exists."""
    today = timezone.localdate()
    record = (
        Attendance.objects
        .select_related('employee', 'employee__department')
        .prefetch_related('logs')
        .filter(employee=request.user, date=today)
        .first()
    )
    if not record:
        return Response({'record': None})
    return Response({'record': _serialize_attendance(record)})


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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clock_in(request):
    """Record time in for the authenticated user for today's date."""
    now = timezone.localtime()
    today = now.date()

    with transaction.atomic():
        record, _created = Attendance.objects.select_for_update().get_or_create(
            employee=request.user,
            date=today,
            defaults={'status': 'present'},
        )

        if record.time_in:
            return Response(
                {'error': 'You already timed in today.', 'attendance': _serialize_attendance(record)},
                status=status.HTTP_400_BAD_REQUEST
            )

        record.time_in = now.time()
        _apply_status_override(record, request.data.get('status'))
        _append_notes(record, request.data.get('notes'))
        record.save(update_fields=['time_in', 'status', 'notes', 'updated_at'])

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
    """Record time out for the authenticated user for today's date."""
    now = timezone.localtime()
    today = now.date()

    with transaction.atomic():
        record, _created = Attendance.objects.select_for_update().get_or_create(
            employee=request.user,
            date=today,
            defaults={'status': 'present'},
        )

        if record.time_out:
            return Response(
                {'error': 'You already timed out today.', 'attendance': _serialize_attendance(record)},
                status=status.HTTP_400_BAD_REQUEST
            )

        if record.time_in and now.time() < record.time_in:
            return Response(
                {'error': 'Time out cannot be earlier than time in.', 'attendance': _serialize_attendance(record)},
                status=status.HTTP_400_BAD_REQUEST
            )

        record.time_out = now.time()
        _apply_status_override(record, request.data.get('status'))
        _append_notes(record, request.data.get('notes'))
        record.save(update_fields=['time_out', 'status', 'notes', 'updated_at'])

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
    POST: create event (Studio Head/Admin only)
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
                'description': event.description,
                'created_by': event.created_by_id,
            }
            for event in qs
        ])

    # POST
    if request.user.role not in ['studio_head', 'admin']:
        return Response({'error': 'Only Studio Head or Admin can add events.'}, status=status.HTTP_403_FORBIDDEN)

    title = (request.data.get('title') or '').strip()
    event_date_raw = request.data.get('date')
    event_type = (request.data.get('event_type') or 'event').strip().lower()
    description = (request.data.get('description') or '').strip()
    is_holiday = bool(request.data.get('is_holiday') or event_type == 'holiday')

    if not title:
        return Response({'error': 'Title is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not event_date_raw:
        return Response({'error': 'Date is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        event_date = date.fromisoformat(str(event_date_raw))
    except ValueError:
        return Response({'error': 'Invalid date. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

    if event_type not in dict(CalendarEvent.EVENT_TYPES):
        event_type = 'event'

    event, _ = CalendarEvent.objects.update_or_create(
        title=title,
        date=event_date,
        defaults={
          'event_type': event_type,
          'is_holiday': is_holiday,
          'description': description,
          'created_by': request.user,
        }
    )

    return Response({
        'id': event.id,
        'title': event.title,
        'date': event.date,
        'event_type': event.event_type,
        'is_holiday': event.is_holiday,
        'description': event.description,
        'created_by': event.created_by_id,
    }, status=status.HTTP_201_CREATED)


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
        supervisor_signature=payload.get('supervisor_signature'),
        management_signature=payload.get('management_signature'),
        periods=periods,
    )

    approval_date, approval_error = _parse_date_or_none(payload.get('approval_date'), 'approval_date')
    if approval_error:
        overtime_request.delete()
        return approval_error
    if approval_date:
        overtime_request.approval_date = approval_date
        overtime_request.save(update_fields=['approval_date', 'updated_at'])

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

    fields_to_update = []

    if 'supervisor_signature' in request.data:
        overtime_request.supervisor_signature = request.data.get('supervisor_signature')
        fields_to_update.append('supervisor_signature')

    if 'management_signature' in request.data:
        overtime_request.management_signature = request.data.get('management_signature')
        fields_to_update.append('management_signature')

    if 'approval_date' in request.data:
        approval_date, approval_error = _parse_date_or_none(request.data.get('approval_date'), 'approval_date')
        if approval_error:
            return approval_error
        overtime_request.approval_date = approval_date
        fields_to_update.append('approval_date')

    if not fields_to_update:
        return Response({'error': 'No approval fields provided.'}, status=status.HTTP_400_BAD_REQUEST)

    fields_to_update.append('updated_at')
    overtime_request.save(update_fields=fields_to_update)
    return Response(_serialize_overtime_request(overtime_request))
