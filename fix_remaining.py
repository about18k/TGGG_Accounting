#!/usr/bin/env python3
"""Fix Attendance Totals for SiteCoordinator and AttendanceDashboard files."""

import re

files_data = [
    {
        'path': r"c:\Users\Kimberly Faith Ytac\TGGG_Accounting\frontend\src\pages\dashboards\SiteCoordinator_Dashboard\SiteCoordinatorDashboard.jsx",
        'use_section_title': False,
    },
    {
        'path': r"c:\Users\Kimberly Faith Ytac\TGGG_Accounting\frontend\src\pages\dashboards\Public_Dashboard\AttendanceDashboard.jsx",
        'use_section_title': True,
    },
]

for file_info in files_data:
    file_path = file_info['path']
    use_section_title = file_info.get('use_section_title', False)
    
    print(f"Processing {file_path.split(chr(92))[-1]}...")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Build the replacement based on whether it uses sectionTitle or not
        if use_section_title:
            h3_class = 'sectionTitle'
        else:
            h3_class = '"text-white font-semibold tracking-tight text-[clamp(0.95rem,2.4vw,1.1rem)]"'
        
        # Pattern to match the old structure (flexible with whitespace)
        old_pattern = r'<div className=\{cardClass\}>\s*<div className="p-4 sm:p-6 space-y-4">\s*<div className="flex flex-col gap-1">\s*<h3 className=\{?' + h3_class + r'\}?>Attendance Totals</h3>\s*<p className="text-white/60 text-sm">Filter by month, year, or date range to recalculate your totals\.</p>\s*</div>[\s\S]*?<div className="rounded-xl border border-white/10 bg-\[#021B2C\]/70 p-3">\s*<p className="text-xs text-white/60">Total Overtime Worked</p>\s*<p className="mt-1 text-2xl font-semibold text-white">\{attendanceTotals\.totalOvertimeHours\.toFixed\(2\)\}h</p>\s*</div>\s*</div>\s*</div>\s*</div>'
        
        button_code = '''<button
          onClick={() => setIsAttendanceTotalsOpen(!isAttendanceTotalsOpen)}
          className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-white/5 transition-colors rounded-2xl"
        >
          <div className="flex flex-col gap-1 text-left">
            <h3 className={''' + (h3_class if use_section_title else f"'{h3_class}'") + '''}}>Attendance Totals</h3>
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
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#001f35] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60"
                >
                  <option value="all">All Months</option>
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-white/70">
                Year
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#001f35] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60"
                >
                  <option value="all">All Years</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={String(year)}>{year}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-white/70">
                Start Date
                <input
                  type="date"
                  value={rangeStartDate}
                  onChange={(e) => setRangeStartDate(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#001f35] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60 [color-scheme:dark]"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-white/70">
                End Date
                <input
                  type="date"
                  value={rangeEndDate}
                  onChange={(e) => setRangeEndDate(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#001f35] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120]/60 [color-scheme:dark]"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/10 bg-[#021B2C]/70 p-3">
                <p className="text-xs text-white/60">Total Hours</p>
                <p className="mt-1 text-2xl font-semibold text-white">{attendanceTotals.totalHours.toFixed(2)}h</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#021B2C]/70 p-3">
                <p className="text-xs text-white/60">Total Days Worked</p>
                <p className="mt-1 text-2xl font-semibold text-white">{attendanceTotals.totalDaysWorked}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#021B2C]/70 p-3">
                <p className="text-xs text-white/60">Total Late</p>
                <p className="mt-1 text-2xl font-semibold text-white">{attendanceTotals.totalLate}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#021B2C]/70 p-3">
                <p className="text-xs text-white/60">Total Overtime Worked</p>
                <p className="mt-1 text-2xl font-semibold text-white">{attendanceTotals.totalOvertimeHours.toFixed(2)}h</p>
              </div>
            </div>
          </div>
        )}'''
        
        replacement = f'<div className={{cardClass}}>\n        {button_code}\n      </div>'
        
        if re.search(old_pattern, content, re.VERBOSE):
            content = re.sub(old_pattern, replacement, content, count=1, flags=re.VERBOSE)
            print("  ✓ Pattern replaced")
        else:
            # Try a simpler, less strict pattern
            print("  ⚠ Strict pattern not found, trying flexible approach...")
            # Just look for the key markers and replace
            if 'Attendance Totals' in content and '<div className="p-4 sm:p-6 space-y-4">' in content:
                # Find the section and replace manually
                start_marker = 'Attendance Totals</h3>'
                end_marker = '</div>\n          </div>'
                
                if start_marker in content:
                    # This is a rough approach - we'll print a message instead
                    print("  ! Manual intervention needed - structure too different")
                    print("  ! File already has isAttendanceTotalsOpen state added")
                    continue
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("  ✓ File saved")
        
    except Exception as e:
        print(f"  ✗ Error: {e}")

print("\nDone!")
