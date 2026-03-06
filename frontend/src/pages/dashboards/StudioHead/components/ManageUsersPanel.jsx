import UserRow from './UserRow';
import EmptyState from './EmptyState';
import { CardSkeleton } from '../../../../components/SkeletonLoader';
import { Search } from 'lucide-react';

export default function ManageUsersPanel({
  searchTerm,
  setSearchTerm,
  usersLoading,
  usersError,
  userActionById,
  filteredUsers,
  onEditUser,
  onToggleUserStatus,
  onDeleteUser,
}) {
  return (
    <div className="bg-[#00273C]/60 rounded-xl border border-white/10 p-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF7120]" size={16} />
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white outline-none focus:border-[#FF7120]/50 focus:ring-1 focus:ring-[#FF7120]/50 transition placeholder:text-white/40"
          />
        </div>
        <button className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/40 font-semibold cursor-not-allowed w-full sm:w-auto shrink-0" disabled>
          Add Account
        </button>
      </div>

      <div className="flex flex-col gap-2 mt-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {usersLoading && (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        )}
        {usersError && <div className="text-red-400 text-sm">{usersError}</div>}

        {!usersLoading && !usersError && filteredUsers.length === 0 && (
          <EmptyState title="No users found" subtitle="Try searching by email or full name." />
        )}

        {!usersLoading && !usersError && filteredUsers.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            loading={!!userActionById?.[u.id]}
            onEditUser={onEditUser}
            onToggleUserStatus={onToggleUserStatus}
            onDeleteUser={onDeleteUser}
          />
        ))}
      </div>
    </div>
  );
}
