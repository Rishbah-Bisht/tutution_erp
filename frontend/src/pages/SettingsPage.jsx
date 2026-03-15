import React, { useState, useEffect } from 'react';
import { ShieldCheck, Save, Loader2, Bell, AlertTriangle } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import AlertMessage from '../components/common/AlertMessage';
import DatabaseUsage from '../components/settings/DatabaseUsage';
import { getAdminProfile, updateSettings, wipeDatabase } from '../api/adminApi';
import '../index.css';

const SettingsPage = () => {
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        fcmServerKey: '',
        gmailEmail: '',
        gmailAppPassword: '',
        notificationsEnabled: true,
        emailEvents: {},
        pushEvents: {}
    });

    // Wipe DB State
    const [wipeModal, setWipeModal] = useState({ isOpen: false, step: 1, password: '', otp: '', loading: false, error: null });

    useEffect(() => {
        getAdminProfile()
            .then(({ data }) => {
                setSettings({
                    fcmServerKey: data.fcmServerKey || '',
                    gmailEmail: data.gmailEmail || '',
                    gmailAppPassword: data.gmailAppPassword || '',
                    notificationsEnabled: data.notificationsEnabled !== undefined ? data.notificationsEnabled : true,
                    emailEvents: data.emailEvents || {},
                    pushEvents: data.pushEvents || {}
                });
            })
            .catch(() => setAlert({ type: 'error', text: 'Failed to load settings.' }))
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleEventToggle = (eventName) => {
        setSettings({
            ...settings,
            emailEvents: {
                ...settings.emailEvents,
                [eventName]: !settings.emailEvents[eventName]
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateSettings(settings);
            setAlert({ type: 'success', text: 'Notification settings saved successfully!' });
        } catch (error) {
            setAlert({ type: 'error', text: error.response?.data?.message || 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    const handleWipeConfirm = async (e) => {
        e.preventDefault();
        setWipeModal((m) => ({ ...m, loading: true, error: null }));
        try {
            await wipeDatabase(wipeModal.password);
            alert('Database wiped successfully! The application will now reload.');
            localStorage.clear();
            window.location.reload();
        } catch (error) {
            setWipeModal((m) => ({ ...m, loading: false, error: error.response?.data?.message || 'Wipe failed' }));
        }
    };

    const closeWipeModal = () => {
        setWipeModal({ isOpen: false, step: 1, password: '', otp: '', loading: false, error: null });
    };

    return (
        <ERPLayout title="System Settings">
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                {alert && <AlertMessage type={alert.type} message={alert.text} onClose={() => setAlert(null)} />}

                <div className="card" style={{ padding: 32, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
                        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                            <ShieldCheck size={24} color="#3b82f6" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Global Configurations</h2>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Configure notification delivery and system behaviors.</p>
                        </div>
                    </div>

                    <div style={{ padding: 20, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 32 }}>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', fontWeight: 600 }}>Email & Push Notifications</p>
                        <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                            Configure your Gmail SMTP credentials and Firebase keys below.
                            When enabled, the system will automatically dispatch alerts for critical student and fee events.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
                        <div style={{ padding: 12, background: '#fef3c7', borderRadius: 6 }}>
                            <Bell size={24} color="var(--erp-text-warning)" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Notification Setup</h2>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Manage your API keys and automated triggers.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                            <Loader2 size={24} className="spin" color="#64748b" />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                <div>
                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>Global Notifications</div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Master switch for all outbound emails and push alerts.</div>
                                </div>
                                <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: 10 }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.notificationsEnabled}
                                        onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
                                        style={{ width: 18, height: 18, accentColor: 'var(--erp-color-positive)' }}
                                    />
                                    <span style={{ fontWeight: 600, color: settings.notificationsEnabled ? 'var(--erp-text-positive)' : 'var(--erp-text-negative)' }}>
                                        {settings.notificationsEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </label>
                            </div>



                            {/* NOTIFICATION TRIGGERS */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                                    Automated Triggers
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                                    {[
                                        { key: 'studentRegistration', label: 'Student Registration' },
                                        { key: 'feeGenerated', label: 'Standard Fee Generated' },
                                        { key: 'feePayment', label: 'Standard Fee Payment' },
                                        { key: 'batchAssignment', label: 'Standard Batch Assignment' },
                                        { key: 'feeOverdue', label: 'Standard Fee Overdue' },
                                        { key: 'examResult', label: 'Standard Exam Result' },
                                        { key: 'testAnnouncement', label: 'Test Announcement' },
                                        { key: 'teacherRegistration', label: 'Faculty Registration' },
                                        { key: 'salaryPaid', label: 'Faculty Salary Paid' },
                                    ].map((event) => (
                                        <div key={event.key} style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{event.label}</div>
                                            <div style={{ display: 'flex', gap: 12 }}>
                                                <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 10px', background: settings.emailEvents?.[event.key] ? '#ecfdf5' : '#f8fafc', borderRadius: 4, border: `1px solid ${settings.emailEvents?.[event.key] ? '#10b981' : '#e2e8f0'}` }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.emailEvents?.[event.key] || false}
                                                        onChange={() => setSettings({
                                                            ...settings,
                                                            emailEvents: { ...settings.emailEvents, [event.key]: !settings.emailEvents[event.key] }
                                                        })}
                                                        style={{ accentColor: '#059669' }}
                                                    />
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: settings.emailEvents?.[event.key] ? '#059669' : '#64748b' }}>EMAIL</span>
                                                </label>
                                                <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 10px', background: settings.pushEvents?.[event.key] ? '#eff6ff' : '#f8fafc', borderRadius: 4, border: `1px solid ${settings.pushEvents?.[event.key] ? '#3b82f6' : '#e2e8f0'}` }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.pushEvents?.[event.key] || false}
                                                        onChange={() => setSettings({
                                                            ...settings,
                                                            pushEvents: { ...(settings.pushEvents || {}), [event.key]: !settings.pushEvents?.[event.key] }
                                                        })}
                                                        style={{ accentColor: '#2563eb' }}
                                                    />
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: settings.pushEvents?.[event.key] ? '#2563eb' : '#64748b' }}>PUSH</span>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                                <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
                                    {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                                    Save Notification Settings
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <DatabaseUsage setAlert={setAlert} />


            </div>

            {/* Wipe Database Modal */}
            {wipeModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="bg-red-50 p-5 border-b border-red-100 flex items-center gap-3">
                            <div className="bg-red-100 p-2 rounded-lg text-red-600">
                                <AlertTriangle size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-red-900">Confirm Database Wipe</h3>
                        </div>

                        <div className="p-6">
                            {wipeModal.error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                                    {wipeModal.error}
                                </div>
                            )}

                            <form onSubmit={handleWipeConfirm}>
                                <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-100 text-center">
                                    <p className="text-sm text-red-800 font-bold mb-1">
                                        Extreme Caution!
                                    </p>
                                    <p className="text-xs text-red-600 leading-relaxed">
                                        This will permanently delete all student and training data.
                                        This action cannot be undone. Enter your password to proceed.
                                    </p>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={wipeModal.password}
                                        onChange={(e) => setWipeModal({ ...wipeModal, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                                        placeholder="Enter your password"
                                    />
                                </div>

                                <div className="flex gap-3 justify-end mt-6">
                                    <button
                                        type="button"
                                        onClick={closeWipeModal}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={wipeModal.loading || !wipeModal.password}
                                        className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-100 transition disabled:opacity-50"
                                    >
                                        {wipeModal.loading ? <Loader2 size={18} className="animate-spin" /> : <AlertTriangle size={18} />}
                                        Wipe Everything
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </ERPLayout>
    );
};

export default SettingsPage;

