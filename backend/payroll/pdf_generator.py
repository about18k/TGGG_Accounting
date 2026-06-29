"""
PDF Payslip Generator using ReportLab
"""
import io
from datetime import datetime
from decimal import Decimal
from PIL import Image

from reportlab.lib import colors
from reportlab.pdfgen import canvas
from django.conf import settings

# Import helper functions from image_generator to keep calculations and data format consistent
from .image_generator import (
    _to_decimal,
    _fmt_period_date,
    _extract_contributions,
    _find_brand_logo_path,
    _load_signature_image,
)


def format_currency(amount):
    """Format amount as 1,234.56 (no currency symbol) to match sample style."""
    return f"{_to_decimal(amount):,.2f}"


def generate_payslip_pdf(payslip_data):
    """
    Generate a PDF payslip from payslip data.
    
    Args:
        payslip_data: Dictionary or PaySlip model instance containing payslip information with keys:
            - employee_name: str
            - employee_email: str
            - employee_role: str
            - period_start: date object or string
            - period_end: date object or string
            - base_salary: Decimal or str
            - allowances_total: Decimal or str
            - overtime_amount: Decimal or str
            - bonus: Decimal or str
            - gross_salary: Decimal or str
            - deductions_total: Decimal or str
            - tax: Decimal or str
            - net_salary: Decimal or str
            - working_days: int
            - days_present: int
            - days_absent: int
            - days_on_leave: int
            - payslip_details: dict (optional) containing detailed breakdown
    
    Returns:
        BytesIO object containing the PDF
    """
    # Robustly handle Django model instance or dict-like input
    if not hasattr(payslip_data, 'get'):
        # It's likely a PaySlip model instance
        import json
        notes_str = getattr(payslip_data, 'notes', '')
        payslip_details = {}
        if notes_str:
            try:
                payslip_details = json.loads(notes_str)
            except Exception:
                pass
        
        employee = getattr(payslip_data, 'employee', None)
        emp_name = ""
        emp_email = ""
        emp_role = ""
        if employee:
            emp_name = f"{employee.first_name} {employee.last_name}".strip() or employee.email
            emp_email = employee.email
            emp_role = employee.get_role_display() if employee.role else ""

        payslip_dict = {
            'employee_name': emp_name,
            'employee_email': emp_email,
            'employee_role': emp_role,
            'period_start': getattr(payslip_data, 'period_start', None),
            'period_end': getattr(payslip_data, 'period_end', None),
            'base_salary': getattr(payslip_data, 'base_salary', 0),
            'allowances_total': getattr(payslip_data, 'allowances_total', 0),
            'overtime_amount': getattr(payslip_data, 'overtime_amount', 0),
            'bonus': getattr(payslip_data, 'bonus', 0),
            'gross_salary': getattr(payslip_data, 'gross_salary', 0),
            'deductions_total': getattr(payslip_data, 'deductions_total', 0),
            'tax': getattr(payslip_data, 'tax', 0),
            'net_salary': getattr(payslip_data, 'net_salary', 0),
            'working_days': getattr(payslip_data, 'working_days', 0),
            'days_present': getattr(payslip_data, 'days_present', 0),
            'days_absent': getattr(payslip_data, 'days_absent', 0),
            'days_on_leave': getattr(payslip_data, 'days_on_leave', 0),
            'payslip_details': payslip_details,
        }
        payslip_data = payslip_dict

    payslip_details = payslip_data.get('payslip_details', {})

    employee_name = str(payslip_data.get('employee_name', 'N/A'))
    designation = str(payslip_data.get('employee_role', 'N/A')).title()
    period_start = _fmt_period_date(payslip_data.get('period_start'))
    period_end = _fmt_period_date(payslip_data.get('period_end'))

    basic_salary = _to_decimal(payslip_data.get('base_salary', 0))
    monthly_amount = _to_decimal(payslip_details.get('monthly', basic_salary))
    regular_ot = _to_decimal(payslip_details.get('regular_overtime', payslip_data.get('overtime_amount', 0)))
    late_undertime = _to_decimal(payslip_details.get('late_undertime', 0))
    rest_day = _to_decimal(payslip_details.get('rest_day', 0))
    rest_day_ot = _to_decimal(payslip_details.get('rest_day_ot', 0))
    holiday = _to_decimal(payslip_details.get('holiday', 0))
    payroll_allowance = _to_decimal(payslip_details.get('payroll_allowance', payslip_data.get('allowances_total', 0)))
    company_loan = _to_decimal(payslip_details.get('company_loan_cash_advance', 0))

    gross_salary = _to_decimal(payslip_data.get('gross_salary', 0))
    total_deductions = _to_decimal(payslip_details.get('total_deductions', payslip_data.get('deductions_total', 0)))
    payroll_tax = _to_decimal(payslip_details.get('payroll_tax', payslip_data.get('tax', 0)))
    net_salary = _to_decimal(payslip_data.get('net_salary', 0))

    sss, philhealth, pagibig = _extract_contributions(payslip_details)
    net_taxable_salary = _to_decimal(
        payslip_details.get('net_taxable_salary', gross_salary - (sss + philhealth + pagibig))
    )

    prepared_by = str(payslip_details.get('prepared_by', 'Accounting Department')).upper()
    approved_by = str(payslip_details.get('approved_by_top_management', 'Top Management')).upper()
    prepared_by_signature_url = str(payslip_details.get('prepared_by_signature', '')).strip()
    approved_by_signature_url = str(payslip_details.get('approved_by_signature', '')).strip()

    wage_type = payslip_details.get('wage_type', 'monthly')
    days_present_val = payslip_details.get('days_present', payslip_data.get('days_present', 0))
    daily_rate_val = _to_decimal(payslip_details.get('daily_rate', 0))

    # Base Dimensions
    sheet_left, sheet_top, sheet_right, sheet_bottom = 65, 51, 890, 774

    header_top, header_bottom = sheet_top, 260
    strip_top, strip_bottom = 260, 280
    body_top, body_bottom = 280, 641
    net_bar_top, net_bar_bottom = 607, 641

    brand_blue = '#0F3A5C'
    brand_orange = '#F39C3D'
    black = '#000000'
    white = '#FFFFFF'
    text_gray = '#1A1A1A'

    # Fonts
    font_regular = 'Helvetica'
    font_bold = 'Helvetica-Bold'

    label_font_sz = 12.5
    value_font_sz = 12.5
    section_font_sz = 13.5
    row_font_sz = 14.5
    row_bold_font_sz = 14.8
    strip_font_sz = 12.8
    net_font_sz = 16
    sign_label_font_sz = 12.5
    sign_name_font_sz = 13.2
    sign_role_font_sz = 11.8
    tagline_font_sz = 15.5

    # ReportLab scaling math to center perfectly on A4 Landscape
    a4_w, a4_h = 841.89, 595.27
    f = 595.27 / 804.0
    dx = (a4_w - 960.0 * f) / 2
    dy = 0.0

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(a4_w, a4_h))

    # Helper function: Draw text using PIL coordinate alignment and sizing
    def draw_text_pil(canvas_obj, x_pil, y_pil, text, font_name, font_size_unscaled, color_hex, anchor='la'):
        font_size = font_size_unscaled * f
        canvas_obj.setFillColor(colors.HexColor(color_hex))
        
        # Determine coordinates
        x_pdf = dx + x_pil * f
        y_pdf = dy + (804.0 - y_pil) * f
        
        w = canvas_obj.stringWidth(text, font_name, font_size)
        
        # Horizontal alignment
        h_align = anchor[0]
        if h_align == 'm':
            x_base = x_pdf - w / 2.0
        elif h_align == 'r':
            x_base = x_pdf - w
        else:  # 'l'
            x_base = x_pdf
            
        # Vertical alignment (offset to baseline)
        v_align = anchor[1]
        if v_align == 'm':
            y_base = y_pdf - font_size * 0.35
        elif v_align in ('a', 't'):
            y_base = y_pdf - font_size * 0.8
        elif v_align == 'b':
            y_base = y_pdf
        elif v_align == 'd':
            y_base = y_pdf + font_size * 0.2
        else:
            y_base = y_pdf - font_size * 0.8  # default to ascender
            
        canvas_obj.setFont(font_name, font_size)
        canvas_obj.drawString(x_base, y_base, text)

    # Helper function: Draw lines
    def draw_line_pil(canvas_obj, x1_pil, y1_pil, x2_pil, y2_pil, color_hex, line_width_unscaled):
        canvas_obj.setStrokeColor(colors.HexColor(color_hex))
        canvas_obj.setLineWidth(line_width_unscaled * f)
        canvas_obj.line(
            dx + x1_pil * f,
            dy + (804.0 - y1_pil) * f,
            dx + x2_pil * f,
            dy + (804.0 - y2_pil) * f
        )

    # Helper function: Draw rectangle
    def draw_rect_pil(canvas_obj, x1_pil, y1_pil, x2_pil, y2_pil, fill_hex=None, outline_hex=None, outline_width_unscaled=1):
        if fill_hex:
            canvas_obj.setFillColor(colors.HexColor(fill_hex))
            fill = 1
        else:
            fill = 0
            
        if outline_hex:
            canvas_obj.setStrokeColor(colors.HexColor(outline_hex))
            canvas_obj.setLineWidth(outline_width_unscaled * f)
            stroke = 1
        else:
            stroke = 0
            
        w_rect = (x2_pil - x1_pil) * f
        h_rect = (y2_pil - y1_pil) * f
        x_rect = dx + x1_pil * f
        y_rect = dy + (804.0 - y2_pil) * f
        
        canvas_obj.rect(x_rect, y_rect, w_rect, h_rect, stroke=stroke, fill=fill)

    # Draw Outer Sheet
    draw_rect_pil(c, sheet_left, sheet_top, sheet_right, sheet_bottom, fill_hex=white, outline_hex=black, outline_width_unscaled=2)

    # Draw Header Block
    draw_rect_pil(c, sheet_left, header_top, sheet_right, header_bottom, fill_hex=brand_blue, outline_hex=black, outline_width_unscaled=2)

    # Draw Brand Logo
    logo_path = _find_brand_logo_path()
    logo_drawn = False
    if logo_path:
        try:
            logo = Image.open(logo_path)
            logo_w, logo_h = logo.size
            header_w = sheet_right - sheet_left
            header_h = header_bottom - header_top
            
            max_w = header_w * 0.95
            max_h = header_h * 0.95
            
            ratio = min(max_w / logo_w, max_h / logo_h)
            target_w = logo_w * ratio
            target_h = logo_h * ratio
            
            x_pil = sheet_left + (header_w - target_w) / 2
            y_pil = header_top + header_h * 0.025
            
            x_pdf = dx + x_pil * f
            y_pdf = dy + (804.0 - (y_pil + target_h)) * f
            c.drawImage(str(logo_path), x_pdf, y_pdf, width=target_w * f, height=target_h * f, mask='auto')
            logo_drawn = True
        except Exception:
            pass

    if not logo_drawn:
        center_x = (sheet_left + sheet_right) / 2
        draw_text_pil(c, center_x, header_top + 85, 'TRIPLE G', font_bold, 40, white, anchor='mm')
        draw_text_pil(c, center_x, header_top + 125, 'DESIGN STUDIO + CONSTRUCTION', font_bold, 16, white, anchor='mm')

    # Period strip
    draw_rect_pil(c, sheet_left, strip_top, sheet_right, strip_bottom, fill_hex=brand_orange, outline_hex=black, outline_width_unscaled=1)
    draw_text_pil(
        c,
        (sheet_left + sheet_right) / 2,
        (strip_top + strip_bottom) / 2,
        f'TGGG PAYSLIP  {period_start} to {period_end}',
        font_bold,
        strip_font_sz,
        black,
        anchor='mm',
    )

    # Main body region
    draw_rect_pil(c, sheet_left, body_top, sheet_right, body_bottom, fill_hex=white, outline_hex=black, outline_width_unscaled=2)

    # Employee metadata row
    draw_text_pil(c, 72, 327, 'Employee Name:', font_regular, label_font_sz, text_gray, anchor='la')
    draw_text_pil(c, 258, 327, employee_name, font_bold, value_font_sz, black, anchor='la')

    draw_text_pil(c, 72, 351, 'Designation:', font_regular, label_font_sz, text_gray, anchor='la')
    draw_text_pil(c, 258, 351, designation, font_bold, value_font_sz, black, anchor='la')

    # Wage info on same row as Designation, right column
    if wage_type == 'daily':
        wage_label = 'Daily Rate'
        wage_display_val = daily_rate_val
    else:
        wage_label = 'Monthly'
        wage_display_val = monthly_amount
    draw_text_pil(c, 605, 351, wage_label, font_regular, label_font_sz, text_gray, anchor='la')
    draw_text_pil(c, 882, 351, format_currency(wage_display_val), font_bold, value_font_sz, black, anchor='ra')

    # Earnings & Deductions Tables
    left_label_x = 113
    left_value_x = 422
    right_label_x = 546
    right_value_x = 818
    row_start_y = 399
    row_step = 23

    # Section Headers (centered over columns)
    earnings_center_x = (left_label_x + left_value_x) / 2
    deductions_center_x = (right_label_x + right_value_x) / 2
    draw_text_pil(c, earnings_center_x, 375, 'Earnings:', font_regular, section_font_sz, black, anchor='ma')
    draw_text_pil(c, deductions_center_x, 375, 'Deductions:', font_regular, section_font_sz, black, anchor='ma')

    basic_salary_label = 'Basic Salary'
    if wage_type == 'daily':
        basic_salary_label = f"Basic Pay (₱{format_currency(daily_rate_val)}/day x {days_present_val} days)"

    earnings_rows = [
        (basic_salary_label, basic_salary),
        ('Regular Overtime', regular_ot),
        ('Late/Undertime', late_undertime),
        ('Rest Day', rest_day),
        ('Rest Day OT', rest_day_ot),
        ('Holiday', holiday),
    ]
    for index, (label, amount) in enumerate(earnings_rows):
        y_pos = row_start_y + (index * row_step)
        draw_text_pil(c, left_label_x, y_pos, label, font_regular, row_font_sz, text_gray, anchor='la')
        draw_text_pil(c, left_value_x, y_pos, format_currency(amount), font_regular, row_font_sz, black, anchor='ra')

    deductions_rows = []
    has_sss = any('sss' in str(item.get('name', '')).lower() for item in payslip_details.get('government_contributions', []) or [])
    has_phil = any('phil' in str(item.get('name', '')).lower() for item in payslip_details.get('government_contributions', []) or [])
    has_pag = any(('pag' in str(item.get('name', '')).lower() or 'ibig' in str(item.get('name', '')).lower()) for item in payslip_details.get('government_contributions', []) or [])

    if has_sss:
        deductions_rows.append(('SSS', sss, False))
    if has_phil:
        deductions_rows.append(('Philhealth', philhealth, False))
    if has_pag:
        deductions_rows.append(('Pag-ibig', pagibig, False))

    deductions_rows.extend([
        ('NET Taxable Salary', net_taxable_salary, True),
        ('Payroll Tax', payroll_tax, False),
        ('Total Deductions', total_deductions, False),
    ])

    for index, (label, amount, is_bold) in enumerate(deductions_rows):
        y_pos = row_start_y + (index * row_step)
        font = font_bold if is_bold else font_regular
        draw_text_pil(
            c,
            right_label_x,
            y_pos,
            label,
            font,
            row_bold_font_sz if is_bold else row_font_sz,
            black if is_bold else text_gray,
            anchor='la'
        )
        draw_text_pil(
            c,
            right_value_x,
            y_pos,
            format_currency(amount),
            font,
            row_bold_font_sz if is_bold else row_font_sz,
            black,
            anchor='ra'
        )

    # GROSS Amount and Allowances
    draw_text_pil(c, left_label_x, 558, 'GROSS Amount', font_bold, row_bold_font_sz, black, anchor='la')
    draw_text_pil(c, left_value_x, 558, format_currency(gross_salary), font_bold, row_bold_font_sz, black, anchor='ra')

    draw_text_pil(c, right_label_x, 558, 'Payroll Allowance', font_regular, row_font_sz, text_gray, anchor='la')
    draw_text_pil(c, right_value_x, 558, format_currency(payroll_allowance), font_regular, row_font_sz, black, anchor='ra')

    draw_text_pil(c, right_label_x, 581, 'Company Loan/Cash Advance', font_regular, row_font_sz, text_gray, anchor='la')
    draw_text_pil(c, right_value_x, 581, format_currency(company_loan), font_regular, row_font_sz, black, anchor='ra')

    # Net pay strip
    net_bar_center_y = (net_bar_top + net_bar_bottom) / 2
    draw_rect_pil(c, sheet_left, net_bar_top, sheet_right, net_bar_bottom, fill_hex=brand_orange, outline_hex=black, outline_width_unscaled=2)
    draw_text_pil(c, 205, net_bar_center_y, 'SALARY NET PAY', font_bold, net_font_sz, black, anchor='lm')
    draw_text_pil(c, 718, net_bar_center_y, format_currency(net_salary), font_bold, net_font_sz, black, anchor='rm')

    # Signature Block Setup — two columns aligned to the outer ends
    col_width = 220

    left_line_start = sheet_left + 16
    left_line_end = left_line_start + col_width
    left_center_x = (left_line_start + left_line_end) / 2

    right_line_end = sheet_right - 16
    right_line_start = right_line_end - col_width
    right_center_x = (right_line_start + right_line_end) / 2

    draw_text_pil(c, left_line_start, 656, 'Prepared By:', font_regular, sign_label_font_sz, text_gray, anchor='la')
    draw_text_pil(c, right_line_start, 656, 'Approved by:', font_regular, sign_label_font_sz, text_gray, anchor='la')

    left_line_y = 704
    right_line_y = 704
    draw_line_pil(c, left_line_start, left_line_y, left_line_end, left_line_y, black, 1)
    draw_line_pil(c, right_line_start, right_line_y, right_line_end, right_line_y, black, 1)

    # Draw Prepared By Signature image if present
    left_signature = _load_signature_image(
        prepared_by_signature_url,
        max_width=170,
        max_height=44,
    )
    if left_signature:
        try:
            sig_w = left_signature.width
            sig_h = left_signature.height
            x_pil = left_center_x - (sig_w / 2)
            y_pil = 675
            
            x_pdf = dx + x_pil * f
            y_pdf = dy + (804.0 - (y_pil + sig_h)) * f
            c.drawImage(left_signature, x_pdf, y_pdf, width=sig_w * f, height=sig_h * f, mask='auto')
        except Exception:
            pass

    # Draw Approved By Signature image if present
    right_signature = _load_signature_image(
        approved_by_signature_url,
        max_width=170,
        max_height=44,
    )
    if right_signature:
        try:
            sig_w = right_signature.width
            sig_h = right_signature.height
            x_pil = right_center_x - (sig_w / 2)
            y_pil = 675
            
            x_pdf = dx + x_pil * f
            y_pdf = dy + (804.0 - (y_pil + sig_h)) * f
            c.drawImage(right_signature, x_pdf, y_pdf, width=sig_w * f, height=sig_h * f, mask='auto')
        except Exception:
            pass

    # Signature names sit ON TOP of the line; roles sit below
    name_y = 696
    role_y = 717
    draw_text_pil(c, left_center_x, name_y, prepared_by, font_bold, sign_name_font_sz, black, anchor='mm')
    draw_text_pil(c, left_center_x, role_y, 'Accounting Department', font_regular, sign_role_font_sz, text_gray, anchor='mm')

    draw_text_pil(c, right_center_x, name_y, approved_by, font_bold, sign_name_font_sz, black, anchor='mm')
    draw_text_pil(c, right_center_x, role_y, 'CEO', font_regular, sign_role_font_sz, text_gray, anchor='mm')

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer
