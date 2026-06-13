import React, { useState } from 'react';
import OvertimeForm from '../Public_Dashboard/OvertimeForm.jsx';
import OvertimeStatus from '../Public_Dashboard/OvertimeStatus.jsx';

const StudioHeadOvertimePage = ({ user, token, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('ot-form');

  return (
    <div className="w-full relative animate-fade-in space-y-6">

      


            {activeTab === 'ot-form' && (
              <OvertimeForm
                token={token}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            )}
            {activeTab === 'ot-status' && (
              <OvertimeStatus
                token={token}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            )}

    </div>
  );
};

export default StudioHeadOvertimePage;
