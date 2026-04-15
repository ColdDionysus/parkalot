import API_BASE from '../api';
import { createContext, useContext, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('access_token');
    if (t) axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    return t;
  });
  const navigate = useNavigate();

  const login = async (username, password) => {
    try {
      const res = await axios.post(API_BASE + '/api/auth/token/', { username, password });
      setToken(res.data.access);
      localStorage.setItem('access_token', res.data.access);
      
      const role = username === 'admin' ? 'manager' : (username.startsWith('staff') ? 'staff' : 'customer');
      const userData = { username, role };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.access}`;
      
      if (role === 'manager') navigate('/dashboard');
      else if (role === 'staff') navigate('/staff');
      else navigate('/');
      
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Invalid credentials' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    delete axios.defaults.headers.common['Authorization'];
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
