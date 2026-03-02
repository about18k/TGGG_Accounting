import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
  Plus,
  MessageSquare,
  Heart
} from 'lucide-react';

// Mock data for the dashboard
const mockData = {
  totalEmployees: 247,
  activeEmployees: 234,
  onLeave: 13,
  newHires: 8,
  monthlyPayroll: 1240000,
  attendanceRate: 94.2,
  performanceRating: 4.3,
  engagementScore: 87,
  recentActivities: [
    { id: 1, user: 'Sarah Johnson', action: 'Submitted leave request', time: '2 hours ago', type: 'leave' },
    { id: 2, user: 'Mike Chen', action: 'Completed performance review', time: '4 hours ago', type: 'performance' },
    { id: 3, user: 'Lisa Brown', action: 'Updated profile information', time: '6 hours ago', type: 'profile' },
    { id: 4, user: 'David Wilson', action: 'Clocked in for work', time: '8 hours ago', type: 'attendance' },
  ],
  upcomingEvents: [
    { id: 1, title: 'Team Building Workshop', date: 'Today, 2:00 PM', type: 'workshop' },
    { id: 2, title: 'Performance Reviews Due', date: 'Tomorrow', type: 'deadline' },
    { id: 3, title: 'Monthly All-Hands', date: 'Friday, 10:00 AM', type: 'meeting' },
  ],
  topPerformers: [
    { name: 'Alex Rodriguez', role: 'Senior Developer', score: 98, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face' },
    { name: 'Emma Davis', role: 'Product Manager', score: 96, avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1d3?w=40&h=40&fit=crop&crop=face' },
    { name: 'James Wilson', role: 'Designer', score: 94, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face' },
  ],
  pendingApprovals: [
    { id: 1, type: 'Leave Request', employee: 'Sarah Johnson', status: 'pending' },
    { id: 2, type: 'Expense Report', employee: 'Mike Chen', status: 'pending' },
    { id: 3, type: 'Time Off', employee: 'Lisa Brown', status: 'pending' },
  ]
};

export function DashboardOverview({ user }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const [metrics, setMetrics] = useState({
    totalEmployees: mockData.totalEmployees,
    activeEmployees: mockData.activeEmployees,
    onLeave: mockData.onLeave,
    newHires: mockData.newHires,
    monthlyPayroll: mockData.monthlyPayroll,
    attendanceRate: mockData.attendanceRate,
    engagementScore: mockData.engagementScore,
    performanceRating: mockData.performanceRating,
  });
  const [loading, setLoading] = useState(false);

  const userName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.username ||
    'there';

  useEffect(() => {
    if (!user) return;

    const fetchOverview = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const [employeesRes, attendanceRes, payrollRes] = await Promise.all([
          axios.get(`${API_URL}/accounts/accounting/employees/`, {
            headers,
            params: { active_only: false },
          }),
          axios.get(`${API_URL}/attendance/all/`, { headers }),
          axios.get(`${API_URL}/payroll/recent/`, { headers }),
        ]);

        const employees = employeesRes.data || [];
        const attendance = attendanceRes.data || [];
        const payroll = payrollRes.data || [];

        const totalEmployees = employees.length;
        const activeEmployees = employees.filter(
          (e) => (e.status || '').toLowerCase() === 'active' || e.is_active
        ).length;
        const onLeave = employees.filter(
          (e) => (e.status || '').toLowerCase() === 'on leave'
        ).length;

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

        setMetrics((prev) => ({
          ...prev,
          totalEmployees: totalEmployees || prev.totalEmployees,
          activeEmployees: activeEmployees || prev.activeEmployees,
          onLeave,
          newHires: newHires || prev.newHires,
          attendanceRate: attendanceRate || prev.attendanceRate,
          monthlyPayroll: monthlyPayroll || prev.monthlyPayroll,
        }));
      } catch (error) {
        console.error('Failed to load dashboard overview metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [API_URL, user]);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-card via-secondary to-muted p-6 text-primary-foreground" style={{boxShadow: '0 8px 32px #001F35'}}>
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
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-medium">{metrics.attendanceRate}%</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <Progress value={metrics.attendanceRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payroll</p>
                <p className="text-2xl font-medium">
                  {metrics.monthlyPayroll >= 1_000_000
                    ? `$${(metrics.monthlyPayroll / 1_000_000).toFixed(1)}M`
                    : `$${metrics.monthlyPayroll.toLocaleString()}`}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <ArrowUpRight className="w-3 h-3 mr-1 text-primary" />
              +3.2% from last month
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Engagement Score</p>
                <p className="text-2xl font-medium">{metrics.engagementScore}%</p>
              </div>
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <Progress value={metrics.engagementScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="lg:col-span-2 border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {activity.type === 'leave' && <CalendarDays className="w-4 h-4 text-primary" />}
                    {activity.type === 'performance' && <TrendingUp className="w-4 h-4 text-primary" />}
                    {activity.type === 'profile' && <Users className="w-4 h-4 text-primary" />}
                    {activity.type === 'attendance' && <Clock className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.user}</p>
                    <p className="text-sm text-muted-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
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
              {mockData.topPerformers.map((performer, index) => (
                <div key={performer.name} className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={performer.avatar} alt={performer.name} />
                      <AvatarFallback>{performer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground font-medium">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{performer.name}</p>
                    <p className="text-xs text-muted-foreground">{performer.role}</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary">
                    {performer.score}%
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
                Pending Approvals
              </div>
              <Badge variant="secondary">{mockData.pendingApprovals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockData.pendingApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <div>
                    <p className="text-sm font-medium">{approval.type}</p>
                    <p className="text-xs text-muted-foreground">{approval.employee}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 px-2">
                      Reject
                    </Button>
                    <Button size="sm" className="h-7 px-2">
                      Approve
                    </Button>
                  </div>
                </div>
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
              {mockData.upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={
                      event.type === 'deadline' ? 'border-primary text-primary' :
                      event.type === 'workshop' ? 'border-primary text-primary' :
                      'border-primary text-primary'
                    }
                  >
                    {event.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Plus className="w-6 h-6" />
              Add Employee
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Clock className="w-6 h-6" />
              View Attendance
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <DollarSign className="w-6 h-6" />
              Process Payroll
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <TrendingUp className="w-6 h-6" />
              Run Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
