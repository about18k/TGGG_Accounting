import json
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
from .models import DeductionType, PaySlip, PayrollProcessing, EmployeeContribution
from .whatsapp_utils import normalize_phone_to_e164, send_whatsapp_notification

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
    payslip_form = request.data.get('payslip_form') or {}
    if not isinstance(payslip_form, dict):
        return Response({'error': 'payslip_form must be an object.'}, status=status.HTTP_400_BAD_REQUEST)

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
    computed_base_salary = _safe_money(daily_rate * Decimal(summary['days_present']))
    undertime_hours = _safe_money(Decimal(str(summary.get('undertime_hours', 0))))
    computed_late_deduction = _safe_money(daily_rate * Decimal('0.10') * Decimal(summary['late_count']))
    computed_undertime_deduction = _safe_money((daily_rate / Decimal('8')) * undertime_hours)

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

    contribution_total = _safe_money(sum(Decimal(item['amount']) for item in contribution_items) if contribution_items else Decimal('0'))

    manual_mode = bool(payslip_form)

    if manual_mode:
        try:
            monthly_amount = _parse_money_input(payslip_form.get('monthly'), 'monthly', computed_base_salary)
            basic_salary = _parse_money_input(payslip_form.get('basic_salary'), 'basic_salary', computed_base_salary)
            regular_overtime = _parse_money_input(payslip_form.get('regular_overtime'), 'regular_overtime')
            late_undertime = _parse_money_input(
                payslip_form.get('late_undertime'),
                'late_undertime',
                _safe_money(computed_late_deduction + computed_undertime_deduction),
            )
            rest_day_ot = _parse_money_input(payslip_form.get('rest_day_ot'), 'rest_day_ot')
            gross_salary = _parse_money_input(
                payslip_form.get('gross_amount'),
                'gross_amount',
                _safe_money(basic_salary + regular_overtime + rest_day_ot),
            )
            net_taxable_salary = _parse_money_input(
                payslip_form.get('net_taxable_salary'),
                'net_taxable_salary',
                gross_salary,
            )
            payroll_tax = _parse_money_input(payslip_form.get('payroll_tax'), 'payroll_tax')
            total_deductions_input = _parse_money_input(
                payslip_form.get('total_deductions'),
                'total_deductions',
                _safe_money(late_undertime + payroll_tax + contribution_total),
            )
            payroll_allowance = _parse_money_input(payslip_form.get('payroll_allowance'), 'payroll_allowance')
            company_loan_cash_advance = _parse_money_input(
                payslip_form.get('company_loan_cash_advance'),
                'company_loan_cash_advance',
            )
            salary_net_pay = _parse_money_input(
                payslip_form.get('salary_net_pay'),
                'salary_net_pay',
                _safe_money(gross_salary + payroll_allowance - company_loan_cash_advance - total_deductions_input),
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        deductions_total = total_deductions_input
        tax_amount = payroll_tax
        allowances_total = payroll_allowance
        overtime_amount = regular_overtime
        bonus_amount = rest_day_ot
        net_salary = _safe_money(max(Decimal('0'), salary_net_pay))

        base_deduction_sum = _safe_money(late_undertime + payroll_tax + contribution_total)
        manual_adjustment = _safe_money(max(Decimal('0'), deductions_total - base_deduction_sum))

        deduction_items = []
        if late_undertime > 0:
            deduction_items.append({
                'name': 'Late/Undertime',
                'category': 'attendance',
                'type': 'fixed',
                'rate': str(late_undertime),
                'amount': str(late_undertime),
            })
        deduction_items.extend(contribution_items)
        if payroll_tax > 0:
            deduction_items.append({
                'name': 'Payroll Tax',
                'category': 'tax',
                'type': 'fixed',
                'rate': str(payroll_tax),
                'amount': str(payroll_tax),
            })
        if manual_adjustment > 0:
            deduction_items.append({
                'name': 'Manual Deduction Adjustment',
                'category': 'other',
                'type': 'fixed',
                'rate': str(manual_adjustment),
                'amount': str(manual_adjustment),
            })

        prepared_by_name = (payslip_form.get('prepared_by') or '').strip()
        if not prepared_by_name:
            prepared_by_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email

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
            'approved_by_top_management': (payslip_form.get('approved_by_top_management') or '').strip(),
            'approved_by': (payslip_form.get('approved_by') or '').strip(),
        }
    else:
        configured = _calculate_configured_deductions(computed_base_salary)
        configured_items = configured['items']
        configured_total = configured['total']
        tax_amount = configured['tax_total']

        absence_deduction = _safe_money(daily_rate * Decimal(summary['days_absent']))
        leave_deduction = _safe_money(daily_rate * Decimal(summary['days_on_leave']))
        late_undertime_total = _safe_money(computed_late_deduction + computed_undertime_deduction)

        basic_salary = computed_base_salary
        overtime_amount = _safe_money(Decimal('0'))
        bonus_amount = _safe_money(Decimal('0'))
        allowances_total = _safe_money(Decimal('0'))
        gross_salary = basic_salary
        deductions_total = _safe_money(
            absence_deduction +
            leave_deduction +
            late_undertime_total +
            configured_total +
            contribution_total
        )
        net_salary = _safe_money(max(Decimal('0'), gross_salary - deductions_total))

        deduction_items = [
            {'name': 'Absences', 'category': 'attendance', 'type': 'computed', 'rate': None, 'amount': str(absence_deduction)},
            {'name': 'Unpaid Leave', 'category': 'attendance', 'type': 'computed', 'rate': None, 'amount': str(leave_deduction)},
            {'name': 'Late/Undertime', 'category': 'attendance', 'type': 'computed', 'rate': None, 'amount': str(late_undertime_total)},
            *contribution_items,
            *configured_items,
        ]

        payslip_details = {
            'designation': employee.get_role_display() if employee.role else '',
            'monthly': str(_safe_money(daily_rate * Decimal('22'))),
            'basic_salary': str(basic_salary),
            'regular_overtime': str(_safe_money(Decimal('0'))),
            'late_undertime': str(late_undertime_total),
            'rest_day': '',
            'rest_day_ot': str(_safe_money(Decimal('0'))),
            'holiday': '',
            'government_contributions': [
                {'name': item['name'], 'amount': item['amount']}
                for item in contribution_items
            ],
            'net_taxable_salary': str(gross_salary),
            'payroll_tax': str(tax_amount),
            'total_deductions': str(deductions_total),
            'gross_amount': str(gross_salary),
            'payroll_allowance': str(allowances_total),
            'company_loan_cash_advance': str(_safe_money(Decimal('0'))),
            'salary_net_pay': str(net_salary),
            'prepared_by': f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email,
            'approved_by_top_management': '',
            'approved_by': '',
        }

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

    with transaction.atomic():
        payslip, _created = PaySlip.objects.update_or_create(
            employee=employee,
            period_start=period_start,
            period_end=period_end,
            defaults={
                'base_salary': base_salary,
                'allowances_total': allowances_total,
                'overtime_amount': overtime_amount,
                'bonus': bonus_amount,
                'gross_salary': gross_salary,
                'tax': tax_amount,
                'deductions_total': deductions_total,
                'net_salary': net_salary,
                'working_days': summary['working_days'],
                'days_present': summary['days_present'],
                'days_absent': summary['days_absent'],
                'days_on_leave': summary['days_on_leave'],
                'notes': notes_payload,
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
                'late_undertime': payslip_details.get('late_undertime', '0.00'),
                'sss': str(sss_amount),
                'philHealth': str(philhealth_amount),
                'pagIbig': str(pagibig_amount),
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
    """Send WhatsApp notification to employee about payroll"""
    if not _can_manage_payroll(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    employee_id = request.data.get('employee_id')
    payslip_preview = request.data.get('payslip_preview') or {}
    period_start = request.data.get('period_start')
    period_end = request.data.get('period_end')

    if payslip_preview and not isinstance(payslip_preview, dict):
        return Response({'error': 'payslip_preview must be an object.'}, status=status.HTTP_400_BAD_REQUEST)

    if not employee_id:
        return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        employee = CustomUser.objects.get(id=employee_id, is_active=True)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not employee.phone_number:
        return Response({
            'success': False,
            'message': 'Employee does not have a phone number configured.',
        }, status=status.HTTP_400_BAD_REQUEST)

    # Normalize phone number to E.164 format
    try:
        phone_e164 = normalize_phone_to_e164(employee.phone_number)
    except ValueError as e:
        return Response({
            'success': False,
            'message': f'Invalid phone number format: {str(e)}',
        }, status=status.HTTP_400_BAD_REQUEST)

    # Construct WhatsApp message
    employee_name = f"{employee.first_name} {employee.last_name}".strip() or employee.email
    
    message_lines = [
        f"Hello {employee.first_name or 'there'}!",
        "",
        "Your payroll has been processed. Here are the details:",
    ]
    
    if payslip_preview:
        net_pay = payslip_preview.get('salary_net_pay')
        gross_amount = payslip_preview.get('gross_amount')
        deduction_total = payslip_preview.get('total_deductions')
        
        if gross_amount:
            message_lines.append(f"• Gross Amount: {gross_amount}")
        if deduction_total:
            message_lines.append(f"• Total Deductions: {deduction_total}")
        if net_pay:
            message_lines.append(f"• Net Salary: {net_pay}")
        
        if period_start and period_end:
            message_lines.append(f"• Period: {period_start} to {period_end}")
    
    message_lines.extend([
        "",
        "You can view your complete payslip in the TGGG Accounting system.",
        "Please contact the Accounting Department if you have any questions.",
        "",
        "Thank you!"
    ])
    
    message_body = "\n".join(message_lines)

    # Send WhatsApp notification via Twilio
    result = send_whatsapp_notification(phone_e164, message_body)
    
    if result['success']:
        return Response({
            'success': True,
            'message': result['message'],
            'payslip_preview': payslip_preview,
        })
    else:
        return Response({
            'success': False,
            'message': result['message'],
            'error': result.get('error', 'Unknown error'),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
