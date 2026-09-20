// ══════════════════════════════════════════════════════════════════════
// ROAD LEVELS — levels se task aur budget (Phase 2).
//
// Yahan ka poora dhyan EK baat par hai: **kuch bhi hone se PEHLE poora
// naksha dikhe.** Isliye do kadam hain aur dono alag endpoint hain:
//
//   POST …/tasks/preview  — DRY RUN. Kuch likhta nahi. Sirf batata hai
//                           kya banega, kya badlega, kahan rok hai.
//   POST …/tasks/apply    — asli kaam, ek transaction me.
//
// "Lagao" tab tak band rehta hai jab tak preview dekha na gaya ho, aur
// blocked[] me kuch ho to bilkul nahi khulta.
//
// Do cheezein jaan-boojh kar chhipi nahi hain — inhe dhoondhna na pade:
//   • rate_missing  — library me rate hi nahi mila, budget me 0 aayega
//   • unit_mismatch — norm TRIP ginta hai par library ka item DAY par
//                     charge hota hai. Server rate lagata HI NAHI (amount 0)
//                     kyunki 549 phere × ₹5,500/din ka ankda bekaar hota
//                     hai. Ye aadmi ko dikhna chahiye, dabna nahi.
//
// Qty aur paisa dono server ke (utils/roadTasks.js + roadNorms.js).
// Yahan ek bhi ankda nahi banta.
// ══════════════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { T } from "../shared/tokens";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  rpost, n2, rupee, S, btn, Empty,
  actionLabel, actionTone, noteLabel, blockReason, canRoad,
} from "./roadShared";
import RoadBoqMap from "./RoadBoqMap";

export default function RoadTaskPlan({ design, onApplied }) {
  const toast = useToast();
  const mayEdit = canRoad("edit");

  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [openCode, setOpenCode] = useState(null);

  const hasTask = !!design.task_id;
  const hasProject = !!design.project_id;

  const preview = async () => {
    setBusy(true); setResult(null);
    const r = await rpost(`/designs/${design.id}/tasks/preview`, {});
    setBusy(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.plan_failed")); setPlan(null); return; }
    setPlan(r.data);
  };

  const apply = async () => {
    setBusy(true);
    const r = await rpost(`/designs/${design.id}/tasks/apply`, {});
    setBusy(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.plan_failed")); return; }
    setResult(r.data);
    toast.success(r.message || t("road.tasks_applied"));
    // Naksha purana ho gaya — dobara dekhna ho to phir se preview chalega.
    setPlan(null);
    onApplied && onApplied();
  };

  // ── Rok ──
  if (!hasProject) return <Empty text={t("road.task_sirf_project_par")} />;

  const blocked = (plan && plan.blocked) || [];
  const rateMissing = (plan && plan.rate_missing) || [];
  const unitMismatch = (plan && plan.unit_mismatch) || [];
  const items = (plan && plan.items) || [];
  const parent = plan && plan.parent;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>

      {/* ── Kya hone ja raha hai ── */}
      <div style={{ ...S.card, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 4 }}>{t("road.plan_title")}</div>
            <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.6 }}>{t("road.plan_intro")}</div>
          </div>
          {mayEdit && (
            <button onClick={preview} disabled={busy || !hasTask}
              title={hasTask ? "" : t("road.pehle_stretch_task_chuno")}
              style={{ ...btn("primary"), opacity: (busy || !hasTask) ? .5 : 1, cursor: hasTask ? "pointer" : "not-allowed" }}>
              {busy && !plan ? t("road.btn_wait") : t("road.plan_preview_btn")}
            </button>
          )}
        </div>

        {!hasTask && (
          <div style={{ marginTop: 12, padding: "9px 12px", background: T.ambL, border: `1px solid ${T.ambM}`, borderRadius: 7, fontSize: 12, color: T.t2, lineHeight: 1.55 }}>
            {t("road.pehle_stretch_task_chuno")} <span style={{ color: T.t3 }}>{t("road.plan_setup_hint")}</span>
          </div>
        )}

        <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${T.b1}`, fontSize: 11.5, color: T.t3, lineHeight: 1.65 }}>
          {t("road.plan_rerun_note")}
        </div>
      </div>

      {/* ── BOQ ka jod — revenue isi se. Jod badle to naksha purana ho jaata hai. ── */}
      <RoadBoqMap design={design} onSaved={() => { setPlan(null); setResult(null); }} />

      {/* ── Lagne ke baad ── */}
      {result && (
        <div style={{ ...S.card, borderLeft: `3px solid ${T.grn}`, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.t1, marginBottom: 10 }}>{t("road.applied_title")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 11 }}>
            {[[t("road.applied_created"), result.created],
              ...(result.adopted ? [[t("road.applied_adopted"), result.adopted]] : []),
              [t("road.applied_updated"), result.updated],
              [t("road.applied_unchanged"), result.unchanged],
              [t("road.applied_lines"), result.lines],
              [t("road.applied_retired"), result.retired_lines],
              [t("road.col_rev"), result.rev]].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 17, fontWeight: 800, color: T.t1, ...S.num }}>{v == null ? "—" : v}</div>
                <div style={S.lbl}>{l}</div>
              </div>
            ))}
          </div>
          {!!result.demoted && (
            <div style={{ marginTop: 11, fontSize: 11.5, color: T.t3, lineHeight: 1.55 }}>{t("road.applied_demoted")}</div>
          )}
        </div>
      )}

      {!plan ? (
        !result && <Empty text={t("road.plan_empty")} />
      ) : (
        <>
          {/* ── Rok ── */}
          {blocked.length > 0 && (
            <div style={{ ...S.card, borderLeft: `3px solid ${T.red}`, padding: "12px 14px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.red, marginBottom: 6 }}>{t("road.plan_blocked_title")}</div>
              {blocked.map((b, i) => (
                <div key={i} style={{ fontSize: 12, color: T.t2, lineHeight: 1.6 }}>· {blockReason(b.reason)}</div>
              ))}
            </div>
          )}

          {/* ── Upar wale stretch par kya asar ── */}
          {parent && parent.will_demote && (
            <div style={{ ...S.card, borderLeft: `3px solid ${T.ind}`, padding: "12px 14px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 4 }}>{parent.name}</div>
              <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.6 }}>
                {t("road.parent_demote_note", { n: parent.estimate_lines })}
              </div>
              {/* Stretch ka paisa: BOQ juda ho to item-wise, warna pehle stage par — dono kabhi nahi */}
              {parent.amt_replaced_by_boq && (
                <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.6, marginTop: 4 }}>{t("road.boq_parent_replaced", { amt: rupee(parent.scope_amt) })}</div>
              )}
              {parent.amt_moves_to_first && (
                <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.6, marginTop: 4 }}>{t("road.boq_parent_moves", { amt: rupee(parent.scope_amt) })}</div>
              )}
            </div>
          )}

          {/* ── Naam se shak: ye purane task bhi shayad yahi kaam hain ──
              Inhe system chupchaap nahi chhuta (BOQ item ka jod nahi hai, aur
              naam se andaza lagana galat qty likh deta). Aadmi khud tay kare:
              purana hata de, ya us par BOQ item laga kar dobara chalaye. ── */}
          {(plan.maybe_same || []).length > 0 && (
            <div style={{ ...S.card, borderLeft: `3px solid ${T.blu}`, padding: "12px 14px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 5 }}>{t("road.adopt_maybe_title")}</div>
              <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.6, marginBottom: 8 }}>{t("road.adopt_maybe_hint")}</div>
              {plan.maybe_same.map((m) => (
                <div key={m.task_id} style={{ fontSize: 12, color: T.t2, lineHeight: 1.7 }}>
                  · {t("road.adopt_maybe_line", { name: m.name, road_name: m.road_name })}
                </div>
              ))}
            </div>
          )}

          {/* ── Unit ka mel nahi — dabaya nahi jaata ── */}
          {unitMismatch.length > 0 && (
            <div style={{ ...S.card, borderLeft: `3px solid ${T.amb}`, padding: "12px 14px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.amb, marginBottom: 5 }}>{t("road.unit_mismatch_title")}</div>
              <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.6, marginBottom: 9 }}>{t("road.unit_mismatch_hint")}</div>
              {unitMismatch.map((u, i) => (
                <div key={i} style={{ fontSize: 12, color: T.t2, lineHeight: 1.7 }}>
                  <b>{u.code}</b>{" — "}
                  {(u.items || []).map((x, j) => (
                    <span key={j}>
                      {j > 0 && ", "}
                      {t("road.unit_mismatch_line", { item: x.item, norm_unit: x.norm_unit, lib_unit: x.lib_unit })}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── Rate hi nahi mila ── */}
          {rateMissing.length > 0 && (
            <div style={{ ...S.card, borderLeft: `3px solid ${T.slt}`, padding: "12px 14px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 5 }}>{t("road.rate_missing_title")}</div>
              {rateMissing.map((m, i) => (
                <div key={i} style={{ fontSize: 12, color: T.t2, lineHeight: 1.7 }}>
                  {t("road.rate_nahi_mila", { items: (m.items || []).join(", ") })}
                </div>
              ))}
            </div>
          )}

          {/* ── Jod ──
              "Scope ka amount" tabhi dikhta hai jab sach me kuch bana ho.
              Abhi kisi kaam se BOQ item jodne ka raasta screen par hai hi
              nahi, isliye ye hamesha khaali rehta — aur khaali column ye
              jhooth bolta ki revenue gina ja raha hai. Uski jagah ek line
              likhi jaati hai ki gina kyun nahi ja raha. */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 11 }}>
            {[
              [t("road.plan_tot_tasks"), items.filter((x) => x.action !== "unchanged").length, T.ind],
              [t("road.plan_tot_estimate"), rupee(plan.total_estimate), T.t1],
              ...(plan.total_scope_amt ? [[t("road.plan_tot_scope_amt"), rupee(plan.total_scope_amt), T.grn]] : []),
            ].map(([l, v, c]) => (
              <div key={l} style={{ ...S.card, borderTop: `3px solid ${c}`, padding: "11px 13px" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, ...S.num }}>{v}</div>
                <div style={S.lbl}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.6 }}>
            {plan.total_scope_amt ? t("road.plan_revenue_note") : t("road.plan_no_boq_note")}
          </div>

          {/* ── Item-wise naksha ── */}
          <div style={{ ...S.card, overflow: "hidden" }}>
            <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.plan_items_title")}</span>
              <span style={{ fontSize: 11, color: T.t4, marginLeft: 8 }}>{t("road.plan_items_hint")}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
                <thead>
                  <tr>{[t("road.col_work"), t("road.col_scope_qty"), t("common.unit"),
                    t("road.col_old_qty"), t("road.col_estimate"), t("road.col_what_happens"), ""].map((h, i) => (
                    <th key={i} style={{ ...S.th, textAlign: i >= 1 && i <= 4 ? "right" : "left" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const tone = actionTone(it.action);
                    const open = openCode === it.code;
                    return (
                      <React.Fragment key={it.code}>
                        <tr>
                          <td style={{ ...S.td, fontWeight: 600, color: T.t1 }}>
                            {it.name}
                            {it.note && (
                              <div style={{ fontSize: 10.5, color: T.amb, marginTop: 3, lineHeight: 1.45, maxWidth: 300 }}>
                                {noteLabel(it.note)}
                              </div>
                            )}
                            {it.adopted_name && (
                              <div style={{ fontSize: 10.5, color: T.blu, marginTop: 3, lineHeight: 1.45, maxWidth: 320 }}>
                                {t("road.adopt_row", { name: it.adopted_name })}
                              </div>
                            )}
                            {it.boq_item_id && !it.boq_unit_mismatch && it.billing_rate != null && (
                              <div style={{ fontSize: 10.5, color: T.grn, marginTop: 3, fontWeight: 600 }}>
                                {t("road.boq_row_info", { no: it.boq_item_no || "—", rate: rupee(it.billing_rate), unit: it.unit })}
                              </div>
                            )}
                            {it.boq_unit_mismatch && (
                              <div style={{ fontSize: 10.5, color: T.red, marginTop: 3, lineHeight: 1.45, maxWidth: 320 }}>
                                {t("road.boq_row_unit", { boq_unit: it.boq_unit, unit: it.engine_unit })}
                              </div>
                            )}
                            {it.boq_antar_pct != null && Math.abs(it.boq_antar_pct) >= 10 && (
                              <div style={{ fontSize: 10.5, color: T.amb, marginTop: 3, lineHeight: 1.45, maxWidth: 320 }}>
                                {t("road.boq_row_antar", { boq: n2(it.boq_qty), levels: n2(it.scope_qty), unit: it.unit, pct: it.boq_antar_pct })}
                              </div>
                            )}
                          </td>
                          <td style={{ ...S.td, textAlign: "right", fontWeight: 700, ...S.num }}>{n2(it.scope_qty)}</td>
                          <td style={{ ...S.td, color: T.t3 }}>{it.unit || "—"}</td>
                          <td style={{ ...S.td, textAlign: "right", color: T.t4, ...S.num }}>
                            {it.old_scope_qty == null ? "—" : n2(it.old_scope_qty)}
                          </td>
                          <td style={{ ...S.td, textAlign: "right", ...S.num }}>{rupee(it.estimate_amt)}</td>
                          <td style={S.td}>
                            <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 10, color: tone.c, background: tone.bg, border: `1px solid ${tone.b}` }}>
                              {actionLabel(it.action)}
                            </span>
                          </td>
                          <td style={{ ...S.td, textAlign: "right" }}>
                            {!!(it.lines && it.lines.length) && (
                              <button onClick={() => setOpenCode(open ? null : it.code)}
                                style={{ border: "none", background: "none", color: T.ind, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                                {open ? t("road.plan_hide_lines") : t("road.plan_show_lines", { n: it.lines.length })}
                              </button>
                            )}
                          </td>
                        </tr>
                        {open && (
                          <tr>
                            <td colSpan={7} style={{ padding: 0, background: T.surfaceB, borderBottom: `1px solid ${T.b1}` }}>
                              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                                <thead>
                                  <tr>{[t("road.col_category"), t("road.col_item"), t("road.col_qty"),
                                    t("common.unit"), t("common.rate"), t("road.col_amount"), ""].map((h, i) => (
                                    <th key={i} style={{ ...S.th, background: "transparent", textAlign: i >= 2 && i <= 5 ? "right" : "left" }}>{h}</th>
                                  ))}</tr>
                                </thead>
                                <tbody>
                                  {it.lines.map((l, i) => (
                                    <tr key={i}>
                                      <td style={{ ...S.td, color: T.t3 }}>{l.category}</td>
                                      <td style={{ ...S.td, color: T.t1 }}>{l.item_name}</td>
                                      <td style={{ ...S.td, textAlign: "right", ...S.num }}>{n2(l.qty)}</td>
                                      <td style={{ ...S.td, color: T.t3 }}>{l.unit || "—"}</td>
                                      <td style={{ ...S.td, textAlign: "right", ...S.num }}>{l.rate ? rupee(l.rate) : "—"}</td>
                                      <td style={{ ...S.td, textAlign: "right", fontWeight: 600, ...S.num }}>{rupee(l.amount)}</td>
                                      <td style={S.td}>
                                        {l.unit_mismatch && (
                                          <span style={{ fontSize: 10, fontWeight: 700, color: T.amb, background: T.ambL, border: `1px solid ${T.ambM}`, padding: "1px 7px", borderRadius: 9 }}>
                                            {t("road.chip_unit_mismatch", { norm_unit: l.unit, lib_unit: l.lib_unit })}
                                          </span>
                                        )}
                                        {!l.unit_mismatch && l.rate_missing && (
                                          <span style={{ fontSize: 10, fontWeight: 700, color: T.slt, background: T.sltL, border: `1px solid ${T.b1}`, padding: "1px 7px", borderRadius: 9 }}>
                                            {t("road.chip_rate_missing")}
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {!items.length && (
                    <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: T.t4, padding: 22 }}>{t("road.plan_no_items")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Lagao ── */}
          {mayEdit && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: T.t3 }}>
                {blocked.length ? t("road.plan_blocked_hint") : t("road.plan_apply_hint", { n: items.filter((x) => x.action !== "unchanged").length })}
              </span>
              <button onClick={apply} disabled={busy || !!blocked.length || !items.length}
                style={{ ...btn("primary"), opacity: (busy || blocked.length || !items.length) ? .5 : 1 }}>
                {busy ? t("road.btn_wait") : t("road.plan_apply_btn")}
              </button>
            </div>
          )}
        </>
      )}

      {/* Norms shuruaati hain — KB me har ek par [BUSINESS-CHECK] hai */}
      <div style={{ fontSize: 11, color: T.t4, lineHeight: 1.6 }}>{t("road.norms_business_check")}</div>
    </div>
  );
}
