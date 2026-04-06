import React from 'react';
import Profile from '../Public_Dashboard/Profile.jsx';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import AccountingSidebar from './AccountingSidebar';

const AccountingProfilePage = ({ user, token, onLogout, onNavigate }) => {
  return (
    <div className="min-h-screen" style={{ background: '#00273C' }}>
      <PublicNavigation onNavigate={onNavigate} currentPage="profile" user={user} onLogout={onLogout} />

      <div className="pt-40 sm:pt-28 px-3 sm:px-6 pb-6 w-full">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
          <aside className="hidden lg:block lg:w-64 shrink-0">
            <AccountingSidebar currentPage="profile" onNavigate={onNavigate} onLogout={onLogout} />
          </aside>

          <div className="flex-1 min-w-0 px-2 sm:px-4">
            <Profile token={token} user={user} onLogout={onLogout} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingProfilePage;
