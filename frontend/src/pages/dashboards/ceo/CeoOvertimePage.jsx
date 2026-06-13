import React, { useState } from 'react';
import OvertimeForm from '../Public_Dashboard/OvertimeForm.jsx';
import OvertimeStatus from '../Public_Dashboard/OvertimeStatus.jsx';
import LeaveForm from '../Public_Dashboard/LeaveForm.jsx';
import LeaveStatus from '../Public_Dashboard/LeaveStatus.jsx';

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
    <div className="w-full animate-fade-in space-y-6">
      


            {activeTab === 'ot-form' && (
              <OvertimeForm
                token={token}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                extraTabs={['leave-form', 'leave-status']}
              />
            )}
            {activeTab === 'ot-status' && (
              <OvertimeStatus
                token={token}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                extraTabs={['leave-form', 'leave-status']}
              />
            )}
            {activeTab === 'leave-form' && (
              <LeaveForm
                token={token}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            )}
            {activeTab === 'leave-status' && (
              <LeaveStatus
                token={token}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            )}

    </div>
  );
};

export default CeoOvertimePage;
