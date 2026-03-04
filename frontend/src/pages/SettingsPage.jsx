import React, { useState, useEffect } from 'react';
import ERPLayout from '../components/ERPLayout';
import { getAdminProfile, updateAdminSettings } from '../api/adminApi';
import { Mail, Loader2, Save, ShieldCheck } from 'lucide-react';
import AlertMessage from '../components/common/AlertMessage';
import '../index.css';

const SettingsPage = () => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState(null);

    // Form data
    const [form, setForm] = useState({
        emailNotificationsEnabled: true
    });

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const { data } = await getAdminProfile();
            setForm({
                emailNotificationsEnabled: data.emailNotificationsEnabled !== false
            });
        } catch (err) {
            setAlert({ type: 'error', text: 'Failed to load settings.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setAlert(null);

        try {
            const payload = {
                emailNotificationsEnabled: form.emailNotificationsEnabled
            };

            const { data } = await updateAdminSettings(payload);

            // Sync local storage
            const oldAdmin = JSON.parse(localStorage.getItem('admin') || '{}');
            const updatedAdminData = { ...oldAdmin, emailNotificationsEnabled: form.emailNotificationsEnabled };
            localStorage.setItem('admin', JSON.stringify(updatedAdminData));

            setAlert({ type: 'success', text: 'Settings updated successfully!' });
        } catch (err) {
            setAlert({ type: 'error', text: err.response?.data?.message || 'Failed to update settings.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <ERPLayout title="System Settings">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <Loader2 className="spin" size={32} color="#94a3b8" />
                </div>
            </ERPLayout>
        );
    }

    return (
        <ERPLayout title="System Settings">
            <div style={{ maxWidth: 800, margin: '0 auto' }}>

                {alert && <AlertMessage type={alert.type} message={alert.text} onClose={() => setAlert(null)} />}

                <div className="card" style={{ padding: 32, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
                        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 12 }}>
                            <ShieldCheck size={24} color="#3b82f6" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Global Configurations</h2>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Manage system-wide behaviors and automation.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 32 }}>
                            <div className="lf" style={{ padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <label style={{ margin: 0, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Mail size={16} color="#64748b" /> Automated Email Notifications
                                    </label>
                                    <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#64748b', maxWidth: 400 }}>
                                        When enabled, the system will automatically send emails for fee generation, fee reminders, student registration, and batch assignments.
                                    </p>
                                </div>
                                <label style={{ position: 'relative', display: 'inline-block', width: 52, height: 28 }}>
                                    <input
                                        type="checkbox"
                                        checked={form.emailNotificationsEnabled}
                                        onChange={(e) => setForm({ ...form, emailNotificationsEnabled: e.target.checked })}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundColor: form.emailNotificationsEnabled ? '#10b981' : '#cbd5e1',
                                        transition: '.4s', borderRadius: 34
                                    }}>
                                        <span style={{
                                            position: 'absolute', content: '""', height: 20, width: 20, left: 4, bottom: 4,
                                            backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                                            transform: form.emailNotificationsEnabled ? 'translateX(24px)' : 'translateX(0)'
                                        }} />
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                            <button type="submit" className="btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 8 }}>
                                {submitting ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                                {submitting ? 'SAVING...' : 'SAVE SETTINGS'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </ERPLayout>
    );
};

export default SettingsPage;
