'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';

// ---------------------------------------------------------------------------
// SpeedometerGauge — matches the Angular progress-circular-graph component
// 270° arc from 7-o'clock → 12-o'clock → 5-o'clock with colour segments
// ---------------------------------------------------------------------------

function SpeedometerGauge({
  label,
  progress = 0,
  threshold = 80,
}: {
  label: string;
  progress: number;
  threshold?: number;
}) {
  const pct = Math.min(Math.max(Math.round(progress), 0), 100);
  const isZero = pct <= 0;
  const isHigh = pct >= threshold;

  // Geometry — cy=84 gives 16px clearance above the arc top inside the 190px viewBox
  const cx = 100, cy = 84, r = 68, nLen = 50;
  const toRad = (d: number) => (d * Math.PI) / 180;

  // Needle angle: 0% → 225° (7-o'clock), 100% → -45° (5-o'clock)
  const needleAngle = 225 - (pct / 100) * 270;
  const nx = cx + nLen * Math.cos(toRad(needleAngle));
  const ny = cy - nLen * Math.sin(toRad(needleAngle));

  // Arc segment endpoints (standard math angles, counterclockwise = positive)
  const pt = (deg: number) => ({
    x: +(cx + r * Math.cos(toRad(deg))).toFixed(2),
    y: +(cy - r * Math.sin(toRad(deg))).toFixed(2),
  });
  const p225 = pt(225);   // 7-o'clock  (0%)
  const p157 = pt(157.5); // 25%
  const p90  = pt(90);    // 12-o'clock (50%)
  const p22  = pt(22.5);  // 75%
  const p315 = pt(-45);   // 5-o'clock  (100%)

  // SVG arc: clockwise sweep (sweep-flag = 1) draws the 270° horseshoe over the top
  const seg = (a: {x:number;y:number}, b: {x:number;y:number}, large = 0) =>
    `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;

  // Badge colours
  const badgeBg  = isHigh ? '#dcfce7' : '#fee2e2';
  const badgeTxt = isHigh ? '#15803d' : '#dc2626';
  const arrowSrc = isHigh
    ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><polygon points="5,1 9,9 1,9" fill="%2315803d"/></svg>'
    : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><polygon points="5,9 9,1 1,1" fill="%23dc2626"/></svg>';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      backgroundColor: '#F8FAFC', borderRadius: '8px',
      padding: '16px 8px 12px', width: '100%', boxSizing: 'border-box',
    }}>
      {/* Panel label — only rendered if non-empty */}
      {label && (
        <div style={{
          fontSize: '13px', fontWeight: 500, color: '#64748b',
          textAlign: 'center', lineHeight: 1.4, marginBottom: '8px',
          minHeight: '36px', display: 'flex', alignItems: 'center',
        }}>
          {label}
        </div>
      )}

      {/* SVG gauge — explicit width+height so the browser never miscomputes the box */}
      <svg viewBox="0 0 200 190" width="200" height="190" style={{ maxWidth: '100%', display: 'block' }}>
        {/* Track (always grey background ring for the 270° arc) */}
        <path
          d={seg(p225, p315, 1)}
          fill="none" stroke="#E2E8F0" strokeWidth="13" strokeLinecap="round"
        />

        {!isZero && (
          <>
            {/* Coloured arc segments — full spectrum always visible */}
            <path d={seg(p225, p157)} fill="none" stroke="#E63535" strokeWidth="13" strokeLinecap="butt" />
            <path d={seg(p157, p90)}  fill="none" stroke="#FB9D4B" strokeWidth="13" strokeLinecap="butt" />
            <path d={seg(p90,  p22)}  fill="none" stroke="#FBC02D" strokeWidth="13" strokeLinecap="butt" />
            <path d={seg(p22,  p315)} fill="none" stroke="#16A34A" strokeWidth="13" strokeLinecap="butt" />

            {/* Needle */}
            <line
              x1={cx} y1={cy} x2={nx} y2={ny}
              stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"
            />
            {/* Hub */}
            <circle cx={cx} cy={cy} r="5" fill="#1F2937" />
          </>
        )}

        {/* Percentage value — inside the belly of the gauge */}
        <text
          x={cx} y={cy + 20}
          textAnchor="middle"
          fontSize="24" fontWeight="700" fill="#1A1717"
          fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
        >
          {pct}%
        </text>

        {/* Score badge — in the open gap at the bottom of the gauge */}
        {!isZero && (
          <g transform={`translate(${cx}, 158)`}>
            <rect x="-42" y="-13" width="84" height="22" rx="5"
              fill={badgeBg} stroke={isHigh ? '#86efac' : '#fca5a5'} strokeWidth="0.8" />
            <image href={arrowSrc} x="-32" y="-9" width="10" height="10" />
            <text
              x="-16" y="3"
              fontSize="11" fontWeight="600" fill={badgeTxt}
              fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
            >
              {isHigh ? 'High Score' : 'Low Score'}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PersonRef {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface PropertyDetail {
  _id: string;
  propertyName: string;
  propertyType: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  unitNo: string;
  bedrooms: string | number;
  size: string | number;
  bookingStatus: string;
  bookingAmount: number | null;
  inspectionDate: string | null;
  inspectionTime: string | null;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  inspectorId: PersonRef | null;
  validatorId: PersonRef | null;
  waterQualityLink: string | null;
  reportUrl?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  insScore: number;
  reInsScore: number;
  inspectionDetail?: any[];
  reInspectionCount: string | null;
  reScheduleDate: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InspectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  // auth
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // data
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  // report generation
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMsg, setReportMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // video management
  const [videoUrl, setVideoUrl] = useState('');
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);
  const [videoMsg, setVideoMsg] = useState('');

  // send report
  const [sendingReport, setSendingReport] = useState(false);

  // water quality inline
  const [wqData, setWqData] = useState<any>(null);
  const [wqPh, setWqPh] = useState('');
  const [wqTds, setWqTds] = useState('');
  const [wqHardness, setWqHardness] = useState('');
  const [wqChlorine, setWqChlorine] = useState('');
  const [wqTestDate, setWqTestDate] = useState('');
  const [wqResult, setWqResult] = useState('');
  const [wqRemarks, setWqRemarks] = useState('');
  const [savingWq, setSavingWq] = useState(false);
  const [wqMsg, setWqMsg] = useState('');

  // inspection space breakdown
  const [expandedSpaces, setExpandedSpaces] = useState<Set<number>>(new Set());
  const [reportedIssue, setReportedIssue] = useState<{ issue: string; pictures: string[] } | null>(null);

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

  // ---------------------------------------------------------------------------
  // Fetch property
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!authChecked || !id) return;

    const fetchProperty = async () => {
      setDataLoading(true);
      setDataError('');
      try {
        const res = await fetch(`/api/properties/${id}`);
        if (!res.ok) {
          setDataError('Failed to load inspection details.');
          return;
        }
        const data = await res.json();
        if (data.status && data.data) {
          const p = data.data;
          setProperty({
            _id: p._id,
            propertyName: p.propertyName || 'N/A',
            propertyType: p.propertyType || 'N/A',
            address: p.address || '',
            city: p.city || '',
            state: p.state || '',
            pincode: p.pincode || '',
            unitNo: p.unitNo || '',
            bedrooms: p.bedrooms ?? '',
            size: p.size ?? '',
            bookingStatus: p.bookingStatus || 'Pending',
            bookingAmount: p.bookingAmount ?? null,
            inspectionDate: p.inspectionDate || null,
            inspectionTime: p.inspectionTime || null,
            ownerName: p.ownerName || 'N/A',
            ownerPhone: p.ownerPhone || '',
            ownerEmail: p.ownerEmail || '',
            inspectorId: p.inspectorId || null,
            validatorId: p.validatorId || null,
            waterQualityLink: p.waterQualityLink || null,
            reportUrl: p.reportUrl || '',
            videoUrl: p.videoUrl || '',
            videoThumbnail: p.videoThumbnail || '',
            insScore: Math.round(p.inspectionData?.overallhealthrating || p.overallhealthrating || 0),
            reInsScore: Math.round(p.inspectionData?.overallhealthrating_reinsp || p.overallhealthrating_reinsp || 0),
            inspectionDetail: Array.isArray(p.inspectionDetail) ? p.inspectionDetail : [],
            reInspectionCount: p.reInspectionCount || null,
            reScheduleDate: p.reScheduleDate || null,
          });
        } else {
          setDataError(data.message || 'Inspection not found.');
        }
      } catch {
        setDataError('Network error. Please try again.');
      } finally {
        setDataLoading(false);
      }
    };

    fetchProperty();

    // Fetch water quality for this property
    const fetchWq = async () => {
      try {
        const res = await fetch(`/api/water-quality?propertyId=${id}&limit=1`);
        const data = await res.json();
        if (data.status && data.data?.length > 0) {
          const wq = data.data[0];
          setWqData(wq);
          setWqPh(wq.ph?.toString() || '');
          setWqTds(wq.tds?.toString() || '');
          setWqHardness(wq.hardness?.toString() || '');
          setWqChlorine(wq.chlorine?.toString() || '');
          setWqTestDate(wq.testDate ? wq.testDate.split('T')[0] : '');
          setWqResult(wq.result || '');
          setWqRemarks(wq.remarks || '');
        }
      } catch { /* silent */ }
    };
    fetchWq();
  }, [authChecked, id]);

  // Sync video fields when property loads
  useEffect(() => {
    if (property) {
      setVideoUrl(property.videoUrl || '');
      setVideoThumbnailUrl(property.videoThumbnail || '');
    }
  }, [property?._id]);

  // ---------------------------------------------------------------------------
  // Generate Report
  // ---------------------------------------------------------------------------

  const handleGenerateReport = async () => {
    if (!id) return;

    // Open a blank tab synchronously within the user-gesture context so it is
    // never blocked by the browser's popup blocker.
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      setReportMsg({ text: 'Popup blocked. Please allow popups for this site.', type: 'error' });
      setTimeout(() => setReportMsg(null), 4000);
      return;
    }

    // Show a PropChk-branded loading screen while the report is generated.
    reportWindow.document.write(`
      <html><head><title>PropChk — Generating Report…</title>
      <style>
        body,html{margin:0;padding:0;height:100%;font-family:Arial,sans-serif;background:#0655a2;display:flex;align-items:center;justify-content:center}
        .wrap{text-align:center;color:#fff}
        .spinner{width:56px;height:56px;border:5px solid rgba(255,255,255,.3);border-top-color:#f8b516;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px}
        @keyframes spin{to{transform:rotate(360deg)}}
        h2{font-size:20px;margin:0 0 8px}
        p{font-size:14px;opacity:.8;margin:0}
      </style></head>
      <body><div class="wrap">
        <div class="spinner"></div>
        <h2>PropChk</h2>
        <p>Generating your inspection report…</p>
      </div></body></html>`);
    reportWindow.document.close();

    setReportLoading(true);
    setReportMsg(null);
    try {
      const res = await fetch(`/api/properties/generate-report/${id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status) {
        const html = data.data?.reportHtml;
        if (html) {
          // Write the HTML directly into the popup tab — no S3 needed
          reportWindow.document.open();
          reportWindow.document.write(html);
          reportWindow.document.close();
          setReportMsg({ text: 'Report opened.', type: 'success' });
        } else {
          reportWindow.close();
          setReportMsg({ text: 'Report content not found.', type: 'error' });
        }
      } else {
        reportWindow.close();
        setReportMsg({ text: data.message || 'Report not available yet.', type: 'error' });
      }
    } catch {
      reportWindow.close();
      setReportMsg({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setReportLoading(false);
      setTimeout(() => setReportMsg(null), 4000);
    }
  };

  // ---------------------------------------------------------------------------
  // Edit inspection
  // ---------------------------------------------------------------------------

  const openEdit = () => {
    if (!property) return;
    setEditForm({
      propertyName: property.propertyName || '',
      propertyType: property.propertyType || 'Apartment',
      address: property.address || '',
      city: property.city || '',
      unitNo: property.unitNo || '',
      bedrooms: property.bedrooms?.toString() || '',
      size: property.size?.toString() || '',
      bookingStatus: property.bookingStatus || 'Pending',
      inspectionDate: property.inspectionDate ? property.inspectionDate.split('T')[0] : '',
      inspectionTime: property.inspectionTime || '',
      ownerName: property.ownerName || '',
      ownerPhone: property.ownerPhone || '',
      ownerEmail: property.ownerEmail || '',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    setEditError('');
    if (!editForm.ownerName?.trim()) { setEditError('Customer name is required'); return; }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyName: editForm.propertyName,
          propertyType: editForm.propertyType,
          address: editForm.address,
          city: editForm.city,
          unitNo: editForm.unitNo,
          bedrooms: editForm.bedrooms,
          size: editForm.size ? parseFloat(editForm.size) : undefined,
          bookingStatus: editForm.bookingStatus,
          inspectionDate: editForm.inspectionDate || undefined,
          inspectionTime: editForm.inspectionTime || undefined,
          ownerName: editForm.ownerName,
          ownerPhone: editForm.ownerPhone,
          ownerEmail: editForm.ownerEmail,
        }),
      });
      const data = await res.json();
      if (data.status) {
        setShowEditModal(false);
        // Refresh data
        const refreshRes = await fetch(`/api/properties/${id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.status && refreshData.data) {
          const p = refreshData.data;
          setProperty((prev) => prev ? {
            ...prev,
            propertyName: p.propertyName || prev.propertyName,
            propertyType: p.propertyType || prev.propertyType,
            address: p.address || prev.address,
            city: p.city || prev.city,
            unitNo: p.unitNo || prev.unitNo,
            bedrooms: p.bedrooms ?? prev.bedrooms,
            size: p.size ?? prev.size,
            bookingStatus: p.bookingStatus || prev.bookingStatus,
            inspectionDate: p.inspectionDate || prev.inspectionDate,
            inspectionTime: p.inspectionTime || prev.inspectionTime,
            ownerName: p.ownerName || prev.ownerName,
            ownerPhone: p.ownerPhone || prev.ownerPhone,
            ownerEmail: p.ownerEmail || prev.ownerEmail,
          } : prev);
        }
        setReportMsg({ text: 'Inspection updated successfully', type: 'success' });
        setTimeout(() => setReportMsg(null), 3000);
      } else {
        setEditError(data.message || 'Failed to update inspection');
      }
    } catch { setEditError('Network error. Please try again.'); }
    finally { setEditSaving(false); }
  };

  // ---------------------------------------------------------------------------
  // Video management
  // ---------------------------------------------------------------------------

  const handleSaveVideo = async () => {
    setSavingVideo(true); setVideoMsg('');
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: videoUrl.trim(), videoThumbnail: videoThumbnailUrl.trim() }),
      });
      const data = await res.json();
      setVideoMsg(data.status ? 'Video details saved.' : (data.message || 'Failed to save video'));
      if (data.status) setProperty((p) => p ? { ...p, videoUrl: videoUrl.trim(), videoThumbnail: videoThumbnailUrl.trim() } : p);
    } catch { setVideoMsg('Network error'); }
    finally { setSavingVideo(false); setTimeout(() => setVideoMsg(''), 3000); }
  };

  // ---------------------------------------------------------------------------
  // Send Report
  // ---------------------------------------------------------------------------

  const handleSendReport = async () => {
    setSendingReport(true);
    try {
      const res = await fetch(`/api/properties/send-report/${id}`, { method: 'POST' });
      const data = await res.json();
      setReportMsg({ text: data.status ? 'Report sent to customer/agent successfully.' : (data.message || 'Failed to send report'), type: data.status ? 'success' : 'error' });
      setTimeout(() => setReportMsg(null), 4000);
    } catch { setReportMsg({ text: 'Network error', type: 'error' }); }
    finally { setSendingReport(false); }
  };

  // ---------------------------------------------------------------------------
  // Water Quality inline
  // ---------------------------------------------------------------------------

  const handleSaveWaterQuality = async () => {
    if (!wqPh) { setWqMsg('PH value is required.'); return; }
    setSavingWq(true); setWqMsg('');
    try {
      const payload: any = { propertyId: id, ph: parseFloat(wqPh) };
      if (wqTds) payload.tds = parseFloat(wqTds);
      if (wqHardness) payload.hardness = parseFloat(wqHardness);
      if (wqChlorine) payload.chlorine = parseFloat(wqChlorine);
      if (wqTestDate) payload.testDate = wqTestDate;
      if (wqResult) payload.result = wqResult;
      if (wqRemarks) payload.remarks = wqRemarks;
      const url = wqData ? `/api/water-quality/${wqData._id}` : '/api/water-quality';
      const method = wqData ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      setWqMsg(data.status ? 'Water quality saved.' : (data.message || 'Failed'));
      if (data.status && !wqData) setWqData(data.data);
    } catch { setWqMsg('Network error'); }
    finally { setSavingWq(false); setTimeout(() => setWqMsg(''), 3000); }
  };

  // ---------------------------------------------------------------------------
  // Guard
  // ---------------------------------------------------------------------------

  if (!authChecked || !user) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Shared styles
  // ---------------------------------------------------------------------------

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '1.5rem',
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '1.25rem',
    paddingBottom: '0.625rem',
    borderBottom: '1px solid #e5e7eb',
  };

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#6b7280',
    marginBottom: '0.2rem',
  };

  const fieldValueStyle: React.CSSProperties = {
    fontSize: '0.9375rem',
    color: '#111827',
    fontWeight: 400,
  };

  const fieldRow = (label: string, value: React.ReactNode) => (
    <div style={{ marginBottom: '1rem' }}>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={fieldValueStyle}>{value || <span style={{ color: '#9ca3af' }}>N/A</span>}</div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render loading / error
  // ---------------------------------------------------------------------------

  if (dataLoading) {
    return (
      <Layout user={user}>
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#999', paddingTop: '4rem' }}>
          Loading inspection details...
        </div>
      </Layout>
    );
  }

  if (dataError || !property) {
    return (
      <Layout user={user}>
        <div style={{ padding: '1.5rem' }}>
          <div
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '8px',
              marginBottom: '1rem',
            }}
          >
            {dataError || 'Inspection not found.'}
          </div>
          <button
            onClick={() => router.back()}
            style={{
              padding: '0.5rem 1.25rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Back
          </button>
        </div>
      </Layout>
    );
  }

  const fullAddress = [property.address, property.city, property.state, property.pincode]
    .filter(Boolean)
    .join(', ');

  // ---------------------------------------------------------------------------
  // Full render
  // ---------------------------------------------------------------------------

  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>
        {/* Page header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
              Inspection Details
            </h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
              ID: <span style={{ fontFamily: 'monospace' }}>{property._id}</span>
            </p>
          </div>
          <StatusBadge status={property.bookingStatus} />
        </div>

        {/* Report message toast */}
        {reportMsg && (
          <div
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              backgroundColor: reportMsg.type === 'success' ? '#d4edda' : '#f8d7da',
              color: reportMsg.type === 'success' ? '#155724' : '#721c24',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {reportMsg.text}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* 2-column info grid                                                 */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Property Info */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>Property Information</div>
            {fieldRow('Property Name', property.propertyName)}
            {fieldRow('Property Type', property.propertyType)}
            {fieldRow('Address', fullAddress)}
            {fieldRow(
              'Unit Details',
              [
                property.unitNo ? `Unit: ${property.unitNo}` : null,
                property.bedrooms ? `${property.bedrooms} Bedrooms` : null,
                property.size ? `${property.size} sq.ft` : null,
              ]
                .filter(Boolean)
                .join(' | ')
            )}
            {fieldRow('Booking Status', <StatusBadge status={property.bookingStatus} />)}
            {fieldRow(
              'Booking Amount',
              property.bookingAmount != null
                ? `\u20B9${property.bookingAmount.toLocaleString('en-IN')}`
                : null
            )}
            {fieldRow(
              'Inspection Date',
              property.inspectionDate
                ? new Date(property.inspectionDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Not Scheduled'
            )}
            {fieldRow('Inspection Time', property.inspectionTime || 'Not Set')}
          </div>

          {/* Recheck Details — shown whenever a recheck has been scheduled */}
          {(property.reInspectionCount || property.reScheduleDate) && (
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Recheck Details</div>
              {fieldRow('Recheck Count', property.reInspectionCount || '0')}
              {fieldRow(
                'Recheck Date',
                property.reScheduleDate
                  ? new Date(property.reScheduleDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Not Scheduled'
              )}
              {fieldRow('Status', <StatusBadge status={property.bookingStatus} />)}
            </div>
          )}

          {/* Customer & Inspector Info */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>Customer Information</div>
            {fieldRow('Name', property.ownerName)}
            {fieldRow('Phone', property.ownerPhone)}
            {fieldRow('Email', property.ownerEmail)}

            <div
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '1.25rem',
                marginTop: '1.25rem',
                paddingBottom: '0.625rem',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              Inspector Information
            </div>

            {property.inspectorId ? (
              <>
                {fieldRow('Name', property.inspectorId.name)}
                {fieldRow('Phone', property.inspectorId.phone)}
              </>
            ) : (
              <div
                style={{
                  fontSize: '0.875rem',
                  color: '#9ca3af',
                  marginBottom: '1.25rem',
                }}
              >
                No inspector assigned yet.
              </div>
            )}

            <div
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '1.25rem',
                marginTop: '0.5rem',
                paddingBottom: '0.625rem',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              Validator Information
            </div>

            {property.validatorId ? (
              <>
                {fieldRow('Name', property.validatorId.name)}
                {fieldRow('Phone', property.validatorId.phone)}
              </>
            ) : (
              <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                No validator assigned yet.
              </div>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Unit Health card                                                   */}
        {/* ----------------------------------------------------------------- */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <div style={cardTitleStyle}>Unit Health</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', marginBottom: '8px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {`Post ${property.propertyType === 'Villa' ? 'Internal' : 'External'} Inspection Score`}
              </div>
              <SpeedometerGauge
                label=""
                progress={property.insScore}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', marginBottom: '8px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {`Post ${property.propertyType === 'Villa' ? 'Internal' : 'External'} Recheck Score`}
              </div>
              <SpeedometerGauge
                label=""
                progress={property.reInsScore}
              />
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Inspection Space Breakdown                                        */}
        {/* ----------------------------------------------------------------- */}
        {Array.isArray(property.inspectionDetail) && property.inspectionDetail.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>List of Spaces</h2>
            </div>

            {/* Summary table header */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    {['No.', 'Space', 'Area Measurement', 'Quality', 'Brand Check', 'Material Check', 'Dimension Check', ''].map((h) => (
                      <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontSize: '0.8125rem', fontWeight: 600, color: '#495057', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {property.inspectionDetail.map((space: any, i: number) => {
                    const insp = space.inspection || {};
                    const isExpanded = expandedSpaces.has(i);
                    const hasReport = insp.report?.issue || (insp.report?.pictures?.length ?? 0) > 0;
                    const spaceName = space.inspectionTypes === 'COMMON_AREA' || space.inspectionTypes === 'EXTERNAL'
                      ? (space.otherSpaceName || 'Other Space')
                      : (space.inspectionTypes || 'Space');
                    const checkIcon = (
                      <i className="ri-checkbox-circle-fill" style={{ color: '#6CBE00', fontSize: '17px', lineHeight: '16px' }} />
                    );
                    const dashIcon = <span style={{ color: '#aaa' }}>–</span>;

                    return (
                      <>
                        {/* Summary row */}
                        <tr
                          key={`row-${i}`}
                          onClick={() => {
                            const next = new Set(expandedSpaces);
                            if (next.has(i)) next.delete(i); else next.add(i);
                            setExpandedSpaces(next);
                          }}
                          style={{ cursor: 'pointer', backgroundColor: isExpanded ? '#f0f4ff' : 'white' }}
                          onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f9fafb'; }}
                          onMouseLeave={(e) => { if (!isExpanded) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'white'; }}
                        >
                          <td style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid #dee2e6' }}>{i + 1}</td>
                          <td style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid #dee2e6', fontWeight: 500 }}>
                            {spaceName}
                            {hasReport && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setReportedIssue({ issue: insp.report?.issue || '', pictures: insp.report?.pictures || [] }); }}
                                title="View reported issue"
                                style={{ marginLeft: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#FDB93F', fontSize: '15px', padding: 0, verticalAlign: 'middle', position: 'relative', top: '1px' }}
                              >⚠</button>
                            )}
                          </td>
                          <td style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                            {(insp.measurement?.length ?? 0) > 0 ? checkIcon : dashIcon}
                          </td>
                          <td style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                            {(insp.quality?.length ?? 0) > 0 ? checkIcon : dashIcon}
                          </td>
                          <td style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                            {(insp.brand?.length ?? 0) > 0 ? checkIcon : dashIcon}
                          </td>
                          <td style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                            {(insp.material?.length ?? 0) > 0 ? checkIcon : dashIcon}
                          </td>
                          <td style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                            {(insp.dimension?.length ?? 0) > 0 ? checkIcon : dashIcon}
                          </td>
                          <td style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid #dee2e6', textAlign: 'center', color: '#0066cc' }}>
                            {isExpanded ? '▲' : '▼'}
                          </td>
                        </tr>

                        {/* Expanded detail row — matches Angular .tab-box .collapse-style styling */}
                        {isExpanded && (
                          <tr key={`detail-${i}`}>
                            <td colSpan={8} style={{ borderBottom: '2px solid #dee2e6', padding: 0 }}>
                              <div style={{ borderTop: '2px solid #f1f5f7', padding: '10px 5px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>

                                {/* Space images — full width */}
                                {(insp.images?.length ?? 0) > 0 && (
                                  <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={{ backgroundColor: '#F2F8FF', borderRadius: '4px', marginBottom: '0' }}>
                                      <h5 style={{ margin: 0, padding: '15px', fontSize: '0.875rem', fontWeight: 600, color: '#000', backgroundColor: '#FDB93F', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Pictures of the space
                                        <i className="ri-checkbox-circle-fill" style={{ color: '#6CBE00', fontSize: '17px', lineHeight: '16px' }} />
                                      </h5>
                                      <div style={{ padding: '10px 15px', display: 'flex', flexWrap: 'wrap' }}>
                                        {(insp.images as string[]).map((img: string, j: number) => (
                                          <a key={j} href={img} target="_blank" rel="noopener noreferrer">
                                            <div style={{ width: '100px', height: '100px', backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#f8f9fa', borderRadius: '6px', marginRight: '10px', marginBottom: '10px', cursor: 'pointer', border: '1px solid #dee2e6' }} />
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Area Measurement */}
                                {(insp.measurement?.length ?? 0) > 0 && (
                                  <div style={{ backgroundColor: '#F2F8FF', borderRadius: '4px' }}>
                                    <h5 style={{ margin: 0, padding: '15px', fontSize: '0.875rem', fontWeight: 600, color: '#000', backgroundColor: '#FDB93F', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      Area Measurement
                                      <i className="ri-checkbox-circle-fill" style={{ color: '#6CBE00', fontSize: '17px', lineHeight: '16px' }} />
                                    </h5>
                                    <div style={{ padding: '8px' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                                        <thead>
                                          <tr style={{ backgroundColor: '#F2F8FF' }}>
                                            {['No.', 'Length (mm)', 'Breadth (mm)', 'Total (in²)'].map(h => (
                                              <th key={h} style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #eff2f7', fontWeight: 600, color: '#555', fontSize: '0.75rem' }}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(insp.measurement as any[]).map((m: any, j: number) => (
                                            <tr key={j}>
                                              <td style={{ padding: '6px 8px', borderTop: '1px solid #eff2f7', fontSize: '0.8125rem' }}>{j + 1}</td>
                                              <td style={{ padding: '6px 8px', borderTop: '1px solid #eff2f7', fontSize: '0.8125rem' }}>{m.length || '–'}</td>
                                              <td style={{ padding: '6px 8px', borderTop: '1px solid #eff2f7', fontSize: '0.8125rem' }}>{m.breadth || '–'}</td>
                                              <td style={{ padding: '6px 8px', borderTop: '1px solid #eff2f7', fontSize: '0.8125rem' }}>{m.total || '–'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* Brand Check */}
                                {(insp.brand?.length ?? 0) > 0 && (
                                  <div style={{ backgroundColor: '#F2F8FF', borderRadius: '4px' }}>
                                    <h5 style={{ margin: 0, padding: '15px', fontSize: '0.875rem', fontWeight: 600, color: '#000', backgroundColor: '#FDB93F', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      Brand Check
                                      <i className="ri-checkbox-circle-fill" style={{ color: '#6CBE00', fontSize: '17px', lineHeight: '16px' }} />
                                    </h5>
                                    <div style={{ padding: '8px' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                                        <thead>
                                          <tr style={{ backgroundColor: '#F2F8FF' }}>
                                            {['No.', 'Item', 'Brand'].map(h => (
                                              <th key={h} style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #eff2f7', fontWeight: 600, color: '#555', fontSize: '0.75rem' }}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(insp.brand as any[]).map((b: any, j: number) => (
                                            <tr key={j}>
                                              <td style={{ padding: '6px 8px', borderTop: '1px solid #eff2f7', fontSize: '0.8125rem' }}>{j + 1}</td>
                                              <td style={{ padding: '6px 8px', borderTop: '1px solid #eff2f7', fontSize: '0.8125rem' }}>{b.item || b.name || '–'}</td>
                                              <td style={{ padding: '6px 8px', borderTop: '1px solid #eff2f7', fontSize: '0.8125rem' }}>{b.selectedAnser || b.brand || '–'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* Material Check */}
                                {(insp.material?.length ?? 0) > 0 && (
                                  <div style={{ backgroundColor: '#F2F8FF', borderRadius: '4px' }}>
                                    <h5 style={{ margin: 0, padding: '15px', fontSize: '0.875rem', fontWeight: 600, color: '#000', backgroundColor: '#FDB93F', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      Material Check
                                      <i className="ri-checkbox-circle-fill" style={{ color: '#6CBE00', fontSize: '17px', lineHeight: '16px' }} />
                                    </h5>
                                    <div style={{ padding: '8px' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                                        <thead>
                                          <tr style={{ backgroundColor: '#F2F8FF' }}>
                                            {['No.', 'Item', 'Material'].map(h => (
                                              <th key={h} style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #eff2f7', fontWeight: 600, color: '#555', fontSize: '0.75rem' }}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(insp.material as any[]).map((m: any, j: number) => (
                                            <tr key={j}>
                                              <td style={{ padding: '6px 8px', borderTop: '1px solid #eff2f7', fontSize: '0.8125rem' }}>{j + 1}</td>
                                              <td style={{ padding: '6px 8px', borderTop: '1px solid #eff2f7', fontSize: '0.8125rem' }}>{m.item || m.name || '–'}</td>
                                              <td style={{ padding: '6px 8px', borderTop: '1px solid #eff2f7', fontSize: '0.8125rem' }}>{m.selectedAnser || m.material || '–'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* Dimension Check */}
                                {(insp.dimension?.length ?? 0) > 0 && (
                                  <div style={{ backgroundColor: '#F2F8FF', borderRadius: '4px' }}>
                                    <h5 style={{ margin: 0, padding: '15px', fontSize: '0.875rem', fontWeight: 600, color: '#000', backgroundColor: '#FDB93F', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      Dimension Check
                                      <i className="ri-checkbox-circle-fill" style={{ color: '#6CBE00', fontSize: '17px', lineHeight: '16px' }} />
                                    </h5>
                                    <div style={{ padding: '8px' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                                        <thead>
                                          <tr style={{ backgroundColor: '#F2F8FF' }}>
                                            {['No.', 'Item', 'Value'].map(h => (
                                              <th key={h} style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #eff2f7', fontWeight: 600, color: '#555', fontSize: '0.75rem' }}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(insp.dimension as any[]).map((d: any, j: number) => (
                                            <tr key={j}>
                                              <td style={{ padding: '6px 8px', borderTop: '1px solid #eff2f7', fontSize: '0.8125rem' }}>{j + 1}</td>
                                              <td style={{ padding: '6px 8px', borderTop: '1px solid #eff2f7', fontSize: '0.8125rem' }}>{d.item || d.name || '–'}</td>
                                              <td style={{ padding: '6px 8px', borderTop: '1px solid #eff2f7', fontSize: '0.8125rem' }}>{d.selectedAnser || d.value || '–'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* Quality — full width, numbered list style matching .quality-ul */}
                                {(insp.quality?.length ?? 0) > 0 && (
                                  <div style={{ gridColumn: '1 / -1', backgroundColor: '#F2F8FF', borderRadius: '4px' }}>
                                    <h5 style={{ margin: 0, padding: '15px', fontSize: '0.875rem', fontWeight: 600, color: '#000', backgroundColor: '#FDB93F', borderTopLeftRadius: '4px', borderTopRightRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      Quality
                                      <i className="ri-checkbox-circle-fill" style={{ color: '#6CBE00', fontSize: '17px', lineHeight: '16px' }} />
                                    </h5>
                                    <div style={{ padding: '10px 15px' }}>
                                      <ol style={{ margin: 0, paddingLeft: '17px' }}>
                                        {(insp.quality as any[]).map((q: any, j: number) => (
                                          <li key={j} style={{ color: '#363636', fontSize: '12px', lineHeight: '23px', position: 'relative', listStyleType: 'decimal', marginBottom: '10px' }}>
                                            <strong style={{ fontSize: '13px' }}>{q.item || `Item ${j + 1}`}</strong>
                                            {/* Answer with arrow bullet — matches .d-answer */}
                                            <span style={{ display: 'block', paddingLeft: '14px', lineHeight: '14px', marginTop: '5px', marginBottom: '3px', position: 'relative' }}>
                                              <span style={{ position: 'absolute', left: 0, top: '2px', fontSize: '10px', color: '#777' }}>›</span>
                                              {q.selectedAnser || '–'}
                                            </span>
                                            {/* Per-item quality photos — 100×100px matching .quality-bg .bg_img */}
                                            {(q.pictures?.length ?? 0) > 0 && (
                                              <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '5px' }}>
                                                {(q.pictures as string[]).map((pic: string, k: number) => (
                                                  <a key={k} href={pic} target="_blank" rel="noopener noreferrer">
                                                    <div style={{ width: '100px', height: '100px', backgroundImage: `url(${pic})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#f8f9fa', borderRadius: '6px', marginRight: '10px', marginBottom: '10px', cursor: 'pointer', border: '1px solid #dee2e6' }} />
                                                  </a>
                                                ))}
                                              </div>
                                            )}
                                            {q.issue && (
                                              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#363636' }}>
                                                <strong>Reported issue:-</strong>{q.issue}
                                              </p>
                                            )}
                                          </li>
                                        ))}
                                      </ol>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Video Management + Water Quality                                  */}
        {/* ----------------------------------------------------------------- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>

          {/* Video Management */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>Video Management</div>
            {/* Saved video URL — show as iframe (matches old Angular pattern) */}
            {property.videoUrl && (
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ fontSize: '0.8125rem', display: 'block', marginBottom: '4px' }}>Video Url</strong>
                <iframe
                  src={property.videoUrl}
                  style={{ borderRadius: '5px', border: '1px solid #eee' }}
                  width="150"
                  height="75"
                  allowFullScreen
                />
              </div>
            )}
            {/* Saved thumbnail — 150×75px matching old Angular */}
            {property.videoThumbnail && (
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ fontSize: '0.8125rem', display: 'block', marginBottom: '4px' }}>Video Thumbnail</strong>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={property.videoThumbnail} alt="Video thumbnail" style={{ height: '75px', width: '150px', borderRadius: '5px', border: '1px solid #eee', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Video URL</label>
                <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>Thumbnail URL</label>
                <input type="url" value={videoThumbnailUrl} onChange={(e) => setVideoThumbnailUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleSaveVideo} disabled={savingVideo} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: savingVideo ? 0.7 : 1, alignSelf: 'flex-start' }}>
                {savingVideo ? 'Saving...' : 'Update Video Details'}
              </button>
              {videoMsg && <p style={{ fontSize: '0.8125rem', color: videoMsg.includes('saved') ? '#065f46' : '#dc3545', margin: 0 }}>{videoMsg}</p>}
            </div>
          </div>

          {/* Water Quality inline — matches Angular water quality form */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>Water Quality</div>
            {wqData && (
              <div style={{ marginBottom: '1rem', padding: '0.625rem 0.875rem', backgroundColor: '#f0fdf4', borderRadius: '4px', fontSize: '0.875rem', border: '1px solid #bbf7d0' }}>
                PH: <strong>{wqData.ph ?? '-'}</strong> &nbsp;|&nbsp; TDS: <strong>{wqData.tds ?? '-'}</strong>
                {wqData.hardness && <>&nbsp;|&nbsp; Hardness: <strong>{wqData.hardness}</strong></>}
                {wqData.result && <>&nbsp;|&nbsp; Result: <strong style={{ color: wqData.result === 'Pass' ? '#6CBE00' : wqData.result === 'Fail' ? '#dc3545' : '#FDB93F' }}>{wqData.result}</strong></>}
              </div>
            )}
            {/* 2-column grid for compact form — matches old Angular side-by-side fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.2rem', color: '#374151' }}>PH Value</label>
                <input type="number" step="0.1" min="0" max="14" value={wqPh} onChange={(e) => setWqPh(e.target.value)} placeholder="e.g. 7.2" style={{ width: '100%', padding: '0.4rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.8125rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.2rem', color: '#374151' }}>TDS</label>
                <input type="number" step="0.1" min="0" value={wqTds} onChange={(e) => setWqTds(e.target.value)} placeholder="e.g. 250" style={{ width: '100%', padding: '0.4rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.8125rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.2rem', color: '#374151' }}>Hardness</label>
                <input type="number" step="0.1" min="0" value={wqHardness} onChange={(e) => setWqHardness(e.target.value)} placeholder="mg/L" style={{ width: '100%', padding: '0.4rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.8125rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.2rem', color: '#374151' }}>Chlorine</label>
                <input type="number" step="0.01" min="0" value={wqChlorine} onChange={(e) => setWqChlorine(e.target.value)} placeholder="mg/L" style={{ width: '100%', padding: '0.4rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.8125rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.2rem', color: '#374151' }}>Test Date</label>
                <input type="date" value={wqTestDate} onChange={(e) => setWqTestDate(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.8125rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.2rem', color: '#374151' }}>Result</label>
                <select value={wqResult} onChange={(e) => setWqResult(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.8125rem', boxSizing: 'border-box', backgroundColor: '#fff' }}>
                  <option value="">Select</option>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                  <option value="Retest">Retest</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.2rem', color: '#374151' }}>Remarks</label>
                <textarea value={wqRemarks} onChange={(e) => setWqRemarks(e.target.value)} placeholder="Optional remarks..." rows={2} style={{ width: '100%', padding: '0.4rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.8125rem', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={handleSaveWaterQuality} disabled={savingWq} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#0054A8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: savingWq ? 0.7 : 1 }}>
                {savingWq ? 'Saving...' : (wqData ? 'Update Water Quality' : 'Add Water Quality')}
              </button>
              {wqMsg && <p style={{ fontSize: '0.8125rem', color: wqMsg.includes('saved') ? '#065f46' : '#dc3545', margin: 0 }}>{wqMsg}</p>}
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Actions row                                                        */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          {/* Back */}
          <button
            onClick={() => router.back()}
            style={{
              padding: '0.5rem 1.25rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white';
            }}
          >
            Back
          </button>

          {/* Edit */}
          <button
            onClick={openEdit}
            style={{
              padding: '0.5rem 1.25rem',
              border: '1px solid #0066cc',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#0066cc',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e8f0fb'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white'; }}
          >
            Edit
          </button>

          {/* Send Report — btn-primary (#0054A8) matches Angular */}
          <button
            onClick={handleSendReport}
            disabled={sendingReport}
            style={{ padding: '0.5rem 1.5rem', backgroundColor: sendingReport ? '#4d88cc' : '#0054A8', color: 'white', border: 'none', borderRadius: '4px', cursor: sendingReport ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}
          >
            {sendingReport ? 'Sending...' : 'Send Report'}
          </button>

          {/* View/Download Report — btn-danger matches Angular */}
          <button
            onClick={handleGenerateReport}
            disabled={reportLoading}
            style={{ padding: '0.5rem 1.5rem', backgroundColor: reportLoading ? '#e07474' : '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: reportLoading ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            {reportLoading && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            )}
            {reportLoading ? 'Generating...' : 'View/Download Report'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ----------------------------------------------------------------- */}
      {/* Reported Issue Modal                                               */}
      {/* ----------------------------------------------------------------- */}
      {reportedIssue && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setReportedIssue(null)}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Reported Issue</h5>
              <button onClick={() => setReportedIssue(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#888', lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              {reportedIssue.pictures.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Pictures of Issue</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {reportedIssue.pictures.map((pic, i) => (
                      <a key={i} href={pic} target="_blank" rel="noopener noreferrer">
                        <div style={{ width: '100px', height: '100px', backgroundImage: `url(${pic})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#f8f9fa', borderRadius: '6px', marginRight: '10px', marginBottom: '10px', cursor: 'pointer', border: '1px solid #dee2e6', display: 'inline-block' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {reportedIssue.issue && (
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>Reported Issue</div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151', backgroundColor: '#f8f9fa', padding: '0.75rem', borderRadius: '4px' }}>{reportedIssue.issue}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Edit Inspection Modal                                              */}
      {/* ----------------------------------------------------------------- */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Inspection" size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {editError && (
            <div style={{ backgroundColor: '#f8d7da', color: '#842029', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>{editError}</div>
          )}

          {/* Property Details */}
          <p style={{ margin: 0, fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Property Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Property Name</label>
              <input type="text" value={editForm.propertyName || ''} onChange={(e) => setEditForm((f: any) => ({ ...f, propertyName: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Property Type</label>
              <select value={editForm.propertyType || 'Apartment'} onChange={(e) => setEditForm((f: any) => ({ ...f, propertyType: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }}>
                <option value="Apartment">Apartment</option>
                <option value="Villa">Villa</option>
                <option value="Plot">Plot</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Address</label>
              <input type="text" value={editForm.address || ''} onChange={(e) => setEditForm((f: any) => ({ ...f, address: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>City</label>
              <input type="text" value={editForm.city || ''} onChange={(e) => setEditForm((f: any) => ({ ...f, city: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Unit No.</label>
              <input type="text" value={editForm.unitNo || ''} onChange={(e) => setEditForm((f: any) => ({ ...f, unitNo: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Bedrooms</label>
              <select value={editForm.bedrooms || ''} onChange={(e) => setEditForm((f: any) => ({ ...f, bedrooms: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }}>
                <option value="">Select</option>
                {['Studio', '1BHK', '2BHK', '3BHK', '4BHK', '5BHK', '5BHK+'].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Size (sqft)</label>
              <input type="number" value={editForm.size || ''} onChange={(e) => setEditForm((f: any) => ({ ...f, size: e.target.value }))} min="0"
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Booking Details */}
          <p style={{ margin: 0, fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Booking Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Booking Status</label>
              <select value={editForm.bookingStatus || 'Pending'} onChange={(e) => setEditForm((f: any) => ({ ...f, bookingStatus: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }}>
                {['Pending', 'Assigned', 'Completed', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Inspection Date</label>
              <input type="date" value={editForm.inspectionDate || ''} onChange={(e) => setEditForm((f: any) => ({ ...f, inspectionDate: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Inspection Time</label>
              <input type="time" value={editForm.inspectionTime || ''} onChange={(e) => setEditForm((f: any) => ({ ...f, inspectionTime: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Customer Details */}
          <p style={{ margin: 0, fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Customer Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Customer Name <span style={{ color: 'red' }}>*</span></label>
              <input type="text" value={editForm.ownerName || ''} onChange={(e) => setEditForm((f: any) => ({ ...f, ownerName: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Phone</label>
              <input type="tel" value={editForm.ownerPhone || ''} onChange={(e) => setEditForm((f: any) => ({ ...f, ownerPhone: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Email</label>
              <input type="email" value={editForm.ownerEmail || ''} onChange={(e) => setEditForm((f: any) => ({ ...f, ownerEmail: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <button onClick={() => setShowEditModal(false)} style={{ padding: '0.5rem 1.25rem', border: '1px solid #ddd', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>
              Cancel
            </button>
            <button onClick={handleEdit} disabled={editSaving} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: editSaving ? 0.7 : 1 }}>
              {editSaving ? 'Saving...' : 'Update Inspection'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
