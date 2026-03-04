import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ERPLayout from '../components/ERPLayout';
import CreateTestModal from '../components/exams/CreateTestModal';
import MarksEntryModal from '../components/exams/MarksEntryModal';
import { API_BASE_URL } from '../api/apiConfig';
import {
    BookOpen, Plus, ClipboardList, Trophy, Edit3,
    Trash2, Loader2, AlertCircle, CheckCircle2, XCircle,
    ChevronRight, Clock
} from 'lucide-react';

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const statusBadge = (status) => {
    const map = {
        scheduled: { cls: 'badge-pending', label: 'Scheduled', icon: Clock },
        completed: { cls: 'badge-active', label: 'Completed', icon: CheckCircle2 },
        cancelled: { cls: 'badge-unpaid', label: 'Cancelled', icon: XCircle }
    };
    const cfg = map[status] || map.scheduled;
    const Icon = cfg.icon;
    return <span className={`badge ${cfg.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon size={11} />{cfg.label}</span>;
};

// Color coding: pass / near-pass / fail
const getResultStyle = (marks, total, passing) => {
    if (marks >= passing) return { background: '#f0fdf4', color: '#15803d', borderLeft: '3px solid #22c55e' };
    const grace = passing - 0.05 * total;
    if (marks >= grace) return { background: '#fefce8', color: '#a16207', borderLeft: '3px solid #eab308' };
    return { background: '#fff1f2', color: '#be123c', borderLeft: '3px solid #f43f5e' };
};

const ExamsPage = () => {
    const [tab, setTab] = useState('tests');
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedExam, setSelectedExam] = useState(null);
    const [results, setResults] = useState([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [showMarks, setShowMarks] = useState(null); // exam object
    const [error, setError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const { data } = await API().get('/exams');
            setExams(data.exams || []);
        } catch {
            setError('Failed to load exams.');
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchExams(); }, []);

    const fetchResults = async (exam) => {
        setSelectedExam(exam);
        setResultsLoading(true);
        try {
            const { data } = await API().get(`/exams/${exam._id}/results`);
            setResults(data.results || []);
        } catch { setResults([]); }
        finally { setResultsLoading(false); }
    };

    const handleDelete = async (id) => {
        try {
            await API().delete(`/exams/${id}`);
            setDeleteConfirm(null);
            fetchExams();
        } catch { setError('Failed to delete.'); }
    };

    const passCount = results.filter(r => r.marksObtained >= selectedExam?.passingMarks).length;
    const failCount = results.length - passCount;
    const avgMarks = results.length ? (results.reduce((a, r) => a + r.marksObtained, 0) / results.length).toFixed(1) : '—';

    return (
        <ERPLayout title="Exams & Results">
            <div className="page-hdr" style={{ marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--erp-primary)' }}>Exams & Results</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Create tests, enter marks and view color-coded results</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Plus size={16} /> Create Test
                </button>
            </div>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 10, marginBottom: 24, width: 'fit-content' }}>
                {[
                    { key: 'tests', label: 'Tests', Icon: ClipboardList },
                    { key: 'results', label: 'Results', Icon: Trophy },
                ].map(({ key, label, Icon }) => (
                    <button key={key} onClick={() => setTab(key)} style={{
                        padding: '8px 22px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700,
                        fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6,
                        background: tab === key ? '#fff' : 'transparent',
                        color: tab === key ? 'var(--erp-primary)' : '#64748b',
                        boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                    }}>
                        <Icon size={15} /> {label}
                    </button>
                ))}
            </div>

            {/* Tests Tab */}
            {tab === 'tests' && (
                <div className="card" style={{ overflow: 'hidden' }}>
                    {loading ? (
                        <div className="loader-wrap"><Loader2 className="spinner" size={32} /><p>Loading tests...</p></div>
                    ) : exams.length === 0 ? (
                        <div className="empty" style={{ padding: 60 }}>
                            <BookOpen size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                            <p>No tests created yet. Click "Create Test" to start.</p>
                        </div>
                    ) : (
                        <table className="erp-table">
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th>Test Name</th>
                                    <th>Batch</th>
                                    <th>Subject</th>
                                    <th>Total / Passing</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exams.map(exam => (
                                    <tr key={exam._id}>
                                        <td><div className="td-bold">{exam.name}</div></td>
                                        <td><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>{exam.batchId?.name || '—'}</span></td>
                                        <td className="td-sm">{exam.subject}</td>
                                        <td className="td-sm"><span style={{ fontWeight: 700 }}>{exam.totalMarks}</span> / <span style={{ color: '#64748b' }}>{exam.passingMarks}</span></td>
                                        <td>{statusBadge(exam.status)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                                    onClick={() => setShowMarks(exam)}
                                                >
                                                    <Edit3 size={13} /> Marks
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                                    onClick={() => { fetchResults(exam); setTab('results'); }}
                                                >
                                                    <ChevronRight size={13} /> Results
                                                </button>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ background: '#fee2e2', color: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                                                    onClick={() => setDeleteConfirm(exam._id)}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Results Tab */}
            {tab === 'results' && (
                <div>
                    {/* Exam selector */}
                    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: 6, display: 'block' }}>Select Test to View Results</label>
                        <select
                            value={selectedExam?._id || ''}
                            onChange={e => {
                                const exam = exams.find(x => x._id === e.target.value);
                                if (exam) fetchResults(exam);
                            }}
                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem', minWidth: 260 }}
                        >
                            <option value="">-- Choose a test --</option>
                            {exams.map(e => <option key={e._id} value={e._id}>{e.name} ({e.batchId?.name} — {e.subject})</option>)}
                        </select>
                    </div>

                    {selectedExam && (
                        <>
                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                                {[
                                    { label: 'Total Students', value: results.length, color: '#1b3a7a' },
                                    { label: '✅ Passed', value: passCount, color: '#15803d' },
                                    { label: '❌ Failed', value: failCount, color: '#be123c' },
                                    { label: 'Avg. Marks', value: avgMarks, color: '#a16207' },
                                ].map(c => (
                                    <div key={c.label} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: c.color }}>{c.value}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: 4 }}>{c.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Result table */}
                            <div className="card" style={{ overflow: 'hidden' }}>
                                <div style={{ padding: '16px 20px', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <Trophy size={18} style={{ color: '#f59e0b' }} />
                                        {selectedExam.name} — {selectedExam.batchId?.name} / {selectedExam.subject}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Pass: {selectedExam.passingMarks} / {selectedExam.totalMarks}</div>
                                </div>

                                {resultsLoading ? (
                                    <div className="loader-wrap"><Loader2 className="spinner" size={28} /></div>
                                ) : results.length === 0 ? (
                                    <div className="empty" style={{ padding: 40 }}>
                                        <p>No marks entered yet. Click "Marks" on the Tests tab to upload marks.</p>
                                    </div>
                                ) : (
                                    <table className="erp-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Student</th>
                                                <th>Roll No.</th>
                                                <th>Marks Obtained</th>
                                                <th>Out of</th>
                                                <th>Result</th>
                                                <th>Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map((r, idx) => {
                                                const style = getResultStyle(r.marksObtained, selectedExam.totalMarks, selectedExam.passingMarks);
                                                const passed = r.marksObtained >= selectedExam.passingMarks;
                                                const grade = passed ? 'PASS' : 'FAIL';
                                                return (
                                                    <tr key={r._id} style={{ ...style }}>
                                                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{idx + 1}</td>
                                                        <td><div className="td-bold" style={{ color: style.color }}>{r.studentId?.name || '—'}</div></td>
                                                        <td className="td-sm">{r.studentId?.rollNo || '—'}</td>
                                                        <td><span style={{ fontSize: '1.1rem', fontWeight: 900, color: style.color }}>{r.marksObtained}</span></td>
                                                        <td className="td-sm">{selectedExam.totalMarks}</td>
                                                        <td>
                                                            <span style={{
                                                                background: style.borderLeft.replace('3px solid ', '') + '22',
                                                                color: style.color,
                                                                padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontSize: '0.75rem'
                                                            }}>{grade}</span>
                                                        </td>
                                                        <td className="td-sm">{r.remarks || '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    )}

                    {!selectedExam && (
                        <div className="empty card" style={{ padding: 60 }}>
                            <Trophy size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                            <p>Select a test above to view its results.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ padding: 32, maxWidth: 380, textAlign: 'center' }}>
                        <Trash2 size={40} style={{ color: '#ef4444', marginBottom: 12, margin: '0 auto 12px' }} />
                        <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Delete Exam?</h3>
                        <p style={{ color: '#64748b', marginBottom: 20, fontSize: '0.9rem' }}>This will permanently delete the exam and all student results. This cannot be undone.</p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            <button className="btn" style={{ background: '#ef4444', color: '#fff', border: 'none' }} onClick={() => handleDelete(deleteConfirm)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {showCreate && <CreateTestModal onClose={() => setShowCreate(false)} onSave={() => { setShowCreate(false); fetchExams(); }} />}
            {showMarks && <MarksEntryModal exam={showMarks} onClose={() => setShowMarks(null)} onSave={() => { setShowMarks(null); fetchExams(); }} />}
        </ERPLayout>
    );
};

export default ExamsPage;
