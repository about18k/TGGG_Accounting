import React from 'react';
import { FolderOpen, MapPin, CheckCircle2 } from 'lucide-react';
import { CardSkeleton } from '../../components/SkeletonLoader';
import { cardClass } from './utils';

const ProjectListSidebar = ({ projects, loading, selectedProjectId, onSelectProject, emptyText = 'No projects found.' }) => {
  return (
    <div className={`${cardClass} flex flex-col h-full p-5 space-y-4`}>
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-[#FF7120]" />
        <h2 className="text-lg font-semibold text-white">Projects</h2>
      </div>

      {loading && (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55 text-center">
          {emptyText}
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
          {projects.map((group) => {
            const isSelected = selectedProjectId === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => onSelectProject(group.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? 'border-[#FF7120]/50 bg-[#FF7120]/10 shadow-[0_0_24px_rgba(255,113,32,0.12)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                }`}
              >
                <p className="text-sm font-semibold text-white truncate">{group.name}</p>
                <div className="mt-2 flex flex-col gap-1.5 text-xs text-white/50">
                  <span className="inline-flex items-center gap-1.5 w-full">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{group.location}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                    {group.requests.length} request{group.requests.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectListSidebar;
