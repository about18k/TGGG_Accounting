import React from 'react';
import { GitMerge, Calendar, ClipboardCheck, Users, FileText } from 'lucide-react';
import PendingApprovalsPanel from './components/PendingApprovalsPanel';
import ManageUsersPanel from './components/ManageUsersPanel';
import CoordinatorPanel from './components/CoordinatorPanel';
import MessageBanner from './components/MessageBanner';
import { useStudioHeadDashboard } from './hooks/useStudioHeadDashboard';
// import EventsPanel from './components/EventsPanel';

const TABS = [
  { id: 'approvals', label: 'User Approvals', icon: ClipboardCheck },
  { id: 'users', label: 'Manage Users', icon: Users },
  { id: 'reviews', label: 'Design Reviews', icon: FileText },
];

export default function StudioHeadDashboard({ user, onLogout, onNavigate, currentPage = 'approvals' }) {
  // Use currentPage from props as the source of truth
  const activeTab = (currentPage === 'studio-head' || !currentPage) ? 'approvals' : currentPage;

  const {
    message,
    setMessage,
    pendingUsers,
    pendingLoading,
    roleByUserId,
    setRoleByUserId,
    allowedRoles,
    approveUser,
    approvingUserId,
    declinePendingUser,
    decliningUserId,
    usersLoading,
    usersError,
    userActionById,
    searchTerm,
    setSearchTerm,
    filteredUsers,
    addUser,
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

  const cardClass = "rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg";

  return (
    <div className="w-full relative animate-fade-in">

      

      <MessageBanner message={message} onClose={() => setMessage('')} />
      <div className="space-y-6">
              {/* Standalone Header Card */}
              <div className={cardClass}>
                <div className="p-6 sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7120]/80">Studio Head Admin</p>
                  <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">
                    {TABS.find(t => t.id === activeTab)?.label || 'Studio Head Dashboard'}
                  </h1>
                  <p className="mt-3 text-sm text-white/60 max-w-2xl">
                    {activeTab === 'approvals' && 'Review registration queue for new accounts and assign department access privileges.'}
                    {activeTab === 'users' && 'Manage employee credentials, edit account profiles, toggle activation status, or remove users.'}
                    {activeTab === 'reviews' && 'BIM designs, drawings, sheets packages, and project documentation log queue.'}
                    {activeTab === 'coordination' && 'Set team leads, create groups, and organize workspace personnel.'}
                  </p>
                </div>
              </div>

              {/* Sibling Tab Content Panels */}
              {activeTab === 'approvals' && (
                <PendingApprovalsPanel
                  pendingUsers={pendingUsers}
                  pendingLoading={pendingLoading}
                  roleByUserId={roleByUserId}
                  setRoleByUserId={setRoleByUserId}
                  allowedRoles={allowedRoles}
                  approveUser={approveUser}
                  approvingUserId={approvingUserId}
                  declinePendingUser={declinePendingUser}
                  decliningUserId={decliningUserId}
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
                  allowedRoles={allowedRoles}
                  onAddUser={addUser}
                  onEditUser={editUser}
                  onToggleUserStatus={toggleUserStatus}
                  onDeleteUser={removeUser}
                />
              )}

              {activeTab === 'reviews' && (
                <div className={`${cardClass} p-6`}>
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
      </div>
    </div>
  );
}
