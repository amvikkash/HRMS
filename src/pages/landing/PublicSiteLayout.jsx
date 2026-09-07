import { Outlet } from 'react-router-dom';
import LandingHeader from './sections/LandingHeader';
import LandingFooter from './sections/LandingFooter';
import './landing.css';

/**
 * Shared chrome for every public marketing route (Home, About, Careers,
 * Contact). Each route renders its own page component via <Outlet /> and
 * gets the same header + footer around it - a real multi-page site, not a
 * single scrolling page with anchor links.
 */
export default function PublicSiteLayout() {
  return (
    <div className="hz-landing">
      <LandingHeader />
      <Outlet />
      <LandingFooter />
    </div>
  );
}
