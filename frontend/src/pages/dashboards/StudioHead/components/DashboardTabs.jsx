const tabBtn = (active) => ({
  padding: '10px 12px',
  borderRadius: '10px',
  border: active ? '1px solid rgba(255,113,32,0.6)' : '1px solid rgba(255,255,255,0.10)',
  backgroundColor: active ? 'rgba(255,113,32,0.12)' : 'rgba(0,0,0,0.0)',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px',
});

export default function DashboardTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'approvals', label: 'User Approvals' },
    { key: 'users', label: 'Manage Users' },
    { key: 'reviews', label: 'Design Reviews' },         // placeholder UI
    { key: 'coordination', label: 'Coordination' },      // placeholder UI
  ];

  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setActiveTab(t.key)}
          style={tabBtn(activeTab === t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
