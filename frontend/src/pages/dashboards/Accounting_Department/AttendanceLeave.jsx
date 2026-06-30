import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { TableSkeleton } from '../../../components/SkeletonLoader';
import { getAllAttendance } from '../../../services/attendanceService';
import PrintAttendance from '../../globalattendancereport/PrintAttendance';
import {
  formatTime12 as formatTime12Util,
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
  Printer,
} from 'lucide-react';

// DTR helper calculations for the on-screen preview tab
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || timeStr === '-') return null;
  try {
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      const [time, meridiem] = timeStr.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (meridiem === 'PM' && h !== 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    }
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  } catch (e) {
    return null;
  }
};

const formatTime12 = (timeStr) => {
  if (!timeStr || timeStr === '-') return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    return timeStr.trim();
  }
  try {
    const [hours, minutes] = timeStr.split(':');
    const hr = parseInt(hours, 10);
    const m = minutes.substring(0, 2);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
    return `${displayHr}:${m} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
};

const getDailyDetailsHelper = (record, day, year, month) => {
  const totalDays = new Date(year, month, 0).getDate();
  if (day > totalDays) {
    return { amIn: '', amOut: '', pmIn: '', pmOut: '', hours: '', mins: '', lateMins: 0, isBlank: true };
  }

  if (!record) {
    return { amIn: '', amOut: '', pmIn: '', pmOut: '', hours: '', mins: '', lateMins: 0, isBlank: false };
  }

  const amInMin = parseTimeToMinutes(record.morning_time_in);
  const amOutMin = parseTimeToMinutes(record.morning_time_out);
  const pmInMin = parseTimeToMinutes(record.afternoon_time_in);
  const pmOutMin = parseTimeToMinutes(record.afternoon_time_out);

  let amMinutesWorked = 0;
  if (amInMin !== null && amOutMin !== null && amOutMin > amInMin) {
    const baselineStart = 8 * 60;
    let effIn = amInMin;
    if (amInMin <= baselineStart + 5) {
      effIn = baselineStart;
    } else {
      effIn = baselineStart + (amInMin - (baselineStart + 5));
    }
    const effOut = Math.min(amOutMin, 12 * 60); // 12:00 PM
    amMinutesWorked = Math.max(0, effOut - effIn);
  }

  let pmMinutesWorked = 0;
  if (pmInMin !== null && pmOutMin !== null && pmOutMin > pmInMin) {
    const baselineStart = 13 * 60;
    let effIn = pmInMin;
    if (pmInMin <= baselineStart + 5) {
      effIn = baselineStart;
    } else {
      effIn = baselineStart + (pmInMin - (baselineStart + 5));
    }
    const effOut = Math.min(pmOutMin, 17 * 60); // 5:00 PM
    pmMinutesWorked = Math.max(0, effOut - effIn);
  }

  const totalMinutes = amMinutesWorked + pmMinutesWorked;

  let dailyLateMins = 0;
  const morningCutoff = 8 * 60 + 5; // 8:05 AM
  const afternoonCutoff = 13 * 60 + 5; // 1:05 PM

  if (amInMin !== null && amInMin > morningCutoff) {
    dailyLateMins += (amInMin - morningCutoff);
  }
  if (pmInMin !== null && pmInMin > afternoonCutoff) {
    dailyLateMins += (pmInMin - afternoonCutoff);
  }

  return {
    amIn: record.morning_time_in ? formatTime12(record.morning_time_in) : '',
    amOut: record.morning_time_out ? formatTime12(record.morning_time_out) : '',
    pmIn: record.afternoon_time_in ? formatTime12(record.afternoon_time_in) : '',
    pmOut: record.afternoon_time_out ? formatTime12(record.afternoon_time_out) : '',
    hours: totalMinutes > 0 ? Math.floor(totalMinutes / 60) : '',
    mins: totalMinutes > 0 ? totalMinutes % 60 : '',
    rawMinutes: totalMinutes,
    lateMins: dailyLateMins,
    isBlank: false
  };
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

const formatLateMinutes = (totalMins) => {
  if (!totalMins || totalMins <= 0) return '0 mins';
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const hrLabel = hrs === 1 ? 'hr' : 'hrs';
  const minLabel = mins === 1 ? 'min' : 'mins';
  
  if (hrs > 0 && mins > 0) {
    return `${hrs} ${hrLabel} ${mins} ${minLabel}`;
  }
  if (hrs > 0) {
    return `${hrs} ${hrLabel}`;
  }
  return `${mins} ${minLabel}`;
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
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
      return null;
    }
  }, []);

  const isAccountingUser = useMemo(() => {
    if (!currentUser) return false;
    const role = String(currentUser.role || '').toLowerCase();
    const dept = String(currentUser.department_name || '').toLowerCase();
    return role === 'accounting' || dept === 'accounting department' || dept === 'accounting';
  }, [currentUser]);

  const inChargeName = useMemo(() => {
    if (!isAccountingUser || !currentUser) return '';
    const fullName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
    return fullName || currentUser.name || currentUser.username || '';
  }, [isAccountingUser, currentUser]);

  const inChargeSignature = useMemo(() => {
    if (!isAccountingUser || !currentUser) return null;
    return currentUser.signature_image || currentUser.signature || null;
  }, [isAccountingUser, currentUser]);

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

  // Tab State
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedPreviewEmployee, setSelectedPreviewEmployee] = useState('');
  const [selectedPreviewMonth, setSelectedPreviewMonth] = useState('');

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

  // Unique employees with their IDs - restricted to Interns only for DTR Preview/Print
  const uniqueEmployees = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const record of attendanceRecords) {
      const empId = record.employee_id ?? record.user_id;
      if (empId != null && !seen.has(empId)) {
        const isIntern = String(record.employee_role || '').toLowerCase() === 'intern';
        if (isIntern) {
          seen.add(empId);
          result.push({ 
            id: empId, 
            name: record.employee_name || String(empId),
            signature: record.employee_signature || null,
            role: record.employee_role || null
          });
        }
      }
    }
    return result;
  }, [attendanceRecords]);

  // Automatically initialize preview selectors
  useEffect(() => {
    if (uniqueEmployees.length > 0 && !selectedPreviewEmployee) {
      setSelectedPreviewEmployee(String(uniqueEmployees[0].id));
    }
  }, [uniqueEmployees, selectedPreviewEmployee]);

  useEffect(() => {
    if (!selectedPreviewMonth) {
      const now = new Date();
      setSelectedPreviewMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }
  }, [selectedPreviewMonth]);

  const sortedAttendanceDates = useMemo(
    () => attendanceRecords.map((record) => record.date).filter(Boolean).sort(),
    [attendanceRecords]
  );

  const defaultExportStartDate = sortedAttendanceDates[0] || '';
  const defaultExportEndDate = sortedAttendanceDates[sortedAttendanceDates.length - 1] || '';

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

  const handlePrintPreviewDTR = () => {
    if (!selectedPreviewEmployee || !selectedPreviewMonth) return;
    const empName = uniqueEmployees.find((e) => String(e.id) === String(selectedPreviewEmployee))?.name || '';
    setExportEmployee(empName);
    const [y, m] = selectedPreviewMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    setExportStartDate(`${selectedPreviewMonth}-01`);
    setExportEndDate(`${selectedPreviewMonth}-${String(lastDay).padStart(2, '0')}`);
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

  // Consolidate data for the currently previewed employee and month
  const previewData = useMemo(() => {
    if (!selectedPreviewEmployee || !selectedPreviewMonth) return {};
    
    const filtered = attendanceRecords.filter((a) => {
      const empId = a.employee_id ?? a.user_id;
      if (String(empId) !== String(selectedPreviewEmployee)) return false;
      if (!a.date) return false;
      const rMonth = a.date.slice(0, 7);
      return rMonth === selectedPreviewMonth;
    });

    const map = {};
    filtered.forEach((entry) => {
      if (!map[entry.date]) {
        map[entry.date] = {
          date: entry.date,
          morning_time_in: null,
          morning_time_out: null,
          afternoon_time_in: null,
          afternoon_time_out: null,
          ot_time_in: null,
          ot_time_out: null,
          employee_signature: entry.employee_signature || null,
        };
      }
      
      const session = entry.session_type?.toLowerCase();
      if (session === 'morning') {
        map[entry.date].morning_time_in = entry.time_in;
        map[entry.date].morning_time_out = entry.time_out;
      } else if (session === 'afternoon') {
        map[entry.date].afternoon_time_in = entry.time_in;
        map[entry.date].afternoon_time_out = entry.time_out;
      } else if (session === 'overtime') {
        map[entry.date].ot_time_in = entry.time_in;
        map[entry.date].ot_time_out = entry.time_out;
      } else {
        const hour = entry.time_in ? parseInt(entry.time_in.split(':')[0], 10) : null;
        if (hour !== null) {
          if (hour < 12) {
            map[entry.date].morning_time_in = entry.time_in;
            map[entry.date].morning_time_out = entry.time_out;
          } else if (hour >= 12 && hour < 18) {
            map[entry.date].afternoon_time_in = entry.time_in;
            map[entry.date].afternoon_time_out = entry.time_out;
          } else {
            map[entry.date].ot_time_in = entry.time_in;
            map[entry.date].ot_time_out = entry.time_out;
          }
        }
      }
    });

    return map;
  }, [attendanceRecords, selectedPreviewEmployee, selectedPreviewMonth]);

  // Preview Month Summary Calculations
  const previewMonthSummary = useMemo(() => {
    if (!selectedPreviewMonth) return { hours: 0, mins: 0, lateMinutes: 0 };
    const [year, month] = selectedPreviewMonth.split('-').map(Number);
    let totalWorkedMinutes = 0;
    let totalLateMinutes = 0;

    const totalDays = new Date(year, month, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;
      const record = previewData[dateKey];
      if (record) {
        const details = getDailyDetailsHelper(record, d, year, month);
        if (!details.isBlank) {
          totalWorkedMinutes += (details.rawMinutes || 0);
          totalLateMinutes += (details.lateMins || 0);
        }
      }
    }

    return {
      hours: totalWorkedMinutes > 0 ? Math.floor(totalWorkedMinutes / 60) : 0,
      mins: totalWorkedMinutes > 0 ? totalWorkedMinutes % 60 : 0,
      lateMinutes: totalLateMinutes
    };
  }, [previewData, selectedPreviewMonth]);

  const previewDayRows = useMemo(() => {
    if (!selectedPreviewMonth) return [];
    const [year, month] = selectedPreviewMonth.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const rows = [];
    
    for (let d = 1; d <= 31; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;
      const record = previewData[dateKey];
      rows.push({
        dayNum: d,
        details: getDailyDetailsHelper(record, d, year, month)
      });
    }
    return rows;
  }, [previewData, selectedPreviewMonth]);

  const empSignatureUrl = useMemo(() => {
    const list = Object.values(previewData);
    const found = list.find((r) => r.employee_signature);
    if (found) return found.employee_signature;
    return uniqueEmployees.find((e) => String(e.id) === String(selectedPreviewEmployee))?.signature || null;
  }, [previewData, selectedPreviewEmployee, uniqueEmployees]);

  const selectedEmployeeName = useMemo(() => {
    return uniqueEmployees.find((e) => String(e.id) === String(selectedPreviewEmployee))?.name || 'Employee';
  }, [selectedPreviewEmployee, uniqueEmployees]);

  const getMonthName = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

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

      {/* Tabs Selector */}
      <div className="flex border-b border-white/10 gap-6 mt-4">
        <button
          onClick={() => setActiveTab('daily')}
          className={`pb-4 text-sm font-semibold tracking-wide transition border-b-2 ${
            activeTab === 'daily'
              ? 'border-[#FF7120] text-white'
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          Daily Log List
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`pb-4 text-sm font-semibold tracking-wide transition border-b-2 ${
            activeTab === 'preview'
              ? 'border-[#FF7120] text-white'
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          Monthly DTR Preview
        </button>
      </div>

      {/* Main Table/Preview Card */}
      {activeTab === 'daily' ? (
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
      ) : (
        /* Monthly DTR Preview Tab */
        <Card className="border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.22)] bg-[#001f35]/70 backdrop-blur-md rounded-2xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="previewEmp" className="text-white/60 text-xs font-semibold uppercase">Employee:</Label>
                <Select value={selectedPreviewEmployee} onValueChange={setSelectedPreviewEmployee}>
                  <SelectTrigger id="previewEmp" className="w-[200px] h-10 bg-[#00273C]/60 border-white/10 text-white rounded-xl">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001f35] border-white/10 text-white">
                    {uniqueEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="previewMonth" className="text-white/60 text-xs font-semibold uppercase">Month:</Label>
                <Input
                  id="previewMonth"
                  type="month"
                  value={selectedPreviewMonth}
                  onChange={(e) => setSelectedPreviewMonth(e.target.value)}
                  className="w-[180px] h-10 bg-[#00273C]/60 border-white/10 text-white rounded-xl"
                />
              </div>
            </div>

            <CardAction>
              <Button
                onClick={handlePrintPreviewDTR}
                className="gap-2 h-10 bg-[#FF7120] hover:bg-[#e5641c] text-white rounded-xl font-semibold shadow-lg shadow-[#FF7120]/10"
                disabled={!selectedPreviewEmployee || !selectedPreviewMonth}
              >
                <Printer className="w-4 h-4" />
                Print DTR
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {isAttendanceLoading ? (
              <TableSkeleton />
            ) : !selectedPreviewEmployee || !selectedPreviewMonth ? (
              <p className="text-sm text-muted-foreground text-center py-10">Select an employee and a month to preview the DTR.</p>
            ) : (
              <div className="mt-4 flex justify-center">
                <div className="w-full max-w-xl border border-white/10 bg-[#00273C]/40 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                  
                  {/* Form Title */}
                  <h3 className="text-center font-extrabold text-xl tracking-widest text-[#FF7120] mb-6">DAILY TIME RECORD</h3>
                  
                  {/* Employee & Month Metadata Header */}
                  <div className="space-y-3 mb-6 text-sm text-white/80 max-w-md mx-auto">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="font-semibold text-white/40 uppercase text-[10px] tracking-wider">Employee Name:</span>
                      <span className="font-bold text-white tracking-wide text-right">{selectedEmployeeName.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="font-semibold text-white/40 uppercase text-[10px] tracking-wider">Month:</span>
                      <span className="font-bold text-white tracking-wide text-right">{getMonthName(selectedPreviewMonth)}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="font-semibold text-white/40 uppercase text-[10px] tracking-wider">Office Hours:</span>
                      <span className="text-white/95 text-right font-medium">8:00 AM - 12:00 PM / 1:00 PM - 5:00 PM</span>
                    </div>
                  </div>

                  {/* 31-Day Time Grid */}
                  <div className="overflow-x-auto border border-white/10 rounded-xl bg-[#001f35]/50">
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        <tr className="bg-[#00273c] text-[#FF7120] border-b border-white/10 font-bold">
                          <th rowSpan="2" className="py-3 px-1.5 border-r border-white/10 w-[10%] text-center uppercase tracking-wider text-[10px]">Day</th>
                          <th colSpan="2" className="py-2 px-1.5 border-r border-white/10 text-center uppercase tracking-wider text-[10px]">A.M.</th>
                          <th colSpan="2" className="py-2 px-1.5 border-r border-white/10 text-center uppercase tracking-wider text-[10px]">P.M.</th>
                          <th rowSpan="2" className="py-3 px-1.5 border-r border-white/10 text-center uppercase tracking-wider text-[10px]">Hours</th>
                          <th rowSpan="2" className="py-3 px-1.5 text-center uppercase tracking-wider text-[10px]">Min.</th>
                        </tr>
                        <tr className="bg-[#00273c]/50 text-white/70 border-b border-white/10">
                          <th className="py-2 px-1.5 border-r border-white/10 font-semibold text-[9px]">Arrival</th>
                          <th className="py-2 px-1.5 border-r border-white/10 font-semibold text-[9px]">Departure</th>
                          <th className="py-2 px-1.5 border-r border-white/10 font-semibold text-[9px]">Arrival</th>
                          <th className="py-2 px-1.5 border-r border-white/10 font-semibold text-[9px]">Departure</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewDayRows.map(({ dayNum, details }) => (
                          <tr key={dayNum} className="border-b border-white/5 hover:bg-white/5 transition-colors font-medium">
                            <td className="py-2.5 px-1.5 border-r border-white/5 font-extrabold text-white/60 bg-[#00273c]/40">{dayNum}</td>
                            <td className="py-2.5 px-1.5 border-r border-white/5 text-white/80">{details.amIn || '-'}</td>
                            <td className="py-2.5 px-1.5 border-r border-white/5 text-white/80">{details.amOut || '-'}</td>
                            <td className="py-2.5 px-1.5 border-r border-white/5 text-white/80">{details.pmIn || '-'}</td>
                            <td className="py-2.5 px-1.5 border-r border-white/5 text-white/80">{details.pmOut || '-'}</td>
                            <td className="py-2.5 px-1.5 border-r border-white/5 text-[#FF7120] font-bold">{details.hours}</td>
                            <td className="py-2.5 px-1.5 text-[#FF7120] font-bold">{details.mins}</td>
                          </tr>
                        ))}
                        <tr className="font-extrabold bg-[#00273c] text-white">
                          <td colSpan="5" className="p-3 text-left pl-4 border-r border-white/10 text-[11px] uppercase tracking-wider text-white/70">Total Time Worked</td>
                          <td className="p-3 border-r border-white/10 text-[#FF7120] text-sm">{previewMonthSummary.hours || ''}</td>
                          <td className="p-3 text-[#FF7120] text-sm">{previewMonthSummary.mins || ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Certified Footnote Statement */}
                  <div className="mt-4 flex flex-col items-center w-full">
                    <p className="text-[10px] text-white/50 text-center italic max-w-sm leading-relaxed mb-4">
                      I certify on my honor that the above is true and correct record of the hours of work performed, 
                      record of which was made daily at the time of arrival and departure from office.
                    </p>

                    {/* Signature Space overlay */}
                    <div className="relative w-full flex flex-col items-center my-10 pt-4">
                      {empSignatureUrl && (
                        <img 
                          src={empSignatureUrl} 
                          alt="Signature" 
                          className="absolute -top-4 h-12 object-contain pointer-events-none opacity-90 filter invert" 
                        />
                      )}
                      <div className="text-sm font-bold border-b border-white/20 w-[60%] text-center pb-1 uppercase tracking-wide">
                        {selectedEmployeeName}
                      </div>
                      <div className="text-[9px] text-white/40 mt-1.5 uppercase tracking-widest font-semibold">(Signature of Employee)</div>
                    </div>

                    {/* Verification Lines and Late Minutes total */}
                    <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 text-xs text-white/70">
                      <div className="space-y-1">
                        <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Verification:</div>
                        <div className="text-white/80">Verified as to the prescribed office hours:</div>
                        <div className="relative flex flex-col items-center w-32 mt-4">
                          {inChargeSignature && (
                            <img 
                              src={inChargeSignature} 
                              alt="In-Charge Signature" 
                              className="absolute -top-6 h-10 object-contain pointer-events-none opacity-90 filter invert" 
                            />
                          )}
                          <div className="text-xs font-bold border-b border-white/20 w-full text-center pb-1 uppercase tracking-wide">
                            {inChargeName || '\u00A0'}
                          </div>
                          <div className="text-[9px] text-white/40 mt-1 uppercase tracking-widest font-semibold text-center w-full">(In-charge)</div>
                        </div>
                      </div>
                      <div className="text-right text-[#FF7120] font-bold text-sm bg-[#FF7120]/10 border border-[#FF7120]/20 rounded-xl px-4 py-2 mt-2 sm:mt-0 shadow-inner">
                        Late: {formatLateMinutes(previewMonthSummary.lateMinutes)}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Dialog */}
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

      {/* DTR print overlay – covers full screen using the PrintAttendance template */}
      {showDTROverlay && createPortal(
        <div className="dtr-print-overlay-wrapper" style={{ position: 'fixed', inset: 0, zIndex: 9999, overflowY: 'auto', background: '#f5f5f5' }}>
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
        </div>,
        document.body
      )}
    </div>
  );
}
