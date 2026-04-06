import React, { useState } from 'react';
import OvertimeForm from './OvertimeForm.jsx';
import OvertimeStatus from './OvertimeStatus.jsx';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import InternSidebar from './components/InternSidebar';

const OvertimePage = ({ user, token, onLogout, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('ot-form');

  return (
    <div className="min-h-screen bg-[#00273C] relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="overtime" user={user} />

      <div className="relative pt-28 px-3 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex gap-6">
          <aside className="w-64 shrink-0 hidden lg:block">
            <InternSidebar currentPage="overtime" onNavigate={onNavigate} />
          </aside>

          <main className="flex-1 min-w-0">
            {activeTab === 'ot-form' ? (
              <OvertimeForm
                token={token}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            ) : (
              <OvertimeStatus
                token={token}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default OvertimePage;
