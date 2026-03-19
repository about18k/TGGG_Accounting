import React, { useState, useEffect, useCallback } from 'react';
import * as notifService from '../../../services/notificationService';
import { 
  Bell, User, Home, Clock, CheckSquare, FolderKanban, ArrowUpDown, Check, Menu, Grip,
  LayoutDashboard, Users, CalendarCheck, ClipboardCheck, Calendar, FileText, GitMerge, ClipboardList
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/accounting-ui';

const PublicNavigation = ({ onNavigate, currentPage = 'attendance', user }) => {
  const isSidebarDrivenRole =
    user?.role === 'bim_specialist' ||
    user?.role === 'junior_architect' ||
    user?.role === 'site_engineer' ||
    user?.role === 'site_coordinator' ||
    user?.role === 'intern';
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [notifications, setNotifications] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);


  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const data = await notifService.getNotifications();
      setNotifications(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const filteredNotifications = notifications.filter(n =>
    notificationFilter === 'all' ||
    (notificationFilter === 'read' && n.is_read) ||
    (notificationFilter === 'unread' && !n.is_read)
  ).sort((a, b) => sortOrder === 'oldest'
    ? new Date(a.created_at) - new Date(b.created_at)
    : new Date(b.created_at) - new Date(a.created_at)
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllAsRead = async () => {
    try {
      await notifService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* ignore */ }
  };

  const handleNotificationClick = async (notif) => {
    // Mark as read if unread
    if (!notif.is_read) {
      try {
        await notifService.markNotificationRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch { /* ignore */ }
    }

    // Only todo-specific notifications should open the Todo page.
    const type = notif.type || '';
    const departmentTaskTypes = [
      'dept_task_suggested',
      'dept_task_grabbed',
      'dept_task_completed',
      'dept_task_abandoned',
    ];
    const todoTeamTypes = [
      'task_suggested',
      'task_assigned',
      'task_confirmed',
      'task_rejected',
      'completion_requested',
      'completion_confirmed',
      'completion_rejected',
    ];

    if (type.startsWith('dept_') || departmentTaskTypes.includes(type)) {
      localStorage.setItem('todoActiveTab', 'department');
      onNavigate('todo');
      return;
    }

    if (todoTeamTypes.includes(type)) {
      localStorage.setItem('todoActiveTab', 'team');
      onNavigate('todo');
      return;
    }

    if (type.startsWith('ot_')) {
      onNavigate('overtime');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <nav className="fixed top-0 w-full z-50 px-3 sm:px-6 py-2 sm:py-4" style={{ background: '#001f35' }}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full mx-auto px-2 sm:px-4 gap-2 lg:gap-0">
        {/* Logo & Title: Row 1 on mobile, Left side on desktop */}
        <div className="flex items-center gap-2 sm:gap-4">
          <img src="/logo.png" alt="TripleG AOC" className="h-8 sm:h-10" />
          <span className="text-lg sm:text-2xl font-semibold text-white">
            Triple<span className="text-[#FF7120]">G</span> AOC
          </span>
        </div>


        {/* Actions & Menu Trigger: Row 2 on mobile, Right side on desktop */}
        <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto lg:gap-4">
          {/* Desktop Navigation Links: Only for Intern role */}
          {user?.role === 'intern' && (
            <div className="hidden lg:flex items-center gap-1 lg:order-1">
              {(() => {
                let items = [];
                if (user?.role === 'bim_specialist') {
                  items = [
                    { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                    { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                    { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                    { id: 'documentation', label: 'Docs', icon: FolderKanban, path: 'documentation' },
                  ];
                } else if (user?.role === 'junior_architect') {
                  items = [
                    { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                    { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                    { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                  ];
                } else if (user?.role === 'site_engineer') {
                  items = [
                    { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                    { id: 'engineer-hub', label: 'MatReq', icon: ClipboardList, path: 'engineer-hub' },
                    { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                    { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                  ];
                } else if (user?.role === 'site_coordinator') {
                  items = [
                    { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                    { id: 'coordinator-hub', label: 'MatReq', icon: ClipboardList, path: 'coordinator-hub' },
                    { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                    { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                  ];
                } else if (user?.role === 'intern') {
                  items = [
                    { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                    { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                    { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                  ];
                }
                return items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.path)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      currentPage === item.id || currentPage === item.path
                        ? 'bg-[#FF7120]/10 text-[#FF7120] border border-[#FF7120]/20'
                        : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ));
              })()}
            </div>
          )}

          {/* Notifications & Profile - Left side on mobile, Right side on desktop */}
          <div className="flex items-center gap-2 sm:gap-4 lg:order-2">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  style={{
                    background: 'transparent',
                    border: '1px solid #FF7120',
                    color: '#FF7120',
                    padding: '0.4rem',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <Bell className="h-4 w-4" style={{ transition: 'color 0.2s' }} />
                  {unreadCount > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '18px',
                      height: '18px',
                      background: '#F27229',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: 'white',
                      fontWeight: '600'
                    }}>
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
                        className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${notificationFilter === filter
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
                        <div key={notification.id} onClick={() => handleNotificationClick(notification)} className={`p-3 rounded-lg transition-colors cursor-pointer hover:bg-[#021B2C]/50 ${notification.is_read ? 'bg-[#021B2C]/30' : 'bg-[#F27229]/10'
                          }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{notification.title}</p>
                              <p className="text-xs text-[#AEAAAA] mt-1">{notification.message}</p>
                              <p className="text-xs text-[#AEAAAA]/70 mt-2">{formatTime(notification.created_at)}</p>
                            </div>
                            {!notification.is_read && (
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

            <button
              onClick={() => onNavigate('profile')}
              style={{
                background: currentPage === 'profile' ? '#FF7120' : 'transparent',
                border: '1px solid #FF7120',
                color: currentPage === 'profile' ? 'white' : '#FF7120',
                padding: '0.4rem',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                transition: 'all 0.2s'
              }}
            >
              <User className="h-4 w-4" style={{ transition: 'color 0.2s' }} />
            </button>
          </div>

          {/* Mobile Menu Trigger: Grip Icon for Sidebar roles */}
          <div className="flex items-center gap-2 lg:hidden">
            {(user?.role === 'studio_head' || user?.role === 'admin' || isSidebarDrivenRole) && (
              <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#FF7120',
                      width: '32px',
                      height: '32px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      borderRadius: '6px'
                    }}
                  >
                    <Grip className="h-6 w-6" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2 bg-[#001f35] border-[#AEAAAA]/20 shadow-xl z-[60]" align="end" sideOffset={8}>
                  <div className="flex flex-col gap-1">
                    {(() => {
                      let items = [];
                      if (user?.role === 'studio_head' || user?.role === 'admin') {
                        items = [
                          { id: 'attendance', label: 'Attendance', icon: Home, path: 'attendance' },
                          { id: 'overtime', label: 'Overtime & Leave', icon: Clock, path: 'overtime' },
                          { id: 'bim-docs', label: 'BIM Documentation', icon: FolderKanban, path: 'studio-head-bim-docs' },
                          { id: 'junior-architect-docs', label: 'Junior Architect Docs', icon: User, path: 'studio-head-junior-docs' },
                          { id: 'material-requests', label: 'Material Request', icon: ClipboardList, path: 'studio-head-material-requests' },
                          { id: 'approvals', label: 'User Approvals', icon: ClipboardCheck, path: 'approvals' },
                          { id: 'users', label: 'Manage Users', icon: Users, path: 'users' },
                          { id: 'reviews', label: 'Design Reviews', icon: FileText, path: 'reviews' },
                          { id: 'coordination', label: 'Coordinator Panel', icon: GitMerge, path: 'coordination' },
                        ];
                      } else if (user?.role === 'bim_specialist') {
                        items = [
                          { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                          { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                          { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                          { id: 'documentation', label: 'Docs', icon: FolderKanban, path: 'documentation' },
                        ];
                      } else if (user?.role === 'junior_architect') {
                        items = [
                          { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                          { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                          { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                          { id: 'documentation', label: 'Docs', icon: FolderKanban, path: 'documentation' },
                        ];
                      } else if (user?.role === 'site_engineer') {
                        items = [
                          { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                          { id: 'engineer-hub', label: 'MatReq', icon: ClipboardList, path: 'engineer-hub' },
                          { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                          { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                        ];
                      } else if (user?.role === 'site_coordinator') {
                        items = [
                          { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                          { id: 'coordinator-hub', label: 'MatReq', icon: ClipboardList, path: 'coordinator-hub' },
                          { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                          { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                        ];
                      } else if (user?.role === 'intern') {
                        items = [
                          { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                          { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                          { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                        ];
                      }
                      
                      return items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            onNavigate(item.path);
                            setIsMenuOpen(false);
                          }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            currentPage === item.id || currentPage === item.path
                              ? 'bg-[#FF7120] text-white' 
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      ));
                    })()}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PublicNavigation;
