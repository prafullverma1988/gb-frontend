import { useState, useEffect, useRef, lazy, Suspense } from "react";
import api, { getUser, getToken, getCompanies, clearAuth, saveAuth } from "./config/api";
import apiCache from "./utils/apiCache";
import UploadToast from "./components/UploadToast";
import { ToastProvider } from "./components/Toast";
import { ConfirmProvider } from "./components/ConfirmDialog";
import { PromptProvider } from "./components/PromptDialog";
import NotificationBell from "./components/NotificationBell";
import AppErrorBoundary from "./components/AppErrorBoundary";

// ── LAZY + PRELOAD: shared promise so prefetch & React.lazy use same cache ──
// When preload() resolves, React.lazy gets already-resolved promise = NO spinner
const _cache = {};
function lazyWithPreload(key, fn) {
  const load = () => { if (!_cache[key]) _cache[key] = fn(); return _cache[key]; };
  const Comp = lazy(load);
  Comp.preload = load;
  return Comp;
}

const FinanceModule      = lazyWithPreload("finance",      () => import("./modules/FinanceModule"));
const ProcurementModule  = lazyWithPreload("procurement",  () => import("./modules/ProcurementModule"));
const DesignModule       = lazyWithPreload("design",       () => import("./modules/DesignModule"));
const ClientPreview3D    = lazyWithPreload("preview3d",    () => import("./pages/ClientPreview3D"));
const PublicDrawingPage  = lazyWithPreload("publicdrawing",() => import("./components/PublicDrawingPage"));
const PayrollModule      = lazyWithPreload("payroll",      () => import("./modules/PayrollModule"));
const SettingsModule     = lazyWithPreload("settings",     () => import("./modules/SettingsModule"));
const CRMModule          = lazyWithPreload("crm",          () => import("./modules/CRMModule"));
const TeamScheduleModule = lazyWithPreload("team",         () => import("./modules/TeamScheduleModule"));
const MOMModule          = lazyWithPreload("mom",          () => import("./modules/MOMModule"));
const MasterLibraryModule= lazyWithPreload("library",     () => import("./modules/MasterLibraryModule"));
const WarehouseModule    = lazyWithPreload("warehouse",    () => import("./modules/WarehouseModule"));
const TownshipCRMModule  = lazyWithPreload("township",     () => import("./modules/TownshipCRMModule"));
const ReportsModule      = lazyWithPreload("reports",      () => import("./modules/ReportsModule"));
const ProjectDetailPage  = lazyWithPreload("projectDetail",() => import("./modules/ProjectDetailPage"));
const ProjectsPage       = lazyWithPreload("projects",     () => import("./modules/ProjectsModule"));
const SaaSModule         = lazyWithPreload("saas",         () => import("./modules/SaaSModule"));

// ── PREFETCH: Dashboard load hone ke baad background me sab load karo ──
// safePreload — wraps preload() so a chunk-load failure on flaky network
// doesn't (a) leave an unhandled promise rejection (which Sentry would
// log as an alert) or (b) cache a poisoned rejected promise that makes
// the real <Suspense> wait forever. On error we log + delete the cache
// slot so the next real navigation retries cleanly.
function safePreload(label, comp) {
  try {
    const p = comp?.preload?.();
    if (p && typeof p.catch === "function") {
      p.catch((err) => {
        console.warn(`[preload] ${label} failed (will retry on demand):`, err?.message);
        // Best-effort cache eviction — _cache key === label by convention.
        try { if (_cache[label]) delete _cache[label]; } catch (_) {}
      });
    }
  } catch (err) {
    console.warn(`[preload] ${label} threw:`, err?.message);
  }
}

function prefetchAllModules(){
  // Wave 1 — heavy/frequent modules (1s after dashboard)
  setTimeout(()=>{
    safePreload("ProjectsPage",     ProjectsPage);
    safePreload("ProjectDetailPage",ProjectDetailPage);
    safePreload("FinanceModule",    FinanceModule);
    safePreload("ProcurementModule",ProcurementModule);
  }, 800);
  // Wave 2 — remaining modules (2s after dashboard)
  setTimeout(()=>{
    safePreload("DesignModule",        DesignModule);
    safePreload("CRMModule",           CRMModule);
    safePreload("SettingsModule",      SettingsModule);
    safePreload("PayrollModule",       PayrollModule);
    safePreload("TeamScheduleModule",  TeamScheduleModule);
    safePreload("MOMModule",           MOMModule);
    safePreload("MasterLibraryModule", MasterLibraryModule);
    safePreload("WarehouseModule",     WarehouseModule);
    safePreload("TownshipCRMModule",   TownshipCRMModule);
    safePreload("ReportsModule",       ReportsModule);
    safePreload("SaaSModule",          SaaSModule);
  }, 2000);
}

// ── ICONS ─────────────────────────────────────────────────────────────
const Ic=({d,size=18,color="currentColor",sw=1.8,fill="none"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const IcHome  =(p)=><Ic {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>;
const IcProj  =(p)=><Ic {...p} d="M3 7h18M3 12h18M3 17h18"/>;
const IcFin   =(p)=><Ic {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>;
const IcDes   =(p)=><Ic {...p} d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/>;
const IcRep   =(p)=><Ic {...p} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>;
const IcSet   =(p)=><Ic {...p} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcWH    =(p)=><Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/>;
const IcTown  =(p)=><Ic {...p} d="M3 21h18M5 21V7l6-4v18M19 21V11l-6-4M9 9v.01M9 13v.01M9 17v.01"/>;
const IcProc  =(p)=><Ic {...p} d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>;
const IcMenu  =(p)=><Ic {...p} d="M4 6h16M4 12h16M4 18h16"/>;
const IcBell  =(p)=><Ic {...p} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>;
const IcTeam  =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>;
const IcCRM   =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a3 3 0 00-3-3M16 3.13a4 4 0 010 7.75"/>;
const IcMOM   =(p)=><Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>;
const IcPay   =(p)=><Ic {...p} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>;
const IcLib   =(p)=><Ic {...p} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>;
const IcDown  =(p)=><Ic {...p} d="M6 9l6 6 6-6"/>;
const IcUp    =(p)=><Ic {...p} d="M18 15l-6-6-6 6"/>;
const IcAlert =(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;
const IcChk   =(p)=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcX     =(p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcLoc   =(p)=><Ic {...p} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcTrend =(p)=><Ic {...p} d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"/>;
const IcTrendD=(p)=><Ic {...p} d="M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6"/>;
const IcCash  =(p)=><Ic {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>;
const IcPO    =(p)=><Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
const IcTruck =(p)=><Ic {...p} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>;
const IcCalc  =(p)=><Ic {...p} d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM16 8h-2m-4 0H8m8 4h-2m-4 0H8m8 4h-2m-4 0H8"/>;
const IcEye   =(p)=><Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z"/>;
const IcEyeX  =(p)=><Ic {...p} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>;
const IcSearch=(p)=><Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;
const IcActivity=(p)=><Ic {...p} d="M22 12h-4l-3 9L9 3l-3 9H2"/>;
const IcSite  =(p)=><Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6M12 3v18"/>;
const IcMargin=(p)=><Ic {...p} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>;
const IcApprv =(p)=><Ic {...p} d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>;
const IcCal   =(p)=><Ic {...p} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>;
const IcFilter=(p)=><Ic {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3"/>;
const IcStar  =(p)=><Ic {...p} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
const IcLock  =(p)=><Ic {...p} d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"/>;

// ── LAZY LOADING FALLBACK ─────────────────────────────────────────────
// Minimal fallback — spinner only shows after 300ms delay (avoids flash for cached modules)
function ModuleLoader(){
  const [show,setShow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setShow(true),300);return()=>clearTimeout(t);},[]);
  if(!show) return <div style={{height:"100%"}}/>;
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",minHeight:300,flexDirection:"column",gap:12}}>
      <div style={{width:36,height:36,border:"3px solid #E5E7EB",borderTopColor:"#2563EB",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
      <div style={{fontSize:13,color:"#9CA3AF",fontWeight:500}}>Loading module...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── THEME ─────────────────────────────────────────────────────────────
const C={p:"#1565C0",p2:"#1976D2",a:"#FF6F00",sb:"#0D1B2A",sbH:"#1E2E42",w:"#FFFFFF",bg:"#F1F4F8",t:"#1A2332",tm:"#4A5568",tl:"#8896A6",b:"#E2E8F0"};
const T={bg:"#F4F6F9",surface:"#FFFFFF",surfaceB:"#F8F9FB",t1:"#111827",t2:"#374151",t3:"#6B7280",t4:"#9CA3AF",b1:"#E5E7EB",b2:"#D1D5DB",blu:"#2563EB",bluL:"#EFF6FF",bluM:"#BFDBFE",grn:"#059669",grnL:"#ECFDF5",grnM:"#A7F3D0",amb:"#D97706",ambL:"#FFFBEB",ambM:"#FDE68A",red:"#DC2626",redL:"#FEF2F2",redM:"#FECACA",slt:"#64748B",sltL:"#F1F5F9",pur:"#7C3AED",purL:"#F5F3FF",purM:"#DDD6FE"};
const fmt=(n)=>n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:`${(n/1000).toFixed(0)}K`;
const fmtN=(n)=>Math.abs(n).toLocaleString("en-IN");

// ── NAV GROUPS ────────────────────────────────────────────────────────
const NAV_GROUPS=[
  {section:null,items:[
    {id:"dashboard", label:"Dashboard",    Icon:IcHome, sc:"H"},
    {id:"projects",  label:"Projects",     Icon:IcProj, sc:"J"},
    {id:"crm",       label:"CRM",          Icon:IcCRM,  sc:"C"},
    {id:"mom",       label:"MOM",          Icon:IcMOM,  sc:"M"},
    {id:"team",      label:"My Team",      Icon:IcTeam, sc:"T"},
  ]},
  {section:"FINANCE & OPS",items:[
    {id:"design",      label:"Design",      Icon:IcDes,  sc:"D"},
    {id:"finance",     label:"Finance",     Icon:IcFin,  sc:"F"},
    {id:"procurement", label:"Procurement", Icon:IcProc, sc:"P"},
    {id:"warehouse",   label:"Warehouse",   Icon:IcWH,   sc:"W"},
    {id:"township",    label:"Township CRM",Icon:IcTown, sc:"G"},
    {id:"payroll",     label:"Team & HR",   Icon:IcPay,  sc:"Y"},
  ]},
  {section:"REPORTS",items:[
    {id:"reports",  label:"Reports",    Icon:IcRep, sc:"B"},
    {id:"library",  label:"Library",    Icon:IcLib, sc:"L"},
    {id:"settings", label:"Settings",   Icon:IcSet, sc:"S"},
    {id:"saas",     label:"SaaS Admin", Icon:IcStar,badge:"SA",bc:"#7C3AED"},
  ]},
];

// Modules that are always ON — cannot be toggled off
const ALWAYS_ON = ["dashboard","projects","finance","procurement","reports","library","settings"];

// Primary tabs pinned to the mobile bottom bar
const BOTTOM_TABS = [
  {id:"dashboard",   label:"Home",     Icon:IcHome},
  {id:"projects",    label:"Projects", Icon:IcProj},
  {id:"finance",     label:"Finance",  Icon:IcFin },
  {id:"procurement", label:"Purchase", Icon:IcProc},
];


// ── DASHBOARD DATA (loaded from API, empty defaults) ──────────────────
const PROJECTS_DATA=[];
const CASHFLOW_DATA=[];
const ACTIVITY_FEED=[];
const PENDING_ACTIONS=[];
const ALERTS=[];
const MATERIAL_STATUS={pending:0,ordered:0,received:0,total:0};
const STATUS_META={"Ongoing":{c:T.grn,bg:T.grnL,brd:T.grnM},"Completed":{c:T.blu,bg:T.bluL,brd:T.bluM},"Hold":{c:T.amb,bg:T.ambL,brd:T.ambM},"Not Started":{c:T.slt,bg:T.sltL,brd:T.b2}};

// ── SHARED MINI COMPONENTS ────────────────────────────────────────────
const Pill=({label,c,bg,brd})=>(
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${brd||c+"33"}`,whiteSpace:"nowrap"}}>{label}</span>
);
function KpiTile({label,value,sub,color,Icon,trend,trendVal,onClick}){
  return(
    <div onClick={onClick} style={{padding:"16px 18px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:12,cursor:onClick?"pointer":"default",transition:"all .15s",minWidth:0,display:"flex",flexDirection:"column",gap:10}}
      onMouseEnter={e=>{if(onClick){e.currentTarget.style.borderColor=T.b2; e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)";}}}
      onMouseLeave={e=>{if(onClick){e.currentTarget.style.borderColor=T.b1; e.currentTarget.style.boxShadow="none";}}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
        <div style={{flex:1,minWidth:0,fontSize:12.5,fontWeight:500,color:T.t2,lineHeight:1.3,marginTop:4}}>{label}</div>
        <div style={{width:40,height:40,borderRadius:9,background:color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 3px 8px ${color}33`}}>
          <Icon size={17} color="#fff"/>
        </div>
      </div>
      <div>
        <div style={{fontSize:24,fontWeight:700,color:T.t1,letterSpacing:"-0.5px",lineHeight:1.1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:5,minHeight:14}}>
          {sub&&<span style={{fontSize:11.5,color:T.t4}}>{sub}</span>}
          {trend&&<span style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:11,fontWeight:600,color:trend==="up"?T.grn:T.red,fontVariantNumeric:"tabular-nums"}}>
            {trend==="up"?<IcTrend size={10} color={T.grn}/>:<IcTrendD size={10} color={T.red}/>}{trendVal}
          </span>}
        </div>
      </div>
    </div>
  );
}
const Panel=({title,action,children,style})=>(
  <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,overflow:"hidden",...style}}>
    <div style={{padding:"11px 14px",borderBottom:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{title}</span>{action}
    </div>
    {children}
  </div>
);
const Bar=({pct,color,h=5})=>(
  <div style={{height:h,background:T.b1,borderRadius:h,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:color,borderRadius:h,transition:"width 0.5s"}}/>
  </div>
);

// ── CHARTS (unchanged from original) ──────────────────────────────────
function CashFlowChart({data,height=110}){
  if(!data||data.length<1) return (
    <div style={{padding:"24px 16px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:7}}>
      <div style={{width:36,height:36,borderRadius:"50%",border:`1.5px dashed ${T.b2}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} strokeLinecap="round"><path d="M3 3v18h18M7 14l3-3 3 3 4-5"/></svg>
      </div>
      <div style={{fontSize:11.5,color:T.t3,fontWeight:600}}>No transactions yet</div>
    </div>
  );
  const maxVal=Math.max(...data.flatMap(d=>[d.in,d.out]),1);
  const barW=28,gap=14,groupGap=28;
  const totalW=data.length*(barW*2+gap+groupGap);
  const pad={top:10,bottom:24,left:10,right:10};
  const chartH=height-pad.top-pad.bottom;
  const scaleY=(v)=>chartH-(v/maxVal)*chartH;
  let x=pad.left;
  return(
    <svg width="100%" viewBox={`0 0 ${totalW+pad.left+pad.right} ${height}`} style={{overflow:"visible"}}>
      {[0,0.5,1].map((pct,i)=>(<line key={i} x1={pad.left} y1={pad.top+chartH*pct} x2={totalW+pad.left} y2={pad.top+chartH*pct} stroke={T.b1} strokeWidth={0.8} strokeDasharray={i===2?"0":"3,3"}/>))}
      {data.map((d,i)=>{
        const xIn=x; const xOut=x+barW+gap;
        const inH=(d.in/maxVal)*chartH; const outH=(d.out/maxVal)*chartH;
        const net=d.in-d.out; const xLabel=x+barW+gap/2;
        x+=barW*2+gap+groupGap;
        return(<g key={i}><rect x={xIn} y={pad.top+scaleY(d.in)} width={barW} height={inH} rx={3} fill={T.grnM} opacity={0.9}/><rect x={xOut} y={pad.top+scaleY(d.out)} width={barW} height={outH} rx={3} fill={T.redM} opacity={0.9}/><text x={xLabel} y={height-5} textAnchor="middle" fontSize={9.5} fill={T.t4} fontFamily="'Segoe UI',sans-serif">{d.month}</text><circle cx={xLabel} cy={pad.top+scaleY(Math.max(d.in,d.out))-5} r={3} fill={net>=0?T.grn:T.red}/></g>);
      })}
    </svg>
  );
}
function DonutChart({slices,size=110,cx=55,cy=55,r=38,inner=22}){
  if(!slices||!slices.length||slices.every(s=>!s.value)) return (
    <div style={{width:size,height:size,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:T.t4,fontSize:10.5,border:`1.5px dashed ${T.b2}`,borderRadius:"50%",gap:4}}>
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-9-9v9z"/><path d="M21 12a9 9 0 00-9-9v9h9z"/></svg>
      <span style={{fontWeight:600}}>No data</span>
    </div>
  );
  let cumDeg=-90;
  const total=slices.reduce((s,sl)=>s+sl.value,0)||1;
  const toRad=d=>d*Math.PI/180;
  const arc=(startDeg,endDeg,outerR,innerR)=>{
    const s={x:cx+outerR*Math.cos(toRad(startDeg)),y:cy+outerR*Math.sin(toRad(startDeg))};
    const e={x:cx+outerR*Math.cos(toRad(endDeg)),y:cy+outerR*Math.sin(toRad(endDeg))};
    const si={x:cx+innerR*Math.cos(toRad(endDeg)),y:cy+innerR*Math.sin(toRad(endDeg))};
    const ei={x:cx+innerR*Math.cos(toRad(startDeg)),y:cy+innerR*Math.sin(toRad(startDeg))};
    const lg=(endDeg-startDeg)>180?1:0;
    return `M ${s.x} ${s.y} A ${outerR} ${outerR} 0 ${lg} 1 ${e.x} ${e.y} L ${si.x} ${si.y} A ${innerR} ${innerR} 0 ${lg} 0 ${ei.x} ${ei.y} Z`;
  };
  return(<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{slices.map((sl,i)=>{const deg=(sl.value/total)*360;const start=cumDeg;cumDeg+=deg;return <path key={i} d={arc(start,cumDeg-0.5,r,inner)} fill={sl.color} opacity={0.9}/>;})}<circle cx={cx} cy={cy} r={inner-1} fill={T.surface}/></svg>);
}
function CashLineChart({data,height=90}){
  if(!data||data.length<2) return (
    <div style={{padding:"18px 16px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:7}}>
      <div style={{width:36,height:36,borderRadius:"50%",border:`1.5px dashed ${T.b2}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      <div style={{fontSize:11.5,color:T.t3,fontWeight:600}}>{data?.length===1?"Add more data points":"No cash flow data yet"}</div>
    </div>
  );
  const maxV=Math.max(...data.flatMap(d=>[d.in,d.out]),1);
  const W=360,pad={top:10,bottom:22,left:8,right:8};
  const cW=W-pad.left-pad.right; const cH=height-pad.top-pad.bottom;
  const n=data.length;
  const px=(i)=>pad.left+(i/Math.max(n-1,1))*cW;
  const py=(v)=>pad.top+cH-(v/maxV)*cH;
  const linePoints=(key)=>data.map((d,i)=>`${px(i)},${py(d[key])}`).join(' ');
  const areaPath=(key,fillY)=>{const pts=data.map((d,i)=>`${px(i)},${py(d[key])}`);return `M${px(0)},${fillY} L${pts.join(' L')} L${px(n-1)},${fillY} Z`;};
  return(<svg width="100%" viewBox={`0 0 ${W} ${height}`} style={{overflow:"visible"}}>{[0,0.5,1].map((p,i)=>(<line key={i} x1={pad.left} y1={pad.top+cH*p} x2={W-pad.right} y2={pad.top+cH*p} stroke={T.b1} strokeWidth={0.7} strokeDasharray={p===0?"0":"3,3"}/>))}<path d={areaPath("in",pad.top+cH)} fill={T.grn} opacity={0.1}/><polyline points={linePoints("in")} fill="none" stroke={T.grn} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><path d={areaPath("out",pad.top+cH)} fill={T.red} opacity={0.1}/><polyline points={linePoints("out")} fill="none" stroke={T.red} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,2"/>{data.map((d,i)=>(<g key={i}><circle cx={px(i)} cy={py(d.in)} r={3} fill={T.grn}/><circle cx={px(i)} cy={py(d.out)} r={3} fill={T.red}/><text x={px(i)} y={height-5} textAnchor="middle" fontSize={9} fill={T.t4} fontFamily="'Segoe UI',sans-serif">{d.month}</text></g>))}</svg>);
}
function FinanceBarChart({data,height=130}){
  if(!data||data.length<1) return (
    <div style={{padding:"36px 16px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
      <div style={{width:38,height:38,borderRadius:"50%",border:`1.5px dashed ${T.b2}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-6"/></svg>
      </div>
      <div style={{fontSize:11.5,color:T.t3,fontWeight:600}}>No revenue/expense yet</div>
      <div style={{fontSize:10.5,color:T.t4}}>Add transactions to see trends</div>
    </div>
  );
  const maxV=Math.max(...data.map(d=>Math.max(d.sales,d.expense)),1);
  const bW=18,gap=5,groupGap=20;
  const total=data.length; const W=total*(bW*3+gap*2+groupGap)+20;
  const pad={top:16,bottom:22,left:6,right:6}; const cH=height-pad.top-pad.bottom;
  const sy=v=>pad.top+cH-(v/maxV)*cH; const bH=v=>(v/maxV)*cH;
  let x=pad.left+6;
  return(<svg width="100%" viewBox={`0 0 ${W} ${height}`} style={{overflow:"visible"}}>{[0,0.5,1].map((p,i)=>(<line key={i} x1={pad.left} y1={pad.top+cH*p} x2={W-pad.right} y2={pad.top+cH*p} stroke={T.b1} strokeWidth={0.8} strokeDasharray={p===0?"0":"3,3"}/>))}{data.map((d,i)=>{const x1=x,x2=x+bW+gap,x3=x+bW*2+gap*2;const margin=d.sales-d.expense;const mH=Math.abs((margin/maxV)*cH);const mY=margin>=0?sy(d.sales)-mH:sy(d.sales);const cx=x+bW*1.5+gap;x+=bW*3+gap*2+groupGap;return(<g key={i}><rect x={x1} y={sy(d.sales)} width={bW} height={bH(d.sales)} rx={2} fill={T.blu} opacity={0.8}/><rect x={x2} y={sy(d.expense)} width={bW} height={bH(d.expense)} rx={2} fill={T.redM} opacity={0.9}/><rect x={x3} y={margin>=0?sy(margin):pad.top+cH} width={bW} height={mH} rx={2} fill={margin>=0?T.grn:T.red} opacity={0.85}/><text x={cx} y={height-5} textAnchor="middle" fontSize={9} fill={T.t4} fontFamily="'Segoe UI',sans-serif">{d.month}</text></g>);})}</svg>);
}
function ProjectMiniCard({p,onClick}){
  const sm=STATUS_META[p.status]||STATUS_META["Ongoing"];
  const margin=p.boq-p.expense; const marginPct=p.boq>0?((margin/p.boq)*100).toFixed(0):0;
  const progressColor=p.progress===100?T.grn:p.progress>60?T.blu:p.progress>30?T.amb:T.red;
  return(<div onClick={onClick} style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,padding:"11px 13px",cursor:"pointer",transition:"box-shadow 0.15s",borderLeft:`3px solid ${sm.c}`}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 3px 12px rgba(0,0,0,0.1)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:7}}><div style={{flex:1,paddingRight:8}}><div style={{fontSize:12.5,fontWeight:600,color:T.t1,lineHeight:1.3,marginBottom:2}}>{p.name}</div><div style={{fontSize:10.5,color:T.t4}}>{p.client} · {p.city}</div></div><Pill label={p.status} c={sm.c} bg={sm.bg} brd={sm.brd}/></div><div style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Progress</span><span style={{fontSize:11,fontWeight:700,color:progressColor}}>{p.progress}%</span></div><Bar pct={p.progress} color={progressColor}/></div><div style={{display:"flex",gap:10}}><div style={{flex:1}}><div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:1}}>BOQ</div><div style={{fontSize:12,fontWeight:600,color:T.t1}}>₹{fmt(p.boq)}</div></div><div style={{flex:1}}><div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:1}}>Spent</div><div style={{fontSize:12,fontWeight:600,color:T.amb}}>₹{fmt(p.expense)}</div></div><div style={{flex:1}}><div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:1}}>Margin</div><div style={{fontSize:12,fontWeight:700,color:margin>0?T.grn:T.red}}>{marginPct}%</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:1}}>PM</div><div style={{fontSize:11,fontWeight:500,color:T.t3}}>{p.pm.split(" ")[0]}</div></div></div></div>);
}


// ── LOGIN ─────────────────────────────────────────────────────────────
function LoginScreen({onLogin}){
  // stage: 'mobile' | 'choose' | 'password' | 'otp'
  const [stage,setStage]=useState("mobile");
  const [mobile,setMobile]=useState("");
  const [pass,setPass]=useState("");
  const [otp,setOtp]=useState("");
  const [show,setShow]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [info,setInfo]=useState("");
  const [devOtp,setDevOtp]=useState("");

  const resetMsgs=()=>{setError("");setInfo("");};
  const goBack=()=>{resetMsgs();setStage(stage==="password"||stage==="otp"?"choose":"mobile");};

  // Stage 1 → Stage 2: validate mobile
  const handleMobileNext=()=>{
    resetMsgs();
    if(!/^[6-9]\d{9}$/.test(mobile)){setError("Enter a valid 10-digit mobile number");return;}
    setStage("choose");
  };

  // Stage 2 → Stage 3: request OTP (if OTP path)
  const handleRequestOtp=async()=>{
    resetMsgs();setLoading(true);
    try{
      const res=await api.requestOtp(mobile);
      if(res.success){
        setStage("otp");
        setInfo("OTP sent to your mobile");
        if(res.dev_otp)setDevOtp(res.dev_otp);
      }else{setError(res.message||"Could not send OTP");}
    }catch(err){setError("Server not reachable. Please try again.");}
    setLoading(false);
  };

  // Stage 3a: password login
  const handlePasswordLogin=async()=>{
    resetMsgs();
    if(!pass){setError("Enter password");return;}
    setLoading(true);
    try{
      const res=await api.loginPassword(mobile,pass);
      if(res.success){onLogin(res.user,res.companies);}
      else{setError(res.message||"Login failed");}
    }catch(err){setError("Server not reachable. Please try again.");}
    setLoading(false);
  };

  // Stage 3b: OTP login
  const handleOtpLogin=async()=>{
    resetMsgs();
    if(!/^\d{4}$/.test(otp)){setError("Enter the 4-digit OTP");return;}
    setLoading(true);
    try{
      const res=await api.loginOtp(mobile,otp);
      if(res.success){onLogin(res.user,res.companies);}
      else{setError(res.message||"Invalid OTP");}
    }catch(err){setError("Server not reachable. Please try again.");}
    setLoading(false);
  };

  const inputStyle={width:"100%",padding:"11px 14px",borderRadius:9,border:`1.5px solid ${C.b}`,fontSize:13,color:C.t,background:T.sltL,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
  const labelStyle={fontSize:11,fontWeight:600,color:C.tm,letterSpacing:"0.6px",textTransform:"uppercase",display:"block",marginBottom:6};
  const primaryBtn=(disabled)=>({width:"100%",padding:"13px",borderRadius:9,background:disabled?C.tl:`linear-gradient(135deg,${C.p},${C.p2})`,color:"white",fontSize:14,fontWeight:700,border:"none",cursor:disabled?"not-allowed":"pointer"});
  const secondaryBtn={width:"100%",padding:"13px",borderRadius:9,background:"white",color:C.p,fontSize:14,fontWeight:700,border:`1.5px solid ${C.p}`,cursor:"pointer",marginTop:10};

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.sb} 0%,#1B3A5C 50%,${C.p} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:"rgba(255,255,255,0.97)",borderRadius:20,padding:"44px 40px",width:400,boxShadow:"0 32px 80px rgba(0,0,0,0.35)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:62,height:62,borderRadius:16,background:`linear-gradient(135deg,${C.p},${C.a})`,marginBottom:14}}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/></svg></div>
          <div style={{fontSize:21,fontWeight:800,color:C.t}}>Sanchalan</div>
          <div style={{fontSize:12,color:C.tl,marginTop:3}}>Business Management Platform</div>
        </div>

        {error&&<div style={{background:T.redL,color:T.red,padding:"10px 14px",borderRadius:8,fontSize:12.5,marginBottom:16,border:`1px solid ${T.redM}`}}>{error}</div>}
        {info&&<div style={{background:"#E8F5E9",color:"#2E7D32",padding:"10px 14px",borderRadius:8,fontSize:12.5,marginBottom:16,border:"1px solid #A5D6A7"}}>{info}</div>}
        {devOtp&&stage==="otp"&&<div style={{background:"#FFF8E1",color:"#795548",padding:"10px 14px",borderRadius:8,fontSize:12,marginBottom:16,border:"1px dashed #FFB300"}}>DEV OTP: <b>{devOtp}</b></div>}

        {stage==="mobile"&&(
          <>
            <div style={{marginBottom:26}}>
              <label style={labelStyle}>Mobile Number</label>
              <input type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile" value={mobile} onChange={e=>setMobile(e.target.value.replace(/\D/g,""))} style={inputStyle} onKeyDown={e=>e.key==="Enter"&&handleMobileNext()} autoFocus/>
            </div>
            <button onClick={handleMobileNext} style={primaryBtn(false)}>Next</button>
          </>
        )}

        {stage==="choose"&&(
          <>
            <div style={{fontSize:13,color:C.tm,textAlign:"center",marginBottom:20}}>+91 {mobile} <button onClick={()=>{setStage("mobile");resetMsgs();}} style={{background:"none",border:"none",color:C.p,fontSize:12,fontWeight:600,cursor:"pointer",marginLeft:6}}>Change</button></div>
            <button onClick={()=>{setStage("password");resetMsgs();}} style={primaryBtn(false)}>Login with Password</button>
            <button onClick={handleRequestOtp} disabled={loading} style={secondaryBtn}>{loading?"Sending OTP...":"Login with OTP"}</button>
          </>
        )}

        {stage==="password"&&(
          <>
            <div style={{fontSize:13,color:C.tm,textAlign:"center",marginBottom:20}}>+91 {mobile} <button onClick={goBack} style={{background:"none",border:"none",color:C.p,fontSize:12,fontWeight:600,cursor:"pointer",marginLeft:6}}>Change</button></div>
            <div style={{marginBottom:22}}>
              <label style={labelStyle}>Password</label>
              <div style={{position:"relative"}}>
                <input type={show?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} style={{...inputStyle,padding:"11px 40px 11px 14px"}} onKeyDown={e=>e.key==="Enter"&&handlePasswordLogin()} autoFocus/>
                <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.tl,display:"flex"}}>{show?<IcEyeX size={17}/>:<IcEye size={17}/>}</button>
              </div>
            </div>
            <button onClick={handlePasswordLogin} disabled={loading} style={primaryBtn(loading)}>{loading?"Logging in...":"Login"}</button>
          </>
        )}

        {stage==="otp"&&(
          <>
            <div style={{fontSize:13,color:C.tm,textAlign:"center",marginBottom:20}}>+91 {mobile} <button onClick={goBack} style={{background:"none",border:"none",color:C.p,fontSize:12,fontWeight:600,cursor:"pointer",marginLeft:6}}>Change</button></div>
            <div style={{marginBottom:22}}>
              <label style={labelStyle}>Enter OTP (4-digit)</label>
              <input type="tel" inputMode="numeric" maxLength={4} placeholder="••••" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,""))} style={{...inputStyle,letterSpacing:"8px",textAlign:"center",fontSize:18,fontWeight:700}} onKeyDown={e=>e.key==="Enter"&&handleOtpLogin()} autoFocus/>
            </div>
            <button onClick={handleOtpLogin} disabled={loading} style={primaryBtn(loading)}>{loading?"Verifying...":"Verify & Login"}</button>
            <div style={{textAlign:"center",marginTop:14}}>
              <button onClick={handleRequestOtp} disabled={loading} style={{background:"none",border:"none",color:C.p,fontSize:12,fontWeight:600,cursor:loading?"not-allowed":"pointer"}}>Resend OTP</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── QUICK SEARCH (Ctrl+K) ─────────────────────────────────────────────
const SEARCH_ITEMS=[
  {id:"dashboard", label:"Dashboard",     icon:"M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z", sc:"Alt+H", section:"Navigation"},
  {id:"projects",  label:"Projects",      icon:"M3 7h18M3 12h18M3 17h18",                                 sc:"Alt+J", section:"Navigation"},
  {id:"finance",   label:"Finance",       icon:"M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",  sc:"Alt+F", section:"Finance & Ops"},
  {id:"procurement",label:"Procurement",  icon:"M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18",  sc:"Alt+P", section:"Finance & Ops"},
  {id:"warehouse", label:"Warehouse",     icon:"M3 21V8l9-5 9 5v13M9 21v-6h6v6",                          sc:"Alt+W", section:"Finance & Ops"},
  {id:"township",  label:"Township CRM",  icon:"M3 21h18M5 21V7l6-4v18M19 21V11l-6-4",                    sc:"Alt+G", section:"Finance & Ops"},
  {id:"payroll",   label:"Team & HR",     icon:"M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2",    sc:"Alt+Y", section:"Finance & Ops"},
  {id:"crm",       label:"CRM",           icon:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2",                sc:"Alt+C", section:"Navigation"},
  {id:"design",    label:"Design",        icon:"M12 19l7-7 3 3-7 7-3-3z",                                 sc:"Alt+D", section:"Navigation"},
  {id:"team",      label:"My Team", icon:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2",                sc:"Alt+T", section:"Navigation"},
  {id:"mom",       label:"MOM",           icon:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7",    sc:"Alt+M", section:"Navigation"},
  {id:"reports",   label:"Reports",       icon:"M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5",           sc:"Alt+B", section:"Reports"},
  {id:"library",   label:"Library",       icon:"M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5",            sc:"Alt+L", section:"Reports"},
  {id:"settings",  label:"Settings",      icon:"M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0", sc:"Alt+S", section:"Reports"},
];

function QuickSearch({onNavigate, onClose}){
  const [q,setQ]=useState("");
  const [idx,setIdx]=useState(0);
  const inputRef=useRef(null);

  const filtered=q.trim()
    ?SEARCH_ITEMS.filter(i=>i.label.toLowerCase().includes(q.toLowerCase())||i.section.toLowerCase().includes(q.toLowerCase()))
    :SEARCH_ITEMS;

  useEffect(()=>{
    inputRef.current?.focus();
    const handler=(e)=>{
      if(e.key==="ArrowDown"){e.preventDefault();setIdx(i=>Math.min(i+1,filtered.length-1));}
      if(e.key==="ArrowUp"){e.preventDefault();setIdx(i=>Math.max(i-1,0));}
      if(e.key==="Enter"&&filtered[idx]){onNavigate(filtered[idx].id);}
      if(e.key==="Escape"){onClose();}
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[filtered,idx]);

  useEffect(()=>setIdx(0),[q]);

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,backdropFilter:"blur(4px)"}}/>
    <div style={{position:"fixed",top:"18%",left:"50%",transform:"translateX(-50%)",width:520,maxWidth:"92vw",background:"#1E293B",borderRadius:14,boxShadow:"0 24px 80px rgba(0,0,0,0.5)",zIndex:1001,overflow:"hidden",border:"1px solid rgba(255,255,255,0.1)"}}>
      {/* Search input */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round"><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
        <input ref={inputRef} value={q} onChange={e=>{setQ(e.target.value);}}
          placeholder="Search modules... (↑↓ navigate, Enter select)"
          style={{flex:1,background:"none",border:"none",outline:"none",color:"white",fontSize:14,fontFamily:"inherit",caretColor:"#3B82F6"}}/>
        <span style={{fontSize:10,color:"rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.07)",padding:"2px 7px",borderRadius:5,fontWeight:600}}>ESC</span>
      </div>
      {/* Results */}
      <div style={{maxHeight:360,overflowY:"auto",padding:"6px 0"}}>
        {filtered.length===0&&<div style={{padding:"28px 0",textAlign:"center",color:"rgba(255,255,255,0.3)",fontSize:13}}>No results for "{q}"</div>}
        {filtered.map((item,i)=>(
          <div key={item.id} onClick={()=>onNavigate(item.id)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",cursor:"pointer",background:i===idx?"rgba(59,130,246,0.2)":"none",transition:"background 0.1s",borderLeft:i===idx?"3px solid #3B82F6":"3px solid transparent"}}
            onMouseEnter={()=>setIdx(i)}>
            <span style={{width:30,height:30,borderRadius:8,background:"rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={i===idx?"#60A5FA":"rgba(255,255,255,0.45)"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
            </span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:i===idx?"white":"rgba(255,255,255,0.75)"}}>{item.label}</div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.3)",marginTop:1}}>{item.section}</div>
            </div>
            <span style={{fontSize:9.5,color:"rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.06)",padding:"2px 7px",borderRadius:5}}>{item.sc}</span>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{padding:"8px 16px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:14,alignItems:"center"}}>
        {[["↑↓","Navigate"],["↵","Open"],["Esc","Close"]].map(([k,l])=>(
          <span key={k} style={{display:"flex",alignItems:"center",gap:5,fontSize:10.5,color:"rgba(255,255,255,0.3)"}}>
            <span style={{background:"rgba(255,255,255,0.08)",borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.4)"}}>{k}</span>{l}
          </span>
        ))}
        <span style={{marginLeft:"auto",fontSize:10,color:"rgba(255,255,255,0.2)"}}>Ctrl+K to open anytime</span>
      </div>
    </div>
  </>);
}

// ── SHORTCUT CHEATSHEET (? key) ──────────────────────────────────────
function ShortcutCheatsheet({onClose}){
  const GLOBAL=[
    ["Alt+H","Dashboard"],["Alt+J","Projects"],["Alt+F","Finance"],["Alt+P","Procurement"],
    ["Alt+W","Warehouse"],["Alt+Y","Payroll"],["Alt+C","CRM"],["Alt+D","Design"],
    ["Alt+T","My Team"],["Alt+M","MOM"],["Alt+B","Reports"],["Alt+L","Library"],["Alt+S","Settings"],
  ];
  const PROJ=[
    ["Ctrl+O","Overview"],["Ctrl+D","Design"],["Ctrl+E","Estimate"],["Ctrl+P","Party"],
    ["Ctrl+T","Transaction"],["Ctrl+K","To Do"],["Ctrl+J","Tasks"],["Ctrl+A","Attendance"],
    ["Ctrl+M","Material"],["Ctrl+B","Subcon"],["Ctrl+Q","Equipment"],["Ctrl+I","Files"],
    ["Ctrl+Y","Site/DPR"],["Ctrl+N","MOM"],
  ];
  const GENERAL=[
    ["Ctrl+K","Quick Search"],["?","This cheatsheet"],["Escape","Back / Close"],
  ];

  const KBD=({k})=>(
    <span style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:5,padding:"2px 8px",fontSize:10.5,fontWeight:700,color:"rgba(255,255,255,0.85)",fontFamily:"monospace",whiteSpace:"nowrap"}}>{k}</span>
  );
  const Section=({title,items,color})=>(
    <div>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color,marginBottom:8}}>{title}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 12px"}}>
        {items.map(([k,l])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}>
            <KBD k={k}/>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.55)"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,backdropFilter:"blur(4px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:580,maxWidth:"94vw",background:"#0F172A",borderRadius:16,boxShadow:"0 30px 90px rgba(0,0,0,0.6)",zIndex:1001,overflow:"hidden",border:"1px solid rgba(255,255,255,0.1)"}}>
      {/* Header */}
      <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:"white"}}>Keyboard Shortcuts</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:2}}>Sanchalan — Press ? to toggle</div>
        </div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:7,padding:"5px 10px",color:"rgba(255,255,255,0.5)",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>ESC</button>
      </div>
      {/* Content */}
      <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:20,maxHeight:"70vh",overflowY:"auto"}}>
        <Section title="General" items={GENERAL} color="#60A5FA"/>
        <div style={{height:1,background:"rgba(255,255,255,0.06)"}}/>
        <Section title="Global Navigation (Alt + Key)" items={GLOBAL} color="#34D399"/>
        <div style={{height:1,background:"rgba(255,255,255,0.06)"}}/>
        <Section title="Project Detail Tabs (Ctrl + Key)" items={PROJ} color="#F59E0B"/>
      </div>
      {/* Footer */}
      <div style={{padding:"10px 20px",borderTop:"1px solid rgba(255,255,255,0.06)",textAlign:"center"}}>
        <span style={{fontSize:10.5,color:"rgba(255,255,255,0.2)"}}>Shortcuts are disabled when typing in input fields</span>
      </div>
    </div>
  </>);
}

// ── SIDEBAR ───────────────────────────────────────────────────────────
function Sidebar({active,setActive,collapsed,setCollapsed,user,onLogout,enabledModules,isMobile,companies,onSwitchCompany}){
  const [showSwitcher,setShowSwitcher]=useState(false);
  const [showCreateCo,setShowCreateCo]=useState(false);
  const [newCo,setNewCo]=useState({name:"",domain:"surya_ghar",city:""});
  const [creating,setCreating]=useState(false);
  const [showProfileMenu,setShowProfileMenu]=useState(false);
  const switcherRef=useRef(null);
  const profileMenuRef=useRef(null);

  // Close switcher on outside click
  useEffect(()=>{
    if(!showSwitcher) return;
    const handler=(e)=>{if(switcherRef.current&&!switcherRef.current.contains(e.target)) setShowSwitcher(false);};
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[showSwitcher]);

  // Close profile menu on outside click
  useEffect(()=>{
    if(!showProfileMenu) return;
    const handler=(e)=>{if(profileMenuRef.current&&!profileMenuRef.current.contains(e.target)) setShowProfileMenu(false);};
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[showProfileMenu]);

  const domainIcons={"surya_ghar":"☀️","surya_ghar_plus":"☀️","solar_commercial":"⚡","construction_individual":"🏗️","housing_projects":"🏠"};
  const domainColors={"surya_ghar":"#E65100","surya_ghar_plus":"#FF8F00","solar_commercial":"#1565C0","construction_individual":"#2E7D32","housing_projects":"#6A1B9A"};
  const DOMAINS=[
    {id:"surya_ghar",label:"Surya Ghar Yojana"},
    {id:"surya_ghar_plus",label:"Surya Ghar + Other Solar"},
    {id:"solar_commercial",label:"Commercial Solar"},
    {id:"construction_individual",label:"Individual Contractor"},
    {id:"housing_projects",label:"Housing Projects"},
  ];
  const activeDomain = user?.company_domain || "construction_individual";
  const activeIcon = domainIcons[activeDomain] || "🏗️";
  const activeColor = domainColors[activeDomain] || C.p;

  const handleCreate=async()=>{
    if(!newCo.name.trim()||creating) return;
    setCreating(true);
    try{
      const res=await api.post("/auth/create-company",newCo);
      if(res.success){
        setShowCreateCo(false);
        setNewCo({name:"",domain:"surya_ghar",city:""});
        // Switch to new company
        if(res.data?.company_id) onSwitchCompany(res.data.company_id);
      }
    }catch(e){}
    setCreating(false);
  };

  // Filter nav items — disabled modules hidden from sidebar
  const MODULE_MAP_NAV={
    dashboard:"Dashboard",projects:"Projects",design:"Design",
    finance:"Finance",procurement:"Procurement",warehouse:"Warehouse",
    reports:"Reports",library:"Library",settings:"Settings",
    crm:"CRM",mom:"MOM",payroll:"Team & HR",team:"Team & HR",
    township:"Township CRM"
  };
  const isVisible=(id)=>{
    if(id==="saas") return user?.role==="super_admin";
    // Admins always see everything
    if(["admin","super_admin"].includes(user?.role)) return true;
    // Company-level module toggle
    if(enabledModules && enabledModules[id]===false) return false;
    // Role-based permission check from DB (Settings → Roles & Access)
    const perms = user?.module_permissions;
    const modName = MODULE_MAP_NAV[id];
    if(perms && modName){
      // Only gate modules actually configured in the matrix. A module with NO
      // row (not added to Settings yet) stays VISIBLE by default — unconfigured
      // is NOT blocked. An explicit row with view=0 still hides it.
      if(perms[modName] !== undefined) return !!(perms[modName].view);
      return true;
    }
    // Unmapped nav item → visible by default. Perms not loaded → ALWAYS_ON.
    if(!modName) return true;
    return ALWAYS_ON.includes(id);
  };
  const mobileHidden = isMobile && collapsed;
  const handleNav=(id)=>{setActive(id); if(isMobile) setCollapsed(true);};
  const showLabel=isMobile||!collapsed;
  return(<>
    {isMobile&&!collapsed&&<div onClick={()=>setCollapsed(true)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:199,transition:"opacity 0.2s"}}/>}
    <div style={{
      width:mobileHidden?0:(collapsed&&!isMobile)?60:220,
      minHeight:"100vh",background:"#1E293B",display:"flex",flexDirection:"column",
      transition:"all 0.25s cubic-bezier(.4,0,.2,1)",overflow:"hidden",flexShrink:0,
      boxShadow:"2px 0 16px rgba(0,0,0,0.18)",zIndex:200,
      ...(isMobile?{position:"fixed",left:mobileHidden?-240:0,top:0,bottom:0,width:mobileHidden?0:240}:{}),
    }}>
      {/* Company header with switcher — matches project sidebar style */}
      <div ref={switcherRef} style={{position:"relative"}}>
        <div onClick={()=>{if(showLabel) setShowSwitcher(!showSwitcher);}}
          style={{padding:(!isMobile&&collapsed)?"10px 0":"10px 12px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid rgba(255,255,255,0.08)",minHeight:48,justifyContent:(!isMobile&&collapsed)?"center":"flex-start",cursor:showLabel?"pointer":"default",transition:"background .15s"}}
          onMouseEnter={e=>{if(showLabel) e.currentTarget.style.background="rgba(255,255,255,0.04)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
          <div style={{width:32,height:32,borderRadius:7,background:`linear-gradient(135deg,${activeColor},${activeColor}99)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:15}}>{activeIcon}</div>
          {showLabel&&<div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <span style={{color:"#fff",fontWeight:700,fontSize:13.5,letterSpacing:"-.1px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.company_name||"Company"}</span>
            <span style={{color:"rgba(255,255,255,0.4)",fontSize:9.5,fontWeight:600,letterSpacing:".5px",textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(DOMAINS.find(d=>d.id===activeDomain)||{}).label||"Construction"}</span>
          </div>}
          {showLabel&&<svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5}><path d={showSwitcher?"M2 8l4-4 4 4":"M2 4l4 4 4-4"}/></svg>}
        </div>

        {/* Company switcher dropdown */}
        {showSwitcher&&showLabel&&(
          <div style={{position:"absolute",top:"100%",left:8,right:8,background:"#1E293B",borderRadius:10,boxShadow:"0 12px 40px rgba(0,0,0,0.5)",zIndex:250,border:"1px solid rgba(255,255,255,0.1)",overflow:"hidden",animation:"fadeIn .15s ease"}}>
            <div style={{padding:"8px 10px 4px",fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:"1px",textTransform:"uppercase"}}>Your Companies</div>
            {(companies||[]).map(co=>{
              const isActive=co.id===user?.company_id;
              const icon=domainIcons[co.domain]||"🏗️";
              const clr=domainColors[co.domain]||C.p;
              return(
                <div key={co.id} onClick={()=>{if(!isActive){onSwitchCompany(co.id);setShowSwitcher(false);}}}
                  style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",cursor:isActive?"default":"pointer",background:isActive?"rgba(255,255,255,0.08)":"transparent",transition:"background .12s",borderLeft:isActive?`3px solid ${clr}`:"3px solid transparent"}}
                  onMouseEnter={e=>{if(!isActive) e.currentTarget.style.background="rgba(255,255,255,0.05)";}}
                  onMouseLeave={e=>{if(!isActive) e.currentTarget.style.background="transparent";}}>
                  <div style={{width:28,height:28,borderRadius:7,background:`linear-gradient(135deg,${clr},${clr}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:isActive?700:500,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{co.name}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>{co.domain_label||co.domain} · {co.role}</div>
                  </div>
                  {isActive&&<div style={{width:7,height:7,borderRadius:"50%",background:"#22C55E",boxShadow:"0 0 0 2px rgba(34,197,94,0.3)",flexShrink:0}}/>}
                </div>
              );
            })}
            <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",padding:"4px 6px"}}>
              {!showCreateCo?(
                <button onClick={()=>setShowCreateCo(true)}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 8px",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:500,borderRadius:6,transition:"all .12s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="white";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="rgba(255,255,255,0.5)";}}>
                  <div style={{width:28,height:28,borderRadius:7,border:"1.5px dashed rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>+</div>
                  Create New Company
                </button>
              ):(
                <div style={{padding:"8px 6px"}}>
                  <input value={newCo.name} onChange={e=>setNewCo(p=>({...p,name:e.target.value}))} placeholder="Company name"
                    style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.06)",color:"white",fontSize:12,outline:"none",boxSizing:"border-box",marginBottom:6,fontFamily:"inherit"}}/>
                  <select value={newCo.domain} onChange={e=>setNewCo(p=>({...p,domain:e.target.value}))}
                    style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.06)",color:"white",fontSize:12,outline:"none",boxSizing:"border-box",marginBottom:6,fontFamily:"inherit"}}>
                    {DOMAINS.map(d=><option key={d.id} value={d.id}>{domainIcons[d.id]} {d.label}</option>)}
                  </select>
                  <input value={newCo.city} onChange={e=>setNewCo(p=>({...p,city:e.target.value}))} placeholder="City (optional)"
                    style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.06)",color:"white",fontSize:12,outline:"none",boxSizing:"border-box",marginBottom:6,fontFamily:"inherit"}}/>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setShowCreateCo(false)} style={{flex:1,padding:"6px",borderRadius:6,background:"rgba(255,255,255,0.08)",border:"none",color:"rgba(255,255,255,0.5)",fontSize:11,cursor:"pointer"}}>Cancel</button>
                    <button onClick={handleCreate} disabled={creating} style={{flex:2,padding:"6px",borderRadius:6,background:"#3B82F6",border:"none",color:"white",fontSize:11,fontWeight:700,cursor:creating?"wait":"pointer"}}>{creating?"Creating...":"Create"}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <nav style={{flex:1,padding:"8px 0 12px",overflowY:"auto"}}>
        {NAV_GROUPS.map((grp,gi)=>{
          const visibleItems=grp.items.filter(item=>isVisible(item.id));
          const showLabel=isMobile||!collapsed;
          if(!visibleItems.length) return null;
          return(
            <div key={gi}>
              {grp.section&&showLabel&&(
                <div style={{color:"rgba(255,255,255,0.3)",fontSize:9,fontWeight:700,letterSpacing:"1.3px",textTransform:"uppercase",padding:gi>0?"16px 18px 6px":"6px 18px 6px"}}>{grp.section}</div>
              )}
              {visibleItems.map(item=>{
                const isA=active===item.id;
                return(
                  <button key={item.id} onClick={()=>handleNav(item.id)} title={item.sc?`${item.label}  (Alt+${item.sc})`:item.label}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:(!isMobile&&collapsed)?"10px 0":isMobile?"12px 16px":"9px 14px",background:isA?"rgba(59,130,246,0.22)":"none",border:"none",cursor:"pointer",color:isA?"#fff":"rgba(255,255,255,0.65)",transition:"background .12s, color .12s",position:"relative",justifyContent:(!isMobile&&collapsed)?"center":"flex-start",borderLeft:isA&&showLabel?`3px solid #3B82F6`:"3px solid transparent",fontFamily:"inherit",textAlign:"left"}}
                    onMouseEnter={e=>{if(!isA){e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="#fff";}}}
                    onMouseLeave={e=>{if(!isA){e.currentTarget.style.background="none";e.currentTarget.style.color="rgba(255,255,255,0.65)";}}}
                  >
                    <item.Icon size={isMobile?19:17} color="currentColor"/>
                    {showLabel&&<span style={{fontSize:isMobile?14:13,fontWeight:isA?600:450,flex:1,whiteSpace:"nowrap",letterSpacing:".1px"}}>{item.label}</span>}
                    {showLabel&&!isMobile&&item.sc&&!item.badge&&<span style={{fontSize:9,color:isA?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.25)",fontWeight:500,fontVariantNumeric:"tabular-nums",flexShrink:0}}>Alt+{item.sc}</span>}
                    {showLabel&&item.badge&&<span style={{background:item.bc,color:"white",fontSize:typeof item.badge==="number"?9.5:8.5,fontWeight:700,padding:"2px 7px",borderRadius:10,letterSpacing:typeof item.badge==="number"?0:".3px",fontVariantNumeric:"tabular-nums",flexShrink:0}}>{item.badge}</span>}
                    {isA&&!showLabel&&<div style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",width:3,height:22,background:"#3B82F6",borderRadius:"2px 0 0 2px"}}/>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
      {/* User profile — click opens menu with personal settings + logout */}
      <div ref={profileMenuRef} style={{position:"relative",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
        <div onClick={()=>{if(showLabel) setShowProfileMenu(!showProfileMenu);}}
          style={{padding:(!isMobile&&collapsed)?"10px 0":"10px 12px",display:"flex",alignItems:"center",gap:10,justifyContent:(!isMobile&&collapsed)?"center":"flex-start",cursor:showLabel?"pointer":"default",transition:"background .12s",background:showProfileMenu?"rgba(255,255,255,0.05)":"transparent"}}
          onMouseEnter={e=>{if(showLabel && !showProfileMenu) e.currentTarget.style.background="rgba(255,255,255,0.04)";}}
          onMouseLeave={e=>{if(!showProfileMenu) e.currentTarget.style.background="transparent";}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.a},#FF8F00)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,fontWeight:700,color:"white"}}>{(user?.name||"U")[0].toUpperCase()}</div>
          {showLabel&&<div style={{flex:1,minWidth:0,overflow:"hidden"}}>
            <div style={{color:"#fff",fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-.1px"}}>{user?.name||"User"}</div>
            <div style={{color:"rgba(255,255,255,0.4)",fontSize:9.5,fontWeight:600,letterSpacing:".5px",textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.role||"User"}</div>
          </div>}
          {showLabel&&<svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5}><path d={showProfileMenu?"M2 4l4 4 4-4":"M2 8l4-4 4 4"}/></svg>}
        </div>

        {/* Profile menu popover (opens upward) */}
        {showProfileMenu&&showLabel&&(
          <div style={{position:"absolute",bottom:"100%",left:8,right:8,marginBottom:6,background:"#0F172A",borderRadius:9,boxShadow:"0 -8px 30px rgba(0,0,0,0.4)",border:"1px solid rgba(255,255,255,0.08)",overflow:"hidden",animation:"fadeIn .12s ease"}}>
            <div style={{padding:"10px 12px 8px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{color:"#fff",fontSize:12,fontWeight:700}}>{user?.name||"User"}</div>
              <div style={{color:"rgba(255,255,255,0.45)",fontSize:10.5,marginTop:1}}>{user?.email||user?.phone||""}</div>
            </div>
            <button onClick={()=>{setShowProfileMenu(false);handleNav("profile");}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.75)",fontSize:12,fontFamily:"inherit",textAlign:"left",transition:"background .12s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="rgba(255,255,255,0.75)";}}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>My Profile</span>
            </button>
            {["admin","super_admin"].includes(user?.role)&&<button onClick={()=>{setShowProfileMenu(false);handleNav("settings");}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.75)",fontSize:12,fontFamily:"inherit",textAlign:"left",transition:"background .12s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="rgba(255,255,255,0.75)";}}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              <span>Company Settings</span>
            </button>}
            {onLogout&&<div style={{borderTop:"1px solid rgba(255,255,255,0.06)"}}>
              <button onClick={()=>{setShowProfileMenu(false);onLogout();}}
                style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:"none",border:"none",cursor:"pointer",color:"#F87171",fontSize:12,fontFamily:"inherit",fontWeight:600,textAlign:"left",transition:"background .12s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(220,38,38,0.15)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="none";}}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                <span>Logout</span>
              </button>
            </div>}
          </div>
        )}
      </div>
    </div>
  </>);
}


// ── TOPBAR ────────────────────────────────────────────────────────────
function TopBar({title,sub,collapsed,setCollapsed,alertCount,user,onLogout,onSearch,onCheatsheet,onNotificationNav,isMobile}){
  return(
    <div style={{height:60,background:T.surface,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",padding:isMobile?"0 14px":"0 20px",gap:isMobile?10:14,flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
      {!isMobile&&<button onClick={()=>setCollapsed(!collapsed)} style={{background:"none",border:"none",cursor:"pointer",color:T.t3,padding:7,borderRadius:7,display:"flex"}} onMouseEnter={e=>e.currentTarget.style.background=T.sltL} onMouseLeave={e=>e.currentTarget.style.background="none"}><IcMenu size={19}/></button>}
      <div style={{flex:1}}><div style={{fontSize:isMobile?13.5:15,fontWeight:700,color:T.t1}}>{title}</div>{!isMobile&&sub&&<div style={{fontSize:11,color:T.t3}}>{sub}</div>}</div>
      {isMobile?(
        <button onClick={onSearch} title="Search" style={{width:34,height:34,borderRadius:8,border:`1px solid ${T.b1}`,background:T.bg,cursor:"pointer",color:T.t3,display:"flex",alignItems:"center",justifyContent:"center"}} onMouseEnter={e=>e.currentTarget.style.background=T.sltL} onMouseLeave={e=>e.currentTarget.style.background=T.bg}><IcSearch size={17}/></button>
      ):(
        <button onClick={onSearch} title="Quick Search (Ctrl+K)"
          style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:8,border:`1px solid ${T.b1}`,background:T.bg,cursor:"pointer",color:T.t3,transition:"all 0.15s"}}
          onMouseEnter={e=>{e.currentTarget.style.background=T.sltL;e.currentTarget.style.borderColor=T.b2;}}
          onMouseLeave={e=>{e.currentTarget.style.background=T.bg;e.currentTarget.style.borderColor=T.b1;}}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={2} strokeLinecap="round"><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
          <span style={{fontSize:12,color:T.t4,whiteSpace:"nowrap"}}>Search...</span>
          <span style={{fontSize:9.5,background:T.b1,borderRadius:4,padding:"1px 6px",color:T.t4,fontWeight:600,letterSpacing:"0.3px"}}>Ctrl+K</span>
        </button>
      )}
      {!isMobile&&<button onClick={onCheatsheet} title="Keyboard Shortcuts (?)"
        style={{width:32,height:32,borderRadius:8,border:`1px solid ${T.b1}`,background:T.bg,cursor:"pointer",color:T.t3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,transition:"all 0.15s"}}
        onMouseEnter={e=>e.currentTarget.style.background=T.sltL}
        onMouseLeave={e=>e.currentTarget.style.background=T.bg}>?</button>}
      <NotificationBell onNavigate={onNotificationNav}/>
      <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.a},#FF8F00)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"white",cursor:"pointer"}}>{(user?.name||"U")[0].toUpperCase()}</div>
    </div>
  );
}

// ── MOBILE BOTTOM NAV ────────────────────────────────────────────────
function MobileBottomNav({active,setActive,enabledModules,user}){
  const [showMore,setShowMore]=useState(false);
  const MODULE_MAP_MOBILE={
    dashboard:"Dashboard",projects:"Projects",design:"Design",
    finance:"Finance",procurement:"Procurement",warehouse:"Warehouse",
    reports:"Reports",library:"Library",settings:"Settings",
    crm:"CRM",mom:"MOM",payroll:"Payroll"
  };
  const isVisible=(id)=>{
    if(id==="saas") return user?.role==="super_admin";
    if(["admin","super_admin"].includes(user?.role)) return true;
    if(enabledModules && enabledModules[id]===false) return false;
    const perms = user?.module_permissions;
    const modName = MODULE_MAP_MOBILE[id];
    if(perms && modName) return !!(perms[modName]?.view);
    return ALWAYS_ON.includes(id);
  };
  const moreItems=NAV_GROUPS.flatMap(g=>g.items).filter(item=>!BOTTOM_TABS.find(t=>t.id===item.id)&&isVisible(item.id));
  const isMoreActive=!BOTTOM_TABS.find(t=>t.id===active);
  const handleNav=(id)=>{setActive(id);setShowMore(false);};
  return(<>
    {showMore&&(<>
      <div onClick={()=>setShowMore(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:290}}/>
      <div style={{position:"fixed",bottom:"calc(60px + env(safe-area-inset-bottom,0px))",left:0,right:0,background:"#1E293B",borderRadius:"16px 16px 0 0",boxShadow:"0 -8px 32px rgba(0,0,0,0.4)",zIndex:291,animation:"slideUp .2s ease"}}>
        <div style={{padding:"12px 16px 8px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.4)",letterSpacing:"1px",textTransform:"uppercase"}}>More Modules</span>
          <button onClick={()=>setShowMore(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.4)",display:"flex",padding:4}}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",padding:"8px 0 12px"}}>
          {moreItems.map(item=>{
            const isA=active===item.id;
            return(<button key={item.id} onClick={()=>handleNav(item.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"14px 8px",background:isA?"rgba(59,130,246,0.15)":"none",border:"none",cursor:"pointer",color:isA?"#60A5FA":"rgba(255,255,255,0.6)",fontFamily:"inherit",transition:"color .12s"}}>
              <item.Icon size={22} color="currentColor"/>
              <span style={{fontSize:10,fontWeight:isA?700:500}}>{item.label}</span>
            </button>);
          })}
        </div>
      </div>
    </>)}
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:"#1E293B",borderTop:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 -4px 20px rgba(0,0,0,0.3)",paddingBottom:"env(safe-area-inset-bottom,0px)",display:"flex"}}>
      {BOTTOM_TABS.map(tab=>{
        const isA=active===tab.id;
        return(<button key={tab.id} onClick={()=>handleNav(tab.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,padding:"8px 0 10px",border:"none",cursor:"pointer",background:"none",color:isA?"#60A5FA":"rgba(255,255,255,0.45)",fontFamily:"inherit",borderTop:`2px solid ${isA?"#3B82F6":"transparent"}`,transition:"color .15s"}}>
          <tab.Icon size={21} color="currentColor"/>
          <span style={{fontSize:9.5,fontWeight:isA?700:500,letterSpacing:".2px"}}>{tab.label}</span>
        </button>);
      })}
      <button onClick={()=>setShowMore(s=>!s)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,padding:"8px 0 10px",border:"none",cursor:"pointer",background:"none",color:(isMoreActive||showMore)?"#60A5FA":"rgba(255,255,255,0.45)",fontFamily:"inherit",borderTop:`2px solid ${(isMoreActive||showMore)?"#3B82F6":"transparent"}`,transition:"color .15s"}}>
        <IcMenu size={21} color="currentColor"/>
        <span style={{fontSize:9.5,fontWeight:(isMoreActive||showMore)?700:500,letterSpacing:".2px"}}>More</span>
      </button>
    </div>
    <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
  </>);
}

// ── MODULE DISABLED SCREEN ────────────────────────────────────────────
function ModuleDisabled({name}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"70vh",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{textAlign:"center",maxWidth:380}}>
        <div style={{width:64,height:64,borderRadius:16,background:T.sltL,border:`1px solid ${T.b2}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <IcLock size={28} color={T.slt}/>
        </div>
        <div style={{fontSize:17,fontWeight:700,color:T.t1,marginBottom:6}}>{name} — Module Disabled</div>
        <div style={{fontSize:13,color:T.t3,lineHeight:1.6,marginBottom:20}}>This module is not enabled for your company. Contact your administrator to enable it from Settings &rarr; Module Access.</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,background:T.bluL,border:`1px solid ${T.bluM}`,fontSize:12.5,color:T.blu,fontWeight:600}}>
          <IcSet size={14} color={T.blu}/>
          Settings &rarr; Module Access
        </div>
      </div>
    </div>
  );
}

// ── DASHBOARD MODULE ──────────────────────────────────────────────────
function ProjectExpandedRow({p}){
  const margin=p.boq-p.expense; const marginPct=p.boq>0?((margin/p.boq)*100).toFixed(1):0;
  const spentPct=p.boq>0?((p.expense/p.boq)*100).toFixed(0):0;
  const sm=STATUS_META[p.status]||STATUS_META["Ongoing"];
  const progColor=p.progress===100?T.grn:p.progress>60?T.blu:p.progress>30?T.amb:T.red;
  const expSlices=[{label:"Material",value:p.expense*0.46,color:T.blu},{label:"Sub-Con",value:p.expense*0.30,color:T.pur},{label:"Labour",value:p.expense*0.15,color:T.grn},{label:"Site Exp",value:p.expense*0.06,color:T.amb},{label:"Equip",value:p.expense*0.03,color:T.slt}].filter(s=>s.value>0);
  return(
    <tr><td colSpan={10} style={{padding:0,background:T.bluL,borderBottom:`2px solid ${T.bluM}`}}>
      <div style={{padding:"14px 16px",display:"grid",gridTemplateColumns:"1fr 1fr 1.2fr 1fr",gap:14}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>Project Overview</div>
          <div style={{display:"flex",gap:10,marginBottom:10}}>
            {[{l:"BOQ Value",v:`₹${fmt(p.boq)}`,c:T.slt},{l:"Spent",v:`₹${fmt(p.expense)}`,c:T.amb},{l:"Margin",v:`₹${fmt(margin)}`,c:margin>0?T.grn:T.red}].map((s,i)=>(
              <div key={i} style={{flex:1,padding:"8px 10px",background:T.surface,borderRadius:7,borderTop:`3px solid ${s.c}`}}><div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:3}}>{s.l}</div><div style={{fontSize:14,fontWeight:700,color:s.c}}>{s.v}</div></div>
            ))}
          </div>
          <div style={{marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:T.t3}}>Progress</span><span style={{fontSize:12,fontWeight:700,color:progColor}}>{p.progress}%</span></div><div style={{height:8,background:T.b1,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${p.progress}%`,background:progColor,borderRadius:4}}/></div></div>
          <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:T.t3}}>Budget Used</span><span style={{fontSize:12,fontWeight:700,color:Number(spentPct)>90?T.red:T.t1}}>{spentPct}%</span></div><div style={{height:8,background:T.b1,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(spentPct,100)}%`,background:Number(spentPct)>90?T.red:Number(spentPct)>75?T.amb:T.blu,borderRadius:4}}/></div></div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>Expense Breakdown</div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <DonutChart slices={expSlices} size={100} cx={50} cy={50} r={36} inner={22}/>
            <div style={{flex:1}}>{expSlices.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}><div style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}/><span style={{fontSize:10.5,color:T.t3,flex:1}}>{s.label}</span><span style={{fontSize:10.5,fontWeight:600,color:T.t1}}>₹{fmt(s.value)}</span></div>))}</div>
          </div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>Monthly Spend Trend</div>
          {(()=>{const mData=[{month:"Oct",expense:p.expense*0.08},{month:"Nov",expense:p.expense*0.12},{month:"Dec",expense:p.expense*0.18},{month:"Jan",expense:p.expense*0.15},{month:"Feb",expense:p.expense*0.22},{month:"Mar",expense:p.expense*0.25}];const maxE=Math.max(...mData.map(d=>d.expense));const W=220,H=70,pad=8;const cW=W-pad*2,cH=H-pad-18;return(<svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>{mData.map((d,i)=>{const bW=24,x=pad+i*(cW/(mData.length-1))-bW/2;const bH=(d.expense/maxE)*cH;return(<g key={i}><rect x={x} y={pad+cH-bH} width={bW} height={bH} rx={2} fill={T.amb} opacity={0.7}/><text x={pad+i*(cW/(mData.length-1))} y={H-4} textAnchor="middle" fontSize={8.5} fill={T.t4} fontFamily="'Segoe UI',sans-serif">{d.month}</text></g>);})}</svg>);})()}
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>Details</div>
          {[["Client",p.client],["City",p.city],["Type",p.type],["PM",p.pm],["Start",p.start],["End",p.end],["Margin",`${marginPct}% (${margin>=0?"profit":"loss"})`]].map(([k,v])=>(<div key={k} style={{display:"flex",gap:8,padding:"4px 0",borderBottom:`1px solid ${T.bluM}`}}><span style={{width:52,fontSize:10.5,color:T.t4,flexShrink:0}}>{k}</span><span style={{fontSize:11,fontWeight:500,color:T.t1}}>{v}</span></div>))}
        </div>
      </div>
    </td></tr>
  );
}

// ══════════════════════════════════════════════════════════════════════
// DASHBOARD — two-view design: Finance vs Operations.
// NOTE: data below is hardcoded MOCK for design vision only. Wiring to
// real APIs is a follow-up step (replace MOCK_* with /dashboard/* calls).
// ══════════════════════════════════════════════════════════════════════
const MOCK_FIN = {
  kpis: [
    { label:"Total BOQ",      value:"₹1.1Cr",  sub:"5 projects",        color:T.slt, Icon:IcMargin, trend:"up",   trendVal:"+12%" },
    { label:"Total Received", value:"₹62.4L",  sub:"57% of BOQ",        color:T.grn, Icon:IcCash,   trend:"up",   trendVal:"+8%"  },
    { label:"Total Spent",    value:"₹48.9L",  sub:"44% of BOQ",        color:T.amb, Icon:IcTruck },
    { label:"Gross Margin",   value:"₹52.1L",  sub:"47.4% margin",      color:T.grn, Icon:IcTrend,  trend:"up",   trendVal:"47.4%" },
    { label:"Receivables",    value:"₹13.8L",  sub:"6 invoices due",    color:T.blu, Icon:IcPay },
    { label:"Payables",       value:"₹9.2L",   sub:"₹3.1L overdue",     color:T.red, Icon:IcAlert },
  ],
  cashflow: [
    { month:"Jan", in:820000, out:610000 }, { month:"Feb", in:940000, out:720000 },
    { month:"Mar", in:1180000, out:880000 }, { month:"Apr", in:760000, out:540000 },
    { month:"May", in:1320000, out:910000 }, { month:"Jun", in:1050000, out:680000 },
  ],
  expense: [
    { label:"Material Purchase", value:2240000, color:T.blu },
    { label:"Sub-Contractor",    value:1460000, color:T.pur },
    { label:"Direct Labour",     value:730000,  color:T.grn },
    { label:"Site Expenses",     value:290000,  color:T.amb },
    { label:"Equipment",         value:170000,  color:T.slt },
  ],
  payments: [
    { id:1, label:"RA Bill #12 — Skyline Apartments", desc:"Client receivable · due in 3d",  amount:480000, color:T.grn, dir:"in",  Icon:IcPay  },
    { id:2, label:"Abhay Traders — Material PO",       desc:"Vendor payable · overdue 2d",     amount:215000, color:T.red, dir:"out", Icon:IcTruck },
    { id:3, label:"Subcon RA — Verma Construction",    desc:"Approved · awaiting release",      amount:168000, color:T.amb, dir:"out", Icon:IcApprv },
    { id:4, label:"June Salary Run",                   desc:"5 staff · pending payout",         amount:56240,  color:T.amb, dir:"out", Icon:IcTeam },
  ],
  activity: [
    { id:1, title:"Payment received", desc:"RA Bill #11 — Skyline", project:"Skyline Apartments", time:"2h ago",  amount:520000, dir:"in",      icon:IcCash },
    { id:2, title:"Vendor paid",      desc:"Cement — Abhay Traders", project:"Harish Villa",      time:"5h ago",  amount:142000, dir:"out",     icon:IcTruck },
    { id:3, title:"Invoice raised",   desc:"RA Bill #12",            project:"Skyline Apartments", time:"Yesterday", amount:480000, dir:"pending", icon:IcPay },
    { id:4, title:"Advance settled",  desc:"Subcon — Verma",         project:"R K Rathor",        time:"2d ago",  amount:90000,  dir:"out",     icon:IcApprv },
  ],
};
const MOCK_OPS = {
  kpis: [
    { label:"Active Projects",  value:4,       sub:"Avg 47% progress", color:T.pur, Icon:IcProj },
    { label:"Present Today",    value:"18/22", sub:"82% attendance",   color:T.grn, Icon:IcTeam },
    { label:"Open Tasks",       value:23,      sub:"5 overdue",        color:T.amb, Icon:IcChk },
    { label:"Pending Approvals",value:6,       sub:"3 high priority",  color:T.red, Icon:IcApprv },
    { label:"Material Requests",value:5,       sub:"2 awaiting PO",    color:T.blu, Icon:IcProc },
    { label:"Low Stock Items",  value:3,       sub:"reorder needed",   color:T.amb, Icon:IcWH },
  ],
  projects: [
    { id:1, name:"Skyline Apartments", city:"Raipur", progress:72, status:"Ongoing",     tasks:"8 open",  delay:null,        pm:"Vijay" },
    { id:2, name:"Harish Villa",       city:"Bhilai", progress:45, status:"Ongoing",     tasks:"6 open",  delay:"2d behind", pm:"Priyanka" },
    { id:3, name:"R K Rathor",         city:"Bhilai", progress:30, status:"Ongoing",     tasks:"5 open",  delay:null,        pm:"Raganee" },
    { id:4, name:"Kewal Sahu",         city:"Bhilai", progress:0,  status:"Not Started", tasks:"4 open",  delay:null,        pm:"—" },
  ],
  attendance: { present:18, absent:2, leave:2, total:22, byDept:[
    { dept:"Site Engineers", present:5, total:6 }, { dept:"Supervisors", present:4, total:4 },
    { dept:"Office Staff", present:6, total:8 }, { dept:"Accounts", present:3, total:4 },
  ]},
  procurement: [
    { label:"Material Requests pending", value:5, color:T.blu },
    { label:"POs open",                  value:7, color:T.pur },
    { label:"GRNs today",                value:2, color:T.grn },
    { label:"Low-stock alerts",          value:3, color:T.amb },
  ],
  approvals: [
    { id:1, label:"MR-36 — Texture Paint",     desc:"Harish · 3 Kg",        time:"5h ago",  pri:"high"   },
    { id:2, label:"PO-12 — Modular Switches",  desc:"Kewal Sahu · ₹84K",    time:"6h ago",  pri:"high"   },
    { id:3, label:"Drawing R3 — Floor Plan",   desc:"Design · Skyline",     time:"Yesterday", pri:"med"  },
    { id:4, label:"Leave — Priyanka (2d)",     desc:"CL · 18–19 Jun",       time:"Yesterday", pri:"low"  },
  ],
  activity: [
    { id:1, title:"DPR submitted",   desc:"Slab casting — Block A", project:"Skyline Apartments", time:"1h ago",  icon:IcSite,  color:T.blu },
    { id:2, title:"Task completed",  desc:"Electrical rough-in",    project:"Harish Villa",       time:"3h ago",  icon:IcChk,   color:T.grn },
    { id:3, title:"Punch-in (GPS)",  desc:"Niranjan Kumar · on site", project:"R K Rathor",       time:"4h ago",  icon:IcTeam,  color:T.pur },
    { id:4, title:"GRN received",    desc:"Steel — 2.4 MT",         project:"Skyline Apartments", time:"Yesterday", icon:IcWH,  color:T.amb },
  ],
};

function DashboardModule(){
  const [view,setView]=useState("finance"); // finance | operations
  const [range,setRange]=useState("month");
  const [selProject,setSelProject]=useState("All");
  const [expandedProjId,setExpandedProjId]=useState(null);
  const [showAllActivity,setShowAllActivity]=useState(false);
  const [showAllActions,setShowAllActions]=useState(false);

  // ── Finance / Operations switch (shared header) ──
  const Switch=(
    <div style={{display:"inline-flex",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:3,boxShadow:"0 1px 2px rgba(0,0,0,0.04)",marginBottom:14}}>
      {[{v:"finance",l:"Finance",Icon:IcFin,c:T.blu},{v:"operations",l:"Operations & Team",Icon:IcProj,c:T.pur}].map(t=>(
        <button key={t.v} onClick={()=>setView(t.v)}
          style={{display:"flex",alignItems:"center",gap:7,padding:"8px 20px",border:"none",background:view===t.v?t.c:"transparent",color:view===t.v?"#fff":T.t3,borderRadius:8,fontSize:12.5,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
          <t.Icon size={15} color={view===t.v?"#fff":T.t3}/> {t.l}
        </button>
      ))}
    </div>
  );

  if(view==="operations"){
    return(
      <div style={{padding:"16px 20px",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
        {Switch}
        <OperationsDashboard ops={MOCK_OPS}/>
      </div>
    );
  }

  // ===== FINANCE VIEW (mock-populated for design vision) =====
  const dd={
    projects: MOCK_OPS.projects.map(p=>({...p, boq: 2000000+p.id*1500000, expense: 800000+p.id*600000, client:"—", type:"construction" })),
    cashflow: MOCK_FIN.cashflow, activities: MOCK_FIN.activity, pending_actions: MOCK_FIN.payments,
    alerts: ALERTS, material_status: MATERIAL_STATUS, expense_breakdown: MOCK_FIN.expense,
    cash_balance: 1240000, overdue_amount: 310000,
  };
  const projectsArr=dd.projects||PROJECTS_DATA;
  const cashflowArr=dd.cashflow||CASHFLOW_DATA;
  const activityArr=dd.activities||ACTIVITY_FEED;
  const pendingArr=dd.pending_actions||PENDING_ACTIONS;
  const projects=["All",...projectsArr.map(p=>p.name)];
  const filteredProjects=selProject==="All"?projectsArr:projectsArr.filter(p=>p.name===selProject);
  const num=(v)=>{const n=Number(v);return isFinite(n)?n:0;};
  const totalExp=filteredProjects.reduce((s,p)=>s+num(p.expense||p.total_expense),0);
  const pendingCount=pendingArr.length;
  const cfData=range==="week"?cashflowArr.slice(-2):range==="month"?cashflowArr.slice(-3):cashflowArr;
  const totalIn=cfData.reduce((s,d)=>s+(d.in||0),0);
  const totalOut=cfData.reduce((s,d)=>s+(d.out||0),0);
  const financeBarData=cashflowArr.map(d=>({month:d.month,sales:Math.round((d.in||0)*(selProject==="All"?1:0.35)),expense:Math.round((d.out||0)*(selProject==="All"?1:0.35))}));
  const expSlices=dd.expense_breakdown||[{label:"Material Purchase",value:totalExp*0.46,color:T.blu},{label:"Sub-Contractor",value:totalExp*0.30,color:T.pur},{label:"Direct Labour",value:totalExp*0.15,color:T.grn},{label:"Site Expenses",value:totalExp*0.06,color:T.amb},{label:"Equipment",value:totalExp*0.03,color:T.slt}].filter(s=>s.value>0);
  const activityToShow=showAllActivity?activityArr:activityArr.slice(0,4);
  const actionsToShow=showAllActions?pendingArr:pendingArr.slice(0,4);

  return(
    <div style={{padding:"16px 20px",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {Switch}
      {/* KPI row — Finance (mock vision) */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:12}}>
        {MOCK_FIN.kpis.map((k,i)=>(<KpiTile key={i} label={k.label} value={k.value} sub={k.sub} color={k.color} Icon={k.Icon} trend={k.trend} trendVal={k.trendVal}/>))}
      </div>
      {/* Charts row */}
      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr",gap:12,marginBottom:12}}>
        <Panel title="Finance Overview" action={<div style={{display:"flex",gap:4}}>{["week","month","quarter"].map(r=>(<button key={r} onClick={()=>setRange(r)} style={{padding:"3px 9px",borderRadius:5,border:`1px solid ${range===r?T.blu:T.b1}`,background:range===r?T.blu:"none",color:range===r?"white":T.t3,fontSize:10.5,cursor:"pointer",fontWeight:range===r?600:400}}>{r.charAt(0).toUpperCase()+r.slice(1)}</button>))}</div>}>
          <div style={{padding:"14px 16px"}}><FinanceBarChart data={financeBarData} height={130}/><div style={{display:"flex",gap:14,marginTop:10}}>{[{l:"Revenue",v:totalIn,c:T.blu},{l:"Expense",v:totalOut,c:T.red},{l:"Net",v:totalIn-totalOut,c:(totalIn-totalOut)>=0?T.grn:T.red}].map((s,i)=>(<div key={i}><div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:2}}>{s.l}</div><div style={{fontSize:13.5,fontWeight:700,color:s.c}}>₹{fmt(s.v)}</div></div>))}</div></div>
        </Panel>
        <Panel title="Expense Breakdown">
          <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}><DonutChart slices={expSlices} size={110} cx={55} cy={55} r={38} inner={22}/><div style={{width:"100%"}}>{expSlices.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><div style={{width:9,height:9,borderRadius:2,background:s.color,flexShrink:0}}/><span style={{fontSize:11,color:T.t3,flex:1}}>{s.label}</span><span style={{fontSize:11,fontWeight:600,color:T.t1}}>₹{fmt(s.value)}</span></div>))}</div></div>
        </Panel>
        <Panel title="Cash Flow Trend">
          <div style={{padding:"14px 16px"}}><CashLineChart data={cashflowArr} height={90}/><div style={{display:"flex",gap:14,marginTop:10}}>{[{l:"IN",v:cashflowArr.reduce((s,d)=>s+(d.in||0),0),c:T.grn},{l:"OUT",v:cashflowArr.reduce((s,d)=>s+(d.out||0),0),c:T.red}].map((s,i)=>(<div key={i}><div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:2}}>{s.l}</div><div style={{fontSize:13.5,fontWeight:700,color:s.c}}>₹{fmt(s.v)}</div></div>))}</div></div>
        </Panel>
      </div>
      {/* Projects table */}
      <Panel title="Projects Overview" action={<select value={selProject} onChange={e=>setSelProject(e.target.value)} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,color:T.t2,background:T.surface,outline:"none",fontFamily:"inherit"}}>{projects.map(p=>(<option key={p}>{p}</option>))}</select>} style={{marginBottom:12}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 110px 80px 90px 90px 90px 70px 80px 40px",padding:"8px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
              {["Project","Client","Status","Progress","BOQ","Spent","Margin","Margin%","PM",""].map((h,i)=>(<th key={i} style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.5px",textAlign:"left"}}>{h}</th>))}
            </tr></thead>
            <tbody>
              {filteredProjects.map(p=>{
                const fmtStatus = (s) => (s||"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
                const stLabel = fmtStatus(p.status);
                const sm=STATUS_META[stLabel]||STATUS_META[p.status]||STATUS_META["Ongoing"];
                const margin=p.boq-p.expense; const mPct=p.boq>0?((margin/p.boq)*100).toFixed(1):0;
                const spentPct=p.boq>0?((p.expense/p.boq)*100).toFixed(0):0;
                const pColor=p.progress>=100?T.grn:p.progress>60?T.blu:p.progress>30?T.amb:p.progress>0?T.slt:T.t4;
                const isExp=expandedProjId===p.id;
                const pmName = p.pm ? p.pm.split(" ")[0] : "—";
                return(<>
                  <tr key={p.id} onClick={()=>setExpandedProjId(isExp?null:p.id)} style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 110px 80px 90px 90px 90px 70px 80px 40px",padding:"10px 14px",borderBottom:`1px solid ${isExp?T.bluM:T.b1}`,alignItems:"center",cursor:"pointer",background:isExp?T.bluL:"none",borderLeft:isExp?`3px solid ${T.blu}`:"3px solid transparent",transition:"all 0.1s"}} onMouseEnter={e=>{if(!isExp)e.currentTarget.style.background=T.surfaceB;}} onMouseLeave={e=>{if(!isExp)e.currentTarget.style.background="none";}}>
                    <td style={{display:"contents"}}>
                      <div style={{minWidth:0}}><div style={{fontSize:12.5,fontWeight:600,color:isExp?T.blu:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div><div style={{fontSize:10.5,color:T.t4}}>{p.city} · {p.type}</div></div>
                      <span style={{fontSize:11.5,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(p.client||"—").split(" ").slice(0,2).join(" ")}</span>
                      <span style={{display:"inline-block"}}><span style={{background:sm.bg,color:sm.c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${sm.brd}`,whiteSpace:"nowrap"}}>{stLabel}</span></span>
                      <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:10,fontWeight:700,color:pColor,fontVariantNumeric:"tabular-nums"}}>{p.progress}%</span></div><div style={{height:5,background:T.b1,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${p.progress}%`,background:pColor,borderRadius:3,transition:"width .3s"}}/></div></div>
                      <span style={{fontSize:12,fontWeight:600,color:T.t1,fontVariantNumeric:"tabular-nums"}}>₹{fmt(p.boq)}</span>
                      <div><span style={{fontSize:12,fontWeight:600,color:p.expense>0?T.amb:T.t4,fontVariantNumeric:"tabular-nums"}}>₹{fmt(p.expense)}</span><div style={{height:3,background:T.b1,borderRadius:2,marginTop:3,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(spentPct,100)}%`,background:Number(spentPct)>90?T.red:T.amb,borderRadius:2}}/></div></div>
                      <span style={{fontSize:12,fontWeight:700,color:margin>=0?T.grn:T.red,fontVariantNumeric:"tabular-nums"}}>₹{fmt(Math.abs(margin))}</span>
                      <span style={{fontSize:12,fontWeight:700,color:Number(mPct)>=20?T.grn:Number(mPct)>=10?T.amb:T.red,fontVariantNumeric:"tabular-nums"}}>{mPct}%</span>
                      <span style={{fontSize:11.5,color:pmName==="—"?T.t4:T.t3}}>{pmName}</span>
                      <span style={{display:"flex",alignItems:"center",justifyContent:"center"}}><svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke={T.t4} strokeWidth={1.5}><path d={isExp?"M2 5l5 5 5-5":"M2 9l5-5 5 5"}/></svg></span>
                    </td>
                  </tr>
                  {isExp&&<ProjectExpandedRow key={"exp-"+p.id} p={p}/>}
                </>);
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      {/* Actions + Activity */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:12,marginBottom:14}}>
        <Panel title={<span>Pending Actions <span style={{background:T.redL,color:T.red,fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,marginLeft:5,border:`1px solid ${T.redM}`}}>{pendingCount}</span></span>} action={<button onClick={()=>setShowAllActions(!showAllActions)} style={{fontSize:11,color:T.blu,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>{showAllActions?"Less":"All"}</button>}>
          <div style={{overflowY:"auto",maxHeight:260}}>{actionsToShow.map((a,i)=>(<div key={a.id} style={{padding:"9px 14px",borderBottom:i<actionsToShow.length-1?`1px solid ${T.b1}`:"none",display:"flex",alignItems:"center",gap:10,cursor:"pointer",transition:"background 0.1s"}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="none"}><div style={{width:26,height:26,borderRadius:6,background:`${a.color}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><a.Icon size={12} color={a.color}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:11.5,fontWeight:600,color:T.t1,marginBottom:1}}>{a.label}</div><div style={{fontSize:10.5,color:T.t4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.desc}</div></div><div style={{textAlign:"right",flexShrink:0}}>{a.amount&&<div style={{fontSize:12,fontWeight:700,color:T.t1,fontVariantNumeric:"tabular-nums"}}>₹{fmtN(a.amount)}</div>}<div style={{width:6,height:6,borderRadius:"50%",background:a.color,marginLeft:"auto",marginTop:a.amount?4:0}}/></div></div>))}</div>
        </Panel>
        <Panel title="Recent Activity" action={<button onClick={()=>setShowAllActivity(!showAllActivity)} style={{fontSize:11,color:T.blu,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>{showAllActivity?"Collapse":"View all"}</button>}>
          <div style={{overflowY:"auto",maxHeight:260}}>{activityToShow.map((a,i)=>(<div key={a.id} style={{padding:"9px 14px",borderBottom:i<activityToShow.length-1?`1px solid ${T.b1}`:"none",display:"flex",alignItems:"center",gap:10,cursor:"pointer",transition:"background 0.1s"}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="none"}><div style={{width:26,height:26,borderRadius:6,background:`${a.color}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><a.icon size={13} color={a.color}/></div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{a.title}</span>{a.dir&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:10,background:a.dir==="in"?T.grnL:a.dir==="pending"?T.ambL:T.redL,color:a.dir==="in"?T.grn:a.dir==="pending"?T.amb:T.red,border:`1px solid ${a.dir==="in"?T.grnM:a.dir==="pending"?T.ambM:T.redM}`,letterSpacing:".3px"}}>{a.dir==="in"?"IN":a.dir==="pending"?"PENDING":"OUT"}</span>}</div><div style={{fontSize:10.5,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:1}}>{a.desc}</div><div style={{fontSize:10,color:T.t4}}>{a.project} · {a.time}</div></div>{a.amount&&<div style={{fontSize:12.5,fontWeight:700,color:a.dir==="in"?T.grn:a.dir==="pending"?T.amb:T.red,flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{a.dir==="in"?"+":"−"}₹{fmtN(a.amount)}</div>}</div>))}</div>
        </Panel>
      </div>
    </div>
  );
}

// ── OPERATIONS & TEAM DASHBOARD (mock vision) ─────────────────────────
function OperationsDashboard({ops}){
  const att=ops.attendance;
  const pColorOf=(p)=>p>=100?T.grn:p>60?T.blu:p>30?T.amb:p>0?T.slt:T.t4;
  const priMeta={high:{c:T.red,bg:T.redL,brd:T.redM,l:"HIGH"},med:{c:T.amb,bg:T.ambL,brd:T.ambM,l:"MED"},low:{c:T.slt,bg:T.sltL,brd:T.b2,l:"LOW"}};
  return(
    <div>
      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:12}}>
        {ops.kpis.map((k,i)=>(<KpiTile key={i} label={k.label} value={k.value} sub={k.sub} color={k.color} Icon={k.Icon}/>))}
      </div>
      {/* Row 1: Project progress + Team attendance */}
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:12,marginBottom:12}}>
        <Panel title="Project Progress">
          <div style={{padding:"6px 0"}}>
            {ops.projects.map((p,i)=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:i<ops.projects.length-1?`1px solid ${T.b1}`:"none"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{p.name}</span>
                    {p.delay&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:10,background:T.redL,color:T.red,border:`1px solid ${T.redM}`}}>{p.delay}</span>}
                  </div>
                  <div style={{fontSize:10.5,color:T.t4,marginTop:1}}>{p.city} · {p.tasks} · PM {p.pm}</div>
                </div>
                <div style={{width:140}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:10,fontWeight:700,color:pColorOf(p.progress)}}>{p.progress}%</span></div>
                  <div style={{height:6,background:T.b1,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${p.progress}%`,background:pColorOf(p.progress),borderRadius:3}}/></div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Team Attendance — Today">
          <div style={{padding:"14px 16px"}}>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {[{l:"Present",v:att.present,c:T.grn},{l:"Absent",v:att.absent,c:T.red},{l:"On Leave",v:att.leave,c:T.amb}].map((s,i)=>(
                <div key={i} style={{flex:1,background:`${s.c}10`,border:`1px solid ${s.c}33`,borderRadius:9,padding:"10px 8px",textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:.3}}>{s.l}</div>
                </div>
              ))}
            </div>
            {att.byDept.map((d,i)=>{
              const pct=Math.round((d.present/d.total)*100);
              return(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:11.5,color:T.t2}}>{d.dept}</span>
                    <span style={{fontSize:11,fontWeight:700,color:T.t1}}>{d.present}/{d.total}</span>
                  </div>
                  <div style={{height:5,background:T.b1,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct>=80?T.grn:pct>=50?T.amb:T.red,borderRadius:3}}/></div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
      {/* Row 2: Procurement/Warehouse status */}
      <Panel title="Procurement & Warehouse" style={{marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,padding:"14px 16px"}}>
          {ops.procurement.map((s,i)=>(
            <div key={i} style={{background:`${s.color}0D`,border:`1px solid ${s.color}33`,borderRadius:9,padding:"12px 14px"}}>
              <div style={{fontSize:22,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:10.5,color:T.t3,marginTop:4}}>{s.label}</div>
            </div>
          ))}
        </div>
      </Panel>
      {/* Row 3: Pending Approvals + Operations activity */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:12,marginBottom:14}}>
        <Panel title={<span>Pending Approvals <span style={{background:T.redL,color:T.red,fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,marginLeft:5,border:`1px solid ${T.redM}`}}>{ops.approvals.length}</span></span>}>
          <div style={{overflowY:"auto",maxHeight:260}}>
            {ops.approvals.map((a,i)=>{const pm=priMeta[a.pri]||priMeta.low;return(
              <div key={a.id} style={{padding:"9px 14px",borderBottom:i<ops.approvals.length-1?`1px solid ${T.b1}`:"none",display:"flex",alignItems:"center",gap:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11.5,fontWeight:600,color:T.t1,marginBottom:1}}>{a.label}</div>
                  <div style={{fontSize:10.5,color:T.t4}}>{a.desc} · {a.time}</div>
                </div>
                <span style={{fontSize:9,fontWeight:700,padding:"1px 7px",borderRadius:10,background:pm.bg,color:pm.c,border:`1px solid ${pm.brd}`,flexShrink:0}}>{pm.l}</span>
              </div>
            );})}
          </div>
        </Panel>
        <Panel title="Recent Operations Activity">
          <div style={{overflowY:"auto",maxHeight:260}}>
            {ops.activity.map((a,i)=>(
              <div key={a.id} style={{padding:"9px 14px",borderBottom:i<ops.activity.length-1?`1px solid ${T.b1}`:"none",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:26,height:26,borderRadius:6,background:`${a.color}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><a.icon size={13} color={a.color}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{a.title}</div>
                  <div style={{fontSize:10.5,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.desc}</div>
                  <div style={{fontSize:10,color:T.t4}}>{a.project} · {a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ── PROJECTS WRAPPER ──────────────────────────────────────────────────
function ProjectsWrapper(){
  const [selectedProject,setSelectedProject]=useState(null);
  // Project switcher inside ProjectDetailPage calls this — we just swap the
  // project object. ProjectDetailPage's `tab` state survives the prop change
  // so the user lands on the same module of the new project.
  const switchProject = (p) => setSelectedProject(p);
  if(selectedProject) return <ProjectDetailPage project={selectedProject} onBack={()=>setSelectedProject(null)} onSwitchProject={switchProject}/>;
  return <ProjectsPage onSelectProject={setSelectedProject}/>;
}


// ── APP ───────────────────────────────────────────────────────────────
export default function App(){
  // Public route — 3D client preview (no login needed)
  // Wrapped in AppErrorBoundary so a failed lazy chunk shows the recover
  // UI instead of a white screen.
  if(window.location.pathname.startsWith("/3d-preview/")){
    return <AppErrorBoundary><Suspense fallback={<ModuleLoader/>}><ClientPreview3D/></Suspense></AppErrorBoundary>;
  }
  // Public route — drawing share link (no login needed)
  if(window.location.pathname.startsWith("/d/")){
    return <AppErrorBoundary><Suspense fallback={<ModuleLoader/>}><PublicDrawingPage/></Suspense></AppErrorBoundary>;
  }

  const [user,setUser]=useState(()=>getUser());
  const [companies,setCompanies]=useState(()=>getCompanies());
  const [switching,setSwitching]=useState(false);
  const [nav,setNav]=useState("projects");
  const [collapsed,setCollapsed]=useState(()=>window.innerWidth<768);
  const [isMobile,setIsMobile]=useState(()=>window.innerWidth<768);
  const [showSearch,setShowSearch]=useState(false);
  const [showCheatsheet,setShowCheatsheet]=useState(false);
  // enabledModules: null=loading, {}=map of key→boolean
  const [enabledModules,setEnabledModules]=useState(null);

  // ── App shell visibility for project pages (sidebar layout mode) ──
  const [inProject,setInProject]=useState(()=>!!window.__gbInProject);
  const [projectLayoutMode,setProjectLayoutMode]=useState(()=>{
    try { return localStorage.getItem("gb_project_layout") || "horizontal"; }
    catch { return "horizontal"; }
  });
  useEffect(()=>{
    const onProjState=()=>setInProject(!!window.__gbInProject);
    const onLayout=(e)=>setProjectLayoutMode(e.detail||"horizontal");
    const onStorage=(e)=>{ if(e.key==="gb_project_layout") setProjectLayoutMode(e.newValue||"horizontal"); };
    window.addEventListener("gb-project-state-change",onProjState);
    window.addEventListener("gb-layout-change",onLayout);
    window.addEventListener("storage",onStorage);
    return()=>{
      window.removeEventListener("gb-project-state-change",onProjState);
      window.removeEventListener("gb-layout-change",onLayout);
      window.removeEventListener("storage",onStorage);
    };
  },[]);
  const hideAppShell = inProject && projectLayoutMode==="sidebar";

  const loggedIn=!!user&&!!getToken();

  // M1: Auto-collapse sidebar on mobile + listen for resize
  useEffect(()=>{
    let timeout;
    const onResize=()=>{
      clearTimeout(timeout);
      timeout=setTimeout(()=>{
        const mobile=window.innerWidth<768;
        setIsMobile(mobile);
        if(mobile) setCollapsed(true);
      },150);
    };
    window.addEventListener("resize",onResize);
    return()=>{window.removeEventListener("resize",onResize);clearTimeout(timeout);};
  },[]);

  // Wake up Railway backend on app load — prevents cold start delay
  useEffect(()=>{
    fetch("https://gb-backend-production-7bd2.up.railway.app/api/health").catch(()=>{});
  },[]);

  // Prefetch all modules in background after dashboard loads
  useEffect(()=>{
    if(loggedIn) prefetchAllModules();
  },[loggedIn]);

  // Fetch module access config when logged in
  useEffect(()=>{
    if(!loggedIn){setEnabledModules(null);return;}
    api.get("/settings/modules")
      .then(res=>{
        if(res.success){
          const map={};
          res.data.forEach(m=>{map[m.key]=m.is_enabled;});
          setEnabledModules(map);
        } else {
          setEnabledModules({}); // fallback: show all
        }
      })
      .catch(()=>setEnabledModules({})); // on error: show all
  },[loggedIn]);

  // Auto-refresh module permissions — no logout needed when admin changes role permissions.
  // Runs on app load + whenever the tab/window regains focus (covers mobile app-resume too).
  useEffect(()=>{
    const refreshPerms=async()=>{
      if(!loggedIn||["admin","super_admin"].includes(user?.role)) return;
      try{
        const res=await api.get("/auth/permissions");
        if(res.success && res.module_permissions){
          const updated={...user, module_permissions: res.module_permissions};
          setUser(updated);
          try{ localStorage.setItem("gb_user", JSON.stringify(updated)); }catch(_){}
        }
      }catch(_){}
    };
    refreshPerms();
    window.addEventListener("focus", refreshPerms);
    return()=>window.removeEventListener("focus", refreshPerms);
  },[loggedIn]);

  // ── Global keyboard shortcuts ────────────────────────────────────────
  useEffect(()=>{
    const handler=(e)=>{
      const tag=document.activeElement?.tagName;
      const typing=tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT";

      // Ctrl+K → Quick Search (always works)
      if(e.ctrlKey&&e.key==="k"){e.preventDefault();setShowSearch(s=>!s);return;}

      // ? → Cheatsheet (only when not typing)
      if(!typing&&e.key==="?"&&!e.ctrlKey&&!e.altKey){setShowCheatsheet(s=>!s);return;}

      // Escape → close modals first
      if(e.key==="Escape"){
        if(showSearch){setShowSearch(false);return;}
        if(showCheatsheet){setShowCheatsheet(false);return;}
        return;
      }

      // Alt+key nav (only when not typing)
      if(!typing&&e.altKey){
        const map={
          h:"dashboard", j:"projects",  f:"finance",  p:"procurement",
          l:"library",   s:"settings",  c:"crm",      w:"warehouse",
          y:"payroll",   t:"team",      m:"mom",       d:"design",   b:"reports",
        };
        if(map[e.key]){e.preventDefault();setNav(map[e.key]);}
      }
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[showSearch,showCheatsheet]);
  const handleLogout=()=>{apiCache.clear();clearAuth();setUser(null);setCompanies([]);setEnabledModules(null);};

  const handleSwitchCompany=async(companyId)=>{
    if(switching||companyId===user?.company_id) return;
    setSwitching(true);
    try{
      const res=await api.switchCompany(companyId);
      if(res.success){
        apiCache.clear();
        setUser(res.user);
        setCompanies(res.companies||[]);
        setEnabledModules(null); // re-fetch
        setNav("dashboard");
        // Re-fetch modules for new company
        const modRes=await api.get("/settings/modules");
        if(modRes.success){
          const map={};
          modRes.data.forEach(m=>{map[m.key]=m.is_enabled;});
          setEnabledModules(map);
        } else setEnabledModules({});
      }
    }catch(e){console.error("Switch company error:",e);}
    setSwitching(false);
  };

  if(!loggedIn) return <ToastProvider><ConfirmProvider><PromptProvider><LoginScreen onLogin={(u,cos)=>{setUser(u);setCompanies(cos||getCompanies());}}/></PromptProvider></ConfirmProvider></ToastProvider>;

  const PAGES={
    dashboard:{title:"Dashboard",sub:"Company Overview"},
    projects:{title:"Projects",sub:"All Construction Projects"},
    crm:{title:"CRM",sub:"Clients & Leads"},
    mom:{title:"MOM",sub:"Minutes of Meeting"},
    team:{title:"My Team",sub:"Gantt · Timesheets"},
    design:{title:"Design",sub:"Drawings & Tasks"},
    finance:{title:"Finance",sub:"Cash Book · Transactions"},
    procurement:{title:"Procurement",sub:"PO · RFQ · Materials"},
    warehouse:{title:"Warehouse",sub:"Central Stock"},
    township:{title:"Township CRM",sub:"Real-Estate Projects & Sales"},
    payroll:{title:"Payroll",sub:"Staff Payments"},
    reports:{title:"Reports",sub:"All Reports"},
    library:{title:"Library",sub:"Master Data"},
    settings:{title:"Settings",sub:"Configuration"},
    profile:{title:"My Profile",sub:"Your Account"},
    saas:{title:"SaaS Admin",sub:"Platform Management"},
  };

  // Check if a module is enabled
  const isEnabled=(key)=>{
    if(ALWAYS_ON.includes(key)) return true;
    if(!enabledModules) return true; // still loading — allow access
    return enabledModules[key]!==false;
  };

  // Wrap module component — show disabled screen if turned off
  const guard=(key,name,comp)=>isEnabled(key)?comp:<ModuleDisabled name={name}/>;

  const MODULE_MAP={
    dashboard: <DashboardModule/>,
    projects:  <ProjectsWrapper/>,
    finance:   guard("finance",  "Finance",       <FinanceModule/>),
    procurement:guard("procurement","Procurement", <ProcurementModule/>),
    design:    guard("design",   "Design",        <DesignModule/>),
    payroll:   guard("payroll",  "Payroll",        <PayrollModule/>),
    crm:       guard("crm",      "CRM",            <CRMModule/>),
    team:      guard("team",     "My Team",  <TeamScheduleModule/>),
    mom:       guard("mom",      "MOM",            <MOMModule/>),
    library:   guard("library",  "Library",        <MasterLibraryModule/>),
    warehouse: guard("warehouse","Warehouse",      <WarehouseModule/>),
    township:  guard("township", "Township CRM",   <TownshipCRMModule/>),
    reports:   guard("reports",  "Reports",        <ReportsModule/>),
    settings:  <SettingsModule/>,
    profile:   <SettingsModule initialSection="profile"/>,
    saas:     <SaaSModule/>,
  };

  const page=PAGES[nav]||PAGES.dashboard;

  return(
    <ToastProvider>
    <ConfirmProvider>
    <PromptProvider>
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:T.bg,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:10px}
        select,input{font-family:'Segoe UI',system-ui,sans-serif}
        img{loading:lazy}
        img[loading="lazy"]{content-visibility:auto}
        table{width:100%}
        @media(max-width:768px){
          .hide-mobile{display:none!important}
          table{font-size:12px}
          td,th{padding:6px 8px!important}
        }
      `}</style>
      {switching&&<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
        <div style={{width:32,height:32,border:"3px solid rgba(255,255,255,0.15)",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
        <div style={{color:"white",fontSize:14,fontWeight:600}}>Switching company...</div>
      </div>}
      {!hideAppShell && !isMobile && <Sidebar active={nav} setActive={setNav} collapsed={collapsed} setCollapsed={setCollapsed} user={user} onLogout={handleLogout} enabledModules={enabledModules} isMobile={isMobile} companies={companies} onSwitchCompany={handleSwitchCompany}/>}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {!hideAppShell && <TopBar title={page.title} sub={page.sub} collapsed={collapsed} setCollapsed={setCollapsed} alertCount={0} user={user} onLogout={handleLogout} onSearch={()=>setShowSearch(true)} onCheatsheet={()=>setShowCheatsheet(true)} onNotificationNav={(mod)=>setNav(mod)} isMobile={isMobile}/>}
        <div style={{flex:1,overflowY:"auto",paddingBottom:isMobile&&!hideAppShell?68:0}}>
          {/* Inner ErrorBoundary: if a single module's chunk fails or
              the module throws on mount, recover the module area only —
              the rest of the app shell (sidebar, top bar) stays usable.
              The outer ErrorBoundary in index.js catches anything that
              escapes this one. */}
          <AppErrorBoundary>
            <Suspense fallback={<ModuleLoader/>}>
              {MODULE_MAP[nav]||<DashboardModule/>}
            </Suspense>
          </AppErrorBoundary>
        </div>
      </div>
      {/* Quick Search Modal */}
      {showSearch&&<QuickSearch onNavigate={(id)=>{setNav(id);setShowSearch(false);}} onClose={()=>setShowSearch(false)}/>}
      {/* Shortcut Cheatsheet Modal */}
      {showCheatsheet&&<ShortcutCheatsheet onClose={()=>setShowCheatsheet(false)}/>}
      {/* Mobile bottom navigation bar */}
      {isMobile&&!hideAppShell&&<MobileBottomNav active={nav} setActive={setNav} enabledModules={enabledModules} user={user}/>}
      {/* Background Upload Toast — always visible */}
      <UploadToast/>
    </div>
    </PromptProvider>
    </ConfirmProvider>
    </ToastProvider>
  );
}
