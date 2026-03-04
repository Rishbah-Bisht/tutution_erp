import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, GraduationCap, BookOpen, Sparkles,
    Wallet, Receipt, Settings, LogOut, Menu, X, Building2, Users2, UserCircle, Banknote, LineChart, Bell, Trophy
} from 'lucide-react';

const NAV_ITEMS = [
    {
        section: 'MAIN',
        items: [
            { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        ]
    },
    {
        section: 'ACADEMICS',
        items: [
            { to: '/students', icon: GraduationCap, label: 'Students' },
            { to: '/batches', icon: BookOpen, label: 'Batches' },
            { to: '/teachers', icon: Users2, label: 'Teachers' },
            { to: '/exams', icon: Trophy, label: 'Exams & Results' },
        ]
    },
    {
        section: 'FINANCE',
        items: [
            { to: '/fees', icon: Wallet, label: 'Fee Management' },
            { to: '/payroll', icon: Banknote, label: 'Teacher Payroll' },
            { to: '/expenses', icon: Receipt, label: 'Expenses' },
            { to: '/analytics', icon: LineChart, label: 'Analytics Dashboard' },
        ]
    },
    {
        section: 'ADMIN',
        items: [
            { to: '/profile', icon: UserCircle, label: 'Institute Profile' },
            { to: '/notifications', icon: Bell, label: 'Email Notifications' },
            { to: '/settings', icon: Settings, label: 'Settings' },
        ]
    }
];

const ERPLayout = ({ children, title }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [mini, setMini] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const admin = JSON.parse(localStorage.getItem('admin') || '{}');
    const role = localStorage.getItem('role');
    const logout = () => { localStorage.clear(); navigate('/login'); };

    useEffect(() => {
        // Only apply colors if it's admin or if default admin exists in storage. 
        // We will default to Admin's colors for the system if present.
        if (admin && admin.themeColors && admin.themeColors.length >= 2) {
            document.documentElement.style.setProperty('--erp-primary', admin.themeColors[0]);
            document.documentElement.style.setProperty('--erp-secondary', admin.themeColors[1]);
        }
    }, [admin]);

    return (
        <div className="erp-shell">
            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} style={{ display: 'block' }} />
            )}

            {/* ── Sidebar ─────────────────────────── */}
            <nav className={`sidebar ${mini ? 'mini' : ''} ${mobileOpen ? 'open' : ''}`}>

                {/* Brand */}
                <div className="sb-brand">
                    <div className="sb-logo">
                        {admin.instituteLogo ? (
                            <img
                                src={admin.instituteLogo}
                                alt="Logo"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0 }}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = '<div class="sb-logo-fallback"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-2"><path d="M6 22V4c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v18"/><path d="M6 18h12"/><path d="M10 8h4"/><path d="M10 12h4"/><path d="M10 16h4"/><path d="M3 22h18"/></svg></div>';
                                }}
                            />
                        ) : (
                            <Building2 size={18} color="#fff" />
                        )}
                    </div>
                    {!mini && (
                        <div style={{ overflow: 'hidden' }}>
                            <div className="sb-name">{admin.coachingName || 'Defacto ERP'}</div>
                            <div className="sb-code">Reg. No.: {admin.registrationNumber || 'N/A'}</div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <div className="sb-nav">
                    {NAV_ITEMS.map(group => (
                        <div key={group.section}>
                            {!mini && <div className="sb-section-label">{group.section}</div>}
                            {group.items.map(({ to, icon: Icon, label }) => (
                                <Link
                                    key={to} to={to}
                                    className={`sb-item ${location.pathname === to ? 'active' : ''}`}
                                    onClick={() => setMobileOpen(false)}
                                    title={mini ? label : undefined}
                                >
                                    <span className="sb-item-icon"><Icon size={18} /></span>
                                    {!mini && <span className="sb-item-label">{label}</span>}
                                </Link>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Sidebar footer */}
                <div className="sb-footer">
                    <div className="sb-item" onClick={logout} style={{ cursor: 'pointer' }} title={mini ? 'Sign out' : undefined}>
                        <span className="sb-item-icon"><LogOut size={18} /></span>
                        {!mini && <span className="sb-item-label">Sign out</span>}
                    </div>
                </div>
            </nav>

            <div className="erp-body">
                {/* ── Topbar ──────────────────────────── */}
                <header className="topbar">
                    <button
                        className="tb-hamburger"
                        onClick={() => {
                            if (window.innerWidth <= 768) setMobileOpen(o => !o);
                            else setMini(m => m);
                        }}
                    >
                        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>

                    <div className="tb-title">{title}</div>

                    <div className="tb-right">
                        <div className="tb-avatar" title={admin.adminName}>
                            {(admin.adminName?.[0] || 'A').toUpperCase()}
                        </div>
                        <button className="btn-tb-logout" onClick={logout}>Sign out</button>
                    </div>
                </header>

                {/* ── Main ────────────────────────────── */}
                <main className="erp-main">
                    <div className="page-content">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ERPLayout;
