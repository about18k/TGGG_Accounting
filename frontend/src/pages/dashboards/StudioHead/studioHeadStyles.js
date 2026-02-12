export const colors = {
  pageBg: '#021B2C',
  panel: '#003049',
  panel2: '#002035',
  borderSoft: 'rgba(255,255,255,0.06)',
  textMuted: '#9CA3AF',
  orange: '#FF7120',
};

export const styles = {
  page: {
    backgroundColor: colors.pageBg,
    color: 'white',
    minHeight: '100vh',
    padding: '24px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 1fr',
    gap: '20px',
  },
  panel: {
    backgroundColor: colors.panel,
    padding: '20px',
    borderRadius: '14px',
    border: `1px solid ${colors.borderSoft}`,
  },
  panel2: {
    backgroundColor: colors.panel2,
    padding: '14px',
    borderRadius: '10px',
    border: `1px solid ${colors.borderSoft}`,
  },
  buttonPrimary: {
    padding: '10px 20px',
    backgroundColor: colors.orange,
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    backgroundColor: colors.panel2,
    border: '1px solid #47545E',
    borderRadius: '8px',
    color: 'white',
    outline: 'none',
  },
  buttonGhost: {
    padding: '10px 14px',
    backgroundColor: '#1f3b53',
    border: '1px solid #2c4d66',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
