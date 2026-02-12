import { colors } from '../studioHeadStyles';

export default function EmptyState({ title, subtitle }) {
  return (
    <div style={{ color: colors.textMuted, padding: '12px 0' }}>
      <div style={{ fontWeight: 700, color: 'white' }}>{title}</div>
      {subtitle && <div style={{ marginTop: '6px' }}>{subtitle}</div>}
    </div>
  );
}
