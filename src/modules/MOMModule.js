import { useState, useMemo, useEffect, useRef } from "react";
import api from "../config/api";
import SearchSelect from "../components/SearchSelect";
import ExportMenu from "../components/DataExport";
import { t } from "../i18n";

// ── ICONS ──────────────────────────────────────────────────────
const Ic=({d,size=18,color="currentColor",sw=1.8,fill="none"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const IcHome  =(p)=><Ic {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>;
const IcProj  =(p)=><Ic {...p} d="M3 7h18M3 12h18M3 17h18"/>;
const IcTeam  =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>;
const IcMOM   =(p)=><Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
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
const IcCal   =(p)=><Ic {...p} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>;
const IcAction=(p)=><Ic {...p} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>;
const IcUser  =(p)=><Ic {...p} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>;
const IcPrint =(p)=><Ic {...p} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/>;
const IcLoc   =(p)=><Ic {...p} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcShare =(p)=><Ic {...p} d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>;
const IcCRM   =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a3 3 0 00-3-3M16 3.13a4 4 0 010 7.75"/>;
const IcProc  =(p)=><Ic {...p} d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>;
const IcAlert =(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;

// ── THEME ──────────────────────────────────────────────────────
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
};
const fmtDate=s=>s?new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"-";
const fmtShort=s=>s?new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"-";
const TODAY=new Date().toISOString().split("T")[0];

// ── CONSTANTS ──────────────────────────────────────────────────
const TEAM=[];
const SITES=[];
const MEETING_TYPES=["Site Review","Client Meeting","Internal Team","Progress Review","Design Review","Safety Audit","Financial Review","Other"];


const NAV=[
  {sec:null,items:[
    {id:"dashboard",get l() { return t("common.dashboard"); },I:IcHome},
    {id:"projects",get l() { return t("common.projects"); },I:IcProj},
    {id:"crm",l:"CRM",I:IcCRM},
    {id:"tasks",get l() { return t("common.tasks"); },I:IcTask},
    {id:"team",get l() { return t("common.team"); },I:IcTeam},
  ]},
  {sec:"FINANCE & OPS",items:[
    {id:"finance",get l() { return t("common.finance"); },I:IcFin},
    {id:"procurement",get l() { return t("common.procurement"); },I:IcProc},
    {id:"warehouse",get l() { return t("common.warehouse"); },I:IcWH},
    {id:"payroll",get l() { return t("common.payroll"); },I:IcPay},
  ]},
  {sec:"MORE",items:[
    {id:"mom",l:"MOM",I:IcMOM},
    {id:"reports",get l() { return t("common.reports"); },I:IcRep},
    {id:"settings",get l() { return t("common.settings"); },I:IcSet},
  ]},
];

// ── MOM DATA ───────────────────────────────────────────────────
const INIT_MOMS=[];

// ── SHARED ─────────────────────────────────────────────────────
const Pill=({label,c,bg,brd})=>(
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${brd||c+"33"}`,whiteSpace:"nowrap"}}>{label}</span>
);
function Avatar({name,size=28,color=T.blu}){
  const ini=name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return<div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${color},${color}99)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:700,color:"white",flexShrink:0}}>{ini}</div>;
}
const AVATAR_COLORS={};


// ── MOM CARD ───────────────────────────────────────────────────
function MOMCard({mom,onOpen,onUpdate}){
  const totalActions=mom.actionItems.length;
  const pendingActions=mom.actionItems.filter(a=>a.status==="Pending"||a.status==="In Progress").length;
  const doneActions=totalActions-pendingActions;
  const pct=totalActions?Math.round(doneActions/totalActions*100):0;
  const TYPE_COLORS={"Site Review":T.blu,"Client Meeting":T.pur,"Progress Review":T.grn,"Design Review":T.ora||"#EA580C","Safety Audit":T.red,"Internal Team":T.slt,"Financial Review":T.amb,"Other":T.slt};
  const tc=TYPE_COLORS[mom.type]||T.slt;
  const overdueActions=mom.actionItems.filter(a=>a.status!=="Done"&&a.dueDate<TODAY).length;

  return(
    <div onClick={()=>onOpen(mom)}
      style={{background:T.surface,borderRadius:11,border:`1.5px solid ${overdueActions>0?T.ambM:T.b1}`,padding:"14px 16px",cursor:"pointer",transition:"all .15s",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",borderTop:`3px solid ${tc}`}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.12)";e.currentTarget.style.transform="translateY(-2px)";}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)";e.currentTarget.style.transform="none";}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
            <span style={{fontSize:10.5,fontFamily:"monospace",color:T.t4}}>{mom.id}</span>
            <Pill label={mom.type} c={tc} bg={tc+"18"} brd={tc+"44"}/>
          </div>
          <div style={{fontSize:13.5,fontWeight:700,color:T.t1,lineHeight:1.3}}>{mom.title}</div>
        </div>
      </div>
      {/* Meta */}
      <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
        <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11.5,color:T.t3}}>
          <IcCal size={11} color={T.t4}/>{fmtDate(mom.date)} · {mom.time}
        </span>
        <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11.5,color:T.t3}}>
          <IcLoc size={11} color={T.t4}/>{mom.site}
        </span>
      </div>
      {/* Attendees */}
      <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
        {mom.attendees.slice(0,5).map((a,i)=>(
          <div key={i} title={a} style={{marginLeft:i>0?-6:0,zIndex:mom.attendees.length-i}}>
            <Avatar name={a} size={22} color={AVATAR_COLORS[a]||T.slt}/>
          </div>
        ))}
        {mom.attendees.length>5&&<span style={{fontSize:10.5,color:T.t4,marginLeft:4}}>+{mom.attendees.length-5} more</span>}
        <span style={{fontSize:10.5,color:T.t4,marginLeft:4}}>{mom.attendees.length} attendees</span>
      </div>
      {/* Action items progress */}
      <div style={{marginBottom:6}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:10.5,color:T.t3}}>{t("mom.action_items")}</span>
          <span style={{fontSize:10.5,fontWeight:600,color:pct===100?T.grn:overdueActions>0?T.amb:T.t3}}>{doneActions}/{totalActions} done</span>
        </div>
        <div style={{height:4,background:T.b1,borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:pct===100?T.grn:overdueActions>0?T.amb:T.blu,borderRadius:4,transition:"width .5s"}}/>
        </div>
      </div>
      {/* Footer */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8,borderTop:`1px solid ${T.b1}`}}>
        <span style={{fontSize:10.5,color:T.t4}}>{t("mom.by_conductedby", { conductedBy: mom.conductedBy })}</span>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {overdueActions>0&&<Pill label={`${overdueActions} overdue`} c={T.amb} bg={T.ambL} brd={T.ambM}/>}
          {mom.sharedWith.length>0&&<span style={{fontSize:10,color:T.grn,display:"flex",alignItems:"center",gap:3}}><IcShare size={10} color={T.grn}/>{t("mom.shared")}</span>}
          <Pill label={mom.status} c={T.grn} bg={T.grnL} brd={T.grnM}/>
        </div>
      </div>
    </div>
  );
}

// ── MOM DETAIL DRAWER ──────────────────────────────────────────
function MOMDetailDrawer({mom,onClose,onUpdate}){
  const [activeTab,setActiveTab]=useState("details");
  const [editingAction,setEditingAction]=useState(null);
  const [actions,setActions]=useState(mom.actionItems);

  const updateActionStatus=(id,status)=>{
    api.patch(`/mom/${mom._id}/actions/${id}`,{status}).catch(()=>{});
    const updated=actions.map(a=>a.id===id?{...a,status}:a);
    setActions(updated);
    onUpdate(mom.id,{actionItems:updated});
  };

  const pendingCount=actions.filter(a=>a.status==="Pending"||a.status==="In Progress").length;
  const TYPE_COLORS={"Site Review":T.blu,"Client Meeting":T.pur,"Progress Review":T.grn,"Design Review":"#EA580C","Safety Audit":T.red,"Internal Team":T.slt,"Financial Review":T.amb,"Other":T.slt};
  const tc=TYPE_COLORS[mom.type]||T.slt;

  const printMOM=()=>{
    const w=window.open("","_blank","width=750,height=900");
    const actionsHTML=actions.map(a=>`
      <tr>
        <td>${a.task}</td>
        <td>${a.assignee}</td>
        <td>${a.dueDate}</td>
        <td style="color:${a.status==="Done"?"#059669":a.status==="In Progress"?"#2563EB":"#D97706"};font-weight:600">${a.status}</td>
        <td>${a.priority}</td>
      </tr>`).join("");
    const discussionHTML=mom.discussion.map((d,i)=>`<p><b>${i+1}.</b> ${d.point}</p>`).join("");
    w.document.write(`<html><head><title>MOM — ${mom.id}</title>
    <style>*{font-family:Arial,sans-serif}body{padding:24px;max-width:700px;margin:0 auto}
    .header{background:#0D1B2A;color:white;padding:16px;border-radius:6px;margin-bottom:16px}
    h3{color:#1565C0;border-bottom:2px solid #E5E7EB;padding-bottom:6px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    td,th{padding:8px 10px;border:1px solid #E5E7EB;font-size:12px}
    th{background:#F8F9FB;font-weight:600}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
    .meta-item{background:#F8F9FB;padding:8px 10px;border-radius:4px;border:1px solid #E5E7EB}
    .meta-label{font-size:10px;color:#9CA3AF;text-transform:uppercase;margin-bottom:2px}
    .meta-value{font-size:12px;font-weight:600;color:#111827}
    .attendee{display:inline-block;background:#EFF6FF;color:#2563EB;padding:2px 8px;border-radius:20px;margin:2px;font-size:11px;border:1px solid #BFDBFE}
    </style></head><body>
    <div class="header">
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px">GB BUILDCON — MINUTES OF MEETING</div>
      <h1 style="margin:0;font-size:18px">${mom.title}</h1>
      <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px">${mom.id} · ${mom.type}</div>
    </div>
    <div class="meta">
      <div class="meta-item"><div class="meta-label">Date &amp; Time</div><div class="meta-value">${fmtDate(mom.date)} · ${mom.time}</div></div>
      <div class="meta-item"><div class="meta-label">Venue</div><div class="meta-value">${mom.venue}</div></div>
      <div class="meta-item"><div class="meta-label">Site / Project</div><div class="meta-value">${mom.site}</div></div>
      <div class="meta-item"><div class="meta-label">Conducted By</div><div class="meta-value">${mom.conductedBy}</div></div>
    </div>
    <h3>Attendees</h3>
    <p>${mom.attendees.map(a=>`<span class="attendee">${a}</span>`).join(" ")}</p>
    <h3>Agenda</h3>
    <pre style="font-family:Arial;font-size:12px;white-space:pre-wrap;color:#374151">${mom.agenda}</pre>
    <h3>Discussion Points</h3>${discussionHTML}
    <h3>Action Items</h3>
    <table><tr><th>Task</th><th>Assigned To</th><th>Due Date</th><th>Status</th><th>Priority</th></tr>${actionsHTML}</table>
    ${mom.nextMeeting?`<h3>Next Meeting</h3><p><b>Date:</b> ${fmtDate(mom.nextMeeting.date)} · ${mom.nextMeeting.time}<br/><b>Agenda:</b> ${mom.nextMeeting.agenda}</p>`:""}
    ${mom.notes?`<h3>Notes</h3><p>${mom.notes}</p>`:""}
    <p style="font-size:10px;color:#9CA3AF;margin-top:24px;border-top:1px solid #E5E7EB;padding-top:8px">Generated by MOM System · ${new Date().toLocaleDateString("en-IN")}</p>
    </body></html>`);
    w.document.close();
    setTimeout(()=>w.print(),400);
  };

  const TABS=[{id:"details",l:t("app.details")},{id:"discussion",l:t("mom.discussion")},{id:"actions",l:t("mom.actions_pendingcount_pending", { pendingCount })},{id:"next",l:t("mom.next_meeting")}];

  return(<>
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(620px,95vw)",background:T.bg,zIndex:301,boxShadow:"-6px 0 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease"}}>
      {/* Header */}
      <div style={{background:T.sb,padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:4}}>
              <span style={{fontSize:10.5,fontFamily:"monospace",color:"rgba(255,255,255,0.4)"}}>{mom.id}</span>
              <Pill label={mom.type} c={tc} bg={tc+"33"} brd={tc+"66"}/>
              <Pill label={mom.status} c={T.grn} bg={T.grn+"33"} brd={T.grn+"66"}/>
            </div>
            <div style={{fontSize:16,fontWeight:700,color:"white",lineHeight:1.3,marginBottom:5}}>{mom.title}</div>
            <div style={{fontSize:11.5,color:"rgba(255,255,255,0.55)",display:"flex",gap:12,flexWrap:"wrap"}}>
              <span>{fmtDate(mom.date)} · {mom.time}</span>
              <span>{mom.site}</span>
              <span>{t("mom.by_conductedby", { conductedBy: mom.conductedBy })}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:5,flexShrink:0}}>
            <button onClick={printMOM} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 10px",borderRadius:6,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",color:"white",fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
              <IcPrint size={12} color="white"/> {t("mom.print")}
            </button>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
          </div>
        </div>
        {/* Attendees strip */}
        <div style={{display:"flex",gap:4,marginTop:10,alignItems:"center",flexWrap:"wrap"}}>
          {mom.attendees.map((a,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(255,255,255,0.1)",borderRadius:20,padding:"3px 8px 3px 3px"}}>
              <Avatar name={a} size={18} color={AVATAR_COLORS[a]||T.slt}/>
              <span style={{fontSize:10.5,color:"rgba(255,255,255,0.7)"}}>{a}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.b1}`,display:"flex",flexShrink:0,overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{padding:"10px 14px",border:"none",background:"none",fontSize:12.5,fontWeight:activeTab===t.id?700:400,color:activeTab===t.id?T.blu:T.t3,borderBottom:activeTab===t.id?`2px solid ${T.blu}`:"2px solid transparent",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>

        {/* DETAILS TAB */}
        {activeTab==="details"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
              {[{l:t("common.date"),v:fmtDate(mom.date)},{l:t("mom.time"),v:mom.time},{l:t("mom.venue"),v:mom.venue},{l:t("mom.site_project"),v:mom.site},{l:t("mom.conducted_by"),v:mom.conductedBy},{l:t("mom.meeting_type"),v:mom.type}].map(({l,v})=>(
                <div key={l} style={{padding:"9px 11px",background:T.surface,borderRadius:7,border:`1px solid ${T.b1}`}}>
                  <div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{l}</div>
                  <div style={{fontSize:12.5,fontWeight:500,color:T.t1}}>{v}</div>
                </div>
              ))}
            </div>
            {/* Agenda */}
            <div style={{padding:"11px 13px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:8,marginBottom:12}}>
              <div style={{fontSize:10.5,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>{t("mom.agenda")}</div>
              <pre style={{fontSize:12.5,color:T.t2,lineHeight:1.7,margin:0,fontFamily:"'Segoe UI',sans-serif",whiteSpace:"pre-wrap"}}>{mom.agenda}</pre>
            </div>
            {/* Notes */}
            {mom.notes&&<div style={{padding:"11px 13px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:8}}>
              <div style={{fontSize:10.5,fontWeight:700,color:T.amb,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>{t("common.notes")}</div>
              <div style={{fontSize:12.5,color:"#92400E",lineHeight:1.6}}>{mom.notes}</div>
            </div>}
          </div>
        )}

        {/* DISCUSSION TAB */}
        {activeTab==="discussion"&&(
          <div>
            {mom.discussion.map((d,i)=>(
              <div key={i} style={{display:"flex",gap:12,marginBottom:12}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:T.blu,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,color:"white"}}>{i+1}</div>
                <div style={{flex:1,padding:"10px 13px",background:T.surface,borderRadius:"0 9px 9px 9px",border:`1px solid ${T.b1}`,fontSize:12.5,color:T.t2,lineHeight:1.6}}>
                  {d.point}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ACTIONS TAB */}
        {activeTab==="actions"&&(
          <div>
            {/* Summary */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
              {[{l:t("common.total"),v:actions.length,c:T.blu},{l:t("common.done"),v:actions.filter(a=>a.status==="Done").length,c:T.grn},{l:t("common.pending"),v:actions.filter(a=>a.status!=="Done").length,c:T.amb}].map((s,i)=>(
                <div key={i} style={{padding:"9px",background:T.surface,borderRadius:7,border:`1px solid ${T.b1}`,textAlign:"center",borderTop:`3px solid ${s.c}`}}>
                  <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,color:T.t4}}>{s.l}</div>
                </div>
              ))}
            </div>
            {actions.map((action,i)=>{
              const isOverdue=action.status!=="Done"&&action.dueDate<TODAY;
              const PM={"High":{c:T.red,bg:T.redL,brd:T.redM},"Medium":{c:T.amb,bg:T.ambL,brd:T.ambM},"Low":{c:T.slt,bg:T.sltL,brd:T.b2}};
              const pm=PM[action.priority]||PM["Medium"];
              const statusColors={"Done":{c:T.grn,bg:T.grnL,brd:T.grnM},"In Progress":{c:T.blu,bg:T.bluL,brd:T.bluM},"Pending":{c:T.amb,bg:T.ambL,brd:T.ambM}};
              const sc=statusColors[action.status]||statusColors["Pending"];
              return(
                <div key={action.id} style={{background:T.surface,borderRadius:8,border:`1.5px solid ${isOverdue?T.ambM:action.status==="Done"?T.grnM:T.b1}`,padding:"11px 13px",marginBottom:8,borderLeft:`4px solid ${sc.c}`}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:7}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12.5,fontWeight:600,color:action.status==="Done"?T.t4:T.t1,textDecoration:action.status==="Done"?"line-through":"none",lineHeight:1.4}}>{action.task}</div>
                      <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <Avatar name={action.assignee} size={16} color={AVATAR_COLORS[action.assignee]||T.slt}/>
                          <span style={{fontSize:11,color:T.t3}}>{action.assignee}</span>
                        </div>
                        <span style={{fontSize:11,color:isOverdue?T.red:T.t4,fontWeight:isOverdue?700:400}}>
                          {isOverdue?"⚠ ":""}{fmtShort(action.dueDate)}
                        </span>
                        <Pill label={action.priority} c={pm.c} bg={pm.bg} brd={pm.brd}/>
                      </div>
                    </div>
                    <Pill label={action.status} c={sc.c} bg={sc.bg} brd={sc.brd}/>
                  </div>
                  {/* Quick status change */}
                  <div style={{display:"flex",gap:5}} onClick={e=>e.stopPropagation()}>
                    {["Pending","In Progress","Done"].map(s=>(
                      <button key={s} onClick={()=>updateActionStatus(action.id,s)}
                        style={{flex:1,padding:"5px",borderRadius:6,border:`1px solid ${action.status===s?statusColors[s].brd:T.b1}`,background:action.status===s?statusColors[s].bg:T.surface,color:action.status===s?statusColors[s].c:T.t3,fontSize:10.5,fontWeight:action.status===s?700:400,cursor:"pointer",textAlign:"center"}}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* NEXT MEETING TAB */}
        {activeTab==="next"&&mom.nextMeeting&&(
          <div>
            <div style={{padding:"14px 16px",background:T.bluL,border:`1.5px solid ${T.bluM}`,borderRadius:10,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>{t("mom.next_meeting_scheduled")}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div style={{background:"white",padding:"9px 11px",borderRadius:7,border:`1px solid ${T.bluM}`}}>
                  <div style={{fontSize:9.5,color:T.t4,marginBottom:2}}>{t("common.date")}</div>
                  <div style={{fontSize:14,fontWeight:700,color:T.blu}}>{fmtDate(mom.nextMeeting.date)}</div>
                </div>
                <div style={{background:"white",padding:"9px 11px",borderRadius:7,border:`1px solid ${T.bluM}`}}>
                  <div style={{fontSize:9.5,color:T.t4,marginBottom:2}}>{t("mom.time")}</div>
                  <div style={{fontSize:14,fontWeight:700,color:T.blu}}>{mom.nextMeeting.time}</div>
                </div>
              </div>
              <div style={{marginTop:9,padding:"9px 11px",background:"white",borderRadius:7,border:`1px solid ${T.bluM}`}}>
                <div style={{fontSize:9.5,color:T.t4,marginBottom:2}}>{t("mom.agenda")}</div>
                <div style={{fontSize:12.5,color:T.t2}}>{mom.nextMeeting.agenda}</div>
              </div>
            </div>
            {/* Pending action items to carry forward */}
            {actions.filter(a=>a.status!=="Done").length>0&&(
              <div style={{padding:"11px 13px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:8}}>
                <div style={{fontSize:11,fontWeight:700,color:T.amb,marginBottom:7}}>{t("mom.carry_forward_actions_actions", { actions: actions.filter(a=>a.status!=="Done").length })}</div>
                {actions.filter(a=>a.status!=="Done").map((a,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:i<actions.filter(x=>x.status!=="Done").length-1?`1px solid ${T.ambM}`:"none"}}>
                    <span style={{fontSize:12,color:"#92400E"}}>{a.task.slice(0,40)}{a.task.length>40?"…":""}</span>
                    <span style={{fontSize:11,color:T.amb,fontWeight:600}}>{a.assignee.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
  </>);
}

// ── CREATE MOM MODAL ───────────────────────────────────────────
function CreateMOMModal({onClose,onSave,projectId=null,projectName=""}){
  const [step,setStep]=useState(1); // 1=details, 2=discussion, 3=actions
  const [saving,setSaving]=useState(false);
  const [saveErr,setSaveErr]=useState("");
  const [sites, setSites] = useState([]);   // loaded from /projects
  const [team, setTeam]   = useState([]);   // loaded from /users
  useEffect(()=>{
    api.get("/projects").then(r=>{
      if(r.success && Array.isArray(r.data)){
        setSites(r.data.map(p=>({key:String(p.id||p.name), label:p.name||"Untitled"})));
      }
    }).catch(()=>{});
    api.get("/settings/users").then(r=>{
      if(r.success && Array.isArray(r.data)){
        setTeam(r.data.map(u=>({key:String(u.id||u.name), label:u.name||u.email||"User"})));
      } else if(r.users && Array.isArray(r.users)){
        setTeam(r.users.map(u=>({key:String(u.id||u.name), label:u.name||u.email||"User"})));
      }
    }).catch(()=>{});
  },[]);
  const [form,setForm]=useState({
    title:"",type:"Site Review",
    site: projectName || "",
    project_id: projectId || null,
    venue:"",
    date:TODAY,time:"10:00 AM",conductedBy:localStorage.getItem("gb_user_name")||"",
    attendees:[],agenda:"",notes:"",
    nextMeetingDate:"",nextMeetingTime:"",nextMeetingAgenda:"",
  });
  const [discussion,setDiscussion]=useState([{point:""}]);
  const [actions,setActions]=useState([{id:"A1",task:"",assignee:"",dueDate:"",status:"Pending",priority:"Medium"}]);
  const [attendeeInput,setAttendeeInput]=useState("");

  const upd=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  // Refs for textareas — used to auto-focus newly added points
  const discussionRefs=useRef({});
  const [pendingFocusDisc, setPendingFocusDisc] = useState(null);
  useEffect(()=>{
    if(pendingFocusDisc!==null && discussionRefs.current[pendingFocusDisc]){
      discussionRefs.current[pendingFocusDisc].focus();
      setPendingFocusDisc(null);
    }
  }, [pendingFocusDisc]);
  const addDiscussion=()=>setDiscussion(p=>{ const next=[...p,{point:""}]; setPendingFocusDisc(next.length-1); return next; });
  const updDiscussion=(i,v)=>setDiscussion(p=>p.map((d,idx)=>idx===i?{...d,point:v}:d));
  const removeDiscussion=i=>setDiscussion(p=>p.filter((_,idx)=>idx!==i));
  // Auto-focus newly added action item's task input
  const actionRefs=useRef({});
  const [pendingActionFocus,setPendingActionFocus]=useState(null);
  useEffect(()=>{
    if(pendingActionFocus!==null && actionRefs.current[pendingActionFocus]){
      actionRefs.current[pendingActionFocus].focus();
      setPendingActionFocus(null);
    }
  },[pendingActionFocus]);
  const addAction=()=>setActions(p=>{ const next=[...p,{id:`A${p.length+1}`,task:"",assignee:"",dueDate:"",status:"Pending",priority:"Medium"}]; setPendingActionFocus(next.length-1); return next; });
  const updAction=(i,k,v)=>setActions(p=>p.map((a,idx)=>idx===i?{...a,[k]:v}:a));
  const removeAction=i=>setActions(p=>p.filter((_,idx)=>idx!==i));
  const toggleAttendee=name=>setForm(p=>({...p,attendees:p.attendees.includes(name)?p.attendees.filter(a=>a!==name):[...p.attendees,name]}));
  const addCustomAttendee=()=>{
    if(attendeeInput.trim()&&!form.attendees.includes(attendeeInput.trim())){
      setForm(p=>({...p,attendees:[...p.attendees,attendeeInput.trim()]}));
      setAttendeeInput("");
    }
  };

  const save=async()=>{
    if(saving) return;
    setSaving(true); setSaveErr("");
    const payload={
      ...form,
      discussion:discussion.filter(d=>d.point.trim()),
      actionItems:actions.filter(a=>a.task.trim()).map((a,i)=>({...a,id:`A${i+1}`})),
      nextMeeting:form.nextMeetingDate?{date:form.nextMeetingDate,time:form.nextMeetingTime,agenda:form.nextMeetingAgenda}:null,
      status:"Finalized",
    };
    const r=await api.post("/mom",payload).catch(()=>null);
    setSaving(false);
    if(r?.success){onSave(r.data);onClose();}
    else setSaveErr(r?.message||"Save failed — check connection and retry.");
  };

  const inputStyle={width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
  const labelStyle={fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4};

  return(<>
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(600px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{background:T.sb,padding:"13px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>{t("mom.create_new_mom")}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
        </div>
        {/* Steps */}
        <div style={{display:"flex",gap:4}}>
          {[{n:1,l:t("mom.meeting_details")},{n:2,l:t("mom.discussion_points")},{n:3,l:t("mom.action_items")}].map((s,i)=>(
            <div key={s.n} style={{flex:1,display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:step>s.n?T.grn:step===s.n?T.blu:T.b2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {step>s.n?<IcChk size={11} color="white"/>:<span style={{fontSize:10,fontWeight:700,color:step===s.n?"white":T.t4}}>{s.n}</span>}
              </div>
              <span style={{fontSize:11,fontWeight:step===s.n?600:400,color:step===s.n?"white":"rgba(255,255,255,0.4)"}}>{s.l}</span>
              {i<2&&<div style={{flex:1,height:1,background:step>s.n?T.grn:"rgba(255,255,255,0.15)"}}/>}
            </div>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>

        {/* STEP 1 — Meeting Details */}
        {step===1&&(
          <div>
            <div style={{marginBottom:10}}>
              <label style={labelStyle}>{t("mom.meeting_title")}</label>
              <input value={form.title} onChange={upd("title")} placeholder={t("mom.e_g_site_review_gf_slab")} style={inputStyle} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><label style={labelStyle}>{t("mom.meeting_type")}</label>
                <SearchSelect value={form.type} options={MEETING_TYPES} onChange={v=>setForm(p=>({...p,type:v}))} placeholder={t("mom.select_meeting_type")}/>
              </div>
              <div><label style={labelStyle}>{t("mom.site_project")} {projectId && <span style={{color:T.t4,fontSize:9,marginLeft:4,textTransform:"none",letterSpacing:0,fontWeight:500}}>{t("mom.locked")}</span>}</label>
                {projectId ? (
                  <div style={{...inputStyle, display:"flex", alignItems:"center", justifyContent:"space-between", background:T.surfaceB, color:T.t2, cursor:"not-allowed"}} title={t("mom.mom_is_scoped_to_this_project")}>
                    <span>🔒 {projectName || form.site || "—"}</span>
                  </div>
                ) : (
                  <SearchSelect value={form.site} options={sites} onChange={v=>setForm(p=>({...p,site:v}))} placeholder={sites.length?t("common.select_project"):t("common.loading_projects")}/>
                )}
              </div>
              <div><label style={labelStyle}>{t("common.date")}</label>
                <input type="date" value={form.date} onChange={upd("date")} style={inputStyle}/>
              </div>
              <div><label style={labelStyle}>{t("mom.time")}</label>
                <input value={form.time} onChange={upd("time")} placeholder={t("mom.10_30_am")} style={inputStyle}/>
              </div>
              <div style={{gridColumn:"span 2"}}><label style={labelStyle}>{t("mom.venue_location")}</label>
                <input value={form.venue} onChange={upd("venue")} placeholder={t("mom.site_office_head_office_client_location")} style={inputStyle}/>
              </div>
              <div><label style={labelStyle}>{t("mom.conducted_by")}</label>
                <SearchSelect value={form.conductedBy} options={team} onChange={v=>setForm(p=>({...p,conductedBy:v}))} placeholder={team.length?t("mom.select_user"):t("mom.loading_users")}/>
              </div>
            </div>
            {/* Attendees */}
            <div style={{marginBottom:10}}>
              <label style={labelStyle}>{t("mom.attendees")}</label>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:7}}>
                {team.map(t=>{
                  const name = t.label;
                  const isOn = form.attendees.includes(name);
                  return(
                    <button key={t.key} onClick={()=>toggleAttendee(name)}
                      style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:20,border:`1.5px solid ${isOn?(AVATAR_COLORS[name]||T.blu):T.b1}`,background:isOn?((AVATAR_COLORS[name]||T.blu)+"18"):"none",color:isOn?(AVATAR_COLORS[name]||T.blu):T.t3,fontSize:11.5,fontWeight:isOn?700:400,cursor:"pointer",fontFamily:"inherit",transition:"all .12s"}}>
                      {isOn&&<IcChk size={10} color={AVATAR_COLORS[name]||T.blu}/>}{name}
                    </button>
                  );
                })}
                {team.length===0 && <span style={{fontSize:11,color:T.t4,fontStyle:"italic",padding:"5px 0"}}>{t("mom.loading_users")}</span>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <input value={attendeeInput} onChange={e=>setAttendeeInput(e.target.value)} placeholder={t("mom.add_custom_attendee_name")} style={{...inputStyle,flex:1}} onKeyDown={e=>e.key==="Enter"&&addCustomAttendee()}/>
                <button onClick={addCustomAttendee} style={{padding:"0 12px",borderRadius:7,background:T.blu,color:"white",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>{t("common.add")}</button>
              </div>
            </div>
            {/* Agenda */}
            <div style={{marginBottom:10}}>
              <label style={labelStyle}>{t("mom.agenda")}</label>
              <textarea value={form.agenda} onChange={upd("agenda")} rows={3} placeholder={t("mom.1_topic_one_2_topic_two")}
                style={{...inputStyle,resize:"vertical"}} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
          </div>
        )}

        {/* STEP 2 — Discussion Points */}
        {step===2&&(
          <div>
            <div style={{fontSize:12,color:T.t3,marginBottom:12}}>{t("mom.record_key_points_discussed_during_the")}</div>
            {discussion.map((d,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:T.blu,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,color:"white",marginTop:7}}>{i+1}</div>
                <textarea ref={el=>{ discussionRefs.current[i] = el; }}
                  value={d.point} onChange={e=>updDiscussion(i,e.target.value)} rows={2} placeholder={`Discussion point ${i+1}...`}
                  onKeyDown={e=>{
                    // Enter (without Shift) → add new point + auto-focus it
                    if(e.key==="Enter" && !e.shiftKey){
                      e.preventDefault();
                      addDiscussion();
                    }
                  }}
                  style={{flex:1,padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                {discussion.length>1&&<button onClick={()=>removeDiscussion(i)} title={t("mom.remove_point")}
                  style={{background:"none",border:"none",cursor:"pointer",color:T.t4,marginTop:8,display:"flex",padding:4,borderRadius:4,transition:"background .12s"}}
                  onMouseEnter={el=>{el.currentTarget.style.background=T.redL;el.currentTarget.style.color=T.red;}}
                  onMouseLeave={el=>{el.currentTarget.style.background="none";el.currentTarget.style.color=T.t4;}}><IcX size={13}/></button>}
              </div>
            ))}
            <button onClick={addDiscussion} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",borderRadius:7,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:12,fontWeight:600,cursor:"pointer",marginTop:4}}>
              <IcAdd size={13} color={T.blu}/> {t("mom.add_discussion_point")}
            </button>
          </div>
        )}

        {/* STEP 3 — Action Items */}
        {step===3&&(
          <div>
            <div style={{fontSize:12,color:T.t3,marginBottom:12}}>{t("mom.define_action_items_with_owners_and")}</div>
            {actions.map((a,i)=>(
              <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,padding:"11px 12px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                  <span style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px"}}>{t("mom.action_i", { i: i+1 })}</span>
                  {actions.length>1&&<button onClick={()=>removeAction(i)} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,display:"flex"}}><IcX size={12}/></button>}
                </div>
                <div style={{marginBottom:7}}>
                  <input ref={el=>{if(el) actionRefs.current[i]=el;}}
                    value={a.task} onChange={e=>updAction(i,"task",e.target.value)} placeholder={t("mom.what_needs_to_be_done")}
                    style={{...inputStyle}}
                    onFocus={e=>e.target.style.borderColor=T.blu}
                    onBlur={e=>e.target.style.borderColor=T.b1}
                    onKeyDown={e=>{ if(e.key==="Enter" && i===actions.length-1){ e.preventDefault(); addAction(); } }}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  <div><label style={labelStyle}>{t("mom.assign_to")}</label>
                    <SearchSelect value={a.assignee} options={team} onChange={v=>updAction(i,"assignee",v)} placeholder={team.length?t("mom.select_user"):t("common.loading")}/>
                  </div>
                  <div><label style={labelStyle}>{t("common.due_date")}</label>
                    <input type="date" value={a.dueDate} onChange={e=>updAction(i,"dueDate",e.target.value)} style={{...inputStyle}}/>
                  </div>
                  <div><label style={labelStyle}>{t("common.priority")}</label>
                    <SearchSelect value={a.priority} options={["High","Medium","Low"]} onChange={v=>updAction(i,"priority",v)} placeholder={t("common.priority")}/>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addAction} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",borderRadius:7,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:12,fontWeight:600,cursor:"pointer",marginTop:4}}>
              <IcAdd size={13} color={T.grn}/> {t("mom.add_action_item")}
            </button>
            {/* Next meeting */}
            <div style={{marginTop:14,padding:"12px 14px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:8}}>
              <div style={{fontSize:11,fontWeight:700,color:T.blu,marginBottom:8}}>{t("mom.next_meeting_optional")}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div><label style={labelStyle}>{t("common.date")}</label><input type="date" value={form.nextMeetingDate} onChange={upd("nextMeetingDate")} style={inputStyle}/></div>
                <div><label style={labelStyle}>{t("mom.time")}</label><input value={form.nextMeetingTime} onChange={upd("nextMeetingTime")} placeholder={t("mom.11_00_am")} style={inputStyle}/></div>
                <div style={{gridColumn:"span 2"}}><label style={labelStyle}>{t("mom.agenda_preview")}</label><input value={form.nextMeetingAgenda} onChange={upd("nextMeetingAgenda")} placeholder={t("mom.what_will_be_discussed")} style={inputStyle}/></div>
              </div>
            </div>
            {/* Notes */}
            <div style={{marginTop:10}}>
              <label style={labelStyle}>{t("mom.additional_notes")}</label>
              <textarea value={form.notes} onChange={upd("notes")} rows={2} placeholder={t("mom.any_other_important_notes_decisions_or")}
                style={{...inputStyle,resize:"vertical"}}/>
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:8,flexShrink:0}}>
        {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"10px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>{t("common.back_2")}</button>}
        {step<3&&<button onClick={()=>setStep(s=>s+1)} disabled={step===1&&!form.title.trim()}
          style={{flex:2,padding:"10px",borderRadius:7,background:step===1&&!form.title.trim()?T.b1:T.blu,color:step===1&&!form.title.trim()?T.t4:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:step===1&&!form.title.trim()?"not-allowed":"pointer"}}>
         {t("mom.next")}
        </button>}
        {step===3&&<>
          {saveErr&&<div style={{flex:"1 1 100%",order:-1,padding:"6px 10px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:6,fontSize:11,color:T.red,marginBottom:4}}>{saveErr}</div>}
          <button onClick={save} disabled={saving}
            style={{flex:2,padding:"10px",borderRadius:7,background:saving?T.grn+"99":T.grn,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            {saving?<span style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"white",borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/>:<IcChk size={14} color="white"/>}
            {saving?t("common.saving_2"):t("mom.save_mom")}
          </button>
        </>}
      </div>
    </div>
  </>);
}

// ── MEETING MODE (AI: record → transcribe → extract → create) ──
const MM_TYPE={
  mr:{get label() { return t("common.material"); },color:T.amb,bg:T.ambL,tip:"→ Material Request banega"},
  task:{get label() { return t("mom.task"); },color:T.blu,bg:T.bluL,tip:"→ Project Task banega"},
  todo:{get label() { return t("mom.todo"); },color:T.grn,bg:T.grnL,tip:"→ Todo banega"},
  issue:{get label() { return t("mom.issue"); },color:T.red,bg:T.redL,tip:"→ Issue (Site Issues task me)"},
  task_update:{get label() { return t("mom.task_update"); },color:T.pur,bg:T.purL,tip:"→ Existing task update hoga"},
};
const MM_ORDER=["mr","task","issue","task_update","todo"];
// Fuzzy-match an AI-extracted assignee name to a real company user.
function mmMatchUser(name,users){
  if(!name||!users||!users.length) return null;
  const n=String(name).trim().toLowerCase(); if(!n) return null;
  let u=users.find(x=>(x.name||"").toLowerCase()===n); if(u) return u;
  const first=n.split(/\s+/)[0];
  u=users.find(x=>(x.name||"").toLowerCase().split(/\s+/)[0]===first); if(u) return u;
  u=users.find(x=>{const xn=(x.name||"").toLowerCase(); return xn&&(xn.indexOf(n)>-1||n.indexOf(xn)>-1);});
  return u||null;
}
// Plain-text minutes for WhatsApp / copy.
function mmMinutesText(m,refs){
  const L=[];
  L.push("📋 "+((m&&m.title)||"Meeting"));
  if(m&&m.summary){ L.push(""); L.push(m.summary); }
  const ok=(refs||[]).filter(r=>r.ok);
  if(ok.length){ L.push(""); L.push("Action items:"); ok.forEach(r=>L.push("• ["+(MM_TYPE[r.type]?MM_TYPE[r.type].label:r.type)+"] "+r.title+(r.ref?" ("+r.ref+")":""))); }
  L.push(""); L.push("— Sanchalan Meeting Mode");
  return L.join("\n");
}
const MM_SAMPLE="Site pe aaj meeting hui. 50 bag cement aur 500 kg sariya kal site pe chahiye, ye urgent hai warna RCC ka kaam ruk jayega. Ramesh ne bola slab ki shuttering kal tak complete kar dega. Suresh bijli connection wale issue ko follow up karega. Aur client ko site ki updated photos bhejni hai.";
const fmtSecs=s=>String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
const MIC_PATH="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8";

function MMItem({it,meta,onPatch,inputStyle,allMode,projects}){
  const inp={...inputStyle,padding:"6px 8px",fontSize:12};
  const isUpd=it.type==="task_update";
  const needProj=allMode&&(it.type==="mr"||it.type==="task"||it.type==="issue")&&!it.project;
  return(
    <div style={{background:T.surface,border:`1px solid ${it._include?meta.color+"66":T.b1}`,borderRadius:9,padding:11,marginBottom:8,opacity:it._include?1:0.55}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        <div onClick={()=>onPatch(it._id,{_include:!it._include})}
          style={{width:21,height:21,borderRadius:5,border:`2px solid ${it._include?meta.color:T.b2}`,background:it._include?meta.color:"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
          {it._include&&<IcChk size={12} color="white"/>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          {isUpd?(
            <>
              <div style={{fontSize:12.5,fontWeight:600,color:T.t1,marginBottom:6}}>{it.task_name||it.title||t("mom.existing_task")}{allMode&&it.project?<span style={{fontSize:10,fontWeight:500,color:T.t4}}>  ·  {it.project}</span>:null}</div>
              <div style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap"}}>
                <select value={it.status||""} onChange={e=>onPatch(it._id,{status:e.target.value})} style={{...inp,width:"auto"}}>
                  <option value="">{t("mom.status")}</option>
                  {["Not Started","Ongoing","Completed"].map(s=><option key={s}>{s}</option>)}
                </select>
                <input type="number" value={it.progress>=0?it.progress:""} onChange={e=>onPatch(it._id,{progress:e.target.value===""?-1:Number(e.target.value)})} placeholder="%" style={{...inp,width:64}}/>
                <input value={it.note||""} onChange={e=>onPatch(it._id,{note:e.target.value})} placeholder={t("mom.progress_note_optional")} style={{...inp,flex:1,minWidth:120}}/>
              </div>
              <div style={{fontSize:9.5,color:it.task_id?T.t4:T.red}}>{it.task_id?("Task #"+it.task_id):t("mom.koi_existing_task_match_nahi_skip")}</div>
            </>
          ):(
            <>
              <input value={it.title} onChange={e=>onPatch(it._id,{title:e.target.value})} style={{...inp,fontWeight:600,fontSize:12.5,marginBottom:6}}/>
              {it.type==="mr"?(
                <div style={{display:"flex",gap:6}}>
                  <input type="number" value={it.quantity} onChange={e=>onPatch(it._id,{quantity:e.target.value})} placeholder={t("common.qty")} style={{...inp,width:70}}/>
                  <input value={it.unit} onChange={e=>onPatch(it._id,{unit:e.target.value})} placeholder="unit" style={{...inp,width:80}}/>
                  <input value={it.due_date} onChange={e=>onPatch(it._id,{due_date:e.target.value})} placeholder={t("mom.yyyy_mm_dd")} style={{...inp,flex:1}}/>
                </div>
              ):(
                <textarea value={it.description} onChange={e=>onPatch(it._id,{description:e.target.value})} rows={2} placeholder={t("app.details")} style={{...inp,width:"100%",resize:"none",lineHeight:1.4,fontFamily:"inherit"}}/>
              )}
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6,flexWrap:"wrap"}}>
                {it.type!=="mr"&&<select value={it.priority} onChange={e=>onPatch(it._id,{priority:e.target.value})} style={{...inp,padding:"4px 7px",width:"auto"}}>{["Low","Medium","High"].map(p=><option key={p}>{p}</option>)}</select>}
                {allMode&&(
                  <select value={it.project||""} onChange={e=>onPatch(it._id,{project:e.target.value})}
                    style={{...inp,padding:"4px 7px",width:"auto",maxWidth:150,border:`1.5px solid ${needProj?T.amb:T.b1}`,color:needProj?T.amb:T.t1}}>
                    <option value="">{t("mom.project")}</option>
                    {projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                )}
                {it.assignee?<span style={{fontSize:10.5,color:T.t3}}>@ {it.assignee}</span>:null}
                <span style={{marginLeft:"auto",fontSize:9.5,color:T.t4}}>{Math.round((it.confidence||0)*100)}%</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MeetingModeModal({projectId=null,projectName="",onClose,onComplete}){
  const [step,setStep]=useState("capture");           // capture | review | done
  const [mode,setMode]=useState(projectId?"single":"all"); // default All at company level; Single inside a project
  const [addingTitle,setAddingTitle]=useState(false);  // "Add new" meeting-title input open
  const [customTitles,setCustomTitles]=useState([]);   // company's own saved titles (localStorage)
  const [projects,setProjects]=useState([]);
  const [proj,setProj]=useState(projectId?String(projectId):"");
  const [title,setTitle]=useState("");
  const [transcript,setTranscript]=useState("");
  const [recording,setRecording]=useState(false);
  const [recSecs,setRecSecs]=useState(0);
  const [transcribing,setTranscribing]=useState(false);
  const [recInfo,setRecInfo]=useState("");
  const [extracting,setExtracting]=useState(false);
  const [meeting,setMeeting]=useState(null);
  const [items,setItems]=useState([]);
  const [committing,setCommitting]=useState(false);
  const [result,setResult]=useState(null);
  const [err,setErr]=useState("");
  const [users,setUsers]=useState([]);       // staff (assignee auto-match)
  const [audioUrl,setAudioUrl]=useState(null); // archived recording
  const [weather,setWeather]=useState(null);   // weather suggestions
  const [copied,setCopied]=useState(false);
  const mrRef=useRef(null),chunksRef=useRef([]),streamRef=useRef(null),timerRef=useRef(null);

  useEffect(()=>{
    api.get("/projects").then(r=>{ if(r&&r.success&&Array.isArray(r.data)) setProjects(r.data); }).catch(()=>{});
    api.get("/settings/users").then(r=>{ if(r&&r.success&&Array.isArray(r.data)) setUsers(r.data); }).catch(()=>{});
    try{ const s=JSON.parse(localStorage.getItem(mmTitleKey)||"[]"); if(Array.isArray(s)) setCustomTitles(s); }catch(e){}
    return ()=>{ if(timerRef.current) clearInterval(timerRef.current); if(streamRef.current){ try{streamRef.current.getTracks().forEach(t=>t.stop());}catch(e){} } };
  },[]);
  // per-company key so each firm builds its own meeting-title nomenclature
  const mmTitleKey=(()=>{ try{ const u=JSON.parse(localStorage.getItem("gb_user")||"{}"); return "mm_titles_"+(u.company_id||u.companyId||"x"); }catch(e){ return "mm_titles"; } })();
  const addCustomTitle=t=>{ t=(t||"").trim(); if(!t){ setAddingTitle(false); return; } setCustomTitles(prev=>{ if(prev.includes(t)) return prev; const nx=[t,...prev].slice(0,12); try{ localStorage.setItem(mmTitleKey,JSON.stringify(nx)); }catch(e){} return nx; }); setTitle(t); setAddingTitle(false); };

  const projName=id=>projects.find(p=>String(p.id)===String(id))?.name||projectName||"";
  const loadWeather=pid=>{ setWeather(null); if(!pid) return; api.get("/meetings/weather?project_id="+pid).then(r=>{ if(r&&r.success) setWeather(r); }).catch(()=>{}); };
  const addSuggestion=sug=>setItems(prev=>prev.some(x=>x.title===sug.title&&x.type===sug.type)?prev:[...prev,{...sug,_id:"w"+prev.length+"_"+(sug.title||"").length,_include:true}]);
  const blobToB64=blob=>new Promise((res,rej)=>{ const fr=new FileReader(); fr.onerror=rej; fr.onloadend=()=>res(fr.result); fr.readAsDataURL(blob); });

  const startRec=async()=>{
    setErr(""); setRecInfo("");
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder){ setErr(t("mom.is_browser_pe_recording_support_nahi")); return; }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      streamRef.current=stream;
      const mime=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg"].find(t=>{try{return window.MediaRecorder.isTypeSupported(t);}catch(e){return false;}})||"";
      const mr=mime?new window.MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:32000}):new window.MediaRecorder(stream);
      chunksRef.current=[];
      mr.ondataavailable=e=>{ if(e.data&&e.data.size) chunksRef.current.push(e.data); };
      mr.onstop=onRecStop;
      mrRef.current=mr; mr.start();
      setRecording(true); setRecSecs(0);
      timerRef.current=setInterval(()=>setRecSecs(s=>s+1),1000);
    }catch(e){ if(streamRef.current){try{streamRef.current.getTracks().forEach(t=>t.stop());}catch(_){}} setErr(t("mom.mic_permission_chahiye_allow_karke_dobara")); }
  };
  const stopRec=()=>{ if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;} try{ if(mrRef.current&&mrRef.current.state!=="inactive") mrRef.current.stop(); }catch(e){} setRecording(false); };
  const onRecStop=async()=>{
    const blob=new Blob(chunksRef.current,{type:(mrRef.current&&mrRef.current.mimeType)||"audio/webm"}); chunksRef.current=[];
    if(streamRef.current){try{streamRef.current.getTracks().forEach(t=>t.stop());}catch(e){} streamRef.current=null;}
    if(!blob.size){ setErr(t("mom.recording_khali_rahi_dobara_try_karein")); return; }
    setTranscribing(true);
    try{
      const b64=await blobToB64(blob);
      const r=await api.post("/meetings/transcribe",{audio_base64:b64,mime_type:blob.type});
      setTranscribing(false);
      if(!r||!r.success){ setErr(r?.message||"Transcription fail hua."); return; }
      setTranscript(p=>(p&&p.trim()?p.trim()+" ":"")+(r.transcript||""));
      if(r.audio_url) setAudioUrl(r.audio_url);
      if(r.mock) setRecInfo("Demo transcript (backend pe SARVAM_API_KEY set karein real transcription ke liye).");
    }catch(e){ setTranscribing(false); setErr(t("mom.audio_process_nahi_hua_dobara_try")); }
  };

  const doExtract=async()=>{
    if(mode==="single"&&!proj){ setErr(t("mom.single_project_mode_me_pehle_project")); return; }
    if(!transcript.trim()){ setErr(t("mom.pehle_record_karein_ya_transcript_daalein")); return; }
    setErr(""); setExtracting(true);
    const r=await api.post("/meetings/extract",{transcript:transcript.trim(),mode,project_id:proj||undefined,project_name:projName(proj)||undefined,title:title.trim()||undefined,audio_url:audioUrl||undefined});
    setExtracting(false);
    if(!r||!r.success){ setErr(r?.message||"AI extraction fail hua."); return; }
    setMeeting(r.data);
    setItems((r.data.items||[]).map((it,i)=>({...it,_id:i,_include:true})));
    if(mode==="single") loadWeather(proj||r.data.project_id); else setWeather(null);
    setStep("review");
  };
  const patchItem=(id,patch)=>setItems(p=>p.map(it=>it._id===id?{...it,...patch}:it));

  // resolve a project id per item (all-mode: from item.project name; single: the picked project)
  const pidFor=it=>{
    if(mode==="all"){ const p=projects.find(pp=>pp.name===(it.project||"")); return p?p.id:null; }
    return proj||(meeting&&meeting.project_id)||null;
  };
  const missingProj=()=>items.filter(it=>it._include&&(it.type==="mr"||it.type==="task"||it.type==="issue")&&!pidFor(it));
  // Review → Overview: validate every item has a project before the summary/submit
  const goOverview=()=>{
    const chosen=items.filter(it=>it._include);
    if(!chosen.length){ setErr(t("mom.kam_se_kam_ek_item_select")); return; }
    const need=missingProj();
    if(need.length){ setErr(mode==="all"?`${need.length} item ko project assign karein (dropdown).`:"Material/Task/Issue ke liye project select karein."); return; }
    setErr(""); setStep("overview");
  };

  const commit=async()=>{
    const chosen=items.filter(it=>it._include);
    if(!chosen.length){ setErr(t("mom.kam_se_kam_ek_item_select")); return; }
    const allMode=mode==="all";
    const need=missingProj();
    if(need.length){ setErr(allMode?`${need.length} item ko project assign karein (dropdown).`:"Material/Task/Issue ke liye project select karein."); setStep("review"); return; }
    setErr(""); setCommitting(true);
    const refs=[];
    const holderCache={}; // project_id -> "Site Issues" holder task id (issues need a parent task)
    const getHolder=async(pid)=>{
      if(holderCache[pid]!==undefined) return holderCache[pid];
      let tid=null;
      try{
        const lr=await api.get("/tasks?project_id="+pid);
        const list=(lr&&lr.data)||[];
        const found=list.find(t=>(t.name||"").toLowerCase()==="site issues");
        if(found) tid=found.id;
        else { const cr=await api.post("/tasks",{project_id:pid,name:"Site Issues",title:t("mom.site_issues"),category:"General"}); tid=cr?.data?.id||null; }
      }catch(e){}
      holderCache[pid]=tid; return tid;
    };
    for(const it of chosen){
      const pid=pidFor(it);
      const mu=(it.type==="task"||it.type==="todo"||it.type==="issue")?mmMatchUser(it.assignee,users):null;
      try{
        let r,ref;
        if(it.type==="mr"){
          r=await api.post("/procurement/mrs",{project_id:pid,project_name:projName(pid),item_name:it.title,quantity:Number(it.quantity)||1,unit:it.unit||"Nos",notes:it.description||null,required_date:it.due_date||null});
          ref=r?.data?.mr_number||r?.data?.id;
        }else if(it.type==="task"){
          r=await api.post("/tasks",{project_id:pid,parent_id:null,name:it.title,title:it.title,description:(it.description||"")+(it.assignee&&!mu?`\n(Assignee: ${it.assignee})`:""),category:"General",assigned_to:mu?mu.id:null});
          ref=r?.data?.task_no?("#"+r.data.task_no):r?.data?.id;
        }else if(it.type==="todo"){
          r=await api.post("/projects/company-todos",{title:it.title,description:it.description||"",priority:it.priority||"Medium",category:"Other",due_date:it.due_date||"",project_id:pid||null,assigned_to:mu?mu.id:undefined});
          ref=r?.data?.id;
        }else if(it.type==="issue"){
          const holder=await getHolder(pid);
          if(holder){ r=await api.post("/tasks/"+holder+"/issues",{title:it.title,description:it.description||"",priority:it.priority||"Medium",assigned_to:mu?mu.name:(it.assignee||null)}); ref=r?.data?.id?"raised":undefined; }
          else r={success:false};
        }else if(it.type==="task_update"){
          if(it.task_id){
            const body={};
            if(it.status) body.status=it.status;
            if(typeof it.progress==="number"&&it.progress>=0) body.progress=it.progress;
            r=(it.status||body.progress!=null)?await api.put("/tasks/"+it.task_id,body):{success:true};
            if(it.note){ try{ await api.post("/tasks/"+it.task_id+"/comments",{text:it.note}); }catch(e){} }
            ref=it.status||(body.progress!=null?it.progress+"%":"updated");
          } else r={success:false};
        }
        const id=it.type==="task_update"?it.task_id:(r&&r.data?r.data.id:undefined);
        refs.push({type:it.type,title:isUpdTitle(it),ok:!!(r&&(r.success||r.data)),ref,id});
      }catch(e){ refs.push({type:it.type,title:isUpdTitle(it),ok:false}); }
    }
    // Create the MOM (minutes) so the meeting shows up in this list
    let createdMOM=null;
    try{
      const me=JSON.parse(localStorage.getItem("gb_user")||"{}");
      const grp=tp=>chosen.filter(it=>it.type===tp);
      const tag=it=>allMode&&it.project?` [${it.project}]`:"";
      const todoActions=[...grp("todo"),...grp("issue")].map((it,i)=>({id:"A"+(i+1),task:(it.type==="issue"?"[Issue] ":"")+it.title+tag(it),assignee:it.assignee||"",dueDate:it.due_date||"",status:"Pending",priority:it.priority||"Medium"}));
      const disc=[];
      if(grp("mr").length) disc.push({point:"Materials: "+grp("mr").map(m=>`${m.title} (${m.quantity||""} ${m.unit||""})`.trim()+tag(m)).join(", ")});
      if(grp("task").length) disc.push({point:"Tasks: "+grp("task").map(t=>t.title+tag(t)).join(", ")});
      if(grp("task_update").length) disc.push({point:"Task updates: "+grp("task_update").map(t=>`${t.task_name||t.title} → ${t.status||""}${t.progress>=0?` ${t.progress}%`:""}`.trim()).join(", ")});
      const singlePid=allMode?null:(proj||(meeting&&meeting.project_id)||null);
      const payload={
        title:title.trim()||(meeting&&meeting.summary?meeting.summary.slice(0,50):"Meeting"),
        type:allMode?"Progress Review":"Site Review", site:allMode?"Multiple projects":projName(singlePid), project_id:singlePid, venue:"",
        date:TODAY, time:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),
        conductedBy:me.name||"", attendees:[], agenda:(meeting&&meeting.summary)||"",
        notes:transcript, discussion:disc, actionItems:todoActions, nextMeeting:null, status:"Finalized",
      };
      const mr=await api.post("/mom",payload);
      if(mr&&mr.success) createdMOM=mr.data;
    }catch(e){}
    if(meeting&&meeting.id){ try{ await api.patch("/meetings/"+meeting.id,{status:"committed",committed_refs:refs}); }catch(e){} }
    setCommitting(false);
    setResult({refs,mom:createdMOM});
    if(createdMOM&&onComplete) onComplete(createdMOM);
  };
  const isUpdTitle=it=>it.type==="task_update"?(it.task_name||it.title):it.title;

  const inputStyle={width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
  const labelStyle={fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4};
  const btnP=on=>({background:on?T.blu:T.b1,color:on?"white":T.t4,border:"none",borderRadius:8,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:on?"pointer":"not-allowed"});
  const btnS={background:T.surface,border:`1px solid ${T.b1}`,color:T.t3,borderRadius:8,padding:"10px 16px",fontSize:13,fontWeight:600,cursor:"pointer"};
  const chosenCount=items.filter(it=>it._include).length;
  const MM_TITLE_PRESETS=["Daily Meeting","Morning Meeting","Evening Meeting","Site Review","Client Meeting"];
  const titleOptions=[...MM_TITLE_PRESETS,...customTitles.filter(t=>!MM_TITLE_PRESETS.includes(t))];

  return(
    <>
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(1px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(680px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden"}}>
        {/* header */}
        <div style={{background:T.sb,padding:"13px 18px",flexShrink:0,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:8,background:"rgba(124,58,237,0.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic d={MIC_PATH} size={16} color="#C4B5FD"/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:"white"}}>{t("mom.meeting_mode")}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{step==="review"?t("mom.review_edit_items_project_check_karein"):step==="overview"?t("mom.overview_ek_nazar_me_phir_submit"):step==="done"?t("mom.ho_gaya"):t("mom.record_ya_paste_karein_ai_nikalegi")}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4}}><IcX size={18} color="rgba(255,255,255,0.7)"/></button>
        </div>

        {/* content */}
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
          {step==="capture"&&(
            <>
              <div style={{display:"flex",gap:5,marginBottom:12,background:T.sltL,padding:4,borderRadius:9}}>
                {[{k:"single",l:t("mom.single_project")},{k:"all",l:t("mom.all_projects")}].map(o=>(
                  <button key={o.k} onClick={()=>setMode(o.k)}
                    style={{flex:1,padding:"8px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:mode===o.k?T.surface:"transparent",color:mode===o.k?T.t1:T.t3,boxShadow:mode===o.k?"0 1px 3px rgba(0,0,0,0.12)":"none"}}>{o.l}</button>
                ))}
              </div>
              {mode==="single"?(
                <div style={{marginBottom:12}}>
                  <label style={labelStyle}>{t("common.project")} <span style={{color:T.t4,textTransform:"none",fontWeight:500}}>{t("mom.material_task_ke_liye")}</span></label>
                  <select value={proj} onChange={e=>setProj(e.target.value)} style={inputStyle}>
                    <option value="">{t("mom.select_project")}</option>
                    {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              ):(
                <div style={{marginBottom:12,fontSize:11,color:T.t2,background:T.purL,border:`1px solid ${T.purM}`,borderRadius:8,padding:"9px 11px",lineHeight:1.5}}>
                  <b style={{color:T.pur}}>{t("mom.all_projects_mode")}</b> {t("mom.ek_hi_recording_me_saare_projects")}
                </div>
              )}
              <div style={{marginBottom:12}}>
                <label style={labelStyle}>{t("mom.meeting_title_2")}</label>
                {addingTitle?(
                  <div style={{display:"flex",gap:6}}>
                    <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder={t("mom.apna_meeting_title_likhein")} style={inputStyle}
                      onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); addCustomTitle(title); } }}/>
                    <button onClick={()=>addCustomTitle(title)} style={{...btnS,padding:"8px 14px",whiteSpace:"nowrap"}}>{t("common.save")}</button>
                  </div>
                ):(
                  <select value={titleOptions.includes(title)?title:""} onChange={e=>{ const v=e.target.value; if(v==="__add__"){ setTitle(""); setAddingTitle(true); } else setTitle(v); }} style={inputStyle}>
                    <option value="">{t("mom.select_meeting_title")}</option>
                    {titleOptions.map(t=><option key={t} value={t}>{t}</option>)}
                    <option value="__add__">{t("mom.add_new")}</option>
                  </select>
                )}
              </div>
              {transcribing?(
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:9,padding:12,borderRadius:9,background:T.bluL,marginBottom:12}}>
                  <span style={{width:14,height:14,border:`2px solid ${T.blu}`,borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",animation:"spin .8s linear infinite"}}/>
                  <span style={{fontSize:12.5,fontWeight:600,color:T.blu}}>{t("mom.audio_transcribe_ho_raha_hai")}</span>
                </div>
              ):recording?(
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 13px",borderRadius:9,background:T.redL,border:`1px solid ${T.redM}`,marginBottom:12}}>
                  <span style={{width:11,height:11,borderRadius:"50%",background:T.red,animation:"mmpulse 1s ease-in-out infinite"}}/>
                  <span style={{fontSize:14,fontWeight:700,color:T.red,fontVariantNumeric:"tabular-nums"}}>{fmtSecs(recSecs)}</span>
                  <span style={{fontSize:11.5,color:T.t3}}>{t("mom.recording")}</span>
                  <button onClick={stopRec} style={{marginLeft:"auto",background:T.red,color:"white",border:"none",borderRadius:7,padding:"8px 15px",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{t("mom.stop_transcribe")}</button>
                </div>
              ):(
                <div style={{marginBottom:12}}>
                  <button onClick={startRec} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:11,background:T.pur,color:"white",border:"none",borderRadius:11,padding:"16px",fontSize:15.5,fontWeight:800,cursor:"pointer",boxShadow:"0 2px 10px rgba(124,58,237,0.28)"}}>
                    <span style={{width:30,height:30,borderRadius:15,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic d={MIC_PATH} size={18} color="white"/></span>
                   {t("mom.start_meeting_recording_shuru_karein")}
                  </button>
                  <div style={{textAlign:"center",fontSize:10.5,color:T.t4,marginTop:6}}>{t("mom.meeting_shuru_karte_hi_record_dabana")}</div>
                </div>
              )}
              {recInfo&&<div style={{fontSize:10.5,color:T.amb,marginTop:-6,marginBottom:10}}>{recInfo}</div>}
              <div style={{display:"flex",alignItems:"center",gap:8,margin:"4px 0 10px"}}>
                <div style={{flex:1,height:1,background:T.b1}}/><span style={{fontSize:10,color:T.t4}}>{t("mom.ya_likh_ke_daalein")}</span><div style={{flex:1,height:1,background:T.b1}}/>
              </div>
              <textarea value={transcript} onChange={e=>setTranscript(e.target.value)} rows={6} placeholder={t("mom.meeting_ki_baat_cheet_yahan_paste")} style={{...inputStyle,resize:"vertical",lineHeight:1.5}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                <button onClick={()=>{setTranscript(MM_SAMPLE);setErr("");}} style={{background:"none",border:"none",color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer",padding:0}}>{t("mom.sample_try_karein")}</button>
                <span style={{fontSize:10.5,color:T.t4}}>{transcript.trim()?transcript.trim().length+" chars":""}</span>
              </div>
            </>
          )}

          {step==="review"&&(
            <>
              {meeting&&meeting.summary?(
                <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:9,padding:"10px 13px",marginBottom:14}}>
                  <div style={{fontSize:9.5,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{t("mom.ai_summary")}</div>
                  <div style={{fontSize:12.5,color:T.t2,lineHeight:1.5}}>{meeting.summary}</div>
                </div>
              ):null}
              {mode==="single"?(
                <div style={{marginBottom:14}}>
                  <label style={labelStyle}>{t("common.project")} <span style={{color:T.t4,textTransform:"none",fontWeight:500}}>{t("mom.material_task_ke_liye_zaroori")}</span></label>
                  <select value={proj} onChange={e=>setProj(e.target.value)} style={inputStyle}>
                    <option value="">{t("mom.select_project")}</option>
                    {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              ):(
                <div style={{marginBottom:12,fontSize:11,color:T.t3}}>{t("mom.har_item_ka")} <b style={{color:T.pur}}>project</b> {t("mom.neeche_check_correct_karein_ai_ne")}</div>
              )}
              {audioUrl&&(
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px"}}>{t("mom.recording_2")}</span>
                  <audio src={audioUrl} controls style={{height:30,flex:1}}/>
                </div>
              )}
              {mode==="single"&&weather&&weather.suggestions&&weather.suggestions.length>0&&(
                <div style={{background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:9,padding:"10px 13px",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                    <span style={{fontSize:15}}>{/rain|storm|drizzle|thunder/i.test(weather.condition||"")?"🌧️":((weather.temp||0)>=38?"☀️":"⛅")}</span>
                    <span style={{fontSize:11.5,fontWeight:700,color:T.t1}}>{t("mom.weather_suggestions")}</span>
                    {weather.mock&&<span style={{fontSize:9,color:T.amb,background:T.ambL,padding:"2px 6px",borderRadius:5}}>demo</span>}
                  </div>
                  <div style={{fontSize:11,color:T.t3,marginBottom:8}}>{weather.summary}</div>
                  {weather.suggestions.map((s,i)=>{
                    const added=items.some(x=>x.title===s.title&&x.type===s.type);
                    return(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <span style={{fontSize:9,fontWeight:700,color:MM_TYPE[s.type]?.color,background:MM_TYPE[s.type]?.bg,padding:"2px 6px",borderRadius:5}}>{MM_TYPE[s.type]?.label}</span>
                        <span style={{flex:1,fontSize:11.5,color:T.t2}}>{s.title}</span>
                        <button onClick={()=>addSuggestion(s)} disabled={added} style={{background:added?T.grnL:T.blu,color:added?T.grn:"white",border:"none",borderRadius:7,padding:"5px 11px",fontSize:11,fontWeight:700,cursor:added?"default":"pointer"}}>{added?t("mom.added"):t("mom.add")}</button>
                      </div>
                    );
                  })}
                </div>
              )}
              {items.length===0&&<div style={{textAlign:"center",padding:"24px",color:T.t4,fontSize:12.5}}>{t("mom.is_meeting_me_koi_action_item")}</div>}
              {MM_ORDER.map(tp=>{
                const grp=items.filter(it=>it.type===tp); if(!grp.length) return null;
                const meta=MM_TYPE[tp];
                return(
                  <div key={tp} style={{marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                      <span style={{fontSize:10,fontWeight:700,color:meta.color}}>{meta.label.toUpperCase()}</span>
                      <span style={{fontSize:10,color:T.t4}}>{meta.tip}</span>
                    </div>
                    {grp.map(it=><MMItem key={it._id} it={it} meta={meta} onPatch={patchItem} inputStyle={inputStyle} allMode={mode==="all"} projects={projects}/>)}
                  </div>
                );
              })}
            </>
          )}

          {step==="overview"&&(()=>{
            const chosen=items.filter(it=>it._include);
            const groups={};
            chosen.forEach(it=>{ const pn=mode==="all"?(it.project||"— No project —"):(projName(proj)||"— No project —"); (groups[pn]=groups[pn]||[]).push(it); });
            const names=Object.keys(groups);
            return(
              <>
                <div style={{fontSize:12.5,color:T.t2,marginBottom:14,lineHeight:1.5}}>{t("mom.sab_kuch_ek_nazar_me_har")} <b>project</b> {t("mom.ke_neeche_theek_lage_to")} <b>{t("mom.approve_create")}</b> {t("mom.karein_warna_back_jaake_edit_karein")}</div>
                {names.map(pn=>(
                  <div key={pn} style={{marginBottom:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,paddingBottom:6,borderBottom:`1px solid ${T.b1}`}}>
                      <span style={{fontSize:12.5,fontWeight:800,color:T.t1}}>{pn}</span>
                      <span style={{fontSize:10,color:T.t4}}>{groups[pn].length} item{groups[pn].length!==1?"s":""}</span>
                    </div>
                    {groups[pn].map(it=>(
                      <div key={it._id} style={{display:"flex",alignItems:"center",gap:9,background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,padding:"8px 11px",marginBottom:6}}>
                        <span style={{fontSize:9,fontWeight:700,color:MM_TYPE[it.type]?.color,background:MM_TYPE[it.type]?.bg,padding:"2px 6px",borderRadius:5,flexShrink:0}}>{MM_TYPE[it.type]?.label}</span>
                        <span style={{flex:1,fontSize:12,color:T.t1,minWidth:0}}>{it.type==="task_update"?(it.task_name||it.title):it.title}{it.type==="mr"&&(it.quantity||it.unit)?<span style={{color:T.t4}}> · {it.quantity} {it.unit}</span>:null}{it.type==="task_update"?<span style={{color:T.t4}}> · {it.status||""}{it.progress>=0?` ${it.progress}%`:""}</span>:null}</span>
                        {it.assignee?<span style={{fontSize:10,color:T.t3,flexShrink:0}}>@ {it.assignee}</span>:null}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            );
          })()}

          {step==="done"&&result&&(()=>{
            const ok=result.refs.filter(r=>r.ok).length, by=tp=>result.refs.filter(r=>r.type===tp&&r.ok).length;
            return(
              <div>
                <div style={{textAlign:"center",padding:"10px 0 16px"}}>
                  <div style={{width:54,height:54,borderRadius:27,background:T.grnL,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}><IcChk size={28} color={T.grn}/></div>
                  <div style={{fontSize:16,fontWeight:700,color:T.t1}}>{t("mom.ok_itemok2_create_ho_gaye", { ok, ok2: ok!==1?"s":"" })}</div>
                  <div style={{fontSize:12,color:T.t3,marginTop:3}}>{(MM_ORDER.filter(tp=>by(tp)>0).map(tp=>`${by(tp)} ${MM_TYPE[tp].label}`).join(" · ")||"0 items")+(result.mom?" · 1 MOM logged":"")}</div>
                </div>
                {result.refs.map((r,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,padding:"9px 12px",marginBottom:7}}>
                    <span style={{fontSize:9.5,fontWeight:700,color:MM_TYPE[r.type].color,background:MM_TYPE[r.type].bg,padding:"3px 7px",borderRadius:5}}>{MM_TYPE[r.type].label}</span>
                    <span style={{flex:1,fontSize:12.5,color:T.t1}}>{r.title}</span>
                    {r.ok?<span style={{fontSize:11,color:T.grn,fontWeight:600}}>{r.ref||"✓"}</span>:<span style={{fontSize:11,color:T.red,fontWeight:600}}>{t("mom.fail")}</span>}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {err&&<div style={{padding:"8px 18px",background:T.redL,borderTop:`1px solid ${T.redM}`,color:T.red,fontSize:12,fontWeight:500,flexShrink:0}}>{err}</div>}

        {/* footer */}
        <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:8,flexShrink:0,alignItems:"center"}}>
          {step==="capture"&&(<>
            <button onClick={onClose} style={btnS}>{t("common.cancel")}</button>
            <div style={{flex:1}}/>
            <button onClick={doExtract} disabled={extracting||!transcript.trim()} style={btnP(!extracting&&!!transcript.trim())}>{extracting?t("mom.ai_soch_rahi_hai"):t("mom.extract_action_items")}</button>
          </>)}
          {step==="review"&&(<>
            <button onClick={()=>setStep("capture")} style={btnS}>{t("common.back_2")}</button>
            <div style={{flex:1}}/>
            <button onClick={goOverview} disabled={!chosenCount} style={btnP(!!chosenCount)}>{`Overview (${chosenCount}) →`}</button>
          </>)}
          {step==="overview"&&(<>
            <button onClick={()=>setStep("review")} style={btnS}>{t("common.back_2")}</button>
            <div style={{flex:1}}/>
            <button onClick={commit} disabled={committing||!chosenCount} style={btnP(!committing&&!!chosenCount)}>{committing?t("common.ban_raha_hai"):`Approve & Create (${chosenCount})`}</button>
          </>)}
          {step==="done"&&result&&(<>
            <button onClick={()=>{const t=mmMinutesText({title:title||(meeting&&meeting.title)||"Meeting",summary:meeting&&meeting.summary},result.refs);window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank");}}
              style={{background:"#25D366",color:"white",border:"none",borderRadius:8,padding:"10px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{t("mom.share_on_whatsapp")}</button>
            <button onClick={()=>{const t=mmMinutesText({title:title||(meeting&&meeting.title)||"Meeting",summary:meeting&&meeting.summary},result.refs);try{navigator.clipboard.writeText(t).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1800);});}catch(e){}}} style={btnS}>{copied?t("mom.copied"):t("mom.copy")}</button>
            <div style={{flex:1}}/>
            <button onClick={onClose} style={btnP(true)}>{t("common.done")}</button>
          </>)}
        </div>
      </div>
    </>
  );
}

// ── AI MEETING DETAIL (analytics + items + audio + transcript + share) ──
function MeetingDetailModal({meeting,onClose}){
  const [status,setStatus]=useState(null);
  const [copied,setCopied]=useState(false);
  useEffect(()=>{
    if(meeting&&meeting.id&&meeting.status==="committed"){
      api.get("/meetings/"+meeting.id+"/status").then(r=>{ if(r&&r.success) setStatus(r.data); }).catch(()=>{});
    }
  },[meeting]);
  if(!meeting) return null;
  const refs=meeting.committed_refs||[];
  const okRefs=refs.filter(r=>r.ok);
  const committed=meeting.status==="committed";
  const share=()=>{ window.open("https://wa.me/?text="+encodeURIComponent(mmMinutesText(meeting,refs)),"_blank"); };
  const copy=()=>{ const t=mmMinutesText(meeting,refs); try{ navigator.clipboard.writeText(t).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),1800); }); }catch(e){} };
  return(
    <>
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(1px)"}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(620px,96vw)",background:T.surface,boxShadow:"-8px 0 40px rgba(0,0,0,0.2)",zIndex:401,display:"flex",flexDirection:"column",animation:"slideIn .2s ease"}}>
        <div style={{background:T.sb,padding:"14px 18px",flexShrink:0,display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:"white",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{meeting.title||t("mom.ai_meeting")}</div>
            <div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:1}}>{fmtDate(meeting.created_at)}{meeting.project_name?" · "+meeting.project_name:""}</div>
          </div>
          <span style={{fontSize:9.5,fontWeight:700,color:committed?"#A7F3D0":"#FDE68A",background:"rgba(255,255,255,0.1)",padding:"3px 9px",borderRadius:6}}>{committed?t("mom.committed"):t("mom.review")}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4}}><IcX size={18} color="rgba(255,255,255,0.7)"/></button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
          {meeting.summary?(
            <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:9,padding:"10px 13px",marginBottom:14}}>
              <div style={{fontSize:9.5,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{t("mom.ai_summary")}</div>
              <div style={{fontSize:12.5,color:T.t2,lineHeight:1.5}}>{meeting.summary}</div>
            </div>
          ):null}
          {committed&&okRefs.length>0&&(
            <>
              <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,padding:"12px 14px",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:11,fontWeight:700,color:T.t1}}>{t("mom.action_items_progress")}</span>
                  <span style={{fontSize:11,fontWeight:700,color:T.grn}}>{status?`${status.done}/${status.total} done`:"…"}</span>
                </div>
                <div style={{height:7,background:T.surfaceB,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:status&&status.total?Math.round(status.done/status.total*100)+"%":"0%",background:T.grn,transition:"width .3s"}}/></div>
              </div>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <button onClick={share} style={{flex:1,background:"#25D366",color:"white",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{t("mom.share_on_whatsapp")}</button>
                <button onClick={copy} style={{background:T.surface,border:`1px solid ${T.b1}`,color:T.t2,borderRadius:8,padding:"10px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{copied?t("mom.copied"):t("mom.copy")}</button>
              </div>
              <div style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>{t("mom.created_okrefs", { okRefs: okRefs.length })}</div>
              {refs.map((r,i)=>{
                const st=status&&status.items?status.items[i]:null;
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,padding:"9px 12px",marginBottom:7}}>
                    <span style={{fontSize:9,fontWeight:700,color:MM_TYPE[r.type]?.color,background:MM_TYPE[r.type]?.bg,padding:"2px 7px",borderRadius:5}}>{MM_TYPE[r.type]?.label}</span>
                    <span style={{flex:1,fontSize:12.5,color:T.t1}}>{r.title}</span>
                    {st?<span style={{fontSize:10,fontWeight:700,color:st.done?T.grn:T.amb,background:st.done?T.grnL:T.ambL,padding:"3px 8px",borderRadius:6}}>{st.status}</span>:(r.ok?<span style={{fontSize:11,color:T.grn,fontWeight:600}}>{r.ref||"✓"}</span>:<span style={{fontSize:11,color:T.red}}>{t("mom.fail")}</span>)}
                  </div>
                );
              })}
            </>
          )}
          {!committed&&<div style={{fontSize:12,color:T.t4,marginBottom:14}}>{t("mom.ye_meeting_abhi_review_me_hai")}</div>}
          {meeting.audio_url?(
            <div style={{marginTop:8,marginBottom:14}}>
              <div style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>{t("mom.recording_2")}</div>
              <audio src={meeting.audio_url} controls style={{width:"100%",height:34}}/>
            </div>
          ):null}
          <div style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6,marginTop:8}}>{t("mom.transcript")}</div>
          <div style={{background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:9,padding:"11px 13px",fontSize:12,color:T.t3,lineHeight:1.55,whiteSpace:"pre-wrap"}}>{meeting.transcript||"—"}</div>
          <div style={{height:16}}/>
        </div>
      </div>
    </>
  );
}

// ── MAIN MOM MODULE ────────────────────────────────────────────
function MOMModule({projectId=null,projectName="",embedded=false}={}){
  const [moms,setMoms]=useState(INIT_MOMS);
  const [selMOM,setSelMOM]=useState(null);
  const [showCreate,setShowCreate]=useState(false);
  const [showMeetingMode,setShowMeetingMode]=useState(false);
  const [search,setSearch]=useState("");
  const [fSite,setFSite]=useState("All");
  const [fType,setFType]=useState("All");
  const [view,setView]=useState("cards"); // cards | actions | meetings
  const [meetings,setMeetings]=useState([]);   // AI Meeting Mode records
  const [selMeeting,setSelMeeting]=useState(null);

  // Project-scoped mode: filter to a single project on the server.
  // Otherwise companywide list.
  const projectScoped = !!projectId;
  const loadMeetings=()=>{
    api.get("/meetings"+(projectScoped?`?project_id=${projectId}`:"")).then(r=>{
      if(r&&r.success&&Array.isArray(r.data)) setMeetings(r.data);
    }).catch(()=>{});
  };
  useEffect(()=>{
    const url = projectScoped ? `/mom?project_id=${projectId}` : "/mom";
    api.get(url).then(r=>{
      if(r.success && Array.isArray(r.data)) setMoms(r.data);
    }).catch(()=>{});
    loadMeetings();
  },[projectId, projectScoped]);

  const sites=useMemo(()=>[...new Set(moms.map(m=>m.site).filter(Boolean))],[moms]);

  const filtered=useMemo(()=>moms.filter(m=>{
    if(fSite!=="All"&&m.site!==fSite) return false;
    if(fType!=="All"&&m.type!==fType) return false;
    if(search&&!m.title.toLowerCase().includes(search.toLowerCase())&&!m.conductedBy.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[moms,fSite,fType,search]);

  const updateMOM=(id,update)=>{
    setMoms(p=>p.map(m=>m.id===id?{...m,...update}:m));
    if(selMOM?.id===id) setSelMOM(p=>({...p,...update}));
  };

  // All pending actions across all MOMs
  const allPendingActions=moms.flatMap(m=>
    m.actionItems.filter(a=>a.status!=="Done").map(a=>({...a,momId:m.id,momTitle:m.title,momDate:m.date}))
  );
  const overdueActions=allPendingActions.filter(a=>a.dueDate&&a.dueDate<TODAY);

  const totalMOMs=moms.length;
  const pendingActionsCount=allPendingActions.length;

  const TILES=[
    {l:t("mom.total_moms"),v:totalMOMs,sub:t("mom.length_this_month", { length: moms.filter(m=>m.date>=TODAY.slice(0,7)+"-01").length }),c:T.blu},
    {l:t("app.pending_actions"),v:pendingActionsCount,sub:t("mom.across_all_meetings"),c:pendingActionsCount>0?T.amb:T.grn},
    {l:t("mom.overdue_actions"),v:overdueActions.length,sub:t("mom.past_due_date"),c:overdueActions.length>0?T.red:T.grn},
    {l:t("mom.sites_covered"),v:new Set(moms.map(m=>m.site)).size,sub:t("mom.active_project_meetings"),c:T.pur},
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

      {/* Toolbar */}
      <div style={{margin:"0 18px",flexShrink:0}}>
        <div style={{background:T.sb,borderRadius:10,padding:"0 10px",display:"flex",alignItems:"center",gap:6,boxShadow:"0 2px 10px rgba(0,0,0,0.2)"}}>
          {/* View toggle */}
          {[{id:"cards",l:t("mom.all_moms"),I:IcMOM},{id:"actions",l:t("mom.action_tracker"),I:IcAction},{id:"meetings",l:t("mom.ai_meetings"),I:(p)=><Ic {...p} d={MIC_PATH}/>}].map(v=>{
            const ViewIcon=v.I;
            return(
            <button key={v.id} onClick={()=>setView(v.id)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"10px 12px",border:"none",background:"none",fontSize:12.5,fontWeight:view===v.id?600:400,color:view===v.id?"white":"rgba(255,255,255,0.45)",cursor:"pointer",borderBottom:view===v.id?"2px solid #2563EB":"2px solid transparent",transition:"all .15s",whiteSpace:"nowrap"}}>
              <ViewIcon size={13} color="currentColor"/> {v.l}
              {v.id==="actions"&&pendingActionsCount>0&&<span style={{background:T.amb,color:"white",fontSize:9,fontWeight:800,padding:"0 5px",borderRadius:10}}>{pendingActionsCount}</span>}
              {v.id==="meetings"&&meetings.filter(m=>m.status!=="committed").length>0&&<span style={{background:T.pur,color:"white",fontSize:9,fontWeight:800,padding:"0 5px",borderRadius:10}}>{meetings.filter(m=>m.status!=="committed").length}</span>}
            </button>
          );})}
          <div style={{flex:1}}/>
          {/* Search */}
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={12} color="rgba(255,255,255,0.3)"/></span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("mom.search_meetings")}
              style={{height:28,padding:"0 8px 0 24px",borderRadius:6,border:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.1)",fontSize:12,color:"white",outline:"none",width:150,boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          {/* Filters */}
          <select value={fSite} onChange={e=>setFSite(e.target.value)}
            style={{height:28,padding:"0 8px",borderRadius:6,border:`1px solid ${fSite!=="All"?"rgba(251,191,36,0.5)":"rgba(255,255,255,0.18)"}`,background:fSite!=="All"?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.07)",color:fSite!=="All"?"#FDE68A":"rgba(255,255,255,0.7)",fontSize:11.5,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
            <option value="All">{t("common.all_sites")}</option>
            {sites.map(s=><option key={s} style={{color:T.t1,background:T.surface}}>{s}</option>)}
          </select>
          <select value={fType} onChange={e=>setFType(e.target.value)}
            style={{height:28,padding:"0 8px",borderRadius:6,border:`1px solid ${fType!=="All"?"rgba(251,191,36,0.5)":"rgba(255,255,255,0.18)"}`,background:fType!=="All"?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.07)",color:fType!=="All"?"#FDE68A":"rgba(255,255,255,0.7)",fontSize:11.5,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
            <option value="All">{t("common.all_types")}</option>
            {MEETING_TYPES.map(t=><option key={t} style={{color:T.t1,background:T.surface}}>{t}</option>)}
          </select>
          {/* Export */}
          <ExportMenu
            filename="moms"
            title={t("app.minutes_of_meeting")}
            columns={[
              {key:"id",label:"ID"},
              {key:"title",label:t("common.title_2")},
              {key:"type",label:t("common.type")},
              {key:"site",label:t("mom.site_project")},
              {key:"date",label:t("common.date")},
              {key:"time",label:t("mom.time")},
              {key:"venue",label:t("mom.venue")},
              {key:"conductedBy",label:t("mom.conducted_by")},
              {key:"attendees",label:t("mom.attendees"),get:r=>Array.isArray(r.attendees)?r.attendees.join(", "):(r.attendees||"")},
              {key:"agenda",label:t("mom.agenda")},
              {key:"discussion",label:t("mom.discussion"),get:r=>Array.isArray(r.discussion)?r.discussion.map(d=>d.point||d).join(" | "):(r.discussion||"")},
              {key:"actionItems",label:t("mom.action_items"),get:r=>Array.isArray(r.actionItems)?r.actionItems.map(a=>`${a.task||""}${a.assignee?` (@${a.assignee})`:""}${a.dueDate?` due ${a.dueDate}`:""}`).join(" | "):""},
              {key:"status",label:t("common.status")},
            ]}
            rows={filtered}
          />
          {/* Meeting Mode (AI) */}
          <button onClick={()=>setShowMeetingMode(true)} title={t("mom.ai_record_meeting_auto_action_items")}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:T.pur,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>
            <Ic d={MIC_PATH} size={13} color="white"/> {t("mom.meeting_mode")}
          </button>
          {/* New MOM */}
          <button onClick={()=>setShowCreate(true)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:6,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcAdd size={13} color="white"/> {t("mom.new_mom")}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 18px 16px"}}>

        {/* CARDS VIEW */}
        {view==="cards"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
            {filtered.map(mom=>(
              <MOMCard key={mom.id} mom={mom} onOpen={setSelMOM} onUpdate={updateMOM}/>
            ))}
            {filtered.length===0&&<div style={{gridColumn:"1/-1",padding:"60px",textAlign:"center",color:T.t4,fontSize:13}}>{t("mom.no_meetings_found")}</div>}
          </div>
        )}

        {/* ACTION TRACKER VIEW */}
        {view==="actions"&&(
          <div>
            {overdueActions.length>0&&<div style={{padding:"9px 13px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:7,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
              <IcAlert size={13} color={T.red}/>
              <span style={{fontSize:12,fontWeight:700,color:T.red}}>{t("mom.overdueactions_action_items_are_overdue", { overdueActions: overdueActions.length })}</span>
            </div>}
            <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 120px 110px 110px 100px 90px",padding:"7px 14px",background:T.sb}}>
                {["Action Item","MOM","Assigned To","Due Date","Priority","Status"].map((h,i)=>(
                  <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
                ))}
              </div>
              {allPendingActions.map((a,i)=>{
                const isOver=a.dueDate&&a.dueDate<TODAY;
                const PM={"High":{c:T.red,bg:T.redL,brd:T.redM},"Medium":{c:T.amb,bg:T.ambL,brd:T.ambM},"Low":{c:T.slt,bg:T.sltL,brd:T.b2}};
                const pm=PM[a.priority]||PM["Medium"];
                const statusC={"In Progress":{c:T.blu,bg:T.bluL,brd:T.bluM},"Pending":{c:T.amb,bg:T.ambL,brd:T.ambM}};
                const sc=statusC[a.status]||statusC["Pending"];
                return(
                  <div key={i} onClick={()=>setSelMOM(moms.find(m=>m.id===a.momId))}
                    style={{display:"grid",gridTemplateColumns:"1fr 120px 110px 110px 100px 90px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",background:i%2===0?"transparent":T.surfaceB,borderLeft:`3px solid ${isOver?T.red:T.amb}44`,transition:"background .1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.sltL}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":T.surfaceB}>
                    <div>
                      <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{a.task}</div>
                      <div style={{fontSize:10,color:T.t4,marginTop:1}}>{a.momTitle?.slice(0,35)}...</div>
                    </div>
                    <span style={{fontSize:10.5,fontFamily:"monospace",color:T.blu}}>{a.momId}</span>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <Avatar name={a.assignee} size={18} color={AVATAR_COLORS[a.assignee]||T.slt}/>
                      <span style={{fontSize:11,color:T.t3}}>{a.assignee.split(" ")[0]}</span>
                    </div>
                    <span style={{fontSize:11.5,fontWeight:isOver?700:400,color:isOver?T.red:T.t3}}>{isOver?"⚠ ":""}{fmtShort(a.dueDate)}</span>
                    <Pill label={a.priority} c={pm.c} bg={pm.bg} brd={pm.brd}/>
                    <Pill label={a.status} c={sc.c} bg={sc.bg} brd={sc.brd}/>
                  </div>
                );
              })}
              {allPendingActions.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4,fontSize:13}}>{t("mom.all_action_items_completed")}</div>}
            </div>
          </div>
        )}
        {/* AI MEETINGS VIEW */}
        {view==="meetings"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
            {meetings.map(mt=>{
              const made=(mt.committed_refs||[]).filter(r=>r.ok).length, n=(mt.items||[]).length, committed=mt.status==="committed";
              return(
                <div key={mt.id} onClick={()=>setSelMeeting(mt)} style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:"13px 15px",cursor:"pointer",borderLeft:`3px solid ${committed?T.grn:T.amb}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
                    <div style={{width:30,height:30,borderRadius:8,background:committed?T.grnL:T.purL,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic d={MIC_PATH} size={15} color={committed?T.grn:T.pur}/></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{mt.title||(mt.summary?mt.summary.slice(0,38):"Meeting #"+mt.id)}</div>
                      <div style={{fontSize:10.5,color:T.t4}}>{fmtDate(mt.created_at)}{mt.project_name?" · "+mt.project_name:""}</div>
                    </div>
                  </div>
                  {mt.summary&&<div style={{fontSize:11.5,color:T.t3,lineHeight:1.45,marginBottom:8,maxHeight:33,overflow:"hidden"}}>{mt.summary}</div>}
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    {committed?<span style={{fontSize:9.5,fontWeight:700,color:T.grn,background:T.grnL,padding:"3px 8px",borderRadius:6}}>{made} created</span>:<span style={{fontSize:9.5,fontWeight:700,color:T.amb,background:T.ambL,padding:"3px 8px",borderRadius:6}}>{t("mom.n_to_review", { n })}</span>}
                    {mt.audio_url&&<span style={{fontSize:9.5,color:T.t4}}>{t("mom.audio")}</span>}
                  </div>
                </div>
              );
            })}
            {meetings.length===0&&<div style={{gridColumn:"1/-1",padding:"50px",textAlign:"center",color:T.t4,fontSize:13}}>{t("mom.abhi_koi_ai_meeting_nahi_toolbar")} <b>{t("mom.meeting_mode")}</b> {t("mom.se_shuru_karein")}</div>}
          </div>
        )}
      </div>

      {/* Modals */}
      {selMeeting&&<MeetingDetailModal meeting={selMeeting} onClose={()=>setSelMeeting(null)}/>}
      {selMOM&&<MOMDetailDrawer mom={selMOM} onClose={()=>setSelMOM(null)} onUpdate={updateMOM}/>}
      {showCreate&&<CreateMOMModal projectId={projectId} projectName={projectName} onClose={()=>setShowCreate(false)} onSave={mom=>setMoms(p=>[mom,...p])}/>}
      {showMeetingMode&&<MeetingModeModal projectId={projectId} projectName={projectName} onClose={()=>{setShowMeetingMode(false); loadMeetings();}} onComplete={mom=>{setMoms(p=>[mom,...p]); loadMeetings();}}/>}

      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:10px}
        select,input,textarea{font-family:'Segoe UI',system-ui,sans-serif}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes mmpulse{0%,100%{opacity:1}50%{opacity:.3}}
      `}</style>
    </div>
  );
}

export default MOMModule;
