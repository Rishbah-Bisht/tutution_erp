import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import ERPLayout from '../components/ERPLayout';
import {
    Bell, RefreshCw, Filter, Send, Mail, CheckCircle, Clock,
    AlertTriangle, ChevronLeft, ChevronRight, Check, Search
} from 'lucide-react';
import apiClient from '../api/apiConfig';
import NotificationModal from '../components/notifications/NotificationModal';

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
            const res = await apiClient.get('/notifications/history', {
                params: { page, ...filters }
            });
            setNotifications(res.data.notifications || []);
            setTotalPages(res.data.pages || 1);
        } catch (err) {
            console.error('Failed to fetch notification history:', err);
            addToast("Failed to load history", "error");
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
        <ERPLayout title="Notification History">
            <div className="page-container">

                {/* RESPONSIVE HEADER */}
                <div className="header-section">
                    <div className="filter-group">
                        <select
                            className="mobile-full-width"
                            value={filters.status}
                            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
                        >
                            <option value="">All Statuses</option>
                            <option value="sent">Sent</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </select>
                        <select
                            className="mobile-full-width"
                            value={filters.type}
                            onChange={(e) => { setFilters({ ...filters, type: e.target.value }); setPage(1); }}
                        >
                            <option value="">All Types</option>
                            <option value="registration">Registration</option>
                            <option value="fee_generated">Fee Generated</option>
                            <option value="fee_reminder">Fee Reminder</option>
                        </select>
                        <button onClick={fetchHistory} className="refresh-btn">
                            <RefreshCw size={18} className={loading ? 'spin' : ''} />
                        </button>
                    </div>

                    <button className="send-btn" onClick={() => setIsModalOpen(true)}>
                        <Send size={18} /> <span>SEND ALERT</span>
                    </button>
                </div>

                {/* TABLE / MOBILE CARD VIEW */}
                <div className="content-card">
                    <div className="table-wrapper">
                        <table className="erp-table">
                            <thead>
                                <tr>
                                    <th>Recipient</th>
                                    <th>Subject</th>
                                    <th>Type</th>
                                    <th className="hide-mobile">Queued At</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && notifications.length === 0 ? (
                                    <tr><td colSpan="5" className="status-cell">Loading...</td></tr>
                                ) : notifications.length === 0 ? (
                                    <tr><td colSpan="5" className="status-cell">No notifications found.</td></tr>
                                ) : (
                                    notifications.map(n => {
                                        const st = getStatusStyles(n.status);
                                        return (
                                            <tr key={n._id}>
                                                <td>
                                                    <div className="recipient-name">{n.recipientName}</div>
                                                    <div className="recipient-email">{n.recipientEmail}</div>
                                                </td>
                                                <td><div className="truncate-text">{n.subject}</div></td>
                                                <td>
                                                    <span className="type-badge">
                                                        {n.type.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="hide-mobile">{new Date(n.createdAt).toLocaleDateString()}</td>
                                                <td>
                                                    <span className="status-badge" style={{ background: st.bg, color: st.color }}>
                                                        {st.icon} {n.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE-ONLY CARD VIEW (Alternative to Table if desired, 
                        or keep table with overflow: auto as implemented here) */}

                    {/* PAGINATION */}
                    <div className="pagination-footer">
                        <span className="page-info">
                            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                        </span>
                        <div className="pagination-controls">
                            <button
                                disabled={page === 1 || loading}
                                onClick={() => setPage(p => p - 1)}
                                className="pag-btn"
                            ><ChevronLeft size={20} /></button>
                            <button
                                disabled={page === totalPages || loading}
                                onClick={() => setPage(p => p + 1)}
                                className="pag-btn"
                            ><ChevronRight size={20} /></button>
                        </div>
                    </div>
                </div>
            </div>

            <NotificationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={(msg) => { addToast(msg); fetchHistory(); }}
            />

            {/* TOASTS */}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        {t.type === 'error' ? <AlertTriangle size={18} /> : <Check size={18} />}
                        {t.msg}
                    </div>
                ))}
            </div>

            <style>{`
                .page-container {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    padding: 10px;
                }

                .header-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .filter-group {
                    display: flex;
                    gap: 10px;
                    flex: 1;
                    min-width: 300px;
                }

                .filter-group select {
                    padding: 10px;
                    border-radius: 6px;
                    border: 1px solid #e2e8f0;
                    flex: 1;
                    font-size: 0.9rem;
                    background: white;
                }

                .refresh-btn {
                    padding: 10px;
                    border-radius: 6px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                }

                .send-btn {
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 6px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    white-space: nowrap;
                }

                .content-card {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    overflow: hidden;
                }

                .table-wrapper {
                    overflow-x: auto; /* This enables horizontal swipe on mobile */
                    -webkit-overflow-scrolling: touch;
                }

                .erp-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 600px; /* Ensures table doesn't squish too much */
                }

                .erp-table th, .erp-table td {
                    text-align: left;
                    padding: 16px;
                    border-bottom: 1px solid #f1f5f9;
                }

                .recipient-name { font-weight: 700; color: #1e293b; }
                .recipient-email { font-size: 0.8rem; color: #64748b; }

                .truncate-text {
                    max-width: 180px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .type-badge {
                    padding: 4px 8px;
                    background: #f1f5f9;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 6px 10px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                }

                .pagination-footer {
                    padding: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .toast-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    left: 20px; /* Full width on mobile */
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    pointer-events: none;
                }

                .toast {
                    padding: 16px;
                    border-radius: 8px;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-weight: 600;
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                    pointer-events: auto;
                    max-width: 400px;
                    margin-left: auto;
                }

                .toast.success { background: #059669; }
                .toast.error { background: #dc2626; }

                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                /* MOBILE BREAKPOINTS */
                @media (max-width: 640px) {
                    .header-section { flex-direction: column; align-items: stretch; }
                    .filter-group { flex-direction: row; min-width: unset; }
                    .send-btn { justify-content: center; width: 100%; order: -1; } /* Button on top for mobile */
                    .hide-mobile { display: none; }
                    .truncate-text { max-width: 120px; }
                    .toast { margin: 0; width: 100%; }
                }
            `}</style>
        </ERPLayout>
    );
};

export default NotificationHistoryPage;