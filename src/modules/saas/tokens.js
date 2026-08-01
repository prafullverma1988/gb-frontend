// Design tokens, icons and formatters for the SaaS Admin module.
//
// Module-owned on purpose: per the module-independence rule each module
// carries its own primitives rather than sharing a global UI kit, so a change
// here can never ripple into another module.
import { API_BASE } from "../../config/api";

// Single source of truth — hardcoding the raw *.up.railway.app host here meant
// this module stayed broken on ISPs that refuse that zone (see config/api.js).
const API = API_BASE;
const tok = () => localStorage.getItem("gb_token");
const apiFetch = (path, opts = {}) =>
  fetch(API + path, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok(), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }).then(r => r.json());

// ── ICONS ──────────────────────────────────────────────────────────────
const Ic = ({ d, size = 18, color = "currentColor", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const IcBuilding  = p => <Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6" />;
const IcUsers     = p => <Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />;
const IcPuzzle    = p => <Ic {...p} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />;
const IcTrend     = p => <Ic {...p} d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" />;
const IcPlus      = p => <Ic {...p} d="M12 5v14M5 12h14" />;
const IcX         = p => <Ic {...p} d="M18 6L6 18M6 6l12 12" />;
const IcChk       = p => <Ic {...p} d="M20 6L9 17l-5-5" />;
const IcEye       = p => <Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z" />;
const IcEyeX      = p => <Ic {...p} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />;
const IcRefresh   = p => <Ic {...p} d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />;
const IcLock      = p => <Ic {...p} d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4" />;
const IcClip      = p => <Ic {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />;
const IcDownload  = p => <Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const IcShield    = p => <Ic {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IcSearch    = p => <Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />;
const IcActivity  = p => <Ic {...p} d="M22 12h-4l-3 9L9 3l-3 9H2" />;
const IcDollar    = p => <Ic {...p} d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />;
const IcFolder    = p => <Ic {...p} d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />;
const IcEdit      = p => <Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />;
const IcCog       = p => <Ic {...p} d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />;
const IcChevD     = p => <Ic {...p} d="M6 9l6 6 6-6" />;
const IcChevR     = p => <Ic {...p} d="M9 18l6-6-6-6" />;
const IcChevL     = p => <Ic {...p} d="M15 18l-6-6 6-6" />;
const IcFilter    = p => <Ic {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />;
const IcLogin     = p => <Ic {...p} d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />;

// ── THEME ──────────────────────────────────────────────────────────────
const T = {
  bg:"#F4F6F9", surface:"#FFFFFF", surfaceB:"#F8F9FB",
  t1:"#111827", t2:"#374151", t3:"#6B7280", t4:"#9CA3AF",
  b1:"#E5E7EB", b2:"#D1D5DB",
  blu:"#2563EB", bluL:"#EFF6FF", bluM:"#BFDBFE",
  grn:"#059669", grnL:"#ECFDF5", grnM:"#A7F3D0",
  amb:"#D97706", ambL:"#FFFBEB", ambM:"#FDE68A",
  red:"#DC2626", redL:"#FEF2F2", redM:"#FECACA",
  pur:"#7C3AED", purL:"#F5F3FF", purM:"#DDD6FE",
  slt:"#64748B", sltL:"#F1F5F9",
  cyn:"#0891B2", cynL:"#ECFEFF", cynM:"#A5F3FC",
};

const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "--";
const fmtDateTime = d => d ? new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "--";
const fmtNum = n => (n||0).toLocaleString("en-IN");
const fmtMoney = n => { const v = parseFloat(n)||0; return v >= 10000000 ? (v/10000000).toFixed(2)+" Cr" : v >= 100000 ? (v/100000).toFixed(2)+" L" : v >= 1000 ? (v/1000).toFixed(1)+"K" : v.toFixed(0); };

const DOMAIN_LABELS = {
  construction_individual: "Construction (Individual)",
  construction_company:    "Construction (Company)",
  surya_ghar:              "Surya Ghar (Solar)",
  surya_ghar_plus:         "Surya Ghar Plus",
  interior_design:         "Interior Design",
  real_estate:             "Real Estate",
  government_contractor:   "Government Contractor",
};

// ── Billing helpers (used by Customers + the company page) ─────────────
const fmtAmt = n => "₹" + (parseFloat(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const limitStr = (used, max) => `${fmtNum(used)} / ${max > 0 ? fmtNum(max) : "∞"}`;
const limitColor = (used, max) => (max > 0 && used >= max) ? T.red : (max > 0 && used >= max * 0.8) ? T.amb : T.t2;
const SUB_COLORS = { pending: T.amb, active: T.grn, suspended: T.red, expired: T.slt, cancelled: T.t4 };
const INV_COLORS = { scheduled: T.slt, issued: T.blu, paid: T.grn, cancelled: T.t4 };
const CYCLE_LABELS = { monthly: "Monthly", quarterly: "Quarterly", half_yearly: "Half-Yearly", yearly: "Yearly" };

// Plain-table cell styles — used by the Sanchalan tab and the invoice ledger.
const th = { padding:"10px 14px", textAlign:"left", fontSize:10.5, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px" };
const td = { padding:"11px 14px", color:T.t2 };

export {
  th, td,
  API, tok, apiFetch, T,
  fmtDate, fmtDateTime, fmtNum, fmtMoney, fmtAmt,
  DOMAIN_LABELS, limitStr, limitColor, SUB_COLORS, INV_COLORS, CYCLE_LABELS,
  Ic, IcBuilding, IcUsers, IcPuzzle, IcTrend, IcPlus, IcX, IcChk, IcEye, IcEyeX,
  IcRefresh, IcLock, IcClip, IcDownload, IcShield, IcSearch, IcActivity, IcDollar,
  IcFolder, IcEdit, IcCog, IcChevD, IcChevR, IcChevL, IcFilter, IcLogin,
};
