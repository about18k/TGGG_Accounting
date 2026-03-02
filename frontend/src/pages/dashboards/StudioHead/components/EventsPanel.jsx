import { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarDays, Plus, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Textarea, Switch } from '../../../../components/ui/accounting-ui';

export default function EventsPanel() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
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

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/attendance/events/`, { headers, params: { upcoming: true } });
      setEvents(res.data || []);
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
      await axios.post(`${API_URL}/attendance/events/`, form, { headers });
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
      <Card className="border-0 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CalendarDays className="w-5 h-5 text-primary" />
            Calendar / Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-white">
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
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
                className="w-full bg-transparent border border-white/20 rounded-lg px-3 py-2"
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
        </CardContent>
      </Card>

      <Card className="border-0 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Upcoming Events & Holidays</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-white/60 text-sm">Loading events…</p>}
          {!loading && events.length === 0 && (
            <p className="text-white/60 text-sm">No events scheduled.</p>
          )}
          {events.map((ev) => (
            <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg border border-white/10">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold">
                {new Date(ev.date).getDate()}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{ev.title}</p>
                <p className="text-white/60 text-sm">{ev.date}</p>
                {ev.description && <p className="text-white/60 text-xs mt-1">{ev.description}</p>}
              </div>
              {ev.is_holiday && (
                <span className="text-xs text-rose-300 border border-rose-300/50 rounded-full px-2 py-1">Holiday</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
