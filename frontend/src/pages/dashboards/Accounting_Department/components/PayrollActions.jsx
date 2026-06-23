import React from 'react';
import { Button } from '../../../../components/ui/accounting-ui';
import { Plus, Settings, UserCheck } from 'lucide-react';

export function PayrollActions({
  handleProcessPayroll,
  handleOpenTaxDeductions,
  handleOpenAllowanceEligibility
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 shrink-0">
      <Button
        className="gap-2 bg-[#FF7120] hover:bg-[#FF7120]/90 text-white border-0"
        onClick={handleProcessPayroll}
      >
        <Plus className="w-4 h-4" />
        Process Payroll
      </Button>
      <Button
        variant="outline"
        className="gap-2 border-white/10 hover:bg-white/10 text-white"
        onClick={handleOpenTaxDeductions}
      >
        <Settings className="w-4 h-4" />
        Government Contributions
      </Button>
      <Button
        variant="outline"
        className="gap-2 border-white/10 hover:bg-white/10 text-white"
        onClick={handleOpenAllowanceEligibility}
      >
        <UserCheck className="w-4 h-4" />
        Allowance Eligibility
      </Button>
    </div>
  );
}
