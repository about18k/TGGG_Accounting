import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Calendar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea
} from '../../../components/ui/accounting-ui';
import { 
  Clock, 
  CalendarDays, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  Download,
  Filter,
  MapPin,
  Users,
  TrendingUp,
  TrendingDown,
  Coffee,
  Home,
  Plane,
  Heart,
  Stethoscope,
  Calendar as CalendarIcon
} from 'lucide-react';

const mockLeaveRequests = [
  {
    id: 1,
    employee: 'Sarah Johnson',
    type: 'Vacation',
    startDate: '2024-02-15',
    endDate: '2024-02-20',
    days: 5,
    status: 'Pending',
    reason: 'Family vacation to Hawaii',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1d3?w=40&h=40&fit=crop&crop=face'
  },
  {
    id: 2,
    employee: 'Mike Chen',
    type: 'Sick Leave',
    startDate: '2024-01-20',
    endDate: '2024-01-22',
    days: 3,
    status: 'Approved',
    reason: 'Medical appointment and recovery',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face'
  },
  {
    id: 3,
    employee: 'Lisa Brown',
    type: 'Personal',
    startDate: '2024-02-01',
    endDate: '2024-02-01',
    days: 1,
    status: 'Rejected',
    reason: 'Personal errands',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face'
  }
];

const leaveTypes = [
  { value: 'vacation', label: 'Vacation', icon: Plane, color: 'bg-blue-100 text-blue-800' },
  { value: 'sick', label: 'Sick Leave', icon: Stethoscope, color: 'bg-red-100 text-red-800' },
  { value: 'personal', label: 'Personal', icon: Coffee, color: 'bg-purple-100 text-purple-800' },
  { value: 'maternity', label: 'Maternity', icon: Heart, color: 'bg-pink-100 text-pink-800' },
  { value: 'bereavement', label: 'Bereavement', icon: Heart, color: 'bg-gray-100 text-gray-800' },
];

const mockLeaveBalance = {
  vacation: { used: 8, total: 25 },
  sick: { used: 3, total: 10 },
  personal: { used: 2, total: 5 },
  maternity: { used: 0, total: 90 },
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
  return Number(((outMinutes - inMinutes) / 60).toFixed(2));
};

export function AttendanceLeave() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLeaveRequestOpen, setIsLeaveRequestOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('attendance');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportEmployee, setExportEmployee] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const fetchAttendanceRecords = async () => {
    setIsAttendanceLoading(true);
    setAttendanceError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setAttendanceError('Missing login token. Please login again.');
        setAttendanceRecords([]);
        return;
      }

      const response = await axios.get(`${API_URL}/attendance/all/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAttendanceRecords(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
      setAttendanceError(error.response?.data?.error || 'Failed to load attendance records.');
      setAttendanceRecords([]);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceRecords();
  }, []);

  const getStatusBadge = (status) => {
    const variants = {
      'Present': 'bg-primary/10 text-primary border-primary',
      'Absent': 'bg-red-100 text-red-800',
      'Late': 'bg-yellow-100 text-yellow-800',
      'On Leave': 'bg-blue-100 text-blue-800',
      'Excused Absence': 'bg-purple-100 text-purple-800',
      'Sick Leave': 'bg-purple-100 text-purple-800',
      'Vacation': 'bg-blue-100 text-blue-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-primary/10 text-primary border-primary',
      'Rejected': 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const getLeaveTypeIcon = (type) => {
    const leaveType = leaveTypes.find(lt => lt.label.toLowerCase().includes(type.toLowerCase()));
    if (leaveType) {
      const Icon = leaveType.icon;
      return <Icon className="w-4 h-4" />;
    }
    return <CalendarIcon className="w-4 h-4" />;
  };

  const attendanceStats = useMemo(() => {
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(
      (record) => ['present', 'late'].includes(record?.status)
    ).length;
    const totalHours = attendanceRecords.reduce((sum, record) => sum + getWorkedHours(record), 0);

    return {
      attendanceRate: totalRecords ? Number(((presentCount / totalRecords) * 100).toFixed(1)) : 0,
      totalHoursWorked: Number(totalHours.toFixed(1)),
      averageHoursPerDay: totalRecords ? Number((totalHours / totalRecords).toFixed(1)) : 0,
    };
  }, [attendanceRecords]);

  const employeeOptions = useMemo(() => {
    const names = attendanceRecords
      .map((record) => record.employee_name)
      .filter(Boolean);
    return ['all', ...Array.from(new Set(names))];
  }, [attendanceRecords]);

  const handleExportReport = () => {
    if (!exportStartDate || !exportEndDate) {
      alert('Please select both start and end dates.');
      return;
    }

    const start = new Date(exportStartDate);
    const end = new Date(exportEndDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      alert('Please provide valid dates.');
      return;
    }

    if (start > end) {
      alert('Start date must be before or equal to end date.');
      return;
    }

    const filtered = attendanceRecords.filter((record) => {
      const recordDate = new Date(record.date);
      if (Number.isNaN(recordDate.getTime())) return false;
      if (recordDate < start || recordDate > end) return false;
      if (exportEmployee !== 'all' && record.employee_name !== exportEmployee) return false;
      return true;
    });

    if (!filtered.length) {
      alert('No attendance records found for the selected filters.');
      return;
    }

    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const now = new Date();

      doc.setFontSize(16);
      doc.text('Attendance Report', 14, 14);

      doc.setFontSize(10);
      doc.text('Employee: ' + (exportEmployee === 'all' ? 'All employees' : exportEmployee), 14, 20);
      doc.text(
        'Date range: ' + start.toLocaleDateString() + ' - ' + end.toLocaleDateString(),
        14,
        26
      );
      doc.text('Generated: ' + now.toLocaleString(), 14, 32);

      const tableBody = filtered.map((record) => [
        new Date(record.date).toLocaleDateString(),
        record.employee_name || '-',
        record.time_in || '-',
        record.time_out || '-',
        String(getWorkedHours(record)) + 'h',
        record.status_label || record.status || '-',
        record.location || '-',
      ]);

      autoTable(doc, {
        startY: 38,
        head: [['Date', 'Employee', 'Time In', 'Time Out', 'Hours Worked', 'Status', 'Location']],
        body: tableBody,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [32, 34, 37], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      doc.save('attendance_report_' + exportStartDate + '_' + exportEndDate + '.pdf');
      setIsExportOpen(false);
    } catch (error) {
      console.error('Failed to export attendance report:', error);
      alert('Failed to export attendance report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end gap-2">
        <div className="flex gap-2">
          <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Export Attendance Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="exportStart">Start Date</Label>
                    <Input
                      id="exportStart"
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exportEnd">End Date</Label>
                    <Input
                      id="exportEnd"
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exportEmployee">Employee</Label>
                  <Select value={exportEmployee} onValueChange={setExportEmployee}>
                    <SelectTrigger id="exportEmployee">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All employees</SelectItem>
                      {employeeOptions
                        .filter((name) => name !== 'all')
                        .map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsExportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleExportReport} disabled={isExporting}>
                  {isExporting ? 'Exporting...' : 'Generate PDF'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isLeaveRequestOpen} onOpenChange={setIsLeaveRequestOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Request Leave</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveType">Leave Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input id="startDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea id="reason" placeholder="Please provide a reason for your leave request..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsLeaveRequestOpen(false)}>Cancel</Button>
                <Button onClick={() => setIsLeaveRequestOpen(false)}>Submit Request</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-linear-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-medium">{attendanceStats.attendanceRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <Progress value={attendanceStats.attendanceRate} className="mt-3" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hours Worked</p>
                <p className="text-2xl font-medium">{attendanceStats.totalHoursWorked}h</p>
              </div>
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">This month</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Hours/Day</p>
                <p className="text-2xl font-medium">{attendanceStats.averageHoursPerDay}h</p>
              </div>
              <CalendarDays className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leave Requests</p>
                <p className="text-2xl font-medium">{mockLeaveRequests.filter(req => req.status === 'Pending').length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Pending approval</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-6">
          {/* Recent Attendance */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Attendance Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAttendanceLoading ? (
                <p className="text-sm text-muted-foreground">Loading attendance records...</p>
              ) : attendanceError ? (
                <p className="text-sm text-red-600">{attendanceError}</p>
              ) : attendanceRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance records found.</p>
              ) : (
                <div className="space-y-4">
                  {attendanceRecords.map((record) => {
                    const dateObj = new Date(record.date);
                    const dayLabel = Number.isNaN(dateObj.getTime())
                      ? '-'
                      : dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                    const dayNumber = Number.isNaN(dateObj.getTime()) ? '-' : dateObj.getDate();
                    const monthLabel = Number.isNaN(dateObj.getTime())
                      ? '-'
                      : dateObj.toLocaleDateString('en-US', { month: 'short' });
                    const workedHours = getWorkedHours(record);

                    return (
                      <div key={record.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-sm font-medium">{dayNumber}</p>
                            <p className="text-xs text-muted-foreground">{monthLabel}</p>
                          </div>
                          <div>
                            <p className="font-medium">{record.employee_name || 'Unknown Employee'}</p>
                            <p className="text-sm text-muted-foreground">{dayLabel}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>In: {record.time_in || '-'}</span>
                              <span>Out: {record.time_out || '-'}</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {record.location || '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">{workedHours}h</p>
                            <p className="text-xs text-muted-foreground">Hours</p>
                          </div>
                          {getStatusBadge(record.status_label || record.status || 'Unknown')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          
        </TabsContent>

        <TabsContent value="leave" className="space-y-6">
          {/* Leave Balance */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Leave Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(mockLeaveBalance).map(([type, balance]) => {
                  const leaveType = leaveTypes.find(lt => lt.value === type);
                  const Icon = leaveType?.icon || CalendarIcon;
                  const percentage = (balance.used / balance.total) * 100;
                  
                  return (
                    <div key={type} className="p-4 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-5 h-5 text-primary" />
                        <p className="font-medium capitalize">{type}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Used</span>
                          <span>{balance.used}/{balance.total} days</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {balance.total - balance.used} days remaining
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Leave Requests */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockLeaveRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={request.avatar} alt={request.employee} />
                        <AvatarFallback>{request.employee.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.employee}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getLeaveTypeIcon(request.type)}
                          <span>{request.type}</span>
                          <span>•</span>
                          <span>{request.days} day{request.days > 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(request.status)}
                      {request.status === 'Pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Reject</Button>
                          <Button size="sm">Approve</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2 border-0 shadow-lg bg-linear-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Attendance Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {/* Legend and Today's Info */}
            <div className="space-y-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Legend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-green-500"></div>
                      <span className="text-sm">Present</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-red-500"></div>
                      <span className="text-sm">Absent</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-yellow-500"></div>
                      <span className="text-sm">Late</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-blue-500"></div>
                      <span className="text-sm">Leave</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-purple-500"></div>
                      <span className="text-sm">Holiday</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Today's Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Check In</span>
                      <Badge className="bg-primary/10 text-primary border-primary">09:00 AM</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Current Status</span>
                      <Badge className="bg-primary/10 text-primary border-primary">Working</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Hours Today</span>
                      <span className="text-sm font-medium">7.5h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Location</span>
                      <span className="text-sm">Office</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
