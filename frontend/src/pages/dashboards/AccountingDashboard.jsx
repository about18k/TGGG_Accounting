function AccountingDashboard({ user, onLogout }) {
  return (
    <div style={{ backgroundColor: '#021B2C', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Accounting Department</h1>
        <button onClick={onLogout} style={{ padding: '10px 20px', backgroundColor: '#FF7120', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>
      <div style={{ backgroundColor: '#003049', padding: '20px', borderRadius: '12px' }}>
        <p>Welcome, {user.first_name} {user.last_name}</p>
        <p>Employee ID: {user.employee_id}</p>
        <p style={{ marginTop: '20px', color: '#9CA3AF' }}>Accounting Module Features:</p>
        <ul style={{ marginTop: '10px' }}>
          <li>Chart of Accounts</li>
          <li>Journal Entries</li>
          <li>General Ledger</li>
          <li>Financial Reports</li>
        </ul>
      </div>
    </div>
  );
}

export default AccountingDashboard;
