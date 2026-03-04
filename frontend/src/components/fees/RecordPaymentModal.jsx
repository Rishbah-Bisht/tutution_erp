import React, { useState, useEffect } from 'react';
import {
    X, CreditCard, CheckCircle2, AlertCircle, Loader2,
    IndianRupee, Banknote, ShieldCheck, Wallet, Landmark,
    Smartphone, Receipt, Info, Tag, Globe
} from 'lucide-react';

// --- Theme Constants (Based on Image Combo) ---

const accentBlue = '#2563eb'; // Blue used for "Remaining to Pay" in Image 2
const sharpRadius = '4px';
const borderColor = '#e2e8f0';
const labelColor = '#475569';
const headingColor = '#0f172a';

const SectionDivider = ({ label, color = 'var(--erp-primary)', icon: Icon }) => (
    <div style={{
        fontSize: '0.72rem', fontWeight: 800, color, textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: 20, marginTop: 10,
        display: 'flex', alignItems: 'center', gap: 8
    }}>
        {Icon && <Icon size={14} />} {label}
        <div style={{ flex: 1, height: '1px', background: borderColor }} />
    </div>
);

const RecordPaymentModal = ({ fee, onClose, onSave }) => {
    const [form, setForm] = useState({
        amountPaid: '',
        mode: 'UPI',
        transactionId: '',
        remarks: '',
        fine: '0',
        bankName: '',
        journalNo: ''
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
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                className="modal"
                style={{
                    width: '100%',
                    maxWidth: '900px',
                    maxHeight: '92vh',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* --- TOP BAR (Inside Modal Box) --- */}
                <header style={{
                    width: '100%',
                    padding: '24px 32px',
                    background: headingColor,
                    position: 'relative',
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0,
                    overflow: 'hidden'
                }}>
                    <CreditCard size={120} style={{ position: 'absolute', right: -20, bottom: -30, opacity: 0.1, color: '#fff' }} />

                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <CreditCard size={24} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                Record Student Payment
                            </h2>
                            <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500, marginTop: 2 }}>
                                {fee.studentId?.name} • Session {fee.month} {fee.year}
                            </div>
                        </div>
                    </div>

                    <button type="button" onClick={onClose} style={{
                        position: 'relative', zIndex: 1,
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px', color: '#fff', padding: '8px 16px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        gap: 8, fontSize: '0.75rem', fontWeight: 700
                    }}>
                        <X size={16} /> CLOSE
                    </button>
                </header>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <form onSubmit={handleSubmit} style={{ background: '#fff' }}>

                        {/* --- BILL SUMMARY (MATCHING IMAGE 2) --- */}
                        <div style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: `1px solid ${borderColor}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Billed</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>₹{totalDue.toLocaleString()}</span>
                            </div>

                            {/* Breakdown */}
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Monthly Base Fee: <span style={{ fontWeight: 700, color: '#1e293b' }}>₹{(fee.monthlyTuitionFee || 0).toLocaleString()}</span></div>
                                {fee.registrationFee > 0 && (
                                    <div style={{ fontSize: '0.8rem', color: accentBlue }}>One-time Registration: <span style={{ fontWeight: 700 }}>+ ₹{(fee.registrationFee || 0).toLocaleString()}</span></div>
                                )}
                                <div style={{ fontSize: '0.8rem', color: 'var(--erp-primary)' }}>Previously Collected: <span style={{ fontWeight: 700 }}>- ₹{(fee.amountPaid || 0).toLocaleString()}</span></div>
                            </div>

                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                paddingTop: 16, borderTop: `1px solid ${borderColor}`
                            }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: accentBlue, textTransform: 'uppercase' }}>REMAINING TO PAY</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: accentBlue }}>₹{remainingBalance.toLocaleString()}</div>
                            </div>
                        </div>

                        <div style={{ padding: '32px' }}>
                            {error && (
                                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: sharpRadius, color: '#991b1b', fontSize: '0.85rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <AlertCircle size={18} /> {error}
                                </div>
                            )}

                            {/* --- INPUTS --- */}
                            <div className="mf-row" style={{ marginBottom: 24 }}>
                                <div className="mf" style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, marginBottom: 8 }}>AMOUNT TO PAY *</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#94a3b8' }}>₹</span>
                                        <input
                                            type="number" required max={remainingBalance} step="0.01"
                                            style={{ borderRadius: sharpRadius, padding: '12px 12px 12px 28px', border: `1px solid ${borderColor}`, fontSize: '1rem', fontWeight: 700, background: '#fcfdfd', width: '100%' }}
                                            value={form.amountPaid}
                                            onChange={e => {
                                                let val = e.target.value;
                                                if (Number(val) > remainingBalance) val = remainingBalance.toString();
                                                setForm({ ...form, amountPaid: val });
                                            }}
                                        />
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 4 }}>Max limit: ₹{remainingBalance.toLocaleString()}</div>
                                </div>
                                <div className="mf" style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, marginBottom: 8 }}>LATE FINE (IF ANY)</label>
                                    <input
                                        type="number"
                                        style={{ borderRadius: sharpRadius, padding: '12px', border: `1px solid ${borderColor}`, fontSize: '1rem', fontWeight: 700, background: '#fcfdfd', width: '100%' }}
                                        value={form.fine}
                                        onChange={e => setForm({ ...form, fine: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="mf" style={{ marginBottom: 24 }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 10 }}>PAYMENT METHOD</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                    {['UPI', 'Cash', 'Bank', 'Online'].map(mode => (
                                        <button
                                            key={mode} type="button"
                                            onClick={() => setForm({ ...form, mode })}
                                            style={{
                                                padding: '12px 8px', border: `1.5px solid ${form.mode === mode ? '#001f3f' : borderColor}`,
                                                borderRadius: sharpRadius, fontSize: '0.75rem', fontWeight: 800,
                                                background: form.mode === mode ? '#001f3f' : '#fff',
                                                color: form.mode === mode ? '#fff' : '#475569',
                                                cursor: 'pointer', transition: '0.2s all'
                                            }}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mf" style={{ marginBottom: 24 }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 8 }}>TRANSACTION ID / REF #</label>
                                <input
                                    type="text" placeholder="Optional identifier"
                                    style={{ borderRadius: sharpRadius, padding: '12px', border: `1px solid ${borderColor}`, background: '#fcfdfd', width: '100%' }}
                                    value={form.transactionId}
                                    onChange={e => setForm({ ...form, transactionId: e.target.value })}
                                />
                            </div>

                            {['Bank', 'Online', 'UPI'].includes(form.mode) && (
                                <div className="mf-row" style={{ marginBottom: 24 }}>
                                    <div className="mf">
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor }}>BANK NAME</label>
                                        <input type="text" placeholder="E.g., HDFC, SBI" style={{ borderRadius: sharpRadius, padding: '12px', border: `1px solid ${borderColor}`, width: '100%' }} value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} />
                                    </div>
                                    <div className="mf">
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor }}>JOURNAL / CHEQUE NO.</label>
                                        <input type="text" placeholder="Optional Ref" style={{ borderRadius: sharpRadius, padding: '12px', border: `1px solid ${borderColor}`, width: '100%' }} value={form.journalNo} onChange={e => setForm({ ...form, journalNo: e.target.value })} />
                                    </div>
                                </div>
                            )}

                            <div className="mf" style={{ marginBottom: 32 }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor }}>INTERNAL REMARKS</label>
                                <textarea
                                    style={{ borderRadius: sharpRadius, padding: '12px', border: `1px solid ${borderColor}`, minHeight: 60, resize: 'none', background: '#fcfdfd', width: '100%' }}
                                    value={form.remarks}
                                    onChange={e => setForm({ ...form, remarks: e.target.value })}
                                    placeholder="Add any payment notes..."
                                />
                            </div>

                            {/* --- FINAL ACTIONS --- */}
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button type="button" onClick={onClose} disabled={saving}
                                    style={{ flex: 1, padding: '14px', borderRadius: sharpRadius, border: `1.5px solid ${borderColor}`, background: '#fff', color: '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                    Discard
                                </button>
                                <button type="submit" disabled={saving}
                                    style={{
                                        flex: 2,
                                        background: saving ? '#94a3b8' : '#001f3f',
                                        color: '#fff', borderRadius: sharpRadius, padding: '14px', fontWeight: 900, border: 'none',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                        fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                                        boxShadow: saving ? 'none' : '0 4px 12px rgba(0,0,0,0.2)'
                                    }}>
                                    {saving ? <Loader2 size={18} className="spin" /> : <ShieldCheck size={18} />}
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