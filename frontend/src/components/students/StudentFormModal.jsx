import React from "react";
import { X, Loader2, AlertCircle, ShieldAlert, Plus, GraduationCap, Camera } from "lucide-react";

const StudentFormModal = ({
  isOpen,
  onClose,
  step,
  setStep,
  form,
  handleForm,
  batches,
  selectedStudent,
  saving,
  onSubmit,
  err,
}) => {
  if (!isOpen) return null;

  const currentBatch = batches.find((b) => b._id === form.batchId);
  const settings = JSON.parse(localStorage.getItem('instituteSettings') || '{}');
  const classesList = settings.classesOffered && settings.classesOffered.length > 0
    ? settings.classesOffered
    : ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  const isBatchFull =
    currentBatch &&
    currentBatch.capacity > 0 &&
    currentBatch.enrolled >= currentBatch.capacity;

  const handleSubmit = (e) => {
    if (step === 2 && isBatchFull) {
      e.preventDefault();
      return;
    }
    onSubmit(e);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be less than 5MB");
        return;
      }
      handleForm({ target: { name: 'profileImage', value: file } });
    }
  };

  // Reusable Input Style
  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #cbd5e1', // Visible border color
    borderRadius: '6px',
    background: '#fff',
    fontSize: '0.9rem',
    color: '#1e293b',
    outline: 'none',
    marginTop: '4px',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '20px'
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>

      {/* Responsive Styles */}
      <style>{`
        input:focus, select:focus, textarea:focus {
          border-color: #059669 !important;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1) !important;
        }
        @media (max-width: 640px) {
          .modal-body { padding: 20px !important; }
          .modal-hdr-p { padding: 16px 20px !important; }
          .form-grid-2 { grid-template-columns: 1fr !important; }
          .flex-mob-stack { flex-direction: column !important; }
          .photo-upload-wrap { margin-bottom: 20px !important; margin-right: 0 !important; }
        }
      `}</style>

      <div className="modal" style={{
        width: '100%', maxWidth: '900px', maxHeight: '92vh',
        background: '#f8fafc', borderRadius: '12px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        position: 'relative'
      }}>

        {/* --- TOP BAR --- */}
        <header className="modal-hdr-p" style={{
          width: '100%', padding: '24px 32px', background: '#0f172a',
          position: 'relative', color: '#fff', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
        }}>
          <GraduationCap size={120} style={{ position: 'absolute', right: -20, bottom: -30, opacity: 0.1, color: '#fff' }} className="hide-mobile" />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '8px',
              background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }} className="hide-mobile">
              <GraduationCap size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {selectedStudent ? 'Update Student' : 'Admission'}
              </h2>
              <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                {selectedStudent ? `Updating ${selectedStudent?.name}` : 'Register a new student'}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px', color: '#fff', padding: '8px 16px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontWeight: 700
          }}>
            <X size={16} /> <span className="hide-mobile">CLOSE</span>
          </button>
        </header>

        {/* --- TAB NAVIGATION --- */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fff', justifyContent: 'center' }}>
          <TabButton active={step === 1} onClick={() => setStep(1)} label="Basic Details" />
          <TabButton active={step === 2} onClick={() => setStep(2)} label="Enrollment Info" />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
            {err && <div className="alert" style={{ marginBottom: 16, color: '#dc2626', background: '#fee2e2', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={16} />{err}</div>}

            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', gap: 24 }} className="flex-mob-stack">
                  {/* Photo Upload */}
                  <div style={{ flexShrink: 0, textAlign: 'center' }} className="photo-upload-wrap">
                    <div style={{
                      width: 100, height: 100, borderRadius: '8px', border: '2px dashed #cbd5e1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9',
                      overflow: 'hidden', position: 'relative', cursor: 'pointer', margin: '0 auto'
                    }} onClick={() => document.getElementById('studentPhotoInput').click()}>
                      {form.profileImage ? (
                        <img src={URL.createObjectURL(form.profileImage)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (selectedStudent?.profileImage) ? (
                        <img src={selectedStudent.profileImage} alt="Current" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Camera size={30} color="#94a3b8" />
                      )}
                      <input type="file" id="studentPhotoInput" hidden accept="image/*" onChange={handleImageChange} />
                    </div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 8, display: 'block', fontWeight: 700, cursor: 'pointer' }} htmlFor="studentPhotoInput">UPLOAD PHOTO</label>
                  </div>

                  {/* Name & Basic Info */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>FULL NAME *</label>
                      <input name="name" value={form.name} onChange={handleForm} placeholder="John Doe" required style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', gap: 16 }} className="flex-mob-stack">
                      <div style={{ flex: 1 }}>
                        <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>DATE OF BIRTH</label>
                        <input type="date" name="dob" value={form.dob} onChange={handleForm} style={inputStyle} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>GENDER</label>
                        <select name="gender" value={form.gender} onChange={handleForm} style={inputStyle}>
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div style={{ display: 'flex', gap: 16 }} className="flex-mob-stack">
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>MOBILE NUMBER</label>
                    <input name="phone" value={form.phone} onChange={handleForm} placeholder="+91 0000000000" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>EMAIL ADDRESS</label>
                    <input type="email" name="email" value={form.email} onChange={handleForm} placeholder="student@example.com" style={inputStyle} />
                  </div>
                </div>

                {/* Parents Info */}
                <div style={{ display: 'flex', gap: 16 }} className="flex-mob-stack">
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>FATHER'S NAME</label>
                    <input type="text" name="fatherName" value={form.fatherName} onChange={handleForm} placeholder="Father's Full Name" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>MOTHER'S NAME</label>
                    <input type="text" name="motherName" value={form.motherName} onChange={handleForm} placeholder="Mother's Full Name" style={inputStyle} />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>FULL ADDRESS</label>
                  <textarea name="address" value={form.address} onChange={handleForm} placeholder="Street, City, Zip Code..." style={{ ...inputStyle, height: 80, resize: 'none' }} />
                </div>

                {/* Password Section */}
                <div>
                  <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>
                    {selectedStudent ? 'UPDATE PASSWORD (OPTIONAL)' : 'SET PASSWORD (DEFAULT: STUDENT@123)'}
                  </label>
                  <input type="password" name="password" value={form.password || ''} onChange={handleForm} placeholder="••••••••" style={inputStyle} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', gap: 16 }} className="flex-mob-stack">
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>STANDARD / COURSE</label>
                    <select name="className" value={form.className} onChange={handleForm} style={inputStyle}>
                      <option value="">Select Class</option>
                      {classesList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>ADMISSION DATE</label>
                    <input type="date" name="admissionDate" value={form.admissionDate} onChange={handleForm} style={inputStyle} />
                  </div>
                </div>

                {/* Batch Selection */}
                <div>
                  <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>ASSIGNED BATCH *</label>
                  {!form.className ? (
                    <div style={{ padding: '20px', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', marginTop: 4 }}>
                      Please select a class first to view available batches
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 8 }}>
                      {batches
                        .filter(b => String(b.course || "").trim().toLowerCase() === String(form.className).trim().toLowerCase())
                        .map((b) => {
                          const isFull = b.capacity > 0 && b.enrolled >= b.capacity;
                          const isSelected = form.batchId === b._id;
                          return (
                            <div
                              key={b._id}
                              onClick={() => !isFull && handleForm({ target: { name: 'batchId', value: b._id } })}
                              style={{
                                padding: '12px', borderRadius: '8px', border: isSelected ? '2px solid #059669' : '1px solid #cbd5e1',
                                background: isSelected ? '#ecfdf5' : isFull ? '#f1f5f9' : '#fff',
                                cursor: isFull ? 'not-allowed' : 'pointer', transition: '0.2s', position: 'relative'
                              }}
                            >
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#065f46' : '#1e293b' }}>{b.name}</div>
                              <div style={{ fontSize: '0.75rem', color: isFull ? '#dc2626' : '#64748b', marginTop: 4 }}>{b.enrolled}/{b.capacity || "∞"} Seats</div>
                              {isSelected && <div style={{ position: 'absolute', top: -6, right: -6, background: '#059669', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>✓</div>}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Fees and Status */}
                <div style={{ display: 'flex', gap: 16 }} className="flex-mob-stack">
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>MONTHLY FEE (₹)</label>
                    <input type="number" name="fees" value={form.fees} onChange={handleForm} readOnly={!!form.batchId} style={{ ...inputStyle, background: form.batchId ? '#f1f5f9' : '#fff' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>REGISTRATION FEE (₹)</label>
                    <input type="number" name="registrationFee" value={form.registrationFee} onChange={handleForm} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16 }} className="flex-mob-stack">
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>ACADEMIC SESSION</label>
                    <input type="text" name="session" value={form.session} onChange={handleForm} placeholder="2026-2027" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>STATUS</label>
                    <select name="status" value={form.status} onChange={handleForm} style={inputStyle}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>ENROLLMENT NOTES</label>
                  <textarea name="notes" value={form.notes} onChange={handleForm} rows={2} style={{ ...inputStyle, height: 60, resize: 'none' }} />
                </div>
              </div>
            )}
          </div>

          {/* --- FOOTER --- */}
          <div className="modal-footer" style={{
            borderTop: '1px solid #e2e8f0',
            padding: '20px 32px',
            display: 'flex',
            background: '#fff',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px'
          }}>
            {/* Inline Hover Styles */}
            <style>{`
    .btn-secondary {
      transition: all 0.2s ease;
    }
    .btn-secondary:hover {
      background: #f1f5f9 !important;
      border-color: #cbd5e1 !important;
      color: #1e293b !important;
    }
    .btn-primary-dark {
      transition: all 0.2s ease;
      box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.2);
    }
    .btn-primary-dark:hover {
      background: #1e293b !important;
      transform: translateY(-1px);
      box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.3);
    }
    .btn-success {
      transition: all 0.2s ease;
      box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);
    }
    .btn-success:hover:not(:disabled) {
      background: #047857 !important;
      transform: translateY(-1px);
      box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.3);
    }
    .btn-success:active:not(:disabled) {
      transform: translateY(0);
    }
    @media (max-width: 640px) {
      .modal-footer { padding: 16px 20px !important; }
    }
  `}</style>

            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              {/* Back / Cancel Button */}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => step === 2 ? setStep(1) : onClose()}
                style={{
                  padding: '0 28px',
                  height: 48,
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#64748b',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  letterSpacing: '0.025em'
                }}
              >
                {step === 2 ? "BACK" : "CANCEL"}
              </button>

              <div style={{ flex: 1 }}>
                {step === 1 ? (
                  /* Continue Button (Dark Theme) */
                  <button
                    type="button"
                    className="btn-primary-dark"
                    onClick={() => setStep(2)}
                    style={{
                      width: '100%',
                      height: 48,
                      background: '#0f172a',
                      color: '#fff',
                      borderRadius: '10px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      fontSize: '0.9rem',
                      letterSpacing: '0.025em'
                    }}
                  >
                    CONTINUE TO ENROLLMENT <Plus size={20} />
                  </button>
                ) : (
                  /* Submit Button (Success Theme) */
                  <button
                    type="submit"
                    className="btn-success"
                    disabled={saving || isBatchFull}
                    style={{
                      width: '100%',
                      height: 48,
                      background: isBatchFull ? '#94a3b8' : '#0f172a',
                      color: '#fff',
                      borderRadius: '10px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: (saving || isBatchFull) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      fontSize: '0.9rem',
                      letterSpacing: '0.025em'
                    }}
                  >
                    {saving ? (
                      <><Loader2 size={20} className="animate-spin" /> SAVING DATA...</>
                    ) : selectedStudent ? (
                      <><ShieldAlert size={20} /> UPDATE STUDENT PROFILE</>
                    ) : (
                      <><Plus size={20} /> COMPLETE ADMISSION</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Tab Button Component ---
const TabButton = ({ active, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '16px 32px', border: 'none', background: 'none', cursor: 'pointer',
      fontSize: '0.75rem', fontWeight: 800, color: active ? '#059669' : '#94a3b8',
      borderBottom: `3px solid ${active ? '#0f172a' : 'transparent'}`,
      transition: '0.3s ease', textTransform: 'uppercase', letterSpacing: '0.05em'
    }}
  >
    {label}
  </button>
);

export default StudentFormModal;