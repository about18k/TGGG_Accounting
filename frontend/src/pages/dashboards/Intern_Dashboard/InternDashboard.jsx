import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import PublicNavigation from './PublicNavigation';
import InternSidebar from './components/InternSidebar';

const SECTION_KEYS = new Set(['overview', 'attendance']);
const MOBILE_SECTION_TABS = [
  { id: 'overview', label: 'Dashboard' },
  { id: 'attendance', label: 'Attendance' },
];

export default function InternDashboard({ user, onNavigate }) {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('overview');

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workDoc, setWorkDoc] = useState('');
  const [locationIn, setLocationIn] = useState(null);
  const [locationInError, setLocationInError] = useState('');
  const [locationOut, setLocationOut] = useState(null);
  const [locationOutError, setLocationOutError] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requested = params.get('section');
    if (requested && SECTION_KEYS.has(requested)) setActiveSection(requested);
  }, [location.search]);

  const attendanceRows = [
    { date: '2026-02-09', in: '08:00', out: '17:00', late: '0', hours: '8h 0m', note: 'Completed assigned tasks and submitted work logs.' },
    { date: '2026-02-08', in: '08:10', out: '17:00', late: '10', hours: '7h 50m', note: 'Assisted team tasks and updated progress notes.' },
  ];

  const stats = useMemo(() => {
    const latest = attendanceRows[0];
    const lateMinutes = latest?.late ?? '0';
    return [
      { label: "Today's Status", value: locationIn ? 'Ready to Time In' : 'Location Required', tone: locationIn ? 'good' : 'warn', icon: MapPin },
      { label: 'Late Minutes (Latest)', value: lateMinutes, tone: lateMinutes === '0' ? 'good' : 'warn', icon: Clock },
      { label: 'Total Hours (Latest)', value: latest?.hours ?? '-', tone: 'neutral', icon: FileText },
    ];
  }, [locationIn]);

  const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

  const getLocationIn = () => {
    if (!navigator.geolocation) return setLocationInError('Geolocation is not supported by your browser');
    setLocationInError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocationIn({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => setLocationInError('Unable to retrieve location. Please enable location access.'),
    );
  };

  const getLocationOut = () => {
    if (!navigator.geolocation) return setLocationOutError('Geolocation is not supported by your browser');
    setLocationOutError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocationOut({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => setLocationOutError('Unable to retrieve location. Please enable location access.'),
    );
  };

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
        <h1 className="text-2xl font-semibold text-white">Intern Dashboard</h1>
        <p className="text-white/60 text-sm mt-1">Track attendance, assigned work, and daily progress.</p>
      </div>
      <div className="p-6 space-y-6">
        <div className={`${cardClass} p-6`}>
          <h3 className="text-white text-lg font-semibold">Intern Focus</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            <li>• Follow assigned tasks and timeline.</li>
            <li>• Keep attendance and work documentation updated.</li>
            <li>• Coordinate with leads for feedback and revisions.</li>
            <li>• Maintain clear daily progress transparency.</li>
          </ul>
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
              <h2 className="text-white font-semibold text-[clamp(1rem,3.5vw,1.5rem)]">Welcome, {user?.first_name || 'Intern'} {user?.last_name || 'User'}</h2>
              <p className="text-white/60 text-sm">Role: <span className="text-white/80">{user?.role || 'intern'}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Attendance & Work Logs</Badge>
            <Badge tone={locationIn ? 'good' : 'warn'}>{locationIn ? 'Location Ready' : 'Location Needed'}</Badge>
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
        <div className={`${cardClass} p-4 sm:p-6 space-y-3`}>
          <h3 className="text-white font-semibold">Attendance</h3>
          <p className="text-white/50 text-sm">Capture location first to enable Time In.</p>
          {locationIn && <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border bg-emerald-500/10 text-emerald-300 border-emerald-500/20"><CheckCircle className="h-4 w-4" />Location captured ±{Math.round(locationIn.accuracy)}m</div>}
          {locationInError && <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border bg-red-500/10 text-red-300 border-red-500/20"><XCircle className="h-4 w-4" />{locationInError}</div>}
          <button type="button" onClick={getLocationIn} className="rounded-xl border border-[#FF7120]/40 bg-[#FF7120]/10 px-4 py-2 text-sm font-semibold text-[#FF7120] hover:bg-[#FF7120]/20 transition">Scan location now</button>
          <button type="button" disabled={!locationIn || buttonLoading} onClick={() => { setButtonLoading(true); setTimeout(() => setButtonLoading(false), 900); }} className="w-full sm:w-auto rounded-xl px-5 py-3 font-semibold transition bg-[#FF7120] text-white disabled:bg-white/10 disabled:text-white/40">{buttonLoading ? 'Processing...' : 'Time In'}</button>
        </div>

        <div className={`${cardClass} p-4 sm:p-6 space-y-3`}>
          <h3 className="text-white font-semibold">Work Documentation</h3>
          <textarea rows={5} value={workDoc} onChange={(e) => setWorkDoc(e.target.value)} placeholder="What did you accomplish today?" className="w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none resize-none" />
          {locationOut && <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border bg-emerald-500/10 text-emerald-300 border-emerald-500/20"><CheckCircle className="h-4 w-4" />Location captured ±{Math.round(locationOut.accuracy)}m</div>}
          {locationOutError && <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border bg-red-500/10 text-red-300 border-red-500/20"><XCircle className="h-4 w-4" />{locationOutError}</div>}
          <button type="button" onClick={getLocationOut} className="rounded-xl border border-[#FF7120]/40 bg-[#FF7120]/10 px-4 py-2 text-sm font-semibold text-[#FF7120] hover:bg-[#FF7120]/20 transition">Scan location now</button>
          <button type="button" disabled={!locationOut || buttonLoading} onClick={() => { setButtonLoading(true); setTimeout(() => setButtonLoading(false), 900); }} className="w-full sm:w-auto rounded-xl px-5 py-3 font-semibold transition bg-[#FF7120] text-white disabled:bg-white/10 disabled:text-white/40">{buttonLoading ? 'Processing...' : 'Time Out'}</button>
        </div>
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
                <th className="text-left py-3">Date</th><th className="text-left py-3">In</th><th className="text-left py-3">Out</th><th className="text-left py-3">Late</th><th className="text-left py-3">Hours</th><th className="text-left py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRows.map((row) => (
                <tr key={row.date} className="border-b border-white/5 text-sm text-white/85">
                  <td className="py-3">{row.date}</td><td className="py-3">{row.in}</td><td className="py-3">{row.out}</td><td className="py-3">{row.late} min</td><td className="py-3 text-emerald-300">{row.hours}</td><td className="py-3">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <InternSidebar currentPage="attendance" onNavigate={onNavigate} activeSection={activeSection} onSelectSection={setActiveSection} />
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
