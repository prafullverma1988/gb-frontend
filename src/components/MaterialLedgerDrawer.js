// ── MATERIAL LEDGER DRAWER ────────────────────────────────────────
// Slide-in drawer opened from the project's Material Inventory tab when
// a material row is clicked. Shows that one material's full history in
// three tabs — GRN (receipts) / Used (consumption) / MR (requests) —
// each independently sortable. Also hosts the inline Mark-Used form.
//
// Props:
//   material   — { material_name, unit, total_received, total_used,
//                  balance, receipts:[], usage:[] }  (null = closed)
//   projectId  — for the MR fetch + mark-used POST
//   onClose    — close the drawer
//   onChanged  — called after mark-used / used-delete so parent reloads
//   canDeleteUsed — fn(created_by_id) => bool
//   onGrnClick — optional fn(grn_id) — opens the material flow drawer

import { useState, useEffect, useMemo } from "react";
import api from "../config/api";

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

const fmtDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }); } catch { return d; }
};
const ts = (d) => { try { return new Date(d).getTime() || 0; } catch { return 0; } };

const MR_STAGE = {
  Requested: { c: T.amb, bg: T.ambL }, Pending: { c: T.amb, bg: T.ambL },
  Approved:  { c: T.blu, bg: T.bluL }, Ordered: { c: T.pur, bg: T.purL },
  Received:  { c: T.grn, bg: T.grnL }, PartialReceived: { c: T.amb, bg: T.ambL },
  Used:      { c: T.t3, bg: T.b1 },    Rejected: { c: T.red, bg: T.redL },
  Closed:    { c: T.t3, bg: T.b1 },
};

export default function MaterialLedgerDrawer({ material, projectId, onClose, onChanged, canDeleteUsed, onGrnClick }) {
  const open = !!material;
  const [tab, setTab]       = useState("all");          // all | grn | used | mr
  const [sortNew, setSortNew] = useState(true);          // true = newest first
  const [mrs, setMrs]       = useState(null);            // null = not loaded
  const [markUsed, setMarkUsed] = useState(false);
  const [uForm, setUForm]   = useState({ qty: "", remark: "", used_date: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  // Reset on material change
  useEffect(() => {
    if (material) {
      setTab("all"); setSortNew(true); setMrs(null); setMarkUsed(false); setErr("");
      setUForm({ qty: "", remark: "", used_date: new Date().toISOString().slice(0, 10) });
    }
  }, [material]);

  // Lazy-fetch MRs the first time the MR tab is opened
  useEffect(() => {
    if (open && tab === "mr" && mrs === null) {
      api.get(`/procurement/mrs?project_id=${projectId}`)
        .then(r => {
          const name = (material.material_name || "").trim().toLowerCase();
          const list = (r?.data || []).filter(m =>
            (m.item_name || "").trim().toLowerCase() === name);
          setMrs(list);
        })
        .catch(() => setMrs([]));
    }
  }, [open, tab, mrs, projectId, material]);

  const receipts = useMemo(() => {
    const arr = [...(material?.receipts || [])];
    arr.sort((a, b) => sortNew ? ts(b.received_date) - ts(a.received_date) : ts(a.received_date) - ts(b.received_date));
    return arr;
  }, [material, sortNew]);

  const usage = useMemo(() => {
    const arr = [...(material?.usage || [])];
    arr.sort((a, b) => sortNew ? ts(b.used_date) - ts(a.used_date) : ts(a.used_date) - ts(b.used_date));
    return arr;
  }, [material, sortNew]);

  const mrSorted = useMemo(() => {
    const arr = [...(mrs || [])];
    arr.sort((a, b) => sortNew ? ts(b.created_at) - ts(a.created_at) : ts(a.created_at) - ts(b.created_at));
    return arr;
  }, [mrs, sortNew]);

  // Unified credit/debit ledger — GRN = Cr (in), Used = Dr (out).
  // Running balance is always computed oldest-first; display order then
  // follows the sort toggle.
  const ledgerRows = useMemo(() => {
    const entries = [
      ...(material?.receipts || []).map(r => ({
        _t: "grn", date: r.received_date, ref: r.grn_number || "GRN",
        party: r.vendor_name || "—", sub: r.challan_no ? `Challan ${r.challan_no}` : "",
        by: r.received_by || "", qty: Number(r.qty) || 0, grn_id: r.grn_id,
      })),
      ...(material?.usage || []).map(u => ({
        _t: "used", date: u.used_date, ref: u.task_no || "USE",
        party: u.task_name || "Project level", sub: u.remark || "",
        by: u.used_by || u.user_name || "", qty: Number(u.qty) || 0,
        used_log_id: u.used_log_id, task_id: u.task_id, created_by_id: u.created_by_id,
        unit: u.unit,
      })),
    ];
    entries.sort((a, b) => ts(a.date) - ts(b.date));   // oldest-first for running bal
    let bal = 0;
    entries.forEach(e => { bal += e._t === "grn" ? e.qty : -e.qty; e.bal = bal; });
    return sortNew ? entries.reverse() : entries;
  }, [material, sortNew]);

  if (!open) return null;

  const handleMarkUsed = async () => {
    if (saving) return;
    const q = parseFloat(uForm.qty);
    if (!q || q <= 0) { setErr("Qty daalo"); return; }
    if (q > Number(material.balance)) { setErr(`Balance sirf ${material.balance} ${material.unit} hai`); return; }
    setSaving(true); setErr("");
    try {
      const res = await api.post(`/tasks/project/${projectId}/mark-used`, {
        material_name: material.material_name,
        used_qty: q, unit: material.unit,
        remark: uForm.remark || null, used_date: uForm.used_date,
      });
      if (res?.success === false) { setErr(res.message || "Failed"); setSaving(false); return; }
      setMarkUsed(false);
      onChanged && onChanged();
      onClose && onClose();
    } catch (e) { setErr(e?.message || "Network error"); }
    setSaving(false);
  };

  const handleDeleteUsed = async (row) => {
    if (!window.confirm(`Used entry delete karein? (${row.qty} ${row.unit || material.unit || ""})`)) return;
    try {
      const r = await api.del(`/tasks/${row.task_id}/used-log/${row.used_log_id}`);
      if (r?.success) { onChanged && onChanged(); onClose && onClose(); }
      else setErr(r?.message || "Delete failed");
    } catch (e) { setErr(e?.message || "Network error"); }
  };

  const balColor = material.balance <= 0 ? T.red : material.balance < material.total_received * 0.2 ? T.amb : T.grn;
  const TABS = [
    { id: "all",  l: "All",  n: receipts.length + usage.length },
    { id: "grn",  l: "GRN",  n: receipts.length },
    { id: "used", l: "Used", n: usage.length },
    { id: "mr",   l: "MR",   n: mrs === null ? "·" : mrs.length },
  ];
  // Ledger rows filtered for the active tab (running balance stays intact)
  const visibleLedger = tab === "grn"  ? ledgerRows.filter(e => e._t === "grn")
                      : tab === "used" ? ledgerRows.filter(e => e._t === "used")
                      : ledgerRows;

  return (
    <>
      <div onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1400, backdropFilter: "blur(2px)" }}/>
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: "min(620px,100vw)",
        background: T.surface, zIndex: 1401, display: "flex", flexDirection: "column",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.18)", animation: "mlSlideIn .25s ease",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
      }}>
        {/* Header — slim */}
        <div style={{ background: "#0D1B2A", padding: "14px 20px", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{material.material_name}</div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: ".3px", textTransform: "uppercase", marginTop: 2 }}>
              Material Ledger · {material.unit}
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>×</button>
        </div>
        {/* Purple accent bar */}
        <div style={{ height: 3, background: T.pur, flexShrink: 0 }}/>

        {/* Hero — remaining balance on site */}
        <div style={{ padding: "18px 20px 12px", textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 10.5, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px" }}>
            Remaining on Site
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: balColor, lineHeight: 1.05, marginTop: 3 }}>
            {material.balance}
            <span style={{ fontSize: 15, fontWeight: 600, color: T.t4, marginLeft: 5 }}>{material.unit}</span>
          </div>
        </div>

        {/* 3-stat card */}
        <div style={{ margin: "0 20px 14px", display: "flex", border: `1px solid ${T.b1}`, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
          {[["Received", material.total_received, T.grn],
            ["Used", material.total_used, T.red],
            ["Balance", material.balance, balColor]].map(([l, v, c], i) => (
            <div key={l} style={{ flex: 1, padding: "10px 8px", textAlign: "center", borderLeft: i ? `1px solid ${T.b1}` : "none", background: T.surfaceB }}>
              <div style={{ fontSize: 9.5, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px" }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: c, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Tabs + sort */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", borderBottom: `1px solid ${T.b1}`, flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "6px 13px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: tab === t.id ? T.blu : "transparent", color: tab === t.id ? "#fff" : T.t3 }}>
              {t.l} <span style={{ opacity: 0.7, fontSize: 10.5 }}>{t.n}</span>
            </button>
          ))}
          <div style={{ flex: 1 }}/>
          <button onClick={() => setSortNew(s => !s)}
            style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.b1}`, background: T.surfaceB, color: T.t2, fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>
            {sortNew ? "↓ Newest" : "↑ Oldest"}
          </button>
        </div>

        {err && (
          <div style={{ margin: "10px 14px 0", padding: "8px 11px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 6, color: T.red, fontSize: 12 }}>{err}</div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Credit / Debit ledger — All / GRN / Used with running balance */}
          {tab !== "mr" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 48px 48px 58px 22px", gap: 5, padding: "7px 16px", background: "#1E293B", position: "sticky", top: 0, zIndex: 1 }}>
                {[["Date", 0], ["Details", 0], ["In", 1], ["Out", 1], ["Bal", 1], ["", 1]].map(([h, r], i) => (
                  <div key={i} style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".4px", textAlign: r ? "right" : "left" }}>{h}</div>
                ))}
              </div>
              {visibleLedger.length === 0
                ? <Empty text={tab === "grn" ? "Koi GRN receipt nahi" : tab === "used" ? "Koi usage entry nahi" : "Koi entry nahi"}/>
                : visibleLedger.map((e, i) => {
                  const isGRN = e._t === "grn";
                  const balNeg = e.bal < 0;
                  const showDel = !isGRN && e.used_log_id && e.task_id && canDeleteUsed && canDeleteUsed(e.created_by_id);
                  return (
                    <div key={i}
                      onClick={() => isGRN && e.grn_id && onGrnClick && onGrnClick(e.grn_id)}
                      style={{ display: "grid", gridTemplateColumns: "54px 1fr 48px 48px 58px 22px", gap: 5, padding: "8px 16px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", borderLeft: `3px solid ${isGRN ? T.grn : T.amb}`, cursor: isGRN && e.grn_id ? "pointer" : "default", background: i % 2 ? T.surfaceB : T.surface, transition: "background .1s" }}
                      onMouseEnter={ev => { if (isGRN && e.grn_id) ev.currentTarget.style.background = T.bluL + "55"; }}
                      onMouseLeave={ev => { ev.currentTarget.style.background = i % 2 ? T.surfaceB : T.surface; }}>
                      <div style={{ fontSize: 10.5, color: T.t3 }}>{fmtDate(e.date)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.party}</div>
                        <div style={{ fontSize: 9.5, color: T.t4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ fontFamily: "monospace", color: isGRN ? T.grn : T.amb, fontWeight: 700 }}>{e.ref}</span>
                          {e.sub ? ` · ${e.sub}` : ""}{e.by ? ` · ${e.by}` : ""}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: isGRN ? T.grn : T.b2, textAlign: "right" }}>{isGRN ? e.qty : "—"}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: !isGRN ? T.red : T.b2, textAlign: "right" }}>{!isGRN ? e.qty : "—"}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: balNeg ? T.red : T.t1, textAlign: "right" }}>{e.bal}</div>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        {showDel && (
                          <button title="Delete usage entry" onClick={ev => { ev.stopPropagation(); handleDeleteUsed(e); }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: T.red, lineHeight: 0 }}>
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              {visibleLedger.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 48px 48px 58px 22px", gap: 5, padding: "9px 16px", background: "#0F172A" }}>
                  <div style={{ gridColumn: "1 / 3", fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".4px" }}>Total</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#4ADE80", textAlign: "right" }}>{material.total_received}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#F87171", textAlign: "right" }}>{material.total_used}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", textAlign: "right" }}>{material.balance}</div>
                  <div/>
                </div>
              )}
            </>
          )}

          {/* MR tab — request cards */}
          {tab === "mr" && (
            <div style={{ padding: "12px 14px" }}>
              {mrs === null
                ? <div style={{ textAlign: "center", padding: 30, color: T.t4, fontSize: 12 }}>Loading…</div>
                : mrSorted.length === 0
                  ? <Empty text="Is material ki koi MR nahi"/>
                  : mrSorted.map((m, i) => {
                    const st = m.stage || (m.mr_status === "Closed" ? "Closed" : m.mat_status === "Used" ? "Used" : m.mat_status === "Received" || m.mat_status === "PartialReceived" ? "Received" : m.mat_status === "Ordered" ? "Ordered" : m.mr_status === "Approved" ? "Approved" : m.mr_status === "Rejected" ? "Rejected" : "Requested");
                    const sm = MR_STAGE[st] || MR_STAGE.Requested;
                    return (
                      <Row key={i} accent={sm.c}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, fontFamily: "monospace" }}>{m.mr_number || `MR-${m.id}`}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>{m.quantity} {m.unit}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
                          <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: sm.bg, color: sm.c }}>{st}</span>
                          <span style={{ fontSize: 10.5, color: T.t4 }}>{fmtDate(m.created_at)}{m.requested_by ? ` · ${m.requested_by}` : ""}</span>
                        </div>
                      </Row>
                    );
                  })}
            </div>
          )}
        </div>

        {/* Footer — Mark Used */}
        <div style={{ borderTop: `1px solid ${T.b1}`, background: T.surfaceB, flexShrink: 0 }}>
          {markUsed && material.balance > 0 && (
            <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={lbl}>Qty Used *</label>
                  <input type="number" value={uForm.qty} autoFocus
                    onChange={e => setUForm(p => ({ ...p, qty: e.target.value }))}
                    placeholder={`max ${material.balance}`} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Date</label>
                  <input type="date" value={uForm.used_date}
                    onChange={e => setUForm(p => ({ ...p, used_date: e.target.value }))} style={inp}/>
                </div>
              </div>
              <input value={uForm.remark} onChange={e => setUForm(p => ({ ...p, remark: e.target.value }))}
                placeholder="Remark (optional)" style={{ ...inp, marginBottom: 8 }}/>
            </div>
          )}
          <div style={{ padding: "11px 14px", display: "flex", gap: 8 }}>
            {material.balance > 0 ? (
              !markUsed ? (
                <button onClick={() => setMarkUsed(true)}
                  style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.grnL, border: `1px solid ${T.grnM}`, color: T.grn, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  ▼ Mark Used
                </button>
              ) : (
                <>
                  <button onClick={() => { setMarkUsed(false); setErr(""); }} disabled={saving}
                    style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}`, color: T.t3, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={handleMarkUsed} disabled={saving}
                    style={{ flex: 2, padding: "9px", borderRadius: 7, background: saving ? "#9CA3AF" : T.grn, border: "none", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "Saving…" : "✓ Save Used Entry"}
                  </button>
                </>
              )
            ) : (
              <div style={{ flex: 1, textAlign: "center", fontSize: 11.5, color: T.t4, padding: "9px" }}>
                Balance 0 — kuch use nahi kar sakte
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes mlSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

function Row({ children, accent, onClick, clickable }) {
  return (
    <div onClick={clickable ? onClick : undefined}
      style={{ background: T.surface, border: `1px solid ${T.b1}`, borderLeft: `3px solid ${accent}`,
        borderRadius: 8, padding: "9px 11px", marginBottom: 7, cursor: clickable ? "pointer" : "default",
        transition: "background .1s" }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.background = T.bluL + "55"; }}
      onMouseLeave={e => { e.currentTarget.style.background = T.surface; }}>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ textAlign: "center", padding: "40px 20px", color: T.t4, fontSize: 12.5 }}>{text}</div>;
}

const lbl = { fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 3 };
const inp = { width: "100%", padding: "7px 9px", borderRadius: 6, border: `1.5px solid ${T.b1}`, fontSize: 12.5, color: T.t1, background: T.surface, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
