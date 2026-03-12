import { useEffect, useState } from 'react';
import { getEvents, createEvent } from '../../../services/attendanceService';
import { CalendarDays, Plus, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Textarea,
  Switch,
} from '../../../components/ui/accounting-ui';

export default function AccountingEventsPanel() {
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
    } catch {
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
      setForm({
        title: '',
        date: '',
        event_type: 'event',
        is_holiday: false,
        description: '',
      });
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
      <Card className="border-0 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CalendarDays className="w-5 h-5 text-primary" />
            Calendar / Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-white">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-white/80">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Event name"
                required
              />
            </div>
            <div>
              <Label className="text-white/80">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label className="text-white/80">Type</Label>
              <select
                className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2"
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
                rows={3}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={saving}>
                <Plus className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Add Event'}
              </Button>
            </div>
            {error && (
              <div className="md:col-span-2 flex items-center gap-2 text-sm text-rose-200">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="border-0 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Upcoming Events & Holidays</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-white/60">Loading events...</p>}
          {!loading && events.length === 0 && (
            <p className="text-sm text-white/60">No events scheduled.</p>
          )}
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-3 rounded-lg border border-white/10 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
                {new Date(event.date).getDate()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{event.title}</p>
                <p className="text-sm text-white/60">{event.date}</p>
                {event.description && <p className="mt-1 text-xs text-white/60">{event.description}</p>}
              </div>
              {event.is_holiday && (
                <span className="rounded-full border border-rose-300/50 px-2 py-1 text-xs text-rose-300">Holiday</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}