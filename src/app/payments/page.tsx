'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';

const DATE_PRESETS = ['All Time', 'This Month', 'Last Month', 'Last 30 Days', 'Last 7 Days'];

function getDateRange(preset: string): { startDate: string; endDate: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (preset) {
    case 'This Month': { const s = new Date(today.getFullYear(), today.getMonth(), 1); return { startDate: fmt(s), endDate: fmt(today) }; }
    case 'Last Month': { const s = new Date(today.getFullYear(), today.getMonth() - 1, 1); const e = new Date(today.getFullYear(), today.getMonth(), 0); return { startDate: fmt(s), endDate: fmt(e) }; }
    case 'Last 30 Days': { const s = new Date(today); s.setDate(s.getDate() - 29); return { startDate: fmt(s), endDate: fmt(today) }; }
    case 'Last 7 Days': { const s = new Date(today); s.setDate(s.getDate() - 6); return { startDate: fmt(s), endDate: fmt(today) }; }
    default: return { startDate: '', endDate: '' };
  }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Paid: { bg: '#d4edda', text: '#155724' },
  Pending: { bg: '#fff3cd', text: '#856404' },
  Failed: { bg: '#f8d7da', text: '#721c24' },
  Refunded: { bg: '#d1ecf1', text: '#0c5460' },
};

export default function PaymentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState('All Time');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [payments, setPayments] = useState<any[]>([]);
  const [totalPayments, setTotalPayments] = useState(0);
  const [totals, setTotals] = useState({ totalPaid: 0, totalPending: 0, totalAmount: 0, thisMonthTotal: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Add Payment modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ customerName: '', customerEmail: '', customerPhone: '', amount: '', gst: '18', paymentMethod: 'Razorpay', notes: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  // Mark Paid modal
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [activePayment, setActivePayment] = useState<any>(null);
  const [razorpayId, setRazorpayId] = useState('');
  const [markPaidSaving, setMarkPaidSaving] = useState(false);
  const [markPaidError, setMarkPaidError] = useState('');

  // Auth
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (!res.ok) { router.push('/login'); return; }
        const d = await res.json();
        if (d.status && d.data) { setUser(d.data); setAuthChecked(true); }
        else router.push('/login');
      } catch { router.push('/login'); }
    };
    check();
  }, [router]);

  // Fetch
  const fetchPayments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(datePreset);
      const params = new URLSearchParams({ limit: String(ITEMS_PER_PAGE), page: String(page) });
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/payments?${params}`);
      const d = await res.json();
      if (d.status) {
        setPayments(d.data || []);
        setTotalPayments(d.total || 0);
        setTotals(d.totals || { totalPaid: 0, totalPending: 0, totalAmount: 0, thisMonthTotal: 0 });
      }
    } finally { setLoading(false); }
  }, [datePreset, statusFilter, searchQuery]);

  useEffect(() => {
    if (!authChecked) return;
    setCurrentPage(1);
    fetchPayments(1);
  }, [authChecked, datePreset, statusFilter, fetchPayments]);

  // Add payment
  const handleAddPayment = async () => {
    setAddError('');
    if (!addForm.amount) { setAddError('Amount is required'); return; }
    if (!addForm.customerName) { setAddError('Customer name is required'); return; }
    setAddSaving(true);
    try {
      const amount = parseFloat(addForm.amount) || 0;
      const gstPct = parseFloat(addForm.gst) || 0;
      const gst = Math.round((amount * gstPct) / 100);
      const totalAmount = amount + gst;
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, amount, gst, totalAmount }),
      });
      const d = await res.json();
      if (d.status) { setShowAddModal(false); setAddForm({ customerName: '', customerEmail: '', customerPhone: '', amount: '', gst: '18', paymentMethod: 'Razorpay', notes: '' }); fetchPayments(currentPage); }
      else setAddError(d.message || 'Failed to record payment');
    } finally { setAddSaving(false); }
  };

  // Mark Paid
  const openMarkPaid = (payment: any) => {
    setActivePayment(payment);
    setRazorpayId('');
    setMarkPaidError('');
    setShowMarkPaidModal(true);
  };

  const handleMarkPaid = async () => {
    setMarkPaidError('');
    setMarkPaidSaving(true);
    try {
      const res = await fetch(`/api/payments/${activePayment._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'Paid', razorpayPaymentId: razorpayId, paidAt: new Date() }),
      });
      const d = await res.json();
      if (d.status) { setShowMarkPaidModal(false); fetchPayments(currentPage); }
      else setMarkPaidError(d.message || 'Failed to update');
    } finally { setMarkPaidSaving(false); }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['No.', 'Customer Name', 'Email', 'Phone', 'Property', 'Amount', 'GST', 'Total', 'Method', 'Status', 'Razorpay ID', 'Date'];
    const rows = payments.map((p, i) => [
      i + 1, p.customerName || '-', p.customerEmail || '-', p.customerPhone || '-',
      p.propertyId?.propertyName || '-', p.amount || 0, p.gst || 0, p.totalAmount || 0,
      p.paymentMethod || '-', p.paymentStatus || '-', p.razorpayPaymentId || '-',
      new Date(p.createdAt).toLocaleDateString('en-IN'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!authChecked || !user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading...</p></div>;
  }

  const fmtCurrency = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontSize: '0.8125rem', fontWeight: 600, color: '#444', backgroundColor: '#f5f5f5', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid #f0f0f0', color: '#374151' };
  const inputStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.875rem', backgroundColor: '#fff' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' };
  const totalPages = Math.max(1, Math.ceil(totalPayments / ITEMS_PER_PAGE));

  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Payments</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={exportCSV} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
              Export CSV
            </button>
            <button onClick={() => setShowAddModal(true)} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
              + Record Payment
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Paid', value: loading ? '...' : fmtCurrency(totals.totalPaid), color: '#28a745' },
            { label: 'Pending', value: loading ? '...' : fmtCurrency(totals.totalPending), color: '#ffc107' },
            { label: 'This Month', value: loading ? '...' : fmtCurrency(totals.thisMonthTotal), color: '#0066cc' },
            { label: 'Total Records', value: loading ? '...' : totalPayments, color: '#6f42c1' },
          ].map((card) => (
            <div key={card.label} style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${card.color}` }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.4rem' }}>{card.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ ...labelStyle, fontWeight: 500, color: '#555', fontSize: '0.75rem' }}>Date Range</label>
              <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                {DATE_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...labelStyle, fontWeight: 500, color: '#555', fontSize: '0.75rem' }}>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                <option value="">All</option>
                {['Paid', 'Pending', 'Failed', 'Refunded'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...labelStyle, fontWeight: 500, color: '#555', fontSize: '0.75rem' }}>Search</label>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Customer, payment ID..."
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <button onClick={() => { setCurrentPage(1); fetchPayments(1); }}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
              Payment History
              {totalPayments > 0 && <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '0.5rem' }}>({totalPayments} total)</span>}
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr>
                  {['No.', 'Customer', 'Property', 'Amount', 'GST', 'Total', 'Method', 'Status', 'Payment ID', 'Date', 'Actions'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} style={{ ...tdStyle, textAlign: 'center', padding: '2rem', color: '#999' }}>Loading...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={11} style={{ ...tdStyle, textAlign: 'center', padding: '2rem', color: '#999' }}>No payment records found. Click &quot;+ Record Payment&quot; to add one.</td></tr>
                ) : (
                  payments.map((p, i) => {
                    const sc = STATUS_COLORS[p.paymentStatus] || { bg: '#f8f9fa', text: '#333' };
                    return (
                      <tr key={p._id} onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#fafafa'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}>
                        <td style={tdStyle}>{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                        <td style={{ ...tdStyle }}>
                          <div style={{ fontWeight: 500 }}>{p.customerName || '-'}</div>
                          {p.customerPhone && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{p.customerPhone}</div>}
                        </td>
                        <td style={{ ...tdStyle, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.propertyId?.propertyName || '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtCurrency(p.amount || 0)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#6b7280' }}>{fmtCurrency(p.gst || 0)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(p.totalAmount || 0)}</td>
                        <td style={tdStyle}>{p.paymentMethod || 'Razorpay'}</td>
                        <td style={tdStyle}>
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: sc.bg, color: sc.text }}>
                            {p.paymentStatus || '-'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: '0.75rem', color: '#6b7280' }}>{p.razorpayPaymentId || '-'}</td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            {p.paymentStatus === 'Pending' && (
                              <button onClick={() => openMarkPaid(p)} style={{ padding: '0.25rem 0.6rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Mark Paid</button>
                            )}
                            {p.propertyId?._id && (
                              <button onClick={() => router.push(`/inspections/${p.propertyId._id}`)} style={{ padding: '0.25rem 0.6rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>View</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #f0f0f0' }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalPayments} itemsPerPage={ITEMS_PER_PAGE} onPageChange={(p) => { setCurrentPage(p); fetchPayments(p); }} />
          </div>
        </div>
      </div>

      {/* Add Payment Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setAddError(''); }} title="Record Payment" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {addError && <div style={{ backgroundColor: '#f8d7da', color: '#842029', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>{addError}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Customer Name <span style={{ color: 'red' }}>*</span></label>
              <input type="text" value={addForm.customerName} onChange={(e) => setAddForm((f) => ({ ...f, customerName: e.target.value }))}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={addForm.customerEmail} onChange={(e) => setAddForm((f) => ({ ...f, customerEmail: e.target.value }))}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={addForm.customerPhone} onChange={(e) => setAddForm((f) => ({ ...f, customerPhone: e.target.value }))}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={labelStyle}>Base Amount (Rs.) <span style={{ color: 'red' }}>*</span></label>
              <input type="number" min="0" value={addForm.amount} onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={labelStyle}>GST (%)</label>
              <input type="number" min="0" max="100" value={addForm.gst} onChange={(e) => setAddForm((f) => ({ ...f, gst: e.target.value }))}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            {addForm.amount && (
              <div style={{ gridColumn: '1 / -1', backgroundColor: '#f0fff4', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                <strong>Total:</strong> ₹{(parseFloat(addForm.amount || '0') + Math.round((parseFloat(addForm.amount || '0') * parseFloat(addForm.gst || '0')) / 100)).toLocaleString('en-IN')}
                {' '}(Base: ₹{parseFloat(addForm.amount || '0').toLocaleString('en-IN')} + GST: ₹{Math.round((parseFloat(addForm.amount || '0') * parseFloat(addForm.gst || '0')) / 100).toLocaleString('en-IN')})
              </div>
            )}
            <div>
              <label style={labelStyle}>Payment Method</label>
              <select value={addForm.paymentMethod} onChange={(e) => setAddForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                style={{ ...inputStyle, width: '100%' }}>
                {['Razorpay', 'Bank Transfer', 'Cash', 'UPI', 'Cheque'].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notes</label>
              <textarea value={addForm.notes} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowAddModal(false); setAddError(''); }} style={{ padding: '0.5rem 1.25rem', border: '1px solid #ddd', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
            <button onClick={handleAddPayment} disabled={addSaving} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: addSaving ? 0.7 : 1 }}>
              {addSaving ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Mark Paid Modal */}
      <Modal isOpen={showMarkPaidModal} onClose={() => setShowMarkPaidModal(false)} title="Mark as Paid" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activePayment && (
            <div style={{ backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '0.75rem', fontSize: '0.875rem' }}>
              <div><strong>Customer:</strong> {activePayment.customerName}</div>
              <div><strong>Amount:</strong> ₹{activePayment.totalAmount?.toLocaleString('en-IN')}</div>
            </div>
          )}
          {markPaidError && <div style={{ backgroundColor: '#f8d7da', color: '#842029', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>{markPaidError}</div>}
          <div>
            <label style={labelStyle}>Razorpay Payment ID (optional)</label>
            <input type="text" value={razorpayId} onChange={(e) => setRazorpayId(e.target.value)} placeholder="pay_XXXXXXXXXXXXXXXX"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowMarkPaidModal(false)} style={{ padding: '0.5rem 1.25rem', border: '1px solid #ddd', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
            <button onClick={handleMarkPaid} disabled={markPaidSaving} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: markPaidSaving ? 0.7 : 1 }}>
              {markPaidSaving ? 'Saving...' : 'Confirm Paid'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
