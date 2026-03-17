import { Clock, Mail, ShieldCheck, UserX } from 'lucide-react';

export default function PendingUserCard({
  user,
  role,
  onChangeRole,
  allowedRoles,
  onApprove,
  onDecline,
  approveLoading = false,
  declineLoading = false,
}) {
  const loading = approveLoading || declineLoading;

  return (
    <div className="bg-[#001f35] rounded-xl border border-white/5 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all hover:border-[#FF7120]/20 group">
      <div className="flex items-center gap-4 flex-1">
        <div className="h-12 w-12 rounded-full bg-[#FF7120]/10 flex items-center justify-center text-[#FF7120] font-bold border border-[#FF7120]/30 group-hover:border-[#FF7120]/50 transition-colors shrink-0">
          {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="text-white font-semibold text-base truncate">
            {user.first_name} {user.last_name}
          </div>
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <Mail size={12} className="text-[#FF7120]" />
              {user.email}
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <Clock size={12} className="text-[#FF7120]" />
              Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
        <div className="relative">
          <select
            value={role}
            onChange={(e) => onChangeRole(e.target.value)}
            className="w-full sm:w-48 bg-[#001425] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] appearance-none cursor-pointer"
          >
            {allowedRoles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        <button
          onClick={onApprove}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-[#FF7120]/10 border border-[#FF7120]/30 text-[#FF7120] px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#FF7120] hover:text-white transition-all disabled:opacity-50 whitespace-nowrap"
        >
          <ShieldCheck size={16} />
          {approveLoading ? 'Approving...' : 'Approve & Notify'}
        </button>

        <button
          onClick={onDecline}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 px-6 py-2 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 whitespace-nowrap"
        >
          <UserX size={16} />
          {declineLoading ? 'Declining...' : 'Decline'}
        </button>
      </div>
    </div>
  );
}
