import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboard } from '../api/adminApi';
import ERPLayout from '../components/ERPLayout';
import { hasClientSession } from '../utils/authSession';
import {
    Activity,
    AlertCircle,
    BookOpen,
    Calendar,
    CreditCard,
    GraduationCap,
    IndianRupee,
    Loader2,
    PieChart,
    AlertTriangle,
    Users,
    Users2,
    WifiOff
} from 'lucide-react';

const LIVE_REFRESH_MS = 30000;

const formatShortDate = (value) => {
    if (!value) return 'Date TBD';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Date TBD';

    return parsed.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
    });
};

const formatCurrency = (value) => `Rs. ${new Intl.NumberFormat('en-IN').format(Number(value) || 0)}`;

const feeStatusMeta = {
    paid: { label: 'Paid', background: '#dcfce7', color: '#166534' },
    partial: { label: 'Partial', background: '#fef3c7', color: '#92400e' },
    overdue: { label: 'Overdue', background: '#fee2e2', color: '#991b1b' },
    pending: { label: 'Pending', background: '#dbeafe', color: '#1e40af' }
};

const examStatusMeta = {
    scheduled: { label: 'Scheduled', background: '#dbeafe', color: '#1e40af' },
    completed: { label: 'Results out', background: '#dcfce7', color: '#166534' },
    cancelled: { label: 'Cancelled', background: '#fee2e2', color: '#991b1b' },
    draft: { label: 'Draft', background: '#f1f5f9', color: '#475569' }
};

const StatusPill = ({ meta }) => (
    <span
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 90,
            padding: '5px 12px',
            borderRadius: 999,
            background: meta.background,
            color: meta.color,
            fontSize: '0.72rem',
            fontWeight: 700,
            lineHeight: 1.1,
            whiteSpace: 'nowrap'
        }}
    >
        {meta.label}
    </span>
);

const SummaryCard = ({ title, value, note, icon: Icon }) => (
    <div className="summary-card">
        <div className="summary-icon-wrap">
            <Icon size={24} />
        </div>
        <div className="summary-content">
            <div className="summary-title">{title}</div>
            <div className="summary-value">{value}</div>
            <div className="summary-note">{note}</div>
        </div>
    </div>
);

const SectionCard = ({ title, icon: Icon, children, action }) => (
    <section className="dashboard-card">
        <div className="card-header">
            <div className="header-left">
                {Icon && <Icon size={18} className="header-icon" />}
                <h3 className="card-title">{title}</h3>
            </div>
            {action}
        </div>
        <div className="card-body">{children}</div>
    </section>
);

const EmptyState = ({ message }) => (
    <div
        style={{
            minHeight: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.92rem'
        }}
    >
        {message}
    </div>
);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = async ({ silent = false } = {}) => {
        if (!hasClientSession(['admin'])) {
            navigate('/login');
            return;
        }

        if (!silent) setLoading(true);

        try {
            const { data: dashboardData } = await fetchDashboard();
            setData(dashboardData);
            setError('');
        } catch (err) {
            if (err.response?.status === 401) {
                navigate('/login');
                return;
            }

            if (!silent) {
                setError('Failed to load dashboard data.');
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, [navigate]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadDashboard({ silent: true });
            }
        }, LIVE_REFRESH_MS);

        return () => window.clearInterval(intervalId);
    }, [navigate]);

    if (loading && !data) {
        return (
            <ERPLayout title="Dashboard">
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '60vh',
                        color: '#64748b'
                    }}
                >
                    <Loader2 className="spin" size={38} style={{ marginBottom: 16 }} />
                    <p>Fetching latest school insights...</p>
                </div>
            </ERPLayout>
        );
    }

    const weeklyAttendance = data?.weeklyAttendance || {
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
        presentRate: 0
    };
    const ringValue = Math.max(0, Math.min(weeklyAttendance.presentRate || 0, 100));
    const activitySummary = data?.activitySummary || { online: 0, offline: 0, inactive: 0 };
    const activityThresholds = data?.activityThresholds || { onlineMinutes: 5, inactiveDays: 7 };
    const summaryCards = [
        {
            title: 'Total Students',
            value: data?.totalStudents ?? 0,
            note: 'enrolled',
            icon: GraduationCap
        },
        {
            title: 'Active Batches',
            value: data?.activeBatches ?? 0,
            note: 'currently running',
            icon: BookOpen
        },
        {
            title: 'Total Teachers',
            value: data?.totalTeachers ?? 0,
            note: 'across batches',
            icon: Users2
        },
        {
            title: 'Fees Collected',
            value: formatCurrency(data?.totalFeesPaid ?? 0),
            note: 'collected so far',
            icon: IndianRupee
        },
        {
            title: 'Students Online',
            value: activitySummary.online,
            note: `active in ${activityThresholds.onlineMinutes}m`,
            icon: Activity
        },
        {
            title: 'Students Offline',
            value: activitySummary.offline,
            note: `seen in ${activityThresholds.inactiveDays}d`,
            icon: WifiOff
        },
        {
            title: 'Students Inactive',
            value: activitySummary.inactive,
            note: `no open in ${activityThresholds.inactiveDays}d`,
            icon: AlertTriangle
        }
    ];

    return (
        <ERPLayout title="Dashboard">
            <style>{`
                .dashboard-container {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    padding: 10px 0;
                }

                .salary-banner {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    background: #fff;
                    border: 1px solid #fecaca;
                    border-left: 4px solid #ef4444;
                    padding: 16px 20px;
                    border-radius: 12px;
                    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
                }

                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 20px;
                }

                .summary-card {
                    background: #ffffff;
                    border: 1px solid #dbe3f2;
                    border-radius: 14px;
                    padding: 26px 22px;
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    min-height: 154px;
                    box-shadow: 0 12px 30px rgba(37, 99, 235, 0.05);
                }

                .summary-icon-wrap {
                    width: 42px;
                    height: 42px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 12px;
                    color: #5b5ce2;
                    background: linear-gradient(180deg, #f5f3ff 0%, #eef2ff 100%);
                    flex-shrink: 0;
                }

                .summary-content {
                    min-width: 0;
                }

                .summary-title {
                    font-size: 0.98rem;
                    font-weight: 700;
                    color: #25324a;
                    margin-bottom: 10px;
                }

                .summary-value {
                    font-family: 'Outfit', sans-serif;
                    font-size: 2.15rem;
                    font-weight: 800;
                    line-height: 1;
                    color: #1f2d4d;
                    margin-bottom: 10px;
                    word-break: break-word;
                }

                .summary-note {
                    font-size: 0.9rem;
                    color: #42526e;
                    line-height: 1.35;
                }

                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 24px;
                }

                .dashboard-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                }

                .card-header {
                    padding: 18px 24px;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                }

                .header-icon {
                    color: #64748b;
                    flex-shrink: 0;
                }

                .card-title {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 700;
                    color: #1e293b;
                }

                .card-body {
                    padding: 24px;
                    flex: 1;
                }

                .attendance-flex {
                    display: flex;
                    align-items: center;
                    gap: 32px;
                }

                .ring-wrapper {
                    position: relative;
                    width: 112px;
                    height: 112px;
                    flex-shrink: 0;
                }

                .attendance-stats-list {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 20px;
                    flex: 1;
                }

                .stat-box {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .stat-box .label {
                    font-size: 0.75rem;
                    color: #64748b;
                    text-transform: uppercase;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                }

                .stat-box .value {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.55rem;
                    font-weight: 800;
                    color: #0f172a;
                }

                .data-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .data-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #f8fafc;
                }

                .data-item:last-child {
                    border-bottom: none;
                    padding-bottom: 0;
                }

                .data-info {
                    min-width: 0;
                }

                .data-info .main-text {
                    font-weight: 700;
                    color: #1e293b;
                    font-size: 0.96rem;
                    line-height: 1.35;
                }

                .data-info .sub-text {
                    font-size: 0.84rem;
                    color: #64748b;
                    margin-top: 4px;
                    line-height: 1.4;
                }

                .text-btn {
                    border: none;
                    background: none;
                    color: #3b82f6;
                    font-size: 0.85rem;
                    font-weight: 700;
                    cursor: pointer;
                    padding: 4px 0;
                }

                .text-btn:hover {
                    color: #1d4ed8;
                }

                @media (max-width: 1280px) {
                    .summary-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }

                @media (max-width: 1024px) {
                    .dashboard-grid {
                        grid-template-columns: 1fr;
                    }

                    .summary-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }

                @media (max-width: 768px) {
                    .salary-banner {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .attendance-flex {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .attendance-stats-list {
                        grid-template-columns: 1fr;
                    }

                    .data-item {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                }

                @media (max-width: 640px) {
                    .summary-grid {
                        grid-template-columns: 1fr;
                    }

                    .summary-card {
                        min-height: 0;
                    }

                    .card-header,
                    .card-body {
                        padding-left: 18px;
                        padding-right: 18px;
                    }
                }
            `}</style>

            <div className="dashboard-container">
                {data?.pendingSalaryAlert?.count > 0 && (
                    <div className="salary-banner">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <AlertCircle color="#ef4444" size={20} />
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                {data.pendingSalaryAlert.count} faculty {data.pendingSalaryAlert.count === 1 ? 'salary is' : 'salaries are'} pending for {data.pendingSalaryAlert.monthLabel}
                            </span>
                        </div>
                        <button className="text-btn" onClick={() => navigate('/payroll')}>
                            Process now
                        </button>
                    </div>
                )}

                {error && (
                    <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <div className="summary-grid">
                    {summaryCards.map((card) => (
                        <SummaryCard
                            key={card.title}
                            title={card.title}
                            value={card.value}
                            note={card.note}
                            icon={card.icon}
                        />
                    ))}
                </div>

                <div className="dashboard-grid">
                    <SectionCard
                        title="Weekly Attendance"
                        icon={Users}
                        action={<button className="text-btn" onClick={() => navigate('/attendance')}>Full report</button>}
                    >
                        <div className="attendance-flex">
                            <div className="ring-wrapper">
                                <div
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '50%',
                                        background: `conic-gradient(#3b82f6 0 ${ringValue}%, #e2e8f0 ${ringValue}% 100%)`
                                    }}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 10,
                                        background: '#fff',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 800 }}>
                                        {ringValue}%
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>present</span>
                                </div>
                            </div>

                            <div className="attendance-stats-list">
                                <div className="stat-box">
                                    <span className="label">Present</span>
                                    <span className="value">{weeklyAttendance.present}</span>
                                </div>
                                <div className="stat-box">
                                    <span className="label">Absent</span>
                                    <span className="value" style={{ color: '#dc2626' }}>{weeklyAttendance.absent}</span>
                                </div>
                                <div className="stat-box">
                                    <span className="label">Late</span>
                                    <span className="value" style={{ color: '#d97706' }}>{weeklyAttendance.late}</span>
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard title="Attendance Trend" icon={PieChart}>
                        {(data?.monthlyAttendanceTrend || []).length === 0 ? (
                            <EmptyState message="No attendance trend available yet." />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {(data?.monthlyAttendanceTrend || []).map((item, index, list) => {
                                    const fillColor = index === list.length - 1
                                        ? '#2563eb'
                                        : index >= list.length - 3
                                            ? '#3b82f6'
                                            : '#93c5fd';

                                    return (
                                        <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ width: 38, fontSize: '0.82rem', fontWeight: 700 }}>{item.label}</span>
                                            <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                                                <div
                                                    style={{
                                                        width: `${item.percentage}%`,
                                                        height: '100%',
                                                        background: fillColor,
                                                        borderRadius: 999
                                                    }}
                                                />
                                            </div>
                                            <span style={{ fontSize: '0.82rem', width: 40, textAlign: 'right' }}>{item.percentage}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard
                        title="Recent Collections"
                        icon={CreditCard}
                        action={<button className="text-btn" onClick={() => navigate('/fees')}>View all</button>}
                    >
                        {(data?.recentFeeActivity || []).length === 0 ? (
                            <EmptyState message="No recent fee activity yet." />
                        ) : (
                            <div className="data-list">
                                {(data?.recentFeeActivity || []).slice(0, 5).map((item) => (
                                    <div className="data-item" key={item._id}>
                                        <div className="data-info">
                                            <div className="main-text">{item.studentName}</div>
                                            <div className="sub-text">
                                                {[item.batchName, item.className].filter(Boolean).join(' - ') || 'Student fee record'}
                                            </div>
                                            <div className="sub-text">
                                                {formatCurrency(item.amountPaid || item.totalFee)} - {formatShortDate(item.activityAt)}
                                            </div>
                                        </div>
                                        <StatusPill meta={feeStatusMeta[item.status] || feeStatusMeta.pending} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard
                        title="Upcoming Exams"
                        icon={Calendar}
                        action={<button className="text-btn" onClick={() => navigate('/exams')}>Manage</button>}
                    >
                        {(data?.upcomingExams || []).length === 0 ? (
                            <EmptyState message="No upcoming or recent exams available." />
                        ) : (
                            <div className="data-list">
                                {(data?.upcomingExams || []).slice(0, 5).map((item) => (
                                    <div className="data-item" key={item._id}>
                                        <div className="data-info">
                                            <div className="main-text">
                                                {[item.subject, item.name].filter(Boolean).join(' - ') || 'Untitled exam'}
                                            </div>
                                            <div className="sub-text">
                                                {[item.batchName || 'All batches', formatShortDate(item.date)].join(' - ')}
                                            </div>
                                        </div>
                                        <StatusPill meta={examStatusMeta[item.status] || examStatusMeta.scheduled} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                </div>
            </div>
        </ERPLayout>
    );
};

export default AdminDashboard;
