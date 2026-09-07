import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Upload, FileText } from 'lucide-react';
import { careersApi } from '../../api/endpoints/recruitment';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonText } from '../../components/ui/Skeleton';
import PublicLayout from './PublicLayout';
import ErrorBanner from '../../components/ui/ErrorBanner';

const MAX_RESUME_MB = 10;

export default function JobApply() {
  const { jobId } = useParams();
  const { data: job, isLoading, isError, refetch } = useQuery({ queryKey: ['careers-job', jobId], queryFn: () => careersApi.getJob(jobId) });

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', experienceYears: '', skills: '', notes: '' });
  const [resumeFile, setResumeFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const apply = useMutation({
    mutationFn: () =>
      careersApi.apply(
        {
          ...form,
          jobOpeningId: Number(jobId),
          experienceYears: form.experienceYears === '' ? null : Number(form.experienceYears),
        },
        resumeFile
      ),
    onSuccess: () => setSubmitted(true),
    onError: (err) => setError(err.response?.data?.message || 'Could not submit your application. Please try again.'),
  });

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) {
      setResumeFile(null);
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setFileError('Please upload a PDF, DOC, or DOCX file.');
      setResumeFile(null);
      return;
    }
    if (file.size > MAX_RESUME_MB * 1024 * 1024) {
      setFileError(`File is too large. Maximum size is ${MAX_RESUME_MB}MB.`);
      setResumeFile(null);
      return;
    }
    setResumeFile(file);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    apply.mutate();
  }

  if (isLoading) {
    return (
      <PublicLayout>
        <SkeletonText lines={6} />
      </PublicLayout>
    );
  }

  if (isError) {
    return (
      <PublicLayout>
        <ErrorState title="Position not found" description="This role may have been filled or is no longer open." onRetry={refetch} />
      </PublicLayout>
    );
  }

  if (submitted) {
    return (
      <PublicLayout>
        <div className="hz-surface p-5 text-center">
          <CheckCircle2 size={48} color="var(--hz-success-600)" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 'var(--hz-text-xl)', fontWeight: 700, marginBottom: 8 }}>Application received!</h2>
          <p className="text-secondary-hz" style={{ maxWidth: 460, margin: '0 auto' }}>
            Thanks for applying to <strong>{job.title}</strong>. Our team will review your application and reach out if there's a match.
          </p>
          <Link to="/careers" className="d-inline-block mt-4">
            <Button variant="secondary">Browse more openings</Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <Link to="/careers" className="d-inline-flex align-items-center gap-1 text-decoration-none mb-4" style={{ color: 'var(--hz-text-secondary)', fontSize: 'var(--hz-text-sm)' }}>
        <ArrowLeft size={15} /> Back to Open Positions
      </Link>

      <div className="hz-surface p-4 mb-4">
        <h1 style={{ fontSize: 'var(--hz-text-xl)', fontWeight: 700, marginBottom: 6 }}>{job.title}</h1>
        <div className="d-flex align-items-center gap-3 flex-wrap mb-3" style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
          {job.departmentName && <span>{job.departmentName}</span>}
          {job.designationTitle && <span>· {job.designationTitle}</span>}
          <span>· {(job.employmentType || 'FULL_TIME').replace('_', '-')}</span>
        </div>
        {job.description && <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)', whiteSpace: 'pre-wrap', marginBottom: 0 }}>{job.description}</p>}
      </div>

      <div className="hz-surface p-4">
        <h2 style={{ fontSize: 'var(--hz-text-lg)', fontWeight: 600, marginBottom: 16 }}>Apply for this role</h2>
        <form onSubmit={handleSubmit}>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>First Name *</label>
              <input className="form-control" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div className="col-6">
              <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>Last Name *</label>
              <input className="form-control" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>Email *</label>
              <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="col-6">
              <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>Mobile Number *</label>
              <input type="tel" className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>Years of Experience</label>
              <input type="number" min="0" step="0.5" className="form-control" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} />
            </div>
            <div className="col-6">
              <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>Key Skills</label>
              <input className="form-control" placeholder="React, Java, SQL…" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>Anything else you'd like us to know?</label>
            <textarea className="form-control" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="mb-1">
            <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>Resume (PDF, DOC, or DOCX, max {MAX_RESUME_MB}MB)</label>
            <label
              htmlFor="resume-upload"
              className="d-flex align-items-center gap-2 px-3 py-3"
              style={{ border: '1px dashed var(--hz-border)', borderRadius: 8, cursor: 'pointer', fontSize: 'var(--hz-text-sm)', color: resumeFile ? 'var(--hz-text-primary)' : 'var(--hz-text-muted)' }}
            >
              {resumeFile ? <FileText size={18} /> : <Upload size={18} />}
              {resumeFile ? resumeFile.name : 'Click to choose a file'}
            </label>
            <input id="resume-upload" type="file" accept=".pdf,.doc,.docx" className="d-none" onChange={handleFileChange} />
            {fileError && <div style={{ color: 'var(--hz-danger-600)', fontSize: 12, marginTop: 6 }}>{fileError}</div>}
          </div>
          <div className="d-flex justify-content-end mt-4">
            <Button type="submit" loading={apply.isPending} disabled={!!fileError}>
              Submit Application
            </Button>
          </div>
        </form>
      </div>
    </PublicLayout>
  );
}
