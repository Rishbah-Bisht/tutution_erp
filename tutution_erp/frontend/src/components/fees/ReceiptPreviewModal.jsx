import React from 'react';
import { X, Download, Printer, Loader2 } from 'lucide-react';

const ReceiptPreviewModal = ({ isOpen, onClose, blobUrl, onDownload, filename }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{
                width: '100%', maxWidth: '1000px', height: '94vh',
                background: '#f8fafc', borderRadius: '12px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                position: 'relative'
            }}>
                {/* --- TOP BAR (Inside Modal Box) --- */}
                <header style={{
                    width: '100%',
                    padding: '20px 32px',
                    background: '#0f172a',
                    position: 'relative',
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0,
                    overflow: 'hidden'
                }}>
                    <Printer size={120} style={{ position: 'absolute', right: -20, bottom: -30, opacity: 0.1, color: '#fff' }} />

                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <Printer size={24} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Document Preview</h2>
                            <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500, marginTop: 2 }}>
                                {filename || 'Receipt / Statement'}
                            </div>
                        </div>
                    </div>

                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 12 }}>
                        <button onClick={onDownload} style={{
                            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px', color: '#fff', padding: '8px 16px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: 8, fontSize: '0.75rem', fontWeight: 700
                        }}>
                            <Download size={16} /> DOWNLOAD
                        </button>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px', color: '#fff', padding: '8px 16px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: 8, fontSize: '0.75rem', fontWeight: 700
                        }}>
                            <X size={16} /> CLOSE
                        </button>
                    </div>
                </header>

                {/* Preview Area */}
                <div style={{ flex: 1, background: '#525659', position: 'relative', overflow: 'hidden' }}>
                    {!blobUrl ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <Loader2 className="spin" size={32} />
                            <p style={{ marginTop: 12 }}>Generating PDF...</p>
                        </div>
                    ) : (
                        <iframe
                            src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                            title="Receipt Preview"
                            style={{ width: '100%', height: '100%', border: 'none' }}
                        />
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 32px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '12px 24px', borderRadius: '4px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem', textTransform: 'uppercase' }}
                    >
                        Close Preview
                    </button>
                    <button
                        onClick={onDownload}
                        style={{ padding: '12px 32px', background: '#0f172a', color: '#fff', borderRadius: '4px', fontWeight: 900, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                    >
                        <Download size={16} /> Save Document
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptPreviewModal;
