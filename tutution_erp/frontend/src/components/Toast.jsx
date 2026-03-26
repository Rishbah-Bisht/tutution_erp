import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ICONS = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
};
const COLORS = {
    success: { bg: '#f0fff4', border: '#9ae6b4', color: '#276749' },
    error: { bg: '#fff5f5', border: '#feb2b2', color: '#c53030' },
    warning: { bg: '#fffaf0', border: '#f6d860', color: '#975a16' },
    info: { bg: '#ebf8ff', border: '#90cdf4', color: '#2b6cb0' },
};

const ToastItem = ({ toast, onRemove }) => {
    const Icon = ICONS[toast.type] || Info;
    const colors = COLORS[toast.type] || COLORS.info;

    useEffect(() => {
        const t = setTimeout(() => onRemove(toast.id), toast.duration || 3500);
        return () => clearTimeout(t);
    }, [toast.id, toast.duration, onRemove]);

    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: colors.bg, border: `1px solid ${colors.border}`,
            borderRadius: 6, padding: '12px 16px', minWidth: 280, maxWidth: 380,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            animation: 'slideInRight 0.25s cubic-bezier(0.22,1,0.36,1)',
            position: 'relative'
        }}>
            <Icon size={17} color={colors.color} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: '0.875rem', color: colors.color, flex: 1, lineHeight: 1.5 }}>{toast.message}</span>
            <button onClick={() => onRemove(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.color, padding: 0, flexShrink: 0 }}>
                <X size={14} />
            </button>
        </div>
    );
};

const ToastContainer = ({ toasts, onRemove }) => (
    <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
    }}>
        <style>{`@keyframes slideInRight { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }`}</style>
        {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={onRemove} />)}
    </div>
);

// Hook to use in parent components
export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3500) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

    const toast = useMemo(() => ({
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        warning: (msg) => addToast(msg, 'warning'),
        info: (msg) => addToast(msg, 'info'),
    }), [addToast]);

    return { toasts, toast, removeToast };
};

export default ToastContainer;

