import django, os, traceback
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from attendance.views import clock_in
from attendance.models import Attendance
from django.utils import timezone

User = get_user_model()
u = User.objects.get(id=36)

# Clear today's attendance if exists
today = timezone.localdate()
Attendance.objects.filter(employee=u, date=today).delete()

factory = APIRequestFactory()
req = factory.post(
    '/api/attendance/clock-in/',
    data={'mode': 'office', 'latitude': 9.8797, 'longitude': 123.599},
    format='json'
)
force_authenticate(req, user=u)

try:
    resp = clock_in(req)
    print('Status:', resp.status_code)
    print('Data:', resp.data)
except Exception as e:
    print('EXCEPTION:')
    traceback.print_exc()
