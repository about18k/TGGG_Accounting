import React, { useState } from 'react';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetTrigger,
} from '../../../components/ui/accounting-ui';
import {
  ArrowUpDown,
  Bell,
  Check,
  Clock,
  Calendar,
  DollarSign,
  Home,
  LogOut,
  Menu,
  Search,
  User,
  Users,
  CheckSquare,
  FolderKanban,
} from 'lucide-react';

const menuItems = [
  { id: 'personal_attendance', label: 'Attendance', icon: Calendar },
  { id: 'personal_overtime', label: 'Overtime & Leave', icon: Clock },
  { id: 'personal_todo', label: 'Todo', icon: CheckSquare },
  { id: 'divider', label: 'divider' },
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'attendance', label: 'Attendance Management', icon: Calendar },
  { id: 'overtime', label: 'Overtime & Leave Management', icon: Clock },
  { id: 'payroll', label: 'Payroll', icon: DollarSign },
  { id: 'documentation', label: 'Documentation', icon: FolderKanban },
];

const tabMeta = {
  dashboard: {
    title: 'Accounting Dashboard',
    description: 'Monitor finance, staff records, and operational updates.',
  },
  personal_attendance: {
    title: 'Attendance',
    description: 'View your own attendance logs and status.',
  },
  personal_overtime: {
    title: 'Overtime & Leave',
    description: 'Submit or review your overtime and leave.',
  },
  personal_todo: {
    title: 'Todo',
    description: 'Track your personal tasks.',
  },
  employees: {
    title: 'Employee Management',
    description: 'Manage employee records and profile information.',
  },
  attendance: {
    title: 'Attendance Management',
    description: 'Track attendance logs, absences, and leave requests.',
  },
  overtime: {
    title: 'Overtime & Leave Management',
    description: 'Review overtime requests and leave activity.',
  },
  payroll: {
    title: 'Payroll Management',
    description: 'Review salary processing and payroll activity.',
  },
  settings: {
    title: 'Settings',
    description: 'Configure accounting workspace preferences.',
  },
};

export function DashboardLayout({ activeTab, setActiveTab, children, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New Employee Added', message: 'Sarah Johnson has been added to the system', time: '2 hours ago', read: false, type: 'system' },
    { id: 2, title: 'Leave Request Submitted', message: 'Mike Chen submitted a leave request', time: '4 hours ago', read: true, type: 'attendance' },
    { id: 3, title: 'Payroll Processed', message: 'Monthly payroll has been processed successfully', time: '1 day ago', read: false, type: 'system' },
    { id: 4, title: 'Overtime Approved', message: 'Your overtime request has been approved', time: '2 days ago', read: true, type: 'overtime' },
  ]);

  const filteredNotifications = notifications
    .filter((notification) => {
      const matchesReadFilter =
        notificationFilter === 'all' ||
        (notificationFilter === 'read' && notification.read) ||
        (notificationFilter === 'unread' && !notification.read);
      const matchesTypeFilter = typeFilter === 'all' || notification.type === typeFilter;
      return matchesReadFilter && matchesTypeFilter;
    })
    .sort((a, b) => {
      if (sortOrder === 'oldest') return a.id - b.id;
      return b.id - a.id;
    });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const onSelectMenuItem = (tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  const currentTab = tabMeta[activeTab] || tabMeta.dashboard;
  const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg';

  return (
    <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <header className="fixed top-0 w-full z-50 px-3 sm:px-6 py-3 sm:py-4" style={{ background: '#001f35' }}>
        <div className="flex items-center justify-between w-full mx-auto px-2 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="lg:hidden border border-[#FF7120] text-[#FF7120] rounded-full w-9 h-9 flex items-center justify-center hover:bg-[#FF7120] hover:text-white transition-all"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 border-r border-white/10 bg-[#001f35] text-white">
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Triple G AOC" className="h-10" />
                    <div>
                      <p className="text-sm font-semibold">Triple G AOC</p>
                      <p className="text-xs text-white/60">Accounting Department</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <nav className="space-y-2">
                  {menuItems.map((item) => {
                    if (item.id === 'divider') {
                      return <div key="divider" className="border-t border-white/10 my-3" />;
                    }
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectMenuItem(item.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                            isActive
                              ? 'bg-[#FF7120] text-white'
                              : 'text-white/70 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                  <Button
                    onClick={onLogout}
                    className="mt-6 w-full justify-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20 hover:text-white"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <img src="/logotripleg.png" alt="Triple G AOC" className="h-8 sm:h-10" />
            <span className="text-base sm:text-2xl font-semibold">Triple G AOC</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="relative border border-[#FF7120] text-[#FF7120] rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-[#FF7120] hover:text-white transition-all"
                >
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#F27229] rounded-full flex items-center justify-center text-[10px] text-white font-semibold">
                      {unreadCount}
                    </div>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 bg-[#002035] border-[#AEAAAA]/20 shadow-lg shadow-black/20 z-50" align="end" sideOffset={8}>
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-4">Notifications</h3>

                  <div className="flex gap-2 mb-4">
                    {['all', 'unread', 'read'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setNotificationFilter(filter)}
                        className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                          notificationFilter === filter
                            ? 'bg-[#F27229] text-white'
                            : 'bg-[#021B2C] text-[#AEAAAA] hover:bg-[#F27229]/20 hover:text-[#F27229]'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

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

                  <div className="space-y-2 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {filteredNotifications.length === 0 ? (
                      <p className="text-center text-[#AEAAAA] py-4 text-sm">No notifications</p>
                    ) : (
                      filteredNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg transition-colors hover:bg-[#021B2C]/50 ${
                            notification.read ? 'bg-[#021B2C]/30' : 'bg-[#F27229]/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{notification.title}</p>
                              <p className="text-xs text-[#AEAAAA] mt-1">{notification.message}</p>
                              <p className="text-xs text-[#AEAAAA]/70 mt-2">{notification.time}</p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-[#F27229] rounded-full mt-1" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="border border-[#FF7120] text-[#FF7120] rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-[#FF7120] hover:text-white transition-all"
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-0 border-white/10 bg-[#001f35] text-white" align="end">
                <div className="p-4 border-b border-white/10">
                  <p className="font-semibold text-sm">Account</p>
                  <p className="text-xs text-white/55">Manage account actions</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => onNavigate?.('profile')}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Profile
                  </button>
                  <button
                    onClick={onLogout}
                    className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-200 transition-colors hover:bg-red-500/20 hover:text-white"
                  >
                    Logout
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      <div className="relative pt-28 px-6 pb-10">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex gap-6">
            <aside className="w-64 shrink-0 hidden lg:block">
              <div className={`${cardClass} p-4 sticky top-24`}>
                <nav className="space-y-2">
                  {menuItems.map((item) => {
                    if (item.id === 'divider') {
                      return <div key="divider" className="border-t border-white/10 my-3" />;
                    }
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                          isActive
                            ? 'bg-[#FF7120] text-white'
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            <main className="flex-1 min-w-0">
              <div className={cardClass}>
                <div className="p-6 border-b border-white/10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold text-white">{currentTab.title}</h1>
                    <p className="text-white/60 text-sm mt-1">{currentTab.description}</p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/45" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search..."
                      className="h-10 w-full rounded-xl border border-white/15 bg-[#00273C]/60 pl-10 pr-4 text-sm text-white placeholder:text-white/45 outline-none focus:border-[#FF7120]/70 focus:ring-2 focus:ring-[#FF7120]/25"
                    />
                  </div>
                </div>

                <div className="p-6">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
