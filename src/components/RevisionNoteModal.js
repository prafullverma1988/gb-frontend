// ── REVISION / REJECTION NOTE MODAL ─────────────────────────────────
// Compulsory note + optional file attachments (marked-up images / PDFs)
// for client revision or rejection feedback. Replaces window.prompt so
// CRM/Design team can give richer feedback to the drawing team.
//
// Usage:
//   <RevisionNoteModal
//     mode="Revision" | "Rejected"
//     drawingTitle="Plan for ABC"
//     onCancel={()=>...}
//     onSubmit={async({note, attachments}) => {...}}/>

import { useState, useRef } from "react";
import uploadManager from "../utils/uploadManager";

const T = {
  surface:"#FFFFFF", surfaceB:"#F8F9FB",
  t1:"#111827", t2:"#374151", t3:"#6B7280", t4:"#9CA3AF",
  b1:"#E5E7EB", b2:"#D1D5DB",
  blu:"#2563EB", bluL:"#EFF6FF", bluM:"#BFDBFE",
  grn:"#059669", grnL:"#ECFDF5", grnM:"#A7F3D0",
  amb:"#D97706", ambL:"#FFFBEB", ambM:"#FDE68A",
  red:"#DC2626", redL:"#FEF2F2", redM:"#FECACA",
};

export default function RevisionNoteModal({ mode = "Revision", drawingTitle, onCancel, onSubmit }) {
  const [note, setNote] = useState("");
  const [attachments, setAttachments] = useState([]); // [{url, name, uploading?}]
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const submittingRef = useRef(false);
  const isRevision = mode === "Revision";
  const accentC = isRevision ? T.amb : T.red;
  const accentBg = isRevision ? T.ambL : T.redL;
  const accentBrd = isRevision ? T.ambM : T.redM;

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    // Initialize placeholders + start uploads
    for (const f of files) {
      const placeholder = { name: f.name, uploading: true, url: null };
      setAttachments(prev => [...prev, placeholder]);
      try {
        const url = await uploadManager.upload(f, "drawings");
        setAttachments(prev => prev.map(a => a.name === f.name && a.uploading ? { name: f.name, url, uploading: false } : a));
      } catch (e) {
        setAttachments(prev => prev.filter(a => !(a.name === f.name && a.uploading)));
        setErr(`Upload failed for ${f.name}: ${e.message}`);
      }
    }
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (submittingRef.current) return;
    if (!note.trim()) { setErr("Note is required"); return; }
    if (attachments.some(a => a.uploading)) { setErr("Wait for uploads to finish"); return; }
    submittingRef.current = true;
    setSubmitting(true);
    setErr("");
    try {
      await onSubmit({ note: note.trim(), attachments: attachments.filter(a => a.url).map(a => a.url) });
    } catch (e) {
      setErr(e?.message || "Submit failed");
    }
    submittingRef.current = false;
    setSubmitting(false);
  };

  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 700 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        background: T.surface, borderRadius: 12, width: 560, maxWidth: "92vw", maxHeight: "90vh",
        display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        zIndex: 701, fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", background: accentC, color: "white", borderTopLeftRadius: 12, borderTopRightRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {isRevision ? "↻ Request Revision" : "✗ Reject Drawing"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
              {drawingTitle || "Drawing"}
            </div>
          </div>
          <button onClick={onCancel} style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, color: "white", fontSize: 16, width: 28, height: 28, cursor: "pointer" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
          <div style={{ background: accentBg, border: `1px solid ${accentBrd}`, borderRadius: 7, padding: "8px 11px", marginBottom: 12, fontSize: 11.5, color: accentC, lineHeight: 1.4 }}>
            {isRevision
              ? "📝 Design team ko clearly batao kya badalna hai. Note compulsory hai. Marked-up image ya PDF attach kar sakte ho."
              : "❌ Drawing reject kar rahe ho — clearly reason batao. Note compulsory hai."}
          </div>

          {/* Note */}
          <label style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", display: "block", marginBottom: 5 }}>
            {isRevision ? "Revision Note" : "Rejection Reason"} <span style={{ color: T.red }}>*</span>
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={5}
            placeholder={isRevision
              ? "e.g. Master bedroom 12x14 chahiye, parapet height 4ft, kitchen aage karo..."
              : "e.g. Plot ka shape match nahi kar raha — re-do kar do"}
            style={{ width: "100%", padding: "10px 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5 }} />

          {/* Attachments */}
          <label style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", display: "block", marginTop: 12, marginBottom: 5 }}>
            Attach Files (optional) — marked-up images / PDFs
          </label>
          <label style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "12px", border: `1.5px dashed ${T.b2}`, borderRadius: 7, cursor: "pointer",
            background: T.surfaceB, color: T.t3, fontSize: 12, fontWeight: 600,
          }}>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple style={{ display: "none" }}
              onChange={e => handleFiles(e.target.files)} />
            📎 Click to add files (PDF / JPG / PNG)
          </label>
          {attachments.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {attachments.map((a, i) => {
                const isImg = a.url && /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(a.url);
                return (
                  <div key={i} style={{ position: "relative", padding: "5px 9px 5px 5px", borderRadius: 6, background: T.surface, border: `1px solid ${a.uploading ? T.bluM : T.b1}`, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {isImg ? (
                      <img src={a.url} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 16 }}>📄</span>
                    )}
                    <span style={{ fontSize: 11, color: T.t2, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                    {a.uploading
                      ? <span style={{ fontSize: 10, color: T.blu }}>uploading…</span>
                      : <button onClick={() => removeAttachment(i)}
                          style={{ background: "none", border: "none", color: T.t4, fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>}
                  </div>
                );
              })}
            </div>
          )}

          {err && <div style={{ marginTop: 10, padding: "6px 10px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 6, fontSize: 11.5, color: T.red }}>{err}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: "11px 18px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", gap: 8 }}>
          <button onClick={onCancel} disabled={submitting}
            style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}`, fontSize: 12.5, fontWeight: 600, color: T.t3, cursor: submitting ? "not-allowed" : "pointer" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={submitting || !note.trim()}
            style={{ flex: 2, padding: "9px", borderRadius: 7, background: (submitting || !note.trim()) ? T.b1 : accentC, border: "none", color: "white", fontSize: 12.5, fontWeight: 700, cursor: (submitting || !note.trim()) ? "not-allowed" : "pointer" }}>
            {submitting ? "Submitting…" : isRevision ? "↻ Send Revision Request" : "✗ Submit Rejection"}
          </button>
        </div>
      </div>
    </>
  );
}
