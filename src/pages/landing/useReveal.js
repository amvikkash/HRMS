import { useEffect, useRef, useState } from 'react';

/**
 * Adds the `is-visible` class (see `.hz-reveal` in landing.css) the first
 * time an element scrolls into view. Falls back to "always visible" if
 * IntersectionObserver isn't available, so content is never hidden.
 */
export function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, className: `hz-reveal ${visible ? 'is-visible' : ''}` };
}
