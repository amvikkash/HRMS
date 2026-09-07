import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Shared home for two small pieces of navigation UX state: which nav items
 * the user has starred as favorites, and which screens they've visited
 * recently. Both the Sidebar (favorites list, star toggles) and the Topbar
 * (search dropdown's "Recent" section) read and write this, so it lives in
 * one context rather than duplicated per-component state that would drift
 * out of sync as soon as the user navigated.
 *
 * Only path strings are persisted (never the full nav item) - nav items
 * carry a React icon component, which JSON.stringify silently drops, and
 * a rehydrated favorite missing its icon would crash on render. Consumers
 * rejoin stored paths against NAV_INDEX to get the full item back.
 *
 * Persisted to localStorage - this is UI convenience state, not anything
 * security- or business-sensitive, so there's no need to round-trip it
 * through the backend.
 */
const NavMemoryContext = createContext(null);

const FAVORITES_KEY = 'hz.nav.favorites';
const RECENTS_KEY = 'hz.nav.recents';
const RECENTS_LIMIT = 6;

function readPaths(key) {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function writePaths(key, paths) {
  try {
    window.localStorage.setItem(key, JSON.stringify(paths));
  } catch {
    // Private-browsing / quota-exceeded: degrading to session-only state
    // is an acceptable fallback for a convenience feature like this.
  }
}

export function NavMemoryProvider({ children }) {
  const [favoritePaths, setFavoritePaths] = useState(() => readPaths(FAVORITES_KEY));
  const [recentPaths, setRecentPaths] = useState(() => readPaths(RECENTS_KEY));

  const toggleFavorite = useCallback((item) => {
    setFavoritePaths((prev) => {
      const exists = prev.includes(item.to);
      const next = exists ? prev.filter((p) => p !== item.to) : [...prev, item.to];
      writePaths(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((to) => favoritePaths.includes(to), [favoritePaths]);

  const recordVisit = useCallback((item) => {
    setRecentPaths((prev) => {
      if (prev[0] === item.to) return prev; // already the most recent, skip a write
      const next = [item.to, ...prev.filter((p) => p !== item.to)].slice(0, RECENTS_LIMIT);
      writePaths(RECENTS_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ favoritePaths, toggleFavorite, isFavorite, recentPaths, recordVisit }),
    [favoritePaths, toggleFavorite, isFavorite, recentPaths, recordVisit]
  );

  return <NavMemoryContext.Provider value={value}>{children}</NavMemoryContext.Provider>;
}

export function useNavMemory() {
  const ctx = useContext(NavMemoryContext);
  if (!ctx) {
    throw new Error('useNavMemory must be used within a NavMemoryProvider');
  }
  return ctx;
}
