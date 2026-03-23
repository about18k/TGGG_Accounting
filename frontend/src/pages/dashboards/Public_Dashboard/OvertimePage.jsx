import React, { useState } from 'react';
import OvertimeForm from './OvertimeForm.jsx';
import OvertimeStatus from './OvertimeStatus.jsx';
import LeaveForm from './LeaveForm.jsx';
import LeaveStatus from './LeaveStatus.jsx';
import PublicNavigation from './PublicNavigation';
import StudioHeadSidebar from '../StudioHead/components/StudioHeadSidebar';
import BimSpecialistSidebar from '../BimSpecialist/components/BimSpecialistSidebar';

const OvertimePage = ({ user, token, onLogout, onNavigate }) => {
  const isStudioHeadMode = user?.role === 'studio_head' || user?.role === 'admin';
  const isBimSpecialistMode = user?.role === 'bim_specialist';
  const useSidebarLayout = isStudioHeadMode || isBimSpecialistMode;
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
    <div className="min-h-screen" style={{ background: '#00273C' }}>
      <PublicNavigation onNavigate={onNavigate} currentPage="overtime" user={user} />

      <div className="pt-40 sm:pt-28 px-3 lg:px-6 pb-6 w-full">
        <div className={useSidebarLayout ? "max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6" : "max-w-[1400px] mx-auto px-2 sm:px-10 space-y-4 sm:space-y-8"}>
          {isStudioHeadMode && (
            <aside className="hidden lg:block lg:w-64 lg:shrink-0">
              <StudioHeadSidebar currentPage="overtime" onNavigate={onNavigate} />
            </aside>
          )}
          {isBimSpecialistMode && (
            <aside className="w-64 shrink-0 hidden lg:block">
              <BimSpecialistSidebar currentPage="overtime" onNavigate={onNavigate} />
            </aside>
          )}

          <div className={useSidebarLayout ? "flex-1 min-w-0 space-y-4 sm:space-y-8" : ""}>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {renderTabButton('ot-form', 'Request Overtime')}
            {renderTabButton('ot-status', 'OT Status')}
            {renderTabButton('leave-form', 'Request Leave')}
            {renderTabButton('leave-status', 'Leave Status')}
          </div>

          {/* Content */}
          {activeTab === 'ot-form' && (
            <OvertimeForm token={token} />
          )}
          {activeTab === 'ot-status' && (
            <OvertimeStatus token={token} />
          )}
          {activeTab === 'leave-form' && (
            <LeaveForm token={token} />
          )}
          {activeTab === 'leave-status' && (
            <LeaveStatus token={token} />
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OvertimePage;
