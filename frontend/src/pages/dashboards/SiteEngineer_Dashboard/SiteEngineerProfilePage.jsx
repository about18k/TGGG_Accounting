import React from 'react';
import Profile from '../Public_Dashboard/Profile.jsx';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import SiteEngineerSidebar from './components/SiteEngineerSidebar';

const SiteEngineerProfilePage = ({ user, token, onLogout, onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="profile" user={user} />

      <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex gap-6">
          <aside className="w-64 shrink-0 hidden lg:block">
            <SiteEngineerSidebar currentPage="profile" onNavigate={onNavigate} />
          </aside>

          <main className="flex-1 min-w-0">
            <div className="rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)] p-4 sm:p-6">
              <Profile
                token={token}
                user={user}
                onLogout={onLogout}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SiteEngineerProfilePage;
