import React, { useEffect, useMemo, useState } from "react";
import PublicNavigation from "./PublicNavigation";
import StudioHeadSidebar from "../StudioHead/components/StudioHeadSidebar";
import PrintAttendance from "../../globalattendancereport/PrintAttendance";
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
import AttendanceHistoryTable from '../../../components/attendance/AttendanceHistoryTable';
import useMyAttendance from "../../../hooks/useMyAttendance";
import { getEvents } from "../../../services/attendanceService";
import { TableSkeleton, CardSkeleton } from "../../../components/SkeletonLoader";

const AttendanceDashboard = ({
  user,
  onLogout,
  onNavigate,
  NavComponent = PublicNavigation,
  sidebarComponent = null,
  currentPage = "attendance",
  topSpacingClass = null,
  embedded = false,
}) => {
  const finalTopSpacing = topSpacingClass ?? (embedded ? "pt-0" : "pt-28");
  const isStudioHeadMode = user?.role === "studio_head" || user?.role === "admin";
  const hasCustomSidebar = Boolean(sidebarComponent);
  const showStudioHeadSidebar = isStudioHeadMode && !hasCustomSidebar;
  const hasSidebar = hasCustomSidebar || showStudioHeadSidebar;

  const [showDTROverlay, setShowDTROverlay] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [workDoc, setWorkDoc] = useState("");
  const [workDocAttachments, setWorkDocAttachments] = useState([]);
  const [locationReady, setLocationReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState(null);
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

  const isToday = latest?.date === todayIso;
  const hasIn = isToday && latest?.time_in;
  const hasOut = isToday && latest?.time_out;
  const showTimeIn = !hasIn || hasOut;
  const showTimeOut = hasIn && !hasOut;


  const cardClass =
    "rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]";

  const subtleText = "text-white/60";
  const titleText = "text-white font-semibold tracking-[-0.02em]";
  const sectionTitle = "text-white font-semibold tracking-tight text-[clamp(0.95rem,2.4vw,1.1rem)]";
  const containerClass = embedded || hasSidebar
    ? "max-w-full mx-auto flex flex-col lg:flex-row gap-4 lg:gap-6"
    : "max-w-[1400px] mx-auto";
  const mainClass = embedded || hasSidebar
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

  const content = (
    <div className={`relative ${finalTopSpacing} ${embedded ? '' : 'px-3 sm:px-6'} pb-10 w-full`}>
      <div className={containerClass}>
        {!embedded && hasCustomSidebar && (
          <aside className="w-full lg:w-64 shrink-0">
            {sidebarComponent}
          </aside>
        )}

        {!embedded && showStudioHeadSidebar && (
          <aside className="hidden lg:block lg:w-64 shrink-0">
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
                      Welcome, {user?.first_name || "Associate"}
                    </h2>
                    <p className={`${subtleText} text-sm sm:text-[0.95rem] font-medium capitalize`}>
                      Role: <span className="text-white/80">{user?.role?.replace('_', ' ') || "Staff"}</span>
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

              </div>

              <div className="flex flex-wrap gap-2">
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


          {/* Forms */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {attendanceLoading ? (
              <CardSkeleton />
            ) : (
              <>
                <div className={`${cardClass} p-4 sm:p-6 ${showTimeOut ? 'hidden' : 'block'}`}>
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
                      onStatusChange={({ ready, isBeforeSessionEnd, earlyTimeoutMessage, processing }) => {
                        setLocationReady(ready);
                        setIsLocked(!!isBeforeSessionEnd || !!processing);
                        setLockMessage(processing ? "Processing attendance..." : (earlyTimeoutMessage || null));
                      }}
                      onRecordSaved={refreshAttendance}
                      workDoc={workDoc}
                      workDocAttachments={workDocAttachments}
                    />
                  )}
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

          {/* History */}
          <AttendanceHistoryTable
            records={attendanceData}
            loading={attendanceLoading}
            error={attendanceError}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />

          {/* Footer note */}
          <p className="text-center text-white/35 text-xs pb-4">
            © {new Date().getFullYear()} Attendance Dashboard • Designed for clarity and accuracy.
          </p>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <>
        {content}
        {showDTROverlay && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, overflowY: 'auto', background: '#f5f5f5' }}>
            <PrintAttendance
              internId={user?.id}
              internName={`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Employee'}
              onClose={() => setShowDTROverlay(false)}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#00273C] relative">
      {/* Soft background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
        <div className="absolute bottom-[-200px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/5 blur-[110px]" />
      </div>

      <NavComponent
        onNavigate={onNavigate}
        currentPage={currentPage || "attendance"}
        user={user}
        onLogout={onLogout}
      />

      {content}

      {/* DTR print overlay – shows only this user's attendance */}
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
};

export default AttendanceDashboard;
