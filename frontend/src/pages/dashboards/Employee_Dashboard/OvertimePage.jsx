import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import OvertimeForm from './OvertimeForm.jsx';
import OvertimeStatus from './OvertimeStatus.jsx';
import PublicNavigation from './PublicNavigation';

const OvertimePage = ({ user, token, onLogout, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('form');

  return (
    <div className="min-h-screen" style={{ background: '#00273C' }}>
      <PublicNavigation onNavigate={onNavigate} currentPage="overtime" />

      <div className="pt-40 sm:pt-28 px-3 sm:px-6 pb-6 w-full">
        <div className="max-w-1400px mx-auto px-2 sm:px-10 space-y-4 sm:space-y-8">
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('form')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'form' ? '#FF7120' : 'transparent',
                color: activeTab === 'form' ? 'white' : '#9ca3af',
                border: `1px solid ${activeTab === 'form' ? '#FF7120' : 'rgba(255, 113, 32, 0.3)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'form') {
                  e.currentTarget.style.background = '#FF7120';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = '#FF7120';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'form') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#9ca3af';
                  e.currentTarget.style.borderColor = 'rgba(255, 113, 32, 0.3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              Request Overtime
            </button>
            <button
              onClick={() => setActiveTab('status')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'status' ? '#FF7120' : 'transparent',
                color: activeTab === 'status' ? 'white' : '#9ca3af',
                border: `1px solid ${activeTab === 'status' ? '#FF7120' : 'rgba(255, 113, 32, 0.3)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'status') {
                  e.currentTarget.style.background = '#FF7120';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = '#FF7120';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'status') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#9ca3af';
                  e.currentTarget.style.borderColor = 'rgba(255, 113, 32, 0.3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              My Requests
            </button>
          </div>

          {/* Content */}
          {activeTab === 'form' ? (
            <OvertimeForm token={token} />
          ) : (
            <OvertimeStatus token={token} />
          )}
        </div>
      </div>
    </div>
  );
};

export default OvertimePage;
