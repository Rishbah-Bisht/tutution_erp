import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Edit3, Loader2, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { API_BASE_URL } from '../../api/apiConfig';

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const MarksEntryModal = ({ exam, onClose, onSave }) => {
    const [rows, setRows] = useState([]);    // { student, result, marks, remarks }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const { data } = await API().get(`/exams/${exam._id}/students`);
                setRows(data.students.map(s => ({
                    student: s,
                    marks: s.result?.marksObtained ?? '',
                    remarks: s.result?.remarks ?? ''
                })));
            } catch {
                setError('Failed to load students.');
            } finally { setLoading(false); }
        };
        fetchStudents();
    }, [exam._id]);

    const updateRow = (idx, field, value) => {
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const marks = rows
                .filter(r => r.marks !== '' && r.marks !== undefined)
                .map(r => ({
                    studentId: r.student._id,
                    marksObtained: parseFloat(r.marks),
                    remarks: r.remarks
                }));

            if (marks.length === 0) {
                setError('Please enter marks for at least one student.');
                setSaving(false);
                return;
            }
            await API().post(`/exams/${exam._id}/results`, { marks });
            setSuccess(true);
            setTimeout(onSave, 1000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save marks.');
        } finally { setSaving(false); }
    };

    const getRowStyle = (marks) => {
        if (marks === '' || marks === undefined) return {};
        const m = parseFloat(marks);
        const grace = exam.passingMarks - 0.05 * exam.totalMarks;
        if (m >= exam.passingMarks) return { background: '#f0fdf4' };
        if (m >= grace) return { background: '#fefce8' };
        return { background: '#fff1f2' };
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ width: '100%', maxWidth: 780, maxHeight: '92vh', background: '#f8fafc', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                {/* Header */}
                <div style={{ background: '#0f172a', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Edit3 size={22} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>{exam.name}</h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', margin: 0 }}>
                                {exam.batchId?.name} · {exam.subject} · Pass: {exam.passingMarks}/{exam.totalMarks}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                        <X size={14} /> CLOSE
                    </button>
                </div>

                {/* Body */}
                <div style={{ overflowY: 'auto', flex: 1, padding: 24 }}>
                    {/* Color legend */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                        {[
                            { bg: '#f0fdf4', color: '#15803d', label: `Pass (≥ ${exam.passingMarks})` },
                            { bg: '#fefce8', color: '#a16207', label: `Near Pass (${Math.round(exam.passingMarks - 0.05 * exam.totalMarks)}–${exam.passingMarks - 1})` },
                            { bg: '#fff1f2', color: '#be123c', label: 'Fail' },
                        ].map(c => (
                            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 600, color: c.color }}>
                                <div style={{ width: 14, height: 14, borderRadius: 3, background: c.bg, border: `1px solid ${c.color}44` }} />
                                {c.label}
                            </div>
                        ))}
                    </div>

                    {error && <div className="alert alert-error" style={{ marginBottom: 12, display: 'flex', gap: 8 }}><AlertCircle size={16} />{error}</div>}
                    {success && <div className="alert alert-success" style={{ marginBottom: 12, display: 'flex', gap: 8 }}><CheckCircle2 size={16} />Marks saved successfully!</div>}

                    {loading ? (
                        <div className="loader-wrap"><Loader2 className="spinner" size={32} /><p>Loading students...</p></div>
                    ) : rows.length === 0 ? (
                        <div className="empty"><User size={40} style={{ opacity: 0.2 }} /><p>No active students in this batch.</p></div>
                    ) : (
                        <table className="erp-table" style={{ tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>#</th>
                                    <th>Student</th>
                                    <th style={{ width: 100 }}>Roll No</th>
                                    <th style={{ width: 140 }}>Marks (/{exam.totalMarks})</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, idx) => (
                                    <tr key={row.student._id} style={getRowStyle(row.marks)}>
                                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{idx + 1}</td>
                                        <td><div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{row.student.name}</div></td>
                                        <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{row.student.rollNo}</td>
                                        <td>
                                            <input
                                                type="number"
                                                min={0}
                                                max={exam.totalMarks}
                                                value={row.marks}
                                                onChange={e => updateRow(idx, 'marks', e.target.value)}
                                                placeholder="—"
                                                style={{
                                                    width: '100%', padding: '6px 10px', borderRadius: 6,
                                                    border: '1px solid #cbd5e1', fontSize: '0.9rem',
                                                    fontWeight: 700, textAlign: 'center', background: 'white'
                                                }}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={row.remarks}
                                                onChange={e => updateRow(idx, 'remarks', e.target.value)}
                                                placeholder="Optional remarks..."
                                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.82rem', background: 'white' }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#fff' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{rows.filter(r => r.marks !== '').length} / {rows.length} marks entered</span>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" disabled={saving || success} onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                            Save Marks
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarksEntryModal;
