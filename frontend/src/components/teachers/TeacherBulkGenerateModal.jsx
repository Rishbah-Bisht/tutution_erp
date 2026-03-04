import React, { useState } from "react";
import {
    X,
    CheckCircle2,
    Calendar,
    Loader2,
    AlertTriangle,
    Users,
    ChevronRight
} from "lucide-react";

const TeacherBulkGenerateModal = ({ isOpen, onClose, onConfirm, selectedCount, teacherName, loading, error }) => {
    const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
    const [adminPassword, setAdminPassword] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm({ monthYear }, adminPassword);
    };

    if (!isOpen) return null;

    const primaryColor = '#064e3b'; // Standard deep green for payroll actions

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 460, width: "95%" }}>
                {/* HEADER */}
                <div
                    style={{
                        padding: "24px 32px",
                        background: `linear-gradient(135deg, ${primaryColor} 0%, #065f46 100%)`,
                        color: "#fff",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <CheckCircle2
                        size={100}
                        style={{ position: "absolute", right: -10, bottom: -20, opacity: 0.1 }}
                    />
                    <div style={{ position: "relative", zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ padding: 8, background: 'rgba(255,255,255,0.15)', borderRadius: '8px' }}>
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 900, letterSpacing: '-0.01em' }}>
                                {teacherName ? `PAYROLL: ${teacherName.toUpperCase()}` : 'PAYROLL ELIGIBILITY'}
                            </h3>
                            <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.8 }}>
                                {teacherName ? `Generating salary for ${teacherName}` : `Marking ${selectedCount} faculty as eligible`}
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: "32px" }}>
                    {error && (
                        <div
                            style={{
                                padding: "12px",
                                background: "#fef2f2",
                                color: "#dc2626",
                                borderRadius: "6px",
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

                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <div>
                            <label className="config-label">
                                <Calendar size={12} /> SELECT PAYROLL MONTH
                            </label>
                            <input
                                type="month"
                                required
                                value={monthYear}
                                onChange={(e) => setMonthYear(e.target.value)}
                                className="erp-input"
                                style={{ fontSize: '1rem', padding: '12px 16px' }}
                            />
                        </div>

                        <div
                            style={{
                                padding: "20px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                            }}
                        >
                            <label className="config-label">
                                ADMIN AUTHORIZATION
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

                        <div style={{ padding: '0 4px' }}>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
                                • This will generate salary records in the Payroll Dashboard.<br />
                                • Records will be based on their fixed monthly salary.<br />
                                • Teachers already marked for this month will be skipped.
                            </p>
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
                                flex: 2,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                background: primaryColor,
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="spin" size={16} /> GENERATING...
                                </>
                            ) : (
                                <>
                                    MARK AS ELIGIBLE <ChevronRight size={16} />
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
                    font-weight: 800;
                    color: #475569;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                }
                .erp-input {
                    width: 100%;
                    padding: 10px 14px;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    outline: none;
                }
                .erp-input:focus {
                    border-color: #064e3b;
                    box-shadow: 0 0 0 3px rgba(6, 78, 59, 0.1);
                }
                .btn-primary {
                    color: #fff;
                    border: none;
                    padding: 12px;
                    border-radius: 8px;
                    font-weight: 800;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
                .btn-secondary {
                    background: #f1f5f9;
                    color: #475569;
                    border: none;
                    padding: 12px;
                    border-radius: 8px;
                    font-weight: 800;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default TeacherBulkGenerateModal;
