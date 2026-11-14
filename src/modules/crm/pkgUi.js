// CRM Packages — chhote UI tukde (button, chip, sheet, field). Inline style hi
// is codebase ka tareeka hai; rang shared/tokens se.
import { useEffect } from "react";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

export { T };
export const FONT = "'Segoe UI',system-ui,sans-serif";

export const btn = (kind = "plain", disabled = false, big = false) => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  minHeight: big ? 40 : 34, padding: big ? "8px 16px" : "6px 12px", borderRadius: 8,
  fontSize: big ? 13.5 : 12.5, fontWeight: 700, cursor: disabled ? "default" : "pointer",
  fontFamily: "inherit", opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap", boxSizing: "border-box",
  ...(kind === "primary" ? { background: T.blu, color: "white", border: "1px solid " + T.blu }
    : kind === "green" ? { background: T.grn, color: "white", border: "1px solid " + T.grn }
    : kind === "wa" ? { background: "#25D366", color: "white", border: "1px solid #25D366" }
    : kind === "danger" ? { background: T.redL, color: T.red, border: "1px solid " + T.redM }
    : kind === "soft" ? { background: T.bluL, color: T.blu, border: "1px solid " + T.bluM }
    : kind === "ai" ? { background: T.purL, color: T.pur, border: "1px solid #DDD6FE" }
    : { background: T.surface, color: T.t2, border: "1px solid " + T.b1 }),
});
export const inp = {
  width: "100%", minHeight: 38, padding: "8px 10px", borderRadius: 8, border: "1.5px solid " + T.b1,
  fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: T.surface, color: T.t1,
};
export const chip = (bg, fg, brd) => ({
  display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: 10.5,
  fontWeight: 700, background: bg, color: fg, whiteSpace: "nowrap", border: brd ? "1px solid " + brd : "none", lineHeight: 1.5,
});
export const card = { background: T.surface, border: "1px solid " + T.b1, borderRadius: 12, padding: 14, boxSizing: "border-box" };

export function StatusChip({ status }) {
  return status === "checked"
    ? <span style={chip(T.grnL, T.grn, T.grnM)}>✓ {t("sales_pkg_ui.st_checked")}</span>
    : <span style={chip(T.ambL, T.amb, T.ambM)}>{t("sales_pkg_ui.st_draft")}</span>;
}
export const sourceLabel = (s) => ({
  template: t("sales_pkg_ui.src_template"), copy: t("sales_pkg_ui.src_copy"), blank: t("sales_pkg_ui.src_blank"),
  ai: t("sales_pkg_ui.src_ai"), import: t("sales_pkg_ui.src_import"), manual: t("sales_pkg_ui.src_manual"),
  restore: t("sales_pkg_ui.src_restore"), create: t("sales_pkg_ui.src_create"),
}[s] || s || "");

export function Field({ label, hint, children, style }) {
  return (
    <label style={{ display: "block", marginBottom: 12, ...(style || {}) }}>
      {label ? <div style={{ fontSize: 11.5, fontWeight: 700, color: T.t2, marginBottom: 4 }}>{label}</div> : null}
      {children}
      {hint ? <div style={{ fontSize: 11, color: T.t4, marginTop: 4, lineHeight: 1.4 }}>{hint}</div> : null}
    </label>
  );
}

export function Spinner({ size = 16, color = T.blu }) {
  return (
    <span aria-hidden="true" style={{ display: "inline-block", width: size, height: size, border: "2px solid " + T.b1, borderTopColor: color,
      borderRadius: "50%", animation: "pkgspin .7s linear infinite", verticalAlign: "middle", flexShrink: 0 }}>
      <style>{"@keyframes pkgspin{to{transform:rotate(360deg)}}"}</style>
    </span>
  );
}

export function ErrBox({ children, tone = "red" }) {
  if (!children) return null;
  const c = tone === "amber" ? { bg: T.ambL, fg: "#92400E", b: T.ambM } : { bg: T.redL, fg: T.red, b: T.redM };
  return <div role="alert" style={{ background: c.bg, color: c.fg, border: "1px solid " + c.b, borderRadius: 8, padding: "8px 11px", fontSize: 12.5, margin: "8px 0", lineHeight: 1.45 }}>{children}</div>;
}

// Modal — phone par neeche se, PC par beech me. Esc / bahar tap = band.
export function Sheet({ heading, subline, onClose, children, footer, maxWidth = 560 }) {
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="pkg-sheet-wrap" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 700, display: "flex", alignItems: "flex-end",
        justifyContent: "center", padding: "10px 0 0", boxSizing: "border-box", fontFamily: FONT }}>
      <style>{"@media (min-width:700px){.pkg-sheet-wrap{align-items:center!important;padding:24px!important}.pkg-sheet{border-radius:14px!important}}"}</style>
      <div className="pkg-sheet" role="dialog" aria-modal="true" style={{ background: T.surface, width: "100%", maxWidth, maxHeight: "92vh", display: "flex", flexDirection: "column",
        borderRadius: "14px 14px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,.25)", overflow: "hidden", marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 16px 10px", borderBottom: "1px solid " + T.b1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.t1, overflowWrap: "anywhere" }}>{heading}</div>
            {subline ? <div style={{ fontSize: 12, color: T.t3, marginTop: 2, overflowWrap: "anywhere" }}>{subline}</div> : null}
          </div>
          <button type="button" onClick={onClose} aria-label={t("sales_pkg_ui.close")}
            style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid " + T.b1, background: T.surfaceB, color: T.t3, fontSize: 18, lineHeight: "30px", cursor: "pointer", flexShrink: 0 }}>×</button>
        </div>
        <div style={{ padding: 16, overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>{children}</div>
        {footer ? <div style={{ padding: "10px 16px calc(10px + env(safe-area-inset-bottom))", borderTop: "1px solid " + T.b1, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", background: T.surfaceB }}>{footer}</div> : null}
      </div>
    </div>
  );
}

// Data aate waqt
export function Loading({ text }) {
  return <div style={{ padding: 30, textAlign: "center", color: T.t3, fontSize: 13 }}><Spinner /> <span style={{ marginLeft: 8 }}>{text || t("sales_pkg_ui.loading")}</span></div>;
}
