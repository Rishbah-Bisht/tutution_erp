import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import ERPLayout from '../components/ERPLayout';
import { Bell, RefreshCw, Filter, Send, Mail, CheckCircle, Clock, AlertTriangle, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { API_BASE_URL } from '../api/apiConfig';
import NotificationModal from '../components/notifications/NotificationModal';

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const NotificationHistoryPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({ status: '', type: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toasts, setToasts] = useState([]);

    const addToast = (msg, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API().get('/notifications/history', {
                params: { page, ...filters }
            });
            setNotifications(res.data.notifications);
            setTotalPages(res.data.pages);
        } catch (err) {
            console.error('Failed to fetch notification history:', err);
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const getStatusStyles = (status) => {
        switch (status) {
            case 'sent': return { bg: '#ecfdf5', color: '#059669', icon: <CheckCircle size={14} /> };
            case 'pending': return { bg: '#fff7ed', color: '#d97706', icon: <Clock size={14} /> };
            case 'failed': return { bg: '#fef2f2', color: '#dc2626', icon: <AlertTriangle size={14} /> };
            default: return { bg: '#f8fafc', color: '#64748b', icon: <RefreshCw size={14} /> };
        }
    };

    return (
        <ERPLayout title="Email Notification History">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* HEADER ACTIONS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <select
                            value={filters.status}
                            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                        >
                            <option value="">All Statuses</option>
                            <option value="sent">Sent</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </select>
                        <select
                            value={filters.type}
                            onChange={(e) => { setFilters({ ...filters, type: e.target.value }); setPage(1); }}
                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                        >
                            <option value="">All Types</option>
                            <option value="registration">Registration</option>
                            <option value="fee_generated">Fee Generated</option>
                            <option value="fee_reminder">Fee Reminder</option>
                            <option value="exam">Exam Announcement</option>
                            <option value="holiday">Holiday Notice</option>
                        </select>
                        <button onClick={fetchHistory} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff' }}>
                            <RefreshCw size={16} className={loading ? 'spin' : ''} />
                        </button>
                    </div>

                    <button
                        className="btn-primary"
                        onClick={() => setIsModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--erp-primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 800, cursor: 'pointer' }}
                    >
                        <Send size={16} /> SEND CUSTOM ALERT
                    </button>
                </div>

                {/* TABLE */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="erp-table">
                        <thead>
                            <tr>
                                <th>Recipient</th>
                                <th>Subject</th>
                                <th>Type</th>
                                <th>Queued At</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && notifications.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Loading history...</td></tr>
                            ) : notifications.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No notifications found.</td></tr>
                            ) : (
                                notifications.map(n => {
                                    const st = getStatusStyles(n.status);
                                    return (
                                        <tr key={n._id}>
                                            <td>
                                                <div style={{ fontWeight: 800, color: '#1e293b' }}>{n.recipientName}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{n.recipientEmail}</div>
                                            </td>
                                            <td><div style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.subject}</div></td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800,
                                                    background: '#f1f5f9', color: '#475569', textTransform: 'uppercase'
                                                }}>
                                                    {n.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>{new Date(n.createdAt).toLocaleString()}</td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 900,
                                                    background: st.bg, color: st.color, textTransform: 'uppercase'
                                                }}>
                                                    {st.icon} {n.status}
                                                </span>
                                                {n.status === 'failed' && n.lastError && (
                                                    <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#dc2626', maxWidth: 220, whiteSpace: 'normal', lineHeight: 1.3, fontWeight: 600 }}>
                                                        Reason: {n.lastError}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* PAGINATION */}
                    <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                disabled={page === 1 || loading}
                                onClick={() => setPage(p => p - 1)}
                                className="pag-btn"
                            ><ChevronLeft size={16} /></button>
                            <button
                                disabled={page === totalPages || loading}
                                onClick={() => setPage(p => p + 1)}
                                className="pag-btn"
                            ><ChevronRight size={16} /></button>
                        </div>
                    </div>
                </div>

            </div>

            {/* MODAL */}
            <NotificationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={(msg) => { addToast(msg); fetchHistory(); }}
            />

            {/* TOASTS */}
            <div className="toast-container" style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 9999 }}>
                {toasts.map(t => (
                    <div key={t.id} style={{
                        padding: '12px 24px', borderRadius: '4px', background: t.type === 'error' ? '#dc2626' : '#059669', color: '#fff',
                        display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 800, fontSize: '0.85rem'
                    }}>
                        {t.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
                        {t.msg}
                    </div>
                ))}
            </div>

            <style>{`
                .pag-btn {
                    padding: 8px; border: 1px solid #e2e8f0; background: #fff; border-radius: 4px; cursor: pointer; color: #64748b;
                }
                .pag-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </ERPLayout>
    );
};

export default NotificationHistoryPage;
