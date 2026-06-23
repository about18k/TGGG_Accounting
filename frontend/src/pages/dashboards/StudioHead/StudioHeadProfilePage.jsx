import React from 'react';
import StudioHeadProfile from './StudioHeadProfile.jsx';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import StudioHeadSidebar from './components/StudioHeadSidebar';

const StudioHeadProfilePage = ({ user, token, onLogout, onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#00273C] relative">
      <PublicNavigation onNavigate={onNavigate} currentPage="profile" user={user} />

      <div className="relative pt-28 px-6 pb-10">
        <div className="w-full flex gap-6">
          <aside className="hidden lg:block lg:w-64 shrink-0">
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
