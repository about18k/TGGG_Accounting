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
