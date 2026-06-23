import React from 'react';

const ProfileForm = ({
  profile,
  setProfile,
  user,
  isEditing,
  setShowCharLimitModal,
  totalHours,
  totalDeductions
}) => {
  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a4a8', fontSize: '0.9rem' }}>
          Full Name
        </label>
        <input
          type="text"
          value={profile.full_name}
          onChange={(e) => {
            if (e.target.value.length >= 24) {
              setShowCharLimitModal(true);
            }
            setProfile({ ...profile, full_name: e.target.value });
          }}
          disabled={!isEditing}
          maxLength={24}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: isEditing ? '#00273C' : '#001a2b',
            color: '#e8eaed',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            fontSize: '0.9rem'
          }}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a4a8', fontSize: '0.9rem' }}>
          Email
        </label>
        <input
          type="email"
          value={profile.email}
          disabled
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#001a2b',
            color: '#6b7280',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            fontSize: '0.9rem'
          }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a4a8', fontSize: '0.9rem' }}>
          Role
        </label>
        <input
          type="text"
          value={user.role_name || user.role || 'No role assigned'}
          disabled
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#001a2b',
            color: '#6b7280',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            fontSize: '0.9rem'
          }}
        />
      </div>

      {user.role !== 'coordinator' && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: '#00273C',
          borderRadius: '8px',
          border: '1px solid rgba(255, 113, 32, 0.2)',
          color: '#e8eaed',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#e8eaed' }}>Gross Total Hours</h4>
              <p style={{ margin: 0, color: '#a0a4a8', fontSize: '0.9rem' }}>
                Total physical time worked.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFB36B' }}>
                {Math.floor(totalHours / 60)}h {totalHours % 60}m
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#e8eaed' }}>Total Late Deductions</h4>
              <p style={{ margin: 0, color: '#a0a4a8', fontSize: '0.9rem' }}>
                Accumulated penalty time for late arrivals.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#EF4444' }}>
                {Math.floor(totalDeductions / 60)}h {totalDeductions % 60}m
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileForm;
