import re

with open('backend/todos/services.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("'profile-picture'", "'profile_picture'")

with open('backend/todos/services.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
