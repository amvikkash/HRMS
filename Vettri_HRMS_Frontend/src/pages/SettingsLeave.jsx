import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { leaveTypesApi, holidaysApi } from '../api/endpoints/leave';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonText } from '../components/ui/Skeleton';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';

const TABS = [
  { key: 'types', label: 'Leave Types' },
  { key: 'holidays', label: 'Holiday Calendar' },
];

export default function SettingsLeave() {
  const [tab, setTab] = useState('types');

  return (
    <div className="hz-settings-page d-flex flex-column gap-4">
      <PageHeader eyebrow="Settings" title="Leave Configuration" description="Leave types set default allocations; the holiday calendar keeps leave-day counting accurate" />

      <Tabs items={TABS} value={tab} onChange={setTab} />

      {tab === 'types' && <LeaveTypesPanel />}
      {tab === 'holidays' && <HolidaysPanel />}
    </div>
  );
}

function LeaveTypesPanel() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', defaultDaysPerYear: '', carryForward: false });

  const { data: types, isLoading } = useQuery({ queryKey: ['leave-types'], queryFn: leaveTypesApi.list });
  const create = useMutation({
    mutationFn: leaveTypesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      setForm({ name: '', code: '', defaultDaysPerYear: '', carryForward: false });
      setShowForm(false);
    },
  });

  return (
    <Card
      title="Leave Types"
      actions={
        <Button size="sm" variant="secondary" icon={Plus} onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : 'Add'}
        </Button>
      }
    >
      {showForm && (
        <form
          className="row g-2 align-items-end mb-4 pb-3"
          style={{ borderBottom: '1px solid var(--hz-border)' }}
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ ...form, defaultDaysPerYear: Number(form.defaultDaysPerYear) });
          }}
        >
          <div className="col-3">
            <input className="form-control" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="col-2">
            <input className="form-control" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </div>
          <div className="col-2">
            <input
              className="form-control"
              type="number"
              placeholder="Days/year"
              value={form.defaultDaysPerYear}
              onChange={(e) => setForm({ ...form, defaultDaysPerYear: e.target.value })}
              required
            />
          </div>
          <div className="col-3 d-flex align-items-center gap-2 pb-2">
            <input
              type="checkbox"
              className="form-check-input"
              id="carryForward"
              checked={form.carryForward}
              onChange={(e) => setForm({ ...form, carryForward: e.target.checked })}
            />
            <label htmlFor="carryForward" style={{ fontSize: 'var(--hz-text-sm)' }}>
              Carry forward
            </label>
          </div>
          <div className="col-2">
            <Button type="submit" size="sm" loading={create.isPending} className="w-100 justify-content-center">
              Add
            </Button>
          </div>
        </form>
      )}

      {isLoading && <SkeletonText lines={3} />}
      {!isLoading && types?.length === 0 && <EmptyState title="No leave types yet" />}
      {!isLoading &&
        types?.map((t) => (
          <div key={t.id} className="d-flex align-items-center justify-content-between py-2" style={{ borderBottom: '1px solid var(--hz-border)' }}>
            <div>
              <div style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{t.code}</div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>{t.defaultDaysPerYear} days/year</span>
              {t.carryForward && <Badge variant="info">Carries forward</Badge>}
            </div>
          </div>
        ))}
    </Card>
  );
}

function HolidaysPanel() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', date: '' });

  const { data: holidays, isLoading } = useQuery({ queryKey: ['holidays'], queryFn: holidaysApi.list });
  const create = useMutation({
    mutationFn: holidaysApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setForm({ name: '', date: '' });
      setShowForm(false);
    },
  });
  const remove = useMutation({
    mutationFn: holidaysApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
  });

  return (
    <Card
      title="Holiday Calendar"
      actions={
        <Button size="sm" variant="secondary" icon={Plus} onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : 'Add'}
        </Button>
      }
    >
      {showForm && (
        <form
          className="row g-2 align-items-end mb-4 pb-3"
          style={{ borderBottom: '1px solid var(--hz-border)' }}
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(form);
          }}
        >
          <div className="col-6">
            <input className="form-control" placeholder="Holiday name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="col-4">
            <input className="form-control" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div className="col-2">
            <Button type="submit" size="sm" loading={create.isPending} className="w-100 justify-content-center">
              Add
            </Button>
          </div>
        </form>
      )}

      {isLoading && <SkeletonText lines={3} />}
      {!isLoading && holidays?.length === 0 && <EmptyState title="No holidays configured" description="Add your company's holidays so leave-day counting excludes them." />}
      {!isLoading &&
        holidays?.map((h) => (
          <div key={h.id} className="d-flex align-items-center justify-content-between py-2" style={{ borderBottom: '1px solid var(--hz-border)' }}>
            <div>
              <div style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600 }}>{h.name}</div>
              <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{new Date(h.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <button className="btn btn-sm btn-light border-0" style={{ color: 'var(--hz-danger-600)' }} onClick={() => remove.mutate(h.id)} aria-label={`Delete holiday "${h.name}"`}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
    </Card>
  );
}
