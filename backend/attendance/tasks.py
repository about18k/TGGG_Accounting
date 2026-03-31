"""
Celery tasks for Attendance operations.
Handles async geocoding and background processing.
"""
from datetime import time

from celery import shared_task
from django.db import transaction
from django.utils import timezone

import logging

logger = logging.getLogger(__name__)

AUTO_PM_TIMEOUT_TIME = time(17, 30)
AUTO_PM_TIMEOUT_NOTE = 'System auto timeout: PM OUT recorded at 5:30 PM because no manual clock out was submitted.'


@shared_task(bind=True, max_retries=2)
def geocode_batch_locations(self, log_ids):
    """
    Async task to geocode multiple location coordinates.
    Removes API rate limiting from request path.
    """
    try:
        from attendance.models import TimeLog
        from attendance.geocoding_service import get_address_from_coordinates
        
        updated_count = 0
        
        for log_id in log_ids:
            try:
                log = TimeLog.objects.get(id=log_id)
                
                # Extract coordinates from device_info if available
                # You may need to adjust this based on your actual data structure
                if log.device_info and 'latitude' in log.device_info:
                    import json
                    device_data = json.loads(log.device_info)
                    latitude = device_data.get('latitude')
                    longitude = device_data.get('longitude')
                    
                    if latitude and longitude:
                        address = get_address_from_coordinates(latitude, longitude)
                        if address:
                            log.location = address
                            log.save()
                            updated_count += 1
                            
            except Exception as log_exc:
                logger.warning(f"Error geocoding location for log {log_id}: {str(log_exc)}")
                continue
        
        logger.info(f"Successfully geocoded {updated_count} locations")
        return {'status': 'success', 'updated': updated_count}
        
    except Exception as exc:
        logger.error(f"Error in geocode_batch_locations: {str(exc)}")
        raise self.retry(exc=exc, countdown=30)


@shared_task
def process_daily_attendance_summary(date_str):
    """
    Async task to process daily attendance summaries.
    Could trigger notifications or approvals.
    """
    try:
        from datetime import datetime
        from attendance.models import Attendance
        
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Get all attendance records for the day
        records = Attendance.objects.filter(date=date)
        
        # You can add business logic here
        # e.g., notify managers of absences, calculate late deductions, etc.
        
        logger.info(f"Processed daily attendance summary for {date_str}")
        return {'status': 'success', 'date': date_str, 'record_count': records.count()}
        
    except Exception as exc:
        logger.error(f"Error processing daily attendance summary: {str(exc)}")
        return {'status': 'error', 'error': str(exc)}


@shared_task
def check_leave_status_changes(leave_id):
    """
    Async task to handle leave status notifications.
    """
    try:
        from attendance.models import Leave
        
        leave = Leave.objects.get(id=leave_id)
        
        # Send notifications based on leave status
        # You can implement email/SMS sending here
        
        logger.info(f"Processed leave status change for leave {leave_id}")
        return {'status': 'success', 'leave_id': leave_id}
        
    except Exception as exc:
        logger.error(f"Error checking leave status changes: {str(exc)}")
        return {'status': 'error', 'error': str(exc)}


@shared_task
def auto_timeout_open_afternoon_sessions_task():
    """Auto-close open afternoon sessions at/after 5:30 PM."""
    from attendance.models import Attendance, TimeLog

    now = timezone.localtime()
    if now.time() < AUTO_PM_TIMEOUT_TIME:
        return {'status': 'skipped', 'reason': 'before_cutoff', 'processed': 0}

    processed = 0
    today = now.date()

    with transaction.atomic():
        open_sessions = list(
            Attendance.objects.select_for_update().filter(
                date=today,
                session_type='afternoon',
                time_in__isnull=False,
                time_out__isnull=True,
            )
        )

        for record in open_sessions:
            record.time_out = AUTO_PM_TIMEOUT_TIME
            if record.status in [None, '', 'absent']:
                record.status = 'present'

            note = AUTO_PM_TIMEOUT_NOTE
            record.notes = f"{record.notes}\n{note}" if record.notes else note
            record.save(update_fields=['time_out', 'status', 'notes', 'updated_at'])

            TimeLog.objects.create(
                employee=record.employee,
                attendance=record,
                log_type='time_out',
                location='system:auto-pm-timeout',
            )
            processed += 1

    logger.info("Auto PM timeout processed %s session(s) for %s", processed, today)
    return {'status': 'success', 'processed': processed, 'date': str(today)}
