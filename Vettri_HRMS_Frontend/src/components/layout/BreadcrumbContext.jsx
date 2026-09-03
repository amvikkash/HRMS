import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Static routes give us a perfectly good breadcrumb label for free (see
 * ROUTE_LABELS in Breadcrumbs.jsx). Detail pages under a dynamic segment
 * (e.g. /employees/:id) can't - "12" isn't a label anyone wants to read.
 * This lets a page call useBreadcrumbLabel(employee?.fullName) once its
 * data loads, to override just the last crumb with something real.
 */
const BreadcrumbContext = createContext(null);

export function BreadcrumbProvider({ children }) {
  const [label, setLabel] = useState(null);
  return <BreadcrumbContext.Provider value={{ label, setLabel }}>{children}</BreadcrumbContext.Provider>;
}

/** Call from a detail page: useBreadcrumbLabel(employee?.fullName) */
export function useBreadcrumbLabel(label) {
  const ctx = useContext(BreadcrumbContext);
  useEffect(() => {
    if (!ctx) return undefined;
    ctx.setLabel(label || null);
    return () => ctx.setLabel(null);
  }, [ctx, label]);
}

export function useBreadcrumbOverride() {
  const ctx = useContext(BreadcrumbContext);
  return ctx?.label ?? null;
}
