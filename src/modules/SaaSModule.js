import { useState, useEffect, useCallback } from "react";

const API = "https://gb-backend-production-7bd2.up.railway.app/api";
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
function TabCompanies({ companies, reload, onSelectCompany, onOpenDetail }) {
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast]         = useState(null);
  const [form, setForm]           = useState({ name:"", admin_name:"", admin_email:"", phone:"", city:"", state:"", module_type:"construction_individual" });
  const [saving, setSaving]       = useState(false);
  const [toggling, setToggling]   = useState(null);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [detail, setDetail]       = useState(null);
  const [credentials, setCredentials] = useState(null); // shows after create

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
    if (!form.name || !form.admin_name || !form.admin_email) {
      setToast({ msg:"Company name, admin name and email are required", type:"error" }); return;
    }
    setSaving(true);
    const res = await apiFetch("/saas-admin/companies", { method:"POST", body: form });
    setSaving(false);
    if (res.success) {
      setShowModal(false);
      setCredentials(res.data?.credentials || null);
      setForm({ name:"", admin_name:"", admin_email:"", phone:"", city:"", state:"", module_type:"construction_individual" });
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
        </div>
      )}

      {/* Create Company Modal */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:520, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)", overflow:"hidden" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
              <div><div style={{ fontSize:15, fontWeight:700, color:"white" }}>Register New Company</div><div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Password will be auto-generated and shown after creation</div></div>
              <button onClick={() => setShowModal(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
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
                <InputField label="Phone" value={form.phone} onChange={v => setForm(p=>({...p,phone:v}))} placeholder="9876543210"/>
                <InputField label="City" value={form.city} onChange={v => setForm(p=>({...p,city:v}))} placeholder="Raipur"/>
                <InputField label="State" value={form.state} onChange={v => setForm(p=>({...p,state:v}))} placeholder="Chhattisgarh"/>
              </div>
              <div style={{ padding:"10px 14px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb }}>
                <strong>Note:</strong> A secure password will be auto-generated. You'll see the login credentials after creation - share them with the company admin. They should change it on first login.
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setShowModal(false)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn onClick={createCompany} disabled={saving} style={{ flex:2 }}>{saving ? "Registering..." : "Register Company"}</Btn>
            </div>
          </div>
        </>
      )}

      {/* Credentials Modal (shown after company creation) */}
      {credentials && (
        <>
          <div onClick={() => setCredentials(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, backdropFilter:"blur(3px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:440, background:T.surface, borderRadius:16, zIndex:501, boxShadow:"0 24px 64px rgba(0,0,0,0.3)", overflow:"hidden" }}>
            <div style={{ padding:"20px 22px", background:"linear-gradient(135deg, #059669, #10B981)", textAlign:"center" }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                <IcChk size={24} color="white"/>
              </div>
              <div style={{ fontSize:17, fontWeight:800, color:"white" }}>Company Registered!</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginTop:4 }}>Share these credentials with the company admin</div>
            </div>
            <div style={{ padding:"24px 22px" }}>
              <div style={{ background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 18px", marginBottom:16 }}>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>Login Email</div>
                  <div style={{ fontSize:15, fontWeight:700, color:T.blu, fontFamily:"monospace", letterSpacing:"0.3px" }}>{credentials.email}</div>
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
                  navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
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
      const res = await fetch(API + "/saas-admin/export-company/" + selCompany, {
        headers: { Authorization: "Bearer " + tok() }
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

            {/* Last export summary */}
            {lastExport && lastExport._summary && (
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.t3, marginBottom:8, textTransform:"uppercase" }}>Export Summary</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {Object.entries(lastExport._summary).map(([table, count]) => (
                    <div key={table} style={{ padding:"3px 10px", borderRadius:6, background:T.grnL, border:`1px solid ${T.grnM}`, fontSize:11, color:T.grn }}>
                      {table.replace("_"," ")}: <strong>{count}</strong>
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
    if (!window.confirm("Cancel this subscription?")) return;
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
          <div onClick={() => setShowAssign(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
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
    if (!window.confirm("Delete this note?")) return;
    await apiFetch("/saas-admin/crm-notes/" + nid, { method:"DELETE" });
    load();
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

      {/* TAB 3: Users */}
      {tab === "users" && (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <TableHeader columns={["Name","Email","Role","Last Login","Status"]} gridCols="1.5fr 2fr 1fr 1fr 100px"/>
          {users.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No users</div>}
          {users.map((u, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"1.5fr 2fr 1fr 1fr 100px", padding:"11px 16px", borderBottom: i < users.length-1 ? `1px solid ${T.b1}` : "none", alignItems:"center" }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{u.name}</div>
              <div style={{ fontSize:11, color:T.t3 }}>{u.email}</div>
              <div><Badge text={u.role} color={T.pur}/></div>
              <div style={{ fontSize:11, color:T.t4 }}>{u.last_login ? fmtDateTime(u.last_login) : "Never"}</div>
              <div><Badge text={u.is_active ? "Active" : "Inactive"} color={u.is_active ? T.grn : T.red}/></div>
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
          <div onClick={() => setEdit(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
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
  const [seedTarget, setSeedTarget] = useState(null);   // company object or null
  const [seedModules, setSeedModules] = useState({
    projects: true, boq: true, tasks: true, finance: true,
    crm: true, procurement: true, warehouse: true, payroll: true, team: true,
  });
  const [seedScale, setSeedScale] = useState("medium");
  const [seedReset, setSeedReset] = useState(true);
  const [seedFactory, setSeedFactory] = useState(false);
  const [seedDomain, setSeedDomain] = useState("auto");
  const [seeding, setSeeding] = useState(false);

  // ── Demo templates (scenario-based seeders) ─────────────────────
  const [tplTarget, setTplTarget] = useState(null);      // company to apply template to
  const [templates, setTemplates] = useState([]);        // list of available templates
  const [selectedTpl, setSelectedTpl] = useState(null);  // chosen template id
  const [applyingTpl, setApplyingTpl] = useState(false);

  const openTemplatePicker = async (c) => {
    setTplTarget(c);
    setSelectedTpl(null);
    try {
      const r = await apiFetch("/saas-admin/sanchalan/templates");
      if (r.success) setTemplates(r.data || []);
    } catch(_) { setTemplates([]); }
  };

  const applyTemplate = async () => {
    if (!tplTarget || !selectedTpl) return;
    const tpl = templates.find(t => t.id === selectedTpl);
    if (tpl?.status === "stub") {
      setToast({ msg: "This template is coming soon. Pick a full template.", type: "error" });
      return;
    }
    if (!window.confirm(`Apply "${tpl?.name}" to ${tplTarget.name}?\n\nPrevious DEMO data (if any) will be wiped first. Real data stays.\n\nContinue?`)) return;
    setApplyingTpl(true);
    const r = await apiFetch("/saas-admin/sanchalan/companies/" + tplTarget.id + "/apply-template", {
      method: "POST",
      body: { template_id: selectedTpl, wipe: true },
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

  const runSeed = async () => {
    if (!seedTarget) return;
    if (seedFactory && !window.confirm(`⚠️ FACTORY RESET will delete ALL data (real + demo) for "${seedTarget.name}" before seeding.\n\nThis cannot be undone. Continue?`)) return;
    setSeeding(true);
    const mods = Object.keys(seedModules).filter(k => seedModules[k]);
    const r = await apiFetch("/saas-admin/sanchalan/" + seedTarget.id + "/seed-demo", {
      method: "POST",
      body: { modules: mods, scale: seedScale, reset: seedReset, factory: seedFactory, domain: seedDomain },
    });
    setSeeding(false);
    if (r.success) {
      const c = r.data.counts || {};
      const summary = Object.entries(c)
        .filter(([k]) => k !== "wiped" && k !== "factory_reset")
        .map(([k, v]) => `${v} ${k}`)
        .join(", ");
      setToast({ msg: "Seeded: " + (summary || "done"), type: "success" });
      setSeedTarget(null);
      setSeedFactory(false);
      load();
    } else {
      setToast({ msg: r.message || "Seed failed", type: "error" });
    }
  };

  const runFactoryReset = async (c) => {
    if (!window.confirm(`⚠️ FACTORY RESET "${c.name}"?\n\nThis will delete ALL operational data — projects, finance, CRM, procurement, warehouse, payroll, tasks — real and demo both. Company login, users, subscription stay intact.\n\nThis cannot be undone. Continue?`)) return;
    const r = await apiFetch("/saas-admin/sanchalan/" + c.id + "/factory-reset", { method: "POST" });
    if (r.success) {
      setToast({ msg: r.message, type: "success" });
      load();
    } else {
      setToast({ msg: r.message || "Reset failed", type: "error" });
    }
  };

  const runWipe = async (c) => {
    if (!window.confirm(`Wipe ALL demo data from "${c.name}"?\n\nOnly rows marked demo_seed=1 will be deleted. Real data stays.`)) return;
    const r = await apiFetch("/saas-admin/sanchalan/" + c.id + "/seed-demo", { method: "DELETE" });
    if (r.success) {
      const counts = r.data.counts || {};
      const total = Object.values(counts).reduce((s, v) => s + (v || 0), 0);
      setToast({ msg: `Wiped ${total} demo rows from ${c.name}`, type: "success" });
      load();
    } else {
      setToast({ msg: r.message || "Wipe failed", type: "error" });
    }
  };

  const handleUnmark = async (id, name) => {
    if (!window.confirm(`Move "${name}" back to regular customers list?`)) return;
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
                <tr key={c.id} style={{ borderTop:`1px solid ${T.b1}` }}>
                  <td style={td}><div style={{ fontWeight:700, color:T.t1 }}>{c.name}</div><div style={{ fontSize:10.5, color:T.t4 }}>{c.email}</div></td>
                  <td style={td}><code style={{ fontSize:11, color:T.t3 }}>{c.slug}</code></td>
                  <td style={td}>{c.user_count}</td>
                  <td style={td}>{c.project_count}</td>
                  <td style={td}>{c.last_login ? fmtDateTime(c.last_login) : <span style={{color:T.t4}}>never</span>}</td>
                  <td style={td}>{c.is_active ? <Badge text="ACTIVE" color={T.grn}/> : <Badge text="DISABLED" color={T.red}/>}</td>
                  <td style={td}>{fmtDate(c.created_at)}</td>
                  <td style={{...td, textAlign:"right", whiteSpace:"nowrap"}}>
                    <Btn onClick={() => onOpenDetail(c)} variant="secondary" style={{ padding:"5px 10px", fontSize:11, marginRight:6 }}>Details</Btn>
                    <Btn onClick={() => setSeedTarget(c)} color={T.pur} style={{ padding:"5px 10px", fontSize:11, marginRight:6 }}>Seed Demo</Btn>
                    <Btn onClick={() => openTemplatePicker(c)} color="#EC4899" style={{ padding:"5px 10px", fontSize:11, marginRight:6 }}>🎯 Apply Template</Btn>
                    <Btn onClick={() => runWipe(c)} variant="secondary" color={T.amb} style={{ padding:"5px 10px", fontSize:11, marginRight:6 }}>Wipe Demo</Btn>
                    <Btn onClick={() => runFactoryReset(c)} variant="secondary" color={T.red} style={{ padding:"5px 10px", fontSize:11, marginRight:6 }}>Factory Reset</Btn>
                    <Btn onClick={() => handleUnmark(c.id, c.name)} variant="secondary" color={T.slt} style={{ padding:"5px 10px", fontSize:11 }}>Unmark</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Seed demo modal */}
      {seedTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => !seeding && setSeedTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.surface, borderRadius:12, padding:26, width:540, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize:15, fontWeight:800, color:T.t1, marginBottom:4 }}>Seed demo data</div>
            <div style={{ fontSize:12, color:T.t3, marginBottom:18 }}>Target: <b style={{color:T.pur}}>{seedTarget.name}</b> ({seedTarget.internal_label || "internal"})</div>

            {/* Domain */}
            <div style={{ fontSize:11, fontWeight:700, color:T.t2, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Client Background / Domain</div>
            <div style={{ display:"flex", gap:10, marginBottom:18 }}>
              {[
                { id:"auto",         label:"Auto detect",  sub:"From module_type" },
                { id:"construction", label:"Construction", sub:"Villas, BOQ, civil" },
                { id:"solar",        label:"Solar EPC",    sub:"Panels, inverters" },
              ].map(d => (
                <div key={d.id} onClick={() => setSeedDomain(d.id)}
                  style={{ flex:1, padding:"11px 12px", border:`2px solid ${seedDomain===d.id?T.cyn:T.b1}`, borderRadius:9, cursor:"pointer", background:seedDomain===d.id?T.cynL:T.surface }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:seedDomain===d.id?T.cyn:T.t1 }}>{d.label}</div>
                  <div style={{ fontSize:10, color:T.t3, marginTop:2 }}>{d.sub}</div>
                </div>
              ))}
            </div>

            {/* Scale */}
            <div style={{ fontSize:11, fontWeight:700, color:T.t2, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Scale</div>
            <div style={{ display:"flex", gap:10, marginBottom:18 }}>
              {[
                { id:"small",  label:"Small",  sub:"3 projects" },
                { id:"medium", label:"Medium", sub:"8 projects" },
                { id:"large",  label:"Large",  sub:"15 projects" },
              ].map(s => (
                <div key={s.id} onClick={() => setSeedScale(s.id)}
                  style={{ flex:1, padding:"12px 14px", border:`2px solid ${seedScale===s.id?T.pur:T.b1}`, borderRadius:9, cursor:"pointer", background:seedScale===s.id?T.purL:T.surface }}>
                  <div style={{ fontSize:13, fontWeight:700, color:seedScale===s.id?T.pur:T.t1 }}>{s.label}</div>
                  <div style={{ fontSize:10.5, color:T.t3, marginTop:2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Modules */}
            <div style={{ fontSize:11, fontWeight:700, color:T.t2, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Modules to seed</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:18 }}>
              {[
                ["projects","Projects"], ["boq","BOQ items"], ["tasks","Tasks"],
                ["finance","Finance txns"], ["crm","CRM leads"], ["procurement","Procurement"],
                ["warehouse","Warehouse"], ["payroll","Payroll"], ["team","Team Schedule"],
              ].map(([k, label]) => (
                <label key={k} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", border:`1px solid ${T.b1}`, borderRadius:7, cursor:"pointer", fontSize:12, background:seedModules[k]?T.purL:T.surfaceB }}>
                  <input type="checkbox" checked={!!seedModules[k]} onChange={e => setSeedModules({...seedModules, [k]:e.target.checked})}/>
                  <span style={{ color:seedModules[k]?T.pur:T.t2, fontWeight:seedModules[k]?700:500 }}>{label}</span>
                </label>
              ))}
            </div>

            {/* Reset */}
            <label style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:seedFactory?T.sltL:T.ambL, border:`1px solid ${seedFactory?T.b2:T.ambM}`, borderRadius:8, marginBottom:8, cursor: seedFactory?"not-allowed":"pointer", fontSize:12, opacity: seedFactory?0.5:1 }}>
              <input type="checkbox" checked={seedReset} disabled={seedFactory} onChange={e => setSeedReset(e.target.checked)}/>
              <span style={{ color:T.amb, fontWeight:600 }}>Wipe existing demo rows first (recommended)</span>
            </label>

            {/* Factory reset */}
            <label style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:T.redL, border:`1px solid ${T.redM}`, borderRadius:8, marginBottom:18, cursor:"pointer", fontSize:12 }}>
              <input type="checkbox" checked={seedFactory} onChange={e => setSeedFactory(e.target.checked)}/>
              <span style={{ color:T.red, fontWeight:700 }}>⚠ Factory reset first — delete ALL data (real + demo) before seeding</span>
            </label>

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn variant="secondary" onClick={() => setSeedTarget(null)} disabled={seeding}>Cancel</Btn>
              <Btn color={T.pur} onClick={runSeed} disabled={seeding}>
                {seeding ? "Seeding… (may take 10-20s)" : "Seed demo data"}
              </Btn>
            </div>
          </div>
        </div>
      )}

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
            <div style={{ padding:"16px 22px", overflowY:"auto", flex:1 }}>
              {templates.length === 0 && <div style={{ padding:40, textAlign:"center", color:T.t4, fontSize:12 }}>Loading templates…</div>}
              {templates.map(t => {
                const isStub = t.status === "stub";
                const isSelected = selectedTpl === t.id;
                return (
                  <div key={t.id} onClick={() => !isStub && setSelectedTpl(t.id)}
                    style={{
                      padding:"12px 14px", marginBottom:8, borderRadius:8,
                      border:`2px solid ${isSelected ? "#EC4899" : isStub ? "#E5E7EB" : "#E5E7EB"}`,
                      background:isSelected ? "#FDF2F8" : isStub ? "#F9FAFB" : "white",
                      cursor:isStub ? "not-allowed" : "pointer",
                      opacity:isStub ? 0.55 : 1,
                      transition:"all 0.15s",
                    }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:isSelected ? "#BE185D" : T.t1, marginBottom:3, display:"flex", alignItems:"center", gap:8 }}>
                          {t.name}
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
              })}
            </div>
            {/* Footer */}
            <div style={{ padding:"14px 22px", borderTop:"1px solid #E5E7EB", background:"#F9FAFB", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:11, color:T.t3 }}>
                {selectedTpl ? <span>Selected: <b>{templates.find(t=>t.id===selectedTpl)?.name || ""}</b></span> : "Pick a template to apply"}
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
// MAIN SAAS MODULE
// ════════════════════════════════════════════════════════════════════════
const TABS = [
  { id:"stats",     label:"Dashboard",        Icon:IcTrend    },
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
            <button key={t.id} onClick={() => setTab(t.id)}
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
          </>
        )}
      </div>
    </div>
  );
}
