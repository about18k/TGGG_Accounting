import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Bell, Check, Crown, Menu, Search, User } from 'lucide-react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/accounting-ui';

export default function CeoNavigation({ onNavigate, currentPage = 'attendance', user, onLogout }) {
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Board Meeting', message: 'Quarterly board sync at 3:00 PM', time: '1h ago', read: false, type: 'meeting' },
    { id: 2, title: 'Payroll Approved', message: 'March payroll is ready for release', time: '4h ago', read: true, type: 'finance' },
    { id: 3, title: 'New Hire', message: 'Finance manager offer accepted', time: '1d ago', read: false, type: 'people' },
  ]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((n) => {
        if (notificationFilter === 'unread') return !n.read;
        if (notificationFilter === 'read') return n.read;
        return true;
      })
      .sort((a, b) => (sortOrder === 'oldest' ? a.id - b.id : b.id - a.id));
  }, [notifications, notificationFilter, sortOrder]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    }
    if (notification.type === 'people') onNavigate?.('attendance');
    if (notification.type === 'finance') onNavigate?.('overtime');
  };

  return (
    <header className="fixed top-0 w-full z-50 px-3 sm:px-6 py-3 sm:py-4" style={{ background: '#001f35' }}>
      <div className="flex items-center justify-between w-full mx-auto px-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 grid place-items-center">
            <Crown className="h-5 w-5 text-[#FF7120]" />
          </div>
          <div className="leading-tight">
            <p className="text-base sm:text-xl font-semibold text-white">CEO Dashboard</p>
            <p className="text-xs sm:text-sm text-white/55">Executive overview</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, people, updates"
              className="h-10 w-[260px] rounded-xl border border-white/10 bg-[#00273C]/70 pl-10 pr-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/70 focus:ring-2 focus:ring-[#FF7120]/25"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">Notifications</h3>
                  <Button variant="ghost" size="icon" onClick={markAllAsRead} className="text-[#AEAAAA] hover:text-white h-8 w-8">
                    <Check className="h-4 w-4" />
                  </Button>
                </div>

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

                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                    className="text-[#AEAAAA] hover:text-white p-1 flex items-center gap-2"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    <span className="text-xs">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
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
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 rounded-lg transition-colors cursor-pointer hover:bg-[#021B2C]/50 ${
                          notification.read ? 'bg-[#021B2C]/30' : 'bg-[#F27229]/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{notification.title}</p>
                            <p className="text-xs text-[#AEAAAA] mt-1">{notification.message}</p>
                            <p className="text-xs text-[#AEAAAA]/70 mt-2">{notification.time}</p>
                          </div>
                          {!notification.read && <div className="w-2 h-2 bg-[#F27229] rounded-full mt-1" />}
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
                className={`border border-[#FF7120] rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-all ${
                  currentPage === 'profile'
                    ? 'bg-[#FF7120] text-white'
                    : 'text-[#FF7120] hover:bg-[#FF7120] hover:text-white'
                }`}
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0 border-white/10 bg-[#001f35] text-white" align="end">
              <div className="p-4 border-b border-white/10">
                <p className="font-semibold text-sm">{user ? `${user.first_name} ${user.last_name}` : 'Profile'}</p>
                <p className="text-xs text-white/55">CEO • Executive Suite</p>
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

          <button
            type="button"
            onClick={() => onNavigate?.('attendance')}
            className="md:hidden border border-[#FF7120] text-[#FF7120] rounded-full w-9 h-9 flex items-center justify-center hover:bg-[#FF7120] hover:text-white transition-all"
            aria-label="Go to attendance"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
