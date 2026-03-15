import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, RefreshCw, Save } from 'lucide-react';
import {
    getTeacherAssignedBatches,
    getTeacherAttendanceReport,
    getTeacherAttendanceRoster,
    markTeacherAttendance
} from '../../api/attendanceApi';

const STATUS_OPTIONS = ['Present', 'Absent', 'Late'];
const fieldClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400';

const todayString = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
};

const TeacherAttendancePanel = () => {
    const [data, setData] = useState({ batches: [], assignments: [] });
    const [roster, setRoster] = useState([]);
    const [report, setReport] = useState({ records: [], summary: { total: 0, present: 0, absent: 0, late: 0 } });
    const [loading, setLoading] = useState({ setup: true, roster: false, save: false, report: false });
    const [flash, setFlash] = useState(null);
    const [filters, setFilters] = useState({ batchId: '', subjectId: '', date: todayString() });
    const [historyFilters, setHistoryFilters] = useState({ batchId: '', subjectId: '', dateFrom: daysAgo(6), dateTo: todayString() });

    const selectedBatch = useMemo(
        () => data.batches.find((batch) => String(batch.batchId) === filters.batchId) || null,
        [data.batches, filters.batchId]
    );

    const pushFlash = (type, text) => {
        setFlash({ type, text });
        window.clearTimeout(pushFlash.timer);
        pushFlash.timer = window.setTimeout(() => setFlash(null), 3200);
    };

    const loadAssignments = async () => {
        try {
            setLoading((current) => ({ ...current, setup: true }));
            const response = await getTeacherAssignedBatches();
            setData(response.data);
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to load assigned batches.');
        } finally {
            setLoading((current) => ({ ...current, setup: false }));
        }
    };

    const loadRoster = async () => {
        if (!filters.batchId || !filters.subjectId) {
            pushFlash('error', 'Select one of your assigned batches and subjects.');
            return;
        }

        try {
            setLoading((current) => ({ ...current, roster: true }));
            const response = await getTeacherAttendanceRoster(filters);
            setRoster(response.data.students || []);
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to load attendance roster.');
        } finally {
            setLoading((current) => ({ ...current, roster: false }));
        }
    };

    const loadHistory = async (nextFilters = historyFilters) => {
        try {
            setLoading((current) => ({ ...current, report: true }));
            const response = await getTeacherAttendanceReport({ ...nextFilters, limit: 50 });
            setReport(response.data);
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to load attendance history.');
        } finally {
            setLoading((current) => ({ ...current, report: false }));
        }
    };

    useEffect(() => {
        loadAssignments();
        loadHistory();
    }, []);

    const saveAttendance = async () => {
        if (!roster.length) {
            pushFlash('error', 'Load a roster first.');
            return;
        }

        try {
            setLoading((current) => ({ ...current, save: true }));
            await markTeacherAttendance({
                batchId: filters.batchId,
                subjectId: filters.subjectId,
                date: filters.date,
                entries: roster.map((student) => ({
                    studentId: student._id,
                    status: student.attendanceStatus || 'Present'
                }))
            });
            pushFlash('success', 'Attendance saved.');
            await loadHistory();
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to save attendance.');
        } finally {
            setLoading((current) => ({ ...current, save: false }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="page-hdr">
                <div>
                    <h1>Assigned Attendance</h1>
                    <p>Only your assigned batches and subjects are available here.</p>
                </div>
                <button type="button" className="btn btn-outline" onClick={() => { loadAssignments(); loadHistory(); }}>
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {flash && (
                <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${
                    flash.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}>
                    {flash.text}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <section className="card p-5">
                    <h3 className="font-black text-slate-900">My Batch Access</h3>
                    <div className="mt-4 space-y-3">
                        {loading.setup ? (
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                                <Loader2 size={16} className="animate-spin" />
                                Loading assignments...
                            </div>
                        ) : data.batches.length === 0 ? (
                            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-500">
                                No batches are assigned to you yet.
                            </div>
                        ) : data.batches.map((batch) => (
                            <div key={batch.batchId} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                <div className="font-bold text-slate-800">{batch.batchName}</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {batch.subjects.map((subject) => (
                                        <span key={subject.subjectId} className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-wide text-slate-500">
                                            {subject.subjectName}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="card p-5 xl:col-span-2">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <select className={fieldClass} value={filters.batchId} onChange={(e) => setFilters({ ...filters, batchId: e.target.value, subjectId: '' })}>
                            <option value="">Select batch</option>
                            {data.batches.map((batch) => (
                                <option key={batch.batchId} value={String(batch.batchId)}>{batch.batchName}</option>
                            ))}
                        </select>
                        <select className={fieldClass} value={filters.subjectId} onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })} disabled={!filters.batchId}>
                            <option value="">Select subject</option>
                            {(selectedBatch?.subjects || []).map((subject) => (
                                <option key={subject.subjectId} value={String(subject.subjectId)}>{subject.subjectName}</option>
                            ))}
                        </select>
                        <input className={fieldClass} type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
                        <button type="button" className="btn btn-primary justify-center" onClick={loadRoster}>
                            {loading.roster ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
                            Load Roster
                        </button>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((status) => (
                            <button key={status} type="button" className="btn btn-outline" onClick={() => setRoster((current) => current.map((student) => ({ ...student, attendanceStatus: status })))}>
                                {status}
                            </button>
                        ))}
                        <button type="button" className="btn btn-primary" onClick={saveAttendance} disabled={loading.save}>
                            {loading.save ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Attendance
                        </button>
                    </div>

                    <div className="mt-5 erp-table-wrap">
                        <table className="erp-table stackable">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Roll No</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roster.length === 0 ? (
                                    <tr><td colSpan="3" className="py-10 text-center text-sm font-medium text-slate-500">No roster loaded yet.</td></tr>
                                ) : roster.map((student) => (
                                    <tr key={student._id}>
                                        <td data-label="Student" className="font-bold text-slate-800">{student.name}</td>
                                        <td data-label="Roll No" className="text-sm font-semibold text-slate-500">{student.rollNo || '--'}</td>
                                        <td data-label="Status">
                                            <select className={`${fieldClass} min-w-[148px]`} value={student.attendanceStatus || 'Present'} onChange={(e) => setRoster((current) => current.map((row) => row._id === student._id ? { ...row, attendanceStatus: e.target.value } : row))}>
                                                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <section className="card p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h3 className="font-black text-slate-900">Attendance History</h3>
                        <p className="mt-1 text-sm font-medium text-slate-500">History is automatically restricted to your assigned subjects.</p>
                    </div>

                    <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-4 lg:max-w-4xl">
                        <select className={fieldClass} value={historyFilters.batchId} onChange={(e) => setHistoryFilters({ ...historyFilters, batchId: e.target.value })}>
                            <option value="">All assigned batches</option>
                            {data.batches.map((batch) => <option key={batch.batchId} value={String(batch.batchId)}>{batch.batchName}</option>)}
                        </select>
                        <select className={fieldClass} value={historyFilters.subjectId} onChange={(e) => setHistoryFilters({ ...historyFilters, subjectId: e.target.value })}>
                            <option value="">All assigned subjects</option>
                            {data.assignments.map((assignment) => (
                                <option key={assignment._id} value={String(assignment.subjectId?._id)}>{assignment.subjectId?.name}</option>
                            ))}
                        </select>
                        <input className={fieldClass} type="date" value={historyFilters.dateFrom} onChange={(e) => setHistoryFilters({ ...historyFilters, dateFrom: e.target.value })} />
                        <div className="flex gap-2">
                            <input className={fieldClass} type="date" value={historyFilters.dateTo} onChange={(e) => setHistoryFilters({ ...historyFilters, dateTo: e.target.value })} />
                            <button type="button" className="btn btn-primary" onClick={() => loadHistory()}>
                                {loading.report ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                Load
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-5 erp-table-wrap">
                    <table className="erp-table stackable">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Student</th>
                                <th>Batch</th>
                                <th>Subject</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.records.length === 0 ? (
                                <tr><td colSpan="5" className="py-10 text-center text-sm font-medium text-slate-500">No attendance records found.</td></tr>
                            ) : report.records.map((record) => {
                                const statusBadge = record.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 
                                                  record.status === 'Absent' ? 'bg-rose-100 text-rose-700' : 
                                                  record.status === 'Late' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';
                                return (
                                    <tr key={record._id}>
                                        <td data-label="Date" className="text-sm font-semibold text-slate-500">{new Date(record.attendanceDate || record.date).toLocaleDateString()}</td>
                                        <td data-label="Student">
                                            <div className="font-bold text-slate-800">{record.studentId?.name}</div>
                                            <div className="text-xs font-semibold text-slate-400">{record.studentId?.rollNo}</div>
                                        </td>
                                        <td data-label="Batch" className="font-semibold text-slate-600">{record.batchId?.name}</td>
                                        <td data-label="Subject" className="font-semibold text-slate-600">{record.subjectId?.name}</td>
                                        <td data-label="Status">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${statusBadge}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default TeacherAttendancePanel;
