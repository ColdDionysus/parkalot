import API_BASE from '../api';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Clock, CreditCard, CheckCircle, Car, Lock, ArrowRight, ChevronLeft, MapPin, Users, RefreshCw, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function AuthWall() {
  const navigate = useNavigate();
  return (
    <div className="auth-wall animate-fade-in">
      <div className="auth-wall-icon"><Lock size={30} color="var(--primary-light)" /></div>
      <h2>Sign in to Book</h2>
      <p>Create a free ParkaLot account or sign in to reserve a parking space. It only takes a minute and your spot is guaranteed.</p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/register')}>Create Account</button>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/login')}>Sign In <ArrowRight size={16} /></button>
      </div>
    </div>
  );
}

function SuccessScreen({ type, garage, plate, price, contractType, onReset }) {
  const navigate = useNavigate();
  const isContract = type === 'subscription' || type === 'corporate';
  const isRecurring = type === 'recurring';
  return (
    <div className="animate-slide-up" style={{ textAlign: 'center', maxWidth: 480, margin: '5rem auto' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.75rem' }}>
        <CheckCircle size={38} color="var(--accent)" />
      </div>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
        {isContract ? 'Contract Created!' : isRecurring ? 'Recurring Slots Booked!' : 'Booking Confirmed!'}
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.7 }}>
        {isContract
          ? <>Your <strong style={{ color: 'var(--text-primary)' }}>{contractType === 'corporate' ? 'Corporate' : 'Subscription'}</strong> contract at <strong style={{ color: 'var(--text-primary)' }}>{garage}</strong> is active. Monthly fee of <strong style={{ color: 'var(--primary-light)' }}>£{price}</strong> will appear on your statement.</>
          : <>Your spot{isRecurring ? 's' : ''} at <strong style={{ color: 'var(--text-primary)' }}>{garage}</strong> {isRecurring ? 'are' : 'is'} reserved for <strong style={{ color: 'var(--text-primary)' }}>{plate}</strong>. Charged <strong style={{ color: 'var(--primary-light)' }}>£{price}</strong> on your next monthly statement.</>
        }
      </p>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        <Car size={16} color="var(--accent)" /> {isContract ? 'Barrier access granted for all registered vehicles' : 'Show your plate at the barrier — access is automatic'}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={onReset}>Book Another</button>
        <button className="btn btn-primary" onClick={() => navigate('/profile')}>View My Bookings <ArrowRight size={15} /></button>
      </div>
    </div>
  );
}

// Booking type definitions
const TYPES = [
  {
    id: 'one-off',
    icon: <Calendar size={22} />,
    label: 'One-Off',
    sub: 'Single parking session',
    color: 'var(--primary)',
    desc: 'Book a single parking session for any date and time. Perfect for occasional visits.',
  },
  {
    id: 'recurring',
    icon: <RefreshCw size={22} />,
    label: 'Recurring',
    sub: 'Regular schedule for commuters',
    color: 'var(--accent)',
    desc: 'Set a repeating schedule — choose which days of the week you park. Great for commuters.',
  },
  {
    id: 'subscription',
    icon: <CreditCard size={22} />,
    label: 'Subscription',
    sub: 'Monthly guaranteed space',
    color: '#8b5cf6',
    desc: 'Pay a fixed monthly fee for a guaranteed space every day, billed as a contract.',
  },
  {
    id: 'corporate',
    icon: <Building2 size={22} />,
    label: 'Corporate Block',
    sub: 'Reserve spaces for employees',
    color: '#f59e0b',
    desc: 'Reserve a block of spaces across a garage for employees or visitors, managed centrally.',
  },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Reserve() {
  const { user } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [bookingType, setBookingType] = useState('one-off');
  const [garages, setGarages] = useState([]);
  const [garageId, setGarageId] = useState('');
  const [garageName, setGarageName] = useState('');

  // One-off / recurring fields
  const [plate, setPlate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [pricePreview, setPricePreview] = useState(null);

  // Recurring extras
  const [recurDays, setRecurDays] = useState([]);   // ['Mon','Wed','Fri']
  const [recurWeeks, setRecurWeeks] = useState(4);

  // Subscription / Corporate fields
  const [contractPrice, setContractPrice] = useState(null); // { monthly_fee, total }
  const [startDate, setStartDate] = useState('');
  const [durationMonths, setDurationMonths] = useState(1);
  const [numSpaces, setNumSpaces] = useState(1);   // corporate only
  const [contactNote, setContactNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMeta, setSuccessMeta] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(API_BASE + '/api/garages/').then(res => {
      setGarages(res.data);
      const preId = state?.garageId ? String(state.garageId) : (res.data[0]?.id ? String(res.data[0].id) : '');
      setGarageId(preId);
      const found = res.data.find(g => String(g.id) === preId);
      setGarageName(found?.name || '');
    });
  }, []);

  useEffect(() => {
    const found = garages.find(g => String(g.id) === garageId);
    setGarageName(found?.name || '');
  }, [garageId, garages]);

  // Price preview for one-off / recurring
  useEffect(() => {
    if ((bookingType !== 'one-off' && bookingType !== 'recurring') || !garageId || !startTime || !endTime) {
      setPricePreview(null); return;
    }
    axios.post(API_BASE + '/api/reservations/preview_price/', {
      garage_id: garageId, start_time: startTime, end_time: endTime,
    }).then(r => setPricePreview(r.data.price)).catch(() => setPricePreview(null));
  }, [garageId, startTime, endTime, bookingType]);

  // Auto-calculate contract price for subscription / corporate
  useEffect(() => {
    if (bookingType !== 'subscription' && bookingType !== 'corporate') { setContractPrice(null); return; }
    if (!garageId) return;
    const contractType = bookingType === 'corporate' ? 'corporate' : 'subscription';
    axios.get(API_BASE + '/api/contracts/preview_price/', {
      params: { garage_id: garageId, contract_type: contractType, num_spaces: numSpaces, duration_months: durationMonths },
    }).then(r => setContractPrice(r.data)).catch(() => setContractPrice(null));
  }, [garageId, bookingType, numSpaces, durationMonths]);

  if (!user) return <AuthWall />;

  const toggleDay = (d) => setRecurDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  // Build recur_dates: for each selected day, generate that weekday for recurWeeks weeks from startTime
  const buildRecurDates = () => {
    if (!startTime || recurDays.length === 0) return [];
    const base = new Date(startTime);
    const duration = endTime ? new Date(endTime) - base : 3600000;
    const dayIdxMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
    const dates = [];
    for (let w = 0; w < recurWeeks; w++) {
      for (const d of recurDays) {
        const target = new Date(base);
        const diff = (dayIdxMap[d] - base.getDay() + 7) % 7 || 7;
        target.setDate(base.getDate() + diff + w * 7);
        if (target.getTime() !== base.getTime()) {
          dates.push(target.toISOString().slice(0, 16));
        }
      }
    }
    return dates;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (bookingType === 'subscription' || bookingType === 'corporate') {
        const res = await axios.post(API_BASE + '/api/contracts/create_contract/', {
          garage_id: garageId,
          contract_type: bookingType === 'corporate' ? 'corporate' : 'subscription',
          start_date: startDate,
          duration_months: durationMonths,
          num_spaces: numSpaces,
          notes: contactNote,
        });
        setSuccessMeta({ type: bookingType, garage: garageName, price: contractPrice?.monthly_fee || '—', contractType: bookingType });
        setSuccess(true);
      } else {
        if (new Date(endTime) <= new Date(startTime)) {
          setError('End time must be after start time.'); setLoading(false); return;
        }
        const recur_dates = bookingType === 'recurring' ? buildRecurDates() : [];
        const res = await axios.post(API_BASE + '/api/reservations/create_reservation/', {
          garage_id: garageId, start_time: startTime, end_time: endTime,
          vehicle_registration: plate, reservation_type: bookingType, recur_dates,
        });
        const created = Array.isArray(res.data) ? res.data : [res.data];
        const totalPrice = created.reduce((s, r) => s + parseFloat(r.dynamic_price_charged || 0), 0).toFixed(2);
        setSuccessMeta({ type: bookingType, garage: garageName, plate, price: totalPrice });
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    }
    setLoading(false);
  };

  const reset = () => {
    setSuccess(false); setPlate(''); setStartTime(''); setEndTime('');
    setPricePreview(null); setError(''); setRecurDays([]); setContractPrice(null); setStartDate('');
  };

  if (success) return <SuccessScreen {...successMeta} onReset={reset} />;

  const durationHours = startTime && endTime
    ? Math.max(0, (new Date(endTime) - new Date(startTime)) / 3600000).toFixed(1)
    : null;

  const selectedType = TYPES.find(t => t.id === bookingType);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 620, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem', marginLeft: '-0.5rem' }} onClick={() => navigate('/')}>
        <ChevronLeft size={16} /> Back to locations
      </button>

      <h2 style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>Reserve a Spot</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
        Choose how you'd like to park. Payment is monthly — no upfront charge.
      </p>

      {/* ── Booking type selector ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1.75rem' }}>
        {TYPES.map(t => (
          <button key={t.id} type="button" onClick={() => { setBookingType(t.id); setError(''); }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem',
              borderRadius: 'var(--radius)', border: `1.5px solid ${bookingType === t.id ? t.color : 'var(--border)'}`,
              background: bookingType === t.id ? `${t.color}12` : 'var(--surface)',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            }}>
            <div style={{ color: bookingType === t.id ? t.color : 'var(--text-muted)', marginTop: 2, flexShrink: 0 }}>{t.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: bookingType === t.id ? t.color : 'var(--text-primary)' }}>{t.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{t.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Type description */}
      <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)', borderLeft: `3px solid ${selectedType.color}` }}>
        {selectedType.desc}
      </p>

      <div className="card">
        <form onSubmit={handleSubmit}>

          {/* ── Garage selector (all types) ── */}
          <div className="form-group">
            <label className="form-label"><MapPin size={11} style={{ display: 'inline', marginRight: 4 }} />Garage</label>
            <select className="form-input" value={garageId} onChange={e => setGarageId(e.target.value)} required>
              {garages.length === 0 && <option>Loading...</option>}
              {garages.map(g => <option key={g.id} value={g.id}>{g.name} — {g.location}</option>)}
            </select>
          </div>

          {/* ── ONE-OFF fields ── */}
          {bookingType === 'one-off' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label"><Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />Arrival</label>
                  <input type="datetime-local" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label"><Clock size={11} style={{ display: 'inline', marginRight: 4 }} />Departure</label>
                  <input type="datetime-local" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                </div>
              </div>
              {durationHours && parseFloat(durationHours) > 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                  Duration: <strong style={{ color: 'var(--text-primary)' }}>{durationHours}h</strong>
                </p>
              )}
              <div className="form-group">
                <label className="form-label"><Car size={11} style={{ display: 'inline', marginRight: 4 }} />Vehicle Registration</label>
                <input type="text" className="form-input" placeholder="e.g. AB12 CDE" value={plate}
                  onChange={e => setPlate(e.target.value.toUpperCase())} required style={{ letterSpacing: '0.05em', fontWeight: 600 }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Used for automatic barrier access — no ticket needed.</p>
              </div>
              {pricePreview !== null && (
                <div className="price-preview">
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estimated charge</p>
                    <p style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary-light)', letterSpacing: '-0.02em' }}>£{pricePreview}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Added to your monthly statement</p>
                  </div>
                  <CreditCard size={28} color="var(--primary-light)" opacity={0.5} />
                </div>
              )}
            </>
          )}

          {/* ── RECURRING fields ── */}
          {bookingType === 'recurring' && (
            <>
              <div className="form-group">
                <label className="form-label">Which days of the week?</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {DAYS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDay(d)}
                      style={{ padding: '0.4rem 0.875rem', borderRadius: '2rem', border: `1.5px solid ${recurDays.includes(d) ? 'var(--accent)' : 'var(--border)'}`, background: recurDays.includes(d) ? 'rgba(16,185,129,0.1)' : 'transparent', color: recurDays.includes(d) ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label"><Clock size={11} style={{ display: 'inline', marginRight: 4 }} />Arrival time (first session)</label>
                  <input type="datetime-local" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label"><Clock size={11} style={{ display: 'inline', marginRight: 4 }} />Departure time</label>
                  <input type="datetime-local" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Schedule for how many weeks?</label>
                <select className="form-input" value={recurWeeks} onChange={e => setRecurWeeks(Number(e.target.value))}>
                  {[1,2,4,8,12].map(w => <option key={w} value={w}>{w} week{w > 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label"><Car size={11} style={{ display: 'inline', marginRight: 4 }} />Vehicle Registration</label>
                <input type="text" className="form-input" placeholder="e.g. AB12 CDE" value={plate}
                  onChange={e => setPlate(e.target.value.toUpperCase())} required style={{ letterSpacing: '0.05em', fontWeight: 600 }} />
              </div>
              {pricePreview !== null && recurDays.length > 0 && (
                <div className="price-preview">
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estimated per session</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent)', letterSpacing: '-0.02em' }}>£{pricePreview}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      ≈ £{(parseFloat(pricePreview) * recurDays.length * recurWeeks).toFixed(2)} total over {recurWeeks} weeks
                    </p>
                  </div>
                  <RefreshCw size={28} color="var(--accent)" opacity={0.5} />
                </div>
              )}
            </>
          )}

          {/* ── SUBSCRIPTION fields ── */}
          {bookingType === 'subscription' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label"><Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />Start Date</label>
                  <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <select className="form-input" value={durationMonths} onChange={e => setDurationMonths(Number(e.target.value))}>
                    {[1,3,6,12].map(m => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
              <div className="price-preview" style={{ borderColor: 'rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.06)' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Auto-calculated monthly fee</p>
                  {contractPrice ? (
                    <>
                      <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#8b5cf6', letterSpacing: '-0.02em' }}>£{contractPrice.monthly_fee}<span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>/mo</span></p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Total: £{contractPrice.total} over {durationMonths} month{durationMonths > 1 ? 's' : ''}</p>
                    </>
                  ) : (
                    <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Calculating…</p>
                  )}
                </div>
                <CreditCard size={28} color="#8b5cf6" opacity={0.5} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>
                Guaranteed space every day of the month. Price based on garage rate × 30 daily slots/month.
              </p>
            </>
          )}

          {/* ── CORPORATE fields ── */}
          {bookingType === 'corporate' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label"><Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />Start Date</label>
                  <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <select className="form-input" value={durationMonths} onChange={e => setDurationMonths(Number(e.target.value))}>
                    {[1,3,6,12,24].map(m => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label"><Users size={11} style={{ display: 'inline', marginRight: 4 }} />Number of Spaces</label>
                <input type="number" min="1" className="form-input" value={numSpaces} onChange={e => setNumSpaces(Number(e.target.value))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Purpose / Notes</label>
                <input type="text" className="form-input" placeholder="e.g. Employee parking for HQ staff" value={contactNote}
                  onChange={e => setContactNote(e.target.value)} />
              </div>
              <div className="price-preview" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Auto-calculated block fee</p>
                  {contractPrice ? (
                    <>
                      <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '-0.02em' }}>£{contractPrice.monthly_fee}<span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>/mo</span></p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {numSpaces} space{numSpaces > 1 ? 's' : ''} · Total: £{contractPrice.total} over {durationMonths} month{durationMonths > 1 ? 's' : ''}
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Calculating…</p>
                  )}
                </div>
                <Building2 size={28} color="#f59e0b" opacity={0.5} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>
                Price per space = garage rate × 30 daily slots/month × peak multiplier.
              </p>
            </>
          )}

          {error && <div className="alert alert-error"><span>{error}</span></div>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Processing...' : bookingType === 'one-off' ? 'Confirm Reservation' : bookingType === 'recurring' ? `Book ${recurDays.length * recurWeeks || ''} Sessions` : bookingType === 'subscription' ? 'Activate Subscription' : 'Create Corporate Contract'}
            {!loading && <ArrowRight size={16} />}
          </button>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.875rem' }}>
            No upfront payment · Billed monthly · Cancel anytime
          </p>
        </form>
      </div>
    </div>
  );
}
