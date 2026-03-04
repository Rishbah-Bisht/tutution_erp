import React, { useState, useEffect } from 'react';
import { X, Send, Users, User, Globe, AlertTriangle, Loader2 } from 'lucide-react';
import axios from 'axios';
import apiClient from '../../api/apiConfig';

const NotificationModal = ({ isOpen, onClose, onSuccess, prefill = null }) => {
    const [batches, setBatches] = useState([]);
    const [target, setTarget] = useState(prefill ? 'student' : 'all'); // 'all', 'batch', 'student'
    const [form, setForm] = useState({
        subject: '',
        message: '',
        batchId: '',
        studentId: prefill?.studentId || '',
        adminPassword: ''
    });

    useEffect(() => {
        if (prefill) {
            setTarget('student');
            setForm(f => ({ ...f, studentId: prefill.studentId }));
        }
    }, [prefill]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            apiClient.get(`/batches`)
                .then(res => setBatches(res.data?.batches || []))
                .catch(err => {
                    console.error(err);
                    setBatches([]);
                });
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload = {
            subject: form.subject,
            message: form.message,
            adminPassword: form.adminPassword,
        };

        if (target === 'all') payload.allStudents = true;
        if (target === 'batch') payload.batchId = form.batchId;
        if (target === 'student') payload.studentId = form.studentId;

        try {
            await apiClient.post(`/notifications/custom`, payload);
            onSuccess('Notifications queued successfully!');
            onClose();
            setForm({ subject: '', message: '', batchId: '', studentId: '', adminPassword: '' });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send notifications');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 500, width: '90%' }}>

                {/* HEADER */}
                <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#fff', position: 'relative' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>SEND CUSTOM NOTIFICATION</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Send manual email alerts to students</p>
                    <button onClick={onClose} style={{ position: 'absolute', right: 24, top: 24, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '32px' }}>

                    {error && (
                        <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '4px', fontSize: '0.85rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertTriangle size={14} /> {error}
                        </div>
                    )}

                    {/* TARGET SELECTION */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                        <button type="button" onClick={() => setTarget('all')} className={`target-btn ${target === 'all' ? 'active' : ''}`}>
                            <Globe size={14} /> ALL
                        </button>
                        <button type="button" onClick={() => setTarget('batch')} className={`target-btn ${target === 'batch' ? 'active' : ''}`}>
                            <Users size={14} /> BATCH
                        </button>
                        <button type="button" onClick={() => setTarget('student')} disabled={!prefill} className={`target-btn ${target === 'student' ? 'active' : ''}`} title={!prefill ? "Select from student profile for individual" : ""}>
                            <User size={14} /> SINGLE
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {target === 'batch' && (
                            <div>
                                <label className="form-label">SELECT BATCH</label>
                                <select
                                    required
                                    value={form.batchId}
                                    onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                                    className="erp-input"
                                >
                                    <option value="">Choose Batch...</option>
                                    {(batches || []).map(b => <option key={b._id} value={b._id}>{b.name} ({b.course})</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="form-label">SUBJECT *</label>
                            <input
                                required
                                placeholder="Email Subject"
                                className="erp-input"
                                value={form.subject}
                                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="form-label">MESSAGE *</label>
                            <textarea
                                required
                                placeholder="Write your notification message here..."
                                className="erp-input"
                                style={{ minHeight: 120, resize: 'vertical' }}
                                value={form.message}
                                onChange={(e) => setForm({ ...form, message: e.target.value })}
                            />
                        </div>

                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            <label className="form-label">ADMIN PASSWORD *</label>
                            <input
                                required
                                type="password"
                                placeholder="Confirm your password"
                                className="erp-input"
                                value={form.adminPassword}
                                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
                        <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>CANCEL</button>
                        <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {loading ? <><Loader2 className="spin" size={16} /> QUEUING...</> : <><Send size={16} /> SEND EMAILS</>}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .target-btn {
                    flex: 1; padding: 10px; border: 1px solid #e2e8f0; background: #fff; border-radius: 4px;
                    display: flex; alignItems: center; justifyContent: center; gap: 8;
                    font-size: 0.75rem; fontWeight: 900; cursor: pointer; color: #64748b;
                    transition: all 0.2s;
                }
                .target-btn.active {
                    background: #3b82f6; border-color: #3b82f6; color: #fff;
                }
                .target-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .form-label { display: block; font-size: 0.7rem; font-weight: 900; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
                .erp-input { width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.9rem; outline: none; }
                .erp-input:focus { border-color: #3b82f6; }
                .btn-primary { background: #3b82f6; color: #fff; border: none; padding: 12px; border-radius: 4px; font-weight: 800; cursor: pointer; font-size: 0.8rem; }
                .btn-secondary { background: #f1f5f9; color: #475569; border: none; padding: 12px; border-radius: 4px; font-weight: 800; cursor: pointer; font-size: 0.8rem; }
            `}</style>
        </div>
    );
};

export default NotificationModal;
