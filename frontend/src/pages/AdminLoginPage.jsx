import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';
import { KeyRound, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ShieldCheck, Mail, Lock } from 'lucide-react';

const INITIAL_FORM = {
    identifier: '',
    password: ''
};

const AdminLoginPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState(INITIAL_FORM);
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handle = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authApi.adminLogin({ identifier: form.identifier, password: form.password });
            const data = response.data;
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', 'admin');
            localStorage.setItem('admin', JSON.stringify(data.admin));
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        // Animated Shifting Gradient Background
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 font-sans" style={{ backgroundSize: '400% 400%', animation: 'gradientBG 15s ease infinite' }}>
            
            {/* --- INLINE CSS FOR HIGHLY VISIBLE ANIMATIONS --- */}
            <style>
                {`
                    @keyframes gradientBG {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                    @keyframes float-spin {
                        0% { transform: translateY(100vh) rotate(0deg) scale(0.8); opacity: 0; }
                        10% { opacity: 0.5; }
                        90% { opacity: 0.5; }
                        100% { transform: translateY(-20vh) rotate(360deg) scale(1.2); opacity: 0; }
                    }
                    @keyframes ripple {
                        0% { transform: scale(0.8); opacity: 0.8; }
                        100% { transform: scale(2.5); opacity: 0; }
                    }
                    @keyframes bounce-subtle {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-10px); }
                    }

                    /* Glass Shape Utilities */
                    .glass-shape {
                        position: absolute;
                        background: rgba(255, 255, 255, 0.4);
                        backdrop-filter: blur(8px);
                        border: 1px solid rgba(255, 255, 255, 0.8);
                        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
                        z-index: 0;
                        animation: float-spin linear infinite;
                    }
                `}
            </style>

            {/* --- VISIBLE ANIMATED BACKGROUND ELEMENTS --- */}

            {/* Pulsing Ripple Rings (Center) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-indigo-200 pointer-events-none" style={{ animation: 'ripple 4s cubic-bezier(0.1, 0.5, 0.8, 1) infinite' }}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-purple-200 pointer-events-none" style={{ animation: 'ripple 4s cubic-bezier(0.1, 0.5, 0.8, 1) infinite 1.5s' }}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-blue-200 pointer-events-none" style={{ animation: 'ripple 4s cubic-bezier(0.1, 0.5, 0.8, 1) infinite 3s' }}></div>

            {/* Floating Glass Squares & Circles */}
            <div className="glass-shape rounded-2xl w-24 h-24 left-[10%]" style={{ animationDuration: '12s', animationDelay: '0s' }}></div>
            <div className="glass-shape rounded-full w-16 h-16 left-[25%]" style={{ animationDuration: '15s', animationDelay: '2s' }}></div>
            <div className="glass-shape rounded-3xl w-32 h-32 left-[70%]" style={{ animationDuration: '18s', animationDelay: '1s' }}></div>
            <div className="glass-shape rounded-full w-20 h-20 left-[85%]" style={{ animationDuration: '14s', animationDelay: '4s' }}></div>
            <div className="glass-shape rounded-xl w-12 h-12 left-[50%]" style={{ animationDuration: '10s', animationDelay: '6s' }}></div>

            {/* ------------------------------------------- */}


            {/* --- MAIN LOGIN CARD --- */}
            {/* Added subtle bounce animation to the main card container */}
            <div className="relative z-10 w-full max-w-[420px]" style={{ animation: 'bounce-subtle 6s ease-in-out infinite' }}>
                
                <div className="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-[0_20px_60px_-15px_rgba(79,70,229,0.2)] p-8 sm:p-10 border border-white">
                    
                    {/* Header Elements */}
                    <div className="text-center mb-8 relative">
                        
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Institution ERP Institute</h1>
                    
                        <p className="text-slate-500 font-medium text-sm">Strictly for authorized administrators.</p>
                    </div>

                    {/* Form Elements */}
                    <form onSubmit={submit}>
                        
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                                <AlertCircle size={18} className="shrink-0" />
                                <span className="text-sm font-semibold">{error}</span>
                            </div>
                        )}

                        {/* Username/Email */}
                        <div className="space-y-1.5 mb-5">
                            <label className="text-sm font-bold text-slate-700 ml-1">Admin Identity</label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <Mail size={18} />
                                </span>
                                <input
                                    name="identifier"
                                    type="text"
                                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none shadow-sm"
                                    placeholder="Username or email address"
                                    value={form.identifier}
                                    onChange={handle}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5 mb-8">
                            <label className="text-sm font-bold text-slate-700 ml-1">Security Key</label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <KeyRound size={18} />
                                </span>
                                <input
                                    name="password"
                                    type={showPwd ? 'text' : 'password'}
                                    className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none shadow-sm"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={handle}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd((value) => !value)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#0f172a] transition-colors"
                                >
                                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 hover:-translate-y-1 transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group overflow-hidden relative"
                        >
                            {/* Fast Shimmer effect inside button */}
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1s_infinite]"></div>
                            
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin relative z-10" />
                                    <span className="relative z-10">Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    <span className="relative z-10 tracking-wide">Authorize Access</span>
                                    <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1.5 transition-transform duration-300" />
                                </>
                            )}
                        </button>
                        <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
                    </form>

                    {/* Footer note */}
                    <div className="mt-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                        <Lock size={12} className="text-emerald-500" /> Secure 256-bit Connection
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;