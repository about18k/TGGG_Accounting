import React, { useEffect, useState } from 'react';
import { getAccountingEmployees } from '../../../services/adminService';
import { getAllAttendance, getEvents, getOvertimeRecords } from '../../../services/attendanceService';
import { getRecentPayroll } from '../../../services/payrollService';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress
} from '../../../components/ui/accounting-ui';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import {
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  UserCheck,
  CalendarDays,
  Award,
  AlertCircle,
  CheckCircle,
  Coffee,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare
} from 'lucide-react';

// Mock data for the dashboard
const mockData = {
  totalEmployees: 0,
  activeEmployees: 0,
  onLeaveToday: 0,
  newHires: 0,
  monthlyPayroll: 0,
  attendanceRate: 0,
  performanceRating: 0,
  engagementScore: 0,
  recentActivities: [],
  upcomingEvents: [],
  topPerformers: [],
  pendingApprovals: []
};

const formatAttendanceTime = (value) => {
  if (!value) return 'Time not recorded';

  const text = String(value).trim();
  const timeMatch = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const seconds = Number(timeMatch[3] || 0);
    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  return text;
};

const formatAttendanceStatus = (value) => {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'present') return 'On Time';
  if (status === 'late') return 'Late';
  return status ? status.replace(/_/g, ' ') : 'Status not recorded';
};

export function DashboardOverview({ user, onNavigate }) {

  const [metrics, setMetrics] = useState({
    totalEmployees: mockData.totalEmployees,
    activeEmployees: mockData.activeEmployees,
    onLeaveToday: mockData.onLeaveToday,
    newHires: mockData.newHires,
    monthlyPayroll: mockData.monthlyPayroll,
    attendanceRate: mockData.attendanceRate,
    engagementScore: mockData.engagementScore,
    performanceRating: mockData.performanceRating,
    overtimePending: 0,
    absencesToday: 0,
  });
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [events, setEvents] = useState(mockData.upcomingEvents);

  const userName = user?.first_name || 'Staff';

  useEffect(() => {
    if (!user) return;

    let isActive = true;

    const fetchOverview = async () => {
      setLoading(true);

      try {
        const [employeesData, attendanceData, payrollData, eventsData, overtimeData] = await Promise.all([
          getAccountingEmployees({ active_only: false }),
          getAllAttendance(),
          getRecentPayroll(),
          getEvents({ upcoming: true }),
          getOvertimeRecords(),
        ]);

        const employees = employeesData || [];
        const attendance = attendanceData || [];
        const payroll = payrollData || [];
        const eventsArr = eventsData || [];
        const overtime = overtimeData || [];

        const employeeIndex = new Map();
        employees.forEach((emp) => {
          const key = emp.id || emp.user_id || emp.email;
          if (!key) return;
          employeeIndex.set(key, {
            name: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || 'Unknown',
            avatar: emp.avatar,
            role: emp.position || emp.role,
          });
        });

        const totalEmployees = employees.length;
        const activeEmployees = employees.filter(
          (e) => (e.status || '').toLowerCase() === 'active' || e.is_active
        ).length;

        const todayStr = new Date().toISOString().slice(0, 10);
        const onLeaveToday = attendance.filter((a) => {
          const status = (a.status || '').toLowerCase();
          const date = a.date || a.created_at || '';
          return date.startsWith(todayStr) && ['leave', 'on leave', 'absent'].includes(status);
        }).length;

        const newHires = employees.filter((e) => {
          const joinDate = e.joinDate || e.startDate || e.date_hired;
          if (!joinDate) return false;
          const joined = new Date(joinDate);
          if (Number.isNaN(joined.getTime())) return false;
          const diffDays = (Date.now() - joined.getTime()) / (1000 * 60 * 60 * 24);
          return diffDays <= 30;
        }).length;

        const presentOrLate = attendance.filter((r) =>
          ['present', 'late'].includes((r.status || '').toLowerCase())
        ).length;
        const attendanceRate = attendance.length
          ? Math.round((presentOrLate / attendance.length) * 1000) / 10
          : 0;

        const monthlyPayroll = payroll.reduce((sum, row) => {
          const val = parseFloat(row.net_salary || row.netSalary || 0);
          return Number.isFinite(val) ? sum + val : sum;
        }, 0);

        const absencesToday = attendance.filter((a) => {
          const status = (a.status || '').toLowerCase();
          const date = a.date || a.created_at || '';
          return date.startsWith(todayStr) && ['absent', 'no show'].includes(status);
        }).length;

        const pending = (overtime || []).filter(
          (o) => !o.management_signature && !o.approval_date
        );

        if (!isActive) return;

        setMetrics((prev) => ({
          ...prev,
          totalEmployees,
          activeEmployees,
          onLeaveToday,
          newHires,
          attendanceRate,
          monthlyPayroll: Number(monthlyPayroll.toFixed(2)),
          overtimePending: pending.length,
          absencesToday,
        }));

        // Recent Activities from attendance logs (latest 8)
        const sortedAttendance = [...attendance].sort((a, b) =>
          new Date(b.date) - new Date(a.date)
        );
        const recentActivities = sortedAttendance.slice(0, 8).map((rec, idx) => ({
          id: rec.id || idx,
          user: rec.employee_name || 'Unknown',
          action: formatAttendanceStatus(rec.status_label || rec.status),
          timeLabel: rec.time_in ? 'Time In' : rec.time_out ? 'Time Out' : 'Time',
          time: formatAttendanceTime(rec.time_in || rec.time_out || rec.created_at || rec.date),
          location: rec.clock_in_address || rec.clock_out_address || rec.location || 'Location not available',
          type: rec.status || 'attendance',
        }));
        setActivities(recentActivities);

        // Pending approvals from overtime requests lacking management signature
        setPendingApprovals(pending.slice(0, 5).map((o) => ({
          id: o.id,
          type: 'OT Request',
          employee: o.employee_name || o.full_name || 'Unknown',
            date: o.date_completed || o.created_at || '',
          status: 'pending',
        })));

        // Top performers by attendance presence count
        const counts = {};
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        attendance.forEach((rec) => {
          const recDate = rec.date ? new Date(rec.date) : null;
          if (recDate && recDate < cutoff) return;
          if (['present', 'late'].includes((rec.status || '').toLowerCase())) {
            const key = rec.employee_id || rec.employee_email || rec.employee_name;
            if (!key) return;
            const info = employeeIndex.get(key) || {};
            if (!counts[key]) counts[key] = { name: info.name || rec.employee_name || 'Unknown', avatar: info.avatar, role: info.role, count: 0 };
            counts[key].count += 1;
          }
        });
        const performers = Object.values(counts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map((p) => ({ ...p, score: p.count }));
        setTopPerformers(performers);

        const today = new Date().toISOString().slice(0, 10);
        const upcomingEvents = (eventsArr || [])
          .filter((ev) => ev.date >= today)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 6);
        setEvents(upcomingEvents.length ? upcomingEvents : mockData.upcomingEvents);
      } catch (error) {
        console.error('Failed to load dashboard overview metrics:', error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchOverview();

    return () => {
      isActive = false;
    };
  }, [user?.id]);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-card via-secondary to-muted p-6 text-primary-foreground" style={{ boxShadow: '0 8px 32px #001F35' }}>
        <div className="relative z-10">
          <h1 className="text-2xl mb-2">Good morning, {userName}!</h1>
          <p className="text-primary-foreground/80 mb-4">Here's what's happening with your team today.</p>
          <div className="flex flex-wrap gap-4">
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary">
              <Users className="w-4 h-4 mr-2" />
              {metrics.totalEmployees} Total Employees
            </Badge>
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary">
              <UserCheck className="w-4 h-4 mr-2" />
              {metrics.activeEmployees} Active Today
            </Badge>
          </div>
          <div className="mt-3 text-xs text-primary-foreground/70">
            {loading ? 'Refreshing data…' : 'Live from database'}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-32 opacity-20">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1594892342285-9b86df3ad47a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB0ZWFtJTIwd29ya3NwYWNlfGVufDF8fHx8MTc1ODc2ODAyNXww&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Team workspace"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-medium">{metrics.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <ArrowUpRight className="w-3 h-3 mr-1 text-primary" />
              +{metrics.newHires} new this month
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Leave Today</p>
                <p className="text-2xl font-medium">{metrics.onLeaveToday}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <ArrowDownRight className="w-3 h-3 mr-1 text-primary" />
              Based on active roster
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-medium">
                  {metrics.attendanceRate}%
                </p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <ArrowUpRight className="w-3 h-3 mr-1 text-primary" />
              Latest 30 days attendance
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending OT Approvals</p>
                <p className="text-2xl font-medium">{metrics.overtimePending}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <ArrowUpRight className="w-3 h-3 mr-1 text-primary" />
              Awaiting management decision
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Attendance */}
        <Card className="lg:col-span-2 border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              RECENT ATTENDANCE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {activity.type === 'leave' && <CalendarDays className="w-4 h-4 text-primary" />}
                    {activity.type === 'performance' && <TrendingUp className="w-4 h-4 text-primary" />}
                    {activity.type === 'profile' && <Users className="w-4 h-4 text-primary" />}
                    {activity.type === 'attendance' && <Clock className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.user}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.action} · {activity.timeLabel}: {activity.time}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Location: {activity.location}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-center py-8 text-muted-foreground italic text-sm">
                  No recent activities recorded.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.length === 0 && (
                <p className="text-sm text-muted-foreground">No attendance data available yet.</p>
              )}
              {topPerformers.map((performer, index) => (
                <div key={performer.name} className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      {performer.avatar && <AvatarImage src={performer.avatar} alt={performer.name} />}
                      <AvatarFallback>{performer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground font-medium">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{performer.name}</p>
                    <p className="text-xs text-muted-foreground">Attendance days: {performer.score}</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary">
                    {performer.score}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                Pending Overtime Approvals
              </div>
              <Badge variant="secondary">{pendingApprovals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <button
                  key={approval.id}
                  type="button"
                  onClick={() => onNavigate?.('otrequest')}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border/50 text-left transition-colors hover:bg-primary/5 hover:border-primary/30"
                >
                  <div>
                    <p className="text-sm font-medium">{approval.type}</p>
                    <p className="text-xs text-muted-foreground">{approval.employee}</p>
                  </div>
                  <p className="text-xs text-primary font-medium">Click to review</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      event.event_type === 'holiday' || event.is_holiday ? 'border-red-400 text-red-400' :
                        'border-primary text-primary'
                    }
                  >
                    {event.event_type || (event.is_holiday ? 'holiday' : 'event')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
