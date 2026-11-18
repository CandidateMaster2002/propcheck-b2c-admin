'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentDetail {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  state?: string;
  city: string;
  pincode?: string;
  commissionRate: number;
  totalEarnings: number;
  status: string;
  bankDetails?: { accountNumber?: string; ifscCode?: string; bankName?: string; branchName?: string };
  panNo?: string;
  gstNo?: string;
  aadharCard?: string;
  createdAt?: string;
}

interface Coupon {
  _id: string;
  couponCode: string;
  couponPercentage: number;
  incentivePercentage: number;
  assignedStatus: string;
  creatives?: string[];
  createdAt?: string;
}

interface Statement {
  _id: string;
  inspectionId?: string;
  bookingDate?: string;
  customerName?: string;
  agentName?: string;
  couponCode?: string;
  amount?: number;
  discount?: number;
  incentiveAmount?: number;
  netAmount?: number;
  customerAmount?: number;
  isIncentivePaid?: boolean;
  utrNumber?: string;
  incentivePaidDate?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function AvatarCircle({ name, size = 80 }: { name: string; size?: number }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#0066cc', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, flexShrink: 0 }}>
      {initial}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '0.8125rem', color: '#6b7280', minWidth: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{value ?? '-'}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(true);

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponPct, setCouponPct] = useState('');
  const [incentivePct, setIncentivePct] = useState('');
  const [couponError, setCouponError] = useState('');
  const [generatingCoupon, setGeneratingCoupon] = useState(false);

  // Statements
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(false);
  const [stmtPage, setStmtPage] = useState(1);
  const [stmtTotal, setStmtTotal] = useState(0);
  const [stmtTotalPages, setStmtTotalPages] = useState(1);
  const stmtPerPage = 10;

  // Incentive modal
  const [showIncentiveModal, setShowIncentiveModal] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null);
  const [utrInput, setUtrInput] = useState('');
  const [paidDateInput, setPaidDateInput] = useState('');
  const [incentiveError, setIncentiveError] = useState('');
  const [savingIncentive, setSavingIncentive] = useState(false);

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Fetch agent
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!authChecked || !agentId) return;
    const fetchAgent = async () => {
      setLoadingAgent(true);
      try {
        const res = await fetch(`/api/agents/${agentId}`);
        const data = await res.json();
        if (data.status && data.data) setAgent(data.data);
        else router.push('/agents');
      } catch { router.push('/agents'); }
      finally { setLoadingAgent(false); }
    };
    fetchAgent();
  }, [authChecked, agentId, router]);

  // ---------------------------------------------------------------------------
  // Fetch coupons
  // ---------------------------------------------------------------------------

  const fetchCoupons = useCallback(async () => {
    if (!agentId) return;
    setLoadingCoupons(true);
    try {
      const res = await fetch(`/api/agents/coupons?agentId=${agentId}`);
      const data = await res.json();
      if (data.status) setCoupons(data.data || []);
    } catch { /* silent */ }
    finally { setLoadingCoupons(false); }
  }, [agentId]);

  useEffect(() => {
    if (!authChecked) return;
    fetchCoupons();
  }, [authChecked, fetchCoupons]);

  // ---------------------------------------------------------------------------
  // Fetch statements
  // ---------------------------------------------------------------------------

  const fetchStatements = useCallback(async () => {
    if (!agentId) return;
    setLoadingStatements(true);
    try {
      const params = new URLSearchParams({ agentId, limit: String(stmtPerPage), page: String(stmtPage) });
      const res = await fetch(`/api/agents/statements?${params}`);
      const data = await res.json();
      if (data.status) {
        setStatements(data.data || []);
        setStmtTotal(data.total ?? 0);
        setStmtTotalPages(Math.max(1, Math.ceil((data.total ?? 0) / stmtPerPage)));
      }
    } catch { /* silent */ }
    finally { setLoadingStatements(false); }
  }, [agentId, stmtPage]);

  useEffect(() => {
    if (!authChecked) return;
    fetchStatements();
  }, [authChecked, fetchStatements]);

  // ---------------------------------------------------------------------------
  // Coupon actions
  // ---------------------------------------------------------------------------

  const handleGenerateCoupon = async () => {
    setCouponError('');
    if (!couponPct || !incentivePct) { setCouponError('Both Coupon % and Incentive % are required.'); return; }
    setGeneratingCoupon(true);
    try {
      const res = await fetch('/api/agents/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, couponPercentage: parseFloat(couponPct), incentivePercentage: parseFloat(incentivePct) }),
      });
      const data = await res.json();
      if (!data.status) { setCouponError(data.message || 'Failed to generate coupon'); return; }
      setCouponPct(''); setIncentivePct('');
      fetchCoupons();
    } catch { setCouponError('Network error'); }
    finally { setGeneratingCoupon(false); }
  };

  const handleToggleCouponStatus = async (coupon: Coupon) => {
    const newStatus = coupon.assignedStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await fetch(`/api/agents/coupons/${coupon._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignedStatus: newStatus }) });
      setCoupons((prev) => prev.map((c) => c._id === coupon._id ? { ...c, assignedStatus: newStatus } : c));
    } catch { /* silent */ }
  };

  // ---------------------------------------------------------------------------
  // Incentive actions
  // ---------------------------------------------------------------------------

  const openIncentiveModal = (stmt: Statement) => {
    setSelectedStatement(stmt);
    setUtrInput(stmt.utrNumber || '');
    setPaidDateInput(stmt.incentivePaidDate ? stmt.incentivePaidDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setIncentiveError('');
    setShowIncentiveModal(true);
  };

  const handleMarkIncentivePaid = async () => {
    if (!selectedStatement) return;
    if (!utrInput.trim()) { setIncentiveError('UTR Number is required.'); return; }
    if (!paidDateInput) { setIncentiveError('Incentive Paid Date is required.'); return; }
    setSavingIncentive(true); setIncentiveError('');
    try {
      const res = await fetch(`/api/agents/statements/${selectedStatement._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isIncentivePaid: true, utrNumber: utrInput.trim(), incentivePaidDate: paidDateInput }),
      });
      const data = await res.json();
      if (!data.status) { setIncentiveError(data.message || 'Failed to update'); return; }
      setShowIncentiveModal(false);
      fetchStatements();
    } catch { setIncentiveError('Network error'); }
    finally { setSavingIncentive(false); }
  };

  // ---------------------------------------------------------------------------
  // Guard
  // ---------------------------------------------------------------------------

  if (!authChecked || !user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading...</p></div>;
  }

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const cardStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
  const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontSize: '0.8125rem', fontWeight: 600, color: '#444', backgroundColor: '#f5f5f5', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid #f0f0f0', color: '#374151' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>
        <button onClick={() => router.push('/agents')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1.25rem', padding: '0.4rem 0.9rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
          &larr; Back to Agents
        </button>

        {loadingAgent ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading agent details...</div>
        ) : !agent ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Agent not found.</div>
        ) : (
          <>
            {/* ── Row 1: Profile + Bank Details ─────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={cardStyle}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#111827' }}>Agent Profile</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <AvatarCircle name={agent.name} size={80} />
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>{agent.name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>{agent.email}</div>
                  </div>
                </div>
                <InfoRow label="Phone" value={agent.phone} />
                <InfoRow label="Address" value={agent.address} />
                <InfoRow label="State" value={agent.state} />
                <InfoRow label="City" value={agent.city} />
                <InfoRow label="Pincode" value={agent.pincode} />
                <InfoRow label="Commission Rate" value={`${agent.commissionRate ?? 0}%`} />
                <InfoRow label="Status" value={<StatusBadge status={agent.status === 'Enable' ? 'Enable' : agent.status} />} />
                <InfoRow label="Total Earnings" value={`Rs. ${(agent.totalEarnings ?? 0).toLocaleString('en-IN')}`} />
                {agent.createdAt && <InfoRow label="Joined" value={new Date(agent.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={cardStyle}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#111827' }}>Bank Details</h2>
                  {agent.bankDetails && (agent.bankDetails.accountNumber || agent.bankDetails.bankName) ? (
                    <>
                      <InfoRow label="Bank" value={agent.bankDetails.bankName} />
                      <InfoRow label="Branch" value={agent.bankDetails.branchName} />
                      <InfoRow label="IFSC Code" value={agent.bankDetails.ifscCode} />
                      <InfoRow label="Account No" value={agent.bankDetails.accountNumber} />
                    </>
                  ) : (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '0.875rem' }}>No bank details added</div>
                  )}
                </div>

                <div style={cardStyle}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#111827' }}>KYC Documents</h2>
                  <InfoRow label="PAN No" value={agent.panNo} />
                  <InfoRow label="GST No" value={agent.gstNo} />
                  <InfoRow label="Aadhar No" value={agent.aadharCard} />
                </div>
              </div>
            </div>

            {/* ── Row 2: Coupon Management ───────────────────────────────── */}
            <div style={{ ...cardStyle, marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#111827' }}>Coupon Management</h2>
              </div>

              {/* Generate coupon */}
              <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <label style={labelStyle}>Coupon %</label>
                    <input
                      type="number" min="0" max="100" placeholder="e.g. 5" value={couponPct}
                      onChange={(e) => setCouponPct(e.target.value)}
                      style={{ ...inputStyle, width: '120px' }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Incentive %</label>
                    <input
                      type="number" min="0" max="100" placeholder="e.g. 3" value={incentivePct}
                      onChange={(e) => setIncentivePct(e.target.value)}
                      style={{ ...inputStyle, width: '120px' }}
                    />
                  </div>
                  <button
                    onClick={handleGenerateCoupon}
                    disabled={generatingCoupon}
                    style={{ padding: '0.5rem 1.25rem', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: generatingCoupon ? 0.7 : 1 }}
                  >
                    {generatingCoupon ? 'Generating...' : 'Generate Coupon'}
                  </button>
                  {couponError && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{couponError}</span>}
                </div>
              </div>

              {/* Coupons table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['No.', 'Coupon Code', 'Coupon %', 'Incentive %', 'Status', 'Created', 'Toggle'].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCoupons ? (
                      <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: '1.5rem', color: '#999' }}>Loading coupons...</td></tr>
                    ) : coupons.length === 0 ? (
                      <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: '1.5rem', color: '#9ca3af' }}>No coupons yet. Generate one above.</td></tr>
                    ) : (
                      coupons.map((c, idx) => (
                        <tr key={c._id} onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#fafafa'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}>
                          <td style={tdStyle}>{idx + 1}</td>
                          <td style={{ ...tdStyle, fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem', color: '#0066cc' }}>{c.couponCode}</td>
                          <td style={tdStyle}>{c.couponPercentage}%</td>
                          <td style={tdStyle}>{c.incentivePercentage}%</td>
                          <td style={tdStyle}>
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: c.assignedStatus === 'Active' ? '#d1fae5' : '#fee2e2', color: c.assignedStatus === 'Active' ? '#065f46' : '#991b1b' }}>
                              {c.assignedStatus}
                            </span>
                          </td>
                          <td style={tdStyle}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                          <td style={tdStyle}>
                            <div
                              onClick={() => handleToggleCouponStatus(c)}
                              style={{ width: '42px', height: '22px', borderRadius: '11px', cursor: 'pointer', position: 'relative', backgroundColor: c.assignedStatus === 'Active' ? '#28a745' : '#ccc', transition: 'background-color 0.2s' }}
                            >
                              <div style={{ position: 'absolute', top: '2px', left: c.assignedStatus === 'Active' ? '22px' : '2px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }} />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Row 3: Coupon Transaction History ─────────────────────── */}
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#111827' }}>Coupon Transaction History</h2>
                <button
                  onClick={() => {
                    const rows = statements.map((s, i) => [i + 1, s.couponCode || '', s.customerName || '', s.bookingDate ? new Date(s.bookingDate).toLocaleDateString('en-IN') : '', s.amount ?? 0, s.discount ?? 0, s.incentiveAmount ?? 0, s.netAmount ?? 0, s.isIncentivePaid ? 'Paid' : 'Unpaid', s.utrNumber || '']);
                    const header = ['No.', 'Coupon Code', 'Customer', 'Date', 'Amount', 'Discount', 'Incentive', 'Net Amt', 'Incentive Status', 'UTR No'];
                    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `agent_${agentId}_transactions.csv`; a.click();
                  }}
                  style={{ padding: '0.4rem 0.9rem', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8125rem' }}
                >
                  Export CSV
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['No.', 'Coupon Code', 'Booking Date', 'Customer', 'Amount', 'Discount', 'Incentive Amt', 'Net Amt', 'Cust Amt', 'Incentive Status', 'UTR No', 'Paid Date', 'Action'].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingStatements ? (
                      <tr><td colSpan={13} style={{ ...tdStyle, textAlign: 'center', padding: '1.5rem', color: '#999' }}>Loading statements...</td></tr>
                    ) : statements.length === 0 ? (
                      <tr><td colSpan={13} style={{ ...tdStyle, textAlign: 'center', padding: '1.5rem', color: '#9ca3af' }}>No transactions found</td></tr>
                    ) : (
                      statements.map((s, idx) => (
                        <tr key={s._id} onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#fafafa'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}>
                          <td style={tdStyle}>{(stmtPage - 1) * stmtPerPage + idx + 1}</td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>{s.couponCode || '-'}</td>
                          <td style={tdStyle}>{s.bookingDate ? new Date(s.bookingDate).toLocaleDateString('en-IN') : '-'}</td>
                          <td style={tdStyle}>{s.customerName || '-'}</td>
                          <td style={tdStyle}>{s.amount != null ? `₹${s.amount.toLocaleString('en-IN')}` : '-'}</td>
                          <td style={tdStyle}>{s.discount != null ? `₹${s.discount.toLocaleString('en-IN')}` : '-'}</td>
                          <td style={tdStyle}>{s.incentiveAmount != null ? `₹${s.incentiveAmount.toLocaleString('en-IN')}` : '-'}</td>
                          <td style={tdStyle}>{s.netAmount != null ? `₹${s.netAmount.toLocaleString('en-IN')}` : '-'}</td>
                          <td style={tdStyle}>{s.customerAmount != null ? `₹${s.customerAmount.toLocaleString('en-IN')}` : '-'}</td>
                          <td style={tdStyle}>
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: s.isIncentivePaid ? '#d1fae5' : '#fef3c7', color: s.isIncentivePaid ? '#065f46' : '#92400e' }}>
                              {s.isIncentivePaid ? 'Paid' : 'Unpaid'}
                            </span>
                          </td>
                          <td style={tdStyle}>{s.utrNumber || '-'}</td>
                          <td style={tdStyle}>{s.incentivePaidDate ? new Date(s.incentivePaidDate).toLocaleDateString('en-IN') : '-'}</td>
                          <td style={tdStyle}>
                            {!s.isIncentivePaid && (
                              <button
                                onClick={() => openIncentiveModal(s)}
                                style={{ padding: '0.3rem 0.7rem', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}
                              >
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #f0f0f0' }}>
                <Pagination currentPage={stmtPage} totalPages={stmtTotalPages} totalItems={stmtTotal} itemsPerPage={stmtPerPage} onPageChange={(p) => setStmtPage(p)} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Incentive Paid Modal ──────────────────────────────────── */}
      <Modal isOpen={showIncentiveModal} onClose={() => setShowIncentiveModal(false)} title="Mark Incentive as Paid" size="sm">
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>UTR Number *</label>
            <input
              type="text" placeholder="Enter UTR number" value={utrInput}
              onChange={(e) => setUtrInput(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Incentive Paid Date *</label>
            <input
              type="date" value={paidDateInput}
              onChange={(e) => setPaidDateInput(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          {incentiveError && <p style={{ color: '#dc3545', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{incentiveError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setShowIncentiveModal(false)} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
            <button onClick={handleMarkIncentivePaid} disabled={savingIncentive} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: savingIncentive ? 0.7 : 1 }}>
              {savingIncentive ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
