import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
    Users, IndianRupee, Clock, BookOpen, ChevronLeft,
    User, ArrowUpRight, Calendar, MapPin,
    ShieldCheck, Loader2, Search, FileDown, PlusCircle
} from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import { API_BASE_URL } from '../api/apiConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const BatchDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const loadBatch = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await API().get(`/batches/${id}`);
            setData(data);
        } catch (e) {
            console.error(e);
            navigate('/batches');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { loadBatch(); }, [loadBatch]);

    if (loading) return (
        <ERPLayout title="Batch Details">
            <div className="p-20 flex flex-col items-center gap-4 text-slate-400">
                <Loader2 className="spin" size={40} />
                <p className="font-medium">Loading batch intelligence...</p>
            </div>
        </ERPLayout>
    );

    if (!data) return null;

    const { batch, students } = data;
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(`Batch Report: ${batch.name}`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Course: ${batch.course} | Total Students: ${batch.studentCount}`, 14, 30);

        autoTable(doc, {
            startY: 40,
            head: [['Roll No', 'Name', 'Status', 'Fees Paid']],
            body: filteredStudents.map(s => [
                s.rollNo,
                s.name,
                s.status.toUpperCase(),
                `INR ${s.feesPaid?.toLocaleString()}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] }
        });

        doc.save(`${batch.name}_Student_List.pdf`);
    };

    return (
        <ERPLayout title={`Batch: ${batch.name}`}>
            {/* Header / Back Navigation */}
            <div className="mb-6 flex items-center justify-between">
                <Link to="/batches" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold transition-colors">
                    <ChevronLeft size={20} /> Back to Batches
                </Link>
                <button className="btn btn-primary flex gap-2" onClick={exportToPDF}>
                    <FileDown size={16} /> Export Student PDF
                </button>
            </div>

            {/* Batch Intelligence Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-md border shadow-sm border-slate-100">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-sm flex items-center justify-center mb-4">
                        <Users size={20} />
                    </div>
                    <div className="text-2xl font-black text-slate-800">{batch.studentCount}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Enrolled</div>
                    <div className="w-full h-1 bg-slate-50 mt-4 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${(batch.studentCount / (batch.capacity || 30)) * 100}%` }}></div>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-2">Capacity: {batch.capacity || 30}</div>
                </div>

                <div className="bg-white p-6 rounded-md border shadow-sm border-slate-100">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-sm flex items-center justify-center mb-4">
                        <IndianRupee size={20} />
                    </div>
                    <div className="text-2xl font-black text-slate-800">₹{batch.totalEarnings?.toLocaleString()}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Revenue</div>
                    <div className="text-[10px] text-indigo-500 font-bold mt-4 flex items-center gap-1">
                        <ArrowUpRight size={12} /> Live Tracking
                    </div>
                </div>

                <div className="bg-white p-6 rounded-md border shadow-sm border-slate-100">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-sm flex items-center justify-center mb-4">
                        <Clock size={20} />
                    </div>
                    <div className="text-2xl font-black text-slate-800">{batch.schedule?.length || 0}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Weekly Slots</div>
                    <div className="text-[10px] text-slate-400 mt-4 leading-relaxed line-clamp-1">
                        {batch.timeSlots?.join(', ') || 'No slots assigned'}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-md border shadow-sm border-slate-100">
                    <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-sm flex items-center justify-center mb-4">
                        <MapPin size={20} />
                    </div>
                    <div className="text-2xl font-black text-slate-800">{batch.classroom || 'N/A'}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Assigned Room</div>
                    <div className="text-[10px] text-rose-500 font-bold mt-4 flex items-center gap-1">
                        <ShieldCheck size={12} /> Fixed Allocation
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Batch Sidebar Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-md border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <BookOpen size={18} className="text-indigo-500" /> academic configuration
                        </h3>

                        <div className="space-y-6">
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

                            <div className="pt-6 border-t border-slate-50">
                                <div className="flex items-center justify-between mb-2">
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
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
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

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/30">
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Student info</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrollment status</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Financials</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="px-8 py-20 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Search size={32} strokeWidth={1.5} />
                                                    <p className="font-medium">No students found matching your search</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStudents.map(s => (
                                            <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden">
                                                            {s.profileImage ? <img src={s.profileImage} alt="" className="w-full h-full object-cover" /> : <User size={18} />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800">{s.name}</div>
                                                            <div className="text-[10px] font-bold text-slate-400">#{s.rollNo}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase ${s.status === 'active' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                                                        <IndianRupee size={12} className="text-indigo-500" /> {s.feesPaid?.toLocaleString() || 0}
                                                        <span className="text-[10px] text-slate-400 font-medium">collected</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </ERPLayout>
    );
};

export default BatchDetailsPage;
