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
        <div className="login-page-wrapper">
            {/* Background Decorations - Hidden on very small screens for performance */}
            <div className="bg-decoration top-left" />
            <div className="bg-decoration bottom-right" />

            <div className="login-card">
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    
                    <h1 className="title">Admin Login</h1>
                    <p className="subtitle">Access your institute management panel</p>
                </div>

                <form onSubmit={submit}>
                    {error && (
                        <div className="error-alert">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="input-group">
                        <label className="input-label">Email / Username</label>
                        <div style={{ position: 'relative' }}>
                            <span className="input-icon">
                                <Mail size={18} />
                            </span>
                            <input
                                name="identifier"
                                type="text"
                                className="styled-input"
                                placeholder="Enter email or username"
                                value={form.identifier}
                                onChange={handle}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <span className="input-icon">
                                <KeyRound size={18} />
                            </span>
                            <input
                                name="password"
                                type={showPwd ? 'text' : 'password'}
                                className="styled-input pwd-input"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handle}
                                required
                            />
                            <span
                                onClick={() => setShowPwd(p => !p)}
                                className="toggle-pwd"
                            >
                                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="submit-btn"
                    >
                        {loading
                            ? <><Loader2 size={20} className="spin" /> Signing In…</>
                            : <>Sign In <ArrowRight size={20} /></>
                        }
                    </button>
                </form>

                <div className="footer-link">
                    New institute? <Link to="/signup" className="link">Register here</Link>
                </div>
            </div>

            <style>{`
                .login-page-wrapper {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f8fafc;
                    position: relative;
                    overflow: hidden;
                    font-family: 'Inter', sans-serif;
                    padding: 20px; /* Crucial for mobile edge spacing */
                }

                .bg-decoration {
                    position: absolute;
                    width: 40%;
                    height: 40%;
                    border-radius: 50%;
                    z-index: 0;
                }
                .top-left { 
                    top: -10%; left: -10%; 
                    background: radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%); 
                }
                .bottom-right { 
                    bottom: -10%; right: -10%; 
                    background: radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%); 
                }

                .login-card {
                    width: 100%;
                    max-width: 420px;
                    background: #fff;
                    border-radius: 24px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
                    padding: 40px;
                    position: relative;
                    z-index: 1;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    box-sizing: border-box;
                }

                .logo-container {
                    width: 60px; height: 60px;
                    background: linear-gradient(135deg, #1b3a7a 0%, #2563eb 100%);
                    border-radius: 16px;
                    display: flex; alignItems: center; justifyContent: center;
                    margin: 0 auto 16px;
                    box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);
                }

                .title { font-size: 1.75rem; fontWeight: 900; color: #0f172a; margin: 0; letter-spacing: -0.025em; }
                .subtitle { color: #64748b; margin-top: 8px; font-size: 0.875rem; font-weight: 500; }

                .error-alert {
                    background: #fef2f2; border: 1px solid #fee2e2; color: #b91c1c;
                    padding: 12px; border-radius: 12px; margin-bottom: 20px;
                    font-size: 0.85rem; display: flex; align-items: center; gap: 8px; font-weight: 500;
                }

                .input-group { margin-bottom: 18px; text-align: left; }
                .input-label { display: block; font-size: 0.85rem; font-weight: 700; color: #334155; margin-bottom: 6px; }
                
                .styled-input {
                    width: 100%; padding: 12px 16px 12px 44px;
                    border-radius: 12px; border: 1px solid #e2e8f0;
                    background: #f8fafc; font-size: 0.95rem; outline: none;
                    box-sizing: border-box; transition: all 0.2s;
                }
                .styled-input:focus { border-color: #2563eb; background: #fff; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
                .pwd-input { padding-right: 44px; }

                .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; display: flex; }
                .toggle-pwd { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; cursor: pointer; display: flex; }

                .submit-btn {
                    width: 100%; padding: 14px; border-radius: 12px;
                    background: linear-gradient(135deg, #1b3a7a 0%, #2563eb 100%);
                    color: #fff; font-size: 1rem; font-weight: 700; border: none;
                    cursor: pointer; display: flex; align-items: center;
                    justify-content: center; gap: 8px;
                    box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);
                    transition: transform 0.2s;
                }
                .submit-btn:active { transform: scale(0.98); }
                .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

                .footer-link { margin-top: 24px; text-align: center; font-size: 0.875rem; color: #64748b; }
                .link { color: #2563eb; font-weight: 700; text-decoration: none; }

                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                /* Tablet & Mobile Styles */
                @media (max-width: 480px) {
                    .login-card {
                        padding: 32px 24px;
                        border-radius: 20px;
                    }
                    .title { font-size: 1.5rem; }
                    .bg-decoration { display: none; }
                }
            `}</style>
        </div>
    );
};

export default LoginPage;