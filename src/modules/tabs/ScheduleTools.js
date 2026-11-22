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
//   ClientScheduleView — client ke liye saaf schedule: har BOQ kaam ka card,
//                      "Plinth poora hone par — 30% — ₹4,91,400", kul ab tak
//   Stage jaisi line (ek floor ki kai line, same area — "plinth / lintel / slab"
//   pehle se stage) par dobara % = double (5 Nov ka Deepnarayan) — box me unka
//   tick hata hua + chetavni.
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

// Stage ke aam naam (BOQ line ka naam inme se ho to wo line khud ek stage hai)
const STAGE_WORD = /\b(plinth|lintel|slab|beam|casting|footing|foundation|column|roof|shuttering|excavation|plaster|brick ?work|dpc|parapet)\b|प्लिंथ|लिंटल|स्लैब|ढलाई/i;
const blankPart = () => ({ name: "", pct: "", rate: "", group: "", together: false });
// Industry ke aam plan — naam user ki bhasha me (line par wahi likha jaata hai).
const presets = (mode) => mode === "contract" ? [
  { key: "clp", label: t("schedule.preset_clp"), parts: [
    ["ms_booking", 10], ["ms_plinth", 15], ["ms_lintel", 10], ["ms_slab", 20], ["ms_brick", 10],
    ["ms_plaster", 10], ["ms_floor", 10], ["ms_finish", 10], ["ms_handover", 5]] },
  { key: "simple", label: t("schedule.preset_simple"), parts: [["ms_booking", 10], ["ms_structure", 50], ["ms_finish", 30], ["ms_handover", 10]] },
] : [
  { key: "house", label: t("schedule.preset_house"), parts: [["ms_plinth", 30], ["ms_slab", 30], ["ms_tile", 20], ["ms_complete", 20]] },
];
const presetParts = (p) => p.parts.map(([k, v]) => ({ name: t("schedule." + k), pct: String(v), rate: "", group: "", together: false }));

// ── Structure + Finishing (24 Nov 2026, Prafull) ──
// Package ka poora rate = Structure + Finishing (₹1,800 = 920 + 880). Structure floor-wise
// chalta hai (GF, FF, SF), Finishing sab floor ka ek saath — isliye Finishing ke hisse
// "ek saath" (together): client schedule me ek hi card, har stage ka ₹ sab floor ka jod.
const SF_STRUCT = [["ms_plinth", 30], ["ms_lintel", 20], ["ms_slab_level", 10], ["ms_slab", 30], ["ms_plaster", 10]];
const SF_FIN = [["ms_tile", 30], ["ms_paint", 20], ["ms_plumbing", 20], ["ms_window", 20], ["ms_handover", 10]];
const spread = (total, list) => {
  let used = 0;
  return list.map(([k, pct], i) => { const v = i === list.length - 1 ? r2(total - used) : r2(total * pct / 100); used = r2(used + v); return [k, v]; });
};
// Structure ₹ + (line rate − Structure) Finishing → ₹ wale hisse. Galat number par null.
export function sfParts(struct, rate) {
  const s = r2(struct), f = r2(num(rate) - s);
  if (!(s > 0) || !(f > 0)) return null;
  return [
    ...spread(s, SF_STRUCT).map(([k, v]) => ({ name: t("schedule." + k), pct: "", rate: String(v), group: t("schedule.grp_structure"), together: false })),
    ...spread(f, SF_FIN).map(([k, v]) => ({ name: t("schedule." + k), pct: "", rate: String(v), group: t("stage_billing.grp_finishing"), together: true })),
  ];
}
// CRM package ke Structure rate (chip) — Estimate Create na ho to list nahi, haath se likho
let pkgRates = null;
const loadPkgRates = () => {
  if (!pkgRates) {
    pkgRates = Promise.resolve(api.get("/sales-quotes/project-packages")).then(r => {
      if (r && r.success) return (r.data || []).filter(p => num(p.rate_structure) > 0);
      pkgRates = null;
      return [];
    }).catch(() => { pkgRates = null; return []; });
  }
  return pkgRates;
};
const mostCommon = (xs) => { const c = {}; let best = null; for (const x of xs) { c[x] = (c[x] || 0) + 1; if (best == null || c[x] > c[best]) best = x; } return best; };
const grpOf = (p) => (p.group || "").trim();
export const partsOkFor = (pmode, parts) => parts.length >= 2 && parts.every(p => p.name.trim() && num(pmode === "rate" ? p.rate : p.pct) > 0)
  && (pmode === "rate" || Math.abs(parts.reduce((s, p) => s + num(p.pct), 0) - 100) < 0.01);
const partsBody = (pmode, parts) => parts.map(p => ({ name: p.name.trim(), ...(pmode === "rate" ? { rate: num(p.rate) } : { pct: num(p.pct) }),
  group: grpOf(p) || null, ...(p.together ? { together: true } : {}) }));

// Hisson ka form — "Hisse lagao" box aur "Schedule badlo" dono me.
// parts = [{ name, pct, rate, group, together }]; onParts(parts, mode?) — mode diya ho to % / ₹ bhi badle.
export function PartsEditor({ pmode, parts, onParts, onMode, modes, presetsFor, oneRate, refRate, amount, unit, sf, strictRate }) {
  const [pkgs, setPkgs] = useState([]);
  const [struct, setStruct] = useState(null);   // null = abhi chhua nahi (package se apne aap)
  useEffect(() => {
    let on = true;
    if (sf) loadPkgRates().then(l => { if (on) setPkgs(l); });
    return () => { on = false; };
  }, [sf]);
  const sfRate = oneRate != null ? oneRate : refRate;
  const auto = useMemo(() => {
    if (!(num(sfRate) > 0)) return "";
    const hit = pkgs.find(p => r2(p.rate_full) === r2(sfRate)) || pkgs.find(p => num(p.rate_structure) < num(sfRate));
    return hit ? String(r2(hit.rate_structure)) : "";
  }, [pkgs, sfRate]);
  const sVal = struct == null ? auto : struct;
  const fin = num(sfRate) > 0 && num(sVal) > 0 ? r2(num(sfRate) - num(sVal)) : null;
  const key = pmode === "rate" ? "rate" : "pct";
  const sum = parts.reduce((s, p) => s + num(p[key]), 0);
  const ok = partsOkFor(pmode, parts) && (!strictRate || pmode !== "rate" || Math.abs(sum - num(oneRate)) < 0.005);
  const setPart = (i, patch) => {
    // Naye group me gaya hissa us group ka "ek saath" le leta hai
    if (patch.group !== undefined) {
      const ex = parts.find((p, j) => j !== i && grpOf(p) && grpOf(p) === patch.group.trim());
      if (ex) patch = { ...patch, together: !!ex.together };
    }
    onParts(parts.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  };
  const groups = [...new Set(parts.map(grpOf).filter(Boolean))];
  const inGrp = (g) => parts.filter(p => grpOf(p) === g);
  return (
    <div>
      {sf && num(sfRate) > 0 && (
        <div data-testid="sf-box" style={{ border: "1px dashed " + T.ind, borderRadius: 8, padding: "8px 10px", background: T.indL, marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.ind }}>{t("schedule.sf_title")}</div>
          <div style={{ fontSize: 10.5, color: T.t3, margin: "2px 0 6px", lineHeight: 1.45 }}>{t("schedule.sf_hint")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <label htmlFor="sf-struct-inp" style={{ fontSize: 11, color: T.t2, fontWeight: 700 }}>{t("schedule.sf_struct", { unit: unit || "—" })}</label>
            <input id="sf-struct-inp" type="number" data-testid="sf-struct" value={sVal} onChange={e => setStruct(e.target.value)} style={{ ...inpS, width: 90 }} />
            <span data-testid="sf-fin" style={{ fontSize: 11.5, fontWeight: 700, color: fin != null && fin > 0 ? T.t2 : T.red }}>
              {fin != null && fin > 0 ? t("schedule.sf_fin", { amt: fmtC(fin), rate: fmtC(sfRate) }) : t("schedule.sf_need", { rate: fmtC(sfRate) })}
            </span>
            {pkgs.map(p => (
              <button key={p.id} type="button" data-sf-pkg={p.id} onClick={() => setStruct(String(r2(p.rate_structure)))} style={{ ...btnS(), padding: "2px 9px" }}>{p.name} {fmtC(p.rate_structure)}</button>
            ))}
            <button type="button" data-testid="sf-fill" disabled={!(fin > 0)} onClick={() => { const ps = sfParts(sVal, sfRate); if (ps) onParts(ps, "rate"); }}
              style={btnS("primary", !(fin > 0))}>{t("schedule.sf_fill")}</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 6 }}>
        {modes && [["pct", t("stage_billing.mode_pct")], ["rate", t("stage_billing.mode_rate")]].map(([m, l]) => (
          <button key={m} type="button" onClick={() => onMode(m)} style={{ ...btnS(pmode === m ? "primary" : "plain"), padding: "2px 10px" }}>{l}</button>
        ))}
        {presetsFor && presets(presetsFor).map(p => (
          <button key={p.key} type="button" onClick={() => onParts(presetParts(p), "pct")} style={btnS("soft")}>{p.label}</button>
        ))}
      </div>
      <datalist id="sch-grp-list"><option value={t("schedule.grp_structure")} /><option value={t("stage_billing.grp_civil")} /><option value={t("stage_billing.grp_finishing")} /></datalist>
      {parts.map((p, i, arr) => {
        const cumPct = arr.slice(0, i + 1).reduce((s, x) => s + num(x.pct), 0);
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 80px 110px 150px auto", gap: 6, marginBottom: 4, alignItems: "center" }}>
            <input value={p.name} placeholder={t("stage_billing.part_name_ph")} onChange={e => setPart(i, { name: e.target.value })} style={inpS} />
            {pmode === "rate"
              ? <input type="number" value={p.rate} placeholder="₹" aria-label={t("stage_billing.part_rate_ph")} onChange={e => setPart(i, { rate: e.target.value })} style={inpS} />
              : <input type="number" value={p.pct} placeholder="%" onChange={e => setPart(i, { pct: e.target.value })} style={inpS} />}
            <input value={p.group} list="sch-grp-list" placeholder={t("stage_billing.part_group_ph")} onChange={e => setPart(i, { group: e.target.value })} style={inpS} />
            <span style={{ fontSize: 10.5, color: T.ind, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {pmode === "pct"
                ? t("schedule.wiz_cum", { amt: fmtC(num(amount) * num(p.pct) / 100), cum: r2(cumPct) })
                : (oneRate ? r2(num(p.rate) / oneRate * 100) + "%" : "")}
            </span>
            <button type="button" disabled={parts.length <= 2} onClick={() => onParts(parts.filter((_, j) => j !== i))} style={btnS("plain", parts.length <= 2)}>×</button>
          </div>
        );
      })}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 4 }}>
        <button type="button" onClick={() => onParts([...parts, blankPart()])} style={btnS()}>{t("stage_billing.add_part")}</button>
        <span data-testid="parts-sum" style={{ fontSize: 11, fontWeight: 700, color: ok ? T.grn : T.red }}>
          {pmode === "rate"
            ? (oneRate ? t("stage_billing.parts_total_rate", { sum: fmtC(sum), rate: fmtC(oneRate), unit: unit || "—" }) : t("schedule.wiz_rate_scaled", { sum: fmtC(sum) }))
            : t("stage_billing.parts_total", { pct: r2(sum) })}
        </span>
      </div>
      {groups.length > 0 && (
        <div data-testid="parts-groups" style={{ display: "grid", gap: 4, marginTop: 8, paddingTop: 8, borderTop: "1px dashed " + T.b1 }}>
          {groups.map(g => {
            const gs = inGrp(g).reduce((s, p) => s + num(p[key]), 0);
            return (
              <label key={g} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.t2, cursor: "pointer" }}>
                <input type="checkbox" data-together={g} checked={inGrp(g).every(p => p.together)}
                  onChange={e => onParts(parts.map(p => (grpOf(p) === g ? { ...p, together: e.target.checked } : p)))} />
                <span><b style={{ color: T.t1 }}>{g} {pmode === "rate" ? fmtC(gs) : r2(gs) + "%"}</b> · {t("schedule.tg_label")}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 1. Tareeke + "Schedule banao" box ──
export function ScheduleMethods({ kind, id, items, canEdit, qtyCount = 0, onDone }) {
  const [wiz, setWiz] = useState(null);   // { mode: "parts" | "contract", ids: Set, pmode, parts, lib, busy, err, skipped }
  const lines = items || [];
  const plain = lines.filter(x => !x.part_of && num(x.planned_qty) > 0);
  const locked = (x) => num(x.billed_qty) > 0 || num(x.opening_qty) > 0;
  const splitLines = lines.filter(x => x.part_of).length;

  // Ek floor (category) ki 2+ bina-hisse line ek hi unit + area par, aur naam stage
  // jaise (plinth ₹300 / lintel ₹200 / slab ₹200) = pehle se stage — unpar dobara %
  // lagana double hai. "GF Structure" + "GF Finishing" (same area) stage nahi.
  const stageLike = useMemo(() => {
    const by = {}, out = new Set();
    for (const x of plain) {
      const k = (x.category || x.section_title || "") + "¦" + String(x.unit || "").toLowerCase() + "¦" + r2(x.planned_qty);
      (by[k] = by[k] || []).push(x);
    }
    for (const xs of Object.values(by)) {
      if (xs.length >= 2 && xs.filter(x => STAGE_WORD.test(nameOf(x))).length >= 2) for (const x of xs) out.add(x.item_id);
    }
    return out;
  }, [plain]);
  const open = (mode) => {
    const ok = plain.filter(x => !locked(x) && !stageLike.has(x.item_id) && (mode === "parts" || x.item_type !== "extra"));
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
  const rates = new Set(chosen.map(x => r2(x.rate)));
  const oneRate = rates.size === 1 ? [...rates][0] : null;
  // Alag rate wali line chuni hon to Structure + Finishing sabse aam rate par
  const refRate = oneRate != null ? oneRate : (chosen.length ? mostCommon(chosen.map(x => r2(x.rate))) : null);
  const wmode = wiz && wiz.mode !== "contract" ? wiz.pmode : "pct";
  const partsOk = !!wiz && (wiz.lib || partsOkFor(wmode, wiz.parts));
  const toggle = (itemId) => setWiz(w => { const n = new Set(w.ids); if (n.has(itemId)) n.delete(itemId); else n.add(itemId); return { ...w, ids: n }; });

  const apply = async () => {
    const base = kind === "wo" ? "/subcon/wo/" + id : "/customer-estimates/" + id;
    const body = { item_ids: [...wiz.ids], strict: wiz.mode === "contract" };
    if (wiz.lib) body.from_library = true;
    else body.parts = partsBody(wmode, wiz.parts);
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
              {stageLike.size > 0 && <div style={{ padding: "6px 9px", borderRadius: 6, background: T.ambL, color: T.amb, fontSize: 11, marginBottom: 6, lineHeight: 1.45 }}>{t("schedule.stage_like_hint")}</div>}
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
                      {!lk && stageLike.has(x.item_id) && <span style={chip(T.ambL, T.amb)} title={t("schedule.stage_like_title")}>{t("schedule.stage_like_chip")}</span>}
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
              <PartsEditor pmode={wmode} modes={wiz.mode === "parts"} presetsFor={wiz.mode} parts={wiz.parts}
                onParts={(ps, m) => setWiz(w => ({ ...w, parts: ps, ...(m ? { pmode: m } : {}) }))} onMode={(m) => setWiz(w => ({ ...w, pmode: m }))}
                oneRate={oneRate} refRate={refRate} amount={chosenTotal} unit={chosen[0]?.unit || "—"} sf={wiz.mode === "parts" && kind === "estimate"} />
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

// ── 4. Client ke liye Payment Schedule — "kaam poora hone par kitna dena" ──
// Har BOQ kaam (hisson wali line ek card) — stage, %, ₹, kul ab tak, haal. Ek
// hi line (septic) = "Poora kaam" 100%. Extra kaam isme nahi (Chalu Bill me).
// "Ek saath" wale hisse (Finishing — sab floor ka ek saath, 24 Nov 2026) floor ke
// card me nahi: neeche group ka ek card, har stage ka ₹ sab floor ka jod.
// canEdit + onEdit(kaam, sab kaam) ho to har kaam par "Schedule badlo".
const workLocked = (w) => w.all.some(x => num(x.billed_qty) > 0 || num(x.opening_qty) > 0);
export function ClientScheduleView({ items, canEdit, onEdit }) {
  const { cards, together } = useMemo(() => {
    const out = [], idx = {}, tg = [], tidx = {};
    for (const x of items || []) {
      if (x.item_type === "extra" || !(num(x.planned_qty) > 0)) continue;
      const k = (x.category || x.section_title || "") + "¦" + (x.part_of || "#" + x.item_id);
      if (idx[k] === undefined) { idx[k] = out.length; out.push({ key: k, category: x.category || x.section_title || "", name: x.part_of || nameOf(x), lines: [], all: [] }); }
      const c = out[idx[k]];
      c.all.push(x);
      if (!(x.part_of && x.part_together)) { c.lines.push(x); continue; }
      const g = x.part_group || "";
      if (tidx[g] === undefined) { tidx[g] = tg.length; tg.push({ group: g, stages: [], sidx: {} }); }
      const G = tg[tidx[g]], nm = partNameOf(x);
      if (G.sidx[nm] === undefined) { G.sidx[nm] = G.stages.length; G.stages.push({ name: nm, lines: [] }); }
      G.stages[G.sidx[nm]].lines.push({ ...x, _where: c.category || c.name });
    }
    return { cards: out, together: tg };
  }, [items]);
  if (!cards.length) return <div style={{ padding: 14, fontSize: 12, color: T.t4 }}>{t("schedule.cl_empty")}</div>;
  const isBilled = (x) => num(x.planned_qty) > 0 && num(x.billed_qty) >= num(x.planned_qty) - 0.0005;
  const status = (x) => {
    const tk = x.linked_task;
    if (isBilled(x)) return [T.grnL, T.grn, t("schedule.cl_st_billed")];
    if (tk && tk.eligible) return [T.grnL, T.grn, t("schedule.cl_st_done")];
    if (tk && num(tk.progress) > 0) return [T.ambL, T.amb, t("schedule.cl_st_prog", { pct: num(tk.progress) })];
    return [T.sltL, T.slt, t("schedule.cl_st_pend")];
  };
  // Kai floor ki ek stage: sab ka bill → "Bill bana"; sab ka kaam hua → "Kaam hua"; warna jo chal raha
  const statusMany = (xs) => {
    if (xs.every(isBilled)) return [T.grnL, T.grn, t("schedule.cl_st_billed")];
    const tasks = xs.map(x => x.linked_task).filter(Boolean);
    if (tasks.length === xs.length && tasks.every(tk => tk.eligible)) return [T.grnL, T.grn, t("schedule.cl_st_done")];
    const going = tasks.map(tk => num(tk.progress)).filter(p => p > 0);
    if (going.length) return [T.ambL, T.amb, t("schedule.cl_st_prog", { pct: Math.min(...going) })];
    return [T.sltL, T.slt, t("schedule.cl_st_pend")];
  };
  const amtOf = (xs) => xs.reduce((a, x) => a + num(x.planned_qty) * num(x.rate), 0);
  const billedOf = (xs) => xs.reduce((a, x) => a + num(x.billed_qty) * num(x.rate), 0);
  const tdN = { padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
  let grand = 0, billed = 0;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: 11, color: T.t3, lineHeight: 1.45 }}>{t("schedule.cl_hint")}</div>
      {cards.map(c => {
        const qty = num(c.all[0].planned_qty), unit = c.all[0].unit || "";
        const rate = c.lines.reduce((a, x) => a + num(x.rate), 0);
        const amt = amtOf(c.lines);
        grand += amt;
        billed += billedOf(c.lines);
        const tgGroups = [...new Set(c.all.filter(x => x.part_of && x.part_together).map(x => x.part_group || t("schedule.cl_tg_default")))];
        const lk = workLocked(c);
        let cum = 0;
        return (
          <div key={c.key} data-work={c.key} style={{ border: "1px solid " + T.b1, borderRadius: 8, overflow: "hidden", background: T.surface }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 12px", background: T.indL }}>
              {/* Category aur kaam ka naam ek hi ho (package se: "SEPTIC TANK · Septic tank") to naam ek baar */}
              <b style={{ fontSize: 12.5, color: T.ind }}>{c.category && String(c.category).trim().toLowerCase() !== String(c.name || "").trim().toLowerCase() ? c.category + " · " : ""}{c.name}</b>
              <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                {c.lines.length > 0 && <span style={{ fontSize: 12, color: T.ind, fontVariantNumeric: "tabular-nums" }}>{t("schedule.cl_item_head", { qty: fmtQ(qty), unit, rate: fmtC(rate), amt: fmtC(amt) })}</span>}
                {canEdit && onEdit && (
                  <button type="button" data-edit-work={c.key} disabled={lk} title={lk ? t("schedule.edit_locked") : undefined} onClick={() => onEdit(c, cards)}
                    style={{ ...btnS("plain", lk), padding: "2px 9px" }}>✎ {t("schedule.edit_btn")}</button>
                )}
              </span>
            </div>
            {c.lines.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <tbody>
                  {c.lines.map((x, i) => {
                    const a = num(x.planned_qty) * num(x.rate);
                    cum += a;
                    const [bg, fg, label] = status(x);
                    return (
                      <tr key={x.item_id} style={{ borderTop: "1px solid " + T.b1 }}>
                        <td style={{ padding: "7px 12px", color: T.t1 }}>
                          {x.part_of ? t("schedule.cl_stage", { n: i + 1, stage: partNameOf(x) }) : t("schedule.cl_stage_whole", { n: i + 1 })}
                        </td>
                        <td style={{ ...tdN, color: T.t3 }}>{rate > 0 ? r2(num(x.rate) / rate * 100) + "%" : "—"}</td>
                        <td style={{ ...tdN, fontWeight: 800, color: T.t1 }}>{fmtC(a)}</td>
                        <td style={{ ...tdN, fontSize: 11, color: T.t3 }}>{t("schedule.cl_cum", { amt: fmtC(cum) })}</td>
                        <td style={{ padding: "7px 12px", textAlign: "right" }}><span style={chip(bg, fg)}>{label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {tgGroups.length > 0 && (
              <div style={{ padding: "6px 12px", fontSize: 11, color: T.t3, borderTop: "1px solid " + T.b1 }}>
                {t(c.lines.length ? "schedule.cl_rest_together" : "schedule.cl_all_together", { groups: tgGroups.join(", ") })}
              </div>
            )}
          </div>
        );
      })}
      {together.map(G => {
        const all = G.stages.flatMap(s => s.lines);
        const gAmt = amtOf(all), works = new Set(all.map(x => x._where + "¦" + x.part_of)).size;
        grand += gAmt;
        billed += billedOf(all);
        let cum = 0;
        return (
          <div key={"tg¦" + G.group} data-together-card={G.group} style={{ border: "1px solid " + T.grn, borderRadius: 8, overflow: "hidden", background: T.surface }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, padding: "8px 12px", background: T.grnL }}>
              <b style={{ fontSize: 12.5, color: T.grn }}>{t("schedule.cl_tg_title", { group: G.group || t("schedule.cl_tg_default") })}</b>
              <span style={{ fontSize: 12, color: T.grn, fontVariantNumeric: "tabular-nums" }}>{t("schedule.cl_tg_head", { n: works, amt: fmtC(gAmt) })}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <tbody>
                {G.stages.map((s, i) => {
                  const a = amtOf(s.lines);
                  cum += a;
                  const [bg, fg, label] = statusMany(s.lines);
                  return (
                    <tr key={s.name} style={{ borderTop: "1px solid " + T.b1 }}>
                      <td style={{ padding: "7px 12px", color: T.t1 }}>
                        {t("schedule.cl_stage", { n: i + 1, stage: s.name })}
                        <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1 }}>{[...new Set(s.lines.map(x => x._where))].join(" + ")}</div>
                      </td>
                      <td style={{ ...tdN, color: T.t3 }}>{gAmt > 0 ? r2(a / gAmt * 100) + "%" : "—"}</td>
                      <td style={{ ...tdN, fontWeight: 800, color: T.t1 }}>{fmtC(a)}</td>
                      <td style={{ ...tdN, fontSize: 11, color: T.t3 }}>{t("schedule.cl_cum", { amt: fmtC(cum) })}</td>
                      <td style={{ padding: "7px 12px", textAlign: "right" }}><span style={chip(bg, fg)}>{label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 16, padding: "8px 12px", borderRadius: 8, background: T.surfaceB, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: T.t2 }}>{t("schedule.cl_billed")} <b>{fmtC(billed)}</b></span>
        <span style={{ color: T.ind, fontWeight: 800 }}>{t("schedule.cl_total")} {fmtC(grand)}</span>
      </div>
    </div>
  );
}

// ── 5. "Schedule badlo" — ek kaam ke stage (naam, % / ₹, group, ek saath) badlo ──
// work / works = ClientScheduleView ke card (all = us kaam ki saari line). Server
// POST /customer-estimates/:id/schedule/replace: purane hisse hat kar naye, total wahi;
// jis stage ka naam wahi raha uska task bana rehta hai. Bill wale kaam par nahi.
export function ScheduleEditModal({ estimateId, work, works, onClose, onDone }) {
  const lines = work.all, split = !!lines[0].part_of;
  const rate = r2(lines.reduce((s, x) => s + num(x.rate), 0)), qty = num(lines[0].planned_qty), unit = lines[0].unit || "";
  const [pmode, setPmode] = useState(split ? "rate" : "pct");
  const [parts, setParts] = useState(() => (split
    ? lines.map(x => ({ name: partNameOf(x), pct: "", rate: String(r2(x.rate)), group: x.part_group || "", together: !!x.part_together }))
    : presetParts(presets("parts")[0])));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [skipped, setSkipped] = useState([]);
  const sig = (w) => (w.all[0].part_of ? w.all.map(x => partNameOf(x) + "|" + (x.part_group || "")).join("¦") : "");
  const others = useMemo(() => (works || []).filter(w => w.key !== work.key && !workLocked(w)
    && String(w.all[0].unit || "").toLowerCase() === unit.toLowerCase()), [works, work, unit]);
  // Jin kaam ka schedule aaj bilkul yahi hai (jaise FF) un par tick pehle se
  const [also, setAlso] = useState(() => new Set(split ? others.filter(w => sig(w) === sig(work)).map(w => w.key) : []));
  // % ↔ ₹: number kaam ke rate se badal kar (jod poora ho to aakhri hissa baaki le leta hai)
  const switchMode = (m) => {
    if (m === pmode) return;
    const total = parts.reduce((s, p) => s + num(p[pmode]), 0);
    const full = pmode === "rate" ? Math.abs(total - rate) < 0.005 : Math.abs(total - 100) < 0.01;
    let used = 0;
    setParts(parts.map((p, i) => {
      if (!(num(p[pmode]) > 0)) return { ...p, [m]: "" };
      const raw = m === "pct" ? num(p.rate) / rate * 100 : rate * num(p.pct) / 100;
      const v = full && i === parts.length - 1 ? r2((m === "pct" ? 100 : rate) - used) : r2(raw);
      used = r2(used + v);
      return { ...p, [m]: String(v) };
    }));
    setPmode(m);
  };
  const sumRate = parts.reduce((s, p) => s + num(p.rate), 0);
  const okParts = partsOkFor(pmode, parts) && (pmode !== "rate" || Math.abs(sumRate - rate) < 0.005);
  const save = async () => {
    setBusy(true); setErr(""); setSkipped([]);
    const ids = [lines[0].item_id, ...others.filter(w => also.has(w.key)).map(w => w.all[0].item_id)];
    const r = await api.post("/customer-estimates/" + estimateId + "/schedule/replace", { item_ids: ids, parts: partsBody(pmode, parts) })
      .catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setErr(r?.message || t("schedule.failed")); setSkipped(r?.data?.skipped || []); return; }
    const sk = r.data.skipped || [];
    onDone && onDone(t("schedule.edit_done", { n: r.data.done.length }) + (sk.length ? " — " + sk.map(s => (s.name || "#" + s.item_id) + ": " + s.reason).join("; ") : ""));
  };
  const workName = (w) => (w.category && String(w.category).trim().toLowerCase() !== String(w.name || "").trim().toLowerCase() ? w.category + " · " : "") + w.name;
  return (<>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300 }} onClick={() => !busy && onClose()} />
    <div role="dialog" aria-label={t("schedule.edit_title")} data-testid="sched-edit"
      style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 760, maxWidth: "96vw", maxHeight: "90vh",
        background: T.surface, borderRadius: 12, zIndex: 301, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.b1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("schedule.edit_title")}</div>
        <div style={{ fontSize: 11.5, color: T.t3, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
          <b style={{ color: T.t1 }}>{workName(work)}</b> — {t("schedule.cl_item_head", { qty: fmtQ(qty), unit, rate: fmtC(rate), amt: fmtC(qty * rate) })}
        </div>
      </div>
      <div style={{ padding: "12px 18px", overflowY: "auto", flex: 1, display: "grid", gap: 12 }}>
        <PartsEditor pmode={pmode} modes presetsFor="parts" parts={parts} onParts={(ps, m) => { setParts(ps); if (m) setPmode(m); }} onMode={switchMode}
          oneRate={rate} amount={qty * rate} unit={unit || "—"} sf strictRate />
        {pmode === "rate" && partsOkFor(pmode, parts) && !okParts && (
          <div role="alert" data-testid="sched-edit-sum" style={{ padding: "6px 9px", borderRadius: 6, background: T.redL, color: T.red, fontSize: 11.5 }}>
            {t("schedule.edit_rate_must", { sum: fmtC(sumRate), rate: fmtC(rate) })}
          </div>
        )}
        {others.length > 0 && (
          <div>
            <label style={lblS}>{t("schedule.edit_also", { n: also.size })}</label>
            <div style={{ border: "1px solid " + T.b1, borderRadius: 8, maxHeight: 150, overflowY: "auto" }}>
              {others.map(w => (
                <label key={w.key} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 10px", borderTop: "1px solid " + T.b1, fontSize: 11.5, cursor: "pointer" }}>
                  <input type="checkbox" data-also={w.key} checked={also.has(w.key)}
                    onChange={() => setAlso(s => { const n = new Set(s); if (n.has(w.key)) n.delete(w.key); else n.add(w.key); return n; })} />
                  <span style={{ flex: 1, minWidth: 0, color: T.t1, fontWeight: 700 }}>{workName(w)}</span>
                  <span style={{ color: T.t3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    {fmtQ(w.all[0].planned_qty)} {w.all[0].unit} × {fmtC(w.all.reduce((s, x) => s + num(x.rate), 0))}
                  </span>
                </label>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: T.t4, marginTop: 4 }}>{t("schedule.edit_also_hint")}</div>
          </div>
        )}
        {split && <div style={{ fontSize: 10.5, color: T.t3, lineHeight: 1.45 }}>{t("schedule.edit_keep_hint")}</div>}
        {err && (
          <div role="alert" style={{ padding: "8px 10px", borderRadius: 7, background: T.redL, color: T.red, fontSize: 11.5 }}>
            {err}
            {skipped.length > 0 && <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{skipped.map(s => <li key={s.item_id}>{(s.name || "#" + s.item_id) + " — " + s.reason}</li>)}</ul>}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 18px", borderTop: "1px solid " + T.b1, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={busy} onClick={onClose} style={btnS()}>{t("common.cancel")}</button>
        <button type="button" data-testid="sched-edit-save" disabled={busy || !okParts} onClick={save} style={btnS("primary", busy || !okParts)}>
          {busy ? t("common.saving_2") : t("schedule.edit_save", { n: 1 + also.size })}
        </button>
      </div>
    </div>
  </>);
}
