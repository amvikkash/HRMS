import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings2, Star, X } from 'lucide-react';
import Logo from '../brand/Logo';
import { NAV_SECTIONS, NAV_INDEX, findNavItemByPath, visibleNavSections } from './navConfig';
import { useNavMemory } from './NavMemoryContext';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar({ mobileOpen = false, onCloseMobile }) {
  const location = useLocation();
  const sidebarRef = useRef(null);
  const { hasPermission, hasRole } = useAuth();
  const { favoritePaths, toggleFavorite, isFavorite, recordVisit } = useNavMemory();
  const sections = useMemo(() => visibleNavSections(hasPermission, hasRole), [hasPermission, hasRole]);
  // Favorites can include an item from a section the user no longer has
  // permission for (e.g. a role change) - filter those out defensively
  // rather than rendering a link that 403s.
  const visiblePaths = new Set(sections.flatMap((s) => s.items.map((i) => i.to)));
  const favorites = favoritePaths
    .map((p) => NAV_INDEX.find((item) => item.to === p))
    .filter((item) => item && visiblePaths.has(item.to));

  const activeSectionId = NAV_SECTIONS.find((section) =>
    section.items.some((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
  )?.id;
  const productSections = sections.filter((section) => section.id !== 'administration');
  const administration = sections.find((section) => section.id === 'administration');
  const railSections = productSections;
  const [selectedSectionId, setSelectedSectionId] = useState(activeSectionId || 'root');
  const selectedSection = railSections.find((section) => section.id === selectedSectionId)
    || administration
    || railSections[0];
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [nestedSectionId, setNestedSectionId] = useState(null);

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

  const toggleProduct = (id) => {
    setSelectedSectionId(id);
    setNestedSectionId(null);
    setFlyoutOpen((isOpen) => selectedSectionId === id ? !isOpen : true);
  };

  const toggleNested = (sectionId) => {
    setNestedSectionId((current) => current === sectionId ? null : sectionId);
  };

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
        onMouseLeave={() => {
          if (window.matchMedia('(min-width: 992px)').matches) setFlyoutOpen(false);
        }}
        style={{
          width: 'var(--hz-rail-width, 76px)',
          background: 'var(--hz-bg-sidebar)',
          borderRight: '1px solid var(--hz-border)',
          flexShrink: 0,
        }}
      >
        <div
          className="d-flex align-items-center justify-content-between gap-2 px-3"
          style={{ height: 'var(--hz-topbar-height)', borderBottom: '1px solid var(--hz-border)' }}
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
          {railSections.map((section) => {
            const Icon = section.id === 'administration' ? Settings2 : section.items[0]?.icon || LayoutDashboard;
            const isActive = activeSectionId === section.id;
            const isSelected = selectedSectionId === section.id && flyoutOpen;
            return (
              <button
                type="button"
                key={section.id}
                className={`hz-rail-item ${isActive ? 'hz-rail-item--active' : ''} ${isSelected ? 'hz-rail-item--selected' : ''}`}
                onClick={() => toggleProduct(section.id)}
                aria-label={section.label}
                aria-expanded={isSelected}
                title={section.label}
                onMouseEnter={() => {
                  if (window.matchMedia('(min-width: 992px)').matches) {
                    setSelectedSectionId(section.id);
                    setFlyoutOpen(true);
                  }
                }}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{section.label}</span>
                {section.badge && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      background: section.badge.type === 'alert' ? 'var(--hz-danger-500)' : 'var(--hz-primary-600)',
                      color: 'white',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 4px',
                      borderRadius: 3,
                      minWidth: 16,
                      textAlign: 'center',
                    }}
                  >
                    {section.badge.value > 99 ? '99+' : section.badge.value}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          className={`hz-rail-settings ${activeSectionId === 'administration' ? 'hz-rail-item--active' : ''} ${selectedSectionId === 'administration' && flyoutOpen ? 'hz-rail-item--selected' : ''}`}
          onClick={() => toggleProduct('administration')}
          aria-label="Settings"
          aria-expanded={selectedSectionId === 'administration' && flyoutOpen}
          title="Settings"
        >
          <Settings2 size={19} strokeWidth={1.8} />
        </button>

        {flyoutOpen && selectedSection && (
          <div className="hz-nav-flyout" role="dialog" aria-label={`${selectedSection.label} navigation`}>
            <div className="hz-nav-flyout__header">
              <div>
                <p>{selectedSection.label}</p>
                <span>{sectionDescription(selectedSection.id)}</span>
              </div>
              <button type="button" className="hz-icon-btn" onClick={() => setFlyoutOpen(false)} aria-label="Close navigation">
                <X size={17} />
              </button>
            </div>
            {favorites.length > 0 && selectedSection.id === 'root' && (
              <div className="hz-nav-flyout__favorites">
                <span>Favorites</span>
                {favorites.slice(0, 3).map((item) => <NavItem key={item.to} item={item} isFavorite={isFavorite(item.to)} onToggleFavorite={toggleFavorite} />)}
              </div>
            )}
            <div className="hz-nav-flyout__items">
              {selectedSection.items.map((item) => (
                <NavItem key={item.to} item={item} isFavorite={isFavorite(item.to)} onToggleFavorite={toggleFavorite} />
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function NavItem({ item, isFavorite, onToggleFavorite }) {
  return (
    <div className="hz-sidebar-item position-relative mx-2 mb-1">
      <NavLink
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          `hz-sidebar-link hz-flyout-link d-flex align-items-center gap-3 px-3 py-2 text-decoration-none rounded-3 ${
            isActive ? 'hz-nav-active' : 'hz-nav-inactive'
          }`
        }
      >
        <item.icon size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
        <span className="text-truncate">{item.label}</span>
      </NavLink>
      {(
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite({ to: item.to, icon: item.icon, label: item.label, end: item.end });
          }}
          className="hz-sidebar-fav-btn position-absolute d-flex align-items-center justify-content-center border-0 bg-transparent"
          style={{ right: 6, top: '50%', transform: 'translateY(-50%)' }}
          aria-label={isFavorite ? `Remove ${item.label} from favorites` : `Add ${item.label} to favorites`}
          aria-pressed={isFavorite}
        >
          <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      )}
    </div>
  );
}

function sectionDescription(id) {
  const section = NAV_SECTIONS.find((s) => s.id === id);
  return section?.description || 'Vettri HRMS';
}
