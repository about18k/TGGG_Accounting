import { Calendar, CalendarDays, FolderKanban, Clock, CheckSquare } from 'lucide-react';

const PERSONAL_LINKS = [
  { id: 'attendance', label: 'Attendance', icon: Calendar, section: 'attendance' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, page: 'calendar' },
  { id: 'overtime', label: 'Overtime & Leave', icon: Clock, page: 'overtime' },
  { id: 'todo', label: 'Todo', icon: CheckSquare, page: 'todo' },
];

const DOCUMENTATION_LINKS = [
  { id: 'documentation', label: 'Documentation', icon: FolderKanban, page: 'documentation' },
];

export default function BimSpecialistSidebar({
  currentPage = 'attendance',
  onNavigate,
  activeSection = 'attendance',
  onSelectSection,
}) {
  const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg';

  const handleClick = (item) => {
    if (item.page) {
      // Navigate to a completely different page/route
      onNavigate?.(item.page);
    } else if (item.section) {
      // Switch section within the current dashboard
      if (onSelectSection) {
        onSelectSection(item.section);
      } else {
        onNavigate?.(`attendance?section=${item.section}`);
      }
    }
  };

  return (
    <div className={`${cardClass} p-4 lg:sticky lg:top-28`}>
      <nav className="space-y-4">
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Personal</p>
          {PERSONAL_LINKS.map((item) => {
            const Icon = item.icon;
            const isActive = item.page
              ? currentPage === item.page
              : currentPage === 'attendance' && activeSection === item.section;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClick(item)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive
                  ? 'bg-[#FF7120] text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
        
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Documentation</p>
          {DOCUMENTATION_LINKS.map((item) => {
            const Icon = item.icon;
            const isActive = item.page
              ? currentPage === item.page
              : currentPage === 'attendance' && activeSection === item.section;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClick(item)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive
                  ? 'bg-[#FF7120] text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
