import React from 'react';
import { Home, Clock, FolderKanban, Calendar, ClipboardList } from 'lucide-react';

const DesktopNavLinks = ({ user, currentPage, onNavigate }) => {
  // Desktop Navigation Links: Only for Intern or Employee role based on original code,
  // but let's keep the exact original logic wrapper
  if (user?.role !== 'intern' && user?.role !== 'employee') {
    return null;
  }

  return (
    <div className="hidden lg:flex items-center gap-1 lg:order-1">
      {(() => {
        let items = [];
        if (user?.role === 'bim_specialist') {
          items = [
            { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
            { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
            { id: 'documentation', label: 'Docs', icon: FolderKanban, path: 'documentation' },
          ];
        } else if (user?.role === 'junior_architect') {
          items = [
            { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
            { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
          ];
        } else if (user?.role === 'site_engineer') {
          items = [
            { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
            { id: 'engineer-hub', label: 'MatReq', icon: ClipboardList, path: 'engineer-hub' },
            { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
          ];
        } else if (user?.role === 'site_coordinator') {
          items = [
            { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
            { id: 'coordinator-hub', label: 'MatReq', icon: ClipboardList, path: 'coordinator-hub' },
            { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
          ];
        } else if (user?.role === 'intern') {
          items = [];
        } else if (user?.role === 'employee') {
          items = [
            { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
            { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
            { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
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
  );
};

export default DesktopNavLinks;
