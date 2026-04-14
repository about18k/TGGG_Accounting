import React, { useMemo, useState } from 'react';
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
  User,
  Grip,
  Filter,
  MoreHorizontal,
  Calendar,
  Settings,
  LogOut,
  Download,
} from 'lucide-react';
import AccountingSidebar from './AccountingSidebar';

const tabMeta = {
  dashboard: {
    title: 'Accounting Dashboard',
    description: 'Monitor finance, staff records, and operational updates.',
  },
  employees: {
    title: 'Employee Management',
    description: 'Manage employee records and profile information.',
  },
  attendance: {
    title: 'Attendance Records',
    description: 'Track attendance logs and absences.',
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

const sectionMeta = {
  'personal-attendance': {
    title: 'Attendance',
    description: 'Review personal attendance logs and leave activity.',
  },
  overtime: {
    title: 'My Overtime',
    description: 'Submit and track your OT requests.',
  },
  otrequest: {
    title: 'OT Requests',
    description: 'Review and confirm submitted OT requests from employees.',
  },
  events: {
    title: 'Calendar / Events',
    description: 'Create and manage company dates, holidays, and no-work days.',
  },
};

export function DashboardLayout({
  activeTab = 'dashboard',
  activeSection = 'main',
  children,
  onLogout,
  onNavigate,
  currentPage = 'dashboard',
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredNotifications = useMemo(() => {
    const getCategoryFromType = (type) => {
      if (!type) return 'system';
      if (type.includes('ot_')) return 'overtime';
      if (type.includes('matreq_')) return 'system';
      if (type.includes('checkout') || type.includes('attendance')) return 'attendance';
      return 'system';
    };

    return notifications
      .filter((notification) => {
        const matchesReadFilter =
          notificationFilter === 'all' ||
          (notificationFilter === 'read' && notification.is_read) ||
          (notificationFilter === 'unread' && !notification.is_read);

        const matchesTypeFilter =
          typeFilter === 'all' || getCategoryFromType(notification.type) === typeFilter;

        return matchesReadFilter && matchesTypeFilter;
      })
      .sort((a, b) => {
        if (sortOrder === 'oldest') return a.id - b.id;
        return b.id - a.id;
      });
  }, [notifications, notificationFilter, typeFilter, sortOrder]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );


  const currentTab =
    activeSection !== 'main'
      ? sectionMeta[activeSection] || tabMeta.dashboard
      : tabMeta[activeTab] || tabMeta.dashboard;
  const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg';

  return (
    <div className="min-h-screen bg-[#00273C] relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <header className="fixed top-0 w-full z-50 px-3 sm:px-6 py-3 sm:py-4" style={{ background: '#001f35' }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0 w-full mx-auto px-2 sm:px-4">
          {/* Logo & Title: Row 1 on mobile, Left side on desktop */}
          <div className="flex items-center justify-start gap-2 sm:gap-4">
            <img src="/logo.png" alt="TripleG AOC" className="h-8 sm:h-10" />
            <span className="text-lg sm:text-2xl font-semibold text-white">
              Triple<span className="text-[#FF7120]">G</span> AOC
            </span>
          </div>

          {/* Bottom Row on mobile, Right side on desktop */}
          <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto lg:gap-4">
            {/* Left side on mobile, Right side on desktop: Notifications & Profile */}
            <div className="flex items-center gap-2 sm:gap-4 lg:order-2">
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
                <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 p-0 bg-[#002035] border-[#AEAAAA]/20 shadow-lg shadow-black/20 z-50" align="start" sideOffset={8}>
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
                        onClick={onMarkAllRead}
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
                            onClick={() => onNotificationClick?.(notification)}
                            className={`p-3 rounded-lg transition-colors cursor-pointer hover:bg-[#021B2C]/50 ${
                              notification.is_read ? 'bg-[#021B2C]/30' : 'bg-[#F27229]/10'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-white">{notification.title}</p>
                                <p className="text-xs text-[#AEAAAA] mt-1">{notification.message}</p>
                                <p className="text-xs text-[#AEAAAA]/70 mt-2">{new Date(notification.created_at).toLocaleString()}</p>
                              </div>
                              {!notification.is_read && (
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

              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className={`border border-[#FF7120] rounded-full w-9 h-9 flex items-center justify-center transition-all ${
                  currentPage === 'profile'
                    ? 'bg-[#FF7120] text-white'
                    : 'text-[#FF7120] hover:bg-[#FF7120] hover:text-white'
                }`}
              >
                <User className="h-4 w-4" />
              </button>
            </div>

            {/* Right side on mobile, Hidden on desktop: Hamburger Menu Trigger */}
            <div className="flex items-center lg:hidden lg:order-1">
              <Popover open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="lg:hidden text-[#FF7120] rounded-[6px] w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-[#FF7120]/10 transition-all"
                  >
                    <Grip className="h-6 w-6 sm:h-7 w-7" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-64 p-2 bg-[#001f35] border-[#AEAAAA]/20 shadow-xl z-[60]" sideOffset={12}>
                  <div className="flex flex-col gap-1">
                    <AccountingSidebar
                      activeTab={activeTab}
                      activeSection={activeSection}
                      currentPage={currentPage}
                      onNavigate={(page) => {
                        onNavigate?.(page);
                        setIsMobileMenuOpen(false);
                      }}
                      withFrame={false}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      <div className="relative pt-40 sm:pt-24 px-3 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="w-64 shrink-0 hidden lg:block">
              <AccountingSidebar
                activeTab={activeTab}
                activeSection={activeSection}
                currentPage={currentPage}
                onNavigate={onNavigate}
              />
            </aside>

            <main className="flex-1 min-w-0">
              {activeSection !== 'main' ? (
                children
              ) : (
                <div className={cardClass}>
                  <div className="p-6 border-b border-white/10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h1 className="text-2xl font-semibold text-white">{currentTab.title}</h1>
                      <p className="text-white/60 text-sm mt-1">{currentTab.description}</p>
                    </div>
                    {activeTab === 'attendance' && (
                      <Button
                        variant="outline"
                        className="gap-2 self-start md:self-auto"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-accounting-attendance-export'))}
                      >
                        <Download className="w-4 h-4" />
                        Export Report
                      </Button>
                    )}
                  </div>

                  <div className="p-6">
                    {children}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
