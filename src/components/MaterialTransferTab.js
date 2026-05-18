// ── MATERIAL TRANSFER TAB ─────────────────────────────────────────
// Site-to-site material transfer, rendered inside a project's Material
// module (4th tab). Mirrors the mobile Transfer screen but fully wired.
//
// Flow:
//   • Site team clicks "+ New Transfer" → picks destination project +
//     items from THIS project's available stock → submits.
//   • Created as status 'PendingApproval' (requires_approval = !isAdmin).
//     Admin/PM see Approve / Reject buttons on the card.
//   • On Approve → source project stock debits, status → 'Pending'
//     (in transit). On Reject → status 'Rejected' + reason.
//   • Destination site sees a "Receive" button on Pending transfers
//     addressed to them → creates the dest GRN, status → 'Completed'.
//
// Backend: /warehouse/transfers  (+ /:id/approve /:id/reject /:id/receive)

import { useState, useEffect, useCallback } from "react";
import api from "../config/api";

const T = {
  surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  blu: "#2563EB", bluL: "#EFF6FF", bluM: "#BFDBFE",
  grn: "#059669", grnL: "#ECFDF5", grnM: "#A7F3D0",
  red: "#DC2626", redL: "#FEF2F2", redM: "#FECACA",
  amb: "#D97706", ambL: "#FFFBEB", ambM: "#FDE68A",
  cyn: "#0891B2", cynL: "#ECFEFF", cynM: "#A5F3FC",
};

const STATUS_META = {
  PendingApproval: { label: "Pending Approval", c: T.amb, bg: T.ambL, bd: T.ambM },
  Pending:         { label: "In Transit",       c: T.blu, bg: T.bluL, bd: T.bluM },
  Partial:         { label: "Partial Received", c: T.amb, bg: T.ambL, bd: T.ambM },
  Completed:       { label: "Completed",        c: T.grn, bg: T.grnL, bd: T.grnM },
  Rejected:        { label: "Rejected",         c: T.red, bg: T.redL, bd: T.redM },
};

const fmtDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); } catch { return d; }
};

export default function MaterialTransferTab({ projectId, projectName, isAdmin = false }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [acting, setActing]       = useState({});   // { [transferId]: "approving" | ... }
  const [err, setErr]             = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/warehouse/transfers?project_id=${projectId}`)
      .then(r => { if (r.success) setTransfers(r.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (tr, action, body) => {
    setActing(p => ({ ...p, [tr.id]: action }));
    setErr("");
    try {
      const res = await api.post(`/warehouse/transfers/${tr.id}/${action}`, body || {});
      if (res?.success === false) { setErr(res.message || `${action} failed`); }
      else load();
    } catch (e) { setErr(e?.message || "Network error"); }
    setActing(p => ({ ...p, [tr.id]: null }));
  };

  const handleApprove = (tr) => {
    if (!window.confirm(`Approve ${tr.transfer_no}?\n\n${tr.from_project_name} se stock minus ho jayega.`)) return;
    doAction(tr, "approve");
  };
  const handleReject = (tr) => {
    const reason = window.prompt(`Reject ${tr.transfer_no} — reason batao (compulsory):`);
    if (reason == null) return;
    if (!reason.trim()) { setErr("Reject reason compulsory hai"); return; }
    doAction(tr, "reject", { reason: reason.trim() });
  };
  const handleReceive = (tr) => {
    if (!window.confirm(`Receive ${tr.transfer_no}?\n\nPoora material ${projectName} ke stock me add ho jayega (GRN banega).`)) return;
    doAction(tr, "receive");
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, color: T.t3, fontWeight: 600 }}>
          {loading ? "Loading…" : `${transfers.length} transfer${transfers.length === 1 ? "" : "s"}`}
        </div>
        <button onClick={() => setShowNew(true)}
          style={{ padding: "8px 14px", borderRadius: 7, background: T.blu, color: "#fff", border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          + New Transfer
        </button>
      </div>

      {err && (
        <div style={{ padding: "8px 11px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 6, color: T.red, fontSize: 12, marginBottom: 10 }}>
          {err}
        </div>
      )}

      {/* List */}
      {!loading && transfers.length === 0 && (
        <div style={{ textAlign: "center", padding: "44px 20px", color: T.t4, fontSize: 13 }}>
          Abhi koi transfer nahi. "+ New Transfer" se kisi aur project ko material bhejo.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {transfers.map(tr => {
          const meta = STATUS_META[tr.status] || STATUS_META.Pending;
          const isIncoming = Number(tr.to_project_id) === Number(projectId);
          const itemsTxt = (tr.items || []).map(it => `${it.material_name} ${it.qty} ${it.unit || ""}`.trim()).join("  ·  ");
          const totalVal = tr.total_value || (tr.items || []).reduce((s, it) => s + (Number(it.qty)||0)*(Number(it.rate)||0), 0);
          const busy = !!acting[tr.id];
          const canApprove = isAdmin && tr.status === "PendingApproval";
          const canReceive = tr.status === "Pending" && isIncoming;
          return (
            <div key={tr.id} style={{ background: T.surface, border: `1px solid ${T.b1}`, borderLeft: `3px solid ${meta.c}`, borderRadius: 9, padding: "11px 13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: T.t1, fontFamily: "monospace" }}>{tr.transfer_no}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: meta.bg, color: meta.c, border: `1px solid ${meta.bd}` }}>
                  {meta.label}
                </span>
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: isIncoming ? T.cynL : T.surfaceB, color: isIncoming ? T.cyn : T.t3, border: `1px solid ${isIncoming ? T.cynM : T.b1}` }}>
                  {isIncoming ? "↓ Incoming" : "↑ Outgoing"}
                </span>
                <div style={{ flex: 1 }}/>
                <span style={{ fontSize: 11, color: T.t4 }}>{fmtDate(tr.date || tr.created_at)}</span>
              </div>

              {/* From → To */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1, padding: "6px 9px", background: T.surfaceB, borderRadius: 6, border: `1px solid ${T.b1}` }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: T.t4, textTransform: "uppercase" }}>From</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{tr.from_project_name || tr.from_location || "—"}</div>
                </div>
                <span style={{ color: T.blu, fontSize: 15 }}>→</span>
                <div style={{ flex: 1, padding: "6px 9px", background: T.surfaceB, borderRadius: 6, border: `1px solid ${T.b1}` }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: T.t4, textTransform: "uppercase" }}>To</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{tr.to_project_name || tr.to_location || "—"}</div>
                </div>
              </div>

              {/* Items */}
              <div style={{ fontSize: 11.5, color: T.t2, padding: "6px 9px", background: T.surfaceB, borderRadius: 6, marginBottom: 6 }}>
                {itemsTxt || "—"}
                {totalVal > 0 && <span style={{ color: T.t4 }}>{"  ·  ₹"}{Number(totalVal).toLocaleString("en-IN")}</span>}
              </div>

              {/* Meta line */}
              <div style={{ fontSize: 10.5, color: T.t4 }}>
                by {tr.transferred_by_name || "—"}
                {tr.approved_by_name && ` · approved by ${tr.approved_by_name}`}
                {tr.received_by_name && ` · received by ${tr.received_by_name}`}
              </div>

              {tr.status === "Rejected" && tr.reject_reason && (
                <div style={{ marginTop: 6, padding: "6px 9px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 6, fontSize: 11, color: T.red }}>
                  Reject reason: {tr.reject_reason}
                </div>
              )}

              {/* Actions */}
              {(canApprove || canReceive) && (
                <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
                  {canApprove && (
                    <>
                      <button onClick={() => handleReject(tr)} disabled={busy}
                        style={{ flex: 1, padding: "7px", borderRadius: 6, background: T.redL, border: `1px solid ${T.redM}`, color: T.red, fontSize: 11.5, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>
                        ✕ Reject
                      </button>
                      <button onClick={() => handleApprove(tr)} disabled={busy}
                        style={{ flex: 2, padding: "7px", borderRadius: 6, background: busy ? "#9CA3AF" : T.grn, border: "none", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>
                        {acting[tr.id] === "approve" ? "Approving…" : "✓ Approve"}
                      </button>
                    </>
                  )}
                  {canReceive && (
                    <button onClick={() => handleReceive(tr)} disabled={busy}
                      style={{ flex: 1, padding: "7px", borderRadius: 6, background: busy ? "#9CA3AF" : T.cyn, border: "none", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>
                      {acting[tr.id] === "receive" ? "Receiving…" : "📦 Receive Material"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNew && (
        <NewTransferModal
          projectId={projectId} projectName={projectName} isAdmin={isAdmin}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}

// ── NEW TRANSFER MODAL ────────────────────────────────────────────
function NewTransferModal({ projectId, projectName, isAdmin, onClose, onSaved }) {
  const [projects, setProjects]   = useState([]);
  const [stock, setStock]         = useState([]);
  const [toProject, setToProject] = useState("");
  const [rows, setRows]           = useState([{ material: "", qty: "", unit: "", available: 0 }]);
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState("");

  useEffect(() => {
    api.get("/projects").then(r => {
      if (r.success) setProjects((r.data || []).filter(p => Number(p.id) !== Number(projectId)));
    }).catch(() => {});
    api.get(`/tasks/project/${projectId}/inventory`).then(r => {
      if (r.success) setStock((r.data || []).filter(m => Number(m.balance) > 0));
    }).catch(() => {});
  }, [projectId]);

  const setRow = (i, patch) => setRows(p => p.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const addRow = () => setRows(p => [...p, { material: "", qty: "", unit: "", available: 0 }]);
  const delRow = (i) => setRows(p => p.length > 1 ? p.filter((_, idx) => idx !== i) : p);

  const pickMaterial = (i, name) => {
    const m = stock.find(s => s.material_name === name);
    setRow(i, { material: name, unit: m?.unit || "", available: Number(m?.balance) || 0 });
  };

  const handleSave = async () => {
    if (saving) return;
    setErr("");
    if (!toProject) { setErr("Destination project select karo"); return; }
    const validRows = rows.filter(r => r.material && Number(r.qty) > 0);
    if (validRows.length === 0) { setErr("Kam se kam ek item add karo (qty > 0)"); return; }
    // Stock guard — can't transfer more than available
    for (const r of validRows) {
      if (Number(r.qty) > Number(r.available) + 0.001) {
        setErr(`"${r.material}" me sirf ${r.available} ${r.unit} available hai — aap ${r.qty} bhej rahe ho`);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await api.post("/warehouse/transfers", {
        from_project_id: projectId,
        to_project_id: Number(toProject),
        requires_approval: !isAdmin,   // site team → approval; admin → direct
        notes: notes || null,
        items: validRows.map(r => ({
          material_name: r.material, name: r.material,
          qty: Number(r.qty), unit: r.unit || "Nos",
        })),
      });
      if (res?.success === false) { setErr(res.message || "Save failed"); setSaving(false); return; }
      onSaved();
    } catch (e) { setErr(e?.message || "Network error"); setSaving(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 600, backdropFilter: "blur(2px)" }}/>
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(560px,94vw)", maxHeight: "88vh", background: T.surface, borderRadius: 12, zIndex: 601, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
        {/* Header */}
        <div style={{ background: "#0D1B2A", padding: "13px 17px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>New Material Transfer</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>
                {isAdmin ? "Admin transfer — directly in-transit" : "Site transfer — admin approval ke baad stock minus"}
              </div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 15, cursor: "pointer" }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 17px" }}>
          {err && (
            <div style={{ padding: "8px 11px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 6, color: T.red, fontSize: 12, marginBottom: 11 }}>
              {err}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={lbl}>From Project</label>
              <div style={{ ...inp, background: T.surfaceB, color: T.t3, display: "flex", alignItems: "center" }}>{projectName}</div>
            </div>
            <div>
              <label style={lbl}>To Project *</label>
              <select value={toProject} onChange={e => setToProject(e.target.value)} style={inp}>
                <option value="">Select destination…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <label style={lbl}>Items (from {projectName}'s stock)</label>
          {stock.length === 0 && (
            <div style={{ fontSize: 11.5, color: T.amb, padding: "8px 10px", background: T.ambL, borderRadius: 6, marginBottom: 8 }}>
              Is project ke stock me kuch nahi hai — pehle material receive karo.
            </div>
          )}
          {rows.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 26px", gap: 6, marginBottom: 6 }}>
              <select value={r.material} onChange={e => pickMaterial(i, e.target.value)} style={inp}>
                <option value="">Material…</option>
                {stock.map(s => <option key={s.material_name} value={s.material_name}>{s.material_name} ({s.balance} {s.unit})</option>)}
              </select>
              <input type="number" placeholder="Qty" value={r.qty} onChange={e => setRow(i, { qty: e.target.value })}
                style={{ ...inp, textAlign: "right" }}/>
              <div style={{ ...inp, background: T.surfaceB, color: T.t3, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{r.unit || "—"}</div>
              <button onClick={() => delRow(i)} style={{ border: "none", background: "none", color: T.red, fontSize: 17, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
          ))}
          <button onClick={addRow}
            style={{ marginTop: 2, padding: "5px 11px", borderRadius: 6, background: T.bluL, border: `1px dashed ${T.bluM}`, color: T.blu, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
            + Add item
          </button>

          <div style={{ marginTop: 12 }}>
            <label style={lbl}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="e.g. urgent — site B pe casting hai"
              style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "11px 17px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", gap: 8 }}>
          <button onClick={onClose} disabled={saving}
            style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}`, color: T.t3, fontSize: 12.5, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: "9px", borderRadius: 7, background: saving ? "#9CA3AF" : T.blu, border: "none", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : isAdmin ? "Create Transfer" : "Submit for Approval"}
          </button>
        </div>
      </div>
    </>
  );
}

const lbl = { fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 4 };
const inp = { width: "100%", padding: "8px 10px", borderRadius: 6, border: `1.5px solid ${T.b1}`, fontSize: 12.5, color: T.t1, background: T.surface, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
