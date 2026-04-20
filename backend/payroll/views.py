import json
import hashlib
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, transaction
from django.http import HttpResponse
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import CustomUser
from attendance.models import Attendance
from todos.services import NotificationService
from .models import DeductionType, PaySlip, PayrollProcessing, EmployeeContribution

# Create your views here.


PAYROLL_MANAGER_ROLES = {
    'accounting',
    'studio_head',
    'admin',
}
PAYROLL_VIEW_ROLES = {
    'ceo',
    'president',
}

PAYROLL_CACHE_VERSION_KEY = 'payroll:cache-version'


def _get_payroll_cache_version():
    version = cache.get(PAYROLL_CACHE_VERSION_KEY)
    if version is None:
        cache.set(PAYROLL_CACHE_VERSION_KEY, 1, timeout=None)
        return 1
    return version


def _bump_payroll_cache_version():
    created = cache.add(PAYROLL_CACHE_VERSION_KEY, 1, timeout=None)
    if not created:
        try:
            cache.incr(PAYROLL_CACHE_VERSION_KEY)
        except ValueError:
            cache.set(PAYROLL_CACHE_VERSION_KEY, 1, timeout=None)


def _can_manage_payroll(user):
    return bool(user.is_staff or user.is_superuser or user.role in PAYROLL_MANAGER_ROLES)


def _can_view_payroll(user):
    return bool(user.is_staff or user.is_superuser or user.role in PAYROLL_MANAGER_ROLES.union(PAYROLL_VIEW_ROLES))


def _display_name(user):
    return f"{user.first_name} {user.last_name}".strip() or user.email


def _notify_employee(recipient, actor, notif_type, title, message):
    try:
        NotificationService.create_notification(
            recipient=recipient,
            actor=actor,
            notif_type=notif_type,
            title=title,
            message=message,
        )
    except Exception as e:
        print(f"⚠️ Notification failed for recipient_id={getattr(recipient, 'id', None)}: {e}")


def _parse_iso_date(value, field_name):
    try:
        return date.fromisoformat(str(value))
    except Exception:
        raise ValueError(f'Invalid {field_name}. Use YYYY-MM-DD.')


def _safe_money(value):
    return Decimal(value).quantize(Decimal('0.01'))


def _parse_money_input(value, field_name, default=Decimal('0')):
    if value in [None, '']:
        return _safe_money(default)
    try:
        amount = _safe_money(Decimal(str(value)))
    except (InvalidOperation, TypeError):
        raise ValueError(f'{field_name} must be numeric.')
    if amount < 0:
        raise ValueError(f'{field_name} must be non-negative.')
    return amount


def _parse_payslip_notes(notes_value):
    if not notes_value:
        return {}
    try:
        parsed = json.loads(notes_value)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


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
    payslip_details = _parse_payslip_notes(payslip.notes)
    has_payslip_image = bool(payslip.payslip_image_filename)
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
        'allowances_total': str(payslip.allowances_total),
        'overtime_amount': str(payslip.overtime_amount),
        'bonus': str(payslip.bonus),
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
        'payment_date': payslip.payment_date,
        'notes': payslip.notes,
        'payslip_details': payslip_details,
        'has_payslip_image': has_payslip_image,
        'payslip_image_endpoint': f"/api/payroll/recent/{payslip.id}/payslip-image/" if has_payslip_image else None,
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

    expected_hours = Decimal(days_present) * Decimal('8')
    undertime_hours = max(Decimal('0'), expected_hours - total_hours)
    undertime_hours = undertime_hours.quantize(Decimal('0.01'))

    return {
        'working_days': working_days,
        'days_present': days_present,
        'days_absent': days_absent,
        'days_on_leave': days_on_leave,
        'late_count': late_count,
        'total_records': total_logs,
        'total_hours': float(total_hours.quantize(Decimal('0.01'))),
        'undertime_hours': float(undertime_hours),
        # Backward-friendly keys for frontend display
        'totalDays': days_present,
        'leaveCount': days_on_leave,
        'absences': days_absent,
        'lateCount': late_count,
        'undertimeHours': float(undertime_hours),
        'undertime': float(undertime_hours),
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
    if not _can_view_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    cache_enabled = getattr(settings, 'ENABLE_API_RESPONSE_CACHE', True)
    cache_version = _get_payroll_cache_version() if cache_enabled else 0
    cache_hash = hashlib.md5(request.get_full_path().encode('utf-8')).hexdigest()
    cache_key = f"payroll:employees:v{cache_version}:user:{request.user.id}:{cache_hash}"
    if cache_enabled:
        cached_payload = cache.get(cache_key)
        if cached_payload is not None:
            response = Response(cached_payload)
            response['Cache-Control'] = f"private, max-age={settings.API_CACHE_TTL_SHORT}"
            return response

    users = (
        CustomUser.objects
        .select_related('salary_structure')
        .only(
            'id', 'employee_id', 'first_name', 'last_name', 'email', 'role',
            'profile_picture', 'signature_image', 'payroll_allowance_eligible',
            'salary_structure__base_salary', 'salary_structure__frequency',
        )
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
            'role': user.role,
            'position': user.get_role_display() if user.role else 'Unassigned',
            'avatar': user.profile_picture,
            'signature_image': user.signature_image,
            'payroll_allowance_eligible': bool(user.payroll_allowance_eligible),
            'default_daily_rate': str(default_daily_rate) if default_daily_rate is not None else None,
            'salary': str(salary_structure.base_salary) if salary_structure else None,
        })

    if cache_enabled:
        cache.set(cache_key, data, timeout=settings.API_CACHE_TTL_SHORT)
    response = Response(data)
    response['Cache-Control'] = f"private, max-age={settings.API_CACHE_TTL_SHORT}"
    return response


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def payroll_allowance_eligibility(request):
    """Manage which employees are eligible for payroll allowance."""
    if not _can_manage_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    employees_qs = (
        CustomUser.objects
        .filter(is_active=True)
        .only('id', 'first_name', 'last_name', 'email', 'role', 'payroll_allowance_eligible')
        .order_by('last_name', 'first_name', 'email')
    )

    if request.method == 'GET':
        return Response([
            {
                'id': str(user.id),
                'name': f"{user.first_name} {user.last_name}".strip() or user.email,
                'role': user.role,
                'position': user.get_role_display() if user.role else 'Unassigned',
                'payroll_allowance_eligible': bool(user.payroll_allowance_eligible),
            }
            for user in employees_qs
        ])

    employee_ids = request.data.get('employee_ids')
    if not isinstance(employee_ids, list):
        return Response({'error': 'employee_ids must be an array.'}, status=status.HTTP_400_BAD_REQUEST)

    normalized_ids = {str(item) for item in employee_ids if str(item).strip()}

    with transaction.atomic():
        for user in employees_qs:
            next_value = str(user.id) in normalized_ids
            if bool(user.payroll_allowance_eligible) != next_value:
                user.payroll_allowance_eligible = next_value
                user.save(update_fields=['payroll_allowance_eligible'])

    _bump_payroll_cache_version()

    return Response({
        'success': True,
        'message': 'Payroll allowance eligibility updated.',
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_summary(request):
    if not _can_manage_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    cache_enabled = getattr(settings, 'ENABLE_API_RESPONSE_CACHE', True)
    cache_version = _get_payroll_cache_version() if cache_enabled else 0
    cache_hash = hashlib.md5(request.get_full_path().encode('utf-8')).hexdigest()
    cache_key = f"payroll:attendance-summary:v{cache_version}:user:{request.user.id}:{cache_hash}"
    if cache_enabled:
        cached_payload = cache.get(cache_key)
        if cached_payload is not None:
            response = Response(cached_payload)
            response['Cache-Control'] = f"private, max-age={settings.API_CACHE_TTL_SHORT}"
            return response

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

    payload = _attendance_summary(employee, period_start, period_end)
    if cache_enabled:
        cache.set(cache_key, payload, timeout=settings.API_CACHE_TTL_SHORT)
    response = Response(payload)
    response['Cache-Control'] = f"private, max-age={settings.API_CACHE_TTL_SHORT}"
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_payroll(request):
    """Process payroll with server-side computed totals and profile-based signatures."""
    if not _can_manage_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    employee_id = request.data.get('employee_id')
    period_start_raw = request.data.get('period_start')
    period_end_raw = request.data.get('period_end')
    payslip_form = request.data.get('payslip_form') or {}

    if not isinstance(payslip_form, dict):
        return Response({'error': 'payslip_form must be an object.'}, status=status.HTTP_400_BAD_REQUEST)

    if not employee_id or not period_start_raw or not period_end_raw:
        return Response({'error': 'employee_id, period_start, and period_end are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        employee = CustomUser.objects.get(id=employee_id, is_active=True)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        period_start = _parse_iso_date(period_start_raw, 'period_start')
        period_end = _parse_iso_date(period_end_raw, 'period_end')
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    if period_end < period_start:
        return Response({'error': 'period_end cannot be earlier than period_start.'}, status=status.HTTP_400_BAD_REQUEST)

    if PaySlip.objects.filter(employee=employee, period_start=period_start, period_end=period_end).exists():
        return Response(
            {'error': 'Payroll already exists for this employee and period.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    submitted_contributions = payslip_form.get('government_contributions')
    contribution_items = []
    if isinstance(submitted_contributions, list) and submitted_contributions:
        for index, entry in enumerate(submitted_contributions):
            if not isinstance(entry, dict):
                return Response({'error': f'government_contributions[{index}] must be an object.'}, status=status.HTTP_400_BAD_REQUEST)
            name = (entry.get('name') or '').strip() or f'Contribution {index + 1}'
            try:
                amount = _parse_money_input(entry.get('amount'), f'government_contributions[{index}].amount')
            except ValueError as exc:
                return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            contribution_items.append({
                'id': entry.get('id'),
                'name': name,
                'category': 'contribution',
                'type': 'fixed',
                'rate': str(amount),
                'amount': str(amount),
            })
    else:
        employee_contributions = EmployeeContribution.objects.filter(employee=employee, is_active=True).order_by('name')
        contribution_items = [{
            'id': row.id,
            'name': row.name,
            'category': 'contribution',
            'type': 'fixed',
            'rate': str(_safe_money(row.amount)),
            'amount': str(_safe_money(row.amount)),
        } for row in employee_contributions]

    contribution_total = _safe_money(
        sum(Decimal(item['amount']) for item in contribution_items) if contribution_items else Decimal('0')
    )

    if payslip_form.get('monthly') in [None, '']:
        return Response({'error': 'monthly is required in payslip_form.'}, status=status.HTTP_400_BAD_REQUEST)
    if payslip_form.get('basic_salary') in [None, '']:
        return Response({'error': 'basic_salary is required in payslip_form.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        monthly_amount = _parse_money_input(payslip_form.get('monthly'), 'monthly')
        basic_salary = _parse_money_input(payslip_form.get('basic_salary'), 'basic_salary')
        regular_overtime = _parse_money_input(payslip_form.get('regular_overtime'), 'regular_overtime')
        late_undertime = _parse_money_input(payslip_form.get('late_undertime'), 'late_undertime')
        rest_day_ot = _parse_money_input(payslip_form.get('rest_day_ot'), 'rest_day_ot')
        payroll_allowance = _parse_money_input(payslip_form.get('payroll_allowance'), 'payroll_allowance')
        company_loan_cash_advance = _parse_money_input(
            payslip_form.get('company_loan_cash_advance'),
            'company_loan_cash_advance',
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    if monthly_amount <= 0:
        return Response({'error': 'monthly must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)
    if basic_salary <= 0:
        return Response({'error': 'basic_salary must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

    if not employee.payroll_allowance_eligible:
        payroll_allowance = _safe_money(Decimal('0'))

    gross_salary = _safe_money(basic_salary + regular_overtime + rest_day_ot)
    net_taxable_salary = _safe_money(max(Decimal('0'), gross_salary - late_undertime))

    # Payroll Tax is disabled in the current payroll flow.
    payroll_tax = _safe_money(Decimal('0'))

    deductions_total = _safe_money(contribution_total + payroll_tax)
    salary_net_pay = _safe_money(
        max(
            Decimal('0'),
            net_taxable_salary + payroll_allowance - deductions_total - company_loan_cash_advance,
        )
    )

    tax_amount = payroll_tax
    allowances_total = payroll_allowance
    overtime_amount = regular_overtime
    bonus_amount = rest_day_ot
    net_salary = salary_net_pay

    deduction_items = list(contribution_items)

    prepared_by_name = (payslip_form.get('prepared_by') or '').strip()
    if not prepared_by_name:
        prepared_by_name = _display_name(request.user)

    prepared_by_signature = (payslip_form.get('prepared_by_signature') or '').strip() or (request.user.signature_image or '')

    top_management_user = (
        CustomUser.objects
        .filter(is_active=True, role__in=['ceo', 'president'])
        .order_by('last_name', 'first_name', 'email')
        .first()
    )
    top_management_name = _display_name(top_management_user) if top_management_user else ''
    top_management_signature = (top_management_user.signature_image or '').strip() if top_management_user else ''

    approved_by_top_management = (payslip_form.get('approved_by_top_management') or '').strip() or top_management_name
    approved_by = (payslip_form.get('approved_by') or '').strip() or approved_by_top_management or top_management_name
    approved_by_signature = (payslip_form.get('approved_by_signature') or '').strip() or top_management_signature

    payslip_details = {
        'designation': payslip_form.get('designation') or (employee.get_role_display() if employee.role else ''),
        'monthly': str(monthly_amount),
        'basic_salary': str(basic_salary),
        'regular_overtime': str(regular_overtime),
        'late_undertime': str(late_undertime),
        'rest_day': '',
        'rest_day_ot': str(rest_day_ot),
        'holiday': '',
        'government_contributions': [
            {'name': item['name'], 'amount': item['amount']}
            for item in contribution_items
        ],
        'net_taxable_salary': str(net_taxable_salary),
        'payroll_tax': str(payroll_tax),
        'total_deductions': str(deductions_total),
        'gross_amount': str(gross_salary),
        'payroll_allowance': str(payroll_allowance),
        'company_loan_cash_advance': str(company_loan_cash_advance),
        'salary_net_pay': str(net_salary),
        'prepared_by': prepared_by_name,
        'prepared_by_signature': prepared_by_signature,
        'approved_by_top_management': approved_by_top_management,
        'approved_by': approved_by,
        'approved_by_signature': approved_by_signature,
    }

    working_days = _count_weekdays(period_start, period_end)
    summary = {
        'working_days': working_days,
        'days_present': working_days,
        'days_absent': 0,
        'days_on_leave': 0,
        'late_count': 0,
        'total_records': 0,
        'total_hours': 0.0,
        'undertime_hours': 0.0,
        'totalDays': working_days,
        'leaveCount': 0,
        'absences': 0,
        'lateCount': 0,
        'undertimeHours': 0.0,
        'undertime': 0.0,
    }

    daily_rate = _safe_money(Decimal('0'))
    if working_days > 0:
        daily_rate = _safe_money(basic_salary / Decimal(working_days))

    notes_payload = json.dumps(payslip_details)

    sss_amount = _safe_money(sum(
        Decimal(item['amount']) for item in contribution_items
        if 'sss' in (item.get('name') or '').lower()
    ))
    philhealth_amount = _safe_money(sum(
        Decimal(item['amount']) for item in contribution_items
        if 'philhealth' in (item.get('name') or '').lower()
    ))
    pagibig_amount = _safe_money(sum(
        Decimal(item['amount']) for item in contribution_items
        if 'pag-ibig' in (item.get('name') or '').lower() or 'pag ibig' in (item.get('name') or '').lower()
    ))

    try:
        with transaction.atomic():
            payslip = PaySlip.objects.create(
                employee=employee,
                period_start=period_start,
                period_end=period_end,
                base_salary=basic_salary,
                allowances_total=allowances_total,
                overtime_amount=overtime_amount,
                bonus=bonus_amount,
                gross_salary=gross_salary,
                tax=tax_amount,
                deductions_total=deductions_total,
                net_salary=net_salary,
                working_days=summary['working_days'],
                days_present=summary['days_present'],
                days_absent=summary['days_absent'],
                days_on_leave=summary['days_on_leave'],
                notes=notes_payload,
                status='generated',
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
    except IntegrityError:
        return Response(
            {'error': 'Payroll already exists for this employee and period.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        return Response({'error': f'Database error: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    image_result = None
    email_result = None
    try:
        from .image_generator import generate_payslip_image
        from .email_utils import save_payslip_image_and_send_email

        payslip_data = {
            'employee_name': f"{employee.first_name} {employee.last_name}".strip() or employee.email,
            'employee_email': employee.email,
            'employee_role': employee.get_role_display() if employee.role else '',
            'period_start': str(period_start),
            'period_end': str(period_end),
            'base_salary': basic_salary,
            'allowances_total': allowances_total,
            'overtime_amount': overtime_amount,
            'bonus': bonus_amount,
            'gross_salary': gross_salary,
            'deductions_total': deductions_total,
            'tax': tax_amount,
            'net_salary': net_salary,
            'working_days': summary['working_days'],
            'days_present': summary['days_present'],
            'days_absent': summary['days_absent'],
            'days_on_leave': summary['days_on_leave'],
            'payslip_details': payslip_details,
        }

        image_buffer = generate_payslip_image(payslip_data)
        period_str = f"{period_start.year}-{period_start.month:02d}"
        delivery_result = save_payslip_image_and_send_email(employee, payslip, payslip_data, image_buffer, period_str)

        image_result = {
            'success': delivery_result.get('image_saved', False),
            'image_endpoint': delivery_result.get('image_endpoint'),
            'storage': delivery_result.get('storage', 'database'),
        }
        email_result = delivery_result.get('email', {})
    except Exception as exc:
        image_result = {'success': False, 'error': str(exc), 'image_endpoint': None, 'storage': 'database'}
        email_result = {'sent': False, 'error': str(exc), 'message': f'Error: {str(exc)}'}

    if email_result and email_result.get('sent'):
        period_label = f"{period_start.strftime('%b %d, %Y')} to {period_end.strftime('%b %d, %Y')}"
        is_executive = (employee.role in ['ceo', 'president'])
        _notify_employee(
            recipient=employee,
            actor=request.user,
            notif_type='ceo_payroll_processed' if is_executive else 'payroll_processed',
            title='Executive Payroll Processed and Emailed' if is_executive else 'Payroll Processed and Emailed',
            message=(
                f'Your payroll for {period_label} has been processed and your payslip was emailed to {employee.email}.'
            ),
        )

    if not email_result:
        email_result = {'sent': False, 'message': 'Email not attempted'}
    if 'message' not in email_result:
        email_result['message'] = email_result.get('error', 'Unknown error')

    response_data = {
        'success': True,
        'message': 'Payroll processed successfully.',
        'payslip': _serialize_payslip(payslip),
        'calculation': {
            'daily_rate': str(daily_rate),
            'base_salary': str(basic_salary),
            'net_taxable_salary': str(net_taxable_salary),
            'deductions': {
                'late_undertime': str(late_undertime),
                'sss': str(sss_amount),
                'philHealth': str(philhealth_amount),
                'pagIbig': str(pagibig_amount),
                'company_loan_cash_advance': str(company_loan_cash_advance),
                'tax': str(tax_amount),
            },
            'deduction_items': deduction_items,
            'configured_deductions_total': str(deductions_total),
            'government_contributions_total': str(contribution_total),
            'total_deductions': str(deductions_total),
            'gross_amount': str(gross_salary),
            'payroll_allowance': str(allowances_total),
            'net_salary': str(net_salary),
        },
        'payslip_details': payslip_details,
        'attendance_summary': summary,
        'image': {
            'generated': image_result.get('success', False) if image_result else False,
            'url': image_result.get('image_endpoint') if image_result and image_result.get('success') else None,
            'storage': image_result.get('storage', 'database') if image_result else 'database',
        },
        'email': {
            'sent': email_result.get('sent', False) if email_result else False,
            'message': email_result.get('message') if email_result else 'Not attempted',
            'recipient': email_result.get('recipient') if email_result else employee.email,
        },
    }
    _bump_payroll_cache_version()
    return Response(response_data, status=status.HTTP_201_CREATED)


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
    if not _can_view_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    cache_enabled = getattr(settings, 'ENABLE_API_RESPONSE_CACHE', True)
    cache_version = _get_payroll_cache_version() if cache_enabled else 0

    # Cache by user + full query string to prevent cross-user leakage.
    cache_hash = hashlib.md5(request.get_full_path().encode('utf-8')).hexdigest()
    cache_key = f"payroll:recent:v{cache_version}:user:{request.user.id}:{cache_hash}"
    if cache_enabled:
        cached_payload = cache.get(cache_key)
        if cached_payload is not None:
            response = Response(cached_payload)
            response['Cache-Control'] = f"private, max-age={settings.API_CACHE_TTL_SHORT}"
            return response

    created_on_raw = request.query_params.get('created_on')
    created_from_raw = request.query_params.get('created_from')
    created_to_raw = request.query_params.get('created_to')
    limit_raw = request.query_params.get('limit')

    records = PaySlip.objects.select_related('employee').defer('payslip_image').order_by('-created_at', '-period_end')

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
    payload = [_serialize_payslip(record) for record in records]
    if cache_enabled:
        cache.set(cache_key, payload, timeout=settings.API_CACHE_TTL_SHORT)
    response = Response(payload)
    response['Cache-Control'] = f"private, max-age={settings.API_CACHE_TTL_SHORT}"
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payroll_payslip_image(request, payslip_id):
    payslip = PaySlip.objects.select_related('employee').filter(id=payslip_id).first()
    if not payslip:
        return Response({'error': 'Payroll record not found.'}, status=status.HTTP_404_NOT_FOUND)

    can_view = _can_view_payroll(request.user) or request.user.id == payslip.employee_id
    if not can_view:
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    if not payslip.payslip_image:
        return Response({'error': 'Payslip image not found for this record.'}, status=status.HTTP_404_NOT_FOUND)

    content_type = payslip.payslip_image_content_type or 'image/png'
    filename = payslip.payslip_image_filename or f'payslip_{payslip.id}.png'
    response = HttpResponse(bytes(payslip.payslip_image), content_type=content_type)
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def employee_contributions(request, employee_id):
    """Get or create employee-specific contributions (SSS, PhilHealth, Pag-IBIG, etc.)"""
    if not _can_manage_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    try:
        employee = CustomUser.objects.get(id=employee_id, is_active=True)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        contributions = EmployeeContribution.objects.filter(employee=employee, is_active=True).order_by('name')
        return Response([{
            'id': c.id,
            'name': c.name,
            'amount': str(c.amount),
        } for c in contributions])

    # POST: Create new contribution
    name = (request.data.get('name') or '').strip()
    amount_raw = request.data.get('amount')

    if not name or amount_raw in [None, '']:
        return Response({'error': 'name and amount are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        amount = _safe_money(Decimal(str(amount_raw)))
        if amount < 0:
            return Response({'error': 'amount must be non-negative.'}, status=status.HTTP_400_BAD_REQUEST)
    except (InvalidOperation, TypeError):
        return Response({'error': 'amount must be numeric.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if contribution type already exists for this employee
    existing = EmployeeContribution.objects.filter(employee=employee, name__iexact=name).first()
    if existing:
        # Update existing
        existing.amount = amount
        existing.is_active = True
        existing.save()

        actor_name = _display_name(request.user)
        _notify_employee(
            recipient=employee,
            actor=request.user,
            notif_type='contribution_updated',
            title='Government Contribution Updated',
            message=(
                f'{actor_name} updated your {existing.name} government contribution to PHP {existing.amount}. '
                'This will be reflected in your payroll deductions.'
            ),
        )

        return Response({
            'id': existing.id,
            'name': existing.name,
            'amount': str(existing.amount),
        }, status=status.HTTP_200_OK)

    # Create new
    contribution = EmployeeContribution.objects.create(
        employee=employee,
        name=name,
        amount=amount,
    )

    actor_name = _display_name(request.user)
    _notify_employee(
        recipient=employee,
        actor=request.user,
        notif_type='contribution_added',
        title='Government Contribution Added',
        message=(
            f'{actor_name} added a new {contribution.name} government contribution '
            f'worth PHP {contribution.amount} to your payroll profile.'
        ),
    )

    return Response({
        'id': contribution.id,
        'name': contribution.name,
        'amount': str(contribution.amount),
    }, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def employee_contribution_detail(request, employee_id, contribution_id):
    """Delete employee contribution"""
    if not _can_manage_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    try:
        employee = CustomUser.objects.get(id=employee_id, is_active=True)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    contribution = EmployeeContribution.objects.filter(id=contribution_id, employee=employee).first()
    if not contribution:
        return Response({'error': 'Contribution not found.'}, status=status.HTTP_404_NOT_FOUND)

    contribution.delete()
    return Response({'success': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notify_employee_payroll(request):
    """Notification endpoint kept for compatibility; WhatsApp is disabled during testing."""
    if not _can_manage_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    employee_id = request.data.get('employee_id')

    if not employee_id:
        return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        employee = CustomUser.objects.get(id=employee_id, is_active=True)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        'success': True,
        'message': 'WhatsApp notifications are disabled for testing. Payroll processing is not blocked.',
        'employee_id': str(employee.id),
    })
