import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Bell, BookOpen, Building2, Calendar, CheckCircle2, ChevronRight, Clock, FileText, IndianRupee, LayoutDashboard, LogOut, Mail, MapPin, Phone, Search, Settings, User, Wallet
} from 'lucide-react';
import { API_BASE_URL } from '../api/apiConfig';
import TeacherSalaryProfile from '../components/teachers/TeacherSalaryProfile';

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [teacher, setTeacher] = useState(JSON.parse(localStorage.getItem('teacher') || '{}'));
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/teacher/profile`, {
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

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
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

                    {activeTab === 'salary' && (
                        <div className="animate-in">
                            <div className="page-header-premium mb-6">
                                <div>
                                    <h1 className="text-2xl font-black text-slate-800">Salary & Finance</h1>
                                    <p className="text-slate-500">Manage your bank details and view your payment history.</p>
                                </div>
                            </div>
                            <TeacherSalaryProfile />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
