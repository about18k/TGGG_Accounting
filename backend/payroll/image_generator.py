"""
Payslip Image Generator using Pillow (PIL).
Produces a landscape payslip layout that follows the provided sample structure.
"""

import io
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
import urllib.request

from django.conf import settings
from PIL import Image, ImageDraw, ImageFont


def _to_decimal(value, default='0'):
    if value in (None, ''):
        return Decimal(default)
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(default)


def format_currency(amount):
    """Format amount as 1,234.56 (no currency symbol) to match sample style."""
    return f"{_to_decimal(amount):,.2f}"


def get_font(size, bold=False):
    """Get font with fallback chain for Windows/Linux."""
    candidates = []
    if bold:
        candidates.extend([
            'arialbd.ttf',
            'Arial-BoldMT.ttf',
            'DejaVuSans-Bold.ttf',
            'LiberationSans-Bold.ttf',
        ])
    else:
        candidates.extend([
            'arial.ttf',
            'ArialMT.ttf',
            'DejaVuSans.ttf',
            'LiberationSans-Regular.ttf',
        ])

    for font_name in candidates:
        try:
            return ImageFont.truetype(font_name, size)
        except Exception:
            continue

    return ImageFont.load_default()


def _fmt_period_date(raw):
    try:
        parsed = datetime.fromisoformat(str(raw)).date()
        return parsed.strftime('%b. %d, %Y')
    except Exception:
        return str(raw or 'N/A')


def _extract_contributions(payslip_details):
    sss = Decimal('0')
    philhealth = Decimal('0')
    pagibig = Decimal('0')

    for item in payslip_details.get('government_contributions', []) or []:
        name = str(item.get('name', '')).lower().replace('_', ' ')
        amount = _to_decimal(item.get('amount', 0))
        if 'sss' in name:
            sss += amount
        elif 'phil' in name:
            philhealth += amount
        elif 'pag' in name or 'ibig' in name:
            pagibig += amount

    return sss, philhealth, pagibig


def _find_brand_logo_path():
    """Try common logo paths used in this workspace."""
    base_dir = Path(settings.BASE_DIR)
    project_root = base_dir.parent
    candidates = [
        project_root / 'frontend' / 'public' / 'formlogo.png',
        project_root / 'frontend' / 'public' / 'logotripleg.png',
        project_root / 'frontend' / 'public' / 'logo.png',
    ]
    for path in candidates:
        if path.exists():
            return path
    return None


def _load_signature_image(source_url, max_width, max_height):
    """Load and resize signature image from URL (or local path) for payslip rendering."""
    if not source_url:
        return None

    try:
        raw_data = None
        source_value = str(source_url).strip()

        if source_value.startswith(('http://', 'https://')):
            with urllib.request.urlopen(source_value, timeout=8) as response:
                raw_data = response.read()
        else:
            local_path = Path(source_value)
            if local_path.exists():
                raw_data = local_path.read_bytes()

        if not raw_data:
            return None

        signature = Image.open(io.BytesIO(raw_data)).convert('RGBA')
        bbox = signature.getbbox()
        if bbox:
            signature = signature.crop(bbox)

        if signature.width == 0 or signature.height == 0:
            return None

        ratio = min(max_width / signature.width, max_height / signature.height)
        target_w = max(1, int(signature.width * ratio))
        target_h = max(1, int(signature.height * ratio))
        return signature.resize((target_w, target_h), Image.LANCZOS)
    except Exception:
        return None


def _draw_header_logo(img, draw, sheet_left, sheet_right, header_top, header_bottom):
    """Draw brand logo in header exactly positioned like sample."""
    logo_path = _find_brand_logo_path()
    if not logo_path:
        return False

    try:
        logo = Image.open(logo_path).convert('RGBA')
        header_w = sheet_right - sheet_left
        header_h = header_bottom - header_top
        
        # Fit logo to header with proper aspect ratio
        max_w = int(header_w * 0.88)
        max_h = int(header_h * 0.75)

        if logo.width == 0 or logo.height == 0:
            return False

        ratio = min(max_w / logo.width, max_h / logo.height)
        target_w = max(1, int(logo.width * ratio))
        target_h = max(1, int(logo.height * ratio))
        logo = logo.resize((target_w, target_h), Image.LANCZOS)

        # Center logo horizontally, place near top
        x = sheet_left + (header_w - target_w) // 2
        y = header_top + int(header_h * 0.12)
        img.paste(logo, (x, y), logo)
        return True
    except Exception:
        return False


def generate_payslip_image(payslip_data):
    """Generate a PNG payslip image from payslip data."""
    payslip_details = payslip_data.get('payslip_details', {})

    employee_name = str(payslip_data.get('employee_name', 'N/A'))
    designation = str(payslip_data.get('employee_role', 'N/A')).title()
    period_start = _fmt_period_date(payslip_data.get('period_start'))
    period_end = _fmt_period_date(payslip_data.get('period_end'))

    basic_salary = _to_decimal(payslip_data.get('base_salary', 0))
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

    # Exact sample dimensions scaled for high quality output.
    # Height is slightly extended so bottom labels are not clipped.
    scale = 2.1
    s = lambda value: int(round(value * scale))

    width, height = s(960), s(804)
    sheet_left, sheet_top, sheet_right, sheet_bottom = s(65), s(51), s(890), s(774)

    header_top, header_bottom = sheet_top, s(295)
    strip_top, strip_bottom = s(295), s(313)
    body_top, body_bottom = s(313), s(641)
    net_bar_top, net_bar_bottom = s(607), s(641)

    img = Image.new('RGB', (width, height), '#DEDEDE')
    draw = ImageDraw.Draw(img)

    brand_blue = '#0F3A5C'
    brand_orange = '#F39C3D'
    black = '#000000'
    white = '#FFFFFF'
    text_gray = '#1A1A1A'

    # Exact font sizes matching sample
    label_font = get_font(s(12.5), bold=False)
    value_font = get_font(s(12.5), bold=True)
    section_font = get_font(s(13.5), bold=False)
    row_font = get_font(s(14.5), bold=False)
    row_bold_font = get_font(s(14.8), bold=True)
    strip_font = get_font(s(12.8), bold=True)
    net_font = get_font(s(16), bold=True)
    sign_label_font = get_font(s(12.5), bold=False)
    sign_name_font = get_font(s(13.2), bold=True)
    sign_role_font = get_font(s(11.8), bold=False)
    tagline_font = get_font(s(15.5), bold=True)

    # Outer sheet
    draw.rectangle([(sheet_left, sheet_top), (sheet_right, sheet_bottom)], fill=white, outline=black, width=2)

    # Header block
    draw.rectangle([(sheet_left, header_top), (sheet_right, header_bottom)], fill=brand_blue, outline=black, width=2)
    logo_drawn = _draw_header_logo(img, draw, sheet_left, sheet_right, header_top, header_bottom)

    if not logo_drawn:
        fallback_title = get_font(s(40), bold=True)
        fallback_subtitle = get_font(s(16), bold=True)
        center_x = (sheet_left + sheet_right) // 2
        draw.text((center_x, header_top + s(85)), 'TRIPLE G', fill=white, font=fallback_title, anchor='mm')
        draw.text((center_x, header_top + s(125)), 'DESIGN STUDIO + CONSTRUCTION', fill=white, font=fallback_subtitle, anchor='mm')

    draw.text(
        ((sheet_left + sheet_right) // 2, header_bottom - s(26)),
        '"We\'re in business to help develop the built environment and change the world."',
        fill=white,
        font=tagline_font,
        anchor='mm',
    )

    # Period strip
    draw.rectangle([(sheet_left, strip_top), (sheet_right, strip_bottom)], fill=brand_orange, outline=black, width=1)
    draw.text(
        ((sheet_left + sheet_right) // 2, (strip_top + strip_bottom) // 2),
        f'TGGG PAYSLIP  {period_start} to {period_end}',
        fill=black,
        font=strip_font,
        anchor='mm',
    )

    # Main body region
    draw.rectangle([(sheet_left, body_top), (sheet_right, body_bottom)], fill=white, outline=black, width=2)

    # Employee and monthly row
    draw.text((s(72), s(321)), 'Employee Name:', fill=text_gray, font=label_font)
    draw.text((s(258), s(321)), employee_name, fill=black, font=value_font)

    draw.text((s(72), s(344)), 'Designation:', fill=text_gray, font=label_font)
    draw.text((s(258), s(344)), designation, fill=black, font=value_font)

    draw.text((s(605), s(344)), 'Monthly', fill=text_gray, font=label_font)
    draw.text((s(882), s(344)), format_currency(basic_salary), fill=black, font=value_font, anchor='ra')

    # Section labels
    draw.text((s(238), s(364)), 'Earnings:', fill=black, font=section_font)
    draw.text((s(638), s(364)), 'Deductions:', fill=black, font=section_font)

    # Main rows
    left_label_x = s(113)
    left_value_x = s(422)
    right_label_x = s(546)
    right_value_x = s(818)
    row_start_y = s(384)
    row_step = s(19.5)

    earnings_rows = [
        ('Basic Salary', basic_salary),
        ('Regular Overtime', regular_ot),
        ('Late/Undertime', late_undertime),
        ('Rest Day', rest_day),
        ('Rest Day OT', rest_day_ot),
        ('Holiday', holiday),
    ]
    for index, (label, amount) in enumerate(earnings_rows):
        y = row_start_y + (index * row_step)
        draw.text((left_label_x, y), label, fill=text_gray, font=row_font)
        draw.text((left_value_x, y), format_currency(amount), fill=black, font=row_font, anchor='ra')

    deductions_rows = [
        ('SSS', sss, False),
        ('Philhealth', philhealth, False),
        ('Pag-ibig', pagibig, False),
        ('NET Taxable Salary', net_taxable_salary, True),
        ('Payroll Tax', payroll_tax, False),
        ('Total Deductions', total_deductions, False),
    ]
    for index, (label, amount, is_bold) in enumerate(deductions_rows):
        y = row_start_y + (index * row_step)
        font = row_bold_font if is_bold else row_font
        draw.text((right_label_x, y), label, fill=text_gray if not is_bold else black, font=font)
        draw.text((right_value_x, y), format_currency(amount), fill=black, font=font, anchor='ra')

    # Lower rows before net bar
    draw.text((left_label_x, s(558)), 'GROSS Amount', fill=black, font=row_bold_font)
    draw.text((left_value_x, s(558)), format_currency(gross_salary), fill=black, font=row_bold_font, anchor='ra')

    draw.text((right_label_x, s(558)), 'Payroll Allowance', fill=text_gray, font=row_font)
    draw.text((right_value_x, s(558)), format_currency(payroll_allowance), fill=black, font=row_font, anchor='ra')

    draw.text((right_label_x, s(580)), 'Company Loan/Cash Advance', fill=text_gray, font=row_font)
    draw.text((right_value_x, s(580)), format_currency(company_loan), fill=black, font=row_font, anchor='ra')

    # Net pay strip
    net_bar_center_y = (net_bar_top + net_bar_bottom) // 2
    net_bar_center_x = (sheet_left + sheet_right) // 2
    draw.rectangle([(sheet_left, net_bar_top), (sheet_right, net_bar_bottom)], fill=brand_orange, outline=black, width=2)
    draw.text((s(205), net_bar_center_y), 'SALARY NET PAY', fill=black, font=net_font, anchor='lm')
    draw.text((s(718), net_bar_center_y), format_currency(net_salary), fill=black, font=net_font, anchor='rm')

    # Signature block
    draw.text((s(70), s(656)), 'Prepared By:', fill=text_gray, font=sign_label_font)
    draw.text((s(568), s(656)), 'Approved by:', fill=text_gray, font=sign_label_font)

    left_line_y = s(704)
    right_line_y = s(704)
    draw.line([(s(65), left_line_y), (s(270), left_line_y)], fill=black, width=1)
    draw.line([(s(563), right_line_y), (s(785), right_line_y)], fill=black, width=1)

    left_signature = _load_signature_image(
        prepared_by_signature_url,
        max_width=s(170),
        max_height=s(44),
    )
    if left_signature:
        left_x = s(168) - (left_signature.width // 2)
        left_y = s(646)
        img.paste(left_signature, (left_x, left_y), left_signature)

    right_signature = _load_signature_image(
        approved_by_signature_url,
        max_width=s(170),
        max_height=s(44),
    )
    if right_signature:
        right_x = s(674) - (right_signature.width // 2)
        right_y = s(646)
        img.paste(right_signature, (right_x, right_y), right_signature)

    draw.text((s(168), s(692)), prepared_by, fill=black, font=sign_name_font, anchor='mm')
    draw.text((s(168), s(717)), 'Accounting Department', fill=text_gray, font=sign_role_font, anchor='mm')

    draw.text((s(674), s(692)), approved_by, fill=black, font=sign_name_font, anchor='mm')
    draw.text((s(674), s(717)), 'Top Management', fill=text_gray, font=sign_role_font, anchor='mm')

    # Bottom "Approved By:" label matching sample
    draw.text((s(70), s(759)), 'Approved By:', fill=text_gray, font=sign_label_font)

    buffer = io.BytesIO()
    img.save(buffer, format='PNG', quality=95)
    buffer.seek(0)
    return buffer
