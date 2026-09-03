import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { departmentsApi, designationsApi, teamsApi } from '../api/endpoints/organization';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonText } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';

const TABS = [
  { key: 'departments', label: 'Departments' },
  { key: 'designations', label: 'Designations' },
  { key: 'teams', label: 'Teams' },
];

export default function SettingsOrganization() {
  const [tab, setTab] = useState('departments');

  return (
    <div className="hz-settings-page d-flex flex-column gap-4">
      <PageHeader eyebrow="Settings" title="Organization" description="The structure your employees, teams, and reporting lines are built on" />

      <Tabs items={TABS} value={tab} onChange={setTab} />

      {tab === 'departments' && <DepartmentsPanel />}
      {tab === 'designations' && <DesignationsPanel />}
      {tab === 'teams' && <TeamsPanel />}
    </div>
  );
}

function DepartmentsPanel() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const { data: departments, isLoading } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.list });
  const create = useMutation({
    mutationFn: departmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setForm({ name: '', code: '', description: '' });
      setShowForm(false);
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }) => (active ? departmentsApi.deactivate(id) : departmentsApi.activate(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
    onError: (err) => toast.error(err.response?.data?.message || 'Could not update this department.'),
  });

  return (
    <Panel
      title="Departments"
      showForm={showForm}
      onToggleForm={() => setShowForm((s) => !s)}
      form={
        <form
          className="row g-2 align-items-end"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(form);
          }}
        >
          <div className="col-4">
            <input className="form-control" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="col-3">
            <input className="form-control" placeholder="Code (e.g. ENG)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </div>
          <div className="col-3">
            <input className="form-control" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="col-2">
            <Button type="submit" size="sm" loading={create.isPending} className="w-100 justify-content-center">
              Add
            </Button>
          </div>
        </form>
      }
    >
      {isLoading && <SkeletonText lines={4} />}
      {!isLoading && departments?.length === 0 && <EmptyState title="No departments yet" description="Add your first department above." />}
      {!isLoading &&
        departments?.map((d) => (
          <Row
            key={d.id}
            left={d.name}
            sub={d.code}
            right={`${d.employeeCount} employee${d.employeeCount === 1 ? '' : 's'}`}
            active={d.active}
            onToggleActive={() => toggleActive.mutate({ id: d.id, active: d.active })}
            toggling={toggleActive.isPending}
          />
        ))}
    </Panel>
  );
}

function DesignationsPanel() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', level: '', departmentId: '' });

  const { data: designations, isLoading } = useQuery({ queryKey: ['designations'], queryFn: designationsApi.list });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.list });
  const create = useMutation({
    mutationFn: designationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      setForm({ title: '', level: '', departmentId: '' });
      setShowForm(false);
    },
  });

  return (
    <Panel
      title="Designations"
      showForm={showForm}
      onToggleForm={() => setShowForm((s) => !s)}
      form={
        <form
          className="row g-2 align-items-end"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ ...form, level: form.level ? Number(form.level) : null, departmentId: form.departmentId || null });
          }}
        >
          <div className="col-4">
            <input className="form-control" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="col-2">
            <input className="form-control" placeholder="Level" type="number" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          </div>
          <div className="col-4">
            <select className="form-select" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">Any department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-2">
            <Button type="submit" size="sm" loading={create.isPending} className="w-100 justify-content-center">
              Add
            </Button>
          </div>
        </form>
      }
    >
      {isLoading && <SkeletonText lines={4} />}
      {!isLoading && designations?.length === 0 && <EmptyState title="No designations yet" description="Add your first designation above." />}
      {!isLoading &&
        designations?.map((d) => (
          <Row key={d.id} left={d.title} sub={d.departmentName || 'Any department'} right={d.level != null ? `Level ${d.level}` : ''} active={d.active} />
        ))}
    </Panel>
  );
}

function TeamsPanel() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', departmentId: '' });

  const { data: teams, isLoading } = useQuery({ queryKey: ['teams'], queryFn: teamsApi.list });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.list });
  const create = useMutation({
    mutationFn: teamsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setForm({ name: '', departmentId: '' });
      setShowForm(false);
    },
  });

  return (
    <Panel
      title="Teams"
      showForm={showForm}
      onToggleForm={() => setShowForm((s) => !s)}
      form={
        <form
          className="row g-2 align-items-end"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ ...form, departmentId: form.departmentId || null });
          }}
        >
          <div className="col-5">
            <input className="form-control" placeholder="Team name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="col-5">
            <select className="form-select" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">Any department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-2">
            <Button type="submit" size="sm" loading={create.isPending} className="w-100 justify-content-center">
              Add
            </Button>
          </div>
        </form>
      }
    >
      {isLoading && <SkeletonText lines={4} />}
      {!isLoading && teams?.length === 0 && <EmptyState title="No teams yet" description="Add your first team above." />}
      {!isLoading &&
        teams?.map((t) => (
          <Row key={t.id} left={t.name} sub={t.departmentName || 'Any department'} right={`${t.memberCount} member${t.memberCount === 1 ? '' : 's'}`} active={t.active} />
        ))}
    </Panel>
  );
}

function Panel({ title, showForm, onToggleForm, form, children }) {
  return (
    <Card
      title={title}
      actions={
        <Button size="sm" variant="secondary" icon={Plus} onClick={onToggleForm}>
          {showForm ? 'Close' : 'Add'}
        </Button>
      }
    >
      {showForm && <div className="mb-4 pb-3" style={{ borderBottom: '1px solid var(--hz-border)' }}>{form}</div>}
      <div className="d-flex flex-column gap-1">{children}</div>
    </Card>
  );
}

function Row({ left, sub, right, active, onToggleActive, toggling }) {
  return (
    <div className="d-flex align-items-center justify-content-between py-2" style={{ borderBottom: '1px solid var(--hz-border)' }}>
      <div>
        <div style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600 }}>{left}</div>
        <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{sub}</div>
      </div>
      <div className="d-flex align-items-center gap-2">
        <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>{right}</span>
        {!active && <Badge variant="neutral">Inactive</Badge>}
        {onToggleActive && (
          <button
            type="button"
            className="btn btn-sm btn-light border-0"
            onClick={onToggleActive}
            disabled={toggling}
            style={{ fontSize: 12, color: active ? 'var(--hz-danger-600)' : 'var(--hz-success-600)' }}
          >
            {active ? 'Deactivate' : 'Activate'}
          </button>
        )}
      </div>
    </div>
  );
}
