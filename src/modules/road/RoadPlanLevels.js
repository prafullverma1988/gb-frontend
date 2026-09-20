// ══════════════════════════════════════════════════════════════════════
// AI PLAN ke andar "Levels se qty" — ek kaam ke liye.
//
// Prafull ka faisla: BOQ, drawing aur OGL teeno AI Plan me hi upload hon,
// plan + budget + task wahin ban jayein; uske baad sirf mapping aur kaam.
// Isliye Road Levels ki wahi screen (section, design, levels ka Excel,
// zone, nateeja) yahan tender ke naam par khulti hai — project abhi bana
// hi nahi hota. "Is kaam par lagao" dabate hi server us kaam ke stage
// levels ke ganit se bana deta hai: qty ganit se, paisa BOQ ka, aur har
// stage par norms se lagat. Task aur budget lines Execute par bante hain.
//
// API: POST /tenders/:id/ai-plan/road-levels  { site_idx, work_idx, work_name, design_id | remove }
// ══════════════════════════════════════════════════════════════════════
import React, { useState } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import { t } from "../../i18n";
import RoadLevels from "./RoadLevels";
import { btn, canRoad } from "./roadShared";

export default function RoadPlanLevels({ tenderId, siteIdx, workIdx, work, onApplied, onClose }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const mayEdit = canRoad("edit");

  const send = async (body) => {
    setBusy(true);
    let r = null;
    try {
      r = await api.post(`/tenders/${tenderId}/ai-plan/road-levels`,
        { site_idx: siteIdx, work_idx: workIdx, work_name: work.name, ...body });
    } catch (e) { r = { success: false, message: e && e.message }; }
    setBusy(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.save_failed")); return null; }
    return r.data;
  };

  const pick = async (design) => {
    const data = await send({ design_id: design.id });
    if (!data) return;
    const w = data.plan.sites[siteIdx] && data.plan.sites[siteIdx].works[workIdx];
    toast.success(t("road.aiplan_applied_toast", { n: w ? w.stages.filter((s) => s.road_item_code).length : 0 }));
    onApplied(data.plan, data.notes || []);
  };

  const remove = async () => {
    if (!await confirm({ title: t("road.aiplan_remove_q"), desc: t("road.aiplan_remove_desc"), confirmLabel: t("road.aiplan_remove_btn") })) return;
    const data = await send({ remove: true });
    if (!data) return;
    onApplied(data.plan, []);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(13,27,42,.45)", display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto", padding: "28px 14px" }}>
      <div style={{ width: "100%", maxWidth: 1080, background: T.bg || T.surface, borderRadius: 12, border: `1px solid ${T.b1}`, boxShadow: "0 18px 48px rgba(0,0,0,.22)" }}>
        <div style={{ padding: "13px 16px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, background: T.surface, borderRadius: "12px 12px 0 0" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: T.t1 }}>{t("road.aiplan_title", { work: work.name })}</div>
            <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.55, marginTop: 4, maxWidth: 760 }}>{t("road.aiplan_intro")}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {work.road_design_id && mayEdit && (
              <button onClick={remove} disabled={busy} style={{ ...btn("ghost"), opacity: busy ? .6 : 1 }}>{t("road.aiplan_remove_btn")}</button>
            )}
            <button onClick={onClose} style={btn("ghost")}>{t("common.close")}</button>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <RoadLevels tender={{ id: tenderId }} defaultName={work.name}
            pick={mayEdit ? { label: t("road.aiplan_pick_btn"), pickedLabel: t("road.aiplan_picked"), pickedId: work.road_design_id || null, busy, onPick: pick } : null} />
        </div>
      </div>
    </div>
  );
}
