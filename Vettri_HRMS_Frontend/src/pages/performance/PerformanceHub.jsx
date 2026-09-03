import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Target, Star } from 'lucide-react';
import { goalsApi, performanceReviewsApi } from '../../api/endpoints/performance';
import { employeesApi } from '../../api/endpoints/employees';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonText } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';

const TABS = [
  { key: 'goals', label: 'Goals' },
  { key: 'reviews', label: 'Performance Reviews' },
];

const GOAL_STATUS_VARIANT = { NOT_STARTED: 'neutral', IN_PROGRESS: 'info', AT_RISK: 'danger', COMPLETED: 'success' };
const REVIEW_STATUS_VARIANT = { DRAFT: 'neutral', SUBMITTED: 'warning', ACKNOWLEDGED: 'success' };

export default function PerformanceHub() {
  const [tab, setTab] = useState('goals');

  return (
    <div className="hz-performance d-flex flex-column gap-4">
      <PageHeader eyebrow="Talent" title="Performance" description="Goals, reviews, and feedback" />

      <Tabs items={TABS} value={tab} onChange={setTab} />

      {tab === 'goals' && <GoalsPanel />}
      {tab === 'reviews' && <ReviewsPanel />}
    </div>
  );
}

function GoalsPanel() {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission('PERFORMANCE_MANAGE');
  // Same self-vs-org distinction as ReviewsPanel: someone without
  // EMPLOYEE_VIEW can't populate the "pick an employee" dropdown (that
  // call itself requires EMPLOYEE_VIEW and would 403), so they get
  // auto-scoped to their own goals instead, with no picker to show.
  const canBrowseAnyEmployee = hasPermission('EMPLOYEE_VIEW');
  const myEmployeeId = user?.employeeId;

  const [employeeId, setEmployeeId] = useState('');
  const effectiveEmployeeId = canBrowseAnyEmployee ? employeeId : myEmployeeId;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', targetDate: '' });
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => employeesApi.list(), enabled: canBrowseAnyEmployee });
  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals', effectiveEmployeeId],
    queryFn: () => goalsApi.byEmployee(effectiveEmployeeId),
    enabled: !!effectiveEmployeeId,
  });

  const create = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', effectiveEmployeeId] });
      setForm({ title: '', description: '', targetDate: '' });
      setShowForm(false);
    },
  });

  const updateProgress = useMutation({
    mutationFn: ({ id, progressPercent, status }) => goalsApi.updateProgress(id, { progressPercent, status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals', effectiveEmployeeId] }),
  });

  return (
    <Card
      title={canBrowseAnyEmployee ? 'Goals' : 'Your Goals'}
      actions={
        canManage && effectiveEmployeeId && (
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close' : 'Add Goal'}
          </Button>
        )
      }
    >
      {canBrowseAnyEmployee && (
        <div className="mb-3" style={{ maxWidth: 320 }}>
          <select className="form-select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select an employee…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName}
              </option>
            ))}
          </select>
        </div>
      )}

      {!effectiveEmployeeId && <EmptyState icon={Target} title="Pick an employee" description="Select someone above to view or set their goals." />}

      {effectiveEmployeeId && !isLoading && goals && (
        <div className="hz-inline-summary hz-inline-summary--compact mb-3" aria-label="Goal summary">
          <InlineSummary label="Total goals" value={goals.length} />
          <InlineSummary label="In progress" value={goals.filter((goal) => goal.status === 'IN_PROGRESS').length} tone="info" />
          <InlineSummary label="At risk" value={goals.filter((goal) => goal.status === 'AT_RISK').length} tone="danger" />
          <InlineSummary label="Completed" value={goals.filter((goal) => goal.status === 'COMPLETED').length} tone="success" />
        </div>
      )}

      {effectiveEmployeeId && showForm && canManage && (
        <form
          className="row g-2 align-items-end mb-4 pb-3"
          style={{ borderBottom: '1px solid var(--hz-border)' }}
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ ...form, employeeId: Number(effectiveEmployeeId), targetDate: form.targetDate || null });
          }}
        >
          <div className="col-4">
            <input className="form-control" placeholder="Goal title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="col-4">
            <input className="form-control" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="col-2">
            <input type="date" className="form-control" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
          </div>
          <div className="col-2">
            <Button type="submit" size="sm" loading={create.isPending} className="w-100 justify-content-center">
              Add
            </Button>
          </div>
        </form>
      )}

      {effectiveEmployeeId && isLoading && <SkeletonText lines={3} />}
      {effectiveEmployeeId && !isLoading && goals?.length === 0 && <EmptyState icon={Target} title="No goals set" description="Add one above." />}
      {effectiveEmployeeId &&
        !isLoading &&
        goals?.map((g) => (
          <div key={g.id} className="py-3" style={{ borderBottom: '1px solid var(--hz-border)' }}>
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600 }}>{g.title}</span>
              <Badge variant={GOAL_STATUS_VARIANT[g.status]}>{g.status.replace('_', ' ')}</Badge>
            </div>
            {g.description && <p style={{ fontSize: 13, color: 'var(--hz-text-secondary)', marginBottom: 8 }}>{g.description}</p>}
            <div className="d-flex align-items-center gap-2">
              <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--hz-gray-100)' }}>
                <div style={{ height: 6, borderRadius: 999, width: `${g.progressPercent}%`, background: 'var(--hz-primary-500)' }} />
              </div>
              {canManage ? (
                <input
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={g.progressPercent}
                  className="form-control form-control-sm"
                  style={{ width: 70 }}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    const status = val >= 100 ? 'COMPLETED' : val > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
                    if (val !== g.progressPercent) updateProgress.mutate({ id: g.id, progressPercent: val, status });
                  }}
                />
              ) : (
                <span style={{ fontSize: 12, color: 'var(--hz-text-secondary)', width: 70, textAlign: 'right' }}>{g.progressPercent}%</span>
              )}
              <span style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{canManage ? '%' : ''}</span>
            </div>
          </div>
        ))}
    </Card>
  );
}

function InlineSummary({ label, value, tone = 'neutral' }) {
  return <div className={`hz-inline-summary__item hz-inline-summary__item--${tone}`}><strong>{value}</strong><span>{label}</span></div>;
}

function ReviewsPanel() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: '', reviewerId: '', reviewPeriod: '', rating: 3, strengths: '', areasForImprovement: '' });

  // A plain EMPLOYEE (zero permissions by default) can't see the org-wide
  // list, but CAN and should see their own reviews - see PerformanceReview
  // Controller#byEmployee's isSelf bypass, added alongside #acknowledge's
  // (its own audit message already said "acknowledged by employee" -
  // this closes the gap between that intent and what was actually
  // reachable).
  const canViewAll = hasPermission('PERFORMANCE_VIEW');
  const canManage = hasPermission('PERFORMANCE_MANAGE');
  const myEmployeeId = user?.employeeId;

  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => employeesApi.list(), enabled: canManage });
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['performance-reviews', canViewAll, myEmployeeId],
    queryFn: () => (canViewAll ? performanceReviewsApi.list() : performanceReviewsApi.byEmployee(myEmployeeId)),
    enabled: canViewAll || !!myEmployeeId,
  });

  const create = useMutation({
    mutationFn: performanceReviewsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      setShowForm(false);
    },
  });
  const submit = useMutation({
    mutationFn: performanceReviewsApi.submit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-reviews'] }),
  });
  const acknowledge = useMutation({
    mutationFn: performanceReviewsApi.acknowledge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-reviews'] }),
  });

  return (
    <Card
      title="Performance Reviews"
      actions={
        canManage && (
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close' : 'New Review'}
          </Button>
        )
      }
    >
      {showForm && canManage && (
        <form
          className="mb-4 pb-3"
          style={{ borderBottom: '1px solid var(--hz-border)' }}
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ ...form, employeeId: Number(form.employeeId), reviewerId: form.reviewerId || null, rating: Number(form.rating) });
          }}
        >
          <div className="row g-2 mb-2">
            <div className="col-4">
              <select className="form-select" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required>
                <option value="">Employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.fullName}</option>
                ))}
              </select>
            </div>
            <div className="col-3">
              <input className="form-control" placeholder="Period (e.g. 2026 H1)" value={form.reviewPeriod} onChange={(e) => setForm({ ...form, reviewPeriod: e.target.value })} required />
            </div>
            <div className="col-2">
              <select className="form-select" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} / 5</option>
                ))}
              </select>
            </div>
            <div className="col-3">
              <select className="form-select" value={form.reviewerId} onChange={(e) => setForm({ ...form, reviewerId: e.target.value })}>
                <option value="">Reviewer…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.fullName}</option>
                ))}
              </select>
            </div>
          </div>
          <textarea className="form-control mb-2" rows={2} placeholder="Strengths" value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} />
          <textarea className="form-control mb-2" rows={2} placeholder="Areas for improvement" value={form.areasForImprovement} onChange={(e) => setForm({ ...form, areasForImprovement: e.target.value })} />
          <Button type="submit" size="sm" loading={create.isPending}>
            Save Draft
          </Button>
        </form>
      )}

      {isLoading && <SkeletonText lines={4} />}
      {!isLoading && reviews?.length === 0 && <EmptyState icon={Star} title="No reviews yet" />}
      {!isLoading &&
        reviews?.map((r) => (
          <div key={r.id} className="d-flex align-items-center justify-content-between py-3" style={{ borderBottom: '1px solid var(--hz-border)' }}>
            <Link to={`/employees/${r.employeeId}`} className="d-flex align-items-center gap-2 text-decoration-none">
              <Avatar name={r.employeeName} size="sm" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-primary)' }}>{r.employeeName}</div>
                <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>
                  {r.reviewPeriod} {r.rating ? `· ${r.rating}/5` : ''}
                </div>
              </div>
            </Link>
            <div className="d-flex align-items-center gap-2">
              <Badge variant={REVIEW_STATUS_VARIANT[r.status]}>{r.status}</Badge>
              {r.status === 'DRAFT' && canManage && (
                <Button size="sm" variant="secondary" onClick={() => submit.mutate(r.id)} loading={submit.isPending}>
                  Submit
                </Button>
              )}
              {r.status === 'SUBMITTED' && (canManage || String(r.employeeId) === String(myEmployeeId)) && (
                <Button size="sm" onClick={() => acknowledge.mutate(r.id)} loading={acknowledge.isPending}>
                  Acknowledge
                </Button>
              )}
            </div>
          </div>
        ))}
    </Card>
  );
}
