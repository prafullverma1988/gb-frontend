// ════════════════════════════════════════════════════════════════
// CRM Package Quote — Payment schedule (15 Nov 2026, Prafull)
//
// Har amount wali line ka paisa kis kaam par milega: hisse (naam, %, group
// jaise "Structure"). Jod 100%, kam se kam 2 hisse — ya khaali = kaam poora
// hone par poora paisa. ₹ server ke computed se (Save se pehle ≈ andaza).
//   • Stage Library se (24 Nov 2026, Prafull: "package me bhi schedule stage
//     library se … last memory type logic ki jarurat nahi"): upar library
//     select karo → "Library se sab line bharo" (naam se, Library se lagao jaisa);
//     har line par "📚 Library se". Ek stage wala set = kaam poora hone par.
//   • Company ki "yaad" (Isko default bana do / Saved schedules / AI milao) hata.
// Naya quote server par hi library se bhar kar banta hai (routes/sales-quotes.js).
// ════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { t } from "../../i18n";
import PickSelect from "../../components/PickSelect";
import { T, btn, inp, card } from "./pkgUi";
import { inr } from "./pkgUtil";
import { normParts, partsForScope, partsProblem, partsSum } from "./quoteUtil";
import { loadLibs, matchLibItem } from "../tabs/StageLibrary";

// Library ka set → line ke hisse (form ki shakl). 1 stage (100%) = [] = kaam poora hone par.
// "Structure only" scope par Finishing ke stage nahi (partsForScope).
export const libParts = (it, scope) => {
  const P = it && it.parts ? partsForScope(it.parts, scope) : [];
  return P.length >= 2 ? P.map((p) => ({ name: p.name, pct: String(p.pct), group: p.group || "", ...(p.together ? { together: true } : {}) })) : [];
};
// Quote ki line → library ka set: row key (gf, septic_tank) ya line ka naam
export const libMatch = (items, row) => matchLibItem(items, { category: row.row_key || "", name: row.description || "" });

const th = { padding: "6px 6px", fontSize: 10.5, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", textAlign: "left", background: T.surfaceB, whiteSpace: "nowrap" };
const td = { padding: "4px 5px", borderTop: "1px solid " + T.b1, verticalAlign: "middle" };
const cellInp = { ...inp, minHeight: 34, padding: "5px 7px", fontSize: 13.5 };
const sv = (v) => (v == null ? "" : String(v));

function problemText(code, sum) {
  if (code === "min2") return t("sales_quote_ui.sched_err_min2");
  if (code === "fill") return t("sales_quote_ui.sched_err_fill");
  if (code === "sum") return t("sales_quote_ui.sched_err_sum", { sum: inr(sum) });
  return "";
}

function LineSchedule({ row, parts, editable, onParts, copyFrom, isBad, preview, libItems, scope }) {
  const P = parts || [];
  const problem = partsProblem(P);
  const sum = partsSum(P);
  const amounts = row.schedule && !problem && row.schedule.length === P.length ? row.schedule.map((x) => x.amount) : null;
  const setPart = (i, patch) => onParts(P.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const addPart = () => {
    const last = P[P.length - 1];
    const left = Math.max(0, Math.round((100 - sum) * 100) / 100);
    onParts([...P, { name: "", pct: left > 0 ? String(left) : "", group: last ? last.group || "" : "" }]);
  };
  const others = (copyFrom || []).filter((x) => x.key !== row.key);
  return (
    <div data-sched={row.key} style={{ border: "1px solid " + (isBad || (problem && P.length) ? T.redM : T.b1), borderRadius: 10, padding: 10, marginBottom: 10, background: T.surface }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", marginBottom: 6 }}>
        <b style={{ flex: "1 1 160px", fontSize: 13.5, color: T.t1, overflowWrap: "anywhere" }}>{row.description}</b>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: T.t1, whiteSpace: "nowrap" }}>{row.amount != null ? (preview ? "≈ ₹" : "₹") + inr(row.amount) : "—"}</span>
      </div>
      {!P.length ? (
        <div style={{ fontSize: 12.5, color: T.t3, marginBottom: editable ? 8 : 0 }}>{t("sales_quote_ui.sched_on_completion")}</div>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", maxWidth: "100%" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 290 }}>
            <thead><tr>
              <th style={th}>{t("sales_quote_ui.col_group")}</th>
              <th style={th}>{t("sales_quote_ui.col_stage")}</th>
              <th style={{ ...th, textAlign: "right" }}>%</th>
              {editable ? <th style={th} /> : <th style={{ ...th, textAlign: "right" }}>₹</th>}
            </tr></thead>
            <tbody>
              {P.map((p, i) => (
                <tr key={i} data-part={i}>
                  <td style={{ ...td, width: editable ? 84 : "26%" }}>
                    {editable ? <input list="qt-groups" value={sv(p.group)} onChange={(e) => setPart(i, { group: e.target.value })} placeholder={t("sales_quote_ui.group_ph")}
                      aria-label={t("sales_quote_ui.col_group")} style={cellInp} /> : <span style={{ fontSize: 12.5, color: T.t3 }}>{p.group || ""}</span>}
                  </td>
                  <td style={td}>
                    {editable ? <input value={sv(p.name)} onChange={(e) => setPart(i, { name: e.target.value })} placeholder={t("sales_quote_ui.stage_ph")}
                      aria-label={t("sales_quote_ui.col_stage")} data-part-name={i} style={cellInp} /> : <span style={{ fontSize: 13 }}>{p.name}</span>}
                  </td>
                  <td style={{ ...td, width: 64, textAlign: "right" }}>
                    {editable ? (
                      <>
                        <input value={sv(p.pct)} inputMode="decimal" onChange={(e) => setPart(i, { pct: e.target.value })} aria-label="%" data-part-pct={i}
                          style={{ ...cellInp, textAlign: "right", width: 58 }} />
                        <div data-part-amt={i} style={{ fontSize: 10.5, color: T.t3, whiteSpace: "nowrap", marginTop: 1 }}>{amounts ? (preview ? "≈ " : "") + "₹" + inr(amounts[i]) : "—"}</div>
                      </>
                    ) : <span style={{ fontSize: 13 }}>{inr(p.pct)}%</span>}
                  </td>
                  {!editable ? <td data-part-amt={i} style={{ ...td, textAlign: "right", whiteSpace: "nowrap", fontSize: 12.5, color: T.t2 }}>{amounts ? inr(amounts[i]) : "—"}</td> : null}
                  {editable ? (
                    <td style={{ ...td, width: 34 }}>
                      <button type="button" onClick={() => onParts(P.filter((_, j) => j !== i))} aria-label={t("sales_quote_ui.remove_part")} title={t("sales_quote_ui.remove_part")}
                        style={{ ...btn("danger"), minHeight: 30, width: 30, padding: 0 }}>×</button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {P.length ? (
        <div data-sum={row.key} style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: problem ? T.red : T.grn }}>
          {problem ? "⚠ " + problemText(problem, sum) : "✓ " + t("sales_quote_ui.sched_sum_ok", { sum: inr(sum) })}
        </div>
      ) : null}
      {editable ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
          {libItems && libItems.length ? (
            <PickSelect value="" onChange={(e) => { const it = libItems.find((x) => x.key === e.target.value); if (it) onParts(libParts(it, scope)); }}
              style={{ ...inp, minHeight: 34, width: "auto", maxWidth: 220, fontSize: 12.5, padding: "5px 8px" }} aria-label={t("sales_quote_ui.lib_pick_line")}>
              <option value="">📚 {t("sales_quote_ui.lib_pick_line")}</option>
              {libItems.map((x) => <option key={x.key} value={x.key}>{x.label}{x.parts.length < 2 ? " — " + t("sales_quote_ui.lib_one_stage") : ""}</option>)}
            </PickSelect>
          ) : null}
          <button type="button" onClick={addPart} data-add-part={row.key} style={btn("soft")}>+ {P.length ? t("sales_quote_ui.add_part") : t("sales_quote_ui.make_schedule")}</button>
          {others.length ? (
            <PickSelect value="" onChange={(e) => { const src = others.find((x) => x.key === e.target.value); if (src) onParts(normParts(src.parts).map((p) => ({ ...p, pct: String(p.pct), group: p.group || "" }))); }}
              style={{ ...inp, minHeight: 34, width: "auto", maxWidth: 220, fontSize: 12.5, padding: "5px 8px" }} aria-label={t("sales_quote_ui.copy_from")}>
              <option value="">⧉ {t("sales_quote_ui.copy_from")}</option>
              {others.map((x) => <option key={x.key} value={x.key}>{x.description}</option>)}
            </PickSelect>
          ) : null}
          {P.length ? <button type="button" onClick={() => onParts([])} style={btn()}>{t("sales_quote_ui.clear_schedule")}</button> : null}
        </div>
      ) : null}
    </div>
  );
}

// Upar: library select + "Library se sab line bharo". Naye quote me server pehle se bhar deta hai.
function LibBar({ libs, libId, setLibId, onFill }) {
  if (libs == null) return null;
  if (!libs.length) return <div data-testid="qt-lib-none" style={{ fontSize: 12.5, color: T.t3, margin: "6px 0 10px", lineHeight: 1.45 }}>📚 {t("sales_quote_ui.lib_none")}</div>;
  return (
    <div data-testid="qt-lib-bar" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "6px 0 10px", padding: "8px 10px", background: T.indL || T.surfaceB, borderRadius: 10 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>📚 {t("sales_quote_ui.lib_label")}</span>
      <PickSelect value={libId} onChange={(e) => setLibId(e.target.value)} aria-label={t("sales_quote_ui.lib_label")}
        style={{ ...inp, minHeight: 34, width: "auto", maxWidth: 220, fontSize: 12.5, padding: "5px 8px" }}>
        {libs.map((l) => <option key={l.id} value={String(l.id)}>{l.name}</option>)}
      </PickSelect>
      <button type="button" onClick={onFill} data-testid="btn-lib-fill" style={btn("primary")}>{t("sales_quote_ui.lib_fill_all")}</button>
      <span style={{ fontSize: 11.5, color: T.t3, flex: "1 1 220px" }}>{t("sales_quote_ui.lib_hint")}</span>
    </div>
  );
}

// scope: "structure" par Finishing ke stage nahi
export default function QuoteSchedule({ rows, schedule, onSchedule, editable, badKeys, preview, scope }) {
  const [libs, setLibs] = useState(null);
  const [libId, setLibId] = useState("");
  useEffect(() => {
    if (!editable) return undefined;
    let on = true;
    loadLibs(true).then((l) => { if (!on) return; setLibs(l); if (l.length) setLibId(String(l[0].id)); });   // har baar taaza
    return () => { on = false; };
  }, [editable]);
  const lib = (libs || []).find((l) => String(l.id) === String(libId)) || null;
  const S = schedule || {};
  const list = (rows || []).filter((r) => r.amount || (Array.isArray(S[r.key]) && S[r.key].length));
  const withParts = list.filter((r) => Array.isArray(S[r.key]) && S[r.key].length && !partsProblem(S[r.key])).map((r) => ({ key: r.key, description: r.description, parts: S[r.key] }));
  const groups = [...new Set(["Structure", "Finishing", ...Object.values(S).flat().map((p) => p && p.group).filter(Boolean)])];
  // Har line ko library ka set naam se; na mila to jaisa tha
  const fillAll = () => {
    if (!lib) return;
    const next = { ...S };
    let n = 0;
    const miss = [];
    for (const r of list) {
      const it = libMatch(lib.items, r);
      if (!it) { miss.push(r.description); continue; }
      next[r.key] = libParts(it, scope);
      n++;
    }
    onSchedule(next);
    window.toast?.success?.(t("sales_quote_ui.lib_filled", { n, lib: lib.name }) + (miss.length ? " — " + t("sales_quote_ui.lib_missed", { list: miss.join(", ") }) : ""));
  };

  return (
    <div style={{ ...card, marginBottom: 12 }} data-testid="qt-schedule">
      <datalist id="qt-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: T.t1 }}>{t("sales_quote_ui.sched_title")}</div>
        <div style={{ fontSize: 12, color: T.t3, marginTop: 2, lineHeight: 1.45 }}>{t("sales_quote_ui.sched_hint")}</div>
      </div>
      {editable ? <LibBar libs={libs} libId={libId} setLibId={setLibId} onFill={fillAll} /> : null}
      {!list.length ? <div style={{ fontSize: 13, color: T.t4, padding: "6px 0" }}>{t("sales_quote_ui.sched_empty")}</div> : list.map((r) => (
        <LineSchedule key={r.key} row={r} parts={S[r.key]} editable={editable} isBad={badKeys && badKeys.has(r.key)} preview={preview}
          onParts={(p) => onSchedule({ ...S, [r.key]: p })} copyFrom={withParts} libItems={lib ? lib.items : null} scope={scope} />
      ))}
    </div>
  );
}
