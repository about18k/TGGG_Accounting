#!/usr/bin/env python3
"""Script to convert Attendance Totals to collapsible dropdown in all dashboard files."""

import re

files_to_update = [
    (
        r"c:\Users\Kimberly Faith Ytac\TGGG_Accounting\frontend\src\pages\dashboards\BimSpecialist\BimSpecialistDashboard.jsx",
        ['ShieldCheck', 'User']
    ),
    (
        r"c:\Users\Kimberly Faith Ytac\TGGG_Accounting\frontend\src\pages\dashboards\JuniorDesigner_Dashboard\JuniorDesignerDashboard.jsx",
        ['Calendar', 'ShieldCheck', 'User']
    ),
    (
        r"c:\Users\Kimberly Faith Ytac\TGGG_Accounting\frontend\src\pages\dashboards\SiteEngineer_Dashboard\SiteEngineerDashboard.jsx",
        ['Calendar', 'ShieldCheck', 'User']
    ),
    (
        r"c:\Users\Kimberly Faith Ytac\TGGG_Accounting\frontend\src\pages\dashboards\SiteCoordinator_Dashboard\SiteCoordinatorDashboard.jsx",
        ['BarChart3', 'Calendar', 'ShieldCheck', 'User']
    ),
    (
        r"c:\Users\Kimberly Faith Ytac\TGGG_Accounting\frontend\src\pages\dashboards\Public_Dashboard\AttendanceDashboard.jsx",
        ['Calendar', 'ShieldCheck', 'User']
    ),
]

dropdown_component = '''        <button
          onClick={() => setIsAttendanceTotalsOpen(!isAttendanceTotalsOpen)}
          className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-white/5 transition-colors rounded-2xl"
        >
          <div className="flex flex-col gap-1 text-left">
            <h3 className="text-white font-semibold tracking-tight text-[clamp(0.95rem,2.4vw,1.1rem)]">Attendance Totals</h3>
            {!isAttendanceTotalsOpen && (
              <p className="text-white/60 text-sm">Click to view your metrics</p>
            )}
          </div>
          <ChevronDown
            className={`h-5 w-5 text-white/60 transition-transform duration-300 flex-shrink-0 ${
              isAttendanceTotalsOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isAttendanceTotalsOpen && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <label className="flex flex-col gap-1 text-xs text-white/70">
                Month
                <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="rounded-lg border border-white/15 bg-[#001f35] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60">
                  <option value="all">All Months</option>
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-white/70">
                Year
                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="rounded-lg border border-white/15 bg-[#001f35] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60">
                  <option value="all">All Years</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={String(year)}>{year}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-white/70">
                Start Date
                <input type="date" value={rangeStartDate} onChange={(e) => setRangeStartDate(e.target.value)} className="rounded-lg border border-white/15 bg-[#001f35] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60 [color-scheme:dark]" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-white/70">
                End Date
                <input type="date" value={rangeEndDate} onChange={(e) => setRangeEndDate(e.target.value)} className="rounded-lg border border-white/15 bg-[#001f35] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60 [color-scheme:dark]" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/10 bg-[#021B2C]/70 p-3"><p className="text-xs text-white/60">Total Hours</p><p className="mt-1 text-2xl font-semibold text-white">{attendanceTotals.totalHours.toFixed(2)}h</p></div>
              <div className="rounded-xl border border-white/10 bg-[#021B2C]/70 p-3"><p className="text-xs text-white/60">Total Days Worked</p><p className="mt-1 text-2xl font-semibold text-white">{attendanceTotals.totalDaysWorked}</p></div>
              <div className="rounded-xl border border-white/10 bg-[#021B2C]/70 p-3"><p className="text-xs text-white/60">Total Late</p><p className="mt-1 text-2xl font-semibold text-white">{attendanceTotals.totalLate}</p></div>
              <div className="rounded-xl border border-white/10 bg-[#021B2C]/70 p-3"><p className="text-xs text-white/60">Total Overtime Worked</p><p className="mt-1 text-2xl font-semibold text-white">{attendanceTotals.totalOvertimeHours.toFixed(2)}h</p></div>
            </div>
          </div>
        )}'''

def update_file(file_path, existing_imports):
    print(f"\nUpdating {file_path}...")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Add ChevronDown import
        if 'ChevronDown' not in content:
            # Find the lucide-react import and add ChevronDown
            import_pattern = r'from \'lucide-react\';'
            if 'from \'lucide-react\';' in content:
                # Build new import list
                imports_str = ', '.join(existing_imports) + ', ChevronDown'
                content = re.sub(
                    r'import \{[\s\S]*?\} from \'lucide-react\';',
                    f"import {{\n  {', '.join(('  ' + imp for imp in (existing_imports + ['ChevronDown'])))}\n}} from 'lucide-react';",
                    content,
                    count=1
                )
            print(f"  ✓ Added ChevronDown import")
        
        # Add state for dropdown
        if 'isAttendanceTotalsOpen' not in content:
            content = re.sub(
                r'(\s+const \[rangeEndDate, setRangeEndDate\] = useState\(\'\'\);)',
                r'\1\n  const [isAttendanceTotalsOpen, setIsAttendanceTotalsOpen] = useState(false);',
                content,
                count=1
            )
            print(f"  ✓ Added isAttendanceTotalsOpen state")
        
        # Replace Attendance Totals card with dropdown
        # Find and replace the old card structure
        old_pattern = r'<div className=\{cardClass\}>\s*<div className="p-4 sm:p-6 space-y-4">\s*<div className="flex flex-col gap-1">\s*<h3 className="text-white font-semibold tracking-tight text-\[clamp\(0\.95rem,2\.4vw,1\.1rem\)\]">Attendance Totals</h3>[\s\S]*?<div className="rounded-xl border border-white/10 bg-\[#021B2C\]/70 p-3"><p className="text-xs text-white/60">Total Overtime Worked</p><p className="mt-1 text-2xl font-semibold text-white">\{attendanceTotals\.totalOvertimeHours\.toFixed\(2\)\}h</p></div>\s*</div>\s*</div>\s*</div>'
        
        if re.search(old_pattern, content):
            content = re.sub(old_pattern, f'<div className={{cardClass}}>\n{dropdown_component}\n      </div>', content, count=1)
            print(f"  ✓ Replaced Attendance Totals section with dropdown")
        else:
            print(f"  ⚠ Could not find old Attendance Totals pattern (may already be updated)")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ File updated successfully")
        return True
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

# Update all files
print("=" * 60)
print("Updating Attendance Totals to collapsible dropdown...")
print("=" * 60)

for file_path, existing_imports in files_to_update:
    update_file(file_path, existing_imports)

print("\n" + "=" * 60)
print("Done!")
print("=" * 60)
