// ══════════════════════════════════════════════════════════════════════
// RMC — shared bits (theme, icons, formatters, API helpers, small UI).
//
// Poora module in chhote tukdon me hai:
//   RMCModule.js      — shell (tab bar + meta load)
//   rmc/RmcDashboard  · RmcOrders · RmcChallans (+ RmcChallanForms)
//   rmc/RmcSetup (+ RmcArrangement) · RmcReports
//
// API contract: gb-backend/docs/plans/rmc-api-phase1.md — endpoint aur field
// wahan se hain, yahan koi naya nahi banaya.
// ══════════════════════════════════════════════════════════════════════
import { useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";

// ── THEME ─────────────────────────────────────────────────────────
export const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA1B0",
  b1: "#E4E6EE", b2: "#D1D5DB",
  ind: "#4B45C4", indL: "#EEEDFB", indM: "#C7D2FE",
  blu: "#2563AC", bluL: "#E7F0FA",
  grn: "#1E8E5A", grnL: "#E4F5EC",
  amb: "#B27A0A", ambL: "#FBF3DF",
  red: "#C43A45", redL: "#FBE9EA",
  slt: "#64748B", sltL: "#F1F5F9",
};

// ── ICONS ─────────────────────────────────────────────────────────
const Ic = ({ d, size = 18, color = "currentColor", sw = 1.8, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
export const IcChart  = (p) => <Ic {...p} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />;
export const IcList   = (p) => <Ic {...p} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />;
export const IcTruck  = (p) => <Ic {...p} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a2 2 0 100-4 2 2 0 000 4zM18.5 19a2 2 0 100-4 2 2 0 000 4z" />;
export const IcPlant  = (p) => <Ic {...p} d="M3 21h18M4 21V10l5 3V10l5 3V7l6 4v10M8 21v-4h3v4" />;
export const IcSet    = (p) => <Ic {...p} d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.6 1.6 0 008 19.4a1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H2a2 2 0 110-4h.1A1.6 1.6 0 004.6 8a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V2a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H22a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" />;
export const IcAdd    = (p) => <Ic {...p} d="M12 5v14M5 12h14" />;
export const IcX      = (p) => <Ic {...p} d="M18 6L6 18M6 6l12 12" />;
export const IcChk    = (p) => <Ic {...p} d="M20 6L9 17l-5-5" />;
export const IcRefresh= (p) => <Ic {...p} d="M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15" />;
export const IcRupee  = (p) => <Ic {...p} d="M6 4h11M6 9h11M15.5 4c0 4.2-2.8 5-5.5 5H6l8 10" />;
export const IcClock  = (p) => <Ic {...p} d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 7v5l3 2" />;
export const IcDoc    = (p) => <Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M15 13H9M15 17H9" />;
export const IcBox    = (p) => <Ic {...p} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />;
export const IcRoad   = (p) => <Ic {...p} d="M4 21l3-18M20 21l-3-18M12 3v3M12 11v3M12 19v2" />;

// ── FORMAT ────────────────────────────────────────────────────────
export const N = (v) => Number(v) || 0;
export const fmtN = (n) => (n == null || n === "" ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
// Cum hamesha 2 decimal — 6 aur 6.00 ek jaisa dikhe, warna site aur plant ke
// ankde alag lagte hain.
export const cum = (n) => Number(N(n)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const rupee = (n) => "₹" + Math.round(N(n)).toLocaleString("en-IN");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtD = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.getDate() + " " + MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2);
};
export const fmtDT = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return fmtD(raw) + ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};
export const isoDate = (raw) => (raw ? String(raw).slice(0, 10) : "");
export const todayStr = () => new Date().toLocaleDateString("en-CA");
export const monthStartStr = () => todayStr().slice(0, 8) + "01";
// <input type="datetime-local"> ki shakl — server DATETIME wapas leta hai.
export const nowLocal = () => {
  const d = new Date();
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const qs = (params) => Object.entries(params || {})
  .filter(([, v]) => v !== "" && v != null)
  .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

// ── API ───────────────────────────────────────────────────────────
// Sab kuch /rmc ke neeche hai; jawab { success, data, message } aata hai aur
// message seedha dikhane layak hota hai (backend i18n se).
export const rget   = (path, params) => { const q = qs(params); return api.get("/rmc" + path + (q ? "?" + q : "")); };
export const rpost  = (path, body) => api.post("/rmc" + path, body);
export const rpatch = (path, body) => api.patch("/rmc" + path, body);
export const dataOf = (r, fallback) => (r && r.success ? (r.data == null ? fallback : r.data) : fallback);

// ── LABELS ────────────────────────────────────────────────────────
export const ownerLabel = (o) => ({ own: t("rmc.owner_own"), hired: t("rmc.owner_hired"), vendor: t("rmc.owner_vendor") }[o] || o || "—");
export const supplyLabel = (s) => ({
  own: t("rmc.sup_own"), hired: t("rmc.sup_hired"), vendor: t("rmc.sup_vendor"),
  customer: t("rmc.sup_customer"), none: t("rmc.sup_none"),
}[s] || s || "—");
export const orderStatusLabel = (s) => ({
  requested: t("rmc.ost_requested"), approved: t("rmc.ost_approved"),
  dispatching: t("rmc.ost_dispatching"), done: t("rmc.ost_done"), cancelled: t("rmc.ost_cancelled"),
}[s] || s || "—");
export const dispatchStatusLabel = (s) => ({
  in_transit: t("rmc.dst_in_transit"), accepted: t("rmc.dst_accepted"),
  partial: t("rmc.dst_partial"), rejected: t("rmc.dst_rejected"), cancelled: t("rmc.dst_cancelled"),
}[s] || s || "—");
export const transportModeLabel = (m) => ({
  included: t("rmc.tm_included"), per_cum_km: t("rmc.tm_per_cum_km"), slab_cum: t("rmc.tm_slab_cum"),
  slab_trip: t("rmc.tm_slab_trip"), per_km_trip: t("rmc.tm_per_km_trip"), monthly: t("rmc.tm_monthly"),
}[m] || m || "—");
export const rejectReasonLabel = (r) => ({
  slump_fail: t("rmc.rr_slump_fail"), late: t("rmc.rr_late"), wrong_grade: t("rmc.rr_wrong_grade"),
  extra: t("rmc.rr_extra"), other: t("rmc.rr_other"),
}[r] || r || "—");
export const sideLabel = (s) => (s === "site" ? t("rmc.side_site") : t("rmc.side_plant"));

// Phase 2 — ginti aur bill ke label. Status ke naam ek hi jagah rahen, warna
// list aur drawer alag-alag shabd bolne lagte hain.
export const countStatusLabel = (s) => ({
  draft: t("rmc.cst_draft"), pending: t("rmc.cst_pending"), approved: t("rmc.cst_approved"),
}[s] || s || "—");
export const billKindLabel = (k) => ({
  concrete: t("rmc.bk_concrete"), transport: t("rmc.bk_transport"), rent: t("rmc.bk_rent"),
}[k] || k || "—");
export const billStatusLabel = (s) => ({
  draft: t("rmc.bst_draft"), approved: t("rmc.bst_approved"), cancelled: t("rmc.bst_cancelled"),
}[s] || s || "—");
export const lineKindLabel = (k) => ({
  concrete: t("rmc.lk_concrete"), transport: t("rmc.lk_transport"), pump: t("rmc.lk_pump"),
  waiting: t("rmc.lk_waiting"), short_load: t("rmc.lk_short_load"), rent: t("rmc.lk_rent"),
  min_guarantee: t("rmc.lk_min_guarantee"), recovery: t("rmc.lk_recovery"),
}[k] || k || "—");
export const decisionLabel = (d) => ({
  charge: t("rmc.dec_charge_done"), reduce: t("rmc.dec_reduce_done"), waive: t("rmc.dec_waive_done"),
}[d] || "—");

export const orderTone = (s) =>
  s === "requested" ? { c: T.amb, bg: T.ambL }
  : s === "approved" ? { c: T.blu, bg: T.bluL }
  : s === "dispatching" ? { c: T.ind, bg: T.indL }
  : s === "done" ? { c: T.grn, bg: T.grnL }
  : { c: T.slt, bg: T.sltL };
export const dispatchTone = (s) =>
  s === "in_transit" ? { c: T.blu, bg: T.bluL }
  : s === "accepted" ? { c: T.grn, bg: T.grnL }
  : s === "partial" ? { c: T.amb, bg: T.ambL }
  : s === "rejected" ? { c: T.red, bg: T.redL }
  : { c: T.slt, bg: T.sltL };

// ── ARRANGEMENT KA ASAR ───────────────────────────────────────────
// Matrix hi screen chalati hai. Ye teen sawaal poore module me yahin se
// poochhe jaate hain, taaki har screen ek hi jawab de.
export const contractById = (meta, id) =>
  (meta && meta.contracts ? meta.contracts : []).find((c) => Number(c.id) === Number(id)) || null;
export const plantById = (meta, id) =>
  (meta && meta.plants ? meta.plants : []).find((p) => Number(p.id) === Number(id)) || null;
// Arrangement na chuni ho to backend "own" maanta hai — screen bhi wahi maane.
export const showsMaterial = (contract) => !contract || contract.supply_material === "own";
export const showsTransport = (contract) => !!contract && contract.supply_vehicle !== "customer";
// Vendor ka plant = challan site par darj hota hai (vendor challan no ke saath).
export const defaultSide = (plant) => (plant && plant.owner === "vendor" ? "site" : "plant");

// ── PHOTO ─────────────────────────────────────────────────────────
const uploadPhoto = (file) => new Promise((resolve, reject) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "gb_buildcon_drawings");
  fd.append("folder", "gb_buildcon/rmc");
  const xhr = new XMLHttpRequest();
  xhr.onload = () => {
    try {
      const d = JSON.parse(xhr.responseText);
      if (xhr.status === 200 && d.secure_url) resolve(d.secure_url);
      else reject(new Error((d.error && d.error.message) || t("rmc.upload_failed")));
    } catch (_) { reject(new Error(t("rmc.upload_failed"))); }
  };
  xhr.onerror = () => reject(new Error(t("rmc.upload_failed")));
  xhr.open("POST", "https://api.cloudinary.com/v1_1/dd632nqfm/auto/upload");
  xhr.send(fd);
});

// ── SMALL UI ──────────────────────────────────────────────────────
export const StatCard = ({ label, value, sub, color, icon: Icon, onClick }) => (
  <div onClick={onClick} style={{ padding: "13px 15px", background: T.surface, border: `1.5px solid ${T.b1}`, borderRadius: 12, borderTop: `3px solid ${color}`, display: "flex", alignItems: "flex-start", gap: 12, cursor: onClick ? "pointer" : "default" }}>
    <div style={{ width: 36, height: 36, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={16} color={color} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 9.5, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.t1, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>{sub}</div>}
    </div>
  </div>
);

export const Pill = ({ label, c, bg }) => (
  <span style={{ display: "inline-block", background: bg, color: c, fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>{label}</span>
);
export const OrderPill = ({ s }) => { const k = orderTone(s); return <Pill label={orderStatusLabel(s)} c={k.c} bg={k.bg} />; };
export const DispatchPill = ({ s }) => { const k = dispatchTone(s); return <Pill label={dispatchStatusLabel(s)} c={k.c} bg={k.bg} />; };
export const countTone = (s) => (s === "pending" ? { c: T.amb, bg: T.ambL }
  : s === "approved" ? { c: T.grn, bg: T.grnL } : { c: T.slt, bg: T.sltL });
export const CountPill = ({ s }) => { const k = countTone(s); return <Pill label={countStatusLabel(s)} c={k.c} bg={k.bg} />; };
export const billTone = (s) => (s === "approved" ? { c: T.grn, bg: T.grnL }
  : s === "cancelled" ? { c: T.red, bg: T.redL } : { c: T.slt, bg: T.sltL });
export const BillPill = ({ s }) => { const k = billTone(s); return <Pill label={billStatusLabel(s)} c={k.c} bg={k.bg} />; };
// Antar ka rang: plus = maal kitaab se kam nikla (laal), minus = zyada nikla.
export const diffColor = (n) => (N(n) > 0.0001 ? T.red : N(n) < -0.0001 ? T.blu : T.t3);
export const GradePill = ({ g }) => <Pill label={g || "—"} c={T.ind} bg={T.indL} />;

export const Btn = ({ children, onClick, c = T.ind, disabled, icon: Icon, size = "md", ghost, style = {}, title, type = "button" }) => (
  <button onClick={onClick} disabled={disabled} type={type} title={title}
    style={{
      padding: size === "sm" ? "5px 10px" : "8px 14px", borderRadius: size === "sm" ? 7 : 9,
      border: ghost ? `1.5px solid ${T.b1}` : "none",
      background: disabled ? T.b1 : ghost ? T.surface : c,
      color: disabled ? T.t4 : ghost ? T.t2 : "#fff",
      fontSize: size === "sm" ? 11 : 12, fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", ...style,
    }}>{Icon && <Icon size={13} color="currentColor" />}{children}</button>
);

export const Panel = ({ title, action, children, style }) => (
  <div style={{ background: T.surface, border: `1.5px solid ${T.b1}`, borderRadius: 12, overflow: "hidden", ...style }}>
    {(title || action) && (
      <div style={{ padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{title}</span>
        {action}
      </div>
    )}
    {children}
  </div>
);

export const Row = ({ cols, children, head, onClick, style }) => (
  <div onClick={onClick}
    style={{
      display: "grid", gridTemplateColumns: cols, gap: 8, alignItems: "center",
      padding: head ? "9px 14px" : "10px 14px", borderBottom: `1px solid ${T.b1}`,
      background: head ? T.surface : "transparent",
      fontSize: head ? 10.5 : 12.5, fontWeight: head ? 700 : 400,
      color: head ? T.t3 : T.t2, textTransform: head ? "uppercase" : "none",
      letterSpacing: head ? ".4px" : "normal", cursor: onClick ? "pointer" : "default", ...(style || {}),
    }}>{children}</div>
);
export const Scroll = ({ children, minWidth }) => (
  <div style={{ overflowX: "auto" }}><div style={{ minWidth: minWidth || 0 }}>{children}</div></div>
);
export const Empty = ({ children }) => (
  <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 12.5, lineHeight: 1.6 }}>{children}</div>
);
export const Notice = ({ children, tone }) => (
  <div style={{
    border: `1px solid ${tone === "warn" ? "#EAD3A3" : T.indM}`, background: tone === "warn" ? T.ambL : T.indL,
    borderRadius: 10, padding: "10px 13px", fontSize: 11.5, color: tone === "warn" ? "#7A5306" : "#3B369E",
    lineHeight: 1.55, marginBottom: 14,
  }}>{children}</div>
);
export const ErrBox = ({ children }) => (children
  ? <div style={{ marginTop: 12, padding: "9px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 7, fontWeight: 600 }}>{children}</div>
  : null);

export const inp = {
  width: "100%", padding: "9px 11px", borderRadius: 8, border: `1.5px solid ${T.b1}`,
  fontSize: 12.5, outline: "none", fontFamily: "inherit", color: T.t1,
  background: T.surface, boxSizing: "border-box",
};
export const inpSm = { ...inp, padding: "6px 8px", fontSize: 12 };
export const Field = ({ label, children, hint, span }) => (
  <div style={{ gridColumn: span ? `span ${span}` : undefined, minWidth: 0 }}>
    <div style={{ fontSize: 11, color: T.t3, marginBottom: 5, fontWeight: 600 }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 4 }}>{hint}</div>}
  </div>
);
export const Grid = ({ children, cols = 2, style }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 12, ...(style || {}) }}>{children}</div>
);
export const KV = ({ k, v }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>{k}</div>
    <div style={{ fontSize: 12.5, color: T.t1, fontWeight: 600, marginTop: 2, wordBreak: "break-word" }}>{v == null || v === "" ? "—" : v}</div>
  </div>
);

export const SubTabs = ({ tabs, value, onChange }) => (
  <div style={{ display: "flex", gap: 2, borderBottom: `1.5px solid ${T.b1}`, marginBottom: 14, overflowX: "auto" }}>
    {tabs.map((x) => (
      <button key={x.id} type="button" onClick={() => onChange(x.id)}
        style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", background: "none", fontFamily: "inherit", marginBottom: "-1.5px", whiteSpace: "nowrap", color: value === x.id ? T.ind : T.t3, borderBottom: `2px solid ${value === x.id ? T.ind : "transparent"}` }}>
        {x.l}
      </button>
    ))}
  </div>
);

export const Spinner = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, flexDirection: "column", gap: 14 }}>
    <div style={{ width: 32, height: 32, border: "3px solid #E2E8F0", borderTopColor: T.ind, borderRadius: "50%", animation: "rmc-spin 0.7s linear infinite" }} />
    {label && <div style={{ fontSize: 12.5, color: "#8896A6" }}>{label}</div>}
    <style>{`@keyframes rmc-spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

export const Modal = ({ open, onClose, title, sub, width = 640, children, footer }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width, maxWidth: "94vw", maxHeight: "92vh", background: T.surface, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "15px 20px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: T.t1 }}>{title}</div>
            {sub && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} type="button" style={{ background: T.surfaceB, border: "none", borderRadius: 6, padding: 6, cursor: "pointer", display: "flex", flexShrink: 0 }}>
            <IcX size={15} color={T.t3} />
          </button>
        </div>
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
  );
};

export const Drawer = ({ open, onClose, title, sub, width = 660, children, footer, head }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width, maxWidth: "100vw", height: "100%", background: T.surface, boxShadow: "-8px 0 32px rgba(0,0,0,0.16)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "15px 20px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: T.t1, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{title}{head}</div>
            {sub && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} type="button" style={{ background: T.surfaceB, border: "none", borderRadius: 6, padding: 6, cursor: "pointer", display: "flex", flexShrink: 0 }}>
            <IcX size={15} color={T.t3} />
          </button>
        </div>
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
  );
};

// Kai photo — dispatch/receive dono par photo policy lag sakti hai
// (Settings › Photo Settings), isliye web par bhi upload ka rasta chahiye.
export const PhotosField = ({ value = [], onChange, label }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError(t("rmc.photo_too_big")); return; }
    setError(""); setBusy(true);
    try { onChange([...(value || []), await uploadPhoto(f)]); }
    catch (ex) { setError(ex.message || t("rmc.upload_failed")); }
    setBusy(false);
  };
  return (
    <Field label={label || t("rmc.photos")} hint={t("rmc.photo_hint")} span={2}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {(value || []).map((u, i) => (
          <span key={u + i} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1.5px solid ${T.b1}`, borderRadius: 8, padding: "5px 8px" }}>
            <a href={u} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: T.ind, fontWeight: 700, textDecoration: "none" }}>
              {t("rmc.photo_n", { n: i + 1 })}
            </a>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
              style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", display: "flex", padding: 0 }}>
              <IcX size={12} color="currentColor" />
            </button>
          </span>
        ))}
        <label style={{ ...inp, width: "auto", display: "inline-flex", alignItems: "center", cursor: busy ? "wait" : "pointer", color: busy ? T.t4 : T.t3 }}>
          {busy ? t("rmc.uploading") : t("rmc.photo_pick")}
          <input type="file" accept="image/*" capture="environment" onChange={pick} disabled={busy} style={{ display: "none" }} />
        </label>
      </div>
      {error && <div style={{ fontSize: 10.5, color: T.red, marginTop: 4, fontWeight: 600 }}>{error}</div>}
    </Field>
  );
};

// Date range — Reports aur list filters dono me ek hi shakl.
export const RangeBar = ({ value, onChange, right }) => (
  <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
    <Field label={t("common.from")}>
      <input type="date" style={{ ...inpSm, width: 150 }} value={value.from || ""} onChange={(e) => onChange({ ...value, from: e.target.value })} />
    </Field>
    <Field label={t("common.to")}>
      <input type="date" style={{ ...inpSm, width: 150 }} value={value.to || ""} onChange={(e) => onChange({ ...value, to: e.target.value })} />
    </Field>
    <span style={{ flex: 1 }} />
    {right}
  </div>
);
