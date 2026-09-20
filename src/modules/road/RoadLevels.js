// ══════════════════════════════════════════════════════════════════════
// ROAD LEVELS — Design tab ka section.
//
// Yahan se do cheez shuru hoti hain:
//   • Company ki cross-section library (ek baar banao, har road par lagao)
//   • Is project ke road design — unhi me levels, zone aur nateeja hai
//
// Levels design data hain, isliye ye Design tab me hai. Task aur Budget
// iske BAAD aate hain — wo iske nateeje hain.
//
// Tender ke AI Plan me bhi yahi screen khulti hai (RoadPlanLevels.js): tab
// `tender` aata hai, design tender ke naam par bante hain, aur har design par
// "Is kaam par lagao" (`pick`) dikhta hai. Task + budget wala tab tab nahi
// hota — wo kaam Execute karta hai.
//
// API: GET /road/designs?project_id=|tender_id= · POST /road/designs · GET /road/templates
// ══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from "react";
import { T } from "../shared/tokens";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import { t } from "../../i18n";
import RoadSectionTemplate from "./RoadSectionTemplate";
import RoadDesignDetail from "./RoadDesignDetail";
import { rget, rpost, rdelete, dataOf, num, fmtD, S, btn, Empty, canRoad } from "./roadShared";

export default function RoadLevels({ project, tender, pick, defaultName }) {
  const toast = useToast();
  const confirm = useConfirm();
  const projectId = project && project.id;
  const tenderId = tender && tender.id;
  const scopeKey = tenderId ? "tender_id" : "project_id";
  const scopeId = tenderId || projectId;
  const mayCreate = canRoad("create");
  const mayDelete = canRoad("delete");

  const [designs, setDesigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const [showTpl, setShowTpl] = useState(false);
  const [editTpl, setEditTpl] = useState(null);
  const [showLib, setShowLib] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ name: defaultName || "", template_id: "", start_chainage_m: 0, notes: "" });
  const [saving, setSaving] = useState(false);

  const loadDesigns = useCallback(async () => {
    if (!scopeId) return;
    setLoading(true);
    const r = await rget("/designs", { [scopeKey]: scopeId });
    setLoading(false);
    setDesigns(dataOf(r, []) || []);
  }, [scopeKey, scopeId]);

  const loadTemplates = useCallback(async () => {
    const r = await rget("/templates");
    setTemplates(dataOf(r, []) || []);
  }, []);

  useEffect(() => { loadDesigns(); loadTemplates(); }, [loadDesigns, loadTemplates]);

  const createDesign = async () => {
    if (!String(form.name).trim()) { toast.error(t("road.design_name_required")); return; }
    if (!form.template_id) { toast.error(t("road.design_section_required")); return; }
    setSaving(true);
    const r = await rpost("/designs", {
      [scopeKey]: scopeId,
      name: String(form.name).trim(),
      template_id: Number(form.template_id),
      start_chainage_m: num(form.start_chainage_m) || 0,
      notes: form.notes || "",
    });
    setSaving(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.save_failed")); return; }
    toast.success(r.message || t("road.design_created"));
    setNewOpen(false);
    setForm({ name: "", template_id: "", start_chainage_m: 0, notes: "" });
    await loadDesigns();
    setOpenId(r.data && r.data.id);
  };

  const removeDesign = async (row) => {
    if (!await confirm({
      title: t("road.design_delete_q"), desc: t("road.design_delete_desc"),
      variant: "danger", confirmLabel: t("common.delete"),
    })) return;
    const r = await rdelete("/designs/" + row.id);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.save_failed")); return; }
    toast.success(r.message || t("road.design_deleted"));
    loadDesigns();
  };

  const removeTemplate = async (row) => {
    if (!await confirm({
      title: t("road.tpl_delete_q"), desc: t("road.tpl_delete_desc"),
      variant: "danger", confirmLabel: t("common.delete"),
    })) return;
    const r = await rdelete("/templates/" + row.id);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.save_failed")); return; }
    toast.success(r.message || t("road.tpl_deleted"));
    loadTemplates();
  };

  // ── Ek design khula hai ──
  if (openId) {
    return (
      <RoadDesignDetail designId={openId} onBack={() => { setOpenId(null); loadDesigns(); }}
        onChanged={loadDesigns} tenderMode={!!tenderId}
        pick={pick ? { label: pick.label, busy: pick.busy, onPick: () => pick.onPick({ id: openId }) } : null} />
    );
  }

  return (
    <div>
      {showTpl && (
        <RoadSectionTemplate editRow={editTpl} onClose={() => { setShowTpl(false); setEditTpl(null); }}
          onSaved={(id) => { setShowTpl(false); setEditTpl(null); loadTemplates(); if (id && newOpen) setForm((p) => ({ ...p, template_id: String(id) })); }} />
      )}

      {/* ── Intro + actions ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 13, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.6, maxWidth: 620 }}>{tenderId ? t("road.intro_tender") : t("road.intro")}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowLib((v) => !v)} style={btn("ghost")}>
            {t("road.lib_btn", { n: templates.length })}
          </button>
          {mayCreate && (
            <button onClick={() => setNewOpen((v) => !v)} style={btn("primary")}>{t("road.new_design")}</button>
          )}
        </div>
      </div>

      {/* ── Section library ── */}
      {showLib && (
        <div style={{ ...S.card, marginBottom: 13, overflow: "hidden" }}>
          <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.lib_title")}</span>
              <span style={{ fontSize: 11, color: T.t4, marginLeft: 8 }}>{t("road.lib_hint")}</span>
            </div>
            {mayCreate && (
              <button onClick={() => { setEditTpl(null); setShowTpl(true); }} style={btn("ghost", { height: 28, fontSize: 11.5, color: T.ind, borderColor: T.indL })}>
                + {t("road.lib_new")}
              </button>
            )}
          </div>
          {!templates.length ? <Empty text={t("road.lib_empty")} /> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 600 }}>
                <thead>
                  <tr>{[t("road.tpl_name"), t("road.col_carriageway"), t("road.col_camber"), t("road.col_layer_count"), ""].map((h, i) => (
                    <th key={i} style={{ ...S.th, textAlign: i >= 1 && i <= 3 ? "right" : "left" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {templates.map((tpl) => (
                    <tr key={tpl.id}>
                      <td style={{ ...S.td, fontWeight: 600, color: T.t1 }}>{tpl.name}</td>
                      <td style={{ ...S.td, textAlign: "right", ...S.num }}>{tpl.carriageway_width_m} m</td>
                      <td style={{ ...S.td, textAlign: "right", ...S.num }}>{tpl.camber_pct}%</td>
                      <td style={{ ...S.td, textAlign: "right", ...S.num }}>{(tpl.layers || []).length}</td>
                      <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
                        {canRoad("edit") && (
                          <button onClick={() => { setEditTpl(tpl); setShowTpl(true); }}
                            style={{ border: "none", background: "none", color: T.ind, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginRight: 10 }}>
                            {t("common.edit")}
                          </button>
                        )}
                        {mayDelete && (
                          <button onClick={() => removeTemplate(tpl)}
                            style={{ border: "none", background: "none", color: T.t4, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                            {t("common.delete")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Naya design ── */}
      {newOpen && mayCreate && (
        <div style={{ ...S.card, padding: 14, marginBottom: 13, borderLeft: `3px solid ${T.ind}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 11 }}>{t("road.new_design_title")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <div>
              <label style={S.lbl}>{t("road.design_name")}</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={t("road.design_name_ph")} style={S.inp} />
            </div>
            <div>
              <label style={S.lbl}>{t("road.design_section")}</label>
              <select value={form.template_id} onChange={(e) => setForm((p) => ({ ...p, template_id: e.target.value }))} style={S.inp}>
                <option value="">{t("road.design_section_pick")}</option>
                {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
              </select>
            </div>
            <div>
              <label style={S.lbl}>{t("road.design_start_ch")}</label>
              <input type="number" step="0.01" value={form.start_chainage_m}
                onChange={(e) => setForm((p) => ({ ...p, start_chainage_m: e.target.value }))} style={S.inp} />
            </div>
            <div>
              <label style={S.lbl}>{t("road.notes")}</label>
              <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} style={S.inp} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 13, flexWrap: "wrap" }}>
            <button onClick={() => { setEditTpl(null); setShowTpl(true); }}
              style={{ border: "none", background: "none", padding: 0, color: T.ind, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              + {t("road.design_make_section")}
            </button>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={() => setNewOpen(false)} style={btn("ghost")}>{t("common.cancel")}</button>
              <button onClick={createDesign} disabled={saving} style={{ ...btn("primary"), opacity: saving ? .6 : 1 }}>
                {saving ? t("common.saving") : t("road.design_create_btn")}
              </button>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: T.t3, lineHeight: 1.55 }}>{t("road.design_snapshot_note")}</div>
        </div>
      )}

      {/* ── Design ki list ── */}
      <div style={{ ...S.card, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 26, fontSize: 12.5, color: T.t4 }}>{t("common.loading")}</div>
        ) : !designs.length ? (
          <Empty text={tenderId ? t("road.designs_empty_tender") : t("road.designs_empty")} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 620 }}>
              <thead>
                <tr>{[t("road.design_name"), t("road.col_chainages"), t("road.col_rev"), t("common.created"), ""].map((h, i) => (
                  <th key={i} style={{ ...S.th, textAlign: i >= 1 && i <= 2 ? "right" : "left" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {designs.map((row) => (
                  <tr key={row.id} style={{ cursor: "pointer" }} onClick={() => setOpenId(row.id)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceB; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ ...S.td, fontWeight: 600, color: T.t1 }}>{row.name}</td>
                    <td style={{ ...S.td, textAlign: "right", ...S.num }}>{row.ch_count || 0}</td>
                    <td style={{ ...S.td, textAlign: "right", ...S.num, color: row.rev ? T.ind : T.t4 }}>{row.rev ? t("road.rev_n", { n: row.rev }) : "—"}</td>
                    <td style={{ ...S.td, color: T.t3 }}>{fmtD(row.created_at)}</td>
                    <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
                      {pick && (Number(pick.pickedId) === Number(row.id)
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: T.grn, marginRight: 12 }}>✓ {pick.pickedLabel}</span>
                        : (
                          <button disabled={pick.busy} onClick={(e) => { e.stopPropagation(); pick.onPick(row); }}
                            style={{ ...btn("primary", { height: 26, fontSize: 11 }), marginRight: 12, opacity: pick.busy ? .6 : 1 }}>
                            {pick.label}
                          </button>
                        ))}
                      {mayDelete && (
                        <button onClick={(e) => { e.stopPropagation(); removeDesign(row); }}
                          style={{ border: "none", background: "none", color: T.t4, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          {t("common.delete")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
