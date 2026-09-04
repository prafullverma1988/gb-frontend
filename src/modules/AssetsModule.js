// ══════════════════════════════════════════════════════════════════════
// ASSETS MODULE — chhote equipment, shuttering plate, props, scaffolding,
// tools: kahan hai, kiske paas hai, kab gaya, wapas aaya ya nahi.
//
// Machinery se alag: wahan meter wali machine hai (JCB, mixer), yahan wo sab
// jo wapas aata hai par meter nahi rakhta. Warehouse se alag: wahan consume
// hone wala material hai. Warehouse module se sirf godown ka id/naam liya
// hai — koi screen share nahi.
//
// Ledger ka rule (backend, routes/assets.js): voucher banate hi cheez SOURCE
// se nikal jaati hai, destination me ACCEPT par aati hai. Beech ka samay =
// pending. Reject/cancel par sab wapas source me. GRN aur "khud ko" wale
// voucher turant accepted. Ye module wahi dikhata hai — apna koi ganit nahi.
//
// Phase 2 me teen cheezein aur judi hain:
//   • Ginti (physical verification) — ek jagah ki asli ginti kholo, bharo,
//     band karo. Band karte hi antar ek 'adjust' voucher me chala jaata hai;
//     jo line gini hi nahi gayi wo chhu bhi nahi jaati.
//   • Repair — vendor ek alag tarah ki jagah hai (holder_type "repair"),
//     na godown na site. Vendor app par hai hi nahi, isliye repair_out
//     banate hi accepted hota hai.
//   • Rent report — sirf report hai, kisi ledger me nahi jaati.
//
// Self-contained (own theme/icons/helpers), same as MachineryModule.
// API contract: gb-backend/docs/plans/asset-api-phase1.md + asset-api-phase2.md
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from "react";
import api, { API_BASE, getToken, getUser } from "../config/api";
import SearchSelect from "../components/SearchSelect";
import { useToast } from "../components/Toast";
import { t } from "../i18n";

// ── ICONS ─────────────────────────────────────────────────────────
const Ic = ({ d, size = 18, color = "currentColor", sw = 1.8, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const IcBox    = (p) => <Ic {...p} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />;
const IcHome   = (p) => <Ic {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />;
const IcStore  = (p) => <Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6" />;
const IcList   = (p) => <Ic {...p} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />;
const IcIn     = (p) => <Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const IcOut    = (p) => <Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const IcTrns   = (p) => <Ic {...p} d="M17 3l4 4-4 4M7 21l-4-4 4-4M21 7H3M21 17H3" />;
const IcUser   = (p) => <Ic {...p} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />;
const IcClock  = (p) => <Ic {...p} d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 7v5l3 2" />;
const IcAlert  = (p) => <Ic {...p} d="M10.3 3.9L1.8 18a2 2 0 001.7 3h16.9a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01" />;
const IcAdd    = (p) => <Ic {...p} d="M12 5v14M5 12h14" />;
const IcX      = (p) => <Ic {...p} d="M18 6L6 18M6 6l12 12" />;
const IcChk    = (p) => <Ic {...p} d="M20 6L9 17l-5-5" />;
const IcTrash  = (p) => <Ic {...p} d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" />;
const IcDown   = (p) => <Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const IcTag    = (p) => <Ic {...p} d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8zM7 7h.01" />;
const IcChart  = (p) => <Ic {...p} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />;
const IcRefresh = (p) => <Ic {...p} d="M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15" />;
const IcCount  = (p) => <Ic {...p} d="M9 4H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-2M9 4a2 2 0 002 2h2a2 2 0 002-2M9 4a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" />;
const IcTool   = (p) => <Ic {...p} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />;
const IcRupee  = (p) => <Ic {...p} d="M6 4h11M6 9h11M15.5 4c0 4.2-2.8 5-5.5 5H6l8 10" />;
const IcDoc    = (p) => <Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M15 13H9M15 17H9M10 9H9" />;

// ── THEME ─────────────────────────────────────────────────────────
const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA1B0",
  b1: "#E4E6EE", b2: "#D1D5DB", sb: "#0D1B2A",
  ind: "#4B45C4", indL: "#EEEDFB", indM: "#C7D2FE",
  blu: "#2563AC", bluL: "#E7F0FA",
  grn: "#1E8E5A", grnL: "#E4F5EC",
  amb: "#B27A0A", ambL: "#FBF3DF",
  red: "#C43A45", redL: "#FBE9EA",
  slt: "#64748B", sltL: "#F1F5F9",
};

// ── HELPERS ───────────────────────────────────────────────────────
const N = (v) => Number(v) || 0;
const fmtN = (n) => (n == null || n === "" ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
// Poora ankda (₹1,23,456) — store/accounts isi se milate hain, gol kiya hua kaam nahi aata.
const rupee = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtD = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.getDate() + " " + MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2);
};
const isoDate = (raw) => (raw ? String(raw).slice(0, 10) : "");
const todayStr = () => new Date().toLocaleDateString("en-CA");
const qs = (params) => Object.entries(params || {})
  .filter(([, v]) => v !== "" && v != null)
  .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

const typeLabel   = (ty) => (ty ? t("assets.type_" + ty) : "—");
const condLabel   = (c) => (c ? t("assets.cond_" + c) : "—");
// "repair" holder ki apni koi assets.holder_* key nahi hai — wo jagah vendor
// hai, holder nahi. Yahan na pakden to item drawer par raw key dikh jaati hai.
const holderLabel = (h) => (h === "repair" ? t("assets.repair_vendor") : h ? t("assets.holder_" + h) : "—");
const trackLabel  = (m) => t(m === "serialized" ? "assets.tracking_serialized" : "assets.tracking_bulk");
const itemStatusLabel = (s) => (s ? t("assets.istatus_" + s) : "—");

const UNITS = ["Nos", "Set", "Pcs", "Mtr", "Rft", "Sqm", "Sqft", "Kg", "Bundle", "Pair", "Box"];
const isMobileWidth = () => (typeof window !== "undefined" ? window.innerWidth < 768 : false);

// Status ka rang ek hi jagah tay hota hai — list, drawer aur dashboard kabhi
// alag-alag na bolein.
const statusTone = (s) =>
  s === "pending" ? { c: T.amb, bg: T.ambL }
  : s === "accepted" ? { c: T.grn, bg: T.grnL }
  : { c: T.slt, bg: T.sltL };
const condTone = (c) =>
  c === "good" ? { c: T.grn, bg: T.grnL }
  : c === "damaged" ? { c: T.amb, bg: T.ambL }
  : c === "lost" ? { c: T.red, bg: T.redL }
  : { c: T.slt, bg: T.sltL };
// Ginti ka status voucher wale se alag hai (draft/closed/cancelled) — apna tone.
const verifTone = (s) =>
  s === "draft" ? { c: T.amb, bg: T.ambL }
  : s === "closed" ? { c: T.grn, bg: T.grnL }
  : { c: T.slt, bg: T.sltL };
const verifStatusLabel = (s) => t(s === "closed" ? "assets.verify_closed" : s === "cancelled" ? "assets.status_cancelled" : "assets.verify_draft");

// Voucher ka ek sira (from / to) — jahan bhi voucher dikhta hai wahi shakl.
const sideText = (v, side) => {
  if (!v) return { main: "—", sub: "" };
  // Vendor ki jagah ka na godown hota hai na project — sirf holder_type "repair".
  if (v[side + "_holder_type"] === "repair") return { main: v[side + "_holder_name"] || t("assets.vendor"), sub: t("assets.repair_vendor") };
  if (v[side + "_warehouse_id"]) return { main: v[side + "_warehouse_name"] || t("assets.warehouse"), sub: t("assets.warehouse") };
  if (v[side + "_project_id"]) {
    return {
      main: v[side + "_holder_name"] || v[side + "_custodian_name"] || "—",
      sub: [v[side + "_project_name"], holderLabel(v[side + "_holder_type"])].filter(Boolean).join(" · "),
    };
  }
  if (side === "from" && v.type === "grn") return { main: v.vendor_name || t("assets.vendor"), sub: t("assets.vendor") };
  if (side === "from" && v.type === "opening") return { main: t("assets.type_opening"), sub: "" };
  // Adjust voucher ka koi "kahan se" nahi hota — wo ginti se paida hota hai.
  if (side === "from" && v.type === "adjust") return { main: t("assets.type_adjust"), sub: "" };
  return { main: "—", sub: "" };
};
// Ginti ki jagah — list aur drawer dono me ek hi shakl.
const verifWhere = (v) => (v && v.warehouse_id
  ? { main: v.warehouse_name || t("assets.warehouse"), sub: t("assets.warehouse") }
  : { main: (v && (v.holder_name || v.custodian_name)) || "—", sub: [v && v.project_name, holderLabel(v && v.holder_type)].filter(Boolean).join(" · ") });
// Holding ki jagah — Custody table aur item drawer me.
const holdingWhere = (h) => (h.warehouse_id ? h.warehouse_name || t("assets.warehouse")
  : h.holder_type === "repair" ? (h.repair_party || h.holder_name || t("assets.repair_vendor"))
  : h.project_name || "—");
const rentText = (h) => (h.charge_mode === "rent" && h.rent_rate
  ? `${rupee(h.rent_rate)}/${t(h.rent_basis === "month" ? "assets.basis_month" : "assets.basis_day")}`
  : t("assets.charge_free"));

// Photo — wahi Cloudinary preset jo baaki app use karta hai, module ke andar
// rakha (MachineryModule jaisa). Issue/return par photo policy lag sakti hai
// (Settings › Photo Settings › "Asset issue / return"), isliye web par bhi
// upload ka raasta chahiye.
const uploadPhoto = (file) => new Promise((resolve, reject) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "gb_buildcon_drawings");
  fd.append("folder", "gb_buildcon/assets");
  const xhr = new XMLHttpRequest();
  xhr.onload = () => {
    try {
      const d = JSON.parse(xhr.responseText);
      if (xhr.status === 200 && d.secure_url) resolve(d.secure_url);
      else reject(new Error((d.error && d.error.message) || t("assets.upload_failed")));
    } catch (_) { reject(new Error(t("assets.upload_failed"))); }
  };
  xhr.onerror = () => reject(new Error(t("assets.upload_failed")));
  xhr.open("POST", "https://api.cloudinary.com/v1_1/dd632nqfm/auto/upload");
  xhr.send(fd);
});

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};
// File laane wale endpoints (xlsx template, challan PDF) fetch se aate hain —
// seedha <a href> par token nahi jaata, isliye Authorization header khud lagta hai.
const fetchBlob = async (path, failMsg) => {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error(failMsg);
  return await res.blob();
};

// ── SHARED BITS ───────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, icon: Icon, onClick }) => (
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

const Pill = ({ label, c, bg }) => (
  <span style={{ display: "inline-block", background: bg, color: c, fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>{label}</span>
);
const StatusPill = ({ s }) => { const k = statusTone(s); return <Pill label={t("assets.status_" + (s || "pending"))} c={k.c} bg={k.bg} />; };
const CondPill = ({ c }) => { const k = condTone(c); return <Pill label={condLabel(c || "good")} c={k.c} bg={k.bg} />; };
const TypePill = ({ ty }) => (
  <Pill label={typeLabel(ty)}
    c={ty === "issue" ? T.ind : ty === "return" || ty === "repair_in" ? T.blu : ty === "grn" ? T.grn : ty === "repair_out" ? T.amb : T.t3}
    bg={ty === "issue" ? T.indL : ty === "return" || ty === "repair_in" ? T.bluL : ty === "grn" ? T.grnL : ty === "repair_out" ? T.ambL : T.sltL} />
);

const Btn = ({ children, onClick, c = T.ind, disabled, icon: Icon, size = "md", ghost, style = {}, title }) => (
  <button onClick={onClick} disabled={disabled} type="button" title={title}
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

const Panel = ({ title, action, children, style }) => (
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

const Row = ({ cols, children, head, onClick, style }) => (
  <div onClick={onClick}
    style={{
      display: "grid", gridTemplateColumns: cols, gap: 8, alignItems: "center",
      padding: head ? "9px 14px" : "10px 14px",
      borderBottom: `1px solid ${T.b1}`,
      background: head ? T.surface : "transparent",
      fontSize: head ? 10.5 : 12.5,
      fontWeight: head ? 700 : 400,
      color: head ? T.t3 : T.t2,
      textTransform: head ? "uppercase" : "none",
      letterSpacing: head ? ".4px" : "normal",
      cursor: onClick ? "pointer" : "default",
      ...(style || {}),
    }}>{children}</div>
);
// Table jo screen se chaudi ho to apne andar scroll kare — page kabhi side me na khisake.
const Scroll = ({ children, minWidth }) => (
  <div style={{ overflowX: "auto" }}><div style={{ minWidth: minWidth || 0 }}>{children}</div></div>
);

const Empty = ({ children }) => (
  <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 12.5, lineHeight: 1.6 }}>{children}</div>
);

const Notice = ({ children, tone }) => (
  <div style={{
    border: `1px solid ${tone === "warn" ? "#EAD3A3" : T.indM}`, background: tone === "warn" ? T.ambL : T.indL,
    borderRadius: 10, padding: "10px 13px", fontSize: 11.5, color: tone === "warn" ? "#7A5306" : "#3B369E", lineHeight: 1.55, marginBottom: 14,
  }}>{children}</div>
);

const ErrBox = ({ children }) => (children
  ? <div style={{ marginTop: 12, padding: "9px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 7, fontWeight: 600 }}>{children}</div>
  : null);

const inp = {
  width: "100%", padding: "9px 11px", borderRadius: 8, border: `1.5px solid ${T.b1}`,
  fontSize: 12.5, outline: "none", fontFamily: "inherit", color: T.t1,
  background: T.surface, boxSizing: "border-box",
};
const inpSm = { ...inp, padding: "6px 8px", fontSize: 12 };
const Field = ({ label, children, hint, span }) => (
  <div style={{ gridColumn: span ? `span ${span}` : undefined, minWidth: 0 }}>
    <div style={{ fontSize: 11, color: T.t3, marginBottom: 5, fontWeight: 600 }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 4 }}>{hint}</div>}
  </div>
);
const KV = ({ k, v }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>{k}</div>
    <div style={{ fontSize: 12.5, color: T.t1, fontWeight: 600, marginTop: 2, wordBreak: "break-word" }}>{v == null || v === "" ? "—" : v}</div>
  </div>
);

// Segmented switch — Custody ke views, tracking filter waghera.
const Seg = ({ value, onChange, options }) => (
  <div style={{ display: "inline-flex", border: `1.5px solid ${T.b1}`, borderRadius: 9, overflow: "hidden", background: T.surface }}>
    {options.map((o) => (
      <button key={o.k} type="button" onClick={() => onChange(o.k)}
        style={{ padding: "6px 12px", fontSize: 11.5, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit",
          background: value === o.k ? T.indL : "transparent", color: value === o.k ? T.ind : T.t3 }}>
        {o.l}
      </button>
    ))}
  </div>
);

const Modal = ({ open, onClose, title, sub, width = 620, children, footer }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width, maxWidth: "94vw", maxHeight: "92vh", background: T.surface, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "15px 20px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: T.t1 }}>{title}</div>
            {sub && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} type="button" style={{ background: T.surfaceB, border: "none", borderRadius: 6, padding: 6, cursor: "pointer", display: "flex" }}>
            <IcX size={15} color={T.t3} />
          </button>
        </div>
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
  );
};

// Detail ke liye daayi taraf ka slide-over — voucher/item kholte waqt peeche
// ki list dikhti rehti hai, aadmi apni jagah nahi bhoolta.
const Drawer = ({ open, onClose, title, sub, width = 640, children, footer, head }) => {
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

const SubTabs = ({ tabs, value, onChange }) => (
  <div style={{ display: "flex", gap: 2, borderBottom: `1.5px solid ${T.b1}`, marginBottom: 14 }}>
    {tabs.map((x) => (
      <button key={x.id} type="button" onClick={() => onChange(x.id)}
        style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", background: "none", fontFamily: "inherit", marginBottom: "-1.5px", color: value === x.id ? T.ind : T.t3, borderBottom: `2px solid ${value === x.id ? T.ind : "transparent"}` }}>
        {x.l}
      </button>
    ))}
  </div>
);

const Spinner = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, flexDirection: "column", gap: 14 }}>
    <div style={{ width: 32, height: 32, border: "3px solid #E2E8F0", borderTopColor: T.ind, borderRadius: "50%", animation: "assets-spin 0.7s linear infinite" }} />
    {label && <div style={{ fontSize: 12.5, color: "#8896A6" }}>{label}</div>}
    <style>{`@keyframes assets-spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const PhotoField = ({ value, onChange }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError(t("assets.photo_too_big")); return; }
    setError(""); setBusy(true);
    try { onChange(await uploadPhoto(f)); }
    catch (ex) { setError(ex.message || t("assets.upload_failed")); }
    setBusy(false);
  };
  return (
    <Field label={t("assets.photo_optional")} hint={t("assets.photo_hint")}>
      {value ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href={value} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: T.ind, fontWeight: 700, textDecoration: "none" }}>{t("assets.photo_view")}</a>
          <button type="button" onClick={() => onChange("")}
            style={{ background: "none", border: "none", color: T.t3, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{t("assets.remove")}</button>
        </div>
      ) : (
        <label style={{ ...inp, display: "flex", alignItems: "center", cursor: busy ? "wait" : "pointer", color: busy ? T.t4 : T.t3 }}>
          {busy ? t("assets.uploading") : t("assets.photo_pick")}
          <input type="file" accept="image/*" capture="environment" onChange={pick} disabled={busy} style={{ display: "none" }} />
        </label>
      )}
      {error && <div style={{ fontSize: 10.5, color: T.red, marginTop: 4, fontWeight: 600 }}>{error}</div>}
    </Field>
  );
};

// Ek hi jagah: "kis project par, kiske paas, zimmedar kaun" — Issue aur
// Transfer dono isi ko use karte hain taaki dono me ek jaisa lage.
function ToSiteFields({ v, onChange, pickers, me }) {
  const upd = (k, val) => onChange({ ...v, [k]: val });
  const holderList = v.holder_type === "worker" ? pickers.workers : v.holder_type === "subcon" ? pickers.subcons : pickers.users;
  return (
    <>
      <Field label={t("assets.project")} span={2}>
        <SearchSelect value={v.project_id || ""} onChange={(k) => upd("project_id", k)} accent={T.ind}
          options={(pickers.projects || []).map((p) => ({ id: p.id, name: p.name }))} placeholder={t("assets.select_project")} />
      </Field>
      <Field label={t("assets.holder_type")}>
        <select value={v.holder_type || "user"} style={inp}
          onChange={(e) => onChange({ ...v, holder_type: e.target.value, holder_id: "", custodian_user_id: e.target.value === "user" ? "" : (v.custodian_user_id || String(me.id || "")) })}>
          <option value="user">{t("assets.holder_user")}</option>
          <option value="worker">{t("assets.holder_worker")}</option>
          <option value="subcon">{t("assets.holder_subcon")}</option>
        </select>
      </Field>
      <Field label={t("assets.holder")}>
        <SearchSelect value={v.holder_id || ""} accent={T.ind}
          onChange={(k) => onChange({ ...v, holder_id: k, custodian_user_id: (v.holder_type || "user") === "user" ? k : v.custodian_user_id })}
          options={(holderList || []).map((h) => ({ id: h.id, name: h.name + (h.trade ? ` · ${h.trade}` : h.role ? ` · ${h.role}` : "") }))}
          placeholder={t("assets.select_holder")} />
      </Field>
      <Field label={t("assets.custodian")} span={2}
        hint={(v.holder_type || "user") === "user" ? t("assets.custodian_auto_hint") : t("assets.custodian_hint")}>
        {(v.holder_type || "user") === "user" ? (
          <input value={((pickers.users || []).find((u) => String(u.id) === String(v.holder_id)) || {}).name || ""} readOnly style={{ ...inp, background: T.surfaceB, color: T.t3 }} placeholder={t("assets.custodian_same_as_holder")} />
        ) : (
          <SearchSelect value={v.custodian_user_id || ""} onChange={(k) => upd("custodian_user_id", k)} accent={T.ind}
            options={(pickers.users || []).map((u) => ({ id: u.id, name: u.name + (u.role ? ` · ${u.role}` : "") }))} placeholder={t("assets.select_custodian")} />
        )}
      </Field>
    </>
  );
}
const siteLocValid = (v) => !!(v.project_id && v.holder_type && v.holder_id && ((v.holder_type === "user") || v.custodian_user_id));
const siteLocBody = (v) => ({
  project_id: Number(v.project_id), holder_type: v.holder_type, holder_id: Number(v.holder_id),
  custodian_user_id: v.holder_type === "user" ? Number(v.holder_id) : Number(v.custodian_user_id),
});

// Rent sirf worker/subcon holder par — user ko apni company ka saaman
// kiraye par nahi milta. Field tabhi dikhti hai jab holder waisa ho.
function RentCell({ ln, onChange, enabled }) {
  if (!enabled) return <span style={{ fontSize: 11, color: T.t4 }}>{t("assets.charge_free")}</span>;
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <select value={ln.charge_mode || "free"} onChange={(e) => onChange({ ...ln, charge_mode: e.target.value })} style={{ ...inpSm, width: 74 }}>
        <option value="free">{t("assets.charge_free")}</option>
        <option value="rent">{t("assets.charge_rent")}</option>
      </select>
      {ln.charge_mode === "rent" && (
        <>
          <input value={ln.rent_rate || ""} inputMode="decimal" placeholder="₹"
            onChange={(e) => onChange({ ...ln, rent_rate: e.target.value.replace(/[^0-9.]/g, "") })} style={{ ...inpSm, width: 64 }} />
          <select value={ln.rent_basis || "day"} onChange={(e) => onChange({ ...ln, rent_basis: e.target.value })} style={{ ...inpSm, width: 78 }}>
            <option value="day">{t("assets.per_day")}</option>
            <option value="month">{t("assets.per_month")}</option>
          </select>
        </>
      )}
    </div>
  );
}

const lineLabel = (h) => [h.code, [h.name, h.spec].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
const isRepairType = (ty) => ty === "repair_out" || ty === "repair_in";
// Vendor ki jagah — na warehouse_id, na project_id; sirf party ki id.
const repairLoc = (partyId) => ({ holder_type: "repair", holder_id: Number(partyId) });

// ══════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════
function DashboardTab({ dash, onOpenVoucher, onGo }) {
  if (!dash) return <Empty>{t("assets.dash_empty")}</Empty>;
  const k = dash.tiles || {};
  const totalItems = N(k.serialized_items) + N(k.bulk_items);
  const tiles = [
    { l: t("assets.tile_total"), v: fmtN(totalItems), sub: t("assets.tile_total_sub", { s: N(k.serialized_items), b: N(k.bulk_items) }), c: T.ind, I: IcBox, go: "register" },
    { l: t("assets.tile_in_store"), v: fmtN(k.in_store_qty), sub: t("assets.tile_in_store_sub"), c: T.blu, I: IcStore, go: "custody" },
    { l: t("assets.tile_deployed"), v: fmtN(k.deployed_qty), sub: t("assets.tile_deployed_sub"), c: T.grn, I: IcHome, go: "custody" },
    { l: t("assets.tile_subcon"), v: fmtN(k.with_subcon_qty), sub: t("assets.tile_subcon_sub", { n: fmtN(k.on_rent_qty) }), c: T.slt, I: IcUser, go: "custody" },
    { l: t("assets.tile_pending"), v: fmtN(k.awaiting_accept), sub: t("assets.tile_pending_sub"), c: N(k.awaiting_accept) ? T.amb : T.grn, I: IcClock, go: "movements" },
    { l: t("assets.tile_overdue"), v: fmtN(k.overdue), sub: t("assets.tile_overdue_sub"), c: N(k.overdue) ? T.red : T.grn, I: IcAlert },
    { l: t("assets.tile_damaged"), v: fmtN(k.damaged_qty), sub: t("assets.tile_damaged_sub", { n: fmtN(k.under_repair) }), c: N(k.damaged_qty) ? T.amb : T.grn, I: IcAlert },
    // under_repair ab ginti nahi, qty hai (Phase 2) — vendor ke paas pada kul.
    { l: t("assets.tile_repair"), v: fmtN(k.under_repair), sub: t("assets.tile_repair_sub"), c: N(k.under_repair) ? T.amb : T.grn, I: IcTool, go: "movements" },
    { l: t("assets.tile_lost"), v: fmtN(k.lost_qty_fy), sub: t("assets.tile_lost_sub"), c: N(k.lost_qty_fy) ? T.red : T.grn, I: IcTag },
    { l: t("assets.tile_verify"), v: fmtN(k.open_verifications), sub: t("assets.tile_verify_sub"), c: N(k.open_verifications) ? T.ind : T.grn, I: IcCount, go: "verify" },
  ];
  const two = { display: "grid", gridTemplateColumns: isMobileWidth() ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: isMobileWidth() ? "1fr 1fr" : "repeat(4,1fr)", gap: 12, marginBottom: 14 }}>
        {tiles.map((s, i) => <StatCard key={i} label={s.l} value={s.v} sub={s.sub} color={s.c} icon={s.I} onClick={s.go && onGo ? () => onGo(s.go) : undefined} />)}
      </div>

      <div style={two}>
        <Panel title={t("assets.pending_title")}>
          {(dash.pending || []).length === 0 && <Empty>{t("assets.pending_empty")}</Empty>}
          {(dash.pending || []).map((v) => {
            const f = sideText(v, "from"), to = sideText(v, "to");
            return (
              <Row key={v.id} cols="1.1fr 1.4fr 60px 70px" onClick={() => onOpenVoucher(v.id)}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{v.voucher_no}</div>
                  <div style={{ fontSize: 10.5, color: T.t4 }}>{typeLabel(v.type)} · {fmtD(v.date)}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.main} → <b>{to.main}</b></div>
                  <div style={{ fontSize: 10.5, color: T.t4 }}>{to.sub || f.sub}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtN(v.total_qty)}</span>
                <span><Pill label={t("assets.days_waiting", { n: N(v.days_waiting) })} c={N(v.days_waiting) >= 3 ? T.red : T.amb} bg={N(v.days_waiting) >= 3 ? T.redL : T.ambL} /></span>
              </Row>
            );
          })}
        </Panel>
        <Panel title={t("assets.overdue_title")}>
          {(dash.overdue || []).length === 0 && <Empty>{t("assets.overdue_empty")}</Empty>}
          {(dash.overdue || []).map((v) => {
            const to = sideText(v, "to");
            return (
              <Row key={v.id} cols="1.1fr 1.4fr 80px 80px" onClick={() => onOpenVoucher(v.id)}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{v.voucher_no}</div>
                  <div style={{ fontSize: 10.5, color: T.t4 }}>{typeLabel(v.type)} · {fmtD(v.date)}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{to.main}</div>
                  <div style={{ fontSize: 10.5, color: T.t4 }}>{to.sub}{v.to_custodian_name ? ` · ${v.to_custodian_name}` : ""}</div>
                </div>
                <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(v.expected_return_date)}</span>
                <span><Pill label={t("assets.days_overdue", { n: N(v.days_overdue) })} c={T.red} bg={T.redL} /></span>
              </Row>
            );
          })}
        </Panel>
      </div>

      <div style={two}>
        <Panel title={t("assets.by_project")}>
          {(dash.by_project || []).length === 0 && <Empty>{t("assets.nothing_on_site")}</Empty>}
          {(dash.by_project || []).length > 0 && (
            <Row head cols="1.6fr 60px 70px 70px 80px"><span>{t("assets.project")}</span><span>{t("assets.items")}</span><span>{t("assets.qty")}</span><span>{t("assets.damaged")}</span><span>{t("assets.custodians")}</span></Row>
          )}
          {(dash.by_project || []).map((r) => (
            <Row key={r.project_id} cols="1.6fr 60px 70px 70px 80px">
              <span style={{ fontWeight: 600, color: T.t1 }}>{r.project_name}</span>
              <span>{fmtN(r.items)}</span><span>{fmtN(r.qty)}</span>
              <span style={{ color: N(r.damaged_qty) ? T.amb : T.t4 }}>{fmtN(r.damaged_qty)}</span>
              <span>{fmtN(r.custodians)}</span>
            </Row>
          ))}
        </Panel>
        <Panel title={t("assets.by_custodian")}>
          {(dash.by_custodian || []).length === 0 && <Empty>{t("assets.nothing_on_site")}</Empty>}
          {(dash.by_custodian || []).length > 0 && (
            <Row head cols="1.6fr 60px 70px 90px 80px"><span>{t("assets.custodian")}</span><span>{t("assets.items")}</span><span>{t("assets.qty")}</span><span>{t("assets.via_others")}</span><span>{t("assets.since")}</span></Row>
          )}
          {(dash.by_custodian || []).map((r) => (
            <Row key={r.custodian_user_id} cols="1.6fr 60px 70px 90px 80px">
              <div><div style={{ fontWeight: 600, color: T.t1 }}>{r.custodian_name}</div><div style={{ fontSize: 10.5, color: T.t4 }}>{r.role || ""}</div></div>
              <span>{fmtN(r.items)}</span><span>{fmtN(r.qty)}</span>
              <span style={{ color: T.t3 }}>{fmtN(r.via_others_qty)}</span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(r.since_date)}</span>
            </Row>
          ))}
        </Panel>
      </div>

      <div style={two}>
        <Panel title={t("assets.by_holder")}>
          {(dash.by_holder || []).length === 0 && <Empty>{t("assets.holder_empty")}</Empty>}
          {(dash.by_holder || []).length > 0 && (
            <Row head cols="1.6fr 80px 60px 70px 80px"><span>{t("assets.holder")}</span><span>{t("assets.type")}</span><span>{t("assets.items")}</span><span>{t("assets.qty")}</span><span>{t("assets.on_rent")}</span></Row>
          )}
          {(dash.by_holder || []).map((r) => (
            <Row key={r.holder_type + "-" + r.holder_id} cols="1.6fr 80px 60px 70px 80px">
              <span style={{ fontWeight: 600, color: T.t1 }}>{r.holder_name || "—"}</span>
              <span><Pill label={holderLabel(r.holder_type)} c={T.t3} bg={T.sltL} /></span>
              <span>{fmtN(r.items)}</span><span>{fmtN(r.qty)}</span>
              <span style={{ color: N(r.rent_qty) ? T.ind : T.t4 }}>{fmtN(r.rent_qty)}</span>
            </Row>
          ))}
        </Panel>
        <Panel title={t("assets.by_warehouse")}>
          {(dash.by_warehouse || []).length === 0 && <Empty>{t("assets.warehouse_empty")}</Empty>}
          {(dash.by_warehouse || []).length > 0 && (
            <Row head cols="1.6fr 60px 70px 70px"><span>{t("assets.warehouse")}</span><span>{t("assets.items")}</span><span>{t("assets.qty")}</span><span>{t("assets.damaged")}</span></Row>
          )}
          {(dash.by_warehouse || []).map((r) => (
            <Row key={r.warehouse_id} cols="1.6fr 60px 70px 70px">
              <span style={{ fontWeight: 600, color: T.t1 }}>{r.warehouse_name}</span>
              <span>{fmtN(r.items)}</span><span>{fmtN(r.qty)}</span>
              <span style={{ color: N(r.damaged_qty) ? T.amb : T.t4 }}>{fmtN(r.damaged_qty)}</span>
            </Row>
          ))}
        </Panel>
      </div>

      <Panel title={t("assets.recent_title")}>
        {(dash.recent || []).length === 0 && <Empty>{t("assets.recent_empty")}</Empty>}
        {(dash.recent || []).length > 0 && (
          <Scroll minWidth={620}>
            <Row head cols="120px 80px 90px 1.4fr 1.4fr 60px 90px"><span>{t("assets.voucher")}</span><span>{t("assets.date")}</span><span>{t("assets.type")}</span><span>{t("assets.from")}</span><span>{t("assets.to")}</span><span>{t("assets.qty")}</span><span>{t("assets.status")}</span></Row>
            {(dash.recent || []).map((v) => {
              const f = sideText(v, "from"), to = sideText(v, "to");
              return (
                <Row key={v.id} cols="120px 80px 90px 1.4fr 1.4fr 60px 90px" onClick={() => onOpenVoucher(v.id)}>
                  <span style={{ fontWeight: 600, color: T.t1 }}>{v.voucher_no}</span>
                  <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(v.date)}</span>
                  <span><TypePill ty={v.type} /></span>
                  <div style={{ minWidth: 0 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.main}</div><div style={{ fontSize: 10.5, color: T.t4 }}>{f.sub}</div></div>
                  <div style={{ minWidth: 0 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{to.main}</div><div style={{ fontSize: 10.5, color: T.t4 }}>{to.sub}</div></div>
                  <span>{fmtN(v.total_qty)}</span>
                  <span><StatusPill s={v.status} /></span>
                </Row>
              );
            })}
          </Scroll>
        )}
      </Panel>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// REGISTER
// ══════════════════════════════════════════════════════════════════
function RegisterTab({ items, cats, canEdit, canCreate, onOpenItem, onCats, onIncharge, onImport }) {
  const [q, setQ] = useState("");
  const [tracking, setTracking] = useState("");
  const [cat, setCat] = useState("");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (items || []).filter((i) =>
      (!tracking || i.tracking_mode === tracking) &&
      (!cat || String(i.category_id) === String(cat)) &&
      (!s || [i.code, i.name, i.spec, i.category].some((x) => String(x || "").toLowerCase().includes(s))));
  }, [items, q, tracking, cat]);

  const cols = "100px 1.6fr 1fr 60px 84px 96px 64px 64px 64px 64px";
  return (
    <Panel title={t("assets.register_title", { n: rows.length })}
      action={
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {canEdit && <Btn size="sm" ghost icon={IcTag} onClick={onCats}>{t("assets.btn_categories")}</Btn>}
          {canEdit && <Btn size="sm" ghost icon={IcUser} onClick={onIncharge}>{t("assets.btn_incharge")}</Btn>}
          {canCreate && <Btn size="sm" ghost icon={IcDown} onClick={onImport}>{t("assets.btn_import")}</Btn>}
        </div>}>
      <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap", alignItems: "center" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("assets.search_ph")} style={{ ...inp, width: 240 }} />
        <Seg value={tracking} onChange={setTracking} options={[{ k: "", l: t("assets.all") }, { k: "serialized", l: t("assets.tracking_serialized") }, { k: "bulk", l: t("assets.tracking_bulk") }]} />
        <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ ...inp, width: 180 }}>
          <option value="">{t("assets.all_categories")}</option>
          {(cats || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {rows.length === 0 && (
        <Empty>
          {(items || []).length === 0 ? t("assets.register_empty") : t("assets.no_match")}<br />
          {(items || []).length === 0 && <span style={{ fontSize: 11.5 }}>{t("assets.register_empty_hint")}</span>}
        </Empty>
      )}
      {rows.length > 0 && (
        <Scroll minWidth={900}>
          <Row head cols={cols}>
            <span>{t("assets.code")}</span><span>{t("assets.item")}</span><span>{t("assets.spec")}</span><span>{t("assets.unit")}</span>
            <span>{t("assets.type")}</span><span>{t("assets.status")}</span><span>{t("assets.total")}</span><span>{t("assets.in_store")}</span><span>{t("assets.deployed")}</span><span>{t("assets.damaged")}</span>
          </Row>
          {rows.map((i) => (
            <Row key={i.id} cols={cols} onClick={() => onOpenItem(i)}>
              <span style={{ fontSize: 11.5, color: T.t3, fontFamily: "monospace" }}>{i.code || "—"}</span>
              <div><div style={{ fontWeight: 600, color: T.t1 }}>{i.name}</div><div style={{ fontSize: 10.5, color: T.t4 }}>{i.category || ""}</div></div>
              <span style={{ color: T.t3 }}>{i.spec || "—"}</span>
              <span style={{ color: T.t3 }}>{i.unit || "—"}</span>
              <span><Pill label={trackLabel(i.tracking_mode)} c={i.tracking_mode === "serialized" ? T.ind : T.t3} bg={i.tracking_mode === "serialized" ? T.indL : T.sltL} /></span>
              <span>{i.tracking_mode === "serialized"
                ? <Pill label={itemStatusLabel(i.status)} c={["damaged", "lost", "scrapped"].includes(i.status) ? T.red : i.status === "repair" ? T.amb : i.status === "issued" ? T.blu : T.grn}
                    bg={["damaged", "lost", "scrapped"].includes(i.status) ? T.redL : i.status === "repair" ? T.ambL : i.status === "issued" ? T.bluL : T.grnL} />
                : <span style={{ color: T.t4 }}>—</span>}</span>
              <span style={{ fontWeight: 600 }}>{fmtN(i.total_qty)}</span>
              <span>{fmtN(i.in_store_qty)}</span>
              <span>{fmtN(i.deployed_qty)}</span>
              <span style={{ color: N(i.damaged_qty) ? T.amb : T.t4 }}>{fmtN(i.damaged_qty)}</span>
            </Row>
          ))}
        </Scroll>
      )}
    </Panel>
  );
}

// ── ITEM DRAWER — details (edit), kahan hai, history ─────────────
function ItemDrawer({ item, cats, canEdit, onClose, onChanged, onOpenVoucher }) {
  const toast = useToast();
  const [tab, setTab] = useState("details");
  const [f, setF] = useState({});
  const [holdings, setHoldings] = useState(null);
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = item && item.id;

  // Tab sirf item badalne par reset ho — background refresh (voucher accept
  // ke baad list dobara aayi) par aadmi History se Details par na gire.
  useEffect(() => { setTab("details"); }, [id]);
  useEffect(() => {
    if (!item) return;
    setError("");
    setF({
      name: item.name || "", spec: item.spec || "", unit: item.unit || "", category_id: item.category_id || "",
      purchase_date: isoDate(item.purchase_date), purchase_cost: item.purchase_cost == null ? "" : String(item.purchase_cost),
      vendor_name: item.vendor_name || "", notes: item.notes || "",
    });
  }, [item]);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setHoldings(null); setHistory(null);
    Promise.all([
      api.get(`/assets/items/${id}/holdings`).catch(() => null),
      api.get(`/assets/items/${id}/history`).catch(() => null),
    ]).then(([h, hs]) => {
      if (!alive) return;
      setHoldings(h && h.success ? h.data || [] : []);
      setHistory(hs && hs.success ? hs.data || [] : []);
    });
    return () => { alive = false; };
  }, [id]);

  if (!item) return null;
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setError("");
    if (!String(f.name || "").trim()) { setError(t("assets.err_name_required")); return; }
    setBusy(true);
    const r = await api.put(`/assets/items/${id}`, {
      name: f.name.trim(), spec: f.spec, unit: f.unit || null, category_id: f.category_id || null,
      purchase_date: f.purchase_date || null, purchase_cost: f.purchase_cost === "" ? null : Number(f.purchase_cost),
      vendor_name: f.vendor_name, notes: f.notes,
    });
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.saved")); onChanged(); }
    else setError((r && r.message) || t("assets.save_failed"));
  };

  const TABS = [
    { id: "details", l: t("assets.item_tab_details") },
    { id: "where", l: t("assets.item_tab_where") },
    { id: "history", l: t("assets.item_tab_history") },
  ];

  return (
    <Drawer open onClose={onClose} width={680}
      title={[item.code, item.name].filter(Boolean).join(" · ")}
      sub={[item.spec, item.category, trackLabel(item.tracking_mode)].filter(Boolean).join(" · ")}
      head={item.tracking_mode === "serialized" ? <Pill label={itemStatusLabel(item.status)} c={T.ind} bg={T.indL} /> : null}
      footer={tab === "details" && canEdit
        ? <><Btn ghost onClick={onClose}>{t("assets.close")}</Btn><Btn onClick={save} disabled={busy}>{busy ? t("assets.saving") : t("assets.save")}</Btn></>
        : <Btn ghost onClick={onClose}>{t("assets.close")}</Btn>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, padding: "10px 12px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 10, marginBottom: 14 }}>
        <KV k={t("assets.total")} v={fmtN(item.total_qty)} />
        <KV k={t("assets.in_store")} v={fmtN(item.in_store_qty)} />
        <KV k={t("assets.deployed")} v={fmtN(item.deployed_qty)} />
        <KV k={t("assets.damaged")} v={fmtN(item.damaged_qty)} />
      </div>
      <SubTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "details" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={t("assets.item_name")} span={2}>
            <input value={f.name || ""} onChange={(e) => upd("name", e.target.value)} style={inp} readOnly={!canEdit} />
          </Field>
          <Field label={t("assets.spec")}>
            <input value={f.spec || ""} onChange={(e) => upd("spec", e.target.value)} style={inp} readOnly={!canEdit} />
          </Field>
          <Field label={t("assets.unit")}>
            <input value={f.unit || ""} onChange={(e) => upd("unit", e.target.value)} style={inp} readOnly={!canEdit} list="assets-units" />
          </Field>
          <Field label={t("assets.category")}>
            <select value={f.category_id || ""} onChange={(e) => upd("category_id", e.target.value)} style={inp} disabled={!canEdit}>
              <option value="">—</option>
              {(cats || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={t("assets.tracking")}>
            <input value={trackLabel(item.tracking_mode)} readOnly style={{ ...inp, background: T.surfaceB, color: T.t3 }} />
          </Field>
          <Field label={t("assets.purchase_date")}>
            <input type="date" value={f.purchase_date || ""} onChange={(e) => upd("purchase_date", e.target.value)} style={inp} readOnly={!canEdit} />
          </Field>
          <Field label={t("assets.purchase_cost")}>
            <input value={f.purchase_cost || ""} inputMode="decimal" onChange={(e) => upd("purchase_cost", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} readOnly={!canEdit} />
          </Field>
          <Field label={t("assets.vendor")} span={2}>
            <input value={f.vendor_name || ""} onChange={(e) => upd("vendor_name", e.target.value)} style={inp} readOnly={!canEdit} />
          </Field>
          <Field label={t("assets.notes")} span={2}>
            <textarea value={f.notes || ""} onChange={(e) => upd("notes", e.target.value)} style={{ ...inp, minHeight: 64, resize: "vertical" }} readOnly={!canEdit} />
          </Field>
          {item.photo_url && (
            <Field label={t("assets.photo")} span={2}>
              <a href={item.photo_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.ind, fontWeight: 700 }}>{t("assets.photo_view")}</a>
            </Field>
          )}
          <div style={{ gridColumn: "span 2" }}><ErrBox>{error}</ErrBox></div>
        </div>
      )}

      {tab === "where" && (
        <Panel>
          {holdings == null && <Spinner />}
          {holdings && holdings.length === 0 && <Empty>{t("assets.item_where_empty")}</Empty>}
          {holdings && holdings.length > 0 && (
            <>
              <Row head cols="1.3fr 1.1fr 1.1fr 60px 70px 80px 90px"><span>{t("assets.where")}</span><span>{t("assets.holder")}</span><span>{t("assets.custodian")}</span><span>{t("assets.good")}</span><span>{t("assets.damaged")}</span><span>{t("assets.since")}</span><span>{t("assets.rent")}</span></Row>
              {holdings.map((h) => (
                <Row key={h.id} cols="1.3fr 1.1fr 1.1fr 60px 70px 80px 90px">
                  <div><div style={{ fontWeight: 600, color: T.t1 }}>{holdingWhere(h)}</div><div style={{ fontSize: 10.5, color: T.t4 }}>{h.warehouse_id ? t("assets.warehouse") : h.holder_type === "repair" ? t("assets.repair_vendor") : t("assets.site")}</div></div>
                  <span>{h.warehouse_id ? t("assets.holder_store") : h.holder_type === "repair" ? holderLabel(h.holder_type) : `${h.holder_name || "—"} · ${holderLabel(h.holder_type)}`}</span>
                  <span>{h.custodian_name || "—"}</span>
                  <span style={{ fontWeight: 600 }}>{fmtN(h.qty_good)}</span>
                  <span style={{ color: N(h.qty_damaged) ? T.amb : T.t4 }}>{fmtN(h.qty_damaged)}</span>
                  <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(h.since_date)}</span>
                  <span style={{ fontSize: 11.5 }}>{h.warehouse_id ? "—" : rentText(h)}</span>
                </Row>
              ))}
            </>
          )}
        </Panel>
      )}

      {tab === "history" && (
        <Panel>
          {history == null && <Spinner />}
          {history && history.length === 0 && <Empty>{t("assets.item_history_empty")}</Empty>}
          {history && history.length > 0 && (
            <>
              <Row head cols="120px 80px 90px 1.3fr 1.3fr 60px 90px"><span>{t("assets.voucher")}</span><span>{t("assets.date")}</span><span>{t("assets.type")}</span><span>{t("assets.from")}</span><span>{t("assets.to")}</span><span>{t("assets.qty")}</span><span>{t("assets.status")}</span></Row>
              {history.map((v, i) => {
                const f = sideText(v, "from"), to = sideText(v, "to");
                return (
                  <Row key={v.id + "-" + i} cols="120px 80px 90px 1.3fr 1.3fr 60px 90px" onClick={() => onOpenVoucher(v.id)}>
                    <span style={{ fontWeight: 600, color: T.t1 }}>{v.voucher_no}</span>
                    <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(v.date)}</span>
                    <span><TypePill ty={v.type} /></span>
                    <div style={{ minWidth: 0 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.main}</div><div style={{ fontSize: 10.5, color: T.t4 }}>{f.sub}</div></div>
                    <div style={{ minWidth: 0 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{to.main}</div><div style={{ fontSize: 10.5, color: T.t4 }}>{to.sub}</div></div>
                    <div><div>{fmtN(v.qty)}</div>{v.accepted_qty != null && v.status === "accepted" && N(v.accepted_qty) !== N(v.qty) && <div style={{ fontSize: 10, color: T.amb }}>{t("assets.accepted_n", { n: fmtN(v.accepted_qty) })}</div>}</div>
                    <span><StatusPill s={v.status} /></span>
                  </Row>
                );
              })}
            </>
          )}
        </Panel>
      )}
      <datalist id="assets-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
    </Drawer>
  );
}

// ── CATEGORIES ────────────────────────────────────────────────────
function CategoriesModal({ open, cats, onClose, onChanged }) {
  const toast = useToast();
  const [add, setAdd] = useState({ name: "", tracking_mode: "bulk", default_unit: "Nos" });
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setEdit(null); setError(""); setAdd({ name: "", tracking_mode: "bulk", default_unit: "Nos" }); } }, [open]);

  const create = async () => {
    setError("");
    if (!add.name.trim()) { setError(t("assets.err_name_required")); return; }
    setBusy(true);
    const r = await api.post("/assets/categories", { name: add.name.trim(), tracking_mode: add.tracking_mode, default_unit: add.default_unit || "Nos" });
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.saved")); setAdd({ name: "", tracking_mode: "bulk", default_unit: "Nos" }); onChanged(); }
    else setError((r && r.message) || t("assets.save_failed"));
  };
  const saveEdit = async () => {
    if (!edit) return;
    setError("");
    if (!String(edit.name || "").trim()) { setError(t("assets.err_name_required")); return; }
    setBusy(true);
    const r = await api.put(`/assets/categories/${edit.id}`, { name: edit.name.trim(), tracking_mode: edit.tracking_mode, default_unit: edit.default_unit || "Nos" });
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.saved")); setEdit(null); onChanged(); }
    else setError((r && r.message) || t("assets.save_failed"));
  };
  const deactivate = async (c) => {
    if (!window.confirm(t("assets.cat_remove_confirm", { name: c.name }))) return;
    const r = await api.put(`/assets/categories/${c.id}`, { is_active: false });
    if (r && r.success) { toast.success(r.message || t("assets.saved")); onChanged(); }
    else toast.error((r && r.message) || t("assets.save_failed"));
  };

  return (
    <Modal open={open} onClose={onClose} width={640} title={t("assets.cats_title")} sub={t("assets.cats_sub")}
      footer={<Btn ghost onClick={onClose}>{t("assets.close")}</Btn>}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 80px auto", gap: 8, alignItems: "end", marginBottom: 14 }}>
        <Field label={t("assets.cat_name")}><input value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} style={inp} placeholder={t("assets.cat_name_ph")} /></Field>
        <Field label={t("assets.tracking")}>
          <select value={add.tracking_mode} onChange={(e) => setAdd({ ...add, tracking_mode: e.target.value })} style={inp}>
            <option value="bulk">{t("assets.tracking_bulk")}</option>
            <option value="serialized">{t("assets.tracking_serialized")}</option>
          </select>
        </Field>
        <Field label={t("assets.unit")}><input value={add.default_unit} onChange={(e) => setAdd({ ...add, default_unit: e.target.value })} style={inp} list="assets-units-cat" /></Field>
        <Btn icon={IcAdd} onClick={create} disabled={busy}>{t("assets.add")}</Btn>
      </div>
      <Panel>
        {(cats || []).length === 0 && <Empty>{t("assets.cats_empty")}</Empty>}
        {(cats || []).map((c) => (
          edit && edit.id === c.id ? (
            <Row key={c.id} cols="1.6fr 1fr 80px auto">
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={inpSm} />
              <select value={edit.tracking_mode} onChange={(e) => setEdit({ ...edit, tracking_mode: e.target.value })} style={inpSm}>
                <option value="bulk">{t("assets.tracking_bulk")}</option>
                <option value="serialized">{t("assets.tracking_serialized")}</option>
              </select>
              <input value={edit.default_unit || ""} onChange={(e) => setEdit({ ...edit, default_unit: e.target.value })} style={inpSm} />
              <div style={{ display: "flex", gap: 5 }}>
                <Btn size="sm" onClick={saveEdit} disabled={busy}>{t("assets.save")}</Btn>
                <Btn size="sm" ghost onClick={() => setEdit(null)}>{t("assets.cancel")}</Btn>
              </div>
            </Row>
          ) : (
            <Row key={c.id} cols="1.6fr 1fr 80px auto">
              <span style={{ fontWeight: 600, color: T.t1 }}>{c.name}</span>
              <span><Pill label={trackLabel(c.tracking_mode)} c={c.tracking_mode === "serialized" ? T.ind : T.t3} bg={c.tracking_mode === "serialized" ? T.indL : T.sltL} /></span>
              <span style={{ color: T.t3 }}>{c.default_unit || "—"}</span>
              <div style={{ display: "flex", gap: 5 }}>
                <Btn size="sm" ghost onClick={() => setEdit({ id: c.id, name: c.name, tracking_mode: c.tracking_mode, default_unit: c.default_unit })}>{t("assets.edit")}</Btn>
                <Btn size="sm" ghost onClick={() => deactivate(c)} title={t("assets.cat_remove_title")}><IcTrash size={12} color={T.red} /></Btn>
              </div>
            </Row>
          )
        ))}
      </Panel>
      <ErrBox>{error}</ErrBox>
      <datalist id="assets-units-cat">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
    </Modal>
  );
}

// ── WAREHOUSE ASSET INCHARGE ──────────────────────────────────────
function InchargesModal({ open, meta, users, onClose, onChanged }) {
  const toast = useToast();
  const [pick, setPick] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setPick({}); }, [open]);

  const add = async (wid) => {
    const uid = pick[wid];
    if (!uid) { toast.warning(t("assets.select_user_first")); return; }
    setBusy(true);
    const r = await api.post("/assets/incharges", { warehouse_id: wid, user_id: Number(uid) });
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.saved")); setPick((p) => ({ ...p, [wid]: "" })); onChanged(); }
    else toast.error((r && r.message) || t("assets.save_failed"));
  };
  const remove = async (row) => {
    if (!window.confirm(t("assets.incharge_remove_confirm", { name: row.user_name }))) return;
    setBusy(true);
    const r = await api.del(`/assets/incharges/${row.id}`);
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.saved")); onChanged(); }
    else toast.error((r && r.message) || t("assets.save_failed"));
  };

  const list = (meta && meta.incharges) || [];
  return (
    <Modal open={open} onClose={onClose} width={640} title={t("assets.incharge_title")} sub={t("assets.incharge_sub")}
      footer={<Btn ghost onClick={onClose}>{t("assets.close")}</Btn>}>
      <Notice>{t("assets.incharge_hint")}</Notice>
      {((meta && meta.warehouses) || []).map((w) => {
        const mine = list.filter((i) => i.warehouse_id === w.id);
        return (
          <Panel key={w.id} style={{ marginBottom: 12 }}
            title={<span>{w.name}{w.is_default ? <span style={{ fontSize: 10, color: T.t4, marginLeft: 6 }}>({t("assets.default")})</span> : null}</span>}
            action={<span style={{ fontSize: 11, color: T.t3 }}>{t("assets.storekeeper")}: <b>{w.incharge_name || "—"}</b></span>}>
            {mine.length === 0 && <div style={{ padding: "10px 14px", fontSize: 11.5, color: T.t4 }}>{t("assets.incharge_none")}</div>}
            {mine.map((i) => (
              <Row key={i.id} cols="1fr 120px auto">
                <span style={{ fontWeight: 600, color: T.t1 }}>{i.user_name}</span>
                <span style={{ color: T.t3, fontSize: 11.5 }}>{i.phone || ""}</span>
                <Btn size="sm" ghost onClick={() => remove(i)} disabled={busy}>{t("assets.remove")}</Btn>
              </Row>
            ))}
            <div style={{ display: "flex", gap: 8, padding: "10px 14px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <SearchSelect value={pick[w.id] || ""} onChange={(k) => setPick((p) => ({ ...p, [w.id]: k }))} accent={T.ind} compact
                  options={(users || []).filter((u) => !mine.some((m) => m.user_id === u.id)).map((u) => ({ id: u.id, name: u.name + (u.role ? ` · ${u.role}` : "") }))}
                  placeholder={t("assets.select_user")} />
              </div>
              <Btn size="sm" icon={IcAdd} onClick={() => add(w.id)} disabled={busy}>{t("assets.add")}</Btn>
            </div>
          </Panel>
        );
      })}
    </Modal>
  );
}

// ── OPENING STOCK IMPORT ──────────────────────────────────────────
function ImportModal({ open, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [b64, setB64] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setStep(1); setFileName(""); setB64(""); setPreview(null); setResult(null); setError(""); } }, [open]);

  const template = async () => {
    setError("");
    try {
      saveBlob(await fetchBlob("/assets/import/template", t("assets.template_failed")), "asset-opening-stock-template.xlsx");
    } catch (e) { setError(e.message || t("assets.template_failed")); }
  };

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    const rd = new FileReader();
    rd.onload = () => { setB64(String(rd.result || "")); setFileName(f.name); };
    rd.onerror = () => setError(t("assets.file_read_failed"));
    rd.readAsDataURL(f);
  };

  // Galti par server 422 + wahi rows/summary bhejta hai — api() use
  // { success:false, data } bana kar deta hai, isliye preview dono haal me dikhta hai.
  const check = async () => {
    setBusy(true); setError("");
    const r = await api.post("/assets/import/opening", { file_b64: b64, dry_run: true }, { timeoutMs: 120000 });
    setBusy(false);
    if (r && r.data && r.data.rows) { setPreview({ ...r.data, message: r.message }); setStep(2); return; }
    setError((r && r.message) || t("assets.import_failed"));
  };
  const commit = async () => {
    setBusy(true); setError("");
    const r = await api.post("/assets/import/opening", { file_b64: b64, dry_run: false }, { timeoutMs: 180000 });
    setBusy(false);
    if (r && r.success) { setResult(r); setStep(3); onDone(); return; }
    if (r && r.data && r.data.rows) { setPreview({ ...r.data, message: r.message }); }
    setError((r && r.message) || t("assets.import_failed"));
  };

  const sum = (preview && preview.summary) || {};
  const rowTone = (s) => (s === "ok" ? { c: T.grn, bg: T.grnL } : s === "error" ? { c: T.red, bg: T.redL } : { c: T.slt, bg: T.sltL });

  return (
    <Modal open={open} onClose={onClose} width={900} title={t("assets.import_title")} sub={fileName || t("assets.import_sub")}
      footer={
        step === 1 ? <><Btn ghost onClick={onClose}>{t("assets.cancel")}</Btn><Btn onClick={check} disabled={busy || !b64}>{busy ? t("assets.checking") : t("assets.check_file")}</Btn></>
        : step === 2 ? <><Btn ghost onClick={() => setStep(1)}>{t("assets.back")}</Btn>
            <Btn onClick={commit} disabled={busy || N(sum.error) > 0 || N(sum.ok) === 0}>{busy ? t("assets.importing") : t("assets.import_go", { n: N(sum.ok) })}</Btn></>
        : <Btn onClick={onClose}>{t("assets.ok")}</Btn>
      }>
      {step === 1 && (
        <>
          <Notice>{t("assets.import_notice")}</Notice>
          <label style={{ display: "block", border: `2px dashed ${T.b2}`, borderRadius: 12, padding: "34px 20px", textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>{fileName || t("assets.import_pick")}</div>
            <div style={{ fontSize: 11.5, color: T.t4, marginTop: 5 }}>{t("assets.import_pick_hint")}</div>
            <input type="file" accept=".xlsx" onChange={onFile} style={{ display: "none" }} />
          </label>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Btn ghost size="sm" icon={IcDown} onClick={template}>{t("assets.template_download")}</Btn>
          </div>
          <ErrBox>{error}</ErrBox>
        </>
      )}
      {step === 2 && preview && (
        <>
          <Notice tone={N(sum.error) > 0 ? "warn" : undefined}>
            {preview.message || t("assets.import_summary", { total: N(sum.total), ok: N(sum.ok), error: N(sum.error), skipped: N(sum.skipped) })}
            {N(sum.error) > 0 && <div style={{ marginTop: 4 }}>{t("assets.import_fix_hint")}</div>}
          </Notice>
          <Panel>
            <Scroll minWidth={760}>
              <Row head cols="50px 80px 1.6fr 80px 1fr 1fr 2fr"><span>{t("assets.row")}</span><span>{t("assets.status")}</span><span>{t("assets.item")}</span><span>{t("assets.qty")}</span><span>{t("assets.where")}</span><span>{t("assets.holder")}</span><span>{t("assets.problem")}</span></Row>
              {(preview.rows || []).map((r) => {
                const d = r.data || {}, tone = rowTone(r.status);
                return (
                  <Row key={r.row} cols="50px 80px 1.6fr 80px 1fr 1fr 2fr" style={{ background: r.status === "error" ? "#FFF8F8" : "transparent" }}>
                    <span style={{ color: T.t3 }}>{r.row}</span>
                    <span><Pill label={t("assets.import_status_" + r.status)} c={tone.c} bg={tone.bg} /></span>
                    <div>{d.name ? <><div style={{ fontWeight: 600, color: T.t1 }}>{d.name}{d.code ? ` · ${d.code}` : ""}</div><div style={{ fontSize: 10.5, color: T.t4 }}>{[d.spec, d.category, d.tracking ? trackLabel(d.tracking) : null].filter(Boolean).join(" · ")}</div></> : <span style={{ color: T.t4 }}>—</span>}</div>
                    <span>{d.qty != null ? `${fmtN(d.qty)} ${d.unit || ""}` : "—"}</span>
                    <span style={{ fontSize: 11.5 }}>{d.loc_type ? t(d.loc_type === "warehouse" ? "assets.warehouse" : "assets.site") : "—"}</span>
                    <span style={{ fontSize: 11.5 }}>{d.holder_type ? holderLabel(d.holder_type) : "—"}</span>
                    <span style={{ fontSize: 11.5, color: r.status === "error" ? T.red : T.t4 }}>{(r.errors || []).join(" · ") || (r.status === "skipped" ? t("assets.import_skipped_example") : "")}</span>
                  </Row>
                );
              })}
            </Scroll>
          </Panel>
          <ErrBox>{error}</ErrBox>
        </>
      )}
      {step === 3 && result && (
        <div style={{ textAlign: "center", padding: "26px 10px" }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: T.grnL, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><IcChk size={22} color={T.grn} /></div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{result.message || t("assets.import_done")}</div>
          {result.data && result.data.committed && (
            <div style={{ fontSize: 12, color: T.t3, marginTop: 6 }}>
              {t("assets.import_done_detail", { rows: N(result.data.committed.rows), items: N(result.data.committed.items), vouchers: N(result.data.committed.vouchers) })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// GRN — vendor se naya asset
// ══════════════════════════════════════════════════════════════════
const newGrnLine = () => ({ mode: "existing", asset_item_id: "", name: "", spec: "", unit: "Nos", tracking_mode: "bulk", category_id: "", code: "", qty: "", rate: "" });

function GrnForm({ open, meta, pickers, cats, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({});
  const [lines, setLines] = useState([newGrnLine()]);
  const [bulkItems, setBulkItems] = useState([]);
  const [vendorMode, setVendorMode] = useState("party");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const def = ((meta && meta.warehouses) || []).find((w) => w.is_default) || ((meta && meta.warehouses) || [])[0];
    setF({ warehouse_id: def ? String(def.id) : "", date: todayStr(), party_id: "", vendor_name: "", invoice_no: "", invoice_date: "", remarks: "" });
    setLines([newGrnLine()]); setError(""); setVendorMode("party");
    api.get("/assets/items?tracking=bulk").then((r) => setBulkItems(r && r.success ? r.data || [] : [])).catch(() => setBulkItems([]));
  }, [open, meta]);

  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const updLine = (i, v) => setLines((p) => p.map((l, j) => (j === i ? v : l)));
  const total = lines.reduce((s, l) => s + N(l.qty) * N(l.rate), 0);

  const save = async () => {
    setError("");
    if (!f.warehouse_id) { setError(t("assets.err_warehouse_required")); return; }
    const items = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const qty = Number(l.qty);
      if (l.mode === "existing" && !l.asset_item_id) { setError(t("assets.err_line_item", { n: i + 1 })); return; }
      if (l.mode === "new" && !l.name.trim()) { setError(t("assets.err_line_name", { n: i + 1 })); return; }
      if (!(qty > 0)) { setError(t("assets.err_line_qty", { n: i + 1 })); return; }
      if (l.mode === "new" && l.tracking_mode === "serialized" && !Number.isInteger(qty)) { setError(t("assets.err_line_serial_int", { n: i + 1 })); return; }
      const base = { qty, rate: l.rate === "" ? null : Number(l.rate), condition: "good" };
      if (l.mode === "existing") items.push({ ...base, asset_item_id: Number(l.asset_item_id) });
      else items.push({
        ...base, name: l.name.trim(), spec: l.spec.trim() || null, unit: l.unit || "Nos", tracking_mode: l.tracking_mode,
        category_id: l.category_id || null, code: l.tracking_mode === "serialized" && qty === 1 && l.code.trim() ? l.code.trim() : null,
      });
    }
    const party = (pickers.parties || []).find((p) => String(p.id) === String(f.party_id));
    const body = {
      type: "grn", date: f.date || todayStr(), to: { warehouse_id: Number(f.warehouse_id) }, items,
      party_id: vendorMode === "party" && f.party_id ? Number(f.party_id) : null,
      vendor_name: vendorMode === "party" ? (party ? party.name : "") : f.vendor_name.trim(),
      invoice_no: f.invoice_no || null, invoice_date: f.invoice_date || null, remarks: f.remarks || null,
    };
    setBusy(true);
    const r = await api.post("/assets/vouchers", body);
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.grn_done", { no: (r.data && r.data.voucher_no) || "" })); onSaved(r.data); onClose(); }
    else setError((r && r.message) || t("assets.save_failed"));
  };

  const catOf = (id) => (cats || []).find((c) => String(c.id) === String(id));

  return (
    <Modal open={open} onClose={onClose} width={920} title={t("assets.grn_new")} sub={t("assets.grn_new_sub")}
      footer={<><Btn ghost onClick={onClose}>{t("assets.cancel")}</Btn><Btn onClick={save} disabled={busy}>{busy ? t("assets.saving") : t("assets.grn_save")}</Btn></>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 }}>
        <Field label={t("assets.warehouse")}>
          <select value={f.warehouse_id || ""} onChange={(e) => upd("warehouse_id", e.target.value)} style={inp}>
            <option value="">{t("assets.select")}</option>
            {((meta && meta.warehouses) || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label={t("assets.date")}><input type="date" value={f.date || ""} onChange={(e) => upd("date", e.target.value)} style={inp} /></Field>
        <Field label={t("assets.invoice_no")}><input value={f.invoice_no || ""} onChange={(e) => upd("invoice_no", e.target.value)} style={inp} /></Field>
        <Field label={t("assets.invoice_date")}><input type="date" value={f.invoice_date || ""} onChange={(e) => upd("invoice_date", e.target.value)} style={inp} /></Field>
        <Field label={t("assets.vendor")} span={2}>
          {vendorMode === "party" ? (
            <SearchSelect value={f.party_id || ""} onChange={(k) => upd("party_id", k)} accent={T.ind}
              options={(pickers.parties || []).map((p) => ({ id: p.id, name: p.name + (p.type ? ` · ${p.type}` : "") }))} placeholder={t("assets.select_vendor")} />
          ) : (
            <input value={f.vendor_name || ""} onChange={(e) => upd("vendor_name", e.target.value)} style={inp} placeholder={t("assets.vendor_name_ph")} />
          )}
          <button type="button" onClick={() => setVendorMode((m) => (m === "party" ? "text" : "party"))}
            style={{ background: "none", border: "none", color: T.t3, fontSize: 10.5, cursor: "pointer", padding: "4px 0 0", fontFamily: "inherit" }}>
            {vendorMode === "party" ? t("assets.vendor_new_toggle") : t("assets.vendor_party_toggle")}
          </button>
        </Field>
        <Field label={t("assets.remarks")} span={2}><input value={f.remarks || ""} onChange={(e) => upd("remarks", e.target.value)} style={inp} /></Field>
      </div>

      <Panel title={t("assets.lines")} action={<Btn size="sm" ghost icon={IcAdd} onClick={() => setLines((p) => [...p, newGrnLine()])}>{t("assets.add_line")}</Btn>}>
        {lines.map((l, i) => (
          <div key={i} style={{ padding: "10px 14px", borderBottom: `1px solid ${T.b1}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.t3 }}>#{i + 1}</span>
              <Seg value={l.mode} onChange={(m) => updLine(i, { ...l, mode: m })} options={[{ k: "existing", l: t("assets.grn_existing") }, { k: "new", l: t("assets.grn_new_item") }]} />
              <span style={{ flex: 1 }} />
              {lines.length > 1 && <Btn size="sm" ghost onClick={() => setLines((p) => p.filter((_, j) => j !== i))}><IcTrash size={12} color={T.red} /></Btn>}
            </div>
            {l.mode === "existing" ? (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 90px 110px 110px", gap: 8 }}>
                <Field label={t("assets.item")}>
                  <SearchSelect value={l.asset_item_id || ""} onChange={(k) => updLine(i, { ...l, asset_item_id: k })} accent={T.ind}
                    options={bulkItems.map((b) => ({ id: b.id, name: `${lineLabel(b)} (${fmtN(b.total_qty)} ${b.unit || ""})` }))} placeholder={t("assets.select_bulk_item")} />
                </Field>
                <Field label={t("assets.qty")}><input value={l.qty} inputMode="decimal" onChange={(e) => updLine(i, { ...l, qty: e.target.value.replace(/[^0-9.]/g, "") })} style={inp} /></Field>
                <Field label={t("assets.rate")}><input value={l.rate} inputMode="decimal" onChange={(e) => updLine(i, { ...l, rate: e.target.value.replace(/[^0-9.]/g, "") })} style={inp} placeholder="₹" /></Field>
                <Field label={t("assets.amount")}><input value={rupee(N(l.qty) * N(l.rate))} readOnly style={{ ...inp, background: T.surfaceB, color: T.t3 }} /></Field>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 80px 110px 1fr 90px 110px", gap: 8 }}>
                <Field label={t("assets.item_name")}><input value={l.name} onChange={(e) => updLine(i, { ...l, name: e.target.value })} style={inp} placeholder={t("assets.item_name_ph")} /></Field>
                <Field label={t("assets.spec")}><input value={l.spec} onChange={(e) => updLine(i, { ...l, spec: e.target.value })} style={inp} placeholder={t("assets.spec_ph")} /></Field>
                <Field label={t("assets.unit")}><input value={l.unit} onChange={(e) => updLine(i, { ...l, unit: e.target.value })} style={inp} list="assets-units-grn" /></Field>
                <Field label={t("assets.tracking")}>
                  <select value={l.tracking_mode} onChange={(e) => updLine(i, { ...l, tracking_mode: e.target.value })} style={inp}>
                    <option value="bulk">{t("assets.tracking_bulk")}</option>
                    <option value="serialized">{t("assets.tracking_serialized")}</option>
                  </select>
                </Field>
                <Field label={t("assets.category")}>
                  <select value={l.category_id} style={inp}
                    onChange={(e) => { const c = catOf(e.target.value); updLine(i, { ...l, category_id: e.target.value, tracking_mode: c ? c.tracking_mode : l.tracking_mode, unit: c && c.default_unit ? c.default_unit : l.unit }); }}>
                    <option value="">—</option>
                    {(cats || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label={t("assets.qty")}><input value={l.qty} inputMode="decimal" onChange={(e) => updLine(i, { ...l, qty: e.target.value.replace(/[^0-9.]/g, "") })} style={inp} /></Field>
                <Field label={t("assets.rate")}><input value={l.rate} inputMode="decimal" onChange={(e) => updLine(i, { ...l, rate: e.target.value.replace(/[^0-9.]/g, "") })} style={inp} placeholder="₹" /></Field>
                {l.tracking_mode === "serialized" && (
                  <Field label={t("assets.code")} span={2} hint={Number(l.qty) === 1 ? t("assets.code_hint_single") : t("assets.code_hint_multi")}>
                    <input value={l.code} onChange={(e) => updLine(i, { ...l, code: e.target.value })} style={inp} disabled={Number(l.qty) !== 1} placeholder={t("assets.code_ph")} />
                  </Field>
                )}
              </div>
            )}
          </div>
        ))}
        <div style={{ padding: "10px 14px", display: "flex", justifyContent: "flex-end", gap: 12, fontSize: 12.5 }}>
          <span style={{ color: T.t3 }}>{t("assets.total_amount")}</span><b style={{ color: T.t1 }}>{rupee(total)}</b>
        </div>
      </Panel>
      <div style={{ fontSize: 11, color: T.t4, marginTop: 10 }}>{t("assets.grn_finance_note")}</div>
      <ErrBox>{error}</ErrBox>
      <datalist id="assets-units-grn">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
    </Modal>
  );
}

function GrnTab({ refreshKey, canCreate, onNew, onOpenVoucher }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let alive = true;
    setRows(null);
    api.get("/assets/vouchers?type=grn&limit=300").then((r) => { if (alive) setRows(r && r.success ? r.data || [] : []); }).catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [refreshKey]);

  const cols = "120px 80px 1.4fr 1fr 1fr 80px 1fr";
  return (
    <Panel title={t("assets.grn_title")} action={canCreate && <Btn size="sm" icon={IcAdd} onClick={onNew}>{t("assets.grn_new")}</Btn>}>
      {rows == null && <Spinner />}
      {rows && rows.length === 0 && <Empty>{t("assets.grn_empty")}<br /><span style={{ fontSize: 11.5 }}>{t("assets.grn_empty_hint")}</span></Empty>}
      {rows && rows.length > 0 && (
        <Scroll minWidth={820}>
          <Row head cols={cols}><span>{t("assets.voucher")}</span><span>{t("assets.date")}</span><span>{t("assets.vendor")}</span><span>{t("assets.invoice")}</span><span>{t("assets.warehouse")}</span><span>{t("assets.lines_qty")}</span><span>{t("assets.created_by")}</span></Row>
          {rows.map((v) => (
            <Row key={v.id} cols={cols} onClick={() => onOpenVoucher(v.id)}>
              <span style={{ fontWeight: 600, color: T.t1 }}>{v.voucher_no}</span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(v.date)}</span>
              <span>{v.vendor_name || "—"}</span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>{v.invoice_no || "—"}{v.invoice_date ? ` · ${fmtD(v.invoice_date)}` : ""}</span>
              <span>{v.to_warehouse_name || "—"}</span>
              <span>{N(v.line_count)} / {fmtN(v.total_qty)}</span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>{v.created_by_name || "—"}</span>
            </Row>
          ))}
        </Scroll>
      )}
    </Panel>
  );
}

// ══════════════════════════════════════════════════════════════════
// VOUCHER DRAWER — detail + accept / reject / cancel
// ══════════════════════════════════════════════════════════════════
function VoucherDrawer({ id, onClose, onChanged }) {
  const toast = useToast();
  const [v, setV] = useState(null);
  const [failed, setFailed] = useState("");
  const [mode, setMode] = useState(null);        // null | accept | reject
  const [acc, setAcc] = useState({});             // line id → { accepted_qty, accepted_condition, remarks }
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setFailed("");
    const r = await api.get(`/assets/vouchers/${id}`).catch(() => null);
    if (r && r.success) setV(r.data);
    else { setV(null); setFailed((r && r.message) || t("assets.voucher_load_failed")); }
  }, [id]);
  useEffect(() => { setV(null); setMode(null); setError(""); setReason(""); load(); }, [load]);

  const startAccept = () => {
    const m = {};
    for (const ln of v.items || []) m[ln.id] = { accepted_qty: String(ln.qty), accepted_condition: ln.item_condition || "good", remarks: "" };
    setAcc(m); setMode("accept"); setError("");
  };
  const doAccept = async () => {
    setError("");
    const items = [];
    for (const ln of v.items || []) {
      const a = acc[ln.id] || {};
      const q = Number(a.accepted_qty);
      if (!(q >= 0) || q > N(ln.qty)) { setError(t("assets.err_accept_qty", { item: lineLabel(ln) })); return; }
      items.push({ id: ln.id, accepted_qty: q, accepted_condition: a.accepted_condition || ln.item_condition || "good", remarks: a.remarks || undefined });
    }
    setBusy(true);
    const r = await api.post(`/assets/vouchers/${v.id}/accept`, { items });
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.accepted_ok")); setMode(null); setV(r.data); onChanged(); }
    else setError((r && r.message) || t("assets.action_failed"));
  };
  const doReject = async () => {
    setError("");
    if (!reason.trim()) { setError(t("assets.err_reason_required")); return; }
    setBusy(true);
    const r = await api.post(`/assets/vouchers/${v.id}/reject`, { reason: reason.trim() });
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.rejected_ok")); setMode(null); setV(r.data); onChanged(); }
    else setError((r && r.message) || t("assets.action_failed"));
  };
  const doCancel = async () => {
    if (!window.confirm(t("assets.cancel_confirm", { no: v.voucher_no }))) return;
    setBusy(true);
    const r = await api.post(`/assets/vouchers/${v.id}/cancel`, {});
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.cancelled_ok")); setV(r.data); onChanged(); }
    else toast.error((r && r.message) || t("assets.action_failed"));
  };
  // Gate par yahi kaagaz dikhta hai. Token header me chahiye, isliye blob la kar
  // download — seedha link par Authorization nahi jaata.
  const doChallan = async () => {
    try { saveBlob(await fetchBlob(`/assets/vouchers/${v.id}/challan`, t("assets.challan_failed")), `${v.voucher_no}.pdf`); }
    catch (e) { toast.error(e.message || t("assets.challan_failed")); }
  };

  const f = sideText(v, "from"), to = sideText(v, "to");
  const showAccepted = v && v.status === "accepted";
  const external = v && ["worker", "subcon"].includes(v.to_holder_type);

  const footer = !v ? <Btn ghost onClick={onClose}>{t("assets.close")}</Btn>
    : mode === "accept" ? <><Btn ghost onClick={() => setMode(null)}>{t("assets.back")}</Btn><Btn c={T.grn} icon={IcChk} onClick={doAccept} disabled={busy}>{busy ? t("assets.working") : t("assets.accept_confirm")}</Btn></>
    : mode === "reject" ? <><Btn ghost onClick={() => setMode(null)}>{t("assets.back")}</Btn><Btn c={T.red} onClick={doReject} disabled={busy}>{busy ? t("assets.working") : t("assets.reject_confirm")}</Btn></>
    : <>
        <Btn ghost onClick={onClose}>{t("assets.close")}</Btn>
        <Btn ghost icon={IcDoc} onClick={doChallan}>{t("assets.challan")}</Btn>
        {v.can_cancel && <Btn ghost onClick={doCancel} disabled={busy} style={{ color: T.red }}>{t("assets.cancel_voucher")}</Btn>}
        {v.can_accept && <Btn c={T.red} ghost onClick={() => { setMode("reject"); setError(""); }} style={{ color: T.red, borderColor: "#F1C2C6" }}>{t("assets.reject")}</Btn>}
        {v.can_accept && <Btn c={T.grn} icon={IcChk} onClick={startAccept}>{t("assets.accept")}</Btn>}
      </>;

  return (
    <Drawer open onClose={onClose} width={720}
      title={v ? v.voucher_no : t("assets.voucher")}
      head={v ? <><TypePill ty={v.type} /><StatusPill s={v.status} /></> : null}
      sub={v ? `${fmtD(v.date)} · ${t("assets.created_by")}: ${v.created_by_name || "—"}${v.accepted_by_name ? ` · ${t(v.status === "accepted" ? "assets.accepted_by" : "assets.closed_by")}: ${v.accepted_by_name}` : ""}` : ""}
      footer={footer}>
      {!v && !failed && <Spinner />}
      {failed && <Empty>{failed}</Empty>}
      {v && (
        <>
          {v.status === "pending" && (
            <Notice tone="warn">{v.can_accept ? t("assets.pending_you_accept") : t("assets.pending_note", { name: v.to_warehouse_id ? (v.to_warehouse_name || t("assets.warehouse")) : (v.to_custodian_name || "—") })}</Notice>
          )}
          {v.status === "rejected" && <Notice tone="warn">{t("assets.rejected_note", { reason: v.reject_reason || "—" })}</Notice>}
          {v.status === "cancelled" && <Notice>{t("assets.cancelled_note")}</Notice>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr", gap: 10, alignItems: "center", padding: "12px 14px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>{t("assets.from")}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginTop: 2 }}>{f.main}</div>
              <div style={{ fontSize: 11, color: T.t3 }}>{f.sub}{v.from_custodian_name && v.from_project_id ? ` · ${t("assets.custodian")}: ${v.from_custodian_name}` : ""}</div>
            </div>
            <div style={{ textAlign: "center", color: T.t4 }}>→</div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>{t("assets.to")}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginTop: 2 }}>{to.main}</div>
              <div style={{ fontSize: 11, color: T.t3 }}>{to.sub}{v.to_custodian_name && v.to_project_id ? ` · ${t("assets.custodian")}: ${v.to_custodian_name}` : ""}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
            {v.type === "grn" && <KV k={t("assets.vendor")} v={v.vendor_name} />}
            {v.type === "grn" && <KV k={t("assets.invoice")} v={[v.invoice_no, v.invoice_date ? fmtD(v.invoice_date) : null].filter(Boolean).join(" · ")} />}
            {isRepairType(v.type) && <KV k={t("assets.repair_cost")} v={v.repair_cost == null ? null : rupee(v.repair_cost)} />}
            {isRepairType(v.type) && <KV k={t("assets.invoice")} v={v.invoice_no} />}
            {v.expected_return_date && <KV k={t("assets.expected_return")} v={fmtD(v.expected_return_date)} />}
            {v.accepted_at && <KV k={t("assets.accepted_at")} v={fmtD(v.accepted_at)} />}
            <KV k={t("assets.remarks")} v={v.remarks} />
            {v.photo_url && <KV k={t("assets.photo")} v={<a href={v.photo_url} target="_blank" rel="noreferrer" style={{ color: T.ind }}>{t("assets.photo_view")}</a>} />}
          </div>

          <Panel title={t("assets.lines")}>
            <Scroll minWidth={mode === "accept" ? 640 : 520}>
              <Row head cols={mode === "accept" ? "1.6fr 70px 90px 90px 110px 1fr" : `1.6fr 70px 90px ${external ? "110px " : ""}${showAccepted ? "110px" : ""}`}>
                <span>{t("assets.item")}</span><span>{t("assets.qty")}</span><span>{t("assets.condition")}</span>
                {mode !== "accept" && external && <span>{t("assets.rent")}</span>}
                {mode !== "accept" && showAccepted && <span>{t("assets.accepted")}</span>}
                {mode === "accept" && <><span>{t("assets.accept_qty")}</span><span>{t("assets.accept_cond")}</span><span>{t("assets.remarks")}</span></>}
              </Row>
              {(v.items || []).map((ln) => (
                <Row key={ln.id} cols={mode === "accept" ? "1.6fr 70px 90px 90px 110px 1fr" : `1.6fr 70px 90px ${external ? "110px " : ""}${showAccepted ? "110px" : ""}`}>
                  <div>
                    <div style={{ fontWeight: 600, color: T.t1 }}>{[ln.name, ln.spec].filter(Boolean).join(" ")}</div>
                    <div style={{ fontSize: 10.5, color: T.t4 }}>{[ln.code, trackLabel(ln.tracking_mode), ln.rate != null ? `${rupee(ln.rate)}/${ln.unit || ""}` : null, ln.remarks].filter(Boolean).join(" · ")}</div>
                  </div>
                  <span style={{ fontWeight: 600 }}>{fmtN(ln.qty)} <span style={{ fontSize: 10.5, color: T.t4 }}>{ln.unit || ""}</span></span>
                  <span><CondPill c={ln.item_condition} /></span>
                  {mode !== "accept" && external && <span style={{ fontSize: 11.5 }}>{rentText(ln)}</span>}
                  {mode !== "accept" && showAccepted && (
                    <div>
                      <div style={{ fontWeight: 600, color: N(ln.accepted_qty) < N(ln.qty) ? T.amb : T.t1 }}>{fmtN(ln.accepted_qty)}</div>
                      {ln.accepted_condition && ln.accepted_condition !== ln.item_condition && <div style={{ fontSize: 10.5 }}><CondPill c={ln.accepted_condition} /></div>}
                    </div>
                  )}
                  {mode === "accept" && (
                    <>
                      {ln.tracking_mode === "serialized" ? (
                        <select value={(acc[ln.id] || {}).accepted_qty || "1"} onChange={(e) => setAcc((p) => ({ ...p, [ln.id]: { ...p[ln.id], accepted_qty: e.target.value } }))} style={inpSm}>
                          <option value="1">1</option><option value="0">0</option>
                        </select>
                      ) : (
                        <input value={(acc[ln.id] || {}).accepted_qty || ""} inputMode="decimal" style={inpSm}
                          onChange={(e) => setAcc((p) => ({ ...p, [ln.id]: { ...p[ln.id], accepted_qty: e.target.value.replace(/[^0-9.]/g, "") } }))} />
                      )}
                      <select value={(acc[ln.id] || {}).accepted_condition || "good"} onChange={(e) => setAcc((p) => ({ ...p, [ln.id]: { ...p[ln.id], accepted_condition: e.target.value } }))} style={inpSm}>
                        <option value="good">{t("assets.cond_good")}</option>
                        <option value="damaged">{t("assets.cond_damaged")}</option>
                        <option value="lost">{t("assets.cond_lost")}</option>
                      </select>
                      <input value={(acc[ln.id] || {}).remarks || ""} style={inpSm} placeholder={t("assets.remarks")}
                        onChange={(e) => setAcc((p) => ({ ...p, [ln.id]: { ...p[ln.id], remarks: e.target.value } }))} />
                    </>
                  )}
                </Row>
              ))}
            </Scroll>
          </Panel>

          {mode === "accept" && <Notice>{t("assets.accept_hint")}</Notice>}
          {mode === "reject" && (
            <div style={{ marginTop: 12 }}>
              <Field label={t("assets.reject_reason")} hint={t("assets.reject_hint")}>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inp, minHeight: 70, resize: "vertical" }} placeholder={t("assets.reject_reason_ph")} />
              </Field>
            </div>
          )}
          {v.type === "grn" && <div style={{ fontSize: 11, color: T.t4, marginTop: 10 }}>{t("assets.grn_finance_note")}</div>}
          <ErrBox>{error}</ErrBox>
        </>
      )}
    </Drawer>
  );
}

// ══════════════════════════════════════════════════════════════════
// ISSUE — warehouse se site par
// ══════════════════════════════════════════════════════════════════
const newMoveLine = () => ({ key: "", qty: "", condition: "good", charge_mode: "free", rent_rate: "", rent_basis: "day", remarks: "" });

function IssueForm({ open, meta, pickers, me, canAll, onClose, onSaved }) {
  const toast = useToast();
  const [wh, setWh] = useState("");
  const [date, setDate] = useState(todayStr());
  const [to, setTo] = useState({ holder_type: "user" });
  const [lines, setLines] = useState([newMoveLine()]);
  const [stock, setStock] = useState(null);
  const [ret, setRet] = useState("");
  const [remarks, setRemarks] = useState("");
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const all = (meta && meta.warehouses) || [];
  const myIds = (meta && meta.my_warehouse_ids) || [];
  const whOptions = canAll ? all : all.filter((w) => myIds.includes(w.id));

  useEffect(() => {
    if (!open) return;
    const def = whOptions.find((w) => w.is_default) || whOptions[0];
    setWh(def ? String(def.id) : ""); setDate(todayStr()); setTo({ holder_type: "user" }); setLines([newMoveLine()]);
    setRet(""); setRemarks(""); setPhoto(""); setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !wh) { setStock(null); return; }
    let alive = true;
    setStock(null);
    api.get(`/assets/holdings?warehouse_id=${wh}`).then((r) => { if (alive) setStock(r && r.success ? r.data || [] : []); }).catch(() => { if (alive) setStock([]); });
    return () => { alive = false; };
  }, [open, wh]);

  const external = ["worker", "subcon"].includes(to.holder_type);
  const stockOf = (key) => (stock || []).find((h) => String(h.id) === String(key));
  const updLine = (i, v) => setLines((p) => p.map((l, j) => (j === i ? v : l)));

  const save = async () => {
    setError("");
    if (!wh) { setError(t("assets.err_warehouse_required")); return; }
    if (!siteLocValid(to)) { setError(t("assets.err_to_required")); return; }
    const items = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], h = stockOf(l.key);
      if (!h) { setError(t("assets.err_line_item", { n: i + 1 })); return; }
      const qty = h.tracking_mode === "serialized" ? 1 : Number(l.qty);
      if (!(qty > 0)) { setError(t("assets.err_line_qty", { n: i + 1 })); return; }
      const have = l.condition === "damaged" ? N(h.qty_damaged) : N(h.qty_good);
      if (qty > have) { setError(t("assets.err_line_stock", { n: i + 1, have: fmtN(have) })); return; }
      const rent = external && l.charge_mode === "rent";
      if (rent && !(Number(l.rent_rate) > 0)) { setError(t("assets.err_rent_rate", { n: i + 1 })); return; }
      items.push({
        asset_item_id: h.asset_item_id, qty, condition: l.condition || "good",
        charge_mode: rent ? "rent" : "free", rent_rate: rent ? Number(l.rent_rate) : null, rent_basis: rent ? (l.rent_basis || "day") : null,
        remarks: l.remarks || null,
      });
    }
    setBusy(true);
    const r = await api.post("/assets/vouchers", {
      type: "issue", date, from: { warehouse_id: Number(wh) }, to: siteLocBody(to), items,
      expected_return_date: ret || null, remarks: remarks || null, photo_url: photo || null,
    });
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.voucher_done", { no: (r.data && r.data.voucher_no) || "" })); onSaved(r.data); onClose(); }
    else setError((r && r.message) || t("assets.save_failed"));
  };

  const lineCols = external ? "1.8fr 80px 100px 1.6fr 1fr auto" : "1.8fr 80px 100px 1fr auto";
  return (
    <Modal open={open} onClose={onClose} width={960} title={t("assets.issue_title")} sub={t("assets.issue_sub")}
      footer={<><Btn ghost onClick={onClose}>{t("assets.cancel")}</Btn><Btn onClick={save} disabled={busy || !whOptions.length} icon={IcOut}>{busy ? t("assets.saving") : t("assets.issue_save")}</Btn></>}>
      {!whOptions.length && <Notice tone="warn">{t("assets.issue_no_warehouse")}</Notice>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <Field label={t("assets.from_warehouse")}>
          <select value={wh} onChange={(e) => { setWh(e.target.value); setLines([newMoveLine()]); }} style={inp}>
            <option value="">{t("assets.select")}</option>
            {whOptions.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label={t("assets.date")}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} /></Field>
        <div style={{ gridColumn: "span 2", fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginTop: 4 }}>{t("assets.to_site")}</div>
        <ToSiteFields v={to} onChange={setTo} pickers={pickers} me={me} />
      </div>

      <Panel title={t("assets.items")} action={<Btn size="sm" ghost icon={IcAdd} onClick={() => setLines((p) => [...p, newMoveLine()])} disabled={!wh}>{t("assets.add_line")}</Btn>}>
        {wh && stock == null && <Spinner />}
        {wh && stock && stock.length === 0 && <Empty>{t("assets.issue_stock_empty")}</Empty>}
        {!wh && <Empty>{t("assets.issue_pick_warehouse")}</Empty>}
        {wh && stock && stock.length > 0 && (
          <>
            <Row head cols={lineCols}><span>{t("assets.item")}</span><span>{t("assets.qty")}</span><span>{t("assets.condition")}</span>{external && <span>{t("assets.charge")}</span>}<span>{t("assets.remarks")}</span><span></span></Row>
            {lines.map((l, i) => {
              const h = stockOf(l.key);
              return (
                <Row key={i} cols={lineCols}>
                  <div>
                    <SearchSelect value={l.key} accent={T.ind} compact
                      onChange={(k) => { const hh = stockOf(k); updLine(i, { ...l, key: k, qty: hh && hh.tracking_mode === "serialized" ? "1" : l.qty }); }}
                      options={stock.map((s) => ({ id: s.id, name: `${lineLabel(s)} — ${fmtN(s.qty_good)} ${t("assets.good").toLowerCase()}${N(s.qty_damaged) ? `, ${fmtN(s.qty_damaged)} ${t("assets.damaged").toLowerCase()}` : ""}` }))}
                      placeholder={t("assets.select_item")} />
                    {h && <div style={{ fontSize: 10, color: T.t4, marginTop: 3 }}>{t("assets.in_store_n", { n: fmtN(N(h.qty_good) + N(h.qty_damaged)), unit: h.unit || "" })}</div>}
                  </div>
                  <input value={h && h.tracking_mode === "serialized" ? "1" : l.qty} inputMode="decimal" style={inpSm} disabled={!!(h && h.tracking_mode === "serialized")}
                    onChange={(e) => updLine(i, { ...l, qty: e.target.value.replace(/[^0-9.]/g, "") })} />
                  <select value={l.condition} onChange={(e) => updLine(i, { ...l, condition: e.target.value })} style={inpSm}>
                    <option value="good">{t("assets.cond_good")}</option>
                    <option value="damaged">{t("assets.cond_damaged")}</option>
                  </select>
                  {external && <RentCell ln={l} onChange={(nl) => updLine(i, nl)} enabled />}
                  <input value={l.remarks} onChange={(e) => updLine(i, { ...l, remarks: e.target.value })} style={inpSm} />
                  <Btn size="sm" ghost onClick={() => setLines((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : [newMoveLine()]))}><IcTrash size={12} color={T.red} /></Btn>
                </Row>
              );
            })}
          </>
        )}
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
        <Field label={t("assets.expected_return")} hint={t("assets.expected_return_hint")}><input type="date" value={ret} onChange={(e) => setRet(e.target.value)} style={inp} /></Field>
        <Field label={t("assets.remarks")}><input value={remarks} onChange={(e) => setRemarks(e.target.value)} style={inp} /></Field>
        <PhotoField value={photo} onChange={setPhoto} />
      </div>
      <ErrBox>{error}</ErrBox>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// TRANSFER / RETURN — meri custody se
// ══════════════════════════════════════════════════════════════════
// "From" ki list holdings se banti hai — jo cheez sach me is custodian ke
// paas hai (ya mere warehouse me) wahi dikhti hai; aur har line par ye bhi
// ki wahan kitni padi hai.
const groupKey = (h) => (h.warehouse_id ? `w:${h.warehouse_id}` : `s:${h.project_id}:${h.holder_type}:${h.holder_id}:${h.custodian_user_id}`);

function MoveForm({ open, kind, meta, pickers, me, canAll, onClose, onSaved }) {
  const toast = useToast();
  const isReturn = kind === "return";
  const [cust, setCust] = useState(String(me.id || ""));
  const [hold, setHold] = useState(null);
  const [from, setFrom] = useState("");
  const [date, setDate] = useState(todayStr());
  const [toWh, setToWh] = useState("");
  const [toSite, setToSite] = useState({ holder_type: "user" });
  const [lines, setLines] = useState([newMoveLine()]);
  const [ret, setRet] = useState("");
  const [remarks, setRemarks] = useState("");
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const all = (meta && meta.warehouses) || [];
  const myIds = (meta && meta.my_warehouse_ids) || [];
  const myWh = canAll ? all : all.filter((w) => myIds.includes(w.id));

  useEffect(() => {
    if (!open) return;
    const def = all.find((w) => w.is_default) || all[0];
    setCust(String(me.id || "")); setFrom(""); setDate(todayStr()); setToWh(def ? String(def.id) : ""); setToSite({ holder_type: "user" });
    setLines([newMoveLine()]); setRet(""); setRemarks(""); setPhoto(""); setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind]);

  // Site holdings us custodian ke; warehouse holdings sirf transfer me (godown → godown).
  useEffect(() => {
    if (!open || !cust) return;
    let alive = true;
    setHold(null);
    const calls = [api.get(`/assets/holdings?custodian_user_id=${cust}`).catch(() => null)];
    if (!isReturn) for (const w of myWh) calls.push(api.get(`/assets/holdings?warehouse_id=${w.id}`).catch(() => null));
    Promise.all(calls).then((rs) => {
      if (!alive) return;
      const rows = [];
      rs.forEach((r) => { if (r && r.success) rows.push(...(r.data || [])); });
      setHold(rows.filter((h) => (isReturn ? !!h.project_id : true)));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cust, isReturn]);

  const groups = useMemo(() => {
    const m = new Map();
    for (const h of hold || []) {
      const k = groupKey(h);
      if (!m.has(k)) m.set(k, {
        key: k, warehouse_id: h.warehouse_id, project_id: h.project_id, holder_type: h.holder_type, holder_id: h.holder_id, custodian_user_id: h.custodian_user_id,
        label: h.warehouse_id ? `${t("assets.warehouse")} · ${h.warehouse_name || ""}` : `${h.project_name || ""} · ${h.holder_name || ""} (${holderLabel(h.holder_type)})`,
        rows: [],
      });
      m.get(k).rows.push(h);
    }
    return [...m.values()];
  }, [hold]);
  const g = groups.find((x) => x.key === from);
  const fromIsWh = !!(g && g.warehouse_id);
  const stockOf = (key) => (g ? g.rows.find((h) => String(h.id) === String(key)) : null);
  const updLine = (i, v) => setLines((p) => p.map((l, j) => (j === i ? v : l)));
  const external = !isReturn && !fromIsWh && ["worker", "subcon"].includes(toSite.holder_type);

  const save = async () => {
    setError("");
    if (!g) { setError(t("assets.err_from_required")); return; }
    let toLoc;
    if (isReturn || fromIsWh) {
      if (!toWh) { setError(t("assets.err_warehouse_required")); return; }
      if (fromIsWh && Number(toWh) === Number(g.warehouse_id)) { setError(t("assets.err_same_place")); return; }
      toLoc = { warehouse_id: Number(toWh) };
    } else {
      if (!siteLocValid(toSite)) { setError(t("assets.err_to_required")); return; }
      toLoc = siteLocBody(toSite);
    }
    const items = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], h = stockOf(l.key);
      if (!h) { setError(t("assets.err_line_item", { n: i + 1 })); return; }
      const qty = h.tracking_mode === "serialized" ? 1 : Number(l.qty);
      if (!(qty > 0)) { setError(t("assets.err_line_qty", { n: i + 1 })); return; }
      const have = N(h.qty_good) + N(h.qty_damaged);
      if (qty > have) { setError(t("assets.err_line_stock", { n: i + 1, have: fmtN(have) })); return; }
      const rent = external && l.charge_mode === "rent";
      if (rent && !(Number(l.rent_rate) > 0)) { setError(t("assets.err_rent_rate", { n: i + 1 })); return; }
      items.push({
        asset_item_id: h.asset_item_id, qty, condition: l.condition || "good",
        charge_mode: rent ? "rent" : "free", rent_rate: rent ? Number(l.rent_rate) : null, rent_basis: rent ? (l.rent_basis || "day") : null,
        remarks: l.remarks || null,
      });
    }
    const fromLoc = g.warehouse_id ? { warehouse_id: g.warehouse_id }
      : { project_id: g.project_id, holder_type: g.holder_type, holder_id: g.holder_id, custodian_user_id: g.custodian_user_id };
    setBusy(true);
    const r = await api.post("/assets/vouchers", {
      type: isReturn ? "return" : "transfer", date, from: fromLoc, to: toLoc, items,
      expected_return_date: !isReturn && !fromIsWh && ret ? ret : null, remarks: remarks || null, photo_url: photo || null,
    });
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.voucher_done", { no: (r.data && r.data.voucher_no) || "" })); onSaved(r.data); onClose(); }
    else setError((r && r.message) || t("assets.save_failed"));
  };

  const lineCols = external ? "1.8fr 80px 100px 1.6fr 1fr auto" : "1.8fr 80px 100px 1fr auto";
  return (
    <Modal open={open} onClose={onClose} width={960}
      title={isReturn ? t("assets.return_title") : t("assets.transfer_title")}
      sub={isReturn ? t("assets.return_sub") : t("assets.transfer_sub")}
      footer={<><Btn ghost onClick={onClose}>{t("assets.cancel")}</Btn><Btn onClick={save} disabled={busy} icon={isReturn ? IcIn : IcTrns}>{busy ? t("assets.saving") : isReturn ? t("assets.return_save") : t("assets.transfer_save")}</Btn></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        {canAll && (
          <Field label={t("assets.custodian")} span={2} hint={t("assets.custodian_admin_hint")}>
            <SearchSelect value={cust} onChange={(k) => { setCust(k); setFrom(""); setLines([newMoveLine()]); }} accent={T.ind}
              options={(pickers.users || []).map((u) => ({ id: u.id, name: u.name + (u.role ? ` · ${u.role}` : "") }))} placeholder={t("assets.select_custodian")} />
          </Field>
        )}
        <Field label={t("assets.from")} hint={hold && hold.length === 0 ? t("assets.from_empty_hint") : undefined}>
          <select value={from} onChange={(e) => { setFrom(e.target.value); setLines([newMoveLine()]); }} style={inp} disabled={hold == null}>
            <option value="">{hold == null ? t("assets.loading") : t("assets.select")}</option>
            {groups.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
        </Field>
        <Field label={t("assets.date")}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} /></Field>

        {(isReturn || fromIsWh) ? (
          <Field label={t("assets.to_warehouse")} span={2}>
            <select value={toWh} onChange={(e) => setToWh(e.target.value)} style={inp}>
              <option value="">{t("assets.select")}</option>
              {all.filter((w) => !(fromIsWh && w.id === g.warehouse_id)).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
        ) : (
          <>
            <div style={{ gridColumn: "span 2", fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginTop: 4 }}>{t("assets.to_site")}</div>
            <ToSiteFields v={toSite} onChange={setToSite} pickers={pickers} me={me} />
          </>
        )}
      </div>

      <Panel title={t("assets.items")} action={<Btn size="sm" ghost icon={IcAdd} onClick={() => setLines((p) => [...p, newMoveLine()])} disabled={!g}>{t("assets.add_line")}</Btn>}>
        {!g && <Empty>{t("assets.move_pick_from")}</Empty>}
        {g && (
          <>
            <Row head cols={lineCols}><span>{t("assets.item")}</span><span>{t("assets.qty")}</span><span>{t("assets.condition")}</span>{external && <span>{t("assets.charge")}</span>}<span>{t("assets.remarks")}</span><span></span></Row>
            {lines.map((l, i) => {
              const h = stockOf(l.key);
              return (
                <Row key={i} cols={lineCols}>
                  <div>
                    <SearchSelect value={l.key} accent={T.ind} compact
                      onChange={(k) => { const hh = stockOf(k); updLine(i, { ...l, key: k, qty: hh && hh.tracking_mode === "serialized" ? "1" : l.qty }); }}
                      options={g.rows.map((s) => ({ id: s.id, name: `${lineLabel(s)} — ${fmtN(s.qty_good)} ${t("assets.good").toLowerCase()}${N(s.qty_damaged) ? `, ${fmtN(s.qty_damaged)} ${t("assets.damaged").toLowerCase()}` : ""}` }))}
                      placeholder={t("assets.select_item")} />
                    {h && <div style={{ fontSize: 10, color: T.t4, marginTop: 3 }}>{t("assets.with_you_n", { n: fmtN(N(h.qty_good) + N(h.qty_damaged)), unit: h.unit || "" })}</div>}
                  </div>
                  <input value={h && h.tracking_mode === "serialized" ? "1" : l.qty} inputMode="decimal" style={inpSm} disabled={!!(h && h.tracking_mode === "serialized")}
                    onChange={(e) => updLine(i, { ...l, qty: e.target.value.replace(/[^0-9.]/g, "") })} />
                  <select value={l.condition} onChange={(e) => updLine(i, { ...l, condition: e.target.value })} style={inpSm}>
                    <option value="good">{t("assets.cond_good")}</option>
                    <option value="damaged">{t("assets.cond_damaged")}</option>
                    <option value="lost">{t("assets.cond_lost")}</option>
                  </select>
                  {external && <RentCell ln={l} onChange={(nl) => updLine(i, nl)} enabled />}
                  <input value={l.remarks} onChange={(e) => updLine(i, { ...l, remarks: e.target.value })} style={inpSm} />
                  <Btn size="sm" ghost onClick={() => setLines((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : [newMoveLine()]))}><IcTrash size={12} color={T.red} /></Btn>
                </Row>
              );
            })}
          </>
        )}
      </Panel>
      {isReturn && <div style={{ fontSize: 11, color: T.t4, marginTop: 8 }}>{t("assets.lost_hint")}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
        {!isReturn && !fromIsWh && <Field label={t("assets.expected_return")} hint={t("assets.expected_return_hint")}><input type="date" value={ret} onChange={(e) => setRet(e.target.value)} style={inp} /></Field>}
        <Field label={t("assets.remarks")}><input value={remarks} onChange={(e) => setRemarks(e.target.value)} style={inp} /></Field>
        <PhotoField value={photo} onChange={setPhoto} />
      </div>
      <ErrBox>{error}</ErrBox>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// REPAIR — vendor ke paas bhejna, aur wahan se wapas laana
// ══════════════════════════════════════════════════════════════════
// Vendor apni tarah ki jagah hai: na godown, na site — sirf
// { holder_type:"repair", holder_id:<party id> }. Vendor app par hai hi nahi,
// isliye repair_out banate hi accepted ho jaata hai (koi accept nahi karega).
// Wapas laane ka haq us godown ka hai jisme cheez aa rahi hai, isliye "kahan"
// wali list bhi wahi warehouses jinka main incharge hoon.
function RepairForm({ open, kind, meta, pickers, me, canAll, onClose, onSaved }) {
  const toast = useToast();
  const isOut = kind === "out";
  const [party, setParty] = useState("");
  const [from, setFrom] = useState("");
  const [toWh, setToWh] = useState("");
  const [date, setDate] = useState(todayStr());
  const [hold, setHold] = useState(null);
  const [lines, setLines] = useState([newMoveLine()]);
  const [cost, setCost] = useState("");
  const [invoice, setInvoice] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const all = (meta && meta.warehouses) || [];
  const myIds = (meta && meta.my_warehouse_ids) || [];
  const myWh = canAll ? all : all.filter((w) => myIds.includes(w.id));

  useEffect(() => {
    if (!open) return;
    const def = myWh.find((w) => w.is_default) || myWh[0];
    setParty(""); setFrom(""); setToWh(def ? String(def.id) : ""); setDate(todayStr());
    setLines([newMoveLine()]); setCost(""); setInvoice(""); setRemarks(""); setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind]);

  // Bhejte waqt: mere godown + meri custody. Laate waqt: jo vendor ke paas pada hai.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setHold(null);
    const calls = isOut
      ? [api.get(`/assets/holdings?custodian_user_id=${me.id}`).catch(() => null),
         ...myWh.map((w) => api.get(`/assets/holdings?warehouse_id=${w.id}`).catch(() => null))]
      : [api.get("/assets/holdings?holder_type=repair").catch(() => null)];
    Promise.all(calls).then((rs) => {
      if (!alive) return;
      const rows = [];
      rs.forEach((r) => { if (r && r.success) rows.push(...(r.data || [])); });
      setHold(rows);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind]);

  // Bhejte waqt source ke groups (godown / kisi ki custody) — Transfer jaisa hi.
  const groups = useMemo(() => {
    if (!isOut) return [];
    const m = new Map();
    for (const h of hold || []) {
      const k = groupKey(h);
      if (!m.has(k)) m.set(k, {
        key: k, warehouse_id: h.warehouse_id, project_id: h.project_id, holder_type: h.holder_type,
        holder_id: h.holder_id, custodian_user_id: h.custodian_user_id,
        label: h.warehouse_id ? `${t("assets.warehouse")} · ${h.warehouse_name || ""}` : `${h.project_name || ""} · ${h.holder_name || ""} (${holderLabel(h.holder_type)})`,
        rows: [],
      });
      m.get(k).rows.push(h);
    }
    return [...m.values()];
  }, [hold, isOut]);

  // Laate waqt sirf wahi vendor dikhte hain jinke paas sach me kuch pada hai.
  const vendors = useMemo(() => {
    if (isOut) return [];
    const m = new Map();
    for (const h of hold || []) {
      if (h.holder_type !== "repair") continue;
      if (!m.has(String(h.holder_id))) m.set(String(h.holder_id), { id: h.holder_id, name: h.repair_party || h.holder_name || "—" });
    }
    return [...m.values()];
  }, [hold, isOut]);

  const g = groups.find((x) => x.key === from);
  const atVendor = useMemo(() => (hold || []).filter((h) => h.holder_type === "repair" && String(h.holder_id) === String(party)), [hold, party]);
  const srcRows = isOut ? (g ? g.rows : []) : atVendor;
  const srcReady = isOut ? !!g : !!party;
  const stockOf = (key) => srcRows.find((h) => String(h.id) === String(key));
  const updLine = (i, v) => setLines((p) => p.map((l, j) => (j === i ? v : l)));

  const save = async () => {
    setError("");
    if (!party) { setError(t("assets.select_repair_vendor")); return; }
    if (isOut && !g) { setError(t("assets.err_from_required")); return; }
    if (!isOut && !toWh) { setError(t("assets.err_warehouse_required")); return; }
    const items = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], h = stockOf(l.key);
      if (!h) { setError(t("assets.err_line_item", { n: i + 1 })); return; }
      const qty = h.tracking_mode === "serialized" ? 1 : Number(l.qty);
      if (!(qty > 0)) { setError(t("assets.err_line_qty", { n: i + 1 })); return; }
      const have = N(h.qty_good) + N(h.qty_damaged);
      if (qty > have) { setError(t("assets.err_line_stock", { n: i + 1, have: fmtN(have) })); return; }
      items.push({ asset_item_id: h.asset_item_id, qty, condition: l.condition || "good", remarks: l.remarks || null });
    }
    const fromLoc = isOut
      ? (g.warehouse_id ? { warehouse_id: g.warehouse_id }
        : { project_id: g.project_id, holder_type: g.holder_type, holder_id: g.holder_id, custodian_user_id: g.custodian_user_id })
      : repairLoc(party);
    setBusy(true);
    const r = await api.post("/assets/vouchers", {
      type: isOut ? "repair_out" : "repair_in", date, from: fromLoc,
      to: isOut ? repairLoc(party) : { warehouse_id: Number(toWh) }, items,
      repair_cost: cost === "" ? null : Number(cost), invoice_no: invoice || null, remarks: remarks || null,
    });
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.voucher_done", { no: (r.data && r.data.voucher_no) || "" })); onSaved(r.data); onClose(); }
    else setError((r && r.message) || t("assets.save_failed"));
  };

  const lineCols = "1.8fr 80px 100px 1fr auto";
  return (
    <Modal open={open} onClose={onClose} width={920}
      title={isOut ? t("assets.repair_out_title") : t("assets.repair_in_title")}
      sub={isOut ? t("assets.repair_out_sub") : t("assets.repair_in_sub")}
      footer={<><Btn ghost onClick={onClose}>{t("assets.cancel")}</Btn>
        <Btn onClick={save} disabled={busy} icon={IcTool}>{busy ? t("assets.saving") : isOut ? t("assets.btn_repair_out") : t("assets.repair_in_save")}</Btn></>}>
      {isOut && hold && hold.length === 0 && <Notice tone="warn">{t("assets.from_empty_hint")}</Notice>}
      {!isOut && hold && vendors.length === 0 && <Notice tone="warn">{t("assets.repair_none_at_vendor")}</Notice>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        {isOut ? (
          <Field label={t("assets.from")} hint={hold && hold.length === 0 ? t("assets.from_empty_hint") : undefined}>
            <select value={from} onChange={(e) => { setFrom(e.target.value); setLines([newMoveLine()]); }} style={inp} disabled={hold == null}>
              <option value="">{hold == null ? t("assets.loading") : t("assets.select")}</option>
              {groups.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
          </Field>
        ) : (
          <Field label={t("assets.repair_vendor")}>
            <SearchSelect value={party} accent={T.ind} onChange={(k) => { setParty(k); setLines([newMoveLine()]); }}
              options={vendors.map((v) => ({ id: v.id, name: v.name }))} placeholder={t("assets.select_repair_vendor")} />
          </Field>
        )}
        <Field label={t("assets.date")}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} /></Field>
        {isOut ? (
          <Field label={t("assets.repair_vendor")} span={2}>
            <SearchSelect value={party} onChange={(k) => setParty(k)} accent={T.ind}
              options={(pickers.parties || []).map((p) => ({ id: p.id, name: p.name + (p.type ? ` · ${p.type}` : "") }))} placeholder={t("assets.select_repair_vendor")} />
          </Field>
        ) : (
          <Field label={t("assets.to_warehouse")} span={2} hint={myWh.length ? undefined : t("assets.issue_no_warehouse")}>
            <select value={toWh} onChange={(e) => setToWh(e.target.value)} style={inp}>
              <option value="">{t("assets.select")}</option>
              {myWh.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
        )}
      </div>

      <Panel title={t("assets.items")} action={<Btn size="sm" ghost icon={IcAdd} onClick={() => setLines((p) => [...p, newMoveLine()])} disabled={!srcReady}>{t("assets.add_line")}</Btn>}>
        {hold == null && <Spinner />}
        {hold != null && !srcReady && <Empty>{isOut ? t("assets.move_pick_from") : t("assets.repair_in_pick_vendor")}</Empty>}
        {hold != null && srcReady && srcRows.length === 0 && <Empty>{isOut ? t("assets.from_empty_hint") : t("assets.repair_in_empty")}</Empty>}
        {hold != null && srcReady && srcRows.length > 0 && (
          <>
            <Row head cols={lineCols}><span>{t("assets.item")}</span><span>{t("assets.qty")}</span><span>{t("assets.condition")}</span><span>{t("assets.remarks")}</span><span></span></Row>
            {lines.map((l, i) => {
              const h = stockOf(l.key);
              return (
                <Row key={i} cols={lineCols}>
                  <div>
                    <SearchSelect value={l.key} accent={T.ind} compact
                      onChange={(k) => { const hh = stockOf(k); updLine(i, { ...l, key: k, qty: hh && hh.tracking_mode === "serialized" ? "1" : l.qty }); }}
                      options={srcRows.map((s) => ({ id: s.id, name: `${lineLabel(s)} — ${fmtN(s.qty_good)} ${t("assets.good").toLowerCase()}${N(s.qty_damaged) ? `, ${fmtN(s.qty_damaged)} ${t("assets.damaged").toLowerCase()}` : ""}` }))}
                      placeholder={t("assets.select_item")} />
                    {h && <div style={{ fontSize: 10, color: T.t4, marginTop: 3 }}>
                      {t(isOut ? "assets.with_you_n" : "assets.repair_at_n", { n: fmtN(N(h.qty_good) + N(h.qty_damaged)), unit: h.unit || "" })}
                    </div>}
                  </div>
                  <input value={h && h.tracking_mode === "serialized" ? "1" : l.qty} inputMode="decimal" style={inpSm} disabled={!!(h && h.tracking_mode === "serialized")}
                    onChange={(e) => updLine(i, { ...l, qty: e.target.value.replace(/[^0-9.]/g, "") })} />
                  <select value={l.condition} onChange={(e) => updLine(i, { ...l, condition: e.target.value })} style={inpSm}>
                    <option value="good">{t("assets.cond_good")}</option>
                    <option value="damaged">{t("assets.cond_damaged")}</option>
                    {!isOut && <option value="lost">{t("assets.cond_lost")}</option>}
                  </select>
                  <input value={l.remarks} onChange={(e) => updLine(i, { ...l, remarks: e.target.value })} style={inpSm} />
                  <Btn size="sm" ghost onClick={() => setLines((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : [newMoveLine()]))}><IcTrash size={12} color={T.red} /></Btn>
                </Row>
              );
            })}
          </>
        )}
      </Panel>
      <div style={{ fontSize: 11, color: T.t4, marginTop: 8 }}>{isOut ? t("assets.repair_out_hint") : t("assets.repair_in_hint")}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
        <Field label={t("assets.repair_cost")} hint={t("assets.repair_cost_hint")}>
          <input value={cost} inputMode="decimal" placeholder="₹" onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
        </Field>
        <Field label={t("assets.invoice_no")}><input value={invoice} onChange={(e) => setInvoice(e.target.value)} style={inp} /></Field>
        <Field label={t("assets.remarks")}><input value={remarks} onChange={(e) => setRemarks(e.target.value)} style={inp} /></Field>
      </div>
      <ErrBox>{error}</ErrBox>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// MOVEMENTS — voucher log
// ══════════════════════════════════════════════════════════════════
function MovementsTab({ refreshKey, meta, pickers, canCreate, onIssue, onTransfer, onReturn, onRepairOut, onRepairIn, onOpenVoucher }) {
  const [fl, setFl] = useState({ type: "", status: "", project_id: "", warehouse_id: "", from: "", to: "" });
  const [rows, setRows] = useState(null);
  const upd = (k, v) => setFl((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let alive = true;
    setRows(null);
    api.get(`/assets/vouchers?${qs({ ...fl, limit: 300 })}`).then((r) => {
      if (!alive) return;
      const list = r && r.success ? r.data || [] : [];
      setRows(fl.type ? list : list.filter((v) => v.type !== "grn"));
    }).catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [fl, refreshKey]);

  const cols = "120px 78px 88px 1.3fr 1.3fr 1fr 70px 90px 1fr";
  return (
    <Panel title={t("assets.movements_title")}
      action={canCreate && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <Btn size="sm" icon={IcOut} onClick={onIssue}>{t("assets.btn_issue")}</Btn>
          <Btn size="sm" ghost icon={IcTrns} onClick={onTransfer}>{t("assets.btn_transfer")}</Btn>
          <Btn size="sm" ghost icon={IcIn} onClick={onReturn}>{t("assets.btn_return")}</Btn>
          <Btn size="sm" ghost icon={IcTool} onClick={onRepairOut}>{t("assets.btn_repair_out")}</Btn>
          <Btn size="sm" ghost icon={IcTool} onClick={onRepairIn}>{t("assets.btn_repair_in")}</Btn>
        </div>)}>
      <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap", alignItems: "center" }}>
        <select value={fl.type} onChange={(e) => upd("type", e.target.value)} style={{ ...inp, width: 130 }}>
          <option value="">{t("assets.all_types")}</option>
          <option value="issue">{t("assets.type_issue")}</option>
          <option value="return">{t("assets.type_return")}</option>
          <option value="transfer">{t("assets.type_transfer")}</option>
          <option value="repair_out">{t("assets.type_repair_out")}</option>
          <option value="repair_in">{t("assets.type_repair_in")}</option>
          <option value="adjust">{t("assets.type_adjust")}</option>
          <option value="opening">{t("assets.type_opening")}</option>
        </select>
        <select value={fl.status} onChange={(e) => upd("status", e.target.value)} style={{ ...inp, width: 130 }}>
          <option value="">{t("assets.all_status")}</option>
          <option value="pending">{t("assets.status_pending")}</option>
          <option value="accepted">{t("assets.status_accepted")}</option>
          <option value="rejected">{t("assets.status_rejected")}</option>
          <option value="cancelled">{t("assets.status_cancelled")}</option>
        </select>
        <div style={{ width: 200 }}>
          <SearchSelect value={fl.project_id} onChange={(k) => upd("project_id", k)} accent={T.ind}
            options={[{ id: "", name: t("assets.all_projects") }, ...(pickers.projects || []).map((p) => ({ id: p.id, name: p.name }))]} placeholder={t("assets.all_projects")} />
        </div>
        <select value={fl.warehouse_id} onChange={(e) => upd("warehouse_id", e.target.value)} style={{ ...inp, width: 160 }}>
          <option value="">{t("assets.all_warehouses")}</option>
          {((meta && meta.warehouses) || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <input type="date" value={fl.from} onChange={(e) => upd("from", e.target.value)} style={{ ...inp, width: 140 }} title={t("assets.from_date")} />
        <input type="date" value={fl.to} onChange={(e) => upd("to", e.target.value)} style={{ ...inp, width: 140 }} title={t("assets.to_date")} />
        {(fl.type || fl.status || fl.project_id || fl.warehouse_id || fl.from || fl.to) && (
          <Btn size="sm" ghost onClick={() => setFl({ type: "", status: "", project_id: "", warehouse_id: "", from: "", to: "" })}>{t("assets.clear")}</Btn>
        )}
      </div>
      {rows == null && <Spinner />}
      {rows && rows.length === 0 && <Empty>{t("assets.movements_empty")}</Empty>}
      {rows && rows.length > 0 && (
        <Scroll minWidth={1000}>
          <Row head cols={cols}><span>{t("assets.voucher")}</span><span>{t("assets.date")}</span><span>{t("assets.type")}</span><span>{t("assets.from")}</span><span>{t("assets.to")}</span><span>{t("assets.custodian")}</span><span>{t("assets.lines_qty")}</span><span>{t("assets.status")}</span><span>{t("assets.created_by")}</span></Row>
          {rows.map((v) => {
            const f = sideText(v, "from"), to = sideText(v, "to");
            return (
              <Row key={v.id} cols={cols} onClick={() => onOpenVoucher(v.id)}>
                <span style={{ fontWeight: 600, color: T.t1 }}>{v.voucher_no}</span>
                <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(v.date)}</span>
                <span><TypePill ty={v.type} /></span>
                <div style={{ minWidth: 0 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.main}</div><div style={{ fontSize: 10.5, color: T.t4 }}>{f.sub}</div></div>
                <div style={{ minWidth: 0 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{to.main}</div><div style={{ fontSize: 10.5, color: T.t4 }}>{to.sub}</div></div>
                <span style={{ fontSize: 11.5 }}>{v.to_custodian_name || v.to_warehouse_name || "—"}</span>
                <span>{N(v.line_count)} / {fmtN(v.total_qty)}</span>
                <span><StatusPill s={v.status} /></span>
                <span style={{ fontSize: 11.5, color: T.t3 }}>{v.created_by_name || "—"}</span>
              </Row>
            );
          })}
        </Scroll>
      )}
    </Panel>
  );
}

// ══════════════════════════════════════════════════════════════════
// GINTI — physical verification
// ══════════════════════════════════════════════════════════════════
// Ledger sirf wahi jaanta hai jo kisi ne likha. Plate toot kar, dab kar ya
// bina voucher ke idhar-udhar ho jaate hain — isliye samay-samay par asli
// ginti karke ledger se milaya jaata hai.
//
// Ek jagah par ek hi khuli ginti reh sakti hai. Kholte hi system ka snapshot
// bandh jaata hai. Band karte waqt sirf gini hui line ka antar adjust voucher
// me jaata hai — bina gini line ko haath nahi lagta.

function NewVerificationModal({ open, meta, pickers, me, onClose, onCreated, onOpenExisting }) {
  const toast = useToast();
  const [where, setWhere] = useState("warehouse");
  const [wh, setWh] = useState("");
  const [site, setSite] = useState({ holder_type: "user" });
  const [date, setDate] = useState(todayStr());
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState(null);

  const all = (meta && meta.warehouses) || [];
  useEffect(() => {
    if (!open) return;
    const def = all.find((w) => w.is_default) || all[0];
    setWhere("warehouse"); setWh(def ? String(def.id) : ""); setSite({ holder_type: "user" });
    setDate(todayStr()); setRemarks(""); setError(""); setExisting(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, meta]);

  const save = async () => {
    setError(""); setExisting(null);
    let loc;
    if (where === "warehouse") {
      if (!wh) { setError(t("assets.err_warehouse_required")); return; }
      loc = { warehouse_id: Number(wh) };
    } else {
      if (!siteLocValid(site)) { setError(t("assets.err_to_required")); return; }
      loc = siteLocBody(site);
    }
    setBusy(true);
    const r = await api.post("/assets/verifications", { ...loc, date, remarks: remarks || null });
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.saved")); onCreated(r.data); onClose(); return; }
    setError((r && r.message) || t("assets.save_failed"));
    // 409 — is jagah ki ek ginti pehle se khuli hai; server uska id bhejta hai.
    if (r && r.data && r.data.id) setExisting(r.data.id);
  };

  return (
    <Modal open={open} onClose={onClose} width={640} title={t("assets.verify_new")} sub={t("assets.verify_new_sub")}
      footer={<><Btn ghost onClick={onClose}>{t("assets.cancel")}</Btn>
        {existing && <Btn ghost onClick={() => { onOpenExisting(existing); onClose(); }}>{t("assets.verify_open_existing")}</Btn>}
        <Btn onClick={save} disabled={busy} icon={IcCount}>{busy ? t("assets.saving") : t("assets.verify_start")}</Btn></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("assets.verify_pick_place")} span={2}>
          <Seg value={where} onChange={(k) => { setWhere(k); setError(""); setExisting(null); }}
            options={[{ k: "warehouse", l: t("assets.warehouse") }, { k: "site", l: t("assets.site") }]} />
        </Field>
        {where === "warehouse" ? (
          <Field label={t("assets.warehouse")} span={2}>
            <select value={wh} onChange={(e) => setWh(e.target.value)} style={inp}>
              <option value="">{t("assets.select")}</option>
              {all.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
        ) : <ToSiteFields v={site} onChange={setSite} pickers={pickers} me={me} />}
        <Field label={t("assets.date")}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} /></Field>
        <Field label={t("assets.remarks")}><input value={remarks} onChange={(e) => setRemarks(e.target.value)} style={inp} /></Field>
      </div>
      <div style={{ marginTop: 14 }}><Notice>{t("assets.verify_snapshot_hint")}</Notice></div>
      <ErrBox>{error}</ErrBox>
    </Modal>
  );
}

function VerificationDrawer({ id, me, isAdmin, canApprove, onClose, onChanged, onOpenVoucher }) {
  const toast = useToast();
  const [v, setV] = useState(null);
  const [failed, setFailed] = useState("");
  const [edit, setEdit] = useState({});          // line id → { g, d, r } — sirf jo haath se badla
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setFailed("");
    const r = await api.get(`/assets/verifications/${id}`).catch(() => null);
    if (r && r.success) setV(r.data);
    else { setV(null); setFailed((r && r.message) || t("assets.verify_load_failed")); }
  }, [id]);
  useEffect(() => { setV(null); setEdit({}); setError(""); load(); }, [load]);

  const draft = v && v.status === "draft";
  const canCount = !!(v && v.can_count);
  const canCancel = !!(draft && v && (isAdmin || v.created_by === me.id));

  // Line ki abhi ki value: pehle jo haath se bhara, warna server se aayi.
  const cellOf = (ln) => {
    const e = edit[ln.id] || {};
    return {
      g: e.g !== undefined ? e.g : (ln.counted_good == null ? "" : String(Number(ln.counted_good))),
      d: e.d !== undefined ? e.d : (ln.counted_damaged == null ? "" : String(Number(ln.counted_damaged))),
      r: e.r !== undefined ? e.r : (ln.remarks || ""),
    };
  };
  const setCell = (ln, k, val) => setEdit((p) => ({ ...p, [ln.id]: { ...cellOf(ln), ...(p[ln.id] || {}), [k]: val } }));

  const saveCount = async () => {
    setError("");
    const ids = Object.keys(edit);
    if (!ids.length) { setError(t("assets.verify_nothing_changed")); return; }
    const items = ids.map((lid) => {
      const e = edit[lid];
      const g = e.g === undefined ? undefined : (e.g === "" ? null : Number(e.g));
      return { id: Number(lid), counted_good: g, counted_damaged: g == null ? null : (e.d === "" || e.d === undefined ? 0 : Number(e.d)), remarks: e.r };
    });
    setBusy(true);
    const r = await api.put(`/assets/verifications/${v.id}/count`, { items });
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.saved")); setEdit({}); setV(r.data); onChanged(); }
    else setError((r && r.message) || t("assets.save_failed"));
  };

  const doClose = async () => {
    if (!window.confirm(t("assets.verify_close_confirm"))) return;
    setBusy(true);
    const r = await api.post(`/assets/verifications/${v.id}/close`, {});
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.saved")); setEdit({}); setV(r.data); onChanged(); }
    else toast.error((r && r.message) || t("assets.action_failed"));
  };
  const doCancel = async () => {
    if (!window.confirm(t("assets.verify_cancel_confirm"))) return;
    setBusy(true);
    const r = await api.post(`/assets/verifications/${v.id}/cancel`, {});
    setBusy(false);
    if (r && r.success) { toast.success(r.message || t("assets.saved")); onChanged(); onClose(); }
    else toast.error((r && r.message) || t("assets.action_failed"));
  };

  const w = verifWhere(v);
  const cols = "90px 1.5fr 1fr 80px 140px 84px 1fr";
  const footer = !v ? <Btn ghost onClick={onClose}>{t("assets.close")}</Btn>
    : <>
        <Btn ghost onClick={onClose}>{t("assets.close")}</Btn>
        {canCancel && <Btn ghost onClick={doCancel} disabled={busy} style={{ color: T.red }}>{t("assets.verify_cancel_btn")}</Btn>}
        {draft && canCount && <Btn onClick={saveCount} disabled={busy}>{busy ? t("assets.saving") : t("assets.verify_save_count")}</Btn>}
        {draft && canApprove && <Btn c={T.grn} icon={IcChk} onClick={doClose} disabled={busy}>{t("assets.verify_close_btn")}</Btn>}
      </>;

  return (
    <Drawer open onClose={onClose} width={860}
      title={v ? v.verification_no : t("assets.tab_verify")}
      head={v ? <Pill label={verifStatusLabel(v.status)} {...verifTone(v.status)} /> : null}
      sub={v ? `${fmtD(v.date)} · ${t("assets.created_by")}: ${v.created_by_name || "—"}${v.closed_by_name ? ` · ${t("assets.closed_by")}: ${v.closed_by_name}` : ""}` : ""}
      footer={footer}>
      {!v && !failed && <Spinner />}
      {failed && <Empty>{failed}</Empty>}
      {v && (
        <>
          {draft && canCount && <Notice>{t("assets.verify_null_hint")}</Notice>}
          {draft && !canCount && <Notice tone="warn">{t("assets.verify_readonly")}</Notice>}
          {v.status === "closed" && (
            <Notice>{v.adjust_voucher_no ? t("assets.verify_closed_diff_note", { no: v.adjust_voucher_no }) : t("assets.verify_closed_ok_note")}</Notice>
          )}
          {v.status === "cancelled" && <Notice tone="warn">{t("assets.verify_cancelled_note")}</Notice>}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, padding: "12px 14px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 10, marginBottom: 14 }}>
            <KV k={t("assets.verify_place")} v={<span>{w.main}{w.sub ? <span style={{ display: "block", fontSize: 11, color: T.t3, fontWeight: 400 }}>{w.sub}</span> : null}</span>} />
            <KV k={t("assets.custodian")} v={v.custodian_name} />
            <KV k={t("assets.lines")} v={fmtN(v.line_count)} />
            <KV k={t("assets.verify_pending")} v={<span style={{ color: N(v.pending_count) ? T.amb : T.t1 }}>{fmtN(v.pending_count)}</span>} />
            <KV k={t("assets.verify_diff")} v={<span style={{ color: N(v.diff_count) ? T.red : T.t1 }}>{fmtN(v.diff_count)}</span>} />
            <KV k={t("assets.verify_adjust_voucher")} v={v.adjust_voucher_no
              ? <span onClick={() => onOpenVoucher(v.adjust_voucher_id)} style={{ color: T.ind, cursor: "pointer" }}>{v.adjust_voucher_no}</span>
              : null} />
          </div>

          <Panel title={t("assets.lines")}>
            <Scroll minWidth={860}>
              <Row head cols={cols}>
                <span>{t("assets.code")}</span><span>{t("assets.item")}</span><span>{t("assets.spec")}</span>
                <span>{t("assets.verify_system")}</span><span>{t("assets.verify_counted")}</span><span>{t("assets.verify_gap")}</span><span>{t("assets.remarks")}</span>
              </Row>
              {(v.items || []).map((ln) => {
                const c = cellOf(ln);
                const sg = N(ln.system_good), sd = N(ln.system_damaged);
                const counted = c.g !== "";
                const cg = counted ? Number(c.g) : 0, cd = counted ? (c.d === "" ? 0 : Number(c.d)) : 0;
                const net = counted ? (cg + cd) - (sg + sd) : null;
                const condChanged = counted && net === 0 && cg !== sg;
                return (
                  <Row key={ln.id} cols={cols}>
                    <span style={{ fontSize: 11.5, color: T.t3, fontFamily: "monospace" }}>{ln.code || "—"}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: T.t1 }}>{ln.name}</div>
                      <div style={{ fontSize: 10.5, color: T.t4 }}>{[ln.unit, trackLabel(ln.tracking_mode)].filter(Boolean).join(" · ")}</div>
                    </div>
                    <span style={{ color: T.t3 }}>{ln.spec || "—"}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{fmtN(sg)}</div>
                      {sd > 0 && <div style={{ fontSize: 10.5, color: T.amb }}>{fmtN(sd)} {t("assets.damaged").toLowerCase()}</div>}
                    </div>
                    <div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input value={c.g} inputMode="decimal" placeholder="—" title={t("assets.good")} readOnly={!canCount}
                          onChange={(e) => setCell(ln, "g", e.target.value.replace(/[^0-9.]/g, ""))}
                          style={{ ...inpSm, width: 60, background: canCount ? T.surface : T.surfaceB }} />
                        <input value={c.d} inputMode="decimal" placeholder="—" title={t("assets.damaged")} readOnly={!canCount}
                          onChange={(e) => setCell(ln, "d", e.target.value.replace(/[^0-9.]/g, ""))}
                          style={{ ...inpSm, width: 60, background: canCount ? T.surface : T.surfaceB }} />
                      </div>
                      {/* Sirf damaged bhar dena kaafi nahi — good khali rahe to line "gini nahi" hi rehti hai. */}
                      {!counted && <div style={{ fontSize: 10, color: c.d === "" ? T.t4 : T.amb, marginTop: 3 }}>{t("assets.verify_not_counted")}</div>}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, color: net == null ? T.t4 : net < 0 ? T.red : net > 0 ? T.grn : T.t4 }}>
                        {net == null ? "—" : net > 0 ? `+${fmtN(net)}` : fmtN(net)}
                      </span>
                      {condChanged && <div style={{ fontSize: 10, color: T.amb }}>{t("assets.verify_cond_changed")}</div>}
                    </div>
                    <input value={c.r} style={inpSm} readOnly={!canCount} onChange={(e) => setCell(ln, "r", e.target.value)} />
                  </Row>
                );
              })}
            </Scroll>
          </Panel>
          {v.remarks && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 10 }}>{t("assets.remarks")}: {v.remarks}</div>}
          <ErrBox>{error}</ErrBox>
        </>
      )}
    </Drawer>
  );
}

function VerificationsTab({ refreshKey, meta, pickers, canCreate, onNew, onOpen, onOpenVoucher }) {
  const [fl, setFl] = useState({ status: "", warehouse_id: "", project_id: "", mine: "" });
  const [rows, setRows] = useState(null);
  const upd = (k, v) => setFl((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let alive = true;
    setRows(null);
    api.get(`/assets/verifications?${qs(fl)}`).then((r) => { if (alive) setRows(r && r.success ? r.data || [] : []); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [fl, refreshKey]);

  const cols = "118px 78px 1.4fr 1.2fr 84px 56px 56px 70px 112px";
  return (
    <Panel title={t("assets.verify_title")} action={canCreate && <Btn size="sm" icon={IcAdd} onClick={onNew}>{t("assets.verify_new")}</Btn>}>
      <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap", alignItems: "center" }}>
        <Seg value={fl.mine} onChange={(k) => upd("mine", k)} options={[{ k: "", l: t("assets.all") }, { k: "1", l: t("assets.verify_mine") }]} />
        <select value={fl.status} onChange={(e) => upd("status", e.target.value)} style={{ ...inp, width: 140 }}>
          <option value="">{t("assets.all_status")}</option>
          <option value="draft">{t("assets.verify_draft")}</option>
          <option value="closed">{t("assets.verify_closed")}</option>
          <option value="cancelled">{t("assets.status_cancelled")}</option>
        </select>
        <select value={fl.warehouse_id} onChange={(e) => upd("warehouse_id", e.target.value)} style={{ ...inp, width: 160 }}>
          <option value="">{t("assets.all_warehouses")}</option>
          {((meta && meta.warehouses) || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <div style={{ width: 200 }}>
          <SearchSelect value={fl.project_id} onChange={(k) => upd("project_id", k)} accent={T.ind}
            options={[{ id: "", name: t("assets.all_projects") }, ...(pickers.projects || []).map((p) => ({ id: p.id, name: p.name }))]} placeholder={t("assets.all_projects")} />
        </div>
        {(fl.status || fl.warehouse_id || fl.project_id || fl.mine) && (
          <Btn size="sm" ghost onClick={() => setFl({ status: "", warehouse_id: "", project_id: "", mine: "" })}>{t("assets.clear")}</Btn>
        )}
      </div>
      {rows == null && <Spinner />}
      {rows && rows.length === 0 && (
        <Empty>{t("assets.verify_empty")}<br /><span style={{ fontSize: 11.5 }}>{t("assets.verify_empty_hint")}</span></Empty>
      )}
      {rows && rows.length > 0 && (
        <Scroll minWidth={1000}>
          <Row head cols={cols}>
            <span>{t("assets.verify_no")}</span><span>{t("assets.date")}</span><span>{t("assets.verify_place")}</span><span>{t("assets.verify_owner")}</span>
            <span>{t("assets.status")}</span><span>{t("assets.lines")}</span><span>{t("assets.verify_pending")}</span><span>{t("assets.verify_diff")}</span><span>{t("assets.verify_adjust_voucher")}</span>
          </Row>
          {rows.map((v) => {
            const w = verifWhere(v);
            return (
              <Row key={v.id} cols={cols} onClick={() => onOpen(v.id)}>
                <span style={{ fontWeight: 600, color: T.t1 }}>{v.verification_no}</span>
                <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(v.date)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.main}</div>
                  <div style={{ fontSize: 10.5, color: T.t4 }}>{w.sub}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.custodian_name || v.created_by_name || "—"}</div>
                  {v.custodian_name && v.created_by_name && <div style={{ fontSize: 10.5, color: T.t4 }}>{t("assets.created_by")}: {v.created_by_name}</div>}
                </div>
                <span><Pill label={verifStatusLabel(v.status)} {...verifTone(v.status)} /></span>
                <span>{fmtN(v.line_count)}</span>
                <span style={{ color: N(v.pending_count) ? T.amb : T.t4 }}>{fmtN(v.pending_count)}</span>
                <span style={{ color: N(v.diff_count) ? T.red : T.t4 }}>{fmtN(v.diff_count)}</span>
                {v.adjust_voucher_no
                  ? <span style={{ color: T.ind, fontWeight: 600 }} onClick={(e) => { e.stopPropagation(); onOpenVoucher(v.adjust_voucher_id); }}>{v.adjust_voucher_no}</span>
                  : <span style={{ color: T.t4 }}>—</span>}
              </Row>
            );
          })}
        </Scroll>
      )}
    </Panel>
  );
}

// ══════════════════════════════════════════════════════════════════
// RENT — worker/subcon ke paas jo rent par pada hai
// ══════════════════════════════════════════════════════════════════
// SIRF REPORT. Yahan se koi entry kisi ledger me nahi jaati aur kisi ke
// paise apne aap nahi kate — kaatna hai to Finance se haath se karna hoga.
const monthStart = () => todayStr().slice(0, 8) + "01";

function RentTab({ refreshKey }) {
  const [range, setRange] = useState({ from: monthStart(), to: todayStr() });
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    api.get(`/assets/rent-report?${qs(range)}`).then((r) => { if (alive) setData(r && r.success ? r.data || {} : {}); })
      .catch(() => { if (alive) setData({}); });
    return () => { alive = false; };
  }, [range, refreshKey]);

  const cols = "1.5fr 1fr 60px 110px 56px 100px 1.2fr 1fr 80px";
  const holders = (data && data.by_holder) || [];
  return (
    <>
      <Panel title={t("assets.rent_title")} style={{ marginBottom: 14 }}
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="date" value={range.from} title={t("assets.from_date")} style={{ ...inp, width: 148 }}
              onChange={(e) => setRange((p) => ({ ...p, from: e.target.value }))} />
            <input type="date" value={range.to} title={t("assets.to_date")} style={{ ...inp, width: 148 }}
              onChange={(e) => setRange((p) => ({ ...p, to: e.target.value }))} />
          </div>}>
        <div style={{ padding: "13px 15px", display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>{t("assets.rent_total")}</span>
          <b style={{ fontSize: 22, color: T.t1, lineHeight: 1 }}>{data ? rupee(N(data.total)) : "—"}</b>
          {data && data.from && <span style={{ fontSize: 11.5, color: T.t3 }}>{t("assets.rent_period", { from: fmtD(data.from), to: fmtD(data.to) })}</span>}
        </div>
      </Panel>
      <Notice>{t("assets.rent_note")}</Notice>

      {data == null && <Spinner />}
      {data && holders.length === 0 && <Panel><Empty>{t("assets.rent_empty")}</Empty></Panel>}
      {holders.map((g) => (
        <Panel key={`${g.holder_type}:${g.holder_id}`} style={{ marginBottom: 12 }}
          title={<span>{g.holder_name || "—"} <span style={{ fontSize: 10.5, color: T.t3, fontWeight: 600 }}>· {holderLabel(g.holder_type)}</span></span>}
          action={<b style={{ fontSize: 13.5, color: T.t1 }}>{rupee(N(g.amount))}</b>}>
          <Scroll minWidth={980}>
            <Row head cols={cols}>
              <span>{t("assets.item")}</span><span>{t("assets.spec")}</span><span>{t("assets.qty")}</span><span>{t("assets.rate")}</span>
              <span>{t("assets.rent_days")}</span><span>{t("assets.amount")}</span><span>{t("assets.project")}</span><span>{t("assets.custodian")}</span><span>{t("assets.since")}</span>
            </Row>
            {(g.lines || []).map((l, i) => (
              <Row key={`${l.asset_item_id}-${i}`} cols={cols}>
                <div>
                  <div style={{ fontWeight: 600, color: T.t1 }}>{l.name}</div>
                  {l.code && <div style={{ fontSize: 10.5, color: T.t4, fontFamily: "monospace" }}>{l.code}</div>}
                </div>
                <span style={{ color: T.t3 }}>{l.spec || "—"}</span>
                <span>{fmtN(l.qty)} <span style={{ fontSize: 10.5, color: T.t4 }}>{l.unit || ""}</span></span>
                <span style={{ fontSize: 11.5 }}>{rupee(l.rate)}/{t(l.rent_basis === "month" ? "assets.basis_month" : "assets.basis_day")}</span>
                <span>{fmtN(l.days)}</span>
                <span style={{ fontWeight: 700, color: T.t1 }}>{rupee(l.amount)}</span>
                <span style={{ fontSize: 11.5, color: T.t3 }}>{l.project_name || "—"}</span>
                <span style={{ fontSize: 11.5, color: T.t3 }}>{l.custodian_name || "—"}</span>
                <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(l.since_date)}</span>
              </Row>
            ))}
          </Scroll>
        </Panel>
      ))}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// CUSTODY — kahan kya, kiske paas
// ══════════════════════════════════════════════════════════════════
function CustodyTab({ refreshKey, meta, pickers, onOpenItem }) {
  const [view, setView] = useState("project");
  const [pick, setPick] = useState("");
  const [holderType, setHolderType] = useState("");
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    api.get("/assets/holdings").then((r) => { if (alive) setRows(r && r.success ? r.data || [] : []); }).catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [refreshKey]);

  const keyOf = (h) => view === "project" ? (h.project_id ? `${h.project_id}` : "")
    : view === "custodian" ? (h.custodian_user_id ? `${h.custodian_user_id}` : "")
    : view === "holder" ? (["worker", "subcon"].includes(h.holder_type) ? `${h.holder_type}:${h.holder_id}` : "")
    : (h.warehouse_id ? `${h.warehouse_id}` : "");
  const nameOf = (h) => view === "project" ? h.project_name : view === "custodian" ? h.custodian_name
    : view === "holder" ? `${h.holder_name || "—"} · ${holderLabel(h.holder_type)}` : h.warehouse_name;

  const groups = useMemo(() => {
    const m = new Map();
    for (const h of rows || []) {
      const k = keyOf(h);
      if (!k) continue;
      if (view === "holder" && holderType && h.holder_type !== holderType) continue;
      if (pick && k !== pick) continue;
      if (!m.has(k)) m.set(k, { key: k, name: nameOf(h) || "—", rows: [], qty: 0, damaged: 0 });
      const gg = m.get(k);
      gg.rows.push(h); gg.qty += N(h.qty_good) + N(h.qty_damaged); gg.damaged += N(h.qty_damaged);
    }
    return [...m.values()].sort((a, b) => b.qty - a.qty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, view, pick, holderType]);

  const pickOptions = view === "project" ? (pickers.projects || []).map((p) => ({ id: p.id, name: p.name }))
    : view === "custodian" ? (pickers.users || []).map((u) => ({ id: u.id, name: u.name }))
    : view === "holder" ? [...(holderType !== "subcon" ? (pickers.workers || []).map((w) => ({ id: `worker:${w.id}`, name: `${w.name} · ${t("assets.holder_worker")}` })) : []),
                          ...(holderType !== "worker" ? (pickers.subcons || []).map((s) => ({ id: `subcon:${s.id}`, name: `${s.name} · ${t("assets.holder_subcon")}` })) : [])]
    : ((meta && meta.warehouses) || []).map((w) => ({ id: w.id, name: w.name }));

  const cols = "1.5fr 90px 1fr 1.1fr 1fr 1fr 60px 70px 80px 90px";
  return (
    <Panel title={t("assets.custody_title")}>
      <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap", alignItems: "center" }}>
        <Seg value={view} onChange={(v) => { setView(v); setPick(""); setHolderType(""); }}
          options={[{ k: "project", l: t("assets.view_project") }, { k: "custodian", l: t("assets.view_custodian") }, { k: "holder", l: t("assets.view_holder") }, { k: "warehouse", l: t("assets.view_warehouse") }]} />
        {view === "holder" && (
          <select value={holderType} onChange={(e) => { setHolderType(e.target.value); setPick(""); }} style={{ ...inp, width: 120 }}>
            <option value="">{t("assets.all")}</option>
            <option value="worker">{t("assets.holder_worker")}</option>
            <option value="subcon">{t("assets.holder_subcon")}</option>
          </select>
        )}
        <div style={{ width: 240 }}>
          <SearchSelect value={pick} onChange={(k) => setPick(k)} accent={T.ind} options={[{ id: "", name: t("assets.all") }, ...pickOptions]} placeholder={t("assets.all")} />
        </div>
      </div>
      {rows == null && <Spinner />}
      {rows && groups.length === 0 && <Empty>{t("assets.custody_empty")}</Empty>}
      {rows && groups.length > 0 && (
        <Scroll minWidth={1040}>
          <Row head cols={cols}><span>{t("assets.item")}</span><span>{t("assets.code")}</span><span>{t("assets.spec")}</span><span>{t("assets.where")}</span><span>{t("assets.holder")}</span><span>{t("assets.custodian")}</span><span>{t("assets.good")}</span><span>{t("assets.damaged")}</span><span>{t("assets.since")}</span><span>{t("assets.rent")}</span></Row>
          {groups.map((gg) => (
            <div key={gg.key}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, fontSize: 12, fontWeight: 700, color: T.t1 }}>
                <span>{gg.name}</span>
                <span style={{ color: T.t3, fontWeight: 600 }}>{t("assets.group_sum", { items: gg.rows.length, qty: fmtN(gg.qty) })}{gg.damaged ? ` · ${t("assets.damaged")} ${fmtN(gg.damaged)}` : ""}</span>
              </div>
              {gg.rows.map((h) => (
                <Row key={h.id} cols={cols} onClick={() => onOpenItem({ id: h.asset_item_id, code: h.code, name: h.name, spec: h.spec, unit: h.unit, tracking_mode: h.tracking_mode, status: h.status, category_id: h.category_id, category: h.category })}>
                  <span style={{ fontWeight: 600, color: T.t1 }}>{h.name}</span>
                  <span style={{ fontSize: 11.5, color: T.t3, fontFamily: "monospace" }}>{h.code || "—"}</span>
                  <span style={{ color: T.t3 }}>{h.spec || "—"}</span>
                  <span>{holdingWhere(h)}</span>
                  <span style={{ fontSize: 11.5 }}>{h.warehouse_id ? t("assets.holder_store") : `${h.holder_name || "—"} · ${holderLabel(h.holder_type)}`}</span>
                  <span style={{ fontSize: 11.5 }}>{h.custodian_name || "—"}</span>
                  <span style={{ fontWeight: 600 }}>{fmtN(h.qty_good)}</span>
                  <span style={{ color: N(h.qty_damaged) ? T.amb : T.t4 }}>{fmtN(h.qty_damaged)}</span>
                  <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(h.since_date)}</span>
                  <span style={{ fontSize: 11.5, color: h.charge_mode === "rent" ? T.ind : T.t4 }}>{h.warehouse_id ? "—" : rentText(h)}</span>
                </Row>
              ))}
            </div>
          ))}
        </Scroll>
      )}
    </Panel>
  );
}

// ══════════════════════════════════════════════════════════════════
// MODULE
// ══════════════════════════════════════════════════════════════════
function AssetsModule({ deepLink, onDeepLinkDone }) {
  const me = useMemo(() => getUser() || {}, []);
  const isAdmin = ["admin", "super_admin"].includes(String(me.role || "").toLowerCase());
  // Permission row na ho (Settings me abhi tak Assets ki row nahi bani) to
  // khula — backend bhi yahi karta hai (requirePerm fail-open).
  const permRow = (me.module_permissions || {}).Assets;
  const can = (k) => isAdmin || permRow === undefined || !!(permRow && permRow[k]);
  const canCreate = can("create"), canEdit = can("edit"), canApprove = can("approve");

  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [pickers, setPickers] = useState({});
  const [dash, setDash] = useState(null);
  const [items, setItems] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [voucherId, setVoucherId] = useState(null);
  const [openItem, setOpenItem] = useState(null);
  const [grnOpen, setGrnOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [moveKind, setMoveKind] = useState(null);      // transfer | return
  const [repairKind, setRepairKind] = useState(null);  // out | in
  const [verifyId, setVerifyId] = useState(null);
  const [newVerify, setNewVerify] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [inchOpen, setInchOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    const [m, p, d, it] = await Promise.all([
      api.get("/assets/meta").catch(() => null),
      api.get("/assets/pickers").catch(() => null),
      api.get("/assets/dashboard").catch(() => null),
      api.get("/assets/items").catch(() => null),
    ]);
    setMeta(m && m.success ? m.data : { categories: [], warehouses: [], incharges: [], my_warehouse_ids: [] });
    setPickers(p && p.success ? p.data || {} : {});
    setDash(d && d.success ? d.data : null);
    setItems(it && it.success ? it.data || [] : []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const refresh = useCallback(() => { load(true); setRefreshKey((k) => k + 1); }, [load]);

  // Notification ka link (/assets?id=<voucher>) — App.js se deepLink aata hai;
  // seedha URL se khula ho to query bhi dekh lo.
  useEffect(() => {
    if (!deepLink) return;
    setVoucherId(Number(deepLink)); setTab("movements");
    if (onDeepLinkDone) onDeepLinkDone();
  }, [deepLink, onDeepLinkDone]);
  useEffect(() => {
    try {
      if (!/^\/assets/.test(window.location.pathname)) return;
      const id = new URLSearchParams(window.location.search).get("id");
      if (id && /^\d+$/.test(id)) { setVoucherId(Number(id)); setTab("movements"); }
    } catch (_) { /* URL na padh paaye to kuch nahi */ }
  }, []);

  // Custody row se khula item register list se poora hota hai (GET /items/:id nahi hai).
  const itemFull = useMemo(() => {
    if (!openItem) return null;
    return items.find((i) => i.id === openItem.id) || openItem;
  }, [openItem, items]);

  // Ginti list se "sudhaar voucher" par click — voucher Movements ka hai,
  // isliye tab bhi wahi khul jaata hai, warna aadmi Ginti par khada rehta
  // hai aur drawer band karte hi wo voucher dobara nahi milta.
  const openVoucherInMovements = useCallback((id) => { setTab("movements"); setVoucherId(id); }, []);

  const cats = (meta && meta.categories) || [];
  const pendingCount = dash && dash.tiles ? N(dash.tiles.awaiting_accept) : 0;
  const openVerifCount = dash && dash.tiles ? N(dash.tiles.open_verifications) : 0;
  const TABS = [
    { id: "dashboard", l: t("assets.tab_dashboard"), I: IcChart },
    { id: "register", l: t("assets.tab_register"), I: IcList },
    { id: "grn", l: t("assets.tab_grn"), I: IcIn },
    { id: "movements", l: t("assets.tab_movements"), I: IcTrns, badge: pendingCount || null },
    { id: "verify", l: t("assets.tab_verify"), I: IcCount, badge: openVerifCount || null },
    { id: "custody", l: t("assets.tab_custody"), I: IcUser },
    { id: "rent", l: t("assets.tab_rent"), I: IcRupee },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 14 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #E2E8F0", borderTopColor: T.ind, borderRadius: "50%", animation: "assets-spin 0.7s linear infinite" }} />
      <div style={{ fontSize: 13, color: "#8896A6" }}>{t("assets.loading")}</div>
      <style>{`@keyframes assets-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background: T.bg, height: "100%", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px 20px" }}>
        <div style={{ display: "flex", gap: 2, borderBottom: `1.5px solid ${T.b1}`, marginBottom: 16, overflowX: "auto" }}>
          {TABS.map((x) => (
            <button key={x.id} type="button" onClick={() => setTab(x.id)}
              style={{ padding: "9px 15px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "none", background: "none", fontFamily: "inherit", marginBottom: "-1.5px", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", color: tab === x.id ? T.ind : T.t3, borderBottom: `2px solid ${tab === x.id ? T.ind : "transparent"}` }}>
              <x.I size={13} color="currentColor" />{x.l}
              {x.badge > 0 && <span style={{ fontSize: 10, background: T.ambL, color: T.amb, borderRadius: 8, padding: "1px 6px", fontWeight: 700 }}>{x.badge}</span>}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={refresh} title={t("assets.refresh")}
            style={{ border: "none", background: "none", cursor: "pointer", color: T.t3, fontFamily: "inherit", fontSize: 11.5, padding: "9px 6px", display: "flex", alignItems: "center", gap: 5 }}>
            <IcRefresh size={12} color="currentColor" />{t("assets.refresh")}
          </button>
        </div>

        {tab === "dashboard" && <DashboardTab dash={dash} onOpenVoucher={setVoucherId} onGo={setTab} />}
        {tab === "register" && (
          <RegisterTab items={items} cats={cats} canEdit={canEdit} canCreate={canCreate} onOpenItem={setOpenItem}
            onCats={() => setCatsOpen(true)} onIncharge={() => setInchOpen(true)} onImport={() => setImportOpen(true)} />
        )}
        {tab === "grn" && <GrnTab refreshKey={refreshKey} canCreate={canCreate} onNew={() => setGrnOpen(true)} onOpenVoucher={setVoucherId} />}
        {tab === "movements" && (
          <MovementsTab refreshKey={refreshKey} meta={meta} pickers={pickers} canCreate={canCreate}
            onIssue={() => setIssueOpen(true)} onTransfer={() => setMoveKind("transfer")} onReturn={() => setMoveKind("return")}
            onRepairOut={() => setRepairKind("out")} onRepairIn={() => setRepairKind("in")} onOpenVoucher={setVoucherId} />
        )}
        {tab === "verify" && (
          <VerificationsTab refreshKey={refreshKey} meta={meta} pickers={pickers} canCreate={canCreate}
            onNew={() => setNewVerify(true)} onOpen={setVerifyId} onOpenVoucher={openVoucherInMovements} />
        )}
        {tab === "custody" && <CustodyTab refreshKey={refreshKey} meta={meta} pickers={pickers} onOpenItem={setOpenItem} />}
        {tab === "rent" && <RentTab refreshKey={refreshKey} />}
      </div>

      {voucherId && <VoucherDrawer id={voucherId} onClose={() => setVoucherId(null)} onChanged={refresh} />}
      {verifyId && (
        <VerificationDrawer id={verifyId} me={me} isAdmin={isAdmin} canApprove={canApprove}
          onClose={() => setVerifyId(null)} onChanged={refresh}
          onOpenVoucher={(vid) => { setVerifyId(null); openVoucherInMovements(vid); }} />
      )}
      {itemFull && <ItemDrawer item={itemFull} cats={cats} canEdit={canEdit} onClose={() => setOpenItem(null)} onChanged={refresh} onOpenVoucher={setVoucherId} />}

      <GrnForm open={grnOpen} meta={meta} pickers={pickers} cats={cats} onClose={() => setGrnOpen(false)} onSaved={refresh} />
      <IssueForm open={issueOpen} meta={meta} pickers={pickers} me={me} canAll={isAdmin || canApprove} onClose={() => setIssueOpen(false)} onSaved={refresh} />
      <MoveForm open={!!moveKind} kind={moveKind || "transfer"} meta={meta} pickers={pickers} me={me} canAll={isAdmin || canApprove} onClose={() => setMoveKind(null)} onSaved={refresh} />
      <RepairForm open={!!repairKind} kind={repairKind || "out"} meta={meta} pickers={pickers} me={me} canAll={isAdmin || canApprove} onClose={() => setRepairKind(null)} onSaved={refresh} />
      <NewVerificationModal open={newVerify} meta={meta} pickers={pickers} me={me}
        onClose={() => setNewVerify(false)} onCreated={(d) => { refresh(); if (d && d.id) setVerifyId(d.id); }} onOpenExisting={setVerifyId} />
      <CategoriesModal open={catsOpen} cats={cats} onClose={() => setCatsOpen(false)} onChanged={() => load(true)} />
      <InchargesModal open={inchOpen} meta={meta} users={pickers.users || []} onClose={() => setInchOpen(false)} onChanged={() => load(true)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={refresh} />
    </div>
  );
}

export default AssetsModule;
