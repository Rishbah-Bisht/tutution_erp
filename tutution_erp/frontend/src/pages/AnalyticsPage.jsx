import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ERPLayout from '../components/ERPLayout';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { Loader2, AlertCircle, RefreshCcw } from 'lucide-react';

import apiClient from '../api/apiConfig';

const AnalyticsPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch both earnings (fees) and expenses
            // Using large limits to get a broader view for analytics
            const [feesRes, expensesRes] = await Promise.all([
                apiClient.get('/fees', { params: { limit: 1000 } }),
                apiClient.get('/expenses', { params: { limit: 1000 } })
            ]);

            const feesData = (feesRes.data?.fees || []).map(f => ({
                id: f._id,
                date: f.createdAt, // Fallback to creation date if payment history not used
                category: 'Tuition Fees',
                type: 'income',
                amount: f.amountPaid || 0
            }));

            // More granular income from payment history if available
            const granularIncome = (feesRes.data?.fees || []).flatMap(f =>
                (f.paymentHistory || []).map(p => ({
                    id: p.paymentId || p._id,
                    date: p.date,
                    category: 'Tuition Fees',
                    type: 'income',
                    amount: p.paidAmount
                }))
            );

            const expensesData = (expensesRes.data?.expenses || []).map(e => ({
                id: e._id,
                date: e.date,
                category: e.category || 'General Expense',
                type: 'expense',
                amount: e.amount
            }));

            // Priority to granular income if exists
            const finalData = [...(granularIncome.length > 0 ? granularIncome : feesData), ...expensesData];
            setData(finalData);
        } catch (err) {
            console.error('Analytics Fetch Error:', err);
            setError('Failed to aggregate financial data. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <ERPLayout title="Financial Analytics">
            <style>{`
                @media (max-width: 640px) {
                    .ana-hdr { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
                    .ana-hdr button { width: 100% !important; justify-content: center !important; }
                }
            `}</style>
            <div className="page-hdr ana-hdr">
                <div>
                    <h1>Business Intelligence</h1>
                    <p>Real-time insights across tuition earnings and operational expenses.</p>
                </div>
                <button
                    className="btn btn-secondary flex gap-2 items-center"
                    onClick={fetchData}
                    disabled={loading}
                >
                    <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh Stats
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                    <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
                    <p className="text-slate-500 font-medium tracking-tight">Compiling financial datasets...</p>
                </div>
            ) : error ? (
                <div className="bg-rose-50 border border-rose-100 p-8 rounded-xl text-center">
                    <AlertCircle className="text-rose-500 mx-auto mb-4" size={48} />
                    <h3 className="text-lg font-bold text-rose-800 mb-2">Analysis Interrupted</h3>
                    <p className="text-rose-600 mb-6">{error}</p>
                    <button onClick={fetchData} className="btn btn-primary">Try Again</button>
                </div>
            ) : (
                <AnalyticsDashboard data={data} />
            )}
        </ERPLayout>
    );
};

export default AnalyticsPage;
