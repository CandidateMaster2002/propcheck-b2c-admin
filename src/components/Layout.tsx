'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Menu definition — icon classes match old Angular B2C app exactly
// ---------------------------------------------------------------------------
const menuItems = [
  { id: 1,  name: 'Dashboard',          path: '/dashboard',       icon: 'ri-dashboard-line' },
  { id: 2,  name: 'Inspector/Validator',path: '/inspectors',      icon: 'mdi mdi-account-group-outline' },
  { id: 3,  name: 'Inspections',        path: '/inspections',     icon: 'ri-search-line' },
  { id: 4,  name: 'Data Management',    path: '/data-management', icon: 'ri-database-2-line' },
  { id: 5,  name: 'Agent Dashboard',    path: '/agent-dashboard', icon: 'ri-dashboard-line' },
  { id: 6,  name: 'Agents List',        path: '/agents',          icon: 'mdi mdi-account-group-outline' },
  { id: 7,  name: 'Book Inspection',    path: '/book-inspection', icon: 'mdi mdi-cart-plus' },
  { id: 8,  name: 'Price Setting',      path: '/pricing',         icon: 'mdi mdi-currency-usd' },
  { id: 9,  name: 'Scoring Metrics',    path: '/scoring',         icon: 'mdi mdi-chart-sankey-variant' },
  { id: 10, name: 'Administrators',     path: '/administrators',  icon: 'ri-shield-user-line' },
  { id: 11, name: 'Users',              path: '/users',           icon: 'ri-user-line' },
  { id: 12, name: 'Water Quality',      path: '/water-quality',   icon: 'ri-drop-line' },
  { id: 13, name: 'Calendar',           path: '/calendar',        icon: 'ri-calendar-line' },
  { id: 14, name: 'Payments',           path: '/payments',        icon: 'ri-bank-card-line' },
  { id: 15, name: 'Reports',            path: '/reports',         icon: 'ri-file-list-3-line' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isActivePath(pathname: string, itemPath: string): boolean {
  return pathname === itemPath || pathname.startsWith(itemPath + '/');
}

function getPageTitle(pathname: string): string {
  const match = menuItems.find((item) => isActivePath(pathname, item.path));
  return match?.name ?? 'Dashboard';
}

// ---------------------------------------------------------------------------
// Constants  (matches old B2C styles.scss overrides on data-sidebar=dark)
// ---------------------------------------------------------------------------
const SIDEBAR_BG = '#0054A8';
const SIDEBAR_ACTIVE_TEXT = '#ffffff';
const SIDEBAR_INACTIVE_TEXT = '#FDB93F';
const SIDEBAR_HOVER_BG = 'rgba(255,255,255,0.12)';
const SIDEBAR_ACTIVE_BG = 'rgba(255,255,255,0.15)';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Layout({ children, user }: { children: React.ReactNode; user: any }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { setPwdError('New passwords do not match'); return; }
    if (pwdForm.newPassword.length < 6) { setPwdError('New password must be at least 6 characters'); return; }
    setPwdLoading(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword }),
      });
      const data = await res.json();
      if (data.status) {
        setPwdSuccess('Password changed successfully!');
        setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => { setShowChangePwd(false); setPwdSuccess(''); }, 1500);
      } else {
        setPwdError(data.message || 'Failed to change password');
      }
    } catch {
      setPwdError('Network error. Please try again.');
    } finally {
      setPwdLoading(false);
    }
  };

  const sidebarWidth = sidebarOpen ? '220px' : '56px';
  const pageTitle = getPageTitle(pathname);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f0f4f8' }}>

      {/* ------------------------------------------------------------------ */}
      {/* Sidebar                                                              */}
      {/* ------------------------------------------------------------------ */}
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100%',
          width: sidebarWidth,
          backgroundColor: SIDEBAR_BG,
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          transition: 'width 0.25s ease',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
        }}
      >
        {/* Logo row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarOpen ? 'space-between' : 'center',
            padding: sidebarOpen ? '1rem 1rem 1rem 1.25rem' : '1rem 0',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            minHeight: '64px',
          }}
        >
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/new-logo-dark.png"
                alt="Prop Right"
                style={{ height: '40px', width: 'auto', display: 'block' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.8)',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        {/* MENU label */}
        {sidebarOpen && (
          <div style={{ padding: '1rem 1.25rem 0.5rem', fontSize: '0.6875rem', fontWeight: 600, color: '#FDB93F', letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.85 }}>
            MENU
          </div>
        )}

        {/* Nav items — filtered by role (matches old B2C Angular sidebar) */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0.25rem 0' }}>
          {menuItems
            .filter((item) => {
              const isSuperAdmin = user?.role === 'SuperAdmin';
              // Admin sees only the first 9 tabs (ids 1–9)
              if (!isSuperAdmin) return item.id >= 1 && item.id <= 9;
              // SuperAdmin sees all tabs
              return true;
            })
            .map((item) => {
            const active = isActivePath(pathname, item.path);
            return (
              <Link
                key={item.id}
                href={item.path}
                title={!sidebarOpen ? item.name : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: sidebarOpen ? '0.625rem 1.25rem' : '0.625rem 0',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  color: active ? SIDEBAR_ACTIVE_TEXT : SIDEBAR_INACTIVE_TEXT,
                  backgroundColor: active ? SIDEBAR_ACTIVE_BG : 'transparent',
                  fontWeight: active ? 600 : 400,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s, color 0.15s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = SIDEBAR_HOVER_BG;
                    (e.currentTarget as HTMLAnchorElement).style.color = SIDEBAR_ACTIVE_TEXT;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLAnchorElement).style.color = SIDEBAR_INACTIVE_TEXT;
                  }
                }}
              >
                <i className={item.icon} style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1 }} />
                {sidebarOpen && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Main Content                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 0.25s ease',
          marginLeft: sidebarWidth,
          minWidth: 0,
        }}
      >
        {/* Top Header */}
        <header
          style={{
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            minHeight: '64px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.5rem',
            justifyContent: 'space-between',
          }}
        >
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555', fontSize: '0.9375rem' }}>
            <span style={{ color: '#888', fontWeight: 400 }}>Prop Right</span>
            <span style={{ color: '#bbb' }}>›</span>
            <span style={{ color: '#343a40', fontWeight: 600 }}>{pageTitle}</span>
          </div>

          {/* User dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.375rem 0.75rem',
                borderRadius: '6px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {/* Avatar */}
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: '#e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#555',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#333' }}>
                {user?.name || user?.role || 'Admin'}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#777">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  minWidth: '200px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  border: '1px solid #e8e8e8',
                  zIndex: 200,
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f0f0f0', backgroundColor: '#f8f9fa' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#333' }}>{user?.name || 'Admin'}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#888', marginTop: '2px' }}>{user?.email}</p>
                </div>

                <button
                  onClick={() => { setDropdownOpen(false); setShowChangePwd(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.625rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#333', textAlign: 'left' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Change Password
                </button>

                <button
                  onClick={() => { setDropdownOpen(false); handleLogout(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.625rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#dc3545', textAlign: 'left', borderTop: '1px solid #f0f0f0' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fff5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {children}
        </main>

        {/* Footer */}
        <footer
          style={{
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e8e8e8',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8125rem',
            color: '#888',
          }}
        >
          <span>© 2021 Prop Right.</span>
          <span>
            Crafted with{' '}
            <span style={{ color: '#e53e3e' }}>♥</span>
            {' '}by <a href="https://www.versatilecommerce.com/" style={{ color: '#556ee6', textDecoration: 'none' }} target="_blank" rel="noreferrer">Versatile Commerce</a>
          </span>
        </footer>
      </div>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Change Password Modal */}
      {showChangePwd && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowChangePwd(false); setPwdError(''); setPwdSuccess(''); } }}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#333' }}>Change Password</h3>
              <button onClick={() => { setShowChangePwd(false); setPwdError(''); setPwdSuccess(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#888', lineHeight: 1 }}>&times;</button>
            </div>
            <form onSubmit={handleChangePassword} style={{ padding: '1.25rem' }}>
              {pwdError && <div style={{ backgroundColor: '#fff5f5', border: '1px solid #ffcccc', color: '#dc3545', padding: '0.625rem 0.875rem', borderRadius: '4px', fontSize: '0.875rem', marginBottom: '1rem' }}>{pwdError}</div>}
              {pwdSuccess && <div style={{ backgroundColor: '#f0fff4', border: '1px solid #b2f5c8', color: '#28a745', padding: '0.625rem 0.875rem', borderRadius: '4px', fontSize: '0.875rem', marginBottom: '1rem' }}>{pwdSuccess}</div>}
              {[
                { label: 'Current Password', key: 'currentPassword' },
                { label: 'New Password', key: 'newPassword' },
                { label: 'Confirm New Password', key: 'confirmPassword' },
              ].map(({ label, key }) => (
                <div key={key} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#555', marginBottom: '0.375rem' }}>{label}</label>
                  <input
                    type="password"
                    required
                    value={pwdForm[key as keyof typeof pwdForm]}
                    onChange={(e) => setPwdForm({ ...pwdForm, [key]: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={(e) => (e.target.style.borderColor = '#0054A8')}
                    onBlur={(e) => (e.target.style.borderColor = '#ddd')}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => { setShowChangePwd(false); setPwdError(''); setPwdSuccess(''); }} style={{ padding: '0.5rem 1.25rem', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', color: '#555' }}>Cancel</button>
                <button type="submit" disabled={pwdLoading} style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '4px', background: '#0054A8', color: '#fff', cursor: pwdLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: pwdLoading ? 0.65 : 1 }}>
                  {pwdLoading ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
