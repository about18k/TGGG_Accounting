import re

with open('backend/material_requests/serializers.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("'accounting-receipt'", "'accounting_receipt'")

with open('backend/material_requests/serializers.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
