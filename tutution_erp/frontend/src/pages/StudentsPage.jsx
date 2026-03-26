import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ERPLayout from '../components/ERPLayout';
import { Plus, Download, Upload, Check, AlertCircle, RefreshCcw } from 'lucide-react';

// Sub-Components
import DashboardStats from '../components/students/DashboardStats';
import StudentFilters from '../components/students/StudentFilters';
import StudentTable from '../components/students/StudentTable';
import StudentFormModal from '../components/students/StudentFormModal';
import StudentProfileModal from '../components/students/StudentProfileModal';
import ActionModal from '../components/common/ActionModal';
import BulkImportModal from '../components/students/BulkImportModal';

import apiClient from '../api/apiConfig';
import { hasClientSession } from '../utils/authSession';

const EMPTY_FORM = {
    name: '', dob: '', gender: 'Male', phone: '', email: '', address: '',
    className: '', batchId: '', admissionDate: new Date().toISOString().slice(0, 10),
    session: '2026-2027', fees: '', registrationFee: '', status: 'active', notes: '', password: '', profileImage: null,
    fatherName: '', motherName: '', currentYear: '1'
};
const LIVE_REFRESH_MS = 30000;

const StudentsPage = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, feePending: 0, attendanceAvg: 0, newAdmissions: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ batch: '', status: '', className: '' });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Modals
    const [modal, setModal] = useState(null); // 'admission', 'profile', 'bulk', 'delete-all'
    const [step, setStep] = useState(1);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [adminPassword, setAdminPassword] = useState('');

    // Form & Upload
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkResults, setBulkResults] = useState(null);
    const [err, setErr] = useState('');
    const [toasts, setToasts] = useState([]);

    // Action Modal States
    const [actionState, setActionState] = useState({
        isOpen: false,
        type: 'verify',
        title: '',
        desc: '',
        onConfirm: null,
        loading: false,
        error: ''
    });

    const addToast = (msg, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    const loadData = useCallback(async ({ silent = false } = {}) => {
        if (!hasClientSession(['admin'])) { navigate('/login'); return; }

        if (!silent) setLoading(true);
        try {
            const isAllRecords = filters.status === 'all';
            const apiStatus = isAllRecords ? '' : filters.status;

            // Check if user is searching/filtering
            const isDefaultLoad = !search && !filters.batch && !filters.status && !filters.className && !isAllRecords;
            const limit = isDefaultLoad ? 5 : 10;

            const params = { page, search, batch: filters.batch, status: apiStatus, className: filters.className, limit };

            let stuReq = apiClient.get('/students', { params });

            const [stuRes, batchRes, statsRes] = await Promise.all([
                stuReq,
                apiClient.get('/students/batches'),
                apiClient.get('/students/stats')
            ]);

            if (page === 1) {
                setStudents(stuRes.data.students || []);
            } else {
                setStudents(prev => {
                    const existingIds = new Set(prev.map(s => s._id));
                    const newStus = (stuRes.data.students || []).filter(s => !existingIds.has(s._id));
                    return [...prev, ...newStus];
                });
            }

            setTotalPages(stuRes.data.pages || 1);
            setTotal(stuRes.data.total || 0);
            setBatches(batchRes.data.batches);
            setStats(statsRes.data);
        } catch (e) {
            if (e.response?.status === 401) navigate('/login');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [search, filters, page, navigate]);

    useEffect(() => { loadData(); }, [page, loadData]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadData({ silent: true });
            }
        }, LIVE_REFRESH_MS);

        return () => window.clearInterval(intervalId);
    }, [loadData]);

    const handleForm = e => {
        const { name, value } = e.target;
        setForm(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'batchId') {
                const batch = batches.find(b => b._id === value);
                if (batch) {
                    next.fees = batch.fees || '';
                    // Optional: If batch has a default reg fee, set it here.
                    // For now, keeping it manual as per user request field.
                }
            }
            if (name === 'className') {
                next.batchId = '';
            }
            return next;
        });
    };

    const saveStudent = async e => {
        e.preventDefault();
        if (step === 1 && modal === 'admission') { setStep(2); return; }

        // If updating, require password
        if (selectedStudent?._id) {
            setActionState({
                isOpen: true,
                type: 'verify',
                title: 'Verify Update',
                desc: `You areUpdating records for "${selectedStudent.name}". Please enter admin password to authorize these changes.`,
                onConfirm: (pwd) => confirmStudentUpdate(pwd),
                loading: false,
                error: ''
            });
            return;
        }

        // Fresh admission (no password required for adding)
        performStudentSave();
    };

    const confirmStudentUpdate = async (pwd) => {
        setActionState(prev => ({ ...prev, loading: true, error: '' }));
        try {
            await performStudentSave(pwd);
            setActionState(prev => ({ ...prev, isOpen: false }));
        } catch (e) {
            setActionState(prev => ({ ...prev, loading: false, error: e.response?.data?.message || 'Update failed' }));
        }
    };

    const performStudentSave = async (pwd = '') => {
        setSaving(true); setErr('');
        try {
            const formData = new FormData();
            Object.keys(form).forEach(key => {
                if (form[key] !== null && form[key] !== undefined) {
                    formData.append(key, form[key]);
                }
            });

            if (pwd) formData.append('adminPassword', pwd);

            if (selectedStudent?._id) {
                await apiClient.put(`/students/${selectedStudent._id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                addToast('Student updated successfully');
            } else {
                await apiClient.post('/students', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                addToast('Student admitted successfully');
            }
            setModal(null); loadData();
        } catch (e) {
            setErr(e.response?.data?.message || 'Operation failed');
            if (!pwd) addToast(e.response?.data?.message || 'Operation failed', 'error'); // Only toast if not handled by action modal
            throw e; // Re-throw to be caught by confirmStudentUpdate if applicable
        } finally { setSaving(false); }
    };

    const toggleStudentStatus = (s) => {
        const isCurrentlyActive = s.status === 'active';
        const newStatus = isCurrentlyActive ? 'inactive' : 'active';

        setActionState({
            isOpen: true,
            type: isCurrentlyActive ? 'danger' : 'verify',
            title: isCurrentlyActive ? 'Deactivate Student' : 'Activate Student',
            desc: `Enter admin password to ${isCurrentlyActive ? 'deactivate' : 'activate'} "${s.name}".`,
            onConfirm: (pwd) => confirmStatusToggle(s, newStatus, pwd),
            loading: false,
            error: ''
        });
    };

    const confirmStatusToggle = async (student, newStatus, pwd) => {
        setActionState(prev => ({ ...prev, loading: true, error: '' }));
        try {
            await apiClient.put(`/students/${student._id}`, { status: newStatus, adminPassword: pwd });
            addToast(`Student ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
            setActionState(prev => ({ ...prev, isOpen: false }));
            loadData();
        } catch (e) {
            setActionState(prev => ({ ...prev, loading: false, error: e.response?.data?.message || 'Authorization failed' }));
        }
    };

    const confirmDeleteAll = async (pwd) => {
        setActionState(prev => ({ ...prev, loading: true, error: '' }));
        try {
            await apiClient.delete('/students/delete-all', { data: { adminPassword: pwd } });
            addToast('All students deleted successfully');
            setActionState(prev => ({ ...prev, isOpen: false }));
            setModal(null);
            loadData();
        } catch (e) {
            setActionState(prev => ({ ...prev, loading: false, error: e.response?.data?.message || 'Authorization failed' }));
        }
    };

    const exportData = (type) => {
        if (students.length === 0) {
            addToast('No records to export', 'error');
            return;
        }

        if (type === 'pdf') {
            const doc = new jsPDF();
            doc.text('Student Enrollment Report', 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
            const tableData = students.map(s => [s.rollNo || '-', s.name || '-', s.className || '-', s.batchId?.name || '-', s.contact || '-', s.status || '-']);
            autoTable(doc, { head: [['Roll No', 'Name', 'Class', 'Batch', 'Contact', 'Status']], body: tableData, startY: 30 });
            doc.save(`Students_Export_${new Date().toISOString().slice(0, 10)}.pdf`);
            addToast('Exported as PDF');
        } else {
            const csvRows = [];
            const headers = ['Student Name', 'Roll No', 'Class', 'Batch', 'Contact Number', 'Email', 'Admission Date', 'Status', 'Total Fees', 'Fees Paid'];
            csvRows.push(headers.join(','));

            students.forEach(s => {
                const name = s.name || '';
                const roll = s.rollNo || 'N/A';
                const className = s.className || '';
                const batch = s.batchId?.name || 'Unassigned';
                const phone = s.contact || '';
                const email = s.email || '';
                const admission = s.admissionDate ? new Date(s.admissionDate).toLocaleDateString('en-IN') : 'N/A';
                const status = s.status || '';
                const totalFees = s.fees || 0;
                const paidFees = s.feesPaid || 0;

                csvRows.push([
                    `"${name}"`, `"${roll}"`, `"${className}"`, `"${batch}"`, `"${phone}"`, `"${email}"`, `"${admission}"`,
                    status, totalFees, paidFees
                ].join(','));
            });

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', `Students_Export_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            addToast('Exported as CSV');
        }
    };

    const generateIDCard = async (s) => {
        const settings = JSON.parse(localStorage.getItem('instituteSettings') || '{}');

        const rootStyle = getComputedStyle(document.documentElement);
        const primaryColor = rootStyle.getPropertyValue('--erp-primary').trim() || '#1b3a7a';

        const coachingName = settings.coachingName || 'ERP ACADEMY';

        const logoUrl = settings.instituteLogo
            ? (settings.instituteLogo.startsWith('http') ? settings.instituteLogo : `${API_BASE_URL}${settings.instituteLogo}`)
            : null;

        const profileUrl = s.profileImage
            ? (s.profileImage.startsWith('http') ? s.profileImage : `${API_BASE_URL}${s.profileImage}`)
            : null;

        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [54, 86] });

        const getImageData = (url) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = () => resolve(null);
                img.src = url;
            });
        };

        const [logoData, profileData] = await Promise.all([
            logoUrl ? getImageData(logoUrl) : Promise.resolve(null),
            profileUrl ? getImageData(profileUrl) : Promise.resolve(null)
        ]);

        // Card Border
        doc.setDrawColor(220);
        doc.roundedRect(1, 1, 52, 84, 2, 2);

        // Body Texture (Diagonal Lines)
        doc.setDrawColor(245, 245, 245);
        doc.setLineWidth(0.1);
        for (let i = -50; i < 150; i += 3) {
            doc.line(0, i, 60, i + 30);
        }

        // Header
        doc.setFillColor(primaryColor);
        doc.rect(0, 0, 54, 18, 'F');

        // Logo
        if (logoData) {
            doc.addImage(logoData, 'PNG', 5, 4, 10, 10);
        }

        // Institute Name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(coachingName.toUpperCase(), 30, 9, { align: 'center' });

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.text('STUDENT IDENTITY CARD', 30, 13, { align: 'center' });

        // Divider Line (Subtle)
        doc.setDrawColor(primaryColor);
        doc.setLineWidth(0.5);
        doc.line(5, 18, 49, 18);

        // Divider
        doc.setDrawColor(200);
        doc.line(5, 20, 49, 20);

        // Profile Photo
        const photoY = 22;

        if (profileData) {
            doc.addImage(profileData, 'PNG', 17, photoY, 20, 20);
            doc.setDrawColor(primaryColor);
            doc.rect(17, photoY, 20, 20);
        } else {
            doc.setFillColor(240, 240, 240);
            doc.rect(17, photoY, 20, 20, 'F');
            doc.setTextColor(150);
            doc.setFontSize(6);
            doc.text('NO PHOTO', 27, photoY + 11, { align: 'center' });
        }

        // Student Name
        let y = 47;

        doc.setTextColor(0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(s.name.toUpperCase(), 27, y, { align: 'center' });

        // Info Fields
        y += 6;

        const drawField = (label, value, x, currentY) => {
            doc.setFontSize(5);
            doc.setTextColor(120);
            doc.setFont('helvetica', 'normal');
            doc.text(label, x, currentY);

            doc.setFontSize(6);
            doc.setTextColor(40);
            doc.setFont('helvetica', 'bold');
            doc.text(value || 'N/A', x, currentY + 3);
        };

        drawField('Student ID', s.rollNo, 6, y);
        drawField('Batch', s.batchId?.name, 30, y);

        y += 8;

        drawField('Course', s.className, 6, y);
        drawField('Contact', s.contact, 30, y);

        // Signature line
        doc.setDrawColor(150);
        doc.line(30, 72, 50, 72);

        doc.setFontSize(5);
        doc.setTextColor(80);
        doc.text('Authorized Signature', 40, 75, { align: 'center' });

        // Footer
        doc.setFillColor(primaryColor);
        doc.rect(0, 82, 54, 4, 'F');

        doc.setTextColor(255);
        doc.setFontSize(5);
        doc.text('Valid for institute use only', 27, 85, { align: 'center' });

        doc.save(`${s.rollNo}_ID_Card.pdf`);
    };



    return (
        <ERPLayout title="Student Management">
            {/* Toasts */}
            <div className="fixed top-5 right-5 z-[1000] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`alert shadow-lg border-l-4 animate-in slide-in-from-right pointer-events-auto ${t.type === 'error' ? 'alert-error border-red-600' : 'alert-success border-green-600'}`}>
                        {t.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
                        <span className="font-semibold">{t.msg}</span>
                    </div>
                ))}
            </div>

            <div className="page-hdr">
                <div>
                    <h1>Student Directory</h1>
                    <p>Manage admissions, enrollments, and student records</p>
                </div>
                <div className="flex items-center gap-3 mt-4 sm:mt-0">
                    <button className="btn btn-outline" onClick={() => loadData()} disabled={loading}>
                        <RefreshCcw size={16} className={loading ? 'spin' : ''} /> Refresh Activity
                    </button>
                    <button className="btn btn-outline" onClick={() => { setModal('bulk'); setBulkResults(null); setErr(''); }}>
                        <Upload size={16} /> Bulk View
                    </button>
                    <button className="btn btn-outline" onClick={() => exportData('pdf')}>
                        <Download size={16} /> Export PDF
                    </button>
                    <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setStep(1); setModal('admission'); setSelectedStudent(null); }}>
                        <Plus size={18} /> New Admission
                    </button>
                </div>
            </div>

            <DashboardStats stats={stats} loading={loading} />

            <div className="card mt-6">
                <StudentFilters
                    search={search} setSearch={(val) => { setSearch(val); setPage(1); }}
                    filters={filters} setFilters={(f) => { setFilters(f); setPage(1); }}
                    batches={batches}
                    onClearAll={() => setActionState({
                        isOpen: true,
                        type: 'danger',
                        title: 'Purge Student Directory',
                        desc: 'URGENT: This will delete ALL student records permanently. This action cannot be undone. Enter password to authorize bulk destruction.',
                        onConfirm: confirmDeleteAll,
                        loading: false,
                        error: ''
                    })}
                    onExport={() => exportData('csv')}
                />

                <StudentTable
                    students={students}
                    loading={loading}
                    onViewProfile={s => { setSelectedStudent(s); setModal('profile'); }}
                    onEdit={s => {
                        setSelectedStudent(s);
                        setForm({
                            name: s.name, dob: s.dob?.slice(0, 10) || '', gender: s.gender || 'Male',
                            phone: s.contact || '', email: s.email || '', address: s.address || '',
                            className: s.className || '', batchId: s.batchId?._id || '',
                            admissionDate: s.admissionDate?.slice(0, 10) || '',
                            session: s.session || '2026-2027', fees: s.fees || '',
                            registrationFee: s.registrationFee || '',
                            status: s.status || 'active', notes: s.notes || '', profileImage: null,
                            fatherName: s.fatherName || '', motherName: s.motherName || '',
                            currentYear: s.currentYear || '1'
                        });
                        setStep(1); setModal('admission');
                    }}
                    onToggleStatus={toggleStudentStatus}
                    page={page} setPage={setPage}
                    totalPages={totalPages}
                    total={total}
                />
            </div>

            {/* Modals */}
            <StudentFormModal
                isOpen={modal === 'admission'}
                onClose={() => setModal(null)}
                step={step} setStep={setStep} form={form}
                handleForm={handleForm} batches={batches} selectedStudent={selectedStudent}
                saving={saving} onSubmit={saveStudent} err={err}
            />

            <StudentProfileModal
                isOpen={modal === 'profile'}
                onClose={() => setModal(null)}
                student={selectedStudent}
                onDownloadID={generateIDCard}
            />

            <BulkImportModal
                isOpen={modal === 'bulk'}
                onClose={() => setModal(null)}
                bulkFile={bulkFile} setBulkFile={setBulkFile}
                bulkResults={bulkResults} setBulkResults={setBulkResults}
                saving={saving}
                onConfirm={async () => {
                    setSaving(true);
                    try {
                        const { data } = await apiClient.post('/students/bulk', { students: bulkFile });
                        setBulkResults(data);
                        addToast(`${data.success} students imported!`);
                        loadData();

                        // If all students added successfully, close modal after a short delay
                        if (data.failed === 0) {
                            setTimeout(() => {
                                setModal(null);
                                setBulkFile([]);
                                setBulkResults(null);
                            }, 1500);
                        }
                    } catch (e) { addToast('Bulk upload failed', 'error'); }
                    finally { setSaving(false); }
                }}
                err={err} setErr={setErr}
                addToast={addToast}
            />

            <ActionModal
                isOpen={actionState.isOpen}
                onClose={() => setActionState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={actionState.onConfirm}
                title={actionState.title}
                description={actionState.desc}
                actionType={actionState.type}
                loading={actionState.loading}
                error={actionState.error}
            />
        </ERPLayout>
    );
};

export default StudentsPage;
