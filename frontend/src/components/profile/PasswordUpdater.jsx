import React from 'react';

const PasswordUpdater = ({
  password,
  setPassword,
  showPasswordSection,
  setShowPasswordSection,
  updatePassword
}) => {
  return (
    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#00273C', borderRadius: '8px', border: '1px solid rgba(255, 113, 32, 0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showPasswordSection ? '1rem' : '0' }}>
        <div>
          <h4 style={{ color: '#e8eaed', fontSize: '1rem', marginBottom: '0.25rem' }}>Password</h4>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>Set a password for your account</p>
        </div>
        <button
          onClick={() => setShowPasswordSection(!showPasswordSection)}
          style={{
            padding: '0.5rem 1rem',
            background: 'transparent',
            color: '#FF7120',
            border: '1px solid rgba(255, 113, 32, 0.3)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          {showPasswordSection ? 'Cancel' : 'Set Password'}
        </button>
      </div>

      {showPasswordSection && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a4a8', fontSize: '0.9rem' }}>
              New Password
            </label>
            <input
              type="password"
              value={password.new}
              onChange={(e) => setPassword({ ...password, new: e.target.value })}
              placeholder="Enter new password"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#001a2b',
                color: '#e8eaed',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a4a8', fontSize: '0.9rem' }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={password.confirm}
              onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
              placeholder="Confirm new password"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#001a2b',
                color: '#e8eaed',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <button
            onClick={updatePassword}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#FF7120',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              width: '100%',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e66310';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FF7120';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Update Password
          </button>
        </div>
      )}
    </div>
  );
};

export default PasswordUpdater;
