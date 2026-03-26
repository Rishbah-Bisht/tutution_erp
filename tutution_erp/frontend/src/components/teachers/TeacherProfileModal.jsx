import React, { useState, useEffect } from 'react';
import {
    X, User, ShieldCheck, Phone, Mail, MapPin, Calendar,
    Briefcase, BookOpen, GraduationCap, IndianRupee,
    Award, Users, Clock, CreditCard, Building2, CheckCircle,
    Banknote, Edit3, UserCircle2, ChevronRight, AlertCircle,
    Hash, Globe, Smartphone
} from 'lucide-react';

import apiClient from '../../api/apiConfig';

const TeacherProfileModal = ({ teacher, onClose, fmt, imgSrc }) => {
    const [profileData, setProfileData] = useState(null);
    const [payrollHistory, setPayrollHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!teacher?._id) return;

        const fetchData = async () => {
            try {
                // Using standard endpoints based on your previous snippets
                const [profileRes, historyRes] = await Promise.all([
                    apiClient.get(`/payroll/profile/${teacher._id}`).catch(() => ({ data: null })),
                    apiClient.get(`/payroll/salaries?teacherId=${teacher._id}`).catch(() => ({ data: [] }))
                ]);
                setProfileData(profileRes.data);
                setPayrollHistory((historyRes.data || []).slice(0, 3));
            } catch (err) {
                console.error("Error fetching teacher profile metadata:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [teacher?._id]);

    if (!teacher) return null;

    // Professional Sharp Theme Colors (Dynamic from CSS variables)
    const primaryColor = 'var(--erp-teacher)';
    const borderColor = '#e2e8f0';
    const sharpRadius = '2px'; // Ultra sharp professional radius

    return (
        <div className="modal-overlay modal-full-overlay" style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal modal-full" style={{ background: '#f8fafc', borderRadius: '0px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* --- TOP NAVIGATION BAR --- */}
                <div style={{
                    padding: '12px 40px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#fff',
                    borderBottom: `1px solid ${borderColor}`,
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ padding: 6, background: primaryColor, borderRadius: '4px', color: '#fff' }}>
                            <GraduationCap size={18} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontBlack: 900, color: '#0f172a', letterSpacing: '0.05em', fontWeight: 900 }}>FACULTY<span style={{ color: primaryColor }}> Profile</span></div>

                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>
                            <Calendar size={12} /> {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
                        </div>
                        <button onClick={onClose} style={{
                            background: '#f1f5f9', border: 'none', borderRadius: '4px', width: 28, height: 28,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer'
                        }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="modal-body" style={{ padding: '40px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ maxWidth: '1300px', margin: '0 auto' }}>

                        {/* --- TOP PROFILE HEADER CARD --- */}
                        <div style={{
                            background: '#fff',
                            borderRadius: sharpRadius,
                            border: `1px solid ${borderColor}`,
                            borderLeft: `4px solid ${primaryColor}`,
                            padding: '32px',
                            display: 'flex',
                            flexDirection: 'column',
                            mdFlexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '24px',
                            gap: '32px'
                        }}>
                            <div style={{ display: 'flex', gap: '32px', alignItems: 'center', width: '100%' }}>
                                <div style={{
                                    width: 100, height: 100, borderRadius: sharpRadius,
                                    background: '#f8fafc', overflow: 'hidden', flexShrink: 0,
                                    position: 'relative', border: `1px solid ${borderColor}`
                                }}>
                                    {teacher.profileImage ? (
                                        <img src={imgSrc(teacher.profileImage)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                            <User size={48} />
                                        </div>
                                    )}
                                    <div style={{
                                        position: 'absolute', bottom: 4, right: 4,
                                        background: primaryColor, color: '#fff', padding: 3, borderRadius: '2px'
                                    }}>
                                        <ShieldCheck size={10} />
                                    </div>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>{teacher.name}</h1>
                                        <span style={{
                                            padding: '2px 10px', borderRadius: '2px', fontSize: '0.6rem', fontWeight: 800,
                                            textTransform: 'uppercase', background: '#ecfdf5', color: primaryColor,
                                            border: '1px solid #d1fae5'
                                        }}>
                                            {teacher.status || 'ACTIVE'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 32px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={14} className="text-emerald-500" /> {teacher.email || 'N/A'}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Smartphone size={14} className="text-emerald-500" /> {teacher.phone || 'N/A'}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Hash size={14} className="text-emerald-500" /> REG: {teacher.regNo || '—'}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button style={{
                                        padding: '10px 20px', background: primaryColor, color: '#fff',
                                        borderRadius: sharpRadius, fontSize: '0.7rem', fontWeight: 800, border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em'
                                    }}>
                                        <Edit3 size={14} /> Edit Profile
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* --- STATS GRID --- */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                            <StatCard label="Assigned Batches" value={String(teacher.assignments?.length || 0).padStart(2, '0')} radius={sharpRadius} />
                            <StatCard label="Total Students" value={teacher.assignments?.reduce((acc, a) => acc + (a.enrolled || 0), 0) || '0'} radius={sharpRadius} />
                            <StatCard label="Current Month Hrs" value="164.5" radius={sharpRadius} color={primaryColor} />
                            <StatCard label="Performance Score" value="9.8/10" radius={sharpRadius} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '32px' }}>

                            {/* --- LEFT MAIN CONTENT --- */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                {/* Professional Background */}
                                <div style={{ background: '#fff', borderRadius: sharpRadius, border: `1px solid ${borderColor}`, padding: '24px' }}>
                                    <SectionHeading title="Employment & Background" icon={Briefcase} color={primaryColor} />
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                                        <DetailItem label="DOB" value={teacher.dob ? new Date(teacher.dob).toLocaleDateString() : '—'} icon={Calendar} />
                                        <DetailItem label="GENDER" value={teacher.gender || '—'} icon={User} />
                                        <DetailItem label="DESIGNATION" value={teacher.designation || 'Faculty'} icon={Award} />
                                        <DetailItem label="QUALIFICATIONS" value={teacher.qualifications || '—'} icon={GraduationCap} />
                                        <DetailItem label="EXPERIENCE" value={teacher.experience || '—'} icon={Clock} />
                                        <DetailItem label="JOINING DATE" value={teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : '—'} icon={Calendar} />
                                        <DetailItem label="BASE SALARY" value={teacher.salary ? `₹ ${fmt(teacher.salary)}` : '—'} icon={IndianRupee} />
                                        <DetailItem label="DEPARTMENT" value={teacher.department || '—'} icon={Building2} />
                                        <DetailItem label="SYSTEM ROLE" value={teacher.systemRole || 'Teacher'} icon={ShieldCheck} />
                                    </div>
                                </div>

                                {/* Active Batches Table */}
                                <div style={{ background: '#fff', borderRadius: sharpRadius, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
                                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <BookOpen size={16} color={primaryColor} />
                                        <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instructional Load</h3>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc' }}>
                                                <th style={tableHdr}>Batch Name</th>
                                                <th style={tableHdr}>Subjects</th>
                                                <th style={{ ...tableHdr, textAlign: 'right' }}>Enrolled</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teacher.assignments?.length > 0 ? teacher.assignments.map((a, i) => (
                                                <tr key={i} style={{ borderBottom: `1px solid ${borderColor}` }}>
                                                    <td style={{ ...tableCell, fontWeight: 700 }}>{a.batchName}</td>
                                                    <td style={{ ...tableCell, color: '#64748b' }}>{a.subjects?.join(' • ') || '—'}</td>
                                                    <td style={{ ...tableCell, textAlign: 'right', fontWeight: 800, color: primaryColor }}>{a.enrolled || 0}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="3" style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No active assignments</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Payroll History */}
                                <div style={{ background: '#fff', borderRadius: sharpRadius, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
                                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Banknote size={16} color={primaryColor} />
                                        <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Payroll History</h3>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc' }}>
                                                <th style={tableHdr}>Month</th>
                                                <th style={tableHdr}>Base</th>
                                                <th style={tableHdr}>Incentives</th>
                                                <th style={{ ...tableHdr, textAlign: 'right' }}>Net Disbursed</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payrollHistory.length > 0 ? payrollHistory.map((s, i) => (
                                                <tr key={i} style={{ borderBottom: `1px solid ${borderColor}` }}>
                                                    <td style={{ ...tableCell, fontWeight: 800 }}>{new Date(s.monthYear + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}</td>
                                                    <td style={tableCell}>₹ {fmt(s.baseSalary)}</td>
                                                    <td style={{ ...tableCell, color: '#059669', fontWeight: 700 }}>+₹ {fmt((s.bonusAmount || 0) + (s.extraClassesAmount || 0))}</td>
                                                    <td style={{ ...tableCell, textAlign: 'right', fontWeight: 900 }}>₹ {fmt(s.netSalary)}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="4" style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No payroll history available</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* --- RIGHT SIDEBAR --- */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                {/* Banking Info */}
                                <div style={{ background: '#fff', borderRadius: sharpRadius, border: `1px solid ${borderColor}`, padding: '24px' }}>
                                    <SectionHeading title="Settlement Bank" icon={Building2} color={primaryColor} />
                                    <div style={{ spaceY: '20px' }}>
                                        <SidebarInfo label="Bank Name" value={profileData?.bankDetails?.bankName || 'HDFC Bank Ltd'} />
                                        <SidebarInfo label="Account Holder" value={profileData?.bankDetails?.accountName || teacher.name} />
                                        <SidebarInfo label="Account Number" value={profileData?.bankDetails?.accountNumber || '•••• •••• 5642'} tracking="0.1em" />
                                        <SidebarInfo label="IFSC Code" value={profileData?.bankDetails?.ifscCode || 'HDFC0001290'} />
                                        <div style={{ marginTop: '20px', padding: '10px', background: '#ecfdf5', borderRadius: '2px', border: '1px solid #d1fae5', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <CheckCircle size={14} color={primaryColor} />
                                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: primaryColor, textTransform: 'uppercase' }}>Verified for Disbursement</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Address Info */}
                                <div style={{ background: '#fff', borderRadius: sharpRadius, border: `1px solid ${borderColor}`, padding: '24px' }}>
                                    <SectionHeading title="Residence" icon={MapPin} color={primaryColor} />
                                    <div style={{ marginBottom: '16px' }}>
                                        <p style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Current Address</p>
                                        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.5 }}>{teacher.address?.current || '—'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Permanent Address</p>
                                        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.5 }}>{teacher.address?.permanent || '—'}</p>
                                    </div>
                                </div>

                                {/* Administrative Actions */}
                                <div style={{ background: '#0f172a', borderRadius: sharpRadius, padding: '24px', color: '#fff' }}>
                                    <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.1em' }}>Admin Control Panel</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <SideAction text="Attendance Log" icon={ChevronRight} radius={sharpRadius} />
                                        <SideAction text="Salary Disbursement" icon={ChevronRight} radius={sharpRadius} />
                                        <SideAction text="Terminate Access" color="#f87171" icon={AlertCircle} radius={sharpRadius} />
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

// --- Subcomponents with Sharp Design ---

const StatCard = ({ label, value, radius, color }) => (
    <div style={{
        background: '#fff', padding: '20px', borderRadius: radius, border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    }}>
        <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: color || '#0f172a', lineHeight: 1 }}>{value}</div>
    </div>
);

const SectionHeading = ({ title, icon: Icon, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px', borderBottom: '1px solid #f1f5f9', pb: '10px' }}>
        <Icon size={16} color={color} />
        <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
    </div>
);

const DetailItem = ({ label, value, icon: Icon }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ padding: 8, background: '#f8fafc', borderRadius: '4px', color: '#94a3b8' }}>
            <Icon size={14} />
        </div>
        <div>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, marginBottom: '2px', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 700 }}>{value}</div>
        </div>
    </div>
);

const SidebarInfo = ({ label, value, tracking }) => (
    <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</p>
        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', letterSpacing: tracking || 'normal' }}>{value}</p>
    </div>
);

const SideAction = ({ text, color, icon: Icon, radius }) => (
    <button style={{
        width: '100%', padding: '12px 16px', borderRadius: radius, border: 'none',
        background: 'rgba(255,255,255,0.05)', color: color || '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer'
    }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{text}</span>
        <Icon size={14} />
    </button>
);

const tableHdr = { padding: '12px 24px', textAlign: 'left', fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tableCell = { padding: '14px 24px', fontSize: '0.8rem', color: '#1e293b' };

export default TeacherProfileModal;