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
import * as XLSX from "xlsx";
import api, { getUser } from "../config/api";
import { useToast } from "../components/Toast";
// Receipt lene ke liye Finance ka hi form dobara use hota hai — TabParty aur
// TabTransaction bhi yahi karte hain, taaki receipt banane ke rules ek jagah rahein.
import { CreateTransactionModal } from "./FinanceModule";

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
  bidding:    {label:"Bidding",    c:T.slt, bg:T.sltL},
  won:        {label:"Won",        c:T.grn, bg:T.grnL},
  lost:       {label:"Lost",       c:T.red, bg:T.redL},
  agreement:  {label:"Agreement",  c:T.ind, bg:T.indL},
  execution:  {label:"Execution",  c:T.blu, bg:T.bluL},
  completed:  {label:"Completed",  c:T.pur, bg:T.purL},
  dlp:        {label:"DLP",        c:T.amb, bg:T.ambL},
  closed:     {label:"Closed",     c:T.t4,  bg:T.sltL},
};
const sMeta = (s) => STATUS_META[s] || {label:s||"--", c:T.t3, bg:T.sltL};

const INSTRUMENT_TYPES = [
  {v:"emd",              l:"EMD"},
  {v:"bg",               l:"Bank Guarantee"},
  {v:"fdr",              l:"FDR"},
  {v:"security_deposit", l:"Security Deposit"},
];
// Bid ke saath sirf EMD jama hoti hai — BG/FDR/SD tender jeetne ke baad.
const instrumentTypesFor = (status) =>
  status === "bidding" ? INSTRUMENT_TYPES.filter(t=>t.v==="emd") : INSTRUMENT_TYPES;

const BID_SUBMISSION_TYPES = [{v:"online", l:"Online"}, {v:"offline", l:"Offline / By Post"}];

// Bid kaise price hui — isse tay hota hai ki bill kis rate par banega.
//   percentage — department ke SOR rate par ±X% (premium alag line)
//   item_rate  — har item ka apna quoted rate, premium hota hi nahi
const RATE_TYPES = [
  {v:"percentage", l:"Percentage — SOR rate par ±%"},
  {v:"item_rate",  l:"Item Rate — har item ka apna rate"},
];
const INSTRUMENT_MODES = [
  {v:"dd",     l:"DD"},
  {v:"bg",     l:"BG"},
  {v:"fdr",    l:"FDR"},
  {v:"online", l:"Online"},
  {v:"cash",   l:"Cash"},
];
const INST_STATUS_META = {
  active:    {label:"Active",    c:T.blu, bg:T.bluL},
  released:  {label:"Released",  c:T.slt, bg:T.sltL},
  refunded:  {label:"Refunded",  c:T.grn, bg:T.grnL},
  forfeited: {label:"Forfeited", c:T.red, bg:T.redL},
  expired:   {label:"Expired",   c:T.amb, bg:T.ambL},
};
const DOC_TYPES = [
  {v:"nit",       l:"NIT"},
  {v:"loa",       l:"LOA"},
  {v:"agreement", l:"Agreement"},
  {v:"bg_copy",   l:"BG Copy"},
  {v:"other",     l:"Other"},
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
      {options.map(o=><option key={String(o.v)} value={o.v}>{o.l}</option>)}
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
        <span style={{fontSize:11.5, fontWeight:700, color:T.amb, textTransform:"uppercase", letterSpacing:".5px"}}>
          Dhyaan dein — {alerts.length} alert{alerts.length>1?"s":""}
        </span>
        {highCount>0 && (
          <span style={{background:T.red, color:"#fff", fontSize:9, fontWeight:800, padding:"1px 6px", borderRadius:10}}>
            {highCount} urgent
          </span>
        )}
        <div style={{flex:1}}/>
        {alerts.length>3 && (
          <button onClick={()=>setOpen(o=>!o)}
            style={{background:"none", border:"none", color:T.amb, fontSize:11, fontWeight:600, cursor:"pointer", padding:0}}>
            {open ? "Kam dikhao" : `+${alerts.length-3} aur`}
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
function NewTenderModal({onClose, onCreated}) {
  const toast = useToast();
  const [step, setStep]   = useState(1);
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState("");
  const [parties, setParties] = useState([]);
  const [form, setForm] = useState({
    tender_no:"", title:"", party_id:"", department_name:"",
    nit_date:"", submission_date:"", estimated_cost:"", emd_amount:"", tender_fee:"",
    techno_commercial_date:"", reverse_auction_date:"", bid_submission_type:"", nit_clauses:"",
    status:"bidding",
    contract_value:"", loa_date:"", agreement_no:"", agreement_date:"",
    work_order_date:"", stipulated_completion:"", dlp_months:"",
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  useEffect(()=>{
    api.get("/finance/parties?type=client").then(r=>{
      if (r?.success) setParties(r.data||[]);
    }).catch(()=>{});
  },[]);

  const isWon = form.status === "won";

  const goNext = () => {
    setErr("");
    if (!form.tender_no.trim()) return setErr("Tender number zaroori hai");
    if (!form.title.trim())     return setErr("Tender ka title zaroori hai");
    if (isWon) { setStep(2); return; }
    submit();
  };

  const submit = async () => {
    setErr(""); setBusy(true);
    if (isWon) {
      if (!form.contract_value) { setBusy(false); return setErr("Won tender ke liye contract value zaroori hai"); }
      if (!form.party_id)       { setBusy(false); return setErr("Won tender ke liye department/party zaroori hai"); }
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
  const partyOpts = parties.map(p=>({v:String(p.id), l:p.name}));

  return (
    <Modal title="Naya Tender" Icon={IcGavel} onClose={onClose} width={600}
      sub={isWon ? `Step ${step} of 2 — ${step===1?"Tender Info":"Won Details"}` : "Tender Info"}
      footer={<>
        {step===2 && <SecBtn label="Peeche" onClick={()=>setStep(1)}/>}
        <SecBtn label="Cancel" onClick={onClose}/>
        {step===1
          ? <PrimBtn label={isWon ? "Aage" : (busy?"Save ho raha...":"Tender Banao")} onClick={goNext} disabled={busy}/>
          : <PrimBtn label={busy?"Save ho raha...":"Tender Banao"} onClick={submit} disabled={busy}/>}
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
          <Field label="Tender Number *"><TxtIn value={form.tender_no} onChange={v=>set("tender_no",v)} ph="e.g. NIT/PWD/2026/114"/></Field>
          <Field label="Status"><SelIn value={form.status} onChange={v=>set("status",v)}
            options={[{v:"bidding",l:"Bidding"},{v:"won",l:"Won"}]}/></Field>
          <Field label="Title *" full><TxtIn value={form.title} onChange={v=>set("title",v)} ph="Kaam ka naam — e.g. Durg–Bhilai road strengthening"/></Field>

          <Field label="Department (Party)" full
            hint="Yeh list Finance ki Client-type parties se aati hai. Department na mile to pehle Finance → Parties me Client banao.">
            <SelIn value={form.party_id} onChange={v=>set("party_id",v)} options={partyOpts} ph="Department chuno..."/>
          </Field>
          <Field label="Department Name (free text)" full>
            <TxtIn value={form.department_name} onChange={v=>set("department_name",v)} ph="e.g. PWD Durg Division"/>
          </Field>

          <Field label="NIT Date"><TxtIn type="date" value={form.nit_date} onChange={v=>set("nit_date",v)}/></Field>
          <Field label="Bid Submission Date"><TxtIn type="date" value={form.submission_date} onChange={v=>set("submission_date",v)}/></Field>
          <Field label="Techno-Commercial Date"><TxtIn type="date" value={form.techno_commercial_date} onChange={v=>set("techno_commercial_date",v)}/></Field>
          <Field label="Bid Submission Type">
            <SelIn value={form.bid_submission_type} onChange={v=>set("bid_submission_type",v)}
              options={BID_SUBMISSION_TYPES} ph="Chuno..."/>
          </Field>
          <Field label="Reverse Auction Date" full
            hint="Bid ke baad reverse auction ho to uski date.">
            <TxtIn type="date" value={form.reverse_auction_date} onChange={v=>set("reverse_auction_date",v)}/>
          </Field>
          <Field label="NIT ke Main Points" full
            hint="Zaroori clause — SD %, completion period, penalty wagairah. NIT ki copy Documents tab me attach karo.">
            <textarea value={form.nit_clauses} onChange={e=>set("nit_clauses",e.target.value)} rows={3}
              style={{...inputStyle, resize:"vertical", lineHeight:1.5}}
              placeholder="e.g. Clause 5.2 — SD 10%, completion 12 months, LD 0.5%/week"/>
          </Field>

          <Field label="Estimated Cost (₹)"><TxtIn type="number" value={form.estimated_cost} onChange={v=>set("estimated_cost",v)} ph="0"/></Field>
          <Field label="EMD Amount (₹)"><TxtIn type="number" value={form.emd_amount} onChange={v=>set("emd_amount",v)} ph="0"/></Field>
          <Field label="Tender Fee (₹)"><TxtIn type="number" value={form.tender_fee} onChange={v=>set("tender_fee",v)} ph="0"/></Field>
        </div>
      )}

      {step===2 && (
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
          <div style={{gridColumn:"1/3", background:T.indL, border:`1px solid ${T.indM}`, borderRadius:7,
            padding:"9px 12px", fontSize:11.5, color:T.ind, lineHeight:1.5}}>
            Won tender ke liye <b>Contract Value</b> aur <b>Department/Party</b> dono zaroori hain — backend inke bina status won nahi karta.
          </div>
          <Field label="Contract Value (₹) *"><TxtIn type="number" value={form.contract_value} onChange={v=>set("contract_value",v)} ph="0"/></Field>
          <Field label="LOA Date"><TxtIn type="date" value={form.loa_date} onChange={v=>set("loa_date",v)}/></Field>
          <Field label="Agreement No."><TxtIn value={form.agreement_no} onChange={v=>set("agreement_no",v)} ph="e.g. AGR/2026/41"/></Field>
          <Field label="Agreement Date"><TxtIn type="date" value={form.agreement_date} onChange={v=>set("agreement_date",v)}/></Field>
          <Field label="Work Order Date"><TxtIn type="date" value={form.work_order_date} onChange={v=>set("work_order_date",v)}/></Field>
          <Field label="Stipulated Completion"><TxtIn type="date" value={form.stipulated_completion} onChange={v=>set("stipulated_completion",v)}/></Field>
          <Field label="DLP (months)"><TxtIn type="number" value={form.dlp_months} onChange={v=>set("dlp_months",v)} ph="e.g. 12"/></Field>
          {!form.party_id && (
            <div style={{gridColumn:"1/3"}}>
              <div style={{background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:7, padding:"8px 12px", fontSize:11.5, color:T.amb}}>
                Department/Party abhi khali hai — Step 1 me jaakar chuno.
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// EDIT TENDER MODAL — fields + status change
// ════════════════════════════════════════════════════════════════════
function EditTenderModal({tender, onClose, onSaved, onDeleted}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  // Delete sirf admin/super_admin — backend par bhi yahi requireRole hai.
  const isAdmin = ["admin","super_admin"].includes(getUser()?.role);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deleteMatch = deleteText.trim().toUpperCase() === "DELETE";
  const [parties, setParties] = useState([]);
  const [form, setForm] = useState({
    tender_no: tender.tender_no || "",
    title: tender.title || "",
    department_name: tender.department_name || "",
    party_id: tender.party_id ? String(tender.party_id) : "",
    status: tender.status || "bidding",
    estimated_cost: tender.estimated_cost ?? "",
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

  useEffect(()=>{
    api.get("/finance/parties?type=client").then(r=>{
      if (r?.success) setParties(r.data||[]);
    }).catch(()=>{});
  },[]);

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
    if (!form.tender_no.trim()) return setErr("Tender number zaroori hai");
    if (!form.title.trim())     return setErr("Tender ka title zaroori hai");
    if (wonMissing) return setErr("Is stage ke liye contract value aur department/party dono bharna zaroori hai");
    if (completionMissing) return setErr("Completion date zaroori hai — DLP isi se count hota hai.");
    if (stageChange && !stageChange.ok) return setErr(stageChange.msg);
    if (stageChange?.noteRequired && !form.status_note.trim())
      return setErr("Is stage change ke liye note likhna zaroori hai.");
    setBusy(true);
    const body = {
      tender_no: form.tender_no.trim(),
      title: form.title.trim(),
      department_name: form.department_name.trim() || null,
      party_id: form.party_id || null,
      status: form.status,
      estimated_cost: form.estimated_cost === "" ? null : form.estimated_cost,
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

  const handleDelete = async () => {
    if (!deleteMatch) return setErr("Type DELETE to confirm");
    setErr(""); setDeleting(true);
    const res = await api.del(`/tenders/${tender.id}`);
    setDeleting(false);
    if (!res?.success) { setErr(res?.message || "Tender delete nahi hua"); return; }
    const freed = Number(res.projects_freed || 0);
    toast.success(freed
      ? `Tender hata diya — ${freed} site free ho gayi`
      : "Tender hata diya gaya");
    onClose();
    onDeleted && onDeleted();
  };

  const partyOpts = parties.map(p=>({v:String(p.id), l:p.name}));
  // Dropdown me sirf wahi stage jahan asli me ja sakte hain — mojooda stage
  // hamesha, baaki checkTransition se. Asli rok backend par hai; ye sirf
  // galat option dikhne se rokta hai.
  const statusOpts = [tender.status, ...legalTargets(tender.status, isAdmin)]
    .map(v => ({v, l: sMeta(v).label}));
  const stageChange = form.status !== tender.status
    ? checkTransition(tender.status, form.status, isAdmin) : null;

  return (
    <Modal title="Tender Edit" Icon={IcEdit} onClose={onClose} width={640}
      sub={tender.tender_no}
      footer={<>
        <SecBtn label="Cancel" onClick={onClose}/>
        <PrimBtn label={busy?"Save ho raha...":"Save"} onClick={submit} disabled={busy}/>
      </>}>
      <ErrLine msg={err}/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label="Tender Number *"><TxtIn value={form.tender_no} onChange={v=>set("tender_no",v)}/></Field>
        <Field label="Status"
          hint={stageChange && !stageChange.ok ? stageChange.msg : undefined}>
          <SelIn value={form.status} onChange={v=>set("status",v)} options={statusOpts}/>
        </Field>
        {stageChange?.ok && (
          <Field label={stageChange.noteRequired ? "Stage Change Note *" : "Stage Change Note"} full
            hint={stageChange.kind === "backward"
              ? "Stage peeche ja raha hai — kyun, ye likhna zaroori hai."
              : "Ye note tender ki Stage History me dikhega."}>
            <TxtIn value={form.status_note} onChange={v=>set("status_note",v)}
              ph={sMeta(tender.status).label + " se " + sMeta(form.status).label + " — kyun?"}/>
          </Field>
        )}
        <Field label="Title *" full><TxtIn value={form.title} onChange={v=>set("title",v)}/></Field>

        {needsWonFields && (
          <div style={{gridColumn:"1/3", background:wonMissing?T.ambL:T.indL,
            border:`1px solid ${wonMissing?T.ambM:T.indM}`, borderRadius:7, padding:"9px 12px",
            fontSize:11.5, color:wonMissing?T.amb:T.ind, lineHeight:1.5}}>
            <b>{sMeta(form.status).label}</b> stage ke liye Contract Value aur Department/Party dono zaroori hain.
            {wonMissing && " Abhi ek ya dono khali hain — save block ho jayega."}
          </div>
        )}

        {needsCompletion && (
          <div style={{gridColumn:"1/3", background:completionMissing?T.ambL:T.indL,
            border:`1px solid ${completionMissing?T.ambM:T.indM}`, borderRadius:7, padding:"9px 12px",
            fontSize:11.5, color:completionMissing?T.amb:T.ind, lineHeight:1.5}}>
            <b>{sMeta(form.status).label}</b> stage ke liye <b>Actual Completion Date</b> zaroori hai — DLP isi se count hota hai.
            {completionMissing && " Abhi khali hai — save block ho jayega."}
          </div>
        )}

        <Field label={`Department (Party)${needsWonFields?" *":""}`} full
          hint="Finance ki Client-type parties. Naya department Finance → Parties me banao.">
          <SelIn value={form.party_id} onChange={v=>set("party_id",v)} options={partyOpts} ph="Department chuno..."/>
        </Field>
        <Field label="Department Name (free text)" full><TxtIn value={form.department_name} onChange={v=>set("department_name",v)}/></Field>

        <Field label="Estimated Cost (₹)"><TxtIn type="number" value={form.estimated_cost} onChange={v=>set("estimated_cost",v)}/></Field>
        <Field label={`Contract Value (₹)${needsWonFields?" *":""}`}><TxtIn type="number" value={form.contract_value} onChange={v=>set("contract_value",v)}/></Field>
        <Field label="EMD Amount (₹)"><TxtIn type="number" value={form.emd_amount} onChange={v=>set("emd_amount",v)}/></Field>
        <Field label="Tender Fee (₹)"><TxtIn type="number" value={form.tender_fee} onChange={v=>set("tender_fee",v)}/></Field>

        <Field label="Rate Type" full
          hint="Percentage me bill par premium ki alag line banti hai. Item-rate me har item ka apna rate hi final hai.">
          <SelIn value={form.rate_type} onChange={v=>set("rate_type",v)} options={RATE_TYPES}/>
        </Field>
        <Field label="GST %" hint="Khali = bill me GST ki line nahi.">
          <TxtIn type="number" value={form.gst_pct} onChange={v=>set("gst_pct",v)} ph="e.g. 18"/>
        </Field>
        <Field label="Deviation Limit %"
          hint="BOQ qty se itne % tak chhoot. Khali = sirf batayenge, rokenge nahi.">
          <TxtIn type="number" value={form.deviation_limit_pct} onChange={v=>set("deviation_limit_pct",v)} ph="e.g. 10"/>
        </Field>
        <Field label="NIT Date"><TxtIn type="date" value={form.nit_date} onChange={v=>set("nit_date",v)}/></Field>
        <Field label="Bid Submission Date"><TxtIn type="date" value={form.submission_date} onChange={v=>set("submission_date",v)}/></Field>
        <Field label="Techno-Commercial Date"><TxtIn type="date" value={form.techno_commercial_date} onChange={v=>set("techno_commercial_date",v)}/></Field>
        <Field label="Bid Submission Type">
          <SelIn value={form.bid_submission_type} onChange={v=>set("bid_submission_type",v)}
            options={BID_SUBMISSION_TYPES} ph="Chuno..."/>
        </Field>
        <Field label="Reverse Auction Date" full hint="Bid ke baad reverse auction ho to uski date.">
          <TxtIn type="date" value={form.reverse_auction_date} onChange={v=>set("reverse_auction_date",v)}/>
        </Field>
        <Field label="NIT ke Main Points" full
          hint="Zaroori clause — SD %, completion period, penalty wagairah. NIT ki copy Documents tab me attach karo.">
          <textarea value={form.nit_clauses} onChange={e=>set("nit_clauses",e.target.value)} rows={3}
            style={{...inputStyle, resize:"vertical", lineHeight:1.5}}
            placeholder="e.g. Clause 5.2 — SD 10%, completion 12 months, LD 0.5%/week"/>
        </Field>
        <Field label="LOA Date"><TxtIn type="date" value={form.loa_date} onChange={v=>set("loa_date",v)}/></Field>
        <Field label="Agreement No."><TxtIn value={form.agreement_no} onChange={v=>set("agreement_no",v)}/></Field>
        <Field label="Agreement Date"><TxtIn type="date" value={form.agreement_date} onChange={v=>set("agreement_date",v)}/></Field>
        <Field label="Work Order Date"><TxtIn type="date" value={form.work_order_date} onChange={v=>set("work_order_date",v)}/></Field>
        <Field label="Stipulated Completion"><TxtIn type="date" value={form.stipulated_completion} onChange={v=>set("stipulated_completion",v)}/></Field>
        <Field label={`Actual Completion Date${needsCompletion?" *":""}`}
          hint="Kaam asli me kab khatam hua. DLP isi se count hota hai.">
          <TxtIn type="date" value={form.actual_completion_date} onChange={v=>set("actual_completion_date",v)}/>
        </Field>
        <Field label="DLP (months)"><TxtIn type="number" value={form.dlp_months} onChange={v=>set("dlp_months",v)}/></Field>
        <Field label="DLP End Date"
          hint={form.dlp_end_date
            ? "Aapne khud set ki hai — yahi save hogi (auto calculation band)."
            : autoDlpEnd
              ? `Khali chhodo to auto — ${fmtDate(autoDlpEnd)} ban jayegi.`
              : "Khali chhodo to auto — completion date aur DLP months bharte hi ban jayegi."}>
          {/* type="date" input placeholder attribute ko ignore karta hai
              (browser khud dd-mm-yyyy dikhata hai), isliye auto value ek
              ghost chip me right side par overlay ki hai. */}
          <div style={{position:"relative"}}>
            <TxtIn type="date" value={form.dlp_end_date}
              onChange={v=>{setDlpEndTouched(true); set("dlp_end_date",v);}}/>
            {!form.dlp_end_date && !!autoDlpEnd && (
              <div style={{position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                pointerEvents:"none", fontSize:10.5, fontWeight:700, color:T.ind,
                background:T.indL, border:`1px solid ${T.indM}`, borderRadius:20, padding:"1px 8px"}}>
                auto: {fmtDate(autoDlpEnd)}
              </div>
            )}
          </div>
        </Field>

        <Field label="Notes" full>
          <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3}
            style={{...inputStyle, resize:"vertical", lineHeight:1.5}}
            onFocus={e=>e.target.style.borderColor=T.ind} onBlur={e=>e.target.style.borderColor=T.b1}/>
        </Field>

        {/* ── DANGER ZONE — admin/super_admin only ── */}
        {isAdmin && (
          <div style={{gridColumn:"1/3", marginTop:4, paddingTop:14, borderTop:`1px solid ${T.b1}`}}>
            <div style={{fontSize:13, fontWeight:700, color:T.red, marginBottom:8}}>Danger Zone</div>
            <div style={{background:T.redL, border:`1px solid ${T.redM}`, borderRadius:8, padding:"14px 16px"}}>
              <div style={{fontSize:13, fontWeight:600, color:T.red, marginBottom:4}}>Delete Tender</div>
              <div style={{fontSize:12, color:T.t3, lineHeight:1.55, marginBottom:12}}>
                Tender ka record, uske saare instruments aur documents hide ho jayenge.
                Isse judi <b>projects delete NAHI hongi</b> — wo sirf is tender se free ho
                jayengi aur baad me kisi doosre tender se jodi ja sakti hain.
              </div>
              {!confirmDelete ? (
                <button onClick={()=>setConfirmDelete(true)}
                  style={{padding:"7px 14px", borderRadius:7, background:T.surface,
                    border:`1.5px solid ${T.redM}`, color:T.red, fontSize:12, fontWeight:600, cursor:"pointer"}}>
                  Delete Tender
                </button>
              ) : (
                <div>
                  <div style={{fontSize:12, color:T.red, marginBottom:8}}>
                    Confirm karne ke liye <strong>DELETE</strong> type karo:
                  </div>
                  <input value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder="Type DELETE to confirm"
                    style={{width:"100%", padding:"8px 11px", borderRadius:7, border:`1.5px solid ${T.redM}`,
                      fontSize:12.5, color:T.t1, background:T.surface, outline:"none",
                      boxSizing:"border-box", fontFamily:"inherit", marginBottom:10}}/>
                  <div style={{display:"flex", gap:6}}>
                    <button onClick={()=>{setConfirmDelete(false); setDeleteText("");}}
                      style={{flex:1, padding:"8px", borderRadius:7, background:T.surface,
                        border:`1px solid ${T.b1}`, color:T.t3, fontSize:12, fontWeight:600, cursor:"pointer"}}>
                      Cancel
                    </button>
                    <button onClick={handleDelete} disabled={deleting||!deleteMatch}
                      style={{flex:2, padding:"8px", borderRadius:7, background:deleteMatch?T.red:T.b1,
                        border:"none", color:"white", fontSize:12, fontWeight:700,
                        cursor:deleteMatch?"pointer":"not-allowed"}}>
                      {deleting ? "Deleting..." : "Permanently Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// LIST SCREEN
// ════════════════════════════════════════════════════════════════════
// Poora pipeline + Lost sabse aakhir me (wo stage nahi, dead-end hai).
const CHIPS = [
  {id:"all",       label:"All"},
  ...PIPELINE.map(s => ({id:s, label:sMeta(s).label})),
  {id:"lost",      label:"Lost"},
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
    {label:"Active Tenders",    value:kpis.active_count,                note:"lost + closed chhod kar", color:T.ind, Icon:IcGavel},
    {label:"Contract Value",    value:money(kpis.contract_value_sum),   note:"won aur uske aage",       color:T.grn, Icon:IcRupee},
    {label:"EMD Locked",        value:money(kpis.emd_locked),           note:"active EMD",              color:T.blu, Icon:IcLock},
    {label:"BG Expiring ≤30d",  value:kpis.bg_expiring_30d,             note:"BG / FDR validity",       color:kpis.bg_expiring_30d?T.red:T.slt, Icon:IcBank},
    {label:"EMD Refund Pending",value:kpis.emd_refund_pending,          note:"lost tenders ka EMD",     color:kpis.emd_refund_pending?T.amb:T.slt, Icon:IcClock},
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
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tender no, title ya department dhoondo..."
            style={{width:"100%", height:32, padding:"0 9px 0 28px", borderRadius:6,
              border:`1.5px solid ${search?T.ind:T.b1}`, fontSize:12.5, color:T.t1,
              background:search?T.indL:T.surfaceB, outline:"none", boxSizing:"border-box", fontFamily:"inherit"}}
            onFocus={e=>{e.target.style.borderColor=T.ind; e.target.style.background=T.indL;}}
            onBlur={e=>{if(!search){e.target.style.borderColor=T.b1; e.target.style.background=T.surfaceB;}}}/>
        </div>

        <PrimBtn label="Naya Tender" Icon={IcAdd} onClick={()=>setShowNew(true)}/>
      </div>

      {/* Table */}
      <Panel>
        <div style={{display:"grid", gridTemplateColumns:"minmax(220px,2.4fr) 1.4fr 1fr 110px 80px 90px",
          padding:"8px 15px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}`, gap:10}}>
          {["Tender","Department","Value","Status","Sites","Alerts"].map(h=>(
            <span key={h} style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".6px"}}>{h}</span>
          ))}
        </div>

        {loading && <Loading text="Tenders load ho rahe hain..."/>}

        {!loading && !filtered.length && (
          <Empty Icon={IcGavel}
            text={rows.length ? "Is filter me koi tender nahi." : "Abhi koi tender nahi."}
            sub={rows.length ? "Doosra status chip try karo." : "Upar \"Naya Tender\" se pehla record banao."}/>
        )}

        {!loading && filtered.map((r,i)=>{
          const sm = sMeta(r.status);
          const ta = alertsByTender[r.id] || [];
          const high = ta.some(a=>a.severity==="high");
          const value = num(r.contract_value) || num(r.estimated_cost);
          const isEst = !num(r.contract_value) && num(r.estimated_cost) > 0;
          return (
            <div key={r.id} onClick={()=>onOpen(r.id)}
              style={{display:"grid", gridTemplateColumns:"minmax(220px,2.4fr) 1.4fr 1fr 110px 80px 90px",
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
                {isEst && <div style={{fontSize:9.5, color:T.t4, textTransform:"uppercase", letterSpacing:".4px"}}>estimated</div>}
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
  release: {title:"Release", c:T.blu,
    sub:"Bank / department ne instrument release kar diya",
    amtLabel:"Released amount (₹)", refLabel:"Release letter / reference"},
  refund:  {title:"Refund",  c:T.grn,
    sub:"Paisa wapas aa gaya",
    amtLabel:"Wapas aaya amount (₹)", refLabel:"UTR / cheque / reference"},
  forfeit: {title:"Forfeit", c:T.red,
    sub:"Instrument zabt ho gaya — paisa wapas nahi aayega",
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
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const isForfeit = action === "forfeit";
  const amtNum = numOf(form.amount);
  const instAmt = numOf(inst?.amount);
  const shortReason = isForfeit && form.remarks.trim().length < 10;
  const partial = amtNum > 0 && amtNum < instAmt;

  const submit = async () => {
    setErr("");
    if (!form.date) return setErr("Date zaroori hai");
    if (form.date > todayYMD()) return setErr("Date aaj se aage ki nahi ho sakti");
    if (amtNum <= 0) return setErr("Amount 0 se bada hona chahiye");
    if (amtNum > instAmt + 0.009) return setErr(`Instrument ${moneyF(instAmt)} ka hai — usse zyada nahi ho sakta`);
    if (shortReason) return setErr("Forfeit karne ki wajah likhna zaroori hai (kam se kam 10 akshar).");
    setBusy(true);
    const res = await api.put(`/tenders/${tenderId}/instruments/${inst.id}`, {
      action,
      release_date: form.date,
      action_amount: form.amount,
      action_ref: form.ref.trim() || null,
      action_mode: form.mode || null,
      action_remarks: form.remarks.trim() || null,
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
        <SecBtn label="Cancel" onClick={onClose}/>
        <PrimBtn label={busy ? "Ho raha hai..." : `${meta.title} karo`} Icon={IcChk}
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
          <span><b style={{color:T.red}}>Ye paisa wapas nahi aayega.</b> Forfeit ek hi baar hota hai —
            uske baad status badla nahi ja sakta.</span>
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
          <TxtIn value={form.ref} onChange={v=>set("ref",v)} ph="e.g. UTR 1234567890 / EE/2026/442"/>
        </Field>
        {action === "refund" && (
          <Field label="Kaise wapas aaya" full>
            <SelIn value={form.mode} onChange={v=>set("mode",v)} options={INSTRUMENT_MODES} ph="Chuno..."/>
          </Field>
        )}
        <Field label={isForfeit ? "Wajah *" : "Remarks"} full
          hint={isForfeit ? "Kam se kam 10 akshar — record me hamesha rahega." : undefined}>
          <textarea value={form.remarks} onChange={e=>set("remarks",e.target.value)} rows={2}
            placeholder={isForfeit ? "e.g. Bid withdraw kiya, EMD zabt hui" : "Optional"}
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

  const from = tender.status;
  const t = checkTransition(from, target, isAdmin);

  // Backend ke do hard gate — yahan pehle hi pakad lete hain.
  const needsWon = WON_OR_LATER.includes(target);
  const wonMissing = needsWon && (tender.contract_value === null || tender.contract_value === undefined
    || tender.contract_value === "" || !tender.party_id);
  const completionMissing = COMPLETION_REQUIRED.includes(target) && !tender.actual_completion_date;

  // Sirf salah — adhoore project ginwa dete hain par rokte nahi.
  const openProjects = target === "completed"
    ? (projects || []).filter(p => String(p.status||"").toLowerCase() !== "completed")
    : [];

  const blocked = !t.ok || wonMissing || completionMissing;
  const noteMissing = t.noteRequired && !note.trim();

  const go = async () => {
    setErr("");
    if (noteMissing) return setErr("Is stage change ke liye note likhna zaroori hai.");
    setBusy(true);
    const body = {status: target};
    if (note.trim()) body.status_note = note.trim();
    const res = await api.put(`/tenders/${tender.id}`, body);
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Stage change nahi hua"); return; }
    toast.success(`Tender ab ${sMeta(target).label} me hai`);
    onDone();
  };

  const fm = sMeta(from), tm = sMeta(target);

  return (
    <Modal title="Stage Change" Icon={IcGavel} width={560}
      sub={`${fm.label} se ${tm.label}`}
      onClose={onClose}
      footer={<>
        <SecBtn label="Cancel" onClick={onClose}/>
        <PrimBtn label={busy ? "Ho raha hai..." : `${tm.label} karo`} Icon={IcChk}
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
      {!t.ok && (
        <div style={{padding:"10px 12px", background:T.redL, border:`1px solid ${T.redM}`,
          borderRadius:7, fontSize:12, color:T.red, display:"flex", gap:8, alignItems:"flex-start",
          marginBottom:11}}>
          <IcWarn size={14} color={T.red}/><span>{t.msg}</span>
        </div>
      )}

      {/* Hard gates — Edit modal me jaakar bharna padega */}
      {wonMissing && (
        <div style={{padding:"10px 12px", background:T.ambL, border:`1px solid ${T.ambM}`,
          borderRadius:7, fontSize:12, color:T.t2, lineHeight:1.6, marginBottom:11}}>
          <b style={{color:T.amb}}>Pehle ye bharo</b> — {tm.label} par jaane ke liye
          <b> Contract Value</b> aur <b>Department/Party</b> dono zaroori hain.
          Upar <b>Edit</b> button se bhar do, phir yahan wapas aao.
        </div>
      )}
      {completionMissing && (
        <div style={{padding:"10px 12px", background:T.ambL, border:`1px solid ${T.ambM}`,
          borderRadius:7, fontSize:12, color:T.t2, lineHeight:1.6, marginBottom:11}}>
          <b style={{color:T.amb}}>Pehle ye bharo</b> — <b>Actual Completion Date</b> ke bina
          {" "}{tm.label} nahi hota (DLP isi date se count hota hai). Edit me bhar do.
        </div>
      )}

      {/* Won — instrument reminder (sirf yaad dilana) */}
      {t.ok && target === "won" && (
        <div style={{padding:"10px 12px", background:T.indL, border:`1px solid ${T.indM}`,
          borderRadius:7, fontSize:12, color:T.t2, lineHeight:1.6, marginBottom:11}}>
          <b style={{color:T.ind}}>Yaad rakho</b> — jeetne ke baad{" "}
          <b>BG / FDR / Security Deposit</b> jo bhi department maange, wo{" "}
          <b>Instruments</b> tab me add karna hoga. (Abhi rok nahi hai, baad me bhi kar sakte ho.)
        </div>
      )}

      {/* Completed — adhoore project, warning bhar */}
      {t.ok && !!openProjects.length && (
        <div style={{padding:"10px 12px", background:T.ambL, border:`1px solid ${T.ambM}`,
          borderRadius:7, fontSize:12, color:T.t2, lineHeight:1.6, marginBottom:11}}>
          <b style={{color:T.amb}}>{openProjects.length} site abhi complete nahi hai</b>
          <div style={{marginTop:5}}>
            {openProjects.map(p=>(
              <div key={p.id} style={{fontSize:11.5}}>
                • {p.name} <span style={{color:T.t4}}>({p.status || "--"})</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:6, color:T.t3, fontSize:11}}>
            Phir bhi aage badh sakte ho — kaagzi taur par tender pehle band ho jata hai.
          </div>
        </div>
      )}

      {/* Note */}
      {t.ok && (
        <Field label={t.noteRequired ? "Note *" : "Note (optional)"}
          hint={t.kind === "backward"
            ? "Stage peeche ja raha hai — kyun, ye record me rahega."
            : "Ye note tender ki Stage History me dikhega."}>
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3}
            style={{...inputStyle, resize:"vertical", lineHeight:1.5}}
            placeholder={t.kind === "lost"
              ? "e.g. L1 se 4% zyada the"
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
    if (!form.amount || Number(form.amount) <= 0) return setErr("Amount zaroori hai aur 0 se bada hona chahiye");
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
    <Modal title="Naya Instrument" Icon={IcBank} onClose={onClose} width={560}
      sub={bidOnly ? "Bid stage — sirf EMD" : "EMD / BG / FDR / Security Deposit"}
      footer={<>
        <SecBtn label="Cancel" onClick={onClose}/>
        <PrimBtn label={busy?"Save ho raha...":"Jodo"} onClick={submit} disabled={busy}/>
      </>}>
      <ErrLine msg={err}/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label="Type *" hint={bidOnly ? "BG / FDR / Security Deposit tender won hone ke baad." : undefined}>
          <SelIn value={form.type} onChange={v=>set("type",v)} options={typeOpts}/>
        </Field>
        <Field label="Mode"><SelIn value={form.mode} onChange={v=>set("mode",v)} options={INSTRUMENT_MODES}/></Field>
        <Field label="Amount (₹) *"><TxtIn type="number" value={form.amount} onChange={v=>set("amount",v)} ph="0"/></Field>
        <Field label="Reference No."><TxtIn value={form.ref_no} onChange={v=>set("ref_no",v)} ph="DD / BG number"/></Field>
        <Field label="Bank Name" full><TxtIn value={form.bank_name} onChange={v=>set("bank_name",v)} ph="e.g. SBI Durg"/></Field>
        <Field label="Issue Date"><TxtIn type="date" value={form.issue_date} onChange={v=>set("issue_date",v)}/></Field>
        <Field label={`Validity Date${needsValidity?" (alert isi par)":""}`}
          hint={needsValidity ? "BG/FDR ki validity 30 din me aane par alert bajta hai." : undefined}>
          <TxtIn type="date" value={form.validity_date} onChange={v=>set("validity_date",v)}/>
        </Field>
        <Field label="Remarks" full>
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
    if (!pick) return setErr("Project chunna zaroori hai");
    setBusy(true);
    const res = await api.put(`/tenders/${tenderId}/link-project`, {project_id: Number(pick), action:"link"});
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Link nahi hua"); return; }
    toast.success(res.message || "Project jud gaya");
    onSaved && onSaved();
    onClose();
  };

  return (
    <Modal title="Existing Project Jodo" Icon={IcLink} onClose={onClose} width={520}
      sub="Sirf wo projects jo abhi kisi tender se jude nahi hain"
      footer={<>
        <SecBtn label="Cancel" onClick={onClose}/>
        <PrimBtn label={busy?"Jud raha...":"Link Karo"} onClick={submit} disabled={busy||!projects.length}/>
      </>}>
      <ErrLine msg={err}/>
      {loading && <Loading text="Projects load ho rahe hain..."/>}
      {!loading && !projects.length && (
        <Empty Icon={IcSite} text="Koi free project nahi mila."
          sub="Saare projects pehle se kisi tender se jude hain, ya abhi koi project bana hi nahi."/>
      )}
      {!loading && !!projects.length && (
        <Field label="Project *">
          <SelIn value={pick} onChange={setPick} ph="Project chuno..."
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
    if (!form.name.trim())          return setErr("Site ka naam zaroori hai");
    if (!form.cityId)               return setErr("City zaroori hai");
    if (!form.constructionTypeId)   return setErr("Construction type zaroori hai");
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
    <Modal title="Nayi Site" Icon={IcSite} onClose={onClose} width={560}
      sub={`Tender ${tender.tender_no} ke against`}
      footer={<>
        <SecBtn label="Cancel" onClick={onClose}/>
        <PrimBtn label={busy?"Ban raha...":"Site Banao"} onClick={submit} disabled={busy}/>
      </>}>
      <ErrLine msg={err}/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label="Site / Project Name *" full>
          <TxtIn value={form.name} onChange={v=>set("name",v)} ph="e.g. Package-2 Durg Bypass"/>
        </Field>
        <Field label="City *">
          <SelIn value={form.cityId} onChange={v=>set("cityId",v)} ph="City chuno..."
            options={cities.map(c=>({v:String(c.id), l:c.name}))}/>
        </Field>
        <Field label="Construction Type *">
          <SelIn value={form.constructionTypeId} onChange={v=>set("constructionTypeId",v)} ph="Type chuno..."
            options={ctypes.map(c=>({v:String(c.id), l:c.name}))}/>
        </Field>
        <Field label="Start Date"><TxtIn type="date" value={form.start_date} onChange={v=>set("start_date",v)}/></Field>
        <Field label="End Date"><TxtIn type="date" value={form.end_date} onChange={v=>set("end_date",v)}/></Field>
        <div style={{gridColumn:"1/3", background:T.sltL, border:`1px solid ${T.b1}`, borderRadius:7,
          padding:"9px 12px", fontSize:11.5, color:T.t3, lineHeight:1.5}}>
          Site banne ke baad poora kaam — tasks, budget, material, billing — normal Project screen se hoga.
          Yahan sirf tender ke saath link ban raha hai.
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
    if (!url) return setErr("Pehle file upload karo");
    if (!name.trim()) return setErr("Document ka naam zaroori hai");
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
    <Modal title="Document Jodo" Icon={IcDoc} onClose={onClose} width={520}
      footer={<>
        <SecBtn label="Cancel" onClick={onClose}/>
        <PrimBtn label={busy?"Save ho raha...":"Jodo"} onClick={submit} disabled={busy||uploading}/>
      </>}>
      <ErrLine msg={err}/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label="Document Type *"><SelIn value={docType} onChange={setDocType} options={DOC_TYPES}/></Field>
        <Field label="Name *"><TxtIn value={name} onChange={setName} ph="e.g. NIT copy"/></Field>

        <Field label="File *" full>
          <input ref={fileRef} type="file" style={{display:"none"}}
            onChange={e=>pickFile(e.target.files && e.target.files[0])}/>
          <div onClick={()=>!uploading && fileRef.current && fileRef.current.click()}
            style={{border:`1.5px dashed ${url?T.grn:T.b2}`, borderRadius:8, padding:"16px 14px",
              textAlign:"center", cursor:uploading?"wait":"pointer", background:url?T.grnL:T.bg}}>
            {uploading ? (
              <div style={{fontSize:12.5, color:T.t3}}>Upload ho raha hai...</div>
            ) : url ? (
              <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:7}}>
                <IcChk size={15} color={T.grn}/>
                <span style={{fontSize:12.5, color:T.grn, fontWeight:600}}>{fileName}</span>
              </div>
            ) : (
              <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:6}}>
                <IcUpload size={20} color={T.t4}/>
                <span style={{fontSize:12.5, color:T.t3}}>File chuno — PDF ya image</span>
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
  {key:"item_no",     label:"S.No / Item",  re:/^s\.?\s*no|^sr|serial|^#|^item\s*no/i},
  {key:"sor_code",    label:"SOR / Code",   re:/sor|code|ref/i},
  {key:"description", label:"Description",  re:/description|item|particular|work/i, required:true},
  {key:"unit",        label:"Unit",         re:/^unit|units|uom/i},
  {key:"qty",         label:"Quantity",     re:/qty|quantity|nos/i, required:true},
  {key:"rate",        label:"Rate",         re:/rate|price/i, required:true},
  {key:"amount",      label:"Amount",       re:/amount|total|value/i},
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
    const idx = (headerCells || []).findIndex((c, i) =>
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
        <SecBtn label="Cancel" onClick={onCancel}/>
        <PrimBtn label={busy ? "Ho raha hai..." : confirmLabel} Icon={IcChk} disabled={busy || short}
          onClick={async ()=>{ setBusy(true); await onConfirm(reason.trim()); setBusy(false); }}/>
      </>}>
      {warn && (
        <div style={{padding:"10px 12px", background:T.ambL, border:`1px solid ${T.ambM}`,
          borderRadius:7, fontSize:12, color:T.t2, lineHeight:1.6, marginBottom:12}}>
          <IcWarn size={13} color={T.amb}/> {warn}
        </div>
      )}
      <Field label="Badalne ka reason *"
        hint="Kam se kam 10 akshar. Ye BOQ ki Change History me hamesha rahega.">
        <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3}
          placeholder="e.g. EE ki manzoori 12/8/2026 se rate revise hua"
          style={{...inputStyle, resize:"vertical", lineHeight:1.5}}/>
      </Field>
    </Modal>
  );
}

const ITEM_TYPE_OPTS = [
  {v:"boq",         l:"Tendered (BOQ me tha)"},
  {v:"extra",       l:"Extra — BOQ me tha hi nahi"},
  {v:"substituted", l:"Substituted — kisi item ki jagah"},
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
    if (!form.description.trim()) return setErr("Item ka description zaroori hai");
    if (form.qty === "")  return setErr("Qty zaroori hai");
    if (form.rate === "") return setErr("Rate zaroori hai");
    if (form.item_type === "substituted" && !form.substitutes_item_id)
      return setErr("Substituted item ke liye batao kis item ki jagah hai");
    if (needsReason && form.reason.trim().length < 10)
      return setErr("Final BOQ badalne ka reason likhna zaroori hai (kam se kam 10 akshar).");
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
    <Modal title={isEdit ? "BOQ Item Edit" : "Naya BOQ Item"} Icon={IcTable} onClose={onClose} width={560}
      footer={<>
        <SecBtn label="Cancel" onClick={onClose}/>
        <PrimBtn label={busy?"Save ho raha...":"Save"} onClick={submit} disabled={busy}/>
      </>}>
      <ErrLine msg={err}/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label="Item No."><TxtIn value={form.item_no} onChange={v=>set("item_no",v)} ph="e.g. 1.2"/></Field>
        <Field label="SOR Code"><TxtIn value={form.sor_code} onChange={v=>set("sor_code",v)} ph="e.g. 2.8.1"/></Field>
        <Field label="Description *" full>
          <textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={3}
            placeholder="Kaam ka poora vivran"
            style={{...inputStyle, resize:"vertical", lineHeight:1.5}}
            onFocus={e=>e.target.style.borderColor=T.ind} onBlur={e=>e.target.style.borderColor=T.b1}/>
        </Field>
        <Field label="Item Type" full
          hint={form.item_type === "boq"
            ? "Tendered item BOQ total me ginta hai aur premium usi par lagta hai."
            : "Extra / Substituted item BOQ total se bahar rehta hai — premium us par nahi lagta."}>
          <SelIn value={form.item_type} onChange={v=>set("item_type",v)} options={ITEM_TYPE_OPTS}/>
        </Field>
        {form.item_type === "substituted" && (
          <Field label="Kis item ki jagah *" full>
            <BoqItemPicker items={(boqItems||[]).filter(x=>(x.item_type||"boq")==="boq" && x.id!==item?.id)}
              value={form.substitutes_item_id} onChange={v=>set("substitutes_item_id",String(v))}/>
          </Field>
        )}
        {form.item_type !== "boq" && (<>
          <Field label="Manzoori Ref" hint="Department ka letter jisme is rate ki manzoori hai.">
            <TxtIn value={form.approval_ref} onChange={v=>set("approval_ref",v)} ph="e.g. EE/2026/442"/>
          </Field>
          <Field label="Manzoori Date">
            <TxtIn type="date" value={form.approval_date} onChange={v=>set("approval_date",v)}/>
          </Field>
        </>)}
        <Field label="Unit"><TxtIn value={form.unit} onChange={v=>set("unit",v)} ph="cum / sqm / MT"/></Field>
        <Field label="Qty *"><TxtIn type="number" value={form.qty} onChange={v=>set("qty",v)} ph="0"/></Field>
        <Field label={isItemRate ? "SOR Rate (₹) *" : "Rate (₹) *"}
          hint={isItemRate ? "Department ka rate." : undefined}>
          <TxtIn type="number" value={form.rate} onChange={v=>set("rate",v)} ph="0"/>
        </Field>
        {isItemRate && (
          <Field label="Apna Rate (₹)" hint="Isi rate par bill banega.">
            <TxtIn type="number" value={form.quoted_rate} onChange={v=>set("quoted_rate",v)} ph="0"/>
          </Field>
        )}
        <Field label="Amount">
          <div style={{...inputStyle, background:T.sltL, color:T.t1, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"space-between"}}>
            <span>{moneyF(liveAmount)}</span>
            <span style={{fontSize:10.5, fontWeight:600, color:T.t4}}>qty × rate</span>
          </div>
        </Field>
        {needsReason && (
          <Field label="Badalne ka reason *" full
            hint="Tender won ho chuka hai — BOQ ab final hai. Ye reason Change History me rahega.">
            <textarea value={form.reason} onChange={e=>set("reason",e.target.value)} rows={2}
              placeholder="e.g. EE ki manzoori 12/8/2026 se rate revise hua"
              style={{...inputStyle, resize:"vertical", lineHeight:1.5}}/>
          </Field>
        )}
        <div style={{gridColumn:"1/3", fontSize:11, color:T.t4, lineHeight:1.5}}>
          Amount server par hi nikalta hai (qty × rate) — yahan sirf preview hai.
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// BOQ IMPORT WIZARD — 4 step (Upload → Mapping → Preview → Commit)
// ════════════════════════════════════════════════════════════════════
const WIZ_STEPS = ["Upload", "Mapping", "Preview", "Commit"];

function BoqImportModal({tenderId, onClose, onDone, boqFinal}) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [step, setStep] = useState(1);
  const [err, setErr]   = useState("");
  const [busy, setBusy] = useState(false);

  // Step 1
  const [fileName, setFileName] = useState("");
  const [wb, setWb]             = useState(null);
  const [sheetName, setSheetName] = useState("");
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

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setErr("");
    try {
      const buf = await f.arrayBuffer();
      // cellFormula:false → formula load hi nahi hota, sirf cached value.
      // cellText:true    → .w (displayed text) fallback ke liye milta hai.
      const book = XLSX.read(new Uint8Array(buf), {
        type: "array", cellFormula: false, cellText: true, cellDates: false, cellNF: false,
      });
      if (!book.SheetNames.length) { setErr("File me koi sheet nahi mili"); return; }
      setFileName(f.name);
      setWb(book);
      loadSheet(book, book.SheetNames[0]);
    } catch (_) {
      setErr("File padhne me dikkat — sahi .xlsx / .xls file chuno");
    }
    e.target.value = "";
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
      setErr("BOQ final hai — naya import karne ka reason likhna zaroori hai (kam se kam 10 akshar).");
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
    toast.success(`${res.data.row_count} items import ho gaye`);
    onDone && onDone();
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
    <Modal title="BOQ Import" Icon={IcUpload} onClose={onClose} width={940}
      sub={`Step ${step} of 4 — ${WIZ_STEPS[step-1]}${fileName ? ` · ${fileName}` : ""}`}
      footer={<>
        {step > 1 && <SecBtn label="Peeche" onClick={()=>{setStep(s=>s-1); setErr("");}}/>}
        <SecBtn label="Cancel" onClick={onClose}/>
        {step < 4
          ? <PrimBtn label="Aage" onClick={()=>{setStep(s=>s+1); setErr("");}} disabled={!canNext}/>
          : <PrimBtn label={busy?"Import ho raha...":"Import Karo"} onClick={commit} disabled={busy||!liveRows.length}/>}
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

      {/* ── STEP 1: UPLOAD ── */}
      {step===1 && (<>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={onFile}/>
        <div onClick={()=>fileRef.current && fileRef.current.click()}
          style={{border:`1.5px dashed ${aoa.length?T.grn:T.b2}`, borderRadius:8, padding:"26px 16px",
            textAlign:"center", cursor:"pointer", background:aoa.length?T.grnL:T.bg}}>
          {aoa.length ? (
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:6}}>
              <IcChk size={20} color={T.grn}/>
              <span style={{fontSize:13, color:T.grn, fontWeight:700}}>{fileName}</span>
              <span style={{fontSize:11.5, color:T.t3}}>{aoa.length} rows padhi gayi — badalne ke liye phir se click karo</span>
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:7}}>
              <IcUpload size={22} color={T.t4}/>
              <span style={{fontSize:13, color:T.t2, fontWeight:600}}>Excel file chuno (.xlsx / .xls)</span>
              <span style={{fontSize:11.5, color:T.t4}}>File aapke browser me hi padhi jati hai — upload nahi hoti</span>
            </div>
          )}
        </div>

        {wb && wb.SheetNames.length > 1 && (
          <div style={{marginTop:14}}>
            <Field label="Sheet chuno">
              <SelIn value={sheetName} onChange={v=>loadSheet(wb, v)}
                options={wb.SheetNames.map(n=>({v:n, l:n}))}/>
            </Field>
          </div>
        )}

        <div style={{marginTop:14, background:T.sltL, border:`1px solid ${T.b1}`, borderRadius:7,
          padding:"9px 12px", fontSize:11.5, color:T.t3, lineHeight:1.55}}>
          Sheet me jo value <b>dikh rahi hai</b> wahi padhi jati hai. Formula dobara calculate
          nahi hote — government BOQ aksar doosri file ko reference karti hai, aur wo link toota
          ho to <code>#REF!</code> aata hai. Aisi cell khali maan li jati hai.
        </div>
      </>)}

      {/* ── STEP 2: MAPPING ── */}
      {step===2 && (<>
        <div style={{display:"flex", gap:10, alignItems:"flex-end", marginBottom:14, flexWrap:"wrap"}}>
          <div style={{width:170}}>
            <Field label="Header row">
              <SelIn value={String(headerRow)}
                onChange={v=>{const h=Number(v); setHeaderRow(h); setMapping(autoMapCols(aoa[h]||[]));}}
                options={aoa.slice(0, 30).map((_,i)=>({v:String(i), l:`Row ${i+1}`}))}/>
            </Field>
          </div>
          <div style={{flex:1, minWidth:220, fontSize:11.5, color:T.t3, lineHeight:1.5, paddingBottom:6}}>
            Column apne aap pehchane gaye hain. Galat lage to dropdown se badal do.
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
                  ph="— koi nahi —"
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
            Ye column zaroori hain par map nahi hue: <b>{missing.join(", ")}</b>
          </div>
        )}

        <div style={{fontSize:11.5, color:T.t3, marginBottom:6}}>
          {parsed.rows.length} item bane
          {parsed.rows.some(r=>r.merged_lines>0) &&
            ` · ${parsed.rows.reduce((s,r)=>s+(r.merged_lines||0),0)} continuation line upar wale item me jodi gayi`}
        </div>
        <div style={{maxHeight:210, overflow:"auto", border:`1px solid ${T.b1}`, borderRadius:7}}>
          <table style={{width:"100%", borderCollapse:"collapse", tableLayout:"fixed"}}>
            <thead><tr>
              <th style={{...th, width:60}}>Item</th>
              <th style={{...th, width:70}}>SOR</th>
              <th style={th}>Description</th>
              <th style={{...th, width:50}}>Unit</th>
              <th style={{...th, width:70}}>Qty</th>
              <th style={{...th, width:80}}>Rate</th>
              <th style={{...th, width:90}}>Amount</th>
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
          <div style={{fontSize:11, color:T.t4, marginTop:6}}>… aur {parsed.rows.length-40} rows (Preview me sab dikhengi)</div>
        )}
      </>)}

      {/* ── STEP 3: PREVIEW ── */}
      {step===3 && (<>
        {reconcile && (
          <div style={{background:T.redL, border:`1px solid ${T.redM}`, borderRadius:7, padding:"10px 13px",
            marginBottom:12, fontSize:12, color:T.red, lineHeight:1.55}}>
            <b>Server ne import rok diya.</b><div style={{marginTop:3}}>{reconcile.message}</div>
            <div style={{marginTop:5, color:T.t3}}>
              Farak {moneyF(reconcile.diff)} — ya to file total sudhaaro, ya galat rows exclude karo.
            </div>
          </div>
        )}

        <div style={{display:"flex", gap:10, alignItems:"flex-end", marginBottom:12, flexWrap:"wrap"}}>
          <div style={{width:200}}>
            <Field label="File ka total (₹)"
              hint="Khali chhodo to reconcile check nahi hoga.">
              <TxtIn type="number" value={fileTotal}
                onChange={v=>{setTotalTouched(true); setFileTotal(v);}} ph="0"/>
            </Field>
          </div>
          <div style={{flex:1, minWidth:240, paddingBottom:6}}>
            <div style={{display:"flex", gap:16, flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px"}}>Items ka jod</div>
                <div style={{fontSize:15, fontWeight:700, color:T.t1}}>{moneyF(liveTotal)}</div>
              </div>
              <div>
                <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px"}}>Rows</div>
                <div style={{fontSize:15, fontWeight:700, color:T.t1}}>
                  {liveRows.length}
                  {parsed.rows.length !== liveRows.length &&
                    <span style={{fontSize:11, color:T.t4, fontWeight:500}}> / {parsed.rows.length}</span>}
                </div>
              </div>
              {diff !== null && (
                <div>
                  <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px"}}>Farak</div>
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
              ? "Total match ho gaya — import ho jayega."
              : `Farak ₹1 se zyada hai — server import rok dega. Mapping galat hai ya koi total row item ban gayi hai.`}
          </div>
        )}

        <div style={{fontSize:11.5, color:T.t3, marginBottom:6}}>
          Jo row BOQ ka hissa nahi hai (section heading, sub-total) uska checkbox hata do.
        </div>
        <div style={{maxHeight:280, overflow:"auto", border:`1px solid ${T.b1}`, borderRadius:7}}>
          <table style={{width:"100%", borderCollapse:"collapse", tableLayout:"fixed"}}>
            <thead><tr>
              <th style={{...th, width:34}}></th>
              <th style={{...th, width:56}}>Item</th>
              <th style={{...th, width:66}}>SOR</th>
              <th style={th}>Description</th>
              <th style={{...th, width:48}}>Unit</th>
              <th style={{...th, width:68}}>Qty</th>
              <th style={{...th, width:78}}>Rate</th>
              <th style={{...th, width:92}}>Amount</th>
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
                        <div style={{fontSize:9.5, color:T.amb, fontWeight:600}}>
                          sheet: {moneyF(r.sheet_amount)}
                        </div>
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
            <div style={{fontSize:13, fontWeight:700, color:T.ind, marginBottom:8}}>Import karne se pehle ek nazar</div>
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
                <IcLock size={13} color={T.amb}/>BOQ final hai
              </div>
              <Field label="Naya import karne ka reason *"
                hint="Kam se kam 10 akshar. Ye BOQ ki Change History me rahega.">
                <textarea value={importReason} onChange={e=>setImportReason(e.target.value)} rows={2}
                  placeholder="e.g. Department ne revised BOQ bheja, letter 12/8/2026"
                  style={{...inputStyle, resize:"vertical", lineHeight:1.5}}/>
              </Field>
            </div>
          )}
          {parsed.rows.length !== liveRows.length && (
            <div style={{fontSize:11.5, color:T.t3, marginBottom:10}}>
              {parsed.rows.length - liveRows.length} row exclude ki gayi hain — wo import nahi hongi.
            </div>
          )}
          <div style={{background:T.sltL, border:`1px solid ${T.b1}`, borderRadius:7, padding:"9px 12px",
            fontSize:11.5, color:T.t3, lineHeight:1.55}}>
            Har row ka amount server dobara nikalta hai (qty × rate). File ka total diya hai to
            usse ₹1 se zyada farak hone par import ruk jayega aur kuch bhi save nahi hoga.
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
    if (!match) return setErr("Confirm karne ke liye REVERT likho");
    setErr(""); setBusy(true);
    const res = await api.post(`/tenders/${tenderId}/boq/imports/${imp.id}/revert`);
    setBusy(false);
    if (!res?.success) { setErr(res?.message || "Revert nahi hua"); return; }
    toast.success(`Import revert ho gaya — ${res.items_hidden} items hate`);
    onDone && onDone();
    onClose();
  };

  return (
    <Modal title="Import Revert" Icon={IcUndo} onClose={onClose} width={480}
      sub={imp.file_name || `Import #${imp.id}`}
      footer={<>
        <SecBtn label="Cancel" onClick={onClose}/>
        <button onClick={submit} disabled={busy||!match}
          style={{height:32, padding:"0 14px", borderRadius:6, background:match?T.red:T.b1,
            border:"none", color:"#fff", fontSize:12.5, fontWeight:700,
            cursor:match?"pointer":"not-allowed"}}>
          {busy ? "Revert ho raha..." : "Revert Karo"}
        </button>
      </>}>
      <ErrLine msg={err}/>
      <div style={{background:T.redL, border:`1px solid ${T.redM}`, borderRadius:8, padding:"12px 14px", marginBottom:14}}>
        <div style={{fontSize:12, color:T.t2, lineHeight:1.6}}>
          Is import ki <b>{imp.active_items ?? imp.row_count} items</b> BOQ se hat jayengi.
          Haath se jode gaye items aur baaki imports ki items par <b>koi asar nahi</b> padega.
        </div>
      </div>
      <div style={{fontSize:12, color:T.red, marginBottom:8}}>
        Confirm karne ke liye <strong>REVERT</strong> type karo:
      </div>
      <input value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Type REVERT to confirm"
        style={{width:"100%", padding:"8px 11px", borderRadius:7, border:`1.5px solid ${T.redM}`,
          fontSize:12.5, color:T.t1, background:T.surface, outline:"none",
          boxSizing:"border-box", fontFamily:"inherit"}}/>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// BOQ TAB
// ════════════════════════════════════════════════════════════════════
function BoqTab({tenderId, boq, loading, reload, rateType, autoImport}) {
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

  const TILES = summary ? [
    {label:"Items", value:summary.item_count, note:`${imports.filter(i=>i.status==="committed").length} import se`,
      color:T.ind, Icon:IcTable},
    {label:"BOQ Total", value:money(summary.boq_total), note:moneyF(summary.boq_total),
      color:T.blu, Icon:IcRupee},
    // Extra item hon to unka apna tile — wo BOQ total me nahi ginte.
    summary.extra_count > 0
      ? {label:"Extra Items", value:money(summary.extra_total),
         note:`${summary.extra_count} item · BOQ total se bahar`, color:T.amb, Icon:IcRupee}
      : {label:"vs Estimated",
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

  if (loading) return <Panel><Loading text="BOQ load ho raha hai..."/></Panel>;

  return (<>
    {/* Tiles */}
    {summary && (
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:10, marginBottom:11}}>
        {TILES.map(t=><Stat key={t.label} {...t}/>)}
      </div>
    )}

    {/* Change history — BOQ final hone ke baad ke sab badlaav */}
    {!!changeLog.length && (
      <Panel style={{marginBottom:11}}>
        <PHead title="Change History" sub="Final BOQ me kya-kya badla"/>
        <div style={{padding:"10px 14px", display:"flex", flexDirection:"column", gap:9}}>
          {changeLog.map(l=>{
            const act = {edit:{l:"Edit", c:T.amb, bg:T.ambL}, delete:{l:"Deleted", c:T.red, bg:T.redL},
                         add:{l:"Added", c:T.grn, bg:T.grnL}, add_extra:{l:"Extra Added", c:T.amb, bg:T.ambL},
                         add_substituted:{l:"Substituted", c:T.blu, bg:T.bluL}}[l.action]
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
                      {Object.entries(ch).map(([k,v])=>(
                        <span key={k} style={{marginRight:10}}>
                          {k}: <b style={{color:T.t4}}>{String(v.from ?? "--")}</b>
                          {" → "}<b style={{color:T.t1}}>{String(v.to ?? "--")}</b>
                        </span>
                      ))}
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
        <PHead title="Import History" sub={`${imports.length} import`}/>
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
                  ? <Pill label="Reverted" c={T.t4} bg={T.sltL}/>
                  : <SecBtn label="Revert" Icon={IcUndo} color={T.red} onClick={()=>setRevertOf(im)}/>}
              </div>
            );
          })}
        </div>
      </Panel>
    )}

    {/* Items */}
    <Panel>
      <PHead title="BOQ Items" sub={summary ? `${summary.item_count} items · ${moneyF(summary.boq_total)}` : undefined}
        action={<div style={{display:"flex", gap:7, alignItems:"center"}}>
          {boqFinal && (
            <span style={{display:"inline-flex", alignItems:"center", gap:5, fontSize:11,
              color:T.amb, fontWeight:600, marginRight:2}}>
              <IcLock size={12} color={T.amb}/>Final
            </span>
          )}
          {canEdit && <SecBtn label="Import Excel" Icon={IcUpload} onClick={()=>setShowImport(true)}/>}
          <PrimBtn label="Add Item" Icon={IcAdd} onClick={()=>setItemModal({})}/>
        </div>}/>
      {boqFinal && (
        <div style={{padding:"9px 14px", background:T.ambL, borderBottom:`1px solid ${T.ambM}`,
          fontSize:11.5, color:T.t2, lineHeight:1.55, display:"flex", gap:7, alignItems:"flex-start"}}>
          <IcLock size={13} color={T.amb}/>
          <span>
            <b style={{color:T.amb}}>BOQ final hai</b> — tender won ho chuka hai, ab yahi agreement ka
            BOQ hai. {isAdmin
              ? "Badalna hai to reason likhna zaroori hai; har badlaav Change History me rehta hai."
              : "Ab ise sirf admin badal sakta hai."}
            {" "}Extra / Substituted item jodna khula hai — wo BOQ total se bahar rehte hain.
          </span>
        </div>
      )}

      {!!items.length && (
        <div style={{padding:"8px 14px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB}}>
          <div style={{position:"relative", maxWidth:340}}>
            <div style={{position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", lineHeight:0}}>
              <IcSrch size={13} color={T.t4}/>
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Item, SOR code ya description dhoondo..."
              style={{width:"100%", height:30, padding:"0 9px 0 28px", borderRadius:6,
                border:`1.5px solid ${search?T.ind:T.b1}`, fontSize:12, color:T.t1,
                background:search?T.indL:T.surface, outline:"none", boxSizing:"border-box", fontFamily:"inherit"}}/>
          </div>
        </div>
      )}

      {!items.length && (
        <Empty Icon={IcTable} text="Abhi koi BOQ item nahi."
          sub="Excel se import karo ya haath se item jodo."/>
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

        {!filtered.length && <Empty text="Is search me koi item nahi."/>}

        {filtered.map((it,i)=>(
          <div key={it.id} style={{display:"grid", gridTemplateColumns:COLS, padding:"9px 14px", gap:9,
            alignItems:"center", borderBottom:i<filtered.length-1?`1px solid ${T.b1}`:"none"}}>
            <span style={{fontSize:11.5, color:T.t2, fontWeight:600, display:"flex", alignItems:"center", gap:4}}>
              {it.item_no || "--"}
              {it.item_type === "extra" && <Pill label="Extra" c={T.amb} bg={T.ambL}/>}
              {it.item_type === "substituted" && <Pill label="Sub" c={T.blu} bg={T.bluL}/>}
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
                  {over && <Pill label="Deviation" c={T.amb} bg={T.ambL}/>}
                </div>
              </>);
            })()}
            <div style={{display:"flex", gap:4, justifyContent:"flex-end"}}>
              {canEdit ? (<>
                <button onClick={()=>setItemModal({item:it})}
                  title={boqFinal ? "Edit (reason zaroori)" : "Edit"}
                  style={{width:26, height:26, borderRadius:6, border:`1px solid ${boqFinal?T.ambM:T.b1}`,
                    background:boqFinal?T.ambL:T.surfaceB,
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}>
                  <IcEdit size={12} color={boqFinal?T.amb:T.t3}/>
                </button>
                <button onClick={()=>delItem(it)}
                  title={boqFinal ? "Delete (reason zaroori)" : "Delete"}
                  style={{width:26, height:26, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surfaceB,
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}>
                  <IcTrash size={12} color={T.red}/>
                </button>
              </>) : (
                <span title="Tender won ho chuka hai — BOQ ab sirf admin badal sakta hai."
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
      onClose={()=>setShowImport(false)} onDone={reload}/>}
    {itemModal && <BoqItemModal tenderId={tenderId} item={itemModal.item}
      isItemRate={isItemRate} boqItems={items} boqFinal={boqFinal}
      onClose={()=>setItemModal(null)} onSaved={reload}/>}
    {delOf && (
      <BoqReasonModal
        title="BOQ Item Hatao"
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
  if (total === 0) return "Zero Rupees Only";
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
  draft:     {label:"Draft",     c:T.slt, bg:T.sltL},
  submitted: {label:"Submitted", c:T.blu, bg:T.bluL},
  cancelled: {label:"Cancelled", c:T.t4,  bg:T.sltL},
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
          {sel ? `${sel.item_no||"--"} · ${sel.description}` : "BOQ item dhoondo..."}
        </span>
        <IcDown size={12} color={T.t4}/>
      </div>
      {open && (
        <div style={{position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:5,
          background:T.surface, border:`1px solid ${T.b2}`, borderRadius:8,
          boxShadow:"0 10px 30px rgba(0,0,0,.14)", overflow:"hidden"}}>
          <div style={{padding:8, borderBottom:`1px solid ${T.b1}`}}>
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
              placeholder="Item no ya description..."
              style={{...inputStyle, padding:"7px 10px", fontSize:12}}/>
          </div>
          <div style={{maxHeight:230, overflowY:"auto"}}>
            {!list.length && <div style={{padding:"14px 12px", fontSize:12, color:T.t4}}>Koi item nahi mila.</div>}
            {list.map(i=>(
              <div key={i.id} onClick={()=>{onChange(i.id); setOpen(false); setQ("");}}
                style={{padding:"8px 11px", cursor:"pointer", borderBottom:`1px solid ${T.b1}`,
                  background:String(i.id)===String(value)?T.indL:T.surface}}>
                <div style={{fontSize:12, color:T.t1, fontWeight:600, overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                  {i.item_no||"--"} · {i.description}
                </div>
                <div style={{fontSize:10.5, color:T.t4, marginTop:2}}>
                  BOQ {fmtQty(i.qty)} {i.unit||""} · Rate {fmtQty(i.rate)}
                </div>
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
    <Modal title={isEdit ? "Measurement Edit" : "Nayi Measurement"} Icon={IcTable}
      sub={isEdit ? `MB entry #${edit.id}` : "Measurement book (MB) ki entry"}
      onClose={onClose} width={620}
      footer={<>
        <SecBtn label="Cancel" onClick={onClose}/>
        <PrimBtn label={busy ? "Save ho raha hai..." : "Save"} Icon={IcChk} onClick={save} disabled={busy}/>
      </>}>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:13}}>
        <Field label="Site *" hint={!sites.length ? "Pehle Sites tab me project link karo." : undefined}>
          <SelIn value={f.project_id} onChange={v=>set("project_id",v)} ph="Site chuno..."
            options={sites.map(s=>({v:s.id, l:s.name}))}/>
        </Field>
        <Field label="Date *">
          <TxtIn type="date" value={f.mdate} onChange={v=>set("mdate",v)}/>
        </Field>
        <Field label="BOQ Item *" full>
          <BoqItemPicker items={boqItems} value={f.boq_item_id} onChange={v=>set("boq_item_id",v)}/>
        </Field>
        <Field label={`Qty *${item?.unit ? ` (${item.unit})` : ""}`}>
          <TxtIn type="number" value={f.qty} onChange={v=>set("qty",v)} ph="0"/>
        </Field>
        <Field label="MB Ref">
          <TxtIn value={f.mb_ref} onChange={v=>set("mb_ref",v)} ph="e.g. MB-12 / Page 44"/>
        </Field>
        <Field label="Remarks" full>
          <TxtIn value={f.remarks} onChange={v=>set("remarks",v)} ph="Optional"/>
        </Field>
      </div>
      {item && (
        <div style={{marginTop:13, padding:"9px 12px", background:T.indL, border:`1px solid ${T.indM}`,
          borderRadius:7, fontSize:11.5, color:T.t2, lineHeight:1.6}}>
          <b style={{color:T.ind}}>{item.item_no || "--"}</b> · BOQ qty {fmtQty(item.qty)} {item.unit||""}
          · Rate {money(item.rate)}
          {Number(f.qty) > 0 && <> · Is entry ki value <b>{money(round2(Number(f.qty)*Number(item.rate||0)))}</b></>}
        </div>
      )}
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
      <PHead title="Measurements (MB)" sub={rows.length ? `${rows.length} entry` : undefined}
        action={<PrimBtn label="Nayi Measurement" Icon={IcAdd} onClick={()=>setModal({})}/>}/>

      {/* Filters */}
      <div style={{padding:"9px 14px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB,
        display:"flex", gap:9, flexWrap:"wrap", alignItems:"center"}}>
        <div style={{minWidth:180}}>
          <SelIn value={fSite} onChange={setFSite} ph="Saari sites"
            options={sites.map(s=>({v:s.id, l:s.name}))}/>
        </div>
        <div style={{minWidth:240}}>
          <SelIn value={fItem} onChange={setFItem} ph="Saare BOQ items"
            options={boqItems.map(i=>({v:i.id, l:`${i.item_no||"--"} · ${String(i.description||"").slice(0,44)}`}))}/>
        </div>
        {(fSite||fItem) && <SecBtn label="Filter hatao" Icon={IcX} onClick={()=>{setFSite("");setFItem("");}}/>}
        {lockDate && (
          <div style={{marginLeft:"auto", display:"flex", alignItems:"center", gap:6, fontSize:11, color:T.t3}}>
            <IcLock size={12} color={T.amb}/>
            <span>{fmtDate(lockDate)} tak bill ho chuka — us tarikh tak ki entry lock hai</span>
          </div>
        )}
      </div>

      {loading && <Loading text="Measurements load ho rahe hain..."/>}

      {!loading && !rows.length && (
        <Empty Icon={IcTable} text={fSite||fItem ? "Is filter me koi entry nahi." : "Abhi koi measurement nahi."}
          sub={fSite||fItem ? undefined : "Site par kaam hone ke baad MB entry yahan darj karo."}/>
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
                whiteSpace:"nowrap"}}>{m.created_by_name || "--"}</span>
              <div style={{display:"flex", gap:4, justifyContent:"flex-end"}}>
                {locked ? (
                  <span title={LOCK_MSG} style={{fontSize:10, color:T.amb, cursor:"help", fontWeight:600}}>Locked</span>
                ) : (<>
                  <button onClick={()=>setModal({edit:m})} title="Edit"
                    style={{width:26, height:26, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surfaceB,
                      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}>
                    <IcEdit size={12} color={T.t3}/>
                  </button>
                  <button onClick={()=>del(m)} title="Delete"
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
        <PHead title="Item-wise Cumulative" sub={`${summary.length} BOQ item par kaam hua`}/>
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
  </>);
}

// ── DEDUCTION SETUP MODAL ───────────────────────────────────────────
const CALC_OPTS = [
  {v:"pct_gross", l:"% of subtotal"},
  {v:"fixed",     l:"Fixed amount"},
  {v:"manual",    l:"Manual (har bill par bharo)"},
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
    if (!await window.confirmAsync(`"${r.head_name}" head hataayein?\n\nPehle ban chuke bills par asar nahi padega — unme amount snapshot ho chuka hai.`)) return;
    const res = await api.del(`/tenders/${tenderId}/deductions/${r.id}`);
    if (!res?.success) { toast.error(res?.message || "Delete nahi hua"); return; }
    toast.success("Head hat gaya"); setDirty(true); load();
  };

  const COLS = "minmax(150px,1.6fr) 150px 100px 70px 62px";

  return (
    <Modal title="Deduction Setup" Icon={IcRupee} width={760}
      sub="Har RA bill par yahi heads lagte hain"
      onClose={()=>{ onClose(); if (dirty) onDone(); }}
      footer={<PrimBtn label="Done" Icon={IcChk} onClick={()=>{ onClose(); if (dirty) onDone(); }}/>}>
      {loading && <Loading text="Config load ho raha hai..."/>}
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
              <button onClick={()=>remove(r)} title="Hatao"
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
            letterSpacing:".5px"}}>Naya Head</div>
          <div style={{display:"grid", gridTemplateColumns:COLS, gap:9, alignItems:"center"}}>
            <TxtIn value={add.head_name} onChange={v=>setAdd(p=>({...p,head_name:v}))} ph="e.g. Withheld"/>
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
              <PrimBtn label="Add" Icon={IcAdd} onClick={create} disabled={busy}/>
            </div>
          </div>
        </div>

        <div style={{marginTop:13, padding:"9px 12px", background:T.ambL, border:`1px solid ${T.ambM}`,
          borderRadius:7, fontSize:11.5, color:T.t2, lineHeight:1.6}}>
          Bill par sirf yahi heads lagte hain. Kisi ek bill me alag se kuch kaatna ho (jaise
          <b> Withheld</b>) to yahan <b>Manual</b> type ka head banao — phir har bill me uska
          amount alag bhara ja sakta hai. Bill ke andar se naya head nahi jud sakta.
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
    <Modal title={edit ? `RA-${edit.bill_no} Edit` : "Naya RA Bill"} Icon={IcRupee} width={860}
      sub={`Step ${step} of 3 — ${STEPS[step-1]}`}
      onClose={onClose}
      footer={<>
        {step > 1 && <SecBtn label="Peeche" onClick={()=>setStep(s=>s-1)}/>}
        <div style={{flex:1}}/>
        <SecBtn label="Cancel" onClick={onClose}/>
        {step < 3 && <PrimBtn label="Aage" Icon={IcDown} onClick={()=>setStep(s=>s+1)} disabled={!prev||busy}/>}
        {step === 3 && <PrimBtn label={busy?"Save ho raha hai...":(edit?"Update Draft":"Save Draft")} Icon={IcChk} onClick={save} disabled={busy||!prev}/>}
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
          <Field label="Upto Date *" hint="Is tarikh tak ki saari measurement is bill me aayegi.">
            <TxtIn type="date" value={upto} onChange={setUpto}/>
          </Field>
          {!isItemRate && (
            <Field label="Premium / Tender %" hint="Award par lock hua premium — is bill ke liye badal sakte ho.">
              <div style={{display:"flex", gap:7}}>
                <TxtIn type="number" value={prem} onChange={setPrem} ph="0"/>
                <SecBtn label="Lagao" Icon={IcChk} onClick={runPreview}/>
              </div>
            </Field>
          )}
          {isItemRate && (
            <div style={{padding:"9px 12px", background:T.indL, border:`1px solid ${T.indM}`,
              borderRadius:7, fontSize:11.5, color:T.t2, lineHeight:1.5, alignSelf:"end"}}>
              <b style={{color:T.ind}}>Item-rate tender</b> — bill apne quoted rate par banta hai,
              premium alag se nahi lagta.
            </div>
          )}
          <Field label="GST %" hint="Khali chhodo to bill me GST ki line nahi aayegi.">
            <div style={{display:"flex", gap:7}}>
              <TxtIn type="number" value={gst} onChange={setGst} ph="0"/>
              <SecBtn label="Lagao" Icon={IcChk} onClick={runPreview}/>
            </div>
          </Field>
        </div>
      </>)}

      {/* Deviation — BOQ qty se zyada kaam. Rokta nahi, reason maangta hai. */}
      {devBlock && (
        <div style={{padding:"11px 13px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8,
          fontSize:12, color:T.t2, marginBottom:12}}>
          <div style={{fontWeight:700, display:"flex", alignItems:"center", gap:7, color:T.amb}}>
            <IcWarn size={14} color={T.amb}/>BOQ qty se zyada kaam ho gaya hai
          </div>
          <div style={{marginTop:7, fontSize:11.5, lineHeight:1.7}}>
            {devBlock.map((d,i)=>(
              <div key={i}>
                <b>{d.item_no || d.boq_item_id}</b> — BOQ {fmtQty(d.effective_qty)} {d.unit||""},
                {" "}kaam {fmtQty(d.upto_qty)} {d.unit||""}
                {d.allowed_qty != null && <> · limit tak {fmtQty(d.allowed_qty)}</>}
                {" "}(<b style={{color:T.amb}}>+{fmtQty(d.deviation_qty)}</b>)
              </div>
            ))}
          </div>
          <div style={{marginTop:9}}>
            <Field label="Deviation ka reason *"
              hint="Kam se kam 10 akshar. Ye bill ke saath record me rahega.">
              <textarea value={devReason} onChange={e=>setDevReason(e.target.value)} rows={2}
                placeholder="e.g. Site condition badla, EE approval 12/8/2026"
                style={{...inputStyle, resize:"vertical", lineHeight:1.5}}/>
            </Field>
            <div style={{marginTop:7}}>
              <PrimBtn label="Reason ke saath aage badho" Icon={IcChk}
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
                <div key={i}>
                  <b>{n.item_no || n.boq_item_id}</b> — measured {fmtQty(n.measured_cum)},
                  bill ho chuka {fmtQty(n.billed_cum)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {busy && !prev && <Loading text="Preview ban raha hai..."/>}

      {/* ── STEP 1 preview: item table ── */}
      {step === 1 && prev && (<>
        <div style={{fontSize:11, fontWeight:700, color:T.t3, marginBottom:7, textTransform:"uppercase",
          letterSpacing:".5px"}}>Is bill ke items</div>
        {!prev.items?.length && <Empty Icon={IcTable} text="Is date tak koi billable measurement nahi."/>}
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
          letterSpacing:".5px"}}>Deduction Sheet</div>
        <div style={{border:`1px solid ${T.b1}`, borderRadius:8, overflow:"hidden"}}>
          <div style={{display:"grid", gridTemplateColumns:"minmax(160px,2fr) 140px 90px 120px", gap:9,
            padding:"7px 12px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}`}}>
            {["Head","Type","Rate","Amount"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5, fontWeight:700, color:T.t4, textTransform:"uppercase",
                letterSpacing:".5px", textAlign:i>=2?"right":"left"}}>{h}</span>
            ))}
          </div>
          {!prev.deductions?.length && (
            <div style={{padding:"14px 12px", fontSize:12, color:T.t4}}>Koi deduction head configured nahi.</div>
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
            Is bill me alag se kuch kaatna ho (jaise Withheld) to pehle <b>Deduction Setup</b> me
            <b> Manual</b> type ka head banao. Bill ke andar se naya head nahi jud sakta.
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
              Deductions GST se pehle wali value (Subtotal) par lagte hain — SD/TDS/cess
              sab "value of work done" par bante hain.
            </div>
          )}
        </div>
      </>)}

      {/* ── STEP 3: review ── */}
      {step === 3 && prev && (<>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:9, marginBottom:13}}>
          <Stat label="Upto Date"  value={fmtDate(upto)}            color={T.ind} Icon={IcClock}/>
          <Stat label="Items"      value={prev.items?.length || 0}  color={T.ind} Icon={IcTable}/>
          <Stat label="Subtotal"   value={money(prev.subtotal)}     color={T.blu} Icon={IcRupee}/>
          <Stat label="Net Payable" value={money(prev.net_payable)} color={T.grn} Icon={IcRupee}/>
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
          Save karne par bill <b>Draft</b> banega. Finance me transaction tab banegi jab tum
          bill <b>Submit</b> karoge.
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
    if (!await window.confirmAsync(`RA-${d.bill_no} cancel karein?`)) return;
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
            <div style={{fontSize:15, fontWeight:800, color:T.t1}}>
              RA-{d?.bill_no ?? "--"} {st && <span style={{marginLeft:7}}><Pill label={st.label} c={st.c} bg={st.bg}/></span>}
            </div>
            <div style={{fontSize:11, color:T.t4, marginTop:1}}>
              {tender?.tender_no} · Upto {fmtDate(d?.upto_date)}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{background:"none", border:"none", cursor:"pointer", color:T.t3,
          lineHeight:0, padding:4}}><IcX size={18}/></button>
      </div>

      <div style={{flex:1, overflowY:"auto", padding:"14px 18px"}}>
        {loading && <Loading text="Bill load ho raha hai..."/>}
        {!loading && d && (<>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:9, marginBottom:12}}>
            <Stat label="Net Payable" value={money(d.net_payable)} color={T.t1}  Icon={IcRupee}/>
            <Stat label="Received"    value={money(d.received ?? 0)} color={T.grn} Icon={IcRupee}/>
            <Stat label="Balance"     value={money(bal)} color={bal>0?T.amb:T.grn} Icon={IcClock}/>
          </div>

          <Panel style={{marginBottom:11}}>
            <PHead title="Items" sub={`${(d.items||[]).length} item`}/>
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
            <PHead title="Deduction Sheet"/>
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
                <span>Net Payable</span><span style={{fontVariantNumeric:"tabular-nums"}}>{money(d.net_payable)}</span>
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
            <PrimBtn label="Submit" Icon={IcChk} onClick={submit} disabled={busy}/>
            <SecBtn label="Edit" Icon={IcEdit} onClick={()=>onEdit(d)} disabled={busy}/>
            <SecBtn label="Cancel Bill" Icon={IcX} color={T.red} onClick={cancel} disabled={busy}/>
            <span style={{fontSize:10.5, color:T.t4, marginLeft:2}}>
              Draft delete ka endpoint nahi hai — cancel hi karo.
            </span>
          </>)}
          {d.status === "submitted" && (<>
            <PrimBtn label="Receive" Icon={IcRupee} color={T.grn} onClick={()=>onReceive(d)}/>
            <SecBtn label="Print" Icon={IcDoc} onClick={print}/>
            <SecBtn label="Cancel Bill" Icon={IcX} color={T.red} onClick={cancel} disabled={busy}/>
          </>)}
          {d.status === "cancelled" && (
            <span style={{fontSize:12, color:T.t4}}>Ye bill cancel ho chuka hai.</span>
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
        <Stat label="Bills"        value={totals.count}           note="cancelled chhod kar" color={T.ind} Icon={IcDoc}/>
        <Stat label="Total Billed" value={money(totals.billed)}   note={moneyF(totals.billed)}   color={T.blu} Icon={IcRupee}/>
        <Stat label="Received"     value={money(totals.received)} note={moneyF(totals.received)} color={T.grn} Icon={IcRupee}/>
        <Stat label="Balance"      value={money(totals.balance)}  note="abhi aana baaki"
          color={totals.balance>0?T.amb:T.grn} Icon={IcClock}/>
      </div>
    )}

    <Panel>
      <PHead title="RA Bills" sub={(bills||[]).length ? `${bills.length} bill` : undefined}
        action={<div style={{display:"flex", gap:7}}>
          <SecBtn label="Deduction Setup" Icon={IcRupee} onClick={()=>setSetup(true)}/>
          <PrimBtn label="Naya RA Bill" Icon={IcAdd} onClick={()=>setNew(true)}/>
        </div>}/>

      {loading && <Loading text="RA bills load ho rahe hain..."/>}

      {!loading && !(bills||[]).length && (
        <Empty Icon={IcRupee} text="Abhi koi RA bill nahi."
          sub="Measurement (MB) darj hone ke baad naya RA bill banao."/>
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
              <span style={{fontSize:12.5, fontWeight:700, color:T.ind}}>RA-{b.bill_no}</span>
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
  {id:"overview",    label:"Overview",    Icon:IcGavel},
  {id:"boq",         label:"BOQ",         Icon:IcTable},
  {id:"measure",     label:"Measurements",Icon:IcTable,  minStage:"execution"},
  {id:"rabills",     label:"RA Bills",    Icon:IcRupee,  minStage:"execution"},
  {id:"sites",       label:"Sites",       Icon:IcSite,   minStage:"execution"},
  {id:"instruments", label:"Instruments", Icon:IcBank},
  {id:"documents",   label:"Documents",   Icon:IcDoc},
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
  const [showEdit, setShowEdit]   = useState(false);
  const [showInst, setShowInst]   = useState(false);
  const [moveTo, setMoveTo]       = useState(null);   // stage change modal ka target
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

  if (loading) return <div style={{padding:"14px 18px", background:T.bg, minHeight:"100%"}}><Loading text="Tender khul raha hai..."/></div>;
  if (!data)   return (
    <div style={{padding:"14px 18px", background:T.bg, minHeight:"100%"}}>
      <SecBtn label="Peeche" Icon={IcBack} onClick={onBack}/>
      <Empty Icon={IcGavel} text="Tender nahi mila."/>
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
  // Contract vs estimate — government tender me above/below quote matlab rakhta hai.
  const vsEstimate = (estimated > 0 && contract > 0)
    ? ((contract - estimated) / estimated) * 100
    : null;

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

  // Ek click me nahi — poora form khulta hai (kitna, kab, reference, wajah).
  const [instActionOn, setInstActionOn] = useState(null);   // {inst, action}

  const unlink = async (p) => {
    if (!await window.confirmAsync(`"${p.name}" ko is tender se alag karein?\n\nProject khud delete nahi hoga.`)) return;
    const res = await api.put(`/tenders/${tenderId}/link-project`, {project_id:p.id, action:"unlink"});
    if (!res?.success) { toast.error(res?.message || "Unlink nahi hua"); return; }
    toast.success(res.message || "Alag kar diya");
    load();
  };

  const delDoc = async (d) => {
    if (!await window.confirmAsync(`Document "${d.name}" hataayein?`)) return;
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
              {data.party_name || data.department_name || "Department set nahi"}
            </div>
          </div>
          <div style={{textAlign:"right", flexShrink:0}}>
            <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px"}}>Contract Value</div>
            <div style={{fontSize:20, fontWeight:700, color:contract?T.grn:T.t4, fontVariantNumeric:"tabular-nums", lineHeight:1.2}}>
              {contract ? moneyF(contract) : "--"}
            </div>
          </div>
          <SecBtn label="Edit" Icon={IcEdit} onClick={()=>setShowEdit(true)}/>
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
          <PHead title="Tender Pipeline"
            sub={data.status==="lost" ? "Yeh tender lost hai — pipeline aage nahi badhi." : undefined}
            action={(()=>{
              // Aage sirf ek step. Peeche jaana Edit modal me hai (admin-only) —
              // usko pipeline par button banane se galti se click hone ka dar hai.
              const nxt = nextStageOf(data.status);
              const canLost = data.status === "bidding";
              const canRevive = data.status === "lost" && isAdmin;
              if (!nxt && !canLost && !canRevive) return null;
              return (
                <div style={{display:"flex", gap:7}}>
                  {canLost && <SecBtn label="Lost mark karo" Icon={IcX} color={T.red}
                    onClick={()=>setMoveTo("lost")}/>}
                  {canRevive && <SecBtn label="Wapas Bidding me" Icon={IcUndo}
                    onClick={()=>setMoveTo("bidding")}/>}
                  {nxt && <PrimBtn label={sMeta(nxt).label + " karo"} Icon={IcChk}
                    onClick={()=>setMoveTo(nxt)}/>}
                </div>
              );
            })()}/>
          <div style={{padding:"16px 18px"}}>
            {data.status==="lost" ? (
              <div style={{display:"flex", alignItems:"center", gap:10}}>
                <Pill label="Lost" c={T.red} bg={T.redL}/>
                <span style={{fontSize:12.5, color:T.t3}}>
                  Bid haar gaye. EMD refund pending hai to upar alert dikhega.
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
          <Stat label="Estimated Cost" color={T.slt} Icon={IcRupee}
            value={estimated ? money(estimated) : "--"}
            note={estimated ? moneyF(estimated) : "Set nahi"}/>
          <Stat label="Contract Value" color={T.grn} Icon={IcRupee}
            value={contract ? money(contract) : "--"}
            note={vsEstimate === null ? (contract ? moneyF(contract) : "Set nahi")
              : `${vsEstimate>=0?"+":""}${vsEstimate.toFixed(1)}% vs estimate`}/>
          <Stat label="Security Held" color={securityHeld?T.blu:T.slt} Icon={IcLock}
            value={money(securityHeld)}
            note={`${activeInst.length} active instrument${activeInst.length===1?"":"s"}`}/>
          <Stat label="Time Elapsed" color={timePct===null?T.slt:timePct>100?T.red:timePct>80?T.amb:T.blu} Icon={IcClock}
            value={timePct===null ? "--" : `${timePct}%`}
            note={timeNote}/>
        </div>

        {/* Key dates */}
        <Panel style={{marginBottom:11}}>
          <PHead title="Key Dates"/>
          <div style={{padding:"13px 16px", display:"grid",
            gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:13}}>
            {KEY_DATES.map(([label,val])=>(
              <div key={label}>
                <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:3}}>{label}</div>
                <div style={{fontSize:12.5, color:val?T.t1:T.t4, fontWeight:val?600:400}}>{fmtDate(val)}</div>
              </div>
            ))}
            <div>
              <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:3}}>Agreement No.</div>
              <div style={{fontSize:12.5, color:data.agreement_no?T.t1:T.t4, fontWeight:data.agreement_no?600:400}}>{data.agreement_no || "--"}</div>
            </div>
            <div>
              <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:3}}>DLP</div>
              <div style={{fontSize:12.5, color:data.dlp_months?T.t1:T.t4, fontWeight:data.dlp_months?600:400}}>
                {data.dlp_months ? `${data.dlp_months} months` : "--"}
              </div>
            </div>
            <div>
              <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:3}}>Bid Submission Type</div>
              <div style={{fontSize:12.5, color:data.bid_submission_type?T.t1:T.t4, fontWeight:data.bid_submission_type?600:400}}>
                {(BID_SUBMISSION_TYPES.find(o=>o.v===data.bid_submission_type)||{}).l || "--"}
              </div>
            </div>
          </div>
          {data.nit_clauses && (
            <div style={{padding:"11px 16px", borderTop:`1px solid ${T.b1}`, background:T.surfaceB}}>
              <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:4}}>NIT ke Main Points</div>
              <div style={{fontSize:12.5, color:T.t2, lineHeight:1.55, whiteSpace:"pre-wrap"}}>{data.nit_clauses}</div>
            </div>
          )}
          {data.notes && (
            <div style={{padding:"11px 16px", borderTop:`1px solid ${T.b1}`, background:T.surfaceB}}>
              <div style={{fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:4}}>Notes</div>
              <div style={{fontSize:12.5, color:T.t2, lineHeight:1.55, whiteSpace:"pre-wrap"}}>{data.notes}</div>
            </div>
          )}
        </Panel>

        {/* Stage history — pichhle 5 change */}
        {!!(data.stage_log||[]).length && (
          <Panel style={{marginBottom:11}}>
            <PHead title="Stage History" sub="Pichhle 5 change"/>
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
          <PHead title="Sites" sub={`${projects.length} project is tender se jude hain`}
            action={stageReached(data.status,"execution")
              ? <SecBtn label="Sites tab" onClick={()=>setTab("sites")}/> : undefined}/>
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
          rateType={data.rate_type} autoImport={freshBoq}/>
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

      {/* ══ SITES ══ */}
      {tab==="sites" && (
        <Panel>
          <PHead title="Linked Sites" sub="Is tender ke against chal rahe projects"
            action={<div style={{display:"flex", gap:7}}>
              <SecBtn label="Link Existing Project" Icon={IcLink} onClick={()=>setShowLink(true)}/>
              <PrimBtn label="New Site" Icon={IcAdd} onClick={()=>setShowSite(true)}/>
            </div>}/>
          {!projects.length && (
            <Empty Icon={IcSite} text="Abhi koi site nahi."
              sub="Naya project banao ya pehle se bana project link karo."/>
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
                    <SecBtn label="Open" onClick={()=>onOpenProject && onOpenProject(p.id)}/>
                    <SecBtn label="Unlink" Icon={IcUnlink} color={T.red} onClick={()=>unlink(p)}/>
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
          <Stat label="Held with Dept" color={securityHeld?T.blu:T.slt} Icon={IcLock}
            value={money(securityHeld)} note={`${activeInst.length} active`}/>
          <Stat label="Released / Refunded" color={T.grn} Icon={IcChk}
            value={money(releasedSum)}
            note={`${instruments.filter(i=>["released","refunded"].includes(i.status)).length} instrument`}/>
          <Stat label="Expiring ≤30d" color={expiringInst.length?T.red:T.slt} Icon={IcWarn}
            value={expiringInst.length} note="validity nazdeek"/>
        </div>

        <Panel>
          <PHead title="Instrument Register" sub="EMD · BG · FDR · Security Deposit"
            action={<PrimBtn label="Add Instrument" Icon={IcAdd} onClick={()=>setShowInst(true)}/>}/>
          {!instruments.length && (
            <Empty Icon={IcBank} text="Abhi koi instrument nahi."
              sub="EMD, BG, FDR ya security deposit yahan record karo."/>
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
                      <SecBtn label="Release" onClick={()=>setInstActionOn({inst, action:"release"})}/>
                      <SecBtn label="Refund"  color={T.grn} onClick={()=>setInstActionOn({inst, action:"refund"})}/>
                      <SecBtn label="Forfeit" color={T.red} onClick={()=>setInstActionOn({inst, action:"forfeit"})}/>
                    </>) : (
                      <div style={{textAlign:"right", fontSize:10.5, color:T.t4, lineHeight:1.5}}>
                        <div style={{color:T.t3, fontWeight:600}}>{fmtDate(inst.release_date)}</div>
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
      </>)}

      {/* ══ DOCUMENTS ══ */}
      {tab==="documents" && (
        <Panel>
          <PHead title="Documents" sub="NIT · LOA · Agreement · BG copy"
            action={<PrimBtn label="Upload Document" Icon={IcUpload} onClick={()=>setShowDoc(true)}/>}/>
          {!documents.length && (
            <Empty Icon={IcDoc} text="Abhi koi document nahi."
              sub="NIT, LOA, agreement ya BG copy upload karo."/>
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
                  <SecBtn label="View" Icon={IcEye} onClick={()=>window.open(d.url, "_blank", "noopener")}/>
                  <SecBtn label="Delete" color={T.red} onClick={()=>delDoc(d)}/>
                </div>
              </div>
            ))}
          </>)}
        </Panel>
      )}

      {/* ── MODALS ── */}
      {/* onDeleted → list par wapas; TenderList mount hote hi dobara fetch karta hai. */}
      {showEdit && <EditTenderModal tender={data} onClose={()=>setShowEdit(false)}
        onSaved={()=>load()} onDeleted={onBack}/>}
      {showInst && <AddInstrumentModal tenderId={tenderId} tenderStatus={data.status}
        onClose={()=>setShowInst(false)} onSaved={()=>load()}/>}
      {instActionOn && (
        <InstrumentActionModal tenderId={tenderId} inst={instActionOn.inst} action={instActionOn.action}
          onClose={()=>setInstActionOn(null)} onDone={()=>{ setInstActionOn(null); load(); }}/>
      )}
      {moveTo && <TransitionModal tender={data} projects={projects} target={moveTo}
        onClose={()=>setMoveTo(null)} onDone={()=>{ setMoveTo(null); load(); }}/>}
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
