from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from todos.models import TodoNotification
from .models import EmployeeContribution, PaySlip


class PayrollNotificationTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		user_model = get_user_model()

		self.accounting_user = user_model.objects.create_user(
			username='payrollmanager01',
			email='payroll-manager@example.com',
			password='test-password',
			role='accounting',
			first_name='Payroll',
			last_name='Manager',
			is_active=True,
		)
		self.employee = user_model.objects.create_user(
			username='payrollemployee01',
			email='payroll-employee@example.com',
			password='test-password',
			role='intern',
			first_name='Payroll',
			last_name='Employee',
			is_active=True,
		)

	def _authenticate(self, user):
		self.client.force_authenticate(user=user)

	def test_contribution_create_notifies_employee(self):
		self._authenticate(self.accounting_user)

		response = self.client.post(
			f'/api/payroll/employees/{self.employee.id}/contributions/',
			{'name': 'SSS', 'amount': '350.00'},
			format='json',
		)

		self.assertEqual(response.status_code, 201)

		notification = (
			TodoNotification.objects
			.filter(recipient=self.employee, type='contribution_added')
			.order_by('-created_at')
			.first()
		)
		self.assertIsNotNone(notification)
		self.assertIn('contribution', notification.message.lower())

	def test_contribution_update_notifies_employee(self):
		EmployeeContribution.objects.create(
			employee=self.employee,
			name='PhilHealth',
			amount='200.00',
		)

		self._authenticate(self.accounting_user)
		response = self.client.post(
			f'/api/payroll/employees/{self.employee.id}/contributions/',
			{'name': 'PhilHealth', 'amount': '225.00'},
			format='json',
		)

		self.assertEqual(response.status_code, 200)

		notification = (
			TodoNotification.objects
			.filter(recipient=self.employee, type='contribution_updated')
			.order_by('-created_at')
			.first()
		)
		self.assertIsNotNone(notification)
		self.assertIn('updated', notification.message.lower())

	@patch('payroll.image_generator.generate_payslip_image', return_value=b'test-image')
	@patch('payroll.email_utils.save_payslip_image_and_send_email')
	def test_process_payroll_email_sent_notifies_employee(self, mock_save_and_send_email, _mock_generate_image):
		mock_save_and_send_email.return_value = {
			'image_saved': True,
			'image_endpoint': '/api/payroll/recent/1/payslip-image/',
			'storage': 'database',
			'email': {
				'sent': True,
				'message': 'Email sent successfully',
				'recipient': self.employee.email,
			},
		}

		self._authenticate(self.accounting_user)

		response = self.client.post(
			'/api/payroll/process/',
			{
				'employee_id': self.employee.id,
				'period_start': '2026-01-01',
				'period_end': '2026-01-31',
				'payslip_form': {
					'monthly': '50000.00',
					'basic_salary': '50000.00',
					'regular_overtime': '0.00',
					'late_undertime': '0.00',
					'rest_day_ot': '0.00',
					'gross_amount': '50000.00',
					'net_taxable_salary': '50000.00',
					'payroll_tax': '0.00',
					'total_deductions': '350.00',
					'payroll_allowance': '0.00',
					'company_loan_cash_advance': '0.00',
					'salary_net_pay': '49650.00',
					'prepared_by': 'Payroll Manager',
					'government_contributions': [
						{'name': 'SSS', 'amount': '350.00'}
					],
				},
			},
			format='json',
		)

		self.assertEqual(response.status_code, 201)
		self.assertTrue(PaySlip.objects.filter(employee=self.employee).exists())

		notification = (
			TodoNotification.objects
			.filter(recipient=self.employee, type='payroll_processed')
			.order_by('-created_at')
			.first()
		)
		self.assertIsNotNone(notification)
		self.assertIn('processed', notification.message.lower())
