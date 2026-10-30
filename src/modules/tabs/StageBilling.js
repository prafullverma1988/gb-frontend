// ════════════════════════════════════════════════════════════════
// Stage billing (30 Oct 2026, Prafull) — house construction ka floor ×
// stage × ₹/sqft bill, client invoice aur subcon RA bill dono line par.
//
//   StageBillGrid    — bill form: floor (category) ke group me har stage,
//                      aaj tak bill hua, task %, "Poora" / "Task % jitna"
//   StageLinesPanel  — line ka task (sujhaav ke saath), trigger %, pehle bill
//                      ho chuka (opening), fix hisse, extra qty ki had
//   StageBoard       — office ka ek screen: client line + subcon WO line,
//                      chuni line ka baaki ek saath Draft, estimate se WO
//   HandoverModal    — contract toota: WO band, baaki naye thekedar ko
// Server: routes/customer-estimates.js + routes/subcon.js (stage billing).
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(num(n) * 100) / 100;
const r3 = (n) => Math.round(num(n) * 1000) / 1000;
const fmtC = (v) => "₹" + num(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtQ = (v) => num(v).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const inpS = { padding: "5px 8px", borderRadius: 6, border: "1.5px solid " + T.b1, fontSize: 12, outline: "none",
  fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: T.surface };
const lblS = { fontSize: 9.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 3 };
const btnS = (kind = "plain", disabled = false) => ({
  padding: "5px 11px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: disabled ? "default" : "pointer",
  fontFamily: "inherit", opacity: disabled ? 0.55 : 1,
  ...(kind === "primary" ? { background: T.ind, color: "white", border: "1px solid " + T.ind }
    : kind === "danger" ? { background: T.redL, color: T.red, border: "1px solid " + T.redM }
    : kind === "soft" ? { background: T.indL, color: T.ind, border: "1px solid " + T.indL }
    : { background: T.surface, color: T.t2, border: "1px solid " + T.b1 }),
});
const chip = (bg, fg) => ({ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: bg, color: fg, whiteSpace: "nowrap" });

// Line ko floor (category) ke group me — section ke andar, aane ke kram me.
function groupLines(items) {
  const groups = [], idx = {};
  for (const it of items || []) {
    const key = (it.section_title || "") + "¦" + (it.category || "");
    if (idx[key] === undefined) { idx[key] = groups.length; groups.push({ key, section: it.section_title || "", category: it.category || "", rows: [] }); }
    groups[idx[key]].rows.push(it);
  }
  return groups;
}
// Floor ki saari line ek area par (ek unit, ek qty) ho tab ₹/unit = rakam ÷ area.
function perUnitOf(rows, amount, qtyKey = "planned_qty") {
  const units = new Set(rows.map(r => String(r.unit || "").toLowerCase()));
  const qtys = new Set(rows.map(r => r3(r[qtyKey])));
  if (units.size !== 1 || qtys.size !== 1) return null;
  const area = [...qtys][0];
  return area > 0 ? { value: amount / area, unit: rows[0].unit || "" } : null;
}
const nameOf = (it) => it.name || it.description || "";

// ── 1. Bill form grid ───────────────────────────────────────────────
// items = billing-ledger (mode manual) ki line. value = { [item_id]: "is bill qty" }.
export function StageBillGrid({ items, value, onChange, overBillMode }) {
  const groups = useMemo(() => groupLines(items), [items]);
  const set = (id, v) => onChange({ ...(value || {}), [id]: v });
  let totalThis = 0, anyOver = false;
  const body = groups.map(g => {
    let gThis = 0, gUpto = 0;
    const rows = g.rows.map(it => {
      const q = num((value || {})[it.item_id]);
      const rem = num(it.remaining_qty);
      const over = Math.max(0, r3(q - rem));
      if (over > 0) anyOver = true;
      const amt = r2(q * num(it.rate));
      gThis += amt;
      gUpto += num(it.billed_qty) * num(it.rate) + amt;
      const task = it.linked_task;
      const taskQty = task ? Math.max(0, r3(num(it.planned_qty) * num(task.progress) / 100 - num(it.billed_qty))) : 0;
      const done = num(it.planned_qty) > 0 && rem <= 0;
      return (
        <div key={it.item_id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) 90px 110px 150px 100px", gap: 8, alignItems: "center",
          padding: "7px 10px", borderTop: "1px solid " + T.b1, opacity: done && !overBillMode ? 0.6 : 1 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={nameOf(it)}>{nameOf(it)}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
              {it.item_type === "extra" && <span style={chip(T.redL, T.red)} title={it.approval_ref || ""}>{t("stage_billing.extra_chip")}</span>}
              {it.part_of && <span style={chip(T.sltL, T.slt)}>{t("stage_billing.part_of", { item: it.part_of })}</span>}
              {task && <span style={chip(task.eligible ? T.grnL : T.sltL, task.eligible ? T.grn : T.slt)} title={task.task_name}>{t("stage_billing.task_pct", { pct: task.progress, trigger: task.trigger_pct })}</span>}
              {num(it.opening_qty) > 0 && <span style={chip(T.ambL, T.amb)} title={it.opening_note || ""}>{t("stage_billing.opening_chip", { qty: fmtQ(it.opening_qty) })}</span>}
              {num(it.in_draft_qty) > 0 && <span style={chip(T.purL, T.pur)}>{t("stage_billing.in_draft", { qty: fmtQ(it.in_draft_qty) })}</span>}
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: T.t3, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtC(it.rate)}/{it.unit || "—"}</div>
          <div style={{ fontSize: 11, color: T.t3, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {fmtQ(it.billed_qty)} / {fmtQ(it.planned_qty)}
            <div style={{ fontSize: 9.5, color: T.t4 }}>{t("stage_billing.billed_of_boq")}</div>
          </div>
          <div>
            <input type="number" min="0" value={(value || {})[it.item_id] ?? ""} placeholder={done ? "0" : fmtQ(rem)}
              onChange={e => set(it.item_id, e.target.value)}
              style={{ ...inpS, borderColor: over > 0 ? T.red : T.b1, background: over > 0 ? T.redL : T.surface }} />
            <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
              <button type="button" disabled={rem <= 0} onClick={() => set(it.item_id, String(rem))} style={{ ...btnS("soft", rem <= 0), padding: "1px 6px", fontSize: 10 }}>{t("stage_billing.full")}</button>
              {task && <button type="button" disabled={taskQty <= 0} onClick={() => set(it.item_id, String(taskQty))} style={{ ...btnS("plain", taskQty <= 0), padding: "1px 6px", fontSize: 10 }}>{t("stage_billing.task_qty")}</button>}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: q > 0 ? (over > 0 ? T.red : T.grn) : T.t4, fontVariantNumeric: "tabular-nums" }}>
            {q > 0 ? fmtC(amt) : "—"}
            {over > 0 && <div style={{ fontSize: 9.5, fontWeight: 700, color: T.red }}>{t("stage_billing.extra_qty", { qty: fmtQ(over) })}</div>}
          </div>
        </div>
      );
    });
    totalThis += gThis;
    const pu = perUnitOf(g.rows, gUpto);
    return (
      <div key={g.key} style={{ border: "1px solid " + T.b1, borderRadius: 8, marginBottom: 10, overflow: "hidden", background: T.surface }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "7px 10px", background: T.indL }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: T.ind, letterSpacing: ".3px" }}>{g.category || g.section || t("stage_billing.no_category")}</span>
          <span style={{ fontSize: 11, color: T.ind, fontVariantNumeric: "tabular-nums" }}>
            {t("stage_billing.group_this_upto", { this: fmtC(gThis), upto: fmtC(gUpto) })}
            {pu && <> · {t("stage_billing.per_unit_upto", { rate: fmtC(pu.value), unit: pu.unit })}</>}
          </span>
        </div>
        {rows}
      </div>
    );
  });
  return (
    <div>
      <div style={{ fontSize: 11, color: T.t3, marginBottom: 8, lineHeight: 1.45 }}>{t("stage_billing.grid_hint")}</div>
      {body}
      {anyOver && !overBillMode && (
        <div style={{ padding: "8px 10px", borderRadius: 7, background: T.redL, color: T.red, fontSize: 11.5, fontWeight: 600, marginBottom: 8 }}>{t("stage_billing.over_needs_mode")}</div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, fontSize: 13, fontWeight: 800, color: T.t1, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: T.t3, fontWeight: 600 }}>{t("stage_billing.this_bill_total")}</span>{fmtC(totalThis)}
      </div>
    </div>
  );
}

// ── 2. Line ka task / opening / hisse / had ─────────────────────────
// kind = "estimate" | "wo". Sirf stage-wise (manual) ledger par.
export function StageLinesPanel({ kind, id, canEdit, canApprove }) {
  const base = kind === "wo" ? "/subcon/wo/" + id : "/customer-estimates/" + id;
  const [ledger, setLedger] = useState(null);
  const [sug, setSug] = useState(null);
  const [links, setLinks] = useState({});
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(null);   // { item_id, qty, note }
  const [split, setSplit] = useState(null);       // { item_id, parts: [{ name, pct }] }
  const [limit, setLimit] = useState("");

  const load = useCallback(async () => {
    const [l, s] = await Promise.all([
      api.get(base + "/billing-ledger").catch(() => null),
      api.get(base + "/task-suggest").catch(() => null),
    ]);
    if (l?.success) { setLedger(l.data); setLimit(l.data.extra_qty_limit_pct == null ? "" : String(l.data.extra_qty_limit_pct)); }
    if (s?.success) {
      setSug(s.data);
      const m = {};
      for (const x of s.data.lines || []) m[x.item_id] = { task_id: x.task_id ? String(x.task_id) : "", trigger_pct: String(x.trigger_pct || 100) };
      setLinks(m); setDirty(false);
    } else if (s && s.message) setMsg(s.message);
  }, [base]);
  useEffect(() => { load(); }, [load]);

  const sugById = useMemo(() => {
    const m = {};
    for (const x of sug?.lines || []) m[x.item_id] = x;
    return m;
  }, [sug]);
  const taskOpts = useMemo(() => (sug?.tasks || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name))), [sug]);
  if (!ledger || ledger.mode !== "manual") return null;
  const groups = groupLines(ledger.items);

  const setLink = (itemId, patch) => { setLinks(p => ({ ...p, [itemId]: { ...(p[itemId] || {}), ...patch } })); setDirty(true); };
  const applySuggestions = () => {
    setLinks(p => {
      const out = { ...p };
      for (const x of sug?.lines || []) {
        if (out[x.item_id]?.task_id || !x.suggestions?.length) continue;
        out[x.item_id] = { ...(out[x.item_id] || {}), task_id: String(x.suggestions[0].task_id) };
      }
      return out;
    });
    setDirty(true);
    setMsg(t("stage_billing.suggestions_applied"));
  };
  const saveLinks = async () => {
    const changed = [];
    for (const x of sug?.lines || []) {
      const cur = links[x.item_id] || {};
      const tid = cur.task_id ? Number(cur.task_id) : null, trg = Number(cur.trigger_pct) || 100;
      if ((x.task_id || null) !== tid || (x.trigger_pct || 100) !== trg) changed.push({ item_id: x.item_id, task_id: tid, trigger_pct: trg });
    }
    if (!changed.length) { setDirty(false); return; }
    setBusy(true);
    const r = await api.put(base + "/item-tasks", { links: changed }).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setMsg(r?.message || t("stage_billing.save_failed")); return; }
    const d = (r.data?.drafts || []).length;
    setMsg(d ? t("stage_billing.links_saved_drafts", { n: r.data.updated, d }) : t("stage_billing.links_saved", { n: r.data.updated }));
    await load();
  };
  const saveOpening = async () => {
    if (!opening) return;
    setBusy(true);
    const r = await api.put(base + "/items/" + opening.item_id + "/opening", { qty: num(opening.qty), note: opening.note || "" }).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setMsg(r?.message || t("stage_billing.save_failed")); return; }
    setOpening(null); setMsg(t("stage_billing.opening_saved")); await load();
  };
  const doSplit = async (fromLibrary) => {
    if (!split) return;
    setBusy(true);
    const body = fromLibrary ? { from_library: true } : { parts: split.parts.map(p => ({ name: p.name, pct: num(p.pct) })) };
    const r = await api.post(base + "/items/" + split.item_id + "/split", body).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setMsg(r?.message || t("stage_billing.save_failed")); return; }
    setSplit(null); setMsg(t("stage_billing.split_done", { n: (r.data?.lines || []).length })); await load();
  };
  const saveLimit = async () => {
    setBusy(true);
    const r = await api.put(base + "/extra-limit", { pct: limit === "" ? null : num(limit) }).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    setMsg(r?.success ? t("stage_billing.limit_saved") : (r?.message || t("stage_billing.save_failed")));
  };
  const unlinked = (sug?.lines || []).filter(x => !(links[x.item_id]?.task_id) && x.suggestions?.length).length;
  const splitSum = split ? split.parts.reduce((s, p) => s + num(p.pct), 0) : 0;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px",
        background: T.indL, borderRadius: "8px 8px 0 0", border: "1px solid " + T.indL }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: T.ind }}>{t("stage_billing.panel_title")}</div>
          <div style={{ fontSize: 10.5, color: T.t3, marginTop: 2 }}>{t("stage_billing.panel_hint")}</div>
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" disabled={!unlinked || busy} onClick={applySuggestions} style={btnS("soft", !unlinked || busy)}>{t("stage_billing.apply_suggestions", { n: unlinked })}</button>
            <button type="button" disabled={!dirty || busy} onClick={saveLinks} style={btnS("primary", !dirty || busy)}>{busy ? t("common.saving_2") : t("stage_billing.save_links")}</button>
          </div>
        )}
      </div>
      {msg && <div style={{ padding: "6px 12px", fontSize: 11.5, color: T.t2, background: T.surfaceB, borderLeft: "1px solid " + T.b1, borderRight: "1px solid " + T.b1 }}>{msg}</div>}
      <div style={{ border: "1px solid " + T.b1, borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden", background: T.surface }}>
        {groups.map(g => (
          <div key={g.key}>
            <div style={{ padding: "6px 12px", fontSize: 10.5, fontWeight: 800, color: T.slt, background: T.sltL, letterSpacing: ".4px", textTransform: "uppercase" }}>{g.category || g.section || t("stage_billing.no_category")}</div>
            {g.rows.map(it => {
              const s = sugById[it.item_id] || { suggestions: [] };
              const cur = links[it.item_id] || { task_id: "", trigger_pct: "100" };
              const sugIds = new Set((s.suggestions || []).map(x => String(x.task_id)));
              return (
                <div key={it.item_id} style={{ borderTop: "1px solid " + T.b1, padding: "8px 12px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1.6fr) 74px auto", gap: 8, alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={nameOf(it)}>{nameOf(it)}</div>
                      <div style={{ fontSize: 10.5, color: T.t3, fontVariantNumeric: "tabular-nums" }}>
                        {fmtQ(it.planned_qty)} {it.unit} × {fmtC(it.rate)} · {t("stage_billing.billed_short", { qty: fmtQ(it.billed_qty) })}
                        {num(it.opening_qty) > 0 && <> · <span style={{ color: T.amb }}>{t("stage_billing.opening_chip", { qty: fmtQ(it.opening_qty) })}</span></>}
                      </div>
                    </div>
                    <select value={cur.task_id} disabled={!canEdit} onChange={e => setLink(it.item_id, { task_id: e.target.value })} style={inpS}>
                      <option value="">{t("stage_billing.no_task")}</option>
                      {(s.suggestions || []).length > 0 && (
                        <optgroup label={t("stage_billing.suggested")}>
                          {s.suggestions.map(x => <option key={"s" + x.task_id} value={String(x.task_id)}>{x.task_name} ({x.progress}%)</option>)}
                        </optgroup>
                      )}
                      <optgroup label={t("stage_billing.all_tasks")}>
                        {taskOpts.filter(x => !sugIds.has(String(x.id))).map(x => <option key={x.id} value={String(x.id)}>{x.name} ({x.progress}%)</option>)}
                      </optgroup>
                    </select>
                    <input type="number" min="1" max="100" value={cur.trigger_pct} disabled={!canEdit || !cur.task_id}
                      onChange={e => setLink(it.item_id, { trigger_pct: e.target.value })} title={t("stage_billing.trigger_title")} style={inpS} />
                    {canEdit && (
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button type="button" onClick={() => setOpening({ item_id: it.item_id, qty: String(it.opening_qty || ""), note: it.opening_note || "" })} style={btnS()}>{t("stage_billing.opening_btn")}</button>
                        {kind === "estimate" && !it.part_of && (
                          <button type="button" onClick={() => setSplit({ item_id: it.item_id, parts: [{ name: "", pct: "" }, { name: "", pct: "" }] })} style={btnS()}>{t("stage_billing.split_btn")}</button>
                        )}
                      </div>
                    )}
                  </div>
                  {opening && opening.item_id === it.item_id && (
                    <div style={{ display: "grid", gridTemplateColumns: "120px minmax(0,1fr) auto", gap: 8, alignItems: "end", marginTop: 8, padding: 8, background: T.ambL, borderRadius: 6 }}>
                      <div><label style={lblS}>{t("stage_billing.opening_qty")}</label>
                        <input type="number" min="0" value={opening.qty} onChange={e => setOpening(p => ({ ...p, qty: e.target.value }))} style={inpS} /></div>
                      <div><label style={lblS}>{t("stage_billing.opening_note")}</label>
                        <input value={opening.note} maxLength={300} placeholder={t("stage_billing.opening_note_ph")} onChange={e => setOpening(p => ({ ...p, note: e.target.value }))} style={inpS} /></div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button type="button" onClick={() => setOpening(null)} style={btnS()}>{t("common.cancel")}</button>
                        <button type="button" disabled={busy} onClick={saveOpening} style={btnS("primary", busy)}>{t("common.save")}</button>
                      </div>
                      <div style={{ gridColumn: "1 / -1", fontSize: 10.5, color: T.amb }}>{t("stage_billing.opening_hint")}</div>
                    </div>
                  )}
                  {split && split.item_id === it.item_id && (
                    <div style={{ marginTop: 8, padding: 8, background: T.sltL, borderRadius: 6 }}>
                      <div style={{ fontSize: 10.5, color: T.t3, marginBottom: 6 }}>{t("stage_billing.split_hint")}</div>
                      {split.parts.map((p, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 80px 70px auto", gap: 6, marginBottom: 4, alignItems: "center" }}>
                          <input value={p.name} placeholder={t("stage_billing.part_name_ph")} onChange={e => setSplit(s => ({ ...s, parts: s.parts.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} style={inpS} />
                          <input type="number" value={p.pct} placeholder="%" onChange={e => setSplit(s => ({ ...s, parts: s.parts.map((x, j) => j === i ? { ...x, pct: e.target.value } : x) }))} style={inpS} />
                          <span style={{ fontSize: 11, color: T.t3, fontVariantNumeric: "tabular-nums" }}>{fmtC(num(it.rate) * num(p.pct) / 100)}</span>
                          <button type="button" disabled={split.parts.length <= 2} onClick={() => setSplit(s => ({ ...s, parts: s.parts.filter((_, j) => j !== i) }))} style={btnS("plain", split.parts.length <= 2)}>×</button>
                        </div>
                      ))}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 6 }}>
                        <button type="button" onClick={() => setSplit(s => ({ ...s, parts: [...s.parts, { name: "", pct: "" }] }))} style={btnS()}>{t("stage_billing.add_part")}</button>
                        <span style={{ fontSize: 11, fontWeight: 700, color: Math.abs(splitSum - 100) < 0.01 ? T.grn : T.red }}>{t("stage_billing.parts_total", { pct: r2(splitSum) })}</span>
                        <div style={{ flex: 1 }} />
                        <button type="button" disabled={busy} onClick={() => doSplit(true)} style={btnS("soft", busy)}>{t("stage_billing.split_from_library")}</button>
                        <button type="button" onClick={() => setSplit(null)} style={btnS()}>{t("common.cancel")}</button>
                        <button type="button" disabled={busy || Math.abs(splitSum - 100) > 0.01} onClick={() => doSplit(false)} style={btnS("primary", busy || Math.abs(splitSum - 100) > 0.01)}>{t("stage_billing.split_save")}</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {canApprove && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "9px 12px", borderTop: "1px solid " + T.b1, background: T.surfaceB }}>
            <span style={{ fontSize: 11.5, color: T.t2, fontWeight: 600 }}>{t("stage_billing.limit_label")}</span>
            <input type="number" min="0" max="100" value={limit} placeholder={t("stage_billing.limit_none")} onChange={e => setLimit(e.target.value)} style={{ ...inpS, width: 90 }} />
            <span style={{ fontSize: 11, color: T.t3 }}>%</span>
            <button type="button" disabled={busy} onClick={saveLimit} style={btnS("plain", busy)}>{t("common.save")}</button>
            <span style={{ fontSize: 10.5, color: T.t4 }}>{t("stage_billing.limit_hint")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 3. Stage Board ──────────────────────────────────────────────────
export function StageBoard({ estimateId, projectId, subcons }) {
  const [data, setData] = useState(null);
  const [subList, setSubList] = useState(subcons || null);
  const [err, setErr] = useState("");
  const [selItems, setSelItems] = useState(() => new Set());
  const [selWo, setSelWo] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [woForm, setWoForm] = useState(null);
  const [extraOpen, setExtraOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await api.get("/customer-estimates/" + estimateId + "/stage-board").catch(e => ({ success: false, message: e.message }));
    if (r?.success) { setData(r.data); setErr(""); } else setErr(r?.message || t("stage_billing.load_failed"));
  }, [estimateId]);
  useEffect(() => { load(); setSelItems(new Set()); setSelWo(new Set()); }, [load]);

  if (err) return <div style={{ padding: 18, color: T.red, fontSize: 12.5 }}>{err}</div>;
  if (!data) return <div style={{ padding: 18, color: T.t4, fontSize: 12 }}>{t("common.loading")}</div>;

  const woLines = (data.wos || []).flatMap(w => w.lines.map(l => ({ ...l, wo: w })));
  const used = new Set();
  const attach = (line) => woLines.filter(l => {
    const hit = l.estimate_item_id ? l.estimate_item_id === line.item_id : (line.task_id && l.task_id === line.task_id);
    if (hit) used.add(l.wo_item_id);
    return hit;
  });
  const groups = groupLines(data.lines.map(l => ({ ...l, planned_qty: l.qty })));
  const rows = groups.map(g => ({ ...g, rows: g.rows.map(l => ({ ...l, subs: attach(l) })) }));
  const orphan = woLines.filter(l => !used.has(l.wo_item_id));
  const task = (id) => (id && data.tasks[id]) || null;
  const toggle = (set, setter, id) => { const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); setter(n); };
  const canBill = (data.can.estimate_create && selItems.size > 0) || (data.can.subcon_create && selWo.size > 0);

  const billNow = async () => {
    setBusy(true); setMsg("");
    const r = await api.post("/customer-estimates/" + estimateId + "/stage-board/bill",
      { item_ids: [...selItems], wo_item_ids: [...selWo] }).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setMsg(r?.message || t("stage_billing.save_failed")); return; }
    const parts = [];
    if (r.data.client) parts.push(t("stage_billing.client_draft_made", { no: r.data.client.invoice_no, amt: fmtC(r.data.client.lines.reduce((s, x) => s + num(x.amount), 0)) }));
    for (const d of r.data.subcon || []) parts.push(t("stage_billing.subcon_draft_made", { no: d.bill_no, name: d.subcon_name, amt: fmtC(d.gross) }));
    for (const s of r.data.skipped || []) parts.push(t("stage_billing.skipped_" + (s.reason || "other")));
    setMsg(parts.length ? parts.join(" · ") : t("stage_billing.nothing_left"));
    setSelItems(new Set()); setSelWo(new Set());
    await load();
  };
  const openWoForm = () => {
    if (!subList) api.get("/library/subcontractors").then(r => { if (r?.success) setSubList(r.data || []); }).catch(() => {});
    const lines = data.lines.filter(l => selItems.has(l.item_id));
    setWoForm({ subcon_name: "", retention_pct: "5", tds_pct: "2",
      lines: lines.map(l => ({ item_id: l.item_id, name: l.description, category: l.category, unit: l.unit, qty: String(l.qty), rate: "", task_id: l.task_id, part_of: l.part_of })) });
  };
  const saveWo = async () => {
    if (!woForm.subcon_name.trim()) { setMsg(t("stage_billing.wo_pick_subcon")); return; }
    const lines = woForm.lines.filter(l => num(l.qty) > 0 && num(l.rate) > 0);
    if (!lines.length) { setMsg(t("stage_billing.wo_need_rate")); return; }
    const secs = [], idx = {};
    for (const l of lines) {
      const k = l.category || "";
      if (idx[k] === undefined) { idx[k] = secs.length; secs.push({ title: l.category || t("stage_billing.no_category"), items: [] }); }
      secs[idx[k]].items.push({ description: (l.category ? "[" + l.category + "] " : "") + l.name, unit: l.unit, qty: num(l.qty), rate: num(l.rate),
        estimate_item_id: l.item_id, task_id: l.task_id || null, part_of: l.part_of || null });
    }
    setBusy(true);
    const r = await api.post("/subcon/work-orders", { project_id: projectId, subcon_name: woForm.subcon_name.trim(), subcon_category: "",
      description: t("stage_billing.wo_desc", { est: data.estimate.estimate_no || "" }), retention_pct: woForm.retention_pct, tds_pct: woForm.tds_pct,
      wo_type: "manual", sections: secs }).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setMsg(r?.message || t("stage_billing.save_failed")); return; }
    setWoForm(null); setSelItems(new Set());
    setMsg(t("stage_billing.wo_made", { name: woForm.subcon_name.trim(), n: lines.length }));
    await load();
  };

  const subHead = data.can.subcon_view;
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 11.5, color: T.t3, flex: "1 1 260px", lineHeight: 1.45 }}>{t("stage_billing.board_hint")}</div>
        {(data.can.estimate_edit || data.can.subcon_create) && <button type="button" disabled={busy} onClick={() => setExtraOpen(true)} style={btnS("danger", busy)}>{t("stage_billing.extra_btn")}</button>}
        {data.can.subcon_create && <button type="button" disabled={!selItems.size || busy} onClick={openWoForm} style={btnS("plain", !selItems.size || busy)}>{t("stage_billing.make_wo", { n: selItems.size })}</button>}
        <button type="button" disabled={!canBill || busy} onClick={billNow} style={btnS("primary", !canBill || busy)}>{busy ? t("common.saving_2") : t("stage_billing.bill_selected", { n: selItems.size + selWo.size })}</button>
      </div>
      {msg && <div style={{ padding: "7px 10px", borderRadius: 7, background: T.indL, color: T.ind, fontSize: 11.5, fontWeight: 600, marginBottom: 10 }}>{msg}</div>}
      {data.estimate.billing_method !== "manual" && <div style={{ padding: "7px 10px", borderRadius: 7, background: T.ambL, color: T.amb, fontSize: 11.5, marginBottom: 10 }}>{t("stage_billing.board_not_stage_wise")}</div>}

      {rows.map(g => {
        const cUpto = g.rows.reduce((s, l) => s + num(l.billed_amount), 0);
        const sUpto = g.rows.reduce((s, l) => s + l.subs.reduce((a, x) => a + num(x.billed_amount), 0), 0);
        const pu = perUnitOf(g.rows, cUpto);
        return (
          <div key={g.key} style={{ border: "1px solid " + T.b1, borderRadius: 8, marginBottom: 12, overflow: "hidden", background: T.surface }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, padding: "8px 12px", background: T.indL }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: T.ind, letterSpacing: ".3px" }}>{g.category || g.section || t("stage_billing.no_category")}</span>
              <span style={{ fontSize: 11, color: T.ind, fontVariantNumeric: "tabular-nums" }}>
                {t("stage_billing.board_client_upto", { amt: fmtC(cUpto) })}{pu && <> ({t("stage_billing.per_unit_upto", { rate: fmtC(pu.value), unit: pu.unit })})</>}
                {subHead && <> · {t("stage_billing.board_subcon_upto", { amt: fmtC(sUpto) })} · {t("stage_billing.board_diff", { amt: fmtC(cUpto - sUpto) })}</>}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, minWidth: subHead ? 760 : 480 }}>
                <thead>
                  <tr style={{ background: T.surfaceB, color: T.t3, fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".4px" }}>
                    <th style={{ width: 26 }} />
                    <th style={{ textAlign: "left", padding: "6px 8px" }}>{t("stage_billing.col_stage")}</th>
                    <th style={{ textAlign: "left", padding: "6px 8px" }}>{t("stage_billing.col_task")}</th>
                    <th style={{ textAlign: "right", padding: "6px 8px" }}>{t("stage_billing.col_client")}</th>
                    {subHead && <th style={{ textAlign: "left", padding: "6px 8px" }}>{t("stage_billing.col_subcon")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map(l => {
                    const tk = task(l.task_id);
                    const rem = r3(num(l.qty) - num(l.billed_qty));
                    return (
                      <tr key={l.item_id} style={{ borderTop: "1px solid " + T.b1, verticalAlign: "top" }}>
                        <td style={{ padding: "7px 4px 7px 10px" }}>
                          <input type="checkbox" disabled={rem <= 0 || !data.can.estimate_create} checked={selItems.has(l.item_id)} onChange={() => toggle(selItems, setSelItems, l.item_id)} />
                        </td>
                        <td style={{ padding: "7px 8px" }}>
                          <div style={{ fontWeight: 600, color: T.t1 }}>{l.description} {l.item_type === "extra" && <span style={chip(T.redL, T.red)}>{t("stage_billing.extra_chip")}</span>}</div>
                          <div style={{ fontSize: 10.5, color: T.t3, fontVariantNumeric: "tabular-nums" }}>{fmtQ(l.qty)} {l.unit} · {fmtC(l.rate)}/{l.unit || "—"}</div>
                        </td>
                        <td style={{ padding: "7px 8px" }}>
                          {tk ? <span style={chip(tk.progress >= l.trigger_pct ? T.grnL : T.sltL, tk.progress >= l.trigger_pct ? T.grn : T.slt)} title={tk.name}>{tk.name.slice(0, 28)} · {tk.progress}%</span>
                              : <span style={{ fontSize: 10.5, color: T.t4 }}>{t("stage_billing.no_task")}</span>}
                        </td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          <div style={{ fontWeight: 700, color: T.t1 }}>{fmtC(l.billed_amount)}</div>
                          <div style={{ fontSize: 10.5, color: T.t3 }}>{fmtQ(l.billed_qty)} / {fmtQ(l.qty)}</div>
                          {num(l.draft_qty) > 0 && <span style={chip(T.purL, T.pur)}>{t("stage_billing.draft_chip", { no: l.draft_no || "" })}</span>}
                        </td>
                        {subHead && (
                          <td style={{ padding: "7px 8px" }}>
                            {l.subs.length === 0 && <span style={{ fontSize: 10.5, color: T.t4 }}>—</span>}
                            {l.subs.map(x => {
                              const xr = r3(num(x.qty) - num(x.billed_qty));
                              return (
                                <label key={x.wo_item_id} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 3, cursor: x.wo.billable ? "pointer" : "default" }}>
                                  <input type="checkbox" disabled={xr <= 0 || !x.wo.billable || !data.can.subcon_create} checked={selWo.has(x.wo_item_id)} onChange={() => toggle(selWo, setSelWo, x.wo_item_id)} />
                                  <span style={{ minWidth: 0 }}>
                                    <span style={{ fontWeight: 600, color: T.t2 }}>{x.wo.subcon_name}</span>
                                    <span style={{ color: T.t3 }}> · {x.description} · {fmtC(x.rate)}/{x.unit || "—"}</span>
                                    <span style={{ display: "block", fontSize: 10.5, color: T.t3, fontVariantNumeric: "tabular-nums" }}>
                                      {fmtC(x.billed_amount)} ({fmtQ(x.billed_qty)} / {fmtQ(x.qty)}){x.wo.status === "Closed" ? " · " + t("stage_billing.wo_closed") : ""}
                                      {num(x.draft_qty) > 0 ? " · " + t("stage_billing.draft_chip", { no: x.draft_no || "" }) : ""}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {subHead && orphan.length > 0 && (
        <div style={{ border: "1px solid " + T.b1, borderRadius: 8, marginBottom: 12, background: T.surface }}>
          <div style={{ padding: "8px 12px", background: T.sltL, fontSize: 11.5, fontWeight: 800, color: T.slt }}>{t("stage_billing.only_subcon")}</div>
          {orphan.map(x => {
            const xr = r3(num(x.qty) - num(x.billed_qty));
            return (
              <label key={x.wo_item_id} style={{ display: "flex", gap: 8, padding: "6px 12px", borderTop: "1px solid " + T.b1, fontSize: 11.5 }}>
                <input type="checkbox" disabled={xr <= 0 || !x.wo.billable || !data.can.subcon_create} checked={selWo.has(x.wo_item_id)} onChange={() => toggle(selWo, setSelWo, x.wo_item_id)} />
                <span><b>{x.wo.subcon_name}</b> · {x.description} · {fmtC(x.rate)}/{x.unit || "—"} · {fmtC(x.billed_amount)} ({fmtQ(x.billed_qty)} / {fmtQ(x.qty)})</span>
              </label>
            );
          })}
        </div>
      )}

      {extraOpen && (
        <ExtraWorkModal data={data} estimateId={estimateId} onClose={() => setExtraOpen(false)}
          onDone={async (m) => { setExtraOpen(false); setMsg(m); await load(); }} />
      )}

      {woForm && (<>
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300 }} onClick={() => setWoForm(null)} />
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 640, maxWidth: "95vw", maxHeight: "88vh",
          background: T.surface, borderRadius: 12, zIndex: 301, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.b1, fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("stage_billing.wo_title")}</div>
          <div style={{ padding: "14px 18px", overflowY: "auto", flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div><label style={lblS}>{t("stage_billing.wo_subcon")}</label>
                <select value={woForm.subcon_name} onChange={e => setWoForm(p => ({ ...p, subcon_name: e.target.value }))} style={inpS}>
                  <option value="">{t("stage_billing.wo_pick_subcon")}</option>
                  {(subList || []).map(s => <option key={s.id} value={s.name}>{s.name}{s.trade ? " · " + s.trade : ""}</option>)}
                </select></div>
              <div><label style={lblS}>{t("stage_billing.sd_pct")}</label><input type="number" value={woForm.retention_pct} onChange={e => setWoForm(p => ({ ...p, retention_pct: e.target.value }))} style={inpS} /></div>
              <div><label style={lblS}>{t("stage_billing.tds_pct")}</label><input type="number" value={woForm.tds_pct} onChange={e => setWoForm(p => ({ ...p, tds_pct: e.target.value }))} style={inpS} /></div>
            </div>
            <div style={{ fontSize: 10.5, color: T.t3, marginBottom: 6 }}>{t("stage_billing.wo_lines_hint")}</div>
            {woForm.lines.map((l, i) => (
              <div key={l.item_id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 90px 90px", gap: 6, alignItems: "center", padding: "5px 0", borderTop: "1px solid " + T.b1 }}>
                <div style={{ minWidth: 0, fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: T.t1 }}>{l.name}</div>
                  <div style={{ fontSize: 10.5, color: T.t3 }}>{l.category} · {l.unit}</div>
                </div>
                <input type="number" value={l.qty} title={t("stage_billing.wo_qty")} onChange={e => setWoForm(p => ({ ...p, lines: p.lines.map((x, j) => j === i ? { ...x, qty: e.target.value } : x) }))} style={inpS} />
                <input type="number" value={l.rate} placeholder={t("stage_billing.wo_rate_ph")} onChange={e => setWoForm(p => ({ ...p, lines: p.lines.map((x, j) => j === i ? { ...x, rate: e.target.value } : x) }))} style={inpS} />
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 18px", borderTop: "1px solid " + T.b1, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setWoForm(null)} style={btnS()}>{t("common.cancel")}</button>
            <button type="button" disabled={busy} onClick={saveWo} style={btnS("primary", busy)}>{busy ? t("common.saving_2") : t("stage_billing.wo_save")}</button>
          </div>
        </div>
      </>)}
    </div>
  );
}

// ── 3b. Extra kaam — "kharcha kaun dega" (31 Oct 2026, Prafull) ─────
// Client  → estimate me Extra line (client ki manzoori), chahe to jo thekedar
//           karega uske WO me bhi Extra line (subcon rate)
// Company → sirf karne wale thekedar ke WO me Extra line (site order)
// Galti   → karne wale ke WO me Extra line + galti wale thekedar ke agle RA
//           bill se katauti (Subcon APPROVE)
// Contract value nahi badalti; Extra ka jod alag. Alag approval nahi — rok bill par.
const todayYmd = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
export function ExtraWorkModal({ data, estimateId, onClose, onDone }) {
  const can = data.can || {};
  const live = (data.wos || []).filter(w => w.status !== "Closed" && w.status !== "Completed");
  const opts = [
    can.estimate_edit && { id: "client", l: t("stage_billing.bearer_client") },
    can.subcon_create && { id: "company", l: t("stage_billing.bearer_company") },
    can.subcon_create && can.subcon_approve && { id: "fault", l: t("stage_billing.bearer_fault") },
  ].filter(Boolean);
  const [f, setF] = useState({ bearer: opts[0] ? opts[0].id : "client", description: "", unit: "LS", qty: "1", approval_ref: "", approval_date: todayYmd(),
    client_rate: "", doer_wo: "", doer_rate: "", fault_wo: "", fault_amount: "", fault_reason: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const save = async () => {
    const desc = f.description.trim(), ref = f.approval_ref.trim(), qty = num(f.qty);
    if (!desc || !(qty > 0)) { setMsg(t("stage_billing.extra_need_fields")); return; }
    if (ref.length < 3) { setMsg(t("stage_billing.extra_need_ref")); return; }
    const base = { description: desc, unit: f.unit, qty, approval_ref: ref, approval_date: f.approval_date };
    const wantWo = f.bearer !== "client" || (f.doer_wo && num(f.doer_rate) > 0);
    if (f.bearer === "client" && !(f.client_rate !== "" && num(f.client_rate) >= 0)) { setMsg(t("stage_billing.extra_need_client_rate")); return; }
    if (f.bearer !== "client" && !(f.doer_wo && f.doer_rate !== "")) { setMsg(t("stage_billing.extra_need_doer")); return; }
    if (f.bearer === "fault" && (!f.fault_wo || !(num(f.fault_amount) > 0) || f.fault_reason.trim().length < 3)) { setMsg(t("stage_billing.extra_need_fault")); return; }
    setBusy(true); setMsg("");
    const done = [];
    let clientItem = null;
    if (f.bearer === "client") {
      const r = await api.post("/customer-estimates/" + estimateId + "/extra-items", { ...base, rate: num(f.client_rate) }).catch(e => ({ success: false, message: e.message }));
      if (!r?.success) { setBusy(false); setMsg(r?.message || t("stage_billing.save_failed")); return; }
      clientItem = r.data.item_id;
      done.push(t("stage_billing.extra_client_done", { amt: fmtC(r.data.amount) }));
    }
    if (wantWo) {
      const body = { ...base, rate: num(f.doer_rate), estimate_item_id: clientItem,
        ...(f.bearer === "fault" ? { backcharge: { wo_id: Number(f.fault_wo), amount: num(f.fault_amount), reason: f.fault_reason.trim() } } : {}) };
      const r = await api.post("/subcon/work-orders/" + f.doer_wo + "/extra-items", body).catch(e => ({ success: false, message: e.message }));
      if (!r?.success) { setBusy(false); setMsg((done.length ? done.join(" · ") + " · " : "") + (r?.message || t("stage_billing.save_failed"))); return; }
      done.push(t("stage_billing.extra_wo_done", { amt: fmtC(r.data.amount) }));
      if (r.data.backcharge_id) done.push(t("stage_billing.extra_fault_done", { amt: fmtC(f.fault_amount) }));
    }
    setBusy(false);
    onDone && onDone(done.join(" · "));
  };
  const woOpts = (list) => list.map(w => <option key={w.wo_id} value={String(w.wo_id)}>{w.subcon_name}{w.description ? " · " + w.description : ""}</option>);
  return (<>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300 }} onClick={onClose} />
    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, maxWidth: "95vw", maxHeight: "90vh",
      background: T.surface, borderRadius: 12, zIndex: 301, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.b1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("stage_billing.extra_title")}</div>
        <div style={{ fontSize: 11, color: T.t3, marginTop: 3, lineHeight: 1.45 }}>{t("stage_billing.extra_hint")}</div>
      </div>
      <div style={{ padding: "14px 18px", overflowY: "auto", flex: 1, display: "grid", gap: 10 }}>
        <div><label style={lblS}>{t("stage_billing.extra_work")}</label>
          <input value={f.description} maxLength={250} placeholder={t("stage_billing.extra_work_ph")} onChange={e => set("description", e.target.value)} style={inpS} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={lblS}>{t("stage_billing.extra_unit")}</label><input value={f.unit} maxLength={20} onChange={e => set("unit", e.target.value)} style={inpS} /></div>
          <div><label style={lblS}>{t("stage_billing.wo_qty")}</label><input type="number" value={f.qty} onChange={e => set("qty", e.target.value)} style={inpS} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 1fr", gap: 10 }}>
          <div><label style={lblS}>{t("stage_billing.extra_ref")}</label>
            <input value={f.approval_ref} maxLength={160} placeholder={t("stage_billing.extra_ref_ph")} onChange={e => set("approval_ref", e.target.value)} style={inpS} /></div>
          <div><label style={lblS}>{t("stage_billing.extra_date")}</label><input type="date" value={f.approval_date} onChange={e => set("approval_date", e.target.value)} style={inpS} /></div>
        </div>
        <div>
          <label style={lblS}>{t("stage_billing.bearer")}</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {opts.map(o => (
              <button key={o.id} type="button" onClick={() => set("bearer", o.id)}
                style={{ ...btnS(f.bearer === o.id ? "primary" : "plain"), padding: "6px 12px" }}>{o.l}</button>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: T.t3, marginTop: 5 }}>{t("stage_billing.bearer_hint_" + f.bearer)}</div>
        </div>
        {f.bearer === "client" && (
          <div><label style={lblS}>{t("stage_billing.extra_client_rate")}</label>
            <input type="number" value={f.client_rate} onChange={e => set("client_rate", e.target.value)} style={inpS} /></div>
        )}
        {f.bearer === "fault" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) 1fr", gap: 10, padding: 10, background: T.redL, borderRadius: 7 }}>
            <div><label style={lblS}>{t("stage_billing.fault_wo")}</label>
              <select value={f.fault_wo} onChange={e => set("fault_wo", e.target.value)} style={inpS}>
                <option value="">{t("stage_billing.wo_pick_subcon")}</option>{woOpts(data.wos || [])}
              </select></div>
            <div><label style={lblS}>{t("stage_billing.fault_amount")}</label>
              <input type="number" value={f.fault_amount} onChange={e => set("fault_amount", e.target.value)} style={inpS} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={lblS}>{t("stage_billing.fault_reason")}</label>
              <input value={f.fault_reason} maxLength={500} onChange={e => set("fault_reason", e.target.value)} style={inpS} /></div>
          </div>
        )}
        {can.subcon_create && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) 1fr", gap: 10 }}>
            <div><label style={lblS}>{f.bearer === "client" ? t("stage_billing.doer_wo_optional") : t("stage_billing.doer_wo")}</label>
              <select value={f.doer_wo} onChange={e => set("doer_wo", e.target.value)} style={inpS}>
                <option value="">{t("stage_billing.wo_pick_subcon")}</option>{woOpts(live)}
              </select></div>
            <div><label style={lblS}>{t("stage_billing.doer_rate")}</label>
              <input type="number" value={f.doer_rate} onChange={e => set("doer_rate", e.target.value)} style={inpS} /></div>
          </div>
        )}
        {msg && <div style={{ padding: "7px 10px", borderRadius: 7, background: T.redL, color: T.red, fontSize: 11.5 }}>{msg}</div>}
      </div>
      <div style={{ padding: "12px 18px", borderTop: "1px solid " + T.b1, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onClose} style={btnS()}>{t("common.cancel")}</button>
        <button type="button" disabled={busy || !opts.length} onClick={save} style={btnS("primary", busy || !opts.length)}>{busy ? t("common.saving_2") : t("stage_billing.extra_save")}</button>
      </div>
    </div>
  </>);
}

// ── 4. Contract toota — baaki naye thekedar ko ──────────────────────
export function HandoverModal({ wo, subcons, onClose, onDone }) {
  const [ledger, setLedger] = useState(null);
  const [form, setForm] = useState({ subcon_name: "", reason: "", retention_pct: String(wo.retention_pct ?? 5), tds_pct: String(wo.tds_pct ?? 2), rates: {} });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api.get("/subcon/wo/" + wo.id + "/billing-ledger").then(r => { if (r?.success) setLedger(r.data); }).catch(() => {});
  }, [wo.id]);
  const left = (ledger?.items || []).filter(it => num(it.remaining_qty) > 0);
  const save = async () => {
    if (!form.subcon_name) { setMsg(t("stage_billing.wo_pick_subcon")); return; }
    if (form.reason.trim().length < 3) { setMsg(t("stage_billing.handover_reason_need")); return; }
    setBusy(true);
    const r = await api.post("/subcon/work-orders/" + wo.id + "/handover", {
      subcon_name: form.subcon_name, reason: form.reason.trim(), retention_pct: form.retention_pct, tds_pct: form.tds_pct, rates: form.rates,
    }).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setMsg(r?.message || t("stage_billing.save_failed")); return; }
    onDone && onDone(r.data);
  };
  return (<>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300 }} onClick={onClose} />
    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 620, maxWidth: "95vw", maxHeight: "88vh",
      background: T.surface, borderRadius: 12, zIndex: 301, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.b1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("stage_billing.handover_title")}</div>
        <div style={{ fontSize: 11, color: T.t3, marginTop: 3, lineHeight: 1.45 }}>{t("stage_billing.handover_hint", { name: wo.subcon_name || "" })}</div>
      </div>
      <div style={{ padding: "14px 18px", overflowY: "auto", flex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lblS}>{t("stage_billing.handover_new_subcon")}</label>
            <select value={form.subcon_name} onChange={e => setForm(p => ({ ...p, subcon_name: e.target.value }))} style={inpS}>
              <option value="">{t("stage_billing.wo_pick_subcon")}</option>
              {(subcons || []).filter(s => s.name !== wo.subcon_name).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select></div>
          <div><label style={lblS}>{t("stage_billing.sd_pct")}</label><input type="number" value={form.retention_pct} onChange={e => setForm(p => ({ ...p, retention_pct: e.target.value }))} style={inpS} /></div>
          <div><label style={lblS}>{t("stage_billing.tds_pct")}</label><input type="number" value={form.tds_pct} onChange={e => setForm(p => ({ ...p, tds_pct: e.target.value }))} style={inpS} /></div>
        </div>
        <label style={lblS}>{t("stage_billing.handover_reason")}</label>
        <textarea rows={2} value={form.reason} maxLength={500} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} style={{ ...inpS, resize: "vertical", marginBottom: 12 }} />
        <div style={{ fontSize: 10.5, color: T.t3, marginBottom: 6 }}>{t("stage_billing.handover_lines_hint")}</div>
        {!ledger && <div style={{ fontSize: 11.5, color: T.t4 }}>{t("common.loading")}</div>}
        {ledger && !left.length && <div style={{ fontSize: 11.5, color: T.amb }}>{t("stage_billing.handover_nothing")}</div>}
        {left.map(it => (
          <div key={it.item_id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 110px 100px", gap: 6, alignItems: "center", padding: "5px 0", borderTop: "1px solid " + T.b1 }}>
            <div style={{ minWidth: 0, fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: T.t1 }}>{nameOf(it)}</div>
              <div style={{ fontSize: 10.5, color: T.t3 }}>{t("stage_billing.handover_left", { qty: fmtQ(it.remaining_qty), unit: it.unit || "" })}</div>
            </div>
            <span style={{ fontSize: 11, color: T.t3, textAlign: "right" }}>{t("stage_billing.handover_old_rate", { rate: fmtC(it.rate) })}</span>
            <input type="number" placeholder={String(it.rate)} value={form.rates[it.item_id] ?? ""}
              onChange={e => setForm(p => ({ ...p, rates: { ...p.rates, [it.item_id]: e.target.value } }))} style={inpS} />
          </div>
        ))}
        {msg && <div style={{ marginTop: 10, padding: "7px 10px", borderRadius: 7, background: T.redL, color: T.red, fontSize: 11.5 }}>{msg}</div>}
      </div>
      <div style={{ padding: "12px 18px", borderTop: "1px solid " + T.b1, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onClose} style={btnS()}>{t("common.cancel")}</button>
        <button type="button" disabled={busy || !left.length} onClick={save} style={btnS("danger", busy || !left.length)}>{busy ? t("common.saving_2") : t("stage_billing.handover_save")}</button>
      </div>
    </div>
  </>);
}

// ── 5. Library item ke fix hisse (Septic tank: Brick work + plaster 60 · Slab 40) ──
// Server: GET/PUT /library/boq-items/:id/stages (milestone_template, cum_pct
// chadhta hua). Yahan hissa ka apna % (jod 100) — save par cum_pct banta hai.
// Estimate banate waqt is item ki line in hisson me khulti hai (EstimateBuilderModal).
export function ItemPartsModal({ item, onClose, onSaved }) {
  const [parts, setParts] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api.get("/library/boq-items/" + item.id + "/stages").then(r => {
      const lines = (r?.success && r.data?.lines) || [];
      let prev = 0;
      const ps = lines.map(l => { const cum = num(l.cum_pct); const p = { name: l.name || "", pct: String(r2(cum - prev)) }; prev = cum; return p; });
      setParts(ps.length ? ps : [{ name: "", pct: "" }, { name: "", pct: "" }]);
    }).catch(() => setParts([{ name: "", pct: "" }, { name: "", pct: "" }]));
  }, [item.id]);
  const sum = (parts || []).reduce((s, p) => s + num(p.pct), 0);
  const filled = (parts || []).filter(p => p.name.trim() || num(p.pct) > 0);
  const valid = filled.length === 0 || (filled.length >= 2 && filled.every(p => p.name.trim() && num(p.pct) > 0) && Math.abs(sum - 100) < 0.01);
  const save = async () => {
    let cum = 0;
    const lines = filled.map((p, i) => { cum = r2(cum + num(p.pct)); return { seq: i, name: p.name.trim(), cum_pct: cum }; });
    setBusy(true);
    const r = await api.put("/library/boq-items/" + item.id + "/stages", { lines }).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setMsg(r?.message || t("stage_billing.save_failed")); return; }
    onSaved && onSaved(lines.length);
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: T.surface, borderRadius: 12, width: "min(520px, 95vw)", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.b1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("stage_billing.parts_title", { item: item.name })}</div>
          <div style={{ fontSize: 11, color: T.t3, marginTop: 3, lineHeight: 1.45 }}>{t("stage_billing.parts_hint")}</div>
        </div>
        <div style={{ padding: "14px 18px", overflowY: "auto", flex: 1 }}>
          {!parts && <div style={{ fontSize: 12, color: T.t4 }}>{t("common.loading")}</div>}
          {(parts || []).map((p, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 80px auto", gap: 6, marginBottom: 6 }}>
              <input value={p.name} placeholder={t("stage_billing.part_name_ph")} onChange={e => setParts(ps => ps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={inpS} />
              <input type="number" value={p.pct} placeholder="%" onChange={e => setParts(ps => ps.map((x, j) => j === i ? { ...x, pct: e.target.value } : x))} style={inpS} />
              <button type="button" onClick={() => setParts(ps => ps.filter((_, j) => j !== i))} style={btnS()}>×</button>
            </div>
          ))}
          {parts && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <button type="button" onClick={() => setParts(ps => [...ps, { name: "", pct: "" }])} style={btnS()}>{t("stage_billing.add_part")}</button>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: Math.abs(sum - 100) < 0.01 || !filled.length ? T.grn : T.red }}>{t("stage_billing.parts_total", { pct: r2(sum) })}</span>
            </div>
          )}
          <div style={{ fontSize: 10.5, color: T.t4, marginTop: 10 }}>{t("stage_billing.parts_clear_hint")}</div>
          {msg && <div style={{ marginTop: 10, padding: "7px 10px", borderRadius: 7, background: T.redL, color: T.red, fontSize: 11.5 }}>{msg}</div>}
        </div>
        <div style={{ padding: "12px 18px", borderTop: "1px solid " + T.b1, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} style={btnS()}>{t("common.cancel")}</button>
          <button type="button" disabled={busy || !valid || !parts} onClick={save} style={btnS("primary", busy || !valid || !parts)}>{busy ? t("common.saving_2") : t("common.save")}</button>
        </div>
      </div>
    </div>
  );
}

// Estimate builder ke liye — server ke utils/stageBilling.js jaisa hi hisaab.
// Library template (cum_pct chadhta hua) → hisse; line → hisson ki line
// (qty wahi, rate = rate × %, aakhri hisse me baaki rate — jod line rate ke barabar).
export function partsFromTemplate(lines) {
  const out = [];
  let prev = 0;
  for (const l of (lines || []).slice().sort((a, b) => (a.seq || 0) - (b.seq || 0))) {
    const cum = num(l.cum_pct), pct = r2(cum - prev);
    if (pct > 0) out.push({ name: l.name || "", pct });
    prev = cum;
  }
  const total = out.reduce((s, p) => s + p.pct, 0);
  return out.length >= 2 && Math.abs(total - 100) < 0.01 ? out : [];
}
export function splitLineByParts(line, parts, itemName) {
  const rate = num(line.rate);
  let used = 0;
  return parts.map((p, i) => {
    const last = i === parts.length - 1;
    const pr = last ? r2(rate - used) : r2(rate * num(p.pct) / 100);
    used = r2(used + pr);
    return { ...line, description: line.description + " · " + p.name + " (" + r2(p.pct) + "%)", rate: pr, part_of: String(itemName || "").slice(0, 160) };
  });
}

// ── 6. WO par katauti (subcon ki galti ka dobara kaam) — RA Bills tab ──
// Baaki (pending) agle RA bill me lagti hai; galti se bani ho to "Hatao"
// (Subcon APPROVE, wajah ke saath). Jo bill me lag chuki wo us bill ke
// Reject / delete se hi wapas aati hai.
export function BackchargeList({ woId, canApprove }) {
  const [d, setD] = useState(null);
  const load = useCallback(() => {
    api.get("/subcon/work-orders/" + woId + "/backcharges").then(r => { if (r?.success) setD(r.data); }).catch(() => {});
  }, [woId]);
  useEffect(() => { load(); }, [load]);
  if (!d || (!d.pending.length && !d.applied.length)) return null;
  const drop = async (row) => {
    const reason = await window.promptAsync({ message: t("stage_billing.katauti_drop_prompt", { amt: fmtC(row.amount) }), multiline: true, cancelLabel: t("common.cancel") });
    if (reason == null) return;
    if (String(reason).trim().length < 3) { alert(t("stage_billing.handover_reason_need")); return; }
    const r = await api.del("/subcon/backcharges/" + row.id + "?reason=" + encodeURIComponent(String(reason).trim())).catch(e => ({ success: false, message: e.message }));
    if (!r?.success) { alert(r?.message || t("stage_billing.save_failed")); return; }
    load();
  };
  return (
    <div style={{ border: "1px solid " + T.b1, borderRadius: 8, marginBottom: 12, background: T.surface, overflow: "hidden" }}>
      <div style={{ padding: "8px 12px", background: T.redL, fontSize: 11.5, fontWeight: 800, color: T.red }}>
        {t("stage_billing.katauti_list_title", { amt: fmtC(d.pending_total) })}
      </div>
      {[...d.pending, ...d.applied].map(r => (
        <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 12px", borderTop: "1px solid " + T.b1, fontSize: 11.5 }}>
          <span style={{ fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{fmtC(r.amount)}</span>
          <span style={{ flex: 1, minWidth: 0, color: T.t2 }}>{r.reason}</span>
          {r.status === "applied"
            ? <span style={chip(T.sltL, T.slt)}>{t("stage_billing.katauti_in_bill", { no: r.bill_no || "" })}</span>
            : <span style={chip(T.ambL, T.amb)}>{t("stage_billing.katauti_pending")}</span>}
          {r.status === "pending" && canApprove && <button type="button" onClick={() => drop(r)} style={{ ...btnS(), padding: "2px 8px", fontSize: 10.5 }}>{t("stage_billing.katauti_drop")}</button>}
        </div>
      ))}
    </div>
  );
}
