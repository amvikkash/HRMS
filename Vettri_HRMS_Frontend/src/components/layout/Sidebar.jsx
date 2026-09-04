import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings2, X } from 'lucide-react';
import Logo from '../brand/Logo';
import { NAV_SECTIONS, findNavItemByPath, visibleNavSections } from './navConfig';
import { useNavMemory } from './NavMemoryContext';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar({ mobileOpen = false, onCloseMobile }) {
  const location = useLocation();
  const sidebarRef = useRef(null);
  const { hasPermission, hasRole } = useAuth();
  const { recordVisit } = useNavMemory();
  const sections = useMemo(() => visibleNavSections(hasPermission, hasRole), [hasPermission, hasRole]);

  const activeSectionId = sections.find((section) => section.items.some((item) => isNavItemActive(item, location)))?.id;
  const [selectedSectionId, setSelectedSectionId] = useState(activeSectionId || sections[0]?.id);
  const selectedSection = sections.find((section) => section.id === selectedSectionId) || sections[0];
  const administration = sections.find((section) => section.id === 'administration');
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutTop, setFlyoutTop] = useState(12);

  // Restore the user's group preferences, then always open the active group
  // so navigation never hides the page they are currently viewing.
  useEffect(() => {
    if (activeSectionId) setSelectedSectionId(activeSectionId);
    setFlyoutOpen(false);
    const matched = findNavItemByPath(location.pathname);
    if (matched) recordVisit(matched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setFlyoutOpen(false);
        if (mobileOpen) onCloseMobile?.();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen, onCloseMobile]);

  useEffect(() => {
    if (!flyoutOpen) return undefined;
    function handlePointerDown(event) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) setFlyoutOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [flyoutOpen]);

  function toggleProduct(id, event) {
    setSelectedSectionId(id);
    if (event?.currentTarget && window.matchMedia('(min-width: 992px)').matches) {
      setFlyoutTop(Math.max(12, event.currentTarget.getBoundingClientRect().top));
    }
    setFlyoutOpen((isOpen) => selectedSectionId === id ? !isOpen : true);
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="hz-sidebar-backdrop d-lg-none"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        ref={sidebarRef}
        className={`d-flex flex-column hz-sidebar hz-icon-rail ${mobileOpen ? 'hz-sidebar--mobile-open' : ''}`}
        aria-label="Main navigation"
      >
        <div
          className="hz-sidebar__header d-flex align-items-center justify-content-between gap-2"
        >
          <div className="hz-rail-brand">
            <Logo variant="mark" tone="onDark" size={32} />
            <span>Vettri HRMS</span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="hz-icon-btn d-lg-none d-flex align-items-center justify-content-center border-0"
            style={{ width: 32, height: 32 }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="hz-icon-rail__nav flex-grow-1 overflow-auto" aria-label="Product areas">
          {sections.map((section) => {
            const Icon = section.id === 'administration' ? Settings2 : section.items[0]?.icon || LayoutDashboard;
            const isActive = activeSectionId === section.id;
            const isSelected = selectedSectionId === section.id && flyoutOpen;
            return (
              <button
                type="button"
                key={section.id}
                className={`hz-rail-item ${isActive ? 'hz-rail-item--active' : ''} ${isSelected ? 'hz-rail-item--selected' : ''}`}
                onClick={(event) => toggleProduct(section.id, event)}
                aria-label={section.label}
                aria-expanded={isSelected}
                title={section.label}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{section.label}</span>
                {section.badge && (
                  <span
                    className={`hz-rail-badge ${section.badge.type === 'alert' ? 'hz-rail-badge--alert' : ''}`}
                  >
                    {section.badge.value > 99 ? '99+' : section.badge.value}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {administration && <button
          type="button"
          className={`hz-rail-settings ${activeSectionId === 'administration' ? 'hz-rail-item--active' : ''} ${selectedSectionId === 'administration' && flyoutOpen ? 'hz-rail-item--selected' : ''}`}
          onClick={(event) => toggleProduct('administration', event)}
          aria-label="Settings"
          aria-expanded={selectedSectionId === 'administration' && flyoutOpen}
          title="Settings"
        >
          <Settings2 size={19} strokeWidth={1.8} />
        </button>}

        {flyoutOpen && selectedSection && (
          <div className="hz-nav-flyout" style={{ '--hz-flyout-top': `${flyoutTop}px` }} role="navigation" aria-label={`${selectedSection.label} navigation`}>
            <div className="hz-nav-flyout__header">
              <div>
                <p>{selectedSection.label}</p>
                <span>{sectionDescription(selectedSection.id)}</span>
              </div>
            </div>
            <div className="hz-nav-flyout__items">
              {selectedSection.items.map((item) => (
                <NavItem key={item.to} item={item} />
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function NavItem({ item }) {
  const location = useLocation();
  const isActive = isNavItemActive(item, location);

  return (
    <div className="hz-sidebar-item position-relative mx-2 mb-1">
      <NavLink
        to={item.to}
        end={item.end}
        className={`hz-sidebar-link hz-flyout-link d-flex align-items-center gap-3 px-3 py-2 text-decoration-none rounded-3 ${
          isActive ? 'hz-nav-active' : 'hz-nav-inactive'
        }`}
      >
        <item.icon size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
        <span className="text-truncate">{item.label}</span>
      </NavLink>
    </div>
  );
}

function isNavItemActive(item, location) {
  const [itemPath, itemQuery = ''] = item.to.split('?');
  const pathMatches = item.end
    ? location.pathname === itemPath
    : location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);

  if (!pathMatches) return false;
  return new URLSearchParams(itemQuery).toString() === new URLSearchParams(location.search).toString();
}

function sectionDescription(id) {
  const section = NAV_SECTIONS.find((s) => s.id === id);
  return section?.description || 'Vettri HRMS';
}
