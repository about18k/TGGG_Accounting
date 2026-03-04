import React from 'react';
import Profile from './Profile.jsx';
import PublicNavigation from './PublicNavigation';

const ProfilePage = ({ user, token, onLogout, onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="profile" />

      <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10 w-full">
        <div className="max-w-[1400px] mx-auto px-2 sm:px-10 space-y-5 sm:space-y-8">
          <div className="p-4 sm:p-6">
            <Profile
              token={token}
              user={user}
              onLogout={onLogout}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
