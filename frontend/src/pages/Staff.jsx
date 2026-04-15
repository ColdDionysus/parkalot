import API_BASE from '../api';
import { useState, useEffect } from 'react';
import { Scan, CheckCircle, XCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import axios from 'axios';

export default function Staff() {
  const [garages, setGarages] = useState([]);
  const [garageId, setGarageId] = useState('');
  const [entryPlate, setEntryPlate] = useState('');
  const [entryResult, setEntryResult] = useState(null);
  const [entryError, setEntryError] = useState('');
  const [exitSpace, setExitSpace] = useState('');
  const [exitResult, setExitResult] = useState(null);
  const [exitError, setExitError] = useState('');

  useEffect(() => {
    axios.get(API_BASE + '/api/garages/').then(res => {
      setGarages(res.data);
      if (res.data.length > 0) setGarageId(String(res.data[0].id));
    });
  }, []);

  const simulateEntry = async () => {
    setEntryError(''); setEntryResult(null);
    if (!entryPlate.trim()) { setEntryError('Enter a license plate.'); return; }
    try {
      const res = await axios.post(API_BASE + '/api/lpr/entry/', { license_plate: entryPlate.toUpperCase(), garage_id: garageId });
      setEntryResult(res.data);
      if (res.data.space) setExitSpace(res.data.space);
    } catch (err) {
      setEntryError(err.response?.data?.message || 'No active reservation found for this vehicle.');
    }
  };

  const simulateExit = async () => {
    setExitError(''); setExitResult(null);
    if (!exitSpace.trim()) { setExitError('Enter a space number.'); return; }
    try {
      const res = await axios.post(API_BASE + '/api/lpr/exit/', { space_number: exitSpace, garage_id: garageId });
      setExitResult(res.data);
    } catch (err) {
      setExitError(err.response?.data?.message || 'Space not found.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>Staff Terminal</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>License plate recognition simulator — manage vehicle entry and exit.</p>
      </div>

      <div className="form-group" style={{ maxWidth: 380, marginBottom: '2rem' }}>
        <label className="form-label">Active Garage</label>
        <select className="form-input" value={garageId} onChange={e => setGarageId(e.target.value)}>
          {garages.length === 0 && <option>Loading...</option>}
          {garages.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      <div className="grid-2">
        {/* Entry */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '0.625rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownLeft size={18} color="var(--accent)" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Vehicle Entry</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Scan plate at entry barrier</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">License Plate</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. AB12 CDE"
              value={entryPlate}
              onChange={e => setEntryPlate(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && simulateEntry()}
              style={{ letterSpacing: '0.06em', fontWeight: 700 }}
            />
          </div>

          <button className="btn btn-accent" style={{ width: '100%' }} onClick={simulateEntry}>
            <Scan size={16} /> Trigger Entry Scan
          </button>

          {entryError && (
            <div className="alert alert-error" style={{ marginTop: '1.25rem' }}>
              <XCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{entryError}</span>
            </div>
          )}
          {entryResult && (
            <div className="alert alert-success" style={{ marginTop: '1.25rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <CheckCircle size={16} /> {entryResult.message}
              </div>
              <div>
                <p style={{ fontSize: '0.72rem', opacity: 0.7, marginBottom: '0.2rem' }}>Assigned Space</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.01em' }}>{entryResult.space}</p>
                <p style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: '0.2rem' }}>Direct driver via elevator</p>
              </div>
            </div>
          )}
        </div>

        {/* Exit */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '0.625rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={18} color="var(--primary-light)" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Vehicle Exit</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Release space at exit barrier</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Space Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. L1-5"
              value={exitSpace}
              onChange={e => setExitSpace(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && simulateExit()}
              style={{ letterSpacing: '0.04em', fontWeight: 600 }}
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={simulateExit}>
            <ArrowUpRight size={16} /> Trigger Exit Barrier
          </button>

          {exitError && (
            <div className="alert alert-error" style={{ marginTop: '1.25rem' }}>
              <XCircle size={16} style={{ flexShrink: 0 }} /> <span>{exitError}</span>
            </div>
          )}
          {exitResult && (
            <div className="alert alert-success" style={{ marginTop: '1.25rem' }}>
              <CheckCircle size={16} style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 600 }}>{exitResult.message}</p>
                <p style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: '0.2rem' }}>Space {exitSpace} is now available.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
