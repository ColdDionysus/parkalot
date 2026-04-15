import API_BASE from '../api';
import { useState, useEffect } from 'react';
import { Activity, Users, CreditCard, RefreshCw, Search, ChevronRight, FileText, Car, Calendar, Building2, X, ParkingSquare, Plus, Layers, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [garages, setGarages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Users panel state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [userLoading, setUserLoading] = useState(false);

  // Garages panel state
  const [garagesList, setGaragesList] = useState([]);
  const [garagesLoading, setGaragesLoading] = useState(false);
  const [showAddGarage, setShowAddGarage] = useState(false);
  const [garageForm, setGarageForm] = useState({ name: '', location: '', num_levels: 1, spaces_per_level: 10 });
  const [expandedGarage, setExpandedGarage] = useState(null);
  const [garageSpaces, setGarageSpaces] = useState({});
  const [genForms, setGenForms] = useState({}); // per-garage generate-spaces form state
  const [genLoading, setGenLoading] = useState({});

  const load = () => {
    setLoading(true);
    Promise.all([
      axios.get(API_BASE + '/api/garages/'),
      axios.get(API_BASE + '/api/reservations/'),
      axios.get(API_BASE + '/api/billing/revenue_summary/').catch(() => null),
    ]).then(([gRes, rRes, revRes]) => {
      const gData = gRes.data;
      const rData = rRes.data;
      const activeRes = rData.filter(r => r.status === 'active');
      const resMap = activeRes.reduce((acc, r) => { acc[r.garage] = (acc[r.garage] || 0) + 1; return acc; }, {});
      const totalCap = gData.reduce((s, g) => s + g.total_capacity, 0);
      const totalOcc = activeRes.length;
      const revenue = revRes ? parseFloat(revRes.data.total_revenue || 0) : 0;

      setStats({
        occupancyPct: totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0,
        activeRes: activeRes.length,
        totalRes: rData.length,
        revenue,
        totalCap,
      });

      setGarages(gData.map(g => {
        const occ = resMap[g.id] || 0;
        const pct = g.total_capacity > 0 ? Math.round((occ / g.total_capacity) * 100) : 0;
        return { ...g, occupied: occ, pct, status: pct >= 90 ? 'Near Full' : pct >= 70 ? 'Busy' : 'Healthy' };
      }));
      setLastUpdate(new Date().toLocaleTimeString());
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Load users list for admin users panel
  useEffect(() => {
    if (activeTab === 'users') {
      axios.get(API_BASE + '/api/users/').then(r => setUsers(r.data)).catch(() => {});
    }
  }, [activeTab]);

  // Load garages for admin garages panel
  const loadGarages = () => {
    setGaragesLoading(true);
    axios.get(API_BASE + '/api/garages/')
      .then(r => setGaragesList(r.data))
      .catch(() => {})
      .finally(() => setGaragesLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'garages') loadGarages();
  }, [activeTab]);

  const handleGarageFormChange = e => {
    const { name, value } = e.target;
    setGarageForm(prev => ({ ...prev, [name]: name === 'name' || name === 'location' ? value : Math.max(1, parseInt(value) || 1) }));
  };

  const handleAddGarage = async e => {
    e.preventDefault();
    try {
      const res = await axios.post(API_BASE + '/api/garages/create_garage/', garageForm);
      toast(`Garage "${res.data.garage.name}" created with ${res.data.spaces_created} spaces.`, 'success');
      setGarageForm({ name: '', location: '', num_levels: 1, spaces_per_level: 10 });
      setShowAddGarage(false);
      loadGarages();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to create garage.', 'error');
    }
  };

  const toggleGarageSpaces = async (garageId) => {
    if (expandedGarage === garageId) { setExpandedGarage(null); return; }
    setExpandedGarage(garageId);
    try {
      const r = await axios.get(`${API_BASE}/api/garages/${garageId}/spaces/`);
      setGarageSpaces(prev => ({ ...prev, [garageId]: r.data }));
    } catch { setGarageSpaces(prev => ({ ...prev, [garageId]: [] })); }
  };

  const handleGenerateSpaces = async (garageId) => {
    const form = genForms[garageId] || { num_levels: 1, spaces_per_level: 10 };
    setGenLoading(prev => ({ ...prev, [garageId]: true }));
    try {
      const r = await axios.post(`${API_BASE}/api/garages/${garageId}/generate_spaces/`, form);
      toast(`Generated ${r.data.spaces_created} spaces successfully.`, 'success');
      const spacesRes = await axios.get(`${API_BASE}/api/garages/${garageId}/spaces/`);
      setGarageSpaces(prev => ({ ...prev, [garageId]: spacesRes.data }));
      loadGarages();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to generate spaces.', 'error');
    } finally {
      setGenLoading(prev => ({ ...prev, [garageId]: false }));
    }
  };

  const loadUserDetail = (u) => {
    setSelectedUser(u);
    setUserDetail(null);
    setUserLoading(true);
    axios.get(`${API_BASE}/api/users/${u.id}/details/`)
      .then(r => setUserDetail(r.data))
      .catch(() => setUserDetail(null))
      .finally(() => setUserLoading(false));
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const fmt = dt => dt ? new Date(dt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  const statusStyle = (s) => ({
    'Healthy': { bg: 'rgba(16,185,129,0.1)', color: '#34d399', border: 'rgba(16,185,129,0.2)' },
    'Busy':    { bg: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
    'Near Full': { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.2)' },
  }[s] || {});

  return (
    <div className="animate-fade-in">
      {/* Tab bar */}
      <div className="tabs" style={{ marginBottom: '2rem' }}>
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <Activity size={14} style={{ display: 'inline', marginRight: 6 }} />Overview
        </button>
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={14} style={{ display: 'inline', marginRight: 6 }} />Users
        </button>
        <button className={`tab-btn ${activeTab === 'garages' ? 'active' : ''}`} onClick={() => setActiveTab('garages')}>
          <Building2 size={14} style={{ display: 'inline', marginRight: 6 }} />Garages
        </button>
      </div>

      {/* ── USERS PANEL ── */}
      {activeTab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '300px 1fr' : '1fr', gap: '1.5rem' }}>
          {/* Left: user list */}
          <div>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search users…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredUsers.map(u => (
                <div key={u.id} onClick={() => loadUserDetail(u)}
                  style={{ padding: '0.875rem 1rem', borderRadius: 'var(--radius)', border: `1px solid ${selectedUser?.id === u.id ? 'var(--primary)' : 'var(--border)'}`, background: selectedUser?.id === u.id ? 'rgba(99,102,241,0.08)' : 'var(--surface)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                      {u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.username}</div>
                      {u.is_staff && <div style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>Staff</div>}
                    </div>
                  </div>
                  <ChevronRight size={15} color="var(--text-muted)" />
                </div>
              ))}
              {filteredUsers.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem' }}>No users found.</p>}
            </div>
          </div>

          {/* Right: user detail */}
          {selectedUser && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem' }}>
                    {selectedUser.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem' }}>{selectedUser.username}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{selectedUser.email || 'No email'}</div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUser(null)}><X size={14} /></button>
              </div>

              {userLoading && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</p>}

              {userDetail && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Reservations */}
                  <div className="table-card">
                    <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Car size={14} color="var(--text-muted)" />
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Reservations ({userDetail.reservations.length})</span>
                    </div>
                    {userDetail.reservations.length === 0 ? (
                      <p style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No reservations.</p>
                    ) : (
                      <table>
                        <thead><tr><th>Garage</th><th>Vehicle</th><th>Period</th><th>Type</th><th>Charge</th><th>Status</th></tr></thead>
                        <tbody>
                          {userDetail.reservations.map(r => (
                            <tr key={r.id}>
                              <td>{r.garage_name}</td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.vehicle_registration}</td>
                              <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{fmt(r.start_time)}</td>
                              <td><span className="badge badge-blue">{r.reservation_type}</span></td>
                              <td style={{ fontWeight: 700 }}>£{parseFloat(r.charge).toFixed(2)}</td>
                              <td><span className={`badge ${r.status === 'active' ? 'badge-green' : r.status === 'cancelled' ? 'badge-red' : 'badge-blue'}`}>{r.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Contracts */}
                  <div className="table-card">
                    <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={14} color="var(--text-muted)" />
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Contracts ({userDetail.contracts.length})</span>
                    </div>
                    {userDetail.contracts.length === 0 ? (
                      <p style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No contracts.</p>
                    ) : (
                      <table>
                        <thead><tr><th>Type</th><th>Garage</th><th>Period</th><th>Monthly Fee</th><th>Status</th></tr></thead>
                        <tbody>
                          {userDetail.contracts.map(c => (
                            <tr key={c.id}>
                              <td><span className="badge badge-blue">{c.contract_type}</span></td>
                              <td>{c.garage_name}</td>
                              <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{fmtDate(c.start_date)} → {fmtDate(c.end_date)}</td>
                              <td style={{ fontWeight: 700 }}>£{parseFloat(c.monthly_fee).toFixed(2)}</td>
                              <td><span className={`badge ${c.active ? 'badge-green' : 'badge-red'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Billing statements */}
                  <div className="table-card">
                    <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={14} color="var(--text-muted)" />
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Billing ({userDetail.statements.length})</span>
                      </div>
                    </div>
                    {userDetail.statements.length === 0 ? (
                      <p style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No statements.</p>
                    ) : (
                      <table>
                        <thead><tr><th>Period</th><th>Amount</th><th>Status</th><th>Invoice</th></tr></thead>
                        <tbody>
                          {userDetail.statements.map(s => (
                            <tr key={s.id}>
                              <td>{String(s.month).padStart(2,'0')}/{s.year}</td>
                              <td style={{ fontWeight: 700 }}>£{parseFloat(s.total_amount).toFixed(2)}</td>
                              <td><span className={`badge ${s.is_paid ? 'badge-green' : 'badge-amber'}`}>{s.is_paid ? 'Paid' : 'Pending'}</span></td>
                              <td>
                                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/invoice/${s.id}`)}>
                                  <FileText size={12} /> View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── GARAGES PANEL ── */}
      {activeTab === 'garages' && (
        <div>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Garage Management</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>Add and manage parking garages and spaces</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowAddGarage(v => !v); setGarageMsg({ text: '', type: '' }); }}>
              <Plus size={14} /> {showAddGarage ? 'Cancel' : 'Add New Garage'}
            </button>
          </div>

          {/* Add Garage Form */}
          {showAddGarage && (
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={15} color="var(--primary-light)" /> New Garage
              </h3>
              <form onSubmit={handleAddGarage}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Garage Name</label>
                    <input className="form-input" name="name" placeholder="e.g. Central Car Park" value={garageForm.name} onChange={handleGarageFormChange} required />
                  </div>
                  <div>
                    <label className="form-label">Location</label>
                    <input className="form-input" name="location" placeholder="e.g. 12 High Street, London" value={garageForm.location} onChange={handleGarageFormChange} required />
                  </div>
                  <div>
                    <label className="form-label">Number of Levels</label>
                    <input className="form-input" type="number" name="num_levels" min="1" max="20" value={garageForm.num_levels} onChange={handleGarageFormChange} />
                  </div>
                  <div>
                    <label className="form-label">Spaces per Level</label>
                    <input className="form-input" type="number" name="spaces_per_level" min="1" max="200" value={garageForm.spaces_per_level} onChange={handleGarageFormChange} />
                  </div>
                </div>
                <div style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={13} /> Total capacity: <strong style={{ color: 'var(--text-primary)', marginLeft: 4 }}>{garageForm.num_levels * garageForm.spaces_per_level} spaces</strong> ({garageForm.num_levels} level{garageForm.num_levels > 1 ? 's' : ''} × {garageForm.spaces_per_level} spaces)
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="btn btn-primary btn-sm"><Plus size={13} /> Create Garage</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddGarage(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Garages list */}
          {garagesLoading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Loading garages…</p>
          ) : garagesList.length === 0 ? (
            <div className="empty-state card">
              <Building2 size={48} />
              <h3>No garages yet</h3>
              <p>Click "Add New Garage" to create your first garage.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {garagesList.map(g => {
                const isExpanded = expandedGarage === g.id;
                const spaces = garageSpaces[g.id];
                return (
                  <div key={g.id} className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Building2 size={20} color="var(--primary-light)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{g.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                            <MapPin size={11} /> {g.location}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.375rem', fontWeight: 900, color: 'var(--primary-light)' }}>{g.total_capacity}</div>
                          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>Total Spaces</div>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleGarageSpaces(g.id)}>
                          <Layers size={13} /> {isExpanded ? 'Hide Spaces' : 'View Spaces'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded spaces */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.5rem' }}>
                        {!spaces ? (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading spaces…</p>
                        ) : spaces.length === 0 ? (
                          <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                              No individual spaces configured for this garage. Generate them now:
                            </p>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.68rem' }}>Levels</label>
                                <input
                                  className="form-input"
                                  type="number" min="1" max="20"
                                  style={{ width: 80, padding: '0.4rem 0.5rem' }}
                                  value={(genForms[g.id] || { num_levels: 1 }).num_levels}
                                  onChange={e => setGenForms(prev => ({ ...prev, [g.id]: { ...(prev[g.id] || { num_levels: 1, spaces_per_level: 10 }), num_levels: Math.max(1, parseInt(e.target.value) || 1) } }))}
                                />
                              </div>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.68rem' }}>Spaces / Level</label>
                                <input
                                  className="form-input"
                                  type="number" min="1" max="200"
                                  style={{ width: 100, padding: '0.4rem 0.5rem' }}
                                  value={(genForms[g.id] || { spaces_per_level: 10 }).spaces_per_level}
                                  onChange={e => setGenForms(prev => ({ ...prev, [g.id]: { ...(prev[g.id] || { num_levels: 1, spaces_per_level: 10 }), spaces_per_level: Math.max(1, parseInt(e.target.value) || 1) } }))}
                                />
                              </div>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={genLoading[g.id]}
                                onClick={() => handleGenerateSpaces(g.id)}
                              >
                                <Layers size={13} /> {genLoading[g.id] ? 'Generating…' : 'Generate Spaces'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                              {spaces.length} Spaces
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {spaces.map(s => (
                                <div key={s.id} style={{ padding: '0.25rem 0.625rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'monospace', background: s.is_occupied ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: s.is_occupied ? '#f87171' : '#34d399', border: `1px solid ${s.is_occupied ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                                  L{s.level}-{s.space_number}
                                </div>
                              ))}
                            </div>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                              <span style={{ color: '#34d399' }}>■</span> Available &nbsp; <span style={{ color: '#f87171' }}>■</span> Occupied
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── OVERVIEW PANEL ── */}
      {activeTab === 'overview' && <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>Manager Dashboard</h2>
          {lastUpdate && <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Updated at {lastUpdate}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.875rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '2rem', fontSize: '0.78rem', fontWeight: 600, color: '#34d399' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} /> Live
          </span>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-pulse' : ''} /> Refresh
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '4rem' }}>Loading dashboard...</div>
      ) : stats && (
        <>
          {/* Stat cards */}
          <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
            {[
              {
                label: 'Overall Occupancy',
                value: `${stats.occupancyPct}%`,
                sub: `${stats.totalCap.toLocaleString()} total spaces`,
                icon: <Activity size={20} />,
                accent: 'var(--primary)',
                bar: stats.occupancyPct,
              },
              {
                label: 'Active Reservations',
                value: stats.activeRes.toLocaleString(),
                sub: `${stats.totalRes} total in system`,
                icon: <Users size={20} />,
                accent: 'var(--accent)',
              },
              {
                label: 'Total Revenue',
                value: `£${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: 'From all reservations',
                icon: <CreditCard size={20} />,
                accent: 'var(--warning)',
              },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{s.label}</p>
                    <p style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em' }}>{s.value}</p>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: '0.625rem', background: `${s.accent}18`, border: `1px solid ${s.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.accent }}>
                    {s.icon}
                  </div>
                </div>
                {s.bar !== undefined && (
                  <div className="progress-bar" style={{ marginBottom: '0.5rem' }}>
                    <div className="progress-fill" style={{ width: `${s.bar}%`, background: `linear-gradient(90deg, ${s.accent}, #c084fc)` }} />
                  </div>
                )}
                <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Garage table */}
          <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Garage Status</h3>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Garage</th>
                  <th>Location</th>
                  <th>Capacity</th>
                  <th>Active</th>
                  <th>Occupancy</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {garages.map(g => {
                  const ss = statusStyle(g.status);
                  const barColor = g.pct < 70 ? 'var(--accent)' : g.pct < 90 ? 'var(--warning)' : 'var(--danger)';
                  return (
                    <tr key={g.id}>
                      <td style={{ fontWeight: 600 }}>{g.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{g.location}</td>
                      <td>{g.total_capacity.toLocaleString()}</td>
                      <td>{g.occupied}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 120 }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: `${g.pct}%`, background: barColor }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: barColor, width: 32, textAlign: 'right' }}>{g.pct}%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: '0.25rem 0.7rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                          {g.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      </>}
    </div>
  );
}
