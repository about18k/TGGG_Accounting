"""
Payslip Image Generator using Pillow (PIL).
Produces a portrait payslip layout that precisely matches the provided sample.
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
        project_root / 'frontend' / 'public' / 'formlogo.webp',
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


def _draw_header_logo(img, draw, left, right, top, logo_zone_bottom):
    """
    Draw brand logo in the upper portion of the header.
    The logo is centered horizontally and scaled to fill ~95% of the header width/height.
    """
    logo_path = _find_brand_logo_path()
    if not logo_path:
        return False

    try:
        logo = Image.open(logo_path).convert('RGBA')
        if logo.width == 0 or logo.height == 0:
            return False

        zone_w = right - left
        zone_h = logo_zone_bottom - top

        max_w = int(zone_w * 0.95)
        max_h = int(zone_h * 0.95)

        ratio = min(max_w / logo.width, max_h / logo.height)
        target_w = max(1, int(logo.width * ratio))
        target_h = max(1, int(logo.height * ratio))
        logo = logo.resize((target_w, target_h), Image.LANCZOS)

        x = left + (zone_w - target_w) // 2
        y = top + (zone_h - target_h) // 2
        img.paste(logo, (x, y), logo)
        return True
    except Exception:
        return False


def generate_payslip_image(payslip_data):
    """Generate a PNG payslip image from payslip data matching the provided sample."""
    payslip_details = payslip_data.get('payslip_details', {})

    employee_name   = str(payslip_data.get('employee_name', 'N/A')).title()
    designation     = str(payslip_details.get('designation') or payslip_data.get('employee_role', 'N/A')).title()
    period_start    = _fmt_period_date(payslip_data.get('period_start'))
    period_end      = _fmt_period_date(payslip_data.get('period_end'))

    basic_salary     = _to_decimal(payslip_data.get('base_salary', 0))
    monthly_amount   = _to_decimal(payslip_details.get('monthly', basic_salary))
    regular_ot       = _to_decimal(payslip_details.get('regular_overtime', payslip_data.get('overtime_amount', 0)))
    late_undertime   = _to_decimal(payslip_details.get('late_undertime', 0))
    rest_day         = _to_decimal(payslip_details.get('rest_day', 0))
    rest_day_ot      = _to_decimal(payslip_details.get('rest_day_ot', 0))
    holiday          = _to_decimal(payslip_details.get('holiday', 0))
    payroll_allowance = _to_decimal(payslip_details.get('payroll_allowance', payslip_data.get('allowances_total', 0)))
    company_loan     = _to_decimal(payslip_details.get('company_loan_cash_advance', 0))

    gross_salary     = _to_decimal(payslip_details.get('gross_amount', payslip_data.get('gross_salary', 0)))
    total_deductions = _to_decimal(payslip_details.get('total_deductions', payslip_data.get('deductions_total', 0)))
    payroll_tax      = _to_decimal(payslip_details.get('payroll_tax', payslip_data.get('tax', 0)))
    net_salary       = _to_decimal(payslip_data.get('net_salary', 0))

    sss, philhealth, pagibig = _extract_contributions(payslip_details)
    net_taxable_salary = _to_decimal(
        payslip_details.get('net_taxable_salary', gross_salary - (sss + philhealth + pagibig))
    )

    prepared_by             = str(payslip_details.get('prepared_by', 'Accounting Department')).upper()
    approved_by             = str(payslip_details.get('approved_by_top_management', 'Top Management')).upper()
    prepared_by_signature_url = str(payslip_details.get('prepared_by_signature', '')).strip()
    approved_by_signature_url = str(payslip_details.get('approved_by_signature', '')).strip()

    wage_type = payslip_details.get('wage_type', 'monthly')
    days_present_val = payslip_details.get('days_present', payslip_data.get('days_present', 0))
    daily_rate_val = _to_decimal(payslip_details.get('daily_rate', 0))

    # ── Canvas dimensions ─────────────────────────────────────────────────────
    # Portrait orientation, ~960×780 logical units at 2× scale (≈1920×1560 px)
    scale = 2.0
    s = lambda v: int(round(v * scale))

    W, H = s(930), s(790)

    # Outer sheet bounds (with margin)
    SL, ST, SR, SB = s(30), s(30), s(900), s(765)

    # ── Zone boundaries ───────────────────────────────────────────────────────
    # 1. Header (dark navy, logo)
    HEADER_TOP    = ST
    HEADER_BOTTOM = s(220)

    # 2. Period strip (orange)
    STRIP_TOP    = HEADER_BOTTOM
    STRIP_BOTTOM = s(242)

    # 3. Main body
    BODY_TOP    = STRIP_BOTTOM
    BODY_BOTTOM = s(640)

    # 4. Net pay bar (orange, inside body)
    NET_TOP    = s(604)
    NET_BOTTOM = s(640)

    # 5. Signature block
    SIG_TOP  = BODY_BOTTOM
    SIG_BOTTOM = SB

    # Column layout boundaries
    MID_X = s(490)
    LEFT_LABEL_X  = SL + s(42)     # left column label
    LEFT_VALUE_X  = MID_X - s(18)  # left column value (right-aligned)
    RIGHT_LABEL_X = MID_X + s(8)   # right column label
    RIGHT_VALUE_X = SR - s(8)      # right column value (right-aligned)

    # ── Colours ───────────────────────────────────────────────────────────────
    BRAND_NAVY   = '#0C3352'
    BRAND_ORANGE = '#F39024'
    BLACK        = '#000000'
    WHITE        = '#FFFFFF'
    DARK_TEXT    = '#111111'
    GRAY_TEXT    = '#2A2A2A'
    LIGHT_GRAY   = '#F5F5F5'

    # ── Image setup ───────────────────────────────────────────────────────────
    img  = Image.new('RGB', (W, H), '#D0D0D0')
    draw = ImageDraw.Draw(img)

    # ── Fonts ─────────────────────────────────────────────────────────────────
    f_label     = get_font(s(11.5))
    f_value     = get_font(s(11.5), bold=True)
    f_section   = get_font(s(12),   bold=False)
    f_row       = get_font(s(12.5), bold=False)
    f_row_bold  = get_font(s(12.5), bold=True)
    f_strip     = get_font(s(12),   bold=True)
    f_net_label = get_font(s(14.5), bold=True)
    f_net_value = get_font(s(14.5), bold=True)
    f_tagline   = get_font(s(13.5), bold=True)
    f_sign_lbl  = get_font(s(11))
    f_sign_name = get_font(s(12),   bold=True)
    f_sign_role = get_font(s(11))

    # ═════════════════════════════════════════════════════════════════════════
    # 1. HEADER BLOCK
    # ═════════════════════════════════════════════════════════════════════════
    draw.rectangle([(SL, HEADER_TOP), (SR, HEADER_BOTTOM)], fill=BRAND_NAVY)

    # Logo zone fills header area completely
    logo_drawn = _draw_header_logo(img, draw, SL, SR, HEADER_TOP, HEADER_BOTTOM)

    if not logo_drawn:
        # Fallback: draw text header
        cx = (SL + SR) // 2
        draw.text((cx, HEADER_TOP + s(70)),  'TRIPLE G',                   fill=WHITE, font=get_font(s(36), bold=True), anchor='mm')
        draw.text((cx, HEADER_TOP + s(100)), 'DESIGN STUDIO + CONSTRUCTION', fill=WHITE, font=get_font(s(14), bold=True), anchor='mm')

    # ═════════════════════════════════════════════════════════════════════════
    # 2. PERIOD STRIP (orange)
    # ═════════════════════════════════════════════════════════════════════════
    draw.rectangle([(SL, STRIP_TOP), (SR, STRIP_BOTTOM)], fill=BRAND_ORANGE)
    strip_cx = (SL + SR) // 2
    strip_cy = (STRIP_TOP + STRIP_BOTTOM) // 2
    draw.text(
        (strip_cx, strip_cy),
        f'TGGG PAYSLIP   {period_start} to {period_end}',
        fill=BLACK,
        font=f_strip,
        anchor='mm',
    )

    # ═════════════════════════════════════════════════════════════════════════
    # 3. MAIN BODY
    # ═════════════════════════════════════════════════════════════════════════
    draw.rectangle([(SL, BODY_TOP), (SR, BODY_BOTTOM)], fill=WHITE, outline=BLACK, width=1)

    # Thin horizontal divider between header area rows
    # Employee name row
    EMP_Y  = BODY_TOP + s(18)
    DESIG_Y = EMP_Y + s(28)

    draw.text((SL + s(8),   EMP_Y),  'Employee Name:', fill=GRAY_TEXT, font=f_label)
    draw.text((SL + s(112), EMP_Y),  employee_name,    fill=BLACK,     font=f_value)

    draw.text((SL + s(8),   DESIG_Y), 'Designation:',  fill=GRAY_TEXT, font=f_label)
    draw.text((SL + s(112), DESIG_Y), designation,     fill=BLACK,     font=f_value)

    # Wage info on same row as Designation, right column
    MID_X = s(490)   # midpoint divider between left and right columns
    if wage_type == 'daily':
        wage_label = 'Daily Rate'
        wage_display_val = daily_rate_val
    else:
        wage_label = 'Monthly'
        wage_display_val = monthly_amount
    draw.text((MID_X + s(85), DESIG_Y), wage_label, fill=GRAY_TEXT, font=f_label)
    draw.text((SR - s(8),    DESIG_Y), format_currency(wage_display_val), fill=BLACK, font=f_value, anchor='ra')

    # Section headers: Earnings / Deductions
    SECTION_Y = DESIG_Y + s(28)
    EARNINGS_CENTER_X = (LEFT_LABEL_X + LEFT_VALUE_X) // 2
    DEDUCTIONS_CENTER_X = (RIGHT_LABEL_X + RIGHT_VALUE_X) // 2
    draw.text((EARNINGS_CENTER_X, SECTION_Y), 'Earnings:',   fill=BLACK, font=f_section, anchor='ma')
    draw.text((DEDUCTIONS_CENTER_X, SECTION_Y), 'Deductions:', fill=BLACK, font=f_section, anchor='ma')

    # ── Row layout ────────────────────────────────────────────────────────────
    ROW_START_Y = SECTION_Y + s(28)
    ROW_STEP    = s(26)

    basic_salary_label = 'Basic Salary'
    if wage_type == 'daily':
        basic_salary_label = f"Basic Pay (₱{format_currency(daily_rate_val)}/day x {days_present_val} days)"

    earnings_rows = [
        (basic_salary_label, basic_salary),
        ('Regular Overtime', regular_ot),
        ('Late/Undertime',  late_undertime),
        ('Rest Day',        rest_day),
        ('Rest Day OT',     rest_day_ot),
        ('Holiday',         holiday),
    ]
    for i, (label, amount) in enumerate(earnings_rows):
        y = ROW_START_Y + i * ROW_STEP
        draw.text((LEFT_LABEL_X,  y), label,                fill=DARK_TEXT, font=f_row)
        draw.text((LEFT_VALUE_X,  y), format_currency(amount), fill=BLACK,  font=f_row, anchor='ra')

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
        ('Payroll Tax',       payroll_tax,        False),
        ('Total Deductions',  total_deductions,   False),
    ])

    for i, (label, amount, bold) in enumerate(deductions_rows):
        y = ROW_START_Y + i * ROW_STEP
        fnt = f_row_bold if bold else f_row
        clr = BLACK if bold else DARK_TEXT
        draw.text((RIGHT_LABEL_X, y), label,                fill=clr,   font=fnt)
        draw.text((RIGHT_VALUE_X, y), format_currency(amount), fill=BLACK, font=fnt, anchor='ra')

    # ── GROSS Amount row (after earnings list, before net bar) ────────────────
    GROSS_Y = NET_TOP - s(64)
    draw.text((LEFT_LABEL_X,  GROSS_Y), 'GROSS Amount',         fill=BLACK, font=f_row_bold)
    draw.text((LEFT_VALUE_X,  GROSS_Y), format_currency(gross_salary), fill=BLACK, font=f_row_bold, anchor='ra')

    # Payroll Allowance & Company Loan (right column, below Total Deductions)
    ALLOW_Y = GROSS_Y
    LOAN_Y  = ALLOW_Y + s(26)
    draw.text((RIGHT_LABEL_X, ALLOW_Y), 'Payroll Allowance',        fill=DARK_TEXT, font=f_row)
    draw.text((RIGHT_VALUE_X, ALLOW_Y), format_currency(payroll_allowance), fill=BLACK, font=f_row, anchor='ra')
    draw.text((RIGHT_LABEL_X, LOAN_Y),  'Company Loan/Cash Advance', fill=DARK_TEXT, font=f_row)
    draw.text((RIGHT_VALUE_X, LOAN_Y),  format_currency(company_loan), fill=BLACK, font=f_row, anchor='ra')

    # ═════════════════════════════════════════════════════════════════════════
    # 4. NET PAY BAR
    # ═════════════════════════════════════════════════════════════════════════
    draw.rectangle([(SL, NET_TOP), (SR, NET_BOTTOM)], fill=BRAND_ORANGE, outline=BLACK, width=1)
    net_cy = (NET_TOP + NET_BOTTOM) // 2
    NET_LABEL_X = SL + s(160)
    NET_VALUE_X = SR - s(160)
    draw.text((NET_LABEL_X, net_cy), 'SALARY NET PAY', fill=BLACK, font=f_net_label, anchor='mm')
    draw.text((NET_VALUE_X, net_cy), format_currency(net_salary), fill=BLACK, font=f_net_value, anchor='mm')

    # ═════════════════════════════════════════════════════════════════════════
    # 5. SIGNATURE BLOCK (two columns aligned to the outer edges)
    # ═════════════════════════════════════════════════════════════════════════
    # White background for sig area
    draw.rectangle([(SL, SIG_TOP), (SR, SIG_BOTTOM)], fill=WHITE, outline=BLACK, width=1)

    # Opposite ends two-column layout
    COL_WIDTH        = s(240)
    LEFT_LINE_START  = SL + s(12)
    LEFT_LINE_END    = LEFT_LINE_START + COL_WIDTH
    LEFT_SIG_CX      = (LEFT_LINE_START + LEFT_LINE_END) // 2

    RIGHT_LINE_END   = SR - s(12)
    RIGHT_LINE_START = RIGHT_LINE_END - COL_WIDTH
    RIGHT_SIG_CX     = (RIGHT_LINE_START + RIGHT_LINE_END) // 2

    SIG_LABEL_Y = SIG_TOP + s(8)
    draw.text((LEFT_LINE_START,  SIG_LABEL_Y), 'Prepared By:',  fill=GRAY_TEXT, font=f_sign_lbl)
    draw.text((RIGHT_LINE_START, SIG_LABEL_Y), 'Approved by:', fill=GRAY_TEXT, font=f_sign_lbl)

    # Signature images
    SIG_IMG_Y = SIG_TOP + s(14)

    left_sig = _load_signature_image(prepared_by_signature_url, max_width=s(160), max_height=s(38))
    if left_sig:
        img.paste(left_sig, (LEFT_SIG_CX - left_sig.width // 2, SIG_IMG_Y), left_sig)

    right_sig = _load_signature_image(approved_by_signature_url, max_width=s(160), max_height=s(38))
    if right_sig:
        img.paste(right_sig, (RIGHT_SIG_CX - right_sig.width // 2, SIG_IMG_Y), right_sig)

    # Underline
    LINE_Y = SIG_TOP + s(56)
    draw.line([(LEFT_LINE_START,  LINE_Y), (LEFT_LINE_END,  LINE_Y)], fill=BLACK, width=1)
    draw.line([(RIGHT_LINE_START, LINE_Y), (RIGHT_LINE_END, LINE_Y)], fill=BLACK, width=1)

    # Names sit ON TOP of the line; roles sit below the line
    NAME_Y = LINE_Y - s(4)
    ROLE_Y = LINE_Y + s(8)
    draw.text((LEFT_SIG_CX,  NAME_Y), prepared_by, fill=BLACK,     font=f_sign_name, anchor='mm')
    draw.text((LEFT_SIG_CX,  ROLE_Y), 'Accounting Department', fill=GRAY_TEXT, font=f_sign_role, anchor='mm')

    draw.text((RIGHT_SIG_CX, NAME_Y), approved_by,   fill=BLACK,     font=f_sign_name, anchor='mm')
    draw.text((RIGHT_SIG_CX, ROLE_Y), 'CEO', fill=GRAY_TEXT, font=f_sign_role, anchor='mm')

    # ═════════════════════════════════════════════════════════════════════════
    # OUTPUT
    # ═════════════════════════════════════════════════════════════════════════
    buffer = io.BytesIO()
    img.save(buffer, format='PNG', quality=95)
    buffer.seek(0)
    return buffer
