import React from 'react';
import StudioHeadProfile from './StudioHeadProfile.jsx';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import StudioHeadSidebar from './components/StudioHeadSidebar';

const StudioHeadProfilePage = ({ user, token, onLogout, onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="profile" user={user} />

      <div className="relative pt-28 px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex gap-6">
          <aside className="w-64 shrink-0">
            <StudioHeadSidebar currentPage="profile" onNavigate={onNavigate} />
          </aside>

          <main className="flex-1 min-w-0">
            <StudioHeadProfile 
              token={token} 
              user={user} 
              onLogout={onLogout}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default StudioHeadProfilePage;
