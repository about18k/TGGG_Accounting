import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
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

export function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-card via-secondary to-muted p-6 text-primary-foreground" style={{boxShadow: '0 8px 32px #001F35'}}>
        <div className="relative z-10">
          <h1 className="text-2xl mb-2">Good morning, Alvi! 👋</h1>
          <p className="text-primary-foreground/80 mb-4">Here's what's happening with your team today.</p>
          <div className="flex flex-wrap gap-4">
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary">
              <Users className="w-4 h-4 mr-2" />
              {mockData.totalEmployees} Total Employees
            </Badge>
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary">
              <UserCheck className="w-4 h-4 mr-2" />
              {mockData.activeEmployees} Active Today
            </Badge>
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
                <p className="text-2xl font-medium">{mockData.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <ArrowUpRight className="w-3 h-3 mr-1 text-primary" />
              +{mockData.newHires} new this month
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-medium">{mockData.attendanceRate}%</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <Progress value={mockData.attendanceRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payroll</p>
                <p className="text-2xl font-medium">${(mockData.monthlyPayroll / 1000000).toFixed(1)}M</p>
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
                <p className="text-2xl font-medium">{mockData.engagementScore}%</p>
              </div>
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <Progress value={mockData.engagementScore} className="mt-2" />
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