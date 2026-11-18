'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';

// const GOOGLE_MAPS_API_KEY = 'AIzaSyDK5sS7qa5Jw48sLg0U4JiIziEGcgtQHFs';

const PROPERTY_TYPES = ['1BHK', '2BHK', '3BHK', '3BHK+', 'Villa'];

const STATES: { code: string; name: string }[] = [
  { code: 'AN', name: 'Andaman and Nicobar Islands' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'CT', name: 'Chhattisgarh' },
  { code: 'DL', name: 'Delhi' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OR', name: 'Odisha' },
  { code: 'PY', name: 'Puducherry' },
  { code: 'PB', name: 'Punjab' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TG', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'UT', name: 'Uttarakhand' },
  { code: 'WB', name: 'West Bengal' },
];

const defaultForm = {
  unitNo: '',
  projectName: '',
  address: '',
  street: '',
  landmark: '',
  state: '',
  city: '',
  pincode: '',
  size: 1000,
  bedroom: 1,
  propertyType: '1BHK',
  inspectionDate: '',
  couponCode: '',
  floorPlan: '',
};

export default function BookInspectionPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // State machine — matches Angular isFirstTimeSearch / isDataNotFound / isDataFound
  const [isFirstTimeSearch, setIsFirstTimeSearch] = useState(true);
  const [isDataNotFound, setIsDataNotFound] = useState(false);
  const [isDataFound, setIsDataFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchKey, setSearchKey] = useState('');
  const [userDetails, setUserDetails] = useState<any>(null);

  // Inspection form
  const [form, setForm] = useState({ ...defaultForm });
  const [priceArray, setPriceArray] = useState<any[]>([]);
  const [grandTotalAmt, setGrandTotalAmt] = useState(0);
  const [currentPropertyData, setCurrentPropertyData] = useState<any>(null);

  const gstPercentage = 18;

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  // Manual entry mode
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualUser, setManualUser] = useState({ name: '', phone: '', email: '' });

  // Add New User modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ name: '', phone: '', email: '' });
  const [addUserError, setAddUserError] = useState('');
  const [addUserSaving, setAddUserSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
  // Load inspection prices on mount
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!authChecked) return;
    fetch('/api/inspection-price')
      .then((r) => r.json())
      .then((data) => {
        if (data.status && data.data?.length > 0) {
          setPriceArray(data.data);
          // Set initial propertyType and size based on first price entry
          const first = data.data[0];
          setForm((f) => ({
            ...f,
            propertyType: first.propertyType || '1BHK',
            size: first.propertySize || 1000,
          }));
          setCurrentPropertyData(first);
          masterCalculationOfPrice(first, first.propertySize || 1000);
        }
      })
      .catch(() => {/* silently fail */});
  }, [authChecked]);

  // --------------------------------------------------------------------------
  // Price calculation (mirrors Angular masterCalculationOfPrice)
  // --------------------------------------------------------------------------
  const masterCalculationOfPrice = (propData: any, size: number) => {
    if (!propData?.propertyPrice) { setGrandTotalAmt(0); return; }

    let base: number = propData.propertyPrice;
    const fixedSize: number = propData.propertySize || 0;
    const variablePay: any[] = propData.variablePay || [];

    if (size > fixedSize && variablePay.length > 0) {
      const variableSize = variablePay[0].variableSize;
      const variableAmount = variablePay[0].variableAmount;
      const extraAddSize = size - fixedSize;
      const retunPercentage = Math.ceil(extraAddSize / variableSize);
      base = propData.propertyPrice + (retunPercentage * variableAmount);
    }

    const gstAmount = Number(((base * gstPercentage) / 100).toFixed(2));
    setGrandTotalAmt(base + gstAmount);
  };

  // --------------------------------------------------------------------------
  // On property type change
  // --------------------------------------------------------------------------
  const onChangePropertyType = (type: string) => {
    const found = priceArray.find((p) => p.propertyType === type);
    setCurrentPropertyData(found || null);
    const newBed = type === 'Villa' ? 4 : (type === '3BHK+' ? 4 : Number(type.replace(/[^0-9]/g, '')) || 1);
    const newSize = found?.propertySize || form.size;
    setForm((f) => ({ ...f, propertyType: type, bedroom: newBed, size: newSize }));
    if (found) masterCalculationOfPrice(found, newSize);
    else setGrandTotalAmt(0);
  };

  // --------------------------------------------------------------------------
  // Size +/-
  // --------------------------------------------------------------------------
  const changeSize = (action: 'add' | 'minus') => {
    setForm((f) => {
      const newSize = action === 'add' ? f.size + 50 : (f.size > 50 ? f.size - 50 : f.size);
      if (currentPropertyData) masterCalculationOfPrice(currentPropertyData, newSize);
      return { ...f, size: newSize };
    });
  };

  const onSizeInput = (val: string) => {
    const num = Number(val);
    if (!isNaN(num) && num >= 0) {
      setForm((f) => ({ ...f, size: num }));
      if (currentPropertyData) masterCalculationOfPrice(currentPropertyData, num);
    }
  };

  // --------------------------------------------------------------------------
  // Search user
  // --------------------------------------------------------------------------
  const searchUser = async () => {
    if (!searchKey.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/user-management?search=${encodeURIComponent(searchKey.trim())}&limit=1`);
      const data = await res.json();
      if (data.status && data.data?.length > 0) {
        const u = data.data[0];
        setUserDetails(u);
        setIsDataFound(true);
        setIsDataNotFound(false);
        setIsFirstTimeSearch(false);
        setForm((f) => ({
          ...f,
          address: u.address || f.address,
          city: u.city || f.city,
          state: u.state || f.state,
          pincode: u.pincode || f.pincode,
        }));
      } else {
        setIsDataFound(false);
        setIsDataNotFound(true);
        setIsFirstTimeSearch(false);
        setUserDetails(null);
      }
    } catch {
      setIsDataFound(false);
      setIsDataNotFound(true);
      setIsFirstTimeSearch(false);
      setUserDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') searchUser();
  };

  // --------------------------------------------------------------------------
  // Add New User
  // --------------------------------------------------------------------------
  const openAddUser = () => {
    setAddUserForm({ name: searchKey, phone: '', email: '' });
    setAddUserError('');
    setShowAddUser(true);
  };

  const handleAddUser = async () => {
    setAddUserError('');
    if (!addUserForm.name.trim() || !addUserForm.phone.trim()) {
      setAddUserError('Name and Phone are required.');
      return;
    }
    setAddUserSaving(true);
    try {
      const res = await fetch('/api/user-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addUserForm.name, phone: addUserForm.phone, email: addUserForm.email }),
      });
      const data = await res.json();
      if (data.status && data.data) {
        const u = data.data;
        setUserDetails(u);
        setIsDataFound(true);
        setIsDataNotFound(false);
        setIsFirstTimeSearch(false);
        setShowAddUser(false);
        setShowDialog(true);
        setSearchKey(u.email || u.phone || '');
        setTimeout(() => setShowDialog(false), 2500);
      } else {
        setAddUserError(data.message || 'Failed to create user');
      }
    } catch { setAddUserError('An error occurred.'); }
    finally { setAddUserSaving(false); }
  };

  // --------------------------------------------------------------------------
  // Floor plan upload
  // --------------------------------------------------------------------------
  const onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setForm((f) => ({ ...f, floorPlan: file.name }));
  };

  // --------------------------------------------------------------------------
  // Submit inspection
  // --------------------------------------------------------------------------
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!form.address.trim()) { setSubmitError('Address is required.'); return; }
    if (!form.city.trim()) { setSubmitError('City is required.'); return; }
    if (!form.inspectionDate) { setSubmitError('Inspection Date is required.'); return; }

    const gstAmount = Number(((grandTotalAmt / (1 + gstPercentage / 100)) * (gstPercentage / 100)).toFixed(2));

    setSubmitting(true);
    try {
      const payload = {
        userId: userDetails?._id || null,
        ...(isManualEntry && {
          ownerName: manualUser.name || undefined,
          ownerPhone: manualUser.phone || undefined,
          ownerEmail: manualUser.email || undefined,
        }),
        unitNo: form.unitNo,
        projectName: form.projectName,
        address: form.address,
        street: form.street,
        landmark: form.landmark,
        state: form.state,
        city: form.city,
        pincode: form.pincode,
        size: form.size,
        bedroom: form.bedroom,
        propertyType: form.propertyType,
        inspectionDate: form.inspectionDate,
        amount: String(grandTotalAmt),
        couponCode: form.couponCode,
        floorPlan: form.floorPlan,
        gstPercentage,
        gstAmount,
        bookingStatus: 'Booked',
      };
      const res = await fetch('/api/book-inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status) {
        setShowDialog(true);
        setTimeout(() => setShowDialog(false), 2500);
        setForm({ ...defaultForm });
        if (priceArray.length > 0) {
          const first = priceArray[0];
          setForm((f) => ({ ...f, propertyType: first.propertyType || '1BHK', size: first.propertySize || 1000 }));
          setCurrentPropertyData(first);
          masterCalculationOfPrice(first, first.propertySize || 1000);
        }
      } else {
        setSubmitError(data.message || 'Failed to book inspection');
      }
    } catch { setSubmitError('An unexpected error occurred.'); }
    finally { setSubmitting(false); }
  };

  // --------------------------------------------------------------------------
  // Guard
  // --------------------------------------------------------------------------
  if (!authChecked || !user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading...</p></div>;
  }

  // Defined after guard so inputStyle/labelStyle are available below

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.8125rem', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.25rem', fontSize: '0.78rem', color: '#495057', fontWeight: 500 };

  // Shared inspection form card — reused for both isDataFound and isManualEntry
  const inspectionForm = (
    <div style={{ backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', padding: '1.25rem' }}>
      <h5 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#343a40', marginBottom: '1.25rem' }}>Book an Inspection :</h5>

      {submitError && (
        <div style={{ backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', borderRadius: '4px', padding: '0.6rem 0.75rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
          {submitError}
        </div>
      )}

      <form onSubmit={onSubmit}>

        {/* Address */}
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={labelStyle}>Address *</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Enter Address"
            style={inputStyle}
            required
          />
        </div>

        {/* Unit No + Project Name */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div>
            <label style={labelStyle}>Unit No.</label>
            <input type="text" value={form.unitNo} onChange={(e) => setForm((f) => ({ ...f, unitNo: e.target.value }))} placeholder="Enter Unit No" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Project Name</label>
            <input type="text" value={form.projectName} onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))} placeholder="Enter Project Name" style={inputStyle} />
          </div>
        </div>

        {/* Locality */}
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={labelStyle}>Locality</label>
          <input type="text" value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} placeholder="Enter Locality" style={inputStyle} />
        </div>

        {/* Land Mark */}
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={labelStyle}>Land Mark</label>
          <input type="text" value={form.landmark} onChange={(e) => setForm((f) => ({ ...f, landmark: e.target.value }))} placeholder="Enter Land Mark" style={inputStyle} />
        </div>

        {/* State */}
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={labelStyle}>State</label>
          <select value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value, city: '' }))} style={inputStyle}>
            <option value="">Select State</option>
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </div>

        {/* City */}
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={labelStyle}>City *</label>
          <input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Enter City" style={inputStyle} required />
        </div>

        {/* Pin Code */}
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={labelStyle}>Pin Code</label>
          <input
            type="text"
            inputMode="numeric"
            value={form.pincode}
            onChange={(e) => { if (/^\d{0,6}$/.test(e.target.value)) setForm((f) => ({ ...f, pincode: e.target.value })); }}
            placeholder="Enter Pin Code"
            maxLength={6}
            style={inputStyle}
          />
        </div>

        {/* Property Type Toggle + Size */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
          {/* Toggle Buttons */}
          <div>
            <label style={{ ...labelStyle, marginBottom: '0.4rem' }}>Property Type</label>
            <div style={{ display: 'flex', gap: '0', border: '1px solid #ced4da', borderRadius: '4px', overflow: 'hidden' }}>
              {PROPERTY_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChangePropertyType(t)}
                  style={{
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.75rem',
                    border: 'none',
                    borderRight: t !== 'Villa' ? '1px solid #ced4da' : 'none',
                    cursor: 'pointer',
                    backgroundColor: form.propertyType === t ? '#556ee6' : 'white',
                    color: form.propertyType === t ? 'white' : '#495057',
                    fontWeight: form.propertyType === t ? 600 : 400,
                    transition: 'background-color 0.15s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Size with +/- */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={() => changeSize('minus')}
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #ced4da', background: 'white', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#495057' }}
            >−</button>
            <div>
              <label style={labelStyle}>Size in sqft</label>
              <input
                type="number"
                value={form.size}
                onChange={(e) => onSizeInput(e.target.value)}
                style={{ ...inputStyle, width: '90px' }}
                required
              />
            </div>
            <button
              type="button"
              onClick={() => changeSize('add')}
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #ced4da', background: 'white', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#495057' }}
            >+</button>
          </div>
        </div>

        {/* Floor Plan */}
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={labelStyle}>Upload Floor Plan (optional)</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ ...inputStyle, cursor: 'pointer', color: form.floorPlan ? '#212529' : '#6c757d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>{form.floorPlan || 'Upload Floor Plan'}</span>
            <span style={{ fontSize: '0.85rem' }}>📎</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={onChangeFile}
          />
        </div>

        {/* Select Date */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Select Date *</label>
          <input
            type="date"
            value={form.inspectionDate}
            onChange={(e) => setForm((f) => ({ ...f, inspectionDate: e.target.value }))}
            style={inputStyle}
            required
          />
        </div>

        {/* Submit */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: '#556ee6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '0.55rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Scheduling...' : `Schedule Inspection (₹ ${grandTotalAmt > 0 ? grandTotalAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'})`}
          </button>
        </div>

      </form>
    </div>
  );

  // --------------------------------------------------------------------------
  // Search bar (shown in header when not first time)
  // --------------------------------------------------------------------------
  const searchBar = (
    <div style={{ display: 'flex', gap: '0', border: '1px solid #ced4da', borderRadius: '4px', overflow: 'hidden', width: '320px' }}>
      <input
        type="text"
        value={searchKey}
        onChange={(e) => setSearchKey(e.target.value)}
        onKeyDown={onSearchKeyDown}
        placeholder="Search email or mobile no.."
        style={{ flex: 1, border: 'none', padding: '0.45rem 0.75rem', fontSize: '0.8125rem', outline: 'none' }}
      />
      <button
        type="button"
        onClick={searchUser}
        disabled={isLoading}
        style={{ padding: '0.4rem 0.75rem', backgroundColor: '#f8f9fa', border: 'none', borderLeft: '1px solid #ced4da', cursor: 'pointer', color: '#555', fontSize: '1rem' }}
      >
        🔍
      </button>
    </div>
  );

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>

        {/* ------------------------------------------------------------------ */}
        {/* Header                                                              */}
        {/* ------------------------------------------------------------------ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <ol style={{ display: 'flex', gap: '0.4rem', listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8125rem', color: '#6c757d' }}>
            <li><a href="#" style={{ color: '#6c757d', textDecoration: 'none' }}>Prop Right</a></li>
            <li>/</li>
            <li style={{ color: '#495057' }}>Book Inspection</li>
          </ol>
          {!isFirstTimeSearch && !isDataFound && !isManualEntry && searchBar}
          {isDataFound && searchBar}
        </div>

        {/* Loading bar */}
        {isLoading && (
          <div style={{ height: '3px', backgroundColor: '#e9ecef', borderRadius: '2px', marginBottom: '1rem', overflow: 'hidden' }}>
            <div style={{ width: '60%', height: '100%', backgroundColor: '#556ee6', borderRadius: '2px', animation: 'pulse 1s ease-in-out infinite' }} />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STATE 1: First time — big centered search                           */}
        {/* ------------------------------------------------------------------ */}
        {isFirstTimeSearch && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ maxWidth: '480px', width: '100%', padding: '2rem 0', textAlign: 'center' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#0054a8', marginBottom: '1.25rem' }}>
                To create inspection, please search for existing user
              </h4>
              <div style={{ backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0', border: '1px solid #ced4da', borderRadius: '4px', overflow: 'hidden' }}>
                  <input
                    type="text"
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                    onKeyDown={onSearchKeyDown}
                    placeholder="Search email or mobile no.."
                    style={{ flex: 1, border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={searchUser}
                    disabled={isLoading}
                    style={{ padding: '0.45rem 0.85rem', backgroundColor: '#f8f9fa', border: 'none', borderLeft: '1px solid #ced4da', cursor: 'pointer', fontSize: '1rem', color: '#555' }}
                  >
                    🔍
                  </button>
                </div>
              </div>
              <h5 style={{ fontSize: '0.9rem', color: '#6c757d', margin: '0.75rem 0' }}>Or</h5>
              <div>
                <button
                  type="button"
                  onClick={openAddUser}
                  style={{ backgroundColor: '#556ee6', color: 'white', border: 'none', borderRadius: '4px', padding: '0.5rem 1.5rem', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Add New User
                </button>
              </div>
              <h5 style={{ fontSize: '0.9rem', color: '#6c757d', margin: '0.75rem 0' }}>Or</h5>
              <div>
                <button
                  type="button"
                  onClick={() => { setIsManualEntry(true); setIsFirstTimeSearch(false); }}
                  style={{ backgroundColor: 'white', color: '#556ee6', border: '1px solid #556ee6', borderRadius: '4px', padding: '0.5rem 1.5rem', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Manual Entry (Skip Search)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STATE 2: No user found                                              */}
        {/* ------------------------------------------------------------------ */}
        {isDataNotFound && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ maxWidth: '440px', width: '100%', padding: '2rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>👤</div>
              <h5 style={{ fontSize: '1rem', color: '#495057', marginBottom: '0.5rem' }}>No users found.</h5>
              <p style={{ fontSize: '0.8125rem', color: '#6c757d', marginBottom: '1.25rem' }}>
                Search another user by simply clicking the button on top right side.
              </p>
              <button
                type="button"
                onClick={openAddUser}
                style={{ backgroundColor: '#556ee6', color: 'white', border: 'none', borderRadius: '4px', padding: '0.5rem 1.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Create New user
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STATE 3: User found — profile card + inspection form                */}
        {/* ------------------------------------------------------------------ */}
        {isDataFound && userDetails && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>

            {/* User Profile Card */}
            <div style={{ backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  backgroundColor: '#f5f5f5',
                  backgroundImage: 'url(/images/users/admin.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  marginBottom: '0.75rem',
                  border: '2px solid #dee2e6',
                }} />
                <span style={{ fontSize: '0.75rem', color: userDetails.status === 'Enable' || userDetails.status === 'Active' ? '#28a745' : '#6c757d', fontWeight: 500 }}>
                  {userDetails.status === 'Enable' || userDetails.status === 'Active' ? 'Active' : 'InActive'}
                </span>
              </div>
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    { label: 'Name:', value: userDetails.name || userDetails.userName || '-' },
                    { label: 'Phone No.:', value: userDetails.phone || '-' },
                    { label: 'Email:', value: userDetails.email || '-' },
                    { label: 'Address:', value: userDetails.address || '—' },
                  ].map(({ label, value }) => (
                    <tr key={label}>
                      <td style={{ padding: '0.35rem 0', fontWeight: 600, color: '#495057', whiteSpace: 'nowrap', paddingRight: '0.5rem' }}>{label}</td>
                      <td style={{ padding: '0.35rem 0', color: '#212529', textAlign: 'right', wordBreak: 'break-word' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inspection Form */}
            {inspectionForm}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STATE 4: Manual Entry — optional user info + inspection form         */}
        {/* ------------------------------------------------------------------ */}
        {isManualEntry && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>

            {/* Manual User Info Card */}
            <div style={{ backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', padding: '1.25rem' }}>
              <h5 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#343a40', marginBottom: '1.25rem' }}>User Info (Optional)</h5>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={labelStyle}>Full Name</label>
                <input type="text" value={manualUser.name} onChange={(e) => setManualUser((f) => ({ ...f, name: e.target.value }))} placeholder="Enter name" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={labelStyle}>Phone</label>
                <input type="tel" value={manualUser.phone} onChange={(e) => setManualUser((f) => ({ ...f, phone: e.target.value }))} placeholder="10-digit mobile" maxLength={10} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={manualUser.email} onChange={(e) => setManualUser((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" style={inputStyle} />
              </div>
              <button
                type="button"
                onClick={() => { setIsManualEntry(false); setIsFirstTimeSearch(true); setManualUser({ name: '', phone: '', email: '' }); }}
                style={{ backgroundColor: 'white', color: '#6c757d', border: '1px solid #ced4da', borderRadius: '4px', padding: '0.4rem 0.85rem', fontSize: '0.8125rem', cursor: 'pointer' }}
              >
                Back to Search
              </button>
            </div>

            {/* Inspection Form */}
            {inspectionForm}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Success Popup                                                        */}
        {/* ------------------------------------------------------------------ */}
        {showDialog && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          }}>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '3rem 4rem', textAlign: 'center', maxWidth: '420px', width: '90%' }}>
              <div style={{ fontSize: '3rem', color: '#28a745', marginBottom: '1rem' }}>✅</div>
              <h5 style={{ fontSize: '1rem', color: '#343a40', fontWeight: 600 }}>Registration Completed Successfully</h5>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Add New User Modal                                                   */}
        {/* ------------------------------------------------------------------ */}
        {showAddUser && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998,
          }}>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '400px', maxWidth: '92%', padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Add New User</h5>
                <button onClick={() => setShowAddUser(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6c757d' }}>×</button>
              </div>
              {addUserError && (
                <div style={{ backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', borderRadius: '4px', padding: '0.6rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                  {addUserError}
                </div>
              )}
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={labelStyle}>Full Name *</label>
                <input type="text" value={addUserForm.name} onChange={(e) => setAddUserForm((f) => ({ ...f, name: e.target.value }))} placeholder="Enter name" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={labelStyle}>Phone *</label>
                <input type="tel" value={addUserForm.phone} onChange={(e) => setAddUserForm((f) => ({ ...f, phone: e.target.value }))} placeholder="10-digit mobile" maxLength={10} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={addUserForm.email} onChange={(e) => setAddUserForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button onClick={() => setShowAddUser(false)} style={{ padding: '0.45rem 1rem', border: '1px solid #ced4da', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                <button onClick={handleAddUser} disabled={addUserSaving} style={{ backgroundColor: '#556ee6', color: 'white', border: 'none', borderRadius: '4px', padding: '0.45rem 1.25rem', fontSize: '0.875rem', cursor: addUserSaving ? 'not-allowed' : 'pointer', opacity: addUserSaving ? 0.7 : 1 }}>
                  {addUserSaving ? 'Saving...' : 'Add User'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
