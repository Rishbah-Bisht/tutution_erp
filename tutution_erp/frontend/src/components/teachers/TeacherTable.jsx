import React, { useState } from 'react';
import { Eye, Pencil, Trash2, Banknote } from 'lucide-react';

const Avatar = ({ src, name, size = 36, fontSize = '0.85rem', BASE, imgSrc }) => {
    const [err, setErr] = useState(false);
    if (src && !err) return <img src={imgSrc(src)} alt={name} onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }} />;
    return (
        <div style={{
            width: size, height: size, borderRadius: '2px', background: 'var(--erp-primary)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize, flexShrink: 0
        }}>
            {(name?.[0] || '?').toUpperCase()}
        </div>
    );
};

const TeacherTable = ({
    teachers, loading, onView, onEdit, onDelete, onPayroll,
    fmt, imgSrc, BASE
}) => {

    return (
        <div className="erp-table-wrap">
            <table className="erp-table stackable">
                <thead>
                    <tr>
                        <th>Teacher Profile</th>
                        <th>Employee ID</th>
                        <th>Assignments</th>
                        <th>Monthly Salary</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {teachers.map(t => (
                        <tr key={t._id}>
                            <td data-label="Teacher Profile">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Avatar src={t.profileImage} name={t.name} size={38} BASE={BASE} imgSrc={imgSrc} />
                                    <div>
                                        <div className="td-bold">{t.name}</div>
                                        <div className="td-sm">{t.email || '—'}</div>
                                    </div>
                                </div>
                            </td>
                            <td data-label="Employee ID"><span className="chip">{t.regNo || '—'}</span></td>
                            <td data-label="Assignments">
                                {t.assignments?.length > 0 ? (
                                    <>
                                        {t.assignments.slice(0, 2).map((a, i) => (
                                            <div key={i} style={{ marginBottom: 3 }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--erp-primary)' }}>
                                                    {a.batchId?.name || a.batchName || '?'}:
                                                </span>{' '}
                                                <span className="td-sm">{a.subjects?.join(', ') || '—'}</span>
                                            </div>
                                        ))}
                                        {t.assignments.length > 2 && (
                                            <span className="td-sm">+{t.assignments.length - 2} more</span>
                                        )}
                                    </>
                                ) : <span className="td-sm">Not assigned</span>}
                            </td>
                            <td data-label="Monthly Salary">
                                <span className="td-bold" style={{ color: 'var(--erp-teacher)' }}>₹ {fmt(t.salary)}</span>
                                <div className="td-sm">₹ {fmt(t.salary * 12)} / year</div>
                            </td>
                            <td data-label="Status">
                                <span className={`badge ${t.status === 'active' ? 'badge-active' : 'badge-overdue'}`}>
                                    {t.status === 'active' ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td data-label="Actions">
                                <div className="flex gap-2">


                                    <button
                                        className="btn btn-outline btn-sm !text-emerald-600 border-emerald-600 hover:bg-emerald-600 hover:text-white"
                                        onClick={() => onView(t)}
                                        title="View Profile"
                                    >
                                        <Eye size={13} />
                                    </button>

                                    <button
                                        className="btn btn-outline btn-sm !text-slate-600 border-slate-600 hover:bg-slate-600 hover:text-white"
                                        onClick={() => onEdit(t)}
                                        title="Edit"
                                    >
                                        <Pencil size={13} />
                                    </button>
                                    <button
                                        className="btn btn-outline btn-sm !text-emerald-600 border-emerald-600 hover:bg-emerald-600 hover:text-white"
                                        onClick={() => onPayroll(t)}
                                        title="Generate Payroll"
                                    >
                                        <Banknote size={13} />
                                    </button>
                                    <button
                                        className="btn btn-outline btn-sm !text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                                        onClick={() => onDelete(t)}
                                        title="Delete"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

    );
};

export default TeacherTable;
