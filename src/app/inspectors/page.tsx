'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import Pagination from '@/components/Pagination';

const ITEMS_PER_PAGE = 10;

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  padding: '1.5rem',
};

const inputStyle: React.CSSProperties = {
  padding: '0.3rem 0.6rem',
  border: '1px solid #ced4da',
  borderRadius: '4px',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
  height: '32px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '0.25rem',
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryBtnStyle: React.CSSProperties = {
  backgroundColor: '#0054A8',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  padding: '0.5rem 1rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
};

const outlineBtnStyle: React.CSSProperties = {
  backgroundColor: 'white',
  color: '#0054A8',
  border: '1px solid #0054A8',
  borderRadius: '4px',
  padding: '0.375rem 0.75rem',
  fontSize: '0.8rem',
  fontWeight: 500,
  cursor: 'pointer',
};

const warningBtnStyle: React.CSSProperties = {
  backgroundColor: '#FDB93F',
  color: '#212529',
  border: 'none',
  borderRadius: '4px',
  padding: '0.4rem 1rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const leaveBtnStyle: React.CSSProperties = {
  backgroundColor: '#f0ad4e',
  color: '#fff',
  borderRadius: '20px',
  padding: '4px 12px',
  fontSize: '13px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

const thStyle: React.CSSProperties = {
  padding: '10px 5px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: '#333333',
  backgroundColor: '#FDB93F',
  borderBottom: '2px solid #dee2e6',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 5px',
  fontSize: '12px',
  color: '#333333',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'middle',
};

type RoleFilter = 'Both' | 'Inspector' | 'Validator';

interface AddForm {
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  role: string;
  password: string;
  confirmPassword: string;
}

interface EditForm {
  name: string;
  city: string;
  state: string;
  pincode: string;
  role: string;
  status: string;
}

interface PasswordForm {
  newPassword: string;
  confirmPassword: string;
}

interface LeaveForm {
  startDate: string;
  endDate: string;
  reason: string;
}

export default function InspectorsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [inspectors, setInspectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('Both');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [selectedInspector, setSelectedInspector] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);

  const [addForm, setAddForm] = useState<AddForm>({
    name: '', phone: '', email: '', city: '', state: '', pincode: '',
    role: 'Inspector', password: '', confirmPassword: '',
  });
  const [editForm, setEditForm] = useState<EditForm>({
    name: '', city: '', state: '', pincode: '', role: 'Inspector', status: 'Enable',
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({ newPassword: '', confirmPassword: '' });
  const [leaveForm, setLeaveForm] = useState<LeaveForm>({ startDate: '', endDate: '', reason: '' });

  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Auth check
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/admin/me');
      if (!res.ok) { router.push('/login'); return; }
      const data = await res.json();
      if (data.status && data.data) { setUser(data.data); setAuthChecked(true); }
      else router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  // Fetch inspectors
  const fetchInspectors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(ITEMS_PER_PAGE),
        page: String(currentPage),
        ...(search && { search }),
        ...(roleFilter !== 'Both' && { role: roleFilter }),
      });
      const res = await fetch(`/api/inspector?${params}`);
      const data = await res.json();
      if (data.status) {
        setInspectors(data.data || []);
        const total = data.total ?? data.totalResult ?? 0;
        setTotalItems(total);
        setTotalPages(Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)));
      }
    } catch (err) {
      console.error('Error fetching inspectors:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, roleFilter]);

  useEffect(() => { fetchUser(); }, []);
  useEffect(() => { if (authChecked) fetchInspectors(); }, [authChecked, fetchInspectors]);

  // Handlers
  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    setSearch(val);
    setCurrentPage(1);
  };

  const handleRoleFilter = (val: RoleFilter) => {
    setRoleFilter(val);
    setCurrentPage(1);
  };

  const handleToggleStatus = async (insp: any) => {
    const newStatus = insp.status === 'Enable' ? 'Disable' : 'Enable';
    try {
      const res = await fetch(`/api/inspector/${insp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.status) {
        setInspectors(prev => prev.map(i => i._id === insp._id ? { ...i, status: newStatus } : i));
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  // Add inspector
  const handleAddSubmit = async () => {
    setFormError('');
    const { name, phone, email, role, password, confirmPassword } = addForm;
    if (!name.trim() || !phone.trim() || !email.trim() || !role || !password) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/inspector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          phone: addForm.phone,
          email: addForm.email,
          city: addForm.city,
          state: addForm.state,
          pincode: addForm.pincode,
          role: addForm.role,
          password: addForm.password,
        }),
      });
      const data = await res.json();
      if (data.status) {
        setShowAddModal(false);
        setAddForm({ name: '', phone: '', email: '', city: '', state: '', pincode: '', role: 'Inspector', password: '', confirmPassword: '' });
        fetchInspectors();
      } else {
        setFormError(data.message || 'Failed to add user.');
      }
    } catch {
      setFormError('An error occurred. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit inspector
  const openEditModal = (insp: any) => {
    setSelectedInspector(insp);
    setEditForm({
      name: insp.name || '',
      city: insp.city || '',
      state: insp.state || '',
      pincode: insp.pincode || '',
      role: insp.role || 'Inspector',
      status: insp.status || 'Enable',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    setFormError('');
    if (!selectedInspector) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inspector/${selectedInspector._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.status) {
        setShowEditModal(false);
        fetchInspectors();
      } else {
        setFormError(data.message || 'Failed to update user.');
      }
    } catch {
      setFormError('An error occurred. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Password reset
  const openPasswordModal = (insp: any) => {
    setSelectedInspector(insp);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setFormError('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    setFormError('');
    if (!passwordForm.newPassword) {
      setFormError('Please enter a new password.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (!selectedInspector) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inspector/${selectedInspector._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordForm.newPassword }),
      });
      const data = await res.json();
      if (data.status) {
        setShowPasswordModal(false);
      } else {
        setFormError(data.message || 'Failed to reset password.');
      }
    } catch {
      setFormError('An error occurred. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete
  const openDeleteDialog = (insp: any) => {
    setSelectedInspector(insp);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!selectedInspector) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/inspector/${selectedInspector._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Delete' }),
      });
      const data = await res.json();
      if (data.status) {
        setShowDeleteDialog(false);
        fetchInspectors();
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Leave management
  const openLeaveModal = async (insp: any) => {
    setSelectedInspector(insp);
    setLeaveForm({ startDate: '', endDate: '', reason: '' });
    setFormError('');
    setLeaves([]);
    setShowLeaveModal(true);
    try {
      const res = await fetch(`/api/inspector/leave?inspectorId=${insp._id}`);
      const data = await res.json();
      if (data.status) setLeaves(data.data || []);
    } catch (err) {
      console.error('Error fetching leaves:', err);
    }
  };

  const handleAddLeave = async () => {
    setFormError('');
    if (!leaveForm.startDate || !leaveForm.endDate) {
      setFormError('Start date and end date are required.');
      return;
    }
    if (!selectedInspector) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/inspector/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspectorId: selectedInspector._id,
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          reason: leaveForm.reason,
        }),
      });
      const data = await res.json();
      if (data.status) {
        setLeaveForm({ startDate: '', endDate: '', reason: '' });
        // Refresh leaves
        const refreshRes = await fetch(`/api/inspector/leave?inspectorId=${selectedInspector._id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.status) setLeaves(refreshData.data || []);
      } else {
        setFormError(data.message || 'Failed to add leave.');
      }
    } catch {
      setFormError('An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!authChecked || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  const startEntry = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntry = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>

        {/* Breadcrumb / Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '16px', fontWeight: 500, fontFamily: 'Inter, sans-serif', color: '#6c757d' }}>Inspector/Validator</span>
          </div>
          <button
            style={warningBtnStyle}
            onClick={() => {
              setFormError('');
              setAddForm({ name: '', phone: '', email: '', city: '', state: '', pincode: '', role: 'Inspector', password: '', confirmPassword: '' });
              setShowAddModal(true);
            }}
          >
            Add
          </button>
        </div>

        {/* Main Table Card */}
        <div style={cardStyle}>

          {/* Card header row: title left, filters right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#212529' }}>
              Inspector / Validator List
            </h5>

            {/* dataTables_filter style: right-aligned, no labels */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                value={roleFilter}
                onChange={e => handleRoleFilter(e.target.value as RoleFilter)}
                style={{ ...inputStyle, width: '180px' }}
              >
                <option value="Both">Both Inspector/Validator</option>
                <option value="Inspector">Inspector</option>
                <option value="Validator">Validator</option>
              </select>
              <input
                type="text"
                placeholder="Search.."
                value={searchInput}
                onChange={e => handleSearchInput(e.target.value)}
                style={{ ...inputStyle, width: '200px' }}
              />
              {(search || roleFilter !== 'Both') && (
                <button
                  style={{ ...inputStyle, backgroundColor: '#f8f9fa', color: '#6b7280', border: '1px solid #ced4da', cursor: 'pointer', width: 'auto', padding: '0.3rem 0.75rem' }}
                  onClick={() => { setSearch(''); setSearchInput(''); setRoleFilter('Both'); setCurrentPage(1); }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '960px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>No.</th>
                  <th style={thStyle}>Picture</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Phone Number</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>City</th>
                  <th style={thStyle}>State</th>
                  <th style={thStyle}>Pincode</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Leave</th>
                  <th style={thStyle}>Active / Inactive</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} style={{ ...tdStyle, textAlign: 'center', padding: '2rem' }}>
                      Loading...
                    </td>
                  </tr>
                ) : inspectors.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ ...tdStyle, textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  inspectors.map((insp, idx) => {
                    const displayName = insp.name || insp.userName || '-';
                    const displayEmail = insp.email && insp.email !== '' ? insp.email : '--';
                    const rawPincode = insp.pincode;
                    const displayPincode = (!rawPincode || rawPincode === 'null') ? '--' : rawPincode;

                    return (
                      <tr key={insp._id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                        <td style={tdStyle}>{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td style={tdStyle}>
                          {insp.profileImage ? (
                            <img
                              src={insp.profileImage}
                              alt={displayName}
                              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{
                              width: '38px', height: '38px', borderRadius: '50%',
                              backgroundColor: '#0054A8', color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 600, fontSize: '0.95rem',
                            }}>
                              {(displayName?.[0] || '?').toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{displayName}</td>
                        <td style={tdStyle}>{insp.phone || '--'}</td>
                        <td style={tdStyle}>{displayEmail}</td>
                        <td style={tdStyle}>{insp.city || '--'}</td>
                        <td style={tdStyle}>{insp.state || '--'}</td>
                        <td style={tdStyle}>{displayPincode}</td>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            backgroundColor: insp.role === 'Validator' ? '#e9d5ff' : '#dbeafe',
                            color: insp.role === 'Validator' ? '#6d28d9' : '#1d4ed8',
                          }}>
                            {insp.role || 'Inspector'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <button style={leaveBtnStyle} onClick={() => openLeaveModal(insp)}>
                            Record leave
                          </button>
                        </td>
                        <td style={tdStyle}>
                          <div
                            onClick={() => handleToggleStatus(insp)}
                            style={{
                              width: '44px', height: '24px', borderRadius: '12px',
                              backgroundColor: insp.status === 'Enable' ? '#28a745' : '#ccc',
                              cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s',
                            }}
                            title={insp.status === 'Enable' ? 'Click to disable' : 'Click to enable'}
                          >
                            <div style={{
                              width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white',
                              position: 'absolute', top: '2px',
                              left: insp.status === 'Enable' ? '22px' : '2px',
                              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            }} />
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            {/* Reset Password */}
                            <button
                              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}
                              title="Reset Password"
                              onClick={() => openPasswordModal(insp)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            </button>
                            {/* View Details */}
                            <button
                              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#0054A8', display: 'flex', alignItems: 'center' }}
                              title="View Details"
                              onClick={() => router.push(`/inspectors/${insp._id}`)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            {/* Edit */}
                            <button
                              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#856404', display: 'flex', alignItems: 'center' }}
                              title="Edit"
                              onClick={() => openEditModal(insp)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            {/* Delete */}
                            <button
                              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#dc3545', display: 'flex', alignItems: 'center' }}
                              title="Delete"
                              onClick={() => openDeleteDialog(insp)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer: "Showing X to Y of Z entries" left, controls right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
              {totalItems === 0
                ? 'No entries found'
                : `Showing from ${startEntry} to ${endEntry} of ${totalItems} entries`}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>
      </div>

      {/* ===== ADD MODAL ===== */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Inspector/Validator" size="lg">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Name <span style={{ color: '#dc3545' }}>*</span></label>
            <input style={modalInputStyle} value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
          </div>
          <div>
            <label style={labelStyle}>Phone <span style={{ color: '#dc3545' }}>*</span></label>
            <input style={modalInputStyle} value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
          </div>
          <div>
            <label style={labelStyle}>Email <span style={{ color: '#dc3545' }}>*</span></label>
            <input type="email" style={modalInputStyle} value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" />
          </div>
          <div>
            <label style={labelStyle}>Role <span style={{ color: '#dc3545' }}>*</span></label>
            <select style={modalInputStyle} value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}>
              <option value="Inspector">Inspector</option>
              <option value="Validator">Validator</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input style={modalInputStyle} value={addForm.city} onChange={e => setAddForm(f => ({ ...f, city: e.target.value }))} placeholder="City" />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <input style={modalInputStyle} value={addForm.state} onChange={e => setAddForm(f => ({ ...f, state: e.target.value }))} placeholder="State" />
          </div>
          <div>
            <label style={labelStyle}>Pincode</label>
            <input style={modalInputStyle} value={addForm.pincode} onChange={e => setAddForm(f => ({ ...f, pincode: e.target.value }))} placeholder="Pincode" />
          </div>
          <div />
          <div>
            <label style={labelStyle}>Password <span style={{ color: '#dc3545' }}>*</span></label>
            <input type="password" style={modalInputStyle} value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" />
          </div>
          <div>
            <label style={labelStyle}>Confirm Password <span style={{ color: '#dc3545' }}>*</span></label>
            <input type="password" style={modalInputStyle} value={addForm.confirmPassword} onChange={e => setAddForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Confirm password" />
          </div>
        </div>
        {formError && <p style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.75rem' }}>{formError}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button style={{ ...outlineBtnStyle, color: '#374151', borderColor: '#d1d5db', padding: '0.5rem 1rem' }} onClick={() => setShowAddModal(false)}>Cancel</button>
          <button style={primaryBtnStyle} onClick={handleAddSubmit} disabled={actionLoading}>
            {actionLoading ? 'Saving...' : 'Add User'}
          </button>
        </div>
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User" size="md">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input style={modalInputStyle} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <select style={modalInputStyle} value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
              <option value="Inspector">Inspector</option>
              <option value="Validator">Validator</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input style={modalInputStyle} value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <input style={modalInputStyle} value={editForm.state} onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Pincode</label>
            <input style={modalInputStyle} value={editForm.pincode} onChange={e => setEditForm(f => ({ ...f, pincode: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={modalInputStyle} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
              <option value="Enable">Enable</option>
              <option value="Disable">Disable</option>
            </select>
          </div>
        </div>
        {formError && <p style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.75rem' }}>{formError}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button style={{ ...outlineBtnStyle, color: '#374151', borderColor: '#d1d5db', padding: '0.5rem 1rem' }} onClick={() => setShowEditModal(false)}>Cancel</button>
          <button style={primaryBtnStyle} onClick={handleEditSubmit} disabled={actionLoading}>
            {actionLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* ===== RESET PASSWORD MODAL ===== */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Reset Password" size="sm">
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: 0 }}>
          Resetting password for <strong>{selectedInspector?.name}</strong>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>New Password</label>
            <input type="password" style={modalInputStyle} value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Enter new password" />
          </div>
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input type="password" style={modalInputStyle} value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Confirm new password" />
          </div>
        </div>
        {formError && <p style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.75rem' }}>{formError}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button style={{ ...outlineBtnStyle, color: '#374151', borderColor: '#d1d5db', padding: '0.5rem 1rem' }} onClick={() => setShowPasswordModal(false)}>Cancel</button>
          <button style={primaryBtnStyle} onClick={handlePasswordSubmit} disabled={actionLoading}>
            {actionLoading ? 'Saving...' : 'Reset Password'}
          </button>
        </div>
      </Modal>

      {/* ===== DELETE CONFIRM ===== */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${selectedInspector?.name}"? This action cannot be undone.`}
        loading={deleteLoading}
      />

      {/* ===== LEAVE MODAL ===== */}
      <Modal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Leave Management" size="md">
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem', color: '#111827' }}>
            Add Leave for {selectedInspector?.name}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Start Date <span style={{ color: '#dc3545' }}>*</span></label>
              <input type="date" style={modalInputStyle} value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>End Date <span style={{ color: '#dc3545' }}>*</span></label>
              <input type="date" style={modalInputStyle} value={leaveForm.endDate} onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Reason (optional)</label>
              <input style={modalInputStyle} value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for leave" />
            </div>
          </div>
          {formError && <p style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.75rem' }}>{formError}</p>}
          <div style={{ marginTop: '1rem' }}>
            <button style={primaryBtnStyle} onClick={handleAddLeave} disabled={actionLoading}>
              {actionLoading ? 'Adding...' : 'Add Leave'}
            </button>
          </div>
        </div>

        {/* Existing leaves */}
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem', color: '#111827' }}>Recorded Leaves</h3>
          {leaves.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', textAlign: 'center', padding: '1rem 0' }}>No leaves recorded</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, fontSize: '0.8rem' }}>Start Date</th>
                  <th style={{ ...thStyle, fontSize: '0.8rem' }}>End Date</th>
                  <th style={{ ...thStyle, fontSize: '0.8rem' }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave: any, i: number) => (
                  <tr key={leave._id || i}>
                    <td style={tdStyle}>{leave.startDate ? new Date(leave.startDate).toLocaleDateString() : '-'}</td>
                    <td style={tdStyle}>{leave.endDate ? new Date(leave.endDate).toLocaleDateString() : '-'}</td>
                    <td style={tdStyle}>{leave.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
