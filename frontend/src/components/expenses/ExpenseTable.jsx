import React from 'react';
import { Eye, Loader2, Receipt, Search, CheckCircle, FileDown } from 'lucide-react';

const ExpenseTable = ({
    expenses, loading, page, setPage, totalPages, total, onMarkPaid, onViewDetails, onDownloadPDF, onViewReceipt
}) => {

    const fmt = n => (Number(n) || 0).toLocaleString('en-IN');
    const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    if (loading && page === 1) {
        return (
            <div className="p-20 flex flex-col items-center gap-4 text-slate-400">
                <Loader2 className="spin" size={40} />
                <p className="font-medium">Fetching secure records...</p>
            </div>
        );
    }

    if (expenses.length === 0) {
        return (
            <div className="empty">
                <div className="empty-icon">
                    <Search size={40} strokeWidth={1.2} color="var(--erp-muted)" />
                </div>
                <p style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 6 }}>
                    No expenses found
                </p>
                <p className="td-sm" style={{ maxWidth: "280px", margin: "0 auto" }}>
                    Try adjusting your filters or date range to find the expense records.
                </p>
            </div>
        );
    }

    const catColors = {
        'Rent': { bg: '#fee2e2', text: '#ef4444' }, // red
        'Salary': { bg: '#dcfce7', text: '#22c55e' }, // green
        'Electricity': { bg: '#fef3c7', text: '#f59e0b' }, // yellow
        'Maintenance': { bg: '#e0f2fe', text: '#0ea5e9' }, // blue
        'Marketing': { bg: '#f3e8ff', text: '#a855f7' }, // purple
        'Supplies': { bg: '#ffedd5', text: '#f97316' }, // orange
        'Other': { bg: '#f1f5f9', text: '#64748b' } // slate
    };

    return (
        <div className="erp-table-wrap overflow-x-auto">
            <table className="erp-table w-full">
                <thead>
                    <tr>
                        <th className="!pl-6">Date</th>
                        <th>Expense Details</th>
                        <th>Category</th>
                        <th>Payment Mode</th>
                        <th>Amount</th>
                        <th className="text-right !pr-6">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {expenses.map(exp => {
                        const colors = catColors[exp.category] || catColors['Other'];
                        return (
                            <tr key={exp._id} className="hover:bg-slate-50 transition-colors">
                                <td className="!pl-6 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-slate-700">{fmtDate(exp.date)}</div>
                                    <div className="text-xs text-slate-400 font-medium">#{exp._id.slice(-6).toUpperCase()}</div>
                                </td>
                                <td>
                                    <div className="font-bold text-slate-800">{exp.title}</div>
                                    {exp.description && (
                                        <div className="text-xs text-slate-500 font-medium max-w-[200px] truncate" title={exp.description}>
                                            {exp.description}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <span className="px-2.5 py-1 rounded-md text-xs font-bold" style={{ backgroundColor: colors.bg, color: colors.text }}>
                                        {exp.category}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                                        {exp.paymentMode}
                                    </div>
                                </td>
                                <td>
                                    <div className="text-sm font-extrabold text-slate-800">₹{fmt(exp.amount)}</div>
                                    <div className={`text-[10px] uppercase font-bold ${exp.status === 'Pending' ? 'text-orange-500' : 'text-indigo-600'}`}>{exp.status}</div>
                                </td>
                                <td className="text-right !pr-6">
                                    <div className="flex justify-end gap-1">
                                        <button
                                            className="btn btn-ghost btn-outline btn-sm !text-slate-600"
                                            title="View Details"
                                            onClick={() => onViewDetails(exp)}
                                        >
                                            <Eye size={14} />
                                        </button>

                                        {exp.receiptUrl && (
                                            <button
                                                className="btn btn-ghost btn-outline btn-sm !text-purple-600"
                                                title="View Receipt"
                                                onClick={() => onViewReceipt(exp.receiptUrl)}
                                            >
                                                <Receipt size={14} />
                                            </button>
                                        )}
                                        {exp.status === 'Pending' && (
                                            <button
                                                className="btn btn-sm"
                                                title="Mark as Paid"
                                                onClick={() => onMarkPaid(exp._id)}
                                                style={{
                                                    background: '#ecfdf5', border: '1px solid #10b981',
                                                    color: '#059669', display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', width: 32, height: 32, padding: 0,
                                                    borderRadius: '4px'
                                                }}
                                            >
                                                <CheckCircle size={16} fill="#059669" color="#fff" strokeWidth={1.5} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {expenses.length > 0 && (
                <div style={{ marginTop: 20, marginBottom: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="text-sm text-slate-500 font-medium">Showing {expenses.length} of {total} expenses</div>
                    {page < totalPages && (
                        <button className="btn btn-outline" disabled={loading} onClick={() => setPage(p => p + 1)}>
                            {loading ? <><Loader2 size={16} className="spin" /> Loading...</> : 'Load More Results'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExpenseTable;
