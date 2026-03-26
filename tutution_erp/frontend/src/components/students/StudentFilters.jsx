import React from 'react';
import { Filter, Search, Trash } from 'lucide-react';

const StudentFilters = ({
    search,
    setSearch,
    filters,
    setFilters,
    batches,
    onClearAll
}) => {
    const settings = JSON.parse(localStorage.getItem('instituteSettings') || '{}');
    const classesList = settings.classesOffered && settings.classesOffered.length > 0
        ? settings.classesOffered
        : ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

    return (
        <div className="toolbar toolbar-figma">
            <div className="tb-search-wrap toolbar-search-grow">
                <Search size={14} />
                <input
                    className="tb-search"
                    placeholder="Search ID, Name..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
            </div>

            <div className="toolbar-actions">
                <div className="toolbar-label hide-mobile">
                    <Filter size={14} /> Filters:
                </div>

                <select
                    className="tb-select"
                    value={filters.status}
                    onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                >
                    <option value="">Status</option>
                    <option value="all">All Records</option>
                    <option value="active">Active</option>
                    <option value="batch_pending">Batch Pending</option>
                    <option value="inactive">Inactive</option>
                    <option value="completed">Completed</option>
                </select>

                <select
                    className="tb-select"
                    value={filters.className}
                    onChange={(event) => setFilters({ ...filters, className: event.target.value })}
                >
                    <option value="">Classes</option>
                    {classesList.map((className) => (
                        <option key={className} value={className}>{className}</option>
                    ))}
                </select>

                <select
                    className="tb-select tb-select-wide"
                    value={filters.batch}
                    onChange={(event) => setFilters({ ...filters, batch: event.target.value })}
                >
                    <option value="">Batches</option>
                    {batches
                        .filter((batch) => {
                            if (!filters.className) {
                                return true;
                            }

                            const batchClass = String(batch.course || '').trim().toLowerCase();
                            const filterClass = String(filters.className).trim().toLowerCase();
                            return batchClass === filterClass;
                        })
                        .map((batch) => (
                            <option key={batch._id} value={batch._id}>{batch.name}</option>
                        ))}
                </select>

                <button type="button" className="btn btn-danger btn-sm" onClick={onClearAll}>
                    <Trash size={13} /> Purge
                </button>
            </div>
        </div>
    );
};

export default StudentFilters;
