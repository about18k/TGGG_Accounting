import React, { useState } from 'react';
import OvertimeForm from './OvertimeForm.jsx';
import OvertimeStatus from './OvertimeStatus.jsx';
import LeaveForm from './LeaveForm.jsx';
import LeaveStatus from './LeaveStatus.jsx';

const OvertimePage = ({ user, token, onLogout, onNavigate }) => {
  const isStudioHeadMode = user?.role === 'studio_head' || user?.role === 'admin';
  const isBimSpecialistMode = user?.role === 'bim_specialist';
  const showLeaveTabs = !isStudioHeadMode;
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
    transition: 'all 0.2s'
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
      


          
          

          <div className="">
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {renderTabButton('ot-form', 'Request Overtime')}
            {renderTabButton('ot-status', 'OT Status')}
            {showLeaveTabs && renderTabButton('leave-form', 'Request Leave')}
            {showLeaveTabs && renderTabButton('leave-status', 'Leave Status')}
          </div>

          {/* Content */}
          {activeTab === 'ot-form' && (
            <OvertimeForm token={token} />
          )}
          {activeTab === 'ot-status' && (
            <OvertimeStatus token={token} />
          )}
          {showLeaveTabs && activeTab === 'leave-form' && (
            <LeaveForm token={token} />
          )}
          {showLeaveTabs && activeTab === 'leave-status' && (
            <LeaveStatus token={token} />
          )}
          </div>

    </div>
  );
};

export default OvertimePage;
