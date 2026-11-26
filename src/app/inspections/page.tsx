'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

// ---------------------------------------------------------------------------
// Time slot generator
// ---------------------------------------------------------------------------

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 20 && m > 30) break;
      const hour = h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const min = m === 0 ? '00' : '30';
      slots.push(`${hour}:${min} ${ampm}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();
const ITEMS_PER_PAGE = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InspectionRow {
  _id: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  userId: { _id: string; userName?: string; name?: string; phone?: string; email?: string } | null;
  inspectorId: { _id: string; name: string; phone?: string } | null;
  validatorId: { _id: string; name: string; phone?: string } | null;
  address: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  projectName: string;
  propertyType: string;
  unitNo: string;
  size: string;
  bedroom: string;
  amount: string;
  bookingStatus: string;
  inspectionDate: string | null;
  inspectionTime: string | null;
  couponCode: string;
  inspectionNumber: string;
  reInspectionCount: string;
  reScheduleDate: string | null;
  inspectionType: string;
}

interface AvailableInspector {
  _id: string;
  name: string;
  email: string;
}

interface Validator {
  _id: string;
  name: string;
  email: string;
}

// ---------------------------------------------------------------------------
// ActionMenu sub-component
// ---------------------------------------------------------------------------

function ActionMenu({
  row,
  onView,
  onEdit,
  onReInspection,
  onReschedule,
  onCancel,
}: {
  row: InspectionRow;
  onView: () => void;
  onEdit: () => void;
  onReInspection: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const status = row.bookingStatus;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
    padding: '7px 14px',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#374151',
    whiteSpace: 'nowrap',
  };

  const items: Array<{ label: string; icon: string; action: () => void; danger?: boolean }> = [];

  // View Report — always shown
  items.push({ label: 'View Report', icon: '👁', action: onView });

  // Edit — only if Booked
  if (status === 'Booked') {
    items.push({ label: 'Edit', icon: '✏️', action: onEdit });
  }

  // Re-Inspection — if Complete or Inspection Complete (APK sets 'Inspection Complete')
  if (status === 'Complete' || status === 'Inspection Complete') {
    items.push({ label: 'Recheck', icon: '🔄', action: onReInspection });
  }

  // Reschedule — only if Booked
  if (status === 'Booked') {
    items.push({ label: 'Reschedule', icon: '📅', action: onReschedule });
  }

  // Cancel Inspection — if Booked, Assigned, Pending, or Payment Pending
  if (status === 'Booked' || status === 'Assigned' || status === 'Pending' || status === 'Payment Pending') {
    items.push({ label: 'Cancel Inspection', icon: '✖', action: onCancel, danger: true });
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: '2px 8px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          background: 'white',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
          color: '#555',
        }}
        title="Actions"
      >
        &#8942;
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 200,
            minWidth: '160px',
            overflow: 'hidden',
          }}
        >
          {items.map(({ label, icon, action, danger }) => (
            <button
              key={label}
              onClick={() => {
                setOpen(false);
                action();
              }}
              style={{ ...menuItemStyle, color: danger ? '#dc3545' : '#374151' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InspectionsPage() {
  const router = useRouter();

  // auth
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // data
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // modals
  const [assignInspectorModal, setAssignInspectorModal] = useState(false);
  const [assignValidatorModal, setAssignValidatorModal] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [activePropertyId, setActivePropertyId] = useState('');

  // assign inspector form
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionTime, setInspectionTime] = useState(TIME_SLOTS[0] || '');
  const [availableInspectors, setAvailableInspectors] = useState<AvailableInspector[]>([]);
  const [selectedInspectorId, setSelectedInspectorId] = useState('');
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [assignInspectorSubmitting, setAssignInspectorSubmitting] = useState(false);
  const [assignInspectorError, setAssignInspectorError] = useState('');
  const [includeCity, setIncludeCity] = useState(false);
  const [activePropertyCity, setActivePropertyCity] = useState('');

  // assign validator form
  const [validators, setValidators] = useState<Validator[]>([]);
  const [selectedValidatorId, setSelectedValidatorId] = useState('');
  const [validatorLoading, setValidatorLoading] = useState(false);
  const [assignValidatorSubmitting, setAssignValidatorSubmitting] = useState(false);
  const [assignValidatorError, setAssignValidatorError] = useState('');

  // cancel
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // reschedule modal
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [rescheduleIsReInspection, setRescheduleIsReInspection] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState(TIME_SLOTS[0] || '');
  const [rescheduleInspectors, setRescheduleInspectors] = useState<AvailableInspector[]>([]);
  const [rescheduleInspectorId, setRescheduleInspectorId] = useState('');
  const [rescheduleInspectorLoading, setRescheduleInspectorLoading] = useState(false);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  // inline toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.status === 401 || !res.ok) {
          router.push('/login');
          return;
        }
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

  // Debounce search input — wait 500ms after user stops typing before fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ---------------------------------------------------------------------------
  // Toast helper
  // ---------------------------------------------------------------------------

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ---------------------------------------------------------------------------
  // Fetch inspections
  // ---------------------------------------------------------------------------

  const fetchInspections = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(ITEMS_PER_PAGE),
          page: String(page),
          sort: '-createdAt',
        });
        if (search) params.set('search', search);
        if (statusFilter) params.set('bookingStatus', statusFilter);
        if (propertyType) params.set('propertyType', propertyType);
        if (dateFrom) params.set('startDate', dateFrom);
        if (dateTo) params.set('endDate', dateTo);

        const res = await fetch(`/api/properties?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status) {
            const rows: InspectionRow[] = (data.data || []).map((p: any) => ({
              _id: p._id,
              ownerName: p.ownerName || p.userDetail?.name || p.userDetail?.userName || '',
              ownerPhone: p.ownerPhone || p.userDetail?.phone || p.userDetail?.email || '',
              ownerEmail: p.ownerEmail || p.userDetail?.email || '',
              userId: p.userId || null,
              inspectorId: p.inspectorId || null,
              validatorId: p.validatorId || null,
              address: p.address || '',
              street: p.street || '',
              city: p.city || '',
              state: p.state || '',
              pincode: p.pincode || '',
              projectName: p.projectName || '',
              propertyType: p.propertyType || '',
              unitNo: p.unitNo || '',
              size: p.size || '',
              bedroom: p.bedroom || '',
              amount: p.amount || '',
              bookingStatus: p.bookingStatus || 'Pending',
              inspectionDate: p.inspectionDate || null,
              inspectionTime: p.inspectionTime || null,
              couponCode: p.couponCode || '',
              inspectionNumber: p.inspectionNumber || '',
              reInspectionCount: p.reInspectionCount || '',
              reScheduleDate: p.reScheduleDate || null,
              inspectionType: p.inspectionType || '',
            }));
            setInspections(rows);
            const total = data.totalResult ?? data.total ?? data.count ?? rows.length;
            setTotalItems(total);
          }
        }
      } catch {
        // keep previous
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, propertyType, dateFrom, dateTo]
  );

  useEffect(() => {
    if (!authChecked) return;
    fetchInspections(currentPage);
  }, [authChecked, currentPage, fetchInspections]);

  // ---------------------------------------------------------------------------
  // Filter / Reset
  // ---------------------------------------------------------------------------

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setPropertyType('');
    setStatusFilter('');
    setSearchInput('');
    setSearch('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // ---------------------------------------------------------------------------
  // Assign Inspector
  // ---------------------------------------------------------------------------

  const fetchAvailableInspectors = async (date: string, cityFilter?: boolean, cityVal?: string) => {
    if (!date) {
      setAvailableInspectors([]);
      return;
    }
    setInspectorLoading(true);
    try {
      const cityToUse = cityVal !== undefined ? cityVal : activePropertyCity;
      const cityParam = cityFilter && cityToUse ? `&city=${encodeURIComponent(cityToUse)}` : '';
      const res = await fetch(`/api/inspector/available?date=${date}${cityParam}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableInspectors(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      setAvailableInspectors([]);
    } finally {
      setInspectorLoading(false);
    }
  };

  const openAssignInspector = (
    propertyId: string,
    city?: string,
    existingDate?: string | null,
    existingTime?: string | null
  ) => {
    const propCity = city || '';
    setActivePropertyId(propertyId);
    setActivePropertyCity(propCity);
    setIncludeCity(false);
    setSelectedInspectorId('');
    setAssignInspectorError('');

    // Pre-fill date (convert "2026-11-20T00:00:00.000Z" -> "2026-11-20")
    let formattedDate = '';
    if (existingDate) {
      try {
        const d = new Date(existingDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toISOString().split('T')[0];
        } else if (existingDate.includes('T')) {
          formattedDate = existingDate.split('T')[0];
        } else {
          formattedDate = existingDate;
        }
      } catch {
        formattedDate = '';
      }
    }

    // Pre-fill time slot (e.g. "09:30" -> "9:30 AM")
    let matchedTime = TIME_SLOTS[0] || '';
    if (existingTime) {
      const trimmed = existingTime.trim();
      const direct = TIME_SLOTS.find((s) => s.toLowerCase() === trimmed.toLowerCase());
      if (direct) {
        matchedTime = direct;
      } else {
        const parts = trimmed.split(':');
        if (parts.length >= 2) {
          const h = parseInt(parts[0], 10);
          const m = parts[1].substring(0, 2);
          const ampm = h >= 12 ? 'PM' : 'AM';
          const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
          const converted = `${hour12}:${m} ${ampm}`;
          const found = TIME_SLOTS.find((s) => s === converted);
          if (found) matchedTime = found;
        }
      }
    }

    setInspectionDate(formattedDate);
    setInspectionTime(matchedTime);
    setAssignInspectorModal(true);

    if (formattedDate) {
      fetchAvailableInspectors(formattedDate, false, propCity);
    } else {
      setAvailableInspectors([]);
    }
  };

  const handleInspectionDateChange = async (date: string, cityFilter?: boolean) => {
    setInspectionDate(date);
    setSelectedInspectorId('');
    fetchAvailableInspectors(date, cityFilter);
  };

  const handleAssignInspector = async () => {
    if (!inspectionDate) {
      setAssignInspectorError('Please select an inspection date.');
      return;
    }
    if (!selectedInspectorId) {
      setAssignInspectorError('Please select an inspector.');
      return;
    }
    setAssignInspectorSubmitting(true);
    setAssignInspectorError('');
    try {
      const res = await fetch('/api/properties/assign-inspector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: activePropertyId,
          inspectorId: selectedInspectorId,
          inspectionDate,
          inspectionTime,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setAssignInspectorModal(false);
        showToast('Inspector assigned successfully.', 'success');
        fetchInspections(currentPage);
      } else {
        setAssignInspectorError(data.message || 'Failed to assign inspector.');
      }
    } catch {
      setAssignInspectorError('Network error. Please try again.');
    } finally {
      setAssignInspectorSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Assign Validator
  // ---------------------------------------------------------------------------

  const openAssignValidator = async (propertyId: string) => {
    setActivePropertyId(propertyId);
    setSelectedValidatorId('');
    setAssignValidatorError('');
    setAssignValidatorModal(true);
    setValidatorLoading(true);
    try {
      const res = await fetch('/api/inspector/available-validators');
      if (res.ok) {
        const data = await res.json();
        setValidators(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      setValidators([]);
    } finally {
      setValidatorLoading(false);
    }
  };

  const handleAssignValidator = async () => {
    if (!selectedValidatorId) {
      setAssignValidatorError('Please select a validator.');
      return;
    }
    setAssignValidatorSubmitting(true);
    setAssignValidatorError('');
    try {
      const res = await fetch('/api/properties/assign-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: activePropertyId,
          validatorId: selectedValidatorId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setAssignValidatorModal(false);
        showToast('Validator assigned successfully.', 'success');
        fetchInspections(currentPage);
      } else {
        setAssignValidatorError(data.message || 'Failed to assign validator.');
      }
    } catch {
      setAssignValidatorError('Network error. Please try again.');
    } finally {
      setAssignValidatorSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------------------

  const openCancel = (propertyId: string) => {
    setActivePropertyId(propertyId);
    setCancelDialog(true);
  };

  // ---------------------------------------------------------------------------
  // Reschedule
  // ---------------------------------------------------------------------------

  const openReschedule = (propertyId: string, isReInspection = false) => {
    setActivePropertyId(propertyId);
    setRescheduleIsReInspection(isReInspection);
    setRescheduleDate('');
    setRescheduleTime(TIME_SLOTS[0] || '');
    setRescheduleInspectors([]);
    setRescheduleInspectorId('');
    setRescheduleError('');
    setRescheduleModal(true);
  };

  const handleRescheduleDateChange = async (date: string) => {
    setRescheduleDate(date);
    if (!date) { setRescheduleInspectors([]); return; }
    setRescheduleInspectorLoading(true);
    try {
      const res = await fetch(`/api/inspector/available?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setRescheduleInspectors(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      setRescheduleInspectors([]);
    } finally {
      setRescheduleInspectorLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) { setRescheduleError('Please select a new inspection date.'); return; }
    setRescheduleSubmitting(true);
    setRescheduleError('');
    try {
      const body: any = {
        inspectionDate: rescheduleDate,
        inspectionTime: rescheduleTime,
        bookingStatus: rescheduleIsReInspection ? 'Recheck' : 'Booked',
      };
      if (rescheduleInspectorId) body.inspectorId = rescheduleInspectorId;
      if (rescheduleIsReInspection) {
        body.reScheduleDate = rescheduleDate;
        const currentRow = inspections.find((r) => r._id === activePropertyId);
        const currentCount = parseInt(currentRow?.reInspectionCount || '0') || 0;
        body.reInspectionCount = String(currentCount + 1);
      }
      const res = await fetch(`/api/properties/${activePropertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setRescheduleModal(false);
        showToast(rescheduleIsReInspection ? 'Recheck scheduled successfully.' : 'Inspection rescheduled successfully.', 'success');
        fetchInspections(currentPage);
      } else {
        setRescheduleError(data.message || 'Failed to reschedule inspection.');
      }
    } catch {
      setRescheduleError('Network error. Please try again.');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setCancelSubmitting(true);
    try {
      const res = await fetch(`/api/properties/${activePropertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus: 'Cancelled' }),
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setCancelDialog(false);
        showToast('Inspection cancelled.', 'success');
        fetchInspections(currentPage);
      } else {
        showToast(data.message || 'Failed to cancel inspection.', 'error');
        setCancelDialog(false);
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
      setCancelDialog(false);
    } finally {
      setCancelSubmitting(false);
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

  // ---------------------------------------------------------------------------
  // Shared styles
  // ---------------------------------------------------------------------------

  const filterInputStyle: React.CSSProperties = {
    height: '32px',
    padding: '0 8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const modalInputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '0.875rem',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.25rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#555',
  };

  const thStyle: React.CSSProperties = {
    background: '#FDB93F',
    color: '#333333',
    fontSize: '11px',
    padding: '10px 5px',
    border: '1px solid #dee2e6',
    textAlign: 'left',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    fontSize: '11px',
    padding: '10px 5px',
    verticalAlign: 'top',
    color: '#333',
    border: '1px solid #dee2e6',
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const fromEntry = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const toEntry = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  const btnAssign: React.CSSProperties = {
    padding: '2px 8px',
    backgroundColor: '#0054A8',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 500,
  };

  const btnAssignDisabled: React.CSSProperties = {
    ...btnAssign,
    backgroundColor: '#a0b8d0',
    cursor: 'not-allowed',
    borderRadius: '20px',
  };

  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>
        {/* Toast */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '1rem',
              right: '1rem',
              zIndex: 2000,
              padding: '0.75rem 1.25rem',
              borderRadius: '6px',
              backgroundColor: toast.type === 'success' ? '#d4edda' : '#f8d7da',
              color: toast.type === 'success' ? '#155724' : '#721c24',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '0.875rem',
              fontWeight: 500,
              maxWidth: '360px',
            }}
          >
            {toast.msg}
          </div>
        )}

        {/* Breadcrumb / Page Header */}
        <div style={{ marginBottom: '1rem' }}>
          <span
            style={{
              fontSize: '16px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              color: '#6c757d',
            }}
          >
            Inspections
          </span>
        </div>

        {/* Table Card */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Card Header — Filter Row */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid #dee2e6',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Left group: date pickers */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                style={{ ...filterInputStyle, width: '130px' }}
                title="Date From"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                style={{ ...filterInputStyle, width: '130px' }}
                title="Date To"
              />
            </div>
            {/* Right group: property type, status, search, reset */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={propertyType}
                onChange={(e) => { setPropertyType(e.target.value); setCurrentPage(1); }}
                style={{ ...filterInputStyle, width: '140px' }}
              >
                <option value="" disabled={false}>Property Type</option>
                <option value="Villa">Villa</option>
                <option value="Apartment">Apartment</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{ ...filterInputStyle, width: '160px' }}
              >
                <option value="">Inspection Status</option>
                <option value="Payment Pending">Payment Pending</option>
                <option value="Booked">Booked</option>
                <option value="Inspection Complete">Inspection Complete</option>
                <option value="Complete">Complete</option>
                <option value="Recheck">Recheck</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <input
                type="text"
                placeholder="Search by ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ ...filterInputStyle, width: '140px' }}
              />
              <button
                onClick={handleReset}
                style={{
                  height: '32px',
                  padding: '0 14px',
                  backgroundColor: '#0054A8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
              <thead>
                <tr>
                  {[
                    'No.',
                    'Inspection ID',
                    'Customer Detail',
                    'Inspector / Booking',
                    'Address',
                    'Booking Detail',
                    'Booking Amount',
                    'Coupon Code',
                    'Status',
                    'Validator',
                    'Action',
                  ].map((col) => (
                    <th key={col} style={thStyle}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '13px' }}>
                      Loading...
                    </td>
                  </tr>
                ) : inspections.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '13px' }}>
                      No data found!
                    </td>
                  </tr>
                ) : (
                  inspections.map((row, idx) => {
                    const isPendingOrPayment =
                      row.bookingStatus === 'Pending' || row.bookingStatus === 'Payment Pending';

                    // Customer name/phone
                    const customerName = row.ownerName || '';
                    const customerContact = row.ownerPhone || '';

                    // Display status — show "Payment Pending" if status is "Pending"
                    const displayStatus =
                      row.bookingStatus === 'Pending' ? 'Payment Pending' : row.bookingStatus;

                    // Address parts
                    const addressParts = [
                      row.address,
                      row.street,
                      row.city,
                      row.state,
                      row.pincode,
                    ].filter(Boolean).join(', ');

                    // Booking detail items
                    const bookingDetailItems: Array<{ label: string; value: string }> = [];
                    if (row.unitNo) bookingDetailItems.push({ label: 'Unit No', value: row.unitNo });
                    if (row.propertyType) bookingDetailItems.push({ label: 'Unit Type', value: row.propertyType });
                    if (row.size) bookingDetailItems.push({ label: 'Size', value: `${row.size} Sq. Ft.` });
                    if (row.bedroom) bookingDetailItems.push({ label: '# Bedroom', value: row.bedroom });

                    return (
                      <tr
                        key={row._id}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#fafafa';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '';
                        }}
                      >
                        {/* No. */}
                        <td style={tdStyle}>
                          {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                        </td>

                        {/* Inspection ID */}
                        <td style={tdStyle}>
                          <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>
                            {row.inspectionNumber || row._id.slice(-6).toUpperCase()}
                          </span>
                          {row.reInspectionCount ? (
                            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                              Recheck #{row.reInspectionCount}
                            </div>
                          ) : null}
                        </td>

                        {/* Customer Detail */}
                        <td style={tdStyle}>
                          <div style={{ color: '#0054A8' }}>{customerName || '--'}</div>
                          {customerContact && (
                            <div style={{ color: '#555' }}>{customerContact}</div>
                          )}
                        </td>

                        {/* Inspector / Booking */}
                        <td style={tdStyle}>
                          {row.inspectorId ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <div style={{ fontWeight: 600, color: '#0054A8' }}>{row.inspectorId.name || (row.inspectorId as any).userName || 'Assigned'}</div>
                                <button onClick={() => openAssignInspector(row._id, row.city, row.inspectionDate, row.inspectionTime)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0054A8', padding: '0 2px', marginLeft: '4px' }} title="Reassign">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                </button>
                              </div>
                              {row.inspectionDate && (
                                <div style={{ color: '#555', marginTop: '2px' }}>
                                  {formatDate(row.inspectionDate)}
                                </div>
                              )}
                              {row.inspectionTime && (
                                <div style={{ color: '#555' }}>{row.inspectionTime}</div>
                              )}
                              {row.reScheduleDate && (
                                <div
                                  style={{
                                    marginTop: '4px',
                                    padding: '3px 6px',
                                    border: '1px dotted #aaa',
                                    borderRadius: '3px',
                                    fontSize: '10px',
                                    color: '#666',
                                  }}
                                >
                                  Reschedule Date: {formatDate(row.reScheduleDate)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div style={{ marginBottom: '4px' }}>
                                {formatDate(row.inspectionDate)}
                              </div>
                              <button
                                onClick={() => !isPendingOrPayment && openAssignInspector(row._id, row.city, row.inspectionDate, row.inspectionTime)}
                                style={isPendingOrPayment ? btnAssignDisabled : btnAssign}
                                disabled={isPendingOrPayment}
                              >
                                Assign/Reschedule
                              </button>
                              {row.reScheduleDate && (
                                <div
                                  style={{
                                    marginTop: '4px',
                                    padding: '3px 6px',
                                    border: '1px dotted #aaa',
                                    borderRadius: '3px',
                                    fontSize: '10px',
                                    color: '#666',
                                  }}
                                >
                                  Reschedule Date: {formatDate(row.reScheduleDate)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Address */}
                        <td style={{ ...tdStyle, color: '#0054A8' }}>
                          {row.projectName && <b style={{ color: '#0054A8' }}>{row.projectName}</b>}
                          {row.projectName && addressParts ? ', ' : ''}
                          {addressParts}
                        </td>

                        {/* Booking Detail */}
                        <td style={tdStyle}>
                          {bookingDetailItems.length > 0 ? (
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                              {bookingDetailItems.map((item) => (
                                <li key={item.label} style={{ display: 'inline-block', marginRight: '8px', marginBottom: '1px' }}>
                                  <b style={{ fontStyle: 'italic', color: '#000', marginRight: '2px' }}>{item.label}:</b>
                                  {item.value}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            '--'
                          )}
                        </td>

                        {/* Booking Amount */}
                        <td style={tdStyle}>
                          {row.amount || '--'}
                        </td>

                        {/* Coupon Code */}
                        <td style={tdStyle}>
                          {row.couponCode || '--'}
                        </td>

                        {/* Status */}
                        <td style={tdStyle}>
                          <StatusBadge status={displayStatus} />
                        </td>

                        {/* Validator */}
                        <td style={tdStyle}>
                          {row.bookingStatus === 'Cancelled' ? (
                            <span style={{ color: '#999' }}>-----</span>
                          ) : row.validatorId ? (
                            <div>
                              <span style={{ fontWeight: 600 }}>{row.validatorId.name || (row.validatorId as any).userName || 'Assigned'}</span>
                              <button
                                onClick={() => openAssignValidator(row._id)}
                                style={{
                                  marginLeft: '4px',
                                  padding: '2px 6px',
                                  backgroundColor: '#0054A8',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '10px',
                                }}
                                title="Reassign Validator"
                              >
                                ✏
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => !isPendingOrPayment && openAssignValidator(row._id)}
                              style={isPendingOrPayment ? btnAssignDisabled : btnAssign}
                              disabled={isPendingOrPayment}
                            >
                              Assign Validator
                            </button>
                          )}
                        </td>

                        {/* Action */}
                        <td style={tdStyle}>
                          <ActionMenu
                            row={row}
                            onView={() => router.push(`/inspections/${row._id}`)}
                            onEdit={() => router.push(`/inspections/${row._id}?edit=true`)}
                            onReInspection={() => openReschedule(row._id, true)}
                            onReschedule={() => openReschedule(row._id, false)}
                            onCancel={() => openCancel(row._id)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div
            style={{
              padding: '10px 14px',
              borderTop: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>
              Showing from {fromEntry} to {toEntry} of {totalItems} entries
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={handlePageChange}
            />
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Assign Inspector Modal                                             */}
        {/* ----------------------------------------------------------------- */}
        <Modal
          isOpen={assignInspectorModal}
          onClose={() => setAssignInspectorModal(false)}
          title="Assign Inspector"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {assignInspectorError && (
              <div
                style={{
                  padding: '0.625rem 1rem',
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}
              >
                {assignInspectorError}
              </div>
            )}

            <div>
              <label style={{ ...labelStyle, marginBottom: '0.375rem' }}>
                Inspection Date <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => handleInspectionDateChange(e.target.value, includeCity)}
                style={modalInputStyle}
                required
              />
            </div>

            {activePropertyCity && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="includeCityFilter"
                  checked={includeCity}
                  onChange={(e) => {
                    setIncludeCity(e.target.checked);
                    if (inspectionDate) handleInspectionDateChange(inspectionDate, e.target.checked);
                  }}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0054A8' }}
                />
                <label htmlFor="includeCityFilter" style={{ ...labelStyle, margin: 0, cursor: 'pointer', fontWeight: 400 }}>
                  Show only inspectors from <strong>{activePropertyCity}</strong>
                </label>
              </div>
            )}

            <div>
              <label style={{ ...labelStyle, marginBottom: '0.375rem' }}>Time Slot</label>
              <select
                value={inspectionTime}
                onChange={(e) => setInspectionTime(e.target.value)}
                style={modalInputStyle}
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: '0.375rem' }}>
                Inspector <span style={{ color: '#dc3545' }}>*</span>
              </label>
              {inspectorLoading ? (
                <div style={{ color: '#999', fontSize: '0.875rem' }}>Loading available inspectors...</div>
              ) : (
                <select
                  value={selectedInspectorId}
                  onChange={(e) => setSelectedInspectorId(e.target.value)}
                  style={modalInputStyle}
                  disabled={!inspectionDate}
                >
                  <option value="">
                    {!inspectionDate ? 'Select a date first' : 'Select Inspector'}
                  </option>
                  {availableInspectors.map((ins) => (
                    <option key={ins._id} value={ins._id}>
                      {ins.name} ({ins.email})
                    </option>
                  ))}
                </select>
              )}
              {inspectionDate && !inspectorLoading && availableInspectors.length === 0 && (
                <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                  No inspectors available for the selected date.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button
                onClick={() => setAssignInspectorModal(false)}
                disabled={assignInspectorSubmitting}
                style={{
                  padding: '0.5rem 1.25rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: assignInspectorSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignInspector}
                disabled={assignInspectorSubmitting}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: assignInspectorSubmitting ? '#99c2ea' : '#0054A8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: assignInspectorSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                {assignInspectorSubmitting ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </Modal>

        {/* ----------------------------------------------------------------- */}
        {/* Assign Validator Modal                                             */}
        {/* ----------------------------------------------------------------- */}
        <Modal
          isOpen={assignValidatorModal}
          onClose={() => setAssignValidatorModal(false)}
          title="Assign Validator"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {assignValidatorError && (
              <div
                style={{
                  padding: '0.625rem 1rem',
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}
              >
                {assignValidatorError}
              </div>
            )}

            <div>
              <label style={{ ...labelStyle, marginBottom: '0.375rem' }}>
                Validator <span style={{ color: '#dc3545' }}>*</span>
              </label>
              {validatorLoading ? (
                <div style={{ color: '#999', fontSize: '0.875rem' }}>Loading validators...</div>
              ) : (
                <select
                  value={selectedValidatorId}
                  onChange={(e) => setSelectedValidatorId(e.target.value)}
                  style={modalInputStyle}
                >
                  <option value="">Select Validator</option>
                  {validators.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name} ({v.email})
                    </option>
                  ))}
                </select>
              )}
              {!validatorLoading && validators.length === 0 && (
                <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                  No validators available.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button
                onClick={() => setAssignValidatorModal(false)}
                disabled={assignValidatorSubmitting}
                style={{
                  padding: '0.5rem 1.25rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: assignValidatorSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignValidator}
                disabled={assignValidatorSubmitting}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: assignValidatorSubmitting ? '#99c2ea' : '#0054A8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: assignValidatorSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                {assignValidatorSubmitting ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </Modal>

        {/* ----------------------------------------------------------------- */}
        {/* Cancel ConfirmDialog                                               */}
        {/* ----------------------------------------------------------------- */}
        <ConfirmDialog
          isOpen={cancelDialog}
          onClose={() => setCancelDialog(false)}
          onConfirm={handleCancel}
          title="Cancel Inspection"
          message="Are you sure you want to cancel this inspection? This action cannot be undone."
          loading={cancelSubmitting}
        />

        {/* ----------------------------------------------------------------- */}
        {/* Reschedule Modal                                                   */}
        {/* ----------------------------------------------------------------- */}
        <Modal
          isOpen={rescheduleModal}
          onClose={() => setRescheduleModal(false)}
          title={rescheduleIsReInspection ? 'Assign Recheck' : 'Reschedule Inspection'}
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rescheduleError && (
              <div style={{ padding: '0.625rem 1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '0.875rem' }}>
                {rescheduleError}
              </div>
            )}

            <div>
              <label style={{ ...labelStyle, marginBottom: '0.375rem' }}>
                New Inspection Date <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => handleRescheduleDateChange(e.target.value)}
                style={modalInputStyle}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: '0.375rem' }}>Time Slot</label>
              <select value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} style={modalInputStyle}>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: '0.375rem' }}>Change Inspector (optional)</label>
              {rescheduleInspectorLoading ? (
                <div style={{ color: '#999', fontSize: '0.875rem' }}>Loading available inspectors...</div>
              ) : (
                <select
                  value={rescheduleInspectorId}
                  onChange={(e) => setRescheduleInspectorId(e.target.value)}
                  style={modalInputStyle}
                  disabled={!rescheduleDate}
                >
                  <option value="">{!rescheduleDate ? 'Select a date first' : 'Keep current inspector'}</option>
                  {rescheduleInspectors.map((ins) => (
                    <option key={ins._id} value={ins._id}>{ins.name} ({ins.email})</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button
                onClick={() => setRescheduleModal(false)}
                disabled={rescheduleSubmitting}
                style={{ padding: '0.5rem 1.25rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={rescheduleSubmitting}
                style={{ padding: '0.5rem 1.25rem', backgroundColor: rescheduleSubmitting ? '#99c2ea' : '#0054A8', color: 'white', border: 'none', borderRadius: '4px', cursor: rescheduleSubmitting ? 'not-allowed' : 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
              >
                {rescheduleSubmitting ? 'Saving...' : (rescheduleIsReInspection ? 'Assign Recheck' : 'Reschedule')}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
