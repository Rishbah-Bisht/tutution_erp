import React from 'react';
import { Users, IndianRupee, BookOpen } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, sub, cls }) => (
    <div className="stat-card">
        <div className={`stat-icon ${cls}`}><Icon size={20} /></div>
        <div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            {sub && <div className="stat-sub">{sub}</div>}
        </div>
    </div>
);

const TeacherStats = ({ summary, fmt }) => {
    if (!summary) return null;

    return (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
            <StatCard icon={Users} label="Total Faculty" value={summary.totalFaculty} sub="registered" cls="ic-green" />
            <StatCard icon={IndianRupee} label="Monthly Payroll" value={`₹ ${fmt(summary.monthlyPayroll)}`} sub="all staff" cls="ic-green" />
            <StatCard icon={IndianRupee} label="Month Expenditure" value={`₹ ${fmt(summary.monthExpenditure)}`} sub="active staff" cls="ic-green" />
            <StatCard icon={BookOpen} label="Active Classes" value={summary.activeClasses} sub="batch assignments" cls="ic-green" />
        </div>
    );
};

export default TeacherStats;
export { StatCard };
