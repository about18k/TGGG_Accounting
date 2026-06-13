import React, { useState } from 'react';
import OvertimeForm from './OvertimeForm.jsx';
import OvertimeStatus from './OvertimeStatus.jsx';

const OvertimePage = ({ user, token, onLogout, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('ot-form');

  return (
    <div className="w-full relative animate-fade-in space-y-6">

      


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

    </div>
  );
};

export default OvertimePage;
