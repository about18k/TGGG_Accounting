import React, { useMemo, useState } from 'react';
import PrintAttendance from '../../globalattendancereport/PrintAttendance';
import {
    BarChart3,   Calendar,   ShieldCheck,   User,   ChevronDown
} from 'lucide-react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import SiteCoordinatorSidebar from './components/SiteCoordinatorSidebar';
import LocationAttendance from '../../../components/attendance/LocationAttendance';
import WorkDocCard from '../../../components/attendance/WorkDocCard';
import AttendanceHistoryTable from '../../../components/attendance/AttendanceHistoryTable';
import useMyAttendance from '../../../hooks/useMyAttendance';
import { CardSkeleton } from '../../../components/SkeletonLoader';
import { calcSessionMinutes, formatDurationFromHours } from '../../../utils/attendanceFormatters';

export default function SiteCoordinatorDashboard({ user, onNavigate }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workDoc, setWorkDoc] = useState('');
  const [workDocAttachments, setWorkDocAttachments] = useState([]);
  const [showDTROverlay, setShowDTROverlay] = useState(false);
  const [attendanceReady, setAttendanceReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState(null);
  const [filterMonth, setFilterMonth] = useState(() => String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState(() => String(new Date().getFullYear()));
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');
  const [isAttendanceTotalsOpen, setIsAttendanceTotalsOpen] = useState(false);
  const {
    records: attendanceRows,
    loading: attendanceLoading,
    error: attendanceError,
    refresh: refreshAttendance,
    latest,
  } = useMyAttendance();

  const todayIso = new Date().toISOString().split('T')[0];
  const isToday = latest?.date === todayIso;
  const hasIn = isToday && latest?.time_in;
  const hasOut = isToday && latest?.time_out;
  const showTimeIn = !hasIn || hasOut;
  const showTimeOut = hasIn && !hasOut;

  const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

  const monthOptions = useMemo(
    () => [
      { value: '1', label: 'January' },
      { value: '2', label: 'February' },
      { value: '3', label: 'March' },
      { value: '4', label: 'April' },
      { value: '5', label: 'May' },
      { value: '6', label: 'June' },
      { value: '7', label: 'July' },
      { value: '8', label: 'August' },
      { value: '9', label: 'September' },
      { value: '10', label: 'October' },
      { value: '11', label: 'November' },
      { value: '12', label: 'December' },
    ],
    []
  );

  const yearOptions = useMemo(() => {
    const years = new Set();
    (attendanceRows || []).forEach((row) => {
      if (!row?.date) return;
      const year = Number(String(row.date).split('-')[0]);
      if (!Number.isNaN(year)) years.add(year);
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [attendanceRows]);

  const filteredSummaryRecords = useMemo(() => {
    const rows = Array.isArray(attendanceRows) ? attendanceRows : [];
    return rows.filter((row) => {
      if (!row?.date) return false;
      const [yearStr, monthStr] = String(row.date).split('-');
      const rowYear = Number(yearStr);
      const rowMonth = Number(monthStr);

      if (filterYear !== 'all' && rowYear !== Number(filterYear)) return false;
      if (filterMonth !== 'all' && rowMonth !== Number(filterMonth)) return false;
      if (rangeStartDate && row.date < rangeStartDate) return false;
      if (rangeEndDate && row.date > rangeEndDate) return false;

      return true;
    });
  }, [attendanceRows, filterYear, filterMonth, rangeStartDate, rangeEndDate]);

  const attendanceTotals = useMemo(() => {
    const records = filteredSummaryRecords || [];
    const workedDates = new Set();
    let totalMinutes = 0;
    let totalLateHours = 0;
    let overtimeMinutes = 0;

    records.forEach((row) => {
      const isWorkedSession = row?.status === 'present' || row?.status === 'late';
      if (isWorkedSession && row?.date) {
        workedDates.add(row.date);
      }

      const sessionMinutes = calcSessionMinutes(row);
      totalMinutes += sessionMinutes;

      const lateHours = Number(row?.late_deduction_hours || 0);
      if (Number.isFinite(lateHours) && lateHours > 0) {
        totalLateHours += lateHours;
      }

      if (row?.session_type === 'overtime') {
        overtimeMinutes += sessionMinutes;
      }
    });

    return {
      totalHours: (totalMinutes / 60),
      totalDaysWorked: workedDates.size,
      totalLate: totalLateHours,
      totalOvertimeHours: (overtimeMinutes / 60),
    };
  }, [filteredSummaryRecords]);

  const renderAttendance = () => (
    <div className="space-y-5 sm:space-y-8">
      <div className={cardClass}>
        <div className="p-4 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-[#FF7120]/70 bg-[#00273C] grid place-items-center overflow-hidden">
              {user?.profile_picture ? <img src={user.profile_picture} alt="Profile" className="h-full w-full object-cover" /> : <User className="h-8 w-8 sm:h-10 sm:w-10 text-[#FF7120]" />}
            </div>
            <div>
              <h2 className="text-white font-semibold text-[clamp(1rem,3.5vw,1.5rem)]">Welcome, {user?.first_name || 'Site Coordinator'}</h2>
              <p className="text-white/60 text-sm capitalize">Role: <span className="text-white/80">{user?.role?.replace('_', ' ') || 'site coordinator'}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border bg-white/5 text-white/70 border-white/10"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Attendance &amp; Work Logs</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${attendanceReady ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-[#FF7120]/10 text-[#FF7120] border-[#FF7120]/30'}`}>
              {attendanceReady ? 'Location Ready' : 'Location Needed'}
            </span>
            <button
              type="button"
              onClick={() => setShowDTROverlay(true)}
              className="px-3 py-2 rounded-xl border border-[#FF7120]/40 bg-[#FF7120]/10 text-[#FF7120] hover:bg-[#FF7120]/20 hover:text-white transition text-sm font-semibold"
            >
              Print DTR
            </button>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <button
          onClick={() => setIsAttendanceTotalsOpen(!isAttendanceTotalsOpen)}
          className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-white/5 transition-colors rounded-2xl"
        >
          <div className="flex flex-col gap-1 text-left">
            <h3 className="text-white font-semibold tracking-tight text-[clamp(0.95rem,2.4vw,1.1rem)]">Attendance Totals</h3>
            {!isAttendanceTotalsOpen && (
              <p className="text-white/60 text-sm">Click to view your metrics</p>
            )}
          </div>
          <ChevronDown
            className={`h-5 w-5 text-white/60 transition-transform duration-300 shrink-0 ${
              isAttendanceTotalsOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isAttendanceTotalsOpen && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <label className="flex flex-col gap-1 pt-2 text-xs text-white/70">
                Month
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#001f35] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60"
                >
                  <option value="all">All Months</option>
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 pt-2 text-xs text-white/70">
                Year
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#001f35] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60"
                >
                  <option value="all">All Years</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={String(year)}>{year}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 pt-2 text-xs text-white/70">
                Start Date
                <input
                  type="date"
                  value={rangeStartDate}
                  onChange={(e) => setRangeStartDate(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#001f35] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60 scheme-dark"
                />
              </label>

              <label className="flex flex-col gap-1 pt-2 text-xs text-white/70">
                End Date
                <input
                  type="date"
                  value={rangeEndDate}
                  onChange={(e) => setRangeEndDate(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#001f35] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60 scheme-dark"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/10 bg-background/70 p-3">
                <p className="text-xs text-white/60">Total Hours</p>
                <p className="mt-1 text-2xl font-semibold text-white">{formatDurationFromHours(attendanceTotals.totalHours)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-background/70 p-3">
                <p className="text-xs text-white/60">Total Days Worked</p>
                <p className="mt-1 text-2xl font-semibold text-white">{attendanceTotals.totalDaysWorked}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-background/70 p-3">
                <p className="text-xs text-white/60">Total Late</p>
                <p className="mt-1 text-2xl font-semibold text-white">{formatDurationFromHours(attendanceTotals.totalLate)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-background/70 p-3">
                <p className="text-xs text-white/60">Total Overtime Worked</p>
                <p className="mt-1 text-2xl font-semibold text-white">{formatDurationFromHours(attendanceTotals.totalOvertimeHours)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {attendanceLoading ? (
          <CardSkeleton />
        ) : (
          <>
            <div className={showTimeOut ? 'hidden' : 'block'}>
              <LocationAttendance
                role={user?.role}
                className={`${cardClass} p-4 sm:p-6`}
                workDoc={workDoc}
                workDocAttachments={workDocAttachments}
                onStatusChange={({ ready, isBeforeSessionEnd, earlyTimeoutMessage, processing }) => {
                    setAttendanceReady(ready);
                    setIsLocked(!!isBeforeSessionEnd || !!processing);
                    setLockMessage(processing ? "Processing attendance..." : (earlyTimeoutMessage || null));
                  }}
                onRecordSaved={(attendance) => {
                  // Clear work documentation after successful clock-out (documention saved)
                  if (!attendance?.time_in || attendance?.time_out) {
                    setWorkDoc('');
                    setWorkDocAttachments([]);
                  }
                  refreshAttendance();
                }}
              />
            </div>
            <div className={showTimeIn ? 'hidden' : 'block'}>
              <WorkDocCard
                value={workDoc}
                onChange={setWorkDoc}
                attachments={workDocAttachments}
                onAttachmentsChange={setWorkDocAttachments}
                defaultOpen={false}
                disabled={isLocked}
                disabledMessage={lockMessage}
                cardClass={cardClass}
              />
            </div>
          </>
        )}
      </div>

      <AttendanceHistoryTable
        records={attendanceRows}
        loading={attendanceLoading}
        error={attendanceError}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#00273C] relative">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-40 -right-40 h-130 w-130 rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="attendance" user={user} />

      <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
        <div className="max-w-400 mx-auto flex flex-col lg:flex-row gap-6">
          <aside className="w-64 shrink-0 hidden lg:block">
            <SiteCoordinatorSidebar currentPage="attendance" onNavigate={onNavigate} activeSection="attendance" onSelectSection={() => { }} />
          </aside>

          <main className="flex-1 min-w-0">
            {renderAttendance()}
          </main>
        </div>
      </div>

      {showDTROverlay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, overflowY: 'auto', background: '#f5f5f5' }}>
          <PrintAttendance
            internId={user?.id}
            internName={`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Employee'}
            onClose={() => setShowDTROverlay(false)}
          />
        </div>
      )}
    </div>
  );
}
