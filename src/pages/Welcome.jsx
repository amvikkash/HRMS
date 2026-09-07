import { ArrowRight, Compass, UserCircle, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Welcome() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(' ')[0] || 'there';

  return (
    <div className="hz-page-shell hz-welcome-page">
      <header className="hz-page-header">
        <p className="hz-page-header__eyebrow">Personal workspace</p>
        <h1 className="hz-page-header__title">Welcome, {firstName}</h1>
        <p className="hz-page-header__description">A focused place to find the tools and shortcuts you use most.</p>
      </header>
      <section className="hz-welcome-profile hz-surface">
        <div className="hz-welcome-profile__avatar"><UserCircle size={28} /></div>
        <div><span>Your Vettri profile</span><h2>{user?.fullName || 'Authenticated user'}</h2><p>{user?.roles?.[0] || 'Workspace member'}{user?.companyName ? ` · ${user.companyName}` : ''}</p></div>
      </section>
      <div className="hz-welcome-links">
        <Link to="/dashboard"><Compass size={20} /><span><strong>Explore your dashboard</strong><small>See workforce activity and organization highlights.</small></span><ArrowRight size={16} /></Link>
        <Link to="/employees"><Zap size={20} /><span><strong>Open your workforce</strong><small>Find employees, profiles, and people operations tools.</small></span><ArrowRight size={16} /></Link>
      </div>
    </div>
  );
}