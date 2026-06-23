import { useState, useEffect, useMemo, useCallback } from 'react';
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
export const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCurrency = (amount) => {
  const value = Number(amount || 0);
  return pesoFormatter.format(value);
};

export const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const formatDisplayDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

export const getDateOnly = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export const cloneContributions = (items = []) => items.map((item) => ({ ...item }));

export const normalizeContributionAmount = (value) => Number(toNumber(value).toFixed(2));

export const getStoredUserFullName = () => {
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

export const createEmptyPayslipForm = () => ({
  monthly: '',
  basicSalary: '',
  regularOvertime: '',
  lateUndertime: '',
  restDay: '',
  restDayOt: '',
  holiday: '',
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

export function usePayroll() {
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

  const [selectedContributionEmployee, setSelectedContributionEmployee] = useState('');
  const [employeeContributions, setEmployeeContributions] = useState([]);
  const [isLoadingEmployeeContributions, setIsLoadingEmployeeContributions] = useState(false);
  const [isSavingEmployeeContribution, setIsSavingEmployeeContribution] = useState(false);
  const [contributionError, setContributionError] = useState('');
  const [newContributionName, setNewContributionName] = useState('');
  const [newContributionAmount, setNewContributionAmount] = useState('');

  const [modalEmployeeContributions, setModalEmployeeContributions] = useState([]);
  const [originalModalContributions, setOriginalModalContributions] = useState([]);
  const [isLoadingModalContributions, setIsLoadingModalContributions] = useState(false);
  const [isEditingModalContributions, setIsEditingModalContributions] = useState(false);
  const [isSavingModalContributions, setIsSavingModalContributions] = useState(false);

  const [payslipForm, setPayslipForm] = useState(createEmptyPayslipForm);
  const [isPayslipFormInitialized, setIsPayslipFormInitialized] = useState(false);

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
    () => employees.find((employee) => ['ceo'].includes(String(employee.role || '').toLowerCase())),
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

  useEffect(() => {
    return () => {
      if (payslipImagePreviewUrl) {
        URL.revokeObjectURL(payslipImagePreviewUrl);
      }
    };
  }, [payslipImagePreviewUrl]);

  const calculatePayrollDates = () => {
    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10);

    let startDate, endDate;
    if (selectedPayrollPeriod === '29-13') {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      startDate = new Date(prevYear, prevMonth - 1, 29);
      endDate = new Date(year, month - 1, 13);
    } else {
      startDate = new Date(year, month - 1, 14);
      endDate = new Date(year, month - 1, 28);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const getPayrollPeriodLabel = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 'Unknown';
    const startDate = new Date(startDateStr);
    const startDay = startDate.getDate();
    return startDay >= 14 && startDay <= 28 ? '14 - 28' : '29 - 13';
  };

  const filteredPayrollRecords = useMemo(() => {
    return recentPayrollRecords.filter((record) => {
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
    });
  }, [recentPayrollRecords, filterEmployee, filterPayrollPeriod]);

  useEffect(() => {
    if (!selectedEmployee) {
      setModalEmployeeContributions([]);
      setOriginalModalContributions([]);
      return;
    }

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

  const getContributionTotal = (items = []) => {
    return items.reduce((sum, item) => sum + toNumber(item.amount), 0);
  };

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
    if (!selectedEmployee) return 'Please select an employee first.';

    const { startDate, endDate } = calculatePayrollDates();
    if (!startDate || !endDate) return 'Payroll dates are required.';

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

  const buildInitialPayslipForm = useCallback(() => {
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
  }, [selectedEmployeeData, currentAccountingUser, topManagementUser, modalEmployeeContributions]);

  const computePayslipValues = (formValues = payslipForm) => {
    const basicSalary = toNumber(formValues.basicSalary);
    const regularOvertime = toNumber(formValues.regularOvertime);
    const lateUndertime = toNumber(formValues.lateUndertime);
    const restDay = toNumber(formValues.restDay);
    const restDayOt = toNumber(formValues.restDayOt);
    const holiday = toNumber(formValues.holiday);
    const payrollAllowance = isSelectedEmployeeAllowanceEligible
      ? toNumber(formValues.payrollAllowance)
      : 0;
    const companyLoanCashAdvance = toNumber(formValues.companyLoanCashAdvance);
    const governmentContributionsTotal = getContributionTotal(modalEmployeeContributions);

    const grossAmount = basicSalary + regularOvertime + restDay + restDayOt + holiday;
    const netTaxableSalary = Math.max(0, grossAmount - lateUndertime - governmentContributionsTotal);
    const payrollTax = 0;
    const totalDeductions = governmentContributionsTotal + payrollTax;
    const salaryNetPay = Math.max(0, netTaxableSalary + payrollAllowance - companyLoanCashAdvance);

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
      restDay,
      restDayOt,
      holiday,
    };
  };

  const computedPayslipValues = useMemo(
    () => computePayslipValues(),
    [
      payslipForm.basicSalary,
      payslipForm.regularOvertime,
      payslipForm.lateUndertime,
      payslipForm.restDay,
      payslipForm.restDayOt,
      payslipForm.holiday,
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
    buildInitialPayslipForm,
  ]);

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
      item.id === contributionId ? { ...item, amount: value } : item
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

  const handleProcessPayroll = () => setIsProcessPayrollOpen(true);

  const handleOpenAllowanceEligibility = async () => {
    setIsAllowanceEligibilityOpen(true);
    try {
      const rows = await getPayrollAllowanceEligibility({ force: true });
      const eligibleIds = Array.isArray(rows)
        ? rows.filter((row) => Boolean(row?.payroll_allowance_eligible)).map((row) => String(row.id))
        : [];
      setAllowanceEligibleEmployeeIds(eligibleIds);
    } catch (error) {
      toast.error('Load Failed', {
        description: error.response?.data?.error || 'Failed to load allowance eligibility list.',
      });
      setAllowanceEligibleEmployeeIds(
        employees.filter((employee) => Boolean(employee.payroll_allowance_eligible)).map((employee) => String(employee.id))
      );
    }
  };

  const handleToggleAllowanceEligibility = (employeeId, isEnabled) => {
    setAllowanceEligibleEmployeeIds((prev) => {
      const id = String(employeeId);
      const existing = new Set(prev.map((item) => String(item)));
      if (isEnabled) existing.add(id);
      else existing.delete(id);
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
      toast.error('Validation Error', { description: 'Please select an employee first.' });
      return;
    }
    if (!newContributionName.trim() || !newContributionAmount) {
      toast.error('Validation Error', { description: 'Contribution name and amount are required.' });
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
      toast.success('Contribution Added', { description: 'Employee contribution added successfully.' });
    } catch (error) {
      toast.error('Update Failed', { description: error.response?.data?.error || 'Failed to save contribution.' });
    } finally {
      setIsSavingEmployeeContribution(false);
    }
  };

  const handleDeleteEmployeeContribution = async (contributionId) => {
    if (!selectedContributionEmployee) return;

    toast('Delete Contribution?', {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await deleteEmployeeContribution(selectedContributionEmployee, contributionId);
            setEmployeeContributions((prev) => prev.filter((item) => item.id !== contributionId));
            toast.success('Contribution Deleted', { description: 'Employee contribution deleted successfully.' });
          } catch (error) {
            toast.error('Delete Failed', { description: error.response?.data?.error || 'Failed to delete contribution.' });
          }
        },
      },
      cancel: { label: 'Cancel', onClick: () => toast.dismiss() },
    });
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
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return '';
    });
  };

  const handleViewPayslipImage = async (record) => {
    if (!record?.id) return;
    setLoadingPayslipImageId(record.id);
    try {
      const imageBlob = await getPayrollPayslipImage(record.id);
      if (!imageBlob || imageBlob.size === 0) throw new Error('Payslip image is empty.');
      const objectUrl = URL.createObjectURL(imageBlob);
      setPayslipImagePreviewUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return objectUrl;
      });
      setSelectedPayslipRecord(record);
      setIsPayslipImageViewerOpen(true);
    } catch (error) {
      const statusCode = error?.response?.status;
      const message = statusCode === 404 ? 'Payslip image not found for this payroll record.' : statusCode === 403 ? 'You are not authorized to view this payslip image.' : 'Unable to load payslip image right now.';
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
    const restDay = computedPayslipValues.restDay;
    const restDayOt = computedPayslipValues.restDayOt;
    const holiday = computedPayslipValues.holiday;
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

    const preparedBy = (payslipForm.preparedBy || currentAccountingUser?.name || getStoredUserFullName() || 'Accounting Department').trim();
    const approvedByTopManagement = (topManagementUser?.name || payslipForm.approvedByTopManagement || '').trim();
    const approvedBy = (topManagementUser?.name || payslipForm.approvedBy || approvedByTopManagement || '').trim();
    const preparedBySignature = (payslipForm.preparedBySignature || currentAccountingUser?.signature_image || '').trim();
    const approvedBySignature = (payslipForm.approvedBySignature || topManagementUser?.signature_image || '').trim();

    return {
      startDate,
      endDate,
      basicSalary,
      regularOvertime,
      lateUndertime,
      restDay,
      restDayOt,
      holiday,
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
        rest_day: restDay,
        rest_day_ot: restDayOt,
        holiday,
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

      await processPayroll(payload);
      toast.success('Process payroll successful.');
      await fetchPayrollData();
      setIsPayslipPreviewOpen(false);
      handleCloseModal();
    } catch (error) {
      toast.error('Payroll Processing Failed', {
        description: error.response?.data?.error || error.message || 'Unknown error',
      });
    } finally {
      setIsProcessingPayroll(false);
    }
  };

  const payrollAnalytics = useMemo(() => {
    const totalEmployeesCount = employees.length;
    const totalPayrollAmount = recentPayrollRecords.reduce((sum, record) => sum + toNumber(record.net_salary), 0);
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

  return {
    isProcessPayrollOpen, setIsProcessPayrollOpen,
    isTaxDeductionsOpen, setIsTaxDeductionsOpen,
    isAllowanceEligibilityOpen, setIsAllowanceEligibilityOpen,
    isPayslipPreviewOpen, setIsPayslipPreviewOpen,
    payslipPreviewData, setPayslipPreviewData,
    selectedEmployee, setSelectedEmployee,
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,
    selectedPayrollPeriod, setSelectedPayrollPeriod,
    employees, setEmployees,
    recentPayrollRecords, setRecentPayrollRecords,
    isLoadingPayrollData, setIsLoadingPayrollData,
    isProcessingPayroll, setIsProcessingPayroll,
    loadingPayslipImageId, setLoadingPayslipImageId,
    isPayslipImageViewerOpen, setIsPayslipImageViewerOpen,
    payslipImagePreviewUrl, setPayslipImagePreviewUrl,
    selectedPayslipRecord, setSelectedPayslipRecord,
    payrollError, setPayrollError,
    allowanceEligibleEmployeeIds, setAllowanceEligibleEmployeeIds,
    isSavingAllowanceEligibility, setIsSavingAllowanceEligibility,
    selectedContributionEmployee, setSelectedContributionEmployee,
    employeeContributions, setEmployeeContributions,
    isLoadingEmployeeContributions, setIsLoadingEmployeeContributions,
    isSavingEmployeeContribution, setIsSavingEmployeeContribution,
    contributionError, setContributionError,
    newContributionName, setNewContributionName,
    newContributionAmount, setNewContributionAmount,
    modalEmployeeContributions, setModalEmployeeContributions,
    originalModalContributions, setOriginalModalContributions,
    isLoadingModalContributions, setIsLoadingModalContributions,
    isEditingModalContributions, setIsEditingModalContributions,
    isSavingModalContributions, setIsSavingModalContributions,
    payslipForm, setPayslipForm,
    filterEmployee, setFilterEmployee,
    filterPayrollPeriod, setFilterPayrollPeriod,
    selectedEmployeeData,
    currentAccountingUser,
    topManagementUser,
    isSelectedEmployeeAllowanceEligible,
    filteredPayrollRecords,
    payrollAnalytics,
    computedPayslipValues,
    handlePayslipFieldChange,
    handleModalContributionAmountChange,
    handleSaveModalContributions,
    handleProcessPayroll,
    handleOpenAllowanceEligibility,
    handleToggleAllowanceEligibility,
    handleSaveAllowanceEligibility,
    handleOpenTaxDeductions,
    handleSelectContributionEmployee,
    handleAddEmployeeContribution,
    handleDeleteEmployeeContribution,
    handleCloseModal,
    closePayslipImageViewer,
    handleViewPayslipImage,
    handlePreviewPayslip,
    handleConfirmPayroll,
  };
}
