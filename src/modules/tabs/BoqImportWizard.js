import React, { useState, useMemo, useRef, useEffect } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

// ── BOQ Import wizard (M1) ──────────────────────────────────────────────
// Client parses the sheet (SheetJS), maps columns, stages to /api/boq
// (draft), lets the user reconcile totals, then commits the rows into the
// project's task tree as budget nodes. All parsing is local until Step 3.
// Backend contract: routes/boq.js.

const inr = (n) => { const v = Math.round(Number(n) || 0); return (v < 0 ? "-₹" : "₹") + Math.abs(v).toLocaleString("en-IN"); };
// Numbers in a BOQ arrive as cached formula values, "1,234.50", "₹500", etc.
const numOf = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const isBlank = (v) => v == null || String(v).trim() === "";

// Total / sub-total / carried-over jaisi rows. Ye na continuation hain na
// asli item — inhe alag row rehne dena zaroori hai.
//
// ⚠️ SYNC: yahi regex + neeche wale do guard (continuation aur grand-total)
// src/modules/TendersModule.js ke `parseBoqRows` me bhi hain (tender-level
// BOQ). Dono jaan-boojh kar identical hain — ek jagah badlo to doosri jagah
// bhi badlo, warna ek hi sheet do screen par alag padhi jayegi.
const TOTAL_RE = /(sub[\s-]*total|grand\s*total|^total|carried\s*over|brought\s*forward|^c\/o$|^b\/f$)/i;

const TARGETS = [
  { key: "description", get label() { return t("boq_import_wizard.description"); }, re: /description|item|particular|work/i, required: true },
  { key: "unit",        get label() { return t("common.unit"); },        re: /^unit|units|uom/i },
  { key: "qty",         get label() { return t("boq_import_wizard.quantity"); },    re: /qty|quantity|nos/i, required: true },
  { key: "rate",        get label() { return t("common.rate"); },        re: /rate|price/i, required: true },
  { key: "amount",      get label() { return t("boq_import_wizard.amount"); },      re: /amount|total|value/i },
  { key: "sor_code",    get label() { return t("boq_import_wizard.sor_code"); },  re: /sor|code|ref/i },
  { key: "sno",         label: "S.No.",       re: /^s\.?\s*no|^sr|serial|^#/i },
];
const CATEGORIES = ["Civil", "Electrical", "Plumbing", "Finishing", "Structural", "Custom"];

const colLabel = (i) => { let s = ""; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

export default function BoqImportWizard({ projectId, existingTasks = [], onClose, onCommitted }) {
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState(null);
  const flash = (m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 2600); };

  // ── Step 1 — workbook / sheet / header ──
  const [fileName, setFileName] = useState("");
  const [wb, setWb] = useState(null);          // XLSX workbook
  const [sheetName, setSheetName] = useState("");
  const [aoa, setAoa] = useState([]);           // array-of-arrays for the active sheet
  const [headerRow, setHeaderRow] = useState(0); // 0-based
  const [headerAuto, setHeaderAuto] = useState(true);

  // ── Step 2 — mapping + options ──
  const [mapping, setMapping] = useState({});   // targetKey -> source column index
  const [opts, setOpts] = useState({ contFromBlankSno: true, skipTotals: true, calcAmount: true, skipEmptyDesc: false });

  // ── Step 3 — staged draft ──
  const [importId, setImportId] = useState(null);
  const [staged, setStaged] = useState(null);   // { items, parsed_total, file_total, diff, matched, warnings_summary }
  const [busy, setBusy] = useState(false);

  // ── Step 3 target card ──
  const [parentMode, setParentMode] = useState("new");
  const [parentName, setParentName] = useState("BOQ-1");
  const [parentTaskId, setParentTaskId] = useState("");
  const [category, setCategory] = useState("Civil");
  const [budgetNode, setBudgetNode] = useState(true);

  // ── Step 4 — commit result ──
  const [result, setResult] = useState(null);
  const [reverted, setReverted] = useState(false);

  const parseTimer = useRef(null);

  // ── File load ────────────────────────────────────────────────────────
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    try {
      // xlsx sirf file parse par chahiye — dynamic import se tab-chunk halka rehta hai.
      const XLSX = await import("xlsx");
      const buf = await f.arrayBuffer();
      // Cached formula values only — never enable raw formula evaluation.
      const book = XLSX.read(new Uint8Array(buf), { type: "array" });
      setWb(book);
      const first = book.SheetNames[0];
      await loadSheet(book, first);
    } catch (err) {
      flash(t("boq_import_wizard.file_padhne_me_dikkat_sahi_excel"), "error");
    }
    e.target.value = "";
  };

  const loadSheet = async (book, name) => {
    const XLSX = await import("xlsx");
    const ws = book.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "", blankrows: true });
    setSheetName(name);
    setAoa(rows);
    setHeaderAuto(true);
    const h = detectHeader(rows);
    setHeaderRow(h);
    setMapping(autoMap(rows[h] || []));
  };

  // First row with >= 4 non-empty string cells.
  const detectHeader = (rows) => {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const strCells = (rows[i] || []).filter((c) => typeof c === "string" && c.trim() !== "").length;
      if (strCells >= 4) return i;
    }
    return 0;
  };

  const autoMap = (headerCells) => {
    const m = {};
    TARGETS.forEach((tg) => {
      const idx = headerCells.findIndex((c) => typeof c === "string" && tg.re.test(c.trim()));
      if (idx >= 0) m[tg.key] = idx;
    });
    return m;
  };

  const setHeader = (n) => {
    setHeaderAuto(false);
    const h = Math.max(0, Math.min((aoa.length || 1) - 1, Number(n) || 0));
    setHeaderRow(h);
    setMapping(autoMap(aoa[h] || []));
  };

  const headerCells = aoa[headerRow] || [];
  const dataRowsRaw = aoa.slice(headerRow + 1);

  // ── Build parsed rows from the current mapping + options ──────────────
  const parsed = useMemo(() => {
    if (!aoa.length || mapping.description == null) return { rows: [], totalRow: null, fileTotal: 0 };
    const get = (row, key) => (mapping[key] != null ? row[mapping[key]] : "");

    // Find + drop the file's grand-total row.
    //
    // It may ONLY be the LAST non-empty row. Scanning backwards for the first
    // "total"-ish row used to latch onto a mid-sheet Sub Total when more items
    // followed it — the detected file total was then that section's subtotal,
    // not the sheet's, so reconciliation failed for a file that was fine.
    const isEmptyRow = (row) => (row || []).every((c) => isBlank(c));
    let lastFilled = -1;
    for (let i = dataRowsRaw.length - 1; i >= 0; i--) {
      if (!isEmptyRow(dataRowsRaw[i])) { lastFilled = i; break; }
    }
    let totalRowIdx = -1;
    if (lastFilled >= 0) {
      const desc = String(get(dataRowsRaw[lastFilled], "description") || "");
      if (TOTAL_RE.test(desc) && isBlank(get(dataRowsRaw[lastFilled], "qty"))) totalRowIdx = lastFilled;
    }
    const totalRow = totalRowIdx >= 0 ? dataRowsRaw[totalRowIdx] : null;
    const fileTotal = totalRow ? numOf(get(totalRow, "amount")) : null;

    const out = [];
    let rowNo = 0;
    let lastPrimaryRowNo = null;
    dataRowsRaw.forEach((row, i) => {
      if (i === totalRowIdx) return;
      const desc = String(get(row, "description") ?? "").trim();
      const sno = get(row, "sno");
      const qty = numOf(get(row, "qty"));
      const rate = numOf(get(row, "rate"));
      const amtCol = numOf(get(row, "amount"));

      // A fully empty row (no desc, no qty, no amount) is sheet padding.
      if (isBlank(desc) && qty === 0 && amtCol === 0 && isBlank(get(row, "sor_code"))) return;
      if (opts.skipTotals && TOTAL_RE.test(desc) && qty === 0) return;
      if (opts.skipEmptyDesc && isBlank(desc)) return;

      // A Sub Total / Carried Over row also has a blank S.No, but it is NOT a
      // continuation — it used to get swallowed into the previous item as an
      // extra description line, silently inflating that item's text and hiding
      // a row the user needed to see. Two tells: total-like wording, or money
      // in the amount column (a genuine continuation line carries none).
      const looksTotal = TOTAL_RE.test(desc) || amtCol !== 0;
      const isCont = opts.contFromBlankSno && isBlank(sno) && lastPrimaryRowNo != null && !looksTotal;
      rowNo += 1;
      const amount = opts.calcAmount ? Math.round(qty * rate * 100) / 100 : amtCol;
      out.push({
        row_no: rowNo,
        sno: isBlank(sno) ? "" : String(sno).trim().slice(0, 20),
        sor_code: String(get(row, "sor_code") ?? "").trim().slice(0, 80),
        description: desc,
        unit_raw: String(get(row, "unit") ?? "").trim().slice(0, 40),
        qty, rate, amount,
        is_continuation: isCont ? 1 : 0,
        parent_row_no: isCont ? lastPrimaryRowNo : null,
      });
      if (!isCont) lastPrimaryRowNo = rowNo;
    });
    return { rows: out, totalRow, fileTotal: fileTotal != null ? fileTotal : Math.round(out.reduce((s, r) => s + r.amount, 0) * 100) / 100 };
  }, [aoa, mapping, opts, headerRow, dataRowsRaw]);

  const missingRequired = TARGETS.filter((t) => t.required && mapping[t.key] == null).map((t) => t.label);

  // ── Stage the draft (Step 2 → 3) ──────────────────────────────────────
  const stage = async () => {
    setBusy(true);
    try {
      const r = await api.post("/boq/imports", {
        project_id: projectId,
        file_name: fileName,
        sheet_name: sheetName,
        header_row: headerRow + 1,
        mapping,
        options: opts,
        file_total: parsed.fileTotal,
        rows: parsed.rows,
      });
      if (!r?.success) { flash(r?.message || "Stage fail", "error"); return; }
      setImportId(r.data.import_id);
      await refreshStaged(r.data.import_id);
      setStep(3);
    } catch (e) {
      flash(t("boq_import_wizard.server_tak_nahi_pahunch_paaye"), "error");
    } finally { setBusy(false); }
  };

  const refreshStaged = async (id) => {
    const g = await api.get("/boq/imports/" + id);
    if (g?.success) setStaged(g.data);
  };

  // ── Inline edit → debounced PATCH ─────────────────────────────────────
  const pending = useRef({});
  // Ask the LLM for short task names. The suggestion is saved server-side and
  // pulled back into the table, where every name stays editable — so a bad
  // suggestion costs one keystroke, not a wrong task.
  const [naming, setNaming] = useState(false);
  const suggestNames = async () => {
    if (!staged?.import_id || naming) return;
    setNaming(true);
    const r = await api.post(`/boq/imports/${staged.import_id}/suggest-names`, {});
    setNaming(false);
    if (!r?.success) { flash(r?.message || "Naam nahi ban paye", "error"); return; }
    const byId = {};
    (r.data?.items || []).forEach((x) => { byId[x.id] = x.short_name; });
    setStaged((s) => s && ({ ...s, items: s.items.map((it) => ({ ...it, short_name: byId[it.id] ?? it.short_name })) }));
    flash(`${r.data?.named || 0} naam ban gaye — dekh lo, badal bhi sakte ho`);
  };

  const editRow = (itemId, field, value) => {
    setStaged((s) => s && ({
      ...s,
      items: s.items.map((it) => it.id === itemId
        ? { ...it, [field]: value, amount: field === "qty" || field === "rate"
            ? Math.round(numOf(field === "qty" ? value : it.qty) * numOf(field === "rate" ? value : it.rate) * 100) / 100
            : it.amount }
        : it),
    }));
    pending.current[itemId] = { ...(pending.current[itemId] || {}), [field]: value };
    if (parseTimer.current) clearTimeout(parseTimer.current);
    parseTimer.current = setTimeout(flushEdits, 600);
  };

  const flushEdits = async () => {
    const batch = Object.entries(pending.current).map(([id, patch]) => ({
      id: Number(id),
      ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
      ...(patch.qty !== undefined ? { qty: numOf(patch.qty) } : {}),
      ...(patch.rate !== undefined ? { rate: numOf(patch.rate) } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
    }));
    if (!batch.length || !importId) return;
    pending.current = {};
    const r = await api.patch("/boq/imports/" + importId + "/items", { items: batch });
    if (!r?.success) { flash(r?.message || "Update fail", "error"); return; }
    await refreshStaged(importId);
  };

  useEffect(() => () => { if (parseTimer.current) clearTimeout(parseTimer.current); }, []);

  // ── Commit (Step 3 → 4) ───────────────────────────────────────────────
  const commit = async () => {
    setBusy(true);
    try {
      const body = {
        parent_mode: parentMode,
        category,
        mark_budget_node: budgetNode,
      };
      if (parentMode === "new") body.parent_name = parentName?.trim() || "BOQ-1";
      if (parentMode === "existing") body.parent_task_id = Number(parentTaskId) || null;
      const r = await api.post("/boq/imports/" + importId + "/commit", body);
      if (!r?.success) { flash(r?.message || "Commit fail", "error"); return; }
      setResult(r.data);
      setStep(4);
    } catch (e) {
      flash(t("boq_import_wizard.commit_ke_waqt_server_tak_nahi"), "error");
    } finally { setBusy(false); }
  };

  const revert = async () => {
    setBusy(true);
    try {
      const r = await api.post("/boq/imports/" + importId + "/revert", {});
      if (!r?.success) { flash(r?.message || "Revert nahi hua", "error"); return; }
      setReverted(true);
      flash(t("boq_import_wizard.import_revert_ho_gaya"), "ok");
    } catch (e) {
      flash(t("boq_import_wizard.revert_ke_waqt_dikkat"), "error");
    } finally { setBusy(false); }
  };

  // ── styles ─────
  const inp = { width: "100%", padding: "7px 9px", border: `1px solid ${T.b1}`, borderRadius: 7, fontSize: 12.5, color: T.t1, background: T.surfaceB, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
  const td = { padding: "7px 9px", borderBottom: `1px solid ${T.b1}`, fontSize: 12.5 };
  const th = { ...td, color: T.t3, fontWeight: 600, fontSize: 11, textAlign: "left", whiteSpace: "nowrap", background: T.surfaceB };
  const btn = (kind) => ({
    height: 36, padding: "0 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
    border: kind === "ghost" ? `1px solid ${T.b1}` : "none",
    background: kind === "primary" ? T.ind : kind === "ghost" ? T.surface : T.sltL,
    color: kind === "primary" ? "#fff" : kind === "ghost" ? T.t2 : T.t3,
  });
  const STEPS = ["Upload", "Mapping", "Review", "Done"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(17,24,39,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget && step !== 4) onClose(); }}>
      <div style={{ width: "min(1040px,96vw)", maxHeight: "92vh", background: T.bg, borderRadius: 14, boxShadow: "0 24px 60px rgba(0,0,0,.3)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header + stepper */}
        <div style={{ padding: "14px 20px", background: T.surface, borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={T.ind} strokeWidth={2}><path d="M9 17V7h6v10M4 21h16M6 21V5a2 2 0 012-2h8a2 2 0 012 2v16" /></svg>
            <span style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>{t("boq_import_wizard.boq_import")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20, color: step === i + 1 ? "#fff" : step > i + 1 ? T.ind : T.t4, background: step === i + 1 ? T.ind : step > i + 1 ? T.indL : "transparent" }}>{i + 1}. {s}</span>
                {i < 3 && <span style={{ width: 14, height: 1, background: T.b1 }} />}
              </React.Fragment>
            ))}
            <button onClick={onClose} title={t("fuel.band_karein")} style={{ marginLeft: 8, width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, color: T.t3, cursor: "pointer" }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

          {/* ───────── STEP 1 ───────── */}
          {step === 1 && (
            <div>
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "28px 20px", border: `1.5px dashed ${T.b2}`, borderRadius: 12, background: T.surface, cursor: "pointer" }}>
                <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={T.ind} strokeWidth={1.8}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}>{fileName || t("boq_import_wizard.excel_csv_file_chunein")}</span>
                <span style={{ fontSize: 11.5, color: T.t4 }}>{t("boq_import_wizard.xlsx_xls_csv")}</span>
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onFile} />
              </label>

              {wb && (
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 5 }}>{t("boq_import_wizard.sheet")}</div>
                    <select value={sheetName} onChange={(e) => loadSheet(wb, e.target.value)} style={inp}>
                      {wb.SheetNames.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 5 }}>{t("boq_import.header_row")} {headerAuto && <span style={{ color: T.ind, fontWeight: 700 }}>{t("boq_import_wizard.auto_detected")}</span>}</div>
                    <input type="number" min={1} value={headerRow + 1} onChange={(e) => setHeader(Number(e.target.value) - 1)} style={inp} />
                  </div>
                </div>
              )}

              {wb && (
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
                  {[["Sheet rows", aoa.length], ["Header row", headerRow + 1], ["Data rows", parsed.rows.length], ["Total row", parsed.totalRow ? "mila" : "nahi"], ["File total", inr(parsed.fileTotal)]].map(([l, v]) => (
                    <div key={l} style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 9, padding: "10px 12px" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ───────── STEP 2 ───────── */}
          {step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 18 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 8 }}>{t("boq_import_wizard.column_mapping")}</div>
                {TARGETS.map((tg) => {
                  const detected = mapping[tg.key] != null && autoMap(headerCells)[tg.key] === mapping[tg.key];
                  return (
                    <div key={tg.key} style={{ marginBottom: 9 }}>
                      <div style={{ fontSize: 11, color: T.t3, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                        {tg.label}{tg.required && <span style={{ color: T.red }}>*</span>}
                        {detected && <span style={{ fontSize: 9, fontWeight: 700, color: T.ind, background: T.indL, padding: "1px 6px", borderRadius: 10 }}>{t("boq_import_wizard.detected")}</span>}
                      </div>
                      <select value={mapping[tg.key] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [tg.key]: e.target.value === "" ? null : Number(e.target.value) }))} style={inp}>
                        <option value="">{t("boq_import_wizard.none")}</option>
                        {headerCells.map((c, i) => <option key={i} value={i}>{colLabel(i)} · {String(c || "").slice(0, 24) || t("boq_import_wizard.blank")}</option>)}
                      </select>
                    </div>
                  );
                })}
                <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 8 }}>{t("boq_import_wizard.options")}</div>
                {[["contFromBlankSno", "Blank S.No. = pichhle item ka hissa"], ["skipTotals", "Total / sub-total rows chhodo"], ["calcAmount", "Amount khud calculate karo (qty × rate)"], ["skipEmptyDesc", "Khaali description wali rows chhodo"]].map(([k, l]) => (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", fontSize: 12, color: T.t2 }}>
                    <button type="button" onClick={() => setOpts((o) => ({ ...o, [k]: !o[k] }))}
                      style={{ width: 34, height: 19, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", background: opts[k] ? T.ind : T.b2, transition: "background .15s" }}>
                      <span style={{ position: "absolute", top: 2, left: opts[k] ? 17 : 2, width: 15, height: 15, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
                    </button>
                    {l}
                  </label>
                ))}
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 8 }}>{t("boq_import_wizard.preview")} <span style={{ fontWeight: 400, color: T.t4 }}>{t("boq_import_wizard.pehli_5_rows")}</span></div>
                <div style={{ border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden", background: T.surface }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>{["#", "SOR", "Description", "Unit", "Qty", "Rate", "Amount", ""].map((h, i) => <th key={i} style={{ ...th, textAlign: i >= 4 && i <= 6 ? "right" : "left" }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {parsed.rows.slice(0, 5).map((r) => (
                          <tr key={r.row_no}>
                            <td style={{ ...td, color: T.t4 }}>{r.row_no}</td>
                            <td style={td}>{r.sor_code || "—"}</td>
                            <td style={{ ...td, paddingLeft: r.is_continuation ? 22 : 9 }}>{r.is_continuation ? "↳ " : ""}{r.description || <span style={{ color: T.red }}>{t("boq_import_wizard.khaali")}</span>}</td>
                            <td style={td}>{r.unit_raw || "—"}</td>
                            <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.qty}</td>
                            <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.rate}</td>
                            <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{inr(r.amount)}</td>
                            <td style={td}>{r.is_continuation ? <span style={{ fontSize: 9, fontWeight: 700, color: T.slt, background: T.sltL, padding: "1px 6px", borderRadius: 10 }}>{t("boq_import_wizard.cont")}</span> : ""}</td>
                          </tr>
                        ))}
                        {!parsed.rows.length && <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: T.t4, padding: 26 }}>{t("boq_import_wizard.koi_row_nahi_mili_mapping_ya")}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
                {!!missingRequired.length && (
                  <div style={{ marginTop: 12, fontSize: 12, color: T.red, background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 8, padding: "8px 12px" }}>
                   {t("boq_import_wizard.in_fields_ki_mapping_zaroori_hai")} <b>{missingRequired.join(", ")}</b>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ───────── STEP 3 ───────── */}
          {step === 3 && staged && (
            <div>
              {/* Target card */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 14, background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, padding: 14 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 4 }}>{t("common.project")}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>#{projectId}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 4 }}>{t("boq_import_wizard.parent")}</div>
                  <select value={parentMode} onChange={(e) => setParentMode(e.target.value)} style={inp}>
                    <option value="new">{t("boq_import_wizard.naya_wrapper_banao")}</option>
                    <option value="root">{t("boq_import_wizard.project_root_pe_rakho")}</option>
                    <option value="existing">{t("boq_import_wizard.existing_task_ke_andar")}</option>
                  </select>
                </div>
                {parentMode === "new" && (
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 4 }}>{t("boq_import_wizard.wrapper_naam")}</div>
                    <input value={parentName} onChange={(e) => setParentName(e.target.value)} style={inp} />
                  </div>
                )}
                {parentMode === "existing" && (
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 4 }}>{t("boq_import_wizard.parent_task")}</div>
                    <select value={parentTaskId} onChange={(e) => setParentTaskId(e.target.value)} style={inp}>
                      <option value="">{t("boq_import_wizard.chunein")}</option>
                      {existingTasks.map((t) => <option key={t.id} value={t.id}>{(t.task_no || t.no || "")} · {String(t.name || "").slice(0, 30)}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 4 }}>{t("common.category")}</div>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={inp}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: T.t2, alignSelf: "end", paddingBottom: 6 }}>
                  <button type="button" onClick={() => setBudgetNode((v) => !v)} style={{ width: 34, height: 19, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", background: budgetNode ? T.ind : T.b2 }}>
                    <span style={{ position: "absolute", top: 2, left: budgetNode ? 17 : 2, width: 15, height: 15, borderRadius: "50%", background: "#fff" }} />
                  </button>
                 {t("boq_import_wizard.budget_node_banao")}
                </label>
              </div>

              {/* Reconciliation strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 14 }}>
                {[["File total", inr(staged.file_total), T.t2], ["Parsed total", inr(staged.parsed_total), T.blu], ["Diff", inr(staged.diff), (staged.matched ? T.grn : T.red)]].map(([l, v, c]) => (
                  <div key={l} style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, borderTop: `3px solid ${c}`, padding: "10px 14px" }}>
                    <div style={{ fontSize: 19, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginTop: 2 }}>{l}</div>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: staged.matched ? T.grnL : T.redL, border: `1px solid ${staged.matched ? T.grnM : T.redM}`, borderRadius: 10, padding: "10px 14px" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: staged.matched ? T.grn : T.red }}>{staged.matched ? t("boq_import_wizard.matched") : t("boq_import_wizard.not_matched")}</span>
                </div>
              </div>

              {/* Short task names — AI suggests, you decide */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <button onClick={suggestNames} disabled={naming}
                  style={{ height: 32, padding: "0 13px", borderRadius: 7, border: `1px solid ${T.ind}33`,
                    background: T.indL, color: T.ind, fontSize: 12, fontWeight: 700,
                    cursor: naming ? "default" : "pointer", fontFamily: "inherit" }}>
                  {naming ? t("boq_import_wizard.ai_naam_bana_raha_hai") : t("boq_import_wizard.ai_se_chhote_task_naam_banao")}
                </button>
                <span style={{ fontSize: 11.5, color: T.t4 }}>
                 {t("boq_import_wizard.boq_ka_pura_description_task_ke")}
                </span>
              </div>

              {/* Rows */}
              <div style={{ border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden", background: T.surface }}>
                <div style={{ overflowX: "auto", maxHeight: 340 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 1 }}><tr>{["#", "SOR", "Task ka naam", "Description", "Unit", "Qty", "Rate", "Amount", "Warning"].map((h, i) => <th key={i} style={{ ...th, textAlign: i >= 5 && i <= 7 ? "right" : "left" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {staged.items.map((it) => {
                        const warns = typeof it.warnings_json === "string" ? JSON.parse(it.warnings_json || "[]") : (it.warnings_json || []);
                        return (
                          <tr key={it.id}>
                            <td style={{ ...td, color: T.t4 }}>{it.row_no}</td>
                            <td style={td}>{it.sor_code || "—"}</td>
                            {/* The name the task will actually carry. Blank = the
                                full description is used, exactly as before. */}
                            <td style={td}>
                              <input value={it.short_name ?? ""} onChange={(e) => editRow(it.id, "short_name", e.target.value)}
                                placeholder={t("boq_import_wizard.description_use_hoga")}
                                style={{ ...inp, padding: "4px 6px", width: 170,
                                  color: it.short_name ? T.t1 : T.t4, borderColor: it.short_name ? T.ind : T.b1 }} />
                            </td>
                            <td style={{ ...td, paddingLeft: it.is_continuation ? 22 : 9, maxWidth: 320 }}>
                              <div style={{ maxHeight: 34, overflow: "hidden", color: T.t3, fontSize: 11.5 }}>
                                {it.is_continuation ? "↳ " : ""}{it.description}
                              </div>
                            </td>
                            <td style={td}><input value={it.unit ?? it.unit_raw ?? ""} onChange={(e) => editRow(it.id, "unit", e.target.value)} style={{ ...inp, padding: "4px 6px", width: 70 }} /></td>
                            <td style={{ ...td, textAlign: "right" }}><input value={it.qty} onChange={(e) => editRow(it.id, "qty", e.target.value)} style={{ ...inp, padding: "4px 6px", width: 74, textAlign: "right" }} /></td>
                            <td style={{ ...td, textAlign: "right" }}><input value={it.rate} onChange={(e) => editRow(it.id, "rate", e.target.value)} style={{ ...inp, padding: "4px 6px", width: 84, textAlign: "right" }} /></td>
                            <td style={{ ...td, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{inr(it.amount)}</td>
                            <td style={td}>{warns.length ? <span title={warns.map((w) => w.msg).join("\n")} style={{ fontSize: 9.5, fontWeight: 700, color: T.amb, background: T.ambL, border: `1px solid ${T.ambM}`, padding: "1px 6px", borderRadius: 10 }}>{warns.length} warning{warns.length > 1 ? "s" : ""}</span> : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ───────── STEP 4 ───────── */}
          {step === 4 && result && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ width: 34, height: 34, borderRadius: "50%", background: T.grnL, border: `1px solid ${T.grnM}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={T.grn} strokeWidth={2.5}><path d="M20 6L9 17l-5-5" /></svg>
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>{t("boq_import_wizard.import_ho_gaya")}</div>
                  <div style={{ fontSize: 12, color: T.t3 }}>{t("boq_import_wizard.ms_ms_me_poora_hua", { ms: result.ms })}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 16 }}>
                {[["Tasks banaye", result.tasks_created], ["Budget nodes", result.budget_nodes], ["Scope total", inr(result.scope_total)]].map(([l, v]) => (
                  <div key={l} style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>

              {staged && (
                <div style={{ border: `1px solid ${T.b1}`, borderRadius: 10, background: T.surface, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 8 }}>{t("boq_import_wizard.tree_preview")}</div>
                  {parentMode === "new" && <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginBottom: 4 }}>{parentName || t("boq_import_wizard.boq_1")}</div>}
                  {staged.items.filter((i) => !i.is_continuation).slice(0, 8).map((it) => (
                    <div key={it.id} style={{ fontSize: 12.5, color: T.t2, paddingLeft: parentMode === "new" ? 16 : 0, marginBottom: 3, display: "flex", justifyContent: "space-between" }}>
                      <span>{String(it.description).slice(0, 46)}</span>
                      <span style={{ color: T.t4, fontVariantNumeric: "tabular-nums" }}>{inr(it.amount)}</span>
                    </div>
                  ))}
                  {staged.items.filter((i) => !i.is_continuation).length > 8 && (
                    <div style={{ fontSize: 12, color: T.t4, paddingLeft: parentMode === "new" ? 16 : 0, marginTop: 4 }}>{t("boq_import_wizard.aur_staged_items", { staged: staged.items.filter((i) => !i.is_continuation).length - 8 })}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", background: T.surface, borderTop: `1px solid ${T.b1}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            {step > 1 && step < 4 && <button onClick={() => setStep(step - 1)} style={btn("ghost")}>{t("boq_import_wizard.peeche")}</button>}
            {step === 4 && !reverted && <button onClick={revert} disabled={busy} style={{ ...btn("ghost"), color: T.red, borderColor: T.redM }}>{t("boq_import_wizard.is_import_ko_revert_karein")}</button>}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {step === 1 && <button disabled={!parsed.rows.length} onClick={() => setStep(2)} style={{ ...btn("primary"), opacity: parsed.rows.length ? 1 : .5, cursor: parsed.rows.length ? "pointer" : "not-allowed" }}>{t("boq_import_wizard.aage")}</button>}
            {step === 2 && (
              <button disabled={!!missingRequired.length || !parsed.rows.length || busy}
                title={missingRequired.length ? "Required fields: " + missingRequired.join(", ") : ""}
                onClick={stage}
                style={{ ...btn("primary"), opacity: (missingRequired.length || !parsed.rows.length) ? .5 : 1, cursor: (missingRequired.length || !parsed.rows.length) ? "not-allowed" : "pointer" }}>
                {busy ? t("boq_import_wizard.ruko") : t("boq_import_wizard.review")}
              </button>
            )}
            {step === 3 && staged && (
              <button disabled={!staged.matched || busy || (parentMode === "existing" && !parentTaskId)}
                title={!staged.matched ? t("boq_import_wizard.total_match_nahi_ho_raha") : ""}
                onClick={commit}
                style={{ ...btn("primary"), opacity: (!staged.matched || (parentMode === "existing" && !parentTaskId)) ? .5 : 1, cursor: (!staged.matched || (parentMode === "existing" && !parentTaskId)) ? "not-allowed" : "pointer" }}>
                {busy ? t("boq_import_wizard.import_ho_raha") : `${staged.items.length} tasks import karein`}
              </button>
            )}
            {step === 4 && <button onClick={() => { onCommitted && onCommitted(); onClose(); }} style={btn("primary")}>{t("boq_import_wizard.tasks_tab_kholein")}</button>}
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", top: 18, right: 22, zIndex: 9999, padding: "10px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: toast.t === "error" ? T.redL : T.grnL, color: toast.t === "error" ? T.red : T.grn, border: `1px solid ${toast.t === "error" ? T.redM : T.grnM}` }}>{toast.m}</div>
      )}
    </div>
  );
}
