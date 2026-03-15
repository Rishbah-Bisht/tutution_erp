import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
    Users, IndianRupee, Clock, BookOpen, ChevronLeft,
    User, ArrowUpRight, Calendar, MapPin,
    ShieldCheck, Loader2, Search, FileDown, PlusCircle,
    Eye, X, Download
} from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import { API_BASE_URL } from '../api/apiConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SkeletonStat, SkeletonTable, SkeletonLine, SkeletonSidebarItem } from '../components/common/SkeletonLoaders';
import apiClient from '../api/apiConfig';

const BatchDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [config, setConfig] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [assignmentsMap, setAssignmentsMap] = useState({});

    const loadBatch = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get(`/batches/${id}`);
            setData(data);
        } catch (e) {
            console.error(e);
            navigate('/batches');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { loadBatch(); }, [loadBatch]);

    useEffect(() => {
        if (!id) return;
        apiClient.get(`/batches/${id}/subjects`)
            .then(({ data }) => setAssignmentsMap(data.assignments || {}))
            .catch(() => console.error('Failed to load batch assignments'));
    }, [id]);

    useEffect(() => {
        apiClient.get('/scheduler/config')
            .then(({ data }) => setConfig(data))
            .catch(() => console.error('Failed to load scheduler config'));
    }, []);

    if (!data && !loading) return null;

    const batch = data?.batch || {};
    const students = data?.students || [];
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const generateTimetablePDF = (isPreview = true) => {
        if (!batch.schedule || batch.schedule.length === 0) {
            alert('No schedule slots to export');
            return;
        }
        if (!config) return;

        const doc = new jsPDF('landscape');

        // Header
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);
        doc.text(`Timetable: ${batch.name}`, 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Course: ${batch.course || 'N/A'}`, 14, 28);
        doc.text(`Classroom: ${batch.classroom || 'N/A'}`, 14, 33);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38);

        // Prepare table data
        const head = ['TIME', ...config.days];
        const body = config.timeSlots.map(time => {
            const row = [time];
            config.days.forEach(day => {
                const slot = (batch.schedule || []).find(s => s.day === day && s.time === time);
                row.push(slot ? `${slot.subject}\n(${slot.room})` : '—');
            });
            return row;
        });

        autoTable(doc, {
            startY: 45,
            head: [head],
            body: body,
            headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', halign: 'center' },
            styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle', overflow: 'linebreak' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { top: 40 },
            theme: 'grid'
        });

        if (isPreview) {
            const blob = doc.output('bloburl');
            setPdfUrl(blob);
            setShowPreview(true);
        } else {
            doc.save(`Timetable_${batch.name}_${new Date().toISOString().slice(0, 10)}.pdf`);
        }
    };

    const uniqueRooms = [...new Set(
        (batch.schedule || []).map(s => s.room || batch.classroom).filter(Boolean)
    )];
    if (uniqueRooms.length === 0 && batch.classroom) uniqueRooms.push(batch.classroom);

    return (
        <ERPLayout title={`Batch: ${batch.name}`}>
            <style>{`
                @media (max-width: 640px) {
                    .bd-hdr { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
                    .bd-hdr button { width: 100% !important; justify-content: center !important; }
                    .bd-stats { grid-template-columns: 1fr !important; }
                    .bd-main-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
                    .roster-header { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; padding: 20px !important; }
                    .roster-header .relative { width: 100% !important; }
                    .roster-header input { width: 100% !important; }
                }
            `}</style>
            {/* Header / Back Navigation */}
            <div className="mb-6 flex items-center justify-between">
                <Link to="/batches" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold transition-colors">
                    <ChevronLeft size={20} /> Back to Batches
                </Link>
                <div className="flex gap-2">
                    <button className="btn btn-outline flex gap-2" onClick={() => generateTimetablePDF(true)}>
                        <Eye size={16} /> Preview Timetable
                    </button>
                    <button className="btn btn-primary flex gap-2" onClick={() => {
                        const doc = new jsPDF();
                        doc.setFontSize(20);
                        doc.text(`Batch Report: ${batch.name}`, 14, 22);
                        doc.setFontSize(11);
                        doc.setTextColor(100);
                        doc.text(`Course: ${batch.course} | Total Students: ${batch.studentCount}`, 14, 30);
                        autoTable(doc, {
                            startY: 40,
                            head: [['Roll No', 'Name', 'Status', 'Fees Paid']],
                            body: filteredStudents.map(st => [st.rollNo, st.name, st.status.toUpperCase(), `INR ${st.feesPaid?.toLocaleString()}`]),
                            theme: 'grid',
                            headStyles: { fillColor: [15, 23, 42] }
                        });
                        doc.save(`${batch.name}_Student_List.pdf`);
                    }}>
                        <FileDown size={16} /> Export Student PDF
                    </button>
                </div>
            </div>

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {loading && !data ? (
                    <>
                        <SkeletonStat />
                        <SkeletonStat />
                        <SkeletonStat />
                        <SkeletonStat />
                    </>
                ) : (
                    <>
                        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolled Students</p>
                                <p className="text-2xl font-black text-slate-800">{batch.studentCount || 0}</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <IndianRupee size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
                                <p className="text-2xl font-black text-slate-800">₹ {(batch.totalEarnings || 0).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Status</p>
                                <p className="text-2xl font-black text-slate-800">{batch.isActive ? 'Active' : 'Archived'}</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Students</p>
                                <p className="text-2xl font-black text-slate-800">{batch.activeCount || 0}</p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bd-main-grid">
                {/* Batch Sidebar Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-md border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <BookOpen size={18} className="text-indigo-500" /> academic configuration
                        </h3>

                        <div className="space-y-6">
                            {loading && !data ? (
                                <>
                                    <SkeletonSidebarItem />
                                    <SkeletonSidebarItem />
                                    <SkeletonSidebarItem />
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Course / standard</label>
                                        <div className="text-slate-700 font-bold mt-1">{batch.course}</div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subjects covered</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {batch.subjects?.map(sub => (
                                                <span key={sub} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600">
                                                    {sub}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                                            <div className="text-slate-600 text-sm font-semibold mt-1 flex items-center gap-2">
                                                <Calendar size={14} /> {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</label>
                                            <div className="text-slate-600 text-sm font-semibold mt-1 flex items-center gap-2">
                                                <Calendar size={14} /> {batch.endDate ? new Date(batch.endDate).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="pt-6 border-t border-slate-100">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-4 flex items-center gap-2">
                                    <User size={14} className="text-indigo-500" /> Subject Faculties
                                </label>
                                <div className="grid gap-2">
                                    {batch.subjects && batch.subjects.length > 0 ? (
                                        batch.subjects.map(sub => {
                                            // Source of truth: Explicit teacher assignments from the assignmentsMap
                                            const assignment = assignmentsMap[sub];
                                            const assignedTeacher = assignment ? assignment.teacherName : 'Unassigned';

                                            return (
                                                <div key={sub} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                    <span className="text-xs font-bold text-slate-700">{sub}</span>
                                                    <div className="flex items-center gap-1.5 focus-within:ring-2 ring-indigo-500/20 rounded transition-all">
                                                        <div className={`w-2 h-2 rounded-full ${assignedTeacher === 'Unassigned' ? 'bg-amber-400' : 'bg-green-500'}`}></div>
                                                        <span className={`text-[11px] font-bold ${assignedTeacher === 'Unassigned' ? 'text-amber-600' : 'text-slate-600'}`}>
                                                            {assignedTeacher}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-xs text-slate-400 font-medium italic">No subjects configured.</div>
                                    )}
                                </div>
                            </div>                            <div className="pt-6 border-t border-slate-50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Creation Date</span>
                                    <span className="text-xs font-bold text-slate-600">
                                        {batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase ${batch.isActive ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                        {batch.isActive ? 'Active' : 'Archived'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Student Table */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-md border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 roster-header">
                            <h3 className="text-lg font-bold text-slate-800">Student Roster</h3>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-sm text-sm focus:ring-1 ring-indigo-500/10 outline-none w-64"
                                    placeholder="Find student..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="card">
                            {loading && !data ? (
                                <SkeletonTable rows={10} />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left stackable">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Roll No</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fees Paid</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredStudents.map(student => (
                                                <tr key={student._id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4" data-label="Student">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden">
                                                                {student.profileImage ? (
                                                                    <img src={`${API_BASE_URL}/${student.profileImage.replace(/\\/g, '/')}`} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                        <User size={16} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="font-bold text-slate-700">{student.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4" data-label="Roll No">
                                                        <span className="text-sm font-semibold text-slate-500">{student.rollNo}</span>
                                                    </td>
                                                    <td className="px-6 py-4" data-label="Fees Paid">
                                                        <span className="text-sm font-bold text-slate-700">₹ {(student.feesPaid || 0).toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-6 py-4" data-label="Status">
                                                        <div className="flex sm:justify-center">
                                                            <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase ${student.status === 'active' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                                {student.status}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right" data-label="Actions">
                                                        <Link
                                                            to={`/students/${student._id}`}
                                                            className="inline-flex items-center justify-center p-2 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <ArrowUpRight size={16} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredStudents.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                                        <Search size={32} className="mx-auto mb-3 opacity-20" />
                                                        <p className="font-medium text-sm">No students found matching your search.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Timetable Preview Modal */}
            {showPreview && (
                <div className="modal-overlay" style={{
                    position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '20px'
                }} onClick={(e) => e.target === e.currentTarget && setShowPreview(false)}>
                    <div className="modal" style={{
                        width: '100%', maxWidth: '1200px', maxHeight: '100vh',
                        background: '#f8fafc', borderRadius: '12px', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        position: 'relative'
                    }}>
                        {/* Header matching StudentFormModal */}
                        <header style={{
                            width: '100%', padding: '24px 32px', background: '#0f172a',
                            position: 'relative', color: '#fff', display: 'flex',
                            justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
                        }}>
                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{
                                    width: 52, height: 52, borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center'
                                }} className="hide-mobile">
                                    <Calendar size={24} color="#fff" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                                        Timetable Preview
                                    </h2>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                                        Review schedule for {batch.name}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => generateTimetablePDF(false)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-xs font-bold flex items-center gap-2 transition-all"
                                >
                                    <Download size={14} /> DOWNLOAD PDF
                                </button>
                                <button type="button" onClick={() => setShowPreview(false)} style={{
                                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px', color: '#fff', padding: '8px 16px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontWeight: 700
                                }}>
                                    <X size={16} /> <span className="hide-mobile">CLOSE</span>
                                </button>
                            </div>
                        </header>

                        {/* PDF View Area */}
                        <div className="flex-1 bg-slate-100 p-8 overflow-hidden">
                            <iframe
                                src={pdfUrl}
                                className="w-full h-full border-none rounded-lg shadow-inner bg-white"
                                title="Timetable Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </ERPLayout>
    );
};

export default BatchDetailsPage;
