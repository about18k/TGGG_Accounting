import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getAllAttendance } from '../../../services/attendanceService';
import PrintAttendance from '../../globalattendancereport/PrintAttendance';
import {
  formatTime12,
  calculateTotalHours,
  formatDurationFromHours,
} from '../../../utils/attendanceFormatters';
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
  SelectValue,
} from '../../../components/ui/accounting-ui';
import {
  Clock,
} from 'lucide-react';

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

const getSafeErrorMessage = (error, fallbackMessage) => {
  const rawError = error?.response?.data?.error;
  if (typeof rawError === 'string') {
    const sample = rawError.trim().slice(0, 200).toLowerCase();
    if (sample.includes('<!doctype html') || sample.includes('<html')) {
      return fallbackMessage;
    }
    if (rawError.trim()) return rawError;
  }

  const rawDetail = error?.response?.data?.detail;
  if (typeof rawDetail === 'string') {
    const sample = rawDetail.trim().slice(0, 200).toLowerCase();
    if (sample.includes('<!doctype html') || sample.includes('<html')) {
      return fallbackMessage;
    }
    if (rawDetail.trim()) return rawDetail;
  }

  return error?.message || fallbackMessage;
};

export function AttendanceLeave() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportEmployee, setExportEmployee] = useState('all');
  const [showDTROverlay, setShowDTROverlay] = useState(false);


  const fetchAttendanceRecords = async () => {
    setIsAttendanceLoading(true);
    setAttendanceError('');
    try {
      const data = await getAllAttendance();
      setAttendanceRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
      setAttendanceError(getSafeErrorMessage(error, 'Failed to load attendance records.'));
      setAttendanceRecords([]);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceRecords();
  }, []);

  useEffect(() => {
    const openExportDialog = () => setIsExportOpen(true);
    window.addEventListener('open-accounting-attendance-export', openExportDialog);
    return () => {
      window.removeEventListener('open-accounting-attendance-export', openExportDialog);
    };
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

  const groupedRecords = useMemo(() => {
    const groups = {};
    attendanceRecords.forEach((record) => {
      const empId = record.employee_id || record.user_id;
      const key = `${empId}-${record.date}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          employee_id: empId,
          employee_name: record.employee_name,
          date: record.date,
          morning: null,
          afternoon: null,
          overtime: null,
        };
      }
      const session = record.session_type?.toLowerCase();
      if (session === 'morning') groups[key].morning = record;
      else if (session === 'afternoon') groups[key].afternoon = record;
      else if (session === 'overtime') groups[key].overtime = record;
      else if (!groups[key].morning) groups[key].morning = record;
    });
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords]);

  const LocationDisplay = ({ record, label }) => {
    if (!record) return null;
    const inLoc = record.clock_in_address || record.location || '-';
    const outLoc = record.clock_out_address || record.location || '-';

    // Simple cleaner for coordinate strings if and only if addresses are missing
    const formatLoc = (loc) => {
      if (loc && loc.includes('lat=') && loc.includes('lng=')) {
        const lat = loc.match(/lat=([\d.-]+)/)?.[1];
        const lng = loc.match(/lng=([\d.-]+)/)?.[2];
        if (lat && lng) return `${lat}, ${lng}`;
      }
      return loc;
    };

    return (
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground mt-1">
        <div className="font-medium text-white/40 uppercase text-[9px] tracking-wider">{label} Session</div>
        <div className="flex items-center gap-1">
          <span className="text-emerald-400/80 font-medium w-8">In:</span>
          <span className="truncate max-w-[200px]" title={inLoc}>{formatLoc(inLoc)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-orange-400/80 font-medium w-8">Out:</span>
          <span className="truncate max-w-[200px]" title={record.time_out ? outLoc : '---'}>
            {record.time_out ? formatLoc(outLoc) : '---'}
          </span>
        </div>
      </div>
    );
  };

  const employeeOptions = useMemo(() => {
    const names = attendanceRecords
      .map((record) => record.employee_name)
      .filter(Boolean);
    return ['all', ...Array.from(new Set(names))];
  }, [attendanceRecords]);

  // Unique employees with their IDs for the DTR overlay
  const uniqueEmployees = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const record of attendanceRecords) {
      const empId = record.employee_id ?? record.user_id;
      if (empId != null && !seen.has(empId)) {
        seen.add(empId);
        result.push({ id: empId, name: record.employee_name || String(empId) });
      }
    }
    return result;
  }, [attendanceRecords]);

  const sortedAttendanceDates = useMemo(
    () => attendanceRecords.map((record) => record.date).filter(Boolean).sort(),
    [attendanceRecords]
  );

  // Default date range: first and last attendance entry in the system
  const defaultExportStartDate = sortedAttendanceDates[0] || '';
  const defaultExportEndDate = sortedAttendanceDates[sortedAttendanceDates.length - 1] || '';

  // Set default date range once records are loaded
  useEffect(() => {
    if (defaultExportStartDate && !exportStartDate) setExportStartDate(defaultExportStartDate);
    if (defaultExportEndDate && !exportEndDate) setExportEndDate(defaultExportEndDate);
  }, [defaultExportStartDate, defaultExportEndDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenDTR = () => {
    if (!exportStartDate || !exportEndDate) {
      toast.error('Validation Error', { description: 'Please select both start and end dates.' });
      return;
    }
    const start = new Date(exportStartDate);
    const end = new Date(exportEndDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error('Validation Error', { description: 'Please provide valid dates.' });
      return;
    }
    if (start > end) {
      toast.error('Validation Error', { description: 'Start date must be before or equal to end date.' });
      return;
    }
    setIsExportOpen(false);
    setShowDTROverlay(true);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
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
              ) : groupedRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance records found.</p>
              ) : (
                <div className="space-y-4">
                  {groupedRecords.map((group) => {
                    const dateObj = new Date(group.date);
                    const dayLabel = Number.isNaN(dateObj.getTime())
                      ? '-'
                      : dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                    const dayNumber = Number.isNaN(dateObj.getTime()) ? '-' : dateObj.getDate();
                    const monthLabel = Number.isNaN(dateObj.getTime())
                      ? '-'
                      : dateObj.toLocaleDateString('en-US', { month: 'short' });

                    const totalMinsFromApi = [group.morning, group.afternoon, group.overtime]
                      .reduce((acc, r) => acc + (r ? parseFloat(r.total_minutes_worked || 0) : 0), 0);
                    const totalHoursFromTimes = [group.morning, group.afternoon, group.overtime]
                      .reduce((acc, r) => acc + (r ? getWorkedHours(r) : 0), 0);
                    const totalHoursLabel = calculateTotalHours(group.morning, group.afternoon, group.overtime);
                    const fallbackHoursLabel = formatDurationFromHours(totalMinsFromApi > 0 ? totalMinsFromApi / 60 : totalHoursFromTimes);

                    return (
                      <div key={group.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border/50 transition-colors gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="text-center shrink-0 min-w-[40px]">
                            <p className="text-sm font-medium">{dayNumber}</p>
                            <p className="text-xs text-muted-foreground">{monthLabel}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white mb-1">{group.employee_name || 'Unknown Employee'}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                              {group.morning && (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-primary transition-colors">
                                    AM: {formatTime12(group.morning.time_in)} - {formatTime12(group.morning.time_out)}
                                  </p>
                                  <LocationDisplay record={group.morning} label="Morning" />
                                </div>
                              )}
                              {group.afternoon && (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-primary">
                                    PM: {formatTime12(group.afternoon.time_in)} - {formatTime12(group.afternoon.time_out)}
                                  </p>
                                  <LocationDisplay record={group.afternoon} label="Afternoon" />
                                </div>
                              )}
                              {group.overtime && (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-primary">
                                    OT: {formatTime12(group.overtime.time_in)} - {formatTime12(group.overtime.time_out)}
                                  </p>
                                  <LocationDisplay record={group.overtime} label="Overtime" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 justify-end mt-2 md:mt-0">
                          <div className="text-right">
                            <p className="text-sm font-medium">{totalHoursLabel !== '-' ? totalHoursLabel : fallbackHoursLabel}</p>
                            <p className="text-xs text-muted-foreground">Total Hours</p>
                          </div>
                          {getStatusBadge(
                            group.morning?.status_label || 
                            group.afternoon?.status_label || 
                            group.overtime?.status_label || 
                            'Unknown'
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

      </div>

      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
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
            <Button onClick={handleOpenDTR}>
              Print DTR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DTR print overlay – covers full screen using the existing PrintAttendance template */}
      {showDTROverlay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, overflowY: 'auto', background: '#f5f5f5' }}>
          <PrintAttendance
            employees={
              exportEmployee === 'all'
                ? uniqueEmployees
                : uniqueEmployees.filter((e) => e.name === exportEmployee)
            }
            initialStartMonth={exportStartDate ? exportStartDate.slice(0, 7) : ''}
            initialEndMonth={exportEndDate ? exportEndDate.slice(0, 7) : ''}
            onClose={() => setShowDTROverlay(false)}
          />
        </div>
      )}
    </div>
  );
}
