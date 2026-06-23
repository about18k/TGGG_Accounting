import React, { useState } from 'react';
import OvertimeForm from '../components/overtime/OvertimeForm';
import OvertimeStatus from '../components/overtime/OvertimeStatus';

/**
 * Shared overtime page — used by ALL roles.
 * The sidebar is handled by DashboardLayout (parent).
 */
const OvertimePage = ({ user, token }) => {
  const [activeTab, setActiveTab] = useState('ot-form');

  const tabs = [
    'ot-form',
    'ot-status',
  ];

  return (
    <div className="w-full animate-fade-in space-y-6">
      {activeTab === 'ot-form' && (
        <OvertimeForm token={token} activeTab={activeTab} onTabChange={setActiveTab} extraTabs={tabs} />
      )}
      {activeTab === 'ot-status' && (
        <OvertimeStatus token={token} activeTab={activeTab} onTabChange={setActiveTab} extraTabs={tabs} />
      )}
    </div>
  );
};

export default OvertimePage;
