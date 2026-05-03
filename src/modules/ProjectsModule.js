import { useState, useEffect } from "react";
import api from "../config/api";
import apiCache from "../utils/apiCache";
import { Credit } from "../components/Credit";
import useDebounce from "../utils/useDebounce";
import SearchSelect from "../components/SearchSelect";

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
const IcEdit2 =(p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcTrash =(p)=><Ic {...p} d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/>;
const IcArchive=(p)=><Ic {...p} d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>;
const IcSave  =(p)=><Ic {...p} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8"/>;
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
// ── BALANCED THEME TOKENS (used in ProjectsPage + ProjectDetail) ───────
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
const PARTIES=[];
const PARTY_TXNS={};
const TXN_TYPE_META={
  "Payment In":{color:C.g,bg:C.gl},
  "Payment Out":{color:C.r,bg:C.rl},
  "Material Purchase":{color:C.p,bg:C.bl},
  "Site Expense":{color:C.o,bg:C.ol},
  "Party Payment":{color:C.pur,bg:C.purl},
  "Sub-Con Expense":{color:C.teal,bg:C.tealL},
  "Material Return":{color:C.a,bg:"#FFF8E1"},
  "Sales Invoice":{color:C.g,bg:C.gl},
  "Unbilled Material":{color:C.pink,bg:C.pinkL},
};
const TRANSACTIONS_DATA=[];
const UNBILLED_PARTIES=[];
const PAY_REQS_DATA=[];
const PEND_PMTS_DATA=[];

function SitePulseDrawer({onClose}){
  const [site,setSite]=useState("All");
  const [type,setType]=useState("All");
  const [feed,setFeed]=useState([]);
  const [projects,setProjects]=useState([]);
  const [loading,setLoading]=useState(true);

  const tagMeta={
    "progress":{c:C.g,b:C.gl,icon:"🏗️",label:"Progress"},
    "material":{c:C.p,b:C.bl,icon:"📦",label:"Material Received"},
    "material_request":{c:"#0891B2",b:"#ECFEFF",icon:"📋",label:"Material Request"},
    "approval":{c:C.teal,b:C.tealL,icon:"✅",label:"Approved"},
    "payment":{c:C.o,b:C.ol,icon:"💰",label:"Payment"},
    "photo":{c:"#7C3AED",b:"#EDE9FE",icon:"📸",label:"Photo"},
    "document":{c:C.p,b:C.bl,icon:"📄",label:"Document"},
  };
  const avatarColors=["#1565C0","#2E7D32","#6A1B9A","#AD1457","#E65100","#00838F","#4527A0","#C62828"];
  const getAC=(name)=>avatarColors[Math.abs([...name].reduce((a,c)=>a+c.charCodeAt(0),0))%avatarColors.length];

  useEffect(()=>{
    setLoading(true);
    api.get("/projects/site-pulse?limit=60").then(r=>{
      if(r.success&&r.data){
        setFeed(r.data.feed||[]);
        setProjects(r.data.projects||[]);
      }
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const timeAgo=(d)=>{
    if(!d) return "";
    const diff=Date.now()-new Date(d).getTime();
    const mins=Math.floor(diff/60000);
    if(mins<1) return "just now";
    if(mins<60) return mins+"m ago";
    const hrs=Math.floor(mins/60);
    if(hrs<24) return hrs+"h ago";
    const days=Math.floor(hrs/24);
    if(days<7) return days+"d ago";
    return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
  };

  const filtered=feed.filter(f=>(site==="All"||f.project_name===site)&&(type==="All"||f.feed_type===type));

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:200,backdropFilter:"blur(2px)",animation:"fadeIn .25s ease"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(420px,96vw)",background:C.bg,zIndex:201,boxShadow:"-8px 0 48px rgba(0,0,0,0.22), -2px 0 8px rgba(0,0,0,0.08)",display:"flex",flexDirection:"column",animation:"slideIn .32s cubic-bezier(0.16,1,0.3,1)",fontFamily:"'Segoe UI',sans-serif",borderRadius:"16px 0 0 16px"}}>
      <div style={{background:C.w,padding:"12px 14px 10px",borderBottom:`1px solid ${C.b}`,flexShrink:0,borderRadius:"16px 0 0 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:C.g,boxShadow:`0 0 0 3px ${C.gl}`,animation:"livePulse 1.5s infinite"}}/>
            <span style={{fontSize:14,fontWeight:800,color:C.t}}>Site Pulse</span>
            <span style={{background:C.r,color:"white",fontSize:8,fontWeight:800,padding:"2px 5px",borderRadius:4,letterSpacing:"0.6px"}}>LIVE</span>
            {!loading&&<span style={{fontSize:10,color:C.tl}}>{filtered.length} activities</span>}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.tl,display:"flex"}}><IcX size={15}/></button>
        </div>
        <div style={{display:"flex",gap:6}}>
          <select value={site} onChange={e=>setSite(e.target.value)} style={{flex:1,padding:"6px 8px",borderRadius:7,border:`1.5px solid ${C.b}`,fontSize:11.5,background:C.bg,outline:"none",fontFamily:"inherit",color:C.t}}>
            <option value="All">All Projects</option>
            {projects.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={type} onChange={e=>setType(e.target.value)} style={{flex:1,padding:"6px 8px",borderRadius:7,border:`1.5px solid ${C.b}`,fontSize:11.5,background:C.bg,outline:"none",fontFamily:"inherit",color:C.t}}>
            <option value="All">All Types</option>
            {Object.entries(tagMeta).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>
        {loading?(
          <div style={{textAlign:"center",padding:"50px 0",color:C.tl}}>
            <div style={{width:24,height:24,border:"3px solid "+C.b,borderTopColor:C.p,borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto 12px"}}/>
            Loading feed...
          </div>
        ):filtered.length===0?(
          <div style={{textAlign:"center",padding:"50px 0",color:C.tl,fontSize:13}}>
            <div style={{fontSize:36,marginBottom:10}}>📡</div>
            No activities yet
            <div style={{fontSize:11,marginTop:4,color:C.tl+"99"}}>Activities from your projects will appear here</div>
          </div>
        ):filtered.map((f,idx)=>{
          const tm=tagMeta[f.feed_type]||{c:C.tl,b:C.b,icon:"📌",label:f.feed_type};
          const ac=getAC(f.user_name||"U");
          const initials=(f.user_name||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
          const time=timeAgo(f.activity_date||f.created_at);
          const amt=f.amount?`₹${Number(f.amount).toLocaleString("en-IN")}`:"";

          return(
            <div key={`${f.feed_type}-${f.id}-${idx}`} style={{background:C.w,borderRadius:12,marginBottom:8,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:`1px solid ${C.b}`}}>
              {/* User header */}
              <div style={{display:"flex",alignItems:"center",gap:9,padding:"10px 12px 7px"}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${ac},${ac}99)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"white",flexShrink:0,boxShadow:`0 0 0 2px ${ac}33`}}>{initials}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.t}}>{f.user_name}</div>
                  <div style={{fontSize:10,color:C.tl,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>📍 {f.project_name} · {time}</div>
                </div>
                <span style={{background:tm.b,color:tm.c,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,textTransform:"capitalize",whiteSpace:"nowrap",flexShrink:0}}>{tm.label}</span>
              </div>

              {/* Photo if available */}
              {f.photo_url&&(
                <img src={f.photo_url} alt="site" style={{width:"100%",height:180,objectFit:"cover",display:"block"}}
                  onError={e=>{e.target.style.display="none";}}/>
              )}

              {/* Type-specific banner */}
              {!f.photo_url&&f.feed_type==="approval"&&(
                <div style={{margin:"0 12px 6px",background:C.tealL,borderRadius:8,padding:"8px 11px",borderLeft:`3px solid ${C.teal}`,display:"flex",gap:7,alignItems:"center"}}>
                  <IcChk size={13} color={C.teal}/><span style={{fontSize:11.5,color:C.teal,fontWeight:500}}>{f.feed_status==="Rejected"?"Rejected":"Approved"}{amt?` — ${amt}`:""}</span>
                </div>
              )}
              {!f.photo_url&&f.feed_type==="material"&&(
                <div style={{margin:"0 12px 6px",background:C.bl,borderRadius:8,padding:"8px 11px",borderLeft:`3px solid ${C.p}`,display:"flex",gap:7,alignItems:"center"}}>
                  <span style={{fontSize:16}}>📦</span><span style={{fontSize:11.5,color:C.p,fontWeight:500}}>Material Received{amt?` — ${amt}`:""}</span>
                </div>
              )}
              {!f.photo_url&&f.feed_type==="payment"&&(
                <div style={{margin:"0 12px 6px",background:C.ol,borderRadius:8,padding:"8px 11px",borderLeft:`3px solid ${C.o}`,display:"flex",gap:7,alignItems:"center"}}>
                  <span style={{fontSize:16}}>💰</span><span style={{fontSize:11.5,color:C.o,fontWeight:500}}>{f.feed_status}{amt?` — ${amt}`:""}</span>
                </div>
              )}
              {!f.photo_url&&f.feed_type==="progress"&&(
                <div style={{margin:"0 12px 6px",background:C.gl,borderRadius:8,padding:"8px 11px",borderLeft:`3px solid ${C.g}`,display:"flex",gap:7,alignItems:"center"}}>
                  <span style={{fontSize:16}}>🏗️</span><span style={{fontSize:11.5,color:C.g,fontWeight:500}}>Stage Completed</span>
                </div>
              )}
              {!f.photo_url&&f.feed_type==="material_request"&&(
                <div style={{margin:"0 12px 6px",background:"#ECFEFF",borderRadius:8,padding:"8px 11px",borderLeft:"3px solid #0891B2",display:"flex",gap:7,alignItems:"center"}}>
                  <span style={{fontSize:16}}>📋</span><span style={{fontSize:11.5,color:"#0891B2",fontWeight:500}}>{f.feed_status}{amt?` — ${amt}`:""}</span>
                </div>
              )}

              {/* Caption */}
              <div style={{padding:"5px 12px 4px"}}><span style={{fontSize:12,color:C.t,lineHeight:1.45}}><strong>{f.user_name}</strong> {f.text}</span></div>

              {/* Footer */}
              <div style={{padding:"5px 12px 10px",display:"flex",alignItems:"center"}}>
                <span style={{fontSize:10,color:C.tl,fontStyle:"italic"}}>{f.module}</span>
                <div style={{flex:1}}/>
                <span style={{fontSize:9.5,color:C.tl}}>{time}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{padding:"10px 12px",background:C.w,borderTop:`1px solid ${C.b}`,borderRadius:"0 0 0 16px"}}>
        <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:C.g,animation:"livePulse 1.5s infinite"}}/>
          <span style={{fontSize:11,color:C.tl,fontWeight:500}}>Real-time feed from all projects</span>
        </div>
      </div>
    </div>
  </>);
}

// ── DUPLICATE MODAL ───────────────────────────────────────────────────

function NewProjectModal({onClose,onCreated}){
  const _pu = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const _pd = _pu.company_domain || "construction_individual";
  const isSolarCompany = ["surya_ghar","surya_ghar_plus","solar_commercial"].includes(_pd);
  const isBoth = false; // reserved for future hybrid domains

  const [step, setStep] = useState(1); // Solar: step 1 = basic, step 2 = consumer docs
  const [projType, setProjType] = useState(isSolarCompany ? "solar_epc" : "construction");
  const isSolar = projType === "solar_epc";

  const [form, setForm] = useState({
    // Common
    name:"", phone:"", city:"Raipur",
    // Solar specific
    address:"", system_kw:"3", install_type:"residential",
    bp_number:"", aadhaar_no:"", pan_no:"",
    bank_name:"", bank_account:"", ifsc:"",
    // Construction specific
    client_name:"", type:"residential", boq_value:"", start_date:"", end_date:"",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));

  const inp = (label, key, ph, type="text", full=false) => (
    <div style={{gridColumn:full?"1/3":"auto"}}>
      <label style={{fontSize:10.5,fontWeight:600,color:T.t3,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>{label}</label>
      <input type={type} value={form[key]} onChange={e=>setF(key,e.target.value)} placeholder={ph||""}
        style={{width:"100%",padding:"9px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.bg,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
        onFocus={e=>e.target.style.borderColor=isSolar?"#E65100":T.blu}
        onBlur={e=>e.target.style.borderColor=T.b1}/>
    </div>
  );

  const sel = (label, key, opts, full=false) => (
    <div style={{gridColumn:full?"1/3":"auto"}}>
      <label style={{fontSize:10.5,fontWeight:600,color:T.t3,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>{label}</label>
      <SearchSelect value={form[key]}
        options={opts.map(o=>({key:String(o.v||o),label:o.l||(typeof o==="string"?o.charAt(0).toUpperCase()+o.slice(1):String(o))}))}
        onChange={v=>setF(key,v)} placeholder={`Select ${label.toLowerCase()}...`}/>
    </div>
  );

  const handleCreate = async () => {
    if (!form.name.trim()) return setError("Name required");
    if (isSolar && !form.address.trim()) return setError("Address required");
    setLoading(true); setError("");
    try {
      const projectName = isSolar
        ? `${form.name.trim()} — ${form.system_kw}kW Solar`
        : form.name.trim();

      // Step 1: Create project
      const res = await api.post("/projects", {
        name: projectName,
        client_name: isSolar ? form.name.trim() : form.client_name.trim(),
        client_phone: form.phone,
        city: form.city,
        site_address: isSolar ? form.address : "",
        type: isSolar ? form.install_type : form.type,
        project_type: isSolar ? "solar_epc" : "construction",
        status: "not_started",
        boq_value: Number(form.boq_value)||0,
        start_date: form.start_date||null,
        end_date: form.end_date||null,
      });

      if (!res.success || !res.data)
        return setError(res.message || "Failed to create project");

      const pid = res.data.id;

      if (isSolar) {
        // Step 2: Init stages (19 stages + 9 photo steps)
        await api.post(`/solar/projects/${pid}/init`, {});

        // Step 3: Save consumer details
        await api.put(`/solar/projects/${pid}`, {
          consumer_name: form.name.trim(),
          consumer_address: form.address,
          consumer_phone: form.phone,
          system_kw: parseFloat(form.system_kw) || 3,
          system_type: form.install_type,
          bp_number: form.bp_number || undefined,
        });
      }

      apiCache.invalidate("projects");
      onCreated(mapProject(res.data));
      onClose();
    } catch(err) {
      setError("Server error. Try again.");
    }
    setLoading(false);
  };

  // ── Header config ───────────────────────────────────────────────
  const hdr = isSolar
    ? {grad:"linear-gradient(135deg,#E65100,#FF8F00)", icon:"☀️", title:"New Solar EPC Project", sub:"Consumer details aur system info"}
    : {grad:`linear-gradient(135deg,${T.blu},#1D4ED8)`,  icon:"🏗️", title:"New Project",           sub:"Add a new construction project"};

  return (<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:998}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:500,background:T.surface,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,.25)",zIndex:999,overflow:"hidden"}}>

      {/* Header */}
      <div style={{padding:"16px 20px",background:hdr.grad,color:"white"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:9,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{hdr.icon}</div>
            <div>
              <div style={{fontSize:15,fontWeight:700}}>{hdr.title}</div>
              <div style={{fontSize:11,opacity:0.7}}>{hdr.sub}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"white",opacity:0.7}}><IcX size={18}/></button>
        </div>
      </div>

      {/* Module toggle — only for 'both' companies */}
      {isBoth && (
        <div style={{display:"flex",gap:6,padding:"12px 20px 0",background:T.surface}}>
          {[{id:"construction",l:"🏗️ Construction",c:T.blu},{id:"solar_epc",l:"☀️ Solar EPC",c:"#E65100"}].map(opt=>(
            <button key={opt.id} onClick={()=>{setProjType(opt.id);setStep(1);setError("");}}
              style={{flex:1,padding:"8px",borderRadius:8,border:`2px solid ${projType===opt.id?opt.c:T.b1}`,background:projType===opt.id?opt.c+"15":"white",color:projType===opt.id?opt.c:T.t3,fontSize:12.5,fontWeight:projType===opt.id?700:400,cursor:"pointer",transition:"all .15s"}}>
              {opt.l}
            </button>
          ))}
        </div>
      )}

      {/* Step indicator — Solar only */}
      {isSolar && (
        <div style={{display:"flex",alignItems:"center",padding:"10px 20px 0",gap:6}}>
          {["Consumer Info","Document Details"].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,flex:i<1?1:"auto"}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:step>i?"#E65100":step===i+1?"#FF8F00":T.b1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:step>i||step===i+1?"white":T.t4,flexShrink:0}}>
                {step>i+1?"✓":i+1}
              </div>
              <span style={{fontSize:11,fontWeight:step===i+1?700:400,color:step===i+1?"#E65100":step>i+1?T.grn:T.t4,whiteSpace:"nowrap"}}>{s}</span>
              {i<1&&<div style={{flex:1,height:2,background:step>1?"#E65100":T.b1,borderRadius:2,margin:"0 4px"}}/>}
            </div>
          ))}
        </div>
      )}

      {/* Form body */}
      <div style={{padding:"14px 20px 10px",maxHeight:"62vh",overflowY:"auto"}}>
        {error && <div style={{background:T.redL,color:T.red,padding:"8px 12px",borderRadius:7,fontSize:12,marginBottom:10,border:`1px solid ${T.redM}`}}>{error}</div>}

        {/* ── SOLAR STEP 1: Consumer Info ── */}
        {isSolar && step===1 && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {inp("Consumer Name *",    "name",         "e.g. Ramesh Kumar",         "text", true)}
            {inp("Mobile Number",      "phone",        "e.g. 9876543210")}
            {inp("City",               "city",         "City")}
            {sel("System Size",        "system_kw",    ["1","2","3","4","5","6","7","8","9","10"].map(v=>({v,l:v+" kW"})))}
            {sel("Installation Type",  "install_type", [{v:"residential",l:"Residential"},{v:"commercial",l:"Commercial"}], false)}
            {inp("Full Site Address *", "address",      "House no., Street, Area, District, Pin", "text", true)}
            {inp("BP Number (Ele Bill)","bp_number",    "e.g. 1008863630")}
          </div>
        )}

        {/* ── SOLAR STEP 2: Document Details ── */}
        {isSolar && step===2 && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{gridColumn:"1/3",background:"#FFF8E1",borderRadius:8,padding:"9px 12px",border:"1px solid #FFD54F",fontSize:11.5,color:"#E65100"}}>
              ℹ️ Actual documents Files tab mein upload honge. Abhi reference numbers enter karo.
            </div>
            {inp("Aadhaar Number",   "aadhaar_no",   "12-digit Aadhaar")}
            {inp("PAN Number",       "pan_no",        "e.g. ABCDE1234F")}
            {inp("Bank Name",        "bank_name",     "e.g. SBI, PNB, HDFC")}
            {inp("Bank Account No.", "bank_account",  "Account number")}
            {inp("IFSC Code",        "ifsc",          "e.g. PUNB0053610")}
          </div>
        )}

        {/* ── CONSTRUCTION form ── */}
        {!isSolar && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{gridColumn:"1/3"}}>
              <label style={{fontSize:10.5,fontWeight:600,color:T.t3,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>Project Name *</label>
              <input value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="e.g. Sharma Residence"
                style={{width:"100%",padding:"9px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.bg,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            {inp("Client Name",  "client_name", "Client full name")}
            {inp("City",         "city",         "City")}
            {sel("Type",         "type",         [{v:"residential",l:"Residential"},{v:"commercial",l:"Commercial"},{v:"industrial",l:"Industrial"}])}
            {inp("BOQ Value (₹)","boq_value",    "e.g. 5000000", "number")}
            {inp("Start Date",   "start_date",   "", "date")}
            {inp("End Date",     "end_date",     "", "date")}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{padding:"12px 20px",borderTop:`1px solid ${T.b1}`,display:"flex",justifyContent:"flex-end",gap:10}}>
        {isSolar && step===2
          ? <button onClick={()=>setStep(1)} style={{padding:"9px 16px",borderRadius:7,border:`1px solid ${T.b1}`,background:"none",fontSize:13,color:T.t2,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
          : <button onClick={onClose} style={{padding:"9px 16px",borderRadius:7,border:`1px solid ${T.b1}`,background:"none",fontSize:13,color:T.t2,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
        }
        {isSolar && step===1
          ? <button onClick={()=>{if(!form.name.trim()||!form.address.trim())return setError("Name aur address required");setError("");setStep(2);}}
              style={{padding:"9px 22px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#E65100,#FF8F00)",color:"white",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              Next: Document Details →
            </button>
          : <button onClick={handleCreate} disabled={loading}
              style={{padding:"9px 22px",borderRadius:7,border:"none",background:loading?T.t4:isSolar?"linear-gradient(135deg,#E65100,#FF8F00)":`linear-gradient(135deg,${T.blu},#1D4ED8)`,color:"white",fontSize:13,fontWeight:600,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit"}}>
              {loading?"Creating...":isSolar?"Create Solar Project ☀️":"Create Project"}
            </button>
        }
      </div>
    </div>
  </>);
}

function DuplicateModal({project,onClose,onConfirm}){
  const [step,setStep]=useState(1);const [done,setDone]=useState(false);
  const [form,setForm]=useState({name:`${project.name} — Copy`,city:project.city,boq:project.boq,start:"",end:""});
  const [pm,setPM]=useState(project.pm);const [sup,setSup]=useState("");
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
  const handleCreate=()=>{setDone(true);setTimeout(()=>{onConfirm({...project,id:Date.now(),name:form.name,city:form.city,boq:Number(form.boq),pm,progress:0,status:"Not Started",expense:0,start:form.start||"TBD",end:form.end||"TBD"});onClose();},1400);};
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.52)",zIndex:300,backdropFilter:"blur(3px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:C.w,borderRadius:16,width:500,maxWidth:"95vw",zIndex:301,boxShadow:"0 24px 70px rgba(0,0,0,0.32)",overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:`linear-gradient(135deg,${C.p},${C.p2})`,padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center"}}><IcCopy size={17} color="white"/></div>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:"white"}}>Duplicate Project</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.72)"}}>Tasks, dependencies & BOQ carry over automatically</div></div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",color:"white",padding:"5px 7px",borderRadius:7,display:"flex"}}><IcX size={14}/></button>
      </div>
      {/* Steps */}
      <div style={{display:"flex",alignItems:"center",padding:"10px 20px",borderBottom:`1px solid ${C.b}`,background:"#FAFBFF"}}>
        {["Project Details","Team Assignment","Review"].map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",flex:i<2?1:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:step>i+1?C.g:step===i+1?C.p:C.b,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:step>=i+1?"white":C.tl,transition:"all 0.3s",flexShrink:0}}>{step>i+1?"✓":i+1}</div>
              <span style={{fontSize:11,fontWeight:step===i+1?700:400,color:step===i+1?C.p:step>i+1?C.g:C.tl,whiteSpace:"nowrap"}}>{s}</span>
            </div>
            {i<2&&<div style={{flex:1,height:2,background:step>i+1?C.g:C.b,margin:"0 10px",borderRadius:2,transition:"background 0.3s"}}/>}
          </div>
        ))}
      </div>
      <div style={{padding:"16px 20px",maxHeight:340,overflowY:"auto"}}>
        {step===1&&<div>
          <div style={{background:C.bg,borderRadius:8,padding:"9px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8,border:`1px solid ${C.b}`}}>
            <span style={{fontSize:11,color:C.tl}}>Copying from:</span><strong style={{fontSize:11.5,color:C.t,flex:1}}>{project.name}</strong>
            <span style={{background:C.bl,color:C.p,fontSize:9.5,fontWeight:700,padding:"2px 7px",borderRadius:20}}>Template</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["New Project Name *",form.name,"name","text",true],["City *",form.city,"city","text",false],["BOQ Value (₹) *",form.boq,"boq","number",false],["Type",project.type,"_type","text",false],["Start Date",form.start,"start","date",false],["End Date",form.end,"end","date",false]].map(([lbl,val,key,type,full])=>(
              <div key={key} style={{gridColumn:full?"1 / -1":"auto"}}>
                <label style={{fontSize:10,fontWeight:700,color:C.tm,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>{lbl}</label>
                <input type={type} value={val} onChange={e=>setF(key,e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${C.b}`,fontSize:12.5,color:C.t,background:C.bg,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.p} onBlur={e=>e.target.style.borderColor=C.b}/>
              </div>
            ))}
          </div>
          <div style={{background:C.gl,borderRadius:8,padding:"8px 12px",fontSize:11,color:C.g,display:"flex",gap:6,marginTop:12}}><span>✅</span><span>All tasks, BOQ items, dependencies & phases will be copied automatically.</span></div>
        </div>}
        {step===2&&<div>
          <p style={{fontSize:11.5,color:C.tl,margin:"0 0 14px"}}>Click to assign team for the new project.</p>
          {[{role:"Project Manager",val:pm,setter:setPM,prev:project.pm},{role:"Site Supervisor",val:sup,setter:setSup,prev:""}].map(({role,val,setter,prev})=>(
            <div key={role} style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:C.tm,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:7}}>{role}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {TEAM.map(t=><button key={t.id} onClick={()=>setter(t.name)} style={{padding:"6px 11px",borderRadius:7,border:`1.5px solid ${val===t.name?t.color:C.b}`,background:val===t.name?t.color+"14":C.bg,fontSize:11.5,color:val===t.name?t.color:C.tm,fontWeight:val===t.name?700:400,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s"}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:val===t.name?t.color:C.b,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:val===t.name?"white":C.tl}}>{t.initials}</div>
                  {t.name}{prev===t.name&&<span style={{fontSize:8.5,color:C.tl}}>(prev)</span>}
                </button>)}
              </div>
            </div>
          ))}
        </div>}
        {step===3&&(!done
          ?<div>
            <div style={{fontSize:12,fontWeight:700,color:C.t,marginBottom:10}}>Review before creating:</div>
            {[["Project Name",form.name],["City",form.city],["BOQ",`₹${Number(form.boq).toLocaleString("en-IN")}`],["PM",pm],["Supervisor",sup],["Timeline",`${form.start||"TBD"} → ${form.end||"TBD"}`],["Initial Status","Not Started · 0%"],["Carry Over","Tasks · BOQ · Phases · Dependencies"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",padding:"7px 0",borderBottom:`1px solid ${C.b}`}}><span style={{width:140,fontSize:11.5,color:C.tl,flexShrink:0}}>{k}</span><span style={{fontSize:11.5,fontWeight:600,color:C.t}}>{v}</span></div>
            ))}
          </div>
          :<div style={{textAlign:"center",padding:"28px 0"}}><div style={{fontSize:44,marginBottom:10}}>✅</div><div style={{fontSize:15,fontWeight:800,color:C.g}}>Project Created!</div><div style={{fontSize:12,color:C.tl,marginTop:4}}>{form.name} added.</div></div>
        )}
      </div>
      {!done&&<div style={{padding:"12px 20px",borderTop:`1px solid ${C.b}`,display:"flex",gap:8,background:"#FAFBFF"}}>
        {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"9px",borderRadius:8,border:`1.5px solid ${C.b}`,background:C.bg,fontSize:12,fontWeight:600,color:C.tm,cursor:"pointer"}}>← Back</button>}
        <button onClick={step<3?()=>setStep(s=>s+1):handleCreate} style={{flex:2,padding:"9px",borderRadius:8,background:step===3?`linear-gradient(135deg,${C.g},#388E3C)`:`linear-gradient(135deg,${C.p},${C.p2})`,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
          {step===1?"Next: Team →":step===2?"Next: Review →":"✓ Create Duplicate"}
        </button>
      </div>}
    </div>
  </>);
}


// ── Map API data to frontend format ──────────────────────────────────
const STATUS_MAP={"ongoing":"Ongoing","completed":"Completed","hold":"Hold","not_started":"Not Started"};
const TYPE_MAP={"residential":"Residential","commercial":"Commercial","industrial":"Industrial"};
const fmtDate=(iso)=>{if(!iso)return"";const d=new Date(iso);const m=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return`${m[d.getMonth()]} ${d.getFullYear()}`;};
const mapProject=(p)=>({
  id:p.id, name:p.name, client:p.client_name||"", city:p.city||"",
  type:TYPE_MAP[p.type]||p.type||"Residential",
  progress:p.progress_pct||0,
  status:STATUS_MAP[p.status]||p.status||"Not Started",
  boq:parseFloat(p.boq_value)||0,
  expense:parseFloat(p.total_expense)||0,
  pm:p.pm_name||"",
  start:fmtDate(p.start_date),
  end:fmtDate(p.end_date),
  project_type:p.project_type||"construction",
  _raw:p,
});


// ═══════════════════════════════════════════════════════════════════
// PROJECT SETTINGS MODAL
// ═══════════════════════════════════════════════════════════════════
const STATUS_OPTIONS = ["Not Started","Ongoing","Hold","Completed"];
const TYPE_OPTIONS   = ["Residential","Commercial","Industrial","Interior"];
const CITIES         = ["Raipur","Bhilai","Bilaspur","Durg","Rajnandgaon","Other"];

function ProjectSettingsModal({project, onClose, onUpdated, onDeleted}){
  const [section, setSection] = useState("basic"); // basic | team | status | danger
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  // Form state
  const [form, setForm] = useState({
    name:         project.name       || "",
    client_name:  project.client     || "",
    city:         project.city       || "",
    type:         project._raw?.type || project.type || "Residential",
    pm_name:      project.pm         || "",
    start_date:   project._raw?.start_date ? project._raw.start_date.split("T")[0] : "",
    end_date:     project._raw?.end_date   ? project._raw.end_date.split("T")[0]   : "",
    boq_value:    String(project.boq   || ""),
    progress_pct: String(project.progress || ""),
    status:       project._raw?.status || project.status || "Not Started",
  });
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSave = async () => {
    if(!form.name.trim()) return setError("Project name required");
    setSaving(true); setError("");
    try {
      // Reverse map display values → DB values
      const STATUS_R={"Ongoing":"ongoing","Completed":"completed","Hold":"hold","Not Started":"not_started"};
      const TYPE_R={"Residential":"residential","Commercial":"commercial","Industrial":"industrial","Interior":"interior"};
      const payload = {
        name:         form.name,
        client_name:  form.client_name,
        city:         form.city,
        type:         TYPE_R[form.type]||form.type,
        pm_name:      form.pm_name,
        start_date:   form.start_date || null,
        end_date:     form.end_date   || null,
        boq_value:    form.boq_value  ? parseFloat(form.boq_value)  : null,
        progress_pct: form.progress_pct ? parseInt(form.progress_pct) : null,
        status:       STATUS_R[form.status]||form.status,
      };
      const res = await api.put("/projects/"+project.id, payload);
      if(res.success) {
        apiCache.invalidate("projects");
        onUpdated(mapProject(res.data));
        onClose();
      } else {
        setError(res.message || "Save failed");
      }
    } catch(e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleArchive = async () => {
    setSaving(true);
    try {
      const res = await api.patch("/projects/"+project.id+"/archive", { archived: true });
      if(res.success){ apiCache.invalidate("projects"); onDeleted(project.id,"archived"); onClose(); }
      else setError(res.message||"Archive failed");
    } catch(e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const deleteMatch = deleteText.trim().toUpperCase() === "DELETE";

  const handleDelete = async () => {
    if(!deleteMatch) return setError("Type DELETE to confirm");
    setSaving(true);
    try {
      const res = await api.del("/projects/"+project.id);
      if(res.success){ apiCache.invalidate("projects"); onDeleted(project.id,"deleted"); onClose(); }
      else setError(res.message||"Delete failed");
    } catch(e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const SECTIONS = [
    {id:"basic",  label:"Basic Info",    icon:"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"},
    {id:"team",   label:"Team & Roles",  icon:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"},
    {id:"status", label:"Status & Dates",icon:"M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"},
    {id:"danger", label:"Danger Zone",   icon:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"},
  ];

  const inp = (k,ph,type="text",min,max) => (
    <input type={type} value={form[k]} onChange={e=>upd(k,e.target.value)}
      placeholder={ph} min={min} max={max}
      style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
      onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
  );
  const sel = (k,opts) => (
    <SearchSelect value={form[k]} options={opts}
      onChange={v=>upd(k,v)} placeholder={`Select ${k}...`}/>
  );
  const lbl = (txt,req) => (
    <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>
      {txt}{req&&<span style={{color:T.red}}> *</span>}
    </label>
  );

  return (<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:998,backdropFilter:"blur(2px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 24px 64px rgba(0,0,0,0.22)",zIndex:999,width:640,maxHeight:"88vh",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",overflow:"hidden"}}>

      {/* Header */}
      <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>Project Settings</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.45)",marginTop:2,maxWidth:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{project.name}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex",padding:4}}>
          <IcX size={15}/>
        </button>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Left sidebar nav */}
        <div style={{width:160,background:"#F8F9FB",borderRight:"1px solid "+T.b1,flexShrink:0,padding:"10px 8px",display:"flex",flexDirection:"column",gap:2}}>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>{setSection(s.id);setError("");setConfirmDelete(false);setConfirmArchive(false);}}
              style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:7,border:"none",background:section===s.id?T.bluL:"none",color:section===s.id?T.blu:T.t3,fontSize:12,fontWeight:section===s.id?600:400,cursor:"pointer",textAlign:"left",width:"100%",transition:"all 0.12s",borderLeft:section===s.id?"3px solid "+T.blu:"3px solid transparent"}}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={s.icon}/></svg>
              {s.label}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>

          {/* ── BASIC INFO ── */}
          {section==="basic"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:4}}>Basic Information</div>
              <div>
                {lbl("Project Name",true)}
                {inp("name","e.g. My Residence Project")}
              </div>
              <div>
                {lbl("Client Name",true)}
                {inp("client_name","e.g. Client Name")}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  {lbl("City")}
                  {sel("city",CITIES)}
                </div>
                <div>
                  {lbl("Project Type")}
                  {sel("type",TYPE_OPTIONS)}
                </div>
              </div>
              <div>
                {lbl("BOQ Value (₹)")}
                {inp("boq_value","e.g. 4250000","number")}
              </div>
            </div>
          )}

          {/* ── TEAM & ROLES ── */}
          {section==="team"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:4}}>Team & Roles</div>
              <div>
                {lbl("Project Manager (PM)")}
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {TEAM.map(t=>(
                    <button key={t.id} onClick={()=>upd("pm_name",t.name)}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"1.5px solid "+(form.pm_name===t.name?t.color:T.b1),background:form.pm_name===t.name?t.color+"12":T.surface,cursor:"pointer",textAlign:"left",transition:"all 0.12s"}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:t.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"white",flexShrink:0}}>{t.initials}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:form.pm_name===t.name?t.color:T.t1}}>{t.name}</div>
                        <div style={{fontSize:11,color:T.t4}}>{t.role}</div>
                      </div>
                      {form.pm_name===t.name&&<div style={{width:18,height:18,borderRadius:"50%",background:t.color,display:"flex",alignItems:"center",justifyContent:"center"}}><IcChk size={11} color="white"/></div>}
                    </button>
                  ))}
                  <div style={{marginTop:4}}>
                    {lbl("Or type custom name")}
                    <input value={form.pm_name} onChange={e=>upd("pm_name",e.target.value)} placeholder="Type PM name..."
                      style={{width:"100%",padding:"8px 11px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STATUS & DATES ── */}
          {section==="status"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:4}}>Status & Timeline</div>
              <div>
                {lbl("Project Status")}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {STATUS_OPTIONS.map(s=>{
                    const sc={Ongoing:{c:T.grn,bg:T.grnL,brd:T.grnM},"Not Started":{c:T.slt,bg:T.sltL,brd:T.b2},Hold:{c:T.amb,bg:T.ambL,brd:T.ambM},Completed:{c:T.blu,bg:T.bluL,brd:T.bluM}}[s];
                    return(
                      <button key={s} onClick={()=>upd("status",s)}
                        style={{padding:"10px 12px",borderRadius:8,border:"1.5px solid "+(form.status===s?sc.brd:T.b1),background:form.status===s?sc.bg:T.surface,color:form.status===s?sc.c:T.t3,fontSize:12.5,fontWeight:form.status===s?700:400,cursor:"pointer",display:"flex",alignItems:"center",gap:7,transition:"all 0.12s"}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:form.status===s?sc.c:T.b2,flexShrink:0}}/>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                {lbl("Progress (%)")}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <input type="range" min={0} max={100} value={form.progress_pct||0} onChange={e=>upd("progress_pct",e.target.value)}
                    style={{flex:1,accentColor:T.blu}}/>
                  <div style={{width:48,textAlign:"center",fontSize:15,fontWeight:700,color:T.blu}}>{form.progress_pct||0}%</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  {lbl("Start Date")}
                  {inp("start_date","","date")}
                </div>
                <div>
                  {lbl("End Date")}
                  {inp("end_date","","date")}
                </div>
              </div>
            </div>
          )}

          {/* ── DANGER ZONE ── */}
          {section==="danger"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:13,fontWeight:700,color:T.red,marginBottom:4}}>Danger Zone</div>

              {/* Archive */}
              <div style={{background:T.ambL,border:"1px solid "+T.ambM,borderRadius:8,padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:T.amb,marginBottom:4}}>Archive Project</div>
                    <div style={{fontSize:12,color:T.t3,lineHeight:1.5}}>Project list se hat jaayega, data safe rahega. Baad mein unarchive kar sakte ho.</div>
                  </div>
                  {!confirmArchive
                    ?<button onClick={()=>setConfirmArchive(true)} style={{padding:"7px 14px",borderRadius:7,background:T.surface,border:"1.5px solid "+T.ambM,color:T.amb,fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>Archive</button>
                    :<div style={{display:"flex",gap:6,flexShrink:0}}>
                      <button onClick={()=>setConfirmArchive(false)} style={{padding:"7px 12px",borderRadius:7,background:T.surface,border:"1px solid "+T.b1,color:T.t3,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                      <button onClick={handleArchive} disabled={saving} style={{padding:"7px 14px",borderRadius:7,background:T.amb,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:saving?"not-allowed":"pointer"}}>Confirm Archive</button>
                    </div>
                  }
                </div>
              </div>

              {/* Delete */}
              <div style={{background:T.redL,border:"1px solid "+T.redM,borderRadius:8,padding:"14px 16px"}}>
                <div style={{fontSize:13,fontWeight:600,color:T.red,marginBottom:4}}>Delete Project</div>
                <div style={{fontSize:12,color:T.t3,lineHeight:1.5,marginBottom:12}}>Permanently delete karo. Agar transactions hain toh pehle unhe hatana hoga. Yeh action undo nahi hoga.</div>
                {!confirmDelete
                  ?<button onClick={()=>setConfirmDelete(true)} style={{padding:"7px 14px",borderRadius:7,background:T.surface,border:"1.5px solid "+T.redM,color:T.red,fontSize:12,fontWeight:600,cursor:"pointer"}}>Delete Project</button>
                  :<div>
                    <div style={{fontSize:12,color:T.red,marginBottom:8}}>Confirm karne ke liye <strong>DELETE</strong> type karo:</div>
                    <input value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder="Type DELETE to confirm"
                      style={{width:"100%",padding:"8px 11px",borderRadius:7,border:"1.5px solid "+T.redM,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:10}}/>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{setConfirmDelete(false);setDeleteText("");}} style={{flex:1,padding:"8px",borderRadius:7,background:T.surface,border:"1px solid "+T.b1,color:T.t3,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                      <button onClick={handleDelete} disabled={saving||!deleteMatch}
                        style={{flex:2,padding:"8px",borderRadius:7,background:deleteMatch?T.red:T.b1,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:deleteMatch?"pointer":"not-allowed"}}>
                        {saving?"Deleting...":"Permanently Delete"}
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          )}

          {error&&<div style={{padding:"8px 12px",background:T.redL,border:"1px solid "+T.redM,borderRadius:7,fontSize:12,color:T.red,marginTop:8}}>{error}</div>}
        </div>
      </div>

      {/* Footer — Save / Cancel */}
      {section!=="danger"&&(
        <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,background:T.surfaceB,display:"flex",gap:8,flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.surface,border:"1px solid "+T.b1,fontSize:13,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{flex:2,padding:"9px",borderRadius:7,background:saving?T.b1:T.blu,border:"none",color:"white",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <IcSave size={14} color="white"/>
            {saving?"Saving...":"Save Changes"}
          </button>
        </div>
      )}
    </div>
  </>);
}


// ═══════════════════════════════════════════════════════════════════
// APPROVALS DRAWER
// ═══════════════════════════════════════════════════════════════════
// v2-fixed
function MRApprovalCard({mr, onApprove, onReject}){
  const [editQty,setEditQty]=useState(String(mr.quantity||""));
  const [showQtyEdit,setShowQtyEdit]=useState(false);
  const fmtAmt=n=>n>=100000?"₹"+(n/100000).toFixed(1)+"L":n>=1000?"₹"+(n/1000).toFixed(0)+"K":"₹"+n;
  const taskInfo=mr.notes&&mr.notes.includes("Task:")
    ?mr.notes.replace(/.*Task:\s*/,"").replace(/\s*\(TSK.*\)/,"").trim()
    :"";
  return(
    <div style={{background:T.surface,borderRadius:8,border:"1px solid "+T.b1,padding:"11px 13px",borderLeft:"3px solid "+T.amb}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{mr.item_name}</div>
          <div style={{fontSize:11,color:T.t4,marginTop:2}}>{mr.project_name||"—"} · {mr.quantity} {mr.unit}</div>
          {taskInfo&&<div style={{fontSize:10.5,color:T.blu,marginTop:2,fontWeight:600}}>📌 {taskInfo}</div>}
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3,flexWrap:"wrap"}}>
            <Credit label="By" name={mr.requested_by||"Site Team"} time={mr.created_at}/>
            <span style={{fontSize:10.5,color:T.t4,fontFamily:"monospace"}}>{mr.mr_number}</span>
          </div>
        </div>
        {mr.approx_amount>0&&<span style={{fontSize:12,fontWeight:700,color:T.amb,flexShrink:0}}>{fmtAmt(mr.approx_amount)}</span>}
      </div>
      {/* Qty edit */}
      <div style={{display:"flex",alignItems:"center",gap:6,margin:"8px 0 4px"}}>
        <span style={{fontSize:10.5,color:T.t3}}>Approve Qty:</span>
        {showQtyEdit
          ?<input autoFocus type="number" value={editQty} onChange={e=>setEditQty(e.target.value)}
              style={{width:80,padding:"3px 7px",borderRadius:5,border:"1.5px solid "+T.blu,fontSize:12,fontWeight:700,textAlign:"center",outline:"none"}}/>
          :<span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{editQty} {mr.unit}</span>
        }
        <button onClick={()=>setShowQtyEdit(s=>!s)}
          style={{fontSize:10,color:T.blu,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
          {showQtyEdit?"Done":"Edit Qty"}
        </button>
      </div>
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <button onClick={()=>onApprove(mr.id,Number(editQty)||mr.quantity)}
          style={{flex:2,padding:"7px",borderRadius:6,background:"#16A34A",color:"white",border:"none",cursor:"pointer",fontSize:12,fontWeight:700}}>
          Approve
        </button>
        <button onClick={()=>onReject(mr.id)}
          style={{flex:1,padding:"7px",borderRadius:6,background:"#FEE2E2",color:"#DC2626",border:"1px solid #FECACA",cursor:"pointer",fontSize:12,fontWeight:600}}>
          Reject
        </button>
      </div>
    </div>
  );
}

// ── MR Flow Card (mobile-style) ───────────────────────────────────────
const MR_STAGE_COLORS={
  Requested:{c:T.amb,bg:T.ambL,bdr:T.ambM,label:"Pending"},
  Approved: {c:T.grn,bg:T.grnL,bdr:T.grnM,label:"Approved"},
  Ordered:  {c:T.blu,bg:T.bluL,bdr:T.bluM,label:"Ordered"},
  Received: {c:"#7C3AED",bg:"#F5F3FF",bdr:"#DDD6FE",label:"Delivered"},
  Rejected: {c:T.red,bg:T.redL,bdr:T.redM,label:"Rejected"},
};
function MRFlowCard({mr, stage, onApprove, onReject, acting, rejectId, setRejectId, rejectNote, setRejectNote, onMarkOrdered, onMarkReceived}){
  const [editQty,setEditQty]=useState(String(mr.quantity||""));
  const sc=MR_STAGE_COLORS[stage]||MR_STAGE_COLORS.Requested;
  const act=acting[mr.id];
  const isReject=rejectId===mr.id;
  const fmtDate=d=>{if(!d)return"—";const dt=new Date(d);return dt.toLocaleDateString("en-IN",{day:"numeric",month:"short"});};
  const onWhatsApp=()=>{
    const msg=encodeURIComponent(
      `*Material Order Request*\n\n`+
      `Item: ${mr.item_name}\n`+
      `Qty: ${mr.quantity} ${mr.unit}\n`+
      `Project: ${mr.project_name||"—"}\n`+
      `MR No: ${mr.mr_number||"—"}\n`+
      (mr.required_date?`Required by: ${fmtDate(mr.required_date)}\n`:"")+
      (mr.notes?`Notes: ${mr.notes}\n`:"")
    );
    window.open(`https://wa.me/?text=${msg}`,"_blank");
  };
  return(
    <div style={{background:T.surface,borderRadius:10,border:"1px solid "+T.b1,overflow:"hidden",borderLeft:"4px solid "+sc.c}}>
      <div style={{padding:"11px 13px 8px"}}>
        {/* Top row: name + qty + status */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:4}}>
          <div style={{fontSize:13.5,fontWeight:700,color:T.t1,lineHeight:1.3}}>{mr.item_name}</div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:13,fontWeight:800,color:T.t1}}>{mr.quantity} {mr.unit}</div>
            <span style={{fontSize:9.5,fontWeight:700,color:sc.c,background:sc.bg,padding:"2px 7px",borderRadius:10,border:"1px solid "+sc.bdr}}>{sc.label}</span>
          </div>
        </div>
        {/* Project */}
        <div style={{fontSize:11.5,color:T.t3,marginBottom:3,fontWeight:500}}>{mr.project_name||"—"}</div>
        {/* Meta row */}
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:mr.notes?4:0,alignItems:"center"}}>
          <Credit label="Requested by" name={mr.requested_by||"Site Team"} time={mr.created_at}/>
          {mr.required_date&&<span style={{fontSize:11,color:T.t4}}>Expected {fmtDate(mr.required_date)}</span>}
        </div>
        {mr.notes&&<div style={{fontSize:11,color:T.t3,fontStyle:"italic",marginTop:2}}>"{mr.notes}"</div>}
        {mr.mr_number&&<div style={{fontSize:10,color:T.t4,marginTop:3}}>{mr.mr_number}</div>}
      </div>
      {/* Action row */}
      <div style={{padding:"8px 13px 11px",borderTop:"1px solid "+T.b1,background:T.bg}}>
        {stage==="Requested"&&(<>
          {isReject
            ?<div style={{display:"flex",flexDirection:"column",gap:5}}>
                <input value={rejectNote} onChange={e=>setRejectNote(e.target.value)} placeholder="Reject reason..."
                  style={{width:"100%",padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.redM,fontSize:11.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                <div style={{display:"flex",gap:5}}>
                  <button onClick={()=>{setRejectId(null);setRejectNote("");}} style={{flex:1,padding:"5px",borderRadius:6,background:T.surface,border:"1px solid "+T.b1,fontSize:11,cursor:"pointer",color:T.t3}}>Cancel</button>
                  <button onClick={()=>onReject(mr.id)} style={{flex:2,padding:"5px",borderRadius:6,background:T.red,border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>{act==="rejecting"?"...":"Confirm Reject"}</button>
                </div>
              </div>
            :<div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                <span style={{fontSize:10.5,color:T.t3,flexShrink:0}}>Approve Qty:</span>
                <input type="number" value={editQty} onChange={e=>setEditQty(e.target.value)}
                  style={{width:70,padding:"3px 7px",borderRadius:5,border:"1.5px solid "+T.blu,fontSize:12,fontWeight:700,textAlign:"center",outline:"none"}}/>
                <span style={{fontSize:11,color:T.t3}}>{mr.unit}</span>
              </div>
              <div style={{display:"flex",gap:7}}>
                <button onClick={()=>setRejectId(mr.id)} disabled={!!act}
                  style={{flex:1,padding:"7px",borderRadius:7,background:T.redL,border:"1px solid "+T.redM,color:T.red,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>✕ Reject</button>
                <button onClick={()=>onApprove(mr.id,Number(editQty)||mr.quantity)} disabled={!!act}
                  style={{flex:2,padding:"7px",borderRadius:7,background:act?"#9CA3AF":T.grn,border:"none",color:"white",fontSize:11.5,fontWeight:700,cursor:act?"not-allowed":"pointer"}}>
                  {act==="approving"?"Approving...":"✓ Approve"}
                </button>
              </div>
            </div>
          }
        </>)}
        {stage==="Approved"&&(
          <button onClick={onWhatsApp}
            style={{width:"100%",padding:"9px",borderRadius:7,background:"#25D366",border:"none",color:"white",fontSize:12.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="white"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
            Order via WhatsApp
          </button>
        )}
        {stage==="Ordered"&&(
          <button onClick={()=>onMarkReceived(mr.id)} disabled={acting[mr.id]==="receiving"}
            style={{width:"100%",padding:"9px",borderRadius:7,background:"#7C3AED",border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {acting[mr.id]==="receiving"?"Marking...":"✓ Mark as Delivered / Received"}
          </button>
        )}
        {stage==="Received"&&(
          <div style={{textAlign:"center",fontSize:12,color:T.grn,fontWeight:600}}>✓ Material delivered successfully</div>
        )}
        {stage==="Rejected"&&(
          <div style={{textAlign:"center",fontSize:12,color:T.red,fontWeight:600}}>✕ Request rejected</div>
        )}
      </div>
    </div>
  );
}

// ── PO Approval Card ──────────────────────────────────────────────────
function POApprovalCard({po, approved, acting, onApprove, onCancel}){
  const act=acting["po"+po.id];
  const fmtAmt=n=>n>=100000?`₹${(n/100000).toFixed(2)}L`:n>=1000?`₹${(n/1000).toFixed(0)}K`:`₹${Number(n||0).toLocaleString("en-IN")}`;
  const fmtDate=d=>{if(!d)return"—";return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"});};
  const borderColor=approved?T.grn:T.amb;
  return(
    <div style={{background:T.surface,borderRadius:10,border:"1px solid "+T.b1,overflow:"hidden",borderLeft:"4px solid "+borderColor}}>
      <div style={{padding:"11px 13px 10px"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:5}}>
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:T.t1}}>{po.vendor_name||"Unknown Vendor"}</div>
            <div style={{fontSize:11,color:T.t4,marginTop:1}}>{po.po_number} · {po.project_name||"—"}</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:14,fontWeight:800,color:T.t1}}>{fmtAmt(po.total_amount)}</div>
            <span style={{fontSize:9.5,fontWeight:700,color:approved?T.grn:T.amb,background:approved?T.grnL:T.ambL,padding:"2px 7px",borderRadius:10,border:"1px solid "+(approved?T.grnM:T.ambM)}}>
              {approved?"Approved":"Pending Approval"}
            </span>
          </div>
        </div>
        {/* Items preview */}
        {po.items?.length>0&&(
          <div style={{fontSize:11,color:T.t3,marginBottom:5}}>
            {po.items.slice(0,2).map((it,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between"}}>
                <span>{it.description}</span>
                <span style={{fontWeight:600}}>{it.quantity} {it.unit} @ ₹{it.rate}</span>
              </div>
            ))}
            {po.items.length>2&&<div style={{color:T.t4,fontStyle:"italic"}}>+{po.items.length-2} more items</div>}
          </div>
        )}
        {/* Meta */}
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {po.expected_delivery&&<span style={{fontSize:11,color:T.t4}}>📦 Delivery: {fmtDate(po.expected_delivery)}</span>}
          {approved&&po.approved_at&&<span style={{fontSize:11,color:T.grn}}>✓ Approved {fmtDate(po.approved_at)}</span>}
        </div>
      </div>
      {!approved&&(
        <div style={{padding:"8px 13px 11px",borderTop:"1px solid "+T.b1,background:T.bg,display:"flex",gap:7}}>
          <button onClick={onCancel} disabled={!!act}
            style={{flex:1,padding:"7px",borderRadius:7,background:T.redL,border:"1px solid "+T.redM,color:T.red,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
            Cancel PO
          </button>
          <button onClick={onApprove} disabled={!!act}
            style={{flex:2,padding:"7px",borderRadius:7,background:act?"#9CA3AF":"#16A34A",border:"none",color:"white",fontSize:12,fontWeight:700,cursor:act?"not-allowed":"pointer"}}>
            {act==="approving"?"Approving...":"✓ Approve PO"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── GRN Card (Warehouse received from vendor) ─────────────────────────
function GRNCard({grn}){
  const fmtDate=d=>{if(!d)return"—";return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"});};
  return(
    <div style={{background:T.surface,borderRadius:10,border:"1px solid "+T.b1,overflow:"hidden",borderLeft:"4px solid "+T.grn}}>
      <div style={{padding:"11px 13px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:5}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{grn.grn_no||`GRN-${grn.id}`}</div>
            <div style={{fontSize:11,color:T.t4,marginTop:1}}>{grn.project_name||"Central Warehouse"} · {grn.po_no||grn.vendor||"Direct"}</div>
          </div>
          <span style={{fontSize:9.5,fontWeight:700,color:T.grn,background:T.grnL,padding:"2px 7px",borderRadius:10,border:"1px solid "+T.grnM,flexShrink:0}}>Received</span>
        </div>
        {grn.items?.length>0
          ?grn.items.slice(0,3).map((it,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11.5,color:T.t2,marginBottom:2}}>
                <span>{it.name||it.material_name||it.description}</span>
                <span style={{fontWeight:600,color:T.grn}}>{it.received_qty||it.qty||it.quantity} {it.unit}</span>
              </div>
            ))
          :<div style={{fontSize:11.5,color:T.t3}}>Materials received on {fmtDate(grn.date||grn.created_at)}</div>
        }
        {grn.items?.length>3&&<div style={{fontSize:10.5,color:T.t4,fontStyle:"italic"}}>+{grn.items.length-3} more items</div>}
        <div style={{fontSize:10.5,color:T.t4,marginTop:5}}>
          By {grn.received_by_name||grn.received_by||"Warehouse"} · {fmtDate(grn.date||grn.created_at)}
        </div>
      </div>
    </div>
  );
}

// ── Warehouse MR Card (site→warehouse request, needs approval) ─────────
function WHMRCard({mr, acting, onApprove, onReject, rejectId, setRejectId, rejectNote, setRejectNote}){
  const fmtDate=d=>{if(!d)return"—";return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short"});};
  const PRIORITY_C={High:T.red,Medium:T.amb,Low:T.grn};
  const pc=PRIORITY_C[mr.priority]||T.amb;
  const act=acting["whmr"+mr.id];
  const isRej=rejectId==="whmr"+mr.id;
  const statusColors={Pending:{c:T.amb,bg:T.ambL},Approved:{c:T.grn,bg:T.grnL},Rejected:{c:T.red,bg:T.redL},Issued:{c:T.blu,bg:T.bluL}};
  const sc=statusColors[mr.status]||statusColors.Pending;
  return(
    <div style={{background:T.surface,borderRadius:10,border:"1px solid "+T.b1,overflow:"hidden",borderLeft:"4px solid "+sc.c}}>
      <div style={{padding:"11px 13px 8px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:4}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{mr.mr_no||`WHMR-${mr.id}`}</div>
            <div style={{fontSize:11.5,color:T.t3,marginTop:1,fontWeight:500}}>{mr.project_name||"—"}</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <span style={{fontSize:9.5,fontWeight:700,color:sc.c,background:sc.bg,padding:"2px 8px",borderRadius:10,display:"block",marginBottom:3}}>{mr.status||"Pending"}</span>
            <span style={{fontSize:9.5,fontWeight:600,color:pc}}>● {mr.priority||"Medium"}</span>
          </div>
        </div>
        {/* Items */}
        {mr.items?.length>0&&(
          <div style={{background:T.bg,borderRadius:7,padding:"7px 9px",marginBottom:5}}>
            {mr.items.slice(0,3).map((it,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11.5,color:T.t2,marginBottom:i<mr.items.length-1?3:0}}>
                <span>{it.material_name||it.name}</span>
                <span style={{fontWeight:600}}>{it.qty} {it.unit}</span>
              </div>
            ))}
            {mr.items.length>3&&<div style={{fontSize:10.5,color:T.t4,fontStyle:"italic",marginTop:2}}>+{mr.items.length-3} more items</div>}
          </div>
        )}
        <Credit label="Requested by" name={mr.requested_by_name||"Site Team"} time={mr.date||mr.created_at}/>
      </div>
      {(mr.status==="Pending"||!mr.status)&&(
        <div style={{padding:"8px 13px 11px",borderTop:"1px solid "+T.b1,background:T.bg}}>
          {isRej
            ?<div style={{display:"flex",flexDirection:"column",gap:5}}>
                <input value={rejectNote} onChange={e=>setRejectNote(e.target.value)} placeholder="Reject reason..."
                  style={{width:"100%",padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.redM,fontSize:11.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                <div style={{display:"flex",gap:5}}>
                  <button onClick={()=>{setRejectId(null);setRejectNote("");}} style={{flex:1,padding:"5px",borderRadius:6,background:"white",border:"1px solid "+T.b1,fontSize:11,cursor:"pointer",color:T.t3}}>Cancel</button>
                  <button onClick={()=>onReject(mr.id)} style={{flex:2,padding:"5px",borderRadius:6,background:T.red,border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>{act==="rejecting"?"...":"Confirm Reject"}</button>
                </div>
              </div>
            :<div style={{display:"flex",gap:7}}>
                <button onClick={()=>setRejectId("whmr"+mr.id)} disabled={!!act}
                  style={{flex:1,padding:"7px",borderRadius:7,background:T.redL,border:"1px solid "+T.redM,color:T.red,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>✕ Reject</button>
                <button onClick={()=>onApprove(mr.id)} disabled={!!act}
                  style={{flex:2,padding:"7px",borderRadius:7,background:act?"#9CA3AF":T.grn,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:act?"not-allowed":"pointer"}}>
                  {act==="approving"?"Approving...":"✓ Approve & Dispatch"}
                </button>
              </div>
          }
        </div>
      )}
    </div>
  );
}

// ── Transfer Card ─────────────────────────────────────────────────────
function TransferCard({tr}){
  const fmtDate=d=>{if(!d)return"—";return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"});};
  return(
    <div style={{background:T.surface,borderRadius:10,border:"1px solid "+T.b1,overflow:"hidden",borderLeft:"4px solid "+T.blu}}>
      <div style={{padding:"11px 13px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:5}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{tr.transfer_no||`TRF-${tr.id}`}</div>
            <div style={{fontSize:11,color:T.t4,marginTop:1}}>
              {tr.from_location||"Warehouse"} → {tr.to_location||"Site"}
            </div>
          </div>
          <span style={{fontSize:9.5,fontWeight:700,color:T.blu,background:T.bluL,padding:"2px 7px",borderRadius:10,border:"1px solid "+T.bluM,flexShrink:0}}>{tr.status||"Completed"}</span>
        </div>
        {tr.items?.length>0&&tr.items.slice(0,3).map((it,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11.5,color:T.t2,marginBottom:2}}>
            <span>{it.material_name||it.name}</span>
            <span style={{fontWeight:600,color:T.blu}}>{it.qty} {it.unit}</span>
          </div>
        ))}
        {tr.items?.length>3&&<div style={{fontSize:10.5,color:T.t4,fontStyle:"italic"}}>+{tr.items.length-3} more</div>}
        <div style={{fontSize:10.5,color:T.t4,marginTop:5}}>
          By {tr.transferred_by_name||"Warehouse"} · {fmtDate(tr.date||tr.created_at)}
        </div>
      </div>
    </div>
  );
}

function ApprovalsDrawer({onClose,mode="approvals",onSelectProject}){
  // mode: "approvals" → Design/Finance/Payment tabs
  //       "materials" → MR / PO / Warehouse tabs
  const [activeTab,setActiveTab]=useState(mode==="approvals"?"design":"mr");
  const [mrStage,setMrStage]=useState("Requested");  // MR stage sub-tab
  const [poView,setPoView]=useState("pending");       // PO sub-tab
  const [whTab,setWhTab]=useState("mr");              // Warehouse sub-tab: mr|grn|transfer
  // MR filters
  const [mrSite,setMrSite]=useState("All");           // project filter
  const [mrSearch,setMrSearch]=useState("");          // material name search
  const [data,setData]=useState({mrs:[],pos:[],whmrs:[],grns:[],transfers:[],finance:[],centralized:[]});
  const [loading,setLoading]=useState(true);
  const [acting,setActing]=useState({});
  const [rejectId,setRejectId]=useState(null);
  const [rejectNote,setRejectNote]=useState("");
  const [saveErr,setSaveErr]=useState("");
  const [raDetail,setRaDetail]=useState(null);  // {id, item} when an RA bill detail drawer is open

  const load=async()=>{
    setLoading(true);
    try{
      if(mode==="materials"){
        const [mrRes,poRes,whmrRes,grnRes,trRes]=await Promise.all([
          api.get("/procurement/mrs"),
          api.get("/procurement/pos"),
          api.get("/warehouse/mr").catch(()=>({success:false})),
          api.get("/warehouse/grn").catch(()=>({success:false})),
          api.get("/warehouse/transfers").catch(()=>({success:false})),
        ]);
        setData({
          mrs:    mrRes.success  ? mrRes.data   : [],
          pos:    poRes.success  ? poRes.data   : [],
          whmrs:  whmrRes.success? whmrRes.data : [],
          grns:   grnRes.success ? grnRes.data  : [],
          transfers: trRes.success ? trRes.data  : [],
          finance:[], centralized:[],
        });
      } else {
        const [prRes,apRes]=await Promise.all([
          api.get("/finance/payment-requests"),
          api.get("/approvals/pending").catch(()=>({success:false})),
        ]);
        setData({
          mrs:[], pos:[], whmrs:[], grns:[], transfers:[],
          finance:(prRes.success?prRes.data:[]).filter(p=>p.status==="pending"||p.status==="Pending"),
          centralized:apRes.success?apRes.data||[]:[],
        });
      }
    }catch(e){ setSaveErr("Data load failed"); }
    setLoading(false);
  };

  useEffect(()=>{load();},[]);

  // Centralized approve/reject
  const approveItem=async(id)=>{
    setSaveErr("");setActing(p=>({...p,["c"+id]:"approving"}));
    try{
      const res=await api.patch("/approvals/"+id+"/action",{action:"approve"});
      if(res.success) setData(p=>({...p,centralized:p.centralized.filter(c=>c.id!==id)}));
      else setSaveErr(res.message||"Approve failed");
    }catch(e){setSaveErr(e.message);}
    setActing(p=>({...p,["c"+id]:null}));
  };
  const rejectItem=async(id)=>{
    setSaveErr("");setActing(p=>({...p,["c"+id]:"rejecting"}));
    try{
      const res=await api.patch("/approvals/"+id+"/action",{action:"reject",remarks:rejectNote||"Rejected"});
      if(res.success) setData(p=>({...p,centralized:p.centralized.filter(c=>c.id!==id)}));
      else setSaveErr(res.message||"Reject failed");
    }catch(e){setSaveErr(e.message);}
    setActing(p=>({...p,["c"+id]:null}));
    setRejectId(null);setRejectNote("");
  };

  const approveMR=async(id,approvedQty)=>{
    setSaveErr(""); setActing(p=>({...p,[id]:"approving"}));
    try{
      const mr=(data.mrs||[]).find(m=>m.id===id);
      const res=await api.patch("/procurement/mrs/"+id+"/approve",{
        action:"Approved",
        approved_qty:approvedQty||mr?.quantity||null,
      });
      if(res.success===false) { setSaveErr(res.message||"Approve failed"); }
      else { setData(p=>({...p,mrs:(p.mrs||[]).filter(m=>m.id!==id)})); }
    }catch(e){ setSaveErr(e.message); }
    setActing(p=>({...p,[id]:null}));
  };
  const rejectMR=async(id)=>{
    setSaveErr(""); setActing(p=>({...p,[id]:"rejecting"}));
    try{
      const res=await api.patch("/procurement/mrs/"+id+"/approve",{
        action:"Rejected",
        rejected_reason:rejectNote||"Rejected by admin",
      });
      if(res.success===false) { setSaveErr(res.message||"Reject failed"); }
      else { setData(p=>({...p,mrs:(p.mrs||[]).filter(m=>m.id!==id)})); }
    }catch(e){ setSaveErr(e.message); }
    setActing(p=>({...p,[id]:null}));
    setRejectId(null); setRejectNote("");
  };
  const approvePR=async(id)=>{
    setSaveErr(""); setActing(p=>({...p,["pr"+id]:"approving"}));
    try{
      const res=await api.put("/finance/payment-requests/"+id+"/approve",{action:"approve"});
      if(res.success===false) { setSaveErr(res.message||"Approve failed"); }
      else { setData(p=>({...p,finance:p.finance.filter(f=>f.id!==id)})); }
    }catch(e){ setSaveErr(e.message); }
    setActing(p=>({...p,["pr"+id]:null}));
  };
  const rejectPR=async(id)=>{
    setSaveErr(""); setActing(p=>({...p,["pr"+id]:"rejecting"}));
    try{
      const res=await api.put("/finance/payment-requests/"+id+"/approve",{action:"reject",note:rejectNote});
      if(res.success===false) { setSaveErr(res.message||"Reject failed"); }
      else { setData(p=>({...p,finance:p.finance.filter(f=>f.id!==id)})); }
    }catch(e){ setSaveErr(e.message); }
    setActing(p=>({...p,["pr"+id]:null}));
    setRejectId(null); setRejectNote("");
  };

  // ── Data splits by category ──────────────────────────────────────────
  const designItems   = data.centralized.filter(i=>i._source==="design");
  const financeItems  = data.centralized.filter(i=>["ra_bill","wo_amendment","purchase_order","labour_rate","salary_edit"].includes(i._source));
  const paymentItems  = [
    ...data.centralized.filter(i=>i._source==="payment_request"),
    ...data.finance.filter(pf=>!data.centralized.some(c=>c._source_id===pf.id&&c._source==="payment_request")),
  ];

  // ── MR filtered list (site + material search) ──
  const mrSiteList = ["All",...Array.from(new Set(data.mrs.map(m=>m.project_name||"—").filter(Boolean)))];
  const mrFiltered = s => data.mrs.filter(m=>{
    if(m.stage!==s) return false;
    if(mrSite!=="All"&&(m.project_name||"—")!==mrSite) return false;
    if(mrSearch&&!m.item_name.toLowerCase().includes(mrSearch.toLowerCase())) return false;
    return true;
  });
  const mrByStage  = s => data.mrs.filter(m=>m.stage===s); // unfiltered count for badge

  // ── PO splits ──
  const pendingPOs  = data.pos.filter(p=>!p.approval_status||p.approval_status==="Pending");
  const approvedPOs = data.pos.filter(p=>p.approval_status==="Approved");

  // ── Warehouse splits ──
  const whPendingMRs   = data.whmrs.filter(m=>!m.status||m.status==="Pending");
  const whApprovedMRs  = data.whmrs.filter(m=>m.status==="Approved"||m.status==="Issued");
  const recentGRNs     = data.grns.slice(0,20);
  const recentTransfers= data.transfers.slice(0,20);

  const totalCount = mode==="approvals"
    ? designItems.length+financeItems.length+paymentItems.length
    : mrByStage("Requested").length + pendingPOs.length + whPendingMRs.length;

  const fmtAmt=n=>n>=100000?`₹${(n/100000).toFixed(1)}L`:n>=1000?`₹${(n/1000).toFixed(0)}K`:`₹${n}`;

  const SectionHead=({label,count,color,bg,bdr})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:bg,borderBottom:"1px solid "+bdr,borderTop:"1px solid "+bdr,marginTop:8}}>
      <span style={{fontSize:11,fontWeight:700,color,textTransform:"uppercase",letterSpacing:"0.6px"}}>{label}</span>
      <span style={{background:color,color:"white",fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20}}>{count}</span>
    </div>
  );

  const ApproveRejectBtns=({id,prefix="",onApprove,onReject})=>{
    const key=prefix+id;
    const act=acting[key];
    if(rejectId===key) return(
      <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:8}}>
        <input value={rejectNote} onChange={e=>setRejectNote(e.target.value)} placeholder="Reject karne ka reason..."
          style={{width:"100%",padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.redM,fontSize:11.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        <div style={{display:"flex",gap:5}}>
          <button onClick={()=>{setRejectId(null);setRejectNote("");}} style={{flex:1,padding:"5px",borderRadius:6,background:T.surface,border:"1px solid "+T.b1,fontSize:11,cursor:"pointer",color:T.t3}}>Cancel</button>
          <button onClick={onReject} style={{flex:2,padding:"5px",borderRadius:6,background:T.red,border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>{act==="rejecting"?"...":"Confirm Reject"}</button>
        </div>
      </div>
    );
    return(
      <div style={{display:"flex",gap:6,marginTop:8}}>
        <button onClick={()=>setRejectId(key)} disabled={!!act}
          style={{flex:1,padding:"6px",borderRadius:6,background:T.redL,border:"1px solid "+T.redM,color:T.red,fontSize:11,fontWeight:600,cursor:"pointer"}}>
          ✕ Reject
        </button>
        <button onClick={onApprove} disabled={!!act}
          style={{flex:2,padding:"6px",borderRadius:6,background:act==="approving"?T.b1:T.grn,border:"none",color:"white",fontSize:11,fontWeight:700,cursor:act?"not-allowed":"pointer"}}>
          {act==="approving"?"Approving...":"✓ Approve"}
        </button>
      </div>
    );
  };

  const CentralCard=({item})=>{
    const modColors={"Material Request":T.amb,"Design Approval":"#7C3AED","Purchase Order (PO)":T.blu,"RA Bill":"#0891B2","Subcon WO Amendment":"#EA580C","Payment Request":T.blu,"Material Site Transfer":"#059669","Material Issue":"#059669","Salary Edit":"#DB2777"};
    const mc=modColors[item.module]||T.slt;
    const act=acting["c"+item.id];
    const src=item._source;
    const srcAction=async(actionType)=>{
      const key="c"+item.id;
      const isRej=actionType==="reject"||actionType==="Rejected";
      setSaveErr("");setActing(p=>({...p,[key]:isRej?"rejecting":"approving"}));
      try{
        let res;
        if(src==="design"){
          const status=actionType==="Revision"?"Revision":isRej?"Rejected":"Approved";
          res=await api.patch("/design/drawings/"+item._source_id+"/status",{status,note:status==="Revision"?"Revision requested":undefined});
        } else if(src==="material_request"){
          res=await api.patch("/procurement/mrs/"+item._source_id+"/approve",{action:isRej?"Rejected":"Approved",approved_qty:item.quantity||null});
        } else if(src==="payment_request"){
          res=await api.put("/finance/payment-requests/"+item._source_id+"/approve",{action:isRej?"reject":"approve"});
        } else if(src==="purchase_order"){
          res=await api.patch("/procurement/pos/"+item._source_id+"/approve",{approved_by:""});
        } else if(src==="ra_bill"){
          res=await api.patch("/subcon/ra-bills/"+item._source_id+"/status",{status:isRej?"Rejected":"Approved"});
        } else if(src==="wo_amendment"){
          res=await api.patch("/subcon/amendments/"+item._source_id+"/action",{status:isRej?"Rejected":"Approved"});
        } else if(src==="labour_rate"){
          res=await api.patch("/approvals/labour-rate/"+item._source_id+"/action",{action:isRej?"reject":"approve"});
        } else if(src==="salary_edit"){
          res=await api.patch("/payroll/salary-edit-requests/"+item._source_id,{status:isRej?"rejected":"approved"});
        } else {
          res=await api.patch("/approvals/"+item.id+"/action",{action:isRej?"reject":"approve"});
        }
        if(res&&res.success!==false) setData(p=>({...p,centralized:p.centralized.filter(c=>c.id!==item.id)}));
        else setSaveErr((res&&res.message)||"Action failed");
      }catch(e){setSaveErr(e.message);}
      setActing(p=>({...p,["c"+item.id]:null}));
    };
    const isRaBill = src==="ra_bill";
    return(
      <div onClick={isRaBill ? ()=>setRaDetail({id:item._source_id,item}) : undefined}
        style={{background:T.surface,borderRadius:8,border:"1px solid "+T.b1,padding:"11px 13px",borderLeft:"3px solid "+mc,cursor:isRaBill?"pointer":"default",transition:"background .12s"}}
        onMouseEnter={isRaBill?(e)=>{e.currentTarget.style.background=T.surfaceB;}:undefined}
        onMouseLeave={isRaBill?(e)=>{e.currentTarget.style.background=T.surface;}:undefined}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
              <span style={{fontSize:9.5,fontWeight:700,color:mc,background:mc+"18",padding:"1px 7px",borderRadius:10,textTransform:"uppercase"}}>{item.module}</span>
              <span style={{fontSize:9.5,color:T.t4}}>{item.ref_no}</span>
              {src==="design"&&item.category&&<span style={{fontSize:9,color:T.t4}}>{item.category} · {item.drawing_type||"2D"}</span>}
            </div>
            <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{item.title}</div>
            <div style={{fontSize:10.5,color:T.t4,marginTop:2}}>{item.project_name||"—"} · by {item.submitted_by_name}{!src?" · L"+item.current_level+"/"+item.max_level:""}</div>
            {src==="labour_rate"&&(
              <div style={{display:"flex",gap:8,alignItems:"center",marginTop:6,padding:"6px 10px",background:T.bluL,borderRadius:6,border:"1px solid "+T.bluM}}>
                <span style={{fontSize:11,color:T.t3}}>Current: <b style={{color:T.t2}}>₹{item.current_rate||0}/day</b></span>
                <span style={{fontSize:13,color:T.blu,fontWeight:700}}>→</span>
                <span style={{fontSize:11,color:T.t3}}>Requested: <b style={{color:T.blu}}>₹{item.requested_rate||0}/day</b></span>
                <span style={{fontSize:10,color:item.requested_rate>item.current_rate?T.amb:T.grn,fontWeight:700,marginLeft:"auto"}}>
                  {item.requested_rate>item.current_rate?"+":""}₹{(item.requested_rate||0)-(item.current_rate||0)}
                </span>
              </div>
            )}
            {src==="labour_rate"&&item.labour_type==="base_rate"&&(
              <div style={{marginTop:5,padding:"4px 9px",borderRadius:6,background:item.apply_scope==="all"?T.ambL:T.surfaceB,border:`1px solid ${item.apply_scope==="all"?T.ambM:T.b1}`,fontSize:10.5,color:item.apply_scope==="all"?T.amb:T.t3,fontWeight:600}}>
                {item.apply_scope==="all" ? "🔄 SCOPE: Apply to ALL existing workers + future" : "📋 SCOPE: New appointments only"}
              </div>
            )}
            {src==="labour_rate"&&item.notes&&<div style={{fontSize:11,color:T.t3,marginTop:4,fontStyle:"italic"}}>"{item.notes}"</div>}
            {src==="salary_edit"&&(
              <div style={{display:"flex",gap:8,alignItems:"center",marginTop:6,padding:"6px 10px",background:T.bluL,borderRadius:6,border:"1px solid "+T.bluM}}>
                <span style={{fontSize:11,color:T.t3}}>Current: <b style={{color:T.t2}}>{fmtAmt(item.old_amount||0)}</b></span>
                <span style={{fontSize:13,color:T.blu,fontWeight:700}}>→</span>
                <span style={{fontSize:11,color:T.t3}}>Requested: <b style={{color:T.blu}}>{fmtAmt(item.new_amount||0)}</b></span>
                <span style={{fontSize:10,color:item.new_amount<item.old_amount?T.amb:T.grn,fontWeight:700,marginLeft:"auto"}}>
                  {item.new_amount<item.old_amount?"−":"+"}{fmtAmt(Math.abs((item.new_amount||0)-(item.old_amount||0)))}
                </span>
              </div>
            )}
            {src==="salary_edit"&&item.notes&&<div style={{fontSize:11,color:T.t3,marginTop:4,fontStyle:"italic"}}>"{item.notes}"</div>}
          </div>
          {item.amount>0&&src!=="labour_rate"&&src!=="salary_edit"&&<span style={{fontSize:13,fontWeight:700,color:mc,flexShrink:0}}>{fmtAmt(item.amount)}</span>}
        </div>
        {!src&&item.max_level>0&&(
          <div style={{display:"flex",gap:4,margin:"6px 0",alignItems:"center"}}>
            {Array.from({length:item.max_level},(_,i)=>{
              const lvl=i+1;const done=lvl<item.current_level;const pending=lvl===item.current_level;
              return <div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:done?"#059669":pending?mc:"#E5E7EB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:done||pending?"white":"#9CA3AF"}}>{done?"✓":"L"+(lvl)}</div>
                {i<item.max_level-1&&<div style={{width:16,height:2,background:done?"#059669":"#E5E7EB"}}/>}
              </div>;
            })}
            <span style={{fontSize:9.5,color:T.t4,marginLeft:4}}>Pending: {item.pending_role||"—"}</span>
          </div>
        )}
        <div style={{display:"flex",gap:6,marginTop:6}} onClick={isRaBill?(e)=>e.stopPropagation():undefined}>
          {src!=="purchase_order"&&(
            <button onClick={(e)=>{e.stopPropagation();srcAction("reject");}} disabled={!!act}
              style={{flex:1,padding:"6px",borderRadius:6,background:T.redL,border:"1px solid "+T.redM,color:T.red,fontSize:11,fontWeight:700,cursor:act?"not-allowed":"pointer"}}>
              {act==="rejecting"?"...":"✕ Reject"}
            </button>
          )}
          {src==="design"&&(
            <button onClick={(e)=>{e.stopPropagation();srcAction("Revision");}} disabled={!!act}
              style={{flex:1,padding:"6px",borderRadius:6,background:"#DBEAFE",border:"1px solid #93C5FD",color:"#1D4ED8",fontSize:11,fontWeight:700,cursor:act?"not-allowed":"pointer"}}>
              ↻ Revision
            </button>
          )}
          <button onClick={(e)=>{e.stopPropagation();srcAction("approve");}} disabled={!!act}
            style={{flex:2,padding:"6px",borderRadius:6,background:act==="approving"?T.b1:T.grn,border:"none",color:"white",fontSize:11,fontWeight:700,cursor:act?"not-allowed":"pointer"}}>
            {act==="approving"?"Approving...":"✓ Approve"}
          </button>
        </div>
        {isRaBill&&(
          <div style={{marginTop:7,padding:"5px 9px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:6,fontSize:10.5,color:T.blu,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
            Tap card to view bill items <span style={{fontSize:11}}>→</span>
          </div>
        )}
        {/* View Details / Open in Project link */}
        {item.project_id && onSelectProject && (()=>{
          const tabFor = src==="ra_bill"||src==="wo_amendment" ? "subcon"
                       : src==="design" ? "design"
                       : src==="material_request"||src==="purchase_order" ? "material"
                       : src==="payment_request" ? "transaction"
                       : src==="labour_rate" ? "attendance"
                       : "overview";
          return(
            <button onClick={(e)=>{
                e.stopPropagation();
                onClose();
                onSelectProject({ id:item.project_id, name:item.project_name, initialTab:tabFor });
              }}
              style={{marginTop:7,width:"100%",padding:"6px",borderRadius:6,background:"transparent",border:`1px dashed ${T.b2}`,color:T.t3,fontSize:10.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}
              onMouseEnter={e=>{e.currentTarget.style.background=T.bluL;e.currentTarget.style.borderColor=T.blu;e.currentTarget.style.color=T.blu;}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=T.b2;e.currentTarget.style.color=T.t3;}}>
              📋 Open in Project — full details →
            </button>
          );
        })()}
      </div>
    );
  };

  const EmptyState=({msg,sub})=>(
    <div style={{textAlign:"center",padding:"60px 20px"}}>
      <div style={{fontSize:36,marginBottom:8}}>✅</div>
      <div style={{fontSize:14,fontWeight:700,color:T.t2}}>{msg}</div>
      <div style={{fontSize:12,color:T.t4,marginTop:4}}>{sub}</div>
    </div>
  );

  const APPROVAL_TABS=[
    {id:"design",  label:"Design",  color:"#7C3AED", count:designItems.length},
    {id:"finance", label:"Finance", color:T.blu,     count:financeItems.length},
    {id:"payment", label:"Payment", color:T.grn,     count:paymentItems.length},
  ];
  const MATERIAL_TABS=[
    {id:"mr",        label:"Material Requests", color:T.blu, count:mrByStage("Requested").length},
    {id:"po",        label:"PO Approval",       color:T.amb, count:pendingPOs.length},
    {id:"warehouse", label:"Warehouse",         color:T.grn, count:whPendingMRs.length},
  ];
  const tabs=mode==="approvals"?APPROVAL_TABS:MATERIAL_TABS;
  const drawerTitle=mode==="approvals"?"Pending Approvals":"Material Approvals";
  const headerAccent=mode==="approvals"?T.amb:T.blu;

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.38)",zIndex:300,backdropFilter:"blur(2px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:440,background:T.bg,zIndex:301,boxShadow:"-4px 0 28px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>

      {/* Header */}
      <div style={{background:"#0D1B2A",padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontSize:15,fontWeight:700,color:"white"}}>{drawerTitle}</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={load} style={{background:"rgba(255,255,255,0.1)",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.7)",fontSize:10.5,padding:"3px 9px",borderRadius:5}}>↻ Refresh</button>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex",padding:4}}><IcX size={15}/></button>
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:10}}>
          <span style={{background:headerAccent,color:"white",fontSize:11,fontWeight:700,padding:"2px 10px",borderRadius:20}}>{totalCount} pending</span>
          <span style={{fontSize:10.5,color:"rgba(255,255,255,0.4)"}}>{mode==="approvals"?"Design · Finance · Payment":"Procurement · MR · Warehouse"}</span>
        </div>
        <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:"1px solid rgba(255,255,255,0.12)"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              style={{flex:1,padding:"8px 6px",border:"none",
                background:activeTab===t.id?"rgba(255,255,255,0.15)":"none",
                color:activeTab===t.id?"white":"rgba(255,255,255,0.5)",
                fontSize:11,fontWeight:activeTab===t.id?700:400,cursor:"pointer",
                borderBottom:activeTab===t.id?"2px solid "+t.color:"2px solid transparent",
                display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all .15s"}}>
              {t.label}
              {t.count>0&&<span style={{background:t.color,color:"white",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:10,lineHeight:1.6}}>{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:"auto"}}>
        {saveErr&&<div style={{margin:"8px 14px",padding:"8px 12px",background:T.redL,border:"1px solid "+T.redM,borderRadius:7,fontSize:12,color:T.red}}>{saveErr}</div>}
        {loading&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>Loading...</div>}

        {/* ── APPROVALS MODE ── */}
        {!loading&&mode==="approvals"&&activeTab==="design"&&(
          designItems.length===0
            ?<EmptyState msg="Koi pending Design approval nahi!" sub="Sab drawings reviewed hain"/>
            :<><SectionHead label="Design Approvals" count={designItems.length} color="#7C3AED" bg="#F5F3FF" bdr="#DDD6FE"/>
              <div style={{padding:"8px 14px",display:"flex",flexDirection:"column",gap:8}}>
                {designItems.map(item=><CentralCard key={item.id} item={item}/>)}
              </div></>
        )}
        {!loading&&mode==="approvals"&&activeTab==="finance"&&(
          financeItems.length===0
            ?<EmptyState msg="Koi pending Finance approval nahi!" sub="PO, RA Bills, Subcon WO sab clear hain"/>
            :<><SectionHead label="Finance Approvals" count={financeItems.length} color={T.blu} bg={T.bluL} bdr={T.bluM}/>
              <div style={{padding:"8px 14px",display:"flex",flexDirection:"column",gap:8}}>
                {financeItems.map(item=><CentralCard key={item.id} item={item}/>)}
              </div></>
        )}
        {!loading&&mode==="approvals"&&activeTab==="payment"&&(
          paymentItems.length===0
            ?<EmptyState msg="Koi pending Payment Request nahi!" sub="Sab PRs clear hain"/>
            :<><SectionHead label="Payment Requests" count={paymentItems.length} color={T.grn} bg={T.grnL} bdr={T.grnM}/>
              <div style={{padding:"8px 14px",display:"flex",flexDirection:"column",gap:8}}>
                {data.centralized.filter(i=>i._source==="payment_request").map(item=><CentralCard key={item.id} item={item}/>)}
                {data.finance.filter(pf=>!data.centralized.some(c=>c._source_id===pf.id&&c._source==="payment_request")).map(pr=>(
                  <div key={pr.id} style={{background:T.surface,borderRadius:8,border:"1px solid "+T.b1,padding:"11px 13px",borderLeft:"3px solid "+T.grn}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                          <span style={{fontSize:9.5,fontWeight:700,color:T.grn,background:T.grnL,padding:"1px 7px",borderRadius:10,textTransform:"uppercase"}}>PAYMENT REQUEST</span>
                          <span style={{fontSize:9.5,color:T.t4}}>PR-{pr.id}</span>
                        </div>
                        <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{pr.party_name||pr.party||"—"}</div>
                        <div style={{fontSize:10.5,color:T.t4,marginTop:2}}>{pr.project_name||pr.project||"—"} · {pr.description||pr.note||"—"}</div>
                      </div>
                      <span style={{fontSize:13,fontWeight:700,color:T.grn,flexShrink:0}}>{fmtAmt(pr.amount||0)}</span>
                    </div>
                    <ApproveRejectBtns id={pr.id} prefix="pr" onApprove={()=>approvePR(pr.id)} onReject={()=>rejectPR(pr.id)}/>
                  </div>
                ))}
              </div></>
        )}

        {/* ══ MATERIALS MODE ══════════════════════════════════════════════ */}

        {/* ── MR TAB: full status flow with filters ── */}
        {!loading&&mode==="materials"&&activeTab==="mr"&&(<>
          {/* Filters: site + material search */}
          <div style={{padding:"10px 14px 6px",borderBottom:"1px solid "+T.b1,display:"flex",gap:8,flexWrap:"wrap"}}>
            <select value={mrSite} onChange={e=>setMrSite(e.target.value)}
              style={{flex:"1 1 130px",padding:"6px 9px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,color:T.t2,background:"white",cursor:"pointer",fontFamily:"inherit"}}>
              {mrSiteList.map(s=><option key={s}>{s}</option>)}
            </select>
            <input value={mrSearch} onChange={e=>setMrSearch(e.target.value)} placeholder="Search material..."
              style={{flex:"2 1 150px",padding:"6px 9px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,color:T.t2,background:"white",outline:"none",fontFamily:"inherit"}}/>
          </div>
          {/* Status sub-tabs */}
          <div style={{display:"flex",gap:0,padding:"8px 14px 5px",overflowX:"auto",borderBottom:"1px solid "+T.b1}}>
            {[
              {s:"Requested", label:"Requests",  c:T.amb},
              {s:"Approved",  label:"Approved",  c:T.grn},
              {s:"Ordered",   label:"Ordered",   c:T.blu},
              {s:"Received",  label:"Delivered", c:"#7C3AED"},
              {s:"Rejected",  label:"Rejected",  c:T.red},
            ].map(({s,label,c})=>{
              const cnt=mrByStage(s).length;
              return(
                <button key={s} onClick={()=>setMrStage(s)}
                  style={{flexShrink:0,padding:"5px 10px",border:"none",borderRadius:20,marginRight:6,cursor:"pointer",
                    background:mrStage===s?c:T.b1,color:mrStage===s?"white":T.t3,
                    fontSize:11,fontWeight:mrStage===s?700:500,transition:"all .15s",display:"flex",alignItems:"center",gap:4}}>
                  {label}
                  {cnt>0&&<span style={{background:mrStage===s?"rgba(255,255,255,0.3)":c,color:"white",fontSize:9.5,fontWeight:700,padding:"1px 5px",borderRadius:10}}>{cnt}</span>}
                </button>
              );
            })}
          </div>
          {/* MR cards */}
          <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:10}}>
            {mrFiltered(mrStage).length===0
              ?<EmptyState
                  msg={mrStage==="Requested"?"Koi pending request nahi!":"Koi "+mrStage.toLowerCase()+" MR nahi!"}
                  sub={(mrSite!=="All"||mrSearch)?"Filter change karke dekhein":"Is stage mein koi item nahi"}/>
              :mrFiltered(mrStage).map(mr=><MRFlowCard key={mr.id} mr={mr} stage={mrStage}
                  onApprove={approveMR} onReject={rejectMR} acting={acting} rejectId={rejectId} setRejectId={setRejectId}
                  rejectNote={rejectNote} setRejectNote={setRejectNote}
                  onMarkOrdered={async(id)=>{
                    setActing(p=>({...p,[id]:"ordering"}));
                    await api.patch("/procurement/mrs/"+id+"/mark-ordered",{}).catch(()=>{});
                    setData(p=>({...p,mrs:p.mrs.map(m=>m.id===id?{...m,stage:"Ordered",mat_status:"Ordered"}:m)}));
                    setActing(p=>({...p,[id]:null}));
                  }}
                  onMarkReceived={async(id)=>{
                    setActing(p=>({...p,[id]:"receiving"}));
                    await api.patch("/procurement/mrs/"+id+"/mark-received",{received_qty:mr.approved_qty||mr.quantity}).catch(()=>{});
                    setData(p=>({...p,mrs:p.mrs.map(m=>m.id===id?{...m,stage:"Received",mat_status:"Received"}:m)}));
                    setActing(p=>({...p,[id]:null}));
                  }}
                />)
            }
          </div>
        </>)}

        {/* ── PO TAB ── */}
        {!loading&&mode==="materials"&&activeTab==="po"&&(<>
          {/* PO sub-tabs */}
          <div style={{display:"flex",gap:6,padding:"10px 14px 6px",borderBottom:"1px solid "+T.b1}}>
            {[{v:"pending",label:"Pending Approval",c:T.amb},{v:"approved",label:"Approved",c:T.grn}].map(opt=>(
              <button key={opt.v} onClick={()=>setPoView(opt.v)}
                style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:poView===opt.v?700:500,
                  background:poView===opt.v?opt.c:T.b1,color:poView===opt.v?"white":T.t3,display:"flex",alignItems:"center",gap:4}}>
                {opt.label}
                <span style={{background:"rgba(255,255,255,0.3)",color:"white",fontSize:9.5,fontWeight:700,padding:"1px 5px",borderRadius:10}}>
                  {poView===opt.v?(opt.v==="pending"?pendingPOs.length:approvedPOs.length):opt.v==="pending"?pendingPOs.length:approvedPOs.length}
                </span>
              </button>
            ))}
          </div>
          <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:10}}>
            {(poView==="pending"?pendingPOs:approvedPOs).length===0
              ?<EmptyState msg={poView==="pending"?"Koi pending PO approval nahi!":"Koi approved PO nahi!"} sub="Sab POs processed hain"/>
              :(poView==="pending"?pendingPOs:approvedPOs).map(po=>(
                <POApprovalCard key={po.id} po={po} approved={poView==="approved"} acting={acting}
                  onApprove={async()=>{
                    setActing(p=>({...p,["po"+po.id]:"approving"}));
                    const res=await api.patch("/procurement/pos/"+po.id+"/approve",{});
                    if(res.success) setData(p=>({...p,pos:p.pos.map(x=>x.id===po.id?{...x,approval_status:"Approved"}:x)}));
                    else setSaveErr(res.message||"Approve failed");
                    setActing(p=>({...p,["po"+po.id]:null}));
                  }}
                  onCancel={async()=>{
                    if(!await window.confirmAsync("Cancel this PO?")) return;
                    setActing(p=>({...p,["po"+po.id]:"cancelling"}));
                    await api.patch("/procurement/pos/"+po.id+"/cancel",{});
                    setData(p=>({...p,pos:p.pos.filter(x=>x.id!==po.id)}));
                    setActing(p=>({...p,["po"+po.id]:null}));
                  }}
                />
              ))
            }
          </div>
        </>)}

        {/* ── WAREHOUSE TAB: Site MR | GRN | Transfers ── */}
        {!loading&&mode==="materials"&&activeTab==="warehouse"&&(<>
          {/* Warehouse sub-tabs */}
          <div style={{display:"flex",gap:6,padding:"10px 14px 6px",borderBottom:"1px solid "+T.b1,overflowX:"auto"}}>
            {[
              {v:"mr",       label:"Site Requests", c:T.amb, count:whPendingMRs.length},
              {v:"grn",      label:"GRN Received",  c:T.grn, count:recentGRNs.length},
              {v:"transfer", label:"Transfers",     c:T.blu, count:recentTransfers.length},
            ].map(opt=>(
              <button key={opt.v} onClick={()=>setWhTab(opt.v)}
                style={{flexShrink:0,padding:"5px 11px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:whTab===opt.v?700:500,
                  background:whTab===opt.v?opt.c:T.b1,color:whTab===opt.v?"white":T.t3,transition:"all .15s",display:"flex",alignItems:"center",gap:4}}>
                {opt.label}
                {opt.count>0&&<span style={{background:whTab===opt.v?"rgba(255,255,255,0.3)":opt.c,color:"white",fontSize:9.5,fontWeight:700,padding:"1px 5px",borderRadius:10}}>{opt.count}</span>}
              </button>
            ))}
          </div>

          {/* Site MR — warehouse material requests from site */}
          {whTab==="mr"&&(<>
            {/* Pending / Approved toggle */}
            <div style={{padding:"8px 14px 4px",display:"flex",gap:6}}>
              <button onClick={()=>setData(p=>p)} style={{display:"none"}}/>
              {[{v:"pending",l:"Pending",items:whPendingMRs},{v:"approved",l:"Approved / Issued",items:whApprovedMRs}].map(opt=>(
                <button key={opt.v} onClick={()=>{}}
                  style={{padding:"3px 10px",borderRadius:14,border:"1px solid "+T.b1,fontSize:11,cursor:"default",
                    background:T.bg,color:T.t3,display:"flex",alignItems:"center",gap:4,pointerEvents:"none"}}>
                  {opt.l} <span style={{background:T.b2,color:T.t4,fontSize:9.5,fontWeight:700,padding:"1px 5px",borderRadius:8}}>{opt.items.length}</span>
                </button>
              ))}
            </div>
            <div style={{padding:"6px 14px 10px",display:"flex",flexDirection:"column",gap:10}}>
              {whPendingMRs.length===0
                ?<EmptyState msg="Koi pending warehouse request nahi!" sub="Site se koi material request nahi aayi abhi"/>
                :whPendingMRs.map(mr=>(
                    <WHMRCard key={mr.id} mr={mr} acting={acting}
                      rejectId={rejectId} setRejectId={setRejectId} rejectNote={rejectNote} setRejectNote={setRejectNote}
                      onApprove={async(id)=>{
                        setActing(p=>({...p,["whmr"+id]:"approving"}));
                        const res=await api.patch("/warehouse/mr/"+id,{status:"Approved"}).catch(()=>({success:false}));
                        if(res.success!==false) setData(p=>({...p,whmrs:p.whmrs.map(m=>m.id===id?{...m,status:"Approved"}:m)}));
                        else setSaveErr("Approve failed");
                        setActing(p=>({...p,["whmr"+id]:null}));
                      }}
                      onReject={async(id)=>{
                        setActing(p=>({...p,["whmr"+id]:"rejecting"}));
                        await api.patch("/warehouse/mr/"+id,{status:"Rejected"}).catch(()=>{});
                        setData(p=>({...p,whmrs:p.whmrs.map(m=>m.id===id?{...m,status:"Rejected"}:m)}));
                        setActing(p=>({...p,["whmr"+id]:null}));
                        setRejectId(null); setRejectNote("");
                      }}
                    />
                  ))
              }
              {whApprovedMRs.length>0&&(<>
                <div style={{fontSize:10.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.6px",marginTop:6}}>Already Approved / Issued</div>
                {whApprovedMRs.slice(0,5).map(mr=>(
                  <div key={mr.id} style={{background:T.surface,borderRadius:8,border:"1px solid "+T.b1,padding:"9px 12px",borderLeft:"3px solid "+T.grn}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,color:T.t1}}>
                      <span>{mr.mr_no||`WHMR-${mr.id}`} · {mr.project_name||"—"}</span>
                      <span style={{fontSize:10.5,color:T.grn,fontWeight:700}}>{mr.status}</span>
                    </div>
                    <div style={{fontSize:11,color:T.t4,marginTop:2}}>{mr.items?.length||0} items · {mr.priority||"Medium"} priority</div>
                  </div>
                ))}
              </>)}
            </div>
          </>)}

          {/* GRN — received from vendor */}
          {whTab==="grn"&&(
            <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:10}}>
              {recentGRNs.length===0
                ?<EmptyState msg="Koi GRN nahi!" sub="Abhi tak koi material receive nahi hua"/>
                :recentGRNs.map(grn=><GRNCard key={grn.id} grn={grn}/>)
              }
            </div>
          )}

          {/* Transfers — inter-site */}
          {whTab==="transfer"&&(
            <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:10}}>
              {recentTransfers.length===0
                ?<EmptyState msg="Koi transfer nahi!" sub="Inter-site material transfers yahaan dikhenge"/>
                :recentTransfers.map(tr=><TransferCard key={tr.id} tr={tr}/>)
              }
            </div>
          )}
        </>)}
      </div>
    </div>
    {raDetail && (
      <RaBillDetailDrawer
        billId={raDetail.id}
        item={raDetail.item}
        onClose={()=>setRaDetail(null)}
        onActionDone={(actedBillId)=>{
          // Remove the approved/rejected item from drawer & close detail
          setData(p=>({...p,centralized:p.centralized.filter(c=>!(c._source==="ra_bill"&&c._source_id===actedBillId))}));
          setRaDetail(null);
        }}
        onOpenProject={()=>{
          if(onSelectProject && raDetail.item.project_id){
            onClose();
            onSelectProject({ id:raDetail.item.project_id, name:raDetail.item.project_name, initialTab:"subcon" });
          }
        }}
      />
    )}
  </>);
}

// ── RA BILL DETAIL DRAWER (shown over ApprovalsDrawer) ───────────
function RaBillDetailDrawer({billId, item, onClose, onActionDone, onOpenProject}){
  const [bill,setBill]=useState(null);
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [acting,setActing]=useState(null);  // 'approving' | 'rejecting'
  const [err,setErr]=useState("");

  useEffect(()=>{
    let alive=true;
    (async()=>{
      setLoading(true);
      try{
        const r=await api.get("/subcon/ra-bills/"+billId);
        if(!alive) return;
        if(r.success){ setBill(r.data); setItems(r.data.items||[]); }
        else setErr(r.message||"Failed to load");
      }catch(e){ if(alive) setErr(e.message); }
      finally{ if(alive) setLoading(false); }
    })();
    return ()=>{ alive=false; };
  },[billId]);

  const fmtINR=n=>"₹"+Number(n||0).toLocaleString("en-IN");
  const fmtDate=s=>s?new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"—";

  const act=async(approve)=>{
    setErr(""); setActing(approve?"approving":"rejecting");
    try{
      const res=await api.patch("/subcon/ra-bills/"+billId+"/status",{status:approve?"Approved":"Rejected"});
      if(res.success!==false){ onActionDone(billId); }
      else setErr(res.message||"Action failed");
    }catch(e){ setErr(e.message); }
    setActing(null);
  };

  const stC = bill?.status==="Paid"?T.grn:bill?.status==="Approved"?T.blu:bill?.status==="Submitted"?T.amb:T.t4;

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:310,backdropFilter:"blur(2px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:560,background:T.bg,zIndex:311,boxShadow:"-6px 0 36px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideInRight .18s ease-out"}}>

      {/* Header */}
      <div style={{background:"#0891B2",padding:"14px 18px",flexShrink:0,color:"white"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,opacity:0.7,textTransform:"uppercase",letterSpacing:"0.5px"}}>RA Bill</div>
            <div style={{fontSize:17,fontWeight:700,marginTop:2}}>{bill?.bill_no || item?.ref_no || "—"}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",color:"white",padding:"6px",borderRadius:6,display:"flex"}}>
            <IcX size={16}/>
          </button>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",fontSize:11.5,opacity:0.9}}>
          <span>{item?.title || bill?.subcon_name}</span>
          <span style={{opacity:0.5}}>·</span>
          <span>{item?.project_name || "—"}</span>
          {bill?.bill_date && <><span style={{opacity:0.5}}>·</span><span>{fmtDate(bill.bill_date)}</span></>}
          {bill?.status && <span style={{marginLeft:"auto",background:"rgba(255,255,255,0.18)",padding:"2px 9px",borderRadius:12,fontSize:10,fontWeight:700}}>{bill.status}</span>}
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
        {err && <div style={{margin:"0 0 12px",padding:"8px 12px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:7,fontSize:12,color:T.red}}>{err}</div>}
        {loading ? (
          <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>
            <div style={{width:26,height:26,border:`3px solid ${T.b1}`,borderTopColor:T.blu,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
            Loading bill…
          </div>
        ) : bill ? (
          <>
            {/* KPI tiles */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
              {[
                {l:"Gross",       v:fmtINR(bill.gross_amount),  c:T.t1},
                {l:"Retention",   v:fmtINR(bill.retention_amt), c:T.amb},
                {l:"TDS",         v:fmtINR(bill.tds_amt),       c:T.red},
                {l:"Net Payable", v:fmtINR(bill.net_payable),   c:T.grn},
              ].map(s=>(
                <div key={s.l} style={{textAlign:"center",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,padding:"10px 8px"}}>
                  <div style={{fontSize:9,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:3}}>{s.l}</div>
                  <div style={{fontSize:13.5,fontWeight:800,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Items table */}
            <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,overflow:"hidden",marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 50px 64px 64px 64px 70px 80px",background:"#1E293B",padding:"7px 10px",gap:6}}>
                {["Description","Unit","WO Qty","Prev Cum","This Bill","Rate","Amount"].map((h,i)=>(
                  <div key={h} style={{fontSize:8.5,fontWeight:700,color:"rgba(255,255,255,.55)",textAlign:i>1?"right":"left",textTransform:"uppercase"}}>{h}</div>
                ))}
              </div>
              {items.length===0 && (
                <div style={{textAlign:"center",padding:"22px 0",color:T.t4,fontSize:12}}>No item breakdown</div>
              )}
              {items.map(it=>(
                <div key={it.id} style={{display:"grid",gridTemplateColumns:"2fr 50px 64px 64px 64px 70px 80px",padding:"8px 10px",gap:6,borderTop:`1px solid ${T.b1}`,alignItems:"center"}}>
                  <div style={{fontSize:11.5,color:T.t1}}>{it.description}</div>
                  <div style={{fontSize:11,color:T.t3}}>{it.unit}</div>
                  <div style={{fontSize:11,color:T.t2,textAlign:"right"}}>{parseFloat(it.wo_qty||0)}</div>
                  <div style={{fontSize:11,color:T.t3,textAlign:"right"}}>{parseFloat(it.prev_cumulative||0)>0?parseFloat(it.prev_cumulative||0):"—"}</div>
                  <div style={{fontSize:11,fontWeight:700,color:T.t1,textAlign:"right"}}>{parseFloat(it.this_bill_qty||0)}</div>
                  <div style={{fontSize:11,color:T.blu,textAlign:"right",fontWeight:600}}>{fmtINR(it.rate)}</div>
                  <div style={{fontSize:11,fontWeight:700,color:T.grn,textAlign:"right"}}>{fmtINR(it.this_bill_amount)}</div>
                </div>
              ))}
              {items.length>0 && (
                <div style={{display:"grid",gridTemplateColumns:"2fr 50px 64px 64px 64px 70px 80px",padding:"9px 10px",gap:6,background:T.surfaceB,borderTop:`1.5px solid ${T.b2}`}}>
                  <div style={{fontSize:11.5,fontWeight:700,color:T.t1,gridColumn:"1/7"}}>Total</div>
                  <div style={{fontSize:12.5,fontWeight:800,color:T.grn,textAlign:"right"}}>{fmtINR(bill.gross_amount)}</div>
                </div>
              )}
            </div>

            {bill.remark && (
              <div style={{padding:"10px 12px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,fontSize:12,color:T.t2,marginBottom:14}}>
                <div style={{fontSize:9.5,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:3}}>Remarks</div>
                {bill.remark}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Footer actions */}
      {!loading && bill && (
        <div style={{flexShrink:0,padding:"10px 14px 14px",borderTop:`1px solid ${T.b1}`,background:T.surface}}>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <button onClick={()=>act(false)} disabled={!!acting}
              style={{flex:1,padding:"10px",borderRadius:8,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:13,fontWeight:700,cursor:acting?"not-allowed":"pointer"}}>
              {acting==="rejecting" ? "Rejecting…" : "✕ Reject"}
            </button>
            <button onClick={()=>act(true)} disabled={!!acting}
              style={{flex:2,padding:"10px",borderRadius:8,background:acting==="approving"?T.b2:T.grn,border:"none",color:"white",fontSize:13,fontWeight:700,cursor:acting?"not-allowed":"pointer",boxShadow:"0 2px 6px rgba(5,150,105,0.25)"}}>
              {acting==="approving" ? "Approving…" : "✓ Approve"}
            </button>
          </div>
          <button onClick={onOpenProject}
            style={{width:"100%",padding:"7px",borderRadius:7,background:"transparent",border:`1px dashed ${T.b2}`,color:T.t3,fontSize:11,fontWeight:600,cursor:"pointer"}}
            onMouseEnter={e=>{e.currentTarget.style.background=T.bluL;e.currentTarget.style.borderColor=T.blu;e.currentTarget.style.color=T.blu;}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=T.b2;e.currentTarget.style.color=T.t3;}}>
            📋 Open in Project — for full WO context →
          </button>
        </div>
      )}
    </div>
    <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
  </>);
}

function ProjectsPage({onSelectProject}){
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const isAdmin = ["admin","super_admin","project_manager"].includes(currentUser.role);

  // Inject keyframes once
  if(!document.getElementById("gb-spin-css")){const s=document.createElement("style");s.id="gb-spin-css";s.textContent=`
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes slideIn{from{transform:translateX(100%);opacity:.7}to{transform:translateX(0);opacity:1}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  `;document.head.appendChild(s);}

  const [allProjects,setAllProjects]=useState([]);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState(null);
  const [view,setView]=useState("tile");
  const [search,setSearch]=useState("");
  const dSearch=useDebounce(search,250);
  const [filterCity,setFilterCity]=useState("All");
  const [filterStatus,setFilterStatus]=useState("All");
  const [hideCompleted,setHideCompleted]=useState(true);
  const [sortBy,setSortBy]=useState("Default");
  const [page,setPage]=useState(1); const PER_PAGE=20;
  const [showPulse,setShowPulse]=useState(false);
  const [dupOf,setDupOf]=useState(null);
  const [showNew,setShowNew]=useState(false);
  const [cardMenu,setCardMenu]=useState(null); // project id with open menu
  const [settingsOf,setSettingsOf]=useState(null); // project object for settings
  const [showApprovals,setShowApprovals]=useState(false);
  const [approvalMode,setApprovalMode]=useState("approvals"); // "approvals" | "materials"
  const [showIssuesDrawer,setShowIssuesDrawer]=useState(false);
  const [allIssues,setAllIssues]=useState([]);
  const [issuesLoading,setIssuesLoading]=useState(false);
  const [issueFilter,setIssueFilter]=useState("Open"); // which tab to open
  const [approvalCount,setApprovalCount]=useState(0);
  const [mrPendingCount,setMrPendingCount]=useState(0);
  const [prPendingCount,setPrPendingCount]=useState(0);
  const [todoCount,setTodoCount]=useState(0);
  const [showTodoDrawer,setShowTodoDrawer]=useState(false);
  const [allTodos,setAllTodos]=useState([]);
  const [todosLoading,setTodosLoading]=useState(false);

  // Load real approval counts from centralized engine
  const loadApprovalCounts=async()=>{
    const cached = apiCache.get("approval-counts");
    if(cached){
      setMrPendingCount(cached.mrCount);
      setPrPendingCount(cached.prCount);
      setApprovalCount(cached.total);
      return;
    }
    try{
      // Try centralized approval counts first
      const countRes=await api.get("/approvals/counts");
      if(countRes.success&&countRes.data){
        const byMod=countRes.data.byModule||[];
        const mrCount=byMod.find(m=>m.module==="Material Request")?.count||0;
        const prCount=byMod.find(m=>m.module==="Payment Request")?.count||0;
        const total=countRes.data.total||0;
        apiCache.set("approval-counts",{mrCount,prCount,total},30000);
        setMrPendingCount(mrCount);
        setPrPendingCount(prCount);
        setApprovalCount(total);
        return;
      }
    }catch(e){}
    // Fallback to direct queries
    try{
      const [mrRes,prRes,drRes]=await Promise.all([
        api.get("/procurement/mrs?mr_status=Pending"),
        api.get("/finance/payment-requests"),
        api.get("/design/drawings?status=Pending").catch(()=>({success:false})),
      ]);
      const mrCount=(mrRes.success?mrRes.data:[]).filter(m=>m.mr_status==="Pending"||m.stage==="Requested").length;
      const prCount=(prRes.success?prRes.data:[]).filter(p=>p.status==="pending"||p.status==="Pending").length;
      const designCount=(drRes.success?drRes.data:[]).length;
      const total=mrCount+prCount+designCount;
      apiCache.set("approval-counts",{mrCount,prCount,total},30000);
      setMrPendingCount(mrCount);
      setPrPendingCount(prCount);
      setApprovalCount(total);
    }catch(e){}
  };

  // Fetch projects from backend
  const fetchProjects=async()=>{
    // Check cache — show instantly if available
    const cached = apiCache.get("projects");
    if(cached){
      setAllProjects(cached);
      setLoading(false);
      setLoadError(null);
      // Silently refresh in background
      try{
        const res=await api.get("/projects");
        if(res.success&&res.data){
          const fresh=res.data.map(mapProject);
          apiCache.set("projects",fresh,60000);
          setAllProjects(fresh);
        }
      }catch(err){}
      return;
    }
    // No cache — normal fetch with loading spinner
    try{
      setLoading(true);setLoadError(null);
      const res=await api.get("/projects");
      if(res.success&&res.data){
        const mapped=res.data.map(mapProject);
        apiCache.set("projects",mapped,60000); // 60 sec cache
        setAllProjects(mapped);
      }else{
        setLoadError(res.message||"Failed to load projects");
        setAllProjects(PROJECTS_DATA);
      }
    }catch(err){
      console.error("Failed to fetch projects:",err);
      setLoadError("Failed to load projects. Using offline data.");
      setAllProjects(PROJECTS_DATA);
    }finally{
      setLoading(false);
    }
  };
  useEffect(()=>{
    fetchProjects().then(()=>{ loadApprovalCounts(); });
    // Load todo count
    api.get("/projects/my-todo-count").then(r=>{
      if(r.success&&r.data) setTodoCount(r.data.count||0);
    }).catch(()=>{});
    // Load issues independently — check cache first
    const cachedIssues = apiCache.get("all-issues");
    if(cachedIssues){
      setAllIssues(cachedIssues);
    }
    api.get("/tasks/all-issues").then(r=>{
      if(r.success){
        apiCache.set("all-issues",r.data||[],60000);
        setAllIssues(r.data||[]);
      }
    }).catch(()=>{});
  },[]);

  const cities=["All",...new Set(allProjects.map(p=>p.city))];
  const progClr=pct=>pct===100?T.grn:pct>60?T.blu:pct>30?T.amb:T.red;

  const filtered=allProjects.filter(p=>{
    if(hideCompleted&&p.status==="Completed") return false;
    if(filterCity!=="All"&&p.city!==filterCity) return false;
    if(filterStatus!=="All"&&p.status!==filterStatus) return false;
    if(dSearch&&!p.name.toLowerCase().includes(dSearch.toLowerCase())&&!p.client.toLowerCase().includes(dSearch.toLowerCase())) return false;
    return true;
  }).sort((a,b)=>sortBy==="A→Z"?a.name.localeCompare(b.name):sortBy==="End"?(a.end||"").localeCompare(b.end||""):sortBy==="↓%"?b.progress-a.progress:sortBy==="↑%"?a.progress-b.progress:0);

  // Reset page when filters change
  useEffect(()=>{setPage(1);},[dSearch,filterCity,filterStatus,hideCompleted,sortBy]);

  const totalPages=Math.ceil(filtered.length/PER_PAGE);
  const paginated=filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  // CSV Export
  const exportCSV = () => {
    const headers = ["Name","Client","City","Status","Progress","Start","End"];
    const rows = filtered.map(p => [p.name, p.client, p.city, p.status, p.progress+"%", p.start||"", p.end||""]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "projects_export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const stats={total:allProjects.length,ongoing:allProjects.filter(p=>p.status==="Ongoing").length,hold:allProjects.filter(p=>p.status==="Hold").length,notStarted:allProjects.filter(p=>p.status==="Not Started").length,completed:allProjects.filter(p=>p.status==="Completed").length};

  const SM={"Ongoing":{c:T.grn,bg:T.grnL},"Completed":{c:T.blu,bg:T.bluL},"Hold":{c:T.amb,bg:T.ambL},"Not Started":{c:T.slt,bg:T.sltL}};

  const ACTION_TILES=[
    {label:"Pending Approvals",val:approvalCount,Icon:IcWarn,color:T.amb,bg:T.ambL,bdr:T.ambM,onClick:()=>{setApprovalMode("approvals");setShowApprovals(true);}},
    {label:"Material Requests", val:mrPendingCount,Icon:IcProc,color:T.blu,bg:T.bluL,bdr:T.bluM,onClick:()=>{setApprovalMode("materials");setShowApprovals(true);}},
    {label:"My To-Do",          val:todoCount,   Icon:IcClip,  color:T.grn,bg:T.grnL,bdr:T.grnM,onClick:()=>{
      setShowTodoDrawer(true);
      setTodosLoading(true);
      api.get("/projects/all-todos").then(r=>{
        if(r.success) setAllTodos(r.data||[]);
      }).catch(()=>{}).finally(()=>setTodosLoading(false));
    }},
    {label:"Open Issues", val:allIssues.filter(i=>i.status==="Open"||i.status==="In Progress").length, Icon:IcWarn, color:T.red,bg:T.redL,bdr:T.redM,
      onClick:()=>{
      setIssueFilter("Open");
      setShowIssuesDrawer(true);
      // Refresh on open
      api.get("/tasks/all-issues").then(r=>{ if(r.success) setAllIssues(r.data||[]); }).catch(()=>{});
    }},
    {label:"Site Pulse",        val:"LIVE",Icon:IcPulse,color:T.pur,bg:T.purL,bdr:"#C4B5FD",live:true,onClick:()=>setShowPulse(true)},
  ];

  const Pill=({label,c,bg})=>(
    <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:20,whiteSpace:"nowrap",border:`1px solid ${c}33`,lineHeight:1.5}}>{label}</span>
  );
  const PBar=({pct,color,h=3})=>(
    <div style={{height:h,background:T.b1,borderRadius:h,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:color,borderRadius:h,transition:"width .5s"}}/>
    </div>
  );

  if(loading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{textAlign:"center",padding:"60px 0",color:"#94A3B8"}}>
        <div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>
        Loading...
      </div>
    </div>
  );
  if(loadError&&allProjects.length===0) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{textAlign:"center",padding:"60px 0",color:"#EF4444",fontSize:13}}>Failed to load data. <span style={{color:"#3B82F6",cursor:"pointer",textDecoration:"underline"}} onClick={()=>fetchProjects()}>Retry</span></div>
    </div>
  );

  return(
    <div style={{padding:"14px 18px",fontFamily:"'Segoe UI',system-ui,sans-serif",background:T.bg,minHeight:"100%"}} onClick={()=>setCardMenu(null)}>

      {/* ── COUNT PILLS ── */}
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:10,flexWrap:"wrap"}}>
        {[{l:"Total",v:stats.total,c:T.blu},{l:"Ongoing",v:stats.ongoing,c:T.grn},{l:"Hold",v:stats.hold,c:T.amb},{l:"Not Started",v:stats.notStarted,c:T.slt},{l:"Completed",v:stats.completed,c:T.t4}].map((p,i)=>(
          <div key={i} style={{display:"inline-flex",alignItems:"center",gap:5,background:T.surface,borderRadius:20,padding:"4px 11px 4px 8px",border:`1px solid ${T.b1}`,boxShadow:"0 1px 2px rgba(0,0,0,.04)",flexShrink:0,cursor:"default"}} onMouseEnter={e=>e.currentTarget.style.borderColor=p.c+"55"} onMouseLeave={e=>e.currentTarget.style.borderColor=T.b1}>
            <span style={{width:7,height:7,borderRadius:"50%",background:p.c,display:"inline-block",flexShrink:0}}/>
            <span style={{fontSize:14,fontWeight:800,color:T.t1}}>{p.v}</span>
            <span style={{fontSize:10.5,color:T.t3}}>{p.l}</span>
          </div>
        ))}
        <div style={{flex:1}}/>
        <button onClick={()=>setHideCompleted(h=>!h)} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:20,border:`1.5px solid ${!hideCompleted?T.blu:T.b1}`,background:!hideCompleted?T.bluL:T.surface,fontSize:11,fontWeight:600,color:!hideCompleted?T.blu:T.t3,cursor:"pointer",transition:"all .18s"}}>
          {!hideCompleted?<IcEyeX size={13} color={T.blu}/>:<IcEye size={13} color={T.t4}/>}
          {!hideCompleted?"Hide Completed":"Show Completed"}
          {hideCompleted&&stats.completed>0&&<span style={{background:T.bluL,color:T.blu,fontSize:9,fontWeight:700,padding:"0 5px",borderRadius:10}}>{stats.completed}</span>}
        </button>
      </div>

      {/* ── ACTION TILES ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:9,marginBottom:12}}>
        {ACTION_TILES.map((tile,i)=>(
          <div key={i} onClick={tile.onClick}
            style={{background:tile.bg,borderRadius:9,padding:"11px 13px 10px",border:`1px solid ${tile.bdr}`,cursor:tile.onClick?"pointer":"default",transition:"transform .15s,box-shadow .15s",position:"relative",overflow:"hidden"}}
            onMouseEnter={e=>{if(tile.onClick){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 6px 16px ${tile.color}22`;}}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
            {/* ghost bg icon */}
            <div style={{position:"absolute",right:-6,top:-6,opacity:.06,transform:"scale(2.6) rotate(8deg)",pointerEvents:"none"}}><tile.Icon size={20} color={tile.color}/></div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
              <tile.Icon size={16} color={tile.color}/>
              {tile.live&&<span style={{background:T.red,color:"white",fontSize:7,fontWeight:800,padding:"1px 4px",borderRadius:3,letterSpacing:".5px"}}>LIVE</span>}
            </div>
            <div style={{fontSize:typeof tile.val==="number"?21:13,fontWeight:800,color:tile.color,lineHeight:1,marginBottom:2}}>{tile.val}</div>
            <div style={{fontSize:10.5,fontWeight:600,color:tile.color,opacity:.8,lineHeight:1.3}}>{tile.label}</div>
          </div>
        ))}
      </div>

      {/* ── TOOLBAR — single line, inline search ── */}
      <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:8,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>

        {/* Search — icon inside input, perfectly inline */}
        <div style={{position:"relative",flex:1,minWidth:180}}>
          <div style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",display:"flex",alignItems:"center",lineHeight:0}}>
            <IcSrch size={13} color={T.t4}/>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects or clients..."
            style={{width:"100%",height:32,padding:"0 9px 0 28px",borderRadius:6,border:`1.5px solid ${search?T.blu:T.b1}`,fontSize:12.5,color:T.t1,background:search?T.bluL:T.surfaceB,outline:"none",boxSizing:"border-box",fontFamily:"inherit",transition:"border-color .15s,background .15s"}}
            onFocus={e=>{e.target.style.borderColor=T.blu;e.target.style.background=T.bluL;}}
            onBlur={e=>{if(!search){e.target.style.borderColor=T.b1;e.target.style.background=T.surfaceB;}}}/>
        </div>

        {/* City */}
        <div style={{position:"relative"}}>
          <select value={filterCity} onChange={e=>setFilterCity(e.target.value)}
            style={{height:32,padding:"0 24px 0 9px",borderRadius:6,border:`1.5px solid ${filterCity!=="All"?T.blu:T.b1}`,background:filterCity!=="All"?T.bluL:T.surfaceB,fontSize:12,color:filterCity!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:filterCity!=="All"?600:400,minWidth:90,appearance:"none",WebkitAppearance:"none"}}>
            {cities.map(c=><option key={c} value={c}>{c==="All"?"All Cities":c}</option>)}
          </select>
          <div style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcDown size={11} color={T.t4}/></div>
        </div>

        {/* Status */}
        <div style={{position:"relative"}}>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{height:32,padding:"0 24px 0 9px",borderRadius:6,border:`1.5px solid ${filterStatus!=="All"?T.blu:T.b1}`,background:filterStatus!=="All"?T.bluL:T.surfaceB,fontSize:12,color:filterStatus!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:filterStatus!=="All"?600:400,minWidth:90,appearance:"none",WebkitAppearance:"none"}}>
            {["All","Ongoing","Hold","Not Started"].map(s=><option key={s} value={s}>{s==="All"?"All Status":s}</option>)}
          </select>
          <div style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcDown size={11} color={T.t4}/></div>
        </div>

        {/* Sort */}
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <span style={{fontSize:10.5,color:T.t4}}>Sort:</span>
          {["Default","A→Z","End","↓%","↑%"].map(s=>(
            <button key={s} onClick={()=>setSortBy(s)}
              style={{height:32,padding:"0 8px",borderRadius:6,border:`1.5px solid ${sortBy===s?T.blu:T.b1}`,background:sortBy===s?T.bluL:T.surfaceB,fontSize:11.5,fontWeight:sortBy===s?700:400,color:sortBy===s?T.blu:T.t3,cursor:"pointer",transition:"all .12s"}}>
              {s}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{width:1,height:20,background:T.b1,flexShrink:0}}/>

        {/* View toggle */}
        <div style={{display:"flex",borderRadius:6,border:`1.5px solid ${T.b1}`,overflow:"hidden",flexShrink:0}}>
          {[["tile",<IcGrid size={14}/>],["list",<IcListV size={14}/>]].map(([id,icon])=>(
            <button key={id} onClick={()=>setView(id)}
              style={{width:32,height:32,border:"none",background:view===id?T.blu:T.surfaceB,color:view===id?"white":T.t3,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
              {icon}
            </button>
          ))}
        </div>

        {/* Export CSV */}
        <button onClick={exportCSV} style={{height:32,padding:"0 12px",borderRadius:6,border:`1.5px solid ${T.b1}`,background:T.surfaceB,fontSize:12,fontWeight:600,color:T.t2,cursor:"pointer",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",flexShrink:0}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.grn;e.currentTarget.style.color=T.grn;e.currentTarget.style.background=T.grnL;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b1;e.currentTarget.style.color=T.t2;e.currentTarget.style.background=T.surfaceB;}}>
          <IcDown size={12} color="currentColor"/> Export CSV
        </button>

        {/* New Project */}
        {isAdmin&&<button onClick={()=>setShowNew(true)} style={{height:32,padding:"0 14px",borderRadius:6,background:`linear-gradient(135deg,${T.blu},#1D4ED8)`,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5,boxShadow:`0 3px 8px ${T.blu}44`,whiteSpace:"nowrap",flexShrink:0}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 5px 14px ${T.blu}55`}
          onMouseLeave={e=>e.currentTarget.style.boxShadow=`0 3px 8px ${T.blu}44`}>
          <IcAdd size={13} color="white"/> New Project
        </button>}
      </div>

      {/* Results hint */}
      <div style={{fontSize:10.5,color:T.t4,marginBottom:9,display:"flex",alignItems:"center",gap:7}}>
        <span>{filtered.length} projects shown</span>
        {hideCompleted&&stats.completed>0&&<span onClick={()=>setHideCompleted(false)} style={{background:T.bluL,color:T.blu,fontSize:9.5,fontWeight:700,padding:"1px 8px",borderRadius:20,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}>
          <IcEye size={10} color={T.blu}/> {stats.completed} completed hidden
        </span>}
      </div>

      {/* ── TILE VIEW ── */}
      {view==="tile"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
          {paginated.map(p=>{
            const sm=SM[p.status]||SM["Ongoing"];
            const margin=p.boq-p.expense;
            const isOpen=cardMenu===p.id;
            return(
              <div key={p.id} onClick={()=>onSelectProject&&onSelectProject(p)}
                style={{background:T.surface,borderRadius:8,overflow:"visible",border:`1px solid ${T.b1}`,transition:"transform .14s,box-shadow .14s,border-color .14s",boxShadow:"0 1px 3px rgba(0,0,0,.05)",position:"relative",cursor:"pointer"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 5px 16px rgba(0,0,0,.1)";e.currentTarget.style.borderColor=T.b2;}}
                onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.05)";e.currentTarget.style.borderColor=T.b1;}}>
                {/* Left accent border */}
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,borderRadius:"8px 0 0 8px",background:sm.c}}/>
                {/* Top progress strip */}
                <div style={{height:3,background:T.b1,borderRadius:"0 8px 0 0",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${p.progress}%`,background:progClr(p.progress),transition:"width .6s"}}/>
                </div>

                <div style={{padding:"8px 10px 8px 14px"}}>
                  {/* Name + Status + menu */}
                  <div style={{display:"flex",alignItems:"flex-start",gap:5,marginBottom:3}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12.5,fontWeight:700,color:T.t1,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                      <div style={{fontSize:10.5,color:T.t4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.client}</div>
                    </div>
                    <Pill label={p.status} c={sm.c} bg={sm.bg}/>
                    {/* 3-dot menu */}
                    <div style={{position:"relative",flexShrink:0}}>
                      <button onClick={e=>{e.stopPropagation();setCardMenu(isOpen?null:p.id);}}
                        style={{width:22,height:22,borderRadius:5,border:`1px solid ${isOpen?T.blu:T.b1}`,background:isOpen?T.bluL:T.surfaceB,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .12s"}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=T.blu;e.currentTarget.style.background=T.bluL;}}
                        onMouseLeave={e=>{if(!isOpen){e.currentTarget.style.borderColor=T.b1;e.currentTarget.style.background=T.surfaceB;}}}>
                        <Ic d="M12 5h.01M12 12h.01M12 19h.01" size={13} sw={2.8} color={T.t3}/>
                      </button>
                      {isOpen&&(
                        <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:26,right:0,background:T.surface,border:`1px solid ${T.b1}`,borderRadius:7,boxShadow:"0 6px 18px rgba(0,0,0,.12)",zIndex:99,minWidth:135,overflow:"hidden"}}>
                          <button onClick={()=>{setCardMenu(null);onSelectProject&&onSelectProject(p);}}
                            style={{width:"100%",padding:"8px 12px",border:"none",background:"none",textAlign:"left",fontSize:12,color:T.t1,cursor:"pointer",display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid ${T.b1}`}}
                            onMouseEnter={e=>e.currentTarget.style.background=T.bluL} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                            <IcArrow size={13} color={T.blu}/> Open Project
                          </button>
                          {isAdmin&&<button onClick={()=>{setCardMenu(null);setDupOf(p);}}
                            style={{width:"100%",padding:"8px 12px",border:"none",background:"none",textAlign:"left",fontSize:12,color:T.t1,cursor:"pointer",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid "+T.b1}}
                            onMouseEnter={e=>e.currentTarget.style.background=T.ambL} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                            <IcCopy size={13} color={T.amb}/> Copy Project
                          </button>}
                          {isAdmin&&<button onClick={()=>{setCardMenu(null);setSettingsOf(p);}}
                            style={{width:"100%",padding:"8px 12px",border:"none",background:"none",textAlign:"left",fontSize:12,color:T.t1,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}
                            onMouseEnter={e=>e.currentTarget.style.background=T.sltL} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                            <IcSet size={13} color={T.slt}/> Settings
                          </button>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{display:"flex",gap:8,marginBottom:5}}>
                    <span style={{display:"flex",alignItems:"center",gap:3,fontSize:10.5,color:T.t3}}><IcLoc size={10} color={T.t4}/>{p.city}</span>
                    <span style={{fontSize:10.5,color:T.t3}}>{p.type}</span>
                    <span style={{fontSize:10.5,color:T.t3}}>PM: <b style={{color:T.t2,fontWeight:600}}>{p.pm}</b></span>
                  </div>

                  {/* Progress */}
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:10,color:T.t4}}>Progress</span>
                    <span style={{fontSize:10.5,fontWeight:700,color:progClr(p.progress)}}>{p.progress}%</span>
                  </div>
                  <PBar pct={p.progress} color={progClr(p.progress)} h={3}/>

                  {/* Finance */}
                  <div style={{display:"flex",gap:0,marginTop:7,paddingTop:7,borderTop:`1px solid ${T.b1}`,alignItems:"center"}}>
                    {[["BOQ",`₹${fmt(p.boq)}`,T.t1],["Spent",`₹${fmt(p.expense)}`,T.amb],["Margin",`${margin>0?"+":""}₹${fmt(Math.abs(margin))}`,margin>0?T.grn:T.red]].map(([lbl,val,vc],i)=>(
                      <div key={lbl} style={{flex:1,paddingRight:6,borderRight:i<2?`1px solid ${T.b1}`:"none",paddingLeft:i>0?8:0}}>
                        <div style={{fontSize:8.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:1}}>{lbl}</div>
                        <div style={{fontSize:11,fontWeight:700,color:vc,fontVariantNumeric:"tabular-nums"}}>{val}</div>
                      </div>
                    ))}
                    <div style={{paddingLeft:8,flexShrink:0,textAlign:"right"}}>
                      <div style={{fontSize:9,color:T.t4,marginBottom:3,whiteSpace:"nowrap"}}>{p.end}</div>
                      <button onClick={e=>{e.stopPropagation();onSelectProject&&onSelectProject(p);}} style={{fontSize:10.5,fontWeight:600,color:T.blu,background:T.bluL,border:`1px solid ${T.bluM}`,cursor:"pointer",padding:"2px 8px",borderRadius:5,whiteSpace:"nowrap"}}>Open →</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view==="list"&&(
        <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"2.6fr 80px 110px 110px 150px 95px 95px 95px 80px",padding:"7px 16px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,borderLeft:"3px solid transparent"}}>
            {["Project / Client","City","PM","Status","Progress","BOQ","Spent","Margin","End"].map((h,i)=>(
              <span key={i} style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".6px"}}>{h}</span>
            ))}
          </div>
          {paginated.map(p=>{
            const sm=SM[p.status]||SM["Ongoing"];
            const margin=p.boq-p.expense;
            return(
              <div key={p.id} onClick={()=>onSelectProject&&onSelectProject(p)}
                style={{display:"grid",gridTemplateColumns:"2.6fr 80px 110px 110px 150px 95px 95px 95px 80px",padding:"0 16px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",minHeight:44,transition:"background .12s",borderLeft:`3px solid ${sm.c}55`}}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{paddingRight:12,paddingTop:3,paddingBottom:3}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                  <div style={{fontSize:10.5,color:T.t4}}>{p.client}</div>
                </div>
                <span style={{fontSize:12,color:T.t2}}>{p.city}</span>
                <span style={{fontSize:12,color:T.t2}}>{p.pm}</span>
                <div><span style={{display:"inline-block",background:sm.bg,color:sm.c,fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:20,border:`1px solid ${sm.c}33`}}>{p.status}</span></div>
                <div style={{paddingRight:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:10.5,color:T.t4}}>{p.progress}%</span>
                  </div>
                  <div style={{height:4,background:T.b1,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${p.progress}%`,background:progClr(p.progress),borderRadius:4}}/></div>
                </div>
                <span style={{fontSize:12,fontWeight:600,color:T.t1,fontVariantNumeric:"tabular-nums"}}>₹{fmt(p.boq)}</span>
                <span style={{fontSize:12,fontWeight:600,color:T.amb,fontVariantNumeric:"tabular-nums"}}>₹{fmt(p.expense)}</span>
                <span style={{fontSize:12,fontWeight:700,color:margin>0?T.grn:T.red,fontVariantNumeric:"tabular-nums"}}>{margin>0?"+":""}₹{fmt(Math.abs(margin))}</span>
                <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5}}>
                  <span style={{fontSize:10.5,color:T.t4}}>{p.end}</span>
                  {isAdmin&&<button onClick={e=>{e.stopPropagation();setDupOf(p);}} style={{background:"none",border:`1px solid ${T.b1}`,borderRadius:5,padding:"2px 6px",cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontSize:9.5,color:T.t3,transition:"all .12s"}} onMouseEnter={e=>{e.currentTarget.style.background=T.ambL;e.currentTarget.style.color=T.amb;e.currentTarget.style.borderColor=T.ambM;}} onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=T.t3;e.currentTarget.style.borderColor=T.b1;}}><IcCopy size={10} color="currentColor"/> Copy</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length===0&&!search&&filterCity==="All"&&filterStatus==="All"&&allProjects.length===0&&(
        <div style={{textAlign:"center",padding:"80px 0"}}><div style={{fontSize:36,marginBottom:8}}>📋</div><div style={{color:"#64748B",fontSize:14,fontWeight:600}}>No projects yet</div><div style={{color:"#94A3B8",fontSize:12,marginTop:4}}>Create your first project to get started</div></div>
      )}
      {filtered.length===0&&(search||filterCity!=="All"||filterStatus!=="All"||allProjects.length>0)&&<div style={{textAlign:"center",padding:"60px 20px",color:T.t4}}><div style={{fontSize:38,marginBottom:10}}>🔍</div><div style={{fontSize:15,fontWeight:600,color:T.t2}}>No projects found</div><div style={{fontSize:12,marginTop:4,color:T.t4}}>Try changing filters or search term</div></div>}

      {/* ── PAGINATION ── */}
      {totalPages>1&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginTop:14,padding:"10px 0"}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
            style={{height:30,padding:"0 10px",borderRadius:6,border:`1.5px solid ${page===1?T.b1:T.blu}`,background:page===1?T.surfaceB:T.bluL,fontSize:12,fontWeight:600,color:page===1?T.t4:T.blu,cursor:page===1?"not-allowed":"pointer"}}>
            ← Prev
          </button>
          {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=2).map((p,idx,arr)=>{
            const prev=arr[idx-1];
            const showEllipsis=prev&&p-prev>1;
            return(<span key={p}>
              {showEllipsis&&<span style={{padding:"0 4px",color:T.t4,fontSize:12}}>...</span>}
              <button onClick={()=>setPage(p)}
                style={{width:30,height:30,borderRadius:6,border:`1.5px solid ${page===p?T.blu:T.b1}`,background:page===p?T.blu:T.surface,color:page===p?"white":T.t2,fontSize:12,fontWeight:page===p?700:400,cursor:"pointer"}}>
                {p}
              </button>
            </span>);
          })}
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
            style={{height:30,padding:"0 10px",borderRadius:6,border:`1.5px solid ${page===totalPages?T.b1:T.blu}`,background:page===totalPages?T.surfaceB:T.bluL,fontSize:12,fontWeight:600,color:page===totalPages?T.t4:T.blu,cursor:page===totalPages?"not-allowed":"pointer"}}>
            Next →
          </button>
          <span style={{fontSize:11,color:T.t4,marginLeft:8}}>Page {page} of {totalPages}</span>
        </div>
      )}
      {showPulse&&<SitePulseDrawer onClose={()=>setShowPulse(false)}/>}
      {showApprovals&&<ApprovalsDrawer onClose={()=>{setShowApprovals(false);loadApprovalCounts();}} mode={approvalMode} onSelectProject={onSelectProject}/>}
      {showIssuesDrawer&&<IssuesDrawer issues={allIssues} loading={issuesLoading} filter={issueFilter} setFilter={setIssueFilter} onClose={()=>setShowIssuesDrawer(false)} onIssueClose={(id)=>setAllIssues(p=>p.map(x=>x.id===id?{...x,status:"Closed"}:x))}/>}
      {showTodoDrawer&&<TodoDrawer todos={allTodos} loading={todosLoading} onClose={()=>{setShowTodoDrawer(false);api.get("/projects/my-todo-count").then(r=>{if(r.success&&r.data)setTodoCount(r.data.count||0);}).catch(()=>{});}} onSelectProject={onSelectProject}/>}
      {settingsOf&&<ProjectSettingsModal
        project={settingsOf}
        onClose={()=>setSettingsOf(null)}
        onUpdated={(updated)=>{
          setAllProjects(prev=>prev.map(p=>p.id===updated.id?updated:p));
          setSettingsOf(null);
        }}
        onDeleted={(id,action)=>{
          if(action==="deleted") setAllProjects(prev=>prev.filter(p=>p.id!==id));
          else setAllProjects(prev=>prev.filter(p=>p.id!==id)); // archived = hide
          setSettingsOf(null);
        }}
      />}
      {dupOf&&<DuplicateModal project={dupOf} onClose={()=>setDupOf(null)} onConfirm={async(np)=>{
        try{
          const res=await api.post("/projects",{
            name:np.name,
            client_name:np.client||dupOf._raw?.client_name||"",
            city:np.city,
            type:dupOf._raw?.type||"residential",
            status:"not_started",
            boq_value:np.boq||0,
            pm_user_id:dupOf._raw?.pm_user_id||1,
            start_date:np.start&&np.start!=="TBD"?np.start:null,
            end_date:np.end&&np.end!=="TBD"?np.end:null,
          });
          if(res.success&&res.data){
            setAllProjects(prev=>[...prev,mapProject(res.data)]);
          }else{
            setAllProjects(prev=>[...prev,np]);
          }
        }catch(err){
          console.error("Create project error:",err);
          setAllProjects(prev=>[...prev,np]);
        }
      }}/>}
      {showNew&&<NewProjectModal onClose={()=>setShowNew(false)} onCreated={np=>setAllProjects(prev=>[...prev,np])}/>}
    </div>
  );
}


// ── Issues Drawer ─────────────────────────────────────────────────────
function IssueChat({issueId}){
  const [comments,setComments]=useState([]);
  const [text,setText]=useState("");
  const [sending,setSending]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const fmtT=d=>d?new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}):"";
  const fmtD=d=>d?new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"";
  useEffect(()=>{
    api.get("/tasks/issues/"+issueId+"/comments").then(r=>{
      if(r.success)setComments(r.data||[]);
      setLoaded(true);
    }).catch(()=>setLoaded(true));
  },[issueId]);
  const send=async()=>{
    if(!text.trim())return;
    setSending(true);
    const r=await api.post("/tasks/issues/"+issueId+"/comments",{text});
    if(r.success){setComments(p=>[...p,r.data]);setText("");}
    setSending(false);
  };
  return(
    <div style={{borderTop:"1px solid #F1F5F9",paddingTop:10,marginTop:8}}>
      <div style={{fontSize:9.5,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>
        Chat ({comments.length})
      </div>
      {!loaded&&<div style={{fontSize:11,color:"#94A3B8",textAlign:"center",padding:"6px 0"}}>Loading...</div>}
      {loaded&&comments.length===0&&<div style={{fontSize:11,color:"#CBD5E1",textAlign:"center",padding:"6px 0"}}>No messages yet</div>}
      <div style={{maxHeight:160,overflowY:"auto",marginBottom:8}}>
        {comments.map(c=>(
          <div key={c.id} style={{display:"flex",gap:7,marginBottom:7,alignItems:"flex-start"}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,#2563EB,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:9,fontWeight:700,color:"white"}}>
              {(c.user_name||"?").charAt(0).toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                <span style={{fontSize:10.5,fontWeight:700,color:"#1E293B"}}>{c.user_name||"—"}</span>
                <span style={{fontSize:9,color:"#94A3B8"}}>{fmtD(c.created_at)} {fmtT(c.created_at)}</span>
              </div>
              <div style={{padding:"6px 9px",background:"#F8FAFC",borderRadius:"0 7px 7px 7px",border:"1px solid #E2E8F0",fontSize:12,color:"#334155",lineHeight:1.5}}>{c.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:6}}>
        <input value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder="Type message..."
          style={{flex:1,padding:"7px 10px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:12,color:"#1E293B",outline:"none",fontFamily:"inherit"}}/>
        <button onClick={send} disabled={sending||!text.trim()}
          style={{padding:"7px 12px",borderRadius:7,background:sending||!text.trim()?"#E2E8F0":"#2563EB",color:sending||!text.trim()?"#94A3B8":"white",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>
          Send
        </button>
      </div>
    </div>
  );
}

function IssuesDrawer({issues, loading, filter, setFilter, onClose, onIssueClose}){
  const [expandedChat,setExpandedChat]=useState(null);
  const [fullPhoto,setFullPhoto]=useState(null);
  const [sortBy,setSortBy]=useState("date");      // date | project | assigned | category
  const [closingId,setClosingId]=useState(null);
  const [closeMsg,setCloseMsg]=useState("");
  const [showCloseFor,setShowCloseFor]=useState(null); // issue id
  const priC={"Low":{c:"#64748B",bg:"#F1F5F9"},"Medium":{c:"#D97706",bg:"#FEF3C7"},"High":{c:"#DC2626",bg:"#FEE2E2"},"Critical":{c:"#7C3AED",bg:"#EDE9FE"}};
  const issC={"Open":{c:"#DC2626",bg:"#FEE2E2"},"In Progress":{c:"#2563EB",bg:"#DBEAFE"},"Resolved":{c:"#16A34A",bg:"#DCFCE7"},"Closed":{c:"#64748B",bg:"#F1F5F9"}};
  const FILTERS=["All","Open","In Progress","Resolved","Closed"];
  const fmtDate=d=>d?new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"-";

  const filtered = (filter==="All"?issues:issues.filter(i=>i.status===filter)).slice().sort((a,b)=>{
    if(sortBy==="project")  return (a.project_name||"").localeCompare(b.project_name||"");
    if(sortBy==="assigned") return (a.assigned_to||"").localeCompare(b.assigned_to||"");
    if(sortBy==="category") return (a.work_category||"").localeCompare(b.work_category||"");
    return new Date(b.created_at)-new Date(a.created_at);
  });

  const handleCloseIssue=async(issueId)=>{
    setClosingId(issueId);
    try{
      // Post closing message first if any
      if(closeMsg.trim()){
        await api.post("/tasks/issues/"+issueId+"/comments",{text:"[Closed] "+closeMsg.trim()});
      }
      const r=await api.put("/tasks/issues/"+issueId,{status:"Closed"});
      if(r.success){ onIssueClose(issueId); setShowCloseFor(null); setCloseMsg(""); }
      else alert(r.message||"Failed");
    }catch(e){alert(e.message);}
    setClosingId(null);
  };

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300,backdropFilter:"blur(2px)",animation:"fadeIn .25s ease"}}/>
    {fullPhoto&&(
      <div onClick={()=>setFullPhoto(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
        <img src={fullPhoto} style={{maxWidth:"95vw",maxHeight:"90vh",objectFit:"contain",borderRadius:8}}/>
        <button onClick={()=>setFullPhoto(null)} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    )}
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(520px,96vw)",background:"#F8FAFC",zIndex:301,boxShadow:"-8px 0 48px rgba(0,0,0,0.22), -2px 0 8px rgba(0,0,0,0.08)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .32s cubic-bezier(0.16,1,0.3,1)",borderRadius:"16px 0 0 16px"}}>
      {/* Header */}
      <div style={{background:"#0F172A",padding:"13px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"white"}}>Open Issues</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:1}}>{filtered.length} issue{filtered.length!==1?"s":""} · All projects</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {/* Filter tabs */}
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
          {FILTERS.map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{padding:"4px 10px",borderRadius:20,border:"none",background:filter===f?"white":"rgba(255,255,255,0.1)",color:filter===f?"#0F172A":"rgba(255,255,255,0.6)",fontSize:11,fontWeight:filter===f?700:400,cursor:"pointer"}}>
              {f}{f!=="All"&&<span style={{marginLeft:4,fontSize:10,opacity:.8}}>{issues.filter(i=>i.status===f).length}</span>}
            </button>
          ))}
        </div>
        {/* Sort row */}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",whiteSpace:"nowrap"}}>Sort:</span>
          {[["date","Date"],["project","Project"],["assigned","Assigned"],["category","Category"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setSortBy(id)}
              style={{padding:"3px 9px",borderRadius:12,border:"none",background:sortBy===id?"rgba(255,255,255,.2)":"rgba(255,255,255,.07)",color:sortBy===id?"white":"rgba(255,255,255,.45)",fontSize:10.5,fontWeight:sortBy===id?700:400,cursor:"pointer"}}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
        {loading&&<div style={{textAlign:"center",padding:"40px 0",color:"#94A3B8",fontSize:13}}>Loading issues...</div>}
        {!loading&&filtered.length===0&&<div style={{textAlign:"center",padding:"50px 0",color:"#94A3B8",fontSize:13}}>No issues found</div>}
        {filtered.map(issue=>{
          const pc=priC[issue.priority]||priC["Medium"];
          const ic=issC[issue.status]||issC["Open"];
          const isClosed=issue.status==="Closed"||issue.status==="Resolved";
          return(
            <div key={issue.id} style={{background:"white",borderRadius:10,padding:"12px 14px",marginBottom:8,border:"1px solid #E2E8F0",borderLeft:`3px solid ${ic.c}`,opacity:isClosed?.7:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{fontSize:13,fontWeight:700,color:"#1E293B",flex:1,marginRight:8}}>{issue.title}</div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <span style={{background:pc.bg,color:pc.c,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4}}>{issue.priority}</span>
                  <span style={{background:ic.bg,color:ic.c,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4}}>{issue.status}</span>
                </div>
              </div>
              {/* Project + Task */}
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,flexWrap:"wrap"}}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                <span style={{fontSize:11,color:"#475569",fontWeight:600}}>{issue.project_name}</span>
                <span style={{fontSize:10,color:"#94A3B8"}}>·</span>
                <span style={{fontSize:11,color:"#64748B"}}>{issue.task_name}</span>
                {issue.city&&<span style={{fontSize:10,color:"#94A3B8",marginLeft:2}}>· {issue.city}</span>}
              </div>
              {/* Photo + Assigned + Category + Chat + Date */}
              <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center",marginBottom:issue.photo_url?8:0}}>
                {issue.photo_url&&(
                  <img src={issue.photo_url} alt="issue"
                    onClick={()=>setFullPhoto(issue.photo_url)}
                    style={{width:44,height:44,borderRadius:6,objectFit:"cover",border:"1px solid #E2E8F0",cursor:"zoom-in",flexShrink:0}}/>
                )}
                <div style={{flex:1,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  {issue.assigned_to&&<span style={{fontSize:10,color:"#2563EB",background:"#DBEAFE",borderRadius:4,padding:"1px 7px",fontWeight:600}}>👤 {issue.assigned_to}</span>}
                  {issue.work_category&&<span style={{fontSize:10,color:"#7C3AED",background:"#EDE9FE",borderRadius:4,padding:"1px 7px",fontWeight:600}}>🔧 {issue.work_category}</span>}
                  <span style={{fontSize:10,color:"#94A3B8",marginLeft:"auto"}}>{fmtDate(issue.created_at)}</span>
                  <button onClick={()=>setExpandedChat(expandedChat===issue.id?null:issue.id)}
                    style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:5,border:"1px solid #E2E8F0",background:expandedChat===issue.id?"#DBEAFE":"white",cursor:"pointer",fontSize:10,color:expandedChat===issue.id?"#2563EB":"#64748B",fontWeight:600}}>
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    Chat
                  </button>
                  {!isClosed&&(
                    <button onClick={()=>{setShowCloseFor(showCloseFor===issue.id?null:issue.id);setCloseMsg("");}}
                      style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:5,border:"1px solid #BBF7D0",background:showCloseFor===issue.id?"#DCFCE7":"white",cursor:"pointer",fontSize:10,color:"#16A34A",fontWeight:600}}>
                      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
                      Close
                    </button>
                  )}
                </div>
              </div>
              {expandedChat===issue.id&&<IssueChat issueId={issue.id}/>}
              {/* Close Issue section */}
              {!isClosed&&showCloseFor===issue.id&&(
                <div style={{marginTop:8,padding:"10px 12px",background:"#F0FDF4",borderRadius:8,border:"1px solid #BBF7D0"}}>
                  <div style={{fontSize:10.5,fontWeight:600,color:"#16A34A",marginBottom:6}}>Closing message (optional)</div>
                  <textarea value={closeMsg} onChange={e=>setCloseMsg(e.target.value)} rows={2}
                    placeholder="Reason for closing / resolution note..."
                    style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #BBF7D0",fontSize:12,color:"#1E293B",background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none"}}/>
                  <div style={{display:"flex",gap:6,marginTop:7}}>
                    <button onClick={()=>{setShowCloseFor(null);setCloseMsg("");}}
                      style={{flex:1,padding:"6px",borderRadius:6,background:"white",border:"1px solid #E2E8F0",fontSize:11.5,color:"#64748B",cursor:"pointer",fontWeight:500}}>Cancel</button>
                    <button onClick={()=>handleCloseIssue(issue.id)} disabled={closingId===issue.id}
                      style={{flex:2,padding:"6px",borderRadius:6,background:"#16A34A",border:"none",fontSize:11.5,color:"white",cursor:"pointer",fontWeight:700}}>
                      {closingId===issue.id?"Closing...":"✓ Confirm Close"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </>);
}

// ── TODO DRAWER ─────────────────────────────────────────────────
function TodoDrawer({todos,loading,onClose,onSelectProject}){
  const [filter,setFilter]=useState("Pending"); // Pending | Done | All
  const [localTodos,setLocalTodos]=useState(todos);
  const [expandedId,setExpandedId]=useState(null);
  const [savingChk,setSavingChk]=useState(null);
  const [showAddForm,setShowAddForm]=useState(false);
  const [newTodo,setNewTodo]=useState({title:"",priority:"Medium",category:"Admin",due_date:""});
  const [creating,setCreating]=useState(false);
  useEffect(()=>{ setLocalTodos(todos); },[todos]);
  const priC={"High":{c:"#DC2626",bg:"#FEE2E2"},"Medium":{c:"#D97706",bg:"#FEF3C7"},"Low":{c:"#64748B",bg:"#F1F5F9"}};
  const fmtDate=d=>d?new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"";

  const parsed=localTodos.map(t=>{
    let cl=[];
    try{ cl=typeof t.checklist==="string"?JSON.parse(t.checklist):(t.checklist||[]); }catch(e){}
    return {...t,done:t.status==="done"||t.status==="Completed",checklist:cl};
  });
  const filtered=filter==="All"?parsed:filter==="Pending"?parsed.filter(t=>!t.done):parsed.filter(t=>t.done);
  const pendingCount=parsed.filter(t=>!t.done).length;
  const doneCount=parsed.filter(t=>t.done).length;

  const goToProject = (t) => {
    onClose();
    if (t.project_id) onSelectProject && onSelectProject({ id: t.project_id, name: t.project_name, initialTab: "todo" });
  };

  const apiPathFor = (t) => t.project_id
    ? `/projects/${t.project_id}/tasks/${t.id}`
    : `/projects/company-todos/${t.id}`;

  const toggleDone = async (t, e) => {
    if (e) e.stopPropagation();
    const newStatus = t.done ? "Not Started" : "Completed";
    setLocalTodos(prev => prev.map(x => x.id === t.id ? { ...x, status: newStatus } : x));
    try {
      await api.put(apiPathFor(t), { status: newStatus });
    } catch (err) {
      setLocalTodos(prev => prev.map(x => x.id === t.id ? { ...x, status: t.status } : x));
    }
  };

  const toggleChecklistItem = async (t, idx, e) => {
    if (e) e.stopPropagation();
    setSavingChk(`${t.id}-${idx}`);
    const updatedChecklist = (t.checklist||[]).map((c,i) => i===idx ? {...c, done: !c.done} : c);
    setLocalTodos(prev => prev.map(x => x.id === t.id ? { ...x, checklist: JSON.stringify(updatedChecklist) } : x));
    try {
      await api.put(apiPathFor(t), { checklist: updatedChecklist });
    } catch (err) {
      setLocalTodos(prev => prev.map(x => x.id === t.id ? { ...x, checklist: JSON.stringify(t.checklist) } : x));
    }
    setSavingChk(null);
  };

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300,backdropFilter:"blur(2px)",animation:"fadeIn .25s ease"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(480px,96vw)",background:"#F8FAFC",zIndex:301,boxShadow:"-8px 0 48px rgba(0,0,0,0.22), -2px 0 8px rgba(0,0,0,0.08)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .32s cubic-bezier(0.16,1,0.3,1)",borderRadius:"16px 0 0 16px"}}>
      {/* Header */}
      <div style={{background:"#0F172A",padding:"13px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"white"}}>My To-Do</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:1}}>{pendingCount} pending · {doneCount} done · All projects</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",gap:4}}>
            {["Pending","Done","All"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{padding:"4px 10px",borderRadius:20,border:"none",background:filter===f?"white":"rgba(255,255,255,0.1)",color:filter===f?"#0F172A":"rgba(255,255,255,0.6)",fontSize:11,fontWeight:filter===f?700:400,cursor:"pointer"}}>
                {f} {f==="Pending"?`(${pendingCount})`:f==="Done"?`(${doneCount})`:`(${parsed.length})`}
              </button>
            ))}
          </div>
          <button onClick={()=>setShowAddForm(p=>!p)}
            style={{padding:"5px 11px",borderRadius:6,border:"1px solid rgba(255,255,255,0.2)",background:showAddForm?"#7C3AED":"rgba(255,255,255,0.1)",color:"white",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            {showAddForm?"✕ Cancel":"+ Company Todo"}
          </button>
        </div>
      </div>

      {/* Add Company Todo form */}
      {showAddForm && (
        <div style={{padding:"12px 14px",background:"#F5F3FF",borderBottom:"1px solid #DDD6FE",flexShrink:0}}>
          <div style={{fontSize:10.5,fontWeight:700,color:"#7C3AED",letterSpacing:".4px",marginBottom:8}}>🏢 NEW COMPANY-LEVEL TODO</div>
          <input value={newTodo.title} onChange={e=>setNewTodo(p=>({...p,title:e.target.value}))}
            placeholder="Todo title..." autoFocus
            style={{width:"100%",padding:"7px 10px",borderRadius:6,border:"1.5px solid #DDD6FE",fontSize:12.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:8}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
            <SearchSelect value={newTodo.priority} options={["High","Medium","Low"]} compact
              onChange={v=>setNewTodo(p=>({...p,priority:v}))} placeholder="Priority"/>
            <SearchSelect value={newTodo.category} options={["Admin","Finance","HR","Compliance","Other"]} compact
              onChange={v=>setNewTodo(p=>({...p,category:v}))} placeholder="Category"/>
            <input type="date" value={newTodo.due_date} onChange={e=>setNewTodo(p=>({...p,due_date:e.target.value}))}
              style={{padding:"6px 8px",borderRadius:6,border:"1px solid #DDD6FE",fontSize:11,outline:"none"}}/>
          </div>
          <button onClick={async()=>{
            if(!newTodo.title.trim()) return;
            setCreating(true);
            const res = await api.post("/projects/company-todos", newTodo);
            if(res.success){
              setLocalTodos(prev=>[{...res.data, project_id:null, project_name:null},...prev]);
              setNewTodo({title:"",priority:"Medium",category:"Admin",due_date:""});
              setShowAddForm(false);
            }
            setCreating(false);
          }} disabled={!newTodo.title.trim()||creating}
            style={{width:"100%",padding:"8px",borderRadius:6,border:"none",background:newTodo.title.trim()?"#7C3AED":"#ccc",color:"white",fontSize:12,fontWeight:700,cursor:newTodo.title.trim()?"pointer":"not-allowed"}}>
            {creating?"Adding…":"+ Add Company Todo"}
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{flex:1,overflow:"auto",padding:"10px 14px"}}>
        {loading?<div style={{textAlign:"center",padding:"40px 0",color:"#94A3B8",fontSize:13}}>Loading...</div>
        :filtered.length===0?<div style={{textAlign:"center",padding:"40px 0",color:"#94A3B8",fontSize:13}}>No todos found</div>
        :filtered.map(t=>{
          const pr=priC[t.priority]||priC["Medium"];
          const clDone=(t.checklist||[]).filter(c=>c.done).length;
          const isExpanded = expandedId === t.id;
          const hasChecklist = t.checklist && t.checklist.length > 0;
          return(
            <div key={t.id}
              style={{background:"white",borderRadius:8,border:`1px solid ${isExpanded?"#3B82F6":"#E2E8F0"}`,marginBottom:8,borderLeft:`3px solid ${pr.c}`,transition:"all .15s",overflow:"hidden",boxShadow:isExpanded?"0 4px 14px rgba(59,130,246,0.15)":"none"}}>
              <div onClick={()=>setExpandedId(isExpanded?null:t.id)}
                style={{padding:"10px 13px",cursor:"pointer"}}
                onMouseEnter={e=>{if(!isExpanded){e.currentTarget.parentElement.style.boxShadow="0 4px 14px rgba(15,23,42,0.08)";e.currentTarget.parentElement.style.borderColor="#BFDBFE";}}}
                onMouseLeave={e=>{if(!isExpanded){e.currentTarget.parentElement.style.boxShadow="none";e.currentTarget.parentElement.style.borderColor="#E2E8F0";}}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                  <div onClick={(e)=>toggleDone(t,e)} title={t.done?"Mark as pending":"Mark as done"}
                    style={{width:18,height:18,borderRadius:4,border:t.done?`none`:`1.5px solid #CBD5E1`,background:t.done?"#22C55E":"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                    {t.done&&<svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth={2.2}><path d="M2 5l2.5 2.5L8 3"/></svg>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:t.done?"#94A3B8":"#1E293B",textDecoration:t.done?"line-through":"none",marginBottom:4,lineHeight:1.4}}>{t.title}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                      {t.project_name && <span onClick={(e)=>{e.stopPropagation();goToProject(t);}}
                        style={{fontSize:10,fontWeight:600,color:"#3B82F6",background:"#EFF6FF",padding:"1px 7px",borderRadius:10,cursor:"pointer",border:"1px solid #BFDBFE"}}>{t.project_name}</span>}
                      {!t.project_id&&<span style={{fontSize:10,fontWeight:600,color:"#7C3AED",background:"#F5F3FF",padding:"1px 7px",borderRadius:10,border:"1px solid #DDD6FE"}}>🏢 Company</span>}
                      {t.category&&t.category!=="Other"&&<span style={{fontSize:10,color:"#64748B",background:"#F1F5F9",padding:"1px 6px",borderRadius:10}}>{t.category}</span>}
                      <span style={{fontSize:10,fontWeight:600,color:pr.c,background:pr.bg,padding:"1px 6px",borderRadius:10}}>{t.priority}</span>
                      {t.assigned_name&&<span style={{fontSize:10,color:"#64748B"}}>@{t.assigned_name.split(" ")[0]}</span>}
                      {t.due_date&&<span style={{fontSize:10,color:"#64748B"}}>Due {fmtDate(t.due_date)}</span>}
                      {hasChecklist&&<span style={{fontSize:10,fontWeight:600,color:clDone===t.checklist.length?"#22C55E":"#94A3B8"}}>☑ {clDone}/{t.checklist.length}</span>}
                    </div>
                  </div>
                  <span style={{fontSize:11,color:"#94A3B8",flexShrink:0,marginTop:2,transition:"transform .2s",transform:isExpanded?"rotate(180deg)":"rotate(0)"}}>▼</span>
                </div>
              </div>

              {/* Expanded checklist */}
              {isExpanded && (
                <div style={{padding:"0 13px 12px",borderTop:"1px dashed #E2E8F0",background:"#F8FAFC"}}>
                  {hasChecklist ? (
                    <div style={{paddingTop:10}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#64748B",letterSpacing:".5px",marginBottom:8}}>CHECKLIST · {clDone}/{t.checklist.length} done</div>
                      {t.checklist.map((c,idx)=>(
                        <div key={idx} onClick={(e)=>toggleChecklistItem(t,idx,e)}
                          style={{display:"flex",alignItems:"center",gap:9,padding:"7px 8px",borderRadius:6,cursor:"pointer",marginBottom:3,background:c.done?"#F0FDF4":"transparent",transition:"background .12s"}}
                          onMouseEnter={e=>{if(!c.done)e.currentTarget.style.background="#F1F5F9";}}
                          onMouseLeave={e=>{if(!c.done)e.currentTarget.style.background="transparent";}}>
                          <div style={{width:16,height:16,borderRadius:4,border:c.done?"none":"1.5px solid #CBD5E1",background:c.done?"#22C55E":"white",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",opacity:savingChk===`${t.id}-${idx}`?.5:1}}>
                            {c.done&&<svg width={9} height={9} viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth={2.5}><path d="M2 5l2.5 2.5L8 3"/></svg>}
                          </div>
                          <span style={{flex:1,fontSize:12.5,color:c.done?"#94A3B8":"#1E293B",textDecoration:c.done?"line-through":"none"}}>{c.text||c.title||"Item"}</span>
                          {savingChk===`${t.id}-${idx}`&&<span style={{fontSize:9,color:"#94A3B8"}}>saving…</span>}
                        </div>
                      ))}
                    </div>
                  ):(
                    <div style={{padding:"12px 4px",fontSize:11.5,color:"#94A3B8",fontStyle:"italic"}}>No checklist items.</div>
                  )}
                  {t.description && (
                    <div style={{marginTop:10,paddingTop:8,borderTop:"1px dashed #E2E8F0",fontSize:11.5,color:"#475569",lineHeight:1.5}}>
                      <div style={{fontSize:9.5,fontWeight:700,color:"#64748B",letterSpacing:".5px",marginBottom:4}}>DESCRIPTION</div>
                      {t.description}
                    </div>
                  )}
                  {t.project_id && (
                    <button onClick={(e)=>{e.stopPropagation();goToProject(t);}}
                      style={{marginTop:10,padding:"6px 12px",borderRadius:6,border:"1px solid #BFDBFE",background:"#EFF6FF",color:"#3B82F6",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                      Open in Project →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </>);
}

export default ProjectsPage;
