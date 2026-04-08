import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  getPayrollEmployees,
  getPayrollAllowanceEligibility,
  getRecentPayroll,
  getPayrollPayslipImage,
  processPayroll,
  getEmployeeContributions,
  updateEmployeeContributions,
  updatePayrollAllowanceEligibility,
  deleteEmployeeContribution,
} from '../../../services/payrollService';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '../../../components/ui/accounting-ui';
import {
  DollarSign,
  Settings,
  BarChart3,
  Calculator,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  UserCheck,
} from 'lucide-react';

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (amount) => {
  const value = Number(amount || 0);
  return pesoFormatter.format(value);
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatDisplayDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const getDateOnly = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const cloneContributions = (items = []) => (
  items.map((item) => ({ ...item }))
);

const normalizeContributionAmount = (value) => Number(toNumber(value).toFixed(2));

const getStoredUserFullName = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '';
    const user = JSON.parse(raw);
    const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    return fullName || user?.name || user?.email || '';
  } catch (_error) {
    return '';
  }
};

const createEmptyPayslipForm = () => ({
  monthly: '',
  basicSalary: '',
  regularOvertime: '',
  lateUndertime: '',
  restDayOt: '',
  netTaxableSalary: '',
  payrollTax: '',
  totalDeductions: '',
  grossAmount: '',
  payrollAllowance: '',
  companyLoanCashAdvance: '',
  salaryNetPay: '',
  preparedBy: getStoredUserFullName() || 'Accounting Department',
  approvedByTopManagement: '',
  approvedBy: '',
  preparedBySignature: '',
  approvedBySignature: '',
});


export function PayrollManagement() {
  const [isProcessPayrollOpen, setIsProcessPayrollOpen] = useState(false);
  const [isTaxDeductionsOpen, setIsTaxDeductionsOpen] = useState(false);
  const [isAllowanceEligibilityOpen, setIsAllowanceEligibilityOpen] = useState(false);
  const [isPayslipPreviewOpen, setIsPayslipPreviewOpen] = useState(false);
  const [payslipPreviewData, setPayslipPreviewData] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPayrollPeriod, setSelectedPayrollPeriod] = useState('29-13');
  const [employees, setEmployees] = useState([]);
  const [recentPayrollRecords, setRecentPayrollRecords] = useState([]);
  const [isLoadingPayrollData, setIsLoadingPayrollData] = useState(true);
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
  const [loadingPayslipImageId, setLoadingPayslipImageId] = useState(null);
  const [isPayslipImageViewerOpen, setIsPayslipImageViewerOpen] = useState(false);
  const [payslipImagePreviewUrl, setPayslipImagePreviewUrl] = useState('');
  const [selectedPayslipRecord, setSelectedPayslipRecord] = useState(null);
  const [payrollError, setPayrollError] = useState('');
  const [allowanceEligibleEmployeeIds, setAllowanceEligibleEmployeeIds] = useState([]);
  const [isSavingAllowanceEligibility, setIsSavingAllowanceEligibility] = useState(false);

  // Employee-specific contributions
  const [selectedContributionEmployee, setSelectedContributionEmployee] = useState('');
  const [employeeContributions, setEmployeeContributions] = useState([]);
  const [isLoadingEmployeeContributions, setIsLoadingEmployeeContributions] = useState(false);
  const [isSavingEmployeeContribution, setIsSavingEmployeeContribution] = useState(false);
  const [contributionError, setContributionError] = useState('');
  const [newContributionName, setNewContributionName] = useState('');
  const [newContributionAmount, setNewContributionAmount] = useState('');

  // Employee contributions in the Process Payroll modal
  const [modalEmployeeContributions, setModalEmployeeContributions] = useState([]);
  const [originalModalContributions, setOriginalModalContributions] = useState([]);
  const [isLoadingModalContributions, setIsLoadingModalContributions] = useState(false);
  const [isEditingModalContributions, setIsEditingModalContributions] = useState(false);
  const [isSavingModalContributions, setIsSavingModalContributions] = useState(false);

  // Payslip form values for Process Payroll modal
  const [payslipForm, setPayslipForm] = useState(createEmptyPayslipForm);
  const [isPayslipFormInitialized, setIsPayslipFormInitialized] = useState(false);

  // Filter Recent Payroll Records
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterPayrollPeriod, setFilterPayrollPeriod] = useState('all');

  const selectedEmployeeData = useMemo(
    () => employees.find((employee) => String(employee.id) === String(selectedEmployee)),
    [employees, selectedEmployee]
  );

  const currentUserId = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.id || null;
    } catch (_error) {
      return null;
    }
  }, []);

  const currentAccountingUser = useMemo(
    () => employees.find((employee) => String(employee.id) === String(currentUserId)),
    [employees, currentUserId]
  );

  const topManagementUser = useMemo(
    () => employees.find((employee) => ['ceo', 'president'].includes(String(employee.role || '').toLowerCase())),
    [employees]
  );

  const isSelectedEmployeeAllowanceEligible = Boolean(selectedEmployeeData?.payroll_allowance_eligible);

  const fetchPayrollData = async () => {
    setIsLoadingPayrollData(true);
    setPayrollError('');
    try {
      const [employeesData, recentData] = await Promise.all([
        getPayrollEmployees(),
        getRecentPayroll(),
      ]);

      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setRecentPayrollRecords(Array.isArray(recentData) ? recentData : []);
    } catch (error) {
      console.error('Failed to load payroll data:', error);
      setPayrollError(error.response?.data?.error || 'Failed to load payroll data.');
    } finally {
      setIsLoadingPayrollData(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, []);

  useEffect(() => (
    () => {
      if (payslipImagePreviewUrl) {
        URL.revokeObjectURL(payslipImagePreviewUrl);
      }
    }
  ), [payslipImagePreviewUrl]);

  // Helper function to calculate dates from month, year, and period
  const calculatePayrollDates = () => {
    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10);
    
    let startDate, endDate;
    if (selectedPayrollPeriod === '29-13') {
      // 29th of previous month to 13th of current month
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      startDate = new Date(prevYear, prevMonth - 1, 29);
      endDate = new Date(year, month - 1, 13);
    } else {
      // 14th to 28th of current month
      startDate = new Date(year, month - 1, 14);
      endDate = new Date(year, month - 1, 28);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  // Helper function to determine payroll period from dates
  const getPayrollPeriodLabel = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 'Unknown';
    const startDate = new Date(startDateStr);
    const startDay = startDate.getDate();
    // If start day is 14-28, it's a 14-28 period. Otherwise (1-13 or 29-31), it's a 29-13 period
    return startDay >= 14 && startDay <= 28 ? '14 - 28' : '29 - 13';
  };

  // Filtered payroll records based on employee and period filters
  const filteredPayrollRecords = useMemo(() => (
    recentPayrollRecords.filter((record) => {
      if (filterEmployee !== 'all' && String(record.employee_id) !== String(filterEmployee)) {
        return false;
      }
      if (filterPayrollPeriod !== 'all') {
        const period = getPayrollPeriodLabel(record.period_start, record.period_end);
        if (period !== filterPayrollPeriod) {
          return false;
        }
      }
      return true;
    })
  ), [recentPayrollRecords, filterEmployee, filterPayrollPeriod]);

  useEffect(() => {
    if (!selectedEmployee) {
      setModalEmployeeContributions([]);
      setOriginalModalContributions([]);
      return;
    }

    // Fetch employee contributions for the selected employee
    const fetchEmployeeContributions = async () => {
      setIsLoadingModalContributions(true);
      try {
        const data = await getEmployeeContributions(selectedEmployee);
        const safeData = Array.isArray(data) ? cloneContributions(data) : [];
        setModalEmployeeContributions(safeData);
        setOriginalModalContributions(cloneContributions(safeData));
      } catch (error) {
        console.error('Failed to load employee contributions:', error);
        setModalEmployeeContributions([]);
        setOriginalModalContributions([]);
      } finally {
        setIsLoadingModalContributions(false);
      }
    };
    
    fetchEmployeeContributions();
  }, [selectedEmployee]);

  const getContributionTotal = (items = []) => (
    items.reduce((sum, item) => sum + toNumber(item.amount), 0)
  );

  const validateGovernmentContributions = (items = []) => {
    for (const item of items) {
      const rawAmount = item?.amount;
      if (rawAmount === '' || rawAmount === null || rawAmount === undefined) {
        return `${item?.name || 'Government contribution'} amount is required.`;
      }

      const numericAmount = Number(rawAmount);
      if (!Number.isFinite(numericAmount)) {
        return `${item?.name || 'Government contribution'} amount must be a valid number.`;
      }

      if (numericAmount < 0) {
        return `${item?.name || 'Government contribution'} amount must be non-negative.`;
      }
    }

    return '';
  };

  const validatePayrollConditions = () => {
    if (!selectedEmployee) {
      return 'Please select an employee first.';
    }

    const { startDate, endDate } = calculatePayrollDates();
    if (!startDate || !endDate) {
      return 'Payroll dates are required.';
    }

    const startDateValue = new Date(`${startDate}T00:00:00`);
    const endDateValue = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(startDateValue.getTime()) || Number.isNaN(endDateValue.getTime())) {
      return 'Payroll dates are invalid.';
    }

    if (startDateValue > endDateValue) {
      return 'Payroll period is invalid. Start date cannot be after end date.';
    }

    if (toNumber(payslipForm.monthly) <= 0) {
      return 'Please enter a valid Monthly amount greater than 0.';
    }

    if (toNumber(payslipForm.basicSalary) <= 0) {
      return 'Please enter a valid Basic Salary greater than 0.';
    }

    const contributionValidationError = validateGovernmentContributions(modalEmployeeContributions);
    if (contributionValidationError) {
      return contributionValidationError;
    }

    const hasDuplicate = recentPayrollRecords.some((record) => (
      String(record.employee_id) === String(selectedEmployee)
      && getDateOnly(record.period_start) === startDate
      && getDateOnly(record.period_end) === endDate
    ));

    if (hasDuplicate) {
      return 'Payroll already exists for this employee and period.';
    }

    return '';
  };

  const buildInitialPayslipForm = () => {
    const monthlyDefault = toNumber(selectedEmployeeData?.salary) > 0
      ? toNumber(selectedEmployeeData.salary)
      : 0;

    const basicSalaryDefault = toNumber(selectedEmployeeData?.salary) > 0
      ? toNumber(selectedEmployeeData.salary)
      : 0;
    const regularOvertimeDefault = 0;
    const lateUndertimeDefault = 0;
    const restDayOtDefault = 0;
    const payrollTaxDefault = 0;
    const payrollAllowanceDefault = 0;
    const companyLoanDefault = 0;
    const grossAmountDefault = basicSalaryDefault;
    const totalDeductionsDefault = getContributionTotal(modalEmployeeContributions);
    const netTaxableSalaryDefault = Math.max(0, grossAmountDefault - lateUndertimeDefault);
    const netSalaryDefault = Math.max(
      0,
      netTaxableSalaryDefault + payrollAllowanceDefault - totalDeductionsDefault - companyLoanDefault
    );

    const preparedByName = currentAccountingUser?.name || getStoredUserFullName() || 'Accounting Department';
    const topManagementName = topManagementUser?.name || '';

    return {
      monthly: monthlyDefault.toFixed(2),
      basicSalary: basicSalaryDefault.toFixed(2),
      regularOvertime: regularOvertimeDefault.toFixed(2),
      lateUndertime: lateUndertimeDefault.toFixed(2),
      restDayOt: restDayOtDefault.toFixed(2),
      netTaxableSalary: netTaxableSalaryDefault.toFixed(2),
      payrollTax: payrollTaxDefault.toFixed(2),
      totalDeductions: totalDeductionsDefault.toFixed(2),
      grossAmount: grossAmountDefault.toFixed(2),
      payrollAllowance: payrollAllowanceDefault.toFixed(2),
      companyLoanCashAdvance: companyLoanDefault.toFixed(2),
      salaryNetPay: netSalaryDefault.toFixed(2),
      preparedBy: preparedByName,
      approvedByTopManagement: topManagementName,
      approvedBy: topManagementName,
      preparedBySignature: currentAccountingUser?.signature_image || '',
      approvedBySignature: topManagementUser?.signature_image || '',
    };
  };

  const computePayslipValues = (formValues = payslipForm) => {
    const basicSalary = toNumber(formValues.basicSalary);
    const regularOvertime = toNumber(formValues.regularOvertime);
    const lateUndertime = toNumber(formValues.lateUndertime);
    const restDayOt = toNumber(formValues.restDayOt);
    const payrollAllowance = isSelectedEmployeeAllowanceEligible
      ? toNumber(formValues.payrollAllowance)
      : 0;
    const companyLoanCashAdvance = toNumber(formValues.companyLoanCashAdvance);
    const governmentContributionsTotal = getContributionTotal(modalEmployeeContributions);

    const grossAmount = basicSalary + regularOvertime + restDayOt;
    const netTaxableSalary = Math.max(0, grossAmount - lateUndertime);
    const payrollTax = 0;
    const totalDeductions = governmentContributionsTotal + payrollTax;
    const salaryNetPay = Math.max(
      0,
      netTaxableSalary + payrollAllowance - totalDeductions - companyLoanCashAdvance
    );

    return {
      grossAmount,
      netTaxableSalary,
      payrollTax,
      totalDeductions,
      salaryNetPay,
      payrollAllowance,
      companyLoanCashAdvance,
      governmentContributionsTotal,
      basicSalary,
      regularOvertime,
      lateUndertime,
      restDayOt,
    };
  };

  const computedPayslipValues = useMemo(
    () => computePayslipValues(),
    [
      payslipForm.basicSalary,
      payslipForm.regularOvertime,
      payslipForm.lateUndertime,
      payslipForm.restDayOt,
      payslipForm.payrollAllowance,
      payslipForm.companyLoanCashAdvance,
      modalEmployeeContributions,
      isSelectedEmployeeAllowanceEligible,
    ]
  );

  useEffect(() => {
    setIsPayslipFormInitialized(false);
    setIsEditingModalContributions(false);
    if (!selectedEmployee) {
      setPayslipForm(createEmptyPayslipForm());
      return;
    }
    setPayslipForm(createEmptyPayslipForm());
  }, [selectedEmployee, selectedMonth, selectedYear, selectedPayrollPeriod]);

  useEffect(() => {
    if (!selectedEmployee) return;
    if (isPayslipFormInitialized) return;
    if (isLoadingModalContributions) return;

    const initialValues = buildInitialPayslipForm();
    setPayslipForm((prev) => ({
      ...prev,
      ...initialValues,
    }));
    setIsPayslipFormInitialized(true);
  }, [
    selectedEmployee,
    selectedEmployeeData,
    currentAccountingUser,
    topManagementUser,
    modalEmployeeContributions,
    isLoadingModalContributions,
    isPayslipFormInitialized,
  ]);

  // Keep allowance at zero when employee is not eligible.
  useEffect(() => {
    if (!selectedEmployee || isSelectedEmployeeAllowanceEligible) return;

    const contributionsTotal = getContributionTotal(modalEmployeeContributions);
    setPayslipForm((prev) => ({
      ...prev,
      totalDeductions: contributionsTotal.toFixed(2),
      payrollAllowance: '0.00',
    }));
  }, [modalEmployeeContributions, selectedEmployee, isSelectedEmployeeAllowanceEligible]);

  const handlePayslipFieldChange = (field, value) => {
    setPayslipForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleModalContributionAmountChange = (contributionId, value) => {
    setModalEmployeeContributions((prev) => prev.map((item) => (
      item.id === contributionId
        ? { ...item, amount: value }
        : item
    )));
  };

  const handleSaveModalContributions = async () => {
    if (!selectedEmployee) return;

    const originalById = new Map(
      originalModalContributions.map((item) => [
        item.id,
        normalizeContributionAmount(item.amount),
      ])
    );

    const changedItems = modalEmployeeContributions.filter((item) => {
      const previousAmount = originalById.get(item.id);
      const currentAmount = normalizeContributionAmount(item.amount);
      return previousAmount === undefined || currentAmount !== previousAmount;
    });

    if (changedItems.length === 0) {
      setIsEditingModalContributions(false);
      return;
    }

    setIsSavingModalContributions(true);
    try {
      await Promise.all(
        changedItems.map((item) => updateEmployeeContributions(selectedEmployee, {
          name: item.name,
          amount: toNumber(item.amount),
        }))
      );
      setOriginalModalContributions(cloneContributions(modalEmployeeContributions));
      setIsEditingModalContributions(false);
    } catch (error) {
      toast.error('Update Failed', {
        description: error.response?.data?.error || 'Failed to update contributions.',
      });
    } finally {
      setIsSavingModalContributions(false);
    }
  };

  const handleProcessPayroll = () => {
    setIsProcessPayrollOpen(true);
  };

  const handleOpenAllowanceEligibility = async () => {
    setIsAllowanceEligibilityOpen(true);
    try {
      const rows = await getPayrollAllowanceEligibility({ force: true });
      const eligibleIds = Array.isArray(rows)
        ? rows
          .filter((row) => Boolean(row?.payroll_allowance_eligible))
          .map((row) => String(row.id))
        : [];
      setAllowanceEligibleEmployeeIds(eligibleIds);
    } catch (error) {
      toast.error('Load Failed', {
        description: error.response?.data?.error || 'Failed to load allowance eligibility list.',
      });
      setAllowanceEligibleEmployeeIds(
        employees
          .filter((employee) => Boolean(employee.payroll_allowance_eligible))
          .map((employee) => String(employee.id))
      );
    }
  };

  const handleToggleAllowanceEligibility = (employeeId, isEnabled) => {
    setAllowanceEligibleEmployeeIds((prev) => {
      const id = String(employeeId);
      const existing = new Set(prev.map((item) => String(item)));
      if (isEnabled) {
        existing.add(id);
      } else {
        existing.delete(id);
      }
      return Array.from(existing);
    });
  };

  const handleSaveAllowanceEligibility = async () => {
    setIsSavingAllowanceEligibility(true);
    try {
      await updatePayrollAllowanceEligibility({ employee_ids: allowanceEligibleEmployeeIds });
      await fetchPayrollData();
      toast.success('Updated', {
        description: 'Payroll allowance eligibility has been updated.',
      });
      setIsAllowanceEligibilityOpen(false);
    } catch (error) {
      toast.error('Update Failed', {
        description: error.response?.data?.error || 'Failed to update payroll allowance eligibility.',
      });
    } finally {
      setIsSavingAllowanceEligibility(false);
    }
  };

  const handleOpenTaxDeductions = async () => {
    setIsTaxDeductionsOpen(true);
    setSelectedContributionEmployee('');
    setEmployeeContributions([]);
    setContributionError('');
  };

  const handleSelectContributionEmployee = async (employeeId) => {
    setSelectedContributionEmployee(employeeId);
    setIsLoadingEmployeeContributions(true);
    setContributionError('');
    try {
      const data = await getEmployeeContributions(employeeId);
      setEmployeeContributions(Array.isArray(data) ? data : []);
    } catch (error) {
      setContributionError(error.response?.data?.error || 'Failed to load employee contributions.');
    } finally {
      setIsLoadingEmployeeContributions(false);
    }
  };

  const handleAddEmployeeContribution = async () => {
    if (!selectedContributionEmployee) {
      toast.error('Validation Error', {
        description: 'Please select an employee first.',
      });
      return;
    }
    if (!newContributionName.trim() || !newContributionAmount) {
      toast.error('Validation Error', {
        description: 'Contribution name and amount are required.',
      });
      return;
    }

    setIsSavingEmployeeContribution(true);
    setContributionError('');
    try {
      const data = await updateEmployeeContributions(selectedContributionEmployee, {
        name: newContributionName.trim(),
        amount: parseFloat(newContributionAmount),
      });
      setEmployeeContributions((prev) => [...prev, data]);
      setNewContributionName('');
      setNewContributionAmount('');
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to save contribution.';
      toast.error('Update Failed', { description: message });
    } finally {
      setIsSavingEmployeeContribution(false);
    }
  };

  const handleDeleteEmployeeContribution = async (contributionId) => {
    if (!selectedContributionEmployee) return;
    const confirmed = window.confirm('Delete this contribution?');
    if (!confirmed) return;

    try {
      await deleteEmployeeContribution(selectedContributionEmployee, contributionId);
      setEmployeeContributions((prev) => prev.filter((item) => item.id !== contributionId));
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete contribution.';
      setContributionError(message);
      toast.error('Delete Failed', { description: message });
    }
  };

  const handleCloseModal = () => {
    setIsProcessPayrollOpen(false);
    setSelectedEmployee('');
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
    setSelectedPayrollPeriod('29-13');
    setModalEmployeeContributions([]);
    setOriginalModalContributions([]);
    setIsEditingModalContributions(false);
    setPayslipForm(createEmptyPayslipForm());
    setIsPayslipFormInitialized(false);
  };

  const closePayslipImageViewer = () => {
    setIsPayslipImageViewerOpen(false);
    setSelectedPayslipRecord(null);
    setPayslipImagePreviewUrl((prevUrl) => {
      if (prevUrl) {
        URL.revokeObjectURL(prevUrl);
      }
      return '';
    });
  };

  const handleViewPayslipImage = async (record) => {
    if (!record?.id) return;

    setLoadingPayslipImageId(record.id);
    try {
      const imageBlob = await getPayrollPayslipImage(record.id);
      if (!imageBlob || imageBlob.size === 0) {
        throw new Error('Payslip image is empty.');
      }

      const objectUrl = URL.createObjectURL(imageBlob);
      setPayslipImagePreviewUrl((prevUrl) => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return objectUrl;
      });
      setSelectedPayslipRecord(record);
      setIsPayslipImageViewerOpen(true);
    } catch (error) {
      const statusCode = error?.response?.status;
      const message =
        statusCode === 404
          ? 'Payslip image not found for this payroll record.'
          : statusCode === 403
            ? 'You are not authorized to view this payslip image.'
            : 'Unable to load payslip image right now.';
      toast.error('Load Failed', { description: message });
    } finally {
      setLoadingPayslipImageId(null);
    }
  };


  const buildPayslipPayload = () => {
    const { startDate, endDate } = calculatePayrollDates();

    const basicSalary = computedPayslipValues.basicSalary;
    const regularOvertime = computedPayslipValues.regularOvertime;
    const lateUndertime = computedPayslipValues.lateUndertime;
    const restDayOt = computedPayslipValues.restDayOt;
    const payrollTax = computedPayslipValues.payrollTax;
    const payrollAllowance = computedPayslipValues.payrollAllowance;
    const companyLoanCashAdvance = computedPayslipValues.companyLoanCashAdvance;
    const grossAmount = computedPayslipValues.grossAmount;
    const netTaxableSalary = computedPayslipValues.netTaxableSalary;
    const totalDeductionsAmount = computedPayslipValues.totalDeductions;
    const salaryNetPay = computedPayslipValues.salaryNetPay;
    const monthlyAmount = toNumber(payslipForm.monthly);

    const governmentContributions = modalEmployeeContributions.map((item) => ({
      id: item.id,
      name: item.name,
      amount: toNumber(item.amount),
    }));

    const preparedBy = (
      payslipForm.preparedBy
      || currentAccountingUser?.name
      || getStoredUserFullName()
      || 'Accounting Department'
    ).trim();

    const approvedByTopManagement = (
      topManagementUser?.name
      || payslipForm.approvedByTopManagement
      || ''
    ).trim();

    const approvedBy = (
      topManagementUser?.name
      || payslipForm.approvedBy
      || approvedByTopManagement
      || ''
    ).trim();

    const preparedBySignature = (
      payslipForm.preparedBySignature
      || currentAccountingUser?.signature_image
      || ''
    ).trim();

    const approvedBySignature = (
      payslipForm.approvedBySignature
      || topManagementUser?.signature_image
      || ''
    ).trim();

    return {
      startDate,
      endDate,
      basicSalary,
      regularOvertime,
      lateUndertime,
      restDayOt,
      payrollTax,
      netTaxableSalary,
      grossAmount,
      payrollAllowance,
      companyLoanCashAdvance,
      totalDeductionsAmount,
      salaryNetPay,
      monthlyAmount,
      governmentContributions,
      payslipFormPayload: {
        designation: selectedEmployeeData?.position || '',
        monthly: monthlyAmount,
        basic_salary: basicSalary,
        regular_overtime: regularOvertime,
        late_undertime: lateUndertime,
        rest_day_ot: restDayOt,
        net_taxable_salary: netTaxableSalary,
        payroll_tax: payrollTax,
        total_deductions: totalDeductionsAmount,
        gross_amount: grossAmount,
        payroll_allowance: payrollAllowance,
        company_loan_cash_advance: companyLoanCashAdvance,
        salary_net_pay: salaryNetPay,
        prepared_by: preparedBy,
        prepared_by_signature: preparedBySignature,
        approved_by_top_management: approvedByTopManagement,
        approved_by: approvedBy,
        approved_by_signature: approvedBySignature,
        government_contributions: governmentContributions,
      },
    };
  };

  const handlePreviewPayslip = () => {
    const validationError = validatePayrollConditions();
    if (validationError) {
      toast.error('Validation Error', { description: validationError });
      return;
    }

    const payload = buildPayslipPayload();
    
    // Store preview data and open confirmation modal
    setPayslipPreviewData(payload);
    setIsPayslipPreviewOpen(true);
  };

  const handleConfirmPayroll = async () => {
    if (!payslipPreviewData) {
      toast.error('Preview Error', { description: 'No payslip preview data' });
      return;
    }

    setIsProcessingPayroll(true);
    try {
      const payload = {
        employee_id: selectedEmployee,
        period_start: payslipPreviewData.startDate,
        period_end: payslipPreviewData.endDate,
        payslip_form: payslipPreviewData.payslipFormPayload,
      };

      const responseData = await processPayroll(payload);

      const name = responseData?.payslip?.employee_name || selectedEmployeeData?.name || 'Employee';
      const netSalary = responseData?.payslip?.net_salary || payslipPreviewData.salaryNetPay;
      
      // Create success message with Image and Email info
      let successMessage = `✅ Payslip processed successfully!\n\nEmployee: ${name}\nNet Salary: ${formatCurrency(netSalary)}\n\nPayroll has been saved to the database.`;
      
      // Add Image info if available
      if (responseData?.image?.generated) {
        successMessage += '\n\n🖼️ Payslip Image: Saved to database.\nClick the employee\'s record in Recent Payroll Records to view it.';
      }
      
      // Add Email info if attempted
      if (responseData?.email) {
        if (responseData.email.sent) {
          successMessage += `\n\n📧 Email: Sent successfully to ${responseData.email.recipient}`;
        } else if (responseData.email.message) {
          successMessage += `\n\n📧 Email: ${responseData.email.message}`;
        } else {
          successMessage += `\n\n📧 Email: Not sent`;
        }
      }

      toast.success('Payroll Processed', { description: successMessage });
      
      await fetchPayrollData();
      setIsPayslipPreviewOpen(false);
      handleCloseModal();
    } catch (error) {
      console.error('Payroll processing error:', error);
      toast.error('Payroll Processing Failed', {
        description: error.response?.data?.error || error.message || 'Unknown error',
      });
    } finally {
      setIsProcessingPayroll(false);
    }
  };

  // Calculate analytics
  const payrollAnalytics = useMemo(() => {
    const totalEmployeesCount = employees.length;
    const totalPayrollAmount = recentPayrollRecords.reduce(
      (sum, record) => sum + toNumber(record.net_salary),
      0
    );

    const totalDeductionsAmount = recentPayrollRecords.reduce((sum, record) => {
      const baseSalary = toNumber(record.base_salary);
      const sss = baseSalary * 0.045;
      const phic = baseSalary * 0.02;
      const hdmf = 100;
      const tax = toNumber(record.tax);
      return sum + (sss + phic + hdmf + tax);
    }, 0);

    return {
      totalEmployees: totalEmployeesCount,
      totalPayroll: totalPayrollAmount,
      averageSalary: totalEmployeesCount > 0 ? totalPayrollAmount / totalEmployeesCount : 0,
      totalDeductions: totalDeductionsAmount,
    };
  }, [employees, recentPayrollRecords]);

  const {
    totalEmployees,
    totalPayroll,
    averageSalary,
    totalDeductions,
  } = payrollAnalytics;

  return (
    <div className="space-y-6">
      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees Card */}
        <Card className="border-0 shadow-lg bg-linear-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-medium mt-2">{totalEmployees}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Total Payroll Card */}
        <Card className="border-0 shadow-lg bg-linear-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payroll</p>
                <p className="text-2xl font-medium mt-2 text-primary">{formatCurrency(totalPayroll)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Average Salary Card */}
        <Card className="border-0 shadow-lg bg-linear-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Salary</p>
                <p className="text-2xl font-medium mt-2 text-primary">{formatCurrency(averageSalary)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Total Deductions Card */}
        <Card className="border-0 shadow-lg bg-linear-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deductions</p>
                <p className="text-2xl font-medium mt-2 text-primary">{formatCurrency(totalDeductions)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Actions */}
      <Card className="border-0 shadow-lg bg-linear-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Payroll Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleProcessPayroll}
            >
              <Plus className="w-4 h-4" />
              Process Payroll
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleOpenTaxDeductions}
            >
              <Settings className="w-4 h-4" />
              Government Contributions
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleOpenAllowanceEligibility}
            >
              <UserCheck className="w-4 h-4" />
              Payroll Allowance Eligibility
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payroll Records */}
      <Card className="border-0 shadow-lg bg-linear-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Payroll Records</span>
            <span className="text-sm font-normal text-muted-foreground">({filteredPayrollRecords.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-background/20 border border-white/10">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Filter by Employee</Label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger className="bg-background border-white/10 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Filter by Period</Label>
              <Select value={filterPayrollPeriod} onValueChange={setFilterPayrollPeriod}>
                <SelectTrigger className="bg-background border-white/10 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  <SelectItem value="29 - 13">29 - 13</SelectItem>
                  <SelectItem value="14 - 28">14 - 28</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterEmployee('all');
                  setFilterPayrollPeriod('all');
                }}
                className="w-full h-9"
              >
                Reset Filters
              </Button>
            </div>
          </div>

          {/* Records Display */}
          {isLoadingPayrollData ? (
            <p className="text-sm text-muted-foreground">Loading payroll records...</p>
          ) : payrollError ? (
            <p className="text-sm text-red-600">{payrollError}</p>
          ) : filteredPayrollRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {recentPayrollRecords.length === 0 ? 'No payroll records yet. Process payroll to generate records.' : 'No records match the selected filters.'}
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredPayrollRecords.map((record) => {
                const canViewImage = Boolean(record.has_payslip_image || record.payslip_image_endpoint);
                const isLoadingImage = loadingPayslipImageId === record.id;

                return (
                <div
                  key={record.id}
                  className={`flex flex-col p-4 rounded-lg border border-border/50 bg-card/40 transition-colors ${canViewImage ? 'hover:bg-card/60 cursor-pointer' : 'cursor-default'}`}
                  onClick={() => {
                    if (canViewImage && !isLoadingImage) {
                      handleViewPayslipImage(record);
                    }
                  }}
                  role={canViewImage ? 'button' : undefined}
                  tabIndex={canViewImage ? 0 : -1}
                  onKeyDown={(event) => {
                    if (!canViewImage || isLoadingImage) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleViewPayslipImage(record);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={record.employee_avatar} alt={record.employee_name} />
                        <AvatarFallback>{(record.employee_name || '?').split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{record.employee_name}</p>
                        <p className="text-sm text-muted-foreground">{record.employee_role || 'Employee'}</p>
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary">
                      {record.status_label || 'Processed'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Period</p>
                      <p className="font-semibold">{record.period_start} to {record.period_end}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Base Salary</p>
                      <p className="font-semibold">{formatCurrency(record.base_salary)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Net Salary</p>
                      <p className="font-semibold text-[#F27229]">{formatCurrency(record.net_salary)}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {isLoadingImage
                      ? 'Loading payslip image...'
                      : canViewImage
                        ? 'Click to view payslip image'
                        : 'Payslip image unavailable for this record'}
                  </p>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isPayslipImageViewerOpen}
        onOpenChange={(open) => {
          if (!open) {
            closePayslipImageViewer();
            return;
          }
          setIsPayslipImageViewerOpen(true);
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Payslip Image - {selectedPayslipRecord?.employee_name || 'Employee'}
            </DialogTitle>
          </DialogHeader>

          {payslipImagePreviewUrl ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Period: {selectedPayslipRecord?.period_start} to {selectedPayslipRecord?.period_end}
              </div>
              <div className="rounded-lg border border-border/60 bg-card/30 p-2 overflow-auto">
                <img
                  src={payslipImagePreviewUrl}
                  alt={`Payslip for ${selectedPayslipRecord?.employee_name || 'employee'}`}
                  className="w-full h-auto object-contain"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closePayslipImageViewer}>Close</Button>
                <Button
                  onClick={() => {
                    if (!payslipImagePreviewUrl) return;
                    const employeeSlug = (selectedPayslipRecord?.employee_name || 'employee')
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '');
                    const fallbackPeriod = selectedPayslipRecord?.period_end || selectedPayslipRecord?.id;
                    const link = document.createElement('a');
                    link.href = payslipImagePreviewUrl;
                    link.download = `payslip-${employeeSlug}-${fallbackPeriod}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  Download
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No payslip image loaded.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Tax/Deductions Modal */}
      <Dialog open={isTaxDeductionsOpen} onOpenChange={setIsTaxDeductionsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Manage Employee Contributions
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="contribution-employee">Select Employee</Label>
              <Select value={selectedContributionEmployee} onValueChange={handleSelectContributionEmployee}>
                <SelectTrigger className="bg-background border-white/10 text-white">
                  <SelectValue placeholder="Choose an employee to manage contributions" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <span>{emp.name}</span>
                        <span className="text-xs text-muted-foreground">({emp.employee_id || `ID-${emp.user_id}`})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Each employee can have different contribution amounts for government benefits like SSS, PhilHealth, and Pag-IBIG.
              </p>
            </div>

            {selectedContributionEmployee && (
              <>
                {/* Employee Contributions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Add New Contribution */}
                  <div className="p-4 rounded-lg bg-background/20 border border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-4">Add Contribution</h3>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-white/60">Contribution Type</Label>
                        <Input
                          placeholder="e.g., SSS, PhilHealth, Pag-IBIG"
                          value={newContributionName}
                          onChange={(e) => setNewContributionName(e.target.value)}
                          className="bg-background border-white/10 text-white h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-white/60">Amount (₱)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={newContributionAmount}
                          onChange={(e) => setNewContributionAmount(e.target.value)}
                          className="bg-background border-white/10 text-white h-9"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <Button
                        className="w-full gap-2 h-9"
                        onClick={handleAddEmployeeContribution}
                        disabled={isSavingEmployeeContribution}
                      >
                        <Plus className="w-4 h-4" />
                        {isSavingEmployeeContribution ? 'Saving...' : 'Add Contribution'}
                      </Button>
                    </div>
                  </div>

                  {/* Current Contributions */}
                  <div className="p-4 rounded-lg bg-background/20 border border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-4">Current Contributions</h3>
                    {contributionError && <p className="text-xs text-red-500 mb-3">{contributionError}</p>}
                    {isLoadingEmployeeContributions ? (
                      <p className="text-sm text-muted-foreground">Loading contributions...</p>
                    ) : employeeContributions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No contributions configured yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {employeeContributions.map((contribution) => (
                          <div key={contribution.id} className="p-2 rounded bg-[#021B2C] flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{contribution.name}</p>
                              <p className="text-xs text-white/60">{formatCurrency(contribution.amount)}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEmployeeContribution(contribution.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8 w-8 p-0 flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button onClick={() => setIsTaxDeductionsOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payroll Allowance Eligibility Modal */}
      <Dialog open={isAllowanceEligibilityOpen} onOpenChange={setIsAllowanceEligibilityOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Payroll Allowance Eligibility
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Select employees who are eligible to receive payroll allowance.
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {employees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active employees found.</p>
              ) : (
                employees.map((employee) => {
                  const checked = allowanceEligibleEmployeeIds.includes(String(employee.id));
                  return (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-background/20 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{employee.name}</p>
                        <p className="text-xs text-white/60">
                          {employee.position || 'Employee'}
                        </p>
                      </div>
                      <Switch
                        checked={checked}
                        onCheckedChange={(value) => handleToggleAllowanceEligibility(employee.id, value)}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsAllowanceEligibilityOpen(false)}
              disabled={isSavingAllowanceEligibility}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAllowanceEligibility} disabled={isSavingAllowanceEligibility}>
              {isSavingAllowanceEligibility ? 'Saving...' : 'Save Eligibility'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Process Payroll Modal */}
      <Dialog open={isProcessPayrollOpen} onOpenChange={setIsProcessPayrollOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Process Payroll
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employee">Employee Name</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="bg-background border-white/10 text-white">
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <span>{emp.name}</span>
                        <span className="text-xs text-muted-foreground">({emp.employee_id || `ID-${emp.user_id}`})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payroll Period Selection */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthSelect">Month</Label>
                <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                  <SelectTrigger className="bg-background border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {new Date(2024, month - 1, 1).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearSelect">Year</Label>
                <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                  <SelectTrigger className="bg-background border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodSelect">Payroll Period</Label>
                <Select value={selectedPayrollPeriod} onValueChange={setSelectedPayrollPeriod}>
                  <SelectTrigger className="bg-background border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="29-13">29 - 13</SelectItem>
                    <SelectItem value="14-28">14 - 28</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input
                  value={selectedEmployeeData?.position || ''}
                  readOnly
                  placeholder="Employee role"
                  className="bg-background border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyAmount">Monthly</Label>
                <Input
                  id="monthlyAmount"
                  type="number"
                  value={payslipForm.monthly}
                  onChange={(e) => handlePayslipFieldChange('monthly', e.target.value)}
                  className="bg-background border-white/10 text-white"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <Card className="border border-white/10 bg-card">
              <CardHeader>
                <CardTitle className="text-base">Earnings</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basicSalary">Basic Salary</Label>
                  <Input
                    id="basicSalary"
                    type="number"
                    value={payslipForm.basicSalary}
                    onChange={(e) => handlePayslipFieldChange('basicSalary', e.target.value)}
                    className="bg-background border-white/10 text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regularOvertime">Regular Overtime</Label>
                  <Input
                    id="regularOvertime"
                    type="number"
                    value={payslipForm.regularOvertime}
                    onChange={(e) => handlePayslipFieldChange('regularOvertime', e.target.value)}
                    className="bg-background border-white/10 text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lateUndertime">Late/Undertime</Label>
                  <Input
                    id="lateUndertime"
                    type="number"
                    value={payslipForm.lateUndertime}
                    onChange={(e) => handlePayslipFieldChange('lateUndertime', e.target.value)}
                    className="bg-background border-white/10 text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rest Day</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restDayOt">Rest Day OT</Label>
                  <Input
                    id="restDayOt"
                    type="number"
                    value={payslipForm.restDayOt}
                    onChange={(e) => handlePayslipFieldChange('restDayOt', e.target.value)}
                    className="bg-background border-white/10 text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Holiday</Label>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Deductions</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isEditingModalContributions) {
                        handleSaveModalContributions();
                        return;
                      }
                      setIsEditingModalContributions(true);
                    }}
                    disabled={!selectedEmployee || isLoadingModalContributions || isSavingModalContributions}
                  >
                    {isEditingModalContributions
                      ? (isSavingModalContributions ? 'Saving...' : 'Save')
                      : 'Edit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Government Contributions</Label>
                  {isLoadingModalContributions ? (
                    <p className="text-sm text-muted-foreground">Loading government contributions...</p>
                  ) : modalEmployeeContributions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No government contributions configured for this employee.</p>
                  ) : (
                    <div className="space-y-2">
                      {modalEmployeeContributions.map((item) => (
                        <div key={item.id} className="grid grid-cols-2 gap-3 items-center">
                          <p className="text-sm text-muted-foreground">{item.name}</p>
                          {isEditingModalContributions ? (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.amount}
                              onChange={(e) => handleModalContributionAmountChange(item.id, e.target.value)}
                              className="bg-background border-white/10 text-white h-9"
                            />
                          ) : (
                            <p className="text-sm font-medium text-right">{formatCurrency(item.amount)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="netTaxableSalary">NET Taxable Salary</Label>
                    <Input
                      id="netTaxableSalary"
                      type="number"
                      value={computedPayslipValues.netTaxableSalary.toFixed(2)}
                      readOnly
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white cursor-not-allowed"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payrollTax">Payroll Tax</Label>
                    <Input
                      id="payrollTax"
                      type="number"
                      value={computedPayslipValues.payrollTax.toFixed(2)}
                      readOnly
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white cursor-not-allowed"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalDeductions">Total Deductions</Label>
                    <Input
                      id="totalDeductions"
                      type="number"
                      value={computedPayslipValues.totalDeductions.toFixed(2)}
                      readOnly
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white cursor-not-allowed"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-card">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grossAmount" className="min-h-[2.5rem] flex items-end pb-1">GROSS Amount</Label>
                    <Input
                      id="grossAmount"
                      type="number"
                      value={computedPayslipValues.grossAmount.toFixed(2)}
                      readOnly
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white cursor-not-allowed"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payrollAllowance" className="min-h-[2.5rem] flex items-end pb-1">Payroll Allowance</Label>
                    <Input
                      id="payrollAllowance"
                      type="number"
                      value={isSelectedEmployeeAllowanceEligible ? payslipForm.payrollAllowance : '0.00'}
                      onChange={(e) => handlePayslipFieldChange('payrollAllowance', e.target.value)}
                      className="bg-background border-white/10 text-white"
                      disabled={!isSelectedEmployeeAllowanceEligible}
                      min="0"
                      step="0.01"
                    />
                    {!isSelectedEmployeeAllowanceEligible && (
                      <p className="text-xs text-muted-foreground">This employee is not allowance-eligible.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyLoanCashAdvance" className="min-h-[2.5rem] flex items-end pb-1">Company Loan/Cash Advance</Label>
                    <Input
                      id="companyLoanCashAdvance"
                      type="number"
                      value={payslipForm.companyLoanCashAdvance}
                      onChange={(e) => handlePayslipFieldChange('companyLoanCashAdvance', e.target.value)}
                      className="bg-background border-white/10 text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salaryNetPay" className="text-[#F27229] font-semibold">SALARY NET PAY</Label>
                  <Input
                    id="salaryNetPay"
                    type="number"
                    value={computedPayslipValues.salaryNetPay.toFixed(2)}
                    readOnly
                    className="bg-[#021B2C] border-[#F27229]/40 text-[#F27229] font-semibold cursor-not-allowed"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preparedBy" className="min-h-[2.5rem] flex items-end pb-1">Prepared By (Accounting Department)</Label>
                    <Input
                      id="preparedBy"
                      value={payslipForm.preparedBy}
                      readOnly
                      className="bg-background border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approvedByTopManagement" className="min-h-[2.5rem] flex items-end pb-1">Approved By (Top Management)</Label>
                    <Input
                      id="approvedByTopManagement"
                      value={topManagementUser?.name || payslipForm.approvedByTopManagement}
                      readOnly
                      placeholder=""
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approvedBy" className="min-h-[2.5rem] flex items-end pb-1">Approved By</Label>
                    <Input
                      id="approvedBy"
                      value={topManagementUser?.name || payslipForm.approvedBy}
                      readOnly
                      placeholder=""
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white cursor-not-allowed"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                onClick={handlePreviewPayslip}
                disabled={!selectedEmployee}
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Preview & Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payslip Confirmation Preview Modal */}
      <Dialog open={isPayslipPreviewOpen} onOpenChange={setIsPayslipPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Payslip Preview - Confirm to Process
            </DialogTitle>
          </DialogHeader>
          {payslipPreviewData && selectedEmployeeData && (
            <div className="space-y-4 py-4">
              {/* Employee & Period Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-background/20 border border-white/10">
                <div>
                  <p className="text-xs text-muted-foreground">Employee</p>
                  <p className="font-semibold text-white">{selectedEmployeeData.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployeeData.position}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pay Period</p>
                  <p className="font-semibold text-white">{payslipPreviewData.startDate} to {payslipPreviewData.endDate}</p>
                </div>
              </div>

              {/* Earnings and Deductions side-by-side for better alignment */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Earnings Section */}
                <Card className="border border-white/10 bg-card">
                  <CardHeader>
                    <CardTitle className="text-base text-white">Earnings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.monthlyAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Basic Salary</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.basicSalary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Regular Overtime</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.regularOvertime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rest Day OT</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.restDayOt)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-[#AEAAAA]/20 font-semibold text-base text-green-400">
                      <span>GROSS Amount</span>
                      <span>{formatCurrency(payslipPreviewData.grossAmount)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Deductions Section */}
                <Card className="border border-white/10 bg-card">
                  <CardHeader>
                    <CardTitle className="text-base text-white">Deductions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {payslipPreviewData.governmentContributions.length > 0 && (
                      <div className="space-y-2 pb-3 border-b border-[#AEAAAA]/20">
                        <p className="text-xs font-semibold text-muted-foreground">Government Contributions</p>
                        {payslipPreviewData.governmentContributions.map((contrib) => (
                          <div key={contrib.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{contrib.name}</span>
                            <span className="font-semibold text-white">{formatCurrency(contrib.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">NET Taxable Salary</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.netTaxableSalary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payroll Tax</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.payrollTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Late/Undertime</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.lateUndertime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Company Loan/Cash Advance</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.companyLoanCashAdvance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payroll Allowance (Added)</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.payrollAllowance)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-[#AEAAAA]/20 font-semibold text-base text-orange-400">
                      <span>Total Deductions</span>
                      <span>{formatCurrency(payslipPreviewData.totalDeductionsAmount)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Net Pay */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-[#F27229]/20 to-[#F27229]/10 border-2 border-[#F27229]/40">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#F27229]">SALARY NET PAY</span>
                  <span className="text-3xl font-bold text-[#F27229]">{formatCurrency(payslipPreviewData.salaryNetPay)}</span>
                </div>
              </div>

              {/* Approvals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-lg bg-background/20 border border-white/10">
                <div>
                  <p className="text-xs text-muted-foreground">Prepared By</p>
                  <p className="text-sm font-semibold text-white">{payslipPreviewData.payslipFormPayload.prepared_by || 'Accounting'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {payslipPreviewData.payslipFormPayload.prepared_by_signature ? 'Signature attached' : 'No signature uploaded yet'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approved By</p>
                  <p className="text-sm font-semibold text-white">{payslipPreviewData.payslipFormPayload.approved_by || '-'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {payslipPreviewData.payslipFormPayload.approved_by_signature ? 'Signature attached' : 'No signature uploaded yet'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Top Management</p>
                  <p className="text-sm font-semibold text-white">{payslipPreviewData.payslipFormPayload.approved_by_top_management || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsPayslipPreviewOpen(false)}
              disabled={isProcessingPayroll}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayroll}
              disabled={!selectedEmployee || isProcessingPayroll}
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {isProcessingPayroll ? 'Processing...' : 'Confirm & Save to Database'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
