'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.status) {
        localStorage.setItem('user', JSON.stringify(data.data));
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f8f9fa' }}>
      {/* Home button top-right */}
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 100 }}>
        <a href="/" style={{ color: 'white', lineHeight: 1, display: 'block' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </a>
      </div>

      {/* ── Left panel ── */}
      <div
        style={{
          width: '33.333%',
          minWidth: '320px',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#fff',
          padding: '2rem',
        }}
      >
        <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-dark.png"
              alt="Prop Right"
              style={{ height: '100px', width: 'auto', display: 'inline-block' }}
            />
          </div>

          {/* Heading */}
          <h4
            style={{
              textAlign: 'center',
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#495057',
              margin: '0 0 1.5rem',
            }}
          >
            Welcome to Login
          </h4>

          {/* Form */}
          <form onSubmit={handleLogin}>
            {/* Username field */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ position: 'relative' }}>
                <i
                  className="ri-user-2-line"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    left: '19px',
                    fontSize: '24px',
                    color: '#5664d2',
                    pointerEvents: 'none',
                  }}
                />
                <label
                  style={{
                    position: 'absolute',
                    top: '7px',
                    left: '60px',
                    fontSize: '0.7rem',
                    color: '#5664d2',
                    fontWeight: 500,
                    pointerEvents: 'none',
                    margin: 0,
                  }}
                >
                  Username
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter username"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    height: '60px',
                    paddingTop: '28px',
                    paddingBottom: '0',
                    paddingLeft: '60px',
                    paddingRight: '1rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    color: '#495057',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#fff',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#5664d2')}
                  onBlur={(e) => (e.target.style.borderColor = '#ced4da')}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ position: 'relative' }}>
                <i
                  className="ri-lock-2-line"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    left: '19px',
                    fontSize: '24px',
                    color: '#5664d2',
                    pointerEvents: 'none',
                  }}
                />
                <label
                  style={{
                    position: 'absolute',
                    top: '7px',
                    left: '60px',
                    fontSize: '0.7rem',
                    color: '#5664d2',
                    fontWeight: 500,
                    pointerEvents: 'none',
                    margin: 0,
                  }}
                >
                  Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    height: '60px',
                    paddingTop: '28px',
                    paddingBottom: '0',
                    paddingLeft: '60px',
                    paddingRight: '60px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    color: '#495057',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#fff',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#5664d2')}
                  onBlur={(e) => (e.target.style.borderColor = '#ced4da')}
                />
                {/* Eye toggle */}
                <i
                  onClick={() => setShowPassword(!showPassword)}
                  className={showPassword ? 'ri-eye-fill' : 'ri-eye-line'}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    right: '19px',
                    fontSize: '24px',
                    color: '#5664d2',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div style={{ color: '#dc3545', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {/* Log In button */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.5rem 2.5rem',
                  backgroundColor: '#556ee6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.65 : 1,
                }}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: 'center' }}>
              <a
                href="/forgot-password"
                style={{
                  color: '#6c757d',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <i className="mdi mdi-lock" style={{ fontSize: '14px' }} />
                Forgot your password?
              </a>
            </div>
          </form>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '2rem', color: '#6c757d', fontSize: '0.8125rem' }}>
            <p style={{ margin: 0 }}>
              &copy; 2021 Prop Right Crafted with{' '}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="#f46a6a"
                style={{ display: 'inline', verticalAlign: 'middle' }}
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>{' '}
              by{' '}
              <a
                href="https://www.versatilecommerce.com/"
                style={{ color: '#556ee6', textDecoration: 'none' }}
                target="_blank"
                rel="noreferrer"
              >
                Versatile Commerce
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel — background image with dark overlay ── */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          backgroundImage: 'url(/images/authentication-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#292626',
            opacity: 0.7,
          }}
        />
      </div>
    </div>
  );
}
