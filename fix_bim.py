#!/usr/bin/env python3
"""Quick fix for the @@ issue in BimSpecialistDashboard."""

file_path = r"c:\Users\Kimberly Faith Ytac\TGGG_Accounting\frontend\src\pages\dashboards\BimSpecialist\BimSpecialistDashboard.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the doubled @@ 
content = content.replace('  @@  const [isAttendanceTotalsOpen', '  const [isAttendanceTotalsOpen')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")
