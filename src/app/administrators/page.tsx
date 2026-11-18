'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/StatusBadge';

const ITEMS_PER_PAGE = 10;

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  padding: '1.5rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '0.25rem',
};

const primaryBtnStyle: React.CSSProperties = {
  backgroundColor: '#0066cc',
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
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  padding: '0.5rem 1rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  padding: '0.25rem 0.5rem',
  cursor: 'pointer',
  fontSize: '0.9rem',
  lineHeight: 1,
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#374151',
  backgroundColor: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: '#374151',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'middle',
};

interface AddForm {
  name: string;
  email: string;
  password: string;
  role: string;
}

interface EditForm {
  name: string;
  email: string;
  role: string;
  status: string;
}

interface PasswordForm {
  newPassword: string;
  confirmPassword: string;
}

export default function AdministratorsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);

  const [addForm, setAddForm] = useState<AddForm>({ name: '', email: '', password: '', role: 'Admin' });
  const [editForm, setEditForm] = useState<EditForm>({ name: '', email: '', role: 'Admin', status: 'Enable' });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({ newPassword: '', confirmPassword: '' });

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

  // Fetch admins
  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(ITEMS_PER_PAGE),
        page: String(currentPage),
        ...(search && { like: search }),
      });
      const res = await fetch(`/api/admin/list?${params}`);
      const data = await res.json();
      if (data.status) {
        setAdmins(data.data || []);
        const total = data.totalResult ?? 0;
        setTotalItems(total);
        setTotalPages(Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)));
      } else {
        // Admin list returns status: false when empty — handle gracefully
        setAdmins([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => { fetchUser(); }, []);
  useEffect(() => { if (authChecked) fetchAdmins(); }, [authChecked, fetchAdmins]);

  const handleSearch = () => {
    setSearch(searchInput);
    setCurrentPage(1);
  };

  // Add admin
  const handleAddSubmit = async () => {
    setFormError('');
    const { name, email, password, role } = addForm;
    if (!name.trim() || !email.trim() || !password || !role) {
      setFormError('Please fill in all required fields.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/debug/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (data.status) {
        setShowAddModal(false);
        setAddForm({ name: '', email: '', password: '', role: 'Admin' });
        fetchAdmins();
      } else {
        setFormError(data.message || 'Failed to add admin.');
      }
    } catch {
      setFormError('An error occurred. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit admin
  const openEditModal = (admin: any) => {
    setSelectedAdmin(admin);
    setEditForm({
      name: admin.name || '',
      email: admin.email || '',
      role: admin.role || 'Admin',
      status: admin.status || 'Enable',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    setFormError('');
    if (!selectedAdmin) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/${selectedAdmin._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.status) {
        setShowEditModal(false);
        fetchAdmins();
      } else {
        setFormError(data.message || 'Failed to update admin.');
      }
    } catch {
      setFormError('An error occurred. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset password
  const openPasswordModal = (admin: any) => {
    setSelectedAdmin(admin);
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
    if (!selectedAdmin) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/${selectedAdmin._id}`, {
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
  const openDeleteDialog = (admin: any) => {
    setSelectedAdmin(admin);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!selectedAdmin) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/${selectedAdmin._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Delete' }),
      });
      const data = await res.json();
      if (data.status) {
        setShowDeleteDialog(false);
        fetchAdmins();
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!authChecked || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Derived stats
  const totalSuperAdmins = admins.filter(a => a.role === 'SuperAdmin').length;
  const totalRegularAdmins = admins.filter(a => a.role === 'Admin').length;
  const totalActive = admins.filter(a => a.status === 'Enable').length;

  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>

        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Administrators</h1>
          <button
            style={primaryBtnStyle}
            onClick={() => { setFormError(''); setAddForm({ name: '', email: '', password: '', role: 'Admin' }); setShowAddModal(true); }}
          >
            + Add Admin
          </button>
        </div>

        {/* Filters */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <label style={labelStyle}>Search</label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                style={inputStyle}
              />
            </div>
            <button style={primaryBtnStyle} onClick={handleSearch}>Search</button>
            {search && (
              <button
                style={{ ...outlineBtnStyle, color: '#6b7280', borderColor: '#6b7280' }}
                onClick={() => { setSearch(''); setSearchInput(''); setCurrentPage(1); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ ...cardStyle, borderLeft: '4px solid #0066cc', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.4rem' }}>Super Admins</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0066cc' }}>{totalSuperAdmins}</div>
          </div>
          <div style={{ ...cardStyle, borderLeft: '4px solid #6f42c1', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.4rem' }}>Admins</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#6f42c1' }}>{totalRegularAdmins}</div>
          </div>
          <div style={{ ...cardStyle, borderLeft: '4px solid #28a745', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.4rem' }}>Active Admins</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#28a745' }}>{totalActive}</div>
          </div>
        </div>

        {/* Table */}
        <div style={cardStyle}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>No.</th>
                  <th style={thStyle}>Avatar</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: '2rem' }}>
                      Loading...
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                      No administrators found
                    </td>
                  </tr>
                ) : (
                  admins.map((admin, idx) => (
                    <tr key={admin._id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={tdStyle}>{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                      <td style={tdStyle}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          backgroundColor: admin.role === 'SuperAdmin' ? '#6f42c1' : '#0066cc',
                          color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 600, fontSize: '1rem',
                        }}>
                          {(admin.name?.[0] || admin.email?.[0] || '?').toUpperCase()}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{admin.name || '-'}</td>
                      <td style={tdStyle}>{admin.email}</td>
                      <td style={tdStyle}>
                        <StatusBadge status={admin.role || 'Admin'} />
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge status={admin.status || 'Enable'} />
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            style={{ ...iconBtnStyle, color: '#6b7280' }}
                            title="Reset Password"
                            onClick={() => openPasswordModal(admin)}
                          >
                            🔒
                          </button>
                          <button
                            style={{ ...iconBtnStyle, color: '#856404' }}
                            title="Edit"
                            onClick={() => openEditModal(admin)}
                          >
                            ✏️
                          </button>
                          <button
                            style={{ ...iconBtnStyle, color: '#dc3545' }}
                            title="Delete"
                            onClick={() => openDeleteDialog(admin)}
                          >
                            🗑
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>

      {/* ===== ADD ADMIN MODAL ===== */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Administrator" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Name <span style={{ color: '#dc3545' }}>*</span></label>
            <input style={inputStyle} value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
          </div>
          <div>
            <label style={labelStyle}>Email <span style={{ color: '#dc3545' }}>*</span></label>
            <input type="email" style={inputStyle} value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" />
          </div>
          <div>
            <label style={labelStyle}>Password <span style={{ color: '#dc3545' }}>*</span></label>
            <input type="password" style={inputStyle} value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" />
          </div>
          <div>
            <label style={labelStyle}>Role <span style={{ color: '#dc3545' }}>*</span></label>
            <select style={inputStyle} value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}>
              <option value="Admin">Admin</option>
              <option value="SuperAdmin">SuperAdmin</option>
            </select>
          </div>
        </div>
        {formError && <p style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.75rem' }}>{formError}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button style={outlineBtnStyle} onClick={() => setShowAddModal(false)}>Cancel</button>
          <button style={primaryBtnStyle} onClick={handleAddSubmit} disabled={actionLoading}>
            {actionLoading ? 'Saving...' : 'Add Admin'}
          </button>
        </div>
      </Modal>

      {/* ===== EDIT ADMIN MODAL ===== */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Administrator" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" style={inputStyle} value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <select style={inputStyle} value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
              <option value="Admin">Admin</option>
              <option value="SuperAdmin">SuperAdmin</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
              <option value="Enable">Enable</option>
              <option value="Disable">Disable</option>
            </select>
          </div>
        </div>
        {formError && <p style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.75rem' }}>{formError}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button style={outlineBtnStyle} onClick={() => setShowEditModal(false)}>Cancel</button>
          <button style={primaryBtnStyle} onClick={handleEditSubmit} disabled={actionLoading}>
            {actionLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* ===== RESET PASSWORD MODAL ===== */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Reset Password" size="sm">
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: 0 }}>
          Resetting password for <strong>{selectedAdmin?.name || selectedAdmin?.email}</strong>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>New Password</label>
            <input type="password" style={inputStyle} value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Enter new password" />
          </div>
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input type="password" style={inputStyle} value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Confirm new password" />
          </div>
        </div>
        {formError && <p style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.75rem' }}>{formError}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button style={outlineBtnStyle} onClick={() => setShowPasswordModal(false)}>Cancel</button>
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
        title="Delete Administrator"
        message={`Are you sure you want to delete "${selectedAdmin?.name || selectedAdmin?.email}"? This action cannot be undone.`}
        loading={deleteLoading}
      />
    </Layout>
  );
}
