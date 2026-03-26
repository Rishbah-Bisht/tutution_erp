import React, { useState, useEffect } from 'react';
import { X, BookOpen, Loader2 } from 'lucide-react';
import apiClient from '../../api/apiConfig';

const CreateTestModal = ({ onClose, onSave }) => {
    const [batches, setBatches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '', batchId: '', subject: '', chapter: '',
        totalMarks: 100, passingMarks: 40, date: ''
    });

    useEffect(() => {
        apiClient.get('/batches').then(({ data }) => setBatches(data.batches || []));
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
            await apiClient.post('/exams', form);
            onSave();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create test.');
        } finally { setSaving(false); }
    };

    // Reusable Style for Inputs
    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1.5px solid #e2e8f0',
        fontSize: '0.9rem',
        outline: 'none',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
        background: '#fff',
        color: '#1e293b'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '6px',
        fontSize: '0.82rem',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.025em'
    };

    return (
        <div style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15, 23, 42, 0.8)', 
            backdropFilter: 'blur(8px)', 
            zIndex: 1000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 20 
        }}
        onClick={e => e.target === e.currentTarget && onClose()}>
            
            <div style={{ 
                width: '100%', 
                maxWidth: 540, 
                background: '#ffffff', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
                border: '1px solid #e2e8f0' 
            }}>
                
                {/* Header */}
                <div style={{ 
                    background: '#0f172a', 
                    padding: '24px 28px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderBottom: '4px solid #3b82f6' // Accent bottom border
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ 
                            width: 46, 
                            height: 46, 
                            borderRadius: '12px', 
                            background: 'rgba(59, 130, 246, 0.15)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            border: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                            <BookOpen size={24} color="#60a5fa" />
                        </div>
                        <div>
                            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>Create New Test</h2>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Define test parameters and schedule</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '8px', 
                        color: '#fff', 
                        padding: '8px 12px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8, 
                        fontSize: '0.75rem', 
                        fontWeight: 600 
                    }}>
                        <X size={16} /> ESC
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                    {error && (
                        <div style={{ 
                            background: '#fef2f2', 
                            color: '#dc2626', 
                            padding: '12px 16px', 
                            borderRadius: '8px', 
                            marginBottom: 20, 
                            fontSize: '0.85rem',
                            border: '1px solid #fee2e2',
                            fontWeight: '500'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: 20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>Test Name *</label>
                                <input style={inputStyle} type="text" placeholder="e.g. Unit Test 1" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                            </div>
                            <div>
                                <label style={labelStyle}>Chapter *</label>
                                <input style={inputStyle} type="text" placeholder="e.g. Algebra" value={form.chapter}
                                    onChange={e => setForm(f => ({ ...f, chapter: e.target.value }))} required />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>Batch *</label>
                                <select style={inputStyle} value={form.batchId} onChange={e => handleBatchChange(e.target.value)} required>
                                    <option value="">Select Batch</option>
                                    {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Subject *</label>
                                <select style={inputStyle} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required disabled={!form.batchId}>
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>Total Marks</label>
                                <input style={inputStyle} type="number" value={form.totalMarks} min={1}
                                    onChange={e => setForm(f => ({ ...f, totalMarks: e.target.value }))} required />
                            </div>
                            <div>
                                <label style={labelStyle}>Passing</label>
                                <input style={inputStyle} type="number" value={form.passingMarks} min={0}
                                    onChange={e => setForm(f => ({ ...f, passingMarks: e.target.value }))} required />
                            </div>
                            <div>
                                <label style={labelStyle}>Test Date</label>
                                <input style={inputStyle} type="date" value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    <div style={{ 
                        marginTop: 32, 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        gap: 12, 
                        borderTop: '1px solid #f1f5f9', 
                        paddingTop: 24 
                    }}>
                        <button 
                            type="button" 
                            onClick={onClose}
                            style={{ 
                                padding: '10px 20px', 
                                borderRadius: '8px', 
                                border: '1px solid #e2e8f0', 
                                background: 'transparent', 
                                color: '#64748b', 
                                fontWeight: '600', 
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}>
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={saving}
                            style={{ 
                                padding: '10px 24px', 
                                borderRadius: '8px', 
                                border: 'none', 
                                background: '#3b82f6', 
                                color: 'white', 
                                fontWeight: '600', 
                                cursor: saving ? 'not-allowed' : 'pointer',
                                fontSize: '0.9rem',
                                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Create Test'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTestModal;