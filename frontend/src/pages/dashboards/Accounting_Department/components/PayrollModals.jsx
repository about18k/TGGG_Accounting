import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  Switch,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../../../components/ui/accounting-ui';
import { CardSkeleton } from '../../../../components/SkeletonLoader';
import { Settings, Plus, Trash2, UserCheck, Calculator, BarChart3, CheckCircle } from 'lucide-react';
import { formatCurrency, stripPesoInput, formatPesoInput, toNumber } from '../usePayroll';

// Helper component for auto-formatting currency inputs with Peso sign on blur
function CurrencyInput({ id, value, onChange, placeholder, className, readOnly, disabled }) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [localValue, setLocalValue] = React.useState('');

  React.useEffect(() => {
    if (!isFocused) {
      setLocalValue(value || '');
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    if (readOnly || disabled) return;
    setIsFocused(true);
    const cleaned = stripPesoInput(value);
    setLocalValue(cleaned === '0' || cleaned === '0.00' ? '' : cleaned);
  };

  const handleChange = (e) => {
    setLocalValue(e.target.value);
    onChange(e);
  };

  const handleBlur = () => {
    if (readOnly || disabled) return;
    setIsFocused(false);
    const formatted = formatPesoInput(localValue);
    setLocalValue(formatted);
    onChange({
      target: {
        id,
        name: id,
        value: formatted,
      },
    });
  };

  return (
    <Input
      id={id}
      type="text"
      value={localValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      readOnly={readOnly}
      disabled={disabled}
    />
  );
}

export function PayrollModals(props) {
  const {
    attendanceSummary,
    isPayslipImageViewerOpen,
    closePayslipImageViewer,
    setIsPayslipImageViewerOpen,
    selectedPayslipRecord,
    payslipImagePreviewUrl,
    isTaxDeductionsOpen,
    setIsTaxDeductionsOpen,
    selectedContributionEmployee,
    handleSelectContributionEmployee,
    employees,
    newContributionName,
    setNewContributionName,
    newContributionAmount,
    setNewContributionAmount,
    handleAddEmployeeContribution,
    isSavingEmployeeContribution,
    contributionError,
    isLoadingEmployeeContributions,
    employeeContributions,
    handleDeleteEmployeeContribution,
    isAllowanceEligibilityOpen,
    setIsAllowanceEligibilityOpen,
    allowanceEligibleEmployeeIds,
    handleToggleAllowanceEligibility,
    isSavingAllowanceEligibility,
    handleSaveAllowanceEligibility,
    isProcessPayrollOpen,
    setIsProcessPayrollOpen,
    selectedEmployee,
    setSelectedEmployee,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    selectedPayrollPeriod,
    setSelectedPayrollPeriod,
    selectedEmployeeData,
    payslipForm,
    handlePayslipFieldChange,
    isEditingModalContributions,
    handleSaveModalContributions,
    setIsEditingModalContributions,
    isLoadingModalContributions,
    isSavingModalContributions,
    modalEmployeeContributions,
    handleModalContributionAmountChange,
    computedPayslipValues,
    isSelectedEmployeeAllowanceEligible,
    topManagementUser,
    handleCloseModal,
    handlePreviewPayslip,
    isPayslipPreviewOpen,
    setIsPayslipPreviewOpen,
    payslipPreviewData,
    isProcessingPayroll,
    handleConfirmPayroll,
  } = props;

  return (
    <>
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
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="sm:max-w-3xl">
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
                        <CurrencyInput
                          id="newContributionAmount"
                          placeholder="Enter amount"
                          value={newContributionAmount}
                          onChange={(e) => setNewContributionAmount(e.target.value)}
                          className="bg-background border-white/10 text-white h-9"
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
                      <CardSkeleton />
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
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
                  className="bg-background border-white/10 text-white cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <Label>Wage Type</Label>
                <Input
                  value={payslipForm.wageType === 'daily' ? 'Daily Rate' : 'Monthly Salary'}
                  readOnly
                  className="bg-[#021B2C] border-white/10 text-white cursor-not-allowed"
                />
              </div>
            </div>

            {payslipForm.wageType === 'daily' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dailyRate">Daily Rate (₱)</Label>
                  <Input
                    id="dailyRate"
                    type="text"
                    value={payslipForm.dailyRate}
                    readOnly
                    className="bg-[#021B2C] border-white/10 text-white cursor-not-allowed"
                    placeholder="Daily rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daysPresent">Days Present (Attendance)</Label>
                  <Input
                    id="daysPresent"
                    type="number"
                    value={payslipForm.daysPresent}
                    onChange={(e) => handlePayslipFieldChange('daysPresent', e.target.value)}
                    className="bg-background border-white/10 text-white"
                    placeholder="Enter days present"
                    min="0"
                    step="1"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyAmount">Monthly Salary (₱)</Label>
                  <CurrencyInput
                    id="monthlyAmount"
                    value={payslipForm.monthly}
                    onChange={(e) => handlePayslipFieldChange('monthly', e.target.value)}
                    className="bg-background border-white/10 text-white"
                    placeholder="Enter base salary"
                  />
                </div>
              </div>
            )}

            <Card className="border border-white/10 bg-card">
              <CardHeader>
                <CardTitle className="text-base">Earnings</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basicSalary">
                    {payslipForm.wageType === 'daily' ? 'Basic Pay (Computed)' : 'Basic Salary'}
                  </Label>
                  <CurrencyInput
                    id="basicSalary"
                    value={payslipForm.basicSalary}
                    onChange={(e) => handlePayslipFieldChange('basicSalary', e.target.value)}
                    className={payslipForm.wageType === 'daily' ? "bg-[#021B2C] border-white/10 text-white cursor-not-allowed" : "bg-background border-white/10 text-white"}
                    readOnly={payslipForm.wageType === 'daily'}
                    placeholder={payslipForm.wageType === 'daily' ? "Computed basic pay" : "Enter base salary"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regularOvertime">Regular Overtime</Label>
                  <CurrencyInput
                    id="regularOvertime"
                    value={payslipForm.regularOvertime}
                    onChange={(e) => handlePayslipFieldChange('regularOvertime', e.target.value)}
                    className="bg-background border-white/10 text-white"
                    placeholder="Enter regular overtime"
                  />
                  {attendanceSummary && (
                    <p className="text-xs text-muted-foreground mt-1">
                      This period: {attendanceSummary.overtime_hours ?? 0} hrs total overtime.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lateUndertime">Late/Undertime</Label>
                  <CurrencyInput
                    id="lateUndertime"
                    value={payslipForm.lateUndertime}
                    onChange={(e) => handlePayslipFieldChange('lateUndertime', e.target.value)}
                    className="bg-background border-white/10 text-white"
                    placeholder="Enter late/undertime"
                  />
                  {attendanceSummary && (
                    <p className="text-xs text-muted-foreground mt-1">
                      This period: {attendanceSummary.undertime_hours ?? 0} hrs total late/undertime.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restDay">Rest Day</Label>
                  <CurrencyInput
                    id="restDay"
                    value={payslipForm.restDay}
                    onChange={(e) => handlePayslipFieldChange('restDay', e.target.value)}
                    className="bg-background border-white/10 text-white"
                    placeholder="Enter rest day pay"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restDayOt">Rest Day OT</Label>
                  <CurrencyInput
                    id="restDayOt"
                    value={payslipForm.restDayOt}
                    onChange={(e) => handlePayslipFieldChange('restDayOt', e.target.value)}
                    className="bg-background border-white/10 text-white"
                    placeholder="Enter rest day OT pay"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="holiday">Holiday</Label>
                  <CurrencyInput
                    id="holiday"
                    value={payslipForm.holiday}
                    onChange={(e) => handlePayslipFieldChange('holiday', e.target.value)}
                    className="bg-background border-white/10 text-white"
                    placeholder="Enter holiday pay"
                  />
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
                    <CardSkeleton />
                  ) : modalEmployeeContributions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No government contributions configured for this employee.</p>
                  ) : (
                    <div className="space-y-2">
                      {modalEmployeeContributions.map((item) => (
                        <div key={item.id} className="grid grid-cols-2 gap-3 items-center">
                          <p className="text-sm text-muted-foreground">{item.name}</p>
                          {isEditingModalContributions ? (
                            <CurrencyInput
                              id={`contribution-${item.id}`}
                              value={item.amount}
                              onChange={(e) => handleModalContributionAmountChange(item.id, e.target.value)}
                              className="bg-background border-white/10 text-white h-9"
                              placeholder="Enter contribution"
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
                      type="text"
                      value={formatCurrency(computedPayslipValues.netTaxableSalary)}
                      readOnly
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white cursor-not-allowed"
                      placeholder="Net taxable salary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payrollTax">Payroll Tax</Label>
                    <Input
                      id="payrollTax"
                      type="text"
                      value={formatCurrency(computedPayslipValues.payrollTax)}
                      readOnly
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white cursor-not-allowed"
                      placeholder="Payroll tax"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalDeductions">Total Deductions</Label>
                    <Input
                      id="totalDeductions"
                      type="text"
                      value={formatCurrency(computedPayslipValues.totalDeductions)}
                      readOnly
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white cursor-not-allowed"
                      placeholder="Total deductions"
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
                      type="text"
                      value={formatCurrency(computedPayslipValues.grossAmount)}
                      readOnly
                      className="bg-[#021B2C] border-[#AEAAAA]/20 text-white cursor-not-allowed"
                      placeholder="Gross amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payrollAllowance" className="min-h-[2.5rem] flex items-end pb-1">Payroll Allowance</Label>
                    <CurrencyInput
                      id="payrollAllowance"
                      value={isSelectedEmployeeAllowanceEligible ? payslipForm.payrollAllowance : '₱0.00'}
                      onChange={(e) => handlePayslipFieldChange('payrollAllowance', e.target.value)}
                      className="bg-background border-white/10 text-white"
                      disabled={!isSelectedEmployeeAllowanceEligible}
                      placeholder="Enter payroll allowance"
                    />
                    {!isSelectedEmployeeAllowanceEligible && (
                      <p className="text-xs text-muted-foreground">This employee is not allowance-eligible.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyLoanCashAdvance" className="min-h-[2.5rem] flex items-end pb-1">Company Loan/Cash Advance</Label>
                    <CurrencyInput
                      id="companyLoanCashAdvance"
                      value={payslipForm.companyLoanCashAdvance}
                      onChange={(e) => handlePayslipFieldChange('companyLoanCashAdvance', e.target.value)}
                      className="bg-background border-white/10 text-white"
                      placeholder="Enter deductions"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salaryNetPay" className="text-[#F27229] font-semibold">SALARY NET PAY</Label>
                  <Input
                    id="salaryNetPay"
                    type="text"
                    value={formatCurrency(computedPayslipValues.salaryNetPay)}
                    readOnly
                    className="bg-[#021B2C] border-[#F27229]/40 text-[#F27229] font-semibold cursor-not-allowed"
                    placeholder="Salary net pay"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preparedBy" className="min-h-[2.5rem] flex items-end pb-1">Prepared By (Accounting Department)</Label>
                    <Input
                      id="preparedBy"
                      value={payslipForm.preparedBy}
                      readOnly
                      className="bg-background border-white/10 text-white"
                      placeholder="Prepared by name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approvedByTopManagement" className="min-h-[2.5rem] flex items-end pb-1">Approved By (Top Management/CEO)</Label>
                    <Input
                      id="approvedByTopManagement"
                      value={topManagementUser?.name || payslipForm.approvedByTopManagement}
                      readOnly
                      placeholder="Pending CEO Approval"
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
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
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
                      {payslipForm.wageType === 'daily' ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Daily Rate</span>
                            <span className="font-semibold text-white">{formatCurrency(toNumber(payslipForm.dailyRate))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Basic Pay (₱{toNumber(payslipForm.dailyRate).toFixed(2)}/day x {payslipForm.daysPresent} days)
                            </span>
                            <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.basicSalary)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Monthly</span>
                            <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.monthlyAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Basic Salary</span>
                            <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.basicSalary)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Regular Overtime</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.regularOvertime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Late/Undertime</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.lateUndertime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rest Day</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.restDay)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rest Day OT</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.restDayOt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Holiday</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.holiday)}</span>
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
                      <div className="flex justify-between pb-2 border-b border-[#AEAAAA]/20">
                        <span className="text-muted-foreground">Payroll Tax</span>
                        <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.payrollTax)}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-1">
                        <span className="text-muted-foreground">Total Deductions</span>
                        <span className="text-white">{formatCurrency(payslipPreviewData.totalDeductionsAmount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="lg:col-start-2 space-y-2 text-sm px-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payroll Allowance</span>
                    <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.payrollAllowance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company Loan/Cash Advance</span>
                    <span className="font-semibold text-white">{formatCurrency(payslipPreviewData.companyLoanCashAdvance)}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-[#F27229]/20 to-[#F27229]/10 border-2 border-[#F27229]/40">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#F27229]">SALARY NET PAY</span>
                  <span className="text-3xl font-bold text-[#F27229]">{formatCurrency(payslipPreviewData.salaryNetPay)}</span>
                </div>
              </div>

              {/* Approvals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg bg-background/20 border border-white/10">
                <div>
                  <p className="text-xs text-muted-foreground">Prepared By</p>
                  <p className="text-sm font-semibold text-white">{payslipPreviewData.payslipFormPayload.prepared_by || 'Accounting'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {payslipPreviewData.payslipFormPayload.prepared_by_signature ? 'Signature attached' : 'No signature uploaded yet'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approved By (CEO)</p>
                  <p className="text-sm font-semibold text-white">{payslipPreviewData.payslipFormPayload.approved_by_top_management || payslipPreviewData.payslipFormPayload.approved_by || '-'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {payslipPreviewData.payslipFormPayload.approved_by_signature ? 'Signature attached' : 'No signature uploaded yet'}
                  </p>
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
    </>
  );
}
