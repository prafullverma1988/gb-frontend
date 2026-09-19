// ══════════════════════════════════════════════════════════════════════
// ROAD LEVELS — cross-section ka editor (company ki library).
//
// Ek baar banao, har road par dobara use karo. Design banate waqt iski
// COPY design me chipak jaati hai — library baad me badlo to purana
// calculation nahi hilta (backend: road_designs.section snapshot).
//
// AI yahan SIRF form bharta hai. Drawing padh kar jo likha hai wahi
// uthata hai — naap kar ankda nahi banata (drawing aksar N.T.S. hoti
// hai). Jo bhara aata hai wo SUJHAAV hai: aadmi har khaana dekh kar
// tabhi Save dabata hai, aur tab tak kuch bhi save nahi hota.
//
// API: GET/POST /road/templates · PATCH/DELETE /road/templates/:id
//      POST /road/ai/read-drawing
// ══════════════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { T } from "../shared/tokens";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  rpost, rpatch, EXTENTS, extentLabel, num, S, btn, AiNote,
  aiUnavailable, uploadDrawingImage,
} from "./roadShared";

// Neeche se upar — sub-grade neev hai, BC sabse upar ki chikni parat.
// Ye sirf ek shuruaati dhancha hai; har ankda screen par badla ja sakta hai.
const DEFAULT_LAYERS = () => ([
  { code: "SUBGRADE", name: "Sub-grade", thickness_mm: 500, extent: "formation",   density_t_cum: "", is_subgrade: true  },
  { code: "GSB",      name: "GSB",       thickness_mm: 200, extent: "paved",       density_t_cum: "", is_subgrade: false },
  { code: "WMM",      name: "WMM",       thickness_mm: 200, extent: "paved",       density_t_cum: "", is_subgrade: false },
  { code: "DBM",      name: "DBM",       thickness_mm:  50, extent: "carriageway", density_t_cum: 2.4, is_subgrade: false },
  { code: "BC",       name: "BC",        thickness_mm:  30, extent: "carriageway", density_t_cum: 2.4, is_subgrade: false },
]);

const blankForm = () => ({
  name: "", notes: "", divided: true,
  median_width_m: 2, carriageway_width_m: 7, paved_shoulder_m: 1.5, earthen_shoulder_m: 2,
  camber_pct: 2.5, median_camber_pct: 0,
  layers: DEFAULT_LAYERS(),
});

const fromRow = (row) => ({
  name: row.name || "", notes: row.notes || "", divided: !!row.divided,
  median_width_m: row.median_width_m, carriageway_width_m: row.carriageway_width_m,
  paved_shoulder_m: row.paved_shoulder_m, earthen_shoulder_m: row.earthen_shoulder_m,
  camber_pct: row.camber_pct, median_camber_pct: row.median_camber_pct,
  layers: (row.layers || []).map((l) => ({
    code: l.code || "", name: l.name || "", thickness_mm: l.thickness_mm,
    extent: l.extent || "carriageway", density_t_cum: l.density_t_cum == null ? "" : l.density_t_cum,
    is_subgrade: !!l.is_subgrade,
  })),
});

export default function RoadSectionTemplate({ editRow, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(() => (editRow ? fromRow(editRow) : blankForm()));
  const [busy, setBusy] = useState(false);

  // ── AI: drawing se form ──
  const [aiBusy, setAiBusy] = useState(false);
  const [aiOff, setAiOff] = useState(false);     // key hi nahi lagi — button ki jagah line
  const [aiFilled, setAiFilled] = useState(null); // { fields: Set, notes, confidence }

  // Drawing padh kar form bhar do. Server sirf sujhaav bhejta hai —
  // yahan wo form me utar jaata hai aur har bhara hua khaana nishaan
  // se dikhta hai, taaki aadmi jaan sake kya usne likha aur kya AI ne.
  const readDrawing = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setAiBusy(true);
    try {
      const url = await uploadDrawingImage(file);
      const r = await rpost("/ai/read-drawing", { image_urls: [url] });
      if (aiUnavailable(r)) { setAiOff(true); toast.info(r.message); return; }
      if (!r || !r.success) { toast.error((r && r.message) || t("road.ai_failed")); return; }

      const s = (r.data && r.data.suggestion) || {};
      const touched = new Set();
      setF((p) => {
        const next = { ...p };
        const put = (k, v) => { if (v != null && v !== "") { next[k] = v; touched.add(k); } };
        if (typeof s.divided === "boolean") { next.divided = s.divided; touched.add("divided"); }
        put("median_width_m", s.median_width_m);
        put("carriageway_width_m", s.carriageway_width_m);
        put("paved_shoulder_m", s.paved_shoulder_m);
        put("earthen_shoulder_m", s.earthen_shoulder_m);
        put("camber_pct", s.camber_pct);
        if (Array.isArray(s.layers) && s.layers.length) {
          touched.add("layers");
          next.layers = s.layers.map((l, i) => ({
            code: String(l.code || l.name || ("layer" + (i + 1))).toUpperCase().slice(0, 20),
            name: String(l.name || l.code || ""),
            thickness_mm: l.thickness_mm == null ? "" : l.thickness_mm,
            extent: EXTENTS.includes(l.extent) ? l.extent : "carriageway",
            density_t_cum: "",
            // Sub-grade ka faisla AI par nahi chhodte — naam se andaza
            // lagana hi aadhi galti hai. Aadmi khud tick karta hai.
            is_subgrade: false,
          }));
        }
        return next;
      });
      setAiFilled({ fields: touched, notes: s.notes || "", confidence: s.confidence || "" });
      toast.success(r.message || t("road.form_bhar_diya_dekh_lo"));
    } catch (_) {
      toast.error(t("road.ai_upload_failed"));
    } finally { setAiBusy(false); }
  };

  // Jo khaana AI ne bhara uspar halka nishaan — save se pehle dekh lo.
  const aiMark = (k) => (aiFilled && aiFilled.fields.has(k)
    ? { borderColor: T.ind, background: T.indL }
    : null);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setLayer = (i, k, v) => setF((p) => ({
    ...p, layers: p.layers.map((l, j) => (j === i ? { ...l, [k]: v } : l)),
  }));
  const addLayer = () => setF((p) => ({
    ...p,
    layers: [...p.layers, { code: "", name: "", thickness_mm: "", extent: "carriageway", density_t_cum: "", is_subgrade: false }],
  }));
  const dropLayer = (i) => setF((p) => ({ ...p, layers: p.layers.filter((_, j) => j !== i) }));
  // Sub-grade sirf EK ho sakta hai — engine `layers.find(is_subgrade)` se
  // neev dhoondhta hai, do hon to doosra chupchaap crust gin liya jaata.
  const pickSubgrade = (i) => setF((p) => ({
    ...p, layers: p.layers.map((l, j) => ({ ...l, is_subgrade: j === i ? !l.is_subgrade : false })),
  }));

  // Formation = shoulder se shoulder. Wahi chaudai jispar sub-grade
  // bichhta hai aur bharai naapi jaati hai.
  const half = (num(f.divided ? f.median_width_m : 0) || 0) / 2
    + (num(f.carriageway_width_m) || 0) + (num(f.paved_shoulder_m) || 0) + (num(f.earthen_shoulder_m) || 0);
  const formationWidth = Math.round(half * 2 * 1000) / 1000;

  const save = async () => {
    if (!String(f.name).trim()) { toast.error(t("road.tpl_name_required")); return; }
    const layers = f.layers
      .filter((l) => String(l.name || l.code || "").trim() && num(l.thickness_mm) != null)
      .map((l, i) => ({
        code: String(l.code || l.name || ("layer" + (i + 1))).trim(),
        name: String(l.name || l.code).trim(),
        thickness_mm: num(l.thickness_mm),
        extent: EXTENTS.includes(l.extent) ? l.extent : "carriageway",
        density_t_cum: num(l.density_t_cum),
        is_subgrade: !!l.is_subgrade,
      }));
    if (!layers.length) { toast.error(t("road.tpl_layer_required")); return; }

    const body = {
      name: String(f.name).trim(), notes: f.notes || "", divided: !!f.divided,
      median_width_m: num(f.median_width_m) || 0,
      carriageway_width_m: num(f.carriageway_width_m) || 0,
      paved_shoulder_m: num(f.paved_shoulder_m) || 0,
      earthen_shoulder_m: num(f.earthen_shoulder_m) || 0,
      camber_pct: num(f.camber_pct) == null ? 2.5 : num(f.camber_pct),
      median_camber_pct: num(f.median_camber_pct) || 0,
      layers,
    };
    setBusy(true);
    const r = editRow ? await rpatch("/templates/" + editRow.id, body) : await rpost("/templates", body);
    setBusy(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.save_failed")); return; }
    toast.success(r.message || t("road.tpl_saved"));
    onSaved && onSaved(editRow ? editRow.id : (r.data && r.data.id));
  };

  const WIDTHS = [
    ["median_width_m",      t("road.w_median")],
    ["carriageway_width_m", t("road.w_carriageway")],
    ["paved_shoulder_m",    t("road.w_paved_shoulder")],
    ["earthen_shoulder_m",  t("road.w_earthen_shoulder")],
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 520, background: "rgba(17,24,39,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "min(880px,96vw)", maxHeight: "92vh", background: T.bg, borderRadius: 12, boxShadow: "0 24px 60px rgba(0,0,0,.28)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ padding: "13px 18px", background: T.surface, borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: T.t1 }}>
              {editRow ? t("road.tpl_edit_title") : t("road.tpl_new_title")}
            </div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>{t("road.tpl_sub")}</div>
          </div>
          <button onClick={onClose} title={t("common.close")} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, color: T.t3, cursor: "pointer" }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>

          {/* ── AI: drawing se form bharo ── */}
          <div style={{ ...S.card, padding: 13, marginBottom: 14, borderLeft: `3px solid ${T.ind}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ maxWidth: 520 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.ai_drawing_title")}</div>
                <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.55, marginTop: 2 }}>{t("road.ai_drawing_hint")}</div>
              </div>
              {aiOff ? (
                <span style={{ fontSize: 11.5, color: T.t4, maxWidth: 260, lineHeight: 1.5 }}>{t("road.ai_abhi_uplabdh_nahi")}</span>
              ) : (
                <label style={{ ...btn("ghost", { color: T.ind, borderColor: T.bluM }), display: "inline-flex", alignItems: "center", gap: 6, opacity: aiBusy ? .6 : 1 }}>
                  {aiBusy ? t("road.ai_reading") : t("road.ai_drawing_btn")}
                  <input type="file" accept="image/*" disabled={aiBusy} style={{ display: "none" }} onChange={readDrawing} />
                </label>
              )}
            </div>

            {aiFilled && (
              <div style={{ marginTop: 11, paddingTop: 10, borderTop: `1px solid ${T.b1}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.ind, lineHeight: 1.55 }}>{t("road.form_bhar_diya_dekh_lo")}</div>
                {aiFilled.notes && (
                  <div style={{ fontSize: 11.5, color: T.t3, marginTop: 5, lineHeight: 1.55 }}>{aiFilled.notes}</div>
                )}
                {aiFilled.confidence && (
                  <div style={{ fontSize: 11, color: T.t4, marginTop: 4 }}>{t("road.ai_confidence", { v: aiFilled.confidence })}</div>
                )}
              </div>
            )}
            <AiNote style={{ marginTop: 11 }} />
          </div>

          {/* ── Naam ── */}
          <div style={{ ...S.card, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={S.lbl}>{t("road.tpl_name")}</label>
                <input value={f.name} onChange={(e) => set("name", e.target.value)}
                  placeholder={t("road.tpl_name_ph")} style={S.inp} />
              </div>
              <div>
                <label style={S.lbl}>{t("road.notes")}</label>
                <input value={f.notes} onChange={(e) => set("notes", e.target.value)}
                  placeholder={t("road.notes_ph")} style={S.inp} />
              </div>
            </div>
          </div>

          {/* ── Chaudai aur camber ── */}
          <div style={{ ...S.card, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 10 }}>{t("road.tpl_widths")}</div>

            <label style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12, cursor: "pointer", fontSize: 12.5, color: T.t2 }}>
              <button type="button" onClick={() => set("divided", !f.divided)}
                style={{ width: 34, height: 19, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", background: f.divided ? T.ind : T.b2, transition: "background .15s", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 2, left: f.divided ? 17 : 2, width: 15, height: 15, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
              </button>
              {t("road.tpl_divided")}
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
              {WIDTHS.map(([k, label]) => (
                <div key={k} style={{ opacity: (k === "median_width_m" && !f.divided) ? .45 : 1 }}>
                  <label style={S.lbl}>{label}</label>
                  <input type="number" step="0.01" disabled={k === "median_width_m" && !f.divided}
                    value={f[k] == null ? "" : f[k]} onChange={(e) => set(k, e.target.value)}
                    style={{ ...S.inp, ...aiMark(k) }} />
                </div>
              ))}
              <div>
                <label style={S.lbl}>{t("road.w_camber")}</label>
                <input type="number" step="0.1" value={f.camber_pct == null ? "" : f.camber_pct}
                  onChange={(e) => set("camber_pct", e.target.value)} style={{ ...S.inp, ...aiMark("camber_pct") }} />
              </div>
              <div style={{ opacity: f.divided ? 1 : .45 }}>
                <label style={S.lbl}>{t("road.w_median_camber")}</label>
                <input type="number" step="0.1" disabled={!f.divided}
                  value={f.median_camber_pct == null ? "" : f.median_camber_pct}
                  onChange={(e) => set("median_camber_pct", e.target.value)} style={S.inp} />
              </div>
            </div>

            <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${T.b1}`, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 11.5, color: T.t3 }}>{t("road.tpl_formation_width")}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: T.ind, ...S.num }}>{formationWidth} m</span>
              <span style={{ fontSize: 11, color: T.t4 }}>{t("road.tpl_formation_hint")}</span>
            </div>
          </div>

          {/* ── Parat ── */}
          <div style={S.card}>
            <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.tpl_layers")}</span>
                <span style={{ fontSize: 11, color: T.t4, marginLeft: 8 }}>
                  {aiFilled && aiFilled.fields.has("layers") ? t("road.tpl_layers_ai_hint") : t("road.tpl_layers_hint")}
                </span>
              </div>
              <button onClick={addLayer} style={btn("ghost", { height: 28, fontSize: 11.5, color: T.ind, borderColor: T.indL })}>
                + {t("road.tpl_add_layer")}
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr>
                    {[t("road.col_code"), t("road.col_layer_name"), t("road.col_thickness_mm"),
                      t("road.col_extent"), t("road.col_density"), t("road.col_subgrade"), ""].map((h, i) => (
                      <th key={i} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {f.layers.map((l, i) => (
                    <tr key={i}>
                      <td style={S.td}><input value={l.code} onChange={(e) => setLayer(i, "code", e.target.value)} style={{ ...S.inp, width: 96 }} /></td>
                      <td style={S.td}><input value={l.name} onChange={(e) => setLayer(i, "name", e.target.value)} style={{ ...S.inp, width: 150 }} /></td>
                      <td style={S.td}><input type="number" step="1" value={l.thickness_mm == null ? "" : l.thickness_mm} onChange={(e) => setLayer(i, "thickness_mm", e.target.value)} style={{ ...S.inp, width: 84, textAlign: "right" }} /></td>
                      <td style={S.td}>
                        <select value={l.extent} onChange={(e) => setLayer(i, "extent", e.target.value)} style={{ ...S.inp, width: 150 }}>
                          {EXTENTS.map((x) => <option key={x} value={x}>{extentLabel(x)}</option>)}
                        </select>
                      </td>
                      <td style={S.td}><input type="number" step="0.01" value={l.density_t_cum} onChange={(e) => setLayer(i, "density_t_cum", e.target.value)} placeholder={t("road.col_density_ph")} style={{ ...S.inp, width: 96, textAlign: "right" }} /></td>
                      <td style={S.td}>
                        <input type="checkbox" checked={!!l.is_subgrade} onChange={() => pickSubgrade(i)}
                          style={{ width: 15, height: 15, accentColor: T.ind, cursor: "pointer" }} />
                      </td>
                      <td style={S.td}>
                        <button onClick={() => dropLayer(i)} title={t("common.delete")}
                          style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 15, lineHeight: 1 }}>×</button>
                      </td>
                    </tr>
                  ))}
                  {!f.layers.length && (
                    <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: T.t4, padding: 22 }}>{t("road.tpl_no_layers")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 11.5, color: T.t3, lineHeight: 1.55 }}>{t("road.tpl_density_note")}</div>
        </div>

        <div style={{ padding: "11px 18px", background: T.surface, borderTop: `1px solid ${T.b1}`, display: "flex", justifyContent: "flex-end", gap: 9 }}>
          <button onClick={onClose} style={btn("ghost")}>{t("common.cancel")}</button>
          <button onClick={save} disabled={busy} style={{ ...btn("primary"), opacity: busy ? .6 : 1 }}>
            {busy ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
