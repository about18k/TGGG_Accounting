import React from 'react';
import AttendanceDashboard from '../Public_Dashboard/AttendanceDashboard';

// Minimal nav placeholder to hide global nav when embedded inside Accounting layout
const BlankNav = () => null;

export default function AccountingPersonalAttendance(props) {
  return (
    <AttendanceDashboard
      {...props}
      embedded={true}
      currentPage="personal-attendance"
    />
  );
}
