import React, { useEffect, useState, useMemo } from 'react';
import { BookOpen, Loader2, Save, Plus, X } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import { getAllBatches, updateBatchSubjects } from '../api/batchApi';
import { getSubjects, createSubject } from '../api/subjectApi';

const fieldClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400';

const SubjectsPage = () => {
    const [batches, setBatches] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState('');

    // Assigned subjects for the currently selected batch
    const [assignedSubjectIds, setAssignedSubjectIds] = useState(new Set());

    // New Subject Form
    const [newSubject, setNewSubject] = useState({ name: '', code: '', description: '' });

    const [loading, setLoading] = useState({ page: true, save: false, create: false });
    const [flash, setFlash] = useState(null);

    const pushFlash = (type, text) => {
        setFlash({ type, text });
        window.clearTimeout(pushFlash.timer);
        pushFlash.timer = window.setTimeout(() => setFlash(null), 3500);
    };

    const loadData = async () => {
        try {
            setLoading(prev => ({ ...prev, page: true }));
            const [batchesRes, subjectsRes] = await Promise.all([
                getAllBatches(),
                getSubjects({ activeOnly: true })
            ]);
            setBatches(batchesRes.data.batches);
            setAllSubjects(subjectsRes.data.subjects);
        } catch (error) {
            pushFlash('error', 'Failed to load data.');
        } finally {
            setLoading(prev => ({ ...prev, page: false }));
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const selectedBatch = useMemo(() => batches.find(b => b._id === selectedBatchId) || null, [batches, selectedBatchId]);

    // When a batch is selected, prepopulate its assigned subjects
    useEffect(() => {
        if (selectedBatch) {
            const initialIds = new Set(selectedBatch.subjectIds?.map(id => String(id)) || []);
            setAssignedSubjectIds(initialIds);
        } else {
            setAssignedSubjectIds(new Set());
        }
    }, [selectedBatch]);

    const handleToggleSubject = (subjectId) => {
        setAssignedSubjectIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subjectId)) {
                newSet.delete(subjectId);
            } else {
                newSet.add(subjectId);
            }
            return newSet;
        });
    };

    const handleSaveAssignments = async () => {
        if (!selectedBatchId) return;

        try {
            setLoading(prev => ({ ...prev, save: true }));

            // The backend expects array of IDs and array of Names
            const subjectIdsArray = Array.from(assignedSubjectIds);
            const subjectsArray = allSubjects
                .filter(s => subjectIdsArray.includes(String(s._id)))
                .map(s => s.name);

            await updateBatchSubjects(selectedBatchId, subjectIdsArray, subjectsArray);

            pushFlash('success', 'Batch subjects mapped successfully.');
            // Refresh batch data to reflect changes
            const res = await getAllBatches();
            setBatches(res.data.batches);

        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to map subjects.');
        } finally {
            setLoading(prev => ({ ...prev, save: false }));
        }
    };

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        try {
            setLoading(prev => ({ ...prev, create: true }));
            const res = await createSubject(newSubject);

            pushFlash('success', 'Subject created successfully.');

            // Add to list and select it automatically for the current batch
            const createdSubject = res.data.subject;
            setAllSubjects(prev => [...prev, createdSubject]);

            if (selectedBatchId) {
                setAssignedSubjectIds(prev => new Set([...prev, String(createdSubject._id)]));
            }

            setNewSubject({ name: '', code: '', description: '' });
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to create subject.');
        } finally {
            setLoading(prev => ({ ...prev, create: false }));
        }
    };


    return (
        <ERPLayout title="Subjects Management">
            <div className="space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Curriculum Setup</p>
                        <h1 className="mt-2 text-3xl font-black text-slate-900">Manage Subjects</h1>
                        <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
                            Create organizational subjects and map them to their corresponding specific classes/batches.
                        </p>
                    </div>
                </div>

                {flash && (
                    <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${flash.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}>
                        {flash.text}
                    </div>
                )}

                {loading.page ? (
                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* LEFT COLUMN: Map Subjects to Batch */}
                        <div className="xl:col-span-2 space-y-6">
                            <section className="card border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-xl font-black text-slate-900 mb-4">Batch Subject Mapping</h2>

                                <div className="mb-6">
                                    <label className="mb-1.5 block text-sm font-bold text-slate-700">Select Batch To Configure</label>
                                    <select
                                        className={fieldClass}
                                        value={selectedBatchId}
                                        onChange={(e) => setSelectedBatchId(e.target.value)}
                                    >
                                        <option value="">-- Choose a Batch --</option>
                                        {batches.map(b => (
                                            <option key={b._id} value={b._id}>{b.name} ({b.course || 'No Course'})</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedBatchId ? (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-bold text-slate-800">Available Subjects</h3>
                                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                                {assignedSubjectIds.size} Selected
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 max-h-[400px] overflow-y-auto p-1">
                                            {allSubjects.map(subject => {
                                                const isSelected = assignedSubjectIds.has(String(subject._id));
                                                return (
                                                    <div
                                                        key={subject._id}
                                                        onClick={() => handleToggleSubject(String(subject._id))}
                                                        className={`cursor-pointer border rounded-lg p-3 transition-all duration-200 ${isSelected
                                                                ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div className="font-bold text-slate-800 text-sm">{subject.name}</div>
                                                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                                                                {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                            </div>
                                                        </div>
                                                        <div className="mt-1 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                                            Code: <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">{subject.code || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {allSubjects.length === 0 && (
                                                <div className="col-span-full py-8 text-center text-sm font-medium text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                                                    No subjects available in the system yet.
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-5 border-t border-slate-100 flex justify-end">
                                            <button
                                                className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 px-8"
                                                onClick={handleSaveAssignments}
                                                disabled={loading.save}
                                            >
                                                {loading.save ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                Save Mappings For Batch
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 border-2 border-dashed border-slate-200 rounded-lg text-center">
                                        <BookOpen className="mx-auto text-slate-300 mb-3" size={32} />
                                        <p className="text-sm font-medium text-slate-500">Please select a batch above to manage its subjects.</p>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* RIGHT COLUMN: Create New Subject */}
                        <div className="space-y-6">
                            <section className="card border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                                    <Plus size={18} className="text-indigo-500" />
                                    Create New Subject
                                </h2>
                                <p className="text-sm font-medium text-slate-500 mb-5">
                                    Add a new subject to the global list. If a batch is currently selected, it will be automatically assigned to it.
                                </p>

                                <form onSubmit={handleCreateSubject} className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-700">Subject Name <span className="text-rose-500">*</span></label>
                                        <input
                                            className={fieldClass}
                                            placeholder="e.g. Advanced Biology"
                                            value={newSubject.name}
                                            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-700">Subject Code</label>
                                        <input
                                            className={fieldClass}
                                            placeholder="e.g. BIO101"
                                            value={newSubject.code}
                                            onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                                        />
                                        <p className="mt-1 text-[11px] font-medium text-slate-400">Leave blank to auto-generate from name.</p>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-700">Description</label>
                                        <textarea
                                            className={`${fieldClass} min-h-[80px] text-sm`}
                                            placeholder="Optional description..."
                                            value={newSubject.description}
                                            onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-emerald w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                        disabled={loading.create || !newSubject.name}
                                    >
                                        {loading.create ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Create Subject
                                    </button>
                                </form>
                            </section>
                        </div>

                    </div>
                )}
            </div>
        </ERPLayout>
    );
};

export default SubjectsPage;
