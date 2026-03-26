import React from 'react';
import { IndianRupee, TrendingUp, PieChart, Activity, Clock } from 'lucide-react';

const ExpenseStats = ({ metrics, fmt }) => {
    if (!metrics) return null;

    const cards = [
        {
            title: "Total Expenses (All Time)",
            value: `₹ ${fmt(metrics.totalOverall || 0)}`,
            icon: Activity,
            color: "var(--erp-primary)",
            bg: "rgba(79, 70, 229, 0.1)"
        },
        {
            title: "Expenses This Month",
            value: `₹ ${fmt(metrics.thisMonthTotal || 0)}`,
            icon: TrendingUp,
            color: "var(--erp-error)",
            bg: "rgba(239, 68, 68, 0.1)"
        },
        {
            title: "To Be Paid (Pending)",
            value: `₹ ${fmt(metrics.pendingTotal || 0)}`,
            icon: Clock,
            color: "var(--erp-warning)",
            bg: "rgba(245, 158, 11, 0.1)"
        }
    ];

    // Get Top Category
    let topCategory = { category: 'N/A', amount: 0 };
    if (metrics.categoryBreakdown && metrics.categoryBreakdown.length > 0) {
        topCategory = metrics.categoryBreakdown[0];
    }

    cards.push({
        title: `Top Category (${topCategory.category})`,
        value: `₹ ${fmt(topCategory.amount)}`,
        icon: PieChart,
        color: "var(--erp-primary)",
        bg: "rgba(79, 70, 229, 0.1)"
    });

    return (
        <div className="stats-grid mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((c, i) => (
                <div key={i} className="stat-card bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-5 transition-transform hover:-translate-y-1">
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: c.bg, color: c.color }}>
                        <c.icon size={26} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div className="text-slate-500 text-sm font-semibold mb-1">{c.title}</div>
                        <div className="text-2xl font-bold text-slate-800">{c.value}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ExpenseStats;
