import React, { useEffect, useMemo, useState } from 'react';
import { getAllAttendance } from '../../../services/attendanceService';
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
} from '../../../components/ui/accounting-ui';
import {
  Clock,
  CalendarDays,
  Download,
  Filter,
  MapPin,
  Users,
  TrendingUp,
  TrendingDown,
  Home,
} from 'lucide-react';

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
  const [selectedTab, setSelectedTab] = useState('attendance');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportEmployee, setExportEmployee] = useState('all');
  const [isExporting, setIsExporting] = useState(false);


  const fetchAttendanceRecords = async () => {
    setIsAttendanceLoading(true);
    setAttendanceError('');
    try {
      const data = await getAllAttendance();
      setAttendanceRecords(Array.isArray(data) ? data : []);
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
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 max-w-md">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
