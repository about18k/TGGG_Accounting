from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from todos.models import TodoNotification
from .models import OvertimeRequest


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

	def test_only_studio_head_can_confirm_supervisor(self):
		request_data = self._create_request_as_employee()

		self._authenticate(self.accounting)
		response = self.client.put(
			f"/api/overtime/{request_data['id']}/approve",
			{'supervisor_signature': 'approve'},
			format='json',
		)

		self.assertEqual(response.status_code, 403)

	def test_dual_confirmation_sets_fully_approved(self):
		request_data = self._create_request_as_employee()

		self._authenticate(self.studio_head)
		studio_head_response = self.client.put(
			f"/api/overtime/{request_data['id']}/approve",
			{'supervisor_signature': 'approve'},
			format='json',
		)
		self.assertEqual(studio_head_response.status_code, 200)
		self.assertTrue(studio_head_response.data['supervisor_confirmed'])
		self.assertFalse(studio_head_response.data['management_confirmed'])

		self._authenticate(self.accounting)
		accounting_response = self.client.put(
			f"/api/overtime/{request_data['id']}/approve",
			{'management_signature': 'approve'},
			format='json',
		)
		self.assertEqual(accounting_response.status_code, 200)
		self.assertTrue(accounting_response.data['supervisor_confirmed'])
		self.assertTrue(accounting_response.data['management_confirmed'])
		self.assertTrue(accounting_response.data['is_fully_approved'])
		self.assertIsNotNone(accounting_response.data['approval_date'])

	def test_overtime_submission_notifies_studio_head_and_accounting(self):
		self._create_request_as_employee()

		notifications = TodoNotification.objects.filter(type='ot_submitted')
		recipient_ids = set(notifications.values_list('recipient_id', flat=True))

		self.assertIn(self.studio_head.id, recipient_ids)
		self.assertIn(self.accounting.id, recipient_ids)
		self.assertNotIn(self.employee.id, recipient_ids)

	def test_dual_confirmation_notifies_employee_about_overtime_clock_access(self):
		request_data = self._create_request_as_employee()

		self._authenticate(self.studio_head)
		studio_head_response = self.client.put(
			f"/api/overtime/{request_data['id']}/approve",
			{'supervisor_signature': 'approve'},
			format='json',
		)
		self.assertEqual(studio_head_response.status_code, 200)

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

		self._authenticate(self.studio_head)
		self.client.put(
			f"/api/overtime/{request_data['id']}/approve",
			{'supervisor_signature': 'approve'},
			format='json',
		)

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
