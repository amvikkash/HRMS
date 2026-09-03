import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { axiosClient } from '../api/axiosClient';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import FormField from '../components/ui/FormField';
import { SkeletonText } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/ui/Table';

const ACTION_VARIANT = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  ACTIVATE: 'success',
  DEACTIVATE: 'warning',
  LOGIN: 'neutral',
  PASSWORD_CHANGE: 'primary',
};

// Every entity name actually passed to AuditLogService.log(...) anywhere
// in the backend, so this dropdown reflects real data rather than a
// guessed subset - kept manually in sync since audit action types are
// added rarely enough that a build-time constant isn't worth adding.
const ENTITY_TYPES = [
  'Candidate', 'Department', 'Designation', 'Device', 'Employee', 'Goal', 'Holiday',
  'Interview', 'JobOpening', 'LeaveRequest', 'LeaveType', 'PayrollItem', 'PayrollRun',
  'PerformanceReview', 'Role', 'SalaryStructure', 'Team', 'User',
];

const COLUMNS = [
  { key: 'when', label: 'When', className: 'ps-4', headerClassName: 'ps-4', render: (log) => new Date(log.performedAt).toLocaleString(), style: { color: 'var(--hz-text-secondary)' } },
  { key: 'entity', label: 'Entity', render: (log) => `${log.entityName} #${log.entityId}` },
  { key: 'action', label: 'Action', render: (log) => <Badge variant={ACTION_VARIANT[log.action] || 'neutral'}>{log.action}</Badge> },
  { key: 'performedBy', label: 'Performed By', render: (log) => log.performedBy },
  { key: 'details', label: 'Details', className: 'pe-4', headerClassName: 'pe-4', render: (log) => log.details, style: { color: 'var(--hz-text-secondary)' } },
];

export default function SettingsAudit() {
  const [page, setPage] = useState(0);
  const [entityName, setEntityName] = useState('');
  const pageSize = 25;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['audit-logs', page, entityName],
    queryFn: () =>
      axiosClient
        .get('/api/audit/logs', { params: { page, size: pageSize, entityName: entityName || undefined } })
        .then((res) => res.data),
  });

  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  function handleEntityChange(value) {
    setEntityName(value);
    setPage(0); // a new filter starts back at page 1 - stale offsets into a different result set make no sense
  }

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader
        eyebrow="Administration"
        title="Audit Logs"
        description="Every create, update, activation, and login event across the platform"
        actions={<div style={{ width: 220 }}>
          <FormField as="select" label="Entity" value={entityName} onChange={handleEntityChange}>
            <option value="">All entities</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FormField>
        </div>}
      />

      <Card bodyClassName="p-0">
        {isLoading && (
          <div className="p-4">
            <SkeletonText lines={6} />
          </div>
        )}

        {isError && <ErrorState description="Couldn't load audit logs." onRetry={refetch} />}

        {!isLoading && !isError && (
          <>
            <Table columns={COLUMNS} rows={data?.content} getRowKey={(log) => log.id} emptyTitle={entityName ? 'No matching activity' : 'No activity yet'} emptyDescription={entityName ? `No ${entityName} events recorded.` : 'Actions taken across Vettri HRMS will show up here as they happen.'} />

            <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderTop: '1px solid var(--hz-border)' }}>
              <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)' }}>
                {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
              </span>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="hz-icon-btn d-flex align-items-center justify-content-center border-0"
                  style={{ width: 32, height: 32 }}
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  disabled={page === 0}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
                  Page {page + 1} of {Math.max(totalPages, 1)}
                </span>
                <button
                  type="button"
                  className="hz-icon-btn d-flex align-items-center justify-content-center border-0"
                  style={{ width: 32, height: 32 }}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                  disabled={page >= totalPages - 1}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
