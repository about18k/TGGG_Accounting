import PendingUserCard from './PendingUserCard';
import EmptyState from './EmptyState';
import { CardSkeleton } from '../../../../components/SkeletonLoader';

export default function PendingApprovalsPanel({
  pendingUsers,
  pendingLoading,
  roleByUserId,
  setRoleByUserId,
  allowedRoles,
  approveUser,
  approvingUserId,
}) {
  return (
    <div className="bg-[#00273C]/60 rounded-xl border border-white/10 p-6">

      {pendingLoading && (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!pendingLoading && pendingUsers.length === 0 && (
        <EmptyState title="No pending users" subtitle="All accounts are verified." />
      )}

      {!pendingLoading && pendingUsers.length > 0 && (
        <div className="flex flex-col gap-3 mt-4">
          {pendingUsers.map((u) => (
            <PendingUserCard
              key={u.id}
              user={u}
              role={roleByUserId[u.id] || 'accounting'}
              onChangeRole={(val) => setRoleByUserId((prev) => ({ ...prev, [u.id]: val }))}
              allowedRoles={allowedRoles}
              onApprove={() => approveUser(u.id)}
              loading={approvingUserId === u.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
