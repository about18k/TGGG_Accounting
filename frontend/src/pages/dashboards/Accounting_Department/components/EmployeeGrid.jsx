import React from 'react';
import { Card, CardContent, Avatar, AvatarFallback, AvatarImage, Badge } from '../../../../components/ui/accounting-ui';
import { formatDurationFromHours } from '../../../../utils/attendanceFormatters';

const getStatusBadge = (status) => {
  const variants = {
    'Active': 'bg-primary/10 text-primary border-primary',
    'On Leave': 'bg-primary/10 text-primary border-primary',
    'Inactive': 'bg-red-500/10 text-red-500 border-red-500',
  };

  return (
    <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
      {status}
    </Badge>
  );
};

export const EmployeeGrid = ({
  filteredEmployees,
  employeeAttendanceStats,
  otRequestActualHoursMap,
  isAttendanceLoading,
  openEmployeeDetails
}) => {
  return (
    <div className="max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredEmployees.map((employee) => {
          const attendanceMetrics = employeeAttendanceStats.get(String(employee.id)) || {
            totalDays: 0,
            totalHours: 0,
            totalOvertime: 0,
            onTime: 0,
            late: 0,
            totalLate: 0,
          };

          return (
            <Card key={employee.id} className="border border-white/10 shadow-md bg-[#021B2C] hover:shadow-lg transition-shadow cursor-pointer flex flex-col rounded-2xl" onClick={() => openEmployeeDetails(employee)}>
              <CardContent className="p-3 flex flex-col h-full gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Avatar className="w-11 h-11 shrink-0">
                      <AvatarImage src={employee.avatar} alt={employee.name} />
                      <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm truncate text-white">{employee.name || '---'}</h3>
                      <p className="text-[11px] text-white/60 truncate">{employee.position || '---'}</p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {getStatusBadge(employee.status)}
                  </div>
                </div>

                <div className="w-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-2.5 border border-green-200/30">
                  <p className="text-[10px] text-white/60">Monthly Salary</p>
                  <p className="text-lg font-semibold tracking-tight text-green-400 truncate">
                    {employee.salary ? `₱${Number(employee.salary).toLocaleString('en-PH')}` : '---'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 auto-rows-fr">
                  <div className="bg-[#001f35] rounded-lg px-2.5 py-2 h-16">
                    <p className="text-[10px] text-white/60">Total Days</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight leading-none text-[#FF6B00] truncate">{isAttendanceLoading ? '...' : attendanceMetrics.totalDays}</p>
                  </div>
                  <div className="bg-[#001f35] rounded-lg px-2.5 py-2 h-16">
                    <p className="text-[10px] text-white/60">Total Hours</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight leading-none text-[#FF6B00] truncate" title={isAttendanceLoading ? '...' : formatDurationFromHours(attendanceMetrics.totalHours)}>{isAttendanceLoading ? '...' : formatDurationFromHours(attendanceMetrics.totalHours)}</p>
                  </div>
                  <div className="bg-[#001f35] rounded-lg px-2.5 py-2 h-16">
                    <p className="text-[10px] text-white/60">On-Time</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight leading-none text-[#FF6B00] truncate">{isAttendanceLoading ? '...' : attendanceMetrics.onTime}</p>
                  </div>
                  <div className="bg-[#001f35] rounded-lg px-2.5 py-2 h-16">
                    <p className="text-[10px] text-white/60">Late</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight leading-none text-[#FF6B00] truncate">{isAttendanceLoading ? '...' : attendanceMetrics.late}</p>
                  </div>
                  <div className="bg-[#001f35] rounded-lg px-2.5 py-2 h-16">
                    <p className="text-[10px] text-white/60">Total Late</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight leading-none text-[#FF6B00] truncate" title={isAttendanceLoading ? '...' : formatDurationFromHours(attendanceMetrics.totalLate)}>{isAttendanceLoading ? '...' : formatDurationFromHours(attendanceMetrics.totalLate)}</p>
                  </div>
                  <div className="bg-[#001f35] rounded-lg px-2.5 py-2 h-16">
                    <p className="text-[10px] text-white/60">Total Overtime</p>
                    {(() => {
                      const otFromRequests = otRequestActualHoursMap.get(String(employee.id)) || 0;
                      const otFromAttendance = attendanceMetrics.totalOvertime || 0;
                      const combined = otFromRequests + otFromAttendance;
                      const display = combined > 0
                        ? formatDurationFromHours(combined)
                        : formatDurationFromHours(otFromAttendance);
                      return (
                        <p
                          className="mt-1 text-lg font-semibold tracking-tight leading-none text-[#FF6B00] truncate"
                          title={isAttendanceLoading ? '...' : display}
                        >
                          {isAttendanceLoading ? '...' : display}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
