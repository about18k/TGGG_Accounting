import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge
} from '../../../../components/ui/accounting-ui';
import { TableSkeleton } from '../../../../components/SkeletonLoader';
import { formatCurrency } from '../usePayroll';

export function PayrollTable({
  filteredPayrollRecords,
  filterEmployee,
  setFilterEmployee,
  filterPayrollPeriod,
  setFilterPayrollPeriod,
  employees,
  isLoadingPayrollData,
  payrollError,
  recentPayrollRecords,
  loadingPayslipImageId,
  handleViewPayslipImage
}) {
  return (
    <Card className="border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.22)] bg-[#001f35]/70 backdrop-blur-md rounded-2xl">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Recent Payroll Records</span>
          <span className="text-sm font-normal text-white/60">({filteredPayrollRecords.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-[#00273C]/60 border border-white/10">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/60 font-medium">Filter by Employee</Label>
            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger className="bg-[#00273C] border-white/10 text-white h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#001f35] border-white/10 text-white">
                <SelectItem value="all" className="text-white hover:bg-[#00273C]">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id} className="text-white hover:bg-[#00273C]">
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/60 font-medium">Filter by Period</Label>
            <Select value={filterPayrollPeriod} onValueChange={setFilterPayrollPeriod}>
              <SelectTrigger className="bg-[#00273C] border-white/10 text-white h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#001f35] border-white/10 text-white">
                <SelectItem value="all" className="text-white hover:bg-[#00273C]">All Periods</SelectItem>
                <SelectItem value="29 - 13" className="text-white hover:bg-[#00273C]">29 - 13</SelectItem>
                <SelectItem value="14 - 28" className="text-white hover:bg-[#00273C]">14 - 28</SelectItem>
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
              className="w-full h-9 border-white/10 hover:bg-white/10 text-white"
            >
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Records Display */}
        {isLoadingPayrollData ? (
          <TableSkeleton />
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
  );
}
