import { useState } from 'react';
import { Mail, MapPin, PhoneCall, CheckCircle2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useReveal } from '../useReveal';

/**
 * UI only for now, matching the "landing page first" scope of this phase -
 * there is no `/api/contact` endpoint yet. Swap `handleSubmit` for a real
 * mutation once a contact/demo-request backend endpoint exists; the form
 * state and validation below won't need to change.
 */
export default function ContactSection() {
  const reveal = useReveal();
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="hz-section-sm" style={{ background: 'var(--hz-bg-canvas)' }}>
      <div className="container">
        <div ref={reveal.ref} className={reveal.className}>
          <div className="hz-contact-panel p-4 p-lg-5">
            <div className="row g-5">
              <div className="col-12 col-lg-5">
                <span className="hz-eyebrow">Contact</span>
                <h2 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, marginBottom: 12 }}>Let's talk</h2>
                <p className="text-secondary-hz" style={{ fontSize: 'var(--hz-text-base)', marginBottom: 28 }}>
                  Want a walkthrough of Vettri HRMS for your organization? Send us a note and our team will get back to
                  you.
                </p>

                <div className="d-flex flex-column gap-3">
                  <ContactRow icon={Mail} label="hello@vettrihrms.com" />
                  <ContactRow icon={PhoneCall} label="+91 80 4000 1234" />
                  <ContactRow icon={MapPin} label="Bengaluru, India" />
                </div>
              </div>

              <div className="col-12 col-lg-7">
                {submitted ? (
                  <div className="d-flex flex-column align-items-center justify-content-center text-center h-100 py-5">
                    <CheckCircle2 size={40} color="var(--hz-success-500)" style={{ marginBottom: 14 }} />
                    <h3 style={{ fontSize: 'var(--hz-text-lg)', fontWeight: 600, marginBottom: 6 }}>Message sent</h3>
                    <p className="text-secondary-hz mb-0" style={{ maxWidth: 320 }}>
                      Thanks, {form.name.split(' ')[0] || 'there'} - we'll be in touch shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      <div className="col-12 col-sm-6">
                        <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>
                          Full name
                        </label>
                        <input className="form-control" value={form.name} onChange={update('name')} required />
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>
                          Work email
                        </label>
                        <input type="email" className="form-control" value={form.email} onChange={update('email')} required />
                      </div>
                      <div className="col-12">
                        <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>
                          Company
                        </label>
                        <input className="form-control" value={form.company} onChange={update('company')} />
                      </div>
                      <div className="col-12">
                        <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>
                          What are you hoping to solve?
                        </label>
                        <textarea className="form-control" rows={4} value={form.message} onChange={update('message')} required />
                      </div>
                      <div className="col-12">
                        <Button type="submit" variant="primary">
                          Send message
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactRow({ icon: Icon, label }) {
  return (
    <div className="d-flex align-items-center gap-3">
      <div
        className="d-flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--hz-primary-50)' }}
      >
        <Icon size={16} color="var(--hz-primary-600)" />
      </div>
      <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>{label}</span>
    </div>
  );
}
