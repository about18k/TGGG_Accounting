import { styles, colors } from '../studioHeadStyles';

export default function DashboardHeader({ onLogout }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '28px' }}>Studio Head Control Center</h1>
        <p style={{ color: colors.textMuted, marginTop: '6px' }}>
          Approvals, reviews, coordination, and quality control.
        </p>
      </div>

      <button onClick={onLogout} style={styles.buttonPrimary}>
        Logout
      </button>
    </div>
  );
}
