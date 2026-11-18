'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import Pagination from '@/components/Pagination';
import ConfirmDialog from '@/components/ConfirmDialog';

const RESULTS = ['Pass', 'Fail', 'Retest'];

const defaultAddForm = {
  propertyId: '',
  ph: '',
  tds: '',
  hardness: '',
  chlorine: '',
  testDate: '',
  result: 'Pass',
  remarks: '',
};

type AddForm = typeof defaultAddForm;

// Inner component that uses useSearchParams
function WaterQualityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const [properties, setProperties] = useState<any[]>([]);
  const [filterPropertyId, setFilterPropertyId] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [addForm, setAddForm] = useState<AddForm>({ ...defaultAddForm });
  const [editForm, setEditForm] = useState<AddForm>({ ...defaultAddForm });
  const [formError, setFormError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --------------------------------------------------------------------------
  // Auth
  // --------------------------------------------------------------------------
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.status === 401 || !res.ok) { router.push('/login'); return; }
        const data = await res.json();
        if (data.status && data.data) {
          setUser(data.data);
          setAuthChecked(true);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  // --------------------------------------------------------------------------
  // Read propertyId from URL params on mount
  // --------------------------------------------------------------------------
  useEffect(() => {
    const pid = searchParams.get('propertyId');
    if (pid) {
      setFilterPropertyId(pid);
    }
  }, [searchParams]);

  // --------------------------------------------------------------------------
  // Fetch properties for dropdown
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!authChecked) return;
    const fetchProperties = async () => {
      try {
        const res = await fetch('/api/properties?limit=100');
        const data = await res.json();
        if (data.status && data.data) {
          setProperties(data.data);
        }
      } catch {
        // non-critical
      }
    };
    fetchProperties();
  }, [authChecked]);

  // --------------------------------------------------------------------------
  // Fetch tests
  // --------------------------------------------------------------------------
  const fetchTests = useCallback(async (page = 1, propertyId = '') => {
    setLoading(true);
    try {
      let url = `/api/water-quality?limit=${itemsPerPage}&page=${page}`;
      if (propertyId) url += `&propertyId=${encodeURIComponent(propertyId)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status) {
        setTests(data.data || []);
        setTotalItems(data.totalResult || 0);
        setTotalPages(Math.ceil((data.totalResult || 0) / itemsPerPage) || 1);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    fetchTests(currentPage, filterPropertyId);
  }, [authChecked, currentPage, filterPropertyId, fetchTests]);

  // --------------------------------------------------------------------------
  // Stats derived from fetched data
  // --------------------------------------------------------------------------
  const passCount = tests.filter((t) => t.result === 'Pass').length;
  const failCount = tests.filter((t) => t.result === 'Fail').length;

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  const getPropertyLabel = (id: string) => {
    const prop = properties.find((p) => p._id === id);
    if (!prop) return id || '-';
    return prop.propertyName || prop.address || id;
  };

  const today = new Date().toISOString().split('T')[0];

  // --------------------------------------------------------------------------
  // Add test
  // --------------------------------------------------------------------------
  const handleAdd = async () => {
    setFormError('');
    if (!addForm.propertyId) { setFormError('Property is required'); return; }
    if (!addForm.testDate) { setFormError('Test Date is required'); return; }
    setSaveLoading(true);
    try {
      const res = await fetch('/api/water-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: addForm.propertyId,
          ph: parseFloat(addForm.ph) || undefined,
          tds: parseFloat(addForm.tds) || undefined,
          hardness: parseFloat(addForm.hardness) || undefined,
          chlorine: parseFloat(addForm.chlorine) || undefined,
          testDate: addForm.testDate,
          result: addForm.result,
          remarks: addForm.remarks,
        }),
      });
      const data = await res.json();
      if (data.status) {
        setShowAddModal(false);
        setAddForm({ ...defaultAddForm });
        fetchTests(currentPage, filterPropertyId);
      } else {
        setFormError(data.message || 'Failed to add water quality test');
      }
    } catch {
      setFormError('An unexpected error occurred');
    } finally {
      setSaveLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Edit test
  // --------------------------------------------------------------------------
  const openEdit = (test: any) => {
    setSelectedTest(test);
    const propId = typeof test.propertyId === 'object' ? test.propertyId?._id : test.propertyId;
    setEditForm({
      propertyId: propId || '',
      ph: test.ph?.toString() || '',
      tds: test.tds?.toString() || '',
      hardness: test.hardness?.toString() || '',
      chlorine: test.chlorine?.toString() || '',
      testDate: test.testDate ? test.testDate.split('T')[0] : '',
      result: test.result || 'Pass',
      remarks: test.remarks || '',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    setFormError('');
    if (!editForm.propertyId) { setFormError('Property is required'); return; }
    if (!editForm.testDate) { setFormError('Test Date is required'); return; }
    setSaveLoading(true);
    try {
      const res = await fetch(`/api/water-quality/${selectedTest._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: editForm.propertyId,
          ph: parseFloat(editForm.ph) || undefined,
          tds: parseFloat(editForm.tds) || undefined,
          hardness: parseFloat(editForm.hardness) || undefined,
          chlorine: parseFloat(editForm.chlorine) || undefined,
          testDate: editForm.testDate,
          result: editForm.result,
          remarks: editForm.remarks,
        }),
      });
      const data = await res.json();
      if (data.status) {
        setShowEditModal(false);
        setSelectedTest(null);
        fetchTests(currentPage, filterPropertyId);
      } else {
        setFormError(data.message || 'Failed to update water quality test');
      }
    } catch {
      setFormError('An unexpected error occurred');
    } finally {
      setSaveLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Delete test
  // --------------------------------------------------------------------------
  const openDelete = (test: any) => {
    setSelectedTest(test);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/water-quality/${selectedTest._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.status) {
        setShowDeleteDialog(false);
        setSelectedTest(null);
        fetchTests(currentPage, filterPropertyId);
      }
    } catch {
      // silently fail
    } finally {
      setDeleteLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Guard
  // --------------------------------------------------------------------------
  if (!authChecked || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Styles
  // --------------------------------------------------------------------------
  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.3rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#374151',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
  };
  const primaryBtn: React.CSSProperties = {
    backgroundColor: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  };

  // --------------------------------------------------------------------------
  // Form fields (shared between Add/Edit modals)
  // --------------------------------------------------------------------------
  const renderFormFields = (formData: AddForm, setFormData: (f: AddForm) => void) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {formError && (
        <div style={{ backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', borderRadius: '4px', padding: '0.75rem', fontSize: '0.875rem' }}>
          {formError}
        </div>
      )}

      <div>
        <label style={labelStyle}>Property *</label>
        <select
          value={formData.propertyId}
          onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
          style={inputStyle}
          required
        >
          <option value="">Select a property</option>
          {properties.map((prop) => (
            <option key={prop._id} value={prop._id}>
              {prop.propertyName || prop.address || prop._id}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Test Date *</label>
        <input
          type="date"
          value={formData.testDate}
          onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
          max={today}
          style={inputStyle}
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>pH</label>
          <input
            type="number"
            value={formData.ph}
            onChange={(e) => setFormData({ ...formData, ph: e.target.value })}
            placeholder="0 - 14"
            min="0"
            max="14"
            step="0.1"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>TDS (mg/L)</label>
          <input
            type="number"
            value={formData.tds}
            onChange={(e) => setFormData({ ...formData, tds: e.target.value })}
            placeholder="e.g. 250"
            min="0"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Hardness (mg/L)</label>
          <input
            type="number"
            value={formData.hardness}
            onChange={(e) => setFormData({ ...formData, hardness: e.target.value })}
            placeholder="e.g. 150"
            min="0"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Chlorine (mg/L)</label>
          <input
            type="number"
            value={formData.chlorine}
            onChange={(e) => setFormData({ ...formData, chlorine: e.target.value })}
            placeholder="e.g. 0.5"
            min="0"
            step="0.01"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Result</label>
        <select value={formData.result} onChange={(e) => setFormData({ ...formData, result: e.target.value })} style={inputStyle}>
          {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Remarks</label>
        <textarea
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          placeholder="Any additional observations..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Water Quality Tests</h1>
          <button onClick={() => { setAddForm({ ...defaultAddForm, propertyId: filterPropertyId }); setFormError(''); setShowAddModal(true); }} style={primaryBtn}>
            + Add Test
          </button>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Tests', value: totalItems, color: '#0066cc' },
            { label: 'Pass', value: passCount, color: '#28a745' },
            { label: 'Fail', value: failCount, color: '#dc3545' },
          ].map((card) => (
            <div key={card.label} style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderLeft: `4px solid ${card.color}`,
            }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>{card.label}</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: card.color }}>
                {loading ? '...' : card.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        {filterPropertyId && (
          <div style={{
            backgroundColor: '#e8f0fe',
            border: '1px solid #c2d4f7',
            borderRadius: '6px',
            padding: '0.625rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem',
            color: '#1a56db',
          }}>
            <span>Filtered by property: <strong>{getPropertyLabel(filterPropertyId)}</strong></span>
            <button
              onClick={() => { setFilterPropertyId(''); setCurrentPage(1); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0066cc', fontWeight: 600, fontSize: '0.875rem', padding: '0 0.25rem' }}
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Table card */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f5f5f5' }}>
                <tr>
                  {['No.', 'Property', 'Test Date', 'pH', 'TDS', 'Hardness', 'Chlorine', 'Result', 'Actions'].map((col) => (
                    <th key={col} style={{ padding: '0.875rem 1rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontSize: '0.8125rem', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                      Loading water quality tests...
                    </td>
                  </tr>
                ) : tests.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                      No water quality tests found. Click "+ Add Test" to create one.
                    </td>
                  </tr>
                ) : (
                  tests.map((test, idx) => {
                    const propId = typeof test.propertyId === 'object' ? test.propertyId?._id : test.propertyId;
                    const propLabel = typeof test.propertyId === 'object'
                      ? (test.propertyId?.propertyName || test.propertyId?.address || propId)
                      : getPropertyLabel(test.propertyId);

                    return (
                      <tr
                        key={test._id}
                        style={{ borderBottom: '1px solid #f0f0f0' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#fafafa'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
                      >
                        <td style={{ padding: '0.875rem 1rem' }}>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: 500, maxWidth: '180px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {propLabel || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          {test.testDate ? new Date(test.testDate).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>{test.ph != null ? test.ph : '-'}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>{test.tds != null ? test.tds : '-'}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>{test.hardness != null ? test.hardness : '-'}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>{test.chlorine != null ? test.chlorine : '-'}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <StatusBadge status={test.result || 'Pass'} />
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => openEdit(test)}
                              title="Edit"
                              style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}
                            >
                              &#9998;
                            </button>
                            <button
                              onClick={() => openDelete(test)}
                              title="Delete"
                              style={{ background: 'none', border: '1px solid #f5c6cb', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#dc3545' }}
                            >
                              &#128465;
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

          {/* Pagination */}
          {!loading && totalItems > 0 && (
            <div style={{ padding: '0 1rem' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>

        {/* Add Modal */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Water Quality Test">
          {renderFormFields(addForm, setAddForm)}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAddModal(false)} style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}>
              Cancel
            </button>
            <button onClick={handleAdd} disabled={saveLoading} style={{ ...primaryBtn, opacity: saveLoading ? 0.7 : 1 }}>
              {saveLoading ? 'Saving...' : 'Add Test'}
            </button>
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Water Quality Test">
          {renderFormFields(editForm, setEditForm)}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowEditModal(false)} style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}>
              Cancel
            </button>
            <button onClick={handleEdit} disabled={saveLoading} style={{ ...primaryBtn, opacity: saveLoading ? 0.7 : 1 }}>
              {saveLoading ? 'Saving...' : 'Update Test'}
            </button>
          </div>
        </Modal>

        {/* Delete Confirm Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Delete Water Quality Test"
          message="Are you sure you want to permanently delete this water quality test? This action cannot be undone."
          loading={deleteLoading}
        />
      </div>
    </Layout>
  );
}

// Wrapper with Suspense boundary (required by Next.js for useSearchParams)
export default function WaterQualityPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    }>
      <WaterQualityContent />
    </Suspense>
  );
}
