// ══════════════════════════════════════════════════════════════════════
// ROAD LEVELS — design ki setting.
//
// Do cheezein jo task/budget se PEHLE tay honi chahiye:
//
//   1. Stretch task — ye design kis task ke neeche lagega. Stage-task
//      (khudai, GSB, WMM…) usi ke bacche bante hain, aur us stretch ki
//      apni qty neeche khisak jaati hai. Iske bina backend task banane
//      se saaf mana karta hai (road.pehle_stretch_task_chuno).
//
//   2. Factors — paanch ankde jo mitti ke ganit ko hilate hain. Default
//      company ke hain (GET /road/meta → default_factors); yahan sirf is
//      design ke liye badalte hain. Khaali chhod do to default hi lagta
//      hai — isliye placeholder me default dikhta hai, value me nahi.
//
// Dono PATCH /road/designs/:id se save hote hain.
// ══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import { rget, rpatch, dataOf, num, n2, S, btn, FACTOR_FIELDS, canRoad } from "./roadShared";

export default function RoadDesignSetup({ design, onSaved }) {
  const toast = useToast();
  const mayEdit = canRoad("edit");

  const [tasks, setTasks] = useState([]);
  const [taskId, setTaskId] = useState(design.task_id ? String(design.task_id) : "");
  const [defaults, setDefaults] = useState(null);
  // Sirf wahi khaane jo aadmi ne bhare. "" ka matlab "default hi chalega".
  const [fx, setFx] = useState(() => {
    const src = design.factors || {};
    const out = {};
    FACTOR_FIELDS.forEach((f) => { out[f.key] = src[f.key] == null ? "" : String(src[f.key]); });
    return out;
  });
  const [busy, setBusy] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!design.project_id) return;
    const r = await api.get("/tasks?project_id=" + design.project_id);
    const rows = (r && r.success ? r.data : []) || [];
    // TODO- wale backend pehle hi hata deta hai. Yahan sirf kram —
    // task_no ke hisaab se, taaki dropdown wahi kram dikhaye jo Tasks tab.
    setTasks(rows);
  }, [design.project_id]);

  const loadMeta = useCallback(async () => {
    const r = await rget("/meta");
    setDefaults((dataOf(r, {}) || {}).default_factors || null);
  }, []);

  useEffect(() => { loadTasks(); loadMeta(); }, [loadTasks, loadMeta]);

  const saveTask = async () => {
    setBusy(true);
    const r = await rpatch("/designs/" + design.id, { task_id: taskId === "" ? null : Number(taskId) });
    setBusy(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.save_failed")); return; }
    toast.success(r.message || t("road.stretch_saved"));
    onSaved && onSaved();
  };

  const saveFactors = async () => {
    // Khaali khaana bheja hi nahi jaata — warna 0 chala jaata aur
    // side slope 0 ka matlab hota "koi dhalaan nahi", jo bilkul aur baat hai.
    const out = {};
    FACTOR_FIELDS.forEach((f) => { const v = num(fx[f.key]); if (v != null) out[f.key] = v; });
    setBusy(true);
    const r = await rpatch("/designs/" + design.id, { factors: out });
    setBusy(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.save_failed")); return; }
    toast.success(r.message || t("road.factors_saved"));
    onSaved && onSaved();
  };

  const resetFactors = () => {
    const out = {};
    FACTOR_FIELDS.forEach((f) => { out[f.key] = ""; });
    setFx(out);
  };

  const taskLabel = (x) => `${x.task_no || ""}  ${String(x.name || x.title || "").slice(0, 60)}`.trim();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>

      {/* ── Stretch task ── */}
      <div style={{ ...S.card, padding: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 4 }}>{t("road.stretch_title")}</div>
        <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.6, marginBottom: 12, maxWidth: 640 }}>{t("road.stretch_intro")}</div>

        {!design.project_id ? (
          <div style={{ fontSize: 12, color: T.amb }}>{t("road.task_sirf_project_par")}</div>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <label style={S.lbl}>{t("road.stretch_task")}</label>
              <select value={taskId} disabled={!mayEdit} onChange={(e) => setTaskId(e.target.value)} style={S.inp}>
                <option value="">{t("road.stretch_pick")}</option>
                {tasks.map((x) => <option key={x.id} value={x.id}>{taskLabel(x)}</option>)}
              </select>
            </div>
            {mayEdit && (
              <button onClick={saveTask} disabled={busy || String(design.task_id || "") === String(taskId)}
                style={{ ...btn("primary"), opacity: (busy || String(design.task_id || "") === String(taskId)) ? .5 : 1 }}>
                {busy ? t("road.btn_wait") : t("common.save")}
              </button>
            )}
          </div>
        )}
        {!tasks.length && design.project_id && (
          <div style={{ marginTop: 10, fontSize: 11.5, color: T.t4 }}>{t("road.stretch_no_tasks")}</div>
        )}
      </div>

      {/* ── Factors ── */}
      <div style={{ ...S.card, overflow: "hidden" }}>
        <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.factors_title")}</span>
            <span style={{ fontSize: 11, color: T.t4, marginLeft: 8 }}>{t("road.factors_hint")}</span>
          </div>
          {mayEdit && (
            <button onClick={resetFactors} style={btn("ghost", { height: 28, fontSize: 11.5 })}>{t("road.factors_reset")}</button>
          )}
        </div>

        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {FACTOR_FIELDS.map((f) => {
            const dflt = defaults ? defaults[f.key] : null;
            return (
              <div key={f.key} style={{ display: "grid", gridTemplateColumns: "minmax(170px,1fr) 120px", gap: 14, alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{f.label()}</div>
                  <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.55, marginTop: 2 }}>{f.hint()}</div>
                </div>
                <div>
                  <input type="number" step={f.step} disabled={!mayEdit}
                    value={fx[f.key]} onChange={(e) => setFx((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={dflt == null ? "" : String(dflt)}
                    style={{ ...S.inp, textAlign: "right" }} />
                  <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3, textAlign: "right" }}>
                    {dflt == null ? "" : t("road.factors_default", { v: n2(dflt) })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "11px 14px", borderTop: `1px solid ${T.b1}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: T.t4, lineHeight: 1.6, maxWidth: 560 }}>{t("road.factors_business_check")}</span>
          {mayEdit && (
            <button onClick={saveFactors} disabled={busy} style={{ ...btn("primary"), opacity: busy ? .6 : 1 }}>
              {busy ? t("common.saving") : t("road.factors_save")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
