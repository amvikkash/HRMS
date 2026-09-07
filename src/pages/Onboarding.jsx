import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2, CalendarDays, CheckSquare, Clock3, ShieldCheck, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { employeesApi } from '../api/endpoints/employees';
import { departmentsApi } from '../api/endpoints/organization';
import { leaveTypesApi } from '../api/endpoints/leave';
import { devicesApi } from '../api/endpoints/attendance';
import { payrollApi } from '../api/endpoints/salary';
import { useAuth } from '../hooks/useAuth';

const STEPS = [
  { title: 'Company profile', description: 'Confirm the workspace identity and core company details.', to: '/settings/organization', icon: Building2 },
  { title: 'Organization', description: 'Set up departments, designations, and teams.', to: '/settings/organization', icon: Users },
  { title: 'Employees', description: 'Build your people directory with the employees you manage.', to: '/employees', icon: CheckSquare },
  { title: 'Leave', description: 'Configure leave types and manage time-off requests.', to: '/settings/leave', icon: CalendarDays },
  { title: 'Attendance', description: 'Connect devices and review today’s attendance activity.', to: '/attendance', icon: Clock3 },
  { title: 'Payroll', description: 'Review salary setup and payroll processing access.', to: '/salary', icon: Wallet },
  { title: 'Users and permissions', description: 'Invite users and review their roles and access.', to: '/settings/users', icon: ShieldCheck },
];

export default function Onboarding() {
  const [activeStep, setActiveStep] = useState(0);
  const { user, hasPermission } = useAuth();
  const employees = useQuery({ queryKey: ['onboarding-employees'], queryFn: () => employeesApi.list(), enabled: hasPermission('EMPLOYEE_VIEW') });
  const departments = useQuery({ queryKey: ['onboarding-departments'], queryFn: departmentsApi.list, enabled: hasPermission('ORG_VIEW') });
  const leaveTypes = useQuery({ queryKey: ['onboarding-leave-types'], queryFn: leaveTypesApi.list, enabled: hasPermission('LEAVE_MANAGE') });
  const devices = useQuery({ queryKey: ['onboarding-devices'], queryFn: devicesApi.list, enabled: hasPermission('DEVICE_MANAGE') });
  const payrollRuns = useQuery({ queryKey: ['onboarding-payroll-runs'], queryFn: payrollApi.listRuns, enabled: hasPermission('SALARY_VIEW') });
  const step = STEPS[activeStep];
  const StepIcon = step.icon;
  const completion = [
    Boolean(user?.companyName),
    (departments.data || []).length > 0,
    (employees.data || []).length > 0,
    (leaveTypes.data || []).length > 0,
    (devices.data || []).length > 0,
    (payrollRuns.data || []).length > 0,
    true,
  ];
  const completedSteps = completion.filter(Boolean).length;

  return (
    <div className="hz-onboarding d-flex flex-column gap-4">
      <PageHeader
        eyebrow="Workspace setup"
        title="Set up your Vettri workspace"
        description={`${completedSteps} of ${STEPS.length} setup areas are ready. Complete the remaining essentials from each workspace.`}
      />

      <div className="row g-4 align-items-start">
        <div className="col-12 col-lg-4">
          <Card title="Setup steps" subtitle="Visit each area when you are ready">
            <div className="hz-onboarding-steps">
              {STEPS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.title}
                    className={`hz-onboarding-step ${activeStep === index ? 'hz-onboarding-step--active' : ''}`}
                    onClick={() => setActiveStep(index)}
                  >
                    <span className="hz-onboarding-step__number">{completion[index] ? '✓' : index + 1}</span>
                    <Icon size={16} />
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="col-12 col-lg-8">
          <Card className="hz-onboarding-focus">
            <div className="hz-onboarding-focus__icon"><StepIcon size={24} /></div>
            <p className="hz-page-header__eyebrow">Step {activeStep + 1} of {STEPS.length}</p>
            <h2>{step.title}</h2>
            <p>{step.description}</p>
            <Link to={step.to} className="text-decoration-none">
              <Button icon={ArrowRight}>Open {step.title}</Button>
            </Link>
            <div className="hz-onboarding-focus__footer">
              <button type="button" className="btn btn-link p-0" disabled={activeStep === 0} onClick={() => setActiveStep((value) => value - 1)}>Previous</button>
              <button type="button" className="btn btn-link p-0" disabled={activeStep === STEPS.length - 1} onClick={() => setActiveStep((value) => value + 1)}>Next step</button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
