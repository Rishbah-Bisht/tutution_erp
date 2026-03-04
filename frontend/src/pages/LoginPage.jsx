import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authApi from '../api/authApi';
import { KeyRound, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Mail, School } from 'lucide-react';

const LoginPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ identifier: '', password: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

    const submit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await authApi.adminLogin({ identifier: form.identifier, password: form.password });
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', 'admin');
            localStorage.setItem('admin', JSON.stringify(data.admin));
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally { setLoading(false); }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)', borderRadius: '50%' }} />

            <div style={{
                width: '100%',
                maxWidth: 420,
                background: '#fff',
                borderRadius: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
                padding: '48px 40px',
                position: 'relative',
                zIndex: 1,
                border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        width: 64, height: 64,
                        background: 'linear-gradient(135deg, #1b3a7a 0%, #2563eb 100%)',
                        borderRadius: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px',
                        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)'
                    }}>
                        <School size={32} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>Admin Login</h1>
                    <p style={{ color: '#64748b', marginTop: 8, fontSize: '0.9rem', fontWeight: 500 }}>Access your institute management panel</p>
                </div>

                <form onSubmit={submit}>
                    {error && (
                        <div style={{
                            background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c',
                            padding: '12px 16px', borderRadius: '12px', marginBottom: 24,
                            fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500
                        }}>
                            <AlertCircle size={18} />{error}
                        </div>
                    )}

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                            Email / Username
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                <Mail size={18} />
                            </span>
                            <input
                                name="identifier"
                                type="text"
                                placeholder="Enter your email or name"
                                value={form.identifier}
                                onChange={handle}
                                style={{
                                    width: '100%', padding: '14px 16px 14px 48px',
                                    borderRadius: '14px', border: '1px solid #e2e8f0',
                                    background: '#f8fafc', fontSize: '1rem', outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: 28 }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                <KeyRound size={18} />
                            </span>
                            <input
                                name="password"
                                type={showPwd ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handle}
                                style={{
                                    width: '100%', padding: '14px 48px 14px 48px',
                                    borderRadius: '14px', border: '1px solid #e2e8f0',
                                    background: '#f8fafc', fontSize: '1rem', outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                required
                            />
                            <span
                                onClick={() => setShowPwd(p => !p)}
                                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }}
                            >
                                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '16px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, #1b3a7a 0%, #2563eb 100%)',
                            color: '#fff', fontSize: '1rem', fontWeight: 800, border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 10,
                            boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.25)',
                            opacity: loading ? 0.8 : 1
                        }}
                    >
                        {loading
                            ? <><Loader2 size={20} className="spin" /> Signing In…</>
                            : <>Sign In <ArrowRight size={20} /></>
                        }
                    </button>
                </form>

                <div style={{ marginTop: 28, textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
                    New institute? <Link to="/signup" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Register here</Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
