import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock9 } from 'lucide-react';

import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import { getEvents } from '../../../services/attendanceService';

import InternSidebar from '../Intern_Dashboard/components/InternSidebar';
import SiteEngineerSidebar from '../SiteEngineer_Dashboard/components/SiteEngineerSidebar';
import SiteCoordinatorSidebar from '../SiteCoordinator_Dashboard/components/SiteCoordinatorSidebar';
import JuniorDesignerSidebar from '../JuniorDesigner_Dashboard/components/JuniorDesignerSidebar';
import BimSpecialistSidebar from '../BimSpecialist/components/BimSpecialistSidebar';
import StudioHeadSidebar from '../StudioHead/components/StudioHeadSidebar';

const SIDEBAR_BY_ROLE = {
  intern: InternSidebar,
  site_engineer: SiteEngineerSidebar,
  site_coordinator: SiteCoordinatorSidebar,
  junior_architect: JuniorDesignerSidebar,
  bim_specialist: BimSpecialistSidebar,
  studio_head: StudioHeadSidebar,
  admin: StudioHeadSidebar,
};

const NO_WORK_TYPES = new Set(['holiday', 'downtime']);
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toIsoDate = (value) => {
  const date = value instanceof Date ? value : null;
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseIsoDate = (isoDate) => {
  const [year, month, day] = String(isoDate || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatMonthLabel = (monthDate) =>
  monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const formatLongDate = (isoDate) => {
  const date = parseIsoDate(isoDate);
  if (!date) return 'Unknown date';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const buildMonthGrid = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
};

const formatTypeLabel = (eventType) => {
  const normalized = String(eventType || '').trim().toLowerCase();
  if (normalized === 'holiday') return 'Holiday';
  if (normalized === 'downtime') return 'No Work Day';
  return 'Event';
};

const blocksAttendance = (eventItem) => {
  if (!eventItem) return false;
  if (eventItem.blocks_attendance === true) return true;
  return Boolean(eventItem.is_holiday) || NO_WORK_TYPES.has(String(eventItem.event_type || '').toLowerCase());
};

export default function EmployeeCalendarPage({ user, onNavigate }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));

  const SidebarComponent = SIDEBAR_BY_ROLE[user?.role] || null;

  useEffect(() => {
    let active = true;

    const fetchCalendarEvents = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getEvents({ upcoming: false }, { force: true });
        if (!active) return;

        const rows = Array.isArray(data) ? data : [];
        rows.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
        setEvents(rows);
      } catch (_err) {
        if (!active) return;
        setError('Unable to load your calendar events right now.');
        setEvents([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchCalendarEvents();

    return () => {
      active = false;
    };
  }, []);

  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const blockedCount = useMemo(
    () => events.filter((eventItem) => blocksAttendance(eventItem)).length,
    [events]
  );

  const todayRule = useMemo(
    () => events.find((eventItem) => eventItem?.date === todayIso && blocksAttendance(eventItem)),
    [events, todayIso]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map();

    events.forEach((eventItem) => {
      const key = String(eventItem?.date || '').trim();
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(eventItem);
    });

    map.forEach((items) => {
      items.sort((a, b) => {
        const first = blocksAttendance(a) ? 0 : 1;
        const second = blocksAttendance(b) ? 0 : 1;
        if (first !== second) return first - second;
        return String(a.title || '').localeCompare(String(b.title || ''));
      });
    });

    return map;
  }, [events]);

  const calendarDays = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  const monthBlockedCount = useMemo(
    () =>
      calendarDays.reduce((count, day) => {
        if (day.getMonth() !== currentMonth.getMonth()) return count;
        const dayKey = toIsoDate(day);
        const blocked = (eventsByDate.get(dayKey) || []).some((eventItem) => blocksAttendance(eventItem));
        return blocked ? count + 1 : count;
      }, 0),
    [calendarDays, currentMonth, eventsByDate]
  );

  const selectedDayEvents = useMemo(
    () => eventsByDate.get(selectedDate) || [],
    [eventsByDate, selectedDate]
  );

  const shiftMonth = (delta) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(toIsoDate(now));
  };

  return (
    <div className="min-h-screen bg-[#00273C] relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="calendar" user={user} />

      <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
          {SidebarComponent && (
            <aside className="w-64 shrink-0 hidden lg:block">
              <SidebarComponent
                currentPage="calendar"
                onNavigate={onNavigate}
                activeSection="attendance"
                onSelectSection={() => {}}
              />
            </aside>
          )}

          <main className="flex-1 min-w-0 space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#001f35]/70 p-5 sm:p-6 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-white text-xl sm:text-2xl font-semibold flex items-center gap-2">
                    <CalendarDays className="h-6 w-6 text-[#FF7120]" />
                    Calendar Events
                  </h1>
                  <p className="text-white/65 text-sm mt-1">
                    Check marked and unmarked dates. Marked Holiday/No Work Day dates disable time in and time out.
                  </p>
                </div>

              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/10 bg-[#021B2C]/70 px-4 py-3">
                  <p className="text-white/60 text-xs uppercase tracking-wider">Total Dates</p>
                  <p className="text-white text-2xl font-semibold mt-1">{events.length}</p>
                </div>
                <div className="rounded-xl border border-[#FF7120]/30 bg-[#FF7120]/10 px-4 py-3">
                  <p className="text-[#FFB284] text-xs uppercase tracking-wider">No Attendance Dates</p>
                  <p className="text-[#FF7120] text-2xl font-semibold mt-1">{blockedCount}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <p className="text-emerald-200 text-xs uppercase tracking-wider">Regular Dates</p>
                  <p className="text-emerald-300 text-2xl font-semibold mt-1">{Math.max(events.length - blockedCount, 0)}</p>
                </div>
              </div>

              {todayRule && (
                <div className="mt-4 rounded-xl border border-[#FF7120]/25 bg-[#FF7120]/10 px-4 py-3 text-[#FFB284] text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  Today is marked as {formatTypeLabel(todayRule.event_type)} ({todayRule.title}). You cannot make your attendance today.
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#001f35]/70 p-5 sm:p-6 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
              {loading && (
                <p className="text-white/65 text-sm py-8 text-center">Loading calendar events...</p>
              )}

              {!loading && error && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && events.length === 0 && (
                <p className="text-white/60 text-sm py-10 text-center italic">No calendar events found.</p>
              )}

              {!loading && !error && events.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-5 items-start">
                  <div className="order-1 rounded-xl border border-white/10 bg-[#021B2C]/70 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-white text-sm sm:text-base font-semibold">{formatMonthLabel(currentMonth)}</h3>
                        <p className="text-[11px] sm:text-xs text-white/55 mt-0.5">
                          {monthBlockedCount} no-work date{monthBlockedCount === 1 ? '' : 's'} in this month
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => shiftMonth(-1)}
                          className="h-8 w-8 rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition"
                          aria-label="Previous month"
                        >
                          <ChevronLeft className="h-4 w-4 mx-auto" />
                        </button>
                        <button
                          type="button"
                          onClick={goToToday}
                          className="h-8 px-3 rounded-lg border border-white/15 text-[11px] font-semibold uppercase tracking-wide text-white/80 hover:text-white hover:border-[#FF7120]/40 transition"
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => shiftMonth(1)}
                          className="h-8 w-8 rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition"
                          aria-label="Next month"
                        >
                          <ChevronRight className="h-4 w-4 mx-auto" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {WEEKDAY_LABELS.map((weekday) => (
                        <div
                          key={weekday}
                          className="text-center text-[10px] sm:text-xs uppercase tracking-wide font-semibold text-white/45 py-1"
                        >
                          {weekday}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {calendarDays.map((day) => {
                        const dayKey = toIsoDate(day);
                        const dayEvents = eventsByDate.get(dayKey) || [];
                        const inCurrentMonth = day.getMonth() === currentMonth.getMonth();
                        const isToday = dayKey === todayIso;
                        const isSelected = dayKey === selectedDate;
                        const hasBlockedEvent = dayEvents.some((eventItem) => blocksAttendance(eventItem));

                        return (
                          <button
                            key={dayKey}
                            type="button"
                            onClick={() => setSelectedDate(dayKey)}
                            className={`min-h-[88px] rounded-lg border p-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#FF7120]/50 ${
                              inCurrentMonth
                                ? 'bg-[#001f35]/70 border-white/10 hover:border-white/20'
                                : 'bg-[#001f35]/35 border-white/5 opacity-70'
                            } ${isSelected ? 'border-[#FF7120]/45 ring-1 ring-[#FF7120]/35' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span
                                className={`text-xs sm:text-sm font-semibold ${
                                  isToday
                                    ? 'text-[#FF7120]'
                                    : inCurrentMonth
                                      ? 'text-white'
                                      : 'text-white/45'
                                }`}
                              >
                                {day.getDate()}
                              </span>

                              {dayEvents.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/75 font-semibold">
                                  {dayEvents.length}
                                </span>
                              )}
                            </div>

                            <div className="mt-1.5 space-y-1">
                              {dayEvents.slice(0, 2).map((eventItem) => (
                                <p
                                  key={`${dayKey}-${eventItem.id ?? eventItem.title}`}
                                  className={`truncate text-[10px] sm:text-[11px] rounded px-1.5 py-0.5 ${
                                    blocksAttendance(eventItem)
                                      ? 'bg-[#FF7120]/20 text-[#FFB284]'
                                      : 'bg-emerald-500/14 text-emerald-300'
                                  }`}
                                >
                                  {eventItem.title}
                                </p>
                              ))}
                              {dayEvents.length > 2 && (
                                <p className="text-[10px] text-white/50 px-1">+{dayEvents.length - 2} more</p>
                              )}
                            </div>

                            {hasBlockedEvent && (
                              <span className="inline-block mt-2 h-1.5 w-1.5 rounded-full bg-[#FF7120]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <aside className="order-2 rounded-xl border border-white/10 bg-[#021B2C]/70 p-4 flex flex-col">
                    <h3 className="text-white text-sm font-semibold">Selected Date</h3>
                    <p className="text-white/60 text-xs mt-1">{formatLongDate(selectedDate)}</p>

                    <div className="mt-4 flex items-center gap-3 text-[11px] text-white/60">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#FF7120]" />
                        Attendance blocked
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        Regular date
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 max-h-[430px] overflow-y-auto pr-1">
                      {selectedDayEvents.length === 0 && (
                        <div className="rounded-lg border border-white/10 bg-[#001f35]/70 p-3 text-xs text-white/55 italic">
                          No events on this date.
                        </div>
                      )}

                      {selectedDayEvents.map((eventItem) => {
                        const eventBlocks = blocksAttendance(eventItem);
                        const typeLabel = formatTypeLabel(eventItem.event_type);

                        return (
                          <div
                            key={eventItem.id ?? `${eventItem.title}-${eventItem.date}`}
                            className={`rounded-lg border p-3 ${
                              eventBlocks
                                ? 'border-[#FF7120]/30 bg-[#FF7120]/8'
                                : 'border-emerald-500/30 bg-emerald-500/8'
                            }`}
                          >
                            <p className="text-sm text-white font-semibold truncate">{eventItem.title}</p>
                            <p className="text-[11px] text-white/60 mt-1 flex items-center gap-1.5">
                              <Clock9 className="h-3.5 w-3.5 text-[#FF7120]" />
                              {formatLongDate(eventItem.date)}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-[10px] uppercase tracking-wide text-white/70 border border-white/15 bg-white/5 rounded-full px-2 py-1">
                                {typeLabel}
                              </span>
                              <span
                                className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-1 border inline-flex items-center gap-1 ${
                                  eventBlocks
                                    ? 'text-[#FFB284] border-[#FF7120]/35 bg-[#FF7120]/12'
                                    : 'text-emerald-300 border-emerald-500/35 bg-emerald-500/12'
                                }`}
                              >
                                {eventBlocks ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                {eventBlocks ? 'Attendance Blocked' : 'Regular Date'}
                              </span>
                            </div>
                            {eventItem.description && (
                              <p className="text-[11px] text-white/50 mt-2 leading-relaxed">{eventItem.description}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </aside>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
