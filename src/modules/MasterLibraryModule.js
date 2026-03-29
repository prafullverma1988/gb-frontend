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
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const filtered = cats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.code||"").toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setForm({ name: "", code: "", description: "" }); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, code: c.code||"", description: c.description||"" }); setShowModal(true); };
  const save = async () => {
    if (!form.name.trim()) return;
    await apiSave({ name: form.name, code: form.code, description: form.description }, editing?.id);
    setShowModal(false);
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
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={editing ? "Update" : "Create"} />
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
  const emptyForm = { name: "", code: "", category: "Cement & Binding", unit: "Kg", hsnCode: "", gstRate: 18, baseRate: 0, lastRate: 0, supplier: "", minStock: 0, currentStock: 0 };
  const [form, setForm] = useState(emptyForm);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const categories = ["All", "Cement & Binding", "Steel & Rebar", "Sand & Aggregates", "Bricks & Blocks", "Plumbing", "Electrical", "Paint & Finish", "Wood & Timber", "Tiles & Flooring", "Waterproofing", "Hardware", "Safety Equipment"];
  const units = ["Kg", "Bag (50kg)", "CFT", "Sq.Ft", "Piece", "Meter", "Litre", "Sheet (8x4)", "Piece (3m)", "Quintal", "MT", "Running Ft", "Brass", "Bundle"];

  const filtered = materials.filter(m => {
    if (filterCat !== "All" && m.category !== filterCat) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, code: `MAT-${String(materials.length + 1).padStart(3, "0")}` }); setShowModal(true); };
  const openEdit = (m) => { setEditing(m); setForm({ ...m }); setShowModal(true); };
  const save = () => {
    if (!form.name.trim()) return;
    if (editing) { setMaterials(prev => prev.map(m => m.id === editing.id ? { ...form, id: m.id } : m)); }
    else { setMaterials(prev => [...prev, { ...form, id: Date.now() }]); }
    setShowModal(false);
  };
  const del = (id) => setMaterials(prev => prev.filter(m => m.id !== id));

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
            {categories.map(c => <option key={c}>{c}</option>)}
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
          <FormSelect label="Category" value={form.category} onChange={v => upd("category", v)} options={categories.filter(c => c !== "All")} half required />
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
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={editing ? "Update Material" : "Add Material"} />
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
      ["Nand Kishor Agrawal", "Client", "Residential", "Nand Kishor", "+91 98765 20001", "nk@gmail.com", "", "Raipur"],
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
    const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", unit: "Sq.Ft", rate: 0, desc: "" });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const filtered = cats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()));
  const openCreate = () => { setEditing(null); setForm({ name: "", code: "", unit: "Sq.Ft", rate: 0, desc: "" }); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...c }); setShowModal(true); };
  const save = () => { if (!form.name.trim()) return; if (editing) { setCats(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c)); } else { setCats(prev => [...prev, { ...form, id: Date.now() }]); } setShowModal(false); };
  const del = (id) => setCats(prev => prev.filter(c => c.id !== id));

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
          <FormSelect label="Unit" value={form.unit} onChange={v => upd("unit", v)} options={["CFT","Sq.Ft","Running Ft","Kg","MT","Point","Unit","Lump Sum","Brass","Piece"]} half />
          <FormField label="Base Rate (Rs.)" value={form.rate || ""} onChange={v => upd("rate", parseFloat(v) || 0)} type="number" half />
        </div>
        <FormTextarea label="Description" value={form.desc} onChange={v => upd("desc", v)} placeholder="What work is included?" rows={2} />
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={editing ? "Update" : "Create"} />
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
  const emptyForm = { name: "", owner: "", trade: "RCC & Civil", phone: "", city: "Raipur", gstin: "", pan: "", address: "", labour_strength: 0, rate_type: "Sq.Ft", rate: 0, bank_name: "", acc_no: "", ifsc: "", status: "Active" };
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Subcontractor" : "Add Subcontractor"} desc="Subcontractor firm and rate card details" width={640}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Firm / Company Name" value={form.name} onChange={v => upd("name", v)} placeholder="e.g. Raj Construction" half required />
          <FormField label="Owner / Contact" value={form.owner} onChange={v => upd("owner", v)} placeholder="Owner name" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label="Trade / Specialty" value={form.trade} onChange={v => upd("trade", v)} options={["RCC & Civil","Electrical","Plumbing","Painting","Tiles & Flooring","Fabrication","Carpentry","Waterproofing","False Ceiling","HVAC","Landscaping","Demolition","Other"]} half required />
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
        <div style={{ padding: "12px 0 4px", fontSize: 13, fontWeight: 700, color: T.text, borderTop: `1px solid ${T.borderLight}`, marginTop: 4 }}>Default Rate Card</div>
        <div style={{ height: 10 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label="Rate Unit" value={form.rate_type} onChange={v => upd("rate_type", v)} options={["Sq.Ft","CFT","Point","Kg","Running Ft","Unit","Lump Sum","Day"]} half />
          <FormField label="Rate (Rs.)" value={form.rate || ""} onChange={v => upd("rate", parseFloat(v) || 0)} type="number" half />
        </div>
        <div style={{ padding: "12px 0 4px", fontSize: 13, fontWeight: 700, color: T.text, borderTop: `1px solid ${T.borderLight}`, marginTop: 4 }}>Bank Details (for payment)</div>
        <div style={{ height: 10 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <FormField label="Bank Name" value={form.bank_name || ""} onChange={v => upd("bank_name", v)} half />
          <FormField label="Account No." value={form.acc_no || ""} onChange={v => upd("acc_no", v)} half />
        </div>
        <div style={{ height: 14 }} />
        <FormField label="IFSC Code" value={form.ifsc || ""} onChange={v => upd("ifsc", v)} />
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={editing ? "Update" : "Add Subcontractor"} />
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 6. CLIENT BOQ RATE CARD
// ═══════════════════════════════════════════════════════════════════════
function ClientBOQSection({ dbProjects = [] }) {
  const [selectedProject, setSelectedProject] = useState(1);
  const projects = [
    { id: 1, name: "Shubham & Nand Kishor 623" }, { id: 2, name: "Tikendra Banchhor Residence" },
    { id: 3, name: "Esther Risali Commercial" }, { id: 4, name: "Amarendra Shrivastava Villa" },
  ];
  const [boqItems, setBoqItems] = useState([
    { id: 1, projectId: 1, category: "RCC Work", item: "Footing RCC M25", unit: "CFT", qty: 450, rate: 310, clientRate: 380, remark: "Including formwork" },
    { id: 2, projectId: 1, category: "RCC Work", item: "Column RCC M30", unit: "CFT", qty: 280, rate: 340, clientRate: 420, remark: "" },
    { id: 3, projectId: 1, category: "Brickwork", item: "AAC Block Wall 4 inch", unit: "Sq.Ft", qty: 3200, rate: 18, clientRate: 26, remark: "Including mortar" },
    { id: 4, projectId: 1, category: "Plastering", item: "Interior Plaster 12mm", unit: "Sq.Ft", qty: 6800, rate: 14, clientRate: 22, remark: "Cement mortar 1:4" },
    { id: 5, projectId: 1, category: "Tiles", item: "Vitrified Tile (Living & Bed)", unit: "Sq.Ft", qty: 1800, rate: 55, clientRate: 75, remark: "Double charge 600x600" },
    { id: 6, projectId: 1, category: "Electrical", item: "Electrical Wiring Complete", unit: "Point", qty: 120, rate: 380, clientRate: 520, remark: "Concealed wiring, Polycab" },
    { id: 7, projectId: 1, category: "Plumbing", item: "Plumbing Complete", unit: "Point", qty: 45, rate: 550, clientRate: 750, remark: "CPVC + drainage" },
    { id: 8, projectId: 1, category: "Painting", item: "Interior Painting (Apex)", unit: "Sq.Ft", qty: 5500, rate: 11, clientRate: 16, remark: "2 coat putty + 2 coat paint" },
  ]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { category: "", item: "", unit: "Sq.Ft", qty: 0, rate: 0, clientRate: 0, remark: "" };
  const [form, setForm] = useState(emptyForm);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const filtered = boqItems.filter(b => {
    if (b.projectId !== selectedProject) return false;
    if (search && !b.item.toLowerCase().includes(search.toLowerCase()) && !b.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totals = useMemo(() => {
    const cost = filtered.reduce((s, b) => s + b.rate * b.qty, 0);
    const revenue = filtered.reduce((s, b) => s + b.clientRate * b.qty, 0);
    return { cost, revenue, margin: revenue - cost, marginPct: cost > 0 ? (((revenue - cost) / revenue) * 100).toFixed(1) : 0 };
  }, [filtered]);

  const fmt = (n) => n >= 10000000 ? `${(n/10000000).toFixed(2)}Cr` : n >= 100000 ? `${(n/100000).toFixed(1)}L` : `${(n/1000).toFixed(0)}K`;

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (b) => { setEditing(b); setForm({ ...b }); setShowModal(true); };
  const save = () => { if (!form.item.trim()) return; if (editing) { setBoqItems(prev => prev.map(b => b.id === editing.id ? { ...b, ...form } : b)); } else { setBoqItems(prev => [...prev, { ...form, id: Date.now(), projectId: selectedProject }]); } setShowModal(false); };
  const del = (id) => setBoqItems(prev => prev.filter(b => b.id !== id));

  const columns = [
    { key: "category", label: "Category", minW: 100, render: r => <Badge text={r.category} color={T.purple} bg={T.purpleSoft} /> },
    { key: "item", label: "BOQ Item", minW: 200, render: r => (<div><div style={{ fontWeight: 600 }}>{r.item}</div>{r.remark && <div style={{ fontSize: 11, color: T.textLight, marginTop: 1 }}>{r.remark}</div>}</div>) },
    { key: "unit", label: "Unit", minW: 60 },
    { key: "qty", label: "Qty", minW: 60, align: "right", render: r => <span style={{ fontWeight: 600 }}>{(r.qty||0).toLocaleString()}</span> },
    { key: "rate", label: "Our Cost", minW: 80, align: "right", render: r => <span style={{ fontWeight: 600 }}>Rs.{r.rate}</span> },
    { key: "clientRate", label: "Client Rate", minW: 80, align: "right", render: r => <span style={{ fontWeight: 700, color: T.blue }}>Rs.{r.clientRate}</span> },
    { key: "margin", label: "Margin", minW: 80, align: "right", render: r => { const m = r.clientRate - r.rate; const pct = r.clientRate > 0 ? ((m / r.clientRate) * 100).toFixed(0) : 0; return <span style={{ fontWeight: 600, color: m > 0 ? T.green : T.red }}>Rs.{m} ({pct}%)</span>; }},
    { key: "total", label: "Client Total", minW: 90, align: "right", render: r => <span style={{ fontWeight: 700 }}>Rs.{((r.clientRate||0) * (r.qty||0)).toLocaleString()}</span> },
  ];

  return (
    <div>
      {/* Project selector + summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240, background: T.card, borderRadius: T.radius, padding: "14px 18px", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 8 }}>Select Project</label>
          <select value={selectedProject} onChange={e => setSelectedProject(parseInt(e.target.value))}
            style={{ width: "100%", padding: "10px 14px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, fontSize: 13.5, color: T.text, fontFamily: T.font, cursor: "pointer" }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {[
          { label: "Our Cost", value: `Rs.${fmt(totals.cost)}`, color: T.amber },
          { label: "Client Value", value: `Rs.${fmt(totals.revenue)}`, color: T.blue },
          { label: "Profit Margin", value: `Rs.${fmt(totals.margin)} (${totals.marginPct}%)`, color: T.green },
        ].map(s => (
          <div key={s.label} style={{ flex: "0 0 160px", background: T.card, borderRadius: T.radius, padding: "14px 18px", border: `1px solid ${T.border}`, boxShadow: T.shadow, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 11, color: T.textLight, marginBottom: 4, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.3px" }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{s.value}</div>
          </div>
        ))}
      </div>

      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="BOQ items" onAdd={openCreate} addLabel="Add BOQ Item"
        templateConfig={{
          headers: ["Work Category","BOQ Item Name","Unit","Quantity","Our Cost Rate (Rs.)","Client Rate (Rs.)","Remark"],
          sampleRows: [
            ["RCC Work","Footing RCC M25","CFT","450","310","380","Including formwork"],
            ["Brickwork","AAC Block Wall 4 inch","Sq.Ft","3200","18","26","Including mortar"],
          ],
          filename: "gb_client_boq_export.csv",
          templateFilename: "gb_template_client_boq.csv",
          instructions: "Instructions: All fields except Remark are required. Cost Rate = your cost, Client Rate = what you charge client.",
          mapRow: (b) => [b.category, b.item, b.unit, b.qty, b.rate, b.clientRate, b.remark],
        }}
        currentData={filtered}
        onImportData={(rows) => {
          const items = rows.map((r, i) => ({
            id: Date.now() + i, projectId: selectedProject,
            category: r["Work Category"]||"", item: r["BOQ Item Name"]||"", unit: r["Unit"]||"Sq.Ft",
            qty: parseFloat(r["Quantity"])||0, rate: parseFloat(r["Our Cost Rate (Rs.)"])||0,
            clientRate: parseFloat(r["Client Rate (Rs.)"])||0, remark: r["Remark"]||"",
          })).filter(b => b.item);
          setBoqItems(prev => [...prev, ...items]);
        }}
      />
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit BOQ Item" : "Add BOQ Item"} desc="Define item, quantity, and client rate" width={600}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Work Category" value={form.category} onChange={v => upd("category", v)} placeholder="e.g. RCC Work" half required />
          <FormField label="BOQ Item Name" value={form.item} onChange={v => upd("item", v)} placeholder="e.g. Column RCC M30" half required />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label="Unit" value={form.unit} onChange={v => upd("unit", v)} options={["CFT","Sq.Ft","Running Ft","Kg","MT","Point","Unit","Lump Sum","Piece"]} half />
          <FormField label="Quantity" value={form.qty || ""} onChange={v => upd("qty", parseFloat(v) || 0)} type="number" half required />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Our Cost Rate (Rs.)" value={form.rate || ""} onChange={v => upd("rate", parseFloat(v) || 0)} type="number" half required />
          <FormField label="Client Rate (Rs.)" value={form.clientRate || ""} onChange={v => upd("clientRate", parseFloat(v) || 0)} type="number" half required />
        </div>
        {form.rate > 0 && form.clientRate > 0 && (
          <div style={{ background: T.greenSoft, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: T.green }}>Margin: Rs.{form.clientRate - form.rate} per {form.unit} ({form.clientRate > 0 ? (((form.clientRate - form.rate) / form.clientRate) * 100).toFixed(1) : 0}%)</span>
            {form.qty > 0 && <span style={{ color: T.textMid, marginLeft: 12 }}>Total profit: Rs.{(((form.clientRate||0) - (form.rate||0)) * (form.qty||0)).toLocaleString()}</span>}
          </div>
        )}
        <FormTextarea label="Remark / Specification" value={form.remark} onChange={v => upd("remark", v)} placeholder="e.g. Including formwork" rows={2} />
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={editing ? "Update" : "Add Item"} />
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
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={editing ? "Update" : "Create"} />
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
function DesignCategorySection() {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    api.get("/design/categories").then(r=>{ if(r.success) setAllItems(r.data||[]); setLoading(false); }).catch(()=>setLoading(false));
  },[]);
  const apiSave = async (form, editingId) => {
    let res;
    if (editingId) res = await api.put("/design/categories/"+editingId, form);
    else res = await api.post("/design/categories", form);
    if (res.success) {
      if (editingId) setAllItems(p=>p.map(i=>i.id===editingId?res.data:i));
      else setAllItems(p=>[res.data,...p]);
    }
    return res;
  };
  const apiDel = async (id) => {
    await api.del("/design/categories/"+id);
    setAllItems(p=>p.filter(i=>i.id!==id));
  };
  const [search, setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showModal, setShowModal]   = useState(false);
  const [editing,   setEditing]     = useState(null);
  const [form, setForm] = useState({ name:"", type:"category", description:"" });
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));

  const filtered = allItems.filter(i =>
    (typeFilter==="All" || i.type===typeFilter) &&
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditing(null); setForm({name:"",type:"category",description:""}); setShowModal(true); };
  const openEdit   = (i) => { setEditing(i); setForm({name:i.name,type:i.type,description:i.description||""}); setShowModal(true); };
  const save = async () => { if(!form.name.trim()) return; await apiSave(form, editing?.id); setShowModal(false); };
  const del  = (id) => apiDel(id);

  const columns = [
    { key:"name", label:"Name", minW:160, render: r => <span style={{fontWeight:600}}>{r.name}</span> },
    { key:"type", label:"Type", minW:120, render: r => <Badge text={r.type==="category"?"📁 Category":"📐 Drawing Type"} color={r.type==="category"?T.blue:T.purple} bg={r.type==="category"?T.blueSoft:T.purpleSoft}/> },
    { key:"description", label:"Description", minW:200, style:{fontSize:12,color:T.textMid} },
  ];

  return (
    <div>
      <div style={{display:"flex",gap:8,alignItems:"center",padding:"0 0 10px"}}>
        {["All","category","drawing_type"].map(t=>(
          <button key={t} onClick={()=>setTypeFilter(t)}
            style={{padding:"4px 12px",borderRadius:20,border:"1.5px solid "+(typeFilter===t?T.blue:T.border),
              background:typeFilter===t?T.blueSoft:"none",color:typeFilter===t?T.blue:T.textMid,
              fontSize:11,fontWeight:typeFilter===t?700:400,cursor:"pointer"}}>
            {t==="All"?"All":t==="category"?"Categories":"Drawing Types"}
          </button>
        ))}
      </div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="design items" onAdd={openCreate} addLabel="Add Item"
        templateConfig={{headers:["Name","Type","Description"],sampleRows:[["Architectural","category","Floor plans, elevations"],["2D","drawing_type","2D drawings"]],
          filename:"gb_design_categories.csv",templateFilename:"gb_template_design_cats.csv",instructions:"Type: category or drawing_type",
          mapRow:i=>[i.name,i.type,i.description||""]}}
        currentData={filtered} onImportData={()=>{}}/>
      {loading?<div style={{padding:"30px",textAlign:"center",color:T.textLight}}>Loading...</div>
        :<DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del}/>}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editing?"Edit Category/Type":(form.type==="category"?"Add Drawing Category":"Add Drawing Type")} width={420}>
        <FormField label={form.type==="category"?"Category Name *":"Type Name *"} value={form.name} onChange={v=>upd("name",v)} placeholder={form.type==="category"?"e.g. Architectural, Structural":"e.g. 2D, Elevation, Section"} required/>
        <div style={{height:12}}/>
        <div style={{marginBottom:0}}>
          <label style={{fontSize:11,fontWeight:600,color:T.textMid,display:"block",marginBottom:5}}>What are you adding?</label>
          <select value={form.type} onChange={e=>upd("type",e.target.value)}
            style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.border}`,fontSize:12.5,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
            <option value="category">Drawing Category (e.g. Architectural, Structural)</option>
            <option value="drawing_type">Drawing Type (e.g. 2D, Elevation, Section)</option>
          </select>
        </div>
        <div style={{height:12}}/>
        <FormTextarea label="Description" value={form.description||""} onChange={v=>upd("description",v)} rows={2}/>
        <ModalFooter onClose={()=>setShowModal(false)} onSave={save} saveLabel={editing?"Update":"Create"}/>
      </Modal>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// DRAWING TITLES MASTER
// ═══════════════════════════════════════════════════════════════════════
function DrawingTitlesSection() {
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ 
    api.get("/design/titles").then(r=>{ if(r.success) setTitles(r.data||[]); setLoading(false); }).catch(()=>setLoading(false)); 
  },[]);
  const reloadTitles = () => {
    api.get("/design/titles").then(r=>{ if(r.success) setTitles(r.data||[]); }).catch(()=>{});
  };
  const apiSave = async (form, editingId) => {
    let res;
    if (editingId) res = await api.put("/design/titles/"+editingId, form);
    else res = await api.post("/design/titles", form);
    if (res.success) reloadTitles();
    return res;
  };
  const apiDel = async (id) => {
    await api.del("/design/titles/"+id);
    reloadTitles();
  };
  const [search,    setSearch]    = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form, setForm] = useState({ title:"", category:"", type:"", description:"" });
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));

  const [dbCategories, setDbCategories] = useState([]);
  const [dbTypes,      setDbTypes]      = useState([]);
  useEffect(()=>{
    api.get("/design/categories?type=category").then(r=>{ if(r.success&&r.data.length) setDbCategories(r.data.map(c=>c.name)); }).catch(()=>{});
    api.get("/design/categories?type=drawing_type").then(r=>{ if(r.success&&r.data.length) setDbTypes(r.data.map(t=>t.name)); }).catch(()=>{});
  },[]);

  const CATS_DEFAULT = ["Architectural","Structural","Electrical","Plumbing","Interior","Landscape","MEP"];
  const TYPES_DEFAULT= ["Plan","Elevation","Section","Detail","3D","Diagram","Schedule","Site Plan"];
  const CATS  = dbCategories.length > 0 ? dbCategories : CATS_DEFAULT;
  const TYPES = dbTypes.length      > 0 ? dbTypes      : TYPES_DEFAULT;

  const cats = ["All", ...CATS];

  const filtered = titles.filter(t =>
    (catFilter==="All" || t.category===catFilter) &&
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditing(null); setForm({title:"",category:CATS[0]||"Architectural",type:TYPES[0]||"Plan",description:""}); setShowModal(true); };
  const openEdit   = (t) => { setEditing(t); setForm({title:t.title,category:t.category||"",type:t.type||"",description:t.description||""}); setShowModal(true); };
  const [saveErr, setSaveErr] = useState("");
  const save = async () => {
    if(!form.title.trim()) return;
    setSaveErr("");
    const res = await apiSave(form, editing?.id);
    if (res && res.success) setShowModal(false);
    else setSaveErr(res?.message || "Save failed");
  };
  const del  = (id) => apiDel(id);

  const columns = [
    { key:"title",    label:"Drawing Title", minW:220, render: r => <span style={{fontWeight:600}}>{r.title}</span> },
    { key:"category", label:"Category",      minW:120, render: r => r.category ? <Badge text={r.category} color={T.blue} bg={T.blueSoft}/> : "—" },
    { key:"type",     label:"Type",          minW:100, render: r => r.type ? <Badge text={r.type} color={T.purple} bg={T.purpleSoft}/> : "—" },
    { key:"description", label:"Description", minW:200, style:{fontSize:12,color:T.textMid} },
  ];

  return (
    <div>
      {/* Category filter tabs */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setCatFilter(c)}
            style={{padding:"3px 10px",borderRadius:20,border:"1.5px solid "+(catFilter===c?T.blue:T.border),
              background:catFilter===c?T.blueSoft:"none",color:catFilter===c?T.blue:T.textMid,
              fontSize:11,fontWeight:catFilter===c?700:400,cursor:"pointer"}}>
            {c}
            {c!=="All"&&<span style={{marginLeft:4,fontSize:10}}>{titles.filter(t=>t.category===c).length}</span>}
          </button>
        ))}
      </div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="drawing titles"
        onAdd={openCreate} addLabel="Add Title"
        templateConfig={{
          headers:["Drawing Title","Category","Type","Description"],
          sampleRows:[
            ["Ground Floor Plan","Architectural","Plan","GF layout plan"],
            ["Column Detail","Structural","Detail","Column reinforcement detail"],
            ["Electrical Layout","Electrical","Plan","GF electrical layout"],
          ],
          filename:"gb_drawing_titles.csv",
          templateFilename:"gb_template_drawing_titles.csv",
          instructions:"Category: Architectural/Structural/Electrical/Plumbing/Interior. Type: Plan/Elevation/Section/Detail/3D/Diagram",
          mapRow: t => [t.title, t.category||"", t.type||"", t.description||""],
        }}
        currentData={filtered}
        onImportData={(rows)=>{
          rows.forEach(async r => {
            if(r["Drawing Title"]) {
              await api.post("/design/titles", {
                title: r["Drawing Title"],
                category: r["Category"]||"Architectural",
                type: r["Type"]||"Plan",
                description: r["Description"]||null,
              });
            }
          });
          setTimeout(()=>window.location.reload(),1000);
        }}
      />
      {loading ? <div style={{padding:"30px",textAlign:"center",color:T.textLight}}>Loading...</div>
        : <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} emptyMsg="No drawing titles found"/>}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editing?"Edit Drawing Title":"Add Drawing Title"} width={460}>
        <FormField label="Drawing Title *" value={form.title} onChange={v=>upd("title",v)} placeholder="e.g. Ground Floor Plan" required/>
        <div style={{height:12}}/>
        <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:140}}>
            <label style={{fontSize:11,fontWeight:600,color:T.textMid,display:"block",marginBottom:5}}>Category</label>
            <select value={form.category} onChange={e=>upd("category",e.target.value)}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.border}`,fontSize:12.5,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
              {CATS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{flex:1,minWidth:120}}>
            <label style={{fontSize:11,fontWeight:600,color:T.textMid,display:"block",marginBottom:5}}>Type</label>
            <select value={form.type} onChange={e=>upd("type",e.target.value)}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.border}`,fontSize:12.5,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
              {TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{height:12}}/>
        <FormTextarea label="Description" value={form.description||""} onChange={v=>upd("description",v)} rows={2} placeholder="Optional notes"/>
        <ModalFooter onClose={()=>setShowModal(false)} onSave={save} saveLabel={editing?"Update":"Create"}/>
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
  { id: "labour",        label: "Labour Rate Card",    Icon: IcUsers,     Comp: LabourRateSection,        section: null, countKey: "labour_rates", color: T.orange },
  { id: "boq",           label: "Client BOQ Rate",     Icon: IcClipboard, Comp: ClientBOQSection,         section: "RATES & BOQ", countKey: "boq", color: T.indigo },
  { id: "equipment",     label: "Equipment / Machinery", Icon: IcTruck,   Comp: EquipmentSection,         section: "ASSETS", countKey: "equipment", color: T.rose },
  { id: "drawing_titles", label: "Drawing Titles",     Icon: IcFile,      Comp: DrawingTitlesSection,     section: "DESIGN LIBRARY", countKey: "drawing_titles", color: T.blue },
  { id: "design_cats",   label: "Categories & Types", Icon: IcLayers,    Comp: DesignCategorySection,    section: null, countKey: "design_cats", color: T.purple },
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
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textLight }}>GB Buildcon v2.1</div>
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
