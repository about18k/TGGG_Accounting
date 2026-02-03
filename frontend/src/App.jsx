import { useState } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardOverview } from './components/DashboardOverview';
import { EmployeeManagement } from './components/EmployeeManagement';
import { AttendanceLeave } from './components/AttendanceLeave';
import { PayrollManagement } from './components/PayrollManagement';
import { Settings } from './components/Settings';
import { AIAssistant } from './components/AIAssistant';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'employees':
        return <EmployeeManagement />;
      case 'attendance':
        return <AttendanceLeave />;
      case 'payroll':
        return <PayrollManagement />;
      case 'settings':
        return <Settings />;
      case 'ai-assistant':
        return <AIAssistant />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
