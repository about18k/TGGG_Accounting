import React from 'react';
import { X, Plus } from 'lucide-react';

const TODAY_ISO = new Date().toISOString().split('T')[0];

const CreateProjectModal = ({
  showCreateProjectModal,
  setShowCreateProjectModal,
  projectForm,
  setProjectForm,
  handleCreateProject,
  savingProject,
  cardClass
}) => {
  if (!showCreateProjectModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`${cardClass} w-full max-w-lg mx-4 p-6 space-y-5`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Create New Project</h2>
          <button
            type="button"
            onClick={() => setShowCreateProjectModal(false)}
            className="text-white/60 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-white font-medium mb-2">Project Name</label>
            <input
              type="text"
              value={projectForm.name}
              onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
              placeholder="e.g. Warehouse Expansion Phase 2"
            />
          </div>
          <div>
            <label className="block text-white font-medium mb-2">Date Started</label>
            <input
              type="date"
              value={projectForm.date_started}
              onChange={(e) => setProjectForm((prev) => ({ ...prev, date_started: e.target.value }))}
              min={TODAY_ISO}
              max={TODAY_ISO}
              readOnly
              className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#FF7120]/50"
            />
          </div>
          <div>
            <label className="block text-white font-medium mb-2">Location</label>
            <input
              type="text"
              value={projectForm.location}
              onChange={(e) => setProjectForm((prev) => ({ ...prev, location: e.target.value }))}
              className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
              placeholder="e.g. North Yard, Building A"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowCreateProjectModal(false)}
            className="px-5 py-2.5 border border-white/20 text-white rounded-xl font-medium hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateProject}
            disabled={savingProject}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF7120] text-white rounded-xl font-medium hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            {savingProject ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
