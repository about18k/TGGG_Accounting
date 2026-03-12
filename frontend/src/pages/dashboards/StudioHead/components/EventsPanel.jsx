import { useEffect, useState } from 'react';
import { getEvents, createEvent } from '../../../../services/attendanceService';
import { CalendarDays, Plus, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Textarea, Switch } from '../../../../components/ui/accounting-ui';

export default function EventsPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
      const data = await getEvents({ upcoming: true });
      setEvents(data || []);
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
      await createEvent(form);
      setForm({ title: '', date: '', event_type: 'event', is_holiday: false, description: '' });
      fetchEvents();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save event';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#00273C]/60 rounded-xl border border-white/10 p-6">
        <div className="space-y-4 text-white">
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

      <div className="bg-[#00273C]/60 rounded-xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-6">
          <CalendarDays size={20} className="text-[#FF7120]" />
          <h3 className="text-white font-semibold text-lg">Upcoming Events & Holidays</h3>
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar manage-users-list">
          <style>
            {`.manage-users-list { scrollbar-width: none; -ms-overflow-style: none; } .manage-users-list::-webkit-scrollbar { display: none; }`}
          </style>
          {loading && <p className="text-white/60 text-sm py-4">Loading events…</p>}
          {!loading && events.length === 0 && (
            <p className="text-white/60 text-sm py-8 text-center italic">No events scheduled.</p>
          )}
          {events.map((ev) => (
            <div key={ev.id} className="flex items-start gap-4 p-4 rounded-xl bg-[#001f35] border border-white/5 transition-all hover:border-[#FF7120]/20 group">
              <div className="w-12 h-12 rounded-xl bg-[#FF7120]/10 flex flex-col items-center justify-center text-[#FF7120] border border-[#FF7120]/20 group-hover:bg-[#FF7120] group-hover:text-white transition-all">
                <span className="text-lg font-bold leading-none">{new Date(ev.date).getDate()}</span>
                <span className="text-[10px] uppercase font-bold mt-1">
                  {new Date(ev.date).toLocaleString('default', { month: 'short' })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[15px] truncate">{ev.title}</p>
                <p className="text-white/50 text-xs mt-1 flex items-center gap-2">
                   <Clock size={12} className="text-[#FF7120]" />
                   {ev.date}
                </p>
                {ev.description && <p className="text-white/40 text-xs mt-2 italic line-clamp-2">{ev.description}</p>}
              </div>
              {ev.is_holiday && (
                <span className="shrink-0 text-[10px] font-bold text-[#FF7120] bg-[#FF7120]/10 border border-[#FF7120]/20 rounded-full px-2 py-1 uppercase tracking-wider">
                  Holiday
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
