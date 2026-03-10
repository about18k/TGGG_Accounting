"""
Email Utility for Payslip Delivery
Sends payslip images via email using Django's EmailMessage
"""
import os
from datetime import datetime
from django.core.mail import EmailMessage
from django.conf import settings


def send_payslip_email(employee, payslip_data, image_buffer, image_filename):
    """
    Send payslip image via email.
    
    Args:
        employee: CustomUser object with email field
        payslip_data: Dictionary containing payslip information
        image_buffer: BytesIO object containing the PNG image
        image_filename: Name for the image attachment
    
    Returns:
        dict: {
            'sent': bool,
            'recipient': str,
            'message': str
        }
    """
    try:
        # Check if email sending is configured
        if not hasattr(settings, 'EMAIL_HOST') or not settings.EMAIL_HOST:
            return {
                'sent': False,
                'recipient': None,
                'message': 'Email not configured in settings'
            }
        
        # Check if employee has email
        if not employee.email:
            return {
                'sent': False,
                'recipient': None,
                'message': f'Employee {employee.get_full_name()} has no email address'
            }
        
        recipient_email = employee.email
        employee_name = employee.get_full_name()
        
        # Email subject
        period = f"{payslip_data.get('period_start', '')} to {payslip_data.get('period_end', '')}"
        subject = f"Your Payslip - {employee_name}"
        
        # Email body (HTML)
        net_salary = payslip_data.get('net_salary', 0)
        gross_salary = payslip_data.get('gross_salary', 0)
        deductions = payslip_data.get('deductions_total', 0)
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                    color: white;
                    padding: 30px 20px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background: #f9fafb;
                    padding: 30px 20px;
                    border-radius: 0 0 10px 10px;
                }}
                .info-box {{
                    background: white;
                    padding: 20px;
                    margin: 20px 0;
                    border-left: 4px solid #1e40af;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .salary-amount {{
                    font-size: 32px;
                    font-weight: bold;
                    color: #16a34a;
                    margin: 15px 0;
                }}
                .detail-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #e5e7eb;
                }}
                .label {{
                    color: #64748b;
                    font-weight: 600;
                }}
                .value {{
                    color: #1e293b;
                    font-weight: 500;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    color: #64748b;
                    font-size: 12px;
                }}
                .attachment-note {{
                    background: #dbeafe;
                    border: 2px dashed #1e40af;
                    padding: 15px;
                    margin: 20px 0;
                    text-align: center;
                    border-radius: 8px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">TGGG ACCOUNTING</h1>
                    <p style="margin: 10px 0 0 0;">Payslip Notification</p>
                </div>
                <div class="content">
                    <h2>Hello {employee_name},</h2>
                    <p>Your payslip for the period <strong>{period}</strong> is ready.</p>
                    
                    <div class="info-box">
                        <h3 style="margin-top: 0; color: #1e40af;">💰 Payment Summary</h3>
                        <div class="salary-amount">₱{net_salary:,.2f}</div>
                        <p style="margin: 0; color: #64748b;">Net Salary</p>
                        
                        <div style="margin-top: 20px;">
                            <div class="detail-row">
                                <span class="label">Gross Salary:</span>
                                <span class="value">₱{gross_salary:,.2f}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Total Deductions:</span>
                                <span class="value" style="color: #dc2626;">₱{deductions:,.2f}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="attachment-note">
                        <p style="margin: 0;"><strong>📎 Your payslip image is attached to this email</strong></p>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Please download and save it for your records</p>
                    </div>
                    
                    <p>If you have any questions about your payslip, please contact the Accounting Department.</p>
                    
                    <p><strong>Important:</strong> This payslip is confidential and for your personal use only. Do not share your salary information with unauthorized persons.</p>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply.</p>
                    <p>© {datetime.now().year} TGGG Accounting. All rights reserved.</p>
                    <p>Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version (fallback)
        text_body = f"""
Hello {employee_name},

Your payslip for the period {period} is ready.

PAYMENT SUMMARY
Net Salary: ₱{net_salary:,.2f}

Gross Salary: ₱{gross_salary:,.2f}
Total Deductions: ₱{deductions:,.2f}

Your payslip image is attached to this email. Please download and save it for your records.

If you have any questions about your payslip, please contact the Accounting Department.

IMPORTANT: This payslip is confidential and for your personal use only.

---
This is an automated email. Please do not reply.
© {datetime.now().year} TGGG Accounting. All rights reserved.
Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
        """
        
        # Create email message
        email = EmailMessage(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else settings.EMAIL_HOST_USER,
            to=[recipient_email],
        )
        
        # Set HTML alternative
        email.content_subtype = "html"
        email.body = html_body
        
        # Attach payslip image
        image_buffer.seek(0)  # Reset buffer position
        email.attach(image_filename, image_buffer.read(), 'image/png')
        
        # Send email
        email.send(fail_silently=False)
        
        return {
            'sent': True,
            'recipient': recipient_email,
            'message': f'Payslip sent successfully to {recipient_email}'
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Email sending error: {error_msg}")
        return {
            'sent': False,
            'recipient': recipient_email if 'recipient_email' in locals() else None,
            'message': f'Failed to send email: {error_msg}'
        }


def save_payslip_image_and_send_email(employee, payslip_data, image_buffer, employee_id, period_str):
    """
    Save payslip image to media folder and send via email.
    
    Args:
        employee: CustomUser object
        payslip_data: Dictionary containing payslip information
        image_buffer: BytesIO object containing the PNG image
        employee_id: ID for organizing files
        period_str: Period string for filename (e.g., '2024-01')
    
    Returns:
        dict: {
            'image_saved': bool,
            'image_path': str or None,
            'image_url': str or None,
            'email': dict from send_payslip_email
        }
    """
    result = {
        'image_saved': False,
        'image_path': None,
        'image_url': None,
        'email': None
    }
    
    try:
        # Create directory for payslips
        media_root = settings.MEDIA_ROOT
        payslips_dir = os.path.join(media_root, 'payslips', str(employee_id))
        os.makedirs(payslips_dir, exist_ok=True)
        
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        image_filename = f"payslip_{period_str}_{timestamp}.png"
        image_path = os.path.join(payslips_dir, image_filename)
        
        # Save image file
        image_buffer.seek(0)
        with open(image_path, 'wb') as f:
            f.write(image_buffer.read())
        
        result['image_saved'] = True
        result['image_path'] = image_path
        
        # Generate URL
        if hasattr(settings, 'MEDIA_URL'):
            relative_path = f"payslips/{employee_id}/{image_filename}"
            result['image_url'] = f"{settings.MEDIA_URL}{relative_path}"
        
        print(f"✅ Payslip image saved: {image_path}")
        
        # Send email with the image
        image_buffer.seek(0)  # Reset buffer for email attachment
        email_result = send_payslip_email(employee, payslip_data, image_buffer, image_filename)
        result['email'] = email_result
        
        if email_result['sent']:
            print(f"✅ Email sent successfully to {email_result['recipient']}")
        else:
            print(f"⚠️ Email failed: {email_result['message']}")
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error in save_payslip_image_and_send_email: {error_msg}")
        result['email'] = {
            'sent': False,
            'recipient': None,
            'message': f'Error: {error_msg}'
        }
    
    return result
