import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bell, User, Home, Clock, CheckSquare, ArrowUpDown, Check } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/accounting-ui';

const PublicNavigation = ({ onNavigate, currentPage = 'attendance', user }) => {
  const isSidebarDrivenRole =
    user?.role === 'bim_specialist' ||
    user?.role === 'junior_architect' ||
    user?.role === 'site_engineer' ||
    user?.role === 'site_coordinator';
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [notifications, setNotifications] = useState([]);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch { /* ignore */ }
  }, [API_BASE]);

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
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await axios.post(`${API_BASE}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* ignore */ }
  };

  const handleNotificationClick = async (notif) => {
    // Mark as read if unread
    if (!notif.is_read) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await axios.post(`${API_BASE}/notifications/${notif.id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        } catch { /* ignore */ }
      }
    }
    // Determine which tab to open based on notification type
    const type = notif.type || '';
    let tab = 'team';
    if (type.startsWith('dept_')) {
      tab = 'department';
    } else if (['task_suggested', 'completion_requested'].includes(type)) {
      tab = 'team'; // leader manage tab items
    } else if (['task_assigned', 'task_confirmed', 'completion_confirmed', 'completion_rejected'].includes(type)) {
      tab = 'team';
    }
    localStorage.setItem('todoActiveTab', tab);
    onNavigate('todo');
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
    <nav className="fixed top-0 w-full z-50 px-3 sm:px-6 py-3 sm:py-4" style={{ background: '#001f35' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full mx-auto px-2 sm:px-4 gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <img src="/logo.png" alt="Triple G AOC" className="h-8 sm:h-10" />
          <span className="text-base sm:text-2xl font-semibold hidden sm:inline">Triple G AOC</span>
          <span className="text-base font-semibold sm:hidden">TG AOC</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {user?.role !== 'studio_head' && user?.role !== 'admin' && !isSidebarDrivenRole && (
            <button
              onClick={() => onNavigate('attendance')}
              style={{
                background: currentPage === 'attendance' ? '#FF7120' : 'transparent',
                border: '1px solid #FF7120',
                color: currentPage === 'attendance' ? 'white' : '#FF7120',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== 'attendance') {
                  e.currentTarget.style.background = '#FF7120';
                  e.currentTarget.style.borderColor = '#FF7120';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== 'attendance') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#FF7120';
                  e.currentTarget.style.color = '#FF7120';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <Home className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Dashboard</span>
            </button>
          )}
          {user?.role !== 'studio_head' && user?.role !== 'admin' && !isSidebarDrivenRole && (
            <>
              <button
                onClick={() => onNavigate('overtime')}
                style={{
                  background: currentPage === 'overtime' ? '#FF7120' : 'transparent',
                  border: '1px solid #FF7120',
                  color: currentPage === 'overtime' ? 'white' : '#FF7120',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 'overtime') {
                    e.currentTarget.style.background = '#FF7120';
                    e.currentTarget.style.borderColor = '#FF7120';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 'overtime') {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#FF7120';
                    e.currentTarget.style.color = '#FF7120';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>OT</span>
              </button>
              <button
                onClick={() => onNavigate('todo')}
                style={{
                  background: currentPage === 'todo' ? '#FF7120' : 'transparent',
                  border: '1px solid #FF7120',
                  color: currentPage === 'todo' ? 'white' : '#FF7120',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 'todo') {
                    e.currentTarget.style.background = '#FF7120';
                    e.currentTarget.style.borderColor = '#FF7120';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 'todo') {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#FF7120';
                    e.currentTarget.style.color = '#FF7120';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Todo</span>
              </button>
            </>
          )}
          <div className="hidden sm:flex items-center gap-2 sm:gap-4">
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#FF7120';
                    e.currentTarget.style.background = '#FF7120';
                    e.currentTarget.querySelector('svg').style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#FF7120';
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.querySelector('svg').style.color = '#FF7120';
                  }}
                >
                  <Bell className="h-5 w-5" style={{ transition: 'color 0.2s' }} />
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
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 p-0 bg-[#002035] border-[#AEAAAA]/20 shadow-lg shadow-black/20 z-50" align="end" sideOffset={8}>
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
                padding: '0.5rem',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== 'profile') {
                  e.currentTarget.style.borderColor = '#FF7120';
                  e.currentTarget.style.background = '#FF7120';
                  e.currentTarget.querySelector('svg').style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== 'profile') {
                  e.currentTarget.style.borderColor = '#FF7120';
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.querySelector('svg').style.color = '#FF7120';
                }
              }}
            >
              <User className="h-5 w-5" style={{ transition: 'color 0.2s' }} />
            </button>
          </div>
        </div>
        <div className="flex sm:hidden items-center gap-2">
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
            <PopoverContent className="w-[calc(100vw-2rem)] p-0 bg-[#002035] border-[#AEAAAA]/20 shadow-lg shadow-black/20 z-50" align="center" sideOffset={8}>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-4">Notifications</h3>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setNotificationFilter('all')} className={`px-2 py-1 text-xs rounded ${notificationFilter === 'all' ? 'bg-[#FF7120] text-white' : 'bg-[#003050] text-gray-300'}`}>All</button>
                  <button onClick={() => setNotificationFilter('unread')} className={`px-2 py-1 text-xs rounded ${notificationFilter === 'unread' ? 'bg-[#FF7120] text-white' : 'bg-[#003050] text-gray-300'}`}>Unread</button>
                  <button onClick={() => setNotificationFilter('read')} className={`px-2 py-1 text-xs rounded ${notificationFilter === 'read' ? 'bg-[#FF7120] text-white' : 'bg-[#003050] text-gray-300'}`}>Read</button>
                </div>
                {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-[#FF7120] hover:underline mb-2 flex items-center gap-1"><Check className="h-3 w-3" />Mark all as read</button>}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredNotifications.map(notif => (
                    <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`p-3 rounded-lg cursor-pointer ${notif.is_read ? 'bg-[#003050]/50' : 'bg-[#003050]'} border border-[#AEAAAA]/10`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{notif.title}</p>
                          <p className="text-xs text-gray-400 mt-1">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatTime(notif.created_at)}</p>
                        </div>
                        {!notif.is_read && <div className="w-2 h-2 bg-[#FF7120] rounded-full mt-1"></div>}
                      </div>
                    </div>
                  ))}
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
      </div>
    </nav>
  );
};

export default PublicNavigation;
