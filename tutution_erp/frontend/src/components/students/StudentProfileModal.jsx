import React from 'react';
import {
    X, User, ShieldCheck, Phone, Mail, MapPin, Calendar,
    GraduationCap, IndianRupee, BookOpen, Hash,
    Wallet, DownloadCloud, UserCircle2, Info, Building2, ChevronRight
} from 'lucide-react';
import { API_BASE_URL } from '../../api/apiConfig';

const StudentProfileModal = ({ isOpen, onClose, student, onDownloadID }) => {
    if (!isOpen || !student) return null;

    const primaryColor = 'var(--erp-primary)';
    const borderColor = '#000000'; // Pure black for sharp contrast
    const sharpRadius = '0px'; // Fully Sharp Borders
    const attendanceSummary = student.attendanceSummary || {};
    const attendanceValue = attendanceSummary.total > 0 ? `${attendanceSummary.percentage}%` : '--';

    return (
        <div className="modal-overlay modal-full-overlay" style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'none' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal modal-full" style={{ background: '#ffffff', borderRadius: sharpRadius, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: `2px solid ${borderColor}` }}>

                {/* --- TOP NAVIGATION BAR --- */}
                <div style={{
                    padding: '15px 40px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#000',
                    color: '#fff',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ padding: 6, background: primaryColor, borderRadius: '0px', color: '#fff' }}>
                            <GraduationCap size={20} />
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900, letterSpacing: '0.1em' }}>
                            STUDENT <span style={{ color: primaryColor }}>PROFILE_SYSTEM</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0px', width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer'
                    }}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '40px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ maxWidth: '1300px', margin: '0 auto' }}>

                        {/* --- TOP PROFILE HEADER CARD --- */}
                        <div style={{
                            background: '#fff',
                            borderRadius: sharpRadius,
                            border: `2px solid ${borderColor}`,
                            padding: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '24px',
                            gap: '32px',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', gap: '32px', alignItems: 'center', width: '100%' }}>
                                <div style={{
                                    width: 120, height: 120, borderRadius: sharpRadius,
                                    background: '#f1f5f9', overflow: 'hidden', flexShrink: 0,
                                    border: `2px solid ${borderColor}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {student.profileImage ? (
                                        <img 
                                            src={student.profileImage.startsWith('http') ? student.profileImage : `${API_BASE_URL}${student.profileImage}`} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                            alt="" 
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '';
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerHTML = `<div style="color: #000"><svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`;
                                            }}
                                        />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                                            <User size={60} />
                                        </div>
                                    )}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                        <h1 style={{ fontSize: '2.2rem', fontWeight: 950, color: '#000', letterSpacing: '-0.04em', textTransform: 'uppercase' }}>{student.name}</h1>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: '0px', fontSize: '0.7rem', fontWeight: 900,
                                            textTransform: 'uppercase', background: student.status === 'active' ? '#16a34a' : '#dc2626',
                                            color: '#fff', border: `1px solid ${borderColor}`
                                        }}>
                                            {student.status || 'ACTIVE'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 32px', color: '#475569', fontSize: '0.85rem', fontWeight: 700 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Hash size={16} /> ROLL: {student.rollNo}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><GraduationCap size={16} /> {student.className || 'General'}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={16} /> BATCH: {student.batchId?.name || student.batchName || '—'}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => onDownloadID(student)} style={{
                                        padding: '12px 24px', background: '#000', color: '#fff',
                                        borderRadius: sharpRadius, fontSize: '0.75rem', fontWeight: 900, border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em'
                                    }}>
                                        <DownloadCloud size={16} /> Download ID
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* --- STATS GRID --- */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                            <StatCard label="Monthly Fee" value={`₹ ${(student.fees || 0).toLocaleString()}`} radius={sharpRadius} borderColor={borderColor} />
                            <StatCard label="Paid Amount" value={`₹ ${(student.feesPaid || 0).toLocaleString()}`} radius={sharpRadius} color={primaryColor} borderColor={borderColor} />
                            <StatCard label="Attendance" value={attendanceValue} radius={sharpRadius} borderColor={borderColor} />
                            <StatCard label="Enrollment Year" value={student.session?.split('-')[0] || '2026'} radius={sharpRadius} borderColor={borderColor} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '32px' }}>

                            {/* --- LEFT MAIN CONTENT --- */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                {/* Personal & Family Details */}
                                <div style={{ background: '#fff', borderRadius: sharpRadius, border: `2px solid ${borderColor}`, padding: '24px' }}>
                                    <SectionHeading title="Identity & Family Details" icon={UserCircle2} color="#000" />
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                                        <DetailItem label="DATE OF BIRTH" value={student.dob ? new Date(student.dob).toLocaleDateString() : '—'} icon={Calendar} />
                                        <DetailItem label="GENDER" value={student.gender || '—'} icon={User} />
                                        <DetailItem label="FATHER'S NAME" value={student.fatherName || '—'} icon={Info} />
                                        <DetailItem label="MOTHER'S NAME" value={student.motherName || '—'} icon={Info} />
                                        <DetailItem label="WHATSAPP NUMBER" value={student.contact || '—'} icon={Phone} />
                                        <DetailItem label="EMAIL ADDRESS" value={student.email || '—'} icon={Mail} />
                                        <DetailItem label="ADMISSION DATE" value={new Date(student.admissionDate || student.joinedAt).toLocaleDateString()} icon={Calendar} />
                                        <DetailItem label="ACADEMIC SESSION" value={student.session || '—'} icon={Calendar} />
                                        <DetailItem label="REGISTRATION FEE" value={`₹ ${student.registrationFee || 0}`} icon={IndianRupee} />
                                    </div>
                                </div>

                                {/* Academic Info */}
                                <div style={{ background: '#fff', borderRadius: sharpRadius, border: `2px solid ${borderColor}`, overflow: 'hidden' }}>
                                    <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: `2px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <BookOpen size={18} color="#000" />
                                        <h3 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#000', margin: 0, textTransform: 'uppercase' }}>Academic Enrollment</h3>
                                    </div>
                                    <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                        <SidebarInfo label="Assigned Course" value={student.className || 'General'} />
                                        <SidebarInfo label="Current Batch" value={student.batchId?.name || student.batchName || 'Unassigned'} />
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#000', textTransform: 'uppercase', marginBottom: '8px' }}>Enrollment Notes</p>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', lineHeight: 1.6, background: '#f8fafc', padding: '15px', borderRadius: '0px', border: `1px solid #cbd5e1` }}>
                                                {student.notes || 'No internal notes provided for this student record.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- RIGHT SIDEBAR --- */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                {/* Financial Status */}
                                <div style={{ background: '#fff', borderRadius: sharpRadius, border: `2px solid ${borderColor}`, padding: '24px' }}>
                                    <SectionHeading title="Fee Status" icon={Wallet} color="#000" />
                                    <SidebarInfo label="Subscription Amount" value={`₹ ${(student.fees || 0).toLocaleString()} / month`} />
                                    <SidebarInfo label="Amount Disbursed" value={`₹ ${(student.feesPaid || 0).toLocaleString()}`} />
                                    <div style={{
                                        marginTop: '20px',
                                        padding: '12px',
                                        background: student.feesPaid >= student.fees ? primaryColor : '#000',
                                        borderRadius: '0px',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10
                                    }}>
                                        {student.feesPaid >= student.fees ? <ShieldCheck size={18} /> : <Info size={18} />}
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            {student.feesPaid >= student.fees ? 'Fully Reconciled' : 'Pending Dues'}
                                        </span>
                                    </div>
                                </div>

                                {/* Address Info */}
                                <div style={{ background: '#fff', borderRadius: sharpRadius, border: `2px solid ${borderColor}`, padding: '24px' }}>
                                    <SectionHeading title="Residence" icon={MapPin} color="#000" />
                                    <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#000', textTransform: 'uppercase', marginBottom: '8px' }}>Full Address</p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.5 }}>{student.address || '—'}</p>
                                </div>

                                {/* Administrative Actions */}
                                <div style={{ background: '#000', borderRadius: sharpRadius, padding: '24px', color: '#fff' }}>
                                    <h3 style={{ fontSize: '0.7rem', fontWeight: 900, color: primaryColor, textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.1em' }}>Control Panel</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <SideAction text="View Full History" icon={ChevronRight} />
                                        <SideAction text="Payment Receipt" icon={ChevronRight} />
                                        <SideAction text="Restrict Access" color="#f87171" icon={Info} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Subcomponents ---

const StatCard = ({ label, value, radius, color, borderColor }) => (
    <div style={{
        background: '#fff', padding: '24px', borderRadius: radius, border: `2px solid ${borderColor}`,
    }}>
        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 900, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '2rem', fontWeight: 950, color: color || '#000', lineHeight: 1 }}>{value}</div>
    </div>
);

const SectionHeading = ({ title, icon: Icon, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '24px', borderBottom: '2px solid #000', paddingBottom: '12px' }}>
        <Icon size={18} color={color} />
        <h3 style={{ fontSize: '0.8rem', fontWeight: 950, color: '#000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
    </div>
);

const DetailItem = ({ label, value, icon: Icon }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ padding: 8, background: '#000', borderRadius: '0px', color: '#fff' }}>
            <Icon size={14} />
        </div>
        <div>
            <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 900, marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '0.85rem', color: '#000', fontWeight: 800 }}>{value}</div>
        </div>
    </div>
);

const SidebarInfo = ({ label, value }) => (
    <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
        <p style={{ fontSize: '0.95rem', fontWeight: 900, color: '#000' }}>{value}</p>
    </div>
);

const SideAction = ({ text, color, icon: Icon }) => (
    <button style={{
        width: '100%', padding: '14px 16px', borderRadius: '0px', border: '1px solid rgba(255,255,255,0.2)',
        background: 'transparent', color: color || '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer'
    }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>{text}</span>
        <Icon size={16} />
    </button>
);

export default StudentProfileModal;
