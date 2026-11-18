'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  createdAt?: string;
  properties?: string[];
  inspections?: string[];
}

type UserForm = {
  name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
};

const EMPTY_FORM: UserForm = { name: '', email: '', phone: '', city: '', status: 'Active' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function AvatarCircle({ name, size = 36 }: { name: string; size?: number }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        backgroundColor: '#0066cc', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

function thisMonthCount(users: User[]): number {
  const now = new Date();
  return users.filter((u) => {
    if (!u.createdAt) return false;
    const d = new Date(u.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [addForm, setAddForm] = useState<UserForm>({ ...EMPTY_FORM });
  const [editForm, setEditForm] = useState<UserForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.status === 401 || !res.ok) { router.push('/login'); return; }
        const data = await res.json();
        if (data.status && data.data) { setAdminUser(data.data); setAuthChecked(true); }
        else router.push('/login');
      } catch { router.push('/login'); }
    };
    checkAuth();
  }, [router]);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(itemsPerPage),
        page: String(currentPage),
        ...(search && { search }),
      });
      const res = await fetch(`/api/user-management?${params}`);
      const data = await res.json();
      if (data.status) {
        setUsers(data.data || []);
        const total = data.total ?? 0;
        setTotalItems(total);
        setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
      }
    } catch (err) {
      console.error('fetchUsers error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => {
    if (!authChecked) return;
    fetchUsers();
  }, [authChecked, fetchUsers]);

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const activeUsers = users.filter((u) => u.status === 'Active').length;
  const newThisMonth = thisMonthCount(users);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSearch = () => { setSearch(searchInput); setCurrentPage(1); };
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSearch(); };

  const openAdd = () => { setAddForm({ ...EMPTY_FORM }); setFormError(''); setShowAddModal(true); };

  const openEdit = (u: User) => {
    setSelectedUser(u);
    setEditForm({ name: u.name || '', email: u.email || '', phone: u.phone || '', city: u.city || '', status: u.status || 'Active' });
    setFormError('');
    setShowEditModal(true);
  };

  const openDelete = (u: User) => { setSelectedUser(u); setShowDeleteDialog(true); };

  const openView = (u: User) => { setSelectedUser(u); setShowViewModal(true); };

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) { setFormError('Name and email are required.'); return; }
    setSaving(true); setFormError('');
    try {
      const res = await fetch('/api/user-management', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) });
      const data = await res.json();
      if (!data.status) { setFormError(data.message || 'Failed to add user'); return; }
      setShowAddModal(false);
      fetchUsers();
    } catch { setFormError('Network error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) { setFormError('Name and email are required.'); return; }
    if (!selectedUser) return;
    setSaving(true); setFormError('');
    try {
      const res = await fetch(`/api/user-management/${selectedUser._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      const data = await res.json();
      if (!data.status) { setFormError(data.message || 'Failed to update user'); return; }
      setShowEditModal(false);
      fetchUsers();
    } catch { setFormError('Network error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await fetch(`/api/user-management/${selectedUser._id}`, { method: 'DELETE' });
      setShowDeleteDialog(false);
      fetchUsers();
    } catch { /* silent */ }
  };

  const handleToggleStatus = async (u: User) => {
    const newStatus = u.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await fetch(`/api/user-management/${u._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      setUsers((prev) => prev.map((x) => x._id === u._id ? { ...x, status: newStatus } : x));
    } catch { /* silent */ }
  };

  // ---------------------------------------------------------------------------
  // Guard
  // ---------------------------------------------------------------------------

  if (!authChecked || !adminUser) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading...</p></div>;
  }

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
    borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box',
  };

  const thStyle: React.CSSProperties = {
    padding: '0.875rem 1rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0',
    fontSize: '0.8125rem', fontWeight: 600, color: '#444', whiteSpace: 'nowrap', backgroundColor: '#f5f5f5',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.875rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid #f0f0f0',
    verticalAlign: 'middle', color: '#374151',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '0.3rem 0.7rem', backgroundColor: '#0066cc', color: '#fff',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8125rem',
  };

  const btnWarning: React.CSSProperties = {
    padding: '0.3rem 0.7rem', backgroundColor: '#fd7e14', color: '#fff',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8125rem',
  };

  const btnDanger: React.CSSProperties = {
    padding: '0.3rem 0.7rem', backgroundColor: '#dc3545', color: '#fff',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8125rem',
  };

  const btnSuccess: React.CSSProperties = {
    padding: '0.3rem 0.7rem', backgroundColor: '#28a745', color: '#fff',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8125rem',
  };

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' };
  const fieldStyle: React.CSSProperties = { marginBottom: '1rem' };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Layout user={adminUser}>
      <div style={{ padding: '1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>User Management</h1>
          <button
            onClick={openAdd}
            style={{ padding: '0.625rem 1.25rem', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
          >
            + Add User
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Users', value: totalItems, color: '#0066cc' },
            { label: 'Active Users', value: loading ? '...' : activeUsers, color: '#28a745' },
            { label: 'New This Month', value: loading ? '...' : newThisMonth, color: '#6f42c1' },
          ].map((card) => (
            <div key={card.label} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${card.color}` }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>{card.label}</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="text" placeholder="Search by name, email or phone..."
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={{ ...inputStyle, flex: 1, width: 'auto' }}
            />
            <button onClick={handleSearch} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>Search</button>
            {search && (
              <button onClick={() => { setSearchInput(''); setSearch(''); setCurrentPage(1); }} style={{ padding: '0.625rem 1rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>Clear</button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>No.</th>
                  <th style={thStyle}>Avatar</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>City</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Toggle</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: '#999', padding: '2rem' }}>Loading users...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: '#999', padding: '2rem' }}>No users found</td></tr>
                ) : (
                  users.map((u, index) => (
                    <tr key={u._id} onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#fafafa'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}>
                      <td style={tdStyle}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td style={tdStyle}><AvatarCircle name={u.name || u.email || '?'} size={36} /></td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{u.name || '-'}</td>
                      <td style={tdStyle}>{u.email || '-'}</td>
                      <td style={tdStyle}>{u.phone || '-'}</td>
                      <td style={tdStyle}>{u.city || '-'}</td>
                      <td style={tdStyle}><StatusBadge status={u.status || 'Active'} /></td>
                      <td style={tdStyle}>
                        {/* Toggle switch */}
                        <div
                          onClick={() => handleToggleStatus(u)}
                          style={{
                            width: '42px', height: '22px', borderRadius: '11px', cursor: 'pointer', position: 'relative',
                            backgroundColor: u.status === 'Active' ? '#28a745' : '#ccc', transition: 'background-color 0.2s',
                          }}
                        >
                          <div style={{
                            position: 'absolute', top: '2px', left: u.status === 'Active' ? '22px' : '2px',
                            width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff',
                            transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          }} />
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => openView(u)} style={btnPrimary} title="View">👁</button>
                          <button onClick={() => openEdit(u)} style={btnWarning} title="Edit">✏️</button>
                          <button onClick={() => openDelete(u)} style={btnDanger} title="Delete">🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #f0f0f0' }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={(page) => setCurrentPage(page)} />
          </div>
        </div>
      </div>

      {/* ── ADD USER MODAL ─────────────────────────────────────── */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New User" size="md">
        <div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Full Name *</label>
            <input style={inputStyle} value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Enter full name" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email *</label>
            <input style={inputStyle} type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} placeholder="Enter email" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} placeholder="Enter phone number" maxLength={13} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={addForm.city} onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))} placeholder="Enter city" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={addForm.status} onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          {formError && <p style={{ color: '#dc3545', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{formError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setShowAddModal(false)} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
            <button onClick={handleAdd} disabled={saving} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      {/* ── EDIT USER MODAL ────────────────────────────────────── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User" size="md">
        <div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Full Name *</label>
            <input style={inputStyle} value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Enter full name" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email *</label>
            <input style={inputStyle} type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} placeholder="Enter email" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} placeholder="Enter phone number" maxLength={13} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} placeholder="Enter city" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          {formError && <p style={{ color: '#dc3545', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{formError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setShowEditModal(false)} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
            <button onClick={handleEdit} disabled={saving} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Update'}</button>
          </div>
        </div>
      </Modal>

      {/* ── VIEW USER MODAL ────────────────────────────────────── */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="User Details" size="md">
        {selectedUser && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <AvatarCircle name={selectedUser.name || selectedUser.email || '?'} size={60} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{selectedUser.name || '-'}</div>
                <StatusBadge status={selectedUser.status || 'Active'} />
              </div>
            </div>
            {[
              { label: 'Email', value: selectedUser.email },
              { label: 'Phone', value: selectedUser.phone },
              { label: 'City', value: selectedUser.city },
              { label: 'Total Properties', value: (selectedUser.properties?.length ?? 0).toString() },
              { label: 'Member Since', value: selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : '-' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', padding: '0.625rem 0' }}>
                <span style={{ width: '160px', color: '#666', fontSize: '0.875rem', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{value || '-'}</span>
              </div>
            ))}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => { setShowViewModal(false); openEdit(selectedUser); }} style={{ ...btnWarning, padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}>Edit</button>
              <button onClick={() => setShowViewModal(false)} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── DELETE CONFIRM ─────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete User"
        message={`Are you sure you want to delete "${selectedUser?.name || selectedUser?.email}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteDialog(false)}
      />
    </Layout>
  );
}
