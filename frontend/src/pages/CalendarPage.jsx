import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock9 } from 'lucide-react';
import { getEvents } from '../services/attendanceService';

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

const formatTypeLabel = (eventItem) => {
  if (!eventItem) return 'Event';
  const isObj = typeof eventItem === 'object';
  const typeVal = isObj ? eventItem.event_type : eventItem;
  const normalized = String(typeVal || '').trim().toLowerCase();
  if (normalized === 'holiday') return 'Holiday';
  if (normalized === 'downtime') return 'No Work Day';
  if (isObj && (Boolean(eventItem.is_recurring) || Boolean(eventItem.recurrence_group))) return 'Recurring';
  return 'Event';
};

const blocksAttendance = (eventItem) => {
  if (!eventItem) return false;
  if (eventItem.blocks_attendance === true) return true;
  return Boolean(eventItem.is_holiday) || NO_WORK_TYPES.has(String(eventItem.event_type || '').toLowerCase());
};

const getEventStyles = (ev) => {
  if (!ev) return '';
  const type = String(ev.event_type || '').toLowerCase();
  const isHoliday = Boolean(ev.is_holiday) || type === 'holiday';
  const isDowntime = type === 'downtime';
  const isRecurring = Boolean(ev.is_recurring) || Boolean(ev.recurrence_group);

  if (isHoliday) {
    return 'bg-rose-500/15 text-rose-300 border-rose-500/20 border-l-[3px] border-l-rose-500 hover:bg-rose-500/25';
  }
  if (isDowntime) {
    return 'bg-amber-500/15 text-amber-300 border-amber-500/20 border-l-[3px] border-l-amber-500 hover:bg-amber-500/25';
  }
  if (isRecurring) {
    return 'bg-violet-500/15 text-violet-300 border-violet-500/20 border-l-[3px] border-l-violet-500 hover:bg-violet-500/25';
  }
  return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20 border-l-[3px] border-l-cyan-500 hover:bg-cyan-500/25';
};

const getEventTypeBadgeStyles = (ev) => {
  if (!ev) return '';
  const type = String(ev.event_type || '').toLowerCase();
  const isHoliday = Boolean(ev.is_holiday) || type === 'holiday';
  const isDowntime = type === 'downtime';
  const isRecurring = Boolean(ev.is_recurring) || Boolean(ev.recurrence_group);

  if (isHoliday) {
    return 'border-rose-500/30 text-rose-300 bg-rose-500/10 font-semibold';
  }
  if (isDowntime) {
    return 'border-amber-500/30 text-amber-300 bg-amber-500/10 font-semibold';
  }
  if (isRecurring) {
    return 'border-violet-500/30 text-violet-300 bg-violet-500/10 font-semibold';
  }
  return 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10 font-semibold';
};

const getSortedWeekEvents = (events, weekDays) => {
  const weekStart = toIsoDate(weekDays[0]);
  const weekEnd = toIsoDate(weekDays[6]);

  const weekEvents = (events || []).filter((ev) => {
    const evStart = ev.date;
    const evEnd = ev.end_date || ev.date;
    return evStart <= weekEnd && evEnd >= weekStart;
  });

  return [...weekEvents].sort((a, b) => {
    const aStart = parseIsoDate(a.date);
    const aEnd = parseIsoDate(a.end_date || a.date);
    const bStart = parseIsoDate(b.date);
    const bEnd = parseIsoDate(b.end_date || b.date);

    const aLen = aEnd - aStart;
    const bLen = bEnd - bStart;

    if (aLen !== bLen) return bLen - aLen;
    return aStart - bStart;
  });
};

const getWeekEventsWithRows = (events, weekDays) => {
  const sorted = getSortedWeekEvents(events, weekDays);
  const rows = [];

  return sorted.map((ev) => {
    const evStart = parseIsoDate(ev.date);
    const evEnd = parseIsoDate(ev.end_date || ev.date);
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];

    const start = evStart < weekStart ? weekStart : evStart;
    const end = evEnd > weekEnd ? weekEnd : evEnd;

    const colStart = start.getDay();
    const colEnd = end.getDay();

    let rowIndex = 0;
    while (true) {
      if (!rows[rowIndex]) {
        rows[rowIndex] = Array(7).fill(false);
      }
      let conflict = false;
      for (let c = colStart; c <= colEnd; c++) {
        if (rows[rowIndex][c]) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        for (let c = colStart; c <= colEnd; c++) {
          rows[rowIndex][c] = true;
        }
        break;
      }
      rowIndex++;
    }

    return {
      event: ev,
      style: {
        gridColumnStart: colStart + 1,
        gridColumnEnd: colEnd + 2,
        gridRowStart: rowIndex + 1,
        gridRowEnd: rowIndex + 2,
      }
    };
  });
};

export default function CalendarPage({ user }) {
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

    (events || []).forEach((eventItem) => {
      const start = eventItem?.date;
      const end = eventItem?.end_date || eventItem?.date;
      if (!start) return;

      let curr = parseIsoDate(start);
      const last = parseIsoDate(end);
      if (curr && last) {
        while (curr <= last) {
          const key = toIsoDate(curr);
          if (!map.has(key)) {
            map.set(key, []);
          }
          if (!map.get(key).some((ev) => ev.id === eventItem.id)) {
            map.get(key).push(eventItem);
          }
          curr.setDate(curr.getDate() + 1);
        }
      } else {
        const key = String(start).trim();
        if (!map.has(key)) {
          map.set(key, []);
        }
        if (!map.get(key).some((ev) => ev.id === eventItem.id)) {
          map.get(key).push(eventItem);
        }
      }
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

  const weeks = useMemo(() => {
    const grouped = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      grouped.push(calendarDays.slice(i, i + 7));
    }
    return grouped;
  }, [calendarDays]);

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
    <div className="space-y-6">
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

              <div className="grid grid-cols-7 gap-2 mb-2 border-b border-white/10 pb-2">
                {WEEKDAY_LABELS.map((weekday) => (
                  <div
                    key={weekday}
                    className="text-center text-[10px] sm:text-xs uppercase tracking-wide font-semibold text-white/45 py-1"
                  >
                    {weekday}
                  </div>
                ))}
              </div>

            <div className="space-y-2 select-none">
              {weeks.map((week, weekIdx) => {
                const weekEventsWithRows = getWeekEventsWithRows(events, week);
                return (
                  <div key={weekIdx} className="relative min-h-[110px] w-full border border-white/10 rounded-lg p-1 bg-[#021B2C]/10">
                    {/* Background Day Cells */}
                    <div className="grid grid-cols-7 gap-1 h-full min-h-[100px]">
                      {week.map((day) => {
                        const dayKey = toIsoDate(day);
                        const dayEvents = eventsByDate.get(dayKey) || [];
                        const inCurrentMonth = day.getMonth() === currentMonth.getMonth();
                        const isToday = dayKey === todayIso;
                        const isSelected = dayKey === selectedDate;
                        const hasBlockedEvent = dayEvents.some((eventItem) => blocksAttendance(eventItem));

                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        let cellBgClass = '';
                        if (!inCurrentMonth) {
                          cellBgClass = 'bg-transparent border-transparent opacity-20';
                        } else if (isToday) {
                          cellBgClass = 'bg-[#FF7120]/8 border-[#FF7120]/45 hover:border-[#FF7120]/65';
                        } else if (dayKey < todayIso) {
                          cellBgClass = isWeekend
                            ? 'bg-[#011322]/20 border-white/10 opacity-50 hover:opacity-85 hover:border-white/20'
                            : 'bg-[#021B2C]/20 border-white/10 opacity-60 hover:opacity-90 hover:border-white/20';
                        } else {
                          cellBgClass = isWeekend
                            ? 'bg-[#011322]/50 border-white/10 hover:border-white/25 hover:bg-[#011322]/70'
                            : 'bg-[#021B2C]/50 border-white/10 hover:border-white/25 hover:bg-[#021B2C]/70';
                        }

                        return (
                          <button
                            key={dayKey}
                            type="button"
                            onClick={() => setSelectedDate(dayKey)}
                            className={`h-full min-h-[96px] rounded-md border p-1.5 text-left transition-all focus:outline-none focus:ring-1 focus:ring-[#FF7120]/30 ${cellBgClass} ${isSelected ? 'border-[#FF7120]/60 ring-1 ring-[#FF7120]/45' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`w-6 h-6 flex items-center justify-center text-[10px] sm:text-xs font-semibold ${
                                  isToday
                                    ? 'bg-[#FF7120] text-white rounded-full font-bold shadow-sm shadow-[#FF7120]/30'
                                    : inCurrentMonth
                                      ? 'text-white/80'
                                      : 'text-white/30'
                                }`}
                              >
                                {day.getDate()}
                              </span>
                              {hasBlockedEvent && (
                                <span className="h-1.5 w-1.5 rounded-full bg-[#FF7120]" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Horizontal Overlap/Events Layer */}
                    <div className="absolute top-[38px] left-1 right-1 bottom-1 grid grid-cols-7 gap-y-1 gap-x-1 pointer-events-none auto-rows-max z-10">
                      {weekEventsWithRows.map(({ event: ev, style }) => {
                        const isStartOfWeekSlice = ev.date >= toIsoDate(week[0]);
                        const isEndOfWeekSlice = (ev.end_date || ev.date) <= toIsoDate(week[6]);
                        const roundedClass = `${isStartOfWeekSlice ? 'rounded-l-lg ml-1' : 'rounded-l-none ml-0'} ${isEndOfWeekSlice ? 'rounded-r-lg mr-1' : 'rounded-r-none mr-0'}`;

                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => setSelectedDate(ev.date)}
                            style={style}
                            className={`pointer-events-auto text-[10px] sm:text-[11px] px-2 py-0.5 text-left font-medium select-none shadow border transition-all hover:scale-[1.01] h-[24px] flex items-center min-w-0 ${roundedClass} ${getEventStyles(ev)}`}
                          >
                            <span className="truncate block w-full" title={ev.title}>
                              {ev.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
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
                  const typeLabel = formatTypeLabel(eventItem);

                  const getEventCardStyles = (ev) => {
                    const type = String(ev.event_type || '').toLowerCase();
                    const isHoliday = Boolean(ev.is_holiday) || type === 'holiday';
                    const isDowntime = type === 'downtime';
                    const isRecurring = Boolean(ev.is_recurring) || Boolean(ev.recurrence_group);

                    if (isHoliday) {
                      return 'border-rose-500/20 bg-rose-500/5 border-l-rose-500 border-l-[3px]';
                    }
                    if (isDowntime) {
                      return 'border-amber-500/20 bg-amber-500/5 border-l-amber-500 border-l-[3px]';
                    }
                    if (isRecurring) {
                      return 'border-violet-500/20 bg-violet-500/5 border-l-violet-500 border-l-[3px]';
                    }
                    return 'border-cyan-500/20 bg-cyan-500/5 border-l-cyan-500 border-l-[3px]';
                  };

                  return (
                    <div
                      key={eventItem.id ?? `${eventItem.title}-${eventItem.date}`}
                      className={`rounded-lg border p-3 ${getEventCardStyles(eventItem)}`}
                    >
                      <p className="text-sm text-white font-semibold truncate">{eventItem.title}</p>
                      <p className="text-[11px] text-white/60 mt-1 flex items-center gap-1.5">
                        <Clock9 className="h-3.5 w-3.5 text-[#FF7120]" />
                        {formatLongDate(eventItem.date)}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 border ${getEventTypeBadgeStyles(eventItem)}`}>
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
    </div>
  );
}
