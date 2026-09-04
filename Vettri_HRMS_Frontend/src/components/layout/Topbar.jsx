import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Bell, ChevronDown, LogOut, UserCircle, Clock3, Menu, Building2, Command, ShieldAlert, Zap, Trash2, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { employeesApi } from '../../api/endpoints/employees';
import { adminApi } from '../../api/endpoints/admin';
import Avatar from '../ui/Avatar';
import Logo from '../brand/Logo';
import { NAV_INDEX, NAV_SECTIONS } from './navConfig';
import { useNavMemory } from './NavMemoryContext';
import { selfServiceApi } from '../../api/endpoints/selfService';
import { useTheme } from '../../contexts/ThemeContext';

// Search history management
const MAX_SEARCH_HISTORY = 10;

function getSearchHistory() {
  try {
    const stored = localStorage.getItem('vettri_search_history');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addToSearchHistory(query) {
  if (!query.trim()) return;
  const history = getSearchHistory();
  const filtered = history.filter((item) => item !== query);
  const updated = [query, ...filtered].slice(0, MAX_SEARCH_HISTORY);
  localStorage.setItem('vettri_search_history', JSON.stringify(updated));
}

function clearSearchHistory() {
  localStorage.removeItem('vettri_search_history');
}

export default function Topbar({ onOpenMobileNav }) {
  const { user, logout, hasPermission, hasRole, selectedCompanyId, setSelectedCompanyId } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [commandMode, setCommandMode] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchHistory, setSearchHistory] = useState([]);
  const searchBoxRef = useRef(null);
  const { recentPaths } = useNavMemory();
  const isEmployee = hasRole('EMPLOYEE');
  const { data: notifications = [] } = useQuery({ queryKey: ['notifications'], queryFn: selfServiceApi.notifications, enabled: isEmployee });
  const unreadNotifications = notifications.filter((notification) => !(notification.read_at || notification.readAt)).length;
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['admin-companies-selector'],
    queryFn: adminApi.companies,
    enabled: hasRole('SUPER_ADMIN'),
  });

  // Load search history
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  const canSearchPeople = hasPermission('EMPLOYEE_VIEW');
  const searchableNavItems = useMemo(
    () => NAV_INDEX.filter((item) => (!item.permission || hasPermission(item.permission)) && (!item.role || hasRole(item.role))),
    [hasPermission, hasRole]
  );

  /**
   * Fuzzy search scoring: higher score = better match
   * - Exact match = 1000
   * - Start of string match = 500
   * - Substring match = 100
   * - Character sequence match = 10
   */
  function fuzzyScore(text, query) {
    const t = text.toLowerCase();
    const q = query.toLowerCase();
    
    if (t === q) return 1000;
    if (t.startsWith(q)) return 500;
    if (t.includes(q)) return 100;
    
    let score = 0;
    let tIdx = 0;
    for (let i = 0; i < q.length; i++) {
      const idx = t.indexOf(q[i], tIdx);
      if (idx === -1) return 0;
      score += 1;
      tIdx = idx + 1;
    }
    return score;
  }

  const matchedPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    
    const scored = searchableNavItems
      .map((item) => {
        const labelScore = fuzzyScore(item.label, q) * 1.5;
        const sectionScore = fuzzyScore(item.section, q);
        const totalScore = Math.max(labelScore, sectionScore);
        return { item, score: totalScore };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((result) => result.item);
    
    return scored.map((result) => result.item);
  }, [query, searchableNavItems]);

  // Debounced employee search - only fires once the person pauses typing,
  // and only once there's enough to search on.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setDebouncedQuery('');
      return undefined;
    }
    const timer = setTimeout(() => setDebouncedQuery(q), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: employeeResults, isFetching: employeesLoading } = useQuery({
    queryKey: ['global-search-employees', debouncedQuery],
    queryFn: () => employeesApi.list(debouncedQuery),
    enabled: canSearchPeople && debouncedQuery.length >= 2,
  });

  const matchedEmployees = (employeeResults || []).slice(0, 5);

  const recentItems = useMemo(
    () =>
      recentPaths
        .map((p) => NAV_INDEX.find((item) => item.to === p))
      .filter((item) => item && (!item.permission || hasPermission(item.permission)) && (!item.role || hasRole(item.role))),
    [recentPaths, hasPermission, hasRole]
  );

  const flatResults = useMemo(() => {
    if (!query.trim()) {
      return recentItems.map((item) => ({ kind: 'page', item }));
    }
    return [
      ...matchedPages.map((item) => ({ kind: 'page', item })),
      ...matchedEmployees.map((emp) => ({ kind: 'employee', item: emp })),
    ];
  }, [query, matchedPages, matchedEmployees, recentItems]);

  useEffect(() => setActiveIndex(0), [query]);

  // Keyboard shortcut: Cmd+K / Ctrl+K to focus search, Cmd+Shift+K for command mode
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'k') {
        e.preventDefault();
        setCommandMode(true);
        setSearchOpen(true);
        searchBoxRef.current?.querySelector('input')?.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandMode(false);
        setSearchOpen(true);
        searchBoxRef.current?.querySelector('input')?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const goTo = (result) => {
    if (query.trim()) {
      addToSearchHistory(query);
      setSearchHistory(getSearchHistory());
    }
    setSearchOpen(false);
    setQuery('');
    setCommandMode(false);
    if (result.kind === 'page') navigate(result.item.to);
    else navigate(`/employees/${result.item.id}`);
  };

  async function openMyProfile() {
    setMenuOpen(false);
    if (user?.employeeId) {
      navigate(`/employees/${user.employeeId}`);
      return;
    }
    if (!user?.email) {
      navigate('/employees');
      return;
    }
    setProfileLoading(true);
    try {
      const matches = await employeesApi.list(user.email);
      const employee = matches.find((item) => item.email?.toLowerCase() === user.email.toLowerCase()) || matches[0];
      navigate(employee ? `/employees/${employee.id}` : '/employees');
    } catch {
      navigate('/employees');
    } finally {
      setProfileLoading(false);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatResults[activeIndex]) {
      e.preventDefault();
      goTo(flatResults[activeIndex]);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  return (
    <header
      className="hz-topbar d-flex align-items-center gap-2 px-3 px-md-4"
    >
      <div className="hz-brand-mark" aria-label="Vettri HRMS">
        <Logo tone="onDark" size={30} />
      </div>

      <button
        type="button"
        onClick={onOpenMobileNav}
        className="hz-icon-btn d-lg-none d-flex align-items-center justify-content-center border-0 flex-shrink-0"
        style={{ width: 38, height: 38 }}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <div className="position-relative hz-topbar-search" ref={searchBoxRef}>
        <div className="position-relative w-100">
          <Search size={16} className="position-absolute" style={{ left: 12, top: 10, color: 'var(--hz-text-muted)' }} />
          <input
            type="search"
            placeholder={commandMode ? 'Type a command or search...' : 'Search employees, pages, or modules...'}
            className="form-control ps-5 pe-12 hz-search-input"
            style={{ background: commandMode ? 'rgba(201,130,22,0.08)' : 'var(--hz-bg-canvas)', border: `1px solid ${commandMode ? 'var(--hz-accent-500)' : 'var(--hz-border)'}`, paddingRight: 48 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={searchOpen}
            aria-controls="hz-global-search-results"
            aria-autocomplete="list"
          />
          {!query && (
            <div className="position-absolute d-none d-md-flex align-items-center gap-1" style={{ right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <kbd style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(0,0,0,0.05)', borderRadius: 4, border: '1px solid rgba(0,0,0,0.1)', lineHeight: 1 }}>
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
              </kbd>
              <kbd style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(0,0,0,0.05)', borderRadius: 4, border: '1px solid rgba(0,0,0,0.1)', lineHeight: 1 }}>
                K
              </kbd>
            </div>
          )}
        </div>

        {searchOpen && (
          <div id="hz-global-search-results" className="position-absolute hz-surface hz-search-panel" style={{ top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 20, maxHeight: '70vh', overflowY: 'auto' }}>
            {!query.trim() && recentItems.length > 0 && (
              <div className="pb-1">
                <div className="px-3 pt-2 pb-1 d-flex align-items-center gap-2" style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Clock3 size={12} /> Recent Pages
                </div>
                {recentItems.map((item, i) => (
                  <SearchRow
                    key={item.to}
                    active={activeIndex === i}
                    icon={<item.icon size={15} />}
                    title={item.label}
                    subtitle={item.section}
                    onClick={() => goTo({ kind: 'page', item })}
                  />
                ))}
              </div>
            )}
            
            {!query.trim() && recentItems.length === 0 && searchHistory.length === 0 && (
              <div className="px-3 py-3" style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)' }}>
                Pages you visit will show up here
              </div>
            )}

            {!query.trim() && searchHistory.length > 0 && (
              <div className="pb-1">
                <div className="px-3 pt-2 pb-1 d-flex align-items-center justify-content-between" style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span><Zap size={12} style={{ marginRight: 4, display: 'inline' }} /> Search History</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearSearchHistory();
                      setSearchHistory([]);
                    }}
                    className="border-0 bg-transparent p-0"
                    style={{ cursor: 'pointer', color: 'var(--hz-text-muted)' }}
                    title="Clear history"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {searchHistory.slice(0, 5).map((historyQuery, i) => (
                  <button
                    key={`history-${i}`}
                    type="button"
                    onClick={() => setQuery(historyQuery)}
                    className="hz-search-row d-flex align-items-center gap-2 w-100 border-0 bg-transparent text-start px-3 py-2"
                    style={{ 
                      background: activeIndex === recentItems.length + i ? 'var(--hz-primary-50)' : 'transparent',
                      borderRadius: 8,
                      margin: '0 6px',
                      transition: 'all 150ms ease-out'
                    }}
                  >
                    <span className="d-flex align-items-center justify-content-center" style={{ width: 24, flexShrink: 0, color: 'var(--hz-text-secondary)' }}>
                      <Clock3 size={14} />
                    </span>
                    <span className="flex-grow-1 text-truncate">
                      <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500, color: 'var(--hz-text-primary)' }}>{historyQuery}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {query.trim() && matchedPages.length === 0 && matchedEmployees.length === 0 && !employeesLoading && (
              <div className="px-3 py-3 d-flex align-items-center gap-2" style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)' }}>
                <ShieldAlert size={14} /> No matches for "{query}"
              </div>
            )}

            {query.trim() && matchedPages.length > 0 && (
              <div className="pb-1">
                <div className="px-3 pt-2 pb-1" style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pages & Modules
                </div>
                {matchedPages.map((item, i) => {
                  const moduleInfo = NAV_SECTIONS.find((s) => s.label === item.section);
                  return (
                    <SearchRow
                      key={item.to}
                      active={activeIndex === i}
                      icon={<item.icon size={15} />}
                      title={item.label}
                      subtitle={moduleInfo?.description || item.section}
                      onClick={() => goTo({ kind: 'page', item })}
                    />
                  );
                })}
              </div>
            )}

            {query.trim() && (matchedEmployees.length > 0 || employeesLoading) && (
              <div className="pb-1">
                <div className="px-3 pt-2 pb-1" style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  People
                </div>
                {employeesLoading && <div className="px-3 py-2" style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)' }}>Searching…</div>}
                {!employeesLoading &&
                  matchedEmployees.map((emp, i) => (
                    <SearchRow
                      key={emp.id}
                      active={activeIndex === matchedPages.length + i}
                      icon={<Avatar name={emp.fullName} size="sm" />}
                      title={emp.fullName}
                      subtitle={emp.designationTitle || emp.departmentName || 'Employee'}
                      onClick={() => goTo({ kind: 'employee', item: emp })}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="d-flex align-items-center gap-2 ms-auto flex-shrink-0">
        <button type="button" className="hz-icon-btn d-flex align-items-center justify-content-center" style={{ width: 38, height: 38 }} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'} title={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {hasRole('SUPER_ADMIN') && (
          <label className="d-flex align-items-center gap-2 mb-0" title="Tenant company">
            <Building2 size={16} color="var(--hz-text-muted)" />
            <select
              className="form-select form-select-sm"
              value={selectedCompanyId || ''}
              onChange={(event) => setSelectedCompanyId(event.target.value || null)}
              disabled={companiesLoading}
              aria-label="Select tenant company"
              style={{ maxWidth: 190 }}
            >
              <option value="">Select company</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </label>
        )}
        {!hasRole('SUPER_ADMIN') && user?.companyName && (
          <div className="hz-current-workspace d-none d-lg-flex align-items-center gap-2 px-2">
            <Building2 size={15} />
            <span className="text-truncate">{user.companyName}</span>
          </div>
        )}
        <button
          type="button"
          className="hz-icon-btn position-relative d-flex align-items-center justify-content-center"
          style={{ width: 38, height: 38 }}
          aria-label="Notifications"
          aria-expanded={notificationsOpen}
          onClick={() => setNotificationsOpen((open) => !open)}
        >
          <Bell size={18} />
          {unreadNotifications > 0 && <span className="hz-notification-dot" aria-label={`${unreadNotifications} unread notification${unreadNotifications === 1 ? '' : 's'}`} />}
        </button>
        {notificationsOpen && (
          <div className="hz-topbar-notifications hz-surface" role="status">
            <strong>Notifications</strong>
            <span>{unreadNotifications ? `${unreadNotifications} unread notification${unreadNotifications === 1 ? '' : 's'}` : 'You&apos;re all caught up.'}</span>
          </div>
        )}

        <div className="position-relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="hz-icon-btn d-flex align-items-center gap-2 px-2"
            style={{ borderRadius: 10, width: 'auto', height: 44 }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            <Avatar name={user?.fullName} size="sm" />
            <div className="d-none d-md-flex flex-column align-items-start lh-1">
              <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, color: 'var(--hz-text-primary)' }}>
                {user?.fullName}
              </span>
              <span style={{ fontSize: 11, color: 'var(--hz-text-muted)' }}>{user?.roles?.[0]}</span>
            </div>
            <ChevronDown size={14} />
          </button>

          {menuOpen && (
            <>
              <div
                className="position-fixed top-0 start-0 w-100 h-100"
                style={{ zIndex: 15 }}
                onClick={() => setMenuOpen(false)}
              />
              <div
                role="menu"
                className="position-absolute end-0 mt-2 hz-surface"
                style={{ width: 220, zIndex: 20, padding: 6 }}
              >
                <div className="px-2 py-2 mb-1" style={{ borderBottom: '1px solid var(--hz-border)' }}>
                  <div style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600 }}>{user?.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{user?.email}</div>
                </div>
                <button
                  role="menuitem"
                  onClick={openMyProfile}
                  disabled={profileLoading}
                  className="btn btn-light border-0 w-100 d-flex align-items-center gap-2 text-start px-2 py-2"
                >
                  <UserCircle size={16} /> {profileLoading ? 'Opening profile…' : 'My Profile'}
                </button>
                <button
                  role="menuitem"
                  onClick={logout}
                  className="btn btn-light border-0 w-100 d-flex align-items-center gap-2 text-start px-2 py-2"
                  style={{ color: 'var(--hz-danger-600)' }}
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function SearchRow({ icon, title, subtitle, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hz-search-row d-flex align-items-center gap-2 w-100 border-0 bg-transparent text-start px-3 py-2"
      style={{ 
        background: active ? 'var(--hz-primary-50)' : 'transparent',
        borderRadius: 8,
        margin: '0 6px',
        transition: 'all 150ms ease-out'
      }}
    >
      <span className="d-flex align-items-center justify-content-center" style={{ width: 24, flexShrink: 0, color: 'var(--hz-text-secondary)' }}>
        {icon}
      </span>
      <span className="flex-grow-1 text-truncate">
        <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, color: 'var(--hz-text-primary)' }}>{title}</span>
        {subtitle && <span className="d-block" style={{ fontSize: 11, color: 'var(--hz-text-muted)' }}>{subtitle}</span>}
      </span>
    </button>
  );
}
