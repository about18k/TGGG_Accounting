import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from './ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import alviProfile from '@/assets/4db478d5344f83406043f453643082ef14ec3b86.png';
import tripleGLogo from '@/assets/18705286721879dd5e9e4c3fe85f4aede934da35.png';
import { 
  Home, 
  Users, 
  Clock, 
  DollarSign, 
  UserPlus, 
  TrendingUp, 
  Settings, 
  MessageCircle,
  Award,
  Calendar,
  FileText,
  ChevronRight,
  Bell,
  BellRing,
  Search,
  Menu,
  Plus,
  Filter,
  BarChart3,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Zap,
  ArrowUpDown,
  Check
} from 'lucide-react';



const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'payroll', label: 'Payroll', icon: DollarSign },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function DashboardLayout({ activeTab, setActiveTab, children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Mock notifications data
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New Employee Added', message: 'Sarah Johnson has been added to the system', time: '2 hours ago', read: false, type: 'system' },
    { id: 2, title: 'Leave Request Submitted', message: 'Mike Chen submitted a leave request', time: '4 hours ago', read: true, type: 'attendance' },
    { id: 3, title: 'Payroll Processed', message: 'Monthly payroll has been processed successfully', time: '1 day ago', read: false, type: 'system' },
    { id: 4, title: 'Overtime Approved', message: 'Your overtime request has been approved', time: '2 days ago', read: true, type: 'overtime' }
  ]);

  const [typeFilter, setTypeFilter] = useState('all');

  const filteredNotifications = notifications.filter(notification => {
    const matchesReadFilter = notificationFilter === 'all' || 
      (notificationFilter === 'read' && notification.read) || 
      (notificationFilter === 'unread' && !notification.read);
    
    const matchesTypeFilter = typeFilter === 'all' || notification.type === typeFilter;
    
    return matchesReadFilter && matchesTypeFilter;
  }).sort((a, b) => {
    if (sortOrder === 'oldest') return a.id - b.id;
    return b.id - a.id;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10 flex w-full">
        {/* Desktop Sidebar */}
        <Sidebar className="hidden lg:flex border-r border-border/50 backdrop-blur-xl bg-background/80">
          <SidebarHeader className="p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                <img src={tripleGLogo} alt="Triple G" className="w-full h-full object-contain" />
              </div>
              <div>
                <h2 className="font-medium">Triple G</h2>
                <p className="text-xs text-muted-foreground">Accounting Management</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4">
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full justify-start gap-3 transition-all duration-200 ${
                        isActive 
                          ? 'bg-gradient-to-r from-primary/10 to-chart-1/10 text-primary border-l-2 border-primary' 
                          : ''
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border/50 backdrop-blur-xl bg-background/80 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile Menu Trigger */}
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0">
                    <div className="p-6 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={tripleGLogo} alt="Triple G" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <h2 className="font-medium">Triple G</h2>
                          <p className="text-xs text-muted-foreground">Accounting Flow</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <nav className="space-y-2">
                        {menuItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <Button
                              key={item.id}
                              variant={isActive ? "secondary" : "ghost"}
                              className="w-full justify-start gap-3"
                              onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileMenuOpen(false);
                              }}
                            >
                              <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                              {item.label}
                            </Button>
                          );
                        })}
                      </nav>
                    </div>
                  </SheetContent>
                </Sheet>

                <SidebarTrigger className="hidden lg:flex" />
                
                <div className="hidden sm:flex items-center gap-2">
                  <h1 className="text-xl font-medium capitalize">{activeTab.replace('-', ' ')}</h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="hidden md:flex items-center gap-2 relative min-w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
                  <input 
                    type="text" 
                    placeholder="Search employees, tasks..." 
                    className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border pl-10 pr-3 py-1 text-base bg-input-background transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm hover:shadow-[0_0_8px_rgba(251,146,60,0.06)] focus-visible:shadow-[0_0_8px_rgba(251,146,60,0.06)] focus-visible:border-ring focus-visible:ring-transparent focus-visible:ring-0"
                  />
                </div>

                {/* Notifications */}
                <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="relative hover:bg-transparent p-2">
                      <BellRing className="w-10 h-10 text-primary" />
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#F27229] rounded-full flex items-center justify-center text-xs text-white font-medium">
                          {unreadCount}
                        </div>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 bg-[#002035] border-[#AEAAAA]/20 shadow-lg shadow-black/20" align="end" sideOffset={8}>
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-4">Notifications</h3>
                      
                      {/* Filter Tabs */}
                      <div className="flex gap-2 mb-4">
                        {['all', 'unread', 'read'].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setNotificationFilter(filter)}
                            className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                              notificationFilter === filter 
                                ? 'bg-transparent border border-[#F27229] text-[#F27229]' 
                                : 'bg-[#021B2C] text-[#AEAAAA] hover:text-white'
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>

                      {/* Type Filter Dropdown */}
                      <div className="mb-4">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                          <SelectTrigger className="w-full bg-[#021B2C] border-[#AEAAAA]/20 text-white">
                            <SelectValue placeholder="Filter by type" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#002035] border-[#AEAAAA]/20">
                            <SelectItem value="all" className="text-white hover:bg-[#021B2C]">All Types</SelectItem>
                            <SelectItem value="system" className="text-white hover:bg-[#021B2C]">System</SelectItem>
                            <SelectItem value="attendance" className="text-white hover:bg-[#021B2C]">Attendance</SelectItem>
                            <SelectItem value="overtime" className="text-white hover:bg-[#021B2C]">Overtime</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mb-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                          className="text-[#AEAAAA] hover:text-white p-1 flex items-center gap-2"
                        >
                          <ArrowUpDown className="w-4 h-4" />
                          <span className="text-xs">{sortOrder === 'newest' ? 'Newest to Oldest' : 'Oldest to Newest'}</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={markAllAsRead}
                          className="text-[#AEAAAA] hover:text-white p-1 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          <span className="text-xs">Mark All Read</span>
                        </Button>
                      </div>
                      
                      {/* Notifications List */}
                      <div className="space-y-2 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {filteredNotifications.length === 0 ? (
                          <p className="text-center text-[#AEAAAA] py-4 text-sm">No notifications</p>
                        ) : (
                          filteredNotifications.map((notification) => (
                            <div key={notification.id} className={`p-3 rounded-lg transition-colors hover:bg-[#021B2C]/50 ${
                              notification.read ? 'bg-[#021B2C]/30' : 'bg-[#F27229]/10'
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white">{notification.title}</p>
                                  <p className="text-xs text-[#AEAAAA] mt-1">{notification.message}</p>
                                  <p className="text-xs text-[#AEAAAA]/70 mt-2">{notification.time}</p>
                                </div>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-[#F27229] rounded-full mt-1"></div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* User Avatar */}
                <Avatar className="cursor-pointer ring-2 ring-primary/20">
                  <AvatarImage src={alviProfile} />
                  <AvatarFallback>AL</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}