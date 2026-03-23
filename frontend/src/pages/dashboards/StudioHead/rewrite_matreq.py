import re

file_path = "c:/Users/User/Desktop/OJT-4thyear/TGGG_Accountingkimver/frontend/src/pages/dashboards/StudioHead/StudioHeadMaterialRequestPage.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Badge function for class append
badge_old = """const Badge = ({ tone = 'neutral', children }) => {
  const toneClasses = {
    pending: 'bg-blue-500/10 text-blue-200 border-blue-500/20',
    forwarded: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/20',
    approved: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-200 border-red-500/20',
    neutral: 'bg-white/5 text-white/70 border-white/10',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone] || toneClasses.neutral}`}>
      {children}
    </span>
  );
};"""

badge_new = """const Badge = ({ tone = 'neutral', children, className = '' }) => {
  const toneClasses = {
    pending: 'bg-blue-500/10 text-blue-200 border-blue-500/20',
    forwarded: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/20',
    approved: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-200 border-red-500/20',
    neutral: 'bg-white/5 text-white/70 border-white/10',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone] || toneClasses.neutral} ${className}`.trim()}>
      {children}
    </span>
  );
};"""

content = content.replace(badge_old, badge_new)

# 2. Update SummaryCard
summary_old = """const SummaryCard = ({ label, value, icon: Icon, tone, isActive, onClick }) => {
  const toneStyles = {
    pending: 'border-blue-500/15 bg-blue-500/8 text-blue-200',
    forwarded: 'border-cyan-500/15 bg-cyan-500/8 text-cyan-200',
    approved: 'border-emerald-500/15 bg-emerald-500/8 text-emerald-200',
    rejected: 'border-red-500/15 bg-red-500/8 text-red-200',
    neutral: 'border-white/10 bg-white/[0.03] text-white',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cardClass} w-full p-5 text-left transition-all duration-200 ${
        isActive
          ? 'border-[#FF7120]/55 bg-[#FF7120]/8 shadow-[0_0_20px_rgba(255,113,32,0.18)]'
          : 'hover:-translate-y-0.5 hover:border-[#FF7120]/35 hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm ${isActive ? 'text-white/80' : 'text-white/55'}`}>{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-2xl border ${toneStyles[tone] || toneStyles.neutral}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
};"""

summary_new = """const SummaryCard = ({ label, value, icon: Icon, tone = 'neutral', isActive = false, onClick }) => {
    const toneStyles = {
        pending: 'border-[#FF7120]/20 bg-[#FF7120]/10 text-[#FFBE9B]',
        forwarded: 'border-cyan-500/15 bg-cyan-500/8 text-cyan-200',
        approved: 'border-emerald-500/15 bg-emerald-500/8 text-emerald-200',
        rejected: 'border-red-500/15 bg-red-500/8 text-red-200',
        neutral: 'border-white/10 bg-white/[0.03] text-white',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`${cardClass} w-full p-5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7120]/40 active:scale-[0.99] ${
                isActive
                    ? 'border-[#FF7120]/55 bg-[#FF7120]/8 shadow-[0_0_20px_rgba(255,113,32,0.18)]'
                    : 'hover:-translate-y-0.5 hover:border-[#FF7120]/35 hover:bg-white/[0.05] hover:shadow-[0_10px_24px_rgba(0,0,0,0.25)]'
            }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className={`text-sm ${isActive ? 'text-white/80' : 'text-white/55'}`}>{label}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
                </div>
                <div className={`grid h-12 w-12 place-items-center rounded-full border ${toneStyles[tone] || toneStyles.neutral} ${isActive ? 'ring-2 ring-[#FF7120]/40 ring-offset-2 ring-offset-[#001F35]' : ''}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </button>
    );
};"""

content = content.replace(summary_old, summary_new)

# 3. Add RequestListItem component before StudioHeadMaterialRequestPage
req_list_item = """
const RequestListItem = ({ request, isSelected, onSelect }) => {
    const statusMeta = getStatusMeta(request);

    return (
        <button
            type="button"
            onClick={() => onSelect(request.id)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
                isSelected
                    ? 'border-[#FF7120]/50 bg-[#FF7120]/10 shadow-[0_0_24px_rgba(255,113,32,0.12)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{request.project_name}</p>
                    <p className="mt-1 text-xs text-white/45">{request.priority?.toUpperCase() || '-'} priority</p>
                </div>
                <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            </div>

            <div className="mt-3 grid gap-2 text-xs text-white/55 sm:grid-cols-2">
                <div className="flex items-center gap-2 min-w-0">
                    <User2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{request.created_by_name || request.created_by_email || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{formatDate(request.request_date)}</span>
                </div>
            </div>
        </button>
    );
};
"""
content = content.replace("const StudioHeadMaterialRequestPage = ({ user, onNavigate }) => {", req_list_item + "\nconst StudioHeadMaterialRequestPage = ({ user, onNavigate }) => {")

# 4. Header Section
header_old = """<section className={`${cardClass} p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Studio Head Review</p>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-white">Material Requests</h1>
                  <p className="mt-2 text-sm text-white/60">
                    Review Site Engineer requests, then forward approved requests to CEO for final decision.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fetchRequests()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
                >
                  <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </section>"""

header_new = """<section className={cardClass}>
              <div className="p-6 sm:p-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
                  <div className="max-w-3xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7120]/80">Studio Head Review</p>
                      <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">Material Requests</h1>
                      <p className="mt-3 text-sm text-white/60 max-w-2xl">
                          Review Site Engineer requests, then forward approved requests to CEO for final decision.
                      </p>
                  </div>
                  <button
                      type="button"
                      onClick={() => fetchRequests()}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition focus:ring-2 focus:ring-[#FF7120]/40"
                  >
                      <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                  </button>
              </div>
            </section>"""
content = content.replace(header_old, header_new)

# 5. Main Grid Pattern Update
main_grid_old = """<section className="grid grid-cols-1 xl:grid-cols-[370px,1fr] gap-6">
              <div className={`${cardClass} p-5 space-y-4`}>
                <div>
                  <h2 className="text-lg font-semibold text-white">{activeTabMeta.label}</h2>
                  <p className="text-xs text-white/50 mt-1">{activeTabMeta.description}</p>
                </div>

                {loading && <p className="text-sm text-white/60 py-6 text-center">Loading requests...</p>}

                {!loading && activeRequests.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55 text-center">
                    {activeTabMeta.emptyText}
                  </div>
                )}

                {!loading && activeRequests.length > 0 && (
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    {activeRequests.map((request) => {
                      const statusMeta = getStatusMeta(request);
                      const isSelected = selectedRequest?.id === request.id;

                      return (
                        <button
                          key={request.id}
                          type="button"
                          onClick={() => setSelectedRequestId(request.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            isSelected
                              ? 'border-[#FF7120]/50 bg-[#FF7120]/10 shadow-[0_0_24px_rgba(255,113,32,0.12)]'
                              : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{request.project_name}</p>
                              <p className="mt-1 text-xs text-white/45">{request.priority?.toUpperCase()} priority</p>
                            </div>
                            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                          </div>

                          <div className="mt-3 grid gap-2 text-xs text-white/55 sm:grid-cols-2">
                            <div className="inline-flex items-center gap-2 min-w-0">
                              <User2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{request.created_by_name || request.created_by_email || 'Unknown'}</span>
                            </div>
                            <div className="inline-flex items-center gap-2 min-w-0">
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{formatDate(request.request_date)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`${cardClass} p-6`}>"""

main_grid_new = """<section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-1">
                  <div className={cardClass}>
                      <div className="p-5 border-b border-white/10">
                          <p className="text-lg font-semibold text-white">{activeTabMeta.label}</p>
                          <p className="mt-1 text-sm text-white/55">{activeTabMeta.description}</p>
                      </div>

                      <div className="p-4">
                          {loading ? (
                              <p className="py-10 text-center text-sm text-white/55">Loading requests...</p>
                          ) : activeRequests.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-16 px-4">
                                  <div className="w-16 h-16 bg-[#FF7120]/10 rounded-2xl border border-[#FF7120]/20 flex items-center justify-center mb-4">
                                      <Clock3 className="w-8 h-8 text-[#FF7120]" />
                                  </div>
                                  <p className="text-xl font-semibold text-white/90">Nothing here right now</p>
                                  <p className="mt-2 text-sm text-white/50 max-w-[200px] mx-auto text-center">{activeTabMeta.emptyText}</p>
                              </div>
                          ) : (
                              <div className="space-y-3 max-h-[740px] overflow-y-auto pr-1">
                                  {activeRequests.map((request) => (
                                      <RequestListItem
                                          key={request.id}
                                          request={request}
                                          isSelected={selectedRequest?.id === request.id}
                                          onSelect={setSelectedRequestId}
                                      />
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              <div className="lg:col-span-2">"""
content = content.replace(main_grid_old, main_grid_new)

# 6. Selected Component Area
selected_old = """                {selectedRequest && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Material Request</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">{selectedRequest.project_name}</h3>
                      </div>
                      <Badge tone={selectedStatusMeta.tone}>{selectedStatusMeta.label}</Badge>
                    </div>"""

selected_new = """                {selectedRequest && (
                  <section className={cardClass}>
                      <div className="p-6 border-b border-white/10">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              <div className="min-w-0">
                                  <h2 className="text-2xl font-semibold text-white break-words">{selectedRequest.project_name}</h2>
                                  <p className="text-sm text-white/60 mt-2">
                                      Submitted by {selectedRequest.created_by_name || selectedRequest.created_by_email || 'Unknown author'}
                                  </p>
                              </div>
                              <button
                                  type="button"
                                  onClick={() => setActiveTab(selectedStatusMeta.tabId)}
                                  className="rounded-full"
                                  title={`Open ${selectedStatusMeta.label} tab`}
                              >
                                  <Badge tone={selectedStatusMeta.tone} className="cursor-pointer">
                                      {selectedStatusMeta.label}
                                  </Badge>
                              </button>
                          </div>
                      </div>

                      <div className="p-6 space-y-6">"""
content = content.replace(selected_old, selected_new)

# 7. Close section wrapper at the end of selectedRequest
end_old = """                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </main>"""
end_new = """                      </div>
                  </section>
                )}
              </div>
            </section>
          </main>"""
content = content.replace(end_old, end_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
