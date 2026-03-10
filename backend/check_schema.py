import django, os
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()

from django.db import connection
cursor = connection.cursor()
cursor.execute("""
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'attendance_attendance' 
    ORDER BY ordinal_position
""")
for row in cursor.fetchall():
    print(row)
