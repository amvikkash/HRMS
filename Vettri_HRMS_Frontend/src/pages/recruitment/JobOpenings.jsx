import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { jobOpeningsApi } from '../../api/endpoints/recruitment';
import { departmentsApi, designationsApi } from '../../api/endpoints/organization';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Dialog from '../../components/ui/Dialog';
import FormField from '../../components/ui/FormField';
import { SkeletonCard } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import FilterBar from '../../components/ui/FilterBar';
import StatusBadge from '../../components/ui/StatusBadge';
import ErrorBanner from '../../components/ui/ErrorBanner';

const STATUS_VARIANT = { OPEN: 'success', ON_HOLD: 'warning', CLOSED: 'neutral' };
const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'ON_HOLD', label: 'On Hold' },
  { key: 'CLOSED', label: 'Closed' },
];

export default function JobOpenings() {
  const [showCreate, setShowCreate] = useState(false);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { data: openings, isLoading, isError, refetch } = useQuery({ queryKey: ['job-openings'], queryFn: jobOpeningsApi.list });

  // Client-side, not a new backend query param: the requisition list for
  // any one company is small enough (dozens, not thousands) that fetching
  // everything once and narrowing it here is simpler than adding
  // status/search params to an endpoint that's never needed them before -
  // unlike the Employee Directory, which genuinely needed server-side
  // paging at scale.
  const filteredOpenings = useMemo(() => {
    if (!openings) return openings;
    return openings.filter((o) => {
      if (status && o.status !== status) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!o.title.toLowerCase().includes(q) && !(o.departmentName || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [openings, status, search]);

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader eyebrow="Talent" title="Recruitment" description="Job openings and candidate pipelines" actions={<Button icon={Plus} onClick={() => setShowCreate(true)}>New Requisition</Button>} />

      <FilterBar className="justify-content-between">
        <Tabs items={STATUS_TABS} value={status} onChange={setStatus} className="border-0" />
        <div className="position-relative" style={{ width: 240 }}>
          <Search size={14} className="position-absolute" style={{ left: 10, top: 9, color: 'var(--hz-text-muted)' }} />
          <input
            type="search"
            placeholder="Search title or department…"
            className="form-control form-control-sm ps-4"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </FilterBar>

      {isError && <ErrorState description="Couldn't load job openings." onRetry={refetch} />}

      {!isError && (
        <div className="row g-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div className="col-12 col-md-6 col-xl-4" key={i}>
                <SkeletonCard />
              </div>
            ))}

          {!isLoading && openings?.length === 0 && (
            <div className="col-12">
              <Card>
                <EmptyState title="No job openings yet" description="Create a requisition to start building a candidate pipeline." />
              </Card>
            </div>
          )}

          {!isLoading && openings?.length > 0 && filteredOpenings?.length === 0 && (
            <div className="col-12">
              <Card>
                <EmptyState title="No matches" description="Try a different status or search term." />
              </Card>
            </div>
          )}

          {!isLoading &&
            filteredOpenings?.map((o) => (
              <div className="col-12 col-md-6 col-xl-4" key={o.id}>
                <Link to={`/recruitment/${o.id}`} className="text-decoration-none">
                  <Card hoverable>
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <h3 style={{ fontSize: 'var(--hz-text-base)', fontWeight: 600, color: 'var(--hz-text-primary)', margin: 0 }}>{o.title}</h3>
                      <StatusBadge status={o.status} variant={STATUS_VARIANT[o.status]} dot>{o.status.replace('_', ' ')}</StatusBadge>
                    </div>
                    <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)', marginBottom: 12 }}>
                      {o.departmentName || 'Any department'} {o.designationTitle ? `· ${o.designationTitle}` : ''}
                    </p>
                    <div className="d-flex justify-content-between" style={{ fontSize: 'var(--hz-text-sm)' }}>
                      <span style={{ color: 'var(--hz-text-muted)' }}>{o.openingsCount} opening(s)</span>
                      <span>
                        <strong>{o.candidateCount}</strong> candidate(s) · <strong>{o.hiredCount}</strong> hired
                      </span>
                    </div>
                  </Card>
                </Link>
              </div>
            ))}
        </div>
      )}

      {showCreate && <CreateJobOpeningModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateJobOpeningModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: '', departmentId: '', designationId: '', employmentType: 'FULL_TIME', openingsCount: 1, description: '' });
  const [error, setError] = useState(null);

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.list });
  const { data: designations = [] } = useQuery({ queryKey: ['designations'], queryFn: designationsApi.list });

  const create = useMutation({
    mutationFn: jobOpeningsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-openings'] });
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not create job opening'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    create.mutate({
      ...form,
      departmentId: form.departmentId || null,
      designationId: form.designationId || null,
      openingsCount: Number(form.openingsCount),
    });
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <Dialog open onClose={onClose} title="New Requisition" size="md">
      <form onSubmit={handleSubmit}>
        {error && (
          <ErrorBanner>{error}</ErrorBanner>
        )}
        <FormField label="Job Title" value={form.title} onChange={(v) => set('title', v)} required />
        <div className="row g-3 mb-3">
          <FormField as="select" col={6} label="Department" value={form.departmentId} onChange={(v) => set('departmentId', v)}>
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </FormField>
          <FormField as="select" col={6} label="Designation" value={form.designationId} onChange={(v) => set('designationId', v)}>
            <option value="">—</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </FormField>
        </div>
        <div className="row g-3 mb-3">
          <FormField as="select" col={6} label="Employment Type" value={form.employmentType} onChange={(v) => set('employmentType', v)}>
            <option value="FULL_TIME">Full-Time</option>
            <option value="PART_TIME">Part-Time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERN">Intern</option>
          </FormField>
          <FormField col={6} label="Number of Openings" type="number" min={1} value={form.openingsCount} onChange={(v) => set('openingsCount', v)} />
        </div>
        <FormField as="textarea" label="Description" rows={3} value={form.description} onChange={(v) => set('description', v)} />
        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Create Requisition
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
