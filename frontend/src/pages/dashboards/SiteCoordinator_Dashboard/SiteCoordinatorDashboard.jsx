import React, { useState } from 'react';
import {
  Calendar,
  ShieldCheck,
  User,
} from 'lucide-react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import SiteCoordinatorSidebar from './components/SiteCoordinatorSidebar';
import LocationAttendance from '../../../components/attendance/LocationAttendance';
import WorkDocCard from '../../../components/attendance/WorkDocCard';
import useMyAttendance from '../../../hooks/useMyAttendance';
import { TableSkeleton } from '../../../components/SkeletonLoader';

export default function SiteCoordinatorDashboard({ user, onNavigate }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workDoc, setWorkDoc] = useState('');
  const [attendanceReady, setAttendanceReady] = useState(false);
  const [expandedWorkIdx, setExpandedWorkIdx] = useState(null);
  const {
    records: attendanceRows,
    loading: attendanceLoading,
    error: attendanceError,
    refresh: refreshAttendance,
  } = useMyAttendance();

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
              <h2 className="text-white font-semibold text-[clamp(1rem,3.5vw,1.5rem)]">Welcome, {user?.first_name || 'Site'} {user?.last_name || 'Coordinator'}</h2>
              <p className="text-white/60 text-sm">Role: <span className="text-white/80">{user?.role || 'site_coordinator'}</span></p>
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
          <h3 className="text-white font-semibold flex-1 min-w-[200px] text-lg tracking-tight">My Attendance History</h3>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#001a2b] px-3 py-2 w-full sm:w-auto">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white/80 text-sm outline-none w-full cursor-pointer [&::-webkit-calendar-picker-indicator]:invert-[0.6]"
            />
          </div>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[1200px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#001a2b] border-b border-white/10">
                {[
                  "DATE",
                  "AM IN",
                  "AM OUT",
                  "PM IN",
                  "PM OUT",
                  "OT IN",
                  "OT OUT",
                  "TOTAL HOURS",
                  "LATE (MIN)",
                  "WORK DONE",
                  "ATTACHMENTS",
                  "PHOTO",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/50 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attendanceLoading && (
                <tr>
                  <td colSpan={12} className="px-6 py-4">
                    <TableSkeleton />
                  </td>
                </tr>
              )}
              {!attendanceLoading && attendanceRows.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-6 py-4 text-white/60 text-sm text-center">
                    No attendance records yet.
                  </td>
                </tr>
              )}
              {attendanceRows.map((row, index) => {
                const isLate = row?.status === "late";

                const hours = (() => {
                  if (!row.time_in || !row.time_out) return '-';
                  const [inH, inM] = row.time_in.split(':').map(Number);
                  const [outH, outM] = row.time_out.split(':').map(Number);
                  if ([inH, inM, outH, outM].some((v) => Number.isNaN(v))) return '-';
                  const mins = outH * 60 + outM - (inH * 60 + inM);
                  if (mins <= 0) return '-';
                  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                })();

                // Formatting times
                const [inH, inM] = row.time_in ? row.time_in.split(':') : [];
                let formattedAmIn = '-'; let formattedPmOut = '-';
                if (inH) formattedAmIn = `${inH > 12 ? inH - 12 : inH}:${inM} ${inH >= 12 ? 'PM' : 'AM'}`;
                const [outH, outM] = row.time_out ? row.time_out.split(':') : [];
                if (outH) formattedPmOut = `${outH > 12 ? outH - 12 : outH}:${outM} ${outH >= 12 ? 'PM' : 'AM'}`;

                // Fallbacks
                const amOut = row.time_in && row.time_out ? '12:00 PM' : '-';
                const pmIn = row.time_in && row.time_out ? '01:00 PM' : '-';

                return (
                  <React.Fragment key={row.id || index}>
                    <tr
                      className={[
                        "border-b border-white/5",
                        index % 2 === 0 ? "bg-[#00273C]" : "bg-[#001f35]",
                        "hover:bg-[#FF7120]/5 transition",
                      ].join(" ")}
                    >
                      <td className="px-6 py-4 text-white/90 text-sm whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="px-6 py-4 text-white/85 text-sm whitespace-nowrap">
                        {formattedAmIn}
                      </td>
                      <td className="px-6 py-4 text-white/85 text-sm whitespace-nowrap">
                        {amOut}
                      </td>
                      <td className="px-6 py-4 text-white/85 text-sm whitespace-nowrap">
                        {pmIn}
                      </td>
                      <td className="px-6 py-4 text-white/85 text-sm whitespace-nowrap">
                        {formattedPmOut}
                      </td>
                      <td className="px-6 py-4 text-white/85 text-sm whitespace-nowrap">
                        -
                      </td>
                      <td className="px-6 py-4 text-white/85 text-sm whitespace-nowrap">
                        -
                      </td>
                      <td className="px-6 py-4 text-emerald-400 text-sm font-semibold whitespace-nowrap">
                        {hours}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        {isLate ? (
                          <div className="flex flex-col gap-1 text-[#FF7120]">
                            <span>M: Late</span>
                            <span>Total: Late</span>
                          </div>
                        ) : (
                          <span className="text-white/85">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-white/85 text-sm max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{row.notes || '-'}</span>
                          {row.notes && (
                            <button
                              className="shrink-0 p-1 px-2 text-[10px] rounded bg-[#FF7120] text-white hover:bg-[#e0611b] transition"
                              onClick={() =>
                                setExpandedWorkIdx((v) => (v === index ? null : index))
                              }
                              type="button"
                              aria-label="Toggle work done details"
                            >
                              ...
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-white/60 text-sm whitespace-nowrap">
                        -
                      </td>
                      <td className="px-6 py-4 text-white/60 text-sm whitespace-nowrap">
                        -
                      </td>
                    </tr>

                    {expandedWorkIdx === index && (
                      <tr className="border-b border-white/5 bg-[#001a2b]">
                        <td colSpan={12} className="px-6 py-4">
                          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
                              WORK DONE (FULL)
                            </p>
                            <p className="mt-2 text-white/90 text-sm leading-relaxed">
                              {row.notes}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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

      <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex gap-6">
          <aside className="w-64 shrink-0 hidden lg:block">
            <SiteCoordinatorSidebar currentPage="attendance" onNavigate={onNavigate} activeSection="attendance" onSelectSection={() => { }} />
          </aside>

          <main className="flex-1 min-w-0">
            {renderAttendance()}
          </main>
        </div>
      </div>
    </div>
  );
}
