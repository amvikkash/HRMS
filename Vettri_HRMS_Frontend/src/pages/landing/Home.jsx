import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import PageLoader from '../../components/ui/PageLoader';
import HeroSection from './sections/HeroSection';
import AboutSection from './sections/AboutSection';
import ContactSection from './sections/ContactSection';
import TrustSection from './sections/TrustSection';

export default function Home() {
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
    <>
      <HeroSection />
      <AboutSection />
      <TrustSection />
      <ContactSection />
    </>
  );
}
