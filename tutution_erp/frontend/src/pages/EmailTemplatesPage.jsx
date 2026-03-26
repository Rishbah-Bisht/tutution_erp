import React, { useState, useEffect } from 'react';
import { Mail, Save, Info, AlertCircle, CheckCircle2, Layout, Variable } from 'lucide-react';
import { fetchTemplates, updateTemplate } from '../api/templateApi';
import { toast } from 'react-hot-toast';
import ERPLayout from '../components/ERPLayout';

const EmailTemplatesPage = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const res = await fetchTemplates();
            setTemplates(res.data);
            if (res.data.length > 0) {
                setEditingTemplate(res.data[0]);
            }
        } catch (error) {
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingTemplate) return;
        setSaving(true);
        try {
            await updateTemplate(editingTemplate._id, {
                subject: editingTemplate.subject,
                body: editingTemplate.body,
                isActive: editingTemplate.isActive
            });
            toast.success('Template updated successfully');
            loadTemplates();
        } catch (error) {
            toast.error('Failed to update template');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <ERPLayout title="Email Templates">
            <div className="p-6 max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
                        <p className="text-gray-500 mt-2">Customize automatic notifications sent to students</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar: Template List */}
                    <div className="lg:col-span-1 border-r border-gray-200">
                        <div className="space-y-2 pr-4">
                            {templates.map((tpl) => (
                                <button
                                    key={tpl._id}
                                    onClick={() => setEditingTemplate(tpl)}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${editingTemplate?._id === tpl._id
                                        ? 'bg-indigo-50 border-l-4 border-indigo-600 text-indigo-700 shadow-sm'
                                        : 'hover:bg-gray-50 text-gray-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-4 h-4" />
                                        <span className="font-medium text-sm">{tpl.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content: Editor */}
                    <div className="lg:col-span-3">
                        {editingTemplate ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Layout className="w-5 h-5 text-indigo-600" />
                                        <h2 className="text-lg font-semibold text-gray-800">Edit Template: {editingTemplate.name}</h2>
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                                    >
                                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Save className="w-4 h-4" />}
                                        Save Changes
                                    </button>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Subject line */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject</label>
                                        <input
                                            type="text"
                                            value={editingTemplate.subject}
                                            onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-gray-800"
                                            placeholder="Enter email subject..."
                                        />
                                    </div>

                                    {/* Body */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Message Body</label>
                                        <textarea
                                            rows={8}
                                            value={editingTemplate.body}
                                            onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm leading-relaxed"
                                            placeholder="Customize your message here..."
                                        />
                                    </div>

                                    {/* Placeholders info */}
                                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Variable className="w-4 h-4 text-indigo-600" />
                                            <h3 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider">Available Placeholders</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {editingTemplate.placeholders.map((placeholder) => (
                                                <code
                                                    key={placeholder}
                                                    className="px-2 py-1 bg-white border border-indigo-200 rounded text-indigo-700 text-xs font-bold shadow-sm"
                                                >
                                                    {`{{${placeholder}}}`}
                                                </code>
                                            ))}
                                        </div>
                                        <p className="text-indigo-600 text-xs mt-3 flex items-center gap-1.5 font-medium">
                                            <Info className="w-3 h-3" />
                                            Placeholders will be automatically replaced with actual data when the email is sent.
                                        </p>
                                    </div>

                                    {/* Toggle */}
                                    <div className="flex items-center justify-between py-4 border-t border-gray-100">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-700">Template Status</span>
                                            <span className="text-xs text-gray-500 mt-0.5">When disabled, system falls back to default notification text</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={editingTemplate.isActive}
                                                onChange={(e) => setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-xl border border-dashed border-gray-200 p-12">
                                <Mail className="w-12 h-12 text-gray-300 mb-4" />
                                <p className="text-gray-500 font-medium">Select a template from the left to start editing</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ERPLayout>
    );
};

export default EmailTemplatesPage;
