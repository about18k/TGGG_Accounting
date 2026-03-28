import React from 'react';
import { Calendar, ClipboardCheck, Clock, DollarSign, Home, Package, Users } from 'lucide-react';

const PERSONAL_LINKS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'personal_attendance', label: 'My Attendance', icon: Calendar, page: 'personal-attendance' },
  { id: 'overtime', label: 'My Overtime', icon: Clock, page: 'overtime' },
];

const DEPARTMENT_LINKS = [
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'payroll', label: 'Payroll', icon: DollarSign },
  { id: 'material_requests', label: 'Material Requests', icon: Package, page: 'material-requests' },
];

const MANAGEMENT_LINKS = [
  { id: 'attendance', label: 'Attendance Records', icon: Clock, page: 'attendance' },
  { id: 'events', label: 'Calendar / Events', icon: Calendar, page: 'events' },
  { id: 'otrequest', label: 'OT Requests', icon: ClipboardCheck, page: 'otrequest' },
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
    ? `${cardClass} p-4 ${sticky ? 'lg:sticky lg:top-24' : ''} ${className}`.trim()
    : className;

  const renderLink = (item) => {
    const Icon = item.icon;
    const path = item.page || item.id;
    
    // Improved isActive check to match both page-based and tab/section-based navigation
    const isActive = item.page 
      ? (currentPage === item.page || (activeSection === item.page))
      : (activeSection === 'main' && activeTab === item.id) || currentPage === item.id;

    const handleClick = () => {
      onNavigate?.(path);
    };

    return (
      <button
        key={item.id}
        type="button"
        onClick={handleClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          isActive 
            ? 'bg-[#FF7120] text-white' 
            : 'text-white/70 hover:bg-white/5 hover:text-white'
        }`}
      >
        <Icon className="h-5 w-5" />
        <span className="font-medium text-left flex-1">{item.label}</span>
      </button>
    );
  };

  return (
    <div className={wrapperClass}>
      <nav className="space-y-4">
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Personal</p>
          {PERSONAL_LINKS.map(renderLink)}
        </div>

        <div className="space-y-1">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Department</p>
          {DEPARTMENT_LINKS.map(renderLink)}
        </div>

        <div className="space-y-1">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Management</p>
          {MANAGEMENT_LINKS.map(renderLink)}
        </div>
      </nav>
    </div>
  );
}
