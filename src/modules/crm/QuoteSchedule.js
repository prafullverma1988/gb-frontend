// ════════════════════════════════════════════════════════════════
// CRM Package Quote — Payment schedule (15 Nov 2026, Prafull)
//
// Har amount wali line ka paisa kis kaam par milega: hisse (naam, %, group
// jaise "Structure"). Jod 100%, kam se kam 2 hisse — ya khaali = kaam poora
// hone par poora paisa. ₹ server ke computed se (Save se pehle ≈ andaza).
//   • "Yaad se / AI se milao" — company ki yaad (pichhle quote / estimate) se
//     exact line, warna AI milta-julta pattern (sirf prastaav, tick karke lagao)
//   • "Isko default bana do" — Save par in line ka schedule company ki yaad me
//   • "Saved schedules" — yaad ki list, hatao
// Server: routes/sales-quotes.js (PUT remember, /schedule-patterns),
// routes/sales-quotes-ai.js (/:id/ai/schedule).
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import PickSelect from "../../components/PickSelect";
import { T, btn, inp, chip, card, Sheet, Spinner, ErrBox, Loading } from "./pkgUi";
import { AI_TIMEOUT, fmtD, inr } from "./pkgUtil";
import { QBASE, ask, normParts, partsProblem, partsSum, scopeLabel } from "./quoteUtil";

const th = { padding: "6px 6px", fontSize: 10.5, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", textAlign: "left", background: T.surfaceB, whiteSpace: "nowrap" };
const td = { padding: "4px 5px", borderTop: "1px solid " + T.b1, verticalAlign: "middle" };
const cellInp = { ...inp, minHeight: 34, padding: "5px 7px", fontSize: 13.5 };
const summary = (parts) => normParts(parts).map((p) => (p.group ? p.group + ": " : "") + p.name + " " + inr(p.pct) + "%").join(" · ");
const sv = (v) => (v == null ? "" : String(v));

function problemText(code, sum) {
  if (code === "min2") return t("sales_quote_ui.sched_err_min2");
  if (code === "fill") return t("sales_quote_ui.sched_err_fill");
  if (code === "sum") return t("sales_quote_ui.sched_err_sum", { sum: inr(sum) });
  return "";
}

function LineSchedule({ row, parts, editable, onParts, copyFrom, isBad, preview }) {
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

// ── Yaad se / AI se milao ka nateeja ──
function SuggestBox({ data, schedule, onApply, onClose }) {
  const S = data.suggestions || [];
  const [picked, setPicked] = useState(() => new Set(S.map((s) => s.key)));
  const toggle = (k) => setPicked((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <div data-testid="sched-suggest" style={{ background: T.purL, border: "1px solid #DDD6FE", borderRadius: 12, padding: 12, marginBottom: 12 }}>
      {!data.patterns ? <div style={{ fontSize: 13, color: T.t2 }}>{t("sales_quote_ui.sched_no_patterns")}</div> : null}
      {S.length ? (
        <div style={{ border: "1px solid " + T.b1, borderRadius: 10, overflow: "hidden", background: "white" }}>
          {S.map((s, i) => (
            <label key={s.key} data-suggest={s.key} style={{ display: "flex", gap: 10, padding: "9px 10px", borderTop: i ? "1px solid " + T.b1 : "none", cursor: "pointer", alignItems: "flex-start" }}>
              <input type="checkbox" checked={picked.has(s.key)} onChange={() => toggle(s.key)} style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.45, overflowWrap: "anywhere" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <b>{s.label}</b>
                  {s.source === "exact" ? <span style={chip(T.grnL, T.grn, T.grnM)}>{t("sales_quote_ui.src_exact")}</span> : <span style={chip(T.purL, T.pur, "#DDD6FE")}>✨ {t("sales_quote_ui.src_ai")}</span>}
                  {schedule && Array.isArray(schedule[s.key]) && schedule[s.key].length ? <span style={chip(T.ambL, "#92400E", T.ambM)}>{t("sales_quote_ui.sched_will_replace")}</span> : null}
                </div>
                <div style={{ fontSize: 12, color: T.t3 }}>{t("sales_quote_ui.sched_from", { name: (s.pattern && (s.pattern.label || s.pattern.line_key)) || "—" })}</div>
                <div style={{ fontSize: 12.5, color: T.t1 }}>{summary(s.pattern && s.pattern.parts)}</div>
                {s.reason ? <div style={{ fontSize: 11.5, color: T.t3, fontStyle: "italic" }}>{s.reason}</div> : null}
              </div>
            </label>
          ))}
        </div>
      ) : data.patterns ? <div style={{ fontSize: 13, color: T.t3 }}>{t("sales_quote_ui.sched_none_found")}</div> : null}
      {(data.no_match || []).length ? (
        <div style={{ fontSize: 12, color: T.t3, marginTop: 8 }}>{t("sales_quote_ui.sched_no_match", { list: data.no_match.map((x) => x.label).join(", ") })}</div>
      ) : null}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={onClose} style={btn()}>{t("sales_quote_ui.close")}</button>
        {S.length ? (
          <button type="button" disabled={!picked.size} data-testid="btn-sched-apply" style={btn("primary", !picked.size)}
            onClick={() => onApply(S.filter((s) => picked.has(s.key)))}>{t("sales_quote_ui.apply_n", { n: picked.size })}</button>
        ) : null}
      </div>
    </div>
  );
}

// ── Saved schedules (company ki yaad) ──
export function SavedPatterns({ scopes, canEdit, onClose }) {
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const r = await api.get(`${QBASE}/schedule-patterns`);
    if (r && r.success) { setList(r.data || []); setErr(""); } else { setList((p) => p || []); setErr((r && r.message) || t("sales_quote_ui.load_failed")); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const del = async (p) => {
    if (!(await ask(t("sales_quote_ui.confirm_pattern_delete", { name: p.label || p.line_key })))) return;
    const r = await api.del(`${QBASE}/schedule-patterns/${p.id}`);
    if (r && r.success) load(); else window.toast?.error?.((r && r.message) || t("sales_quote_ui.save_failed"));
  };
  return (
    <Sheet heading={t("sales_quote_ui.saved_title")} subline={t("sales_quote_ui.saved_sub")} onClose={onClose}>
      <ErrBox>{err}</ErrBox>
      {list == null ? <Loading text={t("sales_quote_ui.loading")} /> : !list.length ? <div style={{ fontSize: 13, color: T.t3 }}>{t("sales_quote_ui.saved_empty")}</div> : (
        <div style={{ border: "1px solid " + T.b1, borderRadius: 10, overflow: "hidden" }} data-testid="saved-patterns">
          {list.map((p, i) => (
            <div key={p.id} data-pattern={p.id} style={{ display: "flex", gap: 10, padding: "10px 12px", borderTop: i ? "1px solid " + T.b1 : "none", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <b style={{ fontSize: 13, overflowWrap: "anywhere" }}>{p.label || p.line_key}</b>
                  <span style={chip(T.sltL, T.slt)}>{p.scope === "any" ? t("sales_quote_ui.scope_any") : scopeLabel(p.scope, scopes)}</span>
                  <span style={chip(T.surfaceB, T.t3, T.b1)}>{p.source === "estimate" ? t("sales_quote_ui.pat_src_estimate") : t("sales_quote_ui.pat_src_quote")}</span>
                </div>
                <div style={{ fontSize: 12.5, color: T.t1, marginTop: 3, lineHeight: 1.45 }}>{summary(p.parts)}</div>
                <div style={{ fontSize: 11, color: T.t4, marginTop: 2 }}>{t("sales_quote_ui.pat_meta", { n: p.use_count || 1, at: fmtD(p.updated_at) })}</div>
              </div>
              {canEdit ? <button type="button" onClick={() => del(p)} style={btn("danger")} aria-label={t("sales_quote_ui.delete")}>🗑</button> : null}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

export default function QuoteSchedule({ quoteId, rows, schedule, onSchedule, editable, canEdit, badKeys, remember, onRemember, dirty, scopes, preview }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sugg, setSugg] = useState(null);
  const [showSaved, setShowSaved] = useState(false);
  const S = schedule || {};
  const list = (rows || []).filter((r) => r.amount || (Array.isArray(S[r.key]) && S[r.key].length));
  const withParts = list.filter((r) => Array.isArray(S[r.key]) && S[r.key].length && !partsProblem(S[r.key])).map((r) => ({ key: r.key, description: r.description, parts: S[r.key] }));
  const groups = [...new Set(["Structure", "Finishing", ...Object.values(S).flat().map((p) => p && p.group).filter(Boolean)])];

  const match = async () => {
    if (dirty) { window.toast?.warning?.(t("sales_quote_ui.save_first")); setErr(t("sales_quote_ui.save_first")); return; }
    setBusy(true); setErr(""); setSugg(null);
    const r = await api.post(`${QBASE}/${quoteId}/ai/schedule`, {}, { timeoutMs: AI_TIMEOUT });
    setBusy(false);
    if (r && r.success && r.data) setSugg(r.data); else setErr((r && r.message) || t("sales_quote_ui.ai_failed"));
  };
  const apply = (picks) => {
    const next = { ...S };
    for (const s of picks) next[s.key] = normParts(s.pattern && s.pattern.parts).map((p) => ({ ...p, pct: String(p.pct), group: p.group || "" }));
    onSchedule(next);
    setSugg(null);
    window.toast?.success?.(t("sales_quote_ui.sched_applied", { n: picks.length }));
  };

  return (
    <div style={{ ...card, marginBottom: 12 }} data-testid="qt-schedule">
      <datalist id="qt-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 6 }}>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: T.t1 }}>{t("sales_quote_ui.sched_title")}</div>
          <div style={{ fontSize: 12, color: T.t3, marginTop: 2, lineHeight: 1.45 }}>{t("sales_quote_ui.sched_hint")}</div>
        </div>
        <button type="button" onClick={() => setShowSaved(true)} style={{ ...btn(), fontSize: 12 }} data-testid="btn-saved-patterns">🧠 {t("sales_quote_ui.saved_link")}</button>
      </div>
      {editable ? (
        <div style={{ margin: "6px 0 10px" }}>
          <button type="button" onClick={match} disabled={busy} data-testid="btn-sched-match" style={btn("ai", busy)}>
            {busy ? <Spinner size={13} color={T.pur} /> : "✨"} {t("sales_quote_ui.sched_match_btn")}
          </button>
        </div>
      ) : null}
      <ErrBox>{err}</ErrBox>
      {sugg ? <SuggestBox data={sugg} schedule={S} onApply={apply} onClose={() => setSugg(null)} /> : null}
      {!list.length ? <div style={{ fontSize: 13, color: T.t4, padding: "6px 0" }}>{t("sales_quote_ui.sched_empty")}</div> : list.map((r) => (
        <LineSchedule key={r.key} row={r} parts={S[r.key]} editable={editable} isBad={badKeys && badKeys.has(r.key)} preview={preview}
          onParts={(p) => onSchedule({ ...S, [r.key]: p })} copyFrom={withParts} />
      ))}
      {editable ? (
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: T.t1, cursor: "pointer", marginTop: 4, padding: "8px 10px", background: T.grnL, border: "1px solid " + T.grnM, borderRadius: 10 }}>
          <input type="checkbox" checked={!!remember} onChange={(e) => onRemember(e.target.checked)} data-testid="chk-remember" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
          <span><b>{t("sales_quote_ui.remember_label")}</b><br /><span style={{ fontSize: 11.5, color: T.t3 }}>{t("sales_quote_ui.remember_hint")}</span></span>
        </label>
      ) : null}
      {showSaved ? <SavedPatterns scopes={scopes} canEdit={canEdit} onClose={() => setShowSaved(false)} /> : null}
    </div>
  );
}
