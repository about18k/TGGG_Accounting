import os
import glob

def replace_in_file(filepath, replacements):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Could not read {filepath}: {e}")
        return

    original_content = content
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

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

for root, _, files in os.walk('backend'):
    for file in files:
        if file.endswith('.py'):
            replace_in_file(os.path.join(root, file), specific_replacements)

replace_in_file('docker-compose.yml', specific_replacements)
print("Done.")
