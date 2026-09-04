import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Headphones, ShieldAlert, WalletCards, PlusCircle } from 'lucide-react';
import PageShell from '../components/ui/PageShell';
import SectionHeader from '../components/ui/SectionHeader';
import Button from '../components/ui/Button';
import Dialog from '../components/ui/Dialog';
import FormField from '../components/ui/FormField';
import EmptyState from '../components/ui/EmptyState';
import { selfServiceApi } from '../api/endpoints/selfService';

const supportLevels = [
  { label: 'Level 1', title: 'General support', icon: Headphones, description: 'For everyday questions about using Vettri HRMS.' },
  { label: 'Level 2', title: 'Account and billing', icon: WalletCards, description: 'For workspace, account, and billing-related assistance.' },
  { label: 'Level 3', title: 'Escalation', icon: ShieldAlert, description: 'For issues that need specialist review or priority handling.' },
];

export default function SupportInfo() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: 'GENERAL', priority: 'NORMAL' });
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({ queryKey: ['support-requests'], queryFn: selfServiceApi.supportRequests });
  const createRequest = useMutation({
    mutationFn: selfServiceApi.createSupportRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
      setForm({ subject: '', description: '', category: 'GENERAL', priority: 'NORMAL' });
      setOpen(false);
    },
  });

  return (
    <PageShell className="hz-support-page">
      <SectionHeader eyebrow="Support information" title="How support is organized" description="Get help with your Vettri HRMS workspace and track requests in one place." actions={<Button icon={PlusCircle} onClick={() => setOpen(true)}>Raise a request</Button>} />
      <section className="hz-support-grid" aria-label="Support levels">
        {supportLevels.map(({ label, title, icon: Icon, description }) => (
          <article className="hz-support-card" key={label}>
            <div className="hz-support-card__icon"><Icon size={19} /></div>
            <span>{label}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>
      <section className="hz-support-requests" aria-labelledby="support-requests-title">
        <SectionHeader title="My requests" description="Support requests submitted from your employee account." />
        {!isLoading && requests.length === 0 ? <EmptyState icon={Headphones} title="No support requests" description="Raise a request when you need help from your support team." /> : <div className="hz-self-service-list">{requests.map((request) => <div className="hz-self-service-list__row" key={request.id}><span className="hz-self-service-list__icon"><Headphones size={17} /></span><span><strong>{request.subject}</strong><small>{request.category} · {request.status}</small></span></div>)}</div>}
      </section>
      <Dialog open={open} onClose={() => setOpen(false)} title="Raise a support request" description="Tell your support team what you need help with.">
        <form onSubmit={(event) => { event.preventDefault(); createRequest.mutate(form); }}>
          <FormField label="Subject" required value={form.subject} onChange={(value) => setForm((current) => ({ ...current, subject: value }))} />
          <FormField as="select" label="Category" value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))}><option value="GENERAL">General</option><option value="ACCOUNT">Account</option><option value="PAYROLL">Payroll</option><option value="ATTENDANCE">Attendance</option><option value="LEAVE">Leave</option></FormField>
          <FormField as="textarea" label="Description" required rows={4} value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
          <div className="d-flex justify-content-end gap-2 mt-3"><Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={createRequest.isPending}>Submit request</Button></div>
        </form>
      </Dialog>
    </PageShell>
  );
}
