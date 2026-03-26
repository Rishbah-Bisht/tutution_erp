import React, { useState, useEffect, useRef } from 'react';
import {
    X, Plus, Lock, Eye, EyeOff, Loader2, Upload, XCircle,
    BookOpen, ShieldAlert, UserCircle2, Briefcase, GraduationCap,
    MapPin, Smartphone, Mail, Calendar, UserCheck, ShieldCheck,
    Info, Trash2, CheckCircle2, ChevronRight, User, Hash, IndianRupee,
    ListChecks, AlertTriangle, ArrowLeft, ArrowRight
} from 'lucide-react';
import ActionModal from '../common/ActionModal';

// --- Theme Constants ---
const primaryColor = 'var(--erp-primary)'; // Dynamic from CSS variables
const sharpRadius = '4px';
const borderColor = '#e2e8f0';
const labelColor = '#475569';
const headingColor = '#0f172a';

import apiClient from '../../api/apiConfig';

// --- Internal UI Components ---

const AlertMessage = ({ type, message, style }) => {
    const isError = type === 'error';
    return (
        <div style={{
            padding: '12px 16px',
            backgroundColor: isError ? '#fef2f2' : '#ecfdf5',
            border: `1px solid ${isError ? '#fca5a5' : '#d1fae5'}`,
            borderRadius: sharpRadius,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: isError ? '#991b1b' : '#065f46',
            fontSize: '0.85rem',
            fontWeight: 600,
            ...style
        }}>
            {isError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{message}</span>
        </div>
    );
};


const SubjectPicker = ({ subjects, selected, onToggle, batchId, teacherId }) => {
    const [conflicts, setConflicts] = useState({});

    useEffect(() => {
        const q = teacherId ? `?excludeTeacherId=${teacherId}` : '';
        apiClient.get(`/batches/${batchId}/subjects${q}`)
            .then(({ data }) => setConflicts(data.assignments || {}))
            .catch(() => { });
    }, [batchId, teacherId]);

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {subjects.map(sub => {
                const conflict = conflicts[sub];
                const checked = selected.includes(sub);
                const locked = !!conflict;
                return (
                    <button key={sub} type="button"
                        onClick={() => !locked && onToggle(sub)}
                        style={{
                            padding: '8px 12px', borderRadius: sharpRadius, fontSize: '0.75rem', fontWeight: 700,
                            cursor: locked ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                            background: locked ? '#f8fafc' : checked ? primaryColor : '#fff',
                            color: locked ? '#cbd5e1' : checked ? '#fff' : '#64748b',
                            border: `1px solid ${locked ? '#f1f5f9' : checked ? primaryColor : borderColor}`,
                            display: 'flex', alignItems: 'center', gap: 6, minHeight: '36px'
                        }}>
                        {locked ? <Lock size={12} /> : checked ? <CheckCircle2 size={12} /> : <Plus size={12} />}
                        <span>{sub}</span>
                    </button>
                );
            })}
        </div>
    );
};

const TeacherFormModal = ({ mode, teacher, batches, toast, onSave, onClose, imgSrc }) => {
    const [tab, setTab] = useState(0);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const [pwdModal, setPwdModal] = useState(false);
    const [adminPwd, setAdminPwd] = useState('');
    const [pwdErr, setPwdErr] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);

    // Form States
    const [name, setName] = useState(teacher?.name || '');
    const [dob, setDob] = useState(teacher?.dob?.slice(0, 10) || '');
    const [gender, setGender] = useState(teacher?.gender || 'Male');
    const [phone, setPhone] = useState(teacher?.phone || '');
    const [altPhone, setAltPhone] = useState(teacher?.altPhone || '');
    const [email, setEmail] = useState(teacher?.email || '');
    const [currentAddress, setCurrentAddress] = useState(teacher?.address?.current || '');
    const [permanentAddress, setPermanentAddress] = useState(teacher?.address?.permanent || '');
    const [imgFile, setImgFile] = useState(null);
    const [imgPreview, setImgPreview] = useState(teacher?.profileImage ? imgSrc(teacher.profileImage) : null);
    const [regNo, setRegNo] = useState(teacher?.regNo || '');
    const [department, setDepartment] = useState(teacher?.department || '');
    const [designation, setDesignation] = useState(teacher?.designation || '');
    const [qualifications, setQualifications] = useState(teacher?.qualifications || '');
    const [experience, setExperience] = useState(teacher?.experience || '');
    const [joiningDate, setJoiningDate] = useState(teacher?.joiningDate?.slice(0, 10) || '');
    const [salary, setSalary] = useState(teacher?.salary || '');
    const [assignments, setAssignments] = useState(
        (teacher?.assignments || []).map(a => ({
            batchId: a.batchId?._id || a.batchId || '',
            batchName: a.batchId?.name || a.batchName || '',
            subjects: a.subjects || []
        }))
    );
    const [selBatch, setSelBatch] = useState('');
    const [teacherPwd, setTeacherPwd] = useState('');
    const [showTpwd, setShowTpwd] = useState(false);
    const [systemRole, setSystemRole] = useState(teacher?.systemRole || 'Teacher');
    const [status, setStatus] = useState(teacher?.status || 'active');

    const fileRef = useRef();

    const pickImage = e => {
        const f = e.target.files?.[0];
        if (!f) return;
        setImgFile(f);
        const r = new FileReader();
        r.onload = ev => setImgPreview(ev.target.result);
        r.readAsDataURL(f);
    };

    const addBatch = () => {
        if (!selBatch) return;
        const b = batches.find(b => b._id === selBatch);
        if (!b || assignments.some(a => a.batchId === selBatch)) return;
        setAssignments(prev => [...prev, { batchId: selBatch, batchName: b.name, subjects: [] }]);
        setSelBatch('');
    };

    const removeBatch = batchId => setAssignments(prev => prev.filter(a => a.batchId !== batchId));

    const toggleSubject = (batchId, sub) => {
        setAssignments(prev => prev.map(a =>
            a.batchId === batchId
                ? { ...a, subjects: a.subjects.includes(sub) ? a.subjects.filter(s => s !== sub) : [...a.subjects, sub] }
                : a
        ));
    };

    const buildFormData = () => {
        const fd = new FormData();
        fd.append('name', name);
        fd.append('dob', dob);
        fd.append('gender', gender);
        fd.append('email', email);
        fd.append('phone', phone);
        fd.append('altPhone', altPhone);
        fd.append('currentAddress', currentAddress);
        fd.append('permanentAddress', permanentAddress);
        if (imgFile) fd.append('profileImage', imgFile);
        fd.append('department', department);
        fd.append('designation', designation);
        fd.append('qualifications', qualifications);
        fd.append('experience', experience);
        fd.append('joiningDate', joiningDate);
        fd.append('salary', salary);
        fd.append('assignments', JSON.stringify(assignments));
        if (mode === 'create' && !teacherPwd) fd.append('password', 'TCH@123');
        else if (teacherPwd) fd.append('password', teacherPwd);
        fd.append('systemRole', systemRole);
        fd.append('status', status);
        return fd;
    };

    const doCreate = async () => {
        setSaving(true); setErr('');
        try {
            await apiClient.post('/teachers', buildFormData(), { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(`Teacher "${name}" registered successfully!`);
            onSave();
        } catch (e) { setErr(e.response?.data?.message || 'Save failed'); }
        finally { setSaving(false); }
    };

    const doUpdate = async (password) => {
        setPwdLoading(true); setPwdErr('');
        try {
            const fd = buildFormData();
            fd.append('adminPassword', password);
            await apiClient.put(`/teachers/${teacher._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(`Records updated for ${name}`);
            setPwdModal(false);
            onSave();
        } catch (e) { setPwdErr(e.response?.data?.message || 'Update failed'); }
        finally { setPwdLoading(false); }
    };

    const handleSubmit = e => {
        e.preventDefault();
        if (!name.trim()) { setTab(0); return setErr('Full name is required'); }
        if (mode === 'create') doCreate();
        else { setPwdModal(true); setPwdErr(''); setAdminPwd(''); }
    };

    const tabs = [
        { label: 'Personal Information', icon: <User size={15} /> },
        { label: 'Professional Profile', icon: <Briefcase size={15} /> },
        { label: 'Course Allocation', icon: <ListChecks size={15} /> },
        { label: 'Security & Auth', icon: <ShieldCheck size={15} /> }
    ];

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <style>{`
                @media (max-width: 640px) {
                    .t-modal-header { padding: 16px 20px !important; }
                    .t-form-body { padding: 20px !important; }
                    .t-tabs-container { margin-bottom: 20px !important; overflow-x: auto !important; justify-content: flex-start !important; }
                    .t-tab-btn { padding: 12px 10px !important; min-width: 120px !important; }
                    .t-photo-wrap { flex-direction: column !important; gap: 16px !important; text-align: center !important; }
                    .t-footer { flex-direction: column-reverse !important; gap: 12px !important; margin-top: 24px !important; }
                    .t-footer button { width: 100% !important; justify-content: center !important; }
                }
            `}</style>
            <div className="modal" style={{
                width: '100%', maxWidth: '900px', maxHeight: '92vh',
                background: '#f8fafc', borderRadius: '12px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                position: 'relative'
            }}>

                {/* --- TOP BAR (Inside Modal Box) --- */}
                <header className="t-modal-header" style={{
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
                    {/* Decorative Large Icon in Background */}
                    <UserCircle2 size={140} style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', opacity: 0.1, color: '#fff' }} className="hide-mobile" />

                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }} className="hide-mobile">
                            <GraduationCap size={24} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                {mode === 'edit' ? 'Update Teacher' : 'New Faculty'}
                            </h2>
                            <div style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 500, marginTop: 2 }}>
                                {mode === 'edit' ? `ID: ${teacher?.regNo}` : 'Registration Portal'}
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
                        <X size={16} /> <span className="hide-mobile">CLOSE</span>
                    </button>
                </header>

                <div style={{ flex: 1, overflowY: 'auto' }}>

                    {/* Progress Tabs - Simple Style */}
                    <div className="t-tabs-container" style={{ display: 'flex', border: `1.5px solid ${borderColor}`, borderRadius: sharpRadius, background: '#fff', marginBottom: 40, overflow: 'hidden' }}>
                        {tabs.map((t, i) => (
                            <button key={i} type="button" onClick={() => setTab(i)}
                                className="t-tab-btn"
                                style={{
                                    flex: 1, padding: '16px 12px', border: 'none', background: tab === i ? '#f8fafc' : '#fff',
                                    color: tab === i ? primaryColor : '#94a3b8', cursor: 'pointer',
                                    borderBottom: `2.5px solid ${tab === i ? primaryColor : 'transparent'}`,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: '0.2s',
                                    borderRight: i < 3 ? `1px solid ${borderColor}` : 'none'
                                }}>
                                {t.icon}
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.label}</span>
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="t-form-body" style={{ background: '#fff', border: `1.5px solid ${borderColor}`, borderRadius: sharpRadius, padding: '40px' }}>
                        {err && <AlertMessage type="error" message={err} style={{ marginBottom: 32 }} />}

                        {/* --- TAB 1: PERSONAL --- */}
                        {tab === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                                <div style={{ display: 'flex', gap: 32, alignItems: 'center', pb: 8 }} className="t-photo-wrap">
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <div style={{ width: 110, height: 110, borderRadius: sharpRadius, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${borderColor}`, overflow: 'hidden' }}>
                                            {imgPreview ? <img src={imgPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <User size={48} color="#cbd5e1" />}
                                        </div>
                                        <button type="button" onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: -8, right: -8, background: primaryColor, color: '#fff', border: 'none', borderRadius: '4px', padding: 8, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                            <Upload size={14} />
                                        </button>
                                        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickImage} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: headingColor }}>Faculty Portrait</h4>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>Upload high-resolution photo for ID and profile.</p>
                                    </div>
                                </div>

                                <div className="mf-row">
                                    <div className="mf" style={{ flex: 2 }}><label>FULL NAME *</label><input style={{ borderRadius: sharpRadius, border: `1.5px solid ${borderColor}` }} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" required /></div>
                                    <div className="mf"><label>GENDER</label>
                                        <select style={{ borderRadius: sharpRadius, border: `1.5px solid ${borderColor}` }} value={gender} onChange={e => setGender(e.target.value)}>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mf-row">
                                    <div className="mf"><label>DATE OF BIRTH</label><input type="date" style={{ borderRadius: sharpRadius, border: `1.5px solid ${borderColor}` }} value={dob} onChange={e => setDob(e.target.value)} /></div>
                                    <div className="mf"><label>OFFICIAL EMAIL</label><input type="email" style={{ borderRadius: sharpRadius, border: `1.5px solid ${borderColor}` }} value={email} onChange={e => setEmail(e.target.value)} placeholder="faculty@inst.edu" /></div>
                                </div>

                                <div className="mf-row">
                                    <div className="mf"><label>PHONE NUMBER *</label><input style={{ borderRadius: sharpRadius, border: `1.5px solid ${borderColor}` }} value={phone} onChange={e => setPhone(e.target.value)} required /></div>
                                    <div className="mf"><label>EMERGENCY CONTACT</label><input style={{ borderRadius: sharpRadius, border: `1.5px solid ${borderColor}` }} value={altPhone} onChange={e => setAltPhone(e.target.value)} /></div>
                                </div>

                                <div className="mf"><label>RESIDENCE ADDRESS (CURRENT)</label><textarea style={{ borderRadius: sharpRadius, minHeight: 80, padding: 12, border: `1.5px solid ${borderColor}` }} value={currentAddress} onChange={e => setCurrentAddress(e.target.value)} /></div>
                                <div className="mf"><label>PERMANENT ADDRESS (AS PER ID)</label><textarea style={{ borderRadius: sharpRadius, minHeight: 80, padding: 12, border: `1.5px solid ${borderColor}` }} value={permanentAddress} onChange={e => setPermanentAddress(e.target.value)} /></div>
                            </div>
                        )}

                        {/* --- TAB 2: PROFESSIONAL --- */}
                        {tab === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                                <div className="mf-row">
                                    <div className="mf"><label>DEPARTMENT</label><input style={{ borderRadius: sharpRadius, border: `1.5px solid ${borderColor}` }} value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Science, Arts" /></div>
                                    <div className="mf"><label>DESIGNATION</label><input style={{ borderRadius: sharpRadius, border: `1.5px solid ${borderColor}` }} value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Senior Teacher" /></div>
                                </div>

                                <div className="mf"><label>ACADEMIC QUALIFICATIONS</label><input style={{ borderRadius: sharpRadius, border: `1.5px solid ${borderColor}` }} value={qualifications} onChange={e => setQualifications(e.target.value)} placeholder="e.g. Ph.D, M.Sc (Physics)" /></div>

                                <div className="mf-row">
                                    <div className="mf"><label>TOTAL EXPERIENCE</label><input style={{ borderRadius: sharpRadius, border: `1.5px solid ${borderColor}` }} value={experience} onChange={e => setExperience(e.target.value)} placeholder="e.g. 5 Years" /></div>
                                    <div className="mf"><label>DATE OF JOINING</label><input type="date" style={{ borderRadius: sharpRadius, border: `1.5px solid ${borderColor}` }} value={joiningDate} onChange={e => setJoiningDate(e.target.value)} /></div>
                                </div>

                                <div className="mf-row">
                                    <div className="mf" style={{ position: 'relative' }}>
                                        <label>BASE MONTHLY SALARY (INR)</label>
                                        <div style={{ position: 'relative' }}>
                                            <IndianRupee size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input type="number" style={{ borderRadius: sharpRadius, paddingLeft: 36, border: `1.5px solid ${borderColor}` }} value={salary} onChange={e => setSalary(e.target.value)} placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="mf" style={{ visibility: 'hidden' }}><label>.</label><input /></div>
                                </div>
                            </div>
                        )}

                        {/* --- TAB 3: ALLOCATION --- */}
                        {tab === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: sharpRadius, border: `1.5px solid ${borderColor}` }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: labelColor, display: 'block', marginBottom: 12 }}>ASSIGN NEW BATCH</label>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <select value={selBatch} onChange={e => setSelBatch(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: sharpRadius, border: `1.5px solid ${borderColor}`, fontWeight: 700, outline: 'none' }}>
                                            <option value="">Select available batch...</option>
                                            {batches.filter(b => !assignments.some(a => a.batchId === b._id)).map(b => (
                                                <option key={b._id} value={b._id}>{b.name}</option>
                                            ))}
                                        </select>
                                        <button type="button" onClick={addBatch} disabled={!selBatch} style={{ padding: '0 24px', background: primaryColor, color: '#fff', border: 'none', borderRadius: sharpRadius, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.7rem' }}>
                                            <Plus size={16} /> ASSIGN
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {assignments.map(a => (
                                        <div key={a.batchId} style={{ background: '#fff', border: `1.5px solid ${borderColor}`, borderRadius: sharpRadius, overflow: 'hidden' }}>
                                            <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: `1.5px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: headingColor, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <BookOpen size={15} color={primaryColor} /> {a.batchName}
                                                </div>
                                                <button type="button" onClick={() => removeBatch(a.batchId)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', hover: { color: '#ef4444' } }}>
                                                    <XCircle size={18} />
                                                </button>
                                            </div>
                                            <div style={{ padding: 20 }}>
                                                <SubjectPicker
                                                    subjects={batches.find(b => b._id === a.batchId)?.subjects || []}
                                                    selected={a.subjects}
                                                    onToggle={sub => toggleSubject(a.batchId, sub)}
                                                    batchId={a.batchId}
                                                    teacherId={teacher?._id}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {assignments.length === 0 && (
                                    <div style={{ padding: '60px 0', textAlign: 'center', color: '#cbd5e1' }}>
                                        <ListChecks size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                                        <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#94a3b8' }}>Assign batches to this faculty to see allocation details.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- TAB 4: AUTHENTICATION --- */}
                        {tab === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                                <div className="mf-row">
                                    <div className="mf">
                                        <label>LOGIN ID (AUTO)</label>
                                        <div style={{ position: 'relative' }}>
                                            <Hash size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input value={regNo || 'TCH-PENDING'} disabled style={{ paddingLeft: 36, background: '#f8fafc', fontWeight: 800, borderRadius: sharpRadius, color: primaryColor, border: `1.5px solid ${borderColor}` }} />
                                        </div>
                                    </div>
                                    <div className="mf">
                                        <label>SYSTEM ROLE</label>
                                        <select style={{ borderRadius: sharpRadius, fontWeight: 700, border: `1.5px solid ${borderColor}` }} value={systemRole} onChange={e => setSystemRole(e.target.value)}>
                                            <option value="Teacher">Standard Teacher</option>
                                            <option value="Admin">Department Admin</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mf-row">
                                    <div className="mf">
                                        <label>PORTAL PASSWORD {mode === 'edit' && '(Leave blank to retain)'}</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input type={showTpwd ? 'text' : 'password'} value={teacherPwd} onChange={e => setTeacherPwd(e.target.value)} placeholder={mode === 'edit' ? '••••••••' : 'Default: TCH@123'} style={{ paddingLeft: 36, borderRadius: sharpRadius, border: `1.5px solid ${borderColor}` }} />
                                            <button type="button" onClick={() => setShowTpwd(!showTpwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>
                                                {showTpwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mf">
                                        <label>ACCOUNT STATUS</label>
                                        <select style={{ borderRadius: sharpRadius, fontWeight: 700, border: `1.5px solid ${borderColor}` }} value={status} onChange={e => setStatus(e.target.value)}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive / Suspended</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ padding: '24px', background: '#f8fafc', border: `1px solid ${borderColor}`, borderRadius: sharpRadius, display: 'flex', gap: 16, alignItems: 'center' }}>
                                    <div style={{ background: '#ecfdf5', padding: 8, borderRadius: '4px', color: primaryColor }}>
                                        <ShieldCheck size={20} />
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.6, fontWeight: 600 }}>
                                        Credential management is governed by system security policies. Ensure password complexity for administrative roles.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* --- FORM ACTIONS --- */}
                        <div className="t-footer" style={{ marginTop: 48, paddingTop: 32, borderTop: `1.5px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between' }}>
                            <button type="button" onClick={() => tab > 0 ? setTab(tab - 1) : onClose()}
                                style={{
                                    padding: '12px 24px', background: '#fff', border: `1.5px solid ${borderColor}`,
                                    borderRadius: sharpRadius, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8, color: '#64748b'
                                }}>
                                {tab > 0 ? <><ArrowLeft size={16} /> BACK</> : 'CANCEL'}
                            </button>

                            {tab < 3 ? (
                                <button type="button" onClick={() => setTab(tab + 1)}
                                    style={{
                                        padding: '12px 32px', background: primaryColor, color: '#fff', border: 'none',
                                        borderRadius: sharpRadius, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 6px -1px rgba(5,150,105,0.2)'
                                    }}>
                                    CONTINUE <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button type="submit" disabled={saving}
                                    style={{
                                        padding: '12px 40px', background: primaryColor, color: '#fff', border: 'none',
                                        borderRadius: sharpRadius, fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 6px -1px rgba(5,150,105,0.2)',
                                        opacity: saving ? 0.7 : 1
                                    }}>
                                    {saving ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
                                    {mode === 'edit' ? 'UPDATE RECORDS' : 'FINALIZE REGISTRATION'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>



            {/* Authorization Modal */}
            <ActionModal
                isOpen={pwdModal}
                onClose={() => setPwdModal(false)}
                onConfirm={doUpdate}
                title="Authorization Required"
                description={`You are updating records for "${name}". Administrative privileges are required to confirm these changes.`}
                actionType="verify"
                loading={pwdLoading}
                error={pwdErr}
            />
        </div>
    );
};

export default TeacherFormModal;