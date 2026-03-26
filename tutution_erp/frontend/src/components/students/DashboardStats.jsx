import React from 'react';
import { Calendar, CreditCard, UserCheck, Users } from 'lucide-react';
import { SkeletonStat } from '../common/SkeletonLoaders';

const STAT_CARDS = [
    {
        key: 'total',
        label: 'Total Students',
        icon: Users,
        variant: 'mint',
        sub: 'Student Directory'
    },
    {
        key: 'active',
        label: 'Active Now',
        icon: UserCheck,
        variant: 'sun',
        sub: 'Across all batches'
    },
    {
        key: 'feePending',
        label: 'Fee Pending',
        icon: CreditCard,
        variant: 'sky',
        sub: 'Requires follow-up',
        subClass: 'stat-sub-danger'
    },
    {
        key: 'newAdmissions',
        label: 'Monthly New',
        icon: Calendar,
        variant: 'lilac',
        sub: 'New student this month',
        subClass: 'stat-sub-accent'
    }
];

const DashboardStats = ({ stats, loading }) => (
    <div className="stats-grid stats-grid-tight">
        {loading ? (
            <>
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
            </>
        ) : (
            STAT_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                    <div key={card.key} className={`stat-card stat-card-${card.variant}`}>
                        <div className="stat-icon stat-icon-figma">
                            <Icon size={20} strokeWidth={2.2} />
                        </div>
                        <div>
                            <div className="stat-label">{card.label}</div>
                            <div className="stat-value stat-value-compact">{stats[card.key]}</div>
                            <div className={`stat-sub ${card.subClass || ''}`}>{card.sub}</div>
                        </div>
                    </div>
                );
            })
        )}
    </div>
);

export default DashboardStats;
