// ── DATA EXPORT / IMPORT — shared utility ────────────────────────
// Zero-dependency Excel (CSV) + PDF export, plus CSV import.
// CSV opens natively in Excel. PDF goes through window.print() so the
// user picks "Save as PDF" in the system dialog.
//
// Usage:
//   <ExportMenu
//     filename="crm-leads"
//     title="CRM Leads"
//     columns={[{key:"name",label:"Name"},{key:"phone",label:"Phone"}]}
//     rows={leads}
//     onImport={(rows)=>...}   // optional — show Import action
//   />
//
// You can also call the helpers directly:
//   import { exportCSV, exportPDF, parseCSV } from "../components/DataExport";

import { useState, useRef, useEffect } from "react";

// ── Helpers ─────────────────────────────────────────────────────────
function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  // RFC 4180: quote when contains , " or newline
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCSV(filename, columns, rows) {
  const header = columns.map((c) => csvEscape(c.label || c.key)).join(",");
  const lines = rows.map((r) =>
    columns.map((c) => csvEscape(typeof c.get === "function" ? c.get(r) : r[c.key])).join(",")
  );
  // BOM so Excel reads UTF-8 (₹, hindi, etc) correctly
  const csv = "﻿" + [header, ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export function exportPDF(title, columns, rows, meta = {}) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Allow pop-ups to export as PDF");
    return;
  }
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", system-ui, sans-serif; color: #111827; margin: 0; padding: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; letter-spacing: -.3px; }
  .sub { font-size: 11px; color: #6B7280; margin-bottom: 18px; }
  .meta { font-size: 11px; color: #374151; margin-bottom: 14px; }
  .meta b { color: #111827; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #F8F9FB; text-align: left; padding: 8px 10px; border-bottom: 2px solid #E5E7EB; font-weight: 700; color: #374151; text-transform: uppercase; font-size: 9.5px; letter-spacing: .3px; }
  td { padding: 7px 10px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
  tr:nth-child(even) td { background: #FAFBFC; }
  .footer { font-size: 10px; color: #9CA3AF; margin-top: 18px; text-align: center; }
  @media print {
    body { padding: 14px; }
    @page { margin: 14mm; }
  }
</style>
</head>
<body>
<h1>${title}</h1>
<div class="sub">Generated on ${today} · ${rows.length} record${rows.length === 1 ? "" : "s"}</div>
${meta.subtitle ? `<div class="meta">${meta.subtitle}</div>` : ""}
<table>
  <thead>
    <tr>${columns.map((c) => `<th>${escapeHtml(c.label || c.key)}</th>`).join("")}</tr>
  </thead>
  <tbody>
    ${rows
      .map(
        (r) =>
          `<tr>${columns
            .map(
              (c) => `<td>${escapeHtml(typeof c.get === "function" ? c.get(r) : r[c.key] ?? "")}</td>`
            )
            .join("")}</tr>`
      )
      .join("")}
  </tbody>
</table>
<div class="footer">GB Buildcon · Construction Manager</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 200);
  };
</script>
</body>
</html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escapeHtml(v) {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── CSV import — returns Promise<rows[]> with object keys = header row
export function parseCSV(text) {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let cur = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        cur.push(field);
        field = "";
      } else if (c === "\r") {
        // skip
      } else if (c === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length || cur.length) {
    cur.push(field);
    rows.push(cur);
  }
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((v) => String(v).trim() !== "")).map((r) => {
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = r[i] != null ? r[i].trim() : "";
    });
    return obj;
  });
}

export function importCSV(onLoad) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,text/csv";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(String(ev.target.result || ""));
        onLoad(rows);
      } catch (err) {
        alert("Failed to parse CSV: " + err.message);
      }
    };
    reader.readAsText(file, "utf-8");
  };
  input.click();
}

// ── ExportMenu component — drop-in dropdown button ──────────────────
export default function ExportMenu({
  filename = "export",
  title = "Export",
  columns = [],
  rows = [],
  onImport,
  size = "md", // "sm" | "md"
  style = {},
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const T = {
    blu: "#2563EB",
    bluL: "#EFF6FF",
    grn: "#059669",
    grnL: "#ECFDF5",
    red: "#DC2626",
    redL: "#FEF2F2",
    amb: "#D97706",
    ambL: "#FFFBEB",
    surface: "#FFFFFF",
    surfaceB: "#F8F9FB",
    t1: "#111827",
    t2: "#374151",
    t3: "#6B7280",
    t4: "#9CA3AF",
    b1: "#E5E7EB",
  };
  const sm = size === "sm";

  const handleExcel = () => {
    if (rows.length === 0) {
      alert("No data to export");
      return;
    }
    exportCSV(filename, columns, rows);
    setOpen(false);
  };
  const handlePDF = () => {
    if (rows.length === 0) {
      alert("No data to export");
      return;
    }
    exportPDF(title, columns, rows);
    setOpen(false);
  };
  const handleImport = () => {
    importCSV((rows) => {
      onImport && onImport(rows);
      setOpen(false);
    });
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block", ...style }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: sm ? "5px 10px" : "6px 13px",
          borderRadius: 6,
          background: T.surface,
          border: `1px solid ${T.b1}`,
          color: T.t2,
          fontSize: sm ? 11 : 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = T.surfaceB;
          e.currentTarget.style.borderColor = T.b1;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = T.surface;
          e.currentTarget.style.borderColor = T.b1;
        }}
      >
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Export
        <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 200,
            background: T.surface,
            border: `1px solid ${T.b1}`,
            borderRadius: 8,
            boxShadow: "0 10px 28px rgba(0,0,0,0.15)",
            zIndex: 9999,
            overflow: "hidden",
            animation: "ssFadeIn .12s ease",
          }}
        >
          <MenuItem
            color={T.grn}
            bg={T.grnL}
            icon="📊"
            label="Export as Excel (CSV)"
            sub={`${rows.length} row${rows.length === 1 ? "" : "s"}`}
            onClick={handleExcel}
          />
          <MenuItem
            color={T.red}
            bg={T.redL}
            icon="📄"
            label="Export as PDF"
            sub="Print-friendly"
            onClick={handlePDF}
          />
          {onImport && (
            <>
              <div style={{ borderTop: `1px solid ${T.b1}` }} />
              <MenuItem
                color={T.blu}
                bg={T.bluL}
                icon="📥"
                label="Import from CSV"
                sub="Bulk add records"
                onClick={handleImport}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ color, bg, icon, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        transition: "background .12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = bg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#111827" }}>{label}</div>
        <div style={{ fontSize: 10.5, color: "#6B7280", marginTop: 1 }}>{sub}</div>
      </div>
    </button>
  );
}
