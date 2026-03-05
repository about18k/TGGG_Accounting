import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import {
  getPayrollEmployees,
  getRecentPayroll,
  getDeductions,
  createDeduction,
  deleteDeduction,
  getAttendanceSummary,
  processPayroll,
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
  Download,
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

const toCsvCell = (value) => {
  if (value === null || value === undefined) return '""';
  const escaped = String(value).replace(/"/g, '""');
  return `"${escaped}"`;
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

export function PayrollManagement() {
  const defaultRange = getDefaultPayrollRange();
  const [isProcessPayrollOpen, setIsProcessPayrollOpen] = useState(false);
  const [isExportReportOpen, setIsExportReportOpen] = useState(false);
  const [isTaxDeductionsOpen, setIsTaxDeductionsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedStartDate, setSelectedStartDate] = useState(defaultRange.startDate);
  const [selectedEndDate, setSelectedEndDate] = useState(defaultRange.endDate);
  const [selectedExportStartDate, setSelectedExportStartDate] = useState(formatDateInput(new Date()));
  const [selectedExportEndDate, setSelectedExportEndDate] = useState(formatDateInput(new Date()));
  const [dailySalary, setDailySalary] = useState('');
  const [employees, setEmployees] = useState([]);
  const [recentPayrollRecords, setRecentPayrollRecords] = useState([]);
  const [exportPayrollRecords, setExportPayrollRecords] = useState([]);
  const [isLoadingPayrollData, setIsLoadingPayrollData] = useState(true);
  const [isLoadingExportRecords, setIsLoadingExportRecords] = useState(false);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
  const [isSavingDeduction, setIsSavingDeduction] = useState(false);
  const [isLoadingDeductions, setIsLoadingDeductions] = useState(false);
  const [payrollError, setPayrollError] = useState('');
  const [exportReportError, setExportReportError] = useState('');
  const [deductionError, setDeductionError] = useState('');
  const [deductions, setDeductions] = useState([]);
  const [newDeductionName, setNewDeductionName] = useState('');
  const [newDeductionRate, setNewDeductionRate] = useState('');
  const [newDeductionType, setNewDeductionType] = useState('percentage');

  // Attendance data for selected employee and period
  const [attendanceData, setAttendanceData] = useState(null);

  // Calculate payroll whenever inputs change
  const [calculations, setCalculations] = useState(null);

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

  useEffect(() => {
    if (!isExportReportOpen) {
      setExportPayrollRecords([]);
      setExportReportError('');
      return;
    }

    if (!selectedExportStartDate || !selectedExportEndDate) {
      setExportPayrollRecords([]);
      return;
    }

    let isCancelled = false;

    const fetchExportRecords = async () => {
      setIsLoadingExportRecords(true);
      setExportReportError('');
      try {
        const records = await getRecentPayroll({
          created_from: selectedExportStartDate,
          created_to: selectedExportEndDate,
          limit: 1000,
        });
        if (isCancelled) return;
        setExportPayrollRecords(Array.isArray(records) ? records : []);
      } catch (error) {
        if (isCancelled) return;
        setExportReportError(error.response?.data?.error || 'Failed to load payroll records for export.');
        setExportPayrollRecords([]);
      } finally {
        if (!isCancelled) {
          setIsLoadingExportRecords(false);
        }
      }
    };

    fetchExportRecords();

    return () => {
      isCancelled = true;
    };
  }, [isExportReportOpen, selectedExportStartDate, selectedExportEndDate]);

  useEffect(() => {
    if (!selectedEmployee || !selectedStartDate || !selectedEndDate) {
      setAttendanceData(null);
      return;
    }

    if (selectedEndDate < selectedStartDate) {
      setAttendanceData(null);
      return;
    }

    const fetchAttendanceSummary = async () => {
      setIsFetchingAttendance(true);
      try {
        const data = await getAttendanceSummary({
          employee_id: selectedEmployee,
          start_date: selectedStartDate,
          end_date: selectedEndDate,
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
  }, [selectedEmployee, selectedStartDate, selectedEndDate]);

  useEffect(() => {
    if (!selectedEmployee) return;
    const employee = employees.find((item) => item.id === selectedEmployee);
    if (employee?.default_daily_rate) {
      setDailySalary(employee.default_daily_rate);
    }
  }, [selectedEmployee, employees]);

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
      const leaveDeduction = dailyRate * attendanceData.leaveCount;

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

      const totalDeductions =
        absenceDeduction +
        lateDeduction +
        leaveDeduction +
        configuredDeductionsTotal;

      const netSalary = baseSalary - totalDeductions;

      setCalculations({
        baseSalary,
        grossSalary: baseSalary,
        deductions: {
          absences: absenceDeduction,
          late: lateDeduction,
          leave: leaveDeduction,
          tax: taxAmount,
        },
        deductionItems: configuredDeductionItems,
        configuredDeductionsTotal,
        totalDeductions,
        netSalary,
      });
    } else {
      setCalculations(null);
    }
  }, [attendanceData, dailySalary, deductions]);

  const handleProcessPayroll = () => {
    setIsProcessPayrollOpen(true);
  };

  const handleOpenExportReport = () => {
    const mostRecentCreatedDate = getDateOnly(recentPayrollRecords[0]?.created_at);
    if (mostRecentCreatedDate) {
      setSelectedExportStartDate(mostRecentCreatedDate);
      setSelectedExportEndDate(mostRecentCreatedDate);
    }
    setExportReportError('');
    setIsExportReportOpen(true);
  };

  const handleOpenTaxDeductions = async () => {
    setIsTaxDeductionsOpen(true);
    try {
      setIsLoadingDeductions(true);
      setDeductionError('');
      const data = await getDeductions();
      setDeductions(Array.isArray(data) ? data : []);
    } catch (error) {
      setDeductionError(error.response?.data?.error || 'Failed to load deductions.');
    } finally {
      setIsLoadingDeductions(false);
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
    setSelectedStartDate(defaultRange.startDate);
    setSelectedEndDate(defaultRange.endDate);
    setDailySalary('');
    setAttendanceData(null);
    setCalculations(null);
  };

  const renderPayslipPrintDocument = (printWindow, payload) => {
    if (!printWindow) return;

    const slip = payload?.payslip || {};
    const calc = payload?.calculation || {};
    const deductionItems = Array.isArray(calc?.deduction_items) ? calc.deduction_items : [];

    const employeeName = slip.employee_name || selectedEmployeeData?.name || 'Employee';
    const designation = slip.employee_role || selectedEmployeeData?.position || 'Employee';
    const periodStart = slip.period_start || selectedStartDate;
    const periodEnd = slip.period_end || selectedEndDate;
    const frequency = detectFrequencyLabel(periodStart, periodEnd);

    const baseSalary = Number(slip.base_salary ?? calc.base_salary ?? 0);
    const overtimeAmount = Number(slip.overtime_amount ?? 0);
    const grossSalary = Number(slip.gross_salary ?? 0);
    const netSalary = Number(slip.net_salary ?? calc.net_salary ?? 0);
    const totalDeductions = Number(slip.deductions_total ?? calc.total_deductions ?? 0);
    const deductionRowsHtml = deductionItems.length
      ? deductionItems
        .map((item) => {
          const amount = toNumber(item.amount);
          if (amount <= 0) return '';
          return `<div class="row"><span>${escapeHtml(item.name || 'Deduction')}</span><span>${escapeHtml(formatCurrency(amount))}</span></div>`;
        })
        .join('')
      : `<div class="row"><span>No configured deductions</span><span>${escapeHtml(formatCurrency(0))}</span></div>`;

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
              <div class="label">Pay Frequency:</div>
              <div class="value">${escapeHtml(frequency)}</div>

              <div class="label">Designation:</div>
              <div class="value">${escapeHtml(designation)}</div>
              <div class="label">Net Amount:</div>
              <div class="value">${escapeHtml(formatCurrency(netSalary))}</div>
            </div>

            <div class="section">
              <div>
                <div class="col-title">Earnings</div>
                <div class="row"><span>Basic Salary</span><span>${escapeHtml(formatCurrency(baseSalary))}</span></div>
                <div class="row"><span>Regular Overtime</span><span>${escapeHtml(formatCurrency(overtimeAmount))}</span></div>
                <div class="row"><span>Late/Undertime</span><span>${escapeHtml(formatCurrency(0))}</span></div>
                <div class="row"><span>Rest Day</span><span>${escapeHtml(formatCurrency(0))}</span></div>
                <div class="row"><span>Rest Day OT</span><span>${escapeHtml(formatCurrency(0))}</span></div>
                <div class="row"><span>Holiday</span><span>${escapeHtml(formatCurrency(0))}</span></div>
                <div class="row" style="margin-top: 8px;"><strong>GROSS Amount</strong><strong>${escapeHtml(formatCurrency(grossSalary))}</strong></div>
              </div>

              <div>
                <div class="col-title">Deductions</div>
                ${deductionRowsHtml}
                <div class="row" style="margin-top: 8px;"><strong>Total Deductions</strong><strong>${escapeHtml(formatCurrency(totalDeductions))}</strong></div>
              </div>
            </div>

            <div class="bar">SALARY NET PAY ${escapeHtml(formatCurrency(netSalary))}</div>

            <div class="signatures">
              <div>
                <div class="prepared">Prepared by:</div>
                <div class="sig-line">
                  Accounting Department
                </div>
              </div>
              <div>
                <div class="prepared">Approved by:</div>
                <div class="sig-line">
                  Top Management
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
    if (!selectedEmployee || !selectedStartDate || !selectedEndDate) {
      alert('Please select employee, start date, and end date.');
      return;
    }

    if (selectedEndDate < selectedStartDate) {
      alert('End date cannot be earlier than start date.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocked. Please allow popups to generate and print payslip.');
      return;
    }
    printWindow.document.write('<html><body style="font-family:Arial,sans-serif;padding:20px;">Preparing payslip...</body></html>');
    printWindow.document.close();

    setIsProcessingPayroll(true);
    try {
      const responseData = await processPayroll({
        employee_id: selectedEmployee,
        period_start: selectedStartDate,
        period_end: selectedEndDate,
        daily_salary: dailySalary || null,
      });

      const name = responseData?.payslip?.employee_name || selectedEmployeeData?.name || 'Employee';
      const netSalary = responseData?.payslip?.net_salary || '0.00';
      renderPayslipPrintDocument(printWindow, responseData);
      alert(`Payslip generated for ${name}\nNet Salary: ${formatCurrency(netSalary)}\n\nA print-ready payslip has been opened.`);
      await fetchPayrollData();
      handleCloseModal();
    } catch (error) {
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
      alert(error.response?.data?.error || 'Failed to process payroll.');
    } finally {
      setIsProcessingPayroll(false);
    }
  };

  const handleExportReport = () => {
    if (!selectedExportStartDate || !selectedExportEndDate) {
      alert('Please select the payslip created date range to export.');
      return;
    }

    if (exportPayrollRecords.length === 0) {
      alert('No payroll records found for the selected date range.');
      return;
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Prepare data with proper row structure matching the template
    const excelData = [];
    
    // Row 1: Company Name
    excelData.push(['TRIPLE G ARCHITECTURAL DESIGN STUDIO']);
    
    // Row 2: Payroll Cut-off
    excelData.push([`Payroll Cut-off: ${formatDisplayDate(selectedExportStartDate)} - ${formatDisplayDate(selectedExportEndDate)}`]);
    
    // Row 3: Report Title
    excelData.push(['PAYROLL REPORT']);
    
    // Row 4: Empty row
    excelData.push([]);
    
    // Row 5: Category Headers (Deduction, Government Contributions merged headers)
    excelData.push([
      '', '', '', '', '', '', '', '',
      'Deduction', '', '', '',
      'Government Contributions', '', '',
      '', '', '', '', ''
    ]);
    
    // Row 6: Individual Column Headers
    excelData.push([
      'Employee',
      'Hourly Rate',
      'Daily Rate', 
      'Days Worked',
      'Basic Salary (Semi Monthly)',
      'Regular Overtime',
      'REST DAY',
      'Special Holiday',
      'Salary Adjustment Deduction',
      'Undertime',
      'Late',
      'Gross Pay Before Gov\'t Contributions',
      'Reg - SSS EE',
      'PHIC EE',
      'HDMF EE',
      'Net Taxable Salary',
      'Withholding Tax',
      'Net Pay After Tax',
      'Allowance',
      'Salary Net pay'
    ]);
    
    // Data rows with calculations
    exportPayrollRecords.forEach((record) => {
      const baseSalary = toNumber(record.base_salary);
      const workingDays = record.working_days || 0;
      const daysPresent = record.days_present || 0;
      const overtime = toNumber(record.overtime_amount);
      const allowances = toNumber(record.allowances_total);
      
      // Calculate rates (avoid division by zero)
      const dailyRate = daysPresent > 0 ? baseSalary / daysPresent : 0;
      const hourlyRate = dailyRate / 8;
      
      // Calculate government contributions (SSS 4.5%, PhilHealth 2%, Pag-IBIG 100)
      const sssEE = baseSalary * 0.045;
      const phicEE = baseSalary * 0.02;
      const hdmfEE = 100;
      
      // Calculate other values
      const grossBeforeGovt = baseSalary + overtime;
      const govtContributions = sssEE + phicEE + hdmfEE;
      const netTaxable = grossBeforeGovt - govtContributions;
      const withholdingTax = toNumber(record.tax);
      const netPayAfterTax = netTaxable - withholdingTax;
      const salaryNetPay = netPayAfterTax + allowances;
      
      excelData.push([
        record.employee_name || '',
        hourlyRate,
        dailyRate,
        daysPresent,
        baseSalary,
        overtime,
        0, // REST DAY - placeholder
        0, // Special Holiday - placeholder
        0, // Salary Adjustment Deduction - placeholder
        0, // Undertime - placeholder
        0, // Late - placeholder
        grossBeforeGovt,
        sssEE,
        phicEE,
        hdmfEE,
        netTaxable,
        withholdingTax,
        netPayAfterTax,
        allowances,
        salaryNetPay
      ]);
    });
    
    // Empty row before totals
    excelData.push([]);
    
    // Totals row - placeholder values, will add formulas
    excelData.push([
      'Total',
      '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]);
    
    // Create worksheet from data
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Employee
      { wch: 12 }, // Hourly Rate
      { wch: 12 }, // Daily Rate
      { wch: 12 }, // Days Worked
      { wch: 18 }, // Basic Salary
      { wch: 15 }, // Regular Overtime
      { wch: 12 }, // REST DAY
      { wch: 15 }, // Special Holiday
      { wch: 20 }, // Salary Adjustment Deduction
      { wch: 12 }, // Undertime
      { wch: 10 }, // Late
      { wch: 25 }, // Gross Pay Before Gov't Contributions
      { wch: 12 }, // Reg - SSS EE
      { wch: 12 }, // PHIC EE
      { wch: 12 }, // HDMF EE
      { wch: 16 }, // Net Taxable Salary
      { wch: 15 }, // Withholding Tax
      { wch: 16 }, // Net Pay After Tax
      { wch: 12 }, // Allowance
      { wch: 15 }, // Salary Net pay
    ];
    
    const totalRowIndex = 7 + exportPayrollRecords.length + 1; // Row 1-3=Headers, 4=Empty, 5=Categories, 6=Columns, 7=First data
    const dataRowStart = 7; // First data row after all headers
    const lastDataRow = totalRowIndex - 2;
    
    // Set up merged cells
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 19 } }, // Company name spans all 20 columns
      { s: { r: 1, c: 0 }, e: { r: 1, c: 19 } }, // Payroll Cut-off spans all 20 columns
      { s: { r: 2, c: 0 }, e: { r: 2, c: 19 } }, // Report title spans all 20 columns
      { s: { r: 4, c: 8 }, e: { r: 4, c: 10 } }, // "Deduction" spans I5:K5 (Salary Adj, Undertime, Late)
      { s: { r: 4, c: 12 }, e: { r: 4, c: 14 } }, // "Government Contributions" spans M5:O5 (SSS, PHIC, HDMF)
    ];
    
    // Apply cell styles - Row 1: Company Name (Orange background, merged)
    ws['A1'] = {
      v: 'TRIPLE G ARCHITECTURAL DESIGN STUDIO',
      t: 's',
      s: {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'F27229' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    };
    
    // Apply cell styles - Row 2: Payroll Cut-off (Light blue background, merged)
    ws['A2'] = {
      v: `Payroll Cut-off: ${formatDisplayDate(selectedExportStartDate)} - ${formatDisplayDate(selectedExportEndDate)}`,
      t: 's',
      s: {
        font: { bold: true, sz: 12 },
        fill: { fgColor: { rgb: 'D6EAF8' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    };
    
    // Apply cell styles - Row 3: Report Title (Gray background, merged)
    ws['A3'] = {
      v: 'PAYROLL REPORT',
      t: 's',
      s: {
        font: { bold: true, sz: 14 },
        fill: { fgColor: { rgb: 'E8E8E8' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    };
    
    // Apply Row 5: Category headers (green background)
    const columnHeaders = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
    
    // Row 5 category headers - style the merged cells
    ['I5', 'M5'].forEach(cellRef => {
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      ws[cellRef].s = {
        font: { bold: true, sz: 10 },
        fill: { fgColor: { rgb: '92D050' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
    });
    
    // Set values for category headers
    ws['I5'].v = 'Deduction';
    ws['M5'].v = 'Government Contributions';
    
    // Style all Row 5 cells with green (even empty ones for consistency)
    columnHeaders.forEach((col) => {
      const cellRef = col + '5';
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      if (!ws[cellRef].s) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: '92D050' } },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
    });
    
    // Apply Row 6: Individual column headers (Green background)
    const headerLabels = [
      'Employee', 'Hourly Rate', 'Daily Rate', 'Days Worked',
      'Basic Salary (Semi Monthly)', 'Regular Overtime', 'REST DAY', 'Special Holiday',
      'Salary Adjustment Deduction', 'Undertime', 'Late',
      'Gross Pay Before Gov\'t Contributions', 'Reg - SSS EE', 'PHIC EE', 'HDMF EE',
      'Net Taxable Salary', 'Withholding Tax', 'Net Pay After Tax',
      'Allowance', 'Salary Net pay'
    ];
    
    columnHeaders.forEach((col, idx) => {
      const cellRef = col + '6';
      ws[cellRef] = {
        v: headerLabels[idx],
        t: 's',
        s: {
          font: { bold: true, sz: 10 },
          fill: { fgColor: { rgb: '92D050' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        }
      };
    });
    
    // Apply center alignment and borders to all data cells
    for (let row = dataRowStart; row <= lastDataRow; row++) {
      columnHeaders.forEach((col) => {
        const cellRef = col + row;
        if (ws[cellRef]) {
          ws[cellRef].s = {
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }
      });
    }
    
    // Apply TOTAL row styles (Green background) with formulas
    const numericColumns = ['B', 'C', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
    columnHeaders.forEach((col) => {
      const cellRef = col + totalRowIndex;
      
      if (numericColumns.includes(col)) {
        ws[cellRef] = {
          f: `SUM(${col}${dataRowStart}:${col}${lastDataRow})`,
          t: 'n',
          s: {
            font: { bold: true, sz: 11 },
            fill: { fgColor: { rgb: '92D050' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          }
        };
      } else if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true, sz: 11 },
          fill: { fgColor: { rgb: '92D050' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
    });
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    
    // Generate file name
    const fileName = `Payroll_Cutoff_${selectedExportStartDate}_${selectedExportEndDate}.xlsx`;
    
    // Write file
    XLSX.writeFile(wb, fileName);

    const totalNetPay = exportPayrollRecords.reduce((sum, r) => {
      const baseSalary = toNumber(r.base_salary);
      const allowances = toNumber(r.allowances_total);
      const tax = toNumber(r.tax);
      const sss = baseSalary * 0.045;
      const phic = baseSalary * 0.02;
      const hdmf = 100;
      return sum + (baseSalary - sss - phic - hdmf - tax + allowances);
    }, 0);
    
    alert(`Payroll report exported successfully!\n${exportPayrollRecords.length} employees\nTotal Net Pay: ${formatCurrency(totalNetPay)}`);
    setIsExportReportOpen(false);
  };

  const selectedEmployeeData = employees.find(e => e.id === selectedEmployee);
  const totalExportNetSalary = exportPayrollRecords.reduce(
    (total, record) => total + toNumber(record.net_salary),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Button>
        </div>
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
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={handleOpenExportReport}>
              <Download className="w-6 h-6" />
              Export Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payroll Records */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Recent Payroll Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPayrollData ? (
            <p className="text-sm text-muted-foreground">Loading payroll records...</p>
          ) : payrollError ? (
            <p className="text-sm text-red-600">{payrollError}</p>
          ) : recentPayrollRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payroll records yet. Process payroll to generate records.</p>
          ) : (
            <div className="space-y-3">
              {recentPayrollRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 transition-colors">
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
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(record.net_salary)}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.period_start} to {record.period_end}
                      </p>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary">
                      {record.status_label || 'Processed'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Tax/Deductions Modal */}
      <Dialog open={isTaxDeductionsOpen} onOpenChange={setIsTaxDeductionsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Manage Tax/Deductions
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Add New Deduction */}
            <div className="p-4 rounded-lg bg-[#021B2C]/30 border border-[#AEAAAA]/10">
              <h3 className="text-sm font-semibold text-white mb-4">Add New Deduction</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#AEAAAA]">Deduction Name</Label>
                  <Input
                    placeholder="e.g., Health Insurance"
                    value={newDeductionName}
                    onChange={(e) => setNewDeductionName(e.target.value)}
                    className="bg-[#021B2C] border-[#AEAAAA]/20 text-white h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#AEAAAA]">Type</Label>
                    <Select value={newDeductionType} onValueChange={setNewDeductionType}>
                      <SelectTrigger className="bg-[#021B2C] border-[#AEAAAA]/20 text-white h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (₱)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#AEAAAA]">Rate/Amount</Label>
                    <Input
                      type="number"
                      placeholder={newDeductionType === 'percentage' ? '0.00' : '0'}
                      value={newDeductionRate}
                      onChange={(e) => setNewDeductionRate(e.target.value)}
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white h-9"
                    />
                  </div>
                </div>
                <Button
                  className="w-full gap-2 h-9"
                  onClick={handleAddDeduction}
                  disabled={isSavingDeduction}
                >
                  <Plus className="w-4 h-4" />
                  {isSavingDeduction ? 'Saving...' : 'Add Deduction'}
                </Button>
              </div>
            </div>

            {/* Existing Deductions */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white px-1">Current Deductions</h3>
              {deductionError ? <p className="text-xs text-red-500 px-1">{deductionError}</p> : null}
              {isLoadingDeductions ? (
                <p className="text-sm text-muted-foreground px-1">Loading deductions...</p>
              ) : deductions.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">No deductions configured yet.</p>
              ) : (
                <div className="space-y-2">
                  {deductions.map((deduction) => (
                    <div key={deduction.id} className="p-3 rounded-lg bg-[#021B2C]/30 border border-[#AEAAAA]/10 hover:bg-[#021B2C]/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{deduction.name}</p>
                          <p className="text-xs text-[#AEAAAA] mt-1">
                            {deduction.type === 'percentage' ? `${deduction.rate}%` : `₱${deduction.rate}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDeduction(deduction.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button onClick={() => setIsTaxDeductionsOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Report Modal */}
      <Dialog open={isExportReportOpen} onOpenChange={setIsExportReportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Payroll Report
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="export-start-date">Payslip Created From</Label>
                <Input
                  id="export-start-date"
                  type="date"
                  value={selectedExportStartDate}
                  onChange={(e) => setSelectedExportStartDate(e.target.value)}
                  className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="export-end-date">Payslip Created To</Label>
                <Input
                  id="export-end-date"
                  type="date"
                  value={selectedExportEndDate}
                  onChange={(e) => setSelectedExportEndDate(e.target.value)}
                  className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This loads all payslips created within the selected date range for all employees.
            </p>

            {isLoadingExportRecords ? (
              <p className="text-sm text-muted-foreground">Loading payroll records...</p>
            ) : exportReportError ? (
              <p className="text-sm text-red-600">{exportReportError}</p>
            ) : exportPayrollRecords.length === 0 ? (
              <Card className="bg-[#002035] border-[#AEAAAA]/20">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    No payroll records found for the selected created date.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="bg-[#002035] border-[#AEAAAA]/20">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Records Found</p>
                      <p className="text-lg font-semibold">{exportPayrollRecords.length}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Net Salary</p>
                      <p className="text-lg font-semibold text-[#F27229]">{formatCurrency(totalExportNetSalary)}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {exportPayrollRecords.map((record) => (
                    <div key={record.id} className="p-3 rounded-lg border border-border/50 bg-card/40">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{record.employee_name || 'Employee'}</p>
                          <p className="text-xs text-muted-foreground">{record.employee_role || 'Employee'}</p>
                          <p className="text-xs text-muted-foreground">
                            Period: {formatDisplayDate(record.period_start)} to {formatDisplayDate(record.period_end)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {formatDisplayDateTime(record.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(record.net_salary)}</p>
                          <Badge className="bg-primary/10 text-primary border-primary mt-1">
                            {record.status_label || 'Processed'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Card className="bg-[#002035] border-[#AEAAAA]/20">
              <CardContent className="p-3">
                <p className="text-sm text-muted-foreground">
                  The exported file is a professional Excel (.xlsx) report with formatted headers, totals, and company branding.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsExportReportOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExportReport}
              className="gap-2"
              disabled={isLoadingExportRecords || exportPayrollRecords.length === 0 || !selectedExportStartDate || !selectedExportEndDate}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Process Payroll Modal */}
      <Dialog open={isProcessPayrollOpen} onOpenChange={setIsProcessPayrollOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Process Payroll
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employee">Select Employee</Label>
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

            {/* Payroll Date Range (15-day cycle) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Start Date</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={selectedStartDate}
                  onChange={(e) => setSelectedStartDate(e.target.value)}
                  className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodEnd">End Date</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={selectedEndDate}
                  onChange={(e) => setSelectedEndDate(e.target.value)}
                  className="bg-[#021B2C] border-[#AEAAAA]/20 text-white"
                />
              </div>
            </div>

            {/* Employee Info Card */}
            {selectedEmployeeData && (
              <Card className="border-2 border-[#F27229]/20 bg-[#002035]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={selectedEmployeeData.avatar} alt={selectedEmployeeData.name} />
                      <AvatarFallback>{selectedEmployeeData.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedEmployeeData.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedEmployeeData.position}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attendance Summary */}
            {isFetchingAttendance ? (
              <Card className="bg-[#002035] border-[#AEAAAA]/20">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Loading attendance summary...</p>
                </CardContent>
              </Card>
            ) : attendanceData ? (
              <Card className="bg-[#002035] border-[#AEAAAA]/20">
                <CardHeader>
                  <CardTitle className="text-base">Attendance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Days Worked</p>
                      <p className="text-xl font-medium text-[#F27229]">{attendanceData.totalDays}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Hours</p>
                      <p className="text-xl font-medium text-[#F27229]">{attendanceData.totalHours}h</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Late Count</p>
                      <p className="text-xl font-medium text-[#F27229]">{attendanceData.lateCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Leave Days</p>
                      <p className="text-xl font-medium text-[#F27229]">{attendanceData.leaveCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Absences</p>
                      <p className="text-xl font-medium text-[#F27229]">{attendanceData.absences}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Working Days</p>
                      <p className="text-xl font-medium text-[#F27229]">{attendanceData.working_days}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : selectedEmployee && selectedStartDate && selectedEndDate ? (
              <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">
                      {selectedEndDate < selectedStartDate
                        ? 'End date cannot be earlier than start date.'
                        : 'No attendance data available for this period.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Salary Input */}
            <div className="space-y-2">
              <Label htmlFor="dailySalary">Daily Salary Rate (₱)</Label>
              <Input
                id="dailySalary"
                type="number"
                placeholder="Enter daily salary rate"
                value={dailySalary}
                onChange={(e) => setDailySalary(e.target.value)}
                min="0"
                className="bg-[#021B2C] border-[#AEAAAA]/20 text-white [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
              <p className="text-xs text-muted-foreground">
                Enter the employee's daily salary rate for calculation
              </p>
            </div>

            {/* Salary Calculation */}
            {calculations && (
              <Card className="border-2 border-[#F27229]/20 bg-[#002035]">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Salary Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Base Salary */}
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="font-medium">Base Salary</span>
                    <span className="text-lg font-semibold">₱{calculations.baseSalary.toFixed(2)}</span>
                  </div>

                  {/* Deductions */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Deductions:</p>

                    {calculations.deductions.absences > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Absences</span>
                        <span className="text-red-600">- ₱{calculations.deductions.absences.toFixed(2)}</span>
                      </div>
                    )}

                    {calculations.deductions.late > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Late Deductions</span>
                        <span className="text-red-600">- ₱{calculations.deductions.late.toFixed(2)}</span>
                      </div>
                    )}

                    {calculations.deductions.leave > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Unpaid Leave</span>
                        <span className="text-red-600">- ₱{calculations.deductions.leave.toFixed(2)}</span>
                      </div>
                    )}
                    {calculations.deductionItems.length > 0 ? (
                      calculations.deductionItems.map((item) => (
                        <div key={item.id || item.name} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.name}</span>
                          <span className="text-red-600">- ₱{toNumber(item.amount).toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Configured Deductions</span>
                        <span className="text-red-600">- ₱0.00</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-medium pt-2 border-t">
                      <span className="text-muted-foreground">Total Deductions</span>
                      <span className="text-red-600">- ₱{calculations.totalDeductions.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Net Salary */}
                  <div className="flex justify-between items-center pt-3 border-t-2 border-green-300 dark:border-green-700">
                    <span className="text-lg font-semibold">Net Salary</span>
                    <span className="text-2xl font-bold text-[#F27229]">
                      ₱{calculations.netSalary.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleGeneratePayslip}
              disabled={!selectedEmployee || !selectedStartDate || !selectedEndDate || selectedEndDate < selectedStartDate || isProcessingPayroll}
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {isProcessingPayroll ? 'Processing...' : 'Generate Payslip'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
