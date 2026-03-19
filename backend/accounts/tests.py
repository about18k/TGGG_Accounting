from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from todos.models import TodoNotification
from .models import CustomUser, Department, ROLE_CHOICES
from .serializers import CustomUserSerializer, PendingUserSerializer
from django.utils import timezone


class DepartmentModelTests(TestCase):
    """Test cases for Department model"""

    def setUp(self):
        """Set up test data"""
        self.department = Department.objects.create(
            name='Engineering',
            description='Engineering Department'
        )

    def test_department_creation(self):
        """Test creating a department"""
        self.assertEqual(self.department.name, 'Engineering')
        self.assertEqual(self.department.description, 'Engineering Department')
        self.assertIsNotNone(self.department.created_at)

    def test_department_str_representation(self):
        """Test department string representation"""
        self.assertEqual(str(self.department), 'Engineering')

    def test_department_unique_name(self):
        """Test that department names must be unique"""
        with self.assertRaises(Exception):
            Department.objects.create(name='Engineering')

    def test_department_ordering(self):
        """Test departments are ordered by name"""
        dept2 = Department.objects.create(name='Accounting')
        dept3 = Department.objects.create(name='Design')
        
        departments = list(Department.objects.all())
        self.assertEqual(departments[0].name, 'Accounting')
        self.assertEqual(departments[1].name, 'Design')


class CustomUserModelTests(TestCase):
    """Test cases for CustomUser model"""

    def setUp(self):
        """Set up test data"""
        self.department = Department.objects.create(name='Engineering')
        self.user = CustomUser.objects.create_user(
            email='test@example.com',
            password='testpass123',
            username='testuser',
            first_name='John',
            last_name='Doe',
            department=self.department,
            role='junior_architect'
        )

    def test_user_creation(self):
        """Test creating a user"""
        self.assertEqual(self.user.email, 'test@example.com')
        self.assertEqual(self.user.first_name, 'John')
        self.assertEqual(self.user.last_name, 'Doe')
        self.assertTrue(self.user.check_password('testpass123'))

    def test_user_email_unique(self):
        """Test that emails must be unique"""
        with self.assertRaises(Exception):
            CustomUser.objects.create_user(
                email='test@example.com',
                password='anotherpass',
                username='anotheruser'
            )

    def test_user_email_required(self):
        """Test that email is required"""
        with self.assertRaises(ValueError):
            CustomUser.objects.create_user(
                email='',
                password='testpass123',
                username='testuser'
            )

    def test_user_str_representation(self):
        """Test user string representation"""
        self.assertEqual(str(self.user), 'John Doe')

    def test_user_str_with_no_name(self):
        """Test user string representation without name"""
        user = CustomUser.objects.create_user(
            email='noname@example.com',
            password='testpass'
        )
        self.assertEqual(str(user), 'noname@example.com')

    def test_create_superuser(self):
        """Test creating a superuser"""
        admin = CustomUser.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123'
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_user_default_values(self):
        """Test user default values"""
        user = CustomUser.objects.create_user(
            email='newuser@example.com',
            password='testpass'
        )
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_leader)
        self.assertIsNone(user.role)
        self.assertEqual(user.permissions, [])

    def test_user_with_permissions(self):
        """Test user with permissions"""
        user = CustomUser.objects.create_user(
            email='permuser@example.com',
            password='testpass',
            permissions=['view_attendance', 'edit_payroll']
        )
        self.assertEqual(user.permissions, ['view_attendance', 'edit_payroll'])

    def test_user_ordering(self):
        """Test users are ordered by created_at descending"""
        user2 = CustomUser.objects.create_user(
            email='user2@example.com',
            password='testpass'
        )
        users = list(CustomUser.objects.all())
        # Most recent first
        self.assertEqual(users[0].email, 'user2@example.com')

    def test_user_department_relationship(self):
        """Test user-department relationship"""
        self.assertEqual(self.user.department, self.department)
        self.assertIn(self.user, self.department.customuser_set.all())


class CustomUserSerializerTests(TestCase):
    """Test cases for CustomUserSerializer"""

    def setUp(self):
        """Set up test data"""
        self.department = Department.objects.create(name='Engineering')
        self.user = CustomUser.objects.create_user(
            email='test@example.com',
            password='testpass',
            first_name='John',
            last_name='Doe',
            department=self.department,
            role='junior_architect',
            phone_number='555-1234'
        )
        self.serializer = CustomUserSerializer(self.user)

    def test_serializer_contains_expected_fields(self):
        """Test serializer contains all expected fields"""
        data = self.serializer.data
        expected_fields = {
            'id', 'email', 'username', 'first_name', 'last_name',
            'department', 'department_name', 'role', 'role_name',
            'permissions', 'phone_number', 'is_active', 'is_leader',
            'date_hired', 'profile_picture', 'created_at', 'updated_at'
        }
        self.assertEqual(set(data.keys()), expected_fields)

    def test_serializer_field_values(self):
        """Test serializer field values"""
        data = self.serializer.data
        self.assertEqual(data['email'], 'test@example.com')
        self.assertEqual(data['first_name'], 'John')
        self.assertEqual(data['last_name'], 'Doe')
        self.assertEqual(data['department_name'], 'Engineering')
        self.assertEqual(data['role'], 'junior_architect')
        self.assertEqual(data['role_name'], 'Junior Architect')

    def test_serializer_read_only_fields(self):
        """Test that created_at and updated_at are read-only"""
        data = {
            'email': 'new@example.com',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'created_at': '2020-01-01T00:00:00Z',
            'updated_at': '2020-01-01T00:00:00Z'
        }
        serializer = CustomUserSerializer(self.user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            self.user.refresh_from_db()
            # created_at and updated_at should not be modified
            self.assertNotEqual(
                self.user.created_at.isoformat().split('T')[0],
                '2020-01-01'
            )


class PendingUserSerializerTests(TestCase):
    """Test cases for PendingUserSerializer"""

    def setUp(self):
        """Set up test data"""
        self.user = CustomUser.objects.create_user(
            email='pending@example.com',
            password='testpass',
            first_name='Jane',
            last_name='Smith'
        )
        self.serializer = PendingUserSerializer(self.user)

    def test_serializer_contains_expected_fields(self):
        """Test serializer contains all expected fields"""
        data = self.serializer.data
        expected_fields = {'id', 'email', 'first_name', 'last_name', 'created_at'}
        self.assertEqual(set(data.keys()), expected_fields)

    def test_serializer_field_values(self):
        """Test serializer field values"""
        data = self.serializer.data
        self.assertEqual(data['email'], 'pending@example.com')
        self.assertEqual(data['first_name'], 'Jane')
        self.assertEqual(data['last_name'], 'Smith')


class LoginViewTests(APITestCase):
    """Test cases for login endpoint"""

    def setUp(self):
        """Set up test data"""
        self.department = Department.objects.create(name='Engineering')
        self.user = CustomUser.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='John',
            role='junior_architect',
            department=self.department,
            is_active=True
        )

    def test_login_success(self):
        """Test successful login"""
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'test@example.com')

    def test_login_invalid_password(self):
        """Test login with invalid password"""
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)

    def test_login_nonexistent_user(self):
        """Test login with nonexistent email"""
        response = self.client.post('/api/auth/login/', {
            'email': 'nonexistent@example.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_credentials(self):
        """Test login without credentials"""
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_inactive_user(self):
        """Test login with inactive user"""
        self.user.is_active = False
        self.user.save()
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_login_invalid_role(self):
        """Test login with invalid role"""
        user = CustomUser.objects.create_user(
            email='invalidrole@example.com',
            password='testpass123',
            role='unknown_role',
            is_active=True
        )
        response = self.client.post('/api/auth/login/', {
            'email': 'invalidrole@example.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_login_response_contains_user_info(self):
        """Test login response contains all necessary user info"""
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        user_data = response.data['user']
        self.assertEqual(user_data['email'], 'test@example.com')
        self.assertEqual(user_data['first_name'], 'John')
        self.assertEqual(user_data['role'], 'junior_architect')
        self.assertEqual(user_data['department_name'], 'Engineering')


class RegisterViewTests(APITestCase):
    """Test cases for register endpoint"""

    def test_register_success(self):
        """Test successful registration"""
        response = self.client.post('/api/auth/register/', {
            'email': 'newuser@example.com',
            'password': 'testpass123',
            'first_name': 'Jane',
            'last_name': 'Doe'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertTrue(response.data['success'])

    def test_register_missing_email(self):
        """Test registration without email"""
        response = self.client.post('/api/auth/register/', {
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_password(self):
        """Test registration without password"""
        response = self.client.post('/api/auth/register/', {
            'email': 'newuser@example.com'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email(self):
        """Test registration with existing email"""
        CustomUser.objects.create_user(
            email='existing@example.com',
            password='testpass123'
        )
        response = self.client.post('/api/auth/register/', {
            'email': 'existing@example.com',
            'password': 'newpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_user_inactive_by_default(self):
        """Test that registered users are inactive by default"""
        response = self.client.post('/api/auth/register/', {
            'email': 'newuser@example.com',
            'password': 'testpass123',
            'first_name': 'John'
        })
        user = CustomUser.objects.get(email='newuser@example.com')
        self.assertFalse(user.is_active)

    def test_register_response_structure(self):
        """Test register response has correct structure"""
        response = self.client.post('/api/auth/register/', {
            'email': 'newuser@example.com',
            'password': 'testpass123',
            'first_name': 'Bob',
            'last_name': 'Smith'
        })
        self.assertIn('success', response.data)
        self.assertIn('message', response.data)
        self.assertIn('user', response.data)


class ApprovalNotificationTests(APITestCase):
    """Test account approval notification scenarios."""

    def setUp(self):
        self.department = Department.objects.create(name='Accounting Department')
        self.studio_head = CustomUser.objects.create_user(
            username='studioheadnotif',
            email='studiohead-notif@example.com',
            password='testpass123',
            role='studio_head',
            is_active=True,
        )
        self.accounting_user = CustomUser.objects.create_user(
            username='accountingnotif',
            email='accounting-notif@example.com',
            password='testpass123',
            role='accounting',
            department=self.department,
            is_active=True,
        )
        self.pending_user = CustomUser.objects.create_user(
            username='pendingapprovalnotif',
            email='pending-approval@example.com',
            password='testpass123',
            first_name='Pending',
            last_name='Employee',
            is_active=False,
        )

    def test_studio_head_approval_notifies_accounting(self):
        self.client.force_authenticate(user=self.studio_head)

        response = self.client.post('/api/accounts/approve/', {
            'user_id': self.pending_user.id,
            'role': 'intern',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        notification = (
            TodoNotification.objects
            .filter(recipient=self.accounting_user, type='user_verified')
            .order_by('-created_at')
            .first()
        )
        self.assertIsNotNone(notification)
        self.assertIn('verified', notification.message.lower())
