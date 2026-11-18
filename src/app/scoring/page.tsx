'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';

export default function ScoringPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [form, setForm] = useState({ major: '', minor: '', cosmetic: '' });
  const [metricId, setMetricId] = useState<string | null>(null);
  const [isUpdate, setIsUpdate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.status === 401 || !res.ok) { router.push('/login'); return; }
        const data = await res.json();
        if (data.status && data.data) { setUser(data.data); setAuthChecked(true); }
        else router.push('/login');
      } catch { router.push('/login'); }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    fetch('/api/metric-score')
      .then((r) => r.json())
      .then((data) => {
        if (data.status && data.data) {
          setForm({
            major: String(data.data.major ?? ''),
            minor: String(data.data.minor ?? ''),
            cosmetic: String(data.data.cosmetic ?? ''),
          });
          setMetricId(data.data._id);
          setIsUpdate(true);
        }
      })
      .catch(() => {/* silently fail */});
  }, [authChecked]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.major || !form.minor || !form.cosmetic) {
      setError('All fields are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        major: Number(form.major),
        minor: Number(form.minor),
        cosmetic: Number(form.cosmetic),
      };
      let res: Response;
      if (isUpdate && metricId) {
        res = await fetch(`/api/metric-score/${metricId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/metric-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (data.status) {
        setSuccess('Score Updated Successfully');
        if (data.data?._id) { setMetricId(data.data._id); setIsUpdate(true); }
      } else {
        setError(data.message || 'Failed to update score');
      }
    } catch { setError('An unexpected error occurred'); }
    finally { setSaving(false); }
  };

  if (!authChecked || !user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading...</p></div>;
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.25rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#495057',
  };

  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: '1.5rem' }}>
          <ol style={{ display: 'flex', gap: '0.4rem', listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8125rem', color: '#6c757d' }}>
            <li><a href="#" style={{ color: '#6c757d', textDecoration: 'none' }}>Prop Right</a></li>
            <li>/</li>
            <li style={{ color: '#495057' }}>Scoring Metric</li>
          </ol>
        </div>

        {/* Centered card */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 4px rgba(0,0,0,0.12)', padding: '1.5rem' }}>
              <form onSubmit={onSubmit}>
                {error && (
                  <div style={{ backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', borderRadius: '4px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    {error}
                  </div>
                )}
                {success && (
                  <div style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', borderRadius: '4px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    {success}
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Major Score</label>
                  <input
                    type="number"
                    step="any"
                    value={form.major}
                    onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
                    placeholder="Enter major value"
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Minor Score</label>
                  <input
                    type="number"
                    step="any"
                    value={form.minor}
                    onChange={(e) => setForm((f) => ({ ...f, minor: e.target.value }))}
                    placeholder="Enter minor value"
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={labelStyle}>Cosmetic Score</label>
                  <input
                    type="number"
                    step="any"
                    value={form.cosmetic}
                    onChange={(e) => setForm((f) => ({ ...f, cosmetic: e.target.value }))}
                    placeholder="Enter cosmetic value"
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      backgroundColor: '#556ee6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.5rem 2rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Saving...' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
