import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import PageLoader from '../../components/ui/PageLoader';
import LandingHeader from './sections/LandingHeader';
import HeroSection from './sections/HeroSection';
import AboutSection from './sections/AboutSection';
import CareersSection from './sections/CareersSection';
import ContactSection from './sections/ContactSection';
import LandingFooter from './sections/LandingFooter';
import './landing.css';

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  // Signed-in visitors land in the app, not on the marketing page - "/"
  // stays reserved for the public site, same as any enterprise SaaS product.
  if (isLoading) {
    return <PageLoader />;
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="hz-landing">
      <LandingHeader />
      <HeroSection />
      <AboutSection />
      <CareersSection />
      <ContactSection />
      <LandingFooter />
    </div>
  );
}
