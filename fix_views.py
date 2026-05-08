import re

with open('backend/material_requests/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('accounting-receipt_file', 'accounting_receipt_file')
content = content.replace('upload_accounting-receipt', 'upload_accounting_receipt')
content = content.replace('accounting-receipt_to', 'accounting_receipt_to')
content = content.replace('material_request.accounting-receipt', 'material_request.accounting_receipt')
content = content.replace("update_fields.append('accounting-receipt')", "update_fields.append('accounting_receipt')")
content = re.sub(r'def upload_accounting-receipt_to_supabase', r'def upload_accounting_receipt_to_supabase', content)
content = content.replace('material_request.accounting-receipt', 'material_request.accounting_receipt')

with open('backend/material_requests/views.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
