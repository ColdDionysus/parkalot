import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Car, User, LogOut, LayoutDashboard, MonitorSmartphone } from 'lucide-react';
import './index.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Staff from './pages/Staff';
import Reserve from './pages/Reserve';
import Profile from './pages/Profile';
import Invoice from './pages/Invoice';

function Header() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-inner">
        {/* Brand */}
        <Link to="/" className="brand">
          <Car size={22} />
          ParkaLot
        </Link>

        {/* Nav */}
        <nav className="nav-links">
          <Link to="/" className={pathname === '/' ? 'active' : ''}>Find Spots</Link>
          <Link to="/reserve" className={pathname === '/reserve' ? 'active' : ''}>Book Now</Link>
          {user?.role === 'manager' && (
            <Link to="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <LayoutDashboard size={14} /> Dashboard
              </span>
            </Link>
          )}
          {user?.role === 'staff' && (
            <Link to="/staff" className={pathname === '/staff' ? 'active' : ''}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MonitorSmartphone size={14} /> Staff Terminal
              </span>
            </Link>
          )}
          {user && (
            <Link to="/profile" className={pathname === '/profile' ? 'active' : ''}>My Account</Link>
          )}
        </nav>

        {/* Auth area */}
        <div className="user-profile">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', background: 'var(--surface-raised)', borderRadius: '2rem', border: '1px solid var(--border)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                  {user.username[0].toUpperCase()}
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 500 }}>{user.username}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={logout} title="Sign out">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/register" className="btn btn-ghost btn-sm">Register</Link>
              <Link to="/login" className="btn btn-primary btn-sm">
                <User size={14} /> Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <Router>
      <ToastProvider>
      <AuthProvider>
        <div className="layout">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/reserve" element={<Reserve />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/invoice/:id" element={<Invoice />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
