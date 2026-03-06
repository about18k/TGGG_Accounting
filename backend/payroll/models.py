from django.db import models
from django.utils import timezone
from accounts.models import CustomUser

class SalaryStructure(models.Model):
    FREQUENCY_CHOICES = [
        ('weekly', 'Weekly'),
        ('biweekly', 'Bi-Weekly'),
        ('monthly', 'Monthly'),
    ]
    
    employee = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='salary_structure')
    base_salary = models.DecimalField(max_digits=10, decimal_places=2)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='monthly')
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # income tax
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Salary - {self.employee.email}"


class DeductionType(models.Model):
    DEDUCTION_CATEGORY_CHOICES = [
        ('tax', 'Tax'),
        ('insurance', 'Insurance'),
        ('benefits', 'Benefits'),
        ('loan', 'Loan'),
        ('other', 'Other'),
    ]
    
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=DEDUCTION_CATEGORY_CHOICES)
    description = models.TextField(blank=True, null=True)
    is_fixed = models.BooleanField(default=True)  # True if fixed amount, False if percentage
    default_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class EmployeeDeduction(models.Model):
    employee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='deductions')
    deduction_type = models.ForeignKey(DeductionType, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']
        unique_together = ('employee', 'deduction_type')

    def __str__(self):
        return f"{self.employee.email} - {self.deduction_type.name}"


class Allowance(models.Model):
    ALLOWANCE_TYPE_CHOICES = [
        ('deminimis', 'De Minimis'),
        ('hazard', 'Hazard Pay'),
        ('lunch', 'Lunch Allowance'),
        ('transport', 'Transportation'),
        ('communication', 'Communication'),
        ('other', 'Other'),
    ]
    
    employee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='allowances')
    allowance_type = models.CharField(max_length=50, choices=ALLOWANCE_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.employee.email} - {self.get_allowance_type_display()}"


class EmployeeContribution(models.Model):
    """Employee-specific government contributions (SSS, PhilHealth, Pag-IBIG, etc.)"""
    employee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='contributions')
    name = models.CharField(max_length=100)  # SSS, PhilHealth, Pag-IBIG, etc.
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # Fixed amount to be deducted
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ('employee', 'name')

    def __str__(self):
        return f"{self.employee.email} - {self.name}: ₱{self.amount}"


class PaySlip(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('generated', 'Generated'),
        ('sent', 'Sent'),
        ('viewed', 'Viewed'),
        ('paid', 'Paid'),
    ]
    
    employee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='payslips')
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Earnings
    base_salary = models.DecimalField(max_digits=10, decimal_places=2)
    allowances_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    overtime_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bonus = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gross_salary = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Deductions
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Net
    net_salary = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Additional info
    working_days = models.IntegerField()
    days_present = models.IntegerField()
    days_absent = models.IntegerField(default=0)
    days_on_leave = models.IntegerField(default=0)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    payment_method = models.CharField(max_length=50, blank=True, null=True)  # bank transfer, cash, check
    payment_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-period_end']
        unique_together = ('employee', 'period_start', 'period_end')

    def __str__(self):
        return f"PaySlip - {self.employee.email} ({self.period_start} to {self.period_end})"


class PayrollProcessing(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('error', 'Error'),
    ]
    
    period_start = models.DateField()
    period_end = models.DateField()
    department = models.ForeignKey('accounts.Department', on_delete=models.SET_NULL, null=True, blank=True)
    
    total_employees = models.IntegerField(default=0)
    payslips_generated = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    processed_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_payrolls')
    error_message = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-period_end']

    def __str__(self):
        return f"Payroll Processing {self.period_start} to {self.period_end} - {self.status}"
