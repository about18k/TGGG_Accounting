import React, { useState } from 'react';
import OvertimeForm from '../Public_Dashboard/OvertimeForm.jsx';
import OvertimeStatus from '../Public_Dashboard/OvertimeStatus.jsx';
import LeaveForm from '../Public_Dashboard/LeaveForm.jsx';
import LeaveStatus from '../Public_Dashboard/LeaveStatus.jsx';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import CeoSidebar from './CeoSidebar';

const CeoOvertimePage = ({ user, token, onLogout, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('ot-form');

  const tabStyle = (isActive) => ({
    padding: '0.75rem 1.5rem',
    background: isActive ? '#FF7120' : 'transparent',
    color: isActive ? 'white' : '#9ca3af',
    border: `1px solid ${isActive ? '#FF7120' : 'rgba(255, 113, 32, 0.3)'}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  });

  const renderTabButton = (tabId, label) => (
    <button
      onClick={() => setActiveTab(tabId)}
      style={tabStyle(activeTab === tabId)}
      onMouseEnter={(e) => {
        if (activeTab !== tabId) {
          e.currentTarget.style.background = '#FF7120';
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.borderColor = '#FF7120';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
        }
      }}
      onMouseLeave={(e) => {
        if (activeTab !== tabId) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#9ca3af';
          e.currentTarget.style.borderColor = 'rgba(255, 113, 32, 0.3)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen" style={{ background: '#00273C' }}>
      <PublicNavigation onNavigate={onNavigate} currentPage="overtime" user={user} onLogout={onLogout} />

      <div className="pt-40 sm:pt-28 px-3 sm:px-6 pb-6 w-full">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
          <aside className="hidden lg:block lg:w-64 shrink-0">
            <CeoSidebar currentPage="overtime" onNavigate={onNavigate} onLogout={onLogout} />
          </aside>

          <div className="flex-1 min-w-0 space-y-4 sm:space-y-8">
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {renderTabButton('ot-form', 'Request OT')}
              {renderTabButton('ot-status', 'OT Status')}
              {renderTabButton('leave-form', 'Request Leave')}
              {renderTabButton('leave-status', 'Leave Status')}
            </div>

            {activeTab === 'ot-form' && <OvertimeForm token={token} />}
            {activeTab === 'ot-status' && <OvertimeStatus token={token} />}
            {activeTab === 'leave-form' && <LeaveForm token={token} />}
            {activeTab === 'leave-status' && <LeaveStatus token={token} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CeoOvertimePage;
