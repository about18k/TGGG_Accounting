import {
  Calendar,
  CalendarDays,
  Clock,
  User,
  Users,
  UserCheck,
  FolderKanban,
  ClipboardList,
  Upload,
  Briefcase,
  DollarSign,
  UserCircle
} from 'lucide-react';

const SIDEBAR_CONFIGS = {
  ceo: [
    {
      title: 'Personal',
      items: [
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'ceo-calendar', label: 'Calendar', icon: CalendarDays },
      ]
    },
    {
      title: 'Documentation',
      items: [
        { id: 'ceo-bim-docs', label: 'BIM Documents', icon: FolderKanban },
        { id: 'ceo-junior-docs', label: 'Junior Architect Docs', icon: User },
      ]
    },
    {
      title: 'Management',
      items: [
        { id: 'ceo-material-requests', label: 'Material Request & Expenses', icon: ClipboardList },
        { id: 'ceo-employees', label: 'Employees', icon: Users },
        { id: 'ceo-payroll', label: 'Payroll Records', icon: DollarSign },
        { id: 'overtime', label: 'My Overtime', icon: Clock },
        // { id: 'profile', label: 'Profile', icon: UserCircle },
      ]
    }
  ],

  studio_head: [
    {
      title: 'Personal',
      items: [
        { id: 'attendance', label: 'Attendance', icon: Calendar },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        { id: 'overtime', label: 'My Overtime', icon: Clock },
      ]
    },
    {
      title: 'Documentation',
      items: [
        { id: 'studio-head-bim-docs', label: 'BIM Documents', icon: FolderKanban },
        { id: 'studio-head-junior-docs', label: 'Junior Architect Docs', icon: User },
        { id: 'studio-head-material-requests', label: 'Material Request & Expenses', icon: ClipboardList },
      ]
    },
    {
      title: 'Management',
      items: [
        { id: 'approvals', label: 'User Approvals', icon: UserCheck },
        { id: 'users', label: 'Manage Users', icon: Users },
        // { id: 'profile', label: 'Profile', icon: UserCircle },
      ]
    }
  ],

  bim_specialist: [
    {
      title: 'Personal',
      items: [
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        { id: 'overtime', label: 'My Overtime', icon: Clock },
      ]
    },
    {
      title: 'Documentation',
      items: [
        { id: 'documentation', label: 'Documentation', icon: FolderKanban },
        // { id: 'profile', label: 'Profile', icon: UserCircle },
      ]
    }
  ],

  site_engineer: [
    {
      title: 'Personal',
      items: [
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        { id: 'overtime', label: 'My Overtime', icon: Clock },
      ]
    },
    {
      title: 'Management',
      items: [
        { id: 'engineer-hub', label: 'Material Request', icon: ClipboardList },
        // { id: 'profile', label: 'Profile', icon: UserCircle },
      ]
    }
  ],

  site_coordinator: [
    {
      title: 'Personal',
      items: [
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        { id: 'overtime', label: 'My Overtime', icon: Clock },
      ]
    },
    {
      title: 'Management',
      items: [
        { id: 'coordinator-hub', label: 'Material Request', icon: ClipboardList },
        // { id: 'profile', label: 'Profile', icon: UserCircle },
      ]
    }
  ],

  junior_architect: [
    {
      title: 'Personal',
      items: [
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        { id: 'overtime', label: 'My Overtime', icon: Clock },
      ]
    },
    {
      title: 'Documentation',
      items: [
        { id: 'documentation', label: 'Documentation', icon: FolderKanban },
        // { id: 'profile', label: 'Profile', icon: UserCircle },
      ]
    }
  ],

  intern: [
    {
      title: 'Personal',
      items: [
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        { id: 'overtime', label: 'My Overtime', icon: Clock },
        // { id: 'profile', label: 'Profile', icon: UserCircle },
      ]
    }
  ],

  employee: [
    {
      title: 'Personal',
      items: [
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        { id: 'overtime', label: 'My Overtime', icon: Clock },
        { id: 'profile', label: 'Profile', icon: UserCircle },
      ]
    }
  ]
};

export const getSidebarConfig = (role) => {
  return SIDEBAR_CONFIGS[role] || SIDEBAR_CONFIGS.employee;
};

export const getDefaultPage = (role) => {
  const defaults = {
    ceo: 'ceo-dashboard',
    studio_head: 'approvals',
    accounting: 'dashboard',
    site_engineer: 'attendance',
    site_coordinator: 'attendance',
    bim_specialist: 'attendance',
    junior_architect: 'attendance',
    intern: 'attendance',
    employee: 'attendance',
  };
  return defaults[role] || 'attendance';
};
