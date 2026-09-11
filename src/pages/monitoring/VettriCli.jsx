import { useEffect, useRef, useState } from 'react';
import { Copy, Play, Square, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { monitoringApi, getDeviceName, isDeviceOnline } from '../../api/endpoints/monitoring';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';

const HISTORY_KEY = 'vettri-cli-history';

export default function VettriCli() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const terminalRef = useRef(null);
  const [command, setCommand] = useState('');
  const [shellType, setShellType] = useState('POWERSHELL');
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'));

  const deviceQuery = useQuery({ queryKey: ['monitoring-device', id], queryFn: () => monitoringApi.deviceById(id) });
  const commandsQuery = useQuery({ queryKey: ['remote-commands', id], queryFn: () => monitoringApi.remoteCommands(id), refetchInterval: selected && ['QUEUED', 'RUNNING'].includes(selected.status) ? 1500 : 5000 });
  const create = useMutation({ mutationFn: (payload) => monitoringApi.createRemoteCommand(id, payload), onSuccess: (job) => { setSelected(job); queryClient.invalidateQueries({ queryKey: ['remote-commands', id] }); } });
  const cancel = useMutation({ mutationFn: () => monitoringApi.cancelRemoteCommand(id, selected.id), onSuccess: (job) => setSelected(job) });
  const device = deviceQuery.data;
  const rows = commandsQuery.data || [];

  useEffect(() => { if (selected) { const latest = rows.find((row) => row.id === selected.id); if (latest) setSelected(latest); } }, [rows, selected]);
  useEffect(() => { terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight }); }, [selected]);

  function execute(event) {
    event.preventDefault();
    if (!command.trim() || create.isPending) return;
    const nextHistory = [command.trim(), ...history.filter((item) => item !== command.trim())].slice(0, 20);
    setHistory(nextHistory); localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    create.mutate({ command: command.trim(), shellType });
    setCommand('');
  }

  const output = selected ? `${selected.stdout || ''}${selected.stderr ? `\n[stderr]\n${selected.stderr}` : ''}` : 'Select a command from history or execute one for this device.';
  return <div className="d-flex flex-column gap-4">
    <Link to={`/monitoring/devices/${id}`} className="text-decoration-none text-secondary-hz">← Back to device</Link>
    <Card>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div><div className="text-secondary-hz" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>TARGET DEVICE</div><h1 className="mb-1" style={{ fontSize: 'var(--hz-text-xl)' }}>{getDeviceName(device)}</h1><StatusBadge status={isDeviceOnline(device) ? 'ACTIVE' : 'INACTIVE'} variant={isDeviceOnline(device) ? 'success' : 'neutral'} dot>{isDeviceOnline(device) ? 'Online' : 'Offline'}</StatusBadge></div>
        <div className="text-secondary-hz" style={{ fontSize: 13 }}>Authenticated agent channel</div>
      </div>
    </Card>
    <div className="row g-4">
      <div className="col-12 col-xl-9"><Card title="Vettri CLI" subtitle="Commands execute on the selected Windows device through HaodaOne Agent.">
        <div ref={terminalRef} style={{ minHeight: 330, maxHeight: 500, overflow: 'auto', background: 'var(--hz-gray-950, #111827)', color: '#e5e7eb', padding: 20, borderRadius: 8, fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', whiteSpace: 'pre-wrap' }}>
          {selected && <div style={{ color: '#93c5fd', marginBottom: 14 }}>{shellType === 'CMD' ? 'C:\\>' : 'PS>'} {selected.command}</div>}
          {output}
        </div>
        {selected && <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3"><span className="text-secondary-hz">Status: <strong>{selected.status}</strong>{selected.exitCode !== null && selected.exitCode !== undefined ? ` · Exit code ${selected.exitCode}` : ''}</span><div className="d-flex gap-2"><Button size="sm" variant="secondary" icon={Copy} onClick={() => navigator.clipboard.writeText(output)}>Copy output</Button>{['QUEUED', 'RUNNING'].includes(selected.status) && <Button size="sm" variant="danger" icon={Square} onClick={() => cancel.mutate()} loading={cancel.isPending}>Cancel</Button>}</div></div>}
        <form onSubmit={execute} className="d-flex flex-column gap-3 mt-4"><label className="form-label mb-0">Command<textarea className="form-control mt-1" rows={3} value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) execute(event); }} placeholder="hostname" disabled={!isDeviceOnline(device)} /></label><div className="d-flex justify-content-between gap-3"><select className="form-select" style={{ maxWidth: 180 }} value={shellType} onChange={(event) => setShellType(event.target.value)}><option value="POWERSHELL">PowerShell</option><option value="CMD">CMD</option></select><Button type="submit" icon={Play} loading={create.isPending} disabled={!isDeviceOnline(device) || !command.trim()}>Execute</Button></div></form>
        {create.isError && <p className="text-danger mt-3 mb-0">{create.error?.response?.data?.message || 'Could not queue command.'}</p>}
      </Card></div>
      <div className="col-12 col-xl-3"><Card title="Recent commands" actions={<Button size="sm" variant="ghost" icon={Trash2} aria-label="Clear command history" onClick={() => { setHistory([]); localStorage.removeItem(HISTORY_KEY); }} />}><div className="d-flex flex-column gap-2">{history.length === 0 && <span className="text-secondary-hz">No local history yet.</span>}{history.map((item) => <button key={item} type="button" className="btn btn-link text-start p-0 text-decoration-none" onClick={() => setCommand(item)} style={{ overflowWrap: 'anywhere' }}>{item}</button>)}</div></Card></div>
    </div>
  </div>;
}