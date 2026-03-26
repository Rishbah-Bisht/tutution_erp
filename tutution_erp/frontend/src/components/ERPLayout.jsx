import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';
import { clearClientSession } from '../utils/authSession';
import {
    Banknote,
    Bell,
    BookOpen,
    Building2,
    ChevronDown,
    ClipboardCheck,
    GraduationCap,
    Languages,
    LayoutDashboard,
    LineChart,
    LogOut,
    Mail,
    Menu,
    Receipt,
    Search,
    Settings,
    Trophy,
    UserCircle,
    Users2,
    Wallet,
    X
} from 'lucide-react';

const NAV_ITEMS = [
    {
        section: 'Main',
        items: [
            { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
        ]
    },
    {
        section: 'Academics',
        items: [
            { to: '/students', icon: GraduationCap, label: 'Students' },
            { to: '/batches', icon: BookOpen, label: 'Batches' },
            { to: '/subjects', icon: BookOpen, label: 'Subjects' },
            { to: '/teachers', icon: Users2, label: 'Teachers' },
            { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
            { to: '/exams', icon: Trophy, label: 'Exams & Results' }
        ]
    },
    {
        section: 'Finance',
        items: [
            { to: '/fees', icon: Wallet, label: 'Fee Management' },
            { to: '/payroll', icon: Banknote, label: 'Teacher Payroll' },
            { to: '/expenses', icon: Receipt, label: 'Expenses' },
            { to: '/analytics', icon: LineChart, label: 'Analytics Dashboard' }
        ]
    },
    {
        section: 'Admin',
        items: [
            { to: '/profile', icon: UserCircle, label: 'Institute Profile' },
            // { to: '/templates', icon: Mail, label: 'Email Templates' },
            { to: '/notifications', icon: Bell, label: 'Notifications' },
            { to: '/settings', icon: Settings, label: 'Settings' }
        ]
    }
];

const getGreeting = (date) => {
    const hour = date.getHours();

    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
};

const ERPLayout = ({ children, title }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [mini, setMini] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const adminRaw = localStorage.getItem('admin') || '{}';
    const admin = JSON.parse(adminRaw);
    const adminName = admin.adminName || 'John';
    const instituteName = admin.coachingName || 'Hi Tech.';
    const profileInitial = adminName.charAt(0).toUpperCase();

    const logout = async () => {
        try {
            await authApi.adminLogout();
        } catch (_error) {
            // Clear client session even if the network request fails.
        }
        clearClientSession();
        navigate('/login');
    };

    useEffect(() => {
        if (admin.themeColors && admin.themeColors.length >= 2) {
            document.documentElement.style.setProperty('--erp-primary', admin.themeColors[0]);
            document.documentElement.style.setProperty('--erp-secondary', admin.themeColors[1]);
        }
    }, [adminRaw]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setNow(new Date());
        }, 60000);

        return () => window.clearInterval(intervalId);
    }, []);

    const greeting = getGreeting(now);
    const formattedDate = now.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="erp-shell">
            {mobileOpen && (
                <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} style={{ display: 'block' }} />
            )}

            <nav className={`sidebar ${mini ? 'mini' : ''} ${mobileOpen ? 'open' : ''}`}>
                <div className="sb-brand">
                    <div className="sb-logo">
                        {admin.instituteLogo ? (
                            <img
                                src={admin.instituteLogo}
                                alt="Logo"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 5 }}
                                onError={(event) => {
                                    event.target.style.display = 'none';
                                    event.target.parentElement.innerHTML = '<div class="sb-logo-fallback"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v18"/><path d="M6 18h12"/><path d="M10 8h4"/><path d="M10 12h4"/><path d="M10 16h4"/><path d="M3 22h18"/></svg></div>';
                                }}
                            />
                        ) : (
                            <Building2 size={18} color="#fff" />
                        )}
                    </div>
                    {!mini && (
                        <div className="sb-brand-copy">
                            <div className="sb-name">De Facto </div>
                            <div className="sb-name">Institute</div>

                        </div>
                    )}
                </div>

                <div className="sb-nav">
                    {NAV_ITEMS.map((group) => (
                        <div key={group.section}>
                            {!mini && <div className="sb-section-label">{group.section}</div>}
                            {group.items.map(({ to, icon: Icon, label }) => (
                                <Link
                                    key={to}
                                    to={to}
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

                <div className="sb-footer">


                    <div className="sb-item" onClick={logout} style={{ cursor: 'pointer' }} title={mini ? 'Sign out' : undefined}>
                        <span className="sb-item-icon"><LogOut size={18} /></span>
                        {!mini && <span className="sb-item-label sing-out">Sign out</span>}
                    </div>


                </div>
            </nav>

            <div className="erp-body">
                <header className="topbar">
                    <div className="topbar-start">
                        <button
                            className="tb-hamburger"
                            onClick={() => {
                                if (window.innerWidth <= 768) {
                                    setMobileOpen((open) => !open);
                                } else {
                                    setMini((value) => !value);
                                }
                            }}
                        >
                            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>

                        <div className="topbar-route">
                            <span className="topbar-route-label">{title}</span>
                            <div className="tb-title">{greeting}, {adminName}</div>
                            <div className="topbar-route-subtitle">
                                {formattedDate} - here's what's happening today
                            </div>
                        </div>
                    </div>



                    <div className="tb-right">




                        <div className="shell-profile" title={adminName}>
                            <div className="tb-avatar">{profileInitial}</div>
                            <div className="shell-profile-copy hide-mobile">
                                <span className="shell-profile-name">{adminName}</span>
                                <span className="shell-profile-role">Admin</span>
                            </div>

                        </div>
                    </div>
                </header>

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
