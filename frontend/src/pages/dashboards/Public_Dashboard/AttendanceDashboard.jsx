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
import WorkDocCard from "../../../components/attendance/WorkDocCard";
import axios from "axios";

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
  const [expandedWorkIdx, setExpandedWorkIdx] = useState(null);
  const [isHoliday, setIsHoliday] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/attendance/events/`,
          { headers, params: { upcoming: true } }
        );
        const data = res.data || [];
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
    fetchEvents();
  }, [selectedDate]);

  // Mock data (keep yours / replace with API)
  const attendanceData = [
    {
      date: "2026-02-09",
      amIn: "08:00",
      amOut: "12:00",
      pmIn: "13:00",
      pmOut: "17:00",
      otIn: "-",
      otOut: "-",
      totalHours: "4h 0m",
      late: { afternoon: "0", total: "0" },
      workDone:
        "Completed database design and implemented user authentication system. Fixed edge cases in validation and updated UI states for better UX.",
    },
    {
      date: "2026-02-08",
      amIn: "08:15",
      amOut: "12:00",
      pmIn: "13:00",
      pmOut: "17:00",
      otIn: "-",
      otOut: "-",
      totalHours: "3h 45m",
      late: { afternoon: "15", total: "15" },
      workDone:
        "Attended team meeting, updated project documentation and reviewed code. Refactored components for maintainability and reduced inline styling.",
    },
  ];

  const latest = attendanceData?.[0];

  const stats = useMemo(() => {
    const isLate = (latest?.late?.total ?? "0") !== "0";
    const todayStatus = isHoliday
      ? "Holiday / No Work"
      : locationReady
        ? "Ready to Time In"
        : "Location Required";
    const todayTone = isHoliday ? "neutral" : locationReady ? "good" : "warn";
    return [
      {
        label: "Today's Status",
        value: todayStatus,
        icon: MapPin,
        tone: todayTone,
      },
      {
        label: "Late Minutes (Latest)",
        value: latest?.late?.total ?? "0",
        icon: Clock,
        tone: isLate ? "warn" : "good",
      },
      {
        label: "Total Hours (Latest)",
        value: latest?.totalHours ?? "-",
        icon: FileText,
        tone: "neutral",
      },
    ];
  }, [latest, locationReady]);

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
              {stats.map((s, i) => {
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
              })}
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

              <div className="max-h-[520px] overflow-auto">
                <table className="w-full min-w-[1200px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#001a2b] border-b border-white/10">
                      {[
                        "Date",
                        "AM In",
                        "AM Out",
                        "PM In",
                        "PM Out",
                        "OT In",
                        "OT Out",
                        "Total Hours",
                        "Late",
                        "Work Done",
                        "Attachments",
                        "Photo",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {attendanceData.map((record, index) => {
                      const isLate = (record?.late?.total ?? "0") !== "0";
                      const expanded = expandedWorkIdx === index;

                      return (
                        <React.Fragment key={index}>
                          <tr
                            className={[
                              "border-b border-white/5",
                              index % 2 === 0 ? "bg-black/10" : "bg-transparent",
                              "hover:bg-[#FF7120]/5 transition",
                            ].join(" ")}
                          >
                            <td className="px-6 py-4 text-white/90 text-sm whitespace-nowrap">
                              {record.date}
                            </td>
                            <td className="px-6 py-4 text-white/85 text-sm whitespace-nowrap">
                              {record.amIn}
                            </td>
                            <td className="px-6 py-4 text-white/85 text-sm whitespace-nowrap">
                              {record.amOut}
                            </td>
                            <td className="px-6 py-4 text-white/85 text-sm whitespace-nowrap">
                              {record.pmIn}
                            </td>
                            <td className="px-6 py-4 text-white/85 text-sm whitespace-nowrap">
                              {record.pmOut}
                            </td>
                            <td className="px-6 py-4 text-white/85 text-sm whitespace-nowrap">
                              {record.otIn}
                            </td>
                            <td className="px-6 py-4 text-white/85 text-sm whitespace-nowrap">
                              {record.otOut}
                            </td>
                            <td className="px-6 py-4 text-emerald-300 text-sm font-semibold whitespace-nowrap">
                              {record.totalHours}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <Badge tone={record.late.afternoon !== "0" ? "warn" : "neutral"}>
                                  A: {record.late.afternoon} min
                                </Badge>
                                <Badge tone={isLate ? "warn" : "good"}>
                                  {isLate ? `Late: ${record.late.total} min` : "On time"}
                                </Badge>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-white/85 text-sm max-w-[340px]">
                              <div className="flex items-center gap-2">
                                <span className="truncate">{record.workDone}</span>
                                <button
                                  className="shrink-0 p-1 rounded-lg text-[#FF7120] hover:bg-[#FF7120]/10 transition"
                                  onClick={() =>
                                    setExpandedWorkIdx((v) => (v === index ? null : index))
                                  }
                                  type="button"
                                  aria-label="Toggle work done details"
                                >
                                  <ChevronDownIcon
                                    className={[
                                      "h-4 w-4 transition-transform",
                                      expanded ? "rotate-180" : "rotate-0",
                                    ].join(" ")}
                                  />
                                </button>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-white/60 text-sm whitespace-nowrap">
                              -
                            </td>
                            <td className="px-6 py-4 text-white/60 text-sm whitespace-nowrap">
                              -
                            </td>
                          </tr>

                          {expanded && (
                            <tr className="border-b border-white/5 bg-[#00273C]/40">
                              <td colSpan={12} className="px-6 py-4">
                                <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                                    Work Done (Full)
                                  </p>
                                  <p className="mt-2 text-white/90 text-sm leading-relaxed">
                                    {record.workDone}
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
