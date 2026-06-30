import hashlib
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.test.utils import override_settings
from django.core.cache import cache
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
		self.ceo_employee = user_model.objects.create_user(
			username='ceopayroll01',
			email='ceo-payroll@example.com',
			password='test-password',
			role='ceo',
			first_name='Chief',
			last_name='Executive',
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

	@patch('payroll.image_generator.generate_payslip_image', return_value=b'test-image')
	@patch('payroll.email_utils.save_payslip_image_and_send_email')
	def test_process_payroll_email_sent_notifies_ceo_with_executive_type(self, mock_save_and_send_email, _mock_generate_image):
		mock_save_and_send_email.return_value = {
			'image_saved': True,
			'image_endpoint': '/api/payroll/recent/2/payslip-image/',
			'storage': 'database',
			'email': {
				'sent': True,
				'message': 'Email sent successfully',
				'recipient': self.ceo_employee.email,
			},
		}

		self._authenticate(self.accounting_user)

		response = self.client.post(
			'/api/payroll/process/',
			{
				'employee_id': self.ceo_employee.id,
				'period_start': '2026-01-01',
				'period_end': '2026-01-31',
				'payslip_form': {
					'monthly': '80000.00',
					'basic_salary': '80000.00',
					'regular_overtime': '0.00',
					'late_undertime': '0.00',
					'rest_day_ot': '0.00',
					'gross_amount': '80000.00',
					'net_taxable_salary': '80000.00',
					'payroll_tax': '0.00',
					'total_deductions': '500.00',
					'payroll_allowance': '0.00',
					'company_loan_cash_advance': '0.00',
					'salary_net_pay': '79500.00',
					'prepared_by': 'Payroll Manager',
					'government_contributions': [
						{'name': 'SSS', 'amount': '500.00'}
					],
				},
			},
			format='json',
		)

		self.assertEqual(response.status_code, 201)

		notification = (
			TodoNotification.objects
			.filter(recipient=self.ceo_employee, type='ceo_payroll_processed')
			.order_by('-created_at')
			.first()
		)
		self.assertIsNotNone(notification)
		self.assertIn('emailed', notification.message.lower())


class PayrollCacheBehaviorTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		user_model = get_user_model()

		self.accounting_user = user_model.objects.create_user(
			username='cachemanager01',
			email='cache-manager@example.com',
			password='test-password',
			role='accounting',
			first_name='Cache',
			last_name='Manager',
			is_active=True,
		)
		self.employee = user_model.objects.create_user(
			username='cacheemployee01',
			email='cache-employee@example.com',
			password='test-password',
			role='intern',
			first_name='Cache',
			last_name='Employee',
			is_active=True,
		)

	def _authenticate(self, user):
		self.client.force_authenticate(user=user)

	@override_settings(ENABLE_API_RESPONSE_CACHE=True)
	def test_recent_payroll_records_populates_cache(self):
		cache.clear()
		self._authenticate(self.accounting_user)

		PaySlip.objects.create(
			employee=self.employee,
			period_start='2026-01-01',
			period_end='2026-01-31',
			base_salary='50000.00',
			allowances_total='0.00',
			overtime_amount='0.00',
			bonus='0.00',
			gross_salary='50000.00',
			tax='0.00',
			deductions_total='0.00',
			net_salary='50000.00',
			working_days=22,
			days_present=22,
			days_absent=0,
			days_on_leave=0,
		)

		response = self.client.get('/api/payroll/recent/')
		self.assertEqual(response.status_code, 200)
		self.assertIn('private', response.get('Cache-Control', ''))

		cache_hash = hashlib.md5('/api/payroll/recent/'.encode('utf-8')).hexdigest()
		cache_key = f'payroll:recent:v1:user:{self.accounting_user.id}:{cache_hash}'
		self.assertIsNotNone(cache.get(cache_key))

	@override_settings(ENABLE_API_RESPONSE_CACHE=True)
	def test_payroll_employees_returns_200(self):
		cache.clear()
		self._authenticate(self.accounting_user)

		response = self.client.get('/api/payroll/employees/')
		self.assertEqual(response.status_code, 200)
		self.assertIsInstance(response.data, list)

	@override_settings(ENABLE_API_RESPONSE_CACHE=True)
	def test_allowance_eligibility_post_bumps_cache_version(self):
		cache.clear()
		cache.set('payroll:cache-version', 1, timeout=None)
		self._authenticate(self.accounting_user)

		response = self.client.post(
			'/api/payroll/allowance-eligibility/',
			{'employee_ids': [str(self.employee.id)]},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(cache.get('payroll:cache-version'), 2)

	@override_settings(ENABLE_API_RESPONSE_CACHE=False)
	def test_recent_payroll_records_does_not_populate_cache_when_disabled(self):
		cache.clear()
		self._authenticate(self.accounting_user)

		PaySlip.objects.create(
			employee=self.employee,
			period_start='2026-02-01',
			period_end='2026-02-28',
			base_salary='50000.00',
			allowances_total='0.00',
			overtime_amount='0.00',
			bonus='0.00',
			gross_salary='50000.00',
			tax='0.00',
			deductions_total='0.00',
			net_salary='50000.00',
			working_days=20,
			days_present=20,
			days_absent=0,
			days_on_leave=0,
		)

		response = self.client.get('/api/payroll/recent/')
		self.assertEqual(response.status_code, 200)

		cache_hash = hashlib.md5('/api/payroll/recent/'.encode('utf-8')).hexdigest()
		cache_key = f'payroll:recent:v0:user:{self.accounting_user.id}:{cache_hash}'
		self.assertIsNone(cache.get(cache_key))


class HybridPayrollTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		user_model = get_user_model()
		self.accounting_user = user_model.objects.create_user(
			username='accounting02',
			email='accounting-test@example.com',
			password='test-password',
			role='accounting',
			is_active=True,
		)
		self.daily_employee = user_model.objects.create_user(
			username='dailyemployee02',
			email='daily-employee@example.com',
			password='test-password',
			role='site_engineer',
			is_active=True,
		)
		from .models import SalaryStructure
		self.salary_structure = SalaryStructure.objects.create(
			employee=self.daily_employee,
			base_salary='800.00',
			frequency='monthly',
			wage_type='daily'
		)

	def _authenticate(self, user):
		self.client.force_authenticate(user=user)

	@patch('payroll.image_generator.generate_payslip_image', return_value=b'test-image')
	@patch('payroll.email_utils.save_payslip_image_and_send_email')
	def test_process_payroll_for_daily_worker(self, mock_save_and_send_email, _mock_generate_image):
		mock_save_and_send_email.return_value = {
			'image_saved': True,
			'image_endpoint': '/api/payroll/recent/100/payslip-image/',
			'storage': 'database',
			'email': {
				'sent': True,
				'message': 'Email sent successfully',
				'recipient': self.daily_employee.email,
			},
		}

		self._authenticate(self.accounting_user)

		# 12 days present x 800.00 daily rate = 9600.00 basic salary
		response = self.client.post(
			'/api/payroll/process/',
			{
				'employee_id': self.daily_employee.id,
				'period_start': '2026-06-01',
				'period_end': '2026-06-30',
				'payslip_form': {
					'monthly': '17600.00',
					'basic_salary': '9600.00',
					'regular_overtime': '0.00',
					'late_undertime': '0.00',
					'rest_day_ot': '0.00',
					'gross_amount': '9600.00',
					'net_taxable_salary': '9600.00',
					'payroll_tax': '0.00',
					'total_deductions': '0.00',
					'payroll_allowance': '0.00',
					'company_loan_cash_advance': '0.00',
					'salary_net_pay': '9600.00',
					'prepared_by': 'Accounting Department',
					'government_contributions': [],
					'wage_type': 'daily',
					'days_present': '12',
					'daily_rate': '800.00',
				},
			},
			format='json',
		)

		self.assertEqual(response.status_code, 201)
		payslip = PaySlip.objects.get(employee=self.daily_employee)
		self.assertEqual(float(payslip.base_salary), 9600.00)
		self.assertEqual(payslip.days_present, 12)
		
		# check notes have correct wage_type and daily rate
		import json
		details = json.loads(payslip.notes)
		self.assertEqual(details['wage_type'], 'daily')
		self.assertEqual(details['days_present'], 12)
		self.assertEqual(details['daily_rate'], '800.00')


class PayrollAttendanceSummaryTests(TestCase):
	def setUp(self):
		user_model = get_user_model()
		self.employee = user_model.objects.create_user(
			username='testemp01',
			email='testemp01@example.com',
			password='password123',
			role='employee',
			first_name='Test',
			last_name='Employee'
		)

	def test_attendance_summary_grace_period_worked_hours(self):
		from datetime import date, time
		from attendance.models import Attendance
		from payroll.views import _attendance_summary

		# Create morning attendance record with check-in at 8:04 AM and checkout at 12:00 PM
		Attendance.objects.create(
			employee=self.employee,
			date=date(2026, 6, 25),
			session_type='morning',
			time_in=time(8, 4),
			time_out=time(12, 0),
			is_late=False,
			status='present'
		)

		summary = _attendance_summary(self.employee, date(2026, 6, 25), date(2026, 6, 25))
		
		# Expected hours for 1 day present = 8 hours
		# Since 8:04 AM is in the 5-min grace period, it counts as starting at 8:00 AM.
		# Total hours worked in session = 4.00 hours.
		# But expected_hours is 8.00. So undertime is 4.00 hours (since they only clocked in for one session).
		self.assertEqual(summary['days_present'], 1)
		self.assertEqual(summary['total_hours'], 4.0)
		self.assertEqual(summary['undertime_hours'], 4.0)

		# Now add afternoon attendance record for the same day with check-in at 12:55 PM and checkout at 5:00 PM
		# (Treated as 1:00 PM because check-in is early/within grace, and capped at 5:00 PM)
		Attendance.objects.create(
			employee=self.employee,
			date=date(2026, 6, 25),
			session_type='afternoon',
			time_in=time(12, 55),
			time_out=time(17, 0),
			is_late=False,
			status='present'
		)

		summary_both = _attendance_summary(self.employee, date(2026, 6, 25), date(2026, 6, 25))

		# Expected hours = 1 present day * 8 = 8.00 hours.
		# Morning: 4.0 hours, Afternoon: 4.0 hours.
		# Total worked hours = 8.0 hours.
		# Undertime should be 0.0 hours!
		self.assertEqual(summary_both['days_present'], 1)  # Unique dates present!
		self.assertEqual(summary_both['total_hours'], 8.0)
		self.assertEqual(summary_both['undertime_hours'], 0.0)

