import React, { useState, useEffect } from 'react';
import {
    DollarSign, Users, Briefcase, Calendar, Plus, Save, Banknote, Trash2, Edit3, X,
    Loader2, Download, Lock, AlertTriangle, CheckCircle2, Building2, Smartphone, Coins,
    History, Info, ShieldCheck, User, FileText, QrCode, ArrowRight, Clock, IndianRupee
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import ERPLayout from '../components/ERPLayout';
import ToastContainer, { useToast } from '../components/Toast';
import ReceiptPreviewModal from '../components/fees/ReceiptPreviewModal';
import { API_BASE_URL } from '../api/apiConfig';

// --- Theme Constants ---
const primaryColor = '#064e3b'; // Dark Emerald
const sharpRadius = '8px';
const borderColor = '#e2e8f0';
const headingColor = '#0f172a'; // Dark Slate

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const StatCard = ({ title, value, icon: Icon, color, bg }) => (
    <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16, borderRadius: sharpRadius, border: `1px solid ${borderColor}` }}>
        <div style={{ width: 52, height: 52, borderRadius: sharpRadius, background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={24} />
        </div>
        <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>{value}</div>
        </div>
    </div>
);

const TeacherPayrollDashboard = () => {
    const { toasts, toast, removeToast } = useToast();
    const [stats, setStats] = useState(null);
    const [salaries, setSalaries] = useState([]);
    const [teachers, setTeachers] = useState([]);

    // UI states
    const [loadingStats, setLoadingStats] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

    // Modals
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedSalary, setSelectedSalary] = useState(null);
    const [payData, setPayData] = useState({ paymentMethod: 'Bank Transfer', transactionId: '', notes: '', paidAmount: 0 });
    const [adminPassword, setAdminPassword] = useState('');
    const [payLoading, setPayLoading] = useState(false);
    const [selectedTeacherProfile, setSelectedTeacherProfile] = useState(null);

    // Receipt Preview
    const [previewPdf, setPreviewPdf] = useState({ isOpen: false, blobUrl: null, filename: '' });

    const fetchDashboard = (month) => {
        setLoadingStats(true);
        const query = month ? `?monthYear=${month}` : '';
        API().get(`/payroll/dashboard${query}`)
            .then(res => setStats(res.data))
            .catch(() => toast.error('Failed to load payroll stats'))
            .finally(() => setLoadingStats(false));
    };

    const fetchSalaries = () => {
        API().get(`/payroll/salaries?monthYear=${monthFilter}`)
            .then(res => setSalaries(res.data))
            .catch(() => toast.error('Failed to load salaries'));
    };

    useEffect(() => {
        if (!localStorage.getItem('token')) return;
        fetchDashboard(monthFilter);
        API().get('/teachers').then(res => setTeachers(res.data.teachers || [])).catch(console.error);
    }, []);

    useEffect(() => {
        if (!localStorage.getItem('token')) return;
        fetchSalaries();
        fetchDashboard(monthFilter);
    }, [monthFilter]);

    const handleGenerateSalaries = async () => {
        if (!window.confirm(`Generate salaries for ${monthFilter}?`)) return;
        setIsGenerating(true);
        try {
            const res = await API().post('/payroll/generate', { monthYear: monthFilter });
            toast.success(res.data.message);
            fetchDashboard(monthFilter);
            fetchSalaries();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to generate salaries');
        } finally {
            setIsGenerating(false);
        }
    };

    const numberToWords = (num) => {
        const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
        const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        const inWords = (n) => {
            if ((n = n.toString()).length > 9) return 'overflow';
            let nArr = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
            if (!nArr) return '';
            let str = '';
            str += nArr[1] != 0 ? (a[Number(nArr[1])] || b[nArr[1][0]] + ' ' + a[nArr[1][1]]) + 'crore ' : '';
            str += nArr[2] != 0 ? (a[Number(nArr[2])] || b[nArr[2][0]] + ' ' + a[nArr[2][1]]) + 'lakh ' : '';
            str += nArr[3] != 0 ? (a[Number(nArr[3])] || b[nArr[3][0]] + ' ' + a[nArr[3][1]]) + 'thousand ' : '';
            str += nArr[4] != 0 ? a[Number(nArr[4])] + 'hundred ' : '';
            str += nArr[5] != 0 ? ((str != '') ? 'and ' : '') + (a[Number(nArr[5])] || b[nArr[5][0]] + ' ' + a[nArr[5][1]]) : '';
            return str.toUpperCase();
        };
        return inWords(Math.floor(num)) + ' RUPEES ONLY';
    };

    const handleProcessPayment = async (e) => {
        e.preventDefault();
        if (!adminPassword.trim()) {
            toast.error('Admin password is required');
            return;
        }
        setPayLoading(true);
        try {
            await API().post(`/payroll/pay/${selectedSalary._id}`, {
                adminPassword,
                ...payData
            });
            toast.success('Payment recorded successfully!');
            setShowPayModal(false);
            setAdminPassword('');
            fetchDashboard(monthFilter);
            fetchSalaries();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to process payment');
        } finally {
            setPayLoading(false);
        }
    };

    // --- NEW SIMPLE RECEIPT TEMPLATE (Resolved Syntax Errors) ---
    const generateSalarySlip = async (salary, previewOnly = true) => {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const monthYearText = new Date(salary.monthYear + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });

        const settings = JSON.parse(localStorage.getItem('instituteSettings') || '{}');
        const instName = settings.instituteName || 'INSTITUTE ERP';
        const instAddr = settings.instituteAddress || 'Main Campus, Education Hub';

        // 1. Header (Emerald Box Style)
        doc.setFillColor(6, 78, 59); // Dark Emerald
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(instName.toUpperCase(), 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(instAddr, 105, 28, { align: 'center' });
        doc.setFontSize(8);
        doc.text(`Phone: ${settings.institutePhone || ''} | Email: ${settings.instituteEmail || ''}`, 105, 33, { align: 'center' });
        doc.setFontSize(9);
        doc.text(`Official Salary Statement - ${monthYearText.toUpperCase()}`, 105, 37, { align: 'center' });

        // 2. Employee Info Grid
        let y = 55;
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("EMPLOYEE DETAILS", 15, y);
        doc.setDrawColor(226, 232, 240);
        doc.line(15, y + 2, 195, y + 2);

        y += 10;
        const employee = salary.teacherId || {};

        // Left Column
        doc.setFont('helvetica', 'bold'); doc.text("Name:", 15, y);
        doc.setFont('helvetica', 'normal'); doc.text(employee.name?.toUpperCase() || 'N/A', 45, y);

        // Right Column
        doc.setFont('helvetica', 'bold'); doc.text("Month:", 110, y);
        doc.setFont('helvetica', 'normal'); doc.text(monthYearText, 140, y);

        y += 7;
        doc.setFont('helvetica', 'bold'); doc.text("Emp ID:", 15, y);
        doc.setFont('helvetica', 'normal'); doc.text(employee.regNo || 'E-0000', 45, y);

        doc.setFont('helvetica', 'bold'); doc.text("Status:", 110, y);

        // --- FIXED SYNTAX ERROR: Properly spreading color arrays for setTextColor ---
        const statusColor = salary.status === 'Paid' ? [5, 150, 105] : [217, 119, 6];
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.text(salary.status?.toUpperCase() || 'PENDING', 140, y);
        doc.setTextColor(15, 23, 42);

        y += 7;
        doc.setFont('helvetica', 'bold'); doc.text("Department:", 15, y);
        doc.setFont('helvetica', 'normal'); doc.text(employee.department || 'General', 45, y);

        if (salary.status === 'Paid') {
            doc.setFont('helvetica', 'bold'); doc.text("Ref ID:", 110, y);
            doc.setFont('helvetica', 'normal'); doc.text(salary.transactionId || 'REF-AUTO', 140, y);
        }

        // 3. Earnings & Deductions Table
        y += 15;
        autoTable(doc, {
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
            bodyStyles: { fontSize: 9 },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { halign: 'right' },
                2: { fontStyle: 'bold' },
                3: { halign: 'right' }
            },
            head: [['Earnings Head', 'Amount', 'Remarks', 'Total']],
            body: [
                ['Basic Salary', `Rs. ${salary.baseSalary?.toLocaleString()}`, 'Monthly fixed', `Rs. ${salary.baseSalary?.toLocaleString()}`],
                ['Performance Bonus', `Rs. ${salary.bonusAmount?.toLocaleString() || 0}`, salary.bonusReason || 'Personal', `Rs. ${salary.bonusAmount?.toLocaleString() || 0}`],
                ['Extra Classes', `Rs. ${salary.extraClassesAmount?.toLocaleString() || 0}`, 'Overtime', `Rs. ${salary.extraClassesAmount?.toLocaleString() || 0}`],
            ]
        });

        // 4. Net Total Section
        y = doc.lastAutoTable.finalY + 10;
        doc.setFillColor(248, 250, 252);
        doc.rect(110, y, 85, 25, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(110, y, 85, 25, 'S');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("Total Earnings:", 115, y + 8);
        doc.text(`Rs. ${(salary.baseSalary + salary.bonusAmount + salary.extraClassesAmount).toLocaleString()}`, 190, y + 8, { align: 'right' });

        doc.setFontSize(11);
        doc.setTextColor(6, 78, 59);
        doc.text("NET PAYABLE:", 115, y + 21);
        doc.text(`Rs. ${salary.netSalary?.toLocaleString()}`, 190, y + 21, { align: 'right' });

        // 5. Words
        doc.setTextColor(100);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text("Amount in Words:", 15, y + 8);
        doc.setFont('helvetica', 'normal');
        doc.text(numberToWords(salary.netSalary), 15, y + 13);

        // 6. Signature
        y += 50;
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.line(140, y, 190, y);
        doc.text("Authorized Signatory", 165, y + 5, { align: 'center' });

        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.text("This is a system generated document and does not require a physical signature.", 105, 285, { align: 'center' });

        const filename = `Salary_Slip_${employee.name || 'Staff'}_${salary.monthYear}.pdf`;
        if (previewOnly) return { url: doc.output('bloburl'), filename };
        doc.save(filename);
    };

    const handleViewSlip = async (salary) => {
        setPreviewPdf({ isOpen: true, blobUrl: null, filename: '' });
        const { url, filename } = await generateSalarySlip(salary, true);
        setPreviewPdf({ isOpen: true, blobUrl: url, filename });
    };

    return (
        <ERPLayout title="Teacher Payroll">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            <div className="page-hdr">
                <div>
                    <h1 style={{ fontWeight: 900, color: headingColor }}>Teacher Payroll</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Manage monthly salaries, process payments, and generate slips.</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="month"
                        value={monthFilter}
                        onChange={e => setMonthFilter(e.target.value)}
                        className="input-field"
                        style={{ padding: '8px 16px', background: '#fff', border: `1.5px solid ${borderColor}`, borderRadius: sharpRadius, fontWeight: 700 }}
                    />
                    <button className="btn btn-primary" onClick={handleGenerateSalaries} disabled={isGenerating}
                        style={{ background: primaryColor, borderRadius: sharpRadius, fontWeight: 800, padding: '0 24px', boxShadow: '0 4px 12px rgba(6,78,59,0.2)' }}>
                        {isGenerating ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                        Auto-Generate {monthFilter}
                    </button>
                </div>
            </div>

            {loadingStats ? (
                <div className="loader-wrap"><div className="spinner" /></div>
            ) : stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
                    <StatCard title="Profiles Set" value={`${stats.teachersWithProfiles}/${stats.totalTeachers}`} icon={Users} color="#059669" bg="#ecfdf5" />
                    <StatCard title="Liability" value={`₹${stats.totalLiability.toLocaleString()}`} icon={DollarSign} color="#2563eb" bg="#eff6ff" />
                    <StatCard title="Disbursed" value={`₹${stats.totalPaid.toLocaleString()}`} icon={CheckCircle2} color="#059669" bg="#ecfdf5" />
                    <StatCard title="Pending" value={`₹${stats.totalPending.toLocaleString()}`} icon={AlertTriangle} color="#dc2626" bg="#fef2f2" />
                </div>
            )}

            <div className="card" style={{ padding: 32, borderRadius: sharpRadius, border: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: `1px solid ${borderColor}`, paddingBottom: 16 }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: headingColor, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <History size={20} color={primaryColor} /> Monthly Payout Ledger ({monthFilter})
                    </h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="erp-table" style={{ width: '100%' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Faculty Member</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Fixed Base</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Incentives</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Net Pay</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salaries.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: 60, color: '#cbd5e1' }}>
                                        <Info size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                                        <p style={{ fontWeight: 700 }}>No payroll records found for this cycle.</p>
                                    </td>
                                </tr>
                            ) : salaries.map(salary => (
                                <tr key={salary._id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: sharpRadius, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                                                <User size={18} color="#94a3b8" style={{ position: 'absolute' }} />
                                                {salary.teacherId?.profileImage && (
                                                    <img
                                                        src={salary.teacherId.profileImage}
                                                        onError={e => e.target.style.display = 'none'}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
                                                        alt=""
                                                    />
                                                )}
                                            </div>
                                            <div style={{ fontWeight: 700, color: headingColor }}>{salary.teacherId?.name}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>₹{salary.baseSalary.toLocaleString()}</td>
                                    <td style={{ padding: '16px 20px', color: '#059669', fontWeight: 700 }}>+₹{(salary.extraClassesAmount + salary.bonusAmount).toLocaleString()}</td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: 900, color: primaryColor, fontSize: '0.95rem' }}>₹{salary.netSalary.toLocaleString()}</div>
                                        {salary.totalPaid > 0 && (
                                            <div style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>Paid: ₹{salary.totalPaid.toLocaleString()}</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '2px', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase',
                                            background: salary.status === 'Paid' ? '#ecfdf5' : salary.status === 'Processing' ? '#eff6ff' : '#fffbeb',
                                            color: salary.status === 'Paid' ? '#059669' : salary.status === 'Processing' ? '#2563eb' : '#b45309',
                                            border: `1px solid ${salary.status === 'Paid' ? '#d1fae5' : salary.status === 'Processing' ? '#dbeafe' : '#fef3c7'}`,
                                            display: 'inline-flex', alignItems: 'center', gap: 4
                                        }}>
                                            {salary.status === 'Paid' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                            {salary.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            {(salary.status === 'Pending' || salary.status === 'Processing') && (
                                                <button className="btn btn-primary" style={{ height: 32, padding: '0 12px', background: primaryColor, fontSize: '0.7rem', borderRadius: sharpRadius }} onClick={async () => {
                                                    setSelectedSalary(salary);
                                                    setPayData({
                                                        paymentMethod: 'Bank Transfer',
                                                        transactionId: '',
                                                        notes: '',
                                                        paidAmount: salary.netSalary - (salary.totalPaid || 0)
                                                    });
                                                    setAdminPassword('');
                                                    setShowPayModal(true);
                                                    try {
                                                        const res = await API().get(`/payroll/profile/${salary.teacherId._id}`);
                                                        setSelectedTeacherProfile(res.data);
                                                    } catch (e) { console.error(e); }
                                                }}>
                                                    DISBURSE
                                                </button>
                                            )}
                                            <button onClick={() => handleViewSlip(salary)} style={{ height: 32, width: 32, background: '#f1f5f9', border: 'none', borderRadius: sharpRadius, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                                                <FileText size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- DISBURSE MODAL (80% Width Restricted) --- */}
            {showPayModal && selectedSalary && (
                <div className="modal-overlay" style={{
                    position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '20px'
                }} onClick={e => e.target === e.currentTarget && setShowPayModal(false)}>
                    <div className="modal" style={{
                        width: '80%', maxWidth: '800px', maxHeight: '90vh',
                        background: '#fff', borderRadius: sharpRadius, overflow: 'hidden',
                        display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>

                        <header style={{
                            width: '100%', padding: '24px 32px', background: primaryColor,
                            position: 'relative', color: '#fff', display: 'flex',
                            justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
                        }}>
                            <Banknote size={100} style={{ position: 'absolute', right: -10, bottom: -20, opacity: 0.1, color: '#fff' }} />
                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 44, height: 44, borderRadius: sharpRadius, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Banknote size={20} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>PROCESS SALARY PAYOUT</h2>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 500 }}>Emp: {selectedSalary.teacherId?.name} • Session: {monthFilter}</div>
                                </div>
                            </div>
                            <button type="button" onClick={() => setShowPayModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: sharpRadius, color: '#fff', padding: '8px 16px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}>
                                <X size={16} />
                            </button>
                        </header>

                        <form onSubmit={handleProcessPayment} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div className="modal-body" style={{ padding: '32px' }}>
                                <div style={{ padding: '24px', background: '#f8fafc', borderRadius: sharpRadius, border: `1px solid ${borderColor}`, textAlign: 'center', marginBottom: 24 }}>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>REMAINING BALANCE</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: primaryColor }}>₹{(selectedSalary.netSalary - (selectedSalary.totalPaid || 0)).toLocaleString()}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Total Amount: ₹{selectedSalary.netSalary.toLocaleString()} • Already Paid: ₹{(selectedSalary.totalPaid || 0).toLocaleString()}</div>
                                </div>

                                <div className="mf" style={{ marginBottom: 16 }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>AMOUNT TO DISBURSE NOW *</label>
                                    <div style={{ position: 'relative' }}>
                                        <IndianRupee size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#059669' }} />
                                        <input
                                            type="number"
                                            value={payData.paidAmount}
                                            onChange={e => setPayData({ ...payData, paidAmount: e.target.value })}
                                            required
                                            style={{ borderRadius: sharpRadius, paddingLeft: 40, fontWeight: 800, color: primaryColor }}
                                        />
                                    </div>
                                </div>

                                <div className="mf" style={{ marginBottom: 16 }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>PAYMENT METHOD *</label>
                                    <select value={payData.paymentMethod} onChange={e => setPayData({ ...payData, paymentMethod: e.target.value })} required style={{ borderRadius: sharpRadius }}>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Cash">Cash</option>
                                    </select>
                                </div>

                                {payData.paymentMethod === 'UPI' && selectedTeacherProfile?.bankDetails?.upiId && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderRadius: sharpRadius, background: '#f0fdf4', border: '1px solid #d1fae5', marginBottom: 16 }}>
                                        <QrCode size={18} color="#059669" />
                                        <div>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>VERIFIED UPI ADDRESS</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#064e3b' }}>{selectedTeacherProfile.bankDetails.upiId}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="mf" style={{ marginBottom: 24 }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>TRANSACTION ID / REF</label>
                                    <input type="text" placeholder="Optional reference #" value={payData.transactionId} onChange={e => setPayData({ ...payData, transactionId: e.target.value })} style={{ borderRadius: sharpRadius }} />
                                </div>

                                <div style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: sharpRadius }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#991b1b', marginBottom: 8, display: 'block' }}>SECURITY VERIFICATION (ADMIN PASSWORD) *</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#fca5a5' }} />
                                        <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required placeholder="Required to authorize transaction" style={{ borderRadius: sharpRadius, paddingLeft: 36, border: '1px solid #fca5a5' }} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '24px 32px', borderTop: `1px solid ${borderColor}`, background: '#f8fafc', display: 'flex', gap: 12 }}>
                                <button type="button" onClick={() => setShowPayModal(false)} style={{ flex: 1, height: 44, borderRadius: sharpRadius, border: `1px solid ${borderColor}`, background: '#fff', color: '#64748b', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>CANCEL</button>
                                <button type="submit" disabled={payLoading} style={{ flex: 2, height: 44, background: payLoading ? '#94a3b8' : primaryColor, color: '#fff', borderRadius: sharpRadius, border: 'none', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    {payLoading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={18} />}
                                    AUTHORIZE DISBURSEMENT
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Receipt Preview Modal */}
            <ReceiptPreviewModal
                isOpen={previewPdf.isOpen}
                onClose={() => setPreviewPdf({ ...previewPdf, isOpen: false })}
                blobUrl={previewPdf.blobUrl}
                filename={previewPdf.filename}
                onDownload={() => {
                    const link = document.createElement('a');
                    link.href = previewPdf.blobUrl;
                    link.download = previewPdf.filename;
                    link.click();
                }}
            />
        </ERPLayout>
    );
};

export default TeacherPayrollDashboard;