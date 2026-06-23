import React from 'react';
import PublicNavigation from '../pages/dashboards/Public_Dashboard/PublicNavigation';
import Sidebar from './Sidebar';
import { getSidebarConfig } from './sidebarConfig';

export default function DashboardLayout({
  user,
  currentPage,
  onNavigate,
  onLogout,
  children,
  hideSidebar = false,
  className = '',
}) {
  const sidebarSections = getSidebarConfig(user?.role);
  
  const isSidebarDriven =
    user?.role === 'bim_specialist' ||
    user?.role === 'junior_architect' ||
    user?.role === 'site_engineer' ||
    user?.role === 'site_coordinator' ||
    user?.role === 'intern' ||
    user?.role === 'ceo' ||
    user?.role === 'studio_head';

  const showSidebar = !hideSidebar && isSidebarDriven;

  return (
    <div className="min-h-screen bg-[#00273C] relative">
      <PublicNavigation
        onNavigate={onNavigate}
        currentPage={currentPage}
        user={user}
        onLogout={onLogout}
      />

      <div className="relative pt-28 px-3 sm:px-6 pb-10">
        <div className={`w-full flex flex-col lg:flex-row gap-6 ${className}`}>
          {showSidebar && sidebarSections && sidebarSections.length > 0 && (
            <aside className="w-64 shrink-0 hidden lg:block">
              <Sidebar
                sections={sidebarSections}
                currentPage={currentPage}
                onNavigate={onNavigate}
                role={user?.role}
              />
            </aside>
          )}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
