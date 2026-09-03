import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Radio, Clock, Fingerprint, AlertTriangle, CalendarOff, Users } from 'lucide-react';
import { attendanceApi } from '../../api/endpoints/attendance';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonText } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';

function PunchBadge({ type }) {
  const variant = type === 'IN' ? 'success' : type === 'OUT' ? 'danger' : 'neutral';
  return <Badge variant={variant}>{type}</Badge>;
}

/**
 * "Exception" here means exactly one thing: an active employee with zero
 * punches today, who also isn't on approved leave - see
 * AttendanceExceptionDTO on the backend for why lateness/early-leave
 * aren't included (no shift/scheduled-hours concept exists to measure
 * against, so that would mean guessing a threshold).
 */
function AttendanceExceptionsCard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['attendance-exceptions'],
    queryFn: () => attendanceApi.exceptions(),
  });

  return (
    <Card
      title="Attendance Exceptions"
      subtitle={data?.date ? `Employees with no punch on ${data.date}` : undefined}
    >
      {isLoading && <SkeletonText lines={2} />}
      {isError && <ErrorState description="Couldn't load exceptions." onRetry={refetch} />}
      {!isLoading && !isError && data && !data.workingDay && (
        <EmptyState icon={CalendarOff} title="Not a working day" description="Weekends and company holidays are excluded from this check." />
      )}
      {!isLoading && !isError && data?.workingDay && data.missingPunch.length === 0 && (
        <EmptyState icon={Clock} title="No exceptions" description="Every active employee has either punched in or is on approved leave today." />
      )}
      {!isLoading && !isError && data?.workingDay && data.missingPunch.length > 0 && (
        <div className="d-flex flex-column gap-2">
          <div className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: 13, color: 'var(--hz-warning-600)' }}>
            <AlertTriangle size={15} />
            {data.missingPunch.length} employee{data.missingPunch.length === 1 ? '' : 's'} with no punch today
          </div>
          <div className="d-flex flex-wrap gap-2">
            {data.missingPunch.map((emp) => (
              <Link
                key={emp.id}
                to={`/employees/${emp.id}`}
                className="d-flex align-items-center gap-2 text-decoration-none px-2 py-1 rounded-3"
                style={{ background: 'var(--hz-gray-50)', border: '1px solid var(--hz-border)' }}
              >
                <Avatar name={emp.fullName} size="sm" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--hz-text-primary)' }}>{emp.fullName}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function AttendanceList() {
  const [liveRecords, setLiveRecords] = useState([]);
  const [connectionState, setConnectionState] = useState('connecting');
  const eventSourceRef = useRef(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => attendanceApi.byDate(),
  });

  useEffect(() => {
    if (data) {
      setLiveRecords(data);
    }
  }, [data]);

  useEffect(() => {
    const es = new EventSource(attendanceApi.streamUrl());
    eventSourceRef.current = es;

    es.addEventListener('connected', () => setConnectionState('live'));
    es.addEventListener('attendance', (event) => {
      try {
        const record = JSON.parse(event.data);
        setLiveRecords((prev) => (prev.some((r) => r.id === record.id) ? prev : [record, ...prev]));
      } catch {
        setConnectionState('disconnected');
      }
    });
    es.onerror = () => setConnectionState('disconnected');

    return () => es.close();
  }, []);

  const uniqueEmployees = new Set(liveRecords.filter((record) => record.employeeId).map((record) => record.employeeId)).size;
  const unmappedPunches = liveRecords.filter((record) => !record.mapped).length;

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader
        eyebrow="Workforce"
        title="Attendance"
        description="Live punches from your biometric devices, today"
        actions={<div className="d-flex align-items-center gap-2">
          <Link to="/attendance/devices">
            <Button variant="secondary" size="sm" icon={Fingerprint}>
              Devices
            </Button>
          </Link>
          <div
            className="d-inline-flex align-items-center gap-2 px-3 py-1"
            style={{
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              background: connectionState === 'live' ? 'var(--hz-success-50)' : 'var(--hz-gray-100)',
              color: connectionState === 'live' ? 'var(--hz-success-600)' : 'var(--hz-text-secondary)',
            }}
          >
            <Radio size={13} />
            {connectionState === 'live' ? 'Live' : connectionState === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
          </div>
        </div>}
      />

      <div className="row g-3">
        <AttendanceMetric label="Punches today" value={liveRecords.length} icon={Clock} tone="primary" />
        <AttendanceMetric label="Employees recorded" value={uniqueEmployees} icon={Users} tone="success" />
        <AttendanceMetric label="Unmapped punches" value={unmappedPunches} icon={AlertTriangle} tone="warning" />
      </div>

      <AttendanceExceptionsCard />

      <Card bodyClassName="p-0">
        {isLoading && (
          <div className="p-4">
            <SkeletonText lines={6} />
          </div>
        )}

        {isError && <ErrorState description="Couldn't load today's attendance." onRetry={refetch} />}

        {!isLoading && !isError && liveRecords.length === 0 && (
          <EmptyState
            icon={Clock}
            title="No punches yet today"
            description="As soon as someone scans their fingerprint on a mapped device, it'll show up here instantly."
          />
        )}

        {!isLoading && !isError && liveRecords.length > 0 && (
          <div className="table-responsive">
            <table className="table mb-0 align-middle hz-table" aria-label="Today's attendance">
            <thead>
              <tr style={{ fontSize: 'var(--hz-text-xs)', color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>
                <th className="ps-4">Employee</th>
                <th>Department</th>
                <th>Punch Time</th>
                <th>Type</th>
                <th>Verify Mode</th>
                <th className="pe-4">Device</th>
              </tr>
            </thead>
            <tbody>
              {liveRecords.map((r) => (
                <tr key={r.id}>
                  <td className="ps-4">
                    {r.mapped ? (
                      <Link to={`/employees/${r.employeeId}`} className="d-flex align-items-center gap-2 text-decoration-none">
                        <Avatar name={r.employeeName} size="sm" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-primary)' }}>
                            {r.employeeName}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{r.employeeCode}</div>
                        </div>
                      </Link>
                    ) : (
                      <div className="d-flex align-items-center gap-2">
                        <Avatar name="?" size="sm" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)' }}>{r.employeeName}</div>
                          <Badge variant="warning">Unmapped</Badge>
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 'var(--hz-text-sm)' }}>{r.departmentName || '—'}</td>
                  <td style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
                    {new Date(r.punchTime).toLocaleTimeString()}
                  </td>
                  <td>
                    <PunchBadge type={r.punchType} />
                  </td>
                  <td style={{ fontSize: 'var(--hz-text-sm)' }}>{r.verifyMode}</td>
                  <td className="pe-4" style={{ fontSize: 'var(--hz-text-sm)' }}>
                    {r.deviceName}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function AttendanceMetric({ label, value, icon: Icon, tone }) {
  return (
    <div className="col-12 col-md-4">
      <div className="hz-metric d-flex align-items-center gap-3">
        <div className={`hz-metric__icon hz-metric__icon--${tone}`}><Icon size={18} /></div>
        <div>
          <div className="hz-metric__value">{value}</div>
          <div className="hz-metric__label">{label}</div>
        </div>
      </div>
    </div>
  );
}
