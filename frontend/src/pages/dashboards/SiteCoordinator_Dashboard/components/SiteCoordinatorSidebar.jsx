import { ClipboardList, Clock, CheckSquare, Home, CalendarDays } from 'lucide-react';

const SECTION_LINKS = [
  { id: 'attendance', label: 'Attendance', icon: Home, section: 'attendance' },
];

const PERSONAL_PAGE_LINKS = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, page: 'calendar' },
  { id: 'overtime', label: 'Overtime & Leave', icon: Clock, page: 'overtime' },
  { id: 'todo', label: 'Todo', icon: CheckSquare, page: 'todo' },
];

const MANAGEMENT_PAGE_LINKS = [
  { id: 'coordinator-hub', label: 'Material Request', icon: ClipboardList, page: 'coordinator-hub' },
];

export default function SiteCoordinatorSidebar({
  currentPage = 'attendance',
  onNavigate,
  activeSection = 'overview',
  onSelectSection,
}) {
  const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg';

  const onSectionClick = (section) => {
    if (onSelectSection) {
      onSelectSection(section);
      return;
    }
    onNavigate?.(`attendance?section=${section}`);
  };

  const isLinkActive = (item) => {
    if (item.section) {
      return currentPage === 'attendance' && activeSection === item.section;
    }
    return currentPage === item.page;
  };

  const onLinkClick = (item) => {
    if (item.section) {
      onSectionClick(item.section);
      return;
    }
    onNavigate?.(item.page);
  };

  return (
    <div className={`${cardClass} p-4 lg:sticky lg:top-28`}>
      <nav className="space-y-4">
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Personal</p>
          {SECTION_LINKS.map((item) => {
            const Icon = item.icon;
            const isActive = isLinkActive(item);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onLinkClick(item)}
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

          {PERSONAL_PAGE_LINKS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate?.(item.page)}
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
          <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Management</p>
          {MANAGEMENT_PAGE_LINKS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate?.(item.page)}
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
