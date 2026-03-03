import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Calendar,
  Clock,
  FileText,
  MapPin,
  Palette,
  ShieldCheck,
  User,
} from 'lucide-react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import JuniorDesignerSidebar from './components/JuniorDesignerSidebar';
import LocationAttendance from '../../../components/attendance/LocationAttendance';
import WorkDocCard from '../../../components/attendance/WorkDocCard';
import useMyAttendance from '../../../hooks/useMyAttendance';

const SECTION_KEYS = new Set(['overview', 'attendance']);
const MOBILE_SECTION_TABS = [
  { id: 'overview', label: 'Dashboard' },
  { id: 'attendance', label: 'Attendance' },
];

export default function JuniorDesignerDashboard({ user, onNavigate }) {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('overview');

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workDoc, setWorkDoc] = useState('');
  const [attendanceReady, setAttendanceReady] = useState(false);
  const {
    records: attendanceRows,
    loading: attendanceLoading,
    error: attendanceError,
    refresh: refreshAttendance,
    latest,
  } = useMyAttendance();
  const todayIso = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requested = params.get('section');
    if (requested && SECTION_KEYS.has(requested)) setActiveSection(requested);
  }, [location.search]);

  const stats = useMemo(() => {
    const lateStatus = latest?.status === 'late' ? 'Late' : latest?.status_label || 'On time';
    const lateTone = latest?.status === 'late' ? 'warn' : 'good';
    const hours = (() => {
      if (!latest?.time_in || !latest?.time_out) return '-';
      const [inH, inM] = latest.time_in.split(':').map(Number);
      const [outH, outM] = latest.time_out.split(':').map(Number);
      if ([inH, inM, outH, outM].some((v) => Number.isNaN(v))) return '-';
      const mins = outH * 60 + outM - (inH * 60 + inM);
      if (mins <= 0) return '-';
      return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    })();
    const todayStatus = latest?.date === todayIso && latest?.time_in
      ? (latest.time_out ? 'Completed' : 'Timed In')
      : attendanceReady
        ? 'Ready to Time In'
        : 'Location Required';
    return [
      { label: "Today's Status", value: todayStatus, tone: attendanceReady || latest?.time_in ? 'good' : 'warn', icon: MapPin },
      { label: 'Latest Status', value: lateStatus, tone: lateTone, icon: Clock },
      { label: 'Total Hours (Latest)', value: hours, tone: 'neutral', icon: FileText },
    ];
  }, [attendanceReady, latest, todayIso]);

  const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

  const Badge = ({ tone = 'neutral', children }) => {
    const cls =
      tone === 'warn'
        ? 'bg-[#FF7120]/10 text-[#FF7120] border-[#FF7120]/30'
        : tone === 'good'
          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
          : 'bg-white/5 text-white/70 border-white/10';
    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${cls}`}>{children}</span>;
  };

  const renderOverview = () => (
    <div className={cardClass}>
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-semibold text-white">Junior Designer Dashboard</h1>
        <p className="text-white/60 text-sm mt-1">Track daily output, drawing updates, and attendance performance.</p>
      </div>
      <div className="p-6 space-y-6">
        <div className={`${cardClass} p-6`}>
          <h3 className="text-white text-lg font-semibold">Design Responsibilities</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            <li>• Develops design concepts and visual presentations.</li>
            <li>• Prepares CAD drawings and technical details.</li>
            <li>• Coordinates revisions based on lead architect feedback.</li>
            <li>• Maintains organized design files and version history.</li>
          </ul>
        </div>
        <div className={`${cardClass} p-6`}>
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-[#FF7120]" />
            <p className="text-white/80 text-sm">Use this dashboard to keep your design progress and attendance transparent.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-5 sm:space-y-8">
      <div className={cardClass}>
        <div className="p-4 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-[#FF7120]/70 bg-[#00273C] grid place-items-center overflow-hidden">
              {user?.profile_picture ? <img src={user.profile_picture} alt="Profile" className="h-full w-full object-cover" /> : <User className="h-8 w-8 sm:h-10 sm:w-10 text-[#FF7120]" />}
            </div>
            <div>
              <h2 className="text-white font-semibold text-[clamp(1rem,3.5vw,1.5rem)]">Welcome, {user?.first_name || 'Junior'} {user?.last_name || 'Designer'}</h2>
              <p className="text-white/60 text-sm">Role: <span className="text-white/80">{user?.role || 'junior_architect'}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Attendance & Work Logs</Badge>
            <Badge tone={attendanceReady ? 'good' : 'warn'}>{attendanceReady ? 'Location Ready' : 'Location Needed'}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${cardClass} p-4`}>
              <div className="flex items-center justify-between">
                <p className="text-white/60 text-sm font-medium">{s.label}</p>
                <Icon className="h-4 w-4 text-white/40" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-white text-lg font-semibold">{s.value}</p>
                {s.tone !== 'neutral' && <Badge tone={s.tone}>{s.tone === 'good' ? 'OK' : 'Attention'}</Badge>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <LocationAttendance
          role={user?.role}
          className={`${cardClass} p-4 sm:p-6`}
          onStatusChange={({ ready }) => setAttendanceReady(ready)}
          onRecordSaved={refreshAttendance}
        />

        <WorkDocCard value={workDoc} onChange={setWorkDoc} cardClass={cardClass} />
      </div>

      <div className={cardClass}>
        <div className="p-4 sm:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-white font-semibold">My Attendance History</h3>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#00273C]/60 px-3 py-2">
            <Calendar className="h-4 w-4 text-white/40" />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-white/80 text-sm outline-none" />
          </div>
        </div>
        <div className="p-4 sm:p-6 overflow-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-white/60 text-xs">
                <th className="text-left py-3">Date</th><th className="text-left py-3">In</th><th className="text-left py-3">Out</th><th className="text-left py-3">Status</th><th className="text-left py-3">Hours</th><th className="text-left py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {attendanceLoading && (
                <tr><td colSpan={6} className="py-3 text-white/70 text-sm">Loading attendance...</td></tr>
              )}
              {!attendanceLoading && attendanceRows.length === 0 && (
                <tr><td colSpan={6} className="py-3 text-white/60 text-sm">No attendance records yet.</td></tr>
              )}
              {attendanceRows.map((row) => {
                const hours = (() => {
                  if (!row.time_in || !row.time_out) return '-';
                  const [inH, inM] = row.time_in.split(':').map(Number);
                  const [outH, outM] = row.time_out.split(':').map(Number);
                  if ([inH, inM, outH, outM].some((v) => Number.isNaN(v))) return '-';
                  const mins = outH * 60 + outM - (inH * 60 + inM);
                  if (mins <= 0) return '-';
                  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                })();
                return (
                  <tr key={row.id || row.date} className="border-b border-white/5 text-sm text-white/85">
                    <td className="py-3">{row.date}</td>
                    <td className="py-3">{row.time_in || '-'}</td>
                    <td className="py-3">{row.time_out || '-'}</td>
                    <td className="py-3">{row.status_label || row.status || '—'}</td>
                    <td className="py-3 text-emerald-300">{hours}</td>
                    <td className="py-3">{row.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {attendanceError && <p className="mt-3 text-xs text-red-200">{attendanceError}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="attendance" user={user} />

      <div className="relative pt-28 px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex gap-6">
          <aside className="w-64 shrink-0 hidden lg:block">
            <JuniorDesignerSidebar currentPage="attendance" onNavigate={onNavigate} activeSection={activeSection} onSelectSection={setActiveSection} />
          </aside>

          <main className="flex-1 min-w-0">
            <div className="lg:hidden mb-4 rounded-2xl border border-white/10 bg-[#001f35]/70 p-2 backdrop-blur-md">
              <div className="grid grid-cols-2 gap-2">
                {MOBILE_SECTION_TABS.map((tab) => (
                  <button key={tab.id} type="button" onClick={() => setActiveSection(tab.id)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${activeSection === tab.id ? 'bg-[#FF7120] text-white' : 'bg-white/5 text-white/70 hover:text-white'}`}>{tab.label}</button>
                ))}
              </div>
            </div>

            {activeSection === 'overview' && renderOverview()}
            {activeSection === 'attendance' && renderAttendance()}
          </main>
        </div>
      </div>
    </div>
  );
}
