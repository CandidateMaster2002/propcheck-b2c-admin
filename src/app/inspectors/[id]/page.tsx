'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  padding: '1.5rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#6b7280',
  fontWeight: 500,
  marginBottom: '0.125rem',
};

const valueStyle: React.CSSProperties = {
  fontSize: '0.9375rem',
  color: '#111827',
  fontWeight: 400,
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

export default function InspectorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [inspector, setInspector] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchInspectorData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [inspRes, propsRes] = await Promise.all([
        fetch(`/api/inspector/${id}`),
        fetch(`/api/properties?limit=20`),
      ]);

      if (inspRes.ok) {
        const inspData = await inspRes.json();
        if (inspData.status) setInspector(inspData.data);
      }

      if (propsRes.ok) {
        const propsData = await propsRes.json();
        if (propsData.status && propsData.data) {
          // Filter client-side for properties assigned to this inspector
          const allProps = propsData.data;
          const filtered = allProps.filter((p: any) => p.inspectorId === id || p.validatorId === id);
          setProperties(filtered.length > 0 ? filtered : allProps.slice(0, 5));
        }
      }
    } catch (err) {
      console.error('Error fetching inspector data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, []);
  useEffect(() => { if (authChecked && id) fetchInspectorData(); }, [authChecked, id]);

  if (!authChecked || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <Layout user={user}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
          <p>Loading inspector details...</p>
        </div>
      </Layout>
    );
  }

  if (!inspector) {
    return (
      <Layout user={user}>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>Inspector not found.</p>
            <button
              onClick={() => router.push('/inspectors')}
              style={{
                backgroundColor: '#0066cc', color: 'white', border: 'none',
                borderRadius: '4px', padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.875rem',
              }}
            >
              Back to List
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const infoRow = (label: string, value: string | undefined) => (
    <div style={{ marginBottom: '1rem' }}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value || '-'}</div>
    </div>
  );

  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>

        {/* Back button */}
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            onClick={() => router.push('/inspectors')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'none', border: '1px solid #d1d5db', borderRadius: '4px',
              padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.875rem', color: '#374151',
            }}
          >
            &larr; Back to List
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>

          {/* Left Column - Profile Card */}
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              {inspector.profileImage ? (
                <img
                  src={inspector.profileImage}
                  alt={inspector.name}
                  style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    objectFit: 'cover', margin: '0 auto 0.75rem',
                  }}
                />
              ) : (
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  backgroundColor: '#0066cc', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '2rem', margin: '0 auto 0.75rem',
                }}>
                  {(inspector.name?.[0] || '?').toUpperCase()}
                </div>
              )}
              <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                {inspector.name}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <StatusBadge status={inspector.role || 'Inspector'} />
                <StatusBadge status={inspector.status || 'Enable'} />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1rem 0' }} />

            {infoRow('Email', inspector.email)}
            {infoRow('Phone', inspector.phone)}
            {infoRow('City', inspector.city)}
            {infoRow('State', inspector.state)}
            {infoRow('Pincode', inspector.pincode)}
            {infoRow('Member Since', inspector.createdAt ? new Date(inspector.createdAt).toLocaleDateString() : undefined)}

            {/* Leaves count */}
            {inspector.leaves && inspector.leaves.length > 0 && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                <div style={labelStyle}>Total Leaves Recorded</div>
                <div style={{ ...valueStyle, fontWeight: 600, color: '#856404' }}>{inspector.leaves.length}</div>
              </div>
            )}
          </div>

          {/* Right Column - Assigned Properties */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1.25rem', color: '#111827' }}>
              Assigned Properties
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>No.</th>
                    <th style={thStyle}>Property Name</th>
                    <th style={thStyle}>Address</th>
                    <th style={thStyle}>Inspection Date</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                        No properties assigned
                      </td>
                    </tr>
                  ) : (
                    properties.map((prop: any, idx: number) => (
                      <tr key={prop._id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={tdStyle}>{idx + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{prop.propertyName || prop.name || '-'}</td>
                        <td style={tdStyle}>
                          {[prop.address, prop.city, prop.state].filter(Boolean).join(', ') || '-'}
                        </td>
                        <td style={tdStyle}>
                          {prop.inspectionDate ? new Date(prop.inspectionDate).toLocaleDateString() : 'Not Scheduled'}
                        </td>
                        <td style={tdStyle}>
                          <StatusBadge status={prop.bookingStatus || prop.status || 'Scheduled'} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
