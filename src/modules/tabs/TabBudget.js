import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";

// ── Budget tab — task-wise + project-wise cost estimate + variance ──
// P1: per-task rate analysis (Material/Labour/Machinery/Overhead),
//     coefficient-based (qty/unit × scope qty) → estimate (cost).
// P2: record DPR progress (done qty + actual M/L/Mc/Expense, Fill-from-
//     estimate) → variance (planned vs actual). Additive; existing DPR
//     free-text untouched.

const CATS = [
  { id: "material",  label: "Material",  c: T.blu },
  { id: "labour",    label: "Labour",    c: T.pur },
  { id: "machinery", label: "Machinery", c: T.amb },
  { id: "overhead",  label: "Overhead",  c: T.slt },
];
const inr = (n) => { const v = Math.round(Number(n) || 0); return (v < 0 ? "-₹" : "₹") + Math.abs(v).toLocaleString("en-IN"); };
const n2  = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-IN");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function TabBudget({ project }) {
  const projectId = project?.id;
  const [tasks, setTasks]   = useState([]);
  const [totals, setTotals] = useState({ scope: 0, estimate: 0, margin: 0, margin_pct: 0 });
  const [units, setUnits]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel]       = useState(null);
  const [hdr, setHdr]       = useState(null);
  const [lines, setLines]   = useState([]);
  const [byCat, setByCat]   = useState({});
  const [progress, setProgress] = useState([]);
  const [cat, setCat]       = useState("material");
  const [mode, setMode]     = useState("plan");      // plan | actuals
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState(null);
  // progress-entry form
  const [pDate, setPDate]   = useState(today());
  const [pDone, setPDone]   = useState("");
  const [pLines, setPLines] = useState([]);
  const [pSaving, setPSaving] = useState(false);
  const flash = (m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 2400); };

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const [pr, ur] = await Promise.all([api.get(`/budget/project/${projectId}`), api.get(`/budget/units`)]);
    if (pr?.success) { setTasks(pr.data.tasks || []); setTotals(pr.data.totals || {}); }
    if (ur?.success) setUnits(ur.data || []);
    setLoading(false);
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const openTask = async (id) => {
    const r = await api.get(`/budget/task/${id}`);
    if (!r?.success) return flash(r?.message || "Failed to open", "error");
    setHdr({ ...r.data.task });
    setLines((r.data.lines || []).map((l) => ({ ...l })));
    setByCat(r.data.byCat || {});
    setProgress(r.data.progress || []);
    setCat("material"); setMode("plan");
    setPDate(today()); setPDone(""); setPLines([]);
    setSel(id);
  };

  // ── estimate (plan) calcs ──
  const scope = Number(hdr?.scope_qty || 0);
  const lineQty = (l) => Number(l.qty_per_unit || 0) * scope;
  const lineAmt = (l) => lineQty(l) * Number(l.rate || 0);
  const catTotal = (cid) => lines.filter((l) => l.category === cid).reduce((s, l) => s + lineAmt(l), 0);
  const estimate = CATS.reduce((s, c) => s + catTotal(c.id), 0);
  const scopeAmt = scope * Number(hdr?.billing_rate || 0);
  const setLine = (idx, f, v) => setLines((p) => p.map((l, i) => i === idx ? { ...l, [f]: v } : l));
  const addLine = () => setLines((p) => [...p, { category: cat, item_name: "", unit: hdr?.unit || "", qty_per_unit: 0, rate: 0 }]);
  const delLine = (idx) => setLines((p) => p.filter((_, i) => i !== idx));

  const saveAll = async () => {
    setSaving(true);
    const h = await api.patch(`/budget/task/${sel}`, {
      unit: hdr.unit, scope_qty: hdr.scope_qty, billing_rate: hdr.billing_rate,
      stage: hdr.stage, stage_order: hdr.stage_order, non_billable_ra: hdr.non_billable_ra ? 1 : 0,
    });
    const payload = lines.map((l) => ({ category: l.category, item_name: l.item_name, unit: l.unit, qty_per_unit: Number(l.qty_per_unit || 0), rate: Number(l.rate || 0) }));
    const ln = await api.put(`/budget/task/${sel}/lines`, { lines: payload });
    setSaving(false);
    if (h?.success && ln?.success) { flash("Budget saved"); setSel(null); load(); }
    else flash((h?.message || ln?.message) || "Save failed", "error");
  };

  // ── actuals / variance calcs ──
  const done = Number(hdr?.done_qty || 0);
  const frac = scope > 0 ? done / scope : 0;
  const plannedCat = (cid) => Number(byCat[cid]?.estimate || 0) * frac;
  const actualCat  = (cid) => Number(byCat[cid]?.actual || 0);
  const plannedTot = CATS.reduce((s, c) => s + plannedCat(c.id), 0);
  const actualTot  = CATS.reduce((s, c) => s + actualCat(c.id), 0);

  const fillFromEstimate = () => {
    const q = Number(pDone || 0);
    setPLines(lines.map((l) => ({ category: l.category, item_name: l.item_name, unit: l.unit, qty: Math.round(Number(l.qty_per_unit || 0) * q * 1000) / 1000, rate: Number(l.rate || 0) })));
  };
  const setPLine = (idx, f, v) => setPLines((p) => p.map((l, i) => i === idx ? { ...l, [f]: v } : l));
  const pAmt = (l) => Number(l.qty || 0) * Number(l.rate || 0);
  const saveProgress = async () => {
    if (!(Number(pDone) > 0)) return flash("Enter quantity done", "error");
    setPSaving(true);
    const r = await api.post(`/budget/task/${sel}/progress`, {
      report_date: pDate, done_qty: Number(pDone),
      lines: pLines.map((l) => ({ category: l.category, item_name: l.item_name, unit: l.unit, qty: Number(l.qty || 0), rate: Number(l.rate || 0) })),
    });
    setPSaving(false);
    if (r?.success) { flash("Progress recorded"); setPDone(""); setPLines([]); openTask(sel); load(); }
    else flash(r?.message || "Failed", "error");
  };
  const delProgress = async (id) => {
    const r = await api.del(`/budget/progress/${id}`);
    if (r?.success) { flash("Entry removed"); openTask(sel); load(); }
    else flash(r?.message || "Failed", "error");
  };

  const inp = { width: "100%", padding: "7px 9px", border: `1px solid ${T.b1}`, borderRadius: 7, fontSize: 12.5, color: T.t1, background: T.surfaceB, outline: "none", fontFamily: "inherit" };
  const td  = { padding: "7px 9px", borderBottom: `1px solid ${T.b1}`, fontSize: 12.5 };
  const th  = { ...td, color: T.t3, fontWeight: 600, fontSize: 11, textAlign: "left", whiteSpace: "nowrap" };

  return (
    <div style={{ padding: "4px 2px" }}>
      {toast && (
        <div style={{ position: "fixed", top: 18, right: 22, zIndex: 9999, padding: "10px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600,
          background: toast.t === "error" ? T.redL : T.grnL, color: toast.t === "error" ? T.red : T.grn, border: `1px solid ${toast.t === "error" ? T.redM : T.grnM}` }}>{toast.m}</div>
      )}

      {/* project totals */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 16 }}>
        {[["Scope (revenue)", inr(totals.scope), T.blu], ["Estimate (cost)", inr(totals.estimate), T.amb],
          ["Margin", inr(totals.margin) + "  (" + (totals.margin_pct ?? 0) + "%)", (totals.margin >= 0 ? T.grn : T.red)],
          ["Tasks", String(tasks.length), T.slt]].map(([l, v, c]) => (
          <div key={l} style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, borderTop: `3px solid ${c}`, padding: "12px 14px" }}>
            <div style={{ fontSize: 21, fontWeight: 800, color: c, letterSpacing: "-0.4px", fontVariantNumeric: "tabular-nums" }}>{v}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>Task budgets</div>
        <button onClick={load} style={{ ...inp, width: "auto", cursor: "pointer", background: T.surface }}>↻ Refresh</button>
      </div>

      {loading ? (
        <div style={{ padding: 50, textAlign: "center", color: T.t4, fontSize: 13 }}>Loading budget…</div>
      ) : !tasks.length ? (
        <div style={{ padding: 40, textAlign: "center", color: T.t4, fontSize: 13, background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 12 }}>
          No tasks yet. Add tasks in the <b>Tasks</b> tab, then plan each task's budget here.
        </div>
      ) : (
        <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: T.surfaceB }}>
                {["Task", "Stage", "Unit", "Scope qty", "Done", "Scope amt", "Estimate", "Actual", "Margin", ""].map((h, i) => (
                  <th key={i} style={{ ...th, textAlign: i >= 3 && i <= 8 ? "right" : "left" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {tasks.map((t) => {
                  const mg = Number(t.margin || 0);
                  const dq = Number(t.done_qty || 0), sq = Number(t.scope_qty || 0);
                  return (
                    <tr key={t.id} onClick={() => openTask(t.id)} style={{ cursor: "pointer" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = T.surfaceB}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td style={td}><span style={{ color: T.t4, marginRight: 6 }}>{t.task_no}</span><span style={{ fontWeight: 600, color: T.t1 }}>{t.name}</span></td>
                      <td style={{ ...td, color: T.t3 }}>{t.stage || "—"}</td>
                      <td style={{ ...td, color: T.t3 }}>{t.unit || "—"}</td>
                      <td style={{ ...td, textAlign: "right" }}>{sq ? n2(sq) : "—"}</td>
                      <td style={{ ...td, textAlign: "right", color: T.t3 }}>{dq ? n2(dq) + (sq ? ` (${Math.round(dq / sq * 100)}%)` : "") : "—"}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{inr(t.scope_amt)}</td>
                      <td style={{ ...td, textAlign: "right", color: T.amb }}>{inr(t.estimate_amt)}</td>
                      <td style={{ ...td, textAlign: "right", color: T.t2 }}>{Number(t.actual_amt) ? inr(t.actual_amt) : "—"}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700, color: mg >= 0 ? T.grn : T.red }}>{inr(mg)}</td>
                      <td style={{ ...td, textAlign: "center", color: T.blu }}>›</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── task drawer ── */}
      {sel && hdr && (
        <>
          <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.4)", zIndex: 1000 }} />
          <div style={{ position: "fixed", top: 0, right: 0, width: "min(580px,100%)", height: "100vh", background: T.surface, zIndex: 1001, boxShadow: "-8px 0 30px rgba(0,0,0,.12)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>{hdr.task_no} · {hdr.name}</div>
                <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>Task budget</div></div>
              <button onClick={() => setSel(null)} style={{ ...inp, width: "auto", cursor: "pointer", background: T.surfaceB }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
              {/* header fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div><div style={{ fontSize: 11, color: T.t3, marginBottom: 4 }}>Unit</div>
                  <select value={hdr.unit || ""} onChange={(e) => setHdr({ ...hdr, unit: e.target.value })} style={{ ...inp, cursor: "pointer" }}>
                    <option value="">—</option>{units.map((u) => <option key={u.id} value={u.code}>{u.code}</option>)}</select></div>
                <div><div style={{ fontSize: 11, color: T.t3, marginBottom: 4 }}>Scope qty</div>
                  <input type="number" value={hdr.scope_qty ?? ""} onChange={(e) => setHdr({ ...hdr, scope_qty: e.target.value })} style={{ ...inp, textAlign: "right" }} /></div>
                <div><div style={{ fontSize: 11, color: T.t3, marginBottom: 4 }}>Billing rate ₹/unit</div>
                  <input type="number" value={hdr.billing_rate ?? ""} onChange={(e) => setHdr({ ...hdr, billing_rate: e.target.value })} style={{ ...inp, textAlign: "right" }} /></div>
                <div><div style={{ fontSize: 11, color: T.t3, marginBottom: 4 }}>Stage / level</div>
                  <input value={hdr.stage || ""} onChange={(e) => setHdr({ ...hdr, stage: e.target.value })} placeholder="e.g. Plinth" style={inp} /></div>
                <div><div style={{ fontSize: 11, color: T.t3, marginBottom: 4 }}>Stage order</div>
                  <input type="number" value={hdr.stage_order ?? ""} onChange={(e) => setHdr({ ...hdr, stage_order: e.target.value })} style={{ ...inp, textAlign: "right" }} /></div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.t2, marginTop: 22 }}>
                  <input type="checkbox" checked={!!hdr.non_billable_ra} onChange={(e) => setHdr({ ...hdr, non_billable_ra: e.target.checked })} /> Non-billable (RA)</label>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", background: T.bluL, borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12.5 }}>
                <span style={{ color: T.blu, fontWeight: 600 }}>Scope amount (revenue)</span>
                <span style={{ color: T.blu, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{inr(scopeAmt)}</span>
              </div>

              {/* mode toggle */}
              <div style={{ display: "flex", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, padding: 3, marginBottom: 14 }}>
                {[["plan", "Plan (estimate)"], ["actuals", "Actuals & variance"]].map(([m, l]) => (
                  <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "7px", border: "none", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    background: mode === m ? T.surface : "transparent", color: mode === m ? T.t1 : T.t3, boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>{l}</button>
                ))}
              </div>

              {/* ── PLAN: estimate editor ── */}
              {mode === "plan" && (
                <>
                  <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.b1}`, marginBottom: 10 }}>
                    {CATS.map((c) => (
                      <button key={c.id} onClick={() => setCat(c.id)} style={{ flex: 1, padding: "8px 4px", border: "none", background: "transparent", borderBottom: `2px solid ${cat === c.id ? c.c : "transparent"}`, color: cat === c.id ? c.c : T.t3, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        {c.label}<div style={{ fontSize: 10.5, fontWeight: 400, color: T.t4 }}>{inr(catTotal(c.id))}</div></button>
                    ))}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["Item", "Qty/unit", "Qty", "Rate ₹", "Amount ₹", ""].map((h, i) => <th key={i} style={{ ...th, textAlign: i >= 2 && i <= 4 ? "right" : "left" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {lines.map((l, idx) => l.category === cat && (
                        <tr key={idx}>
                          <td style={{ ...td, width: "34%" }}><input value={l.item_name || ""} onChange={(e) => setLine(idx, "item_name", e.target.value)} style={inp} /></td>
                          <td style={{ ...td, width: "16%" }}><input type="number" step="0.001" value={l.qty_per_unit ?? ""} onChange={(e) => setLine(idx, "qty_per_unit", e.target.value)} style={{ ...inp, textAlign: "right" }} /></td>
                          <td style={{ ...td, textAlign: "right", color: T.t2 }}>{n2(lineQty(l))}</td>
                          <td style={{ ...td, width: "16%" }}><input type="number" value={l.rate ?? ""} onChange={(e) => setLine(idx, "rate", e.target.value)} style={{ ...inp, textAlign: "right" }} /></td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{inr(lineAmt(l))}</td>
                          <td style={{ ...td, textAlign: "center" }}><button onClick={() => delLine(idx)} aria-label="Remove" style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 14 }}>✕</button></td>
                        </tr>
                      ))}
                      {!lines.some((l) => l.category === cat) && <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: T.t4 }}>No {cat} lines yet.</td></tr>}
                    </tbody>
                  </table>
                  <button onClick={addLine} style={{ marginTop: 8, fontSize: 12, color: T.blu, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add {cat} line</button>
                </>
              )}

              {/* ── ACTUALS & VARIANCE ── */}
              {mode === "actuals" && (
                <>
                  <div style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>Done: <b style={{ color: T.t1 }}>{n2(done)} {hdr.unit}</b>{scope ? ` of ${n2(scope)} (${Math.round(frac * 100)}%)` : ""}</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
                    <thead><tr>{["Category", "Planned (done)", "Actual", "Variance", ""].map((h, i) => <th key={i} style={{ ...th, textAlign: i >= 1 && i <= 3 ? "right" : "left" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {CATS.map((c) => {
                        const pl = plannedCat(c.id), ac = actualCat(c.id), v = pl - ac, ok = v >= 0;
                        return (
                          <tr key={c.id}>
                            <td style={td}>{c.label}</td>
                            <td style={{ ...td, textAlign: "right", color: T.t3 }}>{inr(pl)}</td>
                            <td style={{ ...td, textAlign: "right" }}>{inr(ac)}</td>
                            <td style={{ ...td, textAlign: "right", fontWeight: 600, color: ok ? T.grn : T.red }}>{inr(v)}</td>
                            <td style={{ ...td, textAlign: "right", fontSize: 11, color: ok ? T.grn : T.red }}>{pl > 0 ? (ok ? "▼" : "▲") + Math.abs(Math.round(v / pl * 100)) + "%" : ""}</td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: T.surfaceB, fontWeight: 700 }}>
                        <td style={td}>Total</td>
                        <td style={{ ...td, textAlign: "right" }}>{inr(plannedTot)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{inr(actualTot)}</td>
                        <td style={{ ...td, textAlign: "right", color: (plannedTot - actualTot) >= 0 ? T.grn : T.red }}>{inr(plannedTot - actualTot)}</td>
                        <td style={td}></td>
                      </tr>
                    </tbody>
                  </table>

                  {/* record progress */}
                  <div style={{ background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 10 }}>Record progress (DPR)</div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: T.t3, marginBottom: 4 }}>Date</div><input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} style={inp} /></div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: T.t3, marginBottom: 4 }}>Qty done ({hdr.unit})</div><input type="number" value={pDone} onChange={(e) => setPDone(e.target.value)} style={{ ...inp, textAlign: "right" }} /></div>
                      <button onClick={fillFromEstimate} style={{ ...inp, width: "auto", alignSelf: "flex-end", cursor: "pointer", background: T.bluL, color: T.blu, border: `1px solid ${T.bluM}`, fontWeight: 600, whiteSpace: "nowrap" }}>↺ Fill from estimate</button>
                    </div>
                    {pLines.length > 0 && (
                      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
                        <thead><tr>{["", "Item", "Qty", "Rate", "Amount", ""].map((h, i) => <th key={i} style={{ ...th, padding: "5px 6px", textAlign: i >= 2 && i <= 4 ? "right" : "left" }}>{h}</th>)}</tr></thead>
                        <tbody>
                          {pLines.map((l, idx) => (
                            <tr key={idx}>
                              <td style={{ ...td, padding: "4px 6px", width: 70 }}><span style={{ fontSize: 10, color: T.t4 }}>{l.category.slice(0, 4)}</span></td>
                              <td style={{ ...td, padding: "4px 6px" }}><input value={l.item_name || ""} onChange={(e) => setPLine(idx, "item_name", e.target.value)} style={{ ...inp, padding: "5px 7px" }} /></td>
                              <td style={{ ...td, padding: "4px 6px", width: 70 }}><input type="number" step="0.01" value={l.qty ?? ""} onChange={(e) => setPLine(idx, "qty", e.target.value)} style={{ ...inp, padding: "5px 7px", textAlign: "right" }} /></td>
                              <td style={{ ...td, padding: "4px 6px", width: 70 }}><input type="number" value={l.rate ?? ""} onChange={(e) => setPLine(idx, "rate", e.target.value)} style={{ ...inp, padding: "5px 7px", textAlign: "right" }} /></td>
                              <td style={{ ...td, padding: "4px 6px", textAlign: "right", fontWeight: 600 }}>{inr(pAmt(l))}</td>
                              <td style={{ ...td, padding: "4px 6px", textAlign: "center" }}><button onClick={() => setPLines((p) => p.filter((_, i) => i !== idx))} style={{ border: "none", background: "none", color: T.t4, cursor: "pointer" }}>✕</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <button onClick={saveProgress} disabled={pSaving} style={{ width: "100%", padding: "9px", borderRadius: 8, border: "none", background: pSaving ? T.b2 : T.grn, color: "#fff", fontSize: 13, fontWeight: 700, cursor: pSaving ? "default" : "pointer", fontFamily: "inherit" }}>{pSaving ? "Saving…" : "Save progress"}</button>
                  </div>

                  {/* history */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 8 }}>History</div>
                  {progress.length ? progress.map((p) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${T.b1}`, fontSize: 12.5 }}>
                      <span style={{ color: T.t2 }}>{p.report_date}</span>
                      <span style={{ color: T.t1, fontWeight: 600 }}>{n2(p.done_qty)} {hdr.unit}</span>
                      <span style={{ marginLeft: "auto" }}><button onClick={() => delProgress(p.id)} style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 13 }}>✕</button></span>
                    </div>
                  )) : <div style={{ fontSize: 12, color: T.t4 }}>No progress recorded yet.</div>}
                </>
              )}
            </div>

            {/* footer */}
            <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.b1}` }}>
              {mode === "plan" ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span style={{ color: T.t3 }}>Estimate (cost)</span><span style={{ fontWeight: 700, color: T.amb }}>{inr(estimate)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 10 }}><span style={{ color: T.t3 }}>Margin</span><span style={{ fontWeight: 800, color: (scopeAmt - estimate) >= 0 ? T.grn : T.red }}>{inr(scopeAmt - estimate)} ({scopeAmt > 0 ? Math.round((scopeAmt - estimate) / scopeAmt * 100) : 0}%)</span></div>
                  <button onClick={saveAll} disabled={saving} style={{ width: "100%", padding: "11px", borderRadius: 9, border: "none", background: saving ? T.b2 : T.blu, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "inherit" }}>{saving ? "Saving…" : "Save budget"}</button>
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: T.t3 }}>Variance (planned − actual)</span><span style={{ fontWeight: 800, color: (plannedTot - actualTot) >= 0 ? T.grn : T.red }}>{inr(plannedTot - actualTot)}</span></div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
