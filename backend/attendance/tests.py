from datetime import datetime, time, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from todos.models import TodoNotification
from .models import Attendance, CalendarEvent, OvertimeRequest, TimeLog


class OvertimeApprovalWorkflowTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		user_model = get_user_model()

		self.employee = user_model.objects.create_user(
			username='employee01',
			email='employee01@example.com',
			password='test-password',
			role='intern',
			first_name='Employee',
			last_name='One',
		)
		self.studio_head = user_model.objects.create_user(
			username='studiohead01',
			email='studiohead01@example.com',
			password='test-password',
			role='studio_head',
			first_name='Studio',
			last_name='Head',
		)
		self.accounting = user_model.objects.create_user(
			username='accounting01',
			email='accounting01@example.com',
			password='test-password',
			role='accounting',
			first_name='Accounting',
			last_name='User',
		)

	def _authenticate(self, user):
		self.client.force_authenticate(user=user)

	def _create_request_as_employee(self):
		self._authenticate(self.employee)
		response = self.client.post(
			'/api/overtime',
			{
				'employee_name': 'Employee One',
				'job_position': 'Intern',
				'date_completed': str(timezone.localdate()),
				'department': 'Operations',
				'anticipated_hours': '2.5',
				'explanation': 'Overtime support',
				'employee_signature': 'https://example.com/signature.png',
				'periods': [
					{
						'start_date': str(timezone.localdate()),
						'end_date': str(timezone.localdate()),
						'start_time': '19:00',
						'end_time': '21:00',
					}
				],
			},
			format='json',
		)
		self.assertEqual(response.status_code, 201)
		return response.data

	def test_create_request_ignores_self_approval_fields(self):
		self._authenticate(self.employee)
		response = self.client.post(
			'/api/overtime',
			{
				'employee_name': 'Employee One',
				'job_position': 'Intern',
				'date_completed': str(timezone.localdate()),
				'department': 'Operations',
				'anticipated_hours': '2.0',
				'explanation': 'Need overtime',
				'employee_signature': 'https://example.com/signature.png',
				'supervisor_signature': 'fake-supervisor',
				'management_signature': 'fake-management',
				'approval_date': str(timezone.localdate()),
				'periods': [],
			},
			format='json',
		)

		self.assertEqual(response.status_code, 201)
		self.assertFalse(response.data['supervisor_signature'])
		self.assertFalse(response.data['management_signature'])
		self.assertIsNone(response.data['approval_date'])

	def test_only_accounting_can_confirm_management(self):
		request_data = self._create_request_as_employee()

		self._authenticate(self.studio_head)
		response = self.client.put(
			f"/api/overtime/{request_data['id']}/approve",
			{'management_signature': 'approve'},
			format='json',
		)

		self.assertEqual(response.status_code, 403)

	def test_accounting_confirmation_sets_fully_approved(self):
		request_data = self._create_request_as_employee()

		self._authenticate(self.accounting)
		accounting_response = self.client.put(
			f"/api/overtime/{request_data['id']}/approve",
			{'management_signature': 'approve'},
			format='json',
		)
		self.assertEqual(accounting_response.status_code, 200)
		self.assertFalse(accounting_response.data['supervisor_confirmed'])
		self.assertTrue(accounting_response.data['management_confirmed'])
		self.assertTrue(accounting_response.data['is_fully_approved'])
		self.assertIsNotNone(accounting_response.data['approval_date'])

	def test_overtime_submission_notifies_accounting_only(self):
		self._create_request_as_employee()

		notifications = TodoNotification.objects.filter(type='ot_submitted')
		recipient_ids = set(notifications.values_list('recipient_id', flat=True))

		self.assertIn(self.accounting.id, recipient_ids)
		self.assertNotIn(self.studio_head.id, recipient_ids)
		self.assertNotIn(self.employee.id, recipient_ids)

	def test_accounting_confirmation_notifies_employee_about_overtime_clock_access(self):
		request_data = self._create_request_as_employee()

		self._authenticate(self.accounting)
		accounting_response = self.client.put(
			f"/api/overtime/{request_data['id']}/approve",
			{'management_signature': 'approve'},
			format='json',
		)
		self.assertEqual(accounting_response.status_code, 200)

		notification = (
			TodoNotification.objects
			.filter(recipient=self.employee, type='ot_fully_approved')
			.order_by('-created_at')
			.first()
		)

		self.assertIsNotNone(notification)
		self.assertIn('time in and time out', notification.message.lower())

	@patch('attendance.views.determine_session', return_value='overtime')
	@patch('attendance.views.is_late_for_session', return_value=False)
	def test_overtime_clock_in_requires_fully_approved_request(self, _mock_is_late, _mock_session):
		request_data = self._create_request_as_employee()

		self._authenticate(self.employee)
		blocked_response = self.client.post('/api/attendance/clock-in/', {}, format='json')
		self.assertEqual(blocked_response.status_code, 400)
		self.assertIn('requires an approved overtime request', blocked_response.data['error'])

		self._authenticate(self.accounting)
		self.client.put(
			f"/api/overtime/{request_data['id']}/approve",
			{'management_signature': 'approve'},
			format='json',
		)

		self._authenticate(self.employee)
		allowed_response = self.client.post('/api/attendance/clock-in/', {}, format='json')
		self.assertEqual(allowed_response.status_code, 201)
		self.assertTrue(allowed_response.data['success'])

		overtime_request = OvertimeRequest.objects.get(id=request_data['id'])
		self.assertIsNotNone(overtime_request.approval_date)


class CalendarEventAttendanceRulesTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		user_model = get_user_model()

		self.employee = user_model.objects.create_user(
			username='calendar-employee-01',
			email='calendar-employee-01@example.com',
			password='test-password',
			role='employee',
			first_name='Calendar',
			last_name='Employee',
		)
		self.employee_two = user_model.objects.create_user(
			username='calendar-employee-02',
			email='calendar-employee-02@example.com',
			password='test-password',
			role='intern',
			first_name='Calendar',
			last_name='Intern',
		)
		self.accounting = user_model.objects.create_user(
			username='calendar-accounting',
			email='calendar-accounting@example.com',
			password='test-password',
			role='accounting',
			first_name='Calendar',
			last_name='Accounting',
		)

	def _authenticate(self, user):
		self.client.force_authenticate(user=user)

	def test_marked_event_notifies_employees(self):
		self._authenticate(self.accounting)
		target_day = timezone.localdate() + timedelta(days=1)

		response = self.client.post(
			'/api/attendance/events/',
			{
				'title': 'Company Assembly',
				'date': str(target_day),
				'event_type': 'event',
				'is_holiday': True,
				'description': 'Calendar notice test',
			},
			format='json',
		)

		self.assertEqual(response.status_code, 201)
		self.assertTrue(response.data['is_holiday'])
		self.assertTrue(response.data['blocks_attendance'])

		notifications = TodoNotification.objects.filter(type='calendar_non_work_day')
		recipient_ids = set(notifications.values_list('recipient_id', flat=True))

		self.assertIn(self.employee.id, recipient_ids)
		self.assertIn(self.employee_two.id, recipient_ids)
		self.assertNotIn(self.accounting.id, recipient_ids)

	@patch('attendance.views.determine_session', return_value='morning')
	@patch('attendance.views.is_late_for_session', return_value=False)
	def test_holiday_blocks_clock_in_and_clock_out(self, _mock_is_late, _mock_session):
		today = timezone.localdate()
		CalendarEvent.objects.create(
			title='Foundation Day',
			date=today,
			event_type='holiday',
			is_holiday=True,
			created_by=self.accounting,
		)

		self._authenticate(self.employee)

		clock_in_response = self.client.post('/api/attendance/clock-in/', {}, format='json')
		self.assertEqual(clock_in_response.status_code, 400)
		self.assertIn('cannot make your attendance', clock_in_response.data['error'].lower())

		Attendance.objects.create(
			employee=self.employee,
			date=today,
			session_type='morning',
			time_in=timezone.localtime().time(),
			status='present',
		)

		clock_out_response = self.client.post('/api/attendance/clock-out/', {}, format='json')
		self.assertEqual(clock_out_response.status_code, 400)
		self.assertIn('cannot make your attendance', clock_out_response.data['error'].lower())

	@patch('attendance.views.determine_session', return_value='morning')
	@patch('attendance.views.is_late_for_session', return_value=False)
	def test_legacy_non_working_event_type_blocks_clock_in(self, _mock_is_late, _mock_session):
		today = timezone.localdate()
		CalendarEvent.objects.create(
			title='Legacy Non Working Marker',
			date=today,
			event_type='non_working_day',
			is_holiday=False,
			created_by=self.accounting,
		)

		self._authenticate(self.employee_two)
		response = self.client.post('/api/attendance/clock-in/', {}, format='json')

		self.assertEqual(response.status_code, 400)
		self.assertIn('cannot make your attendance', response.data['error'].lower())


class SaturdayAttendanceAutoOvertimeTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		user_model = get_user_model()

		self.employee = user_model.objects.create_user(
			username='saturday-employee-01',
			email='saturday-employee-01@example.com',
			password='test-password',
			role='employee',
			first_name='Saturday',
			last_name='Employee',
		)

	def _authenticate(self):
		self.client.force_authenticate(user=self.employee)

	@patch('attendance.views.timezone.localtime')
	@patch('attendance.views.determine_session', return_value='morning')
	@patch('attendance.views.is_late_for_session', return_value=False)
	def test_saturday_clock_in_auto_sets_session_to_overtime(self, _mock_is_late, _mock_session, mock_localtime):
		# March 29, 2025 is a Saturday.
		mock_localtime.return_value = timezone.make_aware(datetime(2025, 3, 29, 9, 0, 0))
		self._authenticate()

		response = self.client.post('/api/attendance/clock-in/', {}, format='json')

		self.assertEqual(response.status_code, 201)
		self.assertEqual(response.data['attendance']['session_type'], 'overtime')

		record = Attendance.objects.get(id=response.data['attendance']['id'])
		self.assertEqual(record.session_type, 'overtime')

	@patch('attendance.views.timezone.localtime')
	@patch('attendance.views.determine_session', return_value='morning')
	@patch('attendance.views.is_late_for_session', return_value=False)
	def test_saturday_clock_in_does_not_require_overtime_request(self, _mock_is_late, _mock_session, mock_localtime):
		# March 29, 2025 is a Saturday.
		mock_localtime.return_value = timezone.make_aware(datetime(2025, 3, 29, 10, 0, 0))
		self._authenticate()

		response = self.client.post('/api/attendance/clock-in/', {}, format='json')

		self.assertEqual(response.status_code, 201)
		self.assertTrue(response.data['success'])


class AutoPmTimeoutTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		user_model = get_user_model()

		self.employee = user_model.objects.create_user(
			username='auto-timeout-employee',
			email='auto-timeout-employee@example.com',
			password='test-password',
			role='employee',
			first_name='Auto',
			last_name='Timeout',
		)

	def _authenticate(self):
		self.client.force_authenticate(user=self.employee)

	@patch('attendance.views.timezone.localtime')
	def test_after_530_pm_open_pm_session_is_auto_timed_out(self, mock_localtime):
		mock_localtime.return_value = timezone.make_aware(datetime(2025, 3, 27, 17, 45, 0))
		today = mock_localtime.return_value.date()

		record = Attendance.objects.create(
			employee=self.employee,
			date=today,
			session_type='afternoon',
			time_in=time(13, 0),
			status='present',
		)

		self._authenticate()
		response = self.client.get('/api/attendance/my/')

		self.assertEqual(response.status_code, 200)

		record.refresh_from_db()
		self.assertEqual(record.time_out, time(17, 30))
		self.assertIn('System auto timeout', record.notes or '')

		time_out_log = TimeLog.objects.filter(attendance=record, log_type='time_out').first()
		self.assertIsNotNone(time_out_log)

	@patch('attendance.views.timezone.localtime')
	def test_before_530_pm_open_pm_session_is_not_auto_timed_out(self, mock_localtime):
		mock_localtime.return_value = timezone.make_aware(datetime(2025, 3, 27, 17, 0, 0))
		today = mock_localtime.return_value.date()

		record = Attendance.objects.create(
			employee=self.employee,
			date=today,
			session_type='afternoon',
			time_in=time(13, 0),
			status='present',
		)

		self._authenticate()
		response = self.client.get('/api/attendance/my/today/')

		self.assertEqual(response.status_code, 200)

		record.refresh_from_db()
		self.assertIsNone(record.time_out)
		self.assertEqual(response.data['record']['id'], record.id)
