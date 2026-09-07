import { CalendarOff, Clock3, WalletCards, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../../../components/ui/EmptyState';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { formatCurrency } from '../../../utils/formatCurrency';

export function EmployeeMetric({ icon: Icon, label, value, detail, tone }) {
  return <article className={`hz-dashboard__employee-metric hz-dashboard__employee-metric--${tone}`}><span className="hz-dashboard__employee-metric-icon"><Icon size={18} /></span><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

export function AttendanceWidget({ records, loading }) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((record) => record.punchTime?.slice(0, 10) === todayKey);
  const checkIn = todayRecords.find((record) => record.punchType === 'IN');
  const checkOut = todayRecords.find((record) => record.punchType === 'OUT');
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { label: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2), active: records.some((record) => record.punchTime?.slice(0, 10) === key) };
  });

  return (
    <section className="hz-dashboard__surface hz-attendance-widget" aria-labelledby="attendance-widget-title">
      <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Today</span><h2 id="attendance-widget-title">Attendance</h2></div><Clock3 size={19} aria-hidden="true" /></div>
      {loading ? <SkeletonText lines={4} /> : <>
        <div className="hz-attendance-widget__summary">
          <div><strong>{checkIn ? new Date(checkIn.punchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</strong><span>Check-in</span></div>
          <div><strong>{checkOut ? new Date(checkOut.punchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Working'}</strong><span>{checkOut ? 'Check-out' : 'Current status'}</span></div>
        </div>
        <div className="hz-attendance-widget__week" aria-label="Attendance for the last seven days">
          {days.map((day) => <span key={`${day.label}-${day.active}`} className={day.active ? 'is-present' : ''}><i />{day.label}</span>)}
        </div>
      </>}
      <Link to="/my-profile?tab=attendance" className="hz-dashboard__text-link">View attendance <ArrowRight size={15} /></Link>
    </section>
  );
}

export function LeaveWidget({ balances, requests, loading, year }) {
  const upcoming = requests.filter((request) => request.startDate >= new Date().toISOString().slice(0, 10)).sort((first, second) => first.startDate.localeCompare(second.startDate))[0];
  return (
    <section className="hz-dashboard__surface hz-leave-widget" aria-labelledby="leave-widget-title">
      <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">{year} balance</span><h2 id="leave-widget-title">Leave</h2></div><CalendarOff size={19} aria-hidden="true" /></div>
      {loading ? <SkeletonText lines={4} /> : balances.length ? <div className="hz-leave-widget__balances">{balances.slice(0, 3).map((balance) => <div key={balance.leaveTypeId}><span>{balance.leaveTypeName}</span><strong>{balance.remainingDays}<small> days</small></strong></div>)}</div> : <EmptyState icon={CalendarOff} title="No leave types yet" description="Your leave balances will appear here." />}
      <div className="hz-leave-widget__upcoming"><span>Upcoming leave</span><strong>{upcoming ? `${upcoming.leaveTypeName} · ${new Date(upcoming.startDate).toLocaleDateString()}` : 'Nothing scheduled'}</strong></div>
      <Link to="/my-profile?tab=leave" className="hz-dashboard__text-link">Apply leave <ArrowRight size={15} /></Link>
    </section>
  );
}

export function FinanceWidget({ salary }) {
  const structure = salary?.currentStructure;
  const latestPayslip = salary?.payrollHistory?.[0];
  return (
    <section className="hz-dashboard__surface hz-finance-widget" aria-labelledby="finance-widget-title">
      <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">My finances</span><h2 id="finance-widget-title">Latest pay</h2></div><WalletCards size={19} aria-hidden="true" /></div>
      <span className="hz-finance-widget__label">Net pay</span>
      <strong className="hz-finance-widget__amount">{structure ? formatCurrency(structure.netSalary) : '--'}</strong>
      <div className="hz-finance-widget__details"><span>Earnings <strong>{structure ? formatCurrency(structure.grossSalary) : '--'}</strong></span><span>Deductions <strong>{structure ? formatCurrency(structure.totalDeductions) : '--'}</strong></span></div>
      <p>{latestPayslip ? `Latest payslip · ${latestPayslip.paymentDate ? new Date(latestPayslip.paymentDate).toLocaleDateString() : 'Pending payment'}` : 'Your latest payslip will appear here.'}</p>
      <Link to="/my-payslip" className="hz-dashboard__text-link">View payslip <ArrowRight size={15} /></Link>
    </section>
  );
}
