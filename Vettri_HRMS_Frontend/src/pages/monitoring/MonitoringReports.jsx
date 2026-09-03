import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileBarChart } from 'lucide-react';
import { monitoringApi } from '../../api/endpoints/monitoring';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';

function defaultDates() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export default function MonitoringReports() {
  const dates = defaultDates();
  const [filters, setFilters] = useState(dates);
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ['monitoring-productivity-report', filters], queryFn: () => monitoringApi.productivityReport(filters) });
  const [management, setManagement] = useState(null);

  async function loadManagement() { setManagement(await monitoringApi.managementReport(filters)); }
  async function download(format) {
    const blob = await monitoringApi.exportReport(format, filters);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monitoring-report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    link.click();
    URL.revokeObjectURL(url);
  }
  function setPeriod(days) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    setFilters({ ...filters, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) });
  }

  const columns = [
    { key: 'employee', label: 'Employee', render: (row) => row.employeeName || 'Unassigned' },
    { key: 'device', label: 'Device', render: (row) => row.deviceName },
    { key: 'date', label: 'Date', render: (row) => row.date },
    { key: 'active', label: 'Active hours', render: (row) => (row.activeSeconds / 3600).toFixed(2) },
    { key: 'idle', label: 'Idle hours', render: (row) => (row.idleSeconds / 3600).toFixed(2) },
    { key: 'productivity', label: 'Productivity', render: (row) => `${row.productivityPercent}%` },
    { key: 'classification', label: 'Class', render: (row) => row.productivityClassification || '—' },
  ];

  return <div className="d-flex flex-column gap-4">
    <div><h1 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700 }}>Monitoring Reports</h1><p className="text-secondary-hz mb-0">Productivity and management views from recorded agent activity.</p></div>
    <Card><div className="d-flex align-items-end gap-3 flex-wrap">
      <label className="form-label mb-0">From<input className="form-control" type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} /></label>
      <label className="form-label mb-0">To<input className="form-control" type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} /></label>
      <label className="form-label mb-0">Employee code<input className="form-control" placeholder="EMP0001" value={filters.employeeCode || ''} onChange={(event) => setFilters({ ...filters, employeeCode: event.target.value })} /></label>
      <label className="form-label mb-0">Employee name<input className="form-control" placeholder="Search employee" value={filters.employeeName || ''} onChange={(event) => setFilters({ ...filters, employeeName: event.target.value })} /></label>
      <label className="form-label mb-0">Department ID<input className="form-control" type="number" min="1" value={filters.departmentId || ''} onChange={(event) => setFilters({ ...filters, departmentId: event.target.value || undefined })} /></label>
      <label className="form-label mb-0">Device ID<input className="form-control" type="number" min="1" value={filters.deviceId || ''} onChange={(event) => setFilters({ ...filters, deviceId: event.target.value || undefined })} /></label>
      <label className="form-label mb-0">Application<input className="form-control" placeholder="Filter application" value={filters.applicationName || ''} onChange={(event) => setFilters({ ...filters, applicationName: event.target.value })} /></label>
      <label className="form-label mb-0">Work mode<select className="form-select" value={filters.workingMode || ''} onChange={(event) => setFilters({ ...filters, workingMode: event.target.value || undefined })}><option value="">All modes</option><option value="OFFICE">Office</option><option value="WFH">WFH</option></select></label>
      <div className="d-flex gap-2"><Button size="sm" variant="secondary" onClick={() => setPeriod(1)}>Day</Button><Button size="sm" variant="secondary" onClick={() => setPeriod(7)}>Week</Button><Button size="sm" variant="secondary" onClick={() => setPeriod(30)}>Month</Button></div>
      <Button icon={FileBarChart} variant="secondary" onClick={loadManagement}>Management view</Button><Button icon={Download} variant="secondary" onClick={() => download('excel')}>Excel</Button><Button icon={Download} variant="secondary" onClick={() => download('pdf')}>PDF</Button>
    </div></Card>
    {management && <Card title="Management summary"><div className="row g-3"><div className="col-6 col-md-3"><strong>{management.employeeDaysAnalyzed}</strong><div className="text-secondary-hz">Employee days</div></div><div className="col-6 col-md-3"><strong>{management.averageWorkingHours}</strong><div className="text-secondary-hz">Average hours</div></div><div className="col-6 col-md-3"><strong>{management.averageProductivityPercent}%</strong><div className="text-secondary-hz">Average productivity</div></div></div></Card>}
    <Card bodyClassName="p-0"><Table columns={columns} rows={data} getRowKey={(row, index) => `${row.employeeId || 'none'}-${row.deviceId}-${row.date}-${index}`} isLoading={isLoading} isError={isError} onRetry={refetch} emptyIcon={FileBarChart} emptyTitle="No activity in this range" emptyDescription="Recorded activity will appear here once an agent reports sessions." /></Card>
  </div>;
}
