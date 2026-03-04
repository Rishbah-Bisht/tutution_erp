import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, BookOpen, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../api/apiConfig';

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const CreateTestModal = ({ onClose, onSave }) => {
    const [batches, setBatches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '', batchId: '', subject: '',
        totalMarks: 100, passingMarks: 40, date: ''
    });

    useEffect(() => {
        API().get('/batches').then(({ data }) => setBatches(data.batches || []));
    }, []);

    const handleBatchChange = (batchId) => {
        const batch = batches.find(b => b._id === batchId);
        setSubjects(batch?.subjects || []);
        setForm(f => ({ ...f, batchId, subject: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await API().post('/exams', form);
            onSave();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create test.');
        } finally { setSaving(false); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ width: '100%', maxWidth: 520, background: '#f8fafc', borderRadius: 12, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                {/* Header */}
                <div style={{ background: '#0f172a', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={22} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>Create New Test</h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', margin: 0 }}>Set up a test for a batch & subject</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                        <X size={14} /> CLOSE
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: 28 }}>
                    {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

                    <div style={{ display: 'grid', gap: 16 }}>
                        <div className="mf">
                            <label>Test Name *</label>
                            <input type="text" placeholder="e.g. Mid-Term Unit Test 1" value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div className="mf">
                                <label>Batch *</label>
                                <select value={form.batchId} onChange={e => handleBatchChange(e.target.value)} required>
                                    <option value="">Select Batch</option>
                                    {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="mf">
                                <label>Subject *</label>
                                <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required disabled={!form.batchId}>
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                            <div className="mf">
                                <label>Total Marks *</label>
                                <input type="number" value={form.totalMarks} min={1}
                                    onChange={e => setForm(f => ({ ...f, totalMarks: e.target.value }))} required />
                            </div>
                            <div className="mf">
                                <label>Passing Marks *</label>
                                <input type="number" value={form.passingMarks} min={0}
                                    onChange={e => setForm(f => ({ ...f, passingMarks: e.target.value }))} required />
                            </div>
                            <div className="mf">
                                <label>Date</label>
                                <input type="date" value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                        <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? <Loader2 size={16} className="spin" /> : 'Create Test'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTestModal;
