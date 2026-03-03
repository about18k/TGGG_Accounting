import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Calendar,
  Clock,
  FileImage,
  FileText,
  FolderKanban,
  MapPin,
  ShieldCheck,
  Upload,
  User,
} from 'lucide-react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import BimSpecialistSidebar from './components/BimSpecialistSidebar';
import WorkDocCard from '../../../components/attendance/WorkDocCard';
import useMyAttendance from '../../../hooks/useMyAttendance';

const SECTION_META = {
  overview: {
    title: 'BIM Specialist Dashboard',
    description: 'Track model progress, documentation quality, and BIM standards.',
  },
  documentation: {
    title: 'Documentation',
    description: 'Upload model files/images and document BIM updates transparently.',
  },
};

const SECTION_KEYS = new Set(['overview', 'attendance', 'documentation']);
const MODEL_ACCEPT = '.rvt,.ifc,.obj,.fbx,.skp,.dwg,.dxf,.stl';
const MOBILE_SECTION_TABS = [
  { id: 'overview', label: 'Dashboard' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'documentation', label: 'Documentation' },
];

export default function BimSpecialistDashboard({ user, onNavigate }) {
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

  const [docTitle, setDocTitle] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [docType, setDocType] = useState('model-update');
  const [docDescription, setDocDescription] = useState('');
  const [modelFiles, setModelFiles] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [savedDocs, setSavedDocs] = useState([]);
  const [docMessage, setDocMessage] = useState('');

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

  const overviewStats = useMemo(
    () => [
      { label: 'Documentation Entries', value: savedDocs.length, icon: FolderKanban },
      { label: 'Model Files Uploaded', value: savedDocs.reduce((sum, d) => sum + d.modelFiles.length, 0), icon: Upload },
      { label: 'Reference Images', value: savedDocs.reduce((sum, d) => sum + d.imageFiles.length, 0), icon: FileImage },
    ],
    [savedDocs],
  );

  const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

  const saveDocumentation = (e) => {
    e.preventDefault();
    if (!docTitle.trim()) return setDocMessage('Please enter a title.');
    if (!docDate) return setDocMessage('Please select a date.');
    if (!modelFiles.length && !imageFiles.length) return setDocMessage('Upload at least one file.');

    setSavedDocs((prev) => [
      {
        id: Date.now(),
        title: docTitle.trim(),
        date: docDate,
        type: docType,
        description: docDescription.trim(),
        modelFiles: modelFiles.map((f) => f.name),
        imageFiles: imageFiles.map((f) => f.name),
      },
      ...prev,
    ]);
    setDocTitle('');
    setDocDescription('');
    setModelFiles([]);
    setImageFiles([]);
    setDocMessage('Documentation saved.');
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
        <h1 className="text-2xl font-semibold text-white">{SECTION_META.overview.title}</h1>
        <p className="text-white/60 text-sm mt-1">{SECTION_META.overview.description}</p>
      </div>
      <div className="p-6 space-y-6">
        <div className={`${cardClass} p-6`}>
          <h3 className="text-white text-lg font-semibold">BIM Role Responsibilities</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            <li>• Develops detailed 3D models and BIM documentation</li>
            <li>• Produces construction drawings and technical details</li>
            <li>• Coordinates clash detection and model integration</li>
            <li>• Assists in visualization, rendering, and simulations</li>
            <li>• Maintains digital project files and BIM standards</li>
          </ul>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {overviewStats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`${cardClass} p-4`}>
                <div className="flex items-center justify-between">
                  <p className="text-white/60 text-sm">{item.label}</p>
                  <Icon className="h-4 w-4 text-white/40" />
                </div>
                <p className="mt-2 text-white text-2xl font-semibold">{item.value}</p>
              </div>
            );
          })}
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
              <h2 className="text-white font-semibold text-[clamp(1rem,3.5vw,1.5rem)]">Welcome, {user?.first_name || 'BIM'} {user?.last_name || 'Specialist'}</h2>
              <p className="text-white/60 text-sm">Role: <span className="text-white/80">{user?.role || 'bim_specialist'}</span></p>
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

  const renderDocumentation = () => (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-semibold text-white">{SECTION_META.documentation.title}</h1>
          <p className="text-white/60 text-sm mt-1">{SECTION_META.documentation.description}</p>
        </div>
        <form onSubmit={saveDocumentation} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-white/70 text-sm font-semibold mb-2">Title</label>
              <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} type="text" placeholder="Ex: Clash Detection Report - Tower A" className="h-10 w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 text-sm text-white placeholder:text-white/45 outline-none" />
            </div>
            <div>
              <label className="block text-white/70 text-sm font-semibold mb-2">Date</label>
              <input value={docDate} onChange={(e) => setDocDate(e.target.value)} type="date" className="h-10 w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 text-sm text-white outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-white/70 text-sm font-semibold mb-2">Type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="h-10 w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 text-sm text-white outline-none">
              <option value="model-update">Model Update</option>
              <option value="clash-detection">Clash Detection</option>
              <option value="drawing-package">Drawing Package</option>
              <option value="simulation">Simulation / Rendering</option>
              <option value="bim-standards">BIM Standards</option>
            </select>
          </div>
          <div>
            <label className="block text-white/70 text-sm font-semibold mb-2">Description</label>
            <textarea value={docDescription} onChange={(e) => setDocDescription(e.target.value)} rows={5} placeholder="Describe updates, issues, integration notes, and standards checks." className="w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none resize-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-[#00273C]/40 p-4">
              <label className="block text-white/70 text-sm font-semibold mb-2">3D Model Files</label>
              <input type="file" multiple accept={MODEL_ACCEPT} onChange={(e) => setModelFiles(Array.from(e.target.files || []))} className="block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FF7120]/20 file:px-3 file:py-2 file:text-[#FF7120]" />
            </div>
            <div className="rounded-xl border border-white/10 bg-[#00273C]/40 p-4">
              <label className="block text-white/70 text-sm font-semibold mb-2">Images / References</label>
              <input type="file" multiple accept="image/*" onChange={(e) => setImageFiles(Array.from(e.target.files || []))} className="block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FF7120]/20 file:px-3 file:py-2 file:text-[#FF7120]" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="rounded-xl bg-[#FF7120] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-95 transition">Save Documentation</button>
            {docMessage && <p className="text-xs text-white/70">{docMessage}</p>}
          </div>
        </form>
      </div>
      <div className={cardClass}>
        <div className="p-6 border-b border-white/10">
          <h3 className="text-white text-lg font-semibold">Recent Logs</h3>
        </div>
        <div className="p-6 space-y-3 max-h-[420px] overflow-auto">
          {savedDocs.length === 0 && <p className="text-sm text-white/55">No documentation yet.</p>}
          {savedDocs.map((doc) => (
            <div key={doc.id} className="rounded-xl border border-white/10 bg-[#00273C]/40 p-4 space-y-2">
              <p className="text-sm font-semibold text-white">{doc.title}</p>
              <div className="flex gap-2 flex-wrap"><Badge tone="neutral">{doc.date}</Badge><Badge tone="neutral">{doc.type}</Badge></div>
              {doc.description && <p className="text-xs text-white/65">{doc.description}</p>}
              {doc.modelFiles.length > 0 && <p className="text-xs text-white/70">Models: {doc.modelFiles.join(', ')}</p>}
              {doc.imageFiles.length > 0 && <p className="text-xs text-white/70">Images: {doc.imageFiles.join(', ')}</p>}
            </div>
          ))}
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
            <BimSpecialistSidebar currentPage="attendance" onNavigate={onNavigate} activeSection={activeSection} onSelectSection={setActiveSection} />
          </aside>

          <main className="flex-1 min-w-0">
            <div className="lg:hidden mb-4 rounded-2xl border border-white/10 bg-[#001f35]/70 p-2 backdrop-blur-md">
              <div className="grid grid-cols-3 gap-2">
                {MOBILE_SECTION_TABS.map((tab) => (
                  <button key={tab.id} type="button" onClick={() => setActiveSection(tab.id)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${activeSection === tab.id ? 'bg-[#FF7120] text-white' : 'bg-white/5 text-white/70 hover:text-white'}`}>{tab.label}</button>
                ))}
              </div>
            </div>

            {activeSection === 'overview' && renderOverview()}
            {activeSection === 'attendance' && renderAttendance()}
            {activeSection === 'documentation' && renderDocumentation()}
          </main>
        </div>
      </div>
    </div>
  );
}
