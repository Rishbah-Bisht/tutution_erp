import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, FileDown } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import ToastContainer, { useToast } from '../components/Toast';
import ActionModal from '../components/common/ActionModal';

// Expense Components
import ExpenseStats from '../components/expenses/ExpenseStats';
import ExpenseFilters from '../components/expenses/ExpenseFilters';
import ExpenseTable from '../components/expenses/ExpenseTable';
import ExpenseFormModal from '../components/expenses/ExpenseFormModal';
import ExpenseDetailsModal from '../components/expenses/ExpenseDetailsModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { API_BASE_URL } from '../api/apiConfig';

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const ExpensesPage = () => {
    const navigate = useNavigate();
    const { toasts, toast, removeToast } = useToast();

    // Core Data State
    const [expenses, setExpenses] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    // Pagination & Total
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters State
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [paymentMode, setPaymentMode] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal States
    const [showForm, setShowForm] = useState(false);
    const [formMode, setFormMode] = useState('create');
    const [editExpense, setEditExpense] = useState(null);

    const [showDetails, setShowDetails] = useState(false);
    const [detailExpense, setDetailExpense] = useState(null);

    const [showDel, setShowDel] = useState(false);
    const [delExpenseId, setDelExpenseId] = useState(null);
    const [delLoading, setDelLoading] = useState(false);
    const [delError, setDelError] = useState('');

    const [showPay, setShowPay] = useState(false);
    const [payExpenseId, setPayExpenseId] = useState(null);
    const [payLoading, setPayLoading] = useState(false);
    const [payError, setPayError] = useState('');

    // --- Data Fetching ---
    const loadMetrics = useCallback(async () => {
        try {
            const { data } = await API().get('/expenses/metrics');
            setMetrics(data.metrics);
        } catch (e) {
            console.error('Failed to load metrics', e);
        }
    }, []);

    const loadExpenses = useCallback(async () => {
        if (!localStorage.getItem('token')) { navigate('/login'); return; }

        const isDefaultLoad = !search && !category && !paymentMode && !startDate && !endDate;

        setLoading(true);
        try {
            const limit = isDefaultLoad ? 5 : 10;
            const params = { page, limit };

            if (search) params.search = search;
            if (category) params.category = category;
            if (paymentMode) params.paymentMode = paymentMode;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const { data } = await API().get('/expenses', { params });

            if (page === 1) {
                setExpenses(data.expenses || []);
            } else {
                setExpenses(prev => {
                    const existingIds = new Set(prev.map(e => e._id));
                    const newExps = (data.expenses || []).filter(e => !existingIds.has(e._id));
                    return [...prev, ...newExps];
                });
            }

            setTotalPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch (e) {
            if (e.response?.status === 401) navigate('/login');
            else toast.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    }, [search, category, paymentMode, startDate, endDate, page, navigate, toast]);

    // Initial Load
    useEffect(() => {
        loadMetrics();
    }, [loadMetrics]);

    useEffect(() => {
        loadExpenses();
    }, [loadExpenses]);

    // Reset page to 1 on filter changes
    useEffect(() => { setPage(1); }, [category, paymentMode, startDate, endDate]);
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); loadExpenses(); }, 400);
        return () => clearTimeout(t);
    }, [search]); // eslint-disable-line

    const clearFilters = () => {
        setSearch(''); setCategory(''); setPaymentMode(''); setStartDate(''); setEndDate(''); setPage(1);
    };

    // --- Handlers ---
    const openCreate = () => {
        setFormMode('create');
        setEditExpense(null);
        setShowForm(true);
    };

    const openDetails = (expense) => {
        setDetailExpense(expense);
        setShowDetails(true);
    };

    const downloadPDF = async (expense) => {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const settings = JSON.parse(localStorage.getItem('instituteSettings') || '{}');
        const coachingName = settings.instituteName || 'ERP ACADEMY';
        const coachingAddress = settings.instituteAddress || 'Institute Address';
        const coachingPhone = settings.primaryPhone || '+91 0000000000';
        const coachingEmail = settings.primaryEmail || 'info@institute.com';
        const logoUrl = settings.instituteLogo ? (settings.instituteLogo.startsWith('http') ? settings.instituteLogo : `${API_BASE_URL}${settings.instituteLogo}`) : null;

        // --- Watermark (Standardized) ---
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
                        ctx.globalAlpha = 0.1;
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    };
                    img.onerror = () => resolve(null);
                    img.src = logoUrl;
                });
                if (imgBase64) doc.addImage(imgBase64, 'PNG', 55, 100, 100, 100);
            } catch (e) { console.log(e); }
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
            } catch (e) { console.log(e); }
        }

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(coachingName.toUpperCase(), 105, headerY, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(coachingAddress, 105, headerY + 6, { align: 'center' });
        doc.text(`Phone: ${coachingPhone} | Email: ${coachingEmail}`, 105, headerY + 12, { align: 'center' });
        headerY += 15;

        doc.setDrawColor(200);
        doc.line(15, headerY, 195, headerY);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('EXPENSE RECEIPT', 105, headerY + 10, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        let currentY = headerY + 25;

        const drawRow = (label, value) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, 15, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value || 'N/A'), 50, currentY);
            currentY += 8;
        };

        drawRow('Expense Title', expense.title);
        drawRow('Amount', `Rs ${fmt(expense.amount)}`);
        drawRow('Date', new Date(expense.date).toLocaleDateString());
        drawRow('Category', expense.category);
        drawRow('Payment Mode', expense.paymentMode);
        drawRow('Status', expense.status.toUpperCase());

        if (expense.description) {
            doc.setFont('helvetica', 'bold');
            doc.text('Description:', 15, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(expense.description, 50, currentY, { maxWidth: 140 });
        }

        doc.save(`Expense_${expense._id.slice(-6).toUpperCase()}.pdf`);
        toast.success('PDF Downloaded successfully');
    };

    const handleMarkPaidClick = (id) => {
        setPayError('');
        setPayExpenseId(id);
        setShowPay(true);
    };

    const confirmPay = async (password) => {
        setPayLoading(true); setPayError('');
        try {
            await API().put(`/expenses/${payExpenseId}/pay`, { adminPassword: password });
            toast.success('Expense marked as Paid');
            setShowPay(false);
            setPayExpenseId(null);
            loadExpenses();
            loadMetrics();
        } catch (error) {
            console.error('Error marking paid:', error);
            setPayError(error.response?.data?.message || 'Failed to update expense status');
        } finally {
            setPayLoading(false);
        }
    };

    const openDelete = (id) => {
        setDelError('');
        setDelExpenseId(id);
        setShowDel(true);
    };

    const confirmDelete = async (password) => {
        setDelLoading(true); setDelError('');
        try {
            await API().delete(`/expenses/${delExpenseId}`, { data: { adminPassword: password } });
            toast.success('Expense deleted successfully');
            setShowDel(false);
            setDelExpenseId(null);
            setPage(1);
            loadExpenses();
            loadMetrics();
        } catch (e) {
            setDelError(e.response?.data?.message || 'Delete failed. Check your password.');
        } finally {
            setDelLoading(false);
        }
    };

    const handleFormSuccess = () => {
        setShowForm(false);
        setPage(1);
        loadExpenses();
        loadMetrics();
    };

    const viewReceipt = (url) => {
        window.open(url.startsWith('http') ? url : `${API_BASE_URL}${url}`, '_blank');
    };

    const fmt = n => (Number(n) || 0).toLocaleString('en-IN');

    // --- Export ---
    const exportData = () => {
        if (expenses.length === 0) {
            toast.error('No records to export');
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Expenses Export Report', 14, 22);

        const tableColumn = ['Date', 'Title', 'Category', 'Payment Mode', 'Amount', 'Status'];
        const tableRows = [];

        expenses.forEach(e => {
            const date = new Date(e.date).toLocaleDateString('en-IN');
            const expenseData = [
                date,
                e.title || '',
                e.category || '',
                e.paymentMode || '',
                `Rs ${fmt(e.amount)}`,
                e.status || ''
            ];
            tableRows.push(expenseData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });

        doc.save(`Expenses_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
        toast.success('PDF Export generated successfully');
    };

    return (
        <ERPLayout title="Expense Management">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* Header */}
            <div className="page-hdr">
                <div>
                    <h1>Expense Management</h1>
                    <p>Track outgoing payments, bills, and institute costs</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportData}
                        style={{
                            background: '#fff', border: '1px solid var(--erp-border)',
                            color: 'var(--erp-text)', borderRadius: 'var(--radius-sm)',
                            padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500,
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        <FileDown size={14} /> Export PDF
                    </button>
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={15} /> Log New Expense
                    </button>
                </div>
            </div>

            {/* Dashboard Metrics */}
            <ExpenseStats metrics={metrics} fmt={fmt} />

            {/* Filters */}
            <ExpenseFilters
                search={search} setSearch={setSearch}
                category={category} setCategory={setCategory}
                paymentMode={paymentMode} setPaymentMode={setPaymentMode}
                startDate={startDate} setStartDate={setStartDate}
                endDate={endDate} setEndDate={setEndDate}
                exportData={exportData}
                clearFilters={clearFilters}
            />

            {/* Table */}
            <ExpenseTable
                expenses={expenses}
                loading={loading}
                page={page}
                setPage={setPage}
                totalPages={totalPages}
                total={total}
                onMarkPaid={handleMarkPaidClick}
                onViewDetails={openDetails}
                onDownloadPDF={downloadPDF}
                onDelete={openDelete}
                onViewReceipt={viewReceipt}
            />

            {/* Modals */}
            <ExpenseFormModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                mode={formMode}
                expense={editExpense}
                onSuccess={handleFormSuccess}
            />

            <ExpenseDetailsModal
                isOpen={showDetails}
                onClose={() => setShowDetails(false)}
                expense={detailExpense}
            />

            <ActionModal
                isOpen={showDel}
                title="Delete Expense Record"
                subTitle="This will permanently remove this financial record from the database."
                confirmText="Permanently Delete"
                actionType="danger"
                onClose={() => setShowDel(false)}
                onConfirm={confirmDelete}
                loading={delLoading}
                error={delError}
                requirePassword={true}
            />

            <ActionModal
                isOpen={showPay}
                title="Mark Expense as Paid"
                subTitle="Please enter the admin password to verify this payment."
                confirmText="Mark as Paid"
                actionType="success"
                onClose={() => setShowPay(false)}
                onConfirm={confirmPay}
                loading={payLoading}
                error={payError}
                requirePassword={true}
            />

        </ERPLayout>
    );
};

export default ExpensesPage;
