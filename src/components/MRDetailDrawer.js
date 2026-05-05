// ── MATERIAL REQUEST DETAIL DRAWER ─────────────────────────────
// Slide-in drawer used from every MR tab in the Procurement module
// (Pending / Approved / Ordered / Received / Rejected). Admin can
// edit any field (qty, vendor, dates, status, etc.) or delete the MR.
//
// Props:
//   mr         — material request object (or null = drawer closed)
//   onClose    — close drawer
//   onChanged  — called after a successful edit / delete so parent reloads
//   isAdmin    — boolean; non-admins only see read-only details

import { useState, useEffect, useRef } from "react";
import api from "../config/api";
import LibrarySelect from "./LibrarySelect";
import ActivityLog from "./ActivityLog";

const T = {
  surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  blu: "#2563EB", bluL: "#EFF6FF", bluM: "#BFDBFE",
  grn: "#059669", grnL: "#ECFDF5", grnM: "#A7F3D0",
  red: "#DC2626", redL: "#FEF2F2", redM: "#FECACA",
  amb: "#D97706", ambL: "#FFFBEB", ambM: "#FDE68A",
  pur: "#7C3AED", purL: "#F5F3FF",
};

const STAGE_META = {
  Requested: { label: "Pending Approval", c: T.amb, bg: T.ambL },
  Approved:  { label: "Approved",         c: T.blu, bg: T.bluL },
  Ordered:   { label: "Ordered",          c: T.pur, bg: T.purL },
  Received:  { label: "Received",         c: T.grn, bg: T.grnL },
  PartialReceived: { label: "Partial Received", c: T.amb, bg: T.ambL },
  Rejected:  { label: "Rejected",         c: T.red, bg: T.redL },
  Used:      { label: "Used",             c: T.t3,  bg: T.b1  },
  Closed:    { label: "Closed",           c: T.t3,  bg: T.b1  },
};

const fmtDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
};
const isoDate = (d) => {
  if (!d) return "";
  try { const dt = new Date(d); if (isNaN(dt)) return ""; return dt.toISOString().slice(0, 10); } catch { return ""; }
};

export default function MRDetailDrawer({ mr, onClose, onChanged, isAdmin = true }) {
  const open = !!mr;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [savingState, setSavingState] = useState(false);
  // Close-with-reason state (hoisted to top so hook order stays stable
  // when the early `if (!open) return null` returns early)
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [closing, setClosing] = useState(false);
  // closeMode: "close" = soft close (Pending/Approved/Ordered) — preserves audit
  //            "received" = close-with-cascade — also drops inventory rows
  const [closeMode, setCloseMode] = useState("close");
  const [editNote, setEditNote] = useState("");
  const savingRef = useRef(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (mr) {
      setEditing(false); setSavingState(false); savingRef.current = false; setErr("");
      setEditNote(""); setShowCloseForm(false); setCloseReason(""); setCloseMode("close");
      setForm({
        item_name:         mr.item_name || mr.item || "",
        quantity:          mr.quantity ?? mr.qty ?? "",
        unit:              mr.unit || "",
        required_date:     isoDate(mr.required_date),
        approx_amount:     mr.approx_amount ?? "",
        notes:             mr.notes || "",
        requested_by:      mr.requested_by || "",
        linked_vendor:     mr.linked_vendor || mr.vendor || "",
        expected_delivery: isoDate(mr.expected_delivery),
        challan_no:        mr.challan_no || mr.challan || "",
        mr_status:         mr.mr_status || "Pending",
        mat_status:        mr.mat_status || "Pending",
      });
    }
  }, [mr]);

  if (!open) return null;

  const stage = mr.mr_status === "Closed" ? "Closed"
    : (mr.stage || (mr.mat_status === "Received" || mr.mat_status === "PartialReceived" ? "Received" : (mr.mat_status === "Ordered" ? "Ordered" : (mr.mr_status === "Approved" ? "Approved" : (mr.mr_status === "Rejected" ? "Rejected" : "Requested")))));
  const meta = STAGE_META[stage] || STAGE_META.Requested;
  // Stage logic: Pending / Approved / Ordered → "Close" with reason (preserves audit trail)
  //              Received / PartialReceived → "Delete" cascades to inventory
  //              Closed / Rejected → no destructive action (already terminal)
  const canClose  = ["Requested", "Approved", "Ordered"].includes(stage);
  const canDelete = ["Received", "PartialReceived"].includes(stage);

  const handleSave = async () => {
    if (savingRef.current) return;
    if (!editNote.trim()) {
      setErr("Edit reason is compulsory — log mein dikhega kyu change kiya");
      return;
    }
    savingRef.current = true; setSavingState(true); setErr("");
    try {
      const payload = {
        item_name: form.item_name?.trim() || undefined,
        quantity: form.quantity ? parseFloat(form.quantity) : undefined,
        unit: form.unit || undefined,
        required_date: form.required_date || null,
        approx_amount: form.approx_amount ? parseFloat(form.approx_amount) : null,
        notes: form.notes ?? null,
        requested_by: form.requested_by || null,
        linked_vendor: form.linked_vendor || null,
        expected_delivery: form.expected_delivery || null,
        challan_no: form.challan_no || null,
        mr_status: form.mr_status || undefined,
        mat_status: form.mat_status || undefined,
        edit_note: editNote.trim(),
      };
      const res = await api.put("/procurement/mrs/" + mr.id, payload);
      if (res?.success === false) {
        setErr(res.message || "Save failed"); savingRef.current = false; setSavingState(false); return;
      }
      setEditing(false);
      onChanged && onChanged();
    } catch (e) {
      setErr(e?.message || "Network error");
    }
    savingRef.current = false; setSavingState(false);
  };

  const handleClose = async () => {
    const reason = closeReason.trim();
    if (!reason) { setErr("Reason is required to close — log dekhne wale ko pata chalega kyu close hua"); return; }
    if (closing) return;
    setClosing(true); setErr("");
    try {
      const res = await api.put("/procurement/mrs/" + mr.id, {
        mr_status: "Closed",
        closed_reason: reason,
      });
      if (res?.success === false) {
        setErr(res.message || "Close failed"); setClosing(false); return;
      }
      setShowCloseForm(false); setCloseReason("");
      onChanged && onChanged();
      onClose && onClose();
    } catch (e) {
      setErr(e?.message || "Network error");
    }
    setClosing(false);
  };

  return (
    <>
      <div onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1500, backdropFilter: "blur(2px)" }}/>
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: "min(540px, 100vw)",
        background: T.surface, zIndex: 1501, display: "flex", flexDirection: "column",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.18)", animation: "mrSlideIn .25s ease",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        {/* Header */}
        <div style={{ background: "#0D1B2A", padding: "16px 20px", color: "#fff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 3, fontWeight: 600, letterSpacing: ".4px", textTransform: "uppercase" }}>
                Material Request · MR-{mr.id}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-.3px",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {mr.item_name || mr.item}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: meta.bg, color: meta.c }}>
                  {meta.label}
                </span>
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>
                  {mr.quantity || mr.qty} {mr.unit}
                </span>
                {mr.project_name && <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>· {mr.project_name}</span>}
              </div>
            </div>
            <button onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {err && (
            <div style={{ padding: "8px 11px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 6, color: T.red, fontSize: 12, marginBottom: 12 }}>
              {err}
            </div>
          )}

          {!editing ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <Tile label="Material" value={mr.item_name || mr.item || "—"}/>
                <Tile label="Quantity" value={`${mr.quantity || mr.qty || "—"} ${mr.unit || ""}`}/>
                <Tile label="Project" value={mr.project_name || "—"}/>
                <Tile label="Requested By" value={mr.requested_by || "—"}/>
                {mr.required_date && <Tile label="Required By" value={fmtDate(mr.required_date)}/>}
                {mr.approx_amount > 0 && <Tile label="Approx. Amount" value={`₹${Number(mr.approx_amount).toLocaleString("en-IN")}`}/>}
                {mr.linked_vendor && <Tile label="Vendor" value={mr.linked_vendor} c={T.blu}/>}
                {mr.expected_delivery && <Tile label="Expected Delivery" value={fmtDate(mr.expected_delivery)} c={T.amb}/>}
                {mr.challan_no && <Tile label="Challan No." value={mr.challan_no}/>}
                {mr.received_qty != null && <Tile label="Received Qty" value={`${mr.received_qty} ${mr.unit||""}`} c={T.grn}/>}
              </div>
              {(mr.notes || mr.note) && (
                <div style={{ padding: "10px 12px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>Notes</div>
                  <div style={{ fontSize: 12.5, color: T.t1, lineHeight: 1.5 }}>{mr.notes || mr.note}</div>
                </div>
              )}
              {mr.rejected_reason && (
                <div style={{ padding: "10px 12px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: T.red, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>Reject Reason</div>
                  <div style={{ fontSize: 12.5, color: T.red, lineHeight: 1.5 }}>{mr.rejected_reason}</div>
                </div>
              )}
              {mr.closed_reason && (
                <div style={{ padding: "10px 12px", background: "#FEF3C7", border: `1px solid #FDE68A`, borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>
                    Close Reason {mr.closed_at && <span style={{ marginLeft: 6, fontWeight: 500, color: T.t4 }}>· {fmtDate(mr.closed_at)}</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#92400E", lineHeight: 1.5 }}>{mr.closed_reason}</div>
                </div>
              )}
              {/* Full audit trail — kisne kya kab kiya */}
              <ActivityLog entity_type="material_request" entity_id={mr.id}/>
            </>
          ) : (
            // Edit form
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ padding: "10px 12px", background: "#FFFBEB", border: `1px solid #FDE68A`, borderRadius: 8 }}>
                <label style={{ ...lblStyle, color: "#92400E" }}>
                  Edit Reason * <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(compulsory — log me record hoga)</span>
                </label>
                <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={2}
                  placeholder="e.g. Site team ne 56 kg ki jagah 50 kg nikala, baki return — qty correct kar raha hu"
                  style={{ ...inpStyle, resize: "vertical", fontFamily: "inherit", borderColor: "#FDE68A", background: "#fff" }}/>
              </div>
              <div>
                <label style={lblStyle}>Material *</label>
                <LibrarySelect type="material"
                  value={form.item_name}
                  onChange={v => {
                    // Auto-fill unit from library entry if known
                    setForm(p => ({ ...p, item_name: v, unit: p.unit }));
                  }}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                <Field label="Quantity *" type="number" value={form.quantity} onChange={v => setForm(p => ({ ...p, quantity: v }))}/>
                <Field label="Unit *" value={form.unit} onChange={v => setForm(p => ({ ...p, unit: v }))}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Required By" type="date" value={form.required_date} onChange={v => setForm(p => ({ ...p, required_date: v }))}/>
                <Field label="Approx. Amount" type="number" value={form.approx_amount} onChange={v => setForm(p => ({ ...p, approx_amount: v }))}/>
              </div>
              <Field label="Requested By" value={form.requested_by} onChange={v => setForm(p => ({ ...p, requested_by: v }))}/>
              <div>
                <label style={lblStyle}>Vendor (Material Supplier)</label>
                <LibrarySelect type="supplier"
                  value={form.linked_vendor}
                  onChange={v => setForm(p => ({ ...p, linked_vendor: v }))}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Expected Delivery" type="date" value={form.expected_delivery} onChange={v => setForm(p => ({ ...p, expected_delivery: v }))}/>
                <Field label="Challan No." value={form.challan_no} onChange={v => setForm(p => ({ ...p, challan_no: v }))}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={lblStyle}>MR Status</label>
                  <select value={form.mr_status} onChange={e => setForm(p => ({ ...p, mr_status: e.target.value }))} style={inpStyle}>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label style={lblStyle}>Material Status</label>
                  <select value={form.mat_status} onChange={e => setForm(p => ({ ...p, mat_status: e.target.value }))} style={inpStyle}>
                    <option value="Pending">Pending</option>
                    <option value="Ordered">Ordered</option>
                    <option value="PartialReceived">Partial Received</option>
                    <option value="Received">Received</option>
                    <option value="Used">Used</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={lblStyle}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
                  style={{ ...inpStyle, resize: "vertical", fontFamily: "inherit" }}/>
              </div>
            </div>
          )}
        </div>

        {/* Close-reason form (shown above footer when admin clicks Close) */}
        {showCloseForm && (
          <div style={{ padding: "12px 20px", background: closeMode === "received" ? "#FEE2E2" : "#FEF3C7", borderTop: `1px solid ${closeMode === "received" ? "#FECACA" : "#FDE68A"}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: closeMode === "received" ? "#991B1B" : "#92400E", marginBottom: 6 }}>
              {closeMode === "received"
                ? "Close Received MR — inventory se bhi ye qty hat jayega. Reason compulsory hai:"
                : "Close MR — kyu close kar rahe ho? (will show in Closed tab log)"}
            </div>
            <textarea value={closeReason} onChange={e => setCloseReason(e.target.value)} autoFocus
              placeholder={closeMode === "received"
                ? "e.g. Galat material aaya, vendor ko wapas kar diya — stock se hata do"
                : "e.g. Project cancelled, vendor rate too high, alternate material chosen..."}
              rows={2}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1.5px solid #FDE68A`, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", marginBottom: 7 }}/>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setShowCloseForm(false); setCloseReason(""); setErr(""); }} disabled={closing}
                style={{ flex: 1, padding: "7px", borderRadius: 6, background: "white", border: `1px solid ${T.b1}`, color: T.t3, fontSize: 11.5, fontWeight: 600, cursor: closing ? "not-allowed" : "pointer" }}>
                Cancel
              </button>
              <button onClick={handleClose} disabled={closing || !closeReason.trim()}
                style={{ flex: 2, padding: "7px", borderRadius: 6, background: closing || !closeReason.trim() ? "#9CA3AF" : "#D97706", border: "none", color: "white", fontSize: 11.5, fontWeight: 700, cursor: closing || !closeReason.trim() ? "not-allowed" : "pointer" }}>
                {closing ? "Closing..." : "Confirm Close"}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, flexShrink: 0, display: "flex", gap: 8 }}>
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} disabled={savingState}
                style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}`, color: T.t3, fontSize: 12, fontWeight: 600, cursor: savingState ? "not-allowed" : "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={savingState}
                style={{ flex: 2, padding: "9px", borderRadius: 7, background: savingState ? "#9CA3AF" : T.blu, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: savingState ? "not-allowed" : "pointer" }}>
                {savingState ? "Saving..." : "✓ Save Changes"}
              </button>
            </>
          ) : (
            <>
              {isAdmin && canClose && !showCloseForm && (
                <button onClick={() => { setShowCloseForm(true); setCloseReason(""); setCloseMode("close"); }}
                  style={{ padding: "9px 14px", borderRadius: 7, background: "#FFFBEB", border: `1px solid #FDE68A`, color: "#D97706", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  ⊘ Close
                </button>
              )}
              {isAdmin && canDelete && !showCloseForm && (
                <button onClick={() => { setShowCloseForm(true); setCloseReason(""); setCloseMode("received"); }}
                  style={{ padding: "9px 14px", borderRadius: 7, background: T.redL, border: `1px solid ${T.redM}`, color: T.red, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  🗑 Delete → Close (drops inventory)
                </button>
              )}
              <div style={{ flex: 1 }}/>
              {isAdmin && (
                <button onClick={() => setEditing(true)}
                  style={{ padding: "9px 18px", borderRadius: 7, background: T.blu, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  ✏ Edit
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes mrSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}

const lblStyle = { fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 4 };
const inpStyle = { width: "100%", padding: "8px 10px", borderRadius: 6, border: `1.5px solid ${T.b1}`, fontSize: 12.5, color: T.t1, background: T.surface, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

function Tile({ label, value, c }) {
  return (
    <div style={{ padding: "8px 10px", background: T.surfaceB, borderRadius: 7, border: `1px solid ${T.b1}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: c || T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || "—"}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label style={lblStyle}>{label}</label>
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} style={inpStyle}/>
    </div>
  );
}
