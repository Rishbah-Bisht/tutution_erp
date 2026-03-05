import React from 'react';
import { Search, Filter, Trash } from 'lucide-react';

const StudentFilters = ({
    search, setSearch,
    filters, setFilters,
    batches,
    onClearAll
}) => {
    const settings = JSON.parse(localStorage.getItem('instituteSettings') || '{}');
    const classesList = settings.classesOffered && settings.classesOffered.length > 0
        ? settings.classesOffered
        : ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
            background: '#fff', border: '1px solid var(--erp-border)', borderRadius: 'var(--radius-md)',
            marginBottom: 20, boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap'
        }}>
            <div style={{
                position: 'relative', display: 'flex', alignItems: 'center', flex: '1 1 300px'
            }}>
                <Search size={14} style={{ position: 'absolute', left: 12, color: 'var(--erp-muted)' }} />
                <input
                    style={{
                        width: '100%', padding: '8px 12px 8px 34px', border: '1px solid var(--erp-border)',
                        borderRadius: 'var(--radius-sm)', background: 'var(--erp-bg2)', fontSize: '0.85rem',
                        color: 'var(--erp-text)', outline: 'none', transition: 'all 0.2s'
                    }}
                    placeholder="Search ID, Name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onFocus={(e) => e.target.style.borderColor = 'var(--erp-primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--erp-border)'}
                />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--erp-muted2)', fontSize: '0.8rem', fontWeight: 600, marginRight: 4 }}>
                    <Filter size={14} /> Filters:
                </div>
                <select
                    style={selectStyle}
                    value={filters.status}
                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                >
                    <option value="">Status</option>
                    <option value="all">All Records</option>
                    <option value="active">Active</option>
                    <option value="batch_pending">Batch Pending</option>
                    <option value="inactive">Inactive</option>
                    <option value="completed">Completed</option>
                </select>

                <select
                    style={selectStyle}
                    value={filters.className}
                    onChange={e => setFilters({ ...filters, className: e.target.value })}
                >
                    <option value="">Classes</option>
                    {classesList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                    style={{ ...selectStyle, width: 140 }}
                    value={filters.batch}
                    onChange={e => setFilters({ ...filters, batch: e.target.value })}
                >
                    <option value="">Batches</option>
                    {batches
                        .filter(b => {
                            if (!filters.className) return true;
                            const bc = String(b.course || "").trim().toLowerCase();
                            const fc = String(filters.className).trim().toLowerCase();
                            return bc === fc;
                        })
                        .map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>

                <button
                    onClick={onClearAll}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                        background: 'var(--erp-danger-light)', color: 'var(--erp-danger)',
                        border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--erp-danger-light)'}
                >
                    <Trash size={13} /> Purge
                </button>
            </div>
        </div>
    );
};

const selectStyle = {
    padding: '8px 12px',
    border: '1px solid var(--erp-border)',
    borderRadius: 'var(--radius-sm)',
    background: '#fff',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--erp-text)',
    outline: 'none',
    cursor: 'pointer',
    width: 120
};

export default StudentFilters;
