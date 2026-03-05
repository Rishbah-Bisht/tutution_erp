import React from 'react';
import { Users, UserCheck, CreditCard, Calendar } from 'lucide-react';
import { SkeletonStat } from '../common/SkeletonLoaders';

const DashboardStats = ({ stats, loading }) => {
    const STAT_CARDS = [
        {
            label: 'Total Students',
            value: stats.total,
            icon: Users,
            iconClass: 'ic-blue',
            textClass: 'text-blue-600',

        },
        {
            label: 'Active Now',
            value: stats.active,
            icon: UserCheck,
            iconClass: 'ic-indigo',
            textClass: 'text-indigo-600',
            sub: 'Across all batches'
        },
        {
            label: 'Fee Pending',
            value: stats.feePending,
            icon: CreditCard,
            iconClass: 'ic-orange',
            textClass: 'text-orange-600',
            sub: 'Requires follow-up',
            subClass: 'text-red-500'
        },
        {
            label: 'Monthly New',
            value: stats.newAdmissions,
            icon: Calendar,
            iconClass: 'ic-indigo',
            sub: 'New student this month',
            subClass: 'text-indigo-600'
        }
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
            {loading ? (
                <>
                    <SkeletonStat />
                    <SkeletonStat />
                    <SkeletonStat />
                    <SkeletonStat />
                </>
            ) : STAT_CARDS.map((card, i) => (
                <div key={i} style={{
                    padding: '20px', background: '#fff', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--erp-border)', boxShadow: 'var(--shadow-sm)',
                    display: 'flex', alignItems: 'center', gap: 16
                }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 'var(--radius-sm)',
                        background: 'var(--erp-bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <card.icon size={22} className={card.textClass} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--erp-muted2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                            {card.label}
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--erp-text)' }}>
                            {card.value}
                        </div>
                        {card.sub && (
                            <div style={{ fontSize: '0.7rem', fontWeight: 500, marginTop: 2 }} className={card.subClass || 'text-slate-400'}>
                                {card.sub}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DashboardStats;
