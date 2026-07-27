import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../config/api";
import { BundleView, TicketBadge, fmtTicketTime } from "./shared/TicketBundle";

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
};

// ── SHARED COMPONENTS ──────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position:"fixed", top:20, right:24, zIndex:9999, padding:"11px 18px", borderRadius:9,
      background: type==="error" ? T.redL : T.grnL,
      border: `1px solid ${type==="error" ? T.redM : T.grnM}`,
      color: type==="error" ? T.red : T.grn,
      fontSize:13, fontWeight:600, boxShadow:"0 4px 20px rgba(0,0,0,0.15)", display:"flex", alignItems:"center", gap:10 }}>
      {type==="error" ? <IcX size={14}/> : <IcChk size={14}/>}
      {msg}
      <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", display:"flex", marginLeft:6 }}><IcX size={12}/></button>
    </div>
  );
}

function Toggle({ value, onChange, disabled }) {
  return (
    <div onClick={() => !disabled && onChange(!value)}
      style={{ width:44, height:24, borderRadius:24, background: disabled ? T.grn : (value ? T.grn : T.b2),
        cursor: disabled ? "not-allowed" : "pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
      <div style={{ width:18, height:18, borderRadius:"50%", background:"white", position:"absolute",
        top:3, left: (disabled || value) ? 23 : 3, transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
    </div>
  );
}

function StatCard({ label, value, sub, color, Icon }) {
  return (
    <div style={{ padding:"16px 18px", background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, borderTop:`3px solid ${color}` }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ width:36, height:36, borderRadius:9, background:color+"18", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon size={17} color={color}/>
        </div>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color:T.t1, letterSpacing:"-0.5px", lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:11, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2 }}>{label}</div>
      {sub && <div style={{ fontSize:10.5, color:T.t4 }}>{sub}</div>}
    </div>
  );
}

function Badge({ text, color }) {
  return (
    <span style={{ fontSize:9.5, fontWeight:700, padding:"2px 9px", borderRadius:20, background:color+"18", color, border:`1px solid ${color}30`, whiteSpace:"nowrap" }}>
      {text}
    </span>
  );
}

function Btn({ children, onClick, color = T.blu, variant = "primary", disabled, style: sx, ...rest }) {
  const bg = variant === "primary" ? color : "transparent";
  const fg = variant === "primary" ? "#fff" : color;
  const bdr = variant === "primary" ? "none" : `1px solid ${T.b1}`;
  return (
    <button onClick={onClick} disabled={disabled} {...rest}
      style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 14px", borderRadius:8, background: disabled ? T.t4 : bg,
        color: disabled ? "#fff" : fg, fontSize:12.5, fontWeight:600, border:bdr, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily:"inherit", transition:"all 0.15s", ...sx }}>
      {children}
    </button>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", required, endIcon, style: sx }) {
  return (
    <div style={sx}>
      {label && <label style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>{label}{required && " *"}</label>}
      <div style={{ position:"relative" }}>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width:"100%", padding:"9px 12px", paddingRight: endIcon ? 36 : 12, borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surfaceB, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
          onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
        {endIcon && <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", display:"flex" }}>{endIcon}</div>}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      {label && <label style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surfaceB, outline:"none", boxSizing:"border-box", fontFamily:"inherit", cursor:"pointer" }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function EmptyState({ Icon, text }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 0", color:T.t3, fontSize:13 }}>
      <Icon size={40} color={T.b2}/><div style={{ marginTop:12 }}>{text}</div>
    </div>
  );
}

function TableHeader({ columns, gridCols }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:gridCols, padding:"9px 16px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}` }}>
      {columns.map((h,i) => (
        <div key={i} style={{ fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</div>
      ))}
    </div>
  );
}

function PageHeader({ title, sub, right }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
      <div>
        <div style={{ fontSize:16, fontWeight:700, color:T.t1 }}>{title}</div>
        {sub && <div style={{ fontSize:12, color:T.t3, marginTop:2 }}>{sub}</div>}
      </div>
      {right && <div style={{ display:"flex", gap:8, alignItems:"center" }}>{right}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TAB 1: DASHBOARD / STATS
// ════════════════════════════════════════════════════════════════════════
function TabStats() {
  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/saas-admin/stats"),
      apiFetch("/saas-admin/metrics"),
    ]).then(([r1, r2]) => {
      setData(r1.success ? r1.data : null);
      setMetrics(r2.success ? r2.data : null);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    return diff;
  };
  const daysSince = (dateStr) => {
    if (!dateStr) return "Never";
    const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
    return diff === 0 ? "Today" : `${diff}d ago`;
  };

  if (loading) return <div style={{ textAlign:"center", padding:60, color:T.t3, fontSize:13 }}>Loading platform data...</div>;
  if (!data) return (
    <div style={{ textAlign:"center", padding:60 }}>
      <div style={{ color:T.red, fontSize:14, fontWeight:600, marginBottom:8 }}>Failed to load stats</div>
      <Btn onClick={load} variant="outline" style={{ margin:"0 auto" }}><IcRefresh size={13}/> Retry</Btn>
    </div>
  );

  const actionIcon = a => {
    const map = { LOGIN: IcLogin, CREATE: IcPlus, UPDATE: IcCog, DELETE: IcX, EXPORT: IcDownload, DEACTIVATE: IcX, REACTIVATE: IcChk };
    const C = map[a] || IcActivity;
    return <C size={13}/>;
  };
  const actionColor = a => ({ LOGIN:T.blu, CREATE:T.grn, UPDATE:T.amb, DELETE:T.red, EXPORT:T.pur, DEACTIVATE:T.red, REACTIVATE:T.grn }[a] || T.slt);

  const kpi = metrics?.kpi || {};

  return (
    <div style={{ padding:"20px 24px" }}>
      <PageHeader title="Platform Overview" sub="Customer intelligence & retention dashboard" right={
        <Btn onClick={load} variant="outline"><IcRefresh size={13}/> Refresh</Btn>
      }/>

      {/* Revenue KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:12 }}>
        <StatCard label="MRR"             value={"₹" + fmtMoney(kpi.mrr || 0)}       sub={`ARR: ₹${fmtMoney(kpi.arr || 0)}`} color={T.grn} Icon={IcDollar}/>
        <StatCard label="Paid Active"     value={fmtNum(kpi.paid_active || 0)}       sub="Paying customers"                  color={T.blu} Icon={IcChk}/>
        <StatCard label="Free Trial"      value={fmtNum(kpi.trial || 0)}             sub={`${kpi.trial_ending_count||0} ending in 3 days`} color={T.amb} Icon={IcClip}/>
        <StatCard label="Inactive"        value={fmtNum(kpi.inactive || 0)}          sub="No active subscription"            color={T.slt} Icon={IcX}/>
      </div>

      {/* Retention KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
        <StatCard label="Total Companies" value={fmtNum(kpi.total || data.companies.total)} sub={`${data.new_today} new today`}         color={T.pur} Icon={IcBuilding}/>
        <StatCard label="Total Users"     value={fmtNum(data.users.total)}           sub={`${data.users.active||0} active`}                color={T.cyn} Icon={IcUsers}/>
        <StatCard label="Expiring Soon"   value={fmtNum(kpi.expiring_count || 0)}    sub="Next 7 days"                                     color={T.amb} Icon={IcActivity}/>
        <StatCard label="Churn Risk"      value={fmtNum(kpi.churn_risk_count || 0)}  sub="No login 15+ days"                               color={T.red} Icon={IcShield}/>
      </div>

      {/* Retention alerts row */}
      {metrics && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
          {/* Trial ending soon */}
          <div style={{ background:T.surface, border:`1px solid ${T.ambM}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", background:T.ambL, borderBottom:`1px solid ${T.ambM}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, fontWeight:700, color:T.amb }}>⏳ Trial Ending Soon</span>
              <span style={{ fontSize:10, color:T.amb, fontWeight:600 }}>{(metrics.trial_ending_soon||[]).length} companies</span>
            </div>
            <div style={{ maxHeight:200, overflowY:"auto" }}>
              {(metrics.trial_ending_soon||[]).length === 0 && <div style={{ padding:20, textAlign:"center", color:T.t4, fontSize:11 }}>No trials ending soon</div>}
              {(metrics.trial_ending_soon||[]).map((c, i) => {
                const d = daysUntil(c.end_date);
                return (
                  <div key={i} style={{ padding:"9px 14px", borderBottom:`1px solid ${T.b1}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                      <div style={{ fontSize:10, color:T.t4 }}>{c.email || c.phone || "--"}</div>
                    </div>
                    <Badge text={d <= 0 ? "Today" : `${d}d`} color={d <= 1 ? T.red : T.amb}/>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expiring subscriptions */}
          <div style={{ background:T.surface, border:`1px solid ${T.bluM}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", background:T.bluL, borderBottom:`1px solid ${T.bluM}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, fontWeight:700, color:T.blu }}>📅 Expiring Soon (7d)</span>
              <span style={{ fontSize:10, color:T.blu, fontWeight:600 }}>{(metrics.expiring_soon||[]).length} subs</span>
            </div>
            <div style={{ maxHeight:200, overflowY:"auto" }}>
              {(metrics.expiring_soon||[]).length === 0 && <div style={{ padding:20, textAlign:"center", color:T.t4, fontSize:11 }}>None expiring</div>}
              {(metrics.expiring_soon||[]).map((c, i) => {
                const d = daysUntil(c.end_date);
                return (
                  <div key={i} style={{ padding:"9px 14px", borderBottom:`1px solid ${T.b1}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                      <div style={{ fontSize:10, color:T.t4 }}>{c.plan_name || c.status} · ₹{fmtMoney(c.mrr_amount||0)}/mo</div>
                    </div>
                    <Badge text={d <= 0 ? "Today" : `${d}d`} color={d <= 2 ? T.red : T.blu}/>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Churn risk */}
          <div style={{ background:T.surface, border:`1px solid ${T.redM}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", background:T.redL, borderBottom:`1px solid ${T.redM}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, fontWeight:700, color:T.red }}>⚠️ Churn Risk</span>
              <span style={{ fontSize:10, color:T.red, fontWeight:600 }}>{(metrics.churn_risk||[]).length} at risk</span>
            </div>
            <div style={{ maxHeight:200, overflowY:"auto" }}>
              {(metrics.churn_risk||[]).length === 0 && <div style={{ padding:20, textAlign:"center", color:T.t4, fontSize:11 }}>All customers active ✓</div>}
              {(metrics.churn_risk||[]).map((c, i) => (
                <div key={i} style={{ padding:"9px 14px", borderBottom:`1px solid ${T.b1}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                    <div style={{ fontSize:10, color:T.t4 }}>{c.plan_name || "No plan"}</div>
                  </div>
                  <span style={{ fontSize:10, color:T.red, fontWeight:600 }}>{daysSince(c.last_login)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MRR trend + Top customers */}
      {metrics && (
        <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:16, marginBottom:20 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>MRR Trend (6 months)</span>
            </div>
            <div style={{ padding:"16px" }}>
              {(metrics.mrr_trend||[]).length === 0 ? (
                <div style={{ fontSize:12, color:T.t4, textAlign:"center", padding:"30px 0" }}>No subscription revenue data yet</div>
              ) : (
                <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:140 }}>
                  {metrics.mrr_trend.map((g, i) => {
                    const max = Math.max(...metrics.mrr_trend.map(x => parseFloat(x.mrr)||0), 1);
                    const v = parseFloat(g.mrr) || 0;
                    const h = (v / max) * 100;
                    return (
                      <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:T.grn }}>₹{fmtMoney(v)}</div>
                        <div style={{ width:"100%", height:`${Math.max(h, 6)}%`, background:`linear-gradient(180deg, ${T.grn}, ${T.grnM})`, borderRadius:4 }}/>
                        <div style={{ fontSize:9, color:T.t4, whiteSpace:"nowrap" }}>{g.month.split("-")[1]}/{g.month.split("-")[0].slice(2)}</div>
                        <div style={{ fontSize:9, color:T.t4 }}>+{g.new_subs}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Top Customers by Revenue</span>
            </div>
            <div style={{ maxHeight:220, overflowY:"auto" }}>
              {(metrics.top_customers||[]).length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No paid customers yet</div>}
              {(metrics.top_customers||[]).map((c, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 16px", borderBottom:`1px solid ${T.b1}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:9, minWidth:0 }}>
                    <div style={{ width:24, height:24, borderRadius:6, background:T.grnL, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:T.grn, flexShrink:0 }}>#{i+1}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                      <div style={{ fontSize:10, color:T.t4 }}>{c.plan_name || "No plan"} · {c.user_count} users</div>
                    </div>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:T.grn }}>₹{fmtMoney(c.total_paid)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        {/* Company breakdown */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Company Overview</span>
            <span style={{ fontSize:11, color:T.t4 }}>{data.company_stats?.length || 0} total</span>
          </div>
          <div style={{ maxHeight:280, overflowY:"auto" }}>
            {(data.company_stats||[]).map((c, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1.5fr 60px 60px 90px", padding:"9px 16px", borderBottom:`1px solid ${T.b1}`, alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                  <div style={{ width:30, height:30, borderRadius:7, background: c.is_active ? T.bluL : T.redL, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:12, fontWeight:700, color: c.is_active ? T.blu : T.red }}>{c.name[0]}</span>
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:150 }}>{c.name}</div>
                    <Badge text={c.is_active ? "Active" : "Inactive"} color={c.is_active ? T.grn : T.red}/>
                  </div>
                </div>
                <div style={{ fontSize:12, color:T.t2, textAlign:"center" }}>{c.users} <span style={{fontSize:9,color:T.t4}}>users</span></div>
                <div style={{ fontSize:12, color:T.t2, textAlign:"center" }}>{c.projects} <span style={{fontSize:9,color:T.t4}}>proj</span></div>
                <div style={{ fontSize:12, fontWeight:600, color:T.grn, textAlign:"right" }}>{fmtMoney(c.revenue)}</div>
              </div>
            ))}
            {(!data.company_stats || data.company_stats.length === 0) && (
              <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No companies yet</div>
            )}
          </div>
        </div>

        {/* Recent audit activity */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Recent Activity</span>
            <IcActivity size={14} color={T.t4}/>
          </div>
          <div style={{ maxHeight:280, overflowY:"auto" }}>
            {(data.recent_audit||[]).length === 0 && (
              <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No activity yet. Audit logging is active!</div>
            )}
            {(data.recent_audit||[]).map((a, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 16px", borderBottom:`1px solid ${T.b1}` }}>
                <div style={{ width:28, height:28, borderRadius:7, background:actionColor(a.action)+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1, color:actionColor(a.action) }}>
                  {actionIcon(a.action)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, color:T.t1 }}>
                    <strong>{a.user_name || "System"}</strong>{" "}
                    <span style={{ color:actionColor(a.action), fontWeight:600, fontSize:11 }}>{a.action}</span>{" "}
                    <span style={{ color:T.t3 }}>{a.entity_type}</span>
                    {a.entity_id && <span style={{ color:T.t4 }}> #{a.entity_id}</span>}
                  </div>
                  <div style={{ fontSize:10, color:T.t4, marginTop:1 }}>
                    {a.company_name || "Platform"} · {fmtDateTime(a.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module usage + growth */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Module usage */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Module Adoption</span>
          </div>
          <div style={{ padding:"12px 16px" }}>
            {(data.module_usage||[]).length === 0 && <div style={{ fontSize:12, color:T.t4, textAlign:"center", padding:"20px 0" }}>No modules assigned yet</div>}
            {(data.module_usage||[]).map((m, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:90, fontSize:12, color:T.t2, fontWeight:500, textTransform:"capitalize" }}>{m.module_key}</div>
                <div style={{ flex:1, height:6, background:T.b1, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min((m.company_count / Math.max(data.companies.total,1))*100, 100)}%`, background:T.blu, borderRadius:3 }}/>
                </div>
                <div style={{ width:24, fontSize:11, fontWeight:700, color:T.t1, textAlign:"right" }}>{m.company_count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Company growth */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Company Growth (6 months)</span>
          </div>
          <div style={{ padding:"16px" }}>
            {(data.growth||[]).length === 0 ? (
              <div style={{ fontSize:12, color:T.t4, textAlign:"center", padding:"20px 0" }}>Not enough data yet</div>
            ) : (
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120 }}>
                {data.growth.map((g, i) => {
                  const max = Math.max(...data.growth.map(x => x.count), 1);
                  const h = (g.count / max) * 100;
                  return (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.blu }}>{g.count}</div>
                      <div style={{ width:"100%", height:`${Math.max(h, 8)}%`, background:`linear-gradient(180deg, ${T.blu}, ${T.bluM})`, borderRadius:4 }}/>
                      <div style={{ fontSize:9, color:T.t4, whiteSpace:"nowrap" }}>{g.month.split("-")[1]}/{g.month.split("-")[0].slice(2)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TAB 2: COMPANIES (Enhanced)
// ════════════════════════════════════════════════════════════════════════
const EMPTY_COMPANY_FORM = { client_id:"", name:"", admin_name:"", admin_email:"", phone:"", city:"", state:"", module_type:"construction_individual" };

// ── EDIT COMPANY ──────────────────────────────────────────────────────
// Two things live behind one "Edit": the COMPANY record (its own name /
// contact) and the ADMIN's LOGIN identity (name / email / mobile on the
// users row). They are separate tables and separate endpoints, so the
// modal keeps them visually separate too — changing the company phone
// must never look like it changed the login.
function EditCompanyModal({ company, onClose, onSaved, setToast }) {
  const [co, setCo] = useState({
    name: company.name || "", email: company.email || "", phone: company.phone || "",
    city: company.city || "", state: company.state || "",
  });
  const [admin, setAdmin]     = useState(null);   // {id,name,email,phone} — primary admin
  const [admins, setAdmins]   = useState([]);     // all admin users, for the picker
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Admin identity lives on the users row — pull it from the existing
  // full-details endpoint rather than adding a new one.
  useEffect(() => {
    let alive = true;
    apiFetch("/saas-admin/companies/" + company.id + "/full-details").then(res => {
      if (!alive) return;
      const list = ((res.success && res.data?.users) || []).filter(u => u.role === "admin" && u.is_active);
      setAdmins(list);
      const primary = list[0];
      if (primary) setAdmin({ id: primary.id, name: primary.name || "", email: primary.email || "", phone: primary.phone || "" });
      setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [company.id]);

  const save = async () => {
    if (!co.name.trim()) return setToast({ msg: "Company name zaroori hai", type: "error" });
    if (admin && !admin.name.trim()) return setToast({ msg: "Admin ka naam zaroori hai", type: "error" });
    if (admin && admin.phone && !/^[6-9]\d{9}$/.test(admin.phone.trim())) {
      return setToast({ msg: "Admin mobile 10-digit hona chahiye — yahi login id hai", type: "error" });
    }
    setSaving(true);

    const r1 = await apiFetch("/saas-admin/companies/" + company.id, { method: "PUT", body: co });
    if (!r1.success) { setSaving(false); return setToast({ msg: r1.message || "Company update failed", type: "error" }); }

    // Admin row is a separate call — report it distinctly so a half-save is obvious.
    if (admin) {
      const r2 = await apiFetch("/saas-admin/companies/" + company.id + "/users/" + admin.id, {
        method: "PATCH", body: { name: admin.name, email: admin.email, phone: admin.phone },
      });
      if (!r2.success) {
        setSaving(false);
        return setToast({ msg: "Company save ho gayi, par admin login update nahi hua: " + (r2.message || "failed"), type: "error" });
      }
    }
    setSaving(false);
    setToast({ msg: "Company updated", type: "success" });
    onSaved();
  };

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:560, maxHeight:"90vh", overflowY:"auto", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Edit Company</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{company.name} · /{company.slug}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
        </div>

        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px" }}>Company details</div>
          <InputField label="Company Name" required value={co.name} onChange={v => setCo(p=>({...p,name:v}))} placeholder="Company ka naam"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Company Email" value={co.email} onChange={v => setCo(p=>({...p,email:v}))} placeholder="office@company.com"/>
            <InputField label="Company Phone" value={co.phone} onChange={v => setCo(p=>({...p,phone:v.replace(/\D/g,"").slice(0,10)}))} placeholder="9876543210"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="City" value={co.city} onChange={v => setCo(p=>({...p,city:v}))} placeholder="Raipur"/>
            <InputField label="State" value={co.state} onChange={v => setCo(p=>({...p,state:v}))} placeholder="Chhattisgarh"/>
          </div>
          <div style={{ fontSize:10.5, color:T.t4 }}>URL (/{company.slug}) rename par nahi badalta — purane links kaam karte rehte hain.</div>

          <div style={{ borderTop:`1px solid ${T.b1}`, paddingTop:14, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px" }}>Admin login</div>
            {admins.length > 1 && (
              <select value={admin?.id || ""} onChange={e => {
                  const a = admins.find(x => String(x.id) === e.target.value);
                  if (a) setAdmin({ id:a.id, name:a.name||"", email:a.email||"", phone:a.phone||"" });
                }}
                style={{ padding:"5px 9px", borderRadius:6, border:`1px solid ${T.b1}`, fontSize:11.5, color:T.t1, background:T.surfaceB, fontFamily:"inherit", cursor:"pointer" }}>
                {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
          </div>

          {loading && <div style={{ fontSize:12, color:T.t4 }}>Admin load ho raha hai...</div>}
          {!loading && !admin && (
            <div style={{ padding:"10px 14px", background:T.redL, border:`1px solid ${T.redM}`, borderRadius:8, fontSize:11.5, color:T.red }}>
              Is company me koi active admin user nahi hai — Reset Admin Login se admin set karo.
            </div>
          )}
          {admin && (
            <>
              <InputField label="Admin Name" required value={admin.name} onChange={v => setAdmin(p=>({...p,name:v}))} placeholder="Full name"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <InputField label="Admin Email" value={admin.email} onChange={v => setAdmin(p=>({...p,email:v}))} placeholder="admin@company.com"/>
                <InputField label="Admin Mobile (login id)" value={admin.phone} onChange={v => setAdmin(p=>({...p,phone:v.replace(/\D/g,"").slice(0,10)}))} placeholder="9876543210"/>
              </div>
              <div style={{ padding:"10px 14px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb }}>
                <strong>Admin Mobile hi login id hai</strong> — badalne par admin ko naye number se login karna hoga. Password yahan se nahi badalta; uske liye "Reset Admin Login".
              </div>
            </>
          )}
        </div>

        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
          <Btn onClick={onClose} variant="outline" style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={save} disabled={saving || loading} style={{ flex:2 }}>{saving ? "Saving..." : "Save Changes"}</Btn>
        </div>
      </div>
    </>
  );
}

function TabCompanies({ companies, reload, onSelectCompany, onOpenDetail }) {
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast]         = useState(null);
  const [form, setForm]           = useState(EMPTY_COMPANY_FORM);
  const [saving, setSaving]       = useState(false);
  const [clients, setClients]     = useState([]);   // paying customers — a company MUST belong to one
  const [showNewClient, setShowNewClient] = useState(false);
  const [toggling, setToggling]   = useState(null);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [detail, setDetail]       = useState(null);
  const [credentials, setCredentials] = useState(null); // shows after create
  const [resetTarget, setResetTarget] = useState(null);  // company whose admin login is being reset
  const [resetMobile, setResetMobile] = useState("");    // optional new mobile in reset flow
  const [resetting, setResetting]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);  // company being edited (profile + admin login)

  // Clients list — needed by the create-company picker. A company with no
  // client lands outside the limit/subscription system, so this is required.
  const loadClients = useCallback(() => {
    return apiFetch("/saas-admin/clients").then(r => {
      if (r.success) setClients(r.data || []);
      return r.success ? (r.data || []) : [];
    }).catch(() => []);
  }, []);
  useEffect(() => { loadClients(); }, [loadClients]);

  // Selectable = real paying customers (internal client is for our own companies).
  const pickableClients = clients.filter(c => !c.is_internal);
  const selectedClient  = clients.find(c => String(c.id) === String(form.client_id)) || null;
  const atCompanyLimit  = !!selectedClient && selectedClient.max_companies > 0
                          && selectedClient.company_count >= selectedClient.max_companies;
  const subInactive     = !!selectedClient && selectedClient.sub_status !== "active";

  const filtered = companies.filter(c => {
    if (filter === "active" && !c.is_active) return false;
    if (filter === "inactive" && c.is_active) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.name.toLowerCase().includes(s) || (c.city||"").toLowerCase().includes(s) || (c.slug||"").toLowerCase().includes(s);
    }
    return true;
  });

  const createCompany = async () => {
    // Client first — without it the backend auto-creates a duplicate client that
    // has no subscription, and every user of the new company gets blocked.
    if (!form.client_id) {
      setToast({ msg:"Client select karna zaroori hai", type:"error" }); return;
    }
    if (!form.name || !form.admin_name || !form.admin_email || !form.phone) {
      setToast({ msg:"Company name, admin name, email and admin mobile are required", type:"error" }); return;
    }
    // Mobile is the admin's login id (login screen is mobile-only) — must be valid
    if (!/^[6-9]\d{9}$/.test((form.phone||"").trim())) {
      setToast({ msg:"Enter a valid 10-digit admin mobile number — this is the login id", type:"error" }); return;
    }
    setSaving(true);
    const res = await apiFetch("/saas-admin/companies", { method:"POST", body: form });
    setSaving(false);
    if (res.success) {
      setShowModal(false);
      setCredentials(res.data?.credentials || null);
      setForm(EMPTY_COMPANY_FORM);
      reload();
      loadClients(); // usage counts moved
    } else {
      setToast({ msg: res.message, type:"error" });
    }
  };

  const resetAdminLogin = async () => {
    if (!resetTarget) return;
    // mobile optional — but if the admin currently has none, it must be provided
    const m = (resetMobile || "").trim();
    if (m && !/^[6-9]\d{9}$/.test(m)) {
      setToast({ msg:"Enter a valid 10-digit mobile number", type:"error" }); return;
    }
    setResetting(true);
    const res = await apiFetch("/saas-admin/companies/" + resetTarget.id + "/reset-admin-login", {
      method:"POST", body: m ? { mobile:m } : {},
    });
    setResetting(false);
    if (res.success) {
      setResetTarget(null);
      setResetMobile("");
      setCredentials(res.data?.credentials || null); // reuse the credentials popup
      reload();
    } else {
      setToast({ msg: res.message, type:"error" });
    }
  };

  const toggleCompany = async (id) => {
    setToggling(id);
    const res = await apiFetch("/saas-admin/companies/" + id + "/toggle", { method:"PUT" });
    if (res.success) {
      setToast({ msg: res.message, type:"success" });
      reload();
    }
    setToggling(null);
  };

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      <PageHeader title="Companies" sub={`${companies.length} companies registered`} right={
        <Btn onClick={() => setShowModal(true)}><IcPlus size={14} color="white"/> New Company</Btn>
      }/>

      {/* Filters */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        {["all","active","inactive"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight: filter===f ? 700 : 500, border:`1px solid ${filter===f ? T.blu : T.b1}`,
              background: filter===f ? T.bluL : T.surface, color: filter===f ? T.blu : T.t3, cursor:"pointer", textTransform:"capitalize", fontFamily:"inherit" }}>
            {f} {f === "all" ? `(${companies.length})` : f === "active" ? `(${companies.filter(c=>c.is_active).length})` : `(${companies.filter(c=>!c.is_active).length})`}
          </button>
        ))}
        <div style={{ flex:1 }}/>
        <div style={{ position:"relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies..."
            style={{ width:220, padding:"7px 12px 7px 30px", borderRadius:8, border:`1px solid ${T.b1}`, fontSize:12, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit" }}
            onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
          <IcSearch size={12} color={T.t4} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
        </div>
      </div>

      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
        <TableHeader columns={["Company","Plan","Domain","Users","Projects","Created","Status",""]}
          gridCols="1.8fr 1fr 1.2fr 65px 65px 95px 85px 105px"/>
        {filtered.length === 0 && <div style={{ textAlign:"center", padding:"40px 0", color:T.t3, fontSize:13 }}>No companies match filters</div>}
        {filtered.map((c, i) => {
          const planColor = { free:T.slt, starter:T.blu, pro:T.pur, enterprise:T.amb }[c.plan_slug] || T.t4;
          return (
            <div key={c.id} onClick={() => setDetail(detail?.id === c.id ? null : c)}
              style={{ display:"grid", gridTemplateColumns:"1.8fr 1fr 1.2fr 65px 65px 95px 85px 105px", padding:"11px 16px",
                borderBottom: i < filtered.length-1 ? `1px solid ${T.b1}` : "none", alignItems:"center",
                cursor:"pointer", background: detail?.id === c.id ? T.bluL : "transparent", transition:"background 0.15s" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{c.name}</div>
                <div style={{ fontSize:10.5, color:T.t4 }}>/{c.slug}</div>
              </div>
              <div><Badge text={c.plan_name || "No Plan"} color={planColor}/></div>
              <div><Badge text={DOMAIN_LABELS[c.module_type] || c.module_type || "Standard"} color={T.pur}/></div>
              <div style={{ fontSize:12.5, fontWeight:600, color:T.t1, textAlign:"center" }}>{c.user_count}</div>
              <div style={{ fontSize:12.5, fontWeight:600, color:T.t1, textAlign:"center" }}>{c.project_count}</div>
              <div style={{ fontSize:11.5, color:T.t3 }}>{fmtDate(c.created_at)}</div>
              <div><Badge text={c.is_active ? "Active" : "Inactive"} color={c.is_active ? T.grn : T.red}/></div>
              <div style={{ display:"flex", gap:5, justifyContent:"flex-end" }} onClick={e => e.stopPropagation()}>
                <button onClick={() => onOpenDetail && onOpenDetail(c)} title="Open full details"
                  style={{ width:28, height:28, borderRadius:6, border:`1px solid ${T.bluM}`, background:T.bluL, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <IcEye size={12} color={T.blu}/>
                </button>
                <button onClick={() => onSelectCompany(c)} title="Module access"
                  style={{ width:28, height:28, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surface, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <IcPuzzle size={12} color={T.t3}/>
                </button>
                <button onClick={() => toggleCompany(c.id)} disabled={toggling === c.id} title={c.is_active ? "Deactivate" : "Activate"}
                  style={{ width:28, height:28, borderRadius:6, border:`1px solid ${c.is_active ? T.redM : T.grnM}`, background: c.is_active ? T.redL : T.grnL,
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {c.is_active ? <IcX size={11} color={T.red}/> : <IcChk size={11} color={T.grn}/>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail drawer */}
      {detail && (
        <div style={{ marginTop:12, background:T.surface, border:`1px solid ${T.bluM}`, borderRadius:10, padding:"16px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:9, background:T.bluL, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:16, fontWeight:800, color:T.blu }}>{detail.name[0]}</span>
              </div>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:T.t1 }}>{detail.name}</div>
                <div style={{ fontSize:11, color:T.t4 }}>/{detail.slug} · {DOMAIN_LABELS[detail.module_type] || detail.module_type || "--"}</div>
              </div>
            </div>
            <button onClick={() => setDetail(null)} style={{ background:"none", border:"none", cursor:"pointer", color:T.t4, display:"flex" }}><IcX size={16}/></button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
            {[
              { l:"Email", v: detail.email || "--" },
              { l:"Phone", v: detail.phone || "--" },
              { l:"City / State", v: `${detail.city || "--"} / ${detail.state || "--"}` },
              { l:"Status", v: detail.is_active ? "Active" : `Deactivated on ${fmtDate(detail.deleted_at)}` },
              { l:"Created", v: fmtDate(detail.created_at) },
            ].map((x,i) => (
              <div key={i}>
                <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:3 }}>{x.l}</div>
                <div style={{ fontSize:12.5, fontWeight:500, color:T.t1 }}>{x.v}</div>
              </div>
            ))}
          </div>
          {/* Edit + admin login controls */}
          <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
            <div style={{ fontSize:11, color:T.t4 }}>Company ki detail ya admin ka naam / mobile badalna ho to Edit karo. Password bhool gaye ho to naya generate karo.</div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn variant="outline" onClick={() => setEditTarget(detail)}><IcEdit size={13}/> Edit</Btn>
              <Btn variant="outline" onClick={() => { setResetTarget(detail); setResetMobile(""); }}>Reset Admin Login</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      {showModal && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:520, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)", overflow:"hidden" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
              <div><div style={{ fontSize:15, fontWeight:700, color:"white" }}>Register New Company</div><div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Login password will be shown after creation</div></div>
              <button onClick={() => setShowModal(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
              {/* Client picker — a company MUST hang off a paying client, else it
                  falls outside limits + subscription and its users get blocked. */}
              <div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
                  <div style={{ flex:1 }}>
                    <SelectField label="Client (paying customer) *" value={form.client_id}
                      onChange={v => setForm(p=>({...p,client_id:v}))}
                      placeholder="Select client..."
                      options={pickableClients.map(c => ({
                        value: String(c.id),
                        label: `${c.name} — ${c.company_count}/${c.max_companies || "∞"} companies`,
                      }))}/>
                  </div>
                  <button onClick={() => setShowNewClient(true)}
                    style={{ background:"none", border:"none", cursor:"pointer", color:T.blu, fontSize:12, fontWeight:600,
                      fontFamily:"inherit", padding:"9px 4px", whiteSpace:"nowrap" }}>
                    + New Client
                  </button>
                </div>

                {selectedClient && (
                  <div style={{ marginTop:8, padding:"9px 12px", background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                      {[
                        { l:"Companies", used:selectedClient.company_count, max:selectedClient.max_companies },
                        { l:"Users",     used:selectedClient.user_count,    max:selectedClient.max_users },
                        { l:"Projects",  used:selectedClient.project_count, max:selectedClient.max_projects },
                      ].map(x => (
                        <div key={x.l} style={{ fontSize:11 }}>
                          <span style={{ color:T.t4, textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:600 }}>{x.l} </span>
                          <span style={{ fontWeight:700, color:limitColor(x.used, x.max) }}>{limitStr(x.used, x.max)}</span>
                        </div>
                      ))}
                      <div style={{ flex:1 }}/>
                      {selectedClient.sub_status
                        ? <Badge text={selectedClient.sub_status.toUpperCase()} color={SUB_COLORS[selectedClient.sub_status] || T.slt}/>
                        : <Badge text="NO SUBSCRIPTION" color={T.slt}/>}
                    </div>
                    {atCompanyLimit && (
                      <div style={{ marginTop:7, fontSize:11.5, fontWeight:600, color:T.red }}>
                        Company limit reached — is client par nayi company nahi banegi
                      </div>
                    )}
                    {subInactive && (
                      <div style={{ marginTop:7, fontSize:11.5, fontWeight:600, color:T.amb }}>
                        Is client ki subscription active nahi hai — users login nahi kar payenge. Pehle subscription activate karo.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <InputField label="Company Name" required value={form.name} onChange={v => setForm(p=>({...p,name:v}))} placeholder="e.g. Blackbox Constructions"/>
                <SelectField label="Business Type" value={form.module_type} onChange={v => setForm(p=>({...p,module_type:v}))}
                  options={Object.entries(DOMAIN_LABELS).map(([k,v]) => ({value:k, label:v}))}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <InputField label="Admin Name" required value={form.admin_name} onChange={v => setForm(p=>({...p,admin_name:v}))} placeholder="Full name"/>
                <InputField label="Admin Email" required value={form.admin_email} onChange={v => setForm(p=>({...p,admin_email:v}))} placeholder="admin@company.com"/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                <InputField label="Admin Mobile" required value={form.phone} onChange={v => setForm(p=>({...p,phone:v.replace(/\D/g,"").slice(0,10)}))} placeholder="9876543210"/>
                <InputField label="City" value={form.city} onChange={v => setForm(p=>({...p,city:v}))} placeholder="Raipur"/>
                <InputField label="State" value={form.state} onChange={v => setForm(p=>({...p,state:v}))} placeholder="Chhattisgarh"/>
              </div>
              <div style={{ padding:"10px 14px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb }}>
                <strong>Note:</strong> Admin Mobile is the login id — the app login is <strong>mobile + password</strong>. A default password is set and shown after creation; share the <strong>mobile + password</strong> with the company admin. They must change it on first login.
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setShowModal(false)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn onClick={createCompany} disabled={saving || atCompanyLimit} style={{ flex:2 }}>{saving ? "Registering..." : "Register Company"}</Btn>
            </div>
          </div>
        </>
      )}

      {/* New Client — same modal the Clients tab uses. On save, refetch and
          auto-select whichever client id is new so the picker is ready. */}
      {showNewClient && (
        <ClientFormModal
          onClose={() => setShowNewClient(false)}
          onSaved={async () => {
            const before = new Set(clients.map(c => String(c.id)));
            const fresh  = await loadClients();
            const added  = fresh.find(c => !before.has(String(c.id)));
            if (added) setForm(p => ({ ...p, client_id: String(added.id) }));
          }}
          setToast={setToast}/>
      )}

      {/* Edit Company Modal — company profile + the admin's login identity */}
      {editTarget && (
        <EditCompanyModal company={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); setDetail(null); reload(); }}
          setToast={setToast}/>
      )}

      {/* Reset Admin Login Modal */}
      {resetTarget && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:440, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)", overflow:"hidden" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Reset Admin Login</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{resetTarget.name}</div>
              </div>
              <button onClick={() => setResetTarget(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
              <InputField label="Login Mobile (leave blank to keep current)" value={resetMobile} onChange={v => setResetMobile(v.replace(/\D/g,"").slice(0,10))} placeholder="Set / change 10-digit mobile"/>
              <div style={{ padding:"10px 14px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb }}>
                A new password will be generated and shown once. Share the <strong>mobile + password</strong> with the admin. (OTP login also works as a fallback.)
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setResetTarget(null)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn onClick={resetAdminLogin} disabled={resetting} style={{ flex:2 }}>{resetting ? "Resetting..." : "Generate New Password"}</Btn>
            </div>
          </div>
        </>
      )}

      {/* Credentials Modal (shown after company creation) */}
      {credentials && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, backdropFilter:"blur(3px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:440, background:T.surface, borderRadius:16, zIndex:501, boxShadow:"0 24px 64px rgba(0,0,0,0.3)", overflow:"hidden" }}>
            <div style={{ padding:"20px 22px", background:"linear-gradient(135deg, #059669, #10B981)", textAlign:"center" }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                <IcChk size={24} color="white"/>
              </div>
              <div style={{ fontSize:17, fontWeight:800, color:"white" }}>Login Credentials</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginTop:4 }}>Share these credentials with the company admin</div>
            </div>
            <div style={{ padding:"24px 22px" }}>
              <div style={{ background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 18px", marginBottom:16 }}>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>Login Mobile</div>
                  <div style={{ fontSize:16, fontWeight:800, color:T.blu, fontFamily:"monospace", letterSpacing:"0.5px" }}>{credentials.mobile || credentials.email}</div>
                  {credentials.email && <div style={{ fontSize:10.5, color:T.t4, marginTop:3 }}>Email (reference only): {credentials.email}</div>}
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>Auto-Generated Password</div>
                  <div style={{ fontSize:18, fontWeight:800, color:T.t1, fontFamily:"monospace", letterSpacing:"1px", background:T.ambL, padding:"8px 12px", borderRadius:6, border:`1px solid ${T.ambM}` }}>{credentials.password}</div>
                </div>
              </div>
              <div style={{ padding:"10px 14px", background:T.redL, border:`1px solid ${T.redM}`, borderRadius:8, fontSize:11, color:T.red, marginBottom:16 }}>
                <strong>Important:</strong> This password is shown only once! Copy it now and share with the company admin. They must change it after first login.
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn variant="outline" style={{ flex:1 }} onClick={() => {
                  navigator.clipboard.writeText(`Login Mobile: ${credentials.mobile || ""}\nPassword: ${credentials.password}\nLogin with mobile + password.`);
                  setToast({ msg:"Credentials copied to clipboard!", type:"success" });
                }}><IcClip size={13}/> Copy Credentials</Btn>
                <Btn style={{ flex:1 }} onClick={() => setCredentials(null)}>Done</Btn>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TAB 3: MODULE ACCESS
// ════════════════════════════════════════════════════════════════════════
function TabModuleAccess({ selectedCompany, companies }) {
  const [company, setCompany]   = useState(selectedCompany || null);
  const [modules, setModules]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(null);
  const [toast, setToast]       = useState(null);

  const loadModules = (cid) => {
    setLoading(true);
    apiFetch("/saas-admin/companies/" + cid + "/modules").then(res => {
      if (res.success) setModules(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { if (company) loadModules(company.id); }, [company?.id]);

  const toggle = async (key, newVal) => {
    setSaving(key);
    const res = await apiFetch("/saas-admin/companies/" + company.id + "/modules/" + key, {
      method:"PUT", body: { is_enabled: newVal }
    });
    if (res.success) {
      setModules(prev => prev.map(m => m.key === key ? { ...m, is_enabled: newVal } : m));
      setToast({ msg: res.message, type:"success" });
    } else {
      setToast({ msg: res.message, type:"error" });
    }
    setSaving(null);
  };

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:700, color:T.t1, marginBottom:6 }}>Module Access</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:12, color:T.t3 }}>Company:</span>
            <select value={company?.id || ""} onChange={e => {
              const c = companies.find(x => x.id === Number(e.target.value));
              setCompany(c || null);
            }} style={{ padding:"6px 10px", borderRadius:7, border:`1px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
              <option value="">-- Select company --</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        {company && modules.length > 0 && (
          <div style={{ padding:"8px 14px", background:T.bluL, border:`1px solid ${T.bluM}`, borderRadius:8, fontSize:12, color:T.blu, fontWeight:600 }}>
            {modules.filter(m => m.is_enabled).length} / {modules.length} modules enabled
          </div>
        )}
      </div>

      {!company && <EmptyState Icon={IcBuilding} text="Select a company to manage its module access"/>}
      {company && loading && <div style={{ textAlign:"center", padding:40, color:T.t3, fontSize:13 }}>Loading modules...</div>}

      {company && !loading && modules.length > 0 && (
        <div>
          <div style={{ marginBottom:6, fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:"1px", display:"flex", alignItems:"center", gap:8 }}>
            Core Modules <div style={{ flex:1, height:1, background:T.b1 }}/> <Badge text="Always included" color={T.grn}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:20 }}>
            {modules.filter(m => !m.canDisable).map(m => (
              <ModAccessRow key={m.key} m={m} saving={saving} onToggle={toggle}/>
            ))}
          </div>
          <div style={{ marginBottom:6, fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:"1px", display:"flex", alignItems:"center", gap:8 }}>
            Standard Modules <div style={{ flex:1, height:1, background:T.b1 }}/> <Badge text="Toggleable" color={T.amb}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {modules.filter(m => m.canDisable).map(m => (
              <ModAccessRow key={m.key} m={m} saving={saving} onToggle={toggle}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModAccessRow({ m, saving, onToggle }) {
  const isCore = !m.canDisable;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14, padding:"11px 16px", background:T.surface, borderRadius:8, border:`1px solid ${T.b1}`, opacity: isCore ? 1 : (m.is_enabled ? 1 : 0.65) }}>
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ fontSize:13, fontWeight:600, color: m.is_enabled ? T.t1 : T.t3 }}>{m.label}</span>
          <Badge text={m.tier} color={isCore ? T.grn : T.amb}/>
          {isCore && <span style={{ fontSize:10, color:T.t4 }}>-- locked</span>}
        </div>
      </div>
      <Badge text={m.is_enabled ? "ON" : "OFF"} color={m.is_enabled ? T.grn : T.slt}/>
      <Toggle value={m.is_enabled} disabled={isCore} onChange={v => onToggle(m.key, v)}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TAB 4: ALL USERS (Enhanced)
// ════════════════════════════════════════════════════════════════════════
function TabUsers() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast]   = useState(null);

  const load = () => {
    setLoading(true);
    apiFetch("/saas-admin/users").then(res => {
      if (res.success) setUsers(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.company_name||"").toLowerCase().includes(search.toLowerCase())
  );

  const roleColor = r => ({ super_admin:T.pur, admin:T.blu, project_manager:T.grn, supervisor:T.amb, viewer:T.slt }[r] || T.slt);

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      <PageHeader title="All Users" sub={`${users.length} users across all companies`} right={
        <div style={{ position:"relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, company..."
            style={{ width:280, padding:"8px 12px 8px 32px", borderRadius:8, border:`1px solid ${T.b1}`, fontSize:12.5, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit" }}
            onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
          <IcSearch size={13} color={T.t4} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
        </div>
      }/>

      {loading ? <div style={{ textAlign:"center", padding:60, color:T.t3, fontSize:13 }}>Loading users...</div> : (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <TableHeader columns={["Name","Email","Company","Role","Status","Last Login"]}
            gridCols="1.5fr 2fr 1.5fr 110px 90px 100px"/>
          {filtered.length === 0 && <div style={{ textAlign:"center", padding:"40px 0", color:T.t3, fontSize:13 }}>No users found</div>}
          {filtered.map((u, i) => (
            <div key={u.id} style={{ display:"grid", gridTemplateColumns:"1.5fr 2fr 1.5fr 110px 90px 100px", padding:"10px 16px",
              borderBottom: i < filtered.length-1 ? `1px solid ${T.b1}` : "none", alignItems:"center" }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{u.name}</div>
              <div style={{ fontSize:12, color:T.t3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
              <div style={{ fontSize:12, color:T.t2 }}>{u.company_name}</div>
              <div><Badge text={u.role.replace("_"," ")} color={roleColor(u.role)}/></div>
              <div><Badge text={u.is_active ? "Active" : "Inactive"} color={u.is_active ? T.grn : T.red}/></div>
              <div style={{ fontSize:11, color:T.t4 }}>{u.last_login ? fmtDate(u.last_login) : "Never"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TAB 5: AUDIT LOGS (NEW)
// ════════════════════════════════════════════════════════════════════════
function TabAuditLogs({ companies }) {
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ company_id:"", entity_type:"", action:"" });

  const load = useCallback((p = 1) => {
    setLoading(true);
    const q = new URLSearchParams({ page: p, limit: 30 });
    if (filters.company_id) q.set("company_id", filters.company_id);
    if (filters.entity_type) q.set("entity_type", filters.entity_type);
    if (filters.action) q.set("action", filters.action);

    apiFetch("/saas-admin/audit-logs?" + q.toString()).then(res => {
      if (res.success) { setLogs(res.data); setTotal(res.total); setPage(p); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(1); }, [load]);

  const totalPages = Math.ceil(total / 30);

  const actionColor = a => ({ LOGIN:T.blu, CREATE:T.grn, UPDATE:T.amb, DELETE:T.red, EXPORT:T.pur, DEACTIVATE:T.red, REACTIVATE:T.grn }[a] || T.slt);

  const ACTIONS = ["LOGIN","CREATE","UPDATE","DELETE","EXPORT","DEACTIVATE","REACTIVATE"];
  const ENTITIES = ["user","project","transaction","vendor","material_request","purchase_order","grn","company"];

  return (
    <div style={{ padding:"20px 24px" }}>
      <PageHeader title="Audit Logs" sub={`${fmtNum(total)} total events`} right={
        <Btn onClick={() => load(1)} variant="outline"><IcRefresh size={13}/> Refresh</Btn>
      }/>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"center" }}>
        <IcFilter size={14} color={T.t4}/>
        <select value={filters.company_id} onChange={e => setFilters(p=>({...p,company_id:e.target.value}))}
          style={{ padding:"6px 10px", borderRadius:7, border:`1px solid ${T.b1}`, fontSize:12, color:T.t1, background:T.surface, fontFamily:"inherit", cursor:"pointer" }}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.action} onChange={e => setFilters(p=>({...p,action:e.target.value}))}
          style={{ padding:"6px 10px", borderRadius:7, border:`1px solid ${T.b1}`, fontSize:12, color:T.t1, background:T.surface, fontFamily:"inherit", cursor:"pointer" }}>
          <option value="">All Actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filters.entity_type} onChange={e => setFilters(p=>({...p,entity_type:e.target.value}))}
          style={{ padding:"6px 10px", borderRadius:7, border:`1px solid ${T.b1}`, fontSize:12, color:T.t1, background:T.surface, fontFamily:"inherit", cursor:"pointer" }}>
          <option value="">All Entity Types</option>
          {ENTITIES.map(e => <option key={e} value={e}>{e.replace("_"," ")}</option>)}
        </select>
        {(filters.company_id || filters.action || filters.entity_type) && (
          <button onClick={() => setFilters({ company_id:"", entity_type:"", action:"" })}
            style={{ fontSize:11, color:T.red, background:"none", border:"none", cursor:"pointer", fontWeight:600, fontFamily:"inherit" }}>
            Clear filters
          </button>
        )}
      </div>

      {loading ? <div style={{ textAlign:"center", padding:60, color:T.t3, fontSize:13 }}>Loading audit logs...</div> : (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <TableHeader columns={["Time","User","Action","Entity","Details","Company","IP"]}
            gridCols="130px 1.2fr 90px 1fr 1.5fr 1fr 100px"/>
          {logs.length === 0 && <div style={{ textAlign:"center", padding:"40px 0", color:T.t3, fontSize:13 }}>No audit logs found</div>}
          {logs.map((l, i) => {
            let details = "";
            try { const d = typeof l.details === "string" ? JSON.parse(l.details) : l.details; details = d ? Object.entries(d).map(([k,v])=>`${k}: ${v}`).join(", ") : ""; } catch(_) {}
            return (
              <div key={l.id} style={{ display:"grid", gridTemplateColumns:"130px 1.2fr 90px 1fr 1.5fr 1fr 100px", padding:"9px 16px",
                borderBottom: i < logs.length-1 ? `1px solid ${T.b1}` : "none", alignItems:"center" }}>
                <div style={{ fontSize:11, color:T.t3 }}>{fmtDateTime(l.created_at)}</div>
                <div style={{ fontSize:12, fontWeight:600, color:T.t1 }}>{l.user_name || "--"}</div>
                <div><Badge text={l.action} color={actionColor(l.action)}/></div>
                <div style={{ fontSize:12, color:T.t2 }}>
                  {l.entity_type.replace("_"," ")}{l.entity_id ? ` #${l.entity_id}` : ""}
                </div>
                <div style={{ fontSize:11, color:T.t3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={details}>
                  {details || "--"}
                </div>
                <div style={{ fontSize:11.5, color:T.t2 }}>{l.company_name || "--"}</div>
                <div style={{ fontSize:10.5, color:T.t4, fontFamily:"monospace" }}>{l.ip_address || "--"}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:16 }}>
          <button onClick={() => load(page-1)} disabled={page <= 1}
            style={{ width:30, height:30, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surface, cursor: page<=1?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <IcChevL size={14} color={page<=1?T.t4:T.t2}/>
          </button>
          <span style={{ fontSize:12, color:T.t3 }}>Page {page} of {totalPages}</span>
          <button onClick={() => load(page+1)} disabled={page >= totalPages}
            style={{ width:30, height:30, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surface, cursor: page>=totalPages?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <IcChevR size={14} color={page>=totalPages?T.t4:T.t2}/>
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TAB 6: DATA EXPORT (NEW)
// ════════════════════════════════════════════════════════════════════════
function TabExport({ companies }) {
  const [selCompany, setSelCompany] = useState("");
  const [exporting, setExporting]   = useState(false);
  const [toast, setToast]           = useState(null);
  const [lastExport, setLastExport] = useState(null);
  const [history, setHistory]       = useState([]);

  // Load export history from audit logs
  useEffect(() => {
    apiFetch("/saas-admin/audit-logs?action=EXPORT&limit=10").then(res => {
      if (res.success) setHistory(res.data);
    }).catch(() => {});
  }, []);

  const doExport = async () => {
    if (!selCompany) { setToast({ msg:"Select a company first", type:"error" }); return; }
    setExporting(true);
    try {
      // Complete exporter: enumerates every company-scoped table from
      // information_schema, so it can't go stale as the schema grows. (The old
      // GET /export-company had a hardcoded table list and silently dropped data.)
      const res = await fetch(API + "/saas-admin/companies/" + selCompany + "/export-data", {
        method: "POST",
        headers: { Authorization: "Bearer " + tok(), "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        // Download as JSON file
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type:"application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const company = companies.find(c => c.id === Number(selCompany));
        a.href = url;
        a.download = `export_${company?.slug || selCompany}_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setLastExport(data.data);
        setToast({ msg:"Export downloaded successfully!", type:"success" });
        // Refresh history
        apiFetch("/saas-admin/audit-logs?action=EXPORT&limit=10").then(r => { if (r.success) setHistory(r.data); });
      } else {
        setToast({ msg: data.message || "Export failed", type:"error" });
      }
    } catch(e) {
      setToast({ msg:"Export failed: " + e.message, type:"error" });
    }
    setExporting(false);
  };

  const company = companies.find(c => c.id === Number(selCompany));

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      <PageHeader title="Data Export" sub="Export complete company data as JSON"/>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Export panel */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Export Company Data</span>
          </div>
          <div style={{ padding:"20px 18px" }}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:600, color:T.t3, display:"block", marginBottom:6 }}>SELECT COMPANY</label>
              <select value={selCompany} onChange={e => { setSelCompany(e.target.value); setLastExport(null); }}
                style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`1.5px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surfaceB, fontFamily:"inherit", cursor:"pointer" }}>
                <option value="">-- Choose company --</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.user_count} users, {c.project_count} projects)</option>)}
              </select>
            </div>

            {company && (
              <div style={{ padding:"12px 14px", background:T.bluL, border:`1px solid ${T.bluM}`, borderRadius:8, marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.blu, marginBottom:4 }}>{company.name}</div>
                <div style={{ fontSize:11, color:T.t3 }}>
                  {company.user_count} users · {company.project_count} projects · {DOMAIN_LABELS[company.module_type] || company.module_type || "Standard"}
                </div>
              </div>
            )}

            <Btn onClick={doExport} disabled={exporting || !selCompany} style={{ width:"100%", justifyContent:"center", padding:"12px" }}>
              <IcDownload size={15} color="white"/> {exporting ? "Exporting..." : "Export & Download JSON"}
            </Btn>

            {/* Last export summary — shape comes from utils/companyDataPurge:
                { company, client, tables: {name: rows[]}, meta: {table_count, total_rows} } */}
            {lastExport && lastExport.tables && (
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.t3, marginBottom:8, textTransform:"uppercase" }}>
                  Export Summary — {lastExport.meta?.table_count || 0} tables · {fmtNum(lastExport.meta?.total_rows || 0)} rows
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {Object.entries(lastExport.tables)
                    .sort((a, b) => b[1].length - a[1].length)
                    .map(([table, rows]) => (
                      <div key={table} style={{ padding:"3px 10px", borderRadius:6, background:T.grnL, border:`1px solid ${T.grnM}`, fontSize:11, color:T.grn }}>
                        {table.replace(/_/g, " ")}: <strong>{rows.length}</strong>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Export history */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Export History</span>
          </div>
          <div style={{ maxHeight:400, overflowY:"auto" }}>
            {history.length === 0 && (
              <div style={{ padding:40, textAlign:"center", color:T.t4, fontSize:12 }}>No exports yet</div>
            )}
            {history.map((h, i) => {
              let d = {};
              try { d = typeof h.details === "string" ? JSON.parse(h.details) : (h.details || {}); } catch(_) {}
              return (
                <div key={i} style={{ padding:"11px 18px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:7, background:T.purL, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <IcDownload size={14} color={T.pur}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.t1 }}>{d.company_name || h.company_name || "Company"}</div>
                    <div style={{ fontSize:10.5, color:T.t4 }}>
                      by {h.user_name} · {fmtDateTime(h.created_at)}
                      {d.tables_exported && ` · ${d.tables_exported} tables`}
                    </div>
                  </div>
                  {d.self_export && <Badge text="Self" color={T.amb}/>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* What's exported info */}
      <div style={{ marginTop:20, padding:"14px 18px", background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:10 }}>What's included in the export?</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
          {["Projects & Tasks","Transactions & Accounts","Material Requests","Purchase Orders & GRN",
            "Vendors & Parties","Users & Roles","Solar Leads & Stages","CRM Data",
            "Subcontractor Data","Warehouse Items","Approval Workflows","Audit Logs"
          ].map((item, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:T.t2 }}>
              <IcChk size={12} color={T.grn}/> {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TAB 7: SUBSCRIPTIONS (NEW)
// ════════════════════════════════════════════════════════════════════════
const IcCrown = p => <Ic {...p} d="M2 4l3 12h14l3-12-5 4-5-4-5 4-5-4zM3 20h18" />;

function TabSubscriptions({ companies }) {
  const [plans, setPlans]           = useState([]);
  const [subs, setSubs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ company_id:"", plan_id:"", billing_cycle:"monthly", amount_paid:"", payment_ref:"", notes:"" });
  const [saving, setSaving]         = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/saas-admin/plans"),
      apiFetch("/saas-admin/subscriptions"),
    ]).then(([pRes, sRes]) => {
      if (pRes.success) setPlans(pRes.data);
      if (sRes.success) setSubs(sRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const planColor = slug => ({ free:T.slt, starter:T.blu, pro:T.pur, enterprise:T.amb }[slug] || T.t4);
  const statusColor = s => ({ active:T.grn, trial:T.amb, expired:T.red, cancelled:T.slt }[s] || T.t4);

  const assignSub = async () => {
    if (!assignForm.company_id || !assignForm.plan_id) {
      setToast({ msg:"Select company and plan", type:"error" }); return;
    }
    setSaving(true);
    const res = await apiFetch("/saas-admin/subscriptions", { method:"POST", body: assignForm });
    setSaving(false);
    if (res.success) {
      setToast({ msg:"Subscription assigned!", type:"success" });
      setShowAssign(false);
      setAssignForm({ company_id:"", plan_id:"", billing_cycle:"monthly", amount_paid:"", payment_ref:"", notes:"" });
      load();
    } else {
      setToast({ msg: res.message, type:"error" });
    }
  };

  const cancelSub = async (id) => {
    if (!await window.confirmAsync("Cancel this subscription?")) return;
    const res = await apiFetch("/saas-admin/subscriptions/" + id + "/cancel", { method:"PUT" });
    if (res.success) { setToast({ msg:"Subscription cancelled", type:"success" }); load(); }
  };

  if (loading) return <div style={{ textAlign:"center", padding:60, color:T.t3, fontSize:13 }}>Loading subscriptions...</div>;

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      <PageHeader title="Subscriptions" sub={`${subs.filter(s=>s.status==="active"||s.status==="trial").length} active subscriptions`} right={
        <Btn onClick={() => setShowAssign(true)}><IcPlus size={14} color="white"/> Assign Plan</Btn>
      }/>

      {/* Plans overview */}
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${plans.length},1fr)`, gap:12, marginBottom:24 }}>
        {plans.map(p => (
          <div key={p.id} style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, borderTop:`3px solid ${planColor(p.slug)}`, padding:"18px 16px", position:"relative" }}>
            {p.slug === "pro" && (
              <div style={{ position:"absolute", top:8, right:10, fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:20, background:T.purL, color:T.pur, border:`1px solid ${T.purM}` }}>POPULAR</div>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <IcCrown size={16} color={planColor(p.slug)}/>
              <span style={{ fontSize:14, fontWeight:700, color:T.t1 }}>{p.name}</span>
            </div>
            <div style={{ marginBottom:10 }}>
              <span style={{ fontSize:24, fontWeight:800, color:T.t1 }}>{p.price_monthly > 0 ? `₹${fmtNum(p.price_monthly)}` : "Free"}</span>
              {p.price_monthly > 0 && <span style={{ fontSize:11, color:T.t4 }}>/month</span>}
            </div>
            <div style={{ fontSize:11, color:T.t3, marginBottom:10 }}>
              {p.price_yearly > 0 && <div>₹{fmtNum(p.price_yearly)}/year (save {Math.round((1 - p.price_yearly/(p.price_monthly*12))*100)}%)</div>}
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <Badge text={`${p.max_users} users`} color={planColor(p.slug)}/>
              <Badge text={`${p.max_projects} projects`} color={planColor(p.slug)}/>
              <Badge text={`${p.max_storage_gb}GB`} color={planColor(p.slug)}/>
            </div>
            <div style={{ borderTop:`1px solid ${T.b1}`, paddingTop:10 }}>
              {(() => { try { const f = typeof p.features === "string" ? JSON.parse(p.features) : (p.features||[]); return f.map((feat,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:T.t2, marginBottom:4 }}>
                  <IcChk size={11} color={T.grn}/> {feat}
                </div>
              )); } catch(_) { return null; } })()}
            </div>
            <div style={{ marginTop:10, padding:"5px 10px", background:planColor(p.slug)+"12", borderRadius:6, textAlign:"center", fontSize:11, fontWeight:600, color:planColor(p.slug) }}>
              {p.subscriber_count} active subscriber{p.subscriber_count !== 1 ? "s" : ""}
            </div>
          </div>
        ))}
      </div>

      {/* Active subscriptions table */}
      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
        <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>All Subscriptions</span>
          <span style={{ fontSize:11, color:T.t4 }}>{subs.length} total</span>
        </div>
        <TableHeader columns={["Company","Plan","Billing","Status","Usage","Start","Expires","Payment",""]}
          gridCols="1.5fr 1fr 80px 80px 1.2fr 90px 90px 90px 50px"/>
        {subs.length === 0 && <div style={{ textAlign:"center", padding:"40px 0", color:T.t3, fontSize:13 }}>No subscriptions yet</div>}
        {subs.map((s, i) => {
          const isExpiring = s.status === "active" && s.end_date && new Date(s.end_date) < new Date(Date.now() + 7*24*60*60*1000);
          return (
            <div key={s.id} style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 80px 80px 1.2fr 90px 90px 90px 50px", padding:"10px 16px",
              borderBottom: i < subs.length-1 ? `1px solid ${T.b1}` : "none", alignItems:"center",
              background: isExpiring ? T.ambL : "transparent" }}>
              <div>
                <div style={{ fontSize:12.5, fontWeight:600, color:T.t1 }}>{s.company_name}</div>
                <div style={{ fontSize:10, color:T.t4 }}>/{s.company_slug}</div>
              </div>
              <div><Badge text={s.plan_name} color={planColor(s.plan_slug)}/></div>
              <div style={{ fontSize:11.5, color:T.t2, textTransform:"capitalize" }}>{s.billing_cycle}</div>
              <div><Badge text={s.status} color={statusColor(s.status)}/></div>
              <div style={{ fontSize:11, color:T.t2 }}>
                {s.current_users}/{s.max_users} users · {s.current_projects}/{s.max_projects} proj
              </div>
              <div style={{ fontSize:11, color:T.t3 }}>{fmtDate(s.start_date)}</div>
              <div style={{ fontSize:11, color: isExpiring ? T.red : T.t3, fontWeight: isExpiring ? 600 : 400 }}>{fmtDate(s.end_date)}</div>
              <div style={{ fontSize:11.5, fontWeight:600, color:T.grn }}>{s.amount_paid > 0 ? `₹${fmtNum(s.amount_paid)}` : "Free"}</div>
              <div style={{ display:"flex", justifyContent:"flex-end" }}>
                {(s.status === "active" || s.status === "trial") && (
                  <button onClick={() => cancelSub(s.id)} title="Cancel"
                    style={{ width:26, height:26, borderRadius:6, border:`1px solid ${T.redM}`, background:T.redL, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <IcX size={11} color={T.red}/>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assign Plan Modal */}
      {showAssign && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:480, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)", overflow:"hidden" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, background:"#0D1B2A", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div><div style={{ fontSize:15, fontWeight:700, color:"white" }}>Assign Subscription Plan</div></div>
              <button onClick={() => setShowAssign(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
              <SelectField label="Company" value={assignForm.company_id} onChange={v => setAssignForm(p=>({...p,company_id:v}))}
                placeholder="-- Select company --"
                options={companies.map(c => ({value:String(c.id), label:c.name}))}/>
              <SelectField label="Plan" value={assignForm.plan_id} onChange={v => setAssignForm(p=>({...p,plan_id:v}))}
                placeholder="-- Select plan --"
                options={plans.map(p => ({value:String(p.id), label:`${p.name} - ₹${fmtNum(p.price_monthly)}/mo`}))}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <SelectField label="Billing Cycle" value={assignForm.billing_cycle} onChange={v => setAssignForm(p=>({...p,billing_cycle:v}))}
                  options={[{value:"monthly",label:"Monthly"},{value:"yearly",label:"Yearly"},{value:"lifetime",label:"Lifetime"}]}/>
                <InputField label="Amount Paid (₹)" value={assignForm.amount_paid} onChange={v => setAssignForm(p=>({...p,amount_paid:v}))} placeholder="0"/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <InputField label="Payment Reference" value={assignForm.payment_ref} onChange={v => setAssignForm(p=>({...p,payment_ref:v}))} placeholder="UPI/Txn ID"/>
                <InputField label="Notes" value={assignForm.notes} onChange={v => setAssignForm(p=>({...p,notes:v}))} placeholder="Optional notes"/>
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setShowAssign(false)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn onClick={assignSub} disabled={saving} style={{ flex:2 }}>{saving ? "Assigning..." : "Assign Plan"}</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// COMPANY DETAIL PAGE (Phase 2) — full-page drill-down with 7 tabs
// ════════════════════════════════════════════════════════════════════════
function CompanyDetailPage({ companyId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [savingNote, setSavingNote] = useState(false);
  const [editUser, setEditUser] = useState(null);       // user row being edited
  const [savingUser, setSavingUser] = useState(false);
  const [newCreds, setNewCreds] = useState(null);       // {name,mobile,email,password} after reset
  const [resettingId, setResettingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/saas-admin/companies/" + companyId + "/full-details").then(res => {
      if (res.success) setData(res.data); else setData(null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    const res = await apiFetch("/saas-admin/companies/" + companyId + "/crm-notes", {
      method:"POST", body:{ type: noteType, content: noteText }
    });
    setSavingNote(false);
    if (res.success) { setNoteText(""); load(); setToast({ msg:"Note added", type:"success" }); }
    else setToast({ msg:"Failed to add note", type:"error" });
  };

  const deleteNote = async (nid) => {
    if (!await window.confirmAsync("Delete this note?")) return;
    await apiFetch("/saas-admin/crm-notes/" + nid, { method:"DELETE" });
    load();
  };

  const saveUser = async () => {
    if (!editUser) return;
    setSavingUser(true);
    const res = await apiFetch("/saas-admin/companies/" + companyId + "/users/" + editUser.id, {
      method:"PATCH",
      body:{ name: editUser.name, email: editUser.email, phone: editUser.phone, role: editUser.role, is_active: editUser.is_active ? 1 : 0 },
    });
    setSavingUser(false);
    if (res.success) { setEditUser(null); load(); setToast({ msg:"User updated", type:"success" }); }
    else setToast({ msg: res.message || "Update failed", type:"error" });
  };

  const resetUserPassword = async (u) => {
    if (!await window.confirmAsync(`Reset password for ${u.name}? A new password will be generated and shown once.`)) return;
    setResettingId(u.id);
    const res = await apiFetch("/saas-admin/companies/" + companyId + "/users/" + u.id + "/reset-password", { method:"POST" });
    setResettingId(null);
    if (res.success && res.data) { setNewCreds(res.data.credentials); load(); }
    else setToast({ msg: res.message || "Reset failed", type:"error" });
  };

  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.t3, fontSize:13 }}>Loading company details...</div>;
  if (!data)   return <div style={{ padding:60, textAlign:"center", color:T.red, fontSize:13 }}>Failed to load.<br/><Btn onClick={onBack} variant="outline" style={{ marginTop:12 }}>← Back</Btn></div>;

  const { company, current_sub, subscriptions, users, modules, audit_logs, feature_requests, crm_notes, usage, health } = data;
  const healthColor = health.score >= 75 ? T.grn : health.score >= 50 ? T.amb : T.red;

  const TABS_DET = [
    { id:"overview",    label:"Overview",            Icon:IcBuilding },
    { id:"subscription",label:"Subscription",        Icon:IcDollar   },
    { id:"users",       label:`Users (${users.length})`, Icon:IcUsers },
    { id:"modules",     label:"Module Access",       Icon:IcPuzzle   },
    { id:"audit",       label:"Activity",            Icon:IcActivity },
    { id:"features",    label:`Requests (${feature_requests.length})`, Icon:IcClip },
    { id:"crm",         label:`Notes/CRM (${crm_notes.length})`, Icon:IcShield },
  ];

  return (
    <div style={{ padding:"18px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      {/* Back + company header */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
        <button onClick={onBack} style={{ padding:"7px 12px", border:`1px solid ${T.b1}`, background:T.surface, borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.t2, fontFamily:"inherit" }}>
          <IcChevL size={14}/> Back
        </button>
        <div style={{ width:48, height:48, borderRadius:10, background:T.bluL, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:20, fontWeight:800, color:T.blu }}>{(company.name||"?")[0]}</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:18, fontWeight:800, color:T.t1 }}>{company.name}</div>
          <div style={{ fontSize:11, color:T.t4 }}>/{company.slug} · {DOMAIN_LABELS[company.module_type] || company.module_type || "--"} · Registered {fmtDate(company.created_at)}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Badge text={company.is_active ? "Active" : "Inactive"} color={company.is_active ? T.grn : T.red}/>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, color:T.t4, textTransform:"uppercase", fontWeight:600 }}>Health Score</div>
            <div style={{ fontSize:20, fontWeight:800, color:healthColor }}>{health.score}/100</div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:4, background:T.surface, padding:4, border:`1px solid ${T.b1}`, borderRadius:10, marginBottom:16, overflowX:"auto" }}>
        {TABS_DET.map(t => {
          const isA = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", border:"none", borderRadius:7, cursor:"pointer",
                color: isA ? "white" : T.t3, fontWeight: isA ? 700 : 500, fontSize:12,
                background: isA ? T.blu : "transparent", whiteSpace:"nowrap", fontFamily:"inherit" }}>
              <t.Icon size={13} color={isA ? "white" : T.t3}/>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Overview */}
      {tab === "overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:16 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:14 }}>Company Info</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {[
                { l:"Email", v: company.email || "--" },
                { l:"Phone", v: company.phone || "--" },
                { l:"City", v: company.city || "--" },
                { l:"State", v: company.state || "--" },
                { l:"Business Type", v: DOMAIN_LABELS[company.module_type] || company.module_type || "--" },
                { l:"Registered", v: fmtDate(company.created_at) },
                { l:"Users", v: company.user_count },
                { l:"Projects", v: company.project_count },
              ].map((x,i) => (
                <div key={i}>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:3 }}>{x.l}</div>
                  <div style={{ fontSize:13, fontWeight:500, color:T.t1 }}>{x.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:14 }}>Health Breakdown</div>
            {Object.entries(health.breakdown).map(([k, v]) => {
              const max = { login:30, features:25, payment:20, support:15, growth:10 }[k] || 20;
              const pct = (v / max) * 100;
              return (
                <div key={k} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:11, color:T.t2, textTransform:"capitalize", fontWeight:500 }}>{k}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:T.t1 }}>{Math.round(v)}/{max}</span>
                  </div>
                  <div style={{ height:6, background:T.b1, borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background: pct >= 70 ? T.grn : pct >= 40 ? T.amb : T.red, borderRadius:3 }}/>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop:14, padding:10, background:T.surfaceB, borderRadius:8, fontSize:11, color:T.t3 }}>
              Last login: <strong style={{ color:T.t1 }}>{health.days_since_login == null ? "Never" : health.days_since_login + "d ago"}</strong>
            </div>
          </div>

          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:14 }}>Usage Stats</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <StatCard label="Projects" value={fmtNum(usage.projects)} color={T.blu} Icon={IcFolder}/>
              <StatCard label="Transactions" value={fmtNum(usage.transactions)} color={T.grn} Icon={IcActivity}/>
              <StatCard label="Revenue" value={"₹" + fmtMoney(usage.revenue)} color={T.amb} Icon={IcDollar}/>
            </div>
          </div>

          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:14 }}>Current Subscription</div>
            {current_sub ? (
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:T.blu }}>{current_sub.plan_name || "Custom"}</div>
                <div style={{ fontSize:11, color:T.t4, marginBottom:10 }}>{current_sub.billing_cycle} · <Badge text={current_sub.status} color={current_sub.status === "active" ? T.grn : T.amb}/></div>
                <div style={{ fontSize:11, color:T.t3 }}>Valid till <strong style={{ color:T.t1 }}>{fmtDate(current_sub.end_date)}</strong></div>
                <div style={{ fontSize:11, color:T.t3 }}>MRR: <strong style={{ color:T.grn }}>₹{fmtMoney(current_sub.mrr_amount || 0)}</strong></div>
              </div>
            ) : <div style={{ fontSize:12, color:T.t4 }}>No active subscription</div>}
          </div>
        </div>
      )}

      {/* TAB 2: Subscription */}
      {tab === "subscription" && (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, fontSize:13, fontWeight:700, color:T.t1 }}>Subscription History</div>
          {subscriptions.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No subscriptions yet</div>}
          {subscriptions.map((s, i) => (
            <div key={i} style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}`, display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr", gap:10, alignItems:"center" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{s.plan_name || "--"}</div>
                <div style={{ fontSize:10, color:T.t4 }}>{s.billing_cycle}</div>
              </div>
              <div><Badge text={s.status} color={s.status === "active" ? T.grn : s.status === "trial" ? T.amb : T.slt}/></div>
              <div style={{ fontSize:11, color:T.t3 }}>{fmtDate(s.start_date)} → {fmtDate(s.end_date)}</div>
              <div style={{ fontSize:12, fontWeight:700, color:T.grn }}>₹{fmtMoney(s.amount_paid)}</div>
              <div style={{ fontSize:11, color:T.t4 }}>{s.payment_ref || "--"}</div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Users — edit / reset-password per user */}
      {tab === "users" && (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <TableHeader columns={["Name / Mobile","Email","Role","Last Login","Status","Actions"]} gridCols="1.5fr 1.7fr 1fr 0.9fr 84px 88px"/>
          {users.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No users</div>}
          {users.map((u, i) => (
            <div key={u.id || i} style={{ display:"grid", gridTemplateColumns:"1.5fr 1.7fr 1fr 0.9fr 84px 88px", padding:"11px 16px", borderBottom: i < users.length-1 ? `1px solid ${T.b1}` : "none", alignItems:"center" }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{u.name}</div>
                <div style={{ fontSize:10.5, color:T.t4, fontFamily:"monospace" }}>{u.phone || "no mobile"}</div>
              </div>
              <div style={{ fontSize:11, color:T.t3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email || "--"}</div>
              <div><Badge text={(u.role||"").replace(/_/g," ")} color={T.pur}/></div>
              <div style={{ fontSize:10.5, color:T.t4 }}>{u.last_login ? fmtDateTime(u.last_login) : "Never"}</div>
              <div><Badge text={u.is_active ? "Active" : "Inactive"} color={u.is_active ? T.grn : T.red}/></div>
              <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                <button onClick={() => setEditUser({ id:u.id, name:u.name||"", email:u.email||"", phone:u.phone||"", role:u.role||"", is_active: !!u.is_active })} title="Edit user"
                  style={{ width:28, height:28, borderRadius:6, border:`1px solid ${T.bluM}`, background:T.bluL, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <IcEdit size={12} color={T.blu}/>
                </button>
                <button onClick={() => resetUserPassword(u)} disabled={resettingId === u.id} title="Reset password"
                  style={{ width:28, height:28, borderRadius:6, border:`1px solid ${T.ambM}`, background:T.ambL, cursor: resettingId===u.id ? "wait" : "pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <IcLock size={12} color={T.amb}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Module Access */}
      {tab === "modules" && (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:14 }}>Enabled Modules ({modules.filter(m=>m.is_enabled).length}/{modules.length})</div>
          {modules.length === 0 && <div style={{ fontSize:12, color:T.t4 }}>No modules configured</div>}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
            {modules.map((m, i) => (
              <div key={i} style={{ padding:"10px 12px", border:`1px solid ${m.is_enabled ? T.grnM : T.b1}`, background: m.is_enabled ? T.grnL : T.surfaceB, borderRadius:8, display:"flex", alignItems:"center", gap:8 }}>
                {m.is_enabled ? <IcChk size={14} color={T.grn}/> : <IcX size={14} color={T.t4}/>}
                <span style={{ fontSize:12, fontWeight:600, color: m.is_enabled ? T.grn : T.t4, textTransform:"capitalize" }}>{m.module_key}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Activity / Audit */}
      {tab === "audit" && (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden", maxHeight:500, overflowY:"auto" }}>
          {audit_logs.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No activity logged</div>}
          {audit_logs.map((a, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 16px", borderBottom:`1px solid ${T.b1}` }}>
              <div style={{ width:26, height:26, borderRadius:6, background:T.bluL, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <IcActivity size={12} color={T.blu}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:T.t1 }}>
                  <strong>{a.user_name || "System"}</strong> <span style={{ color:T.blu, fontWeight:600 }}>{a.action}</span> <span style={{ color:T.t3 }}>{a.entity_type}</span>{a.entity_id && <span style={{ color:T.t4 }}> #{a.entity_id}</span>}
                </div>
                <div style={{ fontSize:10, color:T.t4, marginTop:1 }}>{fmtDateTime(a.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: Feature Requests */}
      {tab === "features" && (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, fontSize:13, fontWeight:700, color:T.t1 }}>Feature Requests from {company.name}</div>
          {feature_requests.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No feature requests yet</div>}
          {feature_requests.map((f, i) => (
            <div key={i} style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{f.title}</div>
                <div style={{ display:"flex", gap:6 }}>
                  <Badge text={f.priority} color={f.priority === "critical" ? T.red : f.priority === "high" ? T.amb : T.slt}/>
                  <Badge text={f.status} color={f.status === "shipped" ? T.grn : f.status === "in_development" ? T.blu : T.pur}/>
                </div>
              </div>
              <div style={{ fontSize:11, color:T.t3, marginBottom:4 }}>{f.description}</div>
              <div style={{ fontSize:10, color:T.t4 }}>Requested by {f.user_name} · {fmtDateTime(f.created_at)} {f.module && `· ${f.module}`}</div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 7: CRM / Notes */}
      {tab === "crm" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1.3fr", gap:16 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:12 }}>Add Note / Log Activity</div>
            <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
              {["note","call","email","whatsapp","meeting"].map(t => (
                <button key={t} onClick={() => setNoteType(t)}
                  style={{ padding:"5px 12px", borderRadius:18, fontSize:11, fontWeight: noteType===t ? 700 : 500,
                    border:`1px solid ${noteType===t ? T.blu : T.b1}`,
                    background: noteType===t ? T.bluL : T.surface, color: noteType===t ? T.blu : T.t3,
                    cursor:"pointer", textTransform:"capitalize", fontFamily:"inherit" }}>{t}</button>
              ))}
            </div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Write your note here..."
              style={{ width:"100%", minHeight:100, padding:"10px 12px", border:`1px solid ${T.b1}`, borderRadius:8, fontSize:12, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
            <Btn onClick={addNote} disabled={savingNote || !noteText.trim()} style={{ marginTop:10, width:"100%" }}>
              {savingNote ? "Saving..." : "Add Note"}
            </Btn>
          </div>

          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, fontSize:13, fontWeight:700, color:T.t1 }}>Activity Timeline</div>
            <div style={{ maxHeight:450, overflowY:"auto" }}>
              {crm_notes.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No notes yet. Start tracking customer interactions!</div>}
              {crm_notes.map((n, i) => {
                const typeColor = { note:T.slt, call:T.blu, email:T.pur, whatsapp:T.grn, meeting:T.amb }[n.type] || T.slt;
                return (
                  <div key={i} style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}` }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <Badge text={n.type} color={typeColor}/>
                        <span style={{ fontSize:11, fontWeight:600, color:T.t2 }}>{n.author_name}</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:10, color:T.t4 }}>{fmtDateTime(n.created_at)}</span>
                        <button onClick={() => deleteNote(n.id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.t4, display:"flex", padding:2 }}><IcX size={12}/></button>
                      </div>
                    </div>
                    <div style={{ fontSize:12, color:T.t1, whiteSpace:"pre-wrap" }}>{n.content}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:460, maxWidth:"94vw", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)", overflow:"hidden" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Edit User</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{company.name}</div>
              </div>
              <button onClick={() => setEditUser(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
              <InputField label="Name" value={editUser.name} onChange={v => setEditUser({ ...editUser, name:v })} placeholder="Full name"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <InputField label="Login Mobile" value={editUser.phone} onChange={v => setEditUser({ ...editUser, phone:v.replace(/\D/g,"").slice(0,10) })} placeholder="10-digit mobile"/>
                <SelectField label="Role" value={editUser.role} onChange={v => setEditUser({ ...editUser, role:v })}
                  options={(() => {
                    const base = [
                      { value:"admin", label:"Admin" },
                      { value:"project_manager", label:"Project Manager" },
                      { value:"supervisor", label:"Site Supervisor" },
                      { value:"accountant", label:"Accountant" },
                      { value:"viewer", label:"Viewer" },
                    ];
                    return base.some(o => o.value === editUser.role) ? base : [{ value:editUser.role, label:(editUser.role||"—")+" (current)" }, ...base];
                  })()}/>
              </div>
              <InputField label="Email (reference)" value={editUser.email} onChange={v => setEditUser({ ...editUser, email:v })} placeholder="name@example.com"/>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"4px 2px" }}>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:600, color:T.t1 }}>Account Active</div>
                  <div style={{ fontSize:10.5, color:T.t4 }}>Inactive users can't log in</div>
                </div>
                <Toggle value={editUser.is_active} onChange={v => setEditUser({ ...editUser, is_active:v })}/>
              </div>
              <div style={{ padding:"9px 13px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11, color:T.amb }}>
                Login is <strong>mobile + password</strong>. To hand a fresh password, use <strong>Reset password</strong> (🔒) on the user row.
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setEditUser(null)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn onClick={saveUser} disabled={savingUser} style={{ flex:2 }}>{savingUser ? "Saving..." : "Save Changes"}</Btn>
            </div>
          </div>
        </>
      )}

      {/* New-credentials Modal (after a user password reset) */}
      {newCreds && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, backdropFilter:"blur(3px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:440, maxWidth:"94vw", background:T.surface, borderRadius:16, zIndex:501, boxShadow:"0 24px 64px rgba(0,0,0,0.3)", overflow:"hidden" }}>
            <div style={{ padding:"20px 22px", background:"linear-gradient(135deg, #059669, #10B981)", textAlign:"center" }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                <IcChk size={24} color="white"/>
              </div>
              <div style={{ fontSize:17, fontWeight:800, color:"white" }}>New Password</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginTop:4 }}>Share these with {newCreds.name || "the user"}</div>
            </div>
            <div style={{ padding:"24px 22px" }}>
              <div style={{ background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 18px", marginBottom:16 }}>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>Login Mobile</div>
                  <div style={{ fontSize:16, fontWeight:800, color:T.blu, fontFamily:"monospace", letterSpacing:"0.5px" }}>{newCreds.mobile || "— (set a mobile via Edit)"}</div>
                  {newCreds.email && <div style={{ fontSize:10.5, color:T.t4, marginTop:3 }}>Email (reference): {newCreds.email}</div>}
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>New Password</div>
                  <div style={{ fontSize:18, fontWeight:800, color:T.t1, fontFamily:"monospace", letterSpacing:"1px", background:T.ambL, padding:"8px 12px", borderRadius:6, border:`1px solid ${T.ambM}` }}>{newCreds.password}</div>
                </div>
              </div>
              <div style={{ padding:"10px 14px", background:T.redL, border:`1px solid ${T.redM}`, borderRadius:8, fontSize:11, color:T.red, marginBottom:16 }}>
                <strong>Shown once!</strong> Copy it now. The user must change it after first login.
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn variant="outline" style={{ flex:1 }} onClick={() => {
                  navigator.clipboard.writeText(`Login Mobile: ${newCreds.mobile || ""}\nPassword: ${newCreds.password}\nLogin with mobile + password.`);
                  setToast({ msg:"Credentials copied!", type:"success" });
                }}><IcClip size={13}/> Copy</Btn>
                <Btn style={{ flex:1 }} onClick={() => setNewCreds(null)}>Done</Btn>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TAB: ANALYTICS (Phase 5) — cohort, churn, adoption, revenue
// ════════════════════════════════════════════════════════════════════════
function TabAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch("/saas-admin/analytics").then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.t3, fontSize:13 }}>Loading analytics...</div>;
  if (!data) return <div style={{ padding:60, textAlign:"center", color:T.red, fontSize:13 }}>Failed to load</div>;

  const { cohorts, mrr_growth, churned_mrr, churn_metrics, churn_predictions, adoption, revenue, funnel } = data;

  // Heatmap color by retention %
  const retColor = (pct) => {
    if (pct >= 80) return T.grn;
    if (pct >= 60) return "#34D399";
    if (pct >= 40) return T.amb;
    if (pct >= 20) return "#FB923C";
    if (pct > 0)   return T.red;
    return T.b1;
  };

  // Funnel pct
  const funnelPct = (n) => funnel.signups > 0 ? Math.round((n / funnel.signups) * 100) : 0;

  return (
    <div style={{ padding:"20px 24px" }}>
      <PageHeader title="Analytics" sub="Cohort analysis, churn prediction & feature adoption" right={
        <Btn onClick={load} variant="outline"><IcRefresh size={13}/> Refresh</Btn>
      }/>

      {/* Revenue KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:20 }}>
        <StatCard label="Total Revenue"   value={"₹" + fmtMoney(revenue.total)} sub="All-time paid"  color={T.grn} Icon={IcDollar}/>
        <StatCard label="MRR"             value={"₹" + fmtMoney(revenue.mrr)}   sub="Monthly recurring" color={T.blu} Icon={IcTrend}/>
        <StatCard label="ARR"             value={"₹" + fmtMoney(revenue.arr)}   sub="Annualized"    color={T.pur} Icon={IcDollar}/>
        <StatCard label="Avg Deal"        value={"₹" + fmtMoney(revenue.avg_deal)} sub="Per subscription" color={T.cyn} Icon={IcDollar}/>
        <StatCard label="Monthly Churn"   value={churn_metrics.monthly_churn + "%"} sub={`${churn_metrics.churned_this_month} churned`} color={churn_metrics.monthly_churn > 5 ? T.red : T.grn} Icon={IcActivity}/>
      </div>

      {/* Conversion funnel */}
      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px", marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:14 }}>Conversion Funnel</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {[
            { l:"Signups",        v: funnel.signups,       color:T.slt },
            { l:"Activated",      v: funnel.activated,     color:T.blu, hint:"At least 1 login" },
            { l:"Trial → Paid",   v: funnel.trial_to_paid, color:T.pur, hint:"Converted trials" },
            { l:"Paying",         v: funnel.paying,        color:T.grn, hint:"Active paid subs" },
          ].map((f, i) => (
            <div key={i} style={{ padding:"14px 16px", background:f.color + "12", border:`1px solid ${f.color}30`, borderRadius:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:f.color, textTransform:"uppercase", marginBottom:6 }}>{f.l}</div>
              <div style={{ fontSize:24, fontWeight:800, color:T.t1 }}>{fmtNum(f.v)}</div>
              <div style={{ fontSize:11, color:T.t4, marginTop:2 }}>{funnelPct(f.v)}% of signups{f.hint ? " · " + f.hint : ""}</div>
              <div style={{ height:5, background:T.b1, borderRadius:3, marginTop:8, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${funnelPct(f.v)}%`, background:f.color }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cohort retention heatmap */}
      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden", marginBottom:20 }}>
        <div style={{ padding:"11px 16px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}`, fontSize:13, fontWeight:700, color:T.t1 }}>
          Cohort Retention (% of signups still active by month)
        </div>
        <div style={{ padding:"14px 16px", overflowX:"auto" }}>
          {cohorts.length === 0 ? <div style={{ color:T.t4, fontSize:12, textAlign:"center", padding:20 }}>Not enough data yet</div> : (
            <table style={{ borderCollapse:"collapse", width:"100%", minWidth:600 }}>
              <thead>
                <tr>
                  <th style={{ textAlign:"left", padding:"6px 8px", fontSize:11, fontWeight:700, color:T.t3, borderBottom:`1px solid ${T.b1}` }}>Cohort</th>
                  <th style={{ textAlign:"center", padding:"6px 8px", fontSize:11, fontWeight:700, color:T.t3, borderBottom:`1px solid ${T.b1}` }}>Size</th>
                  {[0,1,2,3,4,5].map(m => (
                    <th key={m} style={{ textAlign:"center", padding:"6px 8px", fontSize:11, fontWeight:700, color:T.t3, borderBottom:`1px solid ${T.b1}` }}>M{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c, i) => (
                  <tr key={i}>
                    <td style={{ padding:"7px 8px", fontSize:11, fontWeight:600, color:T.t1 }}>{c.cohort}</td>
                    <td style={{ padding:"7px 8px", fontSize:11, color:T.t3, textAlign:"center" }}>{c.size}</td>
                    {[0,1,2,3,4,5].map(m => {
                      const cell = c.retention.find(r => r.month === m);
                      const pct = cell?.pct || 0;
                      return (
                        <td key={m} style={{ padding:4, textAlign:"center" }}>
                          <div style={{ padding:"6px 0", background: retColor(pct), color: pct >= 40 ? "white" : T.t3, borderRadius:5, fontSize:10, fontWeight:700 }}>
                            {pct > 0 ? pct + "%" : "—"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MRR growth + Feature adoption */}
      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:16, marginBottom:20 }}>
        {/* MRR net growth */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}`, fontSize:13, fontWeight:700, color:T.t1 }}>
            MRR: New vs Churned (6 months)
          </div>
          <div style={{ padding:"16px" }}>
            {mrr_growth.length === 0 ? <div style={{ color:T.t4, fontSize:12, textAlign:"center", padding:20 }}>No subscription data yet</div> : (
              <div style={{ display:"flex", alignItems:"flex-end", gap:12, height:160 }}>
                {mrr_growth.map((g, i) => {
                  const churned = churned_mrr.find(c => c.month === g.month);
                  const churnedVal = parseFloat(churned?.churned_mrr || 0);
                  const newVal = parseFloat(g.new_mrr) || 0;
                  const max = Math.max(...mrr_growth.map(x => parseFloat(x.new_mrr)||0), ...churned_mrr.map(x => parseFloat(x.churned_mrr)||0), 1);
                  return (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:T.grn }}>+₹{fmtMoney(newVal)}</div>
                      <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:2 }}>
                        <div style={{ width:"100%", height:`${(newVal/max)*70}px`, minHeight:6, background:T.grn, borderRadius:"3px 3px 0 0" }}/>
                        {churnedVal > 0 && <div style={{ width:"100%", height:`${(churnedVal/max)*70}px`, minHeight:6, background:T.red, borderRadius:"0 0 3px 3px" }}/>}
                      </div>
                      {churnedVal > 0 && <div style={{ fontSize:10, fontWeight:700, color:T.red }}>-₹{fmtMoney(churnedVal)}</div>}
                      <div style={{ fontSize:9, color:T.t4, marginTop:4 }}>{g.month.split("-")[1]}/{g.month.split("-")[0].slice(2)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Feature adoption */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}`, fontSize:13, fontWeight:700, color:T.t1 }}>
            Feature Adoption
          </div>
          <div style={{ padding:"14px 16px", maxHeight:260, overflowY:"auto" }}>
            {adoption.length === 0 && <div style={{ color:T.t4, fontSize:12, textAlign:"center", padding:20 }}>No modules configured</div>}
            {adoption.map((m, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:95, fontSize:11.5, color:T.t2, fontWeight:500, textTransform:"capitalize" }}>{m.module}</div>
                <div style={{ flex:1, height:8, background:T.b1, borderRadius:4, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${m.pct}%`, background: m.pct >= 60 ? T.grn : m.pct >= 30 ? T.amb : T.red, borderRadius:4 }}/>
                </div>
                <div style={{ width:40, fontSize:11, fontWeight:700, color:T.t1, textAlign:"right" }}>{m.pct}%</div>
                <div style={{ width:38, fontSize:10, color:T.t4, textAlign:"right" }}>{m.enabled}/{m.total}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Churn predictions */}
      <div style={{ background:T.surface, border:`1px solid ${T.redM}`, borderRadius:10, overflow:"hidden" }}>
        <div style={{ padding:"11px 16px", background:T.redL, borderBottom:`1px solid ${T.redM}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:13, fontWeight:700, color:T.red }}>🔮 Churn Predictions (health &lt; 50)</span>
          <span style={{ fontSize:11, color:T.red, fontWeight:600 }}>{churn_predictions.length} at risk</span>
        </div>
        <div style={{ maxHeight:300, overflowY:"auto" }}>
          {churn_predictions.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No predicted churns ✓</div>}
          {churn_predictions.map((c, i) => {
            const daysSince = c.last_login ? Math.floor((Date.now() - new Date(c.last_login)) / 86400000) : null;
            const risk = c.health_score < 25 ? "Very High" : c.health_score < 40 ? "High" : "Medium";
            const riskColor = c.health_score < 25 ? T.red : c.health_score < 40 ? T.amb : T.blu;
            return (
              <div key={i} style={{ padding:"10px 16px", borderBottom:`1px solid ${T.b1}`, display:"grid", gridTemplateColumns:"2fr 1fr 1fr 100px 70px", gap:10, alignItems:"center" }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                <div style={{ fontSize:11, color:T.t3 }}>Sub ends: {c.sub_end ? fmtDate(c.sub_end) : "—"}</div>
                <div style={{ fontSize:11, color:T.t3 }}>{daysSince != null ? daysSince + "d since login" : "Never logged in"}</div>
                <div><Badge text={risk + " risk"} color={riskColor}/></div>
                <div style={{ fontSize:14, fontWeight:800, color:riskColor, textAlign:"right" }}>{c.health_score}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TAB: CRM & HEALTH (Phase 4) — health alerts, auto-emails, scheduler
// ════════════════════════════════════════════════════════════════════════
function TabCRMHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => {
    setLoading(true);
    apiFetch("/saas-admin/crm-dashboard").then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const runScheduler = async () => {
    setRunning(true);
    const res = await apiFetch("/saas-admin/scheduler/run", { method:"POST" });
    setRunning(false);
    if (res.success) {
      setToast({ msg:`Scheduler done: ${res.data.checked} checked · ${res.data.emails_queued} emails · ${res.data.alerts} alerts`, type:"success" });
      load();
    } else setToast({ msg:"Scheduler failed", type:"error" });
  };

  const flushEmails = async () => {
    setRunning(true);
    const res = await apiFetch("/saas-admin/email-queue/flush", { method:"POST" });
    setRunning(false);
    if (res.success) {
      setToast({ msg: res.data.reason === "no_smtp" ? "SMTP not configured — emails stay queued" : `Flushed: ${res.data.sent} sent, ${res.data.failed} failed`, type: res.data.reason === "no_smtp" ? "error" : "success" });
      load();
    }
  };

  const toggleAutoEmails = async () => {
    const newVal = data.settings.auto_emails_enabled === "1" ? 0 : 1;
    await apiFetch("/saas-admin/platform-settings", { method:"PUT", body:{ auto_emails_enabled: newVal } });
    load();
  };

  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.t3, fontSize:13 }}>Loading CRM dashboard...</div>;
  if (!data) return <div style={{ padding:60, textAlign:"center", color:T.red, fontSize:13 }}>Failed to load</div>;

  const { distribution, at_risk_companies, email_stats, recent_emails, system_alerts, last_scheduler_run, settings, smtp_configured } = data;
  const total = distribution.healthy + distribution.medium + distribution.at_risk;
  const pct = n => total > 0 ? Math.round((n / total) * 100) : 0;
  const autoOn = settings.auto_emails_enabled === "1";

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      <PageHeader title="CRM & Customer Health" sub={`${total} active companies · Avg score: ${distribution.avg_score}/100`} right={
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={flushEmails} variant="outline" disabled={running}>{running ? "..." : "Flush Emails"}</Btn>
          <Btn onClick={runScheduler} disabled={running}>{running ? "Running..." : "Run Now"}</Btn>
        </div>
      }/>

      {!smtp_configured && (
        <div style={{ padding:"10px 14px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb, marginBottom:16 }}>
          <strong>SMTP not configured.</strong> Set <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, <code>SMTP_FROM</code> env vars on Railway to enable actual email sending. Emails are being queued safely until then.
        </div>
      )}

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:20 }}>
        <StatCard label="Avg Health"  value={distribution.avg_score + "/100"} sub="Platform average" color={distribution.avg_score >= 75 ? T.grn : distribution.avg_score >= 50 ? T.amb : T.red} Icon={IcShield}/>
        <StatCard label="Healthy"     value={fmtNum(distribution.healthy)}    sub={pct(distribution.healthy) + "%"} color={T.grn} Icon={IcChk}/>
        <StatCard label="Medium"      value={fmtNum(distribution.medium)}     sub={pct(distribution.medium) + "%"}  color={T.amb} Icon={IcActivity}/>
        <StatCard label="At Risk"     value={fmtNum(distribution.at_risk)}    sub={pct(distribution.at_risk) + "%"} color={T.red} Icon={IcX}/>
        <StatCard label="Emails"      value={fmtNum(email_stats.queued + email_stats.sent)} sub={`${email_stats.sent} sent, ${email_stats.queued} queued`} color={T.blu} Icon={IcActivity}/>
      </div>

      {/* Health distribution bar */}
      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px", marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:12 }}>Health Distribution</div>
        {total === 0 ? <div style={{ fontSize:12, color:T.t4 }}>No companies yet</div> : (
          <>
            <div style={{ display:"flex", height:26, borderRadius:8, overflow:"hidden", border:`1px solid ${T.b1}` }}>
              {distribution.healthy > 0 && <div style={{ flex:distribution.healthy, background:T.grn, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:11, fontWeight:700 }}>{pct(distribution.healthy)}%</div>}
              {distribution.medium > 0 &&  <div style={{ flex:distribution.medium,  background:T.amb, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:11, fontWeight:700 }}>{pct(distribution.medium)}%</div>}
              {distribution.at_risk > 0 && <div style={{ flex:distribution.at_risk, background:T.red, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:11, fontWeight:700 }}>{pct(distribution.at_risk)}%</div>}
            </div>
            <div style={{ display:"flex", gap:16, marginTop:10, fontSize:11, color:T.t3 }}>
              <span><span style={{ display:"inline-block", width:10, height:10, background:T.grn, borderRadius:2, marginRight:5 }}/>Healthy (75+)</span>
              <span><span style={{ display:"inline-block", width:10, height:10, background:T.amb, borderRadius:2, marginRight:5 }}/>Medium (50-74)</span>
              <span><span style={{ display:"inline-block", width:10, height:10, background:T.red, borderRadius:2, marginRight:5 }}/>At Risk (&lt;50)</span>
            </div>
          </>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        {/* At-risk companies */}
        <div style={{ background:T.surface, border:`1px solid ${T.redM}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", background:T.redL, borderBottom:`1px solid ${T.redM}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.red }}>⚠️ At-Risk Customers</span>
            <span style={{ fontSize:11, color:T.red, fontWeight:600 }}>{at_risk_companies.length} need attention</span>
          </div>
          <div style={{ maxHeight:320, overflowY:"auto" }}>
            {at_risk_companies.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>All customers are healthy ✓</div>}
            {at_risk_companies.map((c, i) => (
              <div key={i} style={{ padding:"10px 16px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize:10, color:T.t4 }}>{c.plan_name || "No plan"} · Last login: {c.last_login ? new Date(c.last_login).toLocaleDateString("en-IN") : "Never"}</div>
                </div>
                <div style={{ fontSize:16, fontWeight:800, color:T.red, marginLeft:10 }}>{c.health_score}</div>
              </div>
            ))}
          </div>
        </div>

        {/* System alerts */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}` }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>🤖 Auto-Generated Alerts</span>
          </div>
          <div style={{ maxHeight:320, overflowY:"auto" }}>
            {system_alerts.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No system alerts yet</div>}
            {system_alerts.map((a, i) => (
              <div key={i} style={{ padding:"10px 16px", borderBottom:`1px solid ${T.b1}` }}>
                <div style={{ fontSize:11.5, color:T.t1, marginBottom:3 }}>{a.content}</div>
                <div style={{ fontSize:10, color:T.t4 }}>{a.company_name} · {fmtDateTime(a.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Email queue */}
      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden", marginBottom:20 }}>
        <div style={{ padding:"11px 16px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>📧 Recent Email Queue</span>
          <div style={{ display:"flex", gap:8, fontSize:10 }}>
            <Badge text={`Queued: ${email_stats.queued}`} color={T.amb}/>
            <Badge text={`Sent: ${email_stats.sent}`} color={T.grn}/>
            {email_stats.failed > 0 && <Badge text={`Failed: ${email_stats.failed}`} color={T.red}/>}
          </div>
        </div>
        <div style={{ maxHeight:280, overflowY:"auto" }}>
          {recent_emails.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No emails queued yet. Scheduler runs every 6 hours.</div>}
          {recent_emails.map((e, i) => (
            <div key={i} style={{ padding:"10px 16px", borderBottom:`1px solid ${T.b1}`, display:"grid", gridTemplateColumns:"2fr 2fr 1fr 100px 120px", gap:10, alignItems:"center" }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.subject}</div>
              <div style={{ fontSize:11, color:T.t3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.to_email}</div>
              <div style={{ fontSize:10, color:T.t4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.company_name || "—"}</div>
              <div><Badge text={e.email_type} color={T.pur}/></div>
              <div><Badge text={e.status} color={e.status === "sent" ? T.grn : e.status === "failed" ? T.red : T.amb}/></div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings + scheduler status */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:12 }}>Auto-Email Settings</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${T.b1}` }}>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:T.t1 }}>Auto-emails enabled</div>
              <div style={{ fontSize:10, color:T.t4 }}>Trial day 3/7/14 + renewal reminders</div>
            </div>
            <button onClick={toggleAutoEmails}
              style={{ width:42, height:24, borderRadius:12, border:"none", cursor:"pointer",
                background: autoOn ? T.grn : T.b2, position:"relative", transition:"background 0.2s" }}>
              <div style={{ position:"absolute", width:18, height:18, borderRadius:"50%", background:"white", top:3, left: autoOn ? 21 : 3, transition:"left 0.2s" }}/>
            </button>
          </div>
          <div style={{ padding:"10px 0", fontSize:11, color:T.t3 }}>
            <strong>Health alert threshold:</strong> {settings.health_alert_threshold}/100
          </div>
        </div>

        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:12 }}>Scheduler Status</div>
          <div style={{ fontSize:11, color:T.t3, marginBottom:6 }}>
            <strong>Last run:</strong> {last_scheduler_run ? new Date(last_scheduler_run).toLocaleString("en-IN") : "Never"}
          </div>
          <div style={{ fontSize:11, color:T.t3, marginBottom:6 }}>
            <strong>Frequency:</strong> Every 6 hours (auto)
          </div>
          <div style={{ fontSize:11, color:T.t3 }}>
            <strong>SMTP:</strong> <span style={{ color: smtp_configured ? T.grn : T.red, fontWeight:700 }}>{smtp_configured ? "Configured ✓" : "Not configured"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TAB: FEATURE REQUESTS (Phase 3) — Kanban board
// ════════════════════════════════════════════════════════════════════════
function TabFeatureRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [edit, setEdit] = useState(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const load = () => {
    setLoading(true);
    apiFetch("/saas-admin/feature-requests").then(res => {
      if (res.success) setRows(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const COLUMNS = [
    { id:"new",             label:"New",             color:T.slt, bg:T.sltL },
    { id:"under_review",    label:"Under Review",    color:T.pur, bg:T.purL },
    { id:"planned",         label:"Planned",         color:T.cyn, bg:T.cynL },
    { id:"in_development",  label:"In Development",  color:T.blu, bg:T.bluL },
    { id:"shipped",         label:"Shipped",         color:T.grn, bg:T.grnL },
  ];

  const filtered = rows.filter(r => {
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (r.title||"").toLowerCase().includes(s)
          || (r.company_name||"").toLowerCase().includes(s)
          || (r.user_name||"").toLowerCase().includes(s);
    }
    return true;
  });

  const moveStatus = async (id, newStatus) => {
    const res = await apiFetch("/saas-admin/feature-requests/" + id, { method:"PUT", body:{ status: newStatus } });
    if (res.success) { setToast({ msg:"Status updated", type:"success" }); load(); }
    else setToast({ msg:"Update failed", type:"error" });
  };

  const saveEdit = async () => {
    const res = await apiFetch("/saas-admin/feature-requests/" + edit.id, {
      method:"PUT",
      body: { status: edit.status, priority: edit.priority, admin_notes: edit.admin_notes }
    });
    if (res.success) { setEdit(null); load(); setToast({ msg:"Request updated", type:"success" }); }
    else setToast({ msg:"Update failed", type:"error" });
  };

  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.t3, fontSize:13 }}>Loading feature requests...</div>;

  const priorityColor = p => ({ critical:T.red, high:T.amb, medium:T.blu, low:T.slt }[p] || T.slt);
  const rejectedCount = rows.filter(r => r.status === "rejected").length;

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      <PageHeader title="Feature Requests" sub={`${rows.length} requests from ${new Set(rows.map(r=>r.company_id)).size} companies`} right={
        <Btn onClick={load} variant="outline"><IcRefresh size={13}/> Refresh</Btn>
      }/>

      {/* Filters */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        {["all","critical","high","medium","low"].map(p => (
          <button key={p} onClick={() => setPriorityFilter(p)}
            style={{ padding:"5px 14px", borderRadius:20, fontSize:11, fontWeight: priorityFilter===p ? 700 : 500, border:`1px solid ${priorityFilter===p ? T.blu : T.b1}`,
              background: priorityFilter===p ? T.bluL : T.surface, color: priorityFilter===p ? T.blu : T.t3, cursor:"pointer", textTransform:"capitalize", fontFamily:"inherit" }}>
            {p}
          </button>
        ))}
        <div style={{ flex:1 }}/>
        <div style={{ position:"relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests..."
            style={{ width:240, padding:"7px 12px 7px 30px", borderRadius:8, border:`1px solid ${T.b1}`, fontSize:12, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit" }}/>
          <IcSearch size={12} color={T.t4} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
        </div>
      </div>

      {/* Kanban board */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:10, marginBottom:16 }}>
        {COLUMNS.map(col => {
          const colRows = filtered.filter(r => r.status === col.id);
          return (
            <div key={col.id} style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 280px)" }}>
              <div style={{ padding:"10px 14px", borderBottom:`2px solid ${col.color}`, background:col.bg, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, fontWeight:700, color:col.color }}>{col.label}</span>
                <span style={{ fontSize:11, fontWeight:700, color:col.color, background:"white", padding:"2px 8px", borderRadius:10 }}>{colRows.length}</span>
              </div>
              <div style={{ padding:"8px", overflowY:"auto", flex:1 }}>
                {colRows.length === 0 && <div style={{ fontSize:11, color:T.t4, textAlign:"center", padding:"20px 0" }}>—</div>}
                {colRows.map(r => (
                  <div key={r.id} onClick={() => setEdit({ ...r })}
                    style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:8, padding:"10px 12px", marginBottom:7, cursor:"pointer", transition:"all 0.15s", borderLeft:`3px solid ${priorityColor(r.priority)}` }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.t1, marginBottom:4, lineHeight:1.3 }}>{r.title}</div>
                    <div style={{ fontSize:10, color:T.t3, marginBottom:6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.company_name}</div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:4 }}>
                      <Badge text={r.priority} color={priorityColor(r.priority)}/>
                      {r.module && <span style={{ fontSize:9, color:T.t4, textTransform:"capitalize" }}>{r.module}</span>}
                    </div>
                    <div style={{ fontSize:9, color:T.t4, marginTop:5 }}>by {r.user_name} · {fmtDate(r.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {rejectedCount > 0 && (
        <div style={{ fontSize:11, color:T.t4, textAlign:"center" }}>+ {rejectedCount} rejected request{rejectedCount !== 1 ? "s" : ""} (use search to filter)</div>
      )}

      {/* Edit modal */}
      {edit && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:560, maxHeight:"85vh", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)", overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"white" }}>{edit.title}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", marginTop:2 }}>
                  from {edit.company_name} · {edit.user_name} · {fmtDateTime(edit.created_at)}
                </div>
              </div>
              <button onClick={() => setEdit(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex" }}><IcX size={16}/></button>
            </div>

            <div style={{ padding:"20px 22px", overflowY:"auto", flex:1 }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:5 }}>Description</div>
                <div style={{ fontSize:12.5, color:T.t1, whiteSpace:"pre-wrap", padding:"10px 12px", background:T.surfaceB, borderRadius:8, border:`1px solid ${T.b1}` }}>
                  {edit.description || <em style={{ color:T.t4 }}>No description</em>}
                </div>
              </div>

              {edit.module && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:5 }}>Module</div>
                  <Badge text={edit.module} color={T.pur}/>
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:5 }}>Status</div>
                  <select value={edit.status} onChange={e => setEdit({ ...edit, status:e.target.value })}
                    style={{ width:"100%", padding:"8px 10px", border:`1px solid ${T.b1}`, borderRadius:8, fontSize:12, background:T.surface, color:T.t1, fontFamily:"inherit", outline:"none" }}>
                    <option value="new">New</option>
                    <option value="under_review">Under Review</option>
                    <option value="planned">Planned</option>
                    <option value="in_development">In Development</option>
                    <option value="shipped">Shipped</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:5 }}>Priority</div>
                  <select value={edit.priority} onChange={e => setEdit({ ...edit, priority:e.target.value })}
                    style={{ width:"100%", padding:"8px 10px", border:`1px solid ${T.b1}`, borderRadius:8, fontSize:12, background:T.surface, color:T.t1, fontFamily:"inherit", outline:"none" }}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:5 }}>Admin Notes (internal)</div>
                <textarea value={edit.admin_notes || ""} onChange={e => setEdit({ ...edit, admin_notes:e.target.value })}
                  placeholder="Internal notes, ETA, assigned dev, technical considerations..."
                  style={{ width:"100%", minHeight:90, padding:"10px 12px", border:`1px solid ${T.b1}`, borderRadius:8, fontSize:12, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
              </div>
            </div>

            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setEdit(null)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn onClick={saveEdit} style={{ flex:2 }}>Save Changes</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TAB: SANCHALAN — Internal / Testing companies
// ════════════════════════════════════════════════════════════════════════
function TabSanchalan({ onOpenDetail }) {
  const [data, setData]       = useState({ companies: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [allCompanies, setAllCompanies] = useState([]);
  const [addId, setAddId]     = useState("");
  const [addLabel, setAddLabel] = useState("Sanchalan Construction");
  // ── Demo templates (scenario-based seeders) ─────────────────────
  const [tplTarget, setTplTarget] = useState(null);      // company to apply template to
  const [templates, setTemplates] = useState([]);        // list of available templates
  const [selectedTpl, setSelectedTpl] = useState(null);  // chosen template id
  const [applyingTpl, setApplyingTpl] = useState(false);
  const [tplSearch, setTplSearch] = useState("");        // filter templates

  const openTemplatePicker = async (c) => {
    setTplTarget(c);
    setSelectedTpl(null);
    setTplSearch("");
    try {
      const r = await apiFetch("/saas-admin/sanchalan/templates");
      if (r.success) {
        const list = r.data || [];
        setTemplates(list);
        // Pre-select the recommended flagship so apply is often one click
        const rec = list.find(t => (t.tags || []).includes("flagship") || t.id === "full-flash-showcase");
        if (rec) setSelectedTpl(rec.id);
      }
    } catch(_) { setTemplates([]); }
  };

  const applyTemplate = async (forceId) => {
    // forceId (from double-click) wins; ignore non-string (e.g. a click event from the footer button)
    const tplId = (typeof forceId === "string" ? forceId : null) || selectedTpl;
    if (!tplTarget || !tplId || applyingTpl) return;
    const tpl = templates.find(t => t.id === tplId);
    if (tpl?.status === "stub") {
      setToast({ msg: "This template is coming soon. Pick a full template.", type: "error" });
      return;
    }
    if (!await window.confirmAsync(`Apply "${tpl?.name}" to ${tplTarget.name}?\n\nPrevious DEMO data (if any) will be wiped first. Real data stays.\n\nContinue?`)) return;
    setApplyingTpl(true);
    const r = await apiFetch("/saas-admin/sanchalan/companies/" + tplTarget.id + "/apply-template", {
      method: "POST",
      body: { template_id: tplId, wipe: true },
    });
    setApplyingTpl(false);
    if (r.success) {
      const c = r.data?.result?.counts || {};
      const summary = Object.entries(c).map(([k,v]) => `${v} ${k}`).join(", ");
      setToast({ msg: `Template applied: ${summary || "done"}`, type: "success" });
      setTplTarget(null);
      setSelectedTpl(null);
      load();
    } else {
      setToast({ msg: r.message || "Apply failed", type: "error" });
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/saas-admin/sanchalan").then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = async () => {
    try {
      const r = await apiFetch("/saas-admin/companies");
      if (r.success) setAllCompanies(r.data);
    } catch(_) {}
    setShowAdd(true);
  };

  const handleMark = async (id, label) => {
    const r = await apiFetch("/saas-admin/companies/" + id + "/toggle-internal", {
      method: "PUT",
      body: { is_internal: true, internal_label: label },
    });
    if (r.success) {
      setToast({ msg: r.message, type: "success" });
      setShowAdd(false);
      setAddId("");
      load();
    } else {
      setToast({ msg: r.message || "Failed", type: "error" });
    }
  };

  const runFactoryReset = async (c) => {
    if (!await window.confirmAsync(`⚠️ FACTORY RESET "${c.name}"?\n\nThis will delete ALL operational data — projects, finance, CRM, procurement, warehouse, payroll, tasks — real and demo both. Company login, users, subscription stay intact.\n\nThis cannot be undone. Continue?`)) return;
    const r = await apiFetch("/saas-admin/sanchalan/" + c.id + "/factory-reset", { method: "POST" });
    if (r.success) {
      setToast({ msg: r.message, type: "success" });
      load();
    } else {
      setToast({ msg: r.message || "Reset failed", type: "error" });
    }
  };

  const handleUnmark = async (id, name) => {
    if (!await window.confirmAsync(`Move "${name}" back to regular customers list?`)) return;
    const r = await apiFetch("/saas-admin/companies/" + id + "/toggle-internal", {
      method: "PUT",
      body: { is_internal: false },
    });
    if (r.success) {
      setToast({ msg: r.message, type: "success" });
      load();
    } else {
      setToast({ msg: r.message || "Failed", type: "error" });
    }
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:T.t3 }}>Loading Sanchalan data…</div>;

  const stats = data.stats || {};
  const companies = data.companies || [];

  // Group by internal_label
  const grouped = {};
  companies.forEach(c => {
    const k = c.internal_label || "Sanchalan (Internal)";
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(c);
  });

  return (
    <div style={{ padding:24 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      {/* Header banner */}
      <div style={{ background:"linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", borderRadius:12, padding:"20px 24px", color:"white", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-0.3px", marginBottom:4 }}>Sanchalan — Internal &amp; Testing</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)" }}>Our own domains used for feature development and QA. Hidden from all main dashboards, analytics, CRM &amp; metrics.</div>
        </div>
        <Btn onClick={openAdd} color="#FFFFFF" variant="secondary" style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"1px solid rgba(255,255,255,0.4)" }}>+ Mark company as internal</Btn>
      </div>

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14, marginBottom:20 }}>
        <StatCard label="Internal Companies" value={fmtNum(stats.total)}        sub={`${stats.active || 0} active`}   color={T.pur} Icon={IcBuilding}/>
        <StatCard label="Internal Users"     value={fmtNum(stats.total_users)}  sub="Across all internal"             color={T.blu} Icon={IcUsers}/>
        <StatCard label="Internal Projects"  value={fmtNum(stats.total_projects)} sub="Active only"                   color={T.grn} Icon={IcClip}/>
        <StatCard label="Labels"             value={fmtNum(Object.keys(grouped).length)} sub="Brand groups"           color={T.cyn} Icon={IcShield}/>
      </div>

      {/* Grouped sections */}
      {Object.keys(grouped).length === 0 && (
        <div style={{ padding:"60px 20px", textAlign:"center", background:T.surface, border:`1px dashed ${T.b2}`, borderRadius:10 }}>
          <IcBuilding size={32} color={T.t4}/>
          <div style={{ marginTop:10, fontSize:13, color:T.t3 }}>No internal companies yet.</div>
          <div style={{ fontSize:11, color:T.t4, marginTop:4 }}>Mark any existing company as internal to move it here.</div>
        </div>
      )}

      {Object.entries(grouped).map(([label, list]) => (
        <div key={label} style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, marginBottom:16, overflow:"hidden" }}>
          <div style={{ padding:"12px 18px", background:T.purL, borderBottom:`1px solid ${T.purM}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.pur }}>{label}</div>
            <div style={{ fontSize:11, color:T.t3 }}>{list.length} {list.length === 1 ? "company" : "companies"}</div>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:T.surfaceB }}>
                <th style={th}>Name</th>
                <th style={th}>Slug</th>
                <th style={th}>Users</th>
                <th style={th}>Projects</th>
                <th style={th}>Last Login</th>
                <th style={th}>Status</th>
                <th style={th}>Created</th>
                <th style={{...th, textAlign:"right"}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.id} style={{ borderTop:`1px solid ${T.b1}`, transition:"background .12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.surfaceB}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={td}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:T.purL, color:T.pur, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, flexShrink:0 }}>{(c.name || "?").slice(0,1).toUpperCase()}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:700, color:T.t1 }}>{c.name}</div>
                        <div style={{ fontSize:10.5, color:T.t4 }}>{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={td}><code style={{ fontSize:11, color:T.t3, background:T.surfaceB, padding:"2px 7px", borderRadius:5 }}>{c.slug}</code></td>
                  <td style={td}><span style={{ fontWeight:700, color:T.t1 }}>{c.user_count}</span></td>
                  <td style={td}><span style={{ fontWeight:700, color:T.t1 }}>{c.project_count}</span></td>
                  <td style={td}>{c.last_login ? fmtDateTime(c.last_login) : <span style={{color:T.t4}}>never</span>}</td>
                  <td style={td}>{c.is_active ? <Badge text="ACTIVE" color={T.grn}/> : <Badge text="DISABLED" color={T.red}/>}</td>
                  <td style={td}>{fmtDate(c.created_at)}</td>
                  <td style={{...td, textAlign:"right"}}>
                    <div style={{ display:"inline-flex", gap:6, alignItems:"center", justifyContent:"flex-end", flexWrap:"wrap" }}>
                      <Btn onClick={() => openTemplatePicker(c)} color="#EC4899" style={{ padding:"6px 13px", fontSize:11, fontWeight:700, boxShadow:"0 2px 6px rgba(236,72,153,0.28)" }}>🎯 Apply Template</Btn>
                      <Btn onClick={() => onOpenDetail(c)} variant="secondary" style={{ padding:"6px 11px", fontSize:11 }}>Details</Btn>
                      <Btn onClick={() => runFactoryReset(c)} variant="secondary" color={T.red} style={{ padding:"6px 11px", fontSize:11 }}>Factory Reset</Btn>
                      <Btn onClick={() => handleUnmark(c.id, c.name)} variant="secondary" color={T.slt} style={{ padding:"6px 11px", fontSize:11 }}>Unmark</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ═══ Apply Template Modal ═══ */}
      {tplTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.65)", zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => !applyingTpl && setTplTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.surface, borderRadius:12, padding:0, width:640, maxHeight:"88vh", overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.35)", display:"flex", flexDirection:"column" }}>
            {/* Header */}
            <div style={{ background:"linear-gradient(135deg,#EC4899,#BE185D)", color:"white", padding:"18px 22px" }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.5px", opacity:0.85, marginBottom:3 }}>DEMO TEMPLATES</div>
              <div style={{ fontSize:16, fontWeight:800 }}>🎯 Apply scenario template to {tplTarget.name}</div>
              <div style={{ fontSize:11, opacity:0.9, marginTop:4 }}>Existing demo data will be wiped first. Real data is untouched.</div>
            </div>
            {/* Body */}
            <div style={{ padding:"14px 22px 16px", overflowY:"auto", flex:1 }}>
              {templates.length > 0 && (
                <input value={tplSearch} onChange={e => setTplSearch(e.target.value)}
                  placeholder="🔍 Search templates by name or tag…"
                  style={{ width:"100%", padding:"9px 12px", border:`1px solid ${T.b2}`, borderRadius:8, fontSize:12.5, marginBottom:12, boxSizing:"border-box", outline:"none" }}/>
              )}
              {templates.length === 0 && <div style={{ padding:40, textAlign:"center", color:T.t4, fontSize:12 }}>Loading templates…</div>}
              {(() => {
                const recId = templates.find(t => (t.tags||[]).includes("flagship") || t.id === "full-flash-showcase")?.id;
                const q = tplSearch.trim().toLowerCase();
                const visible = templates.filter(t => !q || (t.name||"").toLowerCase().includes(q) || (t.description||"").toLowerCase().includes(q) || (t.tags||[]).some(tg => tg.toLowerCase().includes(q)));
                if (templates.length > 0 && visible.length === 0) return <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No templates match "{tplSearch}"</div>;
                return visible.map(t => {
                  const isStub = t.status === "stub";
                  const isSelected = selectedTpl === t.id;
                  const isRec = t.id === recId;
                  return (
                    <div key={t.id}
                      onClick={() => !isStub && setSelectedTpl(t.id)}
                      onDoubleClick={() => { if (!isStub) { setSelectedTpl(t.id); applyTemplate(t.id); } }}
                      title={isStub ? "Coming soon" : "Click to select · double-click to apply"}
                      style={{
                        padding:"12px 14px", marginBottom:8, borderRadius:8,
                        border:`2px solid ${isSelected ? "#EC4899" : isRec ? "#F9A8D4" : "#E5E7EB"}`,
                        background:isSelected ? "#FDF2F8" : isStub ? "#F9FAFB" : "white",
                        cursor:isStub ? "not-allowed" : "pointer",
                        opacity:isStub ? 0.55 : 1,
                        transition:"all 0.15s",
                      }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:isSelected ? "#BE185D" : T.t1, marginBottom:3, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                            {t.name}
                            {isRec && <span style={{ background:"#FCE7F3", color:"#BE185D", fontSize:8.5, fontWeight:800, padding:"2px 7px", borderRadius:10, letterSpacing:".4px" }}>★ RECOMMENDED</span>}
                            {isStub && <span style={{ background:"#FEF3C7", color:"#92400E", fontSize:8.5, fontWeight:700, padding:"2px 6px", borderRadius:10, letterSpacing:".4px" }}>COMING SOON</span>}
                            {!isStub && <span style={{ background:"#D1FAE5", color:"#065F46", fontSize:8.5, fontWeight:700, padding:"2px 6px", borderRadius:10, letterSpacing:".4px" }}>READY</span>}
                          </div>
                          <div style={{ fontSize:11.5, color:T.t3, lineHeight:1.45, marginBottom:4 }}>{t.description}</div>
                          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                            {(t.tags || []).map(tg => (
                              <span key={tg} style={{ background:"#F3F4F6", color:"#6B7280", fontSize:9.5, fontWeight:600, padding:"2px 7px", borderRadius:4 }}>{tg}</span>
                            ))}
                          </div>
                        </div>
                        {isSelected && <div style={{ color:"#EC4899", fontSize:18 }}>✓</div>}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            {/* Footer */}
            <div style={{ padding:"14px 22px", borderTop:"1px solid #E5E7EB", background:"#F9FAFB", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:11, color:T.t3 }}>
                {selectedTpl ? <span>Selected: <b>{templates.find(t=>t.id===selectedTpl)?.name || ""}</b></span> : "Pick a template · double-click to apply instantly"}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn variant="secondary" onClick={() => setTplTarget(null)} disabled={applyingTpl}>Cancel</Btn>
                <Btn color="#EC4899" onClick={applyTemplate} disabled={!selectedTpl || applyingTpl}>
                  {applyingTpl ? "Applying…" : "🚀 Apply Template"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.surface, borderRadius:12, padding:24, width:460, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize:15, fontWeight:800, color:T.t1, marginBottom:4 }}>Mark company as internal</div>
            <div style={{ fontSize:11, color:T.t3, marginBottom:16 }}>Selected company will be hidden from all customer dashboards and moved to Sanchalan.</div>

            <div style={{ fontSize:11, fontWeight:700, color:T.t2, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Company</div>
            <select value={addId} onChange={e => setAddId(e.target.value)}
              style={{ width:"100%", padding:"10px 12px", border:`1px solid ${T.b2}`, borderRadius:8, fontSize:13, marginBottom:14 }}>
              <option value="">— Select —</option>
              {allCompanies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.slug})</option>)}
            </select>

            <div style={{ fontSize:11, fontWeight:700, color:T.t2, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Label / Brand Group</div>
            <input value={addLabel} onChange={e => setAddLabel(e.target.value)}
              placeholder="e.g. Sanchalan Construction"
              style={{ width:"100%", padding:"10px 12px", border:`1px solid ${T.b2}`, borderRadius:8, fontSize:13, marginBottom:18, boxSizing:"border-box" }}/>

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Btn>
              <Btn disabled={!addId} onClick={() => handleMark(addId, addLabel)} color={T.pur}>Mark as internal</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th = { padding:"10px 14px", textAlign:"left", fontSize:10.5, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px" };
const td = { padding:"11px 14px", color:T.t2 };

// ════════════════════════════════════════════════════════════════════════
// TAB: CLIENTS & BILLING
// Client = paying customer above companies. We sell users + companies +
// projects; limits are enforced hard at the creation APIs. Billing is a
// client-level subscription contract with an auto-issued quarterly invoice
// schedule — every value manually overridable from here.
// ════════════════════════════════════════════════════════════════════════
const fmtAmt = n => "₹" + (parseFloat(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const limitStr = (used, max) => `${fmtNum(used)} / ${max > 0 ? fmtNum(max) : "∞"}`;
const limitColor = (used, max) => (max > 0 && used >= max) ? T.red : (max > 0 && used >= max * 0.8) ? T.amb : T.t2;
const SUB_COLORS = { pending: T.amb, active: T.grn, suspended: T.red, expired: T.slt, cancelled: T.t4 };
const INV_COLORS = { scheduled: T.slt, issued: T.blu, paid: T.grn, cancelled: T.t4 };
const CYCLE_LABELS = { monthly: "Monthly", quarterly: "Quarterly", half_yearly: "Half-Yearly", yearly: "Yearly" };

// ── ONBOARD A NEW PAYING CUSTOMER ─────────────────────────────────────
// Client + subscription + first company in ONE submit. Previously these were
// two actions in two tabs, and forgetting the subscription silently produced a
// live-but-unbilled tenant. Deliberately NOT a step wizard — three fieldsets in
// one scrolling form, so nothing is hidden behind a "Next".
function NewCustomerModal({ onClose, onCreated, setToast }) {
  const [c, setC] = useState({ name:"", contact_person:"", phone:"", email:"", gstin:"", city:"", state:"",
                               max_companies:1, max_users:0, max_projects:0 });
  const [s, setS] = useState({ committed_users:30, base_annual_value:"", gst_rate:18,
                               billing_cycle:"quarterly", term_months:12, start_date:"",
                               order_ref:"", quotation_ref:"" });
  // Standard published rate card as the starting point — edit per deal
  const [slabs, setSlabs] = useState([
    { from_users:31,  to_users:50,  annual_rate_per_user:10000 },
    { from_users:51,  to_users:100, annual_rate_per_user:7000 },
    { from_users:101, to_users:"",  annual_rate_per_user:5000 },
  ]);
  const [co, setCo] = useState({ name:"", module_type:"construction_company",
                                 admin_name:"", admin_email:"", phone:"", city:"", state:"" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);   // success payload → credentials view

  const setSlab = (i, k, v) => setSlabs(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));

  const submit = async () => {
    if (!c.name.trim())        return setToast({ msg:"Client (paying customer) ka naam zaroori hai", type:"error" });
    if (!co.name.trim())       return setToast({ msg:"Company ka naam zaroori hai", type:"error" });
    if (!co.admin_name.trim() || !co.admin_email.trim() || !co.phone.trim())
      return setToast({ msg:"Admin ka naam, email aur mobile zaroori hai", type:"error" });
    if (!/^[6-9]\d{9}$/.test(co.phone.trim()))
      return setToast({ msg:"Admin mobile 10-digit hona chahiye — yahi login id hai", type:"error" });
    if (!s.base_annual_value)
      return setToast({ msg:"Annual value daalo — warna customer bill nahi hoga (BILLING GAP)", type:"error" });

    setSaving(true);
    const body = {
      client: c,
      subscription: { ...s, slabs: slabs.filter(x => x.from_users && x.annual_rate_per_user) },
      company: { ...co, admin_email: co.admin_email.trim() },
    };
    if (!body.subscription.start_date) delete body.subscription.start_date;
    const res = await apiFetch("/saas-admin/customers", { method:"POST", body });
    setSaving(false);
    // Deliberately do NOT refresh the list here. The parent's reload flips it to
    // a "Loading clients..." early-return, which unmounts this modal — and the
    // password is shown exactly once, so that would lose it. Refresh on close.
    if (res.success) setDone(res.data);
    else setToast({ msg: res.message || "Customer create nahi hua", type:"error" });
  };

  const finish = () => { onCreated(); onClose(); };

  // ── Success view: hand over the credentials once ──
  if (done) {
    return (
      <>
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, backdropFilter:"blur(3px)" }}/>
        <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:460, background:T.surface, borderRadius:16, zIndex:501, boxShadow:"0 24px 64px rgba(0,0,0,0.3)", overflow:"hidden" }}>
          <div style={{ padding:"20px 22px", background:"linear-gradient(135deg, #059669, #10B981)", textAlign:"center" }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
              <IcChk size={24} color="white"/>
            </div>
            <div style={{ fontSize:17, fontWeight:800, color:"white" }}>Customer Ready</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginTop:4 }}>
              {done.name} · subscription {done.subscription_status}
              {done.invoices_generated > 0 ? ` · ${done.invoices_generated} invoices scheduled` : ""}
            </div>
          </div>
          <div style={{ padding:"22px" }}>
            {done.subscription_status !== "active" && (
              <div style={{ padding:"10px 13px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb, marginBottom:14 }}>
                Subscription <strong>{done.subscription_status}</strong> hai — jab tak active nahi hoti, ye customer BILLING GAP me dikhega.
              </div>
            )}
            <div style={{ background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 18px", marginBottom:16 }}>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>Login Mobile</div>
                <div style={{ fontSize:16, fontWeight:800, color:T.blu, fontFamily:"monospace", letterSpacing:"0.5px" }}>{done.credentials.mobile}</div>
                <div style={{ fontSize:10.5, color:T.t4, marginTop:3 }}>Email (reference only): {done.credentials.email}</div>
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>Password</div>
                <div style={{ fontSize:18, fontWeight:800, color:T.t1, fontFamily:"monospace", letterSpacing:"1px", background:T.ambL, padding:"8px 12px", borderRadius:6, border:`1px solid ${T.ambM}` }}>{done.credentials.password}</div>
                <div style={{ fontSize:10.5, color:T.t4, marginTop:5 }}>Pehli login par badalna padega.</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:9 }}>
              <Btn variant="outline" style={{ flex:1 }} onClick={() => {
                navigator.clipboard.writeText(`Login Mobile: ${done.credentials.mobile}\nPassword: ${done.credentials.password}\nLogin with mobile + password.`);
                setToast({ msg:"Credentials copied" });
              }}>Copy</Btn>
              <Btn style={{ flex:2 }} onClick={finish}>Done</Btn>
            </div>
          </div>
        </div>
      </>
    );
  }

  const Section = ({ title, hint }) => (
    <div style={{ display:"flex", alignItems:"baseline", gap:8, marginTop:4 }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px" }}>{title}</div>
      {hint && <div style={{ fontSize:10.5, color:T.t4 }}>{hint}</div>}
    </div>
  );

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:640, maxHeight:"92vh", overflowY:"auto", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A", position:"sticky", top:0, zIndex:2 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>New Customer</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Client + subscription + pehli company — sab ek saath</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
        </div>

        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          {/* 1. CLIENT */}
          <Section title="1 · Client" hint="paying customer — limits aur billing yahin lagti hai"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Client Name" required value={c.name} onChange={v => setC(p=>({...p,name:v}))} placeholder="e.g. Ratna Khanij Pvt Ltd"/>
            <InputField label="Contact Person" value={c.contact_person} onChange={v => setC(p=>({...p,contact_person:v}))} placeholder="Owner / decision maker"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Mobile" value={c.phone} onChange={v => setC(p=>({...p,phone:v.replace(/\D/g,"").slice(0,10)}))} placeholder="9876543210"/>
            <InputField label="Email" value={c.email} onChange={v => setC(p=>({...p,email:v}))} placeholder="contact@client.com"/>
            <InputField label="GSTIN" value={c.gstin} onChange={v => setC(p=>({...p,gstin:v.toUpperCase().slice(0,15)}))} placeholder="22AAAAA0000A1Z5"/>
          </div>
          <div style={{ padding:"12px 14px", background:T.bluL, border:`1px solid ${T.bluM}`, borderRadius:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.blu, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Plan Limits — creation par hard-block (0 = unlimited)</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <InputField label="Max Companies" type="number" value={c.max_companies} onChange={v => setC(p=>({...p,max_companies:v}))}/>
              <InputField label="Max Users" type="number" value={c.max_users} onChange={v => setC(p=>({...p,max_users:v}))}/>
              <InputField label="Max Projects" type="number" value={c.max_projects} onChange={v => setC(p=>({...p,max_projects:v}))}/>
            </div>
          </div>

          {/* 2. SUBSCRIPTION */}
          <Section title="2 · Subscription" hint="start date do to turant active + invoice schedule ban jayega"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Committed Users" type="number" value={s.committed_users} onChange={v => setS(p=>({...p,committed_users:v}))}/>
            <InputField label="Annual Value (₹, excl. GST)" required type="number" value={s.base_annual_value} onChange={v => setS(p=>({...p,base_annual_value:v}))} placeholder="330000"/>
            <InputField label="GST %" type="number" value={s.gst_rate} onChange={v => setS(p=>({...p,gst_rate:v}))}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <SelectField label="Billing Cycle" value={s.billing_cycle} onChange={v => setS(p=>({...p,billing_cycle:v}))}
              options={Object.entries(CYCLE_LABELS).map(([value, label]) => ({ value, label }))}/>
            <InputField label="Term (months)" type="number" value={s.term_months} onChange={v => setS(p=>({...p,term_months:v}))}/>
            <InputField label="Start Date (blank = pending)" type="date" value={s.start_date} onChange={v => setS(p=>({...p,start_date:v}))}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Order Ref" value={s.order_ref} onChange={v => setS(p=>({...p,order_ref:v}))} placeholder="PHX/SAN/SOC/2026-27/001"/>
            <InputField label="Quotation Ref" value={s.quotation_ref} onChange={v => setS(p=>({...p,quotation_ref:v}))} placeholder="PHX/SAN/2026-27/001"/>
          </div>
          <div style={{ padding:"12px 14px", background:T.purL, border:`1px solid ${T.purM}`, borderRadius:8 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.pur, textTransform:"uppercase", letterSpacing:"0.5px" }}>Additional-User Slabs (annual ₹/user beyond committed)</div>
              <Btn variant="outline" color={T.pur} onClick={() => setSlabs(p => [...p, { from_users:"", to_users:"", annual_rate_per_user:"" }])} style={{ padding:"3px 9px", fontSize:11 }}><IcPlus size={11}/> Slab</Btn>
            </div>
            {slabs.map((x, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 32px", gap:8, marginBottom:6, alignItems:"end" }}>
                <InputField label={i === 0 ? "From user #" : ""} type="number" value={x.from_users} onChange={v => setSlab(i,"from_users",v)}/>
                <InputField label={i === 0 ? "To user # (blank = ∞)" : ""} type="number" value={x.to_users} onChange={v => setSlab(i,"to_users",v)}/>
                <InputField label={i === 0 ? "Annual ₹ / user" : ""} type="number" value={x.annual_rate_per_user} onChange={v => setSlab(i,"annual_rate_per_user",v)}/>
                <button onClick={() => setSlabs(p => p.filter((_, j) => j !== i))} style={{ background:"none", border:"none", cursor:"pointer", color:T.red, display:"flex", paddingBottom:9 }}><IcX size={14}/></button>
              </div>
            ))}
          </div>

          {/* 3. FIRST COMPANY */}
          <Section title="3 · Pehli Company" hint="isi client ke neeche banegi; aur companies baad me add kar sakte ho"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Company Name" required value={co.name} onChange={v => setCo(p=>({...p,name:v}))} placeholder="e.g. Ratna Khanij"/>
            <SelectField label="Business Type" value={co.module_type} onChange={v => setCo(p=>({...p,module_type:v}))}
              options={Object.entries(DOMAIN_LABELS).map(([k,v]) => ({ value:k, label:v }))}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Admin Name" required value={co.admin_name} onChange={v => setCo(p=>({...p,admin_name:v}))} placeholder="Full name"/>
            <InputField label="Admin Email" required value={co.admin_email} onChange={v => setCo(p=>({...p,admin_email:v}))} placeholder="admin@company.com"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Admin Mobile (login id)" required value={co.phone} onChange={v => setCo(p=>({...p,phone:v.replace(/\D/g,"").slice(0,10)}))} placeholder="9876543210"/>
            <InputField label="City" value={co.city} onChange={v => setCo(p=>({...p,city:v}))} placeholder="Raipur"/>
            <InputField label="State" value={co.state} onChange={v => setCo(p=>({...p,state:v}))} placeholder="Chhattisgarh"/>
          </div>
          <div style={{ padding:"10px 14px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb }}>
            <strong>Admin Mobile hi login id hai.</strong> Password auto-set hoke create ke baad ek baar dikhega — mobile + password admin ko de dena. Pehli login par unhe badalna padega.
          </div>
        </div>

        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB, position:"sticky", bottom:0 }}>
          <Btn onClick={onClose} variant="outline" style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving} style={{ flex:2 }}>{saving ? "Creating..." : "Create Customer"}</Btn>
        </div>
      </div>
    </>
  );
}

function ClientFormModal({ initial, onClose, onSaved, setToast }) {
  const isEdit = !!initial?.id;
  const [f, setF] = useState({
    name: initial?.name || "", contact_person: initial?.contact_person || "",
    phone: initial?.phone || "", email: initial?.email || "", gstin: initial?.gstin || "",
    address: initial?.address || "", city: initial?.city || "", state: initial?.state || "",
    max_companies: initial?.max_companies ?? 1, max_users: initial?.max_users ?? 0, max_projects: initial?.max_projects ?? 0,
    notes: initial?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.name.trim()) return setToast({ msg: "Client name required", type: "error" });
    setSaving(true);
    const res = isEdit
      ? await apiFetch(`/saas-admin/clients/${initial.id}`, { method: "PUT", body: f })
      : await apiFetch("/saas-admin/clients", { method: "POST", body: f });
    setSaving(false);
    if (res.success) { setToast({ msg: isEdit ? "Client updated" : "Client created" }); onSaved(); onClose(); }
    else setToast({ msg: res.message || "Failed", type: "error" });
  };

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:560, maxHeight:"90vh", overflowY:"auto", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>{isEdit ? "Edit Client" : "New Client"}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Paying customer — limits & billing live at this level</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
        </div>
        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Client Name" required value={f.name} onChange={set("name")} placeholder="e.g. Ratna Khanij"/>
            <InputField label="Contact Person" value={f.contact_person} onChange={set("contact_person")} placeholder="Owner / decision maker"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Mobile" value={f.phone} onChange={v => set("phone")(v.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210"/>
            <InputField label="Email" value={f.email} onChange={set("email")} placeholder="contact@client.com"/>
            <InputField label="GSTIN" value={f.gstin} onChange={v => set("gstin")(v.toUpperCase().slice(0, 15))} placeholder="22AAAAA0000A1Z5"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10 }}>
            <InputField label="Address" value={f.address} onChange={set("address")} placeholder="Street / area"/>
            <InputField label="City" value={f.city} onChange={set("city")} placeholder="Raipur"/>
            <InputField label="State" value={f.state} onChange={set("state")} placeholder="Chhattisgarh"/>
          </div>
          <div style={{ padding:"12px 14px", background:T.bluL, border:`1px solid ${T.bluM}`, borderRadius:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.blu, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Plan Limits — hard-blocked at creation (0 = unlimited)</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <InputField label="Max Companies" type="number" value={f.max_companies} onChange={set("max_companies")}/>
              <InputField label="Max Users" type="number" value={f.max_users} onChange={set("max_users")}/>
              <InputField label="Max Projects" type="number" value={f.max_projects} onChange={set("max_projects")}/>
            </div>
          </div>
          <InputField label="Notes" value={f.notes} onChange={set("notes")} placeholder="Internal notes"/>
        </div>
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
          <Btn onClick={onClose} variant="outline" style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={save} disabled={saving} style={{ flex:2 }}>{saving ? "Saving..." : (isEdit ? "Save Changes" : "Create Client")}</Btn>
        </div>
      </div>
    </>
  );
}

function SubscriptionFormModal({ clientId, initial, onClose, onSaved, setToast }) {
  const isEdit = !!initial?.id;
  const [f, setF] = useState({
    committed_users: initial?.committed_users ?? 30,
    base_annual_value: initial?.base_annual_value ?? "",
    gst_rate: initial?.gst_rate ?? 18,
    billing_cycle: initial?.billing_cycle || "quarterly",
    term_months: initial?.term_months ?? 12,
    order_ref: initial?.order_ref || "", quotation_ref: initial?.quotation_ref || "",
    notes: initial?.notes || "", start_date: "",
  });
  // Standard published rate card as the starting point — edit per deal
  const [slabs, setSlabs] = useState(initial?.slabs?.length
    ? initial.slabs.map(s => ({ from_users: s.from_users, to_users: s.to_users ?? "", annual_rate_per_user: s.annual_rate_per_user }))
    : [{ from_users: 31, to_users: 50, annual_rate_per_user: 10000 },
       { from_users: 51, to_users: 100, annual_rate_per_user: 7000 },
       { from_users: 101, to_users: "", annual_rate_per_user: 5000 }]);
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }));
  const setSlab = (i, k, v) => setSlabs(p => p.map((s, j) => j === i ? { ...s, [k]: v } : s));

  const save = async () => {
    if (!f.base_annual_value) return setToast({ msg: "Annual value required", type: "error" });
    setSaving(true);
    const body = { ...f, slabs: slabs.filter(s => s.from_users && s.annual_rate_per_user) };
    if (!body.start_date) delete body.start_date;
    const res = isEdit
      ? await apiFetch(`/saas-admin/client-subscriptions/${initial.id}`, { method: "PUT", body })
      : await apiFetch(`/saas-admin/clients/${clientId}/subscriptions`, { method: "POST", body });
    setSaving(false);
    if (res.success) { setToast({ msg: isEdit ? "Subscription updated" : "Subscription created" }); onSaved(); onClose(); }
    else setToast({ msg: res.message || "Failed", type: "error" });
  };

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, maxHeight:"90vh", overflowY:"auto", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>{isEdit ? "Edit Subscription" : "New Subscription"}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Invoice schedule auto-generates on activation — everything stays editable</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
        </div>
        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Committed Users" type="number" value={f.committed_users} onChange={set("committed_users")}/>
            <InputField label="Annual Value (₹, excl. GST)" required type="number" value={f.base_annual_value} onChange={set("base_annual_value")} placeholder="330000"/>
            <InputField label="GST %" type="number" value={f.gst_rate} onChange={set("gst_rate")}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <SelectField label="Billing Cycle" value={f.billing_cycle} onChange={set("billing_cycle")}
              options={Object.entries(CYCLE_LABELS).map(([value, label]) => ({ value, label }))}/>
            <InputField label="Term (months)" type="number" value={f.term_months} onChange={set("term_months")}/>
            {!isEdit && <InputField label="Start Date (blank = pending)" type="date" value={f.start_date} onChange={set("start_date")}/>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Order Ref" value={f.order_ref} onChange={set("order_ref")} placeholder="PHX/SAN/SOC/2026-27/001"/>
            <InputField label="Quotation Ref" value={f.quotation_ref} onChange={set("quotation_ref")} placeholder="PHX/SAN/2026-27/001"/>
          </div>
          <div style={{ padding:"12px 14px", background:T.purL, border:`1px solid ${T.purM}`, borderRadius:8 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.pur, textTransform:"uppercase", letterSpacing:"0.5px" }}>Additional-User Slabs (annual ₹/user beyond committed)</div>
              <Btn variant="outline" color={T.pur} onClick={() => setSlabs(p => [...p, { from_users: "", to_users: "", annual_rate_per_user: "" }])} style={{ padding:"3px 9px", fontSize:11 }}><IcPlus size={11}/> Slab</Btn>
            </div>
            {slabs.map((s, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 32px", gap:8, marginBottom:6, alignItems:"end" }}>
                <InputField label={i === 0 ? "From user #" : ""} type="number" value={s.from_users} onChange={v => setSlab(i, "from_users", v)}/>
                <InputField label={i === 0 ? "To user # (blank = ∞)" : ""} type="number" value={s.to_users} onChange={v => setSlab(i, "to_users", v)}/>
                <InputField label={i === 0 ? "Annual ₹ / user" : ""} type="number" value={s.annual_rate_per_user} onChange={v => setSlab(i, "annual_rate_per_user", v)}/>
                <button onClick={() => setSlabs(p => p.filter((_, j) => j !== i))} style={{ background:"none", border:"none", cursor:"pointer", color:T.red, display:"flex", paddingBottom:9 }}><IcX size={14}/></button>
              </div>
            ))}
          </div>
          <InputField label="Notes" value={f.notes} onChange={set("notes")} placeholder="e.g. includes 2–3 UI/UX + 2–3 dashboard customizations"/>
        </div>
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
          <Btn onClick={onClose} variant="outline" style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={save} disabled={saving} style={{ flex:2 }}>{saving ? "Saving..." : (isEdit ? "Save Changes" : "Create Subscription")}</Btn>
        </div>
      </div>
    </>
  );
}

function InvoiceEditModal({ invoice, onClose, onSaved, setToast }) {
  const [f, setF] = useState({
    invoice_no: invoice.invoice_no || "", period_label: invoice.period_label || "",
    base_amount: invoice.base_amount, addl_users: invoice.addl_users || 0,
    addl_amount: invoice.addl_amount, adjustment: invoice.adjustment || 0,
    gst_rate: invoice.gst_rate, due_date: invoice.due_date ? String(invoice.due_date).slice(0, 10) : "",
    notes: invoice.notes || "",
  });
  const [addlDirty, setAddlDirty] = useState(false); // manual ₹ override vs slab recompute
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const body = { ...f };
    if (!addlDirty) delete body.addl_amount; // let backend recompute from slabs
    const res = await apiFetch(`/saas-admin/client-invoices/${invoice.id}`, { method: "PUT", body });
    setSaving(false);
    if (res.success) { setToast({ msg: "Invoice updated" }); onSaved(); onClose(); }
    else setToast({ msg: res.message || "Failed", type: "error" });
  };

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:540, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Edit Invoice</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{invoice.period_label}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
        </div>
        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Invoice No." value={f.invoice_no} onChange={set("invoice_no")} placeholder="PHX/INV/2026-27/001"/>
            <InputField label="Period Label" value={f.period_label} onChange={set("period_label")}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Base Amount (₹)" type="number" value={f.base_amount} onChange={set("base_amount")}/>
            <InputField label="Addl. Users" type="number" value={f.addl_users} onChange={set("addl_users")}/>
            <InputField label="Addl. Amount (₹)" type="number" value={f.addl_amount} onChange={v => { setAddlDirty(true); set("addl_amount")(v); }}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Adjustment ± (₹)" type="number" value={f.adjustment} onChange={set("adjustment")}/>
            <InputField label="GST %" type="number" value={f.gst_rate} onChange={set("gst_rate")}/>
            <InputField label="Due Date" type="date" value={f.due_date} onChange={set("due_date")}/>
          </div>
          <InputField label="Notes" value={f.notes} onChange={set("notes")}/>
          <div style={{ fontSize:11, color:T.t4 }}>Addl. Amount blank chhodne par slabs se auto-calculate hota hai; type karne par manual override.</div>
        </div>
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
          <Btn onClick={onClose} variant="outline" style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={save} disabled={saving} style={{ flex:2 }}>{saving ? "Saving..." : "Save Invoice"}</Btn>
        </div>
      </div>
    </>
  );
}

function ClientDetail({ clientId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editClient, setEditClient] = useState(false);
  const [showSub, setShowSub] = useState(null);        // "new" | subscription object
  const [activateSub, setActivateSub] = useState(null); // subscription object
  const [activateDate, setActivateDate] = useState("");
  const [editInv, setEditInv] = useState(null);
  const [payInv, setPayInv] = useState(null);
  const [payRef, setPayRef] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [allCompanies, setAllCompanies] = useState([]);
  const [assignCompanyId, setAssignCompanyId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiFetch(`/saas-admin/clients/${clientId}`).then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [clientId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiFetch("/saas-admin/companies").then(res => { if (res.success) setAllCompanies(res.data); }).catch(() => {});
  }, []);

  const act = async (path, body, okMsg) => {
    setBusy(true);
    const res = await apiFetch(path, { method: "POST", body: body || {} });
    setBusy(false);
    if (res.success) { setToast({ msg: okMsg || res.message || "Done" }); load(); }
    else setToast({ msg: res.message || "Failed", type: "error" });
    return res.success;
  };

  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.t3, fontSize:13 }}>Loading client...</div>;
  if (!data) return <div style={{ padding:60, textAlign:"center", color:T.red, fontSize:13 }}>Failed to load.<br/><Btn onClick={onBack} variant="outline" style={{ marginTop:12 }}>← Back</Btn></div>;

  const { client, companies, usage, subscriptions, invoices } = data;
  const currentSub = subscriptions.find(s => ["active", "pending", "suspended"].includes(s.status)) || subscriptions[0] || null;
  const unassigned = allCompanies.filter(c => !companies.some(m => m.id === c.id));

  const toggleSuspend = async () => {
    const next = client.status === "suspended" ? "active" : "suspended";
    if (next === "suspended" && !window.confirm(`Suspend ${client.name}? New companies/users/projects will be blocked immediately.`)) return;
    const res = await apiFetch(`/saas-admin/clients/${client.id}`, { method: "PUT", body: { status: next } });
    if (res.success) { setToast({ msg: next === "suspended" ? "Client suspended" : "Client reactivated" }); load(); }
    else setToast({ msg: res.message || "Failed", type: "error" });
  };

  const limitCard = (label, used, max) => (
    <div style={{ flex:1, padding:"12px 16px", background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10 }}>
      <div style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:800, color:limitColor(used, max) }}>{limitStr(used, max)}</div>
      {max > 0 && used >= max && <div style={{ fontSize:10, color:T.red, fontWeight:600, marginTop:2 }}>LIMIT REACHED — creation blocked</div>}
    </div>
  );

  return (
    <div style={{ padding:"18px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
        <button onClick={onBack} style={{ padding:"7px 12px", border:`1px solid ${T.b1}`, background:T.surface, borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.t2, fontFamily:"inherit" }}>
          <IcChevL size={14}/> Back
        </button>
        <div style={{ width:48, height:48, borderRadius:10, background:client.is_internal ? T.purL : T.bluL, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:20, fontWeight:800, color:client.is_internal ? T.pur : T.blu }}>{(client.name || "?")[0]}</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:18, fontWeight:800, color:T.t1, display:"flex", alignItems:"center", gap:10 }}>
            {client.name}
            {client.is_internal ? <Badge text="INTERNAL" color={T.pur}/> : null}
            <Badge text={client.status === "suspended" ? "SUSPENDED" : "Active"} color={client.status === "suspended" ? T.red : T.grn}/>
          </div>
          <div style={{ fontSize:11, color:T.t4 }}>
            {[client.contact_person, client.phone, client.email, client.gstin && `GSTIN ${client.gstin}`, [client.city, client.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "No contact details"}
          </div>
        </div>
        <Btn variant="outline" onClick={() => setEditClient(true)}><IcEdit size={13}/> Edit</Btn>
        <Btn color={client.status === "suspended" ? T.grn : T.red} variant="outline" onClick={toggleSuspend}>
          {client.status === "suspended" ? "Reactivate" : "Suspend"}
        </Btn>
      </div>

      {/* Limits vs usage */}
      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        {limitCard("Companies", usage.companies, client.max_companies)}
        {limitCard("Users (billable seats)", usage.users, client.max_users)}
        {limitCard("Projects", usage.projects, client.max_projects)}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:16, alignItems:"start" }}>
        {/* Companies */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}`, fontSize:12.5, fontWeight:700, color:T.t1 }}>Companies ({companies.length})</div>
          {companies.length === 0 && <div style={{ padding:"20px 16px", fontSize:12, color:T.t4 }}>No company linked yet — company banane ke baad yaha assign karo.</div>}
          {companies.map(c => {
            const dl = (obj, fname) => { try { const b = new Blob([JSON.stringify(obj, null, 2)], { type:"application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = fname; a.click(); URL.revokeObjectURL(a.href); } catch(_){} };
            const doExport = async (e) => {
              e.stopPropagation();
              const res = await apiFetch(`/saas-admin/companies/${c.id}/export-data`, { method:"POST" });
              if (res.success) { dl(res.data, `${c.slug || c.id}-export.json`); setToast({ msg:`Export downloaded — ${res.data.meta.total_rows} rows` }); }
              else setToast({ msg: res.message || "Export failed", type:"error" });
            };
            const doPurge = async (e) => {
              e.stopPropagation();
              const nm = await window.promptAsync(`⚠️ HARD DELETE "${c.name}"?\n\nYeh company ka SAARA data permanently delete karega. Pehle ek recovery export download hoga (kabhi wapas chahiye to usse restore). Confirm ke liye company ka naam bilkul waisa hi type karein:`);
              if (nm === null) return;
              const res = await apiFetch(`/saas-admin/companies/${c.id}/purge`, { method:"DELETE", body:{ confirm_name: nm } });
              if (res.success) { if (res.export) dl(res.export, `${c.slug || c.id}-recovery.json`); setToast({ msg: res.message }); load(); }
              else setToast({ msg: res.message || "Purge failed", type:"error" });
            };
            return (
            <div key={c.id} style={{ padding:"10px 16px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:T.t1 }}>{c.name}</div>
                <div style={{ fontSize:10.5, color:T.t4 }}>/{c.slug} · {c.user_count} users · {c.project_count} projects</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                <Badge text={c.is_active ? "Active" : "Inactive"} color={c.is_active ? T.grn : T.red}/>
                <button title="Export all data (recovery file)" onClick={doExport}
                  style={{ padding:"3px 8px", borderRadius:6, border:`1px solid ${T.b1}`, background:T.surfaceB, color:T.t3, fontSize:10.5, fontWeight:600, cursor:"pointer" }}>⬇ Export</button>
                <button title="Hard delete (export taken first, name confirm)" onClick={doPurge}
                  style={{ padding:"3px 8px", borderRadius:6, border:`1px solid ${T.redM}`, background:T.redL, color:T.red, fontSize:10.5, fontWeight:700, cursor:"pointer" }}>Purge</button>
              </div>
            </div>
            );
          })}
          <div style={{ padding:"12px 16px", display:"flex", gap:8 }}>
            <div style={{ flex:1 }}>
              <SelectField value={assignCompanyId} onChange={setAssignCompanyId} placeholder="Assign existing company..."
                options={unassigned.map(c => ({ value: c.id, label: c.name }))}/>
            </div>
            <Btn variant="outline" disabled={!assignCompanyId || busy} onClick={async () => {
              setBusy(true);
              const res = await apiFetch(`/saas-admin/clients/${client.id}/assign-company`, { method: "PUT", body: { company_id: assignCompanyId } });
              setBusy(false);
              if (res.success) { setToast({ msg: res.message }); setAssignCompanyId(""); load(); }
              else setToast({ msg: res.message || "Failed", type: "error" });
            }}>Assign</Btn>
          </div>
        </div>

        {/* Subscription + invoices */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:T.t1 }}>Subscription</div>
              <div style={{ display:"flex", gap:8 }}>
                {currentSub && <Btn variant="outline" onClick={() => setShowSub(currentSub)} style={{ padding:"5px 10px", fontSize:11.5 }}><IcEdit size={12}/> Edit</Btn>}
                {!currentSub && <Btn onClick={() => setShowSub("new")} style={{ padding:"5px 10px", fontSize:11.5 }}><IcPlus size={12}/> New Subscription</Btn>}
              </div>
            </div>
            {!currentSub ? (
              <div style={{ padding:"20px 16px", fontSize:12, color:T.t4 }}>No subscription yet.</div>
            ) : (
              <div style={{ padding:"14px 16px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <Badge text={currentSub.status.toUpperCase()} color={SUB_COLORS[currentSub.status] || T.slt}/>
                  <span style={{ fontSize:12, color:T.t3 }}>{CYCLE_LABELS[currentSub.billing_cycle]} · {currentSub.term_months} months{currentSub.order_ref ? ` · ${currentSub.order_ref}` : ""}</span>
                  {currentSub.status === "pending" && (
                    <Btn color={T.grn} onClick={() => { setActivateSub(currentSub); setActivateDate(new Date().toISOString().slice(0, 10)); }} style={{ padding:"5px 12px", fontSize:11.5, marginLeft:"auto" }}>Activate →</Btn>
                  )}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10 }}>
                  <div><div style={{ fontSize:10, color:T.t4, textTransform:"uppercase", fontWeight:600 }}>Annual Value</div><div style={{ fontSize:15, fontWeight:800, color:T.t1 }}>{fmtAmt(currentSub.base_annual_value)}</div><div style={{ fontSize:10, color:T.t4 }}>+ GST {parseFloat(currentSub.gst_rate)}%</div></div>
                  <div><div style={{ fontSize:10, color:T.t4, textTransform:"uppercase", fontWeight:600 }}>Committed Users</div><div style={{ fontSize:15, fontWeight:800, color:T.t1 }}>{currentSub.committed_users}</div></div>
                  <div><div style={{ fontSize:10, color:T.t4, textTransform:"uppercase", fontWeight:600 }}>Start</div><div style={{ fontSize:13, fontWeight:700, color:T.t2 }}>{fmtDate(currentSub.start_date)}</div></div>
                  <div><div style={{ fontSize:10, color:T.t4, textTransform:"uppercase", fontWeight:600 }}>End</div><div style={{ fontSize:13, fontWeight:700, color:T.t2 }}>{fmtDate(currentSub.end_date)}</div></div>
                </div>
                {currentSub.slabs?.length > 0 && (
                  <div style={{ marginTop:10, fontSize:11, color:T.t3 }}>
                    Slabs: {currentSub.slabs.map(s => `${s.from_users}–${s.to_users || "∞"} @ ${fmtAmt(s.annual_rate_per_user)}/user`).join(" · ")}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Invoices */}
          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:T.t1 }}>Invoices ({invoices.filter(i => i.status !== "cancelled").length})</div>
              {currentSub && (
                <Btn variant="outline" onClick={async () => {
                  const label = window.prompt("Invoice label (e.g. 'Pro-rata 5 users Aug–Oct')");
                  if (label === null) return;
                  const amt = window.prompt("Base amount ₹ (excl. GST)", "0");
                  if (amt === null) return;
                  await act(`/saas-admin/client-subscriptions/${currentSub.id}/invoices`, { period_label: label || "Manual invoice", base_amount: parseFloat(amt) || 0 }, "Manual invoice added");
                }} style={{ padding:"5px 10px", fontSize:11.5 }}><IcPlus size={12}/> Manual Invoice</Btn>
              )}
            </div>
            {invoices.length === 0 ? (
              <div style={{ padding:"20px 16px", fontSize:12, color:T.t4 }}>Koi invoice nahi — subscription activate hone par schedule auto-ban jayega.</div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead><tr style={{ background:T.surfaceB }}>
                    {["Period", "Base", "Addl.", "GST", "Total", "Status", "Due", "Actions"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} style={{ borderTop:`1px solid ${T.b1}`, opacity: inv.status === "cancelled" ? 0.45 : 1 }}>
                        <td style={td}>
                          <div style={{ fontWeight:600, color:T.t1 }}>{inv.period_label}</div>
                          {inv.invoice_no && <div style={{ fontSize:10, color:T.t4 }}>{inv.invoice_no}</div>}
                        </td>
                        <td style={td}>{fmtAmt(inv.base_amount)}</td>
                        <td style={td}>{inv.addl_users > 0 ? `${inv.addl_users}u · ${fmtAmt(inv.addl_amount)}` : "--"}{parseFloat(inv.adjustment) ? <div style={{ fontSize:10, color:T.amb }}>adj {fmtAmt(inv.adjustment)}</div> : null}</td>
                        <td style={td}>{fmtAmt(inv.gst_amount)}</td>
                        <td style={{ ...td, fontWeight:700, color:T.t1 }}>{fmtAmt(inv.total_amount)}</td>
                        <td style={td}>
                          <Badge text={inv.is_overdue ? "OVERDUE" : inv.status.toUpperCase()} color={inv.is_overdue ? T.red : (INV_COLORS[inv.status] || T.slt)}/>
                          {inv.status === "paid" && inv.paid_at && <div style={{ fontSize:10, color:T.t4, marginTop:2 }}>{fmtDate(inv.paid_at)}{inv.payment_ref ? ` · ${inv.payment_ref}` : ""}</div>}
                        </td>
                        <td style={td}>{fmtDate(inv.due_date)}</td>
                        <td style={td}>
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                            {inv.status === "scheduled" && <Btn variant="outline" onClick={() => act(`/saas-admin/client-invoices/${inv.id}/issue`, {}, "Invoice issued")} style={{ padding:"3px 8px", fontSize:10.5 }}>Issue</Btn>}
                            {["scheduled", "issued"].includes(inv.status) && <Btn color={T.grn} onClick={() => { setPayInv(inv); setPayRef(""); setPayDate(new Date().toISOString().slice(0, 10)); }} style={{ padding:"3px 8px", fontSize:10.5 }}>Mark Paid</Btn>}
                            {["scheduled", "issued"].includes(inv.status) && <Btn variant="outline" onClick={() => setEditInv(inv)} style={{ padding:"3px 8px", fontSize:10.5 }}><IcEdit size={10}/></Btn>}
                            {["scheduled", "issued"].includes(inv.status) && <Btn variant="outline" color={T.red} onClick={() => window.confirm("Cancel this invoice?") && act(`/saas-admin/client-invoices/${inv.id}/cancel`, {}, "Invoice cancelled")} style={{ padding:"3px 8px", fontSize:10.5 }}><IcX size={10}/></Btn>}
                            {inv.status === "paid" && <Btn variant="outline" color={T.amb} onClick={() => window.confirm("Revert this payment?") && act(`/saas-admin/client-invoices/${inv.id}/revert-paid`, {}, "Payment reverted")} style={{ padding:"3px 8px", fontSize:10.5 }}>Revert</Btn>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {editClient && <ClientFormModal initial={client} onClose={() => setEditClient(false)} onSaved={load} setToast={setToast}/>}
      {showSub && <SubscriptionFormModal clientId={client.id} initial={showSub === "new" ? null : showSub} onClose={() => setShowSub(null)} onSaved={load} setToast={setToast}/>}
      {activateSub && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:420, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, background:"#0D1B2A" }}>
              <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Activate Subscription</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Start date se {activateSub.term_months}-month term + invoice schedule generate hoga</div>
            </div>
            <div style={{ padding:"20px 22px" }}>
              <InputField label="Subscription Start Date" type="date" required value={activateDate} onChange={setActivateDate}/>
            </div>
            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setActivateSub(null)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn color={T.grn} disabled={!activateDate || busy} onClick={async () => {
                const ok = await act(`/saas-admin/client-subscriptions/${activateSub.id}/activate`, { start_date: activateDate });
                if (ok) setActivateSub(null);
              }} style={{ flex:2 }}>{busy ? "Activating..." : "Activate & Generate Invoices"}</Btn>
            </div>
          </div>
        </>
      )}
      {payInv && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:420, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, background:"#0D1B2A" }}>
              <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Record Payment</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{payInv.period_label} · {fmtAmt(payInv.total_amount)}</div>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
              <InputField label="Payment Date" type="date" value={payDate} onChange={setPayDate}/>
              <InputField label="Payment Reference (UTR / cheque no.)" value={payRef} onChange={setPayRef} placeholder="Optional"/>
            </div>
            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setPayInv(null)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn color={T.grn} disabled={busy} onClick={async () => {
                const ok = await act(`/saas-admin/client-invoices/${payInv.id}/mark-paid`, { payment_ref: payRef, paid_date: payDate }, "Payment recorded");
                if (ok) setPayInv(null);
              }} style={{ flex:2 }}>{busy ? "Saving..." : "Record Payment"}</Btn>
            </div>
          </div>
        </>
      )}
      {editInv && <InvoiceEditModal invoice={editInv} onClose={() => setEditInv(null)} onSaved={load} setToast={setToast}/>}
    </div>
  );
}

function TabClients() {
  const [clients, setClients] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showInternal, setShowInternal] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/saas-admin/clients"),
      apiFetch("/saas-admin/billing/overview"),
    ]).then(([r1, r2]) => {
      if (r1.success) setClients(r1.data);
      if (r2.success) setOverview(r2.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (selId) return <ClientDetail clientId={selId} onBack={() => { setSelId(null); load(); }}/>;
  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.t3, fontSize:13 }}>Loading clients...</div>;

  const kpi = overview?.kpi || {};
  const visible = clients.filter(c => showInternal || !c.is_internal);
  const overdueInvoices = (overview?.upcoming || []).filter(i => i.is_overdue);
  // Live customers with no usable subscription — they work fine but are billed
  // for nothing. Backend derives the flag (saas-clients.js GET /clients).
  const billingGaps = clients.filter(c => c.billing_gap);

  return (
    <div style={{ padding:"18px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      <PageHeader title="Clients & Billing" sub="Paying customers — plan limits (companies / users / projects) + subscription billing"
        right={<>
          <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:T.t3, cursor:"pointer" }}>
            <input type="checkbox" checked={showInternal} onChange={e => setShowInternal(e.target.checked)}/> Internal bhi dikhao
          </label>
          <Btn variant="outline" onClick={async () => {
            const cfg = await apiFetch("/saas-admin/lifecycle-config");
            const cur = cfg.success ? cfg.data : { grace_days:7, retention_days:90 };
            const g = await window.promptAsync(`Grace period — subscription expire hone ke baad kitne din tak full access rahe (phir login block). Abhi: ${cur.grace_days} din`);
            if (g === null) return;
            const r = await window.promptAsync(`Retention window — suspend hone ke baad kitne din data rakhein (phir purge-eligible). Abhi: ${cur.retention_days} din`);
            if (r === null) return;
            const res = await apiFetch("/saas-admin/lifecycle-config", { method:"PUT", body:{ grace_days: parseInt(g, 10), retention_days: parseInt(r, 10) } });
            setToast({ msg: res.success ? res.message : (res.message || "Failed"), type: res.success ? undefined : "error" });
          }}>⚙ Lifecycle</Btn>
          <Btn variant="outline" onClick={load}><IcRefresh size={13}/></Btn>
          {/* "New Client" makes a client with no contract and no company — kept as
              an escape hatch, but New Customer is the path that can't leave gaps. */}
          <Btn variant="outline" onClick={() => setShowNew(true)}>New Client only</Btn>
          <Btn onClick={() => setShowNewCustomer(true)}><IcPlus size={14}/> New Customer</Btn>
        </>}/>

      {/* Billing KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:16 }}>
        <StatCard label="Active Subscriptions" value={fmtNum(kpi.active_subs)} sub={`${fmtNum(kpi.pending_subs)} pending activation`} color={T.grn} Icon={IcDollar}/>
        <StatCard label="Annual Contract Value" value={"₹" + fmtMoney(kpi.active_acv)} sub="active subs, excl. GST" color={T.blu} Icon={IcTrend}/>
        <StatCard label="Collected" value={"₹" + fmtMoney(kpi.collected)} sub="all-time, incl. GST" color={T.cyn} Icon={IcChk}/>
        <StatCard label="Outstanding" value={"₹" + fmtMoney(kpi.outstanding)} sub={kpi.overdue_count > 0 ? `${kpi.overdue_count} overdue · ₹${fmtMoney(kpi.overdue_amount)}` : "nothing overdue"} color={kpi.overdue_count > 0 ? T.red : T.amb} Icon={IcActivity}/>
      </div>

      {/* Billing-gap strip — customer live but nothing to bill against.
          Deliberately ABOVE the overdue strip: an unbilled customer is worse
          than a late-paying one (we aren't even asking them for money). */}
      {billingGaps.length > 0 && (
        <div style={{ padding:"12px 16px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:10, marginBottom:16 }}>
          <div style={{ fontSize:11.5, fontWeight:700, color:T.amb, marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
            <IcActivity size={13} color={T.amb}/> BILLING GAP — {billingGaps.length} customer{billingGaps.length > 1 ? "s" : ""} chalu {billingGaps.length > 1 ? "hain" : "hai"} par bill nahi ho {billingGaps.length > 1 ? "rahe" : "raha"}
          </div>
          {billingGaps.map(c => (
            <div key={c.id} onClick={() => setSelId(c.id)}
              style={{ fontSize:12, color:T.t2, padding:"3px 0", cursor:"pointer" }}>
              <strong>{c.name}</strong> · {c.company_count} {c.company_count > 1 ? "companies" : "company"} · {c.user_count} users · <span style={{ color:T.amb, fontWeight:600 }}>{c.billing_gap_reason}</span> — subscription banao
            </div>
          ))}
        </div>
      )}

      {/* Overdue strip */}
      {overdueInvoices.length > 0 && (
        <div style={{ padding:"12px 16px", background:T.redL, border:`1px solid ${T.redM}`, borderRadius:10, marginBottom:16 }}>
          <div style={{ fontSize:11.5, fontWeight:700, color:T.red, marginBottom:6 }}>⚠ OVERDUE — follow up needed</div>
          {overdueInvoices.slice(0, 5).map(i => (
            <div key={i.id} style={{ fontSize:12, color:T.t2, padding:"3px 0" }}>
              <strong>{i.client_name}</strong> · {i.period_label} · {fmtAmt(i.total_amount)} · due {fmtDate(i.due_date)}
            </div>
          ))}
        </div>
      )}

      {/* Clients table */}
      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden" }}>
        <TableHeader gridCols="2fr 1fr 1fr 1fr 1.2fr 1fr 1fr" columns={["Client", "Companies", "Users", "Projects", "Subscription", "Next Due", "Collected"]}/>
        {visible.length === 0 && <EmptyState Icon={IcUsers} text="Koi client nahi — New Client se shuru karo"/>}
        {visible.map(c => (
          <div key={c.id} onClick={() => setSelId(c.id)}
            style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1.2fr 1fr 1fr", padding:"12px 16px", borderTop:`1px solid ${T.b1}`, cursor:"pointer", alignItems:"center", background: c.status === "suspended" ? T.redL : "transparent" }}
            onMouseEnter={e => e.currentTarget.style.background = c.status === "suspended" ? T.redL : T.surfaceB}
            onMouseLeave={e => e.currentTarget.style.background = c.status === "suspended" ? T.redL : "transparent"}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.t1, display:"flex", alignItems:"center", gap:8 }}>
                {c.name}
                {c.is_internal ? <Badge text="INT" color={T.pur}/> : null}
                {c.status === "suspended" && <Badge text="SUSPENDED" color={T.red}/>}
              </div>
              <div style={{ fontSize:10.5, color:T.t4 }}>{[c.city, c.state].filter(Boolean).join(", ") || "--"}</div>
            </div>
            <div style={{ fontSize:12.5, fontWeight:700, color:limitColor(c.company_count, c.max_companies) }}>{limitStr(c.company_count, c.max_companies)}</div>
            <div style={{ fontSize:12.5, fontWeight:700, color:limitColor(c.user_count, c.max_users) }}>{limitStr(c.user_count, c.max_users)}</div>
            <div style={{ fontSize:12.5, fontWeight:700, color:limitColor(c.project_count, c.max_projects) }}>{limitStr(c.project_count, c.max_projects)}</div>
            <div>
              {c.sub_status
                ? <><Badge text={c.sub_status.toUpperCase()} color={SUB_COLORS[c.sub_status] || T.slt}/>{c.sub_end && <div style={{ fontSize:10, color:T.t4, marginTop:3 }}>till {fmtDate(c.sub_end)}</div>}</>
                : <span style={{ fontSize:11, color:T.t4 }}>--</span>}
              {c.lifecycle && c.lifecycle.state === "grace" && <div style={{ marginTop:3 }}><Badge text={`GRACE · ${c.lifecycle.graceDaysLeft}d`} color={T.amb}/></div>}
              {c.lifecycle && c.lifecycle.state === "suspended" && <div style={{ marginTop:3 }}><Badge text={c.lifecycle.archived ? "SUSPENDED · PURGE-ELIGIBLE" : "SUSPENDED"} color={T.red}/></div>}
            </div>
            <div style={{ fontSize:11.5, color: c.overdue_count > 0 ? T.red : T.t3, fontWeight: c.overdue_count > 0 ? 700 : 400 }}>
              {c.overdue_count > 0 ? `${c.overdue_count} OVERDUE` : (c.next_due ? fmtDate(c.next_due) : "--")}
            </div>
            <div style={{ fontSize:12.5, fontWeight:700, color:T.t1 }}>{parseFloat(c.total_collected) > 0 ? fmtAmt(c.total_collected) : "--"}</div>
          </div>
        ))}
      </div>

      {showNew && <ClientFormModal onClose={() => setShowNew(false)} onSaved={load} setToast={setToast}/>}
      {showNewCustomer && <NewCustomerModal onClose={() => setShowNewCustomer(false)} onCreated={load} setToast={setToast}/>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MAIN SAAS MODULE
// ════════════════════════════════════════════════════════════════════════
// ── Bug Inbox — Phynaxon's cross-company Sahayak tickets ──────────
// Bugs reported through Sahayak used to land on the COMPANY admin's desk,
// where nobody could fix them and Phynaxon never heard about them. This is
// the other half of that routing: every tenant's bugs in one place, with the
// diagnostic bundle the user consented to send.
function TabBugInbox() {
  const [type, setType]     = useState("bug");
  const [status, setStatus] = useState("open");
  const [rows, setRows]     = useState(null);
  const [openId, setOpenId] = useState(null);
  const [note, setNote]     = useState("");
  const [busy, setBusy]     = useState(false);

  const load = useCallback((ty, st) => {
    setRows(null);
    apiFetch(`/support-bot/escalations/saas?type=${ty}&status=${st}`)
      .then(r => setRows(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]));
  }, []);

  useEffect(() => { load(type, status); }, [type, status, load]);

  const resolve = (id) => {
    setBusy(true);
    apiFetch(`/support-bot/escalations/${id}/resolve`, { method:"POST", body:{ resolution: note.trim() || undefined } })
      .then(r => { setBusy(false); if (r && r.success) { setOpenId(null); setNote(""); load(type, status); } })
      .catch(() => setBusy(false));
  };

  const chip = (on) => ({
    border:`1px solid ${on ? T.blu : T.b1}`, cursor:"pointer", borderRadius:7,
    padding:"5px 12px", fontSize:12, fontWeight:600, fontFamily:"inherit",
    background: on ? T.bluL : T.surface, color: on ? T.blu : T.t3,
  });

  return (
    <div>
      <PageHeader title="Bug Inbox" sub="Sahayak se aaye bug — saari companies"/>

      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        {[["bug","Bug"],["query","Sawaal"]].map(([id,label]) => (
          <button key={id} onClick={() => { setType(id); setOpenId(null); }} style={chip(type===id)}>{label}</button>
        ))}
        <span style={{ width:1, background:T.b1, margin:"0 2px" }}/>
        {[["open","Open"],["resolved","Resolved"]].map(([id,label]) => (
          <button key={id} onClick={() => { setStatus(id); setOpenId(null); }} style={chip(status===id)}>{label}</button>
        ))}
      </div>

      {rows === null && <div style={{ padding:18, fontSize:12.5, color:T.t4 }}>Loading...</div>}
      {rows && !rows.length && <EmptyState Icon={IcShield} text="Koi ticket nahi."/>}

      {rows && rows.map(t => {
        const isBug = t.type === "bug";
        const expanded = openId === t.id;
        return (
          <div key={t.id} style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, marginBottom:8 }}>
            <button onClick={() => { setOpenId(expanded ? null : t.id); setNote(""); }}
              style={{ width:"100%", textAlign:"left", border:"none", background:"transparent", cursor:"pointer",
                padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start", fontFamily:"inherit" }}>
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, flexWrap:"wrap" }}>
                  <TicketBadge text={isBug ? "Bug" : "Sawaal"} color={isBug ? T.red : T.slt} bg={isBug ? T.redL : T.sltL}/>
                  {/* which tenant reported it — the whole point of this view */}
                  <TicketBadge text={t.company_name || ("Company #" + t.company_id)} color={T.pur} bg={T.purL}/>
                  <span style={{ fontSize:12, fontWeight:600, color:T.t1 }}>{t.ticket_no}</span>
                  <span style={{ fontSize:11.5, color:T.t3 }}>{t.user_name || "—"}</span>
                  <span style={{ fontSize:11, color:T.t4 }}>{fmtTicketTime(t.created_at)}</span>
                  {t.bundle_meta && <TicketBadge text="Diagnostics" color={T.blu} bg={T.bluL}/>}
                </span>
                <span style={{ display:"block", fontSize:12.5, color:T.t2, lineHeight:1.45,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace: expanded ? "normal" : "nowrap" }}>
                  {t.question || "—"}
                </span>
              </span>
            </button>

            {expanded && (
              <div style={{ padding:"0 14px 14px", display:"flex", flexDirection:"column", gap:10 }}>
                {t.reason && <div style={{ fontSize:11.5, color:T.t3 }}>Reason: {t.reason}</div>}
                <BundleView meta={t.bundle_meta} url={t.bundle_url}/>
                {t.status === "open" ? (
                  <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                    <input value={note} onChange={e => setNote(e.target.value)} placeholder="Kya fix kiya / kya jawab diya..."
                      style={{ flex:1, minWidth:0, padding:"7px 10px", borderRadius:7, border:`1px solid ${T.b1}`,
                        fontSize:12, color:T.t1, background:T.surfaceB, outline:"none", fontFamily:"inherit" }}/>
                    <Btn onClick={() => resolve(t.id)} color={T.grn} disabled={busy}>Resolve karein</Btn>
                  </div>
                ) : (
                  t.resolution && <div style={{ fontSize:11.5, color:T.t3, background:T.grnL,
                    border:`1px solid ${T.grnM}`, borderRadius:7, padding:"7px 10px" }}>{t.resolution}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const TABS = [
  { id:"stats",     label:"Dashboard",        Icon:IcTrend    },
  { id:"clients",   label:"Clients & Billing", Icon:IcDollar  },
  { id:"companies", label:"Companies",        Icon:IcBuilding },
  { id:"crm",       label:"CRM & Health",     Icon:IcActivity },
  { id:"analytics", label:"Analytics",        Icon:IcTrend    },
  { id:"subs",      label:"Subscriptions",    Icon:IcCrown    },
  { id:"modules",   label:"Module Access",    Icon:IcPuzzle   },
  { id:"users",     label:"All Users",        Icon:IcUsers    },
  { id:"features",  label:"Feature Requests", Icon:IcClip     },
  { id:"audit",     label:"Audit Logs",       Icon:IcShield   },
  { id:"export",    label:"Data Export",      Icon:IcDownload },
  { id:"sanchalan", label:"Sanchalan",        Icon:IcLock     },
  { id:"bugs",      label:"Bug Inbox",        Icon:IcShield   },
];

export default function SaaSModule() {
  const [tab, setTab]               = useState("stats");
  const [companies, setCompanies]   = useState([]);
  const [selCompany, setSelCompany] = useState(null);
  const [detailCompanyId, setDetailCompanyId] = useState(null);
  const [loadingCo, setLoadingCo]   = useState(true);

  const loadCompanies = useCallback(() => {
    setLoadingCo(true);
    apiFetch("/saas-admin/companies").then(res => {
      if (res.success) setCompanies(res.data);
      setLoadingCo(false);
    }).catch(() => setLoadingCo(false));
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  const handleSelectCompany = (c) => {
    setSelCompany(c);
    setTab("modules");
  };

  const handleOpenDetail = (c) => setDetailCompanyId(c.id);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", fontFamily:"'Segoe UI',system-ui,sans-serif", background:T.bg }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg, #0D1B2A 0%, #1B2D45 100%)", padding:"14px 24px", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:"white", letterSpacing:"-0.3px" }}>Sanchalan · SaaS Admin Panel</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Platform management -- super admin only</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>{companies.length} companies · {companies.reduce((s,c)=>s+c.user_count,0)} users</div>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 12px", background:"rgba(124,58,237,0.2)", border:"1px solid rgba(124,58,237,0.4)", borderRadius:20 }}>
            <IcLock size={12} color="#A78BFA"/>
            <span style={{ fontSize:11, fontWeight:600, color:"#A78BFA" }}>SUPER ADMIN</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background:"#FFFFFF", borderBottom:`1px solid ${T.b1}`, display:"flex", padding:"0 20px", flexShrink:0, overflowX:"auto" }}>
        {TABS.map(t => {
          const isA = tab === t.id;
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setDetailCompanyId(null); }}
              style={{ display:"flex", alignItems:"center", gap:7, padding:"12px 14px", border:"none", background:"none", cursor:"pointer",
                color: isA ? T.blu : T.t3, fontWeight: isA ? 700 : 400, fontSize:12.5,
                borderBottom: isA ? `2.5px solid ${T.blu}` : "2.5px solid transparent",
                transition:"all 0.15s", fontFamily:"inherit", whiteSpace:"nowrap" }}>
              <t.Icon size={14} color={isA ? T.blu : T.t3}/>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {detailCompanyId ? (
          <CompanyDetailPage companyId={detailCompanyId} onBack={() => { setDetailCompanyId(null); loadCompanies(); }}/>
        ) : (
          <>
            {tab === "stats"     && <TabStats/>}
            {tab === "clients"   && <TabClients/>}
            {tab === "companies" && <TabCompanies companies={companies} reload={loadCompanies} onSelectCompany={handleSelectCompany} onOpenDetail={handleOpenDetail}/>}
            {tab === "crm"       && <TabCRMHealth/>}
            {tab === "analytics" && <TabAnalytics/>}
            {tab === "subs"      && <TabSubscriptions companies={companies}/>}
            {tab === "modules"   && <TabModuleAccess selectedCompany={selCompany} companies={companies}/>}
            {tab === "users"     && <TabUsers/>}
            {tab === "features"  && <TabFeatureRequests/>}
            {tab === "audit"     && <TabAuditLogs companies={companies}/>}
            {tab === "export"    && <TabExport companies={companies}/>}
            {tab === "sanchalan" && <TabSanchalan onOpenDetail={handleOpenDetail}/>}
            {tab === "bugs"      && <TabBugInbox/>}
          </>
        )}
      </div>
    </div>
  );
}
