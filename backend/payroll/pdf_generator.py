"""
PDF Payslip Generator using ReportLab
"""
import io
from datetime import datetime
from decimal import Decimal
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from django.conf import settings


def format_currency(amount):
    """Format amount as Philippine Peso currency"""
    if amount is None:
        amount = Decimal('0')
    amount = Decimal(str(amount))
    return f"₱{amount:,.2f}"


def generate_payslip_pdf(payslip_data):
    """
    Generate a PDF payslip from payslip data.
    
    Args:
        payslip_data: Dictionary containing payslip information with keys:
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
    buffer = io.BytesIO()
    
    # Create PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch
    )
    
    # Container for PDF elements
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=20,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=8,
        fontName='Helvetica-Bold'
    )
    
    # Company Header
    elements.append(Paragraph("TGGG ACCOUNTING", title_style))
    elements.append(Paragraph("PAYSLIP", subtitle_style))
    elements.append(Spacer(1, 0.2 * inch))
    
    # Employee Information Section
    elements.append(Paragraph("EMPLOYEE INFORMATION", heading_style))
    
    employee_info = [
        ['Employee Name:', payslip_data.get('employee_name', 'N/A')],
        ['Email:', payslip_data.get('employee_email', 'N/A')],
        ['Position:', payslip_data.get('employee_role', 'N/A')],
        ['Pay Period:', f"{payslip_data.get('period_start', 'N/A')} to {payslip_data.get('period_end', 'N/A')}"],
    ]
    
    employee_table = Table(employee_info, colWidths=[2 * inch, 4.5 * inch])
    employee_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#475569')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1e293b')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(employee_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Attendance Summary
    elements.append(Paragraph("ATTENDANCE SUMMARY", heading_style))
    
    attendance_info = [
        ['Working Days:', str(payslip_data.get('working_days', 0))],
        ['Days Present:', str(payslip_data.get('days_present', 0))],
        ['Days Absent:', str(payslip_data.get('days_absent', 0))],
        ['Days on Leave:', str(payslip_data.get('days_on_leave', 0))],
    ]
    
    attendance_table = Table(attendance_info, colWidths=[2 * inch, 4.5 * inch])
    attendance_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#475569')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1e293b')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(attendance_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Earnings Section
    elements.append(Paragraph("EARNINGS", heading_style))
    
    payslip_details = payslip_data.get('payslip_details', {})
    
    earnings_data = [
        ['Description', 'Amount'],
        ['Basic Salary', format_currency(payslip_data.get('base_salary', 0))],
        ['Regular Overtime', format_currency(payslip_details.get('regular_overtime', payslip_data.get('overtime_amount', 0)))],
        ['Rest Day OT', format_currency(payslip_details.get('rest_day_ot', 0))],
        ['Allowances', format_currency(payslip_details.get('payroll_allowance', payslip_data.get('allowances_total', 0)))],
        ['Bonus', format_currency(payslip_data.get('bonus', 0))],
    ]
    
    earnings_table = Table(earnings_data, colWidths=[4.5 * inch, 2 * inch])
    earnings_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica'),
        ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(earnings_table)
    elements.append(Spacer(1, 0.15 * inch))
    
    # Gross Salary
    gross_data = [['GROSS SALARY', format_currency(payslip_data.get('gross_salary', 0))]]
    gross_table = Table(gross_data, colWidths=[4.5 * inch, 2 * inch])
    gross_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#dbeafe')),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#1e40af')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    
    elements.append(gross_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Deductions Section
    elements.append(Paragraph("DEDUCTIONS", heading_style))
    
    government_contributions = payslip_details.get('government_contributions', [])
    
    deductions_data = [['Description', 'Amount']]
    
    # Add government contributions
    for contrib in government_contributions:
        deductions_data.append([
            contrib.get('name', 'Contribution'),
            format_currency(contrib.get('amount', 0))
        ])
    
    # Add other deductions
    late_undertime = payslip_details.get('late_undertime', 0)
    if late_undertime and Decimal(str(late_undertime)) > 0:
        deductions_data.append(['Late/Undertime', format_currency(late_undertime)])
    
    payroll_tax = payslip_details.get('payroll_tax', payslip_data.get('tax', 0))
    if payroll_tax and Decimal(str(payroll_tax)) > 0:
        deductions_data.append(['Payroll Tax', format_currency(payroll_tax)])
    
    company_loan = payslip_details.get('company_loan_cash_advance', 0)
    if company_loan and Decimal(str(company_loan)) > 0:
        deductions_data.append(['Company Loan/Cash Advance', format_currency(company_loan)])
    
    deductions_table = Table(deductions_data, colWidths=[4.5 * inch, 2 * inch])
    deductions_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica'),
        ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(deductions_table)
    elements.append(Spacer(1, 0.15 * inch))
    
    # Total Deductions
    total_deductions_data = [['TOTAL DEDUCTIONS', format_currency(payslip_data.get('deductions_total', 0))]]
    total_deductions_table = Table(total_deductions_data, colWidths=[4.5 * inch, 2 * inch])
    total_deductions_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fee2e2')),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#dc2626')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    
    elements.append(total_deductions_table)
    elements.append(Spacer(1, 0.4 * inch))
    
    # Net Salary (Final)
    net_salary_data = [['NET SALARY', format_currency(payslip_data.get('net_salary', 0))]]
    net_salary_table = Table(net_salary_data, colWidths=[4.5 * inch, 2 * inch])
    net_salary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#16a34a')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 14),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#15803d')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
    ]))
    
    elements.append(net_salary_table)
    elements.append(Spacer(1, 0.4 * inch))
    
    # Signatures
    signature_data = [
        ['Prepared By:', 'Approved By:'],
        ['', ''],
        ['', ''],
        [payslip_details.get('prepared_by', 'Accounting Department'), payslip_details.get('approved_by_top_management', '')],
    ]
    
    signature_table = Table(signature_data, colWidths=[3.25 * inch, 3.25 * inch])
    signature_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEABOVE', (0, 3), (-1, 3), 1, colors.black),
        ('TOPPADDING', (0, 3), (-1, 3), 5),
    ]))
    
    elements.append(signature_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94a3b8'),
        alignment=TA_CENTER
    )
    
    footer_text = f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>This is a computer-generated payslip and does not require a signature."
    elements.append(Paragraph(footer_text, footer_style))
    
    # Build PDF
    doc.build(elements)
    
    # Get PDF bytes
    buffer.seek(0)
    return buffer
