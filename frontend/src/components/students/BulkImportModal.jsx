import React, { useRef, useState } from "react";
import {
  X,
  Loader2,
  UploadCloud,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";

const BulkImportModal = ({
  isOpen,
  onClose,
  bulkFile,
  setBulkFile,
  bulkResults,
  setBulkResults,
  saving,
  onConfirm,
  err,
  setErr,
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  const processFile = (file) => {
    if (!file) return;

    setFileName(file.name);
    setErr("");
    setBulkFile(null);
    setBulkResults(null);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          setErr("File is empty or structured incorrectly.");
          return;
        }

        setBulkFile(data);
      } catch {
        setErr("Failed to parse file. Upload valid Excel or CSV.");
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e) => processFile(e.target.files?.[0]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };


  const downloadTemplate = () => {
    const headers = [
      "NAME", "DATE OF BIRTH", "GENDER", "MOBILE NUMBER",
      "EMAIL ADDRESS", "FATHER'S NAME", "MOTHER'S NAME",
      "FULL ADDRESS", "STANDARD / COURSE", "BATCHNAME"
    ];
    const data = [
      {
        "NAME": "John Doe",
        "DATE OF BIRTH": "15-05-2010",
        "GENDER": "Male",
        "MOBILE NUMBER": "9876543210",
        "EMAIL ADDRESS": "john@example.com",
        "FATHER'S NAME": "Robert Doe",
        "MOTHER'S NAME": "Jane Doe",
        "FULL ADDRESS": "123 Main St, Springfield",
        "STANDARD / COURSE": "10th",
        "BATCHNAME": "Morning Batch A"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_Import_Template.xlsx");
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680, width: '95vw' }}>

        {/* HEADER */}
        <div style={{
          padding: '24px 32px',
          background: 'linear-gradient(135deg, var(--erp-secondary) 0%, var(--erp-primary) 100%)',
          position: 'relative',
          color: '#fff',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <UploadCloud size={100} style={{ position: 'absolute', right: -10, bottom: -20, opacity: 0.1, color: '#fff' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
            <div style={{ padding: 6, background: 'rgba(255,255,255,0.15)', borderRadius: '4px' }}>
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>BULK IMPORT STUDENTS</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8, fontWeight: 500 }}>Upload Excel or CSV file to batch register</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '4px',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: 'pointer', position: 'relative', zIndex: 1
          }}>
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '32px' }}>
          {err && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <AlertTriangle size={14} />
              {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 24, alignItems: 'stretch' }}>

            {/* LEFT SIDE: Template Info */}
            <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', padding: '20px', background: '#ecfdf5', borderRadius: '4px', border: '1px solid #d1fae5' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#065f46', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <FileText size={16} />
                Required Columns
              </div>

              <ul style={{
                listStyle: 'none', padding: 0, margin: 0,
                fontSize: '0.75rem', color: '#065f46',
                display: 'flex', flexDirection: 'column', gap: 10
              }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>• NAME *</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• MOBILE NUMBER</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• EMAIL ADDRESS</li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span>• DATE OF BIRTH <br /><i style={{ fontSize: '0.65rem', opacity: 0.7 }}>(DD-MM-YYYY)</i></span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• GENDER</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• FATHER'S NAME</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• MOTHER'S NAME</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• FULL ADDRESS</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• STANDARD / COURSE</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>• BATCHNAME</li>
              </ul>

              <button
                type="button"
                onClick={downloadTemplate}
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px',
                  background: '#fff',
                  border: '1px solid #059669',
                  color: '#059669',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <Download size={14} />
                DOWNLOAD TEMPLATE
              </button>
            </div>

            {/* RIGHT SIDE: Upload Dropzone */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: `2px dashed ${isDragging ? 'var(--erp-primary)' : bulkFile && !err ? 'var(--erp-primary)' : '#e2e8f0'}`,
                  borderRadius: '4px',
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: isDragging ? '#f0fdf4' : bulkFile && !err ? '#f0fdf4' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '280px'
                }}
              >
                <input
                  type="file"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv, .xlsx, .xls"
                />

                {bulkFile && !err ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <CheckCircle size={40} color="#059669" />
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>{fileName}</div>
                    <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase' }}>{bulkFile.length} records ready</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Click or drag a new file to replace</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: 16, background: '#f8fafc', borderRadius: '4px', color: '#64748b' }}>
                      <FileSpreadsheet size={32} />
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>DRAG & DROP FILE HERE</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Excel (.xlsx, .xls) or CSV template</div>

                    <button type="button" style={{
                      marginTop: 12, padding: '10px 24px', background: '#059669', color: '#fff',
                      borderRadius: '4px', border: 'none', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer',
                      letterSpacing: '0.05em'
                    }} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      BROWSE FILES
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, padding: '16px 20px', background: '#ecfdf5', borderRadius: '4px', border: '1px solid #d1fae5', display: 'flex', gap: 12, alignItems: 'center' }}>
            <AlertTriangle size={18} color="#059669" />
            <div style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600, lineHeight: 1.5 }}>
              All imported students will be assigned the default password <strong>student@123</strong>. Ensure headers match exactly.
            </div>
          </div>

          {bulkResults && (
            <div style={{ marginTop: 16, padding: '16px 20px', background: '#f0f9ff', borderRadius: '4px', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0369a1', marginBottom: 8, textTransform: 'uppercase' }}>IMPORT SUMMARY</div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ fontSize: '0.8rem', color: '#0369a1' }}>Total: <strong>{bulkResults.total}</strong></div>
                <div style={{ fontSize: '0.8rem', color: '#059669' }}>Success: <strong>{bulkResults.success}</strong></div>
                <div style={{ fontSize: '0.8rem', color: '#dc2626' }}>Failed: <strong>{bulkResults.failed}</strong></div>
              </div>
              {bulkResults.errors?.length > 0 && (
                <div style={{ marginTop: 12, maxHeight: '100px', overflowY: 'auto' }}>
                  {bulkResults.errors.map((err, i) => (
                    <div key={i} style={{ fontSize: '0.7rem', color: '#7f1d1d', borderTop: '1px solid #fecaca', paddingTop: 4, marginTop: 4 }}>
                      <strong>{err.name}</strong>: {err.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" onClick={onClose} disabled={saving} style={{
            padding: '10px 24px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer'
          }}>
            {bulkResults ? "EXIT / DONE" : "CANCEL"}
          </button>
          <button
            type="button"
            disabled={!bulkFile || saving || bulkResults}
            onClick={onConfirm}
            style={{
              padding: '10px 32px', background: (!bulkFile || saving || bulkResults) ? '#94a3b8' : '#059669', color: '#fff',
              borderRadius: '4px', border: 'none', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            {saving ? <><Loader2 className="spin" size={14} /> IMPORTING...</> : bulkResults ? "IMPORT SUCCESSFUL" : "CONFIRM IMPORT"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default BulkImportModal;