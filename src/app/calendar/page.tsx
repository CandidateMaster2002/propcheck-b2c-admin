'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  status: string;
  inspector?: string;
}

interface CustomEvent {
  _id?: string;
  title: string;
  date: string;
  endDate?: string;
  description?: string;
  color: string;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: '#ffc107',
  Assigned: '#0066cc',
  Completed: '#28a745',
  Cancelled: '#dc3545',
};

const EVENT_COLORS = ['#0066cc', '#28a745', '#dc3545', '#fd7e14', '#6f42c1', '#17a2b8'];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fmtMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [inspectionEvents, setInspectionEvents] = useState<CalendarEvent[]>([]);
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Selected day
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Add/Edit custom event modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CustomEvent | null>(null);
  const [eventForm, setEventForm] = useState<CustomEvent>({ title: '', date: '', endDate: '', description: '', color: EVENT_COLORS[0] });
  const [eventError, setEventError] = useState('');

  // Day events modal
  const [showDayModal, setShowDayModal] = useState(false);
  const [dayModalDate, setDayModalDate] = useState('');

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
  // Fetch inspection events for current month
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!authChecked) return;
    const fetch_ = async () => {
      setLoadingEvents(true);
      try {
        const { startDate, endDate } = fmtMonthRange(viewYear, viewMonth);
        const res = await fetch(`/api/calendar/inspections?startDate=${startDate}&endDate=${endDate}`);
        const d = await res.json();
        if (d.status && Array.isArray(d.data)) setInspectionEvents(d.data);
        else setInspectionEvents([]);
      } catch { setInspectionEvents([]); }
      finally { setLoadingEvents(false); }
    };
    fetch_();
  }, [authChecked, viewYear, viewMonth]);

  // Load custom events from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('b2c_calendar_events');
      if (stored) setCustomEvents(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const saveCustomEvents = (events: CustomEvent[]) => {
    setCustomEvents(events);
    localStorage.setItem('b2c_calendar_events', JSON.stringify(events));
  };

  // ---------------------------------------------------------------------------
  // Build event map keyed by date string YYYY-MM-DD
  // ---------------------------------------------------------------------------
  const eventMap: Record<string, { inspection: CalendarEvent[]; custom: CustomEvent[] }> = {};

  inspectionEvents.forEach((e) => {
    const key = e.date ? e.date.split('T')[0] : '';
    if (!key) return;
    if (!eventMap[key]) eventMap[key] = { inspection: [], custom: [] };
    eventMap[key].inspection.push(e);
  });

  customEvents.forEach((e) => {
    const key = e.date ? e.date.split('T')[0] : '';
    if (!key) return;
    if (!eventMap[key]) eventMap[key] = { inspection: [], custom: [] };
    eventMap[key].custom.push(e);
  });

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  // ---------------------------------------------------------------------------
  // Event CRUD
  // ---------------------------------------------------------------------------
  const openAddEvent = (date?: string) => {
    setEditingEvent(null);
    setEventForm({ title: '', date: date || toDateKey(today), endDate: '', description: '', color: EVENT_COLORS[0] });
    setEventError('');
    setShowEventModal(true);
  };

  const openEditEvent = (ev: CustomEvent) => {
    setEditingEvent(ev);
    setEventForm({ ...ev });
    setEventError('');
    setShowEventModal(true);
  };

  const saveEvent = () => {
    if (!eventForm.title.trim()) { setEventError('Title is required'); return; }
    if (!eventForm.date) { setEventError('Date is required'); return; }

    if (editingEvent) {
      const updated = customEvents.map((e) =>
        e._id === editingEvent._id ? { ...eventForm, _id: editingEvent._id } : e
      );
      saveCustomEvents(updated);
    } else {
      const newEv: CustomEvent = { ...eventForm, _id: `custom_${Date.now()}` };
      saveCustomEvents([...customEvents, newEv]);
    }
    setShowEventModal(false);
  };

  const deleteEvent = (ev: CustomEvent) => {
    if (!confirm(`Delete event "${ev.title}"?`)) return;
    saveCustomEvents(customEvents.filter((e) => e._id !== ev._id));
  };

  // ---------------------------------------------------------------------------
  // Day click
  // ---------------------------------------------------------------------------
  const handleDayClick = (dateKey: string) => {
    setSelectedDate(dateKey);
    setDayModalDate(dateKey);
    setShowDayModal(true);
  };

  // ---------------------------------------------------------------------------
  // Calendar grid
  // ---------------------------------------------------------------------------
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayKey = toDateKey(today);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // ---------------------------------------------------------------------------
  // Guard
  // ---------------------------------------------------------------------------
  if (!authChecked || !user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading...</p></div>;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Layout user={user}>
      <div style={{ padding: '1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Calendar</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={goToday} style={{ padding: '0.4rem 1rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>Today</button>
            <button onClick={prevMonth} style={{ padding: '0.4rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '1rem' }}>&#8249;</button>
            <span style={{ fontWeight: 600, fontSize: '1rem', minWidth: '160px', textAlign: 'center' }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} style={{ padding: '0.4rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '1rem' }}>&#8250;</button>
            <button onClick={() => openAddEvent()} style={{ padding: '0.4rem 1rem', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
              + Add Event
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color }} />
              <span style={{ color: '#555' }}>{status}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#6f42c1' }} />
            <span style={{ color: '#555' }}>Custom Event</span>
          </div>
          {loadingEvents && <span style={{ fontSize: '0.8125rem', color: '#999' }}>Loading...</span>}
        </div>

        {/* Calendar Grid */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '2px solid #e5e7eb' }}>
            {DAYS.map((d) => (
              <div key={d} style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, color: '#6b7280', backgroundColor: '#f9fafb' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} style={{ minHeight: '100px', borderRight: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafafa' }} />;
              }
              const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateKey === todayKey;
              const dayEvents = eventMap[dateKey];
              const inspEvts = dayEvents?.inspection || [];
              const custEvts = dayEvents?.custom || [];
              const totalEvts = inspEvts.length + custEvts.length;

              return (
                <div
                  key={dateKey}
                  onClick={() => handleDayClick(dateKey)}
                  style={{
                    minHeight: '100px',
                    padding: '0.25rem',
                    borderRight: '1px solid #f3f4f6',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    backgroundColor: selectedDate === dateKey ? '#eff6ff' : 'white',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => { if (selectedDate !== dateKey) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f9fafb'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = selectedDate === dateKey ? '#eff6ff' : 'white'; }}
                >
                  {/* Day number */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '26px', height: '26px', borderRadius: '50%', fontSize: '0.8125rem', fontWeight: isToday ? 700 : 400,
                      backgroundColor: isToday ? '#0066cc' : 'transparent',
                      color: isToday ? 'white' : '#111',
                    }}>
                      {day}
                    </span>
                    {totalEvts > 0 && (
                      <span style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: 500, paddingTop: '6px' }}>{totalEvts} event{totalEvts > 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {/* Inspection event dots (max 2 visible) */}
                  {inspEvts.slice(0, 2).map((ev, i) => (
                    <div key={`insp-${i}`} style={{
                      fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '3px', marginBottom: '0.2rem',
                      backgroundColor: STATUS_COLORS[ev.status] || '#aaa',
                      color: 'white', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    }}>
                      {ev.title}
                    </div>
                  ))}

                  {/* Custom event dots */}
                  {custEvts.slice(0, inspEvts.length >= 2 ? 0 : 2 - inspEvts.length).map((ev, i) => (
                    <div key={`cust-${i}`} style={{
                      fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '3px', marginBottom: '0.2rem',
                      backgroundColor: ev.color || '#6f42c1',
                      color: 'white', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    }}>
                      {ev.title}
                    </div>
                  ))}

                  {/* Overflow indicator */}
                  {totalEvts > 2 && (
                    <div style={{ fontSize: '0.65rem', color: '#0066cc', fontWeight: 500 }}>+{totalEvts - 2} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Day Events Modal                                                      */}
      {/* -------------------------------------------------------------------- */}
      <Modal isOpen={showDayModal} onClose={() => { setShowDayModal(false); setSelectedDate(null); }} title={`Events — ${dayModalDate}`} size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Inspection events */}
          {(eventMap[dayModalDate]?.inspection || []).length > 0 && (
            <div>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8125rem', fontWeight: 600, color: '#6b7280' }}>Inspection Bookings</p>
              {(eventMap[dayModalDate]?.inspection || []).map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px', marginBottom: '0.35rem', borderLeft: `3px solid ${STATUS_COLORS[ev.status] || '#aaa'}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{ev.title}</div>
                    {ev.inspector && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Inspector: {ev.inspector}</div>}
                  </div>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: STATUS_COLORS[ev.status] || '#aaa', color: 'white' }}>
                    {ev.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Custom events */}
          {(eventMap[dayModalDate]?.custom || []).length > 0 && (
            <div>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8125rem', fontWeight: 600, color: '#6b7280' }}>Custom Events</p>
              {(eventMap[dayModalDate]?.custom || []).map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px', marginBottom: '0.35rem', borderLeft: `3px solid ${ev.color}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{ev.title}</div>
                    {ev.description && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{ev.description}</div>}
                    {ev.endDate && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Until: {ev.endDate}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button onClick={() => { setShowDayModal(false); openEditEvent(ev); }} style={{ padding: '0.25rem 0.5rem', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8125rem' }}>Edit</button>
                    <button onClick={() => { deleteEvent(ev); if ((eventMap[dayModalDate]?.custom || []).length <= 1 && (eventMap[dayModalDate]?.inspection || []).length === 0) setShowDayModal(false); }} style={{ padding: '0.25rem 0.5rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8125rem' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!eventMap[dayModalDate] && (
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem', padding: '1rem' }}>No events on this day</p>
          )}

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => { setShowDayModal(false); openAddEvent(dayModalDate); }}
              style={{ padding: '0.4rem 1rem', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              + Add Event on This Day
            </button>
          </div>
        </div>
      </Modal>

      {/* -------------------------------------------------------------------- */}
      {/* Add/Edit Event Modal                                                  */}
      {/* -------------------------------------------------------------------- */}
      <Modal isOpen={showEventModal} onClose={() => setShowEventModal(false)} title={editingEvent ? 'Edit Event' : 'Add Custom Event'} size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {eventError && (
            <div style={{ backgroundColor: '#f8d7da', color: '#842029', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>{eventError}</div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
              Event Title <span style={{ color: 'red' }}>*</span>
            </label>
            <input type="text" value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Team meeting"
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Start Date <span style={{ color: 'red' }}>*</span></label>
              <input type="date" value={eventForm.date} onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>End Date</label>
              <input type="date" value={eventForm.endDate || ''} onChange={(e) => setEventForm((f) => ({ ...f, endDate: e.target.value }))}
                min={eventForm.date}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Description</label>
            <textarea value={eventForm.description || ''} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description..."
              rows={2}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Event Color</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEventForm((f) => ({ ...f, color: c }))}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%', backgroundColor: c,
                    border: eventForm.color === c ? '3px solid #111' : '2px solid transparent',
                    cursor: 'pointer', padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <button onClick={() => setShowEventModal(false)} style={{ padding: '0.5rem 1.25rem', border: '1px solid #ddd', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>
              Cancel
            </button>
            <button onClick={saveEvent} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
              {editingEvent ? 'Update Event' : 'Add Event'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
