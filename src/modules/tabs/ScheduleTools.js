// ════════════════════════════════════════════════════════════════
// Payment Schedule banane ke tareeke (5 Nov 2026, Prafull: "stage / payment
// schedule BOQ se bane — item-wise, % aur aur tareeke, sab estimate aur subcon
// ke liye, industry standard"). Industry me chalne wale tareeke:
//   1. Item-wise / BOQ qty  — har BOQ line khud stage; qty (RA bill / CPWD
//                             measurement) ya task ke % se (AIA G703 SOV jaisa)
//   2. Line ke hisse        — part rate: line ka rate % ya ₹ per unit me stage
//                             me (floor ₹/sqft: Advance 200, G Beam 50 …)
//   3. Poore contract ka %  — construction-linked plan (RERA builder jaisa:
//                             Booking 10, Plinth 15, Slab 20 …) = har line par
//                             wahi % → har milestone = contract × %
//   4. Naap (sirf thekedar) — task ki darj qty × factor, Finance "Naap se bill"
//   ScheduleMethods  — upar ke card + "Schedule banao" box (kai line ek saath,
//                      server /schedule/apply)
//   MilestoneView    — hisse naam se jode: "Plinth" sab floor ka ek row (₹,
//                      contract ka %, bill hua, task ek saath)
//   WoFromLinesModal — chuni client line se thekedar ka WO (pehle Stage Board me)
// Server: routes/customer-estimates.js + routes/subcon.js (schedule/apply).
// ════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(num(n) * 100) / 100;
const fmtC = (v) => "₹" + num(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtQ = (v) => num(v).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const inpS = { padding: "5px 8px", borderRadius: 6, border: "1.5px solid " + T.b1, fontSize: 12, outline: "none",
  fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: T.surface, color: T.t1 };
const lblS = { fontSize: 9.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 3 };
const btnS = (kind = "plain", disabled = false) => ({
  padding: "5px 11px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: disabled ? "default" : "pointer",
  fontFamily: "inherit", opacity: disabled ? 0.55 : 1, whiteSpace: "nowrap",
  ...(kind === "primary" ? { background: T.ind, color: "white", border: "1px solid " + T.ind }
    : kind === "soft" ? { background: T.indL, color: T.ind, border: "1px solid " + T.indL }
    : { background: T.surface, color: T.t2, border: "1px solid " + T.b1 }),
});
const chip = (bg, fg) => ({ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: bg, color: fg, whiteSpace: "nowrap" });
const nameOf = (it) => it.name || it.description || "";

// "Building construction · Advance (₹200)" → "Advance" (hisse ka apna naam).
export function partNameOf(it) {
  let s = nameOf(it);
  if (it.part_of && s.startsWith(it.part_of + " · ")) s = s.slice(it.part_of.length + 3);
  return s.replace(/\s*\((?:₹[\d.,]+|[\d.]+%)\)\s*$/, "").trim() || s;
}

const blankPart = () => ({ name: "", pct: "", rate: "", group: "" });
// Industry ke aam plan — naam user ki bhasha me (line par wahi likha jaata hai).
const presets = (mode) => mode === "contract" ? [
  { key: "clp", label: t("schedule.preset_clp"), parts: [
    ["ms_booking", 10], ["ms_plinth", 15], ["ms_lintel", 10], ["ms_slab", 20], ["ms_brick", 10],
    ["ms_plaster", 10], ["ms_floor", 10], ["ms_finish", 10], ["ms_handover", 5]] },
  { key: "simple", label: t("schedule.preset_simple"), parts: [["ms_booking", 10], ["ms_structure", 50], ["ms_finish", 30], ["ms_handover", 10]] },
] : [
  { key: "house", label: t("schedule.preset_house"), parts: [["ms_plinth", 30], ["ms_slab", 30], ["ms_tile", 20], ["ms_complete", 20]] },
];
const presetParts = (p) => p.parts.map(([k, v]) => ({ name: t("schedule." + k), pct: String(v), rate: "", group: "" }));

// ── 1. Tareeke + "Schedule banao" box ──
export function ScheduleMethods({ kind, id, items, canEdit, qtyCount = 0, onDone }) {
  const [wiz, setWiz] = useState(null);   // { mode: "parts" | "contract", ids: Set, pmode, parts, lib, busy, err, skipped }
  const lines = items || [];
  const plain = lines.filter(x => !x.part_of && num(x.planned_qty) > 0);
  const locked = (x) => num(x.billed_qty) > 0 || num(x.opening_qty) > 0;
  const splitLines = lines.filter(x => x.part_of).length;

  const open = (mode) => {
    const ok = plain.filter(x => !locked(x) && (mode === "parts" || x.item_type !== "extra"));
    let ids = ok;
    if (mode === "parts" && ok.length) {
      // Sabse zyada wali unit (Sqft floor) ki line pehle se tick
      const cnt = {};
      for (const x of ok) { const u = String(x.unit || "").toLowerCase(); cnt[u] = (cnt[u] || 0) + 1; }
      const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
      ids = ok.filter(x => String(x.unit || "").toLowerCase() === top);
    }
    setWiz({ mode, ids: new Set(ids.map(x => x.item_id)), pmode: "pct", parts: presetParts(presets(mode)[0]), lib: false, busy: false, err: "", skipped: [] });
  };
  const chosen = wiz ? plain.filter(x => wiz.ids.has(x.item_id)) : [];
  const chosenTotal = chosen.reduce((s, x) => s + num(x.planned_qty) * num(x.rate), 0);
  const key = wiz && wiz.pmode === "rate" ? "rate" : "pct";
  const sum = wiz ? wiz.parts.reduce((s, p) => s + num(p[key]), 0) : 0;
  const rates = new Set(chosen.map(x => r2(x.rate)));
  const oneRate = rates.size === 1 ? [...rates][0] : null;
  const partsOk = !!wiz && (wiz.lib || (wiz.parts.length >= 2 && wiz.parts.every(p => p.name.trim() && num(p[key]) > 0)
    && (wiz.pmode === "rate" || Math.abs(sum - 100) < 0.01)));
  const setPart = (i, patch) => setWiz(w => ({ ...w, parts: w.parts.map((p, j) => j === i ? { ...p, ...patch } : p) }));
  const toggle = (itemId) => setWiz(w => { const n = new Set(w.ids); if (n.has(itemId)) n.delete(itemId); else n.add(itemId); return { ...w, ids: n }; });

  const apply = async () => {
    const base = kind === "wo" ? "/subcon/wo/" + id : "/customer-estimates/" + id;
    const body = { item_ids: [...wiz.ids], strict: wiz.mode === "contract" };
    if (wiz.lib) body.from_library = true;
    else body.parts = wiz.parts.map(p => wiz.pmode === "rate"
      ? { name: p.name.trim(), rate: num(p.rate), group: p.group.trim() || null }
      : { name: p.name.trim(), pct: num(p.pct), group: p.group.trim() || null });
    setWiz(w => ({ ...w, busy: true, err: "", skipped: [] }));
    const r = await api.post(base + "/schedule/apply", body).catch(e => ({ success: false, message: e.message }));
    if (!r?.success) { setWiz(w => ({ ...w, busy: false, err: r?.message || t("schedule.failed"), skipped: r?.data?.skipped || [] })); return; }
    const skipped = r.data.skipped || [];
    setWiz(null);
    onDone && onDone(t("schedule.applied", { n: r.data.done.length, skipped: skipped.length })
      + (skipped.length ? " — " + skipped.map(s => (s.name || "#" + s.item_id) + ": " + s.reason).join("; ") : ""));
  };

  const card = (title, desc, stat, action) => (
    <div style={{ border: "1px solid " + T.b1, borderRadius: 8, padding: "9px 11px", background: T.surface, display: "grid", gap: 5, alignContent: "start", minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: T.t1 }}>{title}</div>
      <div style={{ fontSize: 10.5, color: T.t3, lineHeight: 1.45 }}>{desc}</div>
      {stat && <div style={{ fontSize: 10.5, color: T.ind, fontWeight: 700 }}>{stat}</div>}
      {action}
    </div>
  );
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.t2, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".4px" }}>{t("schedule.methods_title")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8 }}>
        {card(t("schedule.m_item"), t("schedule.m_item_desc"), t("schedule.m_item_stat", { n: plain.length }))}
        {card(t("schedule.m_parts"), t("schedule.m_parts_desc"), splitLines ? t("schedule.m_parts_stat", { n: splitLines }) : null,
          canEdit && <button type="button" disabled={!plain.length} onClick={() => open("parts")} style={btnS("soft", !plain.length)}>{t("schedule.m_parts_btn")}</button>)}
        {card(t("schedule.m_contract"), t("schedule.m_contract_desc"), null,
          canEdit && <button type="button" disabled={!plain.length} onClick={() => open("contract")} style={btnS("soft", !plain.length)}>{t("schedule.m_contract_btn")}</button>)}
        {kind === "wo" && card(t("schedule.m_naap"), t("schedule.m_naap_desc"), qtyCount ? t("schedule.m_naap_stat", { n: qtyCount }) : null)}
      </div>

      {wiz && (<>
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300 }} onClick={() => !wiz.busy && setWiz(null)} />
        <div role="dialog" aria-label={t(wiz.mode === "contract" ? "schedule.m_contract" : "schedule.m_parts")}
          style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 760, maxWidth: "96vw", maxHeight: "90vh",
            background: T.surface, borderRadius: 12, zIndex: 301, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.b1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t(wiz.mode === "contract" ? "schedule.m_contract" : "schedule.m_parts")}</div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 3, lineHeight: 1.45 }}>{t(wiz.mode === "contract" ? "schedule.wiz_contract_hint" : "schedule.wiz_parts_hint")}</div>
          </div>
          <div style={{ padding: "12px 18px", overflowY: "auto", flex: 1, display: "grid", gap: 12 }}>
            {/* Kaunsi line */}
            <div>
              <label style={lblS}>{t("schedule.wiz_lines", { n: wiz.ids.size, amt: fmtC(chosenTotal) })}</label>
              <div style={{ border: "1px solid " + T.b1, borderRadius: 8, maxHeight: 200, overflowY: "auto" }}>
                {plain.map(x => {
                  const lk = locked(x), ex = wiz.mode === "contract" && x.item_type === "extra";
                  return (
                    <label key={x.item_id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 10px", borderTop: "1px solid " + T.b1, fontSize: 11.5,
                      opacity: lk || ex ? 0.55 : 1, cursor: lk || ex ? "default" : "pointer" }}>
                      <input type="checkbox" disabled={lk || ex} checked={wiz.ids.has(x.item_id)} onChange={() => toggle(x.item_id)} />
                      <span style={{ flex: 1, minWidth: 0 }}><span style={{ color: T.t3 }}>{x.category ? x.category + " · " : ""}</span><b style={{ color: T.t1 }}>{nameOf(x)}</b></span>
                      <span style={{ color: T.t3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtQ(x.planned_qty)} {x.unit} × {fmtC(x.rate)} = {fmtC(num(x.planned_qty) * num(x.rate))}</span>
                      {lk && <span style={chip(T.ambL, T.amb)}>{t("schedule.wiz_locked")}</span>}
                      {ex && <span style={chip(T.redL, T.red)}>{t("stage_billing.extra_chip")}</span>}
                    </label>
                  );
                })}
                {!plain.length && <div style={{ padding: 10, fontSize: 11.5, color: T.t4 }}>{t("schedule.wiz_no_lines")}</div>}
              </div>
            </div>

            {/* Hisse */}
            {wiz.mode === "parts" && kind === "estimate" && (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.t2 }}>
                <input type="checkbox" checked={wiz.lib} onChange={e => setWiz(w => ({ ...w, lib: e.target.checked }))} />
                {t("schedule.wiz_lib")}
              </label>
            )}
            {!wiz.lib && (
              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  {wiz.mode === "parts" && [["pct", t("stage_billing.mode_pct")], ["rate", t("stage_billing.mode_rate")]].map(([m, l]) => (
                    <button key={m} type="button" onClick={() => setWiz(w => ({ ...w, pmode: m }))} style={{ ...btnS(wiz.pmode === m ? "primary" : "plain"), padding: "2px 10px" }}>{l}</button>
                  ))}
                  {presets(wiz.mode).map(p => (
                    <button key={p.key} type="button" onClick={() => setWiz(w => ({ ...w, pmode: "pct", parts: presetParts(p) }))} style={btnS("soft")}>{p.label}</button>
                  ))}
                </div>
                <datalist id="sch-grp-list"><option value={t("stage_billing.grp_civil")} /><option value={t("stage_billing.grp_finishing")} /></datalist>
                {wiz.parts.map((p, i, arr) => {
                  const cumPct = arr.slice(0, i + 1).reduce((s, x) => s + num(x.pct), 0);
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 80px 110px 150px auto", gap: 6, marginBottom: 4, alignItems: "center" }}>
                      <input value={p.name} placeholder={t("stage_billing.part_name_ph")} onChange={e => setPart(i, { name: e.target.value })} style={inpS} />
                      {wiz.pmode === "rate"
                        ? <input type="number" value={p.rate} placeholder="₹" aria-label={t("stage_billing.part_rate_ph")} onChange={e => setPart(i, { rate: e.target.value })} style={inpS} />
                        : <input type="number" value={p.pct} placeholder="%" onChange={e => setPart(i, { pct: e.target.value })} style={inpS} />}
                      <input value={p.group} list="sch-grp-list" placeholder={t("stage_billing.part_group_ph")} onChange={e => setPart(i, { group: e.target.value })} style={inpS} />
                      <span style={{ fontSize: 10.5, color: T.ind, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {wiz.mode === "contract" || wiz.pmode === "pct"
                          ? t("schedule.wiz_cum", { amt: fmtC(chosenTotal * num(p.pct) / 100), cum: r2(cumPct) })
                          : (oneRate ? r2(num(p.rate) / oneRate * 100) + "%" : "")}
                      </span>
                      <button type="button" disabled={wiz.parts.length <= 2} onClick={() => setWiz(w => ({ ...w, parts: w.parts.filter((_, j) => j !== i) }))} style={btnS("plain", wiz.parts.length <= 2)}>×</button>
                    </div>
                  );
                })}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 4 }}>
                  <button type="button" onClick={() => setWiz(w => ({ ...w, parts: [...w.parts, blankPart()] }))} style={btnS()}>{t("stage_billing.add_part")}</button>
                  <span style={{ fontSize: 11, fontWeight: 700, color: partsOk ? T.grn : T.red }}>
                    {wiz.pmode === "rate"
                      ? (oneRate ? t("stage_billing.parts_total_rate", { sum: fmtC(sum), rate: fmtC(oneRate), unit: chosen[0]?.unit || "—" }) : t("schedule.wiz_rate_scaled", { sum: fmtC(sum) }))
                      : t("stage_billing.parts_total", { pct: r2(sum) })}
                  </span>
                </div>
              </div>
            )}
            {wiz.err && (
              <div style={{ padding: "8px 10px", borderRadius: 7, background: T.redL, color: T.red, fontSize: 11.5 }}>
                {wiz.err}
                {wiz.skipped.length > 0 && <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{wiz.skipped.map(s => <li key={s.item_id}>{(s.name || "#" + s.item_id) + " — " + s.reason}</li>)}</ul>}
              </div>
            )}
          </div>
          <div style={{ padding: "12px 18px", borderTop: "1px solid " + T.b1, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={wiz.busy} onClick={() => setWiz(null)} style={btnS()}>{t("common.cancel")}</button>
            <button type="button" disabled={wiz.busy || !wiz.ids.size || !partsOk} onClick={apply} style={btnS("primary", wiz.busy || !wiz.ids.size || !partsOk)}>
              {wiz.busy ? t("common.saving_2") : t("schedule.wiz_apply", { n: wiz.ids.size })}
            </button>
          </div>
        </div>
      </>)}
    </div>
  );
}

// ── 2. Milestone-wise — hisse naam se jode (contract % / CLP ka asli roop) ──
export function MilestoneView({ items, links, setLink, taskOpts, canEdit }) {
  const contract = (items || []).filter(x => x.item_type !== "extra").reduce((s, x) => s + num(x.planned_qty) * num(x.rate), 0);
  const rows = useMemo(() => {
    const out = [], idx = {};
    for (const x of items || []) {
      if (!x.part_of || x.item_type === "extra") continue;
      const nm = partNameOf(x);
      if (idx[nm] === undefined) { idx[nm] = out.length; out.push({ name: nm, lines: [], cats: new Set() }); }
      out[idx[nm]].lines.push(x);
      out[idx[nm]].cats.add(x.category || x.section_title || "");
    }
    return out;
  }, [items]);
  if (!rows.length) return <div style={{ padding: 14, fontSize: 12, color: T.t3, border: "1px dashed " + T.b1, borderRadius: 8 }}>{t("schedule.ms_view_empty")}</div>;
  let cum = 0;
  return (
    <div style={{ overflowX: "auto", border: "1px solid " + T.b1, borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 720 }}>
        <thead><tr style={{ background: T.surfaceB, color: T.t3, fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".4px" }}>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>{t("schedule.ms_col_name")}</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>{t("schedule.ms_col_where")}</th>
          <th style={{ textAlign: "right", padding: "6px 8px" }}>{t("schedule.ms_col_amt")}</th>
          <th style={{ textAlign: "right", padding: "6px 8px" }}>{t("schedule.ms_col_pct")}</th>
          <th style={{ textAlign: "right", padding: "6px 8px" }}>{t("schedule.ms_col_billed")}</th>
          <th style={{ textAlign: "left", padding: "6px 8px", minWidth: 220 }}>{t("schedule.ms_col_task")}</th>
        </tr></thead>
        <tbody>
          {rows.map(r => {
            const amt = r.lines.reduce((s, x) => s + num(x.planned_qty) * num(x.rate), 0);
            const billed = r.lines.reduce((s, x) => s + num(x.billed_qty) * num(x.rate), 0);
            cum += amt;
            const tids = new Set(r.lines.map(x => String((links[x.item_id] || {}).task_id || "")));
            const cur = tids.size === 1 ? [...tids][0] : "__mixed";
            return (
              <tr key={r.name} style={{ borderTop: "1px solid " + T.b1 }}>
                <td style={{ padding: "7px 8px", fontWeight: 700, color: T.t1 }}>{r.name}</td>
                <td style={{ padding: "7px 8px", fontSize: 11, color: T.t3 }}>{[...r.cats].filter(Boolean).join(", ") || "—"} · {t("schedule.ms_lines", { n: r.lines.length })}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{fmtC(amt)}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: T.t2 }}>
                  {contract > 0 ? r2(amt / contract * 100) + "%" : "—"}
                  <div style={{ fontSize: 10, color: T.t4 }}>{t("schedule.ms_cum", { pct: contract > 0 ? r2(cum / contract * 100) : 0 })}</div>
                </td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: billed > 0 ? T.grn : T.t4 }}>{fmtC(billed)}</td>
                <td style={{ padding: "7px 8px" }}>
                  <select value={cur} disabled={!canEdit} onChange={e => { for (const x of r.lines) setLink(x.item_id, { task_id: e.target.value }); }} style={inpS}>
                    {cur === "__mixed" && <option value="__mixed">{t("schedule.ms_task_mixed")}</option>}
                    <option value="">{t("stage_billing.no_task")}</option>
                    {(taskOpts || []).map(x => <option key={x.id} value={String(x.id)}>{x.name} ({x.progress}%)</option>)}
                  </select>
                </td>
              </tr>
            );
          })}
          <tr style={{ background: T.surfaceB, fontWeight: 800 }}>
            <td style={{ padding: "7px 8px" }} colSpan={2}>{t("schedule.ms_total")}</td>
            <td style={{ padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtC(cum)}</td>
            <td style={{ padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{contract > 0 ? r2(cum / contract * 100) + "%" : "—"}</td>
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>
      <div style={{ padding: "6px 10px", fontSize: 10.5, color: T.t4 }}>{t("schedule.ms_hint")}</div>
    </div>
  );
}

// ── 3. Chuni client line se thekedar ka WO (pehle Stage Board me tha) ──
export function WoFromLinesModal({ lines, projectId, estimateNo, onClose, onDone }) {
  const [subList, setSubList] = useState(null);
  const [form, setForm] = useState(() => ({ subcon_name: "", retention_pct: "5", tds_pct: "2",
    lines: lines.map(l => ({ item_id: l.item_id, name: nameOf(l), category: l.category, unit: l.unit, qty: String(num(l.planned_qty ?? l.qty)), rate: "", task_id: l.task_id, part_of: l.part_of })) }));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let alive = true;
    api.get("/library/subcontractors").then(r => { if (alive && r?.success) setSubList(r.data || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const save = async () => {
    if (!form.subcon_name.trim()) { setMsg(t("stage_billing.wo_pick_subcon")); return; }
    const ls = form.lines.filter(l => num(l.qty) > 0 && num(l.rate) > 0);
    if (!ls.length) { setMsg(t("stage_billing.wo_need_rate")); return; }
    const secs = [], idx = {};
    for (const l of ls) {
      const k = l.category || "";
      if (idx[k] === undefined) { idx[k] = secs.length; secs.push({ title: l.category || t("stage_billing.no_category"), items: [] }); }
      secs[idx[k]].items.push({ description: (l.category ? "[" + l.category + "] " : "") + l.name, unit: l.unit, qty: num(l.qty), rate: num(l.rate),
        estimate_item_id: l.item_id, task_id: l.task_id || null, part_of: l.part_of || null });
    }
    setBusy(true);
    const r = await api.post("/subcon/work-orders", { project_id: projectId, subcon_name: form.subcon_name.trim(), subcon_category: "",
      description: t("stage_billing.wo_desc", { est: estimateNo || "" }), retention_pct: form.retention_pct, tds_pct: form.tds_pct,
      wo_type: "manual", sections: secs }).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setMsg(r?.message || t("stage_billing.save_failed")); return; }
    onDone(t("stage_billing.wo_made", { name: form.subcon_name.trim(), n: ls.length }));
  };
  return (<>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300 }} onClick={onClose} />
    <div role="dialog" aria-label={t("stage_billing.wo_title")} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 640, maxWidth: "95vw", maxHeight: "88vh",
      background: T.surface, borderRadius: 12, zIndex: 301, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.b1, fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("stage_billing.wo_title")}</div>
      <div style={{ padding: "14px 18px", overflowY: "auto", flex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><label style={lblS}>{t("stage_billing.wo_subcon")}</label>
            <select value={form.subcon_name} onChange={e => setForm(p => ({ ...p, subcon_name: e.target.value }))} style={inpS}>
              <option value="">{t("stage_billing.wo_pick_subcon")}</option>
              {(subList || []).map(s => <option key={s.id} value={s.name}>{s.name}{s.trade ? " · " + s.trade : ""}</option>)}
            </select></div>
          <div><label style={lblS}>{t("stage_billing.sd_pct")}</label><input type="number" value={form.retention_pct} onChange={e => setForm(p => ({ ...p, retention_pct: e.target.value }))} style={inpS} /></div>
          <div><label style={lblS}>{t("stage_billing.tds_pct")}</label><input type="number" value={form.tds_pct} onChange={e => setForm(p => ({ ...p, tds_pct: e.target.value }))} style={inpS} /></div>
        </div>
        <div style={{ fontSize: 10.5, color: T.t3, marginBottom: 6 }}>{t("stage_billing.wo_lines_hint")}</div>
        {form.lines.map((l, i) => (
          <div key={l.item_id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 90px 90px", gap: 6, alignItems: "center", padding: "5px 0", borderTop: "1px solid " + T.b1 }}>
            <div style={{ minWidth: 0, fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: T.t1 }}>{l.name}</div>
              <div style={{ fontSize: 10.5, color: T.t3 }}>{l.category} · {l.unit}</div>
            </div>
            <input type="number" value={l.qty} title={t("stage_billing.wo_qty")} onChange={e => setForm(p => ({ ...p, lines: p.lines.map((x, j) => j === i ? { ...x, qty: e.target.value } : x) }))} style={inpS} />
            <input type="number" value={l.rate} placeholder={t("stage_billing.wo_rate_ph")} onChange={e => setForm(p => ({ ...p, lines: p.lines.map((x, j) => j === i ? { ...x, rate: e.target.value } : x) }))} style={inpS} />
          </div>
        ))}
        {msg && <div style={{ marginTop: 8, fontSize: 11.5, color: T.red }}>{msg}</div>}
      </div>
      <div style={{ padding: "12px 18px", borderTop: "1px solid " + T.b1, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onClose} style={btnS()}>{t("common.cancel")}</button>
        <button type="button" disabled={busy} onClick={save} style={btnS("primary", busy)}>{busy ? t("common.saving_2") : t("stage_billing.wo_save")}</button>
      </div>
    </div>
  </>);
}
