import json
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, transaction
from django.http import HttpResponse
from django.utils import timezone
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


def _can_manage_payroll(user):
    return bool(user.is_staff or user.is_superuser or user.role in PAYROLL_MANAGER_ROLES)


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
            'salary': str(salary_structure.base_salary) if salary_structure else None,
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
    """Process payroll using manual payslip inputs for a given employee and period."""
    import traceback
    print("\n" + "="*80)
    print("🔍 DEBUG: process_payroll called")
    print("="*80)
    
    try:
        print(f"📥 Request data: {request.data}")
        print(f"👤 User: {request.user} (authenticated: {request.user.is_authenticated})")
        
        if not _can_manage_payroll(request.user):
            print("❌ Authorization failed")
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        employee_id = request.data.get('employee_id')
        period_start_raw = request.data.get('period_start')
        period_end_raw = request.data.get('period_end')
        payslip_form = request.data.get('payslip_form') or {}
        
        print(f"📋 employee_id: {employee_id}")
        print(f"📅 period_start: {period_start_raw}")
        print(f"📅 period_end: {period_end_raw}")
        print(f"📝 payslip_form keys: {list(payslip_form.keys())}")
        
        if not isinstance(payslip_form, dict):
            print("❌ payslip_form is not a dict")
            return Response({'error': 'payslip_form must be an object.'}, status=status.HTTP_400_BAD_REQUEST)

        if not employee_id or not period_start_raw or not period_end_raw:
            print("❌ Missing required fields")
            return Response({'error': 'employee_id, period_start, and period_end are required.'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"❌ Initial validation error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'Initial validation error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        print(f"🔍 Looking up employee with ID: {employee_id}")
        employee = CustomUser.objects.get(id=employee_id, is_active=True)
        print(f"✅ Employee found: {employee.email}")
    except CustomUser.DoesNotExist:
        print(f"❌ Employee not found with ID: {employee_id}")
        return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"❌ Error looking up employee: {e}")
        print(traceback.format_exc())
        return Response({'error': f'Error looking up employee: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        print(f"🔍 Parsing dates...")
        period_start = _parse_iso_date(period_start_raw, 'period_start')
        period_end = _parse_iso_date(period_end_raw, 'period_end')
        print(f"✅ Dates parsed: {period_start} to {period_end}")
    except ValueError as exc:
        print(f"❌ Date parsing error: {exc}")
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"❌ Unexpected date parsing error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'Date parsing error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        # Keep backward compatibility by using configured employee contributions when payload is empty.
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

    print(f"🔍 Validating required fields...")
    if payslip_form.get('monthly') in [None, '']:
        print("❌ monthly is missing")
        return Response({'error': 'monthly is required in payslip_form.'}, status=status.HTTP_400_BAD_REQUEST)
    if payslip_form.get('basic_salary') in [None, '']:
        print("❌ basic_salary is missing")
        return Response({'error': 'basic_salary is required in payslip_form.'}, status=status.HTTP_400_BAD_REQUEST)

    print(f"✅ Required fields present")
    print(f"🔍 Parsing money inputs...")
    try:
        monthly_amount = _parse_money_input(payslip_form.get('monthly'), 'monthly')
        print(f"  monthly_amount: {monthly_amount}")
        basic_salary = _parse_money_input(payslip_form.get('basic_salary'), 'basic_salary')
        print(f"  basic_salary: {basic_salary}")
        regular_overtime = _parse_money_input(payslip_form.get('regular_overtime'), 'regular_overtime')
        late_undertime = _parse_money_input(payslip_form.get('late_undertime'), 'late_undertime')
        rest_day_ot = _parse_money_input(payslip_form.get('rest_day_ot'), 'rest_day_ot')
        gross_salary = _parse_money_input(
            payslip_form.get('gross_amount'),
            'gross_amount',
            _safe_money(basic_salary + regular_overtime + rest_day_ot),
        )
        print(f"  gross_salary: {gross_salary}")
        net_taxable_salary = _parse_money_input(
            payslip_form.get('net_taxable_salary'),
            'net_taxable_salary',
            gross_salary,
        )
        payroll_tax = _parse_money_input(payslip_form.get('payroll_tax'), 'payroll_tax')
        submitted_total_deductions = _parse_money_input(
            payslip_form.get('total_deductions'),
            'total_deductions',
            contribution_total,
        )
        payroll_allowance = _parse_money_input(payslip_form.get('payroll_allowance'), 'payroll_allowance')
        company_loan_cash_advance = _parse_money_input(
            payslip_form.get('company_loan_cash_advance'),
            'company_loan_cash_advance',
        )
        salary_net_pay = _parse_money_input(
            payslip_form.get('salary_net_pay'),
            'salary_net_pay',
            _safe_money(gross_salary + payroll_allowance - company_loan_cash_advance - contribution_total),
        )
        print(f"✅ All money inputs parsed successfully")
    except ValueError as exc:
        print(f"❌ Money parsing error: {exc}")
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"❌ Unexpected money parsing error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'Money parsing error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    if monthly_amount <= 0:
        return Response({'error': 'monthly must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)
    if basic_salary <= 0:
        return Response({'error': 'basic_salary must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

    if submitted_total_deductions != contribution_total:
        return Response(
            {'error': 'total_deductions must equal the sum of government contributions.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    deductions_total = contribution_total
    tax_amount = payroll_tax
    allowances_total = payroll_allowance
    overtime_amount = regular_overtime
    bonus_amount = rest_day_ot
    net_salary = _safe_money(max(Decimal('0'), salary_net_pay))

    deduction_items = list(contribution_items)

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

    print(f"🔍 Saving payslip to database...")
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
        print(f"✅ PaySlip saved: ID={payslip.id}")

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
        print(f"✅ PayrollProcessing record created")

    except IntegrityError:
        return Response(
            {'error': 'Payroll already exists for this employee and period.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    except Exception as e:
        print(f"❌ Database transaction error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'Database error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Generate payslip image and send via Email
    print(f"🔍 Generating payslip image...")
    image_result = None
    email_result = None
    try:
        from .image_generator import generate_payslip_image
        from .email_utils import save_payslip_image_and_send_email
        
        # Prepare payslip data for image generation
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
        
        # Generate image
        image_buffer = generate_payslip_image(payslip_data)
        print(f"✅ Payslip image generated successfully")
        
        # Save image to DB and send via Email
        period_str = f"{period_start.year}-{period_start.month:02d}"
        delivery_result = save_payslip_image_and_send_email(employee, payslip, payslip_data, image_buffer, period_str)
        
        image_result = {
            'success': delivery_result.get('image_saved', False),
            'image_endpoint': delivery_result.get('image_endpoint'),
            'storage': delivery_result.get('storage', 'database'),
        }
        email_result = delivery_result.get('email', {})
        
        if image_result.get('success'):
            print(f"✅ Payslip image saved to DB endpoint: {image_result.get('image_endpoint')}")
        else:
            print(f"⚠️ Image save failed")
        
        if email_result and email_result.get('sent'):
            print(f"✅ Email sent successfully to {email_result.get('recipient')}")
        else:
            print(f"⚠️ Email send failed or skipped: {email_result.get('message') if email_result else 'No result'}")
    
    except Exception as e:
        print(f"⚠️ Image/Email error (non-critical): {e}")
        print(traceback.format_exc())
        # Don't fail the entire request if Image/Email fails
        image_result = {'success': False, 'error': str(e), 'image_endpoint': None, 'storage': 'database'}
        email_result = {'sent': False, 'error': str(e), 'message': f'Error: {str(e)}'}

    if email_result and email_result.get('sent'):
        period_label = f"{period_start.strftime('%b %d, %Y')} to {period_end.strftime('%b %d, %Y')}"
        _notify_employee(
            recipient=employee,
            actor=request.user,
            notif_type='payroll_processed',
            title='Payroll Processed and Emailed',
            message=(
                f'Your payroll for {period_label} has been processed and your payslip was emailed to {employee.email}.'
            ),
        )

    print(f"🔍 Preparing response...")
    try:
        # Ensure email_result has proper structure
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
        'image': {
            'generated': image_result.get('success', False) if image_result else False,
            'url': image_result.get('image_endpoint') if image_result and image_result.get('success') else None,
            'storage': image_result.get('storage', 'database') if image_result else 'database',
        },
        'email': {
            'sent': email_result.get('sent', False) if email_result else False,
            'message': email_result.get('message') if email_result else 'Not attempted',
            'recipient': email_result.get('recipient') if email_result else employee.email,
        }
    }
        print(f"✅ Response prepared successfully")
        print("="*80 + "\n")
        return Response(response_data, status=status.HTTP_201_CREATED)
    except Exception as e:
        print(f"❌ Response preparation error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'Response preparation error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
    return Response([_serialize_payslip(record) for record in records])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payroll_payslip_image(request, payslip_id):
    payslip = PaySlip.objects.select_related('employee').filter(id=payslip_id).first()
    if not payslip:
        return Response({'error': 'Payroll record not found.'}, status=status.HTTP_404_NOT_FOUND)

    can_view = _can_manage_payroll(request.user) or request.user.id == payslip.employee_id
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
