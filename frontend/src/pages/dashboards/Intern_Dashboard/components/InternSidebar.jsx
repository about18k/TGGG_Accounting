import { Calendar, CalendarDays, Clock, CheckSquare } from 'lucide-react';

const SECTION_LINKS = [
  { id: 'attendance', label: 'Attendance', icon: Calendar, section: 'attendance' },
];

const PAGE_LINKS = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, page: 'calendar' },
  { id: 'overtime', label: 'Overtime & Leave', icon: Clock, page: 'overtime' },
  { id: 'todo', label: 'Todo', icon: CheckSquare, page: 'todo' },
];

export default function InternSidebar({
  currentPage = 'attendance',
  onNavigate,
  activeSection = 'attendance',
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
          {SECTION_LINKS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === 'attendance' && activeSection === item.section;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionClick(item.section)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  isActive
                    ? 'bg-[#FF7120] text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}

          {PAGE_LINKS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate?.(item.page)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  isActive
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
