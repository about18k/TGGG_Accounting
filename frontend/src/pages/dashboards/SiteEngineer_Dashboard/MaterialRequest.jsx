import React from 'react';
import { AlertTriangle, FolderOpen, Package, Send, Plus, MapPin, Clock3, Trash2 } from 'lucide-react';
import MaterialRequestFormModal from '../../../components/modals/MaterialRequestFormModal';
import useMaterialRequests from '../../../hooks/useMaterialRequests';

import MaterialRequestForm from './components/MaterialRequestForm';
import MaterialRequestManageTab from './components/MaterialRequestManageTab';
import MaterialRequestProjectsTab from './components/MaterialRequestProjectsTab';
import CreateProjectModal from './components/CreateProjectModal';

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

const MaterialRequest = ({ user }) => {
  const hookState = useMaterialRequests(user);
  const {
    activeTab,
    setActiveTab,
    deleteTargetRequest,
    actionRequestId,
    isFormModalOpen,
    setIsFormModalOpen,
    selectedRequestForModal,
    closeDeleteDraftConfirm,
    confirmDeleteDraft,
    counts,
  } = hookState;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[#FF7120] text-sm font-semibold uppercase tracking-wider mb-1">Material Requests</p>
          <h1 className="text-3xl font-bold text-white">Materials & Approvals</h1>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === 'create'
                ? 'bg-[#FF7120] text-white shadow-lg shadow-[#FF7120]/20'
                : 'border border-white/15 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            Create Request
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === 'manage'
                ? 'bg-[#FF7120] text-white shadow-lg shadow-[#FF7120]/20'
                : 'border border-white/15 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            My Requests
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === 'projects'
                ? 'bg-[#FF7120] text-white shadow-lg shadow-[#FF7120]/20'
                : 'border border-white/15 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <FolderOpen className="h-4 w-4" />
              All Projects & Approvals
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <MaterialRequestForm {...hookState} cardClass={cardClass} />
      )}

      {activeTab === 'manage' && (
        <MaterialRequestManageTab {...hookState} user={user} cardClass={cardClass} />
      )}

      {activeTab === 'projects' && (
        <MaterialRequestProjectsTab {...hookState} cardClass={cardClass} />
      )}

      <MaterialRequestFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        request={selectedRequestForModal}
        userRole={user?.role}
      />

      <CreateProjectModal {...hookState} cardClass={cardClass} />

      {deleteTargetRequest && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-red-400/25 bg-[#001f35] shadow-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-red-500/15 border border-red-400/35 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-red-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white">Delete Draft Request?</h3>
                <p className="text-sm text-white/70 mt-1">
                  This will permanently delete
                  <span className="text-white font-medium"> {deleteTargetRequest.project_name || 'this draft request'}</span>.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteDraftConfirm}
                disabled={Boolean(actionRequestId)}
                className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDraft}
                disabled={Boolean(actionRequestId)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-400/35 bg-red-500/15 text-red-200 hover:bg-red-500/25 transition disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {actionRequestId ? 'Deleting...' : 'Delete Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialRequest;
