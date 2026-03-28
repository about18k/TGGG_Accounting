import React from 'react';
import { CalendarDays, DollarSign, FolderKanban, MapPinned, Users } from 'lucide-react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import CeoSidebar from './CeoSidebar';

export default function CeoDashboardPage({ user, onNavigate, onLogout }) {
  const todayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[#00273C]">
      <PublicNavigation onNavigate={onNavigate} currentPage="ceo-dashboard" user={user} onLogout={onLogout} />

      <div className="pt-40 sm:pt-28 px-4 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
          <aside className="hidden lg:block lg:w-64 shrink-0">
            <CeoSidebar currentPage="ceo-dashboard" onNavigate={onNavigate} />
          </aside>

          <main className="flex-1 min-w-0">
            {/* Greeting */}
            <div className="mb-8">
              <p className="text-white/40 text-sm">{todayLabel}</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-white">
                Good day, {user?.first_name || 'CEO'}.
              </h1>
            </div>

            {/* Navigation shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
              <button
                type="button"
                onClick={() => onNavigate?.('ceo-bim-docs')}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:border-[#FF7120]/40 hover:bg-[#FF7120]/10 transition"
              >
                <FolderKanban className="h-6 w-6 text-[#FF7120] shrink-0" />
                <div>
                  <p className="font-medium text-white">BIM Documentation</p>
                  <p className="text-xs text-white/50 mt-0.5">Review &amp; approve submissions</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate?.('attendance')}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:border-[#FF7120]/40 hover:bg-[#FF7120]/10 transition"
              >
                <MapPinned className="h-6 w-6 text-[#FF7120] shrink-0" />
                <div>
                  <p className="font-medium text-white">Attendance</p>
                  <p className="text-xs text-white/50 mt-0.5">Monitor team check-ins</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate?.('ceo-calendar')}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:border-[#FF7120]/40 hover:bg-[#FF7120]/10 transition"
              >
                <CalendarDays className="h-6 w-6 text-[#FF7120] shrink-0" />
                <div>
                  <p className="font-medium text-white">Calendar Events</p>
                  <p className="text-xs text-white/50 mt-0.5">View company no-work days and events</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate?.('ceo-employees')}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:border-[#FF7120]/40 hover:bg-[#FF7120]/10 transition"
              >
                <Users className="h-6 w-6 text-[#FF7120] shrink-0" />
                <div>
                  <p className="font-medium text-white">All Employees</p>
                  <p className="text-xs text-white/50 mt-0.5">View employee details across departments</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate?.('ceo-payroll')}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:border-[#FF7120]/40 hover:bg-[#FF7120]/10 transition"
              >
                <DollarSign className="h-6 w-6 text-[#FF7120] shrink-0" />
                <div>
                  <p className="font-medium text-white">Processed Payroll</p>
                  <p className="text-xs text-white/50 mt-0.5">Review payroll prepared by accounting</p>
                </div>
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}