import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from attendance.models import Attendance
from attendance.services.supabase_storage import SupabaseStorageManager

def backfill_attachments():
    print("Starting backfill of missing attachments...")
    
    # We only care about records that might have uploads.
    # To be safe, we check all records, or records where work_doc_note is not empty,
    # but actually, since listing bucket is API-heavy, let's just do it for all records
    # since this is a one-time script for a small/dev database.
    # To optimize slightly, we only check records where work_doc_uploaded_at is not null
    # OR work_doc_note is not empty OR time_out is not empty (users timeout = upload)
    
    # Actually, the most reliable is just querying Supabase for all folders if possible,
    # but since Supabase list is by folder, we just iterate through Attendance.
    
    all_records = Attendance.objects.all()
    records = [r for r in all_records if not r.work_doc_file_paths]
    total = len(records)
    print(f"Found {total} records with empty work_doc_file_paths. Checking Supabase...")
    
    updated_count = 0
    client = SupabaseStorageManager.get_client()
    bucket_name = "work_attachments"
    
    for i, record in enumerate(records, 1):
        folder_path = f"work-docs/{record.employee_id}/{record.date}/"
        try:
            response = client.storage.from_(bucket_name).list(folder_path)
            files = []
            for item in response:
                if not item.get('name') or item['name'].endswith('/'):
                    continue
                file_path = f"{folder_path}{item['name']}"
                files.append(file_path)
            
            if files:
                record.work_doc_file_paths = files
                record.save(update_fields=['work_doc_file_paths'])
                updated_count += 1
                print(f"[{i}/{total}] Backfilled {len(files)} files for Attendance ID {record.id}")
        except Exception as e:
            # If the folder doesn't exist, Supabase might just return empty list or throw 404
            pass

    print(f"Done! Updated {updated_count} records.")

if __name__ == '__main__':
    backfill_attachments()
