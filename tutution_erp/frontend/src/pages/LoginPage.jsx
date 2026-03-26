import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authApi from '../api/authApi';
import { setClientSession } from '../utils/authSession';
import { KeyRound, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Mail, School } from 'lucide-react';

const INITIAL_FORM = {
    identifier: '',
    password: '',
    rollNo: '',
    signupEmail: '',
    confirmPassword: ''
};

const LoginPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState(INITIAL_FORM);
    const [showPwd, setShowPwd] = useState(false);
    const [showSignupPwd, setShowSignupPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [role, setRole] = useState('student');
    const [studentMode, setStudentMode] = useState('login');

    const handle = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const setRoleMode = (nextRole) => {
        setRole(nextRole);
        setError('');
        setStudentMode('login');
        setForm(INITIAL_FORM);
    };

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            let data;

            if (role === 'teacher') {
                const response = await authApi.teacherLogin({ regNo: form.identifier, password: form.password });
                data = response.data;
                setClientSession({ role: 'teacher', teacher: data.teacher });
                navigate('/teacher-dashboard');
            } else {
                const response = studentMode === 'signup'
                    ? await authApi.studentSignup({
                        rollNo: form.rollNo,
                        email: form.signupEmail,
                        password: form.password,
                        confirmPassword: form.confirmPassword
                    })
                    : await authApi.studentLogin({ email: form.identifier, password: form.password });

                data = response.data;
                const student = data.student || {};
                const needsSetup = student.needsSetup !== undefined
                    ? student.needsSetup
                    : ((student.portalAccess?.signupStatus || 'no') !== 'yes' || !student.profileImage);
                setClientSession({ role: 'student', student: { ...student, needsSetup } });
                navigate(needsSetup ? '/student-setup' : '/student-dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderStudentSignupFields = () => (
        <>
            <div className="input-group">
                <label className="input-label">Roll Number</label>
                <div style={{ position: 'relative' }}>
                    <span className="input-icon">
                        <School size={18} />
                    </span>
                    <input
                        name="rollNo"
                        type="text"
                        className="styled-input"
                        placeholder="Enter your roll number"
                        value={form.rollNo}
                        onChange={handle}
                        required
                    />
                </div>
            </div>

            <div className="input-group">
                <label className="input-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                    <span className="input-icon">
                        <Mail size={18} />
                    </span>
                    <input
                        name="signupEmail"
                        type="email"
                        className="styled-input"
                        placeholder="Enter your email"
                        value={form.signupEmail}
                        onChange={handle}
                        required
                    />
                </div>
            </div>
        </>
    );

    const renderLoginIdentifier = () => (
        <div className="input-group">
            <label className="input-label">{role === 'student' ? 'Email Address' : 'Email / Username'}</label>
            <div style={{ position: 'relative' }}>
                <span className="input-icon">
                    <Mail size={18} />
                </span>
                <input
                    name="identifier"
                    type="text"
                    className="styled-input"
                    placeholder={role === 'student' ? 'Enter your email address' : 'Enter email or username'}
                    value={form.identifier}
                    onChange={handle}
                    required
                />
            </div>
        </div>
    );

    return (
        <div className="login-page-wrapper">
            <div className="bg-decoration top-left" />
            <div className="bg-decoration bottom-right" />

            <div className="login-card">
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div className="logo-container">
                        <School size={32} color="#fff" />
                    </div>
                    <h1 className="title">Welcome Back</h1>
                    <p className="subtitle">Access your institute workspace or activate a student account.</p>
                </div>

                <div className="role-tabs">
                    <button type="button" className={`role-tab ${role === 'student' ? 'active' : ''}`} onClick={() => setRoleMode('student')}>Student</button>
                    <button type="button" className={`role-tab ${role === 'teacher' ? 'active' : ''}`} onClick={() => setRoleMode('teacher')}>Teacher</button>
                </div>

                {role === 'student' && (
                    <div className="role-tabs student-auth-tabs">
                        <button
                            type="button"
                            className={`role-tab ${studentMode === 'login' ? 'active' : ''}`}
                            onClick={() => {
                                setStudentMode('login');
                                setError('');
                            }}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            className={`role-tab ${studentMode === 'signup' ? 'active' : ''}`}
                            onClick={() => {
                                setStudentMode('signup');
                                setError('');
                            }}
                        >
                            Sign Up
                        </button>
                    </div>
                )}

                <form onSubmit={submit}>
                    {error && (
                        <div className="error-alert">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {role === 'student' && studentMode === 'signup' ? renderStudentSignupFields() : renderLoginIdentifier()}

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <span className="input-icon">
                                <KeyRound size={18} />
                            </span>
                            <input
                                name="password"
                                type={role === 'student' && studentMode === 'signup' ? (showSignupPwd ? 'text' : 'password') : (showPwd ? 'text' : 'password')}
                                className="styled-input pwd-input"
                                placeholder="********"
                                value={form.password}
                                onChange={handle}
                                required
                            />
                            <span
                                onClick={() => {
                                    if (role === 'student' && studentMode === 'signup') {
                                        setShowSignupPwd((value) => !value);
                                    } else {
                                        setShowPwd((value) => !value);
                                    }
                                }}
                                className="toggle-pwd"
                            >
                                {role === 'student' && studentMode === 'signup'
                                    ? (showSignupPwd ? <EyeOff size={18} /> : <Eye size={18} />)
                                    : (showPwd ? <EyeOff size={18} /> : <Eye size={18} />)}
                            </span>
                        </div>
                    </div>

                    {role === 'student' && studentMode === 'signup' && (
                        <div className="input-group">
                            <label className="input-label">Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <span className="input-icon">
                                    <KeyRound size={18} />
                                </span>
                                <input
                                    name="confirmPassword"
                                    type={showConfirmPwd ? 'text' : 'password'}
                                    className="styled-input pwd-input"
                                    placeholder="********"
                                    value={form.confirmPassword}
                                    onChange={handle}
                                    required
                                />
                                <span onClick={() => setShowConfirmPwd((value) => !value)} className="toggle-pwd">
                                    {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                </span>
                            </div>
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="submit-btn">
                        {loading ? (
                            <>
                                <Loader2 size={20} className="spin" />
                                {role === 'student' && studentMode === 'signup' ? 'Creating Account...' : 'Signing In...'}
                            </>
                        ) : (
                            <>
                                {role === 'student' && studentMode === 'signup' ? 'Create Student Account' : 'Sign In'}
                                <ArrowRight size={20} />
                            </>
                        )}
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
                    padding: 20px;
                }

                .bg-decoration {
                    position: absolute;
                    width: 40%;
                    height: 40%;
                    border-radius: 50%;
                    z-index: 0;
                }

                .top-left {
                    top: -10%;
                    left: -10%;
                    background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%);
                }

                .bottom-right {
                    bottom: -10%;
                    right: -10%;
                    background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%);
                }

                .login-card {
                    width: 100%;
                    max-width: 420px;
                    background: #fff;
                    border-radius: 0.375rem;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
                    padding: 40px;
                    position: relative;
                    z-index: 1;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    box-sizing: border-box;
                }

                .logo-container {
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, #1b3a7a 0%, #2563eb 100%);
                    border-radius: 0.375rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 16px;
                    box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);
                }

                .title {
                    font-size: 1.75rem;
                    font-weight: 900;
                    color: #0f172a;
                    margin: 0;
                    letter-spacing: -0.025em;
                }

                .subtitle {
                    color: #64748b;
                    margin-top: 8px;
                    font-size: 0.875rem;
                    font-weight: 500;
                }

                .role-tabs {
                    display: flex;
                    background: #f1f5f9;
                    padding: 4px;
                    border-radius: 0.375rem;
                    margin-bottom: 16px;
                }

                .student-auth-tabs {
                    margin-top: -4px;
                    margin-bottom: 24px;
                }

                .role-tab {
                    flex: 1;
                    padding: 10px;
                    border: none;
                    background: transparent;
                    color: #64748b;
                    font-weight: 700;
                    font-size: 0.85rem;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .role-tab.active {
                    background: #fff;
                    color: #2563eb;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .error-alert {
                    background: #fef2f2;
                    border: 1px solid #fee2e2;
                    color: #b91c1c;
                    padding: 12px;
                    border-radius: 0.375rem;
                    margin-bottom: 20px;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 500;
                }

                .input-group {
                    margin-bottom: 18px;
                    text-align: left;
                }

                .input-label {
                    display: block;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #334155;
                    margin-bottom: 6px;
                }

                .styled-input {
                    width: 100%;
                    padding: 12px 16px 12px 44px;
                    border-radius: 0.375rem;
                    border: 1px solid #e2e8f0;
                    background: #f8fafc;
                    font-size: 0.95rem;
                    outline: none;
                    box-sizing: border-box;
                    transition: all 0.2s;
                }

                .styled-input:focus {
                    border-color: #2563eb;
                    background: #fff;
                    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
                }

                .pwd-input {
                    padding-right: 44px;
                }

                .input-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                    display: flex;
                }

                .toggle-pwd {
                    position: absolute;
                    right: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                    cursor: pointer;
                    display: flex;
                }

                .submit-btn {
                    width: 100%;
                    padding: 14px;
                    border-radius: 0.375rem;
                    background: linear-gradient(135deg, #1b3a7a 0%, #2563eb 100%);
                    color: #fff;
                    font-size: 1rem;
                    font-weight: 700;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);
                    transition: transform 0.2s;
                }

                .submit-btn:active {
                    transform: scale(0.98);
                }

                .submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .footer-link {
                    margin-top: 24px;
                    text-align: center;
                    font-size: 0.875rem;
                    color: #64748b;
                }

                .link {
                    color: #2563eb;
                    font-weight: 700;
                    text-decoration: none;
                }

                .spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 480px) {
                    .login-card {
                        padding: 32px 24px;
                        border-radius: 0.375rem;
                    }

                    .title {
                        font-size: 1.5rem;
                    }

                    .bg-decoration {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default LoginPage;
