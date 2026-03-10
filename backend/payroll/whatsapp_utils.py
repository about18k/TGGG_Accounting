"""
WhatsApp integration utilities for Twilio notifications.
"""
import re
import phonenumbers
from django.conf import settings


def normalize_phone_to_e164(phone_string):
    """
    Normalize a phone number string to E.164 format (+<country_code><number>).
    
    Args:
        phone_string: Raw phone number input (e.g., '09123456789', '+639123456789', '9123456789')
    
    Returns:
        Normalized phone number in E.164 format or None if invalid.
    
    Raises:
        ValueError: If the phone number format is invalid.
    """
    if not phone_string:
        return None
    
    # Clean up the input
    phone_clean = str(phone_string).strip()
    
    # Common Philippine number patterns (default country)
    # If number starts with 0, assume Philippines and convert
    if phone_clean.startswith('0'):
        phone_clean = '+63' + phone_clean[1:]
    # If number doesn't have +, assume Philippines
    elif not phone_clean.startswith('+'):
        phone_clean = '+63' + phone_clean
    
    try:
        # Parse with default country of Philippines if needed
        parsed = phonenumbers.parse(phone_clean, 'PH')
        
        # Validate the number
        if not phonenumbers.is_valid_number(parsed):
            raise ValueError(f'Invalid phone number: {phone_string}')
        
        # Return in E.164 format
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException as e:
        raise ValueError(f'Invalid phone number format: {str(e)}')


def is_valid_whatsapp_number(phone_string):
    """
    Check if a phone number is valid for WhatsApp.
    
    Args:
        phone_string: Raw phone number input
    
    Returns:
        True if valid, False otherwise.
    """
    try:
        normalize_phone_to_e164(phone_string)
        return True
    except ValueError:
        return False


def send_whatsapp_notification(phone_number, message_body):
    """
    Send WhatsApp message via Twilio.
    
    Args:
        phone_number: Phone number in E.164 format (e.g., '+639123456789')
        message_body: Message text to send
    
    Returns:
        {
            'success': bool,
            'message': str,
            'error': str (if failed)
        }
    """
    if not settings.TWILIO_ENABLED:
        return {
            'success': False,
            'message': 'WhatsApp notification queued (Twilio not configured)',
            'error': 'Twilio credentials not configured in environment'
        }
    
    try:
        from twilio.rest import Client
        
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        # Ensure phone number is in E.164 format
        if not phone_number.startswith('+'):
            phone_number = '+' + phone_number
        
        message = client.messages.create(
            from_=f'whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}',
            to=f'whatsapp:{phone_number}',
            body=message_body,
        )
        
        return {
            'success': True,
            'message': f'WhatsApp notification sent to {phone_number}',
            'message_sid': message.sid,
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Failed to send WhatsApp notification: {str(e)}',
            'error': str(e)
        }


def send_whatsapp_with_media(phone_number, message_body, media_url):
    """
    Send WhatsApp message with media attachment via Twilio.
    
    Args:
        phone_number: Phone number in E.164 format (e.g., '+639123456789')
        message_body: Message text to send
        media_url: Publicly accessible URL of the media file (PDF, image, etc.)
    
    Returns:
        {
            'success': bool,
            'message': str,
            'error': str (if failed),
            'message_sid': str (if successful)
        }
    """
    if not settings.TWILIO_ENABLED:
        return {
            'success': False,
            'message': 'WhatsApp notification queued (Twilio not configured)',
            'error': 'Twilio credentials not configured in environment'
        }
    
    try:
        from twilio.rest import Client
        
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        # Ensure phone number is in E.164 format
        if not phone_number.startswith('+'):
            phone_number = '+' + phone_number
        
        message = client.messages.create(
            from_=f'whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}',
            to=f'whatsapp:{phone_number}',
            body=message_body,
            media_url=[media_url]
        )
        
        return {
            'success': True,
            'message': f'WhatsApp message with media sent to {phone_number}',
            'message_sid': message.sid,
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Failed to send WhatsApp message with media: {str(e)}',
            'error': str(e)
        }


def save_payslip_pdf_and_send_whatsapp(employee, payslip_data, pdf_buffer):
    """
    Save payslip PDF to media storage and send via WhatsApp.
    
    Args:
        employee: CustomUser instance
        payslip_data: Dictionary containing payslip information
        pdf_buffer: BytesIO buffer containing the PDF
    
    Returns:
        {
            'success': bool,
            'message': str,
            'pdf_path': str (if successful),
            'whatsapp_result': dict
        }
    """
    import os
    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage
    
    try:
        # Generate filename
        period_start = payslip_data.get('period_start', '')
        period_end = payslip_data.get('period_end', '')
        filename = f"payslips/{employee.id}/payslip_{period_start}_to_{period_end}.pdf"
        
        # Reset buffer position to beginning
        pdf_buffer.seek(0)
        
        # Save PDF to media storage
        pdf_content = ContentFile(pdf_buffer.read())
        file_path = default_storage.save(filename, pdf_content)
        
        # Generate full URL for the PDF
        pdf_url = default_storage.url(file_path)
        
        # Make sure URL is absolute
        if pdf_url.startswith('/'):
            # If it's a relative URL, convert to absolute
            from django.contrib.sites.models import Site
            try:
                current_site = Site.objects.get_current()
                pdf_url = f"http://{current_site.domain}{pdf_url}"
            except:
                # Fallback to settings if Site framework not configured
                base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                pdf_url = f"{base_url}{pdf_url}"
        
        # Send WhatsApp message
        if employee.phone_number:
            try:
                normalized_phone = normalize_phone_to_e164(employee.phone_number)
                
                # Format net salary for display
                net_salary_display = payslip_data.get('net_salary', 'N/A')
                if net_salary_display != 'N/A':
                    try:
                        from decimal import Decimal
                        net_salary_display = f"₱{Decimal(str(net_salary_display)):,.2f}"
                    except:
                        pass
                
                message_body = f"""Hello {employee.first_name}!

Your payslip for the period {period_start} to {period_end} is ready.

Net Salary: {net_salary_display}

Please find your payslip attached. If you have any questions, please contact the Accounting Department.

Thank you!"""
                
                whatsapp_result = send_whatsapp_with_media(
                    normalized_phone,
                    message_body,
                    pdf_url
                )
            except ValueError as e:
                whatsapp_result = {
                    'success': False,
                    'message': f'Invalid phone number: {str(e)}',
                    'error': str(e)
                }
            except Exception as e:
                whatsapp_result = {
                    'success': False,
                    'message': f'WhatsApp error: {str(e)}',
                    'error': str(e)
                }
        else:
            whatsapp_result = {
                'success': False,
                'message': 'Employee does not have a phone number configured',
                'error': 'No phone number'
            }
        
        return {
            'success': True,
            'message': 'PDF generated and saved successfully',
            'pdf_path': file_path,
            'pdf_url': pdf_url,
            'whatsapp_result': whatsapp_result
        }
    
    except Exception as e:
        return {
            'success': False,
            'message': f'Failed to save PDF and send WhatsApp: {str(e)}',
            'error': str(e),
            'whatsapp_result': None
        }

