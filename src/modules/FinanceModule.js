import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import TransactionDetailDrawer from "../components/TransactionDetailDrawer";
import LibrarySelect from "../components/LibrarySelect";
import api from "../config/api";
import useDebounce from "../utils/useDebounce";

// ── ICON BASE ────────────────────────────────────────────────────────
const Ic=({d,size=18,color="currentColor",sw=1.8,fill="none",style})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}><path d={d}/></svg>
);
const IcHome  =(p)=><Ic {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>;
const IcProj  =(p)=><Ic {...p} d="M3 7h18M3 12h18M3 17h18"/>;
const IcFin   =(p)=><Ic {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>;
const IcDes   =(p)=><Ic {...p} d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/>;
const IcRep   =(p)=><Ic {...p} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>;
const IcSet   =(p)=><Ic {...p} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcWH    =(p)=><Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/>;
const IcProc  =(p)=><Ic {...p} d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>;
const IcMenu  =(p)=><Ic {...p} d="M4 6h16M4 12h16M4 18h16"/>;
const IcBell  =(p)=><Ic {...p} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>;
const IcSrch  =(p)=><Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;
const IcLoc   =(p)=><Ic {...p} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcAdd   =(p)=><Ic {...p} d="M12 5v14M5 12h14"/>;
const IcEye   =(p)=><Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0"/>;
const IcEyeX  =(p)=><Ic {...p} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>;
const IcTeam  =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z"/>;
const IcCRM   =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a3 3 0 00-3-3M16 3.13a4 4 0 010 7.75"/>;
const IcMOM   =(p)=><Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>;
const IcPay   =(p)=><Ic {...p} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>;
const IcLib   =(p)=><Ic {...p} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>;
const IcX     =(p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcCopy  =(p)=><Ic {...p} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>;
const IcChk   =(p)=><Ic {...p} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>;
const IcHeart =(p)=><Ic {...p} d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="currentColor"/>;
const IcMsg   =(p)=><Ic {...p} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>;
const IcWarn  =(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"/>;
const IcDown  =(p)=><Ic {...p} d="M6 9l6 6 6-6"/>;
const IcBank  =(p)=><Ic {...p} d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11"/>;
const IcWallet=(p)=><Ic {...p} d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 13a1 1 0 100 2 1 1 0 000-2zM2 9h20"/>;
const IcArrow =(p)=><Ic {...p} d="M5 12h14M12 5l7 7-7 7"/>;
const IcBack  =(p)=><Ic {...p} d="M19 12H5M12 19l-7-7 7-7"/>;
const IcFilter=(p)=><Ic {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>;
const IcUB    =(p)=><Ic {...p} d="M9 14l2 2 4-4M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5H7zM15 3v5h5"/>;
const IcGrid  =(p)=><Ic {...p} d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>;
const IcListV =(p)=><Ic {...p} d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01"/>;
const IcPulse =(p)=><Ic {...p} d="M22 12h-4l-3 9L9 3l-3 9H2"/>;
const IcClip  =(p)=><Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>;
const IcTrendUp  =(p)=><Ic {...p} d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"/>;
const IcTrendDn  =(p)=><Ic {...p} d="M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6"/>;
const IcRecv     =(p)=><Ic {...p} d="M12 2v10m0 0l-3-3m3 3l3-3M3 17a9 9 0 0018 0"/>;
const IcSend     =(p)=><Ic {...p} d="M12 22V12m0 0l-3 3m3-3l3 3M21 7a9 9 0 00-18 0"/>;
const IcFileInv  =(p)=><Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
const IcCalDue   =(p)=><Ic {...p} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>;
const IcThumbUp  =(p)=><Ic {...p} d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>;
const IcBillDue  =(p)=><Ic {...p} d="M9 14l2 2 4-4M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5H7zM15 3v5h5"/>;
const IcOverdue  =(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;
const IcClock7   =(p)=><Ic {...p} d="M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2"/>;
const IcEdit     =(p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcPendClk  =(p)=><Ic {...p} d="M22 12h-4l-3 3-4-6-3 3H2M12 2a10 10 0 100 20A10 10 0 0012 2"/>;
const IcPayOut   =(p)=><Ic {...p} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>;

// ── COLORS ───────────────────────────────────────────────────────────
const C={
  p:"#1565C0",p2:"#1976D2",a:"#FF6F00",a2:"#FFA726",
  sb:"#0D1B2A",sbH:"#1E2E42",
  w:"#FFFFFF",bg:"#F1F4F8",t:"#1A2332",tm:"#4A5568",tl:"#8896A6",b:"#E2E8F0",
  g:"#2E7D32",gl:"#E8F5E9",o:"#E65100",ol:"#FFF3E0",
  r:"#C62828",rl:"#FFEBEE",bl:"#E3F2FD",
  pur:"#6A1B9A",purl:"#F3E5F5",teal:"#00695C",tealL:"#E0F2F1",
  pink:"#AD1457",pinkL:"#FCE4EC",
};
const fmt=(n)=>n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:`${(n/1000).toFixed(0)}K`;
const fmtN=(n)=>Math.abs(n).toLocaleString("en-IN");
const T={
  bg:"#F4F6F9",surface:"#FFFFFF",surfaceB:"#F8F9FB",
  t1:"#111827",t2:"#374151",t3:"#6B7280",t4:"#9CA3AF",
  b1:"#E5E7EB",b2:"#D1D5DB",
  blu:"#2563EB",bluL:"#EFF6FF",bluM:"#BFDBFE",
  grn:"#059669",grnL:"#ECFDF5",grnM:"#A7F3D0",
  amb:"#D97706",ambL:"#FFFBEB",ambM:"#FDE68A",
  red:"#DC2626",redL:"#FEF2F2",redM:"#FECACA",
  slt:"#64748B",sltL:"#F1F5F9",
  pur:"#7C3AED",purL:"#F5F3FF",
};

// ── SHARED DOWNLOAD HELPERS ───────────────────────────────────────────
const downloadCSV=(filename,rows)=>{
  const csv=rows.map(r=>r.map(c=>`"${String(c==null?"":c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
};
const printHTML=(title,bodyHTML)=>{
  const w=window.open("","_blank");
  w.document.write(`<html><head><title>${title}</title><style>
    *{font-family:Arial,sans-serif;font-size:12px;margin:0;padding:0}
    body{padding:20px}h2{color:#1565C0;margin-bottom:6px}p{color:#555;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th{background:#E3F2FD;color:#1565C0;padding:8px 10px;text-align:left;border:1px solid #BFDBFE;font-size:11px;text-transform:uppercase;letter-spacing:0.4px}
    td{padding:7px 10px;border:1px solid #E5E7EB;vertical-align:top}
    tr:nth-child(even) td{background:#FAFAFA}
    .cr{color:#059669;font-weight:700}.dr{color:#DC2626;font-weight:700}
    .footer{margin-top:16px;font-size:11px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:8px}
    @media print{button{display:none}}
  </style></head><body>${bodyHTML}</body></html>`);
  w.document.close();setTimeout(()=>w.print(),400);
};

// ── NAV GROUPS ───────────────────────────────────────────────────────
const NAV_GROUPS=[
  {section:null,items:[
    {id:"dashboard",label:"Dashboard",Icon:IcHome},
    {id:"projects",label:"Projects",Icon:IcProj},
    {id:"crm",label:"CRM",Icon:IcCRM},
    {id:"mom",label:"MOM",Icon:IcMOM},
    {id:"team",label:"Team Schedule",Icon:IcTeam},
    {id:"design",label:"Design",Icon:IcDes,badge:"NEW",bc:C.a},
  ]},
  {section:"FINANCE & OPS",items:[
    {id:"finance",label:"Finance",Icon:IcFin},
    {id:"procurement",label:"Procurement",Icon:IcProc,badge:11,bc:C.p},
    {id:"warehouse",label:"Warehouse",Icon:IcWH},
    {id:"payroll",label:"Payroll",Icon:IcPay},
  ]},
  {section:"REPORTS",items:[
    {id:"reports",label:"Reports",Icon:IcRep},
    {id:"library",label:"Library",Icon:IcLib},
    {id:"settings",label:"Settings",Icon:IcSet},
  ]},
];

// ── PROJECTS DATA ────────────────────────────────────────────────────
const PROJECTS_DATA=[];
const TEAM=[];
const PULSE_FEED=[];
const STATUS_META={"Ongoing":{bg:C.gl,text:C.g},"Completed":{bg:C.bl,text:C.p},"Hold":{bg:C.ol,text:C.o},"Not Started":{bg:C.b,text:C.tl}};

// ── FINANCE DATA ─────────────────────────────────────────────────────
const ACCOUNTS=[];
const WALLETS=[];
const WALLET_TXNS=[];

const PARTIES=[];
const PARTY_TXNS={};
const TXN_TYPE_META={"Payment In":{color:C.g,bg:C.gl},"Payment Out":{color:C.r,bg:C.rl},"Material Purchase":{color:C.p,bg:C.bl},"Site Expense":{color:C.o,bg:C.ol},"Party Payment":{color:C.pur,bg:C.purl},"Sub-Con Expense":{color:C.teal,bg:C.tealL},"Material Return":{color:C.a,bg:"#FFF8E1"},"Sales Invoice":{color:C.g,bg:C.gl},"Unbilled Material":{color:C.pink,bg:C.pinkL},"Wallet Payment":{color:"#00695C",bg:"#E0F2F1"},"Wallet Top-up":{color:C.p,bg:C.bl}};
const TRANSACTIONS_DATA=[];
const UNBILLED_PARTIES=[];
const PAY_REQS_DATA=[];
const PEND_PMTS_DATA=[];


// ── SITE PULSE DRAWER ─────────────────────────────────────────────────
function SitePulseDrawer({onClose}){
  const [site,setSite]=useState("All");const [type,setType]=useState("All");const [liked,setLiked]=useState({});
  const tagMeta={"progress":{c:C.g,b:C.gl},"material":{c:C.p,b:C.bl},"issue":{c:C.r,b:C.rl},"approval":{c:C.teal,b:C.tealL}};
  const filtered=PULSE_FEED.filter(f=>(site==="All"||f.site.includes(site))&&(type==="All"||f.type===type));
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.48)",zIndex:200,backdropFilter:"blur(2px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:390,background:T.bg,zIndex:201,boxShadow:"-8px 0 40px rgba(0,0,0,0.24)",display:"flex",flexDirection:"column",animation:"slideIn 0.22s ease",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:C.w,padding:"12px 14px 10px",borderBottom:`1px solid ${C.b}`,flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:C.g,boxShadow:`0 0 0 3px ${C.gl}`,animation:"livePulse 1.5s infinite"}}/>
            <span style={{fontSize:14,fontWeight:800,color:C.t}}>Site Pulse</span>
            <span style={{background:C.r,color:"white",fontSize:8,fontWeight:800,padding:"2px 5px",borderRadius:4,letterSpacing:"0.6px"}}>LIVE</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.tl,display:"flex"}}><IcX size={15}/></button>
        </div>
        <div style={{display:"flex",gap:6}}>
          <select value={site} onChange={e=>setSite(e.target.value)} style={{flex:1,padding:"6px 8px",borderRadius:7,border:`1.5px solid ${C.b}`,fontSize:11.5,background:T.sltL,outline:"none",fontFamily:"inherit",color:C.t}}>
            <option>All</option>{[].map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={type} onChange={e=>setType(e.target.value)} style={{flex:1,padding:"6px 8px",borderRadius:7,border:`1.5px solid ${C.b}`,fontSize:11.5,background:T.sltL,outline:"none",fontFamily:"inherit",color:C.t}}>
            {["All","photo","material","issue","approval"].map(t=><option key={t} value={t}>{t==="All"?"All Types":t[0].toUpperCase()+t.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>
        {filtered.map(f=>{
          const tm=tagMeta[f.tag]||{c:C.tm,b:C.b};const isL=liked[f.id];
          return(
            <div key={f.id} style={{background:C.w,borderRadius:12,marginBottom:8,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
              <div style={{display:"flex",alignItems:"center",gap:9,padding:"10px 12px 7px"}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${f.ac},${f.ac}99)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"white",flexShrink:0}}>{f.user.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:T.t1}}>{f.user} <span style={{fontSize:10,fontWeight:400,color:C.tl}}>· {f.role}</span></div><div style={{fontSize:10,color:C.tl}}>{f.site} · {f.time}</div></div>
                <span style={{background:tm.b,color:tm.c,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,textTransform:"capitalize"}}>{f.tag}</span>
              </div>
              {f.img&&<img src={f.img} alt="site" style={{width:"100%",height:180,objectFit:"cover",display:"block"}} onError={e=>{e.target.parentElement.innerHTML='<div style="height:180px;background:linear-gradient(135deg,#E3F2FD,#BBDEFB);display:flex;align-items:center;justify-content:center;font-size:40px">🏗️</div>';}}/>}
              {!f.img&&f.type==="issue"&&<div style={{margin:"0 12px 6px",background:C.rl,borderRadius:8,padding:"8px 11px",borderLeft:`3px solid ${C.r}`,display:"flex",gap:7,alignItems:"center"}}><IcWarn size={13} color={C.r}/><span style={{fontSize:11.5,color:C.r,fontWeight:500}}>Issue Flagged</span></div>}
              {!f.img&&f.type==="approval"&&<div style={{margin:"0 12px 6px",background:C.tealL,borderRadius:8,padding:"8px 11px",borderLeft:`3px solid ${C.teal}`,display:"flex",gap:7,alignItems:"center"}}><IcChk size={13} color={C.teal}/><span style={{fontSize:11.5,color:C.teal,fontWeight:500}}>Payment Approved</span></div>}
              {!f.img&&f.type==="material"&&<div style={{margin:"0 12px 6px",background:C.bl,borderRadius:8,padding:"8px 11px",borderLeft:`3px solid ${C.p}`,display:"flex",gap:7,alignItems:"center"}}><span style={{fontSize:16}}>📦</span><span style={{fontSize:11.5,color:C.p,fontWeight:500}}>Material Received</span></div>}
              <div style={{padding:"7px 12px 4px"}}><span style={{fontSize:12,color:C.t,lineHeight:1.45}}><strong>{f.user}</strong> {f.caption}</span></div>
              <div style={{padding:"5px 12px 10px",display:"flex",gap:14,alignItems:"center"}}>
                <button onClick={()=>setLiked(p=>({...p,[f.id]:!p[f.id]}))} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:isL?C.r:C.tl,padding:0}}>
                  <IcHeart size={16} color={isL?C.r:C.tl} fill={isL?C.r:"none"}/><span style={{fontSize:11,fontWeight:600}}>{f.likes+(isL?1:0)}</span>
                </button>
                <button style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:C.tl,padding:0}}><IcMsg size={15} color={C.tl}/><span style={{fontSize:11,fontWeight:600}}>{f.comments}</span></button>
                <div style={{flex:1}}/><span style={{fontSize:9.5,color:C.tl}}>{f.time}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{padding:"10px 12px",background:T.surface,borderTop:`1px solid ${T.b1}`}}>
        <button style={{width:"100%",padding:"9px",borderRadius:8,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>View Full Site Pulse →</button>
      </div>
    </div>
  </>);
}

// ── DUPLICATE MODAL ───────────────────────────────────────────────────
function DuplicateModal({project,onClose,onConfirm}){
  const [step,setStep]=useState(1);const [done,setDone]=useState(false);
  const [form,setForm]=useState({name:`${project.name} — Copy`,city:project.city,boq:project.boq,start:"",end:""});
  const [pm,setPM]=useState(project.pm);const [sup,setSup]=useState("");
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
  const handleCreate=()=>{setDone(true);setTimeout(()=>{onConfirm({...project,id:Date.now(),name:form.name,city:form.city,boq:Number(form.boq),pm,progress:0,status:"Not Started",expense:0,start:form.start||"TBD",end:form.end||"TBD"});onClose();},1400);};
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.52)",zIndex:300,backdropFilter:"blur(3px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,width:500,maxWidth:"95vw",zIndex:301,boxShadow:"0 24px 70px rgba(0,0,0,0.32)",overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:T.blu,padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center"}}><IcCopy size={17} color="white"/></div>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:"white"}}>Duplicate Project</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.72)"}}>Tasks, dependencies & BOQ carry over automatically</div></div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",color:"white",padding:"5px 7px",borderRadius:7,display:"flex"}}><IcX size={14}/></button>
      </div>
      <div style={{display:"flex",alignItems:"center",padding:"10px 20px",borderBottom:`1px solid ${T.b1}`,background:T.surfaceB}}>
        {["Project Details","Team Assignment","Review"].map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",flex:i<2?1:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:step>i+1?T.grn:step===i+1?T.blu:T.b1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:step>=i+1?"white":T.t4,transition:"all 0.3s",flexShrink:0}}>{step>i+1?"✓":i+1}</div>
              <span style={{fontSize:11,fontWeight:step===i+1?700:400,color:step===i+1?T.blu:step>i+1?T.grn:T.t4,whiteSpace:"nowrap"}}>{s}</span>
            </div>
            {i<2&&<div style={{flex:1,height:2,background:step>i+1?T.grn:T.b1,margin:"0 10px",borderRadius:2,transition:"background 0.3s"}}/>}
          </div>
        ))}
      </div>
      <div style={{padding:"16px 20px",maxHeight:340,overflowY:"auto"}}>
        {step===1&&<div>
          <div style={{background:T.sltL,borderRadius:8,padding:"9px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8,border:`1px solid ${T.b1}`}}>
            <span style={{fontSize:11,color:T.t3}}>Copying from:</span><strong style={{fontSize:11.5,color:T.t1,flex:1}}>{project.name}</strong>
            <span style={{background:T.bluL,color:T.blu,fontSize:9.5,fontWeight:700,padding:"2px 7px",borderRadius:20}}>Template</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["New Project Name *",form.name,"name","text",true],["City *",form.city,"city","text",false],["BOQ Value (₹) *",form.boq,"boq","number",false],["Type",project.type,"_type","text",false],["Start Date",form.start,"start","date",false],["End Date",form.end,"end","date",false]].map(([lbl,val,key,type,full])=>(
              <div key={key} style={{gridColumn:full?"1 / -1":"auto"}}>
                <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>{lbl}</label>
                <input type={type} value={val} onChange={e=>setF(key,e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.sltL,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
              </div>
            ))}
          </div>
          <div style={{background:T.grnL,borderRadius:8,padding:"8px 12px",fontSize:11,color:T.grn,display:"flex",gap:6,marginTop:12}}><span>✅</span><span>All tasks, BOQ items, dependencies & phases will be copied automatically.</span></div>
        </div>}
        {step===2&&<div>
          <p style={{fontSize:11.5,color:T.t4,margin:"0 0 14px"}}>Click to assign team for the new project.</p>
          {[{role:"Project Manager",val:pm,setter:setPM,prev:project.pm},{role:"Site Supervisor",val:sup,setter:setSup,prev:""}].map(({role,val,setter,prev})=>(
            <div key={role} style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:7}}>{role}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {TEAM.map(t=><button key={t.id} onClick={()=>setter(t.name)} style={{padding:"6px 11px",borderRadius:7,border:`1.5px solid ${val===t.name?t.color:T.b1}`,background:val===t.name?t.color+"14":T.sltL,fontSize:11.5,color:val===t.name?t.color:T.t2,fontWeight:val===t.name?700:400,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:val===t.name?t.color:T.b2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:val===t.name?"white":T.t4}}>{t.initials}</div>
                  {t.name}{prev===t.name&&<span style={{fontSize:8.5,color:T.t4}}>(prev)</span>}
                </button>)}
              </div>
            </div>
          ))}
        </div>}
        {step===3&&(!done
          ?<div>
            <div style={{fontSize:12,fontWeight:700,color:T.t1,marginBottom:10}}>Review before creating:</div>
            {[["Project Name",form.name],["City",form.city],["BOQ",`₹${Number(form.boq).toLocaleString("en-IN")}`],["PM",pm],["Supervisor",sup],["Timeline",`${form.start||"TBD"} → ${form.end||"TBD"}`],["Initial Status","Not Started · 0%"],["Carry Over","Tasks · BOQ · Phases · Dependencies"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",padding:"7px 0",borderBottom:`1px solid ${T.b1}`}}><span style={{width:140,fontSize:11.5,color:T.t3,flexShrink:0}}>{k}</span><span style={{fontSize:11.5,fontWeight:600,color:T.t1}}>{v}</span></div>
            ))}
          </div>
          :<div style={{textAlign:"center",padding:"28px 0"}}><div style={{fontSize:44,marginBottom:10}}>✅</div><div style={{fontSize:15,fontWeight:800,color:T.grn}}>Project Created!</div><div style={{fontSize:12,color:T.t4,marginTop:4}}>{form.name} added.</div></div>
        )}
      </div>
      {!done&&<div style={{padding:"12px 20px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:8,background:T.surfaceB}}>
        {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"9px",borderRadius:8,border:`1.5px solid ${T.b1}`,background:T.sltL,fontSize:12,fontWeight:600,color:T.t2,cursor:"pointer"}}>← Back</button>}
        <button onClick={step<3?()=>setStep(s=>s+1):handleCreate} style={{flex:2,padding:"9px",borderRadius:8,background:step===3?T.grn:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
          {step===1?"Next: Team →":step===2?"Next: Review →":"✓ Create Duplicate"}
        </button>
      </div>}
    </div>
  </>);
}


// ─── SEARCHABLE SELECT COMBOBOX ───────────────────────────────
// Uses position:fixed for the dropdown so it is never clipped by overflow:hidden parents
function SearchSelect({options,value,onChange,placeholder,accent,compact,onAfterSelect,inputRef}){
  const [open,setOpen]=useState(false);
  const [q,setQ]=useState("");
  const [hi,setHi]=useState(-1);
  const [dropPos,setDropPos]=useState({top:0,left:0,width:180});
  const wrapRef=useRef(null);
  const ownInputRef=useRef(null);
  const listRef=useRef(null);
  const ac=accent||T.blu;
  const ht=compact?28:30;
  const opts=Array.isArray(options)?options:[];
  const filtered=q?opts.filter(o=>(typeof o==="string"?o:o.label).toLowerCase().includes(q.toLowerCase())):opts;

  // close on outside click
  useEffect(()=>{
    const h=e=>{
      if(wrapRef.current&&!wrapRef.current.contains(e.target)){
        setOpen(false);setQ("");setHi(-1);
      }
    };
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  // reposition when open changes
  useEffect(()=>{
    if(!open) return;
    const recalc=()=>{
      const el=ownInputRef.current;
      if(el){
        const r=el.getBoundingClientRect();
        setDropPos({top:r.bottom+2,left:r.left,width:Math.max(r.width,180)});
      }
    };
    recalc();
    window.addEventListener("scroll",recalc,true);
    window.addEventListener("resize",recalc);
    return()=>{
      window.removeEventListener("scroll",recalc,true);
      window.removeEventListener("resize",recalc);
    };
  },[open]);

  // scroll highlighted item into view
  useEffect(()=>{
    if(hi>=0&&listRef.current){
      const items=listRef.current.querySelectorAll("[data-opt]");
      if(items[hi]) items[hi].scrollIntoView({block:"nearest"});
    }
  },[hi]);

  const handleSelect=(val)=>{
    onChange(val);setQ("");setOpen(false);setHi(-1);
    if(onAfterSelect) setTimeout(()=>onAfterSelect(),30);
  };

  const openDrop=()=>{
    const el=ownInputRef.current;
    if(el){
      const r=el.getBoundingClientRect();
      setDropPos({top:r.bottom+2,left:r.left,width:Math.max(r.width,180)});
    }
    setQ("");setHi(-1);setOpen(true);
  };

  const assignRef=el=>{
    ownInputRef.current=el;
    if(inputRef){if(typeof inputRef==="function") inputRef(el); else inputRef.current=el;}
  };

  const onKeyDown=e=>{
    if(!open){if(e.key==="ArrowDown"||e.key==="Enter") openDrop(); return;}
    if(e.key==="Escape"||e.key==="Tab"){setOpen(false);setQ("");setHi(-1);if(e.key==="Escape")e.preventDefault();return;}
    if(e.key==="ArrowDown"){
      e.preventDefault();
      setHi(p=>p<filtered.length-1?p+1:0);
    } else if(e.key==="ArrowUp"){
      e.preventDefault();
      setHi(p=>p>0?p-1:filtered.length-1);
    } else if(e.key==="Enter"){
      e.preventDefault();
      const idx=hi>=0?hi:0;
      if(filtered[idx]){const v=typeof filtered[idx]==="string"?filtered[idx]:filtered[idx].value; handleSelect(v);}
    }
  };

  return(
    <div ref={wrapRef} style={{position:"relative"}}>
      <input
        ref={assignRef}
        value={open?q:value||""}
        onChange={e=>{setQ(e.target.value);setHi(-1);if(!open)openDrop();}}
        onFocus={()=>{if(!open)openDrop();}}
        onMouseDown={e=>{if(open){e.preventDefault();setOpen(false);setQ("");setHi(-1);}}}
        onBlur={e=>{
          // Close only if focus goes outside the entire component (not to the dropdown portal)
          setTimeout(()=>{
            if(document.activeElement&&listRef.current&&listRef.current.contains(document.activeElement)) return;
            setOpen(false);setQ("");setHi(-1);
          },150);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder||"Type or select..."}
        autoComplete="off"
        style={{height:ht,padding:`0 22px 0 7px`,borderRadius:5,
          border:`1.5px solid ${open?ac:T.b1}`,fontSize:compact?11:12,outline:"none",
          boxSizing:"border-box",fontFamily:"inherit",background:T.surface,width:"100%",
          cursor:"pointer"}}/>
      <span style={{position:"absolute",right:5,top:"50%",transform:`translateY(-50%) rotate(${open?180:0}deg)`,
        pointerEvents:"none",display:"flex",color:T.t4,transition:"transform 0.18s"}}>
        <IcDown size={10} color="currentColor"/>
      </span>
      {open&&createPortal(
        <div ref={listRef}
          style={{position:"fixed",top:dropPos.top,left:dropPos.left,minWidth:dropPos.width,
            background:T.surface,borderRadius:8,border:`1.5px solid ${ac}`,
            boxShadow:"0 8px 28px rgba(0,0,0,0.2)",zIndex:99999,maxHeight:220,overflowY:"auto",
            animation:"fadeSlideIn 0.12s ease"}}>
          {filtered.length===0&&(
            <div style={{padding:"12px 10px",fontSize:11,color:T.t4,textAlign:"center"}}>No match found</div>
          )}
          {filtered.map((opt,i)=>{
            const label=typeof opt==="string"?opt:opt.label;
            const val=typeof opt==="string"?opt:opt.value;
            const isCur=val===value;
            const isHi=i===hi;
            return(
              <div key={i} data-opt={i}
                onMouseDown={e=>{e.preventDefault();handleSelect(val);}}
                onMouseEnter={()=>setHi(i)}
                style={{padding:"7px 11px",fontSize:12,cursor:"pointer",
                  color:isCur?ac:T.t1,fontWeight:isCur?700:400,
                  background:isHi?(isCur?ac+"28":T.sltL):isCur?ac+"14":"transparent",
                  borderBottom:i<filtered.length-1?`1px solid ${T.b1}`:"none",
                  whiteSpace:"nowrap",outline:isHi?`2px solid ${ac}44`:"none",
                  outlineOffset:"-2px"}}>
                {label}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── BILL CONFLICT WARNING MODAL ─────────────────────────────────
// Pops up before the bill modal when /finance/check-bill-conflict reports
// the same GRN has already been billed OR the same vendor+challan combo
// already exists. User has 3 paths: Cancel / View Existing / Force New
// (with compulsory reason — admin gets a notification when forced).
function BillConflictModal({data, onCancel, onViewExisting, onForceNew}){
  const [showForce,setShowForce]=useState(false);
  const [reason,setReason]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const conflicts=data.challan_conflicts||[];
  const grnLocked=!!data.grn_already_billed;
  const grnTxnId =data.grn_billed_txn_id||null;
  return (
    <>
      <div onClick={onCancel} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",zIndex:3000,backdropFilter:"blur(2px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(520px,92vw)",background:"white",borderRadius:12,zIndex:3001,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:"#FEE2E2",borderBottom:"2px solid #FCA5A5",padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>⚠️</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:"#991B1B"}}>Duplicate Bill Warning</div>
            <div style={{fontSize:11.5,color:"#7F1D1D",marginTop:1}}>
              {grnLocked && conflicts.length>0 ? "Ye GRN aur vendor+challan dono pehle bill ho chuke hain"
              : grnLocked                       ? "Ye GRN pehle se bill ho chuka hai"
              :                                   "Same vendor + challan pehle bill ho chuka hai"}
            </div>
          </div>
        </div>
        {/* Body */}
        <div style={{padding:"14px 18px",maxHeight:"60vh",overflowY:"auto"}}>
          {grnLocked && (
            <div style={{padding:"10px 12px",background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:8,marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:"#92400E",marginBottom:3}}>GRN already locked</div>
              <div style={{fontSize:12.5,color:"#78350F"}}>
                Linked transaction: <strong>TXN-{grnTxnId||"?"}</strong>
              </div>
            </div>
          )}
          {conflicts.length>0 && (
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10.5,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>
                Existing bills with same vendor + challan ({conflicts.length})
              </div>
              {conflicts.map(c=>(
                <div key={c.id} style={{padding:"8px 11px",background:"#F8F9FB",border:"1px solid #E5E7EB",borderRadius:7,marginBottom:5,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11.5,fontWeight:700,color:"#111827"}}>TXN-{c.id} · {c.party_name||"—"}</div>
                    <div style={{fontSize:10.5,color:"#6B7280"}}>{c.date?new Date(c.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—"} · ₹{Number(c.amount).toLocaleString("en-IN")}</div>
                  </div>
                  <button onClick={()=>onViewExisting(c.id)} style={{padding:"4px 10px",borderRadius:5,background:"white",border:"1px solid #BFDBFE",color:"#2563EB",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>View</button>
                </div>
              ))}
            </div>
          )}

          {!showForce ? (
            <div style={{display:"flex",gap:8}}>
              <button onClick={onCancel}
                style={{flex:1,padding:"10px",borderRadius:7,background:"white",border:"1px solid #E5E7EB",color:"#374151",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>
                Cancel
              </button>
              {grnLocked && grnTxnId && (
                <button onClick={()=>onViewExisting(grnTxnId)}
                  style={{flex:1.5,padding:"10px",borderRadius:7,background:"#EFF6FF",border:"1px solid #BFDBFE",color:"#2563EB",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>
                  View Existing Bill
                </button>
              )}
              <button onClick={()=>setShowForce(true)}
                style={{flex:1.5,padding:"10px",borderRadius:7,background:"#FEE2E2",border:"1px solid #FCA5A5",color:"#991B1B",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>
                Force New Bill
              </button>
            </div>
          ) : (
            <div style={{padding:"11px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8}}>
              <div style={{fontSize:11,fontWeight:700,color:"#991B1B",marginBottom:6}}>
                Force karne ke liye reason batao * <span style={{fontWeight:500}}>(admin ko notification jayega)</span>
              </div>
              <textarea value={reason} onChange={e=>setReason(e.target.value)} autoFocus rows={3}
                placeholder="e.g. Vendor ne 2nd partial delivery alag challan se bheji thi, dono ka payment alag karna hai"
                style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #FCA5A5",fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",marginBottom:8,background:"white"}}/>
              <div style={{display:"flex",gap:7}}>
                <button onClick={()=>{setShowForce(false);setReason("");}} disabled={submitting}
                  style={{flex:1,padding:"8px",borderRadius:6,background:"white",border:"1px solid #E5E7EB",color:"#6B7280",fontSize:11.5,fontWeight:600,cursor:submitting?"not-allowed":"pointer"}}>
                  Back
                </button>
                <button onClick={()=>{setSubmitting(true);onForceNew(reason.trim());}}
                  disabled={submitting||!reason.trim()}
                  style={{flex:2,padding:"8px",borderRadius:6,background:submitting||!reason.trim()?"#9CA3AF":"#DC2626",border:"none",color:"white",fontSize:11.5,fontWeight:700,cursor:submitting||!reason.trim()?"not-allowed":"pointer"}}>
                  {submitting?"Opening bill...":"⚠ Force New Bill"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── CREATE TRANSACTION MODAL ─────────────────────────────────
function CreateTransactionModal({type,onClose,preParty,dbParties,dbAccounts,dbProjects,onSaved,prefillGRN,settlesRef}){
  const MAT_HEADS=["Civil","Electrical","Plumbing","Finishing","Structural","Mechanical","Safety","General"];
  const UNITS=["Bag","MT","CuM","Sqft","Nos","Ltr","Kg","RFt","Set","Box","Day","Lumpsum"];
  const INV_UNITS=["Sqft","Nos","RFt","CuM","Sqm","Day","Lumpsum","Set"];
  const ACCOUNTS_LIST=dbAccounts?.length?dbAccounts.map(a=>a.name):[];
  const MOPS_LIST=["Cash","Cheque","Bank Transfer","UPI","NEFT"];
  const WORK_TYPES=["Plastering","Brickwork","Concrete Casting","Tile Laying","Electrical Work","Plumbing","Bar Bending","Painting","Waterproofing","Flooring","Carpentry","False Ceiling","Other"];
  const PROJECTS_LIST=dbProjects?.length?dbProjects:[];
  // Case-insensitive type matching — DB has mixed casing ("client", "Supplier", "subcontractor", "Labour Vendor")
  const _ptype = (p) => String(p?.type||"").toLowerCase().trim();
  const CLIENT_LIST=dbParties?.length?dbParties.filter(p=>_ptype(p)==="client").map(p=>p.name):[];
  const SUPPLIER_LIST=dbParties?.length?dbParties.filter(p=>{const t=_ptype(p);return t==="supplier"||t==="material supplier"||t==="material_supplier";}).map(p=>p.name):[];
  const SUBCON_LIST=dbParties?.length?dbParties.filter(p=>{const t=_ptype(p);return t==="sub-con"||t==="subcon"||t==="contractor"||t==="subcontractor";}).map(p=>p.name):[];
  // Staff loaded from payroll_staff (advances / salary disbursement)
  const [staffList,setStaffList]=useState([]);
  useEffect(()=>{ api.get("/payroll/staff").then(r=>{ if(r?.success&&Array.isArray(r.data)) setStaffList(r.data.map(s=>s.name)); }).catch(()=>{}); },[]);
  const ALL_PARTIES=dbParties?.length?dbParties.map(p=>p.name):[...CLIENT_LIST,...SUPPLIER_LIST,...SUBCON_LIST];

  // Pre-defined material library (used in Material Purchase Bill)
  const MATERIAL_LIBRARY=[
    "TMT Steel Fe500 8mm","TMT Steel Fe500 10mm","TMT Steel Fe500 12mm","TMT Steel Fe500 16mm",
    "TMT Steel Fe550 12mm","Binding Wire",
    "OPC 53 Grade Cement","OPC 43 Grade Cement","PPC Cement","White Cement",
    "River Sand","M-Sand","P-Sand",
    "20mm Aggregate","10mm Aggregate","Gravel",
    "Red Clay Brick 9x4x3","Fly Ash Brick","AAC Block 4\"","AAC Block 6\"",
    "Waterproofing Dr. Fixit","Waterproofing Fosroc","Waterproofing Membrane",
    "PVC Pipe 1\"","PVC Pipe 2\"","CPVC Pipe","GI Pipe 1\"",
    "PVC Conduit 25mm","PVC Conduit 32mm","FR Wiring 1.5mm","FR Wiring 2.5mm","FR Wiring 4mm",
    "MCB 6A","MCB 16A","MCB 32A","DB Box 8 Way","DB Box 16 Way",
    "Vitrified Tile 600x600","Vitrified Tile 800x800","Wall Tile 300x450","Anti-Skid Tile",
    "Granite Slab","Marble Slab","Kota Stone",
    "Asian Paints Apex","Berger WeatherCoat","Asian Paints Tractor","Putty",
    "Door Frame Teak","Door Frame Steel","Flush Door","PVC Door",
    "UPVC Window","Aluminium Window","Glass 5mm",
    "Plywood 18mm","Plywood 12mm","GI Sheet",
    "Diesel","Petrol","Safety Helmet","Safety Harness","Gloves",
    "Centering Plate","Prop Stand","Shuttering Oil",
  ];

  const isBankTransfer=type==="Bank Transfer";
  const isPayment=["Payment Received","Payment Made","Petty Cash Expense","Advance Payment","Journal Entry","Credit Note"].includes(type);
  const isMaterial=type==="Material Purchase Bill";
  const isSubcon=type==="Sub-Con Bill";
  const isInvoice=type==="Sales Invoice";
  // Site Expense (Petty Cash) — no fixed party master, recipient is free-text.
  // Bill heads to Site Expense regardless of who received the cash.
  const isSiteExpense=type==="Petty Cash Expense";

  // Paid To list:
  //  - Payment Received / Sales Invoice → Clients only
  //  - Material Purchase Bill            → Vendors (Supplier)
  //  - Sub-Con Bill                      → Subcontractors
  //  - Payment Made / Advance Payment    → Vendor + Subcon + Staff (no clients)
  //  - Site Expense                      → free text, no dropdown
  //  - everything else                   → all parties (legacy fallback)
  const PAYABLE_LIST=[...new Set([...SUPPLIER_LIST,...SUBCON_LIST,...staffList])];
  const partyOptions=type==="Payment Received"||isInvoice?CLIENT_LIST
    :isMaterial?SUPPLIER_LIST
    :isSubcon?SUBCON_LIST
    :(type==="Payment Made"||type==="Advance Payment")?PAYABLE_LIST
    :isSiteExpense?[] // free-text input — dropdown disabled
    :ALL_PARTIES;

  // ── core state ──────────────────────────────────────────────
  const _today = new Date().toISOString().slice(0,10);
  const [billDate,setBillDate]=useState(_today);
  const [delivDate,setDelivDate]=useState(prefillGRN?.deliveryDate||_today);
  // prefillGRN = {grnId, grnNumber, vendor, deliveryDate, project, items:[{name,qty,unit,head}]}
  const [party,setParty]=useState(prefillGRN?.vendor||preParty||"");
  const [project,setProject]=useState(prefillGRN?.project||PROJECTS_LIST[0]);
  // GRN-prefilled fields are locked (vendor / project / delivery date / material+qty)
  const isFromGRN = !!prefillGRN;
  const grnItemCount = (prefillGRN?.items?.length)||0;
  const [account,setAccount]=useState(ACCOUNTS_LIST[0]);
  const [toAccount,setToAccount]=useState(ACCOUNTS_LIST[1]);
  const [mop,setMop]=useState(MOPS_LIST[0]);
  const [note,setNote]=useState("");
  // Pre-fill amount from settlesRef (e.g. "Pay" button on Pending Payments)
  const [payAmt,setPayAmt]=useState(settlesRef?.amount?String(settlesRef.amount):"");
  const [saved,setSaved]=useState(false);

  // ── invoice state ────────────────────────────────────────────
  const [invMode,setInvMode]=useState("fresh");
  const [invoiceNo,setInvoiceNo]=useState("INV-2026-001");
  const _today15 = (() => { const d = new Date(); d.setDate(d.getDate()+15); return d.toISOString().slice(0,10); })();
  const [dueDate,setDueDate]=useState(_today15);

  // ── Material Bill: payment due date (default = bill_date + party.credit_days) ──
  const partyObj = useMemo(()=>(dbParties||[]).find(p=>(p.name||"").toLowerCase().trim()===String(party||"").toLowerCase().trim()),[dbParties,party]);
  const partyCreditDays = parseInt(partyObj?.credit_days)||7;
  const [payDueDate,setPayDueDate]=useState(()=>{
    const d=new Date(); d.setDate(d.getDate()+7);
    return d.toISOString().slice(0,10);
  });
  const [payDueDirty,setPayDueDirty]=useState(false);
  // Auto-recompute payDueDate when bill date or party credit_days change (unless user edited it)
  useEffect(()=>{
    if(payDueDirty) return;
    if(!billDate) return;
    const d=new Date(billDate);
    if(isNaN(d.getTime())) return;
    d.setDate(d.getDate()+partyCreditDays);
    setPayDueDate(d.toISOString().slice(0,10));
  // eslint-disable-next-line
  },[billDate,partyCreditDays,party]);

  // ── linked Payment IN (invoice → received same time) ─────────
  const [payInLinked,setPayInLinked]=useState(false);
  const [payInAcc,setPayInAcc]=useState(ACCOUNTS_LIST[0]);
  const [payInMop,setPayInMop]=useState("Bank Transfer");
  const [payInAmt,setPayInAmt]=useState("");
  const [payInDate,setPayInDate]=useState(_today);

  // ── linked Payment OUT (subcon bill → paid same time) ────────
  const [payOutLinked,setPayOutLinked]=useState(false);
  const [payOutAcc,setPayOutAcc]=useState(ACCOUNTS_LIST[0]);
  const [payOutMop,setPayOutMop]=useState(MOPS_LIST[0]);
  const [payOutAmt,setPayOutAmt]=useState("");
  const [payOutDesc,setPayOutDesc]=useState("");
  const [payOutDate,setPayOutDate]=useState(_today);

  // ── BOQ items (shared between invoice & subcon) ──────────────
  const BOQ_ITEMS=[
    {id:1,work:"Foundation Work",desc:"PCC M15 + RCC M25 footings",unit:"Sqft",boqQty:1500,rate:220,billed:0},
    {id:2,work:"Column & Beam",desc:"RCC columns GF to FF, M25 grade",unit:"Nos",boqQty:24,rate:8500,billed:0},
    {id:3,work:"Brickwork GF",desc:"9 inch brick wall ground floor",unit:"Sqft",boqQty:2400,rate:160,billed:0},
    {id:4,work:"Roof Slab GF",desc:"RCC M25 slab 5 inch thick",unit:"Sqft",boqQty:1500,rate:180,billed:1500},
    {id:5,work:"Plaster External",desc:"CM 1:4 external walls",unit:"Sqft",boqQty:3200,rate:55,billed:0},
    {id:6,work:"Plaster Internal",desc:"CM 1:5 internal walls all floors",unit:"Sqft",boqQty:5800,rate:45,billed:0},
    {id:7,work:"Flooring GF",desc:"Vitrified tiles 60x60 with bedding",unit:"Sqft",boqQty:1500,rate:85,billed:0},
    {id:8,work:"Electrical Works",desc:"Point wiring, DB, mains",unit:"Point",boqQty:42,rate:2200,billed:0},
  ];
  const SUBCON_BOQ=[
    {id:1,work:"Foundation Work",desc:"PCC M15 + RCC M25 footings",unit:"Sqft",boqQty:1500,subRate:150,prevBilled:0},
    {id:2,work:"Column & Beam",desc:"RCC columns GF to FF, M25 grade",unit:"Nos",boqQty:24,subRate:5500,prevBilled:0},
    {id:3,work:"Brickwork GF",desc:"9 inch brick wall ground floor",unit:"Sqft",boqQty:2400,subRate:105,prevBilled:0},
    {id:4,work:"Roof Slab GF",desc:"RCC M25 slab 5 inch thick",unit:"Sqft",boqQty:1500,subRate:120,prevBilled:1500},
    {id:5,work:"Plaster External",desc:"CM 1:4 external walls",unit:"Sqft",boqQty:3200,subRate:35,prevBilled:0},
    {id:6,work:"Plaster Internal",desc:"CM 1:5 internal walls all floors",unit:"Sqft",boqQty:5800,subRate:28,prevBilled:0},
    {id:7,work:"Flooring GF",desc:"Vitrified tiles 60x60 with bedding",unit:"Sqft",boqQty:1500,subRate:55,prevBilled:0},
    {id:8,work:"Electrical Works",desc:"Point wiring, DB, mains",unit:"Point",boqQty:42,subRate:1400,prevBilled:0},
  ];
  const [boqSelected,setBoqSelected]=useState({});
  const [boqQty,setBoqQty]=useState({});
  const toggleBoq=id=>setBoqSelected(p=>({...p,[id]:!p[id]}));
  const boqGrandTotal=BOQ_ITEMS.filter(b=>boqSelected[b.id]).reduce((s,b)=>s+Number(boqQty[b.id]||b.boqQty)*b.rate,0);

  const [subBoqSel,setSubBoqSel]=useState({});
  const [subBoqQty,setSubBoqQty]=useState({});
  const toggleSubBoq=id=>setSubBoqSel(p=>({...p,[id]:!p[id]}));
  const subBoqTotal=SUBCON_BOQ.filter(b=>subBoqSel[b.id]).reduce((s,b)=>s+Number(subBoqQty[b.id]||b.boqQty)*b.subRate,0);

  // ── sub-con mode ─────────────────────────────────────────────
  const [subMode,setSubMode]=useState("fresh");

  // ── invoice fresh rows — with auto-focus after addInvRow ─────
  const blankInvRow=()=>({id:Date.now()+Math.random(),work:"",desc:"",qty:"",unit:"Sqft",rate:"",total:0});
  const [invRows,setInvRows]=useState([blankInvRow()]);
  const invRowRefs=useRef({});
  const [focusInvId,setFocusInvId]=useState(null);
  const addInvRow=()=>{const r=blankInvRow();setInvRows(p=>[...p,r]);setFocusInvId(r.id);};
  const removeInvRow=id=>invRows.length>1&&setInvRows(p=>p.filter(r=>r.id!==id));
  const updInvRow=(id,k,v)=>setInvRows(p=>p.map(r=>{
    if(r.id!==id) return r;
    const u={...r,[k]:v};
    if(k==="qty"||k==="rate") u.total=Number(u.qty||0)*Number(u.rate||0);
    return u;
  }));
  useEffect(()=>{
    if(focusInvId&&invRowRefs.current[focusInvId]){
      invRowRefs.current[focusInvId].focus();setFocusInvId(null);
    }
  },[invRows,focusInvId]);
  const invFreshTotal=invRows.reduce((s,r)=>s+(r.total||0),0);
  const invTotal=invMode==="boq"?boqGrandTotal:invFreshTotal;

  // ── material / subcon rows — with auto-focus after addRow ────
  const blankRow=()=>({id:Date.now()+Math.random(),material:"",head:MAT_HEADS[0],desc:"",qty:"",unit:UNITS[0],rate:"",total:0});
  const [rows,setRows]=useState(()=>{
    if(prefillGRN?.items?.length){
      return prefillGRN.items.map((it,i)=>({
        id:Date.now()+i+Math.random(),
        material:it.name||it.description||"",
        head:it.head||MAT_HEADS[0],
        desc:it.desc||"",
        qty:String(it.qty||it.received_qty||""),
        unit:it.unit||UNITS[0],
        rate:String(it.rate||""),
        total:0,
        fromGRN:true, // material name + qty + unit locked, only rate / head editable
        grn_id:it.grn_id||null,         // source GRN per row (multi-GRN bills)
        grn_number:it.grn_number||null,
      }));
    }
    return [blankRow()];
  });
  const matRowRefs=useRef({});
  const [focusMatId,setFocusMatId]=useState(null);
  const addRow=()=>{const r=blankRow();setRows(p=>[...p,r]);setFocusMatId(r.id);};
  const removeRow=id=>rows.length>1&&setRows(p=>p.filter(r=>r.id!==id));
  // Material library — used to auto-lock unit when material is picked
  const [matLib,setMatLib]=useState([]);
  useEffect(()=>{ api.get("/library/materials").then(r=>{ if(r.success) setMatLib(r.data||[]); }).catch(()=>{}); },[]);
  const updRow=(id,k,v)=>setRows(p=>p.map(r=>{
    if(r.id!==id) return r;
    const u={...r,[k]:v};
    if(k==="qty"||k==="rate") u.total=Number(u.qty||0)*Number(u.rate||0);
    // Auto-lock unit from material library when material is picked
    if(k==="material" && v){
      const m=matLib.find(x=>(x.name||"").trim().toLowerCase()===String(v||"").trim().toLowerCase());
      if(m?.unit) u.unit=m.unit;
    }
    return u;
  }));
  useEffect(()=>{
    if(focusMatId&&matRowRefs.current[focusMatId]){
      matRowRefs.current[focusMatId].focus();setFocusMatId(null);
    }
  },[rows,focusMatId]);
  const grandTotal=rows.reduce((s,r)=>s+(r.total||0),0);
  const subTotal=subMode==="boq"?subBoqTotal:grandTotal;

  // ── GRN auto-suggest for non-prefill Material Bill flow ───────
  // P1 fix: when user opens Material Bill modal from Party Ledger / Create
  // Transaction (no prefillGRN), auto-detect unbilled GRNs for the selected
  // vendor and suggest linking. Without this, bills save with grn_id=null →
  // GRN stays in Unbilled list + opens door to silent duplicate billing.
  const [availableGRNs,setAvailableGRNs]=useState([]);
  const [selectedGRNId,setSelectedGRNId]=useState(null); // when user picks from dropdown
  useEffect(()=>{
    // Skip — this flow only matters for fresh material bill (no prefill)
    if(!isMaterial||isFromGRN||!party){ setAvailableGRNs([]); return; }
    let cancelled=false;
    api.get("/procurement/grns?unbilled=1").then(res=>{
      if(cancelled||!res?.success) return;
      const partyL=String(party).toLowerCase().trim();
      const matches=(res.data||[]).filter(g=>(g.vendor_name||"").toLowerCase().trim()===partyL);
      setAvailableGRNs(matches);
    }).catch(()=>{});
    return ()=>{ cancelled=true; };
  },[party,isMaterial,isFromGRN]);

  // Pick a GRN from the dropdown — replaces current rows with GRN items + locks them
  const pickGRN=(grnId)=>{
    if(!grnId){
      // user chose "None — direct purchase"
      setSelectedGRNId(null);
      // restore one blank row if all current rows are GRN-locked
      setRows(p=>p.some(r=>!r.fromGRN)?p.filter(r=>!r.fromGRN):[blankRow()]);
      return;
    }
    const grn=availableGRNs.find(g=>g.id===grnId);
    if(!grn) return;
    setSelectedGRNId(grnId);
    if(grn.received_date){
      try{ setDelivDate(grn.received_date.split("T")[0]); }catch(_){}
    }
    if(grn.project_name) setProject(grn.project_name);
    setRows((grn.items||[]).map((it,i)=>({
      id:Date.now()+i+Math.random(),
      material:it.description||"",
      head:MAT_HEADS[0],
      desc:"",
      qty:String(it.received_qty||""),
      unit:it.unit||UNITS[0],
      rate:"",
      total:0,
      fromGRN:true,
    })));
  };

  // ── helpers ──────────────────────────────────────────────────
  const typeColor={"Material Purchase Bill":T.blu,"Sub-Con Bill":T.slt,"Payment Received":T.grn,"Payment Made":T.red,"Bank Transfer":T.blu,"Petty Cash Expense":T.amb,"Advance Payment":T.pur,"Sales Invoice":T.grn,"Journal Entry":T.slt,"Credit Note":T.pur};
  const tc=typeColor[type]||T.slt;
  const inp=(extra={})=>({height:30,padding:"0 7px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface,width:"100%",...extra});
  const lbl=(text,color)=>(
    <label style={{fontSize:9.5,fontWeight:700,color:color||T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{text}</label>
  );
  const [saveErr,setSaveErr]=useState("");
  const [savingTxn,setSavingTxn]=useState(false);
  const savingRef = useRef(false); // ref-based guard against rapid double-click (state lags)
  const handleSave=async()=>{
    if(savingRef.current||savingTxn) return;       // ← idempotent: ignore subsequent clicks
    const amt=isMaterial||isSubcon||isInvoice?grandTotal:Number(payAmt)||0;
    if(!amt){setSaveErr(isMaterial?"Rate enter karo — Grand Total 0 hai.":"Amount required.");return;}
    setSaveErr("");
    savingRef.current=true; setSavingTxn(true);    // ← lock immediately
    try{
      // Map type to backend enum
      const TXN_TYPE_BACK={
        "Payment Received":"receipt","Sales Invoice":"receipt","Payment In":"receipt",
        "Payment Made":"payment","Petty Cash Expense":"site_expense",
        "Advance Payment":"party_payment","Material Purchase Bill":"material_purchase",
        "Sub-Con Bill":"subcon_expense","Bank Transfer":"bank_transfer",
        "Journal Entry":"payment","Credit Note":"material_return",
      };
      const mopMap={"Cash":"cash","Cheque":"cheque","Bank Transfer":"neft","UPI":"upi","NEFT":"neft"};
      const backType=TXN_TYPE_BACK[type]||(type==="Payment Received"?"receipt":"payment");

      // Case-insensitive ID resolution
      const partyLower=(party||"").toLowerCase().trim();
      const partyObj=dbParties?.find(p=>p.name.toLowerCase().trim()===partyLower);
      const accLower=(account||"").toLowerCase().trim();
      const accObj=dbAccounts?.find(a=>a.name.toLowerCase().trim()===accLower);

      const payload={
        type:backType,
        amount:amt,
        date:billDate||new Date().toISOString().slice(0,10),
        description:`${type} — ${party||"N/A"} — ${project||""}${note?" — "+note:""}`,
        mop:mopMap[mop]||"cash",
        party_id:partyObj?.id||null,
        party_name:party||null,
        account_id:accObj?.id||null,
        account_name:account||null,
        project_name:project||null,
        note:note||null,
        // Bills (material_purchase / subcon) start as 'unpaid' so they land
        // in Pending Payments per due_date until user records a settlement.
        // Direct money movements (payments, transfers, receipts) are 'paid'.
        status:(isMaterial||isSubcon)?"unpaid":"paid",
        // When this txn settles a Pending Payment row, link the source so
        // the backend can mark it paid in the same request.
        settles_bill_id: settlesRef?.kind==="bill"?settlesRef.id:null,
        settles_pr_id:   settlesRef?.kind==="pr"  ?settlesRef.id:null,
        // DR = money going OUT (expense), CR = money coming IN (receipt)
        dr: ["material_purchase","subcon_expense","site_expense","party_payment","bank_transfer","payment"].includes(backType),
        // Bank Transfer: destination account (always include, null for non-transfer)
        to_account_id:(()=>{
          if(type!=="Bank Transfer"||!toAccount) return null;
          const toLower=toAccount.toLowerCase().trim();
          const found=dbAccounts?.find(a=>a.name.toLowerCase().trim()===toLower);
          console.log("[BankTransfer] from:",account,"(id:",accObj?.id,") to:",toAccount,"(id:",found?.id,")");
          return found?.id||null;
        })(),
        to_account_name:type==="Bank Transfer"?toAccount:null,
      };

      // Material bill — payment due date (from party credit days, user-overridable)
      if(isMaterial){
        if(payDueDate) payload.due_date = payDueDate;
        // grn_id source: prefill (Unbilled tab → "+Bill"), or dropdown selection (Path B)
        if(prefillGRN?.grnId)       payload.grn_id = prefillGRN.grnId;
        else if(selectedGRNId)      payload.grn_id = selectedGRNId;
        // challan_no — backend uses this for the duplicate guard
        if(prefillGRN?.challan)     payload.challan_no = prefillGRN.challan;
        // Force-duplicate path — set when user clicked "Force New Bill" on
        // the conflict warning modal. Backend requires force_reason too.
        if(prefillGRN?.forceDuplicate) {
          payload.force_duplicate = true;
          payload.force_reason    = prefillGRN.forceReason || "";
        }
      }

      // Line items for material/subcon/invoice
      if(isMaterial&&rows?.length){
        payload.line_items=rows.filter(r=>r.material&&r.qty&&r.rate).map(r=>({
          item:r.material,           // row field is 'material' not 'item'
          description:r.desc||"",
          qty:parseFloat(r.qty)||0,
          unit:r.unit||"",
          rate:parseFloat(r.rate)||0,
          amount:(parseFloat(r.qty)||0)*(parseFloat(r.rate)||0),
          head:r.head||"",
          fromGRN: !!r.fromGRN,       // marker so backend can route new rows to inventory
          grn_id: r.grn_id || null,   // per-row source GRN — used by backend
                                      // validator when bill spans multi-GRNs
        }));
      }
      if(isSubcon&&Object.keys(subBoqSel).length){
        payload.subcon_items=Object.keys(subBoqSel).map(bid=>{
          const b=BOQ_ITEMS.find(x=>x.id===parseInt(bid));
          const qty=Number(subBoqQty[bid]||b?.boqQty||0);
          return {work:b?.work,qty,unit:b?.unit,rate:b?.subRate,amount:qty*(b?.subRate||0)};
        });
      }

      // Debug log — visible in browser console
      // Extra debug for bank transfer
      if(isBankTransfer){
        console.log("[BankTransfer] account state:", account, "→ id:", accObj?.id);
        console.log("[BankTransfer] toAccount state:", toAccount, "→ id:", dbAccounts?.find(a=>a.name.toLowerCase().trim()===toAccount.toLowerCase().trim())?.id);
        console.log("[BankTransfer] dbAccounts available:", dbAccounts?.map(a=>({id:a.id,name:a.name})));
      }
      console.log("[FinanceModule] Saving transaction:", JSON.stringify(payload,null,2));

      let res=await api.post("/finance/transactions",payload);

      // Soft duplicate prompt — same vendor + same amount within ±N days.
      // Show user a confirm; on OK, retry with force_duplicate so backend
      // bypasses the guard.
      if(res&&res.success===false&&res.code==="DUPLICATE_PAYMENT"){
        const prevDate=res.existing_date?String(res.existing_date).slice(0,10):"earlier";
        const ok=window.confirm(
          `⚠ Possible duplicate payment\n\n`+
          `Same vendor ko ₹${Number(res.existing_amount||amt).toLocaleString("en-IN")} ka payment ${prevDate} ko TXN-${res.existing_txn_id} me already entry ho chuka hai.\n`+
          `Window: ±${res.window_days||4} days\n\n`+
          `Phir bhi save karna hai?`
        );
        if(!ok){
          savingRef.current=false; setSavingTxn(false);
          return;
        }
        res=await api.post("/finance/transactions",{
          ...payload,
          force_duplicate:true,
          force_reason:"User confirmed possible duplicate payment",
        });
      }

      // Check server response explicitly
      if(res&&res.success===false){
        // Map specific backend error codes to friendlier messages (P0 fix)
        let errMsg=res.message||res.error||"Server rejected the entry.";
        if(res.code==="QTY_EXCEEDS_GRN"){
          errMsg=`⚠ Quantity zyaada hai\n\n${res.message}`;
        } else if(res.code==="GRN_ALREADY_BILLED"){
          errMsg=`⚠ Yeh GRN already bill ho chuka hai\n\n${res.message}\n\nTXN-${res.existing_txn_id||"?"} me bill exist karta hai. Fin Activity tab me check karein.`;
        } else if(res.code==="ITEM_NOT_IN_GRN"){
          errMsg=`⚠ Item GRN me match nahi hua\n\n${res.message}`;
        } else if(res.code==="GRN_NOT_FOUND"){
          errMsg=`⚠ GRN nahi mila\n\n${res.message}`;
        }
        console.error("[FinanceModule] Server error:", res.code||"NO_CODE", errMsg, res);
        setSaveErr(errMsg);
        savingRef.current=false; setSavingTxn(false);   // ← release lock so user can retry
        return; // ← DO NOT close modal on failure
      }

      console.log("[FinanceModule] Save success:", res);
      if(onSaved) onSaved(); // refresh parent
      setSaved(true);
      setTimeout(()=>{setSaved(false);onClose();},900);
      // savingRef stays locked until modal closes — prevents any post-success double-click

    }catch(e){
      console.error("[FinanceModule] Save exception:", e);
      // Backend may throw 4xx with a response body containing code+message
      const respData=e?.response?.data||{};
      const code=respData.code||"";
      let msg=respData.message||e?.message||"Network error. Check connection.";
      if(code==="QTY_EXCEEDS_GRN")        msg=`⚠ Quantity zyaada hai\n\n${msg}`;
      else if(code==="GRN_ALREADY_BILLED") msg=`⚠ Yeh GRN already bill ho chuka hai\n\n${msg}`;
      else if(code==="ITEM_NOT_IN_GRN")    msg=`⚠ Item GRN me match nahi hua\n\n${msg}`;
      else if(code==="GRN_NOT_FOUND")      msg=`⚠ GRN nahi mila\n\n${msg}`;
      setSaveErr(msg);
      savingRef.current=false; setSavingTxn(false);     // ← release lock so user can retry
      // ← Modal stays open so user can retry
    }
  };

  const colTpl="28px 1fr 95px 1fr 70px 70px 80px 88px 22px";
  const invColTpl="28px 1fr 1fr 80px 70px 85px 92px 22px";
  const subColTpl="28px 130px 95px 1fr 70px 70px 80px 88px 22px";

  // grid cols per type
  const hdrCols=isMaterial?"115px 115px 1fr 130px 130px"
    :isSubcon?"115px 1fr 130px"
    :isBankTransfer?"115px 1fr 22px 1fr"
    :isInvoice?"130px 115px 115px 1fr 130px"
    :"110px 1fr 130px 130px 110px";

  // ── subcon BOQ selector row ───────────────────────────────────
  const SubBoqRow=({b})=>{
    const isSel=!!subBoqSel[b.id];
    const qty=Number(subBoqQty[b.id]||b.boqQty);
    const amt=qty*b.subRate;
    const prev=b.prevBilled>0;
    return(
      <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 80px 60px 100px 95px 95px",
        padding:"8px 12px",borderBottom:`1px solid ${T.b1}`,gap:7,alignItems:"center",
        background:isSel?"#F5F0FF":prev?"#FAFAFA":"transparent",
        opacity:prev&&!isSel?0.5:1,transition:"background .1s"}}>
        <div onClick={()=>!prev&&toggleSubBoq(b.id)}
          style={{width:18,height:18,borderRadius:4,border:`2px solid ${isSel?T.slt:T.b2}`,
            background:isSel?T.slt:"white",cursor:prev?"not-allowed":"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {isSel&&<IcChk size={10} color="white"/>}
        </div>
        <div>
          <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{b.work}</div>
          {prev&&<span style={{fontSize:9,background:T.ambL,color:T.amb,padding:"1px 5px",borderRadius:20,fontWeight:700}}>Previously billed</span>}
        </div>
        <div style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.desc}</div>
        <div style={{fontSize:11.5,color:T.t3,textAlign:"right"}}>{b.boqQty.toLocaleString("en-IN")}</div>
        <div style={{fontSize:11,color:T.t3}}>{b.unit}</div>
        <div style={{fontSize:12,fontWeight:600,color:T.t2,textAlign:"right"}}>
          Rs.{b.subRate.toLocaleString("en-IN")}
          <div style={{fontSize:9,color:T.t4,fontWeight:400}}>/{b.unit}</div>
        </div>
        <div>
          {isSel?(
            <input type="number"
              value={subBoqQty[b.id]!==undefined?subBoqQty[b.id]:b.boqQty}
              onChange={e=>setSubBoqQty(p=>({...p,[b.id]:e.target.value}))}
              style={{width:"100%",height:28,padding:"0 6px",borderRadius:5,
                border:`1.5px solid ${T.slt}`,fontSize:12,outline:"none",
                textAlign:"right",boxSizing:"border-box",fontFamily:"inherit",background:T.surface}}/>
          ):(
            <span style={{fontSize:11.5,color:T.t4,textAlign:"right",display:"block"}}>—</span>
          )}
        </div>
        <div style={{fontSize:13,fontWeight:700,color:isSel?T.slt:T.t4,textAlign:"right"}}>
          {isSel?`Rs.${amt.toLocaleString("en-IN")}`:"—"}
        </div>
      </div>
    );
  };

  // ── BOQ selector row (invoice) ────────────────────────────────
  const BoqRow=({b})=>{
    const isSel=!!boqSelected[b.id];
    const qty=Number(boqQty[b.id]||b.boqQty);
    const amt=qty*b.rate;
    const prev=b.billed>0;
    return(
      <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 85px 72px 85px 90px 90px",
        padding:"8px 12px",borderBottom:`1px solid ${T.b1}`,gap:7,alignItems:"center",
        background:isSel?T.grnL:prev?"#FAFAFA":"transparent",
        opacity:prev&&!isSel?0.5:1,transition:"background .1s"}}>
        <div onClick={()=>!prev&&toggleBoq(b.id)}
          style={{width:18,height:18,borderRadius:4,border:`2px solid ${isSel?T.grn:T.b2}`,
            background:isSel?T.grn:"white",cursor:prev?"not-allowed":"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {isSel&&<IcChk size={10} color="white"/>}
        </div>
        <div>
          <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{b.work}</div>
          {prev&&<span style={{fontSize:9,background:T.ambL,color:T.amb,padding:"1px 5px",borderRadius:20,fontWeight:700}}>Already billed</span>}
        </div>
        <div style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.desc}</div>
        <div style={{fontSize:11.5,color:T.t3,textAlign:"right"}}>{b.boqQty.toLocaleString("en-IN")}</div>
        <div style={{fontSize:11,color:T.t3}}>{b.unit}</div>
        <div style={{fontSize:11.5,fontWeight:600,color:T.t2,textAlign:"right"}}>Rs.{b.rate.toLocaleString("en-IN")}</div>
        <div>
          {isSel?(
            <input type="number"
              value={boqQty[b.id]!==undefined?boqQty[b.id]:b.boqQty}
              onChange={e=>setBoqQty(p=>({...p,[b.id]:e.target.value}))}
              style={{width:"100%",height:28,padding:"0 6px",borderRadius:5,
                border:`1.5px solid ${T.grn}`,fontSize:12,outline:"none",
                textAlign:"right",boxSizing:"border-box",fontFamily:"inherit",background:T.surface}}/>
          ):(
            <span style={{fontSize:11.5,color:T.t4,textAlign:"right",display:"block"}}>—</span>
          )}
        </div>
        <div style={{fontSize:13,fontWeight:700,color:isSel?T.grn:T.t4,textAlign:"right"}}>
          {isSel?`Rs.${amt.toLocaleString("en-IN")}`:"—"}
        </div>
      </div>
    );
  };

  // ── mode toggle renderer ──────────────────────────────────────
  const ModeToggle=({mode,setMode,c,opts})=>(
    <div style={{display:"flex",gap:0,marginBottom:12,background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
      {opts.map(([id,label,sub],i)=>(
        <button key={id} onClick={()=>setMode(id)}
          style={{flex:1,padding:"10px 14px",border:"none",cursor:"pointer",textAlign:"left",
            background:mode===id?c:"none",
            borderRight:i<opts.length-1?`1px solid ${T.b1}`:"none",transition:"background .15s"}}>
          <div style={{fontSize:12.5,fontWeight:700,color:mode===id?"white":T.t2}}>{label}</div>
          <div style={{fontSize:10.5,color:mode===id?"rgba(255,255,255,0.72)":T.t4,marginTop:1}}>{sub}</div>
        </button>
      ))}
    </div>
  );

  // ── total bar renderer ────────────────────────────────────────
  const TotalBar=({total,c,bg,brd,label})=>(
    <div style={{padding:"7px 16px",background:bg,borderRadius:7,border:`1.5px solid ${brd}`,display:"flex",gap:8,alignItems:"center"}}>
      <span style={{fontSize:10,fontWeight:600,color:c,textTransform:"uppercase",letterSpacing:".4px"}}>{label||"Total"}</span>
      <span style={{fontSize:16,fontWeight:800,color:c}}>Rs.{total.toLocaleString("en-IN")}</span>
    </div>
  );

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.52)",zIndex:400,backdropFilter:"blur(3px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        background:T.bg,borderRadius:12,
        width:isMaterial||isSubcon||isInvoice?900:700,
        maxWidth:"97vw",maxHeight:"91vh",zIndex:401,
        boxShadow:"0 24px 70px rgba(0,0,0,0.3)",
        display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",overflow:"hidden"}}>

        {/* ── Modal header bar ── */}
        <div style={{background:tc,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:34,height:34,borderRadius:9,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {isMaterial?<IcBillDue size={16} color="white"/>:isSubcon?<IcTeam size={16} color="white"/>:isInvoice?<IcFileInv size={16} color="white"/>:<IcWallet size={16} color="white"/>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:"white"}}>{type}</div>
            <div style={{fontSize:10.5,color:"rgba(255,255,255,0.7)"}}>
              {isMaterial?"Qty x Rate = Total per item":isSubcon?"Link with BOQ or enter work items":isInvoice?"Raise invoice — link with BOQ or fresh entry":""}
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",color:"white",padding:"5px 7px",borderRadius:6,display:"flex"}}>
            <IcX size={14}/>
          </button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>

          {/* ════════════════════════════════════════════════════
              TOP HEADER FIELDS — type-aware grid
          ════════════════════════════════════════════════════ */}
          <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,
            padding:"11px 13px",marginBottom:12,
            display:"grid",gridTemplateColumns:hdrCols,gap:9,alignItems:"end"}}>

            {/* Invoice: invoiceNo + dueDate + billDate + client + project */}
            {isInvoice&&(
              <>
                <div>
                  {lbl("Invoice No.")}
                  <input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)}
                    style={inp({fontFamily:"monospace",fontSize:12.5,fontWeight:700})}
                    onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
                <div>
                  {lbl("Invoice Date *")}
                  <input type="date" value={billDate} onChange={e=>setBillDate(e.target.value)}
                    style={inp()} onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
                <div>
                  {lbl("Due Date")}
                  <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
                    style={inp()} onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
                <div>
                  {lbl("Client / Billed To *",T.grn)}
                  <LibrarySelect type="client" value={party} onChange={setParty} placeholder="Select client..." accent={T.grn}/>
                </div>
                <div>
                  {lbl("Project")}
                  <SearchSelect options={PROJECTS_LIST} value={project} onChange={setProject} placeholder="Select project..."/>
                </div>
              </>
            )}

            {/* Material: billDate + delivDate + supplier + project + payDueDate */}
            {isMaterial&&(
              <>
                <div>
                  {lbl("Bill Date *")}
                  <input type="date" value={billDate} onChange={e=>setBillDate(e.target.value)}
                    style={inp()} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
                <div>
                  {lbl("Delivery Date"+(isFromGRN?" (from GRN)":""))}
                  {isFromGRN
                    ? <div style={{height:32,padding:"0 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,background:T.surfaceB,fontSize:12.5,color:T.t2,display:"flex",alignItems:"center",gap:6}}><span>🔒</span>{delivDate||"—"}</div>
                    : <input type="date" value={delivDate} onChange={e=>setDelivDate(e.target.value)}
                        style={inp()} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>}
                </div>
                <div>
                  {lbl("Supplier / Party *"+(isFromGRN?" (from GRN)":""))}
                  {isFromGRN
                    ? <div style={{height:32,padding:"0 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,background:T.surfaceB,fontSize:12.5,color:T.t2,fontWeight:600,display:"flex",alignItems:"center",gap:6}}><span>🔒</span>{party||"—"}</div>
                    : <LibrarySelect type="supplier" value={party} onChange={setParty} placeholder="Select supplier..."/>}
                </div>
                <div>
                  {lbl("Project"+(isFromGRN?" (from GRN)":""))}
                  {isFromGRN
                    ? <div style={{height:32,padding:"0 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,background:T.surfaceB,fontSize:12.5,color:T.t2,display:"flex",alignItems:"center",gap:6}}><span>🔒</span>{project||"—"}</div>
                    : <SearchSelect options={PROJECTS_LIST} value={project} onChange={setProject} placeholder="Select project..."/>}
                </div>
                <div>
                  {lbl(`Payment Due Date — ${partyCreditDays}d credit`)}
                  <input type="date" value={payDueDate} onChange={e=>{setPayDueDate(e.target.value);setPayDueDirty(true);}}
                    style={{...inp(),borderColor:payDueDirty?T.amb:T.b1}} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=payDueDirty?T.amb:T.b1}/>
                  <div style={{fontSize:10,color:payDueDirty?T.amb:T.t4,marginTop:2}}>
                    {payDueDirty?"Custom — overridden by user":`Auto: bill date + ${partyCreditDays} days credit`}
                  </div>
                </div>
              </>
            )}

            {/* Sub-Con: billDate + contractor + project (no account — in linked payment) */}
            {isSubcon&&(
              <>
                <div>
                  {lbl("Bill Date *")}
                  <input type="date" value={billDate} onChange={e=>setBillDate(e.target.value)}
                    style={inp()} onFocus={e=>e.target.style.borderColor=T.slt} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
                <div>
                  {lbl("Contractor / Party *")}
                  <LibrarySelect type="subcon" value={party} onChange={setParty} placeholder="Select contractor..." accent={T.slt}/>
                </div>
                <div>
                  {lbl("Project")}
                  <SearchSelect options={PROJECTS_LIST} value={project} onChange={setProject} placeholder="Select project..."/>
                </div>
              </>
            )}

            {/* Bank Transfer: date + from → to */}
            {isBankTransfer&&(
              <>
                <div>
                  {lbl("Date *")}
                  <input type="date" value={billDate} onChange={e=>setBillDate(e.target.value)}
                    style={inp()} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
                <div>
                  {lbl("From Account *",T.red)}
                  <SearchSelect options={ACCOUNTS_LIST} value={account} onChange={setAccount} placeholder="From..." accent={T.red}/>
                </div>
                <div style={{display:"flex",alignItems:"flex-end",paddingBottom:4,justifyContent:"center"}}>
                  <IcArrow size={18} color={T.t3}/>
                </div>
                <div>
                  {lbl("To Account *",T.grn)}
                  <SearchSelect options={ACCOUNTS_LIST.filter(a=>a!==account)} value={toAccount} onChange={setToAccount} placeholder="To..." accent={T.grn}/>
                </div>
              </>
            )}

            {/* Payment types: billDate + party + project + account + mop */}
            {isPayment&&(
              <>
                <div>
                  {lbl("Date *")}
                  <input type="date" value={billDate} onChange={e=>setBillDate(e.target.value)}
                    style={inp()} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
                <div>
                  {lbl(type==="Payment Received"?"Received From *":type==="Payment Made"?"Paid To *":isSiteExpense?"Recipient (free text)":"Party *")}
                  {isSiteExpense ? (
                    <input value={party} onChange={e=>setParty(e.target.value)}
                      placeholder="e.g. Site supervisor, transport, tea-stall"
                      style={inp()} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                  ) : (type==="Payment Made"||type==="Advance Payment") ? (
                    <SearchSelect options={PAYABLE_LIST} value={party} onChange={setParty}
                      placeholder="Vendor / Subcon / Staff..."/>
                  ) : (
                    <LibrarySelect
                      type={type==="Payment Received"||isInvoice?"client":isMaterial?"supplier":isSubcon?"subcon":"any-party"}
                      value={party} onChange={setParty} placeholder="Select party..."/>
                  )}
                </div>
                <div>
                  {lbl("Project")}
                  <SearchSelect options={PROJECTS_LIST} value={project} onChange={setProject} placeholder="Project..."/>
                </div>
                <div>
                  {lbl("Account *",T.red)}
                  <SearchSelect options={ACCOUNTS_LIST} value={account} onChange={setAccount} placeholder="Account..." accent={T.red}/>
                </div>
                <div>
                  {lbl("MOP")}
                  <SearchSelect options={MOPS_LIST} value={mop} onChange={setMop} placeholder="Mode..."/>
                </div>
              </>
            )}
          </div>

          {/* ════════════════════════════════════════════════════
              BANK TRANSFER — preview + amount
          ════════════════════════════════════════════════════ */}
          {isBankTransfer&&(
            <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,padding:"10px 14px",background:T.bluL,borderRadius:8,border:`1px solid ${T.bluM}`}}>
                <div style={{flex:1,textAlign:"center"}}>
                  {lbl("From")}
                  <div style={{fontSize:14,fontWeight:800,color:T.red}}>{account||"—"}</div>
                </div>
                <IcArrow size={22} color={T.blu}/>
                <div style={{flex:1,textAlign:"center"}}>
                  {lbl("To")}
                  <div style={{fontSize:14,fontWeight:800,color:T.grn}}>{toAccount||"—"}</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  {lbl("Transfer Amount (Rs.) *")}
                  <input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)} placeholder="Enter amount"
                    style={inp({fontSize:15,fontWeight:700,color:T.blu,borderColor:T.blu+"66",borderWidth:"2px"})}
                    onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.blu+"66"}/>
                </div>
                <div>
                  {lbl("Reference / Note")}
                  <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Transfer ref, reason..."
                    style={inp()} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
              </div>
            </div>
          )}

          {/* Settling banner — when "Pay" was clicked on a Pending Payment row.
              Shows which bill / PR will be marked paid by this transaction. */}
          {settlesRef&&isPayment&&(
            <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderLeft:`3px solid ${T.blu}`,borderRadius:7,padding:"9px 12px",marginBottom:10,display:"flex",alignItems:"center",gap:9}}>
              <IcSend size={13} color={T.blu}/>
              <div style={{flex:1,fontSize:11.5,color:T.t2}}>
                Settling <b style={{color:T.blu}}>{settlesRef.label}</b> — on save, the source {settlesRef.kind==="pr"?"payment request":"bill"} will be marked paid.
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              PAYMENT TYPES — amount + note
          ════════════════════════════════════════════════════ */}
          {isPayment&&(
            <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                {lbl("Amount (Rs.) *")}
                <input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)} placeholder="Enter amount"
                  style={inp({fontSize:15,fontWeight:700,color:tc,borderColor:tc+"66",borderWidth:"2px"})}
                  onFocus={e=>e.target.style.borderColor=tc} onBlur={e=>e.target.style.borderColor=tc+"66"}/>
              </div>
              <div>
                {lbl("Description / Note")}
                <input value={note} onChange={e=>setNote(e.target.value)} placeholder="What is this payment for?"
                  style={inp()} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              MATERIAL PURCHASE BILL — Excel rows
          ════════════════════════════════════════════════════ */}
          {isMaterial&&(
            <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
              {/* GRN prefill notice */}
              {prefillGRN&&<div style={{padding:"7px 12px",background:T.grnL,borderBottom:"1px solid "+T.grnM,fontSize:11.5,color:T.grn,display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontWeight:700}}>GRN se linked</span> — Material, Qty locked. Rate aur Notes enter karo.
              </div>}
              {/* P1: GRN auto-suggest dropdown (only when modal opened WITHOUT prefill + vendor has unbilled GRNs) */}
              {!prefillGRN&&availableGRNs.length>0&&(
                <div style={{padding:"9px 12px",background:T.ambL,borderBottom:`1px solid ${T.ambM}`,display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.amb} strokeWidth="2.2" strokeLinecap="round" style={{flexShrink:0}}><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{fontSize:11.5,fontWeight:700,color:T.amb}}>{party} ke {availableGRNs.length} unbilled GRN hai</div>
                    <div style={{fontSize:10.5,color:T.t3,marginTop:1}}>Bill ko GRN se link karne se duplicate billing avoid hoti hai</div>
                  </div>
                  <select value={selectedGRNId||""} onChange={e=>pickGRN(e.target.value?parseInt(e.target.value):null)}
                    style={{height:32,padding:"0 9px",borderRadius:6,border:`1.5px solid ${selectedGRNId?T.grn:T.amb}`,background:selectedGRNId?T.grnL:T.surface,fontSize:12,fontWeight:600,color:selectedGRNId?T.grn:T.amb,outline:"none",cursor:"pointer",fontFamily:"inherit",minWidth:200}}>
                    <option value="">— Direct purchase (no GRN) —</option>
                    {availableGRNs.map(g=>{
                      const dt=g.received_date?new Date(g.received_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"";
                      const itemCount=(g.items||[]).length;
                      return <option key={g.id} value={g.id}>{g.grn_number} · {dt} · {itemCount} item{itemCount!==1?"s":""}</option>;
                    })}
                  </select>
                  {selectedGRNId&&(
                    <span style={{fontSize:10.5,fontWeight:700,color:T.grn,padding:"3px 8px",background:T.grnL,borderRadius:12,border:`1px solid ${T.grnM}`}}>✓ Linked</span>
                  )}
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:colTpl,padding:"7px 12px",background:T.sb,gap:7}}>
                {["#","Material Name","Head","Description","Qty","Unit","Rate","Total",""].map((h,i)=>(
                  <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
                ))}
              </div>
              {rows.map((row,idx)=>(
                <div key={row.id} style={{display:"grid",gridTemplateColumns:colTpl,gap:7,padding:"7px 12px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:idx%2===0?T.surface:T.surfaceB}}>
                  <span style={{fontSize:11.5,color:T.t4,textAlign:"center",fontWeight:600}}>{idx+1}{row.fromGRN&&<span title="Locked from GRN" style={{marginLeft:3,fontSize:9}}>🔒</span>}</span>
                  {/* Material — locked only for rows from GRN, new added rows editable */}
                  {row.fromGRN
                    ?<div style={{padding:"5px 8px",borderRadius:5,background:T.surfaceB,border:"1px solid "+T.b1,fontSize:12,color:T.t1,fontWeight:600,height:30,display:"flex",alignItems:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.material||"—"}</div>
                    :<LibrarySelect type="material" inputRef={el=>{if(el) matRowRefs.current[row.id]=el;}} value={row.material} onChange={v=>updRow(row.id,"material",v)} placeholder="Search material..." compact={true}/>
                  }
                  <SearchSelect options={MAT_HEADS} value={row.head} onChange={v=>updRow(row.id,"head",v)} compact={true}/>
                  <input data-field="desc" value={row.desc} onChange={e=>updRow(row.id,"desc",e.target.value)} placeholder="Grade, spec, brand..."
                    style={inp()} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                  {/* Qty — locked only for GRN rows */}
                  {row.fromGRN
                    ?<div style={{padding:"5px 8px",borderRadius:5,background:T.surfaceB,border:"1px solid "+T.b1,fontSize:12,color:T.t1,fontWeight:600,height:30,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>{row.qty}</div>
                    :<input type="number" value={row.qty} onChange={e=>updRow(row.id,"qty",e.target.value)} placeholder="0" style={inp({textAlign:"right"})} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                  }
                  {(()=>{
                    const lib=matLib.find(m=>(m.name||"").trim().toLowerCase()===(row.material||"").trim().toLowerCase());
                    const isLocked=row.fromGRN||!!row.material;
                    const u=lib?.unit||row.unit||"—";
                    return isLocked
                      ?<div title={row.fromGRN?"Locked from GRN":"Locked from Library — change in Library"} style={{padding:"5px 8px",borderRadius:5,background:T.surfaceB,border:"1px solid "+T.b1,fontSize:11.5,color:T.t2,fontWeight:600,height:30,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><span style={{fontSize:9}}>🔒</span>{u}</div>
                      :<SearchSelect options={UNITS} value={row.unit} onChange={v=>updRow(row.id,"unit",v)} compact={true}/>;
                  })()}
                  <input type="number" value={row.rate} onChange={e=>updRow(row.id,"rate",e.target.value)} placeholder="0"
                    style={inp({textAlign:"right",borderColor:T.amb,background:T.ambL})}
                    onFocus={e=>e.target.style.borderColor=T.amb} onBlur={e=>e.target.style.borderColor=T.amb}
                    onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addRow();}}}/>
                  <div style={{height:30,display:"flex",alignItems:"center",justifyContent:"flex-end",fontWeight:700,fontSize:13,
                    color:row.total>0?T.grn:T.t4,background:row.total>0?T.grnL:"transparent",
                    borderRadius:5,padding:"0 7px",border:row.total>0?`1px solid ${T.grnM}`:"1px solid transparent"}}>
                    {row.total>0?`Rs.${row.total.toLocaleString("en-IN")}`:"—"}
                  </div>
                  <button onClick={()=>removeRow(row.id)} style={{background:"none",border:"none",cursor:rows.length>1?"pointer":"not-allowed",color:rows.length>1?T.red:T.b2,display:"flex",padding:0,alignItems:"center",justifyContent:"center"}}>
                    <IcX size={12} color="currentColor"/>
                  </button>
                </div>
              ))}
              <div style={{padding:"8px 12px",background:T.surfaceB,borderTop:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:10}}>
                <button onClick={addRow}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:6,background:T.surface,border:`1.5px dashed ${T.b2}`,color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=T.blu;e.currentTarget.style.color=T.blu;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b2;e.currentTarget.style.color=T.t3;}}>
                  <IcAdd size={12} color="currentColor"/> Add Row
                </button>
                <span style={{fontSize:10.5,color:T.t4}}>{rows.length} item{rows.length>1?"s":""}</span>
                <div style={{flex:1}}/>
                <TotalBar total={grandTotal} c={T.grn} bg={T.grnL} brd={T.grnM} label="Grand Total"/>
              </div>
              <div style={{padding:"8px 12px 11px",borderTop:`1px solid ${T.b1}`}}>
                {lbl("Remark / Note (optional)")}
                <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Any additional remarks..."
                  style={{...inp(),marginTop:3}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              SUB-CON BILL — mode toggle + BOQ / Fresh
          ════════════════════════════════════════════════════ */}
          {isSubcon&&(
            <div>
              <ModeToggle mode={subMode} setMode={setSubMode} c={T.slt}
                opts={[["boq","Link with BOQ","Pick work items from project BOQ"],["fresh","Fresh Entry","Enter work items manually"]]}/>

              {subMode==="boq"&&(
                <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:10}}>
                  <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 80px 60px 100px 95px 95px",padding:"7px 12px",background:T.sb,gap:7}}>
                    {["","Work Item","Description","BOQ Qty","Unit","Subcon Rate","Claim Qty","Amount"].map((h,i)=>(
                      <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
                    ))}
                  </div>
                  {SUBCON_BOQ.map(b=><SubBoqRow key={b.id} b={b}/>)}
                  <div style={{padding:"9px 12px",background:T.surfaceB,borderTop:`2px solid ${T.b2}`,display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:11,color:T.t3}}>{Object.values(subBoqSel).filter(Boolean).length} item{Object.values(subBoqSel).filter(Boolean).length!==1?"s":""} selected</span>
                    <div style={{flex:1}}/>
                    <TotalBar total={subBoqTotal} c={T.slt} bg={T.sltL} brd={T.b2} label="Bill Total"/>
                  </div>
                </div>
              )}

              {subMode==="fresh"&&(
                <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:10}}>
                  <div style={{display:"grid",gridTemplateColumns:subColTpl,padding:"7px 12px",background:T.sb,gap:7}}>
                    {["#","Work Type","Head","Description","Qty","Unit","Rate","Total",""].map((h,i)=>(
                      <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
                    ))}
                  </div>
                  {rows.map((row,idx)=>(
                    <div key={row.id} style={{display:"grid",gridTemplateColumns:subColTpl,gap:7,padding:"7px 12px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:idx%2===0?T.surface:T.surfaceB}}>
                      <span style={{fontSize:11.5,color:T.t4,textAlign:"center",fontWeight:600}}>{idx+1}</span>
                      <SearchSelect
                        inputRef={el=>{if(el) matRowRefs.current[row.id]=el;}}
                        options={WORK_TYPES} value={row.material} onChange={v=>updRow(row.id,"material",v)}
                        compact={true} accent={T.slt} placeholder="Work type..."/>
                      <SearchSelect options={MAT_HEADS} value={row.head} onChange={v=>updRow(row.id,"head",v)} compact={true}/>
                      <input value={row.desc} onChange={e=>updRow(row.id,"desc",e.target.value)} placeholder="Area, location, floor..."
                        style={inp()} onFocus={e=>e.target.style.borderColor=T.slt} onBlur={e=>e.target.style.borderColor=T.b1}/>
                      <input type="number" value={row.qty} onChange={e=>updRow(row.id,"qty",e.target.value)} placeholder="0"
                        style={inp({textAlign:"right"})} onFocus={e=>e.target.style.borderColor=T.slt} onBlur={e=>e.target.style.borderColor=T.b1}/>
                      <SearchSelect options={UNITS} value={row.unit} onChange={v=>updRow(row.id,"unit",v)} compact={true}/>
                      <input type="number" value={row.rate} onChange={e=>updRow(row.id,"rate",e.target.value)} placeholder="0"
                        style={inp({textAlign:"right"})}
                        onFocus={e=>e.target.style.borderColor=T.slt} onBlur={e=>e.target.style.borderColor=T.b1}
                        onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addRow();}}}/>
                      <div style={{height:30,display:"flex",alignItems:"center",justifyContent:"flex-end",fontWeight:700,fontSize:13,
                        color:row.total>0?T.slt:T.t4,background:row.total>0?T.sltL:"transparent",
                        borderRadius:5,padding:"0 7px",border:row.total>0?`1px solid ${T.b2}`:"1px solid transparent"}}>
                        {row.total>0?`Rs.${row.total.toLocaleString("en-IN")}`:"—"}
                      </div>
                      <button onClick={()=>removeRow(row.id)} style={{background:"none",border:"none",cursor:rows.length>1?"pointer":"not-allowed",color:rows.length>1?T.red:T.b2,display:"flex",padding:0,alignItems:"center",justifyContent:"center"}}>
                        <IcX size={12} color="currentColor"/>
                      </button>
                    </div>
                  ))}
                  <div style={{padding:"8px 12px",background:T.surfaceB,borderTop:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:10}}>
                    <button onClick={addRow}
                      style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:6,background:T.surface,border:`1.5px dashed ${T.b2}`,color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=T.slt;e.currentTarget.style.color=T.slt;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b2;e.currentTarget.style.color=T.t3;}}>
                      <IcAdd size={12} color="currentColor"/> Add Row
                    </button>
                    <span style={{fontSize:10.5,color:T.t4}}>{rows.length} item{rows.length>1?"s":""}</span>
                    <div style={{flex:1}}/>
                    <TotalBar total={grandTotal} c={T.slt} bg={T.sltL} brd={T.b2} label="Bill Total"/>
                  </div>
                </div>
              )}

              {/* Remark */}
              <div style={{marginBottom:12}}>
                {lbl("Remark / Note (optional)")}
                <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Any remarks..."
                  style={{...inp(),marginTop:3}}
                  onFocus={e=>e.target.style.borderColor=T.slt} onBlur={e=>e.target.style.borderColor=T.b1}/>
              </div>

              {/* ── LINKED PAYMENT OUT ── */}
              <div style={{borderRadius:9,border:`1.5px solid ${payOutLinked?T.slt:T.b1}`,overflow:"hidden",
                background:payOutLinked?T.sltL:T.surface,transition:"all .2s"}}>
                <button onClick={()=>{setPayOutLinked(p=>!p);if(!payOutLinked)setPayOutAmt(String(subTotal));}}
                  style={{width:"100%",padding:"11px 14px",display:"flex",alignItems:"center",gap:10,
                    background:"none",border:"none",cursor:"pointer",textAlign:"left"}}>
                  <div style={{width:22,height:22,borderRadius:5,border:`2px solid ${payOutLinked?T.slt:T.b2}`,
                    background:payOutLinked?T.slt:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {payOutLinked&&<IcChk size={12} color="white"/>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:payOutLinked?T.slt:T.t2}}>Payment Made to Contractor</div>
                    <div style={{fontSize:10.5,color:T.t4}}>Mark payment as done at the same time as this bill</div>
                  </div>
                  {payOutLinked&&subTotal>0&&(
                    <span style={{fontSize:12,fontWeight:700,color:T.slt}}>Rs.{subTotal.toLocaleString("en-IN")}</span>
                  )}
                </button>
                {payOutLinked&&(
                  <div style={{padding:"0 14px 14px",display:"grid",gridTemplateColumns:"1fr 1fr 140px 130px 130px",gap:9}}>
                    <div>
                      {lbl("Pay Date *")}
                      <input type="date" value={payOutDate} onChange={e=>setPayOutDate(e.target.value)}
                        style={inp()} onFocus={e=>e.target.style.borderColor=T.slt} onBlur={e=>e.target.style.borderColor=T.b1}/>
                    </div>
                    <div>
                      {lbl("Description")}
                      <input value={payOutDesc} onChange={e=>setPayOutDesc(e.target.value)} placeholder="e.g. March work payment..."
                        style={inp()} onFocus={e=>e.target.style.borderColor=T.slt} onBlur={e=>e.target.style.borderColor=T.b1}/>
                    </div>
                    <div>
                      {lbl("Amount (Rs.) *",T.slt)}
                      <input type="number" value={payOutAmt} onChange={e=>setPayOutAmt(e.target.value)}
                        style={inp({fontSize:13,fontWeight:700,color:T.slt,borderColor:T.slt+"66"})}
                        onFocus={e=>e.target.style.borderColor=T.slt} onBlur={e=>e.target.style.borderColor=T.slt+"66"}/>
                    </div>
                    <div>
                      {lbl("Account *",T.red)}
                      <SearchSelect options={ACCOUNTS_LIST} value={payOutAcc} onChange={setPayOutAcc} placeholder="Account..." accent={T.red}/>
                    </div>
                    <div>
                      {lbl("MOP")}
                      <SearchSelect options={MOPS_LIST} value={payOutMop} onChange={setPayOutMop} placeholder="Mode..."/>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              SALES INVOICE — mode toggle + BOQ / Fresh
          ════════════════════════════════════════════════════ */}
          {isInvoice&&(
            <div>
              <ModeToggle mode={invMode} setMode={setInvMode} c={T.grn}
                opts={[["boq","Link with BOQ","Pick items from project BOQ"],["fresh","Fresh Invoice","Enter work items manually"]]}/>

              {invMode==="boq"&&(
                <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:10}}>
                  <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 85px 72px 85px 90px 90px",padding:"7px 12px",background:T.sb,gap:7}}>
                    {["","Work Item","Description","BOQ Qty","Unit","Rate","Bill Qty","Amount"].map((h,i)=>(
                      <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
                    ))}
                  </div>
                  {BOQ_ITEMS.map(b=><BoqRow key={b.id} b={b}/>)}
                  <div style={{padding:"9px 12px",background:T.surfaceB,borderTop:`2px solid ${T.b2}`,display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:11,color:T.t3}}>{Object.values(boqSelected).filter(Boolean).length} item{Object.values(boqSelected).filter(Boolean).length!==1?"s":""} selected</span>
                    <div style={{flex:1}}/>
                    <TotalBar total={boqGrandTotal} c={T.grn} bg={T.grnL} brd={T.grnM} label="Invoice Total"/>
                  </div>
                </div>
              )}

              {invMode==="fresh"&&(
                <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:10}}>
                  <div style={{display:"grid",gridTemplateColumns:invColTpl,padding:"7px 12px",background:T.sb,gap:7}}>
                    {["#","Work Item","Description","Qty","Unit","Rate Rs.","Total Rs.",""].map((h,i)=>(
                      <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
                    ))}
                  </div>
                  {invRows.map((row,idx)=>(
                    <div key={row.id} style={{display:"grid",gridTemplateColumns:invColTpl,gap:7,padding:"7px 12px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:idx%2===0?T.surface:T.surfaceB}}>
                      <span style={{fontSize:11.5,color:T.t4,textAlign:"center",fontWeight:600}}>{idx+1}</span>
                      <input ref={el=>{if(el) invRowRefs.current[row.id]=el;}}
                        value={row.work} onChange={e=>updInvRow(row.id,"work",e.target.value)} placeholder="e.g. Foundation Work"
                        style={inp()} onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.b1}/>
                      <input value={row.desc} onChange={e=>updInvRow(row.id,"desc",e.target.value)} placeholder="Scope, location..."
                        style={inp()} onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.b1}/>
                      <input type="number" value={row.qty} onChange={e=>updInvRow(row.id,"qty",e.target.value)} placeholder="0"
                        style={inp({textAlign:"right"})} onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.b1}/>
                      <SearchSelect options={INV_UNITS} value={row.unit} onChange={v=>updInvRow(row.id,"unit",v)} compact={true} accent={T.grn}/>
                      <input type="number" value={row.rate} onChange={e=>updInvRow(row.id,"rate",e.target.value)} placeholder="0"
                        style={inp({textAlign:"right"})}
                        onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.b1}
                        onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addInvRow();}}}/>
                      <div style={{height:30,display:"flex",alignItems:"center",justifyContent:"flex-end",fontWeight:700,fontSize:13,
                        color:row.total>0?T.grn:T.t4,background:row.total>0?T.grnL:"transparent",
                        borderRadius:5,padding:"0 7px",border:row.total>0?`1px solid ${T.grnM}`:"1px solid transparent"}}>
                        {row.total>0?`Rs.${row.total.toLocaleString("en-IN")}`:"—"}
                      </div>
                      <button onClick={()=>removeInvRow(row.id)} style={{background:"none",border:"none",cursor:invRows.length>1?"pointer":"not-allowed",color:invRows.length>1?T.red:T.b2,display:"flex",padding:0,alignItems:"center",justifyContent:"center"}}>
                        <IcX size={12} color="currentColor"/>
                      </button>
                    </div>
                  ))}
                  <div style={{padding:"8px 12px",background:T.surfaceB,borderTop:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:10}}>
                    <button onClick={addInvRow}
                      style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:6,background:T.surface,border:`1.5px dashed ${T.b2}`,color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=T.grn;e.currentTarget.style.color=T.grn;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b2;e.currentTarget.style.color=T.t3;}}>
                      <IcAdd size={12} color="currentColor"/> Add Work Item
                    </button>
                    <span style={{fontSize:10.5,color:T.t4}}>{invRows.length} item{invRows.length>1?"s":""}</span>
                    <div style={{flex:1}}/>
                    <TotalBar total={invFreshTotal} c={T.grn} bg={T.grnL} brd={T.grnM} label="Invoice Total"/>
                  </div>
                </div>
              )}

              {/* Note */}
              <div style={{marginBottom:12}}>
                {lbl("Note / Terms (optional)")}
                <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Payment terms, notes for client..."
                  style={{...inp(),marginTop:3}}
                  onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.b1}/>
              </div>

              {/* ── LINKED PAYMENT IN ── */}
              <div style={{borderRadius:9,border:`1.5px solid ${payInLinked?T.grn:T.b1}`,overflow:"hidden",
                background:payInLinked?T.grnL:T.surface,transition:"all .2s"}}>
                <button onClick={()=>{setPayInLinked(p=>!p);if(!payInLinked)setPayInAmt(String(invTotal));}}
                  style={{width:"100%",padding:"11px 14px",display:"flex",alignItems:"center",gap:10,
                    background:"none",border:"none",cursor:"pointer",textAlign:"left"}}>
                  <div style={{width:22,height:22,borderRadius:5,border:`2px solid ${payInLinked?T.grn:T.b2}`,
                    background:payInLinked?T.grn:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {payInLinked&&<IcChk size={12} color="white"/>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:payInLinked?T.grn:T.t2}}>Payment Received at Same Time</div>
                    <div style={{fontSize:10.5,color:T.t4}}>Client paid immediately — record payment along with this invoice</div>
                  </div>
                  {payInLinked&&invTotal>0&&(
                    <span style={{fontSize:12,fontWeight:700,color:T.grn}}>Rs.{invTotal.toLocaleString("en-IN")}</span>
                  )}
                </button>
                {payInLinked&&(
                  <div style={{padding:"0 14px 14px",display:"grid",gridTemplateColumns:"1fr 140px 130px 130px",gap:9}}>
                    <div>
                      {lbl("Payment Date *")}
                      <input type="date" value={payInDate} onChange={e=>setPayInDate(e.target.value)}
                        style={inp()} onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.b1}/>
                    </div>
                    <div>
                      {lbl("Amount Received *",T.grn)}
                      <input type="number" value={payInAmt} onChange={e=>setPayInAmt(e.target.value)}
                        style={inp({fontSize:13,fontWeight:700,color:T.grn,borderColor:T.grn+"66"})}
                        onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.grn+"66"}/>
                    </div>
                    <div>
                      {lbl("Account *",T.red)}
                      <SearchSelect options={ACCOUNTS_LIST} value={payInAcc} onChange={setPayInAcc} placeholder="Account..." accent={T.red}/>
                    </div>
                    <div>
                      {lbl("MOP")}
                      <SearchSelect options={MOPS_LIST} value={payInMop} onChange={setPayInMop} placeholder="Mode..."/>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{padding:"11px 16px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:8,background:T.surfaceB,flexShrink:0,alignItems:"center"}}>
          <div style={{flex:1,fontSize:13,fontWeight:700}}>
            {isMaterial&&grandTotal>0&&<span style={{color:T.grn}}>Rs.{grandTotal.toLocaleString("en-IN")} · {rows.filter(r=>r.total>0).length} item{rows.filter(r=>r.total>0).length!==1?"s":""}</span>}
            {isSubcon&&<span style={{color:T.slt}}>Rs.{subTotal.toLocaleString("en-IN")}
              {payOutLinked?<span style={{color:T.t4,fontWeight:400,fontSize:11}}> · Payment out: Rs.{Number(payOutAmt||0).toLocaleString("en-IN")}</span>:null}
            </span>}
            {isInvoice&&invTotal>0&&<span style={{color:T.grn}}>{invoiceNo} · Rs.{invTotal.toLocaleString("en-IN")}
              {payInLinked?<span style={{color:T.t4,fontWeight:400,fontSize:11}}> · Received: Rs.{Number(payInAmt||0).toLocaleString("en-IN")}</span>:null}
            </span>}
            {isPayment&&payAmt&&<span style={{color:tc}}>Rs.{Number(payAmt).toLocaleString("en-IN")}{type==="Payment Received"?" received":type==="Payment Made"?" paid out":""}</span>}
            {isBankTransfer&&payAmt&&<span style={{color:T.blu}}>Rs.{Number(payAmt).toLocaleString("en-IN")} — {account} → {toAccount}</span>}
          </div>
          {/* Error message — supports multi-line for backend code-based errors */}
          {saveErr&&(
            <div style={{flex:1,padding:"7px 12px",borderRadius:7,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11.5,fontWeight:600,display:"flex",alignItems:"flex-start",gap:6,whiteSpace:"pre-line",lineHeight:1.45}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{flexShrink:0,marginTop:2}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
              <span style={{flex:1}}>{saveErr}</span>
              <span onClick={()=>setSaveErr("")} style={{cursor:"pointer",opacity:0.6,fontSize:13,flexShrink:0}}>✕</span>
            </div>
          )}
          <button onClick={onClose} style={{padding:"8px 16px",borderRadius:7,border:`1.5px solid ${T.b1}`,background:T.surface,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
          {!saved?(
            <button onClick={handleSave} disabled={savingTxn}
              style={{padding:"8px 22px",borderRadius:7,background:savingTxn?"#9CA3AF":tc,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:savingTxn?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6,opacity:saveErr?0.85:1}}>
              {savingTxn ? (
                <>
                  <span style={{width:12,height:12,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"white",borderRadius:"50%",display:"inline-block",animation:"spin 0.6s linear infinite"}}/>
                  Saving...
                </>
              ) : (
                <>
                  <IcChk size={14} color="white"/> Save Entry
                </>
              )}
            </button>
          ):(
            <div style={{padding:"8px 22px",borderRadius:7,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
              <IcChk size={14} color={T.grn}/> Saved!
            </div>
          )}
        </div>
      </div>
    </>
  );
}


// ─── ADD PARTY MODAL ─────────────────────────────────────────
function AddPartyModal({onClose,onAdd}){
  const PARTY_TYPES=["Client","Material Supplier","Sub-Con","Other Vendor","Labour Contractor"];
  const BAL_TYPES=["To Receive","To Pay","Advance Paid","Advance Received","Nil"];
  const [name,setName]=useState("");
  const [type,setType]=useState(PARTY_TYPES[0]);
  const [balType,setBalType]=useState(BAL_TYPES[0]);
  const [balance,setBalance]=useState("");
  const [phone,setPhone]=useState("");
  const [saved,setSaved]=useState(false);
  const inp=(extra={})=>({height:32,padding:"0 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,
    fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",
    background:T.surface,width:"100%",...extra});
  const lbl=t=><label style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",
    letterSpacing:".3px",display:"block",marginBottom:4}}>{t}</label>;
  const handleSave=()=>{
    if(!name.trim()) return;
    const newParty={id:Date.now(),name:name.trim(),type,balType,balance:Number(balance)||0,phone};
    onAdd(newParty);
    setSaved(true);
    setTimeout(()=>{setSaved(false);onClose();},800);
  };
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.48)",zIndex:400,backdropFilter:"blur(3px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
      background:T.bg,borderRadius:12,width:460,maxWidth:"95vw",zIndex:401,
      boxShadow:"0 24px 70px rgba(0,0,0,0.28)",display:"flex",flexDirection:"column",
      fontFamily:"'Segoe UI',sans-serif",overflow:"visible"}}>
      <div style={{background:T.blu,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,borderRadius:"12px 12px 0 0"}}>
        <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <IcAdd size={16} color="white"/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:800,color:"white"}}>Add New Party</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.7)"}}>Saved to master party library</div>
        </div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",color:"white",padding:"5px 7px",borderRadius:6,display:"flex"}}><IcX size={14}/></button>
      </div>
      <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:11}}>
        <div>
          {lbl("Party / Company Name *")}
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Vendor Name"
            style={inp({fontSize:13,fontWeight:600})}
            onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}
            autoFocus/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
          <div>
            {lbl("Party Type *")}
            <select value={type} onChange={e=>setType(e.target.value)}
              style={inp({cursor:"pointer"})}>
              {PARTY_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            {lbl("Balance Type")}
            <select value={balType} onChange={e=>setBalType(e.target.value)}
              style={inp({cursor:"pointer"})}>
              {BAL_TYPES.map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            {lbl("Opening Balance (Rs.)")}
            <input type="number" value={balance} onChange={e=>setBalance(e.target.value)} placeholder="0"
              style={inp()} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
          </div>
          <div>
            {lbl("Phone / Contact")}
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Mobile number"
              style={inp()} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
          </div>
        </div>
        <div style={{background:T.bluL,borderRadius:8,padding:"8px 11px",fontSize:11,color:T.blu,border:`1px solid ${T.bluM}`,display:"flex",gap:6,alignItems:"center"}}>
          <IcChk size={13} color={T.blu}/>
          Party will be added to the master library and available in all transaction dropdowns.
        </div>
      </div>
      <div style={{padding:"11px 16px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:8,background:T.surfaceB,borderRadius:"0 0 12px 12px"}}>
        <button onClick={onClose} style={{flex:1,padding:"8px",borderRadius:7,border:`1.5px solid ${T.b1}`,background:T.surface,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
        {!saved?(
          <button onClick={handleSave} style={{flex:2,padding:"8px",borderRadius:7,background:!name.trim()?T.b1:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:!name.trim()?"not-allowed":"pointer"}}>
            Save to Library
          </button>
        ):(
          <div style={{flex:2,padding:"8px",borderRadius:7,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <IcChk size={14} color={T.grn}/> {name} Added!
          </div>
        )}
      </div>
    </div>
  </>);
}

// ══════════════════════════════════════════════════════════════
// FINANCE MODULE — with integrated Create Transaction Modal
// ══════════════════════════════════════════════════════════════
// ─── NEW PAYMENT REQUEST MODAL ───────────────────────────────
function NewPRModal({onClose,onSave,dbParties,dbProjects}){
  const PROJECTS=dbProjects?.length?dbProjects:[];
  const ALL_PARTIES=dbParties?.length?dbParties.map(p=>p.name):[];
  const PRIORITIES=["Low","Medium","High","Urgent"];
  const [party,setParty]=useState("");
  const [project,setProject]=useState(PROJECTS[0]||"");
  const [purpose,setPurpose]=useState("");
  const [note,setNote]=useState("");
  const [amount,setAmount]=useState("");
  const [priority,setPriority]=useState("Medium");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const PRIC={
    "Low":   {c:T.grn, bg:T.grnL, brd:T.grnM},
    "Medium":{c:T.amb, bg:T.ambL, brd:T.ambM},
    "High":  {c:T.red, bg:T.redL, brd:T.redM},
    "Urgent":{c:"#7C3AED",bg:"#F5F3FF",brd:"#DDD6FE"},
  };
  const savingRef=useRef(false);
  const handleSave=async()=>{
    if(savingRef.current) return; // hard guard against double-fire
    if(!party||!purpose||!amount){setErr("Party, Purpose & Amount are required");return;}
    savingRef.current=true;
    setSaving(true);setErr("");
    try{
      const res=await api.post("/finance/payment-requests",{
        party_id:dbParties?.find(p=>p.name===party)?.id||null,
        party_name:party,
        project_name:project,
        amount:parseFloat(amount)||0,
        purpose,
        description:purpose+(note?" — "+note:""),
        priority,
        note:note||null,
      });
      if(res?.success===false){setErr(res.message||"Save failed");setSaving(false);savingRef.current=false;return;}
      onSave&&onSave();
      onClose();
    }catch(e){setErr(e?.message||"Network error");setSaving(false);}
    savingRef.current=false;
  };
  const inp={height:34,padding:"0 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface,color:T.t1,width:"100%"};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surface,borderRadius:14,width:520,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"14px 20px",background:T.blu,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"white"}}>New Payment Request</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:2}}>Request will be sent for admin approval</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,cursor:"pointer",color:"white",padding:"4px 8px",fontSize:13}}>✕</button>
        </div>
        {/* Body */}
        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>
          {/* Party + Project */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Party / Vendor *</label>
              <LibrarySelect type="any-party" value={party} onChange={setParty} placeholder="Select party..." accent={T.blu} compact/>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Project / Site</label>
              <SearchSelect options={PROJECTS} value={project} onChange={setProject} placeholder="Select project..." accent={T.blu} compact/>
            </div>
          </div>
          {/* Purpose */}
          <div>
            <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Purpose *</label>
            <input value={purpose} onChange={e=>setPurpose(e.target.value)} placeholder="What is this payment for? e.g. TMT Steel purchase for slab casting" style={{...inp}}
              onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
          </div>
          {/* Amount + Priority */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Amount (₹) *</label>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" style={{...inp}}
                onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Priority Level</label>
              <div style={{display:"flex",gap:6,marginTop:2}}>
                {PRIORITIES.map(p=>{
                  const pc=PRIC[p];const sel=priority===p;
                  return(
                    <button key={p} onClick={()=>setPriority(p)}
                      style={{flex:1,padding:"5px 0",borderRadius:7,border:`1.5px solid ${sel?pc.brd:T.b1}`,background:sel?pc.bg:T.surface,color:sel?pc.c:T.t4,fontSize:10.5,fontWeight:sel?700:500,cursor:"pointer",transition:"all 0.15s"}}>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Note */}
          <div>
            <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Additional Note (Optional)</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Any additional details, urgency reason, specifications..."
              style={{width:"100%",height:70,padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface,color:T.t1,resize:"none"}}
              onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
          </div>
          {/* Error */}
          {err&&<div style={{padding:"8px 12px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:7,color:T.red,fontSize:12,fontWeight:600}}>{err}</div>}
        </div>
        {/* Footer */}
        <div style={{padding:"12px 20px",borderTop:`1px solid ${T.b1}`,display:"flex",justifyContent:"flex-end",gap:8,background:T.surfaceB}}>
          <button onClick={onClose} style={{padding:"8px 18px",borderRadius:7,border:`1.5px solid ${T.b1}`,background:T.surface,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{padding:"8px 22px",borderRadius:7,background:saving?T.t4:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
            {saving?"Submitting...":"Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FinanceModule(){
  const [tab,setTab]=useState("party");
  // Party tab
  const [masterParties,setMasterParties]=useState(PARTIES);
  const [showAddParty,setShowAddParty]=useState(false);
  const [selParty,setSelParty]=useState(null);const [partySearch,setPartySearch]=useState("");const [selBill,setSelBill]=useState(null);
  const [apiLedger,setApiLedger]=useState({});
  // Transaction tab
  const [txnSearch,setTxnSearch]=useState("");const [fProject,setFProject]=useState("All");const [fType,setFType]=useState("All");const [fAcc,setFAcc]=useState("All");const [fStatus,setFStatus]=useState("All");
  // Panels
  const [showUB,setShowUB]=useState(false);const [selUBParty,setSelUBParty]=useState(null);
  const [showAccPanel,setShowAccPanel]=useState(false);const [accTab,setAccTab]=useState("accounts");
  const [showCreateTxn,setShowCreateTxn]=useState(false);
  // ── CREATE TRANSACTION MODAL state ──────────────────────────
  const [createTxnType,setCreateTxnType]=useState(null);
  const [createTxnParty,setCreateTxnParty]=useState("");
  const [grnList,setGrnList]=useState([]);
  const [grnLoading,setGrnLoading]=useState(false);
  const [grnFilter,setGrnFilter]=useState({project:"All",material:"",head:"All"});
  const [prefillGRNData,setPrefillGRNData]=useState(null);
  // Unbilled UI: which vendor card is expanded, and which items are ticked.
  // selectedUBItems is a Set of stable keys "grnId-itemIdx".
  const [expandedVendor,setExpandedVendor]=useState(null);
  const [selectedUBItems,setSelectedUBItems]=useState(()=>new Set());
  // Bill-conflict warning state — populated by the +Bill pre-flight check
  // when the same GRN or same vendor+challan has been billed already.
  const [conflictData,setConflictData]=useState(null);
  // When user clicks a row in the Billed Material tab (each row = one
  // line item of a parent bill), we pass this hint to TransactionDetailDrawer
  // so the matching line gets highlighted + scrolled-to. Cleared on close.
  const [selTxnHighlight,setSelTxnHighlight]=useState(null);
  // Transaction detail drawer (used from Fin Activity + Party Ledger)
  const [selTxn,setSelTxn]=useState(null);

  // Load GRN data when tab opens (or refresh requested)
  const loadUnbilledGRNs=()=>{
    setGrnLoading(true);
    api.get("/procurement/grns?unbilled=1").then(res=>{
      if(res.success) setGrnList(res.data||[]);
    }).catch(()=>{}).finally(()=>setGrnLoading(false));
  };
  useEffect(()=>{
    if(tab==="unbilled_grn"&&grnList.length===0) loadUnbilledGRNs();
  // eslint-disable-next-line
  },[tab]);

  // settlesRef = { kind: 'bill'|'pr', id, amount, label }
  // Set when "Pay" is clicked on a Pending Payments row so the resulting
  // payment txn links back to its source and marks it paid.
  const [settlesRef,setSettlesRef]=useState(null);
  const openTxn=(type,party="",grnPrefill=null,settlesRefObj=null)=>{
    if(grnPrefill) setPrefillGRNData(grnPrefill);
    else setPrefillGRNData(null);
    setSettlesRef(settlesRefObj);
    setCreateTxnType(type);
    setCreateTxnParty(party);
  };
  const closeTxn=()=>{
    setCreateTxnType(null);setCreateTxnParty("");setPrefillGRNData(null);setSettlesRef(null);
  };
  const handleTxnSaved=async()=>{
    // Capture prefill BEFORE closeTxn clears it
    const savedPrefill=prefillGRNData;
    closeTxn(); // close modal immediately
    await refreshAll();
    // Re-fetch unbilled list so a server-side check confirms what's still pending.
    // (Backend ?unbilled=1 query excludes anything with transactions.grn_id linked +
    // Auto-Bill GRNs, so the bill we just saved drops off automatically.)
    if(savedPrefill){
      // Optimistic local removal first so UI feels instant
      const grnNum=savedPrefill.grnNumber;
      if(grnNum) setGrnList(p=>p.filter(g=>g.grn_number!==grnNum));
      // Then authoritative refresh from server
      loadUnbilledGRNs();
    }
  };
  // Filter chips (one per tab)
  const [chipParty,setChipParty]=useState("All");
  const [chipTxn,setChipTxn]=useState("All");
  const [chipCB,setChipCB]=useState("All");
  const [chipPR,setChipPR]=useState("All");
  const [chipPend,setChipPend]=useState("All");
  // Universal search — single box, matches ANY column value (no, type, party, amount, priority, date, status...)
  const [searchPend,setSearchPend]=useState("");
  const [searchPR,setSearchPR]=useState("");
  // Sort states for each tab
  const [sortPend,setSortPend]=useState({col:"overdue",dir:"desc"});
  const [sortPR,setSortPR]=useState({col:"date",dir:"desc"});
  const [sortCB,setSortCB]=useState({col:"date",dir:"desc"});
  // PR / Pending
  const [editReqId,setEditReqId]=useState(null);const [editAmt,setEditAmt]=useState("");
  const [payReqs,setPayReqs]=useState(PAY_REQS_DATA);
  // pendBills holds only non-PR bills (from backend). Approved PRs are derived from payReqs.
  const [pendBills,setPendBills]=useState(PEND_PMTS_DATA);
  // Derived list: approved (unpaid) PRs from payReqs + pending bills — always in sync
  const pendPmts = (()=>{
    const today = new Date(); today.setHours(0,0,0,0);
    const fromPRs = payReqs
      .filter(r=>r.status==="Approved" && !r.paid)
      .map(r=>({
        id:`pr-${r.id}`,
        type:"pr",
        no:r.no,
        party:r.party||"",
        project:r.project||"",
        amount:Number(r.amount)||0,
        date:r.date||"",
        priority:r.priority||"Medium",
        subType:r.subType,
        overdue:false,
        _src:r,
      }));
    return [...fromPRs, ...pendBills];
  })();
  const setPendPmts = setPendBills; // legacy compat — only bill mutations should use this now
  const [showNewPR,setShowNewPR]=useState(false);
  // API data
  const [apiAccounts,setApiAccounts]=useState(null);
  const [apiTransactions,setApiTransactions]=useState(null);
  const [apiPartyTxns,setApiPartyTxns]=useState(null);
  const [loading,setLoading]=useState({parties:false,txns:false,accounts:false,payreqs:false,pendpmts:false});
  const [apiError,setApiError]=useState({});

  // ── TYPE MAP: backend type string → frontend display type ─────
  const TXN_TYPE_MAP={
    "receipt":"Payment In","payment":"Payment Out",
    "material_purchase":"Material Purchase","site_expense":"Site Expense",
    "party_payment":"Party Payment","subcon_expense":"Sub-Con Expense",
    "material_return":"Material Return","sales_invoice":"Sales Invoice",
    "unbilled_material":"Unbilled Material","wallet_payment":"Wallet Payment",
    "wallet_topup":"Wallet Top-up","bank_transfer":"Bank Transfer",
  };

  // ── MAP HELPERS ───────────────────────────────────────────────
  const mapParty=p=>{
    // Backend now computes live_balance from transactions table — it's
    // the authoritative current balance. opening_balance is just the
    // immutable true opening (typically 0). balance is the same as
    // live_balance, kept for backwards-compat with older clients.
    const rawBal=parseFloat(p.live_balance ?? p.balance ?? p.opening_balance ?? 0)||0;
    const pType=p.type||(p.party_type)||(p.category)||"Other Vendor";
    // Vendors/Labour/Sub-Con: negative balance means we OWE them (To Pay)
    // Clients: positive balance means they OWE us (To Receive)
    let balType=p.balance_type||"";
    if(!balType){
      const isVendor=["Material Supplier","Sub-Con","Labour","Other Vendor","contractor","subcontractor"].includes(pType);
      if(isVendor) balType=rawBal<=0?"To Pay":"Advance Paid";
      else balType=rawBal>=0?"To Receive":"Advance Received";
    }
    return {
      id:p.id, name:p.name, type:pType,
      balance:Math.abs(rawBal),          // always positive display
      rawBalance:rawBal,                 // keep original for calculations
      balType,
      phone:p.phone||p.mobile||"",city:p.city||"",
    };
  };

  const mapTxn=t=>{
    const rawDate=t.date||t.transaction_date||t.created_at||"";
    const d=rawDate?new Date(rawDate):new Date();
    const ds=parseInt(rawDate.replace(/\D/g,"").slice(0,8))||
      (d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate());
    const frontType=TXN_TYPE_MAP[t.type]||(t.dr?"Payment Out":"Payment In");
    // All expense/purchase types are debit (money going out)
    const BACK_DEBIT=["payment","material_purchase","site_expense","party_payment",
      "subcon_expense","wallet_payment","wallet_topup","bank_transfer"];
    const isDebit=BACK_DEBIT.includes(t.type)||t.dr===true||(!t.type&&t.dr);
    return {
      id:t.id,
      date:d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
      ds,
      party:t.party_name||t.party||"",
      sub:t.description||t.note||t.narration||"",
      project:t.project_name||t.project||"",
      type:frontType,
      account:t.account_name||t.account||"",
      amount:parseFloat(t.amount)||0,
      dr:isDebit,
      status:t.status||"paid",
      txnType:t.type||"",
      note:t.note||null,
      to_account_name:t.to_account_name||null,
      mop:t.mop||"",
      entryBy:t.created_by_name||t.entry_by||"",
      // Line items — Billed Material tab reads `items` to show one row per material.
      // Backend GET /finance/transactions now returns line_items[] for bill-type txns.
      items:t.items||t.line_items||null,
      grn_id:t.grn_id||null,
    };
  };

  const mapPayReq=r=>{
    const rawDate=r.created_at||r.date||"";
    const d=rawDate?new Date(rawDate):new Date();
    return {
      id:r.id,
      no:r.pr_number||`PR-${r.id}`,
      date:d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
      ds:parseInt(rawDate.replace(/\D/g,"").slice(0,8))||
        (d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()),
      party:r.party_name||r.party||"",
      project:r.project_name||r.project||"",
      amount:parseFloat(r.amount)||0,
      status:r.status==="approved"?"Approved":r.status==="rejected"?"Rejected":"Pending",
      by:r.requested_by_name||r.requested_by||r.created_by_name||"",
      purpose:r.purpose||r.description||r.note||"",
      approvedBy:r.approved_by_name||r.approved_by||"",
      approvedDate:r.approved_at?new Date(r.approved_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"",
      originalAmt:r.original_amount?parseFloat(r.original_amount):undefined,
      modified:!!r.original_amount,
    };
  };

  const mapPendPmt=p=>{
    const dueDateRaw = p.due_date || p.date || null;
    let daysToDue = p.days_to_due;
    if (daysToDue == null && dueDateRaw) {
      const d = new Date(dueDateRaw);
      const today = new Date(); today.setHours(0,0,0,0);
      d.setHours(0,0,0,0);
      daysToDue = Math.floor((d - today) / (1000*60*60*24));
    }
    return {
      id:p.id,
      type:p.type==="payment_request"||p.type==="pr"?"pr":"bill",
      no:p.reference_no||p.pr_number||`PP-${p.id}`,
      party:p.party_name||p.party||"",
      project:p.project_name||p.project||"",
      amount:parseFloat(p.amount||p.balance)||0,
      date:dueDateRaw?new Date(dueDateRaw).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"",
      dueDateRaw,
      daysToDue: daysToDue ?? null,
      overdue:p.overdue===true||(dueDateRaw&&new Date(dueDateRaw)<new Date(new Date().setHours(0,0,0,0))),
    };
  };

  const mapAccount=a=>({
    id:a.id,name:a.name||a.account_name||"",
    no:a.account_number?("••"+String(a.account_number).slice(-4)):null,
    balance:parseFloat(a.current_balance||a.opening_balance||a.balance)||0,
    color:a.type==="bank"||a.account_type==="bank"?C.p:
          a.type==="cash"||a.account_type==="cash"?C.g:C.teal,
  });

  // ── REFRESH FUNCTIONS (called after mutations) ────────────────
  const refreshTxns=async()=>{
    try{
      setLoading(l=>({...l,txns:true}));
      const r=await api.get("/finance/transactions");
      if(r.success&&r.data?.length) setApiTransactions(r.data.map(mapTxn));
    }catch(e){console.error("Refresh txns:",e);}
    finally{setLoading(l=>({...l,txns:false}));}
  };

  const refreshPayReqs=async()=>{
    try{
      setLoading(l=>({...l,payreqs:true}));
      const r=await api.get("/finance/payment-requests");
      if(r.success&&r.data?.length) setPayReqs(r.data.map(mapPayReq));
    }catch(e){console.error("Refresh payreqs:",e);}
    finally{setLoading(l=>({...l,payreqs:false}));}
  };

  const refreshPendPmts=async()=>{
    // pendPmts is now derived from payReqs (PR portion) + pendBills (from backend).
    // We only fetch the BILLS portion here; PRs are computed live from payReqs so
    // amounts always match what's shown in Payment Requests.
    try{
      setLoading(l=>({...l,pendpmts:true}));
      const r=await api.get("/finance/pending-payments");
      if(r.success&&Array.isArray(r.data)){
        // Drop any "pr" rows from the API response — those are derived elsewhere
        const billsOnly = r.data.map(mapPendPmt).filter(p=>p.type!=="pr");
        setPendBills(billsOnly);
      }
    }catch(e){
      // 404 expected on installs without the bills endpoint — leave pendBills as-is
      if(!e?.message?.includes("404")) console.error("Refresh pending:",e);
    }
    finally{setLoading(l=>({...l,pendpmts:false}));}
  };

  const refreshParties=async()=>{
    try{
      setLoading(l=>({...l,parties:true}));
      const r=await api.get("/finance/parties");
      if(r.success&&r.data?.length) setMasterParties(r.data.map(mapParty));
    }catch(e){console.error("Refresh parties:",e);}
    finally{setLoading(l=>({...l,parties:false}));}
  };

  const refreshAccounts=async()=>{
    try{
      setLoading(l=>({...l,accounts:true}));
      const r=await api.get("/finance/accounts");
      if(r.success&&r.data?.length) setApiAccounts(r.data.map(mapAccount));
    }catch(e){console.error("Refresh accounts:",e);}
    finally{setLoading(l=>({...l,accounts:false}));}
  };

  // Refresh all at once (parallel)
  const refreshAll=async()=>{
    await Promise.allSettled([
      refreshParties(),refreshTxns(),refreshAccounts(),
      refreshPayReqs(),refreshPendPmts(),
    ]);
  };

  // ── INITIAL LOAD ──────────────────────────────────────────────
  useEffect(()=>{ refreshAll(); },[]);

  // Use API data if available, fallback to hardcoded
  const activeAccounts=apiAccounts||ACCOUNTS.map(mapAccount);
  // Merge wallet transactions into activeTxns (wallet txns only when no API data)
  const activeTxns=apiTransactions
    ? [...apiTransactions,...WALLET_TXNS]
    : [...TRANSACTIONS_DATA,...WALLET_TXNS];

  // Chip filters applied to data
  // Compute real-time party balances from transactions
  const computePartyBalance=(partyId,partyName,partyType)=>{
    const txns=apiLedger[partyId]||activeTxns.filter(t=>t.party===partyName);
    if(txns.length===0) return null;
    const isVendorP=["Material Supplier","Sub-Con","Labour","Other Vendor","contractor"].includes(partyType);
    const VENDOR_BILLS=["material_purchase","subcon_expense","site_expense","Material Purchase","Sub-Con Expense","Site Expense"];
    const VENDOR_PAYS=["payment","party_payment","Payment Made","Payment Out"];
    const CLIENT_RCPTS=["receipt","Payment Received","Payment In"];
    let cr=0,dr=0;
    txns.forEach(t=>{
      const tType=t.txnType||t.type||"";
      const note=t.note||t.sub||"";
      let isCR=false;
      if(isVendorP){
        isCR=VENDOR_BILLS.some(x=>tType.includes(x)||note.includes("Purchase")||note.includes("Bill"));
      } else {
        isCR=CLIENT_RCPTS.some(x=>tType.includes(x)||note.includes("Payment Received"));
      }
      if(isCR) cr+=parseFloat(t.amount)||0;
      else dr+=parseFloat(t.amount)||0;
    });
    const net=cr-dr;
    const balType=isVendorP?(net>0?"To Pay":"Advance Paid"):(net>0?"To Receive":"Advance Received");
    return {balance:Math.abs(net),balType,cr,dr};
  };
  const partiesWithBalance=masterParties.map(p=>{
    const computed=computePartyBalance(p.id,p.name,p.type);
    return computed?{...p,...computed}:p;
  });
  const filteredParties=partiesWithBalance.filter(p=>chipParty==="All"||p.type===chipParty);

  const projects=["All",...new Set(activeTxns.map(t=>t.project))];
  const txnFiltered=activeTxns.filter(t=>{
    if(txnSearch&&!t.party.toLowerCase().includes(txnSearch.toLowerCase())&&!t.sub.toLowerCase().includes(txnSearch.toLowerCase())) return false;
    if(fProject!=="All"&&t.project!==fProject) return false;
    if(fType!=="All"&&t.type!==fType) return false;
    if(fAcc!=="All"&&t.account!==fAcc) return false;
    if(fStatus!=="All"&&t.status!==fStatus) return false;
    // chip filter
    if(chipTxn==="Payment In"&&t.type!=="Payment In") return false;
    if(chipTxn==="Payment Out"&&t.type!=="Payment Out") return false;
    if(chipTxn==="Material"&&t.type!=="Material Purchase") return false;
    if(chipTxn==="Site Expense"&&t.type!=="Site Expense") return false;
    if(chipTxn==="Sub-Con"&&t.type!=="Sub-Con Expense") return false;
    if(chipTxn==="Party Payment"&&t.type!=="Party Payment") return false;
    if(chipTxn==="Wallet Payment"&&t.type!=="Wallet Payment") return false;
    if(chipTxn==="Wallet Top-up"&&t.type!=="Wallet Top-up") return false;
    if(chipTxn==="Unpaid"&&t.status==="paid") return false;
    return true;
  });
  const tIn=txnFiltered.filter(t=>!t.dr).reduce((s,t)=>s+t.amount,0);
  const tOut=txnFiltered.filter(t=>t.dr).reduce((s,t)=>s+t.amount,0);
  const totalBal=activeAccounts.reduce((s,a)=>s+a.balance,0);
  const totalWalletBal=WALLETS.reduce((s,w)=>s+w.balance,0);
  const pendPR=payReqs.filter(r=>r.status==="Pending").length;
  const pendTotal=pendPmts.reduce((s,p)=>s+p.amount,0);

  const allPartyTxns=activeTxns.length>0?activeTxns:Object.values(PARTY_TXNS).flat();
  const partyTotalCR=allPartyTxns.filter(t=>!t.dr).reduce((s,t)=>s+t.amount,0);
  const partyTotalDR=allPartyTxns.filter(t=>t.dr).reduce((s,t)=>s+t.amount,0);
  const toReceive=partiesWithBalance.filter(p=>p.balType==="To Receive").reduce((s,p)=>s+p.balance,0);
  const toPay=partiesWithBalance.filter(p=>p.balType==="To Pay").reduce((s,p)=>s+p.balance,0);
  const allTxnIn=activeTxns.filter(t=>!t.dr).reduce((s,t)=>s+t.amount,0);
  const allTxnOut=activeTxns.filter(t=>t.dr).reduce((s,t)=>s+t.amount,0);
  const unpaidBills=activeTxns.filter(t=>t.status==="unpaid").reduce((s,t)=>s+t.amount,0);
  const netFlow=allTxnIn-allTxnOut;
  const prPendAmt=payReqs.filter(r=>r.status==="Pending").reduce((s,r)=>s+r.amount,0);
  const prApprovedAmt=payReqs.filter(r=>r.status==="Approved").reduce((s,r)=>s+r.amount,0);
  const prRejected=payReqs.filter(r=>r.status==="Rejected").length;
  const prRejectedAmt=payReqs.filter(r=>r.status==="Rejected").reduce((s,r)=>s+r.amount,0);
  const pendPRTotal=pendPmts.filter(p=>p.type==="pr").reduce((s,p)=>s+p.amount,0);
  const pendBillDue=pendPmts.filter(p=>p.type==="bill"&&!p.overdue).reduce((s,p)=>s+p.amount,0);
  const pendOverdue=pendPmts.filter(p=>p.overdue).reduce((s,p)=>s+p.amount,0);

  // ── Cash Book computed ──────────────────────────────────────
  // Cash Book = ACTUAL money movements only. Bills (material_purchase,
  // subcon_expense, sales_invoice, material_return) are liabilities /
  // invoices, not cash events — they live in Pending Payments / Billed
  // Material until a Payment Out / Receipt is posted against them.
  const CASH_TXN_TYPES_RAW = ["receipt","payment","party_payment","site_expense","bank_transfer","wallet_payment","wallet_topup"];
  const isCashEvent = (t) => CASH_TXN_TYPES_RAW.includes(t.txnType||"") ||
    ["Payment In","Payment Out","Party Payment","Site Expense","Bank Transfer","Wallet Payment","Wallet Top-up"].includes(t.type);
  const cbTxnsBase=activeTxns.length>0
    ? activeTxns.filter(isCashEvent)
    : TRANSACTIONS_DATA.filter(isCashEvent);
  const cbTxns=cbTxnsBase.filter(t=>{
    if(chipCB==="Receipts") return !t.dr;
    if(chipCB==="Payments") return t.dr;
    return true;
  });
  const cbIn=cbTxns.filter(t=>!t.dr).reduce((s,t)=>s+t.amount,0);
  const cbOut=cbTxns.filter(t=>t.dr).reduce((s,t)=>s+t.amount,0);

  const TILE_SETS={
    party:[
      {l:"Amount Received",v:`₹${fmt(partyTotalCR)}`,sub:"Payments received",Icon:IcRecv,c:T.grn,bg:T.grnL,brd:T.grnM},
      {l:"Amount Paid Out",v:`₹${fmt(partyTotalDR)}`,sub:"Bills & payments",Icon:IcSend,c:T.red,bg:T.redL,brd:T.redM},
      {l:"To Receive",v:`₹${fmt(toReceive)}`,sub:"Against invoices raised",Icon:IcFileInv,c:T.blu,bg:T.bluL,brd:T.bluM},
      {l:"To Pay",v:`₹${fmt(toPay)}`,sub:"Against bills received",Icon:IcBillDue,c:T.amb,bg:T.ambL,brd:T.ambM},
    ],
    transaction:[
      {l:"Total Income",v:`₹${fmt(allTxnIn)}`,sub:"All payment in",Icon:IcTrendUp,c:T.grn,bg:T.grnL,brd:T.grnM},
      {l:"Total Expense",v:`₹${fmt(allTxnOut)}`,sub:"All payment out",Icon:IcTrendDn,c:T.red,bg:T.redL,brd:T.redM},
      {l:"Unpaid Bills",v:`₹${fmt(unpaidBills)}`,sub:"Pending payment",Icon:IcCalDue,c:T.amb,bg:T.ambL,brd:T.ambM},
      {l:"Net Cash Flow",v:`₹${fmt(Math.abs(netFlow))}`,sub:netFlow>=0?"Surplus":"Deficit",Icon:IcPulse,c:netFlow>=0?T.grn:T.red,bg:netFlow>=0?T.grnL:T.redL,brd:netFlow>=0?T.grnM:T.redM},
    ],
    cashbook:[
      {l:"Opening Balance",v:`₹${fmt(totalBal)}`,sub:"Company accounts",Icon:IcBank,c:T.blu,bg:T.bluL,brd:T.bluM},
      {l:"Total Receipts",v:`₹${fmt(cbIn)}`,sub:`${cbTxns.filter(t=>!t.dr).length} entries`,Icon:IcRecv,c:T.grn,bg:T.grnL,brd:T.grnM},
      {l:"Total Payments",v:`₹${fmt(cbOut)}`,sub:`${cbTxns.filter(t=>t.dr).length} entries`,Icon:IcSend,c:T.red,bg:T.redL,brd:T.redM},
      {l:"Closing Balance",v:`₹${fmt(totalBal+cbIn-cbOut)}`,sub:(totalBal+cbIn-cbOut)>=0?"Surplus":"Deficit",Icon:IcWallet,c:(totalBal+cbIn-cbOut)>=0?T.blu:T.red,bg:(totalBal+cbIn-cbOut)>=0?T.bluL:T.redL,brd:(totalBal+cbIn-cbOut)>=0?T.bluM:T.redM},
    ],
    payreq:[
      {l:"Pending Approval",v:`${pendPR} PRs`,sub:`₹${fmt(prPendAmt)} awaiting`,Icon:IcPendClk,c:T.amb,bg:T.ambL,brd:T.ambM},
      {l:"Approved",v:`₹${fmt(prApprovedAmt)}`,sub:"Ready to pay",Icon:IcThumbUp,c:T.grn,bg:T.grnL,brd:T.grnM},
      {l:"Rejected",v:`${prRejected} PRs`,sub:`₹${fmt(prRejectedAmt)} blocked`,Icon:IcOverdue,c:T.red,bg:T.redL,brd:T.redM},
      {l:"Total Submitted",v:`${payReqs.length} PRs`,sub:`₹${fmt(payReqs.reduce((s,r)=>s+r.amount,0))} total`,Icon:IcClip,c:T.slt,bg:T.sltL,brd:"#CBD5E0"},
    ],
    pending:[
      {l:"Approved PR Due",v:`₹${fmt(pendPRTotal)}`,sub:`${pendPmts.filter(p=>p.type==="pr").length} approved, ready`,Icon:IcThumbUp,c:T.grn,bg:T.grnL,brd:T.grnM},
      {l:"Bills Due",v:`₹${fmt(pendBillDue)}`,sub:"Upcoming dues",Icon:IcBillDue,c:T.amb,bg:T.ambL,brd:T.ambM},
      {l:"Overdue",v:`₹${fmt(pendOverdue)}`,sub:`${pendPmts.filter(p=>p.overdue).length} past due date`,Icon:IcOverdue,c:T.red,bg:T.redL,brd:T.redM},
      {l:"Total Pending",v:`₹${fmt(pendTotal)}`,sub:`${pendPmts.length} items`,Icon:IcClock7,c:T.slt,bg:T.sltL,brd:"#CBD5E0"},
    ],
  };
  const curTiles=TILE_SETS[tab]||TILE_SETS.party;

  // ── Ledger helpers ──────────────────────────────────────────
  const getLedgerRows=(party)=>{
    // Priority: API ledger → API transactions filtered → hardcoded
    let txns=apiLedger[party.id]||[];
    if(txns.length===0){
      txns=[...(PARTY_TXNS[party.id]||[])];
    }
    if(txns.length===0&&activeTxns.length>0){
      txns=activeTxns.filter(t=>t.party===party.name).map(t=>({
        id:t.id,date:t.date,note:t.sub||t.type,amount:t.amount,
        dr:t.dr,status:t.status,txnType:t.txnType||"",
      }));
    }

    const isVendor=["Material Supplier","Sub-Con","Labour","Other Vendor","contractor","subcontractor"].includes(party.type);
    const VENDOR_BILL_TYPES=["material_purchase","subcon_expense","site_expense","Material Purchase","Sub-Con Expense","Site Expense"];
    const VENDOR_PAY_TYPES=["payment","party_payment","Payment Made","Payment Out","wallet_payment"];
    const CLIENT_RECEIPT_TYPES=["receipt","payment","Payment Received","Payment In"];
    const CLIENT_BILL_TYPES=["sales_invoice","Sales Invoice"];

    // Remap dr flag based on party type for correct ledger accounting
    const remapped=txns.map(t=>{
      const tType=t.txnType||t.type||"";
      let partyDr=t.dr;
      if(isVendor){
        // Vendor ledger: purchase/bill = CR (we owe them), payment to vendor = DR (we paid)
        if(VENDOR_BILL_TYPES.some(x=>tType.includes(x)||t.note?.includes("Purchase")||t.note?.includes("Bill")))
          partyDr=false; // CR — vendor gave us goods
        else if(VENDOR_PAY_TYPES.some(x=>tType.includes(x)||t.note?.includes("Payment Made")))
          partyDr=true;  // DR — we paid vendor
      } else {
        // Client ledger: receipt = CR (client paid us), invoice = DR (we billed them)
        if(CLIENT_RECEIPT_TYPES.some(x=>tType.includes(x)||t.note?.includes("Payment Received")))
          partyDr=false; // CR — client paid us
        else if(CLIENT_BILL_TYPES.some(x=>tType.includes(x)))
          partyDr=true;  // DR — we billed client
      }
      return {...t,dr:partyDr};
    });

    const sorted=[...remapped].reverse();
    let runBal=0;
    return sorted.reduce((acc,t)=>{
      runBal += t.dr ? -t.amount : t.amount;
      return [...acc,{...t,runBal}];
    },[]).reverse();
  };
  const downloadLedgerCSV=(party)=>{
    const rows=getLedgerRows(party);
    downloadCSV(`${party.name.replace(/\s+/g,"_")}_Ledger.csv`,[
      ["Party Ledger:",party.name],["Type:",party.type],["Balance:",party.balance,party.balType],[],
      ["Date","Type","Site","Note","Received (CR)","Payment (DR)","Balance","Status"],
      ...rows.map(t=>[t.date,t.txnType||t.type||"",t.project||"",t.note||"",!t.dr?t.amount:"",t.dr?t.amount:"",`${Math.abs(t.runBal)} ${t.runBal>=0?"CR":"DR"}`,t.status||""]),
    ]);
  };
  const downloadLedgerPDF=(party)=>{
    const rows=getLedgerRows(party);
    const rowsHTML=rows.map(t=>`<tr><td style="color:#6B7280;white-space:nowrap">${t.date}</td><td>${t.note}${t.status?` <span style="font-size:10px;padding:1px 5px;border-radius:10px;background:${t.status==="paid"?"#ECFDF5":"#FEF2F2"};color:${t.status==="paid"?"#059669":"#DC2626"}">${t.status}</span>`:""}</td><td style="text-align:right;color:#059669;font-weight:700">${!t.dr?"₹"+fmtN(t.amount):""}</td><td style="text-align:right;color:#DC2626;font-weight:700">${t.dr?"₹"+fmtN(t.amount):""}</td><td style="text-align:right;color:${t.runBal>=0?"#059669":"#DC2626"};font-weight:700">₹${fmtN(Math.abs(t.runBal))} ${t.runBal>=0?"CR":"DR"}</td></tr>`).join("");
    printHTML(`Party Ledger — ${party.name}`,`<h2>Party Ledger — ${party.name}</h2><p>${party.type} &nbsp;|&nbsp; Balance: <strong>₹${fmtN(party.balance)}</strong> (${party.balType})</p><table><tr><th>Date</th><th>Description</th><th style="text-align:right">Received (CR)</th><th style="text-align:right">Bill/Paid Out (DR)</th><th style="text-align:right">Balance</th></tr>${rowsHTML}</table><p class="footer">Generated by Company · ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</p>`);
  };

  // ── Transaction CSV/PDF ──────────────────────────────────────
  const dlTxnCSV=()=>{
    downloadCSV("Transactions.csv",[
      ["Company — Transactions"],["Date","Party","Note","Project","Type","Account","Amount","DR/CR","Status"],
      ...txnFiltered.map(t=>[t.date,t.party,t.sub,t.project,t.type,t.account,t.amount,t.dr?"DR":"CR",t.status]),
      [],[,"IN",tIn,,"OUT",tOut,,"NET",tIn-tOut],
    ]);
  };
  const dlTxnPDF=()=>{
    const rowsHTML=txnFiltered.map(t=>`<tr><td>${t.date}</td><td><strong>${t.party}</strong><br/><span style="font-size:10px;color:#6B7280">${t.sub}</span></td><td>${t.project}</td><td><span style="font-size:10px;padding:2px 7px;border-radius:20px;background:#F1F5F9;color:#64748B">${t.type}</span></td><td>${t.account}</td><td style="font-weight:700;color:${t.dr?"#DC2626":"#059669"}">${t.dr?"−":"+"} ₹${fmtN(t.amount)}</td><td><span style="font-size:10px;padding:1px 6px;border-radius:20px;background:${t.status==="paid"?"#ECFDF5":t.status==="unbilled"?"#F5F3FF":"#FEF2F2"};color:${t.status==="paid"?"#059669":t.status==="unbilled"?"#7C3AED":"#DC2626"}">${t.status}</span></td></tr>`).join("");
    printHTML("Transactions — Company",`<h2>Transactions — Company</h2><p>${txnFiltered.length} entries &nbsp;|&nbsp; IN: ₹${fmtN(tIn)} &nbsp;|&nbsp; OUT: ₹${fmtN(tOut)} &nbsp;|&nbsp; NET: ₹${fmtN(tIn-tOut)}</p><table><tr><th>Date</th><th>Party / Note</th><th>Project</th><th>Type</th><th>Account</th><th>Amount</th><th>Status</th></tr>${rowsHTML}</table><p class="footer">Generated by Company</p>`);
  };

  // ── Payment Requests CSV/PDF ──────────────────────────────────
  const dlPRcsv=()=>{
    downloadCSV("Payment_Requests.csv",[
      ["Company — Payment Requests"],["PR No.","Date","Party","Project","Amount","Status","Requested By"],
      ...payReqs.map(r=>[r.no,r.date,r.party,r.project,r.amount,r.status,r.by]),
    ]);
  };
  const dlPRpdf=()=>{
    const rowsHTML=payReqs.map(r=>`<tr><td><strong>${r.no}</strong></td><td>${r.date}</td><td>${r.party}</td><td>${r.project}</td><td style="font-weight:700">₹${fmtN(r.amount)}</td><td><span style="font-size:10px;padding:2px 7px;border-radius:20px;background:${r.status==="Approved"?"#ECFDF5":r.status==="Rejected"?"#FEF2F2":"#FFFBEB"};color:${r.status==="Approved"?"#059669":r.status==="Rejected"?"#DC2626":"#D97706"}">${r.status}</span></td><td>${r.by}</td></tr>`).join("");
    printHTML("Payment Requests — Company",`<h2>Payment Requests — Company</h2><p>Total ${payReqs.length} requests</p><table><tr><th>PR No.</th><th>Date</th><th>Party</th><th>Project</th><th>Amount</th><th>Status</th><th>Requested By</th></tr>${rowsHTML}</table><p class="footer">Generated by Company</p>`);
  };

  // ── Pending Payments CSV/PDF ──────────────────────────────────
  const dlPendCSV=()=>{
    downloadCSV("Pending_Payments.csv",[
      ["Company — Pending Payments"],["Ref No.","Type","Party","Project","Amount","Due Date","Overdue"],
      ...pendPmts.map(p=>[p.no,p.type==="pr"?"Approved PR":"Bill Due",p.party,p.project,p.amount,p.date,p.overdue?"YES":"NO"]),
      [],[,"","","TOTAL",pendTotal,"",""],
    ]);
  };
  const dlPendPDF=()=>{
    const rowsHTML=pendPmts.map(p=>`<tr style="${p.overdue?"background:#FEF2F2":""}"><td>${p.no}</td><td><span style="font-size:10px;padding:2px 7px;border-radius:20px;background:${p.type==="pr"?"#ECFDF5":"#FFFBEB"};color:${p.type==="pr"?"#059669":"#D97706"}">${p.type==="pr"?"Approved PR":"Bill Due"}</span></td><td><strong>${p.party}</strong></td><td>${p.project}</td><td style="font-weight:700;color:${p.overdue?"#DC2626":"#111827"}">₹${fmtN(p.amount)}</td><td style="color:${p.overdue?"#DC2626":"#374151"}">${p.date}${p.overdue?" <strong style='color:#DC2626'>OVERDUE</strong>":""}</td></tr>`).join("");
    printHTML("Pending Payments — Company",`<h2>Pending Payments — Company</h2><p>${pendPmts.length} items &nbsp;|&nbsp; Total: ₹${fmtN(pendTotal)} &nbsp;|&nbsp; Overdue: ₹${fmtN(pendOverdue)}</p><table><tr><th>Ref No.</th><th>Type</th><th>Party</th><th>Project</th><th>Amount</th><th>Due Date</th></tr>${rowsHTML}<tr><td colspan="4" style="text-align:right;font-weight:700">TOTAL</td><td style="font-weight:800;color:#2563EB">₹${fmtN(pendTotal)}</td><td></td></tr></table><p class="footer">Generated by Company</p>`);
  };

  const APPROVER_NAME=localStorage.getItem("gb_user_name")||"Admin"; // logged-in admin
  const approveReq=async(id)=>{
    const req=payReqs.find(r=>r.id===id);
    // Optimistic update — pendPmts derives from payReqs automatically
    setPayReqs(prev=>prev.map(r=>r.id===id?{...r,status:"Approved",approvedBy:APPROVER_NAME,approvedDate:new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}:r));
    try{
      await api.put(`/finance/payment-requests/${id}/approve`,{
        approved_amount:req?.amount||0,
        approved_by:APPROVER_NAME,
        status:"approved",
      });
      // Refresh from server after API success
      await Promise.allSettled([refreshPayReqs(),refreshPendPmts()]);
    }catch(e){console.error("Approve PR error:",e);}
  };
  const rejectReq=async(id)=>{
    // Optimistic update
    setPayReqs(prev=>prev.map(r=>r.id===id?{...r,status:"Rejected"}:r));
    try{
      await api.put(`/finance/payment-requests/${id}/approve`,{
        approved_amount:0,
        status:"rejected",
      });
      await refreshPayReqs();
    }catch(e){console.error("Reject PR error:",e);}
  };

  const TABS=[{id:"party",l:"Party Ledger"},{id:"transaction",l:"Fin Activity"},{id:"cashbook",l:"Cash Book"},{id:"payreq",l:`Payment Requests${pendPR>0?` (${pendPR})`:""}`},{id:"pending",l:"Pending Payments"},{id:"unbilled_grn",l:"Unbilled GRN"},{id:"billed_mat",l:"Billed Material"}];

  return(
    <div style={{background:T.bg,height:"100%",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* ── Stat Tiles ── */}
      <div style={{padding:"14px 18px 10px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {curTiles.map((s,i)=>{const TileIcon=s.Icon;return(
            <div key={i} style={{padding:"13px 15px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,borderTop:`3px solid ${s.c}`,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
              <div style={{fontSize:10,color:T.t3,fontWeight:600,letterSpacing:".5px",textTransform:"uppercase",marginBottom:5}}>{s.l}</div>
              <div style={{fontSize:22,fontWeight:700,color:T.t1,letterSpacing:"-.5px",lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:11,color:T.t4,marginTop:4}}>{s.sub}</div>
            </div>
          );})}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{margin:"8px 18px 0",flexShrink:0}}>
        <div style={{background:"#0D1B2A",borderRadius:10,padding:"0 8px",display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 10px rgba(0,0,0,0.2)"}}>
          <div style={{display:"flex",flex:1}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{padding:"11px 15px",border:"none",background:"none",fontSize:12.5,fontWeight:tab===t.id?600:400,color:tab===t.id?"white":"rgba(255,255,255,0.45)",cursor:"pointer",borderBottom:tab===t.id?"2px solid #2563EB":"2px solid transparent",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                {t.l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:6,padding:"6px 0",alignItems:"center"}}>
            {/* Manual refresh */}
            <button onClick={refreshAll} title="Refresh all data"
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 9px",borderRadius:6,
                border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.07)",
                fontSize:11,color:"rgba(255,255,255,0.7)",cursor:"pointer",fontFamily:"inherit",
                opacity:(loading.txns||loading.payreqs||loading.pendpmts)?0.5:1}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                style={{animation:(loading.txns||loading.payreqs||loading.pendpmts)?"spin 1s linear infinite":"none"}}>
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              Refresh
            </button>
            {/* Accounts dropdown */}
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowAccPanel(!showAccPanel)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:6,border:`1px solid ${showAccPanel?"rgba(96,165,250,0.6)":"rgba(255,255,255,0.2)"}`,background:showAccPanel?"rgba(96,165,250,0.15)":"rgba(255,255,255,0.08)",fontSize:11.5,fontWeight:600,color:"rgba(255,255,255,0.85)",cursor:"pointer"}}>
                <IcBank size={13} color="currentColor"/> Accounts <IcDown size={10} color="currentColor"/>
              </button>
              {showAccPanel&&(<>
                <div onClick={()=>setShowAccPanel(false)} style={{position:"fixed",inset:0,zIndex:140}}/>
                <div style={{position:"absolute",right:0,top:"calc(100% + 6px)",background:T.surface,borderRadius:10,boxShadow:"0 8px 28px rgba(0,0,0,0.18)",border:`1px solid ${T.b1}`,zIndex:150,width:320,overflow:"hidden"}}>
                  <div style={{display:"flex",borderBottom:`1px solid ${T.b1}`,background:T.surfaceB}}>
                    {[{id:"accounts",l:"Company Accounts"},{id:"wallets",l:"Staff Wallets"}].map(t=>(
                      <button key={t.id} onClick={()=>setAccTab(t.id)} style={{flex:1,padding:"9px 8px",border:"none",background:"none",color:accTab===t.id?T.blu:T.t3,fontSize:11.5,fontWeight:accTab===t.id?700:400,cursor:"pointer",borderBottom:accTab===t.id?`2px solid ${T.blu}`:"2px solid transparent"}}>{t.l}</button>
                    ))}
                  </div>
                  <div style={{padding:"8px 10px"}}>
                    {accTab==="accounts"?(
                      <>
                        {activeAccounts.map(a=>(
                          <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:7,marginBottom:3,background:T.surfaceB,border:`1px solid ${T.b1}`,borderLeft:`3px solid ${a.color}`}}>
                            <IcBank size={14} color={a.color}/>
                            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:T.t1}}>{a.name}</div><div style={{fontSize:10,color:T.t4}}>{a.no||"Cash"}</div></div>
                            <div style={{fontSize:12.5,fontWeight:700,color:a.balance<0?T.red:T.grn}}>₹{fmtN(a.balance)}</div>
                          </div>
                        ))}
                        <div style={{height:1,background:T.b1,margin:"6px 0"}}/>
                        <div style={{display:"flex",justifyContent:"space-between",padding:"5px 10px 3px"}}><span style={{fontSize:10.5,color:T.t4}}>Bank + Cash Total</span><span style={{fontSize:12,fontWeight:700,color:T.blu}}>₹{fmtN(totalBal)}</span></div>
                        <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:7,marginTop:3,background:T.grnL,border:`1px solid ${T.grnM}`,borderLeft:`3px solid ${T.grn}`}}>
                          <IcWallet size={14} color={T.grn}/>
                          <div style={{flex:1}}><div style={{fontSize:11.5,fontWeight:600,color:T.grn}}>Total Staff Wallets</div><div style={{fontSize:10,color:T.t4}}>{WALLETS.length} members</div></div>
                          <div style={{fontSize:12.5,fontWeight:700,color:T.grn}}>₹{fmtN(totalWalletBal)}</div>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",padding:"7px 10px 2px",borderTop:`1px solid ${T.b1}`,marginTop:5}}><span style={{fontSize:11,fontWeight:700,color:T.t1}}>Grand Total</span><span style={{fontSize:12.5,fontWeight:800,color:T.blu}}>₹{fmtN(totalBal+totalWalletBal)}</span></div>
                      </>
                    ):(
                      WALLETS.map(w=>{const pct=Math.round(w.balance/w.limit*100);return(
                        <div key={w.id} style={{padding:"8px 10px",borderRadius:7,marginBottom:4,background:T.surfaceB,border:`1px solid ${T.b1}`}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                            <div style={{width:26,height:26,borderRadius:"50%",background:w.color+"22",border:`1px solid ${w.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,fontWeight:700,color:w.color,flexShrink:0}}>{w.initials}</div>
                            <div style={{flex:1}}><div style={{fontSize:11.5,fontWeight:600,color:T.t1}}>{w.name}</div><div style={{fontSize:10,color:T.t4}}>{w.role}</div></div>
                            <div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:700,color:T.t1}}>₹{fmtN(w.balance)}</div><div style={{fontSize:9,color:T.t4}}>/ ₹{fmtN(w.limit)}</div></div>
                          </div>
                          <div style={{height:3,background:T.b1,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct>80?T.red:pct>50?T.amb:T.grn,borderRadius:2}}/></div>
                          <div style={{fontSize:9,color:pct>80?T.red:T.t4,marginTop:2}}>{pct}% used</div>
                        </div>
                      );})
                    )}
                  </div>
                </div>
              </>)}
            </div>
            {/* Create Transaction dropdown */}
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowCreateTxn(!showCreateTxn)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
                <IcAdd size={13} color="white"/> Create Transaction <IcDown size={10} color="white"/>
              </button>
              {showCreateTxn&&(<>
                <div onClick={()=>setShowCreateTxn(false)} style={{position:"fixed",inset:0,zIndex:140}}/>
                <div style={{position:"absolute",right:0,top:"calc(100% + 6px)",background:T.surface,borderRadius:10,boxShadow:"0 8px 28px rgba(0,0,0,0.18)",border:`1px solid ${T.b1}`,zIndex:150,width:260,overflow:"hidden"}}>
                  {[
                    {section:"Cash & Bank",items:[
                      {l:"Payment Received",sub:"Client payment in",Icon:IcRecv,c:T.grn,bg:T.grnL},
                      {l:"Payment Made",sub:"Pay vendor / labour",Icon:IcSend,c:T.red,bg:T.redL},
                      {l:"Bank Transfer",sub:"Account to account",Icon:IcBank,c:T.blu,bg:T.bluL},
                      {l:"Petty Cash Expense",sub:"Site / misc expense",Icon:IcWallet,c:T.amb,bg:T.ambL},
                    ]},
                    {section:"Billing & Purchases",items:[
                      {l:"Material Purchase Bill",sub:"Record supplier bill",Icon:IcBillDue,c:T.blu,bg:T.bluL},
                      {l:"Sales Invoice",sub:"Raise client invoice",Icon:IcFileInv,c:T.grn,bg:T.grnL},
                      {l:"Sub-Con Bill",sub:"Labour / subcon work",Icon:IcTeam,c:T.slt,bg:T.sltL},
                      {l:"Advance Payment",sub:"Advance to party",Icon:IcArrow,c:T.pur,bg:T.purL},
                    ]},
                    {section:"Adjustments",items:[
                      {l:"Journal Entry",sub:"Manual debit / credit",Icon:IcFileInv,c:T.slt,bg:T.sltL},
                      {l:"Credit Note",sub:"Party balance adjust",Icon:IcCopy,c:T.pur,bg:T.purL},
                    ]},
                  ].map((grp,gi)=>(
                    <div key={gi}>
                      <div style={{padding:"7px 12px 3px",background:T.surfaceB,borderTop:gi>0?`1px solid ${T.b1}`:"none"}}>
                        <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.7px"}}>{grp.section}</span>
                      </div>
                      {grp.items.map((item,ii)=>{const ItemIcon=item.Icon;return(
                        <button key={ii}
                          onClick={()=>{setShowCreateTxn(false);openTxn(item.l);}}
                          style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"7px 12px",border:"none",background:"none",cursor:"pointer",textAlign:"left"}}
                          onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                          onMouseLeave={e=>e.currentTarget.style.background="none"}>
                          <div style={{width:28,height:28,borderRadius:7,background:item.bg,border:`1px solid ${item.c}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <ItemIcon size={13} color={item.c}/>
                          </div>
                          <div><div style={{fontSize:12,fontWeight:600,color:T.t1}}>{item.l}</div><div style={{fontSize:10,color:T.t4}}>{item.sub}</div></div>
                        </button>
                      );})}
                    </div>
                  ))}
                </div>
              </>)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {(()=>{
        const FILTER_CONFIGS={
          party:{
            chips:["All","Client","Vendor","Labour","Sub-Con","Material Supplier"],
            active:chipParty, set:setChipParty,
            colors:{"Client":{c:T.grn,bg:T.grnL},"Vendor":{c:T.amb,bg:T.ambL},"Labour":{c:T.blu,bg:T.bluL},"Sub-Con":{c:T.slt,bg:T.sltL},"Material Supplier":{c:T.pur,bg:T.purL}},
          },
          transaction:{
            chips:["All","Payment In","Payment Out","Material","Site Expense","Sub-Con","Party Payment","Wallet Payment","Wallet Top-up","Unpaid"],
            active:chipTxn, set:setChipTxn,
            colors:{"Payment In":{c:T.grn,bg:T.grnL},"Payment Out":{c:T.red,bg:T.redL},"Material":{c:T.blu,bg:T.bluL},"Site Expense":{c:T.amb,bg:T.ambL},"Sub-Con":{c:T.slt,bg:T.sltL},"Party Payment":{c:T.pur,bg:T.purL},"Wallet Payment":{c:"#00695C",bg:"#E0F2F1"},"Wallet Top-up":{c:"#1565C0",bg:"#E3F2FD"},"Unpaid":{c:T.red,bg:T.redL}},
          },
          cashbook:{
            chips:["All","Receipts","Payments"],
            active:chipCB, set:setChipCB,
            colors:{"Receipts":{c:T.grn,bg:T.grnL},"Payments":{c:T.red,bg:T.redL}},
          },
          payreq:{
            chips:["All","Pending","Approved","Rejected"],
            active:chipPR, set:setChipPR,
            colors:{"Pending":{c:T.amb,bg:T.ambL},"Approved":{c:T.grn,bg:T.grnL},"Rejected":{c:T.red,bg:T.redL}},
          },
          pending:{
            chips:["All","Overdue","Due in 7d","Due in 15d","Due in 30d"],
            active:chipPend, set:setChipPend,
            colors:{"Overdue":{c:T.red,bg:T.redL},"Due in 7d":{c:T.red,bg:T.redL},"Due in 15d":{c:T.amb,bg:T.ambL},"Due in 30d":{c:T.grn,bg:T.grnL}},
          },
        };
        const cfg=FILTER_CONFIGS[tab];
        if(!cfg) return null;
        return(
          <div style={{margin:"0 18px 8px",padding:"7px 12px",background:T.surface,borderRadius:"0 0 8px 8px",border:`1px solid ${T.b1}`,borderTop:"none",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",flexShrink:0}}>
            <span style={{fontSize:10.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.6px",marginRight:4}}>Filter</span>
            {cfg.chips.map(chip=>{
              const isActive=cfg.active===chip;
              const col=cfg.colors[chip]||{c:T.slt,bg:T.sltL};
              return(
                <button key={chip} onClick={()=>{cfg.set(chip);}}
                  style={{
                    padding:"4px 12px",borderRadius:20,border:`1.5px solid ${isActive?col.c:T.b1}`,
                    background:isActive?col.bg:T.surfaceB,
                    color:isActive?col.c:T.t3,
                    fontSize:11.5,fontWeight:isActive?700:500,cursor:"pointer",
                    transition:"all 0.15s",fontFamily:"inherit",
                    boxShadow:isActive?`0 1px 4px ${col.c}33`:"none",
                  }}
                  onMouseEnter={e=>{if(!isActive){e.currentTarget.style.borderColor=col.c;e.currentTarget.style.color=col.c;e.currentTarget.style.background=col.bg+"88";}}}
                  onMouseLeave={e=>{if(!isActive){e.currentTarget.style.borderColor=T.b1;e.currentTarget.style.color=T.t3;e.currentTarget.style.background=T.surfaceB;}}}>
                  {chip}
                  {/* count badges */}
                  {tab==="transaction"&&chip==="Unpaid"&&(<span style={{marginLeft:5,background:T.red,color:"white",fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:10}}>{activeTxns.filter(t=>t.status!=="paid").length}</span>)}
                  {tab==="payreq"&&chip==="Pending"&&pendPR>0&&(<span style={{marginLeft:5,background:T.amb,color:"white",fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:10}}>{pendPR}</span>)}
                  {tab==="pending"&&chip==="Overdue"&&(<span style={{marginLeft:5,background:T.red,color:"white",fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:10}}>{pendPmts.filter(p=>p.overdue).length}</span>)}
                </button>
              );
            })}
            {cfg.active!=="All"&&(
              <button onClick={()=>cfg.set("All")}
                style={{marginLeft:"auto",padding:"3px 9px",borderRadius:20,border:`1px solid ${T.b1}`,background:"none",color:T.t4,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontFamily:"inherit"}}
                onMouseEnter={e=>e.currentTarget.style.color=T.red}
                onMouseLeave={e=>e.currentTarget.style.color=T.t4}>
                <IcX size={10} color="currentColor"/> Clear
              </button>
            )}
          </div>
        );
      })()}

      {/* ── Tab Content ── */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",padding:"12px 18px 14px",position:"relative"}}>
        {/* Loading overlay */}
        {(loading.txns||loading.payreqs||loading.pendpmts||loading.parties)&&(
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,zIndex:50,overflow:"hidden",borderRadius:2}}>
            <div style={{height:"100%",background:`linear-gradient(90deg,${T.blu},${T.grn},${T.blu})`,backgroundSize:"200% 100%",animation:"shimmer 1.2s infinite linear"}}/>
          </div>
        )}

        {/* PARTY LEDGER TAB */}
        {tab==="party"&&(
          <div style={{display:"flex",gap:12,flex:1,overflow:"hidden"}}>
            <div style={{width:selParty?290:420,flexShrink:0,display:"flex",flexDirection:"column",overflow:"hidden",transition:"width 0.2s",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
              <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                <span style={{fontSize:12,fontWeight:700,color:T.t1,flex:1}}>Parties</span>
                <div style={{position:"relative",flex:1}}>
                  <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                  <input value={partySearch} onChange={e=>setPartySearch(e.target.value)} placeholder="Search..."
                    style={{width:"100%",height:28,padding:"0 8px 0 26px",borderRadius:6,border:`1.5px solid ${partySearch?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:partySearch?T.bluL:T.surfaceB}}/>
                </div>
                <button onClick={()=>setShowAddParty(true)} style={{height:28,padding:"0 10px",borderRadius:6,background:T.blu,color:"white",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
                  <IcAdd size={12} color="white"/> Party
                </button>
              </div>
              <div style={{flex:1,overflowY:"auto"}}>
                {filteredParties.filter(p=>!partySearch||p.name.toLowerCase().includes(partySearch.toLowerCase())).map(p=>{
                  const isS=selParty?.id===p.id;
                  const tc=p.type==="Client"?T.grn:p.type==="Material Supplier"?T.blu:p.type==="Sub-Con"?T.slt:T.amb;
                  return(
                    <div key={p.id} onClick={async()=>{
                      setSelParty(p);setSelBill(null);
                      try{
                        const res=await api.get(`/finance/parties/${p.id}/ledger`);
                        if(res.success&&res.data){
                          const BACK_DEBIT_L=["payment","material_purchase","site_expense",
                            "party_payment","subcon_expense","wallet_payment","wallet_topup"];
                          setApiLedger(prev=>({...prev,[p.id]:res.data.map(t=>({
                            id:t.id,
                            date:t.date?new Date(t.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"",
                            note:t.note||t.narration||"",         // actual note field
                            sub:t.description||"",                // full description
                            project:t.project_name||t.project||"",// site/project
                            amount:parseFloat(t.amount)||0,
                            dr:BACK_DEBIT_L.includes(t.type)||t.dr===true,
                            status:t.status||"approved",
                            txnType:t.type||"",
                            items:t.line_items||null,
                          }))}));
                        }
                      }catch(e){console.log("Ledger fetch error");}
                    }}
                      style={{padding:"10px 13px",cursor:"pointer",borderBottom:`1px solid ${T.b1}`,background:isS?T.bluL:"none",borderLeft:isS?`3px solid ${T.blu}`:"3px solid transparent",transition:"all 0.12s"}}
                      onMouseEnter={e=>{if(!isS)e.currentTarget.style.background=T.surfaceB;}}
                      onMouseLeave={e=>{if(!isS)e.currentTarget.style.background="none";}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                        <div style={{fontSize:12.5,fontWeight:600,color:isS?T.blu:T.t1}}>{p.name}</div>
                        <div style={{fontSize:12.5,fontWeight:700,color:["To Pay","Advance Received"].includes(p.balType)?T.red:T.grn}}>₹{fmt(p.balance)}</div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{background:tc+"18",color:tc,fontSize:9.5,fontWeight:600,padding:"1px 7px",borderRadius:20,border:`1px solid ${tc}22`}}>{p.type}</span>
                        <span style={{fontSize:10,color:T.t4}}>{p.balType}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {selParty&&(()=>{
              const ledgerRows=getLedgerRows(selParty);
              const totalCR=ledgerRows.reduce((s,r)=>s+(!r.dr?r.amount:0),0);
              const totalDR=ledgerRows.reduce((s,r)=>s+(r.dr?r.amount:0),0);
              // Compute balance from ledger rows (more accurate than opening_balance)
              const ledgerClosing=totalCR-totalDR; // positive = we owe them (vendor) or they owe us (client)
              const isVendorPty=["Material Supplier","Sub-Con","Labour","Other Vendor","contractor"].includes(selParty.type);
              const computedBalType=isVendorPty
                ?(ledgerClosing>0?"To Pay":"Advance Paid")
                :(ledgerClosing>0?"To Receive":"Advance Received");
              const computedBal=Math.abs(ledgerClosing);
              return(
                <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
                  <div style={{padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:T.t1}}>{selParty.name}</div><div style={{fontSize:10.5,color:T.t4}}>{selParty.type}</div></div>
                    <span style={{background:ledgerClosing>0?T.ambL:T.grnL,color:ledgerClosing>0?T.amb:T.grn,fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20,border:`1px solid ${ledgerClosing>0?T.ambM:T.grnM}`}}>₹{fmtN(computedBal)} · {computedBalType}</span>
                    <span style={{background:T.grnL,color:T.grn,fontSize:10,fontWeight:600,padding:"2px 9px",borderRadius:20,border:`1px solid ${T.grnM}`}}>CR ₹{fmtN(totalCR)}</span>
                    <span style={{background:T.redL,color:T.red,fontSize:10,fontWeight:600,padding:"2px 9px",borderRadius:20,border:`1px solid ${T.redM}`}}>DR ₹{fmtN(totalDR)}</span>
                    <button onClick={()=>downloadLedgerCSV(selParty)} style={{height:27,padding:"0 9px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}>CSV</button>
                    <button onClick={()=>downloadLedgerPDF(selParty)} style={{height:27,padding:"0 9px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:600,cursor:"pointer"}}>PDF</button>
                    <button onClick={()=>setSelParty(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,display:"flex",padding:3}}><IcX size={15}/></button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"72px 110px 100px 1fr 100px 110px 110px 70px",padding:"6px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,flexShrink:0,gap:4}}>
                    {["Date","Type","Site","Note","Received (CR)","Payment (DR)","Balance","Status"].map((h,i)=>(
                      <span key={i} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.3px",textAlign:i>=4?"right":"left",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h}</span>
                    ))}
                  </div>
                  <div style={{flex:1,overflowY:"auto"}}>
                    {ledgerRows.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No transactions recorded</div>}
                    {ledgerRows.map(txn=>(
                      <div key={txn.id}>
                        {(()=>{
                          const isBillType=["material_purchase","site_expense","subcon_expense","Material Purchase","Site Expense","Sub-Con Expense"].includes(txn.txnType||txn.type||"");
                          const isExpanded=selBill===txn.id;
                          const hasItems=txn.items&&txn.items.length>0;
                          return(<>
                          {/* Type label from txnType */}
                          {(()=>{
                            const TYPE_LABELS={"material_purchase":"Material Purchase","payment":"Payment Made","party_payment":"Payment Made","receipt":"Payment Received","subcon_expense":"Sub-Con Bill","site_expense":"Site Expense","sales_invoice":"Sales Invoice","bank_transfer":"Bank Transfer","advance_payment":"Advance","petty_cash":"Petty Cash"};
                            const typeLabel=TYPE_LABELS[txn.txnType]||txn.type||txn.txnType||"Transaction";
                            const siteLabel=txn.project||txn.project_name||"";
                            // note = user's remark, sub/description = auto-generated full text
                            const noteLabel=txn.note&&txn.note.trim()&&txn.note!==txn.sub?txn.note.trim():(txn.sub||"");
                            return(
                          <div onClick={()=>setSelTxn(txn)}
                            style={{display:"grid",gridTemplateColumns:"72px 110px 100px 1fr 100px 110px 110px 70px",padding:"8px 14px",gap:4,borderBottom:isExpanded?`1px solid ${T.bluM}`:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",background:isExpanded?T.bluL+"44":"none",transition:"background 0.1s"}}
                            onMouseEnter={e=>{if(!isExpanded)e.currentTarget.style.background=T.surfaceB;}}
                            onMouseLeave={e=>{if(!isExpanded)e.currentTarget.style.background="none";}}>
                            {/* 1. Date */}
                            <span style={{fontSize:11,color:T.t4,fontWeight:500,whiteSpace:"nowrap"}}>{txn.date}</span>
                            {/* 2. Type */}
                            <div style={{display:"flex",flexDirection:"column",gap:2}}>
                              <span style={{fontSize:11.5,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{typeLabel}</span>
                              {isBillType&&<span onClick={e=>{e.stopPropagation();setSelBill(isExpanded?null:txn.id);}} style={{fontSize:9,color:T.blu,fontWeight:600,cursor:"pointer"}}>{isExpanded?"▲ hide":"▼ view bill"}{hasItems?` (${txn.items.length})`:""}</span>}
                            </div>
                            {/* 3. Site/Project */}
                            <span style={{fontSize:11,color:T.t3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{siteLabel}</span>
                            {/* 4. Note */}
                            <span style={{fontSize:11,color:T.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{noteLabel||"—"}</span>
                            {/* 5. Received CR */}
                            <span style={{fontSize:12.5,fontWeight:700,color:T.grn,textAlign:"right"}}>{!txn.dr?`₹${fmtN(txn.amount)}`:""}</span>
                            {/* 6. Payment DR */}
                            <span style={{fontSize:12.5,fontWeight:700,color:T.red,textAlign:"right"}}>{txn.dr?`₹${fmtN(txn.amount)}`:""}</span>
                            {/* 7. Balance */}
                            <span style={{fontSize:12,fontWeight:700,color:txn.runBal>=0?T.grn:T.red,textAlign:"right",whiteSpace:"nowrap"}}>₹{fmtN(Math.abs(txn.runBal))} <span style={{fontSize:9}}>{txn.runBal>=0?"CR":"DR"}</span></span>
                            {/* 8. Status */}
                            <div style={{display:"flex",justifyContent:"center"}}>
                              {txn.status&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:10,background:txn.status==="paid"?T.grnL:txn.status==="approved"?T.bluL:T.ambL,color:txn.status==="paid"?T.grn:txn.status==="approved"?T.blu:T.amb,border:`1px solid ${txn.status==="paid"?T.grnM:txn.status==="approved"?T.bluM:T.ambM}`,whiteSpace:"nowrap"}}>{txn.status}</span>}
                            </div>
                          </div>
                            );
                          })()}
                          {isExpanded&&(
                            <div style={{background:T.bluL,borderBottom:`1px solid ${T.bluM}`,padding:"10px 14px"}}>
                              {/* Bill header */}
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                                <div>
                                  <div style={{fontSize:12,fontWeight:700,color:T.t1}}>{txn.note}</div>
                                  <div style={{fontSize:10.5,color:T.t3}}>{selParty.name} · {txn.date} · {txn.status}</div>
                                </div>
                                <div style={{display:"flex",gap:6}}>
                                  <button onClick={()=>{
                                    const lines=hasItems?txn.items.map(it=>`<tr><td>${it.name||it.item||""}</td><td style="text-align:center">${it.qty||""} ${it.unit||""}</td><td style="text-align:right">₹${fmtN(it.rate||it.amt/it.qty||0)}</td><td style="text-align:right;font-weight:700">₹${fmtN(it.amt||it.amount||0)}</td></tr>`).join(""):`<tr><td colspan="4" style="text-align:center;color:#6B7280">No line items recorded</td></tr>`;
                                    printHTML(`Bill — ${selParty.name}`,`<h2>Purchase Bill</h2><p><strong>Supplier:</strong> ${selParty.name} &nbsp;|&nbsp; <strong>Date:</strong> ${txn.date} &nbsp;|&nbsp; <strong>Status:</strong> ${txn.status}</p><p>${txn.note}</p><table><tr><th>Item</th><th style="text-align:center">Qty / Unit</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr>${lines}<tr><td colspan="3" style="text-align:right;font-weight:700;border-top:2px solid #E5E7EB">TOTAL</td><td style="text-align:right;font-weight:800;color:#2563EB">₹${fmtN(txn.amount)}</td></tr></table><p class="footer">Generated by Company · ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</p>`);
                                  }} style={{padding:"4px 10px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                                    Print Bill
                                  </button>
                                  {txn.status!=="paid"&&<button onClick={()=>openTxn("Payment Made",selParty.name)} style={{padding:"4px 10px",borderRadius:6,background:T.blu,color:"white",border:"none",cursor:"pointer",fontSize:10.5,fontWeight:700}}>Pay Now</button>}
                                </div>
                              </div>
                              {/* Line items table */}
                              {hasItems?(
                                <>
                                  <div style={{display:"grid",gridTemplateColumns:"1fr 90px 80px 90px 90px",gap:4,padding:"5px 0",borderBottom:`1px solid ${T.bluM}`}}>
                                    {["Item","Qty / Unit","Rate","Amount","Head"].map((h,i)=><span key={i} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:i>=2?"right":"left"}}>{h}</span>)}
                                  </div>
                                  {txn.items.map((it,ii)=>(
                                    <div key={ii} style={{display:"grid",gridTemplateColumns:"1fr 90px 80px 90px 90px",gap:4,padding:"5px 0",borderBottom:`1px solid ${T.bluM}44`}}>
                                      <span style={{fontSize:12,fontWeight:500,color:T.t1}}>{it.name||it.item||it.item_name||"—"}</span>
                                      <span style={{fontSize:11.5,color:T.t3,textAlign:"right"}}>{it.qty||"—"} {it.unit||""}</span>
                                      <span style={{fontSize:11.5,color:T.t3,textAlign:"right"}}>{it.rate?`₹${fmtN(it.rate)}`:"—"}</span>
                                      <span style={{fontSize:12,fontWeight:600,color:T.t1,textAlign:"right"}}>₹{fmtN(it.amt||it.amount||0)}</span>
                                      <span style={{fontSize:10.5,color:T.t4,textAlign:"right"}}>{it.head||"—"}</span>
                                    </div>
                                  ))}
                                  <div style={{display:"flex",justifyContent:"flex-end",padding:"6px 0",borderTop:`1px solid ${T.bluM}`}}>
                                    <span style={{fontSize:12.5,fontWeight:800,color:T.blu}}>Total: ₹{fmtN(txn.amount)}</span>
                                  </div>
                                </>
                              ):(
                                <div style={{textAlign:"center",padding:"12px",fontSize:11.5,color:T.t4}}>
                                  Line items not recorded for this bill
                                </div>
                              )}
                            </div>
                          )}
                          </>);
                        })()}
                      </div>
                    ))}
                  </div>
                  {ledgerRows.length>0&&(
                    <div style={{display:"grid",gridTemplateColumns:"72px 110px 100px 1fr 100px 110px 110px 70px",padding:"8px 14px",gap:4,background:T.surfaceB,borderTop:`2px solid ${T.b2}`,flexShrink:0}}>
                      <span style={{fontSize:11,fontWeight:700,color:T.t1,gridColumn:"1/5"}}>TOTAL</span>
                      <span style={{textAlign:"right",fontSize:12,fontWeight:800,color:T.grn}}>₹{fmtN(totalCR)}</span>
                      <span style={{textAlign:"right",fontSize:12,fontWeight:800,color:T.red}}>₹{fmtN(totalDR)}</span>
                      <span style={{textAlign:"right",fontSize:12,fontWeight:800,color:ledgerClosing>0?T.amb:T.grn}}>₹{fmtN(computedBal)} <span style={{fontSize:10}}>{computedBalType}</span></span>
                      <span/>
                    </div>
                  )}
                  {/* ── Integrated action buttons ── */}
                  <div style={{padding:"9px 14px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:7,flexShrink:0,background:T.surfaceB}}>
                    <button onClick={()=>openTxn("Payment Received",selParty.name)}
                      style={{flex:1,padding:"7px",borderRadius:6,background:T.grnL,color:T.grn,border:`1px solid ${T.grnM}`,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      <IcRecv size={13} color={T.grn}/> + Payment Received
                    </button>
                    <button onClick={()=>openTxn("Payment Made",selParty.name)}
                      style={{flex:1,padding:"7px",borderRadius:6,background:T.redL,color:T.red,border:`1px solid ${T.redM}`,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      <IcSend size={13} color={T.red}/> + Payment Made
                    </button>
                    <button onClick={()=>openTxn(selParty.type==="Material Supplier"||selParty.type==="Other Vendor"?"Material Purchase Bill":selParty.type==="Sub-Con"||selParty.type==="Labour Contractor"?"Sub-Con Bill":"Sales Invoice",selParty.name)}
                      style={{flex:1,padding:"7px",borderRadius:6,background:T.bluL,color:T.blu,border:`1px solid ${T.bluM}`,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      <IcBillDue size={13} color={T.blu}/> + New Bill
                    </button>
                  </div>
                </div>
              );
            })()}
            {!selParty&&<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><IcFileInv size={36} color={T.b2}/><div style={{fontSize:13,fontWeight:600,color:T.t3,marginTop:10}}>Select a party to view ledger</div></div></div>}
          </div>
        )}

        {/* CASH BOOK TAB */}
        {tab==="transaction"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            {/* Toolbar — tight against filter bar */}
            <div style={{background:T.surface,borderRadius:8,padding:"6px 10px",marginBottom:6,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
              <div style={{position:"relative",flex:1,minWidth:160}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input value={txnSearch} onChange={e=>setTxnSearch(e.target.value)} placeholder="Search narration or party..."
                  style={{width:"100%",height:31,padding:"0 8px 0 27px",borderRadius:7,border:`1.5px solid ${txnSearch?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:txnSearch?T.bluL:T.surface}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <IcCalDue size={13} color={T.t4}/>
                <input type="date" style={{height:31,padding:"0 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,color:T.t2,background:T.surface,outline:"none",fontFamily:"inherit"}}/>
                <span style={{fontSize:11,color:T.t4}}>to</span>
                <input type="date" style={{height:31,padding:"0 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,color:T.t2,background:T.surface,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <button onClick={()=>setShowUB(true)} style={{display:"flex",alignItems:"center",gap:5,height:31,padding:"0 11px",borderRadius:6,background:T.purL,border:`1px solid ${T.pur}22`,color:T.pur,fontSize:11.5,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                <IcUB size={13} color={T.pur}/> Unbilled
                <span style={{background:T.pur,color:"white",fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:10}}>{UNBILLED_PARTIES.length}</span>
              </button>
              <button onClick={dlTxnCSV} style={{height:31,padding:"0 10px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>Excel</button>
              <button onClick={dlTxnPDF} style={{height:31,padding:"0 10px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>PDF</button>

            </div>



            {/* Transactions Table — new 7-col layout */}
            <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
              {/* Sticky header */}
              <div style={{display:"grid",gridTemplateColumns:"72px 130px 140px 100px 2fr 120px 70px",padding:"7px 14px",background:T.surfaceB,borderBottom:`2px solid ${T.b1}`,flexShrink:0,gap:6}}>
                {["Date","Type","Party","Site","Note","Amount","Status"].map((h,i)=>(
                  <span key={i} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.3px",textAlign:i===5?"right":"left"}}>{h}</span>
                ))}
              </div>
              {/* Scrollable body */}
              <div style={{flex:1,overflowY:"auto"}}>
              {(()=>{
                // Type labels + color coding
                const TYPE_META={
                  "Payment In":    {label:"Payment In",     color:T.grn,  bg:T.grnL,  dir:"in"},
                  "Payment Out":   {label:"Payment Out",    color:T.red,  bg:T.redL,  dir:"out"},
                  "Material Purchase":{label:"Material Purchase",color:T.red,bg:T.redL,dir:"out"},
                  "Site Expense":  {label:"Site Expense",   color:T.red,  bg:T.redL,  dir:"out"},
                  "Party Payment": {label:"Party Payment",  color:T.red,  bg:T.redL,  dir:"out"},
                  "Sub-Con Expense":{label:"Sub-Con",       color:T.red,  bg:T.redL,  dir:"out"},
                  "Sales Invoice": {label:"Sales Invoice",  color:T.grn,  bg:T.grnL,  dir:"in"},
                  "Bank Transfer": {label:"Bank Transfer",  color:T.t3,   bg:T.b1,    dir:"transfer"},
                  "Wallet Payment":{label:"Wallet Out",     color:T.red,  bg:T.redL,  dir:"out"},
                  "Wallet Top-up": {label:"Wallet Top-up",  color:T.slt,  bg:T.sltL,  dir:"internal"},
                  "Material Return":{label:"Material Return",color:T.grn, bg:T.grnL,  dir:"in"},
                };
                const sorted=[...txnFiltered].sort((a,b)=>b.ds-a.ds);
                return sorted.map((txn,i)=>{
                  const meta=TYPE_META[txn.type]||{label:txn.type||"Transaction",color:T.t3,bg:T.b1,dir:txn.dr?"out":"in"};
                  // Bank Transfer: source account = DR (red), to_account = CR (green)
                  const isBTrow=meta.dir==="transfer";
                  const btIsSource=isBTrow&&!txn.to_account_name; // source leg has no to_account
                  const btIsDest=isBTrow&&!!txn.to_account_name;   // dest leg has to_account
                  const amtColor=meta.dir==="in"?T.grn:meta.dir==="out"?T.red:
                    isBTrow?(txn.dr?T.red:T.grn):T.t2;
                  const amtPrefix=meta.dir==="in"?"+":meta.dir==="out"?"-":
                    isBTrow?(txn.dr?"-":"+"):"";
                  // Note: show ONLY user-typed note, never auto-generated description
                  // Extract note: prefer txn.note field; fallback: parse from description (last segment after " — ")
                  const _rawNote=txn.note&&txn.note.trim()?txn.note.trim():"";
                  const _descParts=(txn.sub||"").split(" — ");
                  const _descNote=_descParts.length>=4?_descParts[_descParts.length-1].trim():"";
                  const noteText=_rawNote||_descNote||"";

                  // Bank Transfer party: show "From → To" accounts
                  const isBT=txn.txnType==="bank_transfer"||txn.type==="Bank Transfer";
                  const partyLabel=isBT
                    ?(txn.account?(txn.account+(txn.to_account_name?" → "+txn.to_account_name:"")):"Internal Transfer")
                    :(txn.party||"—");
                  return(
                    <div key={txn.id||i}
                      onClick={()=>setSelTxn(txn)}
                      style={{display:"grid",gridTemplateColumns:"72px 130px 140px 100px 2fr 120px 70px",padding:"9px 14px",gap:6,borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:i%2===0?T.surface:"#FAFBFD",transition:"background 0.1s",cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.bluL+"66"}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface:"#FAFBFD"}>
                      {/* 1. Date */}
                      <span style={{fontSize:11.5,color:T.t3,fontWeight:500,whiteSpace:"nowrap"}}>{txn.date}</span>
                      {/* 2. Type */}
                      <span style={{fontSize:11,fontWeight:700,color:meta.color,background:meta.bg,padding:"2px 8px",borderRadius:20,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"inline-block",maxWidth:"100%"}}>{meta.label}</span>
                      {/* 3. Party */}
                      <span style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{partyLabel}</span>
                      {/* 4. Site */}
                      <span style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{isBT?"—":(txn.project||"—")}</span>
                      {/* 5. Note */}
                      <span style={{fontSize:11.5,color:T.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{noteText||"—"}</span>
                      {/* 6. Amount — color coded */}
                      <span style={{fontSize:13,fontWeight:800,color:amtColor,textAlign:"right",whiteSpace:"nowrap"}}>{amtPrefix}₹{fmtN(txn.amount)}</span>
                      {/* 7. Status */}
                      <div style={{display:"flex",justifyContent:"center"}}>
                        <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:10,background:txn.status==="paid"?T.grnL:txn.status==="approved"?T.bluL:T.ambL,color:txn.status==="paid"?T.grn:txn.status==="approved"?T.blu:T.amb,whiteSpace:"nowrap"}}>{txn.status||"—"}</span>
                      </div>
                    </div>
                  );
                });
              })()}
              {txnFiltered.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No entries found</div>}
              </div>
              {/* Footer totals */}
              {txnFiltered.length>0&&(()=>{const cl=totalBal+tIn-tOut;return(
                <div style={{display:"grid",gridTemplateColumns:"72px 130px 140px 100px 2fr 120px 70px",padding:"9px 14px",gap:6,background:T.surfaceB,borderTop:`2px solid ${T.b2}`,flexShrink:0}}>
                  <span style={{gridColumn:"1/6",fontSize:12,fontWeight:700,color:T.t1}}>TOTAL — {txnFiltered.length} entries</span>
                  <span style={{fontSize:13,fontWeight:800,color:cl>=0?T.grn:T.red,textAlign:"right"}}>₹{fmtN(tIn-tOut)}</span>
                  <span style={{fontSize:13,fontWeight:800,color:cl>=0?T.blu:T.red,textAlign:"right"}}>₹{fmtN(Math.abs(cl))}</span>
                </div>
              );})()}
            </div>
          </div>
        )}
        {/* CASH BOOK TAB */}
        {tab==="cashbook"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            {/* Toolbar */}
            <div style={{background:T.surface,borderRadius:8,padding:"8px 14px",marginBottom:10,border:`1px solid ${T.b1}`,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
              <div style={{position:"relative",flex:1,minWidth:160}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input placeholder="Search narration or party..." style={{width:"100%",height:31,padding:"0 8px 0 27px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <IcCalDue size={13} color={T.t4}/>
                <input type="date" style={{height:31,padding:"0 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,color:T.t2,background:T.surface,outline:"none",fontFamily:"inherit"}}/>
                <span style={{fontSize:11,color:T.t4}}>to</span>
                <input type="date" style={{height:31,padding:"0 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,color:T.t2,background:T.surface,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <button onClick={()=>openTxn("Payment In")} style={{height:31,padding:"0 12px",borderRadius:6,background:T.grnL,color:T.grn,border:`1px solid ${T.grnM}`,cursor:"pointer",fontSize:11.5,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                <IcRecv size={13} color={T.grn}/> Receipt
              </button>
              <button onClick={()=>openTxn("Payment Made")} style={{height:31,padding:"0 12px",borderRadius:6,background:T.redL,color:T.red,border:`1px solid ${T.redM}`,cursor:"pointer",fontSize:11.5,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                <IcSend size={13} color={T.red}/> Payment
              </button>
              <button onClick={()=>{
                const rows=[["#","Date","Voucher","Narration","Party","Receipt(Dr)","Payment(Cr)","Balance"]];
                const sorted=[...cbTxns].sort((a,b)=>a.ds-b.ds);
                let rb=totalBal;
                sorted.forEach((t,i)=>{rb+=t.dr?-t.amount:t.amount;rows.push([i+1,t.date,`CB-${String(t.id).padStart(3,"0")}`,t.sub||t.type,t.party,!t.dr?t.amount:"",t.dr?t.amount:"",rb]);});
                downloadCSV("CashBook.csv",rows);
              }} style={{height:31,padding:"0 10px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>Excel</button>
            </div>

            {/* Table — Books of Account format: Date|Type|Party|Site|Note|Received|Payment|Balance|Status */}
            <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
              {/* Sticky header */}
              <div style={{display:"grid",gridTemplateColumns:"70px 115px 125px 100px 1fr 95px 95px 95px 90px 70px 90px",padding:"7px 14px",background:T.surfaceB,borderBottom:`2px solid ${T.b1}`,flexShrink:0,gap:4}}>
                {["Date","Type","Party","Site","Note","Received (CR)","Payment (DR)","Balance","Account","MOP","Entry By"].map((h,i)=>(
                  <span key={i} style={{fontSize:9,fontWeight:700,color:i===5?T.grn:i===6?T.red:T.t4,textTransform:"uppercase",letterSpacing:"0.3px",textAlign:i>=5&&i<=7?"right":"left",whiteSpace:"nowrap"}}>{h}</span>
                ))}
              </div>
              {/* Scrollable body — ALL transactions including internal */}
              <div style={{flex:1,overflowY:"auto"}}>
              {(()=>{
                const CB_TYPE_META={
                  "Payment In":     {label:"Payment In",      color:T.grn, bg:T.grnL, dir:"in"},
                  "Payment Out":    {label:"Payment Out",     color:T.red, bg:T.redL, dir:"out"},
                  "Material Purchase":{label:"Material Purchase",color:T.red,bg:T.redL,dir:"out"},
                  "Site Expense":   {label:"Site Expense",    color:T.red, bg:T.redL, dir:"out"},
                  "Party Payment":  {label:"Party Payment",   color:T.red, bg:T.redL, dir:"out"},
                  "Sub-Con Expense":{label:"Sub-Con",         color:T.red, bg:T.redL, dir:"out"},
                  "Sales Invoice":  {label:"Sales Invoice",   color:T.grn, bg:T.grnL, dir:"in"},
                  "Bank Transfer":  {label:"Bank Transfer",   color:T.t3,  bg:T.b1,   dir:"transfer"},
                  "Wallet Payment": {label:"Wallet Out",      color:T.red, bg:T.redL, dir:"out"},
                  "Wallet Top-up":  {label:"Wallet Top-up",   color:T.slt, bg:T.sltL, dir:"internal"},
                  "Material Return":{label:"Material Return", color:T.grn, bg:T.grnL, dir:"in"},
                };
                // Cash book table uses the same whitelist as the tiles
                // (isCashEvent above) — keeps tiles + table in sync.
                let runBal=totalBal;
                const cbAll=[...activeTxns].filter(t=>{
                  if (!isCashEvent(t)) return false;
                  if(chipCB==="Receipts") return !t.dr;
                  if(chipCB==="Payments") return t.dr;
                  return true;
                }).sort((a,b)=>{
                  const {col,dir}=sortCB; const mul=dir==="asc"?1:-1;
                  if(col==="party2") return ((a.party||"")>(b.party||"")? 1:-1)*mul;
                  if(col==="project3") return ((a.project||"")>(b.project||"")? 1:-1)*mul;
                  if(col==="account8") return ((a.account||"")>(b.account||"")? 1:-1)*mul;
                  if(col==="mop9") return ((a.mop||"")>(b.mop||"")? 1:-1)*mul;
                  if(col==="entryBy10") return ((a.entryBy||"")>(b.entryBy||"")? 1:-1)*mul;
                  // default: date asc for running balance
                  return (a.ds-b.ds)*(sortCB.col==="date0"?mul:1);
                });
                return cbAll.map((txn,i)=>{
                  const meta=CB_TYPE_META[txn.type]||{label:txn.type||"Transaction",color:T.t3,bg:T.b1,dir:txn.dr?"out":"in"};
                  const isBT=txn.txnType==="bank_transfer"||txn.type==="Bank Transfer";
                  // Extract note: prefer txn.note field; fallback: parse from description (last segment after " — ")
                  const _rawNote=txn.note&&txn.note.trim()?txn.note.trim():"";
                  const _descParts=(txn.sub||"").split(" — ");
                  const _descNote=_descParts.length>=4?_descParts[_descParts.length-1].trim():"";
                  const noteText=_rawNote||_descNote||"";

                  const partyLabel=isBT
                    ?(txn.account?(txn.account+(txn.to_account_name?" → "+txn.to_account_name:"")):"Internal Transfer")
                    :(txn.party||"—");
                  // Bank Transfer: source = DR (payment out), internal = neutral
                  // For cash book running balance: BT debits source account
                  const isCR=isBT?false:!txn.dr;
                  const isInternal=isBT&&!txn.to_account_name; // BT with no destination = just show neutral
                  if(!isInternal){if(isCR) runBal+=txn.amount; else runBal-=txn.amount;}
                  return(
                    <div key={txn.id||i}
                      style={{display:"grid",gridTemplateColumns:"70px 115px 125px 100px 1fr 95px 95px 95px 90px 70px 90px",padding:"8px 14px",gap:4,borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:i%2===0?T.surface:"#FAFBFD",transition:"background 0.1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.bluL+"66"}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface:"#FAFBFD"}>
                      <span style={{fontSize:11.5,color:T.t3,fontWeight:500,whiteSpace:"nowrap"}}>{txn.date}</span>
                      <span style={{fontSize:10.5,fontWeight:700,color:meta.color,background:meta.bg,padding:"2px 7px",borderRadius:20,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"inline-block",maxWidth:"100%"}}>{meta.label}</span>
                      <span style={{fontSize:11.5,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{partyLabel}</span>
                      <span style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{isBT?"—":(txn.project||"—")}</span>
                      <span style={{fontSize:11.5,color:T.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{noteText||"—"}</span>
                      <span style={{fontSize:12.5,fontWeight:isCR?700:400,color:isCR?T.grn:T.t4,textAlign:"right"}}>{isCR?`₹${fmtN(txn.amount)}`:"—"}</span>
                      <span style={{fontSize:12.5,fontWeight:!isCR?700:400,color:!isCR?T.red:T.t4,textAlign:"right"}}>{!isCR?`₹${fmtN(txn.amount)}`:"—"}</span>
                      <span style={{fontSize:12,fontWeight:700,color:runBal>=0?T.t1:T.red,textAlign:"right"}}>₹{fmtN(Math.abs(runBal))}</span>
                      <span style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{txn.account||"—"}</span>
                      <span style={{fontSize:10.5,fontWeight:600,color:T.t2,background:T.surfaceB,padding:"1px 5px",borderRadius:5,whiteSpace:"nowrap",textTransform:"uppercase"}}>{(txn.mop||"").replace("_"," ")||"—"}</span>
                      <span style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{txn.entryBy||"—"}</span>
                    </div>
                  );
                });
              })()}
              {activeTxns.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No transactions recorded</div>}
              </div>
              {/* Footer totals */}
              {(()=>{
                const cbAllTotal=[...activeTxns];
                const cbTotalIn=cbAllTotal.filter(t=>!t.dr).reduce((s,t)=>s+t.amount,0);
                const cbTotalOut=cbAllTotal.filter(t=>t.dr).reduce((s,t)=>s+t.amount,0);
                const cbClosing=totalBal+cbTotalIn-cbTotalOut;
                return(
                <div style={{display:"grid",gridTemplateColumns:"70px 115px 125px 100px 1fr 95px 95px 95px 90px 70px 90px",padding:"9px 14px",gap:4,background:T.surfaceB,borderTop:`2px solid ${T.b2}`,flexShrink:0}}>
                <span style={{gridColumn:"1/6",fontSize:12,fontWeight:700,color:T.t1}}>TOTAL — {activeTxns.length} entries</span>
                <span style={{fontSize:13,fontWeight:800,color:T.grn,textAlign:"right"}}>₹{fmtN(cbIn)}</span>
                <span style={{fontSize:13,fontWeight:800,color:T.red,textAlign:"right"}}>₹{fmtN(cbOut)}</span>
                <span/><span/><span/><span/>
              </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* PAYMENT REQUESTS TAB */}
        {tab==="payreq"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            {/* Toolbar */}
            <div style={{background:T.surface,borderRadius:8,padding:"9px 14px",marginBottom:10,border:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,gap:10}}>
              <div style={{fontSize:14,fontWeight:700,color:T.t1,whiteSpace:"nowrap"}}>All Payment Requests</div>
              <div style={{position:"relative",flex:1,maxWidth:380}}>
                <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input value={searchPR} onChange={e=>setSearchPR(e.target.value)}
                  placeholder="Search by no, party, project, purpose, amount, priority, status…"
                  style={{width:"100%",height:30,padding:"0 28px 0 28px",borderRadius:7,border:`1.5px solid ${searchPR?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:searchPR?T.bluL:T.surface}}/>
                {searchPR&&<button onClick={()=>setSearchPR("")} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.t4,padding:2,display:"flex",alignItems:"center"}} title="Clear"><IcX size={12}/></button>}
              </div>
              <div style={{display:"flex",gap:7}}>
                <button onClick={dlPRcsv} style={{padding:"5px 10px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><IcDown size={12} color={T.grn}/> Excel</button>
                <button onClick={dlPRpdf} style={{padding:"5px 10px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><IcDown size={12} color={T.red}/> PDF</button>
                <button onClick={()=>setShowNewPR(true)} style={{padding:"5px 13px",borderRadius:6,background:T.blu,color:"white",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5,boxShadow:`0 2px 6px ${T.blu}44`}}>
                  <IcAdd size={13} color="white"/> New Request
                </button>
              </div>
            </div>

            {/* Table — new cols: ReqNo | Date | Party | Project | Purpose | Req By | Priority | Amount | Status | Action */}
            <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
              {/* Sticky header with sort */}
              {(()=>{
                const SortH=({label,col,align="left"})=>{
                  const active=sortPR.col===col;
                  return(<span onClick={()=>setSortPR(s=>({col,dir:s.col===col&&s.dir==="asc"?"desc":"asc"}))}
                    style={{fontSize:9,fontWeight:700,color:active?T.blu:T.t4,textTransform:"uppercase",letterSpacing:"0.3px",cursor:"pointer",display:"flex",alignItems:"center",gap:2,justifyContent:align==="right"?"flex-end":"flex-start",userSelect:"none",whiteSpace:"nowrap"}}>
                    {label}<span style={{opacity:active?1:0.3}}>{active&&sortPR.dir==="asc"?"↑":"↓"}</span>
                  </span>);
                };
                return(
                <div style={{display:"grid",gridTemplateColumns:"80px 72px 140px 100px 130px 1fr 110px 75px 90px 95px 130px",padding:"7px 14px",background:T.surfaceB,borderBottom:`2px solid ${T.b1}`,position:"sticky",top:0,zIndex:10,gap:6}}>
                  <SortH label="Req No" col="no"/>
                  <SortH label="Date" col="date"/>
                  <SortH label="Party" col="party"/>
                  <span style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",whiteSpace:"nowrap"}}>Type</span>
                  <SortH label="Project" col="project"/>
                  <span style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>Purpose</span>
                  <SortH label="Req By" col="by"/>
                  <SortH label="Priority" col="priority"/>
                  <SortH label="Amount" col="amount" align="right"/>
                  <SortH label="Status" col="status"/>
                  <span style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>Action</span>
                </div>
                );
              })()}
              <div style={{flex:1,overflowY:"auto"}}>
              {[...payReqs].sort((a,b)=>{
                const {col,dir}=sortPR; const mul=dir==="asc"?1:-1;
                if(col==="amount") return (a.amount-b.amount)*mul;
                if(col==="date"||col==="no") return ((b.ds||0)-(a.ds||0))*mul;
                if(col==="party") return ((a.party||"")>(b.party||"")? 1:-1)*mul;
                if(col==="project") return ((a.project||"")>(b.project||"")? 1:-1)*mul;
                if(col==="status") return ((a.status||"")>(b.status||"")? 1:-1)*mul;
                if(col==="by") return ((a.by||"")>(b.by||"")? 1:-1)*mul;
                if(col==="priority"){const pw={High:3,Medium:2,Low:1};return((pw[a.priority||"Medium"]||2)-(pw[b.priority||"Medium"]||2))*mul;}
                return (b.ds||0)-(a.ds||0);
              }).filter(r=>chipPR==="All"||r.status===chipPR).filter(r=>{
                const q=searchPR.trim().toLowerCase();
                if(!q) return true;
                const pi=masterParties.find(p=>p.name===r.party);
                const pt=pi?.type||"Vendor";
                const hay=[r.no,r.date,r.party,pt,r.project,r.purpose,r.note,r.by,r.priority,r.amount,r.status].join(" ").toLowerCase();
                return hay.includes(q);
              }).map((req,i)=>{
                const isEditing=editReqId===req.id;
                const sc=req.status==="Approved"?{c:T.grn,bg:T.grnL,brd:T.grnM}:req.status==="Rejected"?{c:T.red,bg:T.redL,brd:T.redM}:{c:T.amb,bg:T.ambL,brd:T.ambM};
                const pri=req.priority||"Medium";
                const pm=pri==="High"?{c:T.red,bg:T.redL}:pri==="Low"?{c:T.grn,bg:T.grnL}:{c:T.amb,bg:T.ambL};
                return(
                  <div key={req.id} style={{borderBottom:`1px solid ${T.b1}`,background:isEditing?T.bluL+"44":i%2===0?T.surface:"#FAFBFD",transition:"all 0.12s"}}>
                    <div style={{display:"grid",gridTemplateColumns:"80px 72px 140px 100px 130px 1fr 110px 75px 90px 95px 130px",padding:"10px 14px",gap:6,alignItems:"center"}}
                      onMouseEnter={e=>{if(!isEditing)e.currentTarget.parentElement.style.background=T.bluL+"55"}}
                      onMouseLeave={e=>{if(!isEditing)e.currentTarget.parentElement.style.background=i%2===0?T.surface:"#FAFBFD"}}>
                      {/* Req No */}
                      <span><span style={{fontSize:11,fontWeight:600,color:T.blu,background:T.bluL,padding:"2px 7px",borderRadius:5,border:`1px solid ${T.bluM}`}}>{req.no}</span></span>
                      {/* Date */}
                      <span style={{fontSize:11.5,color:T.t3,whiteSpace:"nowrap"}}>{req.date}</span>
                      {/* Party */}
                      <span style={{fontSize:12,color:T.t1,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{req.party||"—"}</span>
                      {/* Party Type */}
                      {(()=>{
                        const pi=masterParties.find(p=>p.name===req.party);
                        const pt=pi?.type||"Vendor";
                        const ptMap={"Material Supplier":{c:"#0277BD",bg:"#E1F5FE",s:"Mat. Supplier"},"Sub-Con":{c:T.slt,bg:T.sltL,s:"Sub-Con"},"Labour":{c:T.pur,bg:T.purL,s:"Labour"},"Client":{c:T.grn,bg:T.grnL,s:"Client"}};
                        const ptc=ptMap[pt]||{c:T.amb,bg:T.ambL,s:pt};
                        return <span style={{fontSize:10,fontWeight:700,color:ptc.c,background:ptc.bg,padding:"2px 6px",borderRadius:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"inline-block",maxWidth:"100%"}}>{ptc.s}</span>;
                      })()}
                      {/* Project */}
                      <span style={{fontSize:11.5,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{req.project||"—"}</span>
                      {/* Purpose */}
                      <div style={{overflow:"hidden"}}>
                        <div style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{req.purpose||"—"}</div>
                        {req.note&&<div style={{fontSize:10.5,color:T.t4,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📝 {req.note}</div>}
                      </div>
                      {/* Req By */}
                      <span style={{fontSize:11.5,color:T.t2,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{req.by||"—"}</span>
                      {/* Priority */}
                      <span style={{fontSize:10,fontWeight:700,color:pm.c,background:pm.bg,padding:"2px 7px",borderRadius:10,whiteSpace:"nowrap",display:"inline-block"}}>{pri}</span>
                      {/* Amount */}
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:13,fontWeight:700,color:T.t1}}>₹{fmtN(req.amount)}</div>
                        {req.originalAmt&&<div style={{fontSize:10,color:T.t4,textDecoration:"line-through"}}>₹{fmtN(req.originalAmt)}</div>}
                      </div>
                      {/* Status */}
                      <span><span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:10,background:sc.bg,color:sc.c,border:`1px solid ${sc.brd}`,whiteSpace:"nowrap"}}>{req.status}</span></span>
                      {/* Action */}
                      <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                        {req.status==="Pending"&&(<>
                          <button onClick={()=>{if(isEditing){setEditReqId(null);}else{setEditReqId(req.id);setEditAmt(String(req.amount));}}}
                            style={{padding:"4px 7px",borderRadius:5,background:isEditing?T.bluL:T.sltL,color:isEditing?T.blu:T.t3,border:`1px solid ${isEditing?T.blu:T.b1}`,fontSize:10,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
                            <IcEdit size={10} color="currentColor"/> Edit
                          </button>
                          <button onClick={()=>approveReq(req.id)} style={{padding:"4px 8px",borderRadius:5,background:T.grnL,color:T.grn,border:`1px solid ${T.grnM}`,fontSize:10,fontWeight:700,cursor:"pointer"}}>✓</button>
                          <button onClick={()=>rejectReq(req.id)} style={{padding:"4px 8px",borderRadius:5,background:T.redL,color:T.red,border:`1px solid ${T.redM}`,fontSize:10,fontWeight:700,cursor:"pointer"}}>✗</button>
                        </>)}
                        {req.status==="Approved"&&(
                          <div style={{display:"flex",flexDirection:"column",gap:1}}>
                            <span style={{fontSize:10,color:T.grn,fontWeight:600}}>✓ {req.approvedBy||APPROVER_NAME}</span>
                            {req.approvedDate&&<span style={{fontSize:9.5,color:T.t4}}>{req.approvedDate}</span>}
                          </div>
                        )}
                        {req.status==="Rejected"&&(
                          <span style={{fontSize:10.5,color:T.red,fontWeight:600}}>✗ Rejected</span>
                        )}
                      </div>
                    </div>
                    {/* Edit panel */}
                    {isEditing&&req.status==="Pending"&&(
                      <div style={{borderTop:`1px solid ${T.bluM}`,background:T.bluL,padding:"12px 14px"}}>
                        <div style={{fontSize:11,fontWeight:700,color:T.blu,marginBottom:10}}>Modify Payment Before Approving</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                          <div>
                            <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Requested Amount</label>
                            <input readOnly value={"₹"+fmtN(req.amount)} style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:12,color:T.t4,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                          </div>
                          <div>
                            <label style={{fontSize:10,fontWeight:600,color:T.blu,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Approve Amount</label>
                            <input type="number" value={editAmt} onChange={e=>setEditAmt(e.target.value)} placeholder="Enter amount"
                              style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.blu}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                          <div>
                            <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Reason</label>
                            <select style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
                              <option>Partial stock available</option><option>Budget limit</option><option>Price negotiated</option><option>Split payment</option><option>Other</option>
                            </select>
                          </div>
                          <div>
                            <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Note</label>
                            <input type="text" placeholder="Optional note..." style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:7,justifyContent:"flex-end"}}>
                          <button onClick={()=>setEditReqId(null)} style={{padding:"6px 14px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
                          <button onClick={()=>{
                            const newAmt=Number(editAmt);if(!newAmt||newAmt<=0) return;const orig=req.amount;
                            // pendPmts derives from payReqs automatically — no separate push needed
                            setPayReqs(prev=>prev.map(r=>r.id===req.id?{...r,status:"Approved",amount:newAmt,originalAmt:newAmt!==orig?orig:undefined,modified:newAmt!==orig,approvedBy:APPROVER_NAME,approvedDate:new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}:r));
                            setEditReqId(null);
                          }} style={{padding:"6px 14px",borderRadius:6,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                            <IcThumbUp size={13} color="white"/> Approve {Number(editAmt)?"₹"+fmtN(Number(editAmt)):"..."}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {payReqs.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No payment requests found</div>}
              </div>{/* /scrollable */}
            </div>
          </div>
        )}
        {/* PENDING PAYMENTS TAB */}
        {tab==="pending"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            {/* Toolbar */}
            <div style={{background:T.surface,borderRadius:8,padding:"9px 14px",marginBottom:10,border:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,gap:10}}>
              <div style={{fontSize:14,fontWeight:700,color:T.t1,whiteSpace:"nowrap"}}>Pending Payments</div>
              <div style={{position:"relative",flex:1,maxWidth:380}}>
                <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input value={searchPend} onChange={e=>setSearchPend(e.target.value)}
                  placeholder="Search by no, type, party, amount, priority…"
                  style={{width:"100%",height:30,padding:"0 28px 0 28px",borderRadius:7,border:`1.5px solid ${searchPend?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:searchPend?T.bluL:T.surface}}/>
                {searchPend&&<button onClick={()=>setSearchPend("")} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.t4,padding:2,display:"flex",alignItems:"center"}} title="Clear"><IcX size={12}/></button>}
              </div>
              <div style={{display:"flex",gap:7,alignItems:"center"}}>
                <button onClick={dlPendCSV} style={{padding:"5px 10px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><IcDown size={12} color={T.grn}/> Excel</button>
                <button onClick={dlPendPDF} style={{padding:"5px 10px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><IcDown size={12} color={T.red}/> PDF</button>
              </div>
            </div>

            {/* Table — cols: Invoice No | Type | Party Name | Invoice Amt | Balance Due | Due Date | Priority | Action */}
            {(()=>{
              // Sort helper
              const sortFn=(a,b)=>{
                const {col,dir}=sortPend;
                const mul=dir==="asc"?1:-1;
                if(col==="overdue") return ((b.overdue?1:0)-(a.overdue?1:0))*mul;
                if(col==="amount") return (a.amount-b.amount)*mul;
                if(col==="date") return ((a.date||"")>(b.date||"")? 1:-1)*mul;
                if(col==="priority"){
                  const pw={High:3,Medium:2,Low:1};
                  const ap=a.overdue?"High":a.type==="pr"?"Medium":"Low";
                  const bp=b.overdue?"High":b.type==="pr"?"Medium":"Low";
                  return (pw[ap]-pw[bp])*mul;
                }
                if(col==="party") return ((a.party||"")>(b.party||"")? 1:-1)*mul;
                return 0;
              };
              const SortHdr=({label,col,align="left"})=>{
                const active=sortPend.col===col;
                const dir=sortPend.dir;
                return(
                  <span onClick={()=>setSortPend(s=>({col,dir:s.col===col&&s.dir==="asc"?"desc":"asc"}))}
                    style={{fontSize:9,fontWeight:700,color:active?T.blu:T.t4,textTransform:"uppercase",
                      letterSpacing:"0.3px",textAlign:align,cursor:"pointer",display:"flex",
                      alignItems:"center",gap:3,justifyContent:align==="right"?"flex-end":"flex-start",
                      userSelect:"none"}}>
                    {label}
                    <span style={{fontSize:9,opacity:active?1:0.3}}>{active&&dir==="asc"?"↑":"↓"}</span>
                  </span>
                );
              };
              const COLS="90px 110px 1fr 100px 100px 110px 90px 110px";
              const q=searchPend.trim().toLowerCase();
              const filtered=[...pendPmts].filter(pmt=>{
                if(chipPend==="Overdue" && !pmt.overdue) return false;
                const days = pmt.daysToDue;
                if(chipPend==="Due in 7d"  && !(!pmt.overdue && days != null && days >= 0 && days <= 7))  return false;
                if(chipPend==="Due in 15d" && !(!pmt.overdue && days != null && days >= 0 && days <= 15)) return false;
                if(chipPend==="Due in 30d" && !(!pmt.overdue && days != null && days >= 0 && days <= 30)) return false;
                if(!q) return true;
                // Universal search: stitch every visible column into a haystack
                const typeLabel=pmt.type==="pr"?"approved pr":
                  pmt.subType==="subcon"?"sub-con":
                  pmt.subType==="staff"?"staff":
                  pmt.party?.toLowerCase().includes("labour")?"labour":"vendor";
                const pri=pmt.overdue?"high":pmt.priority||(pmt.type==="pr"?"medium":"low");
                const hay=[pmt.no,typeLabel,pmt.party,pmt.amount,pmt.date,pri,pmt.overdue?"overdue":"upcoming"].join(" ").toLowerCase();
                return hay.includes(q);
              }).sort(sortFn);
              return(
              <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
                {/* Sticky header */}
                <div style={{display:"grid",gridTemplateColumns:COLS,padding:"7px 14px",background:T.surfaceB,borderBottom:`2px solid ${T.b1}`,position:"sticky",top:0,zIndex:10,gap:6,flexShrink:0}}>
                  <SortHdr label="Invoice No" col="no"/>
                  <SortHdr label="Type" col="type"/>
                  <SortHdr label="Party Name" col="party"/>
                  <SortHdr label="Invoice Amt" col="amount" align="right"/>
                  <SortHdr label="Balance Due" col="amount" align="right"/>
                  <SortHdr label="Due Date" col="date"/>
                  <SortHdr label="Priority" col="priority"/>
                  <span style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>Action</span>
                </div>
                <div style={{flex:1,overflowY:"auto"}}>
                {filtered.map((pmt,i)=>{
                  const pri=pmt.overdue?"High":pmt.priority||pmt.type==="pr"?"Medium":"Low";
                  const pm=pri==="High"?{c:T.red,bg:T.redL}:pri==="Medium"?{c:T.amb,bg:T.ambL}:{c:T.grn,bg:T.grnL};
                  // Type label
                  const typeLabel=pmt.type==="pr"?"Approved PR":
                    pmt.subType==="subcon"?"Sub-Con":
                    pmt.subType==="staff"?"Staff":
                    pmt.party?.toLowerCase().includes("labour")?"Labour":"Vendor";
                  const typeC=pmt.type==="pr"?{c:T.grn,bg:T.grnL}:
                    typeLabel==="Sub-Con"?{c:T.slt,bg:T.sltL}:
                    typeLabel==="Staff"?{c:T.pur,bg:T.purL}:{c:T.amb,bg:T.ambL};
                  return(
                    <div key={pmt.id}
                      style={{display:"grid",gridTemplateColumns:COLS,padding:"10px 14px",gap:6,borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:i%2===0?T.surface:"#FAFBFD",borderLeft:pmt.overdue?`3px solid ${T.red}`:"3px solid transparent",transition:"background 0.1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.bluL+"66"}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface:"#FAFBFD"}>
                      {/* Invoice No */}
                      <span><span style={{fontSize:11,fontWeight:600,color:T.blu,background:T.bluL,padding:"2px 7px",borderRadius:5,border:`1px solid ${T.bluM}`}}>{pmt.no}</span></span>
                      {/* Type */}
                      <span style={{fontSize:10,fontWeight:700,color:typeC.c,background:typeC.bg,padding:"2px 7px",borderRadius:10,whiteSpace:"nowrap",display:"inline-block"}}>{typeLabel}</span>
                      {/* Party Name */}
                      <span style={{fontSize:12.5,color:T.t1,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pmt.party||"—"}</span>
                      {/* Invoice Amt */}
                      <span style={{fontSize:12.5,color:T.t2,textAlign:"right",fontWeight:500}}>₹{fmtN(pmt.amount)}</span>
                      {/* Balance Due */}
                      <span style={{fontSize:13,fontWeight:800,color:T.red,textAlign:"right"}}>₹{fmtN(pmt.amount)}</span>
                      {/* Due Date */}
                      <div>
                        <div style={{fontSize:12,color:pmt.overdue?T.red:T.t2,fontWeight:pmt.overdue?700:400}}>{pmt.date||"—"}</div>
                        <div style={{fontSize:9.5,color:pmt.overdue?T.red:T.grn,fontWeight:600}}>{pmt.overdue?"OVERDUE":"Upcoming"}</div>
                      </div>
                      {/* Priority */}
                      <span style={{fontSize:10,fontWeight:700,color:pm.c,background:pm.bg,padding:"2px 8px",borderRadius:10,whiteSpace:"nowrap",display:"inline-block"}}>{pri}</span>
                      {/* Action — Pay + Extend + Close */}
                      {(()=>{
                        const sourceKind = pmt.type==="pr"?"pr":"bill";
                        const sourceId = pmt.type==="pr"
                          ? parseInt(String(pmt.id).replace(/^pr-/,""))
                          : pmt.id;
                        const refresh = ()=>{ refreshPayReqs(); refreshPendPmts(); };
                        const onExtend = async ()=>{
                          const cur = pmt.dueDateRaw ? new Date(pmt.dueDateRaw).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
                          const newDate = window.prompt(`Extend ${pmt.no} due date — enter new YYYY-MM-DD`, cur);
                          if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return;
                          try {
                            const r = await api.post(`/finance/pending-payments/${sourceKind}/${sourceId}/extend`, { new_date:newDate });
                            if (r?.success===false) { window.alert(r.message||"Extend failed"); return; }
                            refresh();
                          } catch(e) { window.alert(e?.message||"Network error"); }
                        };
                        const onClose = async ()=>{
                          if (!window.confirm(`Close ${pmt.no} without paying?\n\nThis removes it from Pending Payments. The original ${sourceKind==="pr"?"request":"bill"} record stays in history.`)) return;
                          try {
                            const r = await api.post(`/finance/pending-payments/${sourceKind}/${sourceId}/close`, {});
                            if (r?.success===false) { window.alert(r.message||"Close failed"); return; }
                            refresh();
                          } catch(e) { window.alert(e?.message||"Network error"); }
                        };
                        return (
                          <div style={{display:"flex",gap:4,alignItems:"center"}}>
                            <button onClick={()=>openTxn("Payment Made",pmt.party,null,{kind:sourceKind,id:sourceId,amount:pmt.amount,label:pmt.no})}
                              title="Record payment"
                              style={{padding:"5px 9px",borderRadius:5,background:T.blu,color:"white",border:"none",cursor:"pointer",fontSize:10.5,fontWeight:700,display:"flex",alignItems:"center",gap:3}}>
                              <IcSend size={9} color="white"/> Pay
                            </button>
                            <button onClick={onExtend} title="Extend due date"
                              style={{padding:"5px 7px",borderRadius:5,background:T.ambL,color:T.amb,border:`1px solid ${T.ambM}`,cursor:"pointer",fontSize:10.5,fontWeight:700,display:"flex",alignItems:"center"}}>
                              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18M12 14v4M10 16h4"/></svg>
                            </button>
                            <button onClick={onClose} title="Close without paying"
                              style={{padding:"5px 7px",borderRadius:5,background:T.surfaceB,color:T.t3,border:`1px solid ${T.b1}`,cursor:"pointer",fontSize:10.5,fontWeight:700,display:"flex",alignItems:"center"}}>
                              <IcX size={11} color={T.t3}/>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
                {filtered.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No pending payments</div>}
                </div>
                {/* Total footer */}
                {filtered.length>0&&(
                  <div style={{display:"grid",gridTemplateColumns:COLS,padding:"9px 14px",gap:6,background:"#EEF2FF",borderTop:`2px solid ${T.b1}`,flexShrink:0}}>
                    <span style={{gridColumn:"1/4",fontSize:12,fontWeight:700,color:T.t1}}>Total Outstanding — {filtered.length} items</span>
                    <span/>
                    <span style={{fontSize:13,fontWeight:800,color:T.red,textAlign:"right"}}>₹{fmtN(filtered.reduce((s,p)=>s+p.amount,0))}</span>
                    <span/><span/><span/>
                  </div>
                )}
              </div>
              );
            })()}
          </div>
        )}

        {/* ══ UNBILLED GRN TAB ══ */}
        {tab==="unbilled_grn"&&(
          <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
          {/* Filter bar */}
          <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"8px 12px",marginBottom:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:600,color:T.t2}}>Filters:</span>
            <select value={grnFilter.project} onChange={e=>setGrnFilter(p=>({...p,project:e.target.value}))}
              style={{height:30,padding:"0 8px",borderRadius:6,border:`1.5px solid ${grnFilter.project!=="All"?T.blu:T.b1}`,background:grnFilter.project!=="All"?T.bluL:T.surface,fontSize:11.5,color:grnFilter.project!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
              <option value="All">All Projects</option>
              {[...new Set(grnList.map(g=>g.project_name).filter(Boolean))].map(p=><option key={p}>{p}</option>)}
            </select>
            <select value={grnFilter.head} onChange={e=>setGrnFilter(p=>({...p,head:e.target.value}))}
              style={{height:30,padding:"0 8px",borderRadius:6,border:`1.5px solid ${grnFilter.head!=="All"?T.blu:T.b1}`,background:grnFilter.head!=="All"?T.bluL:T.surface,fontSize:11.5,color:grnFilter.head!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
              <option value="All">All Categories</option>
              {["Civil","Electrical","Plumbing","Finishing","Structural","Mechanical","Safety","General"].map(h=><option key={h}>{h}</option>)}
            </select>
            <div style={{position:"relative",flex:1,minWidth:160}}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} strokeLinecap="round" style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
              <input value={grnFilter.material} onChange={e=>setGrnFilter(p=>({...p,material:e.target.value}))} placeholder="Search material..."
                style={{width:"100%",height:30,padding:"0 8px 0 27px",borderRadius:6,border:`1.5px solid ${grnFilter.material?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:grnFilter.material?T.bluL:T.surface}}/>
            </div>
            {(grnFilter.project!=="All"||grnFilter.head!=="All"||grnFilter.material)&&(
              <button onClick={()=>setGrnFilter({project:"All",material:"",head:"All"})}
                style={{fontSize:11,color:T.red,background:T.redL,border:`1px solid ${T.redM}`,borderRadius:5,padding:"3px 9px",cursor:"pointer"}}>Clear ×</button>
            )}
            <button onClick={async()=>{
                if(!window.confirm("Re-link existing bills to their source GRNs?\n\nUse this after adding a missing vendor to Party Master so old bills auto-link properly."))return;
                try{
                  const r=await api.post("/finance/admin/relink-bills",{});
                  if(r.success){
                    alert(`✓ ${r.linked || 0} bill(s) re-linked to source GRNs.\n  • via party match: ${r.via_party || 0}\n  • via description fallback: ${r.via_description || 0}`);
                    loadUnbilledGRNs();
                  } else {
                    alert("Failed: "+(r.message||"Unknown error"));
                  }
                }catch(e){alert("Network error: "+e.message);}
              }}
              style={{height:30,padding:"0 12px",borderRadius:6,background:T.bluL,color:T.blu,border:`1px solid ${T.bluM}`,fontSize:11.5,fontWeight:600,cursor:"pointer",marginRight:5}}>
              🔗 Re-link Bills
            </button>
            {/* Clean duplicate bills — testing tool, hard-deletes duplicate
                (party_id, challan_no, project_id) buckets keeping the earliest. */}
            <button onClick={async()=>{
                if(!window.confirm("⚠ HARD-DELETE duplicate bills?\n\nFor every (vendor + challan + project) combo with multiple bills, the earliest will be KEPT and the rest will be PERMANENTLY DELETED.\n\nAccount balances + project expense + party balance will be reversed automatically.\n\nThis cannot be undone. Proceed?"))return;
                try{
                  const r=await api.post("/finance/admin/clean-duplicate-bills",{});
                  if(r.success){
                    alert(`✓ ${r.message}\n\nKept: ${r.kept?.length||0} bill(s)\nDeleted: ${r.deleted?.length||0} duplicate bill(s)\nGRNs locked: ${r.stamped_grns||0}`);
                    loadUnbilledGRNs();
                    if(typeof refreshTxns==="function") refreshTxns();
                  } else {
                    alert("Failed: "+(r.message||"Unknown error"));
                  }
                }catch(e){alert("Network error: "+e.message);}
              }}
              style={{height:30,padding:"0 12px",borderRadius:6,background:T.redL,color:T.red,border:`1px solid ${T.redM}`,fontSize:11.5,fontWeight:600,cursor:"pointer",marginRight:5}}>
              🧹 Clean Duplicates
            </button>
            {/* Sync Inventory — recovers Add-Item rows from past bills that
                missed Phase 5 (creates Auto-Bill GRNs for items present in
                transaction_items but absent from any project grn_items). */}
            <button onClick={async()=>{
                if(!window.confirm("Sync inventory from past bills?\n\nFor every material_purchase bill, line items NOT yet present in any GRN for the same project will be added via an Auto-Bill GRN. Safe to run multiple times — only missing items get added."))return;
                try{
                  const r=await api.post("/finance/admin/sync-bill-inventory",{});
                  if(r.success){
                    alert(`✓ ${r.message}\n\nBills scanned: ${r.bills_scanned||0}\nItems recovered: ${r.items_recovered||0}\nAuto-Bill GRNs created: ${r.auto_grns_created||0}`);
                  } else {
                    alert("Failed: "+(r.message||"Unknown error"));
                  }
                }catch(e){alert("Network error: "+e.message);}
              }}
              style={{height:30,padding:"0 12px",borderRadius:6,background:T.ambL,color:T.amb,border:`1px solid ${T.ambM}`,fontSize:11.5,fontWeight:600,cursor:"pointer",marginRight:5}}>
              📦 Sync Inventory
            </button>
            <button onClick={loadUnbilledGRNs}
              style={{height:30,padding:"0 12px",borderRadius:6,background:T.grnL,color:T.grn,border:`1px solid ${T.grnM}`,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
              ↻ Refresh
            </button>
          </div>

          {/* GRN List */}
          {grnLoading&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>Loading GRN data...</div>}

          {!grnLoading&&grnList.length===0&&(
            <div style={{textAlign:"center",padding:"60px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
              <div style={{fontSize:14,fontWeight:600,color:T.t3,marginBottom:4}}>No GRN entries found</div>
              <div style={{fontSize:12,color:T.t4}}>Procurement mein GRN complete hone ke baad yahan aayega</div>
            </div>
          )}

          {!grnLoading&&grnList.length>0&&(()=>{
            const filtered=grnList.filter(g=>{
              if(grnFilter.project!=="All"&&g.project_name!==grnFilter.project) return false;
              if(grnFilter.material){
                const q=grnFilter.material.toLowerCase();
                const inVendor=(g.vendor_name||"").toLowerCase().includes(q);
                const inItems=(g.items||[]).some(it=>(it.description||"").toLowerCase().includes(q));
                if(!inVendor&&!inItems) return false;
              }
              return true;
            });

            if(filtered.length===0) return <div style={{textAlign:"center",padding:"40px",color:T.t4}}>No GRN matches filters</div>;

            // Vendor-wise grouping: collect every GRN under its vendor name,
            // flatten items with their parent-GRN ref for checkbox-driven billing.
            const groups={};
            filtered.forEach(g=>{
              const v=(g.vendor_name||"— Unknown Vendor —").trim()||"— Unknown Vendor —";
              if(!groups[v]) groups[v]={vendor:v,grns:[],items:[],hasOrphan:false};
              groups[v].grns.push(g);
              if(g.has_orphan_vendor_bills) groups[v].hasOrphan=true;
              (g.items||[]).forEach((it,idx)=>{
                groups[v].items.push({
                  key:`${g.id}-${idx}`,
                  grn:g,
                  name:it.description||"—",
                  qty:parseFloat(it.received_qty)||0,
                  unit:it.unit||"",
                  recvDate:g.received_date,
                  project:g.project_name||"—",
                  challan:g.challan_no||"",
                  grnNumber:g.grn_number,
                });
              });
            });
            const groupArr=Object.values(groups).sort((a,b)=>a.vendor.localeCompare(b.vendor));

            const fmtDate=d=>d?new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";

            // When user clicks "Create Bill" we merge all ticked items into one
            // Material Purchase prefill. Metadata (challan/date/project/grnId)
            // is taken from the FIRST ticked item's parent GRN; if items span
            // multiple GRNs we surface that as an info banner inside the modal
            // (forceMultiGRN). Conflict check still runs against the first GRN.
            const buildPrefillFromSelected=(vendorName)=>{
              const grp=groups[vendorName];
              if(!grp) return null;
              const picked=grp.items.filter(it=>selectedUBItems.has(it.key));
              if(picked.length===0) return null;
              const primary=picked[0].grn;
              const uniqueGrnIds=[...new Set(picked.map(p=>p.grn.id))];
              const uniqueChallans=[...new Set(picked.map(p=>p.challan).filter(Boolean))];
              return {
                grnNumber:primary.grn_number,
                grnId:primary.id,
                grnIds:uniqueGrnIds,
                receivedDate:primary.received_date,
                vendor:primary.vendor_name||"",
                challan:uniqueChallans.join(", ")||primary.challan_no||"",
                deliveryDate:primary.received_date?primary.received_date.split("T")[0]:"",
                project:primary.project_name||"",
                items:picked.map(p=>({
                  name:p.name,
                  qty:p.qty,
                  unit:p.unit||"Bag",
                  rate:"",
                  head:"Civil",
                  desc:p.grnNumber?`From ${p.grnNumber}`:"",
                  // Carry the SOURCE GRN id per row so backend can validate
                  // each line against its own GRN's balance (not the
                  // top-level primary grn_id which only covers row 1).
                  grn_id:p.grn?.id,
                  grn_number:p.grnNumber,
                })),
              };
            };

            const handleCreateBill=async(vendorName)=>{
              const prefill=buildPrefillFromSelected(vendorName);
              if(!prefill){alert("Pehle kuch items tick karo");return;}
              const primary=groups[vendorName].items.find(it=>selectedUBItems.has(it.key))?.grn;
              try{
                const params=new URLSearchParams({
                  vendor:vendorName,
                  challan:primary?.challan_no||"",
                  grn_id:primary?.id||"",
                  project_id:primary?.project_id||"",
                });
                const cf=await api.get("/finance/check-bill-conflict?"+params.toString());
                if(cf?.success&&cf.data?.has_conflict){
                  setConflictData({...cf.data,prefill,vendorName});
                  return;
                }
              }catch(e){console.warn("conflict check failed:",e.message);}
              openTxn("Material Purchase Bill",vendorName,prefill);
              setSelectedUBItems(new Set());
            };

            const totalSelected=selectedUBItems.size;
            const totalItems=groupArr.reduce((s,g)=>s+g.items.length,0);

            return(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {/* Section header */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",background:T.purL,border:`1px solid ${T.pur}33`,borderRadius:7}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:13,fontWeight:700,color:T.pur,letterSpacing:".2px"}}>UNBILLED MATERIAL — Vendor wise</span>
                    <span style={{fontSize:11,color:T.t3}}>· {groupArr.length} vendor{groupArr.length===1?"":"s"} · {totalItems} item{totalItems===1?"":"s"}</span>
                  </div>
                  {totalSelected>0&&(
                    <span style={{fontSize:11,color:T.pur,fontWeight:700,background:"white",padding:"3px 10px",borderRadius:20,border:`1px solid ${T.pur}55`}}>
                      {totalSelected} item{totalSelected===1?"":"s"} selected
                    </span>
                  )}
                </div>

                {groupArr.map(grp=>{
                  const isOpen=expandedVendor===grp.vendor;
                  const selectedInGrp=grp.items.filter(it=>selectedUBItems.has(it.key)).length;
                  const allTicked=selectedInGrp===grp.items.length&&grp.items.length>0;
                  const someTicked=selectedInGrp>0&&!allTicked;
                  return(
                    <div key={grp.vendor} style={{background:T.surface,borderRadius:8,border:`1px solid ${grp.hasOrphan?T.ambM:T.b1}`,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                      {grp.hasOrphan&&(
                        <div style={{padding:"5px 14px",background:T.ambL,borderBottom:`1px solid ${T.ambM}`,fontSize:10.5,color:T.amb,fontWeight:600,display:"flex",alignItems:"center",gap:5}}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
                          <span>⚠ Is vendor ke kuch bills already bina GRN-link ke hain — Fin Activity me check karo, duplicate na ban jaaye</span>
                        </div>
                      )}
                      {/* Vendor row */}
                      <div onClick={()=>setExpandedVendor(isOpen?null:grp.vendor)}
                        style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",transition:"background 0.1s"}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                        onMouseLeave={e=>e.currentTarget.style.background=T.surface}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13.5,fontWeight:700,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{grp.vendor}</div>
                          <div style={{fontSize:10.5,color:T.t4,marginTop:2}}>
                            {grp.grns.length} GRN{grp.grns.length===1?"":"s"}
                            {" · "}
                            {[...new Set(grp.grns.map(g=>g.project_name).filter(Boolean))].slice(0,2).join(", ")||"—"}
                            {[...new Set(grp.grns.map(g=>g.project_name).filter(Boolean))].length>2?", …":""}
                          </div>
                        </div>
                        {selectedInGrp>0&&(
                          <span style={{fontSize:10.5,color:T.blu,fontWeight:700,background:T.bluL,padding:"3px 9px",borderRadius:20,border:`1px solid ${T.bluM}`}}>
                            ✓ {selectedInGrp} ticked
                          </span>
                        )}
                        <span style={{background:T.purL,color:T.pur,fontSize:10.5,fontWeight:700,padding:"3px 10px",borderRadius:20,border:`1px solid ${T.pur}22`,whiteSpace:"nowrap"}}>
                          {grp.items.length} item{grp.items.length===1?"":"s"}
                        </span>
                        <span style={{color:T.t4,fontSize:14,transform:isOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.15s",display:"inline-block"}}>⌄</span>
                      </div>

                      {/* Expanded — checkbox list of items */}
                      {isOpen&&(
                        <div style={{borderTop:`1px solid ${T.b1}`,background:T.surfaceB,padding:"10px 14px"}}>
                          <div style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>
                            SELECT MATERIAL RECEIVED — {grp.vendor}
                          </div>
                          {/* Header w/ master checkbox */}
                          <div style={{display:"grid",gridTemplateColumns:"26px 1fr 90px 70px 60px 110px 100px",gap:6,padding:"6px 8px",background:T.surface,borderRadius:6,border:`1px solid ${T.b1}`,alignItems:"center"}}>
                            <input type="checkbox" checked={allTicked}
                              ref={el=>{if(el) el.indeterminate=someTicked;}}
                              onChange={e=>{
                                const next=new Set(selectedUBItems);
                                if(e.target.checked){grp.items.forEach(it=>next.add(it.key));}
                                else{grp.items.forEach(it=>next.delete(it.key));}
                                setSelectedUBItems(next);
                              }}
                              style={{cursor:"pointer",width:14,height:14,accentColor:T.blu}}/>
                            {["Material","Project","GRN #","Qty","Unit","Received"].map((h,i)=>(
                              <span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",textAlign:i===3?"right":"left"}}>{h}</span>
                            ))}
                          </div>
                          {/* Item rows */}
                          {grp.items.map(it=>{
                            const ticked=selectedUBItems.has(it.key);
                            return(
                              <label key={it.key}
                                style={{display:"grid",gridTemplateColumns:"26px 1fr 90px 70px 60px 110px 100px",gap:6,padding:"7px 8px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",background:ticked?T.bluL+"55":"transparent",transition:"background 0.1s"}}>
                                <input type="checkbox" checked={ticked}
                                  onChange={()=>{
                                    const next=new Set(selectedUBItems);
                                    if(ticked) next.delete(it.key); else next.add(it.key);
                                    setSelectedUBItems(next);
                                  }}
                                  style={{cursor:"pointer",width:14,height:14,accentColor:T.blu}}/>
                                <span style={{fontSize:12,color:T.t1,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.name}</span>
                                <span style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.project}</span>
                                <span style={{fontSize:11,color:T.blu,fontFamily:"monospace",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.grnNumber}</span>
                                <span style={{fontSize:11.5,color:T.t2,fontWeight:700,textAlign:"right"}}>{it.qty}</span>
                                <span style={{fontSize:11,color:T.t3}}>{it.unit||"—"}</span>
                                <span style={{fontSize:10.5,color:T.t4}}>{fmtDate(it.recvDate)}</span>
                              </label>
                            );
                          })}
                          {/* Footer — Create Bill */}
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:10,borderTop:`1.5px solid ${T.b1}`}}>
                            <span style={{fontSize:11.5,color:T.t3}}>
                              {selectedInGrp>0?`${selectedInGrp} item${selectedInGrp===1?"":"s"} ticked — bill banayenge`:"Select items above to bill them"}
                            </span>
                            <button disabled={selectedInGrp===0}
                              onClick={()=>handleCreateBill(grp.vendor)}
                              style={{padding:"7px 16px",borderRadius:7,background:selectedInGrp>0?T.blu:T.t4,color:"white",border:"none",cursor:selectedInGrp>0?"pointer":"not-allowed",fontSize:12,fontWeight:700,opacity:selectedInGrp>0?1:0.55,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
                              + Create Bill
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
        )}
        {/* BILLED MATERIAL TAB ─────────────────────────────────────── */}
        {tab==="billed_mat"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            {(()=>{
              const billRows = [];
              activeTxns
                .filter(t => t.txnType === "material_purchase" && Array.isArray(t.items) && t.items.length > 0)
                .forEach(t => {
                  t.items.forEach((it, i) => {
                    billRows.push({
                      key: `${t.id}-${i}`,
                      date: t.date,
                      ds: t.ds,
                      vendor: t.party || "—",
                      project: t.project || "—",
                      material: it.item_name || it.item || it.name || it.description || "—",
                      qty: parseFloat(it.qty || it.quantity) || 0,
                      unit: it.unit || "",
                      rate: parseFloat(it.rate) || 0,
                      amount: parseFloat(it.amount || it.amt) || 0,
                      _txn: t,
                    });
                  });
                });
              billRows.sort((a, b) => (b.ds || 0) - (a.ds || 0));
              const search = txnSearch || "";
              const filtered = billRows.filter(r => {
                if (!search) return true;
                const q = search.toLowerCase();
                return (r.material||"").toLowerCase().includes(q) ||
                       (r.vendor||"").toLowerCase().includes(q) ||
                       (r.project||"").toLowerCase().includes(q);
              });
              const totalAmt = filtered.reduce((s, r) => s + r.amount, 0);
              return (
                <>
                  <div style={{background:T.surface,borderRadius:8,padding:"6px 10px",marginBottom:6,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
                    <div style={{position:"relative",flex:1,minWidth:200}}>
                      <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                      <input value={txnSearch} onChange={e=>setTxnSearch(e.target.value)} placeholder="Search material, vendor or project..."
                        style={{width:"100%",height:31,padding:"0 8px 0 27px",borderRadius:7,border:`1.5px solid ${txnSearch?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:txnSearch?T.bluL:T.surface}}/>
                    </div>
                    <span style={{fontSize:11,color:T.t4,whiteSpace:"nowrap"}}>{filtered.length} item{filtered.length===1?"":"s"} · ₹{fmtN(totalAmt)}</span>
                  </div>
                  <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
                    <div style={{display:"grid",gridTemplateColumns:"80px 1.4fr 1.2fr 1.2fr 70px 60px 80px 100px",padding:"7px 14px",background:T.surfaceB,borderBottom:`2px solid ${T.b1}`,flexShrink:0,gap:6}}>
                      {["Date","Material","Vendor","Project","Qty","Unit","Rate","Amount"].map((h,i)=>(
                        <span key={i} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",textAlign:i>=4?"right":"left"}}>{h}</span>
                      ))}
                    </div>
                    <div style={{flex:1,overflowY:"auto"}}>
                      {filtered.length===0 && <div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No billed materials yet</div>}
                      {filtered.map((r,i) => (
                        <div key={r.key} onClick={()=>{
                          // Pass which line item was clicked so the drawer
                          // can highlight + scroll to that exact row instead
                          // of letting the user wonder why both items appear.
                          setSelTxnHighlight({ item_name: r.material, amount: r.amount });
                          setSelTxn(r._txn);
                        }}
                          style={{display:"grid",gridTemplateColumns:"80px 1.4fr 1.2fr 1.2fr 70px 60px 80px 100px",padding:"8px 14px",gap:6,borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:i%2===0?T.surface:"#FAFBFD",transition:"background 0.1s",cursor:"pointer"}}
                          onMouseEnter={e=>e.currentTarget.style.background=T.bluL+"66"}
                          onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface:"#FAFBFD"}>
                          <span style={{fontSize:11,color:T.t3,whiteSpace:"nowrap"}}>{r.date}</span>
                          <span style={{fontSize:12,color:T.t1,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.material}</span>
                          <span style={{fontSize:11.5,color:T.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.vendor}</span>
                          <span style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.project}</span>
                          <span style={{fontSize:12,color:T.t1,textAlign:"right",fontWeight:600}}>{r.qty || "—"}</span>
                          <span style={{fontSize:11,color:T.t3,textAlign:"right"}}>{r.unit || "—"}</span>
                          <span style={{fontSize:11.5,color:T.t2,textAlign:"right"}}>{r.rate ? `₹${fmtN(r.rate)}` : "—"}</span>
                          <span style={{fontSize:12.5,fontWeight:700,color:T.t1,textAlign:"right"}}>₹{fmtN(r.amount)}</span>
                        </div>
                      ))}
                    </div>
                    {filtered.length > 0 && (
                      <div style={{display:"grid",gridTemplateColumns:"80px 1.4fr 1.2fr 1.2fr 70px 60px 80px 100px",padding:"9px 14px",gap:6,background:T.surfaceB,borderTop:`2px solid ${T.b2}`,flexShrink:0}}>
                        <span style={{gridColumn:"1 / 8",fontSize:12,fontWeight:700,color:T.t1}}>TOTAL — {filtered.length} entr{filtered.length===1?"y":"ies"}</span>
                        <span style={{fontSize:13,fontWeight:800,color:T.blu,textAlign:"right"}}>₹{fmtN(totalAmt)}</span>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Unbilled Drawer */}
      {showUB&&(<>
        <div onClick={()=>{setShowUB(false);setSelUBParty(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,backdropFilter:"blur(1px)"}}/>
        <div style={{position:"fixed",right:0,top:0,bottom:0,width:400,background:T.bg,zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.14)",display:"flex",flexDirection:"column"}}>
          <div style={{background:T.surface,padding:"12px 14px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:700,color:T.t1}}>Unbilled Materials</div><div style={{fontSize:10,color:T.t4}}>Received but not yet billed</div></div>
            <span style={{background:T.purL,color:T.pur,fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20,border:`1px solid ${T.pur}33`}}>₹{fmt(UNBILLED_PARTIES.flatMap(p=>p.billItems||[]).reduce((s,i)=>s+i.amt,0))}</span>
            <button onClick={()=>{setShowUB(false);setSelUBParty(null);}} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,display:"flex"}}><IcX size={15}/></button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"8px"}}>
            {UNBILLED_PARTIES.map(p=>(
              <div key={p.id} style={{background:T.surface,borderRadius:8,marginBottom:6,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
                <div onClick={()=>setSelUBParty(selUBParty?.id===p.id?null:p)} style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                  onMouseLeave={e=>e.currentTarget.style.background=T.surface}>
                  <div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{p.name}</div><div style={{fontSize:10.5,color:T.t4}}>{p.project}</div></div>
                  <span style={{background:T.purL,color:T.pur,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${T.pur}22`}}>{p.items} item{p.items>1?"s":""}</span>
                  <IcDown size={13} color={T.t4}/>
                </div>
                {selUBParty?.id===p.id&&p.billItems&&(
                  <div style={{borderTop:`1px solid ${T.b1}`,background:T.surfaceB,padding:"8px 12px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 50px 60px 70px",gap:4,marginBottom:4}}>
                      {["Item","Qty","Rate","Amount"].map((h,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
                    </div>
                    {p.billItems.map((it,ii)=>(
                      <div key={ii} style={{display:"grid",gridTemplateColumns:"1fr 50px 60px 70px",gap:4,padding:"5px 0",borderTop:`1px solid ${T.b1}`}}>
                        <span style={{fontSize:12,color:T.t1}}>{it.name}</span>
                        <span style={{fontSize:11.5,color:T.t3}}>{it.qty}</span>
                        <span style={{fontSize:11.5,color:T.t3}}>₹{it.rate}</span>
                        <span style={{fontSize:12,fontWeight:600,color:T.t1}}>₹{fmtN(it.amt)}</span>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:8,alignItems:"center"}}>
                      <span style={{fontSize:11.5,fontWeight:700,color:T.t1}}>Total: ₹{fmtN(p.billItems.reduce((s,i)=>s+i.amt,0))}</span>
                      <button onClick={()=>openTxn("Material Purchase Bill",p.name)} style={{padding:"5px 12px",borderRadius:6,background:T.blu,color:"white",border:"none",cursor:"pointer",fontSize:11,fontWeight:700}}>Create Bill</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </>)}

      {/* ══ Add Party Modal ══ */}
      {showAddParty&&(
        <AddPartyModal
          onClose={()=>setShowAddParty(false)}
          onAdd={async(p)=>{
            try{
              const res=await api.post("/finance/parties",{name:p.name,type:p.type,opening_balance:p.balance||0,phone:p.phone,city:p.city||""});
              if(res.success&&res.data){
                setMasterParties(prev=>[...prev,{id:res.data.id,name:res.data.name,type:res.data.type||p.type,balance:parseFloat(res.data.balance)||p.balance,balType:res.data.balance_type||p.balType}]);
              }else{
                setMasterParties(prev=>[...prev,p]);
              }
            }catch(e){setMasterParties(prev=>[...prev,p]);}
            setShowAddParty(false);
          }}
        />
      )}

      {/* ══ Create Transaction Modal ══ */}
      {createTxnType&&(
        <CreateTransactionModal
          type={createTxnType}
          preParty={createTxnParty}
          onClose={closeTxn}
          dbParties={masterParties}
          dbAccounts={activeAccounts}
          dbProjects={activeTxns.length>0?[...new Set(activeTxns.map(t=>t.project).filter(Boolean))]:undefined}
          onSaved={handleTxnSaved}
          prefillGRN={prefillGRNData}
          settlesRef={settlesRef}
        />
      )}
      {showNewPR&&(
        <NewPRModal
          onClose={()=>setShowNewPR(false)}
          onSave={async()=>{await refreshPayReqs();}}
          dbParties={masterParties}
          dbProjects={activeTxns.length>0?[...new Set(activeTxns.map(t=>t.project).filter(Boolean))]:undefined}
        />
      )}
      {/* ══ Transaction Detail Drawer (Fin Activity + Party Ledger row click) ══ */}
      <TransactionDetailDrawer
        txn={selTxn}
        onClose={()=>{ setSelTxn(null); setSelTxnHighlight(null); }}
        onChanged={async()=>{ await refreshTxns(); await refreshPendPmts(); await refreshParties(); }}
        highlightItem={selTxnHighlight}
      />

      {/* ══ Bill Conflict Warning Modal ══ */}
      {conflictData && (
        <BillConflictModal
          data={conflictData}
          onCancel={()=>setConflictData(null)}
          onViewExisting={(txnId)=>{
            // Find txn in activeTxns and open detail drawer
            const t = activeTxns.find(x=>x.id===txnId);
            if (t) setSelTxn(t);
            setConflictData(null);
          }}
          onForceNew={(reason)=>{
            const prefill = { ...conflictData.prefill, forceDuplicate: true, forceReason: reason };
            const vendor = conflictData.vendorName || "";
            setConflictData(null);
            openTxn("Material Purchase Bill", vendor, prefill);
          }}
        />
      )}

      {/* Shimmer CSS */}
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

export default FinanceModule;
