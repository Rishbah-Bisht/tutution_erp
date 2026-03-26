import React from 'react';
import { Search, X, RefreshCw } from 'lucide-react';

const TeacherFilters = ({
    search, setSearch,
    statusFilt, setStatusFilt,
    batchFilt, setBatchFilt,
    batches, loading, onLoad, searchRef
}) => {
    return (
        <div className="card toolbar" style={{ marginBottom: 20 }}>
            <div className="tb-search-wrap">
                <Search size={15} />
                <input ref={searchRef} className="tb-search" placeholder="Search teachers… (Ctrl+K)"
                    value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="tb-select" value={statusFilt} onChange={e => setStatusFilt(e.target.value)}>
                <option value="">Status Filter</option>
                <option value="all">All Records</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>
            <select className="tb-select" value={batchFilt} onChange={e => setBatchFilt(e.target.value)}>
                <option value="">Batches</option>
                {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            {(statusFilt || batchFilt || search) && (
                <button className="btn btn-outline btn-sm" onClick={() => { setStatusFilt(''); setBatchFilt(''); setSearch(''); }}>
                    <X size={13} /> Clear
                </button>
            )}
            <div style={{ marginLeft: 'auto' }}>
                <button className="btn btn-outline btn-sm" onClick={onLoad} title="Refresh">
                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                </button>
            </div>
        </div>
    );
};

export default TeacherFilters;
