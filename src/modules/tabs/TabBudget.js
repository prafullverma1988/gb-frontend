import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";

// ── Budget tab — budget at chosen nodes, earned-value tracking ──
// Budget lives on chosen "budget nodes" (usually parent/milestone tasks).
// Sub-tasks below are OPERATIONAL (scheduling/progress only, no budget).
// Each node's % rolls up from its descendant leaves (duration-weighted) →
// earned = estimate × % → vs actual (DPR) → variance. Additive.

const CATS = [
  { id: "material",  label: "Material",  c: T.blu },
  { id: "labour",    label: "Labour",    c: T.pur },
  { id: "machinery", label: "Machinery", c: T.amb },
  { id: "overhead",  label: "Overhead",  c: T.slt },
];
const inr = (n) => { const v = Math.round(Number(n) || 0); return (v < 0 ? "-₹" : "₹") + Math.abs(v).toLocaleString("en-IN"); };
const n2  = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-IN");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const DEPTH_LABELS = ["Phase", "Package", "Activity", "Sub-task", "Detail", "Item"];

export default function TabBudget({ project }) {
  const projectId = project?.id;
  const [tasks, setTasks]   = useState([]);
  const [totals, setTotals] = useState({});
  const [units, setUnits]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed]     = useState({});
  const [levelFilter, setLevelFilter] = useState("All");
  const [sel, setSel]       = useState(null);
  const [hdr, setHdr]       = useState(null);
  const [lines, setLines]   = useState([]);
  const [byCat, setByCat]   = useState({});
  const [progress, setProgress] = useState([]);
  const [selRoll, setSelRoll] = useState(0);
  const [selKids, setSelKids] = useState(false);
  const [selNode, setSelNode] = useState(false);
  const [cat, setCat]       = useState("material");
  const [mode, setMode]     = useState("plan");
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState(null);
  const [pDate, setPDate]   = useState(today());
  const [pDone, setPDone]   = useState("");
  const [pLines, setPLines] = useState([]);
  const [pSaving, setPSaving] = useState(false);
  const flash = (m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 2400); };

  // ── Library picker (per estimate category) ─────────────────────
  // Every category has a master list the company already maintains — the
  // picker pulls item + unit + rate from there so lines match the library
  // instead of being retyped (and drifting) per task.
  //   material  → /library/materials      (name, unit, last/base rate)
  //   labour    → /library/labour-rates   (role, unit, rate)
  //   machinery → /library/equipment      (mode → unit: hourly/daily/trip/fixed)
  //   overhead  → /library/expense-heads  (head name; amount manual ya % helper)
  const [pick, setPick]           = useState(null);   // category id | null
  const [pickSearch, setPickSearch] = useState("");
  const [libCache, setLibCache]   = useState({});     // cat → rows
  const [libLoading, setLibLoading] = useState(false);
  const [ohPct, setOhPct]         = useState("");     // overhead % helper input

  const MODE_UNIT = { hourly: "HOUR", daily: "DAY", trip: "TRIP", fixed: "LS" };
  const LIB_EP = {
    material:  "/library/materials",
    labour:    "/library/labour-rates",
    machinery: "/library/equipment",
    overhead:  "/library/expense-heads",
  };

  const openPicker = async (c) => {
    setPick(c); setPickSearch("");
    if (libCache[c]) return;
    setLibLoading(true);
    const r = await api.get(LIB_EP[c]);
    setLibLoading(false);
    if (r?.success) setLibCache((p) => ({ ...p, [c]: r.data || [] }));
    else flash(r?.message || "Library load nahi hui", "error");
  };

  // Normalise a library row into what the picker shows + what a pick fills.
  const libEntry = (c, row) => {
    if (c === "material") return { title: row.name, sub: [row.category_name, row.unit].filter(Boolean).join(" · "),
      line: { item_name: row.name, unit: row.unit || "", rate: Number(row.last_rate || row.base_rate || 0) } };
    if (c === "labour")   return { title: row.role, sub: [row.category, row.unit || "Day", row.rate ? "₹" + row.rate : ""].filter(Boolean).join(" · "),
      line: { item_name: row.role, unit: row.unit || "Day", rate: Number(row.rate || 0) } };
    if (c === "machinery") {
      const mode = row.measurement_mode || "hourly";
      const rate = Number((mode === "daily" ? (row.rate_per_day || row.default_rate) : row.default_rate) || 0);
      const fuel = Number(row.fuel_per_hour || 0) > 0 && row.fuel_responsibility === "company";
      return { title: row.name, sub: [row.type || row.category, MODE_UNIT[mode] || "HOUR", rate ? "₹" + rate : "", fuel ? `fuel ${row.fuel_per_hour} L/hr` : ""].filter(Boolean).join(" · "),
        line: { item_name: row.name, unit: MODE_UNIT[mode] || "HOUR", rate }, fuelRow: fuel ? row : null };
    }
    return { title: row.name, sub: row.type || "", line: { item_name: row.name, unit: "LS", rate: 0 } };
  };

  const applyPick = async (entry) => {
    setLines((p) => [...p, { category: pick, qty_per_unit: 0, ...entry.line }]);
    // Company-fuel machine → ek Diesel line saath me, rate diesel library se.
    if (entry.fuelRow) {
      let dieselRate = 0;
      try {
        const r = await api.get("/library/materials?search=diesel");
        const d = (r?.data || [])[0];
        dieselRate = Number(d?.last_rate || d?.base_rate || 0);
      } catch (_) {}
      setLines((p) => [...p, { category: "machinery", item_name: `Diesel — ${entry.fuelRow.name} (@${entry.fuelRow.fuel_per_hour} L/hr)`, unit: "LTR", qty_per_unit: 0, rate: dieselRate }]);
      flash(`Diesel line add hui (${entry.fuelRow.fuel_per_hour} L/hr) — hours ke hisaab se qty bharo`);
    }
    setPick(null);
  };

  // Overhead % helper: pct × (material+labour+machinery) ka ek LS line.
  // qty_per_unit = 1/scope rakha hai taaki qty 1 bane aur amount = rate rahe.
  const addOverheadPct = () => {
    const pct = Number(ohPct);
    if (!(pct > 0)) return flash("Pehle % daalo (jaise 5)", "error");
    const direct = catTotal("material") + catTotal("labour") + catTotal("machinery");
    if (!(direct > 0)) return flash("Pehle Material/Labour/Machinery lines banao — % unhi par lagta hai", "error");
    const amt = Math.round(direct * pct / 100);
    setLines((p) => [...p, { category: "overhead", item_name: `Overhead ${pct}% (direct cost par)`, unit: "LS", qty_per_unit: scope > 0 ? +(1 / scope).toFixed(8) : 1, rate: amt }]);
    setOhPct("");
  };

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const [pr, ur] = await Promise.all([api.get(`/budget/project/${projectId}`), api.get(`/budget/units`)]);
    if (pr?.success) { setTasks(pr.data.tasks || []); setTotals(pr.data.totals || {}); }
    if (ur?.success) setUnits(ur.data || []);
    setLoading(false);
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  // parent → children map (orphans re-rooted)
  const kidsMap = useMemo(() => {
    const ids = new Set(tasks.map((t) => t.id));
    const kids = {};
    tasks.forEach((t) => { const p = (t.parent_id && ids.has(t.parent_id)) ? t.parent_id : 0; (kids[p] = kids[p] || []).push(t); });
    return kids;
  }, [tasks]);

  // depth-first ordered tree — driven purely by the collapse map
  const tree = useMemo(() => {
    const out = [];
    const walk = (pid, d) => (kidsMap[pid] || []).forEach((t) => {
      out.push({ ...t, _d: d, _hasKids: !!(kidsMap[t.id] && kidsMap[t.id].length) });
      if (collapsed[t.id]) return;                            // folded — skip its subtree
      walk(t.id, d + 1);
    });
    walk(0, 0); return out;
  }, [kidsMap, collapsed]);

  // level dropdown metadata: depth → label + cumulative count (full tree)
  const levelMeta = useMemo(() => {
    const counts = {};
    const walk = (pid, d) => (kidsMap[pid] || []).forEach((t) => { counts[d] = (counts[d] || 0) + 1; walk(t.id, d + 1); });
    walk(0, 0);
    let cum = 0;
    return Object.keys(counts).map(Number).sort((a, b) => a - b).map((d) => { cum += counts[d]; return { depth: d, label: DEPTH_LABELS[d] || `L${d + 1}`, count: counts[d], cum }; });
  }, [kidsMap]);

  // total descendants per task (shown beside a collapsed row)
  const descCount = useMemo(() => {
    const memo = {};
    const count = (id) => { if (memo[id] != null) return memo[id]; let n = 0; (kidsMap[id] || []).forEach((c) => { n += 1 + count(c.id); }); memo[id] = n; return n; };
    Object.keys(kidsMap).forEach((pid) => (kidsMap[pid] || []).forEach((t) => count(t.id)));
    return memo;
  }, [kidsMap]);

  const allParentIds = useMemo(() => Object.keys(kidsMap).filter((k) => k !== "0"), [kidsMap]);
  const toggleCollapse = (id) => { setCollapsed((p) => ({ ...p, [id]: !p[id] })); setLevelFilter("custom"); };
  const collapseAll = () => { const c = {}; allParentIds.forEach((id) => (c[id] = true)); setCollapsed(c); setLevelFilter("custom"); };
  const expandAll = () => { setCollapsed({}); setLevelFilter("All"); };
  // dropdown = "collapse to this level" preset; per-row chevrons still drill in afterwards
  const applyLevel = (val) => {
    setLevelFilter(val);
    if (val === "All") return setCollapsed({});
    if (val === "custom") return;
    const maxVisible = parseInt(val, 10) - 1;   // deepest depth kept open
    const c = {};
    const walk = (pid, d) => (kidsMap[pid] || []).forEach((t) => {
      if (kidsMap[t.id] && kidsMap[t.id].length && d >= maxVisible) c[t.id] = true;
      walk(t.id, d + 1);
    });
    walk(0, 0); setCollapsed(c);
  };

  // per-task: is it covered by a budgeted ancestor, or does it have a budgeted descendant?
  const flags = useMemo(() => {
    const byId = {}; tasks.forEach((t) => (byId[t.id] = t));
    const kids = {}; tasks.forEach((t) => { const p = t.parent_id || 0; (kids[p] = kids[p] || []).push(t); });
    const out = {};
    tasks.forEach((t) => {
      let p = t.parent_id, cover = null; const guard = new Set([t.id]);
      while (p && byId[p] && !guard.has(p)) { if (byId[p].is_budget_node) { cover = byId[p]; break; } guard.add(p); p = byId[p].parent_id; }
      let hasDesc = false; const st = [...(kids[t.id] || [])];
      while (st.length) { const c = st.pop(); if (c.is_budget_node) { hasDesc = true; break; } (kids[c.id] || []).forEach((x) => st.push(x)); }
      out[t.id] = { cover, hasDesc };
    });
    return out;
  }, [tasks]);

  const openTask = async (id) => {
    const row = tasks.find((t) => t.id === id);
    setSelRoll(Number(row?.roll_pct || 0)); setSelKids(!!row?.has_children); setSelNode(!!row?.is_budget_node);
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

  // estimate (plan)
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
      stage: hdr.stage, stage_order: hdr.stage_order, non_billable_ra: hdr.non_billable_ra ? 1 : 0, is_budget_node: 1,
    });
    const payload = lines.map((l) => ({ category: l.category, item_name: l.item_name, unit: l.unit, qty_per_unit: Number(l.qty_per_unit || 0), rate: Number(l.rate || 0) }));
    const ln = await api.put(`/budget/task/${sel}/lines`, { lines: payload });
    setSaving(false);
    if (h?.success && ln?.success) { flash("Budget saved"); setSel(null); load(); }
    else flash((h?.message || ln?.message) || "Save failed", "error");
  };
  const removeNode = async () => {
    if (!(await window.confirmAsync("Remove budget from this task? Estimate lines are cleared."))) return;
    await api.put(`/budget/task/${sel}/lines`, { lines: [] });
    await api.patch(`/budget/task/${sel}`, { is_budget_node: 0 });
    flash("Budget removed"); setSel(null); load();
  };

  // actuals / variance — earned uses rolled-up % (from sub-tasks)
  const frac = Number(selRoll || 0) / 100;
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
    if (!(Number(pDone) > 0) && !pLines.length) return flash("Enter qty done or actual lines", "error");
    setPSaving(true);
    const r = await api.post(`/budget/task/${sel}/progress`, {
      report_date: pDate, done_qty: Number(pDone || 0),
      lines: pLines.map((l) => ({ category: l.category, item_name: l.item_name, unit: l.unit, qty: Number(l.qty || 0), rate: Number(l.rate || 0) })),
    });
    setPSaving(false);
    if (r?.success) { flash("Recorded"); setPDone(""); setPLines([]); openTask(sel); load(); }
    else flash(r?.message || "Failed", "error");
  };
  const delProgress = async (id) => { const r = await api.del(`/budget/progress/${id}`); if (r?.success) { openTask(sel); load(); } };

  const inp = { width: "100%", padding: "7px 9px", border: `1px solid ${T.b1}`, borderRadius: 7, fontSize: 12.5, color: T.t1, background: T.surfaceB, outline: "none", fontFamily: "inherit" };
  const td  = { padding: "7px 9px", borderBottom: `1px solid ${T.b1}`, fontSize: 12.5 };
  const th  = { ...td, color: T.t3, fontWeight: 600, fontSize: 11, textAlign: "left", whiteSpace: "nowrap" };

  return (
    <div style={{ padding: "4px 2px" }}>
      {toast && (
        <div style={{ position: "fixed", top: 18, right: 22, zIndex: 9999, padding: "10px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600,
          background: toast.t === "error" ? T.redL : T.grnL, color: toast.t === "error" ? T.red : T.grn, border: `1px solid ${toast.t === "error" ? T.redM : T.grnM}` }}>{toast.m}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 16 }}>
        {[["Scope (revenue)", inr(totals.scope), T.blu], ["Estimate (cost)", inr(totals.estimate), T.amb],
          ["Margin", inr(totals.margin) + "  (" + (totals.margin_pct ?? 0) + "%)", (Number(totals.margin) >= 0 ? T.grn : T.red)],
          ["Variance (earned − actual)", inr(totals.variance), (Number(totals.variance) >= 0 ? T.grn : T.red)]].map(([l, v, c]) => (
          <div key={l} style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, borderTop: `3px solid ${c}`, padding: "12px 14px" }}>
            <div style={{ fontSize: 21, fontWeight: 800, color: c, letterSpacing: "-0.4px", fontVariantNumeric: "tabular-nums" }}>{v}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>Tasks <span style={{ fontSize: 12, fontWeight: 400, color: T.t4 }}>· {totals.budget_nodes || 0} budgeted</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select value={levelFilter} onChange={(e) => applyLevel(e.target.value)}
            style={{ height: 32, padding: "0 10px", borderRadius: 7, border: `1.5px solid ${levelFilter !== "All" ? T.blu : T.b1}`, background: levelFilter !== "All" ? T.bluL : T.surface, color: levelFilter !== "All" ? T.blu : T.t2, fontSize: 11.5, fontWeight: levelFilter !== "All" ? 700 : 400, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
            <option value="All">All Levels ({tasks.length})</option>
            {levelMeta.map((lv) => (
              <option key={lv.depth} value={String(lv.depth + 1)}>L{lv.depth + 1} — {lv.label}{lv.depth > 0 ? " (upto)" : ""} ({lv.cum})</option>
            ))}
            {levelFilter === "custom" && <option value="custom">Custom view</option>}
          </select>
          <button onClick={collapseAll} title="Collapse all" style={{ height: 32, width: 32, borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, color: T.t3, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>⊟</button>
          <button onClick={expandAll} title="Expand all" style={{ height: 32, width: 32, borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, color: T.t3, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>⊞</button>
          <button onClick={load} style={{ height: 32, padding: "0 12px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, color: T.t2, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>↻ Refresh</button>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: T.t4, marginBottom: 10 }}>Set a budget on main / milestone tasks; sub-tasks below stay operational and roll their progress up.</div>

      {loading ? (
        <div style={{ padding: 50, textAlign: "center", color: T.t4, fontSize: 13 }}>Loading budget…</div>
      ) : !tasks.length ? (
        <div style={{ padding: 40, textAlign: "center", color: T.t4, fontSize: 13, background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 12 }}>
          No tasks yet. Add tasks in the <b>Tasks</b> tab first.
        </div>
      ) : (
        <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: T.surfaceB }}>
                {["Task", "Unit", "Scope amt", "Estimate", "Earned", "Actual", "Variance", ""].map((h, i) => (
                  <th key={i} style={{ ...th, textAlign: i >= 2 && i <= 6 ? "right" : "left" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {tree.map((t) => {
                  const node = t.is_budget_node;
                  const fl = flags[t.id] || {};
                  const canBudget = node || (!fl.cover && !fl.hasDesc);
                  const v = Number(t.variance || 0);
                  const openDrawer = canBudget ? () => openTask(t.id)
                    : () => flash(fl.cover ? `Covered by ${fl.cover.task_no} — budget at that level` : "A sub-task already has a budget — remove it first", "error");
                  const rowClick = t._hasKids ? () => toggleCollapse(t.id) : openDrawer;  // parents expand, leaves open the drawer
                  return (
                    <tr key={t.id} onClick={rowClick} style={{ cursor: (t._hasKids || canBudget) ? "pointer" : "not-allowed", background: "transparent" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = T.surfaceB}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td style={{ ...td, paddingLeft: 10 + t._d * 18 }}>
                        {t._hasKids
                          ? <span onClick={(e) => { e.stopPropagation(); toggleCollapse(t.id); }} title={collapsed[t.id] ? "Expand" : "Collapse"} style={{ display: "inline-block", width: 18, marginRight: 4, color: T.t2, cursor: "pointer", fontSize: 11, textAlign: "center", userSelect: "none" }}>{collapsed[t.id] ? "▶" : "▼"}</span>
                          : <span style={{ display: "inline-block", width: 18, marginRight: 4 }} />}
                        <span style={{ color: T.t4, marginRight: 6, fontSize: 11 }}>{t.task_no}</span>
                        <span style={{ fontWeight: node ? 700 : 400, color: node ? T.t1 : T.t3 }}>{t.name}</span>
                        {collapsed[t.id] && descCount[t.id] ? <span style={{ marginLeft: 6, fontSize: 10, color: T.t4 }}>+{descCount[t.id]}</span> : null}
                        {node ? <span style={{ marginLeft: 7, fontSize: 9, color: T.blu, background: T.bluL, padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>BUDGET{t.roll_pct != null ? " · " + t.roll_pct + "%" : ""}</span>
                          : fl.cover ? <span style={{ marginLeft: 7, fontSize: 9.5, color: T.t4 }}>↳ covered by {fl.cover.task_no}</span>
                          : fl.hasDesc ? <span style={{ marginLeft: 7, fontSize: 9.5, color: T.amb }}>has budgeted sub-task</span>
                          : <span style={{ marginLeft: 7, fontSize: 9.5, color: T.t4 }}>operational</span>}
                      </td>
                      <td style={{ ...td, color: T.t3 }}>{node ? (t.unit || "—") : ""}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: node ? 600 : 400, color: node ? T.t1 : T.t4 }}>{node ? inr(t.scope_amt) : ""}</td>
                      <td style={{ ...td, textAlign: "right", color: node ? T.amb : T.t4 }}>{node ? inr(t.estimate_amt) : ""}</td>
                      <td style={{ ...td, textAlign: "right", color: T.t2 }}>{node ? inr(t.earned) : ""}</td>
                      <td style={{ ...td, textAlign: "right", color: T.t2 }}>{node ? (Number(t.actual_amt) ? inr(t.actual_amt) : "—") : ""}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700, color: node ? (v >= 0 ? T.grn : T.red) : T.t4 }}>{node ? inr(v) : ""}</td>
                      <td style={{ ...td, textAlign: "center" }} onClick={(e) => { e.stopPropagation(); openDrawer(); }}>{node ? <span style={{ color: T.blu, cursor: "pointer" }}>open ›</span> : canBudget ? <span style={{ fontSize: 10.5, color: T.blu, cursor: "pointer", whiteSpace: "nowrap" }}>+ budget</span> : <span style={{ fontSize: 10.5, color: T.t4 }}>—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* task drawer */}
      {sel && hdr && (
        <>
          <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.4)", zIndex: 1000 }} />
          <div style={{ position: "fixed", top: 0, right: 0, width: "min(580px,100%)", height: "100vh", background: T.surface, zIndex: 1001, boxShadow: "-8px 0 30px rgba(0,0,0,.12)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>{hdr.task_no} · {hdr.name}</div>
                <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>{selKids ? "Budget node · progress rolls up from sub-tasks" : "Task budget"}{selNode ? "" : " · not budgeted yet"}</div></div>
              <button onClick={() => setSel(null)} style={{ ...inp, width: "auto", cursor: "pointer", background: T.surfaceB }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
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

              <div style={{ display: "flex", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, padding: 3, marginBottom: 14 }}>
                {[["plan", "Plan (estimate)"], ["actuals", "Actuals & variance"]].map(([m, l]) => (
                  <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "7px", border: "none", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    background: mode === m ? T.surface : "transparent", color: mode === m ? T.t1 : T.t3, boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>{l}</button>
                ))}
              </div>

              {mode === "plan" && (
                <>
                  <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.b1}`, marginBottom: 10 }}>
                    {CATS.map((c) => (
                      <button key={c.id} onClick={() => setCat(c.id)} style={{ flex: 1, padding: "8px 4px", border: "none", background: "transparent", borderBottom: `2px solid ${cat === c.id ? c.c : "transparent"}`, color: cat === c.id ? c.c : T.t3, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        {c.label}<div style={{ fontSize: 10.5, fontWeight: 400, color: T.t4 }}>{inr(catTotal(c.id))}</div></button>
                    ))}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["Item", "Unit", "Qty/unit", "Qty", "Rate ₹", "Amount ₹", ""].map((h, i) => <th key={i} style={{ ...th, textAlign: i >= 3 && i <= 5 ? "right" : "left" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {lines.map((l, idx) => l.category === cat && (
                        <tr key={idx}>
                          <td style={{ ...td, width: "30%" }}><input value={l.item_name || ""} onChange={(e) => setLine(idx, "item_name", e.target.value)} style={inp} /></td>
                          <td style={{ ...td, width: "10%" }}><input value={l.unit || ""} onChange={(e) => setLine(idx, "unit", e.target.value)} placeholder="—" style={inp} /></td>
                          <td style={{ ...td, width: "14%" }}><input type="number" step="0.001" value={l.qty_per_unit ?? ""} onChange={(e) => setLine(idx, "qty_per_unit", e.target.value)} style={{ ...inp, textAlign: "right" }} /></td>
                          <td style={{ ...td, textAlign: "right", color: T.t2 }}>{n2(lineQty(l))}</td>
                          <td style={{ ...td, width: "14%" }}><input type="number" value={l.rate ?? ""} onChange={(e) => setLine(idx, "rate", e.target.value)} style={{ ...inp, textAlign: "right" }} /></td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{inr(lineAmt(l))}</td>
                          <td style={{ ...td, textAlign: "center" }}><button onClick={() => delLine(idx)} aria-label="Remove" style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 14 }}>✕</button></td>
                        </tr>
                      ))}
                      {!lines.some((l) => l.category === cat) && <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: T.t4 }}>No {cat} lines yet.</td></tr>}
                    </tbody>
                  </table>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, position: "relative", flexWrap: "wrap", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button onClick={() => openPicker(cat)} style={{ fontSize: 12, color: T.ind, background: T.indL, border: `1px solid ${T.ind}33`, borderRadius: 7, padding: "5px 11px", cursor: "pointer", fontWeight: 700 }}>+ Library se</button>
                      <button onClick={addLine} style={{ fontSize: 12, color: T.blu, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Khali line</button>
                      {cat === "overhead" && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: T.t3 }}>
                          <input type="number" value={ohPct} onChange={(e) => setOhPct(e.target.value)} placeholder="%" style={{ ...inp, width: 52, padding: "5px 7px", textAlign: "right" }} />
                          <button onClick={addOverheadPct} title="Material + Labour + Machinery ke total par %" style={{ fontSize: 12, color: T.ind, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>% of direct cost</button>
                        </span>
                      )}
                    </div>
                    {selNode && <button onClick={removeNode} style={{ fontSize: 12, color: T.red, background: "none", border: "none", cursor: "pointer" }}>Remove budget</button>}
                    {pick && (
                      <>
                        <div onClick={() => setPick(null)} style={{ position: "fixed", inset: 0, zIndex: 640 }} />
                        <div style={{ position: "absolute", left: 0, bottom: "calc(100% + 6px)", zIndex: 641, width: 340, maxHeight: 320, background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, boxShadow: "0 10px 32px rgba(0,0,0,.16)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                          <div style={{ padding: 8, borderBottom: `1px solid ${T.b1}` }}>
                            <input autoFocus value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} placeholder="Search library…" style={inp} />
                          </div>
                          <div style={{ overflowY: "auto" }}>
                            {libLoading && <div style={{ padding: 16, fontSize: 12, color: T.t4, textAlign: "center" }}>Loading…</div>}
                            {!libLoading && (libCache[pick] || [])
                              .map((row) => libEntry(pick, row))
                              .filter((e) => !pickSearch || e.title.toLowerCase().includes(pickSearch.toLowerCase()))
                              .slice(0, 60)
                              .map((e, i) => (
                                <div key={i} onClick={() => applyPick(e)}
                                  onMouseEnter={(ev) => ev.currentTarget.style.background = T.indL}
                                  onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}
                                  style={{ padding: "8px 12px", cursor: "pointer", borderBottom: `1px solid ${T.b1}` }}>
                                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{e.title}</div>
                                  {e.sub && <div style={{ fontSize: 11, color: T.t4, marginTop: 1 }}>{e.sub}</div>}
                                </div>
                              ))}
                            {!libLoading && !(libCache[pick] || []).length && (
                              <div style={{ padding: 16, fontSize: 12, color: T.t4, textAlign: "center" }}>
                                Library khali hai — pehle Library module me {pick === "labour" ? "labour rates" : pick === "machinery" ? "equipment" : pick === "overhead" ? "expense heads" : "materials"} add karo.
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {mode === "actuals" && (
                <>
                  <div style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>
                    {selKids ? <>Progress (rolled up from sub-tasks): <b style={{ color: T.t1 }}>{Math.round(selRoll)}%</b></>
                             : <>Done: <b style={{ color: T.t1 }}>{n2(hdr.done_qty)} {hdr.unit}</b>{scope ? ` of ${n2(scope)} (${Math.round(frac * 100)}%)` : ""}</>}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
                    <thead><tr>{["Category", "Planned (earned)", "Actual", "Variance", ""].map((h, i) => <th key={i} style={{ ...th, textAlign: i >= 1 && i <= 3 ? "right" : "left" }}>{h}</th>)}</tr></thead>
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

                  <div style={{ background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 10 }}>Record actuals (DPR)</div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: T.t3, marginBottom: 4 }}>Date</div><input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} style={inp} /></div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: T.t3, marginBottom: 4 }}>Qty done {selKids ? "(optional)" : `(${hdr.unit || ""})`}</div><input type="number" value={pDone} onChange={(e) => setPDone(e.target.value)} style={{ ...inp, textAlign: "right" }} /></div>
                      <button onClick={fillFromEstimate} style={{ ...inp, width: "auto", alignSelf: "flex-end", cursor: "pointer", background: T.bluL, color: T.blu, border: `1px solid ${T.bluM}`, fontWeight: 600, whiteSpace: "nowrap" }}>↺ Fill from estimate</button>
                    </div>
                    {pLines.length > 0 && (
                      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
                        <thead><tr>{["", "Item", "Qty", "Rate", "Amount", ""].map((h, i) => <th key={i} style={{ ...th, padding: "5px 6px", textAlign: i >= 2 && i <= 4 ? "right" : "left" }}>{h}</th>)}</tr></thead>
                        <tbody>
                          {pLines.map((l, idx) => (
                            <tr key={idx}>
                              <td style={{ ...td, padding: "4px 6px", width: 56 }}><span style={{ fontSize: 10, color: T.t4 }}>{l.category.slice(0, 4)}</span></td>
                              <td style={{ ...td, padding: "4px 6px" }}><input value={l.item_name || ""} onChange={(e) => setPLine(idx, "item_name", e.target.value)} style={{ ...inp, padding: "5px 7px" }} /></td>
                              <td style={{ ...td, padding: "4px 6px", width: 64 }}><input type="number" step="0.01" value={l.qty ?? ""} onChange={(e) => setPLine(idx, "qty", e.target.value)} style={{ ...inp, padding: "5px 7px", textAlign: "right" }} /></td>
                              <td style={{ ...td, padding: "4px 6px", width: 64 }}><input type="number" value={l.rate ?? ""} onChange={(e) => setPLine(idx, "rate", e.target.value)} style={{ ...inp, padding: "5px 7px", textAlign: "right" }} /></td>
                              <td style={{ ...td, padding: "4px 6px", textAlign: "right", fontWeight: 600 }}>{inr(pAmt(l))}</td>
                              <td style={{ ...td, padding: "4px 6px", textAlign: "center" }}><button onClick={() => setPLines((p) => p.filter((_, i) => i !== idx))} style={{ border: "none", background: "none", color: T.t4, cursor: "pointer" }}>✕</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <button onClick={saveProgress} disabled={pSaving} style={{ width: "100%", padding: "9px", borderRadius: 8, border: "none", background: pSaving ? T.b2 : T.grn, color: "#fff", fontSize: 13, fontWeight: 700, cursor: pSaving ? "default" : "pointer", fontFamily: "inherit" }}>{pSaving ? "Saving…" : "Save actuals"}</button>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 8 }}>History</div>
                  {progress.length ? progress.map((p) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${T.b1}`, fontSize: 12.5 }}>
                      <span style={{ color: T.t2 }}>{p.report_date}</span>
                      <span style={{ color: T.t1, fontWeight: 600 }}>{Number(p.done_qty) ? n2(p.done_qty) + " " + (hdr.unit || "") : "cost entry"}</span>
                      <span style={{ marginLeft: "auto" }}><button onClick={() => delProgress(p.id)} style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 13 }}>✕</button></span>
                    </div>
                  )) : <div style={{ fontSize: 12, color: T.t4 }}>No actuals recorded yet.</div>}
                </>
              )}
            </div>

            <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.b1}` }}>
              {mode === "plan" ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span style={{ color: T.t3 }}>Estimate (cost)</span><span style={{ fontWeight: 700, color: T.amb }}>{inr(estimate)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 10 }}><span style={{ color: T.t3 }}>Margin</span><span style={{ fontWeight: 800, color: (scopeAmt - estimate) >= 0 ? T.grn : T.red }}>{inr(scopeAmt - estimate)} ({scopeAmt > 0 ? Math.round((scopeAmt - estimate) / scopeAmt * 100) : 0}%)</span></div>
                  <button onClick={saveAll} disabled={saving} style={{ width: "100%", padding: "11px", borderRadius: 9, border: "none", background: saving ? T.b2 : T.blu, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "inherit" }}>{saving ? "Saving…" : (selNode ? "Save budget" : "Set as budget node")}</button>
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: T.t3 }}>Variance (earned − actual)</span><span style={{ fontWeight: 800, color: (plannedTot - actualTot) >= 0 ? T.grn : T.red }}>{inr(plannedTot - actualTot)}</span></div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
