import React from 'react';
import { X, History, Download, Calendar, ArrowUpRight, IndianRupee, Receipt, Eye } from 'lucide-react';

const PaymentHistoryModal = ({ fee, onClose, onViewReceipt }) => {
    if (!fee) return null;

    const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{
                width: '100%', maxWidth: '900px', maxHeight: '92vh',
                background: '#f8fafc', borderRadius: '12px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                position: 'relative'
            }}>
                {/* --- TOP BAR (Inside Modal Box) --- */}
                <header style={{
                    width: '100%',
                    padding: '24px 32px',
                    background: '#0f172a',
                    position: 'relative',
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0,
                    overflow: 'hidden'
                }}>
                    <History size={120} style={{ position: 'absolute', right: -20, bottom: -30, opacity: 0.1, color: '#fff' }} />

                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <History size={24} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Payment Timeline</h2>
                            <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500, marginTop: 2 }}>
                                Transaction history for {fee.studentId?.name}
                            </div>
                        </div>
                    </div>

                    <button type="button" onClick={onClose} style={{
                        position: 'relative', zIndex: 1,
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px', color: '#fff', padding: '8px 16px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        gap: 8, fontSize: '0.75rem', fontWeight: 700
                    }}>
                        <X size={16} /> CLOSE
                    </button>
                </header>

                <div className="modal-body custom-scrollbar" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                    {/* Summary */}
                    <div style={{ background: 'var(--erp-bg2)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '24px', textAlign: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <div className="td-sm">Total Fee</div>
                            <div className="td-bold">₹ {(fee.totalFee || 0).toLocaleString()}</div>
                        </div>
                        <div style={{ width: 1, background: 'var(--erp-border)', margin: '0 16px' }} />
                        <div style={{ flex: 1 }}>
                            <div className="td-sm" style={{ color: 'var(--erp-success)' }}>Paid</div>
                            <div className="td-bold" style={{ color: 'var(--erp-success)' }}>₹ {(fee.amountPaid || 0).toLocaleString()}</div>
                        </div>
                        <div style={{ width: 1, background: 'var(--erp-border)', margin: '0 16px' }} />
                        <div style={{ flex: 1 }}>
                            <div className="td-sm">Installments</div>
                            <div className="td-bold">{fee.paymentHistory?.length || 0}</div>
                        </div>
                    </div>

                    <div style={{ position: 'relative', paddingLeft: '32px' }}>
                        {/* Timeline line */}
                        <div style={{ position: 'absolute', left: '11px', top: 0, bottom: 0, width: '2px', background: 'var(--erp-border)' }} />

                        {fee.paymentHistory && fee.paymentHistory.length > 0 ? (
                            fee.paymentHistory.map((pay, idx) => (
                                <div key={idx} style={{ position: 'relative', marginBottom: '24px' }}>
                                    {/* Dot */}
                                    <div style={{
                                        position: 'absolute',
                                        left: '-26px',
                                        top: '4px',
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: idx === 0 ? 'var(--erp-accent)' : 'var(--erp-muted)',
                                        border: '3px solid #fff',
                                        zIndex: 1
                                    }} />

                                    <div className="flex justify-between items-center mb-1">
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--erp-muted2)' }}>{fmtDate(pay.date)}</div>
                                        <span className="badge" style={{ fontSize: '0.65rem' }}>{pay.paymentMethod || 'Cash'}</span>
                                    </div>
                                    <div className="card" style={{ padding: '16px', background: '#fff' }}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="td-bold" style={{ fontSize: '1rem' }}>₹ {(pay.paidAmount || 0).toLocaleString()}</div>
                                            <button
                                                className="btn btn-outline btn-sm"
                                                style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 700 }}
                                                title="View & Download Receipt"
                                                onClick={() => onViewReceipt(pay)}
                                            >
                                                <Receipt size={13} /> View Receipt
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div>
                                                <div className="td-sm">Receipt #</div>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--erp-text)' }}>{pay.receiptNo}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="td-sm">Ref ID</div>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--erp-text)' }}>{pay.transactionId || 'N/A'}</div>
                                            </div>
                                        </div>
                                        {pay.remarks && (
                                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--erp-bg2)', fontSize: '0.8rem', color: 'var(--erp-muted2)', fontStyle: 'italic' }}>
                                                "{pay.remarks}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8">
                                <p className="td-sm">No payment records found for this invoice.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer" style={{ padding: '20px 32px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                    <button
                        onClick={onClose}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem', textTransform: 'uppercase' }}
                    >
                        Close History
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentHistoryModal;
