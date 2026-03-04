import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboard } from '../api/adminApi';
import ERPLayout from '../components/ERPLayout';
import {
    GraduationCap,
    BookOpen,
    Users,
    IndianRupee,
    UserPlus,
    AlertCircle,
    Loader2,
    Calendar
} from 'lucide-react';

const fmt = (n) => n?.toLocaleString('en-IN') ?? '—';
const fmtDay = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

const AdminDashboard = () => {
    const navigate = useNavigate();
    const admin = JSON.parse(localStorage.getItem('admin') || '{}');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!localStorage.getItem('token')) { navigate('/login'); return; }
        fetchDashboard()
            .then(({ data: d }) => setData(d))
            .catch(err => {
                if (err.response?.status === 401) navigate('/login');
                else setError('Failed to load dashboard data.');
            })
            .finally(() => setLoading(false));
    }, [navigate]);

    const stats = data ? [
        { label: 'Total Students', value: fmt(data.totalStudents), sub: 'enrolled', icon: GraduationCap, cls: 'ic-indigo' },
        { label: 'Active Batches', value: fmt(data.activeBatches), sub: 'currently running', icon: BookOpen, cls: 'ic-indigo' },
        { label: 'Total Teachers', value: fmt(data.totalTeachers), sub: 'across batches', icon: Users, cls: 'ic-indigo' },
        { label: 'Fees Collected', value: `₹${fmt(data.totalFeesPaid)}`, sub: 'collected so far', icon: IndianRupee, cls: 'ic-indigo' },
    ] : [];

    if (loading) return (
        <ERPLayout title="Dashboard">
            <div className="loader-wrap">
                <Loader2 className="spinner" size={40} />
                <p>Loading dashboard…</p>
            </div>
        </ERPLayout>
    );

    return (
        <ERPLayout title="Dashboard">
            <div className="page-hdr" style={{ marginBottom: 32, marginTop: 8 }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--erp-primary)' }}>Institute Insights</h1>
                    <p style={{ fontSize: '0.95rem', color: '#64748b' }}>Welcome back, <b>{admin.adminName || 'Admin'}</b>. Here's your daily institute overview.</p>
                </div>
            </div>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map(s => {
                    const Icon = s.icon;
                    return (
                        <div className="stat-card" key={s.label}>
                            <div className={`stat-icon ${s.cls}`}>
                                <Icon size={24} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div className="stat-label">{s.label}</div>
                                <div className="stat-value">{s.value}</div>
                                <div className="stat-sub">{s.sub}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Recent Admissions */}
            <div className="card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 800, color: 'var(--erp-primary)', marginBottom: 24, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <UserPlus size={20} style={{ color: 'var(--erp-accent)' }} /> Recent Admissions
                </div>
                {data?.recentAdmissions?.length ? (
                    <table className="erp-table">
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ borderRadius: '2px 0 0 2px' }}>Student</th>
                                <th>Joined</th>
                                <th style={{ borderRadius: '0 2px 2px 0' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.recentAdmissions.map(s => (
                                <tr key={s._id}>
                                    <td>
                                        <div className="td-bold" style={{ fontSize: '0.85rem' }}>{s.name}</div>
                                        <div className="td-sm">{s.rollNo || '—'}</div>
                                    </td>
                                    <td className="td-sm">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                            <Calendar size={12} style={{ color: '#64748b' }} /> {fmtDate(s.joinedAt)}
                                        </div>
                                    </td>
                                    <td>
                                        {s.feesPaid >= s.fees && s.fees > 0
                                            ? <span className="badge badge-active">Fully Paid</span>
                                            : <span className="badge badge-unpaid">Pending</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty" style={{ height: 240 }}>
                        <GraduationCap size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                        <p>No admissions yet.</p>
                    </div>
                )}
            </div>
        </ERPLayout>
    );
};

export default AdminDashboard;