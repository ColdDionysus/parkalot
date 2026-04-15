import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '0.625rem',
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const icons = {
    success: <CheckCircle size={16} />,
    error: <XCircle size={16} />,
    info: <Info size={16} />,
  };
  const colors = {
    success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', color: '#34d399', text: '#e2faf2' },
    error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: '#f87171', text: '#fdecea' },
    info:    { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', color: '#a5b4fc', text: '#eef0ff' },
  };
  const c = colors[toast.type] || colors.info;

  return (
    <div style={{
      pointerEvents: 'all',
      display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
      padding: '0.75rem 1rem',
      background: 'var(--surface-raised, #1e1e2e)',
      border: `1px solid ${c.border}`,
      borderLeft: `3px solid ${c.color}`,
      borderRadius: '0.625rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      minWidth: 260, maxWidth: 360,
      animation: 'toast-in 0.25s ease',
      color: c.text,
      fontSize: '0.875rem',
    }}>
      <span style={{ color: c.color, flexShrink: 0, marginTop: 1 }}>{icons[toast.type]}</span>
      <span style={{ flex: 1, lineHeight: 1.45 }}>{toast.message}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0, flexShrink: 0, marginTop: 1 }}>
        <X size={14} />
      </button>
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
