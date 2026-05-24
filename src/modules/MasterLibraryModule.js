import { useState, useMemo, useEffect, useCallback } from "react";
import api from "../config/api";
import SearchSelect from "../components/SearchSelect";

// ─── ICON COMPONENT ──────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor", fill = "none", strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IcBox       = (p) => <Icon {...p} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />;
const IcUsers     = (p) => <Icon {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z" />;
const IcFolder    = (p) => <Icon {...p} d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />;
const IcTool      = (p) => <Icon {...p} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />;
const IcHardHat   = (p) => <Icon {...p} d="M2 18h20M4 18v-3a8 8 0 0116 0v3M9 18v-6M15 18v-6M12 3v3" />;
const IcClipboard = (p) => <Icon {...p} d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z" />;
const IcDollar    = (p) => <Icon {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />;
const IcTruck     = (p) => <Icon {...p} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 18.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 18.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />;
const IcFile = (p) => <Icon {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
const IcLayers    = (p) => <Icon {...p} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />;
const IcHash      = (p) => <Icon {...p} d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />;
const IcRuler     = (p) => <Icon {...p} d="M2 4h4v16H2zM6 4l7 7M6 9l4 4M6 14l3 3M22 4L9 17l-3 3" />;
const IcGrid      = (p) => <Icon {...p} d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />;
const IcSearch    = (p) => <Icon {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />;
const IcPlus      = (p) => <Icon {...p} d="M12 5v14M5 12h14" />;
const IcEdit      = (p) => <Icon {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />;
const IcTrash     = (p) => <Icon {...p} d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />;
const IcX         = (p) => <Icon {...p} d="M18 6L6 18M6 6l12 12" />;
const IcCheck     = (p) => <Icon {...p} d="M20 6L9 17l-5-5" />;
const IcChevR     = (p) => <Icon {...p} d="M9 18l6-6-6-6" />;
const IcDownload  = (p) => <Icon {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const IcUpload    = (p) => <Icon {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const IcStar      = (p) => <Icon {...p} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;
const IcMap       = (p) => <Icon {...p} d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16" />;
const IcPercent   = (p) => <Icon {...p} d="M19 5L5 19M6.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM17.5 20a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />;

// ─── THEME ───────────────────────────────────────────────────────────
const T = {
  bg: "#F4F6F9", card: "#FFFFFF", blue: "#2563EB", blueSoft: "#EFF6FF", blueMid: "#3B82F6",
  green: "#059669", greenSoft: "#ECFDF5", amber: "#D97706", amberSoft: "#FFFBEB",
  red: "#DC2626", redSoft: "#FEF2F2", purple: "#7C3AED", purpleSoft: "#F5F3FF",
  teal: "#0D9488", tealSoft: "#F0FDFA", orange: "#EA580C", orangeSoft: "#FFF7ED",
  indigo: "#4F46E5", indigoSoft: "#EEF2FF", rose: "#E11D48", roseSoft: "#FFF1F2",
  text: "#111827", textMid: "#4B5563", textLight: "#9CA3AF",
  border: "#E5E7EB", borderLight: "#F3F4F6",
  shadow: "0 1px 3px rgba(0,0,0,0.08)", shadowMd: "0 4px 12px rgba(0,0,0,0.1)", shadowLg: "0 12px 40px rgba(0,0,0,0.18)",
  radius: 10, radiusSm: 6, font: "'Segoe UI', system-ui, -apple-system, sans-serif",
};

// ─── REUSABLE COMPONENTS ─────────────────────────────────────────────
function Badge({ text, color = T.blue, bg = T.blueSoft }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{text}</span>;
}

function FormField({ label, value, onChange, placeholder, type = "text", half = false, disabled = false, required = false }) {
  return (
    <div style={{ flex: half ? 1 : undefined, minWidth: half ? 180 : undefined }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>
        {label}{required && <span style={{ color: T.red }}> *</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ width: "100%", padding: "10px 14px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, fontSize: 13.5, color: T.text, background: disabled ? T.borderLight : "white", outline: "none", boxSizing: "border-box", fontFamily: T.font }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = T.blue; }}
        onBlur={e => e.target.style.borderColor = T.border}
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options, half = false, required = false, placeholder, disabled = false }) {
  // Normalize options to {value,label} for SearchSelect
  const opts = (options || []).map(o => typeof o === "string" ? { value: o, label: o } : (o.value !== undefined ? o : { value: o.key ?? o, label: o.label ?? o }));
  return (
    <div style={{ flex: half ? 1 : undefined, minWidth: half ? 180 : undefined, opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>
        {label}{required && <span style={{ color: T.red }}> *</span>}
      </label>
      <SearchSelect value={value} options={opts} onChange={onChange} placeholder={placeholder || `Select ${String(label||"").toLowerCase()}...`}/>
    </div>
  );
}

function FormTextarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: "100%", padding: "10px 14px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, fontSize: 13.5, color: T.text, background: "white", outline: "none", boxSizing: "border-box", fontFamily: T.font, resize: "vertical" }}
        onFocus={e => e.target.style.borderColor = T.blue}
        onBlur={e => e.target.style.borderColor = T.border}
      />
    </div>
  );
}

// Modal
function Modal({ open, onClose, title, desc, width = 600, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", width, maxWidth: "94vw", maxHeight: "90vh", background: T.card, borderRadius: 14, boxShadow: T.shadowLg, display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{title}</div>
            {desc && <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{desc}</div>}
          </div>
          <button onClick={onClose} style={{ background: T.borderLight, border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" }}><IcX size={18} color={T.textMid} /></button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// Toolbar with search, count, filters, and actions
function Toolbar({ search, setSearch, count, label, onAdd, addLabel, filterEl, onExport, onImport }) {
  return (
    <div style={{ background: T.card, borderRadius: T.radius, padding: "14px 18px", marginBottom: 16, boxShadow: T.shadow, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", border: `1px solid ${T.border}` }}>
      <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
        <IcSearch size={15} color={T.textLight} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${label}...`}
          style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: T.bg, outline: "none", boxSizing: "border-box", fontFamily: T.font }}
          onFocus={e => e.target.style.borderColor = T.blue}
          onBlur={e => e.target.style.borderColor = T.border}
        />
      </div>
      <Badge text={`${count} items`} color={T.textMid} bg={T.borderLight} />
      {filterEl}
      {onImport && (
        <button onClick={onImport} style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 12, fontWeight: 600, color: T.textMid, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <IcUpload size={14} color={T.textMid} /> Import
        </button>
      )}
      {onExport && (
        <button onClick={onExport} style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 12, fontWeight: 600, color: T.textMid, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <IcDownload size={14} color={T.textMid} /> Export
        </button>
      )}
      <button onClick={onAdd} style={{ padding: "8px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 3px 10px ${T.blue}33`, whiteSpace: "nowrap" }}>
        <IcPlus size={15} color="white" /> {addLabel}
      </button>
    </div>
  );
}

// Data table
function DataTable({ columns, data, onEdit, onDelete, emptyMsg = "No items found" }) {
  if (data.length === 0) {
    return (
      <div style={{ background: T.card, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "50px 20px", textAlign: "center" }}>
        <IcSearch size={32} color={T.borderLight} />
        <div style={{ fontSize: 14, fontWeight: 600, color: T.textMid, marginTop: 10 }}>{emptyMsg}</div>
        <div style={{ fontSize: 12, color: T.textLight, marginTop: 4 }}>Try changing your search or filters</div>
      </div>
    );
  }
  return (
    <div style={{ background: T.card, borderRadius: T.radius, border: `1px solid ${T.border}`, boxShadow: T.shadow, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key} style={{ textAlign: c.align || "left", padding: "12px 14px", fontSize: 11, fontWeight: 700, color: T.textLight, borderBottom: `2px solid ${T.border}`, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", minWidth: c.minW || "auto" }}>{c.label}</th>
              ))}
              <th style={{ width: 80, borderBottom: `2px solid ${T.border}`, padding: "12px 14px", fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={row.id || ri} style={{ borderBottom: `1px solid ${T.borderLight}` }}
                onMouseEnter={e => e.currentTarget.style.background = T.borderLight + "88"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {columns.map(c => (
                  <td key={c.key} style={{ padding: "12px 14px", color: T.text, ...(c.style || {}), textAlign: c.align || "left" }}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => onEdit(row)} style={{ background: T.blueSoft, border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
                      <IcEdit size={14} color={T.blue} />
                    </button>
                    <button onClick={() => onDelete(row.id)} style={{ background: T.redSoft, border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
                      <IcTrash size={14} color={T.red} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onSave, saveLabel = "Save" }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.borderLight}` }}>
      <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 13, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>Cancel</button>
      <button onClick={onSave} style={{ padding: "10px 24px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>{saveLabel}</button>
    </div>
  );
}

// ─── CSV UTILITIES ───────────────────────────────────────────────────
function csvEscape(val) {
  if (val == null) return "";
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCSV(headers, rows, filename) {
  const csv = [headers.map(csvEscape).join(","), ...rows.map(r => r.map(csvEscape).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate(headers, sampleRows, filename, instructions) {
  const lines = [];
  if (instructions) lines.push(csvEscape(instructions));
  lines.push(""); // blank line
  lines.push(headers.map(csvEscape).join(","));
  sampleRows.forEach(r => lines.push(r.map(csvEscape).join(",")));
  // Add 10 empty rows for user to fill
  for (let i = 0; i < 10; i++) lines.push(headers.map(() => "").join(","));
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  // Strip BOM character if present (Excel adds \uFEFF)
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter(l => l.trim());
  // Skip instruction rows (first rows that don't look like headers)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const cols = lines[i].split(",");
    if (cols.length >= 2 && cols[0].trim() && cols[1].trim()) { headerIdx = i; break; }
  }
  const headers = lines[headerIdx].split(",").map(h =>
    h.replace(/^\uFEFF/, "").replace(/^"|"$/g, "").replace(/""/g, '"').replace(/ \*/g, "").trim()
  );
  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map(v => v.replace(/^"|"$/g, "").replace(/""/g, '"').trim());
    if (vals.some(v => v)) rows.push(Object.fromEntries(headers.map((h, idx) => [h, vals[idx] || ""])));
  }
  return { headers, rows };
}

// ─── IMPORT / EXPORT MODAL ───────────────────────────────────────────
function ImportExportModal({ open, onClose, mode, sectionName, templateConfig, currentData, onImport }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState(1); // 1=template, 2=upload

  const resetAll = () => { setFile(null); setPreview(null); setResult(null); setStep(1); };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        setPreview(parsed);
      } catch { setPreview(null); }
    };
    reader.readAsText(f);
  };

  const doImport = async () => {
    if (!preview || !preview.rows.length) return;
    setImporting(true);
    try {
      const validRows = preview.rows.filter(r => {
        const firstKey = Object.keys(r)[0];
        return r[firstKey] && String(r[firstKey]).trim();
      });
      const importResult = await Promise.resolve(onImport(validRows));
      // onImport may return { inserted, skipped } from API, or nothing (client-only)
      const successCount = importResult?.inserted ?? validRows.length;
      const skippedCount = importResult?.skipped ?? (preview.rows.length - validRows.length);
      setResult({ success: successCount, skipped: skippedCount });
    } catch(e) {
      console.error("Import error:", e);
      setResult({ success: 0, skipped: preview.rows.length, error: e.message });
    }
    setImporting(false);
  };

  const doExport = () => {
    if (!templateConfig || !currentData) return;
    const { headers, mapRow, filename } = templateConfig;
    exportCSV(headers, currentData.map(mapRow), filename);
  };

  const doTemplate = () => {
    if (!templateConfig) return;
    const { headers, sampleRows, templateFilename, instructions } = templateConfig;
    downloadTemplate(headers, sampleRows, templateFilename, instructions);
  };

  if (!open) return null;

  const tc = templateConfig || {};

  return (
    <Modal open={open} onClose={() => { onClose(); resetAll(); }}
      title={mode === "import" ? `Import ${sectionName}` : `Export ${sectionName}`}
      desc={mode === "import" ? "Download template, fill your data, then upload" : "Download current data or blank template"}
      width={mode === "import" ? 660 : 520}>

      {mode === "export" ? (
        <div>
          {/* Export current data */}
          <div style={{ padding: "18px", borderRadius: 10, border: `1.5px solid ${T.border}`, marginBottom: 14, cursor: "pointer", transition: "all 0.15s" }}
            onClick={doExport}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.blue; e.currentTarget.style.background = T.blueSoft; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = "transparent"; }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: T.blueSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IcDownload size={20} color={T.blue} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Export Current Data</div>
                <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>Download all {currentData?.length || 0} {sectionName.toLowerCase()} as CSV file</div>
              </div>
            </div>
          </div>

          {/* Download template */}
          <div style={{ padding: "18px", borderRadius: 10, border: `1.5px solid ${T.border}`, cursor: "pointer", transition: "all 0.15s" }}
            onClick={doTemplate}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.green; e.currentTarget.style.background = T.greenSoft; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = "transparent"; }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: T.greenSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IcClipboard size={20} color={T.green} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Download Blank Template</div>
                <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>CSV template with headers, sample data and empty rows to fill</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: "12px 16px", background: T.borderLight, borderRadius: 8, fontSize: 12, color: T.textMid, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700 }}>Tip:</span> Download the template, fill in your data, then use Import to upload it back.
          </div>
        </div>
      ) : (
        <div>
          {/* ─── Step indicator ─── */}
          <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
            {[
              { n: 1, label: "Download Template" },
              { n: 2, label: "Upload & Import" },
            ].map((s, i) => (
              <div key={s.n} style={{ flex: 1, display: "flex", alignItems: "center", gap: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1 }} onClick={() => !result && setStep(s.n)}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: step === s.n ? T.blue : step > s.n ? T.green : T.borderLight,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: "white", flexShrink: 0,
                    transition: "all 0.2s",
                  }}>
                    {step > s.n ? <IcCheck size={14} color="white" strokeWidth={3} /> : s.n}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: step === s.n ? 700 : 500, color: step === s.n ? T.text : T.textLight }}>{s.label}</span>
                </div>
                {i === 0 && <div style={{ width: 40, height: 2, background: step > 1 ? T.green : T.border, margin: "0 4px", borderRadius: 2 }} />}
              </div>
            ))}
          </div>

          {/* ─── STEP 1: Template Download ─── */}
          {step === 1 && (
            <div>
              {/* Template card with big download button */}
              <div style={{ border: `2px solid ${T.blue}22`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ background: `linear-gradient(135deg, ${T.blue}08, ${T.blueSoft})`, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Sample Template — {sectionName}</div>
                    <div style={{ fontSize: 12, color: T.textLight, marginTop: 3 }}>{tc.instructions || "Fill in data and upload back"}</div>
                  </div>
                  <button onClick={doTemplate}
                    style={{
                      padding: "10px 22px", borderRadius: 8,
                      background: `linear-gradient(135deg, ${T.green}, #10B981)`,
                      color: "white", fontSize: 13, fontWeight: 700, border: "none",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                      boxShadow: `0 3px 12px ${T.green}44`, whiteSpace: "nowrap",
                      transition: "transform 0.1s",
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = "scale(0.96)"}
                    onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>
                    <IcDownload size={16} color="white" /> Download CSV
                  </button>
                </div>

                {/* Column preview */}
                <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                    Template Columns ({tc.headers?.length || 0})
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(tc.headers || []).map((h, i) => {
                      const isRequired = (tc.sampleRows?.[0]?.[i] !== undefined && tc.sampleRows?.[0]?.[i] !== "");
                      return (
                        <span key={h} style={{
                          fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                          background: isRequired ? T.blueSoft : T.borderLight,
                          color: isRequired ? T.blue : T.textMid,
                          border: `1px solid ${isRequired ? T.blue + "30" : T.border}`,
                        }}>
                          {h}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Sample data preview */}
                {tc.sampleRows && tc.sampleRows.length > 0 && (
                  <div style={{ padding: "0 20px 16px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                      Sample Data Preview
                    </div>
                    <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${T.border}` }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                        <thead>
                          <tr>
                            {(tc.headers || []).map(h => (
                              <th key={h} style={{ padding: "7px 10px", background: T.borderLight, fontWeight: 700, color: T.textMid, textAlign: "left", borderBottom: `1.5px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tc.sampleRows.map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                              {row.map((val, ci) => (
                                <td key={ci} style={{ padding: "6px 10px", color: T.textMid, fontStyle: "italic", whiteSpace: "nowrap", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{val}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: T.textLight }}>
                  Download template, fill your data in Excel/Sheets, save as CSV
                </div>
                <button onClick={() => setStep(2)}
                  style={{ padding: "10px 24px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  Next: Upload File <IcChevR size={14} color="white" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Upload & Import ─── */}
          {step === 2 && (
            <div>
              {/* Quick template link at top */}
              <div style={{ background: T.borderLight, borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, color: T.textMid }}>
                  Don't have a file yet?
                </div>
                <button onClick={() => setStep(1)}
                  style={{ fontSize: 12, fontWeight: 600, color: T.blue, background: T.blueSoft, border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <IcDownload size={13} color={T.blue} /> Get Template
                </button>
              </div>

              {/* Upload area */}
              <div style={{ border: `2px dashed ${file ? T.green : T.border}`, borderRadius: 12, padding: "32px 20px", textAlign: "center", marginBottom: 16, background: file ? T.greenSoft + "44" : "white", transition: "all 0.2s", cursor: "pointer", position: "relative" }}
                onClick={() => document.getElementById("csv-upload-input")?.click()}>
                <input id="csv-upload-input" type="file" accept=".csv,.txt" onChange={handleFile} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                {file ? (
                  <div>
                    <IcCheck size={30} color={T.green} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.green, marginTop: 8 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: T.textLight, marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB — Click to change file</div>
                  </div>
                ) : (
                  <div>
                    <IcUpload size={30} color={T.textLight} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: T.textMid, marginTop: 8 }}>Click to upload your CSV file</div>
                    <div style={{ fontSize: 12, color: T.textLight, marginTop: 4 }}>Supports .csv files — UTF-8 encoding recommended</div>
                  </div>
                )}
              </div>

              {/* Preview */}
              {preview && preview.rows.length > 0 && !result && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                      Preview — {preview.rows.filter(r => Object.values(r).some(v => v?.trim())).length} valid rows
                    </div>
                    <Badge text={`${preview.headers.length} columns detected`} color={T.blue} bg={T.blueSoft} />
                  </div>
                  <div style={{ overflowX: "auto", maxHeight: 180, border: `1px solid ${T.border}`, borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                      <thead>
                        <tr>{preview.headers.map(h => (
                          <th key={h} style={{ padding: "8px 10px", background: T.borderLight, fontWeight: 700, color: T.textMid, textAlign: "left", borderBottom: `2px solid ${T.border}`, whiteSpace: "nowrap", position: "sticky", top: 0 }}>{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 6).map((r, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                            {preview.headers.map(h => <td key={h} style={{ padding: "6px 10px", color: r[h] ? T.text : T.textLight, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r[h] || "—"}</td>)}
                          </tr>
                        ))}
                        {preview.rows.length > 6 && (
                          <tr><td colSpan={preview.headers.length} style={{ padding: "8px 10px", textAlign: "center", color: T.textLight, fontSize: 11, fontStyle: "italic" }}>...and {preview.rows.length - 6} more rows</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Success result */}
              {result && (
                <div style={{ background: T.greenSoft, borderRadius: 10, padding: "16px 18px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <IcCheck size={18} color="white" strokeWidth={3} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>Import Successful!</div>
                    <div style={{ fontSize: 12.5, color: T.textMid, marginTop: 2 }}>
                      {result.success} items imported
                      {result.skipped > 0 && <span> — {result.skipped} empty rows skipped</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
                <button onClick={() => { if (result) { onClose(); resetAll(); } else setStep(1); }}
                  style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 13, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>
                  {result ? "Done" : "Back"}
                </button>
                {!result && (
                  <button onClick={doImport} disabled={!preview || !preview.rows.length || importing}
                    style={{
                      padding: "10px 24px", borderRadius: 8,
                      background: (!preview || importing) ? T.textLight : `linear-gradient(135deg, ${T.green}, #10B981)`,
                      color: "white", fontSize: 13, fontWeight: 700, border: "none",
                      cursor: (!preview || importing) ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                      boxShadow: (preview && !importing) ? `0 3px 12px ${T.green}33` : "none",
                    }}>
                    {importing ? "Importing..." : <><IcUpload size={15} color="white" /> Import {preview?.rows.filter(r => Object.values(r).some(v => v?.trim())).length || 0} Items</>}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── ENHANCED TOOLBAR with import/export modals ──────────────────────
function ToolbarWithIO({ search, setSearch, count, label, onAdd, addLabel, filterEl, templateConfig, currentData, onImportData }) {
  const [ioMode, setIoMode] = useState(null); // "import" | "export" | null
  return (
    <>
      <div style={{ background: T.card, borderRadius: T.radius, padding: "14px 18px", marginBottom: 16, boxShadow: T.shadow, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", border: `1px solid ${T.border}` }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <IcSearch size={15} color={T.textLight} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${label}...`}
            style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: T.bg, outline: "none", boxSizing: "border-box", fontFamily: T.font }}
            onFocus={e => e.target.style.borderColor = T.blue}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>
        <Badge text={`${count} items`} color={T.textMid} bg={T.borderLight} />
        {filterEl}
        <button onClick={() => setIoMode("import")} style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${T.green}`, background: T.greenSoft, fontSize: 12, fontWeight: 600, color: T.green, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <IcUpload size={14} color={T.green} /> Import CSV
        </button>
        <button onClick={() => setIoMode("export")} style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 12, fontWeight: 600, color: T.textMid, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <IcDownload size={14} color={T.textMid} /> Export
        </button>
        <button onClick={onAdd} style={{ padding: "8px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 3px 10px ${T.blue}33`, whiteSpace: "nowrap" }}>
          <IcPlus size={15} color="white" /> {addLabel}
        </button>
      </div>
      <ImportExportModal open={!!ioMode} onClose={() => setIoMode(null)} mode={ioMode || "export"}
        sectionName={label} templateConfig={templateConfig} currentData={currentData} onImport={onImportData} />
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// 1. MATERIAL CATEGORY — LIST VIEW
// ═══════════════════════════════════════════════════════════════════════

// ── Generic hook for all library sections ────────────────────────────
function useSection(endpoint) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/library/" + endpoint);
      if (res.success) setItems(res.data);
    } catch(e) {}
    setLoading(false);
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const save = async (form, editingId) => {
    let res;
    if (editingId) {
      res = await api.put("/library/" + endpoint + "/" + editingId, form);
    } else {
      res = await api.post("/library/" + endpoint, form);
    }
    if (res.success) {
      if (editingId) setItems(p => p.map(x => x.id === editingId ? res.data : x));
      else setItems(p => [res.data, ...p]);
    }
    return res;
  };

  const del = async (id) => {
    const res = await api.del("/library/" + endpoint + "/" + id);
    if (res.success) setItems(p => p.filter(x => x.id !== id));
    return res;
  };

  return { items, setItems, loading, reload: load, save, del };
}

function MaterialCategorySection() {
  const { items: cats, loading, save: apiSave, del: apiDel, reload } = useSection("material-categories");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const filtered = cats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.code||"").toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setForm({ name: "", code: "", description: "" }); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, code: c.code||"", description: c.description||"" }); setShowModal(true); };
  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await apiSave({ name: form.name, code: form.code, description: form.description }, editing?.id);
    setSaving(false);
    if (res.success) setShowModal(false);
    else alert(res.message || "Save failed");
  };
  const del = (id) => apiDel(id);

  const templateConfig = {
    headers: ["Category Name", "Code", "Description"],
    sampleRows: [
      ["Cement & Binding", "CEM", "All types of cement, putty, adhesives"],
      ["Steel & Rebar", "STL", "TMT bars, binding wire, steel plates"],
      ["Sand & Aggregates", "SND", "River sand, m-sand, gravel, rubble"],
    ],
    filename: "gb_material_categories_export.csv",
    templateFilename: "gb_template_material_categories.csv",
    instructions: "Instructions: Fill Category Name (required) and Code (required). Description is optional. Delete sample rows before importing.",
    mapRow: (c) => [c.name, c.code, c.desc],
  };

  const handleImport = async (rows) => {
    const mapped = rows.map(r => ({
      name:        (r["Category Name"] || r["name"] || "").trim(),
      code:        (r["Code"]          || r["code"] || "").trim(),
      description: (r["Description"]   || r["desc"] || "").trim(),
    })).filter(r => r.name);
    const res = await api.post("/library/material-categories/bulk", { rows: mapped });
    if (res.success) await reload();
    return res.data; // { inserted, skipped }
  };

  const columns = [
    { key: "code", label: "Code", minW: 80, render: r => <code style={{ fontSize: 12, fontWeight: 600, color: T.blue, background: T.blueSoft, padding: "2px 10px", borderRadius: 4 }}>{r.code}</code> },
    { key: "name", label: "Category Name", minW: 200, render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: "description", label: "Description", minW: 280, style: { fontSize: 12.5, color: T.textMid } },
    { key: "item_count", label: "Materials", minW: 90, align: "center", render: r => <Badge text={`${r.item_count||0} items`} color={(r.item_count||0) > 0 ? T.blue : T.textLight} bg={(r.item_count||0) > 0 ? T.blueSoft : T.borderLight} /> },
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="categories" onAdd={openCreate} addLabel="Add Category"
        templateConfig={templateConfig} currentData={cats} onImportData={handleImport} />
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} emptyMsg="No categories found" />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Category" : "Add Category"} width={460}>
        <FormField label="Category Name" value={form.name} onChange={v => upd("name", v)} placeholder="e.g. Cement & Binding" required />
        <div style={{ height: 14 }} />
        <FormField label="Code (Short)" value={form.code} onChange={v => upd("code", v.toUpperCase())} placeholder="e.g. CEM" />
        <div style={{ height: 14 }} />
        <FormTextarea label="Description" value={form.description||""} onChange={v => upd("description", v)} placeholder="What materials fall under this category?" rows={2} />
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={saving ? "Saving..." : editing ? "Update" : "Create"} />
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 2. MATERIAL MASTER
// ═══════════════════════════════════════════════════════════════════════
function MaterialMasterSection() {
  const { items: materials, loading, save: apiSave, del: apiDel, reload } = useSection("materials");
  const { items: matCats } = useSection("material-categories");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = { name: "", code: "", category: "", unit: "Kg", hsnCode: "", gstRate: 18, baseRate: 0, lastRate: 0, supplier: "", minStock: 0 };
  const [form, setForm] = useState(emptyForm);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Use real categories from backend, fallback to empty
  const catNames = matCats.map(c => c.name);
  const allCats = ["All", ...catNames];
  const units = ["Kg", "Bag (50kg)", "CFT", "Sq.Ft", "Piece", "Meter", "Litre", "Sheet (8x4)", "Quintal", "MT", "Running Ft", "Brass", "Bundle", "Nos"];

  const filtered = materials.filter(m => {
    const cat = m.category || m.category_name || "";
    if (filterCat !== "All" && cat !== filterCat) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !(m.code||"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, category: catNames[0] || "", code: "MAT-" + String(materials.length + 1).padStart(3, "0") });
    setShowModal(true);
  };
  const openEdit = (m) => {
    setEditing(m);
    setForm({
      name: m.name || "", code: m.code || "", category: m.category_name || m.category || "",
      unit: m.unit || "Kg", hsnCode: m.hsn_code || m.hsnCode || "",
      gstRate: m.gst_rate ?? m.gstRate ?? 18,
      baseRate: m.base_rate ?? m.baseRate ?? 0,
      lastRate: m.last_rate ?? m.lastRate ?? 0,
      supplier: m.preferred_supplier || m.supplier || "",
      minStock: m.min_stock ?? m.minStock ?? 0,
    });
    setShowModal(true);
  };
  const save = async () => {
    if (!form.name.trim()) return alert("Material name required");
    setSaving(true);
    // Find category_id from matCats
    const catObj = matCats.find(c => c.name === form.category);
    const payload = {
      name: form.name.trim(),
      code: form.code,
      category_id: catObj ? catObj.id : null,
      unit: form.unit,
      hsn_code: form.hsnCode,
      gst_rate: form.gstRate,
      base_rate: form.baseRate,
      last_rate: form.lastRate,
      preferred_supplier: form.supplier,
      min_stock: form.minStock,
    };
    const res = await apiSave(payload, editing?.id);
    setSaving(false);
    if (res.success) { setShowModal(false); }
    else alert(res.message || "Save failed");
  };
  const del = async (id) => { await apiDel(id); };

  const matTemplateConfig = {
    headers: ["Material Name", "Code", "Category", "Unit", "HSN Code", "GST Rate %", "Base Rate (Rs.)", "Last Purchase Rate", "Preferred Supplier", "Min Stock Level", "Current Stock"],
    sampleRows: [
      ["OPC Cement 53 Grade", "MAT-001", "Cement & Binding", "Bag (50kg)", "2523", "28", "380", "385", "UltraTech", "100", "450"],
      ["TMT Steel Bar 12mm Fe500D", "MAT-002", "Steel & Rebar", "Kg", "7214", "18", "62", "64", "Tata Tiscon", "5000", "12000"],
      ["River Sand (Fine)", "MAT-003", "Sand & Aggregates", "CFT", "2505", "5", "45", "48", "Local Supplier", "500", "1200"],
    ],
    filename: "gb_materials_export.csv",
    templateFilename: "gb_template_materials.csv",
    instructions: "Instructions: Fill Material Name (required), Category (required), Unit (required), Base Rate (required). GST Rate: 0, 5, 12, 18, or 28.",
    mapRow: (m) => [m.name, m.code, m.category, m.unit, m.hsnCode, m.gstRate, m.baseRate, m.lastRate, m.supplier, m.minStock, m.currentStock],
  };
  const handleMatImport = async (rows) => {
    const mapped = rows.map(r => ({
      name:        (r["Material Name"] || "").trim(),
      code:        (r["Code"] || "").trim(),
      category:    (r["Category"] || "").trim(),
      unit:        (r["Unit"] || "Kg").trim(),
      hsn_code:    (r["HSN Code"] || "").trim(),
      gst_rate:    parseFloat(r["GST Rate %"]) || 18,
      base_rate:   parseFloat(r["Base Rate (Rs.)"]) || 0,
      last_rate:   parseFloat(r["Last Purchase Rate"]) || 0,
      min_stock:   parseInt(r["Min Stock Level"]) || 0,
    })).filter(m => m.name);
    const res = await api.post("/library/materials/bulk", { rows: mapped });
    if (res.success) await reload();
    return res.data;
  };

  const columns = [
    { key: "code", label: "Code", minW: 80, render: r => <code style={{ fontSize: 12, fontWeight: 600, color: T.blue, background: T.blueSoft, padding: "2px 8px", borderRadius: 4 }}>{r.code}</code> },
    { key: "name", label: "Material Name", minW: 180, render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: "category", label: "Category", minW: 110, render: r => <Badge text={r.category} color={T.textMid} bg={T.borderLight} /> },
    { key: "unit", label: "Unit", minW: 80 },
    { key: "hsnCode", label: "HSN", minW: 60, render: r => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{r.hsnCode}</span> },
    { key: "gstRate", label: "GST", minW: 50, align: "center", render: r => <span style={{ fontWeight: 600, fontSize: 12 }}>{r.gstRate}%</span> },
    { key: "baseRate", label: "Base Rate", minW: 80, align: "right", render: r => <span style={{ fontWeight: 700, color: T.text }}>Rs.{r.baseRate}</span> },
    { key: "lastRate", label: "Last Rate", minW: 80, align: "right", render: r => <span style={{ fontWeight: 600, color: r.lastRate > r.baseRate ? T.red : T.green }}>Rs.{r.lastRate}</span> },
    { key: "currentStock", label: "Stock", minW: 70, align: "right", render: r => (
      <span style={{ fontWeight: 600, color: r.currentStock <= r.minStock ? T.red : T.text }}>
        {(r.currentStock||0).toLocaleString()}
        {r.currentStock <= r.minStock && <span style={{ fontSize: 10, color: T.red, marginLeft: 4 }}>LOW</span>}
      </span>
    )},
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="materials" onAdd={openCreate} addLabel="Add Material"
        templateConfig={matTemplateConfig} currentData={materials} onImportData={handleMatImport}
        filterEl={
          <div style={{ minWidth: 180 }}>
            <SearchSelect value={filterCat} options={allCats} onChange={setFilterCat} placeholder="Filter category..."/>
          </div>
        }
      />
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Material" : "Add Material"} desc="Enter material details, rates, and stock info" width={640}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Material Name" value={form.name} onChange={v => upd("name", v)} placeholder="e.g. OPC Cement 53 Grade" half required />
          <FormField label="Code" value={form.code} onChange={v => upd("code", v)} placeholder="MAT-001" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label="Category" value={form.category} onChange={v => upd("category", v)} options={catNames} half required />
          <FormSelect label="Unit" value={form.unit} onChange={v => upd("unit", v)} options={units} half required />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="HSN Code" value={form.hsnCode} onChange={v => upd("hsnCode", v)} placeholder="e.g. 2523" half />
          <FormSelect label="GST Rate" value={String(form.gstRate)} onChange={v => upd("gstRate", parseInt(v))} options={[{value:"0",label:"0%"},{value:"5",label:"5%"},{value:"12",label:"12%"},{value:"18",label:"18%"},{value:"28",label:"28%"}]} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Base Rate (Rs.)" value={form.baseRate || ""} onChange={v => upd("baseRate", parseFloat(v) || 0)} type="number" half required />
          <FormField label="Last Purchase Rate (Rs.)" value={form.lastRate || ""} onChange={v => upd("lastRate", parseFloat(v) || 0)} type="number" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Preferred Supplier" value={form.supplier} onChange={v => upd("supplier", v)} placeholder="Supplier name" half />
          <FormField label="Minimum Stock Level" value={form.minStock || ""} onChange={v => upd("minStock", parseInt(v) || 0)} type="number" half />
        </div>
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={saving ? "Saving..." : editing ? "Update Material" : "Add Material"} />
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 3. PARTY / SUPPLIER MASTER
// ═══════════════════════════════════════════════════════════════════════
function PartyMasterSection() {
  const [parties, setParties] = useState([]);
  const [partyLoading, setPartyLoading] = useState(true);

  const loadParties = useCallback(async () => {
    setPartyLoading(true);
    try {
      const res = await api.get("/finance/parties");
      if (res.success) setParties(res.data || []);
    } catch(e) {}
    setPartyLoading(false);
  }, []);

  useEffect(() => { loadParties(); }, [loadParties]);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = { name: "", type: "Material Vendor", gstin: "", pan: "", phone: "", email: "", address: "", city: "Raipur", opening_balance: 0, staff_subtype: "", designation: "", wallet_limit: "", negative_limit: "" };
  const [form, setForm] = useState(emptyForm);
  const [saveErr, setSaveErr] = useState("");
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // "Material Vendor" is the canonical UI label. We still recognise legacy
  // values ("Supplier" / "Material Supplier") so existing parties show up
  // under the same chip without needing a DB migration. "Staff" is new —
  // app users get a staff-party automatically; this is for off-app casual staff.
  const types = ["All", "Material Vendor", "Client", "Subcontractor", "Labour Vendor", "Transporter", "Consultant", "Staff"];
  const typeColors = { "Material Vendor": { c: T.blue, bg: T.blueSoft }, Supplier: { c: T.blue, bg: T.blueSoft }, "Material Supplier": { c: T.blue, bg: T.blueSoft }, Client: { c: T.green, bg: T.greenSoft }, Subcontractor: { c: T.purple, bg: T.purpleSoft }, "Labour Vendor": { c: T.amber, bg: T.amberSoft }, Transporter: { c: T.amber, bg: T.amberSoft }, Consultant: { c: T.teal, bg: T.tealSoft }, Staff: { c: T.teal, bg: T.tealSoft }, staff: { c: T.teal, bg: T.tealSoft } };
  const isStaffForm = form.type === "Staff";
  // Map any legacy supplier-like value to the new canonical chip
  const SUPPLIER_LIKE = new Set(["supplier", "material supplier", "material vendor", "vendor", "other vendor"]);

  const filtered = parties.filter(p => {
    const ptype = (p.type || "").toLowerCase();
    if (filterType === "Material Vendor") {
      if (!SUPPLIER_LIKE.has(ptype)) return false;
    } else if (filterType === "Staff") {
      if (!p.is_staff) return false;
    } else if (filterType !== "All" && ptype !== filterType.toLowerCase()) return false;
    const s = search.toLowerCase();
    if (s && !p.name?.toLowerCase().includes(s) && !(p.phone||"").includes(s) && !(p.city||"").toLowerCase().includes(s)) return false;
    return true;
  });

  const openCreate = () => { setEditing(null); setSaveErr(""); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (p) => {
    setEditing(p); setSaveErr("");
    setForm({
      name: p.name||"", type: p.is_staff ? "Staff" : (p.type||"Material Vendor"),
      gstin: p.gstin||"", pan: p.pan||"", phone: p.phone||"", email: p.email||"",
      address: p.address||"", city: p.city||"", opening_balance: p.opening_balance||0,
      staff_subtype: p.staff_subtype||"", designation: p.designation||"",
      wallet_limit: p.wallet_limit ?? "", negative_limit: p.negative_limit ?? "",
    });
    setShowModal(true);
  };

  // Linked staff = a staff-party attached to a user account. Identity
  // fields (name/phone/email) are locked — edited via Settings → Users.
  const editingLinkedStaff = !!(editing && editing.is_staff && editing.is_linked);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true); setSaveErr("");
    try {
      // Build payload — staff parties send is_staff + staff fields.
      let payload;
      if (form.type === "Staff") {
        payload = {
          name: form.name, is_staff: true,
          staff_subtype: form.staff_subtype || null,
          designation: form.designation || null,
          phone: form.phone || null, email: form.email || null,
          address: form.address || null, city: form.city || null,
          wallet_limit: form.wallet_limit === "" ? null : Number(form.wallet_limit),
          negative_limit: form.negative_limit === "" ? null : Number(form.negative_limit),
        };
      } else {
        payload = { ...form };
        delete payload.staff_subtype; delete payload.designation;
        delete payload.wallet_limit; delete payload.negative_limit;
      }
      if (editing) {
        const res = await api.put("/finance/parties/" + editing.id, payload);
        if (res.success) setParties(prev => prev.map(p => p.id === editing.id ? { ...p, ...res.data } : p));
        else { setSaveErr(res.message || "Save failed"); setSaving(false); return; }
      } else {
        const res = await api.post("/finance/parties", payload);
        if (res.success) {
          setParties(prev => [res.data, ...prev]);
          if (res.data?.is_staff) window.alert("Staff party banayi gayi — wallet ready hai");
        } else {
          // Inline error — duplicate_staff_party gets a friendlier line
          setSaveErr(res.code === "duplicate_staff_party"
            ? "Is naam ka staff already exist karta hai. Edit karein ya alag naam dein."
            : (res.message || "Save failed"));
          setSaving(false); return;
        }
      }
      setShowModal(false);
    } catch(e) { setSaveErr("Save failed"); }
    setSaving(false);
  };

  const del = async (id) => {
    const res = await api.del("/finance/parties/" + id);
    if (res && res.success === false) {
      window.alert(res.message || "Delete nahi hua");
      return;
    }
    setParties(prev => prev.filter(p => p.id !== id));
  };

  const partyTemplateConfig = {
    headers: ["Party Name", "Type", "Phone", "Email", "GSTIN", "City"],
    sampleRows: [
      ["UltraTech Cement Ltd", "Supplier", "+91 98765 10001", "rajesh@ultratech.com", "22AABCU1234F1Z5", "Raipur"],
      ["Shree Hari Developers", "Client", "+91 98765 00000", "client@email.com", "", "Nashik"],
    ],
    filename: "gb_parties_export.csv",
    templateFilename: "gb_template_parties.csv",
    instructions: "Type must be: Supplier, Client, Subcontractor, Transporter, or Consultant. Party Name and Type are required.",
    mapRow: (p) => [p.name, p.type, p.phone, p.email, p.gstin, p.city],
  };

  const handlePartyImport = async (rows) => {
    const mapped = rows.map(r => ({
      name:  (r["Party Name"] || "").trim(),
      type:  (r["Type"] || "Supplier").trim(),
      phone: (r["Phone"] || "").trim(),
      email: (r["Email"] || "").trim(),
      gstin: (r["GSTIN"] || "").trim(),
      city:  (r["City"] || "").trim(),
      opening_balance: 0,
    })).filter(p => p.name);
    const res = await api.post("/finance/parties/bulk", { rows: mapped });
    if (res.success) await loadParties();
    return res.data;
  };

  const columns = [
    { key: "name", label: "Party Name", minW: 200, render: r => (
      <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600 }}>{r.name}</span>
        {r.is_staff ? <Badge text="Staff" color={T.teal} bg={T.tealSoft} /> : null}
        {r.is_staff && r.is_linked ? (
          <span title={r.user_is_active === 0 ? "User deactivated" : "Linked to user account"}
            style={{ fontSize: 10.5, fontWeight: 600, padding: "1px 6px", borderRadius: 10,
              background: r.user_is_active === 0 ? T.borderLight : T.blueSoft,
              color: r.user_is_active === 0 ? T.textLight : T.blue }}>
            🔗 {r.user_is_active === 0 ? "User off" : "Linked"}
          </span>
        ) : null}
      </span>
    )},
    { key: "type", label: "Type", minW: 100, render: r => {
      const label = r.is_staff ? "Staff" : (r.type || "—");
      const tc = typeColors[label] || typeColors[r.type] || { c: T.textMid, bg: T.borderLight };
      return <Badge text={label} color={tc.c} bg={tc.bg} />;
    }},
    { key: "phone", label: "Phone", minW: 130, style: { fontFamily: "monospace", fontSize: 12 } },
    { key: "city", label: "City", minW: 80 },
    { key: "gstin", label: "GSTIN", minW: 140, render: r => r.gstin ? <span style={{ fontFamily: "monospace", fontSize: 11.5 }}>{r.gstin}</span> : <span style={{ color: T.textLight }}>—</span> },
    { key: "opening_balance", label: "Balance", minW: 100, align: "right", render: r => {
      const bal = Number(r.opening_balance) || 0;
      return <span style={{ fontWeight: 700, color: bal > 0 ? T.green : bal < 0 ? T.red : T.textMid }}>
        {bal !== 0 ? `${bal > 0 ? "+" : ""}Rs.${Math.abs(bal).toLocaleString()}` : "—"}
      </span>;
    }},
    { key: "rating", label: "Rating", minW: 60, align: "center", render: r => r.rating > 0 ? (
      <div style={{ display: "flex", gap: 1, justifyContent: "center" }}>{[1,2,3,4,5].map(i => <IcStar key={i} size={12} color={i <= r.rating ? T.amber : T.borderLight} fill={i <= r.rating ? T.amber : "none"} strokeWidth={0} />)}</div>
    ) : <span style={{ color: T.textLight, fontSize: 11 }}>N/A</span> },
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="parties" onAdd={openCreate} addLabel="Add Party"
        templateConfig={partyTemplateConfig} currentData={parties} onImportData={handlePartyImport}
        filterEl={<div style={{minWidth:180}}><SearchSelect value={filterType} options={types} onChange={setFilterType} placeholder="Filter type..."/></div>}
      />
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Party" : "Add Party"} desc="Party / supplier / client / staff details" width={660}>
        {saveErr ? (
          <div style={{ background: T.redSoft, border: `1px solid ${T.red}55`, color: T.red, fontSize: 12.5, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>{saveErr}</div>
        ) : null}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Party Name" value={form.name} onChange={v => upd("name", v)} placeholder="Full legal name" half required disabled={editingLinkedStaff} />
          <FormSelect label="Type" value={form.type} onChange={v => upd("type", v)} options={types.filter(t => t !== "All")} half required disabled={!!editing} />
        </div>
        {editingLinkedStaff ? (
          <div style={{ fontSize: 11, color: T.textMid, marginTop: -8, marginBottom: 12 }}>
            Naam / phone / email linked staff pe yahan se nahi badalte — <b>Settings → Users</b> me edit karein.
          </div>
        ) : null}

        {isStaffForm ? (
          /* ── STAFF FIELDS ── */
          <>
            {!editing ? (
              <div style={{ fontSize: 11.5, color: T.textMid, background: T.tealSoft, padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>
                App users ko staff-party automatic milti hai. Yahan sirf <b>off-app casual staff</b> add karein.
              </div>
            ) : null}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>Staff Subtype <span style={{ color: T.red }}>*</span></div>
              <div style={{ display: "flex", gap: 10 }}>
                {[{ v: "office", l: "Office Staff (salaried)" }, { v: "wages", l: "Daily Wages Worker" }].map(o => (
                  <button key={o.v} type="button" onClick={() => upd("staff_subtype", o.v)}
                    style={{ flex: 1, padding: "9px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                      border: `1.5px solid ${form.staff_subtype === o.v ? T.teal : T.borderLight}`,
                      background: form.staff_subtype === o.v ? T.tealSoft : "#fff",
                      color: form.staff_subtype === o.v ? T.teal : T.textMid }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
              <FormField label="Designation" value={form.designation} onChange={v => upd("designation", v)} placeholder='e.g. "Site Supervisor", "Mason", "Helper"' half />
              <FormField label="Phone" value={form.phone} onChange={v => upd("phone", v)} placeholder="+91 XXXXX XXXXX" half disabled={editingLinkedStaff} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
              <FormField label="Wallet Limit (₹)" value={form.wallet_limit} onChange={v => upd("wallet_limit", v)} placeholder="e.g. 5000" half />
              <FormField label="Negative Limit Allowed (₹)" value={form.negative_limit} onChange={v => upd("negative_limit", v)} placeholder="e.g. 2000" half />
            </div>
            <FormField label="Address" value={form.address || ""} onChange={v => upd("address", v)} placeholder="Full address" />
            <div style={{ height: 14 }} />
            <FormField label="City" value={form.city} onChange={v => upd("city", v)} />
          </>
        ) : (
        /* ── NON-STAFF FIELDS (unchanged) ── */
        <>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Contact Person" value={form.contact} onChange={v => upd("contact", v)} placeholder="Name" half />
          <FormField label="Phone" value={form.phone} onChange={v => upd("phone", v)} placeholder="+91 XXXXX XXXXX" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Email" value={form.email} onChange={v => upd("email", v)} placeholder="email@company.com" half />
          <FormField label="Category / Trade" value={form.category} onChange={v => upd("category", v)} placeholder="e.g. Cement, Electrical" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="GSTIN" value={form.gstin} onChange={v => upd("gstin", v)} placeholder="22AABC..." half />
          <FormField label="PAN" value={form.pan || ""} onChange={v => upd("pan", v)} placeholder="AABC..." half />
        </div>
        <FormField label="Address" value={form.address || ""} onChange={v => upd("address", v)} placeholder="Full address" />
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="City" value={form.city} onChange={v => upd("city", v)} half />
          <FormField label="Pincode" value={form.pincode || ""} onChange={v => upd("pincode", v)} half />
        </div>
        {/* Payment terms */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label="Credit Days" value={String(form.credit_days ?? 7)} onChange={v => upd("credit_days", parseInt(v) || 7)} options={["7","15","30","45","60","90"]} half />
          <div style={{ flex: 1, minWidth: 220, fontSize: 11.5, color: T.textMid, alignSelf: "flex-end", paddingBottom: 6 }}>
            Bills se payment due date <b>credit days ke baad</b> auto-set hota hai. Override at billing.
          </div>
        </div>
        {/* Bank details section */}
        <div style={{ padding: "12px 0 4px", fontSize: 13, fontWeight: 700, color: T.text, borderTop: `1px solid ${T.borderLight}`, marginTop: 4 }}>Bank Details (for payment)</div>
        <div style={{ height: 10 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Bank Name" value={form.bank_name || ""} onChange={v => upd("bank_name", v)} placeholder="e.g. SBI" half />
          <FormField label="Account No." value={form.acc_no || ""} onChange={v => upd("acc_no", v)} placeholder="Account number" half />
        </div>
        <FormField label="IFSC Code" value={form.ifsc || ""} onChange={v => upd("ifsc", v)} placeholder="e.g. SBIN0005678" />
        </>
        )}
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={editing ? "Update Party" : (isStaffForm ? "Add Staff" : "Add Party")} />
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 4. WORK CATEGORY
// ═══════════════════════════════════════════════════════════════════════
function WorkCategorySection() {
  // Work Category is a SCOPING label only (e.g. "Civil", "Electrical").
  // Unit + rate live on the BOQ Item Library rows that reference the
  // category by name. The category itself is just a string id, so the
  // form has been trimmed to Name + Code + Description.
  //
  // The `unit` / `base_rate` columns still exist on the work_categories
  // table from earlier schema; we just don't expose them in the UI. The
  // backend POST/PUT still accept them and will write 0 / "" defaults
  // from this client — safe for any legacy code that reads them.
  const { items: cats, loading, save: apiSave, del: apiDel, reload } = useSection("work-categories");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", desc: "" });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const filtered = cats.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.code||"").toLowerCase().includes(search.toLowerCase())
  );
  const openCreate = () => { setEditing(null); setForm({ name: "", code: "", desc: "" }); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, code: c.code||"", desc: c.description||c.desc||"" }); setShowModal(true); };
  const save = async () => {
    if (!form.name.trim()) return alert("Work category name required");
    setSaving(true);
    // Send empty unit / 0 rate to keep backend payload shape stable.
    const res = await apiSave({
      name:        form.name.trim(),
      code:        form.code,
      description: form.desc,
      unit:        "",
      rate:        0,
    }, editing?.id);
    setSaving(false);
    if (res.success) setShowModal(false);
    else alert(res.message || "Save failed");
  };
  const del = (id) => apiDel(id);

  const workTemplateConfig = {
    headers: ["Work Category Name", "Code", "Description"],
    sampleRows: [
      ["Excavation & Earthwork", "EXC", "Foundation digging, trenching"],
      ["RCC Work",               "RCC", "Footings, columns, beams, slabs"],
    ],
    filename: "gb_work_categories_export.csv",
    templateFilename: "gb_template_work_categories.csv",
    instructions: "Instructions: Name required. Code is a short uppercase ID (e.g. RCC, EXC). Description is the scope of work this category covers.",
    mapRow: (c) => [c.name, c.code, c.description || c.desc],
  };
  const handleWorkImport = async (rows) => {
    const mapped = rows.map(r => ({
      name:        (r["Work Category Name"] || "").trim(),
      code:        (r["Code"] || "").trim(),
      description: (r["Description"] || "").trim(),
      unit:        "",
      rate:        0,
    })).filter(c => c.name);
    const res = await api.post("/library/work-categories/bulk", { rows: mapped });
    if (res.success) await reload();
    return res.data;
  };

  const columns = [
    { key: "code", label: "Code", minW: 70, render: r => r.code
        ? <code style={{ fontSize: 12, fontWeight: 600, color: T.purple, background: T.purpleSoft, padding: "2px 8px", borderRadius: 4 }}>{r.code}</code>
        : <span style={{ color: T.textLight }}>—</span> },
    { key: "name",        label: "Work Category", minW: 180, render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: "description", label: "Description",   minW: 260, render: r => <span style={{ fontSize: 12, color: T.textMid }}>{r.description || r.desc || "—"}</span> },
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="work categories" onAdd={openCreate} addLabel="Add Work Category"
        templateConfig={workTemplateConfig} currentData={cats} onImportData={handleWorkImport} />
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Work Category" : "Add Work Category"} width={520}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Work Category Name" value={form.name} onChange={v => upd("name", v)} placeholder="e.g. RCC Work" half required />
          <FormField label="Code" value={form.code} onChange={v => upd("code", v.toUpperCase())} placeholder="e.g. RCC" half />
        </div>
        <FormTextarea label="Description" value={form.desc} onChange={v => upd("desc", v)} placeholder="What work is included?" rows={2} />
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={saving ? "Saving..." : editing ? "Update" : "Create"} />
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 5. SUBCONTRACTOR MASTER
// ═══════════════════════════════════════════════════════════════════════
function SubcontractorSection() {
  const { items: subcons, loading, save: apiSave, del: apiDel, reload } = useSection("subcontractors");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { name: "", owner: "", trade: "RCC & Civil", phone: "", city: "Raipur", gstin: "", pan: "", address: "", labour_strength: 0, status: "Active" };
  const [form, setForm] = useState(emptyForm);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const filtered = subcons.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || (s.trade||"").toLowerCase().includes(search.toLowerCase()) || (s.owner||"").toLowerCase().includes(search.toLowerCase()));
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ ...emptyForm, ...s, labour_strength: s.labour_strength||0, rate_type: s.rate_type||"Sq.Ft", bank_name: s.bank_name||"", acc_no: s.acc_no||"" }); setShowModal(true); };
  const save = async () => { if (!form.name.trim()) return; await apiSave(form, editing?.id); setShowModal(false); };
  const del = (id) => apiDel(id);

  const columns = [
    { key: "name", label: "Firm Name", minW: 150, render: r => (<div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11, color: T.textLight }}>{r.owner}</div></div>) },
    { key: "trade", label: "Trade", minW: 110, render: r => <Badge text={r.trade} color={T.purple} bg={T.purpleSoft} /> },
    { key: "phone", label: "Phone", minW: 120, style: { fontFamily: "monospace", fontSize: 12 } },
    { key: "description", label: "City/Area", minW: 70, render: r => <span>{r.description||r.city||"—"}</span> },
    { key: "labour_strength", label: "Labour", minW: 60, align: "center", render: r => <span style={{ fontWeight: 600 }}>{r.labour_strength}</span> },
    { key: "rate", label: "Rate", minW: 100, align: "right", render: r => <span style={{ fontWeight: 700, color: T.text }}>Rs.{r.rate}/{r.rateType}</span> },
    { key: "activeProjects", label: "Projects", minW: 60, align: "center", render: r => <Badge text={r.activeProjects} color={r.activeProjects > 0 ? T.green : T.textLight} bg={r.activeProjects > 0 ? T.greenSoft : T.borderLight} /> },
    { key: "rating", label: "Rating", minW: 70, align: "center", render: r => r.rating > 0 ? <div style={{ display: "flex", gap: 1, justifyContent: "center" }}>{[1,2,3,4,5].map(i => <IcStar key={i} size={11} color={i <= r.rating ? T.amber : T.borderLight} fill={i <= r.rating ? T.amber : "none"} strokeWidth={0} />)}</div> : "—" },
    { key: "status", label: "Status", minW: 70, render: r => <Badge text={r.status} color={r.status === "Active" ? T.green : T.red} bg={r.status === "Active" ? T.greenSoft : T.redSoft} /> },
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="subcontractors" onAdd={openCreate} addLabel="Add Subcontractor"
        templateConfig={{
          headers: ["Firm Name","Owner/Contact","Trade","Phone","City","GSTIN","Labour Strength","Rate Unit","Rate (Rs.)"],
          sampleRows: [
            ["Raj Construction","Rajendra Yadav","RCC & Civil","+91 98765 40001","Raipur","22AABCR1111A1Z1","35","Sq.Ft","22"],
            ["Sahu Electricals","Mohan Sahu","Electrical","+91 98765 40002","Raipur","22AABCS2222B2Z2","12","Point","380"],
          ],
          filename: "gb_subcontractors_export.csv",
          templateFilename: "gb_template_subcontractors.csv",
          instructions: "Instructions: Firm Name and Trade required. Trade: RCC & Civil, Electrical, Plumbing, Painting, Tiles, Fabrication, Carpentry",
          mapRow: (s) => [s.name, s.owner, s.trade, s.phone, s.city, s.gstin, s.labourStrength, s.rateType, s.rate],
        }}
        currentData={subcons}
        onImportData={async (rows) => {
          const mapped = rows.map(r => ({
            name:             (r["Firm Name"] || "").trim(),
            owner:            (r["Owner/Contact"] || "").trim(),
            trade:            (r["Trade"] || "RCC & Civil").trim(),
            phone:            (r["Phone"] || "").trim(),
            city:             (r["City"] || "").trim(),
            gstin:            (r["GSTIN"] || "").trim(),
            labour_strength:  parseInt(r["Labour Strength"]) || 0,
            rate_type:        (r["Rate Unit"] || "Sq.Ft").trim(),
            rate:             parseFloat(r["Rate (Rs.)"]) || 0,
            status:           "Active",
          })).filter(s => s.name);
          const res = await api.post("/library/subcontractors/bulk", { rows: mapped });
          if (res.success) await reload();
          return res.data;
        }}
      />
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Subcontractor" : "Add Subcontractor"} desc="Subcontractor firm details" width={580}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Firm / Company Name" value={form.name} onChange={v => upd("name", v)} placeholder="e.g. Raj Construction" half required />
          <FormField label="Owner / Contact Person" value={form.owner} onChange={v => upd("owner", v)} placeholder="Owner name" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label="Trade / Specialty" value={form.trade} onChange={v => upd("trade", v)} options={["RCC & Civil","Electrical Work","Plumbing","Painting","Tiles & Flooring","Fabrication","Carpentry","Waterproofing","False Ceiling","HVAC","Landscaping","Demolition","Other"]} half required />
          <FormField label="Phone" value={form.phone} onChange={v => upd("phone", v)} placeholder="+91 XXXXX XXXXX" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="City" value={form.city} onChange={v => upd("city", v)} half />
          <FormField label="Labour Strength" value={form.labour_strength || ""} onChange={v => upd("labour_strength", parseInt(v) || 0)} type="number" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="GSTIN" value={form.gstin} onChange={v => upd("gstin", v)} placeholder="If registered" half />
          <FormSelect label="Status" value={form.status} onChange={v => upd("status", v)} options={["Active","Inactive","Blacklisted"]} half />
        </div>
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={editing ? "Update" : "Add Subcontractor"} />
      </Modal>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// SUBCON RATE CARD SECTION
// ═══════════════════════════════════════════════════════════════════════
function SubconRateCardSection() {
  const { items: subcons } = useSection("subcontractors");
  const { items: uomList } = useSection("uom");
  const { items: workCats } = useSection("work-categories");
  const [selectedSubcon, setSelectedSubcon] = useState("");
  const [rateItems, setRateItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = { work_item: "", unit: "", rate: 0, remark: "" };
  const [form, setForm] = useState(emptyForm);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const uomOptions = uomList.length > 0 ? uomList.map(u => u.name) : ["Sq.Ft","CFT","Running Ft","Kg","MT","Point","Unit","Lump Sum","Piece","Day"];
  const workItems = workCats.map(c => c.name);

  useEffect(() => {
    if (!selectedSubcon) return;
    setLoadingItems(true);
    api.get("/library/subcon-rates?subcon_id=" + selectedSubcon)
      .then(res => { if (res.success) setRateItems(res.data || []); })
      .catch(() => {})
      .finally(() => setLoadingItems(false));
  }, [selectedSubcon]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, unit: uomOptions[0] || "Sq.Ft", work_item: workItems[0] || "" });
    setShowModal(true);
  };
  const openEdit = (r) => { setEditing(r); setForm({ work_item: r.work_item, unit: r.unit, rate: r.rate, remark: r.remark || "" }); setShowModal(true); };
  const save = async () => {
    if (!form.work_item.trim()) return alert("Work item required");
    if (!selectedSubcon) return alert("Select a subcontractor first");
    setSaving(true);
    const payload = { ...form, subcon_id: selectedSubcon };
    let res;
    if (editing) res = await api.put("/library/subcon-rates/" + editing.id, payload);
    else res = await api.post("/library/subcon-rates", payload);
    setSaving(false);
    if (res.success) {
      if (editing) setRateItems(p => p.map(x => x.id === editing.id ? res.data : x));
      else setRateItems(p => [...p, res.data]);
      setShowModal(false);
    } else alert(res.message || "Save failed");
  };
  const del = async (id) => {
    const res = await api.del("/library/subcon-rates/" + id);
    if (res.success) setRateItems(p => p.filter(x => x.id !== id));
  };

  const selectedSubconName = subcons.find(s => String(s.id) === String(selectedSubcon))?.name || "";

  return (
    <div>
      {/* Subcon selector */}
      <div style={{ background: "white", borderRadius: 10, border: "1px solid #E5E7EB", padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", whiteSpace: "nowrap" }}>SELECT SUBCONTRACTOR</label>
        <div style={{flex:1}}>
          <SearchSelect value={selectedSubcon}
            options={subcons.map(s => ({ value: s.id, label: `${s.name}${s.trade?` (${s.trade})`:""}` }))}
            onChange={setSelectedSubcon}
            placeholder="Select subcontractor..."/>
        </div>
        {selectedSubcon && (
          <button onClick={openCreate}
            style={{ padding: "9px 18px", background: "#2563EB", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            + Add Item
          </button>
        )}
      </div>

      {!selectedSubcon ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF", fontSize: 14 }}>
          Select a subcontractor to view or add rate items
        </div>
      ) : loadingItems ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF" }}>Loading...</div>
      ) : (
        <>
          <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: "#374151" }}>
            Rate Card — {selectedSubconName}
            <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 500, color: "#6B7280" }}>{rateItems.length} items</span>
          </div>
          <DataTable
            columns={[
              { key: "work_item", label: "Work Item", minW: 200, render: r => <span style={{ fontWeight: 600 }}>{r.work_item}</span> },
              { key: "unit", label: "Unit", minW: 80 },
              { key: "rate", label: "Rate (Rs.)", minW: 100, align: "right", render: r => <span style={{ fontWeight: 700, color: "#2563EB" }}>Rs.{(r.rate||0).toLocaleString()}/{r.unit}</span> },
              { key: "remark", label: "Remark", minW: 160, render: r => <span style={{ fontSize: 12, color: "#6B7280" }}>{r.remark || "—"}</span> },
            ]}
            data={rateItems}
            onEdit={openEdit}
            onDelete={del}
            emptyMsg="No rate items added yet — click Add Item to start"
          />
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Rate Item" : "Add Rate Item"} desc={"Rate for: " + selectedSubconName} width={500}>
        <div style={{ marginBottom: 14 }}>
          <FormSelect label="Work Item" value={form.work_item} onChange={v => upd("work_item", v)} options={workItems} required />
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
          <FormSelect label="Unit" value={form.unit} onChange={v => upd("unit", v)} options={uomOptions} half />
          <FormField label="Rate (Rs.)" value={form.rate || ""} onChange={v => upd("rate", parseFloat(v) || 0)} type="number" half required />
        </div>
        <FormField label="Remark / Scope" value={form.remark} onChange={v => upd("remark", v)} placeholder="e.g. Including material, labour only, etc." />
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={saving ? "Saving..." : editing ? "Update" : "Add Item"} />
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BOQ SYSTEM — Construction Types, Cities, Packages, Items, Rate Matrix
// ═══════════════════════════════════════════════════════════════════════

// ── 1. Construction Types ──────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════
// CLIENT BOQ RATE CARD — Unified drill-down
// Flow: Construction Type → City → Package → Category → Items
// ═══════════════════════════════════════════════════════════════════════
function ClientBOQSection() {
  // ── Master data ──────────────────────────────────────────────────────
  const [conTypes,  setConTypes]  = useState([]);
  const [cities,    setCities]    = useState([]);
  const [packages,  setPackages]  = useState([]);
  const [boqItems,  setBoqItems]  = useState([]);
  const { items: uomList }        = useSection("uom");
  const { items: workCats }       = useSection("work-categories");

  // ── Selections ───────────────────────────────────────────────────────
  const [selType,    setSelType]    = useState(null);  // { id, name, color }
  const [selCity,    setSelCity]    = useState(null);
  const [selPkg,     setSelPkg]     = useState(null);
  const [filterCat,  setFilterCat]  = useState("All");

  // ── Rate matrix ──────────────────────────────────────────────────────
  // Both maps keyed by item_id → { add_on:Number, description:String }.
  // `changed` mirrors the same shape for any field the user has touched
  // since last load/save; merge `changed` on top of `rates` to get the
  // effective value (see cellOf / getAddOn / getDesc below).
  // ITEM PICKING: items show in a section only when they're "picked" for
  // this package+city — i.e. an entry exists in `rates` OR `changed`.
  const [rates,         setRates]         = useState({});
  const [changed,       setChanged]       = useState({});
  const [collapsedCats, setCollapsedCats] = useState({}); // catName → true when collapsed
  const [saving,        setSaving]        = useState(false);

  // ── Picker modal (opens from "+ Add Item to {category}") ────────────
  const [pickerCat,     setPickerCat]     = useState(null); // category name, null = closed
  const [pickerSearch,  setPickerSearch]  = useState("");
  const [pickerMode,    setPickerMode]    = useState("list"); // "list" | "create"
  const [pickerForm,    setPickerForm]    = useState({});      // for inline "+ Add new"
  const [pickerSaving,  setPickerSaving]  = useState(false);

  // ── Inline rename of a category in a section header ─────────────────
  const [renameCatId,    setRenameCatId]    = useState(null);  // work_categories.id
  const [renameCatValue, setRenameCatValue] = useState("");

  // ── Edit modal for an existing BOQ item (Subcon-style modal) ────────
  const [editItem,     setEditItem]     = useState(null);
  const [editItemForm, setEditItemForm] = useState({});
  const [editItemSaving, setEditItemSaving] = useState(false);

  // ── Add-new modals ───────────────────────────────────────────────────
  const [addModal, setAddModal] = useState(null); // "type"|"city"|"pkg"|"item"
  const [addForm,  setAddForm]  = useState({});
  const [adding,   setAdding]   = useState(false);
  const upd = (k, v) => setAddForm(p => ({ ...p, [k]: v }));

  // ── Stages editor modal (per-library-row milestone breakup) ──────────
  const [stagesModal,  setStagesModal]  = useState(null); // boq_item or null
  const [stagesForm,   setStagesForm]   = useState([{ seq: 0, name: "", cum_pct: "" }]);
  const [stagesSaving, setStagesSaving] = useState(false);

  const openStagesModal = async (item) => {
    setStagesModal(item);
    setStagesForm([{ seq: 0, name: "", cum_pct: "" }]);
    const r = await api.get("/library/boq-items/" + item.id + "/stages").catch(() => ({ success: false }));
    if (r.success && (r.data?.lines || []).length > 0) {
      setStagesForm(r.data.lines.map((l, i) => ({ seq: i, name: l.name, cum_pct: String(l.cum_pct) })));
    }
  };
  const closeStagesModal = () => { setStagesModal(null); setStagesForm([{ seq: 0, name: "", cum_pct: "" }]); };
  const saveStages = async () => {
    if (!stagesModal) return;
    const lines = stagesForm
      .filter(s => s.name && s.cum_pct !== "")
      .map((s, i) => ({ seq: i, name: s.name, cum_pct: parseFloat(s.cum_pct) }));
    if (lines.length === 0) return alert("Add at least one stage");
    setStagesSaving(true);
    const r = await api.put("/library/boq-items/" + stagesModal.id + "/stages", { lines }).catch(() => ({ success: false }));
    setStagesSaving(false);
    if (r.success) {
      if (r.data?.warnings?.length) alert("Saved with warnings:\n" + r.data.warnings.join("\n"));
      await loadItems();
      closeStagesModal();
    } else alert(r.message || "Save failed");
  };

  const uomOptions  = uomList.length  > 0 ? uomList.map(u => u.name)  : ["Sq.Ft","CFT","Running Ft","Kg","Point","Unit","Lump Sum","Piece"];
  const catOptions  = workCats.map(c => c.name);
  const allCats     = ["All", ...catOptions];

  // ── Load master data ─────────────────────────────────────────────────
  const loadTypes    = () => api.get("/library/construction-types").then(r => { if (r.success) setConTypes(r.data||[]); });
  const loadCities   = () => api.get("/library/cities").then(r => { if (r.success) setCities(r.data||[]); });
  const loadPackages = () => api.get("/library/rate-packages").then(r => { if (r.success) setPackages(r.data||[]); });
  const loadItems    = () => api.get("/library/boq-items").then(r => { if (r.success) setBoqItems(r.data||[]); });

  useEffect(() => { loadTypes(); loadCities(); loadPackages(); loadItems(); }, []);

  // ── Load rates when pkg+city selected ───────────────────────────────
  useEffect(() => {
    if (!selPkg || !selCity) return;
    api.get("/library/rate-matrix?package_id=" + selPkg.id + "&city_id=" + selCity.id)
      .then(r => {
        if (r.success) {
          const map = {};
          (r.data||[]).forEach(x => {
            map[x.item_id] = {
              add_on:      parseFloat(x.add_on_rate) || 0,
              description: x.description || "",
            };
          });
          setRates(map);
          setChanged({});
        }
      }).catch(() => {});
  }, [selPkg, selCity]);

  // ── Filtered items ───────────────────────────────────────────────────
  const filteredItems = boqItems.filter(i => filterCat === "All" || i.category === filterCat);

  // ── Save rates ───────────────────────────────────────────────────────
  // New payload shape: { item_id, base_rate, add_on_rate, description } per
  // item. Backend computes `rate` = base + add_on so the legacy `rate` column
  // (still read by Estimate module) stays in sync.
  const saveRates = async () => {
    if (!selPkg || !selCity) return;
    setSaving(true);
    const items = boqItems.map(i => ({
      item_id:     i.id,
      base_rate:   Number(i.base_rate) || 0,
      add_on_rate: Number(getAddOn(i)) || 0,
      description: getDesc(i) || "",
    }));
    const res = await api.post("/library/rate-matrix/bulk", {
      package_id: selPkg.id, city_id: selCity.id, items,
    });
    setSaving(false);
    if (res.success) {
      // Merge `changed` into `rates` (canonical) then clear `changed`.
      setRates(prev => {
        const n = { ...prev };
        Object.entries(changed).forEach(([id, v]) => { n[id] = { ...n[id], ...v }; });
        return n;
      });
      setChanged({});
      alert("Rates saved!");
    } else alert(res.message || "Save failed");
  };

  // ── Add new handlers ─────────────────────────────────────────────────
  // `preset` lets section footers pre-fill new-item fields (e.g. category).
  // For "pkg" edit: pass { _editingId, name, sqft_rate, description } to
  // switch the existing pkg modal into edit mode (PUT instead of POST).
  const openAdd = (type, preset = {}) => { setAddForm({ ...preset }); setAddModal(type); };

  // ── Picker handlers ─────────────────────────────────────────────────
  // Opens the picker for a given category. From here the user either
  // picks an existing library item (boq_items WHERE category=catName AND
  // NOT-already-in-rates) or switches to "create new" to push a fresh
  // boq_items row + auto-pick it.
  const openPicker  = (catName) => { setPickerCat(catName); setPickerSearch(""); setPickerMode("list"); setPickerForm({ category: catName }); };
  const closePicker = () => { setPickerCat(null); setPickerSearch(""); setPickerMode("list"); setPickerForm({}); };
  const pickItemIntoSection = (item) => {
    // Add to `changed` with default values — Save Rates will persist.
    setChanged(p => ({ ...p, [item.id]: { add_on: 0, description: "" } }));
    closePicker();
  };
  const submitNewInPicker = async () => {
    if (!pickerForm.name?.trim()) return alert("Item name required");
    setPickerSaving(true);
    const res = await api.post("/library/boq-items", {
      name:        pickerForm.name.trim(),
      category:    pickerForm.category || pickerCat || (catOptions[0] || ""),
      unit:        pickerForm.unit || uomOptions[0] || "",
      base_rate:   parseFloat(pickerForm.base_rate) || 0,
      description: pickerForm.description || "",
    });
    setPickerSaving(false);
    if (res?.success && res.data) {
      // Add new item to master + auto-pick into this section.
      setBoqItems(p => [res.data, ...p]);
      setChanged(p => ({ ...p, [res.data.id]: { add_on: 0, description: "" } }));
      closePicker();
    } else alert(res?.message || "Save failed");
  };

  // ── Category rename ─────────────────────────────────────────────────
  // Calls the new POST /library/work-categories/:id/rename endpoint
  // which updates work_categories.name + all boq_items.category strings
  // in one transaction. After save we reload work-categories AND
  // boq-items so the section regroups cleanly.
  const startRenameCat = (catName) => {
    const cat = workCats.find(c => c.name === catName);
    if (!cat) return;
    setRenameCatId(cat.id);
    setRenameCatValue(catName);
  };
  const cancelRenameCat = () => { setRenameCatId(null); setRenameCatValue(""); };
  const saveRenameCat = async () => {
    const newName = renameCatValue.trim();
    if (!newName || !renameCatId) return;
    const res = await api.post("/library/work-categories/" + renameCatId + "/rename", { name: newName });
    if (res?.success) {
      cancelRenameCat();
      // Refresh both — workCats is in useSection("work-categories") which
      // is consumed read-only here; the simplest refresh is to reload
      // boq_items (so category strings get the new name) and let workCats
      // self-refresh on next mount. For instant UX we also patch
      // boqItems local state.
      await loadItems();
    } else alert(res?.message || "Rename failed");
  };

  // ── Item edit / delete ──────────────────────────────────────────────
  const openEditItem = (item) => {
    setEditItem(item);
    setEditItemForm({
      name:        item.name || "",
      category:    item.category || (catOptions[0] || ""),
      unit:        item.unit || (uomOptions[0] || ""),
      base_rate:   item.base_rate || 0,
      description: item.description || "",
    });
  };
  const closeEditItem = () => { setEditItem(null); setEditItemForm({}); };
  const saveEditItem = async () => {
    if (!editItem || !editItemForm.name?.trim()) return;
    setEditItemSaving(true);
    const res = await api.put("/library/boq-items/" + editItem.id, {
      name:        editItemForm.name.trim(),
      category:    editItemForm.category,
      unit:        editItemForm.unit,
      base_rate:   parseFloat(editItemForm.base_rate) || 0,
      description: editItemForm.description || "",
    });
    setEditItemSaving(false);
    if (res?.success && res.data) {
      setBoqItems(p => p.map(i => i.id === editItem.id ? res.data : i));
      closeEditItem();
    } else alert(res?.message || "Save failed");
  };
  const deleteItemRow = async (item) => {
    if (!window.confirm("Delete \"" + item.name + "\" from the library? This also removes it from any package's rate matrix on next save.")) return;
    const res = await api.del("/library/boq-items/" + item.id);
    if (res?.success) {
      setBoqItems(p => p.filter(i => i.id !== item.id));
      // Drop any pending change for this item too.
      setChanged(p => { const n = { ...p }; delete n[item.id]; return n; });
      setRates(p => { const n = { ...p }; delete n[item.id]; return n; });
    } else alert(res?.message || "Delete failed");
  };

  // ── Package edit (reuses existing pkg modal in edit mode) ──────────
  const openEditPkg = (pkg) => {
    setAddForm({
      _editingId:  pkg.id,
      name:        pkg.name || "",
      sqft_rate:   pkg.sqft_rate || 0,
      description: pkg.description || "",
    });
    setAddModal("pkg");
  };
  const handleAdd = async () => {
    setAdding(true);
    let res;
    if (addModal === "type") {
      if (!addForm.name?.trim()) { setAdding(false); return alert("Name required"); }
      res = await api.post("/library/construction-types", { name: addForm.name.trim(), color: addForm.color || "#2563EB" });
      if (res.success) { await loadTypes(); setSelType(res.data); }
    } else if (addModal === "city") {
      if (!addForm.name?.trim()) { setAdding(false); return alert("Name required"); }
      res = await api.post("/library/cities", { name: addForm.name.trim(), state: addForm.state || "Chhattisgarh" });
      if (res.success) { await loadCities(); setSelCity(res.data); }
    } else if (addModal === "pkg") {
      if (!addForm.name?.trim()) { setAdding(false); return alert("Name required"); }
      if (addForm._editingId) {
        // EDIT mode — PUT instead of POST.
        res = await api.put("/library/rate-packages/" + addForm._editingId, {
          name: addForm.name.trim(),
          sqft_rate: addForm.sqft_rate || 0,
          description: addForm.description || "",
        });
        if (res.success) {
          await loadPackages();
          if (selPkg?.id === addForm._editingId) setSelPkg(p => ({ ...p, ...res.data }));
        }
      } else {
        res = await api.post("/library/rate-packages", { name: addForm.name.trim(), construction_type_id: selType?.id, sqft_rate: addForm.sqft_rate || 0, description: addForm.description || "" });
        if (res.success) { await loadPackages(); setSelPkg(res.data); }
      }
    } else if (addModal === "item") {
      if (!addForm.name?.trim()) { setAdding(false); return alert("Name required"); }
      res = await api.post("/library/boq-items", { name: addForm.name.trim(), category: addForm.category || catOptions[0] || "", unit: addForm.unit || uomOptions[0] || "", base_rate: addForm.base_rate || 0, description: addForm.description || "" });
      if (res.success) { await loadItems(); }
    }
    setAdding(false);
    if (res?.success) setAddModal(null);
    else if (res) alert(res.message || "Save failed");
  };

  const COLORS = ["#2563EB","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16"];

  // ── Breadcrumb style selector row ────────────────────────────────────
  const selBoxStyle = (active) => ({
    flex: 1, minWidth: 160, background: "white", borderRadius: 10,
    border: "1.5px solid " + (active ? "#2563EB" : "#E5E7EB"),
    padding: "12px 14px", cursor: "pointer",
    boxShadow: active ? "0 0 0 3px #DBEAFE" : "none",
  });

  // Filtered packages for selected type
  const typePkgs = packages.filter(p => selType && String(p.construction_type_id) === String(selType.id));

  // Effective value lookups (changed > saved > default).
  const cellOf = (id) => (changed[id] ?? rates[id] ?? null);
  const getAddOn = (item) => {
    const c = cellOf(item.id);
    return c && c.add_on !== undefined ? c.add_on : "";
  };
  const getDesc = (item) => {
    const c = cellOf(item.id);
    return c && c.description !== undefined ? c.description : "";
  };
  // Merge a partial { add_on?, description? } into the changed entry for an item.
  const patchChanged = (id, patch) => setChanged(p => {
    const cur = p[id] ?? rates[id] ?? { add_on: 0, description: "" };
    return { ...p, [id]: { ...cur, ...patch } };
  });
  const hasChanged = Object.keys(changed).length > 0;

  return (
    <div style={{ fontFamily: "inherit" }}>

      {/* ── LEVEL 1: Construction Type ────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
          1 — Construction Type
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {conTypes.map(ct => (
            <div key={ct.id} onClick={() => { setSelType(ct); setSelPkg(null); setRates({}); setChanged({}); }}
              style={{ padding: "9px 18px", borderRadius: 8, border: "2px solid " + (selType?.id === ct.id ? (ct.color||"#2563EB") : "#E5E7EB"),
                background: selType?.id === ct.id ? (ct.color||"#2563EB") : "white",
                color: selType?.id === ct.id ? "white" : "#374151",
                fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s" }}>
              {ct.name}
            </div>
          ))}
          <button onClick={() => openAdd("type")}
            style={{ padding: "9px 14px", borderRadius: 8, border: "2px dashed #D1D5DB", background: "transparent", color: "#6B7280", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            + New Type
          </button>
        </div>
      </div>

      {/* ── LEVEL 2: City ─────────────────────────────────────────────── */}
      {selType && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
            2 — City
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {cities.map(city => (
              <div key={city.id} onClick={() => { setSelCity(city); setRates({}); setChanged({}); }}
                style={{ padding: "9px 18px", borderRadius: 8, border: "2px solid " + (selCity?.id === city.id ? "#0891B2" : "#E5E7EB"),
                  background: selCity?.id === city.id ? "#0891B2" : "white",
                  color: selCity?.id === city.id ? "white" : "#374151",
                  fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s" }}>
                {city.name}
              </div>
            ))}
            <button onClick={() => openAdd("city")}
              style={{ padding: "9px 14px", borderRadius: 8, border: "2px dashed #D1D5DB", background: "transparent", color: "#6B7280", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              + New City
            </button>
          </div>
        </div>
      )}

      {/* ── LEVEL 3: Package ──────────────────────────────────────────── */}
      {selType && selCity && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
            3 — Package
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {typePkgs.map(pkg => {
              const active = selPkg?.id === pkg.id;
              return (
                <div key={pkg.id} onClick={() => setSelPkg(pkg)}
                  style={{ position: "relative", padding: "9px 32px 9px 20px", borderRadius: 8,
                    border: "2px solid " + (active ? "#7C3AED" : "#E5E7EB"),
                    background: active ? "#7C3AED" : "white",
                    color: active ? "white" : "#374151",
                    fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s" }}>
                  <div>{pkg.name}</div>
                  {pkg.sqft_rate > 0 && <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>Rs.{Number(pkg.sqft_rate).toLocaleString()}/sqft</div>}
                  {/* Edit pencil — only visible on the selected tile so non-active tiles stay clean */}
                  {active && (
                    <button onClick={(e) => { e.stopPropagation(); openEditPkg(pkg); }}
                      title="Edit package"
                      style={{ position: "absolute", right: 6, top: 6, background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 4, color: "white", cursor: "pointer", padding: 3, display: "flex" }}>
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  )}
                </div>
              );
            })}
            <button onClick={() => openAdd("pkg")}
              style={{ padding: "9px 14px", borderRadius: 8, border: "2px dashed #D1D5DB", background: "transparent", color: "#6B7280", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              + New Package
            </button>
          </div>
        </div>
      )}

      {/* ── LEVEL 4+5: Grouped category sections + per-item add-on/description ── */}
      {selType && selCity && selPkg && (
        <>
          {/* Info + Save bar */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#1E40AF" }}>
              <strong>{selType.name}</strong> — <strong>{selPkg.name}</strong> — <strong>{selCity.name}</strong>
              {hasChanged && <span style={{ marginLeft: 10, color: "#D97706", fontWeight: 600 }}>● Unsaved changes</span>}
            </span>
            <button onClick={saveRates} disabled={saving}
              style={{ padding: "8px 20px", background: saving ? "#9CA3AF" : "#2563EB", color: "white", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer" }}>
              {saving ? "Saving..." : "Save Rates"}
            </button>
          </div>

          {/* GROUPED SECTIONS — Subcon-style dark headers, items appear only when picked */}
          {(() => {
            // Items visible in the section view = items the user has explicitly
            // picked for this package+city (have an entry in `rates` or
            // `changed`). Master library still lives in boqItems untouched.
            const pickedIds = new Set([
              ...Object.keys(rates),
              ...Object.keys(changed),
            ].map(String));
            const pickedItems = boqItems.filter(i => pickedIds.has(String(i.id)));

            // Group picked items by category. Categories WITHOUT picked items
            // are not rendered — to add to a fresh category, click the master
            // "+ Add Item" button below.
            const grouped = pickedItems.reduce((acc, item) => {
              const k = item.category || "Uncategorized";
              (acc[k] ||= []).push(item);
              return acc;
            }, {});
            const catNames = Object.keys(grouped).sort();

            // Grand totals across picked items only.
            const gBase  = pickedItems.reduce((s, i) => s + (Number(i.base_rate) || 0), 0);
            const gAddOn = pickedItems.reduce((s, i) => s + (Number(getAddOn(i)) || 0), 0);
            const gTotal = gBase + gAddOn;

            // Set of categories the user might want to start adding to —
            // master work-categories that don't yet have a picked item.
            const startCats = (workCats || [])
              .map(c => c.name)
              .filter(n => !catNames.includes(n));

            if (catNames.length === 0) {
              return (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
                  No items picked for this package yet. Start adding:
                  <div style={{ marginTop: 14, display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
                    {(startCats.length ? startCats : [catOptions[0] || "Civil Work"]).map(c => (
                      <button key={c} onClick={() => openPicker(c)}
                        style={{ background:"#EFF6FF", color:"#2563EB", border:"1px dashed #BFDBFE", borderRadius:6, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                        + Add Item to {c}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <>
                {catNames.map(catName => {
                  const items = grouped[catName];
                  const sBase  = items.reduce((s, i) => s + (Number(i.base_rate) || 0), 0);
                  const sAddOn = items.reduce((s, i) => s + (Number(getAddOn(i)) || 0), 0);
                  const sTot   = sBase + sAddOn;
                  const collapsed = !!collapsedCats[catName];
                  const cat = (workCats || []).find(c => c.name === catName);
                  const renaming = renameCatId && cat && cat.id === renameCatId;
                  return (
                    <div key={catName} style={{ background: "white", borderRadius: 10, border: "1px solid #E5E7EB", marginBottom: 12, overflow: "hidden" }}>
                      {/* Section header — Subcon-style dark navy */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "#1E293B", color: "white" }}>
                        <span onClick={() => setCollapsedCats(p => ({ ...p, [catName]: !p[catName] }))}
                          style={{ cursor: "pointer", display: "flex" }}>
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={2.5}
                            style={{ transition: "transform .15s", transform: collapsed ? "rotate(0deg)" : "rotate(90deg)" }}>
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </span>
                        {renaming ? (
                          <>
                            <input value={renameCatValue}
                              onChange={e => setRenameCatValue(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveRenameCat(); if (e.key === "Escape") cancelRenameCat(); }}
                              autoFocus
                              style={{ padding: "4px 9px", fontSize: 13, fontWeight: 600, borderRadius: 5, border: "1.5px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.08)", color: "white", outline: "none", fontFamily: "inherit", minWidth: 180 }}/>
                            <button onClick={saveRenameCat} style={{ background: "#10B981", color: "white", border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
                            <button onClick={cancelRenameCat} style={{ background: "none", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 4, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <span onClick={() => setCollapsedCats(p => ({ ...p, [catName]: !p[catName] }))} style={{ fontWeight: 700, fontSize: 13.5, color: "white", cursor: "pointer" }}>{catName}</span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>· {items.length} item{items.length > 1 ? "s" : ""}</span>
                            {cat && (
                              <button onClick={() => startRenameCat(catName)} title="Rename category"
                                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", padding: 2, display: "flex" }}>
                                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                            )}
                          </>
                        )}
                        <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontSize: 11.5, fontWeight: 600 }}>
                          <span style={{ color: "rgba(255,255,255,0.6)" }}>Base <strong style={{ color: "white" }}>Rs.{Math.round(sBase).toLocaleString()}</strong></span>
                          <span style={{ color: "rgba(255,255,255,0.6)" }}>Add-on <strong style={{ color: "#93C5FD" }}>Rs.{Math.round(sAddOn).toLocaleString()}</strong></span>
                          <span style={{ color: "rgba(255,255,255,0.6)" }}>Total <strong style={{ color: "#4ADE80" }}>Rs.{Math.round(sTot).toLocaleString()}</strong></span>
                        </div>
                      </div>

                      {/* Items table — hidden when collapsed */}
                      {!collapsed && (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "#FAFAFA" }}>
                              <th style={{ padding: "8px 14px", textAlign: "left",   fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>Item</th>
                              <th style={{ padding: "8px 14px", textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", width: 70 }}>Unit</th>
                              <th style={{ padding: "8px 14px", textAlign: "right",  fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", width: 110 }}>Base Rate</th>
                              <th style={{ padding: "8px 14px", textAlign: "right",  fontSize: 10.5, fontWeight: 700, color: "#2563EB", textTransform: "uppercase", width: 140 }}>Add-on Rate</th>
                              <th style={{ padding: "8px 14px", textAlign: "left",   fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>Description</th>
                              <th style={{ padding: "8px 8px",  textAlign: "center", width: 60 }}></th>
                            </tr>
                            {/* Subtotals row — aligned with column totals */}
                            <tr style={{ background: "#F3F4F6", borderTop: "1px solid #E5E7EB" }}>
                              <td style={{ padding: "5px 14px", fontSize: 10.5, fontWeight: 700, color: "#6B7280" }}>SUBTOTAL</td>
                              <td/>
                              <td style={{ padding: "5px 14px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#374151" }}>Rs.{Math.round(sBase).toLocaleString()}</td>
                              <td style={{ padding: "5px 14px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#2563EB" }}>Rs.{Math.round(sAddOn).toLocaleString()}</td>
                              <td colSpan={2} style={{ padding: "5px 14px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#059669" }}>Total Rs.{Math.round(sTot).toLocaleString()}</td>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => {
                              const aVal = getAddOn(item);
                              const dVal = getDesc(item);
                              const isChanged = changed[item.id] !== undefined;
                              return (
                                <tr key={item.id} style={{ background: idx % 2 === 0 ? "white" : "#FAFAFA", borderBottom: "1px solid #F3F4F6" }}>
                                  <td style={{ padding: "9px 14px", fontWeight: 600, fontSize: 13, color: "#111827" }}>{item.name}</td>
                                  <td style={{ padding: "9px 14px", textAlign: "center", fontSize: 12, color: "#6B7280" }}>{item.unit}</td>
                                  <td style={{ padding: "9px 14px", textAlign: "right", fontSize: 13, color: "#9CA3AF" }}>Rs.{Number(item.base_rate || 0).toLocaleString()}</td>
                                  <td style={{ padding: "9px 14px", textAlign: "right" }}>
                                    <input type="number" value={aVal}
                                      placeholder="0"
                                      onChange={e => patchChanged(item.id, { add_on: e.target.value })}
                                      style={{ width: 120, padding: "6px 10px", borderRadius: 6, textAlign: "right", fontFamily: "inherit", fontSize: 13,
                                        border: "1.5px solid " + (isChanged ? "#2563EB" : "#E5E7EB"),
                                        background: isChanged ? "#EFF6FF" : "white", outline: "none" }}/>
                                  </td>
                                  <td style={{ padding: "9px 14px" }}>
                                    <input type="text" value={dVal}
                                      placeholder="Optional note for this package/city"
                                      onChange={e => patchChanged(item.id, { description: e.target.value })}
                                      style={{ width: "100%", padding: "6px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 12,
                                        border: "1.5px solid " + (isChanged ? "#2563EB" : "#E5E7EB"),
                                        background: isChanged ? "#EFF6FF" : "white", outline: "none", boxSizing: "border-box" }}/>
                                  </td>
                                  <td style={{ padding: "9px 6px", textAlign: "center", whiteSpace: "nowrap" }}>
                                    <button onClick={() => openEditItem(item)} title="Edit item in library"
                                      style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", padding: 4, marginRight: 2 }}>
                                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                    <button onClick={() => deleteItemRow(item)} title="Delete item from library"
                                      style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: 4 }}>
                                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}

                      {/* Section footer — opens picker for this category */}
                      {!collapsed && (
                        <div style={{ padding: "8px 14px", borderTop: "1px solid #F3F4F6", background: "#FAFAFA" }}>
                          <button onClick={() => openPicker(catName)}
                            style={{ background: "none", border: "1px dashed #BFDBFE", color: "#2563EB", borderRadius: 5, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                            + Add Item to {catName}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Grand Total — Subcon-style right-aligned line */}
                <div style={{ marginTop: 10, padding: "8px 4px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#374151" }}>
                  Grand Total —
                  <span style={{ marginLeft: 14 }}>Base <strong style={{ color: "#374151" }}>Rs.{Math.round(gBase).toLocaleString()}</strong></span>
                  <span style={{ marginLeft: 14, color: "#2563EB" }}>Add-on <strong>Rs.{Math.round(gAddOn).toLocaleString()}</strong></span>
                  <span style={{ marginLeft: 14, color: "#059669", fontSize: 15 }}><strong>Rs.{Math.round(gTotal).toLocaleString()}</strong></span>
                </div>

                {/* Start a brand new category — picker for any work-category that has no items yet */}
                {startCats.length > 0 && (
                  <div style={{ marginTop: 12, padding: "10px 12px", background: "#F9FAFB", border: "1px dashed #E5E7EB", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
                      Add items to other categories
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {startCats.map(c => (
                        <button key={c} onClick={() => openPicker(c)}
                          style={{ background: "white", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 5, padding: "4px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                          + {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* ── STAGES EDITOR MODAL ──────────────────────────────────────────
          Edits the milestone_template linked to a Client BOQ row. Stages are
          stored as cum_pct (cumulative % of item rate), so the same breakup
          scales across cities/packages: same template works at Rs.300 or Rs.1,550.
      */}
      {stagesModal && (<>
        <div onClick={closeStagesModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300 }}/>
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, maxWidth: "95vw", maxHeight: "85vh", background: "white", borderRadius: 12, zIndex: 301, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Stage Breakup — {stagesModal.name}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Cumulative %  of item rate. Reusable across cities/packages.</div>
            </div>
            <button onClick={closeStagesModal} style={{ background: "none", border: "none", fontSize: 18, color: "#6B7280", cursor: "pointer" }}>×</button>
          </div>
          <div style={{ padding: "16px 18px", overflowY: "auto", flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 32px", gap: 6, marginBottom: 6 }}>
              {["#", "Stage Name", "Cum %", ""].map(h => <span key={h} style={{ fontSize: 9.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>{h}</span>)}
            </div>
            {stagesForm.map((s, si) => (
              <div key={si} style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 32px", gap: 6, marginBottom: 4, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>{si + 1}</span>
                <input value={s.name}
                  onChange={e => { const arr = [...stagesForm]; arr[si] = { ...arr[si], name: e.target.value }; setStagesForm(arr); }}
                  placeholder="e.g. Footing"
                  style={{ padding: "7px 10px", borderRadius: 6, border: "1.5px solid #E5E7EB", fontSize: 12, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}/>
                <input type="number" value={s.cum_pct}
                  onChange={e => { const arr = [...stagesForm]; arr[si] = { ...arr[si], cum_pct: e.target.value }; setStagesForm(arr); }}
                  placeholder="cum %"
                  style={{ padding: "7px 10px", borderRadius: 6, border: "1.5px solid #E5E7EB", fontSize: 12, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}/>
                <button onClick={() => { const arr = stagesForm.filter((_, i) => i !== si); setStagesForm(arr.length ? arr : [{ seq: 0, name: "", cum_pct: "" }]); }}
                  style={{ background: "#FEF2F2", color: "#DC2626", border: "none", borderRadius: 5, fontSize: 14, cursor: "pointer" }}>×</button>
              </div>
            ))}
            <button onClick={() => setStagesForm(p => [...p, { seq: p.length, name: "", cum_pct: "" }])}
              style={{ marginTop: 8, background: "#EFF6FF", color: "#2563EB", border: "1px dashed #BFDBFE", borderRadius: 5, padding: "6px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
              + Add Stage
            </button>
            <div style={{ marginTop: 12, padding: "8px 10px", background: "#F9FAFB", borderRadius: 5, fontSize: 11, color: "#6B7280" }}>
              Last cum_pct should be 100. If not, a warning is shown (the breakup is still saved).
            </div>
          </div>
          <div style={{ padding: "12px 18px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={closeStagesModal} style={{ padding: "7px 16px", borderRadius: 6, background: "#F9FAFB", border: "1px solid #E5E7EB", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button onClick={saveStages} disabled={stagesSaving} style={{ padding: "7px 18px", borderRadius: 6, background: stagesSaving ? "#9CA3AF" : "#2563EB", color: "white", border: "none", fontSize: 12, fontWeight: 700, cursor: stagesSaving ? "default" : "pointer" }}>
              {stagesSaving ? "Saving…" : "Save Stages"}
            </button>
          </div>
        </div>
      </>)}

      {/* Empty state */}
      {!selType && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF", fontSize: 14 }}>
          Select a Construction Type above to start
        </div>
      )}

      {/* ── PICKER MODAL — "+ Add Item to {category}" ─────────────────
          Subcon-style dark-header modal. List mode shows library items
          (boq_items WHERE category=pickerCat AND NOT-yet-in-rates).
          "Create new" mode swaps the body for an inline add form so the
          user can push a fresh boq_items row + auto-pick it without
          leaving the modal.
      */}
      {pickerCat && (() => {
        const pickedIds = new Set([...Object.keys(rates), ...Object.keys(changed)].map(String));
        const available = boqItems.filter(i =>
          (i.category || "Uncategorized") === pickerCat &&
          !pickedIds.has(String(i.id)) &&
          (!pickerSearch.trim() ||
            i.name.toLowerCase().includes(pickerSearch.toLowerCase()))
        );
        return (
          <div onClick={closePicker}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: "white", borderRadius: 12, width: "min(560px, 95vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
              {/* Dark header */}
              <div style={{ background: "#0F172A", padding: "13px 18px", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
                    {pickerMode === "list" ? "Add Item to " + pickerCat : "New BOQ Item — " + pickerCat}
                  </div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>
                    {pickerMode === "list"
                      ? "Pick from existing library items, or click \"+ Add new\" if it's not there yet."
                      : "Saves to master library + auto-adds to this package."}
                  </div>
                </div>
                <button onClick={closePicker} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
              {/* Body */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                {pickerMode === "list" ? (
                  <>
                    <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                      placeholder={"Search items in " + pickerCat + "…"}
                      autoFocus
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }}/>
                    <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #E5E7EB", borderRadius: 7 }}>
                      {available.length === 0 ? (
                        <div style={{ padding: "30px 14px", textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>
                          {pickerSearch.trim()
                            ? "No matches in " + pickerCat + ". Click \"+ Add new\" below to create one."
                            : "All " + pickerCat + " items are already in this package, or none exist yet."}
                        </div>
                      ) : available.map((item, idx) => (
                        <div key={item.id} onClick={() => pickItemIntoSection(item)}
                          style={{ padding: "9px 12px", cursor: "pointer", borderBottom: idx < available.length - 1 ? "1px solid #F3F4F6" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                          onMouseLeave={e => e.currentTarget.style.background = "white"}>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#111827" }}>{item.name}</div>
                            <div style={{ fontSize: 10.5, color: "#6B7280", marginTop: 1 }}>{item.unit} {item.description ? "· " + item.description : ""}</div>
                          </div>
                          <div style={{ fontSize: 11.5, color: "#9CA3AF" }}>Rs.{Number(item.base_rate || 0).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setPickerMode("create")}
                      style={{ marginTop: 10, width: "100%", background: "#EFF6FF", color: "#2563EB", border: "1px dashed #BFDBFE", borderRadius: 7, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                      + Add new item (not in library yet)
                    </button>
                  </>
                ) : (
                  // Inline create form — Subcon-style 2-col grid
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ gridColumn: "1 / 3" }}>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Item Name *</label>
                      <input value={pickerForm.name || ""} onChange={e => setPickerForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. RCC Footing M25" autoFocus
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Category *</label>
                      <select value={pickerForm.category || pickerCat} onChange={e => setPickerForm(p => ({ ...p, category: e.target.value }))}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", background: "white" }}>
                        {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Unit</label>
                      <select value={pickerForm.unit || (uomOptions[0] || "")} onChange={e => setPickerForm(p => ({ ...p, unit: e.target.value }))}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", background: "white" }}>
                        {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Base Rate (Rs.)</label>
                      <input type="number" value={pickerForm.base_rate || ""} onChange={e => setPickerForm(p => ({ ...p, base_rate: e.target.value }))}
                        placeholder="0"
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Description / Scope</label>
                      <input value={pickerForm.description || ""} onChange={e => setPickerForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Optional"
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                    </div>
                    <div style={{ gridColumn: "1 / 3" }}>
                      <button onClick={() => setPickerMode("list")}
                        style={{ background: "none", border: "none", color: "#6B7280", fontSize: 11.5, fontWeight: 600, cursor: "pointer", padding: "4px 0" }}>
                        ← Back to library list
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Footer */}
              <div style={{ padding: "12px 16px", borderTop: "1px solid #E5E7EB", display: "flex", gap: 8 }}>
                <button onClick={closePicker}
                  style={{ flex: 1, padding: "9px", borderRadius: 7, border: "1px solid #E5E7EB", background: "white", fontSize: 12, cursor: "pointer" }}>
                  Cancel
                </button>
                {pickerMode === "create" && (
                  <button onClick={submitNewInPicker} disabled={pickerSaving || !pickerForm.name?.trim()}
                    style={{ flex: 2, padding: "9px", borderRadius: 7, background: (pickerSaving || !pickerForm.name?.trim()) ? "#9CA3AF" : "#2563EB", color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: (pickerSaving || !pickerForm.name?.trim()) ? "not-allowed" : "pointer" }}>
                    {pickerSaving ? "Saving…" : "Save & Add"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── EDIT ITEM MODAL — Subcon-style ────────────────────────────
          Opens from the pencil icon on each item row. Edits boq_items
          (the master row), not the per-package rate. To change the
          add-on/description for this package, the user edits inline on
          the table row directly.
      */}
      {editItem && (
        <div onClick={closeEditItem}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "white", borderRadius: 12, width: "min(540px, 95vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
            <div style={{ background: "#0F172A", padding: "13px 18px", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Edit BOQ Item</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>Master library — changes apply across all packages.</div>
              </div>
              <button onClick={closeEditItem} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ gridColumn: "1 / 3" }}>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Item Name *</label>
                  <input value={editItemForm.name || ""} onChange={e => setEditItemForm(p => ({ ...p, name: e.target.value }))} autoFocus
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Category *</label>
                  <select value={editItemForm.category || ""} onChange={e => setEditItemForm(p => ({ ...p, category: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", background: "white" }}>
                    {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Unit</label>
                  <select value={editItemForm.unit || ""} onChange={e => setEditItemForm(p => ({ ...p, unit: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", background: "white" }}>
                    {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Base Rate (Rs.)</label>
                  <input type="number" value={editItemForm.base_rate || ""} onChange={e => setEditItemForm(p => ({ ...p, base_rate: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Description / Scope</label>
                  <input value={editItemForm.description || ""} onChange={e => setEditItemForm(p => ({ ...p, description: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #E5E7EB", display: "flex", gap: 8 }}>
              <button onClick={closeEditItem}
                style={{ flex: 1, padding: "9px", borderRadius: 7, border: "1px solid #E5E7EB", background: "white", fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={saveEditItem} disabled={editItemSaving || !editItemForm.name?.trim()}
                style={{ flex: 2, padding: "9px", borderRadius: 7, background: (editItemSaving || !editItemForm.name?.trim()) ? "#9CA3AF" : "#2563EB", color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: (editItemSaving || !editItemForm.name?.trim()) ? "not-allowed" : "pointer" }}>
                {editItemSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add New Modals (type/city/pkg only — items handled by picker) ── */}
      <Modal open={!!addModal} onClose={() => setAddModal(null)}
        title={
          addModal === "type" ? "New Construction Type" :
          addModal === "city" ? "New City" :
          addModal === "pkg"  ? (addForm._editingId ? "Edit Package" : "New Package") :
          "New BOQ Item"
        }
        width={440}>
        {addModal === "type" && (
          <>
            <FormField label="Type Name" value={addForm.name||""} onChange={v => upd("name", v)} placeholder="e.g. Residential House, Villa, Commercial" required />
            <div style={{ height: 14 }} />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Color</label>
              <div style={{ display: "flex", gap: 8 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => upd("color", c)}
                    style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: (addForm.color||"#2563EB") === c ? "3px solid #111827" : "3px solid transparent" }} />
                ))}
              </div>
            </div>
          </>
        )}
        {addModal === "city" && (
          <>
            <FormField label="City Name" value={addForm.name||""} onChange={v => upd("name", v)} placeholder="e.g. Raipur, Bhilai, Durg" required />
            <div style={{ height: 12 }} />
            <FormField label="State" value={addForm.state||"Chhattisgarh"} onChange={v => upd("state", v)} placeholder="Chhattisgarh" />
          </>
        )}
        {addModal === "pkg" && (
          <>
            <FormField label="Package Name" value={addForm.name||""} onChange={v => upd("name", v)} placeholder="e.g. Basic, Standard, Premium" required />
            <div style={{ height: 12 }} />
            <div style={{ display: "flex", gap: 16 }}>
              <FormField label="Base Rate (Rs./sqft)" value={addForm.sqft_rate||""} onChange={v => upd("sqft_rate", parseFloat(v)||0)} type="number" half />
              <FormField label="Description" value={addForm.description||""} onChange={v => upd("description", v)} placeholder="Optional" half />
            </div>
          </>
        )}
        {addModal === "item" && (
          <>
            <FormField label="Item Name" value={addForm.name||""} onChange={v => upd("name", v)} placeholder="e.g. RCC Footing M25" required />
            <div style={{ height: 12 }} />
            <div style={{ display: "flex", gap: 16 }}>
              <FormSelect label="Category" value={addForm.category||catOptions[0]||""} onChange={v => upd("category", v)} options={catOptions} half required />
              <FormSelect label="Unit" value={addForm.unit||uomOptions[0]||""} onChange={v => upd("unit", v)} options={uomOptions} half />
            </div>
            <div style={{ height: 12 }} />
            <div style={{ display: "flex", gap: 16 }}>
              <FormField label="Base Rate (Rs.)" value={addForm.base_rate||""} onChange={v => upd("base_rate", parseFloat(v)||0)} type="number" half />
              <FormField label="Description / Scope" value={addForm.description||""} onChange={v => upd("description", v)} placeholder="Optional" half />
            </div>
          </>
        )}
        <ModalFooter onClose={() => setAddModal(null)} onSave={handleAdd} saveLabel={adding ? "Adding..." : "Add"} />
      </Modal>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// BOQ ITEM LIBRARY — standalone CRUD over boq_items
// Powers ClientBOQSection's picker. Sits in the sidebar under RATES & BOQ
// so users can manage the master list without going through a package.
// ═══════════════════════════════════════════════════════════════════════
function BoqItemLibrarySection() {
  const { items: rows, loading, save: apiSave, del: apiDel, reload } = useSection("boq-items");
  const { items: workCats }    = useSection("work-categories");
  const { items: uomList }     = useSection("uom");

  const catOptions = workCats.map(c => c.name);
  const uomOptions = uomList.length > 0 ? uomList.map(u => u.name) : ["Sq.Ft","CFT","Running Ft","Kg","Point","Unit","Lump Sum","Piece"];

  const [search,    setSearch]    = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [editing,   setEditing]   = useState(null);  // boq_items row or null
  const [showAdd,   setShowAdd]   = useState(false);
  const emptyForm = { name: "", category: catOptions[0] || "", unit: uomOptions[0] || "Sq.Ft", base_rate: 0, description: "" };
  const [form,    setForm]    = useState(emptyForm);
  const [saving,  setSaving]  = useState(false);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, category: catOptions[0] || "", unit: uomOptions[0] || "Sq.Ft" }); setShowAdd(true); };
  const openEdit   = (r) => { setEditing(r); setForm({ name: r.name||"", category: r.category||"", unit: r.unit||"", base_rate: r.base_rate||0, description: r.description||"" }); setShowAdd(true); };
  const closeForm  = () => { setShowAdd(false); setEditing(null); setForm(emptyForm); };

  const save = async () => {
    if (!form.name.trim()) return alert("Item name required");
    setSaving(true);
    const res = await apiSave({
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      base_rate: parseFloat(form.base_rate) || 0,
      description: form.description || "",
    }, editing?.id);
    setSaving(false);
    if (res?.success) closeForm();
    else alert(res?.message || "Save failed");
  };
  const del = async (r) => {
    if (!window.confirm("Delete \"" + r.name + "\" from the BOQ item library?")) return;
    await apiDel(r.id);
  };

  // ── Filter ──────────────────────────────────────────────────────────
  const filtered = rows.filter(r => {
    if (filterCat !== "All" && r.category !== filterCat) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (r.name||"").toLowerCase().includes(q)
        || (r.category||"").toLowerCase().includes(q)
        || (r.description||"").toLowerCase().includes(q);
  });

  // Cat tabs (with counts).
  const catCounts = rows.reduce((acc, r) => { const k = r.category || "Uncategorized"; acc[k] = (acc[k]||0)+1; return acc; }, {});
  const allCatPills = ["All", ...Object.keys(catCounts).sort()];

  return (
    <div style={{ fontFamily: "inherit" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 240 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items by name, category, or description…"
            style={{ flex: 1, maxWidth: 360, padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 12.5, outline: "none", fontFamily: "inherit" }}/>
          <span style={{ fontSize: 12, color: "#6B7280" }}>{filtered.length} / {rows.length} items</span>
        </div>
        <button onClick={openCreate}
          style={{ background: "#10B981", color: "white", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Add Item
        </button>
      </div>

      {/* Category pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {allCatPills.map(c => {
          const active = filterCat === c;
          const count  = c === "All" ? rows.length : (catCounts[c] || 0);
          return (
            <button key={c} onClick={() => setFilterCat(c)}
              style={{ padding: "5px 12px", borderRadius: 6,
                border: "1.5px solid " + (active ? "#7C3AED" : "#E5E7EB"),
                background: active ? "#7C3AED" : "white",
                color: active ? "white" : "#374151",
                fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
              {c} <span style={{ opacity: 0.75 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
          No items found. Click <strong>+ Add Item</strong> to create one.
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: 10, border: "1px solid #E5E7EB", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>Item</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", width: 140 }}>Category</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", width: 80 }}>Unit</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", width: 120 }}>Base Rate</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>Description</th>
                <th style={{ padding: "10px 8px",  textAlign: "center", width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr key={r.id} style={{ background: idx % 2 === 0 ? "white" : "#FAFAFA", borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "9px 14px", fontWeight: 600, fontSize: 13, color: "#111827" }}>{r.name}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#7C3AED", background: "#EDE9FE", padding: "2px 8px", borderRadius: 4 }}>{r.category || "—"}</span>
                  </td>
                  <td style={{ padding: "9px 14px", textAlign: "center", fontSize: 12, color: "#6B7280" }}>{r.unit || "—"}</td>
                  <td style={{ padding: "9px 14px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#374151" }}>Rs.{Number(r.base_rate || 0).toLocaleString()}</td>
                  <td style={{ padding: "9px 14px", fontSize: 12, color: "#6B7280" }}>{r.description || "—"}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center", whiteSpace: "nowrap" }}>
                    <button onClick={() => openEdit(r)} title="Edit"
                      style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", padding: 4, marginRight: 2 }}>
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => del(r)} title="Delete"
                      style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: 4 }}>
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit modal — Subcon-style */}
      {showAdd && (
        <div onClick={closeForm}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "white", borderRadius: 12, width: "min(540px, 95vw)", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
            <div style={{ background: "#0F172A", padding: "13px 18px", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{editing ? "Edit BOQ Item" : "New BOQ Item"}</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>Master library — used by Client BOQ Rate's picker.</div>
              </div>
              <button onClick={closeForm} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ gridColumn: "1 / 3" }}>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Item Name *</label>
                  <input value={form.name} onChange={e => upd("name", e.target.value)} autoFocus
                    placeholder="e.g. RCC Footing M25"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Category *</label>
                  <select value={form.category} onChange={e => upd("category", e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", background: "white" }}>
                    {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Unit</label>
                  <select value={form.unit} onChange={e => upd("unit", e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", background: "white" }}>
                    {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Base Rate (Rs.)</label>
                  <input type="number" value={form.base_rate || ""} onChange={e => upd("base_rate", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Description / Scope</label>
                  <input value={form.description} onChange={e => upd("description", e.target.value)}
                    placeholder="Optional"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #E5E7EB", display: "flex", gap: 8 }}>
              <button onClick={closeForm}
                style={{ flex: 1, padding: "9px", borderRadius: 7, border: "1px solid #E5E7EB", background: "white", fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving || !form.name.trim()}
                style={{ flex: 2, padding: "9px", borderRadius: 7, background: (saving || !form.name.trim()) ? "#9CA3AF" : "#2563EB", color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: (saving || !form.name.trim()) ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// 7. LABOUR RATE CARD (My idea)
// ═══════════════════════════════════════════════════════════════════════
function LabourRateSection() {
  const { items: labourRates, loading, save: apiSave, del: apiDel } = useSection("labour-rates");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ skill: "", category: "Skilled", dailyRate: 0, otRate: 0, city: "Raipur" });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const filtered = labourRates.filter(r => (r.skill||r.role||r.name||"").toLowerCase().includes(search.toLowerCase()));
  const openCreate = () => { setEditing(null); setForm({ role: "", category: "Skilled", rate: 0, overtime_rate: 0, description: "" }); setShowModal(true); };
  const openEdit = (r) => { setEditing(r); setForm({ role: r.role||r.skill||"", category: r.category||"Skilled", rate: r.rate||r.dailyRate||0, overtime_rate: r.overtime_rate||r.otRate||0, description: r.description||r.city||"" }); setShowModal(true); };
  const save = async () => { if (!form.role?.trim()&&!form.skill?.trim()) return; await apiSave({role: form.skill||form.role, category: form.category, unit: 'Day', rate: form.dailyRate||form.rate||0, overtime_rate: form.otRate||0, description: form.city||''}, editing?.id); setShowModal(false); };
  const del = (id) => apiDel(id);
  const catColors = { Skilled: { c: T.blue, bg: T.blueSoft }, "Semi-Skilled": { c: T.amber, bg: T.amberSoft }, Unskilled: { c: T.textMid, bg: T.borderLight }, Staff: { c: T.green, bg: T.greenSoft } };

  const columns = [
    { key: "role", label: "Labour Type / Skill", minW: 180, render: r => <span style={{ fontWeight: 600 }}>{r.role||r.skill}</span> },
    { key: "category", label: "Category", minW: 100, render: r => { const cc = catColors[r.category] || catColors.Skilled; return <Badge text={r.category||"Skilled"} color={cc.c} bg={cc.bg} />; }},
    { key: "rate", label: "Daily Rate", minW: 90, align: "right", render: r => <span style={{ fontWeight: 700 }}>Rs.{r.rate||r.dailyRate||0}</span> },
    { key: "overtime_rate", label: "OT/Hour", minW: 70, align: "right", render: r => (r.overtime_rate||r.otRate)>0 ? <span style={{ fontWeight: 600, color: T.amber }}>Rs.{r.overtime_rate||r.otRate}</span> : "—" },
    { key: "monthly", label: "Monthly (26d)", minW: 100, align: "right", render: r => <span style={{ fontWeight: 600, color: T.green }}>Rs.{((r.rate||r.dailyRate||0) * 26).toLocaleString()}</span> },
    { key: "description", label: "City/Area", minW: 70, render: r => <span>{r.description||r.city||"—"}</span> },
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="labour rates" onAdd={openCreate} addLabel="Add Labour Rate"
        templateConfig={{
          headers: ["Skill / Labour Type","Category","Daily Rate (Rs.)","OT Rate/Hour (Rs.)","City/Area"],
          sampleRows: [["Mason (Mistri)","Skilled","800","120","Raipur"],["Helper (Mazdoor)","Unskilled","450","70","Raipur"]],
          filename: "gb_labour_rates_export.csv", templateFilename: "gb_template_labour_rates.csv",
          instructions: "Instructions: Category must be Skilled, Semi-Skilled, Unskilled, or Staff. Skill and Daily Rate required.",
          mapRow: (r) => [r.skill, r.category, r.dailyRate, r.otRate, r.city],
        }}
        currentData={labourRates}
        onImportData={(rows) => { /* CSV import */ }}
      />
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Labour Rate" : "Add Labour Rate"} width={480}>
        <FormField label="Role / Labour Type" value={form.role||form.skill||""} onChange={v => upd("role", v)} placeholder="e.g. Mason (Mistri)" required />
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label="Category" value={form.category} onChange={v => upd("category", v)} options={["Skilled","Semi-Skilled","Unskilled","Staff"]} half />
          <FormField label="City / Area" value={form.city} onChange={v => upd("city", v)} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <FormField label="Daily Rate (Rs.)" value={form.rate || ""} onChange={v => upd("rate", parseFloat(v) || 0)} type="number" half required />
          <FormField label="OT Rate / Hour (Rs.)" value={form.overtime_rate || ""} onChange={v => upd("overtime_rate", parseFloat(v) || 0)} type="number" half />
        </div>
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={editing ? "Update" : "Add"} />
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 8. EQUIPMENT / MACHINERY MASTER (wired to /equipment/master)
// ═══════════════════════════════════════════════════════════════════════
function EquipmentSection() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("All"); // All | Owned | Rented
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const emptyForm = {
    name: "", code: "", type: "Earthwork",
    ownership: "rented", measurement_mode: "hourly",
    default_rate: 0, fuel_per_hour: 0,
    default_vendor_id: "", fuel_responsibility: "rent_included",
    registration_no: "", machine_type: "", capacity: "",
    maintenance_track: false, source: "",
  };
  const [form, setForm] = useState(emptyForm);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/equipment/master");
      if (res.success) setEquipment(res.data || []);
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get("/finance/parties").then(r => {
      if (r.success) {
        const list = (r.data || []).filter(p => {
          const t = String(p.type || "").toLowerCase();
          return t === "vendor" || t === "material vendor" || t === "supplier" || t === "material supplier" || t === "labour vendor";
        });
        setVendors(list);
      }
    }).catch(() => {});
  }, []);

  const filtered = equipment.filter(e => {
    const s = search.toLowerCase();
    const matches = (e.name || "").toLowerCase().includes(s)
      || (e.code || "").toLowerCase().includes(s)
      || (e.type || "").toLowerCase().includes(s);
    if (!matches) return false;
    if (ownerFilter === "All") return true;
    const own = String(e.ownership || "").toLowerCase();
    return ownerFilter === "Owned" ? own === "owned" : own === "rented";
  });

  const nextCode = (() => {
    const max = equipment.reduce((acc, e) => {
      const m = String(e.code || "").match(/^EQ-(\d+)$/i);
      return m ? Math.max(acc, parseInt(m[1], 10)) : acc;
    }, 0);
    return `EQ-${String(max + 1).padStart(3, "0")}`;
  })();

  const openCreate = () => {
    setEditing(null);
    setSaveErr("");
    setForm({ ...emptyForm, code: nextCode });
    setShowModal(true);
  };
  const openEdit = (e) => {
    setEditing(e);
    setSaveErr("");
    setForm({
      ...emptyForm,
      name: e.name || "",
      code: e.code || "",
      type: e.type || "Earthwork",
      ownership: String(e.ownership || "rented").toLowerCase(),
      measurement_mode: e.measurement_mode || "hourly",
      default_rate: e.default_rate || 0,
      fuel_per_hour: e.fuel_per_hour || 0,
      default_vendor_id: e.default_vendor_id || "",
      fuel_responsibility: e.fuel_responsibility || "rent_included",
      registration_no: e.registration_no || "",
      machine_type: e.machine_type || "",
      capacity: e.capacity || "",
      maintenance_track: !!e.maintenance_track,
      source: e.source || "",
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setSaveErr("Name is required"); return; }
    setSaving(true); setSaveErr("");
    const body = {
      name: form.name.trim(),
      code: form.code || "",
      type: form.type || "",
      ownership: form.ownership,
      measurement_mode: form.measurement_mode,
      default_rate: parseFloat(form.default_rate) || 0,
      fuel_per_hour: parseFloat(form.fuel_per_hour) || 0,
      default_vendor_id: form.ownership === "rented" ? (form.default_vendor_id || null) : null,
      fuel_responsibility: form.ownership === "rented" ? form.fuel_responsibility : null,
      registration_no: form.ownership === "owned" ? form.registration_no : "",
      machine_type: form.ownership === "owned" ? form.machine_type : "",
      capacity: form.ownership === "owned" ? form.capacity : "",
      maintenance_track: form.ownership === "owned" ? !!form.maintenance_track : false,
      source: form.source || "",
    };
    try {
      const res = editing
        ? await api.put("/equipment/master/" + editing.id, body)
        : await api.post("/equipment/master", body);
      if (res.success) {
        setShowModal(false);
        await load();
      } else {
        setSaveErr(res.message || "Save failed");
      }
    } catch (e) {
      setSaveErr(e.message || "Save failed");
    }
    setSaving(false);
  };

  const del = async (id) => {
    if (!window.confirm("Delete this equipment?")) return;
    try {
      const res = await api.del("/equipment/master/" + id);
      if (res.success) setEquipment(p => p.filter(x => x.id !== id));
      else alert(res.message || "Delete failed");
    } catch (e) { alert(e.message || "Delete failed"); }
  };

  const rateUnit = (mode) => mode === "hourly" ? "/hr" : mode === "daily" ? "/day" : " lump";
  const modeLabel = (mode) => mode === "hourly" ? "Hourly" : mode === "daily" ? "Daily" : "Fixed";

  const columns = [
    { key: "code", label: "Code", minW: 70, render: r => <code style={{ fontSize: 12, fontWeight: 600, color: T.teal, background: T.tealSoft, padding: "2px 8px", borderRadius: 4 }}>{r.code || "-"}</code> },
    { key: "name", label: "Equipment", minW: 200, render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: "type", label: "Type", minW: 90, render: r => r.type || <span style={{ color: T.textLight }}>—</span> },
    { key: "ownership", label: "Ownership", minW: 90, render: r => {
        const own = String(r.ownership || "").toLowerCase();
        return <Badge text={own === "owned" ? "Owned" : "Rented"} color={own === "owned" ? T.green : T.blue} bg={own === "owned" ? T.greenSoft : T.blueSoft} />;
      }},
    { key: "measurement_mode", label: "Mode", minW: 70, render: r => <span style={{ fontSize: 12, color: T.textMid }}>{modeLabel(r.measurement_mode)}</span> },
    { key: "default_rate", label: "Default Rate", minW: 110, align: "right", render: r => r.default_rate > 0
        ? <span style={{ fontWeight: 700 }}>₹{Number(r.default_rate).toLocaleString()}<span style={{ fontSize: 11, color: T.textLight, fontWeight: 500 }}>{rateUnit(r.measurement_mode)}</span></span>
        : <span style={{ color: T.textLight }}>—</span> },
    { key: "vendor", label: "Vendor", minW: 130, style: { fontSize: 12 }, render: r => {
        if (String(r.ownership || "").toLowerCase() === "owned") return <span style={{ color: T.textLight, fontSize: 12 }}>—</span>;
        const v = vendors.find(x => x.id === r.default_vendor_id);
        return v ? v.name : <span style={{ color: T.textLight }}>—</span>;
      }},
  ];

  const ownerFilterEl = (
    <div style={{ display: "flex", gap: 4, background: T.borderLight, padding: 3, borderRadius: 8 }}>
      {["All", "Owned", "Rented"].map(o => (
        <button key={o} onClick={() => setOwnerFilter(o)}
          style={{
            padding: "5px 11px", borderRadius: 6, border: "none",
            background: ownerFilter === o ? T.card : "transparent",
            color: ownerFilter === o ? T.text : T.textMid,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            boxShadow: ownerFilter === o ? T.shadow : "none",
          }}>{o}</button>
      ))}
    </div>
  );

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="equipment" onAdd={openCreate} addLabel="Add Equipment"
        filterEl={ownerFilterEl}
        templateConfig={{
          headers: ["Equipment Name","Code","Type","Ownership","Measurement Mode","Default Rate","Vendor"],
          sampleRows: [["JCB 3DX Backhoe Loader","EQ-001","Earthwork","Rented","hourly","850","Singh Cranes"],["Concrete Mixer 10/7","EQ-002","Concrete","Owned","daily","0",""]],
          filename: "gb_equipment_export.csv", templateFilename: "gb_template_equipment.csv",
          instructions: "Instructions: Ownership: owned or rented. Measurement Mode: hourly, daily or fixed. Type: Earthwork, Lifting, Concrete, Steel, Safety, Transport, Pumping, Compaction",
          mapRow: (e) => [e.name, e.code, e.type, e.ownership, e.measurement_mode, e.default_rate, vendors.find(v => v.id === e.default_vendor_id)?.name || ""],
        }}
        currentData={equipment}
        onImportData={async (rows) => {
          for (const r of rows) {
            if (!r["Equipment Name"]) continue;
            const vendorName = (r["Vendor"] || "").trim();
            const matchedVendor = vendorName ? vendors.find(v => v.name.toLowerCase() === vendorName.toLowerCase()) : null;
            await api.post("/equipment/master", {
              name: r["Equipment Name"],
              code: r["Code"] || "",
              type: r["Type"] || "Earthwork",
              ownership: (r["Ownership"] || "rented").toLowerCase(),
              measurement_mode: (r["Measurement Mode"] || "hourly").toLowerCase(),
              default_rate: parseFloat(r["Default Rate"]) || 0,
              default_vendor_id: matchedVendor?.id || null,
            }).catch(() => {});
          }
          await load();
        }}
      />
      {loading ? (
        <div style={{ background: T.card, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "40px 20px", textAlign: "center", color: T.textLight, fontSize: 13 }}>Loading equipment...</div>
      ) : (
        <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} />
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Equipment" : "Register Equipment"} width={680}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Equipment Name" value={form.name} onChange={v => upd("name", v)} placeholder="e.g. JCB 3DX Backhoe" half required />
          <FormField label="Code" value={form.code} onChange={v => upd("code", v)} placeholder={nextCode} half />
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label="Type" value={form.type} onChange={v => upd("type", v)} options={["Earthwork","Lifting","Concrete","Steel","Safety","Transport","Pumping","Compaction"]} half />
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>Ownership</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => upd("ownership", "rented")}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: T.radiusSm,
                  border: `1.5px solid ${form.ownership === "rented" ? T.blue : T.border}`,
                  background: form.ownership === "rented" ? T.blueSoft : "white",
                  color: form.ownership === "rented" ? T.blue : T.textMid,
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>Rented</button>
              <button onClick={() => upd("ownership", "owned")}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: T.radiusSm,
                  border: `1.5px solid ${form.ownership === "owned" ? T.green : T.border}`,
                  background: form.ownership === "owned" ? T.greenSoft : "white",
                  color: form.ownership === "owned" ? T.green : T.textMid,
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>Owned</button>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>Measurement Mode</label>
          <div style={{ display: "flex", gap: 6, background: T.borderLight, padding: 4, borderRadius: 8, width: "fit-content" }}>
            {[{ k: "hourly", l: "Hourly" }, { k: "daily", l: "Daily" }, { k: "fixed", l: "Fixed" }].map(m => (
              <button key={m.k} onClick={() => upd("measurement_mode", m.k)}
                style={{
                  padding: "7px 18px", borderRadius: 6, border: "none",
                  background: form.measurement_mode === m.k ? T.card : "transparent",
                  color: form.measurement_mode === m.k ? T.blue : T.textMid,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: form.measurement_mode === m.k ? T.shadow : "none",
                }}>{m.l}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField
            label={`Default Rate (₹${rateUnit(form.measurement_mode)})`}
            value={form.default_rate || ""}
            onChange={v => upd("default_rate", parseFloat(v) || 0)}
            type="number" half
            placeholder="0"
          />
          <FormField label="Fuel per hour (litres, optional)" value={form.fuel_per_hour || ""} onChange={v => upd("fuel_per_hour", parseFloat(v) || 0)} type="number" half placeholder="0" />
        </div>

        {form.ownership === "rented" && (
          <>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
              <FormSelect label="Default Vendor" value={form.default_vendor_id} onChange={v => upd("default_vendor_id", v)}
                options={[{ value: "", label: "— None —" }, ...vendors.map(v => ({ value: v.id, label: v.name }))]} half />
              <FormSelect label="Fuel Responsibility" value={form.fuel_responsibility} onChange={v => upd("fuel_responsibility", v)}
                options={[{ value: "rent_included", label: "Rent included" }, { value: "company", label: "Company pays" }]} half />
            </div>
          </>
        )}

        {form.ownership === "owned" && (
          <>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
              <FormField label="Registration Number" value={form.registration_no} onChange={v => upd("registration_no", v)} half placeholder="CG-04-XX-1234" />
              <FormField label="Machine Type" value={form.machine_type} onChange={v => upd("machine_type", v)} half placeholder="e.g. Backhoe" />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
              <FormField label="Capacity" value={form.capacity} onChange={v => upd("capacity", v)} half placeholder="e.g. 1 cum / 10 ton" />
              <div style={{ flex: 1, minWidth: 180, display: "flex", alignItems: "flex-end", paddingBottom: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.textMid, fontWeight: 600, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!form.maintenance_track} onChange={e => upd("maintenance_track", e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                  Track maintenance
                </label>
              </div>
            </div>
          </>
        )}

        {saveErr && <div style={{ marginTop: 8, padding: "8px 12px", background: T.redSoft, color: T.red, fontSize: 12, borderRadius: 6, fontWeight: 600 }}>{saveErr}</div>}

        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={saving ? "Saving..." : (editing ? "Update" : "Add Equipment")} />
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 9. UOM MASTER (My idea)
// ═══════════════════════════════════════════════════════════════════════
function UOMMasterSection() {
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name:"", symbol:"", type:"Weight" });
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));
  const TYPES = ["Weight","Area","Volume","Length","Count","Work","Time","Transport","Bulk","Flat"];
  const typeColors = { Weight:T.blue, Area:T.green, Volume:T.purple, Length:T.amber, Count:T.teal, Work:T.orange, Time:T.indigo, Transport:T.rose };

  const reload = () => {
    api.get("/library/uom").then(r=>{ if(r.success) setUoms(r.data||[]); setLoading(false); }).catch(()=>setLoading(false));
  };
  useEffect(()=>{ reload(); },[]);

  const filtered = uoms.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.symbol||"").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditing(null); setForm({name:"",symbol:"",type:"Weight"}); setShowModal(true); };
  const openEdit   = (u) => { setEditing(u); setForm({name:u.name,symbol:u.symbol||"",type:u.type||"Weight"}); setShowModal(true); };

  const save = async () => {
    if (!form.name.trim()) return;
    const isDup = uoms.some(u => u.name.toLowerCase()===form.name.toLowerCase() && u.id!==editing?.id);
    if (isDup) { alert(form.name+" already exists!"); return; }
    let res;
    if (editing) res = await api.put("/library/uom/"+editing.id, form);
    else res = await api.post("/library/uom", form);
    if (res.success) { reload(); setShowModal(false); }
    else alert(res.message||"Save failed");
  };

  const del = async (id) => {
    if (!await window.confirmAsync("Delete this unit?")) return;
    await api.del("/library/uom/"+id);
    reload();
  };

  const handleImport = async (rows) => {
    let added=0, skipped=0;
    for (const r of rows) {
      const name = r["Unit Name"]||r["name"]||"";
      if (!name) continue;
      if (uoms.some(u=>u.name.toLowerCase()===name.toLowerCase())) { skipped++; continue; }
      const res = await api.post("/library/uom",{ name, symbol:r["Symbol"]||r["symbol"]||"", type:r["Type"]||r["type"]||"Count" }).catch(()=>null);
      if (res?.success) added++;
    }
    reload();
    alert(added+" units added, "+skipped+" duplicates skipped");
  };

  const columns = [
    { key:"symbol", label:"Symbol", minW:80, render: r=><code style={{fontSize:12,fontWeight:700,color:T.blue,background:T.blueSoft,padding:"2px 8px",borderRadius:4}}>{r.symbol||"—"}</code> },
    { key:"name",   label:"Unit Name", minW:160, render: r=><span style={{fontWeight:600}}>{r.name}</span> },
    { key:"type",   label:"Type", minW:100, render: r=><Badge text={r.type||"—"} color={typeColors[r.type]||T.textMid} bg={(typeColors[r.type]||T.blue)+"15"}/> },
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="units"
        onAdd={openCreate} addLabel="Add Unit"
        templateConfig={{ headers:["Unit Name","Symbol","Type"], sampleRows:[["Kilogram","Kg","Weight"],["Square Feet","Sqft","Area"],["Piece","Pcs","Count"]], filename:"gb_uom_export.csv", templateFilename:"gb_template_uom.csv", instructions:"Type: Weight, Area, Volume, Length, Count, Work, Time, Transport, Bulk, Flat", mapRow:u=>[u.name,u.symbol||"",u.type||""] }}
        currentData={uoms} onImportData={handleImport}/>
      {loading?<div style={{padding:"40px",textAlign:"center",color:T.textLight}}>Loading...</div>
        :<DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} emptyMsg="No units found"/>}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editing?"Edit Unit":"Add Unit"} width={400}>
        <FormField label="Unit Name *" value={form.name} onChange={v=>upd("name",v)} placeholder="e.g. Kilogram" required/>
        <div style={{height:12}}/>
        <FormField label="Symbol" value={form.symbol} onChange={v=>upd("symbol",v)} placeholder="e.g. Kg"/>
        <div style={{height:12}}/>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:T.textMid,display:"block",marginBottom:5}}>Type</label>
          <SearchSelect value={form.type} options={TYPES} onChange={v=>upd("type",v)} placeholder="Select type..."/>
        </div>
        <ModalFooter onClose={()=>setShowModal(false)} onSave={save} saveLabel={editing?"Update":"Add"}/>
      </Modal>
    </div>
  );
}


function ExpenseHeadSection() {
  const { items: heads, loading, save: apiSave, del: apiDel } = useSection("expense-heads");
  const [search, setSearch] = useState("");
  const filtered = heads.filter(h => h.name.toLowerCase().includes(search.toLowerCase()));
  const groupColors = { "Direct Cost": T.blue, "Site Overhead": T.amber, "Admin Overhead": T.purple, Quality: T.green, Other: T.textMid };

  const columns = [
    { key: "code", label: "Code", minW: 70, render: r => <code style={{ fontSize: 12, fontWeight: 600, color: T.blue, background: T.blueSoft, padding: "2px 8px", borderRadius: 4 }}>{r.code}</code> },
    { key: "name", label: "Expense Head", minW: 200, render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: "type", label: "Type", minW: 110, render: r => <Badge text={r.type||r.group||"Other"} color={groupColors[r.type||r.group] || T.textMid} bg={(groupColors[r.type||r.group] || T.textMid) + "18"} /> },
    { key: "description", label: "Description", minW: 200, style: { fontSize: 12, color: T.textMid } },
  ];

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", type: "Material", description: "" });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const openCreate = () => { setEditing(null); setForm({ name:"", code:"", type:"Material", description:"" }); setShowModal(true); };
  const openEdit = (h) => { setEditing(h); setForm({ name: h.name, code: h.code||"", type: h.type||"Material", description: h.description||"" }); setShowModal(true); };
  const save = async () => { if (!form.name.trim()) return; await apiSave(form, editing?.id); setShowModal(false); };
  const del = (id) => apiDel(id);

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="expense heads" onAdd={openCreate} addLabel="Add Head"
        templateConfig={{
          headers: ["Expense Head","Code","Group","Tax Deductible"],
          sampleRows: [["Material Purchase","EH-001","Direct Cost","Yes"],["Labour Wages","EH-002","Direct Cost","Yes"],["Site Petty Cash","EH-006","Site Overhead","No"]],
          filename: "gb_expense_heads_export.csv", templateFilename: "gb_template_expense_heads.csv",
          instructions: "Instructions: Group: Direct Cost, Site Overhead, Admin Overhead, Quality, Other. Tax Deductible: Yes or No",
          mapRow: (h) => [h.name, h.code, h.group, h.taxDeductible ? "Yes" : "No"],
        }}
        currentData={heads}
        onImportData={() => {}}
      />
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Expense Head" : "Add Expense Head"} width={440}>
        <FormField label="Expense Head Name" value={form.name} onChange={v => upd("name", v)} placeholder="e.g. Material Purchase" required />
        <div style={{ height: 12 }} />
        <FormField label="Code" value={form.code} onChange={v => upd("code", v)} placeholder="e.g. EH-001" />
        <div style={{ height: 12 }} />
        <FormSelect label="Type" value={form.type} onChange={v => upd("type", v)} options={["Material","Labour","Equipment","Overhead","Other"]} />
        <div style={{ height: 12 }} />
        <FormTextarea label="Description" value={form.description||""} onChange={v => upd("description", v)} rows={2} />
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={saving ? "Saving..." : editing ? "Update" : "Create"} />
      </Modal>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// MAIN MASTER LIBRARY MODULE
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// DESIGN CATEGORIES & DRAWING TYPES
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// DESIGN LIBRARY — Unified Tab
// Sub-tabs: Categories | Drawing Types | Drawing Titles
// ═══════════════════════════════════════════════════════════════════════
function DesignLibrarySection() {
  const [subTab, setSubTab] = useState("categories"); // "categories" | "types" | "titles"

  // ── Shared data ──────────────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [drawTypes,  setDrawTypes]  = useState([]);
  const [titles,     setTitles]     = useState([]);
  const [loading,    setLoading]    = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [catRes, titRes] = await Promise.all([
        api.get("/design/categories"),
        api.get("/design/titles"),
      ]);
      if (catRes.success) {
        setCategories((catRes.data||[]).filter(i => i.type === "category"));
        setDrawTypes((catRes.data||[]).filter(i => i.type === "drawing_type"));
      }
      if (titRes.success) setTitles(titRes.data||[]);
    } catch(e) {}
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const catNames  = categories.map(c => c.name);
  const typeNames = drawTypes.map(t => t.name);

  // ── Modal state (shared) ─────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const [errMsg,    setErrMsg]    = useState("");
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = (defaults) => { setEditing(null); setForm(defaults); setErrMsg(""); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setErrMsg(""); };

  // ── Save handlers ────────────────────────────────────────────────────
  const saveCategory = async () => {
    if (!form.name?.trim()) return setErrMsg("Name required");
    setSaving(true);
    const payload = { name: form.name.trim(), type: "category", description: form.description || "" };
    const res = editing
      ? await api.put("/design/categories/" + editing.id, payload)
      : await api.post("/design/categories", payload);
    setSaving(false);
    if (res.success) { loadAll(); closeModal(); }
    else setErrMsg(res.message || "Save failed");
  };

  const saveType = async () => {
    if (!form.name?.trim()) return setErrMsg("Name required");
    setSaving(true);
    const payload = { name: form.name.trim(), type: "drawing_type", description: form.description || "" };
    const res = editing
      ? await api.put("/design/categories/" + editing.id, payload)
      : await api.post("/design/categories", payload);
    setSaving(false);
    if (res.success) { loadAll(); closeModal(); }
    else setErrMsg(res.message || "Save failed");
  };

  const saveTitle = async () => {
    if (!form.title?.trim()) return setErrMsg("Title required");
    setSaving(true);
    const payload = { title: form.title.trim(), category: form.category || "", type: form.type || "", description: form.description || "" };
    const res = editing
      ? await api.put("/design/titles/" + editing.id, payload)
      : await api.post("/design/titles", payload);
    setSaving(false);
    if (res.success) { loadAll(); closeModal(); }
    else setErrMsg(res.message || "Save failed");
  };

  const deleteItem = async (type, id) => {
    if (type === "title") await api.del("/design/titles/" + id);
    else await api.del("/design/categories/" + id);
    loadAll();
  };

  // ── Search state ─────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");

  // ── Sub-tab change resets search ─────────────────────────────────────
  const switchTab = (tab) => { setSubTab(tab); setSearch(""); setCatFilter("All"); };

  // ── Sub-tab pill style ───────────────────────────────────────────────
  const tabStyle = (id) => ({
    padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
    background: subTab === id ? "#2563EB" : "white",
    color: subTab === id ? "white" : "#6B7280",
    boxShadow: subTab === id ? "0 1px 4px rgba(37,99,235,0.3)" : "none",
  });

  // ── Filtered data ────────────────────────────────────────────────────
  const filteredCats  = categories.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const filteredTypes = drawTypes.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const filteredTitles = titles.filter(t =>
    (catFilter === "All" || t.category === catFilter) &&
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Sub-tab switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, background: "#F3F4F6", padding: 6, borderRadius: 10, width: "fit-content" }}>
        <button style={tabStyle("categories")} onClick={() => switchTab("categories")}>
          Drawing Categories <span style={{ marginLeft: 6, background: subTab==="categories"?"rgba(255,255,255,0.3)":"#E5E7EB", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{categories.length}</span>
        </button>
        <button style={tabStyle("types")} onClick={() => switchTab("types")}>
          Drawing Types <span style={{ marginLeft: 6, background: subTab==="types"?"rgba(255,255,255,0.3)":"#E5E7EB", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{drawTypes.length}</span>
        </button>
        <button style={tabStyle("titles")} onClick={() => switchTab("titles")}>
          Drawing Titles <span style={{ marginLeft: 6, background: subTab==="titles"?"rgba(255,255,255,0.3)":"#E5E7EB", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{titles.length}</span>
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={"Search " + (subTab === "categories" ? "categories" : subTab === "types" ? "drawing types" : "titles") + "..."}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 13, width: 240, fontFamily: "inherit" }} />
          {/* Category filter for titles */}
          {subTab === "titles" && (
            <div style={{minWidth:180}}>
              <SearchSelect value={catFilter} options={["All",...catNames]} onChange={setCatFilter} placeholder="Filter category..."/>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            if (subTab === "categories") openCreate({ name: "", description: "" });
            else if (subTab === "types")  openCreate({ name: "", description: "" });
            else openCreate({ title: "", category: catNames[0] || "", type: typeNames[0] || "", description: "" });
          }}
          style={{ padding: "9px 20px", background: "#2563EB", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          + {subTab === "categories" ? "Add Category" : subTab === "types" ? "Add Type" : "Add Title"}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 50, color: "#9CA3AF" }}>Loading...</div>
      ) : subTab === "categories" ? (
        /* ── Categories grid ── */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 }}>
          {filteredCats.map(cat => (
            <div key={cat.id} style={{ background: "white", borderRadius: 10, border: "1px solid #E5E7EB", padding: "14px 16px", borderLeft: "4px solid #2563EB" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{cat.name}</div>
                  {cat.description && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>{cat.description}</div>}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { setEditing(cat); setForm({ name: cat.name, description: cat.description||"" }); setErrMsg(""); setShowModal(true); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><IcEdit size={14} /></button>
                  <button onClick={() => deleteItem("category", cat.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }}><IcTrash size={14} /></button>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#9CA3AF" }}>
                {titles.filter(t => t.category === cat.name).length} titles
              </div>
            </div>
          ))}
          {filteredCats.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#9CA3AF" }}>No categories found</div>}
        </div>
      ) : subTab === "types" ? (
        /* ── Drawing Types grid ── */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 10 }}>
          {filteredTypes.map(dt => (
            <div key={dt.id} style={{ background: "white", borderRadius: 10, border: "1px solid #E5E7EB", padding: "14px 16px", borderLeft: "4px solid #7C3AED" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{dt.name}</div>
                  {dt.description && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>{dt.description}</div>}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { setEditing(dt); setForm({ name: dt.name, description: dt.description||"" }); setErrMsg(""); setShowModal(true); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><IcEdit size={14} /></button>
                  <button onClick={() => deleteItem("type", dt.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }}><IcTrash size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {filteredTypes.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#9CA3AF" }}>No drawing types found</div>}
        </div>
      ) : (
        /* ── Drawing Titles table ── */
        <DataTable
          columns={[
            { key: "title",    label: "Drawing Title", minW: 220, render: r => <span style={{ fontWeight: 600 }}>{r.title}</span> },
            { key: "category", label: "Category",      minW: 130, render: r => r.category ? <Badge text={r.category} color="#2563EB" bg="#DBEAFE" /> : <span style={{ color: "#9CA3AF" }}>—</span> },
            { key: "type",     label: "Drawing Type",  minW: 110, render: r => r.type ? <Badge text={r.type} color="#7C3AED" bg="#EDE9FE" /> : <span style={{ color: "#9CA3AF" }}>—</span> },
            { key: "description", label: "Description", minW: 200, render: r => <span style={{ fontSize: 12, color: "#6B7280" }}>{r.description || "—"}</span> },
          ]}
          data={filteredTitles}
          onEdit={t => { setEditing(t); setForm({ title: t.title, category: t.category||"", type: t.type||"", description: t.description||"" }); setErrMsg(""); setShowModal(true); }}
          onDelete={t => deleteItem("title", t.id)}
          emptyMsg="No drawing titles found"
        />
      )}

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      <Modal open={showModal} onClose={closeModal}
        title={
          subTab === "categories" ? (editing ? "Edit Category" : "Add Drawing Category") :
          subTab === "types"      ? (editing ? "Edit Drawing Type" : "Add Drawing Type") :
                                    (editing ? "Edit Drawing Title" : "Add Drawing Title")
        } width={460}>
        {(subTab === "categories" || subTab === "types") && (
          <>
            <FormField label="Name" value={form.name||""} onChange={v => upd("name", v)}
              placeholder={subTab === "categories" ? "e.g. Architectural, Structural" : "e.g. Plan, Elevation, Section"}
              required />
            <div style={{ height: 12 }} />
            <FormField label="Description (optional)" value={form.description||""} onChange={v => upd("description", v)} placeholder="Brief description" />
          </>
        )}
        {subTab === "titles" && (
          <>
            <FormField label="Drawing Title" value={form.title||""} onChange={v => upd("title", v)} placeholder="e.g. Ground Floor Plan" required />
            <div style={{ height: 12 }} />
            <div style={{ display: "flex", gap: 16 }}>
              <FormSelect label="Category" value={form.category||""} onChange={v => upd("category", v)} options={catNames} half />
              <FormSelect label="Drawing Type" value={form.type||""} onChange={v => upd("type", v)} options={typeNames} half />
            </div>
            <div style={{ height: 12 }} />
            <FormField label="Description (optional)" value={form.description||""} onChange={v => upd("description", v)} placeholder="Brief description" />
          </>
        )}
        {errMsg && <div style={{ color: "#EF4444", fontSize: 12, marginTop: 8 }}>{errMsg}</div>}
        <ModalFooter onClose={closeModal}
          onSave={subTab === "categories" ? saveCategory : subTab === "types" ? saveType : saveTitle}
          saveLabel={saving ? "Saving..." : editing ? "Update" : "Add"} />
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// WORKERS / LABOUR LIBRARY
// ═══════════════════════════════════════════════════════════════════════
const WORKER_ROLES = ["Mason","Labour","Helper","Electrician","Plumber","Carpenter","Painter","Supervisor","Welder","Tile Fixer","Polisher","Bar Bender","Shuttering","Other"];
const WORKER_CATS  = ["Skilled","Semi-Skilled","Unskilled","Supervisor","Staff"];
const ROLE_CAT_MAP = { Mason:"Skilled", Electrician:"Skilled", Plumber:"Skilled", Carpenter:"Skilled", Welder:"Skilled", "Tile Fixer":"Skilled", Polisher:"Skilled", "Bar Bender":"Skilled", Shuttering:"Skilled", Labour:"Unskilled", Helper:"Unskilled", Supervisor:"Supervisor", Painter:"Semi-Skilled", Other:"Semi-Skilled" };
const catC = { Skilled:{c:T.blue,bg:T.blueSoft}, "Semi-Skilled":{c:T.amber,bg:T.amberSoft}, Unskilled:{c:T.textMid,bg:T.borderLight}, Supervisor:{c:T.green,bg:T.greenSoft}, Staff:{c:T.purple,bg:T.purpleSoft} };

function WorkersSection() {
  const { items: workers, loading, save: apiSave, del: apiDel, reload } = useSection("workers");
  const [search, setSearch]     = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [saving, setSaving]         = useState(false);
  const emptyForm = { name:"", role:"Mason", category:"Skilled", daily_rate:0, phone:"", city:"", address:"", id_number:"", status:"Active" };
  const [form, setForm] = useState(emptyForm);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const filtered = workers.filter(w => {
    const q = search.toLowerCase();
    const matchQ = !q || (w.name||"").toLowerCase().includes(q) || (w.role||"").toLowerCase().includes(q) || (w.phone||"").includes(q);
    const matchR = filterRole === "All" || w.role === filterRole;
    return matchQ && matchR;
  });

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit   = (w) => { setEditing(w); setForm({ name:w.name||"", role:w.role||"Mason", category:w.category||"Skilled", daily_rate:w.daily_rate||0, phone:w.phone||"", city:w.city||"", address:w.address||"", id_number:w.id_number||"", status:w.status||"Active" }); setShowModal(true); };

  const save = async () => {
    if (!form.name.trim()) return alert("Worker name required");
    setSaving(true);
    const res = await apiSave({ ...form, daily_rate: parseFloat(form.daily_rate)||0 }, editing?.id);
    setSaving(false);
    if (res.success) setShowModal(false);
    else alert(res.message || "Save failed");
  };

  const templateConfig = {
    headers: ["Worker Name","Skill / Role","Category","Daily Rate (Rs.)","Phone","City","Aadhar / ID","Status"],
    sampleRows: [
      ["Ramesh Kumar","Mason","Skilled","700","9876543210","Raipur","1234-5678-9012","Active"],
      ["Suresh Yadav","Helper","Unskilled","400","9812345678","Bhilai","","Active"],
      ["Dinesh Sahu","Electrician","Skilled","800","","Raipur","","Active"],
    ],
    filename: "gb_workers_export.csv",
    templateFilename: "gb_template_workers.csv",
    instructions: "Worker Name and Skill/Role are required. Category: Skilled, Semi-Skilled, Unskilled, Supervisor, Staff.",
    mapRow: (w) => [w.name, w.role, w.category, w.daily_rate, w.phone, w.city, w.id_number, w.status],
  };

  const handleImport = async (rows) => {
    const mapped = rows.map(r => ({
      name:       (r["Worker Name"] || "").trim(),
      role:       (r["Skill / Role"] || r["role"] || "Labour").trim(),
      category:   (r["Category"]    || "Unskilled").trim(),
      daily_rate: parseFloat(r["Daily Rate (Rs.)"] || r["daily_rate"] || 0),
      phone:      (r["Phone"]       || "").trim(),
      city:       (r["City"]        || "").trim(),
      id_number:  (r["Aadhar / ID"] || "").trim(),
      status:     (r["Status"]      || "Active").trim(),
    })).filter(r => r.name);
    const res = await api.post("/library/workers/bulk", { rows: mapped });
    if (res.success) await reload();
    return res.data;
  };

  // Summary by role
  const roleSummary = {};
  workers.forEach(w => { roleSummary[w.role] = (roleSummary[w.role]||0)+1; });

  const columns = [
    { key:"name",       label:"Worker Name",   minW:180, render: w => (
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <div style={{width:30,height:30,borderRadius:"50%",background:T.blueSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:T.blue,flexShrink:0}}>
          {(w.name||"?")[0].toUpperCase()}
        </div>
        <div>
          <div style={{fontWeight:600,color:T.text}}>{w.name}</div>
          {w.phone&&<div style={{fontSize:11,color:T.textLight}}>{w.phone}</div>}
        </div>
      </div>
    )},
    { key:"role",       label:"Skill / Role",  minW:120, render: w => {
      const cc = catC[w.category||"Unskilled"] || catC.Unskilled;
      return <Badge text={w.role||"Labour"} color={cc.c} bg={cc.bg} />;
    }},
    { key:"category",   label:"Category",      minW:100, render: w => {
      const cc = catC[w.category||"Unskilled"] || catC.Unskilled;
      return <span style={{fontSize:11,color:cc.c,fontWeight:600}}>{w.category||"Unskilled"}</span>;
    }},
    { key:"daily_rate", label:"Daily Rate",     minW:90, align:"right", render: w => (
      <span style={{fontWeight:700,color:T.green}}>₹{(w.daily_rate||0).toLocaleString()}</span>
    )},
    { key:"monthly",    label:"Monthly (26d)",  minW:100, align:"right", render: w => (
      <span style={{fontWeight:600,color:T.textMid}}>₹{((w.daily_rate||0)*26).toLocaleString()}</span>
    )},
    { key:"city",       label:"City",           minW:80,  render: w => <span style={{color:T.textMid}}>{w.city||"—"}</span>},
    { key:"status",     label:"Status",         minW:70,  render: w => (
      <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:10,background:w.status==="Active"?T.greenSoft:T.borderLight,color:w.status==="Active"?T.green:T.textMid}}>{w.status||"Active"}</span>
    )},
  ];

  // Unique roles for filter pills
  const roles = ["All", ...Array.from(new Set(workers.map(w=>w.role).filter(Boolean))).sort()];

  return (
    <div>
      {/* Role summary strip */}
      {workers.length > 0 && (
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
          {Object.entries(roleSummary).sort((a,b)=>b[1]-a[1]).map(([role,cnt])=>{
            const cc = catC[ROLE_CAT_MAP[role]||"Unskilled"] || catC.Unskilled;
            return (
              <div key={role} onClick={()=>setFilterRole(r=>r===role?"All":role)}
                style={{padding:"6px 14px",borderRadius:20,background:filterRole===role?cc.c:cc.bg,color:filterRole===role?"white":cc.c,border:`1px solid ${cc.c}33`,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}>
                {role}
                <span style={{fontSize:10,fontWeight:700,background:filterRole===role?"rgba(255,255,255,.25)":cc.c+"22",borderRadius:10,padding:"1px 6px"}}>{cnt}</span>
              </div>
            );
          })}
          {filterRole!=="All"&&<button onClick={()=>setFilterRole("All")} style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${T.border}`,background:"white",color:T.textMid,fontSize:11,cursor:"pointer"}}>✕ Clear</button>}
        </div>
      )}

      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="workers" onAdd={openCreate} addLabel="+ Add Worker"
        templateConfig={templateConfig} currentData={workers} onImportData={handleImport} />

      {loading ? (
        <div style={{textAlign:"center",padding:"40px 0",color:T.textLight}}>Loading...</div>
      ) : (
        <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={id=>apiDel(id)}
          emptyMsg={search||filterRole!=="All" ? "No workers match your filter" : "No workers yet — add your first worker"} />
      )}

      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editing?"Edit Worker":"Add Worker"} desc="Register worker with skill and daily rate" width={560}>
        {/* Name */}
        <FormField label="Full Name" value={form.name} onChange={v=>upd("name",v)} placeholder="e.g. Ramesh Kumar" required />
        <div style={{height:14}}/>
        {/* Role + Category */}
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:14}}>
          <div style={{flex:1,minWidth:180}}>
            <label style={{fontSize:12,fontWeight:600,color:T.textMid,display:"block",marginBottom:6}}>Skill / Role <span style={{color:T.red}}>*</span></label>
            <SearchSelect value={form.role} options={WORKER_ROLES}
              onChange={v=>{upd("role",v);upd("category",ROLE_CAT_MAP[v]||"Semi-Skilled");}}
              placeholder="Select role..."/>
          </div>
          <div style={{flex:1,minWidth:180}}>
            <label style={{fontSize:12,fontWeight:600,color:T.textMid,display:"block",marginBottom:6}}>Category</label>
            <SearchSelect value={form.category} options={WORKER_CATS} onChange={v=>upd("category",v)} placeholder="Select category..."/>
          </div>
        </div>
        {/* Rate */}
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:14}}>
          <FormField label="Daily Rate (₹)" value={form.daily_rate||""} onChange={v=>upd("daily_rate",v)} type="number" placeholder="e.g. 650" half required />
          <div style={{flex:1,minWidth:180}}>
            <label style={{fontSize:12,fontWeight:600,color:T.textMid,display:"block",marginBottom:6}}>Status</label>
            <SearchSelect value={form.status} options={["Active","Inactive","Blacklisted"]} onChange={v=>upd("status",v)} placeholder="Select status..."/>
          </div>
        </div>
        {/* Contact */}
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:14}}>
          <FormField label="Phone" value={form.phone} onChange={v=>upd("phone",v)} placeholder="Mobile number" type="tel" half />
          <FormField label="City / Area" value={form.city} onChange={v=>upd("city",v)} placeholder="e.g. Raipur" half />
        </div>
        {/* ID */}
        <FormField label="Aadhar / ID Number" value={form.id_number} onChange={v=>upd("id_number",v)} placeholder="Optional — for identity verification" />
        <div style={{height:14}}/>
        <FormTextarea label="Address" value={form.address} onChange={v=>upd("address",v)} placeholder="Optional" rows={2} />
        {/* Rate preview */}
        {form.daily_rate>0&&(
          <div style={{marginTop:14,padding:"10px 14px",borderRadius:8,background:T.greenSoft,border:`1px solid ${T.green}22`,display:"flex",gap:20}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:T.textMid,marginBottom:2}}>Daily</div>
              <div style={{fontSize:15,fontWeight:700,color:T.green}}>₹{parseFloat(form.daily_rate||0).toLocaleString()}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:T.textMid,marginBottom:2}}>Weekly (6d)</div>
              <div style={{fontSize:15,fontWeight:700,color:T.green}}>₹{(parseFloat(form.daily_rate||0)*6).toLocaleString()}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:T.textMid,marginBottom:2}}>Monthly (26d)</div>
              <div style={{fontSize:15,fontWeight:700,color:T.green}}>₹{(parseFloat(form.daily_rate||0)*26).toLocaleString()}</div>
            </div>
          </div>
        )}
        <ModalFooter onClose={()=>setShowModal(false)} onSave={save} saveLabel={saving?"Saving...":editing?"Update Worker":"Add Worker"} />
      </Modal>
    </div>
  );
}

const masterSections = [
  { id: "material_cat",  label: "Material Category",   Icon: IcFolder,    Comp: MaterialCategorySection,  section: "INVENTORY", countKey: "material_categories", color: T.blue },
  { id: "materials",     label: "Material Master",     Icon: IcBox,       Comp: MaterialMasterSection,    section: null, countKey: "materials", color: T.teal },
  { id: "work_cat",      label: "Work Category",       Icon: IcTool,      Comp: WorkCategorySection,      section: null, countKey: "work_categories", color: T.purple },
  { id: "party",         label: "Party / Supplier",    Icon: IcUsers,     Comp: PartyMasterSection,       section: "PEOPLE", countKey: "parties", color: T.green },
  { id: "subcon",        label: "Subcontractors",      Icon: IcHardHat,   Comp: SubcontractorSection,     section: null, countKey: "subcontractors", color: T.amber },
  { id: "workers",       label: "Workers",             Icon: IcHardHat,   Comp: WorkersSection,           section: null, countKey: "workers", color: T.blue },
  { id: "subcon_rate",   label: "Subcon Rate Card",    Icon: IcDollar,    Comp: SubconRateCardSection,    section: null, countKey: null, color: T.teal },
  { id: "labour",        label: "Labour Rate Card",    Icon: IcUsers,     Comp: LabourRateSection,        section: null, countKey: "labour_rates", color: T.orange },
  { id: "boq_items",     label: "BOQ Item Library",    Icon: IcBox,       Comp: BoqItemLibrarySection,    section: "RATES & BOQ", countKey: null, color: T.purple },
  { id: "client_boq",    label: "Client BOQ Rate",     Icon: IcClipboard, Comp: ClientBOQSection,         section: null, countKey: null, color: T.indigo },
  { id: "equipment",     label: "Equipment / Machinery", Icon: IcTruck,   Comp: EquipmentSection,         section: "ASSETS", countKey: "equipment", color: T.rose },
  { id: "design_library", label: "Design Library",     Icon: IcLayers,    Comp: DesignLibrarySection,     section: "DESIGN LIBRARY", countKey: null, color: T.purple },
  { id: "uom",           label: "Units (UOM)",         Icon: IcRuler,     Comp: UOMMasterSection,         section: null, countKey: "uom", color: T.teal },
  { id: "expense_head",  label: "Expense Heads",       Icon: IcDollar,    Comp: ExpenseHeadSection,       section: null, count: "14", color: T.amber },
];

export default function MasterLibraryModule() {
  const [summaryCounts, setSummaryCounts] = useState({});
  const [dbProjects, setDbProjects] = useState([]);
  useEffect(() => {
    api.get("/library/summary").then(r => { if(r.success) setSummaryCounts(r.data); }).catch(()=>{});
    api.get("/projects").then(r => { if(r.success&&r.data) setDbProjects(r.data); }).catch(()=>{});
  }, []);
  const [activeSection, setActiveSection] = useState("materials");
  const ActiveComp = masterSections.find(s => s.id === activeSection)?.Comp || MaterialMasterSection;
  const active = masterSections.find(s => s.id === activeSection);

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, fontFamily: T.font, overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 260, background: T.card, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IcGrid size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: "-0.3px" }}>Master Library</div>
              <div style={{ fontSize: 11, color: T.textLight }}>Central Data Repository</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {masterSections.map(item => {
            const isActive = activeSection === item.id;
            return (
              <div key={item.id}>
                {item.section && <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, letterSpacing: "1.2px", textTransform: "uppercase", padding: "16px 20px 6px" }}>{item.section}</div>}
                <button onClick={() => setActiveSection(item.id)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", border: "none", cursor: "pointer", background: isActive ? T.blueSoft : "transparent", borderRight: isActive ? `3px solid ${T.blue}` : "3px solid transparent", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.borderLight; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: isActive ? item.color + "18" : T.borderLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <item.Icon size={15} color={isActive ? item.color : T.textLight} />
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 650 : 450, color: isActive ? T.blue : T.textMid, textAlign: "left" }}>{item.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.textLight, background: T.borderLight, padding: "2px 7px", borderRadius: 10 }}>{item.count}</span>
                </button>
              </div>
            );
          })}
        </nav>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textLight }}>Construction Manager v2.1</div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 28px", background: T.card, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{active?.label}</div>
            <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>
              {activeSection === "materials" && "Central material database with rates, HSN codes, and stock levels"}
              {activeSection === "material_cat" && "Organize materials into categories and subcategories"}
              {activeSection === "party" && "Suppliers, clients, transporters, and other business parties"}
              {activeSection === "work_cat" && "Types of construction work with base rates"}
              {activeSection === "subcon" && "Subcontractor firms, trade specialties, and rate cards"}
              {activeSection === "boq" && "Project-wise client BOQ with cost vs client rate comparison"}
              {activeSection === "workers" && "Register individual workers with skill, daily rate, and contact info"}
              {activeSection === "labour" && "Daily wages and overtime rates for all skill levels"}
              {activeSection === "equipment" && "Owned and rented machinery with tracking"}
              {activeSection === "uom" && "Standard units of measurement used across the system"}
              {activeSection === "expense_head" && "Expense categories for accounting and reporting"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textLight }}>
            <span>Master Library</span><IcChevR size={12} color={T.textLight} /><span style={{ color: T.blue, fontWeight: 600 }}>{active?.label}</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <ActiveComp dbProjects={dbProjects} />
        </div>
      </div>
    </div>
  );
}
