import { useState, useMemo, useEffect, useCallback } from "react";
import api from "../config/api";
import SearchSelect from "../components/SearchSelect";
import { t, Rich } from "../i18n";

// ─── ICON COMPONENT ──────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor", fill = "none", strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// Indian-comma rupee formatter — Math.round + en-IN locale
const inr = (n) => Math.round(Number(n) || 0).toLocaleString("en-IN");
// Construction-type accent colors — picker palette used in Edit Type modal.
const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];
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
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font }}>
      {/* backdrop — click-to-close removed so a stray outside click can't wipe a half-filled form; use the × / Cancel button */}
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
          <IcUpload size={14} color={T.textMid} /> {t("master_library.import")}
        </button>
      )}
      {onExport && (
        <button onClick={onExport} style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 12, fontWeight: 600, color: T.textMid, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <IcDownload size={14} color={T.textMid} /> {t("common.export")}
        </button>
      )}
      <button onClick={onAdd} style={{ padding: "8px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 3px 10px ${T.blue}33`, whiteSpace: "nowrap" }}>
        <IcPlus size={15} color="white" /> {addLabel}
      </button>
    </div>
  );
}

// Data table
// Optional props:
//   onRowClick  → caller-driven row click (used by the custom Party drawer)
//   hideActions → suppress the trailing Actions column
//   noDetail    → opt OUT of the auto detail-drawer for an edit/delete table
//
// AUTO DETAIL DRAWER:
//   When a table has BOTH onEdit + onDelete and does NOT set hideActions /
//   onRowClick / noDetail, every row becomes clickable and opens a generic
//   right side-slide drawer that lists all columns (label → value) with
//   Edit + Delete buttons in the footer. This gives the whole Library a
//   consistent "click row → detail + actions in drawer" UX with zero
//   per-section wiring.
function DataTable({ columns, data, onEdit, onDelete, onRowClick, hideActions, noDetail, emptyMsg = "No items found" }) {
  const [detailRow, setDetailRow] = useState(null);
  const detailMode = !noDetail && !onRowClick && !hideActions && !!onEdit && !!onDelete;
  const rowClick = onRowClick || (detailMode ? setDetailRow : null);
  const showActions = !hideActions && !detailMode;

  if (data.length === 0) {
    return (
      <div style={{ background: T.card, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "50px 20px", textAlign: "center" }}>
        <IcSearch size={32} color={T.borderLight} />
        <div style={{ fontSize: 14, fontWeight: 600, color: T.textMid, marginTop: 10 }}>{emptyMsg}</div>
        <div style={{ fontSize: 12, color: T.textLight, marginTop: 4 }}>{t("master_library.try_changing_your_search_or_filters")}</div>
      </div>
    );
  }

  // Best-guess display title for the drawer header.
  const drawerTitle = (row) => row?.name || row?.title || row?.work_item || row?.material_name || row?.code || (columns[0]?.render ? null : row?.[columns[0]?.key]) || "Detail";

  return (
    <div style={{ background: T.card, borderRadius: T.radius, border: `1px solid ${T.border}`, boxShadow: T.shadow, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key} style={{ textAlign: c.align || "left", padding: "12px 14px", fontSize: 11, fontWeight: 700, color: T.textLight, borderBottom: `2px solid ${T.border}`, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", minWidth: c.minW || "auto" }}>{c.label}</th>
              ))}
              {showActions && (
                <th style={{ width: 80, borderBottom: `2px solid ${T.border}`, padding: "12px 14px", fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase" }}>{t("common.actions")}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={row.id || ri}
                onClick={rowClick ? () => rowClick(row) : undefined}
                style={{ borderBottom: `1px solid ${T.borderLight}`, cursor: rowClick ? "pointer" : "default" }}
                onMouseEnter={e => e.currentTarget.style.background = T.borderLight + "88"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {columns.map(c => (
                  <td key={c.key} style={{ padding: "12px 14px", color: T.text, ...(c.style || {}), textAlign: c.align || "left" }}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
                {showActions && (
                  <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => onEdit(row)} style={{ background: T.blueSoft, border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
                        <IcEdit size={14} color={T.blue} />
                      </button>
                      <button onClick={() => onDelete(row.id)} style={{ background: T.redSoft, border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
                        <IcTrash size={14} color={T.red} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Generic detail drawer ── */}
      {detailMode && detailRow && (
        <>
          <div 
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 340, backdropFilter: "blur(2px)" }}/>
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: 420, maxWidth: "94vw", background: T.card, zIndex: 341, boxShadow: "-8px 0 28px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1.25 }}>{drawerTitle(detailRow)}</div>
              <button onClick={() => setDetailRow(null)} style={{ background: "none", border: "none", fontSize: 22, lineHeight: 1, color: T.textLight, cursor: "pointer", padding: 2 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
              {columns.map(c => (
                <div key={c.key} style={{ display: "flex", padding: "10px 0", borderBottom: `1px solid ${T.borderLight}` }}>
                  <span style={{ width: 130, flexShrink: 0, fontSize: 11, color: T.textLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".3px", paddingTop: 1 }}>{c.label}</span>
                  <span style={{ flex: 1, fontSize: 13, color: T.text, wordBreak: "break-word" }}>
                    {c.render ? c.render(detailRow) : (detailRow[c.key] ?? <span style={{ color: T.textLight }}>—</span>)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
              <button onClick={() => { const tgt = detailRow; setDetailRow(null); onEdit(tgt); }}
                style={{ flex: 1, padding: "9px", borderRadius: 8, background: T.blue, color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <IcEdit size={15} color="white" /> {t("common.edit_2")}
              </button>
              <button onClick={async () => { if (await window.confirmAsync(`Delete "${drawerTitle(detailRow)}"?`)) { await onDelete(detailRow.id); setDetailRow(null); } }}
                style={{ padding: "9px 16px", borderRadius: 8, background: T.redSoft, color: T.red, border: `1px solid ${T.red}44`, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <IcTrash size={15} color={T.red} /> {t("common.delete")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ModalFooter({ onClose, onSave, saveLabel = "Save" }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.borderLight}` }}>
      <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 13, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>{t("common.cancel")}</button>
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
      setResult({ success: successCount, skipped: skippedCount, updated: importResult?.updated || 0 });
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
      desc={mode === "import" ? t("master_library.download_template_fill_your_data_then") : t("master_library.download_current_data_or_blank_template")}
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
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{t("master_library.export_current_data")}</div>
                <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{t("master_library.download_all_currentdata_sectionname_as_csv", { currentData: currentData?.length || 0, sectionName: sectionName.toLowerCase() })}</div>
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
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{t("master_library.download_blank_template")}</div>
                <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{t("master_library.csv_template_with_headers_sample_data")}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: "12px 16px", background: T.borderLight, borderRadius: 8, fontSize: 12, color: T.textMid, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700 }}>{t("master_library.tip")}</span> {t("master_library.download_the_template_fill_in_your")}
          </div>
        </div>
      ) : (
        <div>
          {/* ─── Step indicator ─── */}
          <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
            {[
              { n: 1, label: t("master_library.download_template") },
              { n: 2, label: t("master_library.upload_import") },
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
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{t("master_library.sample_template_sectionname", { sectionName })}</div>
                    <div style={{ fontSize: 12, color: T.textLight, marginTop: 3 }}>{tc.instructions || t("master_library.fill_in_data_and_upload_back")}</div>
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
                    <IcDownload size={16} color="white" /> {t("master_library.download_csv")}
                  </button>
                </div>

                {/* Column preview */}
                <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>{t("master_library.template_columns_tc", { tc: tc.headers?.length || 0 })}</div>
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
                     {t("master_library.sample_data_preview")}
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
                 {t("master_library.download_template_fill_your_data_in")}
                </div>
                <button onClick={() => setStep(2)}
                  style={{ padding: "10px 24px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                 {t("master_library.next_upload_file")} <IcChevR size={14} color="white" />
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
                 {t("master_library.don_t_have_a_file_yet")}
                </div>
                <button onClick={() => setStep(1)}
                  style={{ fontSize: 12, fontWeight: 600, color: T.blue, background: T.blueSoft, border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <IcDownload size={13} color={T.blue} /> {t("master_library.get_template")}
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
                    <div style={{ fontSize: 12, color: T.textLight, marginTop: 4 }}>{t("master_library.file_kb_click_to_change_file", { file: (file.size / 1024).toFixed(1) })}</div>
                  </div>
                ) : (
                  <div>
                    <IcUpload size={30} color={T.textLight} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: T.textMid, marginTop: 8 }}>{t("master_library.click_to_upload_your_csv_file")}</div>
                    <div style={{ fontSize: 12, color: T.textLight, marginTop: 4 }}>{t("master_library.supports_csv_files_utf_8_encoding")}</div>
                  </div>
                )}
              </div>

              {/* Preview */}
              {preview && preview.rows.length > 0 && !result && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t("master_library.preview_preview_valid_rows", { preview: preview.rows.filter(r => Object.values(r).some(v => v?.trim())).length })}</div>
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
                          <tr><td colSpan={preview.headers.length} style={{ padding: "8px 10px", textAlign: "center", color: T.textLight, fontSize: 11, fontStyle: "italic" }}>{t("master_library.and_preview_more_rows", { preview: preview.rows.length - 6 })}</td></tr>
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
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>{t("master_library.import_successful")}</div>
                    <div style={{ fontSize: 12.5, color: T.textMid, marginTop: 2 }}>{t("master_library.success_items_imported", { success: result.success })}{result.updated > 0 && <span>{t("master_library.updated_existing_updated", { updated: result.updated })}</span>}
                      {result.skipped > 0 && <span> — {result.skipped} skipped</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
                <button onClick={() => { if (result) { onClose(); resetAll(); } else setStep(1); }}
                  style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 13, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>
                  {result ? t("common.done") : t("common.back")}
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
                    {importing ? t("master_library.importing") : <><IcUpload size={15} color="white" />{t("master_library.import_preview_items", { preview: preview?.rows.filter(r => Object.values(r).some(v => v?.trim())).length || 0 })}</>}
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
          <IcUpload size={14} color={T.green} /> {t("master_library.import_csv")}
        </button>
        <button onClick={() => setIoMode("export")} style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 12, fontWeight: 600, color: T.textMid, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <IcDownload size={14} color={T.textMid} /> {t("common.export")}
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
  const del = async (id) => {
    const res = await apiDel(id);
    // Backend blocks deletion when materials are still linked — surface why.
    if (res && res.success === false) alert(res.message || "Category delete nahi ho saki");
  };

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
    { key: "code", label: t("common.code"), minW: 80, render: r => <code style={{ fontSize: 12, fontWeight: 600, color: T.blue, background: T.blueSoft, padding: "2px 10px", borderRadius: 4 }}>{r.code}</code> },
    { key: "name", label: t("master_library.category_name"), minW: 200, render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: "description", label: t("common.description"), minW: 280, style: { fontSize: 12.5, color: T.textMid } },
    { key: "item_count", label: t("common.materials"), minW: 90, align: "center", render: r => <Badge text={`${r.item_count||0} items`} color={(r.item_count||0) > 0 ? T.blue : T.textLight} bg={(r.item_count||0) > 0 ? T.blueSoft : T.borderLight} /> },
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="categories" onAdd={openCreate} addLabel="Add Category"
        templateConfig={templateConfig} currentData={cats} onImportData={handleImport} />
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} emptyMsg="No categories found" />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? t("master_library.edit_category") : t("common.add_category_2")} width={460}>
        <FormField label={t("master_library.category_name")} value={form.name} onChange={v => upd("name", v)} placeholder={t("master_library.e_g_cement_binding")} required />
        <div style={{ height: 14 }} />
        <FormField label={t("master_library.code_short")} value={form.code} onChange={v => upd("code", v.toUpperCase())} placeholder={t("master_library.e_g_cem")} />
        <div style={{ height: 14 }} />
        <FormTextarea label={t("common.description")} value={form.description||""} onChange={v => upd("description", v)} placeholder={t("master_library.what_materials_fall_under_this_category")} rows={2} />
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
    if (!form.name.trim()) return alert(t("master_library.material_name_required"));
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
    { key: "code", label: t("common.code"), minW: 80, render: r => <code style={{ fontSize: 12, fontWeight: 600, color: T.blue, background: T.blueSoft, padding: "2px 8px", borderRadius: 4 }}>{r.code}</code> },
    { key: "name", label: t("master_library.material_name"), minW: 180, render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: "category", label: t("common.category"), minW: 110, render: r => <Badge text={r.category_name || r.category} color={T.textMid} bg={T.borderLight} /> },
    { key: "unit", label: t("common.unit"), minW: 80 },
    { key: "hsnCode", label: "HSN", minW: 60, render: r => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{r.hsnCode}</span> },
    { key: "gstRate", label: "GST", minW: 50, align: "center", render: r => <span style={{ fontWeight: 600, fontSize: 12 }}>{r.gstRate}%</span> },
    { key: "baseRate", label: t("master_library.base_rate"), minW: 80, align: "right", render: r => <span style={{ fontWeight: 700, color: T.text }}>{t("master_library.rs_baserate", { baseRate: r.baseRate })}</span> },
    { key: "lastRate", label: t("master_library.last_rate"), minW: 80, align: "right", render: r => <span style={{ fontWeight: 600, color: r.lastRate > r.baseRate ? T.red : T.green }}>{t("master_library.rs_lastrate", { lastRate: r.lastRate })}</span> },
    { key: "currentStock", label: t("common.stock"), minW: 70, align: "right", render: r => (
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
            <SearchSelect value={filterCat} options={allCats} onChange={setFilterCat} placeholder={t("master_library.filter_category")}/>
          </div>
        }
      />
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? t("master_library.edit_material") : t("master_library.add_material")} desc={t("master_library.enter_material_details_rates_and_stock")} width={640}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label={t("master_library.material_name")} value={form.name} onChange={v => upd("name", v)} placeholder={t("master_library.e_g_opc_cement_53_grade")} half required />
          <FormField label={t("common.code")} value={form.code} onChange={v => upd("code", v)} placeholder={t("master_library.mat_001")} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label={t("common.category")} value={form.category} onChange={v => upd("category", v)} options={catNames} half required />
          <FormSelect label={t("common.unit")} value={form.unit} onChange={v => upd("unit", v)} options={units} half required />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label={t("master_library.hsn_code")} value={form.hsnCode} onChange={v => upd("hsnCode", v)} placeholder="e.g. 2523" half />
          <FormSelect label={t("master_library.gst_rate")} value={String(form.gstRate)} onChange={v => upd("gstRate", parseInt(v))} options={[{value:"0",label:"0%"},{value:"5",label:"5%"},{value:"12",label:"12%"},{value:"18",label:"18%"},{value:"28",label:"28%"}]} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label={t("master_library.base_rate_rs")} value={form.baseRate || ""} onChange={v => upd("baseRate", parseFloat(v) || 0)} type="number" half required />
          <FormField label={t("master_library.last_purchase_rate_rs")} value={form.lastRate || ""} onChange={v => upd("lastRate", parseFloat(v) || 0)} type="number" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label={t("master_library.preferred_supplier")} value={form.supplier} onChange={v => upd("supplier", v)} placeholder={t("common.supplier_name")} half />
          <FormField label={t("master_library.minimum_stock_level")} value={form.minStock || ""} onChange={v => upd("minStock", parseInt(v) || 0)} type="number" half />
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
  const emptyForm = { name: "", type: "Material Vendor", roles: ["material_vendor"], gstin: "", pan: "", phone: "", email: "", address: "", city: "Raipur", opening_balance: 0, staff_subtype: "", designation: "", wallet_limit: "", negative_limit: "" };
  const [form, setForm] = useState(emptyForm);
  const [saveErr, setSaveErr] = useState("");
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  // Side-slide detail drawer — clicking a party row opens it.
  const [detailParty, setDetailParty] = useState(null);

  // ── Multi-role support ──────────────────────────────────────────
  // A party can hold several roles (Material Vendor + Subcon + Transporter).
  // Staff is EXCLUSIVE — selecting it clears the others and vice-versa.
  const ROLE_OPTIONS = [
    { key: "material_vendor",  label: t("material_flow.material_vendor") },
    { key: "equipment_vendor", label: t("master_library.equipment_vendor") },
    { key: "client",           label: t("master_library.client") },
    { key: "subcontractor",    label: t("common.subcontractor") },
    { key: "labour_vendor",    label: t("common.labour_vendor") },
    { key: "transporter",      label: t("master_library.transporter") },
    { key: "consultant",       label: t("master_library.consultant") },
    { key: "staff",            label: t("master_library.staff") },
  ];
  const ROLE_ALIAS = {
    "material vendor":"material_vendor","material supplier":"material_vendor","supplier":"material_vendor","vendor":"material_vendor","other vendor":"material_vendor",
    "equipment":"equipment_vendor","equipment vendor":"equipment_vendor","machinery":"equipment_vendor",
    "client":"client","subcontractor":"subcontractor","sub-contractor":"subcontractor","subcon":"subcontractor",
    "labour vendor":"labour_vendor","labor vendor":"labour_vendor","transporter":"transporter","consultant":"consultant","staff":"staff",
  };
  const toRoleKey = (v) => {
    if (!v) return null;
    const k = String(v).toLowerCase().trim();
    return ROLE_ALIAS[k] || (ROLE_OPTIONS.some(o => o.key === k) ? k : null);
  };
  // Parse a party's stored roles (comma-string) + legacy type → key array.
  const parsePartyRoles = (p) => {
    const set = [];
    if (p?.roles) String(p.roles).split(",").forEach(r => { const c = toRoleKey(r); if (c && !set.includes(c)) set.push(c); });
    if (set.length === 0) { const c = p?.is_staff ? "staff" : toRoleKey(p?.type); if (c) set.push(c); }
    return set.length ? set : ["material_vendor"];
  };
  // Toggle a role in the form; enforce staff-exclusivity.
  const toggleRole = (key) => setForm(p => {
    const cur = Array.isArray(p.roles) ? p.roles : [];
    let next;
    if (key === "staff") {
      next = cur.includes("staff") ? [] : ["staff"];            // staff stands alone
    } else {
      const without = cur.filter(r => r !== "staff");           // picking any non-staff drops staff
      next = without.includes(key) ? without.filter(r => r !== key) : [...without, key];
    }
    if (next.length === 0) next = ["material_vendor"];          // never empty
    // primary = first role → drives the `type`/staff logic
    const primary = next[0];
    return { ...p, roles: next, type: primary === "staff" ? "Staff" : (ROLE_OPTIONS.find(o => o.key === primary)?.label || p.type) };
  });

  // "Material Vendor" is the canonical UI label. We still recognise legacy
  // values ("Supplier" / "Material Supplier") so existing parties show up
  // under the same chip without needing a DB migration. "Staff" is new —
  // app users get a staff-party automatically; this is for off-app casual staff.
  const types = ["All", "Material Vendor", "Equipment Vendor", "Client", "Subcontractor", "Labour Vendor", "Transporter", "Consultant", "Staff"];
  const typeColors = { "Material Vendor": { c: T.blue, bg: T.blueSoft }, "Equipment Vendor": { c: T.rose, bg: T.roseSoft }, Supplier: { c: T.blue, bg: T.blueSoft }, "Material Supplier": { c: T.blue, bg: T.blueSoft }, Client: { c: T.green, bg: T.greenSoft }, Subcontractor: { c: T.purple, bg: T.purpleSoft }, "Labour Vendor": { c: T.amber, bg: T.amberSoft }, Transporter: { c: T.amber, bg: T.amberSoft }, Consultant: { c: T.teal, bg: T.tealSoft }, Staff: { c: T.teal, bg: T.tealSoft }, staff: { c: T.teal, bg: T.tealSoft } };
  const isStaffForm = Array.isArray(form.roles) ? form.roles.includes("staff") : form.type === "Staff";

  const filtered = parties.filter(p => {
    // Role-aware filter: a multi-role party shows under EACH of its roles.
    if (filterType === "Staff") {
      if (!p.is_staff) return false;
    } else if (filterType !== "All") {
      const wantKey = toRoleKey(filterType);
      const partyKeys = parsePartyRoles(p);
      if (wantKey && !partyKeys.includes(wantKey)) return false;
    }
    const s = search.toLowerCase();
    if (s && !p.name?.toLowerCase().includes(s) && !(p.phone||"").includes(s) && !(p.city||"").toLowerCase().includes(s)) return false;
    return true;
  });

  const openCreate = () => { setEditing(null); setSaveErr(""); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (p) => {
    setEditing(p); setSaveErr("");
    setForm({
      name: p.name||"", type: p.is_staff ? "Staff" : (p.type||"Material Vendor"),
      roles: parsePartyRoles(p),
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
        // Send the multi-role array; backend stores comma-joined roles +
        // sets type=primary. `type` still included for older-backend safety.
        payload.roles = Array.isArray(form.roles) && form.roles.length ? form.roles : [toRoleKey(form.type) || "material_vendor"];
      }
      if (editing) {
        const res = await api.put("/finance/parties/" + editing.id, payload);
        if (res.success) setParties(prev => prev.map(p => p.id === editing.id ? { ...p, ...res.data } : p));
        else { setSaveErr(res.message || "Save failed"); setSaving(false); return; }
      } else {
        const res = await api.post("/finance/parties", payload);
        if (res.success) {
          setParties(prev => [res.data, ...prev]);
          if (res.data?.is_staff) window.alert(t("master_library.staff_party_banayi_gayi_wallet_ready"));
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
    { key: "name", label: t("finance.party_name"), minW: 200, render: r => (
      <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600 }}>{r.name}</span>
        {r.is_staff ? <Badge text={t("master_library.staff")} color={T.teal} bg={T.tealSoft} /> : null}
        {r.is_staff && r.is_linked ? (
          <span title={r.user_is_active === 0 ? t("master_library.user_deactivated") : t("master_library.linked_to_user_account")}
            style={{ fontSize: 10.5, fontWeight: 600, padding: "1px 6px", borderRadius: 10,
              background: r.user_is_active === 0 ? T.borderLight : T.blueSoft,
              color: r.user_is_active === 0 ? T.textLight : T.blue }}>
            🔗 {r.user_is_active === 0 ? t("master_library.user_off") : t("master_library.linked")}
          </span>
        ) : null}
      </span>
    )},
    { key: "type", label: t("master_library.roles"), minW: 180, render: r => {
      // Multi-role: render one colored badge per role, separated by a " / "
      // divider so multiple roles read as "Material Vendor / Transporter".
      const keys = parsePartyRoles(r);
      const keyToLabel = { material_vendor:"Material Vendor", equipment_vendor:"Equipment Vendor", client:"Client", subcontractor:"Subcontractor", labour_vendor:"Labour Vendor", transporter:"Transporter", consultant:"Consultant", staff:"Staff" };
      return (
        <span style={{ display:"inline-flex", flexWrap:"wrap", alignItems:"center", gap:4 }}>
          {keys.map((k, i) => {
            const label = keyToLabel[k] || k;
            const tc = typeColors[label] || { c: T.textMid, bg: T.borderLight };
            return (
              <span key={k} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                {i > 0 && <span style={{ color: T.textLight, fontWeight:700, fontSize:12 }}>/</span>}
                <Badge text={label} color={tc.c} bg={tc.bg} />
              </span>
            );
          })}
        </span>
      );
    }},
    { key: "phone", label: t("common.phone"), minW: 130, style: { fontFamily: "monospace", fontSize: 12 } },
    { key: "city", label: t("common.city"), minW: 80 },
    { key: "opening_balance", label: t("common.balance"), minW: 100, align: "right", render: r => {
      const bal = Number(r.opening_balance) || 0;
      return <span style={{ fontWeight: 700, color: bal > 0 ? T.green : bal < 0 ? T.red : T.textMid }}>
        {bal !== 0 ? `${bal > 0 ? "+" : ""}Rs.${Math.abs(bal).toLocaleString()}` : "—"}
      </span>;
    }},
    { key: "rating", label: t("master_library.rating"), minW: 60, align: "center", render: r => r.rating > 0 ? (
      <div style={{ display: "flex", gap: 1, justifyContent: "center" }}>{[1,2,3,4,5].map(i => <IcStar key={i} size={12} color={i <= r.rating ? T.amber : T.borderLight} fill={i <= r.rating ? T.amber : "none"} strokeWidth={0} />)}</div>
    ) : <span style={{ color: T.textLight, fontSize: 11 }}>N/A</span> },
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="parties" onAdd={openCreate} addLabel="Add Party"
        templateConfig={partyTemplateConfig} currentData={parties} onImportData={handlePartyImport}
        filterEl={<div style={{minWidth:180}}><SearchSelect value={filterType} options={types} onChange={setFilterType} placeholder={t("master_library.filter_type")}/></div>}
      />
      {/* Row click opens the detail drawer; Actions column hidden
          (edit/delete now live inside the drawer). */}
      <DataTable columns={columns} data={filtered} onRowClick={setDetailParty} hideActions />

      {/* ── Party Detail side-drawer ───────────────────────────── */}
      {detailParty && (() => {
        const p = detailParty;
        const roleKeys = parsePartyRoles(p);
        const keyToLabel = { material_vendor:"Material Vendor", equipment_vendor:"Equipment Vendor", client:"Client", subcontractor:"Subcontractor", labour_vendor:"Labour Vendor", transporter:"Transporter", consultant:"Consultant", staff:"Staff" };
        const Row = ({ label, value, mono }) => (
          <div style={{ display:"flex", padding:"9px 0", borderBottom:`1px solid ${T.borderLight}` }}>
            <span style={{ width:130, flexShrink:0, fontSize:11.5, color:T.textLight, fontWeight:600, textTransform:"uppercase", letterSpacing:".3px" }}>{label}</span>
            <span style={{ flex:1, fontSize:13, color:value?T.text:T.textLight, fontFamily: mono?"monospace":"inherit", wordBreak:"break-word" }}>{value || "—"}</span>
          </div>
        );
        const bal = Number(p.opening_balance) || 0;
        return (
          <>
            <div 
              style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:340, backdropFilter:"blur(2px)" }}/>
            <div style={{ position:"fixed", top:0, right:0, height:"100vh", width:440, maxWidth:"94vw", background:T.card, zIndex:341, boxShadow:"-8px 0 28px rgba(0,0,0,0.18)", display:"flex", flexDirection:"column" }}>
              {/* Header */}
              <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:17, fontWeight:700, color:T.text, lineHeight:1.25 }}>{p.name}</div>
                  <div style={{ display:"inline-flex", flexWrap:"wrap", alignItems:"center", gap:4, marginTop:7 }}>
                    {roleKeys.map((k,i) => {
                      const label = keyToLabel[k] || k;
                      const tc = typeColors[label] || { c:T.textMid, bg:T.borderLight };
                      return (
                        <span key={k} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                          {i>0 && <span style={{ color:T.textLight, fontWeight:700 }}>/</span>}
                          <Badge text={label} color={tc.c} bg={tc.bg} />
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button onClick={() => setDetailParty(null)}
                  style={{ background:"none", border:"none", fontSize:22, lineHeight:1, color:T.textLight, cursor:"pointer", padding:2 }}>×</button>
              </div>
              {/* Body */}
              <div style={{ flex:1, overflowY:"auto", padding:"8px 20px" }}>
                {/* Balance highlight */}
                {bal !== 0 && (
                  <div style={{ margin:"10px 0", padding:"10px 14px", borderRadius:8, background: bal>0?T.greenSoft:T.redSoft, border:`1px solid ${(bal>0?T.green:T.red)}33` }}>
                    <div style={{ fontSize:10.5, fontWeight:700, color:T.textLight, textTransform:"uppercase" }}>{t("common.opening_balance")}</div>
                    <div style={{ fontSize:18, fontWeight:800, color: bal>0?T.green:T.red, marginTop:2 }}>{t("master_library.bal_rs_math", { bal: bal>0?"+":"−", Math: Math.abs(bal).toLocaleString("en-IN") })}</div>
                  </div>
                )}
                <div style={{ marginTop:6 }}>
                  <Row label={t("master_library.contact_person")} value={p.contact_person} />
                  <Row label={t("common.phone")} value={p.phone} mono />
                  <Row label={t("common.email")} value={p.email} />
                  <Row label="GSTIN" value={p.gstin} mono />
                  <Row label="PAN" value={p.pan} mono />
                  <Row label={t("crm.address")} value={p.address} />
                  <Row label={t("common.city")} value={p.city} />
                  <Row label={t("master_library.credit_days")} value={p.credit_days != null ? `${p.credit_days} days` : ""} />
                </div>
                {/* Bank details */}
                {(p.bank_name || p.bank_account || p.ifsc) && (
                  <div style={{ marginTop:14 }}>
                    <div style={{ fontSize:11.5, fontWeight:700, color:T.text, marginBottom:4, textTransform:"uppercase", letterSpacing:".3px" }}>{t("common.bank_details")}</div>
                    <Row label={t("common.bank_name")} value={p.bank_name} />
                    <Row label={t("master_library.account_no")} value={p.bank_account} mono />
                    <Row label="IFSC" value={p.ifsc} mono />
                  </div>
                )}
                {p.is_staff ? (
                  <div style={{ marginTop:14 }}>
                    <div style={{ fontSize:11.5, fontWeight:700, color:T.text, marginBottom:4, textTransform:"uppercase", letterSpacing:".3px" }}>{t("master_library.staff_info")}</div>
                    <Row label={t("master_library.subtype")} value={p.staff_subtype} />
                    <Row label={t("master_library.designation")} value={p.designation} />
                    <Row label={t("master_library.wallet_limit")} value={p.wallet_limit != null ? `Rs.${Number(p.wallet_limit).toLocaleString("en-IN")}` : ""} />
                  </div>
                ) : null}
              </div>
              {/* Footer — Edit + Delete */}
              <div style={{ padding:"12px 20px", borderTop:`1px solid ${T.border}`, display:"flex", gap:10 }}>
                <button onClick={() => { const tgt = p; setDetailParty(null); openEdit(tgt); }}
                  style={{ flex:1, padding:"9px", borderRadius:8, background:T.blue, color:"white", border:"none", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <IcEdit size={15} color="white" /> {t("common.edit_2")}
                </button>
                <button onClick={async () => { if (await window.confirmAsync(t("master_library.delete_name", { name: p.name }))) { await del(p.id); setDetailParty(null); } }}
                  style={{ padding:"9px 16px", borderRadius:8, background:T.redSoft, color:T.red, border:`1px solid ${T.red}44`, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                  <IcTrash size={15} color={T.red} /> {t("common.delete")}
                </button>
              </div>
            </div>
          </>
        );
      })()}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? t("master_library.edit_party") : t("master_library.add_party")} desc={t("master_library.party_supplier_client_staff_details")} width={660}>
        {saveErr ? (
          <div style={{ background: T.redSoft, border: `1px solid ${T.red}55`, color: T.red, fontSize: 12.5, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>{saveErr}</div>
        ) : null}
        <div style={{ marginBottom: 14 }}>
          <FormField label={t("finance.party_name")} value={form.name} onChange={v => upd("name", v)} placeholder={t("master_library.full_legal_name")} required disabled={editingLinkedStaff} />
        </div>
        {/* ── Multi-role selector ── ek party kai roles me ho sakti hai ── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>
           {t("master_library.roles")} <span style={{ color: T.red }}>*</span>
            <span style={{ fontWeight: 400, color: T.textMid, fontSize: 11, marginLeft: 6 }}>
             {t("master_library.ek_se_zyada_select_kar_sakte")}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ROLE_OPTIONS.map(opt => {
              const active = Array.isArray(form.roles) && form.roles.includes(opt.key);
              const col = typeColors[opt.label] || { c: T.blue, bg: T.blueSoft };
              const staffLocked = !!editing && (opt.key === "staff" ? !form.roles?.includes("staff") : form.roles?.includes("staff"));
              return (
                <button key={opt.key} type="button"
                  onClick={() => !staffLocked && toggleRole(opt.key)}
                  disabled={staffLocked}
                  style={{
                    padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: staffLocked ? "not-allowed" : "pointer",
                    border: `1.5px solid ${active ? col.c : T.border}`,
                    background: active ? col.bg : "white",
                    color: active ? col.c : T.textMid,
                    opacity: staffLocked ? 0.4 : 1,
                    display: "flex", alignItems: "center", gap: 5, transition: "all .12s",
                  }}>
                  {active && <span style={{ fontSize: 11 }}>✓</span>}
                  {opt.label}
                </button>
              );
            })}
          </div>
          {isStaffForm && (
            <div style={{ fontSize: 10.5, color: T.textMid, marginTop: 6, fontStyle: "italic" }}>
             {t("master_library.staff_alag_category_hai_wallet_app")}
            </div>
          )}
        </div>
        {editingLinkedStaff ? (
          <div style={{ fontSize: 11, color: T.textMid, marginTop: -8, marginBottom: 12 }}>
           {t("master_library.naam_phone_email_linked_staff_pe")} <b>{t("master_library.settings_users")}</b> {t("master_library.me_edit_karein")}
          </div>
        ) : null}

        {isStaffForm ? (
          /* ── STAFF FIELDS ── */
          <>
            {!editing ? (
              <div style={{ fontSize: 11.5, color: T.textMid, background: T.tealSoft, padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>
               {t("master_library.app_users_ko_staff_party_automatic")} <b>{t("master_library.off_app_casual_staff")}</b> {t("master_library.add_karein")}
              </div>
            ) : null}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>{t("master_library.staff_subtype")} <span style={{ color: T.red }}>*</span></div>
              <div style={{ display: "flex", gap: 10 }}>
                {[{ v: "office", l: t("master_library.office_staff_salaried") }, { v: "wages", l: t("master_library.daily_wages_worker") }].map(o => (
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
              <FormField label={t("master_library.designation")} value={form.designation} onChange={v => upd("designation", v)} placeholder={t("master_library.e_g_site_supervisor_mason_helper")} half />
              <FormField label={t("common.phone")} value={form.phone} onChange={v => upd("phone", v)} placeholder={t("common.91_xxxxx_xxxxx")} half disabled={editingLinkedStaff} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
              <FormField label={t("master_library.wallet_limit_2")} value={form.wallet_limit} onChange={v => upd("wallet_limit", v)} placeholder="e.g. 5000" half />
              <FormField label={t("master_library.negative_limit_allowed")} value={form.negative_limit} onChange={v => upd("negative_limit", v)} placeholder="e.g. 2000" half />
            </div>
            <FormField label={t("crm.address")} value={form.address || ""} onChange={v => upd("address", v)} placeholder={t("master_library.full_address")} />
            <div style={{ height: 14 }} />
            <FormField label={t("common.city")} value={form.city} onChange={v => upd("city", v)} />
          </>
        ) : (
        /* ── NON-STAFF FIELDS (unchanged) ── */
        <>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label={t("master_library.contact_person")} value={form.contact} onChange={v => upd("contact", v)} placeholder={t("common.name_2")} half />
          <FormField label={t("common.phone")} value={form.phone} onChange={v => upd("phone", v)} placeholder={t("common.91_xxxxx_xxxxx")} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label={t("common.email")} value={form.email} onChange={v => upd("email", v)} placeholder={t("master_library.email_company_com")} half />
          <FormField label={t("master_library.category_trade")} value={form.category} onChange={v => upd("category", v)} placeholder={t("master_library.e_g_cement_electrical")} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="GSTIN" value={form.gstin} onChange={v => upd("gstin", v)} placeholder={t("master_library.22aabc")} half />
          <FormField label="PAN" value={form.pan || ""} onChange={v => upd("pan", v)} placeholder={t("master_library.aabc")} half />
        </div>
        <FormField label={t("crm.address")} value={form.address || ""} onChange={v => upd("address", v)} placeholder={t("master_library.full_address")} />
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label={t("common.city")} value={form.city} onChange={v => upd("city", v)} half />
          <FormField label={t("master_library.pincode")} value={form.pincode || ""} onChange={v => upd("pincode", v)} half />
        </div>
        {/* Payment terms */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label={t("master_library.credit_days")} value={String(form.credit_days ?? 7)} onChange={v => upd("credit_days", parseInt(v) || 7)} options={["7","15","30","45","60","90"]} half />
          <div style={{ flex: 1, minWidth: 220, fontSize: 11.5, color: T.textMid, alignSelf: "flex-end", paddingBottom: 6 }}>
           {t("master_library.bills_se_payment_due_date")} <b>{t("master_library.credit_days_ke_baad")}</b> {t("master_library.auto_set_hota_hai_override_at")}
          </div>
        </div>
        {/* Bank details section */}
        <div style={{ padding: "12px 0 4px", fontSize: 13, fontWeight: 700, color: T.text, borderTop: `1px solid ${T.borderLight}`, marginTop: 4 }}>{t("master_library.bank_details_for_payment")}</div>
        <div style={{ height: 10 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label={t("common.bank_name")} value={form.bank_name || ""} onChange={v => upd("bank_name", v)} placeholder={t("master_library.e_g_sbi")} half />
          <FormField label={t("master_library.account_no_2")} value={form.acc_no || ""} onChange={v => upd("acc_no", v)} placeholder={t("master_library.account_number")} half />
        </div>
        <FormField label={t("master_library.ifsc_code")} value={form.ifsc || ""} onChange={v => upd("ifsc", v)} placeholder={t("master_library.e_g_sbin0005678")} />
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
    if (!form.name.trim()) return alert(t("master_library.work_category_name_required"));
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
    { key: "code", label: t("common.code"), minW: 70, render: r => r.code
        ? <code style={{ fontSize: 12, fontWeight: 600, color: T.purple, background: T.purpleSoft, padding: "2px 8px", borderRadius: 4 }}>{r.code}</code>
        : <span style={{ color: T.textLight }}>—</span> },
    { key: "name",        label: t("master_library.work_category"), minW: 180, render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: "description", label: t("common.description"),   minW: 260, render: r => <span style={{ fontSize: 12, color: T.textMid }}>{r.description || r.desc || "—"}</span> },
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label={t("master_library.work_categories")} onAdd={openCreate} addLabel="Add Work Category"
        templateConfig={workTemplateConfig} currentData={cats} onImportData={handleWorkImport} />
      <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? t("master_library.edit_work_category") : t("master_library.add_work_category")} width={520}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label={t("master_library.work_category_name")} value={form.name} onChange={v => upd("name", v)} placeholder={t("master_library.e_g_rcc_work")} half required />
          <FormField label={t("common.code")} value={form.code} onChange={v => upd("code", v.toUpperCase())} placeholder={t("master_library.e_g_rcc")} half />
        </div>
        <FormTextarea label={t("common.description")} value={form.desc} onChange={v => upd("desc", v)} placeholder={t("master_library.what_work_is_included")} rows={2} />
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
    { key: "name", label: t("master_library.firm_name"), minW: 150, render: r => (<div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11, color: T.textLight }}>{r.owner}</div></div>) },
    { key: "trade", label: t("master_library.trade"), minW: 110, render: r => <Badge text={r.trade} color={T.purple} bg={T.purpleSoft} /> },
    { key: "phone", label: t("common.phone"), minW: 120, style: { fontFamily: "monospace", fontSize: 12 } },
    { key: "description", label: t("master_library.city_area"), minW: 70, render: r => <span>{r.description||r.city||"—"}</span> },
    { key: "labour_strength", label: t("common.labour"), minW: 60, align: "center", render: r => <span style={{ fontWeight: 600 }}>{r.labour_strength}</span> },
    { key: "rate", label: t("common.rate"), minW: 100, align: "right", render: r => <span style={{ fontWeight: 700, color: T.text }}>{t("master_library.rs_rate_ratetype", { rate: r.rate, rateType: r.rateType })}</span> },
    { key: "activeProjects", label: t("common.projects"), minW: 60, align: "center", render: r => <Badge text={r.activeProjects} color={r.activeProjects > 0 ? T.green : T.textLight} bg={r.activeProjects > 0 ? T.greenSoft : T.borderLight} /> },
    { key: "rating", label: t("master_library.rating"), minW: 70, align: "center", render: r => r.rating > 0 ? <div style={{ display: "flex", gap: 1, justifyContent: "center" }}>{[1,2,3,4,5].map(i => <IcStar key={i} size={11} color={i <= r.rating ? T.amber : T.borderLight} fill={i <= r.rating ? T.amber : "none"} strokeWidth={0} />)}</div> : "—" },
    { key: "status", label: t("common.status"), minW: 70, render: r => <Badge text={r.status} color={r.status === "Active" ? T.green : T.red} bg={r.status === "Active" ? T.greenSoft : T.redSoft} /> },
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? t("master_library.edit_subcontractor") : t("master_library.add_subcontractor")} desc={t("master_library.subcontractor_firm_details")} width={580}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label={t("master_library.firm_company_name")} value={form.name} onChange={v => upd("name", v)} placeholder={t("master_library.e_g_raj_construction")} half required />
          <FormField label={t("master_library.owner_contact_person")} value={form.owner} onChange={v => upd("owner", v)} placeholder={t("common.owner_name")} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label={t("master_library.trade_specialty")} value={form.trade} onChange={v => upd("trade", v)} options={["RCC & Civil","Electrical Work","Plumbing","Painting","Tiles & Flooring","Fabrication","Carpentry","Waterproofing","False Ceiling","HVAC","Landscaping","Demolition","Other"]} half required />
          <FormField label={t("common.phone")} value={form.phone} onChange={v => upd("phone", v)} placeholder={t("common.91_xxxxx_xxxxx")} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label={t("common.city")} value={form.city} onChange={v => upd("city", v)} half />
          <FormField label={t("master_library.labour_strength")} value={form.labour_strength || ""} onChange={v => upd("labour_strength", parseInt(v) || 0)} type="number" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="GSTIN" value={form.gstin} onChange={v => upd("gstin", v)} placeholder={t("master_library.if_registered")} half />
          <FormSelect label={t("common.status")} value={form.status} onChange={v => upd("status", v)} options={["Active","Inactive","Blacklisted"]} half />
        </div>
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={editing ? "Update" : "Add Subcontractor"} />
      </Modal>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// SUBCON RATE CARD SECTION
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// SUBCON RATE CARD — Dual mode: Floor Package + Work Items
// Floor Package: Construction Type → City → Trade Category → Rate Card
//                → Sections → Categories → Items  (mirrors Client BOQ)
// Work Items:    Construction Type → City → flat items with unit rates
// ═══════════════════════════════════════════════════════════════════════
function SubconRateCardSection() {
  const TRADE_CATS = ["Civil","Electrical","Plumbing","Finishing","Tile","MEP","Waterproofing","Painting","Other"];

  // ── Mode ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState("package"); // "package" | "item_wise"

  // ── Shared: Construction Type + City ──────────────────────────────────
  const [conTypes, setConTypes] = useState([]);
  const [cities,   setCities]   = useState([]);
  const [selType,  setSelType]  = useState(null);
  const [selCity,  setSelCity]  = useState(null);

  // ── Package mode ───────────────────────────────────────────────────────
  const [selTrade,      setSelTrade]      = useState(null);
  const [packages,      setPackages]      = useState([]);
  const [selPkg,        setSelPkg]        = useState(null);
  const [pkgStructures, setPkgStructures] = useState([]);
  const [pkgCategories, setPkgCategories] = useState([]);
  const [sectionItems,  setSectionItems]  = useState({}); // {sid:[rows]}
  const [collapsedSecs, setCollapsedSecs] = useState({});
  const [collapsedCats, setCollapsedCats] = useState({});

  // Pending edits (same pattern as ClientBOQSection)
  const [sectionEdits,    setSectionEdits]    = useState({});
  const [itemEdits,       setItemEdits]       = useState({});
  const [editingSections, setEditingSections] = useState({});
  const [pendingNewItems, setPendingNewItems] = useState({});  // {sid:[{_isNew,item_id,category_id,base_rate,...}]}
  const [pendingDelItems, setPendingDelItems] = useState({});
  const [saving,          setSaving]          = useState(false);

  // Add Section modal
  const [addSecModal,  setAddSecModal]  = useState(false);
  const [addSecForm,   setAddSecForm]   = useState({ name: "", default_qty: 0, unit: "sqft", per_item_qty: false });
  const [addSecSaving, setAddSecSaving] = useState(false);
  const [saveError,    setSaveError]    = useState("");

  // Add Category drawer state (same as ClientBOQSection)
  const [addCatDrawer,  setAddCatDrawer]  = useState(null); // {structure_id, section_name}
  const [addCatPicks,   setAddCatPicks]   = useState([]);   // ordered [workCatId,...]
  const [addCatNewForm, setAddCatNewForm] = useState(null); // {name,code,desc} | null
  const [addCatSaving,  setAddCatSaving]  = useState(false);

  // Add Item drawer state
  const [addItemDrawer,  setAddItemDrawer]  = useState(null); // {structure_id,section_name,category_id,category_name}
  const [addItemPicks,   setAddItemPicks]   = useState([]);   // ordered [boqItemId,...]
  const [addItemSearch,  setAddItemSearch]  = useState("");
  const [addItemNewForm, setAddItemNewForm] = useState(null); // {name,unit,base_rate,description} | null
  const [addItemSaving,  setAddItemSaving]  = useState(false);

  // BOQ items master list (same as Client BOQ — subcon packages share boq_items)
  const [boqItems, setBoqItems] = useState([]);
  const { items: workCats, reload: reloadWorkCats } = useSection("work-categories");

  // Package CRUD modals
  const [addPkgModal, setAddPkgModal] = useState(false);
  const [editingPkg,  setEditingPkg]  = useState(null);
  const [pkgForm,     setPkgForm]     = useState({ name:"", sqft_rate:"", description:"" });
  const [pkgSaving,   setPkgSaving]   = useState(false);

  // ── Item-wise mode ─────────────────────────────────────────────────────
  const [workItems,     setWorkItems]     = useState([]);
  const [itemsLoading,  setItemsLoading]  = useState(false);
  const [tradeFilter,   setTradeFilter]   = useState("All");
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem,   setEditingItem]   = useState(null);
  const [itemForm,      setItemForm]      = useState({ name:"", unit:"Sqft", trade_category:"Civil", description:"", rate:"" });
  const [itemSaving,    setItemSaving]    = useState(false);

  const { items: uomList } = useSection("uom");
  const uomOpts = uomList.length ? uomList.map(u => u.name) : ["Sqft","Cft","Running Ft","Kg","Point","Unit","Lump Sum","Piece","Nos"];

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/library/construction-types").then(r => r.success && setConTypes(r.data||[]));
    api.get("/library/cities").then(r => r.success && setCities(r.data||[]));
    api.get("/library/boq-items").then(r => r.success && setBoqItems(r.data||[]));
  }, []);

  // ── Load packages when type + trade changes ────────────────────────────
  useEffect(() => {
    if (!selType || !selTrade) { setPackages([]); setSelPkg(null); return; }
    api.get(`/library/rate-packages?for=subcon&trade_category=${encodeURIComponent(selTrade)}&type_id=${selType.id}`)
      .then(r => { if (r.success) setPackages(r.data||[]); })
      .catch(() => {});
    setSelPkg(null);
    setSectionEdits({}); setItemEdits({}); setPendingDelItems({}); setEditingSections({});
    // eslint-disable-next-line
  }, [selType?.id, selTrade]);

  // ── Load package tree ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selPkg) { setPkgStructures([]); setPkgCategories([]); setSectionItems({}); return; }
    Promise.all([
      api.get(`/library/packages/${selPkg.id}/structures`),
      api.get(`/library/packages/${selPkg.id}/categories`),
    ]).then(([sr, cr]) => {
      const structs = sr.success ? sr.data||[] : [];
      setPkgStructures(structs);
      if (cr.success) setPkgCategories(cr.data||[]);
    });
    setSectionEdits({}); setItemEdits({}); setPendingDelItems({}); setEditingSections({});
    // eslint-disable-next-line
  }, [selPkg?.id]);

  // Re-fan items when city or structures change
  useEffect(() => {
    if (!selPkg || !selCity || !pkgStructures.length) { setSectionItems({}); return; }
    Promise.all(pkgStructures.map(s =>
      api.get(`/library/rate-matrix?package_id=${selPkg.id}&city_id=${selCity.id}&structure_id=${s.id}`)
        .then(r => [s.id, r.success ? r.data||[] : []])
        .catch(() => [s.id, []])
    )).then(results => {
      const map = {};
      for (const [sid, rows] of results) map[sid] = rows;
      setSectionItems(map);
    });
    // eslint-disable-next-line
  }, [selPkg?.id, selCity?.id, pkgStructures]);

  // ── Load work items ────────────────────────────────────────────────────
  const loadWorkItems = useCallback(() => {
    if (!selCity || !selType) { setWorkItems([]); return; }
    setItemsLoading(true);
    api.get(`/library/subcon-work-items?city_id=${selCity.id}&type_id=${selType.id}`)
      .then(r => { if (r.success) setWorkItems(r.data||[]); })
      .catch(() => {})
      .finally(() => setItemsLoading(false));
  }, [selCity?.id, selType?.id]);

  useEffect(() => {
    if (mode === "item_wise") loadWorkItems();
  }, [mode, loadWorkItems]);

  // ── Effective value helpers ────────────────────────────────────────────
  const getSecArea = (sec) => {
    const ed = sectionEdits[sec.id];
    return ed?.default_qty !== undefined ? Number(ed.default_qty)||0 : Number(sec.default_qty)||0;
  };
  const getSecName = (sec) => {
    const ed = sectionEdits[sec.id];
    return ed?.name !== undefined ? ed.name : sec.name;
  };
  const getRowBase = (sid, row) => {
    const ed = itemEdits[sid]?.[row.item_id];
    if (ed?.base_rate !== undefined) return Number(ed.base_rate)||0;
    return row.base_rate != null ? Number(row.base_rate) : (Number(row.rate)||0) - (Number(row.add_on_rate)||0);
  };
  const getRowAddOn = (sid, row) => {
    const ed = itemEdits[sid]?.[row.item_id];
    return ed?.add_on_rate !== undefined ? Number(ed.add_on_rate)||0 : Number(row.add_on_rate)||0;
  };
  const patchSection = (sid, patch) => setSectionEdits(p => ({ ...p, [sid]: { ...(p[sid]||{}), ...patch } }));
  const patchRow = (sid, itemId, patch) => setItemEdits(p => ({
    ...p, [sid]: { ...(p[sid]||{}), [itemId]: { ...(p[sid]?.[itemId]||{}), ...patch } }
  }));

  // ── per_item_qty + calculation helpers (same as ClientBOQSection) ──────
  const getSecPerItem = (sec) => {
    const ed = sectionEdits[sec.id];
    if (ed?.per_item_qty !== undefined) return !!ed.per_item_qty;
    return !!Number(sec.per_item_qty);
  };
  const getRowQty = (sid, row) => {
    const ed = itemEdits[sid]?.[row.item_id];
    if (ed?.qty !== undefined) return ed.qty;
    return (row.qty === null || row.qty === undefined) ? 0 : Number(row.qty);
  };
  // Build rows for a category (saved + pendingNew − pendingDel)
  // Matches by category_id OR category_name (backend may return either)
  const subconCatRows = (sid, cat) => {
    const delSet = pendingDelItems[sid] || {};
    const saved  = (sectionItems[sid] || []).filter(r =>
      (Number(r.category_id) === Number(cat.id) || r.category_name === cat.category_name)
      && !delSet[r.item_id]
    );
    const news   = (pendingNewItems[sid] || []).filter(r => Number(r.category_id) === Number(cat.id)).map(r => ({
      ...r,
      item_name: boqItems.find(i => i.id === r.item_id)?.name || "",
      unit:      boqItems.find(i => i.id === r.item_id)?.unit || "Sqft",
      _pending:  true,
    }));
    return [...saved, ...news];
  };
  const calcRow = (sid, row, area, perItem) => {
    const base  = Number(getRowBase(sid, row)) || 0;
    const addOn = Number(getRowAddOn(sid, row)) || 0;
    const qty   = perItem ? (Number(getRowQty(sid, row)) || 0) : area;
    return { base, addOn, qty, perSqft: base + addOn, total: (base + addOn) * qty };
  };
  const calcCategory = (sid, cat, area, perItem) => {
    let base = 0, addOn = 0, itemTotalSum = 0;
    for (const r of subconCatRows(sid, cat)) {
      const rc = calcRow(sid, r, area, perItem);
      base += rc.base; addOn += rc.addOn; itemTotalSum += rc.total;
    }
    const perSqft = base + addOn;
    const total = perItem ? itemTotalSum : (perSqft * area);
    return { base, addOn, perSqft, total };
  };
  const calcSection = (sec) => {
    const area    = getSecArea(sec);
    const perItem = getSecPerItem(sec);
    const cats    = pkgCategories.filter(c => c.structure_id === sec.id);
    let base = 0, addOn = 0, total = 0;
    for (const cat of cats) {
      const c = calcCategory(sec.id, cat, area, perItem);
      base += c.base; addOn += c.addOn; total += c.total;
    }
    const perSqft = base + addOn;
    const sectionTotal = perItem ? total : (perSqft * area);
    return { area, perItem, base, addOn, perSqft, total: sectionTotal };
  };
  const calcGrand = () => {
    let base = 0, addOn = 0, total = 0;
    for (const sec of pkgStructures) {
      const s = calcSection(sec);
      base += s.base; addOn += s.addOn; total += s.total;
    }
    return { base, addOn, total };
  };

  // ── Save Rates ─────────────────────────────────────────────────────────
  const saveRates = async () => {
    if (!selPkg || !selCity) return;
    setSaving(true);
    try {
      // 1. Section name/area/per_item_qty updates
      for (const [sidStr, ed] of Object.entries(sectionEdits)) {
        const body = {};
        if (ed.name         !== undefined) body.name         = ed.name.trim();
        if (ed.default_qty  !== undefined) body.default_qty  = Number(ed.default_qty) || 0;
        if (ed.per_item_qty !== undefined) body.per_item_qty = !!ed.per_item_qty;
        if (Object.keys(body).length) {
          await api.put(`/library/structures/${sidStr}`, body).catch(() => {});
        }
      }

      // 2. Build committed sectionItems optimistically — don't rely on GET reload.
      //    This prevents flicker/blank when the reload GET is slow or 404s.
      const committed = { ...sectionItems };

      const dirtySids = new Set([
        ...Object.keys(itemEdits),
        ...Object.keys(pendingDelItems),
        ...Object.keys(pendingNewItems),
      ].map(Number));
      Object.keys(sectionEdits).forEach(sid => {
        const ed = sectionEdits[sid];
        if ((ed?.default_qty !== undefined || ed?.per_item_qty !== undefined) && (sectionItems[Number(sid)]||[]).length)
          dirtySids.add(Number(sid));
      });

      for (const sid of dirtySids) {
        const sec     = pkgStructures.find(s => s.id === sid);
        const area    = sec ? getSecArea(sec) : 0;
        const perItem = sec ? getSecPerItem(sec) : false;
        const allRows = sectionItems[sid] || [];
        const edits   = itemEdits[sid] || {};
        const delSet  = pendingDelItems[sid] || {};

        // Existing rows with edits applied
        const rows = allRows.filter(r => !delSet[r.item_id]).map(r => ({
          ...r,
          base_rate:   edits[r.item_id]?.base_rate   !== undefined ? Number(edits[r.item_id].base_rate)||0   : Number(r.base_rate != null ? r.base_rate : (Number(r.rate||0) - Number(r.add_on_rate||0)))||0,
          add_on_rate: edits[r.item_id]?.add_on_rate !== undefined ? Number(edits[r.item_id].add_on_rate)||0 : Number(r.add_on_rate)||0,
          description: edits[r.item_id]?.description !== undefined ? edits[r.item_id].description : (r.description||""),
          qty:         perItem ? (edits[r.item_id]?.qty !== undefined ? Number(edits[r.item_id].qty)||0 : Number(r.qty)||0) : area,
        }));

        // Pending new items — hydrate with name/category_name/unit for display
        const newRowsFull = (pendingNewItems[sid]||[]).map(r => {
          const master = boqItems.find(i => i.id === r.item_id);
          const cat    = pkgCategories.find(c => c.id === r.category_id);
          return {
            ...r,
            item_name:     master?.name || "",
            category_name: cat?.category_name || r.category_name || "",
            unit:          master?.unit || r.unit || "Sqft",
            base_rate:     Number(r.base_rate)||0,
            add_on_rate:   Number(r.add_on_rate)||0,
            description:   r.description||"",
            qty:           perItem ? (Number(getRowQty(sid, r))||0) : area,
            _pending:      false, // mark as committed after save
          };
        });

        // Optimistically update UI immediately
        committed[sid] = [...rows, ...newRowsFull];

        // POST to backend — await so errors surface
        const apiRows = [...rows, ...newRowsFull].map(r => ({
          item_id:     r.item_id,
          category_id: r.category_id || null,
          base_rate:   Number(r.base_rate)||0,
          add_on_rate: Number(r.add_on_rate)||0,
          description: r.description||"",
          qty:         Number(r.qty)||0,
        }));
        const saveRes = await api.post(`/library/rate-matrix/bulk`, {
          package_id: selPkg.id, city_id: selCity.id, structure_id: sid,
          items: apiRows,
        }).catch(e => ({ success: false, message: e?.message || "Network error" }));

        if (saveRes?.success) {
          // Sync from server to get proper server-side IDs
          const fresh = await api.get(
            `/library/rate-matrix?package_id=${selPkg.id}&city_id=${selCity.id}&structure_id=${sid}`
          ).catch(() => ({ success: false }));
          if (fresh?.success && fresh.data?.length) {
            committed[sid] = fresh.data;
          }
        } else {
          console.error("[SubconRateCard] bulk save failed sid", sid, saveRes?.message);
          // Warn user — data is shown but may not persist after refresh
          setSaveError(`Save failed for section ${sid}: ${saveRes?.message || "Unknown error"}. Data shown but may not persist.`);
        }
      }

      // Update UI with committed state (from optimistic or server refresh)
      setSectionItems(committed);
      setSectionEdits({}); setItemEdits({}); setPendingNewItems({}); setPendingDelItems({}); setEditingSections({});
    } finally { setSaving(false); }
  };

  // ── Package CRUD ───────────────────────────────────────────────────────
  const savePkg = async () => {
    if (!pkgForm.name.trim()) return alert(t("master_library.package_name_required"));
    if (!selTrade || !selType) return alert(t("master_library.select_trade_category_and_construction_type"));
    setPkgSaving(true);
    const payload = {
      name: pkgForm.name.trim(), sqft_rate: parseFloat(pkgForm.sqft_rate)||0,
      description: pkgForm.description, construction_type_id: selType.id,
      package_for: "subcon", trade_category: selTrade,
    };
    const r = editingPkg
      ? await api.put(`/library/rate-packages/${editingPkg.id}`, payload).catch(() => ({success:false}))
      : await api.post("/library/rate-packages", payload).catch(() => ({success:false}));
    setPkgSaving(false);
    if (!r.success) { alert(r.message||"Save failed"); return; }
    setAddPkgModal(false); setEditingPkg(null); setPkgForm({name:"",sqft_rate:"",description:""});
    api.get(`/library/rate-packages?for=subcon&trade_category=${encodeURIComponent(selTrade)}&type_id=${selType.id}`)
      .then(res => { if (res.success) { setPackages(res.data||[]); if (editingPkg) setSelPkg(p => res.data.find(x => x.id===editingPkg.id)||p); } });
  };

  // ── Work item CRUD ─────────────────────────────────────────────────────
  const openAddItem = () => {
    setEditingItem(null);
    setItemForm({ name:"", unit:"Sqft", trade_category:tradeFilter!=="All"?tradeFilter:"Civil", description:"", rate:"" });
    setShowItemModal(true);
  };
  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({ name:item.name, unit:item.unit||"Sqft", trade_category:item.trade_category||"Civil", description:item.description||"", rate:String(item.rate||"") });
    setShowItemModal(true);
  };
  const saveItem = async () => {
    if (!itemForm.name.trim()) return alert(t("master_library.item_name_required"));
    if (!selCity || !selType) return alert(t("master_library.select_city_and_construction_type_first"));
    setItemSaving(true);
    const payload = {
      name:itemForm.name.trim(), unit:itemForm.unit, trade_category:itemForm.trade_category,
      description:itemForm.description, city_id:selCity.id, construction_type_id:selType.id,
      rate:parseFloat(itemForm.rate)||0,
    };
    const r = editingItem
      ? await api.put(`/library/subcon-work-items/${editingItem.id}`, payload).catch(() => ({success:false}))
      : await api.post("/library/subcon-work-items", payload).catch(() => ({success:false}));
    setItemSaving(false);
    if (!r.success) { alert(r.message||"Save failed"); return; }
    setShowItemModal(false); loadWorkItems();
  };
  const deleteItem = async (id) => {
    if (!await window.confirmAsync(t("master_library.delete_this_work_item"))) return;
    const r = await api.del(`/library/subcon-work-items/${id}`).catch(() => ({success:false}));
    if (r.success) setWorkItems(p => p.filter(x => x.id !== id));
    else alert(r.message||"Delete failed");
  };

  // ── Category drawer handlers (same logic as ClientBOQSection) ──────────
  const openAddCatDrawer = (sec) => {
    setAddCatPicks([]); setAddCatNewForm(null);
    setAddCatDrawer({ structure_id: sec.id, section_name: getSecName(sec) });
  };
  const closeAddCatDrawer = () => { if (!addCatSaving) setAddCatDrawer(null); };
  const toggleCatPick = (id) => setAddCatPicks(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);

  const confirmAddCats = async () => {
    if (!addCatDrawer) return;
    setAddCatSaving(true);
    const existingMaxSort = pkgCategories
      .filter(c => c.structure_id === addCatDrawer.structure_id)
      .reduce((mx,c) => Math.max(mx, Number(c.sort_order)||0), 0);
    for (let i=0; i<addCatPicks.length; i++) {
      const id = addCatPicks[i];
      const nm = workCats.find(c => c.id===id)?.name;
      if (!nm) continue;
      await api.post("/library/packages/" + selPkg.id + "/categories", {
        structure_id:  addCatDrawer.structure_id,
        category_name: nm,
        sort_order:    existingMaxSort + 1 + i,
      });
    }
    setAddCatSaving(false);
    // Reload categories
    const r = await api.get(`/library/packages/${selPkg.id}/categories`).catch(()=>({success:false}));
    if (r.success) setPkgCategories(r.data||[]);
    closeAddCatDrawer();
  };
  const createAndAddCat = async () => {
    if (!addCatNewForm?.name?.trim() || !addCatDrawer) return;
    setAddCatSaving(true);
    const cr = await api.post("/library/work-categories", {
      name: addCatNewForm.name.trim(), code: (addCatNewForm.code||"").trim(),
      description: (addCatNewForm.desc||"").trim(),
    });
    if (cr?.success) {
      await api.post("/library/packages/" + selPkg.id + "/categories", {
        structure_id: addCatDrawer.structure_id,
        category_name: addCatNewForm.name.trim(),
      });
      await reloadWorkCats();
      const r = await api.get(`/library/packages/${selPkg.id}/categories`).catch(()=>({success:false}));
      if (r.success) setPkgCategories(r.data||[]);
      setAddCatNewForm(null);
    } else alert(cr?.message||"Failed to create category");
    setAddCatSaving(false);
  };

  // ── Item drawer handlers ────────────────────────────────────────────────
  const openAddItemDrawer = (sec, cat) => {
    setAddItemPicks([]); setAddItemSearch(""); setAddItemNewForm(null);
    setAddItemDrawer({
      structure_id:  sec.id,   section_name:  getSecName(sec),
      category_id:   cat.id,   category_name: cat.category_name,
    });
  };
  const closeAddItemDrawer = () => { if (!addItemSaving) setAddItemDrawer(null); };
  const toggleItemPick = (id) => setAddItemPicks(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);

  const confirmAddItems = () => {
    if (!addItemDrawer) return;
    const sid   = addItemDrawer.structure_id;
    const catId = addItemDrawer.category_id;
    const existing = new Set([
      ...(sectionItems[sid]||[]).map(r => r.item_id),
      ...(pendingNewItems[sid]||[]).map(r => r.item_id),
    ]);
    const fresh = addItemPicks.filter(id => !existing.has(id)).map(id => {
      const master = boqItems.find(i => i.id===id);
      return { _isNew:true, item_id:id, category_id:catId, base_rate:Number(master?.base_rate)||0, add_on_rate:0, description:"" };
    });
    if (fresh.length) setPendingNewItems(p => ({...p, [sid]:[...(p[sid]||[]),...fresh]}));
    // Un-mark any pending deletes for re-added items
    setPendingDelItems(p => {
      const sec = {...(p[sid]||{})};
      for (const id of addItemPicks) delete sec[id];
      return {...p, [sid]:sec};
    });
    closeAddItemDrawer();
  };
  const createAndAddItem = async () => {
    if (!addItemNewForm?.name?.trim() || !addItemDrawer) return;
    setAddItemSaving(true);
    const r = await api.post("/library/boq-items", {
      name:        addItemNewForm.name.trim(),
      category:    addItemNewForm.category || addItemDrawer.category_name,
      unit:        addItemNewForm.unit || "Sqft",
      base_rate:   Number(addItemNewForm.base_rate)||0,
      description: addItemNewForm.description||"",
    });
    setAddItemSaving(false);
    if (r?.success && r.data) {
      setBoqItems(p => [r.data, ...p]);
      const sid = addItemDrawer.structure_id;
      setPendingNewItems(p => ({
        ...p,
        [sid]: [...(p[sid]||[]), {
          _isNew:true, item_id:r.data.id,
          category_id: addItemDrawer.category_id,
          base_rate: Number(r.data.base_rate)||0, add_on_rate:0, description:"",
        }]
      }));
      setAddItemNewForm(null);
    } else alert(r?.message||"Save failed");
  };

  // ── Computed ───────────────────────────────────────────────────────────
  const tradeGroupsWithItems = TRADE_CATS.filter(t => workItems.some(i => i.trade_category === t));
  const hasPendingEdits = Object.keys(sectionEdits).length>0 || Object.keys(itemEdits).length>0
    || Object.values(pendingNewItems).some(a=>a.length>0)
    || Object.values(pendingDelItems).some(o=>Object.keys(o).length>0);

  const chipBtn = (label, active, onClick, color) => (
    <button key={label} onClick={onClick} style={{
      padding:"7px 16px", borderRadius:20, border:`1.5px solid ${active?(color||T.blue):T.border}`,
      background:active?(color||T.blue):"white", color:active?"white":T.textMid,
      fontSize:13, fontWeight:600, cursor:"pointer", transition:"all .15s",
    }}>{label}</button>
  );

  return (
    <div>
      {/* ── Mode Toggle ─────────────────────────────────────────────────── */}
      <div style={{display:"flex",gap:8,marginBottom:18,alignItems:"center"}}>
        {[
          {id:"package",   icon:"📐", label:t("master_library.floor_package_rates"),  desc:t("master_library.sqft_based_package_for_full_floor")},
          {id:"item_wise", icon:"🔧", label:t("master_library.work_item_rates"),       desc:t("master_library.unit_based_items_for_specialist_work")},
        ].map(m => (
          <button key={m.id} onClick={()=>setMode(m.id)} style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"10px 20px", borderRadius:9,
            border:`2px solid ${mode===m.id?T.blue:T.border}`,
            background:mode===m.id?T.blue:"white",
            color:mode===m.id?"white":T.textMid,
            fontSize:13, fontWeight:700, cursor:"pointer", transition:"all .15s",
          }}>
            <span>{m.icon}</span> {m.label}
          </button>
        ))}
        <span style={{marginLeft:8,fontSize:11.5,color:T.textLight,alignSelf:"center"}}>
          {mode==="package"
            ? t("master_library.entire_floor_given_to_one_subcon")
            : t("master_library.specific_items_given_to_subcon_item")}
        </span>
      </div>

      {/* ── Step 1: Construction Type ──────────────────────────────────── */}
      <div style={{background:"white",borderRadius:10,border:`1px solid ${T.border}`,padding:"14px 18px",marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>
         {t("master_library.1_construction_type")}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {conTypes.map(ct => chipBtn(ct.name, selType?.id===ct.id, ()=>{setSelType(ct);setSelPkg(null);setSelTrade(null);}, T.blue))}
          {!conTypes.length && <span style={{color:T.textLight,fontSize:12}}>{t("master_library.no_types_yet_add_from_client")}</span>}
        </div>
      </div>

      {selType && (
        <div style={{background:"white",borderRadius:10,border:`1px solid ${T.border}`,padding:"14px 18px",marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>
           {t("master_library.2_city")}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {cities.map(c => chipBtn(c.name, selCity?.id===c.id, ()=>setSelCity(c), T.teal))}
          </div>
        </div>
      )}

      {/* ════════════ FLOOR PACKAGE MODE ════════════ */}
      {mode==="package" && selType && selCity && (<>

        {/* Step 3: Trade Category */}
        <div style={{background:"white",borderRadius:10,border:`1px solid ${T.border}`,padding:"14px 18px",marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>
           {t("master_library.3_trade_category")}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {TRADE_CATS.map(t => chipBtn(t, selTrade===t, ()=>setSelTrade(t), T.purple))}
          </div>
        </div>

        {/* Step 4: Rate Card */}
        {selTrade && (
          <div style={{background:"white",borderRadius:10,border:`1px solid ${T.border}`,padding:"14px 18px",marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>
             {t("master_library.4_rate_card")}
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"stretch"}}>
              {packages.map(p => (
                <div key={p.id} onClick={()=>setSelPkg(p)} style={{
                  padding:"12px 16px", borderRadius:10, cursor:"pointer", minWidth:150, position:"relative",
                  border:`2px solid ${selPkg?.id===p.id?T.blue:T.border}`,
                  background:selPkg?.id===p.id?T.blueSoft:"white",
                  boxShadow:selPkg?.id===p.id?`0 0 0 2px ${T.blue}33`:"none",
                }}>
                  <div style={{fontSize:13,fontWeight:700,color:selPkg?.id===p.id?T.blue:T.text,paddingRight:20}}>{p.name}</div>
                  {p.sqft_rate>0 && <div style={{fontSize:11,color:T.textLight,marginTop:3}}>₹{Number(p.sqft_rate).toLocaleString()}/sqft</div>}
                  {p.description && <div style={{fontSize:10.5,color:T.textLight,marginTop:2}}>{p.description}</div>}
                  <button onClick={e=>{e.stopPropagation();setEditingPkg(p);setPkgForm({name:p.name,sqft_rate:String(p.sqft_rate||""),description:p.description||""});setAddPkgModal(true);}}
                    style={{position:"absolute",top:7,right:7,background:"none",border:"none",cursor:"pointer",padding:3,borderRadius:5,opacity:0.5,display:"flex"}}>
                    <IcEdit size={12} color={T.textMid}/>
                  </button>
                </div>
              ))}
              <div onClick={()=>{setEditingPkg(null);setPkgForm({name:"",sqft_rate:"",description:""});setAddPkgModal(true);}}
                style={{padding:"12px 16px",borderRadius:10,border:`2px dashed ${T.border}`,background:T.bg,cursor:"pointer",minWidth:130,display:"flex",alignItems:"center",justifyContent:"center",gap:6,color:T.textLight,fontSize:13,fontWeight:600}}>
                <IcPlus size={14} color={T.textLight}/> {t("master_library.new_rate_card")}
              </div>
            </div>
          </div>
        )}

        {/* Package tree */}
        {selPkg && (<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <span style={{fontSize:13,fontWeight:700,color:T.text}}>
                {selType.name} — {selCity.name} — <span style={{color:T.purple}}>{selTrade}</span> — <span style={{color:T.blue}}>{selPkg.name}</span>
              </span>
              <div style={{fontSize:11,color:T.textLight,marginTop:2}}>
               {t("master_library.click_edit_on_a_section_to")}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              {hasPendingEdits && (
                <button onClick={()=>{setSectionEdits({});setItemEdits({});setPendingDelItems({});setEditingSections({});}}
                  style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${T.border}`,background:"white",fontSize:12,fontWeight:600,color:T.textMid,cursor:"pointer"}}>
                 {t("master_library.discard")}
                </button>
              )}
              <button onClick={saveRates} disabled={!hasPendingEdits||saving}
                style={{padding:"8px 18px",borderRadius:8,background:hasPendingEdits&&!saving?T.blue:T.borderLight,color:hasPendingEdits&&!saving?"white":T.textLight,border:"none",fontSize:13,fontWeight:700,cursor:hasPendingEdits&&!saving?"pointer":"not-allowed"}}>
                {saving?t("common.saving_2"):t("master_library.save_rates")}
              </button>
              <button onClick={()=>{setAddSecForm({name:"",default_qty:0,unit:"sqft",per_item_qty:false});setAddSecModal(true);}}
                style={{padding:"8px 16px",borderRadius:8,background:"white",border:`1.5px solid ${T.blue}`,color:T.blue,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                <IcPlus size={14} color={T.blue}/> {t("common.add_section_2")}
              </button>
            </div>
          </div>

          {saveError && (
            <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10,fontSize:12.5,color:"#DC2626"}}>
              <span style={{fontWeight:700}}>{t("master_library.save_error")}</span> {saveError}
              <button onClick={()=>setSaveError("")} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#DC2626",fontSize:16,lineHeight:1}}>×</button>
            </div>
          )}

          {pkgStructures.length===0 && (
            <div style={{textAlign:"center",padding:"48px 20px",background:"white",borderRadius:12,border:`1.5px dashed ${T.border}`,color:T.textLight,fontSize:14}}>
             {t("master_library.no_sections_yet_click_add_section")}
            </div>
          )}

          {pkgStructures.map(sec => {
            const secCats    = pkgCategories.filter(c => c.structure_id === sec.id);
            const editable   = !!editingSections[sec.id];
            const isCollapsed= !!collapsedSecs[sec.id];
            const sCalc      = calcSection(sec);
            const area       = sCalc.area;
            const perItem    = sCalc.perItem;
            const noAreaHint = !perItem && area === 0;

            return (
              <div key={sec.id} style={{background:"white",borderRadius:12,marginBottom:14,overflow:"hidden",
                border:`1.5px solid ${editable?"#93C5FD":T.border}`,
                boxShadow:editable?`0 0 0 3px #BFDBFE`:T.shadow}}>

                {/* Section header */}
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"#0F172A",cursor:"pointer"}}
                  onClick={()=>setCollapsedSecs(p=>({...p,[sec.id]:!p[sec.id]}))}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2.5}
                    style={{transform:isCollapsed?"rotate(0deg)":"rotate(90deg)",transition:"transform .18s",flexShrink:0}}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>

                  {editable ? (
                    <input value={getSecName(sec)} onClick={e=>e.stopPropagation()}
                      onChange={e=>patchSection(sec.id,{name:e.target.value})}
                      style={{flex:1,padding:"4px 9px",borderRadius:5,border:"1px solid rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.1)",color:"white",fontSize:13.5,fontWeight:700,outline:"none",fontFamily:"inherit"}}/>
                  ) : (
                    <span style={{flex:1,fontSize:14,fontWeight:700,color:"white"}}>{sec.name}</span>
                  )}

                  <span style={{fontSize:10.5,color:"rgba(255,255,255,0.4)"}}>
                    {secCats.length} cat
                  </span>

                  {/* Uniform Area / Per-item Qty toggle */}
                  {!perItem && (
                    <div style={{display:"flex",alignItems:"center",gap:5}} onClick={e=>e.stopPropagation()}>
                      {noAreaHint && !editable && (
                        <span style={{fontSize:10,color:"rgba(245,158,11,0.85)",background:"rgba(245,158,11,0.15)",padding:"2px 7px",borderRadius:4,fontWeight:600}}>
                         {t("master_library.set_area_to_see_totals")}
                        </span>
                      )}
                      {editable && (<>
                        <span style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>AREA</span>
                        <input type="number" value={area||""} onChange={e=>patchSection(sec.id,{default_qty:e.target.value})}
                          placeholder="0" onClick={e=>e.stopPropagation()}
                          style={{width:68,padding:"3px 7px",borderRadius:5,border:"1px solid rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.1)",color:"white",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                        <span style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>sqft</span>
                      </>)}
                      {!editable && area>0 && <span style={{fontSize:10.5,color:"rgba(255,255,255,0.4)"}}>{area.toLocaleString()} sqft</span>}
                    </div>
                  )}

                  {/* Mode toggle button */}
                  {editable && (
                    <button onClick={e=>{e.stopPropagation();patchSection(sec.id,{per_item_qty:!perItem});}}
                      title={perItem?t("master_library.switch_to_uniform_area_mode"):t("master_library.switch_to_per_item_qty_mode")}
                      style={{background:perItem?"rgba(245,158,11,0.22)":"rgba(255,255,255,0.10)",
                               border:"1px solid "+(perItem?"#F59E0B":"rgba(255,255,255,0.2)"),
                               color:perItem?"#FCD34D":"rgba(255,255,255,0.85)",
                               borderRadius:6,padding:"3px 10px",fontSize:10.5,fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
                      {perItem?t("common.per_item_qty"):t("master_library.uniform_area")}
                    </button>
                  )}
                  {!editable && perItem && (
                    <span style={{fontSize:10,color:"#FCD34D",background:"rgba(245,158,11,0.2)",padding:"2px 7px",borderRadius:4,fontWeight:700}}>{t("common.per_item_qty")}</span>
                  )}

                  {/* Section total */}
                  {sCalc.total > 0 && (
                    <span style={{fontSize:12,fontWeight:700,color:"#4ADE80"}}>{t("master_library.total_math", { Math: Math.round(sCalc.total).toLocaleString("en-IN") })}</span>
                  )}
                  {sCalc.perSqft > 0 && !perItem && (
                    <span style={{fontSize:10.5,color:"rgba(255,255,255,0.45)"}}>₹{Math.round(sCalc.perSqft).toLocaleString()}/sqft</span>
                  )}

                  <button onClick={e=>{e.stopPropagation();setEditingSections(p=>({...p,[sec.id]:!editable}));}}
                    style={{padding:"4px 12px",borderRadius:6,background:editable?"#1E40AF":"rgba(255,255,255,0.12)",border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                    {editable?t("master_library.done"):t("common.edit")}
                  </button>
                </div>

                {/* Section body */}
                {!isCollapsed && (
                  <div style={{padding:"12px 16px"}}>
                    {secCats.length===0 && !editable && (
                      <div style={{textAlign:"center",padding:"20px",color:T.textLight,fontSize:12}}>
                       {t("master_library.no_categories_yet_click_edit_then")}
                      </div>
                    )}

                    {secCats.map(cat => {
                      const catRows  = subconCatRows(sec.id, cat);
                      const catKey   = `${sec.id}:${cat.id||cat.category_name}`;
                      const isCatCol = !!collapsedCats[catKey];
                      const cCalc    = calcCategory(sec.id, cat, area, perItem);
                      if (!catRows.length && !editable) return null;
                      return (
                        <div key={catKey} style={{marginBottom:8}}>
                          <div onClick={()=>setCollapsedCats(p=>({...p,[catKey]:!p[catKey]}))}
                            style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:"#F8FAFC",borderRadius:7,cursor:"pointer",border:`1px solid ${T.borderLight}`,marginBottom:isCatCol?0:6}}>
                            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke={T.textLight} strokeWidth={2.5}
                              style={{transform:isCatCol?"rotate(0deg)":"rotate(90deg)",transition:"transform .15s",flexShrink:0}}>
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                            <span style={{fontSize:12,fontWeight:700,color:T.text,flex:1}}>{cat.category_name}</span>
                            <span style={{fontSize:10.5,color:T.textLight}}>· {catRows.length} items</span>
                            <span style={{fontSize:11,fontWeight:700,color:T.teal}}>{t("master_library.base_math", { Math: Math.round(cCalc.base).toLocaleString("en-IN") })}</span>
                            {cCalc.addOn>0 && <span style={{fontSize:11,fontWeight:600,color:T.amber,marginLeft:4}}>+₹{Math.round(cCalc.addOn).toLocaleString("en-IN")}</span>}
                            {cCalc.total>0 && <span style={{fontSize:11,fontWeight:700,color:T.green,marginLeft:4}}>= ₹{Math.round(cCalc.total).toLocaleString("en-IN")}</span>}
                            {editable && (
                              <button onClick={e=>{e.stopPropagation();openAddItemDrawer(sec,cat);}}
                                style={{marginLeft:8,padding:"2px 10px",borderRadius:5,background:T.blueSoft,border:`1px solid ${T.blue}44`,color:T.blue,fontSize:10.5,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                               {t("common.add_item")}
                              </button>
                            )}
                          </div>

                          {!isCatCol && catRows.length>0 && (
                            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,marginBottom:4}}>
                              <thead>
                                <tr>
                                  {["ITEM","UNIT","BASE RATE","ADD-ON",perItem?"QTY":"AREA","TOTAL",...(editable?[""]:[])].map(h=>(
                                    <th key={h} style={{padding:"5px 10px",textAlign:["QTY","AREA","TOTAL"].includes(h)?"right":"left",fontSize:9.5,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:"0.4px",background:"#F1F5F9",borderBottom:`1px solid ${T.border}`}}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {catRows.map(it => {
                                  const rCalc = calcRow(sec.id, it, area, perItem);
                                  return (
                                  <tr key={it._pending?`new-${it.item_id}`:it.item_id}
                                    style={{borderBottom:`1px solid ${T.borderLight}`,background:it._pending?"#EFF6FF":"transparent"}}>
                                    <td style={{padding:"7px 10px",fontWeight:600,color:T.text}}>
                                      {it.item_name||it.name}
                                      {it._pending && <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:T.blue,color:"white",marginLeft:6}}>NEW</span>}
                                    </td>
                                    <td style={{padding:"7px 10px",color:T.textLight}}>{it.unit}</td>
                                    <td style={{padding:"7px 10px"}}>
                                      {editable
                                        ? <input type="number" value={getRowBase(sec.id,it)} onChange={e=>patchRow(sec.id,it.item_id,{base_rate:e.target.value})}
                                            style={{width:82,padding:"3px 7px",borderRadius:5,border:`1px solid ${T.border}`,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                                        : <span style={{fontWeight:700,color:T.teal}}>₹{Number(getRowBase(sec.id,it)).toLocaleString()}</span>}
                                    </td>
                                    <td style={{padding:"7px 10px"}}>
                                      {editable
                                        ? <input type="number" value={getRowAddOn(sec.id,it)} onChange={e=>patchRow(sec.id,it.item_id,{add_on_rate:e.target.value})}
                                            style={{width:82,padding:"3px 7px",borderRadius:5,border:`1px solid ${T.border}`,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                                        : <span style={{color:T.amber,fontWeight:600}}>{Number(getRowAddOn(sec.id,it))>0?`₹${Number(getRowAddOn(sec.id,it)).toLocaleString()}`:"—"}</span>}
                                    </td>
                                    {/* QTY / AREA column */}
                                    <td style={{padding:"7px 10px",textAlign:"right"}}>
                                      {perItem && editable
                                        ? <input type="number" value={getRowQty(sec.id,it)} onChange={e=>patchRow(sec.id,it.item_id,{qty:e.target.value})}
                                            style={{width:68,padding:"3px 7px",borderRadius:5,border:`1px solid ${T.border}`,fontSize:12,outline:"none",fontFamily:"inherit",textAlign:"right"}}/>
                                        : <span style={{color:T.textMid,fontWeight:500}}>{perItem?Number(getRowQty(sec.id,it)).toLocaleString():area.toLocaleString()}</span>
                                      }
                                    </td>
                                    {/* TOTAL column */}
                                    <td style={{padding:"7px 10px",textAlign:"right"}}>
                                      <span style={{fontWeight:700,color:rCalc.total>0?T.green:T.textLight}}>
                                        {rCalc.total>0?`₹${Math.round(rCalc.total).toLocaleString("en-IN")}`:"—"}
                                      </span>
                                    </td>
                                    {editable && (
                                      <td style={{padding:"7px 10px"}}>
                                        <button onClick={()=>{
                                          if(it._pending) setPendingNewItems(p=>({...p,[sec.id]:(p[sec.id]||[]).filter(r=>r.item_id!==it.item_id)}));
                                          else setPendingDelItems(p=>({...p,[sec.id]:{...(p[sec.id]||{}),[it.item_id]:true}}));
                                        }}
                                          style={{background:"none",border:"none",cursor:"pointer",padding:2,display:"flex"}}>
                                          <IcTrash size={13} color={T.red}/>
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                          {!isCatCol && catRows.length===0 && editable && (
                            <div style={{textAlign:"center",padding:"10px",color:T.textLight,fontSize:11.5,background:"#F8FAFC",borderRadius:6,border:`1px dashed ${T.border}`}}>
                             {t("master_library.no_items_click_add_item_above")}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* + Add Category button — visible when section in edit mode */}
                    {editable && (
                      <button onClick={()=>openAddCatDrawer(sec)}
                        style={{marginTop:8,width:"100%",padding:"8px",borderRadius:7,background:"white",border:`1.5px dashed ${T.blue}`,color:T.blue,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        <IcPlus size={13} color={T.blue}/>{t("master_library.add_category_to_getsecname", { getSecName: getSecName(sec) })}</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        {/* Grand Total bar */}
        {pkgStructures.length > 0 && (() => {
          const grand = calcGrand();
          return grand.total > 0 ? (
            <div style={{background:"linear-gradient(135deg,#0F172A,#1E293B)",borderRadius:10,padding:"14px 20px",display:"flex",alignItems:"center",gap:20,marginTop:4}}>
              <span style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.8px"}}>{t("common.grand_total")}</span>
              <span style={{flex:1}}/>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{t("master_library.base_math", { Math: Math.round(grand.base).toLocaleString("en-IN") })}</span>
              {grand.addOn>0 && <span style={{fontSize:11,color:"rgba(245,158,11,0.8)"}}>{t("master_library.add_on_math", { Math: Math.round(grand.addOn).toLocaleString("en-IN") })}</span>}
              <span style={{fontSize:18,fontWeight:800,color:"#4ADE80"}}>₹{Math.round(grand.total).toLocaleString("en-IN")}</span>
            </div>
          ) : null;
        })()}
        </>)}
      </>)}

      {/* ── Add Section Modal ──────────────────────────────────────────────── */}
      {addSecModal && (
        <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>{if(!addSecSaving)setAddSecModal(false);}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(4px)"}}/>
          <div style={{position:"relative",width:440,maxWidth:"94vw",background:"white",borderRadius:14,boxShadow:T.shadowLg,overflow:"hidden",fontFamily:T.font}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:15,fontWeight:700,color:T.text}}>{t("common.add_section_2")}</div>
              <button onClick={()=>setAddSecModal(false)} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}><IcX size={18} color={T.textMid}/></button>
            </div>
            <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:T.textMid,display:"block",marginBottom:6}}>{t("master_library.section_name")} <span style={{color:T.red}}>*</span></label>
                <input value={addSecForm.name} onChange={e=>setAddSecForm(p=>({...p,name:e.target.value}))} placeholder={t("master_library.e_g_ground_floor_first_floor")}
                  style={{width:"100%",padding:"10px 13px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13.5,color:T.text,outline:"none",boxSizing:"border-box",fontFamily:T.font}}
                  onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor=T.border} autoFocus/>
              </div>
              <div style={{display:"flex",gap:12}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:12,fontWeight:600,color:T.textMid,display:"block",marginBottom:6}}>{t("master_library.default_area_qty")}</label>
                  <input type="number" value={addSecForm.default_qty||""} onChange={e=>setAddSecForm(p=>({...p,default_qty:e.target.value}))} placeholder="0"
                    style={{width:"100%",padding:"10px 13px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13.5,color:T.text,outline:"none",boxSizing:"border-box",fontFamily:T.font}}
                    onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor=T.border}/>
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:12,fontWeight:600,color:T.textMid,display:"block",marginBottom:6}}>{t("common.unit")}</label>
                  <select value={addSecForm.unit} onChange={e=>setAddSecForm(p=>({...p,unit:e.target.value}))}
                    style={{width:"100%",padding:"10px 13px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13.5,color:T.text,outline:"none",background:"white",fontFamily:T.font}}>
                    {(uomOpts.length?uomOpts:["Sqft","Cft","Running Ft","Kg","Point","Unit","Lump Sum"]).map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              {/* Per-item qty toggle */}
              <div style={{padding:"10px 12px",background:addSecForm.per_item_qty?"#FFFBEB":"#F9FAFB",border:`1.5px solid ${addSecForm.per_item_qty?"#FCD34D":"#E5E7EB"}`,borderRadius:8,cursor:"pointer",transition:"all .15s"}}
                onClick={()=>setAddSecForm(p=>({...p,per_item_qty:!p.per_item_qty}))}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <input type="checkbox" checked={!!addSecForm.per_item_qty} onChange={()=>{}} style={{width:16,height:16,cursor:"pointer",accentColor:T.amber}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>{t("master_library.per_item_quantity_addsecform", { addSecForm: addSecForm.per_item_qty?"(enabled)":"(disabled — uniform area)" })}</div>
                    <div style={{fontSize:11.5,color:T.textMid,marginTop:2}}>
                      {addSecForm.per_item_qty
                        ? t("master_library.each_item_will_have_its_own")
                        : t("master_library.all_items_share_the_section_s")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{padding:"14px 22px",borderTop:`1px solid ${T.border}`,display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setAddSecModal(false)} style={{padding:"9px 18px",borderRadius:8,border:`1px solid ${T.border}`,background:"white",fontSize:13,fontWeight:600,color:T.textMid,cursor:"pointer"}}>{t("common.cancel")}</button>
              <button disabled={!addSecForm.name?.trim()||addSecSaving} onClick={async()=>{
                if(!addSecForm.name?.trim()||!selPkg) return;
                setAddSecSaving(true);
                const r=await api.post(`/library/packages/${selPkg.id}/structures`,{
                  name:addSecForm.name.trim(),default_qty:Number(addSecForm.default_qty)||0,
                  unit:addSecForm.unit||"sqft",rate:0,per_item_qty:!!addSecForm.per_item_qty,
                  sort_order:pkgStructures.length,
                }).catch(()=>({success:false}));
                setAddSecSaving(false);
                if(r?.success){
                  setPkgStructures(p=>[...p,r.data]);
                  setEditingSections(p=>({...p,[r.data.id]:true}));
                  setAddSecModal(false);
                } else alert(r?.message||"Failed to add section");
              }}
                style={{padding:"9px 22px",borderRadius:8,background:!addSecForm.name?.trim()||addSecSaving?T.borderLight:`linear-gradient(135deg,${T.blue},${T.blueMid})`,color:!addSecForm.name?.trim()||addSecSaving?T.textLight:"white",border:"none",fontSize:13,fontWeight:700,cursor:!addSecForm.name?.trim()||addSecSaving?"not-allowed":"pointer"}}>
                {addSecSaving?t("common.adding"):t("common.add_section_2")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ WORK ITEM MODE ════════════ */}
      {mode==="item_wise" && selType && selCity && (
        <div>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:11,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:".5px",alignSelf:"center"}}>{t("master_library.category")}</span>
            {["All",...TRADE_CATS].map(t=>(
              <button key={t} onClick={()=>setTradeFilter(t)}
                style={{padding:"5px 14px",borderRadius:20,border:`1.5px solid ${tradeFilter===t?T.blue:T.border}`,background:tradeFilter===t?T.blue:"white",color:tradeFilter===t?"white":T.textMid,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {t}
              </button>
            ))}
            <button onClick={openAddItem}
              style={{marginLeft:"auto",padding:"8px 18px",borderRadius:8,background:`linear-gradient(135deg,${T.blue},${T.blueMid})`,color:"white",border:"none",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:`0 3px 10px ${T.blue}33`}}>
              <IcPlus size={14} color="white"/> {t("finance.add_work_item")}
            </button>
          </div>

          {itemsLoading && <div style={{textAlign:"center",padding:"40px",color:T.textLight}}>{t("common.loading_2")}</div>}

          {!itemsLoading && workItems.length===0 && (
            <div style={{textAlign:"center",padding:"48px 20px",background:"white",borderRadius:12,border:`1.5px dashed ${T.border}`,color:T.textLight}}>
              <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{t("master_library.no_items_yet_for_name_name2", { name: selType.name, name2: selCity.name })}</div>
              <div style={{fontSize:12}}>{t("master_library.click_add_work_item_to_build")}</div>
            </div>
          )}

          {!itemsLoading && (tradeFilter==="All" ? tradeGroupsWithItems : [tradeFilter]).map(trade => {
            const items = workItems.filter(i=>i.trade_category===trade);
            if(!items.length) return null;
            return (
              <div key={trade} style={{background:"white",borderRadius:12,border:`1px solid ${T.border}`,marginBottom:14,overflow:"hidden",boxShadow:T.shadow}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:"#F8FAFC",borderBottom:`1px solid ${T.border}`}}>
                  <span style={{fontSize:13,fontWeight:700,color:T.text}}>{trade}</span>
                  <span style={{fontSize:11,color:T.textLight,background:T.borderLight,padding:"2px 10px",borderRadius:20,fontWeight:600}}>{items.length} items</span>
                </div>
                <DataTable
                  columns={[
                    {key:"name",    label:t("master_library.work_item"),                  minW:200, render:r=><span style={{fontWeight:600}}>{r.name}</span>},
                    {key:"unit",    label:t("common.unit"),                       minW:80},
                    {key:"rate",    label:t("master_library.rate_name", { name: selCity.name }),     minW:140, align:"right",
                     render:r=><span style={{fontWeight:700,color:T.blue}}>₹{Number(r.rate||0).toLocaleString("en-IN")}/{r.unit}</span>},
                    {key:"description", label:t("master_library.description_scope"),   minW:200,
                     render:r=><span style={{fontSize:12,color:T.textLight}}>{r.description||"—"}</span>},
                  ]}
                  data={items}
                  onEdit={openEditItem}
                  onDelete={item=>deleteItem(item.id)}
                  emptyMsg=""
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Prompt to select type/city */}
      {(!selType || !selCity) && (
        <div style={{textAlign:"center",padding:"40px 20px",background:"white",borderRadius:12,border:`1.5px dashed ${T.border}`,marginTop:8,color:T.textLight}}>
          {!selType ? t("master_library.select_a_construction_type_to_start") : t("master_library.select_a_city_to_view_rates")}
        </div>
      )}

      {/* ── Add/Edit Rate Card (Package) Modal ────────────────────────── */}
      <Modal open={addPkgModal} onClose={()=>{setAddPkgModal(false);setEditingPkg(null);}}
        title={editingPkg?t("master_library.edit_rate_card"):t("master_library.new_rate_card")}
        desc={`${selTrade||""}${selType?" — "+selType.name:""}`} width={480}>
        <FormField label={t("master_library.rate_card_name")} value={pkgForm.name} onChange={v=>setPkgForm(p=>({...p,name:v}))}
          placeholder={t("master_library.e_g_civil_full_civil_basic")} required/>
        <div style={{display:"flex",gap:14,margin:"14px 0"}}>
          <FormField label={t("master_library.indicative_rate_sqft")} value={pkgForm.sqft_rate} onChange={v=>setPkgForm(p=>({...p,sqft_rate:v}))} type="number" half placeholder="e.g. 800"/>
          <FormField label={t("common.description")} value={pkgForm.description} onChange={v=>setPkgForm(p=>({...p,description:v}))} half placeholder={t("common.optional")}/>
        </div>
        <ModalFooter onClose={()=>{setAddPkgModal(false);setEditingPkg(null);}} onSave={savePkg}
          saveLabel={pkgSaving?"Saving…":editingPkg?"Update Rate Card":"Create Rate Card"}/>
      </Modal>

      {/* ── Add/Edit Work Item Modal ────────────────────────────────────── */}
      <Modal open={showItemModal} onClose={()=>setShowItemModal(false)}
        title={editingItem?t("master_library.edit_work_item"):t("finance.add_work_item")}
        desc={`${selType?.name||""}${selCity?" × "+selCity.name:""}`} width={500}>
        <FormField label={t("master_library.item_name")} value={itemForm.name} onChange={v=>setItemForm(p=>({...p,name:v}))}
          placeholder={t("master_library.e_g_brick_masonry_rcc_slab")} required/>
        <div style={{display:"flex",gap:14,margin:"14px 0"}}>
          <FormSelect label={t("master_library.trade_category")} value={itemForm.trade_category} onChange={v=>setItemForm(p=>({...p,trade_category:v}))} options={TRADE_CATS} half/>
          <FormSelect label={t("common.unit")} value={itemForm.unit} onChange={v=>setItemForm(p=>({...p,unit:v}))} options={uomOpts} half/>
        </div>
        <div style={{display:"flex",gap:14,marginBottom:14}}>
          <FormField label={`Rate in ${selCity?.name||"City"} (₹/${itemForm.unit||"unit"}) *`}
            value={itemForm.rate} onChange={v=>setItemForm(p=>({...p,rate:v}))} type="number" half placeholder="e.g. 45" required/>
          <FormField label={t("master_library.description_scope")} value={itemForm.description} onChange={v=>setItemForm(p=>({...p,description:v}))} half placeholder={t("master_library.optional_notes")}/>
        </div>
        <ModalFooter onClose={()=>setShowItemModal(false)} onSave={saveItem}
          saveLabel={itemSaving?"Saving…":editingItem?"Update Item":"Add Item"}/>
      </Modal>

      {/* ── Add Category Drawer ─────────────────────────────────────────── */}
      {addCatDrawer && (() => {
        const sid = addCatDrawer.structure_id;
        const alreadyAdded = new Set(pkgCategories.filter(c=>c.structure_id===sid).map(c=>c.category_name));
        const available = workCats.filter(c => !alreadyAdded.has(c.name));
        return (<>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9000,backdropFilter:"blur(2px)"}}/>
          <div style={{position:"fixed",right:0,top:0,height:"100vh",width:480,maxWidth:"95vw",background:T.card,zIndex:9001,boxShadow:"-8px 0 40px rgba(0,0,0,0.25)",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0F172A"}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"white"}}>{t("common.add_category_2")}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>{t("master_library.section_section_name", { section_name: addCatDrawer.section_name })}</div>
              </div>
              <button onClick={closeAddCatDrawer} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:20,cursor:"pointer"}}>×</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
              {/* Pick from existing Work Categories */}
              <div style={{fontSize:10,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>
               {t("master_library.pick_from_work_categories")}
              </div>
              {available.length===0 && (
                <div style={{padding:"12px",color:T.textLight,fontSize:12,background:T.bg,borderRadius:7,marginBottom:14}}>
                 {t("master_library.all_work_categories_already_added_to")}
                </div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:16}}>
                {available.map((cat,i) => {
                  const picked = addCatPicks.includes(cat.id);
                  return (
                    <div key={cat.id} onClick={()=>toggleCatPick(cat.id)}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:7,cursor:"pointer",border:`1.5px solid ${picked?T.blue:T.border}`,background:picked?T.blueSoft:"white"}}>
                      <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${picked?T.blue:T.border}`,background:picked?T.blue:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {picked && <span style={{color:"white",fontSize:10,lineHeight:1,fontWeight:700}}>✓</span>}
                      </div>
                      {picked && <span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:10,background:T.blue,color:"white",minWidth:18,textAlign:"center"}}>{addCatPicks.indexOf(cat.id)+1}</span>}
                      <span style={{fontSize:13,fontWeight:picked?700:400,color:picked?T.blue:T.text,flex:1}}>{cat.name}</span>
                      {cat.description && <span style={{fontSize:11,color:T.textLight}}>{cat.description}</span>}
                    </div>
                  );
                })}
              </div>

              {/* Create new category */}
              <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}>
                <div style={{fontSize:10,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>
                 {t("master_library.or_create_new_category")}
                </div>
                {addCatNewForm===null ? (
                  <button onClick={()=>setAddCatNewForm({name:"",code:"",desc:""})}
                    style={{padding:"8px 16px",borderRadius:7,border:`1.5px dashed ${T.border}`,background:"white",color:T.textMid,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                    <IcPlus size={13} color={T.textMid}/> {t("master_library.new_category")}
                  </button>
                ) : (
                  <div style={{background:T.bg,borderRadius:8,padding:12,border:`1px solid ${T.border}`}}>
                    <FormField label={t("master_library.category_name_2")} value={addCatNewForm.name} onChange={v=>setAddCatNewForm(p=>({...p,name:v}))} placeholder={t("master_library.e_g_civil_structure")} required/>
                    <div style={{display:"flex",gap:10,marginTop:10}}>
                      <FormField label={t("common.code")} value={addCatNewForm.code} onChange={v=>setAddCatNewForm(p=>({...p,code:v}))} placeholder={t("master_library.e_g_civ")} half/>
                      <FormField label={t("common.description")} value={addCatNewForm.desc} onChange={v=>setAddCatNewForm(p=>({...p,desc:v}))} half placeholder={t("common.optional")}/>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:12}}>
                      <button onClick={()=>setAddCatNewForm(null)} style={{flex:1,padding:"8px",borderRadius:6,border:`1px solid ${T.border}`,background:"white",fontSize:12,cursor:"pointer"}}>{t("common.cancel")}</button>
                      <button onClick={createAndAddCat} disabled={addCatSaving||!addCatNewForm.name.trim()}
                        style={{flex:2,padding:"8px",borderRadius:6,background:T.blue,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                        {addCatSaving?t("common.creating"):t("master_library.create_add")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{padding:"14px 20px",borderTop:`1px solid ${T.border}`,display:"flex",gap:10,background:T.bg}}>
              <button onClick={closeAddCatDrawer} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${T.border}`,background:"white",fontSize:13,cursor:"pointer"}}>{t("common.cancel")}</button>
              <button onClick={confirmAddCats} disabled={addCatSaving||addCatPicks.length===0}
                style={{flex:2,padding:"10px",borderRadius:8,background:addCatPicks.length>0?T.blue:T.borderLight,color:addCatPicks.length>0?"white":T.textLight,border:"none",fontSize:13,fontWeight:700,cursor:addCatPicks.length>0?"pointer":"not-allowed"}}>
                {addCatSaving?t("common.adding"):`Add ${addCatPicks.length} Categor${addCatPicks.length===1?"y":"ies"}`}
              </button>
            </div>
          </div>
        </>);
      })()}

      {/* ── Add Item Drawer ─────────────────────────────────────────────── */}
      {addItemDrawer && (() => {
        const sid = addItemDrawer.structure_id;
        const existingIds = new Set([
          ...(sectionItems[sid]||[]).map(r=>r.item_id),
          ...(pendingNewItems[sid]||[]).map(r=>r.item_id),
        ]);
        const filtered = boqItems.filter(i =>
          !existingIds.has(i.id) &&
          (!addItemSearch || i.name.toLowerCase().includes(addItemSearch.toLowerCase()) || (i.category||"").toLowerCase().includes(addItemSearch.toLowerCase()))
        );
        return (<>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9000,backdropFilter:"blur(2px)"}}/>
          <div style={{position:"fixed",right:0,top:0,height:"100vh",width:520,maxWidth:"95vw",background:T.card,zIndex:9001,boxShadow:"-8px 0 40px rgba(0,0,0,0.25)",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,background:"#0F172A"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"white"}}>{t("common.add_item_2")}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>{addItemDrawer.section_name} › {addItemDrawer.category_name}</div>
                </div>
                <button onClick={closeAddItemDrawer} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:20,cursor:"pointer"}}>×</button>
              </div>
              <input value={addItemSearch} onChange={e=>setAddItemSearch(e.target.value)} autoFocus
                placeholder={t("master_library.search_boq_items")}
                style={{width:"100%",padding:"8px 12px",borderRadius:7,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.1)",color:"white",fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"10px 16px"}}>
              {addItemPicks.length>0 && (
                <div style={{marginBottom:10,padding:"6px 10px",background:T.blueSoft,borderRadius:6,fontSize:11.5,color:T.blue,fontWeight:600}}>{t("master_library.additempicks_itemadditempicks2_selected_click_save_to", { addItemPicks: addItemPicks.length, addItemPicks2: addItemPicks.length>1?"s":"" })}</div>
              )}
              {filtered.map(item => {
                const picked = addItemPicks.includes(item.id);
                return (
                  <div key={item.id} onClick={()=>toggleItemPick(item.id)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:7,cursor:"pointer",marginBottom:4,border:`1.5px solid ${picked?T.blue:T.borderLight}`,background:picked?T.blueSoft:"white"}}>
                    <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${picked?T.blue:T.border}`,background:picked?T.blue:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {picked && <span style={{color:"white",fontSize:10,lineHeight:1,fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12.5,fontWeight:picked?700:500,color:picked?T.blue:T.text}}>{item.name}</div>
                      <div style={{fontSize:10.5,color:T.textLight,marginTop:1}}>{item.category} · {item.unit}</div>
                    </div>
                    {item.base_rate>0 && <span style={{fontSize:11.5,fontWeight:700,color:T.blue,flexShrink:0}}>₹{Number(item.base_rate).toLocaleString()}</span>}
                  </div>
                );
              })}
              {filtered.length===0 && (
                <div style={{textAlign:"center",padding:"20px",color:T.textLight,fontSize:12}}>
                  {addItemSearch ? `No items matching "${addItemSearch}"` : t("master_library.all_items_already_added")}
                </div>
              )}

              {/* Create new BOQ item */}
              <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14,marginTop:14}}>
                <div style={{fontSize:10,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>{t("master_library.create_new_item")}</div>
                {addItemNewForm===null ? (
                  <button onClick={()=>setAddItemNewForm({name:"",unit:"Sqft",base_rate:"",category:addItemDrawer.category_name,description:""})}
                    style={{padding:"7px 14px",borderRadius:6,border:`1.5px dashed ${T.border}`,background:"white",color:T.textMid,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                    <IcPlus size={13} color={T.textMid}/> {t("master_library.new_item")}
                  </button>
                ) : (
                  <div style={{background:T.bg,borderRadius:8,padding:12,border:`1px solid ${T.border}`}}>
                    <FormField label={t("master_library.item_name")} value={addItemNewForm.name} onChange={v=>setAddItemNewForm(p=>({...p,name:v}))} placeholder={t("master_library.e_g_rcc_m20_grade_slab")} required/>
                    <div style={{display:"flex",gap:10,margin:"10px 0"}}>
                      <FormField label={t("common.unit")} value={addItemNewForm.unit} onChange={v=>setAddItemNewForm(p=>({...p,unit:v}))} half placeholder={t("master_library.sqft")}/>
                      <FormField label={t("master_library.base_rate_2")} value={addItemNewForm.base_rate} onChange={v=>setAddItemNewForm(p=>({...p,base_rate:v}))} type="number" half placeholder="0"/>
                    </div>
                    <FormField label={t("common.description")} value={addItemNewForm.description} onChange={v=>setAddItemNewForm(p=>({...p,description:v}))} placeholder={t("master_library.optional_scope_notes")}/>
                    <div style={{display:"flex",gap:8,marginTop:12}}>
                      <button onClick={()=>setAddItemNewForm(null)} style={{flex:1,padding:"8px",borderRadius:6,border:`1px solid ${T.border}`,background:"white",fontSize:12,cursor:"pointer"}}>{t("common.cancel")}</button>
                      <button onClick={createAndAddItem} disabled={addItemSaving||!addItemNewForm.name.trim()}
                        style={{flex:2,padding:"8px",borderRadius:6,background:T.blue,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                        {addItemSaving?t("common.creating"):t("master_library.create_add")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{padding:"14px 20px",borderTop:`1px solid ${T.border}`,display:"flex",gap:10,background:T.bg}}>
              <button onClick={closeAddItemDrawer} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${T.border}`,background:"white",fontSize:13,cursor:"pointer"}}>{t("common.cancel")}</button>
              <button onClick={confirmAddItems} disabled={addItemPicks.length===0}
                style={{flex:2,padding:"10px",borderRadius:8,background:addItemPicks.length>0?T.blue:T.borderLight,color:addItemPicks.length>0?"white":T.textLight,border:"none",fontSize:13,fontWeight:700,cursor:addItemPicks.length>0?"pointer":"not-allowed"}}>{t("master_library.add_additempicks_then_save_rates", { addItemPicks: addItemPicks.length>0?`${addItemPicks.length} Item${addItemPicks.length>1?"s":""}`:"" })}</button>
            </div>
          </div>
        </>);
      })()}
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
  // ═══════════════════════════════════════════════════════════════════
  // MASTER DATA
  // ═══════════════════════════════════════════════════════════════════
  const [conTypes, setConTypes] = useState([]);
  const [cities,   setCities]   = useState([]);
  const [packages, setPackages] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const { items: uomList }                          = useSection("uom");
  const { items: workCats, reload: reloadWorkCats } = useSection("work-categories");

  // ═══════════════════════════════════════════════════════════════════
  // SELECTIONS
  // ═══════════════════════════════════════════════════════════════════
  const [selType, setSelType] = useState(null);
  const [selCity, setSelCity] = useState(null);
  const [selPkg,  setSelPkg]  = useState(null);

  // ═══════════════════════════════════════════════════════════════════
  // TREE DATA — all sections rendered together
  //   pkgStructures = sections (id, name, default_qty, unit, …)
  //   pkgCategories = categories per (structure_id, category_name)
  //   sectionItems[sid] = items currently saved in that section
  // ═══════════════════════════════════════════════════════════════════
  const [pkgStructures, setPkgStructures] = useState([]);
  const [pkgCategories, setPkgCategories] = useState([]);
  const [sectionItems,  setSectionItems]  = useState({}); // { [sid]: [rows] }

  // ═══════════════════════════════════════════════════════════════════
  // PENDING EDITS — kept until "Save Rates"
  //   sectionEdits[sid]   = { name?, default_qty? }
  //   catEdits[cid]       = { qty? }   ← area, entered per category
  //   itemEdits[sid][iid] = { base_rate?, add_on_rate?, description? }
  //   pendingNewItems[sid]= rows picked from the +Add Item drawer
  //                         (each row has client-side _isNew flag)
  //   pendingDelItems[sid][iid] = true   (soft-deleted in UI)
  // ═══════════════════════════════════════════════════════════════════
  const [sectionEdits,    setSectionEdits]    = useState({});
  const [catEdits,        setCatEdits]        = useState({});
  const [itemEdits,       setItemEdits]       = useState({});
  const [pendingNewItems, setPendingNewItems] = useState({});
  const [pendingDelItems, setPendingDelItems] = useState({});

  // ═══════════════════════════════════════════════════════════════════
  // UI STATE
  // ═══════════════════════════════════════════════════════════════════
  const [collapsedSections, setCollapsedSections] = useState({}); // {sid:true}
  // editingSections — sections currently unlocked for editing.
  //   Sections start LOCKED (read-only displays) once data is loaded.
  //   Click the section's "Edit" button → that section unlocks.
  //   Save Rates → re-locks ALL sections. Prevents accidental rate changes
  //   that would otherwise flow into quotations. Newly-added sections start
  //   unlocked so the user can immediately set area + add items.
  const [editingSections,   setEditingSections]   = useState({}); // {sid:true}
  const [collapsedCats,     setCollapsedCats]     = useState({}); // {`${sid}:${cid}`:true}
  const [renameSecId,       setRenameSecId]       = useState(null);
  const [renameSecValue,    setRenameSecValue]    = useState("");
  const [renameCatId,       setRenameCatId]       = useState(null);
  const [renameCatValue,    setRenameCatValue]    = useState("");
  const [saving,            setSaving]            = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // DRAWERS / MODALS
  //   addSectionModal = open modal for new section
  //   addCatDrawer    = { structure_id }
  //   addItemDrawer   = { structure_id, category_id, category_name }
  // ═══════════════════════════════════════════════════════════════════
  const [addSectionModal, setAddSectionModal] = useState(null);
  const [addSectionForm,  setAddSectionForm]  = useState({ name: "", default_qty: 0, unit: "sqft", per_item_qty: false });
  const [addSectionSaving,setAddSectionSaving]= useState(false);
  const [addCatDrawer,    setAddCatDrawer]    = useState(null);
  // addCatPicks / addItemPicks: ORDERED arrays of ids reflecting the
  // user's tick order. First-ticked = first in the resulting section.
  // The drawer shows a numbered badge (1, 2, 3...) on each ticked row
  // so the user sees the final order while ticking.
  const [addCatPicks,     setAddCatPicks]     = useState([]); // [workCatId, ...]
  const [addCatNewForm,   setAddCatNewForm]   = useState(null); // null | {name,code,desc}
  const [addCatSaving,    setAddCatSaving]    = useState(false);
  const [addItemDrawer,   setAddItemDrawer]   = useState(null);
  const [addItemPicks,    setAddItemPicks]    = useState([]); // [boqItemId, ...]
  const [addItemSearch,   setAddItemSearch]   = useState("");
  const [addItemNewForm,  setAddItemNewForm]  = useState(null); // null | {name,unit,category,base_rate}
  const [addItemSaving,   setAddItemSaving]   = useState(false);
  // Toggle helpers — append to array if not picked, remove if already picked.
  const toggleCatPick  = (id) => setAddCatPicks(p => {
    const idx = p.indexOf(id); return idx >= 0 ? p.filter(x => x !== id) : [...p, id];
  });
  const toggleItemPick = (id) => setAddItemPicks(p => {
    const idx = p.indexOf(id); return idx >= 0 ? p.filter(x => x !== id) : [...p, id];
  });

  // ═══════════════════════════════════════════════════════════════════
  // EXISTING modals — kept from the previous component
  // ═══════════════════════════════════════════════════════════════════
  const [editItem,       setEditItem]       = useState(null);
  const [editItemForm,   setEditItemForm]   = useState({});
  const [editItemSaving, setEditItemSaving] = useState(false);

  // ── Package Edit Drawer state ─────────────────────────────────────
  // Opened from the pencil icon on the active Package tile.
  // Edits package basics + section name/area + section-scoped category
  // renames + master boq_items edits/deletes. Per-section rates
  // (add_on / description) stay in the BOQ tree.
  const [pkgDrawer,         setPkgDrawer]         = useState(null);     // pkg | null
  const [pkgDraft,          setPkgDraft]          = useState({});       // {name, sqft_rate, description}
  const [pkgSecEdits,       setPkgSecEdits]       = useState({});       // {[sid]: {name?, default_qty?}}
  const [pkgCatRenames,     setPkgCatRenames]     = useState({});       // {[rpc_id]: newName}
  const [pkgItemEdits,      setPkgItemEdits]      = useState({});       // {[boq_item_id]: {name?, unit?, base_rate?, description?}}
  const [pkgDeletedItems,   setPkgDeletedItems]   = useState({});       // {[boq_item_id]: true}
  const [pkgCollapsedSecs,  setPkgCollapsedSecs]  = useState({});       // {[sid]: true}
  const [pkgSaving,         setPkgSaving]         = useState(false);
  // Danger-zone state for the Delete Package flow — user must type the
  // exact package name to enable the Delete button (GitHub-style guard).
  const [pkgDeleteText,     setPkgDeleteText]     = useState("");
  const [pkgDeleting,       setPkgDeleting]       = useState(false);
  const [pkgDangerOpen,     setPkgDangerOpen]     = useState(false);

  // Danger-zone state for City / Construction-Type edit modals
  const [typeEdit,          setTypeEdit]          = useState(null);  // ct object | null
  const [typeForm,          setTypeForm]          = useState({});
  const [typeSaving,        setTypeSaving]        = useState(false);
  const [typeDangerOpen,    setTypeDangerOpen]    = useState(false);
  const [typeDeleteText,    setTypeDeleteText]    = useState("");
  const [cityEdit,          setCityEdit]          = useState(null);  // city object | null
  const [cityForm,          setCityForm]          = useState({});
  const [citySaving,        setCitySaving]        = useState(false);
  const [cityDangerOpen,    setCityDangerOpen]    = useState(false);
  const [cityDeleteText,    setCityDeleteText]    = useState("");
  const [addModal,       setAddModal]       = useState(null);    // "type"|"city"|"pkg"
  const [addForm,        setAddForm]        = useState({});
  const [adding,         setAdding]         = useState(false);

  const uomOptions = uomList.length > 0
    ? uomList.map(u => u.name)
    : ["Sq.Ft","CFT","Running Ft","Kg","Point","Unit","Lump Sum","Piece"];
  const catOptions = workCats.map(c => c.name);

  // ═══════════════════════════════════════════════════════════════════
  // LOADERS
  // ═══════════════════════════════════════════════════════════════════
  const loadTypes    = () => api.get("/library/construction-types").then(r => { if (r.success) setConTypes(r.data||[]); });
  const loadCities   = () => api.get("/library/cities").then(r => { if (r.success) setCities(r.data||[]); });
  const loadPackages = () => api.get("/library/rate-packages").then(r => { if (r.success) setPackages(r.data||[]); });
  const loadItems    = () => api.get("/library/boq-items").then(r => { if (r.success) setBoqItems(r.data||[]); });
  const loadStructures = async (pkgId) => {
    if (!pkgId) { setPkgStructures([]); return; }
    const r = await api.get("/library/packages/" + pkgId + "/structures").catch(() => ({ success: false }));
    if (r?.success) setPkgStructures(r.data || []);
  };
  const loadCategories = async (pkgId) => {
    if (!pkgId) { setPkgCategories([]); return; }
    const r = await api.get("/library/packages/" + pkgId + "/categories").catch(() => ({ success: false }));
    if (r?.success) setPkgCategories(r.data || []);
  };
  // Fan out N parallel /rate-matrix calls (one per section) to populate
  // every section's item list in a single round-trip burst.
  const loadAllSectionItems = async (pkgId, cityId, sections) => {
    if (!pkgId || !cityId || !sections?.length) { setSectionItems({}); return; }
    const results = await Promise.all(sections.map(s =>
      api.get(`/library/rate-matrix?package_id=${pkgId}&city_id=${cityId}&structure_id=${s.id}`)
        .then(r => [s.id, r?.success ? (r.data || []) : []])
        .catch(() => [s.id, []])
    ));
    const map = {};
    for (const [sid, rows] of results) map[sid] = rows;
    setSectionItems(map);
  };

  useEffect(() => { loadTypes(); loadCities(); loadPackages(); loadItems(); }, []);

  // When package changes — reset all pending edits + reload structures + categories.
  // editingSections also cleared so we land in locked-by-default state.
  useEffect(() => {
    if (!selPkg) {
      setPkgStructures([]); setPkgCategories([]); setSectionItems({});
      setSectionEdits({}); setCatEdits({}); setItemEdits({}); setPendingNewItems({}); setPendingDelItems({});
      setEditingSections({});
      return;
    }
    (async () => {
      await Promise.all([loadStructures(selPkg.id), loadCategories(selPkg.id)]);
    })();
    setSectionEdits({}); setCatEdits({}); setItemEdits({}); setPendingNewItems({}); setPendingDelItems({});
    setEditingSections({});
    // eslint-disable-next-line
  }, [selPkg]);

  // When city OR structures change — re-fan items for every section.
  useEffect(() => {
    if (!selPkg || !selCity || !pkgStructures.length) { setSectionItems({}); return; }
    loadAllSectionItems(selPkg.id, selCity.id, pkgStructures);
    // eslint-disable-next-line
  }, [selPkg?.id, selCity?.id, pkgStructures]);

  // ═══════════════════════════════════════════════════════════════════
  // EFFECTIVE VALUE LOOKUPS (with pending edits layered on top)
  // ═══════════════════════════════════════════════════════════════════
  const getSecArea = (sec) => {
    const ed = sectionEdits[sec.id];
    if (ed && ed.default_qty !== undefined) return Number(ed.default_qty) || 0;
    return Number(sec.default_qty) || 0;
  };
  const getSecName = (sec) => {
    const ed = sectionEdits[sec.id];
    if (ed && ed.name !== undefined) return ed.name;
    return sec.name;
  };
  // Effective per_item_qty flag — staged edit wins over the saved row.
  // When ON, each item has its own qty (from pcr.qty / itemEdits.qty);
  // when OFF, section.default_qty applies to all items uniformly.
  const getSecPerItem = (sec) => {
    const ed = sectionEdits[sec.id];
    if (ed && ed.per_item_qty !== undefined) return !!ed.per_item_qty;
    return !!Number(sec.per_item_qty);
  };
  const patchSection = (sid, patch) => setSectionEdits(p => ({
    ...p, [sid]: { ...(p[sid] || {}), ...patch }
  }));

  // Effective category area — the ONLY place an area is entered now
  // (mirrors the Estimate builder, where GF/FF/Roof each carry their own).
  //   staged edit > rate_package_categories.qty > section.default_qty
  // The section fallback keeps every existing package on the exact same
  // totals until a category is actually given its own number.
  const getCatArea = (sec, cat) => {
    const ed = catEdits[cat.id];
    // Blank field = clear the override, which is exactly what Save writes
    // (qty → NULL). Fall back to the section default right away so the
    // live totals match what the row will look like after saving.
    if (ed && ed.qty !== undefined) return ed.qty === "" ? getSecArea(sec) : (Number(ed.qty) || 0);
    if (cat.qty !== null && cat.qty !== undefined && cat.qty !== "") return Number(cat.qty) || 0;
    return getSecArea(sec);
  };
  const patchCategoryArea = (cid, patch) => setCatEdits(p => ({
    ...p, [cid]: { ...(p[cid] || {}), ...patch }
  }));

  // Item base/addon/desc — itemEdits[sid][iid] wins over the row's saved value.
  const getRowBase = (sid, row) => {
    const ed = itemEdits[sid]?.[row.item_id];
    if (ed && ed.base_rate !== undefined) return ed.base_rate;
    // Saved row stores `rate` = base + add_on (backward-compat for Estimate
    // module). Recover base = rate - add_on, then handle NaN.
    const stored = (row.base_rate !== undefined && row.base_rate !== null)
      ? Number(row.base_rate)
      : (Number(row.rate) || 0) - (Number(row.add_on_rate) || 0);
    return stored;
  };
  const getRowAddOn = (sid, row) => {
    const ed = itemEdits[sid]?.[row.item_id];
    if (ed && ed.add_on_rate !== undefined) return ed.add_on_rate;
    return Number(row.add_on_rate) || 0;
  };
  const getRowDesc = (sid, row) => {
    const ed = itemEdits[sid]?.[row.item_id];
    if (ed && ed.description !== undefined) return ed.description;
    return row.description || "";
  };
  // Effective per-item qty — used only when section.per_item_qty is ON.
  // Staged edit wins; otherwise the pcr row's `qty` column.
  const getRowQty = (sid, row) => {
    const ed = itemEdits[sid]?.[row.item_id];
    if (ed && ed.qty !== undefined) return ed.qty;
    return (row.qty === null || row.qty === undefined) ? 0 : Number(row.qty);
  };
  const patchRow = (sid, itemId, patch) => setItemEdits(p => ({
    ...p,
    [sid]: { ...(p[sid] || {}), [itemId]: { ...(p[sid]?.[itemId] || {}), ...patch } }
  }));

  // Resolve rows visible under (section, category) — saved + pending-new − pending-del.
  const rowsOfCategory = (sid, catId) => {
    const saved  = sectionItems[sid] || [];
    const news   = pendingNewItems[sid] || [];
    const delMap = pendingDelItems[sid] || {};
    return [...saved, ...news]
      .filter(r => Number(r.category_id) === Number(catId))
      .filter(r => !delMap[r.item_id]);
  };
  // Resolve categories of a given section (rate_package_categories).
  const catsOfSection = (sid) => pkgCategories
    .filter(c => c.structure_id === sid)
    .sort((a,b) => (a.sort_order||0) - (b.sort_order||0) || a.id - b.id);

  // ═══════════════════════════════════════════════════════════════════
  // FORMULAS (live, every render)
  // ═══════════════════════════════════════════════════════════════════
  // calcRow / calcCategory now take a "perItem" flag. In uniform mode
  // (perItem=false) each item is multiplied by the passed `area`. In
  // per-item mode (perItem=true) the row's own qty is used.
  const calcRow = (sid, row, area, perItem) => {
    const base  = Number(getRowBase(sid, row))  || 0;
    const addOn = Number(getRowAddOn(sid, row)) || 0;
    const qty   = perItem ? (Number(getRowQty(sid, row)) || 0) : area;
    return { base, addOn, qty, perSqft: base + addOn, total: (base + addOn) * qty };
  };
  const calcCategory = (sid, catId, area, perItem) => {
    let base = 0, addOn = 0, count = 0, itemTotalSum = 0;
    for (const r of rowsOfCategory(sid, catId)) {
      const rc = calcRow(sid, r, area, perItem);
      base  += rc.base;
      addOn += rc.addOn;
      itemTotalSum += rc.total;
      count++;
    }
    const perSqft = base + addOn;
    // Per-item mode: cat total = sum of item totals (each with own qty)
    // Uniform mode:  cat total = (Σ base + Σ addOn) × area
    const total = perItem ? itemTotalSum : (perSqft * area);
    return { base, addOn, perSqft, total, count };
  };
  const calcSection = (sec) => {
    const perItem = getSecPerItem(sec);
    let base = 0, addOn = 0, total = 0, area = 0;
    for (const cat of catsOfSection(sec.id)) {
      const cArea = getCatArea(sec, cat);
      const c = calcCategory(sec.id, cat.id, cArea, perItem);
      base += c.base; addOn += c.addOn; total += c.total;
      area += cArea;
    }
    // Section rollup is DERIVED — area lives on the categories, so the
    // header shows Σ area and the BLENDED rate (total ÷ Σ area). The old
    // "Σ of the category rates × ONE section area" stopped reconciling the
    // moment two categories had different areas: rate × qty ≠ total.
    // Section total is Σ category totals in BOTH modes now.
    //
    // With no area anywhere there is nothing to blend, so fall back to the
    // Σ of the per-sqft rates — that keeps this a readable RATE CARD before
    // any area is entered (which is the normal state here, unlike the
    // Estimate builder where an area always exists). The two agree exactly
    // whenever the categories share one area, so nothing is lost.
    const perSqft = area > 0 ? total / area : (base + addOn);
    return { area, perItem, base, addOn, perSqft, total };
  };
  const calcGrand = () => {
    let base = 0, addOn = 0, total = 0;
    for (const sec of pkgStructures) {
      const s = calcSection(sec);
      base += s.base; addOn += s.addOn; total += s.total;
    }
    return { base, addOn, total };
  };

  const hasChanged =
       Object.keys(sectionEdits).length > 0
    || Object.values(catEdits).some(o => Object.keys(o).length > 0)
    || Object.values(itemEdits).some(o => Object.keys(o).length > 0)
    || Object.values(pendingNewItems).some(a => a.length > 0)
    || Object.values(pendingDelItems).some(o => Object.keys(o).length > 0);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION CRUD (inline name rename, delete, add via modal)
  // ═══════════════════════════════════════════════════════════════════
  const startRenameSection = (sec) => { setRenameSecId(sec.id); setRenameSecValue(getSecName(sec)); };
  const cancelRenameSection = () => { setRenameSecId(null); setRenameSecValue(""); };
  const commitRenameSection = () => {
    if (renameSecId) patchSection(renameSecId, { name: renameSecValue.trim() });
    cancelRenameSection();
  };
  const deleteSection = async (sec) => {
    if (!await window.confirmAsync(`Delete section "${getSecName(sec)}" and all its categories + items?`)) return;
    const r = await api.del("/library/structures/" + sec.id);
    if (r?.success) {
      await loadStructures(selPkg.id);
      await loadCategories(selPkg.id);
    } else alert(r?.message || "Delete failed");
  };
  const openAddSection = () => {
    setAddSectionForm({ name: "", default_qty: 0, unit: "sqft", per_item_qty: false });
    setAddSectionModal(true);
  };
  const closeAddSection = () => { if (!addSectionSaving) setAddSectionModal(null); };
  const saveAddSection = async () => {
    if (!addSectionForm.name?.trim() || !selPkg) return;
    setAddSectionSaving(true);
    const r = await api.post("/library/packages/" + selPkg.id + "/structures", {
      name:         addSectionForm.name.trim(),
      unit:         addSectionForm.unit || "sqft",
      rate:         0,
      default_qty:  Number(addSectionForm.default_qty) || 0,
      per_item_qty: !!addSectionForm.per_item_qty,
    });
    setAddSectionSaving(false);
    if (r?.success) {
      await loadStructures(selPkg.id);
      // Newly-added sections start UNLOCKED so the user can immediately
      // add categories + items without an extra "Edit" click.
      if (r.data?.id) setEditingSections(p => ({ ...p, [r.data.id]: true }));
      setAddSectionModal(null);
    } else alert(r?.message || "Save failed");
  };

  // ═══════════════════════════════════════════════════════════════════
  // CATEGORY CRUD (inline rename, delete, +Add via drawer)
  // ═══════════════════════════════════════════════════════════════════
  const startRenameCat = (cat) => { setRenameCatId(cat.id); setRenameCatValue(cat.category_name); };
  const cancelRenameCat = () => { setRenameCatId(null); setRenameCatValue(""); };
  const commitRenameCat = async () => {
    if (!renameCatId || !renameCatValue.trim()) { cancelRenameCat(); return; }
    // Section-scoped: only renames rate_package_categories.category_name,
    // does NOT touch master work_categories or boq_items.category.
    const r = await api.put("/library/categories/" + renameCatId, { category_name: renameCatValue.trim() });
    if (r?.success) {
      await loadCategories(selPkg.id);
    } else alert(r?.message || "Rename failed");
    cancelRenameCat();
  };
  const deleteCategory = async (cat) => {
    if (!await window.confirmAsync(t("master_library.delete_category_category_name_and_all", { category_name: cat.category_name }))) return;
    const r = await api.del("/library/categories/" + cat.id);
    if (r?.success) {
      await loadCategories(selPkg.id);
      await loadAllSectionItems(selPkg.id, selCity.id, pkgStructures);
    } else alert(r?.message || "Delete failed");
  };
  const openAddCatDrawer = (sec) => {
    setAddCatPicks([]); setAddCatNewForm(null);
    setAddCatDrawer({ structure_id: sec.id, section_name: getSecName(sec) });
  };
  const closeAddCatDrawer = () => { if (!addCatSaving) setAddCatDrawer(null); };
  const confirmAddCats = async () => {
    if (!addCatDrawer) return;
    setAddCatSaving(true);
    // addCatPicks is now an ordered array — pick order = final sort order.
    // Append the new batch AFTER any categories already in this section.
    const existingMaxSort = pkgCategories
      .filter(c => c.structure_id === addCatDrawer.structure_id)
      .reduce((mx, c) => Math.max(mx, Number(c.sort_order) || 0), 0);
    for (let i = 0; i < addCatPicks.length; i++) {
      const id = addCatPicks[i];
      const nm = workCats.find(c => c.id === id)?.name;
      if (!nm) continue;
      await api.post("/library/packages/" + selPkg.id + "/categories", {
        structure_id:  addCatDrawer.structure_id,
        category_name: nm,
        sort_order:    existingMaxSort + 1 + i,
      });
    }
    setAddCatSaving(false);
    await loadCategories(selPkg.id);
    closeAddCatDrawer();
  };
  const createAndAddCat = async () => {
    if (!addCatNewForm?.name?.trim() || !addCatDrawer) return;
    setAddCatSaving(true);
    const cr = await api.post("/library/work-categories", {
      name:        addCatNewForm.name.trim(),
      code:        (addCatNewForm.code || "").trim(),
      description: (addCatNewForm.desc || "").trim(),
    });
    if (cr?.success) {
      await api.post("/library/packages/" + selPkg.id + "/categories", {
        structure_id:  addCatDrawer.structure_id,
        category_name: addCatNewForm.name.trim(),
      });
      await reloadWorkCats();
      await loadCategories(selPkg.id);
      setAddCatNewForm(null);
    } else alert(cr?.message || "Failed to create category");
    setAddCatSaving(false);
  };

  // ═══════════════════════════════════════════════════════════════════
  // ITEM CRUD (in-row edit, pending delete, +Add via drawer)
  // ═══════════════════════════════════════════════════════════════════
  const removeItemRow = (sid, itemId) => {
    // Soft-delete in UI (cleared by Save Rates).
    setPendingDelItems(p => ({
      ...p,
      [sid]: { ...(p[sid] || {}), [itemId]: true }
    }));
    // Drop any pending edits + pending-new for that item.
    setItemEdits(p => {
      const sec = { ...(p[sid] || {}) }; delete sec[itemId];
      return { ...p, [sid]: sec };
    });
    setPendingNewItems(p => ({
      ...p,
      [sid]: (p[sid] || []).filter(r => r.item_id !== itemId)
    }));
  };
  const openAddItemDrawer = (sec, cat) => {
    setAddItemPicks([]); setAddItemSearch(""); setAddItemNewForm(null);
    setAddItemDrawer({
      structure_id:  sec.id,
      section_name:  getSecName(sec),
      category_id:   cat.id,
      category_name: cat.category_name,
    });
  };
  const closeAddItemDrawer = () => { if (!addItemSaving) setAddItemDrawer(null); };
  const confirmAddItems = () => {
    if (!addItemDrawer) return;
    const sid    = addItemDrawer.structure_id;
    const catId  = addItemDrawer.category_id;
    // addItemPicks is now an ORDERED array — preserve user's tick order
    // so the items appear in the section in that order. package_city_rates
    // has no sort_order column, but bulk INSERT preserves array order →
    // display order (sorted by pcr.id) matches the order we insert in.
    const picks  = [...addItemPicks];
    if (!picks.length) { closeAddItemDrawer(); return; }
    const existing = new Set([
      ...(sectionItems[sid] || []).map(r => r.item_id),
      ...(pendingNewItems[sid] || []).map(r => r.item_id),
    ]);
    const fresh = picks
      .filter(id => !existing.has(id))
      .map(id => {
        const masterItem = boqItems.find(i => i.id === id);
        return {
          _isNew:      true,
          item_id:     id,
          category_id: catId,        // target category — drawer's footer category (NOT boq_items.category)
          base_rate:   Number(masterItem?.base_rate) || 0,
          add_on_rate: 0,
          description: "",
        };
      });
    if (fresh.length) {
      setPendingNewItems(p => ({ ...p, [sid]: [...(p[sid] || []), ...fresh] }));
    }
    // Un-mark any pending deletes for these items (re-adding a deleted item).
    setPendingDelItems(p => {
      const sec = { ...(p[sid] || {}) };
      for (const id of picks) delete sec[id];
      return { ...p, [sid]: sec };
    });
    closeAddItemDrawer();
  };
  const createAndAddItem = async () => {
    if (!addItemNewForm?.name?.trim() || !addItemDrawer) return;
    setAddItemSaving(true);
    const r = await api.post("/library/boq-items", {
      name:        addItemNewForm.name.trim(),
      category:    addItemNewForm.category || addItemDrawer.category_name,
      unit:        addItemNewForm.unit || uomOptions[0] || "Sq.Ft",
      base_rate:   Number(addItemNewForm.base_rate) || 0,
      description: addItemNewForm.description || "",
    });
    setAddItemSaving(false);
    if (r?.success && r.data) {
      const newItem = r.data;
      setBoqItems(p => [newItem, ...p]);
      // Auto-add into the drawer's target category in this section.
      const sid = addItemDrawer.structure_id;
      setPendingNewItems(p => ({
        ...p,
        [sid]: [...(p[sid] || []), {
          _isNew:      true,
          item_id:     newItem.id,
          category_id: addItemDrawer.category_id,
          base_rate:   Number(newItem.base_rate) || 0,
          add_on_rate: 0,
          description: "",
        }]
      }));
      setAddItemNewForm(null);
    } else alert(r?.message || "Save failed");
  };

  // ═══════════════════════════════════════════════════════════════════
  // SAVE RATES — Promise.allSettled so partial failures keep dirty flags
  //   1. Section name + per_item_qty PUTs (one per dirty section)
  //   2. Category area PUTs (one per category whose area was edited)
  //   3. Per-section bulk POST /rate-matrix/bulk (one per dirty section)
  //   4. Master base_rate PUTs (dedup'd across sections)
  // ═══════════════════════════════════════════════════════════════════
  const saveRates = async () => {
    if (!selPkg || !selCity) return;
    setSaving(true);

    // ── (1) Section edits — figure which sections need PUTs.
    const sectionOps = []; // { sid, body }
    for (const [sidStr, ed] of Object.entries(sectionEdits)) {
      const sid = Number(sidStr);
      const body = {};
      if (ed.name         !== undefined) body.name = ed.name.trim();
      if (ed.default_qty  !== undefined) body.default_qty = Number(ed.default_qty) || 0;
      if (ed.per_item_qty !== undefined) body.per_item_qty = !!ed.per_item_qty;
      if (Object.keys(body).length) sectionOps.push({ sid, body });
    }

    // ── (2) Category area edits — one PUT per edited category.
    //    Blank ("") clears the override back to NULL so the category
    //    goes back to inheriting the section's default_qty.
    const catOps = []; // { cid, qty }
    for (const [cidStr, ed] of Object.entries(catEdits)) {
      if (ed.qty === undefined) continue;
      catOps.push({ cid: Number(cidStr), qty: ed.qty === "" ? null : (Number(ed.qty) || 0) });
    }

    // ── (3) Dirty section list = anything with item changes.
    const dirtySids = new Set();
    Object.keys(itemEdits).forEach(s => { if (Object.keys(itemEdits[s] || {}).length) dirtySids.add(Number(s)); });
    Object.keys(pendingNewItems).forEach(s => { if ((pendingNewItems[s] || []).length) dirtySids.add(Number(s)); });
    Object.keys(pendingDelItems).forEach(s => { if (Object.keys(pendingDelItems[s] || {}).length) dirtySids.add(Number(s)); });
    // If section.default_qty changed we still want the area mirrored onto items.
    sectionOps.forEach(s => {
      // Any section-level change (name / default_qty / per_item_qty) may
      // require items to be re-saved because we mirror qty onto pcr rows.
      if ((s.body.default_qty !== undefined || s.body.per_item_qty !== undefined)
          && (sectionItems[s.sid] || []).length) dirtySids.add(s.sid);
    });
    // A category area edit changes the qty mirrored onto that category's
    // pcr rows, so its section needs the item bulk-save too.
    catOps.forEach(({ cid }) => {
      const cat = pkgCategories.find(c => c.id === cid);
      if (cat && (sectionItems[cat.structure_id] || []).length) dirtySids.add(cat.structure_id);
    });

    const itemOps = []; // { sid, items }
    for (const sid of dirtySids) {
      const sec = pkgStructures.find(s => s.id === sid);
      if (!sec) continue;
      const perItem = getSecPerItem(sec);
      const delMap = pendingDelItems[sid] || {};
      const saved  = (sectionItems[sid] || []).filter(r => !delMap[r.item_id]);
      const news   = pendingNewItems[sid] || [];
      const all    = [...saved, ...news];
      const items  = all.map(r => {
        const cat = pkgCategories.find(c => c.id === Number(r.category_id));
        return {
          item_id:     r.item_id,
          category_id: r.category_id,
          base_rate:   Number(getRowBase(sid, r))  || 0,
          add_on_rate: Number(getRowAddOn(sid, r)) || 0,
          description: getRowDesc(sid, r),
          // Per-item mode: each row keeps its own qty (from edits or saved).
          // Uniform mode:  mirror the row's CATEGORY area onto each pcr row
          //   so backend compute can use either column without mode-checks.
          qty:         perItem
            ? (Number(getRowQty(sid, r)) || 0)
            : (cat ? getCatArea(sec, cat) : getSecArea(sec)),
        };
      });
      itemOps.push({ sid, items });
    }

    // ── (4) Master base_rate edits — push to boq_items, dedup'd.
    const masterEdits = new Map(); // itemId → { newBase, item }
    for (const [sidStr, byItem] of Object.entries(itemEdits)) {
      for (const [iidStr, ed] of Object.entries(byItem)) {
        if (ed.base_rate === undefined) continue;
        const iid = Number(iidStr);
        const item = boqItems.find(i => i.id === iid);
        if (!item) continue;
        const newBase = Number(ed.base_rate) || 0;
        if (newBase === Number(item.base_rate)) continue;
        if (!masterEdits.has(iid)) masterEdits.set(iid, { newBase, item });
      }
    }

    // ── Fan out all ops via Promise.allSettled.
    const ops = [];
    for (const { sid, body } of sectionOps) {
      ops.push((async () => {
        const r = await api.put("/library/structures/" + sid, body);
        return { kind: "section", sid, ok: !!r?.success, msg: r?.message };
      })());
    }
    for (const { cid, qty } of catOps) {
      ops.push((async () => {
        const r = await api.put("/library/categories/" + cid, { qty });
        return { kind: "category", cid, ok: !!r?.success, msg: r?.message };
      })());
    }
    for (const { sid, items } of itemOps) {
      ops.push((async () => {
        const r = await api.post("/library/rate-matrix/bulk", {
          package_id:   selPkg.id,
          city_id:      selCity.id,
          structure_id: sid,
          items,
        });
        return { kind: "items", sid, ok: !!r?.success, msg: r?.message };
      })());
    }
    for (const [iid, { newBase, item }] of masterEdits.entries()) {
      ops.push((async () => {
        const r = await api.put("/library/boq-items/" + iid, {
          name:        item.name,
          category:    item.category,
          unit:        item.unit,
          base_rate:   newBase,
          description: item.description || "",
        });
        return { kind: "boq-item", iid, ok: !!r?.success, msg: r?.message };
      })());
    }

    const results = await Promise.allSettled(ops);
    setSaving(false);

    // Selectively clear dirty flags for SUCCESSFUL ops only.
    const okSidSection = new Set();
    const okCatIds     = new Set();
    const okSidItems   = new Set();
    const okItemIds    = new Set();
    const failures     = [];
    for (const r of results) {
      if (r.status === "rejected") { failures.push("rejected"); continue; }
      const v = r.value;
      if (!v?.ok) { failures.push(v?.msg || "unknown"); continue; }
      if (v.kind === "section")  okSidSection.add(v.sid);
      if (v.kind === "category") okCatIds.add(v.cid);
      if (v.kind === "items")    okSidItems.add(v.sid);
      if (v.kind === "boq-item") okItemIds.add(v.iid);
    }
    if (okSidSection.size) {
      setSectionEdits(p => { const n = {...p}; okSidSection.forEach(s => delete n[s]); return n; });
    }
    if (okCatIds.size) {
      setCatEdits(p => { const n = {...p}; okCatIds.forEach(c => delete n[c]); return n; });
    }
    if (okSidItems.size) {
      setItemEdits(p => { const n = {...p}; okSidItems.forEach(s => delete n[s]); return n; });
      setPendingNewItems(p => { const n = {...p}; okSidItems.forEach(s => delete n[s]); return n; });
      setPendingDelItems(p => { const n = {...p}; okSidItems.forEach(s => delete n[s]); return n; });
    }
    if (okItemIds.size && boqItems.length) {
      // Patch local boqItems so the next render sees the new master base.
      setBoqItems(p => p.map(i => {
        if (!okItemIds.has(i.id)) return i;
        const e = masterEdits.get(i.id);
        return e ? { ...i, base_rate: e.newBase } : i;
      }));
    }

    // Refresh canonical state from server.
    await Promise.all([
      loadStructures(selPkg.id),
      loadCategories(selPkg.id),
      loadItems(),
    ]);
    await loadAllSectionItems(selPkg.id, selCity.id, pkgStructures);

    if (failures.length) {
      alert(`Saved ${ops.length - failures.length} of ${ops.length}.\nFailed: ${failures.length}.\nFailed sections will stay marked as unsaved.`);
      // Re-lock the sections that saved successfully. Failed ones stay
      // unlocked so the user can fix and retry.
      if (okSidItems.size || okSidSection.size) {
        setEditingSections(p => {
          const n = { ...p };
          okSidItems.forEach(s => delete n[s]);
          okSidSection.forEach(s => delete n[s]);
          return n;
        });
      }
    } else {
      // Full success → re-lock every section (zero-friction default state).
      setEditingSections({});
      alert(t("master_library.rates_saved"));
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // BASIC ADD-NEW HANDLERS (Construction Type, City, Package) — kept
  // ═══════════════════════════════════════════════════════════════════
  const openAdd = (type, preset = {}) => { setAddForm({ ...preset }); setAddModal(type); };
  const handleAdd = async () => {
    setAdding(true);
    let res;
    if (addModal === "type") {
      if (!addForm.name?.trim()) { setAdding(false); return alert(t("master_library.name_required")); }
      res = await api.post("/library/construction-types", { name: addForm.name.trim(), color: addForm.color || "#2563EB" });
      if (res.success) { await loadTypes(); setSelType(res.data); }
    } else if (addModal === "city") {
      if (!addForm.name?.trim()) { setAdding(false); return alert(t("master_library.name_required")); }
      res = await api.post("/library/cities", { name: addForm.name.trim(), state: addForm.state || "Chhattisgarh" });
      if (res.success) { await loadCities(); setSelCity(res.data); }
    } else if (addModal === "pkg") {
      if (!addForm.name?.trim()) { setAdding(false); return alert(t("master_library.name_required")); }
      if (addForm._editingId) {
        res = await api.put("/library/rate-packages/" + addForm._editingId, {
          name:        addForm.name.trim(),
          sqft_rate:   addForm.sqft_rate || 0,
          description: addForm.description || "",
        });
        if (res.success) {
          await loadPackages();
          if (selPkg?.id === addForm._editingId) setSelPkg(p => ({ ...p, ...res.data }));
        }
      } else {
        res = await api.post("/library/rate-packages", {
          name: addForm.name.trim(),
          construction_type_id: selType?.id,
          sqft_rate: addForm.sqft_rate || 0,
          description: addForm.description || ""
        });
        if (res.success) { await loadPackages(); setSelPkg(res.data); }
      }
    }
    setAdding(false);
    if (res?.success) setAddModal(null);
    else if (res) alert(res.message || "Save failed");
  };

  // ═══════════════════════════════════════════════════════════════════
  // PACKAGE EDIT DRAWER — open / staged-edit helpers / save
  //   Edits are staged in pkg* maps; nothing hits server until Save All.
  //   Save uses Promise.allSettled, clears successful flags only.
  // ═══════════════════════════════════════════════════════════════════
  const openEditPkg = (pkg) => {
    setPkgDrawer(pkg);
    setPkgDraft({
      name:        pkg.name || "",
      sqft_rate:   pkg.sqft_rate || 0,
      description: pkg.description || "",
    });
    setPkgSecEdits({});
    setPkgCatRenames({});
    setPkgItemEdits({});
    setPkgDeletedItems({});
    setPkgCollapsedSecs({});
  };
  const closePkgDrawer = () => { if (!pkgSaving) setPkgDrawer(null); };

  // Effective lookups for drawer (staged > saved).
  const pkgGetSecName = (sec) => {
    const ed = pkgSecEdits[sec.id];
    if (ed && ed.name !== undefined) return ed.name;
    return sec.name;
  };
  const pkgGetSecArea = (sec) => {
    const ed = pkgSecEdits[sec.id];
    if (ed && ed.default_qty !== undefined) return ed.default_qty;
    return sec.default_qty || 0;
  };
  const pkgPatchSec = (sid, patch) => setPkgSecEdits(p => ({
    ...p, [sid]: { ...(p[sid] || {}), ...patch }
  }));
  const pkgGetCatName = (cat) => {
    if (pkgCatRenames[cat.id] !== undefined) return pkgCatRenames[cat.id];
    return cat.category_name;
  };
  const pkgGetItem = (iid) => {
    const master = boqItems.find(i => i.id === iid);
    if (!master) return null;
    const ed = pkgItemEdits[iid] || {};
    return {
      id: iid,
      name:        ed.name        !== undefined ? ed.name        : master.name,
      unit:        ed.unit        !== undefined ? ed.unit        : master.unit,
      base_rate:   ed.base_rate   !== undefined ? ed.base_rate   : master.base_rate,
      description: ed.description !== undefined ? ed.description : (master.description || ""),
      _master: master,
    };
  };
  const pkgPatchItem = (iid, patch) => setPkgItemEdits(p => ({
    ...p, [iid]: { ...(p[iid] || {}), ...patch }
  }));
  const pkgToggleDelete = (iid) => setPkgDeletedItems(p => {
    const n = { ...p };
    if (n[iid]) delete n[iid]; else n[iid] = true;
    return n;
  });

  const savePackageEdit = async () => {
    if (!pkgDrawer) return;
    setPkgSaving(true);
    const ops = [];

    // (1) Package basics
    const orig = pkgDrawer;
    const pkgChanged =
         pkgDraft.name        !== orig.name
      || Number(pkgDraft.sqft_rate) !== Number(orig.sqft_rate || 0)
      || (pkgDraft.description || "") !== (orig.description || "");
    if (pkgChanged) {
      ops.push((async () => {
        const r = await api.put("/library/rate-packages/" + orig.id, {
          name:        pkgDraft.name.trim(),
          sqft_rate:   Number(pkgDraft.sqft_rate) || 0,
          description: pkgDraft.description || "",
          construction_type_id: orig.construction_type_id,
        });
        return { kind: "pkg", ok: !!r?.success, msg: r?.message };
      })());
    }

    // (2) Section edits (name + default_qty)
    for (const [sidStr, ed] of Object.entries(pkgSecEdits)) {
      const sid = Number(sidStr);
      const body = {};
      if (ed.name        !== undefined) body.name = ed.name.trim();
      if (ed.default_qty !== undefined) body.default_qty = Number(ed.default_qty) || 0;
      if (!Object.keys(body).length) continue;
      ops.push((async () => {
        const r = await api.put("/library/structures/" + sid, body);
        return { kind: "section", sid, ok: !!r?.success, msg: r?.message };
      })());
    }

    // (3) Section-scoped category renames (rate_package_categories)
    for (const [rpcIdStr, newName] of Object.entries(pkgCatRenames)) {
      const rpcId = Number(rpcIdStr);
      const trimmed = (newName || "").trim();
      if (!trimmed) continue;
      ops.push((async () => {
        const r = await api.put("/library/categories/" + rpcId, { category_name: trimmed });
        return { kind: "category", rpcId, ok: !!r?.success, msg: r?.message };
      })());
    }

    // (4) Master item edits (boq_items)
    for (const [iidStr, ed] of Object.entries(pkgItemEdits)) {
      const iid = Number(iidStr);
      const master = boqItems.find(i => i.id === iid);
      if (!master) continue;
      // Skip items pending deletion — DELETE handles them.
      if (pkgDeletedItems[iid]) continue;
      // No-op if nothing changed.
      const newName = ed.name        !== undefined ? ed.name.trim()        : master.name;
      const newUnit = ed.unit        !== undefined ? ed.unit                : master.unit;
      const newBase = ed.base_rate   !== undefined ? (Number(ed.base_rate) || 0) : (Number(master.base_rate) || 0);
      const newDesc = ed.description !== undefined ? ed.description         : (master.description || "");
      const nothing =
           newName === master.name
        && newUnit === master.unit
        && newBase === (Number(master.base_rate) || 0)
        && newDesc === (master.description || "");
      if (nothing) continue;
      ops.push((async () => {
        const r = await api.put("/library/boq-items/" + iid, {
          name:        newName,
          category:    master.category,
          unit:        newUnit,
          base_rate:   newBase,
          description: newDesc,
        });
        return { kind: "boq-item", iid, ok: !!r?.success, msg: r?.message };
      })());
    }

    // (5) Master item soft-deletes
    for (const iidStr of Object.keys(pkgDeletedItems)) {
      const iid = Number(iidStr);
      ops.push((async () => {
        const r = await api.del("/library/boq-items/" + iid);
        return { kind: "boq-item-del", iid, ok: !!r?.success, msg: r?.message };
      })());
    }

    const results = await Promise.allSettled(ops);
    setPkgSaving(false);

    // Selectively clear dirty flags.
    let pkgOK = false;
    const okSids   = new Set();
    const okRpcIds = new Set();
    const okIids   = new Set();
    const okDelIids= new Set();
    const failures = [];
    for (const r of results) {
      if (r.status === "rejected") { failures.push("rejected"); continue; }
      const v = r.value;
      if (!v?.ok) { failures.push(v?.msg || "unknown"); continue; }
      if (v.kind === "pkg")            pkgOK = true;
      if (v.kind === "section")        okSids.add(v.sid);
      if (v.kind === "category")       okRpcIds.add(v.rpcId);
      if (v.kind === "boq-item")       okIids.add(v.iid);
      if (v.kind === "boq-item-del")   okDelIids.add(v.iid);
    }
    if (pkgOK) {
      // Patch local pkgDrawer + packages list so the UI reflects new name/rate
      // immediately even before loadPackages() returns.
      setPackages(p => p.map(x => x.id === orig.id ? { ...x, ...pkgDraft } : x));
      if (selPkg?.id === orig.id) setSelPkg(p => ({ ...p, ...pkgDraft }));
    }
    if (okSids.size) setPkgSecEdits(p => { const n = {...p}; okSids.forEach(s => delete n[s]); return n; });
    if (okRpcIds.size) setPkgCatRenames(p => { const n = {...p}; okRpcIds.forEach(s => delete n[s]); return n; });
    if (okIids.size) setPkgItemEdits(p => { const n = {...p}; okIids.forEach(s => delete n[s]); return n; });
    if (okDelIids.size) {
      setPkgDeletedItems(p => { const n = {...p}; okDelIids.forEach(s => delete n[s]); return n; });
      // Drop deleted items from local boqItems too.
      setBoqItems(p => p.filter(i => !okDelIids.has(i.id)));
    }

    // Refresh canonical state.
    await Promise.all([
      loadPackages(),
      loadItems(),
      loadStructures(orig.id),
      loadCategories(orig.id),
    ]);
    if (selCity && pkgStructures.length) {
      await loadAllSectionItems(orig.id, selCity.id, pkgStructures);
    }

    if (failures.length) {
      alert(`Saved ${ops.length - failures.length} of ${ops.length}.\nFailed: ${failures.length}.\nFailed edits stay marked as unsaved.`);
    } else {
      // Close drawer only on full success.
      setPkgDrawer(null);
    }
  };

  // ── DELETE PACKAGE — danger-zone flow with type-to-confirm ─────
  // Cascades on the backend (sections + categories + pcr rows all soft-
  // deleted in one route call). Quotations referencing the package are
  // intentionally left intact so historical records stay readable.
  const deletePackage = async () => {
    if (!pkgDrawer) return;
    if (pkgDeleteText.trim() !== pkgDrawer.name) return;   // guard
    setPkgDeleting(true);
    try {
      const r = await api.del("/library/rate-packages/" + pkgDrawer.id);
      if (!r?.success) { alert(r?.message || "Delete failed"); return; }
      await loadPackages();
      if (selPkg?.id === pkgDrawer.id) setSelPkg(null);
      setPkgDrawer(null);
      setPkgDangerOpen(false);
      setPkgDeleteText("");
    } finally { setPkgDeleting(false); }
  };

  // ── EDIT / DELETE CONSTRUCTION TYPE (danger-zone delete) ───────
  const openTypeEdit = (ct) => {
    setTypeEdit(ct);
    setTypeForm({ name: ct.name || "", color: ct.color || "#2563EB" });
    setTypeDangerOpen(false); setTypeDeleteText("");
  };
  const closeTypeEdit = () => { if (!typeSaving) { setTypeEdit(null); setTypeDangerOpen(false); setTypeDeleteText(""); } };
  const saveTypeEdit = async () => {
    if (!typeEdit || !typeForm.name?.trim()) return;
    setTypeSaving(true);
    const r = await api.put("/library/construction-types/" + typeEdit.id, {
      name: typeForm.name.trim(), color: typeForm.color || "#2563EB",
    });
    setTypeSaving(false);
    if (r?.success) {
      await loadTypes();
      if (selType?.id === typeEdit.id) setSelType(p => ({ ...p, ...typeForm }));
      setTypeEdit(null);
    } else alert(r?.message || "Save failed");
  };
  const deleteType = async () => {
    if (!typeEdit) return;
    if (typeDeleteText.trim() !== typeEdit.name) return;
    setTypeSaving(true);
    const r = await api.del("/library/construction-types/" + typeEdit.id);
    setTypeSaving(false);
    if (r?.success) {
      await loadTypes();
      if (selType?.id === typeEdit.id) { setSelType(null); setSelPkg(null); }
      setTypeEdit(null);
    } else alert(r?.message || "Delete failed");
  };

  // ── EDIT / DELETE CITY (danger-zone delete) ────────────────────
  const openCityEdit = (city) => {
    setCityEdit(city);
    setCityForm({ name: city.name || "", state: city.state || "Chhattisgarh" });
    setCityDangerOpen(false); setCityDeleteText("");
  };
  const closeCityEdit = () => { if (!citySaving) { setCityEdit(null); setCityDangerOpen(false); setCityDeleteText(""); } };
  const saveCityEdit = async () => {
    if (!cityEdit || !cityForm.name?.trim()) return;
    setCitySaving(true);
    const r = await api.put("/library/cities/" + cityEdit.id, {
      name: cityForm.name.trim(), state: cityForm.state || "Chhattisgarh",
    });
    setCitySaving(false);
    if (r?.success) {
      await loadCities();
      if (selCity?.id === cityEdit.id) setSelCity(p => ({ ...p, ...cityForm }));
      setCityEdit(null);
    } else alert(r?.message || "Save failed");
  };
  const deleteCity = async () => {
    if (!cityEdit) return;
    if (cityDeleteText.trim() !== cityEdit.name) return;
    setCitySaving(true);
    const r = await api.del("/library/cities/" + cityEdit.id);
    setCitySaving(false);
    if (r?.success) {
      await loadCities();
      if (selCity?.id === cityEdit.id) setSelCity(null);
      setCityEdit(null);
    } else alert(r?.message || "Delete failed");
  };

  const pkgHasChanged = !!pkgDrawer && (
       pkgDraft.name        !== pkgDrawer.name
    || Number(pkgDraft.sqft_rate) !== Number(pkgDrawer.sqft_rate || 0)
    || (pkgDraft.description || "") !== (pkgDrawer.description || "")
    || Object.values(pkgSecEdits).some(o => Object.keys(o).length > 0)
    || Object.keys(pkgCatRenames).length > 0
    || Object.keys(pkgItemEdits).length > 0
    || Object.keys(pkgDeletedItems).length > 0
  );

  // ═══════════════════════════════════════════════════════════════════
  // PALETTE
  // ═══════════════════════════════════════════════════════════════════
  const COL_DARK    = "#0F172A";
  const COL_DARK2   = "#1E293B";
  const COL_CAT_BG  = "#F1F5F9";    // category subheader bg
  const COL_AMBER   = "#F59E0B";
  const COL_TEAL    = "#0D9488";
  const COL_TEAL_BG = "#CCFBF1";
  const COL_GREEN   = "#059669";
  const COL_RED     = "#EF4444";
  const COL_BLUE    = "#2563EB";

  const typePkgs = packages.filter(p => selType && String(p.construction_type_id) === String(selType.id));
  const grand = calcGrand();

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "inherit" }}>

      {/* ─── LEVEL 1: Construction Type ──────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>{t("master_library.1_construction_type_2")}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {conTypes.map(ct => {
            const active = selType?.id === ct.id;
            return (
              <div key={ct.id} onClick={() => { setSelType(ct); setSelPkg(null); }}
                style={{
                  position: "relative",
                  padding: active ? "9px 32px 9px 18px" : "9px 18px", borderRadius: 8,
                  border: "2px solid " + (active ? (ct.color || COL_BLUE) : "#E5E7EB"),
                  background: active ? (ct.color || COL_BLUE) : "white",
                  color: active ? "white" : "#374151",
                  fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all .15s"
                }}>
                {ct.name}
                {active && (
                  <button onClick={(e) => { e.stopPropagation(); openTypeEdit(ct); }}
                    title={t("master_library.edit_construction_type")}
                    style={{ position: "absolute", right: 6, top: 6,
                             background: "rgba(255,255,255,0.2)", border: "none",
                             borderRadius: 4, color: "white", cursor: "pointer",
                             padding: 3, display: "flex" }}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
          <button onClick={() => openAdd("type")}
            style={{ padding: "9px 14px", borderRadius: 8, border: "2px dashed #D1D5DB", background: "transparent", color: "#6B7280", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
           {t("master_library.new_type")}
          </button>
        </div>
      </div>

      {/* ─── LEVEL 2: City ──────────────────────────────────────────── */}
      {selType && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>{t("master_library.2_city_2")}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {cities.map(city => {
              const active = selCity?.id === city.id;
              return (
                <div key={city.id} onClick={() => setSelCity(city)}
                  style={{
                    position: "relative",
                    padding: active ? "9px 32px 9px 18px" : "9px 18px", borderRadius: 8,
                    border: "2px solid " + (active ? "#0891B2" : "#E5E7EB"),
                    background: active ? "#0891B2" : "white",
                    color: active ? "white" : "#374151",
                    fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all .15s"
                  }}>
                  {city.name}
                  {active && (
                    <button onClick={(e) => { e.stopPropagation(); openCityEdit(city); }}
                      title={t("master_library.edit_city")}
                      style={{ position: "absolute", right: 6, top: 6,
                               background: "rgba(255,255,255,0.2)", border: "none",
                               borderRadius: 4, color: "white", cursor: "pointer",
                               padding: 3, display: "flex" }}>
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
            <button onClick={() => openAdd("city")}
              style={{ padding: "9px 14px", borderRadius: 8, border: "2px dashed #D1D5DB", background: "transparent", color: "#6B7280", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
             {t("master_library.new_city")}
            </button>
          </div>
        </div>
      )}

      {/* ─── LEVEL 3: Package ──────────────────────────────────────── */}
      {selType && selCity && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>{t("master_library.3_package")}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {typePkgs.map(pkg => {
              const active = selPkg?.id === pkg.id;
              return (
                <div key={pkg.id} onClick={() => setSelPkg(pkg)}
                  style={{ position: "relative", padding: "9px 32px 9px 20px", borderRadius: 8,
                    border: "2px solid " + (active ? "#7C3AED" : "#E5E7EB"),
                    background: active ? "#7C3AED" : "white",
                    color: active ? "white" : "#374151",
                    fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all .15s" }}>
                  <div>{pkg.name}</div>
                  {pkg.sqft_rate > 0 && <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>{t("master_library.rs_inr_sqft", { inr: inr(pkg.sqft_rate) })}</div>}
                  {/* Pencil — only on the active tile. Opens Package Edit drawer. */}
                  {active && (
                    <button onClick={(e) => { e.stopPropagation(); openEditPkg(pkg); }}
                      title={t("master_library.edit_package")}
                      style={{ position: "absolute", right: 6, top: 6,
                               background: "rgba(255,255,255,0.18)", border: "none",
                               borderRadius: 4, color: "white", cursor: "pointer",
                               padding: 3, display: "flex" }}>
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
            <button onClick={() => openAdd("pkg")}
              style={{ padding: "9px 14px", borderRadius: 8, border: "2px dashed #D1D5DB", background: "transparent", color: "#6B7280", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
             {t("master_library.new_package")}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TREE — Section → Category → Item (all sections rendered together)
      ═══════════════════════════════════════════════════════════════ */}
      {selType && selCity && selPkg && (
        <>
          {/* ── CONTEXT BAR + GLOBAL ACTIONS ── */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8,
                        padding: "10px 16px", marginBottom: 14, display: "flex",
                        justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#1E40AF" }}>
              <strong>{selType.name}</strong> — <strong>{selPkg.name}</strong> — <strong>{selCity.name}</strong>
              {hasChanged && <span style={{ marginLeft: 10, color: "#D97706", fontWeight: 600 }}>{t("master_library.unsaved_changes")}</span>}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={openAddSection}
                style={{ padding: "8px 14px", background: "white", color: COL_DARK,
                         border: "1.5px solid " + COL_DARK, borderRadius: 7,
                         fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
               {t("common.add_section")}
              </button>
              <button onClick={saveRates} disabled={saving || !hasChanged}
                style={{ padding: "8px 20px",
                         background: (saving || !hasChanged) ? "#9CA3AF" : COL_BLUE,
                         color: "white", border: "none", borderRadius: 7,
                         fontSize: 13, fontWeight: 700,
                         cursor: (saving || !hasChanged) ? "default" : "pointer" }}>
                {saving ? t("common.saving") : t("master_library.save_rates_2")}
              </button>
            </div>
          </div>

          {/* ── EMPTY STATE: no sections yet ── */}
          {pkgStructures.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 14 }}>
             {t("master_library.no_sections_in_this_package_yet")} <strong>{t("common.add_section")}</strong> {t("master_library.above_to_start")}
            </div>
          )}

          {/* ── SECTIONS ── */}
          {pkgStructures.map(sec => {
            const sCalc      = calcSection(sec);
            const perItem    = sCalc.perItem;
            const collapsed  = !!collapsedSections[sec.id];
            const editable   = !!editingSections[sec.id];
            const cats       = catsOfSection(sec.id);
            const renaming   = editable && renameSecId === sec.id;
            const dirty      = !!sectionEdits[sec.id]
                            || cats.some(c => catEdits[c.id] && Object.keys(catEdits[c.id]).length)
                            || !!(itemEdits[sec.id] && Object.keys(itemEdits[sec.id]).length)
                            || !!(pendingNewItems[sec.id] && pendingNewItems[sec.id].length)
                            || !!(pendingDelItems[sec.id] && Object.keys(pendingDelItems[sec.id]).length);
            // "set area" hint only matters in uniform mode — per-item sections
            // show per-row qty. sCalc.area is Σ of the category areas, so this
            // fires only when NO category has an area yet.
            const noAreaHint = !perItem && sCalc.area === 0;
            return (
              <div key={sec.id}
                style={{ background: "white", borderRadius: 10, border: "1px solid #E5E7EB",
                         marginBottom: 14, overflow: "hidden",
                         boxShadow: dirty ? "0 0 0 2px #FCD34D" : "none" }}>
                {/* ── SECTION HEADER (dark) ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 10,
                              padding: "11px 16px", background: COL_DARK, color: "white" }}>
                  <span onClick={() => setCollapsedSections(p => ({ ...p, [sec.id]: !p[sec.id] }))}
                    style={{ cursor: "pointer", display: "flex" }}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                         stroke="rgba(255,255,255,0.65)" strokeWidth={2.5}
                         style={{ transition: "transform .15s", transform: collapsed ? "rotate(0deg)" : "rotate(90deg)" }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </span>

                  {renaming ? (
                    <>
                      <input value={renameSecValue}
                        onChange={e => setRenameSecValue(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") commitRenameSection(); if (e.key === "Escape") cancelRenameSection(); }}
                        onBlur={commitRenameSection}
                        autoFocus
                        style={{ padding: "5px 10px", fontSize: 14, fontWeight: 700,
                                 borderRadius: 5, border: "1.5px solid rgba(255,255,255,0.3)",
                                 background: "rgba(255,255,255,0.1)", color: "white", outline: "none",
                                 fontFamily: "inherit", minWidth: 220 }}/>
                    </>
                  ) : (
                    <span onClick={editable ? () => startRenameSection(sec) : undefined}
                      title={editable ? t("master_library.click_to_rename") : t("master_library.click_edit_to_unlock")}
                      style={{ fontWeight: 700, fontSize: 14, color: "white",
                               cursor: editable ? "pointer" : "default" }}>
                      {getSecName(sec)}
                    </span>
                  )}

                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                    · {cats.length} categ{cats.length === 1 ? "ory" : "ories"}
                  </span>
                  {noAreaHint && (
                    <span style={{ marginLeft: 6, padding: "2px 8px", fontSize: 10.5, fontWeight: 600,
                                   background: "rgba(252,211,77,0.18)", color: "#FCD34D",
                                   borderRadius: 4, border: "1px solid rgba(252,211,77,0.35)" }}>
                     {t("master_library.set_area_to_see_totals")}
                    </span>
                  )}

                  {/* Right metrics — in per-item mode the Base/Add-on/per-sqft
                      aggregates are mathematically meaningless (different items
                      have different qtys, so summing per-unit rates doesn't
                      represent anything useful). Only Total survives there. */}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center",
                                fontSize: 11.5, fontWeight: 600 }}>
                    {!perItem && (
                      <>
                        {/* Section rollup is DERIVED — area is entered per
                            category, so the header shows Σ area and the
                            blended rate. No section-level area input: one
                            editable place for a number, and rate × qty
                            always equals total. */}
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, textTransform: "uppercase" }}>{t("common.qty")}</span>
                          <strong style={{ color: "white", fontSize: 12.5 }}>{inr(sCalc.area)}</strong>
                        </span>
                        <span style={{ padding: "3px 9px", background: COL_TEAL_BG, color: COL_TEAL,
                                       borderRadius: 4, fontWeight: 700 }}
                          title={t("estimate_builder.blended_rate_total_total_area")}>{t("master_library.rs_inr_sec", { inr: inr(Math.round(sCalc.perSqft)), sec: sec.unit || "sqft" })}</span>
                      </>
                    )}
                    {/* Per-item qty toggle (only when section is editable) */}
                    {editable && (
                      <button onClick={() => patchSection(sec.id, { per_item_qty: !perItem })}
                        title={perItem
                          ? t("master_library.per_item_qty_mode_is_on")
                          : t("master_library.uniform_area_mode_all_items_share")}
                        style={{ background: perItem ? "rgba(245,158,11,0.22)" : "rgba(255,255,255,0.10)",
                                 border: "1px solid " + (perItem ? "#F59E0B" : "rgba(255,255,255,0.2)"),
                                 color: perItem ? "#FCD34D" : "rgba(255,255,255,0.85)",
                                 borderRadius: 4, padding: "3px 9px", fontSize: 10.5, fontWeight: 700,
                                 cursor: "pointer", letterSpacing: ".3px", textTransform: "uppercase" }}>
                        {perItem ? t("common.per_item_qty") : t("master_library.uniform_area")}
                      </button>
                    )}
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>{t("common.total")} <strong style={{ color: COL_TEAL_BG, fontSize: 13 }}>{t("master_library.rs_inr", { inr: inr(sCalc.total) })}</strong></span>

                    {/* Edit / Done toggle — switches the entire section between
                        locked (read-only displays) and editable. Default = locked. */}
                    <button onClick={() => setEditingSections(p => ({ ...p, [sec.id]: !p[sec.id] }))}
                      title={editable ? t("master_library.lock_section") : t("master_library.unlock_to_edit")}
                      style={{ background: editable ? "#10B981" : "rgba(255,255,255,0.14)",
                               border: "none", color: "white",
                               borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 700,
                               cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                      {editable ? (
                        <>
                          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                         {t("common.done")}
                        </>
                      ) : (
                        <>
                          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                         {t("common.edit_2")}
                        </>
                      )}
                    </button>

                    {/* × delete — only visible when section is unlocked */}
                    {editable && (
                      <button onClick={() => deleteSection(sec)}
                        title={t("estimate_builder.delete_section")}
                        style={{ background: "rgba(239,68,68,0.18)", border: "none", color: "#FCA5A5",
                                 borderRadius: 4, width: 24, height: 24, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* ── CATEGORIES ── */}
                {!collapsed && (
                  <div style={{ padding: 10 }}>
                    {cats.length === 0 && (
                      <div style={{ padding: "18px 12px", textAlign: "center", color: "#9CA3AF", fontSize: 12.5 }}>
                       {t("master_library.no_categories_in_this_section_yet")}
                      </div>
                    )}
                    {cats.map(cat => {
                      const cArea        = getCatArea(sec, cat);
                      const cCalc        = calcCategory(sec.id, cat.id, cArea, perItem);
                      const catKey       = `${sec.id}:${cat.id}`;
                      const catCollapsed = !!collapsedCats[catKey];
                      const rows         = rowsOfCategory(sec.id, cat.id);
                      const catRenaming  = editable && renameCatId === cat.id;
                      const areaEdited   = catEdits[cat.id]?.qty !== undefined;
                      // Show the EFFECTIVE area (own qty, else the section
                      // default it inherits) so the field always reads what
                      // is actually in use. Blank invites a first entry.
                      const areaVal      = areaEdited
                        ? catEdits[cat.id].qty
                        : (cArea === 0 ? "" : String(cArea));
                      return (
                        <div key={cat.id} style={{ marginBottom: 10, border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
                          {/* Category subheader */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8,
                                        padding: "8px 12px", background: COL_CAT_BG, borderBottom: catCollapsed ? "none" : "1px solid #E5E7EB" }}>
                            <span onClick={() => setCollapsedCats(p => ({ ...p, [catKey]: !p[catKey] }))}
                              style={{ cursor: "pointer", display: "flex" }}>
                              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2.5}
                                style={{ transition: "transform .15s", transform: catCollapsed ? "rotate(0deg)" : "rotate(90deg)" }}>
                                <polyline points="9 18 15 12 9 6"/>
                              </svg>
                            </span>
                            {catRenaming ? (
                              <input value={renameCatValue}
                                onChange={e => setRenameCatValue(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") commitRenameCat(); if (e.key === "Escape") cancelRenameCat(); }}
                                onBlur={commitRenameCat}
                                autoFocus
                                style={{ padding: "3px 8px", fontSize: 12.5, fontWeight: 700,
                                         borderRadius: 4, border: "1.5px solid " + COL_BLUE,
                                         background: "white", outline: "none", fontFamily: "inherit", minWidth: 180 }}/>
                            ) : (
                              <span onClick={editable ? () => startRenameCat(cat) : undefined}
                                title={editable ? t("master_library.click_to_rename_section_scoped") : t("master_library.click_edit_on_section_to_unlock")}
                                style={{ fontWeight: 700, fontSize: 12.5, color: "#0F172A",
                                         cursor: editable ? "pointer" : "default" }}>
                                {cat.category_name}
                              </span>
                            )}
                            <span style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: 500 }}>
                              · {rows.length} item{rows.length === 1 ? "" : "s"}
                            </span>
                            <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center",
                                          fontSize: 11, fontWeight: 600 }}>
                              {/* In per-item mode aggregated Base + Add-on are
                                  meaningless (items have different qtys). Only
                                  Total renders. Items below keep their own rates. */}
                              {!perItem && (
                                <>
                                  <span style={{ color: "#64748B" }}>{t("common.base")} <strong style={{ color: "#0F172A" }}>{t("master_library.rs_inr", { inr: inr(cCalc.base) })}</strong></span>
                                  <span style={{ color: "#64748B" }}>{t("common.add_on")} <strong style={{ color: COL_AMBER }}>{t("master_library.rs_inr", { inr: inr(cCalc.addOn) })}</strong></span>
                                  {/* AREA — the one place a qty is entered.
                                      Editable only while the section is
                                      unlocked; hidden in per-item mode where
                                      every row carries its own qty instead. */}
                                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <span style={{ color: "#64748B", fontSize: 10.5, textTransform: "uppercase" }}>{t("common.area")}</span>
                                    {editable ? (
                                      <input type="number" value={areaVal}
                                        onChange={e => patchCategoryArea(cat.id, { qty: e.target.value })}
                                        placeholder="0"
                                        title={t("estimate_builder.is_category_ki_area_qty_section")}
                                        style={{ width: 70, padding: "4px 7px", borderRadius: 5, textAlign: "right",
                                                 fontFamily: "inherit", fontSize: 11.5, fontWeight: 700,
                                                 border: "1.5px solid " + (areaEdited ? COL_AMBER : "#CBD5E1"),
                                                 background: areaEdited ? "#FFFBEB" : "white",
                                                 color: areaEdited ? "#92400E" : "#0F172A", outline: "none" }}/>
                                    ) : (
                                      <span style={{ padding: "3px 7px", color: "#0F172A", fontWeight: 700, fontSize: 12 }}>{inr(cArea)}</span>
                                    )}
                                  </span>
                                </>
                              )}
                              <span style={{ color: "#64748B" }}>{t("common.total")} <strong style={{ color: COL_GREEN }}>{t("master_library.rs_inr", { inr: inr(cCalc.total) })}</strong></span>
                              {editable && (
                                <button onClick={() => deleteCategory(cat)}
                                  title={t("estimate_builder.delete_category")}
                                  style={{ background: "transparent", border: "none", color: COL_RED, cursor: "pointer", fontSize: 14, padding: 2, lineHeight: 1 }}>
                                  ×
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Item table */}
                          {!catCollapsed && (
                            <>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ background: "#FAFAFA" }}>
                                    <th style={{ padding: "7px 12px", textAlign: "left",  fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>{t("common.item")}</th>
                                    <th style={{ padding: "7px 12px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", width: 60 }}>{t("common.unit")}</th>
                                    <th style={{ padding: "7px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", width: 95 }}>{t("common.base")}</th>
                                    <th style={{ padding: "7px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: COL_AMBER, textTransform: "uppercase", width: 95 }}>{t("common.add_on")}</th>
                                    <th style={{ padding: "7px 12px", textAlign: "left",  fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>{t("common.description")}</th>
                                    <th style={{ padding: "7px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: COL_TEAL, textTransform: "uppercase", width: 70 }}>{perItem ? t("common.qty") : t("common.area")}</th>
                                    <th style={{ padding: "7px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: COL_GREEN, textTransform: "uppercase", width: 105 }}>{t("common.total")}</th>
                                    <th style={{ width: 36 }}/>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.length === 0 && (
                                    <tr>
                                      <td colSpan={8} style={{ padding: "12px", textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>
                                       {t("master_library.no_items_in_this_category_yet")}
                                      </td>
                                    </tr>
                                  )}
                                  {rows.map((r, idx) => {
                                    const masterItem = boqItems.find(b => b.id === r.item_id);
                                    const name  = masterItem?.name || ("Item #" + r.item_id);
                                    const unit  = masterItem?.unit || "—";
                                    const calc  = calcRow(sec.id, r, cArea, perItem);
                                    const ed    = itemEdits[sec.id]?.[r.item_id];
                                    const isNew = !!r._isNew;
                                    const hasEdit = !!ed && Object.keys(ed).length > 0;
                                    const baseEdited = ed?.base_rate !== undefined
                                                    && masterItem
                                                    && Number(ed.base_rate) !== Number(masterItem.base_rate);
                                    return (
                                      <tr key={r.item_id}
                                        style={{ background: isNew ? "#ECFDF5" : (idx % 2 === 0 ? "white" : "#FAFAFA"),
                                                 borderBottom: "1px solid #F3F4F6" }}>
                                        <td style={{ padding: "8px 12px", fontWeight: 600, fontSize: 12.5, color: "#0F172A" }}>
                                          {name}
                                          {isNew && <span style={{ marginLeft: 6, padding: "1px 6px", fontSize: 9.5, fontWeight: 700, background: COL_GREEN, color: "white", borderRadius: 3 }}>NEW</span>}
                                        </td>
                                        <td style={{ padding: "8px 12px", textAlign: "center", fontSize: 12, color: "#64748B" }}>{unit}</td>
                                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                          {editable ? (
                                            <input type="number" value={getRowBase(sec.id, r)}
                                              onChange={e => patchRow(sec.id, r.item_id, { base_rate: e.target.value })}
                                              title="Base rate (master library — saves to boq_items)"
                                              style={{ width: 85, padding: "5px 7px", borderRadius: 5, textAlign: "right",
                                                       fontFamily: "inherit", fontSize: 12.5,
                                                       border: "1.5px solid " + (baseEdited ? COL_AMBER : "#E5E7EB"),
                                                       background: baseEdited ? "#FFFBEB" : "white", outline: "none",
                                                       color: baseEdited ? "#92400E" : "#0F172A",
                                                       fontWeight: baseEdited ? 700 : 500 }}/>
                                          ) : (
                                            <span style={{ fontSize: 12.5, color: "#0F172A", fontWeight: 500 }}>
                                              {inr(getRowBase(sec.id, r))}
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                          {editable ? (
                                            <input type="number" value={getRowAddOn(sec.id, r)}
                                              onChange={e => patchRow(sec.id, r.item_id, { add_on_rate: e.target.value })}
                                              style={{ width: 85, padding: "5px 7px", borderRadius: 5, textAlign: "right",
                                                       fontFamily: "inherit", fontSize: 12.5,
                                                       border: "1.5px solid " + (hasEdit ? COL_BLUE : "#E5E7EB"),
                                                       background: hasEdit ? "#EFF6FF" : "white", outline: "none" }}/>
                                          ) : (
                                            <span style={{ fontSize: 12.5, color: COL_AMBER, fontWeight: 600 }}>
                                              {inr(getRowAddOn(sec.id, r))}
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ padding: "8px 12px" }}>
                                          {editable ? (
                                            <input type="text" value={getRowDesc(sec.id, r)}
                                              onChange={e => patchRow(sec.id, r.item_id, { description: e.target.value })}
                                              placeholder={t("common.optional_note")}
                                              style={{ width: "100%", padding: "5px 9px", borderRadius: 5,
                                                       fontFamily: "inherit", fontSize: 11.5,
                                                       border: "1.5px solid " + (hasEdit ? COL_BLUE : "#E5E7EB"),
                                                       background: hasEdit ? "#EFF6FF" : "white", outline: "none", boxSizing: "border-box" }}/>
                                          ) : (
                                            <span style={{ fontSize: 11.5, color: "#475569" }}>
                                              {getRowDesc(sec.id, r) || <em style={{ color: "#CBD5E1" }}>—</em>}
                                            </span>
                                          )}
                                        </td>
                                        {/* Area / Qty column. Per-item mode: editable qty input
                                            when section unlocked; read-only span when locked.
                                            Uniform mode: shows the CATEGORY's area (read-only
                                            either way — it is edited in the category header). */}
                                        <td style={{ padding: "8px 12px", textAlign: "right", fontSize: 12, color: COL_TEAL, fontWeight: 600 }}>
                                          {perItem && editable ? (
                                            <input type="number"
                                              value={getRowQty(sec.id, r)}
                                              onChange={e => patchRow(sec.id, r.item_id, { qty: e.target.value })}
                                              placeholder="0"
                                              title={t("master_library.item_specific_quantity_per_item_mode")}
                                              style={{ width: 70, padding: "5px 7px", borderRadius: 5, textAlign: "right",
                                                       fontFamily: "inherit", fontSize: 12.5,
                                                       border: "1.5px solid " + (itemEdits[sec.id]?.[r.item_id]?.qty !== undefined ? COL_AMBER : "#E5E7EB"),
                                                       background: itemEdits[sec.id]?.[r.item_id]?.qty !== undefined ? "#FFFBEB" : "white",
                                                       outline: "none", color: COL_TEAL, fontWeight: 700 }}/>
                                          ) : (
                                            inr(perItem ? getRowQty(sec.id, r) : cArea)
                                          )}
                                        </td>
                                        <td style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: COL_GREEN }}>{t("master_library.rs_inr", { inr: inr(calc.total) })}</td>
                                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                                          {editable && (
                                            <button onClick={() => removeItemRow(sec.id, r.item_id)}
                                              title={t("master_library.remove_from_this_section")}
                                              style={{ background: "transparent", border: "none", color: COL_RED, cursor: "pointer", fontSize: 14, padding: 2, lineHeight: 1 }}>
                                              ×
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              {/* Category footer — only visible when section is unlocked */}
                              {editable && (
                                <div style={{ padding: "8px 12px", borderTop: "1px solid #F3F4F6", background: "#FAFAFA" }}>
                                  <button onClick={() => openAddItemDrawer(sec, cat)}
                                    style={{ background: "transparent", border: "1px dashed #BFDBFE",
                                             color: COL_BLUE, borderRadius: 5,
                                             padding: "5px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{t("master_library.add_item_to_category_name", { category_name: cat.category_name })}</button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Section footer — only visible when section is unlocked */}
                    {editable && (
                      <div style={{ padding: "6px 0 2px", textAlign: "right" }}>
                        <button onClick={() => openAddCatDrawer(sec)}
                          style={{ background: "white", border: "1px dashed #94A3B8",
                                   color: "#475569", borderRadius: 6,
                                   padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                         {t("common.add_category")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── GRAND TOTAL BAR (dark) ── */}
          {pkgStructures.length > 0 && (
            <div style={{ marginTop: 10, padding: "14px 18px",
                          background: COL_DARK, color: "white", borderRadius: 10,
                          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".4px",
                             textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
               {t("common.grand_total")}
              </span>
              {/* Base + Add-on hidden by design — each section has its own area,
                  so summing per-sqft rates across sections would be meaningless.
                  Only the Total (which is Σ section.total) is comparable. */}
              <div style={{ display: "flex", alignItems: "center", fontSize: 13, fontWeight: 600 }}>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>{t("common.total")} <strong style={{ color: COL_TEAL_BG, fontSize: 18 }}>{t("master_library.rs_inr", { inr: inr(grand.total) })}</strong></span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ADD SECTION MODAL (kept as modal per locked Q3)
      ═══════════════════════════════════════════════════════════════ */}
      {addSectionModal && (
        <>
          <div onClick={closeAddSection}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 700 }}/>
          <div onClick={e => e.stopPropagation()}
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                     width: "min(440px,95vw)", background: "white", borderRadius: 12, zIndex: 701,
                     boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
            <div style={{ background: COL_DARK, padding: "13px 18px", borderRadius: "12px 12px 0 0",
                          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{t("common.add_section_2")}</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{t("master_library.package_name", { name: selPkg?.name })}</div>
              </div>
              <button onClick={closeAddSection} disabled={addSectionSaving}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)",
                         fontSize: 22, cursor: addSectionSaving ? "not-allowed" : "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4, textTransform: "uppercase" }}>{t("common.name")}</label>
                <input autoFocus value={addSectionForm.name}
                  onChange={e => setAddSectionForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={t("master_library.e_g_ground_floor_first_floor_2")}
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 7,
                           border: "1.5px solid #D1D5DB", fontSize: 13, fontFamily: "inherit",
                           outline: "none", boxSizing: "border-box" }}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 700, color: COL_TEAL, display: "block", marginBottom: 4, textTransform: "uppercase" }}>{t("master_library.area_qty")}</label>
                  <input type="number" value={addSectionForm.default_qty}
                    onChange={e => setAddSectionForm(p => ({ ...p, default_qty: e.target.value }))}
                    placeholder="0"
                    style={{ width: "100%", padding: "9px 11px", borderRadius: 7,
                             border: "1.5px solid " + COL_TEAL_BG, fontSize: 13, fontFamily: "inherit",
                             outline: "none", boxSizing: "border-box", textAlign: "right",
                             background: "#F0FDFA" }}/>
                </div>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4, textTransform: "uppercase" }}>{t("common.unit")}</label>
                  <select value={addSectionForm.unit}
                    onChange={e => setAddSectionForm(p => ({ ...p, unit: e.target.value }))}
                    style={{ width: "100%", padding: "9px 11px", borderRadius: 7,
                             border: "1.5px solid #D1D5DB", fontSize: 13, fontFamily: "inherit",
                             outline: "none", boxSizing: "border-box", background: "white" }}>
                    <option value="sqft">sqft</option>
                    <option value="lump_sum">{t("common.lump_sum")}</option>
                    <option value="rft">rft</option>
                    <option value="nos">nos</option>
                    <option value="cubic_ft">{t("common.cubic_ft")}</option>
                  </select>
                </div>
              </div>
              {/* Per-item qty toggle — when ON, each item in this
                  section has its own qty input. When OFF, all items
                  share the section's Area. Used for mixed sections
                  like "Other Civil Work" with hutment×1, TC×1,
                  fixtures×6, etc. */}
              <div style={{ padding: "10px 12px", background: addSectionForm.per_item_qty ? "#FFFBEB" : "#F9FAFB",
                            border: "1.5px solid " + (addSectionForm.per_item_qty ? "#FCD34D" : "#E5E7EB"),
                            borderRadius: 6, marginBottom: 10, cursor: "pointer", userSelect: "none" }}
                onClick={() => setAddSectionForm(p => ({ ...p, per_item_qty: !p.per_item_qty }))}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!addSectionForm.per_item_qty} onChange={() => {}}
                    style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}/>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>{t("master_library.per_item_quantity_addsectionform", { addSectionForm: addSectionForm.per_item_qty ? "(enabled)" : "(disabled — uniform area)" })}</div>
                    <div style={{ fontSize: 10.5, color: "#6B7280", marginTop: 2 }}>
                      {addSectionForm.per_item_qty
                        ? t("master_library.each_item_in_this_section_will")
                        : t("master_library.all_items_share_the_section_s_2")}
                    </div>
                  </div>
                </label>
              </div>
              <div style={{ padding: "8px 10px", background: "#F9FAFB", borderRadius: 5, fontSize: 11, color: "#6B7280" }}>
               {t("master_library.lump_sum_mixed_sections_enable_per")}
              </div>
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #E5E7EB", display: "flex", gap: 8 }}>
              <button onClick={closeAddSection} disabled={addSectionSaving}
                style={{ flex: 1, padding: "9px", borderRadius: 7, border: "1px solid #D1D5DB",
                         background: "white", fontSize: 13, color: "#374151",
                         cursor: addSectionSaving ? "not-allowed" : "pointer" }}>
               {t("common.cancel")}
              </button>
              <button onClick={saveAddSection} disabled={addSectionSaving || !addSectionForm.name?.trim()}
                style={{ flex: 2, padding: "9px", borderRadius: 7,
                         background: (addSectionSaving || !addSectionForm.name?.trim()) ? "#9CA3AF" : COL_BLUE,
                         color: "white", border: "none", fontSize: 13, fontWeight: 700,
                         cursor: (addSectionSaving || !addSectionForm.name?.trim()) ? "not-allowed" : "pointer" }}>
                {addSectionSaving ? t("common.adding") : t("common.add_section_2")}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          + ADD CATEGORY DRAWER (right slide-over, multi-checkbox)
      ═══════════════════════════════════════════════════════════════ */}
      {addCatDrawer && (() => {
        const sid = addCatDrawer.structure_id;
        const alreadyInSection = new Set(
          pkgCategories.filter(c => c.structure_id === sid).map(c => c.category_name)
        );
        return (
          <>
            <div onClick={closeAddCatDrawer}
              style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 700 }}/>
            <div onClick={e => e.stopPropagation()}
              style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(380px,95vw)",
                       background: "white", zIndex: 701, boxShadow: "-12px 0 32px rgba(0,0,0,0.15)",
                       display: "flex", flexDirection: "column" }}>
              <div style={{ background: COL_DARK, padding: "13px 16px", color: "white",
                            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t("common.add_category_2")}</div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{t("master_library.section_section_name", { section_name: addCatDrawer.section_name })}</div>
                </div>
                <button onClick={closeAddCatDrawer}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)",
                           fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
                {workCats.map(c => {
                  const exists = alreadyInSection.has(c.name);
                  const pickIdx = addCatPicks.indexOf(c.id);
                  const isPicked = pickIdx >= 0;
                  return (
                    <label key={c.id}
                      style={{ display: "flex", alignItems: "center", gap: 10,
                               padding: "9px 10px", borderRadius: 6,
                               cursor: exists ? "not-allowed" : "pointer",
                               background: exists ? "#F3F4F6" : (isPicked ? "#EFF6FF" : "white"),
                               border: "1px solid " + (isPicked ? "#BFDBFE" : "#E5E7EB"),
                               marginBottom: 5, opacity: exists ? 0.55 : 1 }}>
                      <input type="checkbox" disabled={exists} checked={isPicked}
                        onChange={() => toggleCatPick(c.id)}
                        style={{ width: 16, height: 16 }}/>
                      {/* Pick-order badge — first tick = 1, second tick = 2, ... */}
                      {isPicked && (
                        <span title={t("master_library.pick_order_this_is_the_position")}
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                                   width: 20, height: 20, borderRadius: "50%", background: "#2563EB",
                                   color: "white", fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
                          {pickIdx + 1}
                        </span>
                      )}
                      <span style={{ flex: 1 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0F172A" }}>{c.name}</span>
                        {c.code && <code style={{ marginLeft: 6, fontSize: 10, color: "#7C3AED",
                                                  background: "#EDE9FE", padding: "1px 6px", borderRadius: 3 }}>{c.code}</code>}
                        {exists && <span style={{ marginLeft: 8, fontSize: 10, color: "#9CA3AF" }}>{t("common.already_added")}</span>}
                      </span>
                    </label>
                  );
                })}

                {/* + Create new */}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #E5E7EB" }}>
                  {addCatNewForm === null ? (
                    <button onClick={() => setAddCatNewForm({ name: "", code: "", desc: "" })}
                      style={{ width: "100%", padding: "8px 12px", background: "#F0FDF4",
                               border: "1px dashed " + COL_GREEN, color: COL_GREEN,
                               borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                     {t("common.create_new_category")}
                    </button>
                  ) : (
                    <div style={{ padding: 10, background: "#F9FAFB", borderRadius: 6, border: "1px solid #E5E7EB" }}>
                      <input autoFocus value={addCatNewForm.name}
                        onChange={e => setAddCatNewForm(p => ({ ...p, name: e.target.value }))}
                        placeholder={t("master_library.name_e_g_electrical")}
                        style={{ width: "100%", padding: "6px 9px", borderRadius: 5,
                                 border: "1.5px solid #D1D5DB", fontSize: 12, marginBottom: 6,
                                 outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                      <input value={addCatNewForm.code}
                        onChange={e => setAddCatNewForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        placeholder={t("common.code_optional")}
                        style={{ width: "100%", padding: "6px 9px", borderRadius: 5,
                                 border: "1.5px solid #D1D5DB", fontSize: 12, marginBottom: 6,
                                 outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                      <input value={addCatNewForm.desc}
                        onChange={e => setAddCatNewForm(p => ({ ...p, desc: e.target.value }))}
                        placeholder={t("master_library.description_optional")}
                        style={{ width: "100%", padding: "6px 9px", borderRadius: 5,
                                 border: "1.5px solid #D1D5DB", fontSize: 12, marginBottom: 8,
                                 outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setAddCatNewForm(null)}
                          style={{ flex: 1, padding: 6, borderRadius: 5, background: "white",
                                   border: "1px solid #D1D5DB", fontSize: 11.5, color: "#6B7280", cursor: "pointer" }}>
                         {t("common.cancel")}
                        </button>
                        <button onClick={createAndAddCat}
                          disabled={addCatSaving || !addCatNewForm.name?.trim()}
                          style={{ flex: 2, padding: 6, borderRadius: 5,
                                   background: (addCatSaving || !addCatNewForm.name?.trim()) ? "#9CA3AF" : COL_GREEN,
                                   color: "white", border: "none", fontSize: 11.5, fontWeight: 700,
                                   cursor: (addCatSaving || !addCatNewForm.name?.trim()) ? "not-allowed" : "pointer" }}>
                          {addCatSaving ? t("common.saving_2") : t("common.create_add")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ padding: "12px 14px", borderTop: "1px solid #E5E7EB", display: "flex", gap: 8 }}>
                <button onClick={closeAddCatDrawer} disabled={addCatSaving}
                  style={{ flex: 1, padding: "8px", borderRadius: 6, border: "1px solid #D1D5DB",
                           background: "white", fontSize: 12, color: "#374151",
                           cursor: addCatSaving ? "not-allowed" : "pointer" }}>
                 {t("common.cancel")}
                </button>
                <button onClick={confirmAddCats} disabled={addCatSaving}
                  style={{ flex: 2, padding: "8px", borderRadius: 6,
                           background: addCatSaving ? "#9CA3AF" : COL_BLUE,
                           color: "white", border: "none", fontSize: 12, fontWeight: 700,
                           cursor: addCatSaving ? "not-allowed" : "pointer" }}>
                  {addCatSaving ? t("common.adding") : `Add Selected (${addCatPicks.length})`}
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════
          + ADD ITEM DRAWER (right slide-over, items grouped by category)
          IMPORTANT: target category_id comes from drawer's footer click,
          NOT from boq_items.category. Same item can be added to different
          target categories across sections.
      ═══════════════════════════════════════════════════════════════ */}
      {addItemDrawer && (() => {
        const sid       = addItemDrawer.structure_id;
        const alreadyHere = new Set([
          ...(sectionItems[sid] || []).map(r => r.item_id),
          ...(pendingNewItems[sid] || []).map(r => r.item_id),
        ]);
        const q = addItemSearch.trim().toLowerCase();
        const filtered = boqItems.filter(i =>
          !q || i.name.toLowerCase().includes(q) || (i.category || "").toLowerCase().includes(q)
        );
        const grouped = filtered.reduce((acc, i) => {
          const k = i.category || "Uncategorized";
          (acc[k] ||= []).push(i);
          return acc;
        }, {});
        return (
          <>
            <div onClick={closeAddItemDrawer}
              style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 700 }}/>
            <div onClick={e => e.stopPropagation()}
              style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(460px,95vw)",
                       background: "white", zIndex: 701, boxShadow: "-12px 0 32px rgba(0,0,0,0.15)",
                       display: "flex", flexDirection: "column" }}>
              <div style={{ background: COL_DARK, padding: "13px 16px", color: "white",
                            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t("common.add_item_2")}</div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 1,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {addItemDrawer.section_name} › {addItemDrawer.category_name}
                  </div>
                </div>
                <button onClick={closeAddItemDrawer}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)",
                           fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
                <input value={addItemSearch}
                  onChange={e => setAddItemSearch(e.target.value)}
                  placeholder={t("master_library.search_items_by_name_or_category")}
                  style={{ width: "100%", padding: "7px 11px", borderRadius: 6,
                           border: "1.5px solid #E5E7EB", fontSize: 12.5, outline: "none",
                           fontFamily: "inherit", boxSizing: "border-box" }}/>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                {Object.entries(grouped).sort((a,b) => a[0].localeCompare(b[0])).map(([catName, items]) => (
                  <div key={catName} style={{ marginBottom: 4 }}>
                    <div style={{ padding: "6px 14px", fontSize: 10.5, fontWeight: 700,
                                  color: "#6B7280", textTransform: "uppercase",
                                  background: "#F3F4F6", letterSpacing: ".4px" }}>
                      {catName} <span style={{ color: "#9CA3AF" }}>· {items.length}</span>
                    </div>
                    {items.map(i => {
                      const here = alreadyHere.has(i.id);
                      const pickIdx = addItemPicks.indexOf(i.id);
                      const isPicked = pickIdx >= 0;
                      return (
                        <label key={i.id}
                          style={{ display: "flex", alignItems: "center", gap: 10,
                                   padding: "8px 14px", cursor: here ? "not-allowed" : "pointer",
                                   background: here ? "#F9FAFB" : (isPicked ? "#EFF6FF" : "white"),
                                   borderBottom: "1px solid #F3F4F6",
                                   opacity: here ? 0.55 : 1 }}>
                          <input type="checkbox" disabled={here} checked={isPicked}
                            onChange={() => toggleItemPick(i.id)}
                            style={{ width: 16, height: 16 }}/>
                          {/* Pick-order badge */}
                          {isPicked && (
                            <span title={t("master_library.pick_order_this_is_the_position_2")}
                              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                                       width: 20, height: 20, borderRadius: "50%", background: "#2563EB",
                                       color: "white", fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
                              {pickIdx + 1}
                            </span>
                          )}
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0F172A" }}>
                              {i.name}
                              {here && <span style={{ marginLeft: 8, fontSize: 10, color: "#9CA3AF" }}>{t("common.already_here")}</span>}
                            </div>
                            <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 1 }}>{t("master_library.base_rs_inr_unit", { inr: inr(i.base_rate), unit: i.unit })}</div>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))}

                {/* + Create new item */}
                <div style={{ padding: "12px 14px", borderTop: "1px dashed #E5E7EB", marginTop: 8 }}>
                  {addItemNewForm === null ? (
                    <button onClick={() => setAddItemNewForm({ name: "", unit: uomOptions[0] || "Sq.Ft",
                                                              category: addItemDrawer.category_name, base_rate: 0 })}
                      style={{ width: "100%", padding: "8px 12px", background: "#F0FDF4",
                               border: "1px dashed " + COL_GREEN, color: COL_GREEN,
                               borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                     {t("common.create_new_item")}
                    </button>
                  ) : (
                    <div style={{ padding: 10, background: "#F9FAFB", borderRadius: 6, border: "1px solid #E5E7EB" }}>
                      <input autoFocus value={addItemNewForm.name}
                        onChange={e => setAddItemNewForm(p => ({ ...p, name: e.target.value }))}
                        placeholder={t("common.item_name")}
                        style={{ width: "100%", padding: "6px 9px", borderRadius: 5,
                                 border: "1.5px solid #D1D5DB", fontSize: 12, marginBottom: 6,
                                 outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                        <select value={addItemNewForm.unit}
                          onChange={e => setAddItemNewForm(p => ({ ...p, unit: e.target.value }))}
                          style={{ width: "100%", padding: "6px 9px", borderRadius: 5,
                                   border: "1.5px solid #D1D5DB", fontSize: 12,
                                   outline: "none", fontFamily: "inherit", background: "white", boxSizing: "border-box" }}>
                          {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select value={addItemNewForm.category}
                          onChange={e => setAddItemNewForm(p => ({ ...p, category: e.target.value }))}
                          style={{ width: "100%", padding: "6px 9px", borderRadius: 5,
                                   border: "1.5px solid #D1D5DB", fontSize: 12,
                                   outline: "none", fontFamily: "inherit", background: "white", boxSizing: "border-box" }}>
                          {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <input type="number" value={addItemNewForm.base_rate}
                        onChange={e => setAddItemNewForm(p => ({ ...p, base_rate: e.target.value }))}
                        placeholder={t("common.base_rate")}
                        style={{ width: "100%", padding: "6px 9px", borderRadius: 5,
                                 border: "1.5px solid #D1D5DB", fontSize: 12, marginBottom: 8,
                                 outline: "none", fontFamily: "inherit", boxSizing: "border-box", textAlign: "right" }}/>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setAddItemNewForm(null)}
                          style={{ flex: 1, padding: 6, borderRadius: 5, background: "white",
                                   border: "1px solid #D1D5DB", fontSize: 11.5, color: "#6B7280", cursor: "pointer" }}>
                         {t("common.cancel")}
                        </button>
                        <button onClick={createAndAddItem}
                          disabled={addItemSaving || !addItemNewForm.name?.trim()}
                          style={{ flex: 2, padding: 6, borderRadius: 5,
                                   background: (addItemSaving || !addItemNewForm.name?.trim()) ? "#9CA3AF" : COL_GREEN,
                                   color: "white", border: "none", fontSize: 11.5, fontWeight: 700,
                                   cursor: (addItemSaving || !addItemNewForm.name?.trim()) ? "not-allowed" : "pointer" }}>
                          {addItemSaving ? t("common.saving_2") : t("master_library.create_add_to_this_section")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ padding: "12px 14px", borderTop: "1px solid #E5E7EB", display: "flex", gap: 8 }}>
                <button onClick={closeAddItemDrawer}
                  style={{ flex: 1, padding: "8px", borderRadius: 6, border: "1px solid #D1D5DB",
                           background: "white", fontSize: 12, color: "#374151", cursor: "pointer" }}>
                 {t("common.cancel")}
                </button>
                <button onClick={confirmAddItems}
                  style={{ flex: 2, padding: "8px", borderRadius: 6,
                           background: COL_BLUE, color: "white", border: "none",
                           fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{t("master_library.add_selected_additempicks", { addItemPicks: addItemPicks.length })}</button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════
          PACKAGE EDIT DRAWER (right slide-over, ~640px)
            Tier A — Package basics (name + sqft_rate + description)
            Tier B — Sections in this package
                       • inline rename + area edit
                       • per-category rename (section-scoped, rate_package_categories)
                       • per-item master edits (boq_items: name/unit/base_rate)
                       • soft-delete item from master library
            Save All — Promise.allSettled across all dirty staged edits.
      ═══════════════════════════════════════════════════════════════ */}
      {pkgDrawer && (
        <>
          <div onClick={closePkgDrawer}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 700 }}/>
          <div onClick={e => e.stopPropagation()}
            style={{ position: "fixed", top: 0, right: 0, bottom: 0,
                     width: "min(640px,95vw)", background: "white", zIndex: 701,
                     boxShadow: "-12px 0 32px rgba(0,0,0,0.18)",
                     display: "flex", flexDirection: "column" }}>
            {/* Dark header */}
            <div style={{ background: COL_DARK, padding: "13px 18px", color: "white",
                          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("master_library.edit_package_name", { name: pkgDrawer.name })}</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{t("master_library.name_package_id", { name: selType?.name, id: pkgDrawer.id })}{pkgHasChanged && <span style={{ marginLeft: 8, color: "#FCD34D", fontWeight: 600 }}>{t("master_library.unsaved")}</span>}
                </div>
              </div>
              <button onClick={closePkgDrawer} disabled={pkgSaving}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)",
                         fontSize: 22, cursor: pkgSaving ? "not-allowed" : "pointer", lineHeight: 1 }}>×</button>
            </div>

            {/* Body — scrolling */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>

              {/* ── TIER A: PACKAGE BASICS ── */}
              <div style={{ marginBottom: 18, padding: 14,
                            border: "1px solid #E5E7EB", borderRadius: 8, background: "#FAFBFC" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#6B7280",
                              textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 10 }}>
                 {t("master_library.1_package_basics")}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 3, textTransform: "uppercase" }}>{t("common.name")}</label>
                  <input value={pkgDraft.name || ""}
                    onChange={e => setPkgDraft(p => ({ ...p, name: e.target.value }))}
                    style={{ width: "100%", padding: "8px 11px", borderRadius: 6,
                             border: "1.5px solid #D1D5DB", fontSize: 13, fontFamily: "inherit",
                             outline: "none", boxSizing: "border-box" }}/>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 3, textTransform: "uppercase" }}>{t("master_library.per_sqft_rate_rs")}</label>
                    <input type="number" value={pkgDraft.sqft_rate ?? 0}
                      onChange={e => setPkgDraft(p => ({ ...p, sqft_rate: e.target.value }))}
                      style={{ width: "100%", padding: "8px 11px", borderRadius: 6,
                               border: "1.5px solid #D1D5DB", fontSize: 13, fontFamily: "inherit",
                               outline: "none", boxSizing: "border-box", textAlign: "right" }}/>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 3, textTransform: "uppercase" }}>{t("common.description")}</label>
                    <input value={pkgDraft.description || ""}
                      onChange={e => setPkgDraft(p => ({ ...p, description: e.target.value }))}
                      placeholder={t("common.optional")}
                      style={{ width: "100%", padding: "8px 11px", borderRadius: 6,
                               border: "1.5px solid #D1D5DB", fontSize: 13, fontFamily: "inherit",
                               outline: "none", boxSizing: "border-box" }}/>
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: "#9CA3AF", fontStyle: "italic" }}>
                 {t("master_library.per_sqft_rate_is_informational_on")}
                </div>
              </div>

              {/* ── TIER B: SECTIONS ── */}
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#6B7280",
                            textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8, marginTop: 4 }}>
               {t("master_library.2_sections_categories_items")}
              </div>

              {pkgStructures.length === 0 && (
                <div style={{ padding: "18px 12px", textAlign: "center", color: "#9CA3AF",
                              fontSize: 12.5, border: "1px dashed #E5E7EB", borderRadius: 8 }}>
                 {t("master_library.no_sections_in_this_package_yet_2")}
                </div>
              )}

              {pkgStructures.map(sec => {
                const collapsed = !!pkgCollapsedSecs[sec.id];
                const cats = pkgCategories
                  .filter(c => c.structure_id === sec.id)
                  .sort((a,b) => (a.sort_order||0) - (b.sort_order||0) || a.id - b.id);
                const secNameVal = pkgGetSecName(sec);
                const secAreaVal = pkgGetSecArea(sec);
                const secDirty   = !!pkgSecEdits[sec.id];
                return (
                  <div key={sec.id}
                    style={{ marginBottom: 12, border: "1px solid #E5E7EB", borderRadius: 8,
                             overflow: "hidden",
                             boxShadow: secDirty ? "0 0 0 2px #FCD34D" : "none" }}>
                    {/* Section header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8,
                                  padding: "8px 12px", background: COL_DARK2, color: "white" }}>
                      <span onClick={() => setPkgCollapsedSecs(p => ({ ...p, [sec.id]: !p[sec.id] }))}
                        style={{ cursor: "pointer", display: "flex" }}>
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                             stroke="rgba(255,255,255,0.55)" strokeWidth={2.5}
                             style={{ transition: "transform .15s", transform: collapsed ? "rotate(0deg)" : "rotate(90deg)" }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </span>
                      <input value={secNameVal}
                        onChange={e => pkgPatchSec(sec.id, { name: e.target.value })}
                        style={{ flex: 1, padding: "5px 9px", fontSize: 12.5, fontWeight: 700,
                                 borderRadius: 5,
                                 border: "1.5px solid " + (pkgSecEdits[sec.id]?.name !== undefined ? COL_AMBER : "rgba(255,255,255,0.18)"),
                                 background: pkgSecEdits[sec.id]?.name !== undefined ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.08)",
                                 color: "white", outline: "none", fontFamily: "inherit" }}/>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{t("common.area")}</span>
                      <input type="number" value={secAreaVal}
                        onChange={e => pkgPatchSec(sec.id, { default_qty: e.target.value })}
                        style={{ width: 80, padding: "5px 8px", borderRadius: 5, textAlign: "right",
                                 fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                                 border: "1.5px solid " + (pkgSecEdits[sec.id]?.default_qty !== undefined ? COL_AMBER : "rgba(255,255,255,0.18)"),
                                 background: pkgSecEdits[sec.id]?.default_qty !== undefined ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.08)",
                                 color: "white", outline: "none" }}/>
                    </div>

                    {/* Categories + items */}
                    {!collapsed && (
                      <div style={{ padding: 10 }}>
                        {cats.length === 0 && (
                          <div style={{ padding: "12px", textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>
                           {t("master_library.no_categories_in_this_section")}
                          </div>
                        )}
                        {cats.map(cat => {
                          // Items currently in this (section, category) from the
                          // saved sectionItems map. Pending-new items from the BOQ
                          // tree are NOT shown here (drawer = edit-existing-only).
                          const rows = (sectionItems[sec.id] || [])
                            .filter(r => Number(r.category_id) === Number(cat.id));
                          const catNameVal = pkgGetCatName(cat);
                          const catDirty = pkgCatRenames[cat.id] !== undefined;
                          return (
                            <div key={cat.id}
                              style={{ marginBottom: 10, border: "1px solid #E5E7EB",
                                       borderRadius: 6, overflow: "hidden",
                                       boxShadow: catDirty ? "0 0 0 1px #FCD34D" : "none" }}>
                              {/* Category header — inline rename */}
                              <div style={{ padding: "7px 10px", background: COL_CAT_BG,
                                            display: "flex", alignItems: "center", gap: 8,
                                            borderBottom: "1px solid #E5E7EB" }}>
                                <input value={catNameVal}
                                  onChange={e => setPkgCatRenames(p => ({ ...p, [cat.id]: e.target.value }))}
                                  title={t("master_library.section_scoped_rename_only_this_package")}
                                  style={{ flex: 1, padding: "4px 8px", fontSize: 12, fontWeight: 700,
                                           borderRadius: 4,
                                           border: "1.5px solid " + (catDirty ? COL_AMBER : "#CBD5E1"),
                                           background: catDirty ? "#FFFBEB" : "white",
                                           outline: "none", fontFamily: "inherit",
                                           color: "#0F172A" }}/>
                                <span style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: 500 }}>
                                  · {rows.length} item{rows.length === 1 ? "" : "s"}
                                </span>
                              </div>

                              {/* Items — master edit */}
                              {rows.length === 0 ? (
                                <div style={{ padding: "10px", textAlign: "center", color: "#9CA3AF", fontSize: 11.5 }}>
                                 {t("common.no_items")}
                                </div>
                              ) : (
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                  <thead>
                                    <tr style={{ background: "#FAFAFA" }}>
                                      <th style={{ padding: "6px 10px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>{t("master_library.item_name_2")}</th>
                                      <th style={{ padding: "6px 10px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", width: 90 }}>{t("common.unit")}</th>
                                      <th style={{ padding: "6px 10px", textAlign: "right", fontSize: 9.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", width: 90 }}>{t("master_library.master_base")}</th>
                                      <th style={{ width: 36 }}/>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.map(r => {
                                      const it = pkgGetItem(r.item_id);
                                      if (!it) return null;
                                      const deleted = !!pkgDeletedItems[r.item_id];
                                      const ed = pkgItemEdits[r.item_id] || {};
                                      const itemDirty = Object.keys(ed).length > 0;
                                      return (
                                        <tr key={r.item_id}
                                          style={{ background: deleted ? "#FEF2F2" : "white",
                                                   opacity: deleted ? 0.55 : 1,
                                                   borderBottom: "1px solid #F3F4F6" }}>
                                          <td style={{ padding: "5px 10px" }}>
                                            <input value={it.name}
                                              onChange={e => pkgPatchItem(r.item_id, { name: e.target.value })}
                                              disabled={deleted}
                                              style={{ width: "100%", padding: "4px 7px", borderRadius: 4,
                                                       border: "1.5px solid " + (ed.name !== undefined ? COL_AMBER : "#E5E7EB"),
                                                       background: ed.name !== undefined ? "#FFFBEB" : "white",
                                                       fontSize: 12, outline: "none", fontFamily: "inherit",
                                                       boxSizing: "border-box",
                                                       textDecoration: deleted ? "line-through" : "none" }}/>
                                          </td>
                                          <td style={{ padding: "5px 10px" }}>
                                            <select value={it.unit || ""}
                                              onChange={e => pkgPatchItem(r.item_id, { unit: e.target.value })}
                                              disabled={deleted}
                                              style={{ width: "100%", padding: "4px 7px", borderRadius: 4,
                                                       border: "1.5px solid " + (ed.unit !== undefined ? COL_AMBER : "#E5E7EB"),
                                                       background: ed.unit !== undefined ? "#FFFBEB" : "white",
                                                       fontSize: 12, outline: "none", fontFamily: "inherit",
                                                       boxSizing: "border-box" }}>
                                              {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                          </td>
                                          <td style={{ padding: "5px 10px", textAlign: "right" }}>
                                            <input type="number" value={it.base_rate ?? 0}
                                              onChange={e => pkgPatchItem(r.item_id, { base_rate: e.target.value })}
                                              disabled={deleted}
                                              style={{ width: "100%", padding: "4px 7px", borderRadius: 4,
                                                       border: "1.5px solid " + (ed.base_rate !== undefined ? COL_AMBER : "#E5E7EB"),
                                                       background: ed.base_rate !== undefined ? "#FFFBEB" : "white",
                                                       fontSize: 12, textAlign: "right", outline: "none",
                                                       fontFamily: "inherit", boxSizing: "border-box",
                                                       fontWeight: ed.base_rate !== undefined ? 700 : 500,
                                                       color: ed.base_rate !== undefined ? "#92400E" : "#0F172A" }}/>
                                          </td>
                                          <td style={{ padding: "5px 6px", textAlign: "center" }}>
                                            <button onClick={() => pkgToggleDelete(r.item_id)}
                                              title={deleted ? t("master_library.undo_delete") : t("master_library.delete_from_master_library")}
                                              style={{ background: deleted ? COL_RED : "transparent",
                                                       color: deleted ? "white" : COL_RED,
                                                       border: deleted ? "none" : "1px solid #FCA5A5",
                                                       borderRadius: 4,
                                                       fontSize: 11, fontWeight: 700, padding: "3px 7px",
                                                       cursor: "pointer", lineHeight: 1 }}>
                                              {deleted ? "↺" : "×"}
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{ padding: "8px 10px", background: "#FFFBEB", border: "1px dashed #FCD34D",
                            borderRadius: 6, fontSize: 11, color: "#92400E", marginTop: 4 }}><Rich k="master_library.item_rename_unit_base_rate_edits" params={{ t: t("master_library.master_library"), t2: t("master_library.every_package_using_this_item_sees") }} /></div>

              {/* ── DANGER ZONE — Delete Package ───────────────────────
                  Two-step type-to-confirm guard so a stray click can't
                  nuke the whole package + its sections + items. Backend
                  cascades the soft-delete to structures/categories/pcr. */}
              <div style={{ marginTop: 18, padding: 14, background: "#FEF2F2",
                            border: "1.5px solid #FCA5A5", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#991B1B", textTransform: "uppercase", letterSpacing: ".4px" }}>
                     {t("common.danger_zone")}
                    </div>
                    <div style={{ fontSize: 11, color: "#7F1D1D", marginTop: 3 }}>
                     {t("master_library.delete_this_package_and_all_its")}
                    </div>
                  </div>
                  {!pkgDangerOpen && (
                    <button onClick={() => { setPkgDangerOpen(true); setPkgDeleteText(""); }}
                      disabled={pkgSaving || pkgDeleting}
                      style={{ padding: "7px 14px", borderRadius: 6, background: "white", border: "1.5px solid #DC2626",
                               color: "#DC2626", fontSize: 12, fontWeight: 700,
                               cursor: (pkgSaving || pkgDeleting) ? "not-allowed" : "pointer" }}>
                     {t("master_library.delete_package")}
                    </button>
                  )}
                </div>
                {pkgDangerOpen && (
                  <div style={{ marginTop: 12, padding: 12, background: "white", border: "1px solid #FECACA", borderRadius: 6 }}>
                    <div style={{ fontSize: 11.5, color: "#7F1D1D", marginBottom: 6, lineHeight: 1.45 }}>
                     {t("master_library.to_confirm_type")} <strong>{pkgDrawer.name}</strong> {t("master_library.below")}
                    </div>
                    <input value={pkgDeleteText}
                      onChange={e => setPkgDeleteText(e.target.value)}
                      placeholder={pkgDrawer.name}
                      autoFocus
                      style={{ width: "100%", padding: "8px 11px", borderRadius: 6,
                               border: "1.5px solid #FCA5A5", background: "#FEF2F2",
                               fontSize: 13, fontFamily: "inherit", outline: "none",
                               boxSizing: "border-box", color: "#7F1D1D", marginBottom: 10 }}/>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setPkgDangerOpen(false); setPkgDeleteText(""); }}
                        disabled={pkgDeleting}
                        style={{ flex: 1, padding: "8px", borderRadius: 5, background: "white",
                                 border: "1px solid #D1D5DB", fontSize: 12, color: "#374151",
                                 cursor: pkgDeleting ? "not-allowed" : "pointer" }}>
                       {t("common.cancel")}
                      </button>
                      <button onClick={deletePackage}
                        disabled={pkgDeleting || pkgDeleteText.trim() !== pkgDrawer.name}
                        style={{ flex: 2, padding: "8px", borderRadius: 5,
                                 background: (pkgDeleting || pkgDeleteText.trim() !== pkgDrawer.name) ? "#FCA5A5" : "#DC2626",
                                 color: "white", border: "none", fontSize: 12, fontWeight: 700,
                                 cursor: (pkgDeleting || pkgDeleteText.trim() !== pkgDrawer.name) ? "not-allowed" : "pointer" }}>
                        {pkgDeleting ? t("common.deleting_2") : t("master_library.i_understand_delete_this_package")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #E5E7EB",
                          display: "flex", gap: 8, background: "#F9FAFB" }}>
              <button onClick={closePkgDrawer} disabled={pkgSaving}
                style={{ flex: 1, padding: "9px", borderRadius: 6, border: "1px solid #D1D5DB",
                         background: "white", fontSize: 13, color: "#374151",
                         cursor: pkgSaving ? "not-allowed" : "pointer" }}>
               {t("common.cancel")}
              </button>
              <button onClick={savePackageEdit}
                disabled={pkgSaving || !pkgHasChanged || !pkgDraft.name?.trim()}
                style={{ flex: 2, padding: "9px", borderRadius: 6,
                         background: (pkgSaving || !pkgHasChanged || !pkgDraft.name?.trim()) ? "#9CA3AF" : COL_BLUE,
                         color: "white", border: "none", fontSize: 13, fontWeight: 700,
                         cursor: (pkgSaving || !pkgHasChanged || !pkgDraft.name?.trim()) ? "not-allowed" : "pointer" }}>
                {pkgSaving ? t("master_library.saving_all") : t("master_library.save_all")}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ADD TYPE / CITY / PACKAGE MODAL (existing simple modal, kept)
      ═══════════════════════════════════════════════════════════════ */}
      {addModal && (
        <>
          <div 
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 600 }}/>
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                        width: "min(440px,95vw)", background: "white", borderRadius: 12, zIndex: 601,
                        boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #E5E7EB",
                          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
                {addModal === "type" ? t("master_library.new_construction_type")
                 : addModal === "city" ? t("master_library.new_city_2")
                 : (addForm._editingId ? t("common.edit_package_2") : t("master_library.new_package_2"))}
              </div>
              <button onClick={() => setAddModal(null)}
                style={{ background: "none", border: "none", fontSize: 18, color: "#6B7280", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <input autoFocus value={addForm.name || ""}
                onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                placeholder={t("common.name_2")}
                style={{ width: "100%", padding: "9px 11px", borderRadius: 7,
                         border: "1.5px solid #D1D5DB", fontSize: 13, fontFamily: "inherit",
                         outline: "none", boxSizing: "border-box", marginBottom: 10 }}/>
              {addModal === "pkg" && (
                <input type="number" value={addForm.sqft_rate || ""}
                  onChange={e => setAddForm(p => ({ ...p, sqft_rate: e.target.value }))}
                  placeholder={t("master_library.per_sqft_rate_informational")}
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 7,
                           border: "1.5px solid #D1D5DB", fontSize: 13, fontFamily: "inherit",
                           outline: "none", boxSizing: "border-box", marginBottom: 10 }}/>
              )}
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #E5E7EB", display: "flex", gap: 8 }}>
              <button onClick={() => setAddModal(null)}
                style={{ flex: 1, padding: "9px", borderRadius: 7, border: "1px solid #D1D5DB",
                         background: "white", fontSize: 13, color: "#374151", cursor: "pointer" }}>
               {t("common.cancel")}
              </button>
              <button onClick={handleAdd} disabled={adding}
                style={{ flex: 2, padding: "9px", borderRadius: 7,
                         background: adding ? "#9CA3AF" : COL_BLUE,
                         color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {adding ? t("common.saving_2") : t("common.save")}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          Empty state — package not selected
      ───────────────────────────────────────────────────────────── */}
      {!selPkg && selType && selCity && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>
         {t("master_library.pick_a_package_above_to_start")}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          EDIT CONSTRUCTION TYPE modal — rename, recolor, danger-zone delete
      ═══════════════════════════════════════════════════════════════ */}
      {typeEdit && (
        <>
          <div onClick={closeTypeEdit}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 720 }}/>
          <div onClick={e => e.stopPropagation()}
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                     width: "min(460px,95vw)", background: "white", borderRadius: 12, zIndex: 721,
                     boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
            <div style={{ background: COL_DARK, padding: "13px 18px", borderRadius: "12px 12px 0 0",
                          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{t("master_library.edit_construction_type_2")}</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{typeEdit.name}</div>
              </div>
              <button onClick={closeTypeEdit} disabled={typeSaving}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 22, cursor: typeSaving ? "not-allowed" : "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4, textTransform: "uppercase" }}>{t("common.name")}</label>
                <input autoFocus value={typeForm.name || ""}
                  onChange={e => setTypeForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 7, border: "1.5px solid #D1D5DB", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}/>
              </div>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4, textTransform: "uppercase" }}>{t("master_library.color")}</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setTypeForm(p => ({ ...p, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: "pointer",
                               border: "3px solid " + (typeForm.color === c ? "#0F172A" : "transparent") }}/>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <div style={{ marginTop: 18, padding: 12, background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#991B1B", textTransform: "uppercase", letterSpacing: ".4px" }}>{t("common.danger_zone")}</div>
                    <div style={{ fontSize: 10.5, color: "#7F1D1D", marginTop: 2 }}>
                     {t("master_library.delete_this_construction_type_packages_tied")}
                    </div>
                  </div>
                  {!typeDangerOpen && (
                    <button onClick={() => { setTypeDangerOpen(true); setTypeDeleteText(""); }}
                      disabled={typeSaving}
                      style={{ padding: "6px 12px", borderRadius: 5, background: "white", border: "1.5px solid #DC2626", color: "#DC2626", fontSize: 11.5, fontWeight: 700, cursor: typeSaving ? "not-allowed" : "pointer" }}>
                     {t("master_library.delete")}
                    </button>
                  )}
                </div>
                {typeDangerOpen && (
                  <div style={{ marginTop: 10, padding: 10, background: "white", border: "1px solid #FECACA", borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: "#7F1D1D", marginBottom: 5 }}>
                     {t("common.type")} <strong>{typeEdit.name}</strong> {t("master_library.to_confirm")}
                    </div>
                    <input value={typeDeleteText}
                      onChange={e => setTypeDeleteText(e.target.value)}
                      placeholder={typeEdit.name} autoFocus
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: "1.5px solid #FCA5A5", background: "#FEF2F2", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#7F1D1D", marginBottom: 8 }}/>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setTypeDangerOpen(false); setTypeDeleteText(""); }}
                        disabled={typeSaving}
                        style={{ flex: 1, padding: 6, borderRadius: 5, background: "white", border: "1px solid #D1D5DB", fontSize: 11.5, color: "#374151", cursor: typeSaving ? "not-allowed" : "pointer" }}>
                       {t("common.cancel")}
                      </button>
                      <button onClick={deleteType}
                        disabled={typeSaving || typeDeleteText.trim() !== typeEdit.name}
                        style={{ flex: 2, padding: 6, borderRadius: 5,
                                 background: (typeSaving || typeDeleteText.trim() !== typeEdit.name) ? "#FCA5A5" : "#DC2626",
                                 color: "white", border: "none", fontSize: 11.5, fontWeight: 700,
                                 cursor: (typeSaving || typeDeleteText.trim() !== typeEdit.name) ? "not-allowed" : "pointer" }}>
                        {typeSaving ? t("common.deleting_2") : t("master_library.delete_construction_type")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #E5E7EB", display: "flex", gap: 8, background: "#F9FAFB" }}>
              <button onClick={closeTypeEdit} disabled={typeSaving}
                style={{ flex: 1, padding: "9px", borderRadius: 7, border: "1px solid #D1D5DB", background: "white", fontSize: 13, color: "#374151", cursor: typeSaving ? "not-allowed" : "pointer" }}>
               {t("common.cancel")}
              </button>
              <button onClick={saveTypeEdit} disabled={typeSaving || !typeForm.name?.trim()}
                style={{ flex: 2, padding: "9px", borderRadius: 7,
                         background: (typeSaving || !typeForm.name?.trim()) ? "#9CA3AF" : COL_BLUE,
                         color: "white", border: "none", fontSize: 13, fontWeight: 700,
                         cursor: (typeSaving || !typeForm.name?.trim()) ? "not-allowed" : "pointer" }}>
                {typeSaving ? t("common.saving_2") : t("common.save")}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          EDIT CITY modal — rename, state, danger-zone delete
      ═══════════════════════════════════════════════════════════════ */}
      {cityEdit && (
        <>
          <div onClick={closeCityEdit}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 720 }}/>
          <div onClick={e => e.stopPropagation()}
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                     width: "min(460px,95vw)", background: "white", borderRadius: 12, zIndex: 721,
                     boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
            <div style={{ background: COL_DARK, padding: "13px 18px", borderRadius: "12px 12px 0 0",
                          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{t("master_library.edit_city_2")}</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{cityEdit.name}</div>
              </div>
              <button onClick={closeCityEdit} disabled={citySaving}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 22, cursor: citySaving ? "not-allowed" : "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4, textTransform: "uppercase" }}>{t("common.name")}</label>
                <input autoFocus value={cityForm.name || ""}
                  onChange={e => setCityForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 7, border: "1.5px solid #D1D5DB", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}/>
              </div>
              <div>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4, textTransform: "uppercase" }}>{t("master_library.state")}</label>
                <input value={cityForm.state || ""}
                  onChange={e => setCityForm(p => ({ ...p, state: e.target.value }))}
                  placeholder={t("master_library.chhattisgarh")}
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 7, border: "1.5px solid #D1D5DB", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}/>
              </div>

              {/* Danger zone */}
              <div style={{ marginTop: 18, padding: 12, background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#991B1B", textTransform: "uppercase", letterSpacing: ".4px" }}>{t("common.danger_zone")}</div>
                    <div style={{ fontSize: 10.5, color: "#7F1D1D", marginTop: 2 }}>
                     {t("master_library.delete_this_city_leads_rates_tied")}
                    </div>
                  </div>
                  {!cityDangerOpen && (
                    <button onClick={() => { setCityDangerOpen(true); setCityDeleteText(""); }}
                      disabled={citySaving}
                      style={{ padding: "6px 12px", borderRadius: 5, background: "white", border: "1.5px solid #DC2626", color: "#DC2626", fontSize: 11.5, fontWeight: 700, cursor: citySaving ? "not-allowed" : "pointer" }}>
                     {t("master_library.delete")}
                    </button>
                  )}
                </div>
                {cityDangerOpen && (
                  <div style={{ marginTop: 10, padding: 10, background: "white", border: "1px solid #FECACA", borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: "#7F1D1D", marginBottom: 5 }}>
                     {t("common.type")} <strong>{cityEdit.name}</strong> {t("master_library.to_confirm")}
                    </div>
                    <input value={cityDeleteText}
                      onChange={e => setCityDeleteText(e.target.value)}
                      placeholder={cityEdit.name} autoFocus
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: "1.5px solid #FCA5A5", background: "#FEF2F2", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#7F1D1D", marginBottom: 8 }}/>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setCityDangerOpen(false); setCityDeleteText(""); }}
                        disabled={citySaving}
                        style={{ flex: 1, padding: 6, borderRadius: 5, background: "white", border: "1px solid #D1D5DB", fontSize: 11.5, color: "#374151", cursor: citySaving ? "not-allowed" : "pointer" }}>
                       {t("common.cancel")}
                      </button>
                      <button onClick={deleteCity}
                        disabled={citySaving || cityDeleteText.trim() !== cityEdit.name}
                        style={{ flex: 2, padding: 6, borderRadius: 5,
                                 background: (citySaving || cityDeleteText.trim() !== cityEdit.name) ? "#FCA5A5" : "#DC2626",
                                 color: "white", border: "none", fontSize: 11.5, fontWeight: 700,
                                 cursor: (citySaving || cityDeleteText.trim() !== cityEdit.name) ? "not-allowed" : "pointer" }}>
                        {citySaving ? t("common.deleting_2") : t("master_library.delete_city")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #E5E7EB", display: "flex", gap: 8, background: "#F9FAFB" }}>
              <button onClick={closeCityEdit} disabled={citySaving}
                style={{ flex: 1, padding: "9px", borderRadius: 7, border: "1px solid #D1D5DB", background: "white", fontSize: 13, color: "#374151", cursor: citySaving ? "not-allowed" : "pointer" }}>
               {t("common.cancel")}
              </button>
              <button onClick={saveCityEdit} disabled={citySaving || !cityForm.name?.trim()}
                style={{ flex: 2, padding: "9px", borderRadius: 7,
                         background: (citySaving || !cityForm.name?.trim()) ? "#9CA3AF" : COL_BLUE,
                         color: "white", border: "none", fontSize: 13, fontWeight: 700,
                         cursor: (citySaving || !cityForm.name?.trim()) ? "not-allowed" : "pointer" }}>
                {citySaving ? t("common.saving_2") : t("common.save")}
              </button>
            </div>
          </div>
        </>
      )}
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
    if (!form.name.trim()) return alert(t("master_library.item_name_required"));
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
    if (!await window.confirmAsync("Delete \"" + r.name + "\" from the BOQ item library?")) return;
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
            placeholder={t("master_library.search_items_by_name_category_or")}
            style={{ flex: 1, maxWidth: 360, padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 12.5, outline: "none", fontFamily: "inherit" }}/>
          <span style={{ fontSize: 12, color: "#6B7280" }}>{filtered.length} / {rows.length} items</span>
        </div>
        <button onClick={openCreate}
          style={{ background: "#10B981", color: "white", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
         {t("common.add_item")}
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
        <div style={{ padding: "40px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>{t("common.loading_2")}</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
         {t("master_library.no_items_found_click")} <strong>{t("common.add_item")}</strong> {t("master_library.to_create_one")}
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: 10, border: "1px solid #E5E7EB", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>{t("common.item")}</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", width: 140 }}>{t("common.category")}</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", width: 80 }}>{t("common.unit")}</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", width: 120 }}>{t("master_library.base_rate")}</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>{t("common.description")}</th>
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
                  <td style={{ padding: "9px 14px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#374151" }}>{t("master_library.rs_number", { Number: Number(r.base_rate || 0).toLocaleString() })}</td>
                  <td style={{ padding: "9px 14px", fontSize: 12, color: "#6B7280" }}>{r.description || "—"}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center", whiteSpace: "nowrap" }}>
                    <button onClick={() => openEdit(r)} title={t("common.edit_2")}
                      style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", padding: 4, marginRight: 2 }}>
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => del(r)} title={t("common.delete")}
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
        <div 
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "white", borderRadius: 12, width: "min(540px, 95vw)", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
            <div style={{ background: "#0F172A", padding: "13px 18px", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{editing ? t("master_library.edit_boq_item") : t("master_library.new_boq_item")}</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{t("master_library.master_library_used_by_client_boq")}</div>
              </div>
              <button onClick={closeForm} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ gridColumn: "1 / 3" }}>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>{t("master_library.item_name")}</label>
                  <input value={form.name} onChange={e => upd("name", e.target.value)} autoFocus
                    placeholder={t("master_library.e_g_rcc_footing_m25")}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>{t("master_library.category_2")}</label>
                  <select value={form.category} onChange={e => upd("category", e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", background: "white" }}>
                    {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>{t("common.unit")}</label>
                  <select value={form.unit} onChange={e => upd("unit", e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", background: "white" }}>
                    {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>{t("master_library.base_rate_rs")}</label>
                  <input type="number" value={form.base_rate || ""} onChange={e => upd("base_rate", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>{t("master_library.description_scope")}</label>
                  <input value={form.description} onChange={e => upd("description", e.target.value)}
                    placeholder={t("common.optional")}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #E5E7EB", display: "flex", gap: 8 }}>
              <button onClick={closeForm}
                style={{ flex: 1, padding: "9px", borderRadius: 7, border: "1px solid #E5E7EB", background: "white", fontSize: 12, cursor: "pointer" }}>
               {t("common.cancel")}
              </button>
              <button onClick={save} disabled={saving || !form.name.trim()}
                style={{ flex: 2, padding: "9px", borderRadius: 7, background: (saving || !form.name.trim()) ? "#9CA3AF" : "#2563EB", color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: (saving || !form.name.trim()) ? "not-allowed" : "pointer" }}>
                {saving ? t("common.saving_2") : editing ? t("common.save_changes") : t("common.add_item_2")}
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
    { key: "role", label: t("master_library.labour_type_skill"), minW: 180, render: r => <span style={{ fontWeight: 600 }}>{r.role||r.skill}</span> },
    { key: "category", label: t("common.category"), minW: 100, render: r => { const cc = catColors[r.category] || catColors.Skilled; return <Badge text={r.category||t("master_library.skilled")} color={cc.c} bg={cc.bg} />; }},
    { key: "rate", label: t("master_library.daily_rate"), minW: 90, align: "right", render: r => <span style={{ fontWeight: 700 }}>{t("master_library.rs_r", { r: r.rate||r.dailyRate||0 })}</span> },
    { key: "overtime_rate", label: t("master_library.ot_hour"), minW: 70, align: "right", render: r => (r.overtime_rate||r.otRate)>0 ? <span style={{ fontWeight: 600, color: T.amber }}>{t("master_library.rs_otrate", { otRate: r.overtime_rate||r.otRate })}</span> : "—" },
    { key: "monthly", label: t("master_library.monthly_26d"), minW: 100, align: "right", render: r => <span style={{ fontWeight: 600, color: T.green }}>{t("master_library.rs_r", { r: ((r.rate||r.dailyRate||0) * 26).toLocaleString() })}</span> },
    { key: "description", label: t("master_library.city_area"), minW: 70, render: r => <span>{r.description||r.city||"—"}</span> },
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label={t("master_library.labour_rates")} onAdd={openCreate} addLabel="Add Labour Rate"
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? t("master_library.edit_labour_rate") : t("master_library.add_labour_rate")} width={480}>
        <FormField label={t("master_library.role_labour_type")} value={form.role||form.skill||""} onChange={v => upd("role", v)} placeholder={t("master_library.e_g_mason_mistri")} required />
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormSelect label={t("common.category")} value={form.category} onChange={v => upd("category", v)} options={["Skilled","Semi-Skilled","Unskilled","Staff"]} half />
          <FormField label={t("master_library.city_area_2")} value={form.city} onChange={v => upd("city", v)} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <FormField label={t("master_library.daily_rate_rs")} value={form.rate || ""} onChange={v => upd("rate", parseFloat(v) || 0)} type="number" half required />
          <FormField label={t("master_library.ot_rate_hour_rs")} value={form.overtime_rate || ""} onChange={v => upd("overtime_rate", parseFloat(v) || 0)} type="number" half />
        </div>
        <ModalFooter onClose={() => setShowModal(false)} onSave={save} saveLabel={editing ? "Update" : "Add"} />
      </Modal>
    </div>
  );
}
// Equipment / Machinery ka section yahan se hata diya gaya — ab wo apne
// Machinery module me hai (fleet, meter, documents, reminders). Register
// wahi ek equipment_master hi rahega; do jagah edit hone se bacha gaya.


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
    if (!await window.confirmAsync(t("master_library.delete_this_unit"))) return;
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
    { key:"symbol", label:t("master_library.symbol"), minW:80, render: r=><code style={{fontSize:12,fontWeight:700,color:T.blue,background:T.blueSoft,padding:"2px 8px",borderRadius:4}}>{r.symbol||"—"}</code> },
    { key:"name",   label:t("master_library.unit_name"), minW:160, render: r=><span style={{fontWeight:600}}>{r.name}</span> },
    { key:"type",   label:t("common.type"), minW:100, render: r=><Badge text={r.type||"—"} color={typeColors[r.type]||T.textMid} bg={(typeColors[r.type]||T.blue)+"15"}/> },
  ];

  return (
    <div>
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="units"
        onAdd={openCreate} addLabel="Add Unit"
        templateConfig={{ headers:["Unit Name","Symbol","Type"], sampleRows:[["Kilogram","Kg","Weight"],["Square Feet","Sqft","Area"],["Piece","Pcs","Count"]], filename:"gb_uom_export.csv", templateFilename:"gb_template_uom.csv", instructions:"Type: Weight, Area, Volume, Length, Count, Work, Time, Transport, Bulk, Flat", mapRow:u=>[u.name,u.symbol||"",u.type||""] }}
        currentData={uoms} onImportData={handleImport}/>
      {loading?<div style={{padding:"40px",textAlign:"center",color:T.textLight}}>{t("common.loading")}</div>
        :<DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={del} emptyMsg="No units found"/>}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editing?t("master_library.edit_unit"):t("master_library.add_unit")} width={400}>
        <FormField label={t("master_library.unit_name_2")} value={form.name} onChange={v=>upd("name",v)} placeholder={t("master_library.e_g_kilogram")} required/>
        <div style={{height:12}}/>
        <FormField label={t("master_library.symbol")} value={form.symbol} onChange={v=>upd("symbol",v)} placeholder={t("master_library.e_g_kg")}/>
        <div style={{height:12}}/>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:T.textMid,display:"block",marginBottom:5}}>{t("common.type")}</label>
          <SearchSelect value={form.type} options={TYPES} onChange={v=>upd("type",v)} placeholder={t("common.select_type")}/>
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
    { key: "code", label: t("common.code"), minW: 70, render: r => <code style={{ fontSize: 12, fontWeight: 600, color: T.blue, background: T.blueSoft, padding: "2px 8px", borderRadius: 4 }}>{r.code}</code> },
    { key: "name", label: t("master_library.expense_head"), minW: 200, render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: "type", label: t("common.type"), minW: 110, render: r => <Badge text={r.type||r.group||t("common.other")} color={groupColors[r.type||r.group] || T.textMid} bg={(groupColors[r.type||r.group] || T.textMid) + "18"} /> },
    { key: "description", label: t("common.description"), minW: 200, style: { fontSize: 12, color: T.textMid } },
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
      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label={t("master_library.expense_heads")} onAdd={openCreate} addLabel="Add Head"
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? t("master_library.edit_expense_head") : t("master_library.add_expense_head")} width={440}>
        <FormField label={t("master_library.expense_head_name")} value={form.name} onChange={v => upd("name", v)} placeholder={t("master_library.e_g_material_purchase")} required />
        <div style={{ height: 12 }} />
        <FormField label={t("common.code")} value={form.code} onChange={v => upd("code", v)} placeholder={t("master_library.e_g_eh_001")} />
        <div style={{ height: 12 }} />
        <FormSelect label={t("common.type")} value={form.type} onChange={v => upd("type", v)} options={["Material","Labour","Equipment","Overhead","Other"]} />
        <div style={{ height: 12 }} />
        <FormTextarea label={t("common.description")} value={form.description||""} onChange={v => upd("description", v)} rows={2} />
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
         {t("master_library.drawing_categories")} <span style={{ marginLeft: 6, background: subTab==="categories"?"rgba(255,255,255,0.3)":"#E5E7EB", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{categories.length}</span>
        </button>
        <button style={tabStyle("types")} onClick={() => switchTab("types")}>
         {t("master_library.drawing_types")} <span style={{ marginLeft: 6, background: subTab==="types"?"rgba(255,255,255,0.3)":"#E5E7EB", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{drawTypes.length}</span>
        </button>
        <button style={tabStyle("titles")} onClick={() => switchTab("titles")}>
         {t("master_library.drawing_titles")} <span style={{ marginLeft: 6, background: subTab==="titles"?"rgba(255,255,255,0.3)":"#E5E7EB", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{titles.length}</span>
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
              <SearchSelect value={catFilter} options={["All",...catNames]} onChange={setCatFilter} placeholder={t("master_library.filter_category")}/>
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
          + {subTab === "categories" ? t("common.add_category_2") : subTab === "types" ? t("master_library.add_type") : t("master_library.add_title")}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 50, color: "#9CA3AF" }}>{t("common.loading")}</div>
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
          {filteredCats.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#9CA3AF" }}>{t("master_library.no_categories_found")}</div>}
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
          {filteredTypes.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#9CA3AF" }}>{t("master_library.no_drawing_types_found")}</div>}
        </div>
      ) : (
        /* ── Drawing Titles table ── */
        <DataTable
          columns={[
            { key: "title",    label: t("master_library.drawing_title"), minW: 220, render: r => <span style={{ fontWeight: 600 }}>{r.title}</span> },
            { key: "category", label: t("common.category"),      minW: 130, render: r => r.category ? <Badge text={r.category} color="#2563EB" bg="#DBEAFE" /> : <span style={{ color: "#9CA3AF" }}>—</span> },
            { key: "type",     label: t("master_library.drawing_type"),  minW: 110, render: r => r.type ? <Badge text={r.type} color="#7C3AED" bg="#EDE9FE" /> : <span style={{ color: "#9CA3AF" }}>—</span> },
            { key: "description", label: t("common.description"), minW: 200, render: r => <span style={{ fontSize: 12, color: "#6B7280" }}>{r.description || "—"}</span> },
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
          subTab === "categories" ? (editing ? t("master_library.edit_category") : t("master_library.add_drawing_category")) :
          subTab === "types"      ? (editing ? t("master_library.edit_drawing_type") : t("master_library.add_drawing_type")) :
                                    (editing ? t("master_library.edit_drawing_title") : t("master_library.add_drawing_title"))
        } width={460}>
        {(subTab === "categories" || subTab === "types") && (
          <>
            <FormField label={t("common.name_2")} value={form.name||""} onChange={v => upd("name", v)}
              placeholder={subTab === "categories" ? t("master_library.e_g_architectural_structural") : t("master_library.e_g_plan_elevation_section")}
              required />
            <div style={{ height: 12 }} />
            <FormField label={t("master_library.description_optional")} value={form.description||""} onChange={v => upd("description", v)} placeholder={t("master_library.brief_description")} />
          </>
        )}
        {subTab === "titles" && (
          <>
            <FormField label={t("master_library.drawing_title")} value={form.title||""} onChange={v => upd("title", v)} placeholder={t("master_library.e_g_ground_floor_plan")} required />
            <div style={{ height: 12 }} />
            <div style={{ display: "flex", gap: 16 }}>
              <FormSelect label={t("common.category")} value={form.category||""} onChange={v => upd("category", v)} options={catNames} half />
              <FormSelect label={t("master_library.drawing_type")} value={form.type||""} onChange={v => upd("type", v)} options={typeNames} half />
            </div>
            <div style={{ height: 12 }} />
            <FormField label={t("master_library.description_optional")} value={form.description||""} onChange={v => upd("description", v)} placeholder={t("master_library.brief_description")} />
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
    if (!form.name.trim()) return alert(t("master_library.worker_name_required"));
    setSaving(true);
    const res = await apiSave({ ...form, daily_rate: parseFloat(form.daily_rate)||0 }, editing?.id);
    setSaving(false);
    if (res.success) {
      setShowModal(false);
      // Rate gate: the server may have stored the CARD rate instead of the
      // one typed here. Say so, otherwise the number silently "changes back"
      // and it looks like the save was lost.
      if (res.rate_pending && res.message) alert(res.message);
    }
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
    // An import is not a way around the rate card either — rows whose rate
    // differs land at the card rate with an approval raised. Say how many,
    // otherwise the sheet's numbers appear to have been ignored.
    if (res.data?.rate_pending && res.data?.message) alert(res.data.message);
    return res.data;
  };

  // Summary by role
  const roleSummary = {};
  workers.forEach(w => { roleSummary[w.role] = (roleSummary[w.role]||0)+1; });

  const columns = [
    { key:"name",       label:t("master_library.worker_name"),   minW:180, render: w => (
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
    { key:"role",       label:t("master_library.skill_role"),  minW:120, render: w => {
      const cc = catC[w.category||"Unskilled"] || catC.Unskilled;
      return <Badge text={w.role||t("common.labour")} color={cc.c} bg={cc.bg} />;
    }},
    { key:"category",   label:t("common.category"),      minW:100, render: w => {
      const cc = catC[w.category||"Unskilled"] || catC.Unskilled;
      return <span style={{fontSize:11,color:cc.c,fontWeight:600}}>{w.category||t("master_library.unskilled")}</span>;
    }},
    { key:"daily_rate", label:t("master_library.daily_rate"),     minW:90, align:"right", render: w => (
      <span style={{fontWeight:700,color:T.green}}>₹{(w.daily_rate||0).toLocaleString()}</span>
    )},
    { key:"monthly",    label:t("master_library.monthly_26d"),  minW:100, align:"right", render: w => (
      <span style={{fontWeight:600,color:T.textMid}}>₹{((w.daily_rate||0)*26).toLocaleString()}</span>
    )},
    { key:"city",       label:t("common.city"),           minW:80,  render: w => <span style={{color:T.textMid}}>{w.city||"—"}</span>},
    { key:"status",     label:t("common.status"),         minW:70,  render: w => (
      <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:10,background:w.status==="Active"?T.greenSoft:T.borderLight,color:w.status==="Active"?T.green:T.textMid}}>{w.status||t("common.active")}</span>
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
          {filterRole!=="All"&&<button onClick={()=>setFilterRole("All")} style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${T.border}`,background:"white",color:T.textMid,fontSize:11,cursor:"pointer"}}>{t("master_library.clear")}</button>}
        </div>
      )}

      <ToolbarWithIO search={search} setSearch={setSearch} count={filtered.length} label="workers" onAdd={openCreate} addLabel="+ Add Worker"
        templateConfig={templateConfig} currentData={workers} onImportData={handleImport} />

      {loading ? (
        <div style={{textAlign:"center",padding:"40px 0",color:T.textLight}}>{t("common.loading")}</div>
      ) : (
        <DataTable columns={columns} data={filtered} onEdit={openEdit} onDelete={id=>apiDel(id)}
          emptyMsg={search||filterRole!=="All" ? "No workers match your filter" : "No workers yet — add your first worker"} />
      )}

      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editing?t("master_library.edit_worker"):t("common.add_worker")} desc={t("master_library.register_worker_with_skill_and_daily")} width={560}>
        {/* Name */}
        <FormField label={t("master_library.full_name")} value={form.name} onChange={v=>upd("name",v)} placeholder={t("master_library.e_g_ramesh_kumar")} required />
        <div style={{height:14}}/>
        {/* Role + Category */}
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:14}}>
          <div style={{flex:1,minWidth:180}}>
            <label style={{fontSize:12,fontWeight:600,color:T.textMid,display:"block",marginBottom:6}}>{t("master_library.skill_role")} <span style={{color:T.red}}>*</span></label>
            <SearchSelect value={form.role} options={WORKER_ROLES}
              onChange={v=>{upd("role",v);upd("category",ROLE_CAT_MAP[v]||"Semi-Skilled");}}
              placeholder={t("master_library.select_role")}/>
          </div>
          <div style={{flex:1,minWidth:180}}>
            <label style={{fontSize:12,fontWeight:600,color:T.textMid,display:"block",marginBottom:6}}>{t("common.category")}</label>
            <SearchSelect value={form.category} options={WORKER_CATS} onChange={v=>upd("category",v)} placeholder={t("common.select_category")}/>
          </div>
        </div>
        {/* Rate */}
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:14}}>
          <FormField label={t("master_library.daily_rate_2")} value={form.daily_rate||""} onChange={v=>upd("daily_rate",v)} type="number" placeholder="e.g. 650" half required />
          <div style={{flex:1,minWidth:180}}>
            <label style={{fontSize:12,fontWeight:600,color:T.textMid,display:"block",marginBottom:6}}>{t("common.status")}</label>
            <SearchSelect value={form.status} options={["Active","Inactive","Blacklisted"]} onChange={v=>upd("status",v)} placeholder={t("common.select_status")}/>
          </div>
        </div>
        {/* Contact */}
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:14}}>
          <FormField label={t("common.phone")} value={form.phone} onChange={v=>upd("phone",v)} placeholder={t("finance.mobile_number")} type="tel" half />
          <FormField label={t("master_library.city_area_2")} value={form.city} onChange={v=>upd("city",v)} placeholder={t("master_library.e_g_raipur")} half />
        </div>
        {/* ID */}
        <FormField label={t("master_library.aadhar_id_number")} value={form.id_number} onChange={v=>upd("id_number",v)} placeholder={t("master_library.optional_for_identity_verification")} />
        <div style={{height:14}}/>
        <FormTextarea label={t("crm.address")} value={form.address} onChange={v=>upd("address",v)} placeholder={t("common.optional")} rows={2} />
        {/* Rate preview */}
        {form.daily_rate>0&&(
          <div style={{marginTop:14,padding:"10px 14px",borderRadius:8,background:T.greenSoft,border:`1px solid ${T.green}22`,display:"flex",gap:20}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:T.textMid,marginBottom:2}}>{t("master_library.daily")}</div>
              <div style={{fontSize:15,fontWeight:700,color:T.green}}>₹{parseFloat(form.daily_rate||0).toLocaleString()}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:T.textMid,marginBottom:2}}>{t("master_library.weekly_6d")}</div>
              <div style={{fontSize:15,fontWeight:700,color:T.green}}>₹{(parseFloat(form.daily_rate||0)*6).toLocaleString()}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:T.textMid,marginBottom:2}}>{t("master_library.monthly_26d")}</div>
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
  // ── ITEM LIBRARY ──────────────────────────────────────────────────
  { id: "work_cat",      get label() { return t("master_library.work_category"); },       Icon: IcTool,      Comp: WorkCategorySection,      section: "ITEM LIBRARY", countKey: "work_categories", color: T.purple },
  { id: "material_cat",  get label() { return t("master_library.material_category"); },   Icon: IcFolder,    Comp: MaterialCategorySection,  section: null, countKey: "material_categories", color: T.blue },
  { id: "materials",     get label() { return t("master_library.material_master"); },     Icon: IcBox,       Comp: MaterialMasterSection,    section: null, countKey: "materials", color: T.teal },
  { id: "boq_items",     get label() { return t("master_library.boq_item_library"); },    Icon: IcBox,       Comp: BoqItemLibrarySection,    section: null, countKey: null, color: T.purple },
  // ── PEOPLE ────────────────────────────────────────────────────────
  { id: "party",         get label() { return t("master_library.party_supplier"); },    Icon: IcUsers,     Comp: PartyMasterSection,       section: "PEOPLE", countKey: "parties", color: T.green },
  { id: "subcon",        get label() { return t("master_library.subcontractors"); },      Icon: IcHardHat,   Comp: SubcontractorSection,     section: null, countKey: "subcontractors", color: T.amber },
  { id: "workers",       get label() { return t("master_library.workers"); },             Icon: IcHardHat,   Comp: WorkersSection,           section: null, countKey: "workers", color: T.blue },
  // ── RATES & BOQ ───────────────────────────────────────────────────
  { id: "subcon_rate",   get label() { return t("master_library.subcon_rate_card"); },    Icon: IcDollar,    Comp: SubconRateCardSection,    section: "RATES & BOQ", countKey: null, color: T.teal },
  { id: "labour",        get label() { return t("master_library.labour_rate_card"); },    Icon: IcUsers,     Comp: LabourRateSection,        section: null, countKey: "labour_rates", color: T.orange },
  { id: "client_boq",    get label() { return t("master_library.client_boq_rate"); },     Icon: IcClipboard, Comp: ClientBOQSection,         section: null, countKey: null, color: T.indigo },
  // Equipment / Machinery ab apne Machinery module me hai. Yahan se hataya
  // gaya taaki ek machine do jagah edit na ho — register wahi ek rahe.
  // ── OTHER ─────────────────────────────────────────────────────────
  { id: "design_library", get label() { return t("master_library.design_library"); },     Icon: IcLayers,    Comp: DesignLibrarySection,     section: "OTHER", countKey: null, color: T.purple },
  { id: "uom",           get label() { return t("master_library.units_uom"); },         Icon: IcRuler,     Comp: UOMMasterSection,         section: null, countKey: "uom", color: T.teal },
  { id: "expense_head",  get label() { return t("master_library.expense_heads"); },       Icon: IcDollar,    Comp: ExpenseHeadSection,       section: null, count: "14", color: T.amber },
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
              <div style={{ fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: "-0.3px" }}>{t("master_library.master_library_2")}</div>
              <div style={{ fontSize: 11, color: T.textLight }}>{t("master_library.central_data_repository")}</div>
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
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textLight }}>{t("master_library.construction_manager_v2_1")}</div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 28px", background: T.card, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{active?.label}</div>
            <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>
              {activeSection === "materials" && t("master_library.central_material_database_with_rates_hsn")}
              {activeSection === "material_cat" && t("master_library.organize_materials_into_categories_and_subcategories")}
              {activeSection === "party" && t("master_library.suppliers_clients_transporters_and_other_business")}
              {activeSection === "work_cat" && t("master_library.types_of_construction_work_with_base")}
              {activeSection === "subcon" && t("master_library.subcontractor_firms_trade_specialties_and_rate")}
              {activeSection === "boq" && t("master_library.project_wise_client_boq_with_cost")}
              {activeSection === "workers" && t("master_library.register_individual_workers_with_skill_daily")}
              {activeSection === "labour" && t("master_library.daily_wages_and_overtime_rates_for")}
              {activeSection === "uom" && t("master_library.standard_units_of_measurement_used_across")}
              {activeSection === "expense_head" && t("master_library.expense_categories_for_accounting_and_reporting")}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textLight }}>
            <span>{t("master_library.master_library_2")}</span><IcChevR size={12} color={T.textLight} /><span style={{ color: T.blue, fontWeight: 600 }}>{active?.label}</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <ActiveComp dbProjects={dbProjects} />
        </div>
      </div>
    </div>
  );
}
