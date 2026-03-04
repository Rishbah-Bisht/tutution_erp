import React, { useState } from "react";
import {
    X,
    Sliders,
    Save,
    AlertTriangle,
    Loader2,
    ShieldCheck,
    Briefcase,
    Building2,
    IndianRupee,
    UserCheck,
} from "lucide-react";

const TeacherBulkConfigModal = ({ isOpen, onClose, onConfirm, selectedCount, loading, error }) => {
    const [updates, setUpdates] = useState({
        status: "",
        department: "",
        designation: "",
    });
    const [adminPassword, setAdminPassword] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUpdates((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(updates, adminPassword);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 500, width: "90%" }}>
                {/* HEADER */}
                <div
                    style={{
                        padding: "24px 32px",
                        background: "linear-gradient(135deg, var(--erp-secondary) 0%, var(--erp-primary) 100%)",
                        color: "#fff",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <Sliders
                        size={80}
                        style={{ position: "absolute", right: -10, bottom: -20, opacity: 0.1 }}
                    />
                    <div style={{ position: "relative", zIndex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900 }}>
                            FACULTY CONFIGURATION
                        </h3>
                        <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.8 }}>
                            Updating {selectedCount} selected faculty members
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            position: "absolute",
                            right: 24,
                            top: 24,
                            background: "rgba(255,255,255,0.15)",
                            border: "none",
                            borderRadius: "4px",
                            width: 32,
                            height: 32,
                            color: "#fff",
                            cursor: "pointer",
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: "32px" }}>
                    {error && (
                        <div
                            style={{
                                padding: "12px",
                                background: "#fef2f2",
                                color: "#dc2626",
                                borderRadius: "4px",
                                fontSize: "0.85rem",
                                marginBottom: 20,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                border: "1px solid #fecaca",
                            }}
                        >
                            <AlertTriangle size={14} /> {error}
                        </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b", fontStyle: "italic" }}>
                            Leave fields empty to keep existing values.
                        </p>

                        <div>
                            <label className="config-label">
                                <UserCheck size={12} /> STATUS
                            </label>
                            <select
                                name="status"
                                value={updates.status}
                                onChange={handleChange}
                                className="erp-input"
                            >
                                <option value="">No Change</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div>
                            <label className="config-label">
                                <Building2 size={12} /> DEPARTMENT
                            </label>
                            <input
                                type="text"
                                name="department"
                                placeholder="e.g. Mathematics"
                                value={updates.department}
                                onChange={handleChange}
                                className="erp-input"
                            />
                        </div>

                        <div>
                            <label className="config-label">
                                <Briefcase size={12} /> DESIGNATION
                            </label>
                            <input
                                type="text"
                                name="designation"
                                placeholder="e.g. Senior Professor"
                                value={updates.designation}
                                onChange={handleChange}
                                className="erp-input"
                            />
                        </div>

                        <div
                            style={{
                                padding: "20px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "4px",
                                marginTop: 8,
                            }}
                        >
                            <label className="config-label">
                                <ShieldCheck size={12} /> ADMIN AUTHORIZATION
                            </label>
                            <input
                                type="password"
                                required
                                placeholder="Enter Admin Password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="erp-input"
                                style={{ background: "#fff" }}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                            style={{ flex: 1 }}
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                            style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                background: "var(--erp-primary)",
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="spin" size={16} /> UPDATING...
                                </>
                            ) : (
                                <>
                                    <Save size={16} /> APPLY CHANGES
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .config-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.7rem;
                    font-weight: 900;
                    color: #475569;
                    margin-bottom: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .erp-input {
                    width: 100%;
                    padding: 10px 14px;
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                    font-size: 0.9rem;
                    outline: none;
                    transition: all 0.2s;
                }
                .erp-input:focus {
                    border-color: var(--erp-primary);
                    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
                }
                .btn-primary {
                    color: #fff;
                    border: none;
                    padding: 12px;
                    border-radius: 4px;
                    font-weight: 800;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
                .btn-secondary {
                    background: #f1f5f9;
                    color: #475569;
                    border: none;
                    padding: 12px;
                    border-radius: 4px;
                    font-weight: 800;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default TeacherBulkConfigModal;
