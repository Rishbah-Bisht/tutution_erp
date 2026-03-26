import React, { useState, useEffect } from 'react';
import { Database, HardDrive, Layers, Activity, Loader2, RefreshCw } from 'lucide-react';
import { getDatabaseStats } from '../../api/adminApi';

const DatabaseUsage = ({ setAlert }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data } = await getDatabaseStats();
            setStats(data);
        } catch (err) {
            console.error("DB Stats Error:", err);
            // Don't alert here to avoid spamming the user if it fails silently
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading && !stats) {
        return (
            <div className="card" style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
                <Loader2 className="spin" size={24} color="#94a3b8" />
            </div>
        );
    }

    if (!stats) return null;

    const isHighUsage = stats.usagePercentage > 80;

    return (
        <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: 12, background: '#eff6ff', borderRadius: 6 }}>
                        <Database size={24} color="#3b82f6" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Database Usage</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Monitor your MongoDB Atlas storage limits.</p>
                    </div>
                </div>
                <button
                    onClick={fetchStats}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#64748b' }}
                    title="Refresh Stats"
                >
                    <RefreshCw className={loading ? 'spin' : ''} size={18} />
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 20, marginBottom: 32 }}>
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#64748b', fontSize: '0.85rem' }}>
                        <Activity size={14} /> DB Name
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b' }}>{stats.dbName}</div>
                </div>
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#64748b', fontSize: '0.85rem' }}>
                        <Layers size={14} /> Collections
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b' }}>{stats.collections}</div>
                </div>
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#64748b', fontSize: '0.85rem' }}>
                        <HardDrive size={14} /> Used Storage
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b' }}>{stats.storageSizeMB} MB</div>
                </div>
            </div>

            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
                    <span style={{ color: '#64748b', fontWeight: '500' }}>Overall Capacity (512 MB Atlas Limit)</span>
                    <span style={{ color: isHighUsage ? '#ef4444' : '#1e293b', fontWeight: '600' }}>{stats.usagePercentage}%</span>
                </div>
                <div style={{ width: '100%', height: 12, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                    <div
                        style={{
                            width: `${stats.usagePercentage}%`,
                            height: '100%',
                            background: isHighUsage ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                            transition: 'width 1s ease-in-out',
                            borderRadius: 6
                        }}
                    />
                </div>
                <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isHighUsage ? (
                        <span style={{ color: '#ef4444' }}>⚠️ Database usage is high. Consider upgrading or cleaning up logs.</span>
                    ) : (
                        <span>✨ Storage usage is within healthy limits for the Free Tier.</span>
                    )}
                </p>
            </div>
        </div>
    );
};

export default DatabaseUsage;

