import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, UserCheck, CalendarOff, Clock3, Inbox, FileText, ArrowRight, ClipboardCheck, PencilLine, Sparkles, Plus, BarChart3, BriefcaseBusiness, Settings2, WalletCards, TrendingUp, LifeBuoy, PackageOpen } from 'lucide-react';
import { dashboardApi } from '../api/endpoints/dashboard';
import { leaveRequestsApi } from '../api/endpoints/leave';
import { documentsApi, DOCUMENT_TYPE_LABEL } from '../api/endpoints/documents';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCard, SkeletonText } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';

export default function Dashboard() {
  const { user, hasPermission, hasRole } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const firstName = user?.fullName?.split(' ')[0];
  const [feedMode, setFeedMode] = useState('Post');

  // A plain EMPLOYEE (seeded with zero permissions - see DataSeeder) lands
  // here right after login with none of EMPLOYEE_VIEW/LEAVE_VIEW/etc. Skip
  // the org-wide queries entirely for that case rather than firing them
  // and showing an error card as someone's first impression after signing
  // in - see the lightweight branch in the return below.
  const canViewOrgSummary = hasPermission('EMPLOYEE_VIEW');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
    enabled: canViewOrgSummary,
  });

  // Approval Queue needs LEAVE_VIEW, which not every role that can see the
  // Dashboard has (Employee, for instance) - skip the request entirely
  // rather than firing it and eating a 403 the person can't act on anyway.
  const canViewApprovals = hasPermission('LEAVE_VIEW') || hasPermission('LEAVE_APPROVE');
  // LEAVE_MANAGE (HR/Admin) sees every pending request org-wide; a Manager
  // has LEAVE_APPROVE without LEAVE_MANAGE and should only see their own
  // direct reports' requests - Phase 1/2 flagged that this wasn't actually
  // scoped yet. /api/dashboard/my-team is the fix for that path.
  const isTeamScoped = hasPermission('LEAVE_APPROVE') && !hasPermission('LEAVE_MANAGE');

  const {
    data: pendingLeave,
    isLoading: pendingLeaveLoading,
    isError: pendingLeaveError,
    refetch: refetchPendingLeave,
  } = useQuery({
    queryKey: ['leave-requests', 'PENDING'],
    queryFn: () => leaveRequestsApi.list('PENDING'),
    enabled: canViewApprovals && !isTeamScoped,
  });

  const {
    data: myTeam,
    isLoading: myTeamLoading,
    isError: myTeamError,
    refetch: refetchMyTeam,
  } = useQuery({
    queryKey: ['dashboard-my-team'],
    queryFn: dashboardApi.myTeam,
    enabled: isTeamScoped,
  });

  const approvalQueue = isTeamScoped ? myTeam?.pendingApprovals : pendingLeave;
  const approvalQueueLoading = isTeamScoped ? myTeamLoading : pendingLeaveLoading;
  const approvalQueueError = isTeamScoped ? myTeamError : pendingLeaveError;
  const refetchApprovalQueue = isTeamScoped ? refetchMyTeam : refetchPendingLeave;

  // /api/documents/expiring-soon requires EMPLOYEE_MANAGE - skip the
  // request entirely for roles that don't have it, same reasoning as the
  // Approval Queue skipping its own query above.
  const canViewExpiringDocs = hasPermission('EMPLOYEE_MANAGE');
  const {
    data: expiringDocs,
    isLoading: expiringDocsLoading,
    isError: expiringDocsError,
    refetch: refetchExpiringDocs,
  } = useQuery({
    queryKey: ['documents-expiring-soon'],
    queryFn: () => documentsApi.expiringSoon(30),
    enabled: canViewExpiringDocs,
  });

  const decideLeave = useMutation({
    mutationFn: ({ id, approve }) => (approve ? leaveRequestsApi.approve(id) : leaveRequestsApi.reject(id)),
    onSuccess: () => {
      toast.success('Leave request updated.');
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-my-team'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not update the leave request.'),
  });

  const pendingCount = approvalQueue?.length || 0;
  const expiringCount = expiringDocs?.length || 0;
  const kpis = data
    ? [
        { label: 'Total Employees', value: data.totalEmployees, icon: Users, accent: 'var(--hz-primary-600)' },
        { label: 'Active', value: data.activeEmployees, icon: UserCheck, accent: 'var(--hz-success-500)' },
        { label: 'On Leave', value: data.onLeave, icon: CalendarOff, accent: 'var(--hz-warning-500)' },
        { label: 'Pending Actions', value: pendingCount, icon: ClipboardCheck, accent: 'var(--hz-primary-600)' },
      ]
    : [];

  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  if (hasRole('EMPLOYEE')) {
    return <EmployeeDashboard firstName={firstName} greeting={greeting} today={today} />;
  }

  const attentionItems = [
    { label: 'Leave requests', count: pendingCount, detail: pendingCount ? 'Waiting for review' : 'All requests are up to date', icon: CalendarOff, to: '/leave' },
    { label: 'Attendance exceptions', count: null, detail: 'Review attendance records', icon: Clock3, to: '/attendance' },
    { label: 'Employee documents', count: expiringCount, detail: expiringCount ? 'Expiring within 30 days' : 'No documents need attention', icon: FileText, to: '/employees' },
  ];

  const modules = [
    { title: 'Workforce', description: 'Manage employees, profiles, and organization structure.', icon: Users, accent: 'blue', to: '/employees' },
    { title: 'Attendance', description: 'Track attendance and view workforce records.', icon: Clock3, accent: 'green', to: '/attendance' },
    { title: 'Leave', description: 'Manage leave and time-off workflows.', icon: CalendarOff, accent: 'orange', to: '/leave' },
    { title: 'Payroll', description: 'Manage payroll and salary information.', icon: WalletCards, accent: 'blue', to: '/salary', permission: 'SALARY_VIEW' },
    { title: 'Performance', description: 'Manage goals and performance reviews.', icon: TrendingUp, accent: 'violet', to: '/performance' },
    { title: 'Reports', description: 'Access workforce and HR reports.', icon: FileText, accent: 'blue', to: '/reports', permission: 'REPORTS_VIEW' },
    { title: 'Recruitment', description: 'Manage open roles and candidate pipelines.', icon: BriefcaseBusiness, accent: 'orange', to: '/recruitment', permission: 'RECRUITMENT_VIEW' },
    { title: 'Settings', description: 'Configure your organization and workspace.', icon: Settings2, accent: 'green', to: '/settings/organization', permission: 'ORG_VIEW' },
  ].filter((module) => !module.permission || hasPermission(module.permission));

  return (
    <div className="hz-dashboard">
      <header className="hz-dashboard__welcome">
        <div>
          <p className="hz-dashboard__eyebrow">{today}</p>
          <h1>{greeting}, {firstName || 'Vikkash'}</h1>
          <p>Here&apos;s what&apos;s happening across your organization today.</p>
        </div>
        <div className="hz-dashboard__welcome-mark" aria-hidden="true"><Users size={21} /></div>
      </header>

      <section className="hz-dashboard__explore" aria-labelledby="explore-title">
        <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Your workspace</span><h2 id="explore-title">Explore Vettri HRMS</h2></div></div>
        <div className="hz-dashboard__module-grid">
          {modules.map(({ title, description, icon: Icon, accent, to }) => <Link to={to} className="hz-dashboard__module-card" key={title}>
            <span className={`hz-dashboard__module-icon hz-dashboard__module-icon--${accent}`}><Icon size={19} /></span>
            <span className="hz-dashboard__module-copy"><strong>{title}</strong><small>{description}</small></span>
            <ArrowRight size={16} />
          </Link>)}
        </div>
      </section>

      <section className="hz-dashboard__metrics" aria-labelledby="workforce-metrics-title">
        <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">At a glance</span><h2 id="workforce-metrics-title">Workforce metrics</h2></div><Link to="/employees" className="hz-dashboard__text-link">View workforce <ArrowRight size={15} /></Link></div>
        <div className="hz-dashboard__metric-grid">
          {(data ? kpis : [
            { label: 'Total Employees', value: '--', icon: Users, accent: 'var(--hz-primary-600)' },
            { label: 'Active', value: '--', icon: UserCheck, accent: 'var(--hz-primary-600)' },
            { label: 'On Leave', value: '--', icon: CalendarOff, accent: 'var(--hz-primary-600)' },
            { label: 'Pending Actions', value: '--', icon: ClipboardCheck, accent: 'var(--hz-primary-600)' },
          ]).map(({ label, value, icon: Icon, accent }) => <article className="hz-dashboard__metric" key={label}>
            <div className="hz-dashboard__metric-icon" style={{ color: accent }}><Icon size={19} /></div>
            <span>{label}</span><strong>{value}</strong>
            <small>{label === 'Active' && data ? `${data.totalEmployees ? ((data.activeEmployees / data.totalEmployees) * 100).toFixed(1) : 0}% of workforce` : label === 'On Leave' ? (data?.onLeave ? 'Today' : 'No leave recorded today') : label === 'Pending Actions' ? (pendingCount ? 'Requires attention' : 'All caught up') : (data?.totalEmployees ? 'Current workforce' : 'No employees yet')}</small>
          </article>)}
        </div>
      </section>

      <div className="hz-dashboard__primary-grid">
        <section className="hz-dashboard__surface" aria-labelledby="attention-title">
          <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Action queue</span><h2 id="attention-title">Needs your attention</h2></div><span className="hz-dashboard__count-badge">{pendingCount} pending</span></div>
          <div className="hz-dashboard__attention-list">
            {attentionItems.map(({ label, count, detail, icon: Icon, to }) => <Link to={to} className="hz-dashboard__attention-row" key={label}>
              <span className="hz-dashboard__row-icon"><Icon size={18} /></span><span className="hz-dashboard__row-copy"><strong>{label}</strong><small>{detail}</small></span><span className={`hz-dashboard__row-count ${count === 0 ? 'is-clear' : ''}`}>{count === null ? 'View' : count}</span><ArrowRight size={16} />
            </Link>)}
          </div>
        </section>

        <section className="hz-dashboard__surface" aria-labelledby="quick-actions-title">
          <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Shortcuts</span><h2 id="quick-actions-title">Quick actions</h2></div></div>
          <div className="hz-dashboard__action-grid">
            <Link to="/employees"><Users size={18} /><span>Manage employees</span></Link>
            <Link to="/employees/import"><Inbox size={18} /><span>Import employees</span></Link>
            <Link to="/leave"><CalendarOff size={18} /><span>Manage leave</span></Link>
            <Link to="/reports"><FileText size={18} /><span>Generate report</span></Link>
          </div>
        </section>
      </div>

      <section className="hz-dashboard__surface hz-dashboard__insights" aria-labelledby="insights-title">
        <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Workforce intelligence</span><h2 id="insights-title">Workforce insights</h2></div><BarChart3 size={20} aria-hidden="true" /></div>
        <div className="hz-dashboard__empty-inline"><BarChart3 size={22} /><div><strong>Insights will appear as your workforce grows</strong><small>Connect attendance, leave, and employee data to see trends here.</small></div></div>
      </section>

      <div className="hz-dashboard__secondary-grid">
        <section className="hz-dashboard__surface hz-dashboard__updates" aria-labelledby="updates-title">
          <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Company feed</span><h2 id="updates-title">Organization updates</h2></div></div>
          <div className="hz-post-box">
            <div className="hz-post-box__actions"><button type="button" className={feedMode === 'Post' ? 'active' : ''} onClick={() => setFeedMode('Post')}><PencilLine size={15} /> Post</button><button type="button" className={feedMode === 'Poll' ? 'active' : ''} onClick={() => setFeedMode('Poll')}><ClipboardCheck size={15} /> Poll</button><button type="button" className={feedMode === 'Praise' ? 'active' : ''} onClick={() => setFeedMode('Praise')}><Sparkles size={15} /> Praise</button></div>
            <div className="hz-post-box__placeholder">{feedMode} updates are not configured for this workspace yet.</div>
          </div>
        </section>
        <section className="hz-dashboard__surface" aria-labelledby="holiday-title">
          <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Plan ahead</span><h2 id="holiday-title">Upcoming holiday</h2></div></div>
          <div className="hz-dashboard__holiday hz-dashboard__holiday--empty"><span>No holiday data available</span><strong>Upcoming holidays</strong><small>Add or configure holidays to see them here.</small><Link to="/reports">View holiday calendar <ArrowRight size={14} /></Link></div>
        </section>
      </div>

      <section className="hz-dashboard__support-strip" aria-labelledby="support-strip-title">
        <div><span className="hz-dashboard__section-kicker">Need a hand?</span><h2 id="support-strip-title">Support information</h2><p>Reach the right team for your Vettri HRMS questions.</p></div>
        <Link to="/support" className="hz-dashboard__text-link">View all support info <ArrowRight size={15} /></Link>
        <LifeBuoy size={28} aria-hidden="true" />
      </section>
    </div>
  );
}

function EmployeeDashboard({ firstName, greeting, today }) {
  const services = [
    { title: 'My Profile', description: 'Keep your personal and employment details close at hand.', icon: UserCheck, to: '/my-profile' },
    { title: 'Attendance', description: 'Review your recorded punches and attendance history.', icon: Clock3, to: '/my-profile?tab=attendance' },
    { title: 'Leave', description: 'View balances and follow your leave requests.', icon: CalendarOff, to: '/my-profile?tab=leave' },
    { title: 'My Salary / Payroll', description: 'Access your salary details and payslip information.', icon: WalletCards, to: '/my-payslip' },
    { title: 'My Documents', description: 'Review the documents held on your employee record.', icon: FileText, to: '/my-profile?tab=documents' },
    { title: 'My Assets', description: 'See assets currently assigned to you.', icon: PackageOpen, to: '/my-profile?tab=assets' },
  ];

  return (
    <div className="hz-dashboard">
      <header className="hz-dashboard__welcome">
        <div>
          <p className="hz-dashboard__eyebrow">{today}</p>
          <h1>{greeting}, {firstName || 'there'}</h1>
          <p>Your employee workspace, shaped around the things you need most.</p>
        </div>
        <div className="hz-dashboard__welcome-mark" aria-hidden="true"><UserCheck size={21} /></div>
      </header>
      <section className="hz-dashboard__explore" aria-labelledby="employee-services-title">
        <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Employee services</span><h2 id="employee-services-title">Your workspace</h2></div></div>
        <div className="hz-dashboard__module-grid">
          {services.map(({ title, description, icon: Icon, to }) => (
            <Link to={to} className="hz-dashboard__module-card" key={title}>
              <span className="hz-dashboard__module-icon hz-dashboard__module-icon--blue"><Icon size={19} /></span>
              <span className="hz-dashboard__module-copy"><strong>{title}</strong><small>{description}</small></span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>
      <section className="hz-dashboard__support-strip" aria-labelledby="employee-support-title">
        <div><span className="hz-dashboard__section-kicker">Need a hand?</span><h2 id="employee-support-title">Support information</h2><p>Reach the right team for your Vettri HRMS questions.</p></div>
        <Link to="/support" className="hz-dashboard__text-link">View support info <ArrowRight size={15} /></Link>
        <LifeBuoy size={28} aria-hidden="true" />
      </section>
    </div>
  );
}
