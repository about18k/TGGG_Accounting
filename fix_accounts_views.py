import re

with open('backend/accounts/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("'profile-picture': user.profile_picture", "'profile_picture': user.profile_picture")
content = content.replace("'profile-picture': public_url", "'profile_picture': public_url")
content = content.replace("'profile-picture',", "'profile_picture',")
content = content.replace("'profile-picture': user.profile_picture or None", "'profile_picture': user.profile_picture or None")

with open('backend/accounts/views.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
