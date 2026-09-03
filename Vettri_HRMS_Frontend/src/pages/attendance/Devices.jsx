import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Fingerprint, Pencil, Check, X } from 'lucide-react';
import { devicesApi } from '../../api/endpoints/attendance';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonText } from '../../components/ui/Skeleton';

export default function Devices() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const { data: devices, isLoading, isError, refetch } = useQuery({ queryKey: ['devices'], queryFn: devicesApi.list });

  const rename = useMutation({
    mutationFn: ({ id, deviceName }) => devicesApi.rename(id, deviceName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setEditingId(null);
    },
  });

  return (
    <div className="d-flex flex-column gap-4">
      <Link to="/attendance" className="d-inline-flex align-items-center gap-1 text-decoration-none" style={{ color: 'var(--hz-text-secondary)', fontSize: 'var(--hz-text-sm)', width: 'fit-content' }}>
        <ArrowLeft size={15} /> Back to Attendance
      </Link>

      <div>
        <h1 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700 }}>Biometric Devices</h1>
        <p className="text-secondary-hz" style={{ fontSize: 'var(--hz-text-sm)' }}>
          Devices self-register the moment they push their first ADMS handshake — nothing to configure here first
        </p>
      </div>

      <Card bodyClassName="p-0">
        {isLoading && (
          <div className="p-4">
            <SkeletonText lines={4} />
          </div>
        )}
        {isError && <ErrorState description="Couldn't load devices." onRetry={refetch} />}
        {!isLoading && !isError && devices?.length === 0 && (
          <EmptyState
            icon={Fingerprint}
            title="No devices have checked in yet"
            description="Point your eSSL device's ADMS server address at this backend - it'll appear here on its first handshake."
          />
        )}
        {!isLoading && !isError && devices?.length > 0 && (
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
            <thead>
              <tr style={{ fontSize: 'var(--hz-text-xs)', color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>
                <th className="ps-4">Device Name</th>
                <th>Serial Number</th>
                <th>Last IP</th>
                <th>Last Seen</th>
                <th className="pe-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id}>
                  <td className="ps-4">
                    {editingId === d.id ? (
                      <div className="d-flex align-items-center gap-1">
                        <input
                          className="form-control form-control-sm"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{ width: 160 }}
                          autoFocus
                        />
                        <button className="btn btn-sm btn-light border-0" onClick={() => rename.mutate({ id: d.id, deviceName: editValue })} aria-label="Save device name">
                          <Check size={14} />
                        </button>
                        <button className="btn btn-sm btn-light border-0" onClick={() => setEditingId(null)} aria-label="Cancel renaming device">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)' }}>{d.deviceName}</span>
                        <button
                          className="btn btn-sm btn-light border-0 p-1"
                          onClick={() => {
                            setEditingId(d.id);
                            setEditValue(d.deviceName);
                          }}
                          aria-label={`Rename device "${d.deviceName}"`}
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>{d.serialNumber}</td>
                  <td style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>{d.lastIpAddress || '—'}</td>
                  <td style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
                    {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="pe-4">
                    <Badge variant={d.online ? 'success' : 'neutral'} dot>
                      {d.online ? 'Online' : 'Offline'}
                    </Badge>
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
