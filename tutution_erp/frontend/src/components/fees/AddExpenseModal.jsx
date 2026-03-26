import React, { useState } from 'react';
import { X, PlusCircle, IndianRupee, Loader2 } from 'lucide-react';
import apiClient from '../../api/apiConfig';

const AddExpenseModal = ({ fee, onClose, onSave }) => {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        title: '',
        amount: '',
        date: new Date().toISOString().substring(0, 10),
        description: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.amount) {
            setError('Please provide a title and amount');
            return;
        }

        setSaving(true);
        setError('');
        try {
            await apiClient.post(`/fees/${fee._id}/expense`, form);
            onSave();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add expense');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{
                width: '100%', maxWidth: '900px', maxHeight: '92vh',
                background: '#f8fafc', borderRadius: '12px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                position: 'relative'
            }}>
                {/* --- TOP BAR (Inside Modal Box) --- */}
                <header style={{
                    width: '100%',
                    padding: '24px 32px',
                    background: '#0f172a',
                    position: 'relative',
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0,
                    overflow: 'hidden'
                }}>
                    <PlusCircle size={120} style={{ position: 'absolute', right: -20, bottom: -30, opacity: 0.1, color: '#fff' }} />

                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <PlusCircle size={24} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Add Surcharge / Extra Expense</h2>
                            <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500, marginTop: 2 }}>
                                Appending costs to {fee.studentId?.name}'s billing
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

                <div className="modal-body custom-scrollbar" style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
                    <form onSubmit={handleSubmit}>
                        {error && <div className="alert alert-error">{error}</div>}

                        <div className="mf">
                            <label>Expense Title *</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g., Exam Fee, Transport Fee"
                                required
                            />
                        </div>

                        <div className="mf-row">
                            <div className="mf">
                                <label>Amount (₹ ) *</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <IndianRupee size={15} />
                                    </div>
                                    <input
                                        type="number"
                                        style={{ paddingLeft: '32px' }}
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mf">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={e => setForm({ ...form, date: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="mf">
                            <label>Description (Optional)</label>
                            <textarea
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="Any additional details..."
                                rows={3}
                            />
                        </div>

                        <div className="modal-footer" style={{ marginTop: 24, paddingTop: 32, borderTop: '1px solid var(--erp-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button type="button" onClick={onClose} style={{ padding: '12px 24px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '4px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', color: '#64748b' }}>CANCEL</button>
                            <button type="submit" disabled={saving} style={{
                                padding: '12px 32px', background: '#0f172a', color: '#fff', border: 'none',
                                borderRadius: '4px', fontWeight: 900, fontSize: '0.75rem', cursor: saving ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1,
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                            }}>
                                {saving ? <Loader2 className="spin" size={14} /> : <PlusCircle size={16} />}
                                {saving ? 'ADDING...' : 'ADD SURCHARGE'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddExpenseModal;
