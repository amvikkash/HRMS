/**
 * Vettri HRMS brand mark.
 * -----------------------------------------------------------------
 * A single source of truth for the logo so every surface (landing page,
 * login screen, app sidebar, careers pages) renders the exact same mark
 * instead of ad-hoc "H1" badges. The mark is a monogram: two pillars and
 * a crossbar read as an "H", and the small accent node standing on the
 * right pillar stands for the "One" - a single person represented within
 * the platform.
 *
 * Usage:
 *   <Logo />                                  // color mark + wordmark
 *   <Logo tone="onDark" />                    // for dark/gradient backgrounds
 *   <Logo variant="mark" size={32} />         // icon only, e.g. sidebar
 *   <Logo tagline="Careers" />                // wordmark + small suffix
 */
export default function Logo({
  variant = 'full', // 'full' | 'mark'
  tone = 'onLight', // 'onLight' | 'onDark'
  size = 36,
  tagline,
  className = '',
  wordmarkSize,
}) {
  const gradientId = `vettri-logo-grad-${tone}`;
  const isOnDark = tone === 'onDark';

  return (
    <span className={`d-inline-flex align-items-center gap-2 ${className}`} style={{ lineHeight: 1 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--hz-primary-500)" />
            <stop offset="100%" stopColor="var(--hz-primary-700)" />
          </linearGradient>
        </defs>

        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="11"
          fill={isOnDark ? 'rgba(255,255,255,0.14)' : `url(#${gradientId})`}
          stroke={isOnDark ? 'rgba(255,255,255,0.28)' : 'none'}
          strokeWidth={isOnDark ? 1 : 0}
        />

        <path d="M4 8L14 31L20 20L26 31L36 8" stroke={isOnDark ? '#ffffff' : `url(#${gradientId})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 29C13 37 27 34 35 9" stroke="#FF8A00" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="20" cy="9" r="3.2" fill="#FFB000" />
      </svg>

      {variant === 'full' && (
        <span className="d-inline-flex align-items-baseline gap-2">
          <span
            style={{
              fontFamily: 'var(--hz-font-display, var(--hz-font-sans))',
              fontWeight: 700,
              fontSize: wordmarkSize || 'var(--hz-text-lg)',
              letterSpacing: '-0.01em',
              color: isOnDark ? '#ffffff' : 'var(--hz-text-primary)',
            }}
          >
            <span style={{ color: isOnDark ? '#ffffff' : 'var(--hz-primary-800)' }}>Vettri</span>{' '}
            <span style={{ color: isOnDark ? '#FFB000' : 'var(--hz-accent-600)' }}>HRMS</span>
          </span>
          {tagline && (
            <span
              style={{
                fontSize: 'var(--hz-text-sm)',
                fontWeight: 500,
                color: isOnDark ? 'rgba(255,255,255,0.7)' : 'var(--hz-text-muted)',
                paddingLeft: 8,
                borderLeft: `1px solid ${isOnDark ? 'rgba(255,255,255,0.25)' : 'var(--hz-border)'}`,
              }}
            >
              {tagline}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
