import API_BASE from '../api';
import { useState, useEffect } from 'react';
import { Search, MapPin, Car, TrendingUp, Shield, Zap, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ACCENT_COLORS = ['purple', '', 'green'];

function AvailabilityBadge({ available, capacity }) {
  const pct = capacity > 0 ? (available / capacity) * 100 : 0;
  if (pct > 40) return <span className="badge badge-green"><span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',display:'inline-block'}}/>Available</span>;
  if (pct > 10) return <span className="badge badge-amber"><span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',display:'inline-block'}}/>Filling Up</span>;
  return <span className="badge badge-red"><span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',display:'inline-block'}}/>Almost Full</span>;
}

export default function Home() {
  const [garages, setGarages] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      axios.get(API_BASE + '/api/garages/'),
      axios.get(API_BASE + '/api/reservations/').catch(() => ({ data: [] })),
      axios.get(API_BASE + '/api/pricing/').catch(() => ({ data: [] })),
    ]).then(([gRes, rRes, pRes]) => {
      const resMap = rRes.data.reduce((acc, r) => {
        if (r.status === 'active') acc[r.garage] = (acc[r.garage] || 0) + 1;
        return acc;
      }, {});
      const priceMap = pRes.data.reduce((acc, p) => { acc[p.garage] = p; return acc; }, {});
      const enriched = gRes.data.map((g, i) => ({
        ...g,
        occupied: resMap[g.id] || 0,
        available: Math.max(0, g.total_capacity - (resMap[g.id] || 0)),
        baseRate: priceMap[g.id]?.base_rate || 10,
        accent: ACCENT_COLORS[i % ACCENT_COLORS.length],
      }));
      setGarages(enriched);
      setFiltered(enriched);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSearch = (val) => {
    setSearch(val);
    const term = val.toLowerCase().trim();
    setFiltered(term ? garages.filter(g =>
      g.name.toLowerCase().includes(term) || g.location.toLowerCase().includes(term)
    ) : garages);
  };

  const handleBook = (garage) => {
    if (!user) {
      navigate('/login', { state: { from: '/reserve', garageId: garage.id } });
    } else {
      navigate('/reserve', { state: { garageId: garage.id, garageName: garage.name } });
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="hero">
        <div className="hero-eyebrow">
          <Zap size={12} />
          Real-time availability across all locations
        </div>
        <h1>Park Smarter,<br />Drive Easier.</h1>
        <p>Reserve your guaranteed spot in seconds. Dynamic pricing, instant confirmation, and barrier-free entry — all in one place.</p>

        {/* Search */}
        <div className="search-bar">
          <Search size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            placeholder="Search by city or garage name..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          <button
            className="btn btn-primary"
            style={{ borderRadius: '1.5rem', padding: '0.6rem 1.5rem' }}
            onClick={() => handleSearch(search)}
          >
            Find Spots
          </button>
        </div>
      </div>

      {/* Perks strip */}
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '3.5rem', flexWrap: 'wrap' }}>
        {[
          { icon: <Shield size={15} />, text: 'Guaranteed spot' },
          { icon: <Clock size={15} />, text: 'Book in under 60s' },
          { icon: <TrendingUp size={15} />, text: 'Dynamic pricing' },
          { icon: <Zap size={15} />, text: 'Instant barrier access' },
        ].map(p => (
          <div key={p.text} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--primary-light)' }}>{p.icon}</span> {p.text}
          </div>
        ))}
      </div>

      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
            {search ? `Results for "${search}"` : 'Available Locations'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {loading ? 'Loading...' : `${filtered.length} garage${filtered.length !== 1 ? 's' : ''} available`}
          </p>
        </div>
      </div>

      {/* Garage cards */}
      {loading ? (
        <div className="grid-3">
          {[1,2,3].map(i => (
            <div key={i} className="garage-card" style={{ height: 220, opacity: 0.4 }}>
              <div className="garage-card-accent animate-pulse" />
              <div className="garage-card-body" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <MapPin size={48} />
          <h3>No garages found</h3>
          <p>Try a different city or garage name.</p>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(g => {
            const pct = g.total_capacity > 0 ? Math.round((g.occupied / g.total_capacity) * 100) : 0;
            const fillColor = pct < 60 ? 'var(--accent)' : pct < 85 ? 'var(--warning)' : 'var(--danger)';
            return (
              <div key={g.id} className="garage-card">
                <div className={`garage-card-accent ${g.accent}`} />
                <div className="garage-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>{g.name}</h3>
                    <AvailabilityBadge available={g.available} capacity={g.total_capacity} />
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1.25rem' }}>
                    <MapPin size={13} /> {g.location}
                  </p>

                  {/* Occupancy bar */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span>{g.occupied} occupied</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{g.available} free</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: fillColor }} />
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <div>
                      <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)' }}>£{g.baseRate}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>/hr</span>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ borderRadius: '2rem', paddingLeft: '1.1rem', paddingRight: '1.1rem' }}
                      onClick={() => handleBook(g)}
                    >
                      Book Now <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA if logged out */}
      {!user && !loading && filtered.length > 0 && (
        <div className="card" style={{ textAlign: 'center', marginTop: '3rem', padding: '2.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(192,132,252,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
          <Car size={36} color="var(--primary-light)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ready to reserve your spot?</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Create a free account or sign in to book in under 60 seconds.</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/register')}>Create Account</button>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>Sign In <ArrowRight size={15} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
