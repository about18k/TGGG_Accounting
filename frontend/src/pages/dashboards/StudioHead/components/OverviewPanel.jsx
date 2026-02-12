import { styles, colors } from '../studioHeadStyles';

function StatCard({ title, value, hint }) {
  return (
    <div style={{ ...styles.panel2, padding: '16px' }}>
      <div style={{ fontSize: '12px', color: colors.textMuted }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px' }}>{value}</div>
      {hint && <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px' }}>{hint}</div>}
    </div>
  );
}

function ActionCard({ title, desc }) {
  return (
    <div style={{ ...styles.panel2, padding: '16px' }}>
      <div style={{ fontWeight: 800 }}>{title}</div>
      <div style={{ color: colors.textMuted, marginTop: '8px', fontSize: '13px', lineHeight: 1.4 }}>
        {desc}
      </div>
    </div>
  );
}

export default function OverviewPanel({ pendingCount = 0 }) {
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Today at a glance</h2>
            <p style={{ color: colors.textMuted, marginTop: '8px' }}>
              Keep projects aligned to design standards, codes, and client expectations.
            </p>
          </div>
          <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
            Role: Studio Head
          </div>
        </div>

        <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
          <StatCard title="Pending Approvals" value={pendingCount} hint="Accounts waiting verification" />
          <StatCard title="Reviews Queue" value="—" hint="Hook your drawings/review module later" />
          <StatCard title="Open Site Queries" value="—" hint="For coordination with site team" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={styles.panel}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Design Leadership</h2>
          <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
            <ActionCard
              title="Lead the architectural design team"
              desc="Assign priorities, review outputs, and guide concept development across projects."
            />
            <ActionCard
              title="Oversee concepts + technical outputs"
              desc="Ensure plans, drawings, and presentations follow your office standards and technical requirements."
            />
          </div>
        </div>

        <div style={styles.panel}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Quality & Coordination</h2>
          <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
            <ActionCard
              title="Quality control across all projects"
              desc="Run checklist-based QA for drawings, documentation, and client deliverables."
            />
            <ActionCard
              title="Coordinate design ↔ site ↔ management"
              desc="Track handoffs, RFIs, revisions, and approvals so execution matches design intent."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
