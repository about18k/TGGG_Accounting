import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { TableSkeleton } from '../../../components/SkeletonLoader';
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
  CardAction,
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
  RefreshCcw,
  Users,
  CheckCircle2,
  UserCheck,
  Download,
  ArrowUpDown,
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

const getWeekNumber = (dateString) => {
  if (!dateString) return '';
  const dateObj = new Date(dateString);
  if (Number.isNaN(dateObj.getTime())) return '';
  const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const getSortLabel = (key) => {
  switch (key) {
    case 'date-desc': return 'Date (Newest First)';
    case 'date-asc': return 'Date (Oldest First)';
    case 'name-asc': return 'Employee Name (A-Z)';
    case 'name-desc': return 'Employee Name (Z-A)';
    case 'hours-desc': return 'Total Hours (Highest First)';
    case 'hours-asc': return 'Total Hours (Lowest First)';
    case 'week-desc': return 'Week (Newest First)';
    case 'week-asc': return 'Week (Oldest First)';
    case 'month-desc': return 'Month (Newest First)';
    case 'month-asc': return 'Month (Oldest First)';
    default: return 'Date (Newest First)';
  }
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
  const [sortBy, setSortBy] = useState('date-desc');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);


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

    const list = Object.values(groups);

    if (sortBy === 'date-desc') {
      return list.sort((a, b) => b.date.localeCompare(a.date));
    }
    if (sortBy === 'date-asc') {
      return list.sort((a, b) => a.date.localeCompare(b.date));
    }
    if (sortBy === 'name-asc') {
      return list.sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''));
    }
    if (sortBy === 'name-desc') {
      return list.sort((a, b) => (b.employee_name || '').localeCompare(a.employee_name || ''));
    }
    if (sortBy === 'hours-desc') {
      return list.sort((a, b) => {
        const getHours = (g) => [g.morning, g.afternoon, g.overtime].reduce((acc, r) => acc + (r ? getWorkedHours(r) : 0), 0);
        return getHours(b) - getHours(a);
      });
    }
    if (sortBy === 'hours-asc') {
      return list.sort((a, b) => {
        const getHours = (g) => [g.morning, g.afternoon, g.overtime].reduce((acc, r) => acc + (r ? getWorkedHours(r) : 0), 0);
        return getHours(a) - getHours(b);
      });
    }
    if (sortBy === 'week-desc') {
      return list.sort((a, b) => {
        const weekA = getWeekNumber(a.date);
        const weekB = getWeekNumber(b.date);
        if (weekA !== weekB) return weekB.localeCompare(weekA);
        return b.date.localeCompare(a.date);
      });
    }
    if (sortBy === 'week-asc') {
      return list.sort((a, b) => {
        const weekA = getWeekNumber(a.date);
        const weekB = getWeekNumber(b.date);
        if (weekA !== weekB) return weekA.localeCompare(weekB);
        return a.date.localeCompare(b.date);
      });
    }
    if (sortBy === 'month-desc') {
      return list.sort((a, b) => {
        const monthA = a.date ? a.date.slice(0, 7) : '';
        const monthB = b.date ? b.date.slice(0, 7) : '';
        if (monthA !== monthB) return monthB.localeCompare(monthA);
        return b.date.localeCompare(a.date);
      });
    }
    if (sortBy === 'month-asc') {
      return list.sort((a, b) => {
        const monthA = a.date ? a.date.slice(0, 7) : '';
        const monthB = b.date ? b.date.slice(0, 7) : '';
        if (monthA !== monthB) return monthA.localeCompare(monthB);
        return a.date.localeCompare(b.date);
      });
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords, sortBy]);

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

  const stats = useMemo(() => {
    const total = groupedRecords.length;
    let present = 0;
    let late = 0;
    let leave = 0;

    attendanceRecords.forEach((r) => {
      const status = r.status_label || r.status || '';
      if (status === 'Present' || status === 'Approved') present++;
      else if (status === 'Late' || status === 'Pending') late++;
      else if (status.toLowerCase().includes('leave') || status === 'Vacation') leave++;
    });

    return { total, present, late, leave };
  }, [attendanceRecords, groupedRecords]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
        <div className="p-6 sm:p-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7120]/80">Accounting Department</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">Attendance Records</h1>
            <p className="mt-3 text-sm text-white/60 max-w-2xl">
              Monitor employee clock-ins, clock-outs, locations, and session timings.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchAttendanceRecords}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/10 transition text-sm font-semibold"
            >
              <RefreshCcw className={`h-4 w-4 ${isAttendanceLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Days Logged */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">Total Days Logged</p>
              <p className="text-2xl font-bold mt-2 text-white">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>

        {/* Present Entries */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">Present Entries</p>
              <p className="text-2xl font-bold mt-2 text-white">{stats.present}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>

        {/* Late Entries */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">Late Entries</p>
              <p className="text-2xl font-bold mt-2 text-white">{stats.late}</p>
            </div>
            <Clock className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>

        {/* Leave Entries */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">On Leave / Vacation</p>
              <p className="text-2xl font-bold mt-2 text-white">{stats.leave}</p>
            </div>
            <UserCheck className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.22)] bg-[#001f35]/70 backdrop-blur-md rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ArrowUpDown className="w-5 h-5 text-[#FF7120]" />
            <div 
              className="relative text-left"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => {
                setIsDropdownOpen(false);
                setActiveSubmenu(null);
              }}
            >
              <button 
                type="button"
                className="flex items-center justify-between gap-2 px-4 py-2 bg-[#00273C]/60 hover:bg-[#00273C]/90 text-white rounded-xl border border-white/10 text-sm font-semibold transition w-[240px] h-10"
              >
                <span className="truncate">Sort By: {getSortLabel(sortBy)}</span>
                <span className="text-white/40 text-xs">▼</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 mt-1 w-56 bg-[#001f35]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl z-50 py-1">
                  
                  {/* Date category */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setActiveSubmenu('date')}
                  >
                    <div className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer rounded-lg mx-1 transition-colors ${activeSubmenu === 'date' ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                      <span>Date</span>
                      <span className="text-[10px] text-white/40">▶</span>
                    </div>
                    {activeSubmenu === 'date' && (
                      <div 
                        className="absolute left-full top-0 ml-1 w-48 bg-[#001f35]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl py-1 z-50"
                        onMouseLeave={() => setActiveSubmenu(null)}
                      >
                        <div 
                          onClick={() => { setSortBy('date-desc'); setIsDropdownOpen(false); }}
                          className={`px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg mx-1 transition-colors ${sortBy === 'date-desc' ? 'bg-[#FF7120]/20 text-[#FF7120] font-semibold' : ''}`}
                        >
                          Newest First
                        </div>
                        <div 
                          onClick={() => { setSortBy('date-asc'); setIsDropdownOpen(false); }}
                          className={`px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg mx-1 transition-colors ${sortBy === 'date-asc' ? 'bg-[#FF7120]/20 text-[#FF7120] font-semibold' : ''}`}
                        >
                          Oldest First
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Employee Name category */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setActiveSubmenu('name')}
                  >
                    <div className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer rounded-lg mx-1 transition-colors ${activeSubmenu === 'name' ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                      <span>Employee Name</span>
                      <span className="text-[10px] text-white/40">▶</span>
                    </div>
                    {activeSubmenu === 'name' && (
                      <div 
                        className="absolute left-full top-0 ml-1 w-48 bg-[#001f35]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl py-1 z-50"
                        onMouseLeave={() => setActiveSubmenu(null)}
                      >
                        <div 
                          onClick={() => { setSortBy('name-asc'); setIsDropdownOpen(false); }}
                          className={`px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg mx-1 transition-colors ${sortBy === 'name-asc' ? 'bg-[#FF7120]/20 text-[#FF7120] font-semibold' : ''}`}
                        >
                          A to Z
                        </div>
                        <div 
                          onClick={() => { setSortBy('name-desc'); setIsDropdownOpen(false); }}
                          className={`px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg mx-1 transition-colors ${sortBy === 'name-desc' ? 'bg-[#FF7120]/20 text-[#FF7120] font-semibold' : ''}`}
                        >
                          Z to A
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Total Hours category */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setActiveSubmenu('hours')}
                  >
                    <div className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer rounded-lg mx-1 transition-colors ${activeSubmenu === 'hours' ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                      <span>Total Hours</span>
                      <span className="text-[10px] text-white/40">▶</span>
                    </div>
                    {activeSubmenu === 'hours' && (
                      <div 
                        className="absolute left-full top-0 ml-1 w-48 bg-[#001f35]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl py-1 z-50"
                        onMouseLeave={() => setActiveSubmenu(null)}
                      >
                        <div 
                          onClick={() => { setSortBy('hours-desc'); setIsDropdownOpen(false); }}
                          className={`px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg mx-1 transition-colors ${sortBy === 'hours-desc' ? 'bg-[#FF7120]/20 text-[#FF7120] font-semibold' : ''}`}
                        >
                          Highest First
                        </div>
                        <div 
                          onClick={() => { setSortBy('hours-asc'); setIsDropdownOpen(false); }}
                          className={`px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg mx-1 transition-colors ${sortBy === 'hours-asc' ? 'bg-[#FF7120]/20 text-[#FF7120] font-semibold' : ''}`}
                        >
                          Lowest First
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Week category */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setActiveSubmenu('week')}
                  >
                    <div className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer rounded-lg mx-1 transition-colors ${activeSubmenu === 'week' ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                      <span>Week</span>
                      <span className="text-[10px] text-white/40">▶</span>
                    </div>
                    {activeSubmenu === 'week' && (
                      <div 
                        className="absolute left-full top-0 ml-1 w-48 bg-[#001f35]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl py-1 z-50"
                        onMouseLeave={() => setActiveSubmenu(null)}
                      >
                        <div 
                          onClick={() => { setSortBy('week-desc'); setIsDropdownOpen(false); }}
                          className={`px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg mx-1 transition-colors ${sortBy === 'week-desc' ? 'bg-[#FF7120]/20 text-[#FF7120] font-semibold' : ''}`}
                        >
                          Newest First
                        </div>
                        <div 
                          onClick={() => { setSortBy('week-asc'); setIsDropdownOpen(false); }}
                          className={`px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg mx-1 transition-colors ${sortBy === 'week-asc' ? 'bg-[#FF7120]/20 text-[#FF7120] font-semibold' : ''}`}
                        >
                          Oldest First
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Month category */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setActiveSubmenu('month')}
                  >
                    <div className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer rounded-lg mx-1 transition-colors ${activeSubmenu === 'month' ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                      <span>Month</span>
                      <span className="text-[10px] text-white/40">▶</span>
                    </div>
                    {activeSubmenu === 'month' && (
                      <div 
                        className="absolute left-full top-0 ml-1 w-48 bg-[#001f35]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl py-1 z-50"
                        onMouseLeave={() => setActiveSubmenu(null)}
                      >
                        <div 
                          onClick={() => { setSortBy('month-desc'); setIsDropdownOpen(false); }}
                          className={`px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg mx-1 transition-colors ${sortBy === 'month-desc' ? 'bg-[#FF7120]/20 text-[#FF7120] font-semibold' : ''}`}
                        >
                          Newest First
                        </div>
                        <div 
                          onClick={() => { setSortBy('month-asc'); setIsDropdownOpen(false); }}
                          className={`px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg mx-1 transition-colors ${sortBy === 'month-asc' ? 'bg-[#FF7120]/20 text-[#FF7120] font-semibold' : ''}`}
                        >
                          Oldest First
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>
          <CardAction>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsExportOpen(true)}
            >
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
            {isAttendanceLoading ? (
                <TableSkeleton />
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
