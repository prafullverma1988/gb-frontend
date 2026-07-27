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
// Platform ops — scheduler, email queue and the auto-email switch. These were
// the only genuinely useful controls on the old CRM & Health tab, so they moved
// onto the Dashboard rather than dying with it.
function PlatformOps({ setOuterToast }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiFetch("/saas-admin/crm-dashboard").then(r => setD(r.success ? r.data : null)).catch(() => setD(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (path, label) => {
    setBusy(true);
    const res = await apiFetch(path, { method: "POST" });
    setBusy(false);
    setOuterToast({ msg: res.success ? (res.message || label + " done") : (res.message || label + " failed"), type: res.success ? "success" : "error" });
    load();
  };

  const toggleAutoEmails = async (next) => {
    await apiFetch("/saas-admin/platform-settings", { method: "PUT", body: { auto_emails_enabled: next } });
    setOuterToast({ msg: next ? "Auto emails ON" : "Auto emails OFF", type: "success" });
    load();
  };

  const em = d?.email_stats || {};
  const autoOn = String(d?.settings?.auto_emails_enabled ?? "1") === "1";

  return (
    <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
      <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Platform Ops</span>
        <IcCog size={14} color={T.t4}/>
      </div>
      <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.t1 }}>Auto emails</div>
            <div style={{ fontSize:10.5, color:T.t4 }}>{em.sent || 0} sent · {em.queued || 0} queued · {em.failed || 0} failed</div>
          </div>
          <Toggle value={autoOn} onChange={toggleAutoEmails}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, borderTop:`1px solid ${T.b1}`, paddingTop:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.t1 }}>Scheduler</div>
            <div style={{ fontSize:10.5, color:T.t4 }}>Last run: {d?.last_scheduler_run ? fmtDateTime(d.last_scheduler_run) : "never"}</div>
          </div>
          <div style={{ display:"flex", gap:7 }}>
            <Btn variant="outline" disabled={busy} onClick={() => run("/saas-admin/email-queue/flush", "Flush emails")} style={{ padding:"5px 10px", fontSize:11 }}>Flush Emails</Btn>
            <Btn disabled={busy} onClick={() => run("/saas-admin/scheduler/run", "Scheduler")} style={{ padding:"5px 10px", fontSize:11 }}>{busy ? "..." : "Run Now"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabStats() {
  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

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
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      <PageHeader title="Platform Overview" sub="Revenue, billing gaps and platform health" right={
        <Btn onClick={load} variant="outline"><IcRefresh size={13}/> Refresh</Btn>
      }/>

      {/* Money — all of it from real client contracts (utils/saasRevenue.js) */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:12 }}>
        <StatCard label="MRR"          value={"₹" + fmtMoney(kpi.mrr || 0)}         sub={`ARR: ₹${fmtMoney(kpi.arr || 0)} · ${kpi.active_subs || 0} contracts`} color={T.grn} Icon={IcDollar}/>
        <StatCard label="Collected"    value={"₹" + fmtMoney(kpi.collected || 0)}   sub="paid invoices, incl. GST" color={T.cyn} Icon={IcChk}/>
        <StatCard label="Outstanding"  value={"₹" + fmtMoney(kpi.outstanding || 0)}
          sub={kpi.overdue_count > 0 ? `${kpi.overdue_count} overdue · ₹${fmtMoney(kpi.overdue)}` : "nothing overdue"}
          color={kpi.overdue_count > 0 ? T.red : T.amb} Icon={IcActivity}/>
        {/* Replaces the old "Free Trial" card. Trials were counted from the
            legacy plan table that nothing enforces; an unbilled live customer
            is the number that actually costs money. */}
        <StatCard label="Billing Gaps" value={fmtNum(kpi.billing_gap_count || 0)}
          sub={kpi.billing_gap_count > 0 ? "live but not billed" : "every customer is billed"}
          color={kpi.billing_gap_count > 0 ? T.amb : T.grn} Icon={IcClip}/>
      </div>

      {/* Tenancy + health */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
        <StatCard label="Companies"     value={fmtNum(kpi.total || data.companies.total)} sub={`${kpi.billed || 0} billed · ${kpi.unbilled || 0} unbilled`} color={T.pur} Icon={IcBuilding}/>
        <StatCard label="Total Users"   value={fmtNum(data.users.total)}          sub={`${data.users.active||0} active`} color={T.cyn} Icon={IcUsers}/>
        <StatCard label="Expiring Soon" value={fmtNum(kpi.expiring_count || 0)}   sub="contracts, next 30 days" color={T.amb} Icon={IcActivity}/>
        <StatCard label="Churn Risk"    value={fmtNum(kpi.churn_risk_count || 0)} sub="no login 15+ days" color={T.red} Icon={IcShield}/>
      </div>

      {/* Retention alerts row */}
      {metrics && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
          {/* Billing gaps — replaces "Trial Ending Soon", which counted rows in
              the legacy plan table. This is the state that actually loses money:
              a customer working normally that nobody is invoicing. */}
          <div style={{ background:T.surface, border:`1px solid ${T.ambM}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", background:T.ambL, borderBottom:`1px solid ${T.ambM}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, fontWeight:700, color:T.amb }}>Billing gaps</span>
              <span style={{ fontSize:10, color:T.amb, fontWeight:600 }}>{(metrics.billing_gaps||[]).length} customers</span>
            </div>
            <div style={{ maxHeight:200, overflowY:"auto" }}>
              {(metrics.billing_gaps||[]).length === 0 && <div style={{ padding:20, textAlign:"center", color:T.t4, fontSize:11 }}>Every live customer is billed</div>}
              {(metrics.billing_gaps||[]).map((c, i) => (
                <div key={i} style={{ padding:"9px 14px", borderBottom:`1px solid ${T.b1}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                    <div style={{ fontSize:10, color:T.t4 }}>{c.company_count} {c.company_count === 1 ? "company" : "companies"}</div>
                  </div>
                  <Badge text={c.sub_status ? c.sub_status.toUpperCase() : "NO SUB"} color={T.amb}/>
                </div>
              ))}
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
                      {/* Client contract, not a per-company plan row */}
                      <div style={{ fontSize:10, color:T.t4 }}>
                        ₹{fmtMoney(c.base_annual_value)}/yr · {c.company_count} {c.company_count === 1 ? "company" : "companies"}
                      </div>
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
                    <div style={{ fontSize:10, color:T.t4 }}>{c.client_name || "no client"}</div>
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
                      <div style={{ fontSize:10, color:T.t4 }}>
                        {c.company_count} {c.company_count === 1 ? "company" : "companies"} · {c.user_count} users
                        {parseFloat(c.total_paid) > 0 ? ` · ₹${fmtMoney(c.total_paid)} collected` : " · nothing collected yet"}
                      </div>
                    </div>
                  </div>
                  {/* Contracted annual value — the honest ranking key. "Collected"
                      stays in the subtitle because invoices may not be paid yet. */}
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.grn }}>₹{fmtMoney(c.acv)}</div>
                    <div style={{ fontSize:9.5, color:T.t4 }}>ACV / yr</div>
                  </div>
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

        {/* Platform Ops — the useful half of the old CRM & Health tab.
            The rest of that tab (health distribution, at-risk list) duplicated
            the churn-risk card above, so it went with the tab. */}
        <PlatformOps setOuterToast={setToast}/>

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

function CompanyModulesTab({ companyId }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);
  const [toast, setToast]     = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // NOTE: /companies/:id/modules (not full-details.modules) — this endpoint
    // returns the full catalogue with label/tier/canDisable, which the toggle
    // rows need. full-details only carries raw company_modules rows.
    apiFetch("/saas-admin/companies/" + companyId + "/modules").then(res => {
      if (!alive) return;
      if (res.success) setModules(res.data || []);
      setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [companyId]);

  const toggle = async (key, newVal) => {
    setSaving(key);
    const res = await apiFetch("/saas-admin/companies/" + companyId + "/modules/" + key, {
      method: "PUT", body: { is_enabled: newVal },
    });
    if (res.success) {
      setModules(prev => prev.map(m => m.key === key ? { ...m, is_enabled: newVal } : m));
      setToast({ msg: res.message, type: "success" });
    } else {
      setToast({ msg: res.message, type: "error" });
    }
    setSaving(null);
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:T.t3, fontSize:13 }}>Loading modules...</div>;
  if (!modules.length) return <EmptyState Icon={IcPuzzle} text="No modules configured for this company"/>;

  const core = modules.filter(m => !m.canDisable);
  const std  = modules.filter(m => m.canDisable);

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Module Access</div>
        <div style={{ padding:"6px 12px", background:T.bluL, border:`1px solid ${T.bluM}`, borderRadius:8, fontSize:11.5, color:T.blu, fontWeight:600 }}>
          {modules.filter(m => m.is_enabled).length} / {modules.length} enabled
        </div>
      </div>
      <div style={{ marginBottom:6, fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:"1px", display:"flex", alignItems:"center", gap:8 }}>
        Core Modules <div style={{ flex:1, height:1, background:T.b1 }}/> <Badge text="Always included" color={T.grn}/>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:20 }}>
        {core.map(m => <ModAccessRow key={m.key} m={m} saving={saving} onToggle={toggle}/>)}
      </div>
      <div style={{ marginBottom:6, fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:"1px", display:"flex", alignItems:"center", gap:8 }}>
        Standard Modules <div style={{ flex:1, height:1, background:T.b1 }}/> <Badge text="Toggleable" color={T.amb}/>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {std.map(m => <ModAccessRow key={m.key} m={m} saving={saving} onToggle={toggle}/>)}
      </div>
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
  const [showEdit, setShowEdit] = useState(false);        // Edit Company modal
  const [showResetAdmin, setShowResetAdmin] = useState(false);
  const [resetMobile, setResetMobile] = useState("");
  const [resettingAdmin, setResettingAdmin] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  // Regenerate the primary admin's login (and optionally set their mobile).
  // Moved here from the Companies tab — it is a company-scoped action.
  const resetAdminLogin = async () => {
    const m = (resetMobile || "").trim();
    if (m && !/^[6-9]\d{9}$/.test(m)) return setToast({ msg:"Enter a valid 10-digit mobile number", type:"error" });
    setResettingAdmin(true);
    const res = await apiFetch("/saas-admin/companies/" + companyId + "/reset-admin-login", {
      method:"POST", body: m ? { mobile: m } : {},
    });
    setResettingAdmin(false);
    if (res.success) { setShowResetAdmin(false); setResetMobile(""); setNewCreds(res.data?.credentials || null); load(); }
    else setToast({ msg: res.message || "Reset failed", type:"error" });
  };

  // Complete tenant export (information_schema-driven, same artifact the purge
  // flow uses for recovery). Was a top-level tab with a company picker.
  const doExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(API + "/saas-admin/companies/" + companyId + "/export-data", {
        method: "POST",
        headers: { Authorization: "Bearer " + tok(), "Content-Type": "application/json" },
      });
      const out = await res.json();
      if (out.success) {
        const blob = new Blob([JSON.stringify(out.data, null, 2)], { type:"application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `export_${out.data.company?.slug || companyId}_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setToast({ msg: `Exported ${out.data.meta.table_count} tables · ${out.data.meta.total_rows} rows`, type:"success" });
      } else setToast({ msg: out.message || "Export failed", type:"error" });
    } catch (e) {
      setToast({ msg:"Export failed: " + e.message, type:"error" });
    }
    setExporting(false);
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

      {/* Company-scoped actions — all of these used to live in the Companies tab
          or as their own top-level tab with a company picker. */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <Btn variant="outline" onClick={() => setShowEdit(true)}><IcEdit size={13}/> Edit</Btn>
        <Btn variant="outline" onClick={() => { setShowResetAdmin(true); setResetMobile(""); }}>Reset Admin Login</Btn>
        <Btn variant="outline" onClick={doExport} disabled={exporting}>
          <IcDownload size={13}/> {exporting ? "Exporting..." : "Export Data"}
        </Btn>
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
            {/* The CLIENT's contract — a company has no subscription of its own */}
            <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:14 }}>Client Contract</div>
            {current_sub ? (
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:T.blu }}>₹{fmtMoney(current_sub.base_annual_value)}<span style={{ fontSize:11, fontWeight:500, color:T.t4 }}> / yr</span></div>
                <div style={{ fontSize:11, color:T.t4, marginBottom:10 }}>{current_sub.billing_cycle} · <Badge text={current_sub.status} color={current_sub.status === "active" ? T.grn : T.amb}/></div>
                <div style={{ fontSize:11, color:T.t3 }}>Valid till <strong style={{ color:T.t1 }}>{fmtDate(current_sub.end_date)}</strong></div>
                <div style={{ fontSize:11, color:T.t3 }}>{current_sub.committed_users} committed users</div>
                <div style={{ fontSize:10.5, color:T.t4, marginTop:6 }}>{current_sub.client_name} · invoices under Customers</div>
              </div>
            ) : <div style={{ fontSize:12, color:T.t4 }}>No contract on this company's client</div>}
          </div>
        </div>
      )}

      {/* TAB 2: Subscription */}
      {tab === "subscription" && (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, fontSize:13, fontWeight:700, color:T.t1 }}>
            Client Contract History
            <span style={{ fontSize:10.5, fontWeight:400, color:T.t4, marginLeft:8 }}>billing is client-level — edit under Customers</span>
          </div>
          {subscriptions.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No contract on this company's client</div>}
          {subscriptions.map((s, i) => (
            <div key={i} style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}`, display:"grid", gridTemplateColumns:"1.5fr 1fr 1.2fr 1fr 1fr", gap:10, alignItems:"center" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>₹{fmtMoney(s.base_annual_value)}/yr</div>
                <div style={{ fontSize:10, color:T.t4 }}>{s.billing_cycle} · {s.term_months}mo term</div>
              </div>
              <div><Badge text={s.status} color={s.status === "active" ? T.grn : s.status === "pending" ? T.amb : T.slt}/></div>
              <div style={{ fontSize:11, color:T.t3 }}>{fmtDate(s.start_date)} → {fmtDate(s.end_date)}</div>
              <div style={{ fontSize:12, color:T.t2 }}>{s.committed_users} users</div>
              <div style={{ fontSize:11, color:T.t4 }}>{s.order_ref || "--"}</div>
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

      {/* TAB 4: Module Access — editable, was a separate top-level tab */}
      {tab === "modules" && (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
          <CompanyModulesTab companyId={companyId}/>
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

      {/* Edit Company — profile + the admin's login identity */}
      {showEdit && (
        <EditCompanyModal company={company}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }}
          setToast={setToast}/>
      )}

      {/* Reset Admin Login */}
      {showResetAdmin && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:440, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)", overflow:"hidden" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Reset Admin Login</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{company.name}</div>
              </div>
              <button onClick={() => setShowResetAdmin(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
              <InputField label="Login Mobile (leave blank to keep current)" value={resetMobile} onChange={v => setResetMobile(v.replace(/\D/g,"").slice(0,10))} placeholder="Set / change 10-digit mobile"/>
              <div style={{ padding:"10px 14px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb }}>
                A new password will be generated and shown once. Share the <strong>mobile + password</strong> with the admin. (OTP login also works as a fallback.)
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setShowResetAdmin(false)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn onClick={resetAdminLogin} disabled={resettingAdmin} style={{ flex:2 }}>{resettingAdmin ? "Resetting..." : "Generate New Password"}</Btn>
            </div>
          </div>
        </>
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

// Add a company to an EXISTING client. The client is fixed by context, so
// there is no client picker to get wrong — that ambiguity is exactly what the
// old standalone Companies tab had. For a brand-new paying customer use
// NewCustomerModal, which also creates the client and its contract.
function AddCompanyModal({ client, onClose, onSaved, setToast }) {
  const [f, setF] = useState({ name:"", module_type:"construction_company",
                               admin_name:"", admin_email:"", phone:"", city:"", state:"" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.name.trim() || !f.admin_name.trim() || !f.admin_email.trim() || !f.phone.trim())
      return setToast({ msg:"Company naam, admin naam, email aur mobile zaroori hai", type:"error" });
    if (!/^[6-9]\d{9}$/.test(f.phone.trim()))
      return setToast({ msg:"Admin mobile 10-digit hona chahiye — yahi login id hai", type:"error" });
    setSaving(true);
    const res = await apiFetch("/saas-admin/companies", { method:"POST", body: { ...f, client_id: client.id } });
    setSaving(false);
    // Same reason as NewCustomerModal: do NOT refresh the parent yet, or its
    // loading state unmounts this modal before the one-time password is read.
    if (res.success) setDone(res.data);
    else setToast({ msg: res.message || "Company create nahi hui", type:"error" });
  };

  const finish = () => { onSaved(); onClose(); };

  if (done) {
    return (
      <>
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, backdropFilter:"blur(3px)" }}/>
        <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:430, background:T.surface, borderRadius:16, zIndex:501, boxShadow:"0 24px 64px rgba(0,0,0,0.3)", overflow:"hidden" }}>
          <div style={{ padding:"20px 22px", background:"linear-gradient(135deg, #059669, #10B981)", textAlign:"center" }}>
            <div style={{ fontSize:17, fontWeight:800, color:"white" }}>{done.name} ban gayi</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginTop:3 }}>{client.name} ke neeche</div>
          </div>
          <div style={{ padding:"22px" }}>
            <div style={{ background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 18px", marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>Login Mobile</div>
              <div style={{ fontSize:16, fontWeight:800, color:T.blu, fontFamily:"monospace" }}>{done.credentials.mobile}</div>
              <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", margin:"12px 0 4px" }}>Password</div>
              <div style={{ fontSize:17, fontWeight:800, color:T.t1, fontFamily:"monospace", background:T.ambL, padding:"7px 11px", borderRadius:6, border:`1px solid ${T.ambM}` }}>{done.credentials.password}</div>
              <div style={{ fontSize:10.5, color:T.t4, marginTop:5 }}>Pehli login par badalna padega.</div>
            </div>
            <div style={{ display:"flex", gap:9 }}>
              <Btn variant="outline" style={{ flex:1 }} onClick={() => {
                navigator.clipboard.writeText(`Login Mobile: ${done.credentials.mobile}\nPassword: ${done.credentials.password}`);
                setToast({ msg:"Credentials copied" });
              }}>Copy</Btn>
              <Btn style={{ flex:2 }} onClick={finish}>Done</Btn>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:540, maxHeight:"90vh", overflowY:"auto", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>New Company</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{client.name} ke neeche · billing isi client par lagti hai</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
        </div>
        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Company Name" required value={f.name} onChange={set("name")} placeholder="e.g. Ratna Unit 2"/>
            <SelectField label="Business Type" value={f.module_type} onChange={set("module_type")}
              options={Object.entries(DOMAIN_LABELS).map(([k,v]) => ({ value:k, label:v }))}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Admin Name" required value={f.admin_name} onChange={set("admin_name")} placeholder="Full name"/>
            <InputField label="Admin Email" required value={f.admin_email} onChange={set("admin_email")} placeholder="admin@company.com"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Admin Mobile (login id)" required value={f.phone} onChange={v => set("phone")(v.replace(/\D/g,"").slice(0,10))} placeholder="9876543210"/>
            <InputField label="City" value={f.city} onChange={set("city")} placeholder="Raipur"/>
            <InputField label="State" value={f.state} onChange={set("state")} placeholder="Chhattisgarh"/>
          </div>
          <div style={{ padding:"10px 14px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb }}>
            <strong>Admin Mobile hi login id hai.</strong> Password create ke baad ek baar dikhega.
          </div>
        </div>
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
          <Btn onClick={onClose} variant="outline" style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={save} disabled={saving} style={{ flex:2 }}>{saving ? "Creating..." : "Create Company"}</Btn>
        </div>
      </div>
    </>
  );
}

function ClientDetail({ clientId, onBack, onOpenCompany }) {
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
  const [showAddCompany, setShowAddCompany] = useState(false);
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
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <span style={{ fontSize:12.5, fontWeight:700, color:T.t1 }}>Companies ({companies.length})</span>
            {/* Adding a company lives here now — it is a client-scoped action,
                and doing it from here means the client is never ambiguous. */}
            <Btn onClick={() => setShowAddCompany(true)} style={{ padding:"4px 10px", fontSize:11 }}
              disabled={client.max_companies > 0 && companies.length >= client.max_companies}>
              <IcPlus size={11}/> Company
            </Btn>
          </div>
          {client.max_companies > 0 && companies.length >= client.max_companies && (
            <div style={{ padding:"8px 16px", fontSize:11, color:T.red, background:T.redL, borderBottom:`1px solid ${T.b1}` }}>
              Company limit poora ho gaya ({companies.length}/{client.max_companies}) — limit badhao tabhi nayi company banegi.
            </div>
          )}
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
              <div style={{ minWidth:0, cursor: onOpenCompany ? "pointer" : "default" }}
                onClick={() => onOpenCompany && onOpenCompany(c)}
                title={onOpenCompany ? "Open company details" : undefined}>
                <div style={{ fontSize:12.5, fontWeight:600, color: onOpenCompany ? T.blu : T.t1 }}>{c.name}</div>
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
      {showAddCompany && <AddCompanyModal client={client} onClose={() => setShowAddCompany(false)} onSaved={load} setToast={setToast}/>}
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

// ── CUSTOMERS — the merged Clients + Companies surface ────────────────
// Was two tabs that showed the same tenants from two angles and never agreed.
// Now one list: paying client on top, its companies nested underneath.
function TabCustomers({ onOpenCompany }) {
  const [clients, setClients] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showInternal, setShowInternal] = useState(false);
  const [toast, setToast] = useState(null);
  const [expanded, setExpanded] = useState({});   // clientId -> bool (override)
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/saas-admin/clients"),
      apiFetch("/saas-admin/billing/overview"),
      // Companies are shown nested under their client, so this tab owns both
      // levels now — the separate Companies tab is gone.
      apiFetch("/saas-admin/companies"),
    ]).then(([r1, r2, r3]) => {
      if (r1.success) setClients(r1.data);
      if (r2.success) setOverview(r2.data);
      if (r3.success) setCompanies(r3.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (selId) return <ClientDetail clientId={selId} onBack={() => { setSelId(null); load(); }} onOpenCompany={onOpenCompany}/>;
  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.t3, fontSize:13 }}>Loading customers...</div>;

  const kpi = overview?.kpi || {};
  const overdueInvoices = (overview?.upcoming || []).filter(i => i.is_overdue);
  // Live customers with no usable subscription — they work fine but are billed
  // for nothing. Backend derives the flag (saas-clients.js GET /clients).
  const billingGaps = clients.filter(c => c.billing_gap);

  // Companies grouped under their owning client.
  const byClient = {};
  for (const co of companies) {
    if (co.client_id == null) continue;
    (byClient[co.client_id] = byClient[co.client_id] || []).push(co);
  }

  const q = search.trim().toLowerCase();
  const visible = clients
    .filter(c => showInternal || !c.is_internal)
    .filter(c => !q
      || c.name.toLowerCase().includes(q)
      || (byClient[c.id] || []).some(co =>
           co.name.toLowerCase().includes(q) || (co.slug || "").toLowerCase().includes(q)));

  return (
    <div style={{ padding:"18px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      <PageHeader title="Customers" sub="Paying clients, unki companies, limits aur billing — sab ek jagah"
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

      {/* Search across both levels */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ position:"relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer or company..."
            style={{ width:280, padding:"7px 12px 7px 30px", borderRadius:8, border:`1px solid ${T.b1}`, fontSize:12, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit" }}/>
          <IcSearch size={12} color={T.t4} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
        </div>
        <div style={{ fontSize:11.5, color:T.t4 }}>{visible.length} customers · {visible.reduce((n, c) => n + (byClient[c.id]?.length || 0), 0)} companies</div>
      </div>

      {/* ── Customers: one row per PAYING CLIENT, its companies nested ──────
          Client-primary because every money and enforcement concept is
          client-level: limits count users distinct-by-phone across ALL the
          client's companies, the subscription is one contract, and suspension
          applies to the client. A company-primary list literally cannot render
          the usage-vs-limit column correctly. Single-company clients expand
          inline so the common case still reads flat. */}
      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden" }}>
        <TableHeader gridCols="2fr 1fr 1fr 1fr 1.2fr 1fr 1fr" columns={["Customer / Company", "Companies", "Users", "Projects", "Subscription", "Next Due", "Collected"]}/>
        {visible.length === 0 && <EmptyState Icon={IcUsers} text="Koi customer nahi — New Customer se shuru karo"/>}
        {visible.map(c => {
          const cos  = byClient[c.id] || [];
          const open = expanded[c.id] ?? (cos.length === 1);   // 1-company clients read flat
          return (
            <div key={c.id}>
              <div onClick={() => setSelId(c.id)}
                style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1.2fr 1fr 1fr", padding:"12px 16px", borderTop:`1px solid ${T.b1}`, cursor:"pointer", alignItems:"center", background: c.status === "suspended" ? T.redL : "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = c.status === "suspended" ? T.redL : T.surfaceB}
                onMouseLeave={e => e.currentTarget.style.background = c.status === "suspended" ? T.redL : "transparent"}>
                <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
                  {cos.length > 1 && (
                    <button onClick={e => { e.stopPropagation(); setExpanded(p => ({ ...p, [c.id]: !open })); }}
                      title={open ? "Collapse" : "Expand"}
                      style={{ width:20, height:20, flexShrink:0, border:`1px solid ${T.b1}`, background:T.surfaceB, borderRadius:5, cursor:"pointer", color:T.t3, fontSize:11, lineHeight:1, fontFamily:"inherit" }}>
                      {open ? "−" : "+"}
                    </button>
                  )}
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.t1, display:"flex", alignItems:"center", gap:8 }}>
                      {c.name}
                      {c.is_internal ? <Badge text="INT" color={T.pur}/> : null}
                      {c.status === "suspended" && <Badge text="SUSPENDED" color={T.red}/>}
                      {c.billing_gap && <Badge text="NO BILLING" color={T.amb}/>}
                    </div>
                    <div style={{ fontSize:10.5, color:T.t4 }}>{[c.city, c.state].filter(Boolean).join(", ") || "--"}</div>
                  </div>
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

              {/* Nested companies — click goes to the company page, not the client */}
              {open && cos.map(co => (
                <div key={co.id} onClick={e => { e.stopPropagation(); onOpenCompany && onOpenCompany(co); }}
                  style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1.2fr 1fr 1fr", padding:"8px 16px 8px 34px", borderTop:`1px solid ${T.b1}`, cursor:"pointer", alignItems:"center", background:T.surfaceB }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bluL}
                  onMouseLeave={e => e.currentTarget.style.background = T.surfaceB}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
                    <IcBuilding size={12} color={T.t4}/>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12.5, fontWeight:600, color:T.t1, display:"flex", alignItems:"center", gap:7 }}>
                        {co.name}
                        {!co.is_active && <Badge text="INACTIVE" color={T.red}/>}
                      </div>
                      <div style={{ fontSize:10, color:T.t4 }}>/{co.slug} · {DOMAIN_LABELS[co.module_type] || co.module_type || "--"}</div>
                    </div>
                  </div>
                  <div/>
                  <div style={{ fontSize:12, color:T.t2, textAlign:"left" }}>{co.user_count}</div>
                  <div style={{ fontSize:12, color:T.t2, textAlign:"left" }}>{co.project_count}</div>
                  <div style={{ fontSize:10.5, color:T.t4 }}>Registered {fmtDate(co.created_at)}</div>
                  <div/>
                  <div style={{ fontSize:10.5, color:T.blu, fontWeight:600 }}>Open →</div>
                </div>
              ))}
            </div>
          );
        })}
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

// 13 tabs -> 7. Removed:
//   Companies    -> merged into Customers (companies nest under their client)
//   Module Access-> company detail page, where it is already scoped
//   Data Export  -> button on the company detail page
//   Subscriptions-> deleted; it edited the legacy per-company plan table
//   Analytics    -> deleted. Cohort retention, conversion funnel and churn
//                   prediction were computing over a handful of tenants and one
//                   contract; they rendered confident-looking empty charts.
//   CRM & Health -> deleted. Its churn/health lists duplicated the Dashboard;
//                   its genuinely useful half (scheduler, email queue, auto-email
//                   toggle) moved onto the Dashboard as Platform Ops.
const TABS = [
  { id:"stats",     label:"Dashboard",        Icon:IcTrend    },
  { id:"customers", label:"Customers",        Icon:IcDollar   },
  { id:"users",     label:"All Users",        Icon:IcUsers    },
  { id:"features",  label:"Feature Requests", Icon:IcClip     },
  { id:"audit",     label:"Audit Logs",       Icon:IcShield   },
  { id:"sanchalan", label:"Sanchalan",        Icon:IcLock     },
  { id:"bugs",      label:"Bug Inbox",        Icon:IcShield   },
];

export default function SaaSModule() {
  const [tab, setTab]               = useState("stats");
  const [companies, setCompanies]   = useState([]);
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

  // The old selCompany/"jump to Module Access tab" plumbing is gone — module
  // access now lives inside the company detail page, so opening a company IS
  // the navigation.
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
            {tab === "customers" && <TabCustomers onOpenCompany={handleOpenDetail}/>}
            {tab === "users"     && <TabUsers/>}
            {tab === "features"  && <TabFeatureRequests/>}
            {tab === "audit"     && <TabAuditLogs companies={companies}/>}
            {tab === "sanchalan" && <TabSanchalan onOpenDetail={handleOpenDetail}/>}
            {tab === "bugs"      && <TabBugInbox/>}
          </>
        )}
      </div>
    </div>
  );
}
