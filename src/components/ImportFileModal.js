// components/ImportFileModal.js — "file do → jaanch → galti yahin theek → import" ka
// poora modal, un import ke liye jinki apni koi screen nahi thi (Project Tasks,
// CRM Leads). Column naam se pehchane jaate hain (utils/sheetRows), jaanch server
// par (importUrl — gb-backend utils/importKit ka jawab), sudhaar ImportFixPanel me.
//
// Props:
//   importUrl, body      — POST { ...body, rows, dry_run }
//   fields               — ImportFixPanel ke fields (key, col, aliases, required, type…)
//   template             — { filename, headers: [...], sample: [[...]] } → CSV utaarta hai
//   rowTitle / rowSub    — row ki pehchaan
//   onDone(data)         — import ho jaane par (list dobara lao)
import { useEffect, useState } from "react";
import ImportFixPanel, { useImportFix } from "./ImportFix";
import { readSheet, sheetToRows } from "../utils/sheetRows";
import api from "../config/api";
import { t } from "../i18n";

const C = {
  ind: "#4F46E5", grn: "#059669", grnL: "#ECFDF5", red: "#DC2626", redL: "#FEF2F2",
  amb: "#92400E", ambL: "#FFFBEB", t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB", card: "#FFFFFF", off: "#E5E7EB",
};
const btn = (primary, on = true) => ({
  padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "inherit",
  cursor: on ? "pointer" : "not-allowed", border: primary ? "none" : `1.5px solid ${C.b1}`,
  background: primary ? (on ? C.ind : C.off) : C.card, color: primary ? (on ? "#fff" : C.t4) : C.t2,
});

function downloadTemplate(tpl) {
  const cell = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [tpl.headers, ...(tpl.sample || [])].map((r) => r.map(cell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = tpl.filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportFileModal({ open, onClose, title, sub, fields, template, importUrl, body, rowTitle, rowSub, onDone }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState("");   // "" | "check" | "import"
  const [error, setError] = useState("");
  const [warn, setWarn] = useState("");
  const [result, setResult] = useState("");
  const fx = useImportFix();

  useEffect(() => {
    if (!open) return;
    setFile(null); setBusy(""); setError(""); setWarn(""); setResult(""); fx.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const send = (rows, dryRun) => api.post(importUrl, { ...(body || {}), rows, dry_run: dryRun }, { timeoutMs: dryRun ? 60000 : 120000 });

  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setFile(f); setError(""); setWarn(""); setResult(""); fx.reset();
    let parsed;
    try { parsed = sheetToRows(await readSheet(f), fields); }
    catch (_) { setError(t("import_fix.read_failed")); return; }
    if (!parsed.found.length) { setError(t("import_fix.no_columns")); return; }
    if (!parsed.rows.length) { setError(t("import_fix.no_rows")); return; }
    if (parsed.missing.length) setWarn(t("import_fix.missing_columns", { cols: parsed.missing.join(", ") }));
    setBusy("check");
    const r = await send(parsed.rows, true);
    setBusy("");
    // Galti par server 422 + wahi rows bhejta hai; api() use { success:false, data } bana deta hai.
    if (r && r.data && r.data.rows) { fx.take(r.data, r.message, true); return; }
    setError((r && r.message) || t("import_fix.failed"));
  };

  const run = async (dryRun) => {
    const rows = fx.payload();
    if (!rows.length) { setError(t("import_fix.none_left")); return; }
    setBusy(dryRun ? "check" : "import"); setError("");
    const r = await send(rows, dryRun);
    setBusy("");
    if (!dryRun && r && r.success && r.data && r.data.committed) {
      setResult(r.message || "");
      if (onDone) onDone(r.data);
      return;
    }
    if (r && r.data && r.data.rows) { fx.take(r.data, r.message, false); return; }
    setError((r && r.message) || t("import_fix.failed"));
  };

  const fixing = fx.rows.length > 0 && !result;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div style={{ background: C.card, borderRadius: 14, width: fixing ? 1000 : 600, maxWidth: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", fontFamily: "inherit" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.b1}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.t1 }}>{title}</div>
            <div style={{ fontSize: 12, color: C.t3, marginTop: 3, lineHeight: 1.5 }}>{file ? file.name : sub}</div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")} title={t("common.close")}
            style={{ border: "none", background: "none", fontSize: 18, color: C.t4, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {!result && (
            <label style={{ display: "block", border: `2px dashed ${file ? C.grn : C.b2}`, borderRadius: 12, padding: fixing ? "10px 16px" : "28px 16px", textAlign: "center", cursor: "pointer", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: file ? C.grn : C.t2 }}>{file ? file.name : t("import_fix.pick_file")}</div>
              <div style={{ fontSize: 11.5, color: C.t4, marginTop: 4 }}>{t("import_fix.pick_hint")}</div>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={pick} style={{ display: "none" }} />
            </label>
          )}
          {!file && template && (
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <button type="button" onClick={() => downloadTemplate(template)}
                style={{ border: "none", background: "none", color: C.ind, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {t("import_fix.template")}
              </button>
            </div>
          )}
          {busy === "check" && !fx.rows.length && (
            <div style={{ textAlign: "center", fontSize: 12.5, color: C.t3, marginBottom: 12 }}>{t("import_fix.checking")}</div>
          )}
          {warn && !result && <div style={{ background: C.ambL, color: C.amb, borderRadius: 8, padding: "9px 12px", fontSize: 12, marginBottom: 12 }}>{warn}</div>}
          {error && <div style={{ background: C.redL, color: C.red, borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
          {fixing && <ImportFixPanel fx={fx} fields={fields} title={rowTitle} sub={rowSub} />}
          {result && <div style={{ background: C.grnL, color: C.grn, borderRadius: 10, padding: "14px 16px", fontSize: 13, fontWeight: 700 }}>{result}</div>}
        </div>

        <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.b1}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={onClose} style={btn(false)}>{result ? t("common.done") : t("common.cancel")}</button>
          {fixing && (fx.stale ? (
            <button type="button" onClick={() => run(true)} disabled={!!busy} style={btn(true, !busy)}>
              {busy ? t("import_fix.checking") : t("import_fix.recheck")}
            </button>
          ) : (
            <button type="button" onClick={() => run(false)} disabled={!!busy || !fx.canImport} style={btn(true, !busy && fx.canImport)}>
              {busy === "import" ? t("import_fix.importing") : t("import_fix.import_go", { n: fx.counts.ok })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
