import API_BASE from '../api';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function fmt(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function hrs(start, end) {
  const h = Math.round((new Date(end) - new Date(start)) / 36e5 * 10) / 10;
  return `${h}h`;
}

export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const printRef = useRef();

  useEffect(() => {
    axios.get(`${API_BASE}/api/billing/${id}/invoice/`)
      .then(r => setData(r.data))
      .catch(() => setError('Invoice not found or access denied.'));
  }, [id]);

  const handlePrint = () => window.print();

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
        <button onClick={() => navigate(-1)} style={{ padding: '0.5rem 1.25rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Go Back</button>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontFamily: 'sans-serif' }}>
      Loading invoice…
    </div>
  );

  const { statement, one_off, recurring, contract_reservations, contracts } = data;
  const monthName = MONTH_NAMES[statement.month - 1];
  const invoiceNo = `INV-${statement.year}${String(statement.month).padStart(2,'0')}-${String(statement.id).slice(-4).padStart(4,'0')}`;
  const today = new Date().toLocaleDateString('en-GB');

  const hasOneOff = one_off.length > 0;
  const hasRecurring = recurring.length > 0;
  const hasContractRes = contract_reservations.length > 0;
  const hasContracts = contracts.length > 0;

  return (
    <>
      {/* Screen-only toolbar */}
      <div className="no-print" style={{ background: '#1e1e2e', padding: '0.875rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #2a2a3c' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: '1px solid #3a3a4c', color: '#a0a0c0', padding: '0.4rem 0.875rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            ← Back
          </button>
          <span style={{ color: '#a0a0c0', fontSize: '0.85rem' }}>Invoice {invoiceNo}</span>
        </div>
        <button onClick={handlePrint} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}>
          🖨 Print / Save PDF
        </button>
      </div>

      {/* Invoice document */}
      <div ref={printRef} style={{ background: '#fff', color: '#111', minHeight: '100vh', padding: '3rem 4rem', maxWidth: 860, margin: '2rem auto', fontFamily: "'Segoe UI', Arial, sans-serif", boxShadow: '0 4px 32px rgba(0,0,0,0.12)', borderRadius: '0.75rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '3px solid #6366f1' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
              <span style={{ color: '#6366f1' }}>Parka</span><span style={{ color: '#111' }}>Lot</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>Smart Parking Solutions</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#111', letterSpacing: '-0.02em' }}>INVOICE</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1', fontSize: '0.95rem', marginTop: '0.3rem' }}>{invoiceNo}</div>
            <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.25rem' }}>Issued: {today}</div>
          </div>
        </div>

        {/* Billing meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
          <div>
            <div style={labelStyle}>Billed To</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{statement.customer_username}</div>
            {statement.customer_email && <div style={{ color: '#555', fontSize: '0.85rem' }}>{statement.customer_email}</div>}
          </div>
          <div>
            <div style={labelStyle}>Billing Period</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{monthName} {statement.year}</div>
            <div style={{ marginTop: '0.5rem' }}>
              <span style={statement.is_paid ? paidBadge : pendingBadge}>
                {statement.is_paid ? '✓ Paid' : 'Payment Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Section 1: One-Off Reservations ── */}
        {hasOneOff && (
          <Section title="One-Off Reservations" accent="#6366f1" description="Single-use parking sessions booked by the customer.">
            <ReservationTable rows={one_off} />
          </Section>
        )}

        {/* ── Section 2: Recurring Reservations ── */}
        {hasRecurring && (
          <Section title="Recurring Reservations" accent="#10b981" description="Regular scheduled sessions under a repeat-booking arrangement.">
            <ReservationTable rows={recurring} />
          </Section>
        )}

        {/* ── Section 3: Contract-Based Reservations ── */}
        {hasContractRes && (
          <Section title="Contract-Based Reservations" accent="#f59e0b" description="Sessions booked under an active parking contract.">
            <ReservationTable rows={contract_reservations} />
          </Section>
        )}

        {/* ── Section 4: Active Contracts / Subscriptions ── */}
        {hasContracts && (
          <Section title="Active Contracts & Subscriptions" accent="#8b5cf6" description="Fixed-term agreements providing guaranteed space allocation. Monthly fees are charged regardless of individual session usage.">
            <table style={tableStyle}>
              <thead>
                <tr>
                  {['Type', 'Garage', 'Period', 'Monthly Fee'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id}>
                    <td style={tdStyle}>
                      <span style={{ ...typeBadge, background: c.contract_type === 'corporate' ? '#ede9fe' : '#d1fae5', color: c.contract_type === 'corporate' ? '#5b21b6' : '#065f46' }}>
                        {c.contract_type === 'corporate' ? 'Corporate' : 'Subscription'}
                      </span>
                    </td>
                    <td style={tdStyle}>{c.garage_name || '—'}</td>
                    <td style={tdStyle}>{fmt(c.start_date)} → {c.end_date ? fmt(c.end_date) : 'Open-ended'}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>£{parseFloat(c.monthly_fee).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Nothing to show */}
        {!hasOneOff && !hasRecurring && !hasContractRes && !hasContracts && (
          <p style={{ color: '#888', textAlign: 'center', padding: '2rem 0' }}>No charges found for this period.</p>
        )}

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <div style={{ background: '#f4f4f8', borderRadius: '0.75rem', padding: '1.5rem 2rem', minWidth: 240, textAlign: 'right', border: '1px solid #e0e0ee' }}>
            {[
              hasOneOff && { label: 'One-Off Sessions', value: one_off.reduce((s, r) => s + parseFloat(r.charge), 0) },
              hasRecurring && { label: 'Recurring Sessions', value: recurring.reduce((s, r) => s + parseFloat(r.charge), 0) },
              hasContractRes && { label: 'Contract Sessions', value: contract_reservations.reduce((s, r) => s + parseFloat(r.charge), 0) },
              hasContracts && { label: 'Contract Fees', value: contracts.reduce((s, c) => s + parseFloat(c.monthly_fee), 0) },
            ].filter(Boolean).map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', fontSize: '0.85rem', color: '#555', marginBottom: '0.4rem' }}>
                <span>{row.label}</span>
                <span>£{row.value.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: '#d0d0e0', margin: '0.75rem 0' }} />
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '0.3rem' }}>Total Amount Due</div>
            <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#6366f1', letterSpacing: '-0.02em' }}>£{parseFloat(statement.total_amount).toFixed(2)}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '3rem', paddingTop: '1.25rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#aaa' }}>
          <span>ParkaLot · Smart Parking Solutions</span>
          <span>Thank you for using our service</span>
          <span>Page 1</span>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #fff; }
          div[style*="box-shadow"] { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; }
        }
      `}</style>
    </>
  );
}

function Section({ title, accent, description, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.4rem' }}>
        <div style={{ width: 4, height: 20, background: accent, borderRadius: 2 }} />
        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111' }}>{title}</div>
      </div>
      {description && <p style={{ fontSize: '0.78rem', color: '#777', marginBottom: '0.75rem', marginLeft: '0.875rem' }}>{description}</p>}
      {children}
    </div>
  );
}

function ReservationTable({ rows }) {
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          {['Date', 'Garage', 'Vehicle', 'Time', 'Duration', 'Charge'].map(h => (
            <th key={h} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td style={tdStyle}>{fmt(r.start_time)}</td>
            <td style={tdStyle}>{r.garage_name}</td>
            <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700 }}>{r.vehicle_registration}</td>
            <td style={{ ...tdStyle, color: '#555' }}>{fmtTime(r.start_time)} – {fmtTime(r.end_time)}</td>
            <td style={{ ...tdStyle, color: '#555' }}>{hrs(r.start_time, r.end_time)}</td>
            <td style={{ ...tdStyle, fontWeight: 700, color: '#6366f1' }}>£{parseFloat(r.charge).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const labelStyle = { fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '0.4rem', fontWeight: 600 };
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginBottom: '0.5rem' };
const thStyle = { padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888', fontWeight: 700, background: '#f7f7fa', borderBottom: '2px solid #e8e8f0' };
const tdStyle = { padding: '0.7rem 0.75rem', fontSize: '0.85rem', borderBottom: '1px solid #f0f0f8' };
const paidBadge = { background: '#d1fae5', color: '#065f46', padding: '0.2rem 0.75rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700 };
const pendingBadge = { background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.75rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700 };
const typeBadge = { padding: '0.15rem 0.6rem', borderRadius: '2rem', fontSize: '0.72rem', fontWeight: 700 };
