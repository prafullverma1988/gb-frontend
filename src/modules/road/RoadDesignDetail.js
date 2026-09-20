// ══════════════════════════════════════════════════════════════════════
// ROAD LEVELS — ek design ka poora screen.
//
//   Levels   — survey ki sheet (import wizard), aur jo lag chuka hai wo
//   Zones    — mitti ke teen case, CH se CH tak
//   Nateeja  — L-section, chainage-wise cut/fill, teeno case ki tulna,
//              jod, har parat ki qty, aur jaanch ki baatein
//
// Qty yahan BANTI nahi — server (utils/roadCalc.js) jo bhejta hai wahi
// dikhta hai. "Calculation chalao" ek naya Rev banata hai aur purana
// dikhta rehta hai.
//
// API: GET /road/designs/:id · /levels · PUT /zones · GET|POST /calc
//      GET /compare · GET /runs · GET /designs/:id/sheet.xlsx
// ══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { T } from "../shared/tokens";
import EChart, { ECHART_FONT } from "../../components/EChart";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import RoadLevelsImport from "./RoadLevelsImport";
import RoadDesignSetup from "./RoadDesignSetup";
import RoadTaskPlan from "./RoadTaskPlan";
import { RoadWhatIf, RoadMrSuggest, RoadActualCut } from "./RoadExtras";
import {
  rget, rpost, rput, dataOf, num, n2, n3, nInt, fmtD, S, btn, Empty,
  SOIL_CASES, caseLabel, caseHint, warnMsg, calcErrMsg, canRoad,
  fetchBlob, saveBlob, AiNote, aiUnavailable,
} from "./roadShared";

const chartBase = { textStyle: { fontFamily: ECHART_FONT } };

export default function RoadDesignDetail({ designId, onBack, onChanged, tenderMode, pick }) {
  const toast = useToast();
  const mayEdit = canRoad("edit");

  const [head, setHead] = useState(null);       // { design, zones, levels, latest_run }
  const [sub, setSub] = useState("levels");     // levels | zones | result
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [levels, setLevels] = useState(null);   // { offsets, levels }
  const [zones, setZones] = useState([]);
  const [calc, setCalc] = useState(null);
  const [calcErr, setCalcErr] = useState("");
  const [compare, setCompare] = useState(null);
  const [runs, setRuns] = useState([]);
  const [showImport, setShowImport] = useState(false);
  // Import kaunse level ka: "ogl" (zameen) ya "post_cut" (khudai ke baad ka survey)
  const [importKind, setImportKind] = useState("ogl");
  const [postCut, setPostCut] = useState(null);      // asli khudai ka nateeja — L-section ki teesri line bhi isi se
  const [postKey, setPostKey] = useState(0);

  // ── AI ki tippani (Result tab) ──
  // Sirf padhne ke liye. Ye kuch badalta nahi aur kahin save nahi hota —
  // wahi numbers use karta hai jo calculation ne diye.
  const [review, setReview] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiOff, setAiOff] = useState(false);

  const askReview = async () => {
    setAiBusy(true);
    const r = await rpost(`/designs/${designId}/ai/review`, {});
    setAiBusy(false);
    if (aiUnavailable(r)) { setAiOff(true); toast.info(r.message); return; }
    if (!r || !r.success) { toast.error(calcErrMsg(r && r.message) || t("road.ai_failed")); return; }
    setReview((r.data && r.data.review) || null);
  };

  const loadHead = useCallback(async () => {
    setLoading(true);
    const r = await rget("/designs/" + designId);
    setLoading(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.design_load_failed")); return; }
    setHead(r.data);
    setZones((r.data.zones || []).map((z) => ({
      from_ch: z.from_ch, to_ch: z.to_ch, soil_case: z.soil_case,
      reuse_pct: z.reuse_pct, note: z.note || "",
    })));
  }, [designId, toast]);

  const loadLevels = useCallback(async () => {
    const r = await rget(`/designs/${designId}/levels`);
    setLevels(dataOf(r, { offsets: [], levels: [] }));
  }, [designId]);

  // Bina record banaye "abhi kya banta hai". Naya Rev sirf button se banta hai.
  const loadCalc = useCallback(async () => {
    const r = await rget(`/designs/${designId}/calc`);
    if (r && r.success) { setCalc(r.data); setCalcErr(""); }
    else { setCalc(null); setCalcErr(calcErrMsg(r && r.message)); }
  }, [designId]);

  const loadCompare = useCallback(async () => {
    const r = await rget(`/designs/${designId}/compare`);
    setCompare(dataOf(r, null));
  }, [designId]);

  const loadRuns = useCallback(async () => {
    const r = await rget(`/designs/${designId}/runs`);
    setRuns(dataOf(r, []) || []);
  }, [designId]);

  useEffect(() => { loadHead(); loadLevels(); }, [loadHead, loadLevels]);
  useEffect(() => {
    if (sub !== "result") return;
    loadCalc(); loadCompare(); loadRuns();
  }, [sub, loadCalc, loadCompare, loadRuns]);

  // ── Zones ─────────────────────────────────────────────────────────
  const addZone = () => setZones((p) => [...p, { from_ch: "", to_ch: "", soil_case: "B", reuse_pct: 100, note: "" }]);
  const setZone = (i, k, v) => setZones((p) => p.map((z, j) => (j === i ? { ...z, [k]: v } : z)));
  const dropZone = (i) => setZones((p) => p.filter((_, j) => j !== i));

  const saveZones = async () => {
    setBusy(true);
    const r = await rput(`/designs/${designId}/zones`, {
      zones: zones.map((z) => ({
        from_ch: num(z.from_ch), to_ch: num(z.to_ch), soil_case: z.soil_case,
        reuse_pct: num(z.reuse_pct), note: z.note || "",
      })),
    });
    setBusy(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.save_failed")); return; }
    toast.success(r.message || t("road.zones_saved"));
    loadHead();
    if (sub === "result") { loadCalc(); loadCompare(); }
  };

  // ── Calculation ───────────────────────────────────────────────────
  const runCalc = async () => {
    setBusy(true);
    const r = await rpost(`/designs/${designId}/calc`, {});
    setBusy(false);
    if (!r || !r.success) { toast.error(calcErrMsg(r && r.message) || t("road.calc_failed")); return; }
    toast.success(r.message || t("road.calc_done"));
    setSub("result");
    loadHead(); loadCalc(); loadCompare(); loadRuns();
    onChanged && onChanged();
  };

  const downloadSheet = async (ext) => {
    const kind = ext === "pdf" ? "pdf" : "xlsx";
    setBusy(true);
    try {
      const blob = await fetchBlob(`/designs/${designId}/sheet.${kind}`);
      const name = ((head && head.design && head.design.name) || "earthwork").replace(/[^\w\- ]+/g, "").slice(0, 60);
      saveBlob(blob, `${name} - earthwork.${kind}`);
    } catch (_) {
      toast.error(kind === "pdf" ? t("road.sheet_pdf_failed") : t("road.sheet_failed"));
    }
    setBusy(false);
  };

  // ── Charts ────────────────────────────────────────────────────────
  const sections = (calc && calc.sections) || [];

  const lSection = useMemo(() => {
    if (sections.length < 2) return null;
    const chs = sections.map((s) => s.ch);
    const ogl = sections.map((s) => s.ogl_cl);
    const frl = sections.map((s) => s.frl);
    // Do line ke BEECH ka rang: neeche wali line tak paardarshi base, uske
    // upar cutting (laal) ya filling (neela) ka band. Stack isi liye hai —
    // dono ko alag-alag bharna ho to band beech me tootta hai.
    const base = sections.map((s) => Math.min(Number(s.ogl_cl), Number(s.frl)));
    const cutB = sections.map((s) => Math.max(0, Number(s.ogl_cl) - Number(s.frl)));
    const filB = sections.map((s) => Math.max(0, Number(s.frl) - Number(s.ogl_cl)));
    const lOgl = t("road.chart_ogl"), lFrl = t("road.chart_frl");
    const lCut = t("road.chart_cutting"), lFil = t("road.chart_filling");
    // Teesri line — khudai ke baad ka level (sirf jahan naapa gaya; baaki jagah khaali)
    const lPost = t("road.chart_post");
    const pcBy = {};
    ((postCut && postCut.sections) || []).forEach((s) => { pcBy[Number(s.ch)] = s.pc_cl; });
    const hasPc = Object.keys(pcBy).length > 0;
    const pc = chs.map((c) => (pcBy[Number(c)] == null ? null : pcBy[Number(c)]));
    return {
      ...chartBase,
      grid: { left: 58, right: 18, top: 30, bottom: 36 },
      tooltip: { trigger: "axis", valueFormatter: (v) => n3(v) },
      legend: { data: hasPc ? [lCut, lFil, lOgl, lFrl, lPost] : [lCut, lFil, lOgl, lFrl], top: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11, color: T.t3 } },
      xAxis: { type: "category", data: chs, axisLabel: { fontSize: 10, color: T.t4 }, axisLine: { lineStyle: { color: T.b1 } } },
      yAxis: { type: "value", scale: true, axisLabel: { fontSize: 10, color: T.t4 }, splitLine: { lineStyle: { color: T.b1 } } },
      series: [
        { name: "base", type: "line", stack: "band", data: base, symbol: "none", lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 }, silent: true, tooltip: { show: false }, z: 1 },
        { name: lCut, type: "line", stack: "band", data: cutB, symbol: "none", lineStyle: { opacity: 0 }, areaStyle: { color: T.red, opacity: .16 }, z: 2 },
        { name: lFil, type: "line", stack: "band", data: filB, symbol: "none", lineStyle: { opacity: 0 }, areaStyle: { color: T.blu, opacity: .16 }, z: 2 },
        { name: lOgl, type: "line", data: ogl, symbol: "none", lineStyle: { color: T.grn, width: 1.6 }, z: 3 },
        { name: lFrl, type: "line", data: frl, symbol: "none", lineStyle: { color: T.t1, width: 1.6 }, z: 3 },
        ...(hasPc ? [{ name: lPost, type: "line", data: pc, symbol: "circle", symbolSize: 4, connectNulls: false, lineStyle: { color: T.amb, width: 1.6, type: "dashed" }, itemStyle: { color: T.amb }, z: 4 }] : []),
      ],
    };
  }, [sections, postCut]);

  const cutFill = useMemo(() => {
    if (!sections.length) return null;
    const lCut = t("road.chart_cutting"), lFil = t("road.chart_filling");
    return {
      ...chartBase,
      grid: { left: 58, right: 18, top: 30, bottom: 36 },
      tooltip: { trigger: "axis", valueFormatter: (v) => n2(Math.abs(v)) },
      legend: { data: [lCut, lFil], top: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11, color: T.t3 } },
      xAxis: { type: "category", data: sections.map((s) => s.ch), axisLabel: { fontSize: 10, color: T.t4 }, axisLine: { lineStyle: { color: T.b1 } } },
      yAxis: { type: "value", axisLabel: { fontSize: 10, color: T.t4, formatter: (v) => Math.abs(v) }, splitLine: { lineStyle: { color: T.b1 } } },
      series: [
        { name: lCut, type: "bar", stack: "cf", data: sections.map((s) => Number(s.cut_area) || 0), itemStyle: { color: T.red } },
        { name: lFil, type: "bar", stack: "cf", data: sections.map((s) => -((Number(s.fill_emb_area) || 0) + (Number(s.fill_sg_new_area) || 0))), itemStyle: { color: T.blu } },
      ],
    };
  }, [sections]);

  const cmpChart = useMemo(() => {
    const rows = (compare || []).filter((c) => c.totals);
    if (!rows.length) return null;
    return {
      ...chartBase,
      grid: { left: 64, right: 18, top: 16, bottom: 30 },
      tooltip: { trigger: "axis", valueFormatter: (v) => n2(v) },
      xAxis: { type: "category", data: rows.map((c) => c.soil_case), axisLabel: { fontSize: 11, color: T.t3 }, axisLine: { lineStyle: { color: T.b1 } } },
      yAxis: { type: "value", axisLabel: { fontSize: 10, color: T.t4 }, splitLine: { lineStyle: { color: T.b1 } } },
      series: [{ type: "bar", barWidth: 38, data: rows.map((c) => Number(c.totals.buy_loose_cum) || 0), itemStyle: { color: T.ind } }],
    };
  }, [compare]);

  if (loading && !head) return <div style={{ padding: 26, fontSize: 12.5, color: T.t4 }}>{t("common.loading")}</div>;
  if (!head) return <Empty text={t("road.design_load_failed")} />;

  const d = head.design || {};
  const sec = d.section || {};
  const lv = head.levels || {};
  const totals = (calc && calc.totals) || null;
  const warnings = (calc && calc.warnings) || [];

  const SUBS = [
    { id: "levels", label: t("road.tab_levels") },
    { id: "zones",  label: t("road.tab_zones") },
    { id: "result", label: t("road.tab_result") },
    // Tender ke AI Plan me task + budget Execute banata hai — yahan ye tab nahi
    ...(tenderMode ? [] : [{ id: "tasks",  label: t("road.tab_tasks") }]),
    { id: "setup",  label: t("road.tab_setup") },
  ];

  return (
    <div>
      {showImport && (
        <RoadLevelsImport design={d} kind={importKind} onClose={() => { setShowImport(false); setImportKind("ogl"); setPostKey((k) => k + 1); }}
          onCommitted={() => { loadHead(); loadLevels(); setCalc(null); }} />
      )}

      {/* ── Header ── */}
      <div style={{ ...S.card, padding: "13px 15px", marginBottom: 13 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <button onClick={onBack} style={{ border: "none", background: "none", padding: 0, color: T.ind, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              ← {t("road.back_to_list")}
            </button>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginTop: 5 }}>{d.name}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 3 }}>
              {sec.name || t("road.section_unnamed")}
              {sec.carriageway_width_m != null && ` · ${t("road.hdr_camber", { pct: sec.camber_pct })}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {mayEdit && (
              <button onClick={runCalc} disabled={busy} style={{ ...btn("primary"), opacity: busy ? .6 : 1 }}>
                {busy ? t("road.btn_wait") : t("road.run_calc")}
              </button>
            )}
            <button onClick={() => downloadSheet("xlsx")} disabled={busy} style={btn("ghost")}>{t("road.download_sheet")}</button>
            <button onClick={() => downloadSheet("pdf")} disabled={busy} style={btn("ghost")}>{t("road.download_pdf")}</button>
            {pick && (
              <button onClick={pick.onPick} disabled={busy || pick.busy}
                style={{ ...btn("primary"), background: T.grn, borderColor: T.grn, opacity: busy || pick.busy ? .6 : 1 }}>
                {pick.label}
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 26, flexWrap: "wrap", marginTop: 13, paddingTop: 12, borderTop: `1px solid ${T.b1}` }}>
          {[[t("road.hdr_chainages"), lv.ch_count || 0],
            [t("road.hdr_range"), lv.from_ch == null ? "—" : `${lv.from_ch} – ${lv.to_ch}`],
            [t("road.hdr_rev"), head.latest_run ? t("road.rev_n", { n: head.latest_run.rev }) : "—"],
            [t("road.hdr_zones"), (head.zones || []).length || t("road.zones_all_b")]].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: T.t1, ...S.num }}>{v}</div>
              <div style={S.lbl}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sub tabs ── */}
      <div style={{ display: "inline-flex", padding: 3, background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 9, marginBottom: 13 }}>
        {SUBS.map((s) => (
          <button key={s.id} onClick={() => setSub(s.id)}
            style={{ padding: "6px 15px", border: "none", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5,
              background: sub === s.id ? T.surface : "transparent",
              color: sub === s.id ? T.t1 : T.t3, fontWeight: sub === s.id ? 700 : 500,
              boxShadow: sub === s.id ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ───────── LEVELS ───────── */}
      {sub === "levels" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 11, flexWrap: "wrap" }}>
            <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.55, maxWidth: 620 }}>{t("road.levels_intro")}</div>
            {mayEdit && <button onClick={() => setShowImport(true)} style={btn("primary")}>{t("road.levels_import_btn")}</button>}
          </div>

          <div style={{ ...S.card, overflow: "hidden" }}>
            {!levels || !levels.levels || !levels.levels.length ? (
              <Empty text={t("road.levels_empty")} />
            ) : (
              <div style={{ overflow: "auto", maxHeight: 460 }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={S.th}>CH</th>
                      <th style={S.th}>FRL</th>
                      {levels.offsets.map((o) => <th key={o} style={{ ...S.th, textAlign: "right" }}>{o}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {levels.levels.map((row) => {
                      const byOff = {};
                      (row.points || []).forEach((p) => { byOff[p.offset] = p.level; });
                      return (
                        <tr key={row.ch}>
                          <td style={{ ...S.td, fontWeight: 700, color: T.t1, ...S.num }}>{row.ch}</td>
                          <td style={{ ...S.td, ...S.num, color: row.frl == null ? T.amb : T.t2 }}>{row.frl == null ? "—" : n3(row.frl)}</td>
                          {levels.offsets.map((o) => (
                            <td key={o} style={{ ...S.td, textAlign: "right", ...S.num }}>{byOff[o] == null ? "—" : n3(byOff[o])}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────── ZONES ───────── */}
      {sub === "zones" && (
        <div>
          <div style={{ ...S.card, padding: 14, marginBottom: 13 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 4 }}>{t("road.zones_title")}</div>
            <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.6, marginBottom: 11 }}>{t("road.zones_intro")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 11 }}>
              {SOIL_CASES.map((c) => (
                <div key={c} style={{ border: `1px solid ${T.b1}`, borderRadius: 8, padding: "10px 12px", background: T.surfaceB }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ind, marginBottom: 3 }}>{caseLabel(c)}</div>
                  <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.55 }}>{caseHint(c)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...S.card, overflow: "hidden" }}>
            <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.zones_table")}</span>
              {mayEdit && <button onClick={addZone} style={btn("ghost", { height: 28, fontSize: 11.5, color: T.ind, borderColor: T.indL })}>+ {t("road.zones_add")}</button>}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
                <thead>
                  <tr>
                    {[t("road.col_from_ch"), t("road.col_to_ch"), t("road.col_case"), t("road.col_reuse"), t("road.notes"), ""].map((h, i) => (
                      <th key={i} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z, i) => (
                    <tr key={i}>
                      <td style={S.td}><input type="number" step="0.01" disabled={!mayEdit} value={z.from_ch == null ? "" : z.from_ch} onChange={(e) => setZone(i, "from_ch", e.target.value)} style={{ ...S.inp, width: 100, textAlign: "right" }} /></td>
                      <td style={S.td}><input type="number" step="0.01" disabled={!mayEdit} value={z.to_ch == null ? "" : z.to_ch} onChange={(e) => setZone(i, "to_ch", e.target.value)} style={{ ...S.inp, width: 100, textAlign: "right" }} /></td>
                      <td style={S.td}>
                        <select disabled={!mayEdit} value={z.soil_case} onChange={(e) => setZone(i, "soil_case", e.target.value)} style={{ ...S.inp, width: 210 }}>
                          {SOIL_CASES.map((c) => <option key={c} value={c}>{caseLabel(c)}</option>)}
                        </select>
                      </td>
                      <td style={S.td}><input type="number" step="1" disabled={!mayEdit} value={z.reuse_pct == null ? "" : z.reuse_pct} onChange={(e) => setZone(i, "reuse_pct", e.target.value)} style={{ ...S.inp, width: 80, textAlign: "right" }} /></td>
                      <td style={S.td}><input disabled={!mayEdit} value={z.note} onChange={(e) => setZone(i, "note", e.target.value)} style={{ ...S.inp, width: 190 }} /></td>
                      <td style={S.td}>
                        {mayEdit && <button onClick={() => dropZone(i)} title={t("common.delete")} style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 15, lineHeight: 1 }}>×</button>}
                      </td>
                    </tr>
                  ))}
                  {!zones.length && <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", color: T.t4, padding: 22 }}>{t("road.zones_empty")}</td></tr>}
                </tbody>
              </table>
            </div>
            {mayEdit && (
              <div style={{ padding: "11px 14px", borderTop: `1px solid ${T.b1}`, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={saveZones} disabled={busy} style={{ ...btn("primary"), opacity: busy ? .6 : 1 }}>
                  {busy ? t("common.saving") : t("road.zones_save")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────── RESULT ───────── */}
      {sub === "result" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {calcErr && (
            <div style={{ ...S.card, borderLeft: `3px solid ${T.amb}`, padding: "12px 14px", fontSize: 12.5, color: T.t2 }}>{calcErr}</div>
          )}

          {totals && (
            <>
              {/* Jod */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 11 }}>
                {[[t("road.tot_cut"), n2(totals.cut_cum), "m³", T.red],
                  [t("road.tot_emb"), n2(totals.fill_emb_cum), "m³", T.blu],
                  [t("road.tot_sg_new"), n2(totals.fill_subgrade_new_cum), "m³", T.pur],
                  [t("road.tot_buy_compacted"), n2(totals.buy_compacted_cum), "m³", T.t2],
                  [t("road.tot_buy_loose"), n2(totals.buy_loose_cum), "m³", T.ind],
                  [t("road.tot_disposal"), n2(totals.disposal_cum), "m³", T.slt],
                  [t("road.tot_lead"), calc.mass_haul ? nInt(calc.mass_haul.lead_m) : "—", "m", T.amb],
                  [t("road.tot_length"), n2(totals.length_m), "m", T.grn]].map(([l, v, u, c]) => (
                  <div key={l} style={{ ...S.card, borderTop: `3px solid ${c}`, padding: "11px 13px" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, ...S.num }}>
                      {v}<span style={{ fontSize: 11, fontWeight: 600, color: T.t4, marginLeft: 4 }}>{u}</span>
                    </div>
                    <div style={S.lbl}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.6 }}>{t("road.tot_loose_note")}</div>

              {/* L-section */}
              {lSection && (
                <div style={S.card}>
                  <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.chart_lsection")}</span>
                    <span style={{ fontSize: 11, color: T.t4, marginLeft: 8 }}>{t("road.chart_lsection_hint")}</span>
                  </div>
                  <div style={{ padding: "8px 8px 4px" }}><EChart option={lSection} height={280} /></div>
                </div>
              )}

              {/* Chainage-wise cut/fill */}
              {cutFill && (
                <div style={S.card}>
                  <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.chart_bars")}</span>
                    <span style={{ fontSize: 11, color: T.t4, marginLeft: 8 }}>{t("road.chart_bars_hint")}</span>
                  </div>
                  <div style={{ padding: "8px 8px 4px" }}><EChart option={cutFill} height={230} /></div>
                </div>
              )}
            </>
          )}

          {/* Teeno case ki tulna */}
          {compare && compare.some((c) => c.totals) && (
            <div style={S.card}>
              <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.cmp_title")}</span>
                <span style={{ fontSize: 11, color: T.t4, marginLeft: 8 }}>{t("road.cmp_hint")}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,1fr) minmax(260px,1fr)", gap: 0 }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                      <tr>{[t("road.col_case"), t("road.tot_cut"), t("road.tot_sg_new"), t("road.tot_buy_loose")].map((h, i) => (
                        <th key={i} style={{ ...S.th, textAlign: i ? "right" : "left" }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {compare.map((c) => (
                        <tr key={c.soil_case}>
                          <td style={{ ...S.td, fontWeight: 700, color: T.t1 }}>{caseLabel(c.soil_case)}</td>
                          <td style={{ ...S.td, textAlign: "right", ...S.num }}>{c.totals ? n2(c.totals.cut_cum) : "—"}</td>
                          <td style={{ ...S.td, textAlign: "right", ...S.num }}>{c.totals ? n2(c.totals.fill_subgrade_new_cum) : "—"}</td>
                          <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: T.ind, ...S.num }}>{c.totals ? n2(c.totals.buy_loose_cum) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {cmpChart && <div style={{ padding: "8px 10px", borderLeft: `1px solid ${T.b1}` }}><EChart option={cmpChart} height={168} /></div>}
              </div>
            </div>
          )}

          {/* Har parat ki qty */}
          {calc && calc.layers && calc.layers.length > 0 && (
            <div style={S.card}>
              <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.layers_title")}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 620 }}>
                  <thead>
                    <tr>{[t("road.col_layer_name"), t("road.col_thickness_mm"), t("road.col_width_m"),
                      t("road.col_sqm"), t("road.col_cum"), t("road.col_mt")].map((h, i) => (
                      <th key={i} style={{ ...S.th, textAlign: i ? "right" : "left" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {calc.layers.map((l) => (
                      <tr key={l.code}>
                        <td style={{ ...S.td, fontWeight: 600, color: T.t1 }}>
                          {l.name}
                          {l.is_subgrade && <span style={{ marginLeft: 7, fontSize: 9.5, fontWeight: 700, color: T.ind, background: T.indL, padding: "1px 6px", borderRadius: 9 }}>{t("road.col_subgrade")}</span>}
                        </td>
                        <td style={{ ...S.td, textAlign: "right", ...S.num }}>{nInt(l.thickness_mm)}</td>
                        <td style={{ ...S.td, textAlign: "right", ...S.num }}>{n2(l.width_m)}</td>
                        <td style={{ ...S.td, textAlign: "right", ...S.num }}>{n2(l.sqm)}</td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: T.t1, ...S.num }}>{n2(l.cum)}</td>
                        <td style={{ ...S.td, textAlign: "right", ...S.num }}>{l.mt == null ? "—" : n2(l.mt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Jaanch */}
          {warnings.length > 0 && (
            <div style={S.card}>
              <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.warn_title")}</span>
                <span style={{ fontSize: 11, color: T.t4, marginLeft: 8 }}>{t("road.warn_count", { n: warnings.length })}</span>
              </div>
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {warnings.map((w, i) => (
                  <div key={i} style={{ padding: "9px 14px", borderBottom: `1px solid ${T.b1}`, fontSize: 12, color: T.t2, display: "flex", gap: 9 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.amb, marginTop: 6, flexShrink: 0 }} />
                    <span style={{ lineHeight: 1.55 }}>{warnMsg(w)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sahayak ki tippani — padhne ke liye, aur kuch nahi */}
          {totals && (
            <div style={S.card}>
              <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.ai_review_title")}</span>
                  <span style={{ fontSize: 11, color: T.t4, marginLeft: 8 }}>{t("road.ai_review_hint")}</span>
                </div>
                {aiOff ? (
                  <span style={{ fontSize: 11.5, color: T.t4, maxWidth: 280, lineHeight: 1.5 }}>{t("road.ai_abhi_uplabdh_nahi")}</span>
                ) : (
                  <button onClick={askReview} disabled={aiBusy}
                    style={btn("ghost", { height: 28, fontSize: 11.5, color: T.ind, borderColor: T.bluM, opacity: aiBusy ? .6 : 1 })}>
                    {aiBusy ? t("road.ai_reading") : review ? t("road.ai_review_again") : t("road.ai_review_btn")}
                  </button>
                )}
              </div>
              <div style={{ padding: 14 }}>
                {!review ? (
                  <div style={{ fontSize: 12, color: T.t4, lineHeight: 1.6 }}>{t("road.ai_review_empty")}</div>
                ) : (
                  <>
                    {review.summary && (
                      <div style={{ fontSize: 12.5, color: T.t2, lineHeight: 1.65, marginBottom: 11 }}>{review.summary}</div>
                    )}
                    {(review.points || []).map((p, i) => {
                      const sev = String(p.severity || "").toLowerCase();
                      const c = sev === "high" ? T.red : sev === "medium" ? T.amb : T.slt;
                      return (
                        <div key={i} style={{ display: "flex", gap: 9, padding: "8px 0", borderTop: i ? `1px solid ${T.b1}` : "none" }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: c, marginTop: 7, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.6 }}>{p.text}</div>
                            {p.kind && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 2 }}>{p.kind}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                <AiNote style={{ marginTop: 12 }} />
              </div>
            </div>
          )}

          {/* Asli khudai — khudai ke baad ke survey se */}
          {totals && (
            <RoadActualCut design={d} reloadKey={postKey} onData={setPostCut}
              onImport={() => { setImportKind("post_cut"); setShowImport(true); }} />
          )}

          {/* Murum ka MR + "Agar…" — dono ganit ke nateeje par tike hain, isliye yahin */}
          {totals && <RoadMrSuggest design={d} />}
          {totals && <RoadWhatIf design={d} fromCh={lv.from_ch} toCh={lv.to_ch} />}

          {/* Revision */}
          <div style={S.card}>
            <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.runs_title")}</span>
              <span style={{ fontSize: 11, color: T.t4, marginLeft: 8 }}>{t("road.runs_hint")}</span>
            </div>
            {!runs.length ? <Empty text={t("road.runs_empty")} /> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
                  <thead>
                    <tr>{[t("road.col_rev"), t("common.date"), t("road.col_by"),
                      t("road.tot_cut"), t("road.tot_buy_loose"), t("road.notes")].map((h, i) => (
                      <th key={i} style={{ ...S.th, textAlign: i >= 3 && i <= 4 ? "right" : "left" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id}>
                        <td style={{ ...S.td, fontWeight: 700, color: T.ind }}>{t("road.rev_n", { n: r.rev })}</td>
                        <td style={S.td}>{fmtD(r.created_at)}</td>
                        <td style={S.td}>{r.by_name || "—"}</td>
                        <td style={{ ...S.td, textAlign: "right", ...S.num }}>{r.totals ? n2(r.totals.cut_cum) : "—"}</td>
                        <td style={{ ...S.td, textAlign: "right", ...S.num }}>{r.totals ? n2(r.totals.buy_loose_cum) : "—"}</td>
                        <td style={{ ...S.td, color: T.t4 }}>{r.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────── TASK + BUDGET ───────── */}
      {sub === "tasks" && (
        <RoadTaskPlan design={d} onApplied={() => { loadHead(); loadRuns(); onChanged && onChanged(); }} />
      )}

      {/* ───────── SETUP ───────── */}
      {sub === "setup" && (
        <RoadDesignSetup design={d} onSaved={() => { loadHead(); setCalc(null); }} />
      )}
    </div>
  );
}
