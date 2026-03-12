import { styles, colors } from '../studioHeadStyles';
import PendingUserCard from './PendingUserCard';
import EmptyState from './EmptyState';

export default function PendingApprovalsPanel({
  pendingUsers,
  pendingLoading,
  roleByUserId,
  setRoleByUserId,
  allowedRoles,
  approveUser,
  approvingUserId,
  declinePendingUser,
  decliningUserId,
}) {
  return (
    <div style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Pending User Approvals</h2>
        <span style={{ color: colors.textMuted, fontSize: '13px' }}>
          {pendingUsers.length} waiting
        </span>
      </div>

      {pendingLoading && <div style={{ color: colors.textMuted }}>Loading pending users...</div>}

      {!pendingLoading && pendingUsers.length === 0 && (
        <EmptyState title="No pending users" subtitle="All accounts are verified." />
      )}

      {!pendingLoading && pendingUsers.length > 0 && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pendingUsers.map((u) => {
            const userId = u?.id ?? u?.user_id ?? u?.userId;
            if (userId === null || userId === undefined || userId === '') return null;

            return (
              <PendingUserCard
                key={userId}
                user={u}
                role={roleByUserId[userId] || 'accounting'}
                onChangeRole={(val) => setRoleByUserId((prev) => ({ ...prev, [userId]: val }))}
                allowedRoles={allowedRoles}
                onApprove={() => approveUser(userId)}
                onDecline={() => declinePendingUser(userId)}
                approveLoading={approvingUserId === userId}
                declineLoading={decliningUserId === userId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
