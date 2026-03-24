import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { getEvents } from '../../../services/attendanceService';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import InternSidebar from './components/InternSidebar';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const NO_WORK_TYPES = new Set(['holiday', 'downtime']);

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

export default function CalendarPage({ user, onNavigate }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));

  useEffect(() => {
    let active = true;

    const fetchCalendarEvents = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getEvents(undefined, { force: true });
        if (!active) return;

        const rows = Array.isArray(data) ? data : [];
        rows.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
        setEvents(rows);
      } catch (_err) {
        if (!active) return;
        setError('Unable to load calendar events right now.');
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

  const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

  return (
    <div className="min-h-screen bg-[#00273C] relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="calendar" user={user} />

      <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
          <aside className="w-64 shrink-0 hidden lg:block">
            <InternSidebar 
              currentPage="calendar" 
              onNavigate={onNavigate} 
            />
          </aside>

          <main className="flex-1 min-w-0 space-y-6">
      {/* Header */}
      <section className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-white text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-[#FF7120]" />
              Calendar Events
            </h2>
            <p className="text-white/65 text-sm mt-1">
              Company events set by Accounting. No Work Days prevent time clock-in/out.
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

      {/* Calendar View */}
      <section className={`${cardClass} p-5 sm:p-6`}>
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
            {/* Calendar Grid */}
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
                    className="p-1.5 rounded-lg border border-white/10 text-white/60 hover:bg-white/5 hover:text-white transition"
                    title="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goToToday}
                    className="px-2 py-1.5 rounded-lg border border-[#FF7120]/30 bg-[#FF7120]/10 text-[#FF7120] hover:bg-[#FF7120]/20 transition text-xs font-medium"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftMonth(1)}
                    className="p-1.5 rounded-lg border border-white/10 text-white/60 hover:bg-white/5 hover:text-white transition"
                    title="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="text-center text-white/50 text-xs font-semibold py-2">
                    {label}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dayIsoDate = toIsoDate(day);
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isToday = dayIsoDate === todayIso;
                  const isSelected = dayIsoDate === selectedDate;
                  const dayEvents = eventsByDate.get(dayIsoDate) || [];
                  const hasBlocked = dayEvents.some((e) => blocksAttendance(e));

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedDate(dayIsoDate)}
                      className={`p-2 rounded-lg text-xs h-12 sm:h-14 flex flex-col items-center justify-center transition relative ${
                        !isCurrentMonth
                          ? 'text-white/20 bg-transparent'
                          : isSelected
                            ? 'border-2 border-[#FF7120] bg-[#FF7120]/20 text-white'
                            : isToday
                              ? 'border border-[#FF7120] bg-[#FF7120]/10 text-white'
                              : hasBlocked
                                ? 'border border-white/20 bg-red-500/10 text-white'
                                : dayEvents.length > 0
                                  ? 'border border-white/10 bg-white/5 text-white'
                                  : 'border border-white/10 bg-transparent text-white/60 hover:bg-white/5'
                      }`}
                    >
                      <span className="font-semibold">{day.getDate()}</span>
                      {dayEvents.length > 0 && (
                        <span className={`text-[9px] mt-0.5 px-1 rounded ${hasBlocked ? 'bg-red-500/60' : 'bg-[#FF7120]/60'}`}>
                          {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Events Sidebar */}
            <aside className="order-2 rounded-xl border border-white/10 bg-[#021B2C]/70 p-3 sm:p-4">
              <h4 className="text-white font-semibold text-sm">Selected Date</h4>
              <p className="text-white/60 text-xs mt-1 mb-4">{formatLongDate(selectedDate)}</p>

              {selectedDayEvents.length === 0 ? (
                <p className="text-white/50 text-xs italic">No events on this date.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map((eventItem) => (
                    <div
                      key={eventItem.id}
                      className={`rounded-lg p-3 text-xs border ${
                        blocksAttendance(eventItem)
                          ? 'border-red-500/30 bg-red-500/5'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">{eventItem.title || 'No Title'}</p>
                          <p className={`text-[11px] mt-1 ${blocksAttendance(eventItem) ? 'text-red-300' : 'text-white/60'}`}>
                            {formatTypeLabel(eventItem.event_type)}
                          </p>
                        </div>
                        {blocksAttendance(eventItem) && (
                          <div className="text-red-400 text-[10px] font-semibold px-2 py-1 bg-red-500/20 rounded whitespace-nowrap">
                            No Clock
                          </div>
                        )}
                      </div>
                      {eventItem.description && (
                        <p className="text-white/50 text-[10px] mt-2 line-clamp-2">{eventItem.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
