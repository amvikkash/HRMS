import { Link } from 'react-router-dom';
import { Linkedin, Twitter } from 'lucide-react';
import Logo from '../../../components/brand/Logo';

export default function LandingFooter() {
  return (
    <footer className="hz-landing-footer">
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-12 col-lg-4">
            <Logo tone="onDark" />
            <p style={{ fontSize: 'var(--hz-text-sm)', marginTop: 14, maxWidth: 280 }}>
              One platform for your entire workforce - attendance, leave, recruitment, performance, and reporting.
            </p>
            <div className="d-flex gap-2 mt-3">
              <SocialIcon icon={Linkedin} />
              <SocialIcon icon={Twitter} />
            </div>
          </div>

          <div className="col-6 col-lg-2">
            <h6>Product</h6>
            <ul className="list-unstyled d-flex flex-column gap-2">
              <li>
                <Link to="/about">Modules</Link>
              </li>
              <li>
                <Link to="/login">Sign in</Link>
              </li>
            </ul>
          </div>

          <div className="col-6 col-lg-2">
            <h6>Company</h6>
            <ul className="list-unstyled d-flex flex-column gap-2">
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <Link to="/careers">Careers</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
            </ul>
          </div>

          <div className="col-6 col-lg-2">
            <h6>Contact</h6>
            <ul className="list-unstyled d-flex flex-column gap-2">
              <li>hello@vettrihrms.com</li>
              <li>Bengaluru, India</li>
            </ul>
          </div>
        </div>

        <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '32px 0 20px' }} />

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span style={{ fontSize: 'var(--hz-text-xs)' }}>&copy; {new Date().getFullYear()} Vettri HRMS. All rights reserved.</span>
          <span style={{ fontSize: 'var(--hz-text-xs)' }}>Made for organizations that have outgrown spreadsheets.</span>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ icon: Icon }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="d-flex align-items-center justify-content-center"
      style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.06)' }}
      aria-hidden="true"
      tabIndex={-1}
    >
      <Icon size={15} />
    </a>
  );
}
