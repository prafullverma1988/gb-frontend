// ── LEAD DESIGN DRAWER ──────────────────────────────────────────────
// Opens from a CRM lead card. Shows linked design requests + drawings for
// this lead, lets user request new designs with reference photos, and
// share approved drawings with the client (WhatsApp / public link).
//
// Two modes (auto-toggle): "list" (default) | "form" (new request)
//
// Usage:
//   <LeadDesignDrawer lead={lead} onClose={()=>setLead(null)} onShareClick={(d)=>setShareTarget(d)}/>

import { useState, useEffect, useCallback } from "react";
import api from "../config/api";
import SearchSelect from "./SearchSelect";
import { Credit, fmtTimeAgo } from "./Credit";
import uploadManager from "../utils/uploadManager";

const T = {
  surface: "#FFFFFF",
  surfaceB: "#F8F9FB",
  t1: "#111827",
  t2: "#374151",
  t3: "#6B7280",
  t4: "#9CA3AF",
  b1: "#E5E7EB",
  b2: "#D1D5DB",
  blu: "#2563EB",
  bluL: "#EFF6FF",
  bluM: "#BFDBFE",
  grn: "#059669",
  grnL: "#ECFDF5",
  grnM: "#A7F3D0",
  amb: "#D97706",
  ambL: "#FFFBEB",
  ambM: "#FDE68A",
  red: "#DC2626",
  redL: "#FEF2F2",
  redM: "#FECACA",
  pur: "#7C3AED",
  purL: "#F5F3FF",
  purM: "#DDD6FE",
};

const CATEGORIES = ["Architectural", "Structural", "Electrical", "Plumbing", "Interior", "Landscape", "MEP"];
const DRAWING_TYPES = ["2D", "3D", "Floor Plan", "Elevation", "Section", "Detail", "Site Plan"];
const PRIORITIES = [
  { id: "Low",    c: T.t3,  bg: T.surfaceB, brd: T.b1 },
  { id: "Normal", c: T.blu, bg: T.bluL,     brd: T.bluM },
  { id: "High",   c: T.amb, bg: T.ambL,     brd: T.ambM },
  { id: "Urgent", c: T.red, bg: T.redL,     brd: T.redM },
];

const STATUS_META = {
  Pending:     { label: "PENDING",     c: T.amb, bg: T.ambL, brd: T.ambM },
  "In Progress": { label: "IN PROGRESS", c: T.blu, bg: T.bluL, brd: T.bluM },
  Uploaded:    { label: "UPLOADED",    c: T.grn, bg: T.grnL, brd: T.grnM },
  Rejected:    { label: "REJECTED",    c: T.red, bg: T.redL, brd: T.redM },
};

export default function LeadDesignDrawer({ lead, onClose, onShareClick }) {
  const open = !!lead;
  const [mode, setMode] = useState("list");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Architectural");
  const [drawingType, setDrawingType] = useState("3D");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [refImages, setRefImages] = useState([]); // array of {url, name, uploading?}
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const loadRequests = useCallback(async () => {
    if (!lead?.id) return;
    setLoading(true);
    try {
      const r = await api.get(`/design/leads/${lead.id}/design-requests`);
      if (r.success && Array.isArray(r.data)) setRequests(r.data);
    } catch (e) { /* graceful */ }
    setLoading(false);
  }, [lead?.id]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMode("list");
      setTitle(lead?.name ? `Plan for ${lead.name}` : "");
      setCategory("Architectural");
      setDrawingType("3D");
      setDescription("");
      setPriority("Normal");
      setRefImages([]);
      setErr("");
      loadRequests();
    }
  }, [open, lead?.id, lead?.name, loadRequests]);

  const handleAddPhoto = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const tempId = Date.now() + Math.random();
      // Add placeholder entry
      setRefImages(prev => [...prev, { tempId, name: file.name, url: null, uploading: true }]);
      uploadManager.add({
        file,
        folder: "gb_buildcon/lead-design-refs",
        label: `Reference: ${file.name}`,
        onDone: (url) => {
          setRefImages(prev => prev.map(r => r.tempId === tempId ? { ...r, url, uploading: false } : r));
        },
        onError: () => {
          setRefImages(prev => prev.filter(r => r.tempId !== tempId));
          if (window.toast) window.toast.error(`Failed to upload ${file.name}`);
        },
      });
    });
    e.target.value = ""; // reset input so same file can be re-selected
  };

  const removeRefImage = (tempId) => {
    setRefImages(prev => prev.filter(r => r.tempId !== tempId));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setErr("Title is required"); return; }
    const stillUploading = refImages.some(r => r.uploading);
    if (stillUploading) { setErr("Wait for photos to finish uploading"); return; }
    setSaving(true);
    setErr("");
    try {
      const res = await api.post("/design/requests", {
        lead_id: lead.id,
        title: title.trim(),
        category,
        drawing_type: drawingType,
        description: description.trim() || null,
        priority,
        requested_by: lead.assignedTo || "CRM",
        reference_images: refImages.filter(r => r.url).map(r => ({ url: r.url, name: r.name })),
      });
      if (res?.success === false) {
        setErr(res.message || "Save failed");
        setSaving(false);
        return;
      }
      if (window.toast) window.toast.success("Design request raised");
      setMode("list");
      loadRequests();
    } catch (e) {
      setErr(e?.message || "Network error");
    }
    setSaving(false);
  };

  if (!open) return null;

  const drawingsCount = requests.filter(r => r.drawing_id).length;
  const pendingCount = requests.filter(r => !r.drawing_id && r.status !== "Rejected").length;

  return (
    <>
      <style>{`@keyframes gbLDSlide{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: 580, maxWidth: "95vw",
        background: T.surface, boxShadow: "-8px 0 30px rgba(0,0,0,0.18)", zIndex: 201,
        display: "flex", flexDirection: "column", animation: "gbLDSlide .25s ease-out",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: "13px 16px", background: "#0D1B2A", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            {mode === "form" && (
              <button onClick={() => setMode("list")} title="Back to list"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", color: "rgba(255,255,255,0.7)", padding: "5px 9px", borderRadius: 6, fontSize: 11, fontFamily: "inherit", flexShrink: 0 }}>
                ← Back
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
                <span>🎨</span>
                <span>{mode === "form" ? "New Design Request" : "Design Requests"}</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Lead: {lead?.name}
                {mode === "list" && requests.length > 0 && ` · ${drawingsCount} drawing${drawingsCount === 1 ? "" : "s"}, ${pendingCount} pending`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {mode === "list" && (
              <button onClick={() => setMode("form")}
                style={{ padding: "6px 12px", borderRadius: 6, background: T.blu, border: "none", color: "white", fontSize: 11.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                Request Design
              </button>
            )}
            <button onClick={onClose} title="Close"
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: 6, borderRadius: 6, display: "flex" }}
              onMouseEnter={el => el.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              onMouseLeave={el => el.currentTarget.style.background = "none"}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* ─── LIST MODE ─────────────────────────────────────────────── */}
        {mode === "list" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
            {loading ? (
              <div style={{ padding: "32px", textAlign: "center", color: T.t4, fontSize: 12 }}>Loading...</div>
            ) : requests.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", border: `1.5px dashed ${T.b2}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.t4, fontSize: 24 }}>🎨</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}>No design requests yet</div>
                <div style={{ fontSize: 11.5, color: T.t3, maxWidth: 320, lineHeight: 1.5 }}>
                  Click <b>+ Request Design</b> to ask for a building plan or 3D view that you can share with this client.
                </div>
              </div>
            ) : requests.map(r => {
              const sm = STATUS_META[r.status] || STATUS_META.Pending;
              const hasDrawing = !!r.drawing_id;
              const refs = (() => {
                if (!r.reference_images) return [];
                if (Array.isArray(r.reference_images)) return r.reference_images;
                try { return JSON.parse(r.reference_images); } catch { return []; }
              })();
              return (
                <div key={r.id} style={{
                  background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 9,
                  marginBottom: 10, padding: "12px 14px",
                  borderLeft: `3px solid ${hasDrawing ? T.grn : sm.c}`,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginBottom: 2 }}>{r.title}</div>
                      <div style={{ fontSize: 10.5, color: T.t4 }}>
                        {r.category} · {r.drawing_type || "—"}
                        {r.priority && r.priority !== "Normal" && ` · ${r.priority} priority`}
                      </div>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: sm.bg, color: sm.c, border: `1px solid ${sm.brd}`, letterSpacing: ".4px", flexShrink: 0 }}>
                      {sm.label}
                    </span>
                  </div>

                  {r.description && (
                    <div style={{ fontSize: 11.5, color: T.t2, lineHeight: 1.5, marginBottom: 8, padding: "6px 9px", background: T.surfaceB, borderRadius: 5 }}>
                      {r.description}
                    </div>
                  )}

                  {/* Reference images */}
                  {refs.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      {refs.map((img, i) => (
                        <a key={i} href={img.url} target="_blank" rel="noreferrer"
                          style={{ width: 60, height: 60, borderRadius: 6, background: `url(${img.url}) center/cover`, border: `1px solid ${T.b1}`, cursor: "pointer", display: "block" }} />
                      ))}
                    </div>
                  )}

                  {/* Drawing if uploaded */}
                  {hasDrawing && (
                    <div style={{ background: T.grnL, border: `1px solid ${T.grnM}`, borderRadius: 7, padding: "9px 11px", display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.grn} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.grn, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.drawing_title || "Drawing"}</div>
                        <div style={{ fontSize: 10.5, color: T.t3 }}>{r.current_version || "v1"} · {r.drawing_size || ""} · {fmtTimeAgo(r.drawing_created_at)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                        {r.drawing_url && (
                          <a href={r.drawing_url} target="_blank" rel="noreferrer"
                            style={{ padding: "5px 10px", borderRadius: 5, background: T.surface, border: `1px solid ${T.b1}`, color: T.blu, fontSize: 10.5, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            👁 View
                          </a>
                        )}
                        <button onClick={() => onShareClick && onShareClick({ ...r, lead_id: lead.id, lead_name: lead.name })}
                          style={{ padding: "5px 10px", borderRadius: 5, background: T.grn, color: "white", border: "none", fontSize: 10.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                          📤 Share
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Audit */}
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", paddingTop: 6, borderTop: `1px dashed ${T.b1}` }}>
                    {(r.requested_by) && <Credit label="Requested by" name={r.requested_by} time={r.created_at} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── FORM MODE ─────────────────────────────────────────────── */}
        {mode === "form" && (<>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. 3D View Front · Master Plan"
                style={inp} onFocus={e => e.target.style.borderColor = T.blu} onBlur={e => e.target.style.borderColor = T.b1} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Category</label>
                <SearchSelect value={category} options={CATEGORIES} onChange={setCategory} placeholder="Category..." />
              </div>
              <div>
                <label style={lbl}>Type</label>
                <SearchSelect value={drawingType} options={DRAWING_TYPES} onChange={setDrawingType} placeholder="Type..." />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Description / Requirements</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Describe what's needed — area, style, key requirements..."
                style={{ ...inp, padding: "9px 11px", height: "auto", resize: "vertical", lineHeight: 1.5 }}
                onFocus={e => e.target.style.borderColor = T.blu} onBlur={e => e.target.style.borderColor = T.b1} />
            </div>

            {/* Reference photos */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Reference Photos {refImages.length > 0 && `(${refImages.length})`}</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {refImages.map(img => (
                  <div key={img.tempId} style={{ position: "relative", width: 72, height: 72, borderRadius: 7, border: `1px solid ${T.b1}`, overflow: "hidden", background: T.surfaceB }}>
                    {img.uploading ? (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: T.t4, fontSize: 10, flexDirection: "column", gap: 2 }}>
                        <div style={{ width: 16, height: 16, border: `2px solid ${T.b1}`, borderTopColor: T.blu, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                        <span style={{ fontSize: 9 }}>Uploading</span>
                      </div>
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: `url(${img.url}) center/cover` }} />
                    )}
                    <button onClick={() => removeRefImage(img.tempId)}
                      style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontSize: 11 }}>×</button>
                  </div>
                ))}
                <label style={{
                  width: 72, height: 72, borderRadius: 7, border: `1.5px dashed ${T.b2}`,
                  background: T.surfaceB, cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 3, color: T.t3, fontSize: 10,
                  fontWeight: 600, transition: "all .12s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.blu; e.currentTarget.style.color = T.blu; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.b2; e.currentTarget.style.color = T.t3; }}>
                  <input type="file" accept="image/*" multiple onChange={handleAddPhoto} style={{ display: "none" }} />
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Add
                </label>
              </div>
              <div style={{ fontSize: 10.5, color: T.t4, marginTop: 5 }}>Upload reference images, sketches, or inspiration photos to help the designer.</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Priority</label>
              <div style={{ display: "flex", gap: 4, padding: 2, background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 7 }}>
                {PRIORITIES.map(p => {
                  const active = priority === p.id;
                  return (
                    <button key={p.id} onClick={() => setPriority(p.id)}
                      style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: "none", background: active ? p.c : "transparent", color: active ? "#fff" : p.c, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}>
                      {p.id}
                    </button>
                  );
                })}
              </div>
            </div>

            {err && (
              <div style={{ padding: "8px 11px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 6, color: T.red, fontSize: 12, fontWeight: 500 }}>
                {err}
              </div>
            )}
          </div>

          <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0, background: T.surfaceB }}>
            <button onClick={() => setMode("list")} disabled={saving}
              style={{ padding: "9px 16px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b2}`, color: T.t2, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ padding: "9px 22px", borderRadius: 7, background: T.blu, border: "none", color: "white", fontSize: 12.5, fontWeight: 700, cursor: saving ? "wait" : "pointer", boxShadow: `0 2px 8px ${T.blu}40`, fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Sending..." : "Send Request"}
            </button>
          </div>
        </>)}
      </div>
    </>
  );
}

const lbl = { fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 6 };
const inp = { width: "100%", height: 36, padding: "0 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, color: T.t1, background: T.surface, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color .12s" };
