import React, { useState, useEffect } from 'react';
import { 
    X, Edit3, Loader2, CheckCircle2, AlertCircle, 
    User, Save, Ban, Check, Users 
} from 'lucide-react';
import apiClient from '../../api/apiConfig';

const MarksEntryModal = ({ exam, onClose, onSave }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const { data } = await apiClient.get(`/exams/${exam._id}/students`);
                setRows(data.students.map(s => ({
                    student: s,
                    marks: s.result?.marksObtained ?? '',
                    remarks: s.result?.remarks ?? '',
                    isPresent: s.result?.isPresent ?? true
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
            const marks = rows.map(r => ({
                studentId: r.student._id,
                marksObtained: r.isPresent ? (parseFloat(r.marks) || 0) : 0,
                remarks: r.remarks,
                isPresent: r.isPresent
            }));

            if (marks.length === 0) {
                setError('Please enter marks for at least one student.');
                setSaving(false);
                return;
            }
            await apiClient.post(`/exams/${exam._id}/results`, { marks });
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
        <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <style>{`
                .modal-box {
                    width: 100%;
                    max-width: 850px;
                    max-height: 95vh;
                    background: #f8fafc;
                    border-radius: 0.375rem;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                    overflow: hidden;
                }
                .table-container {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                .marks-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 600px;
                }
                .marks-table th, .marks-table td {
                    padding: 12px 16px;
                    border-bottom: 1px solid #e2e8f0;
                }
                @media (max-width: 640px) {
                    .legend-container { flex-direction: column; gap: 8px !important; }
                    .modal-header { padding: 15px !important; }
                    .modal-footer { flex-direction: column; gap: 15px !important; }
                    .footer-btns { width: 100%; }
                    .footer-btns button { flex: 1; }
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

            <div className="modal-box">
                {/* Header */}
                <div className="modal-header" style={{ background: '#0f172a', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Edit3 size={20} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', margin: 0 }}>{exam.name}</h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', margin: 0 }}>
                                {exam.subject} · Total: {exam.totalMarks}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', padding: '8px', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
                    {/* Legend using Lucide Icons */}
                    <div className="legend-container" style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>
                            <CheckCircle2 size={14} /> Pass
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#a16207' }}>
                            <AlertCircle size={14} /> Near Pass
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#be123c' }}>
                            <Ban size={14} /> Fail
                        </div>
                    </div>

                    {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '10px', borderRadius: 6, marginBottom: 15, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={16} />{error}</div>}
                    {success && <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px', borderRadius: 6, marginBottom: 15, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} />Saved Successfully!</div>}

                    {loading ? (
                        <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
                            <Loader2 className="spin" size={32} style={{ margin: '0 auto 10px' }} />
                            <p>Fetching Student List...</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="marks-table">
                                <thead style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                    <tr>
                                        <th style={{ width: '50px' }}>#</th>
                                        <th>Student</th>
                                        <th style={{ width: '120px' }}>Attendance</th>
                                        <th style={{ width: '120px' }}>Marks</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => (
                                        <tr key={row.student._id} style={getRowStyle(row.marks)}>
                                            <td>{idx + 1}</td>
                                            <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>{row.student.name}</td>
                                            <td>
                                                <button
                                                    onClick={() => updateRow(idx, 'isPresent', !row.isPresent)}
                                                    style={{
                                                        padding: '5px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                                                        fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4,
                                                        background: row.isPresent ? '#dcfce7' : '#fee2e2',
                                                        color: row.isPresent ? '#166534' : '#991b1b'
                                                    }}
                                                >
                                                    {row.isPresent ? <Check size={12} /> : <X size={12} />}
                                                    {row.isPresent ? 'PRESENT' : 'ABSENT'}
                                                </button>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={row.marks}
                                                    disabled={!row.isPresent}
                                                    onChange={e => updateRow(idx, 'marks', e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800 }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={row.remarks}
                                                    onChange={e => updateRow(idx, 'remarks', e.target.value)}
                                                    placeholder="Note..."
                                                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer" style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                        <Users size={16} /> {rows.length} Total Students
                    </div>
                    <div className="footer-btns" style={{ display: 'flex', gap: 10 }}>
                        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                        <button 
                            disabled={saving || success} 
                            onClick={handleSave}
                            style={{ padding: '10px 20px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Save Marks'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarksEntryModal;
