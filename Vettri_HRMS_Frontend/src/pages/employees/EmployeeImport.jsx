import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, UploadCloud, XCircle } from 'lucide-react';
import { employeesApi } from '../../api/endpoints/employees';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import ErrorBanner from '../../components/ui/ErrorBanner';

export default function EmployeeImport() {
  const inputRef = useRef(null); const navigate = useNavigate(); const queryClient = useQueryClient();
  const [file, setFile] = useState(null); const [result, setResult] = useState(null); const [dragging, setDragging] = useState(false); const [error, setError] = useState('');
  const preview = useMutation({ mutationFn: employeesApi.previewImport, onSuccess: setResult, onError: showError });
  const commit = useMutation({ mutationFn: ({ file, validOnly }) => employeesApi.importEmployees(file, validOnly), onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: ['employees'] }); }, onError: showError });

  function showError(err) { setError(err.response?.data?.message || 'We could not process this workbook.'); }
  function choose(next) { const candidate = next?.[0]; if (!candidate) return; if (!/\.(xlsx|xls)$/i.test(candidate.name)) { setError('Choose an .xlsx or .xls workbook.'); return; } setFile(candidate); setResult(null); setError(''); }
  function inspect() { if (file) preview.mutate(file); }
  const validOnly = result?.invalidRows > 0;
  const ready = result && result.validRows > 0;

  return <div className="d-flex flex-column gap-4">
    <PageHeader eyebrow="Workforce / Employees" title="Import Employees" description="Validate your workbook before anything is added to your organization." actions={<Link to="/employees" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"><ArrowLeft size={16} /> Back to employees</Link>} />
    <div className="row g-4">
      <div className="col-12 col-xl-4"><div className="card border-0 h-100" style={{ boxShadow: 'var(--hz-shadow-md)' }}><div className="card-body p-4">
        <div className="d-flex align-items-center gap-3 mb-4"><Step number="1" active={!result} /><div><strong>Upload workbook</strong><div className="small text-secondary-hz">.xlsx or .xls</div></div></div>
        <div role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files); }} className="text-center p-4" style={{ border: `1px dashed ${dragging ? 'var(--hz-primary-500)' : 'var(--hz-border-strong)'}`, borderRadius: 10, background: dragging ? 'var(--hz-primary-50)' : 'var(--hz-gray-50)', cursor: 'pointer' }}>
          <UploadCloud size={30} color="var(--hz-primary-500)" /><p className="mb-1 mt-3 fw-semibold">Drop your workbook here</p><span className="small text-secondary-hz">or click to browse</span><input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => choose(e.target.files)} />
        </div>
        {file && <div className="d-flex align-items-center justify-content-between gap-2 mt-3 p-2" style={{ background: 'var(--hz-primary-50)', borderRadius: 8 }}><div className="d-flex align-items-center gap-2 text-truncate"><FileSpreadsheet size={18} color="var(--hz-primary-600)" /><span className="small text-truncate">{file.name} <span className="text-secondary-hz">({Math.ceil(file.size / 1024)} KB)</span></span></div><button type="button" className="btn btn-link p-0" onClick={() => { setFile(null); setResult(null); }} aria-label="Remove file"><XCircle size={17} /></button></div>}
        <div className="d-flex flex-column gap-2 mt-4"><Button variant="secondary" icon={Download} onClick={() => employeesApi.downloadImportTemplate()}>Download Excel Template</Button><Button icon={FileSpreadsheet} onClick={inspect} loading={preview.isPending} disabled={!file}>Validate Workbook</Button></div>
      </div></div></div>
      <div className="col-12 col-xl-8"><div className="card border-0" style={{ boxShadow: 'var(--hz-shadow-md)' }}><div className="card-body p-4">
        <div className="d-flex align-items-center gap-3 mb-4"><Step number="2" active={!!result} /><div><strong>Review validation</strong><div className="small text-secondary-hz">Every row is checked before import</div></div></div>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        {!result && <div className="py-5 text-center text-secondary-hz"><FileSpreadsheet size={42} strokeWidth={1.3} /><p className="mt-3 mb-0">Your validated preview will appear here.</p></div>}
        {result && <><div className="d-flex flex-wrap gap-3 mb-4"><Summary label="Valid employees" value={result.validRows} good /><Summary label="Rows needing attention" value={result.invalidRows} good={!result.invalidRows} /></div><div className="table-responsive"><table className="table align-middle"><thead><tr><th>Row</th><th>Employee</th><th>Email</th><th>Department</th><th>Status</th><th>Result</th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.row}><td>{row.row}</td><td><strong>{[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}</strong><div className="small text-secondary-hz">{row.employeeCode || 'No code'}</div></td><td>{row.email || '—'}</td><td>{row.department || '—'}</td><td>{row.status || 'Active'}</td><td>{row.valid ? <Badge variant="success" dot>Valid</Badge> : <div className="text-danger small">{row.errors?.join('; ')}</div>}</td></tr>)}</tbody></table></div><div className="d-flex justify-content-between align-items-center border-top pt-3 mt-2"><span className="small text-secondary-hz">{validOnly ? 'Only valid rows will be imported.' : 'All rows passed validation.'}</span><Button onClick={() => commit.mutate({ file, validOnly })} loading={commit.isPending} disabled={!ready}>{validOnly ? `Import ${result.validRows} valid employees` : `Import ${result.validRows} employees`}</Button></div></>}
      </div></div></div>
    </div>
    {commit.isSuccess && <div className="alert alert-success d-flex justify-content-between align-items-center"><span><CheckCircle2 size={18} className="me-2" />{commit.data.message}</span><Button variant="secondary" onClick={() => navigate('/employees')}>View Employees</Button></div>}
  </div>;
}

function Step({ number, active }) { return <span className="d-inline-flex align-items-center justify-content-center rounded-circle" style={{ width: 30, height: 30, color: active ? '#fff' : 'var(--hz-text-muted)', background: active ? 'var(--hz-primary-600)' : 'var(--hz-gray-200)', fontWeight: 700 }}>{number}</span>; }
function Summary({ label, value, good }) { return <div className="px-3 py-2" style={{ border: '1px solid var(--hz-border)', borderRadius: 8, minWidth: 170 }}><div className="small text-secondary-hz">{label}</div><strong style={{ color: good ? 'var(--hz-success-600)' : 'var(--hz-danger-600)', fontSize: 22 }}>{value}</strong></div>; }