import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { 
  DollarSign, 
  Users, 
  Calendar,
  FileText,
  Settings,
  BarChart3,
  Download,
  Calculator,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Mock employee data
const mockEmployees = [
  { 
    id: 'EMP001', 
    name: 'Sarah Johnson', 
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1d3?w=40&h=40&fit=crop&crop=face',
    position: 'Senior Developer'
  },
  { 
    id: 'EMP002', 
    name: 'Mike Chen', 
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
    position: 'Marketing Manager'
  },
  { 
    id: 'EMP003', 
    name: 'Lisa Brown', 
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face',
    position: 'HR Specialist'
  },
  { 
    id: 'EMP004', 
    name: 'David Wilson', 
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
    position: 'Sales Lead'
  },
  { 
    id: 'EMP005', 
    name: 'Emma Davis', 
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=40&h=40&fit=crop&crop=face',
    position: 'Product Designer'
  },
];

// Mock attendance data for calculation
const mockAttendanceData = {
  'EMP001': {
    '2024-01': { totalDays: 22, totalHours: 176, lateCount: 2, leaveCount: 0, absences: 0 },
    '2024-02': { totalDays: 20, totalHours: 160, lateCount: 1, leaveCount: 1, absences: 0 },
    '2024-03': { totalDays: 21, totalHours: 168, lateCount: 0, leaveCount: 2, absences: 1 },
  },
  'EMP002': {
    '2024-01': { totalDays: 20, totalHours: 160, lateCount: 5, leaveCount: 2, absences: 0 },
    '2024-02': { totalDays: 19, totalHours: 152, lateCount: 3, leaveCount: 1, absences: 1 },
    '2024-03': { totalDays: 22, totalHours: 176, lateCount: 2, leaveCount: 0, absences: 0 },
  },
  'EMP003': {
    '2024-01': { totalDays: 22, totalHours: 176, lateCount: 1, leaveCount: 0, absences: 0 },
    '2024-02': { totalDays: 20, totalHours: 160, lateCount: 0, leaveCount: 0, absences: 0 },
    '2024-03': { totalDays: 21, totalHours: 168, lateCount: 1, leaveCount: 1, absences: 0 },
  },
  'EMP004': {
    '2024-01': { totalDays: 21, totalHours: 168, lateCount: 4, leaveCount: 1, absences: 0 },
    '2024-02': { totalDays: 19, totalHours: 152, lateCount: 2, leaveCount: 0, absences: 1 },
    '2024-03': { totalDays: 20, totalHours: 160, lateCount: 3, leaveCount: 2, absences: 0 },
  },
  'EMP005': {
    '2024-01': { totalDays: 22, totalHours: 176, lateCount: 0, leaveCount: 0, absences: 0 },
    '2024-02': { totalDays: 20, totalHours: 160, lateCount: 0, leaveCount: 0, absences: 0 },
    '2024-03': { totalDays: 21, totalHours: 168, lateCount: 0, leaveCount: 0, absences: 0 },
  },
};

export function PayrollManagement() {
  const [isProcessPayrollOpen, setIsProcessPayrollOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [dailySalary, setDailySalary] = useState('');
  
  // Attendance data for selected employee and month
  const [attendanceData, setAttendanceData] = useState(null);

  // Calculate payroll whenever inputs change
  const [calculations, setCalculations] = useState(null);

  const mockPayrollData = {
    totalPayroll: 1240000,
    employeesProcessed: 247,
    pendingApprovals: 3,
    nextPayrollDate: '2024-01-31',
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Update attendance data when employee or month changes
  useEffect(() => {
    if (selectedEmployee && selectedMonth && selectedYear) {
      const key = `${selectedYear}-${selectedMonth}`;
      const data = mockAttendanceData[selectedEmployee]?.[key];
      setAttendanceData(data || null);
    } else {
      setAttendanceData(null);
    }
  }, [selectedEmployee, selectedMonth, selectedYear]);

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
      
      // SSS, PhilHealth, Pag-IBIG (sample rates)
      const sssContribution = baseSalary * 0.045; // 4.5%
      const philHealthContribution = baseSalary * 0.02; // 2%
      const pagIbigContribution = 100; // Fixed
      
      // Tax (simplified - 0-20k: 0%, 20k-40k: 15%, above: 20%)
      let taxAmount = 0;
      if (baseSalary > 40000) {
        taxAmount = (baseSalary - 40000) * 0.20 + 3000;
      } else if (baseSalary > 20000) {
        taxAmount = (baseSalary - 20000) * 0.15;
      }
      
      const totalDeductions = 
        absenceDeduction + 
        lateDeduction + 
        leaveDeduction + 
        sssContribution + 
        philHealthContribution + 
        pagIbigContribution + 
        taxAmount;
      
      const netSalary = baseSalary - totalDeductions;
      
      setCalculations({
        baseSalary,
        deductions: {
          absences: absenceDeduction,
          late: lateDeduction,
          leave: leaveDeduction,
          sss: sssContribution,
          philHealth: philHealthContribution,
          pagIbig: pagIbigContribution,
          tax: taxAmount,
        },
        totalDeductions,
        netSalary,
      });
    } else {
      setCalculations(null);
    }
  }, [attendanceData, dailySalary]);

  const handleProcessPayroll = () => {
    setIsProcessPayrollOpen(true);
  };

  const handleCloseModal = () => {
    setIsProcessPayrollOpen(false);
    setSelectedEmployee('');
    setSelectedMonth('01');
    setSelectedYear('2024');
    setDailySalary('');
    setAttendanceData(null);
    setCalculations(null);
  };

  const handleGeneratePayslip = () => {
    // In a real app, this would generate a PDF or send to processing
    alert(`Payslip generated for ${mockEmployees.find(e => e.id === selectedEmployee)?.name}\nNet Salary: ₱${calculations?.netSalary.toFixed(2)}`);
    handleCloseModal();
  };

  const selectedEmployeeData = mockEmployees.find(e => e.id === selectedEmployee);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-medium">Payroll Management</h1>
          <p className="text-muted-foreground">Manage employee compensation and benefits</p>
        </div>
        <Button className="gap-2">
          <Download className="w-4 h-4" />
          Export Reports
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payroll</p>
                <p className="text-2xl font-medium">₱{(mockPayrollData.totalPayroll / 1000000).toFixed(1)}M</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">This month</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Employees Processed</p>
                <p className="text-2xl font-medium">{mockPayrollData.employeesProcessed}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Out of 250 total</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Next Payroll</p>
                <p className="text-2xl font-medium">Jan 31</p>
              </div>
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">In 4 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Actions */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Payroll Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={handleProcessPayroll}
            >
              <DollarSign className="w-6 h-6" />
              Process Payroll
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <FileText className="w-6 h-6" />
              Generate Reports
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Settings className="w-6 h-6" />
              Tax Settings
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <BarChart3 className="w-6 h-6" />
              Analytics
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
          <div className="space-y-3">
            {mockEmployees.slice(0, 5).map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={employee.avatar} alt={employee.name} />
                    <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{employee.name}</p>
                    <p className="text-sm text-muted-foreground">{employee.position}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">₱{(Math.random() * 30000 + 20000).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">January 2024</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary">Processed</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
                <SelectContent className="bg-[#002035] border-[#AEAAAA]/20">
                  {mockEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id} className="text-white hover:bg-[#021B2C]">
                      <div className="flex items-center gap-2">
                        <span>{emp.name}</span>
                        <span className="text-xs text-muted-foreground">({emp.id})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month and Year Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="bg-[#021B2C] border-[#AEAAAA]/20 text-white">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#002035] border-[#AEAAAA]/20">
                    {months.map(month => (
                      <SelectItem key={month.value} value={month.value} className="text-white hover:bg-[#021B2C]">
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="bg-[#021B2C] border-[#AEAAAA]/20 text-white">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#002035] border-[#AEAAAA]/20">
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()} className="text-white hover:bg-[#021B2C]">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            {attendanceData ? (
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
                  </div>
                </CardContent>
              </Card>
            ) : selectedEmployee && selectedMonth && selectedYear ? (
              <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">No attendance data available for this period.</p>
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

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">SSS Contribution</span>
                      <span className="text-red-600">- ₱{calculations.deductions.sss.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">PhilHealth</span>
                      <span className="text-red-600">- ₱{calculations.deductions.philHealth.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pag-IBIG</span>
                      <span className="text-red-600">- ₱{calculations.deductions.pagIbig.toFixed(2)}</span>
                    </div>

                    {calculations.deductions.tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Withholding Tax</span>
                        <span className="text-red-600">- ₱{calculations.deductions.tax.toFixed(2)}</span>
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
              disabled={!calculations || !selectedEmployee}
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Generate Payslip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
