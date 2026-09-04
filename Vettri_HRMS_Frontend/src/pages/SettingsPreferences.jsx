import { useEffect, useState } from 'react';
import PageShell from '../components/ui/PageShell';
import SectionHeader from '../components/ui/SectionHeader';
import Card from '../components/ui/Card';
import { useTheme } from '../contexts/ThemeContext';

const PREFERENCES_KEY = 'vettri.regional-preferences';
const DEFAULTS = { language: 'en-IN', timezone: 'Asia/Kolkata', currency: 'INR' };

export default function SettingsPreferences() {
  const { theme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState(() => {
    try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(PREFERENCES_KEY)) || {}) }; } catch { return DEFAULTS; }
  });

  useEffect(() => { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); }, [preferences]);
  const update = (key, value) => setPreferences((current) => ({ ...current, [key]: value }));

  return (
    <PageShell className="d-flex flex-column gap-4">
      <SectionHeader eyebrow="Preferences" title="Workspace preferences" description="Personalize how Vettri HRMS looks and presents regional information." />
      <Card title="Appearance" subtitle="Your preference is saved on this device.">
        <label className="hz-preference-row"><span><strong>Theme</strong><small>Choose the most comfortable workspace appearance.</small></span><select value={theme} onChange={(event) => setTheme(event.target.value)} aria-label="Theme"><option value="light">Light</option><option value="dark">Dark</option></select></label>
      </Card>
      <Card title="Regional format" subtitle="These defaults guide localized date and currency views.">
        <label className="hz-preference-row"><span><strong>Language and region</strong><small>Translation resources are currently available for English (India).</small></span><select value={preferences.language} onChange={(event) => update('language', event.target.value)} aria-label="Language and region"><option value="en-IN">English (India)</option></select></label>
        <label className="hz-preference-row"><span><strong>Time zone</strong><small>Saved as your preferred display time zone.</small></span><select value={preferences.timezone} onChange={(event) => update('timezone', event.target.value)} aria-label="Time zone"><option value="Asia/Kolkata">Asia/Kolkata</option><option value="UTC">UTC</option><option value="Asia/Dubai">Asia/Dubai</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New_York</option></select></label>
        <label className="hz-preference-row"><span><strong>Currency</strong><small>Saved as your preferred financial display currency.</small></span><select value={preferences.currency} onChange={(event) => update('currency', event.target.value)} aria-label="Currency"><option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="AED">AED</option><option value="GBP">GBP</option></select></label>
      </Card>
    </PageShell>
  );
}
