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
      {/* Welcome Section Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#001f35]/80 to-[#001020]/80 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)] p-6 sm:p-8">
        {/* Decorative background glows */}
        <div className="absolute -top-10 -right-10 w-[300px] h-[300px] bg-gradient-to-br from-[#FF7120]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-[250px] h-[250px] bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7120]/80">Accounting Department</p>
            <h1 className="mt-3 text-3xl font-semibold text-white tracking-tight">Good morning, {userName}!</h1>
            <p className="mt-2 text-sm text-white/60">
              Here's what's happening with your team and operations today.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Badge variant="secondary" className="bg-[#FF7120]/15 text-[#FF7120] border-0 px-3 py-1 text-xs font-semibold rounded-lg">
                <Users className="w-3.5 h-3.5 mr-2 inline" />
                {metrics.totalEmployees} Total Employees
              </Badge>
              <Badge variant="secondary" className="bg-[#FF7120]/15 text-[#FF7120] border-0 px-3 py-1 text-xs font-semibold rounded-lg">
                <UserCheck className="w-3.5 h-3.5 mr-2 inline" />
                {metrics.activeEmployees} Active Today
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">Total Employees</p>
              <p className="text-2xl font-bold mt-2 text-white">{metrics.totalEmployees}</p>
            </div>
            <Users className="h-8 w-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div className="flex items-center text-xs text-white/40 mt-3 border-t border-white/5 pt-2">
            <ArrowUpRight className="w-3 h-3 mr-1 text-[#FF7120]" />
            +{metrics.newHires} new this month
          </div>
        </div>

        {/* On Leave Today */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">On Leave Today</p>
              <p className="text-2xl font-bold mt-2 text-white">{metrics.onLeaveToday}</p>
            </div>
            <CalendarDays className="h-8 w-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div className="flex items-center text-xs text-white/40 mt-3 border-t border-white/5 pt-2">
            <ArrowDownRight className="w-3 h-3 mr-1 text-[#FF7120]" />
            Based on active roster
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">Attendance Rate</p>
              <p className="text-2xl font-bold mt-2 text-white">{metrics.attendanceRate}%</p>
            </div>
            <Clock className="h-8 w-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div className="flex items-center text-xs text-white/40 mt-3 border-t border-white/5 pt-2">
            <ArrowUpRight className="w-3 h-3 mr-1 text-[#FF7120]" />
            Latest 30 days logs
          </div>
        </div>

        {/* Pending OT Approvals */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">Pending OT Approvals</p>
              <p className="text-2xl font-bold mt-2 text-white">{metrics.overtimePending}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div className="flex items-center text-xs text-white/40 mt-3 border-t border-white/5 pt-2">
            <ArrowUpRight className="w-3 h-3 mr-1 text-[#FF7120]" />
            Awaiting confirmation
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Attendance */}
        <Card className="lg:col-span-2 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.22)] bg-[#001f35]/70 backdrop-blur-md rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-base font-semibold uppercase tracking-wider">
              <Clock className="w-5 h-5 text-[#FF7120]" />
              RECENT ATTENDANCE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl transition-all duration-300 hover:bg-white/5 border border-transparent hover:border-white/5 hover:translate-x-1">
                  <div className="w-8 h-8 rounded-full bg-[#00273C] border border-white/10 flex items-center justify-center shrink-0">
                    {(() => {
                      const t = String(activity.type || '').toLowerCase();
                      if (t.includes('leave') || t.includes('vacation') || t.includes('absent')) {
                        return <CalendarDays className="w-4 h-4 text-[#FF7120]" />;
                      }
                      if (t.includes('late')) {
                        return <AlertCircle className="w-4 h-4 text-amber-500" />;
                      }
                      return <Clock className="w-4 h-4 text-emerald-400" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{activity.user}</p>
                    <p className="text-xs text-white/60 mt-0.5">
                      {activity.action} · {activity.timeLabel}: {activity.time}
                    </p>
                    <p className="text-[10px] text-white/40 mt-1">
                      Location: {activity.location}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-center py-8 text-white/40 italic text-sm">
                  No recent activities recorded.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.22)] bg-[#001f35]/70 backdrop-blur-md rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-base font-semibold uppercase tracking-wider">
              <Award className="w-5 h-5 text-[#FF7120]" />
              TOP PERFORMERS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.length === 0 && (
                <p className="text-sm text-white/40 italic text-center py-4">No attendance data available.</p>
              )}
              {topPerformers.map((performer, index) => (
                <div key={performer.name} className="flex items-center gap-3 p-2 rounded-xl transition-all duration-300 hover:bg-white/5">
                  <div className="relative shrink-0">
                    <Avatar className="w-10 h-10 border border-white/10">
                      {performer.avatar && <AvatarImage src={performer.avatar} alt={performer.name} />}
                      <AvatarFallback>{performer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-md ${
                      index === 0 ? 'bg-yellow-500 border border-yellow-400' :
                      index === 1 ? 'bg-slate-400 border border-slate-300' :
                      index === 2 ? 'bg-amber-600 border border-amber-500' :
                      'bg-[#00273C] border border-white/10'
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{performer.name}</p>
                    <p className="text-[11px] text-white/60 truncate">{performer.role || 'Employee'}</p>
                  </div>
                  <Badge variant="secondary" className="bg-[#FF7120]/15 text-[#FF7120] border-0 shrink-0 font-semibold">
                    {performer.score} days
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
        <Card className="border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.22)] bg-[#001f35]/70 backdrop-blur-md rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white text-base font-semibold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#FF7120]" />
                PENDING OVERTIME APPROVALS
              </div>
              <Badge className="bg-[#FF7120]/15 text-[#FF7120] border-0 font-semibold">{pendingApprovals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <button
                  key={approval.id}
                  type="button"
                  onClick={() => onNavigate?.('otrequest')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-[#00273C]/40 text-left transition-all duration-300 hover:bg-[#00273C]/80 hover:border-[#FF7120]/40 hover:translate-x-1"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{approval.type}</p>
                    <p className="text-xs text-white/60 mt-0.5 truncate">
                      {approval.employee} {approval.date ? `· ${new Date(approval.date).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-[#FF7120] font-semibold shrink-0">Review →</p>
                </button>
              ))}
              {pendingApprovals.length === 0 && (
                <p className="text-sm text-white/40 italic text-center py-4">No pending overtime approvals.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.22)] bg-[#001f35]/70 backdrop-blur-md rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-base font-semibold uppercase tracking-wider">
              <CalendarDays className="w-5 h-5 text-[#FF7120]" />
              UPCOMING EVENTS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-[#00273C]/40 transition-all duration-300 hover:bg-[#00273C]/70">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF7120] mt-2 shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{event.title}</p>
                    <p className="text-xs text-white/60 mt-0.5">{event.date}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      event.event_type === 'holiday' || event.is_holiday 
                        ? 'border-red-500/30 text-red-400 bg-red-500/10 font-semibold' 
                        : 'border-[#FF7120]/30 text-[#FF7120] bg-[#FF7120]/10 font-semibold'
                    }
                  >
                    {event.event_type || (event.is_holiday ? 'holiday' : 'event')}
                  </Badge>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-sm text-white/40 italic text-center py-4">No upcoming events.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
