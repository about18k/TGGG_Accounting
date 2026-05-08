import os

def replace_in_file(filepath, replacements):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        for old, new in replacements.items():
            content = content.replace(old, new)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error on {filepath}: {e}")

specific_replacements = {
    "'accounting_receipt'": "'accounting-receipt'",
    "'matrequest_img'": "'matrequest-img'",
    "'profile_picture'": "'profile-picture'",
    "'user_signature'": "'user-signature'",
    "'work_attachments'": "'work-attachments'",
    '"accounting_receipt"': '"accounting-receipt"',
    '"matrequest_img"': '"matrequest-img"',
    '"profile_picture"': '"profile-picture"',
    '"user_signature"': '"user-signature"',
    '"work_attachments"': '"work-attachments"',
    'accounting_receipt/': 'accounting-receipt/',
    'matrequest_img/': 'matrequest-img/',
    'profile_picture/': 'profile-picture/',
    'user_signature/': 'user-signature/',
    'work_attachments/': 'work-attachments/'
}

files = [
    'backend/accounts/views.py',
    'backend/attendance/services/supabase_storage.py',
    'backend/material_requests/views.py',
    'backend/backfill_attachments.py',
    'MINIO_MIGRATION_PLAN.md'
]

for f in files:
    replace_in_file(f, specific_replacements)
