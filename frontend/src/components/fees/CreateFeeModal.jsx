import React, { useState, useEffect, useRef } from 'react';
import { X, Receipt, User, Calendar, IndianRupee, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import apiClient from '../../api/apiConfig';

const CreateFeeModal = ({ onClose, onSave }) => {
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const dropdownRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [form, setForm] = useState({
        studentId: '',
        batchId: '',
        amount: '',
        month: '',
        year: new Date().getFullYear().toString(),
        dueDate: ''
    });

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [bRes] = await Promise.all([
                    apiClient.get('/batches')
                ]);
                setStudents([]); // Start with empty list
                setBatches(bRes.data.batches || []);
            } catch (err) {
                setError({ message: 'Failed to load students or batches' });
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // Handle clicks outside the searchable dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced Server-Side Search
    useEffect(() => {
        const fetchSearchResults = async () => {
            if (!searchQuery) {
                setStudents([]); // Clear list if query is empty
                return;
            }
            if (form.studentId) return; // Skip if a student is already selected

            setSearching(true);
            try {
                const res = await apiClient.get(`/students?search=${encodeURIComponent(searchQuery)}&limit=15`);
                setStudents(res.data.students || []);
            } catch (err) {
                console.error("Failed to search students:", err);
            } finally {
                setSearching(false);
            }
        };

        const timeoutId = setTimeout(fetchSearchResults, 300); // 300ms debounce
        return () => clearTimeout(timeoutId);
    }, [searchQuery, form.studentId]);

    const handleStudentSelect = (student) => {
        setForm({
            ...form,
            studentId: student._id,
            batchId: student.batchId?._id || student.batchId || '',
            amount: student.batchId?.fees || student.fees || ''
        });
        setSearchQuery(`${student.name} (${student.rollNo})`);
        setIsDropdownOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.studentId || !form.amount || !form.month || !form.year || !form.dueDate) {
            setError({ message: 'Please fill all required fields' });
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onSave(form);
            onClose();
        } catch (err) {
            if (err.response?.status === 409) {
                // Return full error state including possible feeId to allow user to switch
                setError({
                    message: "This month's tuition fee is already created.",
                    feeId: err.response?.data?.feeId
                });
            } else {
                setError({ message: err.response?.data?.message || 'Failed to create fee record' });
            }
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
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <Receipt size={24} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Initialize Manual Fee</h2>
                            <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500, marginTop: 2 }}>Create billing records for students</div>
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
                    {loading ? (
                        <div className="loader-wrap"><div className="spinner" /><p>Loading student data…</p></div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{error.message}</span>
                                    {error.feeId && (
                                        <button
                                            type="button"
                                            className="btn btn-sm"
                                            style={{ background: '#ca8a04', color: '#fff', border: 'none', padding: '4px 12px' }}
                                        >
                                            Add Expense
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="mf" style={{ position: 'relative' }} ref={dropdownRef}>
                                <label>Select Student *</label>
                                <input
                                    type="text"
                                    placeholder="Search by student name, roll no or phone..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setIsDropdownOpen(true);
                                        // Reset form if they start typing again
                                        if (form.studentId) setForm({ ...form, studentId: '', batchId: '', amount: '' });
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: 8,
                                        border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none'
                                    }}
                                    required={!form.studentId}
                                />
                                {isDropdownOpen && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                        background: '#fff', border: '1px solid #e2e8f0',
                                        borderRadius: 8, marginTop: 4, maxHeight: 220,
                                        overflowY: 'auto', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                    }}>
                                        {searching ? (
                                            <div style={{ padding: '16px', color: '#64748b', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                <Loader2 size={16} className="spin" /> Searching...
                                            </div>
                                        ) : !searchQuery && !form.studentId ? (
                                            <div style={{ padding: '16px', color: '#64748b', textAlign: 'center', fontSize: '0.85rem' }}>
                                                Start typing to search for a student...
                                            </div>
                                        ) : students.length > 0 ? students.map(s => (
                                            <div
                                                key={s._id}
                                                onClick={() => handleStudentSelect(s)}
                                                style={{
                                                    padding: '10px 16px', cursor: 'pointer',
                                                    borderBottom: '1px solid #f1f5f9', display: 'flex',
                                                    justifyContent: 'space-between', alignItems: 'center'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Roll: {s.rollNo}</div>
                                                </div>
                                                {s.batchId && (
                                                    <div style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 12 }}>
                                                        {s.batchId.name || 'Assigned'}
                                                    </div>
                                                )}
                                            </div>
                                        )) : (
                                            <div style={{ padding: '12px 16px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                                                No students matched your search
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="mf-row">
                                <div className="mf">
                                    <label>Batch</label>
                                    <select
                                        value={form.batchId}
                                        disabled
                                        style={{ background: 'var(--erp-bg2)', cursor: 'not-allowed' }}
                                    >
                                        <option value="">No Batch</option>
                                        {Array.isArray(batches) && batches.map(b => (
                                            <option key={b._id} value={b._id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mf">
                                    <label>Fee Amount (₹) *</label>
                                    <input
                                        type="number"
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mf-row">
                                <div className="mf">
                                    <label>Billing Month *</label>
                                    <select
                                        value={form.month}
                                        onChange={e => setForm({ ...form, month: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Month</option>
                                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="mf">
                                    <label>Billing Year *</label>
                                    <input
                                        type="number"
                                        value={form.year}
                                        onChange={e => setForm({ ...form, year: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mf">
                                <label>Payment Deadline *</label>
                                <input
                                    type="date"
                                    value={form.dueDate}
                                    onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="modal-footer" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--erp-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <Loader2 className="spin" size={14} /> : 'Generate Invoice'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateFeeModal;