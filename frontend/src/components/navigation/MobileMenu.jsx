import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/accounting-ui';
import { 
  Grip, Home, Clock, FolderKanban, User, FileText, ClipboardList, 
  ClipboardCheck, Users, Calendar, CalendarDays, DollarSign, Package 
} from 'lucide-react';

const MobileMenu = ({ user, currentPage, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const isAccountingUser = user?.role === 'accounting' || (
    user?.role === 'employee' && (
      user?.department_name?.toLowerCase() === 'accounting department' ||
      user?.department_name?.toLowerCase() === 'accounting'
    )
  );

  const isSidebarDrivenRole =
    user?.role === 'bim_specialist' ||
    user?.role === 'junior_architect' ||
    user?.role === 'site_engineer' ||
    user?.role === 'site_coordinator' ||
    user?.role === 'intern' ||
    user?.role === 'ceo' ||
    isAccountingUser;

  if (!(user?.role === 'studio_head' || isSidebarDrivenRole || user?.role === 'employee')) {
    return null;
  }

  return (
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
            let sections = [];
            if (isAccountingUser) {
              sections = [
                {
                  title: 'Personal',
                  items: [
                    { id: 'dashboard', label: 'Dashboard', icon: Home, path: 'dashboard' },
                    { id: 'personal-attendance', label: 'My Attendance', icon: Calendar, path: 'personal-attendance' },
                    { id: 'overtime', label: 'My Overtime', icon: Clock, path: 'overtime' },
                  ]
                },
                {
                  title: 'Department',
                  items: [
                    { id: 'employees', label: 'Employees', icon: Users, path: 'employees' },
                    { id: 'payroll', label: 'Payroll', icon: DollarSign, path: 'payroll' },
                    { id: 'material-requests', label: 'Material request & expenses', icon: Package, path: 'material-requests' },
                  ]
                },
                {
                  title: 'Management',
                  items: [
                    { id: 'attendance', label: 'Attendance Records', icon: Clock, path: 'attendance' },
                    { id: 'events', label: 'Calendar / Events', icon: Calendar, path: 'events' },
                    { id: 'otrequest', label: 'OT Requests', icon: ClipboardCheck, path: 'otrequest' },
                  ]
                }
              ];
            } else if (user?.role === 'studio_head') {
              sections = [
                {
                  title: 'Personal',
                  items: [
                    { id: 'attendance', label: 'Attendance', icon: Home, path: 'attendance' },
                    { id: 'overtime', label: 'Overtime & Leave', icon: Clock, path: 'overtime' },
                  ]
                },
                {
                  title: 'Documentation',
                  items: [
                    { id: 'bim-docs', label: 'BIM Documentation', icon: FolderKanban, path: 'studio-head-bim-docs' },
                    { id: 'junior-architect-docs', label: 'Junior Architect Docs', icon: User, path: 'studio-head-junior-docs' },
                    { id: 'reviews', label: 'Design Reviews', icon: FileText, path: 'reviews' },
                  ]
                },
                {
                  title: 'Management',
                  items: [
                    { id: 'material-requests', label: 'Material Request', icon: ClipboardList, path: 'studio-head-material-requests' },
                    { id: 'approvals', label: 'User Approvals', icon: ClipboardCheck, path: 'approvals' },
                    { id: 'users', label: 'Manage Users', icon: Users, path: 'users' },
                  ]
                }
              ];
            } else if (user?.role === 'bim_specialist') {
              sections = [
                {
                  title: 'Personal',
                  items: [
                    { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                    { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
                    { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                  ]
                },
                {
                  title: 'Documentation',
                  items: [
                    { id: 'documentation', label: 'Docs', icon: FolderKanban, path: 'documentation' },
                  ]
                }
              ];
            } else if (user?.role === 'junior_architect') {
              sections = [
                {
                  title: 'Personal',
                  items: [
                    { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                    { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
                    { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                  ]
                },
                {
                  title: 'Documentation',
                  items: [
                    { id: 'documentation', label: 'Docs', icon: FolderKanban, path: 'documentation' },
                  ]
                }
              ];
            } else if (user?.role === 'site_engineer') {
              sections = [
                {
                  title: 'Personal',
                  items: [
                    { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                    { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
                    { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                  ]
                },
                {
                  title: 'Management',
                  items: [
                    { id: 'engineer-hub', label: 'MatReq', icon: ClipboardList, path: 'engineer-hub' },
                  ]
                }
              ];
            } else if (user?.role === 'site_coordinator') {
              sections = [
                {
                  title: 'Personal',
                  items: [
                    { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                    { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
                    { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                  ]
                },
                {
                  title: 'Management',
                  items: [
                    { id: 'coordinator-hub', label: 'MatReq', icon: ClipboardList, path: 'coordinator-hub' },
                  ]
                }
              ];
            } else if (user?.role === 'intern') {
              sections = [
                {
                  title: 'Personal',
                  items: [
                    { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                    { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
                    { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                  ]
                }
              ];
            } else if (user?.role === 'employee') {
              sections = [
                {
                  title: 'Personal',
                  items: [
                    { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                    { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
                    { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                  ]
                }
              ];
            } else if (user?.role === 'ceo') {
              sections = [
                {
                  title: 'Personal',
                  items: [
                    { id: 'attendance', label: 'Attendance', icon: Clock, path: 'attendance' },
                    { id: 'ceo-calendar', label: 'Calendar', icon: CalendarDays, path: 'ceo-calendar' },
                  ]
                },
                {
                  title: 'Documentation',
                  items: [
                    { id: 'ceo-bim-docs', label: 'BIM Documentation', icon: FolderKanban, path: 'ceo-bim-docs' },
                    { id: 'ceo-junior-docs', label: 'Junior Architect Docs', icon: User, path: 'ceo-junior-docs' },
                  ]
                },
                {
                  title: 'Management',
                  items: [
                    { id: 'ceo-material-requests', label: 'Material request & expenses', icon: ClipboardList, path: 'ceo-material-requests' },
                    { id: 'ceo-employees', label: 'Employees', icon: Users, path: 'ceo-employees' },
                    { id: 'ceo-payroll', label: 'Payroll Records', icon: DollarSign, path: 'ceo-payroll' },
                  ]
                }
              ];
            }
            
            return sections.map((section, idx) => (
              <div key={idx} className="mb-2">
                <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1 mt-2">{section.title}</p>
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.path);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      currentPage === item.id || currentPage === item.path
                        ? 'bg-[#FF7120] text-white' 
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            ));
          })()}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MobileMenu;
