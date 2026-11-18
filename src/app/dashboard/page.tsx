'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ApexChart from '@/components/ApexChart';

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function fmt(d: Date) {
  return d.toISOString().split('T')[0];
}

function getDateRange(preset: string): { startDate: string; endDate: string; label: string } {
  const today = new Date();
  switch (preset) {
    case 'Today':
      return { startDate: fmt(today), endDate: fmt(today), label: 'Today' };
    case 'Yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { startDate: fmt(y), endDate: fmt(y), label: 'Yesterday' };
    }
    case 'Last 7 Days': {
      const s = new Date(today); s.setDate(s.getDate() - 6);
      return { startDate: fmt(s), endDate: fmt(today), label: 'Last 7 Days' };
    }
    case 'Last 30 Days': {
      const s = new Date(today); s.setDate(s.getDate() - 29);
      return { startDate: fmt(s), endDate: fmt(today), label: 'Last 30 Days' };
    }
    case 'This Month': {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: fmt(s), endDate: fmt(today), label: 'This Month' };
    }
    case 'Last Month': {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: fmt(s), endDate: fmt(e), label: 'Last Month' };
    }
    default: {
      const s = new Date(today); s.setDate(s.getDate() - 6);
      return { startDate: fmt(s), endDate: fmt(today), label: 'Last 7 Days' };
    }
  }
}

function fmtDisplay(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const DATE_PRESETS = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month'];

const SELECT_STYLE: React.CSSProperties = {
  padding: '0.3rem 0.5rem',
  border: '1px solid #ced4da',
  borderRadius: '3px',
  fontSize: '0.8125rem',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // filters
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedInspector, setSelectedInspector] = useState('');
  const [datePreset, setDatePreset] = useState('Last 7 Days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [cityList, setCityList] = useState<{ cityName: string }[]>([]);
  const [inspectorList, setInspectorList] = useState<any[]>([]);

  // stats tiles
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // chart
  const [graphDates, setGraphDates] = useState<string[]>([]);
  const [graphCounts, setGraphCounts] = useState<number[]>([]);
  const [graphLoading, setGraphLoading] = useState(true);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.status && d?.data) { setUser(d.data); setAuthChecked(true); }
        else router.push('/login');
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // ── Load stats tiles ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!authChecked) return;
    setStatsLoading(true);
    fetch('/api/dashboard/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.status) setStats(d.data); })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [authChecked]);

  // ── Load cities once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!authChecked) return;
    fetch('/api/dashboard/cities')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.status && Array.isArray(d.data)) {
          setCityList(d.data.map((name: string) => ({ cityName: name })));
        }
      })
      .catch(() => {});
  }, [authChecked]);

  // ── Load inspectors (filtered by city) ───────────────────────────────────
  const fetchInspectors = useCallback((city: string) => {
    const params = new URLSearchParams({ limit: '200' });
    if (city) params.set('city', city);
    fetch(`/api/inspector?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.status && Array.isArray(d.data)) setInspectorList(d.data);
        else setInspectorList([]);
      })
      .catch(() => setInspectorList([]));
  }, []);

  useEffect(() => {
    if (authChecked) fetchInspectors('');
  }, [authChecked, fetchInspectors]);

  // ── Load graph data ───────────────────────────────────────────────────────
  const fetchGraph = useCallback((city: string, inspectorId: string, preset: string, cStart?: string, cEnd?: string) => {
    setGraphLoading(true);
    const { startDate, endDate } = (cStart && cEnd) ? { startDate: cStart, endDate: cEnd } : getDateRange(preset);
    const params = new URLSearchParams({ startDate, endDate });
    if (city) params.set('city', city);
    if (inspectorId) params.set('inspectorId', inspectorId);
    fetch(`/api/dashboard/graph?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.status && d?.data) {
          setGraphDates(d.data.dates || []);
          setGraphCounts(d.data.counts || []);
        } else {
          setGraphDates([]); setGraphCounts([]);
        }
      })
      .catch(() => { setGraphDates([]); setGraphCounts([]); })
      .finally(() => setGraphLoading(false));
  }, []);

  useEffect(() => {
    if (authChecked) fetchGraph(selectedCity, selectedInspector, datePreset, useCustom ? customStart : '', useCustom ? customEnd : '');
  }, [authChecked, fetchGraph, selectedCity, selectedInspector, datePreset, useCustom, customStart, customEnd]);

  // ── City change: reload inspectors + clear inspector selection ────────────
  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedInspector('');
    fetchInspectors(city);
  };

  // ── Chart config — matching old B2C colors exactly ────────────────────────
  const chartOptions = {
    chart: {
      type: 'line' as const,
      height: 300,
      toolbar: { show: false },
      dropShadow: { enabled: true, color: '#000', top: 18, left: 7, blur: 10, opacity: 0.2 },
    },
    colors: ['#0054A8'],
    dataLabels: { enabled: true },
    stroke: { curve: 'smooth' as const },
    grid: {
      borderColor: '#e7e7e7',
      row: { colors: ['#f3f3f3', 'transparent'], opacity: 0.5 },
    },
    markers: { size: 1 },
    xaxis: {
      categories: graphDates.map(d => {
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
    },
    yaxis: { title: { text: 'No. of Inspections' }, min: 0 },
  };

  const chartSeries = [{ name: 'Number of Inspection', color: '#0054A8', data: graphCounts }];

  const { startDate: presetStart, endDate: presetEnd, label } = getDateRange(datePreset);
  const startDate = useCustom && customStart ? customStart : presetStart;
  const endDate   = useCustom && customEnd  ? customEnd  : presetEnd;

  if (!authChecked || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <div>

        {/* Breadcrumb */}
        <div style={{ marginBottom: '1rem' }}>
          <ol style={{ display: 'flex', gap: '0.4rem', listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8125rem', color: '#6c757d' }}>
            <li><a href="#" style={{ color: '#6c757d', textDecoration: 'none' }}>Prop Right</a></li>
            <li>/</li>
            <li style={{ color: '#495057' }}>Dashboard</li>
          </ol>
        </div>

        {/* Stats tiles */}
        {statsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: '6px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '1rem', minHeight: '90px', opacity: 0.5 }} />
            ))}
          </div>
        ) : stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              {
                label: 'Total Properties',
                value: stats.properties?.total ?? 0,
                sub: null,
                color: '#0655a2',
              },
              {
                label: 'In Progress',
                value: stats.properties?.pending ?? 0,
                sub: stats.properties?.total ? `${Math.round((stats.properties.pending / stats.properties.total) * 100)}%` : null,
                color: '#f8b516',
              },
              {
                label: 'Completed',
                value: stats.properties?.completed ?? 0,
                sub: stats.properties?.total ? `${Math.round((stats.properties.completed / stats.properties.total) * 100)}%` : null,
                color: '#28a745',
              },
              {
                label: 'Inspectors',
                value: stats.inspectors?.total ?? 0,
                sub: stats.inspectors?.active != null ? `${stats.inspectors.active} active` : null,
                color: '#17a2b8',
              },
              {
                label: 'Agents',
                value: stats.agents?.total ?? 0,
                sub: null,
                color: '#6f42c1',
              },
            ].map(tile => (
              <div key={tile.label} style={{ background: '#fff', borderRadius: '6px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '1rem 1.25rem', borderLeft: `4px solid ${tile.color}` }}>
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tile.label}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: tile.color, lineHeight: 1 }}>{tile.value.toLocaleString()}</div>
                {tile.sub && <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>{tile.sub}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Filter + Chart Card */}
        <div style={{ background: '#fff', borderRadius: '6px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>

          {/* Filter bar */}
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>

              {/* Left: City + Inspector selects */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                  value={selectedCity}
                  onChange={e => handleCityChange(e.target.value)}
                  style={SELECT_STYLE}
                >
                  <option value="" disabled>Select City</option>
                  <option value="">All</option>
                  {cityList.map(c => (
                    <option key={c.cityName} value={c.cityName}>{c.cityName}</option>
                  ))}
                  {cityList.length === 0 && <option disabled>No City found!</option>}
                </select>

                <select
                  value={selectedInspector}
                  onChange={e => setSelectedInspector(e.target.value)}
                  style={{ ...SELECT_STYLE, minWidth: '180px' }}
                >
                  <option value="" disabled>Select Inspector</option>
                  <option value="">All</option>
                  {inspectorList.map(ins => (
                    <option key={ins._id} value={ins._id}>
                      {ins.name || ins.userName}&nbsp;({ins.email || ins.phone})
                    </option>
                  ))}
                  {inspectorList.length === 0 && <option disabled>No Inspector found!</option>}
                </select>
              </div>

              {/* Right: Date range */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                  value={useCustom ? 'Custom' : datePreset}
                  onChange={e => {
                    if (e.target.value === 'Custom') { setUseCustom(true); }
                    else { setUseCustom(false); setDatePreset(e.target.value); }
                  }}
                  style={SELECT_STYLE}
                >
                  {DATE_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="Custom">Custom Range</option>
                </select>
                {useCustom ? (
                  <>
                    <input
                      type="date"
                      value={customStart}
                      onChange={e => setCustomStart(e.target.value)}
                      style={{ ...SELECT_STYLE, padding: '0.25rem 0.4rem' }}
                    />
                    <span style={{ fontSize: '0.8125rem', color: '#888' }}>–</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={e => setCustomEnd(e.target.value)}
                      style={{ ...SELECT_STYLE, padding: '0.25rem 0.4rem' }}
                    />
                  </>
                ) : (
                  <span style={{ fontSize: '0.8125rem', color: '#555', whiteSpace: 'nowrap' }}>
                    <strong>{label}</strong>&ensp;
                    <span style={{ color: '#888' }}>{fmtDisplay(startDate)} – {fmtDisplay(endDate)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div style={{ padding: '1rem 1.25rem' }}>
            {graphLoading ? (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                Loading chart...
              </div>
            ) : graphDates.length === 0 ? (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                No inspection data for the selected range.
              </div>
            ) : (
              <ApexChart
                type="line"
                series={chartSeries}
                options={chartOptions}
                height={300}
                width="100%"
              />
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}
