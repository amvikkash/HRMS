import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Briefcase,
  CalendarClock,
  TrendingUp,
  FileBarChart,
  ShieldCheck,
  ScrollText,
  Building2,
  Wallet,
  ListChecks,
  FileSpreadsheet,
  PlayCircle,
  Radio,
  Presentation,
  UserCheck,
  Receipt,
  MonitorSmartphone,
  ClipboardList,
  LifeBuoy,
} from 'lucide-react';

/**
 * Premium Fly-out Modules Navigation
 * 
 * Single source of truth for app navigation organized as enterprise modules.
 * Each module represents a major area of the HRMS with logical submenus.
 * 
 * Structure:
 * - Module ID: unique identifier
 * - Label: display name (kept short for sidebar)
 * - Description: explains what the module does
 * - Icon: lucide icon for the module
 * - Permission: section-level permission gate
 * - Items: sub-pages and features within the module
 * 
 * Permission system uses existing permission names from backend.
 * Items are shown only if user has permission to view them.
 */
export const NAV_SECTIONS = [
  {
    id: 'root',
    label: 'Dashboard',
    description: 'Workspace overview and quick actions',
    collapsible: true,
    badge: null,
    items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true }],
  },
  {
    id: 'organization',
    label: 'Organization',
    description: 'People and workplace management',
    collapsible: true,
    badge: null,
    items: [
      { to: '/employees', icon: Users, label: 'Employees', permission: 'EMPLOYEE_VIEW' },
      { to: '/employees/import', icon: FileSpreadsheet, label: 'Import Employees', permission: 'EMPLOYEE_CREATE' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    description: 'Track attendance and time off',
    collapsible: true,
    badge: null,
    items: [
      { to: '/attendance', icon: Clock, label: 'Attendance', permission: 'ATTENDANCE_VIEW' },
      { to: '/attendance/devices', icon: Radio, label: 'Devices', permission: 'DEVICE_MANAGE' },
      { to: '/leave', icon: CalendarDays, label: 'Leave Management', permission: 'LEAVE_VIEW' },
    ],
  },
  {
    id: 'talent',
    label: 'Talent',
    description: 'Recruitment and performance',
    collapsible: true,
    badge: null,
    items: [
      { to: '/recruitment', icon: Briefcase, label: 'Recruitment', permission: 'RECRUITMENT_VIEW' },
      { to: '/my-recruitment', icon: UserCheck, label: 'My Recruiting', permission: 'RECRUITMENT_MANAGE' },
      { to: '/my-interviews', icon: CalendarClock, label: 'My Interviews' },
      { to: '/performance', icon: TrendingUp, label: 'Performance', permission: 'PERFORMANCE_VIEW' },
    ],
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    description: 'Workforce activity and compliance',
    collapsible: true,
    permission: 'MONITORING_VIEW',
    badge: null,
    items: [
      { to: '/monitoring', icon: MonitorSmartphone, label: 'Live Activity', end: true },
      { to: '/monitoring/devices', icon: MonitorSmartphone, label: 'Devices', permission: 'MONITORING_VIEW' },
      { to: '/monitoring/activity', icon: Clock, label: 'Activity Log', permission: 'MONITORING_VIEW' },
      { to: '/monitoring/reports', icon: FileBarChart, label: 'Reports', permission: 'MONITORING_VIEW' },
    ],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    description: 'Compensation and salary management',
    collapsible: true,
    permission: 'SALARY_VIEW',
    badge: null,
    items: [
      { to: '/salary', icon: Wallet, label: 'Salary Dashboard', end: true },
      { to: '/salary/employees', icon: ListChecks, label: 'Employee Salary' },
      { to: '/salary/structure', icon: FileSpreadsheet, label: 'Salary Structure' },
      { to: '/salary/payroll-processing', icon: PlayCircle, label: 'Payroll Processing' },
      { to: '/salary/reports', icon: FileBarChart, label: 'Reports' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    description: 'Analytics and reporting',
    collapsible: true,
    badge: null,
    items: [
      { to: '/executive', icon: Presentation, label: 'Executive Dashboard', permission: 'REPORTS_VIEW' },
      { to: '/reports', icon: FileBarChart, label: 'Reports', permission: 'REPORTS_VIEW' },
      { to: '/requirements', icon: ClipboardList, label: 'Requirements' },
    ],
  },
  {
    id: 'administration',
    label: 'Settings',
    description: 'System configuration and administration',
    collapsible: true,
    badge: null,
    items: [
      { to: '/settings/users', icon: ShieldCheck, label: 'Users & Roles', permission: 'USER_VIEW' },
      { to: '/settings/organization', icon: Building2, label: 'Organization Settings', permission: 'ORG_VIEW' },
      { to: '/settings/leave', icon: CalendarDays, label: 'Leave Configuration', permission: 'LEAVE_MANAGE' },
      { to: '/settings/audit', icon: ScrollText, label: 'Audit Logs', permission: 'AUDIT_VIEW' },
      { to: '/settings/platform', icon: ShieldCheck, label: 'Platform Admin', role: 'SUPER_ADMIN' },
      { to: '/onboarding', icon: ClipboardList, label: 'Workspace Setup' },
      { to: '/support', icon: LifeBuoy, label: 'Support Information' },
    ],
  },
];

/** Flat list of every navigable page, each tagged with its section label -
 *  what the search index and favorites picker actually iterate over. */
export const NAV_INDEX = NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.label, permission: item.permission || section.permission }))
);

export function findNavItemByPath(path) {
  return NAV_INDEX.find((item) => item.to === path);
}

/** Filters sections/items down to what a user with the given `hasPermission`
 *  check can actually reach. An item/section with no `permission` tag is
 *  assumed open to any authenticated user (matches today's backend reality
 *  for modules that haven't had permission codes carved out yet). */
export function visibleNavSections(hasPermission, hasRole = () => false) {
  return NAV_SECTIONS.map((section) => {
    const items = section.items.filter((item) => {
      const required = item.permission || section.permission;
      return (!required || hasPermission(required)) && (!item.role || hasRole(item.role));
    });
    return { ...section, items };
  }).filter((section) => section.items.length > 0);
}
