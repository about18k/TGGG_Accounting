import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg';
const mobilePanelClass = `${cardClass} p-4 rounded-none border-l border-white/10 border-t-0 border-b-0 border-r-0 bg-[#001f35]/95 backdrop-blur-xl shadow-2xl`;

export default function Sidebar({
  sections = [],
  currentPage = 'attendance',
  onNavigate,
  mobileCollapsible = false,
  role = '',
  className = '',
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileCollapsible || typeof window === 'undefined') return;

    const handleToggle = () => setMobileOpen((prev) => !prev);
    window.addEventListener(`${role}-sidebar-toggle`, handleToggle);
    return () => window.removeEventListener(`${role}-sidebar-toggle`, handleToggle);
  }, [mobileCollapsible, role]);

  const renderNavButton = (item) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onNavigate?.(item.id);
          if (mobileCollapsible) setMobileOpen(false);
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

  const renderContent = (isMobile = false) => (
    <>
      <div className="mb-2 flex items-center justify-end">
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="space-y-4">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.title && (
              <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2 font-mono">
                {section.title}
              </p>
            )}
            {section.items.map(renderNavButton)}
          </div>
        ))}
      </nav>
    </>
  );

  const wrapperClass = `${cardClass} p-4 lg:sticky lg:top-28 ${className}`;

  if (!mobileCollapsible) {
    return <div className={wrapperClass}>{renderContent(false)}</div>;
  }

  return (
    <>
      <div className={`hidden lg:block ${wrapperClass}`}>
        {renderContent(false)}
      </div>

      <div
        className={`lg:hidden fixed inset-0 z-[70] transition-opacity duration-300 ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute inset-0 bg-black/45"
        />
        <aside
          className={`absolute top-0 right-0 h-full w-[min(86vw,320px)] ${mobilePanelClass} transform transition-transform duration-300 ease-out ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {renderContent(true)}
        </aside>
      </div>
    </>
  );
}
