import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogOut, User, Trophy, Target, TrendingUp,
    ClipboardList, BrainCircuit, Info, History, Loader2,
    BookOpen, CheckCircle2, LayoutDashboard
} from 'lucide-react';
import apiClient from '../api/apiConfig';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);

    // Get student from local storage
    const studentData = localStorage.getItem('student');
    const student = studentData ? JSON.parse(studentData) : { name: 'Student', _id: '' };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const fetchPerformance = useCallback(async () => {
        if (!student._id) return;
        setLoading(true);
        try {
            const { data } = await apiClient.get(`/exams/student/${student._id}/performance`);
            setPerformance(data);
        } catch (e) {
            console.error('Failed to load performance', e);
        } finally {
            setLoading(false);
        }
    }, [student._id]);

    useEffect(() => {
        fetchPerformance();
    }, [fetchPerformance]);

    return (
        <div className="erp-shell">
            <style>{`
                .st-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                .st-stat { display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: 12px; background: #fff; border: 1px solid #f1f5f9; }
                .st-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
                @media (max-width: 768px) {
                    .st-stats-grid { grid-template-columns: 1fr 1fr !important; }
                    .st-main-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
            <div className="erp-main" style={{ marginLeft: 0 }}>
                <div className="topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'var(--erp-primary)', color: '#fff', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>S</div>
                        <h2 className="tb-title" style={{ margin: 0 }}>Student Portal</h2>
                    </div>
                    <div className="tb-right">
                        <div className="tb-avatar" style={{ background: '#f1f5f9', color: 'var(--erp-primary)' }}><User size={18} /></div>
                        <span className="tb-name" style={{ fontWeight: 800 }}>{student.name}</span>
                        <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 12px' }} />
                        <button onClick={handleLogout} className="btn-tb-logout" style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
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
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle2 size={16} className="text-green-500" />
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Status: Active</span>
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
                                    { label: 'Personal Best', value: `${performance?.stats.bestScore || 0}%`, icon: Trophy, bg: '#fffbeb', color: '#92400e' },
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
                                            <div style={{ background: '#0284c7', color: '#fff', padding: 8, borderRadius: 8 }}><BrainCircuit size={20} /></div>
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
                                                    <div key={ch} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>{ch}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>Score: {performance.chapters[ch].score}%</div>
                                                        </div>
                                                        <span style={{
                                                            fontSize: '0.7rem', fontWeight: 900, padding: '4px 10px', borderRadius: 20,
                                                            background: performance.chapters[ch].status === 'Strong' ? '#dcfce7' : performance.chapters[ch].status === 'Average' ? '#fef9c3' : '#fee2e2',
                                                            color: performance.chapters[ch].status === 'Strong' ? '#166534' : performance.chapters[ch].status === 'Average' ? '#854d0e' : '#991b1b'
                                                        }}>
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
                                </div>

                                {/* Right Side: Test History */}
                                <div className="st-card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <History size={18} className="text-indigo-500" />
                                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>Recent Test Performance</h3>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>Session 2026-27</div>
                                    </div>
                                    <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                                        {performance?.history.length === 0 ? (
                                            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                                                <History size={48} style={{ opacity: 0.1, marginBottom: 12 }} />
                                                <p style={{ fontWeight: 600 }}>No test results published yet.</p>
                                            </div>
                                        ) : (
                                            <table className="erp-table" style={{ border: 'none' }}>
                                                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                                    <tr>
                                                        <th>Test Detail</th>
                                                        <th>Score Achieved</th>
                                                        <th style={{ textAlign: 'right' }}>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {performance?.history.slice().reverse().map((h, i) => (
                                                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                            <td>
                                                                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{h.testName}</div>
                                                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                    <BookOpen size={10} /> {h.subject} · {h.chapter}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>{h.percentage.toFixed(1)}%</div>
                                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>{h.marks} / {h.maxMarks}</div>
                                                            </td>
                                                            <td style={{ textAlign: 'right' }}>
                                                                <span style={{
                                                                    fontSize: '0.7rem', fontWeight: 900, padding: '4px 10px', borderRadius: 4,
                                                                    background: h.isPresent ? '#e0f2fe' : '#fee2e2',
                                                                    color: h.isPresent ? '#0369a1' : '#991b1b'
                                                                }}>
                                                                    {h.isPresent ? 'APPEARED' : 'ABSENT'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
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
