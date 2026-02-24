import { ClipboardList, Clock, Home, Calendar, CheckSquare, User } from 'lucide-react';

const SECTION_LINKS = [
  { id: 'overview', label: 'Dashboard', icon: Home, section: 'overview' },
  { id: 'attendance', label: 'Attendance', icon: Calendar, section: 'attendance' },
];

const PAGE_LINKS = [
  { id: 'coordinator-hub', label: 'Material Request', icon: ClipboardList, page: 'coordinator-hub' },
  { id: 'overtime', label: 'Overtime & Leave', icon: Clock, page: 'overtime' },
  { id: 'todo', label: 'Todo', icon: CheckSquare, page: 'todo' },
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

  return (
    <div className={`${cardClass} p-4 sticky top-24`}>
      <nav className="space-y-2">
        {SECTION_LINKS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.section;
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

        <div className="pt-2 mt-2 border-t border-white/10" />

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
      </nav>
    </div>
  );
}
