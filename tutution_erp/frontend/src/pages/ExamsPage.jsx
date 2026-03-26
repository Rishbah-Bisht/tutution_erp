import React, { useState, useEffect } from 'react';
import ERPLayout from '../components/ERPLayout';
import CreateTestModal from '../components/exams/CreateTestModal.jsx';
import MarksEntryModal from '../components/exams/MarksEntryModal.jsx';
import apiClient from '../api/apiConfig';
import {
    BookOpen, Plus, ClipboardList, Trophy, Edit3,
    Trash2, Loader2, AlertCircle, CheckCircle2, XCircle,
    ChevronRight, Clock, Award, Star, Sparkles
} from 'lucide-react';

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

const formatExamDate = (dateValue) => {
    if (!dateValue) return 'TBD';

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return 'TBD';

    return parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const ExamsPage = () => {
    const [tab, setTab] = useState('tests');
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedExam, setSelectedExam] = useState(null);
    const [results, setResults] = useState([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [showMarks, setShowMarks] = useState(null);
    const [error, setError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [improvers, setImprovers] = useState([]);
    const [improversLoading, setImproversLoading] = useState(false);
    const [scorers, setScorers] = useState([]);
    const [scorersLoading, setScorersLoading] = useState(false);
    const [leaderboardType, setLeaderboardType] = useState('improvers');
    const [filterBatch, setFilterBatch] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [visibleCount, setVisibleCount] = useState(15);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const { data } = await apiClient.get('/exams');
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
            const [resData, anaData] = await Promise.all([
                apiClient.get(`/exams/${exam._id}/results`),
                apiClient.get(`/exams/${exam._id}/analytics`)
            ]);
            setResults(resData.data.results || []);
            setAnalytics(anaData.data);
        } catch {
            setResults([]);
            setAnalytics(null);
        }
        finally { setResultsLoading(false); }
    };

    const fetchImprovers = async (batchId) => {
        if (!batchId) return;
        setImproversLoading(true);
        try {
            const { data } = await apiClient.get(`/exams/batch/${batchId}/improvers`);
            setImprovers(data.improvers || []);
        } catch { setImprovers([]); }
        finally { setImproversLoading(false); }
    };

    const fetchScorers = async (batchId) => {
        if (!batchId) return;
        setScorersLoading(true);
        try {
            const { data } = await apiClient.get(`/exams/batch/${batchId}/top-scorers`);
            setScorers(data.scorers || []);
        } catch { setScorers([]); }
        finally { setScorersLoading(false); }
    };

    const handleDelete = async (id) => {
        try {
            await apiClient.delete(`/exams/${id}`);
            setDeleteConfirm(null);
            fetchExams();
        } catch { setError('Failed to delete.'); }
    };

    // Derived Data for Filtering
    const uniqueBatches = Array.from(new Set(exams.map(e => e.batchId?._id).filter(Boolean)))
        .map(id => exams.find(e => e.batchId?._id === id).batchId);

    const availableSubjects = filterBatch
        ? Array.from(new Set(exams.filter(e => e.batchId?._id === filterBatch).map(e => e.subject)))
        : [];

    const filteredExams = exams.filter(e => {
        const matchBatch = !filterBatch || e.batchId?._id === filterBatch;
        const matchSubject = !filterSubject || e.subject === filterSubject;
        return matchBatch && matchSubject;
    });

    const displayedExams = filteredExams.slice(0, visibleCount);

    const passCount = results.filter(r => r.marksObtained >= selectedExam?.passingMarks).length;
    const failCount = results.length - passCount;
    const avgMarks = results.length ? (results.reduce((a, r) => a + r.marksObtained, 0) / results.length).toFixed(1) : '—';

    return (
        <ERPLayout title="Exams & Results">
            <style>{`
                .erp-table-wrap { overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch; }
                
                @media (max-width: 768px) {
                    .ex-hdr { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
                    .ex-hdr button { width: 100% !important; justify-content: center !important; }
                    .ex-tabs { width: 100% !important; overflow-x: auto; flex-wrap: nowrap !important; white-space: nowrap; }
                    .ex-tabs button { flex-shrink: 0; }
                    .ex-summary-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 10px !important; }
                    .ex-result-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; padding: 16px !important; }
                    .ex-result-header div { font-size: 0.85rem !important; }
                    .global-filters { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
                    .global-filters > div { width: 100% !important; min-width: auto !important; }
                }

                @media (max-width: 480px) {
                    .ex-summary-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
            `}</style>

            <div className="page-hdr ex-hdr" style={{ marginBottom: 24 }}>
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

            <div className="card global-filters" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>1. Select Batch</label>
                    <select
                        value={filterBatch}
                        onChange={e => { setFilterBatch(e.target.value); setFilterSubject(''); setSelectedExam(null); if (tab === 'leaderboard') { if (leaderboardType === 'improvers') fetchImprovers(e.target.value); else fetchScorers(e.target.value); } }}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', outline: 'none' }}
                    >
                        <option value="">All Batches</option>
                        {uniqueBatches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                </div>
                <div style={{ flex: 1, minWidth: 200, opacity: filterBatch ? 1 : 0.5, pointerEvents: filterBatch ? 'all' : 'none' }}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>2. Select Subject</label>
                    <select
                        value={filterSubject}
                        onChange={e => { setFilterSubject(e.target.value); setSelectedExam(null); }}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', outline: 'none' }}
                    >
                        <option value="">{filterBatch ? 'All Subjects' : 'Select Batch first...'}</option>
                        {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {(filterBatch || filterSubject) && (
                    <button
                        onClick={() => { setFilterBatch(''); setFilterSubject(''); setSelectedExam(null); }}
                        style={{ background: '#f1f5f9', border: 'none', padding: '10px 16px', borderRadius: 6, color: '#64748b', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                        Reset Filters
                    </button>
                )}
            </div>

            <div className="ex-tabs" style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 6, marginBottom: 24, width: 'fit-content' }}>
                {[
                    { key: 'tests', label: 'Tests', Icon: ClipboardList },
                    { key: 'results', label: 'Results', Icon: CheckCircle2 },
                    { key: 'leaderboard', label: 'Leaderboards', Icon: Trophy },
                ].map(({ key, label, Icon }) => (
                    <button key={key} onClick={() => setTab(key)} style={{
                        padding: '8px 22px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700,
                        fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6,
                        background: tab === key ? '#fff' : 'transparent',
                        color: tab === key ? 'var(--erp-primary)' : '#64748b',
                        boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                    }}>
                        <Icon size={15} /> {label}
                    </button>
                ))}
            </div>

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
                        <>
                            <div className="erp-table-wrap">
                                <table className="erp-table stackable">
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th>Test Name</th>
                                            <th>Batch</th>
                                            <th>Subject</th>
                                            <th>Test Date</th>
                                            <th>Total / Passing</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedExams.map(exam => (
                                            <tr key={exam._id}>
                                                <td data-label="Test Name">
                                                    <div className="td-bold">{exam.name}</div>
                                                    <div className="td-sm" style={{ color: '#94a3b8', marginTop: 4 }}>{exam.chapter || 'General test'}</div>
                                                </td>
                                                <td data-label="Batch"><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700 }}>{exam.batchId?.name || '—'}</span></td>
                                                <td className="td-sm" data-label="Subject">{exam.subject}</td>
                                                <td className="td-sm" data-label="Test Date">
                                                    <span style={{ fontWeight: 700, color: exam.date ? '#1e293b' : '#94a3b8' }}>{formatExamDate(exam.date)}</span>
                                                </td>
                                                <td className="td-sm" data-label="Total / Passing"><span style={{ fontWeight: 700 }}>{exam.totalMarks}</span> / <span style={{ color: '#64748b' }}>{exam.passingMarks}</span></td>
                                                <td data-label="Status">{statusBadge(exam.status)}</td>
                                                <td data-label="Actions">
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
                                                            style={{ background: 'var(--erp-bg-negative-light)', color: 'var(--erp-text-negative)', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
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
                            </div>
                            {filteredExams.length > displayedExams.length && (
                                <div style={{ padding: '0 20px 20px 20px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                                    Showing {displayedExams.length} of {filteredExams.length} tests
                                    <button
                                        onClick={() => setVisibleCount(v => v + 15)}
                                        style={{
                                            background: 'none', border: 'none', color: 'var(--erp-primary)',
                                            fontWeight: 700, cursor: 'pointer', marginLeft: 8, fontSize: '0.8rem'
                                        }}
                                    >
                                        Load More
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {tab === 'results' && (
                <div>
                    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>3. Select Test to View Results</label>
                        <select
                            value={selectedExam?._id || ''}
                            onChange={e => {
                                const exam = exams.find(x => x._id === e.target.value);
                                if (exam) fetchResults(exam);
                            }}
                            style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', minWidth: 260, width: '100%', outline: 'none' }}
                            disabled={!filterBatch || !filterSubject}
                        >
                            <option value="">{!filterBatch ? 'Choose Batch first...' : !filterSubject ? 'Choose Subject first...' : '-- Select Test --'}</option>
                            {filteredExams.map(e => <option key={e._id} value={e._id}>{e.name} ({formatExamDate(e.date)})</option>)}
                        </select>
                    </div>

                    {selectedExam && (
                        <>
                            <div className="ex-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 20 }}>
                                {[
                                    { label: 'Total Students', value: results.length, color: '#1b3a7a' },
                                    { label: 'Appeared', icon: <CheckCircle2 size={14} />, value: analytics?.appeared || 0, color: '#15803d' },
                                    { label: 'Absent', icon: <XCircle size={14} />, value: analytics?.absent || 0, color: '#be123c' },
                                    { label: 'Avg. Score', value: analytics?.avgScore || 0, color: '#a16207' },
                                    { label: 'Highest', icon: <Trophy size={14} />, value: analytics?.highestScore || 0, color: '#1e40af' },
                                ].map((c, index) => (
                                    <div key={index} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: c.color }}>{c.value}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                            {c.icon && c.icon} {c.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="card" style={{ overflow: 'hidden' }}>
                                <div className="ex-result-header" style={{ padding: '16px 20px', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <Trophy size={18} style={{ color: 'var(--erp-color-warning)' }} />
                                        {selectedExam.name} — {selectedExam.batchId?.name} / {selectedExam.subject}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <span>Scheduled: {formatExamDate(selectedExam.date)}</span>
                                        <span>Pass: {selectedExam.passingMarks} / {selectedExam.totalMarks}</span>
                                    </div>
                                </div>

                                {resultsLoading ? (
                                    <div className="loader-wrap"><Loader2 className="spinner" size={28} /></div>
                                ) : results.length === 0 ? (
                                    <div className="empty" style={{ padding: 40 }}>
                                        <p>No marks entered yet. Click "Marks" on the Tests tab to upload marks.</p>
                                    </div>
                                ) : (
                                    <div className="erp-table-wrap">
                                        <table className="erp-table stackable">
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
                                                            <td style={{ color: '#64748b', fontSize: '0.8rem' }} data-label="#">{idx + 1}</td>
                                                            <td data-label="Student"><div className="td-bold" style={{ color: style.color }}>{r.studentId?.name || '—'}</div></td>
                                                            <td className="td-sm" data-label="Roll No.">{r.studentId?.rollNo || '—'}</td>
                                                            <td data-label="Marks Obtained"><span style={{ fontSize: '1.1rem', fontWeight: 900, color: style.color }}>{r.marksObtained}</span></td>
                                                            <td className="td-sm" data-label="Out of">{selectedExam.totalMarks}</td>
                                                            <td data-label="Result">
                                                                <span style={{
                                                                    background: style.borderLeft.replace('3px solid ', '') + '22',
                                                                    color: style.color,
                                                                    padding: '3px 10px', borderRadius: 6, fontWeight: 800, fontSize: '0.75rem'
                                                                }}>{grade}</span>
                                                            </td>
                                                            <td className="td-sm" data-label="Remarks">{r.remarks || '—'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
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

            {tab === 'leaderboard' && (
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', gap: 8, background: '#f8fafc', padding: '4px', borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 20, width: 'fit-content' }}>
                        <button
                            onClick={() => setLeaderboardType('improvers')}
                            style={{
                                padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                                background: leaderboardType === 'improvers' ? 'var(--erp-primary)' : 'transparent',
                                color: leaderboardType === 'improvers' ? '#fff' : '#64748b'
                            }}
                        >
                            Top Improvers
                        </button>
                        <button
                            onClick={() => setLeaderboardType('scorers')}
                            style={{
                                padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                                background: leaderboardType === 'scorers' ? 'var(--erp-primary)' : 'transparent',
                                color: leaderboardType === 'scorers' ? '#fff' : '#64748b'
                            }}
                        >
                            Merit List
                        </button>
                    </div>

                    {!filterBatch ? (
                        <div className="empty" style={{ padding: 60 }}>
                            <Trophy size={48} style={{ opacity: 0.1, marginBottom: 12 }} />
                            <p>Select a batch and subject from the filters above to access the leaderboards.</p>
                        </div>
                    ) : leaderboardType === 'improvers' ? (
                        improversLoading ? (
                            <div className="loader-wrap" style={{ padding: 40 }}><Loader2 className="spinner" size={32} /></div>
                        ) : improvers.length === 0 ? (
                            <div className="empty" style={{ padding: 60 }}>
                                <Trophy size={48} style={{ opacity: 0.1, marginBottom: 12 }} />
                                <p>No improvement data available for this batch.</p>
                                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Note: Requires students to have at least 2 test results.</p>
                            </div>
                        ) : (
                            <div className="erp-table-wrap">
                                <table className="erp-table stackable">
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ width: 80 }}>Rank</th>
                                            <th>Student Name</th>
                                            <th>Improvement</th>
                                            <th>Current Avg %</th>
                                            <th>Previous Avg %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {improvers.map((imp, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 800 }} data-label="Rank">
                                                    {i === 0 ? <Award size={20} color="#eab308" style={{ verticalAlign: 'middle' }} /> :
                                                        i === 1 ? <Award size={20} color="#94a3b8" style={{ verticalAlign: 'middle' }} /> :
                                                            i === 2 ? <Award size={20} color="#b45309" style={{ verticalAlign: 'middle' }} /> :
                                                                `#${i + 1}`}
                                                </td>
                                                <td data-label="Student Name"><div className="td-bold">{imp.name}</div></td>
                                                <td data-label="Improvement">
                                                    <span style={{
                                                        color: '#15803d', fontWeight: 800, background: '#f0fdf4',
                                                        padding: '4px 12px', borderRadius: 6, fontSize: '0.85rem'
                                                    }}>
                                                        +{imp.improvement}%
                                                    </span>
                                                </td>
                                                <td className="td-bold" data-label="Current Avg %">{imp.current}%</td>
                                                <td className="td-sm" data-label="Previous Avg %">{imp.last}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        scorersLoading ? (
                            <div className="loader-wrap" style={{ padding: 40 }}><Loader2 className="spinner" size={32} /></div>
                        ) : scorers.length === 0 ? (
                            <div className="empty" style={{ padding: 60 }}>
                                <Trophy size={48} style={{ opacity: 0.1, marginBottom: 12 }} />
                                <p>No merit data available for this batch.</p>
                            </div>
                        ) : (
                            <div className="erp-table-wrap">
                                <table className="erp-table stackable">
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ width: 80 }}>Rank</th>
                                            <th>Student Name</th>
                                            <th>Overall Avg %</th>
                                            <th>Tests Taken</th>
                                            <th>Standing</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scorers.map((s, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 800 }} data-label="Rank">
                                                    {i === 0 ? <Trophy size={20} color="#eab308" style={{ verticalAlign: 'middle' }} /> :
                                                        i === 1 ? <Star size={20} color="#94a3b8" style={{ verticalAlign: 'middle' }} /> :
                                                            i === 2 ? <Sparkles size={20} color="#b45309" style={{ verticalAlign: 'middle' }} /> :
                                                                `#${i + 1}`}
                                                </td>
                                                <td data-label="Student Name"><div className="td-bold">{s.name}</div></td>
                                                <td data-label="Overall Avg %">
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--erp-primary)' }}>{s.avgScore}%</div>
                                                </td>
                                                <td className="td-sm" data-label="Tests Taken">{s.testsTaken} Tests</td>
                                                <td data-label="Standing">
                                                    <span style={{
                                                        background: s.avgScore >= 90 ? '#f0fdf4' : s.avgScore >= 75 ? '#eff6ff' : '#f8fafc',
                                                        color: s.avgScore >= 90 ? '#15803d' : s.avgScore >= 75 ? '#1e40af' : '#64748b',
                                                        padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800
                                                    }}>
                                                        {s.avgScore >= 90 ? 'Outstanding' : s.avgScore >= 75 ? 'Distinguished' : 'Standard'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>
            )}

            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ padding: 32, maxWidth: 380, textAlign: 'center', width: '90%' }}>
                        <Trash2 size={40} style={{ color: 'var(--erp-color-negative)', marginBottom: 12, margin: '0 auto 12px' }} />
                        <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Delete Exam?</h3>
                        <p style={{ color: '#64748b', marginBottom: 20, fontSize: '0.9rem' }}>This will permanently delete the exam and all student results. This cannot be undone.</p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            <button className="btn" style={{ background: 'var(--erp-color-negative)', color: '#fff', border: 'none' }} onClick={() => handleDelete(deleteConfirm)}>Delete</button>
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
