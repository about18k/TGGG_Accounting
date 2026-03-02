import React from 'react';
import AttendanceDashboard from '../Public_Dashboard/AttendanceDashboard';
import CeoNavigation from './CeoNavigation';
import CeoSidebar from './CeoSidebar';

const CeoAttendance = (props) => {
  const { onNavigate } = props;

  return (
    <AttendanceDashboard
      {...props}
      currentPage="attendance"
      NavComponent={CeoNavigation}
      sidebarComponent={<CeoSidebar currentPage="attendance" onNavigate={onNavigate} onLogout={props.onLogout} />}
    />
  );
};

export default CeoAttendance;
