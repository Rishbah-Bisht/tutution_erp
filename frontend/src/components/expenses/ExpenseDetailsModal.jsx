import React from 'react';
import { X, Calendar, Tag, CreditCard, AlignLeft, CheckCircle, Clock } from 'lucide-react';

const ExpenseDetailsModal = ({ isOpen, onClose, expense, onMarkPaid }) => {
    if (!isOpen || !expense) return null;

    const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const fmtAmount = n => (Number(n) || 0).toLocaleString('en-IN');

    return (
        <div 
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 transition-all"
            style={{ 
                background: 'rgba(15, 23, 42, 0.7)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)'
            }}
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                    <div className="flex items-center gap-3 text-white">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                            <Tag size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Expense Details</h2>
                            <p className="text-sm text-slate-300 font-medium">#{expense._id?.slice(-6).toUpperCase() || 'N/A'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-6 flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1">{expense.title}</h3>
                            <div className="text-2xl font-black text-slate-900">₹ {fmtAmount(expense.amount)}</div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${expense.status === 'Paid' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                            {expense.status === 'Paid' ? <span className="flex items-center gap-1"><CheckCircle size={12} /> Paid</span> : <span className="flex items-center gap-1"><Clock size={12} /> Pending</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 text-slate-500 mb-1 text-sm font-semibold">
                                <Calendar size={14} /> Date
                            </div>
                            <div className="font-bold text-slate-800">{fmtDate(expense.date)}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 text-slate-500 mb-1 text-sm font-semibold">
                                <Tag size={14} /> Category
                            </div>
                            <div className="font-bold text-slate-800">{expense.category}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 text-slate-500 mb-1 text-sm font-semibold">
                                <CreditCard size={14} /> Payment Mode
                            </div>
                            <div className="font-bold text-slate-800">{expense.paymentMode}</div>
                        </div>
                        {expense.receiptUrl && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => window.open(expense.receiptUrl, '_blank')}>
                                <div className="flex items-center gap-2 text-blue-500 mb-1 text-sm font-semibold">
                                    <AlignLeft size={14} /> Receipt
                                </div>
                                <div className="font-bold text-blue-600 text-sm">View Receipt ↗</div>
                            </div>
                        )}
                    </div>

                    {expense.description && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 text-slate-500 mb-2 text-sm font-semibold">
                                <AlignLeft size={14} /> Notes / Description
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">
                                {expense.description}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    {expense.status === 'Pending' && (
                        <button
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                            onClick={() => onMarkPaid(expense._id)}
                        >
                            <CheckCircle size={16} /> Mark as Paid
                        </button>
                    )}
                    <button 
                        className="px-6 py-2 border border-slate-300 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors" 
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpenseDetailsModal;