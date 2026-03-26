import React, { useState, useEffect, useRef } from 'react';
import ERPLayout from '../components/ERPLayout';
import { getAdminProfile, updateAdminProfile } from '../api/adminApi';
import {
    User, School, Mail, Phone, FileDigit, Home, Palette, BookOpen,
    Loader2, ShieldCheck, Pencil, X, Save, Camera, BadgeCheck, MapPin
} from 'lucide-react';
import ActionModal from '../components/common/ActionModal';
import AlertMessage from '../components/common/AlertMessage';

const AdminProfilePage = () => {

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [alert, setAlert] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const fileInputRef = useRef(null);

    const [profile, setProfile] = useState(null);

    const [form, setForm] = useState({
        adminName: '',
        coachingName: '',
        email: '',
        phone: '',
        bio: '',
        registrationNumber: '',
        roomsAvailable: '',
        themeColor1: '#1b3a7a',
        themeColor2: '#c53030',
        classesOffered: '',
        instituteAddress: '',
        instituteEmail: '',
        institutePhone: ''
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
                institutePhone: data.institutePhone || ''
            });

            setLogoPreview(data.instituteLogo || '');

        } catch {
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
        setEditMode(false);
        fetchProfile();
    };

    const handleSaveRequest = (e) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    const confirmUpdate = async (password) => {

        setShowConfirm(false);
        setSubmitting(true);

        try {

            const formData = new FormData();

            Object.keys(form).forEach(key => {
                if (key !== 'themeColor1' && key !== 'themeColor2') {
                    formData.append(key, form[key]);
                }
            });

            formData.append('adminPassword', password);
            formData.append('themeColors', JSON.stringify([form.themeColor1, form.themeColor2]));

            if (logoFile) formData.append('instituteLogo', logoFile);

            const { data } = await updateAdminProfile(formData);

            setProfile(data.admin);
            setEditMode(false);

            setAlert({
                type: 'success',
                text: 'Profile updated successfully!'
            });

        } catch (err) {

            setAlert({
                type: 'error',
                text: err.response?.data?.message || 'Update failed.'
            });

        } finally {
            setSubmitting(false);
        }
    };

    if (loading)
        return (
            <ERPLayout title="Admin Profile">
                <div className="flex flex-col justify-center items-center h-64 gap-3">
                    <Loader2 size={32} className="animate-spin text-blue-600" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading profile...</p>
                </div>
            </ERPLayout>
        );

    return (
        <ERPLayout title="Admin Profile">
            <style>{`
                .admin-profile-hdr { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); position: relative; overflow: hidden; }
                .admin-profile-hdr::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%); }
                .profile-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .profile-card:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -8px rgba(0,0,0,0.1); }
                .info-label { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
                .info-value { font-size: 0.95rem; font-weight: 800; color: #1e293b; }
                .premium-btn { transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 12px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; cursor: pointer; border: none; }
                .premium-btn-primary { background: #3b82f6; color: white; box-shadow: 0 4px 14px 0 rgba(59,130,246,0.3); }
                .premium-btn-primary:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59,130,246,0.4); }
                .premium-btn-secondary { background: #f1f5f9; color: #475569; }
                .premium-btn-secondary:hover { background: #e2e8f0; }
                .premium-btn-success { background: #10b981; color: white; box-shadow: 0 4px 14px 0 rgba(16,185,129,0.3); }
                .premium-btn-success:hover { background: #059669; }
                .glass-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.3); }
            `}</style>

            <div className="max-w-6xl mx-auto px-6 py-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                {alert && (
                    <div className="mb-8">
                        <AlertMessage type={alert.type} message={alert.text} onClose={() => setAlert(null)} />
                    </div>
                )}

                <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                    {/* MODERNISED HEADER */}
                    <div className="admin-profile-hdr px-10 py-16 text-white relative">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                            <div className="text-center md:text-left">
                                <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] font-black uppercase tracking-widest mb-4">
                                    System Administrator
                                </span>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
                                    {editMode ? "Refine Profile" : "Institute Portfolio"}
                                </h1>
                                <p className="text-slate-400 font-medium max-w-lg">Manage your institution's global identity, contact information, and branding assets.</p>
                            </div>

                            <div className="flex gap-4">
                                {!editMode ? (
                                    <button onClick={() => setEditMode(true)} className="premium-btn premium-btn-primary">
                                        <Pencil size={18} />
                                        Update Details
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={handleCancel} className="premium-btn premium-btn-secondary">
                                            <X size={18} />
                                            Discard
                                        </button>
                                        <button form="profile-form" type="submit" className="premium-btn premium-btn-success">
                                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                            {submitting ? 'Updating...' : 'Save Changes'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* OVERLAPPING AVATAR SECTION */}
                    <div className="px-10 -mt-12 relative z-20 flex flex-col md:flex-row items-center md:items-end gap-6 mb-12">
                        <div className="relative">
                            <div className="w-40 h-40 bg-white rounded-[2rem] border-[6px] border-white shadow-2xl flex items-center justify-center overflow-hidden bg-slate-50">
                                {logoPreview ? (
                                    <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                                ) : (
                                    <School size={64} className="text-slate-300" />
                                )}
                            </div>
                            {editMode && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-2 -right-2 bg-blue-600 p-3 text-white rounded-2xl shadow-xl hover:bg-blue-700 transition-colors transform hover:scale-110 active:scale-95"
                                >
                                    <Camera size={20} />
                                </button>
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleLogoChange} />
                        </div>

                        <div className="text-center md:text-left pb-4">
                            <h2 className="text-3xl font-black text-slate-900 flex items-center justify-center md:justify-start gap-3">
                                {profile?.adminName}
                                <BadgeCheck size={28} className="text-blue-500 fill-current" />
                            </h2>
                            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mt-1">
                                {profile?.coachingName}
                            </p>
                            <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-slate-500">
                                <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 px-3 py-1 rounded-full">
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                    ID: {profile?._id?.slice(-8).toUpperCase()}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">
                                    v1.2.0 Stable
                                </div>
                            </div>
                            <div className="flex items-center justify-center md:justify-start gap-3 mt-4">
                                {(profile?.themeColors?.length ? profile.themeColors : [form.themeColor1, form.themeColor2]).slice(0, 2).map((color, index) => (
                                    <div key={`${color}-${index}`} className="flex items-center gap-2 bg-white/90 px-3 py-2 rounded-full shadow-sm border border-slate-200">
                                        <span className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: color }} />
                                        <span className="text-[11px] font-bold tracking-wide text-slate-700 uppercase">{index === 0 ? 'Primary' : 'Secondary'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CONTENT AREA */}
                    <div className="px-10 pb-16">
                        {!editMode ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="space-y-8">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Administrative Info</h4>
                                    <div className="space-y-6">
                                        <InfoBlock icon={<User />} label="Administrator" value={profile?.adminName} />
                                        <InfoBlock icon={<Mail />} label="Admin Email" value={profile?.email} />
                                        <InfoBlock icon={<Phone />} label="Admin Contact" value={profile?.phone} />
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Institutional Details</h4>
                                    <div className="space-y-6">
                                        <InfoBlock icon={<School />} label="Institute Name" value={profile?.coachingName} />
                                        <InfoBlock icon={<Mail />} label="Institute Email" value={profile?.instituteEmail} />
                                        <InfoBlock icon={<Phone />} label="Institute Phone" value={profile?.institutePhone} />
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Operational Data</h4>
                                    <div className="space-y-6">
                                        <InfoBlock icon={<FileDigit />} label="Reg. Number" value={profile?.registrationNumber} />
                                        <InfoBlock icon={<Home />} label="Rooms Available" value={profile?.roomsAvailable} />
                                        <InfoBlock icon={<MapPin />} label="Address" value={profile?.instituteAddress} />
                                        <ThemePalettePreview colors={profile?.themeColors} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form id="profile-form" onSubmit={handleSaveRequest} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 bg-slate-50/50 p-10 rounded-[2rem] border border-slate-100">
                                <div className="space-y-6">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Profile Settings</h4>
                                    <FormInput label="Admin Name" name="adminName" value={form.adminName} onChange={handle} placeholder="Full Name" />
                                    <FormInput label="Institute Name" name="coachingName" value={form.coachingName} onChange={handle} placeholder="Coaching Name" />
                                    <FormInput label="Admin Email" name="email" value={form.email} onChange={handle} placeholder="email@admin.com" />
                                    <FormInput label="Admin Phone" name="phone" value={form.phone} onChange={handle} placeholder="+91 00000 00000" />
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Institute Configuration</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormInput label="Reg. No" name="registrationNumber" value={form.registrationNumber} onChange={handle} />
                                        <FormInput label="Rooms" name="roomsAvailable" value={form.roomsAvailable} onChange={handle} type="number" />
                                    </div>
                                    <FormInput label="Institute Email" name="instituteEmail" value={form.instituteEmail} onChange={handle} />
                                    <FormInput label="Institute Phone" name="institutePhone" value={form.institutePhone} onChange={handle} />
                                    <div className="space-y-3 pt-1">
                                        <label className="info-label"><Palette size={14} /> Brand Colors</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <ColorSwatchInput
                                                label="Primary"
                                                name="themeColor1"
                                                value={form.themeColor1}
                                                onChange={handle}
                                            />
                                            <ColorSwatchInput
                                                label="Secondary"
                                                name="themeColor2"
                                                value={form.themeColor2}
                                                onChange={handle}
                                            />
                                        </div>
                                        <p className="text-xs font-medium text-slate-500">
                                            These colors are reused across the dashboard theme and the shared notification email template.
                                        </p>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="info-label"><MapPin size={14} /> Full Address</label>
                                    <textarea
                                        name="instituteAddress"
                                        value={form.instituteAddress}
                                        onChange={handle}
                                        rows={4}
                                        className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-800 focus:border-blue-500 outline-none transition-all shadow-inner"
                                        placeholder="Complete street address..."
                                    />
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            <ActionModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={confirmUpdate}
                title="Secure Verification"
                description="This action will globally update your institute's public identity. Please provide your admin credentials to authorize this change."
                actionType="verify"
                loading={submitting}
            />
        </ERPLayout>
    );
};

// MODERNISED SUB-COMPONENTS
const InfoBlock = ({ icon, label, value }) => (
    <div className="profile-card group">
        <div className="info-label">
            {React.cloneElement(icon, { size: 14, className: "group-hover:text-blue-500 transition-colors" })}
            {label}
        </div>
        <p className="info-value truncate" title={value}>{value || "Not Set"}</p>
    </div>
);

const ThemePalettePreview = ({ colors = [] }) => {
    const swatches = Array.isArray(colors) && colors.length >= 2 ? colors.slice(0, 2) : ['#1b3a7a', '#c53030'];

    return (
        <div className="profile-card group">
            <div className="info-label">
                <Palette size={14} className="group-hover:text-blue-500 transition-colors" />
                Theme Palette
            </div>
            <div className="flex items-center gap-3">
                {swatches.map((color, index) => (
                    <div key={`${color}-${index}`} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="w-5 h-5 rounded-full border border-slate-300" style={{ backgroundColor: color }} />
                        <span className="text-xs font-black tracking-wide text-slate-700 uppercase">{index === 0 ? 'Primary' : 'Secondary'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ColorSwatchInput = ({ label, name, value, onChange }) => {
    const safeColorValue = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : '#1b3a7a';

    return (
        <div className="bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
            <label className="info-label mb-3">{label}</label>
            <div className="flex items-center gap-3">
                <input
                    type="color"
                    name={name}
                    value={safeColorValue}
                    onChange={onChange}
                    className="h-12 w-14 cursor-pointer rounded-xl border-0 bg-transparent p-0"
                />
                <input
                    type="text"
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:border-blue-500 outline-none transition-all"
                />
            </div>
        </div>
    );
};

const FormInput = ({ label, type = "text", ...props }) => (
    <div className="space-y-2">
        <label className="info-label">{label}</label>
        <input
            {...props}
            type={type}
            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-800 focus:border-blue-500 outline-none transition-all shadow-sm"
        />
    </div>
);

export default AdminProfilePage;
