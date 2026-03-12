import { Users, Search, Plus } from 'lucide-react';
import UserRow from './UserRow';
import EmptyState from './EmptyState';

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="bg-[#002035] rounded-xl p-6 border border-white/5 flex flex-col items-center justify-center gap-2">
      <div className="text-3xl font-bold text-[#FF7120] flex items-center gap-2">
        {value}
      </div>
      <div className="text-sm text-[#FF7120] font-medium flex items-center gap-2">
        <Icon size={16} />
        {title}
      </div>
    </div>
  );
}

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
  const totalUsers = filteredUsers.length;
  const activeUsers = filteredUsers.filter(u => u.is_active).length;
  const suspendedUsers = totalUsers - activeUsers;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Users" value={totalUsers} icon={Users} />
        <StatCard title="Active" value={activeUsers} icon={Users} />
        <StatCard title="Suspended" value={suspendedUsers} icon={Users} />
      </div>

      {/* Main Panel */}
      <div className="bg-[#00273C]/60 rounded-xl border border-white/10 p-6">
        <div className="flex justify-end items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FF7120]" size={16} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#001f35] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] w-64"
              />
            </div>
            <button 
              className="flex items-center gap-2 bg-[#FF7120] hover:bg-[#ff853e] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors opacity-60 cursor-not-allowed"
              disabled
            >
              <Plus size={16} />
              Add Account
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar manage-users-list">
          <style>
            {`
              .manage-users-list::-webkit-scrollbar {
                display: none;
              }
              .manage-users-list {
                scrollbar-width: none;
                -ms-overflow-style: none;
              }
            `}
          </style>

          {usersLoading && <div className="text-gray-400 text-sm py-4">Loading users...</div>}
          {usersError && <div className="text-red-400 text-sm py-4">{usersError}</div>}

          {!usersLoading && !usersError && filteredUsers.length === 0 && (
            <div className="py-10">
              <EmptyState title="No users found" subtitle="Try searching by email or full name." />
            </div>
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
    </div>
  );
}
