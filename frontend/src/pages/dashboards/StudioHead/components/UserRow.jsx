import { Crown, Mail, Briefcase } from 'lucide-react';

export default function UserRow({
  user,
  loading = false,
  onEditUser,
  onToggleUserStatus,
  onDeleteUser,
}) {
  const handleEdit = () => onEditUser?.(user);
  const handleToggleStatus = () => onToggleUserStatus?.(user.id, !user.is_active);
  const handleDelete = () => onDeleteUser?.(user);

  const startedDate = user.date_hired || 'Not set';

  return (
    <div className="bg-[#001f35] rounded-xl border border-white/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-white/10 group">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {user.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={user.first_name || user.email}
              className="h-11 w-11 rounded-full object-cover border border-[#FF7120]/30 group-hover:border-[#FF7120]/50 transition-colors"
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-[#FF7120]/10 flex items-center justify-center text-[#FF7120] font-bold border border-[#FF7120]/30 group-hover:border-[#FF7120]/50 transition-colors">
              {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </div>
          )}
          {user.is_leader && (
            <div className="absolute -top-1 -right-1 bg-[#FF7120] text-white p-0.5 rounded-full border-2 border-[#001f35]">
              <Crown size={8} />
            </div>
          )}
        </div>
 
        <div className="min-w-0">
          <div className="text-white font-semibold text-[15px] flex flex-wrap items-center gap-2">
            {user.first_name} {user.last_name}
            {!user.is_active && (
              <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">
                Suspended
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-0.5">
            <div className="flex items-center gap-1.5 text-gray-400 text-[10px] sm:text-xs truncate max-w-[150px] sm:max-w-none">
              <Mail size={12} className="text-[#FF7120]" />
              {user.email}
            </div>
            <div className="flex items-center gap-1.5 text-[#FF7120]/80 text-[10px] sm:text-xs font-medium bg-[#FF7120]/5 px-2 py-0.5 rounded">
              <Briefcase size={12} className="text-[#FF7120]" />
              <span className="capitalize">{user.role_name || user.role?.replace('_', ' ') || 'No role'}</span>
            </div>
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '12px' }}>
            Started: {startedDate}
          </div>
        </div>
      </div>
 
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          onClick={handleEdit}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-[#FF7120]/10 border border-[#FF7120]/20 text-[#FF7120] text-xs font-medium hover:bg-[#FF7120] hover:text-white transition-all disabled:opacity-50"
        >
          Edit
        </button>
 
        <button
          onClick={handleToggleStatus}
          disabled={loading}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-50 ${
            user.is_active 
              ? 'bg-[#FF7120]/5 border-[#FF7120]/10 text-[#FF7120]/60 hover:text-[#FF7120] hover:bg-[#FF7120]/10 hover:border-[#FF7120]/30'
              : 'bg-[#FF7120]/10 border-[#FF7120]/20 text-[#FF7120] hover:bg-[#FF7120] hover:text-white'
          }`}
        >
          {user.is_active ? 'Suspend' : 'Activate'}
        </button>
 
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-[#FF7120]/10 border border-[#FF7120]/20 text-[#FF7120] text-xs font-medium hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
