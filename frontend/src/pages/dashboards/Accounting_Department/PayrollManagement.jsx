import React from 'react';
import { BarChart3, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';

import { usePayroll, formatCurrency } from './usePayroll';
import { PayrollActions } from './components/PayrollActions';
import { PayrollTable } from './components/PayrollTable';
import { PayrollModals } from './components/PayrollModals';

export function PayrollManagement() {
  const hookState = usePayroll();
  const {
    payrollAnalytics,
    handleProcessPayroll,
    handleOpenTaxDeductions,
    handleOpenAllowanceEligibility
  } = hookState;

  const {
    totalEmployees,
    totalPayroll,
    averageSalary,
    totalDeductions,
  } = payrollAnalytics;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
        <div className="p-6 sm:p-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7120]/80">Accounting Department</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">Payroll Management</h1>
            <p className="mt-3 text-sm text-white/60 max-w-2xl">
              Process employee payroll, adjust allowance eligibilities, manage government tax rates, and review past payroll records.
            </p>
          </div>
          <PayrollActions
            handleProcessPayroll={handleProcessPayroll}
            handleOpenTaxDeductions={handleOpenTaxDeductions}
            handleOpenAllowanceEligibility={handleOpenAllowanceEligibility}
          />
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">Total Employees</p>
              <p className="text-2xl font-bold mt-2 text-white">{totalEmployees}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>

        {/* Total Payroll Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">Total Payroll</p>
              <p className="text-2xl font-bold mt-2 text-white">{formatCurrency(totalPayroll)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>

        {/* Average Salary Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">Average Salary</p>
              <p className="text-2xl font-bold mt-2 text-white">{formatCurrency(averageSalary)}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>

        {/* Total Deductions Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">Total Deductions</p>
              <p className="text-2xl font-bold mt-2 text-white">{formatCurrency(totalDeductions)}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>
      </div>

      <PayrollTable {...hookState} />

      <PayrollModals {...hookState} />
    </div>
  );
}

export default PayrollManagement;
