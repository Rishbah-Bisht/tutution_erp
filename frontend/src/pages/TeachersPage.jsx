import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Plus, FileDown, Bell, GraduationCap, Search
} from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import ToastContainer, { useToast } from '../components/Toast';
import ActionModal from '../components/common/ActionModal';

// Project Components
import TeacherStats from '../components/teachers/TeacherStats';
import TeacherFilters from '../components/teachers/TeacherFilters';
import TeacherTable from '../components/teachers/TeacherTable';
import TeacherProfileModal from '../components/teachers/TeacherProfileModal';
import TeacherFormModal from '../components/teachers/TeacherFormModal';
import TeacherPayrollConfigModal from '../components/teachers/TeacherPayrollConfigModal';

import { API_BASE_URL } from '../api/apiConfig';

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});
const fmt = n => (Number(n) || 0).toLocaleString('en-IN');
const imgSrc = p => {
    if (!p) return null;
    if (p.startsWith('http')) return p;
    return `${API_BASE_URL}${p}`;
};

const TeachersPage = () => {
    const navigate = useNavigate();
    const { toasts, toast, removeToast } = useToast();
    const searchRef = useRef(null);

    const [teachers, setTeachers] = useState([]);
    const [batches, setBatches] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilt, setStatusFilt] = useState('');
    const [batchFilt, setBatchFilt] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [viewTeacher, setViewTeacher] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formMode, setFormMode] = useState('create');
    const [editTeacher, setEditTeacher] = useState(null);
    const [payrollTeacher, setPayrollTeacher] = useState(null);
    const [showDel, setShowDel] = useState(false);
    const [delTeacher, setDelTeacher] = useState(null);
    const [delLoading, setDelLoading] = useState(false);
    const [delError, setDelError] = useState('');

    // Ctrl+K shortcut
    useEffect(() => {
        const handler = e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const load = useCallback(async () => {
        if (!localStorage.getItem('token')) { navigate('/login'); return; }

        const isAllRecords = statusFilt === 'all';
        const isDefaultLoad = !search && !statusFilt && !batchFilt && !isAllRecords;

        setLoading(true);
        try {
            const limit = isDefaultLoad ? 5 : 10;
            const params = { page, limit };
            if (search) params.search = search;
            if (statusFilt && statusFilt !== 'all') params.status = statusFilt;
            if (batchFilt) params.batchId = batchFilt;

            const { data } = await API().get('/teachers', { params });

            if (page === 1) {
                setTeachers(data.teachers || []);
            } else {
                setTeachers(prev => {
                    const existingIds = new Set(prev.map(t => t._id));
                    const newTs = (data.teachers || []).filter(t => !existingIds.has(t._id));
                    return [...prev, ...newTs];
                });
            }

            setTotalPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch (e) {
            if (e.response?.status === 401) navigate('/login');
            else toast.error('Failed to load teachers');
        } finally { setLoading(false); }
    }, [search, statusFilt, batchFilt, page, navigate, toast]);

    // Single effect to handle all data loading with debouncing
    useEffect(() => {
        const delay = search ? 400 : 0;
        const t = setTimeout(load, delay);
        return () => clearTimeout(t);
    }, [load, page]);

    // Separate effect to reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [search, statusFilt, batchFilt]);

    useEffect(() => {
        API().get('/batches').then(({ data }) => setBatches(data.batches)).catch(() => { });
        API().get('/teachers/summary').then(({ data }) => setSummary(data)).catch(() => { });
    }, []);

    const openCreate = () => { setEditTeacher(null); setFormMode('create'); setShowForm(true); };
    const openEdit = t => { setEditTeacher(t); setFormMode('edit'); setShowForm(true); };
    const openDel = t => { setDelTeacher(t); setDelError(''); setShowDel(true); };

    const handleSave = () => {
        setShowForm(false);
        load();
        API().get('/teachers/summary').then(({ data }) => setSummary(data)).catch(() => { });
    };

    const confirmDelete = async pwd => {
        setDelLoading(true); setDelError('');
        try {
            await API().delete(`/teachers/${delTeacher._id}`, { data: { adminPassword: pwd } });
            toast.success(`"${delTeacher.name}" deleted`);
            setShowDel(false); setDelTeacher(null);
            load();
            API().get('/teachers/summary').then(({ data }) => setSummary(data)).catch(() => { });
        } catch (e) { setDelError(e.response?.data?.message || 'Delete failed. Check your password.'); }
        finally { setDelLoading(false); }
    };

    // PDF export
    // Export
    const exportData = async (type = 'csv') => {
        if (teachers.length === 0) {
            toast.error('No records to export');
            return;
        }

        if (type === 'pdf') {
            try {
                const { default: jsPDF } = await import('jspdf');
                const { default: autoTable } = await import('jspdf-autotable');
                const doc = new jsPDF();
                doc.setFontSize(16);
                doc.text('Teacher Report', 14, 14);
                doc.setFontSize(10);
                doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 22);
                autoTable(doc, {
                    startY: 28,
                    head: [['ID', 'Name', 'Email', 'Phone', 'Batches', 'Salary', 'Status']],
                    body: teachers.map(t => [
                        t.regNo || '—', t.name, t.email || '—', t.phone || '—',
                        (t.assignments || []).map(a => a.batchId?.name || a.batchName || '?').join(', ') || '—',
                        t.salary || 0, t.status
                    ]),
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [27, 58, 122] }
                });
                doc.save(`Teachers_Export_${new Date().toISOString().slice(0, 10)}.pdf`);
                toast.success('PDF exported!');
            } catch { toast.error('PDF export failed'); }
        } else {
            const csvRows = [];
            const headers = ['Employee ID', 'Name', 'Email', 'Phone', 'Batches', 'Salary', 'Status'];
            csvRows.push(headers.join(','));

            teachers.forEach(t => {
                const id = t.regNo || 'N/A';
                const name = t.name || '';
                const email = t.email || '';
                const phone = t.phone || '';
                const batches = (t.assignments || []).map(a => a.batchId?.name || a.batchName || '').join('; ') || 'N/A';
                const salary = t.salary || 0;
                const status = t.status || '';

                csvRows.push([
                    `"${id}"`, `"${name}"`, `"${email}"`, `"${phone}"`, `"${batches}"`, salary, `"${status}"`
                ].join(','));
            });

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', `Teachers_Export_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success('CSV exported!');
        }
    };

    return (
        <ERPLayout title="Teacher Management">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* Header */}
            <div className="page-hdr" style={{ marginBottom: 32, marginTop: 8 }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--erp-primary)' }}>Faculty Management</h1>
                    <p style={{ fontSize: '0.95rem', color: '#64748b' }}>Manage instructors, academic assignments, and payroll configurations.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-outline" style={{ height: 44, padding: '0 16px', borderRadius: 12 }} onClick={() => exportData('pdf')} title="Export PDF">
                        <FileDown size={18} />
                    </button>
                    <button className="btn btn-primary" style={{ height: 44, padding: '0 20px', borderRadius: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }} onClick={openCreate}>
                        <Plus size={18} /> Add New Faculty
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <TeacherStats summary={summary} fmt={fmt} />

            {/* Filter toolbar */}
            <TeacherFilters
                search={search} setSearch={setSearch}
                statusFilt={statusFilt} setStatusFilt={setStatusFilt}
                batchFilt={batchFilt} setBatchFilt={setBatchFilt}
                batches={batches} loading={loading} onLoad={load}
                searchRef={searchRef}
            />

            {/* Teacher table */}
            <div className="card" style={{ marginTop: 20 }}>
                {loading && page === 1 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                        <div className="spinner mb-4" />
                        <p className="font-medium">Loading faculty records...</p>
                    </div>
                ) : teachers.length === 0 ? (
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
                ) : (
                    <TeacherTable
                        teachers={teachers} loading={loading}
                        onView={setViewTeacher} onEdit={openEdit} onDelete={openDel}
                        onPayroll={setPayrollTeacher}
                        fmt={fmt} imgSrc={imgSrc} BASE={API_BASE_URL}
                    />
                )}

                {/* Pagination Controls */}
                {teachers.length > 0 && (
                    <div style={{ padding: '20px 0', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div className="text-sm text-slate-500 font-medium">Showing {teachers.length} of {total} records</div>
                        {page < totalPages && (
                            <button className="btn btn-outline" disabled={loading} onClick={() => setPage(p => p + 1)} style={{ borderRadius: 10, fontWeight: 700 }}>
                                {loading ? <><div className="spinner w-4 h-4 border-2 mr-2" /> Loading...</> : 'Load More Records'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}

            {
                viewTeacher && (
                    <TeacherProfileModal
                        teacher={viewTeacher}
                        onClose={() => setViewTeacher(null)}
                        fmt={fmt}
                        imgSrc={imgSrc}
                        API={API}
                    />
                )
            }

            {
                showForm && (
                    <TeacherFormModal
                        mode={formMode} teacher={editTeacher} batches={batches}
                        toast={toast} onSave={handleSave} onClose={() => setShowForm(false)}
                        API={API} imgSrc={imgSrc}
                    />
                )
            }

            {
                payrollTeacher && (
                    <TeacherPayrollConfigModal
                        teacher={payrollTeacher} onClose={() => setPayrollTeacher(null)}
                        toast={toast} API={API}
                    />
                )
            }

            <ActionModal
                isOpen={showDel} onClose={() => setShowDel(false)}
                onConfirm={confirmDelete} title="Confirm Deletion"
                description={`Are you sure you want to delete ${delTeacher?.name}? This action requires your admin password.`}
                actionType="delete" loading={delLoading} error={delError}
            />
        </ERPLayout>
    );
};

export default TeachersPage;
