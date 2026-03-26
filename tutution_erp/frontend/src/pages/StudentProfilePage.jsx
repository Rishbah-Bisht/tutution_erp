import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowUpRight,
    BookOpen,
    BrainCircuit,
    Calendar,
    ChevronLeft,
    Clock,
    CheckCircle2,
    DownloadCloud,
    FileText,
    GraduationCap,
    Hash,
    History,
    IndianRupee,
    Loader2,
    LogIn,
    Mail,
    MapPin,
    Phone,
    RefreshCcw,
    ShieldCheck,
    Target,
    TrendingUp,
    User,
    UserCircle2,
    Wallet,
    BadgeCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import ERPLayout from '../components/ERPLayout';
import { API_BASE_URL } from '../api/apiConfig';
import apiClient from '../api/apiConfig';

const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '- ';
const formatDateTime = (value) => value ? new Date(value).toLocaleString('en-IN') : '- ';
const ACTIVITY_STYLE = {
    online: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    offline: 'bg-slate-100 text-slate-700 border border-slate-200',
    inactive: 'bg-amber-50 text-amber-700 border border-amber-200'
};
const LIVE_REFRESH_MS = 30000;
const countValidDeviceTokens = (deviceTokens = []) =>
    Array.isArray(deviceTokens)
        ? deviceTokens.filter((token) => typeof token === 'string' && token.trim().length > 10).length
        : 0;

const StudentProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('financial');
    const [performance, setPerformance] = useState(null);
    const [performanceLoading, setPerformanceLoading] = useState(false);

    const loadProfile = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setLoading(true);
        try {
            const response = await apiClient.get(`/students/${id}`);
            setData(response.data);
        } catch (error) {
            console.error('[StudentProfilePage.loadProfile]', error);
            navigate('/students');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [id, navigate]);

    const loadPerformance = useCallback(async () => {
        setPerformanceLoading(true);
        try {
            const response = await apiClient.get(`/exams/student/${id}/performance`);
            setPerformance(response.data);
        } catch (error) {
            console.error('[StudentProfilePage.loadPerformance]', error);
        } finally {
            setPerformanceLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadProfile();
        loadPerformance();
    }, [loadProfile, loadPerformance]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadProfile({ silent: true });
            }
        }, LIVE_REFRESH_MS);

        return () => window.clearInterval(intervalId);
    }, [loadProfile]);

    const onDownloadID = (student) => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85, 54] });

        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 85, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('STUDENT IDENTITY CARD', 42.5, 10, { align: 'center' });

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.text(student.name.toUpperCase(), 35, 25);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Roll No: ${student.rollNo}`, 35, 30);
        doc.text(`Course: ${student.className || 'N/A'}`, 35, 34);
        doc.text(`Batch: ${student.batchId?.name || 'N/A'}`, 35, 38);
        doc.text(`Contact: ${student.contact || 'N/A'}`, 35, 42);

        doc.setFillColor(248, 250, 252);
        doc.rect(0, 48, 85, 6, 'F');
        doc.setTextColor(100);
        doc.setFontSize(6);
        doc.text('Valid for current academic session', 42.5, 52, { align: 'center' });
        doc.save(`${student.name}_ID_Card.pdf`);
    };

    if (loading) {
        return (
            <ERPLayout title="Student Profile">
                <div className="p-20 flex flex-col items-center gap-4 text-slate-400">
                    <Loader2 className="spin" size={40} />
                    <p className="font-medium">Loading student profile...</p>
                </div>
            </ERPLayout>
        );
    }

    if (!data) return null;

    const { student, fees = [] } = data;
    const portalAccess = student.portalAccess || {};
    const activity = student.activity || {};
    const activityStatus = activity.status || 'inactive';
    const activityBadge = ACTIVITY_STYLE[activityStatus] || ACTIVITY_STYLE.offline;
    const lastSeen = activity.lastActiveAt || activity.lastAppOpenAt || portalAccess.lastLoginAt || null;
    const deviceLabel = activity.device?.platform || student.lastDevice?.platform || '- ';
    const pushDeviceCount = countValidDeviceTokens(student.deviceTokens);
    const signupCompleted = portalAccess.signupStatus === 'yes';
    const totalDues = fees
        .filter((fee) => !fee.isDeleted && fee.status !== 'paid')
        .reduce((sum, fee) => sum + (fee.totalFee - (fee.amountPaid || 0)), 0);
    const performanceStats = performance?.stats || {};
    const attendanceSummary = student.attendanceSummary || {};
    const attendanceValue = attendanceSummary.total > 0 ? `${attendanceSummary.percentage}%` : '--';
    const chapterEntries = Object.entries(performance?.chapters || {});

    return (
        <ERPLayout title={`Profile: ${student.name}`}>
            <style>{`
                .student-profile-grid { display: grid; grid-template-columns: minmax(280px, 340px) minmax(0, 1fr); gap: 24px; }
                .student-profile-card { background: #fff; border: 1px solid #e2e8f0; border-radius: var(--radius-md); box-shadow: 0 16px 40px -28px rgba(15, 23, 42, 0.25); }
                .student-profile-soft { background: linear-gradient(180deg, rgba(248,250,252,0.95), #ffffff); }
                .student-stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
                .student-tab-row { display: inline-flex; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: var(--radius-md); }
                .student-tab { border: none; background: transparent; color: #64748b; padding: 10px 16px; border-radius: var(--radius-md); font-weight: 800; font-size: 0.76rem; cursor: pointer; text-transform: uppercase; letter-spacing: 0.06em; }
                .student-tab.active { background: #0f172a; color: #fff; }
                .student-badge { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: var(--radius-md); font-size: 0.76rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
                .student-data-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
                @media (max-width: 1180px) {
                    .student-profile-grid { grid-template-columns: 1fr; }
                    .student-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                }
                @media (max-width: 768px) {
                    .student-stat-grid { grid-template-columns: 1fr; }
                    .student-data-grid { grid-template-columns: 1fr; }
                    .student-header-actions { width: 100%; }
                    .student-header-actions button { width: 100%; }
                }
            `}</style>

            <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
                <Link to="/students" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold transition-colors">
                    <ChevronLeft size={20} /> Back to Directory
                </Link>
                <div className="student-header-actions flex items-center gap-3 flex-wrap">
                    <span className={`student-badge ${signupCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        <ShieldCheck size={14} /> Signup: {signupCompleted ? 'Yes' : 'No'}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            loadProfile();
                            loadPerformance();
                        }}
                        className="btn btn-outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                        <RefreshCcw size={16} className={loading || performanceLoading ? 'spin' : ''} /> Refresh Activity
                    </button>
                    <button onClick={() => onDownloadID(student)} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <DownloadCloud size={16} /> Download ID Card
                    </button>
                </div>
            </div>

            <div className="student-profile-grid">
                <aside className="space-y-6">
                    <div className="student-profile-card student-profile-soft p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-28 h-28 rounded-md bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center mb-5">
                                {student.profileImage ? (
                                    <img src={student.profileImage.startsWith('http') ? student.profileImage : `${API_BASE_URL}${student.profileImage}`} className="w-full h-full object-cover" alt={student.name} />
                                ) : (
                                    <UserCircle2 size={64} className="text-slate-300" />
                                )}
                            </div>
                            <h1 className="text-2xl font-black text-slate-900">{student.name}</h1>
                            <div className="mt-2 inline-flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-[0.24em]">
                                <Hash size={12} className="text-blue-500" /> {student.rollNo}
                            </div>
                            <div className="flex flex-wrap justify-center gap-2 mt-5">
                                <span className={`student-badge ${student.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                    <BadgeCheck size={14} /> {student.status || 'Unknown'}
                                </span>
                                <span className={`student-badge ${signupCompleted ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                                    <LogIn size={14} /> Portal {signupCompleted ? 'Activated' : 'Pending'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="student-profile-card p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <BookOpen size={18} className="text-blue-500" />
                            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-800">Enrollment Hub</h2>
                        </div>
                        <div className="space-y-4">
                            <SidebarRow label="Class / Course" value={student.className || 'General'} />
                            <SidebarRow label="Active Batch" value={student.batchId?.name || 'Unassigned'} />
                            <SidebarRow label="Academic Session" value={student.session || '- '} />
                            <SidebarRow label="Current Year" value={student.currentYear || '1'} />
                            <SidebarRow label="Admission Date" value={formatDate(student.admissionDate || student.joinedAt)} />
                        </div>
                    </div>

                    <div className="student-profile-card p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <ShieldCheck size={18} className="text-emerald-500" />
                            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-800">Portal Access</h2>
                        </div>
                        <div className="space-y-4">
                            <SidebarRow label="Signup Status" value={signupCompleted ? 'Yes' : 'No'} />
                            <SidebarRow label="Signed Up At" value={formatDateTime(portalAccess.signedUpAt)} />
                            <SidebarRow label="Last Login" value={formatDateTime(portalAccess.lastLoginAt)} />
                            <SidebarRow label="Email" value={student.email || '- '} />
                            <SidebarRow label="Contact Number" value={student.contact || '- '} />
                        </div>
                    </div>

                    <div className="student-profile-card p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <LogIn size={18} className="text-indigo-500" />
                            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-800">Mobile App Activity</h2>
                        </div>
                        <div className="space-y-4">
                            <SidebarRow label="Last Opened" value={formatDateTime(lastSeen)} />
                            <SidebarRow label="Device" value={deviceLabel} />
                            <SidebarRow label="Push Ready" value={pushDeviceCount > 0 ? `Yes (${pushDeviceCount} device${pushDeviceCount > 1 ? 's' : ''})` : 'No'} />
                            <div>
                                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Status</div>
                                <span className={`student-badge ${activityBadge}`}>
                                    {activityStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                </aside>

                <section className="space-y-6">
                    <div className="student-stat-grid">
                        <StatCard icon={Wallet} label="Monthly Fee" value={formatCurrency(student.fees)} tone="indigo" />
                        <StatCard icon={ShieldCheck} label="Fees Paid" value={formatCurrency(student.feesPaid)} tone="emerald" />
                        <StatCard icon={IndianRupee} label="Current Due" value={formatCurrency(totalDues)} tone="rose" />
                        <StatCard icon={CheckCircle2} label="Attendance (MTD)" value={attendanceValue} tone="amber" />
                    </div>

                    <div className="student-profile-card p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 mb-2">Student Profile</p>
                                <h2 className="text-2xl font-black text-slate-900">Academic and portal overview</h2>
                                <p className="text-slate-500 mt-2">Track financial standing, profile details, exam performance, and whether the student has completed signup.</p>
                            </div>
                            <div className="student-tab-row">
                                <button type="button" className={`student-tab ${activeTab === 'financial' ? 'active' : ''}`} onClick={() => setActiveTab('financial')}>Financial</button>
                                <button type="button" className={`student-tab ${activeTab === 'exams' ? 'active' : ''}`} onClick={() => setActiveTab('exams')}>Exams</button>
                            </div>
                        </div>

                        {activeTab === 'financial' ? (
                            <div className="space-y-6">
                                <div className="student-data-grid">
                                    <InfoTile icon={Calendar} label="Date of Birth" value={formatDate(student.dob)} />
                                    <InfoTile icon={User} label="Gender" value={student.gender || '- '} />
                                    <InfoTile icon={Mail} label="Email Address" value={student.email || '- '} />
                                    <InfoTile icon={Phone} label="Contact Number" value={student.contact || '- '} />
                                    <InfoTile icon={User} label="Father's Name" value={student.fatherName || '- '} />
                                    <InfoTile icon={User} label="Mother's Name" value={student.motherName || '- '} />
                                    <InfoTile icon={IndianRupee} label="Registration Fee" value={formatCurrency(student.registrationFee)} />
                                    <InfoTile icon={MapPin} label="Address" value={student.address || '- '} wide />
                                </div>

                                <div className="border border-slate-200 rounded-md overflow-hidden">
                                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-2 text-slate-800">
                                            <FileText size={18} className="text-blue-500" />
                                            <h3 className="text-sm font-black uppercase tracking-[0.18em]">Fee Ledger</h3>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500">{fees.length} record(s)</span>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="erp-table stackable">
                                            <thead>
                                                <tr>
                                                    <th>Month</th>
                                                    <th>Total Fee</th>
                                                    <th>Paid</th>
                                                    <th>Due Date</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {fees.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>
                                                            No fee records available.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    fees.map((fee) => (
                                                        <tr key={fee._id}>
                                                            <td data-label="Month">{fee.month} {fee.year}</td>
                                                            <td data-label="Total Fee">{formatCurrency(fee.totalFee)}</td>
                                                            <td data-label="Paid">{formatCurrency(fee.amountPaid)}</td>
                                                            <td data-label="Due Date">{formatDate(fee.dueDate)}</td>
                                                            <td data-label="Status">
                                                                <span className={`student-badge ${fee.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : fee.status === 'partial' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                                                    {fee.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="student-stat-grid">
                                    <StatCard icon={Target} label="Average Score" value={`${performanceStats.avgScore || 0}%`} tone="blue" compact />
                                    <StatCard icon={TrendingUp} label="Improvement" value={`${performanceStats.improvement || 0}%`} tone={Number(performanceStats.improvement || 0) >= 0 ? 'emerald' : 'rose'} compact />
                                    <StatCard icon={History} label="Tests Taken" value={`${performanceStats.totalTests || 0}`} tone="slate" compact />
                                    <StatCard icon={Clock} label="Lowest Score" value={`${performanceStats.lowestScore || 0}%`} tone="amber" compact />
                                </div>

                                <div className="student-data-grid">
                                    <div className="student-profile-card p-5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <BrainCircuit size={18} className="text-blue-500" />
                                            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-800">Performance Insight</h3>
                                        </div>
                                        <p className="text-sm leading-6 text-slate-600">{performance?.suggestion || 'No performance insights available yet.'}</p>
                                    </div>

                                    <div className="student-profile-card p-5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <GraduationCap size={18} className="text-emerald-500" />
                                            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-800">Chapter Strength</h3>
                                        </div>
                                        {performanceLoading ? (
                                            <div className="flex items-center gap-2 text-slate-500"><Loader2 size={16} className="spin" /> Loading chapter analysis...</div>
                                        ) : chapterEntries.length === 0 ? (
                                            <p className="text-sm text-slate-500">No chapter analysis available.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {chapterEntries.map(([chapter, details]) => (
                                                    <div key={chapter} className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-4 py-3">
                                                        <div>
                                                            <div className="font-bold text-slate-800">{chapter}</div>
                                                            <div className="text-xs text-slate-500 mt-1">Average: {details.score}%</div>
                                                        </div>
                                                        <span className={`student-badge ${details.status === 'Strong' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : details.status === 'Average' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                                            {details.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-md overflow-hidden">
                                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-slate-800">
                                        <History size={18} className="text-indigo-500" />
                                        <h3 className="text-sm font-black uppercase tracking-[0.18em]">Exam History</h3>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="erp-table stackable">
                                            <thead>
                                                <tr>
                                                    <th>Test</th>
                                                    <th>Subject</th>
                                                    <th>Score</th>
                                                    <th>Date</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {performanceLoading ? (
                                                    <tr>
                                                        <td colSpan="5" style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>
                                                            <Loader2 size={18} className="spin" style={{ marginRight: 8 }} /> Loading exam history...
                                                        </td>
                                                    </tr>
                                                ) : !performance?.history?.length ? (
                                                    <tr>
                                                        <td colSpan="5" style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>
                                                            No exam results available.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    performance.history.slice().reverse().map((entry, index) => (
                                                        <tr key={`${entry.testName}-${index}`}>
                                                            <td data-label="Test">{entry.testName}</td>
                                                            <td data-label="Subject">{entry.subject}{entry.chapter ? ` / ${entry.chapter}` : ''}</td>
                                                            <td data-label="Score">{entry.percentage.toFixed(1)}% ({entry.marks}/{entry.maxMarks})</td>
                                                            <td data-label="Date">{formatDate(entry.date)}</td>
                                                            <td data-label="Status">
                                                                <span className={`student-badge ${entry.isPresent ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                                                    {entry.isPresent ? 'Appeared' : 'Absent'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </ERPLayout>
    );
};

const SidebarRow = ({ label, value }) => (
    <div>
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</div>
        <div className="text-sm font-bold text-slate-800 flex items-center gap-2">{value} {label === 'Active Batch' && value !== 'Unassigned' ? <ArrowUpRight size={14} className="text-blue-500" /> : null}</div>
    </div>
);

const toneStyles = {
    indigo: { icon: 'bg-indigo-50 text-indigo-600', text: 'text-indigo-950' },
    emerald: { icon: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-950' },
    rose: { icon: 'bg-rose-50 text-rose-600', text: 'text-rose-950' },
    amber: { icon: 'bg-amber-50 text-amber-600', text: 'text-amber-950' },
    blue: { icon: 'bg-sky-50 text-sky-600', text: 'text-sky-950' },
    slate: { icon: 'bg-slate-100 text-slate-600', text: 'text-slate-950' }
};

const StatCard = ({ icon: Icon, label, value, tone = 'slate', compact = false }) => {
    const style = toneStyles[tone] || toneStyles.slate;

    return (
        <div className="student-profile-card p-5">
            <div className={`w-11 h-11 rounded-md flex items-center justify-center ${style.icon}`}>
                <Icon size={20} />
            </div>
            <div className={`mt-4 text-2xl font-black ${style.text}`}>{value}</div>
            <div className={`mt-1 text-[11px] font-black uppercase tracking-[0.18em] ${compact ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
        </div>
    );
};

const InfoTile = ({ icon: Icon, label, value, wide = false }) => (
    <div className={`rounded-md border border-slate-200 bg-slate-50/60 p-4 ${wide ? 'md:col-span-2' : ''}`}>
        <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Icon size={16} />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">{label}</span>
        </div>
        <div className="text-sm font-bold text-slate-800 leading-6">{value}</div>
    </div>
);

export default StudentProfilePage;
