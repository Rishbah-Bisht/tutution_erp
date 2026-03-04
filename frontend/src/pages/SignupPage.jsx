import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { checkAdminExists, adminSignup } from '../api/adminApi';
import {
    User, School, Mail, Lock, Home, Loader2, AlertCircle, ArrowRight,
    BookOpen, FileDigit, Eye, EyeOff, Phone, MapPin, FileText, Image as ImageIcon
} from 'lucide-react';

const inputStyle = {
    width: '100%', padding: '13px 16px 13px 44px',
    borderRadius: '12px', border: '1px solid #e2e8f0',
    background: '#f8fafc', fontSize: '0.9rem', outline: 'none',
    boxSizing: 'border-box', transition: 'border 0.2s'
};

const Field = ({ label, icon: Icon, children }) => (
    <div>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>{label}</label>
        <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                <Icon size={16} />
            </span>
            {children}
        </div>
    </div>
);

const SectionHeader = ({ label }) => (
    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '28px 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {label} <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
    </div>
);

const SignupPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        adminName: '', coachingName: '', email: '', phone: '', bio: '',
        password: '', confirmPassword: '',
        instituteAddress: '', instituteEmail: '', institutePhone: '',
        registrationNumber: '', roomsAvailable: '', classesOffered: ''
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [exists, setExists] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSub] = useState(false);
    const [error, setError] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [showCPwd, setShowCPwd] = useState(false);

    useEffect(() => {
        checkAdminExists()
            .then(({ data }) => setExists(data.exists))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleLogo = e => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const submit = async e => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
        if (form.password.length < 6) return setError('Password must be at least 6 characters.');
        setSub(true);
        try {
            const fd = new FormData();
            fd.append('adminName', form.adminName);
            fd.append('coachingName', form.coachingName);
            fd.append('email', form.email);
            fd.append('phone', form.phone);
            fd.append('bio', form.bio);
            fd.append('password', form.password);
            fd.append('instituteAddress', form.instituteAddress);
            fd.append('instituteEmail', form.instituteEmail);
            fd.append('institutePhone', form.institutePhone);
            fd.append('roomsAvailable', form.roomsAvailable);
            if (form.registrationNumber) fd.append('registrationNumber', form.registrationNumber);
            if (form.classesOffered) {
                const arr = form.classesOffered.split(',').map(c => c.trim()).filter(Boolean);
                fd.append('classesOffered', JSON.stringify(arr));
            }
            if (logoFile) fd.append('instituteLogo', logoFile);
            await adminSignup(fd);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Try again.');
        } finally { setSub(false); }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={40} color="#1b3a7a" className="spin" />
        </div>
    );

    if (exists) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <div style={{ maxWidth: 400, background: '#fff', borderRadius: 24, padding: '48px 40px', textAlign: 'center', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🔐</div>
                <h2 style={{ fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Admin Already Registered</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 28 }}>Please login to your existing account.</p>
                <Link to="/login">
                    <button style={{ background: '#1b3a7a', color: '#fff', padding: '12px 28px', borderRadius: 12, border: 'none', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
                        Go to Login <ArrowRight size={16} />
                    </button>
                </Link>
            </div>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f1f5f9', padding: '40px 20px', fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{
                width: '100%', maxWidth: 860, background: '#fff',
                borderRadius: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
                border: '1px solid rgba(226,232,240,0.8)', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '40px 40px 36px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1b3a7a 100%)',
                    color: '#fff', textAlign: 'center'
                }}>
                    <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.12)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <School size={28} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Institute Setup</h1>
                    <p style={{ marginTop: 6, opacity: 0.75, fontSize: '0.9rem', fontWeight: 500 }}>Create your admin account and configure your institute</p>
                </div>

                <form onSubmit={submit} style={{ padding: '36px 40px 40px' }}>
                    {error && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: 12, marginBottom: 24, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    {/* ── Section 1: Admin Info ── */}
                    <SectionHeader label="Administrator" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <Field label="Admin Name *" icon={User}>
                            <input name="adminName" placeholder="Full name" value={form.adminName} onChange={handle} required style={inputStyle} />
                        </Field>
                        <Field label="Personal Email" icon={Mail}>
                            <input name="email" type="email" placeholder="admin@example.com" value={form.email} onChange={handle} style={inputStyle} />
                        </Field>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <Field label="Phone Number" icon={Phone}>
                            <input name="phone" placeholder="10-digit mobile no." value={form.phone} onChange={handle} style={inputStyle} />
                        </Field>
                        <Field label="Bio / About" icon={FileText}>
                            <input name="bio" placeholder="Brief introduction (optional)" value={form.bio} onChange={handle} style={inputStyle} />
                        </Field>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Field label="Password *" icon={Lock}>
                            <input name="password" type={showPwd ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={handle} required style={inputStyle} />
                            <span onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }}>{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</span>
                        </Field>
                        <Field label="Confirm Password *" icon={Lock}>
                            <input name="confirmPassword" type={showCPwd ? 'text' : 'password'} placeholder="Repeat password" value={form.confirmPassword} onChange={handle} required style={inputStyle} />
                            <span onClick={() => setShowCPwd(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }}>{showCPwd ? <EyeOff size={16} /> : <Eye size={16} />}</span>
                        </Field>
                    </div>

                    {/* ── Section 2: Institute Info ── */}
                    <SectionHeader label="Institute Details" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <Field label="Institute / Coaching Name *" icon={School}>
                            <input name="coachingName" placeholder="e.g. Bright Future Academy" value={form.coachingName} onChange={handle} required style={inputStyle} />
                        </Field>
                        <Field label="Reg. Number (Optional)" icon={FileDigit}>
                            <input name="registrationNumber" placeholder="Govt. Reg / Trust No." value={form.registrationNumber} onChange={handle} style={inputStyle} />
                        </Field>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <Field label="Institute Address" icon={MapPin}>
                            <input name="instituteAddress" placeholder="Full address" value={form.instituteAddress} onChange={handle} style={inputStyle} />
                        </Field>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <Field label="Institute Email" icon={Mail}>
                            <input name="instituteEmail" type="email" placeholder="info@institute.com" value={form.instituteEmail} onChange={handle} style={inputStyle} />
                        </Field>
                        <Field label="Institute Phone" icon={Phone}>
                            <input name="institutePhone" placeholder="Contact number" value={form.institutePhone} onChange={handle} style={inputStyle} />
                        </Field>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <Field label="Rooms Available *" icon={Home}>
                            <input name="roomsAvailable" type="number" placeholder="No. of classrooms" value={form.roomsAvailable} onChange={handle} required style={inputStyle} />
                        </Field>
                        <Field label="Classes Offered" icon={BookOpen}>
                            <input name="classesOffered" placeholder="Class 11, JEE, NEET (comma separated)" value={form.classesOffered} onChange={handle} style={inputStyle} />
                        </Field>
                    </div>

                    {/* Logo Upload */}
                    <div style={{ marginBottom: 32 }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>Institute Logo (Optional)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            {logoPreview && (
                                <img src={logoPreview} alt="Logo Preview" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                            )}
                            <label style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '10px 20px', borderRadius: 10,
                                border: '1.5px dashed #cbd5e1', cursor: 'pointer',
                                color: '#64748b', fontSize: '0.85rem', fontWeight: 600
                            }}>
                                <ImageIcon size={16} /> Upload Logo
                                <input type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    <button type="submit" disabled={submitting} style={{
                        width: '100%', padding: '16px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #0f172a 0%, #1b3a7a 100%)',
                        color: '#fff', fontSize: '1rem', fontWeight: 900, border: 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        boxShadow: '0 10px 25px -5px rgba(15,23,42,0.25)', opacity: submitting ? 0.8 : 1
                    }}>
                        {submitting ? <><Loader2 size={20} className="spin" /> Setting Up System…</> : <>Complete Registration <ArrowRight size={20} /></>}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: '#64748b' }}>
                        Already registered? <Link to="/login" style={{ color: '#1b3a7a', fontWeight: 700, textDecoration: 'none' }}>Login here</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SignupPage;
