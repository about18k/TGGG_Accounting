import React from 'react';
import AttendanceDashboard from '../Public_Dashboard/AttendanceDashboard';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import CeoSidebar from './CeoSidebar';

const CeoAttendance = (props) => {
  const { onNavigate } = props;

  return (
    <AttendanceDashboard
      {...props}
      currentPage="attendance"
      NavComponent={PublicNavigation}
      sidebarComponent={<CeoSidebar currentPage="attendance" onNavigate={onNavigate} onLogout={props.onLogout} />}
    />
  );
};

export default CeoAttendance;
