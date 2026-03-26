import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Lock, CheckCircle2, AlertTriangle, RefreshCcw, ShieldCheck } from 'lucide-react';
import apiClient from '../api/apiConfig';
import { hasClientSession } from '../utils/authSession';

const StudentSetup = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const storedStudent = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('student') || '{}');
        } catch {
            return {};
        }
    }, []);

    useEffect(() => {
        if (!hasClientSession(['student'])) {
            navigate('/portal');
            return;
        }

        const needsSetup = storedStudent.needsSetup !== undefined
            ? storedStudent.needsSetup
            : ((storedStudent.portalAccess?.signupStatus || 'no') !== 'yes' || !storedStudent.profileImage);

        if (!needsSetup) {
            navigate('/student-dashboard');
        }
    }, [navigate, storedStudent]);

    useEffect(() => {
        return () => {
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setError('Image size must be less than 2MB');
            return;
        }
        setImage(file);
        setPreview(URL.createObjectURL(file));
        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!image) {
            setError('Please upload a profile picture');
            return;
        }

        if (passwords.newPassword.trim().length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append('profileImage', image);
        formData.append('newPassword', passwords.newPassword.trim());

        try {
            const res = await apiClient.post('/student/complete-setup', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const studentInfo = (() => {
                try {
                    return JSON.parse(localStorage.getItem('student') || '{}');
                } catch {
                    return {};
                }
            })();

            const updatedStudent = {
                ...studentInfo,
                profileImage: res.data.student?.profileImage || studentInfo.profileImage,
                needsSetup: false,
                portalAccess: {
                    ...(studentInfo.portalAccess || {}),
                    signupStatus: 'yes',
                    signedUpAt: studentInfo.portalAccess?.signedUpAt || new Date().toISOString(),
                    lastLoginAt: new Date().toISOString()
                }
            };

            localStorage.setItem('student', JSON.stringify(updatedStudent));
            setStep(3);
            setTimeout(() => navigate('/student-dashboard'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to complete setup');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-md shadow-2xl border border-gray-100 overflow-hidden">
                <div className="p-10 bg-gray-900 text-white text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <ShieldCheck className="text-blue-400" size={28} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Security Activation</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight">Setup Portal</h2>
                    <p className="text-gray-400 text-xs mt-2 font-medium">Verify your identity and secure your workspace.</p>
                </div>

                <div className="p-10">
                    {error && (
                        <div className="p-4 bg-rose-50 text-rose-600 rounded-md flex items-center gap-3 mb-8">
                            <AlertTriangle size={18} className="shrink-0" />
                            <span className="text-xs font-bold leading-tight">{error}</span>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-8">
                            <div className="text-center space-y-6">
                                <div className="relative inline-block">
                                    <div className="h-40 w-40 rounded-md bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group transition-all hover:border-blue-300">
                                        {preview ? (
                                            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                                        ) : (
                                            <Camera className="text-gray-300 group-hover:text-blue-500 transition-colors" size={48} />
                                        )}
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 h-12 w-12 bg-blue-600 text-white rounded-md shadow-xl flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-all active:scale-95 border-4 border-white">
                                        <Camera size={20} />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-gray-800 tracking-tight">Professional Photo</h3>
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                        Upload a clear front-facing photo. This will be used for your official ID card and cannot be changed.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => image ? setStep(2) : setError('Please upload your photo to continue')}
                                className="w-full py-5 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-gray-800 transition-all shadow-2xl shadow-gray-200 active:scale-[0.98]"
                            >
                                Secure My Account
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Set New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="password"
                                            required
                                            value={passwords.newPassword}
                                            onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
                                            className="w-full pl-14 pr-4 py-5 bg-gray-50 border border-gray-100 rounded-md focus:ring-8 focus:ring-blue-500/5 focus:bg-white focus:border-blue-200 outline-none transition-all text-sm font-bold"
                                            placeholder="Choose a strong password"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm Identity</label>
                                    <div className="relative">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="password"
                                            required
                                            value={passwords.confirmPassword}
                                            onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })}
                                            className="w-full pl-14 pr-4 py-5 bg-gray-50 border border-gray-100 rounded-md focus:ring-8 focus:ring-blue-500/5 focus:bg-white focus:border-blue-200 outline-none transition-all text-sm font-bold"
                                            placeholder="Repeat the password"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-5 bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-gray-100 transition-all"
                                >
                                    Go Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] py-5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-blue-700 transition-all shadow-2xl shadow-blue-100 disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {loading ? 'Processing...' : 'Activate Portal'}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <div className="py-16 text-center space-y-6">
                            <div className="h-24 w-24 bg-emerald-50 text-emerald-500 rounded-md flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-50">
                                <CheckCircle2 size={48} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Identity Verified</h3>
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Entry Granted</p>
                            </div>
                            <div className="flex flex-col items-center gap-3 pt-4">
                                <RefreshCcw className="animate-spin text-blue-500" size={24} />
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Redirecting to Dashboard</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentSetup;
