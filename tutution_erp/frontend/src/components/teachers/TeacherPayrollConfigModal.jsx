import React, { useState, useEffect } from 'react';
import {
    X, Save, Loader2, DollarSign, Calendar, Briefcase,
    Building2, CreditCard, Hash, UserCircle2,
    AlertTriangle, CheckCircle2, Banknote, Ban,
    QrCode, ShieldCheck, User, Smartphone, IndianRupee
} from 'lucide-react';

// --- Theme Constants ---
const primaryColor = 'var(--erp-primary)';
const sharpRadius = '4px';
const borderColor = '#e2e8f0';
const labelColor = '#475569';
const headingColor = '#0f172a';

// --- Internal UI Components ---

import apiClient from '../../api/apiConfig';

const SectionDivider = ({ label, color = 'var(--erp-primary)', icon: Icon }) => (
    <div style={{
        fontSize: '0.72rem', fontWeight: 800, color, textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: 20, marginTop: 10,
        display: 'flex', alignItems: 'center', gap: 8
    }}>
        {Icon && <Icon size={14} />} {label}
        <div style={{ flex: 1, height: '1px', background: borderColor }} />
    </div>
);

const CurrentMonthBanner = ({ salary, onGenerate, generating, selectedMonth }) => {
    const monthLabel = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });

    if (!salary) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                padding: '16px 20px', borderRadius: sharpRadius, marginBottom: 32,
                background: '#f8fafc',
                border: `1px solid ${borderColor}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertTriangle size={20} color="#d97706" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#92400e' }}>
                            Salary not generated for {monthLabel}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 2 }}>
                            Faculty is active but no salary record exists for this month.
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={generating}
                    className="btn btn-primary btn-sm"
                    style={{ height: 36, whiteSpace: 'nowrap', gap: 8 }}
                >
                    {generating ? <Loader2 size={14} className="spin" /> : <Banknote size={14} />}
                    Generate {monthLabel} Salary
                </button>
            </div>
        );
    }

    const isPaid = salary.status === 'Paid';

    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '16px 20px', borderRadius: sharpRadius, marginBottom: 32,
            background: isPaid ? '#ecfdf5' : '#fffbeb',
            border: `1px solid ${isPaid ? '#6ee7b7' : '#fcd34d'}`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
            {isPaid
                ? <CheckCircle2 size={24} color="#059669" style={{ flexShrink: 0 }} />
                : <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0 }} />}
            <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isPaid ? '#065f46' : '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isPaid ? (
                        <>
                            <CheckCircle2 size={16} color="#059669" />
                            Salary paid for {monthLabel}
                        </>
                    ) : (
                        <>
                            <AlertTriangle size={16} color="#d97706" />
                            Salary already generated for {monthLabel}
                        </>
                    )}
                </div>
                <div style={{ fontSize: '0.8rem', color: isPaid ? 'var(--erp-primary)' : '#b45309', marginTop: 6, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Banknote size={14} /> Net: <strong>₹ {salary.netSalary?.toLocaleString()}</strong>
                    </span>
                    <span style={{ opacity: 0.3 }}>|</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        Status: <strong>{salary.status.toUpperCase()}</strong>
                    </span>
                    {!isPaid && (
                        <>
                            <span style={{ opacity: 0.3 }}>|</span>
                            <span style={{ fontWeight: 600, color: '#78350f' }}>
                                Profile changes will take effect from next month.
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const TeacherPayrollConfigModal = ({ teacher, onClose, onSave, toast }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        salaryType: 'Monthly',
        baseSalary: 0,
        status: 'Active',
        bankDetails: {
            accountName: '',
            accountNumber: '',
            bankName: '',
            ifscCode: '',
            upiId: ''
        }
    });

    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [currentMonthSalary, setCurrentMonthSalary] = useState(null);

    useEffect(() => {
        if (!teacher) return;
        const currentMonth = selectedMonth;
        Promise.all([
            apiClient.get(`/payroll/profile/${teacher._id}`).catch(err => ({ err })),
            apiClient.get(`/payroll/salaries?monthYear=${currentMonth}`).catch(() => ({ data: [] }))
        ]).then(([profileRes, salariesRes]) => {
            if (profileRes?.data && !profileRes.err) {
                setFormData(prev => ({
                    ...prev, ...profileRes.data,
                    bankDetails: { ...prev.bankDetails, ...profileRes.data.bankDetails }
                }));
            } else if (profileRes?.err?.response?.status === 404) {
                if (teacher.salary) {
                    setFormData(prev => ({ ...prev, baseSalary: teacher.salary }));
                }
            } else {
                toast.error('Failed to load payroll profile');
            }
            const salaries = salariesRes?.data || [];
            const found = salaries.find(s => s.teacherId?._id === teacher._id || s.teacherId === teacher._id);
            setCurrentMonthSalary(found || false);
        }).finally(() => setLoading(false));
    }, [teacher, toast, selectedMonth]);

    const [generating, setGenerating] = useState(false);

    const handleGenerate = async () => {
        const monthYear = selectedMonth;
        setGenerating(true);
        try {
            await apiClient.post('/payroll/bulk-generate', { ids: [teacher._id], monthYear });
            toast.success('Salary record generated successfully!');
            // Refresh salary status
            const salariesRes = await apiClient.get(`/payroll/salaries?monthYear=${monthYear}`);
            const salaries = salariesRes?.data || [];
            const found = salaries.find(s => s.teacherId?._id === teacher._id || s.teacherId === teacher._id);
            setCurrentMonthSalary(found || false);
            if (onSave) onSave();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to generate salary');
        } finally {
            setGenerating(false);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiClient.post(`/payroll/profile/${teacher._id}`, formData);
            toast.success('Payroll profile saved successfully!');
            onSave(); // Optional callback to refresh parent list
            onClose();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="modal-overlay modal-full-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <div style={{ textAlign: 'center' }}>
                <Loader2 size={40} className="spin" style={{ color: primaryColor, marginBottom: 12 }} />
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>SYNCHRONIZING FINANCIAL DATA...</p>
            </div>
        </div>
    );

    const imgSrc = teacher?.profileImage;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
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
                    <Briefcase size={140} style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', opacity: 0.1, color: '#fff' }} />

                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            {imgSrc ? (
                                <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            ) : (
                                <User size={24} color="#fff" />
                            )}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                {teacher?.name}'s Payroll
                            </h2>
                            <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500, marginTop: 2 }}>
                                Faculty Financial Status & Configuration
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

                <div style={{
                    padding: '12px 32px', background: '#fff', borderBottom: `1px solid ${borderColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
                }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={16} /> VIEW DATA FOR MONTH:
                    </div>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        style={{
                            padding: '6px 14px', borderRadius: sharpRadius, border: `1.5px solid ${borderColor}`,
                            fontWeight: 700, fontSize: '0.9rem', outline: 'none', background: '#f8fafc'
                        }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div style={{ width: '100%' }}>

                        <form onSubmit={handleProfileSubmit} style={{ background: '#fff', border: `1.5px solid ${borderColor}`, borderRadius: sharpRadius, padding: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>

                            <CurrentMonthBanner
                                salary={currentMonthSalary}
                                onGenerate={handleGenerate}
                                generating={generating}
                                selectedMonth={selectedMonth}
                            />

                            {/* --- SALARY SETTINGS --- */}
                            <SectionDivider label="Salary Settings" color="#059669" icon={Banknote} />

                            <div className="mf-row" style={{ marginBottom: 24 }}>
                                <div className="mf" style={{ flex: 1 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 900, color: labelColor }}>
                                        <Calendar size={13} /> SALARY PACKAGE TYPE
                                    </label>
                                    <select
                                        style={{ borderRadius: sharpRadius, padding: '5px', border: `1.5px solid ${borderColor}`, fontWeight: 700 }}
                                        value={formData.salaryType}
                                        onChange={e => setFormData({ ...formData, salaryType: e.target.value })}
                                    >
                                        <option value="Monthly">Monthly Salary</option>
                                        <option value="Per Class">Per Class Basis</option>
                                        <option value="Per Hour">Hourly Basis</option>
                                    </select>
                                </div>

                                <div className="mf" style={{ flex: 1 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 900, color: labelColor }}>
                                        <CheckCircle2 size={13} /> STATUS
                                    </label>
                                    <select
                                        style={{ borderRadius: sharpRadius, padding: '5px', border: `1.5px solid ${borderColor}`, fontWeight: 700 }}
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="Active">Active (Eligible for Payroll)</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mf" style={{ marginBottom: 40 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 900, color: labelColor }}>
                                    <DollarSign size={13} style={{ color: primaryColor }} /> BASE SALARY (₹ ) *
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#94a3b8' }}>₹ </span>
                                    <input
                                        type="number" required min="0"
                                        style={{ borderRadius: sharpRadius, padding: '12px 12px 12px 32px', border: `1.5px solid ${borderColor}`, fontWeight: 800, fontSize: '1.1rem' }}
                                        placeholder="e.g. 25000"
                                        value={formData.baseSalary}
                                        onChange={e => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            {/* --- BANK DETAILS --- */}
                            <SectionDivider label="Bank Account Details" color="#059669" icon={Building2} />

                            <div className="mf-row" style={{ marginBottom: 16 }}>
                                <div className="mf" style={{ flex: 1 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 900, color: labelColor }}>
                                        <UserCircle2 size={13} /> ACCOUNT NAME
                                    </label>
                                    <input type="text" placeholder="As per bank records"
                                        style={{ borderRadius: sharpRadius, padding: '12px', border: `1.5px solid ${borderColor}` }}
                                        value={formData.bankDetails.accountName}
                                        onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountName: e.target.value } })} />
                                </div>
                                <div className="mf" style={{ flex: 1 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 900, color: labelColor }}>
                                        <CreditCard size={13} /> ACCOUNT NUMBER
                                    </label>
                                    <input type="text" placeholder="e.g. 0012345678"
                                        style={{ borderRadius: sharpRadius, padding: '12px', border: `1.5px solid ${borderColor}`, fontWeight: 700 }}
                                        value={formData.bankDetails.accountNumber}
                                        onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountNumber: e.target.value } })} />
                                </div>
                            </div>
                            <div className="mf-row" style={{ marginBottom: 16 }}>
                                <div className="mf" style={{ flex: 1 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 900, color: labelColor }}>
                                        <Building2 size={13} /> BANK NAME
                                    </label>
                                    <input type="text" placeholder="e.g. HDFC Bank"
                                        style={{ borderRadius: sharpRadius, padding: '12px', border: `1.5px solid ${borderColor}` }}
                                        value={formData.bankDetails.bankName}
                                        onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: e.target.value } })} />
                                </div>
                                <div className="mf" style={{ flex: 1 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 900, color: labelColor }}>
                                        <Hash size={13} /> IFSC CODE
                                    </label>
                                    <input type="text" placeholder="e.g. HDFC0001234"
                                        style={{ borderRadius: sharpRadius, padding: '12px', border: `1.5px solid ${borderColor}`, fontWeight: 700 }}
                                        value={formData.bankDetails.ifscCode}
                                        onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, ifscCode: e.target.value.toUpperCase() } })} />
                                </div>
                            </div>
                            <div className="mf" style={{ marginBottom: 40 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 900, color: labelColor }}>
                                    <QrCode size={13} /> UPI ID
                                </label>
                                <input type="text" placeholder="e.g. name@bank"
                                    style={{ borderRadius: sharpRadius, padding: '12px', border: `1.5px solid ${borderColor}` }}
                                    value={formData.bankDetails.upiId}
                                    onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, upiId: e.target.value } })} />
                            </div>

                            {/* --- ACTIONS --- */}
                            <div style={{ display: 'flex', gap: 16 }}>
                                <button type="button" onClick={onClose} disabled={saving}
                                    style={{ flex: 1, padding: '14px', borderRadius: sharpRadius, border: `1.5px solid ${borderColor}`, background: '#fff', color: '#475569', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }}>
                                    CANCEL
                                </button>
                                <button type="submit" disabled={saving || currentMonthSalary}
                                    style={{
                                        flex: 2,
                                        background: (saving || currentMonthSalary) ? '#94a3b8' : primaryColor,
                                        color: '#fff', borderRadius: sharpRadius, padding: '14px', fontWeight: 800, border: 'none',
                                        cursor: (saving || currentMonthSalary) ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                        fontSize: '0.75rem', boxShadow: (saving || currentMonthSalary) ? 'none' : '0 4px 12px rgba(5,150,105,0.2)'
                                    }}>
                                    {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                                    {saving ? 'SAVING...' : 'SAVE PAYROLL PROFILE'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherPayrollConfigModal;