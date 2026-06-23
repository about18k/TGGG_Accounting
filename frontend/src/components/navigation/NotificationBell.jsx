import React, { useState, useEffect, useCallback } from 'react';
import * as notifService from '../../services/notificationService';
import { Bell, ArrowUpDown, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/accounting-ui';

const NotificationBell = ({ user, onNavigate }) => {
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [notifications, setNotifications] = useState([]);

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

    const type = String(notif.type || '').toLowerCase();
    const role = String(user?.role || '').toLowerCase();
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

    if (type === 'user_pending_approval' && role === 'studio_head') {
      onNavigate('approvals');
      return;
    }

    if (type === 'matreq_submitted_to_sh' && role === 'studio_head') {
      onNavigate('studio-head-material-requests');
      return;
    }

    if (type === 'bim_submitted_to_sh' && role === 'studio_head') {
      onNavigate('studio-head-bim-docs');
      return;
    }

    if (type === 'matreq_forwarded_to_ceo' && role === 'ceo') {
      onNavigate('ceo-material-requests');
      return;
    }

    if (type === 'bim_forwarded_to_ceo' && role === 'ceo') {
      onNavigate('ceo-bim-docs');
      return;
    }

    if (type === 'ceo_payroll_processed' && role === 'ceo') {
      onNavigate('ceo-payroll');
      return;
    }

    if (type === 'matreq_rejected') {
      if (role === 'site_engineer') {
        onNavigate('engineer-hub');
        return;
      }
      if (role === 'site_coordinator') {
        onNavigate('coordinator-hub');
        return;
      }
    }

    if (type === 'bim_rejected' && (role === 'bim_specialist' || role === 'junior_architect')) {
      onNavigate('documentation');
      return;
    }

    if (type.startsWith('ot_')) {
      onNavigate('overtime');
      return;
    }

    if (type.startsWith('calendar_')) {
      onNavigate(role === 'ceo' ? 'ceo-calendar' : 'calendar');
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
            width: '36px',
            height: '36px',
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
  );
};

export default NotificationBell;
