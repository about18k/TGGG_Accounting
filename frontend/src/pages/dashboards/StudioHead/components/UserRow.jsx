
export default function UserRow({
  user,
  loading = false,
  onEditUser,
  onToggleUserStatus,
  onDeleteUser,
}) {
  const handleEdit = () => {
    const nextFirst = window.prompt('Edit first name', user.first_name || '');
    if (nextFirst === null) return;

    const nextLast = window.prompt('Edit last name', user.last_name || '');
    if (nextLast === null) return;

    onEditUser?.(user.id, {
      first_name: nextFirst.trim(),
      last_name: nextLast.trim(),
    });
  };

  const handleToggleStatus = () => {
    onToggleUserStatus?.(user.id, !user.is_active);
  };

  const handleDelete = () => {
    const confirmed = window.confirm(`Delete user ${user.email}? This cannot be undone.`);
    if (!confirmed) return;
    onDeleteUser?.(user.id);
  };

  return (
    <div
      className="bg-[#001f35] rounded-xl border border-white/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition hover:bg-white/5"
    >
      <div className="flex items-center gap-4 w-full sm:w-auto">
        {user.profile_picture ? (
          <img
            src={user.profile_picture}
            alt={user.first_name || user.email}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-[#FF7120]/30 shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FF7120]/10 flex items-center justify-center text-[#FF7120] font-bold text-sm sm:text-base border border-[#FF7120]/30 shrink-0"
          >
            {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-bold text-white truncate text-sm sm:text-base">
            {user.first_name} {user.last_name}
          </div>
          <div className="text-[#9CA3AF] text-xs sm:text-sm truncate">{user.email}</div>
          <div className="text-[#9CA3AF] text-xs mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 bg-white/5 rounded-md">{user.role_name || user.role || 'No role'}</span>
            <span className="px-1.5 py-0.5 bg-white/5 rounded-md">{user.department_name || 'No department'}</span>
            <span className={`px-1.5 py-0.5 rounded-md ${user.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {user.is_active ? 'Active' : 'Suspended'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
        <button
          onClick={handleEdit}
          disabled={loading}
          className="flex-1 sm:flex-none px-3 py-1.5 bg-[#1f3b53] border border-[#2c4d66] text-white text-xs sm:text-sm rounded-lg hover:bg-[#2c4d66] transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Edit
        </button>

        <button
          onClick={handleToggleStatus}
          disabled={loading}
          className={`flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm rounded-lg border transition disabled:opacity-60 disabled:cursor-not-allowed ${user.is_active
            ? 'bg-[#263a34] border-[#2f5c4f] text-[#d1fae5] hover:bg-[#2f5c4f]'
            : 'bg-[#1f3b53] border-[#2c4d66] text-[#dbeafe] hover:bg-[#2c4d66]'
            }`}
        >
          {user.is_active ? 'Suspend' : 'Activate'}
        </button>

        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex-1 sm:flex-none px-3 py-1.5 bg-[#3b1f24] border border-[#5f2a33] text-[#fecaca] text-xs sm:text-sm rounded-lg hover:bg-[#5f2a33] transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
