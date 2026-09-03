import { Headphones, ShieldAlert, WalletCards } from 'lucide-react';

const supportLevels = [
  { label: 'Level 1', title: 'General support', icon: Headphones, description: 'For everyday questions about using Vettri HRMS.' },
  { label: 'Level 2', title: 'Account and billing', icon: WalletCards, description: 'For workspace, account, and billing-related assistance.' },
  { label: 'Level 3', title: 'Escalation', icon: ShieldAlert, description: 'For issues that need specialist review or priority handling.' },
];

export default function SupportInfo() {
  return (
    <div className="hz-page-shell hz-support-page">
      <header className="hz-page-header">
        <p className="hz-page-header__eyebrow">Support information</p>
        <h1 className="hz-page-header__title">How support is organized</h1>
        <p className="hz-page-header__description">Use the appropriate support level for your request. Contact details configured for your organization will appear here.</p>
      </header>
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
    </div>
  );
}
