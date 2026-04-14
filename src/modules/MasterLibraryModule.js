import { useState, useMemo, useEffect, useCallback } from "react";
import api from "../config/api";

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

function FormSelect({ label, value, onChange, options, half = false, required = false }) {
  return (
    <div style={{ flex: half ? 1 : undefined, minWidth: half ? 180 : undefined }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>
        {label}{required && <span style={{ color: T.red }}> *</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, fontSize: 13.5, color: T.text, background: "white", outline: "none", cursor: "pointer", fontFamily: T.font, boxSizing: "border-box" }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
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
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  // Skip instruction rows (first rows that don't look like headers)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const cols = lines[i].split(",");
    if (cols.length >= 2 && cols[0].trim() && cols[1].trim()) { headerIdx = i; break; }
  }
  const headers = lines[headerIdx].split(",").map(h => h.replace(/^"|"$/g, "").replace(/""/g, '"').replace(/ \*/g, "").trim());
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

  const doImport = () => {
    if (!preview || !preview.rows.length) return;
    setImporting(true);
    setTimeout(() => {
      const validRows = preview.rows.filter(r => {
        const firstKey = Object.keys(r)[0];
        return r[firstKey] && r[firstKey].trim();
      });
      onImport(validRows);
      setResult({ success: validRows.length, skipped: preview.rows.length - validRows.length });
      setImporting(false);
    }, 600);
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
  const { items: cats, loading, save: apiSave, del: apiDel } = useSection("material-categories");
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

  const handleImport = (rows) => {
    const newCats = rows.map((r, i) => ({
      id: Date.now() + i,
      name: r["Category Name"] || r["name"] || "",
      code: r["Code"] || r["code"] || "",
      desc: r["Description"] || r["desc"] || "",
      items: 0,
    })).filter(c => c.name);
    setCats(prev => [...prev, ...newCats]);
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
  const { items: materials, loading, save: apiSave, del: apiDel } = useSection("materials");
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
  const handleMatImport = (rows) => {
    const items = rows.map((r, i) => ({
      id: Date.now() + i, name: r["Material Name"] || "", code: r["Code"] || `MAT-${String(materials.length + i + 1).padStart(3, "0")}`,
      category: r["Category"] || "Cement & Binding", unit: r["Unit"] || "Kg", hsnCode: r["HSN Code"] || "",
      gstRate: parseInt(r["GST Rate %"]) || 18, baseRate: parseFloat(r["Base Rate (Rs.)"]) || 0,
      lastRate: parseFloat(r["Last Purchase Rate"]) || 0, supplier: r["Preferred Supplier"] || "",
      minStock: parseInt(r["Min Stock Level"]) || 0, currentStock: parseInt(r["Current Stock"]) || 0,
    })).filter(m => m.name);
    setMaterials(prev => [...prev, ...items]);
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
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 12, color: T.text, background: "white", cursor: "pointer", fontFamily: T.font }}>
            {allCats.map(c => <option key={c}>{c}</option>)}
          </select>
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
  useEffect(() => {
    api.get("/finance/parties").then(res => { if(res.success) setParties(res.data||[]); }).catch(()=>{});
  }, []);
    const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { name: "", type: "Supplier", category: "", gstin: "", pan: "", contact: "", phone: "", email: "", address: "", city: "Raipur", state: "Chhattisgarh", pincode: "", bankName: "", accNo: "", ifsc: "", rating: 0 };
  const [form, setForm] = useState(emptyForm);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const types = ["All", "Supplier", "Client", "Subcontractor", "Transporter", "Consultant"];
  const typeColors = { Supplier: { c: T.blue, bg: T.blueSoft }, Client: { c: T.green, bg: T.greenSoft }, Subcontractor: { c: T.purple, bg: T.purpleSoft }, Transporter: { c: T.amber, bg: T.amberSoft }, Consultant: { c: T.teal, bg: T.tealSoft } };

  const filtered = parties.filter(p => {
    if (filterType !== "All" && p.type !== filterType) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.contact.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...emptyForm, ...p }); setShowModal(true); };
  const save = () => {
    if (!form.name.trim()) return;
    if (editing) { setParties(prev => prev.map(p => p.id === editing.id ? { ...p, ...form } : p)); }
    else { setParties(prev => [...prev, { ...form, id: Date.now(), balance: 0 }]); }
    setShowModal(false);
  };
  const del = (id) => setParties(prev => prev.filter(p => p.id !== id));

  const partyTemplateConfig = {
    headers: ["Party Name", "Type", "Category/Trade", "Contact Person", "Phone", "Email", "GSTIN", "City"],
    sampleRows: [
      ["UltraTech Cement Ltd", "Supplier", "Cement", "Rajesh Agrawal", "+91 98765 10001", "rajesh@ultratech.com", "22AABCU1234F1Z5", "Raipur"],
      ["Sample Client", "Client", "Residential", "Contact Person", "+91 98765 00000", "client@email.com", "", "City"],
    ],
    filename: "gb_parties_export.csv",
    templateFilename: "gb_template_parties.csv",
    instructions: "Instructions: Type must be Supplier, Client, Subcontractor, Transporter, or Consultant. Party Name and Type are required.",
    mapRow: (p) => [p.name, p.type, p.category, p.contact, p.phone, p.email, p.gstin, p.city],
  };
  const handlePartyImport = (rows) => {
    const items = rows.map((r, i) => ({
      id: Date.now() + i, name: r["Party Name"] || "", type: r["Type"] || "Supplier",
      category: r["Category/Trade"] || "", contact: r["Contact Person"] || "",
      phone: r["Phone"] || "", email: r["Email"] || "", gstin: r["GSTIN"] || "",
      city: r["City"] || "Raipur", rating: 0, balance: 0,
    })).filter(p => p.name);
    setParties(prev => [...prev, ...items]);
  };

  const columns = [
    { key: "name", label: "Party Name", minW: 180, render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: "type", label: "Type", minW: 100, render: r => { const tc = typeColors[r.type] || { c: T.textMid, bg: T.borderLight }; return <Badge text={r.type} color={tc.c} bg={tc.bg} />; }},
    { key: "contact", label: "Contact Person", minW: 120 },
    { key: "phone", label: "Phone", minW: 130, style: { fontFamily: "monospace", fontSize: 12 } },
    { key: "city", label: "City", minW: 80 },
    { key: "gstin", label: "GSTIN", minW: 140, render: r => r.gstin ? <span style={{ fontFamily: "monospace", fontSize: 11.5 }}>{r.gstin}</span> : <span style={{ color: T.textLight }}>—</span> },
    { key: "balance", label: "Balance", minW: 100, align: "right", render: r => (
      <span style={{ fontWeight: 700, color: r.balance > 0 ? T.green : r.balance < 0 ? T.red : T.textMid }}>
        {r.balance > 0 ? "+" : ""}{r.balance !== 0 ? `Rs.${Math.abs(r.balance).toLocaleString()}` : "—"}
      </span>
    )},
    { key: "rating", label: "Rating", minW: 60, align: "center", render: r => r.rating > 0 ? (
      <div style={{ display: "flex", gap: 1, justifyContent: "center" }}>{[1,2,3,4,5].map(i => <IcStar key={i} size={12} color={i <= r.rating ? T.amber : T.borderLight} fill={i <= r.rating ? T.amber : "none"} strokeWidth={0} />)}</div>
    ) : <span style={{ color: T.textLight, fontSize: 11 }}>N/A</span> },
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="parties" onAdd={openCreate} addLabel="Add Party"
        templateConfig={partyTemplateConfig} currentData={parties} onImportData={handlePartyImport}
        filterEl={<select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 12, color: T.text, background: "white", cursor: "pointer", fontFamily: T.font }}>{types.map(t => <option key={t}>{t}</option>)}</select>}
      />
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Party" : "Add Party"} desc="Party / supplier / client details" width={660}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Party Name" value={form.name} onChange={v => upd("name", v)} placeholder="Full legal name" half required />
          <FormSelect label="Type" value={form.type} onChange={v => upd("type", v)} options={types.filter(t => t !== "All")} half required />
        </div>
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
        {/* Bank details section */}
        <div style={{ padding: "12px 0 4px", fontSize: 13, fontWeight: 700, color: T.text, borderTop: `1px solid ${T.borderLight}`, marginTop: 4 }}>Bank Details (for payment)</div>
        <div style={{ height: 10 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Bank Name" value={form.bank_name || ""} onChange={v => upd("bank_name", v)} placeholder="e.g. SBI" half />
          <FormField label="Account No." value={form.acc_no || ""} onChange={v => upd("acc_no", v)} placeholder="Account number" half />
        </div>
        <FormField label="IFSC Code" value={form.ifsc || ""} onChange={v => upd("ifsc", v)} placeholder="e.g. SBIN0005678" />
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={editing ? "Update Party" : "Add Party"} />
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 4. WORK CATEGORY
// ═══════════════════════════════════════════════════════════════════════
function WorkCategorySection() {
  const { items: cats, loading, save: apiSave, del: apiDel } = useSection("work-categories");
  const { items: uomList } = useSection("uom");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", unit: "Sq.Ft", rate: 0, desc: "" });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // UOM from backend, fallback to defaults
  const uomOptions = uomList.length > 0
    ? uomList.map(u => u.symbol ? u.symbol + " (" + u.name + ")" : u.name)
    : ["CFT","Sq.Ft","Running Ft","Kg","MT","Point","Unit","Lump Sum","Brass","Piece"];
  const uomValues = uomList.length > 0 ? uomList.map(u => u.name) : uomOptions;

  const filtered = cats.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.code||"").toLowerCase().includes(search.toLowerCase())
  );
  const openCreate = () => { setEditing(null); setForm({ name: "", code: "", unit: uomValues[0] || "Sq.Ft", rate: 0, desc: "" }); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, code: c.code||"", unit: c.unit||"Sq.Ft", rate: c.rate||0, desc: c.description||c.desc||"" }); setShowModal(true); };
  const save = async () => {
    if (!form.name.trim()) return alert("Work category name required");
    setSaving(true);
    const res = await apiSave({ name: form.name.trim(), code: form.code, unit: form.unit, rate: form.rate, description: form.desc }, editing?.id);
    setSaving(false);
    if (res.success) setShowModal(false);
    else alert(res.message || "Save failed");
  };
  const del = (id) => apiDel(id);

  const workTemplateConfig = {
    headers: ["Work Category Name", "Code", "Unit", "Base Rate (Rs.)", "Description"],
    sampleRows: [
      ["Excavation & Earthwork", "EXC", "CFT", "12", "Foundation digging, trenching"],
      ["RCC Work", "RCC", "CFT", "280", "Footings, columns, beams, slabs"],
    ],
    filename: "gb_work_categories_export.csv",
    templateFilename: "gb_template_work_categories.csv",
    instructions: "Instructions: Name and Code required. Unit examples: CFT, Sq.Ft, Kg, Point, Unit, Running Ft, Lump Sum",
    mapRow: (c) => [c.name, c.code, c.unit, c.rate, c.desc],
  };
  const handleWorkImport = (rows) => {
    const items = rows.map((r, i) => ({
      id: Date.now() + i, name: r["Work Category Name"] || "", code: r["Code"] || "",
      unit: r["Unit"] || "Sq.Ft", rate: parseFloat(r["Base Rate (Rs.)"]) || 0, desc: r["Description"] || "",
    })).filter(c => c.name);
    setCats(prev => [...prev, ...items]);
  };

  const columns = [
    { key: "code", label: "Code", minW: 60, render: r => <code style={{ fontSize: 12, fontWeight: 600, color: T.purple, background: T.purpleSoft, padding: "2px 8px", borderRadius: 4 }}>{r.code}</code> },
    { key: "name", label: "Work Category", minW: 180, render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: "desc", label: "Description", minW: 200, style: { fontSize: 12, color: T.textMid } },
    { key: "unit", label: "Unit", minW: 70 },
    { key: "rate", label: "Base Rate", minW: 90, align: "right", render: r => <span style={{ fontWeight: 700, color: T.text }}>Rs.{(r.rate||0).toLocaleString()}/{r.unit||""}</span> },
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
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label="Unit" value={form.unit} onChange={v => upd("unit", v)} options={uomValues} half />
          <FormField label="Base Rate (Rs.)" value={form.rate || ""} onChange={v => upd("rate", parseFloat(v) || 0)} type="number" half />
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
  const { items: subcons, loading, save: apiSave, del: apiDel } = useSection("subcontractors");
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
        onImportData={(rows) => {
          const items = rows.map((r, i) => ({
            id: Date.now() + i, name: r["Firm Name"]||"", owner: r["Owner/Contact"]||"",
            trade: r["Trade"]||"RCC & Civil", phone: r["Phone"]||"", city: r["City"]||"Raipur",
            gstin: r["GSTIN"]||"", labourStrength: parseInt(r["Labour Strength"])||0,
            rateType: r["Rate Unit"]||"Sq.Ft", rate: parseFloat(r["Rate (Rs.)"])||0,
            activeProjects: 0, rating: 0, status: "Active",
          })).filter(s => s.name);
          setSubcons(prev => [...prev, ...items]);
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
        <select value={selectedSubcon} onChange={e => setSelectedSubcon(e.target.value)}
          style={{ flex: 1, padding: "9px 14px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 13, color: "#111827", fontFamily: "inherit", cursor: "pointer" }}>
          <option value="">-- Select subcontractor --</option>
          {subcons.map(s => <option key={s.id} value={s.id}>{s.name} ({s.trade || ""})</option>)}
        </select>
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

  // ── Rate matrix (item_id → rate) ─────────────────────────────────────
  const [rates,   setRates]   = useState({});
  const [changed, setChanged] = useState({});
  const [saving,  setSaving]  = useState(false);

  // ── Add-new modals ───────────────────────────────────────────────────
  const [addModal, setAddModal] = useState(null); // "type"|"city"|"pkg"|"item"
  const [addForm,  setAddForm]  = useState({});
  const [adding,   setAdding]   = useState(false);
  const upd = (k, v) => setAddForm(p => ({ ...p, [k]: v }));

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
          (r.data||[]).forEach(x => { map[x.item_id] = parseFloat(x.rate); });
          setRates(map);
          setChanged({});
        }
      }).catch(() => {});
  }, [selPkg, selCity]);

  // ── Filtered items ───────────────────────────────────────────────────
  const filteredItems = boqItems.filter(i => filterCat === "All" || i.category === filterCat);

  // ── Save rates ───────────────────────────────────────────────────────
  const saveRates = async () => {
    if (!selPkg || !selCity) return;
    setSaving(true);
    const allRates = boqItems.map(item => ({
      item_id: item.id,
      rate: parseFloat(changed[item.id] !== undefined ? changed[item.id] : rates[item.id] !== undefined ? rates[item.id] : item.base_rate || 0),
    }));
    const res = await api.post("/library/rate-matrix/bulk", { package_id: selPkg.id, city_id: selCity.id, items: allRates });
    setSaving(false);
    if (res.success) {
      setRates(prev => { const n = { ...prev }; Object.keys(changed).forEach(k => { n[k] = parseFloat(changed[k]); }); return n; });
      setChanged({});
      alert("Rates saved!");
    } else alert(res.message || "Save failed");
  };

  // ── Add new handlers ─────────────────────────────────────────────────
  const openAdd = (type) => { setAddForm({}); setAddModal(type); };
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
      res = await api.post("/library/rate-packages", { name: addForm.name.trim(), construction_type_id: selType?.id, sqft_rate: addForm.sqft_rate || 0, description: addForm.description || "" });
      if (res.success) { await loadPackages(); setSelPkg(res.data); }
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

  // Rate for a given item (changed > saved > base)
  const getRate = (item) => {
    if (changed[item.id] !== undefined) return changed[item.id];
    if (rates[item.id]   !== undefined) return rates[item.id];
    return "";
  };
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
            {typePkgs.map(pkg => (
              <div key={pkg.id} onClick={() => setSelPkg(pkg)}
                style={{ padding: "9px 20px", borderRadius: 8, border: "2px solid " + (selPkg?.id === pkg.id ? "#7C3AED" : "#E5E7EB"),
                  background: selPkg?.id === pkg.id ? "#7C3AED" : "white",
                  color: selPkg?.id === pkg.id ? "white" : "#374151",
                  fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s" }}>
                <div>{pkg.name}</div>
                {pkg.sqft_rate > 0 && <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>Rs.{Number(pkg.sqft_rate).toLocaleString()}/sqft</div>}
              </div>
            ))}
            <button onClick={() => openAdd("pkg")}
              style={{ padding: "9px 14px", borderRadius: 8, border: "2px dashed #D1D5DB", background: "transparent", color: "#6B7280", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              + New Package
            </button>
          </div>
        </div>
      )}

      {/* ── LEVEL 4+5: Category filter + Items grid ───────────────────── */}
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

          {/* Category filter + Add item */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {allCats.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  style={{ padding: "6px 14px", borderRadius: 6, border: "1.5px solid " + (filterCat === cat ? "#7C3AED" : "#E5E7EB"),
                    background: filterCat === cat ? "#7C3AED" : "white",
                    color: filterCat === cat ? "white" : "#374151",
                    fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  {cat}
                </button>
              ))}
            </div>
            <button onClick={() => openAdd("item")}
              style={{ padding: "8px 16px", background: "#10B981", color: "white", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              + Add Item
            </button>
          </div>

          {/* Items table */}
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 0", color: "#9CA3AF" }}>
              No items found — click "Add Item" to add BOQ items
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: 10, border: "1px solid #E5E7EB", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB" }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>Item</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", width: 120 }}>Category</th>
                    <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", width: 70 }}>Unit</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", width: 110 }}>Base Rate</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#2563EB", textTransform: "uppercase", width: 150 }}>{selCity.name} Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const val = getRate(item);
                    const isChanged = changed[item.id] !== undefined;
                    return (
                      <tr key={item.id} style={{ background: idx % 2 === 0 ? "white" : "#FAFAFA", borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{item.name}</div>
                          {item.description && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{item.description}</div>}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#7C3AED", background: "#EDE9FE", padding: "2px 8px", borderRadius: 4 }}>{item.category || "—"}</span>
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 12, color: "#6B7280" }}>{item.unit}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, color: "#9CA3AF" }}>Rs.{Number(item.base_rate||0).toLocaleString()}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>
                          <input
                            type="number"
                            value={val}
                            placeholder={String(item.base_rate || 0)}
                            onChange={e => setChanged(p => ({ ...p, [item.id]: e.target.value }))}
                            style={{ width: 120, padding: "6px 10px", borderRadius: 6, textAlign: "right", fontFamily: "inherit", fontSize: 13,
                              border: "1.5px solid " + (isChanged ? "#2563EB" : "#E5E7EB"),
                              background: isChanged ? "#EFF6FF" : "white", outline: "none" }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!selType && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF", fontSize: 14 }}>
          Select a Construction Type above to start
        </div>
      )}

      {/* ── Add New Modals ─────────────────────────────────────────────── */}
      <Modal open={!!addModal} onClose={() => setAddModal(null)}
        title={addModal === "type" ? "New Construction Type" : addModal === "city" ? "New City" : addModal === "pkg" ? "New Package" : "New BOQ Item"}
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
// 8. EQUIPMENT / MACHINERY MASTER (My idea)
// ═══════════════════════════════════════════════════════════════════════
function EquipmentSection() {
  const { items: equipment, loading, save: apiSave, del: apiDel } = useSection("equipment");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { name: "", code: "", type: "Earthwork", ownership: "Owned", vendor: "", dailyRate: 0, status: "Available" };
  const [form, setForm] = useState(emptyForm);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const filtered = equipment.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.type.toLowerCase().includes(search.toLowerCase()));
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, code: `EQ-${String(equipment.length + 1).padStart(3, "0")}` }); setShowModal(true); };
  const openEdit = (e) => { setEditing(e); setForm({ ...emptyForm, ...e }); setShowModal(true); };
  const save = () => { if (!form.name.trim()) return; if (editing) { setEquipment(prev => prev.map(e => e.id === editing.id ? { ...e, ...form } : e)); } else { setEquipment(prev => [...prev, { ...form, id: Date.now(), currentProject: "—" }]); } setShowModal(false); };
  const del = (id) => setEquipment(prev => prev.filter(e => e.id !== id));
  const statusColors = { "In Use": { c: T.green, bg: T.greenSoft }, "Available": { c: T.blue, bg: T.blueSoft }, "Maintenance": { c: T.amber, bg: T.amberSoft }, "Damaged": { c: T.red, bg: T.redSoft } };

  const columns = [
    { key: "code", label: "Code", minW: 70, render: r => <code style={{ fontSize: 12, fontWeight: 600, color: T.teal, background: T.tealSoft, padding: "2px 8px", borderRadius: 4 }}>{r.code}</code> },
    { key: "name", label: "Equipment", minW: 200, render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: "type", label: "Type", minW: 80 },
    { key: "ownership", label: "Own/Rent", minW: 70, render: r => <Badge text={r.ownership} color={r.ownership === "Owned" ? T.green : T.amber} bg={r.ownership === "Owned" ? T.greenSoft : T.amberSoft} /> },
    { key: "vendor", label: "Vendor", minW: 110, style: { fontSize: 12 } },
    { key: "dailyRate", label: "Daily Rate", minW: 80, align: "right", render: r => r.dailyRate > 0 ? <span style={{ fontWeight: 700 }}>Rs.{(r.dailyRate||0).toLocaleString()}</span> : <span style={{ color: T.textLight }}>N/A</span> },
    { key: "currentProject", label: "At Project", minW: 130, style: { fontSize: 12 } },
    { key: "status", label: "Status", minW: 80, render: r => { const sc = statusColors[r.status] || statusColors.Available; return <Badge text={r.status} color={sc.c} bg={sc.bg} />; }},
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="equipment" onAdd={openCreate} addLabel="Add Equipment"
        templateConfig={{
          headers: ["Equipment Name","Code","Type","Ownership","Vendor","Daily Rental Rate (Rs.)"],
          sampleRows: [["JCB 3DX Backhoe Loader","EQ-001","Earthwork","Rented","Singh Cranes","5500"],["Concrete Mixer 10/7","EQ-002","Concrete","Owned","","0"]],
          filename: "gb_equipment_export.csv", templateFilename: "gb_template_equipment.csv",
          instructions: "Instructions: Ownership: Owned or Rented. Type: Earthwork, Lifting, Concrete, Steel, Safety, Transport",
          mapRow: (e) => [e.name, e.code, e.type, e.ownership, e.vendor, e.dailyRate],
        }}
        currentData={equipment}
        onImportData={(rows) => {
          const items = rows.map((r, i) => ({
            id: Date.now() + i, name: r["Equipment Name"]||"", code: r["Code"]||`EQ-${String(equipment.length+i+1).padStart(3,"0")}`,
            type: r["Type"]||"Earthwork", ownership: r["Ownership"]||"Owned", vendor: r["Vendor"]||"",
            dailyRate: parseFloat(r["Daily Rental Rate (Rs.)"])||0, currentProject: "—", status: "Available",
          })).filter(e => e.name);
          setEquipment(prev => [...prev, ...items]);
        }}
      />
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Equipment" : "Add Equipment"} width={560}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Equipment Name" value={form.name} onChange={v => upd("name", v)} placeholder="e.g. JCB 3DX Backhoe" half required />
          <FormField label="Code" value={form.code} onChange={v => upd("code", v)} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label="Type" value={form.type} onChange={v => upd("type", v)} options={["Earthwork","Lifting","Concrete","Steel","Safety","Transport","Pumping","Compaction","Other"]} half />
          <FormSelect label="Ownership" value={form.ownership} onChange={v => upd("ownership", v)} options={["Owned","Rented"]} half />
        </div>
        {form.ownership === "Rented" && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
            <FormField label="Vendor / Rental Company" value={form.vendor} onChange={v => upd("vendor", v)} half />
            <FormField label="Daily Rental Rate (Rs.)" value={form.dailyRate || ""} onChange={v => upd("dailyRate", parseFloat(v) || 0)} type="number" half />
          </div>
        )}
        <FormSelect label="Status" value={form.status} onChange={v => upd("status", v)} options={["Available","In Use","Maintenance","Damaged"]} />
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={editing ? "Update" : "Add Equipment"} />
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
    if (!window.confirm("Delete this unit?")) return;
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
          <select value={form.type} onChange={e=>upd("type",e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.border}`,fontSize:12.5,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
            {TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
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
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 13, fontFamily: "inherit" }}>
              <option>All</option>
              {catNames.map(c => <option key={c}>{c}</option>)}
            </select>
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

const masterSections = [
  { id: "material_cat",  label: "Material Category",   Icon: IcFolder,    Comp: MaterialCategorySection,  section: "INVENTORY", countKey: "material_categories", color: T.blue },
  { id: "materials",     label: "Material Master",     Icon: IcBox,       Comp: MaterialMasterSection,    section: null, countKey: "materials", color: T.teal },
  { id: "work_cat",      label: "Work Category",       Icon: IcTool,      Comp: WorkCategorySection,      section: null, countKey: "work_categories", color: T.purple },
  { id: "party",         label: "Party / Supplier",    Icon: IcUsers,     Comp: PartyMasterSection,       section: "PEOPLE", countKey: "parties", color: T.green },
  { id: "subcon",        label: "Subcontractors",      Icon: IcHardHat,   Comp: SubcontractorSection,     section: null, countKey: "subcontractors", color: T.amber },
  { id: "subcon_rate",   label: "Subcon Rate Card",    Icon: IcDollar,    Comp: SubconRateCardSection,    section: null, countKey: null, color: T.teal },
  { id: "labour",        label: "Labour Rate Card",    Icon: IcUsers,     Comp: LabourRateSection,        section: null, countKey: "labour_rates", color: T.orange },
  { id: "client_boq",    label: "Client BOQ Rate",     Icon: IcClipboard, Comp: ClientBOQSection,         section: "RATES & BOQ", countKey: null, color: T.indigo },
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
