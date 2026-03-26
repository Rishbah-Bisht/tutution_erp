import React from 'react';
import { Search, Calendar, FileDown, Filter, X } from 'lucide-react';

const ExpenseFilters = ({
    search, setSearch,
    category, setCategory,
    paymentMode, setPaymentMode,
    startDate, setStartDate,
    endDate, setEndDate,
    exportData,
    clearFilters
}) => {

    const categories = ['Rent', 'Salary', 'Electricity', 'Maintenance', 'Marketing', 'Supplies', 'Other'];
    const paymentModes = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'];

    const hasFilters = search || category || paymentMode || startDate || endDate;

    const selectStyle = {
        padding: '8px 12px', border: '1px solid var(--erp-border)',
        borderRadius: 'var(--radius-sm)', background: 'var(--erp-bg2)',
        fontSize: '0.85rem', color: 'var(--erp-text)', outline: 'none',
        minWidth: 140, cursor: 'pointer', appearance: 'none'
    };

    return (
        <div className="exp-filters" style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
            background: '#fff', border: '1px solid var(--erp-border)', borderRadius: 'var(--radius-md)',
            marginBottom: 20, boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap'
        }}>
            <style>{`
                @media (max-width: 640px) {
                    .exp-filters { padding: 12px !important; gap: 8px !important; }
                    .exp-search-wrap { max-width: 100% !important; width: 100% !important; order: 1; }
                    .exp-filters-wrap { width: 100% !important; flex-direction: column !important; align-items: stretch !important; order: 2; margin-left: 0 !important; gap: 8px !important; }
                    .exp-filters-wrap select { width: 100% !important; min-width: 100% !important; }
                    .exp-date-wrap { width: 100% !important; justify-content: space-between !important; }
                    .exp-date-wrap input { flex: 1 !important; text-align: center !important; width: auto !important; }
                    .exp-clear-btn { width: 100% !important; justify-content: center !important; }
                    .exp-divider { display: none !important; }
                }
            `}</style>
            <div className="exp-search-wrap" style={{
                position: 'relative', display: 'flex', alignItems: 'center', flex: 1, maxWidth: 300
            }}>
                <Search size={14} style={{ position: 'absolute', left: 12, color: 'var(--erp-muted)' }} />
                <input
                    style={{
                        width: '100%', padding: '8px 12px 8px 34px', border: '1px solid var(--erp-border)',
                        borderRadius: 'var(--radius-sm)', background: 'var(--erp-bg2)', fontSize: '0.85rem',
                        color: 'var(--erp-text)', outline: 'none', transition: 'all 0.2s'
                    }}
                    placeholder="Search title, description..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onFocus={(e) => e.target.style.borderColor = 'var(--erp-primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--erp-border)'}
                />
            </div>

            <div className="exp-filters-wrap" style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--erp-muted2)', fontSize: '0.8rem', fontWeight: 600, marginRight: 4 }}>
                    <Filter size={14} /> Filters:
                </div>

                <select
                    style={selectStyle}
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                    style={selectStyle}
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                >
                    <option value="">All Payment Modes</option>
                    {paymentModes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="exp-date-wrap" style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    border: '1px solid var(--erp-border)', borderRadius: 'var(--radius-sm)',
                    background: 'var(--erp-bg2)'
                }}>
                    <Calendar size={14} color="var(--erp-muted)" />
                    <input
                        type="date"
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: 'var(--erp-text)', width: 110 }}
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                    <span style={{ color: 'var(--erp-muted2)' }}>-</span>
                    <input
                        type="date"
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: 'var(--erp-text)', width: 110 }}
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                    />
                </div>

                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="exp-clear-btn"
                        style={{
                            background: 'transparent', border: '1px solid var(--erp-danger)',
                            color: 'var(--erp-danger)', borderRadius: 'var(--radius-sm)',
                            padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500
                        }}
                    >
                        <X size={14} /> Clear
                    </button>
                )}

                <div className="exp-divider" style={{ width: 1, height: 24, background: 'var(--erp-border)', margin: '0 4px' }}></div>


            </div>
        </div>
    );
};

export default ExpenseFilters;
