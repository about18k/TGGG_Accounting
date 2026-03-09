import { Home, Calendar, Clock, User, UserCheck, Users, FileText, GitMerge } from 'lucide-react';

const PRIMARY_LINKS = [
  { id: 'studio-head', label: 'Dashboard', icon: Home, page: 'studio-head' },
  { id: 'attendance', label: 'Attendance', icon: Calendar, page: 'attendance' },
  { id: 'overtime', label: 'Overtime & Leave', icon: Clock, page: 'overtime' },
  { id: 'events', label: 'Calendar / Events', icon: Calendar, page: 'studio-head?tab=events' },
];

const DASHBOARD_LINKS = [
  { id: 'approvals', label: 'User Approvals', icon: UserCheck },
  { id: 'users', label: 'Manage Users', icon: Users },
  { id: 'reviews', label: 'Design Reviews', icon: FileText },
  { id: 'coordination', label: 'Coordinator Panel', icon: GitMerge },
];

export default function StudioHeadSidebar({
  currentPage = 'studio-head',
  onNavigate,
  activeTab,
  onSelectTab,
}) {
  const cardClass = "rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg";

  const goToDashboardTab = (tabId) => {
    if (currentPage === 'studio-head' && onSelectTab) {
      onSelectTab(tabId);
      return;
    }
    onNavigate?.(`studio-head?tab=${tabId}`);
  };

  return (
    <div className={`${cardClass} p-4 sticky top-24`}>
      <nav className="space-y-2">
        {PRIMARY_LINKS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.page)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive
                  ? "bg-[#FF7120] text-white"
                  : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}

        <div className="pt-2 mt-2 border-t border-white/10" />
        {DASHBOARD_LINKS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPage === 'studio-head' && activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => goToDashboardTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive
                  ? "bg-[#FF7120] text-white"
                  : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
