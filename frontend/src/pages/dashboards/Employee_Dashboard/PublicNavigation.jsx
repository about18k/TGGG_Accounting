import React, { useState } from 'react';
import { Bell, User, Home, Clock, CheckSquare, ArrowUpDown, Check } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/accounting-ui';

const PublicNavigation = ({ onNavigate, currentPage = 'attendance' }) => {
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Attendance Approved', message: 'Your attendance for Feb 9 has been approved', time: '2 hours ago', read: false, type: 'attendance' },
    { id: 2, title: 'Overtime Request', message: 'Your OT request is pending approval', time: '5 hours ago', read: true, type: 'overtime' },
    { id: 3, title: 'Work Documentation', message: 'Please submit your work documentation', time: '1 day ago', read: false, type: 'system' }
  ]);

  const filteredNotifications = notifications.filter(n => 
    notificationFilter === 'all' || 
    (notificationFilter === 'read' && n.read) || 
    (notificationFilter === 'unread' && !n.read)
  ).sort((a, b) => sortOrder === 'oldest' ? a.id - b.id : b.id - a.id);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <nav className="fixed top-0 w-full z-50 px-3 sm:px-6 py-3 sm:py-4" style={{ background: '#001f35' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full mx-auto px-2 sm:px-4 gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <img src="/logotripleg.png" alt="Triple G AOC" className="h-8 sm:h-10" />
          <span className="text-base sm:text-2xl font-semibold hidden sm:inline">Triple G AOC</span>
          <span className="text-base font-semibold sm:hidden">TG AOC</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
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
                  width: '32px',
                  height: '32px',
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
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" style={{ transition: 'color 0.2s' }} />
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
                    <div key={notif.id} className={`p-3 rounded-lg ${notif.read ? 'bg-[#003050]/50' : 'bg-[#003050]'} border border-[#AEAAAA]/10`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{notif.title}</p>
                          <p className="text-xs text-gray-400 mt-1">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                        </div>
                        {!notif.read && <div className="w-2 h-2 bg-[#FF7120] rounded-full mt-1"></div>}
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
