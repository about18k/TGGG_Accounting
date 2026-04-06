import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getAccountingEmployees, addAccountingEmployee, updateAccountingEmployee } from '../../../services/adminService';
import { getAllAttendance } from '../../../services/attendanceService';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { formatDurationFromHours } from '../../../utils/attendanceFormatters';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  UserCheck,
  UserX,
  Building,
  Briefcase,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';


const roleFilters = ['All', 'Accounting', 'Site Coordinator', 'Site Engineer', 'BIM Specialist', 'Interns', 'Junior Designer', 'Studio Head'];
const statuses = ['All', 'Active', 'On Leave', 'Inactive'];
const roleFilterMap = {
  Accounting: 'accounting',
  'Site Coordinator': 'site_coordinator',
  'Site Engineer': 'site_engineer',
  'BIM Specialist': 'bim_specialist',
  Interns: 'intern',
  'Junior Designer': 'junior_architect',
  'Studio Head': 'studio_head',
};
const normalizeRole = (value = '') => {
  const v = value.toLowerCase().trim();
  if (v === 'intern') return 'interns';
  if (v === 'junior architect') return 'junior designer';
  return v;
};

const timeToMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== 'string' || !timeValue.includes(':')) return null;
  const [hourPart, minutePart] = timeValue.split(':');
  const hours = Number(hourPart);
  const minutes = Number(minutePart);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
};

const getWorkedHours = (record) => {
  const inMinutes = timeToMinutes(record?.time_in);
  const outMinutes = timeToMinutes(record?.time_out);
  if (inMinutes === null || outMinutes === null || outMinutes < inMinutes) return 0;
  return (outMinutes - inMinutes) / 60;
};

export function EmployeeManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [isUpdatingEmployee, setIsUpdatingEmployee] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    startDate: '',
    status: 'Active',
    salary: '',
  });
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    startDate: '',
    temporary_password: '',
  });



  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const roleFilter = roleFilterMap[selectedDepartment] || undefined;
      const data = await getAccountingEmployees({
        active_only: true,
        ...(roleFilter ? { role: roleFilter } : {}),
      });
      setEmployees(data);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [selectedDepartment]);

  useEffect(() => {
    let isActive = true;

    const fetchAttendanceRecords = async () => {
      setIsAttendanceLoading(true);
      try {
        const data = await getAllAttendance();
        if (!isActive) return;
        setAttendanceRecords(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch attendance records:', error);
        if (isActive) {
          setAttendanceRecords([]);
        }
      } finally {
        if (isActive) {
          setIsAttendanceLoading(false);
        }
      }
    };

    fetchAttendanceRecords();

    return () => {
      isActive = false;
    };
  }, []);

  const handleAddEmployee = async () => {
    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const email = formData.email.trim();
    const temporaryPassword = formData.temporary_password;

    if (!firstName || !lastName || !email) {
      toast.error('Validation Error', {
        description: 'First name, last name, and email are required.',
      });
      return;
    }

    if (!temporaryPassword || temporaryPassword.length < 8) {
      toast.error('Validation Error', {
        description: 'Temporary password is required and must be at least 8 characters.',
      });
      return;
    }

    const confirmed = window.confirm(
      'Confirm employee creation?\n\nThe account will be submitted for Studio Head/Admin approval before login is allowed.'
    );
    if (!confirmed) return;

    setIsAddingEmployee(true);
    try {
      await addAccountingEmployee({
        first_name: firstName,
        last_name: lastName,
        email,
        startDate: formData.startDate,
        temporary_password: temporaryPassword,
      });
      setIsAddEmployeeOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        startDate: '',
        temporary_password: '',
      });
      fetchEmployees();
      toast.success('Employee Submitted', {
        description: 'The account is pending Studio Head/Admin approval and a confirmation email has been sent.',
      });
    } catch (error) {
      toast.error('Addition Failed', {
        description: error.response?.data?.error || error.message,
      });
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const handleExportEmployees = async () => {
    setIsExporting(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const allEmployees = await getAccountingEmployees({ active_only: true });
      if (!allEmployees?.length) {
        toast.error('Export Failed', { description: 'No employees available to export.' });
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const now = new Date();

      doc.setFontSize(16);
      doc.text('Employee Details Report', 14, 14);
      doc.setFontSize(10);
      doc.text(`Generated: ${now.toLocaleString()}`, 14, 20);
      doc.text(`Total Employees: ${allEmployees.length}`, 14, 26);

      autoTable(doc, {
        startY: 32,
        head: [[
          'Name',
          'Email',
          'Phone',
          'Department',
          'Position',
          'Status',
          'Join Date',
          'Salary',
          'Location',
          'Manager',
        ]],
        body: allEmployees.map((employee) => ([
          employee.name || '',
          employee.email || '',
          employee.phone || '',
          employee.department || '',
          employee.position || '',
          employee.status || '',
          employee.joinDate || '',
          employee.salary ? `$${Number(employee.salary).toLocaleString()}` : '',
          employee.location || '',
          employee.manager || '',
        ])),
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [2, 27, 44],
          textColor: [255, 255, 255],
        },
      });

      doc.save(`employees-${now.toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      toast.error('Export Failed', {
        description: error.response?.data?.error || error.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const openEmployeeDetails = (employee) => {
    setSelectedEmployee(employee);
    setIsEditingEmployee(false);
  };

  const startEditEmployee = () => {
    if (!selectedEmployee) return;
    const parts = String(selectedEmployee.name || '').trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ');
    setEditFormData({
      first_name: firstName,
      last_name: lastName,
      email: selectedEmployee.email || '',
      startDate: selectedEmployee.joinDate || '',
      status: selectedEmployee.status || 'Active',
      salary: selectedEmployee.salary || '',
    });
    setIsEditingEmployee(true);
  };

  const closeEmployeeDialog = () => {
    setSelectedEmployee(null);
    setIsEditingEmployee(false);
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    const firstName = editFormData.first_name.trim();
    const lastName = editFormData.last_name.trim();
    const email = editFormData.email.trim();

    if (!firstName || !lastName || !email) {
      toast.error('Validation Error', {
        description: 'First name, last name, and email are required.',
      });
      return;
    }

    setIsUpdatingEmployee(true);
    try {
      await updateAccountingEmployee(selectedEmployee.id, {
        first_name: firstName,
        last_name: lastName,
        email,
        startDate: editFormData.startDate || null,
        status: editFormData.status,
        salary: editFormData.salary || null,
      });

      toast.success('Employee Updated', { description: 'Employee updated successfully.' });
      setIsEditingEmployee(false);
      closeEmployeeDialog();
      fetchEmployees();
    } catch (error) {
      toast.error('Update Failed', {
        description: error.response?.data?.error || error.message,
      });
    } finally {
      setIsUpdatingEmployee(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return employees.filter((employee) => {
      const name = String(employee.name || '').toLowerCase();
      const email = String(employee.email || '').toLowerCase();
      const department = String(employee.department || '').toLowerCase();

      const matchesSearch =
        !search ||
        name.includes(search) ||
        email.includes(search) ||
        department.includes(search);

      const matchesDepartment =
        selectedDepartment === 'All' ||
        normalizeRole(employee.position) === normalizeRole(selectedDepartment);

      const matchesStatus = selectedStatus === 'All' || employee.status === selectedStatus;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchTerm, selectedDepartment, selectedStatus]);

  const employeeStats = useMemo(() => {
    let active = 0;
    let onLeave = 0;

    for (const employee of employees) {
      if (employee.status === 'Active') active += 1;
      if (employee.status === 'On Leave') onLeave += 1;
    }

    return {
      total: employees.length,
      active,
      onLeave,
    };
  }, [employees]);

  const employeeAttendanceStats = useMemo(() => {
    const byEmployee = new Map();

    attendanceRecords.forEach((record) => {
      const employeeId = record?.employee_id ?? record?.user_id;
      if (employeeId === undefined || employeeId === null) return;

      const key = String(employeeId);
      const status = String(record?.status || '').toLowerCase();
      const dateKey = record?.date || (record?.created_at ? String(record.created_at).slice(0, 10) : null);

      if (!byEmployee.has(key)) {
        byEmployee.set(key, {
          totalHours: 0,
          totalOvertimeHours: 0,
          totalLateHours: 0,
          dayMap: new Map(),
        });
      }

      const current = byEmployee.get(key);
      const workedHours = getWorkedHours(record);
      current.totalHours += workedHours;
      if (record?.session_type === 'overtime') {
        current.totalOvertimeHours += workedHours;
      }

      const lateHours = Number(record?.late_deduction_hours || 0);
      if (Number.isFinite(lateHours) && lateHours > 0) {
        current.totalLateHours += lateHours;
      }

      if (dateKey) {
        const dayStats = current.dayMap.get(dateKey) || {
          hasPresent: false,
          hasLate: false,
        };

        if (status === 'present' || status === 'late') {
          dayStats.hasPresent = true;
        }

        if (status === 'late' || Boolean(record?.is_late)) {
          dayStats.hasLate = true;
        }

        current.dayMap.set(dateKey, dayStats);
      }
    });

    const summary = new Map();

    byEmployee.forEach((data, employeeId) => {
      let totalDays = 0;
      let onTime = 0;
      let late = 0;

      data.dayMap.forEach((dayStats) => {
        if (!dayStats.hasPresent) return;
        totalDays += 1;
        if (dayStats.hasLate) {
          late += 1;
        } else {
          onTime += 1;
        }
      });

      summary.set(employeeId, {
        totalDays,
        totalHours: Number(data.totalHours.toFixed(2)),
        totalOvertime: Number(data.totalOvertimeHours.toFixed(2)),
        onTime,
        late,
        totalLate: Number(data.totalLateHours.toFixed(2)),
      });
    });

    return summary;
  }, [attendanceRecords]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExportEmployees}
            disabled={isExporting}
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} placeholder="Enter first name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} placeholder="Enter last name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Enter email address" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="temporaryPassword">Temporary Password</Label>
                  <div className="relative">
                    <Input
                      id="temporaryPassword"
                      type={showTemporaryPassword ? 'text' : 'password'}
                      value={formData.temporary_password}
                      onChange={e => setFormData({ ...formData, temporary_password: e.target.value })}
                      placeholder="Set a temporary password (min. 8 characters)"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTemporaryPassword(prev => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showTemporaryPassword ? 'Hide temporary password' : 'Show temporary password'}
                    >
                      {showTemporaryPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddEmployeeOpen(false)}>Cancel</Button>
                <Button onClick={handleAddEmployee} disabled={isAddingEmployee}>
                  {isAddingEmployee ? 'Adding...' : 'Add Employee'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-medium">{employeeStats.total}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-medium">{employeeStats.active}</p>
              </div>
              <UserCheck className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Leave</p>
                <p className="text-2xl font-medium">{employeeStats.onLeave}</p>
              </div>
              <UserX className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Roles</p>
                <p className="text-2xl font-medium">{roleFilters.length - 1}</p>
              </div>
              <Building className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue>
                  {selectedDepartment === 'All' ? 'All Roles' : selectedDepartment}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roleFilters.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue>
                  {selectedStatus === 'All' ? 'All Statuses' : selectedStatus}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Cards */}
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
                  <p className="mt-1 text-lg font-semibold tracking-tight leading-none text-[#FF6B00] truncate" title={isAttendanceLoading ? '...' : formatDurationFromHours(attendanceMetrics.totalOvertime)}>{isAttendanceLoading ? '...' : formatDurationFromHours(attendanceMetrics.totalOvertime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>
      </div>

      {/* Employee Detail Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => closeEmployeeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={selectedEmployee.avatar} alt={selectedEmployee.name} />
                    <AvatarFallback>{selectedEmployee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{selectedEmployee.name || '---'}</DialogTitle>
                    <p className="text-muted-foreground">{selectedEmployee.position || '---'}</p>
                    {getStatusBadge(selectedEmployee.status)}
                  </div>
                </div>
              </DialogHeader>
              {!isEditingEmployee ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Contact Information</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {selectedEmployee.email || '---'}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {selectedEmployee.location || '---'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Employment Details</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          {selectedEmployee.department || '---'}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="w-4 h-4 text-muted-foreground" />
                          {selectedEmployee.position || '---'}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          Joined {selectedEmployee.joinDate ? new Date(selectedEmployee.joinDate).toLocaleDateString() : '---'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployee.skills && selectedEmployee.skills.length > 0 ? selectedEmployee.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">{skill}</Badge>
                        )) : <span className="text-sm text-muted-foreground">---</span>}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Manager</h4>
                      <p className="text-sm">{selectedEmployee.manager || '---'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Salary</h4>
                      <p className="text-sm font-semibold text-green-600">{selectedEmployee.salary ? `₱${Number(selectedEmployee.salary).toLocaleString('en-PH')}` : '---'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName">First Name</Label>
                    <Input
                      id="editFirstName"
                      value={editFormData.first_name}
                      onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName">Last Name</Label>
                    <Input
                      id="editLastName"
                      value={editFormData.last_name}
                      onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="editEmail">Email</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editStartDate">Start Date</Label>
                    <Input
                      id="editStartDate"
                      type="date"
                      value={editFormData.startDate}
                      onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="editStatus">Status</Label>
                    <Select
                      value={editFormData.status}
                      onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                    >
                      <SelectTrigger id="editStatus">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="editSalary">Monthly Salary (₱)</Label>
                    <Input
                      id="editSalary"
                      type="number"
                      value={editFormData.salary}
                      onChange={(e) => setEditFormData({ ...editFormData, salary: e.target.value })}
                      placeholder="Enter monthly salary"
                      min="0"
                      step="100"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => (isEditingEmployee ? setIsEditingEmployee(false) : closeEmployeeDialog())}>
                  {isEditingEmployee ? 'Cancel' : 'Close'}
                </Button>
                {!isEditingEmployee ? (
                  <Button onClick={startEditEmployee}>Edit Employee</Button>
                ) : (
                  <Button onClick={handleUpdateEmployee} disabled={isUpdatingEmployee}>
                    {isUpdatingEmployee ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
