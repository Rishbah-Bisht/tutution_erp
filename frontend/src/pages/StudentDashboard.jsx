import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogOut, User, Trophy, Target, TrendingUp,
    ClipboardList, BrainCircuit, History, Loader2,
    BookOpen, CheckCircle2, LayoutDashboard
} from 'lucide-react';
import apiClient from '../api/apiConfig';
import { getStudentAttendanceReport } from '../api/attendanceApi';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attendanceSummary, setAttendanceSummary] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceRecords, setAttendanceRecords] = useState([]);

    // Get student from local storage
    const studentData = localStorage.getItem('student');
    const student = studentData ? JSON.parse(studentData) : { name: 'Student', _id: '' };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/portal');
    };

    const fetchPerformance = useCallback(async () => {
        if (!student._id) return;
        setLoading(true);
        try {
            const { data } = await apiClient.get(`/student/performance`);
            setPerformance(data);
        } catch (e) {
            console.error('Failed to load performance', e);
        } finally {
            setLoading(false);
        }
    }, [student._id]);

    const fetchAttendanceSummary = useCallback(async () => {
        if (!student._id) return;
        setAttendanceLoading(true);
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const params = {
                dateFrom: startOfMonth.toISOString().slice(0, 10),
                dateTo: now.toISOString().slice(0, 10),
                page: 1,
                limit: 10
            };
            const { data } = await getStudentAttendanceReport(params);
            const summary = data.summary || { total: 0, present: 0, absent: 0, late: 0 };
            const percentage = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;
            setAttendanceSummary({ ...summary, percentage });
            setAttendanceRecords(data.records || []);
        } catch (e) {
            console.error('Failed to load attendance summary', e);
        } finally {
            setAttendanceLoading(false);
        }
    }, [student._id]);

    useEffect(() => {
        fetchPerformance();
        fetchAttendanceSummary();
    }, [fetchAttendanceSummary, fetchPerformance]);

    return (
        <div className="erp-shell">
            <style>{`
                .st-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.375rem; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                .st-stat { display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: 0.375rem; background: #fff; border: 1px solid #f1f5f9; }
                .st-icon { width: 48px; height: 48px; border-radius: 0.375rem; display: flex; align-items: center; justify-content: center; }
                @media (max-width: 768px) {
                    .st-stats-grid { grid-template-columns: 1fr 1fr !important; }
                    .st-main-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
            <div className="erp-main" style={{ marginLeft: 0 }}>
                <div className="topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'var(--erp-primary)', color: '#fff', width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>S</div>
                        <h2 className="tb-title" style={{ margin: 0 }}>Student Portal</h2>
                    </div>
                    <div className="tb-right">
                        <div className="tb-avatar" style={{ background: '#f1f5f9', color: 'var(--erp-primary)' }}><User size={18} /></div>
                        <span className="tb-name" style={{ fontWeight: 800 }}>{student.name}</span>
                        <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 12px' }} />
                        <button onClick={handleLogout} className="btn-tb-logout" style={{ background: 'var(--erp-bg-negative-light)', color: 'var(--erp-color-negative)', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>

                <div className="page-content" style={{ padding: '24px 32px' }}>
                    <div className="page-hdr" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Welcome, {student.name}! 👋</h1>
                            <p style={{ color: '#64748b', fontSize: '1rem', marginTop: 4 }}>Track your growth and identify improvement areas.</p>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle2 size={16} className="text-green-500" />
                                <span className="text-positive" style={{ fontSize: '0.85rem', fontWeight: 800 }}>Status: Active</span>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 100, gap: 16 }}>
                            <Loader2 className="spinner" size={48} color="var(--erp-primary)" />
                            <p style={{ fontWeight: 800, color: '#94a3b8' }}>Synthesizing your performance data...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Stats Summary */}
                            <div className="st-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                                {[
                                    { label: 'Avg Performance', value: `${performance?.stats.avgScore || 0}%`, icon: Target, bg: '#eff6ff', color: '#2563eb' },
                                    { label: 'Growth Trend', value: `${(performance?.stats.improvement || 0) >= 0 ? '+' : ''}${performance?.stats.improvement || 0}%`, icon: TrendingUp, bg: (performance?.stats.improvement || 0) >= 0 ? '#f0fdf4' : '#fff1f2', color: (performance?.stats.improvement || 0) >= 0 ? '#166534' : '#991b1b' },
                                    { label: 'Attendance', value: attendanceLoading ? '--' : (attendanceSummary.total > 0 ? `${attendanceSummary.percentage}%` : '--'), icon: CheckCircle2, bg: '#ecfdf5', color: '#047857' },
                                    { label: 'Total Assessments', value: performance?.stats.totalTests || 0, icon: ClipboardList, bg: '#f8fafc', color: '#475569' },
                                ].map(s => (
                                    <div key={s.label} className="st-stat">
                                        <div className="st-icon" style={{ background: s.bg, color: s.color }}>
                                            <s.icon size={22} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b' }}>{s.value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="st-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
                                {/* Left Side: AI Suggestions & Chapter Analysis */}
                                <div className="space-y-6">
                                    <div className="st-card" style={{ border: '2px solid #e0f2fe', background: '#f8fafc' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                            <div style={{ background: '#0284c7', color: '#fff', padding: 8, borderRadius: 6 }}><BrainCircuit size={20} /></div>
                                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0c4a6e' }}>AI Performance Insight</h3>
                                        </div>
                                        <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, fontStyle: 'italic' }}>
                                            {performance?.suggestion || "Maintain consistency in your upcoming tests to see detailed growth insights here."}
                                        </p>
                                    </div>

                                    <div className="st-card">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                            <LayoutDashboard size={18} className="text-blue-500" />
                                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>Chapter Strength Analysis</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {performance && Object.keys(performance.chapters).length > 0 ? (
                                                Object.keys(performance.chapters).map(ch => (
                                                    <div key={ch} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>{ch}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>Score: {performance.chapters[ch].score}%</div>
                                                        </div>
                                                        <span className={performance.chapters[ch].status === 'Strong' ? 'bg-positive-light text-positive' : performance.chapters[ch].status === 'Average' ? 'bg-warning-light text-warning' : 'bg-negative-light text-negative'} style={{ fontSize: '0.7rem', fontWeight: 900, padding: '4px 10px', borderRadius: 6 }}>
                                                            {performance.chapters[ch].status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                                    Assessments history required for analysis.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Subject & Overall Rank Integration */}
                                    <div className="st-card" style={{ border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                            <Trophy size={18} className="text-amber-500" />
                                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>Batch Ranking</h3>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderRadius: 6, background: '#fffbeb', marginBottom: 12 }}>
                                            <div style={{ background: 'var(--erp-color-warning)', color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                {performance?.ranks?.overall ? `#${performance.ranks.overall}` : '-'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#92400e' }}>Overall Rank</div>
                                                <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 2 }}>Out of {performance?.totalStudentsInBatch || 0} active students in batch</div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mt-4">
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>Subject Wise Rank</div>
                                            {performance?.ranks?.subjects && Object.keys(performance.ranks.subjects).length > 0 ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                    {Object.keys(performance.ranks.subjects).map(sub => (
                                                        <div key={sub} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>{sub}</span>
                                                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>#{performance.ranks.subjects[sub]}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                                                    Not enough data for subject ranks.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="st-card" style={{ border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                            <CheckCircle2 size={18} className="text-emerald-500" />
                                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>Attendance Snapshot</h3>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                                            {[
                                                { label: 'Present', value: attendanceSummary.present, color: '#16a34a', bg: '#ecfdf5' },
                                                { label: 'Absent', value: attendanceSummary.absent, color: '#dc2626', bg: '#fef2f2' },
                                                { label: 'Late', value: attendanceSummary.late, color: '#d97706', bg: '#fffbeb' }
                                            ].map(item => (
                                                <div key={item.label} style={{ background: item.bg, borderRadius: 6, padding: 10, textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{item.label}</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: item.color }}>{item.value}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ marginTop: 16 }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 8 }}>Recent Attendance</div>
                                            {attendanceLoading ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontWeight: 700 }}>
                                                    <Loader2 size={14} className="spin" /> Loading attendance...
                                                </div>
                                            ) : attendanceRecords.length === 0 ? (
                                                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No attendance records yet.</div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {attendanceRecords.slice(0, 6).map((record) => {
                                                        const status = record.status || 'Present';
                                                        const statusTone = status === 'Present'
                                                            ? { bg: '#ecfdf5', color: '#047857' }
                                                            : status === 'Absent'
                                                                ? { bg: '#fef2f2', color: '#b91c1c' }
                                                                : { bg: '#fffbeb', color: '#b45309' };
                                                        return (
                                                            <div key={record._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 6, background: '#f8fafc' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                                                                        {record.subjectId?.name || 'Subject'}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                                                                        {new Date(record.attendanceDate || record.date).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                                <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', background: statusTone.bg, color: statusTone.color }}>
                                                                    {status}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>                                {/* Right Side: Test History */}
                                <div className="st-card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 }}>
                                                    <History size={24} />
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Academic Journey</h3>
                                                    <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Track your test performance over time</p>
                                                </div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)' }}>
                                                Session 2026-27
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ maxHeight: 600, overflowY: 'auto', padding: '16px' }}>
                                        {performance?.history?.length === 0 ? (
                                            <div style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>
                                                <History size={64} style={{ opacity: 0.1, marginBottom: 16 }} />
                                                <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>No tests recorded yet.</p>
                                                <p style={{ fontSize: '0.9rem' }}>Your academic achievements will appear here.</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {performance?.history.slice().reverse().map((h, i) => {
                                                    const isPass = h.marks >= (h.passingMarks || (h.maxMarks * 0.4));
                                                    return (
                                                        <div key={i} style={{ 
                                                            padding: '20px', 
                                                            background: '#fff', 
                                                            borderRadius: 16, 
                                                            border: '1px solid #f1f5f9',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            transition: 'all 0.3s ease',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                        }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                                    <span style={{ 
                                                                        padding: '4px 8px', 
                                                                        background: '#f8fafc', 
                                                                        borderRadius: 6, 
                                                                        fontSize: '0.65rem', 
                                                                        fontWeight: 900, 
                                                                        color: '#64748b',
                                                                        border: '1px solid #e2e8f0'
                                                                    }}>{h.subject}</span>
                                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>• {new Date(h.date).toLocaleDateString()}</span>
                                                                </div>
                                                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>{h.testName}</h4>
                                                                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Chapter: {h.chapter}</p>
                                                            </div>

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                                                <div style={{ textAlign: 'center' }}>
                                                                    <div style={{ 
                                                                        fontSize: '1.25rem', 
                                                                        fontWeight: 900, 
                                                                        color: h.isPresent ? (isPass ? '#059669' : '#dc2626') : '#94a3b8' 
                                                                    }}>
                                                                        {h.isPresent ? `${h.marks}` : '--'}
                                                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}> / {h.maxMarks}</span>
                                                                    </div>
                                                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                        {h.isPresent ? `${h.percentage.toFixed(1)}%` : 'Absent'}
                                                                    </div>
                                                                </div>

                                                                <div style={{ 
                                                                    width: 44, 
                                                                    height: 44, 
                                                                    borderRadius: '50%', 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    justifyContent: 'center',
                                                                    background: h.isPresent ? (isPass ? '#ecfdf5' : '#fef2f2') : '#f1f5f9',
                                                                    color: h.isPresent ? (isPass ? '#059669' : '#dc2626') : '#94a3b8',
                                                                    border: `2px solid ${h.isPresent ? (isPass ? '#d1fae5' : '#fee2e2') : '#e2e8f0'}`
                                                                }}>
                                                                    {h.isPresent ? (isPass ? <CheckCircle2 size={24} /> : <Target size={24} />) : <History size={20} />}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {performance?.history?.length > 0 && (
                                        <div style={{ padding: '20px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Overall Standing</span>
                                            <div style={{ display: 'flex', gap: 16 }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Avg Score</div>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>{performance.stats.avgScore}%</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Rank</div>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#4f46e5' }}>#{performance.ranks.overall || '--'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
