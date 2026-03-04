import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ERPLayout from '../components/ERPLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReceiptPreviewModal from '../components/fees/ReceiptPreviewModal';
import {
    Search, Plus, Download, Filter,
    MoreHorizontal, ArrowUpRight, ArrowDownRight,
    Calendar, Users, Wallet, AlertCircle,
    ChevronLeft, ChevronRight, Loader2,
    History, Receipt, CreditCard, Landmark, LineChart, IndianRupee, Trash2,
    Clock, PlusCircle
} from 'lucide-react';
import RecordPaymentModal from '../components/fees/RecordPaymentModal';
import PaymentHistoryModal from '../components/fees/PaymentHistoryModal';
import CreateFeeModal from '../components/fees/CreateFeeModal';
import AddExpenseModal from '../components/fees/AddExpenseModal';
import ActionModal from '../components/common/ActionModal';

import { API_BASE_URL } from '../api/apiConfig';

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const FeesPage = () => {
    const navigate = useNavigate();
    const [fees, setFees] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [batchId, setBatchId] = useState('');
    const [course, setCourse] = useState('');
    const [batches, setBatches] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTP] = useState(1);
    const [total, setTotal] = useState(0);
    const [modal, setModal] = useState(false); // 'generate' | 'history' | 'payment' | 'create' | false
    const [selFee, setSelFee] = useState(null);
    const [genForm, setGenForm] = useState({ month: '', year: (new Date().getFullYear().toString()), dueDate: '' });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkForm, setBulkForm] = useState({ title: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

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

    const loadBatches = async () => {
        try {
            const { data } = await API().get('/batches');
            setBatches(Array.isArray(data.batches) ? data.batches : []);
        } catch { }
    };

    const loadMetrics = async () => {
        try { const { data } = await API().get('/fees/metrics'); setMetrics(data); } catch { }
    };

    const load = useCallback(async () => {
        if (!localStorage.getItem('token')) { navigate('/login'); return; }

        const isAllRecords = status === 'all';
        const isDefaultLoad = !search && !status && !batchId && !course && !isAllRecords;

        setLoading(true);
        try {
            const limit = isDefaultLoad ? 5 : 10;
            const apiStatus = status === 'all' ? '' : status;
            const params = { search, page, status: apiStatus, batchId, course, limit };
            const { data } = await API().get('/fees', { params });
            if (data) {
                if (page === 1) {
                    setFees(data.fees || []);
                } else {
                    setFees(prev => {
                        const existingIds = new Set(prev.map(f => f._id));
                        const newFees = (data.fees || []).filter(f => !existingIds.has(f._id));
                        return [...prev, ...newFees];
                    });
                }
                setTP(data.pages || 1);
                setTotal(data.total || 0);
            }
        } catch (e) {
            if (e.response?.status === 401) navigate('/login');
        } finally { setLoading(false); }
    }, [search, status, batchId, course, page, navigate]);

    useEffect(() => { loadMetrics(); loadBatches(); }, []);
    useEffect(() => {
        load();
        setSelectedIds([]); // Clear selection when filters change
    }, [load]);

    // De-bounced search
    useEffect(() => {
        const t = setTimeout(() => { if (search) load(); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const [previewPdf, setPreviewPdf] = useState({ isOpen: false, blobUrl: null, filename: '' });

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
        return inWords(num) + ' RUPEES ONLY.';
    };

    const generateReceipt = async (feeData, paymentData, previewOnly = false) => {
        const paymentAmount = Number(paymentData.paidAmount || paymentData.amount || 0);
        const receiptNo = paymentData.receiptNo;
        const mode = paymentData.mode || paymentData.paymentMethod || 'Cash';
        const txnId = paymentData.transactionId || 'N/A';
        const bankName = paymentData.bankName || 'N/A';
        const journalNo = paymentData.journalNo || 'N/A';
        const rawDate = paymentData.date ? new Date(paymentData.date) : new Date();
        const dateStr = rawDate.toLocaleDateString('en-GB');

        const settings = JSON.parse(localStorage.getItem('instituteSettings') || '{}');
        const coachingName = settings.coachingName || 'ERP ACADEMY';
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        const student = feeData.studentId || {};
        const logoUrl = settings.instituteLogo ? (settings.instituteLogo.startsWith('http') ? settings.instituteLogo : `${API_BASE_URL}${settings.instituteLogo}`) : null;

        // --- Watermark ---
        if (logoUrl) {
            try {
                const imgBase64 = await new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.globalAlpha = 0.1; // apply transparency at canvas level
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    };
                    img.onerror = () => resolve(null);
                    img.src = logoUrl;
                });

                if (imgBase64) {
                    doc.addImage(imgBase64, 'PNG', 55, 100, 100, 100);
                } else {
                    doc.setFontSize(60);
                    doc.setTextColor(240, 240, 245);
                    doc.text(coachingName.toUpperCase(), 105, 148, { align: 'center', angle: 45 });
                    doc.setTextColor(0, 0, 0);
                }
            } catch (e) {
                console.log(e);
            }
        } else {
            doc.setFontSize(60);
            doc.setTextColor(240, 240, 245);
            doc.text(coachingName.toUpperCase(), 105, 148, { align: 'center', angle: 45 });
            doc.setTextColor(0, 0, 0);
        }

        // --- Header Section (Centered Logo + Info) ---
        let headerY = 15;
        if (logoUrl) {
            try {
                const logoBase64 = await new Promise((resolve) => {
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
                    img.src = logoUrl;
                });
                if (logoBase64) {
                    doc.addImage(logoBase64, 'PNG', 95, 10, 20, 20); // Centered logo
                    headerY = 35;
                }
            } catch (e) {
                console.log(e);
            }
        }

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(coachingName.toUpperCase(), 105, headerY, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(settings.instituteAddress || 'Institute Campus Address...', 105, headerY + 6, { align: 'center' });
        doc.text(`Phone: ${settings.institutePhone || '+91 0000000000'} | Email: ${settings.instituteEmail || 'info@institute.ac.in'}`, 105, headerY + 12, { align: 'center' });
        headerY += 15;

        doc.setDrawColor(200);
        doc.line(15, headerY, 195, headerY);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('FEE PAYMENT RECEIPT', 105, headerY + 8, { align: 'center' });

        // --- Student & Payment Information Section ---
        let y = headerY + 17;
        doc.setFontSize(9);
        const col1_X = 15;
        const col1_ValX = 45;
        const col2_X = 110;
        const col2_ValX = 145;

        const drawPair = (lLabel, lVal, rLabel, rVal, currentY) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${lLabel}:`, col1_X, currentY);
            if (rLabel) doc.text(`${rLabel}:`, col2_X, currentY);

            doc.setFont('helvetica', 'normal');

            const lValStr = String(lVal);
            const rValStr = String(rVal || '');

            const lLines = doc.splitTextToSize(lValStr, 60);
            doc.text(lLines, col1_ValX, currentY);

            let rLines = [];
            if (rLabel) {
                rLines = doc.splitTextToSize(rValStr, 50);
                doc.text(rLines, col2_ValX, currentY);
            }

            const maxLines = Math.max(lLines.length, rLines.length);
            return currentY + (maxLines * 5) + 2; // Return the new Y position
        };

        const currentStudent = feeData.studentId || feeData.student || student || {};

        y = drawPair('Name', currentStudent.name?.toUpperCase() || 'N/A', 'Receipt No', receiptNo || 'N/A', y);
        y = drawPair('S/O/D/O', currentStudent.fatherName?.toUpperCase() || 'N/A', 'Receipt Date', dateStr, y);
        y = drawPair('Mother Name', currentStudent.motherName?.toUpperCase() || 'N/A', 'Payment Mode', mode.toUpperCase(), y);
        y = drawPair('Student ID', currentStudent.rollNo || 'N/A', 'Transaction ID', txnId, y);
        y = drawPair('Course', currentStudent.className?.toUpperCase() || 'N/A', 'Transaction Date', dateStr, y);
        y = drawPair('Fin. Session', currentStudent.session || '2025/26', '', '', y);
        y = drawPair('Domicile', 'State Domicile', '', '', y);
        y = drawPair('Address', (currentStudent.address || 'N/A').replace(/\n/g, ' ').slice(0, 150), '', '', y);

        y += 12;

        // --- Chronological Historical Deductions ---
        let historicalRemaining = 0;
        let found = false;

        if (feeData.paymentHistory && feeData.paymentHistory.length > 0) {
            for (const p of feeData.paymentHistory) {
                if ((paymentData._id && p._id === paymentData._id) || (paymentData.receiptNo && p.receiptNo === paymentData.receiptNo)) {
                    found = true;
                    break;
                }
                historicalRemaining += (p.paidAmount || 0);
            }
            if (!found) {
                historicalRemaining = feeData.paymentHistory.reduce((s, p) => s + (p.paidAmount || 0), 0);
            }
        }

        let mutableHistoricalRemaining = historicalRemaining;
        const drainHist = (amt) => {
            const drained = Math.min(amt, mutableHistoricalRemaining);
            mutableHistoricalRemaining -= drained;
            return drained;
        };

        let currentPaymentRemaining = paymentAmount;
        const distribute = (amt, alreadyPaidOffAmt = 0) => {
            const actualRemainingToPayForThisItem = amt - alreadyPaidOffAmt;
            const paidAmt = Math.min(actualRemainingToPayForThisItem, currentPaymentRemaining);
            currentPaymentRemaining -= paidAmt;
            return paidAmt;
        };

        // --- Fee Breakdown Table ---
        const feeBodyLines = [];

        const totalTuitionDue = feeData.monthlyTuitionFee || 0;
        const totalRegDue = feeData.registrationFee || 0;
        const totalFineDue = feeData.fine || 0;

        const histTuition = drainHist(totalTuitionDue);
        const histReg = drainHist(totalRegDue);
        const histFine = drainHist(totalFineDue);

        const t = distribute(totalTuitionDue, histTuition);
        if (t > 0 || totalTuitionDue > 0) feeBodyLines.push([`Tuition Fee (${feeData.month} ${feeData.year})`, totalTuitionDue.toLocaleString()]);

        const r = distribute(totalRegDue, histReg);
        if (r > 0 || totalRegDue > 0) feeBodyLines.push(['Registration Fee', totalRegDue.toLocaleString()]);

        const f = distribute(totalFineDue, histFine);
        if (f > 0 || totalFineDue > 0) feeBodyLines.push(['Late Fine / Penalty', totalFineDue.toLocaleString()]);

        if (feeData.otherExpenses && feeData.otherExpenses.length > 0) {
            feeData.otherExpenses.forEach(exp => {
                const histExp = drainHist(exp.amount || 0);
                const ex = distribute(exp.amount || 0, histExp);
                feeBodyLines.push([exp.title || 'Other Expense', (exp.amount || 0).toLocaleString()]);
            });
        }

        autoTable(doc, {
            startY: y,
            head: [['Fee Type', 'Amount (RS.)']],
            body: feeBodyLines,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 50, halign: 'right' } },
            margin: { left: 20 }
        });

        const tableEnd = doc.lastAutoTable.finalY + 5;

        const totalReceivedTillThisReceipt = historicalRemaining + paymentAmount;
        const totalBalanceAfterThisReceipt = (feeData.totalFee || 0) - totalReceivedTillThisReceipt;

        // --- Totals ---
        autoTable(doc, {
            startY: tableEnd,
            margin: { left: 90 },
            body: [
                ['Subtotal :', (feeData.totalFee || 0).toLocaleString()],
                ['Total Amount Paid :', paymentAmount.toLocaleString()],
                ['Balance Amount :', totalBalanceAfterThisReceipt.toLocaleString()],
            ],
            theme: 'plain',
            styles: { fontSize: 9, fontStyle: 'bold', halign: 'right' },
            columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 30, halign: 'right' } }
        });

        let currentY = doc.lastAutoTable.finalY + 15;

        // --- Amount In Words Section ---
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Amount (In Words):', 15, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${numberToWords(paymentAmount).toUpperCase()}`, 15, currentY + 6);

        // --- Status Section ---
        let statusText = 'PENDING';
        let statusColor = [220, 38, 38]; // Red
        if (totalBalanceAfterThisReceipt <= 0) {
            statusText = 'PAID';
            statusColor = [22, 163, 74]; // Green
        } else if (totalReceivedTillThisReceipt > 0) {
            statusText = 'PARTIAL / PENDING';
            statusColor = [234, 88, 12]; // Orange
        }

        doc.setFont('helvetica', 'bold');
        doc.setFillColor(...statusColor);
        doc.rect(195 - 40, currentY - 5, 40, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(statusText, 195 - 20, currentY + 0.5, { align: 'center', baseline: 'middle' });
        doc.setTextColor(0, 0, 0);

        // --- Footer Section ---
        const footerY = 260;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('System Generated Receipt', 15, footerY + 10);

        doc.text('AUTHORIZED SIGNATURE', 195 - 15, footerY + 10, { align: 'right' });
        doc.setDrawColor(0);
        doc.line(195 - 65, footerY + 5, 195, footerY + 5);

        if (previewOnly) {
            return doc.output('bloburl');
        } else {
            doc.save(`Receipt_${receiptNo || currentStudent.rollNo || 'N/A'}.pdf`);
        }
    };

    const handleRecordPayment = async (formData) => {
        setActionState({
            isOpen: true,
            type: 'verify',
            title: 'Authorize Payment',
            desc: `You are recording a payment of ₹${formData.amountPaid} for "${selFee.studentId?.name}". Please enter admin password to confirm.`,
            onConfirm: (pwd) => confirmPayment(formData, pwd),
            loading: false,
            error: ''
        });
    };

    const confirmPayment = async (formData, pwd) => {
        setActionState(prev => ({ ...prev, loading: true, error: '' }));
        try {
            const { data } = await API().post(`/fees/${selFee._id}/pay`, { ...formData, adminPassword: pwd });
            if (data.receiptNo) {
                const pData = { ...formData, amount: parseFloat(formData.amountPaid), receiptNo: data.receiptNo, date: new Date() };
                const url = await generateReceipt({ ...selFee, ...formData }, pData, true);
                setPreviewPdf({ isOpen: true, blobUrl: url, filename: `Receipt_${data.receiptNo}.pdf` });
            }
            setActionState(prev => ({ ...prev, isOpen: false }));
            setModal(false);
            load();
            loadMetrics();
        } catch (e) {
            setActionState(prev => ({ ...prev, loading: false, error: e.response?.data?.message || 'Authorization failed' }));
        }
    };

    const handleCreateFee = (formData) => {
        setActionState({
            isOpen: true,
            type: 'verify',
            title: 'Authorize Fee Creation',
            desc: `You are creating a manual fee record for student. This will alter the student's financial ledger. Please verify.`,
            onConfirm: (pwd) => confirmCreateFee(formData, pwd),
            loading: false,
            error: ''
        });
    };

    const confirmCreateFee = async (formData, pwd) => {
        setActionState(prev => ({ ...prev, loading: true, error: '' }));
        try {
            await API().post('/fees', { ...formData, adminPassword: pwd });
            setActionState(prev => ({ ...prev, isOpen: false }));
            setModal(false);
            load();
            loadMetrics();
        } catch (e) {
            setActionState(prev => ({ ...prev, loading: false, error: e.response?.data?.message || 'Authorization failed' }));
        }
    };

    const generate = (e) => {
        e.preventDefault();
        setActionState({
            isOpen: true,
            type: 'warning',
            title: 'Authorize Bulk Genesis',
            desc: `URGENT: This will generate fee records for ALL active students for ${genForm.month} ${genForm.year}. This is a major operation.`,
            onConfirm: (pwd) => confirmBulkGenesis(pwd),
            loading: false,
            error: ''
        });
    };

    const confirmBulkGenesis = async (pwd) => {
        setActionState(prev => ({ ...prev, loading: true, error: '' }));
        try {
            await API().post('/fees/generate', { ...genForm, adminPassword: pwd });
            setActionState(prev => ({ ...prev, isOpen: false }));
            setModal(false);
            load();
            loadMetrics();
        } catch (e) {
            setActionState(prev => ({ ...prev, loading: false, error: e.response?.data?.message || 'Bulk generation failed' }));
        }
    };

    const exportData = () => {
        if (fees.length === 0) {
            alert('No records to export');
            return;
        }
        const csvRows = [];
        const headers = ['Student Name', 'Roll No', 'Batch', 'Month', 'Year', 'Status', 'Total Amount', 'Paid Amount', 'Pending Amount', 'Due Date'];
        csvRows.push(headers.join(','));

        fees.forEach(f => {
            const student = f.studentId?.name || 'Deactivated';
            const roll = f.studentId?.rollNo || 'N/A';
            const batch = f.batchId?.name || 'N/A';
            const due = f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-IN') : 'N/A';

            csvRows.push([
                `"${student}"`, `"${roll}"`, `"${batch}"`, f.month, f.year, f.status,
                f.totalFee || 0, f.amountPaid || 0, f.pendingAmount || 0, `"${due}"`
            ].join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Fees_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };



    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(fees.map(f => f._id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleBulkSurcharge = (formData) => {
        setActionState({
            isOpen: true,
            type: 'verify',
            title: 'Authorize Bulk Surcharge',
            desc: `Applying ₹${formData.amount} surcharge to ${selectedIds.length} students. This will alter multiple financial records. Authorize?`,
            onConfirm: (pwd) => confirmBulkSurcharge(formData, pwd),
            loading: false,
            error: ''
        });
    };

    const confirmBulkSurcharge = async (formData, pwd) => {
        setActionState(prev => ({ ...prev, loading: true, error: '' }));
        try {
            await API().post('/fees/bulk-surcharge', { ...formData, feeIds: selectedIds, adminPassword: pwd });
            setActionState(prev => ({ ...prev, isOpen: false }));
            setSelectedIds([]);
            setModal(false);
            load();
            loadMetrics();
        } catch (e) {
            setActionState(prev => ({ ...prev, loading: false, error: e.response?.data?.message || 'Bulk operation failed' }));
        }
    };

    const fmt = n => (n || 0).toLocaleString('en-IN');

    // Stats Configuration
    const stats = [
        { label: 'Total Revenue', value: '₹' + fmt(metrics?.totalCollected), icon: Wallet, color: 'indigo', bg: 'bg-indigo-500/10', text: 'text-indigo-600' },
        { label: `Pending Dues (${metrics?.pendingStudents || 0} Students)`, value: '₹' + fmt(metrics?.totalPending), icon: Clock, color: 'blue', bg: 'bg-blue-500/10', text: 'text-blue-600' },
        { label: 'Overdue Dues', value: '₹' + fmt(metrics?.overdueAmount), icon: AlertCircle, color: 'red', bg: 'bg-red-500/10', text: 'text-red-600' },
        { label: 'This Month', value: '₹' + fmt(metrics?.monthlyCollection), icon: LineChart, color: 'indigo', bg: 'bg-indigo-500/10', text: 'text-indigo-600' },
    ];

    const getStatusStyles = (s) => {
        switch (s) {
            case 'paid': return 'bg-green-50 text-green-700 border-green-100 ring-green-500/10';
            case 'partial': return 'bg-amber-50 text-amber-700 border-amber-100 ring-amber-500/10';
            case 'overdue': return 'bg-red-50 text-red-700 border-red-100 ring-red-500/10';
            default: return 'bg-slate-50 text-slate-700 border-slate-100 ring-slate-500/10';
        }
    };


    return (
        <ERPLayout title="Fee Management">
            {/* ── Page Header ─────────────────────────────── */}
            <div className="page-hdr">
                <div>
                    <h1>Fee Management</h1>
                    <p>Financial tracking and student billing system</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-outline" onClick={() => setModal('create')}>
                        <PlusCircle size={15} /> Manual Fee
                    </button>
                    <button className="btn btn-primary" onClick={() => { setModal('generate'); setGenForm({ month: '', year: (new Date().getFullYear().toString()), dueDate: '' }); }}>
                        <Plus size={15} /> Bulk Genesis
                    </button>
                </div>
            </div>

            {/* ── Metrics Grid ──────────────────────────────── */}
            <div className="stats-grid">
                {stats.map((s, i) => (
                    <div key={i} className="stat-card">
                        <div className={`stat-icon ic-indigo`}>
                            <s.icon size={22} className={s.text} />
                        </div>
                        <div>
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value">{s.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filter Bar ──────────────────────────────── */}
            <div className="card toolbar rounded-md" style={{ marginBottom: 20 }}>
                <div className="tb-search-wrap">
                    <Search size={15} />
                    <input
                        className="tb-search"
                        placeholder="Search student or roll number…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <select
                    className="tb-select"
                    style={{ minWidth: 160 }}
                    value={status}
                    onChange={e => { setStatus(e.target.value); setPage(1); }}
                >
                    <option value="">Select Filter</option>
                    <option value="all">All Records</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="overdue">Overdue</option>
                    <option value="pending">Pending</option>
                </select>
                <select
                    className="tb-select"
                    style={{ minWidth: 200 }}
                    value={batchId}
                    onChange={e => { setBatchId(e.target.value); setPage(1); }}
                >
                    <option value="">Batches</option>
                    {Array.isArray(batches) && batches.map(b => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                </select>
                <button className="btn btn-outline btn-sm" onClick={exportData}>
                    <Download size={13} /> Export
                </button>
            </div>

            {/* ── Transactions Table ────────────────────────── */}
            <div className="card">
                {loading && page === 1 ? (
                    <div className="loader-wrap"><div className="spinner" /><p>Loading transactions…</p></div>
                ) : fees.length === 0 ? (
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
                    <div className="erp-table-wrap">
                        <table className="erp-table">
                            <thead>
                                <tr>
                                    <th className="w-10 text-center">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-sm checkbox-primary"
                                            checked={fees.length > 0 && selectedIds.length === fees.length}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th>Student</th>
                                    <th>Period</th>
                                    <th>Financials</th>
                                    <th>Timeline</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fees.map(f => (
                                    <tr key={f._id} className={selectedIds.includes(f._id) ? 'bg-indigo-50/50' : ''}>
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-sm checkbox-primary"
                                                checked={selectedIds.includes(f._id)}
                                                onChange={() => toggleSelect(f._id)}
                                            />
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="tb-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                                                    {f.studentId?.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="td-bold">{f.studentId?.name || 'Deactivated'}</div>
                                                    <div className="td-sm">{f.studentId?.rollNo} • {f.batchId?.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="td-bold">{f.month} {f.year}</div>
                                        </td>
                                        <td>
                                            <div className="td-bold">₹{fmt(f.totalFee || 0)}</div>
                                            <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                                                <span style={{ fontSize: '0.65rem', color: 'var(--erp-success)', fontWeight: 700 }}>Pd: ₹{fmt(f.amountPaid)}</span>
                                                {f.pendingAmount > 0 && (
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--erp-accent)', fontWeight: 700 }}>Rem: ₹{fmt(f.pendingAmount)}</span>
                                                )}
                                                <span style={{ fontSize: '0.65rem', color: 'var(--erp-muted)', fontWeight: 700 }}>Tui: ₹{fmt(f.monthlyTuitionFee || 0)}</span>
                                                {f.registrationFee > 0 && (
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--erp-primary)', fontWeight: 700, background: 'rgba(27,58,122,0.1)', padding: '0 4px', borderRadius: '4px' }}>Reg: ₹{fmt(f.registrationFee)}</span>
                                                )}
                                                {f.otherExpenses?.length > 0 && (
                                                    <span style={{ fontSize: '0.65rem', color: '#ca8a04', fontWeight: 700, background: 'rgba(202,138,4,0.1)', padding: '0 4px', borderRadius: '4px' }}>
                                                        Exp: ₹{fmt(f.otherExpenses.reduce((s, e) => s + (e.amount || 0), 0))}
                                                    </span>
                                                )}
                                                {f.fine > 0 && (
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--erp-error)', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '0 4px', borderRadius: '4px' }}>Fine: ₹{fmt(f.fine)}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.8rem', color: f.status === 'overdue' ? 'var(--erp-error)' : 'inherit' }}>
                                                {f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                            </div>
                                            <div className="td-sm">Due Date</div>
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge ${f.status === 'paid' ? 'badge-active' : f.status === 'overdue' ? 'badge-overdue' : ''}`}
                                                style={{
                                                    background: f.status === 'partial' ? '#fffbeb' : '',
                                                    color: f.status === 'partial' ? '#d97706' : '',
                                                    border: f.status === 'partial' ? '1px solid #fde68a' : ''
                                                }}>
                                                {f.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex justify-end gap-2">
                                                <button className="btn btn-outline btn-sm" onClick={() => { setSelFee(f); setModal('history'); }} title="History">
                                                    <History size={13} />
                                                </button>
                                                {f.status !== 'paid' && (
                                                    <button className="btn btn-primary btn-sm" onClick={() => { setSelFee(f); setModal('payment'); }} title="Pay">
                                                        <CreditCard size={13} />
                                                    </button>
                                                )}
                                                <button className="btn btn-primary btn-sm" style={{ background: '#ca8a04', borderColor: '#ca8a04' }} onClick={() => { setSelFee(f); setModal('expense'); }} title="Add Expense">
                                                    <PlusCircle size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Pagination ────────────────────────────────── */}
            {fees.length > 0 && (
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="td-sm text-slate-500">Showing {fees.length} of {total} records</div>
                    {page < totalPages && (
                        <button className="btn btn-outline" disabled={loading} onClick={() => setPage(p => p + 1)}>
                            {loading ? <><Loader2 size={16} className="spin" /> Loading...</> : 'Load More'}
                        </button>
                    )}
                </div>
            )}

            {/* Modals */}
            {modal === 'payment' && selFee && (
                <RecordPaymentModal
                    fee={selFee}
                    onClose={() => setModal(false)}
                    onSave={handleRecordPayment}
                />
            )}

            {modal === 'history' && selFee && (
                <PaymentHistoryModal
                    fee={selFee}
                    isOpen={modal === 'history'}
                    onClose={() => setModal(false)}
                    onViewReceipt={async (payment) => {
                        setModal(false); // close history first to avoid modal stacking
                        const url = await generateReceipt(selFee, payment, true);
                        setPreviewPdf({ isOpen: true, blobUrl: url, filename: `Receipt_${payment.receiptNo}.pdf` });
                    }}
                />
            )}

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

            {modal === 'create' && (
                <CreateFeeModal
                    onClose={() => setModal(false)}
                    onSave={handleCreateFee}
                />
            )}

            {modal === 'expense' && selFee && (
                <AddExpenseModal
                    fee={selFee}
                    onClose={() => setModal(false)}
                    onSave={() => { load(); loadMetrics(); }}
                />
            )}

            {modal === 'generate' && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal" style={{ maxWidth: 460 }}>
                        <div style={{ padding: '24px', background: 'var(--erp-primary)', color: '#fff' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Bulk Genesis</h2>
                            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: 4 }}>Generate fees for all active students</p>
                        </div>
                        <form onSubmit={generate}>
                            <div className="modal-body" style={{ padding: '24px' }}>
                                {err && <div className="alert alert-error">{err}</div>}
                                <div className="mf-row">
                                    <div className="mf">
                                        <label>Month</label>
                                        <select value={genForm.month} onChange={e => setGenForm({ ...genForm, month: e.target.value })} required>
                                            <option value="">Select Month</option>
                                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mf">
                                        <label>Year</label>
                                        <input value={genForm.year} onChange={e => setGenForm({ ...genForm, year: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="mf">
                                    <label>Due Date</label>
                                    <input type="date" value={genForm.dueDate} onChange={e => setGenForm({ ...genForm, dueDate: e.target.value })} required />
                                </div>
                                <div className="alert alert-success" style={{ marginTop: 16 }}>
                                    <AlertCircle size={16} />
                                    <span style={{ fontSize: '0.8rem' }}>System will auto-calculate based on batch settings.</span>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ padding: '16px 24px', background: 'var(--erp-bg2)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <Loader2 className="spin" size={14} /> : 'Process Bulk'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {modal === 'bulk-expense' && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal" style={{ maxWidth: 480 }}>
                        <div style={{ padding: '24px', background: '#ca8a04', color: '#fff' }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <PlusCircle size={24} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Bulk Surcharge</h2>
                                    <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>Add expense to {selectedIds.length} records</p>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleBulkSurcharge(bulkForm); }}>
                            <div className="modal-body" style={{ padding: '24px' }}>
                                <div className="mf">
                                    <label>Surcharge Title</label>
                                    <input
                                        placeholder="e.g. Festival Charges, Exam Fee..."
                                        value={bulkForm.title}
                                        onChange={e => setBulkForm({ ...bulkForm, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="mf-row mt-4">
                                    <div className="mf">
                                        <label>Amount (₹)</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={bulkForm.amount}
                                            onChange={e => setBulkForm({ ...bulkForm, amount: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="mf">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            value={bulkForm.date}
                                            onChange={e => setBulkForm({ ...bulkForm, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="mf mt-4">
                                    <label>Notes (Optional)</label>
                                    <textarea
                                        placeholder="Reason for surcharge..."
                                        style={{ height: 80 }}
                                        value={bulkForm.description}
                                        onChange={e => setBulkForm({ ...bulkForm, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer" style={{ padding: '16px 24px', background: 'var(--erp-bg2)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ background: '#ca8a04', borderColor: '#ca8a04' }}>
                                    Apply to {selectedIds.length} Students
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[900] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-8 min-w-[400px]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold text-lg">
                                {selectedIds.length}
                            </div>
                            <div>
                                <div className="text-sm font-bold">Selected Records</div>
                                <div className="text-[10px] text-slate-400 font-medium">Bulk operations ready</div>
                            </div>
                        </div>

                        <div className="h-10 w-px bg-slate-700"></div>

                        <div className="flex gap-3">
                            <button
                                className="btn btn-sm btn-outline  !border-slate-700 hover:!bg-slate-800"
                                onClick={() => setSelectedIds([])}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-sm bg-[#ca8a04] hover:bg-[#a16207] border-none text-white flex gap-2"
                                onClick={() => {
                                    setBulkForm({ title: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
                                    setModal('bulk-expense');
                                }}
                            >
                                <PlusCircle size={14} /> Add Surcharge
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

export default FeesPage;
