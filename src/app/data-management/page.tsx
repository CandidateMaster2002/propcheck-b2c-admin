'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

// Lowercase space values matching old B2C DB
const SPACES = ['bedroom', 'kitchen', 'bathroom', 'balcony', 'common area', 'external'];
const SPACE_LABELS: Record<string, string> = {
  'bedroom': 'Bedroom',
  'kitchen': 'Kitchen',
  'bathroom': 'Bathroom',
  'balcony': 'Balcony',
  'common area': 'Common Area',
  'external': 'External',
};

const INSPECTION_TYPES = ['quality', 'brand', 'material', 'dimension'];
const SECTION_LABELS: Record<string, string> = {
  quality: 'Quality - List',
  brand: 'Brand Check - List',
  material: 'Material Check - List',
  dimension: 'Dimension Check - List',
};

const ISSUE_TYPES = ['Major', 'Minor', 'Cosmetic'];
const FIELD_TYPES = [
  { value: 'dropdownInput', label: 'Dropdown Input' },
  { value: 'lengthBreadth', label: 'Length Breadth' },
  { value: 'singleField', label: 'Single Field' },
];

interface ItemForm {
  item: string;
  criticalItem: string;
  defectCategory: string;
  issueType: string;
  fieldType: string;
}

const defaultForm: ItemForm = {
  item: '',
  criticalItem: '',
  defectCategory: '',
  issueType: '',
  fieldType: '',
};

export default function DataManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [activeSpace, setActiveSpace] = useState('bedroom');

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addInspectionFor, setAddInspectionFor] = useState('quality');
  const [addForm, setAddForm] = useState<ItemForm>({ ...defaultForm });
  const [addList, setAddList] = useState<string[]>([]);
  const [addReasons, setAddReasons] = useState<{ reason: string; type: string }[]>([]);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<ItemForm>({ ...defaultForm });
  const [editList, setEditList] = useState<string[]>([]);
  const [editReasons, setEditReasons] = useState<{ reason: string; type: string }[]>([]);

  // Delete confirm
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteItem, setDeleteItem] = useState<any>(null);

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
        if (data.status && data.data) { setUser(data.data); setAuthChecked(true); }
        else { router.push('/login'); }
      } catch { router.push('/login'); }
    };
    checkAuth();
  }, [router]);

  // --------------------------------------------------------------------------
  // Fetch all items for space (no pagination — grouped list view)
  // --------------------------------------------------------------------------
  const fetchItems = useCallback(async (space: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/data-management?space=${encodeURIComponent(space)}&limit=500`);
      const data = await res.json();
      if (data.status) setItems(data.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    fetchItems(activeSpace);
  }, [authChecked, activeSpace, fetchItems]);

  // --------------------------------------------------------------------------
  // Group items by inspectionFor
  // --------------------------------------------------------------------------
  const grouped: Record<string, any[]> = {};
  for (const t of INSPECTION_TYPES) {
    grouped[t] = items.filter((i: any) => i.inspectionFor === t);
  }

  // --------------------------------------------------------------------------
  // Helpers: convert between reason array (form) and object (DB)
  // --------------------------------------------------------------------------
  const reasonsToObject = (reasons: { reason: string; type: string }[]) => {
    const ns: string[] = [];
    const ps: string[] = [];
    reasons.forEach(({ reason, type }) => {
      if (!reason.trim()) return;
      if (type === 'Not Satisfactory') ns.push(reason);
      else ps.push(reason);
    });
    return { 'Not Satisfactory': ns, 'Partially Satisfactory': ps };
  };

  const objectToReasons = (reason: any): { reason: string; type: string }[] => {
    if (!reason || typeof reason !== 'object') return [];
    const arr: { reason: string; type: string }[] = [];
    (reason['Not Satisfactory'] || []).forEach((r: string) => arr.push({ reason: r, type: 'Not Satisfactory' }));
    (reason['Partially Satisfactory'] || []).forEach((r: string) => arr.push({ reason: r, type: 'Partially Satisfactory' }));
    return arr;
  };

  // --------------------------------------------------------------------------
  // Add
  // --------------------------------------------------------------------------
  const openAdd = (inspFor: string) => {
    setAddInspectionFor(inspFor);
    setAddForm({ ...defaultForm });
    setAddList([]);
    setAddReasons([]);
    setFormError('');
    setShowAddModal(true);
  };

  const handleAdd = async () => {
    setFormError('');
    if (!addForm.item.trim()) { setFormError('Item text is required'); return; }
    setSaveLoading(true);
    try {
      const body: any = {
        item: addForm.item.trim(),
        space: activeSpace,
        inspectionFor: addInspectionFor,
        status: 'Active',
        list: addList.filter(Boolean),
        criticalItem: addForm.criticalItem,
        defectCategory: addForm.defectCategory,
        issueType: addForm.issueType,
        fieldType: addForm.fieldType,
      };
      if (addInspectionFor === 'quality') {
        body.reason = reasonsToObject(addReasons);
      }
      const res = await fetch('/api/data-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status) {
        setShowAddModal(false);
        fetchItems(activeSpace);
      } else {
        setFormError(data.message || 'Failed to add item');
      }
    } catch { setFormError('An unexpected error occurred'); }
    finally { setSaveLoading(false); }
  };

  // --------------------------------------------------------------------------
  // Edit
  // --------------------------------------------------------------------------
  const openEdit = (item: any) => {
    setSelectedItem(item);
    setEditForm({
      item: item.item || '',
      criticalItem: item.criticalItem || '',
      defectCategory: item.defectCategory || '',
      issueType: item.issueType || '',
      fieldType: item.fieldType || '',
    });
    setEditList(Array.isArray(item.list) ? [...item.list] : []);
    setEditReasons(objectToReasons(item.reason));
    setFormError('');
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    setFormError('');
    if (!editForm.item.trim()) { setFormError('Item text is required'); return; }
    setSaveLoading(true);
    try {
      const body: any = {
        item: editForm.item.trim(),
        list: editList.filter(Boolean),
        criticalItem: editForm.criticalItem,
        defectCategory: editForm.defectCategory,
        issueType: editForm.issueType,
        fieldType: editForm.fieldType,
      };
      if (selectedItem.inspectionFor === 'quality') {
        body.reason = reasonsToObject(editReasons);
      }
      const res = await fetch(`/api/data-management/${selectedItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status) { setShowEditModal(false); fetchItems(activeSpace); }
      else { setFormError(data.message || 'Failed to update item'); }
    } catch { setFormError('An unexpected error occurred'); }
    finally { setSaveLoading(false); }
  };

  // --------------------------------------------------------------------------
  // Delete
  // --------------------------------------------------------------------------
  const openDelete = (item: any) => {
    setDeleteItem(item);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/data-management/${deleteItem._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status) { setShowDeleteDialog(false); fetchItems(activeSpace); }
    } catch {}
    finally { setDeleteLoading(false); }
  };

  // --------------------------------------------------------------------------
  // Inline issueType change (radio group)
  // --------------------------------------------------------------------------
  const handleIssueTypeChange = async (itemId: string, issueType: string) => {
    setItems((prev) => prev.map((i: any) => i._id === itemId ? { ...i, issueType } : i));
    await fetch(`/api/data-management/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueType }),
    });
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
  // Shared form styles
  // --------------------------------------------------------------------------
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #ced4da',
    borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '12px', color: '#444',
  };

  // --------------------------------------------------------------------------
  // Form fields (renders based on inspectionFor type)
  // --------------------------------------------------------------------------
  const renderFormFields = (
    form: ItemForm,
    setForm: (f: ItemForm) => void,
    list: string[],
    setList: (l: string[]) => void,
    reasons: { reason: string; type: string }[],
    setReasons: (r: { reason: string; type: string }[]) => void,
    inspectionFor: string,
  ) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {formError && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', padding: '0.6rem', borderRadius: '4px', fontSize: '12px' }}>
          {formError}
        </div>
      )}

      {/* Item text */}
      <div>
        <label style={labelStyle}>Type of Item *</label>
        <textarea
          value={form.item}
          onChange={(e) => setForm({ ...form, item: e.target.value })}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Quality-specific */}
      {inspectionFor === 'quality' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Critical Item</label>
              <select value={form.criticalItem} onChange={(e) => setForm({ ...form, criticalItem: e.target.value })} style={inputStyle}>
                <option value="">-- Select --</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Defect Category</label>
              <input
                type="text"
                value={form.defectCategory}
                onChange={(e) => setForm({ ...form, defectCategory: e.target.value })}
                placeholder="e.g. Paint, Flooring"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Reasons table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '8px 5px', border: '1px solid #dee2e6', width: '30px' }}>No.</th>
                <th style={{ padding: '8px 5px', border: '1px solid #dee2e6' }}>Reason</th>
                <th style={{ padding: '8px 5px', border: '1px solid #dee2e6', width: '175px' }}>Type</th>
                <th style={{ padding: '8px 5px', border: '1px solid #dee2e6', width: '30px' }}></th>
              </tr>
            </thead>
            <tbody>
              {reasons.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: '4px 5px', border: '1px solid #dee2e6', textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ padding: '4px 5px', border: '1px solid #dee2e6' }}>
                    <input
                      type="text"
                      value={r.reason}
                      onChange={(e) => { const nr = [...reasons]; nr[i] = { ...r, reason: e.target.value }; setReasons(nr); }}
                      style={{ ...inputStyle, padding: '3px 6px' }}
                    />
                  </td>
                  <td style={{ padding: '4px 5px', border: '1px solid #dee2e6' }}>
                    <select
                      value={r.type}
                      onChange={(e) => { const nr = [...reasons]; nr[i] = { ...r, type: e.target.value }; setReasons(nr); }}
                      style={{ ...inputStyle, padding: '3px 6px' }}
                    >
                      <option value="Not Satisfactory">Not Satisfactory</option>
                      <option value="Partially Satisfactory">Partially Satisfactory</option>
                    </select>
                  </td>
                  <td style={{ padding: '4px 5px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setReasons(reasons.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', fontSize: '18px', lineHeight: 1 }}
                    >×</button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} style={{ padding: '4px 5px', border: '1px solid #dee2e6' }}>
                  <button
                    type="button"
                    onClick={() => setReasons([...reasons, { reason: '', type: 'Not Satisfactory' }])}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0054A8', fontSize: '13px' }}
                  >+ Add Reason</button>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* Dimension: field type radio */}
      {inspectionFor === 'dimension' && (
        <div>
          <label style={labelStyle}>Type of Field</label>
          <div style={{ display: 'flex', gap: '1.2rem', fontSize: '12px', paddingTop: '4px' }}>
            {FIELD_TYPES.map((ft) => (
              <label key={ft.value} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="fieldType"
                  value={ft.value}
                  checked={form.fieldType === ft.value}
                  onChange={(e) => setForm({ ...form, fieldType: e.target.value })}
                />
                {ft.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* List items: brand, material, dimension (dropdown or empty fieldType) */}
      {(inspectionFor === 'brand' ||
        inspectionFor === 'material' ||
        (inspectionFor === 'dimension' && (form.fieldType === 'dropdownInput' || form.fieldType === ''))) && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead style={{ background: '#f8f9fa' }}>
            <tr>
              <th style={{ padding: '8px 5px', border: '1px solid #dee2e6', width: '30px' }}>No.</th>
              <th style={{ padding: '8px 5px', border: '1px solid #dee2e6' }}>Type of List</th>
              <th style={{ padding: '8px 5px', border: '1px solid #dee2e6', width: '30px' }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((listItem, i) => (
              <tr key={i}>
                <td style={{ padding: '4px 5px', border: '1px solid #dee2e6', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ padding: '4px 5px', border: '1px solid #dee2e6' }}>
                  <input
                    type="text"
                    value={listItem}
                    onChange={(e) => { const nl = [...list]; nl[i] = e.target.value; setList(nl); }}
                    style={{ ...inputStyle, padding: '3px 6px' }}
                  />
                </td>
                <td style={{ padding: '4px 5px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setList(list.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', fontSize: '18px', lineHeight: 1 }}
                  >×</button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ padding: '4px 5px', border: '1px solid #dee2e6' }}>
                <button
                  type="button"
                  onClick={() => setList([...list, ''])}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0054A8', fontSize: '13px' }}
                >+ Add Item</button>
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );

  // --------------------------------------------------------------------------
  // Render one section card (quality / brand / material / dimension)
  // --------------------------------------------------------------------------
  const renderSection = (type: string) => {
    const sectionItems = grouped[type] || [];
    const label = SECTION_LABELS[type];

    return (
      <div
        key={type}
        style={{
          padding: '15px',
          backgroundColor: '#F2F8FF',
          border: '1px solid #f1f5f7',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          marginBottom: '16px',
        }}
      >
        {/* Section header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid #d4d4d4', paddingBottom: '10px', marginBottom: '10px',
        }}>
          <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#333' }}>{label}</h5>
          <button
            onClick={() => openAdd(type)}
            style={{
              backgroundColor: '#FDB93F', color: '#333', border: 'none',
              borderRadius: '20px', padding: '3px 16px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 500,
            }}
          >
            Add
          </button>
        </div>

        {/* Items list */}
        {loading ? (
          <div style={{ fontSize: '12px', color: '#888', padding: '8px 0' }}>Loading...</div>
        ) : sectionItems.length === 0 ? (
          <label style={{ fontSize: '12px', color: '#888' }}>
            No {type} check mentioned!
          </label>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '35px', listStyle: 'none' }}>
            {sectionItems.map((item: any, idx: number) => (
              <li
                key={item._id}
                style={{
                  color: '#000', fontSize: '12px', lineHeight: '23px',
                  textAlign: 'left', position: 'relative', listStyle: 'none',
                  marginBottom: '5px', minHeight: '30px',
                }}
              >
                {/* Number circle */}
                <span style={{
                  position: 'absolute', left: '-35px', top: '0px',
                  background: '#FDB93F', width: '25px', height: '25px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', fontSize: '11px', fontWeight: 500,
                }}>
                  {idx + 1}
                </span>

                {/* Item title + action buttons */}
                <strong style={{ fontSize: '13px', lineHeight: '18px', display: 'block', marginBottom: '3px', paddingRight: '60px', fontWeight: 500 }}>
                  {item.item || '(no text)'}
                  <span style={{ position: 'absolute', right: 0, top: 0 }}>
                    <button
                      onClick={() => openEdit(item)}
                      title="Edit"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0054A8', fontSize: '17px', padding: '0 3px' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => openDelete(item)}
                      title="Delete"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', fontSize: '17px', padding: '0 3px' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                      </svg>
                    </button>
                  </span>
                </strong>

                {/* Quality: issueType radio + reasons */}
                {type === 'quality' && (
                  <>
                    <div style={{ display: 'flex', gap: '10px', paddingTop: '2px', paddingBottom: '4px' }}>
                      {ISSUE_TYPES.map((t) => (
                        <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={`issueType-${item._id}`}
                            value={t}
                            checked={item.issueType === t}
                            onChange={() => handleIssueTypeChange(item._id, t)}
                            style={{ cursor: 'pointer' }}
                          />
                          {t}
                        </label>
                      ))}
                    </div>
                    {item.reason && (
                      Object.values(item.reason).some((v: any) => Array.isArray(v) && v.length > 0)
                    ) && (
                      <>
                        <b style={{ display: 'block', fontWeight: 500, fontSize: '12px', textDecoration: 'underline' }}>Reasons</b>
                        <div style={{ fontSize: '11px' }}>
                          {(item.reason['Not Satisfactory'] || []).length > 0 && (
                            <div style={{ marginBottom: '4px' }}>
                              <div style={{ fontWeight: 500, fontSize: '13px' }}>Not Satisfactory:</div>
                              <div>{(item.reason['Not Satisfactory'] as string[]).join(', ')}</div>
                            </div>
                          )}
                          {(item.reason['Partially Satisfactory'] || []).length > 0 && (
                            <div style={{ marginBottom: '4px' }}>
                              <div style={{ fontWeight: 500, fontSize: '13px' }}>Partially Satisfactory:</div>
                              <div>{(item.reason['Partially Satisfactory'] as string[]).join(', ')}</div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Brand / Material: Type of Brand + list */}
                {(type === 'brand' || type === 'material') && Array.isArray(item.list) && item.list.length > 0 && (
                  <>
                    <b style={{ display: 'block', fontWeight: 500, fontSize: '12px', fontStyle: 'italic', textDecoration: 'underline' }}>Type of Brand</b>
                    <ul style={{ margin: 0, paddingLeft: 0 }}>
                      {(item.list as string[]).map((l, i) => (
                        <li key={i} style={{ display: 'inline-block', fontSize: '11px', listStyle: 'none', marginRight: '4px' }}>
                          {l}{i < item.list.length - 1 ? ',' : ''}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Dimension: Type of Capacity + list */}
                {type === 'dimension' && Array.isArray(item.list) && item.list.length > 0 && (
                  <>
                    <b style={{ display: 'block', fontWeight: 500, fontSize: '12px', fontStyle: 'italic', textDecoration: 'underline' }}>Type of Capacity</b>
                    <ul style={{ margin: 0, paddingLeft: 0 }}>
                      {(item.list as string[]).map((l, i) => (
                        <li key={i} style={{ display: 'inline-block', fontSize: '11px', listStyle: 'none', marginRight: '4px' }}>
                          {l}{i < item.list.length - 1 ? ',' : ''}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '16px', fontFamily: 'Inter, sans-serif', fontWeight: 500, color: '#333' }}>
            Data Management
          </span>
        </div>

        {/* Main card */}
        <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e0e0e0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#333' }}>
              Space Inspection Survey
            </h4>

            {/* Space tabs */}
            <div style={{ borderBottom: '2px solid #dee2e6', marginBottom: '20px' }}>
              <ul style={{ display: 'flex', listStyle: 'none', margin: 0, padding: 0, gap: 0, flexWrap: 'wrap' }}>
                {SPACES.map((space) => (
                  <li key={space}>
                    <button
                      onClick={() => setActiveSpace(space)}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid transparent',
                        borderBottom: 'none',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '13px',
                        background: activeSpace === space ? 'white' : 'transparent',
                        color: activeSpace === space ? '#0054A8' : '#666',
                        borderColor: activeSpace === space ? '#dee2e6' : 'transparent',
                        borderRadius: '4px 4px 0 0',
                        position: 'relative',
                        bottom: activeSpace === space ? '-2px' : '0',
                        marginBottom: 0,
                      }}
                    >
                      {SPACE_LABELS[space]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* 4 section cards */}
            <div>
              {INSPECTION_TYPES.map((type) => renderSection(type))}
            </div>
          </div>
        </div>

        {/* Add Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title={`Add ${SECTION_LABELS[addInspectionFor]?.replace(' - List', '') || addInspectionFor}`}
          size="lg"
        >
          {renderFormFields(addForm, setAddForm, addList, setAddList, addReasons, setAddReasons, addInspectionFor)}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowAddModal(false)}
              style={{ padding: '0.4rem 1rem', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saveLoading}
              style={{ backgroundColor: '#FDB93F', color: '#333', border: 'none', borderRadius: '20px', padding: '0.4rem 1.4rem', cursor: 'pointer', fontSize: '13px', fontWeight: 500, opacity: saveLoading ? 0.7 : 1 }}
            >
              {saveLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Edit ${selectedItem ? (SECTION_LABELS[selectedItem.inspectionFor]?.replace(' - List', '') || selectedItem.inspectionFor) : ''}`}
          size="lg"
        >
          {selectedItem && renderFormFields(editForm, setEditForm, editList, setEditList, editReasons, setEditReasons, selectedItem.inspectionFor)}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowEditModal(false)}
              style={{ padding: '0.4rem 1rem', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={saveLoading}
              style={{ backgroundColor: '#FDB93F', color: '#333', border: 'none', borderRadius: '20px', padding: '0.4rem 1.4rem', cursor: 'pointer', fontSize: '13px', fontWeight: 500, opacity: saveLoading ? 0.7 : 1 }}
            >
              {saveLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Modal>

        {/* Delete confirmation */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Delete Checklist Item"
          message="Are you sure you want to delete this checklist item?"
          loading={deleteLoading}
        />
      </div>
    </Layout>
  );
}
