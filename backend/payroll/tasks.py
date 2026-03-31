"""
Celery tasks for Payroll operations.
Handles async PDF generation and email sending.
"""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def generate_and_send_payslips(self, employee_ids, payroll_period_id):
    """
    Async task to generate payslips for multiple employees.
    Removes blocking PDF generation from request path.
    """
    try:
        from payroll.models import PaySlip, PayrollPeriod
        from payroll.pdf_generator import generate_payslip_pdf
        from payroll.email_utils import send_payslip_email
        
        payroll_period = PayrollPeriod.objects.get(id=payroll_period_id)
        
        for employee_id in employee_ids:
            try:
                payslip = PaySlip.objects.get(employee_id=employee_id, payroll_period=payroll_period)
                
                # Generate PDF
                pdf_path = generate_payslip_pdf(payslip)
                
                # Send email
                send_payslip_email(payslip.employee, payslip)
                
                logger.info(f"Generated and sent payslip for employee {employee_id} (Period: {payroll_period_id})")
                
            except Exception as emp_exc:
                logger.error(f"Error processing payslip for employee {employee_id}: {str(emp_exc)}")
                continue
        
        return {'status': 'success', 'payroll_period': payroll_period_id, 'count': len(employee_ids)}
        
    except Exception as exc:
        logger.error(f"Error in generate_and_send_payslips: {str(exc)}")
        raise self.retry(exc=exc, countdown=60)


@shared_task
def process_payroll_changes(payroll_period_id, changes_data):
    """
    Async task to process bulk payroll changes.
    """
    try:
        from payroll.models import PaySlip
        
        logger.info(f"Processing {len(changes_data)} payroll changes for period {payroll_period_id}")
        
        for change in changes_data:
            employee_id = change.get('employee_id')
            update_data = change.get('data', {})
            
            PaySlip.objects.filter(
                employee_id=employee_id,
                payroll_period_id=payroll_period_id
            ).update(**update_data)
        
        logger.info(f"Successfully processed payroll changes for period {payroll_period_id}")
        return {'status': 'success', 'changes_count': len(changes_data)}
        
    except Exception as exc:
        logger.error(f"Error processing payroll changes: {str(exc)}")
        return {'status': 'error', 'error': str(exc)}
