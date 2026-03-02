import React from 'react';
import { Calendar, CheckSquare, Clock, LogOut, User } from 'lucide-react';

const MENU_LINKS = [
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'overtime', label: 'Overtime & Leave', icon: Calendar },
  { id: 'todo', label: 'Tasks & Todo', icon: CheckSquare },
  { id: 'profile', label: 'Profile', icon: User },
];

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg';

export default function CeoSidebar({
  currentPage = 'attendance',
  onNavigate,
  onLogout,
  withFrame = true,
  sticky = true,
  className = '',
}) {
  const wrapperClass = withFrame
    ? `${cardClass} p-4 ${sticky ? 'sticky top-24' : ''} ${className}`.trim()
    : className;

  return (
    <div className={wrapperClass}>
      <div className="mb-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Executive</p>
        <p className="text-white font-semibold text-sm">Command Center</p>
      </div>

      <nav className="space-y-2">
        {MENU_LINKS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                isActive ? 'bg-[#FF7120] text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {onLogout && (
        <div className="pt-3 mt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20 hover:text-white transition"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
