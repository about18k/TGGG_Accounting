import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  User,
} from 'lucide-react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import BimSpecialistSidebar from './components/BimSpecialistSidebar';
import LocationAttendance from '../../../components/attendance/LocationAttendance';
import WorkDocCard from '../../../components/attendance/WorkDocCard';
import AttendanceHistoryTable from '../../../components/attendance/AttendanceHistoryTable';
import useMyAttendance from '../../../hooks/useMyAttendance';
import { CardSkeleton } from '../../../components/SkeletonLoader';

const SECTION_KEYS = new Set(['attendance']);

export default function BimSpecialistDashboard({ user, onNavigate }) {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('attendance');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workDoc, setWorkDoc] = useState('');
  const [workDocAttachments, setWorkDocAttachments] = useState([]);
  const [attendanceReady, setAttendanceReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState(null);
  const {
    records: attendanceRows,
    loading: attendanceLoading,
    error: attendanceError,
    refresh: refreshAttendance,
  } = useMyAttendance();

  const latest = attendanceRows[0]; // Assuming attendanceRows is sorted by date descending
  const todayIso = new Date().toISOString().split('T')[0];
  const isToday = latest?.date === todayIso;
  const hasIn = isToday && latest?.time_in;
  const hasOut = isToday && latest?.time_out;
  const showTimeIn = !hasIn || hasOut; // Show LocationAttendance if no clock-in today, or if already clocked out
  const showTimeOut = hasIn && !hasOut; // Show WorkDocCard if clocked in but not clocked out

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requested = params.get('section');
    if (requested && SECTION_KEYS.has(requested)) setActiveSection(requested);
  }, [location.search]);

  const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

  const renderAttendance = () => (
    <div className="space-y-5 sm:space-y-8">
      <div className={cardClass}>
        <div className="p-4 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-[#FF7120]/70 bg-[#00273C] grid place-items-center overflow-hidden">
              {user?.profile_picture ? <img src={user.profile_picture} alt="Profile" className="h-full w-full object-cover" /> : <User className="h-8 w-8 sm:h-10 sm:w-10 text-[#FF7120]" />}
            </div>
            <div>
              <h2 className="text-white font-semibold text-[clamp(1rem,3.5vw,1.5rem)]">Welcome, {user?.first_name || 'BIM Specialist'}</h2>
              <p className="text-white/60 text-sm capitalize">Role: <span className="text-white/80">{user?.role?.replace('_', ' ') || 'bim specialist'}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border bg-white/5 text-white/70 border-white/10"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Attendance &amp; Work Logs</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${attendanceReady ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-[#FF7120]/10 text-[#FF7120] border-[#FF7120]/30'}`}>
              {attendanceReady ? 'Location Ready' : 'Location Needed'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {attendanceLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <div className={showTimeIn ? 'block' : 'hidden'}>
              <LocationAttendance
                role={user?.role}
                className={`${cardClass} p-4 sm:p-6`}
                workDoc={workDoc}
                workDocAttachments={workDocAttachments}
                onStatusChange={({ ready, isBeforeSessionEnd, earlyTimeoutMessage }) => {
                    setAttendanceReady(ready);
                    setIsLocked(!!isBeforeSessionEnd);
                    setLockMessage(earlyTimeoutMessage || null);
                  }}
                onRecordSaved={(attendance) => {
                  // Clear work documentation after successful clock-out (documentation saved)
                  if (!attendance?.time_in || attendance?.time_out) {
                    setWorkDoc('');
                    setWorkDocAttachments([]);
                  }
                  refreshAttendance();
                }}
              />
            </div>
            <div className={showTimeOut ? 'block' : 'hidden'}>
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
    <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="attendance" user={user} />

      <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex gap-6">
          <aside className="w-64 shrink-0 hidden lg:block">
            <BimSpecialistSidebar currentPage="attendance" onNavigate={onNavigate} activeSection={activeSection} onSelectSection={setActiveSection} />
          </aside>

          <main className="flex-1 min-w-0">
            {renderAttendance()}
          </main>
        </div>
      </div>
    </div>
  );
}
