import React from 'react';
import { Button } from '../../../components/ui/button';
import Profile from './Profile.jsx';
import PublicNavigation from './PublicNavigation';

const ProfilePage = ({ user, token, onLogout, onNavigate }) => {
  return (
    <div className="min-h-screen" style={{ background: '#00273C' }}>
      <PublicNavigation onNavigate={onNavigate} currentPage="profile" user={user} />

      <div className="pt-40 sm:pt-28 px-3 sm:px-6 pb-6 w-full">
        <div className="max-w-1400px mx-auto px-2 sm:px-10">
          <Profile 
            token={token} 
            user={user} 
            onLogout={onLogout}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
