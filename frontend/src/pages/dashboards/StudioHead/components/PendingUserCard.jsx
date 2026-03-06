
export default function PendingUserCard({ user, role, onChangeRole, allowedRoles, onApprove, loading }) {
  return (
    <div className="bg-[#001f35] rounded-xl p-4 hover:bg-white/5 transition">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-bold text-white text-base">
            {user.first_name} {user.last_name}{' '}
            <span className="text-[#9CA3AF] font-normal text-sm break-all">({user.email})</span>
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Joined: {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto shrink-0 mt-3 sm:mt-0">
          <select
            value={role}
            onChange={(e) => onChangeRole(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-[#1a2332] border border-[#47545E] rounded-lg text-white text-sm outline-none focus:border-[#FF7120] transition"
          >
            {allowedRoles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <button
            onClick={onApprove}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-[#FF7120] hover:bg-[#ff8a47] text-white font-bold text-sm rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? 'Approving...' : 'Approve & Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
