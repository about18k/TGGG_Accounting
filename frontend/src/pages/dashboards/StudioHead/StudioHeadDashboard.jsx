import React, { useEffect } from 'react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import { Home, UserCheck, Users, FileText, GitMerge, Calendar } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import OverviewPanel from './components/OverviewPanel';
import PendingApprovalsPanel from './components/PendingApprovalsPanel';
import ManageUsersPanel from './components/ManageUsersPanel';
import CoordinatorPanel from './components/CoordinatorPanel';
import MessageBanner from './components/MessageBanner';
import StudioHeadSidebar from './components/StudioHeadSidebar';
import { useStudioHeadDashboard } from './hooks/useStudioHeadDashboard';
import EventsPanel from './components/EventsPanel';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'approvals', label: 'User Approvals', icon: UserCheck },
  { id: 'users', label: 'Manage Users', icon: Users },
  { id: 'reviews', label: 'Design Reviews', icon: FileText },
  { id: 'coordination', label: 'Coordinator Panel', icon: GitMerge },
  { id: 'events', label: 'Calendar / Events', icon: Calendar },
];

export default function StudioHeadDashboard({ user, onLogout, onNavigate }) {
  const location = useLocation();
  const {
    activeTab,
    setActiveTab,
    message,
    setMessage,
    pendingUsers,
    pendingLoading,
    roleByUserId,
    setRoleByUserId,
    allowedRoles,
    approveUser,
    approvingUserId,
    usersLoading,
    usersError,
    userActionById,
    searchTerm,
    setSearchTerm,
    filteredUsers,
    editUser,
    toggleUserStatus,
    removeUser,
    groups,
    groupsLoading,
    handleMakeLeader,
    handleRemoveLeader,
    handleCreateGroup,
    handleDisbandGroup,
  } = useStudioHeadDashboard();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedTab = params.get('tab');
    if (!requestedTab) return;
    if (TABS.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [location.search, setActiveTab]);

  const cardClass = "rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg";

  return (
    <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="studio-head" user={user} />

      <div className="relative pt-28 px-6 pb-10">
        <div className="max-w-[1600px] mx-auto">
          <MessageBanner message={message} onClose={() => setMessage('')} />

          <div className="flex gap-6">
            {/* Sidebar Navigation */}
            <aside className="w-64 shrink-0">
              <StudioHeadSidebar
                currentPage="studio-head"
                onNavigate={onNavigate}
                activeTab={activeTab}
                onSelectTab={setActiveTab}
              />
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <div className={cardClass}>
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <h1 className="text-2xl font-semibold text-white">
                    {TABS.find(t => t.id === activeTab)?.label || 'Studio Head Dashboard'}
                  </h1>
                  <p className="text-white/60 text-sm mt-1">Manage users, approvals, and team coordination</p>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'overview' && (
                    <OverviewPanel pendingCount={pendingUsers.length} />
                  )}

                  {activeTab === 'approvals' && (
                    <PendingApprovalsPanel
                      pendingUsers={pendingUsers}
                      pendingLoading={pendingLoading}
                      roleByUserId={roleByUserId}
                      setRoleByUserId={setRoleByUserId}
                      allowedRoles={allowedRoles}
                      approveUser={approveUser}
                      approvingUserId={approvingUserId}
                    />
                  )}

                  {activeTab === 'users' && (
                    <ManageUsersPanel
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      usersLoading={usersLoading}
                      usersError={usersError}
                      userActionById={userActionById}
                      filteredUsers={filteredUsers}
                      onEditUser={editUser}
                      onToggleUserStatus={toggleUserStatus}
                      onDeleteUser={removeUser}
                    />
                  )}

                  {activeTab === 'reviews' && (
                    <div className="rounded-xl border border-white/10 bg-[#00273C]/60 p-6">
                      <h2 className="text-white font-semibold text-xl mb-2">Design Reviews</h2>
                      <p className="text-white/60 text-sm">
                        Queue for drawings, presentations, and documentation review (connect your projects module here).
                      </p>
                    </div>
                  )}

                  {activeTab === 'coordination' && (
                    <CoordinatorPanel
                      users={filteredUsers}
                      groups={groups}
                      onMakeLeader={handleMakeLeader}
                      onRemoveLeader={handleRemoveLeader}
                      onCreateGroup={handleCreateGroup}
                      onDisbandGroup={handleDisbandGroup}
                      loadingAction={userActionById}
                    />
                  )}

                  {activeTab === 'events' && (
                    <EventsPanel user={user} />
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
