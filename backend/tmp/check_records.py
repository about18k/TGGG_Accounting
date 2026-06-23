from attendance.models import Attendance
import django
django.setup()

records = Attendance.objects.order_by('-date')[:50]
print(f"Found {records.count()} records:")
for r in records:
    print(f"ID: {r.id} | Date: {r.date} | Session: {r.session_type} | Time In: {r.time_in} | Time Out: {r.time_out} | User: {r.employee.email}")
