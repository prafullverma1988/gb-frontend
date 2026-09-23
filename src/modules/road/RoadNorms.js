// ══════════════════════════════════════════════════════════════════════
// ROAD LEVELS — Norms: "1 cum khudai me kitna excavator-ghanta".
//
// Budget isi par tika hai. System ke shuruaati ankde sirf shuruaat hain —
// har company apni machine, mitti aur crew ke hisaab se inhe yahan badalti
// hai. Ek kaam ka override POORA hota hai (saari lines); "System ke ankde
// wapas" se wo kaam phir seed par aa jaata hai.
//
// Do tarah ki line haath se nahi bharti, unki qty calculation se aati hai:
//   • lead wali (tipper ke phere)  — sirf gaadi ki capacity badalti hai
//   • totals wali (murum ka loose volume) — kuch nahi badalta
//
// Sujhaav (sirf project me): machine log se asli ghanta per unit. Dikhta
// hai; lagata aadmi hai. Kam data par server sujhaav deta hi nahi.
//
// API: GET /road/norms · PUT /road/norms/:code · DELETE /road/norms/:code
//      GET /road/norms/suggestions?project_id=
// ══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from "react";
import { T } from "../shared/tokens";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import { t } from "../../i18n";
import { rget, rput, rdelete, dataOf, S, btn, canRoad } from "./roadShared";

const catLabel = (c) => ({
  material: t("road.norm_cat_material"), labour: t("road.norm_cat_labour"),
  machinery: t("road.norm_cat_machinery"), overhead: t("road.norm_cat_overhead"),
})[c] || c;

export default function RoadNorms({ projectId }) {
  const toast = useToast();
  const confirm = useConfirm();
  const mayEdit = canRoad("edit");
  const [items, setItems] = useState(null);
  const [cats, setCats] = useState([]);
  const [sugs, setSugs] = useState([]);
  const [openCode, setOpenCode] = useState(null);
  const [draft, setDraft] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await rget("/norms");
    const d = dataOf(r, null);
    setItems((d && d.items) || []);
    setCats((d && d.categories) || []);
    if (projectId) {
      const s = await rget("/norms/suggestions", { project_id: projectId });
      setSugs((dataOf(s, {}) || {}).suggestions || []);
    }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const open = (it) => {
    if (openCode === it.code) { setOpenCode(null); return; }
    setOpenCode(it.code);
    setDraft(it.lines.map((l) => ({ ...l })));
  };
  const setLine = (i, k, v) => setDraft((d) => d.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  const save = async (code, lines) => {
    setBusy(true);
    const r = await rput("/norms/" + code, { lines });
    setBusy(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.save_failed")); return false; }
    toast.success(r.message || t("road.norm_saved"));
    setOpenCode(null);
    await load();
    return true;
  };
  const reset = async (it) => {
    if (!await confirm({ title: t("road.norm_reset_q"), desc: t("road.norm_reset_desc", { name: it.name }), confirmLabel: t("road.norm_reset_btn") })) return;
    setBusy(true);
    const r = await rdelete("/norms/" + it.code);
    setBusy(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.save_failed")); return; }
    toast.success(r.message || t("road.norm_saved"));
    setOpenCode(null);
    load();
  };
  // Sujhaav lagana = us kaam ki lagu lines me bas wahi ek ankda badalna
  const applySug = async (sg) => {
    const it = (items || []).find((x) => x.code === sg.code);
    if (!it) return;
    const lines = it.lines.map((l) => (l.match === sg.match && l.category === "machinery" && l.unit === "HOUR" ? { ...l, qty_per_unit: sg.actual } : l));
    await save(sg.code, lines);
  };

  if (!items) return <div style={{ padding: 22, fontSize: 12.5, color: T.t4 }}>{t("common.loading")}</div>;

  return (
    <div style={{ ...S.card, marginBottom: 13, overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.norm_title")}</div>
        <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.6, marginTop: 3, maxWidth: 760 }}>{t("road.norm_hint")}</div>
      </div>

      {/* ── Sujhaav ── */}
      {sugs.length > 0 && (
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.b1}`, background: T.ambL }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 6 }}>{t("road.norm_sug_title")}</div>
          {sugs.map((sg, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 12, color: T.t2, lineHeight: 1.7 }}>
              <span>{t("road.norm_sug_line", { task: sg.task_name, match: sg.match, norm: sg.norm, actual: sg.actual, unit: sg.unit, pct: sg.diff_pct, hours: sg.hours, done: sg.done_qty, logs: sg.logs })}</span>
              {mayEdit && (
                <button onClick={() => applySug(sg)} disabled={busy} style={{ ...btn("ghost", { height: 26, fontSize: 11, color: T.ind, borderColor: T.indL }), opacity: busy ? .6 : 1 }}>
                  {t("road.norm_sug_apply", { actual: sg.actual })}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
          <thead>
            <tr>{[t("road.col_work"), t("common.unit"), t("road.norm_col_lines"), t("road.norm_col_source"), ""].map((h, i) => (
              <th key={i} style={{ ...S.th, textAlign: "left" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const isOpen = openCode === it.code;
              return (
                <React.Fragment key={it.code}>
                  <tr>
                    <td style={{ ...S.td, fontWeight: 600, color: T.t1 }}>{it.name}</td>
                    <td style={{ ...S.td, color: T.t3 }}>{it.unit}</td>
                    <td style={{ ...S.td, color: T.t3, fontSize: 11.5 }}>
                      {it.lines.length ? it.lines.map((l) => l.match).join(" · ") : t("road.norm_no_lines")}
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 10,
                        color: it.is_override ? T.ind : T.t3, background: it.is_override ? T.indL : T.surfaceB, border: `1px solid ${it.is_override ? T.indL : T.b1}` }}>
                        {it.is_override ? t("road.norm_src_company") : t("road.norm_src_seed")}
                      </span>
                    </td>
                    <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
                      <button onClick={() => open(it)}
                        style={{ border: "none", background: "none", color: T.ind, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        {isOpen ? t("common.close") : (mayEdit ? t("common.edit") : t("road.norm_view"))}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} style={{ padding: "10px 14px 14px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}` }}>
                        {draft.map((l, i) => {
                          const special = !!(l.lead_formula || l.qty_from_totals);
                          return (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                              <select value={l.category} disabled={!mayEdit || special} onChange={(e) => setLine(i, "category", e.target.value)} style={{ ...S.inp, width: 120 }}>
                                {cats.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
                              </select>
                              <input value={l.match || ""} disabled={!mayEdit} placeholder={t("road.norm_match_ph")}
                                onChange={(e) => setLine(i, "match", e.target.value)} style={{ ...S.inp, width: 190 }} />
                              {l.lead_formula ? (
                                <>
                                  <span style={{ fontSize: 11.5, color: T.t3 }}>{t("road.norm_lead_label")}</span>
                                  <input type="number" step="0.5" value={l.capacity_cum || ""} disabled={!mayEdit}
                                    onChange={(e) => setLine(i, "capacity_cum", e.target.value)} style={{ ...S.inp, width: 84, textAlign: "right" }} />
                                  <span style={{ fontSize: 11.5, color: T.t3 }}>cum</span>
                                </>
                              ) : l.qty_from_totals ? (
                                <span style={{ fontSize: 11.5, color: T.t3 }}>{t("road.norm_totals_label")}</span>
                              ) : (
                                <>
                                  <input type="number" step="0.001" value={l.qty_per_unit == null ? "" : l.qty_per_unit} disabled={!mayEdit}
                                    onChange={(e) => setLine(i, "qty_per_unit", e.target.value)} style={{ ...S.inp, width: 100, textAlign: "right" }} />
                                  <input value={l.unit || ""} disabled={!mayEdit} onChange={(e) => setLine(i, "unit", e.target.value)} style={{ ...S.inp, width: 74 }} />
                                  <span style={{ fontSize: 11.5, color: T.t3 }}>{t("road.norm_per_unit", { unit: it.unit })}</span>
                                </>
                              )}
                              {mayEdit && (
                                <button onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
                                  style={{ border: "none", background: "none", color: T.red, cursor: "pointer", fontSize: 14 }}>×</button>
                              )}
                            </div>
                          );
                        })}
                        {!draft.length && <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 8 }}>{t("road.norm_no_lines")}</div>}
                        {mayEdit && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                            <button onClick={() => setDraft((d) => [...d, { category: "machinery", match: "", unit: "HOUR", qty_per_unit: "" }])}
                              style={{ border: `1px dashed ${T.b2}`, background: "none", borderRadius: 6, padding: "3px 11px", fontSize: 11.5, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>
                              + {t("road.norm_add_line")}
                            </button>
                            <div style={{ display: "flex", gap: 8 }}>
                              {it.is_override && (
                                <button onClick={() => reset(it)} disabled={busy} style={{ ...btn("ghost", { height: 30, fontSize: 11.5 }), opacity: busy ? .6 : 1 }}>{t("road.norm_reset_btn")}</button>
                              )}
                              <button onClick={() => save(it.code, draft)} disabled={busy} style={{ ...btn("primary", { height: 30, fontSize: 11.5 }), opacity: busy ? .6 : 1 }}>
                                {busy ? t("road.btn_wait") : t("common.save")}
                              </button>
                            </div>
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: T.t4, lineHeight: 1.6, marginTop: 9 }}>{t("road.norm_match_note")}</div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
