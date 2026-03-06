import { useEffect, useState } from 'react';
import { getEvents, createEvent } from '../../../../services/attendanceService';
import { CalendarDays, Plus, AlertCircle, Calendar } from 'lucide-react';
import { Button, Input, Label, Textarea, Switch } from '../../../../components/ui/accounting-ui';
import { CardSkeleton } from '../../../../components/SkeletonLoader';

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

  const cardClass = "bg-[#00273C]/60 rounded-xl border border-white/10";

  return (
    <div className="space-y-6">
      <div className={`${cardClass} p-6`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 shrink-0 rounded-full border border-[#FF7120]/30 bg-[#FF7120]/10 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-[#FF7120]" />
          </div>
          <h2 className="text-white font-semibold tracking-tight text-xl">
            Add Event / Holiday
          </h2>
        </div>
        <div className="space-y-4 text-white">
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white/80">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Event name"
                className="bg-[#00273C] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60 w-full mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-white/80">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-[#00273C] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60 w-full mt-1 [color-scheme:dark]"
                required
              />
            </div>
            <div>
              <Label className="text-white/80">Type</Label>
              <select
                className="w-full bg-[#00273C] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF7120]/60 mt-1 cursor-pointer appearance-none"
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              >
                <option value="event">Event</option>
                <option value="holiday">Holiday</option>
                <option value="downtime">No Work Day</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_holiday"
                checked={form.is_holiday || form.event_type === 'holiday' || form.event_type === 'downtime'}
                onCheckedChange={(checked) => setForm({ ...form, is_holiday: checked })}
              />
              <Label htmlFor="is_holiday" className="text-white/80">Mark as holiday / no work</Label>
            </div>
            <div className="md:col-span-2">
              <Label className="text-white/80">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional notes"
                className="bg-[#00273C] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60 w-full mt-1 min-h-[80px]"
                rows={3}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={saving}>
                <Plus className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Add Event'}
              </Button>
            </div>
            {error && (
              <div className="md:col-span-2 flex items-center gap-2 text-rose-200 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </form>
        </div>
      </div>

      <div className={`${cardClass} p-6`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 shrink-0 rounded-full border border-[#FF7120]/30 bg-[#FF7120]/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-[#FF7120]" />
          </div>
          <h2 className="text-white font-semibold tracking-tight text-xl">
            Upcoming Events & Holidays
          </h2>
        </div>
        <div className="space-y-3">
          {loading && (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          )}
          {!loading && events.length === 0 && (
            <p className="text-white/60 text-sm">No events scheduled.</p>
          )}
          {events.map((ev) => (
            <div key={ev.id} className="bg-[#001f35] rounded-xl border border-white/5 p-4 flex items-start gap-4 hover:bg-white/5 transition">
              <div className="w-12 h-12 rounded-full border border-[#FF7120]/30 bg-[#FF7120]/10 flex items-center justify-center text-[#FF7120] font-bold text-lg shrink-0">
                {new Date(ev.date).getDate()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-base truncate">{ev.title}</p>
                <p className="text-[#9CA3AF] text-sm mt-0.5">{ev.date}</p>
                {ev.description && <p className="text-[#9CA3AF] text-sm mt-2">{ev.description}</p>}
              </div>
              {ev.is_holiday && (
                <span className="text-xs text-rose-300 border border-rose-300/30 bg-rose-500/10 rounded-lg px-2.5 py-1 font-semibold shrink-0">Holiday</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
