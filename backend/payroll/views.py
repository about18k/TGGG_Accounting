from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import CustomUser
from attendance.models import Attendance
from .models import DeductionType, PaySlip, PayrollProcessing

# Create your views here.


PAYROLL_MANAGER_ROLES = {
    'accounting',
    'studio_head',
    'admin',
}


def _can_manage_payroll(user):
    return bool(user.is_staff or user.is_superuser or user.role in PAYROLL_MANAGER_ROLES)


def _parse_iso_date(value, field_name):
    try:
        return date.fromisoformat(str(value))
    except Exception:
        raise ValueError(f'Invalid {field_name}. Use YYYY-MM-DD.')


def _safe_money(value):
    return Decimal(value).quantize(Decimal('0.01'))


def _count_weekdays(start_date, end_date):
    count = 0
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:
            count += 1
        current += timedelta(days=1)
    return count


def _serialize_payslip(payslip):
    employee = payslip.employee
    return {
        'id': payslip.id,
        'employee_id': employee.id,
        'employee_name': f"{employee.first_name} {employee.last_name}".strip() or employee.email,
        'employee_email': employee.email,
        'employee_role': employee.get_role_display() if employee.role else None,
        'employee_avatar': employee.profile_picture,
        'period_start': payslip.period_start,
        'period_end': payslip.period_end,
        'base_salary': str(payslip.base_salary),
        'gross_salary': str(payslip.gross_salary),
        'deductions_total': str(payslip.deductions_total),
        'tax': str(payslip.tax),
        'net_salary': str(payslip.net_salary),
        'working_days': payslip.working_days,
        'days_present': payslip.days_present,
        'days_absent': payslip.days_absent,
        'days_on_leave': payslip.days_on_leave,
        'status': payslip.status,
        'status_label': payslip.get_status_display(),
        'created_at': payslip.created_at,
        'updated_at': payslip.updated_at,
    }


def _serialize_deduction_type(deduction):
    return {
        'id': deduction.id,
        'name': deduction.name,
        'category': deduction.category,
        'is_fixed': deduction.is_fixed,
        'default_amount': str(deduction.default_amount),
        # Frontend-friendly fields
        'type': 'fixed' if deduction.is_fixed else 'percentage',
        'rate': float(deduction.default_amount),
    }


def _calculate_configured_deductions(base_salary):
    configured_rows = DeductionType.objects.all().order_by('name')
    items = []
    total = _safe_money(Decimal('0'))
    tax_total = _safe_money(Decimal('0'))

    for row in configured_rows:
        rate = _safe_money(Decimal(row.default_amount))
        amount = rate if row.is_fixed else _safe_money(base_salary * (rate / Decimal('100')))
        amount = _safe_money(max(Decimal('0'), amount))
        total += amount
        if row.category == 'tax':
            tax_total += amount
        items.append({
            'id': row.id,
            'name': row.name,
            'category': row.category,
            'type': 'fixed' if row.is_fixed else 'percentage',
            'rate': str(rate),
            'amount': str(amount),
        })

    # Backward-compatible fallback when no configured deductions yet.
    if not items:
        sss = _safe_money(base_salary * Decimal('0.045'))
        philhealth = _safe_money(base_salary * Decimal('0.02'))
        pagibig = _safe_money(Decimal('100')) if base_salary > 0 else _safe_money(Decimal('0'))
        tax = _safe_money(Decimal('0'))
        if base_salary > Decimal('40000'):
            tax = _safe_money((base_salary - Decimal('40000')) * Decimal('0.20') + Decimal('3000'))
        elif base_salary > Decimal('20000'):
            tax = _safe_money((base_salary - Decimal('20000')) * Decimal('0.15'))

        items = [
            {'id': None, 'name': 'SSS Contribution', 'category': 'tax', 'type': 'percentage', 'rate': '4.50', 'amount': str(sss)},
            {'id': None, 'name': 'PhilHealth', 'category': 'insurance', 'type': 'percentage', 'rate': '2.00', 'amount': str(philhealth)},
            {'id': None, 'name': 'Pag-IBIG', 'category': 'benefits', 'type': 'fixed', 'rate': '100.00', 'amount': str(pagibig)},
            {'id': None, 'name': 'Withholding Tax', 'category': 'tax', 'type': 'fixed', 'rate': str(tax), 'amount': str(tax)},
        ]
        total = _safe_money(sss + philhealth + pagibig + tax)
        tax_total = _safe_money(sss + tax)

    return {
        'items': items,
        'total': _safe_money(total),
        'tax_total': _safe_money(tax_total),
    }


def _attendance_summary(employee, period_start, period_end):
    records = Attendance.objects.filter(
        employee=employee,
        date__gte=period_start,
        date__lte=period_end,
    ).order_by('date')

    days_present = records.filter(status__in=['present', 'late']).count()
    days_absent = records.filter(status='absent').count()
    days_on_leave = records.filter(status='on_leave').count()
    late_count = records.filter(status='late').count()
    total_logs = records.count()
    working_days = _count_weekdays(period_start, period_end)

    total_hours = Decimal('0')
    for record in records:
        if not record.time_in or not record.time_out:
            continue
        start_dt = datetime.combine(date.min, record.time_in)
        end_dt = datetime.combine(date.min, record.time_out)
        if end_dt < start_dt:
            continue
        hours = Decimal((end_dt - start_dt).total_seconds()) / Decimal('3600')
        total_hours += hours

    return {
        'working_days': working_days,
        'days_present': days_present,
        'days_absent': days_absent,
        'days_on_leave': days_on_leave,
        'late_count': late_count,
        'total_records': total_logs,
        'total_hours': float(total_hours.quantize(Decimal('0.01'))),
        # Backward-friendly keys for frontend display
        'totalDays': days_present,
        'leaveCount': days_on_leave,
        'absences': days_absent,
        'lateCount': late_count,
    }


@api_view(['GET'])
def payroll_overview(request):
    """Overview of payroll module"""
    return Response({
        'message': 'Payroll module',
        'features': ['Salary Processing', 'Tax Calculations', 'Benefits Management', 'Payroll Reports']
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payroll_employees(request):
    if not _can_manage_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    users = (
        CustomUser.objects
        .select_related('department', 'salary_structure')
        .filter(is_active=True)
        .order_by('last_name', 'first_name', 'email')
    )

    data = []
    for user in users:
        default_daily_rate = None
        salary_structure = getattr(user, 'salary_structure', None)
        if salary_structure:
            divisor = Decimal('22')
            if salary_structure.frequency == 'weekly':
                divisor = Decimal('5')
            elif salary_structure.frequency == 'biweekly':
                divisor = Decimal('10')
            default_daily_rate = _safe_money(Decimal(salary_structure.base_salary) / divisor)

        data.append({
            'id': str(user.id),
            'user_id': user.id,
            'employee_id': user.employee_id,
            'name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'position': user.get_role_display() if user.role else 'Unassigned',
            'avatar': user.profile_picture,
            'default_daily_rate': str(default_daily_rate) if default_daily_rate is not None else None,
        })

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_summary(request):
    if not _can_manage_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    employee_id = request.query_params.get('employee_id')
    period_start_raw = request.query_params.get('start_date')
    period_end_raw = request.query_params.get('end_date')

    if not employee_id or not period_start_raw or not period_end_raw:
        return Response({'error': 'employee_id, start_date, and end_date are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        employee = CustomUser.objects.get(id=employee_id, is_active=True)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        period_start = _parse_iso_date(period_start_raw, 'start_date')
        period_end = _parse_iso_date(period_end_raw, 'end_date')
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    if period_end < period_start:
        return Response({'error': 'end_date cannot be earlier than start_date.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response(_attendance_summary(employee, period_start, period_end))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_payroll(request):
    if not _can_manage_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    employee_id = request.data.get('employee_id')
    period_start_raw = request.data.get('period_start')
    period_end_raw = request.data.get('period_end')
    daily_salary_raw = request.data.get('daily_salary')

    if not employee_id or not period_start_raw or not period_end_raw:
        return Response({'error': 'employee_id, period_start, and period_end are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        employee = CustomUser.objects.select_related('salary_structure').get(id=employee_id, is_active=True)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        period_start = _parse_iso_date(period_start_raw, 'period_start')
        period_end = _parse_iso_date(period_end_raw, 'period_end')
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    if period_end < period_start:
        return Response({'error': 'period_end cannot be earlier than period_start.'}, status=status.HTTP_400_BAD_REQUEST)

    daily_rate = None
    if daily_salary_raw not in [None, '']:
        try:
            daily_rate = _safe_money(Decimal(str(daily_salary_raw)))
            if daily_rate <= 0:
                return Response({'error': 'daily_salary must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)
        except (InvalidOperation, TypeError):
            return Response({'error': 'daily_salary must be numeric.'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        salary_structure = getattr(employee, 'salary_structure', None)
        if salary_structure:
            divisor = Decimal('22')
            if salary_structure.frequency == 'weekly':
                divisor = Decimal('5')
            elif salary_structure.frequency == 'biweekly':
                divisor = Decimal('10')
            daily_rate = _safe_money(Decimal(salary_structure.base_salary) / divisor)

    if daily_rate is None:
        return Response({'error': 'No daily salary provided and no salary structure found for employee.'}, status=status.HTTP_400_BAD_REQUEST)

    summary = _attendance_summary(employee, period_start, period_end)
    base_salary = _safe_money(daily_rate * Decimal(summary['days_present']))
    gross_salary = base_salary

    absence_deduction = _safe_money(daily_rate * Decimal(summary['days_absent']))
    late_deduction = _safe_money(daily_rate * Decimal('0.10') * Decimal(summary['late_count']))
    leave_deduction = _safe_money(daily_rate * Decimal(summary['days_on_leave']))
    configured = _calculate_configured_deductions(base_salary)
    configured_total = configured['total']
    tax_amount = configured['tax_total']

    deductions_total = _safe_money(
        absence_deduction +
        late_deduction +
        leave_deduction +
        configured_total
    )
    net_salary = _safe_money(max(Decimal('0'), gross_salary - deductions_total))

    configured_items = configured['items']
    sss_amount = _safe_money(sum(
        Decimal(item['amount']) for item in configured_items
        if 'sss' in (item.get('name') or '').lower()
    ))
    philhealth_amount = _safe_money(sum(
        Decimal(item['amount']) for item in configured_items
        if 'philhealth' in (item.get('name') or '').lower()
    ))
    pagibig_amount = _safe_money(sum(
        Decimal(item['amount']) for item in configured_items
        if 'pag-ibig' in (item.get('name') or '').lower() or 'pag ibig' in (item.get('name') or '').lower()
    ))

    deduction_items = [
        {'name': 'Absences', 'category': 'attendance', 'type': 'computed', 'rate': None, 'amount': str(absence_deduction)},
        {'name': 'Late Deductions', 'category': 'attendance', 'type': 'computed', 'rate': None, 'amount': str(late_deduction)},
        {'name': 'Unpaid Leave', 'category': 'attendance', 'type': 'computed', 'rate': None, 'amount': str(leave_deduction)},
        *configured_items,
    ]

    with transaction.atomic():
        payslip, _created = PaySlip.objects.update_or_create(
            employee=employee,
            period_start=period_start,
            period_end=period_end,
            defaults={
                'base_salary': base_salary,
                'allowances_total': _safe_money(Decimal('0')),
                'overtime_amount': _safe_money(Decimal('0')),
                'bonus': _safe_money(Decimal('0')),
                'gross_salary': gross_salary,
                'tax': tax_amount,
                'deductions_total': deductions_total,
                'net_salary': net_salary,
                'working_days': summary['working_days'],
                'days_present': summary['days_present'],
                'days_absent': summary['days_absent'],
                'days_on_leave': summary['days_on_leave'],
                'status': 'generated',
            }
        )

        PayrollProcessing.objects.create(
            period_start=period_start,
            period_end=period_end,
            department=employee.department,
            total_employees=1,
            payslips_generated=1,
            status='completed',
            processed_by=request.user,
            completed_at=timezone.now(),
        )

    return Response({
        'success': True,
        'message': 'Payroll processed successfully.',
        'payslip': _serialize_payslip(payslip),
        'calculation': {
            'daily_rate': str(daily_rate),
            'base_salary': str(base_salary),
            'deductions': {
                'absences': str(absence_deduction),
                'late': str(late_deduction),
                'leave': str(leave_deduction),
                'sss': str(sss_amount),
                'philHealth': str(philhealth_amount),
                'pagIbig': str(pagibig_amount),
                'tax': str(tax_amount),
            },
            'deduction_items': deduction_items,
            'configured_deductions_total': str(configured_total),
            'total_deductions': str(deductions_total),
            'net_salary': str(net_salary),
        },
        'attendance_summary': summary,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def deduction_types(request):
    if not _can_manage_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        rows = DeductionType.objects.all().order_by('name')
        return Response([_serialize_deduction_type(row) for row in rows])

    name = (request.data.get('name') or '').strip()
    entry_type = (request.data.get('type') or 'percentage').strip().lower()
    category = (request.data.get('category') or 'other').strip().lower()
    rate_raw = request.data.get('rate', request.data.get('default_amount'))

    valid_types = {'fixed', 'percentage'}
    valid_categories = {key for key, _ in DeductionType.DEDUCTION_CATEGORY_CHOICES}

    if not name:
        return Response({'error': 'name is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if entry_type not in valid_types:
        return Response({'error': "type must be either 'fixed' or 'percentage'."}, status=status.HTTP_400_BAD_REQUEST)
    if category not in valid_categories:
        return Response({'error': 'Invalid category.'}, status=status.HTTP_400_BAD_REQUEST)
    if rate_raw in [None, '']:
        return Response({'error': 'rate is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        rate = _safe_money(Decimal(str(rate_raw)))
    except (InvalidOperation, TypeError):
        return Response({'error': 'rate must be numeric.'}, status=status.HTTP_400_BAD_REQUEST)

    if rate < 0:
        return Response({'error': 'rate must be non-negative.'}, status=status.HTTP_400_BAD_REQUEST)

    existing = DeductionType.objects.filter(name__iexact=name).first()
    if existing:
        return Response({'error': 'A deduction with this name already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    created = DeductionType.objects.create(
        name=name,
        category=category,
        is_fixed=(entry_type == 'fixed'),
        default_amount=rate,
    )
    return Response(_serialize_deduction_type(created), status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def deduction_type_detail(request, deduction_id):
    if not _can_manage_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    deduction = DeductionType.objects.filter(id=deduction_id).first()
    if not deduction:
        return Response({'error': 'Deduction not found.'}, status=status.HTTP_404_NOT_FOUND)

    deduction.delete()
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_payroll_records(request):
    if not _can_manage_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    created_on_raw = request.query_params.get('created_on')
    created_from_raw = request.query_params.get('created_from')
    created_to_raw = request.query_params.get('created_to')
    limit_raw = request.query_params.get('limit')

    records = PaySlip.objects.select_related('employee').order_by('-created_at', '-period_end')

    has_date_filter = bool(created_on_raw or created_from_raw or created_to_raw)

    if created_on_raw:
        try:
            created_on = _parse_iso_date(created_on_raw, 'created_on')
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        records = records.filter(created_at__date=created_on)
    else:
        created_from = None
        created_to = None

        if created_from_raw:
            try:
                created_from = _parse_iso_date(created_from_raw, 'created_from')
            except ValueError as exc:
                return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if created_to_raw:
            try:
                created_to = _parse_iso_date(created_to_raw, 'created_to')
            except ValueError as exc:
                return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if created_from and created_to and created_to < created_from:
            return Response({'error': 'created_to cannot be earlier than created_from.'}, status=status.HTTP_400_BAD_REQUEST)

        if created_from:
            records = records.filter(created_at__date__gte=created_from)
        if created_to:
            records = records.filter(created_at__date__lte=created_to)

    default_limit = 200 if has_date_filter else 30
    if limit_raw in [None, '']:
        limit = default_limit
    else:
        try:
            limit = int(limit_raw)
        except (TypeError, ValueError):
            return Response({'error': 'limit must be a whole number between 1 and 1000.'}, status=status.HTTP_400_BAD_REQUEST)
        if limit < 1 or limit > 1000:
            return Response({'error': 'limit must be between 1 and 1000.'}, status=status.HTTP_400_BAD_REQUEST)

    records = records[:limit]
    return Response([_serialize_payslip(record) for record in records])
