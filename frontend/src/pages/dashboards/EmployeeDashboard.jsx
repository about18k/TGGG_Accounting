const departmentContent = {
  'Accounting Department': {
    title: 'Accounting Tools',
    items: ['Payroll Summary', 'Attendance Review', 'Overtime Approvals', 'Report Generator']
  },
  'Design Department': {
    title: 'Design Studio',
    items: ['Project Boards', 'Drawing Logs', 'Client Revisions', 'Asset Library']
  },
  'Engineering Department': {
    title: 'Engineering Hub',
    items: ['Site Reports', 'Technical Specs', 'QA Checklists', 'Issue Tracking']
  },
  'Planning Department': {
    title: 'Planning Suite',
    items: ['Schedules', 'Resource Allocation', 'Risk Logs', 'Progress Tracking']
  },
  'IT Department': {
    title: 'IT Operations',
    items: ['Access Requests', 'System Status', 'Support Tickets', 'Security Updates']
  }
};

function EmployeeDashboard({ user, departmentName, onLogout }) {
  const content = departmentContent[departmentName] || {
    title: 'Department Tools',
    items: ['Attendance', 'Overtime', 'Leave Requests', 'Profile Management']
  };

  return (
    <div style={{ backgroundColor: '#021B2C', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Employee Portal</h1>
          <p style={{ marginTop: '6px', color: '#9CA3AF' }}>{departmentName}</p>
        </div>
        <button onClick={onLogout} style={{ padding: '10px 20px', backgroundColor: '#FF7120', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>
      <div style={{ backgroundColor: '#003049', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
        <p>Welcome, {user.first_name} {user.last_name}</p>
        <p>Employee ID: {user.employee_id}</p>
        <p style={{ marginTop: '20px', color: '#9CA3AF' }}>Employee Portal Features:</p>
        <ul style={{ marginTop: '10px' }}>
          <li>Time & Attendance</li>
          <li>Overtime Requests</li>
          <li>Leave & Absence Filing</li>
          <li>Profile & Account Management</li>
        </ul>
      </div>
      <div style={{ backgroundColor: '#003049', padding: '20px', borderRadius: '12px' }}>
        <h2 style={{ marginTop: 0 }}>{content.title}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '12px' }}>
          {content.items.map((item) => (
            <div key={item} style={{ backgroundColor: '#002035', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EmployeeDashboard;
