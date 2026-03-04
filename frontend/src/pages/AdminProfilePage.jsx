import React, { useState, useEffect, useRef } from 'react';
import ERPLayout from '../components/ERPLayout';
import { getAdminProfile, updateAdminProfile } from '../api/adminApi';
import {
    User, School, Mail, Phone, FileDigit, Home, Palette, BookOpen,
    Loader2, Image as ImageIcon, CheckCircle2, ShieldCheck, Pencil,
    X, Save, Camera, BadgeCheck
} from 'lucide-react';
import ActionModal from '../components/common/ActionModal';
import AlertMessage from '../components/common/AlertMessage';
import '../index.css';

const AdminProfilePage = () => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [alert, setAlert] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const fileInputRef = useRef(null);

    // View data (read-only)
    const [profile, setProfile] = useState(null);

    // Edit form data
    const [form, setForm] = useState({
        adminName: '', coachingName: '', email: '', phone: '', bio: '',
        registrationNumber: '', roomsAvailable: '',
        themeColor1: '#1b3a7a', themeColor2: '#c53030', classesOffered: '',
        instituteAddress: '', instituteEmail: '', institutePhone: '',
        emailNotificationsEnabled: true
    });
    const [logoPreview, setLogoPreview] = useState('');
    const [logoFile, setLogoFile] = useState(null);

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const { data } = await getAdminProfile();
            setProfile(data);
            setForm({
                adminName: data.adminName || '',
                coachingName: data.coachingName || '',
                email: data.email || '',
                phone: data.phone || '',
                bio: data.bio || '',
                registrationNumber: data.registrationNumber || '',
                roomsAvailable: data.roomsAvailable || '',
                themeColor1: data.themeColors?.[0] || '#1b3a7a',
                themeColor2: data.themeColors?.[1] || '#c53030',
                classesOffered: (data.classesOffered || []).join(', '),
                instituteAddress: data.instituteAddress || '',
                instituteEmail: data.instituteEmail || '',
                institutePhone: data.institutePhone || '',
                emailNotificationsEnabled: data.emailNotificationsEnabled !== false
            });
            setLogoPreview(data.instituteLogo || '');
        } catch (err) {
            setAlert({ type: 'error', text: 'Failed to load profile details.' });
        } finally {
            setLoading(false);
        }
    };

    const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleCancel = () => {
        // Revert form to profile data
        if (profile) {
            setForm({
                adminName: profile.adminName || '',
                coachingName: profile.coachingName || '',
                email: profile.email || '',
                phone: profile.phone || '',
                bio: profile.bio || '',
                registrationNumber: profile.registrationNumber || '',
                roomsAvailable: profile.roomsAvailable || '',
                themeColor1: profile.themeColors?.[0] || '#1b3a7a',
                themeColor2: profile.themeColors?.[1] || '#c53030',
                classesOffered: (profile.classesOffered || []).join(', '),
                instituteAddress: profile.instituteAddress || '',
                instituteEmail: profile.instituteEmail || '',
                institutePhone: profile.institutePhone || '',
                emailNotificationsEnabled: profile.emailNotificationsEnabled !== false
            });
            setLogoPreview(profile.instituteLogo || '');
            setLogoFile(null);
        }
        setEditMode(false);
        setAlert(null);
    };

    const handleSaveRequest = (e) => {
        e.preventDefault();
        // Basic validation
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
            setAlert({ type: 'error', text: 'Please enter a valid email address.' });
            return;
        }
        if (form.phone && !/^\+?[\d\s\-()]{7,15}$/.test(form.phone)) {
            setAlert({ type: 'error', text: 'Please enter a valid phone number.' });
            return;
        }
        setAlert(null);
        setShowConfirm(true);
    };

    const confirmUpdate = async (password) => {
        setShowConfirm(false);
        setSubmitting(true);
        setAlert(null);
        try {
            const formData = new FormData();
            formData.append('adminName', form.adminName);
            formData.append('coachingName', form.coachingName);
            formData.append('email', form.email);
            formData.append('phone', form.phone);
            formData.append('bio', form.bio);
            formData.append('registrationNumber', form.registrationNumber);
            formData.append('roomsAvailable', form.roomsAvailable);
            formData.append('adminPassword', password);
            formData.append('themeColors', JSON.stringify([form.themeColor1, form.themeColor2]));
            const classesArray = form.classesOffered.split(',').map(c => c.trim()).filter(Boolean);
            formData.append('classesOffered', JSON.stringify(classesArray));
            formData.append('instituteAddress', form.instituteAddress);
            formData.append('instituteEmail', form.instituteEmail);
            formData.append('institutePhone', form.institutePhone);
            formData.append('emailNotificationsEnabled', form.emailNotificationsEnabled);
            if (logoFile) formData.append('instituteLogo', logoFile);

            const { data } = await updateAdminProfile(formData);

            // Sync local storage
            const oldAdmin = JSON.parse(localStorage.getItem('admin') || '{}');
            const updatedAdminData = { ...oldAdmin, ...data.admin };
            localStorage.setItem('admin', JSON.stringify(updatedAdminData));

            // Sync instituteSettings for PDF generators
            localStorage.setItem('instituteSettings', JSON.stringify({
                instituteName: data.admin.coachingName,
                instituteLogo: data.admin.instituteLogo,
                instituteAddress: data.admin.instituteAddress,
                instituteEmail: data.admin.instituteEmail,
                institutePhone: data.admin.institutePhone,
                // Backward compatibility
                address: data.admin.instituteAddress,
                email: data.admin.instituteEmail,
                phone: data.admin.institutePhone,
                coachingName: data.admin.coachingName
            }));

            // Apply theme immediately
            document.documentElement.style.setProperty('--erp-primary', form.themeColor1);
            document.documentElement.style.setProperty('--erp-secondary', form.themeColor2);

            setProfile(data.admin);
            setLogoFile(null);
            setEditMode(false);
            setAlert({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            setAlert({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
            setEditMode(true);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <ERPLayout title="Admin Profile">
            <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                <Loader2 size={40} className="spin" color="var(--erp-primary)" />
            </div>
        </ERPLayout>
    );

    const avatarLetter = (profile?.adminName || 'A').charAt(0).toUpperCase();

    return (
        <ERPLayout title="Admin Profile">
            {alert && <AlertMessage type={alert.type} message={alert.text} onClose={() => setAlert(null)} />}

            <div style={{ margin: '0 20px' }}>

                {/* === PROFILE CARD === */}
                <div className="card" style={{ overflow: 'hidden', borderRadius: 20, border: 'none', boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>

                    {/* Header Banner */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                        padding: '40px 40px 70px',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        <ShieldCheck size={160} style={{ position: 'absolute', right: -20, bottom: -40, opacity: 0.06, color: '#fff' }} />
                        <div style={{ color: '#fff' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>
                                {editMode ? 'Edit Profile' : 'Admin Profile'}
                            </h2>
                            <p style={{ opacity: 0.7, marginTop: 6, fontSize: '0.9rem' }}>
                                {editMode ? 'Update your institute and personal details' : 'Manage your academy and account settings'}
                            </p>
                        </div>
                    </div>

                    {/* Avatar overlapping the banner */}
                    <div style={{ position: 'relative', padding: '0 40px', marginTop: -50 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo"
                                        style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', background: '#fff' }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            setLogoPreview('');
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                                        border: '4px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '2rem', fontWeight: 900, color: '#fff'
                                    }}>
                                        {avatarLetter}
                                    </div>
                                )}
                                {editMode && (
                                    <button type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            position: 'absolute', bottom: 4, right: 4,
                                            width: 28, height: 28, borderRadius: '50%',
                                            background: '#1e3a5f', border: '2px solid #fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', color: '#fff'
                                        }}>
                                        <Camera size={13} />
                                    </button>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*"
                                    style={{ display: 'none' }} onChange={handleLogoChange} />
                            </div>

                            {/* Action Buttons */}
                            <div style={{ paddingBottom: 8, display: 'flex', gap: 8 }}>
                                {!editMode ? (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setEditMode(true)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                                    >
                                        <Pencil size={14} /> Update Profile
                                    </button>
                                ) : (
                                    <>
                                        <button type="button" className="btn btn-outline"
                                            onClick={handleCancel}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <X size={14} /> Cancel
                                        </button>
                                        <button type="submit" form="profile-form"
                                            className="btn btn-primary"
                                            disabled={submitting}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {submitting ? <><Loader2 size={14} className="spin" /> Saving...</>
                                                : <><Save size={14} /> Save Changes</>}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Name + Title under avatar */}
                        <div style={{ marginTop: 16, marginBottom: 28 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                                    {profile?.adminName || 'Administrator'}
                                </h3>
                                <BadgeCheck size={20} color="#2563eb" />
                            </div>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontWeight: 500, fontSize: '0.9rem' }}>
                                {profile?.coachingName || 'Institute Name'} • Admin
                            </p>
                            {profile?.bio && !editMode && (
                                <p style={{ marginTop: 8, color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 500 }}>
                                    {profile.bio}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: '#f1f5f9', margin: '0 40px' }} />

                    {/* ===== VIEW MODE ===== */}
                    {!editMode && (
                        <div style={{ padding: '32px 40px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                {[
                                    { icon: <Mail size={15} />, label: 'Email', value: profile?.email || '—' },
                                    { icon: <Phone size={15} />, label: 'Phone', value: profile?.phone || '—' },
                                    { icon: <Home size={15} />, label: 'Rooms Available', value: profile?.roomsAvailable || '—' },
                                    { icon: <FileDigit size={15} />, label: 'Registration No.', value: profile?.registrationNumber || '—' },
                                    { icon: <Home size={15} />, label: 'Inst. Address', value: profile?.instituteAddress || '—' },
                                    { icon: <Mail size={15} />, label: 'Inst. Email', value: profile?.instituteEmail || '—' },
                                    { icon: <Phone size={15} />, label: 'Inst. Phone', value: profile?.institutePhone || '—' },
                                    { icon: <BookOpen size={15} />, label: 'Classes Offered', value: (profile?.classesOffered || []).join(', ') || '—', full: true },
                                    { icon: <ShieldCheck size={15} />, label: 'Automated Emails', value: profile?.emailNotificationsEnabled !== false ? 'Enabled' : 'Disabled', full: true },
                                ].map((item, i) => (
                                    <div key={i} style={{
                                        gridColumn: item.full ? '1 / -1' : 'auto',
                                        background: '#f8fafc', borderRadius: 12, padding: '14px 18px',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                            {item.icon} {item.label}
                                        </div>
                                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Theme Colors */}
                            <div style={{ marginTop: 20, background: '#f8fafc', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                                    <Palette size={15} /> Theme Colors
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {(profile?.themeColors || ['#1b3a7a', '#c53030']).map((c, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid #e2e8f0' }} />
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#475569' }}>{c}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== EDIT MODE ===== */}
                    {editMode && (
                        <form id="profile-form" onSubmit={handleSaveRequest} style={{ padding: '32px 40px' }}>

                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                                Personal Information <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                <div className="lf">
                                    <label><User size={12} style={{ marginRight: 5 }} />Admin Name *</label>
                                    <input className="input-field" name="adminName" value={form.adminName} onChange={handle} required />
                                </div>
                                <div className="lf">
                                    <label><School size={12} style={{ marginRight: 5 }} />Coaching / Institute Name *</label>
                                    <input className="input-field" name="coachingName" value={form.coachingName} onChange={handle} required />
                                </div>
                                <div className="lf">
                                    <label><Mail size={12} style={{ marginRight: 5 }} />Email Address</label>
                                    <input className="input-field" name="email" type="email" value={form.email} onChange={handle} placeholder="admin@example.com" />
                                </div>
                                <div className="lf">
                                    <label><Phone size={12} style={{ marginRight: 5 }} />Phone Number</label>
                                    <input className="input-field" name="phone" value={form.phone} onChange={handle} placeholder="+91 99999 99999" />
                                </div>
                                <div className="lf" style={{ gridColumn: '1 / -1' }}>
                                    <label><User size={12} style={{ marginRight: 5 }} />Bio / About</label>
                                    <textarea className="input-field" name="bio" value={form.bio} onChange={handle}
                                        placeholder="A short description about you or the institute..."
                                        rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                                </div>
                            </div>

                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                                Institute Details <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                <div className="lf">
                                    <label><Home size={12} style={{ marginRight: 5 }} />Rooms Available *</label>
                                    <input className="input-field" name="roomsAvailable" type="number" value={form.roomsAvailable} onChange={handle} required />
                                </div>
                                <div className="lf">
                                    <label><FileDigit size={12} style={{ marginRight: 5 }} />Registration Number</label>
                                    <input className="input-field" name="registrationNumber" value={form.registrationNumber} onChange={handle} />
                                </div>
                                <div className="lf" style={{ gridColumn: '1 / -1' }}>
                                    <label><BookOpen size={12} style={{ marginRight: 5 }} />Classes / Courses Offered</label>
                                    <input className="input-field" name="classesOffered" value={form.classesOffered} onChange={handle} placeholder="e.g. Class 11 Science, JEE Mains" />
                                </div>
                                <div className="lf" style={{ gridColumn: '1 / -1' }}>
                                    <label><Home size={12} style={{ marginRight: 5 }} />Institute Full Address</label>
                                    <textarea className="input-field" name="instituteAddress" value={form.instituteAddress} onChange={handle}
                                        placeholder="Full address for receipts..." rows={2} style={{ resize: 'vertical' }} />
                                </div>
                                <div className="lf">
                                    <label><Mail size={12} style={{ marginRight: 5 }} />Institute Contact Email</label>
                                    <input className="input-field" name="instituteEmail" value={form.instituteEmail} onChange={handle} placeholder="institute@example.com" />
                                </div>
                                <div className="lf">
                                    <label><Phone size={12} style={{ marginRight: 5 }} />Institute Contact Phone</label>
                                    <input className="input-field" name="institutePhone" value={form.institutePhone} onChange={handle} placeholder="+91 00000 00000" />
                                </div>
                            </div>

                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                                Visual Branding <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {[
                                    { name: 'themeColor1', label: 'Primary Color' },
                                    { name: 'themeColor2', label: 'Secondary Color' }
                                ].map(({ name, label }) => (
                                    <div key={name} className="lf" style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                        <label><Palette size={12} style={{ marginRight: 5 }} />{label}</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                            <input type="color" name={name} value={form[name]} onChange={handle}
                                                style={{ height: 40, width: 48, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                                            <span style={{ fontFamily: 'monospace', color: '#4a5568', background: '#fff', padding: '4px 8px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                                                {form[name]}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
                                System Settings <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                                <div className="lf" style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <label style={{ margin: 0 }}><Mail size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />Automated Email Notifications</label>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Send automated emails for fees, batch assignments, and registrations.</p>
                                    </div>
                                    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                                        <input
                                            type="checkbox"
                                            checked={form.emailNotificationsEnabled}
                                            onChange={(e) => setForm({ ...form, emailNotificationsEnabled: e.target.checked })}
                                            style={{ opacity: 0, width: 0, height: 0 }}
                                        />
                                        <span style={{
                                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                            backgroundColor: form.emailNotificationsEnabled ? '#10b981' : '#cbd5e1',
                                            transition: '.4s', borderRadius: 24
                                        }}>
                                            <span style={{
                                                position: 'absolute', content: '""', height: 18, width: 18, left: 3, bottom: 3,
                                                backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                                                transform: form.emailNotificationsEnabled ? 'translateX(20px)' : 'translateX(0)'
                                            }} />
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <ActionModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={confirmUpdate}
                title="Verify Identity"
                description="Please enter your current administrative password to authorize and save these profile changes."
                actionType="verify"
                loading={submitting}
            />
        </ERPLayout>
    );
};

export default AdminProfilePage;
