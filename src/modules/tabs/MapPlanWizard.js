import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

/* ────────────────────────────────────────────────────────────────────
   MAP SE PLAN — F2 (+ 2026-08-20 ka sudhaar)

   Prafull ka ask: "ek project me parent task road, pipe line, ugr,
   boundary wall, drain line ho, uske andar ugr1 ugr2, aise hi pipe
   line ke stretch names — hierarchy fill karna easy ho".

   Wo tree map par PEHLE SE pada hai. To yahan PM sirf tick karta hai:

     Pipe line — Rising main        ← type ka parent
      ├─ CH 0-500      [1,037] RMT  ← lambai MAP se bhari hui, PM BADAL
      └─ CH 900-1400   [  963] RMT     sakta hai (site ka asli chainage)
     UGR                            ← structures ka parent
      ├─ UGR-1  → Excavation, PCC bed…   ← stages (template ya AI, edit PM ka)
      └─ UGR-2

   2026-08-20 (Prafull):
   • Qty ab EDIT hoti hai — "aap length dikhate ho par wo editable nahi
     aur task me reflect bhi nahi karta". Map ki lambai default hai,
     aakhiri number PM ka.
   • "✓ pehle se bana hua" task ab chhoot-ta nahi — tick karo to uspar
     SCOPE likh diya jaata hai (naya task nahi banta).
   • Line par bhi stages — "template bharo" ya "AI se sujhao"; ghata-
     jodh PM ka. Stage lagte hi scope har stage par jaata hai (khudai
     bhi 72 m, laying bhi 72 m — har stage apni qty me napega).

   Backend: GET  /tasks/project/:id/map-plan   (preview)
            POST /tasks/project/:id/map-plan   (banao / scope likho)
            POST /tasks/stage-suggest          (AI sujhaav, template fallback)
   ──────────────────────────────────────────────────────────────────── */

const fmtLen = (m) => Number(m || 0) >= 1000
  ? (Number(m) / 1000).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " km"
  : Math.round(Number(m || 0)) + " m";

export default function MapPlanWizard({ projectId, onClose, onDone }) {
  const [data, setData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [openStage, setOpenStage] = useState(null);   // "gi:ci" — stage list khuli
  const [aiBusy, setAiBusy] = useState(null);         // "gi:ci" — AI sujhaav aa raha
  // Line par stages ab default me bhare aate hain. Kisi PM ko sirf line-
  // level task chahiye (37 line × 6 stage = 222 task bahut ho jaate hain),
  // isliye ek hi switch se sab lines ke stages hata/laga sakte ho.
  const lineStagesOn = groups.some((g) => g.kind === "line" && g.children.some((c) => (c.stages || []).length));
  const toggleLineStages = () => setGroups((gs) => gs.map((g) => g.kind !== "line" ? g : ({
    ...g, children: g.children.map((c) => ({ ...c,
      stages: lineStagesOn ? [] : [...(c.stage_template || [])] })) })));

  const load = useCallback(async () => {
    const r = await api.get(`/tasks/project/${projectId}/map-plan`);
    if (!r?.success) { setErr(r?.message || "Map ka plan nahi mila"); return; }
    setData(r.data);
    // Naye by default tick; pehle se bane untick (tick karoge to scope likhega).
    setGroups((r.data.groups || []).map((g) => ({
      ...g,
      children: (g.children || []).map((c) => ({ ...c, take: !c.already })),
    })));
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const updChild = (gi, ci, patch) => setGroups((gs) => gs.map((g, i) =>
    i !== gi ? g : { ...g, children: g.children.map((c, j) => (j === ci ? { ...c, ...patch } : c)) }));
  const canTick = (c) => !(c.already && c.task_has_children);
  const toggleGroup = (gi, on) => setGroups((gs) => gs.map((g, i) =>
    i !== gi ? g : { ...g, children: g.children.map((c) => (canTick(c) ? { ...c, take: on } : c)) }));

  const newCount = groups.reduce((s, g) => s + g.children.filter((c) => c.take && !c.already).length, 0);
  const scopeCount = groups.reduce((s, g) => s + g.children.filter((c) => c.take && c.already).length, 0);
  const taskCount = groups.reduce((s, g) => {
    const kids = g.children.filter((c) => c.take && !c.already);
    if (!kids.length) return s;
    return s + 1 + kids.length + kids.reduce((x, c) => x + (c.stages?.length || 0), 0);
  }, 0);

  const suggestStages = async (gi, ci, g, c) => {
    const key = gi + ":" + ci;
    setAiBusy(key);
    const r = await api.post("/tasks/stage-suggest", { name: c.name, atype: g.atype, kind: g.kind },
      { timeoutMs: 45000 });
    setAiBusy(null);
    if (r?.success && r.data?.stages?.length) updChild(gi, ci, { stages: r.data.stages });
  };

  const create = async () => {
    setBusy(true); setErr("");
    const payload = groups
      .map((g) => ({ group: g.group, kind: g.kind, atype: g.atype,
        children: g.children.filter((c) => c.take)
          .map((c) => c.already
            // Purana task: sirf scope likhna hai — naya nahi banana.
            ? { alignment_id: c.alignment_id, name: c.name, existing_task_id: c.task_id,
                scope_qty: g.kind === "line" ? Number(c.scope_qty) || null : null }
            : { alignment_id: c.alignment_id, name: c.name, stages: c.stages,
                scope_qty: g.kind === "line" ? Number(c.scope_qty) || null : null }) }))
      .filter((g) => g.children.length);
    const r = await api.post(`/tasks/project/${projectId}/map-plan`, { groups: payload });
    setBusy(false);
    if (!r?.success) { setErr(r?.message || "Plan nahi bana"); return; }
    onDone?.(r.message);
    onClose?.();
  };

  const th = { padding: "7px 10px", fontSize: 10, fontWeight: 700, color: T.t4,
    textTransform: "uppercase", letterSpacing: ".4px", textAlign: "left" };
  const chipBtn = (on) => ({ fontSize: 10.5, padding: "3px 9px", borderRadius: 14, cursor: "pointer",
    border: `1px solid ${on ? T.ind : T.b1}`, background: on ? T.indL : T.surface,
    color: on ? T.ind : T.t3, fontFamily: "inherit", fontWeight: 700 });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={{ background: T.surface, borderRadius: 13, width: "min(880px, 100%)",
        maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>{t("map_plan_wizard.map_se_plan_lao")}</div>
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>
           {t("map_plan_wizard.naam_aur_lambai_map_se_aati")}
          </div>
          {groups.some((g) => g.kind === "line") && (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={lineStagesOn} onChange={toggleLineStages} />
              <span style={{ fontSize: 11.5, color: T.t2 }}>
               {t("map_plan_wizard.har_line_ke_andar")} <b>stages</b> {t("map_plan_wizard.khudai_laying_testing_hata_doge_to")}
              </span>
            </label>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
          {!data && !err && <div style={{ padding: "26px 0", textAlign: "center", fontSize: 12.5, color: T.t3 }}>{t("map_plan_wizard.load_ho_raha_hai")}</div>}
          {!!err && <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B",
            borderRadius: 8, padding: "9px 12px", fontSize: 12, marginBottom: 10 }}>{err}</div>}

          {data && !groups.length && (
            <div style={{ padding: "22px 12px", textAlign: "center", fontSize: 12.5, color: T.t3, lineHeight: 1.7 }}>
             {t("map_plan_wizard.is_site_par_abhi_koi_line")}<br />
              <span style={{ fontSize: 11.5, color: T.t4 }}>
               {t("map_plan_wizard.tenders_map_me_line_draw_karo")}
              </span>
            </div>
          )}

          {groups.map((g, gi) => {
            const tickable = g.children.filter(canTick).length;
            const on = g.children.filter((c) => c.take).length;
            return (
              <div key={g.key} style={{ border: `1px solid ${T.b1}`, borderRadius: 9, marginBottom: 9, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", background: T.surfaceB }}>
                  <input type="checkbox" checked={on > 0 && on === tickable} ref={(el)=>{ if (el) el.indeterminate = on > 0 && on < tickable; }}
                    onChange={(e) => toggleGroup(gi, e.target.checked)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{g.group}</div>
                    <div style={{ fontSize: 10.5, color: T.t4 }}>
                      {g.children.length} {g.kind === "line" ? "line" : "structure"} · {on} chune
                    </div>
                  </div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <th style={{ ...th, width: 34 }}></th>
                    <th style={th}>{t("map_plan_wizard.task_ka_naam")}</th>
                    <th style={{ ...th, textAlign: "right", width: 150 }}>{g.kind === "line" ? t("map_plan_wizard.scope_badal_sakte_ho") : t("map_plan_wizard.stages")}</th>
                    {g.kind === "line" && <th style={{ ...th, width: 96 }}></th>}
                  </tr></thead>
                  <tbody>
                    {g.children.map((c, ci) => {
                      const key = gi + ":" + ci;
                      const stageOpen = openStage === key;
                      return (
                        <React.Fragment key={c.alignment_id}>
                          <tr style={{ borderTop: `1px solid ${T.b1}`, background: c.take ? "transparent" : T.surfaceB }}>
                            <td style={{ padding: "6px 10px" }}>
                              <input type="checkbox" checked={!!c.take} disabled={!canTick(c)}
                                onChange={(e) => updChild(gi, ci, { take: e.target.checked })} />
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <input value={c.name} onChange={(e) => updChild(gi, ci, { name: e.target.value })} disabled={!c.take || c.already}
                                style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.b1}`,
                                  fontSize: 12, color: T.t1, background: T.surface, outline: "none", fontFamily: "inherit" }} />
                              {c.already && (
                                <span style={{ fontSize: 10, color: c.task_has_children ? T.t4 : "#059669" }}>
                                  {c.task_has_children
                                    ? t("map_plan_wizard.bana_hua_stage_wala_scope_uske")
                                    : c.task_scope_qty > 0
                                      ? `✓ bana hua · task me scope: ${fmtLen(c.task_scope_qty)}${c.take ? " → naya scope likhega" : ""}`
                                      : `✓ bana hua · scope abhi KHALI${c.take ? " → tick se likh jayega" : " — tick karke likho"}`}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "right" }}>
                              {g.kind === "line" ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                  <input type="number" min="0" step="any" value={c.scope_qty ?? ""} disabled={!c.take}
                                    onChange={(e) => updChild(gi, ci, { scope_qty: e.target.value })}
                                    style={{ width: 84, padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.b1}`,
                                      fontSize: 12, fontWeight: 700, color: T.t1, background: T.surface, outline: "none",
                                      fontFamily: "inherit", textAlign: "right" }} />
                                  <span style={{ fontSize: 10, color: T.t4, fontWeight: 600 }}>{c.unit}</span>
                                </span>
                              ) : (
                                <button onClick={() => setOpenStage(stageOpen ? null : key)} disabled={!c.take}
                                  style={{ fontSize: 11, padding: "4px 9px", borderRadius: 6, cursor: c.take ? "pointer" : "default",
                                    border: `1px solid ${T.b1}`, background: T.surface, color: T.t2, fontFamily: "inherit" }}>
                                  {c.stages?.length || 0} stage {stageOpen ? "▴" : "▾"}
                                </button>
                              )}
                            </td>
                            {g.kind === "line" && (
                              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                                {c.already ? (
                                  c.take && Math.abs(Number(c.scope_qty) - Number(c.length_m)) > 0.5 ? (
                                    <span style={{ fontSize: 9.5, color: T.amb }}>{t("map_plan_wizard.map_fmtlen", { fmtLen: fmtLen(c.length_m) })}</span>
                                  ) : null
                                ) : (
                                  <button onClick={() => setOpenStage(stageOpen ? null : key)} disabled={!c.take}
                                    style={{ fontSize: 11, padding: "4px 9px", borderRadius: 6, cursor: c.take ? "pointer" : "default",
                                      border: `1px solid ${c.stages?.length ? T.ind : T.b1}`,
                                      background: c.stages?.length ? T.indL : T.surface,
                                      color: c.stages?.length ? T.ind : T.t2, fontFamily: "inherit" }}>
                                    {c.stages?.length ? `${c.stages.length} stage` : t("map_plan_wizard.stages_2")} {stageOpen ? "▴" : "▾"}
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                          {stageOpen && !c.already && (
                            <tr><td colSpan={g.kind === "line" ? 4 : 3} style={{ padding: "0 10px 9px 44px", background: T.surfaceB }}>
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", paddingTop: 8 }}>
                                {(c.stages || []).map((st, si) => (
                                  <span key={si} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11,
                                    padding: "3px 8px", borderRadius: 15, border: `1px solid ${T.b1}`, background: T.surface, color: T.t2 }}>
                                    {st}
                                    <button onClick={() => updChild(gi, ci, { stages: c.stages.filter((_, x) => x !== si) })}
                                      style={{ border: "none", background: "none", cursor: "pointer", color: T.t4, fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
                                  </span>
                                ))}
                                <input placeholder={t("map_plan_wizard.naya_stage_enter")} onKeyDown={(e) => {
                                  if (e.key === "Enter" && e.target.value.trim()) {
                                    updChild(gi, ci, { stages: [...(c.stages || []), e.target.value.trim()] });
                                    e.target.value = "";
                                  }
                                }} style={{ width: 130, padding: "4px 8px", borderRadius: 6, border: `1px dashed ${T.b2}`,
                                  fontSize: 11, color: T.t1, background: T.surface, outline: "none", fontFamily: "inherit" }} />
                                {g.kind === "line" && !(c.stages || []).length && (c.stage_template || []).length > 0 && (
                                  <button onClick={() => updChild(gi, ci, { stages: [...c.stage_template] })} style={chipBtn(false)}>
                                   {t("map_plan_wizard.template_bharo")}
                                  </button>
                                )}
                                <button onClick={() => suggestStages(gi, ci, g, c)} disabled={aiBusy === key} style={chipBtn(true)}>
                                  {aiBusy === key ? t("map_plan_wizard.ai_soch_raha") : t("map_plan_wizard.ai_se_sujhao")}
                                </button>
                              </div>
                              <div style={{ fontSize: 10, color: T.t4, marginTop: 6 }}>{t("map_plan_wizard.g_vaakhiri_faisla_aapka_jo_chip", { g: g.kind === "line"
                                  ? `Stage jodoge to scope (${fmtLen(Number(c.scope_qty) || c.length_m)}) HAR stage par jayega — khudai bhi utni, laying bhi utni; har stage apni qty me napega.`
                                  : "Structure ke stage par qty nahi hoti — supervisor % me marks karta hai.", v: " " })}</div>
                            </td></tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderTop: `1px solid ${T.b1}` }}>
          <div style={{ flex: 1, fontSize: 11.5, color: T.t3 }}>
            {newCount || scopeCount
              ? [newCount ? `${newCount} naye · kul ${taskCount} task banenge` : null,
                 scopeCount ? `${scopeCount} purane par scope likhega` : null].filter(Boolean).join(" · ")
              : t("map_plan_wizard.kuch_nahi_chuna")}
          </div>
          <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${T.b1}`,
            background: T.surface, color: T.t2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t("common.cancel")}</button>
          <button onClick={create} disabled={busy || (!newCount && !scopeCount)}
            style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: (newCount || scopeCount) ? T.ind : T.b2,
              color: "#fff", fontSize: 12, fontWeight: 700, cursor: (newCount || scopeCount) ? "pointer" : "default", fontFamily: "inherit" }}>
            {busy ? t("common.ban_raha_hai") : t("map_plan_wizard.plan_banao")}
          </button>
        </div>
      </div>
    </div>
  );
}
