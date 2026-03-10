import React, { useEffect, useMemo, useState } from "react";
import PublicNavigation from "./PublicNavigation";
import StudioHeadSidebar from "../StudioHead/components/StudioHeadSidebar";
import {
  MapPin,
  Calendar,
  FileText,
  User,
  Clock,
  ShieldCheck,
  ChevronDownIcon,
} from "lucide-react";
import LocationAttendance from "../../../components/attendance/LocationAttendance";
import WorkDocCard from "../../../components/attendance/WorkDocCard";import AttendanceHistoryTable from '../../../components/attendance/AttendanceHistoryTable';import useMyAttendance from "../../../hooks/useMyAttendance";
import { getEvents } from "../../../services/attendanceService";
import { TableSkeleton, CardSkeleton } from "../../../components/SkeletonLoader";
const formatTime12 = (t) => {
  if (!t) return '-';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
};

const calcMinutes = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return 0;
  const [inH, inM] = timeIn.split(':').map(Number);
  const [outH, outM] = timeOut.split(':').map(Number);
  if ([inH, inM, outH, outM].some((v) => Number.isNaN(v))) return 0;
  const m = outH * 60 + outM - (inH * 60 + inM);
  return m > 0 ? m : 0;
};
const formatLateDeduction = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) return '0';
  const hours = Math.floor(decimalHours);
  const mins = Math.round((decimalHours - hours) * 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const buildLateBreakdown = (am, pm, ot) => {
  const parts = [];
  if (am?.is_late) parts.push(`AM: -${formatLateDeduction(am.late_deduction_hours)}`);
  if (pm?.is_late) parts.push(`PM: -${formatLateDeduction(pm.late_deduction_hours)}`);
  if (ot?.is_late) parts.push(`OT: -${formatLateDeduction(ot.late_deduction_hours)}`);
  return parts.join(' | ');
};
const groupByDate = (rows) => {
  const groups = {};
  rows.forEach((row) => {
    const d = row.date;
    if (!groups[d]) groups[d] = { date: d, morning: null, afternoon: null, overtime: null };
    if (row.session_type === 'morning') groups[d].morning = row;
    else if (row.session_type === 'afternoon') groups[d].afternoon = row;
    else if (row.session_type === 'overtime') groups[d].overtime = row;
    else if (!groups[d].morning) groups[d].morning = row;
  });
  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
};
const AttendanceDashboard = ({
  user,
  onLogout,
  onNavigate,
  NavComponent = PublicNavigation,
  sidebarComponent = null,
  currentPage = "attendance",
  topSpacingClass = "pt-40 sm:pt-28",
}) => {
  const isStudioHeadMode = user?.role === "studio_head" || user?.role === "admin";
  const hasCustomSidebar = Boolean(sidebarComponent);
  const showStudioHeadSidebar = isStudioHeadMode && !hasCustomSidebar;
  const hasSidebar = hasCustomSidebar || showStudioHeadSidebar;

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [workDoc, setWorkDoc] = useState("");
  const [locationReady, setLocationReady] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [events, setEvents] = useState([]);
  const {
    records: attendanceData,
    loading: attendanceLoading,
    error: attendanceError,
    refresh: refreshAttendance,
    latest,
  } = useMyAttendance();
  const todayIso = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchEventsData = async () => {
      try {
        const data = await getEvents({ upcoming: true });
        setEvents(data);
        const todayHoliday = data.some(
          (ev) =>
            ev.date === selectedDate && (ev.is_holiday || ev.event_type === "holiday" || ev.event_type === "downtime")
        );
        setIsHoliday(todayHoliday);
        if (todayHoliday) {
          setLocationReady(false);
        }
      } catch (err) {
        console.error("Failed to load events", err);
      }
    };
    fetchEventsData();
  }, [selectedDate]);

  const computeHours = (record) => {
    if (!record?.time_in || !record?.time_out) return "-";
    const [inH, inM] = record.time_in.split(":").map(Number);
    const [outH, outM] = record.time_out.split(":").map(Number);
    if ([inH, inM, outH, outM].some((v) => Number.isNaN(v))) return "-";
    const minutes = outH * 60 + outM - (inH * 60 + inM);
    if (minutes <= 0) return "-";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const stats = useMemo(() => {
    const isToday = latest?.date === todayIso;
    const hasIn = isToday && latest?.time_in;
    const hasOut = isToday && latest?.time_out;
    const todayStatus = attendanceLoading
      ? "Loading..."
      : isHoliday
        ? "Holiday / No Work"
        : hasOut
          ? "Completed"
          : hasIn
            ? "Timed In"
            : locationReady
              ? "Ready to Time In"
              : "Location Required";
    const todayTone = isHoliday
      ? "neutral"
      : hasOut || hasIn || locationReady
        ? "good"
        : "warn";

    const lateTone = latest?.status === "late" ? "warn" : "good";
    const lateLabel = latest?.status === "late" ? "Late" : latest?.status_label || "On time";

    return [
      {
        label: "Today's Status",
        value: todayStatus,
        icon: MapPin,
        tone: todayTone,
      },
      {
        label: "Latest Status",
        value: lateLabel,
        icon: Clock,
        tone: lateTone,
      },
      {
        label: "Total Hours (Latest)",
        value: computeHours(latest),
        icon: FileText,
        tone: "neutral",
      },
    ];
  }, [attendanceLoading, isHoliday, latest, locationReady, todayIso]);

  const cardClass =
    "rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]";

  const subtleText = "text-white/60";
  const titleText = "text-white font-semibold tracking-[-0.02em]";
  const sectionTitle = "text-white font-semibold tracking-tight text-[clamp(0.95rem,2.4vw,1.1rem)]";
  const containerClass = hasSidebar
    ? "max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-4 lg:gap-6"
    : "max-w-[1400px] mx-auto";
  const mainClass = hasSidebar
    ? "flex-1 min-w-0 space-y-5 sm:space-y-8"
    : "px-2 sm:px-10 space-y-5 sm:space-y-8";

  const Badge = ({ tone = "neutral", children }) => {
    const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border";
    const cls =
      tone === "warn"
        ? "bg-[#FF7120]/10 text-[#FF7120] border-[#FF7120]/30"
        : tone === "good"
          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
          : "bg-white/5 text-white/70 border-white/10";
    return <span className={`${base} ${cls}`}>{children}</span>;
  };

  return (
    <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
      {/* Soft background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-[#FF7120]/20 blur-[80px]" />
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
        <div className="absolute bottom-[-200px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/5 blur-[110px]" />
      </div>

      <NavComponent
        onNavigate={onNavigate}
        currentPage={currentPage || "attendance"}
        user={user}
        onLogout={onLogout}
      />

      <div className={`relative ${topSpacingClass} px-3 sm:px-6 pb-10 w-full`}>
        <div className={containerClass}>
          {hasCustomSidebar && (
            <aside className="w-full lg:w-64 shrink-0">
              {sidebarComponent}
            </aside>
          )}

          {showStudioHeadSidebar && (
            <aside className="w-full lg:w-64 shrink-0">
              <StudioHeadSidebar currentPage="attendance" onNavigate={onNavigate} />
            </aside>
          )}

          <div className={mainClass}>
            {/* Header / Welcome */}
            <div className={cardClass}>
              <div className="p-4 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-full border-2 border-[#FF7120]/70 bg-[#00273C] grid place-items-center overflow-hidden">
                      {user?.profile_picture ? (
                        <img
                          src={user.profile_picture}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8 sm:h-10 sm:w-10 text-[#FF7120]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className={`${titleText} text-[clamp(1rem,3.5vw,1.5rem)] truncate`}>
                        Welcome, {user?.first_name || "Villamora"} {user?.last_name || "Archie"}
                      </h2>
                      <p className={`${subtleText} text-sm sm:text-[0.95rem] font-medium`}>
                        Role: <span className="text-white/80">{user?.role || "Intern"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">
                      <ShieldCheck className="h-3.5 w-3.5 mr-1 inline" />
                      Attendance & Work Logs
                    </Badge>
                    <Badge tone={locationReady ? "good" : "warn"}>
                      {locationReady ? "Location Ready" : "Location Needed"}
                    </Badge>
                  </div>

                  <p className="mt-3 text-white/50 text-sm leading-relaxed">
                    Keep your attendance and daily accomplishments accurate — this helps compute hours,
                    late minutes, and overtime cleanly.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => alert("Add a policy modal / route here.")}
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition text-sm font-semibold"
                  >
                    View Policy
                  </button>
                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition text-sm font-semibold"
                  >
                    Back to Top
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {attendanceLoading ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                stats.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className={`${cardClass} p-4`}>
                      <div className="flex items-center justify-between">
                        <p className="text-white/60 text-sm font-medium">{s.label}</p>
                        <Icon className="h-4 w-4 text-white/40" />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-white text-lg font-semibold tracking-tight">{s.value}</p>
                        {s.tone !== "neutral" && (
                          <Badge tone={s.tone}>{s.tone === "good" ? "OK" : "Attention"}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Forms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className={`${cardClass} p-4 sm:p-6`}>
                {isHoliday ? (
                  <div className="space-y-3 text-white">
                    <h3 className="text-xl font-semibold text-white">Today is marked as a holiday / no work day.</h3>
                    <p className="text-white/70 text-sm">
                      Attendance is disabled. Enjoy your time off!
                    </p>
                  </div>
                ) : (
                  <LocationAttendance
                    role={user?.role}
                    className="p-0"
                    onStatusChange={({ ready }) => setLocationReady(ready)}
                    onRecordSaved={refreshAttendance}
                  />
                )}
              </div>

              <WorkDocCard value={workDoc} onChange={setWorkDoc} cardClass={cardClass} />
            </div>

            {/* History */}
            <div className={cardClass}>
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10">
                <div>
                  <h3 className={sectionTitle}>My Attendance History</h3>
                  <p className="mt-1 text-white/50 text-sm">
                    Review your logs, late minutes, and work notes.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#00273C]/60 px-3 py-2">
                    <Calendar className="h-4 w-4 text-white/40" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-white/80 text-sm outline-none"
                    />
                  </div>
                </div>
              </div>

              {attendanceError && (
                <div className="px-6 pb-3 text-sm text-red-200">
                  {attendanceError}
                </div>
              )}

              <div className="max-h-[520px] overflow-auto">
                <table className="w-full min-w-[1200px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#001a2b] border-b border-white/10">
                      {["DATE", "AM IN", "AM OUT", "PM IN", "PM OUT", "OT IN", "OT OUT", "TOTAL HOURS", "LATE DEDUCTION", "LOCATION", "NOTES", "ATTACHMENTS"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60 whitespace-nowrap"
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
                    {!attendanceLoading && attendanceData.length === 0 && (
                      <tr>
                        <td colSpan={12} className="px-6 py-4 text-white/60 text-sm">
                          No attendance records yet.
                        </td>
                      </tr>
                    )}
                    {(() => {
                      const daily = groupByDate(attendanceData);
                      return daily.map((day, index) => {
                        const am = day.morning;
                        const pm = day.afternoon;
                        const ot = day.overtime;

                        const totalMins =
                          calcMinutes(am?.time_in, am?.time_out) +
                          calcMinutes(pm?.time_in, pm?.time_out) +
                          calcMinutes(ot?.time_in, ot?.time_out);
                        const totalHours = totalMins > 0 ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m` : '-';

                        const totalDeduction =
                          parseFloat(am?.late_deduction_hours || 0) +
                          parseFloat(pm?.late_deduction_hours || 0) +
                          parseFloat(ot?.late_deduction_hours || 0);
                        const anyLate = am?.is_late || pm?.is_late || ot?.is_late;

                        const address = am?.clock_in_address || pm?.clock_in_address || ot?.clock_in_address ||
                          am?.location || pm?.location || ot?.location || '—';

                        const allNotes = [am?.notes, pm?.notes, ot?.notes].filter(Boolean).join(' | ');

                        return (
                          <tr
                            key={day.date}
                            className={[
                              "border-b border-white/5",
                              index % 2 === 0 ? "bg-black/10" : "bg-transparent",
                              "hover:bg-[#FF7120]/5 transition",
                            ].join(" ")}
                          >
                            <td className="px-4 py-4 text-white/90 text-sm whitespace-nowrap">{day.date}</td>
                            <td className="px-4 py-4 text-white/85 text-sm whitespace-nowrap">{formatTime12(am?.time_in)}</td>
                            <td className="px-4 py-4 text-white/85 text-sm whitespace-nowrap">{formatTime12(am?.time_out)}</td>
                            <td className="px-4 py-4 text-white/85 text-sm whitespace-nowrap">{formatTime12(pm?.time_in)}</td>
                            <td className="px-4 py-4 text-white/85 text-sm whitespace-nowrap">{formatTime12(pm?.time_out)}</td>
                            <td className="px-4 py-4 text-white/85 text-sm whitespace-nowrap">{formatTime12(ot?.time_in)}</td>
                            <td className="px-4 py-4 text-white/85 text-sm whitespace-nowrap">{formatTime12(ot?.time_out)}</td>
                            <td className="px-4 py-4 text-emerald-300 text-sm font-semibold whitespace-nowrap">{totalHours}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold">
                              {anyLate ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-[#FF7120] font-bold">-{formatLateDeduction(totalDeduction)}</span>
                                  <span className="text-white/50 text-xs">{buildLateBreakdown(am, pm, ot)}</span>
                                </div>
                              ) : (
                                <span className="text-emerald-300">On time</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-white/70 text-sm max-w-[180px]">
                              <span className="truncate block" title={address}>{address}</span>
                            </td>
                            <td className="px-4 py-4 text-white/85 text-sm">
                              {allNotes || '—'}
                            </td>
                            <td className="px-4 py-4 text-sm whitespace-nowrap">
                              {am?.attachment_url || pm?.attachment_url || ot?.attachment_url ? (
                                <a
                                  href={am?.attachment_url || pm?.attachment_url || ot?.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                  {am?.attachment_filename || pm?.attachment_filename || ot?.attachment_filename || 'Download'}
                                </a>
                              ) : (
                                <span className="text-white/40">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer note */}
            <p className="text-center text-white/35 text-xs pb-4">
              © {new Date().getFullYear()} Attendance Dashboard • Designed for clarity and accuracy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
