import { Calendar, CalendarDays, Clock, User, UserCheck, Users, GitMerge, FolderKanban, ClipboardList } from 'lucide-react';

const PRIMARY_LINKS = [
  { id: 'attendance', label: 'Attendance', icon: Calendar, page: 'attendance' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, page: 'calendar' },
  { id: 'overtime', label: 'Overtime & Leave', icon: Clock, page: 'overtime' },
];

const DOCUMENTATION_LINKS = [
  { id: 'bim-docs', label: 'BIM Documentation', icon: FolderKanban, page: 'studio-head-bim-docs' },
  { id: 'junior-architect-docs', label: 'Junior Architect Docs', icon: User, page: 'studio-head-junior-docs' },
  { id: 'material-requests', label: 'Material Requests', icon: ClipboardList, page: 'studio-head-material-requests' },
];

const DASHBOARD_LINKS = [
  { id: 'approvals', label: 'User Approvals', icon: UserCheck, page: 'approvals' },
  { id: 'users', label: 'Manage Users', icon: Users, page: 'users' },
  { id: 'coordination', label: 'Coordinator Panel', icon: GitMerge, page: 'coordination' },
];

export default function StudioHeadSidebar({
  currentPage = 'approvals',
  onNavigate,
}) {
  const cardClass = "rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg";

  const renderLink = (item) => {
    const Icon = item.icon;
    const path = item.page || item.id;
    const isActive = currentPage === path;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onNavigate?.(path)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive
          ? "bg-[#FF7120] text-white"
          : "text-white/70 hover:text-white hover:bg-white/5"
          }`}
      >
        <Icon className="h-5 w-5" />
        <span className="font-medium">{item.label}</span>
      </button>
    );
  };

  return (
    <div className={`${cardClass} p-4 lg:sticky lg:top-28`}>
      <nav className="space-y-4">
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Personal</p>
          {PRIMARY_LINKS.map(renderLink)}
        </div>

        <div className="space-y-1">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Documentation</p>
          {DOCUMENTATION_LINKS.map(renderLink)}
        </div>

        <div className="space-y-1">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Management</p>
          {DASHBOARD_LINKS.map(renderLink)}
        </div>
      </nav>
    </div>
  );
}
