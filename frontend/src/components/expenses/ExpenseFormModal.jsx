import React, { useState, useEffect } from 'react';
import { X, Receipt, UploadCloud, AlertCircle, Tag, Calendar, IndianRupee, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '../Toast';
import apiClient from '../../api/apiConfig';

const ExpenseFormModal = ({ isOpen, onClose, onSuccess, expense = null }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        title: '',
        amount: '',
        category: 'Other',
        paymentMode: 'Cash',
        date: new Date().toISOString().split('T')[0],
        description: '',
        receiptUrl: '',
        status: 'Paid'
    });

    useEffect(() => {
        if (isOpen && expense) {
            setForm({
                title: expense.title || '',
                amount: expense.amount || '',
                category: expense.category || 'Other',
                paymentMode: expense.paymentMode || 'Cash',
                date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                description: expense.description || '',
                receiptUrl: expense.receiptUrl || '',
                status: expense.status || 'Paid'
            });
        } else if (isOpen && !expense) {
            setForm({
                title: '',
                amount: '',
                category: 'Other',
                paymentMode: 'Cash',
                date: new Date().toISOString().split('T')[0],
                description: '',
                receiptUrl: '',
                status: 'Paid'
            });
        }
    }, [isOpen, expense]);

    if (!isOpen) return null;

    const categories = ['Rent', 'Salary', 'Electricity', 'Maintenance', 'Marketing', 'Supplies', 'Other'];
    const paymentModes = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'];

    const handleCategoryChange = (e) => {
        const selectedCategory = e.target.value;
        const formUpdate = { category: selectedCategory };

        if (selectedCategory === 'Salary') {
            formUpdate.title = 'Faculty Salary';
            // Do not auto-load salary amount anymore as per request
        } else if (selectedCategory !== 'Other') {
            formUpdate.title = selectedCategory;
        }

        setForm(prev => ({ ...prev, ...formUpdate }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.title || !form.amount) {
            toast.error('Please fill in the required fields (Title, Amount)');
            return;
        }

        setLoading(true);
        try {
            if (!expense) {
                await apiClient.post('/expenses', form);
                toast.success('Expense recorded successfully');
            } else {
                await apiClient.put(`/expenses/${expense._id}`, form);
                toast.success('Expense updated successfully');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving expense:', error);
            toast.error(error.response?.data?.message || 'Failed to save expense');
        } finally {
            setLoading(true);
            setLoading(false);
        }
    };

    const handle = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div 
            className="modal-overlay" 
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.7)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="modal" style={{ maxWidth: 600, width: '95vw', maxHeight: '90vh', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>

                {/* HEADER */}
                <div style={{
                    padding: '24px 32px',
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    position: 'relative',
                    color: '#fff',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0
                }}>
                    <Receipt size={100} style={{ position: 'absolute', right: -10, bottom: -20, opacity: 0.1, color: '#fff' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                        <div style={{ padding: 6, background: 'rgba(255,255,255,0.15)', borderRadius: '4px' }}>
                            <IndianRupee size={18} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                                {expense ? 'EDIT EXPENSE RECORD' : 'RECORD NEW EXPENSE'}
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8, fontWeight: 500 }}>Track institutional operational costs</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '4px',
                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', cursor: 'pointer', position: 'relative', zIndex: 1
                    }}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body" style={{ overflowY: 'auto', flex: 1, background: '#fff' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ padding: '32px', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Expense Title*
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Tag size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            name="title"
                                            placeholder="e.g. Monthly Rent, Electricity Bill"
                                            value={form.title}
                                            onChange={handle}
                                            required
                                            style={{
                                                width: '100%', padding: '12px 12px 12px 40px', borderRadius: '4px', border: '1px solid #e2e8f0',
                                                fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', background: '#f8fafc'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Category
                                    </label>
                                    <select
                                        name="category"
                                        value={form.category}
                                        onChange={handleCategoryChange}
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #e2e8f0',
                                            fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', background: '#f8fafc'
                                        }}
                                    >
                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Amount (₹ )*
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <IndianRupee size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#059669' }} />
                                        <input
                                            type="number"
                                            name="amount"
                                            placeholder="0.00"
                                            value={form.amount}
                                            onChange={handle}
                                            required
                                            style={{
                                                width: '100%', padding: '12px 12px 12px 40px', borderRadius: '4px', border: '1px solid #e2e8f0',
                                                fontSize: '0.9rem', fontWeight: 900, color: '#059669', background: '#f8fafc'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Expense Date
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Calendar size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="date"
                                            name="date"
                                            value={form.date}
                                            onChange={handle}
                                            style={{
                                                width: '100%', padding: '12px 12px 12px 40px', borderRadius: '4px', border: '1px solid #e2e8f0',
                                                fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', background: '#f8fafc'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Payment Mode
                                    </label>
                                    <select
                                        name="paymentMode"
                                        value={form.paymentMode}
                                        onChange={handle}
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #e2e8f0',
                                            fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', background: '#f8fafc'
                                        }}
                                    >
                                        {paymentModes.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                                    </select>
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Payment Status
                                    </label>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        {['Paid', 'Pending'].map(status => (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => setForm(prev => ({ ...prev, status }))}
                                                style={{
                                                    flex: 1, padding: '12px', borderRadius: '4px', cursor: 'pointer',
                                                    fontSize: '0.8rem', fontWeight: 800, transition: 'all 0.2s',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                                    background: form.status === status ? (status === 'Paid' ? '#ecfdf5' : '#fff7ed') : '#f8fafc',
                                                    border: `1px solid ${form.status === status ? (status === 'Paid' ? '#10b981' : '#f97316') : '#e2e8f0'}`,
                                                    color: form.status === status ? (status === 'Paid' ? '#059669' : '#c2410b') : '#64748b'
                                                }}
                                            >
                                                {status === 'Paid' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                                {status.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Description (Optional)
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <FileText size={16} style={{ position: 'absolute', left: 12, top: 14, color: '#94a3b8' }} />
                                        <textarea
                                            name="description"
                                            placeholder="Add details about the transaction..."
                                            value={form.description}
                                            onChange={handle}
                                            rows={3}
                                            style={{
                                                width: '100%', padding: '12px 12px 12px 40px', borderRadius: '4px', border: '1px solid #e2e8f0',
                                                fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', background: '#f8fafc', resize: 'none'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div style={{ padding: '20px 32px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
                            <button type="button" onClick={onClose} disabled={loading} style={{
                                padding: '10px 24px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer'
                            }}>
                                CANCEL
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    padding: '10px 32px', background: loading ? '#94a3b8' : '#059669', color: '#fff',
                                    borderRadius: '4px', border: 'none', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8
                                }}
                            >
                                {loading ? <><Loader2 className="spin" size={14} /> SAVING...</> : (
                                    <>
                                        <CheckCircle2 size={14} />
                                        {expense ? "UPDATE EXPENSE" : "SAVE EXPENSE"}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ExpenseFormModal;
