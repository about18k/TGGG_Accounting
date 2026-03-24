import re

with open('frontend/src/pages/dashboards/Public_Dashboard/PublicNavigation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

merged_block = """                        sections = [
                          {
                            title: 'Personal',
                            items: [
                              { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                              { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
                              { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                              { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                            ]
                          },
                          {
                            title: 'Documentation',
                            items: [
                              { id: 'documentation', label: 'Docs', icon: FolderKanban, path: 'documentation' },
                            ]
                          }
                        ];
                      } else if (user?.role === 'junior_architect') {
                        sections = [
                          {
                            title: 'Personal',
                            items: [
                              { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                              { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
                              { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                              { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                            ]
                          },
                          {
                            title: 'Documentation',
                            items: [
                              { id: 'documentation', label: 'Docs', icon: FolderKanban, path: 'documentation' },
                            ]
                          }
                        ];
                      } else if (user?.role === 'site_engineer') {
                        sections = [
                          {
                            title: 'Personal',
                            items: [
                              { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                              { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
                              { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                              { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                            ]
                          },
                          {
                            title: 'Management',
                            items: [
                              { id: 'engineer-hub', label: 'MatReq', icon: ClipboardList, path: 'engineer-hub' },
                            ]
                          }
                        ];
                      } else if (user?.role === 'site_coordinator') {
                        sections = [
                          {
                            title: 'Personal',
                            items: [
                              { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                              { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
                              { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                              { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                            ]
                          },
                          {
                            title: 'Management',
                            items: [
                              { id: 'coordinator-hub', label: 'MatReq', icon: ClipboardList, path: 'coordinator-hub' },
                            ]
                          }
                        ];
                      } else if (user?.role === 'intern') {
                        sections = [
                          {
                            title: 'Personal',
                            items: [
                              { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                              { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
                              { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                              { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                            ]
                          }
                        ];
                      } else if (user?.role === 'employee') {
                        sections = [
                          {
                            title: 'Personal',
                            items: [
                              { id: 'attendance', label: 'Dashboard', icon: Home, path: 'attendance' },
                              { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
                              { id: 'overtime', label: 'OT', icon: Clock, path: 'overtime' },
                              { id: 'todo', label: 'Todo', icon: CheckSquare, path: 'todo' },
                            ]
                          }
                        ];
                      } else if (user?.role === 'ceo' || user?.role === 'president') {
                        sections = [
                          {
                            title: 'Personal',
                            items: [
                              { id: 'attendance', label: 'Attendance', icon: Clock, path: 'attendance' },
                            ]
                          },
                          {
                            title: 'Documentation',
                            items: [
                              { id: 'ceo-bim-docs', label: 'BIM Documentation', icon: FolderKanban, path: 'ceo-bim-docs' },
                              { id: 'ceo-junior-docs', label: 'Junior Architect Docs', icon: User, path: 'ceo-junior-docs' },
                            ]
                          },
                          {
                            title: 'Management',
                            items: [
                              { id: 'ceo-material-requests', label: 'Material Requests', icon: ClipboardList, path: 'ceo-material-requests' },
                            ]
                          }
                        ];
                      }"""

pattern = re.compile(r'<<<<<<< HEAD\n.*?\n=======\n.*?\n>>>>>>> upstream/main\n', re.DOTALL)
new_content = pattern.sub(merged_block + '\n', content)

with open('frontend/src/pages/dashboards/Public_Dashboard/PublicNavigation.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
