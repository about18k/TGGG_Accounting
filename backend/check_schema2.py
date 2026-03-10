import django, os
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()

from django.conf import settings
from django.db import connection

print("DB ENGINE:", settings.DATABASES['default']['ENGINE'])
print("---")

with connection.cursor() as cursor:
    if 'postgresql' in settings.DATABASES['default']['ENGINE'] or 'psycopg2' in settings.DATABASES['default'].get('ENGINE', ''):
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'attendance_attendance' 
            ORDER BY ordinal_position
        """)
    else:
        cursor.execute("PRAGMA table_info(attendance_attendance)")
    
    for row in cursor.fetchall():
        print(row)
