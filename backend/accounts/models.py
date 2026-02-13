from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone


# Updated roles for the new flow
ROLE_CHOICES = [
    ('studio_head', 'Studio Head'),
    ('admin', 'Admin'),
    ('accounting', 'Accounting'),
    ('employee', 'Employee'),
    ('bim_specialist', 'BIM Specialist'),
    ('intern', 'Intern'),
    ('junior_architect', 'Junior Architect'),
    ('president', 'President'),
    ('site_engineer', 'Site Engineer'),
    ('site_coordinator', 'Site Coordinator'),
    ('ceo', 'CEO'),
]

PERMISSION_CHOICES = [
    ('view_attendance', 'View Attendance'),
    ('edit_attendance', 'Edit Attendance'),
    ('view_payroll', 'View Payroll'),
    ('edit_payroll', 'Edit Payroll'),
    ('view_employees', 'View Employees'),
    ('edit_employees', 'Edit Employees'),
    ('view_reports', 'View Reports'),
    ('manage_roles', 'Manage Roles'),
    ('manage_permissions', 'Manage Permissions'),
]


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, blank=True, null=True)
    permissions = models.JSONField(default=list, blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    employee_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    date_hired = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name}" if self.first_name else self.email
