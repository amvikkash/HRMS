import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, ShieldCheck } from 'lucide-react';
import { adminApi } from '../api/endpoints/admin';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';

const plans = ['STARTER', 'BUSINESS', 'ENTERPRISE'];
const statuses = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'];
const emptySubscription = { plan: 'STARTER', status: 'TRIAL', employeeLimit: 25, deviceLimit: 2, startDate: '', renewalDate: '', amount: '' };

export default function SettingsPlatform() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [company, setCompany] = useState({ name: '', domain: '', productiveThresholdPercent: 80, neutralThresholdPercent: 50 });
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [subscription, setSubscription] = useState(emptySubscription);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const companies = useQuery({ queryKey: ['admin-companies'], queryFn: adminApi.companies, enabled: hasRole('SUPER_ADMIN') });
  const subscriptions = useQuery({ queryKey: ['admin-subscriptions'], queryFn: adminApi.subscriptions, enabled: hasRole('SUPER_ADMIN') });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
    queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
  };
  const saveCompany = useMutation({ mutationFn: (payload) => editingCompanyId ? adminApi.updateCompany(editingCompanyId, payload) : adminApi.createCompany(payload), onSuccess: (saved) => { setCompany({ name: '', domain: '', productiveThresholdPercent: 80, neutralThresholdPercent: 50 }); setEditingCompanyId(null); setSelectedCompany(String(saved.id)); refresh(); } });
  const saveSubscription = useMutation({ mutationFn: ({ id, companyId, payload }) => id ? adminApi.updateSubscription(id, payload) : adminApi.createSubscription(companyId, payload), onSuccess: () => { setSubscription(emptySubscription); setEditingSubscriptionId(null); refresh(); } });

  if (!hasRole('SUPER_ADMIN')) return <EmptyState icon={ShieldCheck} title="Platform administration unavailable" description="Only platform administrators can manage companies and subscriptions." />;

  return <div className="hz-settings-page hz-platform-settings d-flex flex-column gap-4">
    <PageHeader eyebrow="Platform" title="Platform Administration" description="Manage tenant accounts and their subscription limits." />
    <Card title={editingCompanyId ? 'Edit company' : 'Add company'} subtitle="Create a tenant before assigning its plan.">
      <form className="row g-3 align-items-end" onSubmit={(event) => { event.preventDefault(); saveCompany.mutate({ ...company, productiveThresholdPercent: Number(company.productiveThresholdPercent), neutralThresholdPercent: Number(company.neutralThresholdPercent) }); }}>
        <div className="col-md-5"><label className="hz-form-label">Company name<input required className="form-control" value={company.name} onChange={(event) => setCompany({ ...company, name: event.target.value })} /></label></div>
        <div className="col-md-5"><label className="hz-form-label">Domain<input className="form-control" placeholder="example.com" value={company.domain} onChange={(event) => setCompany({ ...company, domain: event.target.value })} /></label></div>
        <div className="col-md-2"><label className="hz-form-label">Productive %<input type="number" min="1" max="100" className="form-control" value={company.productiveThresholdPercent} onChange={(event) => setCompany({ ...company, productiveThresholdPercent: event.target.value })} /></label></div>
        <div className="col-md-2"><label className="hz-form-label">Neutral %<input type="number" min="0" max="99" className="form-control" value={company.neutralThresholdPercent} onChange={(event) => setCompany({ ...company, neutralThresholdPercent: event.target.value })} /></label></div>
        <div className="col-md-2"><Button type="submit" icon={editingCompanyId ? Save : Plus} disabled={saveCompany.isPending}>{editingCompanyId ? 'Save' : 'Create'}</Button></div>
      </form>
    </Card>
    <Card title="Companies" subtitle={`${companies.data?.length || 0} tenant accounts`}>
      {companies.isLoading ? <p className="text-secondary-hz mb-0">Loading companies...</p> : <div className="table-responsive"><table className="table align-middle mb-0 hz-table" aria-label="Tenant companies"><thead><tr><th>Name</th><th>Domain</th><th>Thresholds</th><th>Actions</th></tr></thead><tbody>{(companies.data || []).map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.domain || 'Not set'}</td><td>{item.productiveThresholdPercent}% / {item.neutralThresholdPercent}%</td><td className="d-flex gap-2"><Button size="sm" variant="secondary" onClick={() => { setEditingCompanyId(item.id); setCompany({ name: item.name, domain: item.domain || '', productiveThresholdPercent: item.productiveThresholdPercent || 80, neutralThresholdPercent: item.neutralThresholdPercent || 50 }); }}>Edit</Button><Button size="sm" variant="secondary" onClick={() => setSelectedCompany(String(item.id))}>Subscription</Button></td></tr>)}</tbody></table></div>}
    </Card>
    <Card title={editingSubscriptionId ? 'Edit subscription' : 'Assign subscription'} subtitle="Subscription limits are enforced by the backend.">
      <form className="row g-3 align-items-end" onSubmit={(event) => { event.preventDefault(); saveSubscription.mutate({ id: editingSubscriptionId, companyId: Number(selectedCompany), payload: { ...subscription, employeeLimit: Number(subscription.employeeLimit), deviceLimit: Number(subscription.deviceLimit), amount: subscription.amount ? Number(subscription.amount) : null, startDate: subscription.startDate || null, renewalDate: subscription.renewalDate || null } }); }}>
        <div className="col-md-3"><label className="hz-form-label">Company<select required className="form-select" value={selectedCompany} onChange={(event) => setSelectedCompany(event.target.value)}><option value="">Select company</option>{(companies.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
        <div className="col-md-2"><label className="hz-form-label">Plan<select className="form-select" value={subscription.plan} onChange={(event) => setSubscription({ ...subscription, plan: event.target.value })}>{plans.map((item) => <option key={item}>{item}</option>)}</select></label></div>
        <div className="col-md-2"><label className="hz-form-label">Status<select className="form-select" value={subscription.status} onChange={(event) => setSubscription({ ...subscription, status: event.target.value })}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label></div>
        <div className="col-md-2"><label className="hz-form-label">Employees<input type="number" min="1" className="form-control" value={subscription.employeeLimit} onChange={(event) => setSubscription({ ...subscription, employeeLimit: event.target.value })} /></label></div>
        <div className="col-md-2"><label className="hz-form-label">Devices<input type="number" min="1" className="form-control" value={subscription.deviceLimit} onChange={(event) => setSubscription({ ...subscription, deviceLimit: event.target.value })} /></label></div>
        <div className="col-md-1"><Button type="submit" icon={Save} disabled={!selectedCompany || saveSubscription.isPending} aria-label="Save subscription" /></div>
      </form>
    </Card>
    <Card title="Subscriptions"><div className="table-responsive"><table className="table align-middle mb-0 hz-table" aria-label="Subscriptions"><thead><tr><th>Company</th><th>Plan</th><th>Status</th><th>Employees</th><th>Devices</th><th /></tr></thead><tbody>{(subscriptions.data || []).map((item) => <tr key={item.id}><td>{(companies.data || []).find((companyItem) => companyItem.id === item.companyId)?.name || item.companyId}</td><td>{item.plan}</td><td>{item.status}</td><td>{item.employeeLimit}</td><td>{item.deviceLimit}</td><td><Button size="sm" variant="secondary" onClick={() => { setEditingSubscriptionId(item.id); setSelectedCompany(String(item.companyId)); setSubscription({ plan: item.plan, status: item.status, employeeLimit: item.employeeLimit, deviceLimit: item.deviceLimit, startDate: item.startDate || '', renewalDate: item.renewalDate || '', amount: item.amount || '' }); }}>Edit</Button></td></tr>)}</tbody></table></div></Card>
  </div>;
}
