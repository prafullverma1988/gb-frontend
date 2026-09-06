// ════════════════════════════════════════════════════════════════════
// TENDERS MODULE (T1 — record-keeping core)
//
// Government-contractor tender ka record: NIT → bid → EMD/BG jama →
// won/lost → agreement + work order → execution → DLP → closed.
//
// Backend: gb-backend/routes/tenders.js (GET/POST /tenders, GET/PUT/DELETE
// /tenders/:id, instruments, documents, link-project). Backend hi alerts +
// KPIs compute karta hai — yahan sirf render hota hai.
//
// NOTE: "New Site" ek hi call hai — POST /projects optional tender_id
// leta hai aur usi INSERT me link kar deta hai. "Link Existing Project"
// alag rasta hai, wo PUT /tenders/:id/link-project use karta hai.
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PhotoLocateModal from "./tabs/PhotoLocateModal";
import TenderAiPlan from "./tabs/TenderAiPlan";
import DangerDelete from "./shared/DangerDelete";
import * as XLSX from "xlsx";
import api, { getUser, API_BASE, getToken } from "../config/api";
import { useToast } from "../components/Toast";
// Receipt lene ke liye Finance ka hi form dobara use hota hai — TabParty aur
// TabTransaction bhi yahi karte hain, taaki receipt banane ke rules ek jagah rahein.
import { CreateTransactionModal } from "./FinanceModule";
import { t, Rich } from "../i18n";

// ── THEME TOKENS ────────────────────────────────────────────────────
// Module self-contained rehta hai (Finance/CRM/Projects jaisa) — inhi
// values ka shared copy src/modules/shared/tokens.js me bhi hai.
const T = {
  bg:"#F4F6F9", surface:"#FFFFFF", surfaceB:"#F8F9FB",
  t1:"#111827", t2:"#374151", t3:"#6B7280", t4:"#9CA3AF",
  b1:"#E5E7EB", b2:"#D1D5DB",
  blu:"#2563EB", bluL:"#EFF6FF", bluM:"#BFDBFE",
  grn:"#059669", grnL:"#ECFDF5", grnM:"#A7F3D0",
  amb:"#D97706", ambL:"#FFFBEB", ambM:"#FDE68A",
  red:"#DC2626", redL:"#FEF2F2", redM:"#FECACA",
  slt:"#64748B", sltL:"#F1F5F9",
  pur:"#7C3AED", purL:"#F5F3FF",
  ind:"#4B45C4", indL:"#EEF0FB", indM:"#C7C9F0",
};

// ── ICONS ───────────────────────────────────────────────────────────
const Ic = ({d,size=18,color="currentColor",sw=1.8,fill="none",style}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}><path d={d}/></svg>
);
const IcBack   = (p)=><Ic {...p} d="M19 12H5M12 19l-7-7 7-7"/>;
const IcAdd    = (p)=><Ic {...p} d="M12 5v14M5 12h14"/>;
const IcX      = (p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcDown   = (p)=><Ic {...p} d="M6 9l6 6 6-6"/>;
const IcSrch   = (p)=><Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;
const IcEdit   = (p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcWarn   = (p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;
const IcBank   = (p)=><Ic {...p} d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11"/>;
const IcDoc    = (p)=><Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"/>;
const IcSite   = (p)=><Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/>;
const IcGavel  = (p)=><Ic {...p} d="M3 21h9M6 15l6-6M4 11l6 6M14.5 3.5l6 6M17.5 6.5L11 13"/>;
const IcRupee  = (p)=><Ic {...p} d="M6 3h12M6 8h12M16 3c0 5-4 5-4 5H6l8 13"/>;
const IcLock   = (p)=><Ic {...p} d="M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2zM8 11V7a4 4 0 018 0v4"/>;
const IcClock  = (p)=><Ic {...p} d="M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2"/>;
const IcUnlink = (p)=><Ic {...p} d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10"/>;
const IcUpload = (p)=><Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>;
const IcEye    = (p)=><Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0"/>;
const IcChk    = (p)=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcLink   = (p)=><Ic {...p} d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>;
const IcTable  = (p)=><Ic {...p} d="M3 5h18v14H3zM3 10h18M9 10v9M15 10v9"/>;
const IcTrash  = (p)=><Ic {...p} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>;
const IcMapPin = (p)=><Ic {...p} d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z"/>;
const IcUndo   = (p)=><Ic {...p} d="M3 7v6h6M3 13a9 9 0 103-7.7L3 8"/>;

// ── CONSTANTS (backend enums ke saath exact match) ──────────────────
const PIPELINE = ["bidding","won","agreement","execution","completed","dlp","closed"];
const WON_OR_LATER = PIPELINE.slice(PIPELINE.indexOf("won"));
// In stages par backend actual_completion_date maangta hai — DLP isi se count hota hai.
const COMPLETION_REQUIRED = ["completed","dlp","closed"];
// Site (project) tabhi judti hai jab kaam shuru ho.
const EXEC_OR_LATER = PIPELINE.slice(PIPELINE.indexOf("execution"));
// In stage change par note compulsory hai (sab roles ke liye).
const NOTE_REQUIRED_TO = ["won","agreement"];

// routes/tenders.js ke checkTransition ka mirror — yahan sirf UI ke liye
// (button dikhana, dropdown chhota karna, note field maangna). Asli rok
// hamesha backend hi lagata hai.
function checkTransition(from, to, isAdmin) {
  if (from === to) return {ok:true, kind:"none", noteRequired:false};
  if (from === "lost") {
    if (to !== "bidding") return {ok:false, msg:"Lost tender sirf wapas Bidding par ja sakta hai."};
    return isAdmin ? {ok:true, kind:"revive", noteRequired:true}
                   : {ok:false, msg:"Lost se wapas laana sirf admin kar sakta hai."};
  }
  if (to === "lost") {
    return from === "bidding" ? {ok:true, kind:"lost", noteRequired:false}
                              : {ok:false, msg:"Lost sirf Bidding stage se mark hota hai."};
  }
  const fi = PIPELINE.indexOf(from), ti = PIPELINE.indexOf(to);
  if (fi < 0 || ti < 0) return {ok:false, msg:"Ye stage change allowed nahi hai."};
  if (ti === fi + 1) return {ok:true, kind:"forward", noteRequired:NOTE_REQUIRED_TO.includes(to)};
  if (ti > fi + 1)   return {ok:false, msg:`Stage skip nahi hota — pehle '${PIPELINE[fi+1]}' par jao.`};
  return isAdmin ? {ok:true, kind:"backward", noteRequired:true}
                 : {ok:false, msg:"Stage peeche le jaana sirf admin kar sakta hai."};
}
// Edit modal ke dropdown me sirf wahi stage jahan asli me ja sakte hain.
const legalTargets = (from, isAdmin) =>
  [...PIPELINE, "lost"].filter(s => s !== from && checkTransition(from, s, isAdmin).ok);
// Agle stage ka naam (pipeline ka "Aage badhao" button isi par chalta hai).
const nextStageOf = (s) => {
  const i = PIPELINE.indexOf(s);
  return i >= 0 && i < PIPELINE.length - 1 ? PIPELINE[i + 1] : null;
};

const STATUS_META = {
  bidding:    {get label() { return t("tenders.bidding"); },    c:T.slt, bg:T.sltL},
  won:        {get label() { return t("tenders.won"); },        c:T.grn, bg:T.grnL},
  lost:       {get label() { return t("crm.lost"); },       c:T.red, bg:T.redL},
  agreement:  {get label() { return t("tenders.agreement"); },  c:T.ind, bg:T.indL},
  execution:  {get label() { return t("tenders.execution"); },  c:T.blu, bg:T.bluL},
  completed:  {get label() { return t("material_transfer.completed"); },  c:T.pur, bg:T.purL},
  dlp:        {label:"DLP",        c:T.amb, bg:T.ambL},
  closed:     {get label() { return t("common.closed"); },     c:T.t4,  bg:T.sltL},
};
const sMeta = (s) => STATUS_META[s] || {label:s||"--", c:T.t3, bg:T.sltL};

const INSTRUMENT_TYPES = [
  {v:"emd",              l:"EMD"},
  {v:"bg",               get l() { return t("tenders.bank_guarantee"); }},
  {v:"fdr",              l:"FDR"},
  {v:"security_deposit", get l() { return t("tenders.security_deposit"); }},
];
// Bid ke saath sirf EMD jama hoti hai — BG/FDR/SD tender jeetne ke baad.
const instrumentTypesFor = (status) =>
  status === "bidding" ? INSTRUMENT_TYPES.filter(t=>t.v==="emd") : INSTRUMENT_TYPES;

const BID_SUBMISSION_TYPES = [{v:"online", get l() { return t("tenders.online"); }}, {v:"offline", get l() { return t("tenders.offline_by_post"); }}];

// Bid kaise price hui — isse tay hota hai ki bill kis rate par banega.
//   percentage — department ke SOR rate par ±X% (premium alag line)
//   item_rate  — har item ka apna quoted rate, premium hota hi nahi
const RATE_TYPES = [
  {v:"percentage", get l() { return t("tenders.percentage_sor_rate_par"); }},
  {v:"item_rate",  get l() { return t("tenders.item_rate_har_item_ka_apna"); }},
];

// Party dropdown ka aakhri option — ye koi party id nahi, add-modal kholta hai.
const NEW_PARTY = "__new_party__";
const INSTRUMENT_MODES = [
  {v:"dd",     l:"DD"},
  {v:"bg",     l:"BG"},
  {v:"fdr",    l:"FDR"},
  {v:"online", get l() { return t("tenders.online"); }},
  {v:"cash",   get l() { return t("tenders.cash"); }},
];
const INST_STATUS_META = {
  active:    {get label() { return t("tenders.active"); },    c:T.blu, bg:T.bluL},
  released:  {get label() { return t("tenders.released"); },  c:T.slt, bg:T.sltL},
  refunded:  {get label() { return t("tenders.refunded"); },  c:T.grn, bg:T.grnL},
  forfeited: {get label() { return t("tenders.forfeited"); }, c:T.red, bg:T.redL},
  expired:   {get label() { return t("tenders.expired"); },   c:T.amb, bg:T.ambL},
};
const DOC_TYPES = [
  {v:"nit",       l:"NIT"},
  {v:"loa",       l:"LOA"},
  {v:"agreement", get l() { return t("tenders.agreement"); }},
  {v:"bg_copy",   get l() { return t("tenders.bg_copy"); }},
  {v:"other",     get l() { return t("common.other"); }},
];
const docLabel = (t) => (DOC_TYPES.find(d=>d.v===t)||{l:t||"Other"}).l;
const typeLabel = (t) => (INSTRUMENT_TYPES.find(x=>x.v===t)||{l:t||"--"}).l;
const modeLabel = (m) => (INSTRUMENT_MODES.find(x=>x.v===m)||{l:m||""}).l;

// ── FORMAT HELPERS ──────────────────────────────────────────────────
const num = (n) => Number(n||0);
const fmtC = (n) => {           // compact Indian — 1.2Cr / 4.5L / 60K
  const v = Math.abs(num(n));
  if (v >= 10000000) return `${(v/10000000).toFixed(2)}Cr`;
  if (v >= 100000)   return `${(v/100000).toFixed(2)}L`;
  if (v >= 1000)     return `${(v/1000).toFixed(1)}K`;
  return String(Math.round(v));
};
const money  = (n) => "₹" + fmtC(n);
const moneyF = (n) => "₹" + num(n).toLocaleString("en-IN", {maximumFractionDigits:0});
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "--";
const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
// Din ka farak — negative matlab date nikal chuki hai.
const daysTo = (d) => {
  if (!d) return null;
  const target = new Date(d); target.setHours(0,0,0,0);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((target - now) / 86400000);
};
const dateOnly = (d) => (d ? String(d).slice(0,10) : "");

// DLP end date ka preview — backend ke deriveDlpEnd jaisa hi hisaab, taaki
// screen par jo dikhe wahi save ho. Mahine ke aakhir par clamp zaroori hai:
// JS me 31 Aug + 6 months = 3 March, hume 28 Feb chahiye.
const addMonthsYMD = (ymd, months) => {
  const base = dateOnly(ymd);
  const n = Number(months);
  if (!base || !n) return "";
  const d = new Date(`${base}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

// ── SMALL PRIMITIVES ────────────────────────────────────────────────
const Pill = ({label, c, bg}) => (
  <span style={{display:"inline-block", background:bg, color:c, fontSize:11, fontWeight:600,
    padding:"2px 9px", borderRadius:20, border:`1px solid ${c}44`, whiteSpace:"nowrap"}}>{label}</span>
);

const Panel = ({children, style}) => (
  <div style={{background:T.surface, border:`1px solid ${T.b1}`, borderRadius:8, overflow:"hidden", ...style}}>{children}</div>
);

const PHead = ({title, sub, action}) => (
  <div style={{padding:"10px 15px", borderBottom:`1px solid ${T.b1}`, display:"flex",
    alignItems:"center", justifyContent:"space-between", background:T.surfaceB, gap:10}}>
    <div style={{minWidth:0}}>
      <div style={{fontSize:12.5, fontWeight:700, color:T.t1, letterSpacing:"-.1px"}}>{title}</div>
      {sub && <div style={{fontSize:10.5, color:T.t4, marginTop:2}}>{sub}</div>}
    </div>
    {action}
  </div>
);

const Stat = ({label, value, note, color, Icon}) => (
  <div style={{padding:"13px 15px", background:T.surface, border:`1px solid ${T.b1}`,
    borderRadius:8, borderTop:`3px solid ${color||T.blu}`, position:"relative", overflow:"hidden"}}>
    {Icon && <div style={{position:"absolute", right:-4, top:-2, opacity:.07, transform:"scale(2.4)", pointerEvents:"none"}}><Icon size={20} color={color||T.blu}/></div>}
    <div style={{fontSize:10, color:T.t3, fontWeight:600, letterSpacing:".5px", textTransform:"uppercase", marginBottom:5}}>{label}</div>
    <div style={{fontSize:21, fontWeight:700, color:T.t1, letterSpacing:"-.5px", lineHeight:1}}>{value}</div>
    {note && <div style={{fontSize:11, color:T.t4, marginTop:4}}>{note}</div>}
  </div>
);

const Empty = ({Icon, text, sub}) => (
  <div style={{padding:"34px 20px", textAlign:"center"}}>
    {Icon && <div style={{marginBottom:8, opacity:.35}}><Icon size={26} color={T.t4}/></div>}
    <div style={{fontSize:13, color:T.t3, fontWeight:600}}>{text}</div>
    {sub && <div style={{fontSize:11.5, color:T.t4, marginTop:4}}>{sub}</div>}
  </div>
);

const Loading = ({text="Load ho raha hai..."}) => (
  <div style={{padding:"40px 0", textAlign:"center", fontSize:12.5, color:T.t4}}>{text}</div>
);

const PrimBtn = ({label, onClick, Icon, disabled, color=T.ind}) => (
  <button onClick={onClick} disabled={disabled}
    style={{height:32, padding:"0 14px", borderRadius:6, background:disabled?T.b2:color, color:"#fff",
      fontSize:12.5, fontWeight:700, border:"none", cursor:disabled?"not-allowed":"pointer",
      display:"inline-flex", alignItems:"center", gap:5, whiteSpace:"nowrap", flexShrink:0}}>
    {Icon && <Icon size={13} color="#fff"/>}{label}
  </button>
);

const SecBtn = ({label, onClick, Icon, color=T.t2, disabled}) => (
  <button onClick={onClick} disabled={disabled}
    style={{height:32, padding:"0 12px", borderRadius:6, border:`1.5px solid ${T.b1}`, background:T.surfaceB,
      fontSize:12, fontWeight:600, color:disabled?T.t4:color, cursor:disabled?"not-allowed":"pointer",
      display:"inline-flex", alignItems:"center", gap:5, whiteSpace:"nowrap", flexShrink:0}}>
    {Icon && <Icon size={12} color="currentColor"/>}{label}
  </button>
);

// Form field primitives — modal ke andar use hote hain
const Field = ({label, children, full, hint}) => (
  <div style={{gridColumn: full ? "1/3" : "auto"}}>
    <label style={{fontSize:10.5, fontWeight:600, color:T.t3, display:"block", marginBottom:4,
      textTransform:"uppercase", letterSpacing:".5px"}}>{label}</label>
    {children}
    {hint && <div style={{fontSize:10.5, color:T.t4, marginTop:4, lineHeight:1.4}}>{hint}</div>}
  </div>
);
const inputStyle = {
  width:"100%", padding:"9px 12px", borderRadius:7, border:`1.5px solid ${T.b1}`,
  fontSize:13, color:T.t1, background:T.bg, outline:"none", boxSizing:"border-box", fontFamily:"inherit",
};
const TxtIn = ({value, onChange, ph, type="text"}) => (
  <input type={type} value={value ?? ""} onChange={e=>onChange(e.target.value)} placeholder={ph||""}
    style={inputStyle}
    onFocus={e=>e.target.style.borderColor=T.ind}
    onBlur={e=>e.target.style.borderColor=T.b1}/>
);
const SelIn = ({value, onChange, options, ph}) => (
  <div style={{position:"relative"}}>
    <select value={value ?? ""} onChange={e=>onChange(e.target.value)}
      style={{...inputStyle, appearance:"none", WebkitAppearance:"none", cursor:"pointer", paddingRight:30}}>
      {ph !== undefined && <option value="">{ph}</option>}
      {/* o.group ho to parivaar-wise dabbe (Pipeline ke andar Inlet/Outlet) */}
      {options.some(o=>o.group)
        ? [...new Map(options.map(o=>[o.group||"", true])).keys()].map(g=>(
            g ? <optgroup key={g} label={g}>
                  {options.filter(o=>(o.group||"")===g).map(o=><option key={String(o.v)} value={o.v}>{o.l}</option>)}
                </optgroup>
              : options.filter(o=>!o.group).map(o=><option key={String(o.v)} value={o.v}>{o.l}</option>)
          ))
        : options.map(o=><option key={String(o.v)} value={o.v}>{o.l}</option>)}
    </select>
    <div style={{position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none"}}>
      <IcDown size={12} color={T.t4}/>
    </div>
  </div>
);

// Modal shell — backdrop + panel + header + scrollable body + footer
const Modal = ({title, sub, onClose, children, footer, width=560, Icon}) => (
  <>
    <div onClick={onClose} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:998}}/>
    <div style={{position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
      width:"min(94vw,"+width+"px)", background:T.surface, borderRadius:10,
      boxShadow:"0 20px 60px rgba(0,0,0,.25)", zIndex:999, overflow:"hidden",
      fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{padding:"13px 18px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB,
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:10}}>
        <div style={{display:"flex", alignItems:"center", gap:9, minWidth:0}}>
          {Icon && <Icon size={17} color={T.ind}/>}
          <div style={{minWidth:0}}>
            <div style={{fontSize:14, fontWeight:700, color:T.t1}}>{title}</div>
            {sub && <div style={{fontSize:11, color:T.t4, marginTop:1}}>{sub}</div>}
          </div>
        </div>
        <button onClick={onClose} style={{background:"none", border:"none", cursor:"pointer", color:T.t3, lineHeight:0, padding:4}}>
          <IcX size={17}/>
        </button>
      </div>
      <div style={{padding:"16px 18px", maxHeight:"64vh", overflowY:"auto"}}>{children}</div>
      {footer && (
        <div style={{padding:"11px 18px", borderTop:`1px solid ${T.b1}`, background:T.surfaceB,
          display:"flex", justifyContent:"flex-end", gap:8, alignItems:"center"}}>{footer}</div>
      )}
    </div>
  </>
);

const ErrLine = ({msg}) => msg ? (
  <div style={{background:T.redL, color:T.red, padding:"8px 12px", borderRadius:7, fontSize:12,
    marginBottom:12, border:`1px solid ${T.redM}`}}>{msg}</div>
) : null;

// ── ALERTS STRIP ────────────────────────────────────────────────────
// Backend alerts[] ko amber patti me dikhata hai. severity high = laal
// dot, baaki amber. Zyada alerts hon to "show all" toggle.
function AlertsStrip({alerts, onJump}) {
  const [open, setOpen] = useState(false);
  if (!alerts || !alerts.length) return null;
  const shown = open ? alerts : alerts.slice(0,3);
  const highCount = alerts.filter(a=>a.severity==="high").length;
  return (
    <div style={{background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, padding:"9px 13px", marginBottom:12}}>
      <div style={{display:"flex", alignItems:"center", gap:7, marginBottom:shown.length?7:0}}>
        <IcWarn size={14} color={T.amb}/>
        <span style={{fontSize:11.5, fontWeight:700, color:T.amb, textTransform:"uppercase", letterSpacing:".5px"}}>{t("tenders.dhyaan_dein_alerts_alertalerts2", { alerts: alerts.length, alerts2: alerts.length>1?"s":"" })}</span>
        {highCount>0 && (
          <span style={{background:T.red, color:"#fff", fontSize:9, fontWeight:800, padding:"1px 6px", borderRadius:10}}>
            {highCount} urgent
          </span>
        )}
        <div style={{flex:1}}/>
        {alerts.length>3 && (
          <button onClick={()=>setOpen(o=>!o)}
            style={{background:"none", border:"none", color:T.amb, fontSize:11, fontWeight:600, cursor:"pointer", padding:0}}>
            {open ? t("tenders.kam_dikhao") : `+${alerts.length-3} aur`}
          </button>
        )}
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:5}}>
        {shown.map((a,i)=>(
          <div key={i} onClick={()=>onJump && a.tender_id && onJump(a.tender_id)}
            style={{display:"flex", alignItems:"flex-start", gap:8, cursor:onJump?"pointer":"default"}}>
            <span style={{width:7, height:7, borderRadius:"50%", flexShrink:0, marginTop:4,
              background:a.severity==="high"?T.red:T.amb}}/>
            <span style={{fontSize:12, color:T.t2, lineHeight:1.45}}>
              {a.tender_no && <b style={{color:T.t1, fontWeight:700}}>{a.tender_no}</b>}
              {a.tender_no && " — "}{a.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// NEW TENDER MODAL — 2 step (Tender Info → Won Details)
// ════════════════════════════════════════════════════════════════════
// Department dropdown me na mile to yahin se jod do — Finance → Parties
// jaane ki zaroorat nahi. Party Library (finance/parties) me hi banti hai,
// isliye baaki module usi list se uthate rehte hain.
function AddPartyInlineModal({onClose, onAdded}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    if (!name.trim()) return setErr(t("tenders.department_ka_naam_zaroori_hai"));
    setBusy(true);
    const res = await api.post("/finance/parties", {
      name: name.trim(), type: "client", roles: "client",
      gstin: gstin.trim() || null, phone: phone.trim() || null,
      opening_balance: 0, balance_type: "Nil",
    });
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Department nahi bana"); return; }
    toast.success("Department jud gaya");
    onAdded(res.data);          // caller list refresh karke isi ko select karega
  };

  return (
    <Modal title={t("tenders.naya_department")} Icon={IcAdd} width={480}
      sub={t("tenders.party_library_me_client_ban_kar")}
      onClose={onClose}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        <PrimBtn label={busy ? t("tenders.save_ho_raha") : t("machinery.jodo")} Icon={IcChk} onClick={save} disabled={busy}/>
      </>}>
      <ErrLine msg={err}/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label={t("tenders.department_party_ka_naam")} full>
          <TxtIn value={name} onChange={setName} ph={t("tenders.e_g_pwd_division_dhamtari")}/>
        </Field>
        <Field label="GSTIN"><TxtIn value={gstin} onChange={setGstin} ph={t("tenders.optional")}/></Field>
        <Field label={t("common.phone")}><TxtIn value={phone} onChange={setPhone} ph={t("tenders.optional")}/></Field>
      </div>
      <div style={{marginTop:12, fontSize:11, color:T.t4, lineHeight:1.5}}>
       {t("tenders.ye_finance_parties_me_client_type")}
      </div>
    </Modal>
  );
}

function NewTenderModal({onClose, onCreated}) {
  const toast = useToast();
  const [step, setStep]   = useState(1);
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState("");
  const [parties, setParties] = useState([]);
  const [form, setForm] = useState({
    tender_no:"", title:"", party_id:"", department_name:"",
    nit_date:"", submission_date:"", estimated_cost:"", boq_value_manual:"", emd_amount:"", tender_fee:"",
    techno_commercial_date:"", reverse_auction_date:"", bid_submission_type:"", nit_clauses:"",
    status:"bidding",
    contract_value:"", loa_date:"", agreement_no:"", agreement_date:"",
    work_order_date:"", stipulated_completion:"", dlp_months:"",
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const loadParties = useCallback(async (selectId) => {
    const r = await api.get("/finance/parties?type=client");
    if (r?.success) {
      setParties(r.data || []);
      if (selectId) set("party_id", String(selectId));   // naya wala turant chun lo
    }
  }, []);
  useEffect(()=>{ loadParties(); }, [loadParties]);
  const [addParty, setAddParty] = useState(false);

  const isWon = form.status === "won";
  // Bid-stage ki info sirf tab compulsory jab tender abhi bid hi kar rahe ho.
  const bidReq = !isWon;

  const goNext = () => {
    setErr("");
    if (!form.tender_no.trim()) return setErr(t("tenders.tender_number_zaroori_hai"));
    if (!form.title.trim())     return setErr(t("tenders.tender_ka_title_zaroori_hai"));
    // NIT date hamesha zaroori — tender ki pehchaan wahi se banti hai.
    if (!form.nit_date)             return setErr(t("tenders.nit_date_zaroori_hai"));
    // Baaki bid-stage ki info sirf BIDDING par compulsory hai. Won tender
    // aksar purana record hota hai (jeet chuke kaam ko system me daal rahe
    // ho) — tab bid ki details haath me hoti hi nahi, kaam ki cheez contract
    // value aur agreement hai. Baad me Edit se bhar sakte ho.
    if (!isWon) {
      if (!form.submission_date)      return setErr(t("tenders.bid_submission_date_zaroori_hai"));
      if (!form.bid_submission_type)  return setErr(t("tenders.bid_submission_type_chuno_online_offline"));
      if (form.estimated_cost === "") return setErr(t("tenders.estimated_cost_zaroori_hai_pata_na"));
      if (form.emd_amount === "")     return setErr(t("tenders.emd_amount_zaroori_hai_pata_na"));
      if (form.tender_fee === "")     return setErr(t("tenders.tender_fee_zaroori_hai_pata_na"));
    }
    if (isWon) { setStep(2); return; }
    submit();
  };

  const submit = async () => {
    setErr(""); setBusy(true);
    if (isWon) {
      if (!form.contract_value) { setBusy(false); return setErr(t("tenders.won_tender_ke_liye_contract_value")); }
      if (!form.party_id)       { setBusy(false); return setErr(t("tenders.won_tender_ke_liye_department_party")); }
    }
    const body = {
      tender_no: form.tender_no.trim(),
      title: form.title.trim(),
      department_name: form.department_name.trim() || null,
      party_id: form.party_id || null,
      nit_date: form.nit_date || null,
      submission_date: form.submission_date || null,
      techno_commercial_date: form.techno_commercial_date || null,
      reverse_auction_date: form.reverse_auction_date || null,
      bid_submission_type: form.bid_submission_type || null,
      nit_clauses: form.nit_clauses.trim() || null,
      estimated_cost: form.estimated_cost || null,
      boq_value_manual: form.boq_value_manual || null,
      emd_amount: form.emd_amount || null,
      tender_fee: form.tender_fee || null,
      status: form.status,
      ...(isWon ? {
        contract_value: form.contract_value || null,
        loa_date: form.loa_date || null,
        agreement_no: form.agreement_no.trim() || null,
        agreement_date: form.agreement_date || null,
        work_order_date: form.work_order_date || null,
        stipulated_completion: form.stipulated_completion || null,
        dlp_months: form.dlp_months || null,
      } : {}),
    };
    const res = await api.post("/tenders", body);
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Tender save nahi hua"); return; }
    toast.success("Tender ban gaya");
    onCreated && onCreated(res.data);
    onClose();
  };

  // Party dropdown — Client-type parties (department yahi se aata hai)
  // List ke aakhir me "+ Naya Department" — dropdown me na mile to yahin se jod do.
  const partyOpts = [...parties.map(p=>({v:String(p.id), l:p.name})),
                     {v:NEW_PARTY, l:t("tenders.naya_department_jodo")}];

  return (
    <Modal title={t("tenders.naya_tender")} Icon={IcGavel} onClose={onClose} width={600}
      sub={isWon ? `Step ${step} of 2 — ${step===1?"Tender Info":"Won Details"}` : t("tenders.tender_info")}
      footer={<>
        {step===2 && <SecBtn label={t("common.peeche")} onClick={()=>setStep(1)}/>}
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        {step===1
          ? <PrimBtn label={isWon ? t("tenders.aage") : (busy?t("tenders.save_ho_raha"):t("tenders.tender_banao"))} onClick={goNext} disabled={busy}/>
          : <PrimBtn label={busy?t("tenders.save_ho_raha"):t("tenders.tender_banao")} onClick={submit} disabled={busy}/>}
      </>}>

      <ErrLine msg={err}/>

      {/* Step indicator — sirf tab jab Won chuna ho */}
      {isWon && (
        <div style={{display:"flex", alignItems:"center", gap:7, marginBottom:15}}>
          {["Tender Info","Won Details"].map((s,i)=>(
            <div key={s} style={{display:"flex", alignItems:"center", gap:7, flex:i<1?1:"auto"}}>
              <div style={{width:21, height:21, borderRadius:"50%", flexShrink:0, fontSize:10, fontWeight:700,
                display:"flex", alignItems:"center", justifyContent:"center",
                background:step>i+1?T.grn:step===i+1?T.ind:T.b1, color:step>=i+1?"#fff":T.t4}}>
                {step>i+1 ? "✓" : i+1}
              </div>
              <span style={{fontSize:11.5, fontWeight:step===i+1?700:400, color:step===i+1?T.ind:step>i+1?T.grn:T.t4, whiteSpace:"nowrap"}}>{s}</span>
              {i<1 && <div style={{flex:1, height:2, background:step>1?T.grn:T.b1, borderRadius:2, margin:"0 3px"}}/>}
            </div>
          ))}
        </div>
      )}

      {step===1 && (
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
          <Field label={t("tenders.tender_number")}><TxtIn value={form.tender_no} onChange={v=>set("tender_no",v)} ph={t("tenders.e_g_nit_pwd_2026_114")}/></Field>
          <Field label={t("common.status")}><SelIn value={form.status} onChange={v=>set("status",v)}
            options={[{v:"bidding",l:t("tenders.bidding")},{v:"won",l:t("tenders.won")}]}/></Field>
          <Field label={t("common.title")} full><TxtIn value={form.title} onChange={v=>set("title",v)} ph={t("tenders.kaam_ka_naam_e_g_durg")}/></Field>

          <Field label={t("tenders.department_party")} full
            hint={t("tenders.yeh_list_finance_ki_client_type")}>
            <SelIn value={form.party_id} options={partyOpts} ph={t("tenders.department_chuno")}
              onChange={v=>{ if (v === NEW_PARTY) { setAddParty(true); return; } set("party_id", v); }}/>
          </Field>
          <Field label={t("tenders.department_name_free_text")} full>
            <TxtIn value={form.department_name} onChange={v=>set("department_name",v)} ph={t("tenders.e_g_pwd_durg_division")}/>
          </Field>

          <Field label={t("tenders.nit_date")}><TxtIn type="date" value={form.nit_date} onChange={v=>set("nit_date",v)}/></Field>
          <Field label={`Bid Submission Date${bidReq ? " *" : ""}`}><TxtIn type="date" value={form.submission_date} onChange={v=>set("submission_date",v)}/></Field>
          <Field label={t("tenders.techno_commercial_date")}><TxtIn type="date" value={form.techno_commercial_date} onChange={v=>set("techno_commercial_date",v)}/></Field>
          <Field label={`Bid Submission Type${bidReq ? " *" : ""}`}>
            <SelIn value={form.bid_submission_type} onChange={v=>set("bid_submission_type",v)}
              options={BID_SUBMISSION_TYPES} ph={t("tenders.chuno")}/>
          </Field>
          <Field label={t("tenders.reverse_auction_date")} full
            hint={t("tenders.bid_ke_baad_reverse_auction_ho")}>
            <TxtIn type="date" value={form.reverse_auction_date} onChange={v=>set("reverse_auction_date",v)}/>
          </Field>
          <Field label={t("tenders.nit_ke_main_points")} full
            hint={t("tenders.zaroori_clause_sd_completion_period_penalty")}>
            <textarea value={form.nit_clauses} onChange={e=>set("nit_clauses",e.target.value)} rows={3}
              style={{...inputStyle, resize:"vertical", lineHeight:1.5}}
              placeholder={t("tenders.e_g_clause_5_2_sd")}/>
          </Field>

          <Field label={t("tenders.boq_value_manual")} hint={t("tenders.nit_se_dekh_kar_bharo")}>
            <TxtIn type="number" value={form.boq_value_manual} onChange={v=>set("boq_value_manual",v)} ph="0"/></Field>
          <Field label={`${t("tenders.estimated_cost")}${bidReq ? " *" : ""}`}
            hint={bidReq ? t("tenders.pata_na_ho_to_0_baad") : t("tenders.won_tender_me_optional_baad_me")}>
            <TxtIn type="number" value={form.estimated_cost} onChange={v=>set("estimated_cost",v)} ph="0"/></Field>
          <Field label={`EMD Amount (₹)${bidReq ? " *" : ""}`}><TxtIn type="number" value={form.emd_amount} onChange={v=>set("emd_amount",v)} ph="0"/></Field>
          <Field label={`Tender Fee (₹)${bidReq ? " *" : ""}`}><TxtIn type="number" value={form.tender_fee} onChange={v=>set("tender_fee",v)} ph="0"/></Field>
        </div>
      )}

      {step===2 && (
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
          <div style={{gridColumn:"1/3", background:T.indL, border:`1px solid ${T.indM}`, borderRadius:7,
            padding:"9px 12px", fontSize:11.5, color:T.ind, lineHeight:1.5}}>
           {t("tenders.won_tender_ke_liye")} <b>{t("tenders.contract_value")}</b> aur <b>{t("tenders.department_party_2")}</b> {t("tenders.dono_zaroori_hain_backend_inke_bina")}
          </div>
          <Field label={t("tenders.contract_value_2")}><TxtIn type="number" value={form.contract_value} onChange={v=>set("contract_value",v)} ph="0"/></Field>
          <Field label={t("tenders.loa_date")}><TxtIn type="date" value={form.loa_date} onChange={v=>set("loa_date",v)}/></Field>
          <Field label={t("tenders.agreement_no")}><TxtIn value={form.agreement_no} onChange={v=>set("agreement_no",v)} ph={t("tenders.e_g_agr_2026_41")}/></Field>
          <Field label={t("tenders.agreement_date")}><TxtIn type="date" value={form.agreement_date} onChange={v=>set("agreement_date",v)}/></Field>
          <Field label={t("tenders.work_order_date")}><TxtIn type="date" value={form.work_order_date} onChange={v=>set("work_order_date",v)}/></Field>
          <Field label={t("tenders.stipulated_completion")}><TxtIn type="date" value={form.stipulated_completion} onChange={v=>set("stipulated_completion",v)}/></Field>
          <Field label={t("tenders.dlp_months")}><TxtIn type="number" value={form.dlp_months} onChange={v=>set("dlp_months",v)} ph="e.g. 12"/></Field>
          {!form.party_id && (
            <div style={{gridColumn:"1/3"}}>
              <div style={{background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:7, padding:"8px 12px", fontSize:11.5, color:T.amb}}>
               {t("tenders.department_party_abhi_khali_hai_step")}
              </div>
            </div>
          )}
        </div>
      )}
      {addParty && (
        <AddPartyInlineModal onClose={()=>setAddParty(false)}
          onAdded={(pt)=>{ setAddParty(false); loadParties(pt?.id); }}/>
      )}
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// EDIT TENDER MODAL — fields + status change
// ════════════════════════════════════════════════════════════════════
function EditTenderModal({tender, boqBase = 0, onClose, onSaved, onDeleted}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  // Delete sirf admin/super_admin — backend par bhi yahi requireRole hai.
  const isAdmin = ["admin","super_admin"].includes(getUser()?.role);
  const [parties, setParties] = useState([]);
  const [form, setForm] = useState({
    tender_no: tender.tender_no || "",
    title: tender.title || "",
    department_name: tender.department_name || "",
    party_id: tender.party_id ? String(tender.party_id) : "",
    status: tender.status || "bidding",
    estimated_cost: tender.estimated_cost ?? "",
    boq_value_manual: tender.boq_value_manual ?? "",
    budget_alert_pct: tender.budget_alert_pct ?? "",
    contract_value: tender.contract_value ?? "",
    emd_amount: tender.emd_amount ?? "",
    tender_fee: tender.tender_fee ?? "",
    nit_date: dateOnly(tender.nit_date),
    submission_date: dateOnly(tender.submission_date),
    techno_commercial_date: dateOnly(tender.techno_commercial_date),
    reverse_auction_date: dateOnly(tender.reverse_auction_date),
    bid_submission_type: tender.bid_submission_type || "",
    nit_clauses: tender.nit_clauses || "",
    rate_type: tender.rate_type || "percentage",
    gst_pct: tender.gst_pct ?? "",
    deviation_limit_pct: tender.deviation_limit_pct ?? "",
    status_note: "",
    loa_date: dateOnly(tender.loa_date),
    agreement_no: tender.agreement_no || "",
    agreement_date: dateOnly(tender.agreement_date),
    work_order_date: dateOnly(tender.work_order_date),
    stipulated_completion: dateOnly(tender.stipulated_completion),
    actual_completion_date: dateOnly(tender.actual_completion_date),
    dlp_months: tender.dlp_months ?? "",
    dlp_end_date: dateOnly(tender.dlp_end_date),
    notes: tender.notes || "",
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  // DLP end date manual override hai — user ne khud haath lagaya tabhi
  // bheja jata hai, warna backend completion + months se khud nikalta hai.
  const [dlpEndTouched, setDlpEndTouched] = useState(false);

  // Above/Below % ↔ Contract Value — do-taraf sync (base = tendered BOQ ka
  // jod). Jo aakhri chheda wahi source: % badla to value banti hai, value
  // badli to % nikalta hai. Base na ho (BOQ import nahi) to % ka khana
  // hint ban jata hai aur contract manual hi rehta hai.
  // Base: imported BOQ ka jod pehle; import na hua ho to haath se bhara
  // manual BOQ (isi form ka khana) — % sync usi par chalta hai.
  const effBase = boqBase > 0 ? boqBase : num(form.boq_value_manual);
  const [premStr, setPremStr] = useState(() => {
    if (tender.premium_pct !== null && tender.premium_pct !== undefined) return String(Number(tender.premium_pct));
    const cv = num(tender.contract_value);
    const base0 = boqBase > 0 ? boqBase : num(tender.boq_value_manual);
    return (base0 > 0 && cv > 0)
      ? String(Math.round(((cv / base0 - 1) * 100 + Number.EPSILON) * 10000) / 10000)
      : "";
  });
  const syncFromPct = (v) => {
    setPremStr(v);
    const p = Number(v);
    if (effBase > 0 && v !== "" && Number.isFinite(p)) {
      set("contract_value", String(Math.round((effBase * (1 + p / 100) + Number.EPSILON) * 100) / 100));
    }
  };
  const syncFromContract = (v) => {
    set("contract_value", v);
    const cv = Number(v);
    if (effBase > 0 && v !== "" && Number.isFinite(cv) && cv > 0) {
      setPremStr(String(Math.round(((cv / effBase - 1) * 100 + Number.EPSILON) * 10000) / 10000));
    }
  };
  // Estimated Budget ka % helper — profit % dalo, budget contract se ban jaye.
  const [profitStr, setProfitStr] = useState("");
  const syncFromProfit = (v) => {
    setProfitStr(v);
    const p = Number(v);
    const cv = num(form.contract_value);
    if (cv > 0 && v !== "" && Number.isFinite(p)) {
      set("estimated_cost", String(Math.round((cv * (1 - p / 100) + Number.EPSILON) * 100) / 100));
    }
  };

  const loadParties = useCallback(async (selectId) => {
    const r = await api.get("/finance/parties?type=client");
    if (r?.success) {
      setParties(r.data || []);
      if (selectId) set("party_id", String(selectId));
    }
  }, []);
  useEffect(()=>{ loadParties(); }, [loadParties]);
  const [addParty, setAddParty] = useState(false);

  // Won ya uske aage → contract value + party dono chahiye (backend gate).
  const needsWonFields = WON_OR_LATER.includes(form.status);
  const wonMissing = needsWonFields && (!form.contract_value || !form.party_id);
  // completed / dlp / closed → actual completion date ke bina nahi.
  const needsCompletion = COMPLETION_REQUIRED.includes(form.status);
  const completionMissing = needsCompletion && !form.actual_completion_date;
  // Backend khali dlp_end_date par yahi value nikalega — user ko pehle hi dikha do.
  const autoDlpEnd = useMemo(
    () => addMonthsYMD(form.actual_completion_date, form.dlp_months),
    [form.actual_completion_date, form.dlp_months]);

  const submit = async () => {
    setErr("");
    if (!form.tender_no.trim()) return setErr(t("tenders.tender_number_zaroori_hai"));
    if (!form.title.trim())     return setErr(t("tenders.tender_ka_title_zaroori_hai"));
    if (wonMissing) return setErr(t("tenders.is_stage_ke_liye_contract_value"));
    if (completionMissing) return setErr(t("tenders.completion_date_zaroori_hai_dlp_isi"));
    if (stageChange && !stageChange.ok) return setErr(stageChange.msg);
    if (stageChange?.noteRequired && !form.status_note.trim())
      return setErr(t("tenders.is_stage_change_ke_liye_note"));
    setBusy(true);
    const body = {
      tender_no: form.tender_no.trim(),
      title: form.title.trim(),
      department_name: form.department_name.trim() || null,
      party_id: form.party_id || null,
      status: form.status,
      estimated_cost: form.estimated_cost === "" ? null : form.estimated_cost,
      boq_value_manual: form.boq_value_manual === "" ? null : form.boq_value_manual,
      budget_alert_pct: form.budget_alert_pct === "" ? null : form.budget_alert_pct,
      contract_value: form.contract_value === "" ? null : form.contract_value,
      emd_amount: form.emd_amount === "" ? null : form.emd_amount,
      tender_fee: form.tender_fee === "" ? null : form.tender_fee,
      nit_date: form.nit_date || null,
      submission_date: form.submission_date || null,
      techno_commercial_date: form.techno_commercial_date || null,
      reverse_auction_date: form.reverse_auction_date || null,
      bid_submission_type: form.bid_submission_type || null,
      nit_clauses: form.nit_clauses.trim() || null,
      rate_type: form.rate_type || "percentage",
      gst_pct: form.gst_pct === "" ? null : form.gst_pct,
      deviation_limit_pct: form.deviation_limit_pct === "" ? null : form.deviation_limit_pct,
      loa_date: form.loa_date || null,
      agreement_no: form.agreement_no.trim() || null,
      agreement_date: form.agreement_date || null,
      work_order_date: form.work_order_date || null,
      stipulated_completion: form.stipulated_completion || null,
      actual_completion_date: form.actual_completion_date || null,
      dlp_months: form.dlp_months === "" ? null : form.dlp_months,
      notes: form.notes || null,
      ...(stageChange && form.status_note.trim() ? {status_note: form.status_note.trim()} : {}),
      // "Khali chhodo to auto" — khali field par key bhejte hi nahi, taaki
      // backend completion date + months se derive kare. Value bhari ho to
      // wahi jaati hai (manual override). Sirf tab null bhejte hain jab user
      // ne jaan-boojh kar clear kiya ho AUR derive karne ko kuch hai hi nahi.
      ...(form.dlp_end_date
            ? {dlp_end_date: form.dlp_end_date}
            : (dlpEndTouched && !autoDlpEnd ? {dlp_end_date: null} : {})),
    };
    const res = await api.put(`/tenders/${tender.id}`, body);
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Save nahi hua"); return; }
    toast.success("Tender update ho gaya");
    onSaved && onSaved(res.data);
    onClose();
  };


  // List ke aakhir me "+ Naya Department" — dropdown me na mile to yahin se jod do.
  const partyOpts = [...parties.map(p=>({v:String(p.id), l:p.name})),
                     {v:NEW_PARTY, l:t("tenders.naya_department_jodo")}];
  // Dropdown me sirf wahi stage jahan asli me ja sakte hain — mojooda stage
  // hamesha, baaki checkTransition se. Asli rok backend par hai; ye sirf
  // galat option dikhne se rokta hai.
  const statusOpts = [tender.status, ...legalTargets(tender.status, isAdmin)]
    .map(v => ({v, l: sMeta(v).label}));
  const stageChange = form.status !== tender.status
    ? checkTransition(tender.status, form.status, isAdmin) : null;

  return (
    <Modal title={t("tenders.tender_edit")} Icon={IcEdit} onClose={onClose} width={640}
      sub={tender.tender_no}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        <PrimBtn label={busy?t("tenders.save_ho_raha"):t("common.save")} onClick={submit} disabled={busy}/>
      </>}>
      <ErrLine msg={err}/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label={t("tenders.tender_number")}><TxtIn value={form.tender_no} onChange={v=>set("tender_no",v)}/></Field>
        <Field label={t("common.status")}
          hint={stageChange && !stageChange.ok ? stageChange.msg : undefined}>
          <SelIn value={form.status} onChange={v=>set("status",v)} options={statusOpts}/>
        </Field>
        {stageChange?.ok && (
          <Field label={stageChange.noteRequired ? t("tenders.stage_change_note") : t("tenders.stage_change_note_2")} full
            hint={stageChange.kind === "backward"
              ? t("tenders.stage_peeche_ja_raha_hai_kyun")
              : t("tenders.ye_note_tender_ki_stage_history")}>
            <TxtIn value={form.status_note} onChange={v=>set("status_note",v)}
              ph={sMeta(tender.status).label + " se " + sMeta(form.status).label + " — kyun?"}/>
          </Field>
        )}
        <Field label={t("common.title")} full><TxtIn value={form.title} onChange={v=>set("title",v)}/></Field>

        {needsWonFields && (
          <div style={{gridColumn:"1/3", background:wonMissing?T.ambL:T.indL,
            border:`1px solid ${wonMissing?T.ambM:T.indM}`, borderRadius:7, padding:"9px 12px",
            fontSize:11.5, color:wonMissing?T.amb:T.ind, lineHeight:1.5}}><Rich k="tenders.label_stage_ke_liye_contract_value" params={{ label: sMeta(form.status).label, wonMissing: wonMissing ? " Abhi ek ya dono khali hain — save block ho jayega." : "" }} /></div>
        )}

        {needsCompletion && (
          <div style={{gridColumn:"1/3", background:completionMissing?T.ambL:T.indL,
            border:`1px solid ${completionMissing?T.ambM:T.indM}`, borderRadius:7, padding:"9px 12px",
            fontSize:11.5, color:completionMissing?T.amb:T.ind, lineHeight:1.5}}><Rich k="tenders.label_stage_ke_liye_actual_completion" params={{ label: sMeta(form.status).label, completionMissing: completionMissing ? " Abhi khali hai — save block ho jayega." : "" }} /></div>
        )}

        <Field label={`Department (Party)${needsWonFields?" *":""}`} full
          hint={t("tenders.finance_ki_client_type_parties_naya")}>
          <SelIn value={form.party_id} options={partyOpts} ph={t("tenders.department_chuno")}
            onChange={v=>{ if (v === NEW_PARTY) { setAddParty(true); return; } set("party_id", v); }}/>
        </Field>
        <Field label={t("tenders.department_name_free_text")} full><TxtIn value={form.department_name} onChange={v=>set("department_name",v)}/></Field>

        {boqBase > 0 ? (
          /* Import ho chuki — khali manual khana "value gayab" jaisa lagta
             tha; ab computed jod yahin read-only dikhta hai. */
          <Field label={t("tenders.boq_value")} hint={t("tenders.import_ho_chuki_computed_hi_chalega")}>
            <div style={{...inputStyle, display:"flex", alignItems:"center", color:T.t1,
              fontWeight:700, fontVariantNumeric:"tabular-nums", background:T.surfaceB}}>
              {moneyF(boqBase)}
            </div>
          </Field>
        ) : (
          <Field label={t("tenders.boq_value_manual")} hint={t("tenders.nit_se_dekh_kar_bharo")}>
            <TxtIn type="number" value={form.boq_value_manual} onChange={v=>set("boq_value_manual",v)}/>
          </Field>
        )}
        <Field label={`Contract Value (₹)${needsWonFields?" *":""}`}>
          <TxtIn type="number" value={form.contract_value}
            onChange={form.rate_type === "item_rate" ? (v=>set("contract_value",v)) : syncFromContract}/>
        </Field>
        {form.rate_type !== "item_rate" && (<>
          <Field label={t("tenders.above_below")} hint={t("tenders.minus_below_plus_above")}>
            {effBase > 0
              ? <TxtIn type="number" value={premStr} onChange={syncFromPct} ph="e.g. -8.11"/>
              : <div style={{...inputStyle, display:"flex", alignItems:"center", color:T.t4, fontSize:11.5}}>
                  {t("tenders.boq_aane_par_pct_se_banega")}
                </div>}
          </Field>
          {effBase > 0 && num(form.contract_value) > 0 && (
            <Field label={t("tenders.hisaab")}>
              <div style={{...inputStyle, display:"flex", alignItems:"center", fontSize:11.5, color:T.t2, fontVariantNumeric:"tabular-nums"}}>
                = {t("tenders.boq_value")} {moneyF(effBase)} {num(form.contract_value) >= effBase ? "+" : "−"} {moneyF(Math.abs(num(form.contract_value) - effBase))}
              </div>
            </Field>
          )}
        </>)}
        <Field label={t("tenders.estimated_cost")} hint={t("tenders.apna_andaza_kitne_me_kaam")}>
          <TxtIn type="number" value={form.estimated_cost} onChange={v=>{ setProfitStr(""); set("estimated_cost",v); }}/>
        </Field>
        <Field label={t("tenders.profit_pct_se_bharo")} hint={t("tenders.contract_me_se_itna_profit")}>
          <TxtIn type="number" value={profitStr} onChange={syncFromProfit} ph="e.g. 12"/>
        </Field>
        <Field label={t("tenders.emd_amount")}><TxtIn type="number" value={form.emd_amount} onChange={v=>set("emd_amount",v)}/></Field>
        <Field label={t("tenders.tender_fee")}><TxtIn type="number" value={form.tender_fee} onChange={v=>set("tender_fee",v)}/></Field>

        <Field label={t("tenders.rate_type")} full
          hint={t("tenders.percentage_me_bill_par_premium_ki")}>
          <SelIn value={form.rate_type} onChange={v=>set("rate_type",v)} options={RATE_TYPES}/>
        </Field>
        <Field label={t("estimate_builder.gst")} hint={t("tenders.khali_bill_me_gst_ki_line")}>
          <TxtIn type="number" value={form.gst_pct} onChange={v=>set("gst_pct",v)} ph="e.g. 18"/>
        </Field>
        <Field label={t("tenders.deviation_limit")}
          hint={t("tenders.boq_qty_se_itne_tak_chhoot")}>
          <TxtIn type="number" value={form.deviation_limit_pct} onChange={v=>set("deviation_limit_pct",v)} ph="e.g. 10"/>
        </Field>
        <Field label={t("tenders.budget_alert_pct")}
          hint={t("tenders.estimated_budget_se_itne_upar_alert")}>
          <TxtIn type="number" value={form.budget_alert_pct} onChange={v=>set("budget_alert_pct",v)} ph="e.g. 5"/>
        </Field>
        <Field label={t("tenders.nit_date_2")}><TxtIn type="date" value={form.nit_date} onChange={v=>set("nit_date",v)}/></Field>
        <Field label={t("tenders.bid_submission_date")}><TxtIn type="date" value={form.submission_date} onChange={v=>set("submission_date",v)}/></Field>
        <Field label={t("tenders.techno_commercial_date")}><TxtIn type="date" value={form.techno_commercial_date} onChange={v=>set("techno_commercial_date",v)}/></Field>
        <Field label={t("tenders.bid_submission_type")}>
          <SelIn value={form.bid_submission_type} onChange={v=>set("bid_submission_type",v)}
            options={BID_SUBMISSION_TYPES} ph={t("tenders.chuno")}/>
        </Field>
        <Field label={t("tenders.reverse_auction_date")} full hint={t("tenders.bid_ke_baad_reverse_auction_ho")}>
          <TxtIn type="date" value={form.reverse_auction_date} onChange={v=>set("reverse_auction_date",v)}/>
        </Field>
        <Field label={t("tenders.nit_ke_main_points")} full
          hint={t("tenders.zaroori_clause_sd_completion_period_penalty")}>
          <textarea value={form.nit_clauses} onChange={e=>set("nit_clauses",e.target.value)} rows={3}
            style={{...inputStyle, resize:"vertical", lineHeight:1.5}}
            placeholder={t("tenders.e_g_clause_5_2_sd")}/>
        </Field>
        <Field label={t("tenders.loa_date")}><TxtIn type="date" value={form.loa_date} onChange={v=>set("loa_date",v)}/></Field>
        <Field label={t("tenders.agreement_no")}><TxtIn value={form.agreement_no} onChange={v=>set("agreement_no",v)}/></Field>
        <Field label={t("tenders.agreement_date")}><TxtIn type="date" value={form.agreement_date} onChange={v=>set("agreement_date",v)}/></Field>
        <Field label={t("tenders.work_order_date")}><TxtIn type="date" value={form.work_order_date} onChange={v=>set("work_order_date",v)}/></Field>
        <Field label={t("tenders.stipulated_completion")}><TxtIn type="date" value={form.stipulated_completion} onChange={v=>set("stipulated_completion",v)}/></Field>
        <Field label={`Actual Completion Date${needsCompletion?" *":""}`}
          hint={t("tenders.kaam_asli_me_kab_khatam_hua")}>
          <TxtIn type="date" value={form.actual_completion_date} onChange={v=>set("actual_completion_date",v)}/>
        </Field>
        <Field label={t("tenders.dlp_months")}><TxtIn type="number" value={form.dlp_months} onChange={v=>set("dlp_months",v)}/></Field>
        <Field label={t("tenders.dlp_end_date")}
          hint={form.dlp_end_date
            ? t("tenders.aapne_khud_set_ki_hai_yahi")
            : autoDlpEnd
              ? `Khali chhodo to auto — ${fmtDate(autoDlpEnd)} ban jayegi.`
              : t("tenders.khali_chhodo_to_auto_completion_date")}>
          {/* type="date" input placeholder attribute ko ignore karta hai
              (browser khud dd-mm-yyyy dikhata hai), isliye auto value ek
              ghost chip me right side par overlay ki hai. */}
          <div style={{position:"relative"}}>
            <TxtIn type="date" value={form.dlp_end_date}
              onChange={v=>{setDlpEndTouched(true); set("dlp_end_date",v);}}/>
            {!form.dlp_end_date && !!autoDlpEnd && (
              <div style={{position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                pointerEvents:"none", fontSize:10.5, fontWeight:700, color:T.ind,
                background:T.indL, border:`1px solid ${T.indM}`, borderRadius:20, padding:"1px 8px"}}>{t("tenders.auto_fmtdate", { fmtDate: fmtDate(autoDlpEnd) })}</div>
            )}
          </div>
        </Field>

        <Field label={t("common.notes")} full>
          <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3}
            style={{...inputStyle, resize:"vertical", lineHeight:1.5}}
            onFocus={e=>e.target.style.borderColor=T.ind} onBlur={e=>e.target.style.borderColor=T.b1}/>
        </Field>

        {/* ── DANGER ZONE — archive ya permanent delete (admin only) ── */}
        {isAdmin && (
          <div style={{gridColumn:"1/3", marginTop:4, paddingTop:14, borderTop:`1px solid ${T.b1}`}}>
            <div style={{fontSize:13, fontWeight:700, color:T.red, marginBottom:8}}>{t("projects.danger_zone")}</div>
            <DangerDelete kind="tender" id={tender.id}
              name={[tender.tender_no, tender.title].filter(Boolean).join(" — ")}
              onArchived={()=>{ onClose(); onDeleted && onDeleted(); }}
              onDeleted={()=>{ onClose(); onDeleted && onDeleted(); }}/>
          </div>
        )}
      </div>
      {addParty && (
        <AddPartyInlineModal onClose={()=>setAddParty(false)}
          onAdded={(pt)=>{ setAddParty(false); loadParties(pt?.id); }}/>
      )}
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// LIST SCREEN
// ════════════════════════════════════════════════════════════════════
// Poora pipeline + Lost sabse aakhir me (wo stage nahi, dead-end hai).
const CHIPS = [
  {id:"all",       get label() { return t("tenders.all"); }},
  ...PIPELINE.map(s => ({id:s, label:sMeta(s).label})),
  {id:"lost",      get label() { return t("crm.lost"); }},
];

function TenderList({onOpen}) {
  const toast = useToast();
  const [rows, setRows]     = useState([]);
  const [kpis, setKpis]     = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chip, setChip]     = useState("all");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // Status filter client-side lagta hai taaki har chip ka count bhi
    // mile — backend ?status= sirf list ko filter karta, counts nahi deta.
    const res = await api.get("/tenders");
    setLoading(false);
    if (!res?.success) { toast.error(res?.message || "Tenders load nahi hue"); return; }
    setRows(res.data || []);
    setKpis(res.kpis || null);
    setAlerts(res.alerts || []);
  }, [toast]);

  useEffect(()=>{ load(); }, [load]);

  const counts = useMemo(()=>{
    const c = {all: rows.length};
    for (const r of rows) c[r.status] = (c[r.status]||0) + 1;
    return c;
  }, [rows]);

  // Har tender par kitne alert hain — table me badge ke liye.
  const alertsByTender = useMemo(()=>{
    const m = {};
    for (const a of alerts) {
      if (!a.tender_id) continue;
      if (!m[a.tender_id]) m[a.tender_id] = [];
      m[a.tender_id].push(a);
    }
    return m;
  }, [alerts]);

  const filtered = useMemo(()=>{
    const q = search.trim().toLowerCase();
    return rows.filter(r=>{
      if (chip !== "all" && r.status !== chip) return false;
      if (!q) return true;
      return [r.tender_no, r.title, r.department_name, r.party_name]
        .some(v => String(v||"").toLowerCase().includes(q));
    });
  }, [rows, chip, search]);

  const KPI_TILES = kpis ? [
    {label:t("tenders.active_tenders"),    value:kpis.active_count,                note:"lost + closed chhod kar", color:T.ind, Icon:IcGavel},
    // BOQ value = jis par bill banega; contract = BOQ ± above/below.
    // Dono saath dikhte hain to premium ka farak turant samajh aata hai.
    {label:t("tenders.boq_value"),         value:money(kpis.boq_value_sum),        note:"active tenders ka BOQ",   color:T.blu, Icon:IcRupee},
    {label:t("tenders.contract_value"),    value:money(kpis.contract_value_sum),   note:"won aur uske aage",       color:T.grn, Icon:IcRupee},
    // EMD ke do tile ek me — dono baatein EMD ki hi hain.
    {label:t("tenders.emd_locked"),        value:money(kpis.emd_locked),
      note:kpis.emd_refund_pending ? `active EMD \u00B7 ${kpis.emd_refund_pending} refund pending` : "active EMD",
      color:kpis.emd_refund_pending?T.amb:T.blu, Icon:IcLock},
    {label:t("tenders.bg_expiring_30d"),  value:kpis.bg_expiring_30d,             note:"BG / FDR validity",       color:kpis.bg_expiring_30d?T.red:T.slt, Icon:IcBank},
  ] : [];

  return (
    <div style={{padding:"14px 18px", fontFamily:"'Segoe UI',system-ui,sans-serif", background:T.bg, minHeight:"100%"}}>

      <AlertsStrip alerts={alerts} onJump={onOpen}/>

      {/* KPI tiles */}
      {kpis && (
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:10, marginBottom:12}}>
          {KPI_TILES.map(t=><Stat key={t.label} {...t}/>)}
        </div>
      )}

      {/* Toolbar — chips + search + new */}
      <div style={{background:T.surface, borderRadius:8, padding:"7px 10px", marginBottom:9,
        border:`1px solid ${T.b1}`, display:"flex", gap:7, alignItems:"center", flexWrap:"wrap"}}>
        <div style={{display:"flex", gap:2, background:T.bg, borderRadius:7, padding:3, border:`1px solid ${T.b1}`, flexWrap:"wrap"}}>
          {CHIPS.map(c=>{
            const on = chip===c.id;
            const n = counts[c.id]||0;
            return (
              <button key={c.id} onClick={()=>setChip(c.id)}
                style={{padding:"4px 11px", borderRadius:5, border:"none", background:on?T.surface:"none",
                  color:on?T.ind:T.t3, fontSize:11.5, fontWeight:on?700:400, cursor:"pointer",
                  boxShadow:on?"0 1px 3px rgba(0,0,0,.08)":"none", whiteSpace:"nowrap"}}>
                {c.label}
                <span style={{marginLeft:4, background:on?T.ind:T.b2, color:on?"#fff":T.t3,
                  fontSize:9, fontWeight:700, padding:"0 5px", borderRadius:10}}>{n}</span>
              </button>
            );
          })}
        </div>

        <div style={{position:"relative", flex:1, minWidth:180}}>
          <div style={{position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", lineHeight:0}}>
            <IcSrch size={13} color={T.t4}/>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("tenders.tender_no_title_ya_department_dhoondo")}
            style={{width:"100%", height:32, padding:"0 9px 0 28px", borderRadius:6,
              border:`1.5px solid ${search?T.ind:T.b1}`, fontSize:12.5, color:T.t1,
              background:search?T.indL:T.surfaceB, outline:"none", boxSizing:"border-box", fontFamily:"inherit"}}
            onFocus={e=>{e.target.style.borderColor=T.ind; e.target.style.background=T.indL;}}
            onBlur={e=>{if(!search){e.target.style.borderColor=T.b1; e.target.style.background=T.surfaceB;}}}/>
        </div>

        <PrimBtn label={t("tenders.naya_tender")} Icon={IcAdd} onClick={()=>setShowNew(true)}/>
      </div>

      {/* Table */}
      <Panel>
        <div style={{display:"grid", gridTemplateColumns:"minmax(200px,2.2fr) 1.2fr 1fr 1fr 105px 70px 80px",
          padding:"8px 15px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}`, gap:10}}>
          {["Tender","Department","BOQ Value","Contract Value","Status","Sites","Alerts"].map(h=>(
            <span key={h} style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".6px"}}>{h}</span>
          ))}
        </div>

        {loading && <Loading text={t("tenders.tenders_load_ho_rahe_hain")}/>}

        {!loading && !filtered.length && (
          <Empty Icon={IcGavel}
            text={rows.length ? t("tenders.is_filter_me_koi_tender_nahi") : t("tenders.abhi_koi_tender_nahi")}
            sub={rows.length ? t("tenders.doosra_status_chip_try_karo") : t("tenders.upar_naya_tender_se_pehla_record")}/>
        )}

        {!loading && filtered.map((r,i)=>{
          const sm = sMeta(r.status);
          const ta = alertsByTender[r.id] || [];
          const high = ta.some(a=>a.severity==="high");
          // BOQ value = jis par bill banega (import ke items ka jod; na ho
          // to NIT se bhara manual, warna estimated cost). Contract value
          // alag column me — dono ka farak hi above/below premium hai.
          const boqVal = num(r.boq_total);
          const manualVal = num(r.boq_value_manual);
          const value = boqVal || manualVal || num(r.estimated_cost);
          const valueNote = boqVal ? null
            : manualVal ? t("tenders.manual")
            : num(r.estimated_cost) > 0 ? t("tenders.estimated") : null;
          const cVal = num(r.contract_value);
          // premium sirf tab jab dono asli ho — warna % bhramak hoga
          const prem = boqVal > 0 && cVal > 0 ? ((cVal / boqVal - 1) * 100) : null;
          return (
            <div key={r.id} onClick={()=>onOpen(r.id)}
              style={{display:"grid", gridTemplateColumns:"minmax(200px,2.2fr) 1.2fr 1fr 1fr 105px 70px 80px",
                padding:"10px 15px", gap:10, alignItems:"center", cursor:"pointer",
                borderBottom:i<filtered.length-1?`1px solid ${T.b1}`:"none", transition:"background .12s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12, fontWeight:700, color:T.ind, fontVariantNumeric:"tabular-nums"}}>{r.tender_no}</div>
                <div style={{fontSize:12.5, color:T.t1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{r.title}</div>
              </div>
              <div style={{fontSize:12, color:T.t2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                {r.party_name || r.department_name || <span style={{color:T.t4}}>--</span>}
              </div>
              <div>
                <div style={{fontSize:12.5, fontWeight:700, color:T.t1, fontVariantNumeric:"tabular-nums"}}>
                  {value ? money(value) : <span style={{color:T.t4, fontWeight:400}}>--</span>}
                </div>
                {valueNote && <div style={{fontSize:9.5, color:T.t4, textTransform:"uppercase", letterSpacing:".4px"}}>{valueNote}</div>}
              </div>
              <div>
                <div style={{fontSize:12.5, fontWeight:700, color:cVal?T.grn:T.t4, fontVariantNumeric:"tabular-nums"}}>
                  {cVal ? money(cVal) : <span style={{fontWeight:400}}>--</span>}
                </div>
                {prem !== null && Math.abs(prem) >= 0.01 && (
                  <div style={{fontSize:9.5, color:T.t4, letterSpacing:".4px"}}>
                    {prem > 0 ? "+" : "\u2212"}{Math.abs(prem).toFixed(2)}%
                  </div>
                )}
              </div>
              <div><Pill label={sm.label} c={sm.c} bg={sm.bg}/></div>
              <div style={{fontSize:12, color:num(r.linked_project_count)?T.t1:T.t4, fontWeight:num(r.linked_project_count)?700:400}}>
                {num(r.linked_project_count)}
              </div>
              <div>
                {ta.length > 0 && (
                  <span style={{display:"inline-flex", alignItems:"center", gap:4, background:high?T.redL:T.ambL,
                    color:high?T.red:T.amb, border:`1px solid ${high?T.redM:T.ambM}`, fontSize:10.5, fontWeight:700,
                    padding:"2px 8px", borderRadius:20}}>
                    <IcWarn size={10} color={high?T.red:T.amb}/>{ta.length}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </Panel>

      {showNew && <NewTenderModal onClose={()=>setShowNew(false)}
        onCreated={(t)=>{ load(); if (t?.id) onOpen({id:t.id, tab:"boq", fresh:true}); }}/>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ADD INSTRUMENT MODAL
// ════════════════════════════════════════════════════════════════════
// ── INSTRUMENT RELEASE / REFUND / FORFEIT ───────────────────────────
// Pehle ye ek confirm-click me ho jata tha — EMD galti se "forfeit" mark ho
// jaye to na amount ka pata chalta, na bank reference, na wajah. Ab poora
// form: kitna, kab, kis reference se, aur kyun. Forfeit par wajah compulsory
// (paisa doob raha hai).
const ACTION_META = {
  release: {get title() { return t("tenders.release"); }, c:T.blu,
    get sub() { return t("tenders.bank_department_ne_instrument_release_kar"); },
    amtLabel:"Released amount (₹)", refLabel:"Release letter / reference"},
  refund:  {get title() { return t("tenders.refund"); },  c:T.grn,
    get sub() { return t("tenders.paisa_wapas_aa_gaya"); },
    amtLabel:"Wapas aaya amount (₹)", refLabel:"UTR / cheque / reference"},
  forfeit: {get title() { return t("tenders.forfeit"); }, c:T.red,
    get sub() { return t("tenders.instrument_zabt_ho_gaya_paisa_wapas"); },
    amtLabel:"Zabt hua amount (₹)", refLabel:"Department letter / order no"},
};

function InstrumentActionModal({tenderId, inst, action, onClose, onDone}) {
  const toast = useToast();
  const meta = ACTION_META[action] || ACTION_META.release;
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  const [form, setForm] = useState({
    date: todayYMD(),
    amount: inst?.amount ?? "",
    ref: "",
    mode: action === "refund" ? "online" : "",
    remarks: "",
    account_id: "",
  });
  // Forfeit par Finance me expense banti hai — kis account se paisa gaya, wo
  // chun sakte ho. Release/refund par koi entry nahi banti, to list bhi nahi.
  const [accounts, setAccounts] = useState([]);
  useEffect(()=>{
    if (action !== "forfeit") return;
    let dead = false;
    api.get("/finance/accounts").then(r=>{
      if (!dead && r?.success && Array.isArray(r.data)) setAccounts(r.data);
    }).catch(()=>{});
    return ()=>{ dead = true; };
  }, [action]);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const isForfeit = action === "forfeit";
  const amtNum = numOf(form.amount);
  const instAmt = numOf(inst?.amount);
  const shortReason = isForfeit && form.remarks.trim().length < 10;
  const partial = amtNum > 0 && amtNum < instAmt;

  const submit = async () => {
    setErr("");
    if (!form.date) return setErr(t("tenders.date_zaroori_hai"));
    if (form.date > todayYMD()) return setErr(t("tenders.date_aaj_se_aage_ki_nahi"));
    if (amtNum <= 0) return setErr(t("tenders.amount_0_se_bada_hona_chahiye"));
    if (amtNum > instAmt + 0.009) return setErr(`Instrument ${moneyF(instAmt)} ka hai — usse zyada nahi ho sakta`);
    if (shortReason) return setErr(t("tenders.forfeit_karne_ki_wajah_likhna_zaroori"));
    setBusy(true);
    const res = await api.put(`/tenders/${tenderId}/instruments/${inst.id}`, {
      action,
      release_date: form.date,
      action_amount: form.amount,
      action_ref: form.ref.trim() || null,
      action_mode: form.mode || null,
      action_remarks: form.remarks.trim() || null,
      ...(isForfeit && form.account_id ? {account_id: Number(form.account_id)} : {}),
    });
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Action nahi hua"); return; }
    toast.success(`${meta.title} ho gaya`);
    onDone();
  };

  return (
    <Modal title={`${typeLabel(inst.type)} — ${meta.title}`} Icon={IcBank} width={560}
      sub={meta.sub} onClose={onClose}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        <PrimBtn label={busy ? t("tenders.ho_raha_hai") : `${meta.title} karo`} Icon={IcChk}
          color={meta.c} onClick={submit} disabled={busy}/>
      </>}>
      <ErrLine msg={err}/>

      {/* Kis instrument par — taaki galat row par action na ho jaye */}
      <div style={{padding:"10px 12px", background:T.surfaceB, border:`1px solid ${T.b1}`,
        borderRadius:7, marginBottom:13, display:"flex", gap:14, flexWrap:"wrap", fontSize:11.5}}>
        {[["Type", typeLabel(inst.type)],
          ["Reference", [modeLabel(inst.mode), inst.ref_no].filter(Boolean).join(" · ") || "--"],
          ["Bank", inst.bank_name || "--"],
          ["Jama amount", money(inst.amount)]].map(([l,v])=>(
          <div key={l}>
            <div style={{fontSize:9.5, color:T.t4, fontWeight:700, textTransform:"uppercase", letterSpacing:".5px"}}>{l}</div>
            <div style={{color:T.t1, fontWeight:600, marginTop:2}}>{v}</div>
          </div>
        ))}
      </div>

      {isForfeit && (
        <div style={{padding:"10px 12px", background:T.redL, border:`1px solid ${T.redM}`,
          borderRadius:7, fontSize:12, color:T.t2, lineHeight:1.6, marginBottom:13,
          display:"flex", gap:8, alignItems:"flex-start"}}>
          <IcWarn size={14} color={T.red}/>
          <span><b style={{color:T.red}}>{t("tenders.ye_paisa_wapas_nahi_aayega")}</b> {t("tenders.finance_me_isi_amount_ki")}
            <b> {t("finance.emd_forfeit")}</b> {t("tenders.expense_entry_ban_jayegi_galti_ho")}</span>
        </div>
      )}

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label={`${meta.title} Date *`}>
          <TxtIn type="date" value={form.date} onChange={v=>set("date",v)}/>
        </Field>
        <Field label={meta.amtLabel + " *"}
          hint={partial ? `Jama ${moneyF(instAmt)} me se — baaki ${moneyF(instAmt-amtNum)}` : undefined}>
          <TxtIn type="number" value={form.amount} onChange={v=>set("amount",v)} ph="0"/>
        </Field>
        <Field label={meta.refLabel} full>
          <TxtIn value={form.ref} onChange={v=>set("ref",v)} ph={t("tenders.e_g_utr_1234567890_ee_2026")}/>
        </Field>
        {action === "refund" && (
          <Field label={t("tenders.kaise_wapas_aaya")} full>
            <SelIn value={form.mode} onChange={v=>set("mode",v)} options={INSTRUMENT_MODES} ph={t("tenders.chuno")}/>
          </Field>
        )}
        {isForfeit && (
          <Field label={t("tenders.kis_account_se_gaya")} full
            hint={t("tenders.finance_me_is_amount_ki_expense")}>
            <SelIn value={form.account_id} onChange={v=>set("account_id",v)} ph={t("tenders.account_chuno_optional")}
              options={accounts.map(a=>({v:String(a.id), l:a.name}))}/>
          </Field>
        )}
        <Field label={isForfeit ? t("tenders.wajah") : t("common.remarks")} full
          hint={isForfeit ? t("tenders.kam_se_kam_10_akshar_record") : undefined}>
          <textarea value={form.remarks} onChange={e=>set("remarks",e.target.value)} rows={2}
            placeholder={isForfeit ? t("tenders.e_g_bid_withdraw_kiya_emd") : t("common.optional")}
            style={{...inputStyle, resize:"vertical", lineHeight:1.5}}/>
        </Field>
      </div>
    </Modal>
  );
}

// ── STAGE TRANSITION MODAL ──────────────────────────────────────────
// Pipeline ka "Aage badhao" / "Lost mark karo" isi ko kholta hai.
// Yahan sirf wahi rok hai jo backend bhi lagata hai — modal pehle bata
// deta hai taaki 400 khaane ki nautbat na aaye. Do cheezein sirf salah
// hain, rok nahi: won par instrument reminder, aur completed par adhoore
// projects ki warning.
function TransitionModal({tender, projects, target, onClose, onDone}) {
  const toast = useToast();
  const isAdmin = ["admin","super_admin"].includes(getUser()?.role);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  // Won hote hi BG/FDR/SD unlock hote hain — form turant khol dena sabse
  // aasan hai, warna log baad me bhool jate hain.
  const [addInstAfter, setAddInstAfter] = useState(true);

  const from = tender.status;
  const val = checkTransition(from, target, isAdmin);

  // Backend ke do hard gate — yahan pehle hi pakad lete hain.
  const needsWon = WON_OR_LATER.includes(target);
  const wonMissing = needsWon && (tender.contract_value === null || tender.contract_value === undefined
    || tender.contract_value === "" || !tender.party_id);
  const completionMissing = COMPLETION_REQUIRED.includes(target) && !tender.actual_completion_date;

  // Sirf salah — adhoore project ginwa dete hain par rokte nahi.
  const openProjects = target === "completed"
    ? (projects || []).filter(p => String(p.status||"").toLowerCase() !== "completed")
    : [];

  const blocked = !val.ok || wonMissing || completionMissing;
  const noteMissing = val.noteRequired && !note.trim();

  const go = async () => {
    setErr("");
    if (noteMissing) return setErr(t("tenders.is_stage_change_ke_liye_note"));
    setBusy(true);
    const body = {status: target};
    if (note.trim()) body.status_note = note.trim();
    const res = await api.put(`/tenders/${tender.id}`, body);
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Stage change nahi hua"); return; }
    toast.success(`Tender ab ${sMeta(target).label} me hai`);
    onDone({openInstrument: target === "won" && addInstAfter});
  };

  const fm = sMeta(from), tm = sMeta(target);

  return (
    <Modal title={t("tenders.stage_change")} Icon={IcGavel} width={560}
      sub={`${fm.label} se ${tm.label}`}
      onClose={onClose}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        <PrimBtn label={busy ? t("tenders.ho_raha_hai") : `${tm.label} karo`} Icon={IcChk}
          onClick={go} disabled={busy || blocked}/>
      </>}>
      <ErrLine msg={err}/>

      {/* from → to */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:12,
        padding:"12px 0 16px"}}>
        <Pill label={fm.label} c={fm.c} bg={fm.bg}/>
        <span style={{color:T.t4, fontSize:16}}>→</span>
        <Pill label={tm.label} c={tm.c} bg={tm.bg}/>
      </div>

      {/* Transition hi allowed nahi */}
      {!val.ok && (
        <div style={{padding:"10px 12px", background:T.redL, border:`1px solid ${T.redM}`,
          borderRadius:7, fontSize:12, color:T.red, display:"flex", gap:8, alignItems:"flex-start",
          marginBottom:11}}>
          <IcWarn size={14} color={T.red}/><span>{val.msg}</span>
        </div>
      )}

      {/* Hard gates — Edit modal me jaakar bharna padega */}
      {wonMissing && (
        <div style={{padding:"10px 12px", background:T.ambL, border:`1px solid ${T.ambM}`,
          borderRadius:7, fontSize:12, color:T.t2, lineHeight:1.6, marginBottom:11}}><Rich k="tenders.pehle_ye_bharo_label_par_jaane" params={{ label: tm.label }} /></div>
      )}
      {completionMissing && (
        <div style={{padding:"10px 12px", background:T.ambL, border:`1px solid ${T.ambM}`,
          borderRadius:7, fontSize:12, color:T.t2, lineHeight:1.6, marginBottom:11}}><Rich k="tenders.pehle_ye_bharo_actual_completion_date" params={{ v: " ", label: tm.label }} /></div>
      )}

      {/* Won — instrument reminder (sirf yaad dilana) */}
      {val.ok && target === "won" && (
        <div style={{padding:"10px 12px", background:T.indL, border:`1px solid ${T.indM}`,
          borderRadius:7, fontSize:12, color:T.t2, lineHeight:1.6, marginBottom:11}}>
          <b style={{color:T.ind}}>{t("tenders.jeetne_ke_baad")}</b> — <b>{t("tenders.bg_fdr_security_deposit")}</b> {t("tenders.jo_bhi_department_maange_wo_abhi")}
          <label style={{display:"flex", alignItems:"center", gap:7, marginTop:8, cursor:"pointer"}}>
            <input type="checkbox" checked={addInstAfter} onChange={e=>setAddInstAfter(e.target.checked)}
              style={{width:15, height:15, accentColor:T.ind, cursor:"pointer"}}/>
            <span style={{fontSize:12, color:T.t1, fontWeight:600}}>
             {t("tenders.won_karte_hi_instrument_jodne_ka")}
            </span>
          </label>
        </div>
      )}

      {/* Completed — adhoore project, warning bhar */}
      {val.ok && !!openProjects.length && (
        <div style={{padding:"10px 12px", background:T.ambL, border:`1px solid ${T.ambM}`,
          borderRadius:7, fontSize:12, color:T.t2, lineHeight:1.6, marginBottom:11}}>
          <b style={{color:T.amb}}>{t("tenders.openprojects_site_abhi_complete_nahi_hai", { openProjects: openProjects.length })}</b>
          <div style={{marginTop:5}}>
            {openProjects.map(p=>(
              <div key={p.id} style={{fontSize:11.5}}>
                • {p.name} <span style={{color:T.t4}}>({p.status || "--"})</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:6, color:T.t3, fontSize:11}}>
           {t("tenders.phir_bhi_aage_badh_sakte_ho")}
          </div>
        </div>
      )}

      {/* Note */}
      {val.ok && (
        <Field label={val.noteRequired ? t("tenders.note") : t("common.note_optional")}
          hint={val.kind === "backward"
            ? t("tenders.stage_peeche_ja_raha_hai_kyun_2")
            : t("tenders.ye_note_tender_ki_stage_history")}>
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3}
            style={{...inputStyle, resize:"vertical", lineHeight:1.5}}
            placeholder={val.kind === "lost"
              ? t("tenders.e_g_l1_se_4_zyada")
              : `${fm.label} se ${tm.label} — kyun?`}/>
        </Field>
      )}
    </Modal>
  );
}

function AddInstrumentModal({tenderId, tenderStatus, onClose, onSaved}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  const [form, setForm] = useState({
    type:"emd", mode:"dd", ref_no:"", bank_name:"", amount:"",
    issue_date:todayYMD(), validity_date:"", remarks:"",
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const submit = async () => {
    setErr("");
    if (!form.amount || Number(form.amount) <= 0) return setErr(t("tenders.amount_zaroori_hai_aur_0_se"));
    setBusy(true);
    const res = await api.post(`/tenders/${tenderId}/instruments`, {
      type: form.type,
      mode: form.mode || null,
      ref_no: form.ref_no.trim() || null,
      bank_name: form.bank_name.trim() || null,
      amount: form.amount,
      issue_date: form.issue_date || null,
      validity_date: form.validity_date || null,
      remarks: form.remarks.trim() || null,
    });
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Instrument save nahi hua"); return; }
    toast.success("Instrument jud gaya");
    onSaved && onSaved();
    onClose();
  };

  const needsValidity = form.type === "bg" || form.type === "fdr";
  // Bid ke saath sirf EMD jati hai — baaki won ke baad.
  const typeOpts = instrumentTypesFor(tenderStatus);
  const bidOnly  = tenderStatus === "bidding";

  return (
    <Modal title={t("tenders.naya_instrument")} Icon={IcBank} onClose={onClose} width={560}
      sub={bidOnly ? t("tenders.bid_stage_sirf_emd") : t("tenders.emd_bg_fdr_security_deposit")}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        <PrimBtn label={busy?t("tenders.save_ho_raha"):t("machinery.jodo")} onClick={submit} disabled={busy}/>
      </>}>
      <ErrLine msg={err}/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label={t("projects.type")} hint={bidOnly ? t("tenders.bg_fdr_security_deposit_tender_won") : undefined}>
          <SelIn value={form.type} onChange={v=>set("type",v)} options={typeOpts}/>
        </Field>
        <Field label={t("common.mode")}><SelIn value={form.mode} onChange={v=>set("mode",v)} options={INSTRUMENT_MODES}/></Field>
        <Field label={t("common.amount")}><TxtIn type="number" value={form.amount} onChange={v=>set("amount",v)} ph="0"/></Field>
        <Field label={t("common.reference_no")}><TxtIn value={form.ref_no} onChange={v=>set("ref_no",v)} ph={t("tenders.dd_bg_number")}/></Field>
        <Field label={t("common.bank_name")} full><TxtIn value={form.bank_name} onChange={v=>set("bank_name",v)} ph={t("tenders.e_g_sbi_durg")}/></Field>
        <Field label={t("tenders.issue_date")}><TxtIn type="date" value={form.issue_date} onChange={v=>set("issue_date",v)}/></Field>
        <Field label={`Validity Date${needsValidity?" (alert isi par)":""}`}
          hint={needsValidity ? t("tenders.bg_fdr_ki_validity_30_din") : undefined}>
          <TxtIn type="date" value={form.validity_date} onChange={v=>set("validity_date",v)}/>
        </Field>
        <Field label={t("common.remarks")} full>
          <textarea value={form.remarks} onChange={e=>set("remarks",e.target.value)} rows={2}
            style={{...inputStyle, resize:"vertical", lineHeight:1.5}}
            onFocus={e=>e.target.style.borderColor=T.ind} onBlur={e=>e.target.style.borderColor=T.b1}/>
        </Field>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// LINK EXISTING PROJECT MODAL
// ════════════════════════════════════════════════════════════════════
function LinkProjectModal({tenderId, onClose, onSaved}) {
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");

  useEffect(()=>{
    api.get("/projects").then(r=>{
      setLoading(false);
      if (!r?.success) { setErr(r?.message || "Projects load nahi hue"); return; }
      // Sirf wahi projects jo kisi tender se jude nahi hain.
      setProjects((r.data||[]).filter(p=>!p.tender_id));
    }).catch(()=>setLoading(false));
  },[]);

  const submit = async () => {
    setErr("");
    if (!pick) return setErr(t("tenders.project_chunna_zaroori_hai"));
    setBusy(true);
    const res = await api.put(`/tenders/${tenderId}/link-project`, {project_id: Number(pick), action:"link"});
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Link nahi hua"); return; }
    toast.success(res.message || "Project jud gaya");
    onSaved && onSaved();
    onClose();
  };

  return (
    <Modal title={t("tenders.existing_project_jodo")} Icon={IcLink} onClose={onClose} width={520}
      sub={t("tenders.sirf_wo_projects_jo_abhi_kisi")}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        <PrimBtn label={busy?t("tenders.jud_raha"):t("tenders.link_karo")} onClick={submit} disabled={busy||!projects.length}/>
      </>}>
      <ErrLine msg={err}/>
      {loading && <Loading text={t("tenders.projects_load_ho_rahe_hain")}/>}
      {!loading && !projects.length && (
        <Empty Icon={IcSite} text={t("tenders.koi_free_project_nahi_mila")}
          sub={t("tenders.saare_projects_pehle_se_kisi_tender")}/>
      )}
      {!loading && !!projects.length && (
        <Field label={t("common.project_2")}>
          <SelIn value={pick} onChange={setPick} ph={t("tenders.project_chuno")}
            options={projects.map(p=>({v:String(p.id), l:`${p.name}${p.city_name?` — ${p.city_name}`:""}`}))}/>
        </Field>
      )}
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// NEW SITE MODAL — project banao + turant tender se link karo
//
// Ek hi call: POST /projects (name + cityId + constructionTypeId
// mandatory) + optional tender_id. Backend usi INSERT me link kar deta
// hai, isliye "project bana par juda nahi" wala orphan case ab nahi hai.
// ════════════════════════════════════════════════════════════════════
function NewSiteModal({tender, onClose, onSaved}) {
  const toast = useToast();
  const [cities, setCities] = useState([]);
  const [ctypes, setCtypes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  const [form, setForm] = useState({
    name:"", cityId:"", constructionTypeId:"",
    start_date:"", end_date: dateOnly(tender.stipulated_completion),
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  useEffect(()=>{
    Promise.all([api.get("/library/cities"), api.get("/library/construction-types")])
      .then(([cr,tr])=>{
        if (cr?.success) setCities(cr.data||[]);
        if (tr?.success) setCtypes(tr.data||[]);
      }).catch(()=>{});
  },[]);

  const submit = async () => {
    setErr("");
    if (!form.name.trim())          return setErr(t("tenders.site_ka_naam_zaroori_hai"));
    if (!form.cityId)               return setErr(t("tenders.city_zaroori_hai"));
    if (!form.constructionTypeId)   return setErr(t("tenders.construction_type_zaroori_hai"));
    setBusy(true);

    const city  = cities.find(c=>String(c.id)===String(form.cityId));
    const ctype = ctypes.find(c=>String(c.id)===String(form.constructionTypeId));

    // Ek hi call — backend usi INSERT me tender_id set kar deta hai, to
    // ab "project bana par juda nahi" wala orphan case banta hi nahi.
    const created = await api.post("/projects", {
      name: form.name.trim(),
      client_name: tender.party_name || tender.department_name || "",
      city: city?.name || "",
      cityId: Number(form.cityId),
      constructionTypeId: Number(form.constructionTypeId),
      type: (ctype?.name || "").toLowerCase(),
      project_type: "construction",
      status: "not_started",
      contract_value: num(tender.contract_value),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      tender_id: tender.id,
    });
    setBusy(false);
    if (!created?.success || !created.data?.id) {
      setErr(created?.message || "Project ban nahi paya");
      return;
    }
    toast.success("Site ban gayi aur tender se jud gayi");
    onSaved && onSaved();
    onClose();
  };

  return (
    <Modal title={t("tenders.nayi_site")} Icon={IcSite} onClose={onClose} width={560}
      sub={`Tender ${tender.tender_no} ke against`}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        <PrimBtn label={busy?t("tenders.ban_raha"):t("tenders.site_banao")} onClick={submit} disabled={busy}/>
      </>}>
      <ErrLine msg={err}/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label={t("tenders.site_project_name")} full>
          <TxtIn value={form.name} onChange={v=>set("name",v)} ph={t("tenders.e_g_package_2_durg_bypass")}/>
        </Field>
        <Field label={t("common.city_2")}>
          <SelIn value={form.cityId} onChange={v=>set("cityId",v)} ph={t("tenders.city_chuno")}
            options={cities.map(c=>({v:String(c.id), l:c.name}))}/>
        </Field>
        <Field label={t("crm.construction_type")}>
          <SelIn value={form.constructionTypeId} onChange={v=>set("constructionTypeId",v)} ph={t("tenders.type_chuno")}
            options={ctypes.map(c=>({v:String(c.id), l:c.name}))}/>
        </Field>
        <Field label={t("common.start_date")}><TxtIn type="date" value={form.start_date} onChange={v=>set("start_date",v)}/></Field>
        <Field label={t("common.end_date")}><TxtIn type="date" value={form.end_date} onChange={v=>set("end_date",v)}/></Field>
        <div style={{gridColumn:"1/3", background:T.sltL, border:`1px solid ${T.b1}`, borderRadius:7,
          padding:"9px 12px", fontSize:11.5, color:T.t3, lineHeight:1.5}}>
         {t("tenders.site_banne_ke_baad_poora_kaam")}
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// DOCUMENT UPLOAD MODAL — Cloudinary (subcon/design wala hi preset)
// ════════════════════════════════════════════════════════════════════
const CLOUD_NAME    = "dd632nqfm";
const UPLOAD_PRESET = "gb_buildcon_drawings";

function AddDocumentModal({tenderId, onClose, onSaved}) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [docType, setDocType] = useState("nit");
  const [name, setName] = useState("");
  const [url, setUrl]   = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");

  const pickFile = async (file) => {
    if (!file) return;
    setErr(""); setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      fd.append("folder", "gb_buildcon/tender_docs");
      const isRaw = file.type === "application/pdf" || /\.(pdf|dwg|dxf|doc|docx|xls|xlsx)$/i.test(file.name);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${isRaw?"raw":"image"}/upload`,
        {method:"POST", body:fd});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Upload failed");
      setUrl(data.secure_url);
      setFileName(file.name);
      if (!name.trim()) setName(file.name);
    } catch (e) {
      setErr(e.message || "File upload nahi hui");
    }
    setUploading(false);
  };

  const submit = async () => {
    setErr("");
    if (!url) return setErr(t("tenders.pehle_file_upload_karo"));
    if (!name.trim()) return setErr(t("tenders.document_ka_naam_zaroori_hai"));
    setBusy(true);
    const res = await api.post(`/tenders/${tenderId}/documents`,
      {doc_type: docType, name: name.trim(), url});
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Document save nahi hua"); return; }
    toast.success("Document jud gaya");
    onSaved && onSaved();
    onClose();
  };

  return (
    <Modal title={t("tenders.document_jodo")} Icon={IcDoc} onClose={onClose} width={520}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        <PrimBtn label={busy?t("tenders.save_ho_raha"):t("machinery.jodo")} onClick={submit} disabled={busy||uploading}/>
      </>}>
      <ErrLine msg={err}/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label={t("tenders.document_type")}><SelIn value={docType} onChange={setDocType} options={DOC_TYPES}/></Field>
        <Field label={t("common.name")}><TxtIn value={name} onChange={setName} ph={t("tenders.e_g_nit_copy")}/></Field>

        <Field label={t("common.file")} full>
          <input ref={fileRef} type="file" style={{display:"none"}}
            onChange={e=>pickFile(e.target.files && e.target.files[0])}/>
          <div onClick={()=>!uploading && fileRef.current && fileRef.current.click()}
            style={{border:`1.5px dashed ${url?T.grn:T.b2}`, borderRadius:8, padding:"16px 14px",
              textAlign:"center", cursor:uploading?"wait":"pointer", background:url?T.grnL:T.bg}}>
            {uploading ? (
              <div style={{fontSize:12.5, color:T.t3}}>{t("fuel.upload_ho_raha_hai")}</div>
            ) : url ? (
              <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:7}}>
                <IcChk size={15} color={T.grn}/>
                <span style={{fontSize:12.5, color:T.grn, fontWeight:600}}>{fileName}</span>
              </div>
            ) : (
              <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:6}}>
                <IcUpload size={20} color={T.t4}/>
                <span style={{fontSize:12.5, color:T.t3}}>{t("tenders.file_chuno_pdf_ya_image")}</span>
              </div>
            )}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// DETAIL — tabs Overview | Sites | Instruments | Documents
// ════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════
// BOQ (T2) — parse helpers
//
// ⚠️ SYNC: src/modules/tabs/BoqImportWizard.js (project-level M1 import)
// me yahi logic hai. Uske helpers module-private hain (sirf default
// component export hota hai), isliye import nahi ho sakte — heuristics
// yahan dobara likhi hain. `TOTAL_RE`, continuation guard aur grand-total
// rule dono jagah jaan-boojh kar IDENTICAL hain: ek jagah badlo to doosri
// jagah bhi badlo, warna ek hi sheet do screen par alag padhi jayegi.
//
// Ek farak jaan-boojh kar hai: yahan continuation line pichhle item ki
// description me MERGE hoti hai (tender BOQ me flat items chahiye), jabki
// M1 wizard use alag row rakhta hai `is_continuation` + `parent_row_no`
// ke saath (uska backend `boq_import_items` wahi columns expect karta hai).
// ════════════════════════════════════════════════════════════════════

// Amount hamesha 2 decimal — server bhi exactly yahi karta hai.
const round2 = (v) => Math.round(((Number(v) || 0) + Number.EPSILON) * 100) / 100;

// BOQ me number "1,234.50", "₹500", ya cached formula value ban kar aata hai.
const numOf = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const isBlank = (v) => v === null || v === undefined || String(v).trim() === "";

const BOQ_TARGETS = [
  {key:"item_no",     label:"S.No / Item",  prefer:/^item\s*no/i, re:/^s\.?\s*no|^sr|serial|^#|^item\s*no/i},
  {key:"sor_code",    get label() { return t("boq_import_wizard.sor_code"); },   re:/sor|code|ref/i},
  {key:"description", get label() { return t("boq_import_wizard.description"); },  re:/description|item|particular|work/i, required:true},
  {key:"unit",        get label() { return t("common.unit"); },         re:/^unit|units|uom/i},
  {key:"qty",         get label() { return t("boq_import_wizard.quantity"); },     re:/qty|quantity|nos/i, required:true},
  {key:"rate",        get label() { return t("common.rate"); },         re:/rate|price/i, required:true},
  {key:"amount",      get label() { return t("boq_import_wizard.amount"); },       re:/amount|total|value/i},
];

// Total / sub-total / carried-over jaisi rows — na continuation hain
// na asli item. Preview me dikhti hain par apne aap exclude rehti hain.
const TOTAL_RE = /(sub[\s-]*total|grand\s*total|^total|carried\s*over|brought\s*forward|^c\/o$|^b\/f$)/i;

// Excel column ka naam — 0 → A, 26 → AA
const colLabel = (i) => {
  let s = ""; let n = i + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

// ── Sheet → array-of-arrays, SIRF cached values ──────────────────────
// Government BOQ sheets aksar doosri workbook ko reference karti hain.
// Un formulas ko dobara calculate karna na possible hai na sahi — jo
// value file me likhi hai (cached) wahi sach hai.
//   • cell.v = cached value  → yahi lete hain
//   • cell.w = displayed text → tab jab .v na ho
//   • cell.f = formula        → kabhi chhute bhi nahi (cellFormula:false)
//   • cell.t === "e"          → error cell (#REF! toota hua link) → blank
const sheetToAoa = (ws) => {
  if (!ws || !ws["!ref"]) return [];
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const out = [];
  for (let R = range.s.r; R <= range.e.r; R++) {
    const row = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({r:R, c:C})];
      if (!cell || cell.t === "e") { row.push(""); continue; }
      row.push(cell.v !== undefined && cell.v !== null ? cell.v : (cell.w !== undefined ? cell.w : ""));
    }
    out.push(row);
  }
  return out;
};

// Header = pehli row jisme 3+ text cells hon (BOQ ke header hamesha text).
const detectHeaderRow = (rows) => {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const strCells = (rows[i] || []).filter(c => typeof c === "string" && c.trim() !== "").length;
    if (strCells >= 3) return i;
  }
  return 0;
};

const autoMapCols = (headerCells) => {
  const m = {};
  const taken = new Set();
  for (const tg of BOQ_TARGETS) {
    // prefer: dono hon ("S.No" + "Item No.") to asli numbering wala jeete
    let idx = tg.prefer ? (headerCells || []).findIndex((c, i) =>
      !taken.has(i) && typeof c === "string" && tg.prefer.test(c.trim())) : -1;
    if (idx < 0) idx = (headerCells || []).findIndex((c, i) =>
      !taken.has(i) && typeof c === "string" && tg.re.test(c.trim()));
    if (idx >= 0) { m[tg.key] = idx; taken.add(idx); }
  }
  return m;
};

// ── Mapping + rows → parsed BOQ rows ─────────────────────────────────
// Continuation: item_no khali par description me text = pichhli row ka
// hi aage ka hissa (asli NRDA/PWD BOQ ka pattern — ek item ki spec 3-4
// row me phaili hoti hai). Use pichhli row ki description me jod dete
// hain, alag item nahi banate.
// Kaunsi sheet BOQ hai? Header me item/description/unit/qty/rate jaisi
// columns + neeche kitni qty-rate wali data rows — dono ka score. L×B×H
// wali measurement-detail sheets (No./L/B/H/D) yahin chhant jaati hain:
// unme rate column nahi hota. Sirf padhta hai, kuch badalta nahi.
function scoreBoqSheets(book) {
  const HEAD = [/item|s\.?\s*no/i, /desc/i, /unit/i, /qty|quant/i, /rate/i];
  const out = [];
  for (const name of book.SheetNames) {
    try {
      const aoa = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, raw: true });
      if (!aoa.length) { out.push({ name, score: 0, rows: 0 }); continue; }
      let headHits = 0;
      for (let r = 0; r < Math.min(8, aoa.length); r++) {
        const cells = (aoa[r] || []).map((c) => String(c ?? ""));
        const hits = HEAD.filter((re) => cells.some((c) => re.test(c))).length;
        if (hits > headHits) headHits = hits;
      }
      // data rows: description-jaisa text + koi number
      let dataRows = 0;
      for (const r of aoa) {
        if (!r) continue;
        const hasText = r.some((c) => typeof c === "string" && c.trim().length > 25);
        const hasNum = r.some((c) => typeof c === "number" && c > 0);
        if (hasText && hasNum) dataRows++;
      }
      out.push({ name, score: headHits * 100 + Math.min(99, dataRows), rows: dataRows });
    } catch (_) { out.push({ name, score: 0, rows: 0 }); }
  }
  return out.sort((a, b) => b.score - a.score);
}

const parseBoqRows = (aoa, headerRow, mapping) => {
  const dataRows = aoa.slice(headerRow + 1);
  const get = (row, key) => (mapping[key] != null ? row[mapping[key]] : "");

  // File ka grand total = SABSE AAKHRI bhari row, agar usme "total" likha
  // ho aur qty khali ho. Beech me aane wale sub-total ko grand total maan
  // lena galat hoga — us case me file ka jod adhoora nikalta hai.
  const isEmptyRow = (row) => (row || []).every(c => isBlank(c));
  let lastFilled = -1;
  for (let i = dataRows.length - 1; i >= 0; i--) {
    if (!isEmptyRow(dataRows[i])) { lastFilled = i; break; }
  }
  let totalIdx = -1;
  if (lastFilled >= 0) {
    const desc = String(get(dataRows[lastFilled], "description") || "");
    if (TOTAL_RE.test(desc) && isBlank(get(dataRows[lastFilled], "qty"))) totalIdx = lastFilled;
  }
  const detectedTotal = totalIdx >= 0 ? numOf(get(dataRows[totalIdx], "amount")) : null;

  const out = [];
  dataRows.forEach((row, i) => {
    if (i === totalIdx) return;
    const desc     = String(get(row, "description") ?? "").trim();
    const itemNo   = get(row, "item_no");
    const sorCode  = String(get(row, "sor_code") ?? "").trim();
    const qty      = numOf(get(row, "qty"));
    const rate     = numOf(get(row, "rate"));
    const amtCol   = numOf(get(row, "amount"));

    // Poori khali row = sheet ki padding.
    if (isBlank(desc) && qty === 0 && amtCol === 0 && isBlank(sorCode)) return;

    // Continuation — pichhli row me jod do.
    //
    // Total/sub-total row ka bhi S.No aksar khali hota hai, par wo
    // continuation NAHI hai — use alag row rehne do taaki user usko
    // exclude kar sake. Do pehchaan: description me "total" type shabd,
    // ya amount column me paisa (continuation line par paisa nahi hota).
    const looksTotal = TOTAL_RE.test(desc) || amtCol !== 0;
    if (isBlank(itemNo) && desc && qty === 0 && rate === 0 && !looksTotal && out.length) {
      const prev = out[out.length - 1];
      prev.description = `${prev.description} ${desc}`.trim();
      prev.merged_lines = (prev.merged_lines || 0) + 1;
      return;
    }

    out.push({
      _k: out.length,
      item_no:     isBlank(itemNo) ? "" : String(itemNo).trim().slice(0, 20),
      sor_code:    sorCode.slice(0, 40),
      description: desc,
      unit:        String(get(row, "unit") ?? "").trim().slice(0, 20),
      qty, rate,
      amount:      round2(qty * rate),   // server bhi yahi karega
      sheet_amount: amtCol,              // sirf dikhane ke liye
      merged_lines: 0,
      // Total/sub-total jaisi row apne aap exclude — user badal sakta hai.
      excluded: TOTAL_RE.test(desc) && qty === 0,
    });
  });
  return {rows: out, detectedTotal};
};

const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN", {maximumFractionDigits:3});

// ════════════════════════════════════════════════════════════════════
// BOQ ITEM MODAL — manual add / edit
// ════════════════════════════════════════════════════════════════════
// BOQ final hone ke baad har badlaav ka reason maanga jata hai. Ek hi chhota
// modal — delete aur import dono isse chalte hain (edit ka reason BoqItemModal
// ke andar hi hai, taaki do modal na khulen).
function BoqReasonModal({title, sub, warn, confirmLabel, onCancel, onConfirm}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const short = reason.trim().length < 10;
  return (
    <Modal title={title} Icon={IcLock} sub={sub} width={520} onClose={onCancel}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onCancel}/>
        <PrimBtn label={busy ? t("tenders.ho_raha_hai") : confirmLabel} Icon={IcChk} disabled={busy || short}
          onClick={async ()=>{ setBusy(true); await onConfirm(reason.trim()); setBusy(false); }}/>
      </>}>
      {warn && (
        <div style={{padding:"10px 12px", background:T.ambL, border:`1px solid ${T.ambM}`,
          borderRadius:7, fontSize:12, color:T.t2, lineHeight:1.6, marginBottom:12}}>
          <IcWarn size={13} color={T.amb}/> {warn}
        </div>
      )}
      <Field label={t("tenders.badalne_ka_reason")}
        hint={t("tenders.kam_se_kam_10_akshar_ye")}>
        <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3}
          placeholder={t("tenders.e_g_ee_ki_manzoori_12")}
          style={{...inputStyle, resize:"vertical", lineHeight:1.5}}/>
      </Field>
    </Modal>
  );
}

const ITEM_TYPE_OPTS = [
  {v:"boq",         get l() { return t("tenders.tendered_boq_me_tha"); }},
  {v:"extra",       get l() { return t("tenders.extra_boq_me_tha_hi_nahi"); }},
  {v:"substituted", get l() { return t("tenders.substituted_kisi_item_ki_jagah"); }},
];

function BoqItemModal({tenderId, item, onClose, onSaved, isItemRate, boqItems, boqFinal}) {
  const toast = useToast();
  const isEdit = !!item;
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  const [form, setForm] = useState({
    item_no:     item?.item_no || "",
    sor_code:    item?.sor_code || "",
    description: item?.description || "",
    unit:        item?.unit || "",
    qty:         item?.qty ?? "",
    rate:        item?.rate ?? "",
    quoted_rate: item?.quoted_rate ?? "",
    item_type:   item?.item_type || "boq",
    substitutes_item_id: item?.substitutes_item_id ? String(item.substitutes_item_id) : "",
    approval_ref:  item?.approval_ref || "",
    approval_date: item?.approval_date ? String(item.approval_date).slice(0,10) : "",
    reason: "",
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const liveAmount = round2(numOf(form.qty) * numOf(form.rate));
  // Final BOQ me edit, ya naya TENDERED item — dono par reason. Extra /
  // substituted item jodna post-award ka normal raasta hai, us par nahi.
  const needsReason = boqFinal && (isEdit || form.item_type === "boq");

  const submit = async () => {
    setErr("");
    if (!form.description.trim()) return setErr(t("tenders.item_ka_description_zaroori_hai"));
    if (form.qty === "")  return setErr(t("tenders.qty_zaroori_hai"));
    if (form.rate === "") return setErr(t("tenders.rate_zaroori_hai"));
    if (form.item_type === "substituted" && !form.substitutes_item_id)
      return setErr(t("tenders.substituted_item_ke_liye_batao_kis"));
    if (needsReason && form.reason.trim().length < 10)
      return setErr(t("tenders.final_boq_badalne_ka_reason_likhna"));
    setBusy(true);
    const body = {
      item_no: form.item_no.trim() || null,
      sor_code: form.sor_code.trim() || null,
      description: form.description.trim(),
      unit: form.unit.trim() || null,
      qty: form.qty, rate: form.rate,
      item_type: form.item_type,
      quoted_rate: form.quoted_rate === "" ? null : form.quoted_rate,
      substitutes_item_id: form.item_type === "substituted" && form.substitutes_item_id
        ? Number(form.substitutes_item_id) : null,
      approval_ref: form.approval_ref.trim() || null,
      approval_date: form.approval_date || null,
      ...(needsReason ? {reason: form.reason.trim()} : {}),
    };
    const res = isEdit
      ? await api.put(`/tenders/${tenderId}/boq/items/${item.id}`, body)
      : await api.post(`/tenders/${tenderId}/boq/items`, body);
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Save nahi hua"); return; }
    toast.success(isEdit ? "Item update ho gaya" : "Item jud gaya");
    onSaved && onSaved();
    onClose();
  };

  return (
    <Modal title={isEdit ? t("tenders.boq_item_edit") : t("tenders.naya_boq_item")} Icon={IcTable} onClose={onClose} width={560}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        <PrimBtn label={busy?t("tenders.save_ho_raha"):t("common.save")} onClick={submit} disabled={busy}/>
      </>}>
      <ErrLine msg={err}/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label={t("tenders.item_no")}><TxtIn value={form.item_no} onChange={v=>set("item_no",v)} ph="e.g. 1.2"/></Field>
        <Field label={t("tenders.sor_code")}><TxtIn value={form.sor_code} onChange={v=>set("sor_code",v)} ph="e.g. 2.8.1"/></Field>
        <Field label={t("tenders.description")} full>
          <textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={3}
            placeholder={t("tenders.kaam_ka_poora_vivran")}
            style={{...inputStyle, resize:"vertical", lineHeight:1.5}}
            onFocus={e=>e.target.style.borderColor=T.ind} onBlur={e=>e.target.style.borderColor=T.b1}/>
        </Field>
        <Field label={t("tenders.item_type")} full
          hint={form.item_type === "boq"
            ? t("tenders.tendered_item_boq_total_me_ginta")
            : t("tenders.extra_substituted_item_boq_total_se")}>
          <SelIn value={form.item_type} onChange={v=>set("item_type",v)} options={ITEM_TYPE_OPTS}/>
        </Field>
        {form.item_type === "substituted" && (
          <Field label={t("tenders.kis_item_ki_jagah")} full>
            <BoqItemPicker items={(boqItems||[]).filter(x=>(x.item_type||"boq")==="boq" && x.id!==item?.id)}
              value={form.substitutes_item_id} onChange={v=>set("substitutes_item_id",String(v))}/>
          </Field>
        )}
        {form.item_type !== "boq" && (<>
          <Field label={t("tenders.manzoori_ref")} hint={t("tenders.department_ka_letter_jisme_is_rate")}>
            <TxtIn value={form.approval_ref} onChange={v=>set("approval_ref",v)} ph={t("tenders.e_g_ee_2026_442")}/>
          </Field>
          <Field label={t("tenders.manzoori_date")}>
            <TxtIn type="date" value={form.approval_date} onChange={v=>set("approval_date",v)}/>
          </Field>
        </>)}
        <Field label={t("common.unit")}><TxtIn value={form.unit} onChange={v=>set("unit",v)} ph={t("tenders.cum_sqm_mt")}/></Field>
        <Field label={t("tenders.qty")}><TxtIn type="number" value={form.qty} onChange={v=>set("qty",v)} ph="0"/></Field>
        <Field label={isItemRate ? t("tenders.sor_rate") : t("tenders.rate")}
          hint={isItemRate ? t("tenders.department_ka_rate") : undefined}>
          <TxtIn type="number" value={form.rate} onChange={v=>set("rate",v)} ph="0"/>
        </Field>
        {isItemRate && (
          <Field label={t("tenders.apna_rate")} hint={t("tenders.isi_rate_par_bill_banega")}>
            <TxtIn type="number" value={form.quoted_rate} onChange={v=>set("quoted_rate",v)} ph="0"/>
          </Field>
        )}
        <Field label={t("common.amount_2")}>
          <div style={{...inputStyle, background:T.sltL, color:T.t1, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"space-between"}}>
            <span>{moneyF(liveAmount)}</span>
            <span style={{fontSize:10.5, fontWeight:600, color:T.t4}}>{t("tenders.qty_rate")}</span>
          </div>
        </Field>
        {needsReason && (
          <Field label={t("tenders.badalne_ka_reason")} full
            hint={t("tenders.tender_won_ho_chuka_hai_boq")}>
            <textarea value={form.reason} onChange={e=>set("reason",e.target.value)} rows={2}
              placeholder={t("tenders.e_g_ee_ki_manzoori_12")}
              style={{...inputStyle, resize:"vertical", lineHeight:1.5}}/>
          </Field>
        )}
        <div style={{gridColumn:"1/3", fontSize:11, color:T.t4, lineHeight:1.5}}>
         {t("tenders.amount_server_par_hi_nikalta_hai")}
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// BOQ IMPORT WIZARD — 4 step (Upload → Mapping → Preview → Commit)
// ════════════════════════════════════════════════════════════════════
const WIZ_STEPS = ["Upload", "Mapping", "Preview", "Commit"];

function BoqImportModal({tenderId, onClose, onDone, boqFinal, onAiPlan}) {
  const toast = useToast();
  const fileRef = useRef(null);
  // Asli File object bacha kar rakhte hain — import ke baad "AI se plan
  // banao" isi file ko AI Plan tab ko saunp deta hai, dobara chunna nahi.
  const [rawFile, setRawFile] = useState(null);
  const [step, setStep] = useState(1);
  const [err, setErr]   = useState("");
  const [busy, setBusy] = useState(false);

  // Step 1
  const [fileName, setFileName] = useState("");
  const [wb, setWb]             = useState(null);
  const [sheetName, setSheetName] = useState("");
  const [sheetScores, setSheetScores] = useState([]);   // [{name, score, rows}]
  const [aoa, setAoa]           = useState([]);
  // Step 2
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping]     = useState({});
  // Step 3
  const [excluded, setExcluded]   = useState({});   // {_k:true}
  const [fileTotal, setFileTotal] = useState("");
  const [totalTouched, setTotalTouched] = useState(false);
  // Step 4
  const [reconcile, setReconcile] = useState(null); // backend ka 400 detail

  const loadSheet = useCallback((book, name) => {
    const rows = sheetToAoa(book.Sheets[name]);
    setSheetName(name);
    setAoa(rows);
    const h = detectHeaderRow(rows);
    setHeaderRow(h);
    setMapping(autoMapCols(rows[h] || []));
    setExcluded({});
    setTotalTouched(false);
  }, []);

  // Multi-file: sarkari BOQ aksar 2-3 alag files me aata hai (civil/
  // electrical/water). Ek saath chuno — wizard ek-ek karke import karta hai;
  // har file apna import_id le kar JUD-ti hai (backend pehle se additive,
  // per-import revert bhi hai — kuchh replace nahi hota).
  const [queue, setQueue] = useState([]);
  const [fileNo, setFileNo] = useState(1);
  const [nFiles, setNFiles] = useState(1);
  const rawDone = useRef([]);
  const onFile = async (e) => {
    const list = [...(e.target.files || [])];
    if (!list.length) return;
    setQueue(list.slice(1)); setNFiles(list.length); setFileNo(1); rawDone.current = [];
    await loadFile(list[0]);
    e.target.value = "";
  };
  const loadFile = async (f) => {
    setRawFile(f);
    setErr(""); setReconcile(null); setFileTotal(""); setTotalTouched(false); setExcluded({});
    try {
      const buf = await f.arrayBuffer();
      // cellFormula:false → formula load hi nahi hota, sirf cached value.
      // cellText:true    → .w (displayed text) fallback ke liye milta hai.
      const book = XLSX.read(new Uint8Array(buf), {
        type: "array", cellFormula: false, cellText: true, cellDates: false, cellNF: false,
      });
      if (!book.SheetNames.length) { setErr(t("machinery.file_me_koi_sheet_nahi_mili")); return; }
      setFileName(f.name);
      setWb(book);
      // Department ke estimate workbook me 200 tak sheets hoti hain (ROAD5,
      // DRAIN-Jhanjh, L×B×H detail...) — pehli sheet utha lena andhera teer
      // hai. Har sheet ko BOQ-jaisi hone ka score do, sabse achhi khud chuno.
      const scores = scoreBoqSheets(book);
      setSheetScores(scores);
      const best = scores.length ? scores[0].name : book.SheetNames[0];
      loadSheet(book, best);
    } catch (_) {
      setErr(t("tenders.file_padhne_me_dikkat_sahi_xlsx"));
    }
  };

  const headerCells = aoa[headerRow] || [];
  const parsed = useMemo(
    () => (aoa.length && mapping.description != null)
      ? parseBoqRows(aoa, headerRow, mapping)
      : {rows:[], detectedTotal:null},
    [aoa, headerRow, mapping]);

  // Detected total pehli baar mile to file-total box me bhar do — user
  // ne khud haath lagaya ho to uski value ko mat chhedo.
  useEffect(() => {
    if (!totalTouched && parsed.detectedTotal != null) setFileTotal(String(parsed.detectedTotal));
  }, [parsed.detectedTotal, totalTouched]);

  const missing = BOQ_TARGETS.filter(t => t.required && mapping[t.key] == null).map(t => t.label);
  const liveRows = parsed.rows.filter(r => !excluded[r._k]);
  const liveTotal = round2(liveRows.reduce((s,r)=>s+r.amount, 0));
  const [importReason, setImportReason] = useState("");
  const fileTotalNum = fileTotal === "" ? null : numOf(fileTotal);
  const diff = fileTotalNum === null ? null : round2(liveTotal - fileTotalNum);
  const reconcileOk = diff === null || Math.abs(diff) <= 1;

  const commit = async () => {
    setErr(""); setReconcile(null);
    // Final BOQ par naya import = poora jod badalna. Reason zaroori hai.
    if (boqFinal && importReason.trim().length < 10) {
      setErr(t("tenders.boq_final_hai_naya_import_karne"));
      return;
    }
    setBusy(true);
    const res = await api.post(`/tenders/${tenderId}/boq/import`, {
      file_name: fileName,
      source_total: fileTotalNum,
      ...(boqFinal ? {reason: importReason.trim()} : {}),
      rows: liveRows.map(r => ({
        item_no: r.item_no, sor_code: r.sor_code, description: r.description,
        unit: r.unit, qty: r.qty, rate: r.rate,
      })),
    });
    setBusy(false);
    if (!res?.success) {
      // Reconcile fail — Preview par wapas bhejo taaki mapping/exclude sudhar sake.
      if (res?.code === "reconcile_failed") {
        setReconcile({diff: res.diff, message: res.message});
        setStep(3);
        return;
      }
      setErr(res?.message || "Import nahi hua");
      return;
    }
    toast.success(`${res.data.row_count} items import ho gaye` + (nFiles > 1 ? ` (file ${fileNo}/${nFiles})` : ""));
    onDone && onDone();
    rawDone.current.push(rawFile);
    if (queue.length) {
      // agli file — wizard wahi, items pichhli me JUD chuke hain
      const nxt = queue[0];
      setQueue(queue.slice(1)); setFileNo(fileNo + 1); setStep(1);
      await loadFile(nxt);
      return;
    }
    // Prafull ka idea 1: import hote hi wahi file(ein) AI Plan me le jao —
    // items ki ids ab DB me hain, isliye AI plan unse jod bhi payega.
    const done = rawDone.current;
    if (onAiPlan && done.length && window.confirm(t("boq_import_wizard.import_ho_gaya_ai_plan_banayein"))) {
      onAiPlan(done.length > 1 ? done.slice() : done[0]);
    }
    onClose();
  };

  const canNext = step === 1 ? aoa.length > 0
                : step === 2 ? (!missing.length && parsed.rows.length > 0)
                : step === 3 ? liveRows.length > 0
                : false;

  const th = {fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".5px",
    padding:"6px 8px", textAlign:"left", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB,
    position:"sticky", top:0};
  const td = {fontSize:11.5, color:T.t2, padding:"6px 8px", borderBottom:`1px solid ${T.b1}`,
    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"};

  return (
    <Modal title={t("boq_import_wizard.boq_import")} Icon={IcUpload} onClose={onClose} width={940}
      sub={`Step ${step} of 4 — ${WIZ_STEPS[step-1]}${fileName ? ` · ${fileName}` : ""}`}
      footer={<>
        {step > 1 && <SecBtn label={t("common.peeche")} onClick={()=>{setStep(s=>s-1); setErr("");}}/>}
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        {step < 4
          ? <PrimBtn label={t("tenders.aage")} onClick={()=>{setStep(s=>s+1); setErr("");}} disabled={!canNext}/>
          : <PrimBtn label={busy?t("tenders.import_ho_raha"):t("tenders.import_karo")} onClick={commit} disabled={busy||!liveRows.length}/>}
      </>}>

      <ErrLine msg={err}/>

      {/* Step rail */}
      <div style={{display:"flex", alignItems:"center", gap:7, marginBottom:16}}>
        {WIZ_STEPS.map((s,i)=>(
          <div key={s} style={{display:"flex", alignItems:"center", gap:7, flex:i<3?1:"auto"}}>
            <div style={{width:21, height:21, borderRadius:"50%", flexShrink:0, fontSize:10, fontWeight:700,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:step>i+1?T.grn:step===i+1?T.ind:T.b1, color:step>=i+1?"#fff":T.t4}}>
              {step>i+1 ? "✓" : i+1}
            </div>
            <span style={{fontSize:11.5, fontWeight:step===i+1?700:400,
              color:step===i+1?T.ind:step>i+1?T.grn:T.t4, whiteSpace:"nowrap"}}>{s}</span>
            {i<3 && <div style={{flex:1, height:2, background:step>i+1?T.grn:T.b1, borderRadius:2, margin:"0 3px"}}/>}
          </div>
        ))}
      </div>

      {nFiles > 1 && (
        <div style={{margin:"2px 0 10px", padding:"6px 12px", background:T.bg, border:`1px solid ${T.b1}`, borderRadius:8, fontSize:11.5, fontWeight:700, color:T.t2}}>{t("tenders.file_fileno_nfiles_filename_sab_files", { fileNo, nFiles, fileName: fileName || "…" })}</div>
      )}

      {/* ── STEP 1: UPLOAD ── */}
      {step===1 && (<>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" multiple style={{display:"none"}} onChange={onFile}/>
        <div onClick={()=>fileRef.current && fileRef.current.click()}
          style={{border:`1.5px dashed ${aoa.length?T.grn:T.b2}`, borderRadius:8, padding:"26px 16px",
            textAlign:"center", cursor:"pointer", background:aoa.length?T.grnL:T.bg}}>
          {aoa.length ? (
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:6}}>
              <IcChk size={20} color={T.grn}/>
              <span style={{fontSize:13, color:T.grn, fontWeight:700}}>{fileName}</span>
              <span style={{fontSize:11.5, color:T.t3}}>{t("tenders.aoa_rows_padhi_gayi_badalne_ke", { aoa: aoa.length })}</span>
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:7}}>
              <IcUpload size={22} color={T.t4}/>
              <span style={{fontSize:13, color:T.t2, fontWeight:600}}>{t("tenders.excel_file_chuno_xlsx_xls")}</span>
              <span style={{fontSize:11.5, color:T.t4}}>{t("tenders.file_aapke_browser_me_hi_padhi")}</span>
            </div>
          )}
        </div>

        {wb && wb.SheetNames.length > 1 && (
          <div style={{marginTop:14}}>
            <Field label={`Sheet chuno (${wb.SheetNames.length} hain)`}>
              <SelIn value={sheetName} onChange={v=>loadSheet(wb, v)}
                options={(sheetScores.length ? sheetScores : wb.SheetNames.map(n=>({name:n,score:0,rows:0})))
                  .map(s=>({v:s.name, l:`${s.name}${s.score>=400?" ✓ BOQ jaisi":s.rows===0?" (khaali)":""}`}))}/>
            </Field>
            {sheetScores.length > 0 && sheetScores[0].score >= 400 && sheetName === sheetScores[0].name && (
              <div style={{fontSize:11, color:"#059669", marginTop:5}}>{t("tenders.name_sabse_boq_jaisi_lagi_header", { name: sheetScores[0].name, rows: sheetScores[0].rows })}</div>
            )}
          </div>
        )}

        <div style={{marginTop:14, background:T.sltL, border:`1px solid ${T.b1}`, borderRadius:7,
          padding:"9px 12px", fontSize:11.5, color:T.t3, lineHeight:1.55}}>
         {t("tenders.sheet_me_jo_value")} <b>{t("tenders.dikh_rahi_hai")}</b> {t("tenders.wahi_padhi_jati_hai_formula_dobara")} <code>{t("tenders.ref")}</code> {t("tenders.aata_hai_aisi_cell_khali_maan")}
        </div>
      </>)}

      {/* ── STEP 2: MAPPING ── */}
      {step===2 && (<>
        <div style={{display:"flex", gap:10, alignItems:"flex-end", marginBottom:14, flexWrap:"wrap"}}>
          <div style={{width:170}}>
            <Field label={t("common.header_row")}>
              <SelIn value={String(headerRow)}
                onChange={v=>{const h=Number(v); setHeaderRow(h); setMapping(autoMapCols(aoa[h]||[]));}}
                options={aoa.slice(0, 30).map((_,i)=>({v:String(i), l:`Row ${i+1}`}))}/>
            </Field>
          </div>
          <div style={{flex:1, minWidth:220, fontSize:11.5, color:T.t3, lineHeight:1.5, paddingBottom:6}}>
           {t("tenders.column_apne_aap_pehchane_gaye_hain")}
          </div>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:11, marginBottom:14}}>
          {BOQ_TARGETS.map(tg=>{
            const auto = autoMapCols(headerCells);
            const isAuto = mapping[tg.key] != null && auto[tg.key] === mapping[tg.key];
            return (
              <div key={tg.key}>
                <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:4}}>
                  <label style={{fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:".5px"}}>
                    {tg.label}{tg.required && " *"}
                  </label>
                  {isAuto && <span style={{fontSize:9, fontWeight:700, color:T.ind, background:T.indL,
                    padding:"1px 6px", borderRadius:10}}>auto</span>}
                </div>
                <SelIn value={mapping[tg.key] == null ? "" : String(mapping[tg.key])}
                  ph={t("tenders.koi_nahi")}
                  onChange={v=>setMapping(m=>({...m, [tg.key]: v === "" ? null : Number(v)}))}
                  options={headerCells.map((c,i)=>({
                    v:String(i),
                    l:`${colLabel(i)} — ${String(c||"").trim().slice(0,28) || "(khali)"}`,
                  }))}/>
              </div>
            );
          })}
        </div>

        {!!missing.length && (
          <div style={{background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:7, padding:"9px 12px",
            fontSize:11.5, color:T.amb, marginBottom:12}}>
           {t("tenders.ye_column_zaroori_hain_par_map")} <b>{missing.join(", ")}</b>
          </div>
        )}

        <div style={{fontSize:11.5, color:T.t3, marginBottom:6}}>{t("tenders.parsed_item_bane_parsed2", { parsed: parsed.rows.length, parsed2: parsed.rows.some(r=>r.merged_lines>0) &&
            ` · ${parsed.rows.reduce((s,r)=>s+(r.merged_lines||0),0)} continuation line upar wale item me jodi gayi` })}</div>
        <div style={{maxHeight:210, overflow:"auto", border:`1px solid ${T.b1}`, borderRadius:7}}>
          <table style={{width:"100%", borderCollapse:"collapse", tableLayout:"fixed"}}>
            <thead><tr>
              <th style={{...th, width:60}}>{t("common.item")}</th>
              <th style={{...th, width:70}}>SOR</th>
              <th style={th}>{t("common.description")}</th>
              <th style={{...th, width:50}}>{t("common.unit")}</th>
              <th style={{...th, width:70}}>{t("common.qty")}</th>
              <th style={{...th, width:80}}>{t("common.rate")}</th>
              <th style={{...th, width:90}}>{t("common.amount_2")}</th>
            </tr></thead>
            <tbody>
              {parsed.rows.slice(0, 40).map(r=>(
                <tr key={r._k}>
                  <td style={td}>{r.item_no}</td>
                  <td style={td}>{r.sor_code}</td>
                  <td style={{...td, whiteSpace:"normal"}} title={r.description}>
                    {r.description.slice(0,90)}{r.description.length>90?"…":""}
                    {r.merged_lines>0 && <span style={{marginLeft:5, fontSize:9, fontWeight:700, color:T.slt,
                      background:T.sltL, padding:"1px 5px", borderRadius:10}}>+{r.merged_lines}</span>}
                  </td>
                  <td style={td}>{r.unit}</td>
                  <td style={{...td, textAlign:"right"}}>{fmtQty(r.qty)}</td>
                  <td style={{...td, textAlign:"right"}}>{fmtQty(r.rate)}</td>
                  <td style={{...td, textAlign:"right", fontWeight:700, color:T.t1}}>{moneyF(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parsed.rows.length > 40 && (
          <div style={{fontSize:11, color:T.t4, marginTop:6}}>{t("tenders.aur_parsed_rows_preview_me_sab", { parsed: parsed.rows.length-40 })}</div>
        )}
      </>)}

      {/* ── STEP 3: PREVIEW ── */}
      {step===3 && (<>
        {reconcile && (
          <div style={{background:T.redL, border:`1px solid ${T.redM}`, borderRadius:7, padding:"10px 13px",
            marginBottom:12, fontSize:12, color:T.red, lineHeight:1.55}}>
            <b>{t("tenders.server_ne_import_rok_diya")}</b><div style={{marginTop:3}}>{reconcile.message}</div>
            <div style={{marginTop:5, color:T.t3}}>{t("tenders.farak_moneyf_ya_to_file_total", { moneyF: moneyF(reconcile.diff) })}</div>
          </div>
        )}

        <div style={{display:"flex", gap:10, alignItems:"flex-end", marginBottom:12, flexWrap:"wrap"}}>
          <div style={{width:200}}>
            <Field label={t("tenders.file_ka_total")}
              hint={t("tenders.khali_chhodo_to_reconcile_check_nahi")}>
              <TxtIn type="number" value={fileTotal}
                onChange={v=>{setTotalTouched(true); setFileTotal(v);}} ph="0"/>
            </Field>
          </div>
          <div style={{flex:1, minWidth:240, paddingBottom:6}}>
            <div style={{display:"flex", gap:16, flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px"}}>{t("tenders.items_ka_jod")}</div>
                <div style={{fontSize:15, fontWeight:700, color:T.t1}}>{moneyF(liveTotal)}</div>
              </div>
              <div>
                <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px"}}>{t("tenders.rows")}</div>
                <div style={{fontSize:15, fontWeight:700, color:T.t1}}>
                  {liveRows.length}
                  {parsed.rows.length !== liveRows.length &&
                    <span style={{fontSize:11, color:T.t4, fontWeight:500}}> / {parsed.rows.length}</span>}
                </div>
              </div>
              {diff !== null && (
                <div>
                  <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px"}}>{t("tenders.farak")}</div>
                  <div style={{fontSize:15, fontWeight:700, color:reconcileOk?T.grn:T.red}}>
                    {diff>0?"+":""}{moneyF(diff)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {diff !== null && (
          <div style={{background:reconcileOk?T.grnL:T.ambL, border:`1px solid ${reconcileOk?T.grnM:T.ambM}`,
            borderRadius:7, padding:"9px 12px", fontSize:11.5, color:reconcileOk?T.grn:T.amb,
            marginBottom:12, lineHeight:1.5}}>
            {reconcileOk
              ? t("tenders.total_match_ho_gaya_import_ho")
              : `Farak ₹1 se zyada hai — server import rok dega. Mapping galat hai ya koi total row item ban gayi hai.`}
          </div>
        )}

        <div style={{fontSize:11.5, color:T.t3, marginBottom:6}}>
         {t("tenders.jo_row_boq_ka_hissa_nahi")}
        </div>
        <div style={{maxHeight:280, overflow:"auto", border:`1px solid ${T.b1}`, borderRadius:7}}>
          <table style={{width:"100%", borderCollapse:"collapse", tableLayout:"fixed"}}>
            <thead><tr>
              <th style={{...th, width:34}}></th>
              <th style={{...th, width:56}}>{t("common.item")}</th>
              <th style={{...th, width:66}}>SOR</th>
              <th style={th}>{t("common.description")}</th>
              <th style={{...th, width:48}}>{t("common.unit")}</th>
              <th style={{...th, width:68}}>{t("common.qty")}</th>
              <th style={{...th, width:78}}>{t("common.rate")}</th>
              <th style={{...th, width:92}}>{t("common.amount_2")}</th>
            </tr></thead>
            <tbody>
              {parsed.rows.map(r=>{
                const off = !!excluded[r._k];
                return (
                  <tr key={r._k} style={{opacity:off?0.4:1, background:off?T.sltL:"transparent"}}>
                    <td style={{...td, textAlign:"center"}}>
                      <input type="checkbox" checked={!off}
                        onChange={()=>setExcluded(m=>({...m, [r._k]: !off}))}
                        style={{cursor:"pointer"}}/>
                    </td>
                    <td style={td}>{r.item_no}</td>
                    <td style={td}>{r.sor_code}</td>
                    <td style={{...td, whiteSpace:"normal"}} title={r.description}>
                      {r.description.slice(0,110)}{r.description.length>110?"…":""}
                    </td>
                    <td style={td}>{r.unit}</td>
                    <td style={{...td, textAlign:"right"}}>{fmtQty(r.qty)}</td>
                    <td style={{...td, textAlign:"right"}}>{fmtQty(r.rate)}</td>
                    <td style={{...td, textAlign:"right", fontWeight:700, color:T.t1}}>
                      {moneyF(r.amount)}
                      {/* Sheet ka apna amount alag ho to batao — aksar formula ya rounding ka fark */}
                      {Math.abs(r.sheet_amount - r.amount) > 1 && r.sheet_amount > 0 && (
                        <div style={{fontSize:9.5, color:T.amb, fontWeight:600}}>{t("tenders.sheet_moneyf", { moneyF: moneyF(r.sheet_amount) })}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>)}

      {/* ── STEP 4: COMMIT ── */}
      {step===4 && (
        <div>
          <div style={{background:T.indL, border:`1px solid ${T.indM}`, borderRadius:8, padding:"14px 16px", marginBottom:14}}>
            <div style={{fontSize:13, fontWeight:700, color:T.ind, marginBottom:8}}>{t("tenders.import_karne_se_pehle_ek_nazar")}</div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:13}}>
              {[
                ["File", fileName || "--"],
                ["Sheet", sheetName || "--"],
                ["Items", String(liveRows.length)],
                ["Items ka jod", moneyF(liveTotal)],
                ["File ka total", fileTotalNum === null ? "check nahi hoga" : moneyF(fileTotalNum)],
              ].map(([l,v])=>(
                <div key={l}>
                  <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:3}}>{l}</div>
                  <div style={{fontSize:12.5, color:T.t1, fontWeight:600, wordBreak:"break-word"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Final BOQ par naya import poora jod badal deta hai — reason zaroori */}
          {boqFinal && (
            <div style={{background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8,
              padding:"12px 14px", marginBottom:14}}>
              <div style={{fontSize:12, fontWeight:700, color:T.amb, marginBottom:7,
                display:"flex", alignItems:"center", gap:6}}>
                <IcLock size={13} color={T.amb}/>{t("tenders.boq_final_hai")}
              </div>
              <Field label={t("tenders.naya_import_karne_ka_reason")}
                hint={t("tenders.kam_se_kam_10_akshar_ye_2")}>
                <textarea value={importReason} onChange={e=>setImportReason(e.target.value)} rows={2}
                  placeholder={t("tenders.e_g_department_ne_revised_boq")}
                  style={{...inputStyle, resize:"vertical", lineHeight:1.5}}/>
              </Field>
            </div>
          )}
          {parsed.rows.length !== liveRows.length && (
            <div style={{fontSize:11.5, color:T.t3, marginBottom:10}}>{t("tenders.parsed_row_exclude_ki_gayi_hain", { parsed: parsed.rows.length - liveRows.length })}</div>
          )}
          <div style={{background:T.sltL, border:`1px solid ${T.b1}`, borderRadius:7, padding:"9px 12px",
            fontSize:11.5, color:T.t3, lineHeight:1.55}}>
           {t("tenders.har_row_ka_amount_server_dobara")}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// REVERT IMPORT — type REVERT to confirm
// ════════════════════════════════════════════════════════════════════
function RevertImportModal({tenderId, imp, onClose, onDone}) {
  const toast = useToast();
  const [txt, setTxt]   = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  const match = txt.trim().toUpperCase() === "REVERT";

  const submit = async () => {
    if (!match) return setErr(t("tenders.confirm_karne_ke_liye_revert_likho"));
    setErr(""); setBusy(true);
    const res = await api.post(`/tenders/${tenderId}/boq/imports/${imp.id}/revert`);
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Revert nahi hua"); return; }
    toast.success(`Import revert ho gaya — ${res.items_hidden} items hate`);
    onDone && onDone();
    onClose();
  };

  return (
    <Modal title={t("tenders.import_revert")} Icon={IcUndo} onClose={onClose} width={480}
      sub={imp.file_name || `Import #${imp.id}`}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        <button onClick={submit} disabled={busy||!match}
          style={{height:32, padding:"0 14px", borderRadius:6, background:match?T.red:T.b1,
            border:"none", color:"#fff", fontSize:12.5, fontWeight:700,
            cursor:match?"pointer":"not-allowed"}}>
          {busy ? t("tenders.revert_ho_raha") : t("tenders.revert_karo")}
        </button>
      </>}>
      <ErrLine msg={err}/>
      <div style={{background:T.redL, border:`1px solid ${T.redM}`, borderRadius:8, padding:"12px 14px", marginBottom:14}}>
        <div style={{fontSize:12, color:T.t2, lineHeight:1.6}}>
         {t("tenders.is_import_ki")} <b>{imp.active_items ?? imp.row_count} items</b> {t("tenders.boq_se_hat_jayengi_haath_se")} <b>{t("tenders.koi_asar_nahi")}</b> {t("tenders.padega")}
        </div>
      </div>
      <div style={{fontSize:12, color:T.red, marginBottom:8}}>
       {t("projects.confirm_karne_ke_liye")} <strong>REVERT</strong> {t("projects.type_karo")}
      </div>
      <input value={txt} onChange={e=>setTxt(e.target.value)} placeholder={t("tenders.type_revert_to_confirm")}
        style={{width:"100%", padding:"8px 11px", borderRadius:7, border:`1.5px solid ${T.redM}`,
          fontSize:12.5, color:T.t1, background:T.surface, outline:"none",
          boxSizing:"border-box", fontFamily:"inherit"}}/>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// BOQ TAB
// ════════════════════════════════════════════════════════════════════
// ── Work packages ───────────────────────────────────────────────────
// BOQ ek file me kai tarah ka kaam rakhti hai. Package wahi baant hai —
// aur usi se tay hota hai ki map ke km me kya ginega, aur site par kis
// cheez ka task-plan banega.
const WTYPE_LABEL = {
  pipeline: "Pipeline", structure: "Structure", road: "Road",
  drain: "Drain", electrical: "Electrical", other: "Anya",
};
const WTYPE_COLOUR = {
  pipeline: "#1D4ED8", structure: "#7C3AED", road: "#B45309",
  drain: "#0E7490", electrical: "#BE123C", other: "#475569",
};
const fmtKmOrQty = (u, q) => {
  const RUN = ["RMT","RM","MTR","M","METER","METRE","RFT","FT"];
  if (RUN.includes(String(u||"").toUpperCase()) && q >= 1000)
    return (q/1000).toLocaleString("en-IN",{maximumFractionDigits:2}) + " km";
  return fmtQty(q) + " " + (u||"");
};

function PackagesPanel({tenderId, canEdit, items, onChanged}) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null);   // {id, name, wtype}
  // Tick pehle sirf screen par — Save dabane par hi likha jaata hai. Pehle
  // har click turant save hota tha aur galti ka tick bhi ankda badal deta
  // tha (Prafull ne pakda: SH-1/2/9 tick hue to km 24.56 ho gaya).
  const [pendingMap, setPendingMap] = useState({});   // pkgId → true/false

  const load = useCallback(async () => {
    const r = await api.get(`/tenders/${tenderId}/boq/packages`);
    if (r?.success) setData(r.data);
  }, [tenderId]);
  useEffect(()=>{ load(); }, [load]);

  const auto = async () => {
    setBusy(true);
    const r = await api.post(`/tenders/${tenderId}/boq/packages/auto`, {});
    setBusy(false);
    if (!r?.success) { toast.error(r?.message || "Packages nahi bane"); return; }
    toast.success(r.message); setData(r.data); setPendingMap({}); onChanged?.();
  };
  const save = async (id, patch) => {
    const r = await api.put(`/tenders/${tenderId}/boq/packages/${id}`, patch);
    if (!r?.success) { toast.error(r?.message || "Save nahi hua"); return; }
    setData(r.data); setEdit(null); onChanged?.();
  };

  // B1 — AI se baanto: sujhaav alag call, lagana alag. Beech me AADMI ka
  // review — wahi Save-first usool jo map-tick par abhi laga hai.
  const [ai, setAi] = useState(null);        // {loading} | {groups, warnings, picked:{idx:true}}
  const aiSuggest = async () => {
    setAi({ loading: true });
    // 294 item = kai LLM batch. Default 15s timeout me ye kabhi poora
    // nahi hota — Prafull ko prod par "Request timed out" mila tha. Isliye
    // is ek call ko 3 minute diye hain (server batch parallel chalata hai).
    const r = await api.post(`/tenders/${tenderId}/boq/packages/ai-suggest`, {}, { timeoutMs: 180000 });
    if (!r?.success) { setAi(null); toast.error(r?.message || "AI se sujhaav nahi mila"); return; }
    const groups = r.data.groups || [];
    if (!groups.length) { setAi(null); toast.info?.(r.message || "Sujhaane ko kuch nahi mila"); return; }
    setAi({ groups, warnings: r.data.warnings || [], picked: Object.fromEntries(groups.map((_, i) => [i, true])) });
  };
  const aiApply = async () => {
    const chosen = ai.groups.filter((_, i) => ai.picked[i]);
    if (!chosen.length) { toast.error("Kam se kam ek group chuno"); return; }
    setBusy(true);
    const r = await api.post(`/tenders/${tenderId}/boq/packages/ai-apply`, {
      groups: chosen.map(g => ({ name: g.name, wtype: g.wtype, item_ids: g.item_ids })),
    });
    setBusy(false);
    if (!r?.success) { toast.error(r?.message || "Lag nahi paya"); return; }
    toast.success(r.message); setAi(null); setData(r.data); onChanged?.();
  };

  const dirtyIds = Object.keys(pendingMap);
  const saveMapChanges = async () => {
    setBusy(true);
    let ok = 0, lastData = null;
    for (const id of dirtyIds) {
      const r = await api.put(`/tenders/${tenderId}/boq/packages/${id}`, { map_count: pendingMap[id] });
      if (r?.success) { ok++; lastData = r.data; }
      else toast.error(r?.message || "Ek package save nahi hua");
    }
    setBusy(false);
    if (lastData) setData(lastData);
    setPendingMap({});
    if (ok) { toast.success(`${ok} package save hue — map ka ankda ab naya hai`); onChanged?.(); }
  };
  const del = async (p) => {
    if (!await window.confirmAsync(t("tenders.name_package_hataayein_items_boq_me", { name: p.name }))) return;
    const r = await api.del(`/tenders/${tenderId}/boq/packages/${p.id}`);
    if (!r?.success) { toast.error(r?.message || "Delete nahi hua"); return; }
    toast.success("Package hat gaya"); setData(r.data); onChanged?.();
  };

  const pkgs = data?.packages || [];
  // Wahi niyam jo server par hai: km sirf linear packages se.
  const mapKm = pkgs.filter(p=>p.map_count && ["pipeline","road","drain"].includes(p.wtype)).reduce((s,p)=>
    s + (p.units||[]).filter(u=>["RMT","RM","MTR","M","METER","METRE","RFT","FT"].includes(String(u.unit).toUpperCase()))
      .reduce((x,u)=>x+u.qty,0), 0);

  return (
    <Panel style={{marginBottom:11}}>
      <PHead title={t("tenders.work_packages")}
        sub={pkgs.length ? `${pkgs.length} package · map me ${fmtKm(mapKm)}${data.unassigned?` · ${data.unassigned} item bina package`:""}`
                         : t("tenders.boq_ko_kaam_ke_hisaab_se")}
        action={canEdit && <div style={{display:"flex", gap:7}}>
          {/* Flat BOQ (bina Sub Head) ya bache hue items ke liye — AI padh
              kar groups SUJHATA hai, lagta review ke baad hi hai. */}
          {(!pkgs.length || data?.unassigned > 0) && (
            <SecBtn label={ai?.loading ? t("tenders.ai_padh_raha_1_2_min") : t("tenders.ai_se_baanto")}
              onClick={aiSuggest} disabled={!!ai?.loading || busy}/>
          )}
          <SecBtn label={busy?"...":(pkgs.length?t("tenders.naye_item_baanto"):t("tenders.packages_banao_sub_head_se"))}
            Icon={IcChk} onClick={auto} disabled={busy}/>
        </div>}/>

      {!pkgs.length ? (
        <div style={{padding:"16px 14px", fontSize:12, color:T.t3, lineHeight:1.6}}>
         {t("tenders.boq_me_pipeline_bhi_hoti_hai")}
          <br/><b>{t("tenders.packages_banao")}</b> {t("tenders.dabao_boq_ke_sub_head_se")}
        </div>
      ) : (
        <div style={{padding:"2px 0"}}>
          {pkgs.map(p=>(
            <div key={p.id} style={{display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
              borderBottom:`1px solid ${T.b1}`}}>
              <span style={{fontSize:9.5, fontWeight:800, padding:"3px 7px", borderRadius:5,
                color:WTYPE_COLOUR[p.wtype]||T.t3, background:T.surfaceB, whiteSpace:"nowrap"}}>
                {WTYPE_LABEL[p.wtype]||p.wtype}
              </span>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:12.5, color:T.t1, fontWeight:600, overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.name}</div>
                <div style={{fontSize:10.5, color:T.t4, marginTop:1}}>
                  {p.items} item{(p.units||[]).slice(0,3).map(u=>` · ${fmtKmOrQty(u.unit,u.qty)}`).join("")}
                </div>
              </div>
              {/* Map me gino — sirf LAMBAI wale kaam par (pipeline/road/drain).
                  Structure/electrical map par PIN se dikhte hain — unka
                  metre-unit saman (water-stop, cable) km me kabhi nahi ginta,
                  isliye unpar switch hai hi nahi. Tick pehle local, Save par
                  hi save. */}
              {["pipeline","road","drain"].includes(p.wtype) ? (
                (()=>{ const cur = p.id in pendingMap ? pendingMap[p.id] : !!p.map_count;
                  const changed = p.id in pendingMap && pendingMap[p.id] !== !!p.map_count;
                  return (
                    <label title={t("tenders.map_ke_km_me_ye_kaam")}
                      style={{display:"flex", alignItems:"center", gap:5, fontSize:10.5,
                        color:cur?"#059669":T.t4, cursor:canEdit?"pointer":"default", whiteSpace:"nowrap",
                        background: changed ? "#FEF9C3" : "transparent", padding:"2px 5px", borderRadius:5}}>
                      <input type="checkbox" checked={cur} disabled={!canEdit}
                        onChange={e=>{
                          const v = e.target.checked;
                          setPendingMap(m=>{
                            const n = {...m};
                            if (v === !!p.map_count) delete n[p.id]; else n[p.id] = v;
                            return n;
                          });
                        }}/>{t("tenders.map_me_ginochanged", { changed: changed ? " *" : "" })}</label>
                  ); })()
              ) : (
                <span title={t("tenders.structure_electrical_map_par_structure_pin")}
                  style={{fontSize:10, color:T.t4, whiteSpace:"nowrap"}}>
                  {p.wtype === "electrical" ? t("tenders.km_me_nahi_ginta") : t("tenders.map_par_pin_se")}
                </span>
              )}
              {canEdit && (<>
                <button onClick={()=>setEdit({id:p.id, name:p.name, wtype:p.wtype})}
                  style={{border:"none", background:"none", cursor:"pointer", fontSize:11, color:T.ind}}>edit</button>
                <button onClick={()=>del(p)}
                  style={{border:"none", background:"none", cursor:"pointer", fontSize:11, color:T.red}}>hatao</button>
              </>)}
            </div>
          ))}
          {!!data.unassigned && (
            <div style={{padding:"8px 14px", fontSize:11, color:T.amb}}>{t("tenders.unassigned_item_abhi_kisi_package_me", { unassigned: data.unassigned })}</div>
          )}
          {!!dirtyIds.length && (
            <div style={{display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
              background:"#FEFCE8", borderTop:`1px solid #FDE68A`}}>
              <span style={{flex:1, fontSize:11.5, color:"#92400E"}}>{t("tenders.dirtyids_badlav_abhi_save_nahi_hue", { dirtyIds: dirtyIds.length })}</span>
              <SecBtn label={t("project_files.wapas")} onClick={()=>setPendingMap({})}/>
              <PrimBtn label={busy?"...":t("common.save")} Icon={IcChk} onClick={saveMapChanges} disabled={busy}/>
            </div>
          )}
        </div>
      )}

      {ai && !ai.loading && (
        <Modal title={t("tenders.ai_ka_sujhaav_packages")} Icon={IcChk} width={620}
          sub={t("tenders.ye_sirf_sujhaav_hai_jo_group")}
          onClose={()=>setAi(null)}
          footer={<>
            <SecBtn label={t("common.cancel")} onClick={()=>setAi(null)}/>
            <PrimBtn label={busy?"...":t("tenders.in_packages_me_baanto")} Icon={IcChk} onClick={aiApply} disabled={busy}/>
          </>}>
          {!!ai.warnings.length && (
            <div style={{background:"#FFFBEB", border:"1px solid #FCD34D", borderRadius:7,
              padding:"8px 11px", fontSize:11.5, color:"#92400E", marginBottom:11, lineHeight:1.6}}>
              {ai.warnings.map((w,i)=><div key={i}>⚠ {w}</div>)}
            </div>
          )}
          <div style={{maxHeight:340, overflowY:"auto"}}>
            {ai.groups.map((g,i)=>(
              <label key={i} style={{display:"flex", gap:10, alignItems:"flex-start", padding:"8px 4px",
                borderBottom:`1px solid ${T.b1}`, cursor:"pointer"}}>
                <input type="checkbox" checked={!!ai.picked[i]} style={{marginTop:3}}
                  onChange={e=>setAi(a=>({...a, picked:{...a.picked, [i]:e.target.checked}}))}/>
                <span style={{fontSize:9.5, fontWeight:800, padding:"3px 7px", borderRadius:5, marginTop:1,
                  color:WTYPE_COLOUR[g.wtype]||T.t3, background:T.surfaceB, whiteSpace:"nowrap"}}>
                  {WTYPE_LABEL[g.wtype]||g.wtype}
                </span>
                <span style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12.5, fontWeight:600, color:T.t1}}>{g.name} <span style={{color:T.t4, fontWeight:400}}>· {g.items} item</span></div>
                  {(g.sample||[]).map((s,j)=><div key={j} style={{fontSize:10.5, color:T.t4, overflow:"hidden",
                    textOverflow:"ellipsis", whiteSpace:"nowrap"}}>— {s}</div>)}
                </span>
              </label>
            ))}
          </div>
          <div style={{fontSize:10.5, color:T.t4, marginTop:9, lineHeight:1.5}}>
           {t("tenders.type_baad_me_bhi_badal_sakte")}
          </div>
        </Modal>
      )}

      {edit && (
        <Modal title={t("subcon.package")} Icon={IcChk} width={460} onClose={()=>setEdit(null)}
          footer={<><SecBtn label={t("common.cancel")} onClick={()=>setEdit(null)}/>
            <PrimBtn label={t("common.save")} Icon={IcChk} onClick={()=>save(edit.id, {name:edit.name, wtype:edit.wtype})}/></>}>
          <Field label={t("common.naam")} full><TxtIn value={edit.name} onChange={v=>setEdit(e=>({...e,name:v}))}/></Field>
          <div style={{marginTop:11}}>
            <Field label={t("tenders.kaam_ka_type")}>
              <SelIn value={edit.wtype} onChange={v=>setEdit(e=>({...e,wtype:v}))}
                options={Object.entries(WTYPE_LABEL).map(([v,l])=>({v,l}))}/>
            </Field>
          </div>
          <div style={{fontSize:11, color:T.t4, marginTop:10, lineHeight:1.55}}>
           {t("tenders.type_se_tay_hota_hai_ki")}
          </div>
        </Modal>
      )}
    </Panel>
  );
}

// ── PROJECT COST BREAKUP ────────────────────────────────────────────
// Estimate sheet ka aaina: BOQ base → premium → GST → add-on % lines
// (contingency, planning...) → un par alag GST → Total Project Cost.
// Sirf dikhane/record ke liye — billing ise kabhi nahi chhooti.
const bkRound = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
function CostBreakupCard({tenderId, data, base, manualTag, isAdmin, onChanged}) {
  const toast = useToast();
  const [nm, setNm] = useState("");
  const [pc, setPc] = useState("");
  const [bs, setBs] = useState("boq_premium");
  const [gA, setGA] = useState(true);
  const [busy, setBusy] = useState(false);

  if (!(base > 0)) return null;
  const addons = data.addons || [];
  const gstPct = num(data.gst_pct);
  const contract = num(data.contract_value);
  const premPct = data.premium_pct !== null && data.premium_pct !== undefined
    ? Number(data.premium_pct)
    : (contract > 0 ? Math.round(((contract / base - 1) * 100 + Number.EPSILON) * 10000) / 10000 : null);
  const premAmt = premPct === null ? 0 : bkRound(base * premPct / 100);
  const sub1 = bkRound(base + premAmt);
  const gstAmt = bkRound(sub1 * gstPct / 100);
  const lineAmt = (l) => bkRound((l.base === "boq" ? base : sub1) * num(l.pct) / 100);
  const addonSum = bkRound(addons.reduce((s, l) => s + lineAmt(l), 0));
  const addonGst = bkRound(addons.filter(l => l.gst_applies).reduce((s, l) => s + lineAmt(l), 0) * gstPct / 100);
  const total = bkRound(sub1 + gstAmt + addonSum + addonGst);

  const BASE_OPTS = [
    { v: "boq_premium", l: t("tenders.base_boq_premium") },
    { v: "boq",         l: t("tenders.base_sirf_boq") },
  ];

  const add = async () => {
    if (!nm.trim() || pc === "") return;
    setBusy(true);
    const r = await api.post(`/tenders/${tenderId}/addons`, { name: nm.trim(), pct: pc, base: bs, gst_applies: gA });
    setBusy(false);
    if (!r?.success) { toast.error(r?.message || "Line nahi judi"); return; }
    setNm(""); setPc("");
    onChanged();
  };
  const del = async (l) => {
    if (!await window.confirmAsync(t("tenders.line_name_hataayein", { name: l.name }))) return;
    const r = await api.del(`/tenders/${tenderId}/addons/${l.id}`);
    if (!r?.success) { toast.error(r?.message || "Delete nahi hua"); return; }
    onChanged();
  };

  const Row = ({label, amt, sign, bold, muted, onDel}) => (
    <div style={{display:"flex", alignItems:"center", gap:8, padding:"6px 0",
      borderTop: bold ? `1.5px solid ${T.b2}` : "none"}}>
      <span style={{flex:1, fontSize:bold?12.5:12, fontWeight:bold?800:muted?400:600,
        color:muted?T.t4:bold?T.t1:T.t2, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{label}</span>
      {onDel && <button onClick={onDel} style={{border:"none", background:"none", color:T.red, cursor:"pointer", fontSize:13, lineHeight:1}}>×</button>}
      <span style={{fontSize:bold?13:12, fontWeight:bold?800:600, color:bold?T.t1:T.t2,
        fontVariantNumeric:"tabular-nums", flexShrink:0}}>{sign || ""}{moneyF(amt)}</span>
    </div>
  );

  return (
    <Panel style={{marginBottom:11}}>
      <PHead title={t("tenders.project_cost_breakup")} sub={t("tenders.estimate_sheet_jaisa_hisaab")}/>
      <div style={{padding:"8px 16px 12px"}}>
        <Row label={`${t("tenders.boq_value")}${manualTag ? ` (${t("tenders.manual")})` : ""}`} amt={base}/>
        {premPct !== null && (
          <Row label={`${t("tenders.premium_2")} ${premPct >= 0 ? "+" : ""}${premPct}% ${premPct >= 0 ? "(above)" : "(below)"}`}
            amt={Math.abs(premAmt)} sign={premAmt >= 0 ? "+ " : "− "}/>
        )}
        <Row label={t("tenders.subtotal")} amt={sub1} bold/>
        {gstPct > 0 && <Row label={`GST ${gstPct}%`} amt={gstAmt} sign="+ "/>}
        {addons.map(l => (
          <Row key={l.id}
            label={`${l.name} ${num(l.pct)}%${l.base === "boq" ? ` (${t("tenders.base_sirf_boq")})` : ""}${l.gst_applies ? "" : ` (${t("tenders.bina_gst")})`}`}
            amt={lineAmt(l)} sign="+ " onDel={isAdmin ? () => del(l) : null}/>
        ))}
        {gstPct > 0 && addonGst > 0 && <Row label={t("tenders.gst_on_addons", { gst: gstPct })} amt={addonGst} sign="+ "/>}
        <Row label={t("tenders.total_project_cost")} amt={total} bold/>

        {isAdmin && (
          <div style={{display:"flex", gap:7, alignItems:"center", flexWrap:"wrap", marginTop:9,
            paddingTop:9, borderTop:`1px dashed ${T.b2}`}}>
            <div style={{flex:"2 1 160px"}}><TxtIn value={nm} onChange={setNm} ph={t("tenders.jaise_contingency")}/></div>
            <div style={{flex:"0 1 70px"}}><TxtIn type="number" value={pc} onChange={setPc} ph="%"/></div>
            <div style={{flex:"1 1 130px"}}><SelIn value={bs} onChange={setBs} options={BASE_OPTS}/></div>
            <label style={{display:"flex", alignItems:"center", gap:5, fontSize:11, color:T.t3, cursor:"pointer", whiteSpace:"nowrap"}}>
              <input type="checkbox" checked={gA} onChange={e=>setGA(e.target.checked)} style={{width:14, height:14, cursor:"pointer"}}/>
              GST
            </label>
            <SecBtn label={busy ? "…" : t("tenders.line_jodo")} Icon={IcAdd} onClick={add} disabled={busy}/>
          </div>
        )}
      </div>
    </Panel>
  );
}

// ── PREMIUM THEEK KARO (admin) ──────────────────────────────────────
// Award par premium lock hota hai; galat lock ho jaye to yahan se sudhrega.
// Ban chuke bills nahi badalte — response ka bills_count yahi yaad dilata hai.
function PremiumFixModal({tenderId, summary, onClose, onDone}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pct, setPct] = useState(() => {
    const cur = summary?.premium_pct_locked ?? summary?.premium_pct;
    return cur === null || cur === undefined ? "" : String(cur);
  });
  const [reason, setReason] = useState("");
  const [updContract, setUpdContract] = useState(true);

  const base = num(summary?.boq_total);
  const p = Number(pct);
  const preview = (base > 0 && pct !== "" && Number.isFinite(p))
    ? Math.round((base * (1 + p / 100) + Number.EPSILON) * 100) / 100 : null;

  const submit = async () => {
    setErr("");
    if (pct === "" || !Number.isFinite(p) || p <= -100 || p >= 100) return setErr(t("tenders.premium_99_ke_beech"));
    if (reason.trim().length < 10) return setErr(t("tenders.premium_badalne_ki_wajah_likho"));
    setBusy(true);
    const res = await api.put(`/tenders/${tenderId}/premium`, {
      premium_pct: p, reason: reason.trim(), update_contract: updContract,
    });
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Premium update nahi hua"); return; }
    toast.success(res.bills_count > 0
      ? t("tenders.n_bills_purane_premium_par", { n: res.bills_count })
      : t("tenders.premium_update_ho_gaya"));
    onDone();
  };

  return (
    <Modal title={t("tenders.premium_theek_karo")} Icon={IcGavel} width={480}
      sub={t("tenders.ban_chuke_bills_nahi_badlenge")} onClose={onClose}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        <PrimBtn label={busy ? t("tenders.ho_raha_hai") : t("common.save")} Icon={IcChk}
          onClick={submit} disabled={busy}/>
      </>}>
      <ErrLine msg={err}/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label={t("tenders.above_below")} hint={t("tenders.minus_below_plus_above")}>
          <TxtIn type="number" value={pct} onChange={setPct} ph="e.g. -8.11"/>
        </Field>
        <Field label={t("tenders.hisaab")}>
          <div style={{...inputStyle, display:"flex", alignItems:"center", fontSize:11.5, color:T.t2, fontVariantNumeric:"tabular-nums"}}>
            {preview === null ? "--" : `${t("tenders.boq_value")} ${moneyF(base)} → ${moneyF(preview)}`}
          </div>
        </Field>
        <Field label={t("tenders.wajah_kam_se_kam_10_akshar")} full>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2}
            style={{...inputStyle, resize:"vertical", lineHeight:1.5}}
            placeholder={t("tenders.jaise_award_par_galat_pct_lock")}/>
        </Field>
        <label style={{gridColumn:"1/3", display:"flex", alignItems:"center", gap:8, fontSize:12, color:T.t2, cursor:"pointer"}}>
          <input type="checkbox" checked={updContract} onChange={e=>setUpdContract(e.target.checked)}
            style={{width:15, height:15, cursor:"pointer"}}/>
          {t("tenders.contract_value_bhi_isi_se_update")}
        </label>
      </div>
    </Modal>
  );
}

function BoqTab({tenderId, boq, loading, reload, rateType, autoImport, reloadTender, manualBoq = 0, onAiPlan}) {
  const toast = useToast();
  const [search, setSearch]   = useState("");
  const [showImport, setShowImport] = useState(false);
  // Naya tender bana kar aaye ho aur BOQ khali ho to import wizard khud khul
  // jaye — pehla kaam yahi hota hai. Ek hi baar (uske baad user ki marzi).
  const autoOpenedRef = useRef(false);
  const [itemModal, setItemModal]   = useState(null);  // {} = naya, {item} = edit
  const [revertOf, setRevertOf]     = useState(null);

  const items   = (boq && boq.data) || [];
  const summary = (boq && boq.summary) || null;
  const imports = (boq && boq.imports) || [];
  const isItemRate = (rateType || summary?.rate_type) === "item_rate";
  // BOQ tender won hote hi final ho jata hai — uske baad edit/delete sirf
  // admin, reason ke saath. Backend par bhi yahi rok hai; ye sirf UI hai.
  const boqFinal = !!(boq && boq.boq_final);
  const isAdmin  = ["admin","super_admin"].includes(getUser()?.role);
  const canEdit  = !boqFinal || isAdmin;
  const changeLog = (boq && boq.change_log) || [];
  const [delOf, setDelOf] = useState(null);

  useEffect(()=>{
    if (autoImport && !autoOpenedRef.current && boq && items.length === 0) {
      autoOpenedRef.current = true;
      setShowImport(true);
    }
  }, [autoImport, boq, items.length]);

  // Executed qty BOQ ke GET par nahi aata — uska apna endpoint hai.
  // Tab khulne par hi laate hain, id se merge karke.
  const [exec, setExec] = useState({});
  useEffect(()=>{
    let dead = false;
    api.get(`/tenders/${tenderId}/boq-execution`).then(r=>{
      if (dead || !r?.success || !Array.isArray(r.data)) return;
      const by = {};
      for (const row of r.data) by[row.id] = row;
      setExec(by);
    }).catch(()=>{});
    return ()=>{ dead = true; };
  }, [tenderId, boq]);

  const filtered = useMemo(()=>{
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => [i.item_no, i.sor_code, i.description, i.unit]
      .some(v => String(v||"").toLowerCase().includes(q)));
  }, [items, search]);

  const shownTotal = round2(filtered.reduce((s,i)=>s+Number(i.amount||0), 0));

  const delItem = async (it) => {
    // Final BOQ par reason wala modal; warna seedha confirm.
    if (boqFinal) { setDelOf(it); return; }
    if (!await window.confirmAsync(`"${String(it.description||"").slice(0,60)}" hataayein?\n\nBOQ ka jod ghat jayega.`)) return;
    const res = await api.del(`/tenders/${tenderId}/boq/items/${it.id}`);
    if (!res?.success) { toast.error(res?.message || "Delete nahi hua"); return; }
    toast.success("Item hat gaya");
    reload();
  };
  const delItemWithReason = async (it, reason) => {
    const res = await api.del(`/tenders/${tenderId}/boq/items/${it.id}`, {reason});
    if (!res?.success) { toast.error(res?.message || "Delete nahi hua"); return; }
    toast.success("Item hat gaya");
    setDelOf(null); reload();
  };

  // Item-rate tender me department ke rate ke saath apna rate bhi dikhta hai.
  const COLS = isItemRate
    ? "62px 74px minmax(160px,1.9fr) 50px 80px 84px 92px 84px 92px 84px 88px 68px"
    : "70px 84px minmax(200px,2.2fr) 56px 88px 92px 106px 92px 96px 74px";

  // Premium theek karna — sirf admin, aur sirf lock ke baad (lock se pehle
  // Edit form ka Above/Below % hi kaafi hai).
  const isAdminUser = ["admin","super_admin"].includes(getUser()?.role);
  const [fixPrem, setFixPrem] = useState(false);

  const TILES = summary ? [
    {label:t("common.items"), value:summary.item_count, note:`${imports.filter(i=>i.status==="committed").length} import se`,
      color:T.ind, Icon:IcTable},
    {label:t("tenders.boq_total"), value:money(summary.boq_total), note:moneyF(summary.boq_total),
      color:T.blu, Icon:IcRupee},
    // Extra item hon to unka apna tile — wo BOQ total me nahi ginte.
    summary.extra_count > 0
      ? {label:t("tenders.extra_items"), value:money(summary.extra_total),
         note:`${summary.extra_count} item · BOQ total se bahar`, color:T.amb, Icon:IcRupee}
      : {label:t("tenders.vs_estimated"),
         value: summary.diff_vs_estimated === null ? "--"
           : `${summary.diff_vs_estimated>=0?"+":"−"}${money(Math.abs(summary.diff_vs_estimated))}`,
         note: summary.estimated_cost === null ? "Estimate set nahi" : `Estimate ${money(summary.estimated_cost)}`,
         color: summary.diff_vs_estimated === null ? T.slt : summary.diff_vs_estimated > 0 ? T.red : T.grn,
         Icon:IcRupee},
    // Item-rate tender me premium hota hi nahi — wahan apne rate ka jod
    // BOQ se kitna hatt kar hai, wo number kaam ka hai.
    isItemRate
      ? {label: (summary.quoted_vs_boq_pct ?? 0) >= 0 ? "Apna Quote (Above)" : "Apna Quote (Below)",
         value: summary.quoted_vs_boq_pct === null ? "--"
           : `${summary.quoted_vs_boq_pct>=0?"+":""}${summary.quoted_vs_boq_pct}%`,
         note: summary.quoted_total ? `Quote ${money(summary.quoted_total)}` : "Apne rate abhi nahi bhare",
         color: summary.quoted_vs_boq_pct === null ? T.slt : summary.quoted_vs_boq_pct >= 0 ? T.amb : T.grn,
         Icon:IcGavel}
      : {label: summary.premium_pct === null ? "Premium" : summary.premium_pct >= 0 ? "Premium (Above)" : "Discount (Below)",
         value: (() => {
           const shown = summary.premium_pct_locked ?? summary.premium_pct;
           return shown === null || shown === undefined ? "--" : `${shown>=0?"+":""}${shown}%`;
         })(),
         note: summary.premium_locked_at
           ? (summary.premium_stale ? "Lock ho chuka — BOQ uske baad badla" : "Award par lock ho chuka")
           : (summary.contract_value ? `Contract ${money(summary.contract_value)}` : "Contract value set nahi"),
         color: summary.premium_stale ? T.red
           : summary.premium_pct === null ? T.slt : summary.premium_pct >= 0 ? T.amb : T.grn,
         Icon:IcGavel},
  ] : [];

  if (loading) return <Panel><Loading text={t("tenders.boq_load_ho_raha_hai")}/></Panel>;

  return (<>
    {/* Tiles */}
    {summary && (
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:10, marginBottom:11}}>
        {TILES.map(t=><Stat key={t.label} {...t}/>)}
      </div>
    )}
    {/* Manual vs imported cross-check — bidding par haath se bhara number
        import ke jod se hat raha ho to bata do (0.5% ya ₹1000 se zyada). */}
    {summary && manualBoq > 0 && num(summary.boq_total) > 0
      && Math.abs(num(summary.boq_total) - manualBoq) > Math.max(num(summary.boq_total) * 0.005, 1000) && (
      <div style={{padding:"8px 12px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8,
        fontSize:11.5, color:T.amb, marginBottom:11, fontWeight:600}}>
        {t("tenders.manual_vs_import_farak", {
          manual: moneyF(manualBoq),
          imported: moneyF(num(summary.boq_total)),
          diff: moneyF(Math.abs(num(summary.boq_total) - manualBoq)),
        })}
      </div>
    )}
    {summary && !isItemRate && summary.premium_locked_at && isAdminUser && (
      <div style={{display:"flex", justifyContent:"flex-end", marginTop:-4, marginBottom:11}}>
        <button onClick={()=>setFixPrem(true)}
          style={{border:"none", background:"none", cursor:"pointer", fontSize:11.5,
            color:T.blu, fontWeight:700, padding:0}}>
          {t("tenders.premium_theek_karo")}
        </button>
      </div>
    )}
    {fixPrem && (
      <PremiumFixModal tenderId={tenderId} summary={summary}
        onClose={()=>setFixPrem(false)}
        onDone={()=>{ setFixPrem(false); reload(); reloadTender && reloadTender(); }}/>
    )}

    {/* Change history — BOQ final hone ke baad ke sab badlaav */}
    {!!changeLog.length && (
      <Panel style={{marginBottom:11}}>
        <PHead title={t("tenders.change_history")} sub={t("tenders.final_boq_me_kya_kya_badla")}/>
        <div style={{padding:"10px 14px", display:"flex", flexDirection:"column", gap:9}}>
          {changeLog.map(l=>{
            const act = {edit:{l:t("common.edit_2"), c:T.amb, bg:T.ambL}, delete:{l:t("activity_log.deleted"), c:T.red, bg:T.redL},
                         add:{l:t("tenders.added"), c:T.grn, bg:T.grnL}, add_extra:{l:t("tenders.extra_added"), c:T.amb, bg:T.ambL},
                         add_substituted:{l:t("tenders.substituted"), c:T.blu, bg:T.bluL}}[l.action]
                     || {l:l.action, c:T.t3, bg:T.sltL};
            let ch = null;
            try { ch = l.changes_json ? JSON.parse(l.changes_json) : null; } catch (_) {}
            return (
              <div key={l.id} style={{display:"flex", gap:10, alignItems:"flex-start",
                paddingBottom:9, borderBottom:`1px solid ${T.b1}`}}>
                <div style={{flexShrink:0}}><Pill label={act.l} c={act.c} bg={act.bg}/></div>
                <div style={{minWidth:0, flex:1}}>
                  <div style={{fontSize:12, color:T.t1, fontWeight:600, overflow:"hidden",
                    textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {l.item_no || "--"} · {l.description_snap || ""}
                  </div>
                  {ch && Object.keys(ch).length > 0 && (
                    <div style={{fontSize:11, color:T.t3, marginTop:2, lineHeight:1.6}}>
                      {/* Item-edit ki value {from,to} hoti hai; package ke log
                          seedhi value likhte hain (package_id: null bhi aa
                          sakta hai — "package se hataya"). Dono shape sambhalo,
                          warna poora Tenders tab hi gir jaata hai. */}
                      {Object.entries(ch).map(([k,v])=>{
                        const isFT = v && typeof v === "object" && ("from" in v || "to" in v);
                        return (
                          <span key={k} style={{marginRight:10}}>
                            {k}: {isFT ? (<>
                              <b style={{color:T.t4}}>{String(v.from ?? "--")}</b>
                              {" → "}<b style={{color:T.t1}}>{String(v.to ?? "--")}</b>
                            </>) : (
                              <b style={{color:T.t1}}>{v === null || v === undefined ? "--" : String(v)}</b>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {l.reason && (
                    <div style={{fontSize:11.5, color:T.t2, marginTop:3, lineHeight:1.5}}>{l.reason}</div>
                  )}
                  <div style={{fontSize:10.5, color:T.t4, marginTop:3}}>
                    {fmtDate(l.created_at)}{l.created_by_name ? " · " + l.created_by_name : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    )}

    {/* Imports history */}
    {!!imports.length && (
      <Panel style={{marginBottom:11}}>
        <PHead title={t("tenders.import_history")} sub={`${imports.length} import`}/>
        <div style={{padding:"9px 14px", display:"flex", flexDirection:"column", gap:7}}>
          {imports.map(im=>{
            const gone = im.status === "reverted";
            return (
              <div key={im.id} style={{display:"flex", alignItems:"center", gap:11, flexWrap:"wrap",
                padding:"7px 10px", borderRadius:7, border:`1px solid ${T.b1}`,
                background:gone?T.sltL:T.surface, opacity:gone?0.65:1}}>
                <IcDoc size={14} color={gone?T.t4:T.ind}/>
                <span style={{fontSize:12, fontWeight:700, color:T.t1, minWidth:0, flex:1,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                  {im.file_name || `Import #${im.id}`}
                </span>
                <span style={{fontSize:11, color:T.t3}}>{fmtDate(im.created_at)}</span>
                <span style={{fontSize:11, color:T.t3}}>{im.row_count} rows</span>
                <span style={{fontSize:11.5, fontWeight:700, color:T.t2}}>{money(im.committed_total)}</span>
                {gone
                  ? <Pill label={t("tenders.reverted")} c={T.t4} bg={T.sltL}/>
                  : <SecBtn label={t("tenders.revert")} Icon={IcUndo} color={T.red} onClick={()=>setRevertOf(im)}/>}
              </div>
            );
          })}
        </div>
      </Panel>
    )}

    {/* Work packages — BOQ aur zameen ke kaam ke beech ka pul */}
    {!!items.length && <PackagesPanel tenderId={tenderId} canEdit={canEdit} items={items} onChanged={reload}/>}

    {/* Items */}
    <Panel>
      <PHead title={t("tenders.boq_items")} sub={summary ? `${summary.item_count} items · ${moneyF(summary.boq_total)}` : undefined}
        action={<div style={{display:"flex", gap:7, alignItems:"center"}}>
          {boqFinal && (
            <span style={{display:"inline-flex", alignItems:"center", gap:5, fontSize:11,
              color:T.amb, fontWeight:600, marginRight:2}}>
              <IcLock size={12} color={T.amb}/>{t("tenders.final")}
            </span>
          )}
          {canEdit && <SecBtn label={t("tenders.import_excel")} Icon={IcUpload} onClick={()=>setShowImport(true)}/>}
          <PrimBtn label={t("common.add_item_2")} Icon={IcAdd} onClick={()=>setItemModal({})}/>
        </div>}/>
      {boqFinal && (
        <div style={{padding:"9px 14px", background:T.ambL, borderBottom:`1px solid ${T.ambM}`,
          fontSize:11.5, color:T.t2, lineHeight:1.55, display:"flex", gap:7, alignItems:"flex-start"}}>
          <IcLock size={13} color={T.amb}/>
          <span><Rich k="tenders.boq_final_hai_tender_won_ho" params={{ isAdmin: isAdmin
              ? "Badalna hai to reason likhna zaroori hai; har badlaav Change History me rehta hai."
              : "Ab ise sirf admin badal sakta hai.", v: " " }} /></span>
        </div>
      )}

      {!!items.length && (
        <div style={{padding:"8px 14px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB}}>
          <div style={{position:"relative", maxWidth:340}}>
            <div style={{position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", lineHeight:0}}>
              <IcSrch size={13} color={T.t4}/>
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("tenders.item_sor_code_ya_description_dhoondo")}
              style={{width:"100%", height:30, padding:"0 9px 0 28px", borderRadius:6,
                border:`1.5px solid ${search?T.ind:T.b1}`, fontSize:12, color:T.t1,
                background:search?T.indL:T.surface, outline:"none", boxSizing:"border-box", fontFamily:"inherit"}}/>
          </div>
        </div>
      )}

      {!items.length && (
        <Empty Icon={IcTable} text={t("tenders.abhi_koi_boq_item_nahi")}
          sub={t("tenders.excel_se_import_karo_ya_haath")}/>
      )}

      {!!items.length && (<>
        <div style={{display:"grid", gridTemplateColumns:COLS, padding:"8px 14px", gap:9,
          background:T.surfaceB, borderBottom:`1px solid ${T.b1}`}}>
          {(isItemRate
            ? ["Item No","SOR Code","Description","Unit","Qty","SOR Rate","SOR Amount","Apna Rate","Apna Amount","Executed Qty","Used %",""]
            : ["Item No","SOR Code","Description","Unit","Qty","Rate","Amount","Executed Qty","Used %",""]
          ).map((h,i)=>(
            <span key={i} style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase",
              letterSpacing:".6px", textAlign:i>=4&&i<=(isItemRate?10:8)?"right":"left"}}>{h}</span>
          ))}
        </div>

        {!filtered.length && <Empty text={t("tenders.is_search_me_koi_item_nahi")}/>}

        {filtered.map((it,i)=>(
          <div key={it.id} style={{display:"grid", gridTemplateColumns:COLS, padding:"9px 14px", gap:9,
            alignItems:"center", borderBottom:i<filtered.length-1?`1px solid ${T.b1}`:"none"}}>
            <span style={{fontSize:11.5, color:T.t2, fontWeight:600, display:"flex", alignItems:"center", gap:4}}>
              {it.item_no || "--"}
              {it.item_type === "extra" && <Pill label={t("tenders.extra")} c={T.amb} bg={T.ambL}/>}
              {it.item_type === "substituted" && <Pill label={t("tenders.sub")} c={T.blu} bg={T.bluL}/>}
            </span>
            <span style={{fontSize:11.5, color:T.t3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
              {it.sor_code || "--"}
            </span>
            <span title={it.description}
              style={{fontSize:12, color:T.t1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"default"}}>
              {it.description}
            </span>
            <span style={{fontSize:11.5, color:T.t3}}>{it.unit || "--"}</span>
            <span style={{fontSize:11.5, color:T.t2, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{fmtQty(it.qty)}</span>
            <span style={{fontSize:11.5, color:T.t2, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{fmtQty(it.rate)}</span>
            <span style={{fontSize:12, color:T.t1, fontWeight:700, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>
              {moneyF(it.amount)}
            </span>
            {isItemRate && (<>
              <span style={{fontSize:11.5, color:it.quoted_rate!=null?T.ind:T.t4, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>
                {it.quoted_rate!=null ? fmtQty(it.quoted_rate) : "--"}
              </span>
              <span style={{fontSize:12, color:it.quoted_amount!=null?T.ind:T.t4, fontWeight:700, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>
                {it.quoted_amount!=null ? moneyF(it.quoted_amount) : "--"}
              </span>
            </>)}
            {(()=>{
              const ex  = exec[it.id];
              const eq  = ex ? Number(ex.executed_qty||0) : null;
              const pct = ex ? Number(ex.pct_used||0) : null;
              // BOQ qty se zyada ho gaya = deviation. Rokte nahi, sirf batate hain.
              const over = pct !== null && pct > 100;
              return (<>
                <span style={{fontSize:11.5, color:eq?T.t2:T.t4, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>
                  {eq === null ? "--" : fmtQty(eq)}
                </span>
                <div style={{display:"flex", gap:4, alignItems:"center", justifyContent:"flex-end"}}>
                  {pct === null ? <span style={{fontSize:11.5, color:T.t4}}>--</span> : (
                    <span style={{fontSize:11.5, fontWeight:over?700:400, textAlign:"right",
                      color:over?T.amb:pct>0?T.t2:T.t4, fontVariantNumeric:"tabular-nums"}}>{pct}%</span>
                  )}
                  {over && <Pill label={t("tenders.deviation")} c={T.amb} bg={T.ambL}/>}
                </div>
              </>);
            })()}
            <div style={{display:"flex", gap:4, justifyContent:"flex-end"}}>
              {canEdit ? (<>
                <button onClick={()=>setItemModal({item:it})}
                  title={boqFinal ? t("tenders.edit_reason_zaroori") : t("common.edit_2")}
                  style={{width:26, height:26, borderRadius:6, border:`1px solid ${boqFinal?T.ambM:T.b1}`,
                    background:boqFinal?T.ambL:T.surfaceB,
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}>
                  <IcEdit size={12} color={boqFinal?T.amb:T.t3}/>
                </button>
                <button onClick={()=>delItem(it)}
                  title={boqFinal ? t("tenders.delete_reason_zaroori") : t("common.delete")}
                  style={{width:26, height:26, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surfaceB,
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}>
                  <IcTrash size={12} color={T.red}/>
                </button>
              </>) : (
                <span title={t("tenders.tender_won_ho_chuka_hai_boq_2")}
                  style={{lineHeight:0, cursor:"help", opacity:.55}}><IcLock size={13} color={T.t4}/></span>
              )}
            </div>
          </div>
        ))}

        {/* Totals footer */}
        <div style={{display:"grid", gridTemplateColumns:COLS, padding:"10px 14px", gap:9,
          background:T.surfaceB, borderTop:`2px solid ${T.b1}`, alignItems:"center"}}>
          <span style={{gridColumn:"1/5", fontSize:11.5, fontWeight:700, color:T.t2}}>
            {search ? `${filtered.length} of ${items.length} items` : `${items.length} items`}
          </span>
          <span/><span/>
          <span style={{fontSize:13, fontWeight:800, color:T.t1, textAlign:"right",
            fontVariantNumeric:"tabular-nums", gridColumn:"7/8"}}>
            {moneyF(shownTotal)}
          </span>
          <span/><span/><span/>{isItemRate && <><span/><span/></>}
        </div>
      </>)}
    </Panel>

    {showImport && <BoqImportModal tenderId={tenderId} boqFinal={boqFinal}
      onClose={()=>setShowImport(false)} onDone={reload} onAiPlan={onAiPlan}/>}
    {itemModal && <BoqItemModal tenderId={tenderId} item={itemModal.item}
      isItemRate={isItemRate} boqItems={items} boqFinal={boqFinal}
      onClose={()=>setItemModal(null)} onSaved={reload}/>}
    {delOf && (
      <BoqReasonModal
        title={t("tenders.boq_item_hatao")}
        sub={`${delOf.item_no || "--"} · ${String(delOf.description||"").slice(0,60)}`}
        warn="BOQ final hai — item hatane se jod ghat jayega. Ye record hamesha Change History me rahega."
        confirmLabel="Hatao"
        onCancel={()=>setDelOf(null)}
        onConfirm={(reason)=>delItemWithReason(delOf, reason)}/>
    )}
    {revertOf && <RevertImportModal tenderId={tenderId} imp={revertOf}
      onClose={()=>setRevertOf(null)} onDone={reload}/>}
  </>);
}

// ════════════════════════════════════════════════════════════════════
// T3 — MEASUREMENTS (MB) + RA BILLS
//
// Backend: gb-backend/routes/tender-billing.js.
//
// Do baatein jo poore T3 UI ka aakar tay karti hain:
//
// 1. LOCK — backend measurement ko tabhi rokta hai jab uski date kisi
//    non-cancelled RA bill ke upto_date se pehle (ya barabar) ho. API
//    row par "locked" flag nahi bhejta, isliye yahan RA bills list se
//    lock date khud nikaalte hain aur row par taala dikhate hain. Asli
//    rok phir bhi backend hi lagata hai — ye sirf pehle se bata dena hai.
//
// 2. DEDUCTION — bill par wahi heads lagte hain jo Deduction Setup me
//    configured hain. Ek baar ka "ad-hoc" head backend chupchaap girah
//    deta hai (applyDeductions sirf config rows par chalta hai), isliye
//    wizard me ad-hoc row DI HI NAHI GAYI — uske badle Setup me manual
//    head banane ko kaha jata hai.
// ════════════════════════════════════════════════════════════════════

// Rupee amount → Indian words (RA bill print par "in words" chahiye).
const ONES = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
  "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const TENS = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
const below100 = (n) => n < 20 ? ONES[n] : (TENS[Math.floor(n/10)] + (n%10 ? " " + ONES[n%10] : ""));
const below1000 = (n) => {
  const h = Math.floor(n/100), r = n%100;
  return (h ? ONES[h] + " Hundred" + (r ? " " : "") : "") + (r ? below100(r) : "");
};
const numToWordsIN = (amount) => {
  const total = Math.round(Number(amount) || 0);
  if (total === 0) return t("tenders.zero_rupees_only");
  const rupees = Math.floor(total);
  const parts = [];
  const crore = Math.floor(rupees/10000000);
  const lakh  = Math.floor((rupees%10000000)/100000);
  const thou  = Math.floor((rupees%100000)/1000);
  const rest  = rupees%1000;
  if (crore) parts.push(below1000(crore) + " Crore");
  if (lakh)  parts.push(below1000(lakh)  + " Lakh");
  if (thou)  parts.push(below1000(thou)  + " Thousand");
  if (rest)  parts.push(below1000(rest));
  return parts.join(" ").replace(/\s+/g," ").trim() + " Rupees Only";
};

// Har bill ke status ka rang — list aur drawer dono me wahi.
const RA_STATUS_STYLE = {
  draft:     {get label() { return t("tenders.draft"); },     c:T.slt, bg:T.sltL},
  submitted: {get label() { return t("tenders.submitted"); }, c:T.blu, bg:T.bluL},
  cancelled: {get label() { return t("tenders.cancelled"); }, c:T.t4,  bg:T.sltL},
};

// Non-cancelled bills me sabse aage ka upto_date = lock date.
const lockDateOf = (bills) => {
  const ds = (bills||[]).filter(b=>b.status!=="cancelled").map(b=>b.upto_date).filter(Boolean)
    .map(d=>String(d).slice(0,10)).sort();
  return ds.length ? ds[ds.length-1] : null;
};

// Backend ka exact lock message — row tooltip par wahi dikhta hai.
const LOCK_MSG = "Is date tak ka kaam RA bill me bill ho chuka hai — nayi entry banao aage ki date pe.";

// ── BOQ item picker — dhoondh kar chuno (BOQ 500+ items ka ho sakta hai) ──
function BoqItemPicker({items, value, onChange}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const sel = items.find(i=>String(i.id)===String(value));
  const list = useMemo(()=>{
    const s = q.trim().toLowerCase();
    const base = s ? items.filter(i=>[i.item_no,i.description,i.unit]
      .some(v=>String(v||"").toLowerCase().includes(s))) : items;
    return base.slice(0, 60);
  }, [items, q]);

  return (
    <div style={{position:"relative"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{...inputStyle, cursor:"pointer", display:"flex",
        alignItems:"center", justifyContent:"space-between", gap:8}}>
        <span style={{minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          color:sel?T.t1:T.t4}}>
          {sel ? `${sel.item_no||"--"} · ${sel.description}` : t("tenders.boq_item_dhoondo")}
        </span>
        <IcDown size={12} color={T.t4}/>
      </div>
      {open && (
        <div style={{position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:5,
          background:T.surface, border:`1px solid ${T.b2}`, borderRadius:8,
          boxShadow:"0 10px 30px rgba(0,0,0,.14)", overflow:"hidden"}}>
          <div style={{padding:8, borderBottom:`1px solid ${T.b1}`}}>
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
              placeholder={t("tenders.item_no_ya_description")}
              style={{...inputStyle, padding:"7px 10px", fontSize:12}}/>
          </div>
          <div style={{maxHeight:230, overflowY:"auto"}}>
            {!list.length && <div style={{padding:"14px 12px", fontSize:12, color:T.t4}}>{t("tenders.koi_item_nahi_mila")}</div>}
            {list.map(i=>(
              <div key={i.id} onClick={()=>{onChange(i.id); setOpen(false); setQ("");}}
                style={{padding:"8px 11px", cursor:"pointer", borderBottom:`1px solid ${T.b1}`,
                  background:String(i.id)===String(value)?T.indL:T.surface}}>
                <div style={{fontSize:12, color:T.t1, fontWeight:600, overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                  {i.item_no||"--"} · {i.description}
                </div>
                <div style={{fontSize:10.5, color:T.t4, marginTop:2}}>{t("tenders.boq_fmtqty_i_rate_fmtqty2", { fmtQty: fmtQty(i.qty), i: i.unit||"", fmtQty2: fmtQty(i.rate) })}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MEASUREMENT ADD / EDIT MODAL ────────────────────────────────────
function MeasurementModal({tenderId, sites, boqItems, edit, onClose, onDone}) {
  const toast = useToast();
  const isEdit = !!edit?.id;
  const [f, setF] = useState({
    project_id:  edit?.project_id  || (sites.length===1 ? sites[0].id : ""),
    boq_item_id: edit?.boq_item_id || "",
    mdate:       edit?.mdate ? String(edit.mdate).slice(0,10) : new Date().toISOString().slice(0,10),
    qty:         edit?.qty ?? "",
    mb_ref:      edit?.mb_ref || "",
    remarks:     edit?.remarks || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const item = boqItems.find(i=>String(i.id)===String(f.boq_item_id));

  const save = async () => {
    if (!f.project_id)  { toast.error("Site chuno"); return; }
    if (!f.boq_item_id) { toast.error("BOQ item chuno"); return; }
    if (!f.mdate)       { toast.error("Date zaroori hai"); return; }
    if (!(Number(f.qty) > 0)) { toast.error("Qty 0 se badi honi chahiye"); return; }
    setBusy(true);
    const body = {
      project_id: Number(f.project_id), boq_item_id: Number(f.boq_item_id),
      mdate: f.mdate, qty: Number(f.qty),
      mb_ref: f.mb_ref || null, remarks: f.remarks || null,
    };
    const res = isEdit
      ? await api.put(`/tenders/${tenderId}/measurements/${edit.id}`, body)
      : await api.post(`/tenders/${tenderId}/measurements`, body);
    setBusy(false);
    // Lock / negative / scoping — sab backend ka message hi dikhate hain.
    if (!res?.success) { toast.error(res?.message || "Save nahi hua"); return; }
    toast.success(isEdit ? "Measurement update ho gaya" : "Measurement darj ho gaya");
    onDone();
  };

  return (
    <Modal title={isEdit ? t("tenders.measurement_edit") : t("tenders.nayi_measurement")} Icon={IcTable}
      sub={isEdit ? `MB entry #${edit.id}` : t("tenders.measurement_book_mb_ki_entry")}
      onClose={onClose} width={620}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        <PrimBtn label={busy ? t("tenders.save_ho_raha_hai") : t("common.save")} Icon={IcChk} onClick={save} disabled={busy}/>
      </>}>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label={t("tenders.site")} hint={!sites.length ? t("tenders.pehle_sites_tab_me_project_link") : undefined}>
          <SelIn value={f.project_id} onChange={v=>set("project_id",v)} ph={t("tenders.site_chuno")}
            options={sites.map(s=>({v:s.id, l:s.name}))}/>
        </Field>
        <Field label={t("tenders.date")}>
          <TxtIn type="date" value={f.mdate} onChange={v=>set("mdate",v)}/>
        </Field>
        <Field label={t("tenders.boq_item")} full>
          <BoqItemPicker items={boqItems} value={f.boq_item_id} onChange={v=>set("boq_item_id",v)}/>
        </Field>
        <Field label={`Qty *${item?.unit ? ` (${item.unit})` : ""}`}>
          <TxtIn type="number" value={f.qty} onChange={v=>set("qty",v)} ph="0"/>
        </Field>
        <Field label={t("tenders.mb_ref")}>
          <TxtIn value={f.mb_ref} onChange={v=>set("mb_ref",v)} ph={t("tenders.e_g_mb_12_page_44")}/>
        </Field>
        <Field label={t("common.remarks")} full>
          <TxtIn value={f.remarks} onChange={v=>set("remarks",v)} ph={t("tenders.optional")}/>
        </Field>
      </div>
      {item && (
        <div style={{marginTop:13, padding:"9px 12px", background:T.indL, border:`1px solid ${T.indM}`,
          borderRadius:7, fontSize:11.5, color:T.t2, lineHeight:1.6}}><Rich k="tenders.item_boq_qty_fmtqty_item2_rate" params={{ item: item.item_no || "--", fmtQty: fmtQty(item.qty), item2: item.unit||"", money: money(item.rate) }} />{Number(f.qty) > 0 && <> {t("tenders.is_entry_ki_value")} <b>{money(round2(Number(f.qty)*Number(item.rate||0)))}</b></>}
        </div>
      )}
    </Modal>
  );
}

// ── MAP TAB (P2b) — pipeline alignment ──────────────────────────────
// The BOQ says how many metres; it never says where. This is the "where":
// each site's pipeline drawn as lines, with UGR / pump house / HDD pins on
// them. Two ways in — draw it here, or import the .kml the department sent
// (or the PM exported from Google Earth / My Maps). Length is always
// computed server-side from the geometry, never typed.
//
// Progress colouring is deliberately NOT here — that comes from DPR/MB in
// P3, so the map never becomes a second place to record work.
let _gmapsPromise = null;
function loadGoogleMaps(apiKey) {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps?.drawing) return Promise.resolve(window.google);
  if (_gmapsPromise) return _gmapsPromise;
  _gmapsPromise = new Promise((resolve, reject) => {
    const cb = "__gmapsTender_" + Math.random().toString(36).slice(2);
    window[cb] = () => { delete window[cb]; resolve(window.google); };
    const s = document.createElement("script");
    // Only `geometry` — Google removed DrawingManager in Maps JS 3.65, so the
    // drawing below is our own click-to-add-vertex handler on the map.
    // places sirf search-box ke liye — key par enable na ho to Autocomplete
    // banega hi nahi aur hum Geocoder par gir jaate hain; map waise hi chalta.
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${cb}&libraries=geometry,places`;
    s.async = true; s.defer = true;
    s.onerror = () => { _gmapsPromise = null; reject(new Error("Google Maps load nahi hua")); };
    document.head.appendChild(s);
  });
  return _gmapsPromise;
}

const LINE_TYPES  = [
  {v:"rising",  get l() { return t("tenders.rising_main"); }, c:"#DC2626"},
  {v:"gravity", get l() { return t("tenders.gravity"); },     c:"#2563EB"},
  {v:"inlet",   get l() { return t("tenders.inlet"); },       c:"#059669"},
  {v:"outlet",  get l() { return t("tenders.outlet"); },      c:"#D97706"},
  // Ratna wale ne drain/road bhi map par utaare — apna type milna chahiye,
  // warna sab "other" me dab jaate hain aur filter ka matlab nahi rehta.
  {v:"drain",   get l() { return t("tenders.drain_line"); },  c:"#0E7490"},
  {v:"road",    get l() { return t("tenders.road"); },        c:"#92400E"},
  {v:"other",   get l() { return t("common.other"); },       c:"#6B7280"},
];
const POINT_TYPES = [
  {v:"ugr",        l:"UGR"},
  {v:"pump_house", get l() { return t("tenders.pump_house"); }},
  {v:"hdd",        get l() { return t("tenders.hdd_crossing"); }},
  {v:"valve",      get l() { return t("tenders.valve_chamber"); }},
  {v:"culvert",    get l() { return t("tenders.culvert"); }},
  {v:"other",      get l() { return t("common.other"); }},
];
// Rakba wale feature — UGR ka tank, pump house ka plinth, plot ki boundary.
// Inka naap lambai nahi, RAKBA hai; isliye kind alag hai aur map par ye
// polygon ban kar aate hain.
const AREA_TYPES  = [
  {v:"ugr",        l:"UGR"},
  {v:"pump_house", get l() { return t("tenders.map_pump_house"); }},
  {v:"chamber",    get l() { return t("tenders.map_chamber"); }},
  {v:"building",   get l() { return t("tenders.map_building"); }},
  {v:"plot",       get l() { return t("tenders.map_plot_boundary"); }},
  {v:"other",      get l() { return t("tenders.map_other"); }},
];
// Kaunsa type kis parivaar ka — backend ke FAMILY se HU-BA-HU. Filter yahan
// se banta hai aur summary ka jod wahan se; dono jagah ek hi sach rehna
// chahiye, warna chip "3" kahega aur patti "4".
const FAMILY = {
  inlet:"pipe", outlet:"pipe", rising:"pipe", gravity:"pipe",
  drain:"drain", road:"road",
  ugr:"structure", pump_house:"structure", hdd:"structure",
  valve:"structure", culvert:"structure", chamber:"structure",
  plot:"structure", building:"structure",
};
const familyOf = (a) => FAMILY[a] || (a === "other" ? "other" : "custom");
const FAM_META = {
  pipe:      {get l() { return t("tenders.fam_pipeline");  }, c:"#2563EB"},
  drain:     {get l() { return t("tenders.fam_naali");     }, c:"#0E7490"},
  road:      {get l() { return t("tenders.fam_sadak");     }, c:"#92400E"},
  structure: {get l() { return t("tenders.fam_structure"); }, c:"#4338CA"},
  custom:    {get l() { return t("tenders.fam_apne_item"); }, c:"#7C3AED"},
  other:     {get l() { return t("tenders.map_other");     }, c:"#6B7280"},
};
// Custom type LINE_TYPES me nahi hota — uska rang parivaar se aata hai,
// warna har naya item slate-grey "other" jaisa dikhta.
const lineColour = (t) => (LINE_TYPES.find(x=>x.v===t) || {}).c || FAM_META[familyOf(t)].c;

// Polygon ka rakba — wahi ganit jo backend ke utils/kml.js me hai, taaki
// draw karte waqt dikhne wala ankda save ke baad badal na jaye. Origin
// ghatana zaroori hai (absolute lat/lng par shoelace float me ragadta hai)
// aur reference latitude polygon ka AUSAT (pehla point nahi — warna wahi
// aakriti ulta ghumane par rakba badal jata hai).
function polyAreaM2(pts){
  const n = (pts||[]).length;
  if (n < 3) return 0;
  let latSum = 0; for (const p of pts) latSum += Number(p.lat);
  const latRef = latSum / n, mLat = 111320, mLng = 111320 * Math.cos(latRef*Math.PI/180);
  const lat0 = Number(pts[0].lat), lng0 = Number(pts[0].lng);
  let twice = 0;
  for (let i = 0; i < n; i++){
    const a = pts[i], b = pts[(i+1) % n];
    const ax = (Number(a.lng)-lng0)*mLng, ay = (Number(a.lat)-lat0)*mLat;
    const bx = (Number(b.lng)-lng0)*mLng, by = (Number(b.lat)-lat0)*mLat;
    twice += ax*by - bx*ay;
  }
  return Math.abs(twice/2);
}
const fmtArea = (m2) => Number(m2||0) >= 10000
  ? (Number(m2)/10000).toLocaleString("en-IN",{maximumFractionDigits:2}) + " ha"
  : Math.round(Number(m2||0)).toLocaleString("en-IN") + " m²";

// Line ko bagal me khiskao — wahi ganit jo backend ke utils/lineOffset me
// hai (naali server par banti hai; yahan sirf road ka footprint dikhane ke
// liye chahiye, isliye chhota roop). Local metre-frame me kaam karta hai.
const M_LAT = 111320;
function offsetPathJS(coords, dist, side){
  const cl=[];
  for(const p of coords||[]){
    const lat=Number(p?.lat), lng=Number(p?.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)) continue;
    const L=cl[cl.length-1];
    if(L && Math.abs(L.lat-lat)<1e-9 && Math.abs(L.lng-lng)<1e-9) continue;
    cl.push({lat,lng});
  }
  if(cl.length<2 || !(Math.abs(dist)>0)) return [];
  const lat0=cl.reduce((s,p)=>s+p.lat,0)/cl.length;
  const kx=M_LAT*Math.cos(lat0*Math.PI/180);
  const xy=cl.map(p=>({x:p.lng*kx, y:p.lat*M_LAT}));
  const d=Math.abs(dist)*(side==="right"?-1:1);
  const nrm=v=>{const L=Math.hypot(v.x,v.y); return L?{x:v.x/L,y:v.y/L}:{x:0,y:0};};
  const segN=[];
  for(let i=0;i+1<xy.length;i++){
    const dir=nrm({x:xy[i+1].x-xy[i].x, y:xy[i+1].y-xy[i].y});
    segN.push({x:-dir.y, y:dir.x});
  }
  return xy.map((p,i)=>{
    const a=segN[i-1], b=segN[i];
    let n;
    if(!a) n=b; else if(!b) n=a;
    else{
      const s=nrm({x:a.x+b.x, y:a.y+b.y});
      const c=s.x*a.x+s.y*a.y;
      const k=c>0.2?1/c:5;
      n={x:s.x*k, y:s.y*k};
    }
    return {lat:(p.y+n.y*d)/M_LAT, lng:(p.x+n.x*d)/kx};
  });
}
// Sadak ka asli footprint — dono kinare jod kar band aakriti
function corridorJS(coords, widthM){
  const w=Number(widthM);
  if(!(w>0)) return [];
  const l=offsetPathJS(coords,w/2,"left"), r=offsetPathJS(coords,w/2,"right");
  if(l.length<2||r.length<2) return [];
  return [...l, ...r.slice().reverse()];
}
const DONE_COLOUR = "#059669";   // laid — same green the rest of the app uses

// Split a drawn path at `metres` from its start, so the laid part can be drawn
// in green over the part still to do. Walks the vertices, then interpolates
// inside the segment where the distance runs out — otherwise the colour would
// only ever change at a vertex, which on a 500 m stretch is a visible lie.
function splitPathAt(g, coords, metres) {
  const pts = (coords || []).map(c => new g.maps.LatLng(c.lat, c.lng));
  if (pts.length < 2 || !(metres > 0)) return { done: [], rest: pts };
  const sph = g.maps.geometry.spherical;
  const done = [pts[0]];
  let left = metres;
  for (let i = 1; i < pts.length; i++) {
    const seg = sph.computeDistanceBetween(pts[i - 1], pts[i]);
    if (left >= seg) { done.push(pts[i]); left -= seg; continue; }
    const cut = sph.interpolate(pts[i - 1], pts[i], seg > 0 ? left / seg : 0);
    done.push(cut);
    return { done, rest: [cut, ...pts.slice(i)] };
  }
  return { done, rest: [] };   // whole line laid
}
// Ek hi code teeno shakl me aa sakta hai (culvert pin bhi, lakeer bhi,
// aayat bhi) — isliye teeno list me dhoondhte hain, kind me kaid nahi.
const alignLabel = (kind, t) =>
  ([...LINE_TYPES, ...POINT_TYPES, ...AREA_TYPES].find(x=>x.v===t)?.l) || t;
const fmtKm = (m) => Number(m||0) >= 1000
  ? (Number(m)/1000).toLocaleString("en-IN",{maximumFractionDigits:2}) + " km"
  : Math.round(Number(m||0)) + " m";
// Chainage — 1,250 m ko site par "1+250" bolte hain, metre me koi baat
// nahi karta. Mobile ke geo.js me bhi thik yahi hai.
const chFmt = (m) => {
  const v = Math.max(0, Math.round(Number(m)||0));
  return Math.floor(v/1000) + "+" + String(v%1000).padStart(3,"0");
};
// Line par chainage ke nishaan kahan-kahan padenge. startM = line ka apna
// shuruaati chainage, isliye pehla nishaan agle POORE step par aata hai
// (1+180 se shuru = pehla label 1+200).
const chainageMarks = (coords, stepM, startM, distFn) => {
  const out = [];
  if (!(stepM > 0) || !coords || coords.length < 2) return out;
  const off = Math.max(0, Number(startM)||0);
  let acc = 0, next = off > 0 ? ((Math.ceil(off/stepM)*stepM - off) || stepM) : stepM;
  for (let i=1; i<coords.length && out.length<60; i++){
    const a = coords[i-1], b = coords[i];
    const d = distFn(a, b);
    while (next <= acc + d && out.length < 60) {
      const f = d > 0 ? (next - acc) / d : 0;
      out.push({ lat: a.lat + (b.lat-a.lat)*f, lng: a.lng + (b.lng-a.lng)*f, label: chFmt(off + next) });
      next += stepM;
    }
    acc += d;
  }
  return out;
};
// Draw karte waqt har click par lambai — server wali haversine hi, client par.
// Google ka spherical bhi hai, par ye draftPts (plain objects) par seedha
// chalta hai, LatLng banane ka chakkar nahi.
function pathLenM(pts) {
  let m = 0;
  for (let i = 1; i < (pts||[]).length; i++) {
    const a = pts[i-1], b = pts[i], R = 6371000, rad = (x)=>x*Math.PI/180;
    const dLat = rad(b.lat-a.lat), dLng = rad(b.lng-a.lng);
    const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
    m += 2*R*Math.asin(Math.sqrt(h));
  }
  return m;
}

// Draw menu ki list — component ke bahar, taaki har render par dobara na
// bane. Culvert/HDD teeno section me aa sakte hain: culvert ka span ek
// lakeer hai, uska footprint ek aayat, aur uski jagah ek pin. Backend ab
// code ko shakl se nahi baandhta, isliye teeno chalte hain.
const DRAW_MENU = (custom=[]) => [
  { head: t("tenders.draw_lakeer_se"), rows: [
      ...LINE_TYPES.map(x=>({ label:x.l, c:x.c, iv:{kind:"line", atype:x.v, shape:"line"} })),
      { label:t("tenders.draw_culvert_span"), c:FAM_META.structure.c, iv:{kind:"line", atype:"culvert", shape:"line"} },
      { label:t("tenders.draw_hdd_crossing"), c:FAM_META.structure.c, iv:{kind:"line", atype:"hdd",     shape:"line"} },
      ...custom.filter(f=>f.kind==="line").map(f=>({ label:f.label, c:f.colour||FAM_META.custom.c,
        iv:{kind:"line", atype:f.code, shape:"line"} })),
  ]},
  { head: t("tenders.draw_rakba"), rows: [
      { label:t("tenders.draw_aayat_square"), c:FAM_META.structure.c, iv:{kind:"area", atype:"ugr", shape:"rect"} },
      { label:t("tenders.draw_khud_ke_kone"), c:FAM_META.structure.c, iv:{kind:"area", atype:"ugr", shape:"poly"} },
      ...custom.filter(f=>f.kind==="area").map(f=>({ label:f.label, c:f.colour||FAM_META.custom.c,
        iv:{kind:"area", atype:f.code, shape:"poly"} })),
  ]},
  { head: t("tenders.draw_pin"), rows: [
      ...POINT_TYPES.map(x=>({ label:x.l, c:FAM_META[familyOf(x.v)].c, iv:{kind:"point", atype:x.v, shape:"point"} })),
      ...custom.filter(f=>f.kind==="point").map(f=>({ label:f.label, c:f.colour||FAM_META.custom.c,
        iv:{kind:"point", atype:f.code, shape:"point"} })),
  ]},
];

function MapTab({tenderId, sites}) {
  const toast = useToast();
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY;
  const mapDiv  = useRef(null);
  const mapRef  = useRef(null);
  const shapesRef = useRef([]);      // saved alignments drawn on the map
  const draftRef  = useRef(null);    // the polyline being drawn right now
  const modeRef   = useRef(null);    // map listener reads the live mode
  // The map is created ONCE. The click handler needs the current site filter
  // and site list, but reading them from state would put them in the effect's
  // deps — and re-running it rebuilds the Map on every parent render, which
  // leaves the instance bound to a stale node and the map blank.
  const fSiteRef  = useRef("");
  const sitesRef  = useRef([]);
  // Kya mark kar rahe hain ye drawing se PEHLE tay hota hai — isliye map ka
  // click handler ise ref se padhta hai (state hota to handler purana intent
  // pakde rehta, kyunki map ek hi baar banta hai).
  const intentRef = useRef(null);
  const rectRef   = useRef(null);   // aayat ka pehla kona

  const [items, setItems]     = useState([]);
  const [summary, setSummary] = useState(null);
  const [progress, setProgress] = useState(null);   // MB ke metre, line-wise
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapErr, setMapErr]   = useState("");
  const [fSite, setFSite]     = useState("");
  // F1 — kaunse type dikhein. Khali Set = sab dikhao (default). Ratna ke
  // tender me 37 line + 10 pin hain; bina filter ke sab ek dher lagta hai.
  const [hidden, setHidden]   = useState(()=>new Set());
  const [pending, setPending] = useState(null);   // {kind, coords} — abhi drawn, save baaki
  // Box bahar click se chhup sakta hai, par kaam nahi udta — draft map par
  // rehta hai aur toolbar se wapas khulta hai.
  const [pendingHidden, setPendingHidden] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [mode, setMode]       = useState(null);   // null | "line" | "poly" | "rect" | "point"
  const [intent, setIntent]   = useState(null);   // {kind, atype, shape} — draw se pehle
  const [menuOpen, setMenuOpen] = useState(false);
  const [ftypes, setFtypes]   = useState([]);     // built-in + company ke apne item
  const [addItem, setAddItem] = useState(null);   // "Naya item jodo" ka form
  // Parivaar ka filter (pipe/naali/sadak/structure/apne item) — per-type
  // chips ke UPAR. 37 line wale tender me "sirf sadak dekhni hai" ek click.
  const [famHidden, setFamHidden] = useState(()=>new Set());
  const [draftPts, setDraftPts] = useState([]);   // line ke abhi tak ke points
  const [panel, setPanel]     = useState(null);   // stretch dashboard {loading, data}
  // "Kaam ↔ Jagah" — AI-plan ke qty-task map par kahan hain (P0: sirf sach)
  const [mapTasks, setMapTasks] = useState(null);
  // Tukdo me baanto — kaunsa kaam, server ka hisaab (preview), PM ke hisse
  const [splitFor, setSplitFor] = useState(null);
  const [splitPv, setSplitPv] = useState(null);
  const [splitW, setSplitW] = useState({});
  const [splitBusy, setSplitBusy] = useState(false);
  const [mtBucket, setMtBucket] = useState("unmapped_line");
  const [mtSearch, setMtSearch] = useState("");
  const [mtType, setMtType]     = useState("");   // kaam ka type filter (khali = sab)
  // P2 — jodne ke raaste: draw-karke (linkTask armed), picker se (pickFor),
  // KML ke baad bulk (kmlLink). linkTaskRef savePending ke closure ke liye.
  const [linkTask, setLinkTask] = useState(null);
  const linkTaskRef = useRef(null);
  const [pickFor, setPickFor] = useState(null);   // {mode:"line"|"task", row?|aid?}
  const [kmlLink, setKmlLink] = useState(null);   // {features:[{take,qty,...}], work_id}
  const [taskMark, setTaskMark] = useState(null);  // {q, wtype} — "task se mark karo" ka chunav
  const [photosOn, setPhotosOn] = useState(false);
  const [locatePhoto, setLocatePhoto] = useState(false);   // purani photo se jagah
  const [sugg, setSugg]       = useState([]);     // search ke suggestions
  const photoMarkersRef = useRef([]);
  const infoWinRef = useRef(null);
  const searchBoxRef = useRef(null);
  const suggTimerRef = useRef(null);
  const acSvcRef = useRef(null);       // Places AutocompleteService (key par ho to)
  const placesSvcRef = useRef(null);   // PlacesService — place_id se coords

  // C — stretch par click → uska dashboard. Ek hi call me sab.
  const openStretch = useCallback(async (aid) => {
    setPanel({ loading: true });
    const r = await api.get(`/tenders/${tenderId}/alignments/${aid}/summary`);
    if (!r?.success) { setPanel(null); toast.error(r?.message || "Stretch load nahi hua"); return; }
    setPanel({ loading: false, data: { ...r.data, __aid: aid } });
  }, [tenderId, toast]);

  // F — jagah ka search. Google Geocoder pehle; wo na chale (Geocoding API
  // key par enable nahi — prod par yahi nikla: har search "jagah nahi mili"
  // ban raha tha kyunki REQUEST_DENIED bhi usi message me dab jaata tha) to
  // OpenStreetMap ka Nominatim — bina kisi GCP setting ke chalta hai. Map
  // kabhi nahi tootta; dono fail hon tabhi message.
  const doSearch = useCallback((text) => {
    const g = window.google;
    if (!g || !mapRef.current || !text) return;

    const viaOSM = async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(text)}`,
          { headers: { Accept: "application/json" } });
        const j = await r.json();
        if (Array.isArray(j) && j[0]) {
          const b = j[0].boundingbox; // [latMin, latMax, lonMin, lonMax] strings
          if (b && b.length === 4) {
            mapRef.current.fitBounds(new g.maps.LatLngBounds(
              { lat: Number(b[0]), lng: Number(b[2]) }, { lat: Number(b[1]), lng: Number(b[3]) }));
          } else {
            mapRef.current.setCenter({ lat: Number(j[0].lat), lng: Number(j[0].lon) });
            mapRef.current.setZoom(16);
          }
          return true;
        }
      } catch (_) {}
      return false;
    };

    try {
      new g.maps.Geocoder().geocode({ address: text, region: "in" }, async (results, status) => {
        if (status === "OK" && results && results[0]) {
          const r = results[0];
          if (r.geometry.viewport) mapRef.current.fitBounds(r.geometry.viewport);
          else { mapRef.current.setCenter(r.geometry.location); mapRef.current.setZoom(16); }
          return;
        }
        // ZERO_RESULTS par bhi OSM try karo — naam ke hijje wahan aksar mil
        // jaate hain (sector/colony ke desi naam OSM me achhe hain).
        if (!(await viaOSM())) toast.error("Jagah nahi mili — naam thoda badal kar likho");
      });
    } catch (e) {
      viaOSM().then((ok) => { if (!ok) toast.error("Jagah nahi mili — naam thoda badal kar likho"); });
    }
  }, [toast]);

  // Suggestions — Google-type dropdown. Places key par ho to Google se
  // (mantralaya jaise naam wahi jaanta hai), warna OSM se (sector/colony ke
  // liye kaafi). Nominatim ki 1-req/sec policy ke liye debounce zaroori hai.
  const fetchSugg = useCallback((text) => {
    if (suggTimerRef.current) clearTimeout(suggTimerRef.current);
    if (!text || text.trim().length < 3) { setSugg([]); return; }
    suggTimerRef.current = setTimeout(() => {
      const q = text.trim();
      const viaOSMSugg = async () => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(q)}`,
            { headers: { Accept: "application/json" } });
          const j = await r.json();
          setSugg((Array.isArray(j) ? j : []).map((x) => ({
            label: x.display_name, lat: Number(x.lat), lng: Number(x.lon), bbox: x.boundingbox })));
        } catch (_) { setSugg([]); }
      };
      const ac = acSvcRef.current;
      if (ac) {
        try {
          const opts = { input: q, componentRestrictions: { country: "in" } };
          try { const b = mapRef.current && mapRef.current.getBounds(); if (b) opts.bounds = b; } catch (_) {}
          ac.getPlacePredictions(opts, (preds, status) => {
            if (status === "OK" && preds && preds.length) {
              setSugg(preds.slice(0, 5).map((p) => ({ label: p.description, place_id: p.place_id })));
            } else viaOSMSugg();
          });
          return;
        } catch (_) {}
      }
      viaOSMSugg();
    }, 450);
  }, []);

  const pickSugg = useCallback((s) => {
    setSugg([]);
    if (searchBoxRef.current) searchBoxRef.current.value = s.label;
    const g = window.google;
    if (s.place_id && placesSvcRef.current && g) {
      // Places se hi coords — iske liye Geocoding API ki zaroorat NAHI.
      placesSvcRef.current.getDetails({ placeId: s.place_id, fields: ["geometry"] }, (res, st) => {
        if (st === "OK" && res && res.geometry) {
          if (res.geometry.viewport) mapRef.current.fitBounds(res.geometry.viewport);
          else { mapRef.current.setCenter(res.geometry.location); mapRef.current.setZoom(16); }
        } else doSearch(s.label);
      });
      return;
    }
    if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
      if (s.bbox && s.bbox.length === 4 && g) {
        mapRef.current.fitBounds(new g.maps.LatLngBounds(
          { lat: Number(s.bbox[0]), lng: Number(s.bbox[2]) }, { lat: Number(s.bbox[1]), lng: Number(s.bbox[3]) }));
      } else { mapRef.current.setCenter({ lat: s.lat, lng: s.lng }); mapRef.current.setZoom(16); }
      return;
    }
    doSearch(s.label);
  }, [doSearch]);

  // E — photo layer: geo wali photos map par, hover par popup.
  useEffect(() => {
    const g = window.google;
    photoMarkersRef.current.forEach(m => m.setMap(null));
    photoMarkersRef.current = [];
    if (!photosOn || !mapReady || !g || !mapRef.current) return;
    let dead = false;
    (async () => {
      const r = await api.get(`/tenders/${tenderId}/photo-markers${fSite?`?project_id=${fSite}`:""}`);
      if (dead || !r?.success) return;
      if (!infoWinRef.current) infoWinRef.current = new g.maps.InfoWindow({ disableAutoPan: true });
      const iw = infoWinRef.current;
      for (const p of (r.data || [])) {
        const mk = new g.maps.Marker({
          position: { lat: Number(p.lat), lng: Number(p.lng) }, map: mapRef.current,
          zIndex: 5,
          icon: { path: g.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#7C3AED",
            fillOpacity: 0.95, strokeColor: "#fff", strokeWeight: 2 },
        });
        // Google-photos jaisa: pointer le jaao, tasveer khul jaye.
        mk.addListener("mouseover", () => {
          iw.setContent(
            `<div style="max-width:170px;font-family:inherit">
               <img src="${thumb(p.url).replace(/w_120,h_120/, "w_320,h_200")}" style="width:160px;height:100px;object-fit:cover;border-radius:6px;display:block"/>
               <div style="font-size:11px;margin-top:4px;color:#334155">${(p.task_name||"").slice(0,40)}</div>
               <div style="font-size:10px;color:#94A3B8">${p.taken_on ? String(p.taken_on).slice(0,10) : ""}</div>
             </div>`);
          iw.open({ map: mapRef.current, anchor: mk });
        });
        mk.addListener("mouseout", () => iw.close());
        mk.addListener("click", () => window.open(p.url, "_blank", "noreferrer"));
        photoMarkersRef.current.push(mk);
      }
    })();
    return () => { dead = true; };
  }, [photosOn, mapReady, tenderId, fSite]);

  useEffect(()=>{ fSiteRef.current = fSite; }, [fSite]);
  useEffect(()=>{ sitesRef.current = sites; }, [sites]);

  const load = useCallback(async () => {
    const siteId = fSite || (sitesRef.current.length === 1 ? sitesRef.current[0].id : "");
    const [a, s, pr, mt] = await Promise.all([
      api.get(`/tenders/${tenderId}/alignments${fSite?`?project_id=${fSite}`:""}`),
      api.get(`/tenders/${tenderId}/alignments-summary`),
      api.get(`/tenders/${tenderId}/alignments-progress`),
      siteId ? api.get(`/tenders/by-project/${siteId}/map-tasks`) : Promise.resolve(null),
    ]);
    setLoading(false);
    if (a?.success) setItems(Array.isArray(a.data)?a.data:[]);
    else toast.error(a?.message || "Alignment load nahi hua");
    if (s?.success) setSummary(s.data);
    if (pr?.success) setProgress(pr.data);
    setMapTasks(mt?.success ? mt.data : null);
  }, [tenderId, fSite, toast]);
  useEffect(()=>{ load(); }, [load]);

  // Boot the map once; the overlay redraw effect below keeps it in sync.
  useEffect(()=>{
    if (!apiKey) { setMapErr("REACT_APP_GOOGLE_MAPS_KEY set nahi hai — map nahi dikhega."); return; }
    let dead = false;
    loadGoogleMaps(apiKey).then((g)=>{
      if (dead || !mapDiv.current) return;
      mapRef.current = new g.maps.Map(mapDiv.current, {
        center: {lat:21.19, lng:81.28},        // Chhattisgarh — pehli baar ka default
        zoom: 12, mapTypeId: "hybrid",          // satellite + labels: gali dikhti hai
        streetViewControl: false, fullscreenControl: true,
      });
      // Our own drawing: click the map to drop vertices. Google removed
      // DrawingManager in Maps JS 3.65, and doing it by hand also lets the
      // buttons speak the same Hinglish as the rest of the screen.
      mapRef.current.addListener("click", (e)=>{
        const m = modeRef.current;
        if (!m) return;
        const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        const iv = intentRef.current || { kind:"line", atype:"rising" };
        const site = fSiteRef.current || (sitesRef.current.length===1 ? sitesRef.current[0].id : "");
        if (m === "point") {
          modeRef.current = null; setMode(null); setIntent(null);
          setPendingHidden(false);
          setPending({ kind:"point", coords:[pt], name:"", atype: iv.atype || "ugr", props:{}, project_id: site });
          return;
        }
        // Aayat / square — do click me ho jaati hai: pehla ek kona, doosra
        // saamne wala. Shift dabaye rakho to bhujaayein barabar (square).
        // Barabari METRE me naapi jaati hai, degree me nahi — warna 21°N par
        // "square" 7% chaudi nikalti.
        if (m === "rect") {
          if (!rectRef.current) { rectRef.current = pt; setDraftPts([pt]); return; }
          const a = rectRef.current;
          let dLat = pt.lat - a.lat, dLng = pt.lng - a.lng;
          if (e.domEvent && e.domEvent.shiftKey) {
            const kLng = Math.cos(a.lat*Math.PI/180) || 1;
            const side = Math.max(Math.abs(dLat)*111320, Math.abs(dLng)*111320*kLng);
            dLat = (dLat < 0 ? -1 : 1) * side/111320;
            dLng = (dLng < 0 ? -1 : 1) * side/(111320*kLng);
          }
          const corners = [a, {lat:a.lat, lng:a.lng+dLng},
                              {lat:a.lat+dLat, lng:a.lng+dLng}, {lat:a.lat+dLat, lng:a.lng}];
          rectRef.current = null;
          modeRef.current = null; setMode(null); setIntent(null); setDraftPts([]);
          setPendingHidden(false);
          setPending({ kind:"area", coords:corners, name:"", atype: iv.atype || "ugr", props:{}, project_id: site });
          return;
        }
        // Read the CURRENT path off the overlay, not from React state: the
        // line is editable, so a dragged vertex lives only on the overlay.
        // Appending to stale state used to snap corrected points back to
        // where they were first clicked.
        const live = draftRef.current
          ? draftRef.current.getPath().getArray().map(p=>({lat:p.lat(), lng:p.lng()}))
          : [];
        const next = [...live, pt];
        if (!draftRef.current) {
          // Polygon aur Polyline dono ka getPath() ek jaisa hai, isliye
          // aage ka saara code (drag, undo, finish) bina badle chalta hai.
          const o = { path: next, strokeColor:"#DC2626", strokeWeight:4,
            strokeOpacity:0.95, editable:true, map: mapRef.current };
          draftRef.current = m === "poly"
            ? new g.maps.Polygon({ ...o, fillColor:"#DC2626", fillOpacity:0.16 })
            : new g.maps.Polyline(o);
          // Keep the point counter honest when the user drags or right-click
          // deletes a vertex — the overlay stays the single source of truth.
          const sync = () => {
            const p = draftRef.current ? draftRef.current.getPath().getArray() : [];
            setDraftPts(p.map(x=>({lat:x.lat(), lng:x.lng()})));
          };
          const path = draftRef.current.getPath();
          ["insert_at","set_at","remove_at"].forEach(ev=>g.maps.event.addListener(path, ev, sync));
        } else {
          draftRef.current.setPath(next);
        }
        setDraftPts(next);
      });
      // Places available ho (key par enable) to Google-type suggestions;
      // constructor hi phat jaye to chup-chaap OSM par (dono try/catch me).
      try {
        if (g.maps.places) {
          acSvcRef.current = new g.maps.places.AutocompleteService();
          placesSvcRef.current = new g.maps.places.PlacesService(mapRef.current);
        }
      } catch (_) {}
      setMapReady(true);
    }).catch(e=>{ if (!dead) setMapErr(e.message || "Map load nahi hua"); });
    return ()=>{ dead = true; };
  }, [apiKey]);

  // Render saved alignments; refit the viewport so a fresh tender isn't
  // left staring at the default centre.
  useEffect(()=>{
    const g = window.google;
    if (!mapReady || !g || !mapRef.current) return;
    shapesRef.current.forEach(s=>s.setMap(null));
    shapesRef.current = [];
    const bounds = new g.maps.LatLngBounds();
    let any = false;
    const progByLine = {};
    (progress?.lines || []).forEach(l => { progByLine[l.id] = l; });

    for (const it of items) {
      const coords = it.geometry || [];
      if (!coords.length) continue;
      // F1 — chhupa hua type map par bhi nahi aata (aur bounds me bhi nahi,
      // taaki "sirf drain" chunne par map unhi par zoom ho jaye).
      if (famHidden.has(familyOf(it.atype))) continue;
      if (hidden.has(it.kind === "line" ? it.atype : it.kind === "area" ? "__areas" : "__pins")) continue;
      any = true;
      // Rakba — apne rang ka polygon. Click par wahi stretch-dashboard jo
      // line par khulta hai, taaki UGR ka panel bhi ek hi tareeke se khule.
      if (it.kind === "area") {
        const c = lineColour(it.atype);
        const pg = new g.maps.Polygon({ paths: coords, strokeColor: c, strokeWeight: 2,
          strokeOpacity: 0.9, fillColor: c, fillOpacity: 0.22, map: mapRef.current });
        pg.addListener("click", ()=>openStretch(it.id));
        shapesRef.current.push(pg);
        coords.forEach(x=>bounds.extend(x));
        continue;
      }
      if (it.kind === "line") {
        // Whole line in its type colour, then the laid part painted green on
        // top — so "kitna baaki" is the part that still has its own colour.
        const pr = progByLine[it.id] || {};
        const doneM = Number(pr.done_m ?? 0);
        const taskM = Number(pr.task_m ?? 0);
        // Chaudai pata ho to sadak ka ASLI footprint bhi — patli lakeer 10 m
        // ki ROW ka ehsaas nahi deti, aur naali kahan padegi ye bhi tabhi
        // samajh aata hai. Zoom badalne par apne aap sahi naapti hai kyunki
        // ye asli lat/lng ki aakriti hai, pixel ki moti lakeer nahi.
        if (Number(it.width_m) > 0) {
          const foot = corridorJS(coords, Number(it.width_m));
          if (foot.length >= 3) {
            const poly = new g.maps.Polygon({ paths: foot, strokeColor: lineColour(it.atype),
              strokeOpacity: 0.35, strokeWeight: 1, fillColor: lineColour(it.atype),
              fillOpacity: 0.14, clickable: false, map: mapRef.current });
            shapesRef.current.push(poly);
          }
        }
        const pl = new g.maps.Polyline({ path: coords, strokeColor: lineColour(it.atype),
          strokeWeight: 4, strokeOpacity: 0.9, map: mapRef.current });
        // Click = stretch ka dashboard. (Pehle sirf ek toast tha.)
        pl.addListener("click", ()=>openStretch(it.id));
        shapesRef.current.push(pl);
        // Chainage ke nishaan — sirf un lines par jinka shuruaati chainage
        // pata hai. Step lambai ke hisaab se, warna 20 km ki line par
        // hazaar label ban kar naksha dhak jaata.
        if (it.start_chainage_m != null) {
          const L = Number(it.length_m || 0);
          const step = L >= 5000 ? 1000 : L >= 2000 ? 500 : L >= 400 ? 100 : L >= 100 ? 50 : 0;
          chainageMarks(coords, step, Number(it.start_chainage_m), (a,b)=>pathLenM([a,b])).forEach((c)=>{
            shapesRef.current.push(new g.maps.Marker({
              map: mapRef.current, position: { lat:c.lat, lng:c.lng }, clickable:false, zIndex:6,
              label: { text: c.label, color:"#0369A1", fontSize:"10px", fontWeight:"700" },
              icon: { path: g.maps.SymbolPath.CIRCLE, scale:2.5, fillColor:"#7DD3FC", fillOpacity:0.95,
                strokeColor:"#0369A1", strokeWeight:1 },
            }));
          });
        }
        if (g.maps.geometry?.spherical) {
          // Pakka (MB) — solid green.
          if (doneM > 0) {
            const { done } = splitPathAt(g, coords, doneM);
            if (done.length >= 2) {
              const dl = new g.maps.Polyline({ path: done, strokeColor: DONE_COLOUR,
                strokeWeight: 6, strokeOpacity: 0.95, zIndex: 2, map: mapRef.current });
              dl.addListener("click", ()=>openStretch(it.id));
              shapesRef.current.push(dl);
            }
          }
          // Kachcha (task par likha, MB se aage) — dotted green. Do sach
          // alag-alag: bill jitna solid, site ki taaza khabar jitni dotted.
          if (taskM > doneM) {
            const { done: uptoTask } = splitPathAt(g, coords, taskM);
            const { rest: kachchaSeg } = splitPathAt(g, uptoTask.map(p=>({lat:p.lat(), lng:p.lng()})), doneM);
            if (kachchaSeg.length >= 2) {
              const kl = new g.maps.Polyline({ path: kachchaSeg, strokeOpacity: 0, zIndex: 2,
                icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, strokeColor: DONE_COLOUR, scale: 3 },
                  offset: "0", repeat: "14px" }],
                map: mapRef.current });
              kl.addListener("click", ()=>openStretch(it.id));
              shapesRef.current.push(kl);
            }
          }
        }
        coords.forEach(c=>bounds.extend(c));
      } else {
        const mk = new g.maps.Marker({ position: coords[0], map: mapRef.current, title: it.name,
          label: { text: (alignLabel("point", it.atype)||"?").slice(0,1), color:"#fff", fontSize:"11px", fontWeight:"700" } });
        shapesRef.current.push(mk);
        bounds.extend(coords[0]);
      }
    }
    if (any) mapRef.current.fitBounds(bounds);
  }, [items, progress, mapReady, toast, openStretch, hidden, famHidden]);

  // ── Drawing controls ──────────────────────────────────────────
  // Pending ko poora hataana = box band + map se lakeer bhi gayab. Pehle
  // sirf box band hota tha aur laal lakeer atki reh jaati thi.
  const dropPending = useCallback(()=>{
    setPending(null); setPendingHidden(false);
    if (draftRef.current) { draftRef.current.setMap(null); draftRef.current = null; }
    rectRef.current = null;
    setDraftPts([]);
  }, []);
  const clearDraft = useCallback(()=>{
    if (draftRef.current) { draftRef.current.setMap(null); draftRef.current = null; }
    rectRef.current = null;
    setDraftPts([]);
  }, []);
  // Kya mark karna hai ye PEHLE chunte hain, phir kheenchte hain — pehle
  // ulta tha (lakeer kheencho, phir type poochho). Intent pehle hone se
  // form me sirf usi type ke field aate hain aur "aayat" jaisi shakl mumkin
  // hoti hai, jo baad me type poochh kar nahi ho sakti thi.
  const startDraw = (iv) => {
    clearDraft();
    intentRef.current = iv; setIntent(iv);
    modeRef.current = iv.shape; setMode(iv.shape);
    setMenuOpen(false);
    if (mapRef.current) mapRef.current.setOptions({ draggableCursor: "crosshair" });
  };
  const stopMode = useCallback(()=>{
    modeRef.current = null; setMode(null);
    intentRef.current = null; setIntent(null);
    linkTaskRef.current = null; setLinkTask(null);
    rectRef.current = null;
    if (mapRef.current) mapRef.current.setOptions({ draggableCursor: null });
  }, []);
  const undoPoint = () => {
    // Same rule as adding: the overlay holds the truth, including drags.
    const live = draftRef.current
      ? draftRef.current.getPath().getArray().map(p=>({lat:p.lat(), lng:p.lng()}))
      : draftPts;
    const next = live.slice(0, -1);
    if (draftRef.current) {
      if (next.length) draftRef.current.setPath(next);
      else { draftRef.current.setMap(null); draftRef.current = null; }
    }
    setDraftPts(next);
  };
  const finishDraw = () => {
    // The user may have dragged vertices after placing them, so take the
    // path off the overlay itself rather than the click history.
    const live = draftRef.current
      ? draftRef.current.getPath().getArray().map(p=>({lat:p.lat(), lng:p.lng()}))
      : draftPts;
    const iv = intentRef.current || { kind:"line", atype:"rising" };
    const need = iv.kind === "area" ? 3 : 2;
    if (live.length < need) {
      toast.error(need === 3 ? t("tenders.rakbe_ke_liye_3_kone")
                             : t("tenders.line_ke_liye_2_point"));
      return;
    }
    stopMode();
    setPendingHidden(false);
    setPending({ kind: iv.kind, coords: live, name:"", atype: iv.atype, props:{},
      center_pin: !!iv.centerPin,
      project_id: fSite || (sites.length===1 ? sites[0].id : "") });
  };
  // Leaving the tab mid-draw should not leave an overlay stuck on the map.
  useEffect(()=>()=>{ if (draftRef.current) draftRef.current.setMap(null); }, []);

  // Company ke apne item — ek baar banao, har tender me milte hain.
  const loadFtypes = useCallback(async ()=>{
    const r = await api.get(`/tenders/alignments/feature-types`);
    if (r?.success) setFtypes(r.data || []);
  }, []);
  useEffect(()=>{ loadFtypes(); }, [loadFtypes]);
  const customTypes = ftypes.filter(f=>!f.builtin);
  // Har shakl ke liye type ki list = built-in + company ke apne.
  // Type ki list parivaar-wise — Sadak / Pipeline (Inlet, Outlet, Rising,
  // Gravity) / Naali / Structure / apne item. Flat list me inlet-outlet
  // sadak ke bagal dabe rehte the aur samajh nahi aata tha kya kiska hai.
  // Aakhir me "+ Naya item jodo…" — wahi custom-type modal jo draw-menu me hai.
  const NEW_TYPE = "__new__";
  const typeOpts = (kind) => {
    const base = (kind==="line" ? LINE_TYPES : kind==="area" ? AREA_TYPES : POINT_TYPES)
      .filter(x=>x.v!=="other")
      .map(x=>({v:x.v, l:x.l, group:FAM_META[familyOf(x.v)].l}));
    const custom = customTypes.filter(f=>f.kind===kind)
      .map(f=>({v:f.code, l:f.label, group:FAM_META.custom.l}));
    return [...base, ...custom,
      {v:"other", l:t("common.other"), group:FAM_META.other.l},
      {v:NEW_TYPE, l:"+ " + t("tenders.naya_item_jodo_dots"), group:FAM_META.custom.l}];
  };
  const typeLabel = (a) => customTypes.find(f=>f.code===a)?.label || alignLabel(null, a);

  const saveItem = async () => {
    const label = String(addItem?.label || "").trim();
    if (!label) { toast.error(t("tenders.item_ka_naam_likho")); return; }
    setBusy(true);
    const r = await api.post(`/tenders/alignments/feature-types`,
      { label, kind: addItem.kind || "line", colour: addItem.colour || undefined });
    setBusy(false);
    if (!r?.success) { toast.error(r?.message || t("tenders.item_nahi_bana")); return; }
    toast.success(t("tenders.item_jud_gaya", { label }));
    setAddItem(null);
    await loadFtypes();
    startDraw({ kind: r.data.kind, atype: r.data.code,
      shape: r.data.kind === "point" ? "point" : r.data.kind === "area" ? "poly" : "line" });
  };
  const delItem = async (f) => {
    if (!await window.confirmAsync(t("tenders.item_hata_dein", { label: f.label }))) return;
    const r = await api.del(`/tenders/alignments/feature-types/${f.id}`);
    if (!r?.success) { toast.error(r?.message || t("tenders.item_hat_nahi_paaya")); return; }
    toast.success("Hat gaya"); loadFtypes();
  };

  // Form me har number TYPED STRING ki tarah rehta hai (warna aadha-likha
  // ".6" us waqt NaN ban jaata hai jab user ne abhi likhna shuru hi kiya ho,
  // aur input dobara theek nahi hota). Number banane ki ek hi jagah — yahan.
  const cleanPropsOut = (p) => {
    if (!p) return undefined;
    const out = {};
    for (const [k, v] of Object.entries(p)) {
      if (v === undefined || v === null) continue;
      if (typeof v === "string") {
        const s2 = v.trim();
        if (!s2) continue;                                  // khaali khaana = bheja hi nahi
        out[k] = /^-?\d*\.?\d+$/.test(s2) ? Number(s2) : s2;
      } else out[k] = v;
    }
    return Object.keys(out).length ? out : undefined;
  };

  // Draw ho chuki cheez ko badalne ke liye wahi form kholte hain, sirf mode
  // alag. Geometry yahan nahi chhedi jaati — wo map par dobara kheenchne ka
  // kaam hai; yahan naam, type, chaudai aur type ke apne field badalte hain.
  const startEdit = (it) => { setPendingHidden(false); return setPending({
    edit: true, id: it.id, kind: it.kind, atype: it.atype,
    coords: it.geometry || [], name: it.name || "",
    width_m: it.width_m == null ? "" : String(it.width_m),
    start_chainage_m: it.start_chainage_m == null ? "" : String(it.start_chainage_m),
    props: it.props ? { ...it.props } : {},
    notes: it.notes || "",
    project_id: it.project_id || "",
    length_m: it.length_m, area_sqm: it.area_sqm,
  }); };

  const saveEdit = async () => {
    setBusy(true);
    const res = await api.put(`/tenders/${tenderId}/alignments/${pending.id}`, {
      project_id: pending.project_id ? Number(pending.project_id) : null,
      name: pending.name || "",
      atype: pending.atype,
      width_m: pending.width_m === "" || pending.width_m == null ? null : Number(pending.width_m),
      start_chainage_m: pending.start_chainage_m === "" || pending.start_chainage_m == null
        ? null : Number(pending.start_chainage_m),
      props: cleanPropsOut(pending.props) || {},
      notes: pending.notes || "",
    });
    setBusy(false);
    if (!res?.success) { toast.error(res?.message || t("tenders.badlav_nahi_hua")); return; }
    toast.success(t("tenders.badlav_save_hua"));
    setPending(null); load();
  };

  const savePending = async () => {
    if (!pending) return;
    if (pending.edit) return saveEdit();
    if (!pending.project_id) { toast.error("Site chuno — kis site ki line hai"); return; }
    setBusy(true);
    const res = await api.post(`/tenders/${tenderId}/alignments`, {
      project_id: Number(pending.project_id), name: pending.name || undefined,
      kind: pending.kind, atype: pending.atype, geometry: pending.coords,
      width_m: Number(pending.width_m) > 0 ? Number(pending.width_m) : undefined,
      start_chainage_m: pending.kind === "line" && Number(pending.start_chainage_m) > 0
        ? Number(pending.start_chainage_m) : undefined,
      drain_side: pending.drain_side || undefined,
      drain_offset_m: pending.drain_side && pending.drain_offset_m !== "" && pending.drain_offset_m != null
        ? Number(pending.drain_offset_m) : undefined,
      center_pin: pending.kind === "area" && pending.center_pin ? true : undefined,
      // Type ke apne field. Bemani value server chup-chaap gira deta hai —
      // drawing kisi ek galat khaane ki wajah se kabhi nahi khoti.
      props: cleanPropsOut(pending.props),
    });
    setBusy(false);
    if (!res?.success) { toast.error(res?.message || "Save nahi hua"); return; }
    toast.success(res.message || (
      pending.kind === "line" ? `Line save hui — ${fmtKm(res.data.length_m)}`
      : pending.kind === "area" ? t("tenders.rakba_save_hua", { area: fmtArea(res.data.area_sqm) })
      : "Point save hua"));
    // "Map par mark karo" se aaye the? — nayi jagah ko usi task se jod do.
    const armed = linkTaskRef.current;
    if (armed && res.data && res.data.id) {
      linkTaskRef.current = null; setLinkTask(null);
      await doLink(armed, res.data.id);
    }
    setPending(null); clearDraft(); load();
  };

  const del = async (it) => {
    if (!await window.confirmAsync(t("tenders.name_hataayein", { name: it.name }))) return;
    const res = await api.del(`/tenders/${tenderId}/alignments/${it.id}`);
    if (!res?.success) { toast.error(res?.message || "Delete nahi hua"); return; }
    toast.success("Hat gaya"); load();
  };

  // Task ↔ line jodna — farak dikhe to poochh kar map wali lambai likh do
  // (Prafull ka niyam: qty alag ho to map se sudhar).
  // ── Tukdo me baanto ──
  // Server hisaab karta hai (dry_run): har parat ki BOQ qty tukdon me napi
  // lambai ke anupaat me, jod theek BOQ. PM "hissa" badle to usi anupaat
  // me dobara — BOQ se zyada kabhi nahi banta; map ka farak MB me dikhega.
  const splitBody = (pv, w) => {
    const st = (pv?.stretches || []).map((s) => {
      const x = Number(w?.[s.alignment_id]);
      return { alignment_id: s.alignment_id, weight: Number.isFinite(x) && x > 0 ? x : undefined };
    });
    return st.length ? { stretches: st } : {};
  };
  const previewSplit = async (row, w, pvNow) => {
    setSplitBusy(true);
    const r = await api.post(`/tasks/${row.task_id}/stretch-split`, { dry_run: true, ...splitBody(pvNow, w) });
    setSplitBusy(false);
    if (!r?.success) { toast.error(r?.message || t("tenders.hisaab_nahi_hua")); if (!pvNow) setSplitFor(null); return; }
    setSplitPv(r.data.preview);
  };
  const openSplit = (row) => { setSplitFor(row); setSplitPv(null); setSplitW({}); previewSplit(row, {}, null); };
  const applySplitNow = async () => {
    if (!splitFor || !splitPv || splitBusy) return;
    setSplitBusy(true);
    const r = await api.post(`/tasks/${splitFor.task_id}/stretch-split`, splitBody(splitPv, splitW));
    setSplitBusy(false);
    if (!r?.success) { toast.error(r?.message || t("tenders.tukde_nahi_bane")); return; }
    toast.success(t("tenders.tukde_ban_gaye", { n: (r.data?.tukde || []).length, name: splitFor.name }));
    setSplitFor(null); setSplitPv(null);
    load();
  };

  const doLink = async (row, alignmentId) => {
    const r = await api.post(`/tasks/${row.task_id}/map-link`, { alignment_id: alignmentId });
    if (!r?.success) { toast.error(r?.message || "Jud nahi paya"); return false; }
    const d = r.data;
    if (d.farak != null && Math.abs(d.farak) > 0.5) {
      const okSync = await window.confirmAsync(
        `Map ki lambai ${d.line_len} m hai, plan me ${d.plan_qty} ${row.unit || ""} likha hai (farak ${d.farak > 0 ? "+" : ""}${d.farak}).\n\nMap wali lambai task me likh du?`);
      if (okSync) await api.post(`/tasks/${row.task_id}/map-link`, { alignment_id: alignmentId, sync_qty: true });
    }
    toast.success(`"${row.name}" jud gaya`);
    load();
    return true;
  };
  // shape: "line" | "area" | "point" — structure/anya par user chunta hai
  // (chhota rakba ho to chaaro taraf line, bahut chhota ho to sirf pin).
  const armMark = (row, shape) => {
    const isLine = /rmt|^m$|^rm$|mtr|meter|metre|rft|^ft$/i.test(String(row.unit || ""));
    const sh = shape || (isLine ? "line" : "point");
    const iv = sh === "line" ? { kind: "line", atype: "other", shape: "line" }
      : (sh === "area" || sh === "both") ? { kind: "area", atype: "other", shape: "poly", centerPin: sh === "both" }
      : { kind: "point", atype: "other", shape: "point" };
    linkTaskRef.current = row; setLinkTask(row);
    startDraw(iv);
    toast.success(sh === "both"
      ? `"${row.name}" ke chaaro taraf ghumao — rakba banega aur beech me pin bhi`
      : sh === "area"
      ? `"${row.name}" ke chaaro taraf point-by-point line banao — band karte hi jud jayega`
      : `Ab map par "${row.name}" ki jagah banao — save par khud jud jayegi`);
  };
  const unNa = async (row, na) => {
    const r = await api.put(`/tasks/${row.task_id}`, { map_na: na ? 1 : 0 });
    if (r?.success) { toast.success(na ? "Map se alag rakha" : "Wapas list me"); load(); }
    else toast.error(r?.message || "Nahi hua");
  };

  const importKml = async (file) => {
    if (!file) return;
    if (!fSite && sites.length !== 1) { toast.error("Pehle upar se site chuno — KML usi site me jayegi"); return; }
    const text = await file.text().catch(()=>null);
    if (!text) { toast.error("File padhi nahi gayi"); return; }
    setBusy(true);
    const res = await api.post(`/tenders/${tenderId}/alignments/import-kml`, {
      project_id: Number(fSite || sites[0].id), file_name: file.name, kml: text,
    });
    setBusy(false);
    if (!res?.success) { toast.error(res?.message || "Import nahi hua"); return; }
    // Server wahi jagah dobara nahi banata — kitni chhooti, wo saaf batao,
    // warna "import ho gaya" padh kar user samajhta hai sab chadh gaya.
    const dup = Number(res.data.skipped_duplicates) || 0;
    if (!res.data.lines && !res.data.points && dup) {
      toast.success(`Ye ${dup} jagah pehle se map par hai — dobara nahi banayi`);
    } else {
      toast.success(`${res.data.lines} line + ${res.data.points} point import huye · ${fmtKm(res.data.total_length_m)}`
        + (dup ? ` · ${dup} pehle se thi` : ""));
    }
    // Nayi lines ko seedha kaam se jodne ka raasta — Prafull ka KML flow.
    const newLines = (res.data.features || []).filter((f) => f.kind === "line");
    if (newLines.length && (mapTasks?.works || []).length) {
      setKmlLink({ features: newLines.map((f) => ({ ...f, take: true, qty: f.length_m })),
        work_id: mapTasks.works[0].task_id });
    }
    load();
  };

  const drawnVsBoq = summary && summary.boq_running_qty > 0
    ? summary.total_length_m - summary.boq_running_qty : null;

  return (<>
    <Panel style={{marginBottom:11}}>
      <PHead title={t("tenders.pipeline_map")} sub={items.length ? `${items.length} alignment` : t("tenders.line_draw_karo_ya_kml_import")}
        action={<div style={{display:"flex", gap:8, alignItems:"center"}}>
          <div style={{minWidth:170}}>
            <SelIn value={fSite} onChange={setFSite} ph={t("tenders.saari_sites")} options={sites.map(s=>({v:s.id, l:s.name}))}/>
          </div>
          <label style={{display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:7,
            border:`1px solid ${T.b1}`, background:T.surface, fontSize:12, color:T.t2, cursor:"pointer", whiteSpace:"nowrap"}}>
            <IcUpload size={13}/> {t("tenders.kml_import")}
            <input type="file" accept=".kml,application/vnd.google-earth.kml+xml" style={{display:"none"}}
              onChange={e=>{ importKml(e.target.files?.[0]); e.target.value=""; }}/>
          </label>
          {items.length > 0 && (
            <button onClick={async ()=>{
              // Authed download — export me wahi site-filter jo screen par hai
              // (wahi niyam jo reports ke exports par hai: jo dikh raha wahi jaata hai).
              try {
                const res = await fetch(`${API_BASE}/tenders/${tenderId}/alignments/export-kml${fSite ? `?project_id=${fSite}` : ""}`,
                  { headers: { Authorization: `Bearer ${getToken()}` } });
                if (!res.ok) throw new Error(`KML nahi bana (${res.status})`);
                const blob = await res.blob();
                const cd = res.headers.get("Content-Disposition") || "";
                const fn = (cd.match(/filename="([^"]+)"/) || [])[1] || "map.kml";
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove();
                setTimeout(()=>URL.revokeObjectURL(url), 4000);
              } catch (e) { toast.error(e.message || t("tenders.kml_download_nahi_hua")); }
            }} style={{display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:7,
              border:`1px solid ${T.b1}`, background:T.surface, fontSize:12, color:T.t2, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"inherit"}}>
              ⬇ {t("tenders.kml_download")}
            </button>
          )}
        </div>}/>

      {/* Sanity strip — drawn vs what the BOQ tendered */}
      {summary && (
        // Pehle ye paanch alag-alag dabbe the aur uske bagal me do lambi
        // chetavni — teen line ghere leti thi aur map ke liye jagah kha jaati
        // thi. Ab ek hi patti: ankde bade par tang, chetavni neeche ek line me.
        <div style={{padding:"9px 14px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB}}>
          <div style={{display:"flex", gap:0, flexWrap:"wrap", alignItems:"baseline"}}>
            {[["Drawn", fmtKm(summary.total_length_m), T.ind],
              ...(progress ? [["Ho gaya (MB se)", `${fmtKm(progress.total_done_m)} · ${progress.total_pct}%`, T.grn]] : []),
              ["Structures", String(summary.total_points), T.blu],
              // Rakba tabhi dikhao jab koi polygon ho — warna khaali "0 m²"
              // patti me jagah khaa jata hai.
              ...(summary.total_area_sqm > 0 ? [["Rakba", fmtArea(summary.total_area_sqm), "#4338CA"]] : []),
              ["BOQ (RMT)", summary.boq_running_qty ? fmtKm(summary.boq_running_qty) : "—", T.t2],
              ...(drawnVsBoq !== null ? [["Farak", (drawnVsBoq>0?"+":"") + fmtKm(Math.abs(drawnVsBoq)),
                Math.abs(drawnVsBoq) > Math.max(500, summary.boq_running_qty*0.05) ? T.amb : T.grn]] : []),
            ].map(([l,v,c],i)=>(
              <div key={i} style={{display:"flex", alignItems:"baseline", gap:6, padding:"0 14px",
                borderLeft: i ? `1px solid ${T.b1}` : "none"}}>
                <span style={{fontSize:15, fontWeight:800, color:c, fontVariantNumeric:"tabular-nums"}}>{v}</span>
                <span style={{fontSize:10.5, color:T.t4}}>{l}</span>
              </div>
            ))}
          </div>
          {/* Ankda kahan se aaya — chupaya kuch nahi. Package na bane hon to
              saaf kaho ki har metre-wala item gina ja raha hai (wahi galti
              jisse 54.82 km dikha tha jabki pipeline 20.53 km thi). */}
          {summary.boq_running_qty > 0 && (
            <div style={{marginTop:5, fontSize:10.5, color:T.t4}}>
              {summary.boq_from_packages
                ? <>{t("tenders.boq_ka_ankda_boq_counted_items", { boq_counted_items: summary.boq_counted_items, fmtKm: fmtKm(summary.boq_other_qty), boq_other_items: summary.boq_other_items })}</>
                : <>{t("tenders.packages_nahi_bane_abhi_har_metre")}</>}
            </div>
          )}
          {(() => {
            const w = [];
            if (drawnVsBoq !== null && Math.abs(drawnVsBoq) > Math.max(500, summary.boq_running_qty*0.05))
              w.push(summary.boq_from_packages
                ? "Drawn aur BOQ me farak hai — alignment adhoori ho sakti hai."
                : "Drawn aur BOQ me farak hai — alignment adhoori ho sakti hai (ya BOQ me non-pipeline RMT items hain).");
            if (progress?.unmapped_m)
              w.push(`MB me ${fmtKm(progress.unmapped_m)} aisa kaam hai jiske liye line draw hi nahi hui.`);
            return w.length ? (
              <div style={{marginTop:6, fontSize:11, color:T.amb, lineHeight:1.5}}>⚠ {w.join(" · ")}</div>
            ) : null;
          })()}
        </div>
      )}

      {!apiKey || mapErr ? (
        <div style={{padding:"26px 16px", textAlign:"center", fontSize:12.5, color:T.t3}}>
          {mapErr || t("tenders.map_key_set_nahi_hai")}<br/>
          <span style={{fontSize:11.5, color:T.t4}}>{t("tenders.kml_import_phir_bhi_chalega_list")}</span>
        </div>
      ) : (
        <div style={{position:"relative"}}>
          {/* Draw toolbar — our own, because Maps removed DrawingManager */}
          <div style={{display:"flex", gap:7, alignItems:"center", flexWrap:"wrap",
            padding:"8px 14px", borderBottom:`1px solid ${T.b1}`, background:T.surface}}>
            {pending && pendingHidden && (
              <div style={{display:"flex", alignItems:"center", gap:8, padding:"4px 10px", borderRadius:8,
                background:"#FEF3C7", border:"1px solid #FDE68A", fontSize:11.5, color:"#92400E", fontWeight:700}}>{t("tenders.pending_abhi_save_nahi_hui", { pending: pending.edit ? pending.name : (pending.kind==="line" ? t("tenders.khinchi_hui_line")
                    : pending.kind==="area" ? t("tenders.bana_hua_rakba") : t("tenders.laga_hua_pin")) })}<button onClick={()=>setPendingHidden(false)}
                  style={{border:"none", background:T.ind, color:"#fff", borderRadius:6, padding:"3px 10px",
                    fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit"}}>{t("tenders.save_box_kholo")}</button>
                <button onClick={dropPending}
                  style={{border:`1px solid ${T.b1}`, background:T.surface, color:T.t3, borderRadius:6,
                    padding:"3px 9px", fontSize:11, cursor:"pointer", fontFamily:"inherit"}}>{t("tenders.hatao")}</button>
              </div>
            )}
            {mode && linkTask && (
              <div style={{display:"flex", alignItems:"center", gap:8, padding:"3px 10px", borderRadius:8,
                background:T.indL||T.surfaceB, border:`1px solid ${T.ind}`, fontSize:11.5, color:T.ind, fontWeight:700}}>{t("tenders.name_ke_liye_intent", { name: linkTask.name, intent: intent?.kind === "area" ? t("tenders.chaaro_taraf_point_by_point_line") : t("tenders.kheench_kar_save_karo") })}</div>
            )}
            {!mode && (<>
              {/* Ek hi jagah se sab kuch — site par sirf pipeline nahi hoti:
                  sadak PCC ya bitumen, naali kis taraf, UGR ka asli rakba.
                  Pehle do hi button the aur baaki sab "other" me dab jaata tha. */}
              <div style={{position:"relative"}}>
                <PrimBtn label={t("tenders.naya_mark_karo")} Icon={IcMapPin} onClick={()=>setMenuOpen(o=>!o)}/>
                {menuOpen && (<>
                  {/* Bahar click karne par band — menu map ke upar hai, aur
                      map khud click khaata hai, isliye ek dhakkan chahiye. */}
                  <div onClick={()=>setMenuOpen(false)} style={{position:"fixed", inset:0, zIndex:40}}/>
                  <div style={{position:"absolute", top:"calc(100% + 5px)", left:0, zIndex:41, minWidth:252,
                    background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10,
                    boxShadow:"0 12px 30px rgba(15,23,42,.16)", overflow:"hidden auto", maxHeight:392}}>
                    {DRAW_MENU(customTypes).map(sec=>(
                      <div key={sec.head}>
                        <div style={{padding:"6px 12px 3px", fontSize:10, fontWeight:700, color:T.t4,
                          textTransform:"uppercase", letterSpacing:.4, background:T.surfaceB}}>{sec.head}</div>
                        {sec.rows.map((r,i)=>(
                          <button key={i} onClick={()=>startDraw(r.iv)}
                            style={{display:"flex", alignItems:"center", gap:8, width:"100%", textAlign:"left",
                              padding:"7px 12px", fontSize:12, color:T.t1, background:"transparent",
                              border:"none", cursor:"pointer", fontFamily:"inherit"}}
                            onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <span style={{width:9, height:9, borderRadius:r.iv.shape==="line"?2:"50%",
                              background:r.c, flexShrink:0}}/>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    ))}
                    <div style={{borderTop:`1px solid ${T.b1}`}}>
                      <button onClick={()=>{ setMenuOpen(false); setAddItem({label:"", kind:"line", colour:""}); }}
                        style={{display:"flex", alignItems:"center", gap:8, width:"100%", textAlign:"left",
                          padding:"8px 12px", fontSize:12, fontWeight:600, color:T.ind, background:"transparent",
                          border:"none", cursor:"pointer", fontFamily:"inherit"}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        {t("tenders.naya_item_jodo_dots")}
                      </button>
                    </div>
                  </div>
                </>)}
              </div>
              {/* Doosra raasta: pehle KAAM chuno, phir uski jagah banao ya
                  bani hui se jodo. Task-tree me stretch aur qty pehle se
                  hote hain, isliye wahan se shuru karna zyada seedha hai. */}
              <SecBtn label={t("tenders.task_se_mark_karo")} Icon={IcMapPin}
                onClick={()=>{
                  if (!mapTasks) { toast.error("Pehle upar se site chuno — kaam usi site ke dikhte hain"); return; }
                  setTaskMark({ q: "", wtype: "" });
                }}/>
              {/* E — photo layer ka switch */}
              <button onClick={()=>setPhotosOn(o=>!o)}
                style={{fontSize:12, padding:"7px 12px", borderRadius:7, cursor:"pointer", fontFamily:"inherit",
                  border:`1px solid ${photosOn ? "#7C3AED" : T.b1}`,
                  background: photosOn ? "#F5F3FF" : T.surface,
                  color: photosOn ? "#6D28D9" : T.t2, fontWeight: photosOn ? 700 : 400}}>{t("tenders.photos_photoson", { photosOn: photosOn ? "on" : "" })}</button>
              {/* Purani photos (WhatsApp wali bhi) apni jagah khud bataati
                  hain — aadmi se "kaunsi line?" poochhna bekaar hai. */}
              <button onClick={()=>setLocatePhoto(true)}
                style={{fontSize:12, padding:"7px 12px", borderRadius:7, cursor:"pointer", fontFamily:"inherit",
                  border:`1px solid ${T.b1}`, background:T.surface, color:T.t2}}>
               {t("tenders.photo_se_jagah")}
              </button>
              {/* F — jagah ka search: type karte hi suggestions (Google mile
                  to Google, warna OSM), Enter par pehla; click par wahi */}
              <div style={{position:"relative", flex:"1 1 190px", minWidth:170, maxWidth:280}}>
                <input ref={searchBoxRef} placeholder={t("tenders.jagah_dhoondo_e_g_atal_nagar")}
                  onChange={e=>fetchSugg(e.target.value)}
                  onBlur={()=>setTimeout(()=>setSugg([]), 200)}
                  onKeyDown={e=>{
                    if (e.key === "Escape") { setSugg([]); return; }
                    if (e.key === "Enter") {
                      if (sugg.length) pickSugg(sugg[0]);
                      else doSearch(e.target.value.trim());
                    }
                  }}
                  style={{width:"100%", boxSizing:"border-box", padding:"7px 11px", borderRadius:7,
                    border:`1px solid ${T.b1}`, fontSize:12, color:T.t1, background:T.surface,
                    outline:"none", fontFamily:"inherit"}}/>
                {!!sugg.length && (
                  <div style={{position:"absolute", top:"calc(100% + 3px)", left:0, right:0, zIndex:30,
                    background:T.surface, border:`1px solid ${T.b1}`, borderRadius:8,
                    boxShadow:"0 8px 24px rgba(15,23,42,.14)", overflow:"hidden"}}>
                    {sugg.map((s,i)=>(
                      <div key={i} onMouseDown={e=>{ e.preventDefault(); pickSugg(s); }}
                        style={{padding:"7px 10px", fontSize:11.5, color:T.t2, cursor:"pointer",
                          borderTop: i ? `1px solid ${T.b1}` : "none", lineHeight:1.35,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                        onMouseLeave={e=>e.currentTarget.style.background=T.surface}>
                        📍 {s.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span style={{fontSize:11, color:T.t4}}>{t("tenders.line_pipeline_pin_ugr_pump_house")}</span>
            </>)}
            {mode === "point" && (<>
              <span style={{fontSize:12, fontWeight:700, color:T.ind}}>
                {typeLabel(intent?.atype)} — {t("tenders.map_par_jahan_hai_click")}
              </span>
              <SecBtn label={t("common.cancel")} onClick={stopMode}/>
            </>)}
            {mode === "rect" && (<>
              <span style={{fontSize:12, fontWeight:700, color:T.ind}}>
                {typeLabel(intent?.atype)} — {draftPts.length ? t("tenders.ab_saamne_wala_kona") : t("tenders.ek_kona_click_karo")}
              </span>
              <SecBtn label={t("common.cancel")} onClick={()=>{ clearDraft(); stopMode(); }}/>
              <span style={{fontSize:11, color:T.t4}}>{t("tenders.shift_se_square")}</span>
            </>)}
            {(mode === "line" || mode === "poly") && (<>
              <span style={{fontSize:12, fontWeight:700, color:T.ind}}>
                {typeLabel(intent?.atype)} · {draftPts.length} point
                {mode === "line" && draftPts.length >= 2 && (
                  <span style={{marginLeft:7, color:"#059669"}}>· {fmtKm(pathLenM(draftPts))}</span>
                )}
                {/* Rakba draw karte waqt bhi chalta hua ankda — BOQ ke plot
                    se milaana wahin ho jaata hai, save ke baad nahi. */}
                {mode === "poly" && draftPts.length >= 3 && (
                  <span style={{marginLeft:7, color:"#059669"}}>· {fmtArea(polyAreaM2(draftPts))}</span>
                )}
              </span>
              <SecBtn label={t("tenders.ek_point_wapas")} onClick={undoPoint} disabled={!draftPts.length}/>
              <PrimBtn label={mode === "poly" ? t("tenders.rakba_poora_hua") : t("tenders.line_poori_hui")} Icon={IcChk}
                onClick={finishDraw} disabled={draftPts.length < (mode === "poly" ? 3 : 2)}/>
              <SecBtn label={t("common.cancel")} onClick={()=>{ clearDraft(); stopMode(); }}/>
              <span style={{fontSize:11, color:T.t4}}>{t("tenders.point_ko_drag_karke_theek_bhi")}</span>
            </>)}
          </div>

          {/* Filter do satar me. UPAR parivaar — pipe / naali / sadak /
              structure / apne item: ek click me us parivaar ke saare type
              saath on-off. NEECHE wahi purane per-type chips, taaki "sirf
              gravity" jaisa baareek chunav bhi bacha rahe. Ginti dono par
              hai, isliye ye legend bhi hai. */}
          {!mode && !!items.length && (()=>{
            const famCnt = {}, cnt = {};
            let pins = 0, areas = 0;
            items.forEach(it=>{
              const f = familyOf(it.atype);
              famCnt[f] = (famCnt[f]||0) + 1;
              if (it.kind === "line") cnt[it.atype] = (cnt[it.atype]||0)+1;
              else if (it.kind === "area") areas++;
              else pins++;
            });
            const fams = Object.keys(FAM_META).filter(f=>famCnt[f]);
            const chips = LINE_TYPES.filter(x=>cnt[x.v]).map(x=>({key:x.v, label:x.l, n:cnt[x.v], c:x.c}));
            // Custom line types LINE_TYPES me nahi hote — inke apne chips.
            Object.keys(cnt).filter(k=>!LINE_TYPES.some(x=>x.v===k)).forEach(k=>{
              chips.push({key:k, label:typeLabel(k), n:cnt[k], c:lineColour(k)});
            });
            if (areas) chips.push({key:"__areas", label:t("tenders.rakbe"), n:areas, c:FAM_META.structure.c});
            if (pins)  chips.push({key:"__pins",  label:t("tenders.structures"), n:pins, c:"#4338CA"});
            const anyHidden = hidden.size > 0 || famHidden.size > 0;
            const chip = (on, c, label, n, onClick, key) => (
              <button key={key} onClick={onClick}
                style={{display:"flex", alignItems:"center", gap:5, fontSize:11, cursor:"pointer",
                  padding:"3px 9px", borderRadius:20, fontFamily:"inherit",
                  border:`1px solid ${on ? c : T.b1}`,
                  background: on ? c + "14" : T.surface,
                  color: on ? c : T.t4, fontWeight: on ? 700 : 400,
                  opacity: on ? 1 : .75, textDecoration: on ? "none" : "line-through"}}>
                <span style={{width:8, height:8, borderRadius:"50%", background:on?c:T.b2, flexShrink:0}}/>
                {label} <span style={{fontWeight:400, opacity:.75}}>{n}</span>
              </button>
            );
            if (fams.length < 2 && chips.length < 2) return null;
            return (
              <div style={{padding:"7px 14px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB}}>
                {fams.length > 1 && (
                  <div style={{display:"flex", gap:6, flexWrap:"wrap", alignItems:"center"}}>
                    <span style={{fontSize:10.5, color:T.t4, marginRight:2, width:44}}>{t("tenders.filter_kya")}</span>
                    {fams.map(f=>chip(!famHidden.has(f), FAM_META[f].c, FAM_META[f].l, famCnt[f],
                      ()=>setFamHidden(h=>{ const n=new Set(h); n.has(f)?n.delete(f):n.add(f); return n; }), f))}
                  </div>
                )}
                {chips.length > 1 && (
                  <div style={{display:"flex", gap:6, flexWrap:"wrap", alignItems:"center",
                    marginTop: fams.length > 1 ? 5 : 0}}>
                    <span style={{fontSize:10.5, color:T.t4, marginRight:2, width:44}}>{t("tenders.dikhao")}</span>
                    {chips.map(c=>chip(!hidden.has(c.key), c.c, c.label, c.n,
                      ()=>setHidden(h=>{ const n=new Set(h); n.has(c.key)?n.delete(c.key):n.add(c.key); return n; }), c.key))}
                    {anyHidden && (
                      <button onClick={()=>{ setHidden(new Set()); setFamHidden(new Set()); }}
                        style={{fontSize:10.5, padding:"3px 9px", borderRadius:20, cursor:"pointer",
                          border:`1px solid ${T.b1}`, background:T.surface, color:T.ind, fontFamily:"inherit"}}>
                       {t("tenders.sab_dikhao")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <div ref={mapDiv} style={{width:"100%", height:430, background:T.surfaceB}}/>
          {!mapReady && <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:12.5, color:T.t3}}>{t("tenders.map_load_ho_raha_hai")}</div>}

          {/* C — stretch ka dashboard: line par click karte hi yahan khulta
              hai. PM ko map chhode bina poori kahani — kitna pakka, kitna
              kachcha, kaun se task, photos, issues, aakhri MB entries. */}
          {panel && (
            <div style={{position:"absolute", top:54, right:10, width:300, maxHeight:360, overflowY:"auto",
              background:T.surface, border:`1px solid ${T.b1}`, borderRadius:11, zIndex:5,
              boxShadow:"0 8px 28px rgba(15,23,42,.16)", padding:"12px 13px"}}>
              {panel.loading ? (
                <div style={{fontSize:12, color:T.t3, textAlign:"center", padding:"18px 0"}}>{t("tenders.stretch_load_ho_raha_hai")}</div>
              ) : (() => { const d = panel.data; return (<>
                <div style={{display:"flex", alignItems:"flex-start", gap:8}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:13, fontWeight:800, color:T.t1, lineHeight:1.3}}>{d.name}</div>
                    <div style={{fontSize:10.5, color:T.t4, marginTop:1}}>
                      {d.project_name} · {alignLabel(d.kind, d.atype)} · {fmtKm(d.length_m)}
                    </div>
                  </div>
                  <button onClick={()=>setPickFor({ mode:"task", aid: d.__aid })} title={t("tenders.is_jagah_par_koi_kaam_jodo")}
                    style={{border:`1px solid ${T.ind}`, background:T.surface, color:T.ind, borderRadius:7,
                      padding:"2px 8px", fontSize:10.5, fontWeight:800, cursor:"pointer", whiteSpace:"nowrap"}}>{t("tenders.kaam")}</button>
                  <button onClick={()=>setPanel(null)} style={{border:"none", background:"none", cursor:"pointer",
                    fontSize:15, color:T.t4, lineHeight:1, padding:2}}>✕</button>
                </div>

                {/* Teen sach ek bar me: pakka solid, kachcha halka, baaki khaali */}
                {d.length_m > 0 && (
                  <div style={{marginTop:9}}>
                    <div style={{height:9, borderRadius:5, background:T.surfaceB, overflow:"hidden", display:"flex"}}>
                      <div style={{width:`${Math.min(100, d.pakka_m/d.length_m*100)}%`, background:"#059669"}}/>
                      <div style={{width:`${Math.max(0, Math.min(100, (Math.min(d.kachcha_m, d.length_m)-d.pakka_m)/d.length_m*100))}%`,
                        background:"#6EE7B7"}}/>
                    </div>
                    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3px 10px", marginTop:7, fontSize:11}}>
                      <span style={{color:T.t3}}>{t("tenders.pakka_mb_se")}</span><b style={{color:"#059669", textAlign:"right"}}>{fmtKm(d.pakka_m)}</b>
                      <span style={{color:T.t3}}>{t("tenders.task_par_likha")}</span><b style={{color:T.t1, textAlign:"right"}}>{fmtKm(d.kachcha_m)}</b>
                      <span style={{color:T.t3}}>{t("tenders.geo_verified")}</span>
                      <b style={{color: d.verified_m >= d.kachcha_m && d.kachcha_m > 0 ? "#059669" : "#B45309", textAlign:"right"}}>{fmtKm(d.verified_m)}</b>
                      <span style={{color:T.t3}}>{t("common.baaki")}</span><b style={{color:T.t1, textAlign:"right"}}>{fmtKm(d.baaki_m)}</b>
                    </div>
                  </div>
                )}

                {!!d.tasks?.length && (<>
                  <div style={{fontSize:9.5, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".4px", margin:"10px 0 4px"}}>{t("common.tasks")}</div>
                  {d.tasks.slice(0,5).map(t=>(
                    <div key={t.id} style={{display:"flex", justifyContent:"space-between", gap:8, fontSize:11.5, padding:"2px 0"}}>
                      <span style={{color:T.t2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{t.name}</span>
                      <b style={{color:T.ind}}>{Number(t.progress||0)}%</b>
                    </div>
                  ))}
                </>)}

                {!!d.photos?.length && (<>
                  <div style={{fontSize:9.5, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".4px", margin:"10px 0 4px"}}>{t("tenders.photos_d", { d: d.photo_total > d.photos.length ? `(${d.photo_total})` : "" })}</div>
                  <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
                    {d.photos.slice(0,8).map(p=>(
                      <a key={p.id} href={p.url} target="_blank" rel="noreferrer" title={p.taken_on||""}>
                        <img src={thumb(p.url)} alt="" loading="lazy"
                          style={{width:44, height:44, objectFit:"cover", borderRadius:5, border:`1px solid ${T.b1}`, display:"block"}}/>
                      </a>
                    ))}
                  </div>
                </>)}

                {!!d.issues?.length && (<>
                  <div style={{fontSize:9.5, fontWeight:700, color:"#B91C1C", textTransform:"uppercase", letterSpacing:".4px", margin:"10px 0 4px"}}>{t("tenders.khule_issues")}</div>
                  {d.issues.slice(0,4).map(i=>(
                    <div key={i.id} style={{fontSize:11, color:T.t2, padding:"2px 0"}}>⚠ {i.title}</div>
                  ))}
                </>)}

                {!!d.measurements?.length && (<>
                  <div style={{fontSize:9.5, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".4px", margin:"10px 0 4px"}}>{t("tenders.aakhri_mb_entries")}</div>
                  {d.measurements.slice(0,4).map(m=>(
                    <div key={m.id} style={{display:"flex", justifyContent:"space-between", gap:8, fontSize:11, padding:"2px 0"}}>
                      <span style={{color:T.t3}}>{String(m.mdate).slice(0,10)}{m.mb_ref ? ` · ${m.mb_ref}` : ""}</span>
                      <span style={{color:T.t1, fontWeight:600}}>
                        {fmtQty(m.qty)} {m.unit||""}
                        {m.photo_verdict && <MbCheckMark verdict={m.photo_verdict} loc={m.photo_loc_flag}/>}
                      </span>
                    </div>
                  ))}
                </>)}

                {!d.tasks?.length && !d.photos?.length && (
                  <div style={{fontSize:11, color:T.t4, marginTop:9, lineHeight:1.5}}>
                   {t("tenders.is_stretch_se_abhi_koi_task")}
                  </div>
                )}
              </>); })()}
            </div>
          )}
        </div>
      )}
    </Panel>

    {/* ── "Kaam ↔ Jagah" — har qty-task map par kahan hai (P0: sach-list) ──
        Stretch-stage EK row me aata hai (layers ginti ke saath) — Prafull ke
        flow me line STRETCH se judti hai, layer se nahi. Actions P2 me. */}
    {mapTasks && (() => {
      const B = mapTasks.buckets || {};
      const unCount = (B.unmapped_line?.count||0) + (B.unmapped_point?.count||0) + (B.unmapped_other?.count||0);
      const unAmt = (B.unmapped_line?.amt||0) + (B.unmapped_point?.amt||0) + (B.unmapped_other?.amt||0);
      const CHIPS = [
        ["unmapped_line", "Line-wale"], ["unmapped_point", "Pin-wale"], ["unmapped_other", "Baaki"],
        ["na", "Map par nahi aata"], ["mapped", "✓ Jude hue"],
      ];
      const q = mtSearch.trim().toLowerCase();
      const inBucket = (mapTasks.tasks || []).filter((r) => r.bucket === mtBucket);
      // Kaam ke type ki ginti — isi bucket ke andar, taaki "structure" par
      // click karte hi sirf structure wale bache kaam dikhein.
      const tCount = {};
      inBucket.forEach((r) => { const k = r.wtype || "other"; tCount[k] = (tCount[k] || 0) + 1; });
      const TYPE_LBL = { pipeline:"Pipeline", water:"Water", sewer:"Sewer", structure:"Structure",
        road:"Road", drain:"Naali", electrical:"Electrical", other:"Anya" };
      const types = Object.keys(tCount).sort((a, b) => tCount[b] - tCount[a]);
      const list = inBucket
        .filter((r) => !mtType || (r.wtype || "other") === mtType)
        .filter((r) => !q || [r.name, r.task_no, r.item_no, r.work_name].some((v) => String(v||"").toLowerCase().includes(q)));
      return (
        <Panel style={{marginTop:14}}>
          <PHead title={t("tenders.kaam_jagah")}
            sub={unCount ? `${unCount} kaam (${money(unAmt)}) abhi map par nahi — ${mapTasks.project?.name || ""}` : `sab kaam ki jagah tay hai ✓ — ${mapTasks.project?.name || ""}`}/>
          <div style={{display:"flex", flexWrap:"wrap", gap:7, padding:"9px 14px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, alignItems:"center"}}>
            {CHIPS.map(([k, lbl]) => (
              <button key={k} onClick={()=>setMtBucket(k)}
                style={{border:`1px solid ${mtBucket===k?T.ind:T.b1}`, background:mtBucket===k?T.indL||T.bg:T.surface,
                  color:mtBucket===k?T.ind:T.t3, borderRadius:15, padding:"3px 11px", fontSize:11.5, fontWeight:700, cursor:"pointer"}}>
                {lbl} · {B[k]?.count ?? 0}
              </button>
            ))}
            <input value={mtSearch} onChange={(e)=>setMtSearch(e.target.value)} placeholder={t("tenders.dhoondo")}
              style={{marginLeft:"auto", border:`1px solid ${T.b1}`, borderRadius:8, padding:"4px 10px", fontSize:11.5, width:170, background:T.surface, color:T.t1}}/>
          </div>
          {types.length > 1 && (
            <div style={{display:"flex", flexWrap:"wrap", gap:6, padding:"7px 14px", borderBottom:`1px solid ${T.b1}`, alignItems:"center"}}>
              <span style={{fontSize:10.5, color:T.t4, fontWeight:700, textTransform:"uppercase", letterSpacing:".4px", marginRight:2}}>{t("tenders.kaam_2")}</span>
              <button onClick={()=>setMtType("")}
                style={{border:`1px solid ${!mtType?T.ind:T.b1}`, background:T.surface, color:!mtType?T.ind:T.t3,
                  borderRadius:13, padding:"2px 10px", fontSize:11, fontWeight:700, cursor:"pointer"}}>{t("tenders.sab_inbucket", { inBucket: inBucket.length })}</button>
              {types.map((k) => (
                <button key={k} onClick={()=>setMtType(mtType===k?"":k)}
                  style={{border:`1px solid ${mtType===k?T.ind:T.b1}`, background:T.surface, color:mtType===k?T.ind:T.t3,
                    borderRadius:13, padding:"2px 10px", fontSize:11, fontWeight:700, cursor:"pointer"}}>
                  {TYPE_LBL[k] || k} · {tCount[k]}
                </button>
              ))}
            </div>
          )}
          <div style={{maxHeight:330, overflowY:"auto"}}>
            {!list.length && (
              <div style={{padding:"18px 14px", fontSize:12, color:T.t4}}>{t("tenders.is_bucket_me_kuchh_nahi")}</div>
            )}
            {list.map((r) => (
              <div key={r.task_id} style={{display:"flex", alignItems:"center", gap:10, padding:"8px 14px", borderBottom:`1px solid ${T.b1}`}}>
                <div style={{minWidth:0, flex:1}}>
                  <div style={{fontSize:12.5, fontWeight:700, color:T.t1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    <span style={{color:T.t4, fontWeight:600, fontVariantNumeric:"tabular-nums"}}>{r.task_no}</span> {r.name}
                    {r.layers > 0 && <span style={{color:T.blu, fontWeight:600}}> · {r.layers} layer</span>}
                  </div>
                  <div style={{fontSize:10.5, color:T.t4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {r.work_name}{r.item_no ? ` · BOQ ${r.item_no}` : ""}{r.effective_alignment_id && !r.alignment_id ? t("tenders.jagah_stretch_se") : ""}
                  </div>
                </div>
                <div style={{textAlign:"right", flexShrink:0}}>
                  <div style={{fontSize:12, fontWeight:700, color:T.t1, fontVariantNumeric:"tabular-nums"}}>
                    {r.scope_qty != null ? `${r.scope_qty} ${r.unit || ""}` : "—"}
                  </div>
                  <div style={{fontSize:10.5, color:T.t4}}>
                    {r.done_qty > 0
                      ? <span style={{color:T.grn, fontWeight:700}}>{t("tenders.done_qty_ho_chukar", { done_qty: r.done_qty, r: r.progress ? ` · ${r.progress}%` : "" })}</span>
                      : (r.scope_amt ? money(r.scope_amt) : "")}
                  </div>
                </div>
                <div style={{display:"flex", gap:6, flexShrink:0}}>
                  {r.stretches >= 2 && !r.tukde && (
                    <button onClick={()=>openSplit(r)} title={t("tenders.tukdo_me_baanto_title")}
                      style={{border:`1px solid ${T.amb}`, background:T.surface, color:T.amb, borderRadius:7, padding:"3px 9px", fontSize:11, fontWeight:700, cursor:"pointer"}}>
                      {t("tenders.tukde_btn", { n: r.stretches })}
                    </button>
                  )}
                  {r.bucket.startsWith("unmapped") && (<>

                    {/rmt|^m$|^rm$|mtr|meter|metre|rft|^ft$/i.test(String(r.unit || "")) ? (
                      <button onClick={()=>armMark(r, "line")} title={t("tenders.map_par_line_kheench_kar_jodo")}
                        style={{border:`1px solid ${T.ind}`, background:linkTask?.task_id===r.task_id?T.ind:T.surface, color:linkTask?.task_id===r.task_id?"#fff":T.ind, borderRadius:7, padding:"3px 9px", fontSize:11, fontWeight:700, cursor:"pointer"}}>{t("tenders.line")}</button>
                    ) : (<>

                      <button onClick={()=>armMark(r, "area")} title={t("tenders.chaaro_taraf_line_band_rakba")}
                        style={{border:`1px solid ${T.ind}`, background:linkTask?.task_id===r.task_id?T.ind:T.surface, color:linkTask?.task_id===r.task_id?"#fff":T.ind, borderRadius:7, padding:"3px 9px", fontSize:11, fontWeight:700, cursor:"pointer"}}>{t("tenders.rakba")}</button>
                      <button onClick={()=>armMark(r, "both")} title={t("tenders.rakba_beech_me_pin")}
                        style={{border:`1px solid ${T.ind}`, background:T.surface, color:T.ind, borderRadius:7, padding:"3px 8px", fontSize:11, fontWeight:700, cursor:"pointer"}}>▱+📍</button>
                      <button onClick={()=>armMark(r, "point")} title={t("tenders.bahut_chhota_sirf_pin")}
                        style={{border:`1px solid ${T.b1}`, background:T.surface, color:T.t2, borderRadius:7, padding:"3px 8px", fontSize:11, fontWeight:700, cursor:"pointer"}}>{t("tenders.pin")}</button>
                    </>)}
                    <button onClick={()=>setPickFor({ mode:"line", row:r })} title={t("tenders.bani_hui_line_pin_se_jodo")}
                      style={{border:`1px solid ${T.b1}`, background:T.surface, color:T.t2, borderRadius:7, padding:"3px 9px", fontSize:11, fontWeight:700, cursor:"pointer"}}>{t("tenders.jodo")}</button>
                    <button onClick={()=>unNa(r, true)} title={t("tenders.ye_kaam_map_par_nahi_aata")}
                      style={{border:`1px solid ${T.b1}`, background:T.surface, color:T.t4, borderRadius:7, padding:"3px 7px", fontSize:11, cursor:"pointer"}}>✕</button>
                  </>)}
                  {r.bucket === "na" && (
                    <button onClick={()=>unNa(r, false)}
                      style={{border:`1px solid ${T.b1}`, background:T.surface, color:T.t2, borderRadius:7, padding:"3px 9px", fontSize:11, fontWeight:700, cursor:"pointer"}}>{t("tenders.wapas_lao")}</button>
                  )}
                  {r.bucket === "mapped" && r.alignment_id && (
                    <button onClick={async()=>{ const rr = await api.post(`/tasks/${r.task_id}/map-link`, { alignment_id: null }); if (rr?.success) { toast.success("Link hata"); load(); } else toast.error(rr?.message || "Nahi hata"); }}
                      style={{border:`1px solid ${T.b1}`, background:T.surface, color:T.t4, borderRadius:7, padding:"3px 9px", fontSize:11, cursor:"pointer"}}>{t("tenders.link_hatao")}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      );
    })()}

    {/* "Task se mark karo" — kaam chuno, phir kheencho ya jodo */}
    {taskMark && (() => {
      const rows = (mapTasks?.tasks || []).filter((r) => r.bucket.startsWith("unmapped"));
      const tc = {};
      rows.forEach((r) => { const k = r.wtype || "other"; tc[k] = (tc[k] || 0) + 1; });
      const TL = { pipeline:"Pipeline", water:"Water", sewer:"Sewer", structure:"Structure",
        road:"Road", drain:"Naali", electrical:"Electrical", other:"Anya" };
      const q = taskMark.q.trim().toLowerCase();
      const list = rows
        .filter((r) => !taskMark.wtype || (r.wtype || "other") === taskMark.wtype)
        .filter((r) => !q || [r.name, r.task_no, r.work_name, r.item_no].some((v) => String(v||"").toLowerCase().includes(q)))
        .slice(0, 300);
      return (
        <Modal title={t("tenders.kis_kaam_ki_jagah_tay_karni")} width={620}
          sub={`${mapTasks?.project?.name || ""} — jin kaam ki jagah abhi tay nahi hai`}
          onClose={()=>setTaskMark(null)}>
          <div style={{display:"flex", flexWrap:"wrap", gap:6, marginBottom:10, alignItems:"center"}}>
            <button onClick={()=>setTaskMark({ ...taskMark, wtype: "" })}
              style={{border:`1px solid ${!taskMark.wtype?T.ind:T.b1}`, background:T.surface, color:!taskMark.wtype?T.ind:T.t3,
                borderRadius:13, padding:"2px 10px", fontSize:11, fontWeight:700, cursor:"pointer"}}>{t("tenders.sab_rows", { rows: rows.length })}</button>
            {Object.keys(tc).sort((a,b)=>tc[b]-tc[a]).map((k) => (
              <button key={k} onClick={()=>setTaskMark({ ...taskMark, wtype: taskMark.wtype===k?"":k })}
                style={{border:`1px solid ${taskMark.wtype===k?T.ind:T.b1}`, background:T.surface, color:taskMark.wtype===k?T.ind:T.t3,
                  borderRadius:13, padding:"2px 10px", fontSize:11, fontWeight:700, cursor:"pointer"}}>{TL[k]||k} · {tc[k]}</button>
            ))}
            <input value={taskMark.q} onChange={(e)=>setTaskMark({ ...taskMark, q: e.target.value })} placeholder={t("tenders.dhoondo")}
              style={{marginLeft:"auto", border:`1px solid ${T.b1}`, borderRadius:8, padding:"4px 10px", fontSize:11.5, width:170, background:T.surface, color:T.t1}}/>
          </div>
          <div style={{maxHeight:360, overflowY:"auto", display:"flex", flexDirection:"column", gap:6}}>
            {!list.length && <div style={{fontSize:12, color:T.t4, padding:"16px 4px"}}>{t("tenders.sab_kaam_ki_jagah_tay_hai")}</div>}
            {list.map((r) => (
              <div key={r.task_id} style={{display:"flex", alignItems:"center", gap:9, border:`1px solid ${T.b1}`, borderRadius:9, padding:"8px 11px"}}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12.5, fontWeight:700, color:T.t1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    <span style={{color:T.t4, fontWeight:600}}>{r.task_no}</span> {r.name}
                    {r.layers > 0 && <span style={{color:T.blu, fontWeight:600}}> · {r.layers} layer</span>}
                  </div>
                  <div style={{fontSize:10.5, color:T.t4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {r.work_name} · {r.scope_qty != null ? `${r.scope_qty} ${r.unit || ""}` : t("tenders.qty_nahi")}{r.item_no ? ` · BOQ ${r.item_no}` : ""}
                  </div>
                </div>
                {/rmt|^m$|^rm$|mtr|meter|metre|rft|^ft$/i.test(String(r.unit || "")) ? (
                  <button onClick={()=>{ setTaskMark(null); armMark(r, "line"); }}
                    style={{border:`1px solid ${T.ind}`, background:T.ind, color:"#fff", borderRadius:7, padding:"5px 11px", fontSize:11.5, fontWeight:700, cursor:"pointer", flexShrink:0}}>{t("tenders.line_kheencho")}</button>
                ) : (<>

                  <button onClick={()=>{ setTaskMark(null); armMark(r, "area"); }} title={t("tenders.chaaro_taraf_point_line_band_rakba")}
                    style={{border:`1px solid ${T.ind}`, background:T.ind, color:"#fff", borderRadius:7, padding:"5px 11px", fontSize:11.5, fontWeight:700, cursor:"pointer", flexShrink:0}}>{t("tenders.rakba")}</button>
                  <button onClick={()=>{ setTaskMark(null); armMark(r, "both"); }} title={t("tenders.rakba_aur_beech_me_pin_dono")}
                    style={{border:`1px solid ${T.ind}`, background:T.surface, color:T.ind, borderRadius:7, padding:"5px 11px", fontSize:11.5, fontWeight:700, cursor:"pointer", flexShrink:0}}>{t("tenders.dono")}</button>
                  <button onClick={()=>{ setTaskMark(null); armMark(r, "point"); }} title={t("tenders.bahut_chhota_hai_sirf_pin")}
                    style={{border:`1px solid ${T.b1}`, background:T.surface, color:T.t2, borderRadius:7, padding:"5px 11px", fontSize:11.5, fontWeight:700, cursor:"pointer", flexShrink:0}}>{t("tenders.pin")}</button>
                </>)}
                <button onClick={()=>{ setTaskMark(null); setPickFor({ mode:"line", row:r }); }}
                  style={{border:`1px solid ${T.b1}`, background:T.surface, color:T.t2, borderRadius:7, padding:"5px 11px", fontSize:11.5, fontWeight:700, cursor:"pointer", flexShrink:0}}>{t("tenders.bani_hui_se_jodo")}</button>
              </div>
            ))}
          </div>
        </Modal>
      );
    })()}

    {/* Picker: task ke liye line chuno (mode line) YA line ke liye task (mode task) */}
    {splitFor && (() => {
      const pv = splitPv;
      const fq = (v) => Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
      const farakPct = pv && pv.boq_len > 0 ? Math.round(Math.abs(pv.farak) / pv.boq_len * 1000) / 10 : 0;
      const inp = { width: 84, textAlign: "right", border: `1px solid ${T.b1}`, borderRadius: 6, padding: "3px 6px", fontSize: 12, background: T.surface, color: T.t1 };
      const btn = (primary) => ({ border: `1px solid ${primary ? T.ind : T.b1}`, background: primary ? T.ind : T.surface, color: primary ? "#fff" : T.t2,
        borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" });
      return (
        <Modal title={`"${splitFor.name}" — ${t("tenders.tukdo_me_baanto")}`} width={680}
          sub={pv ? t("tenders.tukde_sub", { n: pv.stretches.length, parat: pv.parat.length }) : t("tenders.hisaab_ho_raha")}
          onClose={()=>{ setSplitFor(null); setSplitPv(null); }}
          footer={(
            <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
              <button onClick={()=>previewSplit(splitFor, splitW, splitPv)} disabled={splitBusy || !pv} style={btn(false)}>{t("tenders.hisaab_dobara")}</button>
              <button onClick={applySplitNow} disabled={splitBusy || !pv} style={btn(true)}>{splitBusy ? "…" : t("tenders.baanto")}</button>
            </div>
          )}>
          {pv && (<>
            <table style={{width:"100%", borderCollapse:"collapse", fontSize:12}}>
              <thead><tr style={{color:T.t4, fontSize:10.5, textTransform:"uppercase", letterSpacing:".4px"}}>
                <th align="left" style={{padding:"4px"}}>{t("tenders.col_tukda")}</th>
                <th align="right" style={{padding:"4px"}}>{t("tenders.col_napa")}</th>
                <th align="right" style={{padding:"4px"}}>{t("tenders.col_hissa")}</th>
                <th align="left" style={{padding:"4px"}}>{t("tenders.col_plan_qty")}</th>
              </tr></thead>
              <tbody>
                {pv.stretches.map((s) => (
                  <tr key={s.alignment_id || "baaki"} style={{borderTop:`1px solid ${T.b1}`, background: s.baaki ? T.ambL : "transparent"}}>
                    <td style={{padding:"7px 4px", fontWeight:700, color: s.baaki ? "#92400E" : T.t1}}>{s.name}</td>
                    <td align="right" style={{padding:"7px 4px", fontVariantNumeric:"tabular-nums", color:T.t3}}>{s.baaki ? "—" : fq(s.length_m) + " m"}</td>
                    <td align="right" style={{padding:"7px 4px"}}>
                      {/* Baaki tukda = jo abhi marka hi nahi; uska hissa bacha hua hai, likhne ka nahi */}
                      {s.baaki ? <span style={{fontSize:11.5, color:"#92400E", fontWeight:700}}>{t("tenders.baaki_tukda_note", { len: fq(s.length_m) })}</span> : (
                        <input type="number" min="0" value={splitW[s.alignment_id] ?? s.length_m}
                          onChange={(e)=>setSplitW({ ...splitW, [s.alignment_id]: e.target.value })}
                          onBlur={()=>previewSplit(splitFor, splitW, splitPv)} style={inp}/>
                      )}
                    </td>
                    <td style={{padding:"7px 4px", fontSize:11.5, color:T.t2}}>
                      {s.parat.map((p) => `${p.name} ${fq(p.share)} ${p.unit || ""}`).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{marginTop:10, fontSize:12, fontWeight:700, color: farakPct > 2 ? T.amb : T.t3}}>
              {t("tenders.napa_vs_boq", { napa: fq(pv.napa_total), boq: fq(pv.boq_len), farak: (pv.farak > 0 ? "+" : "") + fq(pv.farak) })}
            </div>
            <div style={{marginTop:6, fontSize:11, color:T.t4, lineHeight:1.5}}>{t("tenders.tukde_niyam_note")}</div>
          </>)}
        </Modal>
      );
    })()}
    {pickFor && (() => {
      const isLinePick = pickFor.mode === "line";
      const wantLine = isLinePick && /rmt|^m$|^rm$|mtr|meter|metre|rft|^ft$/i.test(String(pickFor.row?.unit || ""));
      const opts = isLinePick
        ? (mapTasks?.features || []).filter((f) => wantLine ? f.kind === "line" : f.kind !== "line")
            .slice().sort((a, b) => a.linked_tasks - b.linked_tasks)
        : (mapTasks?.tasks || []).filter((x) => x.bucket.startsWith("unmapped"));
      return (
        <Modal title={isLinePick ? `"${pickFor.row.name}" kis par hai?` : t("tenders.is_jagah_par_kaunsa_kaam")} width={520}
          sub={isLinePick ? t("tenders.bani_hui_jagah_chuno_ya_band") : t("tenders.bina_jagah_wale_kaam")}
          onClose={()=>setPickFor(null)}>
          <div style={{maxHeight:340, overflowY:"auto", display:"flex", flexDirection:"column", gap:6}}>
            {!opts.length && <div style={{fontSize:12, color:T.t4, padding:"14px 4px"}}>{t("tenders.kuchh_nahi_mila")}</div>}
            {opts.map((o) => (
              <button key={isLinePick ? o.id : o.task_id}
                onClick={async()=>{ const okd = isLinePick ? await doLink(pickFor.row, o.id) : await doLink(o, pickFor.aid); if (okd) setPickFor(null); }}
                style={{display:"flex", alignItems:"center", gap:9, textAlign:"left", border:`1px solid ${T.b1}`,
                  background:T.surface, borderRadius:9, padding:"8px 11px", cursor:"pointer"}}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12.5, fontWeight:700, color:T.t1}}>{isLinePick ? o.name : o.name}</div>
                  <div style={{fontSize:10.5, color:T.t4}}>
                    {isLinePick
                      ? `${alignLabel(o.kind, o.atype)}${o.length_m ? ` · ${fmtKm(o.length_m)}` : ""}${o.linked_tasks ? ` · ${o.linked_tasks} task jude` : " · khali"}`
                      : `${o.work_name} · ${o.scope_qty ?? "—"} ${o.unit || ""}${o.layers ? ` · ${o.layers} layer` : ""}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Modal>
      );
    })()}

    {/* KML ke baad: nayi lines ko kaam se jodo — line × layer preview ke saath */}
    {kmlLink && (() => {
      const works = mapTasks?.works || [];
      const w = works.find((x) => x.task_id === Number(kmlLink.work_id)) || works[0];
      const sel = kmlLink.features.filter((f) => f.take);
      const siteId = fSite || (sitesRef.current.length === 1 ? sitesRef.current[0].id : "");
      return (
        <Modal title={t("tenders.nayi_lines_ko_kaam_se_jodo")} width={620}
          sub={`Har line, chune kaam ke HAR lambai-wale layer ke neeche judegi — MB isi granularity par banta hai`}
          onClose={()=>setKmlLink(null)}
          footer={<>
            <SecBtn label={t("tenders.baad_me")} onClick={()=>setKmlLink(null)}/>
            <PrimBtn label={`Jodo (${sel.length} × ${w ? w.linear_steps : 0} = ${sel.length * (w ? w.linear_steps : 0)} task)`}
              disabled={!sel.length || !w}
              onClick={async()=>{
                const qty_by_alignment = {};
                sel.forEach((f) => { const q = Number(f.qty); if (Number.isFinite(q) && q > 0) qty_by_alignment[f.id] = q; });
                const r = await api.post("/tasks/map-bulk-link", {
                  project_id: Number(siteId), work_task_id: w.task_id,
                  alignment_ids: sel.map((f) => f.id), qty_by_alignment });
                if (!r?.success) { toast.error(r?.message || "Jud nahi paya"); return; }
                const d = r.data;
                toast.success(`${d.created} task bane${d.pairs_skipped ? ` · ${d.pairs_skipped} pehle se the` : ""}${d.skipped.length ? ` · ${d.skipped.length} step chhode (entries thi)` : ""}`);
                setKmlLink(null); load();
              }}/>
          </>}>
          <Field label={t("tenders.kaunsa_kaam_work")}>
            <SelIn value={String(kmlLink.work_id)} onChange={(v)=>setKmlLink({ ...kmlLink, work_id: Number(v) })}
              options={works.map((x) => ({ v: String(x.task_id), l: t("tenders.name_linear_steps_layer", { name: x.name, linear_steps: x.linear_steps }) }))}/>
          </Field>
          <div style={{maxHeight:280, overflowY:"auto", marginTop:10, display:"flex", flexDirection:"column", gap:6}}>
            {kmlLink.features.map((f, i) => (
              <div key={f.id} style={{display:"flex", alignItems:"center", gap:9, border:`1px solid ${T.b1}`, borderRadius:9, padding:"7px 10px"}}>
                <input type="checkbox" checked={f.take}
                  onChange={(e)=>{ const c = [...kmlLink.features]; c[i] = { ...f, take: e.target.checked }; setKmlLink({ ...kmlLink, features: c }); }}/>
                <div style={{flex:1, minWidth:0, fontSize:12.5, fontWeight:700, color:T.t1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{f.name}</div>
                <input type="number" value={f.qty}
                  onChange={(e)=>{ const c = [...kmlLink.features]; c[i] = { ...f, qty: e.target.value }; setKmlLink({ ...kmlLink, features: c }); }}
                  style={{width:90, border:`1px solid ${T.b1}`, borderRadius:7, padding:"4px 8px", fontSize:12, textAlign:"right", background:T.surface, color:T.t1}}/>
                <span style={{fontSize:10.5, color:T.t4, width:56}}>m ({fmtKm(f.length_m)})</span>
              </div>
            ))}
          </div>
        </Modal>
      );
    })()}

      {locatePhoto && (
        <PhotoLocateModal tenderId={tenderId} onClose={()=>setLocatePhoto(false)}
          onDone={(msg)=>{ toast.success(msg || "Photo lag gayi"); load(); }}/>
      )}

    {/* Naya drawn feature — type ke hisaab se apne field */}
    {pending && !pendingHidden && (()=>{
      const fam = familyOf(pending.atype);
      const P = pending.props || {};
      const setP = (k, v) => setPending(p=>({...p, props:{...(p.props||{}), [k]: v}}));
      const areaM2 = pending.kind === "area"
        ? (pending.edit ? Number(pending.area_sqm || 0) : polyAreaM2(pending.coords)) : 0;
      const pick = (val, cur, on, label) => (
        <button key={String(val)} onClick={on}
          style={{fontSize:11.5, padding:"4px 11px", borderRadius:20, cursor:"pointer", fontFamily:"inherit",
            border:`1px solid ${cur===val ? T.ind : T.b1}`,
            background: cur===val ? T.indL : T.surface,
            color: cur===val ? T.ind : T.t3, fontWeight: cur===val ? 700 : 400}}>{label}</button>
      );
      return (
      <Modal title={pending.edit
                  ? t("tenders.badlav_type", { type: typeLabel(pending.atype) })
                  : pending.kind==="line" ? t("tenders.nayi_lakeer_type", { type: typeLabel(pending.atype) })
                  : pending.kind==="area" ? t("tenders.naya_rakba_type", { type: typeLabel(pending.atype) })
                  : t("tenders.naya_structure")} Icon={pending.edit ? IcEdit : IcMapPin} width={560}
        sub={pending.edit
             ? (pending.kind === "area" ? fmtArea(pending.area_sqm)
                : pending.kind === "line" ? fmtKm(pending.length_m)
                : t("tenders.map_par_lagaya_gaya_pin"))
             : pending.kind==="point" ? t("tenders.map_par_lagaya_gaya_pin")
             : pending.kind==="area" ? t("tenders.n_kone_rakba", { n: pending.coords.length, area: fmtArea(areaM2) })
             : t("tenders.n_point_lambai", { n: pending.coords.length, len: fmtKm(pathLenM(pending.coords)) })}
        onClose={()=>setPendingHidden(true)}
        footer={<>
          <SecBtn label={t("common.hatao")} onClick={dropPending}/>
          <PrimBtn label={busy?t("tenders.save_ho_raha_hai"):t("common.save")} Icon={IcChk} onClick={savePending} disabled={busy}/>
        </>}>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
          <Field label={t("tenders.site")}>
            <SelIn value={pending.project_id} onChange={v=>setPending(p=>({...p, project_id:v}))}
              ph={t("tenders.site_chuno_2")} options={sites.map(s=>({v:s.id, l:s.name}))}/>
          </Field>
          <Field label={t("common.type")}>
            <SelIn value={pending.atype} onChange={v=>{
                if (v === NEW_TYPE) { setAddItem({label:"", kind:pending.kind, colour:""}); return; }
                setPending(p=>({...p, atype:v, props:{}}));
              }}
              options={typeOpts(pending.kind)}/>
          </Field>
          <Field label={t("common.naam")} full>
            <TxtIn value={pending.name} onChange={v=>setPending(p=>({...p, name:v}))}
              ph={pending.kind==="line" ? t("tenders.e_g_sec_25_ch_0")
                 : pending.kind==="area" ? t("tenders.e_g_ugr_sec_25_ka") : t("tenders.e_g_ugr_sec_25")}/>
          </Field>
          {/* Chaudai — sadak ki ROW, ya bade pipe ka daayra. Sadak ki
              chaudai har jagah alag hoti hai, aur naali usi se nikalti hai. */}
          {pending.kind==="line" && (
            <Field label={pending.atype==="road" ? t("tenders.chaudai_row_m") : t("tenders.chaudai_daayra_m")}>
              <TxtIn value={pending.width_m} onChange={v=>setPending(p=>({...p, width_m:v}))}
                ph={pending.atype==="road" ? "e.g. 10" : "e.g. 1.2"}/>
            </Field>
          )}
          {/* Shuruaati chainage — stretch 0 se shuru nahi hota. Pichhla
              hissa 1+200 par khatam hua to yahi number aata hai, aur map ke
              saare label wahin se ginte hain. Khaali = 0+000 se. */}
          {pending.kind==="line" && (
            <Field label={t("tenders.shuruaati_chainage")}>
              <TxtIn value={pending.start_chainage_m ?? ""} onChange={v=>setPending(p=>({...p, start_chainage_m:v}))}
                ph="e.g. 1200"/>
              {Number(pending.start_chainage_m) > 0 && Number(pending.length_m) > 0 && (
                <div style={{fontSize:11, color:T.t4, marginTop:4, fontVariantNumeric:"tabular-nums"}}>
                  {chFmt(Number(pending.start_chainage_m))} → {chFmt(Number(pending.start_chainage_m) + Number(pending.length_m))}
                </div>
              )}
            </Field>
          )}
          {/* Sadak: PCC hai ya bitumen — BOQ ka item isi se tay hota hai. */}
          {fam==="road" && (
            <Field label={t("tenders.surface")} full>
              <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                {[["pcc",t("tenders.surface_pcc")],["bitumen",t("tenders.surface_bitumen")],["wbm",t("tenders.surface_wbm")],["gsb",t("tenders.surface_gsb")],["other",t("tenders.aur_koi")]]
                  .map(([v,l])=>pick(v, P.surface, ()=>setP("surface", v), l))}
              </div>
            </Field>
          )}
          {fam==="drain" && (<>
            <Field label={t("tenders.naali_ki_shakl")}>
              <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                {[["open",t("tenders.drain_khuli")],["covered",t("tenders.drain_dhaki")],["pipe",t("tenders.drain_pipe")]]
                  .map(([v,l])=>pick(v, P.shape, ()=>setP("shape", v), l))}
              </div>
            </Field>
            <Field label={t("tenders.gehrai_m")}>
              <TxtIn value={P.depth_m ?? ""} onChange={v=>setP("depth_m", v)} ph="e.g. 1.2"/>
            </Field>
          </>)}
          {fam==="pipe" && (<>
            <Field label={t("tenders.material")}>
              <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                {[["di","DI"],["pvc","PVC"],["hdpe","HDPE"],["rcc","RCC"],["ms","MS"],["other",t("tenders.aur_koi")]]
                  .map(([v,l])=>pick(v, P.material, ()=>setP("material", v), l))}
              </div>
            </Field>
            <Field label={t("tenders.vyas_dia_mm")}>
              <TxtIn value={P.dia_mm ?? ""} onChange={v=>setP("dia_mm", v)} ph="e.g. 300"/>
            </Field>
          </>)}
        </div>

        {/* Rakba — naapa hua, likha hua nahi. Wahi ankda server bhi nikalta
            hai, isliye save ke baad badalta nahi. */}
        {pending.kind==="area" && (
          <div style={{marginTop:12, padding:"9px 12px", borderRadius:9, background:T.surfaceB,
            border:`1px solid ${T.b1}`, display:"flex", alignItems:"baseline", gap:8}}>
            <span style={{fontSize:16, fontWeight:800, color:T.ind, fontVariantNumeric:"tabular-nums"}}>{fmtArea(areaM2)}</span>
            <span style={{fontSize:11, color:T.t4}}>{t("tenders.rakba_geometry_se")}</span>
          </div>
        )}

        {/* Bada rakba zoom-out par dikhta nahi — beech me pin door se bhi
            dikhta hai. Dono ek saath ban jaate hain, dono alag-alag khiskaye
            ya mitaye ja sakte hain. */}
        {!pending.edit && pending.kind === "area" && (
          <label style={{marginTop:12, display:"flex", alignItems:"center", gap:8, cursor:"pointer",
            padding:"9px 12px", borderRadius:9, background:T.surfaceB, border:`1px solid ${T.b1}`}}>
            <input type="checkbox" checked={!!pending.center_pin}
              onChange={(e)=>setPending(p=>({...p, center_pin:e.target.checked}))}/>
            <span style={{fontSize:11.5, color:T.t2, fontWeight:600}}>{t("tenders.rakbe_ke_beech_me_pin_bhi")}</span>
            <span style={{fontSize:10.5, color:T.t4}}>{t("tenders.zoom_out_par_pin_hi_dikhta")}</span>
          </label>
        )}

        {/* Sadak (ya boundary/compound) ke saath naali — ek hi lakeer se
            dono ban jaayein. Pipeline ke saath naali nahi chalti, isliye
            wahan ye sawaal aata hi nahi (pehle har chaudi line par aata tha). */}
        {!pending.edit && pending.kind==="line" && Number(pending.width_m) > 0
          && /road|sadak|boundary|compound|wall|deewar|drain|naali/i.test(String(pending.atype||"")) && (
          <div style={{marginTop:12, padding:"10px 12px", borderRadius:9,
            background:T.surfaceB, border:`1px solid ${T.b1}`}}>
            <div style={{fontSize:11.5, color:T.t2, fontWeight:600, marginBottom:7}}>
             {t("tenders.iske_saath_naali_drain_bhi_mark")}
            </div>
            <div style={{display:"flex", gap:6, flexWrap:"wrap", alignItems:"center"}}>
              {[["","Nahi"],["both","Dono taraf"],["left","Sirf bayan"],["right","Sirf dayan"]].map(([v,l])=>(
                <button key={v||"no"} onClick={()=>setPending(p=>({...p, drain_side:v}))}
                  style={{fontSize:11.5, padding:"4px 11px", borderRadius:20, cursor:"pointer", fontFamily:"inherit",
                    border:`1px solid ${(pending.drain_side||"")===v ? T.ind : T.b1}`,
                    background:(pending.drain_side||"")===v ? T.indL : T.surface,
                    color:(pending.drain_side||"")===v ? T.ind : T.t3,
                    fontWeight:(pending.drain_side||"")===v ? 700 : 400}}>{l}</button>
              ))}
              {!!pending.drain_side && (<>
                <span style={{display:"inline-flex", alignItems:"center", gap:6, marginLeft:4}}>
                  <span style={{fontSize:11, color:T.t4}}>{t("tenders.kinare_se")}</span>
                  <input value={pending.drain_offset_m ?? ""} onChange={e=>setPending(p=>({...p, drain_offset_m:e.target.value}))}
                    placeholder="0.5"
                    style={{width:54, padding:"4px 7px", borderRadius:6, border:`1px solid ${T.b1}`,
                      fontSize:11.5, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit"}}/>
                  <span style={{fontSize:11, color:T.t4}}>m</span>
                </span>
                {/* Naali ki apni chaudai — bina iske wo map par patli lakeer
                    bhi nahi dikhti thi, jabki site par 600 mm ki hoti hai. */}
                <span style={{display:"inline-flex", alignItems:"center", gap:6, marginLeft:4}}>
                  <span style={{fontSize:11, color:T.t4}}>{t("tenders.naali_chaudai")}</span>
                  <input value={P.drain_width_m ?? ""} onChange={e=>setP("drain_width_m", e.target.value)}
                    placeholder="0.6"
                    style={{width:54, padding:"4px 7px", borderRadius:6, border:`1px solid ${T.b1}`,
                      fontSize:11.5, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit"}}/>
                  <span style={{fontSize:11, color:T.t4}}>m</span>
                </span>
              </>)}
            </div>
            {!!pending.drain_side && (
              <div style={{fontSize:10.5, color:T.t4, marginTop:7, lineHeight:1.5}}>{t("tenders.naali_sadak_ki_beech_lakeer_se", { Number: ((Number(pending.width_m)||0)/2 + (Number(pending.drain_offset_m)||0.5)).toFixed(2), pending: pending.drain_side==="both" ? " dono taraf" : pending.drain_side==="left" ? " bayan taraf" : " dayan taraf" })}</div>
            )}
          </div>
        )}

        {pending.edit && (
          <div style={{marginTop:12}}>
            <Field label={t("tenders.badlav_ka_note")} full>
              <TxtIn value={pending.notes} onChange={v=>setPending(p=>({...p, notes:v}))}
                ph={t("tenders.badlav_note_ph")}/>
            </Field>
            <div style={{fontSize:10.5, color:T.t4, marginTop:6, lineHeight:1.5}}>
              {t("tenders.geometry_map_par_badlegi")}
            </div>
          </div>
        )}
        {!pending.edit && (
          <div style={{fontSize:11.5, color:T.t4, marginTop:10}}>
           {t("tenders.naam_me_hissa_likhoge_ch_0")}
          </div>
        )}
      </Modal>
      );
    })()}

    {/* "Naya item jodo" — jo type list me hai hi nahi. Ek baar banao, poori
        company ke har tender me milega (library/master-data wala hi tareeka). */}
    {addItem && (
      <Modal title={t("tenders.naya_item_jodo")} Icon={IcMapPin} width={480}
        sub={t("tenders.item_ek_baar_banega")}
        onClose={()=>setAddItem(null)}
        footer={<>
          <SecBtn label={t("common.hatao")} onClick={()=>setAddItem(null)}/>
          <PrimBtn label={busy?t("tenders.save_ho_raha_hai"):t("tenders.jodo_aur_mark_karo")} Icon={IcChk} onClick={saveItem} disabled={busy}/>
        </>}>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
          <Field label={t("tenders.item_ka_naam")} full>
            <TxtIn value={addItem.label} onChange={v=>setAddItem(a=>({...a, label:v}))} ph={t("tenders.e_g_ofc_duct")}/>
          </Field>
          <Field label={t("tenders.kaise_mark_hoga")} full>
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              {[["line",t("tenders.mark_kind_line")],["area",t("tenders.mark_kind_area")],["point",t("tenders.mark_kind_point")]].map(([v,l])=>(
                <button key={v} onClick={()=>setAddItem(a=>({...a, kind:v}))}
                  style={{fontSize:11.5, padding:"4px 11px", borderRadius:20, cursor:"pointer", fontFamily:"inherit",
                    border:`1px solid ${addItem.kind===v ? T.ind : T.b1}`,
                    background: addItem.kind===v ? T.indL : T.surface,
                    color: addItem.kind===v ? T.ind : T.t3, fontWeight: addItem.kind===v ? 700 : 400}}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label={t("tenders.rang_optional")}>
            <input type="color" value={addItem.colour || FAM_META.custom.c}
              onChange={e=>setAddItem(a=>({...a, colour:e.target.value}))}
              style={{width:"100%", height:34, padding:2, borderRadius:7, border:`1px solid ${T.b1}`,
                background:T.surface, cursor:"pointer"}}/>
          </Field>
        </div>
        {!!customTypes.length && (
          <div style={{marginTop:14, borderTop:`1px solid ${T.b1}`, paddingTop:10}}>
            <div style={{fontSize:11, color:T.t4, marginBottom:7}}>{t("tenders.ab_tak_jode_gaye_item")}</div>
            <div style={{display:"flex", gap:7, flexWrap:"wrap"}}>
              {customTypes.map(f=>(
                <span key={f.id} style={{display:"inline-flex", alignItems:"center", gap:6, fontSize:11.5,
                  padding:"3px 8px 3px 9px", borderRadius:20, border:`1px solid ${T.b1}`, color:T.t2}}>
                  <span style={{width:8, height:8, borderRadius:"50%", background:f.colour||FAM_META.custom.c}}/>
                  {f.label}
                  <button onClick={()=>delItem(f)} title={t("tenders.hatao")}
                    style={{border:"none", background:"transparent", color:T.t4, cursor:"pointer",
                      fontSize:13, lineHeight:1, padding:"0 1px", fontFamily:"inherit"}}>×</button>
                </span>
              ))}
            </div>
            <div style={{fontSize:10.5, color:T.t4, marginTop:7}}>
              {t("tenders.item_istemal_me_hai")}
            </div>
          </div>
        )}
      </Modal>
    )}

    {/* Alignment list */}
    <Panel>
      <PHead title={t("tenders.alignments")} sub={summary
        ? [fmtKm(summary.total_length_m), `${summary.total_points} structure`,
           summary.total_area_sqm > 0 ? fmtArea(summary.total_area_sqm) : null].filter(Boolean).join(" · ")
        : undefined}/>
      {loading && <Loading text={t("tenders.alignment_load_ho_raha_hai")}/>}
      {!loading && !items.length && (
        <Empty Icon={IcMapPin} text={t("tenders.abhi_koi_alignment_nahi")}
          sub={t("tenders.map_par_line_draw_karo_ya")}/>
      )}
      {!loading && !!items.length && (
        <div style={{padding:"4px 0"}}>
          {items.map(it=>(
            <div key={it.id} style={{display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
              borderBottom:`1px solid ${T.b1}`}}>
              <div style={{width:10, height:10, flexShrink:0,
                borderRadius: it.kind==="line" ? 2 : it.kind==="area" ? 3 : "50%",
                background: it.kind==="point" ? T.blu : lineColour(it.atype),
                opacity: it.kind==="area" ? .75 : 1}}/>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:12.5, fontWeight:600, color:T.t1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{it.name}</div>
                <div style={{fontSize:11, color:T.t4}}>
                  {it.project_name || t("tenders.site_nahi")} · {typeLabel(it.atype)}
                  {/* Type ke apne field — jo bhara hai wahi dikhta hai. PCC
                      hai ya bitumen, DI hai ya HDPE: ye list se hi pata chale. */}
                  {(()=> {
                    const p = it.props || {};
                    const bits = [
                      p.surface && String(p.surface).toUpperCase(),
                      p.material && String(p.material).toUpperCase(),
                      p.dia_mm && `${p.dia_mm} mm`,
                      p.shape && ({open:"khuli", covered:"dhaki", pipe:"pipe"}[p.shape] || p.shape),
                      p.depth_m && `gehrai ${p.depth_m} m`,
                    ].filter(Boolean);
                    return bits.length ? ` · ${bits.join(" · ")}` : "";
                  })()}
                  {it.source==="kml" && it.source_file ? ` · ${it.source_file}` : ""}
                  {it.source==="walk" ? ` · ${t("tenders.site_se_chalkar")}${it.capture_meta?.avg_acc_m ? ` (GPS ±${it.capture_meta.avg_acc_m} m)` : ""}` : ""}
                </div>
              </div>
              {it.kind==="area" && (
                <div style={{textAlign:"right", whiteSpace:"nowrap", minWidth:96}}>
                  <div style={{fontSize:12.5, fontWeight:700, color:T.t2, fontVariantNumeric:"tabular-nums"}}>
                    {fmtArea(it.area_sqm)}
                  </div>
                </div>
              )}
              {it.kind==="line" && (()=>{
                const p = (progress?.lines || []).find(x=>x.id===it.id);
                return (
                  <div style={{textAlign:"right", whiteSpace:"nowrap", minWidth:96}}>
                    <div style={{fontSize:12.5, fontWeight:700, color:T.t2, fontVariantNumeric:"tabular-nums"}}>{fmtKm(it.length_m)}</div>
                    {p && p.done_m > 0 && (<>
                      <div style={{height:4, width:88, background:T.b1, borderRadius:2, overflow:"hidden", marginTop:3, marginLeft:"auto"}}>
                        <div style={{height:"100%", width:`${Math.min(100, p.pct)}%`, background:T.grn}}/>
                      </div>
                      <div style={{fontSize:10, color:T.grn, fontWeight:600, marginTop:2}}>{fmtKm(p.done_m)} · {p.pct}%</div>
                    </>)}
                  </div>
                );
              })()}
              <button onClick={()=>startEdit(it)} title={t("common.edit_2")}
                style={{width:26, height:26, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surfaceB,
                  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                <IcEdit size={12} color={T.t3}/>
              </button>
              <button onClick={()=>del(it)} title={t("common.delete")}
                style={{width:26, height:26, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surfaceB,
                  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                <IcTrash size={12} color={T.red}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  </>);
}

// ── PHOTO SE JAANCH (4A) ────────────────────────────────────────────
// Site ki photo aaj tak sirf padi rehti thi. Ab MB banate waqt wo padhi jaati
// hai aur row par ek ishara lag jaata hai. Ishara BAS ishara hai — na qty
// badalti hai, na tick hatta hai, na commit rukta hai. Faisla PM ka hi.
const PC_STYLE = {
  dikha:        { bg:"#ECFDF5", bd:"#6EE7B7", fg:"#065F46", icon:"✓" },
  nahi_dikha:   { bg:"#FEF2F2", bd:"#FCA5A5", fg:"#991B1B", icon:"✕" },
  saaf_nahi:    { bg:"#FFFBEB", bd:"#FCD34D", fg:"#92400E", icon:"?" },
  photo_nahi:   { bg:"#F8FAFC", bd:"#CBD5E1", fg:"#475569", icon:"○" },
  kam_photo:    { bg:"#FFFBEB", bd:"#FCD34D", fg:"#92400E", icon:"!" },
  sirf_ginti:   { bg:"#EFF6FF", bd:"#93C5FD", fg:"#1E40AF", icon:"i" },
};

// 4B — photo kahan khinchi gayi. Ye AI nahi, ganit hai (GPS vs khinchi hui
// line), isliye alag dikhta hai. "geo_nahi" jaan-boojh kar chup rehta hai:
// purani saari photos par location hai hi nahi, uspar roz ghanti bajana
// matlab ghanti ka matlab hi khatam kar dena.
const LOC_STYLE = {
  theek:       { fg:"#065F46", icon:"📍", get text() { return t("tenders.photo_isi_line_par"); } },
  doosri_line: { fg:"#991B1B", icon:"⚠", text:null },
  door:        { fg:"#991B1B", icon:"⚠", text:null },
  kuch_door:   { fg:"#92400E", icon:"⚠", text:null },
  geo_nahi:    { fg:null,      icon:null, text:null },
};

// Thumbnail ke liye Cloudinary se chhoti photo mangwao — poori 3-4 MB wali
// nahi. Sirf apne host par chhedte hain; kisi aur URL ko waise hi rehne dete
// hain. (Backend ka shrinkForModel bhi yahi karta hai, LLM ke liye.)
const thumb = (url) => {
  const s = String(url || "");
  if (!/^https:\/\/res\.cloudinary\.com\//.test(s)) return s;
  if (s.includes("/upload/c_fill,")) return s;
  return s.replace(/\/upload\/(?!v?\d*[a-z]_)/, "/upload/c_fill,w_120,h_120,q_auto,f_auto/");
};

// Committed measurement par chhota nishaan — sirf tab dikhta hai jab us waqt
// jaanch chali thi. Chup nishaan jaan-boojh kar hai: purani saari entries par
// kuch nahi tha, aur un par ghanti bajana bekaar shor hai.
function MbCheckMark({verdict, loc}) {
  const s = PC_STYLE[verdict];
  if (!s) return null;
  const shak = verdict === "nahi_dikha" || verdict === "saaf_nahi"
    || loc === "doosri_line" || loc === "door";
  const label = shak ? "Jaanch me shak tha, phir bhi MB me liya gaya" : "Photo jaanch: " + verdict;
  return (
    <span title={label} style={{marginLeft:5, fontSize:9.5, fontWeight:700, cursor:"help",
      color: shak ? "#991B1B" : s.fg}}>
      {shak ? "⚠" : s.icon}
    </span>
  );
}

// Jaanch chalane ka kaam ek hi jagah — cell aur detail dono isko use karte
// hain, taaki "Dobara jaancho" aur pehli jaanch me koi farak na rahe.
function usePhotoCheck({row, tenderId, from, to, onDone}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (force) => {
    setBusy(true);
    const res = await api.post(`/tenders/${tenderId}/photo-check`, {
      project_id: row.project_id, boq_item_id: row.boq_item_id,
      alignment_id: row.alignment_id || null,
      from, to, days: row.dpr_days, qty: row.dpr_qty, force: !!force,
    });
    setBusy(false);
    if (!res?.success) { toast.error(res?.message || "Jaanch nahi ho payi"); return; }
    onDone(res.data);
    // AI na chala ho to chhupao mat — warna PM ko lagega jaanch poori hui.
    if (!res.data.ai_ran && res.data.ai_reason) toast.info?.(res.data.ai_reason);
  };
  return { busy, run };
}

// Cell me sirf ishara — do chhoti lines, bas. Pehle poori detail yahin
// khulti thi aur column 130px chauda hai, to AI ka do-line ka note aath
// line me toot kar row ko teen guna lamba kar deta tha. Detail ab row ke
// NEECHE poori chaudai me khulti hai, jahan padhne ki jagah hai.
function PhotoCheckCell({row, tenderId, from, to, onDone, open, onToggle}) {
  const { busy, run } = usePhotoCheck({row, tenderId, from, to, onDone});
  const c = row.photo_check;

  if (!c) {
    return (
      <button onClick={()=>run(false)} disabled={busy}
        style={{fontSize:10.5, padding:"4px 9px", borderRadius:6, cursor:busy?"default":"pointer",
          border:`1px solid ${T.b1}`, background:T.surface, color:T.t3, fontFamily:"inherit", whiteSpace:"nowrap"}}>
        {busy ? t("tenders.dekh_raha") : t("tenders.photo_se_jaanch")}
      </button>
    );
  }
  const s = PC_STYLE[c.verdict] || PC_STYLE.sirf_ginti;
  const L = c.location ? (LOC_STYLE[c.location.flag] || null) : null;
  return (
    <button onClick={onToggle} title={t("tenders.detail_dekho")}
      style={{display:"flex", flexDirection:"column", alignItems:"flex-start", gap:2,
        padding:"4px 8px", borderRadius:6, cursor:"pointer", width:"100%",
        border:`1px solid ${open ? s.fg : s.bd}`, background:s.bg, fontFamily:"inherit", textAlign:"left"}}>
      <span style={{fontSize:10.5, fontWeight:700, color:s.fg, whiteSpace:"nowrap"}}>{s.icon} {c.label}</span>
      {/* Jagah wali baat AI wale ishare se ALAG dikhti hai — dono alag
          sawaal hain aur PM ko pata rehna chahiye kaunsa kis se aaya. */}
      {L && L.icon && (
        <span style={{fontSize:9.5, color:L.fg, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%"}}>
          {L.icon} {L.text || (c.location.flag === "doosri_line" ? t("tenders.doosri_line_par") : t("tenders.jagah_dekho"))}
        </span>
      )}
    </button>
  );
}

// Row ke neeche khulne wala detail — poori chaudai, isliye tasveer bayen aur
// padhne wali baat dayen, dono ek nazar me.
function PhotoCheckDetail({row, tenderId, from, to, onDone}) {
  const { busy, run } = usePhotoCheck({row, tenderId, from, to, onDone});
  const c = row.photo_check;
  if (!c) return null;
  const cov = c.coverage || {};
  const bits = [
    `${cov.total ?? 0} photo`,
    cov.skipped ? `${cov.skipped} nahi dekhi` : null,
    row.dpr_days ? `${row.dpr_days} din ka kaam` : null,
  ].filter(Boolean);

  return (
    <div style={{display:"flex", gap:14, alignItems:"flex-start", padding:"10px 12px",
      background:T.surfaceB, borderLeft:`3px solid ${(PC_STYLE[c.verdict]||PC_STYLE.sirf_ginti).fg}`, borderRadius:7}}>
      {!!c.photos?.length && (
        <div style={{display:"flex", gap:5, flexShrink:0}}>
          {c.photos.slice(0,5).map(p=>(
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" title={p.taken_on||t("tenders.poori_photo_kholo")}>
              <img src={thumb(p.url)} alt="" loading="lazy"
                style={{width:58, height:58, objectFit:"cover", borderRadius:5,
                  border:`1px solid ${T.b1}`, display:"block"}}/>
            </a>
          ))}
        </div>
      )}
      <div style={{flex:1, minWidth:0, fontSize:11.5, color:T.t2, lineHeight:1.55}}>
        {c.note && <div>{c.note}</div>}
        {!!c.kya_dikha?.length && (
          <div style={{marginTop:3, color:T.t3}}>
            <span style={{color:T.t4}}>{t("tenders.photo_me")} </span>{c.kya_dikha.join(" · ")}
          </div>
        )}
        <div style={{marginTop:5, fontSize:10.5, color:T.t4}}>{bits.join(" · ")}</div>
      </div>
      <button onClick={()=>run(true)} disabled={busy}
        style={{flexShrink:0, fontSize:10.5, padding:"5px 10px", borderRadius:6, cursor:busy?"default":"pointer",
          border:`1px solid ${T.b1}`, background:T.surface, color:T.t3, fontFamily:"inherit", whiteSpace:"nowrap"}}>
        {busy ? "…" : t("tenders.dobara_jaancho")}
      </button>
    </div>
  );
}

// ── MB DRAFT (month-end) ────────────────────────────────────────────
// Site teams write meters daily in mobile DPRs against a BOQ item. This pulls
// that diary for a period, summed site × item, so the admin cross-checks it
// once and commits verified rows into the MB. DPR stays the raw record; the MB
// rows are what RA billing reads — one truth, entered once.
function MBDraftModal({tenderId, onClose, onDone}) {
  const toast = useToast();
  const monthStart = () => { const d=new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10); };
  const today = () => new Date().toISOString().slice(0,10);
  const [from, setFrom]   = useState(monthStart());
  const [to, setTo]       = useState(today());
  const [mdate, setMdate] = useState(today());
  const [mbRef, setMbRef] = useState("");
  const [rows, setRows]   = useState(null);   // null = abhi load nahi hua
  const [scanned, setScanned] = useState(0);
  const [warn, setWarn] = useState("");
  const [openRow, setOpenRow] = useState(null);   // jaanch ki detail kis row ki khuli hai
  const [busy, setBusy]   = useState(false);

  const fetchDraft = async () => {
    if (!from || !to) { toast.error("Period chuno"); return; }
    setBusy(true);
    const res = await api.get(`/tenders/${tenderId}/mb-draft?from=${from}&to=${to}`);
    setBusy(false);
    if (!res?.success) { toast.error(res?.message || "Draft nahi bana"); return; }
    const list = (res.data?.rows || []).map(r => ({...r, take: r.dpr_qty, include: true}));
    setRows(list); setScanned(res.data?.dprs_scanned || 0);
    setWarn(res.data?.warning || "");
    // Server padh nahi paaya to draft adhoora hai — chup mat raho, warna
    // adhoora draft poora dikhta hai aur bill kam ban jaata hai.
    if (res.data?.warning) toast.error(res.data.warning);
    else if (!list.length) toast.info?.("Is period me DPR se koi BOQ-linked kaam nahi mila");
  };

  const setRow = (i,k,v) => setRows(p=>p.map((r,idx)=>idx===i?{...r,[k]:v}:r));
  const chosen = (rows||[]).filter(r=>r.include && Number(r.take)>0);
  const commit = async () => {
    if (!chosen.length) { toast.error("Kam se kam ek row chuno"); return; }
    if (!mdate) { toast.error("MB date chuno"); return; }
    setBusy(true);
    const res = await api.post(`/tenders/${tenderId}/mb-commit`, {
      mdate, mb_ref: mbRef || null,
      rows: chosen.map(r=>({ project_id:r.project_id, boq_item_id:r.boq_item_id,
        alignment_id: r.alignment_id || null, qty:Number(r.take),
        remarks: Number(r.take)!==Number(r.dpr_qty) ? `DPR ${r.dpr_qty}, verified ${r.take}` : null })),
    });
    setBusy(false);
    if (!res?.success) { toast.error(res?.message || "Commit nahi hua"); return; }
    toast.success(`${res.data.inserted} MB entry ban gayi`);
    onDone();
  };

  const th = {fontSize:10.5, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:".3px", padding:"7px 8px", textAlign:"left", borderBottom:`1px solid ${T.b1}`, whiteSpace:"nowrap"};
  const td = {fontSize:12, color:T.t2, padding:"7px 8px", borderBottom:`1px solid ${T.b1}`};

  return (
    <Modal title={t("tenders.mb_draft_dpr_se")} Icon={IcTable} width={900}
      sub={t("tenders.site_ki_daily_dpr_entries_ka")}
      onClose={onClose}
      footer={<>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        <PrimBtn label={busy ? t("tenders.ruko") : `${chosen.length} row MB me daalo`} Icon={IcChk}
          onClick={commit} disabled={busy || !chosen.length}/>
      </>}>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1.2fr auto", gap:11, alignItems:"end", marginBottom:13}}>
        <Field label={t("tenders.period_se")}><TxtIn type="date" value={from} onChange={setFrom}/></Field>
        <Field label={t("tenders.period_tak")}><TxtIn type="date" value={to} onChange={setTo}/></Field>
        <Field label={t("tenders.mb_date")}><TxtIn type="date" value={mdate} onChange={setMdate}/></Field>
        <Field label={t("tenders.mb_ref_page_no")}><TxtIn value={mbRef} onChange={setMbRef} ph={t("tenders.mb_01_pg_12")}/></Field>
        <SecBtn label={busy?"...":t("tenders.draft_banao")} onClick={fetchDraft} disabled={busy}/>
      </div>

      {rows === null && (
        <div style={{padding:"22px 12px", textAlign:"center", fontSize:12.5, color:T.t3}}>
         {t("tenders.period_chuno_aur")} <b>{t("tenders.draft_banao")}</b> {t("tenders.dabao_dpr_se_site_wise_item")}
        </div>
      )}
      {rows && !rows.length && (
        <div style={{padding:"18px 12px", textAlign:"center", fontSize:12.5, color:T.t3}}>{t("tenders.is_period_me_boq_item_se", { scanned })}<br/>
          <span style={{fontSize:11.5, color:T.t4}}>{t("tenders.jis_task_par_kaam_likha_gaya")}</span>
        </div>
      )}
      {!!warn && (
        <div style={{background:"#FEF2F2", border:"1px solid #FCA5A5", color:"#991B1B", borderRadius:8, padding:"8px 11px", fontSize:11.5, marginBottom:9, lineHeight:1.5}}>
          ⚠ {warn}
        </div>
      )}
      {!!rows?.length && (<>
        <div style={{fontSize:11.5, color:T.t4, marginBottom:7}}>{t("tenders.scanned_dpr_se_rows_line_qty", { scanned, rows: rows.length })}</div>
        <div style={{border:`1px solid ${T.b1}`, borderRadius:9, overflow:"hidden", maxHeight:340, overflowY:"auto"}}>
          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <thead style={{position:"sticky", top:0, background:T.surfaceB, zIndex:1}}>
              <tr><th style={{...th,width:34}}></th><th style={th}>{t("common.site")}</th><th style={th}>{t("common.item")}</th>
                <th style={th}>{t("common.description")}</th><th style={{...th,textAlign:"right"}}>{t("tenders.dpr_qty")}</th>
                <th style={{...th,textAlign:"right"}}>{t("tenders.mb_me_lo")}</th><th style={{...th,textAlign:"right"}}>{t("tenders.is_period_me_pehle_se")}</th>
                <th style={{...th,width:132}}>{t("tenders.photo_se_jaanch")}</th></tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>{
                const dup = Number(r.measured_in_period) > 0;
                return [
                  <tr key={i} style={{background: r.include ? "transparent" : T.surfaceB}}>
                    <td style={td}><input type="checkbox" checked={r.include} onChange={e=>setRow(i,"include",e.target.checked)}/></td>
                    <td style={{...td, fontWeight:600, color:T.t1, whiteSpace:"nowrap"}}>{r.project_name}</td>
                    <td style={{...td, whiteSpace:"nowrap"}}>{r.item_no}</td>
                    <td style={{...td, maxWidth:250}}>
                      <div style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={r.description}>{r.description}</div>
                      {/* Site ne GPS se batayi hui stretch — MB me bhi wahi jaati hai,
                          taaki map par theek usi hisse par rang chadhe. */}
                      {r.alignment_name && (
                        <div style={{fontSize:10.5, color:T.ind, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                          ↳ {r.alignment_name}
                        </div>
                      )}
                    </td>
                    <td style={{...td, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{fmtQty(r.dpr_qty)} <span style={{color:T.t4,fontSize:10.5}}>{r.unit}</span>
                      <div style={{fontSize:10, color:T.t4}}>{r.dpr_days} din</div>
                      {/* Kitna kaam us din ki geo-photo ke saath likha gaya.
                          Rok nahi — PM ke saamne sach, faisla uska. */}
                      {r.verified_qty != null && Number(r.dpr_qty) > 0 && (
                        Number(r.verified_qty) >= Number(r.dpr_qty)
                          ? <div style={{fontSize:10, color:"#059669", fontWeight:700}}>{t("tenders.poora_geo_verified")}</div>
                          : Number(r.verified_qty) > 0
                            ? <div style={{fontSize:10, color:"#B45309", fontWeight:700}}>✓ {fmtQty(r.verified_qty)} verified</div>
                            : <div style={{fontSize:10, color:"#B91C1C", fontWeight:700}}>{t("tenders.geo_verify_0")}</div>
                      )}</td>
                    <td style={{...td, textAlign:"right"}}>
                      <input type="number" value={r.take} onChange={e=>setRow(i,"take",e.target.value)} disabled={!r.include}
                        style={{...inputStyle, width:96, textAlign:"right", padding:"5px 7px",
                          borderColor: Number(r.take)!==Number(r.dpr_qty) ? T.amb : T.b1}}/>
                    </td>
                    <td style={{...td, textAlign:"right", color: dup ? T.amb : T.t4, fontWeight: dup?700:400}}>
                      {dup ? `${fmtQty(r.measured_in_period)} ${r.unit||""}` : "—"}
                      {dup && <div style={{fontSize:10}}>{t("tenders.dobara_na_ho")}</div>}
                    </td>
                    {/* AI sirf ishara deta hai. Row ka tick, qty aur commit —
                        teeno aadmi ke haath me hi rehte hain. */}
                    <td style={td}>
                      <PhotoCheckCell row={r} tenderId={tenderId} from={from} to={to}
                        onDone={c=>setRow(i,"photo_check",c)}
                        open={openRow===i} onToggle={()=>setOpenRow(o=>o===i?null:i)}/>
                    </td>
                  </tr>,
                  openRow===i && r.photo_check && (
                    <tr key={i+"-d"}>
                      <td colSpan={8} style={{padding:"0 10px 9px 10px", background: r.include?"transparent":T.surfaceB}}>
                        <PhotoCheckDetail row={r} tenderId={tenderId} from={from} to={to}
                          onDone={c=>setRow(i,"photo_check",c)}/>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      </>)}
    </Modal>
  );
}

// ── MEASUREMENTS TAB ────────────────────────────────────────────────
function MeasurementsTab({tenderId, sites, boqItems, bills}) {
  const toast = useToast();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [fSite, setFSite]     = useState("");
  const [fItem, setFItem]     = useState("");
  const [modal, setModal]     = useState(null);   // {} = naya, {edit} = edit
  const [draftOpen, setDraftOpen] = useState(false);
  // AI-jaanch ka jod (Sahayak c) — committed rows par lagi muhrein +
  // taaza checks ki ginti. Sirf ginti hai, LLM yahan nahi chalta.
  const [score, setScore] = useState(null);

  const lockDate = lockDateOf(bills);

  const load = useCallback(async () => {
    const qs = [];
    if (fSite) qs.push(`project_id=${fSite}`);
    if (fItem) qs.push(`boq_item_id=${fItem}`);
    const res = await api.get(`/tenders/${tenderId}/measurements${qs.length?"?"+qs.join("&"):""}`);
    setLoading(false);
    if (!res?.success) { toast.error(res?.message || "Measurements load nahi hue"); return; }
    setRows(Array.isArray(res.data) ? res.data : []);
  }, [tenderId, fSite, fItem, toast]);
  useEffect(()=>{ load(); }, [load]);
  useEffect(()=>{
    api.get(`/tenders/${tenderId}/check-score`).then(r=>{ if(r?.success) setScore(r.data); }).catch(()=>{});
  }, [tenderId]);

  const del = async (m) => {
    if (!await window.confirmAsync(`${fmtDate(m.mdate)} ki entry (${fmtQty(m.qty)} ${m.unit||""}) hataayein?`)) return;
    const res = await api.del(`/tenders/${tenderId}/measurements/${m.id}`);
    if (!res?.success) { toast.error(res?.message || "Delete nahi hua"); return; }
    toast.success("Entry hat gayi");
    load();
  };

  // Item-wise cumulative — kis BOQ item par ab tak kitna ho chuka.
  const summary = useMemo(()=>{
    const by = new Map();
    for (const r of rows) {
      const k = r.boq_item_id;
      const cur = by.get(k) || {item_no:r.item_no, unit:r.unit, desc:r.boq_description, qty:0, n:0};
      cur.qty += Number(r.qty||0); cur.n += 1;
      by.set(k, cur);
    }
    return [...by.values()].sort((a,b)=>String(a.item_no||"").localeCompare(String(b.item_no||"")));
  }, [rows]);

  const COLS = "104px 96px minmax(120px,1.1fr) minmax(180px,2fr) 100px 120px 78px";

  return (<>
    <Panel style={{marginBottom:11}}>
      <PHead title={t("tenders.measurements_mb")} sub={rows.length ? `${rows.length} entry` : undefined}
        action={<div style={{display:"flex", gap:8}}>
          <SecBtn label={t("tenders.mb_draft_dpr_se_2")} Icon={IcTable} onClick={()=>setDraftOpen(true)}/>
          <PrimBtn label={t("tenders.nayi_measurement")} Icon={IcAdd} onClick={()=>setModal({})}/>
        </div>}/>

      {/* Filters */}
      <div style={{padding:"9px 14px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB,
        display:"flex", gap:9, flexWrap:"wrap", alignItems:"center"}}>
        <div style={{minWidth:180}}>
          <SelIn value={fSite} onChange={setFSite} ph={t("tenders.saari_sites")}
            options={sites.map(s=>({v:s.id, l:s.name}))}/>
        </div>
        <div style={{minWidth:240}}>
          <SelIn value={fItem} onChange={setFItem} ph={t("tenders.saare_boq_items")}
            options={boqItems.map(i=>({v:i.id, l:`${i.item_no||"--"} · ${String(i.description||"").slice(0,44)}`}))}/>
        </div>
        {(fSite||fItem) && <SecBtn label={t("tenders.filter_hatao")} Icon={IcX} onClick={()=>{setFSite("");setFItem("");}}/>}
        {lockDate && (
          <div style={{marginLeft:"auto", display:"flex", alignItems:"center", gap:6, fontSize:11, color:T.t3}}>
            <IcLock size={12} color={T.amb}/>
            <span>{t("tenders.fmtdate_tak_bill_ho_chuka_us", { fmtDate: fmtDate(lockDate) })}</span>
          </div>
        )}
      </div>

      {/* ── AI-jaanch ka jod — kitni rows par photo/GPS ki muhar hai ── */}
      {score && (score.committed.rows > 0 || score.checks.total > 0) && (
        <div style={{padding:"8px 14px", borderBottom:`1px solid ${T.b1}`, display:"flex", gap:6,
          flexWrap:"wrap", alignItems:"center"}}>
          <span style={{fontSize:10, fontWeight:800, color:T.t4, textTransform:"uppercase", letterSpacing:".5px"}}>
           {t("tenders.ai_jaanch")}
          </span>
          {[
            {n:score.committed.thik, l:t("tenders.photo_se_pushti"), c:"#047857", bg:T.grnL},
            {n:score.committed.dekhne_layak, l:t("tenders.dekhne_layak"), c:"#B45309", bg:T.ambL},
            {n:score.committed.photo_nahi, l:t("tenders.photo_hi_nahi"), c:"#B91C1C", bg:T.redL},
            {n:score.committed.loc_theek, l:t("tenders.gps_line_par"), c:"#1D4ED8", bg:T.bluL},
            {n:score.committed.loc_doosri_line, l:t("tenders.gps_doosri_line"), c:"#B91C1C", bg:T.redL},
            {n:score.committed.bina_jaanch, l:t("tenders.bina_jaanch_purani"), c:T.t3, bg:T.sltL},
          ].filter(x=>x.n>0).map(x=>(
            <span key={x.l} style={{fontSize:10.5, fontWeight:700, color:x.c, background:x.bg,
              padding:"2px 9px", borderRadius:12}}>{x.n} {x.l}</span>
          ))}
          <span style={{marginLeft:"auto", fontSize:10, color:T.t4}}>{t("tenders.rows_committed_rowsscore", { rows: score.committed.rows, score: score.checks.ai_ran ? ` · ${score.checks.ai_ran} par AI chala` : "" })}</span>
        </div>
      )}

      {loading && <Loading text={t("tenders.measurements_load_ho_rahe_hain")}/>}

      {!loading && !rows.length && (
        <Empty Icon={IcTable} text={fSite||fItem ? t("tenders.is_filter_me_koi_entry_nahi") : t("tenders.abhi_koi_measurement_nahi")}
          sub={fSite||fItem ? undefined : t("tenders.site_par_kaam_hone_ke_baad")}/>
      )}

      {!loading && !!rows.length && (<>
        <div style={{display:"grid", gridTemplateColumns:COLS, padding:"8px 14px", gap:9,
          background:T.surfaceB, borderBottom:`1px solid ${T.b1}`}}>
          {["Date","MB Ref","Site","BOQ Item","Qty","Entered By",""].map((h,i)=>(
            <span key={i} style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase",
              letterSpacing:".6px", textAlign:i===4?"right":"left"}}>{h}</span>
          ))}
        </div>
        {rows.map((m,i)=>{
          const d = String(m.mdate||"").slice(0,10);
          const locked = !!lockDate && d <= lockDate;
          return (
            <div key={m.id} style={{display:"grid", gridTemplateColumns:COLS, padding:"9px 14px", gap:9,
              alignItems:"center", borderBottom:i<rows.length-1?`1px solid ${T.b1}`:"none",
              background:locked?T.surfaceB:T.surface}}>
              <span style={{fontSize:11.5, color:T.t2, display:"flex", alignItems:"center", gap:5}}>
                {locked && <span title={LOCK_MSG} style={{lineHeight:0, cursor:"help"}}><IcLock size={11} color={T.amb}/></span>}
                {fmtDate(m.mdate)}
              </span>
              <span style={{fontSize:11.5, color:m.mb_ref?T.t2:T.t4}}>{m.mb_ref || "--"}</span>
              <span title={m.project_name} style={{fontSize:11.5, color:T.t2, overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{m.project_name || "--"}</span>
              <span title={m.boq_description} style={{fontSize:11.5, color:T.t1, overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                <b style={{color:T.ind}}>{m.item_no || "--"}</b> · {m.boq_description || "--"}
              </span>
              <span style={{fontSize:12, color:T.t1, fontWeight:600, textAlign:"right",
                fontVariantNumeric:"tabular-nums"}}>{fmtQty(m.qty)} <span style={{fontSize:10, color:T.t4}}>{m.unit||""}</span></span>
              <span style={{fontSize:11, color:T.t3, overflow:"hidden", textOverflow:"ellipsis",
                whiteSpace:"nowrap"}}>
                {m.created_by_name || "--"}
                {/* Commit ke waqt photo-jaanch kya keh rahi thi. Ye rok nahi
                    thi aur ab bhi nahi hai — sirf nishaan, taaki baad me
                    dikhe ki jaanch ne kya kaha aur aadmi ne kya kiya. */}
                {m.photo_verdict && <MbCheckMark verdict={m.photo_verdict} loc={m.photo_loc_flag}/>}
              </span>
              <div style={{display:"flex", gap:4, justifyContent:"flex-end"}}>
                {locked ? (
                  <span title={LOCK_MSG} style={{fontSize:10, color:T.amb, cursor:"help", fontWeight:600}}>{t("tenders.locked")}</span>
                ) : (<>
                  <button onClick={()=>setModal({edit:m})} title={t("common.edit_2")}
                    style={{width:26, height:26, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surfaceB,
                      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}>
                    <IcEdit size={12} color={T.t3}/>
                  </button>
                  <button onClick={()=>del(m)} title={t("common.delete")}
                    style={{width:26, height:26, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surfaceB,
                      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}>
                    <IcTrash size={12} color={T.red}/>
                  </button>
                </>)}
              </div>
            </div>
          );
        })}
      </>)}
    </Panel>

    {/* Item-wise cumulative strip */}
    {!!summary.length && (
      <Panel>
        <PHead title={t("tenders.item_wise_cumulative")} sub={`${summary.length} BOQ item par kaam hua`}/>
        <div style={{padding:"10px 14px", display:"flex", gap:8, flexWrap:"wrap"}}>
          {summary.map((s,i)=>(
            <div key={i} style={{border:`1px solid ${T.b1}`, borderRadius:8, padding:"8px 11px",
              background:T.surfaceB, minWidth:170}}>
              <div style={{fontSize:11, fontWeight:700, color:T.ind}}>{s.item_no || "--"}</div>
              <div title={s.desc} style={{fontSize:10.5, color:T.t4, maxWidth:190, overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop:1}}>{s.desc || ""}</div>
              <div style={{fontSize:14, fontWeight:800, color:T.t1, marginTop:4, fontVariantNumeric:"tabular-nums"}}>
                {fmtQty(s.qty)} <span style={{fontSize:10.5, fontWeight:600, color:T.t3}}>{s.unit||""}</span>
              </div>
              <div style={{fontSize:10, color:T.t4, marginTop:1}}>{s.n} entry</div>
            </div>
          ))}
        </div>
      </Panel>
    )}

    {modal && (
      <MeasurementModal tenderId={tenderId} sites={sites} boqItems={boqItems} edit={modal.edit}
        onClose={()=>setModal(null)} onDone={()=>{ setModal(null); load(); }}/>
    )}

    {draftOpen && (
      <MBDraftModal tenderId={tenderId}
        onClose={()=>setDraftOpen(false)} onDone={()=>{ setDraftOpen(false); load(); }}/>
    )}
  </>);
}

// ── DEDUCTION SETUP MODAL ───────────────────────────────────────────
const CALC_OPTS = [
  {v:"pct_gross", get l() { return t("tenders.of_subtotal"); }},
  {v:"fixed",     get l() { return t("tenders.fixed_amount"); }},
  {v:"manual",    get l() { return t("tenders.manual_har_bill_par_bharo"); }},
];
const CALC_LABEL = {pct_gross:"% of subtotal", fixed:"Fixed", manual:"Manual"};

function DeductionSetupModal({tenderId, onClose, onDone}) {
  const toast = useToast();
  const [rows, setRows]   = useState([]);
  const [loading, setLoad]= useState(true);
  const [add, setAdd]     = useState({head_name:"", calc_type:"pct_gross", rate:"", sort_order:""});
  const [busy, setBusy]   = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get(`/tenders/${tenderId}/deductions`);
    setLoad(false);
    if (!res?.success) { toast.error(res?.message || "Deduction config load nahi hua"); return; }
    setRows(Array.isArray(res.data) ? res.data : []);
  }, [tenderId, toast]);
  useEffect(()=>{ load(); }, [load]);

  const create = async () => {
    if (!add.head_name.trim()) { toast.error("Deduction head ka naam zaroori hai"); return; }
    setBusy(true);
    const res = await api.post(`/tenders/${tenderId}/deductions`, {
      head_name: add.head_name.trim(), calc_type: add.calc_type,
      rate: add.calc_type === "manual" ? null : (add.rate === "" ? null : Number(add.rate)),
      sort_order: add.sort_order === "" ? null : Number(add.sort_order),
    });
    setBusy(false);
    if (!res?.success) { toast.error(res?.message || "Head add nahi hua"); return; }
    toast.success("Head jud gaya"); setDirty(true);
    setAdd({head_name:"", calc_type:"pct_gross", rate:"", sort_order:""});
    load();
  };

  const patch = async (r, body) => {
    const res = await api.put(`/tenders/${tenderId}/deductions/${r.id}`, body);
    if (!res?.success) { toast.error(res?.message || "Update nahi hua"); return; }
    setDirty(true); load();
  };

  const remove = async (r) => {
    if (!await window.confirmAsync(t("tenders.head_name_head_hataayein_pehle_ban", { head_name: r.head_name }))) return;
    const res = await api.del(`/tenders/${tenderId}/deductions/${r.id}`);
    if (!res?.success) { toast.error(res?.message || "Delete nahi hua"); return; }
    toast.success("Head hat gaya"); setDirty(true); load();
  };

  const COLS = "minmax(150px,1.6fr) 150px 100px 70px 62px";

  return (
    <Modal title={t("tenders.deduction_setup")} Icon={IcRupee} width={760}
      sub={t("tenders.har_ra_bill_par_yahi_heads")}
      onClose={()=>{ onClose(); if (dirty) onDone(); }}
      footer={<PrimBtn label={t("common.done")} Icon={IcChk} onClick={()=>{ onClose(); if (dirty) onDone(); }}/>}>
      {loading && <Loading text={t("tenders.config_load_ho_raha_hai")}/>}
      {!loading && (<>
        <div style={{display:"grid", gridTemplateColumns:COLS, gap:9, padding:"0 0 7px"}}>
          {["Head","Type","Rate","Order",""].map((h,i)=>(
            <span key={i} style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase",
              letterSpacing:".6px", textAlign:i===2||i===3?"right":"left"}}>{h}</span>
          ))}
        </div>
        {rows.map(r=>(
          <div key={r.id} style={{display:"grid", gridTemplateColumns:COLS, gap:9, alignItems:"center",
            padding:"7px 0", borderTop:`1px solid ${T.b1}`}}>
            <span style={{fontSize:12.5, color:T.t1, fontWeight:600}}>{r.head_name}</span>
            <SelIn value={r.calc_type} options={CALC_OPTS}
              onChange={v=>patch(r,{calc_type:v, rate: v==="manual" ? null : (r.rate ?? 0)})}/>
            <input type="number" defaultValue={r.rate ?? ""} disabled={r.calc_type==="manual"}
              onBlur={e=>{
                const v = e.target.value === "" ? null : Number(e.target.value);
                if (String(v) !== String(r.rate ?? "")) patch(r,{rate:v});
              }}
              placeholder={r.calc_type==="manual" ? "--" : "0"}
              style={{...inputStyle, padding:"7px 9px", fontSize:12, textAlign:"right",
                background:r.calc_type==="manual"?T.sltL:T.bg,
                color:r.calc_type==="manual"?T.t4:T.t1}}/>
            <input type="number" defaultValue={r.sort_order ?? ""}
              onBlur={e=>{
                const v = e.target.value === "" ? null : Number(e.target.value);
                if (String(v) !== String(r.sort_order ?? "")) patch(r,{sort_order:v});
              }}
              style={{...inputStyle, padding:"7px 9px", fontSize:12, textAlign:"right"}}/>
            <div style={{display:"flex", justifyContent:"flex-end"}}>
              <button onClick={()=>remove(r)} title={t("common.hatao")}
                style={{width:26, height:26, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surfaceB,
                  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}>
                <IcTrash size={12} color={T.red}/>
              </button>
            </div>
          </div>
        ))}

        {/* Naya head */}
        <div style={{marginTop:13, paddingTop:12, borderTop:`2px solid ${T.b1}`}}>
          <div style={{fontSize:11, fontWeight:700, color:T.t3, marginBottom:8, textTransform:"uppercase",
            letterSpacing:".5px"}}>{t("tenders.naya_head")}</div>
          <div style={{display:"grid", gridTemplateColumns:COLS, gap:9, alignItems:"center"}}>
            <TxtIn value={add.head_name} onChange={v=>setAdd(p=>({...p,head_name:v}))} ph={t("tenders.e_g_withheld")}/>
            <SelIn value={add.calc_type} options={CALC_OPTS}
              onChange={v=>setAdd(p=>({...p,calc_type:v, rate: v==="manual" ? "" : p.rate}))}/>
            <input type="number" value={add.rate} disabled={add.calc_type==="manual"}
              onChange={e=>setAdd(p=>({...p,rate:e.target.value}))}
              placeholder={add.calc_type==="manual" ? "--" : "0"}
              style={{...inputStyle, padding:"7px 9px", fontSize:12, textAlign:"right",
                background:add.calc_type==="manual"?T.sltL:T.bg}}/>
            <input type="number" value={add.sort_order}
              onChange={e=>setAdd(p=>({...p,sort_order:e.target.value}))}
              style={{...inputStyle, padding:"7px 9px", fontSize:12, textAlign:"right"}}/>
            <div style={{display:"flex", justifyContent:"flex-end"}}>
              <PrimBtn label={t("common.add")} Icon={IcAdd} onClick={create} disabled={busy}/>
            </div>
          </div>
        </div>

        <div style={{marginTop:13, padding:"9px 12px", background:T.ambL, border:`1px solid ${T.ambM}`,
          borderRadius:7, fontSize:11.5, color:T.t2, lineHeight:1.6}}>
         {t("tenders.bill_par_sirf_yahi_heads_lagte")}
          <b> {t("tenders.withheld")}</b>{t("tenders.to_yahan")} <b>{t("common.manual")}</b> {t("tenders.type_ka_head_banao_phir_har")}
        </div>
      </>)}
    </Modal>
  );
}

// ── NEW RA BILL WIZARD (3 step) ─────────────────────────────────────
function NewRaBillWizard({tenderId, defaultPremium, defaultGst, isItemRate, edit, onClose, onDone}) {
  // edit = draft bill ka detail object → wahi wizard PUT par chalta hai.
  const toast = useToast();
  const [step, setStep]   = useState(1);
  const [upto, setUpto]   = useState(edit?.upto_date ? String(edit.upto_date).slice(0,10) : new Date().toISOString().slice(0,10));
  const [prem, setPrem]   = useState(edit ? String(edit.premium_pct ?? "") : (defaultPremium === null || defaultPremium === undefined ? "" : String(defaultPremium)));
  const [manual, setManual] = useState(()=>{
    // Edit me manual heads ke snapshot amounts wapas bhar do.
    const m = {};
    for (const d of (edit?.deductions || [])) if (d.calc_type === "manual") m[d.head_name] = Number(d.amount||0);
    return m;
  });      // {head_name: amount}
  const [gst, setGst]     = useState(edit ? String(edit.gst_pct ?? "") : (defaultGst === null || defaultGst === undefined ? "" : String(defaultGst)));
  const [devReason, setDevReason] = useState(edit?.deviation_reason || "");
  const [prev, setPrev]   = useState(null);
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState(null);
  // 422 DEVIATION_EXCEEDED — BOQ se zyada kaam, reason chahiye.
  const [devBlock, setDevBlock] = useState(null);

  // Preview backend hi banata hai — koi ganit yahan dobara nahi likha,
  // warna screen aur bill alag-alag jawab de sakte hain.
  const runPreview = useCallback(async () => {
    if (!upto) return;
    setBusy(true); setErr(null);
    const body = {upto_date: upto, manual_deductions: manual};
    if (prem !== "") body.premium_pct = Number(prem);
    if (gst !== "")  body.gst_pct = Number(gst);
    if (devReason.trim()) body.deviation_reason = devReason.trim();
    if (edit) body.exclude_bill_id = edit.id;   // apne items billed me na girein
    const res = await api.post(`/tenders/${tenderId}/ra-bills/preview`, body);
    setBusy(false);
    if (!res?.success) {
      setPrev(null);
      // Deviation ka 422 alag hai — ye "galti" nahi, sirf reason maangta hai.
      if (res?.code === "DEVIATION_EXCEEDED") {
        setDevBlock(res.deviations || []); setErr(null);
      } else {
        setDevBlock(null);
        setErr({msg: res?.message || "Preview nahi bana", negatives: res?.negatives || null});
      }
      return;
    }
    setDevBlock(null);
    setPrev(res.data);
    if (prem === "" && res.data?.premium_pct !== undefined) setPrem(String(res.data.premium_pct));
  }, [tenderId, upto, prem, gst, devReason, manual]);

  useEffect(()=>{ if (step>=1) runPreview(); /* eslint-disable-next-line */ }, [upto, step]);

  const manualHeads = (prev?.deductions || []).filter(d=>d.calc_type === "manual");

  const save = async () => {
    setBusy(true);
    const body = {upto_date: upto, manual_deductions: manual};
    if (prem !== "") body.premium_pct = Number(prem);
    if (gst !== "")  body.gst_pct = Number(gst);
    if (devReason.trim()) body.deviation_reason = devReason.trim();
    const res = edit
      ? await api.put(`/tenders/${tenderId}/ra-bills/${edit.id}`, body)
      : await api.post(`/tenders/${tenderId}/ra-bills`, body);
    setBusy(false);
    if (!res?.success) { toast.error(res?.message || (edit ? "Update nahi hua" : "Bill nahi bana")); return; }
    toast.success(edit ? `RA-${edit.bill_no} update ho gaya` : `RA-${res.data?.bill_no} draft ban gaya`);
    onDone();
  };

  const Row = ({l, v, bold, color}) => (
    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0",
      fontSize:bold?13:12.5, fontWeight:bold?800:500, color:color||T.t2}}>
      <span>{l}</span><span style={{fontVariantNumeric:"tabular-nums"}}>{v}</span>
    </div>
  );

  const STEPS = ["Qty & Premium", "Deductions", "Review"];

  return (
    <Modal title={edit ? `RA-${edit.bill_no} Edit` : t("tenders.naya_ra_bill")} Icon={IcRupee} width={860}
      sub={`Step ${step} of 3 — ${STEPS[step-1]}`}
      onClose={onClose}
      footer={<>
        {step > 1 && <SecBtn label={t("common.peeche")} onClick={()=>setStep(s=>s-1)}/>}
        <div style={{flex:1}}/>
        <SecBtn label={t("common.cancel")} onClick={onClose}/>
        {step < 3 && <PrimBtn label={t("tenders.aage")} Icon={IcDown} onClick={()=>setStep(s=>s+1)} disabled={!prev||busy}/>}
        {step === 3 && <PrimBtn label={busy?t("tenders.save_ho_raha_hai"):(edit?t("tenders.update_draft"):t("crm.save_draft"))} Icon={IcChk} onClick={save} disabled={busy||!prev}/>}
      </>}>

      {/* Step strip */}
      <div style={{display:"flex", gap:6, marginBottom:14}}>
        {STEPS.map((s,i)=>(
          <div key={s} style={{flex:1, padding:"6px 9px", borderRadius:6, fontSize:11, fontWeight:700,
            textAlign:"center", background:i+1===step?T.indL:T.surfaceB,
            color:i+1===step?T.ind:i+1<step?T.grn:T.t4,
            border:`1px solid ${i+1===step?T.indM:T.b1}`}}>
            {i+1 < step ? "✓ " : ""}{i+1}. {s}
          </div>
        ))}
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (<>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13, marginBottom:14}}>
          <Field label={t("tenders.upto_date")} hint={t("tenders.is_tarikh_tak_ki_saari_measurement")}>
            <TxtIn type="date" value={upto} onChange={setUpto}/>
          </Field>
          {!isItemRate && (
            <Field label={t("tenders.premium_tender")} hint={t("tenders.award_par_lock_hua_premium_is")}>
              <div style={{display:"flex", gap:7}}>
                <TxtIn type="number" value={prem} onChange={setPrem} ph="0"/>
                <SecBtn label={t("tenders.lagao")} Icon={IcChk} onClick={runPreview}/>
              </div>
            </Field>
          )}
          {isItemRate && (
            <div style={{padding:"9px 12px", background:T.indL, border:`1px solid ${T.indM}`,
              borderRadius:7, fontSize:11.5, color:T.t2, lineHeight:1.5, alignSelf:"end"}}>
              <b style={{color:T.ind}}>{t("tenders.item_rate_tender")}</b> {t("tenders.bill_apne_quoted_rate_par_banta")}
            </div>
          )}
          <Field label={t("estimate_builder.gst")} hint={t("tenders.khali_chhodo_to_bill_me_gst")}>
            <div style={{display:"flex", gap:7}}>
              <TxtIn type="number" value={gst} onChange={setGst} ph="0"/>
              <SecBtn label={t("tenders.lagao")} Icon={IcChk} onClick={runPreview}/>
            </div>
          </Field>
        </div>
      </>)}

      {/* Deviation — BOQ qty se zyada kaam. Rokta nahi, reason maangta hai. */}
      {devBlock && (
        <div style={{padding:"11px 13px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8,
          fontSize:12, color:T.t2, marginBottom:12}}>
          <div style={{fontWeight:700, display:"flex", alignItems:"center", gap:7, color:T.amb}}>
            <IcWarn size={14} color={T.amb}/>{t("tenders.boq_qty_se_zyada_kaam_ho")}
          </div>
          <div style={{marginTop:7, fontSize:11.5, lineHeight:1.7}}>
            {devBlock.map((d,i)=>(
              <div key={i}><Rich k="tenders.boq_item_id_boq_fmtqty_d" params={{ boq_item_id: d.item_no || d.boq_item_id, fmtQty: fmtQty(d.effective_qty), d: d.unit||"", v: " ", fmtQty2: fmtQty(d.upto_qty), d2: d.unit||"" }} />{d.allowed_qty != null && <>{t("tenders.limit_tak_fmtqty", { fmtQty: fmtQty(d.allowed_qty) })}</>}
                {" "}(<b style={{color:T.amb}}>+{fmtQty(d.deviation_qty)}</b>)
              </div>
            ))}
          </div>
          <div style={{marginTop:9}}>
            <Field label={t("tenders.deviation_ka_reason")}
              hint={t("tenders.kam_se_kam_10_akshar_ye_3")}>
              <textarea value={devReason} onChange={e=>setDevReason(e.target.value)} rows={2}
                placeholder={t("tenders.e_g_site_condition_badla_ee")}
                style={{...inputStyle, resize:"vertical", lineHeight:1.5}}/>
            </Field>
            <div style={{marginTop:7}}>
              <PrimBtn label={t("tenders.reason_ke_saath_aage_badho")} Icon={IcChk}
                onClick={runPreview} disabled={devReason.trim().length < 10}/>
            </div>
          </div>
        </div>
      )}

      {/* Error (negative measurement etc.) */}
      {err && (
        <div style={{padding:"11px 13px", background:T.redL, border:`1px solid ${T.redM}`, borderRadius:8,
          fontSize:12, color:T.red, marginBottom:12}}>
          <div style={{fontWeight:700, display:"flex", alignItems:"center", gap:7}}>
            <IcWarn size={14} color={T.red}/>{err.msg}
          </div>
          {!!err.negatives?.length && (
            <div style={{marginTop:7, color:T.t2, fontSize:11.5, lineHeight:1.7}}>
              {err.negatives.map((n,i)=>(
                <div key={i}><Rich k="tenders.boq_item_id_measured_fmtqty_bill" params={{ boq_item_id: n.item_no || n.boq_item_id, fmtQty: fmtQty(n.measured_cum), fmtQty2: fmtQty(n.billed_cum) }} /></div>
              ))}
            </div>
          )}
        </div>
      )}

      {busy && !prev && <Loading text={t("tenders.preview_ban_raha_hai")}/>}

      {/* ── STEP 1 preview: item table ── */}
      {step === 1 && prev && (<>
        <div style={{fontSize:11, fontWeight:700, color:T.t3, marginBottom:7, textTransform:"uppercase",
          letterSpacing:".5px"}}>{t("tenders.is_bill_ke_items")}</div>
        {!prev.items?.length && <Empty Icon={IcTable} text={t("tenders.is_date_tak_koi_billable_measurement")}/>}
        {!!prev.items?.length && (
          <div style={{border:`1px solid ${T.b1}`, borderRadius:8, overflow:"hidden"}}>
            <div style={{display:"grid", gridTemplateColumns:"70px minmax(160px,2fr) 52px 84px 84px 84px 84px 104px",
              gap:8, padding:"7px 11px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}`}}>
              {["Item","Description","Unit","Prev Qty","Upto Qty","This Qty","Rate","Amount"].map((h,i)=>(
                <span key={i} style={{fontSize:9.5, fontWeight:700, color:T.t4, textTransform:"uppercase",
                  letterSpacing:".5px", textAlign:i>=3?"right":"left"}}>{h}</span>
              ))}
            </div>
            {prev.items.map((it,i)=>(
              <div key={i} style={{display:"grid", gridTemplateColumns:"70px minmax(160px,2fr) 52px 84px 84px 84px 84px 104px",
                gap:8, padding:"7px 11px", alignItems:"center",
                borderBottom:i<prev.items.length-1?`1px solid ${T.b1}`:"none"}}>
                <span style={{fontSize:11, color:T.ind, fontWeight:700}}>{it.item_no||"--"}</span>
                <span title={it.description} style={{fontSize:11.5, color:T.t1, overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{it.description}</span>
                <span style={{fontSize:11, color:T.t3}}>{it.unit||"--"}</span>
                <span style={{fontSize:11, color:T.t3, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{fmtQty(it.prev_qty)}</span>
                <span style={{fontSize:11, color:T.t3, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{fmtQty(it.upto_qty)}</span>
                <span style={{fontSize:11.5, color:T.t1, fontWeight:700, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{fmtQty(it.this_qty)}</span>
                <span style={{fontSize:11, color:T.t3, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{fmtQty(it.rate)}</span>
                <span style={{fontSize:11.5, color:T.t1, fontWeight:700, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{moneyF(it.amount)}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{marginTop:12, padding:"10px 13px", background:T.surfaceB, borderRadius:8,
          border:`1px solid ${T.b1}`}}>
          <Row l="Gross" v={money(prev.gross)}/>
          {prev.extra_total > 0 && (
            <Row l="  isme Extra items" v={money(prev.extra_total)} color={T.amb}/>
          )}
          {prev.premium_pct !== 0 && (
            <Row l={`Premium (${prev.premium_pct}% on ${money(prev.premium_base)})`}
              v={money(prev.premium_amount)}/>
          )}
          <div style={{borderTop:`1px solid ${T.b2}`, marginTop:5, paddingTop:3}}>
            <Row l="Subtotal" v={money(prev.subtotal)} bold color={T.t1}/>
          </div>
        </div>
      </>)}

      {/* ── STEP 2: deduction sheet ── */}
      {step === 2 && prev && (<>
        <div style={{fontSize:11, fontWeight:700, color:T.t3, marginBottom:7, textTransform:"uppercase",
          letterSpacing:".5px"}}>{t("tenders.deduction_sheet")}</div>
        <div style={{border:`1px solid ${T.b1}`, borderRadius:8, overflow:"hidden"}}>
          <div style={{display:"grid", gridTemplateColumns:"minmax(160px,2fr) 140px 90px 120px", gap:9,
            padding:"7px 12px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}`}}>
            {["Head","Type","Rate","Amount"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5, fontWeight:700, color:T.t4, textTransform:"uppercase",
                letterSpacing:".5px", textAlign:i>=2?"right":"left"}}>{h}</span>
            ))}
          </div>
          {!prev.deductions?.length && (
            <div style={{padding:"14px 12px", fontSize:12, color:T.t4}}>{t("tenders.koi_deduction_head_configured_nahi")}</div>
          )}
          {(prev.deductions||[]).map((d,i)=>(
            <div key={i} style={{display:"grid", gridTemplateColumns:"minmax(160px,2fr) 140px 90px 120px", gap:9,
              padding:"7px 12px", alignItems:"center",
              borderBottom:i<prev.deductions.length-1?`1px solid ${T.b1}`:"none"}}>
              <span style={{fontSize:12, color:T.t1, fontWeight:600}}>{d.head_name}</span>
              <span style={{fontSize:11, color:T.t3}}>{CALC_LABEL[d.calc_type] || d.calc_type}</span>
              <span style={{fontSize:11.5, color:T.t3, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>
                {d.calc_type==="pct_gross" && d.rate !== null ? `${d.rate}%` : d.calc_type==="fixed" ? fmtQty(d.rate) : "--"}
              </span>
              {d.calc_type === "manual" ? (
                <input type="number" value={manual[d.head_name] ?? ""}
                  onChange={e=>setManual(m=>({...m, [d.head_name]: e.target.value === "" ? 0 : Number(e.target.value)}))}
                  onBlur={runPreview} placeholder="0"
                  style={{...inputStyle, padding:"6px 9px", fontSize:12, textAlign:"right"}}/>
              ) : (
                <span style={{fontSize:12.5, color:T.t1, fontWeight:700, textAlign:"right",
                  fontVariantNumeric:"tabular-nums"}}>{moneyF(d.amount)}</span>
              )}
            </div>
          ))}
        </div>
        {!manualHeads.length && (
          <div style={{marginTop:11, padding:"9px 12px", background:T.surfaceB, border:`1px solid ${T.b1}`,
            borderRadius:7, fontSize:11.5, color:T.t3, lineHeight:1.6}}>
           {t("tenders.is_bill_me_alag_se_kuch")} <b>{t("tenders.deduction_setup")}</b> me
            <b> {t("common.manual")}</b> {t("tenders.type_ka_head_banao_bill_ke")}
          </div>
        )}
        <div style={{marginTop:12, padding:"10px 13px", background:T.surfaceB, borderRadius:8,
          border:`1px solid ${T.b1}`}}>
          <Row l="Subtotal" v={money(prev.subtotal)}/>
          {prev.gst_pct > 0 && (<>
            <Row l={`GST (${prev.gst_pct}%)`} v={money(prev.gst_amount)}/>
            <Row l="Bill Amount" v={money(prev.bill_amount)} bold color={T.t1}/>
          </>)}
          <Row l="Total Deductions" v={"− " + money(prev.deduction_total)} color={T.red}/>
          <div style={{borderTop:`1px solid ${T.b2}`, marginTop:5, paddingTop:3}}>
            <Row l="Net Payable" v={money(prev.net_payable)} bold color={T.grn}/>
          </div>
          {prev.gst_pct > 0 && (
            <div style={{marginTop:6, fontSize:10.5, color:T.t4, lineHeight:1.5}}>
             {t("tenders.deductions_gst_se_pehle_wali_value")}
            </div>
          )}
        </div>
      </>)}

      {/* ── STEP 3: review ── */}
      {step === 3 && prev && (<>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:9, marginBottom:13}}>
          <Stat label={t("tenders.upto_date_2")}  value={fmtDate(upto)}            color={T.ind} Icon={IcClock}/>
          <Stat label={t("common.items")}      value={prev.items?.length || 0}  color={T.ind} Icon={IcTable}/>
          <Stat label={t("tenders.subtotal")}   value={money(prev.subtotal)}     color={T.blu} Icon={IcRupee}/>
          <Stat label={t("subcon.net_payable")} value={money(prev.net_payable)} color={T.grn} Icon={IcRupee}/>
        </div>
        <div style={{padding:"11px 13px", background:T.surfaceB, borderRadius:8, border:`1px solid ${T.b1}`}}>
          <Row l="Gross" v={money(prev.gross)}/>
          {prev.extra_total > 0 && <Row l="  isme Extra items" v={money(prev.extra_total)} color={T.amb}/>}
          {prev.premium_pct !== 0 && (
            <Row l={`Premium (${prev.premium_pct}%)`} v={money(prev.premium_amount)}/>
          )}
          <Row l="Subtotal" v={money(prev.subtotal)}/>
          {prev.gst_pct > 0 && (<>
            <Row l={`GST (${prev.gst_pct}%)`} v={money(prev.gst_amount)}/>
            <Row l="Bill Amount" v={money(prev.bill_amount)}/>
          </>)}
          {(prev.deductions||[]).filter(d=>Number(d.amount)>0).map((d,i)=>(
            <Row key={i} l={`  ${d.head_name}`} v={"− " + money(d.amount)} color={T.red}/>
          ))}
          <div style={{borderTop:`1px solid ${T.b2}`, marginTop:5, paddingTop:3}}>
            <Row l="Net Payable" v={money(prev.net_payable)} bold color={T.grn}/>
          </div>
        </div>
        <div style={{marginTop:12, padding:"9px 12px", background:T.indL, border:`1px solid ${T.indM}`,
          borderRadius:7, fontSize:11.5, color:T.t2, lineHeight:1.6}}>
         {t("tenders.save_karne_par_bill")} <b>{t("payroll.draft")}</b> {t("tenders.banega_finance_me_transaction_tab_banegi")} <b>{t("tenders.submit")}</b> {t("tenders.karoge")}
        </div>
      </>)}
    </Modal>
  );
}

// ── RA BILL DETAIL DRAWER ───────────────────────────────────────────
function RaBillDrawer({tenderId, tender, billId, onClose, onChanged, onReceive, onEdit}) {
  const toast = useToast();
  const [d, setD]         = useState(null);
  const [loading, setLoad]= useState(true);
  const [busy, setBusy]   = useState(false);

  const load = useCallback(async () => {
    const res = await api.get(`/tenders/${tenderId}/ra-bills/${billId}`);
    setLoad(false);
    if (!res?.success) { toast.error(res?.message || "Bill load nahi hua"); onClose(); return; }
    setD(res.data);
  }, [tenderId, billId, toast, onClose]);
  useEffect(()=>{ load(); }, [load]);

  const submit = async () => {
    if (!await window.confirmAsync(
      `RA-${d.bill_no} submit karein?\n\nFinance me ${money(d.net_payable)} ki transaction banegi, phir bill lock ho jayega.`)) return;
    setBusy(true);
    const res = await api.post(`/tenders/${tenderId}/ra-bills/${billId}/submit`);
    setBusy(false);
    if (!res?.success) { toast.error(res?.message || "Submit nahi hua"); return; }
    toast.success("Bill submit ho gaya — Finance me transaction ban gayi");
    load(); onChanged();
  };

  const cancel = async () => {
    if (!await window.confirmAsync(t("tenders.ra_bill_no_cancel_karein", { bill_no: d.bill_no }))) return;
    setBusy(true);
    const res = await api.post(`/tenders/${tenderId}/ra-bills/${billId}/cancel`);
    setBusy(false);
    // Receipt-guard ka message backend se aata hai — jaisa hai waisa dikhao.
    if (!res?.success) { toast.error(res?.message || "Cancel nahi hua"); return; }
    toast.success("RA bill cancel ho gaya");
    load(); onChanged();
  };

  // Print: apni window me self-contained HTML (wahi tarika jo Payroll
  // payslip use karta hai) — app ki styles print me ghusti nahi.
  const print = () => {
    const esc = (v) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const inr = (n) => "Rs. " + Number(n||0).toLocaleString("en-IN", {minimumFractionDigits:2, maximumFractionDigits:2});
    // Government RA bill do part me chhapta hai — Part I agreement ke items,
    // Part II extra / non-tendered. Premium sirf Part I par lagta hai.
    const all = d.items || [];
    const partI  = all.filter(it => (it.item_type || "boq") === "boq");
    const partII = all.filter(it => (it.item_type || "boq") !== "boq");
    const rowsOf = (arr, off) => arr.map((it,i)=>`<tr>
      <td class="c">${off+i+1}</td><td>${esc(it.item_no)}</td><td>${esc(it.description)}</td>
      <td class="c">${esc(it.unit)}</td>
      <td class="r">${fmtQty(it.prev_qty)}</td><td class="r">${fmtQty(it.upto_qty)}</td>
      <td class="r"><b>${fmtQty(it.this_qty)}</b></td>
      <td class="r">${fmtQty(it.rate)}</td><td class="r"><b>${inr(it.amount)}</b></td></tr>`).join("");
    const sec = (label) => `<tr><td colspan="9" style="background:#e8e8e8;font-weight:bold">${label}</td></tr>`;
    const sub = (label, amt) => `<tr class="tot"><td colspan="8" class="r">${label}</td><td class="r">${inr(amt)}</td></tr>`;
    const partITotal  = partI.reduce((a,x)=>a+Number(x.amount||0), 0);
    const partIITotal = partII.reduce((a,x)=>a+Number(x.amount||0), 0);
    const itemRows = partII.length
      ? sec("Part I — Agreement Items") + rowsOf(partI, 0) + sub("Sub-total (Part I)", partITotal)
        + sec("Part II — Extra / Non-Tendered Items") + rowsOf(partII, partI.length)
        + sub("Sub-total (Part II)", partIITotal)
      : rowsOf(partI, 0);
    const dedRows = (d.deductions||[]).map(x=>`<tr>
      <td>${esc(x.head_name)}</td>
      <td class="c">${x.calc_type==="pct_gross"&&x.rate!==null?esc(x.rate)+"%":x.calc_type==="fixed"?"Fixed":"Manual"}</td>
      <td class="r">${inr(x.amount)}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>RA-${esc(d.bill_no)} ${esc(tender?.tender_no)}</title>
<style>
  @page { size:A4; margin:14mm; }
  *{box-sizing:border-box}
  body{font-family:"Times New Roman",Georgia,serif;color:#000;font-size:12px;margin:0}
  h1{font-size:17px;margin:0 0 2px;text-align:center;text-transform:uppercase;letter-spacing:.5px}
  .dept{text-align:center;font-size:13px;font-weight:bold;margin-bottom:2px}
  .sub{text-align:center;font-size:11px;margin-bottom:10px}
  .meta{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11.5px}
  .meta td{padding:3px 6px;border:1px solid #000}
  .meta td.k{font-weight:bold;width:132px;background:#f2f2f2}
  table.grid{width:100%;border-collapse:collapse;margin-bottom:12px}
  table.grid th,table.grid td{border:1px solid #000;padding:4px 5px;font-size:11px}
  table.grid th{background:#f2f2f2;font-size:10px;text-transform:uppercase}
  td.r,th.r{text-align:right} td.c,th.c{text-align:center}
  .tot td{font-weight:bold;background:#f7f7f7}
  .sheet{width:60%;margin-left:auto;border-collapse:collapse}
  .sheet td{border:1px solid #000;padding:4px 6px;font-size:11.5px}
  .words{margin:10px 0 18px;font-size:12px;border:1px solid #000;padding:6px 8px}
  .sign{display:flex;justify-content:space-between;margin-top:42px;font-size:11.5px}
  .sign div{text-align:center;border-top:1px solid #000;padding-top:4px;width:30%}
  @media print{ .noprint{display:none} }
</style></head><body>
  <div class="dept">${esc(tender?.party_name || tender?.department_name || "")}</div>
  <h1>Running Account Bill — RA ${esc(d.bill_no)}</h1>
  <div class="sub">${esc(tender?.title || "")}</div>
  <table class="meta">
    <tr><td class="k">Tender No</td><td>${esc(tender?.tender_no)}</td>
        <td class="k">Agreement No</td><td>${esc(tender?.agreement_no || "--")}</td></tr>
    <tr><td class="k">RA Bill No</td><td>RA-${esc(d.bill_no)}</td>
        <td class="k">Bill Date</td><td>${fmtDate(d.bill_date)}</td></tr>
    <tr><td class="k">Upto Date</td><td>${fmtDate(d.upto_date)}</td>
        <td class="k">Status</td><td>${esc((RA_STATUS_STYLE[d.status]||{}).label || d.status)}</td></tr>
  </table>
  <table class="grid">
    <thead><tr><th class="c">S.No</th><th>Item</th><th>Description</th><th class="c">Unit</th>
      <th class="r">Prev Qty</th><th class="r">Upto Qty</th><th class="r">This Qty</th>
      <th class="r">Rate</th><th class="r">Amount</th></tr></thead>
    <tbody>${itemRows || `<tr><td colspan="9" class="c">No items</td></tr>`}</tbody>
    <tfoot><tr class="tot"><td colspan="8" class="r">Gross</td><td class="r">${inr(d.gross)}</td></tr>
      ${Number(d.premium_pct) ? `<tr class="tot"><td colspan="8" class="r">Premium (${esc(d.premium_pct)}% on ${inr(d.premium_base ?? d.gross)})</td><td class="r">${inr(d.premium_amount)}</td></tr>` : ""}
      <tr class="tot"><td colspan="8" class="r">Subtotal (Value of Work Done)</td><td class="r">${inr(d.subtotal)}</td></tr>
      ${Number(d.gst_pct) ? `<tr class="tot"><td colspan="8" class="r">GST (${esc(d.gst_pct)}%)</td><td class="r">${inr(d.gst_amount)}</td></tr>
      <tr class="tot"><td colspan="8" class="r">Bill Amount</td><td class="r">${inr(d.bill_amount)}</td></tr>` : ""}</tfoot>
  </table>
  <table class="sheet">
    <tr><td colspan="3" style="font-weight:bold;background:#f2f2f2">Deduction Sheet</td></tr>
    ${dedRows || `<tr><td colspan="3">No deductions</td></tr>`}
    <tr><td style="font-weight:bold">Total Deductions</td><td></td><td class="r" style="font-weight:bold">${inr(d.deduction_total)}</td></tr>
    <tr><td style="font-weight:bold">Net Payable</td><td></td><td class="r" style="font-weight:bold">${inr(d.net_payable)}</td></tr>
  </table>
  ${Number(d.gst_pct) ? `<div style="font-size:10px;margin-top:4px;text-align:right">Deductions are computed on the pre-GST value of work done.</div>` : ""}
  ${d.deviation_reason ? `<div style="margin-top:8px;border:1px solid #000;padding:6px 8px;font-size:11px"><b>Deviation:</b> ${esc(d.deviation_reason)}</div>` : ""}
  <div class="words"><b>Net Payable (in words):</b> ${esc(numToWordsIN(d.net_payable))}</div>
  <div class="sign"><div>Prepared By</div><div>Checked By</div><div>Approved By</div></div>
  <script>window.print()</script>
</body></html>`;
    const w = window.open("", "_blank", "width=900,height=760");
    if (!w) { toast.error("Print window block ho gayi — browser me popup allow karo."); return; }
    w.document.write(html); w.document.close();
  };

  const st = d ? (RA_STATUS_STYLE[d.status] || RA_STATUS_STYLE.draft) : null;
  const bal = d ? Number(d.balance ?? d.net_payable) : 0;

  return (<>
    <div onClick={onClose} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:998}}/>
    <div style={{position:"fixed", top:0, right:0, bottom:0, width:"min(96vw,760px)", background:T.bg,
      zIndex:999, boxShadow:"-14px 0 40px rgba(0,0,0,.2)", display:"flex", flexDirection:"column",
      fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{padding:"13px 18px", background:T.surface, borderBottom:`1px solid ${T.b1}`,
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:10}}>
        <div style={{display:"flex", alignItems:"center", gap:10, minWidth:0}}>
          <IcRupee size={18} color={T.ind}/>
          <div style={{minWidth:0}}>
            <div style={{fontSize:15, fontWeight:800, color:T.t1}}>{t("tenders.ra_d", { d: d?.bill_no ?? "--" })}{st && <span style={{marginLeft:7}}><Pill label={st.label} c={st.c} bg={st.bg}/></span>}
            </div>
            <div style={{fontSize:11, color:T.t4, marginTop:1}}>{t("tenders.tender_no_upto_fmtdate", { tender_no: tender?.tender_no, fmtDate: fmtDate(d?.upto_date) })}</div>
          </div>
        </div>
        <button onClick={onClose} style={{background:"none", border:"none", cursor:"pointer", color:T.t3,
          lineHeight:0, padding:4}}><IcX size={18}/></button>
      </div>

      <div style={{flex:1, overflowY:"auto", padding:"14px 18px"}}>
        {loading && <Loading text={t("tenders.bill_load_ho_raha_hai")}/>}
        {!loading && d && (<>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:9, marginBottom:12}}>
            <Stat label={t("subcon.net_payable")} value={money(d.net_payable)} color={T.t1}  Icon={IcRupee}/>
            <Stat label={t("common.received")}    value={money(d.received ?? 0)} color={T.grn} Icon={IcRupee}/>
            <Stat label={t("common.balance")}     value={money(bal)} color={bal>0?T.amb:T.grn} Icon={IcClock}/>
          </div>

          <Panel style={{marginBottom:11}}>
            <PHead title={t("common.items")} sub={`${(d.items||[]).length} item`}/>
            <div style={{display:"grid", gridTemplateColumns:"64px minmax(140px,2fr) 46px 76px 76px 96px",
              gap:8, padding:"7px 13px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}`}}>
              {["Item","Description","Unit","This Qty","Rate","Amount"].map((h,i)=>(
                <span key={i} style={{fontSize:9.5, fontWeight:700, color:T.t4, textTransform:"uppercase",
                  letterSpacing:".5px", textAlign:i>=3?"right":"left"}}>{h}</span>
              ))}
            </div>
            {(d.items||[]).map((it,i)=>(
              <div key={i} style={{display:"grid", gridTemplateColumns:"64px minmax(140px,2fr) 46px 76px 76px 96px",
                gap:8, padding:"7px 13px", alignItems:"center",
                borderBottom:i<d.items.length-1?`1px solid ${T.b1}`:"none"}}>
                <span style={{fontSize:11, color:T.ind, fontWeight:700}}>{it.item_no||"--"}</span>
                <span title={it.description} style={{fontSize:11.5, color:T.t1, overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{it.description}</span>
                <span style={{fontSize:11, color:T.t3}}>{it.unit||"--"}</span>
                <span style={{fontSize:11.5, color:T.t1, fontWeight:700, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{fmtQty(it.this_qty)}</span>
                <span style={{fontSize:11, color:T.t3, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{fmtQty(it.rate)}</span>
                <span style={{fontSize:11.5, color:T.t1, fontWeight:700, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{moneyF(it.amount)}</span>
              </div>
            ))}
          </Panel>

          <Panel>
            <PHead title={t("tenders.deduction_sheet")}/>
            <div style={{padding:"10px 14px"}}>
              {[
                ["Gross", d.gross, null],
                ...(Number(d.extra_total) ? [["  isme Extra items", d.extra_total, null]] : []),
                ...(Number(d.premium_pct) ? [[`Premium (${d.premium_pct}%)`, d.premium_amount, null]] : []),
                ["Subtotal", d.subtotal, "rule"],
                ...(Number(d.gst_pct) ? [[`GST (${d.gst_pct}%)`, d.gst_amount, null],
                                         ["Bill Amount", d.bill_amount, null]] : []),
              ].map(([l,v,mark],i)=>(
                <div key={i} style={{display:"flex", justifyContent:"space-between", padding:"4px 0",
                  fontSize:12.5, color:T.t2, borderTop:mark==="rule"?`1px solid ${T.b1}`:"none",
                  marginTop:mark==="rule"?4:0, paddingTop:mark==="rule"?7:4,
                  fontWeight:mark==="rule"?700:500}}>
                  <span>{l}</span><span style={{fontVariantNumeric:"tabular-nums"}}>{money(v)}</span>
                </div>
              ))}
              {(d.deductions||[]).map((x,i)=>(
                <div key={i} style={{display:"flex", justifyContent:"space-between", padding:"4px 0",
                  fontSize:12, color:T.t3}}>
                  <span>{x.head_name}
                    <span style={{color:T.t4, fontSize:10.5, marginLeft:6}}>
                      {x.calc_type==="pct_gross"&&x.rate!==null?`${x.rate}%`:CALC_LABEL[x.calc_type]||""}
                    </span>
                  </span>
                  <span style={{color:T.red, fontVariantNumeric:"tabular-nums"}}>− {money(x.amount)}</span>
                </div>
              ))}
              <div style={{display:"flex", justifyContent:"space-between", padding:"7px 0 0", marginTop:4,
                borderTop:`2px solid ${T.b1}`, fontSize:14, fontWeight:800, color:T.grn}}>
                <span>{t("subcon.net_payable")}</span><span style={{fontVariantNumeric:"tabular-nums"}}>{money(d.net_payable)}</span>
              </div>
            </div>
          </Panel>
        </>)}
      </div>

      {/* Actions */}
      {!loading && d && (
        <div style={{padding:"11px 18px", background:T.surface, borderTop:`1px solid ${T.b1}`,
          display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
          {d.status === "draft" && (<>
            <PrimBtn label={t("tenders.submit")} Icon={IcChk} onClick={submit} disabled={busy}/>
            <SecBtn label={t("common.edit_2")} Icon={IcEdit} onClick={()=>onEdit(d)} disabled={busy}/>
            <SecBtn label={t("tenders.cancel_bill")} Icon={IcX} color={T.red} onClick={cancel} disabled={busy}/>
            <span style={{fontSize:10.5, color:T.t4, marginLeft:2}}>
             {t("tenders.draft_delete_ka_endpoint_nahi_hai")}
            </span>
          </>)}
          {d.status === "submitted" && (<>
            <PrimBtn label={t("tenders.receive")} Icon={IcRupee} color={T.grn} onClick={()=>onReceive(d)}/>
            <SecBtn label={t("mom.print")} Icon={IcDoc} onClick={print}/>
            <SecBtn label={t("tenders.cancel_bill")} Icon={IcX} color={T.red} onClick={cancel} disabled={busy}/>
          </>)}
          {d.status === "cancelled" && (
            <span style={{fontSize:12, color:T.t4}}>{t("tenders.ye_bill_cancel_ho_chuka_hai")}</span>
          )}
        </div>
      )}
    </div>
  </>);
}

// ── RA BILLS TAB ────────────────────────────────────────────────────
function RaBillsTab({tenderId, tender, bills, loading, reload, boqSummary}) {
  const [showSetup, setSetup]   = useState(false);
  const [showNew, setNew]       = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [openBill, setOpenBill] = useState(null);
  const [receiveOn, setRecv]    = useState(null);
  const [fin, setFin] = useState({parties:[], accounts:[], projects:[]});

  // Receive shortcut Finance ka hi form kholta hai — usko parties /
  // accounts / projects chahiye.
  useEffect(()=>{
    let dead = false;
    Promise.all([api.get("/finance/parties"), api.get("/finance/accounts"), api.get("/projects")])
      .then(([p,a,pr])=>{
        if (dead) return;
        setFin({
          parties:  p?.success && Array.isArray(p.data)  ? p.data : [],
          accounts: a?.success && Array.isArray(a.data)  ? a.data : [],
          projects: pr?.success && Array.isArray(pr.data) ? pr.data.map(x=>x.name) : [],
        });
      }).catch(()=>{});
    return ()=>{ dead = true; };
  }, []);

  const totals = useMemo(()=>{
    const live = (bills||[]).filter(b=>b.status!=="cancelled");
    return {
      count:    live.length,
      billed:   live.reduce((s,b)=>s+num(b.net_payable), 0),
      received: live.reduce((s,b)=>s+num(b.received), 0),
      balance:  live.reduce((s,b)=>s+num(b.balance), 0),
    };
  }, [bills]);

  const COLS = "68px 96px 96px 96px 104px 104px 96px 96px 96px";

  return (<>
    {!!(bills||[]).length && (
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:10, marginBottom:11}}>
        <Stat label={t("tenders.bills")}        value={totals.count}           note="cancelled chhod kar" color={T.ind} Icon={IcDoc}/>
        <Stat label={t("tenders.total_billed")} value={money(totals.billed)}   note={moneyF(totals.billed)}   color={T.blu} Icon={IcRupee}/>
        <Stat label={t("common.received")}     value={money(totals.received)} note={moneyF(totals.received)} color={T.grn} Icon={IcRupee}/>
        <Stat label={t("common.balance")}      value={money(totals.balance)}  note="abhi aana baaki"
          color={totals.balance>0?T.amb:T.grn} Icon={IcClock}/>
      </div>
    )}

    <Panel>
      <PHead title={t("tenders.ra_bills")} sub={(bills||[]).length ? `${bills.length} bill` : undefined}
        action={<div style={{display:"flex", gap:7}}>
          <SecBtn label={t("tenders.deduction_setup")} Icon={IcRupee} onClick={()=>setSetup(true)}/>
          <PrimBtn label={t("tenders.naya_ra_bill")} Icon={IcAdd} onClick={()=>setNew(true)}/>
        </div>}/>

      {loading && <Loading text={t("tenders.ra_bills_load_ho_rahe_hain")}/>}

      {!loading && !(bills||[]).length && (
        <Empty Icon={IcRupee} text={t("tenders.abhi_koi_ra_bill_nahi")}
          sub={t("tenders.measurement_mb_darj_hone_ke_baad")}/>
      )}

      {!loading && !!(bills||[]).length && (<>
        <div style={{display:"grid", gridTemplateColumns:COLS, padding:"8px 14px", gap:9,
          background:T.surfaceB, borderBottom:`1px solid ${T.b1}`}}>
          {["RA No","Bill Date","Upto Date","Gross","Deductions","Net","Received","Balance","Status"].map((h,i)=>(
            <span key={i} style={{fontSize:9.5, fontWeight:700, color:T.t4, textTransform:"uppercase",
              letterSpacing:".5px", textAlign:i>=3&&i<=7?"right":"left"}}>{h}</span>
          ))}
        </div>
        {bills.map((b,i)=>{
          const st  = RA_STATUS_STYLE[b.status] || RA_STATUS_STYLE.draft;
          const bal = num(b.balance);
          return (
            <div key={b.id} onClick={()=>setOpenBill(b.id)}
              style={{display:"grid", gridTemplateColumns:COLS, padding:"10px 14px", gap:9,
                alignItems:"center", cursor:"pointer",
                borderBottom:i<bills.length-1?`1px solid ${T.b1}`:"none",
                opacity:b.status==="cancelled"?0.6:1}}>
              <span style={{fontSize:12.5, fontWeight:700, color:T.ind}}>{t("tenders.ra_bill_no", { bill_no: b.bill_no })}</span>
              <span style={{fontSize:11.5, color:T.t3}}>{fmtDate(b.bill_date)}</span>
              <span style={{fontSize:11.5, color:T.t3}}>{fmtDate(b.upto_date)}</span>
              <span style={{fontSize:11.5, color:T.t2, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{moneyF(b.gross)}</span>
              <span style={{fontSize:11.5, color:T.red, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>− {moneyF(b.deduction_total)}</span>
              <span style={{fontSize:12.5, fontWeight:700, color:T.t1, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{moneyF(b.net_payable)}</span>
              <span style={{fontSize:11.5, color:num(b.received)>0?T.grn:T.t4, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{moneyF(b.received)}</span>
              <span style={{fontSize:12, fontWeight:600, textAlign:"right", fontVariantNumeric:"tabular-nums",
                color:bal>0?T.amb:T.grn}}>{moneyF(bal)}</span>
              <div style={{display:"flex"}}><Pill label={st.label} c={st.c} bg={st.bg}/></div>
            </div>
          );
        })}
      </>)}
    </Panel>

    {showSetup && (
      <DeductionSetupModal tenderId={tenderId} onClose={()=>setSetup(false)} onDone={reload}/>
    )}
    {showNew && (
      <NewRaBillWizard tenderId={tenderId}
        defaultPremium={boqSummary?.premium_pct_locked ?? boqSummary?.premium_pct ?? null}
        defaultGst={tender?.gst_pct ?? null} isItemRate={tender?.rate_type === "item_rate"}
        onClose={()=>setNew(false)} onDone={()=>{ setNew(false); reload(); }}/>
    )}
    {editBill && (
      <NewRaBillWizard tenderId={tenderId}
        defaultPremium={boqSummary?.premium_pct_locked ?? boqSummary?.premium_pct ?? null}
        defaultGst={tender?.gst_pct ?? null} isItemRate={tender?.rate_type === "item_rate"}
        edit={editBill}
        onClose={()=>setEditBill(null)} onDone={()=>{ setEditBill(null); reload(); }}/>
    )}
    {openBill && (
      <RaBillDrawer tenderId={tenderId} tender={tender} billId={openBill}
        onClose={()=>setOpenBill(null)} onChanged={reload}
        onReceive={(bill)=>{ setOpenBill(null); setRecv(bill); }}
        onEdit={(bill)=>{ setOpenBill(null); setEditBill(bill); }}/>
    )}
    {receiveOn && (
      <CreateTransactionModal
        type="Payment Received"
        preParty={tender?.party_name || ""}
        lockParty={true}
        preRaBillId={receiveOn.id}
        dbParties={fin.parties}
        dbAccounts={fin.accounts}
        dbProjects={fin.projects}
        onClose={()=>setRecv(null)}
        onSaved={()=>{ setRecv(null); reload(); }}
      />
    )}
  </>);
}

// minStage = is stage se pehle tab dikhta hi nahi.
//
// BOQ HAMESHA khula hai — bid usi BOQ par lagti hai (percentage tender me
// department ke SOR rate par premium, item-rate me apna rate). Isliye naya
// tender banate hi BOQ daalna padta hai, jeetne ka intezaar nahi.
//
// Measurement / RA bill / site tabhi jab kaam shuru ho (execution).
// Instruments + Documents hamesha — EMD aur NIT ki copy bid ke saath hi lagti hai.
const DETAIL_TABS = [
  {id:"overview",    get label() { return t("project_detail.overview"); },    Icon:IcGavel},
  {id:"boq",         label:"BOQ",         Icon:IcTable},
  // AI Plan jeetne ke baad khulta hai — planning pehle bhi ho sakti hai,
  // par execute (sites banna) server par execution+ se hi hota hai.
  {id:"aiplan",      label:"AI Plan",     Icon:IcTable,  minStage:"won"},
  {id:"measure",     get label() { return t("tenders.measurements"); },Icon:IcTable,  minStage:"execution"},
  {id:"rabills",     get label() { return t("tenders.ra_bills"); },    Icon:IcRupee,  minStage:"execution"},
  {id:"map",         get label() { return t("tenders.map"); },         Icon:IcMapPin, minStage:"execution"},
  {id:"sites",       get label() { return t("tenders.sites"); },       Icon:IcSite,   minStage:"execution"},
  {id:"instruments", get label() { return t("tenders.instruments"); }, Icon:IcBank},
  {id:"documents",   get label() { return t("tenders.documents"); },   Icon:IcDoc},
];
// Lost tender bidding par hi ruka hua mana jata hai — uske aage ka kuch
// nahi khulta.
const stageReached = (status, minStage) => {
  if (!minStage) return true;
  const cur = status === "lost" ? "bidding" : status;
  const ci = PIPELINE.indexOf(cur), mi = PIPELINE.indexOf(minStage);
  return ci >= 0 && mi >= 0 && ci >= mi;
};

function TenderDetail({tenderId, initialTab, freshBoq, onBack, onOpenProject}) {
  const toast = useToast();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState(initialTab || "overview");
  // BOQ import se AI Plan tak file ka haath-badal (Prafull ka idea 1)
  const [aiPlanFile, setAiPlanFile] = useState(null);
  const [showEdit, setShowEdit]   = useState(false);
  const [showInst, setShowInst]   = useState(false);
  const [moveTo, setMoveTo]       = useState(null);   // stage change modal ka target
  // NOTE: ye dono neeche (early return ke baad) the — React #310 "rendered more
  // hooks than during the previous render" se poora module crash kar raha tha.
  // Har hook conditional return se PEHLE hi rehna chahiye.
  const [instActionOn, setInstActionOn] = useState(null);   // {inst, action} — action form
  const [undoOn, setUndoOn]       = useState(null);          // galti se laga action wapas lena
  const isAdmin = ["admin","super_admin"].includes(getUser()?.role);
  const [showLink, setShowLink]   = useState(false);
  const [showSite, setShowSite]   = useState(false);
  const [showDoc,  setShowDoc]    = useState(false);
  // Sites tab supervisor dikhane ke liye — detail API supervisor nahi
  // deta, isliye /projects list se enrich karte hain.
  const [projMeta, setProjMeta] = useState({});
  // BOQ alag endpoint par hai. Tab kholne se pehle hi la lete hain taaki
  // tab par item_count ka badge dikh sake.
  const [boq, setBoq] = useState(null);
  const [boqLoading, setBoqLoading] = useState(true);
  // RA bills detail API par nahi aate. Measurements tab ko bhi inki zaroorat
  // hai — lock date inhi ke upto_date se nikalti hai — isliye detail level
  // par ek hi baar laate hain aur dono tab me bhejte hain.
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const loadBills = useCallback(async () => {
    const res = await api.get(`/tenders/${tenderId}/ra-bills`);
    setBillsLoading(false);
    if (res?.success && Array.isArray(res.data)) setBills(res.data);
  }, [tenderId]);
  useEffect(()=>{ loadBills(); }, [loadBills]);

  const load = useCallback(async () => {
    const res = await api.get(`/tenders/${tenderId}`);
    setLoading(false);
    if (!res?.success) { toast.error(res?.message || "Tender load nahi hua"); return; }
    setData(res.data);
  }, [tenderId, toast]);

  const loadBoq = useCallback(async () => {
    const res = await api.get(`/tenders/${tenderId}/boq`);
    setBoqLoading(false);
    if (!res?.success) return;   // tender 404 hone par detail khud error dikha dega
    setBoq(res);
  }, [tenderId]);

  useEffect(()=>{ setLoading(true); load(); }, [load]);
  useEffect(()=>{ setBoqLoading(true); loadBoq(); }, [loadBoq]);

  // Stage peeche gaya (admin) to jis tab par khade the wo gayab ho sakta hai —
  // aise me chupchaap Overview par le aao, warna khali screen dikhti.
  useEffect(()=>{
    if (!data) return;
    const t = DETAIL_TABS.find(x => x.id === tab);
    if (t && !stageReached(data.status, t.minStage)) setTab("overview");
  }, [data, tab]);

  useEffect(()=>{
    api.get("/projects").then(r=>{
      if (!r?.success) return;
      const m = {};
      for (const p of (r.data||[])) m[p.id] = p;
      setProjMeta(m);
    }).catch(()=>{});
  },[]);

  if (loading) return <div style={{padding:"14px 18px", background:T.bg, minHeight:"100%"}}><Loading text={t("tenders.tender_khul_raha_hai")}/></div>;
  if (!data)   return (
    <div style={{padding:"14px 18px", background:T.bg, minHeight:"100%"}}>
      <SecBtn label={t("common.peeche")} Icon={IcBack} onClick={onBack}/>
      <Empty Icon={IcGavel} text={t("tenders.tender_nahi_mila")}/>
    </div>
  );

  const sm = sMeta(data.status);
  const instruments = data.instruments || [];
  const documents   = data.documents   || [];
  const projects    = data.projects    || [];
  const alerts      = data.alerts      || [];

  const activeInst = instruments.filter(i=>i.status==="active");
  const securityHeld = activeInst.reduce((s,i)=>s+num(i.amount), 0);
  const releasedSum  = instruments.filter(i=>["released","refunded"].includes(i.status))
                                  .reduce((s,i)=>s+num(i.amount), 0);
  const expiringInst = activeInst.filter(i=>{
    const d = daysTo(i.validity_date);
    return d !== null && d <= 30;
  });

  const estimated = num(data.estimated_cost);
  const contract  = num(data.contract_value);
  const boqTotal  = num(boq?.summary?.boq_total);
  const boqManual = num(data.boq_value_manual);
  // Header/breakup ka base: imported jod pehle, warna haath se bhara.
  const boqShown  = boqTotal || boqManual;
  // Margin — Contract (jitna milega) vs Estimated Budget (jitne me karna
  // hai). Budget ab APNA andaza hai, department ka estimate nahi (Prafull,
  // 2026-08-30); isliye ye seedha expected profit hai.
  const margin = (estimated > 0 && contract > 0) ? contract - estimated : null;
  const taskBudget = data.task_budget || null;

  // Time elapsed — work order se stipulated completion tak.
  let timePct = null, timeNote = "Dates adhoori hain";
  if (data.work_order_date && data.stipulated_completion) {
    const start = new Date(data.work_order_date).getTime();
    const end   = new Date(data.stipulated_completion).getTime();
    if (end > start) {
      const now = Date.now();
      timePct = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
      const left = daysTo(data.stipulated_completion);
      timeNote = left === null ? "" : left >= 0 ? `${left} din bache` : `${Math.abs(left)} din late`;
    }
  }

  const undoInst = async (inst, reason) => {
    const res = await api.put(`/tenders/${tenderId}/instruments/${inst.id}`, {action:"undo", reason});
    if (!res?.success) { toast.error(res?.message || "Undo nahi hua"); return; }
    toast.success("Action wapas le liya");
    setUndoOn(null); load();
  };

  const unlink = async (p) => {
    if (!await window.confirmAsync(t("tenders.name_ko_is_tender_se_alag", { name: p.name }))) return;
    const res = await api.put(`/tenders/${tenderId}/link-project`, {project_id:p.id, action:"unlink"});
    if (!res?.success) { toast.error(res?.message || "Unlink nahi hua"); return; }
    toast.success(res.message || "Alag kar diya");
    load();
  };

  const delDoc = async (d) => {
    if (!await window.confirmAsync(t("tenders.document_name_hataayein", { name: d.name }))) return;
    const res = await api.del(`/tenders/${tenderId}/documents/${d.id}`);
    if (!res?.success) { toast.error(res?.message || "Delete nahi hua"); return; }
    toast.success("Document hat gaya");
    load();
  };

  const KEY_DATES = [
    ["NIT Date",             data.nit_date],
    ["Bid Submission Date",  data.submission_date],
    ["Techno-Commercial",    data.techno_commercial_date],
    ["Reverse Auction",      data.reverse_auction_date],
    ["LOA Date",             data.loa_date],
    ["Agreement Date",       data.agreement_date],
    ["Work Order Date",      data.work_order_date],
    ["Stipulated Completion",data.stipulated_completion],
    ["Actual Completion",    data.actual_completion_date],
    ["DLP End Date",         data.dlp_end_date],
  ];

  return (
    <div style={{padding:"14px 18px", fontFamily:"'Segoe UI',system-ui,sans-serif", background:T.bg, minHeight:"100%"}}>

      {/* ── HEADER ── */}
      <div style={{background:T.surface, border:`1px solid ${T.b1}`, borderRadius:8, padding:"12px 16px", marginBottom:11}}>
        <div style={{display:"flex", alignItems:"flex-start", gap:12, flexWrap:"wrap"}}>
          <button onClick={onBack}
            style={{width:30, height:30, borderRadius:7, border:`1px solid ${T.b1}`, background:T.surfaceB,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2}}>
            <IcBack size={15} color={T.t2}/>
          </button>
          <div style={{flex:1, minWidth:220}}>
            <div style={{display:"flex", alignItems:"center", gap:9, flexWrap:"wrap", marginBottom:3}}>
              <span style={{fontSize:11.5, fontWeight:700, color:T.ind, fontVariantNumeric:"tabular-nums"}}>{data.tender_no}</span>
              <Pill label={sm.label} c={sm.c} bg={sm.bg}/>
            </div>
            <div style={{fontSize:16, fontWeight:700, color:T.t1, letterSpacing:"-.2px", lineHeight:1.3}}>{data.title}</div>
            <div style={{fontSize:12, color:T.t3, marginTop:3}}>
              {data.party_name || data.department_name || t("tenders.department_set_nahi")}
            </div>
          </div>
          {/* Billing BOQ value par hoti hai, isliye dono upar dikhte hain
              (contract = BOQ ± above/below, wo bill ke aakhir me lagta hai). */}
          <div style={{textAlign:"right", flexShrink:0}}>
            <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px"}}>{t("tenders.boq_value")}</div>
            <div style={{fontSize:20, fontWeight:700, color:boqShown?T.blu:T.t4, fontVariantNumeric:"tabular-nums", lineHeight:1.2}}>
              {boqShown ? moneyF(boqShown) : "--"}
            </div>
            {!boqTotal && boqManual > 0 && (
              <div style={{fontSize:9, color:T.t4, textTransform:"uppercase", letterSpacing:".4px"}}>{t("tenders.manual")}</div>
            )}
          </div>
          <div style={{textAlign:"right", flexShrink:0}}>
            <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px"}}>{t("tenders.contract_value")}</div>
            <div style={{fontSize:20, fontWeight:700, color:contract?T.grn:T.t4, fontVariantNumeric:"tabular-nums", lineHeight:1.2}}>
              {contract ? moneyF(contract) : "--"}
            </div>
          </div>
          <SecBtn label={t("common.edit_2")} Icon={IcEdit} onClick={()=>setShowEdit(true)}/>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{display:"flex", gap:2, background:T.surface, borderRadius:8, padding:4,
        border:`1px solid ${T.b1}`, marginBottom:11, flexWrap:"wrap"}}>
        {DETAIL_TABS.filter(t=>stageReached(data.status, t.minStage)).map(t=>{
          const on = tab===t.id;
          const count = t.id==="sites" ? projects.length
                      : t.id==="instruments" ? instruments.length
                      : t.id==="documents" ? documents.length
                      : t.id==="boq" ? (boq?.summary?.item_count ?? null) : null;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{display:"inline-flex", alignItems:"center", gap:6, padding:"6px 13px", borderRadius:6,
                border:"none", background:on?T.indL:"none", color:on?T.ind:T.t3,
                fontSize:12.5, fontWeight:on?700:500, cursor:"pointer"}}>
              <t.Icon size={14} color={on?T.ind:T.t4}/>{t.label}
              {count !== null && count > 0 && (
                <span style={{background:on?T.ind:T.b2, color:on?"#fff":T.t3, fontSize:9, fontWeight:700,
                  padding:"0 5px", borderRadius:10}}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══ OVERVIEW ══ */}
      {tab==="overview" && (<>
        <AlertsStrip alerts={alerts}/>

        {/* Pipeline */}
        <Panel style={{marginBottom:11}}>
          <PHead title={t("tenders.tender_pipeline")}
            sub={data.status==="lost" ? t("tenders.yeh_tender_lost_hai_pipeline_aage") : undefined}
            action={(()=>{
              // Aage sirf ek step. Peeche jaana Edit modal me hai (admin-only) —
              // usko pipeline par button banane se galti se click hone ka dar hai.
              const nxt = nextStageOf(data.status);
              const canLost = data.status === "bidding";
              const canRevive = data.status === "lost" && isAdmin;
              if (!nxt && !canLost && !canRevive) return null;
              return (
                <div style={{display:"flex", gap:7}}>
                  {canLost && <SecBtn label={t("tenders.lost_mark_karo")} Icon={IcX} color={T.red}
                    onClick={()=>setMoveTo("lost")}/>}
                  {canRevive && <SecBtn label={t("tenders.wapas_bidding_me")} Icon={IcUndo}
                    onClick={()=>setMoveTo("bidding")}/>}
                  {nxt && <PrimBtn label={sMeta(nxt).label + " karo"} Icon={IcChk}
                    onClick={()=>setMoveTo(nxt)}/>}
                </div>
              );
            })()}/>
          <div style={{padding:"16px 18px"}}>
            {data.status==="lost" ? (
              <div style={{display:"flex", alignItems:"center", gap:10}}>
                <Pill label={t("crm.lost")} c={T.red} bg={T.redL}/>
                <span style={{fontSize:12.5, color:T.t3}}>
                 {t("tenders.bid_haar_gaye_emd_refund_pending")}
                </span>
              </div>
            ) : (
              <div style={{display:"flex", alignItems:"flex-start"}}>
                {PIPELINE.map((s,i)=>{
                  const idx = PIPELINE.indexOf(data.status);
                  const done = idx > i, here = idx === i;
                  const c = done ? T.grn : here ? T.ind : T.b1;
                  return (
                    <div key={s} style={{flex:1, minWidth:0, display:"flex", flexDirection:"column", alignItems:"center", position:"relative"}}>
                      {i>0 && <div style={{position:"absolute", top:11, right:"50%", width:"100%", height:2,
                        background:done||here?T.grn:T.b1}}/>}
                      <div style={{width:23, height:23, borderRadius:"50%", background:done||here?c:T.surface,
                        border:`2px solid ${c}`, display:"flex", alignItems:"center", justifyContent:"center",
                        zIndex:1, position:"relative", flexShrink:0}}>
                        {done ? <IcChk size={12} color="#fff" sw={3}/>
                              : <span style={{fontSize:10, fontWeight:800, color:here?"#fff":T.t4}}>{i+1}</span>}
                      </div>
                      <span style={{fontSize:10.5, marginTop:6, textAlign:"center", lineHeight:1.3,
                        fontWeight:here?700:500, color:here?T.ind:done?T.grn:T.t4}}>
                        {sMeta(s).label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        {/* Tiles */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:10, marginBottom:11}}>
          <Stat label={t("tenders.estimated_cost_2")} color={T.slt} Icon={IcRupee}
            value={estimated ? money(estimated) : "--"}
            note={taskBudget && taskBudget.estimate > 0
              ? t("tenders.task_budgets_note", { amt: money(taskBudget.estimate), n: taskBudget.projects_count })
              : (estimated ? moneyF(estimated) : "Set nahi")}/>
          <Stat label={t("tenders.contract_value")} color={T.grn} Icon={IcRupee}
            value={contract ? money(contract) : "--"}
            note={margin === null ? (contract ? moneyF(contract) : "Set nahi")
              : `${margin>=0?"+":"−"}${money(Math.abs(margin))} ${t("tenders.margin")}`}/>
          <Stat label={t("tenders.security_held")} color={securityHeld?T.blu:T.slt} Icon={IcLock}
            value={money(securityHeld)}
            note={`${activeInst.length} active instrument${activeInst.length===1?"":"s"}`}/>
          <Stat label={t("tenders.time_elapsed")} color={timePct===null?T.slt:timePct>100?T.red:timePct>80?T.amb:T.blu} Icon={IcClock}
            value={timePct===null ? "--" : `${timePct}%`}
            note={timeNote}/>
        </div>

        {/* Project Cost Breakup — estimate sheet ka aaina (BOQ → premium →
            GST → contingency/planning add-ons → total). */}
        <CostBreakupCard tenderId={tenderId} data={data} base={boqShown}
          manualTag={!boqTotal && boqManual > 0} isAdmin={isAdmin} onChanged={load}/>

        {/* Key dates */}
        <Panel style={{marginBottom:11}}>
          <PHead title={t("tenders.key_dates")}/>
          <div style={{padding:"13px 16px", display:"grid",
            gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:13}}>
            {KEY_DATES.map(([label,val])=>(
              <div key={label}>
                <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:3}}>{label}</div>
                <div style={{fontSize:12.5, color:val?T.t1:T.t4, fontWeight:val?600:400}}>{fmtDate(val)}</div>
              </div>
            ))}
            <div>
              <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:3}}>{t("tenders.agreement_no")}</div>
              <div style={{fontSize:12.5, color:data.agreement_no?T.t1:T.t4, fontWeight:data.agreement_no?600:400}}>{data.agreement_no || "--"}</div>
            </div>
            <div>
              <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:3}}>DLP</div>
              <div style={{fontSize:12.5, color:data.dlp_months?T.t1:T.t4, fontWeight:data.dlp_months?600:400}}>
                {data.dlp_months ? `${data.dlp_months} months` : "--"}
              </div>
            </div>
            <div>
              <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:3}}>{t("tenders.bid_submission_type")}</div>
              <div style={{fontSize:12.5, color:data.bid_submission_type?T.t1:T.t4, fontWeight:data.bid_submission_type?600:400}}>
                {(BID_SUBMISSION_TYPES.find(o=>o.v===data.bid_submission_type)||{}).l || "--"}
              </div>
            </div>
          </div>
          {data.nit_clauses && (
            <div style={{padding:"11px 16px", borderTop:`1px solid ${T.b1}`, background:T.surfaceB}}>
              <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:4}}>{t("tenders.nit_ke_main_points")}</div>
              <div style={{fontSize:12.5, color:T.t2, lineHeight:1.55, whiteSpace:"pre-wrap"}}>{data.nit_clauses}</div>
            </div>
          )}
          {data.notes && (
            <div style={{padding:"11px 16px", borderTop:`1px solid ${T.b1}`, background:T.surfaceB}}>
              <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:4}}>{t("common.notes")}</div>
              <div style={{fontSize:12.5, color:T.t2, lineHeight:1.55, whiteSpace:"pre-wrap"}}>{data.notes}</div>
            </div>
          )}
        </Panel>

        {/* Stage history — pichhle 5 change */}
        {!!(data.stage_log||[]).length && (
          <Panel style={{marginBottom:11}}>
            <PHead title={t("tenders.stage_history")} sub={t("tenders.pichhle_5_change")}/>
            <div style={{padding:"11px 16px", display:"flex", flexDirection:"column", gap:9}}>
              {data.stage_log.map(l=>{
                const f = sMeta(l.from_status), t2 = sMeta(l.to_status);
                return (
                  <div key={l.id} style={{display:"flex", gap:10, alignItems:"flex-start",
                    paddingBottom:9, borderBottom:`1px solid ${T.b1}`}}>
                    <div style={{display:"flex", alignItems:"center", gap:6, flexShrink:0}}>
                      <Pill label={f.label} c={f.c} bg={f.bg}/>
                      <span style={{color:T.t4, fontSize:11}}>→</span>
                      <Pill label={t2.label} c={t2.c} bg={t2.bg}/>
                    </div>
                    <div style={{minWidth:0, flex:1}}>
                      {l.note && <div style={{fontSize:12, color:T.t2, lineHeight:1.5,
                        whiteSpace:"pre-wrap"}}>{l.note}</div>}
                      <div style={{fontSize:10.5, color:T.t4, marginTop:l.note?3:0}}>
                        {fmtDate(l.created_at)}{l.created_by_name ? " · " + l.created_by_name : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* Sites summary — stage chahe koi bhi ho, jude hue project hamesha
            dikhte hain. Gating se pehle bane galat link bhi padhne chahiye. */}
        {!!projects.length && (
        <Panel>
          <PHead title={t("team_schedule.sites")} sub={`${projects.length} project is tender se jude hain`}
            action={stageReached(data.status,"execution")
              ? <SecBtn label={t("tenders.sites_tab")} onClick={()=>setTab("sites")}/> : undefined}/>
          {!!projects.length && (<>
            <div style={{display:"grid", gridTemplateColumns:"2.2fr 1fr 1fr", padding:"7px 16px",
              background:T.surfaceB, borderBottom:`1px solid ${T.b1}`, gap:10}}>
              {["Site","Status","Progress"].map(h=>(
                <span key={h} style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".6px"}}>{h}</span>
              ))}
            </div>
            {projects.map((p,i)=>(
              <div key={p.id} style={{display:"grid", gridTemplateColumns:"2.2fr 1fr 1fr", padding:"9px 16px", gap:10,
                alignItems:"center", borderBottom:i<projects.length-1?`1px solid ${T.b1}`:"none"}}>
                <span style={{fontSize:12.5, color:T.t1, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.name}</span>
                <span style={{fontSize:12, color:T.t2}}>{p.status || "--"}</span>
                <span style={{fontSize:12, color:T.t2, fontWeight:600}}>{num(p.progress_pct)}%</span>
              </div>
            ))}
          </>)}
        </Panel>
        )}
      </>)}

      {/* ══ BOQ ══ */}
      {tab==="boq" && (
        <BoqTab tenderId={tenderId} boq={boq} loading={boqLoading} reload={loadBoq}
          rateType={data.rate_type} autoImport={freshBoq} reloadTender={load} manualBoq={boqManual}
          onAiPlan={(file)=>{ setAiPlanFile(file); setTab("aiplan"); }}/>
      )}

      {/* ══ MEASUREMENTS ══ */}
      {tab==="measure" && (
        <MeasurementsTab tenderId={tenderId} sites={projects}
          boqItems={(boq && boq.data) || []} bills={bills}/>
      )}

      {/* ══ RA BILLS ══ */}
      {tab==="rabills" && (
        <RaBillsTab tenderId={tenderId} tender={data} bills={bills} loading={billsLoading}
          boqSummary={(boq && boq.summary) || null}
          reload={()=>{ loadBills(); load(); }}/>
      )}

      {/* ══ MAP ══ */}
      {tab==="map" && (
        <MapTab tenderId={tenderId} sites={projects}/>
      )}

      {/* ══ AI PLAN — workbook se site/task plan, AI ke saath ══ */}
      {tab==="aiplan" && (
        <TenderAiPlan tenderId={tenderId} onOpenProject={onOpenProject} initialFile={aiPlanFile}/>
      )}

      {/* ══ SITES ══ */}
      {tab==="sites" && (
        <Panel>
          <PHead title={t("tenders.linked_sites")} sub={t("tenders.is_tender_ke_against_chal_rahe")}
            action={<div style={{display:"flex", gap:7}}>
              <SecBtn label={t("tenders.link_existing_project")} Icon={IcLink} onClick={()=>setShowLink(true)}/>
              <PrimBtn label={t("tenders.new_site")} Icon={IcAdd} onClick={()=>setShowSite(true)}/>
            </div>}/>
          {!projects.length && (
            <Empty Icon={IcSite} text={t("tenders.abhi_koi_site_nahi")}
              sub={t("tenders.naya_project_banao_ya_pehle_se")}/>
          )}
          {!!projects.length && (<>
            <div style={{display:"grid", gridTemplateColumns:"2fr 1.2fr 1fr 1.2fr 150px", padding:"8px 16px",
              background:T.surfaceB, borderBottom:`1px solid ${T.b1}`, gap:10}}>
              {["Site","Supervisor","Status","Progress",""].map((h,i)=>(
                <span key={i} style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".6px"}}>{h}</span>
              ))}
            </div>
            {projects.map((p,i)=>{
              const meta = projMeta[p.id] || {};
              const pct = num(p.progress_pct);
              return (
                <div key={p.id} style={{display:"grid", gridTemplateColumns:"2fr 1.2fr 1fr 1.2fr 150px",
                  padding:"10px 16px", gap:10, alignItems:"center",
                  borderBottom:i<projects.length-1?`1px solid ${T.b1}`:"none"}}>
                  <span style={{fontSize:12.5, color:T.t1, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.name}</span>
                  <span style={{fontSize:12, color:meta.site_supervisor?T.t2:T.t4}}>{meta.site_supervisor || meta.pm_name || "--"}</span>
                  <span style={{fontSize:12, color:T.t2}}>{p.status || "--"}</span>
                  <div>
                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:3}}>
                      <span style={{fontSize:10.5, color:T.t4}}>{pct}%</span>
                    </div>
                    <div style={{height:4, background:T.b1, borderRadius:4, overflow:"hidden"}}>
                      <div style={{height:"100%", width:`${Math.min(pct,100)}%`,
                        background:pct>=100?T.grn:pct>=50?T.blu:T.amb, borderRadius:4}}/>
                    </div>
                  </div>
                  <div style={{display:"flex", gap:6, justifyContent:"flex-end"}}>
                    <SecBtn label={t("material_flow.open")} onClick={()=>onOpenProject && onOpenProject(p.id)}/>
                    <SecBtn label={t("tenders.unlink")} Icon={IcUnlink} color={T.red} onClick={()=>unlink(p)}/>
                  </div>
                </div>
              );
            })}
          </>)}
        </Panel>
      )}

      {/* ══ INSTRUMENTS ══ */}
      {tab==="instruments" && (<>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:10, marginBottom:11}}>
          <Stat label={t("tenders.held_with_dept")} color={securityHeld?T.blu:T.slt} Icon={IcLock}
            value={money(securityHeld)} note={`${activeInst.length} active`}/>
          <Stat label={t("tenders.released_refunded")} color={T.grn} Icon={IcChk}
            value={money(releasedSum)}
            note={`${instruments.filter(i=>["released","refunded"].includes(i.status)).length} instrument`}/>
          <Stat label={t("tenders.expiring_30d")} color={expiringInst.length?T.red:T.slt} Icon={IcWarn}
            value={expiringInst.length} note="validity nazdeek"/>
        </div>

        <Panel>
          <PHead title={t("tenders.instrument_register")} sub={t("tenders.emd_bg_fdr_security_deposit_2")}
            action={<PrimBtn label={t("tenders.add_instrument")} Icon={IcAdd} onClick={()=>setShowInst(true)}/>}/>
          {!instruments.length && (
            <Empty Icon={IcBank} text={t("tenders.abhi_koi_instrument_nahi")}
              sub={t("tenders.emd_bg_fdr_ya_security_deposit")}/>
          )}
          {!!instruments.length && (<>
            <div style={{display:"grid", gridTemplateColumns:"1.3fr 1.3fr 1.3fr 1fr 1fr 1fr 1fr 190px",
              padding:"8px 16px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}`, gap:9}}>
              {["Type","Mode / Ref","Bank","Amount","Issue","Validity","Status",""].map((h,i)=>(
                <span key={i} style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".6px"}}>{h}</span>
              ))}
            </div>
            {instruments.map((inst,i)=>{
              const im = INST_STATUS_META[inst.status] || {label:inst.status, c:T.t3, bg:T.sltL};
              const isActive = inst.status === "active";
              const d = daysTo(inst.validity_date);
              const expiring = isActive && d !== null && d <= 30;
              return (
                <div key={inst.id} style={{display:"grid",
                  gridTemplateColumns:"1.3fr 1.3fr 1.3fr 1fr 1fr 1fr 1fr 190px",
                  padding:"10px 16px", gap:9, alignItems:"center",
                  borderBottom:i<instruments.length-1?`1px solid ${T.b1}`:"none",
                  background:expiring ? T.redL : "transparent",
                  opacity:isActive ? 1 : 0.6}}>
                  <span style={{fontSize:12, fontWeight:700, color:T.t1}}>{typeLabel(inst.type)}</span>
                  <span style={{fontSize:12, color:T.t2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {[modeLabel(inst.mode), inst.ref_no].filter(Boolean).join(" · ") || "--"}
                  </span>
                  <span style={{fontSize:12, color:T.t2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{inst.bank_name || "--"}</span>
                  <span style={{fontSize:12, fontWeight:700, color:T.t1, fontVariantNumeric:"tabular-nums"}}>{money(inst.amount)}</span>
                  <span style={{fontSize:11.5, color:T.t3}}>{fmtDate(inst.issue_date)}</span>
                  <span style={{fontSize:11.5, color:expiring?T.red:T.t3, fontWeight:expiring?700:400}}>
                    {fmtDate(inst.validity_date)}
                    {expiring && <div style={{fontSize:9.5, fontWeight:700}}>{d<0?`${Math.abs(d)}d late`:`${d}d baaki`}</div>}
                  </span>
                  <span><Pill label={im.label} c={im.c} bg={im.bg}/></span>
                  <div style={{display:"flex", gap:5, justifyContent:"flex-end", flexWrap:"wrap"}}>
                    {isActive ? (<>
                      <SecBtn label={t("tenders.release")} onClick={()=>setInstActionOn({inst, action:"release"})}/>
                      <SecBtn label={t("tenders.refund")}  color={T.grn} onClick={()=>setInstActionOn({inst, action:"refund"})}/>
                      <SecBtn label={t("tenders.forfeit")} color={T.red} onClick={()=>setInstActionOn({inst, action:"forfeit"})}/>
                    </>) : (
                      <div style={{textAlign:"right", fontSize:10.5, color:T.t4, lineHeight:1.5}}>
                        <div style={{display:"flex", gap:6, alignItems:"center", justifyContent:"flex-end"}}>
                          <span style={{color:T.t3, fontWeight:600}}>{fmtDate(inst.release_date)}</span>
                          {isAdmin && <SecBtn label={t("tenders.undo")} Icon={IcUndo} onClick={()=>setUndoOn(inst)}/>}
                        </div>
                        {inst.action_amount != null && Number(inst.action_amount) !== Number(inst.amount) && (
                          <div style={{color:T.amb, fontWeight:700}}>{money(inst.action_amount)}</div>
                        )}
                        {inst.action_ref && <div title={inst.action_ref} style={{maxWidth:180,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{inst.action_ref}</div>}
                        {inst.action_by_name && <div>{inst.action_by_name}</div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>)}
        </Panel>

        {/* Instrument par kya-kya hua — action aur unka undo dono */}
        {!!(data.instrument_log || []).length && (
          <Panel style={{marginTop:11}}>
            <PHead title={t("tenders.instrument_history")} sub={t("tenders.release_refund_forfeit_aur_undo")}/>
            <div style={{padding:"11px 16px", display:"flex", flexDirection:"column", gap:9}}>
              {data.instrument_log.map(l=>{
                const am = {release:{l:t("tenders.release"), c:T.blu, bg:T.bluL},
                            refund:{l:t("tenders.refund"), c:T.grn, bg:T.grnL},
                            forfeit:{l:t("tenders.forfeit"), c:T.red, bg:T.redL},
                            undo:{l:t("tenders.undo"), c:T.amb, bg:T.ambL}}[l.action]
                        || {l:l.action, c:T.t3, bg:T.sltL};
                const isUndo = l.action === "undo";
                return (
                  <div key={l.id} style={{display:"flex", gap:10, alignItems:"flex-start",
                    paddingBottom:9, borderBottom:`1px solid ${T.b1}`}}>
                    <div style={{flexShrink:0}}><Pill label={am.l} c={am.c} bg={am.bg}/></div>
                    <div style={{minWidth:0, flex:1}}>
                      <div style={{fontSize:12, color:T.t1, fontWeight:600}}>
                        {typeLabel(l.inst_type)}{l.inst_ref_no ? ` · ${l.inst_ref_no}` : ""}
                        {l.amount != null && <span style={{marginLeft:8, color:T.t2}}>{money(l.amount)}</span>}
                      </div>
                      {isUndo && (
                        <div style={{fontSize:11, color:T.t3, marginTop:2}}>{t("tenders.from_status_active_l", { from_status: (INST_STATUS_META[l.from_status]||{}).label || l.from_status, l: l.remarks ? ` · purani wajah: ${l.remarks}` : "" })}</div>
                      )}
                      {!isUndo && (l.ref || l.remarks) && (
                        <div style={{fontSize:11.5, color:T.t2, marginTop:2, lineHeight:1.5}}>
                          {[l.ref, l.remarks].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {isUndo && l.reason && (
                        <div style={{fontSize:11.5, color:T.t2, marginTop:2, lineHeight:1.5}}>{l.reason}</div>
                      )}
                      <div style={{fontSize:10.5, color:T.t4, marginTop:3}}>
                        {fmtDate(l.created_at)}{l.created_by_name ? " · " + l.created_by_name : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}
      </>)}

      {/* ══ DOCUMENTS ══ */}
      {tab==="documents" && (
        <Panel>
          <PHead title={t("common.documents")} sub={t("tenders.nit_loa_agreement_bg_copy")}
            action={<PrimBtn label={t("tenders.upload_document")} Icon={IcUpload} onClick={()=>setShowDoc(true)}/>}/>
          {!documents.length && (
            <Empty Icon={IcDoc} text={t("tenders.abhi_koi_document_nahi")}
              sub={t("tenders.nit_loa_agreement_ya_bg_copy")}/>
          )}
          {!!documents.length && (<>
            <div style={{display:"grid", gridTemplateColumns:"110px 2.2fr 1.4fr 160px", padding:"8px 16px",
              background:T.surfaceB, borderBottom:`1px solid ${T.b1}`, gap:10}}>
              {["Type","Name","Uploaded",""].map((h,i)=>(
                <span key={i} style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".6px"}}>{h}</span>
              ))}
            </div>
            {documents.map((d,i)=>(
              <div key={d.id} style={{display:"grid", gridTemplateColumns:"110px 2.2fr 1.4fr 160px",
                padding:"10px 16px", gap:10, alignItems:"center",
                borderBottom:i<documents.length-1?`1px solid ${T.b1}`:"none"}}>
                <span><Pill label={docLabel(d.doc_type)} c={T.ind} bg={T.indL}/></span>
                <span style={{fontSize:12.5, color:T.t1, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{d.name}</span>
                <span style={{fontSize:11.5, color:T.t3}}>
                  {d.uploaded_by_name || "--"}
                  <div style={{fontSize:10.5, color:T.t4}}>{fmtDate(d.created_at)}</div>
                </span>
                <div style={{display:"flex", gap:6, justifyContent:"flex-end"}}>
                  <SecBtn label={t("common.view_2")} Icon={IcEye} onClick={()=>window.open(d.url, "_blank", "noopener")}/>
                  <SecBtn label={t("common.delete")} color={T.red} onClick={()=>delDoc(d)}/>
                </div>
              </div>
            ))}
          </>)}
        </Panel>
      )}

      {/* ── MODALS ── */}
      {/* onDeleted → list par wapas; TenderList mount hote hi dobara fetch karta hai. */}
      {showEdit && <EditTenderModal tender={data} boqBase={boqTotal} onClose={()=>setShowEdit(false)}
        onSaved={()=>load()} onDeleted={onBack}/>}
      {showInst && <AddInstrumentModal tenderId={tenderId} tenderStatus={data.status}
        onClose={()=>setShowInst(false)} onSaved={()=>load()}/>}
      {instActionOn && (
        <InstrumentActionModal tenderId={tenderId} inst={instActionOn.inst} action={instActionOn.action}
          onClose={()=>setInstActionOn(null)} onDone={()=>{ setInstActionOn(null); load(); }}/>
      )}
      {undoOn && (
        <BoqReasonModal
          title={t("tenders.action_wapas_lo")}
          sub={`${typeLabel(undoOn.type)} ${undoOn.ref_no || ""} · abhi ${(INST_STATUS_META[undoOn.status]||{}).label || undoOn.status}`}
          warn={`Instrument phir se Active ho jayega aur ${(INST_STATUS_META[undoOn.status]||{}).label || undoOn.status} wale saare details (amount, reference, wajah) hat jayenge — wo history me bach jayenge.`}
          confirmLabel="Wapas lo"
          onCancel={()=>setUndoOn(null)}
          onConfirm={(reason)=>undoInst(undoOn, reason)}/>
      )}
      {moveTo && <TransitionModal tender={data} projects={projects} target={moveTo}
        onClose={()=>setMoveTo(null)}
        onDone={async (o)=>{
          setMoveTo(null);
          // load() ka intezaar zaroori — warna instrument form purane status
          // (bidding) ke saath khulega aur dropdown me sirf EMD dikhega.
          await load();
          if (o?.openInstrument) { setTab("instruments"); setShowInst(true); }
        }}/>}
      {showLink && <LinkProjectModal tenderId={tenderId} onClose={()=>setShowLink(false)} onSaved={()=>load()}/>}
      {showSite && <NewSiteModal tender={data} onClose={()=>setShowSite(false)} onSaved={()=>load()}/>}
      {showDoc  && <AddDocumentModal tenderId={tenderId} onClose={()=>setShowDoc(false)} onSaved={()=>load()}/>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════════
export default function TendersModule({onOpenProject}) {
  // {id, tab} — naya tender banne par seedha BOQ tab par le jate hain,
  // kyunki bid usi BOQ par lagti hai.
  const [selected, setSelected] = useState(null);
  if (selected) return (
    <TenderDetail tenderId={selected.id} initialTab={selected.tab} freshBoq={selected.fresh}
      onBack={()=>setSelected(null)} onOpenProject={onOpenProject}/>
  );
  return <TenderList onOpen={(v)=>setSelected(typeof v === "object" ? v : {id:v})}/>;
}
