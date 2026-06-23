import React from 'react';
import Profile from './dashboards/Public_Dashboard/Profile';

export default function ProfilePage({ user, token, onLogout }) {
  return (
    <Profile
      token={token}
      user={user}
      onLogout={onLogout}
    />
  );
}
