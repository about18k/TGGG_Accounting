import { ClipboardList, Clock, Calendar, CalendarDays, CheckSquare } from 'lucide-react';

const PRIORITY_LINKS = [
  { id: 'attendance', label: 'Attendance', icon: Calendar, section: 'attendance', type: 'section' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, page: 'calendar', type: 'page' },
  { id: 'overtime', label: 'Overtime', icon: Clock, page: 'overtime', type: 'page' },
  { id: 'todo', label: 'Todo', icon: CheckSquare, page: 'todo', type: 'page' },
];

const SECONDARY_LINKS = [
  { id: 'engineer-hub', label: 'Material Request', icon: ClipboardList, page: 'engineer-hub', type: 'page' },
];

export default function SiteEngineerSidebar({
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

  return (
    <div className={`${cardClass} p-4 lg:sticky lg:top-28`}>
      <nav className="space-y-4">
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">Personal</p>
          {PRIORITY_LINKS.map((item) => {
            const Icon = item.icon;
            const isActive = item.type === 'section'
              ? currentPage === 'attendance' && activeSection === item.section
              : currentPage === item.page;
            const onClick = item.type === 'section'
              ? () => onSectionClick(item.section)
              : () => onNavigate?.(item.page);
            return (
              <button
                key={item.id}
                type="button"
                onClick={onClick}
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
          {SECONDARY_LINKS.map((item) => {
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
