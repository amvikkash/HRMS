import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, UserCheck, CalendarOff, CalendarDays, Clock3, Inbox, FileText, ArrowRight, ClipboardCheck, PencilLine, Sparkles, Plus, BarChart3, BriefcaseBusiness, Settings2, WalletCards, TrendingUp, LifeBuoy, PackageOpen } from 'lucide-react';
import { BarChart, Bar as RechartsBar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dashboardApi } from '../api/endpoints/dashboard';
import { holidaysApi, leaveRequestsApi } from '../api/endpoints/leave';
import { documentsApi, DOCUMENT_TYPE_LABEL } from '../api/endpoints/documents';
import { employeesApi } from '../api/endpoints/employees';
import { attendanceApi } from '../api/endpoints/attendance';
import { employeeSalaryApi } from '../api/endpoints/salary';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCard, SkeletonText } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { formatCurrency } from '../utils/formatCurrency';
import { selfServiceApi } from '../api/endpoints/selfService';
import Dialog from '../components/ui/Dialog';
import StatCard from '../components/ui/StatCard';
import ChartCard from '../components/ui/ChartCard';

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
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  if (hasRole('EMPLOYEE')) {
    return <EmployeeDashboard employeeId={user?.employeeId} firstName={firstName} greeting={greeting} today={today} />;
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
          <StatCard label="Total employees" value={data?.totalEmployees ?? '--'} detail={data?.totalEmployees ? 'Current workforce' : 'No employees yet'} icon={Users} loading={isLoading} />
          <StatCard label="Active" value={data?.activeEmployees ?? '--'} detail={data?.totalEmployees ? `${((data.activeEmployees / data.totalEmployees) * 100).toFixed(1)}% of workforce` : 'Current workforce'} icon={UserCheck} accent="success" loading={isLoading} />
          <StatCard label="On leave" value={data?.onLeave ?? '--'} detail={data?.onLeave ? 'Today' : 'No leave recorded today'} icon={CalendarOff} accent="warning" loading={isLoading} />
          <StatCard label="Pending actions" value={pendingCount} detail={pendingCount ? 'Requires attention' : 'All caught up'} icon={ClipboardCheck} accent={pendingCount ? 'danger' : 'primary'} loading={approvalQueueLoading} />
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

      <ChartCard title="Workforce overview" subtitle="A simple operational view of today's workforce" className="hz-dashboard__insights" actions={<Link to="/reports" className="hz-dashboard__text-link">Open reports <ArrowRight size={15} /></Link>}>
        {data ? <ResponsiveContainer width="100%" height={220}>
          <BarChart data={[{ label: 'Active', value: data.activeEmployees }, { label: 'On leave', value: data.onLeave }, { label: 'Other', value: Math.max(0, data.totalEmployees - data.activeEmployees) }]} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--hz-border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: 'var(--hz-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: 'var(--hz-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'var(--hz-primary-50)' }} contentStyle={{ border: '1px solid var(--hz-border)', borderRadius: 8, fontSize: 12 }} />
            <RechartsBar dataKey="value" fill="var(--hz-primary-500)" radius={[6, 6, 0, 0]} name="Employees" />
          </BarChart>
        </ResponsiveContainer> : <div className="hz-dashboard__empty-inline"><BarChart3 size={22} /><div><strong>Insights will appear as your workforce grows</strong><small>Connect attendance, leave, and employee data to see trends here.</small></div></div>}
      </ChartCard>

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

function EmployeeDashboard({ employeeId, firstName, greeting, today }) {
  const year = new Date().getFullYear();
  const { hasPermission } = useAuth();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vettri.dashboard.sections')) || { glance: true, workspace: true, actions: true, support: true };
    } catch {
      return { glance: true, workspace: true, actions: true, support: true };
    }
  });
  useEffect(() => {
    localStorage.setItem('vettri.dashboard.sections', JSON.stringify(visibleSections));
  }, [visibleSections]);
  const { data: employee } = useQuery({
    queryKey: ['employee-dashboard-profile', employeeId],
    queryFn: () => employeesApi.getById(employeeId),
    enabled: !!employeeId,
  });
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['employee-dashboard-attendance', employeeId],
    queryFn: () => attendanceApi.byEmployee(employeeId),
    enabled: !!employeeId,
  });
  const { data: leaveBalanceData, isLoading: leaveLoading } = useQuery({
    queryKey: ['employee-dashboard-leave-balance', employeeId, year],
    queryFn: () => leaveRequestsApi.balance(employeeId, year),
    enabled: !!employeeId,
  });
  const { data: leaveRequestsData } = useQuery({
    queryKey: ['employee-dashboard-leave', employeeId],
    queryFn: () => leaveRequestsApi.byEmployee(employeeId),
    enabled: !!employeeId,
  });
  const { data: documentsData } = useQuery({
    queryKey: ['employee-dashboard-documents', employeeId],
    queryFn: () => documentsApi.byEmployee(employeeId),
    enabled: !!employeeId,
  });
  const { data: assetsData } = useQuery({
    queryKey: ['employee-dashboard-assets'],
    queryFn: selfServiceApi.assets,
    enabled: !!employeeId,
  });
  const { data: salary } = useQuery({
    queryKey: ['employee-dashboard-salary', employeeId],
    queryFn: () => employeeSalaryApi.getDetail(employeeId),
    enabled: !!employeeId,
  });
  const { data: holidaysData } = useQuery({
    queryKey: ['employee-dashboard-holidays'],
    queryFn: holidaysApi.list,
    enabled: !!employeeId,
  });

  const attendance = Array.isArray(attendanceData) ? attendanceData : [];
  const leaveBalance = Array.isArray(leaveBalanceData) ? leaveBalanceData : [];
  const leaveRequests = Array.isArray(leaveRequestsData) ? leaveRequestsData : [];
  const documents = Array.isArray(documentsData) ? documentsData : [];
  const assets = Array.isArray(assetsData) ? assetsData : [];
  const holidays = Array.isArray(holidaysData) ? holidaysData : [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayPunches = attendance.filter((record) => typeof record.punchTime === 'string' && record.punchTime.slice(0, 10) === todayKey);
  const hasCheckedIn = todayPunches.some((record) => record.punchType === 'IN');
  const hasCheckedOut = todayPunches.some((record) => record.punchType === 'OUT');
  const nextHoliday = holidays
    .filter((holiday) => typeof holiday.date === 'string' && holiday.date >= todayKey)
    .sort((first, second) => first.date.localeCompare(second.date))[0];
  const pendingLeave = leaveRequests.filter((request) => request.status === 'PENDING').length;
  const totalRemainingLeave = leaveBalance.reduce((total, item) => total + (item.remainingDays || 0), 0);

  const latestPayslip = salary?.payrollHistory?.[0];
  const attendanceTime = todayPunches.find((record) => record.punchType === 'IN')?.punchTime;
  const services = [
    { group: 'My work', title: 'My Profile', description: 'Personal and employment information', context: 'View profile', icon: UserCheck, to: '/my-profile' },
    { group: 'My work', title: 'My Job', description: 'Role, department and reporting details', context: 'View job', icon: BriefcaseBusiness, to: '/my-profile?tab=job' },
    { group: 'My work', title: 'Attendance', description: 'Today\'s attendance and attendance history', context: 'View attendance', icon: Clock3, to: '/my-profile?tab=attendance' },
    { group: 'My work', title: 'Leave', description: 'Balances, requests and leave history', context: 'View leave', icon: CalendarOff, to: '/my-profile?tab=leave' },
    { group: 'My work', title: 'My Interviews', description: 'Upcoming interviews and feedback', context: 'View interviews', icon: CalendarDays, to: '/my-interviews' },
    { group: 'Pay & documents', title: 'My Pay', description: 'Salary details and latest payslips', context: 'View pay', icon: WalletCards, to: '/my-payslip' },
    { group: 'Pay & documents', title: 'My Documents', description: 'Documents held on your employee record', context: 'View documents', icon: FileText, to: '/my-profile?tab=documents' },
    { group: 'My company', title: 'My Assets', description: 'Company equipment assigned to you', context: 'View assets', icon: PackageOpen, to: '/my-profile?tab=assets' },
    { group: 'My company', title: 'Notifications', description: 'Updates related to your employee account', context: 'View notifications', icon: Inbox, to: '/notifications' },
    ...(hasPermission('LEAVE_APPROVE') ? [{ group: 'My company', title: 'My Team', description: 'Leave workflows assigned to you', context: 'View team leave', icon: Users, to: '/leave' }] : []),
  ];

  return (
    <div className="hz-dashboard">
      <header className="hz-dashboard__welcome">
        <div>
          <p className="hz-dashboard__eyebrow">{today}</p>
          <h1>{greeting}, {firstName || 'there'}</h1>
          <p>Your employee workspace, shaped around the things you need most.</p>
        </div>
        <Avatar name={employee?.fullName || firstName} src={employee?.profilePhotoUrl} size="md" />
        <button type="button" className="hz-dashboard__customize" onClick={() => setCustomizeOpen(true)}>Customize</button>
      </header>
      <section className="hz-dashboard__quick-actions" aria-labelledby="employee-quick-actions-title">
        <div>
          <span className="hz-dashboard__section-kicker">Shortcuts</span>
          <h2 id="employee-quick-actions-title">Quick actions</h2>
        </div>
        <div className="hz-dashboard__quick-actions-list">
          <Link to="/my-profile?tab=attendance"><Clock3 size={17} /> Check attendance</Link>
          <Link to="/my-profile?tab=leave"><CalendarOff size={17} /> Apply leave</Link>
          <Link to="/my-payslip"><WalletCards size={17} /> View payslip</Link>
          <Link to="/my-profile?tab=documents"><FileText size={17} /> My documents</Link>
          <Link to="/my-profile"><UserCheck size={17} /> My profile</Link>
        </div>
      </section>
      {visibleSections.glance && <section className="hz-dashboard__employee-status" aria-labelledby="today-glance-title">
        <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Your day</span><h2 id="today-glance-title">Today at a glance</h2></div></div>
        <div className="hz-dashboard__employee-status-grid">
          <EmployeeMetric icon={Clock3} label="Attendance" value={attendanceLoading ? 'Loading' : hasCheckedIn ? 'Present' : 'Not recorded'} detail={attendanceTime ? `Checked in at ${new Date(attendanceTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No check-in recorded today'} tone="blue" />
          <EmployeeMetric icon={CalendarOff} label="Leave balance" value={leaveLoading ? 'Loading' : `${totalRemainingLeave} days`} detail={`${year} available balance`} tone="green" />
          <EmployeeMetric icon={WalletCards} label="Payroll" value={latestPayslip ? 'Latest payslip' : salary?.currentStructure ? 'Available' : 'Not configured'} detail={latestPayslip?.paymentDate ? new Date(latestPayslip.paymentDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : salary?.currentStructure ? 'View your salary details' : 'Your pay will appear here'} tone="gold" />
          <EmployeeMetric icon={CalendarDays} label="Next holiday" value={nextHoliday?.date ? new Date(`${nextHoliday.date}T00:00:00`).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) : 'None scheduled'} detail={nextHoliday?.name || 'Company calendar'} tone="blue" />
        </div>
      </section>}
      {visibleSections.workspace && <section className="hz-dashboard__explore" aria-labelledby="employee-services-title">
        <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Employee services</span><h2 id="employee-services-title">Your workspace</h2></div><Link to="/my-profile" className="hz-dashboard__text-link">Open profile <ArrowRight size={15} /></Link></div>
        <div className="hz-dashboard__workspace-groups">
          {['My work', 'Pay & documents', 'My company'].map((group) => <div className="hz-dashboard__workspace-group" key={group}>
            <h3>{group}</h3>
            <div className="hz-dashboard__module-grid">
              {services.filter((service) => service.group === group).map(({ title, description, context, icon: Icon, to }) => (
                <Link to={to} className="hz-dashboard__module-card" key={title}>
                  <span className="hz-dashboard__module-icon hz-dashboard__module-icon--blue"><Icon size={19} /></span>
                  <span className="hz-dashboard__module-copy"><strong>{title}</strong><small>{description}</small><em>{context}</em></span>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          </div>)}
        </div>
      </section>}
      {visibleSections.actions && <div className="hz-dashboard__primary-grid">
        <section className="hz-dashboard__surface" aria-labelledby="employee-actions-title">
          <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Stay on track</span><h2 id="employee-actions-title">Pending actions</h2></div></div>
          <div className="hz-dashboard__attention-list">
            <Link to="/my-profile?tab=leave" className="hz-dashboard__attention-row"><span className="hz-dashboard__row-icon"><CalendarOff size={18} /></span><span className="hz-dashboard__row-copy"><strong>Leave requests</strong><small>{pendingLeave ? `${pendingLeave} request${pendingLeave === 1 ? '' : 's'} awaiting review` : 'No pending leave requests'}</small></span><ArrowRight size={16} /></Link>
            <Link to="/my-profile?tab=documents" className="hz-dashboard__attention-row"><span className="hz-dashboard__row-icon"><FileText size={18} /></span><span className="hz-dashboard__row-copy"><strong>Documents</strong><small>{documents.length ? `${documents.length} document${documents.length === 1 ? '' : 's'} on your record` : 'No documents on your record yet'}</small></span><ArrowRight size={16} /></Link>
            <Link to="/my-profile?tab=assets" className="hz-dashboard__attention-row"><span className="hz-dashboard__row-icon"><PackageOpen size={18} /></span><span className="hz-dashboard__row-copy"><strong>Assets</strong><small>{assets.length ? `${assets.length} assigned compan${assets.length === 1 ? 'y asset' : 'y assets'}` : 'No company assets assigned'}</small></span><ArrowRight size={16} /></Link>
          </div>
        </section>
        <section className="hz-dashboard__surface" aria-labelledby="employee-identity-title">
          <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Your record</span><h2 id="employee-identity-title">Employee details</h2></div></div>
          <div className="d-flex align-items-center gap-3 p-3" style={{ background: 'var(--hz-gray-50)', borderRadius: 10 }}>
            <Avatar name={employee?.fullName || firstName} src={employee?.profilePhotoUrl} size="lg" />
            <div><strong>{employee?.fullName || firstName || 'Employee'}</strong><small className="d-block text-secondary-hz">{employee?.designationTitle || 'Employee'}{employee?.departmentName ? ` · ${employee.departmentName}` : ''}</small></div>
          </div>
          <Link to="/my-profile" className="hz-dashboard__text-link mt-3 d-inline-flex">Open my profile <ArrowRight size={15} /></Link>
        </section>
      </div>}
      {visibleSections.support && <section className="hz-dashboard__support-strip" aria-labelledby="employee-support-title">
        <div><span className="hz-dashboard__section-kicker">Need a hand?</span><h2 id="employee-support-title">Support information</h2><p>Reach the right team for your Vettri HRMS questions.</p></div>
        <Link to="/support" className="hz-dashboard__text-link">View support info <ArrowRight size={15} /></Link>
        <LifeBuoy size={28} aria-hidden="true" />
      </section>}
      <Dialog open={customizeOpen} onClose={() => setCustomizeOpen(false)} title="Customize your dashboard" description="Choose which sections appear on your employee home.">
        <div className="hz-dashboard-preferences">
          {[['glance', 'Today at a glance'], ['workspace', 'Your workspace'], ['actions', 'Pending actions'], ['support', 'Support information']].map(([key, label]) => <label key={key}><input type="checkbox" checked={visibleSections[key]} onChange={(event) => setVisibleSections((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}
        </div>
        <div className="d-flex justify-content-end gap-2 mt-3"><button type="button" className="btn btn-secondary" onClick={() => setCustomizeOpen(false)}>Done</button></div>
      </Dialog>
    </div>
  );
}

function EmployeeMetric({ icon: Icon, label, value, detail, tone }) {
  return <article className={`hz-dashboard__employee-metric hz-dashboard__employee-metric--${tone}`}><span className="hz-dashboard__employee-metric-icon"><Icon size={18} /></span><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

function AttendanceWidget({ records, loading }) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((record) => record.punchTime?.slice(0, 10) === todayKey);
  const checkIn = todayRecords.find((record) => record.punchType === 'IN');
  const checkOut = todayRecords.find((record) => record.punchType === 'OUT');
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { label: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2), active: records.some((record) => record.punchTime?.slice(0, 10) === key) };
  });

  return (
    <section className="hz-dashboard__surface hz-attendance-widget" aria-labelledby="attendance-widget-title">
      <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Today</span><h2 id="attendance-widget-title">Attendance</h2></div><Clock3 size={19} aria-hidden="true" /></div>
      {loading ? <SkeletonText lines={4} /> : <>
        <div className="hz-attendance-widget__summary">
          <div><strong>{checkIn ? new Date(checkIn.punchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</strong><span>Check-in</span></div>
          <div><strong>{checkOut ? new Date(checkOut.punchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Working'}</strong><span>{checkOut ? 'Check-out' : 'Current status'}</span></div>
        </div>
        <div className="hz-attendance-widget__week" aria-label="Attendance for the last seven days">
          {days.map((day) => <span key={`${day.label}-${day.active}`} className={day.active ? 'is-present' : ''}><i />{day.label}</span>)}
        </div>
      </>}
      <Link to="/my-profile?tab=attendance" className="hz-dashboard__text-link">View attendance <ArrowRight size={15} /></Link>
    </section>
  );
}

function LeaveWidget({ balances, requests, loading, year }) {
  const upcoming = requests.filter((request) => request.startDate >= new Date().toISOString().slice(0, 10)).sort((first, second) => first.startDate.localeCompare(second.startDate))[0];
  return (
    <section className="hz-dashboard__surface hz-leave-widget" aria-labelledby="leave-widget-title">
      <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">{year} balance</span><h2 id="leave-widget-title">Leave</h2></div><CalendarOff size={19} aria-hidden="true" /></div>
      {loading ? <SkeletonText lines={4} /> : balances.length ? <div className="hz-leave-widget__balances">{balances.slice(0, 3).map((balance) => <div key={balance.leaveTypeId}><span>{balance.leaveTypeName}</span><strong>{balance.remainingDays}<small> days</small></strong></div>)}</div> : <EmptyState icon={CalendarOff} title="No leave types yet" description="Your leave balances will appear here." />}
      <div className="hz-leave-widget__upcoming"><span>Upcoming leave</span><strong>{upcoming ? `${upcoming.leaveTypeName} · ${new Date(upcoming.startDate).toLocaleDateString()}` : 'Nothing scheduled'}</strong></div>
      <Link to="/my-profile?tab=leave" className="hz-dashboard__text-link">Apply leave <ArrowRight size={15} /></Link>
    </section>
  );
}

function FinanceWidget({ salary }) {
  const structure = salary?.currentStructure;
  const latestPayslip = salary?.payrollHistory?.[0];
  return (
    <section className="hz-dashboard__surface hz-finance-widget" aria-labelledby="finance-widget-title">
      <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">My finances</span><h2 id="finance-widget-title">Latest pay</h2></div><WalletCards size={19} aria-hidden="true" /></div>
      <span className="hz-finance-widget__label">Net pay</span>
      <strong className="hz-finance-widget__amount">{structure ? formatCurrency(structure.netSalary) : '--'}</strong>
      <div className="hz-finance-widget__details"><span>Earnings <strong>{structure ? formatCurrency(structure.grossSalary) : '--'}</strong></span><span>Deductions <strong>{structure ? formatCurrency(structure.totalDeductions) : '--'}</strong></span></div>
      <p>{latestPayslip ? `Latest payslip · ${latestPayslip.paymentDate ? new Date(latestPayslip.paymentDate).toLocaleDateString() : 'Pending payment'}` : 'Your latest payslip will appear here.'}</p>
      <Link to="/my-payslip" className="hz-dashboard__text-link">View payslip <ArrowRight size={15} /></Link>
    </section>
  );
}
