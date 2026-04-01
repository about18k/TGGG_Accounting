import React, { useEffect, useState } from 'react';
import { CalendarDays, ClipboardList, Clock, DollarSign, FolderKanban, User, Users, X } from 'lucide-react';

const PERSONAL_LINKS = [
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'ceo-calendar', label: 'Calendar', icon: CalendarDays },
];

const DOCUMENTATION_LINKS = [
  { id: 'ceo-bim-docs', label: 'BIM Documentation', icon: FolderKanban },
  { id: 'ceo-junior-docs', label: 'Junior Architect Docs', icon: User },
];

const REQUESTS_LINKS = [
  { id: 'ceo-material-requests', label: 'Material request & expenses', icon: ClipboardList },
  { id: 'ceo-employees', label: 'Employees', icon: Users },
  { id: 'ceo-payroll', label: 'Payroll Records', icon: DollarSign },
];

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg';

export default function CeoSidebar({
  currentPage = 'attendance',
  onNavigate,
  withFrame = true,
  sticky = true,
  mobileCollapsible = false,
  className = '',
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileCollapsible || typeof window === 'undefined') {
      return undefined;
    }

    const handleToggle = (event) => {
      const requestedOpen = event?.detail?.open;
      if (typeof requestedOpen === 'boolean') {
        setMobileOpen(requestedOpen);
        return;
      }
      setMobileOpen((prev) => !prev);
    };

    window.addEventListener('ceo-sidebar-toggle', handleToggle);
    return () => {
      window.removeEventListener('ceo-sidebar-toggle', handleToggle);
    };
  }, [mobileCollapsible]);

  const wrapperClass = withFrame
    ? `${cardClass} p-4 ${sticky ? 'lg:sticky lg:top-28' : ''} ${className}`.trim()
    : className;

  const mobilePanelClass = `${cardClass} p-4 rounded-none border-l border-white/10 border-t-0 border-b-0 border-r-0 bg-[#001f35]/95 backdrop-blur-xl shadow-2xl`;

  const renderNavButton = (item) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onNavigate?.(item.id);
          if (mobileCollapsible) {
            setMobileOpen(false);
          }
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
          isActive ? 'bg-[#FF7120] text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="font-medium text-left leading-snug">{item.label}</span>
      </button>
    );
  };

  const renderSidebarContent = (isMobile = false) => (
    <>
      <div className="mb-2 flex items-center justify-end gap-3">
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Close sidebar menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 lg:mt-0">
        <nav className="space-y-4">
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Personal</p>
            {PERSONAL_LINKS.map(renderNavButton)}
          </div>

          <div className="space-y-1">
            <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Documentation</p>
            {DOCUMENTATION_LINKS.map(renderNavButton)}
          </div>

          <div className="space-y-1">
            <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Management</p>
            {REQUESTS_LINKS.map(renderNavButton)}
          </div>
        </nav>
      </div>
    </>
  );

  if (!mobileCollapsible) {
    return <div className={wrapperClass}>{renderSidebarContent(false)}</div>;
  }

  return (
    <>
      <div className={`hidden lg:block ${wrapperClass}`}>
        {renderSidebarContent(false)}
      </div>

      <div
        className={`lg:hidden fixed inset-0 z-[70] transition-opacity duration-300 ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute inset-0 bg-black/45"
          aria-label="Close sidebar overlay"
        />

        <aside
          id="ceo-sidebar-content"
          className={`absolute top-0 right-0 h-full w-[min(86vw,320px)] ${mobilePanelClass} transform transition-transform duration-300 ease-out ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {renderSidebarContent(true)}
        </aside>
      </div>
    </>
  );
}
