import React, { useState, useEffect } from 'react';
import { 
    X, Save, Receipt, CheckCircle2, AlertCircle, 
    Building, Image as ImageIcon, Wind, MapPin, Phone, Mail 
} from 'lucide-react';
import apiClient from '../../api/apiConfig';

const ReceiptSettingsModal = ({ isOpen, onClose, onSave, initialSettings }) => {
    const [settings, setSettings] = useState({
        showCoachingName: true,
        showLogo: true,
        showWatermark: true,
        showAddress: true,
        showPhone: true,
        showEmail: true
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (initialSettings) {
            setSettings(initialSettings);
        }
    }, [initialSettings, isOpen]);

    if (!isOpen) return null;

    const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
        setSuccess(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const { data } = await apiClient.put('/admin/settings', { receiptSettings: settings });
            
            // Update localStorage
            const instSettings = JSON.parse(localStorage.getItem('instituteSettings') || '{}');
            instSettings.receiptSettings = settings;
            localStorage.setItem('instituteSettings', JSON.stringify(instSettings));

            setSuccess(true);
            if (onSave) onSave(settings);
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const configItems = [
        { id: 'showCoachingName', label: 'Show Institute Name', desc: 'Display name at the top', icon: Building, color: '#3b82f6' },
        { id: 'showLogo', label: 'Show Institute Logo', desc: 'Display logo at the top', icon: ImageIcon, color: '#8b5cf6' },
        { id: 'showWatermark', label: 'Show Watermark', desc: 'Faded logo in background', icon: Wind, color: '#06b6d4' },
        { id: 'showAddress', label: 'Show Address', desc: 'Include institute campus address', icon: MapPin, color: '#f59e0b' },
        { id: 'showPhone', label: 'Show Phone Number', desc: 'Contact phone on receipt', icon: Phone, color: '#10b981' },
        { id: 'showEmail', label: 'Show Email Address', desc: 'Contact email on receipt', icon: Mail, color: '#ef4444' },
    ];

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal animate-in zoom-in duration-200" style={{
                width: '100%', maxWidth: '520px', background: '#fff',
                borderRadius: '20px', overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <header style={{
                    padding: '24px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ 
                            width: 40, height: 40, borderRadius: '12px', background: 'rgba(255,255,255,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <Receipt size={22} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Receipt Layout</h2>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 500 }}>Configure print preferences</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ 
                        background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', 
                        cursor: 'pointer', width: 32, height: 32, borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                    }} className="hover:bg-white/10">
                        <X size={20} />
                    </button>
                </header>

                <div style={{ padding: '24px' }}>
                    {error && (
                        <div className="error-alert" style={{ marginBottom: 20 }}>
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="success-alert" style={{ marginBottom: 20 }}>
                            <CheckCircle2 size={18} />
                            <span>Settings updated successfully!</span>
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: 12 }}>
                        {configItems.map(item => (
                            <div key={item.id} style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 16px', borderRadius: '14px', background: '#f8fafc',
                                border: '1px solid #f1f5f9',
                                transition: 'all 0.2s'
                            }} className="hover:border-indigo-100 hover:shadow-sm">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ 
                                        width: 38, height: 38, borderRadius: '10px', background: `${item.color}10`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: item.color
                                    }}>
                                        <item.icon size={18} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{item.label}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{item.desc}</div>
                                    </div>
                                </div>
                                <label style={{ position: 'relative', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={settings[item.id]} 
                                        onChange={() => handleToggle(item.id)}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        width: '48px', height: '26px', background: settings[item.id] ? '#1b3a7a' : '#e2e8f0',
                                        borderRadius: '20px', transition: 'all 0.3s', position: 'relative'
                                    }}>
                                        <div style={{
                                            position: 'absolute', top: '3px', left: settings[item.id] ? '25px' : '3px',
                                            width: '20px', height: '20px', background: '#fff',
                                            borderRadius: '50%', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }} />
                                    </div>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <footer style={{ 
                    padding: '20px 24px', borderTop: '1px solid #f1f5f9', background: '#fcfdfe',
                    display: 'flex', justifyContent: 'flex-end', gap: 12
                }}>
                    <button 
                        onClick={onClose} 
                        className="btn btn-outline" 
                        disabled={saving}
                        style={{ height: 44, padding: '0 24px' }}
                    >
                        Dismiss
                    </button>
                    <button 
                        onClick={handleSave} 
                        className="btn btn-primary" 
                        disabled={saving}
                        style={{ height: 44, padding: '0 28px', minWidth: '140px', boxShadow: '0 4px 12px rgba(27, 58, 122, 0.2)' }}
                    >
                        {saving ? (
                            <><div className="spinner-sm" style={{ marginRight: 8 }} /> Saving...</>
                        ) : (
                            <><Save size={18} style={{ marginRight: 8 }} /> Save Preferences</>
                        )}
                    </button>
                </footer>
            </div>
            
            <style>{`
                .error-alert { background: #fef2f2; border: 1px solid #fee2e2; color: #b91c1c; padding: 12px; border-radius: 10px; display: flex; align-items: center; gap: 10px; font-size: 0.85rem; font-weight: 600; }
                .success-alert { background: #f0fdf4; border: 1px solid #dcfce7; color: #15803d; padding: 12px; border-radius: 10px; display: flex; align-items: center; gap: 10px; font-size: 0.85rem; font-weight: 600; }
                .spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .hover\\:bg-white\\/10:hover { background: rgba(255,255,255,0.1) !important; }
                .hover\\:border-indigo-100:hover { border-color: #e0e7ff !important; }
                .hover\\:shadow-sm:hover { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important; }
            `}</style>
        </div>
    );
};

export default ReceiptSettingsModal;
