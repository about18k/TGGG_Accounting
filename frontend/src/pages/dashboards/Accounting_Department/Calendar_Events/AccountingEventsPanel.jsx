import { useEffect, useMemo, useState } from 'react';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../../../../services/attendanceService';
import { getAllUsers } from '../../../../services/adminService';
import { CardSkeleton } from '../../../../components/SkeletonLoader';
import {
  CalendarDays,
  Plus,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Pencil,
  Trash2,
  Save,
  X,
  History,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Label, Switch } from '../../../../components/ui/accounting-ui';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const NO_WORK_TYPES = new Set(['holiday', 'downtime']);
const AVAILABLE_ROLES = [
  { value: 'studio_head', label: 'Studio Head' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'bim_specialist', label: 'BIM Specialist' },
  { value: 'intern', label: 'Intern' },
  { value: 'junior_architect', label: 'Junior Architect' },
  { value: 'site_engineer', label: 'Site Engineer' },
  { value: 'site_coordinator', label: 'Site Coordinator' },
  { value: 'ceo', label: 'CEO' },
];

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

const formatTypeLabel = (eventItem) => {
  if (!eventItem) return 'Event';
  const isObj = typeof eventItem === 'object';
  const typeVal = isObj ? eventItem.event_type : eventItem;
  const normalized = String(typeVal || '').toLowerCase();
  if (normalized === 'holiday') return 'Holiday';
  if (normalized === 'downtime') return 'No Work Day';
  if (isObj && (Boolean(eventItem.is_recurring) || Boolean(eventItem.recurrence_group))) return 'Recurring';
  return 'Event';
};

const eventBlocksAttendance = (eventItem) => {
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

const getEventsForDate = (events, dateIso) => {
  return (events || []).filter((ev) => {
    const evStart = ev.date;
    const evEnd = ev.end_date || ev.date;
    return evStart <= dateIso && evEnd >= dateIso;
  });
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

export default function AccountingEventsPanel() {
  const initialFormState = {
    title: '',
    date: '',
    end_date: '',
    event_type: 'event',
    is_holiday: false,
    description: '',
    is_recurring: false,
    recurrence_frequency: 'weekly',
    recurrence_weekdays: [],
    recurrence_end_date: '',
    announcement_type: 'all_day',
    announcement_start_time: '00:00',
    announcement_duration_minutes: 60,
    visible_to_roles: [],
    visible_to_users: [],
  };

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
  const [form, setForm] = useState(initialFormState);
  const [error, setError] = useState('');

  const [showHistoryView, setShowHistoryView] = useState(false);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // New Visibility and Popover states
  const [popoverDate, setPopoverDate] = useState(null);
  const [restrictVisibility, setRestrictVisibility] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showEventsList, setShowEventsList] = useState(false);
  const [eventsListTab, setEventsListTab] = useState('month');
  const [allEvents, setAllEvents] = useState([]);
  const resetForm = () => {
    setForm(initialFormState);
    setEditingEventId(null);
    setRestrictVisibility(false);
    setError('');
  };

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const [currentData, historyData] = await Promise.all([
        getEvents(undefined, { force: true }),
        getEvents({ history: true }, { force: true })
      ]);
      const currentRows = Array.isArray(currentData) ? currentData : [];
      const historyRows = Array.isArray(historyData) ? historyData : [];
      const combined = [...currentRows, ...historyRows];
      combined.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
      setEvents(currentRows);
      setAllEvents(combined);
      setHistoryEvents(historyRows);
    } catch (err) {
      setError('Unable to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryEvents = async () => {
    setLoadingHistory(true);
    try {
      const data = await getEvents({ history: true }, { force: true });
      const rows = Array.isArray(data) ? data : [];
      rows.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
      setHistoryEvents(rows);
    } catch (err) {
      console.error('Failed to fetch history events:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (showHistoryView) {
      fetchHistoryEvents();
    }
  }, [showHistoryView]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date) {
      setError('Title and date are required');
      return;
    }
    setSaving(true);
    setError('');
    const isEditing = Boolean(editingEventId);
    
    const payload = {
      title: form.title,
      date: form.date,
      end_date: form.end_date || form.date,
      event_type: form.event_type,
      is_holiday: form.is_holiday,
      description: form.description,
      announcement_type: form.announcement_type,
      announcement_start_time: form.announcement_type === 'custom' ? form.announcement_start_time : null,
      announcement_duration_minutes: form.announcement_type === 'custom' ? form.announcement_duration_minutes : null,
      visible_to_roles: form.visible_to_roles,
      visible_to_users: form.visible_to_users,
    };

    if (!isEditing && form.is_recurring) {
      payload.is_recurring = true;
      payload.recurrence_frequency = form.recurrence_frequency;
      payload.recurrence_end_date = form.recurrence_end_date;
      if (form.recurrence_frequency === 'weekly') {
        payload.recurrence_weekdays = form.recurrence_weekdays;
      }
    }

    try {
      if (isEditing) {
        await updateEvent(editingEventId, payload);
      } else {
        await createEvent(payload);
      }
      
      resetForm();
      toast.success(isEditing ? 'Event updated successfully.' : 'Event added/scheduled successfully.');
      await fetchEvents();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save event';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const startEditingEvent = (eventItem) => {
    if (!eventItem?.id) {
      setError('This event cannot be edited because it has no ID.');
      toast.error('Unable to edit this event because it has no ID.');
      return;
    }

    setEditingEventId(eventItem.id);
    
    const roles = eventItem.visible_to_roles || [];
    const users = eventItem.visible_to_users || [];
    const hasRestrictions = roles.length > 0 || users.length > 0;
    setRestrictVisibility(hasRestrictions);

    setForm({
      title: eventItem.title || '',
      date: eventItem.date || '',
      end_date: eventItem.end_date || eventItem.date || '',
      event_type: eventItem.event_type || 'event',
      is_holiday: Boolean(eventItem.is_holiday),
      description: eventItem.description || '',
      is_recurring: false,
      recurrence_frequency: 'weekly',
      recurrence_weekdays: [],
      recurrence_end_date: '',
      announcement_type: eventItem.announcement_type || 'all_day',
      announcement_start_time: eventItem.announcement_start_time || '00:00',
      announcement_duration_minutes: eventItem.announcement_duration_minutes || 60,
      visible_to_roles: roles,
      visible_to_users: users,
    });

    if (eventItem.date) {
      const editDate = parseIsoDate(eventItem.date);
      if (editDate) {
        setCurrentMonth(new Date(editDate.getFullYear(), editDate.getMonth(), 1));
        setSelectedDate(eventItem.date);
      }
    }

    setError('');
    toast.success('Edit mode enabled. Update the form, then click Save Changes.');
  };

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
        const first = eventBlocksAttendance(a) ? 0 : 1;
        const second = eventBlocksAttendance(b) ? 0 : 1;
        if (first !== second) return first - second;
        return String(a.title || '').localeCompare(String(b.title || ''));
      });
    });

    return map;
  }, [events]);

  const confirmDelete = (eventItem) => {
    if (!eventItem?.id) {
      setError('This event cannot be deleted because it has no ID.');
      toast.error('Unable to delete this event because it has no ID.');
      return;
    }

    setConfirmDeleteEvent(eventItem);
  };

  const handleDeleteEvent = async (eventItem, params = {}) => {
    if (!eventItem?.id) return;

    setDeletingEventId(eventItem.id);
    setError('');
    try {
      await deleteEvent(eventItem.id, params);
      if (params.delete_type === 'series' && eventItem.recurrence_group) {
        setEvents((prev) => prev.filter((item) => item?.recurrence_group !== eventItem.recurrence_group));
        setAllEvents((prev) => prev.filter((item) => item?.recurrence_group !== eventItem.recurrence_group));
        setHistoryEvents((prev) => prev.filter((item) => item?.recurrence_group !== eventItem.recurrence_group));
      } else {
        setEvents((prev) => prev.filter((item) => item?.id !== eventItem.id));
        setAllEvents((prev) => prev.filter((item) => item?.id !== eventItem.id));
        setHistoryEvents((prev) => prev.filter((item) => item?.id !== eventItem.id));
      }
      if (editingEventId === eventItem.id) {
        resetForm();
      }
      toast.success(params.delete_type === 'series' ? 'Series deleted successfully.' : 'Event deleted successfully.');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to delete event';
      setError(msg);
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleStartDateChange = (val) => {
    setForm((prev) => {
      const next = { ...prev, date: val };
      if (!prev.end_date || prev.end_date < val) {
        next.end_date = val;
      }
      return next;
    });
  };

  const calendarDays = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

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
        const dayKey = toIsoDate(day);
        const dayEvents = getEventsForDate(events, dayKey);
        const hasBlockedEvent = dayEvents.some((eventItem) => eventBlocksAttendance(eventItem));
        return hasBlockedEvent ? count + 1 : count;
      }, 0),
    [calendarDays, events]
  );

  const monthEvents = useMemo(() => {
    const currentYear = currentMonth.getFullYear();
    const currentMonthIdx = currentMonth.getMonth();
    const monthStartIso = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    const monthEndIso = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return (allEvents || []).filter((ev) => {
      const evStart = ev.date;
      const evEnd = ev.end_date || ev.date;
      return evStart <= monthEndIso && evEnd >= monthStartIso;
    });
  }, [allEvents, currentMonth]);

  const monthEventsCount = monthEvents.length;
  const allTimeEventsCount = allEvents.length;

  const selectedDayEvents = useMemo(
    () => getEventsForDate(events, selectedDate),
    [events, selectedDate]
  );

  // Fetch users for visibility targeting on mount
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const data = await getAllUsers();
        const formatted = (data || []).map((u) => ({
          id: u.id,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
          position: u.role_name || u.role || 'Unassigned',
        }));
        setUsersList(formatted);
      } catch (err) {
        console.error('Failed to fetch users for calendar targeting:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-[#FF7120]" />
          <h3 className="text-white font-semibold text-lg">Calendar Overview</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="h-9 w-9 rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} className="mx-auto" />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="h-9 px-3 rounded-lg border border-white/15 text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white hover:border-[#FF7120]/40 transition cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="h-9 w-9 rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight size={16} className="mx-auto" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)] gap-5 items-stretch">
        <div className="order-1 rounded-xl border border-white/10 bg-[#001f35] p-3 sm:p-4 relative">
          <div className="flex flex-col gap-2 sm:gap-0 sm:grid sm:grid-cols-3 items-center mb-4">
            {/* Left Side: Clickable Ongoing events stat */}
            <div className="w-full sm:text-left flex justify-center sm:justify-start">
              <button
                type="button"
                onClick={() => setShowEventsList(true)}
                className="text-[11px] sm:text-xs text-[#FF7120] hover:text-[#ff853e] font-medium transition cursor-pointer bg-transparent border-0 outline-none p-0 flex items-center gap-1.5"
              >
                <CalendarDays size={13} className="shrink-0" />
                <span>
                  {monthEventsCount} event{monthEventsCount === 1 ? '' : 's'} this month · {allTimeEventsCount} all-time
                </span>
              </button>
            </div>

            {/* Center: Month/Year label */}
            <div className="text-center w-full">
              <h4 className="text-white text-sm sm:text-base font-semibold">{formatMonthLabel(currentMonth)}</h4>
            </div>

            {/* Right Side: No-work dates */}
            <div className="w-full text-center sm:text-right flex justify-center sm:justify-end">
              <p className="text-[11px] sm:text-xs text-white/55">
                {monthBlockedCount} no-work date{monthBlockedCount === 1 ? '' : 's'} this month
              </p>
            </div>
          </div>

            {/* Event List Popover */}
            {popoverDate && (
              <div className="absolute inset-0 bg-[#021B2C]/90 backdrop-blur-sm rounded-xl flex items-center justify-center p-4 z-20 animate-in fade-in zoom-in-95 duration-150">
                <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#001f35] p-5 shadow-2xl relative text-white">
                  <button
                    type="button"
                    onClick={() => setPopoverDate(null)}
                    className="absolute top-3 right-3 text-white/50 hover:text-white transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                  <h4 className="text-white text-sm font-semibold mb-3">
                    Events on {formatLongDate(popoverDate)}
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mb-4">
                    {eventsByDate.get(popoverDate)?.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          startEditingEvent(ev);
                          setPopoverDate(null);
                        }}
                        className="w-full text-left p-2.5 rounded-lg border border-white/5 bg-[#021B2C]/40 hover:bg-[#021B2C]/70 hover:border-white/10 transition flex items-center justify-between gap-3 text-xs cursor-pointer"
                      >
                        <span className="text-white font-medium truncate">{ev.title}</span>
                        <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border whitespace-nowrap ${getEventTypeBadgeStyles(ev)}`}>
                          {formatTypeLabel(ev)}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEventId(null);
                      setForm({
                        ...initialFormState,
                        date: popoverDate,
                      });
                      setError('');
                      setPopoverDate(null);
                    }}
                    className="w-full py-2 rounded-lg bg-[#FF7120] hover:bg-[#ff853e] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-[#FF7120]/15 cursor-pointer"
                  >
                    <Plus size={14} />
                    Add New Event
                  </button>
                </div>
              </div>
            )}

            {/* All Events List Popover */}
            {showEventsList && (
              <div className="absolute inset-0 bg-[#021B2C]/90 backdrop-blur-sm rounded-xl flex items-center justify-center p-4 z-20 animate-in fade-in zoom-in-95 duration-150">
                <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#001f35] p-5 shadow-2xl relative text-white flex flex-col h-[90%] max-h-[500px]">
                  <button
                    type="button"
                    onClick={() => setShowEventsList(false)}
                    className="absolute top-3 right-3 text-white/50 hover:text-white transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                  
                  <h3 className="text-white text-base font-semibold mb-4 flex items-center gap-2">
                    <CalendarDays size={18} className="text-[#FF7120]" />
                    Calendar Events List
                  </h3>
                  
                  {/* Tab Selector */}
                  <div className="flex border-b border-white/10 mb-4">
                    <button
                      type="button"
                      onClick={() => setEventsListTab('month')}
                      className={`flex-1 pb-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                        eventsListTab === 'month'
                          ? 'border-[#FF7120] text-white font-bold'
                          : 'border-transparent text-white/50 hover:text-white'
                      }`}
                    >
                      This Month ({monthEvents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventsListTab('all')}
                      className={`flex-1 pb-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                        eventsListTab === 'all'
                          ? 'border-[#FF7120] text-white font-bold'
                          : 'border-transparent text-white/50 hover:text-white'
                      }`}
                    >
                      All-Time ({allEvents.length})
                    </button>
                  </div>
                  
                  {/* Events List */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {(eventsListTab === 'month' ? monthEvents : allEvents).length === 0 ? (
                      <p className="text-xs text-white/55 italic text-center py-8">
                        No events found.
                      </p>
                    ) : (
                      (eventsListTab === 'month' ? monthEvents : allEvents).map((ev) => {
                        const evEndDate = ev.end_date || ev.date;
                        const todayStr = toIsoDate(new Date());
                        const isExpired = todayStr > evEndDate;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => {
                              const evDate = parseIsoDate(ev.date);
                              if (evDate) {
                                setCurrentMonth(new Date(evDate.getFullYear(), evDate.getMonth(), 1));
                                setSelectedDate(ev.date);
                              }
                              startEditingEvent(ev);
                              setShowEventsList(false);
                              setShowHistoryView(false);
                            }}
                            className="w-full text-left p-3 rounded-lg border border-white/5 bg-[#021B2C]/40 hover:bg-[#021B2C]/70 hover:border-white/10 transition flex items-center justify-between gap-3 text-xs cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-200"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-white font-medium truncate text-sm">{ev.title}</p>
                              <p className="text-[10px] text-white/55 mt-1">
                                {ev.end_date && ev.end_date !== ev.date 
                                  ? `${formatLongDate(ev.date)} - ${formatLongDate(ev.end_date)}`
                                  : formatLongDate(ev.date)
                                }
                              </p>
                              {ev.description && (
                                <p className="text-[11px] text-white/40 italic truncate mt-0.5">{ev.description}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className={`text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full border whitespace-nowrap ${getEventTypeBadgeStyles(ev)}`}>
                                {formatTypeLabel(ev)}
                              </span>
                              {isExpired && (
                                <span className="text-[9px] text-[#FF7120] uppercase tracking-wide font-medium bg-[#FF7120]/10 border border-[#FF7120]/20 px-1.5 py-0.5 rounded">Past</span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-7 gap-2 mb-2 border-b border-white/10 pb-2">
              {WEEKDAY_LABELS.map((day) => (
                <div key={day} className="text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/45 py-1">
                  {day}
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
                        const hasBlockedEvent = dayEvents.some((eventItem) => eventBlocksAttendance(eventItem));
                        const isPastDate = dayKey < todayIso;
                        const canOpenDate = !isPastDate || dayEvents.length > 0;

                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        let cellBgClass = '';
                        if (!inCurrentMonth) {
                          cellBgClass = 'bg-transparent border-transparent opacity-20';
                        } else if (isToday) {
                          cellBgClass = 'bg-[#FF7120]/8 border-[#FF7120]/45 hover:border-[#FF7120]/65';
                        } else if (isPastDate) {
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
                            onClick={() => {
                              if (canOpenDate) {
                                setSelectedDate(dayKey);
                                const de = eventsByDate.get(dayKey) || [];
                                if (de.length > 1) {
                                  setPopoverDate(dayKey);
                                } else if (de.length === 1) {
                                  startEditingEvent(de[0]);
                                  setPopoverDate(null);
                                } else {
                                  resetForm();
                                  setForm((prev) => ({ ...prev, date: dayKey }));
                                  setPopoverDate(null);
                                }
                                setShowHistoryView(false);
                              }
                            }}
                            disabled={!canOpenDate}
                            className={`h-full min-h-[96px] rounded-md border p-1.5 text-left transition-all focus:outline-none focus:ring-1 focus:ring-[#FF7120]/30 ${cellBgClass} ${isSelected ? 'border-[#FF7120]/60 ring-1 ring-[#FF7120]/45' : ''} ${
                              !canOpenDate ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
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
                            onClick={() => startEditingEvent(ev)}
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

          <aside className="order-2 flex flex-col gap-5 w-full h-full">
            {/* Event Management Form Panel */}
            <div className="rounded-xl border border-white/10 bg-[#001f35] p-4 flex flex-col text-white flex-1 h-full min-h-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {showHistoryView ? (
                    <History className="w-5 h-5 text-[#FF7120]" />
                  ) : editingEventId ? (
                    <Pencil className="w-5 h-5 text-[#FF7120]" />
                  ) : (
                    <Plus className="w-5 h-5 text-[#FF7120]" />
                  )}
                  <h3 className="text-white font-semibold text-sm">
                    {showHistoryView ? 'Event History' : editingEventId ? 'Edit Event Details' : 'Add New Event'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setShowHistoryView((prev) => !prev)}
                  className="flex items-center gap-1.5 text-xs text-[#FF7120] hover:text-[#ff853e] font-semibold border border-[#FF7120]/30 hover:border-[#FF7120]/50 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer bg-white/5"
                >
                  {showHistoryView ? (
                    <>
                      <Plus size={13} />
                      Back to Form
                    </>
                  ) : (
                    <>
                      <History size={13} />
                      History
                    </>
                  )}
                </button>
              </div>

              {showHistoryView ? (
                /* History List View */
                <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-0">
                  {loadingHistory ? (
                    <p className="text-xs text-white/55 italic text-center py-8">Loading history...</p>
                  ) : historyEvents.length === 0 ? (
                    <p className="text-xs text-white/55 italic text-center py-8">No past/expired events found.</p>
                  ) : (
                    historyEvents.map((eventItem) => (
                      <div
                        key={eventItem.id}
                        className="rounded-lg border border-white/5 bg-[#021B2C]/40 p-3 flex flex-col gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-white text-xs truncate">{eventItem.title}</span>
                          <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border whitespace-nowrap ${getEventTypeBadgeStyles(eventItem)}`}>
                            {formatTypeLabel(eventItem)}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/55">{formatLongDate(eventItem.date)}</p>
                        {eventItem.description && (
                          <p className="text-[10px] text-white/40 italic leading-relaxed line-clamp-2">{eventItem.description}</p>
                        )}
                        <div className="flex justify-end mt-2">
                          <button
                            type="button"
                            onClick={() => confirmDelete(eventItem)}
                            className="inline-flex items-center gap-1 hover:text-red-400 text-red-200 text-[10px] font-semibold transition cursor-pointer"
                          >
                            <Trash2 size={11} />
                            Delete Permanently
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Edit/Add Event Form View */
                <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between min-h-0">
                  <div className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
                  {selectedDayEvents.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-white/80 text-[10px] font-semibold uppercase tracking-wider">
                          Events on this Date ({selectedDayEvents.length})
                        </Label>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEventId(null);
                              setForm({
                                ...initialFormState,
                                date: selectedDate,
                              });
                              setError('');
                            }}
                            className="text-[10px] text-[#FF7120] hover:text-[#ff853e] font-semibold flex items-center gap-0.5 transition cursor-pointer bg-transparent border-0 outline-none"
                          >
                            <Plus size={11} />
                            Add another
                          </button>
                      </div>
                      <div className="relative">
                        <select
                          className="w-full bg-[#021B2C] border border-white/10 rounded-lg pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-[#FF7120] transition-colors appearance-none cursor-pointer"
                          value={editingEventId || ''}
                          onChange={(e) => {
                            if (e.target.value === 'new') {
                              setEditingEventId(null);
                              setForm({
                                ...initialFormState,
                                date: selectedDate,
                              });
                              setError('');
                            } else {
                              const ev = selectedDayEvents.find((item) => String(item.id) === e.target.value);
                              if (ev) startEditingEvent(ev);
                            }
                          }}
                        >
                          <option value="new">
                            {editingEventId ? '-- Create New Event --' : '-- Adding New Event --'}
                          </option>
                          {selectedDayEvents.map((ev) => (
                            <option key={ev.id} value={ev.id}>
                              {ev.title} ({formatTypeLabel(ev)})
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#FF7120]">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <Label className="text-white/80 block text-[10px] font-semibold uppercase tracking-wider">Title</Label>
                      <span className="text-[9px] text-white/40">
                        {(form.title || '').length}/200
                      </span>
                    </div>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, 200) })}
                      placeholder="Event name"
                      required
                      maxLength={200}
                      className="w-full bg-[#021B2C] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF7120] transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-white/80 mb-1.5 block text-[10px] font-semibold uppercase tracking-wider">Start Date</Label>
                      <div className="relative">
                        <input
                          type="date"
                          value={form.date}
                          onChange={(e) => handleStartDateChange(e.target.value)}
                          required
                          min={todayIso}
                          className="w-full bg-[#021B2C] border border-white/10 rounded-lg pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-[#FF7120] transition-colors [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#FF7120]">
                          <CalendarDays size={14} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-white/80 mb-1.5 block text-[10px] font-semibold uppercase tracking-wider">End Date</Label>
                      <div className="relative">
                        <input
                          type="date"
                          value={form.end_date || form.date}
                          onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                          required
                          min={form.date || todayIso}
                          className="w-full bg-[#021B2C] border border-white/10 rounded-lg pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-[#FF7120] transition-colors [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#FF7120]">
                          <CalendarDays size={14} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-white/80 mb-1.5 block text-[10px] font-semibold uppercase tracking-wider">Type</Label>
                    <div className="relative">
                      <select
                        className="w-full bg-[#021B2C] border border-white/10 rounded-lg pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-[#FF7120] transition-colors appearance-none cursor-pointer"
                        value={form.event_type}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            event_type: val,
                            is_holiday: val === 'holiday' || val === 'downtime' ? true : prev.is_holiday
                          }));
                        }}
                      >
                        <option value="event">Event</option>
                        <option value="holiday">Holiday</option>
                        <option value="downtime">No Work Day</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#FF7120]">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <Label htmlFor="is_holiday" className="text-white/80 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none">Mark as Holiday / No Work</Label>
                    <Switch
                      id="is_holiday"
                      checked={form.is_holiday}
                      onCheckedChange={(checked) => {
                        setForm((prev) => {
                          const next = { ...prev, is_holiday: checked };
                          if (!checked && (prev.event_type === 'holiday' || prev.event_type === 'downtime')) {
                            next.event_type = 'event';
                          }
                          if (checked && prev.event_type === 'event') {
                            next.event_type = 'holiday';
                          }
                          return next;
                        });
                      }}
                    />
                  </div>

                  {/* Recurrence Setup */}
                  {!editingEventId && (
                    <div className="border-t border-white/5 pt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="is_recurring" className="text-white/80 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none">Recurring Event</Label>
                        <Switch
                          id="is_recurring"
                          checked={form.is_recurring}
                          onCheckedChange={(checked) => setForm({ ...form, is_recurring: checked })}
                        />
                      </div>

                      {form.is_recurring && (
                        <div className="space-y-3 pl-1">
                          <div>
                            <Label className="text-white/80 mb-1.5 block text-[10px] font-semibold uppercase tracking-wider">Frequency</Label>
                            <div className="relative">
                              <select
                                className="w-full bg-[#021B2C] border border-white/10 rounded-lg pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-[#FF7120] transition-colors appearance-none cursor-pointer"
                                value={form.recurrence_frequency}
                                onChange={(e) => setForm({ ...form, recurrence_frequency: e.target.value })}
                              >
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#FF7120]">
                                <ChevronDown size={14} />
                              </div>
                            </div>
                          </div>

                          {form.recurrence_frequency === 'weekly' && (
                            <div>
                              <Label className="text-white/80 mb-1 block text-[10px] font-semibold uppercase tracking-wider">Repeat Days</Label>
                              <div className="flex flex-wrap gap-1">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                                  const isSelected = form.recurrence_weekdays.includes(day);
                                  return (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => {
                                        setForm((prev) => {
                                          const updated = prev.recurrence_weekdays.includes(day)
                                            ? prev.recurrence_weekdays.filter((d) => d !== day)
                                            : [...prev.recurrence_weekdays, day];
                                          return { ...prev, recurrence_weekdays: updated };
                                        });
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#FF7120] text-white'
                                          : 'bg-[#021B2C] text-white/50 hover:text-white border border-white/5'
                                      }`}
                                    >
                                      {day.substring(0, 3)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div>
                            <Label className="text-white/80 mb-1.5 block text-[10px] font-semibold uppercase tracking-wider">Repeat Until</Label>
                            <div className="relative">
                              <input
                                type="date"
                                value={form.recurrence_end_date}
                                onChange={(e) => setForm({ ...form, recurrence_end_date: e.target.value })}
                                required={form.is_recurring}
                                min={form.date || todayIso}
                                className="w-full bg-[#021B2C] border border-white/10 rounded-lg pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-[#FF7120] transition-colors [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#FF7120]">
                                <CalendarDays size={14} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Announcement Config */}
                  <div className="border-t border-white/5 pt-3 space-y-3">
                    <div>
                      <Label className="text-white/80 mb-1.5 block text-[10px] font-semibold uppercase tracking-wider">Announcement Visibility</Label>
                      <div className="relative">
                        <select
                          className="w-full bg-[#021B2C] border border-white/10 rounded-lg pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-[#FF7120] transition-colors appearance-none cursor-pointer"
                          value={form.announcement_type}
                          onChange={(e) => setForm({ ...form, announcement_type: e.target.value })}
                        >
                          <option value="all_day">All Day (Entire Date)</option>
                          <option value="custom">Custom Duration</option>
                          <option value="indefinite">Indefinite (Until Dismissed)</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#FF7120]">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    {form.announcement_type === 'custom' && (
                      <div className="grid grid-cols-2 gap-2 pl-1">
                        <div>
                          <Label className="text-white/80 mb-1 block text-[10px] font-semibold uppercase tracking-wider">Start Time</Label>
                          <input
                            type="time"
                            value={form.announcement_start_time}
                            onChange={(e) => setForm({ ...form, announcement_start_time: e.target.value })}
                            required
                            className="w-full bg-[#021B2C] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF7120] transition-colors [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <Label className="text-white/80 mb-1 block text-[10px] font-semibold uppercase tracking-wider">Duration (Min)</Label>
                          <input
                            type="number"
                            min="1"
                            value={form.announcement_duration_minutes}
                            onChange={(e) => setForm({ ...form, announcement_duration_minutes: parseInt(e.target.value) || 0 })}
                            required
                            placeholder="e.g. 60"
                            className="w-full bg-[#021B2C] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF7120] transition-colors"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Event Visibility Targeting */}
                  <div className="border-t border-white/5 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="restrictVisibility" className="text-white/80 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none">
                        Restrict Visibility
                      </Label>
                      <Switch
                        id="restrictVisibility"
                        checked={restrictVisibility}
                        onCheckedChange={(checked) => {
                          setRestrictVisibility(checked);
                          if (!checked) {
                            setForm((prev) => ({ ...prev, visible_to_roles: [], visible_to_users: [] }));
                          }
                        }}
                      />
                    </div>

                    {restrictVisibility && (
                      <div className="space-y-4 pl-1 animate-in fade-in duration-200">
                        {/* Roles targeting */}
                        <div>
                          <Label className="text-white/60 mb-1.5 block text-[9px] font-semibold uppercase tracking-wider">Visible to Roles</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {AVAILABLE_ROLES.map((role) => {
                              const isSelected = (form.visible_to_roles || []).includes(role.value);
                              return (
                                <button
                                  key={role.value}
                                  type="button"
                                  onClick={() => {
                                    setForm((prev) => {
                                      const prevRoles = prev.visible_to_roles || [];
                                      const updated = prevRoles.includes(role.value)
                                        ? prevRoles.filter((r) => r !== role.value)
                                        : [...prevRoles, role.value];
                                      return { ...prev, visible_to_roles: updated };
                                    });
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-medium transition cursor-pointer border ${
                                    isSelected
                                      ? 'bg-[#FF7120]/20 text-[#FFB284] border-[#FF7120]/45'
                                      : 'bg-[#021B2C] text-white/50 border-white/5 hover:text-white hover:border-white/10'
                                  }`}
                                >
                                  {role.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Users targeting */}
                        <div>
                          <Label className="text-white/60 mb-1.5 block text-[9px] font-semibold uppercase tracking-wider">Visible to Users</Label>
                          {loadingUsers ? (
                            <p className="text-[10px] text-white/45 italic">Loading users...</p>
                          ) : usersList.length === 0 ? (
                            <p className="text-[10px] text-white/45 italic">No employees found.</p>
                          ) : (
                            <div className="max-h-36 overflow-y-auto border border-white/10 bg-[#021B2C] rounded-lg p-2.5 space-y-1.5">
                              {usersList.map((userItem) => {
                                const isSelected = (form.visible_to_users || []).includes(userItem.id);
                                return (
                                  <label
                                    key={userItem.id}
                                    className="flex items-center gap-2 text-[11px] text-white/70 hover:text-white cursor-pointer select-none py-0.5"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        setForm((prev) => {
                                          const prevUsers = prev.visible_to_users || [];
                                          const updated = prevUsers.includes(userItem.id)
                                            ? prevUsers.filter((id) => id !== userItem.id)
                                            : [...prevUsers, userItem.id];
                                          return { ...prev, visible_to_users: updated };
                                        });
                                      }}
                                      className="rounded border-white/10 bg-[#021B2C] text-[#FF7120] focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-[#FF7120]"
                                    />
                                    <span>{userItem.name} ({userItem.position})</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label className="text-white/80 text-[10px] font-semibold uppercase tracking-wider">Description</Label>
                      <span className="text-[9px] text-white/40">
                        {(form.description || '').length}/500
                      </span>
                    </div>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 500) })}
                      placeholder="Optional notes"
                      rows={2}
                      maxLength={500}
                      className="w-full bg-[#021B2C] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF7120] transition-colors resize-none"
                    />
                  </div>
                  </div>

                  <div className="space-y-3 shrink-0 pt-3 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      {editingEventId ? (
                        <button
                          type="button"
                          onClick={() => {
                            const eventItem = events.find((e) => e.id === editingEventId);
                            if (eventItem) confirmDelete(eventItem);
                          }}
                          disabled={deletingEventId === editingEventId || saving}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                          title="Delete Event"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center gap-2">
                        {editingEventId && (
                          <button
                            type="button"
                            onClick={resetForm}
                            className="border border-white/10 hover:border-white/25 text-white/80 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer bg-white/5"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex items-center gap-1.5 bg-[#FF7120] hover:bg-[#ff853e] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-[#FF7120]/10 cursor-pointer"
                        >
                          {editingEventId ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          {saving ? 'Saving...' : editingEventId ? 'Save Changes' : 'Add Event'}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-[#FF7120] bg-[#FF7120]/5 border border-[#FF7120]/10 p-2.5 rounded-lg text-xs animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
          </aside>

          {loading && (
            <div className="xl:col-span-2">
              <CardSkeleton />
            </div>
          )}

          {error && (
            <div className="xl:col-span-2 rounded-lg border border-[#FF7120]/20 bg-[#FF7120]/8 p-3 text-sm text-[#FFB284] flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

      {confirmDeleteEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#001f35] p-5 shadow-2xl">
            <h4 className="text-white text-lg font-semibold">Delete Event</h4>
            <p className="mt-2 text-sm text-white/75 leading-relaxed">
              Delete "{confirmDeleteEvent.title}" on {formatLongDate(confirmDeleteEvent.date)}? This action cannot be undone.
            </p>
            {confirmDeleteEvent.recurrence_group && (
              <p className="mt-2 text-xs text-[#FF7120] font-semibold bg-[#FF7120]/10 border border-[#FF7120]/20 rounded-lg p-2.5">
                Note: This event is part of a recurring series.
              </p>
            )}
            <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteEvent(null)}
                className="px-4 py-2 rounded-lg border border-white/20 text-white/85 hover:border-white/35 text-sm font-semibold text-center cursor-pointer"
              >
                Cancel
              </button>

              {confirmDeleteEvent.recurrence_group ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      const eventToDelete = confirmDeleteEvent;
                      setConfirmDeleteEvent(null);
                      await handleDeleteEvent(eventToDelete, { delete_type: 'single' });
                    }}
                    className="px-4 py-2 rounded-lg border border-red-400/35 bg-red-500/10 text-red-200 hover:bg-red-500/20 text-sm font-semibold text-center cursor-pointer"
                  >
                    Delete Only This
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const eventToDelete = confirmDeleteEvent;
                      setConfirmDeleteEvent(null);
                      await handleDeleteEvent(eventToDelete, { delete_type: 'series' });
                    }}
                    className="px-4 py-2 rounded-lg border border-red-400/50 bg-red-500/25 text-red-200 hover:bg-red-500/35 text-sm font-semibold text-center cursor-pointer"
                  >
                    Delete Series
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const eventToDelete = confirmDeleteEvent;
                    setConfirmDeleteEvent(null);
                    await handleDeleteEvent(eventToDelete);
                  }}
                  className="px-4 py-2 rounded-lg border border-red-400/35 bg-red-500/15 text-red-200 hover:bg-red-500/25 text-sm font-semibold text-center cursor-pointer"
                >
                  Delete Event
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
