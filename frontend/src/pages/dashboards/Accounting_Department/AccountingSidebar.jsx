import React from 'react';
import { Calendar, Clock, DollarSign, Home, Users } from 'lucide-react';

const MAIN_LINKS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'personal_attendance', label: 'Attendance', icon: Calendar, page: 'personal-attendance' },
  { id: 'payroll', label: 'Payroll', icon: DollarSign },
];

const SECTION_LINKS = [
  { id: 'attendance', label: 'Attendance Records', icon: Clock, page: 'attendance' },
  { id: 'overtime', label: 'Overtime Requests', icon: Clock, page: 'overtime' },
];

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg';

export default function AccountingSidebar({
  activeTab,
  activeSection = 'main',
  currentPage = 'dashboard',
  onNavigate,
  withFrame = true,
  sticky = true,
  className = '',
}) {
  const wrapperClass = withFrame
    ? `${cardClass} p-4 ${sticky ? 'sticky top-24' : ''} ${className}`.trim()
    : className;

  const handleSelect = (itemId) => {
    const item = MAIN_LINKS.find(l => l.id === itemId);
    if (item?.page) {
      onNavigate?.(item.page);
    } else {
      onNavigate?.(itemId);
    }
  };

  const handleSectionClick = (item) => onNavigate?.(item.page);

  return (
    <div className={wrapperClass}>
      <nav className="space-y-2">
        {MAIN_LINKS.map((item) => {
          const Icon = item.icon;
          const isActive = item.page 
            ? currentPage === item.page
            : (activeSection === 'main' && activeTab === item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
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

      {SECTION_LINKS.length > 0 && (
        <>
          <div className="pt-2 mt-2 border-t border-white/10" />
          <nav className="space-y-2">
            {SECTION_LINKS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSectionClick(item)}
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
        </>
      )}

      {/* Page links intentionally removed */}
      {/* Secondary actions (Settings/Logout) intentionally removed */}
    </div>
  );
}
