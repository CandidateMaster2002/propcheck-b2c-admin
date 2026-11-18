'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Agent {
  _id: string;
  userName?: string;
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
}

interface AgentForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  commissionRate: string;
  status: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  accountNumber: string;
  panNo: string;
  gstNo: string;
  aadharCard: string;
}

const EMPTY_AGENT_FORM: AgentForm = {
  name: '', email: '', phone: '', address: '', state: '', city: '', pincode: '',
  commissionRate: '', status: 'Enable',
  bankName: '', branchName: '', ifscCode: '', accountNumber: '',
  panNo: '', gstNo: '', aadharCard: '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AgentsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const [addForm, setAddForm] = useState<AgentForm>({ ...EMPTY_AGENT_FORM });
  const [editForm, setEditForm] = useState<AgentForm>({ ...EMPTY_AGENT_FORM });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

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
  // Fetch agents
  // ---------------------------------------------------------------------------

  const fetchAgents = useCallback(async (page = currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(itemsPerPage), page: String(page) });
      const res = await fetch(`/api/agents?${params}`);
      const data = await res.json();
      if (data.status) {
        setAgents(data.data || []);
        setTotalItems(data.total ?? 0);
      }
    } catch (err) {
      console.error('fetchAgents error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    if (!authChecked) return;
    fetchAgents(currentPage);
  }, [authChecked, currentPage]);

  // ---------------------------------------------------------------------------
  // Add Agent
  // ---------------------------------------------------------------------------

  const buildAgentPayload = (form: AgentForm) => ({
    userName: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    state: form.state.trim(),
    city: form.city.trim(),
    pincode: form.pincode.trim(),
    commissionRate: form.commissionRate ? parseFloat(form.commissionRate) : 0,
    status: form.status,
    bankDetails: {
      bankName: form.bankName.trim(),
      branchName: form.branchName.trim(),
      ifscCode: form.ifscCode.trim(),
      accountNumber: form.accountNumber.trim(),
    },
    panNo: form.panNo.trim(),
    gstNo: form.gstNo.trim(),
    aadharCard: form.aadharCard.trim(),
  });

  const validateAgentForm = (form: AgentForm): string => {
    if (!form.name.trim()) return 'Name is required.';
    if (!form.phone.trim()) return 'Phone is required.';
    if (!form.email.trim()) return 'Email is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return 'Invalid email format.';
    if (!/^\d{10}$/.test(form.phone)) return 'Phone must be 10 digits.';
    return '';
  };

  const handleAddSubmit = async () => {
    setFormError('');
    const err = validateAgentForm(addForm);
    if (err) { setFormError(err); return; }
    setFormSubmitting(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildAgentPayload(addForm)),
      });
      const data = await res.json();
      if (data.status) {
        setShowAddModal(false);
        setAddForm({ ...EMPTY_AGENT_FORM });
        fetchAgents(1);
        setCurrentPage(1);
      } else {
        setFormError(data.message || 'Failed to add agent.');
      }
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Edit Agent
  // ---------------------------------------------------------------------------

  const openEditModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditForm({
      name: agent.userName || agent.name || '',
      email: agent.email || '',
      phone: agent.phone || '',
      address: agent.address || '',
      state: agent.state || '',
      city: agent.city || '',
      pincode: agent.pincode || '',
      commissionRate: agent.commissionRate != null ? String(agent.commissionRate) : '',
      status: agent.status || 'Enable',
      bankName: agent.bankDetails?.bankName || '',
      branchName: agent.bankDetails?.branchName || '',
      ifscCode: agent.bankDetails?.ifscCode || '',
      accountNumber: agent.bankDetails?.accountNumber || '',
      panNo: agent.panNo || '',
      gstNo: agent.gstNo || '',
      aadharCard: agent.aadharCard || '',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedAgent) return;
    setFormError('');
    const err = validateAgentForm(editForm);
    if (err) { setFormError(err); return; }
    setFormSubmitting(true);
    try {
      const res = await fetch(`/api/agents/${selectedAgent._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildAgentPayload(editForm)),
      });
      const data = await res.json();
      if (data.status) {
        setShowEditModal(false);
        setSelectedAgent(null);
        fetchAgents(currentPage);
      } else {
        setFormError(data.message || 'Failed to update agent.');
      }
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Toggle status (Active / InActive matching old Angular)
  // ---------------------------------------------------------------------------

  const handleToggleStatus = async (agent: Agent, index: number) => {
    const newStatus = agent.status === 'Enable' ? 'Disable' : 'Enable';
    setTogglingId(agent._id);
    try {
      const res = await fetch(`/api/agents/${agent._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.status) {
        setAgents((prev) =>
          prev.map((a) => (a._id === agent._id ? { ...a, status: newStatus } : a))
        );
      }
    } catch (err) {
      console.error('Toggle error:', err);
    } finally {
      setTogglingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Guard
  // ---------------------------------------------------------------------------

  if (!authChecked || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

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
    marginBottom: '0.3rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#374151',
  };

  const thStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    borderBottom: '2px solid #dee2e6',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#495057',
    backgroundColor: '#f8f9fa',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    borderBottom: '1px solid #dee2e6',
    verticalAlign: 'middle',
    color: '#374151',
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Layout user={user}>
      <div>
        {/* Page header — matches old Angular layout */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          {/* Breadcrumb */}
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: '#6c757d' }}>
            <li style={{ color: '#495057', fontWeight: 500 }}>Agents Detail</li>
          </ol>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => { setAddForm({ ...EMPTY_AGENT_FORM }); setFormError(''); setShowAddModal(true); }}
              style={{
                padding: '0.4rem 1rem',
                backgroundColor: '#f0ad4e',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Add New Agent
            </button>
            {/* Excel icon */}
            <a
              href="#"
              title="Download Excel"
              onClick={(e) => e.preventDefault()}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
                <rect width="64" height="64" rx="6" fill="#217346" />
                <text x="10" y="46" fontSize="36" fontWeight="bold" fill="white" fontFamily="Arial">X</text>
              </svg>
            </a>
          </div>
        </div>

        {/* Card with table */}
        <div style={{ backgroundColor: 'white', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '1rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '40px' }}>No.</th>
                  <th style={{ ...thStyle, width: '190px' }}>Full Name</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Email</th>
                  <th style={{ ...thStyle, width: '120px' }}>Status</th>
                  <th style={{ ...thStyle, width: '125px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#999', padding: '2rem' }}>
                      Loading agents...
                    </td>
                  </tr>
                ) : agents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: '2rem' }}>
                      <h4 style={{ margin: 0, color: '#6c757d' }}>No data found!</h4>
                    </td>
                  </tr>
                ) : (
                  agents.map((agent, index) => (
                    <tr
                      key={agent._id}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f8f9fa'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
                    >
                      {/* No. */}
                      <td style={tdStyle}>
                        {currentPage > 1 ? (currentPage - 1) * itemsPerPage + (index + 1) : index + 1}
                      </td>

                      {/* Full Name */}
                      <td style={tdStyle}>{agent.userName || agent.name}</td>

                      {/* Phone */}
                      <td style={tdStyle}>{agent.phone || '-'}</td>

                      {/* Email */}
                      <td style={tdStyle}>{agent.email || '--'}</td>

                      {/* Status toggle */}
                      <td style={tdStyle}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                          <input
                            type="checkbox"
                            checked={agent.status === 'Enable'}
                            onChange={() => handleToggleStatus(agent, index)}
                            disabled={togglingId === agent._id}
                            style={{ display: 'none' }}
                          />
                          <div
                            onClick={() => togglingId !== agent._id && handleToggleStatus(agent, index)}
                            style={{
                              width: '40px', height: '20px', borderRadius: '10px',
                              backgroundColor: agent.status === 'Enable' ? '#4caf50' : '#ccc',
                              position: 'relative', cursor: togglingId === agent._id ? 'not-allowed' : 'pointer',
                              transition: 'background-color 0.2s', opacity: togglingId === agent._id ? 0.6 : 1,
                            }}
                          >
                            <div style={{
                              position: 'absolute', width: '16px', height: '16px', borderRadius: '50%',
                              backgroundColor: 'white', top: '2px',
                              left: agent.status === 'Enable' ? '22px' : '2px',
                              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            }} />
                          </div>
                        </label>
                      </td>

                      {/* Action — view + edit only (matches old Angular) */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          {/* View — eye icon */}
                          <a
                            onClick={() => router.push(`/agents/${agent._id}`)}
                            title="View"
                            style={{ cursor: 'pointer', color: '#495057', fontSize: '1.125rem', lineHeight: 1 }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                            </svg>
                          </a>

                          {/* Edit — pencil icon */}
                          <button
                            onClick={() => openEditModal(agent)}
                            title="Edit"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0054A8', fontSize: '1.125rem', lineHeight: 1, padding: '0 2px' }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '0.5rem 1rem 0.75rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  style={{
                    padding: '0.25rem 0.6rem', border: '1px solid #dee2e6', borderRadius: '3px',
                    cursor: 'pointer', fontSize: '0.8125rem',
                    background: currentPage === pg ? '#0054A8' : '#fff',
                    color: currentPage === pg ? '#fff' : '#333',
                  }}
                >
                  {pg}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Add / Edit Agent Modal (shared)                                   */}
      {/* ----------------------------------------------------------------- */}
      {[
        {
          isOpen: showAddModal,
          onClose: () => { setShowAddModal(false); setFormError(''); },
          title: 'Add New Agent',
          form: addForm,
          setForm: setAddForm as React.Dispatch<React.SetStateAction<AgentForm>>,
          onSubmit: handleAddSubmit,
          submitLabel: 'Save Agent',
          submittingLabel: 'Saving...',
          showStatus: false,
        },
        {
          isOpen: showEditModal,
          onClose: () => { setShowEditModal(false); setFormError(''); setSelectedAgent(null); },
          title: 'Edit Agent',
          form: editForm,
          setForm: setEditForm as React.Dispatch<React.SetStateAction<AgentForm>>,
          onSubmit: handleEditSubmit,
          submitLabel: 'Update Agent',
          submittingLabel: 'Updating...',
          showStatus: true,
        },
      ].map(({ isOpen, onClose, title, form, setForm, onSubmit, submitLabel, submittingLabel, showStatus }) => (
        <Modal key={title} isOpen={isOpen} onClose={onClose} title={title} size="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {formError && (
              <div style={{ backgroundColor: '#ffebee', border: '1px solid #f1aeb5', borderRadius: '4px', padding: '0.75rem', color: '#c62828', fontSize: '0.875rem' }}>
                {formError}
              </div>
            )}

            <p style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Basic Information</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Full Name <span style={{ color: '#dc3545' }}>*</span></label>
                <input type="text" placeholder="Enter full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone <span style={{ color: '#dc3545' }}>*</span></label>
                <input type="tel" placeholder="10-digit number" value={form.phone} maxLength={10} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email <span style={{ color: '#dc3545' }}>*</span></label>
                <input type="email" placeholder="agent@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Commission Rate (%)</label>
                <input type="number" step="0.1" min="0" max="100" placeholder="e.g. 2.5" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <p style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Address</p>
            <div>
              <label style={labelStyle}>Address</label>
              <textarea placeholder="Enter full address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>State</label>
                <input type="text" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>City</label>
                <input type="text" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Pincode</label>
                <input type="text" placeholder="6-digit pincode" value={form.pincode} maxLength={6} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })} style={inputStyle} />
              </div>
            </div>

            <p style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Bank Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Bank Name</label>
                <input type="text" placeholder="e.g. HDFC Bank" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Branch</label>
                <input type="text" placeholder="Branch name" value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>IFSC Code</label>
                <input type="text" placeholder="e.g. HDFC0001234" value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Account No</label>
                <input type="text" placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, '') })} style={inputStyle} />
              </div>
            </div>

            <p style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>KYC Documents</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>PAN No</label>
                <input type="text" placeholder="ABCDE1234F" value={form.panNo} maxLength={10} onChange={(e) => setForm({ ...form, panNo: e.target.value.toUpperCase() })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>GST No</label>
                <input type="text" placeholder="GST number" value={form.gstNo} onChange={(e) => setForm({ ...form, gstNo: e.target.value.toUpperCase() })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Aadhar No</label>
                <input type="text" placeholder="12-digit aadhar" value={form.aadharCard} maxLength={12} onChange={(e) => setForm({ ...form, aadharCard: e.target.value.replace(/\D/g, '') })} style={inputStyle} />
              </div>
            </div>

            {showStatus && (
              <div>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                  <option value="Enable">Enable</option>
                  <option value="Disable">Disable</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={onSubmit}
                disabled={formSubmitting}
                style={{ flex: 1, padding: '0.625rem', backgroundColor: formSubmitting ? '#6ea8d4' : '#0054A8', color: 'white', border: 'none', borderRadius: '4px', cursor: formSubmitting ? 'not-allowed' : 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
              >
                {formSubmitting ? submittingLabel : submitLabel}
              </button>
              <button
                onClick={onClose}
                disabled={formSubmitting}
                style={{ flex: 1, padding: '0.625rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      ))}
    </Layout>
  );
}
