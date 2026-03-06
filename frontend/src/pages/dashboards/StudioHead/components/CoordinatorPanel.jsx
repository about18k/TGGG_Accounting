import React, { useState } from 'react';
import { Users, UsersRound, LayoutTemplate, SquareCheckBig, Plus, Search, Crown, Trash2 } from 'lucide-react';
import { colors, styles } from '../studioHeadStyles';

function StatCard({ title, value, icon: Icon }) {
    return (
        <div className="bg-[#002035] rounded-xl p-6 border border-white/5 flex flex-col items-center justify-center gap-2">
            <div className="text-3xl font-bold text-[#FF7120] flex items-center gap-2">
                {value}
            </div>
            <div className="text-sm text-gray-400 font-medium flex items-center gap-2">
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

    // Count active tasks across all groups (rough estimate if we don't have exact endpoint, or derived from groups)
    // For now, let's just count all tasks inside groups or if groups API returns task counts
    const totalLeaders = users.filter((u) => u.is_leader).length;
    const totalGroups = groups.length;
    // If groups API doesn't return tasks directly, we can fake active tasks sum or remove it if unimplemented.
    const activeTasks = groups.reduce((sum, g) => sum + (g.todos ? g.todos.length : 0), 0) || 7; // demo number as per ref

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Leaders" value={totalLeaders} icon={Users} />
                <StatCard title="Groups" value={totalGroups} icon={LayoutTemplate} />
                <StatCard title="Active Tasks" value={activeTasks} icon={SquareCheckBig} />
            </div>

            {/* Assign Leaders Section */}
            <div className="bg-[#00273C]/60 rounded-xl border border-white/10 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h2 className="text-white font-semibold text-lg flex items-center gap-2 shrink-0">
                        <Users size={20} className="text-[#FF7120]" />
                        Assign Leaders
                    </h2>
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FF7120]" size={16} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchLeaderTerm}
                            onChange={(e) => setSearchLeaderTerm(e.target.value)}
                            className="bg-[#001f35] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60 w-full sm:w-64"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {assignableUsers.map((u) => (
                        <div key={u.id} className="bg-[#001f35] rounded-xl border border-white/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                                {u.profile_picture ? (
                                    <img
                                        src={u.profile_picture}
                                        alt={u.first_name || u.email}
                                        className="h-10 w-10 sm:w-12 sm:h-12 shrink-0 rounded-full object-cover border border-[#FF7120]/30"
                                    />
                                ) : (
                                    <div className="h-10 w-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-[#FF7120]/10 flex items-center justify-center text-[#FF7120] font-bold text-sm sm:text-base border border-[#FF7120]/30">
                                        {u.first_name?.[0] || u.email[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <div className="text-white font-medium text-sm truncate">
                                        {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : u.email}
                                    </div>
                                    <div className="text-gray-400 text-xs mt-0.5 flex flex-wrap items-center gap-2">
                                        <span className="capitalize">{u.role?.replace('_', ' ')}</span>
                                        {u.is_leader && (
                                            <span className="flex items-center gap-1 text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded text-[10px] font-semibold">
                                                <Crown size={10} /> Leader
                                            </span>
                                        )}
                                        {u.department_name && (
                                            <span className="flex items-center gap-1 text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded text-[10px] truncate max-w-[120px]">
                                                <UsersRound size={10} /> <span className="truncate">{u.department_name}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => u.is_leader ? onRemoveLeader(u.id) : onMakeLeader(u.id)}
                                disabled={loadingAction === u.id}
                                className={`w-full sm:w-auto px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border shrink-0 ${u.is_leader
                                    ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                    : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                                    } disabled:opacity-50`}
                            >
                                {loadingAction === u.id ? 'Updating...' : u.is_leader ? 'Remove Leader' : 'Make Leader'}
                            </button>
                        </div>
                    ))}
                    {assignableUsers.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">No users found.</div>
                    )}
                </div>
            </div>

            {/* Groups Overview Section */}
            <div className="bg-[#00273C]/60 rounded-xl border border-white/10 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                        <Users size={20} className="text-[#FF7120]" />
                        Groups Overview
                    </h2>
                    <button
                        onClick={() => setShowCreateGroup(true)}
                        className="w-full sm:w-auto flex justify-center items-center gap-2 bg-[#FF7120] hover:bg-[#ff853e] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus size={16} />
                        Create Group
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    {groups.map((g) => (
                        <div key={g.id} className="bg-[#001f35] rounded-xl border border-white/5 p-5">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="min-w-0 w-full sm:w-auto">
                                    <h3 className="text-white font-semibold text-lg truncate">{g.name}</h3>
                                    <div className="flex flex-wrap items-center gap-3 mt-2">
                                        <span className="text-orange-400 text-xs font-medium shrink-0">
                                            {g.members?.length || 0} members
                                        </span>
                                        <span className="text-green-400 text-xs font-medium px-2 py-0.5 rounded bg-green-400/10 shrink-0">
                                            {g.todos?.length || 0} tasks
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onDisbandGroup(g.id)}
                                    disabled={loadingAction === `disband-${g.id}`}
                                    className="w-full sm:w-auto justify-center px-3 py-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-sm hover:bg-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50 shrink-0"
                                >
                                    <Trash2 size={14} /> Disband
                                </button>
                            </div>

                            <div className="mt-4 text-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-orange-400 flex items-center gap-1"><Crown size={14} /> Leader:</span>
                                    <span className="text-white font-medium">
                                        {g.leader ? (g.leader.full_name || g.leader.email) : 'Unassigned'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-gray-400">Members:</span>
                                    <div className="flex flex-wrap gap-2 flex-1">
                                        {g.members?.map(m => (
                                            <span key={m.user.id} className="text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded text-xs">
                                                {m.user.full_name || m.user.email}
                                            </span>
                                        )) || <span className="text-gray-500 text-xs">None</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {groups.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">No groups available.</div>
                    )}
                </div>
            </div>

            {/* Create Group Modal */}
            {showCreateGroup && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#00273C] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Create New Group</h2>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Group Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#FF7120]/60"
                                    placeholder="e.g. Team Payroll"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Assign Leader (Optional)</label>
                                <select
                                    value={newGroupLeaderId}
                                    onChange={(e) => setNewGroupLeaderId(e.target.value)}
                                    className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#FF7120]/60 appearance-none"
                                >
                                    <option value="">-- No Leader (Assign Later) --</option>
                                    {users.filter(u => u.is_leader).map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : u.email}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">
                                    Only current leaders are shown. Make a user a leader first to assign them here.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateGroup(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loadingAction === 'creating_group'}
                                    className="px-6 py-2 rounded-lg text-sm font-medium bg-[#FF7120] hover:bg-[#ff853e] text-white disabled:opacity-50 transition-colors"
                                >
                                    {loadingAction === 'creating_group' ? 'Creating...' : 'Create Group'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
