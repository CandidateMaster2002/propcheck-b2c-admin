'use client';

import { useState } from 'react';

type Step = 'email' | 'otp';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');

  // Step 1
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [devOtp, setDevOtp] = useState(''); // OTP returned by API (dev mode)

  // Step 2
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    if (!email.trim()) { setEmailError('Please enter your email address.'); return; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim())) { setEmailError('Please enter a valid email address.'); return; }
    setEmailLoading(true);
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.status) {
        if (data.data?.otp) setDevOtp(data.data.otp);
        setStep('otp');
      } else {
        setEmailError(data.message || 'Email not found. Please check and try again.');
      }
    } catch {
      setEmailError('Network error. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!otp.trim()) { setResetError('Please enter the OTP.'); return; }
    if (!newPassword) { setResetError('Please enter a new password.'); return; }
    if (newPassword.length < 6) { setResetError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setResetError('Passwords do not match.'); return; }
    setResetLoading(true);
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim(), newPassword }),
      });
      const data = await res.json();
      if (data.status) {
        setSuccess(true);
      } else {
        setResetError(data.message || 'Failed to reset password. Please try again.');
      }
    } catch {
      setResetError('Network error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  // ── Shared input style ──────────────────────────────────────────────────────
  const inputBox = (opts: {
    icon: string;
    label: string;
    type: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoComplete?: string;
    maxLength?: number;
    rightIcon?: React.ReactNode;
  }) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ position: 'relative' }}>
        <i
          className={opts.icon}
          style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '19px', fontSize: '24px', color: '#5664d2', pointerEvents: 'none' }}
        />
        <label style={{ position: 'absolute', top: '7px', left: '60px', fontSize: '0.7rem', color: '#5664d2', fontWeight: 500, pointerEvents: 'none', margin: 0 }}>
          {opts.label}
        </label>
        <input
          type={opts.type}
          value={opts.value}
          onChange={(e) => opts.onChange(e.target.value)}
          placeholder={opts.placeholder || ''}
          autoComplete={opts.autoComplete || 'off'}
          maxLength={opts.maxLength}
          style={{ width: '100%', height: '60px', paddingTop: '28px', paddingBottom: '0', paddingLeft: '60px', paddingRight: opts.rightIcon ? '60px' : '1rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.875rem', color: '#495057', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
          onFocus={(e) => (e.target.style.borderColor = '#5664d2')}
          onBlur={(e) => (e.target.style.borderColor = '#ced4da')}
        />
        {opts.rightIcon}
      </div>
    </div>
  );

  const eyeToggle = (show: boolean, toggle: () => void) => (
    <i
      onClick={toggle}
      className={show ? 'ri-eye-fill' : 'ri-eye-line'}
      style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '19px', fontSize: '24px', color: '#5664d2', cursor: 'pointer' }}
    />
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f8f9fa' }}>

      {/* ── Left panel ── */}
      <div style={{ width: '33.333%', minWidth: '320px', display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-dark.png" alt="Prop Right" style={{ height: '100px', width: 'auto', display: 'inline-block' }} />
          </div>

          {success ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#d4edda', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#28a745">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#28a745', marginBottom: '0.75rem' }}>Password Reset!</h4>
              <p style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '1.5rem' }}>
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <a
                href="/login"
                style={{ display: 'inline-block', padding: '0.5rem 2.5rem', backgroundColor: '#556ee6', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontWeight: 500, fontSize: '0.9375rem' }}
              >
                Back to Login
              </a>
            </div>
          ) : step === 'email' ? (
            /* ── Step 1: Email input ── */
            <>
              <h4 style={{ textAlign: 'center', fontSize: '1.125rem', fontWeight: 600, color: '#495057', margin: '0 0 0.5rem' }}>
                Forgot Password
              </h4>
              <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6c757d', marginBottom: '1.5rem' }}>
                Enter your registered email address. We&apos;ll send you an OTP to reset your password.
              </p>

              <form onSubmit={handleRequestOtp}>
                {inputBox({
                  icon: 'ri-mail-line',
                  label: 'Email Address',
                  type: 'email',
                  value: email,
                  onChange: setEmail,
                  placeholder: 'Enter your email',
                  autoComplete: 'email',
                })}

                {emailError && (
                  <div style={{ color: '#dc3545', fontSize: '0.8125rem', marginBottom: '1rem' }}>{emailError}</div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <button
                    type="submit"
                    disabled={emailLoading}
                    style={{ padding: '0.5rem 2.5rem', backgroundColor: '#556ee6', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.9375rem', fontWeight: 500, cursor: emailLoading ? 'not-allowed' : 'pointer', opacity: emailLoading ? 0.65 : 1 }}
                  >
                    {emailLoading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <a href="/login" style={{ color: '#6c757d', fontSize: '0.875rem', textDecoration: 'none' }}>
                    &larr; Back to Login
                  </a>
                </div>
              </form>
            </>
          ) : (
            /* ── Step 2: OTP + new password ── */
            <>
              <h4 style={{ textAlign: 'center', fontSize: '1.125rem', fontWeight: 600, color: '#495057', margin: '0 0 0.5rem' }}>
                Reset Password
              </h4>
              <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6c757d', marginBottom: '1rem' }}>
                OTP sent to <strong>{email}</strong>. Enter the OTP and your new password below.
              </p>

              {devOtp && (
                <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: '#856404', marginBottom: '1rem', textAlign: 'center' }}>
                  <strong>Dev mode OTP:</strong> {devOtp}
                </div>
              )}

              <form onSubmit={handleResetPassword}>
                {inputBox({
                  icon: 'ri-lock-2-line',
                  label: 'OTP Code',
                  type: 'text',
                  value: otp,
                  onChange: setOtp,
                  placeholder: 'Enter 6-digit OTP',
                  maxLength: 6,
                })}

                {inputBox({
                  icon: 'ri-lock-password-line',
                  label: 'New Password',
                  type: showNew ? 'text' : 'password',
                  value: newPassword,
                  onChange: setNewPassword,
                  placeholder: 'Min 6 characters',
                  rightIcon: eyeToggle(showNew, () => setShowNew(!showNew)),
                })}

                {inputBox({
                  icon: 'ri-lock-password-line',
                  label: 'Confirm Password',
                  type: showConfirm ? 'text' : 'password',
                  value: confirmPassword,
                  onChange: setConfirmPassword,
                  placeholder: 'Re-enter password',
                  rightIcon: eyeToggle(showConfirm, () => setShowConfirm(!showConfirm)),
                })}

                {resetError && (
                  <div style={{ color: '#dc3545', fontSize: '0.8125rem', marginBottom: '1rem' }}>{resetError}</div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    style={{ padding: '0.5rem 2.5rem', backgroundColor: '#556ee6', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.9375rem', fontWeight: 500, cursor: resetLoading ? 'not-allowed' : 'pointer', opacity: resetLoading ? 0.65 : 1 }}
                  >
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setResetError(''); setOtp(''); setNewPassword(''); setConfirmPassword(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: '0.875rem' }}
                  >
                    &larr; Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={emailLoading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#556ee6', fontSize: '0.875rem', opacity: emailLoading ? 0.65 : 1 }}
                  >
                    Resend OTP
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '2rem', color: '#6c757d', fontSize: '0.8125rem' }}>
            <p style={{ margin: 0 }}>
              &copy; 2021 Prop Right Crafted with{' '}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f46a6a" style={{ display: 'inline', verticalAlign: 'middle' }}>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>{' '}
              by{' '}
              <a href="https://www.versatilecommerce.com/" style={{ color: '#556ee6', textDecoration: 'none' }} target="_blank" rel="noreferrer">
                Versatile Commerce
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, position: 'relative', backgroundImage: 'url(/images/authentication-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#292626', opacity: 0.7 }} />
      </div>
    </div>
  );
}
