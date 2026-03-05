import React, { useMemo } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    PieChart as PieChartIcon,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const AnalyticsDashboard = ({ data }) => {
    const summary = useMemo(() => {
        const earnings = data.filter(item => item.type === 'income')
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const expenses = data.filter(item => item.type === 'expense')
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        const expenseCategories = data.filter(item => item.type === 'expense')
            .reduce((acc, curr) => {
                acc[curr.category] = (acc[curr.category] || 0) + (Number(curr.amount) || 0);
                return acc;
            }, {});

        const pieData = Object.keys(expenseCategories).map(cat => ({
            name: cat,
            value: expenseCategories[cat]
        })).sort((a, b) => b.value - a.value);

        const barData = [
            { name: 'Financial Overview', Earnings: earnings, Expenses: expenses }
        ];

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyEarnings = data.filter(item => {
            const d = new Date(item.date);
            return item.type === 'income' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        const monthlyExpenses = data.filter(item => {
            const d = new Date(item.date);
            return item.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        const highestExpense = pieData.length > 0 ? pieData[0] : { name: 'N/A', value: 0 };

        return {
            totalEarnings: earnings,
            totalExpenses: expenses,
            netBalance: earnings - expenses,
            pieData,
            barData,
            monthlyEarnings,
            monthlyExpenses,
            highestExpense,
            netSavings: monthlyEarnings - monthlyExpenses
        };
    }, [data]);

    const Card = ({ title, value, icon: Icon, colorClass, textColor, trend }) => (
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10`}>
                    <Icon className={`w-6 h-6 ${textColor}`} />
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center text-xs font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {trend >= 0 ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-slate-500 text-xs md:text-sm font-medium mb-1 uppercase tracking-wider">{title}</p>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                    ₹{value.toLocaleString('en-IN')}
                </h3>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Responsive Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <Card
                    title="Total Earnings"
                    value={summary.totalEarnings}
                    icon={TrendingUp}
                    colorClass="bg-indigo-500"
                    textColor="text-indigo-600"
                />
                <Card
                    title="Total Expenses"
                    value={summary.totalExpenses}
                    icon={TrendingDown}
                    colorClass="bg-rose-500"
                    textColor="text-rose-600"
                />
                {/* Profile/Balance represented in Green */}
                <Card
                    title="Net Balance (Profile)"
                    value={summary.netBalance}
                    icon={Wallet}
                    colorClass="bg-emerald-500" 
                    textColor="text-emerald-600"
                />
            </div>

            {/* Charts Section - Stacks on Tablet/Mobile */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                {/* Bar Chart Container */}
                <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <BarChart3 className="text-slate-400" size={20} />
                        <h4 className="text-md md:text-lg font-black text-slate-800 uppercase tracking-tight">Overview</h4>
                    </div>
                    <div className="h-[250px] md:h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={summary.barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend iconType="circle" verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: '700' }} />
                                <Bar name="Earnings" dataKey="Earnings" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                                <Bar name="Expenses" dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart Container */}
                <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <PieChartIcon className="text-slate-400" size={20} />
                        <h4 className="text-md md:text-lg font-black text-slate-800 uppercase tracking-tight">Distribution</h4>
                    </div>
                    <div className="h-[300px] md:h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={summary.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="55%"
                                    outerRadius="80%"
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {summary.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Insights Banner - Fully Responsive */}
            <div className="bg-slate-900 rounded-2xl p-6 md:p-10 text-white relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Wallet size={200} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-lg md:text-xl font-black uppercase tracking-widest">Financial Insights</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                        <InsightItem label="Highest Expense" value={summary.highestExpense.name} subValue={`₹${summary.highestExpense.value.toLocaleString()}`} color="text-indigo-400" />
                        <InsightItem label="Monthly Income" value={`₹${summary.monthlyEarnings.toLocaleString()}`} subValue="Current Month" color="text-emerald-400" />
                        <InsightItem label="Monthly Expense" value={`₹${summary.monthlyExpenses.toLocaleString()}`} subValue="Current Month" color="text-rose-400" />
                        <InsightItem label="Net Savings" value={`₹${summary.netSavings.toLocaleString()}`} subValue="Available Balance" color="text-sky-400" badge="Healthy" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-components for cleaner code
const InsightItem = ({ label, value, subValue, color, badge }) => (
    <div className="border-l-2 border-slate-800 pl-4 hover:border-emerald-500 transition-colors">
        <p className="text-slate-400 text-[10px] mb-1 uppercase tracking-widest font-bold">{label}</p>
        <p className={`text-xl font-black ${color}`}>{value}</p>
        <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-slate-500 italic">{subValue}</p>
            {badge && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase">{badge}</span>}
        </div>
    </div>
);

const Sparkles = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

export default AnalyticsDashboard;