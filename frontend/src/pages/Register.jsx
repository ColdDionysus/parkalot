import API_BASE from '../api';
import { useState } from 'react';
import { User, Lock, Mail, ArrowRight, Car, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await axios.post(API_BASE + '/api/users/register/', { username, email, password });
      toast('Account created! Please sign in.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const perks = ['Reserve across all UK locations', 'Automatic barrier access', 'Monthly billing — no upfront payment', 'Cancel anytime'];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '60vh', paddingTop: '1rem', gap: '3rem', flexWrap: 'wrap' }}>
      {/* Perks panel */}
      <div style={{ maxWidth: 300, paddingTop: '1rem' }}>
        <div style={{ width: 48, height: 48, borderRadius: '0.875rem', background: 'linear-gradient(135deg, var(--primary), #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <Car size={24} color="#fff" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Join ParkaLot</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.7 }}>
          One account, every garage. Book in seconds.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {perks.map(p => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <CheckCircle size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1.125rem' }}>Create your account</h3>

          {error && <div className="alert alert-error"><span>{error}</span></div>}

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type="text" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="Choose a username" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', fontSize: '0.75rem' }}>(optional)</span></label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type="email" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type="password" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type="password" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem' }} disabled={loading}>
              {loading ? 'Creating account...' : <><span>Create Account</span> <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
