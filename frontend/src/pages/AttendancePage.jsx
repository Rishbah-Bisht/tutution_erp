import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, RefreshCw, Save, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import ToastContainer, { useToast } from '../components/Toast';
import {
    getAdminAttendanceSetup,
    getAdminAttendanceRoster,
    markAdminAttendance
} from '../api/attendanceApi';

const STATUS_OPTIONS = [
    { label: 'Present', value: 'Present', color: '#10b981', bg: '#f0fdf4', activeBg: '#10b981', activeText: '#fff' },
    { label: 'Absent', value: 'Absent', color: '#ef4444', bg: '#fef2f2', activeBg: '#ef4444', activeText: '#fff' },
    { label: 'Late', value: 'Late', color: '#f59e0b', bg: '#fffbeb', activeBg: '#f59e0b', activeText: '#fff' },
];

const todayString = () => new Date().toISOString().slice(0, 10);

const AttendancePage = () => {
    const { toasts, toast, removeToast } = useToast();
    const [setup, setSetup] = useState({ batches: [], teachers: [], subjects: [], assignments: [] });
    const [roster, setRoster] = useState([]);
    const [isMarked, setIsMarked] = useState(false);
    const [loading, setLoading] = useState({ setup: true, roster: false, save: false });

    const [filters, setFilters] = useState({
        batchId: '',
        subjectId: '',
        date: todayString()
    });

    const selectedBatch = useMemo(
        () => setup.batches.find((b) => b._id === filters.batchId) || null,
        [setup.batches, filters.batchId]
    );

    const availableSubjects = useMemo(() => {
        if (!selectedBatch) return [];
        const subjectIds = new Set((selectedBatch.subjectIds || []).map(id => String(id)));
        return setup.subjects.filter(s => subjectIds.has(String(s._id)));
    }, [selectedBatch, setup.subjects]);

    const loadSetup = async () => {
        try {
            setLoading(l => ({ ...l, setup: true }));
            const response = await getAdminAttendanceSetup();
            setSetup(response.data);
        } catch (error) {
            toast.error('Failed to load attendance setup.');
        } finally {
            setLoading(l => ({ ...l, setup: false }));
        }
    };

    const loadRoster = async () => {
        if (!filters.batchId || !filters.subjectId) return;

        try {
            setLoading(l => ({ ...l, roster: true }));
            const response = await getAdminAttendanceRoster(filters);
            setRoster(response.data.students || []);
            setIsMarked(response.data.isMarked || false);
        } catch (error) {
            toast.error('Failed to load student roster.');
        } finally {
            setLoading(l => ({ ...l, roster: false }));
        }
    };

    useEffect(() => {
        loadSetup();
    }, []);

    // Automatic loading when filters change
    useEffect(() => {
        if (filters.batchId && filters.subjectId) {
            loadRoster();
        } else {
            setRoster([]);
            setIsMarked(false);
        }
    }, [filters.batchId, filters.subjectId, filters.date]);

    const handleStatusChange = (studentId, status) => {
        setRoster(prev => prev.map(s => s._id === studentId ? { ...s, attendanceStatus: status } : s));
    };

    const saveAttendance = async () => {
        if (!roster.length) return;

        try {
            setLoading(l => ({ ...l, save: true }));
            await markAdminAttendance({
                batchId: filters.batchId,
                subjectId: filters.subjectId,
                date: filters.date,
                entries: roster.map(s => ({
                    studentId: s._id,
                    status: s.attendanceStatus || 'Present'
                }))
            });
            toast.success('Attendance successfully saved.');
            setIsMarked(true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save attendance.');
        } finally {
            setLoading(l => ({ ...l, save: false }));
        }
    };

    const bulkMark = (status) => {
        setRoster(prev => prev.map(s => ({ ...s, attendanceStatus: status })));
    };

    return (
        <ERPLayout title="Attendance Management">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* Added horizontal padding for mobile devices (px-4 sm:px-6 lg:px-8) */}
            <div className="max-w-[1240px] mx-auto space-y-6 pb-20 px-4 sm:px-6 lg:px-8 pt-6">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Attendance Record</h1>
                        <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage daily attendance for your students efficiently.</p>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white/50 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/60 shadow-sm w-full sm:w-auto">
                        <div className="flex items-center gap-2 px-3 py-1.5 text-slate-600 font-semibold text-sm border-r border-slate-300 w-full sm:w-auto justify-center sm:justify-start">
                            <CalendarDays size={16} />
                            Date
                        </div>
                        <input
                            type="date"
                            className="w-full sm:w-auto bg-transparent border-none outline-none text-slate-800 font-bold px-3 py-1.5 text-sm"
                            value={filters.date}
                            onChange={(e) => setFilters(f => ({ ...f, date: e.target.value }))}
                        />
                    </div>
                </div>

                {/* Selection Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>

                    <div className="space-y-2 relative">
                        <label className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            1. Select Batch
                        </label>
                        <select
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-slate-700 font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
                            value={filters.batchId}
                            onChange={(e) => setFilters(f => ({ ...f, batchId: e.target.value, subjectId: '' }))}
                        >
                            <option value="">Choose a Batch...</option>
                            {setup.batches.map(b => <option key={b._id} value={b._id}>{b.name} ({b.course})</option>)}
                        </select>
                    </div>

                    <div className="space-y-2 relative">
                        <label className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            2. Select Subject
                        </label>
                        <select
                            className={`w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-slate-700 font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer ${!filters.batchId && 'opacity-50 cursor-not-allowed'}`}
                            value={filters.subjectId}
                            onChange={(e) => setFilters(f => ({ ...f, subjectId: e.target.value }))}
                            disabled={!filters.batchId}
                        >
                            <option value="">{filters.batchId ? 'Choose a Subject...' : 'Please select a batch first'}</option>
                            {availableSubjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                        </select>
                    </div>
                </div>

                {/* Main Content Area */}
                {loading.roster ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching Roster...</p>
                    </div>
                ) : roster.length > 0 ? (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">

                        {/* Status Warning */}
                        {isMarked && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-sm">
                                <div className="p-2 bg-amber-100 rounded-full shrink-0 w-fit">
                                    <AlertCircle className="text-amber-600" size={20} />
                                </div>
                                <div>
                                    <p className="text-amber-900 font-bold text-sm">Attendance Already Marked</p>
                                    <p className="text-amber-700 text-xs font-medium mt-0.5">Today's attendance for this subject has been recorded. You can still make changes to update it.</p>
                                </div>
                            </div>
                        )}

                        {/* Roster Controls (Cleaned up from dark mode to soft premium card) */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                    <Users size={24} className="text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Students</p>
                                    <p className="text-2xl font-black text-slate-800 leading-none mt-1">{roster.length}</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto pt-4 border-t border-slate-100 md:pt-0 md:border-none">
                                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Mark All As</span>
                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                    {STATUS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => bulkMark(opt.value)}
                                            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:shadow-md active:scale-95 border border-transparent hover:border-slate-200"
                                            style={{ background: opt.bg, color: opt.activeBg }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Student Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {roster.map(student => (
                                <div
                                    key={student._id}
                                    className="bg-white rounded-2xl border border-slate-200/60 p-5 flex flex-col gap-5 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-200 transition-all duration-300"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Circular Avatar */}
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-200">
                                            {student.profileImage ? (
                                                <img
                                                    src={student.profileImage}
                                                    alt={student.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = '';
                                                        e.target.parentElement.innerHTML = `<span class="text-base sm:text-lg font-black text-slate-400">${student.rollNo || student.name.charAt(0)}</span>`;
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-base sm:text-lg font-black text-slate-400">{student.rollNo || student.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-slate-800 leading-tight truncate text-base">{student.name}</h3>
                                            <p className="text-xs font-semibold text-slate-400 truncate mt-0.5">Roll: {student.rollNo || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Segmented Control Style Buttons */}
                                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                        {STATUS_OPTIONS.map(opt => {
                                            const isActive = student.attendanceStatus === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => handleStatusChange(student._id, opt.value)}
                                                    className={`flex-1 py-2 px-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all truncate ${isActive
                                                        ? 'shadow-sm border border-black/5'
                                                        : 'text-slate-400 hover:bg-slate-200/40 hover:text-slate-600'
                                                        }`}
                                                    style={{
                                                        background: isActive ? opt.activeBg : 'transparent',
                                                        color: isActive ? opt.activeText : ''
                                                    }}
                                                >
                                                    {opt.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Save Trigger - NORMAL layout, no sticky float */}
                        <div className="flex justify-center pt-6 pb-12 w-full">
                            <button
                                onClick={saveAttendance}
                                disabled={loading.save}
                                className=" sm:w-auto justify-center group bg-slate-900  text-white px-8 py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl hover:shadow-indigo-500/25 flex items-center gap-3 transition-all enabled:active:scale-95 disabled:opacity-50"
                            >
                                {loading.save ? (
                                    <Loader2 className="animate-spin shrink-0" size={20} />
                                ) : (
                                    <CheckCircle2 className="shrink-0" size={20} />
                                )}
                                {isMarked ? 'Update Attendance Record' : 'Save Attendance Record'}
                            </button>
                        </div>
                    </div>
                ) : (filters.batchId && filters.subjectId) ? (
                    <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 sm:p-20 flex flex-col items-center justify-center text-center mx-4 sm:mx-0">
                        <div className="p-4 bg-slate-50 rounded-full mb-4">
                            <Users size={32} className="text-slate-300 sm:w-10 sm:h-10" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-slate-800">No Students Found</h3>
                        <p className="text-sm sm:text-base text-slate-500 font-medium max-w-[300px] mt-2">There are no active students matched with this batch selection.</p>
                    </div>
                ) : (
                    <div className="bg-slate-50 rounded-3xl p-10 sm:p-16 flex flex-col items-center justify-center text-center opacity-80 border-2 border-slate-100 mx-4 sm:mx-0">
                        <div className="p-4 sm:p-5 bg-white rounded-2xl shadow-sm mb-4 sm:mb-6">
                            <RefreshCw size={24} className="text-indigo-400 animate-pulse sm:w-8 sm:h-8" />
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900">Waiting for Selection</h3>
                        <p className="text-sm sm:text-base text-slate-500 font-medium max-w-sm mt-2 italic">Choose a batch and subject to load the corresponding student roster and start marking attendance.</p>
                    </div>
                )}
            </div>

            <style>{`
                ::-webkit-calendar-picker-indicator {
                    filter: invert(0.3);
                    cursor: pointer;
                }
            `}</style>
        </ERPLayout>
    );
};

export default AttendancePage;