import { useState, useMemo, useEffect, useCallback } from "react";
import api from "../config/api";
import SearchSelect from "../components/SearchSelect";
import LiveTeamView from "../components/LiveTeamView";
import ExportMenu from "../components/DataExport";
import { t } from "../i18n";

// ── ICONS ──────────────────────────────────────────────────────
const Ic=({d,size=18,color="currentColor",sw=1.8,fill="none"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const IcHome  =(p)=><Ic {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>;
const IcProj  =(p)=><Ic {...p} d="M3 7h18M3 12h18M3 17h18"/>;
const IcTeam  =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>;
const IcTask  =(p)=><Ic {...p} d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>;
const IcFin   =(p)=><Ic {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>;
const IcWH    =(p)=><Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/>;
const IcPay   =(p)=><Ic {...p} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>;
const IcSet   =(p)=><Ic {...p} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcRep   =(p)=><Ic {...p} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>;
const IcMenu  =(p)=><Ic {...p} d="M4 6h16M4 12h16M4 18h16"/>;
const IcBell  =(p)=><Ic {...p} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>;
const IcAdd   =(p)=><Ic {...p} d="M12 5v14M5 12h14"/>;
const IcX     =(p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcChk   =(p)=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcEdit  =(p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcSearch=(p)=><Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;
const IcFilter=(p)=><Ic {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>;
const IcCal   =(p)=><Ic {...p} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>;
const IcAlert =(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;
const IcLoc   =(p)=><Ic {...p} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcLive  =(p)=><Ic {...p} d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5M16 12a4 4 0 11-8 0 4 4 0 018 0z" sw={2}/>;
const IcIssue =(p)=><Ic {...p} d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>;
const IcTodo  =(p)=><Ic {...p} d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>;
const IcAssign=(p)=><Ic {...p} d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8M19 8l2 2 4-4"/>;
const IcChv   =(p)=><Ic {...p} d="M6 9l6 6 6-6"/>;
const IcChvR  =(p)=><Ic {...p} d="M9 18l6-6-6-6"/>;
const IcGantt =(p)=><Ic {...p} d="M3 6h8M3 12h14M3 18h10M15 6h6M19 12h2M15 18h6"/>;
const IcList  =(p)=><Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>;
const IcUser  =(p)=><Ic {...p} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>;
const IcEyeX  =(p)=><Ic {...p} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>;
const IcEye   =(p)=><Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z"/>;
const IcFlag  =(p)=><Ic {...p} d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>;
const IcCRM   =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a3 3 0 00-3-3M16 3.13a4 4 0 010 7.75"/>;
const IcProc  =(p)=><Ic {...p} d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>;

// ── THEME ─────────────────────────────────────────────────────
const C={p:"#1565C0",a:"#FF6F00",sb:"#0D1B2A"};
const T={
  bg:"#F4F6F9",surface:"#FFFFFF",surfaceB:"#F8F9FB",sb:"#0D1B2A",sbH:"#162032",
  t1:"#111827",t2:"#374151",t3:"#6B7280",t4:"#9CA3AF",
  b1:"#E5E7EB",b2:"#D1D5DB",
  blu:"#2563EB",bluL:"#EFF6FF",bluM:"#BFDBFE",
  grn:"#059669",grnL:"#ECFDF5",grnM:"#A7F3D0",
  amb:"#D97706",ambL:"#FFFBEB",ambM:"#FDE68A",
  red:"#DC2626",redL:"#FEF2F2",redM:"#FECACA",
  slt:"#64748B",sltL:"#F1F5F9",
  pur:"#7C3AED",purL:"#F5F3FF",purM:"#DDD6FE",
  cyn:"#0891B2",cynL:"#E0F2FE",cynM:"#BAE6FD",
  ora:"#EA580C",oraL:"#FFF7ED",oraM:"#FED7AA",
};
const fmtN=n=>n==null?"—":Number(n).toLocaleString("en-IN");

// ── CONSTANTS (loaded from API, defaults empty) ──────────────
// These will be populated by the main module via props/context
let TEAM_MEMBERS=[];
let SITES=[];
const MEMBER_COLORS=["#7C3AED","#2563EB","#059669","#D97706","#0891B2","#EA580C","#DC2626","#6366F1","#0D9488","#BE185D"];
const SITE_COLORS=["#2563EB","#7C3AED","#059669","#D97706","#DC2626","#64748B","#0891B2","#6366F1"];
const PRIORITY_META={
  "High":  {c:T.red, bg:T.redL, brd:T.redM},
  "Medium":{c:T.amb, bg:T.ambL, brd:T.ambM},
  "Low":   {c:T.slt, bg:T.sltL, brd:T.b2},
};
const STATUS_META={
  "Todo":       {c:"#6366F1",bg:"#EEF2FF",brd:"#C7D2FE"},
  "In Progress":{c:T.blu,    bg:T.bluL,   brd:T.bluM},
  "Done":       {c:T.grn,    bg:T.grnL,   brd:T.grnM},
  "Blocked":    {c:T.red,    bg:T.redL,   brd:T.redM},
  "Review":     {c:T.pur,    bg:T.purL,   brd:T.purM},
};
const TYPES={
  "Task":  {c:T.blu, icon:"T"},
  "Issue": {c:T.red, icon:"!"},
  "Todo":  {c:T.grn, icon:"✓"},
};

const TODAY=new Date().toISOString().split("T")[0];
const fmtDate=s=>s?new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"-";
const daysDiff=(a,b)=>Math.round((new Date(b)-new Date(a))/(1000*86400));
const isOverdue=item=>item.dueDate&&item.status!=="Done"&&item.dueDate<TODAY;
const isDueSoon=item=>item.dueDate&&item.status!=="Done"&&item.dueDate>=TODAY&&daysDiff(TODAY,item.dueDate)<=3;

// Data loaded from API — no hardcoded work items

// ── NAV ──────────────────────────────────────────────────────
const NAV=[
  {sec:null,items:[
    {id:"dashboard",get l() { return t("common.dashboard"); },I:IcHome},
    {id:"projects",get l() { return t("common.projects"); },I:IcProj},
    {id:"crm",l:"CRM",I:IcCRM},
    {id:"tasks",get l() { return t("common.tasks"); },I:IcTask},
    {id:"team",get l() { return t("common.team_schedule"); },I:IcTeam},
  ]},
  {sec:"FINANCE & OPS",items:[
    {id:"finance",get l() { return t("common.finance"); },I:IcFin},
    {id:"procurement",get l() { return t("common.procurement"); },I:IcProc},
    {id:"warehouse",get l() { return t("common.warehouse"); },I:IcWH},
    {id:"payroll",get l() { return t("common.payroll"); },I:IcPay},
  ]},
  {sec:"MORE",items:[
    {id:"reports",get l() { return t("common.reports"); },I:IcRep},
    {id:"settings",get l() { return t("common.settings"); },I:IcSet},
  ]},
];

// ── SHARED ────────────────────────────────────────────────────
const Pill=({label,c,bg,brd})=>(
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${brd||c+"33"}`,whiteSpace:"nowrap"}}>{label}</span>
);
function Avatar({name,size=28,color="#2563EB"}){
  const ini=name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${color},${color}99)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:700,color:"white",flexShrink:0}}>{ini}</div>;
}
function TypeBadge({type}){
  const meta=TYPES[type]||TYPES["Task"];
  return <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:20,height:20,borderRadius:5,background:meta.c+"18",border:`1.5px solid ${meta.c}44`,fontSize:9.5,fontWeight:800,color:meta.c,flexShrink:0}}>{meta.icon}</span>;
}


// ── WORK ITEM CARD (List & Board) ─────────────────────────────
function WorkCard({item,onOpen,onStatusChange,compact=false}){
  const member=TEAM_MEMBERS.find(m=>m.id===item.assignee);
  const site=SITES.find(s=>s.id===item.site);
  const sm=STATUS_META[item.status]||STATUS_META["Todo"];
  const pm=PRIORITY_META[item.priority]||PRIORITY_META["Medium"];
  const overdue=isOverdue(item);
  const dueSoon=isDueSoon(item);

  return(
    <div
      onClick={()=>onOpen(item)}
      style={{background:T.surface,borderRadius:compact?7:10,border:`1.5px solid ${overdue?T.redM:dueSoon?T.ambM:T.b1}`,padding:compact?"9px 11px":"12px 14px",cursor:"pointer",transition:"all .15s",marginBottom:compact?4:8,borderLeft:`3px solid ${TYPES[item.type]?.c||T.blu}`,boxShadow:overdue?"0 2px 8px rgba(220,38,38,0.08)":"0 1px 3px rgba(0,0,0,0.04)"}}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
      onMouseLeave={e=>e.currentTarget.style.transform="none"}>

      {/* Row 1: Type + Title + Priority */}
      <div style={{display:"flex",alignItems:"flex-start",gap:7,marginBottom:6}}>
        <TypeBadge type={item.type}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:compact?12:12.5,fontWeight:600,color:T.t1,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:compact?"nowrap":"normal"}}>{item.title}</div>
          {!compact&&item.description&&<div style={{fontSize:10.5,color:T.t4,marginTop:2,lineHeight:1.4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{item.description}</div>}
        </div>
        <Pill label={item.priority} c={pm.c} bg={pm.bg} brd={pm.brd}/>
      </div>

      {/* Row 2: Site + Assignee + Due */}
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        {site&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:10.5,color:T.t3}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:site.color,flexShrink:0}}/>
          {site.name.slice(0,18)}{site.name.length>18?"…":""}
        </span>}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
          {item.dueDate&&<span style={{fontSize:10.5,fontWeight:overdue||dueSoon?700:400,color:overdue?T.red:dueSoon?T.amb:T.t4}}>
            {overdue?"⚠ "+fmtDate(item.dueDate):fmtDate(item.dueDate)}
          </span>}
          {member&&<Avatar name={member.name} size={22} color={member.color}/>}
        </div>
      </div>

      {/* Status selector inline */}
      {!compact&&<div style={{display:"flex",gap:4,marginTop:8,flexWrap:"wrap"}} onClick={e=>e.stopPropagation()}>
        {Object.keys(STATUS_META).map(s=>(
          <button key={s} onClick={()=>onStatusChange(item.id,{status:s})}
            style={{padding:"2px 8px",borderRadius:20,border:`1px solid ${item.status===s?STATUS_META[s].brd:T.b1}`,background:item.status===s?STATUS_META[s].bg:"none",color:item.status===s?STATUS_META[s].c:T.t4,fontSize:9.5,fontWeight:item.status===s?700:400,cursor:"pointer",transition:"all .1s"}}>
            {s}
          </button>
        ))}
      </div>}
    </div>
  );
}

// ── WORK ITEM DETAIL DRAWER ───────────────────────────────────
function WorkDetailDrawer({item,items,onClose,onUpdate,onDelete,isAdmin=false}){
  const [editMode,setEditMode]=useState(false);
  const [form,setForm]=useState({...item});
  const [comment,setComment]=useState("");
  const [comments,setComments]=useState([]);
  const [cLoading,setCLoading]=useState(false);
  const member=TEAM_MEMBERS.find(m=>m.id===item.assignee);
  const site=SITES.find(s=>s.id===item.site);
  const sm=STATUS_META[item.status]||STATUS_META["Todo"];
  const pm=PRIORITY_META[item.priority]||PRIORITY_META["Medium"];
  const typeC=TYPES[item.type]||TYPES["Task"];
  const overdue=isOverdue(item);

  useEffect(()=>{
    (async()=>{
      try{
        const res=await api.get("/team-schedule/items/"+item.id);
        const d=res.data?.data;
        if(d?.comments) setComments(d.comments.map(c=>({id:c.id,user:c.user_name||"User",text:c.text,date:fmtDate(c.created_at)})));
      }catch(err){console.error("Load comments:",err);}
    })();
  },[item.id]);

  const upd=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const addComment=async()=>{
    if(!comment.trim()) return;
    try{
      const res=await api.post("/team-schedule/items/"+item.id+"/comments",{text:comment.trim()});
      const c=res.data?.data;
      if(c) setComments(p=>[...p,{id:c.id,user:c.user_name||"You",text:c.text,date:"Just now"}]);
      setComment("");
    }catch(err){console.error("Add comment:",err);}
  };

  const save=()=>{
    onUpdate(item.id,form);
    setEditMode(false);
  };

  return(<>
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(560px,95vw)",background:T.bg,zIndex:301,boxShadow:"-6px 0 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease"}}>

      {/* Header */}
      <div style={{background:T.sb,padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
          <TypeBadge type={item.type}/>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontFamily:"monospace",color:"rgba(255,255,255,0.4)",marginBottom:2}}>{item.id}</div>
            {editMode
              ?<input value={form.title} onChange={upd("title")} style={{width:"100%",padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.blu}`,fontSize:14,fontWeight:700,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              :<div style={{fontSize:15,fontWeight:700,color:"white",lineHeight:1.3}}>{item.title}</div>
            }
          </div>
          <div style={{display:"flex",gap:5}}>
            {isAdmin&&<button onClick={()=>setEditMode(!editMode)} style={{background:editMode?"rgba(37,99,235,0.4)":"rgba(255,255,255,0.12)",border:editMode?"1px solid rgba(37,99,235,0.6)":"1px solid rgba(255,255,255,0.2)",cursor:"pointer",color:"white",padding:"5px 9px",borderRadius:6,fontSize:11.5,display:"flex",alignItems:"center",gap:4}}>
              <IcEdit size={12} color="white"/> {editMode?t("common.cancel"):t("common.edit_2")}
            </button>}
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
          </div>
        </div>
        {/* Status + Priority chips */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <Pill label={item.status} c={sm.c} bg={sm.bg} brd={sm.brd}/>
          <Pill label={item.priority} c={pm.c} bg={pm.bg} brd={pm.brd}/>
          <Pill label={item.type} c={typeC.c} bg={typeC.c+"22"} brd={typeC.c+"44"}/>
          {overdue&&<Pill label="OVERDUE" c={T.red} bg={T.redL} brd={T.redM}/>}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
        {/* Details grid */}
        {editMode?(
          <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,padding:"13px 14px",marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{t("common.assigned_to")}</label>
                <SearchSelect value={form.assignee} options={TEAM_MEMBERS.map(m=>({value:m.id,label:m.name}))} onChange={v=>setForm(p=>({...p,assignee:v}))} placeholder={t("team_schedule.select_member")}/>
              </div>
              <div><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{t("common.site")}</label>
                <SearchSelect value={form.site} options={SITES.map(s=>({value:s.id,label:s.name}))} onChange={v=>setForm(p=>({...p,site:v}))} placeholder={t("team_schedule.select_site")}/>
              </div>
              <div><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{t("common.status")}</label>
                <SearchSelect value={form.status} options={Object.keys(STATUS_META)} onChange={v=>setForm(p=>({...p,status:v}))} placeholder={t("common.select_status")}/>
              </div>
              <div><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{t("common.priority")}</label>
                <SearchSelect value={form.priority} options={["High","Medium","Low"]} onChange={v=>setForm(p=>({...p,priority:v}))} placeholder={t("common.select_priority")}/>
              </div>
              <div><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{t("common.start_date")}</label>
                <input type="date" value={form.startDate} onChange={upd("startDate")} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{t("common.due_date")}</label>
                <input type="date" value={form.dueDate} onChange={upd("dueDate")} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
            </div>
            <div style={{marginBottom:10}}><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{t("common.description")}</label>
              <textarea value={form.description} onChange={upd("description")} rows={3} style={{width:"100%",padding:"8px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:7}}>
              <button onClick={()=>setEditMode(false)} style={{flex:1,padding:"8px",borderRadius:6,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>{t("common.cancel")}</button>
              <button onClick={save} style={{flex:2,padding:"8px",borderRadius:6,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                <IcChk size={13} color="white"/> {t("common.save_changes")}
              </button>
            </div>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[{l:t("common.assigned_to"),v:member?.name||"—"},{l:t("common.site"),v:site?.name||"—"},{l:t("common.start_date"),v:fmtDate(item.startDate)},{l:t("common.due_date"),v:fmtDate(item.dueDate)},{l:t("team_schedule.created_by"),v:TEAM_MEMBERS.find(m=>m.id===item.createdBy)?.name||"—"},{l:t("common.created"),v:fmtDate(item.createdAt)}].map(({l,v})=>(
              <div key={l} style={{padding:"8px 11px",background:T.surface,borderRadius:7,border:`1px solid ${T.b1}`}}>
                <div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{l}</div>
                <div style={{fontSize:12.5,fontWeight:500,color:T.t1}}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        {!editMode&&item.description&&(
          <div style={{padding:"10px 12px",background:T.surface,border:`1px solid ${T.b1}`,borderLeft:`4px solid ${typeC.c}`,borderRadius:"0 8px 8px 0",marginBottom:12}}>
            <div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{t("common.description")}</div>
            <div style={{fontSize:12.5,color:T.t2,lineHeight:1.6}}>{item.description}</div>
          </div>
        )}

        {/* Tags */}
        {item.tags?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
          {item.tags.map(tg=><span key={tg} style={{background:T.sltL,color:T.slt,fontSize:11,padding:"2px 9px",borderRadius:20,border:`1px solid ${T.b2}`}}>{tg}</span>)}
        </div>}

        {/* Quick status change */}
        {!editMode&&<div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"10px 12px",marginBottom:12}}>
          <div style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>{t("team_schedule.move_status")}</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {Object.entries(STATUS_META).map(([s,meta])=>(
              <button key={s} onClick={()=>onUpdate(item.id,{status:s})}
                style={{padding:"5px 11px",borderRadius:20,border:`1.5px solid ${item.status===s?meta.brd:T.b1}`,background:item.status===s?meta.bg:T.surface,color:item.status===s?meta.c:T.t3,fontSize:11.5,fontWeight:item.status===s?700:400,cursor:"pointer",transition:"all .1s"}}>
                {item.status===s&&<span style={{marginRight:4}}>●</span>}{s}
              </button>
            ))}
          </div>
        </div>}

        {/* Comments */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.t2,marginBottom:8}}>{t("team_schedule.comments_comments", { comments: comments.length })}</div>
          {comments.map((c,i)=>(
            <div key={c.id} style={{display:"flex",gap:9,marginBottom:10}}>
              <Avatar name={c.user} size={26} color={T.blu}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{c.user}</span>
                  <span style={{fontSize:10.5,color:T.t4}}>{c.date}</span>
                </div>
                <div style={{padding:"7px 10px",background:T.surface,borderRadius:"0 8px 8px 8px",border:`1px solid ${T.b1}`,fontSize:12.5,color:T.t2}}>{c.text}</div>
              </div>
            </div>
          ))}
          <div style={{display:"flex",gap:7,marginTop:6}}>
            <input value={comment} onChange={e=>setComment(e.target.value)} placeholder={t("tasks.add_a_comment")}
              style={{flex:1,padding:"9px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}
              onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}
              onKeyDown={e=>e.key==="Enter"&&addComment()}/>
            <button onClick={addComment} style={{padding:"9px 13px",borderRadius:7,background:T.blu,color:"white",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>{t("team_schedule.post")}</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{padding:"10px 16px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:7,flexShrink:0}}>
        <button onClick={()=>onUpdate(item.id,{status:"Done",completedAt:TODAY})}
          disabled={item.status==="Done"}
          style={{flex:1,padding:"9px",borderRadius:7,background:item.status==="Done"?T.grnL:T.grn,color:item.status==="Done"?T.grn:"white",border:`1px solid ${item.status==="Done"?T.grnM:"transparent"}`,fontSize:12.5,fontWeight:700,cursor:item.status==="Done"?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
          <IcChk size={13} color={item.status==="Done"?T.grn:"white"}/>{item.status==="Done"?t("common.completed"):t("team_schedule.mark_done")}
        </button>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>{t("common.close")}</button>
      </div>
    </div>
    <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
  </>);
}

// ── CREATE WORK ITEM MODAL ─────────────────────────────────────
function CreateWorkModal({onClose,onSave,defaultType="Task",defaultAssignee="",defaultSite=""}){
  const [form,setForm]=useState({
    type:defaultType,title:"",description:"",
    assignee:defaultAssignee||TEAM_MEMBERS[0]?.id||"",
    site:defaultSite||SITES[0]?.id||"",
    priority:"Medium",status:"Todo",
    startDate:TODAY,dueDate:"",tags:"",
  });
  const upd=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const typeColor=TYPES[form.type]?.c||T.blu;

  return(<>
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(540px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>

      {/* Header */}
      <div style={{background:T.sb,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* Type selector in header */}
          <div style={{display:"flex",gap:3}}>
            {Object.keys(TYPES).map(t=>(
              <button key={t} onClick={()=>setForm(p=>({...p,type:t}))}
                style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,border:`1.5px solid ${form.type===t?TYPES[t].c:"rgba(255,255,255,0.2)"}`,background:form.type===t?TYPES[t].c+"33":"rgba(255,255,255,0.07)",color:form.type===t?TYPES[t].c:"rgba(255,255,255,0.55)",fontSize:11.5,fontWeight:form.type===t?700:400,cursor:"pointer"}}>
                <TypeBadge type={t}/> {t}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        {/* Title */}
        <div style={{marginBottom:11}}>
          <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{t("team_schedule.type_title", { type: form.type })}</label>
          <input value={form.title} onChange={upd("title")} placeholder={`Enter ${form.type.toLowerCase()} title...`}
            style={{width:"100%",padding:"10px 12px",borderRadius:7,border:`2px solid ${form.title?typeColor:T.b1}`,fontSize:13.5,fontWeight:form.title?600:400,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",transition:"border .2s"}}
            onFocus={e=>e.target.style.borderColor=typeColor} onBlur={e=>{if(!form.title)e.target.style.borderColor=T.b1;}}/>
        </div>

        {/* Assign + Site */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:11}}>
          <div>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>
              <IcAssign size={10} color={T.t4}/> {t("team_schedule.assign_to")}
            </label>
            <select value={form.assignee} onChange={upd("assignee")}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
              {TEAM_MEMBERS.map(m=><option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>
              <IcLoc size={10} color={T.t4}/> {t("mom.site_project")}
            </label>
            <select value={form.site} onChange={upd("site")}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
              {SITES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Priority + Status */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:11}}>
          <div>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{t("common.priority")}</label>
            <div style={{display:"flex",gap:5}}>
              {["High","Medium","Low"].map(p=>{
                const pm=PRIORITY_META[p];
                return<button key={p} onClick={()=>setForm(f=>({...f,priority:p}))}
                  style={{flex:1,padding:"7px",borderRadius:6,border:`1.5px solid ${form.priority===p?pm.brd:T.b1}`,background:form.priority===p?pm.bg:"none",color:form.priority===p?pm.c:T.t3,fontSize:11.5,fontWeight:form.priority===p?700:400,cursor:"pointer",textAlign:"center"}}>
                  {p}
                </button>;
              })}
            </div>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{t("team_schedule.start_status")}</label>
            <select value={form.status} onChange={upd("status")}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
              {Object.keys(STATUS_META).map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Dates */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:11}}>
          {[{l:t("common.start_date"),k:"startDate"},{l:t("common.due_date"),k:"dueDate"}].map(f=>(
            <div key={f.k}>
              <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{f.l}</label>
              <input type="date" value={form[f.k]} onChange={upd(f.k)}
                style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${f.k==="dueDate"&&form.dueDate?T.amb:T.b1}`,fontSize:12.5,color:f.k==="dueDate"&&form.dueDate?T.amb:T.t1,background:f.k==="dueDate"&&form.dueDate?T.ambL:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
          ))}
        </div>

        {/* Description */}
        <div style={{marginBottom:11}}>
          <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{t("common.description")}</label>
          <textarea value={form.description} onChange={upd("description")} rows={3} placeholder={t("team_schedule.task_details_instructions_what_needs_to")}
            style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}
            onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
        </div>

        {/* Tags */}
        <div>
          <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{t("crm.tags_comma_separated")}</label>
          <input value={form.tags} onChange={upd("tags")} placeholder={t("team_schedule.civil_urgent_design")}
            style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
      </div>

      <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>{t("common.cancel")}</button>
        <button onClick={()=>{if(form.title.trim()){onSave({...form,tags:form.tags?form.tags.split(",").map(t=>t.trim()).filter(Boolean):[]});onClose();}}} disabled={!form.title.trim()}
          style={{flex:2,padding:"10px",borderRadius:7,background:form.title.trim()?typeColor:T.b1,color:form.title.trim()?"white":T.t4,fontSize:13,fontWeight:700,border:"none",cursor:form.title.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <IcAdd size={14} color={form.title.trim()?"white":T.t4}/>{t("team_schedule.create_type", { type: form.type })}</button>
      </div>
    </div>
  </>);
}

// ── SCHEDULE GANTT VIEW ────────────────────────────────────────
function ScheduleGanttView({items}){
  const [hov,setHov]=useState(null);
  const days=[];
  const now=new Date();const start=new Date(now.getFullYear(),now.getMonth(),1);
  const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  for(let i=0;i<daysInMonth;i++){const d=new Date(start);d.setDate(d.getDate()+i);days.push(d);}
  const monthStart=start.toISOString().split("T")[0];
  const dateToX=dateStr=>{
    if(!dateStr) return null;
    const d=new Date(dateStr);
    const diff=daysDiff(monthStart,dateStr);
    if(diff<0||diff>=daysInMonth) return null;
    return 180+diff*36;
  };
  const DAY_W=36;
  const ROW_H=36;
  const LABEL_W=180;
  const totalW=LABEL_W+days.length*DAY_W;
  const totalH=40+items.length*ROW_H;

  return(
    <div style={{overflowX:"auto",background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`}}>
      <svg width={totalW} height={totalH} style={{display:"block",fontFamily:"'Segoe UI',sans-serif",minWidth:totalW}}>
        {/* Header */}
        <rect x={0} y={0} width={totalW} height={40} fill={T.sb}/>
        <text x={10} y={24} fontSize={10} fill="rgba(255,255,255,0.5)" fontWeight="600">{t("team_schedule.team_work_item")}</text>
        {days.map((d,i)=>{
          const isToday=d.toISOString().startsWith(TODAY);
          const isSun=d.getDay()===0;
          return(
            <g key={i}>
              <rect x={LABEL_W+i*DAY_W} y={0} width={DAY_W} height={40} fill={isToday?"rgba(37,99,235,0.4)":isSun?"rgba(220,38,38,0.15)":i%2===0?T.sb:"#162032"}/>
              <text x={LABEL_W+i*DAY_W+DAY_W/2} y={16} textAnchor="middle" fontSize={9} fill={isToday?"#93C5FD":isSun?"rgba(252,165,165,0.9)":"rgba(255,255,255,0.45)"} fontWeight={isToday||isSun?"700":"400"}>
                {["S","M","T","W","T","F","S"][d.getDay()]}
              </text>
              <text x={LABEL_W+i*DAY_W+DAY_W/2} y={30} textAnchor="middle" fontSize={8.5} fill={isToday?"#93C5FD":"rgba(255,255,255,0.4)"}>{d.getDate()}</text>
            </g>
          );
        })}

        {/* Rows */}
        {items.map((item,idx)=>{
          const member=TEAM_MEMBERS.find(m=>m.id===item.assignee);
          const typeC=TYPES[item.type]?.c||T.blu;
          const sm=STATUS_META[item.status]||STATUS_META["Todo"];
          const overdue=isOverdue(item);
          const y=40+idx*ROW_H;
          const x1=dateToX(item.startDate);
          const x2=dateToX(item.dueDate||item.startDate);
          const barW=x1&&x2?Math.max(DAY_W,x2-x1+DAY_W):DAY_W*2;
          const isHov=hov===item.id;

          return(
            <g key={item.id} onMouseEnter={()=>setHov(item.id)} onMouseLeave={()=>setHov(null)} style={{cursor:"pointer"}}>
              {/* Row bg */}
              <rect x={0} y={y} width={totalW} height={ROW_H} fill={isHov?T.bluL+"44":idx%2===0?T.surface:T.surfaceB} stroke={T.b1} strokeWidth={0.5}/>
              {/* Today shading */}
              {(()=>{const tx=dateToX(TODAY);return tx?<rect x={tx} y={y} width={DAY_W} height={ROW_H} fill="rgba(37,99,235,0.06)"/>:null;})()}

              {/* Label */}
              <foreignObject x={4} y={y+4} width={LABEL_W-8} height={ROW_H-8}>
                <div xmlns="http://www.w3.org/1999/xhtml" style={{display:"flex",alignItems:"center",gap:5,height:"100%"}}>
                  <div style={{width:4,height:20,borderRadius:2,background:typeC,flexShrink:0}}/>
                  <div style={{overflow:"hidden"}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
                    <div style={{fontSize:9.5,color:T.t4}}>{member?.name.split(" ")[0]} · {item.type}</div>
                  </div>
                </div>
              </foreignObject>

              {/* Bar */}
              {x1&&(
                <g>
                  {/* Background bar */}
                  <rect x={x1} y={y+9} width={barW} height={16} rx={4} fill={typeC} fillOpacity={0.2}/>
                  {/* Progress bar (done items full, others partial) */}
                  <rect x={x1} y={y+9} width={item.status==="Done"?barW:barW*0.6} height={16} rx={4} fill={item.status==="Done"?T.grn:typeC} fillOpacity={0.75}/>
                  {/* Status dot */}
                  <circle cx={x1+8} cy={y+17} r={4} fill={sm.c} stroke="white" strokeWidth={1.2}/>
                  {/* Overdue indicator */}
                  {overdue&&<rect x={x1} y={y+6} width={barW} height={22} rx={4} fill="none" stroke={T.red} strokeWidth={1.5} strokeDasharray="4,2"/>}
                </g>
              )}
            </g>
          );
        })}

        {/* TODAY line */}
        {(()=>{const tx=dateToX(TODAY);return tx?<g><line x1={tx+DAY_W/2} y1={40} x2={tx+DAY_W/2} y2={totalH} stroke={T.red} strokeWidth={1.5} strokeDasharray="5,3"/><rect x={tx+DAY_W/2-14} y={25} width={28} height={14} rx={3} fill={T.red}/><text x={tx+DAY_W/2} y={35} textAnchor="middle" fontSize={8} fill="white" fontWeight="700">TODAY</text></g>:null;})()}
      </svg>
    </div>
  );
}

// ── MEMBER VIEW ────────────────────────────────────────────────
function MemberView({items,onOpen,onStatusChange,onCreateFor,isAdmin=false}){
  const [expanded,setExpanded]=useState({});

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {TEAM_MEMBERS.map(member=>{
        const memberItems=items.filter(i=>i.assignee===member.id);
        const open=memberItems.filter(i=>i.status!=="Done").length;
        const done=memberItems.filter(i=>i.status==="Done").length;
        const urgent=memberItems.filter(i=>(isOverdue(i)||isDueSoon(i))&&i.status!=="Done").length;
        const isExp=expanded[member.id]!==false;

        return(
          <div key={member.id} style={{background:T.surface,borderRadius:10,border:`1.5px solid ${T.b1}`,overflow:"hidden"}}>
            {/* Member header */}
            <div
              style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",cursor:"pointer",background:isExp?T.surface:T.surfaceB}}
              onClick={()=>setExpanded(p=>({...p,[member.id]:!p[member.id]}))}>
              <Avatar name={member.name} size={34} color={member.color}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13.5,fontWeight:700,color:T.t1}}>{member.name}</div>
                <div style={{fontSize:11,color:T.t4}}>{member.role} · {member.dept}</div>
              </div>
              {/* Stats */}
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                {urgent>0&&<span style={{background:T.redL,color:T.red,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,border:`1px solid ${T.redM}`}}>{urgent} urgent</span>}
                <span style={{background:T.bluL,color:T.blu,fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:20}}>{open} open</span>
                <span style={{background:T.grnL,color:T.grn,fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:20}}>{done} done</span>
                {/* Quick create buttons */}
                {isAdmin&&["Task","Issue","Todo"].map(type=>(
                  <button key={type} onClick={e=>{e.stopPropagation();onCreateFor(member.id,type);}}
                    style={{display:"flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:5,background:`${TYPES[type].c}18`,border:`1px solid ${TYPES[type].c}44`,color:TYPES[type].c,fontSize:10,fontWeight:700,cursor:"pointer"}}>
                    <IcAdd size={9} color={TYPES[type].c}/>{type}
                  </button>
                ))}
                {isExp?<IcChv size={14} color={T.t4}/>:<IcChvR size={14} color={T.t4}/>}
              </div>
            </div>

            {isExp&&(
              <div style={{padding:"10px 14px",borderTop:`1px solid ${T.b1}`}}>
                {memberItems.length===0?(
                  <div style={{textAlign:"center",padding:"20px",color:T.t4,fontSize:12}}>{t("team_schedule.no_tasks_assigned")}</div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:8}}>
                    {["In Progress","Todo","Blocked","Review","Done"].map(status=>{
                      const statusItems=memberItems.filter(i=>i.status===status);
                      if(statusItems.length===0) return null;
                      const sm=STATUS_META[status];
                      return(
                        <div key={status}>
                          <div style={{fontSize:10,fontWeight:700,color:sm.c,textTransform:"uppercase",letterSpacing:".5px",marginBottom:5,display:"flex",alignItems:"center",gap:5}}>
                            <span style={{width:6,height:6,borderRadius:"50%",background:sm.c}}/>{status} ({statusItems.length})
                          </div>
                          {statusItems.map(item=><WorkCard key={item.id} item={item} onOpen={onOpen} onStatusChange={onStatusChange} compact/>)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SITE VIEW ──────────────────────────────────────────────────
function SiteView({items,onOpen,onStatusChange,onCreateFor,isAdmin=false}){
  const [expanded,setExpanded]=useState({});

  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {SITES.map(site=>{
        const siteItems=items.filter(i=>i.site===site.id);
        if(siteItems.length===0) return null;
        const issues=siteItems.filter(i=>i.type==="Issue"&&i.status!=="Done").length;
        const isExp=expanded[site.id]!==false;

        return(
          <div key={site.id} style={{background:T.surface,borderRadius:10,border:`1.5px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",cursor:"pointer",borderLeft:`4px solid ${site.color}`}}
              onClick={()=>setExpanded(p=>({...p,[site.id]:!p[site.id]}))}>
              <div style={{width:10,height:10,borderRadius:"50%",background:site.color,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{site.name}</div>
                <div style={{fontSize:11,color:T.t4}}>{t("team_schedule.city_siteitems_work_items", { city: site.city, siteItems: siteItems.length })}</div>
              </div>
              {issues>0&&<span style={{background:T.redL,color:T.red,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,border:`1px solid ${T.redM}`}}>{t("team_schedule.issues_open_issues", { issues })}</span>}
              {isAdmin&&["Task","Issue","Todo"].map(type=>(
                <button key={type} onClick={e=>{e.stopPropagation();onCreateFor(site.id,type,"site");}}
                  style={{display:"flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:5,background:`${TYPES[type].c}18`,border:`1px solid ${TYPES[type].c}44`,color:TYPES[type].c,fontSize:10,fontWeight:700,cursor:"pointer"}}>
                  <IcAdd size={9} color={TYPES[type].c}/>{type}
                </button>
              ))}
              {isExp?<IcChv size={14} color={T.t4}/>:<IcChvR size={14} color={T.t4}/>}
            </div>
            {isExp&&(
              <div style={{padding:"10px 14px",borderTop:`1px solid ${T.b1}`,display:"flex",flexDirection:"column",gap:4}}>
                {siteItems.map(item=><WorkCard key={item.id} item={item} onOpen={onOpen} onStatusChange={onStatusChange} compact/>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN TEAM SCHEDULE MODULE ──────────────────────────────────
function TeamScheduleModule(){
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const isAdmin = ["admin","super_admin","project_manager"].includes(currentUser.role);

  if(!document.getElementById("gb-spin-css")){const s=document.createElement("style");s.id="gb-spin-css";s.textContent="@keyframes spin{to{transform:rotate(360deg)}}";document.head.appendChild(s);}

  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [view,setView]=useState("board");
  const [selItem,setSelItem]=useState(null);
  const [showCreate,setShowCreate]=useState(false);
  const [createDefaults,setCreateDefaults]=useState({type:"Task",assignee:"",site:""});

  // Filters
  const [fMember,setFMember]=useState("All");
  const [fSite,setFSite]=useState("All");
  const [fType,setFType]=useState("All");
  const [fPriority,setFPriority]=useState("All");
  const [fDateFrom,setFDateFrom]=useState("");
  const [fDateTo,setFDateTo]=useState("");
  const [fStatus,setFStatus]=useState("Active");
  const [search,setSearch]=useState("");
  const [showFilters,setShowFilters]=useState(false);

  // ── Data loading ─────────────────────────────────────────
  const mapItem=i=>({
    id:i.id, type:i.type||"Task", title:i.title, description:i.description||"",
    assignee:i.assignee, site:i.site_id, priority:i.priority||"Medium", status:i.status||"Todo",
    startDate:i.start_date?i.start_date.split("T")[0]:"",
    dueDate:i.due_date?i.due_date.split("T")[0]:"",
    completedAt:i.completed_at?i.completed_at.split("T")[0]:null,
    tags:i.tags||[], createdBy:i.created_by, createdAt:i.created_at,
    assigneeName:i.assignee_name, siteName:i.site_name,
  });

  const loadAll=useCallback(async()=>{
    setError(null);setLoading(true);
    try{
      const [itemsRes,membersRes,sitesRes]=await Promise.all([
        api.get("/team-schedule/items"),
        api.get("/team-schedule/members"),
        api.get("/team-schedule/sites"),
      ]);
      setItems((itemsRes.data?.data||[]).map(mapItem));

      TEAM_MEMBERS=(membersRes.data?.data||[]).map((m,idx)=>({
        id:m.id, name:m.name, role:m.role||"", dept:m.designation||"",
        color:MEMBER_COLORS[idx%MEMBER_COLORS.length],
      }));

      SITES=(sitesRes.data?.data||[]).map((s,idx)=>({
        id:s.id, name:s.name, city:s.city||"",
        color:SITE_COLORS[idx%SITE_COLORS.length],
      }));
    }catch(err){console.error("Load team schedule:",err);setError(err);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{loadAll();},[loadAll]);

  const filteredItems=useMemo(()=>items.filter(item=>{
    if(fMember!=="All"&&item.assignee!==fMember) return false;
    if(fSite!=="All"&&item.site!==fSite) return false;
    if(fType!=="All"&&item.type!==fType) return false;
    if(fPriority!=="All"&&item.priority!==fPriority) return false;
    if(fStatus==="Active"&&item.status==="Done") return false;
    if(fStatus==="Done"&&item.status!=="Done") return false;
    if(fDateFrom&&item.dueDate&&item.dueDate<fDateFrom) return false;
    if(fDateTo&&item.dueDate&&item.dueDate>fDateTo) return false;
    if(search&&!item.title.toLowerCase().includes(search.toLowerCase())&&!item.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[items,fMember,fSite,fType,fPriority,fStatus,fDateFrom,fDateTo,search]);

  const activeF=[fMember!=="All",fSite!=="All",fType!=="All",fPriority!=="All",fStatus!=="Active"].filter(Boolean).length;

  // ── CRUD operations ──────────────────────────────────────
  const updateItem=async(id,update)=>{
    setItems(p=>p.map(i=>i.id===id?{...i,...update}:i));
    if(selItem?.id===id) setSelItem(p=>({...p,...update}));
    try{
      const payload={};
      if(update.type!==undefined) payload.type=update.type;
      if(update.title!==undefined) payload.title=update.title;
      if(update.description!==undefined) payload.description=update.description;
      if(update.assignee!==undefined) payload.assignee=update.assignee;
      if(update.site!==undefined) payload.site_id=update.site;
      if(update.priority!==undefined) payload.priority=update.priority;
      if(update.status!==undefined) payload.status=update.status;
      if(update.startDate!==undefined) payload.start_date=update.startDate||null;
      if(update.dueDate!==undefined) payload.due_date=update.dueDate||null;
      if(update.tags!==undefined) payload.tags=update.tags;
      await api.patch("/team-schedule/items/"+id,payload);
    }catch(err){console.error("Update item:",err);loadAll();}
  };

  const addItem=async(form)=>{
    try{
      const res=await api.post("/team-schedule/items",{
        type:form.type, title:form.title, description:form.description||null,
        assignee:form.assignee||null, site_id:form.site||null,
        priority:form.priority, status:form.status,
        start_date:form.startDate||null, due_date:form.dueDate||null,
        tags:form.tags||[],
      });
      const d=res.data?.data;
      if(d) setItems(p=>[mapItem(d),...p]);
    }catch(err){console.error("Add item:",err);}
  };

  const deleteItem=async(id)=>{
    setItems(p=>p.filter(i=>i.id!==id));
    setSelItem(null);
    try{await api.del("/team-schedule/items/"+id);}
    catch(err){console.error("Delete item:",err);loadAll();}
  };

  const openCreateFor=(memberId,type,mode="member")=>{
    setCreateDefaults({type,assignee:mode==="member"?memberId:"",site:mode==="site"?memberId:""});
    setShowCreate(true);
  };

  if(loading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",background:T.bg}}>
      <div style={{textAlign:"center",padding:"60px 0",color:"#94A3B8"}}><div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>{t("common.loading")}</div>
    </div>
  );

  if(error) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",background:T.bg}}>
      <div style={{textAlign:"center",padding:"60px 0",color:"#EF4444",fontSize:13}}>{t("payroll.failed_to_load")} <span style={{color:"#3B82F6",cursor:"pointer",textDecoration:"underline"}} onClick={loadAll}>{t("common.retry")}</span></div>
    </div>
  );

  // CSV Export
  const exportCSV = () => {
    const headers = ["Type","Title","Assignee","Site","Status","Priority","Start","End"];
    const rows = filteredItems.map(i => {
      const m=TEAM_MEMBERS.find(mm=>mm.id===i.assignee);
      const s=SITES.find(ss=>ss.id===i.site);
      return [i.type, i.title, m?.name||i.assigneeName||"", s?.name||i.siteName||"", i.status, i.priority||"", i.startDate||"", i.dueDate||""];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "team_schedule_export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // KPIs
  const all=items;
  const urgent=all.filter(i=>(isOverdue(i)||isDueSoon(i))&&i.status!=="Done").length;
  const todayItems=all.filter(i=>i.dueDate===TODAY&&i.status!=="Done").length;

  const TILES=[
    {l:t("team_schedule.total_items"),v:all.length,sub:t("team_schedule.length_active", { length: all.filter(i=>i.status!=="Done").length }),c:T.blu},
    {l:t("team_schedule.urgent_overdue"),v:urgent,sub:t("team_schedule.needs_attention"),c:urgent>0?T.red:T.grn},
    {l:t("team_schedule.due_today"),v:todayItems,sub:new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}),c:todayItems>0?T.amb:T.grn},
    {l:t("team_schedule.issues_open"),v:all.filter(i=>i.type==="Issue"&&i.status!=="Done").length,sub:t("team_schedule.unresolved_issues"),c:T.red},
  ];

  const VIEWS=[
    {id:"board",  l:t("team_schedule.board"),  I:IcTask},
    {id:"member", l:t("team_schedule.members"),I:IcUser},
    {id:"site",   l:t("team_schedule.sites"),  I:IcLoc},
    {id:"gantt",  l:t("team_schedule.gantt"),  I:IcGantt},
    {id:"list",   l:t("team_schedule.list"),   I:IcList},
    {id:"live",   l:t("team_schedule.live"),   I:IcLive},
  ];

  return(
    <div style={{background:T.bg,height:"100%",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* KPI Tiles */}
      <div style={{padding:"12px 18px 8px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {TILES.map((s,i)=>(
            <div key={i} style={{padding:"12px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderTop:`3px solid ${s.c}`}}>
              <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{s.l}</div>
              <div style={{fontSize:20,fontWeight:700,color:T.t1,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:10.5,color:T.t4,marginTop:3}}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dark toolbar */}
      <div style={{margin:"0 18px",flexShrink:0}}>
        <div style={{background:T.sb,borderRadius:10,padding:"0 10px",display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 10px rgba(0,0,0,0.2)"}}>
          {/* View toggle */}
          {VIEWS.map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"10px 12px",border:"none",background:"none",fontSize:12.5,fontWeight:view===v.id?600:400,color:view===v.id?"white":"rgba(255,255,255,0.45)",cursor:"pointer",borderBottom:view===v.id?"2px solid #2563EB":"2px solid transparent",transition:"all .15s",whiteSpace:"nowrap"}}>
              <v.I size={13} color="currentColor"/> {v.l}
            </button>
          ))}

          <div style={{flex:1}}/>

          {/* Search */}
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={12} color="rgba(255,255,255,0.3)"/></span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("common.search")}
              style={{height:28,padding:"0 8px 0 24px",borderRadius:6,border:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.1)",fontSize:12,color:"white",outline:"none",width:140,boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>

          {/* Filter button */}
          <button onClick={()=>setShowFilters(s=>!s)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:6,border:`1px solid ${activeF>0?"rgba(251,191,36,0.5)":"rgba(255,255,255,0.18)"}`,background:activeF>0?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.07)",color:activeF>0?"#FDE68A":"rgba(255,255,255,0.7)",fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
            <IcFilter size={12} color="currentColor"/> {t("common.filters")} {activeF>0&&<span style={{background:T.amb,color:"white",fontSize:9,fontWeight:800,padding:"0 5px",borderRadius:10}}>{activeF}</span>}
          </button>

          {/* Export — Excel + PDF */}
          <ExportMenu
            filename="my-team"
            title={t("team_schedule.my_team_schedule")}
            columns={[
              {key:"type",label:t("common.type")},
              {key:"title",label:t("common.title_2")},
              {key:"assignee",label:t("team_schedule.assignee"),get:r=>{const m=TEAM_MEMBERS.find(mm=>mm.id===r.assignee);return m?.name||r.assigneeName||"";}},
              {key:"site",label:t("common.site"),get:r=>{const s=SITES.find(ss=>ss.id===r.site);return s?.name||r.siteName||"";}},
              {key:"status",label:t("common.status")},
              {key:"priority",label:t("common.priority")},
              {key:"startDate",label:t("common.start")},
              {key:"dueDate",label:t("common.due")},
              {key:"description",label:t("common.description")},
            ]}
            rows={filteredItems}
            size="sm"
          />

          {/* Create buttons */}
          {isAdmin&&[{type:"Task",c:T.blu},{type:"Issue",c:T.red},{type:"Todo",c:T.grn}].map(({type,c})=>(
            <button key={type} onClick={()=>{setCreateDefaults({type,assignee:"",site:""});setShowCreate(true);}}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,border:`1px solid ${c}66`,background:`${c}22`,color:c,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
              <IcAdd size={11} color={c}/> {type}
            </button>
          ))}
        </div>

        {/* Filter panel */}
        {showFilters&&(
          <div style={{background:T.surface,borderRadius:"0 0 9px 9px",border:`1px solid ${T.b1}`,borderTop:"none",padding:"11px 14px",display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            {/* Member filter */}
            <div>
              <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:3}}>{t("team_schedule.member")}</div>
              <select value={fMember} onChange={e=>setFMember(e.target.value)}
                style={{height:30,padding:"0 9px",borderRadius:6,border:`1.5px solid ${fMember!=="All"?T.blu:T.b1}`,background:fMember!=="All"?T.bluL:T.surface,fontSize:12,color:fMember!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                <option value="All">{t("team_schedule.all_members")}</option>
                {TEAM_MEMBERS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            {/* Site filter */}
            <div>
              <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:3}}>{t("common.site")}</div>
              <select value={fSite} onChange={e=>setFSite(e.target.value)}
                style={{height:30,padding:"0 9px",borderRadius:6,border:`1.5px solid ${fSite!=="All"?T.blu:T.b1}`,background:fSite!=="All"?T.bluL:T.surface,fontSize:12,color:fSite!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                <option value="All">{t("common.all_sites")}</option>
                {SITES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {/* Type */}
            <div>
              <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:3}}>{t("common.type")}</div>
              <div style={{display:"flex",gap:3}}>
                {["All","Task","Issue","Todo"].map(t=>(
                  <button key={t} onClick={()=>setFType(t)}
                    style={{padding:"5px 9px",borderRadius:5,border:`1.5px solid ${fType===t?(t==="All"?T.slt:TYPES[t]?.c||T.blu):T.b1}`,background:fType===t?(t==="All"?T.sltL:TYPES[t]?.c+"18"||T.bluL):"none",color:fType===t?(t==="All"?T.slt:TYPES[t]?.c||T.blu):T.t3,fontSize:11,fontWeight:fType===t?700:400,cursor:"pointer"}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {/* Priority */}
            <div>
              <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:3}}>{t("common.priority")}</div>
              <div style={{display:"flex",gap:3}}>
                {["All","High","Medium","Low"].map(p=>{
                  const pm=PRIORITY_META[p];
                  return<button key={p} onClick={()=>setFPriority(p)}
                    style={{padding:"5px 9px",borderRadius:5,border:`1.5px solid ${fPriority===p?(p==="All"?T.slt:pm?.brd):T.b1}`,background:fPriority===p?(p==="All"?T.sltL:pm?.bg):"none",color:fPriority===p?(p==="All"?T.slt:pm?.c):T.t3,fontSize:11,fontWeight:fPriority===p?700:400,cursor:"pointer"}}>
                    {p}
                  </button>;
                })}
              </div>
            </div>
            {/* Date range */}
            <div>
              <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:3}}>{t("team_schedule.date_range")}</div>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <input type="date" value={fDateFrom} onChange={e=>setFDateFrom(e.target.value)}
                  style={{height:30,padding:"0 7px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,color:T.t1,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                <span style={{fontSize:10.5,color:T.t4}}>to</span>
                <input type="date" value={fDateTo} onChange={e=>setFDateTo(e.target.value)}
                  style={{height:30,padding:"0 7px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,color:T.t1,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
            </div>
            {/* Status */}
            <div>
              <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:3}}>{t("team_schedule.show")}</div>
              <div style={{display:"flex",gap:3}}>
                {["Active","All","Done"].map(s=>(
                  <button key={s} onClick={()=>setFStatus(s)}
                    style={{padding:"5px 9px",borderRadius:5,border:`1.5px solid ${fStatus===s?T.blu:T.b1}`,background:fStatus===s?T.bluL:"none",color:fStatus===s?T.blu:T.t3,fontSize:11,fontWeight:fStatus===s?700:400,cursor:"pointer"}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {activeF>0&&<button onClick={()=>{setFMember("All");setFSite("All");setFType("All");setFPriority("All");setFStatus("Active");}}
              style={{height:30,padding:"0 11px",borderRadius:6,border:`1px solid ${T.b1}`,background:T.surfaceB,color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer",alignSelf:"flex-end"}}>
             {t("common.clear")}
            </button>}
            <span style={{fontSize:11,color:T.t4,alignSelf:"flex-end"}}>{filteredItems.length} items</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 18px 16px"}}>

        {/* Empty state (only for work-item views) */}
        {items.length===0&&view!=="live"&&<div style={{textAlign:"center",padding:"80px 0"}}><div style={{fontSize:36,marginBottom:8}}>📅</div><div style={{color:"#64748B",fontSize:14,fontWeight:600}}>{t("team_schedule.no_work_items_yet")}</div><div style={{color:"#94A3B8",fontSize:12,marginTop:4}}>{t("team_schedule.create_tasks_issues_or_todos_to")}</div></div>}

        {/* BOARD VIEW — Kanban by status */}
        {view==="board"&&(
          <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:12,minHeight:400,alignItems:"flex-start"}}>
            {Object.entries(STATUS_META).map(([status,sm])=>{
              const colItems=filteredItems.filter(i=>i.status===status);
              return(
                <div key={status} style={{minWidth:260,maxWidth:280,flexShrink:0}}>
                  <div style={{padding:"9px 12px",borderRadius:"8px 8px 0 0",background:sm.c,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:12.5,fontWeight:700,color:"white"}}>{status}</span>
                    <span style={{background:"rgba(255,255,255,0.25)",color:"white",fontSize:11,fontWeight:700,padding:"1px 8px",borderRadius:20}}>{colItems.length}</span>
                  </div>
                  <div style={{background:sm.bg,borderRadius:"0 0 8px 8px",border:`1px solid ${sm.brd}`,borderTop:"none",padding:"8px 8px",minHeight:120}}>
                    {colItems.map(item=><WorkCard key={item.id} item={item} onOpen={setSelItem} onStatusChange={updateItem}/>)}
                    {colItems.length===0&&<div style={{textAlign:"center",padding:"20px 8px",color:`${sm.c}66`,fontSize:11.5}}>{t("common.no_items_2")}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MEMBER VIEW */}
        {view==="member"&&<MemberView items={filteredItems} onOpen={setSelItem} onStatusChange={updateItem} onCreateFor={openCreateFor} isAdmin={isAdmin}/>}

        {/* SITE VIEW */}
        {view==="site"&&<SiteView items={filteredItems} onOpen={setSelItem} onStatusChange={updateItem} onCreateFor={openCreateFor} isAdmin={isAdmin}/>}

        {/* GANTT VIEW */}
        {view==="gantt"&&<ScheduleGanttView items={filteredItems}/>}

        {/* LIVE VIEW — real-time location map + team grid */}
        {view==="live"&&<LiveTeamView/>}

        {/* LIST VIEW */}
        {view==="list"&&(
          <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"24px 1fr 90px 110px 80px 100px 100px 90px",padding:"7px 14px",background:T.sb}}>
              {["T","Work Item","Type","Assigned","Priority","Site","Due Date","Status"].map((h,i)=>(
                <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
              ))}
            </div>
            {filteredItems.map((item,i)=>{
              const member=TEAM_MEMBERS.find(m=>m.id===item.assignee);
              const site=SITES.find(s=>s.id===item.site);
              const sm=STATUS_META[item.status]||STATUS_META["Todo"];
              const pm=PRIORITY_META[item.priority];
              const overdue=isOverdue(item);
              return(
                <div key={item.id}
                  onClick={()=>setSelItem(item)}
                  style={{display:"grid",gridTemplateColumns:"24px 1fr 90px 110px 80px 100px 100px 90px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",background:i%2===0?"transparent":T.surfaceB,borderLeft:`3px solid ${TYPES[item.type]?.c||T.blu}44`,transition:"background .1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.sltL}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":T.surfaceB}>
                  <TypeBadge type={item.type}/>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
                    {item.tags?.length>0&&<div style={{display:"flex",gap:3,marginTop:2}}>{item.tags.slice(0,2).map(t=><span key={t} style={{fontSize:9,background:T.sltL,color:T.slt,padding:"1px 5px",borderRadius:10}}>{t}</span>)}</div>}
                  </div>
                  <span style={{fontSize:11,color:TYPES[item.type]?.c||T.blu,fontWeight:600}}>{item.type}</span>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    {member&&<Avatar name={member.name} size={20} color={member.color}/>}
                    <span style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{member?.name.split(" ")[0]}</span>
                  </div>
                  <Pill label={item.priority} c={pm?.c} bg={pm?.bg} brd={pm?.brd}/>
                  <span style={{fontSize:10.5,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{site?.name.slice(0,14)}</span>
                  <span style={{fontSize:11.5,fontWeight:overdue?700:400,color:overdue?T.red:T.t3}}>{fmtDate(item.dueDate)}{overdue?" ⚠":""}</span>
                  <Pill label={item.status} c={sm.c} bg={sm.bg} brd={sm.brd}/>
                </div>
              );
            })}
            {filteredItems.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4,fontSize:13}}>{t("team_schedule.no_items_match_filters")}</div>}
          </div>
        )}
      </div>

      {/* Modals */}
      {selItem&&<WorkDetailDrawer item={selItem} items={items} onClose={()=>setSelItem(null)} onUpdate={updateItem} onDelete={deleteItem} isAdmin={isAdmin}/>}
      {isAdmin&&showCreate&&<CreateWorkModal defaultType={createDefaults.type} defaultAssignee={createDefaults.assignee} defaultSite={createDefaults.site} onClose={()=>setShowCreate(false)} onSave={addItem}/>}

      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:10px}
        select,input,textarea{font-family:'Segoe UI',system-ui,sans-serif}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
      `}</style>
    </div>
  );
}

export default TeamScheduleModule;
