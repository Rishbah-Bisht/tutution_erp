import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Bell, BookOpen, Building2, Calendar, CheckCircle2, ChevronRight, Clock, FileText, IndianRupee, LayoutDashboard, LogOut, Mail, MapPin, Phone, Search, Settings, User, Wallet, Trophy, TrendingUp, Target, Loader2, BrainCircuit, ClipboardList
} from 'lucide-react';
import { API_BASE_URL, TEACHER_API_BASE_URL } from '../api/apiConfig';

import TeacherSalaryProfile from '../components/teachers/TeacherSalaryProfile';

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [teacher, setTeacher] = useState(JSON.parse(localStorage.getItem('teacher') || '{}'));
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedBatchAnalytics, setSelectedBatchAnalytics] = useState(null);
    const [batchImprovers, setBatchImprovers] = useState([]);
    const [batchScorers, setBatchScorers] = useState([]);
    const [performanceType, setPerformanceType] = useState('improvers');
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${TEACHER_API_BASE_URL}/api/teacher/profile`, {

                headers: { Authorization: `Bearer ${token}` }
            });
            setProfileData(res.data);
            setLoading(res === false);
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBatchPerformance = async (batchId) => {
        if (!batchId) return;
        setAnalyticsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [anaRes, impRes, scoRes] = await Promise.all([
                axios.get(`${TEACHER_API_BASE_URL}/api/exams/batch/${batchId}/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${TEACHER_API_BASE_URL}/api/exams/batch/${batchId}/improvers`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${TEACHER_API_BASE_URL}/api/exams/batch/${batchId}/top-scorers`, { headers: { Authorization: `Bearer ${token}` } })

            ]);
            setSelectedBatchAnalytics(anaRes.data);
            setBatchImprovers(impRes.data.improvers || []);
            setBatchScorers(scoRes.data.scorers || []);
        } catch (err) {
            console.error('Error fetching batch performance:', err);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'performance', label: 'Performance', icon: Target },
        { id: 'salary', label: 'Salary & Bank', icon: Wallet },
    ];

    return (
        <div className="erp-shell">
            {/* Sidebar Simulation for Portal */}
            <div className="sidebar" style={{ width: 260 }}>
                <div className="sidebar-brand">
                    <div className="brand-icon">T</div>
                    <span className="brand-text">Teacher Portal</span>
                </div>
                <div className="sidebar-nav">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                            style={{ borderLeft: activeTab === tab.id ? '3px solid var(--erp-teacher)' : '' }}
                        >
                            <tab.icon size={18} style={{ color: activeTab === tab.id ? 'var(--erp-teacher)' : '' }} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                    <div className="nav-divider" />
                    <button onClick={handleLogout} className="nav-item text-red-500 mt-auto">
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            <div className="erp-main" style={{ marginLeft: 260 }}>
                <div className="topbar">
                    <div className="tb-search">
                        <Search size={18} />
                        <input type="text" placeholder="Search portal..." />
                    </div>
                    <div className="tb-right">
                        <button className="tb-btn"><Bell size={18} /></button>
                        <button className="tb-btn"><Settings size={18} /></button>
                        <div className="tb-divider" />
                        <div className="tb-user">
                            <div className="tb-avatar">{teacher.name?.charAt(0)}</div>
                            <div className="tb-info">
                                <span className="tb-name">{teacher.name}</span>
                                <span className="tb-role">{teacher.regNo}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="page-content">
                    {activeTab === 'overview' && (
                        <div className="animate-in">
                            <div className="page-header-premium">
                                <div>
                                    <h1 className="text-2xl font-black text-slate-800">Hi, {teacher.name}! 👋</h1>
                                    <p className="text-slate-500">Welcome to your dashboard. Here's what's happening today.</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="stat-pill">
                                        <span className="stat-label">Employee ID</span>
                                        <span className="stat-value">{teacher.regNo}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                                {/* Assigned Batches Card */}
                                <div className="card lg:col-span-2">
                                    <div className="p-5 border-b flex items-center justify-between">
                                        <h3 className="font-bold flex items-center gap-2">
                                            <BookOpen size={18} className="text-emerald-500" />
                                            My Assignments
                                        </h3>
                                        <span className="badge badge-info">{profileData?.teacher?.assignments?.length || 0} Batches</span>
                                    </div>
                                    <div className="p-0">
                                        <table className="erp-table">
                                            <thead>
                                                <tr>
                                                    <th>Batch Name</th>
                                                    <th>Subjects</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {profileData?.teacher?.assignments?.length > 0 ? (
                                                    profileData.teacher.assignments.map((asgn, idx) => (
                                                        <tr key={idx}>
                                                            <td className="font-bold">{asgn.batchId?.name || asgn.batchName}</td>
                                                            <td>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {asgn.subjects.map((s, si) => (
                                                                        <span key={si} className="badge badge-soft">{s}</span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <button className="btn-icon"><ChevronRight size={16} /></button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="3" className="text-center py-8 text-slate-400">No batches assigned yet.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Payout Quick View */}
                                <div className="card">
                                    <div className="p-5 border-b">
                                        <h3 className="font-bold flex items-center gap-2">
                                            <Wallet size={18} className="text-emerald-500" />
                                            Payout Profile
                                        </h3>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                                                <IndianRupee size={32} />
                                            </div>
                                            <h4 className="text-xl font-black text-slate-800">₹{profileData?.teacher?.salary?.toLocaleString() || '0'}</h4>
                                            <p className="text-slate-500 text-sm mt-1">Gross Base Salary</p>
                                        </div>

                                        <div className="mt-6 space-y-3">
                                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                                <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                                    Bank Linked
                                                </span>
                                                <span className="text-xs font-bold text-slate-400">
                                                    {profileData?.bankDetails?.bankName ? 'Active' : 'Missing'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setActiveTab('salary')}
                                                className="btn-primary w-full"
                                                style={{ background: 'var(--erp-teacher)', borderColor: 'var(--erp-teacher)' }}
                                            >
                                                Manage Payout
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className="animate-in">
                            <div className="page-header-premium mb-6">
                                <div>
                                    <h1 className="text-2xl font-black text-slate-800">Batch Performance Intelligence</h1>
                                    <p className="text-slate-500">Analyze class progress, top improvers and subject proficiency.</p>
                                </div>
                                <div className="flex gap-4">
                                    <select
                                        className="btn btn-outline"
                                        style={{ background: '#fff', border: '1.5px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 800 }}
                                        onChange={e => fetchBatchPerformance(e.target.value)}
                                    >
                                        <option value="">Select Assigned Batch...</option>
                                        {profileData?.teacher?.assignments?.map(asgn => (
                                            <option key={asgn.batchId?._id} value={asgn.batchId?._id}>{asgn.batchId?.name || asgn.batchName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {analyticsLoading ? (
                                <div className="p-20 flex flex-col items-center gap-4 text-slate-400">
                                    <Loader2 className="spin" size={40} />
                                    <p className="font-medium">Synthesizing batch performance data...</p>
                                </div>
                            ) : !selectedBatchAnalytics ? (
                                <div className="card p-20 text-center">
                                    <Target size={48} className="mx-auto text-slate-200 mb-4" />
                                    <h3 className="font-bold text-slate-600">Choose a batch to view intelligence insights</h3>
                                    <p className="text-slate-400 text-sm">You can view average scores, top improvers and chapter gaps.</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Analytics Ribbon */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        {[
                                            { label: 'Avg. Class Score', value: `${selectedBatchAnalytics.avgScore}%`, icon: Target, cls: 'text-indigo-600 bg-indigo-50' },
                                            { label: 'Highest Achieved', value: `${selectedBatchAnalytics.highestScore}%`, icon: Trophy, cls: 'text-emerald-600 bg-emerald-50' },
                                            { label: 'Lowest Score', value: `${selectedBatchAnalytics.lowestScore}%`, icon: TrendingUp, cls: 'text-rose-600 bg-rose-50' },
                                            { label: 'Total Apperance', value: selectedBatchAnalytics.appeared, icon: ClipboardList, cls: 'text-slate-600 bg-slate-50' },
                                        ].map(s => (
                                            <div key={s.label} className="card p-5 flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-sm flex items-center justify-center ${s.cls}`}>
                                                    <s.icon size={20} />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
                                                    <div className="text-xl font-black text-slate-800">{s.value}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Leaderboard Section */}
                                        <div className="card">
                                            <div className="p-5 border-b flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Trophy size={18} className="text-amber-500" />
                                                    <h3 className="font-bold">Batch Leaderboard</h3>
                                                </div>
                                                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                                                    <button
                                                        onClick={() => setPerformanceType('improvers')}
                                                        className={`text-[10px] font-black px-3 py-1.5 rounded-md transition-all ${performanceType === 'improvers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                                    >
                                                        GROWTH
                                                    </button>
                                                    <button
                                                        onClick={() => setPerformanceType('scorers')}
                                                        className={`text-[10px] font-black px-3 py-1.5 rounded-md transition-all ${performanceType === 'scorers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                                    >
                                                        MERIT
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-0">
                                                <table className="erp-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Rank</th>
                                                            <th>Student</th>
                                                            <th>{performanceType === 'improvers' ? 'Growth' : 'Avg Score'}</th>
                                                            <th>{performanceType === 'improvers' ? 'Current' : 'Tests'}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {performanceType === 'improvers' ? (
                                                            batchImprovers.length > 0 ? batchImprovers.map((imp, i) => (
                                                                <tr key={i}>
                                                                    <td style={{ fontWeight: 800 }}>#{i + 1}</td>
                                                                    <td><div className="font-bold">{imp.name}</div></td>
                                                                    <td><span className="badge badge-active">+{imp.improvement}%</span></td>
                                                                    <td className="font-bold">{imp.current}%</td>
                                                                </tr>
                                                            )) : (
                                                                <tr><td colSpan="4" className="text-center py-10 text-slate-400">No growth data available.</td></tr>
                                                            )
                                                        ) : (
                                                            batchScorers.length > 0 ? batchScorers.map((s, i) => (
                                                                <tr key={i}>
                                                                    <td style={{ fontWeight: 800 }}>
                                                                        {i === 0 ? '🏆' : i === 1 ? '⭐' : i === 2 ? '✨' : `#${i + 1}`}
                                                                    </td>
                                                                    <td><div className="font-bold">{s.name}</div></td>
                                                                    <td><div className="font-black text-indigo-600">{s.avgScore}%</div></td>
                                                                    <td className="text-slate-500 font-bold">{s.testsTaken} Tests</td>
                                                                </tr>
                                                            )) : (
                                                                <tr><td colSpan="4" className="text-center py-10 text-slate-400">No merit data available.</td></tr>
                                                            )
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Class Intelligence */}
                                        <div className="card">
                                            <div className="p-5 border-b flex items-center gap-2">
                                                <BrainCircuit size={18} className="text-indigo-500" />
                                                <h3 className="font-bold">Pedagogical Insights</h3>
                                            </div>
                                            <div className="p-6 space-y-6">
                                                <div className="p-4 bg-indigo-50 rounded-sm italic border-l-4 border-indigo-400">
                                                    <p className="text-sm font-medium text-indigo-900 leading-relaxed">
                                                        "The class average is currently at <strong>{selectedBatchAnalytics.avgScore}%</strong>. Focus
                                                        on the bottom 15% of students who are scoring below <strong>{selectedBatchAnalytics.lowestScore}%</strong> to
                                                        bring up the overall proficiency."
                                                    </p>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
                                                        <span>Class Proficiency</span>
                                                        <span>{selectedBatchAnalytics.avgScore}%</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500" style={{ width: `${selectedBatchAnalytics.avgScore}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
