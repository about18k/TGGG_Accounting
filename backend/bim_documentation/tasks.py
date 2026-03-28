"""
Celery tasks for BIM Documentation and Material Requests.
Handles async file uploads and background processing.
"""
from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def upload_file_async(self, file_path, file_content_path, doc_id, user_id):
    """
    Async task to upload files to Supabase.
    Retries up to 3 times on failure.
    """
    try:
        from bim_documentation.models import BimDocumentation
        from bim_documentation.supabase_storage import SupabaseStorageManager
        
        # Upload file to Supabase
        SupabaseStorageManager.upload_file(file_content_path, file_path)
        
        # Update document record
        doc = BimDocumentation.objects.get(id=doc_id)
        if file_path not in doc.file_paths:
            doc.file_paths.append(file_path)
            doc.save()
        
        logger.info(f"Successfully uploaded file {file_path} for doc {doc_id}")
        return {'status': 'success', 'file_path': file_path}
        
    except Exception as exc:
        logger.error(f"Error uploading file {file_path}: {str(exc)}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


@shared_task(bind=True, max_retries=3)
def upload_material_request_file_async(self, file_path, file_content_path, request_id, user_id):
    """
    Async task to upload material request files to Supabase.
    Retries up to 3 times on failure.
    """
    try:
        from material_requests.models import MaterialRequest
        from bim_documentation.supabase_storage import SupabaseStorageManager
        
        # Upload file to Supabase
        SupabaseStorageManager.upload_file(file_content_path, file_path)
        
        # Update request record
        req = MaterialRequest.objects.get(id=request_id)
        if file_path not in req.request_image:
            req.request_image = file_path
            req.save()
        
        logger.info(f"Successfully uploaded material request file {file_path} for request {request_id}")
        return {'status': 'success', 'file_path': file_path}
        
    except Exception as exc:
        logger.error(f"Error uploading material request file {file_path}: {str(exc)}")
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


@shared_task
def generate_payslip_async(payslip_id):
    """
    Async task to generate PDF payslips.
    Reduces blocking on payroll submission.
    """
    try:
        from payroll.models import PaySlip
        from payroll.pdf_generator import generate_payslip_pdf
        
        payslip = PaySlip.objects.get(id=payslip_id)
        pdf_path = generate_payslip_pdf(payslip)
        
        logger.info(f"Successfully generated payslip PDF for {payslip_id}")
        return {'status': 'success', 'pdf_path': pdf_path}
        
    except Exception as exc:
        logger.error(f"Error generating payslip {payslip_id}: {str(exc)}")
        # Don't retry payslip generation automatically
        return {'status': 'error', 'error': str(exc)}


@shared_task
def send_payslip_email_async(payslip_id):
    """
    Async task to send payslip emails.
    Removes email sending from request path.
    """
    try:
        from payroll.models import PaySlip
        from payroll.email_utils import send_payslip_email
        
        payslip = PaySlip.objects.get(id=payslip_id)
        send_payslip_email(payslip.employee, payslip)
        
        logger.info(f"Successfully sent payslip email for {payslip_id}")
        return {'status': 'success'}
        
    except Exception as exc:
        logger.error(f"Error sending payslip email {payslip_id}: {str(exc)}")
        return {'status': 'error', 'error': str(exc)}


@shared_task
def geocode_attendance_location_async(log_id, latitude, longitude):
    """
    Async task for geocoding attendance locations.
    Removes API rate limiting from request path.
    """
    try:
        from attendance.models import TimeLog
        from attendance.geocoding_service import get_address_from_coordinates
        
        log = TimeLog.objects.get(id=log_id)
        address = get_address_from_coordinates(latitude, longitude)
        
        if address:
            log.location = address
            log.save()
        
        logger.info(f"Successfully geocoded location for log {log_id}")
        return {'status': 'success', 'location': address}
        
    except Exception as exc:
        logger.error(f"Error geocoding location for log {log_id}: {str(exc)}")
        return {'status': 'error', 'error': str(exc)}
