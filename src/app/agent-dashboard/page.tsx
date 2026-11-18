'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ApexChart from '@/components/ApexChart';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentSummary {
  agentId: string;
  userName: string;
  phone: string;
  netAmount: number;
  incentiveAmount: number;
  count: number;
}

interface Statement {
  _id: string;
  inspectionId?: { _id: string; propertyName: string } | null;
  agentId?: { _id: string; name: string; phone: string } | null;
  bookingDate: string;
  customerName: string;
  agentName: string;
  couponCode: string;
  amount: number;
  discount: number;
  incentiveAmount: number;
  netAmount: number;
  customerAmount: number;
  isPaid: boolean;
  isIncentivePaid: boolean;
  utrNumber: string;
  incentivePaidDate: string;
}

type OptionOne = 'totalAmount' | 'incentiveAmount' | 'List of Agents';
type OptionTwo = 'All' | 'By Agent';

const DATE_PRESETS = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Last 6 Months', 'Last 1 Year', 'All Time'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateRange(preset: string): { startDate: string; endDate: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (preset) {
    case 'Today': return { startDate: fmt(today), endDate: fmt(today) };
    case 'Yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { startDate: fmt(y), endDate: fmt(y) };
    }
    case 'Last 7 Days': {
      const s = new Date(today); s.setDate(s.getDate() - 6);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case 'Last 30 Days': {
      const s = new Date(today); s.setDate(s.getDate() - 29);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case 'This Month': {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case 'Last Month': {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: fmt(s), endDate: fmt(e) };
    }
    case 'Last 6 Months': {
      const s = new Date(today); s.setMonth(s.getMonth() - 6);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case 'Last 1 Year': {
      const s = new Date(today); s.setFullYear(s.getFullYear() - 1);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case 'All Time': {
      return { startDate: '2020-01-01', endDate: fmt(today) };
    }
    default: {
      const s = new Date(today); s.setDate(s.getDate() - 6);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
  }
}

function buildDateAxis(startDate: string, endDate: string): { labels: string[]; mode: 'day' | 'month' } {
  const cur = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.ceil((end.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24));

  // If more than 60 days, group by month
  if (diffDays > 60) {
    const months: string[] = [];
    const mc = new Date(cur.getFullYear(), cur.getMonth(), 1);
    while (mc <= end) {
      months.push(mc.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));
      mc.setMonth(mc.getMonth() + 1);
    }
    return { labels: months, mode: 'month' };
  }

  const dates: string[] = [];
  while (cur <= end) {
    dates.push(cur.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' }));
    cur.setDate(cur.getDate() + 1);
  }
  return { labels: dates, mode: 'day' as const };
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '-';
  const dt = new Date(d);
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  return `${day}/${month}/${year}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AgentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Filter state — matches old Angular variable names
  const [optionOne, setOptionOne] = useState<OptionOne>('totalAmount');
  const [optionTwo, setOptionTwo] = useState<OptionTwo>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState('Last 7 Days');
  const searchRef = useRef<HTMLInputElement>(null);

  // Chart
  const [chartDates, setChartDates] = useState<string[]>([]);
  const [chartAmounts, setChartAmounts] = useState<number[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Agents summary table (List of Agents mode)
  const [agentSummary, setAgentSummary] = useState<AgentSummary[]>([]);
  const [agentSummaryFull, setAgentSummaryFull] = useState<AgentSummary[]>([]);
  const [agentTotal, setAgentTotal] = useState(0);
  const [agentPage, setAgentPage] = useState(1);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentSortBy, setAgentSortBy] = useState<string>('');
  const [agentSortDir, setAgentSortDir] = useState<'asc' | 'desc'>('desc');
  const AGENT_PER_PAGE = 10;

  // Statements table (always visible at bottom)
  const [statements, setStatements] = useState<Statement[]>([]);
  const [stmtTotal, setStmtTotal] = useState(0);
  const [stmtPage, setStmtPage] = useState(1);
  const [stmtLoading, setStmtLoading] = useState(false);
  const STMT_PER_PAGE = 10;

  // Incentive modal
  const [incentiveModal, setIncentiveModal] = useState(false);
  const [activeStmt, setActiveStmt] = useState<Statement | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [incentiveDate, setIncentiveDate] = useState('');
  const [incentiveSaving, setIncentiveSaving] = useState(false);
  const [incentiveError, setIncentiveError] = useState('');

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Fetch chart data
  // ---------------------------------------------------------------------------
  const fetchChartData = useCallback(async (curAgentId: string | null, curPreset: string, curOption: OptionOne) => {
    if (curOption === 'List of Agents') return;
    setChartLoading(true);
    try {
      const { startDate, endDate } = getDateRange(curPreset);
      const params = new URLSearchParams({ startDate, endDate, limit: '5000' });
      if (curAgentId) params.set('agentId', curAgentId);
      const res = await fetch(`/api/agents/statements?${params}`);
      const d = await res.json();
      if (d.status) {
        const { labels, mode } = buildDateAxis(startDate, endDate);
        const dateMap: Record<string, number> = {};
        labels.forEach((k: string) => { dateMap[k] = 0; });
        (d.data || []).forEach((s: Statement) => {
          const dt = new Date(s.bookingDate);
          const key = mode === 'month'
            ? dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
            : dt.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });
          if (dateMap[key] !== undefined) {
            dateMap[key] += curOption === 'incentiveAmount'
              ? (s.incentiveAmount || 0)
              : (s.netAmount || 0);
          }
        });
        setChartDates(labels);
        setChartAmounts(labels.map((k: string) => dateMap[k] ?? 0));
      }
    } catch {
      setChartDates([]);
      setChartAmounts([]);
    } finally {
      setChartLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch agents summary
  // ---------------------------------------------------------------------------
  const fetchAgentSummary = useCallback(async (page = 1, sortBy = '', sortDir: 'asc' | 'desc' = 'desc') => {
    setAgentLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(AGENT_PER_PAGE) });
      if (sortBy) params.set('shortBy', sortBy);
      params.set('sortDir', sortDir);
      const res = await fetch(`/api/agents/summary?${params}`);
      const d = await res.json();
      if (d.status) {
        setAgentSummaryFull(d.data || []);
        setAgentSummary(d.data || []);
        setAgentTotal(d.total || 0);
      }
    } finally {
      setAgentLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch statements (always visible — no date filter, all data paginated)
  // ---------------------------------------------------------------------------
  const fetchStatements = useCallback(async (page = 1) => {
    setStmtLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(STMT_PER_PAGE) });
      const res = await fetch(`/api/agents/statements?${params}`);
      const d = await res.json();
      if (d.status) {
        setStatements(d.data || []);
        setStmtTotal(d.total || 0);
      }
    } finally {
      setStmtLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!authChecked) return;
    fetchChartData(null, 'Last 7 Days', 'totalAmount');
    fetchStatements(1);
  }, [authChecked, fetchChartData, fetchStatements]);

  // ---------------------------------------------------------------------------
  // Category change handler
  // ---------------------------------------------------------------------------
  const handleOptionOneChange = (val: string) => {
    const v = val as OptionOne;
    setOptionOne(v);
    setOptionTwo('All');
    setAgentId(null);
    setSearchQuery('');
    if (searchRef.current) searchRef.current.value = '';
    if (v === 'List of Agents') {
      fetchAgentSummary(1);
    } else {
      fetchChartData(null, datePreset, v);
    }
  };

  // ---------------------------------------------------------------------------
  // Sub-category change handler
  // ---------------------------------------------------------------------------
  const handleOptionTwoChange = (val: string) => {
    const v = val as OptionTwo;
    setOptionTwo(v);
    if (v === 'All') {
      setAgentId(null);
      setSearchQuery('');
      if (searchRef.current) searchRef.current.value = '';
      fetchChartData(null, datePreset, optionOne);
    }
  };

  // ---------------------------------------------------------------------------
  // Date range change
  // ---------------------------------------------------------------------------
  const handleDateChange = (preset: string) => {
    setDatePreset(preset);
    fetchChartData(agentId, preset, optionOne);
  };

  // ---------------------------------------------------------------------------
  // Agent search
  // ---------------------------------------------------------------------------
  const searchUser = async () => {
    const search = searchRef.current?.value || searchQuery;
    if (!search.trim()) return;
    try {
      const res = await fetch(`/api/agents?search=${encodeURIComponent(search.trim())}&limit=1`);
      const d = await res.json();
      if (d.status && d.data && d.data.length > 0) {
        const found = d.data[0];
        setAgentId(found._id);
        fetchChartData(found._id, datePreset, optionOne);
      } else {
        setChartDates([]);
        setChartAmounts([]);
      }
    } catch {
      setChartDates([]);
      setChartAmounts([]);
    }
  };

  // ---------------------------------------------------------------------------
  // Client-side sort for agents summary table (matches Angular's sortData)
  // ---------------------------------------------------------------------------
  const handleAgentSort = (col: keyof AgentSummary) => {
    const dir: 'asc' | 'desc' = agentSortBy === col && agentSortDir === 'desc' ? 'asc' : 'desc';
    setAgentSortBy(col);
    setAgentSortDir(dir);
    const sorted = [...agentSummaryFull].sort((a, b) => {
      const aV = Number(a[col] ?? 0);
      const bV = Number(b[col] ?? 0);
      return dir === 'desc' ? bV - aV : aV - bV;
    });
    setAgentSummary(sorted);
  };

  // ---------------------------------------------------------------------------
  // Incentive modal
  // ---------------------------------------------------------------------------
  const openIncentiveModal = (stmt: Statement) => {
    if (stmt.isIncentivePaid) return;
    setActiveStmt(stmt);
    setUtrNumber(stmt.utrNumber || '');
    setIncentiveDate(stmt.incentivePaidDate ? stmt.incentivePaidDate.split('T')[0] : '');
    setIncentiveError('');
    setIncentiveModal(true);
  };

  const saveIncentive = async () => {
    if (!activeStmt) return;
    if (!utrNumber.trim()) { setIncentiveError('UTR number is required'); return; }
    if (!incentiveDate) { setIncentiveError('Incentive paid date is required'); return; }
    setIncentiveSaving(true);
    setIncentiveError('');
    try {
      const res = await fetch(`/api/agents/statements/${activeStmt._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isIncentivePaid: true, utrNumber: utrNumber.trim(), incentivePaidDate: incentiveDate }),
      });
      const d = await res.json();
      if (d.status) {
        setStatements((prev) =>
          prev.map((s) =>
            s._id === activeStmt._id
              ? { ...s, isIncentivePaid: true, utrNumber: utrNumber.trim(), incentivePaidDate: incentiveDate }
              : s
          )
        );
        setIncentiveModal(false);
      } else {
        setIncentiveError(d.message || 'Failed to update');
      }
    } finally {
      setIncentiveSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Excel download helpers
  // ---------------------------------------------------------------------------
  const downloadCSV = (rows: Record<string, any>[], filename: string) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => {
          const val = row[h] ?? '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
        }).join(',')
      ),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadStatementsExcel = async () => {
    try {
      const res = await fetch('/api/agents/statements?limit=9999&page=1');
      const d = await res.json();
      if (!d.status || !d.data?.length) return;
      const rows = d.data.map((s: any, i: number) => ({
        'No.': i + 1,
        'Inspection ID': s.inspectionId?._id || '-',
        'Booking Date': s.bookingDate ? new Date(s.bookingDate).toLocaleDateString('en-IN') : '-',
        'Cust Name': s.customerName || '-',
        'Agent Name': s.agentName || s.agentId?.name || '-',
        'Coupon': s.couponCode || '-',
        'Amount': s.amount || 0,
        'Discount': s.discount || 0,
        'Inc Amt': s.incentiveAmount || 0,
        'Net Amt': s.netAmount || 0,
        'Cust Amt': s.customerAmount || 0,
        'Paid Status': 'Booked',
        'Inc Status': s.isIncentivePaid ? 'Paid' : 'UnPaid',
        'UTR No': s.utrNumber || '-',
        'Paid Date': s.incentivePaidDate ? new Date(s.incentivePaidDate).toLocaleDateString('en-IN') : '-',
      }));
      downloadCSV(rows, 'agent_statements.csv');
    } catch { /* silently fail */ }
  };

  const downloadChartExcel = async () => {
    try {
      const { startDate, endDate } = getDateRange(datePreset);
      const params = new URLSearchParams({ startDate, endDate, limit: '9999' });
      if (agentId) params.set('agentId', agentId);
      const res = await fetch(`/api/agents/statements?${params}`);
      const d = await res.json();
      if (!d.status || !d.data?.length) return;
      const rows = d.data.map((s: any, i: number) => ({
        'No.': i + 1,
        'Agent Name': s.agentName || s.agentId?.name || '-',
        'Agent Email': '-',
        'User Name': s.customerName || '-',
        'Property Name': s.inspectionId?.propertyName || '-',
        'Coupon Code': s.couponCode || '-',
        'Amount': s.amount || 0,
        'Discount': s.discount || 0,
        'Incentive Amount': s.incentiveAmount || 0,
        'Net Amt': s.netAmount || 0,
        'Cust Amt': s.customerAmount || 0,
        'Ordered Date': s.bookingDate ? new Date(s.bookingDate).toLocaleDateString('en-IN') : '-',
        'Incentive Status': s.isIncentivePaid ? 'Paid' : 'UnPaid',
        'UTR': s.utrNumber || '-',
        'Incentive Paid Date': s.incentivePaidDate ? new Date(s.incentivePaidDate).toLocaleDateString('en-IN') : '-',
      }));
      downloadCSV(rows, `agent_data_${startDate}_to_${endDate}.csv`);
    } catch { /* silently fail */ }
  };

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------
  const stmtTotalPages = Math.max(1, Math.ceil(stmtTotal / STMT_PER_PAGE));
  const agentTotalPages = Math.max(1, Math.ceil(agentTotal / AGENT_PER_PAGE));

  const chartLabel = optionOne === 'incentiveAmount' ? 'Incentive Amount' : 'Inspection Amount';
  const chartOptions = {
    chart: {
      type: 'line' as const,
      height: 300,
      toolbar: { show: false },
      dropShadow: { enabled: true, color: '#000', top: 18, left: 7, blur: 10, opacity: 0.2 },
    },
    colors: ['#0054A8'],
    stroke: { curve: 'smooth' as const },
    dataLabels: { enabled: true },
    markers: { size: 1 },
    grid: { borderColor: '#e7e7e7', row: { colors: ['#f3f3f3', 'transparent'], opacity: 0.5 } },
    xaxis: { categories: chartDates, labels: { style: { fontSize: '11px' } } },
    yaxis: { title: { text: chartLabel } },
    legend: { position: 'top' as const },
  };
  const chartSeries = [{ name: chartLabel, color: '#0054A8', data: chartAmounts }];

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------
  const thStyle: React.CSSProperties = {
    padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6',
    fontSize: '0.8125rem', fontWeight: 600, color: '#495057', backgroundColor: '#f8f9fa', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem', fontSize: '0.8125rem', borderBottom: '1px solid #dee2e6', color: '#374151',
  };
  const selectStyle: React.CSSProperties = {
    padding: '0.25rem 0.5rem', border: '1px solid #ced4da', borderRadius: '4px',
    fontSize: '0.875rem', backgroundColor: '#fff', cursor: 'pointer',
  };

  if (!authChecked || !user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading...</p></div>;
  }

  return (
    <Layout user={user}>
      <div>

        {/* ------------------------------------------------------------------ */}
        {/* Card 1: Filter bar + Chart / Agents Summary Table                  */}
        {/* ------------------------------------------------------------------ */}
        <div style={{ backgroundColor: 'white', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', marginBottom: '1.5rem', padding: 0 }}>

          {/* Filter bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem', flexWrap: 'wrap', gap: '0.5rem',
          }}>

            {/* Left: Category + Sub-category + Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>

              {/* Category select */}
              <select
                value={optionOne}
                onChange={(e) => handleOptionOneChange(e.target.value)}
                style={{ ...selectStyle, minWidth: '185px' }}
              >
                <option value="" disabled>Select Category</option>
                <option value="totalAmount">Total Business (Post Disc Coupon AND Post Incentive)</option>
                <option value="incentiveAmount">Total Incentive Paid Out</option>
                <option value="List of Agents">List of Agents</option>
              </select>

              {/* Sub-category (hidden when List of Agents) */}
              {optionOne !== 'List of Agents' && (
                <select
                  value={optionTwo}
                  onChange={(e) => handleOptionTwoChange(e.target.value)}
                  style={{ ...selectStyle, width: '150px' }}
                >
                  <option value="All">All Agents</option>
                  <option value="By Agent">Single Agent</option>
                </select>
              )}

              {/* Agent search (when By Agent) */}
              {optionTwo === 'By Agent' && optionOne !== 'List of Agents' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search email or mobile no.."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') searchUser(); }}
                    style={{ borderRadius: '5px', border: '1px solid #ddd', padding: '2px 6px', fontSize: '0.875rem' }}
                  />
                  <button
                    onClick={searchUser}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#555">
                      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Right: Date range + Excel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {optionOne !== 'List of Agents' && (
                <select value={datePreset} onChange={(e) => handleDateChange(e.target.value)} style={selectStyle}>
                  {DATE_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              {/* Excel icon */}
              <button
                type="button"
                title="Download Excel"
                style={{ display: 'flex', alignItems: 'center', padding: '1px', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => optionOne === 'List of Agents' ? downloadStatementsExcel() : downloadChartExcel()}
              >
                <svg width="30" height="30" viewBox="0 0 64 64" fill="none" style={{ padding: '1px' }}>
                  <rect width="64" height="64" rx="6" fill="#217346" />
                  <text x="10" y="46" fontSize="36" fontWeight="bold" fill="white" fontFamily="Arial">X</text>
                </svg>
              </button>
            </div>
          </div>

          {/* Chart (hidden when List of Agents) */}
          {optionOne !== 'List of Agents' && (
            <div style={{ padding: '0 0.5rem 0.5rem' }}>
              {chartLoading ? (
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  Loading...
                </div>
              ) : (
                <ApexChart type="line" series={chartSeries} options={chartOptions} height={300} width="100%" />
              )}
            </div>
          )}

          {/* Agents Summary Table (visible only when List of Agents) */}
          {optionOne === 'List of Agents' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Agent Name</th>
                    <th style={thStyle}>Mobile</th>
                    <th
                      style={{ ...thStyle, cursor: 'pointer' }}
                      onClick={() => handleAgentSort('netAmount')}
                    >
                      Revenue Generated{agentSortBy === 'netAmount' ? (agentSortDir === 'desc' ? ' ▼' : ' ▲') : ''}
                    </th>
                    <th
                      style={{ ...thStyle, cursor: 'pointer' }}
                      onClick={() => handleAgentSort('incentiveAmount')}
                    >
                      Incentive Paid Out{agentSortBy === 'incentiveAmount' ? (agentSortDir === 'desc' ? ' ▼' : ' ▲') : ''}
                    </th>
                    <th
                      style={{ ...thStyle, cursor: 'pointer' }}
                      onClick={() => handleAgentSort('count')}
                    >
                      No. of Cases{agentSortBy === 'count' ? (agentSortDir === 'desc' ? ' ▼' : ' ▲') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {agentLoading ? (
                    <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: '2rem', color: '#999' }}>Loading...</td></tr>
                  ) : agentSummary.length === 0 ? (
                    <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: '2rem' }}>No data found</td></tr>
                  ) : (
                    agentSummary.map((ag, i) => (
                      <tr
                        key={ag.agentId}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f8f9fa'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
                      >
                        <td style={tdStyle}>{(agentPage - 1) * AGENT_PER_PAGE + i + 1}</td>
                        <td style={tdStyle}>{ag.userName}</td>
                        <td style={tdStyle}>{ag.phone}</td>
                        <td style={tdStyle}>{ag.netAmount}</td>
                        <td style={tdStyle}>{ag.incentiveAmount}</td>
                        <td style={tdStyle}>{ag.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {agentTotalPages > 1 && (
                <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {Array.from({ length: agentTotalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => { setAgentPage(pg); fetchAgentSummary(pg, agentSortBy, agentSortDir); }}
                      style={{
                        padding: '0.25rem 0.6rem', border: '1px solid #dee2e6', borderRadius: '3px', cursor: 'pointer',
                        fontSize: '0.8125rem', background: agentPage === pg ? '#0054A8' : '#fff',
                        color: agentPage === pg ? '#fff' : '#333',
                      }}
                    >
                      {pg}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Card 2: Agent Inspection Statements (ALWAYS visible)               */}
        {/* ------------------------------------------------------------------ */}
        <div style={{ backgroundColor: 'white', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          {/* Excel download row */}
          <div style={{ padding: '0.25rem 1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              title="Download Statement Excel"
              onClick={downloadStatementsExcel}
              style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none" style={{ padding: '10px' }}>
                <rect width="64" height="64" rx="6" fill="#217346" />
                <text x="10" y="46" fontSize="36" fontWeight="bold" fill="white" fontFamily="Arial">X</text>
              </svg>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['No.', 'Inspection\u00A0ID', 'Booking\u00A0Date', 'Cust\u00A0Name', 'Agent\u00A0Name', 'Coupon', 'Amount', 'Discount', 'Inc\u00A0Amt', 'Net\u00A0Amt', 'Cust\u00A0Amt', 'Paid\u00A0Status', 'Inc\u00A0Status', 'UTR\u00A0No', 'Paid\u00A0Date'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stmtLoading ? (
                  <tr><td colSpan={15} style={{ ...tdStyle, textAlign: 'center', padding: '2rem', color: '#999' }}>Loading...</td></tr>
                ) : statements.length === 0 ? (
                  <tr><td colSpan={15} style={{ ...tdStyle, textAlign: 'center', padding: '2rem' }}>No data found!</td></tr>
                ) : (
                  statements.map((s, i) => (
                    <tr
                      key={s._id}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f8f9fa'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
                    >
                      <td style={tdStyle}>{stmtPage > 1 ? (stmtPage - 1) * STMT_PER_PAGE + (i + 1) : i + 1}</td>
                      <td style={{ ...tdStyle, fontSize: '0.75rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.inspectionId?._id || '—'}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtDate(s.bookingDate)}</td>
                      <td style={tdStyle}>{s.customerName || '—'}</td>
                      <td style={tdStyle}>{s.agentName || s.agentId?.name || '—'}</td>
                      <td style={tdStyle}>{s.couponCode || '—'}</td>
                      <td style={tdStyle}>{s.amount || '—'}</td>
                      <td style={tdStyle}>{s.discount || '—'}</td>
                      <td style={tdStyle}>{s.incentiveAmount || '—'}</td>
                      <td style={tdStyle}>{s.netAmount}</td>
                      <td style={tdStyle}>{s.customerAmount}</td>
                      <td style={tdStyle}>Booked</td>

                      {/* Incentive Status — toggle switch */}
                      <td style={tdStyle}>
                        <div
                          onClick={() => openIncentiveModal(s)}
                          title={s.isIncentivePaid ? 'Already paid' : 'Click to mark as paid'}
                          style={{
                            display: 'inline-flex', alignItems: 'center', width: '40px', height: '20px',
                            borderRadius: '10px', backgroundColor: s.isIncentivePaid ? '#4caf50' : '#ccc',
                            cursor: s.isIncentivePaid ? 'default' : 'pointer', position: 'relative',
                            transition: 'background-color 0.2s',
                          }}
                        >
                          <div style={{
                            position: 'absolute', width: '16px', height: '16px', borderRadius: '50%',
                            backgroundColor: 'white', left: s.isIncentivePaid ? '22px' : '2px',
                            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }} />
                        </div>
                      </td>

                      <td style={{ ...tdStyle, fontSize: '0.75rem' }}>{s.utrNumber || '—'}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{fmtDate(s.incentivePaidDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ padding: '0.5rem 1rem', marginBottom: '0.5rem' }}>
            {stmtTotalPages > 1 && (
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {Array.from({ length: Math.min(stmtTotalPages, 15) }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => { setStmtPage(pg); fetchStatements(pg); }}
                    style={{
                      padding: '0.25rem 0.6rem', border: '1px solid #dee2e6', borderRadius: '3px', cursor: 'pointer',
                      fontSize: '0.8125rem', background: stmtPage === pg ? '#0054A8' : '#fff',
                      color: stmtPage === pg ? '#fff' : '#333',
                    }}
                  >
                    {pg}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Incentive Paid Modal                                                 */}
      {/* -------------------------------------------------------------------- */}
      {incentiveModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setIncentiveModal(false); } }}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Mark Incentive as Paid</h5>
              <button onClick={() => setIncentiveModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#888', lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeStmt && (
                <div style={{ backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '0.75rem', fontSize: '0.875rem' }}>
                  <div><strong>Agent:</strong> {activeStmt.agentName || activeStmt.agentId?.name || '-'}</div>
                  <div><strong>Customer:</strong> {activeStmt.customerName || '-'}</div>
                  <div><strong>Incentive Amount:</strong> ₹{(activeStmt.incentiveAmount || 0).toLocaleString('en-IN')}</div>
                </div>
              )}

              {incentiveError && (
                <div style={{ backgroundColor: '#f8d7da', color: '#842029', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                  {incentiveError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>UTR Number *</label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="Enter UTR / transfer reference number"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Incentive Paid Date *</label>
                <input
                  type="date"
                  value={incentiveDate}
                  onChange={(e) => setIncentiveDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setIncentiveModal(false); setIncentiveError(''); }}
                  style={{ padding: '0.5rem 1.25rem', border: '1px solid #ddd', background: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveIncentive}
                  disabled={incentiveSaving}
                  style={{ padding: '0.5rem 1.25rem', border: 'none', background: '#28a745', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: incentiveSaving ? 0.7 : 1 }}
                >
                  {incentiveSaving ? 'Saving...' : 'Confirm Paid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
