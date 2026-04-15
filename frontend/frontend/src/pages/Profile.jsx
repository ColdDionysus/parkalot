import API_BASE from '../api';
import { useState, useEffect } from 'react';
import { CreditCard, FileText, CheckCircle, Car, Calendar, MapPin, XCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [statements, setStatements] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [activeTab, setActiveTab] = useState('reservations');

  useEffect(() => {
    axios.get(API_BASE + '/api/billing/mine/').then(r => setStatements(r.data)).catch(() => {});
    axios.get(API_BASE + '/api/reservations/mine/').then(r => setReservations(r.data)).catch(() => {});
  }, []);

  const handleCancel = async (id) => {
    try {
      await axios.post(`${API_BASE}/api/reservations/${id}/cancel/`);
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
      toast('Reservation cancelled successfully.', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to cancel reservation.', 'error');
    }
  };

  const fmt = dt => dt ? new Date(dt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const statusBadge = (s) => {
    const map = { active: 'badge-green', completed: 'badge-blue', cancelled: 'badge-red' };
    return <span className={`badge ${map[s] || 'badge-blue'}`}>{s}</span>;
  };

  const active = reservations.filter(r => r.status === 'active');
  const past = reservations.filter(r => r.status !== 'active');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem', fontWeight: 800, flexShrink: 0 }}>
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{user?.username}'s Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Manage your reservations and billing statements</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'reservations' ? 'active' : ''}`} onClick={() => setActiveTab('reservations')}>
          My Reservations {reservations.length > 0 && <span style={{ marginLeft: 4, background: activeTab==='reservations' ? 'rgba(255,255,255,0.2)' : 'var(--surface-hover)', borderRadius: '1rem', padding: '0 6px', fontSize: '0.75rem' }}>{reservations.length}</span>}
        </button>
        <button className={`tab-btn ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
          Billing {statements.length > 0 && <span style={{ marginLeft: 4, background: activeTab==='billing' ? 'rgba(255,255,255,0.2)' : 'var(--surface-hover)', borderRadius: '1rem', padding: '0 6px', fontSize: '0.75rem' }}>{statements.length}</span>}
        </button>
      </div>

      {/* Reservations Tab */}
      {activeTab === 'reservations' && (
        <>
          {reservations.length === 0 ? (
            <div className="empty-state card">
              <Car size={48} />
              <h3>No reservations yet</h3>
              <p>Head to <a href="/reserve" style={{ color: 'var(--primary-light)' }}>Book Now</a> to reserve your first spot.</p>
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.875rem' }}>Active ({active.length})</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                    {active.map(r => <ReservationRow key={r.id} r={r} onCancel={handleCancel} fmt={fmt} statusBadge={statusBadge} />)}
                  </div>
                </>
              )}
              {past.length > 0 && (
                <>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.875rem' }}>Past ({past.length})</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {past.map(r => <ReservationRow key={r.id} r={r} onCancel={handleCancel} fmt={fmt} statusBadge={statusBadge} />)}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <>
          {statements.length === 0 ? (
            <div className="empty-state card">
              <FileText size={48} />
              <h3>No statements yet</h3>
              <p>Charges from your reservations are billed at the end of each month.</p>
            </div>
          ) : (
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {statements.map(s => (
                    <tr key={s.id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={15} color="var(--text-muted)" />
                        {String(s.month).padStart(2, '0')}/{s.year}
                      </td>
                      <td style={{ fontWeight: 700 }}>£{parseFloat(s.total_amount).toFixed(2)}</td>
                      <td>
                        {s.is_paid
                          ? <span className="badge badge-green"><CheckCircle size={11} /> Paid</span>
                          : <span className="badge badge-amber">Pending</span>
                        }
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/invoice/${s.id}`)}>
                            <FileText size={13} /> View Invoice
                          </button>
                          {!s.is_paid && (
                            <button className="btn btn-secondary btn-sm">
                              <CreditCard size={13} /> Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReservationRow({ r, onCancel, fmt, statusBadge }) {
  return (
    <div className="card card-hover" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <MapPin size={10} /> Garage
          </p>
          <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{r.garage_name || `Garage #${r.garage}`}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Car size={10} /> Vehicle
          </p>
          <p style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem', letterSpacing: '0.05em' }}>{r.vehicle_registration}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={10} /> Period
          </p>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{fmt(r.start_time)} → {fmt(r.end_time)}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Charge</p>
          <p style={{ fontWeight: 800, color: 'var(--primary-light)', fontSize: '1rem' }}>£{r.dynamic_price_charged}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {statusBadge(r.status)}
        {r.status === 'active' && (
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => onCancel(r.id)}>
            <XCircle size={14} /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
