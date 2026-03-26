import React, { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, X, Lock, Eye, EyeOff, Loader2, AlertTriangle, KeyRound } from 'lucide-react';

const ActionModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    actionType = 'verify', // 'verify' | 'delete' | 'danger' | 'warning'
    loading,
    error
}) => {
    const [pwd, setPwd] = useState('');
    const [showPwd, setShowPwd] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setPwd('');
            setShowPwd(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isDelete = actionType === 'delete' || actionType === 'danger';
    const isWarning = actionType === 'warning';

    const ThemeColor = isDelete
        ? 'var(--erp-error, #ef4444)'
        : isWarning
            ? 'var(--erp-accent, #ea580c)'
            : 'var(--erp-primary, #1b3a7a)';

    const Icon = isDelete ? Trash2 : (isWarning ? AlertTriangle : KeyRound);

    const handleConfirm = () => {
        if (pwd && !loading) onConfirm(pwd);
    };

    return (
        <div className="modal-overlay" style={{
            zIndex: 9999,
            backdropFilter: 'blur(8px)',
            animation: 'erpFadeIn 0.2s ease-out'
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{
                maxWidth: 440,
                width: '95vw',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--erp-border)',
                animation: 'erpSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header Section */}
                <div style={{
                    padding: '24px 24px 20px',
                    background: '#fff',
                    borderBottom: '1px solid #f1f5f9',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 42,
                            height: 42,
                            borderRadius: '12px',
                            background: isDelete ? '#fef2f2' : (isWarning ? '#fff7ed' : '#f0f4ff'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: ThemeColor
                        }}>
                            <Icon size={22} />
                        </div>
                        <div>
                            <h3 style={{
                                margin: 0,
                                color: '#0f172a',
                                fontSize: '1.15rem',
                                fontWeight: 800,
                                letterSpacing: '-0.01em'
                            }}>
                                {title || (isDelete ? 'Confirm Deletion' : 'Administrative Verification')}
                            </h3>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>
                                System Authorization Required
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: 20, right: 20,
                            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                            color: '#64748b', padding: '6px', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: '24px' }}>
                    {/* Description Box */}
                    <div style={{
                        background: isDelete ? '#fff1f2' : '#f8fafc',
                        border: `1px solid ${isDelete ? '#ffe4e6' : '#e2e8f0'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: 24
                    }}>
                        <p style={{
                            margin: 0,
                            fontSize: '0.9rem',
                            color: isDelete ? '#9f1239' : '#334155',
                            lineHeight: 1.6,
                            fontWeight: 500
                        }}>
                            {description || 'Please enter your admin password to authorize this action. This ensures sensitive operations are performed only by authorized personnel.'}
                        </p>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div style={{
                            background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c',
                            padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem',
                            display: 'flex', gap: 10, marginBottom: 20, fontWeight: 500,
                            animation: 'erpShake 0.4s'
                        }}>
                            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                            {error}
                        </div>
                    )}

                    {/* Password Input */}
                    <div className="mf">
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: 8
                        }}>
                            Admin Password
                        </label>
                        <div className="lf-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: 14, color: '#94a3b8' }}><Lock size={16} /></span>
                            <input
                                type={showPwd ? 'text' : 'password'}
                                value={pwd}
                                onChange={e => setPwd(e.target.value)}
                                placeholder="Enter authorization key"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && pwd && handleConfirm()}
                                style={{
                                    width: '100%',
                                    padding: '12px 42px',
                                    borderRadius: '10px',
                                    border: '1.5px solid #e2e8f0',
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    background: '#fff'
                                }}
                                onFocus={(e) => e.target.style.borderColor = ThemeColor}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(s => !s)}
                                style={{
                                    position: 'absolute', right: 14,
                                    background: 'none', border: 'none',
                                    color: '#94a3b8', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center'
                                }}
                            >
                                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div style={{
                    padding: '16px 24px',
                    background: '#f8fafc',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12
                }}>
                    <button
                        className="btn btn-outline"
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!pwd || loading}
                        onClick={handleConfirm}
                        style={{
                            background: ThemeColor,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 24px',
                            fontWeight: 800,
                            cursor: !pwd || loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: '0.85rem',
                            opacity: !pwd || loading ? 0.6 : 1,
                            transition: 'all 0.2s',
                            boxShadow: `0 4px 12px ${ThemeColor}40`
                        }}
                    >
                        {loading
                            ? <><Loader2 size={16} className="spin" /> Verifying</>
                            : isDelete ? <><Trash2 size={16} /> Authorize Delete</> : <><KeyRound size={16} /> Confirm Action</>
                        }
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes erpFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes erpSlideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes erpShake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `}</style>
        </div>
    );
};

export default ActionModal;

