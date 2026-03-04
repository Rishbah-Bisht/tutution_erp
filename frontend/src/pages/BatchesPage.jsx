import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Plus, RefreshCw, Search, Pencil, Trash2, X, Lock,
    Loader2, AlertCircle, CheckCircle2, BookOpen, Users,
    IndianRupee, Calendar, ChevronDown, Eye, EyeOff, ShieldAlert, FileDown
} from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import ToastContainer, { useToast } from '../components/Toast';
import ActionModal from '../components/common/ActionModal';
import AlertMessage from '../components/common/AlertMessage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── API helper ───────────────────────────────────────────────
import { API_BASE_URL } from '../api/apiConfig';

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// Dynamically fallback from user's global config
const getDynamicClasses = () => {
    try {
        const settings = JSON.parse(localStorage.getItem('instituteSettings'));
        if (settings && settings.classesOffered && settings.classesOffered.length) {
            return settings.classesOffered;
        }
    } catch (e) { }
    // Global fallback
    return ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
};

const EMPTY_FORM = {
    name: '', course: '', capacity: 30, subjects: [],
    classroom: '', schedule: [], fees: '',
    startDate: '', endDate: ''
};

// ══════════════════════════════════════════════════════════════
// TimetableGrid Component
// ══════════════════════════════════════════════════════════════
const TimetableGrid = ({ days, timeSlots, classroom, occupancy, selected, onToggle }) => {
    const getOccupant = (day, time) => occupancy?.[classroom]?.[day]?.[time] || null;
    const isSelected = (day, time) => selected.some(s => s.day === day && s.time === time);

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.72rem', minWidth: 600 }}>
                <thead>
                    <tr>
                        <th style={{ padding: '6px 10px', background: 'var(--erp-bg2)', border: '1px solid var(--erp-border)', color: 'var(--erp-muted2)', width: 70, textAlign: 'left', fontSize: '0.7rem', fontWeight: 700 }}>
                            TIME
                        </th>
                        {days.map(day => (
                            <th key={day} style={{
                                padding: '6px 4px', background: 'var(--erp-bg2)', border: '1px solid var(--erp-border)',
                                color: 'var(--erp-primary)', fontWeight: 700, fontSize: '0.7rem', textAlign: 'center', minWidth: 68
                            }}>
                                {day.slice(0, 3).toUpperCase()}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {timeSlots.map(time => (
                        <tr key={time}>
                            <td style={{
                                padding: '4px 8px', border: '1px solid var(--erp-border)',
                                background: 'var(--erp-bg2)', color: 'var(--erp-muted2)',
                                fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.7rem'
                            }}>
                                {time}
                            </td>
                            {days.map(day => {
                                const occupant = getOccupant(day, time);
                                const selected_ = isSelected(day, time);
                                const locked = !!occupant;

                                return (
                                    <td key={day} style={{ border: '1px solid var(--erp-border)', padding: 0 }}>
                                        <div
                                            title={locked ? `Occupied by: ${occupant}` : selected_ ? 'Click to deselect' : 'Click to select'}
                                            onClick={() => !locked && onToggle(day, time)}
                                            style={{
                                                width: '100%', height: 32,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: locked ? 'not-allowed' : 'pointer',
                                                background: locked
                                                    ? '#f1f5f9'
                                                    : selected_
                                                        ? 'var(--erp-primary)'
                                                        : '#fff',
                                                transition: 'background 0.15s',
                                                position: 'relative'
                                            }}
                                        >
                                            {locked && <Lock size={11} color="#94a3b8" />}
                                            {!locked && selected_ && <CheckCircle2 size={12} color="#fff" />}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--erp-muted2)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 14, height: 14, background: 'var(--erp-primary)', borderRadius: 3, display: 'inline-block' }} />
                    Selected
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 14, height: 14, background: '#f1f5f9', border: '1px solid var(--erp-border)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={8} color="#94a3b8" />
                    </span>
                    Occupied (hover for batch name)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 14, height: 14, background: '#fff', border: '1px solid var(--erp-border)', borderRadius: 3 }} />
                    Available
                </span>
            </div>
        </div>
    );
};

// Inline PasswordModal and DeleteModal implementation removed in favor of reusable ActionModal

// ══════════════════════════════════════════════════════════════
// Batch Row
// ══════════════════════════════════════════════════════════════
const BatchRow = ({ batch, onEdit, onDelete }) => {
    const navigate = useNavigate();
    const schedDays = [...new Set((batch.schedule || []).map(s => s.day.slice(0, 3)))].join(', ');

    return (
        <tr>
            <td>
                <div className="td-bold">{batch.name}</div>
                <div className="td-sm">{batch.course || '—'}</div>
            </td>
            <td>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {batch.subjects?.length
                        ? batch.subjects.map(s => (
                            <span key={s} className="chip" style={{ fontSize: '0.68rem' }}>{s}</span>
                        ))
                        : <span className="td-sm">—</span>
                    }
                </div>
            </td>
            <td>
                {batch.schedule?.length
                    ? <div>{schedDays || '—'}<div className="td-sm">{batch.schedule.length} slot{batch.schedule.length !== 1 ? 's' : ''}/week</div></div>
                    : <span className="td-sm">—</span>
                }
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Users size={13} color="var(--erp-muted2)" />
                    <span className="td-bold">{batch.studentCount || 0}</span>
                    {batch.capacity && <span className="td-sm">/ {batch.capacity}</span>}
                </div>
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IndianRupee size={12} color="var(--erp-success)" />
                    <span className="td-bold" style={{ color: 'var(--erp-success)' }}>
                        {(batch.earnings || 0).toLocaleString('en-IN')}
                    </span>
                </div>
                {batch.fees > 0 && <div className="td-sm">₹{batch.fees.toLocaleString()}/student</div>}
            </td>
            <td>
                <span className={`badge ${batch.isActive ? 'badge-active' : 'badge-overdue'}`}>
                    {batch.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/batches/${batch._id}`)} title="View batch details">
                        <Eye size={13} />
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => onEdit(batch)} title="Edit batch">
                        <Pencil size={13} />
                    </button>
                    <button className="btn btn-outline btn-sm !text-red-600 border-red-600 hover:bg-red-600 hover:text-white" onClick={() => onDelete(batch)} title="Delete batch">
                        <Trash2 size={13} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

// ══════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════
const BatchesPage = () => {
    const navigate = useNavigate();
    const { toasts, toast, removeToast } = useToast();

    // ── Data state ──────────────────────────────────────────
    const [batches, setBatches] = useState([]);
    const [config, setConfig] = useState({ days: [], timeSlots: [], classrooms: [] });
    const [subjects, setSubjects] = useState([]);
    const [occupancy, setOccupancy] = useState({});
    const [total, setTotal] = useState(0);

    // ── UI state ─────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [filterCourse, setFilterCourse] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // ── Modal state ──────────────────────────────────────────
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [editingBatch, setEditingBatch] = useState(null);
    const [formSaving, setFormSaving] = useState(false);
    const [subjLoading, setSubjLoading] = useState(false);
    const [occLoading, setOccLoading] = useState(false);
    const [isAutoScheduling, setIsAutoScheduling] = useState(false);

    // ── Form state ───────────────────────────────────────────
    const [form, setForm] = useState(EMPTY_FORM);

    // ── Password modal (for updates) ─────────────────────────
    const [showPwdModal, setShowPwdModal] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdError, setPwdError] = useState('');
    const pendingFormRef = useRef(null);

    // ── Delete modal ─────────────────────────────────────────
    const [showDelModal, setShowDelModal] = useState(false);
    const [delBatch, setDelBatch] = useState(null);
    const [delLoading, setDelLoading] = useState(false);
    const [delError, setDelError] = useState('');

    // ── Load batches ─────────────────────────────────────────
    const loadBatches = useCallback(async () => {
        if (!localStorage.getItem('token')) { navigate('/login'); return; }

        const isAllRecords = filterCourse === 'all';
        const isDefaultLoad = !search && !filterCourse && !isAllRecords;

        setLoading(true);
        try {
            const limit = isDefaultLoad ? 5 : 10;
            const params = { page, limit };
            const apiCourse = filterCourse === 'all' ? '' : filterCourse;
            if (apiCourse) params.course = apiCourse;
            if (search) params.search = search;

            const { data } = await API().get('/batches', { params });

            if (page === 1) {
                setBatches(data.batches || []);
            } else {
                setBatches(prev => {
                    const existingIds = new Set(prev.map(b => b._id));
                    const newBs = (data.batches || []).filter(b => !existingIds.has(b._id));
                    return [...prev, ...newBs];
                });
            }

            setTotal(data.total || 0);
            setTotalPages(data.pages || 1);
        } catch (e) {
            if (e.response?.status === 401) navigate('/login');
            else toast.error('Failed to load batches');
        } finally { setLoading(false); }
    }, [filterCourse, search, page, navigate]);

    // ── Load scheduler config ────────────────────────────────
    useEffect(() => {
        API().get('/scheduler/config')
            .then(({ data }) => setConfig(data))
            .catch(() => toast.warning('Could not load scheduler config'));
    }, []);

    useEffect(() => { loadBatches(); }, [loadBatches]);
    useEffect(() => { const t = setTimeout(() => { setPage(1); loadBatches(); }, 400); return () => clearTimeout(t); }, [search]);
    useEffect(() => { setPage(1); }, [filterCourse]);

    // ── Load subjects by course ──────────────────────────────
    useEffect(() => {
        if (!form.course) { setSubjects([]); return; }
        setSubjLoading(true);
        API().get(`/batches/courses/${encodeURIComponent(form.course)}/subjects`)
            .then(({ data }) => setSubjects(data.subjects))
            .catch(() => setSubjects([]))
            .finally(() => setSubjLoading(false));
    }, [form.course]);

    // ── Load occupancy when classroom changes ────────────────
    useEffect(() => {
        if (!form.classroom) { setOccupancy({}); return; }
        setOccLoading(true);
        const params = editingBatch ? { excludeBatchId: editingBatch._id } : {};
        API().get('/batches/room-occupancy', { params })
            .then(({ data }) => setOccupancy(data.occupancy))
            .catch(() => setOccupancy({}))
            .finally(() => setOccLoading(false));
    }, [form.classroom, editingBatch]);

    // ── Open modals ───────────────────────────────────────────
    const openCreate = () => {
        setForm(EMPTY_FORM);
        setEditingBatch(null);
        setSubjects([]);
        setOccupancy({});
        setModalMode('create');
        setShowModal(true);
    };

    const openEdit = (batch) => {
        setForm({
            name: batch.name,
            course: batch.course || '',
            capacity: batch.capacity || 30,
            subjects: batch.subjects || [],
            classroom: batch.classroom || '',
            schedule: batch.schedule || [],
            fees: batch.fees || '',
            teacher: batch.teacher || '',
            startDate: batch.startDate ? new Date(batch.startDate).toISOString().split('T')[0] : '',
            endDate: batch.endDate ? new Date(batch.endDate).toISOString().split('T')[0] : ''
        });
        setEditingBatch(batch);
        setModalMode('edit');
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingBatch(null); };

    // ── Subject toggle ────────────────────────────────────────
    const toggleSubject = (sub) => {
        setForm(f => ({
            ...f,
            subjects: f.subjects.includes(sub)
                ? f.subjects.filter(s => s !== sub)
                : [...f.subjects, sub]
        }));
    };

    // ── Slot toggle ───────────────────────────────────────────
    const toggleSlot = (day, time) => {
        setForm(f => {
            const exists = f.schedule.some(s => s.day === day && s.time === time);
            return {
                ...f,
                schedule: exists
                    ? f.schedule.filter(s => !(s.day === day && s.time === time))
                    : [...f.schedule, { day, time }]
            };
        });
    };

    // ── Auto-Schedule (AI) ────────────────────────────────────
    const handleAutoSchedule = async () => {
        if (!form.classroom) return toast.error('Please select a classroom first');
        setIsAutoScheduling(true);
        try {
            const { data } = await API().post('/scheduler/auto', {
                classroom: form.classroom,
                subjects: form.subjects,
                excludeBatchId: editingBatch?._id
            });
            if (data.schedule) {
                setForm(f => ({ ...f, schedule: data.schedule }));
                toast.success('Smart schedule generated! ✨');
            }
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to auto-schedule');
        } finally {
            setIsAutoScheduling(false);
        }
    };

    // ── Save (CREATE) ─────────────────────────────────────────
    const handleCreate = async () => {
        setFormSaving(true);
        try {
            await API().post('/batches', form);
            toast.success(`Batch "${form.name}" created successfully!`);
            closeModal();
            loadBatches();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to create batch');
        } finally { setFormSaving(false); }
    };

    // ── Save (UPDATE) — open password modal first ─────────────
    const handleUpdateIntent = () => {
        pendingFormRef.current = { ...form };
        setPwdError('');
        setShowPwdModal(true);
    };

    const confirmUpdate = async (password) => {
        setPwdLoading(true); setPwdError('');
        try {
            await API().put(`/batches/${editingBatch._id}`, { ...pendingFormRef.current, adminPassword: password });
            toast.success(`Batch "${form.name}" updated!`);
            setShowPwdModal(false);
            closeModal();
            loadBatches();
        } catch (e) {
            setPwdError(e.response?.data?.message || 'Update failed');
        } finally { setPwdLoading(false); }
    };

    // ── Submit handler ────────────────────────────────────────
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error('Batch name is required');
        if (modalMode === 'create') handleCreate();
        else handleUpdateIntent();
    };

    // ── Delete flow ───────────────────────────────────────────
    const openDelete = (batch) => {
        setDelBatch(batch);
        setDelError('');
        setShowDelModal(true);
    };

    const confirmDelete = async (password) => {
        setDelLoading(true); setDelError('');
        try {
            await API().delete(`/batches/${delBatch._id}`, { data: { adminPassword: password } });
            toast.success(`Batch "${delBatch.name}" deleted`);
            setShowDelModal(false);
            setDelBatch(null);
            loadBatches();
        } catch (e) {
            setDelError(e.response?.data?.message || 'Delete failed. Check your password.');
        } finally { setDelLoading(false); }
    };

    const fmt = n => (n || 0).toLocaleString('en-IN');

    const exportData = () => {
        if (batches.length === 0) {
            toast.error('No records to export');
            return;
        }

        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text('Academic Batches Report', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Total Batches: ${total}`, 14, 33);

        const tableBody = batches.map(b => [
            b.name || '—',
            b.course || '—',
            (b.subjects || []).join(', ') || '—',
            `${b.studentCount || 0} / ${b.capacity || '—'}`,
            `INR ${(b.earnings || 0).toLocaleString('en-IN')}`,
            b.isActive ? 'Active' : 'Inactive'
        ]);

        autoTable(doc, {
            startY: 40,
            head: [['Batch Name', 'Course', 'Subjects', 'Enrollment', 'Revenue', 'Status']],
            body: tableBody,
            headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 4 },
            alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
            margin: { top: 40 }
        });

        doc.save(`Batches_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
        toast.success('PDF report exported! 📄');
    };

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════
    return (
        <ERPLayout title="Batch Management">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* ── Page Header ─────────────────────────────── */}
            <div className="page-hdr">
                <div>
                    <h1>Batch Management</h1>
                    <p>{total} batch{total !== 1 ? 'es' : ''} configured</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-outline" onClick={exportData} title="Export PDF">
                        <FileDown size={14} /> Export PDF
                    </button>
                    <button className="btn btn-outline" onClick={loadBatches} title="Refresh">
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                        Refresh
                    </button>
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={15} /> Create New Batch
                    </button>
                </div>
            </div>

            {/* ── Filter Bar ──────────────────────────────── */}
            <div className="card toolbar rounded-xl" style={{ marginBottom: 20 }}>
                <div className="tb-search-wrap">
                    <Search size={15} />
                    <input className="tb-search" placeholder="Search batch name or course…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="tb-select" style={{ minWidth: 180 }}
                    value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                    <option value="">Select Filter</option>
                    <option value="all">All Records</option>
                    {getDynamicClasses().map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {(filterCourse || search) && (
                    <button className="btn btn-outline btn-sm" onClick={() => { setFilterCourse(''); setSearch(''); }}>
                        <X size={13} /> Clear
                    </button>
                )}
            </div>

            {/* ── Batch Table ──────────────────────────────── */}
            <div className="card">
                {loading && page === 1 ? (
                    <div className="loader-wrap"><div className="spinner" /><p>Loading batches…</p></div>
                ) : batches.length === 0 ? (
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
                    <>
                        <div className="erp-table-wrap">
                            <table className="erp-table">
                                <thead>
                                    <tr>
                                        <th>Batch</th>
                                        <th>Subjects</th>
                                        <th>Schedule</th>
                                        <th>Enrollment</th>
                                        <th>Earnings</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batches.map(b => (
                                        <BatchRow key={b._id} batch={b} onEdit={openEdit} onDelete={openDelete} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {batches.length > 0 && (
                            <div style={{ marginTop: 20, marginBottom: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <div className="text-sm text-slate-500 font-medium">Showing {batches.length} of {total} records</div>
                                {page < totalPages && (
                                    <button className="btn btn-outline" disabled={loading} onClick={() => setPage(p => p + 1)}>
                                        {loading ? <><div className="spinner w-4 h-4 border-2 mr-2" /> Loading...</> : 'Load More'}
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ═══════════════════════════════════════════════
                CREATE / EDIT MODAL
            ═══════════════════════════════════════════════ */}
            {
                showModal && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
                        backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }} onClick={e => e.target === e.currentTarget && closeModal()}>

                        <style>{`
        .erp-input:focus { border-color: #0f172a !important; box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1) !important; outline: none; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

                        <div className="modal" style={{
                            maxWidth: 820,
                            width: '100%',
                            maxHeight: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            borderRadius: '10px',
                            border: 'none',
                            background: '#fff',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                        }}>

                            {/* --- PREMIUM BATCH FORM HEADER (Dark Theme like Image) --- */}
                            <header style={{
                                padding: '24px 32px',
                                background: '#0f172a',
                                position: 'relative',
                                color: '#fff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexShrink: 0
                            }}>
                                <BookOpen size={120} style={{ position: 'absolute', right: -10, bottom: -30, opacity: 0.05 }} />

                                <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 1 }}>
                                    <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        <BookOpen size={28} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
                                            {modalMode === 'edit' ? 'Update Academic Batch' : 'Create New Batch'}
                                        </h2>
                                        <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem' }}>
                                            {modalMode === 'edit' ? `Modifying configuration for ${editingBatch?.name}` : 'Setup a new teaching group and timetable'}
                                        </p>
                                    </div>
                                </div>

                                <button type="button" onClick={closeModal} style={{
                                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px', color: '#fff', padding: '10px 20px', cursor: 'pointer',
                                    fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem',
                                    position: 'relative', zIndex: 1
                                }}>
                                    <X size={18} /> CLOSE
                                </button>
                            </header>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

                                    {/* ── Basic Info Section ── */}
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        Basic Information
                                        <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Batch Name *</label>
                                            <input
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6 }}
                                                className="erp-input"
                                                value={form.name}
                                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                                placeholder="e.g. SCI-11-26" required
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Class / Course</label>
                                            <select
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6, background: '#fff' }}
                                                className="erp-input"
                                                value={form.course}
                                                onChange={e => setForm(f => ({ ...f, course: e.target.value, subjects: [] }))}
                                            >
                                                <option value="">Select course…</option>
                                                {getDynamicClasses().map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Fees (₹ / Month)</label>
                                            <input
                                                type="number"
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6 }}
                                                className="erp-input"
                                                value={form.fees}
                                                onChange={e => setForm(f => ({ ...f, fees: e.target.value }))}
                                                placeholder="0" min="0"
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Capacity</label>
                                            <input
                                                type="number"
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6 }}
                                                className="erp-input"
                                                value={form.capacity}
                                                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                                                placeholder="30" min="1"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 20, marginBottom: 30 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Batch Start Date</label>
                                            <input
                                                type="date"
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6 }}
                                                className="erp-input"
                                                value={form.startDate}
                                                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Batch End Date</label>
                                            <input
                                                type="date"
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6 }}
                                                className="erp-input"
                                                value={form.endDate}
                                                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    {/* ── Subject Selection ── */}
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        Subject Assignment
                                        <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                                    </div>

                                    <div style={{ marginBottom: 30 }}>
                                        {!form.course ? (
                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', padding: '16px', background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                                                Select a course above to load available subjects
                                            </div>
                                        ) : subjLoading ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.85rem' }}>
                                                <Loader2 size={16} className="spin" /> Loading subjects…
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                                {subjects.map(sub => {
                                                    const checked = form.subjects.includes(sub);
                                                    return (
                                                        <button key={sub} type="button" onClick={() => toggleSubject(sub)}
                                                            style={{
                                                                padding: '8px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: '0.2s',
                                                                background: checked ? '#0f172a' : '#fff',
                                                                color: checked ? '#fff' : '#475569',
                                                                border: `1.5px solid ${checked ? '#0f172a' : '#cbd5e1'}`,
                                                            }}>
                                                            {sub}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Timetable Section ── */}
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        Classroom & Timetable
                                        <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                                    </div>

                                    <div style={{ maxWidth: 300, marginBottom: 20 }}>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Select Classroom</label>
                                        <select
                                            style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6, background: '#fff' }}
                                            className="erp-input"
                                            value={form.classroom}
                                            onChange={e => setForm(f => ({ ...f, classroom: e.target.value, schedule: [] }))}
                                        >
                                            <option value="">Select classroom…</option>
                                            {config.classrooms.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>

                                    {form.classroom && (
                                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                                                    Click slots to schedule — <strong>{form.schedule.length}</strong> selected
                                                </p>
                                                <button type="button" onClick={handleAutoSchedule} disabled={isAutoScheduling}
                                                    style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {isAutoScheduling ? <Loader2 size={14} className="spin" /> : '✨ AUTO-SCHEDULE'}
                                                </button>
                                            </div>
                                            <TimetableGrid
                                                days={config.days}
                                                timeSlots={config.timeSlots}
                                                classroom={form.classroom}
                                                occupancy={occupancy}
                                                selected={form.schedule}
                                                onToggle={toggleSlot}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* --- FOOTER (Like Image) --- */}
                                <div style={{ padding: '24px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 16, background: '#fff' }}>
                                    <button type="button" onClick={closeModal} style={{ padding: '0 40px', height: 52, borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>
                                        CANCEL
                                    </button>
                                    <button type="submit" disabled={formSaving} style={{ flex: 1, height: 52, background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                                        {formSaving ? <Loader2 className="spin" /> : (modalMode === 'edit' ? <>UPDATE ACADEMIC BATCH <ShieldAlert size={20} /></> : <>COMPLETE BATCH CREATION <Plus size={20} /></>)}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* ═══════════════════════════════════════════════
                PASSWORD MODAL (for update)
            ═══════════════════════════════════════════════ */}
            <ActionModal
                isOpen={showPwdModal}
                onClose={() => setShowPwdModal(false)}
                onConfirm={confirmUpdate}
                title="Admin Verification"
                description="Updating a batch requires admin password verification for security."
                actionType="verify"
                loading={pwdLoading}
                error={pwdError}
            />

            {/* ═══════════════════════════════════════════════
                DELETE MODAL
            ═══════════════════════════════════════════════ */}
            {
                showDelModal && delBatch && (
                    <ActionModal
                        isOpen={showDelModal}
                        onClose={() => { setShowDelModal(false); setDelBatch(null); }}
                        onConfirm={confirmDelete}
                        title="Delete Batch"
                        description={`You are about to delete "${delBatch?.name}". All timetable slots and assignments will be lost.`}
                        actionType="delete"
                        loading={delLoading}
                        error={delError}
                    />
                )
            }
        </ERPLayout>
    );
};

export default BatchesPage;
