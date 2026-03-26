import React from 'react';
import { User, Eye, Pencil, Search, UserCheck, UserX, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonTable } from '../common/SkeletonLoaders';

const formatDateTime = (value) => value ? new Date(value).toLocaleString('en-IN') : '—';
const countValidDeviceTokens = (deviceTokens = []) =>
    Array.isArray(deviceTokens)
        ? deviceTokens.filter((token) => typeof token === 'string' && token.trim().length > 10).length
        : 0;

const ACTIVITY_BADGES = {
    online: { bg: '#ecfdf3', color: '#16a34a', border: '#bbf7d0', label: 'Online' },
    offline: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', label: 'Offline' },
    inactive: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', label: 'Inactive' }
};

const StudentTable = ({
    students,
    loading,
    onEdit,
    onToggleStatus,
    page,
    setPage,
    totalPages,
    total
}) => {
    const navigate = useNavigate();

    if (loading && page === 1) {
        return <SkeletonTable rows={10} />;
    }

    if (students.length === 0) {
        return (
            <div className="empty">
                <div className="empty-icon">
                    <Search size={40} strokeWidth={1.2} color="var(--erp-muted)" />
                </div>
                <p style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 6 }}>
                    No records found
                </p>
                <p className="td-sm" style={{ maxWidth: "280px", margin: "0 auto" }}>
                    Try adjusting your search criteria or filters to find what you're looking for.
                </p>
            </div>
        );
    }

    return (
        <div className="erp-table-wrap">
            <table className="erp-table stackable w-full">
                <thead>
                    <tr>
                        <th className="!pl-6">Student Profile</th>
                        <th>Batch Details</th>
                        <th>App Activity</th>
                        <th>Status</th>
                        <th>Fee Status</th>
                        <th>Attendance</th>
                        <th className="text-right !pr-6">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map(s => {
                        const activity = s.activity || {};
                        const status = activity.status || 'inactive';
                        const badge = ACTIVITY_BADGES[status] || ACTIVITY_BADGES.offline;
                        const lastSeen = activity.lastActiveAt || activity.lastAppOpenAt || s.portalAccess?.lastLoginAt || null;
                        const deviceLabel = activity.device?.platform || s.lastDevice?.platform || 'Unknown';
                        const pushDeviceCount = s.pushStatus?.deviceTokenCount ?? countValidDeviceTokens(s.deviceTokens);
                        const attendance = s.attendanceSummary || {};
                        const attendanceTotal = attendance.total || 0;
                        const attendancePercent = Number.isFinite(attendance.percentage) ? attendance.percentage : 0;
                        const attendanceLabel = attendanceTotal > 0 ? `${attendancePercent}%` : '--';
                        const attendanceMeta = attendanceTotal > 0 ? `${attendance.present || 0}/${attendanceTotal}` : 'No data';

                        return (
                        <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                            <td data-label="Student Profile" className="!pl-6">
                                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate(`/students/${s._id}`)}>
                                    <div className="w-10 h-10 rounded-sm bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border">
                                        {s.profileImage ? (
                                            <img 
                                                src={s.profileImage} 
                                                alt="" 
                                                className="w-full h-full object-cover" 
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = ''; 
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.innerHTML = '<div class="text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
                                                }}
                                            />
                                        ) : (
                                            <User size={20} />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{s.name}</div>
                                        <div className="text-xs text-slate-400 font-medium">#{s.rollNo}</div>
                                    </div>
                                </div>
                            </td>
                            <td data-label="Batch Details">
                                <div className="text-sm font-semibold text-slate-700">{s.batchId?.name || 'Unassigned'}</div>
                            </td>
                            <td data-label="App Activity">
                                <div className="text-xs font-semibold text-slate-700">{formatDateTime(lastSeen)}</div>
                                <div className="text-[10px] text-slate-500 mt-1">Device: {deviceLabel}</div>
                                <div className="text-[10px] text-slate-500 mt-1">
                                    Push: {pushDeviceCount > 0 ? `Ready (${pushDeviceCount})` : 'Not Linked'}
                                </div>
                                <div style={{ marginTop: 6 }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '2px', fontSize: '10px', fontWeight: 800,
                                        background: badge.bg,
                                        color: badge.color,
                                        textTransform: 'uppercase',
                                        border: `1px solid ${badge.border}`
                                    }}>
                                        {badge.label}
                                    </span>
                                </div>
                            </td>
                            <td data-label="Status">
                                <div style={{ marginTop: 4 }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '2px', fontSize: '10px', fontWeight: 800,
                                        background: s.status === 'active' ? '#f0fff4' : s.status === 'batch_pending' ? '#fffbeb' : '#fef2f2',
                                        color: s.status === 'active' ? '#16a34a' : s.status === 'batch_pending' ? '#d97706' : '#dc2626',
                                        textTransform: 'uppercase',
                                        border: s.status === 'active' ? '1px solid #bbf7d0' : s.status === 'batch_pending' ? '1px solid #fde68a' : '1px solid #fecaca'
                                    }}>
                                        {s.status === 'batch_pending' ? 'Batch Pending' : s.status}
                                    </span>
                                </div>
                            </td>
                            <td data-label="Fee Status">
                                <div className="text-sm font-bold text-slate-700">₹ {(s.feesPaid || 0).toLocaleString()}</div>
                                <div className="w-24 h-1.5 bg-slate-100 rounded-sm mt-1.5 overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, ((s.feesPaid || 0) / (s.fees || 1)) * 100)}%` }}></div>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">Total: ₹ {(s.fees || 0).toLocaleString()}</div>
                            </td>
                            <td data-label="Attendance">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-slate-700">{attendanceLabel}</span>
                                    <span className="text-[10px] text-slate-400 font-semibold">{attendanceMeta}</span>
                                </div>
                            </td>
                            <td data-label="Actions" className="text-right !pr-6">
                                <div className="flex justify-end gap-1">
                                    <button className="btn btn-ghost btn-outline btn-sm !text-blue-600" title="View Profile" onClick={() => navigate(`/students/${s._id}`)}>
                                        <Eye size={13} />
                                    </button>

                                    <button className="btn btn-ghost btn-outline btn-sm !text-slate-600" title="Edit" onClick={() => onEdit(s)}>
                                        <Pencil size={15} />
                                    </button>
                                    <button className={`btn btn-ghost btn-outline btn-sm ${s.status === 'active' ? '!text-rose-500 hover:bg-rose-50' : '!text-indigo-600 hover:bg-indigo-50'}`}
                                        title={s.status === 'active' ? "Deactivate Student" : "Activate Student"}
                                        onClick={() => onToggleStatus(s)}>
                                        {s.status === 'active' ? <UserX size={15} /> : <UserCheck size={15} />}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                    })}
                </tbody>
            </table>

            {students.length > 0 && (
                <div style={{ marginTop: 20, marginBottom: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="text-sm text-slate-500 font-medium">Showing {students.length} of {total} records</div>
                    {page < totalPages && (
                        <button className="btn btn-outline" disabled={loading} onClick={() => setPage(p => p + 1)}>
                            {loading ? <><Loader2 size={16} className="spin" /> Loading...</> : 'Load More'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentTable;
