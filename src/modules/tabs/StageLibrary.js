// ════════════════════════════════════════════════════════════════
// Stage Library (25 Nov 2026, Prafull: "sabhi item ka stage library banana
// better hoga — library 1 2 3, ek baar bana de GF, FF, SF, septic tank,
// boundary aur sabhi item ka; jab bhi payment schedule banana ho library se
// pick karo; stage % me — package rate badle to bhi koi issue nahi").
//
// Library = har kaam / floor ka apna stage set (naam, %, group, "sab floor ka ek
// saath"). Server: /api/stage-libraries. Estimate par lagana: har kaam ko uska set
// (naam se apne aap milta hai — GF ↔ "GF / Ground Floor"), phir
// /customer-estimates/:id/schedule/replace (item_parts) — bina hisse wali line bhi,
// hisson wali bhi; jis stage ka naam wahi raha uska task bana rehta hai.
// ════════════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(num(n) * 100) / 100;
const fmtC = (v) => "₹" + Math.round(num(v)).toLocaleString("en-IN");
const inpS = { padding: "5px 8px", borderRadius: 6, border: "1.5px solid " + T.b1, fontSize: 12, outline: "none",
  fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: T.surface, color: T.t1 };
const btnS = (kind = "plain", disabled = false) => ({
  padding: "5px 11px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: disabled ? "default" : "pointer",
  fontFamily: "inherit", opacity: disabled ? 0.55 : 1, whiteSpace: "nowrap",
  ...(kind === "primary" ? { background: T.ind, color: "white", border: "1px solid " + T.ind }
    : kind === "soft" ? { background: T.indL, color: T.ind, border: "1px solid " + T.indL }
    : kind === "danger" ? { background: T.redL, color: T.red, border: "1px solid " + T.redL }
    : { background: T.surface, color: T.t2, border: "1px solid " + T.b1 }),
});
const lblS = { fontSize: 9.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 3 };
const grpOf = (p) => String(p.group || "").trim();

// ── Shuru ka set (nayi library) — Structure ~51% (₹920 / ₹1,800), Finishing ~49% ──
const P = (k, pct, g, tg) => ({ name: t("schedule." + k), pct: String(pct), group: g, together: !!tg });
export function defaultItems() {
  const S = t("schedule.grp_structure"), F = t("stage_billing.grp_finishing");
  const fin = [P("ms_tile", 14.7, F, 1), P("ms_paint", 9.8, F, 1), P("ms_plumbing", 9.8, F, 1), P("ms_window", 9.8, F, 1), P("ms_handover", 4.9, F, 1)];
  const upper = [P("ms_lintel", 10.2, S), P("ms_slab_level", 5.1, S), P("ms_slab", 25.5, S), P("ms_plaster", 10.2, S), ...fin];
  return [
    { label: "GF", also: t("stage_lib.d_gf_also"), parts: [P("ms_plinth", 15.3, S), P("ms_lintel", 10.2, S), P("ms_slab_level", 5.1, S), P("ms_slab", 15.3, S), P("ms_plaster", 5.1, S), ...fin] },
    { label: "FF", also: t("stage_lib.d_ff_also"), parts: upper.map(p => ({ ...p })) },
    { label: "SF", also: t("stage_lib.d_sf_also"), parts: upper.map(p => ({ ...p })) },
    { label: t("stage_lib.d_head"), also: "", parts: upper.map(p => ({ ...p })) },
    { label: t("stage_lib.d_septic"), also: "", parts: [P("ms_complete", 100, S)] },
    { label: t("stage_lib.d_boundary"), also: "", parts: [P("ms_brick", 70, S), P("ms_plaster", 30, S)] },
  ];
}

// Kaam ka naam (GF / Ground Floor / Septic tank) → library ka set. Pehle pura naam, phir shabd.
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim();
export function matchLibItem(items, work) {
  const cands = [work.category, work.name].map(norm).filter(Boolean);
  const names = (it) => [it.label, ...String(it.also || "").split(",")].map(norm).filter(Boolean);
  for (const it of items || []) if (names(it).some(n => cands.includes(n))) return it;
  for (const it of items || []) if (names(it).some(n => n.length >= 2 && cands.some(c => (" " + c + " ").includes(" " + n + " ")))) return it;
  return null;
}
export const sumPct = (parts) => r2((parts || []).reduce((s, p) => s + num(p.pct), 0));
// 1 stage bhi chalega (26 Nov 2026 — Septic tank ek baar me): 100% = kaam poora hone par poora
const itemProblem = (it) => !String(it.label || "").trim() || (it.parts || []).length < 1
  || it.parts.some(p => !String(p.name || "").trim() || !(num(p.pct) > 0)) || Math.abs(sumPct(it.parts) - 100) > 0.01;
export const partsBodyPct = (parts) => parts.map(p => ({ name: String(p.name).trim(), pct: num(p.pct), group: grpOf(p) || null, ...(p.together ? { together: true } : {}) }));
const oneStagePart = () => [{ name: t("schedule.ms_complete"), pct: "100", group: "", together: false }];

// Estimate ke kaam: billing-ledger ki line → floor + kaam (hisse ek saath). Extra / bina qty nahi.
export function worksOf(items) {
  const out = [], idx = {};
  for (const x of items || []) {
    if (x.item_type === "extra" || !(num(x.planned_qty) > 0)) continue;
    const k = (x.category || x.section_title || "") + "¦" + (x.part_of || "#" + x.item_id);
    if (idx[k] === undefined) { idx[k] = out.length; out.push({ key: k, category: x.category || x.section_title || "", name: x.part_of || x.description || "", all: [] }); }
    out[idx[k]].all.push(x);
  }
  return out.map(w => ({ ...w, qty: num(w.all[0].planned_qty), unit: w.all[0].unit || "", rate: r2(w.all.reduce((s, x) => s + num(x.rate), 0)),
    locked: w.all.some(x => num(x.billed_qty) > 0 || num(x.opening_qty) > 0) }));
}
export const workName = (w) => (w.category && norm(w.category) !== norm(w.name) ? w.category + " · " : "") + w.name;
// Library me kaam ka naam: floor / category (GF, Septic tank). Ek category me kai alag kaam hon to
// kaam ka naam (warna sab ek hi set par chale jaate).
export function labelFor(works) {
  const names = {};
  for (const w of works || []) { const c = norm(w.category); if (c) (names[c] = names[c] || new Set()).add(norm(w.name)); }
  return (w) => {
    const c = norm(w.category);
    return String((c && names[c] && names[c].size > 1 ? w.name : w.category) || w.name || "").trim().slice(0, 80);
  };
}
const addAlso = (it, nm) => {
  nm = String(nm || "").trim();
  if (!nm || [it.label, ...String(it.also || "").split(",")].map(norm).includes(norm(nm))) return false;
  const nx = it.also ? it.also + ", " + nm : nm;
  if (nx.length > 200) return false;
  it.also = nx;
  return true;
};
// Estimate ke kaam → library ke set (ek naam ek baar). Shuru ke set (GF / FF / Septic…) se mile to
// wahi stage + uske doosre naam, warna ek stage "Completion" 100%.
export function estimateLibItems(works, allWorks) {
  const nameOf = labelFor(allWorks || works), defs = defaultItems(), out = [], seen = new Set();
  for (const w of works || []) {
    const label = nameOf(w), k = norm(label);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    const d = matchLibItem(defs, w), it = { label, also: "", parts: d ? d.parts.map(p => ({ ...p })) : oneStagePart() };
    if (d) [d.label, ...String(d.also || "").split(",")].forEach(x => addAlso(it, x));
    out.push(it);
  }
  return out;
}

let libCache = null;
export const loadLibs = (fresh) => {
  if (fresh || !libCache) {
    libCache = Promise.resolve(api.get("/stage-libraries")).then(r => {
      if (r && r.success) return r.data || [];
      libCache = null;
      return [];
    }).catch(() => { libCache = null; return []; });
  }
  return libCache;
};

// ── 1. Library banao / badlo ──
function ItemEditor({ it, idx, onChange, onRemove }) {
  const setPart = (j, patch) => onChange({ ...it, parts: it.parts.map((p, k) => (k === j ? { ...p, ...patch } : p)) });
  const groups = [...new Set(it.parts.map(grpOf).filter(Boolean))];
  const sum = sumPct(it.parts), bad = itemProblem(it);
  return (
    <div data-lib-item={idx} style={{ border: "1px solid " + (bad ? T.redL : T.b1), borderRadius: 8, padding: "8px 10px", background: T.surface }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr) auto", gap: 6, marginBottom: 6 }}>
        <input value={it.label} data-lib-label={idx} placeholder={t("stage_lib.item_label_ph")} onChange={e => onChange({ ...it, label: e.target.value })} style={{ ...inpS, fontWeight: 700 }} />
        <input value={it.also || ""} placeholder={t("stage_lib.item_also_ph")} onChange={e => onChange({ ...it, also: e.target.value })} style={inpS} />
        <button type="button" onClick={onRemove} title={t("stage_lib.item_remove")} style={btnS("danger")}>×</button>
      </div>
      {it.parts.map((p, j) => (
        <div key={j} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 70px 120px auto", gap: 6, marginBottom: 4 }}>
          <input value={p.name} placeholder={t("stage_billing.part_name_ph")} onChange={e => setPart(j, { name: e.target.value })} style={inpS} />
          <input type="number" value={p.pct} placeholder="%" data-lib-pct={idx + "¦" + j} onChange={e => setPart(j, { pct: e.target.value })} style={inpS} />
          <input value={p.group || ""} list="stage-lib-grp" placeholder={t("stage_billing.part_group_ph")}
            onChange={e => { const g = e.target.value.trim(); const ex = it.parts.find((x, k) => k !== j && grpOf(x) && grpOf(x) === g); setPart(j, { group: e.target.value, ...(ex ? { together: !!ex.together } : {}) }); }} style={inpS} />
          <button type="button" disabled={it.parts.length <= 1} data-lib-del={idx + "¦" + j} onClick={() => onChange({ ...it, parts: it.parts.filter((_, k) => k !== j) })} style={btnS("plain", it.parts.length <= 1)}>×</button>
        </div>
      ))}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 4 }}>
        <button type="button" onClick={() => onChange({ ...it, parts: [...it.parts, { name: "", pct: "", group: "", together: false }] })} style={btnS()}>{t("stage_billing.add_part")}</button>
        <span data-lib-sum={idx} style={{ fontSize: 11, fontWeight: 700, color: Math.abs(sum - 100) < 0.01 ? T.grn : T.red }}>{t("stage_billing.parts_total", { pct: sum })}</span>
        {groups.map(g => {
          const gs = sumPct(it.parts.filter(p => grpOf(p) === g));
          return (
            <label key={g} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: T.t2, cursor: "pointer" }}>
              <input type="checkbox" checked={it.parts.filter(p => grpOf(p) === g).every(p => p.together)}
                onChange={e => onChange({ ...it, parts: it.parts.map(p => (grpOf(p) === g ? { ...p, together: e.target.checked } : p)) })} />
              <b>{g} {gs}%</b> · {t("schedule.tg_label")}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// works = estimate se khula (27 Nov 2026, Prafull: "yahi se stage library banate hai to estimate me jitne
// item hai sab show kare"): upar estimate ke saare kaam — library me hai ✓ / nahi to "+"; nayi library
// = yahi kaam (koi library na ho to seedha khulti hai).
export function StageLibraryManager({ onClose, onChanged, canEdit = true, works }) {
  const [libs, setLibs] = useState(null);
  const [sel, setSel] = useState(null);       // { id?, name, items, edit_seq? } — form
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const est = works && works.length ? works : null;
  const fromEst = (ws) => estimateLibItems(ws, est);
  useEffect(() => {
    loadLibs(true).then(l => {
      setLibs(l);
      if (l.length) setSel(clone(l[0]));
      else if (est && canEdit) setSel({ name: t("stage_lib.new_name", { n: 1 }), items: fromEst(est) });
    });
  }, []);
  const clone = (l) => ({ id: l.id, name: l.name, edit_seq: l.edit_seq,
    items: l.items.map(it => ({ label: it.label, also: it.also || "", parts: it.parts.map(p => ({ name: p.name, pct: String(p.pct), group: p.group || "", together: !!p.together })) })) });
  const startNew = () => { setErr(""); setSel({ name: t("stage_lib.new_name", { n: (libs || []).length + 1 }), items: est ? fromEst(est) : defaultItems() }); };
  // Estimate ka kaam is library me hai? (naam / doosre naam se — wahi jo "Library se lagao" karta hai)
  const missing = est && sel ? est.filter(w => !matchLibItem(sel.items, w)) : [];
  const missN = new Set(fromEst(missing).map(it => norm(it.label))).size;
  const addWorks = (ws) => setSel(s => {
    const have = new Set(s.items.map(it => norm(it.label)));
    return { ...s, items: [...s.items, ...fromEst(ws).filter(it => !have.has(norm(it.label)))] };
  });
  const problems = sel ? sel.items.filter(itemProblem).map(it => it.label || "—") : [];
  const dupe = sel ? sel.items.map(it => norm(it.label)).filter((x, i, a) => x && a.indexOf(x) !== i) : [];
  const ok = !!sel && String(sel.name || "").trim() && sel.items.length > 0 && !problems.length && !dupe.length;
  const save = async () => {
    setBusy(true); setErr("");
    const body = { name: sel.name.trim(), edit_seq: sel.edit_seq, items: sel.items.map(it => ({ label: it.label.trim(), also: it.also || "", parts: partsBodyPct(it.parts) })) };
    const r = await (sel.id ? api.put("/stage-libraries/" + sel.id, body) : api.post("/stage-libraries", body)).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setErr(r?.message || t("stage_lib.save_failed")); return; }
    const l = await loadLibs(true);
    setLibs(l); setSel(clone(r.data));
    onChanged && onChanged(l);
    window.toast?.success?.(t("stage_lib.saved", { name: r.data.name }));
  };
  const remove = async () => {
    if (!sel?.id || !(await window.confirmAsync?.(t("stage_lib.confirm_delete", { name: sel.name })))) return;
    setBusy(true);
    const r = await api.del("/stage-libraries/" + sel.id).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setErr(r?.message || t("stage_lib.save_failed")); return; }
    const l = await loadLibs(true);
    setLibs(l); setSel(l.length ? clone(l[0]) : null);
    onChanged && onChanged(l);
  };
  return (<>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 310 }} onClick={() => !busy && onClose()} />
    <div role="dialog" aria-label={t("stage_lib.title")} data-testid="stage-lib"
      style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 860, maxWidth: "96vw", maxHeight: "92vh",
        background: T.surface, borderRadius: 12, zIndex: 311, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.b1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>📚 {t("stage_lib.title")}</div>
        <div style={{ fontSize: 11, color: T.t3, marginTop: 3, lineHeight: 1.45 }}>{t("stage_lib.hint")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {(libs || []).map(l => (
            <button key={l.id} type="button" data-lib-tab={l.id} onClick={() => { setErr(""); setSel(clone(l)); }} style={btnS(sel && sel.id === l.id ? "primary" : "plain")}>{l.name}</button>
          ))}
          {canEdit && <button type="button" data-testid="lib-new" onClick={startNew} style={btnS("soft")}>+ {t("stage_lib.new_btn")}</button>}
        </div>
      </div>
      <div style={{ padding: "12px 18px", overflowY: "auto", flex: 1, display: "grid", gap: 10, alignContent: "start", background: T.surfaceB }}>
        {libs == null ? <div style={{ fontSize: 12, color: T.t3 }}>{t("stage_lib.loading")}</div> : !sel ? (
          <div style={{ fontSize: 12.5, color: T.t3, lineHeight: 1.5 }}>{t("stage_lib.empty")}</div>
        ) : (<>
          <datalist id="stage-lib-grp"><option value={t("schedule.grp_structure")} /><option value={t("stage_billing.grp_finishing")} /></datalist>
          <div>
            <label style={lblS}>{t("stage_lib.name")}</label>
            <input value={sel.name} data-testid="lib-name" disabled={!canEdit} onChange={e => setSel(s => ({ ...s, name: e.target.value }))} style={{ ...inpS, fontWeight: 700, maxWidth: 360 }} />
          </div>
          {est && (
            <div data-testid="lib-est-works" style={{ border: "1px dashed " + T.b2, borderRadius: 8, padding: "8px 10px", background: T.surface }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: missN ? T.amb : T.grn, marginBottom: 6 }}>
                {missN ? t("stage_lib.est_works_miss", { n: est.length, miss: missN }) : t("stage_lib.est_works_all", { n: est.length })}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {est.map(w => {
                  const m = matchLibItem(sel.items, w);
                  return m ? (
                    <span key={w.key} data-est-ok={w.key} style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 99, background: T.grnL, color: T.grn, fontWeight: 600 }}>✓ {workName(w)} → {m.label}</span>
                  ) : (
                    <button key={w.key} type="button" data-est-add={w.key} disabled={!canEdit} onClick={() => addWorks([w])} title={t("stage_lib.est_add_one")}
                      style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 99, background: T.ambL, color: T.amb, border: "1px solid " + T.ambL, fontWeight: 700, cursor: canEdit ? "pointer" : "default", fontFamily: "inherit" }}>+ {workName(w)}</button>
                  );
                })}
              </div>
              {canEdit && missN > 1 && <button type="button" data-testid="lib-est-add-all" onClick={() => addWorks(missing)} style={{ ...btnS("soft"), marginTop: 6 }}>+ {t("stage_lib.est_add_all", { n: missN })}</button>}
            </div>
          )}
          {sel.items.map((it, i) => (
            <ItemEditor key={i} it={it} idx={i} onChange={(nx) => setSel(s => ({ ...s, items: s.items.map((x, k) => (k === i ? nx : x)) }))}
              onRemove={() => setSel(s => ({ ...s, items: s.items.filter((_, k) => k !== i) }))} />
          ))}
          {canEdit && <div><button type="button" data-testid="lib-add-item" onClick={() => setSel(s => ({ ...s, items: [...s.items, { label: "", also: "", parts: [{ name: "", pct: "", group: "", together: false }, { name: "", pct: "", group: "", together: false }] }] }))} style={btnS()}>+ {t("stage_lib.add_item")}</button></div>}
          {(problems.length > 0 || dupe.length > 0) && (
            <div role="alert" data-testid="lib-problems" style={{ padding: "7px 10px", borderRadius: 6, background: T.redL, color: T.red, fontSize: 11.5 }}>
              {dupe.length ? t("stage_lib.dupe", { names: [...new Set(dupe)].join(", ") }) : t("stage_lib.problems", { names: problems.join(", ") })}
            </div>
          )}
        </>)}
        {err && <div role="alert" style={{ padding: "7px 10px", borderRadius: 6, background: T.redL, color: T.red, fontSize: 11.5 }}>{err}</div>}
      </div>
      <div style={{ padding: "12px 18px", borderTop: "1px solid " + T.b1, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canEdit && sel && sel.id && <button type="button" disabled={busy} onClick={remove} style={btnS("danger", busy)}>{t("stage_lib.delete")}</button>}
        <div style={{ flex: 1 }} />
        <button type="button" disabled={busy} onClick={onClose} style={btnS()}>{t("common.close")}</button>
        {canEdit && sel && <button type="button" data-testid="lib-save" disabled={busy || !ok} onClick={save} style={btnS("primary", busy || !ok)}>{busy ? t("common.saving_2") : t("stage_lib.save")}</button>}
      </div>
    </div>
  </>);
}

// ── 2. Library se schedule: har kaam ko uska set, ek saath ──
// Library me nahi mila kaam (27 Nov 2026, Prafull: "yahi pe ek stage add karne ka option, then remember
// kar do — kabhi phir aaya to yaad rakhega"): dropdown me "+ Naya stage set (yahin banao)" — set
// isi kaam ke naam se library me judta hai. Haath se koi aur set chuna to us set ke "Doosre naam"
// me ye naam (tick se). Dono pehle library me save, phir estimate par.
const NEW = "__new__";
// items = billing-ledger ki line. Kaam = floor + kaam (hisse ek saath). Bill / pehle ka
// bill wale kaam band (server bhi rokta hai).
export function LibApplyModal({ estimateId, items, onClose, onDone }) {
  const [libs, setLibs] = useState(null);
  const [libId, setLibId] = useState("");
  const [pick, setPick] = useState({});          // work key → library item key ("" = chhodo, NEW = yahin naya set)
  const [auto, setAuto] = useState({});          // naam se jo apne aap mila — usse alag chuna = "yaad rakho" ka tick
  const [newSets, setNewSets] = useState({});    // work key → { label, also, parts } (yahin banaya set)
  const [remember, setRemember] = useState({});  // work key → false = yaad mat rakho
  const [manage, setManage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [skipped, setSkipped] = useState([]);
  // Har baar taaza (library kahin aur badli ho sakti hai)
  useEffect(() => { loadLibs(true).then(l => { setLibs(l); if (l.length) setLibId(String(l[0].id)); }); }, []);
  const lib = (libs || []).find(l => String(l.id) === String(libId)) || null;
  const works = useMemo(() => worksOf(items), [items]);
  const memName = useMemo(() => labelFor(works), [works]);   // kaam ka naam jo library yaad rakhegi
  // Library badli → har kaam ka set naam se dobara
  useEffect(() => {
    if (!lib) return;
    const nx = {};
    for (const w of works) { const m = !w.locked && matchLibItem(lib.items, w); nx[w.key] = m ? m.key : ""; }
    setPick(nx); setAuto(nx); setNewSets({}); setRemember({});
  }, [lib, works]);
  // Naya set: kaam ke naam se (shuru ke set GF / Septic… se mile to wahi stage). Kaam ka naam (jaise
  // "Construction") doosre naam me NAHI — warna FF ka Construction bhi GF ke set par chala jaata.
  const choose = (w, v) => {
    setPick(p => ({ ...p, [w.key]: v }));
    if (v === NEW && !newSets[w.key]) setNewSets(n => ({ ...n, [w.key]: estimateLibItems([w], works)[0] || { label: memName(w), also: "", parts: oneStagePart() } }));
  };
  const isNew = (w) => pick[w.key] === NEW;
  const chosen = works.filter(w => !w.locked && pick[w.key]);
  const setOf = (w) => (isNew(w) ? newSets[w.key] : lib && lib.items.find(it => it.key === pick[w.key]));
  // Haath se chuna (naam se nahi mila / alag set) — naam us set ke "Doosre naam" me jaayega
  const remembers = chosen.filter(w => !isNew(w) && pick[w.key] !== auto[w.key] && remember[w.key] !== false);
  const newBad = chosen.filter(isNew).map(w => newSets[w.key]).filter(ns => !ns || itemProblem(ns));
  const newLabels = chosen.filter(isNew).map(w => norm(newSets[w.key] && newSets[w.key].label));
  const newDupe = newLabels.some((x, i) => x && (newLabels.indexOf(x) !== i || (lib && lib.items.some(it => norm(it.label) === x))));
  const apply = async () => {
    setBusy(true); setErr(""); setSkipped([]);
    let libNow = lib, saved = 0;
    // 1. Pehle library me yaad: naye set + manual pick ka naam (agli baar apne aap)
    if (chosen.some(isNew) || remembers.length) {
      const items = lib.items.map(it => ({ label: it.label, also: it.also || "", parts: partsBodyPct(it.parts) }));
      for (const w of remembers) if (addAlso(items[lib.items.findIndex(x => x.key === pick[w.key])], memName(w))) saved++;
      for (const w of chosen.filter(isNew)) {
        const ns = newSets[w.key];
        items.push({ label: ns.label.trim(), also: ns.also || "", parts: partsBodyPct(ns.parts) });
        saved++;
      }
      const r0 = await api.put("/stage-libraries/" + lib.id, { name: lib.name, edit_seq: lib.edit_seq, items }).catch(e => ({ success: false, message: e.message }));
      if (!r0?.success) { setBusy(false); setErr(r0?.message || t("stage_lib.save_failed")); return; }
      libNow = r0.data;
      loadLibs(true).then(l => setLibs(l));
    }
    // 2. Estimate par: har kaam ko uska set
    const ids = chosen.map(w => w.all[0].item_id);
    const item_parts = Object.fromEntries(chosen.map(w => [w.all[0].item_id, partsBodyPct(setOf(w).parts)]));
    const r = await api.post("/customer-estimates/" + estimateId + "/schedule/replace", { item_ids: ids, parts: item_parts[ids[0]], item_parts })
      .catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setErr(r?.message || t("schedule.failed")); setSkipped(r?.data?.skipped || []); return; }
    const sk = r.data.skipped || [];
    onDone && onDone((r.data.requested ? t("schedule.req_sent", { n: r.data.done.length }) : t("stage_lib.applied", { n: r.data.done.length, lib: libNow.name }))
      + (saved ? " · " + t("stage_lib.remembered", { n: saved }) : "")
      + (sk.length ? " — " + sk.map(s => (s.name || "#" + s.item_id) + ": " + s.reason).join("; ") : ""));
  };
  const wName = workName;
  return (<>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300 }} onClick={() => !busy && onClose()} />
    <div role="dialog" aria-label={t("stage_lib.apply_title")} data-testid="lib-apply"
      style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 820, maxWidth: "96vw", maxHeight: "90vh",
        background: T.surface, borderRadius: 12, zIndex: 301, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.b1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>📚 {t("stage_lib.apply_title")}</div>
        <div style={{ fontSize: 11, color: T.t3, marginTop: 3, lineHeight: 1.45 }}>{t("stage_lib.apply_hint")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
          {(libs || []).map(l => (
            <button key={l.id} type="button" data-apply-lib={l.id} onClick={() => setLibId(String(l.id))} style={btnS(String(l.id) === String(libId) ? "primary" : "plain")}>{l.name}</button>
          ))}
          <button type="button" data-testid="lib-manage" onClick={() => setManage(true)} style={btnS("soft")}>✎ {t("stage_lib.manage_btn")}</button>
        </div>
      </div>
      <div style={{ padding: "12px 18px", overflowY: "auto", flex: 1, display: "grid", gap: 8, alignContent: "start" }}>
        {!manage && chosen.some(isNew) && <datalist id="stage-lib-grp"><option value={t("schedule.grp_structure")} /><option value={t("stage_billing.grp_finishing")} /></datalist>}
        {libs == null ? <div style={{ fontSize: 12, color: T.t3 }}>{t("stage_lib.loading")}</div> : !lib ? (
          <div data-testid="lib-none" style={{ fontSize: 12.5, color: T.t3, lineHeight: 1.5 }}>{t("stage_lib.none_yet")}</div>
        ) : works.map(w => {
          const s = w.locked ? null : setOf(w);
          return (
            <div key={w.key} data-apply-work={w.key} style={{ border: "1px solid " + T.b1, borderRadius: 8, padding: "7px 10px", opacity: w.locked ? 0.6 : 1 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <b style={{ fontSize: 12.5, color: T.t1, flex: "1 1 220px", minWidth: 0 }}>{wName(w)}</b>
                <span style={{ fontSize: 11, color: T.t3, fontVariantNumeric: "tabular-nums" }}>{num(w.qty).toLocaleString("en-IN")} {w.unit} × {fmtC(w.rate)}</span>
                {w.locked ? <span style={{ fontSize: 10.5, color: T.amb, fontWeight: 700 }}>{t("schedule.edit_locked")}</span> : (
                  <select value={pick[w.key] || ""} data-pick={w.key} onChange={e => choose(w, e.target.value)} style={{ ...inpS, width: 220 }}>
                    <option value="">{t("stage_lib.skip_work")}</option>
                    {lib.items.map(it => <option key={it.key} value={it.key}>{it.label}</option>)}
                    <option value={NEW}>+ {t("stage_lib.new_set_opt")}</option>
                  </select>
                )}
              </div>
              {!w.locked && !isNew(w) && pick[w.key] && pick[w.key] !== auto[w.key] && (
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: T.t2, marginTop: 4, cursor: "pointer" }}>
                  <input type="checkbox" data-remember={w.key} checked={remember[w.key] !== false} onChange={e => setRemember(r => ({ ...r, [w.key]: e.target.checked }))} />
                  {t("stage_lib.remember_lbl", { name: memName(w), set: (lib.items.find(it => it.key === pick[w.key]) || {}).label || "" })}
                </label>
              )}
              {!w.locked && isNew(w) && newSets[w.key] && (
                <div data-new-set={w.key} style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 10.5, color: T.ind, marginBottom: 4 }}>{t("stage_lib.new_set_hint", { lib: lib.name, name: newSets[w.key].label || "—" })}</div>
                  <ItemEditor it={newSets[w.key]} idx={"n" + w.all[0].item_id} onChange={(nx) => setNewSets(n => ({ ...n, [w.key]: nx }))} onRemove={() => choose(w, "")} />
                </div>
              )}
              {s && s.parts.length === 1 && (
                <div data-preview={w.key} style={{ fontSize: 10.5, color: T.t3, marginTop: 4 }}>{t("stage_lib.one_stage_preview", { stage: s.parts[0].name, amt: fmtC(w.rate) })}</div>
              )}
              {s && s.parts.length > 1 && (
                <div data-preview={w.key} style={{ fontSize: 10.5, color: T.t3, marginTop: 4, lineHeight: 1.5 }}>
                  {s.parts.map((p, i) => <span key={i}>{i ? " · " : ""}{p.name} {r2(p.pct)}% <b style={{ color: T.t2 }}>{fmtC(w.rate * num(p.pct) / 100)}</b></span>)}
                </div>
              )}
            </div>
          );
        })}
        {lib && works.some(w => !w.locked && !pick[w.key]) && <div style={{ fontSize: 10.5, color: T.t4 }}>{t("stage_lib.unmatched_hint")}</div>}
        {(newBad.length > 0 || newDupe) && (
          <div role="alert" data-testid="lib-new-bad" style={{ padding: "7px 10px", borderRadius: 6, background: T.redL, color: T.red, fontSize: 11.5 }}>
            {newDupe ? t("stage_lib.dupe", { names: [...new Set(newLabels.filter(Boolean))].join(", ") }) : t("stage_lib.problems", { names: newBad.map(x => (x && x.label) || "—").join(", ") })}
          </div>
        )}
        {err && (
          <div role="alert" style={{ padding: "8px 10px", borderRadius: 7, background: T.redL, color: T.red, fontSize: 11.5 }}>
            {err}
            {skipped.length > 0 && <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{skipped.map(x => <li key={x.item_id}>{(x.name || "#" + x.item_id) + " — " + x.reason}</li>)}</ul>}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 18px", borderTop: "1px solid " + T.b1, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={busy} onClick={onClose} style={btnS()}>{t("common.cancel")}</button>
        <button type="button" data-testid="lib-apply-go" disabled={busy || !chosen.length || newBad.length > 0 || newDupe} onClick={apply} style={btnS("primary", busy || !chosen.length || newBad.length > 0 || newDupe)}>
          {busy ? t("common.saving_2") : t("stage_lib.apply_btn", { n: chosen.length })}
        </button>
      </div>
    </div>
    {manage && <StageLibraryManager works={works} onClose={() => setManage(false)} onChanged={(l) => { setLibs(l); if (!l.some(x => String(x.id) === String(libId))) setLibId(l.length ? String(l[0].id) : ""); }} />}
  </>);
}

// ── 3. Hisson ke form me "Library se bharo" (Hisse lagao / Schedule badlo) ──
export function LibPicker({ onPick }) {
  const [libs, setLibs] = useState([]);
  useEffect(() => { let on = true; loadLibs().then(l => { if (on) setLibs(l); }); return () => { on = false; }; }, []);
  if (!libs.length) return null;
  return (
    <select value="" data-testid="lib-pick" aria-label={t("stage_lib.pick_ph")} onChange={e => {
      const [lid, key] = e.target.value.split("¦");
      const l = libs.find(x => String(x.id) === lid), it = l && l.items.find(x => x.key === key);
      if (it) onPick(it.parts.map(p => ({ name: p.name, pct: String(p.pct), rate: "", group: p.group || "", together: !!p.together })));
    }} style={{ ...inpS, width: "auto", maxWidth: 260 }}>
      <option value="">📚 {t("stage_lib.pick_ph")}</option>
      {libs.map(l => (
        <optgroup key={l.id} label={l.name}>
          {l.items.map(it => <option key={it.key} value={l.id + "¦" + it.key}>{it.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
