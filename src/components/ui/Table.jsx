import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import { Skeleton } from './Skeleton';

/**
 * Column-config table. Cell rendering stays flexible via `render(row)` per
 * column - this centralizes the part that was actually duplicated across
 * pages (header typography, loading/error/empty states, row hover) without
 * forcing every table's cell markup into a rigid shape it might not fit.
 *
 * Usage:
 *   <Table
 *     columns={[
 *       { key: 'name', label: 'Employee', render: (row) => <EmployeeCell employee={row} /> },
 *       { key: 'dept', label: 'Department', render: (row) => row.departmentName || '—' },
 *     ]}
 *     rows={employees}
 *     getRowKey={(row) => row.id}
 *     isLoading={isLoading}
 *     isError={isError}
 *     onRetry={refetch}
 *     onRowClick={(row) => navigate(`/employees/${row.id}`)}
 *     emptyTitle="No employees yet"
 *   />
 */
export default function Table({
  columns,
  rows,
  getRowKey = (row, i) => row.id ?? i,
  isLoading = false,
  isError = false,
  onRetry,
  onRowClick,
  loadingRows = 5,
  emptyIcon,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  ariaLabel = 'Data table',
  selectable = false,
  selectedKeys = new Set(),
  onToggleRow,
  onToggleAll,
}) {
  if (isError) {
    return <ErrorState description="Couldn't load this data." onRetry={onRetry} />;
  }

  if (!isLoading && (!rows || rows.length === 0)) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="table-responsive">
      <table className="table mb-0 align-middle hz-table" aria-label={ariaLabel} aria-busy={isLoading || undefined}>
        <thead>
          <tr>
            {selectable && <th className="hz-table__selection"><input type="checkbox" checked={!isLoading && rows?.length > 0 && rows.every((row, index) => selectedKeys.has(getRowKey(row, index)))} onChange={(event) => onToggleAll?.(event.target.checked)} disabled={isLoading || !rows?.length} aria-label="Select all rows" /></th>}
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width, textAlign: col.align }} className={col.headerClassName}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: loadingRows }).map((_, i) => (
              <tr key={`skeleton-${i}`}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <Skeleton height={14} width={col.skeletonWidth || '70%'} />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading &&
            rows.map((row, i) => (
              <tr
                key={getRowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onRowClick(row); } } : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick ? `Open row ${i + 1}` : undefined}
                className={onRowClick ? 'hz-table-row--clickable' : undefined}
              >
                {selectable && <td className="hz-table__selection" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedKeys.has(getRowKey(row, i))} onChange={() => onToggleRow?.(row)} aria-label={`Select row ${i + 1}`} /></td>}
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align, ...col.style }} className={col.className}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
