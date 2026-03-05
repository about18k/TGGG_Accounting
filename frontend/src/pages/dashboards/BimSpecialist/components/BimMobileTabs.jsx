import { Calendar, Clock, CheckSquare, FolderKanban } from 'lucide-react';

const TABS = [
    { id: 'attendance', label: 'Attendance', icon: Calendar, page: 'attendance' },
    { id: 'overtime', label: 'OT', icon: Clock, page: 'overtime' },
    { id: 'todo', label: 'Todo', icon: CheckSquare, page: 'todo' },
    { id: 'documentation', label: 'Docs', icon: FolderKanban, page: 'attendance', section: 'documentation' },
];

/**
 * Shared mobile tab bar for BIM Specialist pages.
 * Shown only on small screens (lg:hidden), mirrors the sidebar nav.
 *
 * @param {string}   currentPage      - Current route page (attendance | overtime | todo)
 * @param {string}   activeSection    - Active section within the attendance page
 * @param {function} onNavigate       - Route-level navigation
 * @param {function} onSelectSection  - Section switcher (only works on attendance page)
 */
export default function BimMobileTabs({ currentPage, activeSection, onNavigate, onSelectSection }) {
    const handleClick = (tab) => {
        if (tab.section) {
            // Documentation: navigate to attendance page first, then switch section
            if (currentPage !== 'attendance') {
                onNavigate?.('attendance?section=documentation');
            } else {
                onSelectSection?.(tab.section);
            }
        } else {
            onNavigate?.(tab.page);
        }
    };

    return (
        <div className="lg:hidden mb-4 rounded-2xl border border-white/10 bg-[#001f35]/70 p-2 backdrop-blur-md">
            <div className="grid grid-cols-4 gap-2">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tab.section
                        ? currentPage === 'attendance' && activeSection === tab.section
                        : currentPage === tab.page && (!activeSection || activeSection === 'attendance');
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleClick(tab)}
                            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition ${isActive
                                    ? 'bg-[#FF7120] text-white'
                                    : 'bg-white/5 text-white/70 hover:text-white'
                                }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
