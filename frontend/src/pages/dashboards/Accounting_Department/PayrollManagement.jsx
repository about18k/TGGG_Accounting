import React, { useState, useEffect } from 'react';
import {
  getPayrollEmployees,
  getRecentPayroll,
  getDeductions,
  createDeduction,
  deleteDeduction,
  getAttendanceSummary,
  processPayroll,
  getEmployeeContributions,
  updateEmployeeContributions,
  deleteEmployeeContribution,
  notifyEmployeePayroll,
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
  SelectValue
} from '../../../components/ui/accounting-ui';
import {
  DollarSign,
  Settings,
  BarChart3,
  Calculator,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';

const formatDateInput = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const getDefaultPayrollRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const monthStart = new Date(year, month, 1);
  const midMonth = new Date(year, month, 15);
  const secondHalfStart = new Date(year, month, 16);
  const monthEnd = new Date(year, month + 1, 0);

  if (day <= 15) {
    return {
      startDate: formatDateInput(monthStart),
      endDate: formatDateInput(midMonth),
    };
  }

  return {
    startDate: formatDateInput(secondHalfStart),
    endDate: formatDateInput(monthEnd),
  };
};

const formatCurrency = (amount) => {
  const value = Number(amount || 0);
  return `₱${value.toFixed(2)}`;
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

const formatDisplayDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDateOnly = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};



const detectFrequencyLabel = (periodStart, periodEnd) => {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Bi-Weekly';
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (days <= 16) return 'Bi-Weekly';
  if (days <= 22) return 'Semi-Monthly';
  return 'Monthly';
};

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
});

export function PayrollManagement() {
  const defaultRange = getDefaultPayrollRange();
  const [isProcessPayrollOpen, setIsProcessPayrollOpen] = useState(false);
  const [isTaxDeductionsOpen, setIsTaxDeductionsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPayrollPeriod, setSelectedPayrollPeriod] = useState('29-13');
  const [dailySalary, setDailySalary] = useState('');
  const [employees, setEmployees] = useState([]);
  const [recentPayrollRecords, setRecentPayrollRecords] = useState([]);
  const [isLoadingPayrollData, setIsLoadingPayrollData] = useState(true);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
  const [isSavingDeduction, setIsSavingDeduction] = useState(false);
  const [isLoadingDeductions, setIsLoadingDeductions] = useState(false);
  const [payrollError, setPayrollError] = useState('');
  const [deductionError, setDeductionError] = useState('');
  const [deductions, setDeductions] = useState([]);
  const [newDeductionName, setNewDeductionName] = useState('');
  const [newDeductionRate, setNewDeductionRate] = useState('');
  const [newDeductionType, setNewDeductionType] = useState('percentage');

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
  const [isLoadingModalContributions, setIsLoadingModalContributions] = useState(false);
  const [isEditingModalContributions, setIsEditingModalContributions] = useState(false);
  const [isSavingModalContributions, setIsSavingModalContributions] = useState(false);

  // Payslip form values for Process Payroll modal
  const [payslipForm, setPayslipForm] = useState(createEmptyPayslipForm);
  const [isPayslipFormInitialized, setIsPayslipFormInitialized] = useState(false);

  // Filter Recent Payroll Records
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterPayrollPeriod, setFilterPayrollPeriod] = useState('all');

  // Attendance data for selected employee and period
  const [attendanceData, setAttendanceData] = useState(null);

  // Calculate payroll whenever inputs change
  const [calculations, setCalculations] = useState(null);

  const selectedEmployeeData = employees.find((e) => e.id === selectedEmployee);

  const fetchPayrollData = async () => {
    setIsLoadingPayrollData(true);
    setIsLoadingDeductions(true);
    setPayrollError('');
    setDeductionError('');
    try {
      const [employeesData, recentData, deductionsData] = await Promise.all([
        getPayrollEmployees(),
        getRecentPayroll(),
        getDeductions(),
      ]);

      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setRecentPayrollRecords(Array.isArray(recentData) ? recentData : []);
      setDeductions(Array.isArray(deductionsData) ? deductionsData : []);
    } catch (error) {
      console.error('Failed to load payroll data:', error);
      setPayrollError(error.response?.data?.error || 'Failed to load payroll data.');
      setDeductionError(error.response?.data?.error || 'Failed to load deductions.');
    } finally {
      setIsLoadingPayrollData(false);
      setIsLoadingDeductions(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, []);

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
  const filteredPayrollRecords = recentPayrollRecords.filter((record) => {
    if (filterEmployee !== 'all' && record.employee_id !== filterEmployee) {
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

  useEffect(() => {
    if (!selectedEmployee) {
      setAttendanceData(null);
      return;
    }

    const { startDate, endDate } = calculatePayrollDates();

    const fetchAttendanceSummary = async () => {
      setIsFetchingAttendance(true);
      try {
        const data = await getAttendanceSummary({
          employee_id: selectedEmployee,
          start_date: startDate,
          end_date: endDate,
        });
        setAttendanceData(data || null);
      } catch (error) {
        console.error('Failed to load attendance summary:', error);
        setAttendanceData(null);
      } finally {
        setIsFetchingAttendance(false);
      }
    };

    fetchAttendanceSummary();
  }, [selectedEmployee, selectedMonth, selectedYear, selectedPayrollPeriod]);

  useEffect(() => {
    if (!selectedEmployee) {
      setModalEmployeeContributions([]);
      return;
    }
    const employee = employees.find((item) => item.id === selectedEmployee);
    if (employee?.default_daily_rate) {
      setDailySalary(employee.default_daily_rate);
    }
    
    // Fetch employee contributions for the selected employee
    const fetchEmployeeContributions = async () => {
      setIsLoadingModalContributions(true);
      try {
        const data = await getEmployeeContributions(selectedEmployee);
        setModalEmployeeContributions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load employee contributions:', error);
        setModalEmployeeContributions([]);
      } finally {
        setIsLoadingModalContributions(false);
      }
    };
    
    fetchEmployeeContributions();
  }, [selectedEmployee, employees]);

  const getContributionTotal = (items = []) => (
    items.reduce((sum, item) => sum + toNumber(item.amount), 0)
  );

  const buildInitialPayslipForm = () => {
    const monthlyDefault = toNumber(selectedEmployeeData?.default_daily_rate) > 0
      ? toNumber(selectedEmployeeData.default_daily_rate) * 22
      : 0;

    const effectiveDailyRate = monthlyDefault > 0
      ? monthlyDefault / 22
      : toNumber(dailySalary);

    const daysPresent = toNumber(attendanceData?.totalDays);
    const lateCount = toNumber(attendanceData?.lateCount);
    const undertimeHours = toNumber(attendanceData?.undertimeHours ?? attendanceData?.undertime);

    const basicSalaryDefault = daysPresent > 0 && effectiveDailyRate > 0
      ? effectiveDailyRate * daysPresent
      : monthlyDefault;

    const lateDeduction = effectiveDailyRate > 0
      ? effectiveDailyRate * 0.1 * lateCount
      : 0;
    const undertimeDeduction = effectiveDailyRate > 0
      ? (effectiveDailyRate / 8) * undertimeHours
      : 0;

    const lateUndertimeDefault = lateDeduction + undertimeDeduction;
    const regularOvertimeDefault = 0;
    const restDayOtDefault = 0;
    const grossAmountDefault = basicSalaryDefault + regularOvertimeDefault + restDayOtDefault;
    const payrollTaxDefault = 0;
    const contributionsTotal = getContributionTotal(modalEmployeeContributions);
    const totalDeductionsDefault = lateUndertimeDefault + payrollTaxDefault + contributionsTotal;
    const payrollAllowanceDefault = 0;
    const companyLoanDefault = 0;
    const netSalaryDefault = grossAmountDefault + payrollAllowanceDefault - companyLoanDefault - totalDeductionsDefault;

    return {
      monthly: monthlyDefault.toFixed(2),
      basicSalary: basicSalaryDefault.toFixed(2),
      regularOvertime: regularOvertimeDefault.toFixed(2),
      lateUndertime: lateUndertimeDefault.toFixed(2),
      restDayOt: restDayOtDefault.toFixed(2),
      netTaxableSalary: grossAmountDefault.toFixed(2),
      payrollTax: payrollTaxDefault.toFixed(2),
      totalDeductions: totalDeductionsDefault.toFixed(2),
      grossAmount: grossAmountDefault.toFixed(2),
      payrollAllowance: payrollAllowanceDefault.toFixed(2),
      companyLoanCashAdvance: companyLoanDefault.toFixed(2),
      salaryNetPay: netSalaryDefault.toFixed(2),
    };
  };

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
    if (isFetchingAttendance || isLoadingModalContributions) return;

    const initialValues = buildInitialPayslipForm();
    setPayslipForm((prev) => ({
      ...prev,
      ...initialValues,
      preparedBy: prev.preparedBy || getStoredUserFullName() || 'Accounting Department',
    }));
    setIsPayslipFormInitialized(true);
  }, [
    selectedEmployee,
    selectedEmployeeData,
    attendanceData,
    dailySalary,
    modalEmployeeContributions,
    isFetchingAttendance,
    isLoadingModalContributions,
    isPayslipFormInitialized,
  ]);

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
    setIsSavingModalContributions(true);
    try {
      await Promise.all(
        modalEmployeeContributions.map((item) => updateEmployeeContributions(selectedEmployee, {
          name: item.name,
          amount: toNumber(item.amount),
        }))
      );
      setIsEditingModalContributions(false);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update contributions.');
    } finally {
      setIsSavingModalContributions(false);
    }
  };

  // Calculate payroll
  useEffect(() => {
    if (attendanceData && dailySalary && parseFloat(dailySalary) > 0) {
      const dailyRate = parseFloat(dailySalary);
      const workingDays = attendanceData.totalDays;

      // Base salary
      const baseSalary = dailyRate * workingDays;

      // Deductions
      const absenceDeduction = dailyRate * attendanceData.absences;
      const lateDeduction = (dailyRate * 0.1) * attendanceData.lateCount; // 10% per late
      const undertimeDeduction = dailyRate * (attendanceData.undertime || 0); // Undertime deduction

      const configuredDeductionItems = deductions.map((item) => {
        const rate = toNumber(item.rate);
        const computedAmount = item.type === 'percentage'
          ? (baseSalary * (rate / 100))
          : rate;
        return {
          id: item.id,
          name: item.name,
          category: item.category || 'other',
          type: item.type,
          rate,
          amount: Number(computedAmount.toFixed(2)),
        };
      });
      const configuredDeductionsTotal = configuredDeductionItems.reduce((sum, item) => sum + item.amount, 0);
      const taxAmount = configuredDeductionItems
        .filter((item) => item.category === 'tax')
        .reduce((sum, item) => sum + item.amount, 0);

      // Employee-specific contributions (government deductions)
      const employeeContributionItems = (modalEmployeeContributions || []).map((contrib) => ({
        id: contrib.id,
        name: contrib.name,
        category: 'contribution',
        type: 'fixed',
        amount: Number(toNumber(contrib.amount).toFixed(2)),
      }));
      const employeeContributionsTotal = employeeContributionItems.reduce((sum, item) => sum + item.amount, 0);

      // Combine all deduction items
      const allDeductionItems = [
        ...configuredDeductionItems,
        ...employeeContributionItems,
      ];

      const totalDeductions =
        absenceDeduction +
        lateDeduction +
        undertimeDeduction +
        configuredDeductionsTotal +
        employeeContributionsTotal;

      const netSalary = baseSalary - totalDeductions;

      setCalculations({
        baseSalary,
        grossSalary: baseSalary,
        deductions: {
          absences: absenceDeduction,
          late: lateDeduction,
          undertime: undertimeDeduction,
          tax: taxAmount,
        },
        deductionItems: allDeductionItems,
        configuredDeductionsTotal,
        employeeContributionsTotal,
        totalDeductions,
        netSalary,
      });
    } else {
      setCalculations(null);
    }
  }, [attendanceData, dailySalary, deductions, modalEmployeeContributions]);

  const handleProcessPayroll = () => {
    setIsProcessPayrollOpen(true);
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
      alert('Please select an employee first.');
      return;
    }
    if (!newContributionName.trim() || !newContributionAmount) {
      alert('Contribution name and amount are required.');
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
      setContributionError(message);
      alert(message);
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
      alert(message);
    }
  };

  const handleAddDeduction = async () => {
    const name = newDeductionName.trim();
    const rate = newDeductionRate;
    if (!name || rate === '') {
      alert('Deduction name and rate/amount are required.');
      return;
    }

    setIsSavingDeduction(true);
    setDeductionError('');
    try {
      const data = await createDeduction({
        name,
        type: newDeductionType,
        rate,
        category: newDeductionType === 'percentage' ? 'tax' : 'other',
      });
      setDeductions((prev) => [...prev, data]);
      setNewDeductionName('');
      setNewDeductionRate('');
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to save deduction.';
      setDeductionError(message);
      alert(message);
    } finally {
      setIsSavingDeduction(false);
    }
  };

  const handleDeleteDeduction = async (deductionId) => {
    const confirmed = window.confirm('Delete this deduction?');
    if (!confirmed) return;

    try {
      await deleteDeduction(deductionId);
      setDeductions((prev) => prev.filter((item) => item.id !== deductionId));
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete deduction.';
      setDeductionError(message);
      alert(message);
    }
  };

  const handleCloseModal = () => {
    setIsProcessPayrollOpen(false);
    setSelectedEmployee('');
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
    setSelectedPayrollPeriod('29-13');
    setDailySalary('');
    setAttendanceData(null);
    setCalculations(null);
    setModalEmployeeContributions([]);
    setIsEditingModalContributions(false);
    setPayslipForm(createEmptyPayslipForm());
    setIsPayslipFormInitialized(false);
  };

  const renderPayslipPrintDocument = (printWindow, payload) => {
    if (!printWindow) return;

    const slip = payload?.payslip || {};
    const details = payload?.payslip_details || slip?.payslip_details || {};

    const employeeName = slip.employee_name || selectedEmployeeData?.name || 'Employee';
    const designation = details.designation || slip.employee_role || selectedEmployeeData?.position || 'Employee';
    const periodStart = slip.period_start;
    const periodEnd = slip.period_end;
    const frequency = 'Monthly';

    const monthlyAmount = toNumber(details.monthly ?? 0);
    const basicSalary = toNumber(details.basic_salary ?? slip.base_salary ?? 0);
    const regularOvertime = toNumber(details.regular_overtime ?? slip.overtime_amount ?? 0);
    const lateUndertime = toNumber(details.late_undertime ?? 0);
    const restDayOt = toNumber(details.rest_day_ot ?? slip.bonus ?? 0);
    const netTaxableSalary = toNumber(details.net_taxable_salary ?? 0);
    const payrollTax = toNumber(details.payroll_tax ?? slip.tax ?? 0);
    const totalDeductions = toNumber(details.total_deductions ?? slip.deductions_total ?? 0);
    const grossAmount = toNumber(details.gross_amount ?? slip.gross_salary ?? 0);
    const payrollAllowance = toNumber(details.payroll_allowance ?? slip.allowances_total ?? 0);
    const companyLoanCashAdvance = toNumber(details.company_loan_cash_advance ?? 0);
    const salaryNetPay = toNumber(details.salary_net_pay ?? slip.net_salary ?? 0);

    const preparedBy = details.prepared_by || payslipForm.preparedBy || 'Accounting Department';
    const approvedByTopManagement = details.approved_by_top_management || '';
    const approvedBy = details.approved_by || '';

    const governmentContributions = Array.isArray(details.government_contributions)
      ? details.government_contributions
      : [];

    const contributionRowsHtml = governmentContributions.length
      ? governmentContributions
        .map((item) => {
          const amount = toNumber(item.amount);
          return `<div class="row"><span>${escapeHtml(item.name || 'Contribution')}</span><span>${escapeHtml(formatCurrency(amount))}</span></div>`;
        })
        .join('')
      : `<div class="row"><span>Government Contributions</span><span>${escapeHtml(formatCurrency(0))}</span></div>`;

    const logoUrl = `${window.location.origin}/formlogo.png`;
    const payDateText = `${formatDisplayDate(periodStart)} to ${formatDisplayDate(periodEnd)}`;

    const html = `
      <html>
        <head>
          <title>TGGG Payslip - ${escapeHtml(employeeName)}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #f2f2f2;
              font-family: Arial, sans-serif;
              color: #111;
              padding: 12px;
            }
            .sheet {
              width: 100%;
              max-width: 880px;
              margin: 0 auto;
              background: #fff;
              border: 2px solid #111;
            }
            .header-logo {
              width: 100%;
              display: block;
              border-bottom: 1px solid #111;
            }
            .bar {
              background: #f39b3a;
              color: #111;
              text-align: center;
              font-weight: 700;
              font-size: 18px;
              padding: 8px 10px;
              border-top: 1px solid #111;
              border-bottom: 1px solid #111;
            }
            .bar.small {
              font-size: 18px;
              padding: 6px 10px;
            }
            .meta {
              padding: 10px 14px 4px;
              font-size: 13px;
              display: grid;
              grid-template-columns: 160px 1fr 150px 120px;
              gap: 4px 10px;
            }
            .label { color: #333; }
            .value { font-weight: 700; }
            .section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              padding: 8px 14px 14px;
              border-bottom: 2px solid #111;
            }
            .col-title {
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 6px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              font-size: 14px;
              padding: 3px 0;
            }
            .row strong {
              font-size: 16px;
            }
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 60px;
              padding: 24px 20px 16px;
              font-size: 13px;
            }
            .sig-line {
              border-top: 1px solid #111;
              margin-top: 28px;
              padding-top: 6px;
              text-align: center;
            }
            .prepared {
              margin-bottom: 8px;
            }
            @media print {
              body { background: #fff; padding: 0; }
              .sheet { border: 2px solid #111; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <img class="header-logo" src="${escapeHtml(logoUrl)}" alt="Triple G Logo" />
            <div class="bar small">TGGG PAYSLIP ${escapeHtml(payDateText)}</div>

            <div class="meta">
              <div class="label">Employee Name:</div>
              <div class="value">${escapeHtml(employeeName)}</div>
              <div class="label">Monthly:</div>
              <div class="value">${escapeHtml(formatCurrency(monthlyAmount))}</div>

              <div class="label">Designation:</div>
              <div class="value">${escapeHtml(designation)}</div>
              <div class="label">Pay Frequency:</div>
              <div class="value">${escapeHtml(frequency)}</div>
            </div>

            <div class="section">
              <div>
                <div class="col-title">Earnings</div>
                <div class="row"><span>Basic Salary</span><span>${escapeHtml(formatCurrency(baseSalary))}</span></div>
                <div class="row"><span>Regular Overtime</span><span>${escapeHtml(formatCurrency(regularOvertime))}</span></div>
                <div class="row"><span>Late/Undertime</span><span>${escapeHtml(formatCurrency(lateUndertime))}</span></div>
                <div class="row"><span>Rest Day</span><span></span></div>
                <div class="row"><span>Rest Day OT</span><span>${escapeHtml(formatCurrency(restDayOt))}</span></div>
                <div class="row"><span>Holiday</span><span></span></div>
                <div class="row" style="margin-top: 8px;"><strong>GROSS Amount</strong><strong>${escapeHtml(formatCurrency(grossAmount))}</strong></div>
              </div>

              <div>
                <div class="col-title">Deductions</div>
                ${contributionRowsHtml}
                <div class="row"><span>NET Taxable Salary</span><span>${escapeHtml(formatCurrency(netTaxableSalary))}</span></div>
                <div class="row"><span>Payroll Tax</span><span>${escapeHtml(formatCurrency(payrollTax))}</span></div>
                <div class="row" style="margin-top: 8px;"><strong>Total Deductions</strong><strong>${escapeHtml(formatCurrency(totalDeductions))}</strong></div>
                <div class="row"><span>Payroll Allowance</span><span>${escapeHtml(formatCurrency(payrollAllowance))}</span></div>
                <div class="row"><span>Company Loan/Cash Advance</span><span>${escapeHtml(formatCurrency(companyLoanCashAdvance))}</span></div>
              </div>
            </div>

            <div class="bar">SALARY NET PAY ${escapeHtml(formatCurrency(salaryNetPay))}</div>

            <div class="signatures">
              <div>
                <div class="prepared">Prepared By (Accounting Department):</div>
                <div class="sig-line">
                  ${escapeHtml(preparedBy)}
                </div>
                <div class="prepared" style="margin-top: 16px;">Approved By:</div>
                <div class="sig-line">${escapeHtml(approvedBy)}</div>
              </div>
              <div>
                <div class="prepared">Approved By (Top Management):</div>
                <div class="sig-line">
                  ${escapeHtml(approvedByTopManagement)}
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function () {
              setTimeout(function () { window.print(); }, 350);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleGeneratePayslip = async () => {
    if (!selectedEmployee) {
      alert('Please select an employee.');
      return;
    }

    const { startDate, endDate } = calculatePayrollDates();

    const getFieldValueOrFallback = (value, fallback) => {
      if (value === '' || value === null || value === undefined) {
        return fallback;
      }
      return toNumber(value);
    };

    const basicSalary = getFieldValueOrFallback(payslipForm.basicSalary, 0);
    const regularOvertime = getFieldValueOrFallback(payslipForm.regularOvertime, 0);
    const lateUndertime = getFieldValueOrFallback(payslipForm.lateUndertime, 0);
    const restDayOt = getFieldValueOrFallback(payslipForm.restDayOt, 0);
    const payrollTax = getFieldValueOrFallback(payslipForm.payrollTax, 0);
    const payrollAllowance = getFieldValueOrFallback(payslipForm.payrollAllowance, 0);
    const companyLoanCashAdvance = getFieldValueOrFallback(payslipForm.companyLoanCashAdvance, 0);
    const governmentContributionsTotal = getContributionTotal(modalEmployeeContributions);

    const grossAmountComputed = basicSalary + regularOvertime + restDayOt;
    const grossAmount = getFieldValueOrFallback(payslipForm.grossAmount, grossAmountComputed);
    const netTaxableSalary = getFieldValueOrFallback(payslipForm.netTaxableSalary, grossAmount);

    const totalDeductionsComputed = lateUndertime + payrollTax + governmentContributionsTotal;
    const totalDeductionsAmount = getFieldValueOrFallback(payslipForm.totalDeductions, totalDeductionsComputed);

    const salaryNetPayComputed = grossAmount + payrollAllowance - companyLoanCashAdvance - totalDeductionsAmount;
    const salaryNetPay = getFieldValueOrFallback(payslipForm.salaryNetPay, salaryNetPayComputed);

    const monthlyAmount = getFieldValueOrFallback(payslipForm.monthly, grossAmount);
    const attendanceDays = toNumber(attendanceData?.totalDays);
    const derivedDailySalary = attendanceDays > 0 ? (basicSalary / attendanceDays) : 0;
    const dailySalaryForPayload = dailySalary || (derivedDailySalary > 0 ? derivedDailySalary.toFixed(2) : null);

    const governmentContributions = modalEmployeeContributions.map((item) => ({
      id: item.id,
      name: item.name,
      amount: toNumber(item.amount),
    }));

    const payslipFormPayload = {
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
      prepared_by: (payslipForm.preparedBy || '').trim(),
      approved_by_top_management: (payslipForm.approvedByTopManagement || '').trim(),
      approved_by: (payslipForm.approvedBy || '').trim(),
      government_contributions: governmentContributions,
    };

    setIsProcessingPayroll(true);
    try {
      const responseData = await processPayroll({
        employee_id: selectedEmployee,
        period_start: startDate,
        period_end: endDate,
        daily_salary: dailySalaryForPayload,
        payslip_form: payslipFormPayload,
      });

      const name = responseData?.payslip?.employee_name || selectedEmployeeData?.name || 'Employee';
      const netSalary = responseData?.payslip?.net_salary || salaryNetPay;

      let whatsappStatusMessage = 'WhatsApp notification was queued successfully.';
      try {
        const notifyResponse = await notifyEmployeePayroll(selectedEmployee, {
          period_start: startDate,
          period_end: endDate,
          payslip_preview: {
            employee_name: name,
            designation: selectedEmployeeData?.position || '',
            gross_amount: grossAmount,
            total_deductions: totalDeductionsAmount,
            salary_net_pay: salaryNetPay,
          },
        });

        if (notifyResponse?.message) {
          whatsappStatusMessage = notifyResponse.message;
        }
      } catch (whatsappError) {
        console.warn('WhatsApp notification failed:', whatsappError);
        whatsappStatusMessage = `Payroll saved, but WhatsApp notification failed: ${
          whatsappError.response?.data?.message || whatsappError.response?.data?.error || whatsappError.message
        }`;
      }

      alert(`Payslip processed successfully for ${name}\nNet Salary: ${formatCurrency(netSalary)}\n\n${whatsappStatusMessage}`);
      await fetchPayrollData();
      handleCloseModal();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to process payroll.');
    } finally {
      setIsProcessingPayroll(false);
    }
  };

  // Calculate analytics
  const totalEmployees = employees.length;
  const totalPayroll = recentPayrollRecords.reduce((sum, record) => sum + toNumber(record.net_salary), 0);
  const averageSalary = totalEmployees > 0 ? totalPayroll / totalEmployees : 0;
  const totalDeductions = recentPayrollRecords.reduce((sum, record) => {
    const baseSalary = toNumber(record.base_salary);
    const sss = baseSalary * 0.045;
    const phic = baseSalary * 0.02;
    const hdmf = 100;
    const tax = toNumber(record.tax);
    return sum + (sss + phic + hdmf + tax);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Payroll Management</h1>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <p className="text-3xl font-bold mt-2">{totalEmployees}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Payroll Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Payroll</p>
                <p className="text-3xl font-bold mt-2 text-green-500">{formatCurrency(totalPayroll)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Salary Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Salary</p>
                <p className="text-3xl font-bold mt-2 text-purple-500">{formatCurrency(averageSalary)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Deductions Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500/10 to-orange-600/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Deductions</p>
                <p className="text-3xl font-bold mt-2 text-orange-500">{formatCurrency(totalDeductions)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Actions */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Payroll Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={handleProcessPayroll}
            >
              <DollarSign className="w-6 h-6" />
              Process Payroll
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={handleOpenTaxDeductions}
            >
              <Settings className="w-6 h-6" />
              Government Contributions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payroll Records */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Payroll Records</span>
            <span className="text-sm font-normal text-muted-foreground">({filteredPayrollRecords.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-[#021B2C]/30 border border-[#AEAAAA]/10">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#AEAAAA]">Filter by Employee</Label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger className="bg-[#021B2C] border-[#AEAAAA]/20 text-white h-9">
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
              <Label className="text-xs text-[#AEAAAA]">Filter by Period</Label>
              <Select value={filterPayrollPeriod} onValueChange={setFilterPayrollPeriod}>
                <SelectTrigger className="bg-[#021B2C] border-[#AEAAAA]/20 text-white h-9">
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
              {filteredPayrollRecords.map((record) => (
                <div key={record.id} className="flex flex-col p-4 rounded-lg border border-border/50 bg-card/40 hover:bg-card/60 transition-colors cursor-pointer">
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                <SelectTrigger className="bg-[#021B2C] border-[#AEAAAA]/20 text-white">
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
                  <div className="p-4 rounded-lg bg-[#021B2C]/30 border border-[#AEAAAA]/10">
                    <h3 className="text-sm font-semibold text-white mb-4">Add Contribution</h3>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#AEAAAA]">Contribution Type</Label>
                        <Input
                          placeholder="e.g., SSS, PhilHealth, Pag-IBIG"
                          value={newContributionName}
                          onChange={(e) => setNewContributionName(e.target.value)}
                          className="bg-[#021B2C] border-[#AEAAAA]/20 text-white h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#AEAAAA]">Amount (₱)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={newContributionAmount}
                          onChange={(e) => setNewContributionAmount(e.target.value)}
                          className="bg-[#021B2C] border-[#AEAAAA]/20 text-white h-9"
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
                  <div className="p-4 rounded-lg bg-[#021B2C]/30 border border-[#AEAAAA]/10">
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
                              <p className="text-xs text-[#AEAAAA]">₱{parseFloat(contribution.amount).toFixed(2)}</p>
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
                <SelectTrigger className="bg-[#021B2C] border-[#AEAAAA]/20 text-white">
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
                  <SelectTrigger className="bg-[#021B2C] border-[#AEAAAA]/20 text-white">
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
                  <SelectTrigger className="bg-[#021B2C] border-[#AEAAAA]/20 text-white">
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
                  <SelectTrigger className="bg-[#021B2C] border-[#AEAAAA]/20 text-white">
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
                  className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyAmount">Monthly</Label>
                <Input
                  id="monthlyAmount"
                  type="number"
                  value={payslipForm.monthly}
                  onChange={(e) => handlePayslipFieldChange('monthly', e.target.value)}
                  className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <Card className="border border-[#AEAAAA]/20 bg-[#002035]">
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
                    className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
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
                    className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
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
                    className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Based on attendance totals: Late {toNumber(attendanceData?.lateCount)} | Undertime Hours {toNumber(attendanceData?.undertimeHours ?? attendanceData?.undertime).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Rest Day</Label>
                  <Input
                    value=""
                    readOnly
                    placeholder=""
                    className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restDayOt">Rest Day OT</Label>
                  <Input
                    id="restDayOt"
                    type="number"
                    value={payslipForm.restDayOt}
                    onChange={(e) => handlePayslipFieldChange('restDayOt', e.target.value)}
                    className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Holiday</Label>
                  <Input
                    value=""
                    readOnly
                    placeholder=""
                    className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-[#AEAAAA]/20 bg-[#002035]">
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
                              className="bg-[#021B2C] border-[#AEAAAA]/20 text-white h-9"
                            />
                          ) : (
                            <p className="text-sm font-medium text-right">₱{toNumber(item.amount).toFixed(2)}</p>
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
                      value={payslipForm.netTaxableSalary}
                      onChange={(e) => handlePayslipFieldChange('netTaxableSalary', e.target.value)}
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payrollTax">Payroll Tax</Label>
                    <Input
                      id="payrollTax"
                      type="number"
                      value={payslipForm.payrollTax}
                      onChange={(e) => handlePayslipFieldChange('payrollTax', e.target.value)}
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalDeductions">Total Deductions</Label>
                    <Input
                      id="totalDeductions"
                      type="number"
                      value={payslipForm.totalDeductions}
                      onChange={(e) => handlePayslipFieldChange('totalDeductions', e.target.value)}
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-[#AEAAAA]/20 bg-[#002035]">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grossAmount">GROSS Amount</Label>
                    <Input
                      id="grossAmount"
                      type="number"
                      value={payslipForm.grossAmount}
                      onChange={(e) => handlePayslipFieldChange('grossAmount', e.target.value)}
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payrollAllowance">Payroll Allowance</Label>
                    <Input
                      id="payrollAllowance"
                      type="number"
                      value={payslipForm.payrollAllowance}
                      onChange={(e) => handlePayslipFieldChange('payrollAllowance', e.target.value)}
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyLoanCashAdvance">Company Loan/Cash Advance</Label>
                    <Input
                      id="companyLoanCashAdvance"
                      type="number"
                      value={payslipForm.companyLoanCashAdvance}
                      onChange={(e) => handlePayslipFieldChange('companyLoanCashAdvance', e.target.value)}
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
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
                    value={payslipForm.salaryNetPay}
                    onChange={(e) => handlePayslipFieldChange('salaryNetPay', e.target.value)}
                    className="bg-[#021B2C] border-[#F27229]/40 text-[#F27229] font-semibold"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preparedBy">Prepared By (Accounting Department)</Label>
                    <Input
                      id="preparedBy"
                      value={payslipForm.preparedBy}
                      readOnly
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approvedByTopManagement">Approved By (Top Management)</Label>
                    <Input
                      id="approvedByTopManagement"
                      value={payslipForm.approvedByTopManagement}
                      onChange={(e) => handlePayslipFieldChange('approvedByTopManagement', e.target.value)}
                      placeholder=""
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approvedBy">Approved By</Label>
                    <Input
                      id="approvedBy"
                      value={payslipForm.approvedBy}
                      onChange={(e) => handlePayslipFieldChange('approvedBy', e.target.value)}
                      placeholder=""
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleGeneratePayslip}
              disabled={!selectedEmployee || isProcessingPayroll}
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {isProcessingPayroll ? 'Processing...' : 'Process Payroll'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
