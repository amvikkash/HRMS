import { Link, useLocation, matchPath } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useBreadcrumbOverride } from './BreadcrumbContext';

/**
 * One entry per route in App.jsx. `crumbs` is the full trail for that
 * route; the last entry can be `dynamic: true`, meaning its label should
 * be replaced by whatever the page sets via useBreadcrumbLabel() once its
 * data loads (falls back to `label` if the page hasn't set one yet).
 */
const ROUTES = [
  { pattern: '/dashboard', crumbs: [{ label: 'Dashboard' }] },

  { pattern: '/employees', crumbs: [{ label: 'Employees' }] },
  {
    pattern: '/employees/:id',
    crumbs: [{ label: 'Employees', path: '/employees' }, { label: 'Employee', dynamic: true }],
  },

  { pattern: '/attendance', crumbs: [{ label: 'Attendance' }] },
  {
    pattern: '/attendance/devices',
    crumbs: [{ label: 'Attendance', path: '/attendance' }, { label: 'Devices' }],
  },

  { pattern: '/leave', crumbs: [{ label: 'Leave' }] },
  { pattern: '/my-payslip', crumbs: [{ label: 'My Payslip', dynamic: true }] },
  { pattern: '/my-profile', crumbs: [{ label: 'My Profile' }] },
  { pattern: '/notifications', crumbs: [{ label: 'Notifications' }] },

  { pattern: '/recruitment', crumbs: [{ label: 'Recruitment' }] },
  {
    pattern: '/recruitment/:jobOpeningId',
    crumbs: [{ label: 'Recruitment', path: '/recruitment' }, { label: 'Pipeline', dynamic: true }],
  },
  { pattern: '/my-interviews', crumbs: [{ label: 'My Interviews' }] },
  { pattern: '/my-recruitment', crumbs: [{ label: 'My Recruiting' }] },

  { pattern: '/performance', crumbs: [{ label: 'Performance' }] },

  { pattern: '/salary', crumbs: [{ label: 'Payroll', path: '/salary' }, { label: 'Salary Dashboard' }] },
  {
    pattern: '/salary/employees',
    crumbs: [{ label: 'Payroll', path: '/salary' }, { label: 'Employee Salary' }],
  },
  {
    pattern: '/salary/employees/:employeeId',
    crumbs: [
      { label: 'Payroll', path: '/salary' },
      { label: 'Employee Salary', path: '/salary/employees' },
      { label: 'Salary Details', dynamic: true },
    ],
  },
  {
    pattern: '/salary/structure',
    crumbs: [{ label: 'Payroll', path: '/salary' }, { label: 'Salary Structure' }],
  },
  {
    pattern: '/salary/payroll-processing',
    crumbs: [{ label: 'Payroll', path: '/salary' }, { label: 'Payroll Processing' }],
  },
  {
    pattern: '/salary/reports',
    crumbs: [{ label: 'Payroll', path: '/salary' }, { label: 'Salary Reports' }],
  },

  { pattern: '/reports', crumbs: [{ label: 'Reports' }] },
  { pattern: '/executive', crumbs: [{ label: 'Executive Overview' }] },

  {
    pattern: '/settings/users',
    crumbs: [{ label: 'Settings', path: '/settings/users' }, { label: 'Users & Roles' }],
  },
  {
    pattern: '/settings/organization',
    crumbs: [{ label: 'Settings', path: '/settings/users' }, { label: 'Organization' }],
  },
  {
    pattern: '/settings/leave',
    crumbs: [{ label: 'Settings', path: '/settings/users' }, { label: 'Leave Settings' }],
  },
  {
    pattern: '/settings/audit',
    crumbs: [{ label: 'Settings', path: '/settings/users' }, { label: 'Audit Logs' }],
  },
  {
    pattern: '/settings/platform',
    crumbs: [{ label: 'Platform', path: '/settings/platform' }, { label: 'Administration' }],
  },
  { pattern: '/requirements', crumbs: [{ label: 'Requirements' }] },
  { pattern: '/monitoring', crumbs: [{ label: 'Monitoring' }] },
  { pattern: '/monitoring/devices', crumbs: [{ label: 'Monitoring', path: '/monitoring' }, { label: 'Devices' }] },
  { pattern: '/monitoring/devices/:id', crumbs: [{ label: 'Monitoring', path: '/monitoring' }, { label: 'Devices', path: '/monitoring/devices' }, { label: 'Device', dynamic: true }] },
  { pattern: '/monitoring/activity', crumbs: [{ label: 'Monitoring', path: '/monitoring' }, { label: 'Activity' }] },
  { pattern: '/monitoring/reports', crumbs: [{ label: 'Monitoring', path: '/monitoring' }, { label: 'Reports' }] },
];

export default function Breadcrumbs() {
  const location = useLocation();
  const override = useBreadcrumbOverride();

  const matched = ROUTES.find((r) => matchPath({ path: r.pattern, end: true }, location.pathname));

  // Dashboard is the app's home - showing "Home > Dashboard" is redundant,
  // so the trail collapses to just the Home icon there.
  if (!matched || matched.pattern === '/dashboard') {
    return (
      <nav aria-label="Breadcrumb" className="d-flex align-items-center gap-1 mb-3">
        <Home size={14} color="var(--hz-text-muted)" />
      </nav>
    );
  }

  const crumbs = matched.crumbs.map((c) => (c.dynamic ? { ...c, label: override || c.label } : c));

  return (
    <nav aria-label="Breadcrumb" className="d-flex align-items-center flex-wrap gap-1 mb-3">
      <Link to="/dashboard" className="hz-breadcrumb-link d-flex align-items-center" aria-label="Dashboard">
        <Home size={14} />
      </Link>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${i}`} className="d-flex align-items-center gap-1">
            <ChevronRight size={13} color="var(--hz-text-muted)" />
            {isLast || !crumb.path ? (
              <span className={isLast ? 'hz-breadcrumb-current' : 'hz-breadcrumb-link'}>{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="hz-breadcrumb-link">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
