import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Calendar } from './ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Clock, 
  CalendarDays, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  Download,
  Filter,
  MapPin,
  Users,
  TrendingUp,
  TrendingDown,
  Coffee,
  Home,
  Plane,
  Heart,
  Stethoscope,
  Calendar as CalendarIcon
} from 'lucide-react';

// Mock data
const mockAttendanceData = [
  { date: '2024-01-15', checkIn: '09:00', checkOut: '17:30', status: 'Present', hours: 8.5, location: 'Office' },
  { date: '2024-01-14', checkIn: '09:15', checkOut: '17:45', status: 'Present', hours: 8.5, location: 'Office' },
  { date: '2024-01-13', checkIn: '09:00', checkOut: '17:00', status: 'Present', hours: 8, location: 'Remote' },
  { date: '2024-01-12', checkIn: '-', checkOut: '-', status: 'Sick Leave', hours: 0, location: '-' },
  { date: '2024-01-11', checkIn: '09:30', checkOut: '18:00', status: 'Present', hours: 8.5, location: 'Office' },
];

const mockLeaveRequests = [
  {
    id: 1,
    employee: 'Sarah Johnson',
    type: 'Vacation',
    startDate: '2024-02-15',
    endDate: '2024-02-20',
    days: 5,
    status: 'Pending',
    reason: 'Family vacation to Hawaii',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1d3?w=40&h=40&fit=crop&crop=face'
  },
  {
    id: 2,
    employee: 'Mike Chen',
    type: 'Sick Leave',
    startDate: '2024-01-20',
    endDate: '2024-01-22',
    days: 3,
    status: 'Approved',
    reason: 'Medical appointment and recovery',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face'
  },
  {
    id: 3,
    employee: 'Lisa Brown',
    type: 'Personal',
    startDate: '2024-02-01',
    endDate: '2024-02-01',
    days: 1,
    status: 'Rejected',
    reason: 'Personal errands',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face'
  }
];

const leaveTypes = [
  { value: 'vacation', label: 'Vacation', icon: Plane, color: 'bg-blue-100 text-blue-800' },
  { value: 'sick', label: 'Sick Leave', icon: Stethoscope, color: 'bg-red-100 text-red-800' },
  { value: 'personal', label: 'Personal', icon: Coffee, color: 'bg-purple-100 text-purple-800' },
  { value: 'maternity', label: 'Maternity', icon: Heart, color: 'bg-pink-100 text-pink-800' },
  { value: 'bereavement', label: 'Bereavement', icon: Heart, color: 'bg-gray-100 text-gray-800' },
];

const mockLeaveBalance = {
  vacation: { used: 8, total: 25 },
  sick: { used: 3, total: 10 },
  personal: { used: 2, total: 5 },
  maternity: { used: 0, total: 90 },
};

export function AttendanceLeave() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLeaveRequestOpen, setIsLeaveRequestOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('attendance');

  const getStatusBadge = (status) => {
    const variants = {
      'Present': 'bg-primary/10 text-primary border-primary',
      'Absent': 'bg-red-100 text-red-800',
      'Late': 'bg-yellow-100 text-yellow-800',
      'Sick Leave': 'bg-purple-100 text-purple-800',
      'Vacation': 'bg-blue-100 text-blue-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-primary/10 text-primary border-primary',
      'Rejected': 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const getLeaveTypeIcon = (type) => {
    const leaveType = leaveTypes.find(lt => lt.label.toLowerCase().includes(type.toLowerCase()));
    if (leaveType) {
      const Icon = leaveType.icon;
      return <Icon className="w-4 h-4" />;
    }
    return <CalendarIcon className="w-4 h-4" />;
  };

  const attendanceRate = 94.2;
  const totalHoursWorked = 168;
  const averageHoursPerDay = 8.4;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-medium">Attendance & Leave</h1>
          <p className="text-muted-foreground">Track attendance and manage leave requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Dialog open={isLeaveRequestOpen} onOpenChange={setIsLeaveRequestOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Request Leave</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveType">Leave Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input id="startDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea id="reason" placeholder="Please provide a reason for your leave request..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsLeaveRequestOpen(false)}>Cancel</Button>
                <Button onClick={() => setIsLeaveRequestOpen(false)}>Submit Request</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-medium">{attendanceRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <Progress value={attendanceRate} className="mt-3" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hours Worked</p>
                <p className="text-2xl font-medium">{totalHoursWorked}h</p>
              </div>
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">This month</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Hours/Day</p>
                <p className="text-2xl font-medium">{averageHoursPerDay}h</p>
              </div>
              <CalendarDays className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leave Requests</p>
                <p className="text-2xl font-medium">{mockLeaveRequests.filter(req => req.status === 'Pending').length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Pending approval</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave Requests</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-6">
          {/* Recent Attendance */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Recent Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAttendanceData.map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm font-medium">{new Date(record.date).getDate()}</p>
                        <p className="text-xs text-muted-foreground">{new Date(record.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                      </div>
                      <div>
                        <p className="font-medium">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>In: {record.checkIn}</span>
                          <span>Out: {record.checkOut}</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {record.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{record.hours}h</p>
                        <p className="text-xs text-muted-foreground">Hours</p>
                      </div>
                      {getStatusBadge(record.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Clock In/Out */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="h-20 flex-col gap-2" variant="outline">
                  <CheckCircle className="w-6 h-6 text-primary" />
                  Clock In
                  <span className="text-xs text-muted-foreground">09:00 AM</span>
                </Button>
                <Button className="h-20 flex-col gap-2" variant="outline">
                  <XCircle className="w-6 h-6 text-primary" />
                  Clock Out
                  <span className="text-xs text-muted-foreground">05:30 PM</span>
                </Button>
                <Button className="h-20 flex-col gap-2" variant="outline">
                  <Coffee className="w-6 h-6 text-primary" />
                  Break
                  <span className="text-xs text-muted-foreground">15 min</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="space-y-6">
          {/* Leave Balance */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Leave Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(mockLeaveBalance).map(([type, balance]) => {
                  const leaveType = leaveTypes.find(lt => lt.value === type);
                  const Icon = leaveType?.icon || CalendarIcon;
                  const percentage = (balance.used / balance.total) * 100;
                  
                  return (
                    <div key={type} className="p-4 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-5 h-5 text-primary" />
                        <p className="font-medium capitalize">{type}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Used</span>
                          <span>{balance.used}/{balance.total} days</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {balance.total - balance.used} days remaining
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Leave Requests */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockLeaveRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={request.avatar} alt={request.employee} />
                        <AvatarFallback>{request.employee.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.employee}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getLeaveTypeIcon(request.type)}
                          <span>{request.type}</span>
                          <span>•</span>
                          <span>{request.days} day{request.days > 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(request.status)}
                      {request.status === 'Pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Reject</Button>
                          <Button size="sm">Approve</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2 border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Attendance Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {/* Legend and Today's Info */}
            <div className="space-y-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Legend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-green-500"></div>
                      <span className="text-sm">Present</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-red-500"></div>
                      <span className="text-sm">Absent</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-yellow-500"></div>
                      <span className="text-sm">Late</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-blue-500"></div>
                      <span className="text-sm">Leave</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-purple-500"></div>
                      <span className="text-sm">Holiday</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Today's Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Check In</span>
                      <Badge className="bg-primary/10 text-primary border-primary">09:00 AM</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Current Status</span>
                      <Badge className="bg-primary/10 text-primary border-primary">Working</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Hours Today</span>
                      <span className="text-sm font-medium">7.5h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Location</span>
                      <span className="text-sm">Office</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}