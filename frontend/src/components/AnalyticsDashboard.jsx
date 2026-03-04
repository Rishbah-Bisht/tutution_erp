import React, { useMemo } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    PieChart as PieChartIcon,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    ArrowRightLeft
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
    // Process data for charts and summary
    const summary = useMemo(() => {
        const earnings = data.filter(item => item.type === 'income')
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const expenses = data.filter(item => item.type === 'expense')
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        // Category distribution for pie chart
        const expenseCategories = data.filter(item => item.type === 'expense')
            .reduce((acc, curr) => {
                acc[curr.category] = (acc[curr.category] || 0) + (Number(curr.amount) || 0);
                return acc;
            }, {});

        const pieData = Object.keys(expenseCategories).map(cat => ({
            name: cat,
            value: expenseCategories[cat]
        })).sort((a, b) => b.value - a.value);

        // Bar chart data
        const barData = [
            { name: 'Financial Overview', Earnings: earnings, Expenses: expenses }
        ];

        // Monthly stats (assuming current month)
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

    const Card = ({ title, value, icon: Icon, colorClass, trend }) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10`}>
                    <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center text-xs font-bold ${trend >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {trend >= 0 ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                    ₹{value.toLocaleString('en-IN')}
                </h3>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card
                    title="Total Earnings"
                    value={summary.totalEarnings}
                    icon={TrendingUp}
                    colorClass="bg-indigo-500"
                />
                <Card
                    title="Total Expenses"
                    value={summary.totalExpenses}
                    icon={TrendingDown}
                    colorClass="bg-rose-500"
                />
                <Card
                    title="Net Balance"
                    value={summary.netBalance}
                    icon={Wallet}
                    colorClass="bg-sky-500"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bar Chart */}
                <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <BarChart3 className="text-slate-400" size={20} />
                        <h4 className="text-lg font-extrabold text-slate-800">Earnings vs Expenses</h4>
                    </div>
                    <div className="h-[300px]" style={{ minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={summary.barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Earnings" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={60} />
                                <Bar dataKey="Expenses" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <PieChartIcon className="text-slate-400" size={20} />
                        <h4 className="text-lg font-extrabold text-slate-800">Expense Distribution</h4>
                    </div>
                    <div className="h-[300px]" style={{ minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie
                                    data={summary.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {summary.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Insights Section */}
            <div className="bg-slate-900 rounded-xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TrendingUp size={120} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-500 rounded-lg">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <h4 className="text-xl font-bold">Financial Insights</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div>
                            <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider font-bold">Highest Expense</p>
                            <p className="text-xl font-black text-indigo-400">{summary.highestExpense.name}</p>
                            <p className="text-sm">₹{summary.highestExpense.value.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider font-bold">Monthly Income</p>
                            <p className="text-xl font-black text-indigo-400">₹{summary.monthlyEarnings.toLocaleString()}</p>
                            <p className="text-sm italic opacity-60">current month</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider font-bold">Monthly Expense</p>
                            <p className="text-xl font-black text-rose-400">₹{summary.monthlyExpenses.toLocaleString()}</p>
                            <p className="text-sm italic opacity-60">current month</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider font-bold">Net Savings</p>
                            <p className="text-xl font-black text-sky-400">₹{summary.netSavings.toLocaleString()}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">Healthy Margin</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper for insights section header
const Sparkles = ({ className }) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

export default AnalyticsDashboard;
