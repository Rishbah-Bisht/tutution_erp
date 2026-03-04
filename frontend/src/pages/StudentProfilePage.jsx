import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
    User, Mail, Phone, MapPin, Calendar,
    GraduationCap, IndianRupee, BookOpen, Clock,
    ChevronLeft, DownloadCloud, Wallet, ShieldCheck,
    Info, UserCircle2, Building2, Hash, FileText,
    ArrowUpRight, Loader2
} from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import { API_BASE_URL } from '../api/apiConfig';
import jsPDF from 'jspdf';
import NotificationModal from '../components/notifications/NotificationModal';
import { Check, AlertTriangle } from 'lucide-react';

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const StudentProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [toasts, setToasts] = useState([]);

    const addToast = (msg, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    const loadProfile = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await API().get(`/students/${id}`);
            setData(data);
        } catch (e) {
            console.error(e);
            navigate('/students');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    const onDownloadID = (student) => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [85, 54] // Standard ID card size
        });

        const primaryColor = '#2563eb';

        // Background & Header
        doc.setFillColor(primaryColor);
        doc.rect(0, 0, 85, 15, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("STUDENT IDENTITY CARD", 42.5, 10, { align: "center" });

        // Student Info
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.text(student.name.toUpperCase(), 35, 25);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Roll No: ${student.rollNo}`, 35, 30);
        doc.text(`Course: ${student.className || 'N/A'}`, 35, 34);
        doc.text(`Batch: ${student.batchId?.name || 'N/A'}`, 35, 38);
        doc.text(`Phone: ${student.contact || 'N/A'}`, 35, 42);

        // Footer
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 48, 85, 6, 'F');
        doc.setTextColor(100);
        doc.setFontSize(6);
        doc.text("Valid for Session 2026-27", 42.5, 52, { align: "center" });

        doc.save(`${student.name}_ID_Card.pdf`);
    };

    if (loading) return (
        <ERPLayout title="Student Profile">
            <div className="p-20 flex flex-col items-center gap-4 text-slate-400">
                <Loader2 className="spin" size={40} />
                <p className="font-medium">Loading student records...</p>
            </div>
        </ERPLayout>
    );

    if (!data) return null;

    const { student, fees } = data;
    const totalDues = fees.filter(f => !f.isDeleted && f.status !== 'paid').reduce((sum, f) => sum + (f.totalFee - (f.amountPaid || 0)), 0);

    return (
        <ERPLayout title={`Profile: ${student.name}`}>
            <div className="mb-6">
                <Link to="/students" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold transition-colors">
                    <ChevronLeft size={20} /> Back to Directory
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* --- Left Sidebar: Profile Identity --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-md border border-slate-100 shadow-sm overflow-hidden text-center p-8">
                        <div className="w-32 h-32 bg-slate-100 rounded-sm border border-slate-200 mx-auto mb-6 flex items-center justify-center text-slate-400 overflow-hidden relative group">
                            {student.profileImage ? (
                                <img src={student.profileImage.startsWith('http') ? student.profileImage : `${API_BASE_URL}${student.profileImage}`} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <UserCircle2 size={64} />
                            )}
                        </div>

                        <h1 className="text-2xl font-black text-slate-800 mb-1">{student.name}</h1>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                            <Hash size={12} className="text-blue-500" /> ROLL: {student.rollNo}
                        </div>

                        <div className={`inline-flex px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-wider mb-6 ${student.status === 'active' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                            {student.status}
                        </div>

                        <div className="space-y-3 pt-6 border-t border-slate-50">
                            <button onClick={() => onDownloadID(student)} className="w-full py-3 bg-blue-600 text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                                <DownloadCloud size={14} /> Download ID Card
                            </button>
                            <button
                                onClick={() => setIsEmailModalOpen(true)}
                                className="w-full py-3 bg-white text-blue-600 border border-blue-600 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Mail size={14} /> Send Direct Email
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-md border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Building2 size={16} className="text-blue-500" /> Enrollment Hub
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Class / Level</label>
                                <div className="text-sm font-black text-slate-700 mt-1">{student.className || 'General'}</div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Batch</label>
                                <div className="text-sm font-black text-slate-700 mt-1 flex items-center gap-2">
                                    {student.batchId?.name || 'Unassigned'}
                                    <ArrowUpRight size={14} className="text-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admission Date</label>
                                <div className="text-sm font-black text-slate-700 mt-1 flex items-center gap-2">
                                    <Calendar size={14} className="text-slate-400" />
                                    {new Date(student.admissionDate || student.joinedAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Main Content: Intelligence & Records --- */}
                <div className="lg:col-span-3 space-y-8">
                    {/* Financial Intelligence Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-md border shadow-sm border-slate-100">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-sm flex items-center justify-center mb-4">
                                <Wallet size={20} />
                            </div>
                            <div className="text-2xl font-black text-slate-800">₹{student.fees?.toLocaleString()}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Monthly Subscription</div>
                        </div>

                        <div className="bg-white p-6 rounded-md border shadow-sm border-slate-100">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-sm flex items-center justify-center mb-4">
                                <ShieldCheck size={20} />
                            </div>
                            <div className="text-2xl font-black text-slate-800">₹{student.feesPaid?.toLocaleString()}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Life-time Paid</div>
                        </div>

                        <div className="bg-white p-6 rounded-md border shadow-sm border-slate-100">
                            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-sm flex items-center justify-center mb-4">
                                <Info size={20} />
                            </div>
                            <div className="text-2xl font-black text-slate-800">₹{totalDues?.toLocaleString()}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Current Balance Due</div>
                        </div>
                    </div>

                    {/* Personal Context */}
                    <div className="bg-white rounded-md border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <User size={18} className="text-blue-500" /> Identity & Family Context
                            </h3>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</label>
                                    <div className="text-sm font-bold text-slate-700 mt-1">{student.dob ? new Date(student.dob).toLocaleDateString() : '—'}</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                                    <User size={18} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender</label>
                                    <div className="text-sm font-bold text-slate-700 mt-1">{student.gender || '—'}</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                                    <Phone size={18} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Contact</label>
                                    <div className="text-sm font-bold text-slate-700 mt-1">{student.contact || '—'}</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                                    <div className="text-sm font-bold text-slate-700 mt-1">{student.email || '—'}</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                                    <UserCircle2 size={18} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Father's Name</label>
                                    <div className="text-sm font-bold text-slate-700 mt-1">{student.fatherName || '—'}</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                                    <UserCircle2 size={18} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mother's Name</label>
                                    <div className="text-sm font-bold text-slate-700 mt-1">{student.motherName || '—'}</div>
                                </div>
                            </div>
                            <div className="md:col-span-3 flex gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-sm flex items-center justify-center text-slate-400 flex-shrink-0">
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Residence</label>
                                    <div className="text-sm font-bold text-slate-700 mt-1">{student.address || '—'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial History List */}
                    <div className="bg-white rounded-md border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <FileText size={18} className="text-blue-500" /> Comprehensive Ledger
                            </h3>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session: 2026-27</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/30">
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Cycle</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Financials</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Timeline</th>
                                        <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Settlement</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {fees.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-20 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Clock size={32} strokeWidth={1.5} />
                                                    <p className="font-medium">No financial records found in the ledger</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        fees.map(f => (
                                            <tr key={f._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="font-bold text-slate-800">{f.month}, {f.year}</div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase mt-0.5">{f.isDeleted ? 'REVOKED' : 'STANDARD ISSUE'}</div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2 group">
                                                        <div className="text-sm font-black text-slate-700">₹{f.totalFee?.toLocaleString()}</div>
                                                        <div className="text-[10px] text-slate-300 font-bold">/</div>
                                                        <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">₹{f.amountPaid?.toLocaleString() || 0}</div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="text-[10px] font-black text-blue-500 flex items-center gap-1.5 uppercase">
                                                        <Calendar size={12} className="text-slate-300" />
                                                        Due: {f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '—'}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase ${f.status === 'paid' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                        f.status === 'partial' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                        }`}>
                                                        {f.status}
                                                    </span>
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

            <NotificationModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                prefill={{ studentId: student._id }}
                onSuccess={(msg) => addToast(msg)}
            />

            {/* TOASTS */}
            <div className="toast-container" style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 9999 }}>
                {toasts.map(t => (
                    <div key={t.id} style={{
                        padding: '12px 24px', borderRadius: '4px', background: t.type === 'error' ? '#dc2626' : '#059669', color: '#fff',
                        display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 800, fontSize: '0.85rem'
                    }}>
                        {t.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
                        {t.msg}
                    </div>
                ))}
            </div>
        </ERPLayout>
    );
};

export default StudentProfilePage;
