'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ConfirmDialog from '@/components/ConfirmDialog';

const PROPERTY_TYPES = ['1BHK', '2BHK', '3BHK', '3BHK+', 'Villa'];

const emptyForm = {
  _id: '',
  propertyType: '',
  propertySize: '',
  propertyPrice: '',
  variablePay: [{ variableSize: '', variableAmount: '' }],
};

type VPEntry = { variableSize: string; variableAmount: string };
type FormState = typeof emptyForm;

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [priceArray, setPriceArray] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [isUpdate, setIsUpdate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [deleteId, setDeleteId] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // --------------------------------------------------------------------------
  // Auth
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // Fetch prices
  // --------------------------------------------------------------------------
  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inspection-price?limit=50&page=1');
      const data = await res.json();
      if (data.status) setPriceArray(data.data || []);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    fetchPrices();
  }, [authChecked, fetchPrices]);

  // Property types already having an entry (disabled in add-new form)
  const takenTypes = priceArray.map((p) => p.propertyType);

  // --------------------------------------------------------------------------
  // Edit
  // --------------------------------------------------------------------------
  const edit = (item: any) => {
    setError(''); setSuccess('');
    const vp: VPEntry[] = item.variablePay?.length > 0
      ? item.variablePay.map((v: any) => ({ variableSize: String(v.variableSize ?? ''), variableAmount: String(v.variableAmount ?? '') }))
      : [{ variableSize: '', variableAmount: '' }];
    setForm({
      _id: item._id,
      propertyType: item.propertyType || '',
      propertySize: String(item.propertySize ?? ''),
      propertyPrice: String(item.propertyPrice ?? item.basePrice ?? ''),
      variablePay: vp,
    });
    setIsUpdate(true);
  };

  // --------------------------------------------------------------------------
  // Delete
  // --------------------------------------------------------------------------
  const confirmDelete = (id: string) => { setDeleteId(id); setDeleteDialog(true); };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/inspection-price/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status) {
        setSuccess('Price entry deleted.');
        await fetchPrices();
        cancel();
      } else {
        setError(data.message || 'Failed to delete');
      }
    } catch { setError('An unexpected error occurred'); }
    finally { setDeleting(false); setDeleteDialog(false); setDeleteId(''); }
  };

  // --------------------------------------------------------------------------
  // Cancel
  // --------------------------------------------------------------------------
  const cancel = () => {
    setForm({ ...emptyForm, variablePay: [{ variableSize: '', variableAmount: '' }] });
    setIsUpdate(false);
    setError(''); setSuccess('');
  };

  // --------------------------------------------------------------------------
  // Submit
  // --------------------------------------------------------------------------
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.propertyType) { setError('Property Type is required.'); return; }
    if (!form.propertySize) { setError('Property Size is required.'); return; }
    if (!form.propertyPrice) { setError('Property Price is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        propertyType: form.propertyType,
        propertySize: Number(form.propertySize),
        propertyPrice: Number(form.propertyPrice),
        variablePay: form.variablePay
          .filter((v) => v.variableSize && v.variableAmount)
          .map((v) => ({ variableSize: Number(v.variableSize), variableAmount: Number(v.variableAmount) })),
      };

      let res: Response;
      if (isUpdate && form._id) {
        res = await fetch(`/api/inspection-price/${form._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, _id: form._id }),
        });
      } else {
        res = await fetch('/api/inspection-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (data.status) {
        setSuccess(isUpdate ? 'Updated Successfully' : 'Agent added Successfully');
        await fetchPrices();
        cancel();
      } else {
        setError(data.message || 'Failed to save');
      }
    } catch { setError('An unexpected error occurred'); }
    finally { setSaving(false); }
  };

  // --------------------------------------------------------------------------
  // Guard
  // --------------------------------------------------------------------------
  if (!authChecked || !user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading...</p></div>;
  }

  // --------------------------------------------------------------------------
  // Styles
  // --------------------------------------------------------------------------
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #ced4da',
    borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '0.2rem', fontSize: '0.78rem', color: '#495057',
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: '1.5rem' }}>
          <ol style={{ display: 'flex', gap: '0.4rem', listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8125rem', color: '#6c757d' }}>
            <li><a href="#" style={{ color: '#6c757d', textDecoration: 'none' }}>Prop Right</a></li>
            <li>/</li>
            <li style={{ color: '#495057' }}>Price Settings</li>
          </ol>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* ---------------------------------------------------------------- */}
          {/* LEFT: Price Table                                                 */}
          {/* ---------------------------------------------------------------- */}
          <div style={{ backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 1fr 1fr 96px', backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6', padding: '0.7rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: '#495057', gap: '0.5rem' }}>
              <div>#</div>
              <div>Property Type</div>
              <div>Property Size</div>
              <div>Property Price</div>
              <div>Action</div>
            </div>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '0.875rem' }}>Loading...</div>
            ) : priceArray.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '0.875rem' }}>No price data found.</div>
            ) : (
              priceArray.map((item, i) => (
                <div key={item._id}>
                  <div style={{ width: '100%', height: '1px', backgroundColor: '#dee2e6' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 1fr 1fr 96px', padding: '0.65rem 1rem', fontSize: '0.8rem', color: '#212529', gap: '0.5rem', alignItems: 'center' }}>
                    <div>{i + 1}</div>
                    <div>{item.propertyType}</div>
                    <div>{item.propertySize ?? '-'}</div>
                    <div>{item.propertyPrice ?? item.basePrice ?? '-'}</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => edit(item)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#556ee6', padding: '0.2rem 0.4rem' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button onClick={() => confirmDelete(item._id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '0.2rem 0.4rem' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* RIGHT: Inline Form                                               */}
          {/* ---------------------------------------------------------------- */}
          <div style={{ backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', padding: '1.25rem' }}>
            <form onSubmit={onSubmit}>
              {error && (
                <div style={{ backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', borderRadius: '4px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', borderRadius: '4px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                  {success}
                </div>
              )}

              {/* Property Type */}
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={labelStyle}>Property Type</label>
                <select
                  value={form.propertyType}
                  onChange={(e) => setForm((f) => ({ ...f, propertyType: e.target.value }))}
                  style={inputStyle}
                  required
                >
                  <option value="">Select type</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t} disabled={!isUpdate && takenTypes.includes(t)}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Size */}
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={labelStyle}>Property Size (sqft)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.propertySize}
                  onChange={(e) => { if (/^\d*$/.test(e.target.value)) setForm((f) => ({ ...f, propertySize: e.target.value })); }}
                  placeholder="Property Size"
                  style={inputStyle}
                  required
                />
              </div>

              {/* Property Price */}
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={labelStyle}>Property Price</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.propertyPrice}
                  onChange={(e) => { if (/^\d*\.?\d*$/.test(e.target.value)) setForm((f) => ({ ...f, propertyPrice: e.target.value })); }}
                  placeholder="Property Price"
                  style={inputStyle}
                  required
                />
              </div>

              {/* Variable Pay */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#495057' }}>Variable Pay:&#8211;</span>
                </div>
                {form.variablePay.map((vp, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Over Property Size (sqft)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={vp.variableSize}
                        onChange={(e) => {
                          if (/^\d*$/.test(e.target.value)) {
                            const updated = form.variablePay.map((v, i) => i === idx ? { ...v, variableSize: e.target.value } : v);
                            setForm((f) => ({ ...f, variablePay: updated }));
                          }
                        }}
                        placeholder="Property Price"
                        style={{ ...inputStyle, fontSize: '0.75rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Over Property Price</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={vp.variableAmount}
                        onChange={(e) => {
                          if (/^\d*\.?\d*$/.test(e.target.value)) {
                            const updated = form.variablePay.map((v, i) => i === idx ? { ...v, variableAmount: e.target.value } : v);
                            setForm((f) => ({ ...f, variablePay: updated }));
                          }
                        }}
                        placeholder="Property Amount"
                        style={{ ...inputStyle, fontSize: '0.75rem' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                {isUpdate && (
                  <button
                    type="button"
                    onClick={cancel}
                    style={{ padding: '0.4rem 1rem', border: '1px solid #ced4da', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#495057' }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  style={{ backgroundColor: '#556ee6', color: 'white', border: 'none', borderRadius: '4px', padding: '0.4rem 1.25rem', fontSize: '0.875rem', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Saving...' : (isUpdate ? 'Update' : 'Submit')}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteDialog}
        onClose={() => { setDeleteDialog(false); setDeleteId(''); }}
        onConfirm={handleDelete}
        title="Delete Price Entry"
        message="Are you sure you want to delete this price entry? This action cannot be undone."
        loading={deleting}
      />
    </Layout>
  );
}
