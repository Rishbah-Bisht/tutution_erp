import React, { useState, useEffect } from 'react';
import { Trash2, Plus, DollarSign, Wallet, Building, ArrowRightLeft, FileText, ChevronLeft, Calendar, User, Phone, Mail, MapPin, Building2, CreditCard, Landmark, CheckCircle, XCircle, Clock, Loader2, QrCode, Banknote, ShieldCheck, AlertTriangle, Save, History } from 'lucide-react';
import apiClient, { API_BASE_URL } from '../../api/apiConfig';

// --- Theme Constants ---
const primaryColor = 'var(--erp-primary)';
const headerGradient = 'linear-gradient(135deg, var(--erp-primary) 0%, var(--erp-secondary) 100%)';
const sharpRadius = '4px';
const borderColor = '#e2e8f0';
const labelColor = '#475569';
const headingColor = '#0f172a';

const SectionDivider = ({ label, color = '#059669', icon: Icon }) => (
    <div style={{
        fontSize: '0.72rem', fontWeight: 800, color, textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: 20, marginTop: 10,
        display: 'flex', alignItems: 'center', gap: 8
    }}>
        {Icon && <Icon size={14} />} {label}
        <div style={{ flex: 1, height: '1px', background: borderColor }} />
    </div>
);

const TeacherSalaryProfile = () => {
    const [bankDetails, setBankDetails] = useState({
        bankName: '',
        upiId: '',
        ifscCode: '',
        accountName: '',
        accountNumber: ''
    });
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const teacher = JSON.parse(localStorage.getItem('teacher') || '{}');

    useEffect(() => {
        fetchProfileAndSalaries();
    }, []);

    const fetchProfileAndSalaries = async () => {
        setLoading(true);
        try {
            // Fetch profile (includes bank details)
            const profileRes = await apiClient.get('/teacher/profile');
            if (profileRes.data.bankDetails) {
                setBankDetails(profileRes.data.bankDetails);
            }
            // Fetch salary records
            const salaryRes = await apiClient.get(`/teacher-payroll/salaries?teacherId=${teacher._id}`);
            setSalaries(salaryRes.data);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBankUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await apiClient.patch('/teacher/bank-details', bankDetails);
            setMessage({ type: 'success', text: 'Bank details updated successfully!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
            <Loader2 className="spin" size={40} color={primaryColor} />
            <p style={{ marginTop: 12, fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>SYNCING PAYROLL DATA...</p>
        </div>
    );

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* --- TOP HEADER (Full Width Premium) --- */}
            <header style={{
                width: '100%',
                padding: '40px 48px',
                background: headerGradient,
                position: 'relative',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 10,
                flexShrink: 0,
                overflow: 'hidden'
            }}>
                {/* Decorative Icon */}
                <Landmark size={160} style={{ position: 'absolute', right: -20, bottom: -40, opacity: 0.1, color: '#fff' }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: sharpRadius,
                        background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <Banknote size={36} color="#fff" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                            Salary & Payout Profile
                        </h2>
                        <div style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: 500, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShieldCheck size={14} /> {teacher.name} • Employee Records
                        </div>
                    </div>
                </div>
            </header>

            {/* --- MAIN CENTERED CONTENT --- */}
            <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
                <div style={{ width: '100%', maxWidth: '1280px' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>

                        {/* --- LEFT: BANK DETAILS FORM --- */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <form onSubmit={handleBankUpdate} style={{ background: '#fff', border: `1.5px solid ${borderColor}`, borderRadius: sharpRadius, padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                <SectionDivider label="Disbursement Account" icon={Landmark} />

                                {message.text && (
                                    <div style={{
                                        padding: '12px 16px',
                                        background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                                        border: `1px solid ${message.type === 'success' ? '#d1fae5' : '#fca5a5'}`,
                                        borderRadius: sharpRadius,
                                        color: message.type === 'success' ? '#065f46' : '#991b1b',
                                        fontSize: '0.8rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10
                                    }}>
                                        {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                        {message.text}
                                    </div>
                                )}

                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 8 }}>ACCOUNT HOLDER NAME</label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '12px', border: `1.5px solid ${borderColor}`, borderRadius: sharpRadius, fontSize: '0.9rem', fontWeight: 600 }}
                                        value={bankDetails.accountName}
                                        onChange={e => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                                        placeholder="Full name in bank records"
                                    />
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 8 }}>BANK NAME</label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '12px', border: `1.5px solid ${borderColor}`, borderRadius: sharpRadius, fontSize: '0.9rem', fontWeight: 600 }}
                                        value={bankDetails.bankName}
                                        onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                                        placeholder="e.g. HDFC Bank"
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: 20 }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 8 }}>ACCOUNT NO.</label>
                                        <input
                                            type="text"
                                            style={{ width: '100%', padding: '12px', border: `1.5px solid ${borderColor}`, borderRadius: sharpRadius, fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.05em' }}
                                            value={bankDetails.accountNumber}
                                            onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 8 }}>IFSC CODE</label>
                                        <input
                                            type="text"
                                            style={{ width: '100%', padding: '12px', border: `1.5px solid ${borderColor}`, borderRadius: sharpRadius, fontSize: '0.9rem', fontWeight: 700 }}
                                            value={bankDetails.ifscCode}
                                            onChange={e => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: 32 }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 8 }}>UPI ID (FOR QUICK PAY)</label>
                                    <div style={{ position: 'relative' }}>
                                        <QrCode size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            style={{ width: '100%', padding: '12px 12px 12px 40px', border: `1.5px solid ${borderColor}`, borderRadius: sharpRadius, fontSize: '0.9rem' }}
                                            value={bankDetails.upiId}
                                            onChange={e => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                                            placeholder="username@bank"
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={saving} style={{
                                    width: '100%', background: saving ? '#94a3b8' : primaryColor,
                                    color: '#fff', border: 'none', borderRadius: sharpRadius, padding: '14px',
                                    fontWeight: 900, fontSize: '0.75rem', cursor: saving ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                    textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: saving ? 'none' : '0 4px 12px rgba(5,150,105,0.2)'
                                }}>
                                    {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                                    Update Financial Info
                                </button>
                            </form>
                        </div>

                        {/* --- RIGHT: SALARY HISTORY TABLE --- */}
                        <div style={{ background: '#fff', border: `1.5px solid ${borderColor}`, borderRadius: sharpRadius, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                            <div style={{ padding: '20px 32px', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <History size={18} color={primaryColor} />
                                    <h3 style={{ fontSize: '0.85rem', fontWeight: 900, color: headingColor, margin: 0 }}>PAYOUT LEDGER HISTORY</h3>
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Session 2023-24</span>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={tableHdr}>MONTH/CYCLE</th>
                                            <th style={tableHdr}>BASE PAY</th>
                                            <th style={tableHdr}>ADDONS</th>
                                            <th style={tableHdr}>DEDUCTIONS</th>
                                            <th style={tableHdr}>NET PAID</th>
                                            <th style={{ ...tableHdr, textAlign: 'center' }}>STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ fontSize: '0.85rem' }}>
                                        {salaries.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" style={{ padding: '80px 0', textAlign: 'center', color: '#cbd5e1' }}>
                                                    <Clock size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                                                    <p style={{ fontWeight: 700 }}>No salary disbursement records found.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            salaries.map(s => (
                                                <tr key={s._id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                                                    <td style={{ ...tableCell, fontWeight: 900, color: headingColor }}>
                                                        {new Date(s.monthYear + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
                                                    </td>
                                                    <td style={tableCell}>₹ {s.baseSalary.toLocaleString()}</td>
                                                    <td style={{ ...tableCell, color: '#059669', fontWeight: 700 }}>+₹ {(s.extraClassesAmount + s.bonusAmount).toLocaleString()}</td>
                                                    <td style={{ ...tableCell, color: '#dc2626', fontWeight: 700 }}>-₹ {(s.leaveDeductions + s.advanceDeductions).toLocaleString()}</td>
                                                    <td style={{ ...tableCell, fontWeight: 900, color: headingColor }}>₹ {s.netSalary.toLocaleString()}</td>
                                                    <td style={{ ...tableCell, textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '4px 10px', borderRadius: '2px', fontSize: '0.65rem', fontWeight: 900,
                                                            textTransform: 'uppercase',
                                                            background: s.status === 'Paid' ? '#ecfdf5' : '#fffbeb',
                                                            color: s.status === 'Paid' ? '#065f46' : '#b45309',
                                                            border: `1px solid ${s.status === 'Paid' ? '#d1fae5' : '#fef3c7'}`
                                                        }}>
                                                            {s.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

const tableHdr = {
    padding: '16px 24px',
    textAlign: 'left',
    fontSize: '0.65rem',
    fontWeight: 900,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const tableCell = {
    padding: '18px 24px',
    color: '#475569'
};

export default TeacherSalaryProfile;
