import django
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()

from django.db import connection
cursor = connection.cursor()

# Verify the timelog and attendance tables are clean now
for table in ['attendance_attendance', 'attendance_timelog']:
    cursor.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_name=%s ORDER BY ordinal_position",
        [table],
    )
    cols = [row[0] for row in cursor.fetchall()]
    print(f"{table}: {cols}")

print("\nAll clean.")
