// ══════════════════════════════════════════════════════════════════════
// ROAD LEVELS — survey sheet ka import (BOQ wizard wala hi dhang).
//
//   1. File · sheet select karo          — parsing yahin browser me hoti hai
//   2. Offset ki line aur CH/FRL column  — auto pehchan, badal bhi sakte ho
//   3. Staging me rows                   — laal rok deti hai, peeli sirf batati hai;
//                                          galti WAHIN theek karo (inline PATCH)
//   4. Lagao                             — chaho to galat rows chhod kar aage
//
// Server tak kuch nahi jaata jab tak step 2 ka "Aage" nahi dabta, aur asli
// levels tab tak nahi badalte jab tak "Lagao" nahi dabta.
//
// API: POST /road/designs/:id/levels/import · GET /road/levels/import/:id
//      PATCH /road/levels/import/:id/rows/:rowId · POST …/commit · DELETE
// ══════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect, useMemo } from "react";
import { T } from "../shared/tokens";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  rpost, rget, rpatch, rdelete, num, S, btn, Chip, impMsg, codeList,
  AiNote, aiUnavailable,
} from "./roadShared";

const colLabel = (i) => { let s = ""; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const isBlank = (v) => v == null || String(v).trim() === "";

// Survey sheet ki offset line: ek row jisme kai number hain aur kam se kam
// ek RINAATMAK (centre line se baayen). Yahi use baaki header rows se alag
// karta hai — chainage ki column kabhi minus me nahi jaati.
function detectOffsetRow(rows) {
  let best = -1, bestScore = 0;
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const cells = rows[i] || [];
    let n = 0, neg = false;
    for (const c of cells) {
      const v = num(c);
      if (v == null || Math.abs(v) > 100) continue;
      n++; if (v < 0) neg = true;
    }
    const score = n + (neg ? 10 : 0);
    if (n >= 3 && score > bestScore) { bestScore = score; best = i; }
  }
  return best >= 0 ? best : 0;
}

// `kind`: "ogl" (zameen + FRL, default) ya "post_cut" (khudai ke BAAD ka survey — FRL nahi hota,
// aur ye OGL ko nahi chhuta; server dono ko alag rakhta hai).
export default function RoadLevelsImport({ design, onClose, onCommitted, kind }) {
  const isPost = kind === "post_cut";
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // ── Step 1 ──
  const [fileName, setFileName] = useState("");
  const [wb, setWb] = useState(null);
  const [sheetName, setSheetName] = useState("");
  const [aoa, setAoa] = useState([]);

  // ── Step 2 ──
  const [offsetRow, setOffsetRow] = useState(0);
  const [chCol, setChCol] = useState(0);
  const [frlCol, setFrlCol] = useState(null);

  // ── Step 3 ──
  const [impId, setImpId] = useState(null);
  const [staged, setStaged] = useState(null);   // { import, rows, summary }
  const [skipErrors, setSkipErrors] = useState(false);

  // ── Step 4 ──
  const [result, setResult] = useState(null);

  // ── AI: column ka sujhaav ──
  // Sirf SUJHAAV — dropdown bharta hai, bas. Data AI nahi padhta, code
  // padhta hai, isliye galat sujhaav se ek dropdown galat hota hai,
  // ankda nahi. Upar wala detectOffsetRow() bina-AI ka default rehta hai.
  const [aiBusy, setAiBusy] = useState(false);
  const [aiOff, setAiOff] = useState(false);
  const [aiWhy, setAiWhy] = useState(null);   // { reason, confidence }

  const askAi = async () => {
    setAiBusy(true);
    const r = await rpost("/ai/map-columns", { grid: aoa.slice(0, 12).map((row) => (row || []).slice(0, 25)) });
    setAiBusy(false);
    if (aiUnavailable(r)) { setAiOff(true); toast.info(r.message); return; }
    if (!r || !r.success) { toast.error((r && r.message) || t("road.ai_failed")); return; }
    const s = (r.data && r.data.suggestion) || {};
    if (s.offset_row != null && s.offset_row >= 0 && s.offset_row < aoa.length) setOffsetRow(Number(s.offset_row));
    if (s.chainage_col != null && s.chainage_col >= 0) setChCol(Number(s.chainage_col));
    // null ka matlab "FRL ka column hai hi nahi" — usse bhi maano.
    if ("frl_col" in s) setFrlCol(s.frl_col == null ? null : Number(s.frl_col));
    setAiWhy({ reason: s.reason || "", confidence: s.confidence || "" });
    toast.success(t("road.ai_columns_filled"));
  };

  const timers = useRef({});
  const pending = useRef({});
  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

  // ── File ──────────────────────────────────────────────────────────
  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    try {
      // xlsx sirf file parse par chahiye — dynamic import se tab-chunk halka rehta hai.
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const book = XLSX.read(new Uint8Array(buf), { type: "array" });
      setWb(book);
      await loadSheet(book, book.SheetNames[0]);
    } catch (_) {
      toast.error(t("road.imp_file_read_failed"));
    }
    e.target.value = "";
  };

  const loadSheet = async (book, name) => {
    const XLSX = await import("xlsx");
    const rows = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, raw: true, defval: "", blankrows: true });
    setSheetName(name);
    setAoa(rows);
    const orow = detectOffsetRow(rows);
    setOffsetRow(orow);
    const head = rows[orow] || [];
    const ch = head.findIndex((c) => typeof c === "string" && /^\s*ch/i.test(c));
    setChCol(ch >= 0 ? ch : 0);
    const frl = head.findIndex((c) => typeof c === "string" && /frl/i.test(c));
    setFrlCol(frl >= 0 ? frl : null);
  };

  // Offset wale column = offset line ke wo khaane jinme number hai aur jo
  // CH/FRL nahi hain.
  const parsed = useMemo(() => {
    const head = aoa[offsetRow] || [];
    const cols = [];
    head.forEach((c, i) => {
      if (i === chCol || i === frlCol) return;
      const v = num(c);
      if (v != null && Math.abs(v) <= 100) cols.push({ col: i, offset: v });
    });
    const rows = [];
    for (let i = offsetRow + 1; i < aoa.length; i++) {
      const r = aoa[i] || [];
      if (r.every((c) => isBlank(c))) continue;
      const levels = cols.map((c) => { const v = num(r[c.col]); return v == null ? null : v; });
      // Poori khaali line (na chainage, na ek bhi level) sheet ki padding hai.
      if (isBlank(r[chCol]) && levels.every((x) => x == null)) continue;
      rows.push({
        row_no: i + 1,
        chainage: num(r[chCol]),
        frl: frlCol == null ? null : num(r[frlCol]),
        levels,
      });
    }
    return { offsets: cols.map((c) => c.offset), rows };
  }, [aoa, offsetRow, chCol, frlCol]);

  // ── Staging ───────────────────────────────────────────────────────
  const stage = async () => {
    setBusy(true);
    const r = await rpost(`/designs/${design.id}/levels/import`, {
      file_name: fileName, sheet_name: sheetName,
      offsets: parsed.offsets, rows: parsed.rows,
      ...(isPost ? { kind: "post_cut" } : {}),
    });
    setBusy(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.imp_stage_failed")); return; }
    setImpId(r.data.import_id);
    await refresh(r.data.import_id);
    toast.success(r.message || t("road.imp_staged"));
    setStep(3);
  };

  const refresh = async (id) => {
    const g = await rget("/levels/import/" + id);
    if (g && g.success) setStaged(g.data);
  };

  // ── Inline edit → debounced PATCH (jaanch server par dobara hoti hai) ──
  const editRow = (rowId, patch) => {
    setStaged((s) => s && ({
      ...s,
      rows: s.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    }));
    pending.current[rowId] = { ...(pending.current[rowId] || {}), ...patch };
    if (timers.current[rowId]) clearTimeout(timers.current[rowId]);
    timers.current[rowId] = setTimeout(() => flush(rowId), 600);
  };

  const editLevel = (row, idx, value) => {
    const points = (row.points || []).map((p, j) => (j === idx ? { ...p, level: value } : p));
    editRow(row.id, { points });
  };

  const flush = async (rowId) => {
    const patch = pending.current[rowId];
    if (!patch || !impId) return;
    delete pending.current[rowId];
    const body = {};
    if ("chainage_m" in patch) body.chainage_m = patch.chainage_m;
    if ("frl_m" in patch) body.frl_m = patch.frl_m;
    if ("points" in patch) body.points = (patch.points || []).map((p) => ({ offset: p.offset, level: p.level }));
    const r = await rpatch(`/levels/import/${impId}/rows/${rowId}`, body);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.imp_row_failed")); return; }
    // Poori list dobara lao — summary (kitni laal, kitni taiyar) bhi badalti hai.
    await refresh(impId);
  };

  // ── Lagao ─────────────────────────────────────────────────────────
  const commit = async () => {
    setBusy(true);
    const r = await rpost(`/levels/import/${impId}/commit`, { skip_errors: skipErrors });
    setBusy(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.imp_commit_failed")); return; }
    setResult(r.data);
    toast.success(r.message || t("road.imp_committed"));
    setStep(4);
  };

  const discard = async () => {
    if (impId) await rdelete("/levels/import/" + impId);
    onClose();
  };

  const head = aoa[offsetRow] || [];
  const sum = (staged && staged.summary) || { total: 0, errors: 0, warnings: 0, ready: 0 };
  const STEPS = [t("road.imp_step_file"), t("road.imp_step_map"), t("road.imp_step_check"), t("road.imp_step_done")];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 520, background: "rgba(17,24,39,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget && step !== 4) onClose(); }}>
      <div style={{ width: "min(1060px,97vw)", maxHeight: "93vh", background: T.bg, borderRadius: 12, boxShadow: "0 24px 60px rgba(0,0,0,.28)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header + stepper */}
        <div style={{ padding: "13px 18px", background: T.surface, borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: T.t1 }}>{t("road.imp_title")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20, color: step === i + 1 ? "#fff" : step > i + 1 ? T.ind : T.t4, background: step === i + 1 ? T.ind : step > i + 1 ? T.indL : "transparent" }}>{i + 1}. {s}</span>
                {i < 3 && <span style={{ width: 13, height: 1, background: T.b1 }} />}
              </React.Fragment>
            ))}
            <button onClick={onClose} title={t("common.close")} style={{ marginLeft: 6, width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, color: T.t3, cursor: "pointer" }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>

          {/* ───────── STEP 1 ───────── */}
          {step === 1 && (
            <div>
              {isPost && (
                <div style={{ marginBottom: 14, padding: "10px 13px", background: T.ambL, border: `1px solid ${T.ambM}`, borderRadius: 8, fontSize: 12, color: "#92400E", lineHeight: 1.6 }}>
                  {t("road.imp_post_banner")}
                </div>
              )}
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, padding: "28px 20px", border: `1.5px dashed ${T.b2}`, borderRadius: 12, background: T.surface, cursor: "pointer" }}>
                <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={T.ind} strokeWidth={1.8}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}>{fileName || t("road.imp_pick_file")}</span>
                <span style={{ fontSize: 11.5, color: T.t4 }}>{t("road.imp_file_hint")}</span>
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onFile} />
              </label>

              {wb && (
                <div style={{ marginTop: 16 }}>
                  <label style={S.lbl}>{t("road.imp_sheet")}</label>
                  <select value={sheetName} onChange={(e) => loadSheet(wb, e.target.value)} style={{ ...S.inp, maxWidth: 320 }}>
                    {wb.SheetNames.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <div style={{ marginTop: 14, fontSize: 12, color: T.t3 }}>
                    {t("road.imp_sheet_rows", { n: aoa.length })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ───────── STEP 2 ───────── */}
          {step === 2 && (
            <div>
              <div style={{ ...S.card, padding: 14, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.55, maxWidth: 480 }}>{t("road.imp_map_hint")}</div>
                  {aiOff ? (
                    <span style={{ fontSize: 11.5, color: T.t4, maxWidth: 260, lineHeight: 1.5 }}>{t("road.ai_abhi_uplabdh_nahi")}</span>
                  ) : (
                    <button onClick={askAi} disabled={aiBusy || !aoa.length}
                      style={btn("ghost", { height: 30, fontSize: 11.5, color: T.ind, borderColor: T.bluM, opacity: aiBusy ? .6 : 1 })}>
                      {aiBusy ? t("road.ai_reading") : t("road.ai_columns_btn")}
                    </button>
                  )}
                </div>

                {aiWhy && (
                  <div style={{ marginBottom: 12, padding: "9px 11px", background: T.indL, border: `1px solid ${T.bluM}`, borderRadius: 7 }}>
                    <div style={{ fontSize: 11.5, color: T.t2, lineHeight: 1.55 }}>{aiWhy.reason}</div>
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>
                      {aiWhy.confidence ? t("road.ai_confidence", { v: aiWhy.confidence }) : ""} {t("road.ai_override_hint")}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
                  <div>
                    <label style={S.lbl}>{t("road.imp_offset_row")}</label>
                    <input type="number" min={1} value={offsetRow + 1}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min((aoa.length || 1) - 1, Number(e.target.value) - 1));
                        setOffsetRow(v);
                      }} style={S.inp} />
                  </div>
                  <div>
                    <label style={S.lbl}>{t("road.imp_ch_col")}</label>
                    <select value={chCol} onChange={(e) => setChCol(Number(e.target.value))} style={S.inp}>
                      {head.map((c, i) => <option key={i} value={i}>{colLabel(i)} · {String(c || "").slice(0, 20) || t("road.imp_blank_cell")}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.lbl}>{t("road.imp_frl_col")}</label>
                    <select value={frlCol == null ? "" : frlCol} onChange={(e) => setFrlCol(e.target.value === "" ? null : Number(e.target.value))} style={S.inp}>
                      <option value="">{t("road.imp_no_frl_col")}</option>
                      {head.map((c, i) => <option key={i} value={i}>{colLabel(i)} · {String(c || "").slice(0, 20) || t("road.imp_blank_cell")}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${T.b1}`, display: "flex", gap: 22, flexWrap: "wrap" }}>
                  <div><div style={{ fontSize: 17, fontWeight: 800, color: T.t1, ...S.num }}>{parsed.offsets.length}</div><div style={S.lbl}>{t("road.imp_offsets_found")}</div></div>
                  <div><div style={{ fontSize: 17, fontWeight: 800, color: T.t1, ...S.num }}>{parsed.rows.length}</div><div style={S.lbl}>{t("road.imp_rows_found")}</div></div>
                  <div><div style={{ fontSize: 17, fontWeight: 800, color: T.t1, ...S.num }}>
                    {parsed.offsets.length ? `${parsed.offsets[0]} … ${parsed.offsets[parsed.offsets.length - 1]}` : "—"}
                  </div><div style={S.lbl}>{t("road.imp_offset_range")}</div></div>
                </div>
                {!aiOff && <AiNote style={{ marginTop: 12 }} />}
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 7 }}>{t("road.imp_preview")}</div>
              <div style={{ ...S.card, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={S.th}>CH</th>
                        <th style={S.th}>FRL</th>
                        {parsed.offsets.map((o, i) => <th key={i} style={{ ...S.th, textAlign: "right" }}>{o}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 6).map((r) => (
                        <tr key={r.row_no}>
                          <td style={{ ...S.td, fontWeight: 700, color: T.t1, ...S.num }}>{r.chainage == null ? "—" : r.chainage}</td>
                          <td style={{ ...S.td, ...S.num }}>{r.frl == null ? "—" : r.frl}</td>
                          {r.levels.map((v, i) => <td key={i} style={{ ...S.td, textAlign: "right", ...S.num }}>{v == null ? "—" : v}</td>)}
                        </tr>
                      ))}
                      {!parsed.rows.length && (
                        <tr><td colSpan={2 + parsed.offsets.length} style={{ ...S.td, textAlign: "center", color: T.t4, padding: 22 }}>{t("road.imp_nothing_parsed")}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ───────── STEP 3 ───────── */}
          {step === 3 && staged && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 11, marginBottom: 14 }}>
                {[[t("road.imp_sum_total"), sum.total, T.t2],
                  [t("road.imp_sum_errors"), sum.errors, T.red],
                  [t("road.imp_sum_warnings"), sum.warnings, T.amb],
                  [t("road.imp_sum_ready"), sum.ready, T.grn]].map(([l, v, c]) => (
                  <div key={l} style={{ ...S.card, borderTop: `3px solid ${c}`, padding: "10px 13px" }}>
                    <div style={{ fontSize: 19, fontWeight: 800, color: c, ...S.num }}>{v}</div>
                    <div style={S.lbl}>{l}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 9, lineHeight: 1.55 }}>{t("road.imp_fix_here")}</div>

              <div style={{ ...S.card, overflow: "hidden" }}>
                <div style={{ overflow: "auto", maxHeight: 400 }}>
                  <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={S.th}>#</th>
                        <th style={S.th}>CH</th>
                        <th style={S.th}>FRL</th>
                        {((staged.rows[0] && staged.rows[0].points) || []).map((p, i) => (
                          <th key={i} style={{ ...S.th, textAlign: "right" }}>{p.offset}</th>
                        ))}
                        <th style={{ ...S.th, minWidth: 220 }}>{t("road.imp_col_check")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staged.rows.map((r) => {
                        const errs = codeList(r.err), warns = codeList(r.warn);
                        const tone = errs.length ? T.redL : warns.length ? T.ambL : "transparent";
                        return (
                          <tr key={r.id} style={{ background: tone }}>
                            <td style={{ ...S.td, color: T.t4 }}>{r.row_no}</td>
                            <td style={S.td}>
                              <input value={r.chainage_m == null ? "" : r.chainage_m}
                                onChange={(e) => editRow(r.id, { chainage_m: e.target.value })}
                                style={{ ...S.inp, width: 76, textAlign: "right", background: T.surface }} />
                            </td>
                            <td style={S.td}>
                              <input value={r.frl_m == null ? "" : r.frl_m}
                                onChange={(e) => editRow(r.id, { frl_m: e.target.value })}
                                style={{ ...S.inp, width: 84, textAlign: "right", background: T.surface }} />
                            </td>
                            {(r.points || []).map((p, i) => (
                              <td key={i} style={S.td}>
                                <input value={p.level == null ? "" : p.level}
                                  onChange={(e) => editLevel(r, i, e.target.value)}
                                  style={{ ...S.inp, width: 82, textAlign: "right", background: T.surface }} />
                              </td>
                            ))}
                            <td style={{ ...S.td, minWidth: 220 }}>
                              {errs.map((x, i) => <Chip key={"e" + i} tone="err" text={impMsg(x)} />)}
                              {warns.map((x, i) => <Chip key={"w" + i} tone="warn" text={impMsg(x)} />)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {sum.errors > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 13, cursor: "pointer", fontSize: 12.5, color: T.t2 }}>
                  <button type="button" onClick={() => setSkipErrors((v) => !v)}
                    style={{ width: 34, height: 19, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", background: skipErrors ? T.ind : T.b2, flexShrink: 0 }}>
                    <span style={{ position: "absolute", top: 2, left: skipErrors ? 17 : 2, width: 15, height: 15, borderRadius: "50%", background: "#fff" }} />
                  </button>
                  {t("road.imp_skip_errors", { n: sum.errors })}
                </label>
              )}
            </div>
          )}

          {/* ───────── STEP 4 ───────── */}
          {step === 4 && result && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ width: 34, height: 34, borderRadius: "50%", background: T.grnL, border: `1px solid ${T.grnM}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={T.grn} strokeWidth={2.5}><path d="M20 6L9 17l-5-5" /></svg>
                </span>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>{t("road.imp_done_title")}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
                {[[t("road.imp_done_chainages"), result.chainages],
                  [t("road.imp_done_points"), result.points],
                  [t("road.imp_done_skipped"), result.skipped]].map(([l, v]) => (
                  <div key={l} style={{ ...S.card, padding: "12px 14px" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: T.t1, ...S.num }}>{v}</div>
                    <div style={S.lbl}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: T.t3 }}>{t("road.imp_done_next")}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "11px 18px", background: T.surface, borderTop: `1px solid ${T.b1}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            {step === 2 && <button onClick={() => setStep(1)} style={btn("ghost")}>{t("common.back")}</button>}
            {step === 3 && <button onClick={discard} style={btn("danger")}>{t("road.imp_discard")}</button>}
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            {step === 1 && (
              <button disabled={!parsed.rows.length} onClick={() => setStep(2)}
                style={{ ...btn("primary"), opacity: parsed.rows.length ? 1 : .5, cursor: parsed.rows.length ? "pointer" : "not-allowed" }}>
                {t("road.btn_next")}
              </button>
            )}
            {step === 2 && (
              <button disabled={busy || !parsed.rows.length || !parsed.offsets.length} onClick={stage}
                style={{ ...btn("primary"), opacity: (busy || !parsed.rows.length || !parsed.offsets.length) ? .5 : 1 }}>
                {busy ? t("road.btn_wait") : t("road.imp_check_btn")}
              </button>
            )}
            {step === 3 && (
              <button disabled={busy || (sum.errors > 0 && !skipErrors) || !sum.ready} onClick={commit}
                title={sum.errors > 0 && !skipErrors ? t("road.imp_fix_first") : ""}
                style={{ ...btn("primary"), opacity: (busy || (sum.errors > 0 && !skipErrors) || !sum.ready) ? .5 : 1 }}>
                {busy ? t("road.btn_wait") : t("road.imp_apply_btn")}
              </button>
            )}
            {step === 4 && (
              <button onClick={() => { onCommitted && onCommitted(); onClose(); }} style={btn("primary")}>{t("common.done")}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
