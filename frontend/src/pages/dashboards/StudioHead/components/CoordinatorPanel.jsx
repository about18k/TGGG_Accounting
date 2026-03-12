import React, { useState } from 'react';
import { Users, UsersRound, LayoutTemplate, SquareCheckBig, Plus, Search, Crown, Trash2 } from 'lucide-react';

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

export default function CoordinatorPanel({
    users,
    groups,
    onMakeLeader,
    onRemoveLeader,
    onCreateGroup,
    onDisbandGroup,
    loadingAction,
}) {
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupLeaderId, setNewGroupLeaderId] = useState('');
    const [searchLeaderTerm, setSearchLeaderTerm] = useState('');

    const totalLeaders = users.filter((u) => u.is_leader).length;
    const totalGroups = groups.length;
    const activeTasks = groups.reduce((sum, g) => sum + (g.todos ? g.todos.length : 0), 0) || 7;

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        const success = await onCreateGroup({
            name: newGroupName,
            leader_id: newGroupLeaderId || null
        });
        if (success) {
            setShowCreateGroup(false);
            setNewGroupName('');
            setNewGroupLeaderId('');
        }
    };

    const assignableUsers = users.filter(u => {
        const term = searchLeaderTerm.toLowerCase();
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase();
        return name.includes(term) || (u.email && u.email.toLowerCase().includes(term));
    });

    return (
        <div className="flex flex-col gap-6">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Leaders" value={totalLeaders} icon={Users} />
                <StatCard title="Groups" value={totalGroups} icon={LayoutTemplate} />
                <StatCard title="Active Tasks" value={activeTasks} icon={SquareCheckBig} />
            </div>

            {/* Assign Leaders Section */}
            <div className="bg-[#00273C]/60 rounded-xl border border-white/10 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Users size={20} className="text-[#FF7120]" />
                        <h2 className="text-white font-semibold text-lg">Assign Team Leaders</h2>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FF7120]" size={16} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchLeaderTerm}
                            onChange={(e) => setSearchLeaderTerm(e.target.value)}
                            className="bg-[#001f35] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] w-full transition-all"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-2 manage-users-list">
                    <style>
                        {`.manage-users-list { scrollbar-width: none; -ms-overflow-style: none; } .manage-users-list::-webkit-scrollbar { display: none; }`}
                    </style>
                    {assignableUsers.map((u) => (
                        <div key={u.id} className="bg-[#001f35] rounded-xl border border-white/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-[#FF7120]/20 group">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-[#FF7120]/10 flex items-center justify-center text-[#FF7120] font-bold border border-[#FF7120]/30 transition-colors group-hover:border-[#FF7120]/50 shrink-0">
                                    {u.first_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-white font-semibold text-sm truncate">
                                        {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : u.email}
                                    </div>
                                    <div className="text-gray-400 text-[11px] mt-0.5 flex flex-wrap items-center gap-2 lowercase">
                                        <span className="bg-[#001f35] px-1.5 py-0.5 rounded border border-white/10 truncate font-medium">{u.role?.replace('_', ' ')}</span>
                                        {u.is_leader && (
                                            <span className="flex items-center gap-1 text-[#FF7120] bg-[#FF7120]/10 px-1.5 py-0.5 rounded border border-[#FF7120]/20 font-bold uppercase tracking-tight text-[9px]">
                                                <Crown size={8} /> Leader
                                            </span>
                                        )}
                                        {u.department_name && (
                                            <span className="flex items-center gap-1 text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20 uppercase tracking-tight text-[9px]">
                                                <UsersRound size={8} /> {u.department_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => u.is_leader ? onRemoveLeader(u.id) : onMakeLeader(u.id)}
                                disabled={loadingAction === u.id}
                                className={`w-full sm:w-auto px-5 py-1.5 rounded-lg text-xs font-bold transition-all border ${u.is_leader
                                    ? 'border-red-500/30 text-red-500 hover:bg-red-500/10'
                                    : 'border-[#FF7120]/30 text-[#FF7120] hover:bg-[#FF7120]/10'
                                    } disabled:opacity-50 whitespace-nowrap`}
                            >
                                {loadingAction === u.id ? 'Updating...' : u.is_leader ? 'Remove Leader' : 'Make Leader'}
                            </button>
                        </div>
                    ))}
                    {assignableUsers.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-sm italic">No users matching search found.</div>
                    )}
                </div>
            </div>

            {/* Groups Overview Section */}
            <div className="bg-[#00273C]/60 rounded-xl border border-white/10 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <LayoutTemplate size={20} className="text-[#FF7120]" />
                        <h2 className="text-white font-semibold text-lg">Studio Groups</h2>
                    </div>
                    <button
                        onClick={() => setShowCreateGroup(true)}
                        className="flex items-center gap-2 bg-[#FF7120] hover:bg-[#ff853e] text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-[#FF7120]/10"
                    >
                        <Plus size={16} />
                        New Group
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {groups.map((g) => (
                        <div key={g.id} className="bg-[#001f35] rounded-xl border border-white/5 p-5 transition-all hover:border-[#FF7120]/20 flex flex-col gap-4 group">
                            <div className="flex justify-between items-start gap-4">
                                <div className="min-w-0">
                                    <h3 className="text-white font-bold text-[17px] truncate leading-tight group-hover:text-[#FF7120] transition-colors">{g.name}</h3>
                                    <div className="flex items-center gap-x-3 gap-y-1 mt-2 flex-wrap">
                                        <div className="flex items-center gap-1.5 text-xs text-[#FF7120]/80 font-semibold bg-[#FF7120]/5 px-2 py-0.5 rounded border border-[#FF7120]/10">
                                            <Users size={12} />
                                            {g.members?.length || 0} Members
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-green-400 font-semibold bg-green-400/5 px-2 py-0.5 rounded border border-green-400/10">
                                            <SquareCheckBig size={12} />
                                            {g.todos?.length || 0} Tasks
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onDisbandGroup(g.id)}
                                    disabled={loadingAction === `disband-${g.id}`}
                                    className="p-2.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 shrink-0"
                                    title="Disband Group"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="pt-4 border-t border-white/5 space-y-3">
                                <div className="flex items-center justify-between gap-3 bg-[#00273C]/40 px-3 py-2 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-2 text-xs text-[#FF7120]/60 font-bold uppercase tracking-wider">
                                        <Crown size={12} /> Leader
                                    </div>
                                    <span className="text-white font-bold text-xs truncate">
                                        {g.leader ? (g.leader.full_name || g.leader.email) : 'Unassigned'}
                                    </span>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider pl-1">Members List</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {g.members?.length > 0 ? g.members.map(m => (
                                            <span key={m.user.id} className="text-blue-400/80 bg-blue-400/5 border border-blue-400/10 px-2 py-0.5 rounded text-[10px] font-medium transition-all hover:bg-blue-400/10 hover:text-blue-300">
                                                {m.user.full_name || m.user.email}
                                            </span>
                                        )) : <span className="text-gray-600 text-[10px] italic pl-1">No members assigned yet</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {groups.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-400 text-sm bg-[#001f35]/30 rounded-2xl border border-dashed border-white/5 font-medium italic">No groups have been created yet.</div>
                    )}
                </div>
            </div>

            {/* Create Group Modal */}
            {showCreateGroup && (
                <div className="fixed inset-0 z-50 bg-[#001425]/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#00273C] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-[#FF7120]/5 px-6 py-5 border-b border-[#FF7120]/10 flex items-center gap-3">
                            <Plus className="text-[#FF7120]" size={20} />
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Create New Group</h2>
                        </div>
                        <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-[#FF7120]/60 uppercase tracking-widest ml-1 mb-2">Group Identifier</label>
                                <input
                                    type="text"
                                    required
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="w-full bg-[#001f35] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF7120] transition-all placeholder:text-gray-600"
                                    placeholder="e.g. Creative Payroll"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-[#FF7120]/60 uppercase tracking-widest ml-1 mb-2">Designate Leader</label>
                                <div className="relative">
                                    <select
                                        value={newGroupLeaderId}
                                        onChange={(e) => setNewGroupLeaderId(e.target.value)}
                                        className="w-full bg-[#001f35] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF7120] appearance-none cursor-pointer transition-all"
                                    >
                                        <option value="">-- No Leader (Assign Later) --</option>
                                        {users.filter(u => u.is_leader).map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : u.email}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#FF7120]">
                                        <UsersRound size={16} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2 ml-1 italic">
                                    Only existing leaders are eligible for group designation.
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateGroup(false)}
                                    className="px-5 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-all hover:bg-white/5"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={loadingAction === 'creating_group'}
                                    className="px-7 py-2.5 rounded-lg text-xs font-bold bg-[#FF7120] hover:bg-[#ff853e] text-white disabled:opacity-50 transition-all shadow-lg shadow-[#FF7120]/20"
                                >
                                    {loadingAction === 'creating_group' ? 'Provisioning...' : 'Provision Group'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
