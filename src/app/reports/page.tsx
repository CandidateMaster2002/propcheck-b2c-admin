'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Pagination from '@/components/Pagination';

const DATE_PRESETS = ['All Time', 'This Month', 'Last Month', 'Last 30 Days', 'Last 7 Days'];

function getDateRange(preset: string): { startDate: string; endDate: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (preset) {
    case 'This Month': {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case 'Last Month': {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: fmt(s), endDate: fmt(e) };
    }
    case 'Last 30 Days': {
      const s = new Date(today); s.setDate(s.getDate() - 29);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case 'Last 7 Days': {
      const s = new Date(today); s.setDate(s.getDate() - 6);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    default: return { startDate: '', endDate: '' };
  }
}

export default function ReportsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState('All Time');
  const [statusFilter, setStatusFilter] = useState('Completed');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [stats, setStats] = useState({ total: 0, avgScore: 0, defectsFound: 0, withReports: 0 });

  // Reports list
  const [reports, setReports] = useState<any[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Auth
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (!res.ok) { router.push('/login'); return; }
        const d = await res.json();
        if (d.status && d.data) { setUser(d.data); setAuthChecked(true); }
        else router.push('/login');
      } catch { router.push('/login'); }
    };
    check();
  }, [router]);

  // Fetch reports
  const fetchReports = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(datePreset);
      const params = new URLSearchParams({
        limit: String(ITEMS_PER_PAGE),
        page: String(page),
      });
      if (statusFilter) params.set('bookingStatus', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/properties?${params}`);
      const d = await res.json();

      if (d.status) {
        const data = d.data || [];
        setReports(data);
        setTotalReports(d.total || 0);

        // Compute stats
        const completed = data.filter((p: any) => p.bookingStatus === 'Completed');
        const scores = completed.map((p: any) =>
          p.inspectionData?.overallhealthrating || p.overallhealthrating || 0
        ).filter((s: number) => s > 0);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
        const withReports = data.filter((p: any) => p.reportUrl).length;

        setStats({
          total: d.total || 0,
          avgScore,
          defectsFound: completed.length * 3, // estimate — update when defects API is available
          withReports,
        });
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [datePreset, statusFilter, searchQuery]);

  useEffect(() => {
    if (!authChecked) return;
    setCurrentPage(1);
    fetchReports(1);
  }, [authChecked, datePreset, statusFilter, fetchReports]);

  // Export CSV
  const exportCSV = () => {
    const headers = ['No.', 'Property Name', 'Type', 'Address', 'Customer', 'Inspector', 'Status', 'Inspection Date', 'Score', 'Report URL'];
    const rows = reports.map((p, i) => [
      i + 1,
      p.propertyName || '-',
      p.propertyType || '-',
      p.address || '-',
      p.ownerName || '-',
      p.inspectorId?.name || '-',
      p.bookingStatus || '-',
      p.inspectionDate ? new Date(p.inspectionDate).toLocaleDateString('en-IN') : '-',
      p.inspectionData?.overallhealthrating || p.overallhealthrating || '-',
      p.reportUrl || '-',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inspection_reports_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!authChecked || !user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading...</p></div>;
  }

  const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontSize: '0.8125rem', fontWeight: 600, color: '#444', backgroundColor: '#f5f5f5', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem', fontSize: '0.875rem', borderBottom: '1px solid #f0f0f0', color: '#374151' };
  const inputStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.875rem', backgroundColor: '#fff' };

  const totalPages = Math.max(1, Math.ceil(totalReports / ITEMS_PER_PAGE));

  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Inspection Reports</h1>
          <button onClick={exportCSV} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
            Export CSV
          </button>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Inspections', value: loading ? '...' : stats.total, color: '#0066cc', icon: '📋' },
            { label: 'Avg. Health Score', value: loading ? '...' : (stats.avgScore > 0 ? `${stats.avgScore}%` : '-'), color: '#28a745', icon: '📊' },
            { label: 'With Reports', value: loading ? '...' : stats.withReports, color: '#6f42c1', icon: '📄' },
            { label: 'Completed', value: loading ? '...' : reports.filter((r) => r.bookingStatus === 'Completed').length, color: '#fd7e14', icon: '✅' },
          ].map((card) => (
            <div key={card.label} style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${card.color}` }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.4rem' }}>{card.icon} {card.label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500, color: '#555' }}>Date Range</label>
              <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                {DATE_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500, color: '#555' }}>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                <option value="">All Statuses</option>
                {['Pending', 'Assigned', 'Completed', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500, color: '#555' }}>Search</label>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Property name, customer..." style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <button onClick={() => { setCurrentPage(1); fetchReports(1); }}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
              Inspection Report List
              {totalReports > 0 && <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '0.5rem' }}>({totalReports} total)</span>}
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr>
                  {['No.', 'Property Name', 'Type', 'Customer', 'Inspector', 'Inspection Date', 'Status', 'Health Score', 'Report', 'Actions'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ ...tdStyle, textAlign: 'center', padding: '2rem', color: '#999' }}>Loading...</td></tr>
                ) : reports.length === 0 ? (
                  <tr><td colSpan={10} style={{ ...tdStyle, textAlign: 'center', padding: '2rem', color: '#999' }}>No reports found for the selected filters</td></tr>
                ) : (
                  reports.map((p, i) => {
                    const score = p.inspectionData?.overallhealthrating || p.overallhealthrating || 0;
                    const statusColor: Record<string, string> = { Completed: '#d4edda', Pending: '#fff3cd', Assigned: '#cce5ff', Cancelled: '#f8d7da' };
                    const statusTextColor: Record<string, string> = { Completed: '#155724', Pending: '#856404', Assigned: '#004085', Cancelled: '#721c24' };
                    return (
                      <tr key={p._id} onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#fafafa'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}>
                        <td style={tdStyle}>{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.propertyName || '-'}</td>
                        <td style={tdStyle}>{p.propertyType || '-'}</td>
                        <td style={{ ...tdStyle, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.ownerName || '-'}</td>
                        <td style={{ ...tdStyle, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.inspectorId?.name || '-'}</td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{p.inspectionDate ? new Date(p.inspectionDate).toLocaleDateString('en-IN') : '-'}</td>
                        <td style={tdStyle}>
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: statusColor[p.bookingStatus] || '#f8f9fa', color: statusTextColor[p.bookingStatus] || '#333' }}>
                            {p.bookingStatus || '-'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {score > 0 ? (
                            <span style={{ fontWeight: 600, color: score >= 80 ? '#28a745' : score >= 60 ? '#fd7e14' : '#dc3545' }}>{Math.round(score)}%</span>
                          ) : '-'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {p.reportUrl ? (
                            <a href={p.reportUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '0.2rem 0.6rem', backgroundColor: '#0066cc', color: 'white', borderRadius: '4px', fontSize: '0.75rem', textDecoration: 'none' }}>
                              View
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Not available</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <button onClick={() => router.push(`/inspections/${p._id}`)} style={{ padding: '0.25rem 0.75rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8125rem' }}>
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #f0f0f0' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalReports}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={(p) => { setCurrentPage(p); fetchReports(p); }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
