import { UserCheck } from 'lucide-react';
import PendingUserCard from './PendingUserCard';
import EmptyState from './EmptyState';

// Registration queue for new studio users

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
  const pendingList = Array.isArray(pendingUsers) ? pendingUsers : [];
  const pendingCount = pendingList.length;

  return (
    <div className="flex flex-col gap-6">
      <style>
        {`
          @keyframes pulse-orange {
            0% { box-shadow: 0 0 0 0 rgba(255, 113, 32, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(255, 113, 32, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 113, 32, 0); }
          }
          .animate-pulse-orange {
            animation: pulse-orange 2s infinite;
          }
        `}
      </style>

      {/* Attention-Grabbing Indicator */}
      {!pendingLoading && pendingCount > 0 && (
        <div className="bg-[#FF7120]/10 border border-[#FF7120]/30 rounded-2xl p-6 flex items-center justify-between animate-pulse-orange">
          <div className="flex items-center gap-4">
            <div className="bg-[#FF7120] p-3 rounded-xl text-white">
              <UserCheck size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Action Required</h3>
              <p className="text-[#FF7120] text-sm font-medium">
                You have {pendingCount} new {pendingCount === 1 ? 'user' : 'users'} waiting for approval
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div className="bg-[#00273C]/60 rounded-xl border border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
             <UserCheck size={20} className="text-[#FF7120]" />
             <span className="text-white font-semibold">Registration Queue</span>
          </div>
          <p className="text-white/50 text-[10px] sm:text-xs">Review and verify new account access</p>
        </div>

        {pendingLoading && <div className="text-gray-400 text-sm py-4">Loading pending users...</div>}

        {!pendingLoading && pendingList.length === 0 && (
          <div className="py-10">
            <EmptyState title="No pending users" subtitle="All accounts are verified." />
          </div>
        )}

        {!pendingLoading && pendingList.length > 0 && (
          <div className="flex flex-col gap-3">
            {pendingList.map((u) => {
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
    </div>
  );
}
