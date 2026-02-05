const departmentContent = {
  'Accounting Department': {
    title: 'Accounting Intern Tasks',
    items: ['Daily Time Log', 'Document Filing', 'Payroll Support', 'Report Drafts']
  },
  'Design Department': {
    title: 'Design Intern Tasks',
    items: ['Draft Updates', 'Material Lists', 'Site Photo Logs', 'Revision Notes']
  },
  'Engineering Department': {
    title: 'Engineering Intern Tasks',
    items: ['Checklist Review', 'Site Measurements', 'Issue Logs', 'QA Notes']
  },
  'Planning Department': {
    title: 'Planning Intern Tasks',
    items: ['Schedule Updates', 'Meeting Minutes', 'Progress Logs', 'Risk Notes']
  },
  'IT Department': {
    title: 'IT Intern Tasks',
    items: ['Ticket Triage', 'Asset Inventory', 'Access Requests', 'System Notes']
  }
};

function InternDashboard({ user, departmentName, onLogout }) {
  const content = departmentContent[departmentName] || {
    title: 'Intern Tasks',
    items: ['Daily Attendance', 'OJT Hours', 'Supervisor Feedback', 'Profile Updates']
  };

  return (
    <div style={{ backgroundColor: '#021B2C', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Intern Portal</h1>
          <p style={{ marginTop: '6px', color: '#9CA3AF' }}>{departmentName}</p>
        </div>
        <button onClick={onLogout} style={{ padding: '10px 20px', backgroundColor: '#FF7120', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>
      <div style={{ backgroundColor: '#003049', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
        <p>Welcome, {user.first_name} {user.last_name}</p>
        <p>Intern ID: {user.employee_id}</p>
        <p style={{ marginTop: '20px', color: '#9CA3AF' }}>Intern Portal Features:</p>
        <ul style={{ marginTop: '10px' }}>
          <li>Daily Attendance</li>
          <li>OJT Hour Tracking</li>
          <li>Supervisor Feedback</li>
          <li>Account & Profile Updates</li>
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

export default InternDashboard;
