import React, { useState, useEffect } from 'react';
import {
    X, CreditCard, CheckCircle2, AlertCircle, Loader2,
    IndianRupee, Banknote, ShieldCheck, Wallet, Landmark,
    Smartphone, Receipt, Info, Tag, Globe
} from 'lucide-react';

// --- Theme Constants ---
const accentBlue = '#2563eb';
const sharpRadius = '4px';
const borderColor = '#e2e8f0';
const labelColor = '#475569';
const headingColor = '#0f172a';

const RecordPaymentModal = ({ fee, onClose, onSave }) => {
    const [form, setForm] = useState({
        amountPaid: '',
        mode: 'UPI',
        transactionId: '',
        remarks: '',
        fine: '0',
        bankName: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (fee) {
            const remaining = fee.pendingAmount || 0;
            setForm(prev => ({ ...prev, amountPaid: remaining.toString() }));
        }
    }, [fee]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await onSave(form);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to record payment');
        } finally {
            setSaving(false);
        }
    };

    if (!fee) return null;

    const totalDue = fee.totalFee || 0;
    const remainingBalance = fee.pendingAmount || 0;

    return (
        <div
            className="modal-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.7)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px' // Mobile par spacing ke liye
            }}
            onClick={onClose}
        >
            <style>{`
                .modal-content-container {
                    width: 100%;
                    max-width: 900px;
                    max-height: 95vh;
                    background: #f8fafc;
                    border-radius: 0.375rem;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                    position: relative;
                }
                .mf-row {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap; /* Mobile par stack hone ke liye */
                }
                .mf {
                    flex: 1;
                    min-width: 200px; /* Choti screen par wrap trigger karega */
                }
                .mode-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                }
                @media (max-width: 600px) {
                    .mode-grid {
                        grid-template-columns: repeat(2, 1fr); /* Mobile par 2 columns */
                    }
                    .modal-header {
                        padding: 16px !important;
                    }
                    .form-body {
                        padding: 20px !important;
                    }
                    .bill-summary {
                        padding: 16px 20px !important;
                    }
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

            <div className="modal-content-container" onClick={e => e.stopPropagation()}>
                {/* --- TOP BAR --- */}
                <header className="modal-header" style={{
                    width: '100%',
                    padding: '24px 32px',
                    background: headingColor,
                    position: 'relative',
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0
                }}>
                    <CreditCard size={120} style={{ position: 'absolute', right: -20, bottom: -30, opacity: 0.1, color: '#fff' }} />

                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 42, height: 42, borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <CreditCard size={20} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                Record Payment
                            </h2>
                            <div style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 500 }}>
                                {fee.studentId?.name}
                            </div>
                        </div>
                    </div>

                    <button type="button" onClick={onClose} style={{
                        position: 'relative', zIndex: 1,
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px', color: '#fff', padding: '6px 12px',
                        cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700
                    }}>
                        CLOSE
                    </button>
                </header>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <form onSubmit={handleSubmit} style={{ background: '#fff' }}>

                        {/* --- BILL SUMMARY --- */}
                        <div className="bill-summary" style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: `1px solid ${borderColor}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Billed</span>
                                <span style={{ fontSize: '1rem', fontWeight: 800 }}>₹ {totalDue.toLocaleString()}</span>
                            </div>

                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Monthly Base Fee: <span style={{ fontWeight: 700, color: '#1e293b' }}>₹ {(fee.monthlyTuitionFee || 0).toLocaleString()}</span></div>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    paddingTop: 12, borderTop: `1px solid ${borderColor}`, marginTop: 8
                                }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color: accentBlue }}>REMAINING</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: accentBlue }}>₹ {remainingBalance.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        <div className="form-body" style={{ padding: '32px' }}>
                            {error && (
                                <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: sharpRadius, color: '#991b1b', fontSize: '0.8rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )}

                            {/* --- INPUTS --- */}
                            <div className="mf-row" style={{ marginBottom: 20 }}>
                                <div className="mf">
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 8 }}>AMOUNT TO PAY *</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#94a3b8' }}>₹ </span>
                                        <input
                                            type="number" required max={remainingBalance} step="0.01"
                                            style={{ borderRadius: sharpRadius, padding: '12px 12px 12px 28px', border: `1px solid ${borderColor}`, fontSize: '0.9rem', fontWeight: 700, background: '#fcfdfd', width: '100%', boxSizing: 'border-box' }}
                                            value={form.amountPaid}
                                            onChange={e => {
                                                let val = e.target.value;
                                                if (Number(val) > remainingBalance) val = remainingBalance.toString();
                                                setForm({ ...form, amountPaid: val });
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="mf">
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 8 }}>LATE FINE</label>
                                    <input
                                        type="number"
                                        style={{ borderRadius: sharpRadius, padding: '12px', border: `1px solid ${borderColor}`, fontSize: '0.9rem', fontWeight: 700, background: '#fcfdfd', width: '100%', boxSizing: 'border-box' }}
                                        value={form.fine}
                                        onChange={e => setForm({ ...form, fine: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 10 }}>PAYMENT METHOD</label>
                                <div className="mode-grid">
                                    {['UPI', 'Cash', 'Bank'].map(mode => (
                                        <button
                                            key={mode} type="button"
                                            onClick={() => setForm({ ...form, mode })}
                                            style={{
                                                padding: '10px 4px', border: `1.5px solid ${form.mode === mode ? '#001f3f' : borderColor}`,
                                                borderRadius: sharpRadius, fontSize: '0.7rem', fontWeight: 800,
                                                background: form.mode === mode ? '#001f3f' : '#fff',
                                                color: form.mode === mode ? '#fff' : '#475569',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 8 }}>TRANSACTION ID / REF #</label>
                                <input
                                    type="text"
                                    style={{ borderRadius: sharpRadius, padding: '12px', border: `1px solid ${borderColor}`, background: '#fcfdfd', width: '100%', boxSizing: 'border-box' }}
                                    value={form.transactionId}
                                    onChange={e => setForm({ ...form, transactionId: e.target.value })}
                                />
                            </div>

                            {['Bank', 'UPI'].includes(form.mode) && (
                                <div className="mf-row" style={{ marginBottom: 20 }}>
                                    <div className="mf">
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 8 }}>BANK NAME</label>
                                        <input type="text" style={{ borderRadius: sharpRadius, padding: '12px', border: `1px solid ${borderColor}`, width: '100%', boxSizing: 'border-box' }} value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} />
                                    </div>

                                </div>
                            )}

                            <div style={{ marginBottom: 24 }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 8 }}>REMARKS</label>
                                <textarea
                                    style={{ borderRadius: sharpRadius, padding: '12px', border: `1px solid ${borderColor}`, minHeight: 60, resize: 'none', background: '#fcfdfd', width: '100%', boxSizing: 'border-box' }}
                                    value={form.remarks}
                                    onChange={e => setForm({ ...form, remarks: e.target.value })}
                                />
                            </div>

                            {/* --- FINAL ACTIONS --- */}
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <button type="button" onClick={onClose} disabled={saving}
                                    style={{ flex: 1, minWidth: '100px', padding: '14px', borderRadius: sharpRadius, border: `1.5px solid ${borderColor}`, background: '#fff', color: '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.7rem' }}>
                                    Discard
                                </button>
                                <button type="submit" disabled={saving}
                                    style={{
                                        flex: 2, minWidth: '150px',
                                        background: saving ? '#94a3b8' : '#001f3f',
                                        color: '#fff', borderRadius: sharpRadius, padding: '14px', fontWeight: 900, border: 'none',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        fontSize: '0.7rem', textTransform: 'uppercase'
                                    }}>
                                    {saving ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
                                    Finalize Payment
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RecordPaymentModal;
