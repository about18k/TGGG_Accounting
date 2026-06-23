import React from 'react';
import { FolderOpen, Plus, MapPin, Clock3, CheckCircle2, FileText } from 'lucide-react';
import { CardSkeleton } from '../../../../components/SkeletonLoader';
import { formatDate } from '../../../../hooks/useMaterialRequests';

const MaterialRequestProjectsTab = ({
  projects,
  selectedProjectId,
  approvedRequests,
  loadingApproved,
  setShowCreateProjectModal,
  selectProject,
  setSelectedRequestForModal,
  setIsFormModalOpen,
  cardClass
}) => {
  return (
    <div className={`${cardClass} p-6`}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-white">All Projects</h2>
          <p className="text-sm text-white/50 mt-1">Select a project to view approved material requests.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateProjectModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF7120] text-white rounded-xl text-sm font-medium hover:brightness-95 transition"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-1">
          <div className={`${cardClass} flex flex-col h-full p-5 space-y-4`}>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-[#FF7120]" />
              <h2 className="text-lg font-semibold text-white">Projects</h2>
            </div>

            {projects.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55 text-center">
                No projects yet. Create one to get started.
              </div>
            )}

            {projects.length > 0 && (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {projects.map((proj) => {
                  const isSelected = selectedProjectId === proj.id;
                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => selectProject(proj)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-[#FF7120]/50 bg-[#FF7120]/10 shadow-[0_0_24px_rgba(255,113,32,0.12)]'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      <p className="text-sm font-semibold text-white truncate">{proj.name}</p>
                      <div className="mt-2 grid gap-1.5 text-xs text-white/55">
                        <div className="inline-flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{proj.location}</span>
                        </div>
                        <div className="inline-flex items-center gap-2">
                          <Clock3 className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            Started {new Date(proj.date_started).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">
                          {proj.material_request_count || 0} request(s)
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-500/20">
                          {proj.approved_request_count || 0} approved
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className={`${cardClass} flex flex-col h-full p-6`}>
            {!selectedProjectId && (
              <div className="h-full grid place-items-center text-center py-12">
                <div>
                  <FolderOpen className="mx-auto h-12 w-12 text-white/20 mb-4" />
                  <p className="text-white/60">Select a project to view approved material requests.</p>
                </div>
              </div>
            )}

            {selectedProjectId && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Project Overview</p>
                    <h3 className="mt-2 text-2xl font-bold text-white">
                      {projects.find((p) => p.id === selectedProjectId)?.name || 'Project'}
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {approvedRequests.length} approved
                  </span>
                </div>

                <div className="rounded-2xl border border-[#FF7120]/25 bg-gradient-to-br from-[#FF7120]/10 to-transparent p-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Total Project Approved Amount</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    ₱{approvedRequests.reduce((sum, req) => {
                      const requestTotal = (req.items || []).reduce((acc, item) => acc + (Number(item.total) || 0), 0);
                      return sum + requestTotal;
                    }, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {loadingApproved && (
                  <CardSkeleton />
                )}

                {!loadingApproved && approvedRequests.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-white/25 mx-auto mb-3" />
                    <p className="text-white/60 text-sm">No approved material requests for this project yet.</p>
                  </div>
                )}

                {!loadingApproved && approvedRequests.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-[0.12em] text-white/40 font-semibold">
                      <div className="col-span-1">#</div>
                      <div className="col-span-4">Requester</div>
                      <div className="col-span-3">Date of Request</div>
                      <div className="col-span-2 text-right">Total</div>
                      <div className="col-span-2 text-center">Form</div>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto">
                      {approvedRequests.map((req, idx) => {
                        const itemsTotal = (req.items || []).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
                        return (
                          <div
                            key={req.id}
                            className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] transition items-center text-sm"
                          >
                            <div className="col-span-1">
                              <span className="grid h-6 w-6 place-items-center rounded-md bg-[#FF7120]/15 text-[#FF7120] text-xs font-bold">
                                {idx + 1}
                              </span>
                            </div>
                            <div className="col-span-4 min-w-0">
                              <p className="text-white font-medium truncate">{req.created_by_name || req.created_by_email || 'Unknown'}</p>
                            </div>
                            <div className="col-span-3 text-white/60">
                              {formatDate(req.request_date)}
                            </div>
                            <div className="col-span-2 text-right text-white font-medium">
                              ₱{itemsTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="col-span-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRequestForModal(req);
                                  setIsFormModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/15 text-xs text-white/70 hover:bg-white/10 hover:text-white transition"
                              >
                                <FileText className="h-3 w-3" />
                                View Form
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default MaterialRequestProjectsTab;
