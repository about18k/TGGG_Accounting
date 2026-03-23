import { useEffect, useMemo, useState } from 'react';
import { getEvents, createEvent } from '../../../../services/attendanceService';
import {
  CalendarDays,
  Plus,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Label, Switch } from '../../../../components/ui/accounting-ui';

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

const formatTypeLabel = (eventType) => {
  const normalized = String(eventType || '').toLowerCase();
  if (normalized === 'holiday') return 'Holiday';
  if (normalized === 'downtime') return 'No Work Day';
  return 'Event';
};

const eventBlocksAttendance = (eventItem) => {
  if (!eventItem) return false;
  if (eventItem.blocks_attendance === true) return true;
  return Boolean(eventItem.is_holiday) || NO_WORK_TYPES.has(String(eventItem.event_type || '').toLowerCase());
};

const buildMonthGrid = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
};

export default function AccountingEventsPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
  const [form, setForm] = useState({
    title: '',
    date: '',
    event_type: 'event',
    is_holiday: false,
    description: '',
  });
  const [error, setError] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getEvents(undefined, { force: true });
      const rows = Array.isArray(data) ? data : [];
      rows.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
      setEvents(rows);
    } catch (err) {
      setError('Unable to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date) {
      setError('Title and date are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const createdEvent = await createEvent(form);
      setForm({ title: '', date: '', event_type: 'event', is_holiday: false, description: '' });

      if (createdEvent && (createdEvent.id || createdEvent.date)) {
        setEvents((prev) => {
          const next = [createdEvent, ...prev.filter((item) => item?.id !== createdEvent.id)];
          return next.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
        });

        if (createdEvent.date) {
          const createdDate = parseIsoDate(createdEvent.date);
          if (createdDate) {
            setCurrentMonth(new Date(createdDate.getFullYear(), createdDate.getMonth(), 1));
            setSelectedDate(createdEvent.date);
          }
        }
      } else {
        await fetchEvents();
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save event';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

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
        const first = eventBlocksAttendance(a) ? 0 : 1;
        const second = eventBlocksAttendance(b) ? 0 : 1;
        if (first !== second) return first - second;
        return String(a.title || '').localeCompare(String(b.title || ''));
      });
    });

    return map;
  }, [events]);

  const calendarDays = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const monthBlockedCount = useMemo(
    () =>
      calendarDays.reduce((count, day) => {
        const dayKey = toIsoDate(day);
        const hasBlockedEvent = (eventsByDate.get(dayKey) || []).some((eventItem) => eventBlocksAttendance(eventItem));
        return hasBlockedEvent ? count + 1 : count;
      }, 0),
    [calendarDays, eventsByDate]
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
      <div className="bg-[#00273C]/60 rounded-xl border border-white/10 p-6 shadow-lg">
        <div className="space-y-4 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-[#FF7120]" />
            <h3 className="text-white font-semibold text-lg">Add New Event</h3>
          </div>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white/80 mb-1.5 block text-xs font-semibold uppercase tracking-wider">Title</Label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Event name"
                required
                className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#FF7120] transition-colors"
              />
            </div>
            <div>
              <Label className="text-white/80 mb-1.5 block text-xs font-semibold uppercase tracking-wider">Date</Label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#FF7120] transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <Label className="text-white/80 mb-1.5 block text-xs font-semibold uppercase tracking-wider">Type</Label>
              <div className="relative">
                <select
                  className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#FF7120] transition-colors appearance-none cursor-pointer"
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                >
                  <option value="event">Event</option>
                  <option value="holiday">Holiday</option>
                  <option value="downtime">No Work Day</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#FF7120]">
                  <CalendarDays size={16} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="is_holiday"
                checked={form.is_holiday || form.event_type === 'holiday' || form.event_type === 'downtime'}
                onCheckedChange={(checked) => setForm({ ...form, is_holiday: checked })}
              />
              <Label htmlFor="is_holiday" className="text-white/80 text-sm cursor-pointer">Mark as holiday / no work</Label>
            </div>
            <div className="md:col-span-2">
              <Label className="text-white/80 mb-1.5 block text-xs font-semibold uppercase tracking-wider">Description</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional notes"
                rows={3}
                className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#FF7120] transition-colors resize-none"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button 
                type="submit" 
                disabled={saving}
                className="flex items-center gap-2 bg-[#FF7120] hover:bg-[#ff853e] text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-[#FF7120]/10"
              >
                <Plus className="w-4 h-4" />
                {saving ? 'Saving...' : 'Add Event'}
              </button>
            </div>
            {error && (
              <div className="md:col-span-2 flex items-center gap-2 text-[#FF7120] bg-[#FF7120]/5 border border-[#FF7120]/10 p-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="bg-[#00273C]/60 rounded-xl border border-white/10 p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <CalendarDays size={20} className="text-[#FF7120]" />
            <h3 className="text-white font-semibold text-lg">Calendar Overview</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="h-9 w-9 rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} className="mx-auto" />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="h-9 px-3 rounded-lg border border-white/15 text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white hover:border-[#FF7120]/40 transition"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="h-9 w-9 rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition"
              aria-label="Next month"
            >
              <ChevronRight size={16} className="mx-auto" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-5 items-start">
          <div className="order-1 rounded-xl border border-white/10 bg-[#001f35] p-3 sm:p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white text-sm sm:text-base font-semibold">{formatMonthLabel(currentMonth)}</h4>
              <p className="text-[11px] sm:text-xs text-white/55">{monthBlockedCount} no-work date{monthBlockedCount === 1 ? '' : 's'} this month</p>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {WEEKDAY_LABELS.map((day) => (
                <div key={day} className="text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/45 py-1">
                  {day}
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
                const hasBlockedEvent = dayEvents.some((eventItem) => eventBlocksAttendance(eventItem));

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => setSelectedDate(dayKey)}
                    className={`min-h-[88px] rounded-lg border p-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#FF7120]/50 ${
                      inCurrentMonth
                        ? 'bg-[#021B2C]/70 border-white/10 hover:border-white/20'
                        : 'bg-[#021B2C]/35 border-white/5 opacity-70'
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
                            eventBlocksAttendance(eventItem)
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

          <aside className="order-2 rounded-xl border border-white/10 bg-[#001f35] p-4 flex flex-col">
            <h4 className="text-white font-semibold text-sm">Selected Date</h4>
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

            <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {selectedDayEvents.length === 0 && (
                <div className="rounded-lg border border-white/10 bg-[#021B2C]/70 p-3 text-xs text-white/55 italic">
                  No events on this date.
                </div>
              )}

              {selectedDayEvents.map((eventItem) => {
                const blocked = eventBlocksAttendance(eventItem);

                return (
                  <div
                    key={eventItem.id ?? `${eventItem.title}-${eventItem.date}`}
                    className={`rounded-lg border p-3 ${
                      blocked
                        ? 'border-[#FF7120]/30 bg-[#FF7120]/8'
                        : 'border-emerald-500/30 bg-emerald-500/8'
                    }`}
                  >
                    <p className="text-sm text-white font-semibold truncate">{eventItem.title}</p>
                    <p className="text-[11px] text-white/60 mt-1 flex items-center gap-1.5">
                      <Clock size={12} className="text-[#FF7120]" />
                      {formatLongDate(eventItem.date)}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-white/70 border border-white/15 bg-white/5 rounded-full px-2 py-1">
                        {formatTypeLabel(eventItem.event_type)}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-1 border inline-flex items-center gap-1 ${
                          blocked
                            ? 'text-[#FFB284] border-[#FF7120]/35 bg-[#FF7120]/12'
                            : 'text-emerald-300 border-emerald-500/35 bg-emerald-500/12'
                        }`}
                      >
                        {blocked ? <AlertCircle size={11} /> : <CheckCircle2 size={11} />}
                        {blocked ? 'No Attendance' : 'Regular Day'}
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

          {loading && (
            <div className="xl:col-span-2 rounded-lg border border-white/10 bg-[#021B2C]/70 p-3 text-sm text-white/60">
              Loading calendar events...
            </div>
          )}

          {error && (
            <div className="xl:col-span-2 rounded-lg border border-[#FF7120]/20 bg-[#FF7120]/8 p-3 text-sm text-[#FFB284] flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
