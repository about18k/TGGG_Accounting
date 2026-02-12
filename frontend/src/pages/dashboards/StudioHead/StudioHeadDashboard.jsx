import DashboardHeader from './components/DashboardHeader';
import DashboardTabs from './components/DashboardTabs';
import MessageBanner from './components/MessageBanner';
import OverviewPanel from './components/OverviewPanel';
import PendingApprovalsPanel from './components/PendingApprovalsPanel';
import ManageUsersPanel from './components/ManageUsersPanel';

import { styles } from './studioHeadStyles';
import { useStudioHeadDashboard } from './hooks/useStudioHeadDashboard';

export default function StudioHeadDashboard({ user, onLogout }) {
  const {
    activeTab,
    setActiveTab,
    message,
    setMessage,

    pendingUsers,
    pendingLoading,
    roleByUserId,
    setRoleByUserId,
    allowedRoles,
    approveUser,
    loadingApprove,

    usersLoading,
    usersError,
    searchTerm,
    setSearchTerm,
    filteredUsers,
  } = useStudioHeadDashboard();

  return (
    <div style={styles.page}>
      <DashboardHeader onLogout={onLogout} />

      <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <MessageBanner message={message} onClose={() => setMessage('')} />

      {/* Tabs */}
      {activeTab === 'overview' && (
        <OverviewPanel pendingCount={pendingUsers.length} />
      )}

      {activeTab === 'approvals' && (
        <PendingApprovalsPanel
          pendingUsers={pendingUsers}
          pendingLoading={pendingLoading}
          roleByUserId={roleByUserId}
          setRoleByUserId={setRoleByUserId}
          allowedRoles={allowedRoles}
          approveUser={approveUser}
          loadingApprove={loadingApprove}
        />
      )}

      {activeTab === 'users' && (
        <ManageUsersPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          usersLoading={usersLoading}
          usersError={usersError}
          filteredUsers={filteredUsers}
        />
      )}

      {/* Placeholder tabs (design-ready) */}
      {activeTab === 'reviews' && (
        <div style={styles.panel}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Design Reviews</h2>
          <p style={{ color: '#9CA3AF', marginTop: '8px' }}>
            Queue for drawings, presentations, and documentation review (connect your projects module here).
          </p>
        </div>
      )}

      {activeTab === 'coordination' && (
        <div style={styles.panel}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Coordination</h2>
          <p style={{ color: '#9CA3AF', marginTop: '8px' }}>
            Handoffs between design, site, and management teams (RFIs, revisions, approvals).
          </p>
        </div>
      )}
    </div>
  );
}
