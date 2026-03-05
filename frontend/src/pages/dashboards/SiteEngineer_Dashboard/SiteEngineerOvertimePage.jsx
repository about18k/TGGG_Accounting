import React, { useState } from 'react';
import OvertimeForm from '../Public_Dashboard/OvertimeForm.jsx';
import OvertimeStatus from '../Public_Dashboard/OvertimeStatus.jsx';
import LeaveForm from '../Public_Dashboard/LeaveForm.jsx';
import LeaveStatus from '../Public_Dashboard/LeaveStatus.jsx';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import SiteEngineerSidebar from './components/SiteEngineerSidebar';

const SiteEngineerOvertimePage = ({ user, token, onNavigate }) => {
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
    <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="overtime" user={user} />

      <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex gap-6">
          <aside className="w-64 shrink-0 hidden lg:block">
            <SiteEngineerSidebar currentPage="overtime" onNavigate={onNavigate} />
          </aside>

          <main className="flex-1 min-w-0">
            <div className="rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)] p-4 sm:p-6">
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {renderTabButton('ot-form', 'Request Overtime')}
                {renderTabButton('ot-status', 'OT Status')}
                {renderTabButton('leave-form', 'Request Leave')}
                {renderTabButton('leave-status', 'Leave Status')}
              </div>

              {activeTab === 'ot-form' && <OvertimeForm token={token} />}
              {activeTab === 'ot-status' && <OvertimeStatus token={token} />}
              {activeTab === 'leave-form' && <LeaveForm token={token} />}
              {activeTab === 'leave-status' && <LeaveStatus token={token} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SiteEngineerOvertimePage;
