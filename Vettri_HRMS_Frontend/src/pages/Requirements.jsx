import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react';
import { requirementsApi } from '../api/endpoints/requirements';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'REJECTED'];

export default function Requirements() {
  const client = useQueryClient();
  const [status, setStatus] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const { data = [], isLoading, isError } = useQuery({ queryKey: ['requirements', status], queryFn: () => requirementsApi.list(status) });
  const create = useMutation({ mutationFn: () => requirementsApi.create({ title, description }), onSuccess: () => { setTitle(''); setDescription(''); client.invalidateQueries({ queryKey: ['requirements'] }); } });
  const changeStatus = useMutation({ mutationFn: ({ id, nextStatus }) => requirementsApi.changeStatus(id, nextStatus, closeReason), onSuccess: () => { setCloseReason(''); client.invalidateQueries({ queryKey: ['requirements'] }); } });

  return <div className="d-flex flex-column gap-4">
    <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
      <div><h1 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700 }}>Requirements</h1><p className="text-secondary-hz mb-0">Track requests and delivery status for your company.</p></div>
      <form className="d-flex gap-2" onSubmit={(event) => { event.preventDefault(); if (title.trim()) create.mutate(); }}>
        <input className="form-control" placeholder="New requirement" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Requirement title" />
        <Button icon={Plus} loading={create.isPending}>Add</Button>
      </form>
    </div>
    <div className="d-flex gap-2 flex-wrap">
      <select className="form-select" style={{ maxWidth: 190 }} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter status"><option value="">All statuses</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
      <input className="form-control" style={{ maxWidth: 360 }} placeholder="Description for the next requirement" value={description} onChange={(event) => setDescription(event.target.value)} aria-label="Requirement description" />
    </div>
    {isError && <p className="text-danger">Unable to load requirements.</p>}
    {!isLoading && data.length === 0 && <Card><div className="hz-state"><div className="hz-state__icon-wrap"><ClipboardList size={26} /></div><p className="hz-state__title">No requirements yet</p></div></Card>}
    <div className="d-flex flex-column gap-2">{data.map((item) => <Card key={item.id}><div className="d-flex justify-content-between align-items-start gap-3"><div><h2 style={{ fontSize: 'var(--hz-text-lg)', marginBottom: 4 }}>{item.title}</h2><p className="text-secondary-hz mb-2">{item.description || 'No description'}</p>{item.status === 'CLOSED' && <small>Closed: {item.closeReason}</small>}</div><Badge variant={item.status === 'CLOSED' || item.status === 'COMPLETED' ? 'success' : 'neutral'}>{item.status}</Badge></div><div className="d-flex align-items-center gap-2 mt-3"><select className="form-select form-select-sm" style={{ maxWidth: 180 }} value={item.status} onChange={(event) => { const nextStatus = event.target.value; if (nextStatus === 'CLOSED') { const reason = window.prompt('Close reason is required'); if (!reason?.trim()) return; requirementsApi.changeStatus(item.id, nextStatus, reason).then(() => client.invalidateQueries({ queryKey: ['requirements'] })); } else changeStatus.mutate({ id: item.id, nextStatus }); }} aria-label={`Change status for ${item.title}`}>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select></div></Card>)}</div>
  </div>;
}
