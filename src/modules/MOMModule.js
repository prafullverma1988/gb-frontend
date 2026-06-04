import { useState, useMemo, useEffect, useRef } from "react";
import api from "../config/api";
import SearchSelect from "../components/SearchSelect";
import ExportMenu from "../components/DataExport";

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
    {id:"dashboard",l:"Dashboard",I:IcHome},
    {id:"projects",l:"Projects",I:IcProj},
    {id:"crm",l:"CRM",I:IcCRM},
    {id:"tasks",l:"Tasks",I:IcTask},
    {id:"team",l:"Team",I:IcTeam},
  ]},
  {sec:"FINANCE & OPS",items:[
    {id:"finance",l:"Finance",I:IcFin},
    {id:"procurement",l:"Procurement",I:IcProc},
    {id:"warehouse",l:"Warehouse",I:IcWH},
    {id:"payroll",l:"Payroll",I:IcPay},
  ]},
  {sec:"MORE",items:[
    {id:"mom",l:"MOM",I:IcMOM},
    {id:"reports",l:"Reports",I:IcRep},
    {id:"settings",l:"Settings",I:IcSet},
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
          <span style={{fontSize:10.5,color:T.t3}}>Action Items</span>
          <span style={{fontSize:10.5,fontWeight:600,color:pct===100?T.grn:overdueActions>0?T.amb:T.t3}}>{doneActions}/{totalActions} done</span>
        </div>
        <div style={{height:4,background:T.b1,borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:pct===100?T.grn:overdueActions>0?T.amb:T.blu,borderRadius:4,transition:"width .5s"}}/>
        </div>
      </div>
      {/* Footer */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8,borderTop:`1px solid ${T.b1}`}}>
        <span style={{fontSize:10.5,color:T.t4}}>By {mom.conductedBy}</span>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {overdueActions>0&&<Pill label={`${overdueActions} overdue`} c={T.amb} bg={T.ambL} brd={T.ambM}/>}
          {mom.sharedWith.length>0&&<span style={{fontSize:10,color:T.grn,display:"flex",alignItems:"center",gap:3}}><IcShare size={10} color={T.grn}/>Shared</span>}
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

  const TABS=[{id:"details",l:"Details"},{id:"discussion",l:"Discussion"},{id:"actions",l:`Actions (${pendingCount} pending)`},{id:"next",l:"Next Meeting"}];

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
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
              <span>By {mom.conductedBy}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:5,flexShrink:0}}>
            <button onClick={printMOM} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 10px",borderRadius:6,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",color:"white",fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
              <IcPrint size={12} color="white"/> Print
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
              {[{l:"Date",v:fmtDate(mom.date)},{l:"Time",v:mom.time},{l:"Venue",v:mom.venue},{l:"Site / Project",v:mom.site},{l:"Conducted By",v:mom.conductedBy},{l:"Meeting Type",v:mom.type}].map(({l,v})=>(
                <div key={l} style={{padding:"9px 11px",background:T.surface,borderRadius:7,border:`1px solid ${T.b1}`}}>
                  <div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{l}</div>
                  <div style={{fontSize:12.5,fontWeight:500,color:T.t1}}>{v}</div>
                </div>
              ))}
            </div>
            {/* Agenda */}
            <div style={{padding:"11px 13px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:8,marginBottom:12}}>
              <div style={{fontSize:10.5,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Agenda</div>
              <pre style={{fontSize:12.5,color:T.t2,lineHeight:1.7,margin:0,fontFamily:"'Segoe UI',sans-serif",whiteSpace:"pre-wrap"}}>{mom.agenda}</pre>
            </div>
            {/* Notes */}
            {mom.notes&&<div style={{padding:"11px 13px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:8}}>
              <div style={{fontSize:10.5,fontWeight:700,color:T.amb,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>Notes</div>
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
              {[{l:"Total",v:actions.length,c:T.blu},{l:"Done",v:actions.filter(a=>a.status==="Done").length,c:T.grn},{l:"Pending",v:actions.filter(a=>a.status!=="Done").length,c:T.amb}].map((s,i)=>(
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
              <div style={{fontSize:11,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>Next Meeting Scheduled</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div style={{background:"white",padding:"9px 11px",borderRadius:7,border:`1px solid ${T.bluM}`}}>
                  <div style={{fontSize:9.5,color:T.t4,marginBottom:2}}>Date</div>
                  <div style={{fontSize:14,fontWeight:700,color:T.blu}}>{fmtDate(mom.nextMeeting.date)}</div>
                </div>
                <div style={{background:"white",padding:"9px 11px",borderRadius:7,border:`1px solid ${T.bluM}`}}>
                  <div style={{fontSize:9.5,color:T.t4,marginBottom:2}}>Time</div>
                  <div style={{fontSize:14,fontWeight:700,color:T.blu}}>{mom.nextMeeting.time}</div>
                </div>
              </div>
              <div style={{marginTop:9,padding:"9px 11px",background:"white",borderRadius:7,border:`1px solid ${T.bluM}`}}>
                <div style={{fontSize:9.5,color:T.t4,marginBottom:2}}>Agenda</div>
                <div style={{fontSize:12.5,color:T.t2}}>{mom.nextMeeting.agenda}</div>
              </div>
            </div>
            {/* Pending action items to carry forward */}
            {actions.filter(a=>a.status!=="Done").length>0&&(
              <div style={{padding:"11px 13px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:8}}>
                <div style={{fontSize:11,fontWeight:700,color:T.amb,marginBottom:7}}>Carry Forward Actions ({actions.filter(a=>a.status!=="Done").length})</div>
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
function CreateMOMModal({onClose,onSave}){
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
    title:"",type:"Site Review",site:"",venue:"",
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
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(600px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{background:T.sb,padding:"13px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>Create New MOM</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
        </div>
        {/* Steps */}
        <div style={{display:"flex",gap:4}}>
          {[{n:1,l:"Meeting Details"},{n:2,l:"Discussion Points"},{n:3,l:"Action Items"}].map((s,i)=>(
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
              <label style={labelStyle}>Meeting Title *</label>
              <input value={form.title} onChange={upd("title")} placeholder="e.g. Site Review — GF Slab Progress" style={inputStyle} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><label style={labelStyle}>Meeting Type</label>
                <SearchSelect value={form.type} options={MEETING_TYPES} onChange={v=>setForm(p=>({...p,type:v}))} placeholder="Select meeting type..."/>
              </div>
              <div><label style={labelStyle}>Site / Project</label>
                <SearchSelect value={form.site} options={sites} onChange={v=>setForm(p=>({...p,site:v}))} placeholder={sites.length?"Select project...":"Loading projects..."}/>
              </div>
              <div><label style={labelStyle}>Date</label>
                <input type="date" value={form.date} onChange={upd("date")} style={inputStyle}/>
              </div>
              <div><label style={labelStyle}>Time</label>
                <input value={form.time} onChange={upd("time")} placeholder="10:30 AM" style={inputStyle}/>
              </div>
              <div style={{gridColumn:"span 2"}}><label style={labelStyle}>Venue / Location</label>
                <input value={form.venue} onChange={upd("venue")} placeholder="Site office, Head office, client location..." style={inputStyle}/>
              </div>
              <div><label style={labelStyle}>Conducted By</label>
                <SearchSelect value={form.conductedBy} options={team} onChange={v=>setForm(p=>({...p,conductedBy:v}))} placeholder={team.length?"Select user...":"Loading users..."}/>
              </div>
            </div>
            {/* Attendees */}
            <div style={{marginBottom:10}}>
              <label style={labelStyle}>Attendees</label>
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
                {team.length===0 && <span style={{fontSize:11,color:T.t4,fontStyle:"italic",padding:"5px 0"}}>Loading users...</span>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <input value={attendeeInput} onChange={e=>setAttendeeInput(e.target.value)} placeholder="Add custom attendee name..." style={{...inputStyle,flex:1}} onKeyDown={e=>e.key==="Enter"&&addCustomAttendee()}/>
                <button onClick={addCustomAttendee} style={{padding:"0 12px",borderRadius:7,background:T.blu,color:"white",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>Add</button>
              </div>
            </div>
            {/* Agenda */}
            <div style={{marginBottom:10}}>
              <label style={labelStyle}>Agenda</label>
              <textarea value={form.agenda} onChange={upd("agenda")} rows={3} placeholder={"1. Topic one\n2. Topic two\n3. Any other matter"}
                style={{...inputStyle,resize:"vertical"}} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
          </div>
        )}

        {/* STEP 2 — Discussion Points */}
        {step===2&&(
          <div>
            <div style={{fontSize:12,color:T.t3,marginBottom:12}}>Record key points discussed during the meeting:</div>
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
                {discussion.length>1&&<button onClick={()=>removeDiscussion(i)} title="Remove point"
                  style={{background:"none",border:"none",cursor:"pointer",color:T.t4,marginTop:8,display:"flex",padding:4,borderRadius:4,transition:"background .12s"}}
                  onMouseEnter={el=>{el.currentTarget.style.background=T.redL;el.currentTarget.style.color=T.red;}}
                  onMouseLeave={el=>{el.currentTarget.style.background="none";el.currentTarget.style.color=T.t4;}}><IcX size={13}/></button>}
              </div>
            ))}
            <button onClick={addDiscussion} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",borderRadius:7,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:12,fontWeight:600,cursor:"pointer",marginTop:4}}>
              <IcAdd size={13} color={T.blu}/> Add Discussion Point
            </button>
          </div>
        )}

        {/* STEP 3 — Action Items */}
        {step===3&&(
          <div>
            <div style={{fontSize:12,color:T.t3,marginBottom:12}}>Define action items with owners and deadlines:</div>
            {actions.map((a,i)=>(
              <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,padding:"11px 12px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                  <span style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px"}}>Action {i+1}</span>
                  {actions.length>1&&<button onClick={()=>removeAction(i)} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,display:"flex"}}><IcX size={12}/></button>}
                </div>
                <div style={{marginBottom:7}}>
                  <input ref={el=>{if(el) actionRefs.current[i]=el;}}
                    value={a.task} onChange={e=>updAction(i,"task",e.target.value)} placeholder="What needs to be done?"
                    style={{...inputStyle}}
                    onFocus={e=>e.target.style.borderColor=T.blu}
                    onBlur={e=>e.target.style.borderColor=T.b1}
                    onKeyDown={e=>{ if(e.key==="Enter" && i===actions.length-1){ e.preventDefault(); addAction(); } }}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  <div><label style={labelStyle}>Assign To</label>
                    <SearchSelect value={a.assignee} options={team} onChange={v=>updAction(i,"assignee",v)} placeholder={team.length?"Select user...":"Loading..."}/>
                  </div>
                  <div><label style={labelStyle}>Due Date</label>
                    <input type="date" value={a.dueDate} onChange={e=>updAction(i,"dueDate",e.target.value)} style={{...inputStyle}}/>
                  </div>
                  <div><label style={labelStyle}>Priority</label>
                    <SearchSelect value={a.priority} options={["High","Medium","Low"]} onChange={v=>updAction(i,"priority",v)} placeholder="Priority"/>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addAction} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",borderRadius:7,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:12,fontWeight:600,cursor:"pointer",marginTop:4}}>
              <IcAdd size={13} color={T.grn}/> Add Action Item
            </button>
            {/* Next meeting */}
            <div style={{marginTop:14,padding:"12px 14px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:8}}>
              <div style={{fontSize:11,fontWeight:700,color:T.blu,marginBottom:8}}>Next Meeting (optional)</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div><label style={labelStyle}>Date</label><input type="date" value={form.nextMeetingDate} onChange={upd("nextMeetingDate")} style={inputStyle}/></div>
                <div><label style={labelStyle}>Time</label><input value={form.nextMeetingTime} onChange={upd("nextMeetingTime")} placeholder="11:00 AM" style={inputStyle}/></div>
                <div style={{gridColumn:"span 2"}}><label style={labelStyle}>Agenda Preview</label><input value={form.nextMeetingAgenda} onChange={upd("nextMeetingAgenda")} placeholder="What will be discussed..." style={inputStyle}/></div>
              </div>
            </div>
            {/* Notes */}
            <div style={{marginTop:10}}>
              <label style={labelStyle}>Additional Notes</label>
              <textarea value={form.notes} onChange={upd("notes")} rows={2} placeholder="Any other important notes, decisions, or remarks..."
                style={{...inputStyle,resize:"vertical"}}/>
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:8,flexShrink:0}}>
        {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"10px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>← Back</button>}
        {step<3&&<button onClick={()=>setStep(s=>s+1)} disabled={step===1&&!form.title.trim()}
          style={{flex:2,padding:"10px",borderRadius:7,background:step===1&&!form.title.trim()?T.b1:T.blu,color:step===1&&!form.title.trim()?T.t4:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:step===1&&!form.title.trim()?"not-allowed":"pointer"}}>
          Next →
        </button>}
        {step===3&&<>
          {saveErr&&<div style={{flex:"1 1 100%",order:-1,padding:"6px 10px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:6,fontSize:11,color:T.red,marginBottom:4}}>{saveErr}</div>}
          <button onClick={save} disabled={saving}
            style={{flex:2,padding:"10px",borderRadius:7,background:saving?T.grn+"99":T.grn,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            {saving?<span style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"white",borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/>:<IcChk size={14} color="white"/>}
            {saving?"Saving…":"Save MOM"}
          </button>
        </>}
      </div>
    </div>
  </>);
}

// ── MAIN MOM MODULE ────────────────────────────────────────────
function MOMModule(){
  const [moms,setMoms]=useState(INIT_MOMS);
  const [selMOM,setSelMOM]=useState(null);
  const [showCreate,setShowCreate]=useState(false);
  const [search,setSearch]=useState("");
  const [fSite,setFSite]=useState("All");
  const [fType,setFType]=useState("All");
  const [view,setView]=useState("cards"); // cards | actions

  useEffect(()=>{
    api.get("/mom").then(r=>{
      if(r.success && Array.isArray(r.data)) setMoms(r.data);
    }).catch(()=>{});
  },[]);

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
    {l:"Total MOMs",v:totalMOMs,sub:`${moms.filter(m=>m.date>=TODAY.slice(0,7)+"-01").length} this month`,c:T.blu},
    {l:"Pending Actions",v:pendingActionsCount,sub:"Across all meetings",c:pendingActionsCount>0?T.amb:T.grn},
    {l:"Overdue Actions",v:overdueActions.length,sub:"Past due date",c:overdueActions.length>0?T.red:T.grn},
    {l:"Sites Covered",v:new Set(moms.map(m=>m.site)).size,sub:"Active project meetings",c:T.pur},
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
          {[{id:"cards",l:"All MOMs",I:IcMOM},{id:"actions",l:"Action Tracker",I:IcAction}].map(v=>{
            const ViewIcon=v.I;
            return(
            <button key={v.id} onClick={()=>setView(v.id)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"10px 12px",border:"none",background:"none",fontSize:12.5,fontWeight:view===v.id?600:400,color:view===v.id?"white":"rgba(255,255,255,0.45)",cursor:"pointer",borderBottom:view===v.id?"2px solid #2563EB":"2px solid transparent",transition:"all .15s",whiteSpace:"nowrap"}}>
              <ViewIcon size={13} color="currentColor"/> {v.l}
              {v.id==="actions"&&pendingActionsCount>0&&<span style={{background:T.amb,color:"white",fontSize:9,fontWeight:800,padding:"0 5px",borderRadius:10}}>{pendingActionsCount}</span>}
            </button>
          );})}
          <div style={{flex:1}}/>
          {/* Search */}
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={12} color="rgba(255,255,255,0.3)"/></span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search meetings..."
              style={{height:28,padding:"0 8px 0 24px",borderRadius:6,border:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.1)",fontSize:12,color:"white",outline:"none",width:150,boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          {/* Filters */}
          <select value={fSite} onChange={e=>setFSite(e.target.value)}
            style={{height:28,padding:"0 8px",borderRadius:6,border:`1px solid ${fSite!=="All"?"rgba(251,191,36,0.5)":"rgba(255,255,255,0.18)"}`,background:fSite!=="All"?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.07)",color:fSite!=="All"?"#FDE68A":"rgba(255,255,255,0.7)",fontSize:11.5,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
            <option value="All">All Sites</option>
            {sites.map(s=><option key={s} style={{color:T.t1,background:T.surface}}>{s}</option>)}
          </select>
          <select value={fType} onChange={e=>setFType(e.target.value)}
            style={{height:28,padding:"0 8px",borderRadius:6,border:`1px solid ${fType!=="All"?"rgba(251,191,36,0.5)":"rgba(255,255,255,0.18)"}`,background:fType!=="All"?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.07)",color:fType!=="All"?"#FDE68A":"rgba(255,255,255,0.7)",fontSize:11.5,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
            <option value="All">All Types</option>
            {MEETING_TYPES.map(t=><option key={t} style={{color:T.t1,background:T.surface}}>{t}</option>)}
          </select>
          {/* Export */}
          <ExportMenu
            filename="moms"
            title="Minutes of Meeting"
            columns={[
              {key:"id",label:"ID"},
              {key:"title",label:"Title"},
              {key:"type",label:"Type"},
              {key:"site",label:"Site / Project"},
              {key:"date",label:"Date"},
              {key:"time",label:"Time"},
              {key:"venue",label:"Venue"},
              {key:"conductedBy",label:"Conducted By"},
              {key:"attendees",label:"Attendees",get:r=>Array.isArray(r.attendees)?r.attendees.join(", "):(r.attendees||"")},
              {key:"agenda",label:"Agenda"},
              {key:"discussion",label:"Discussion",get:r=>Array.isArray(r.discussion)?r.discussion.map(d=>d.point||d).join(" | "):(r.discussion||"")},
              {key:"actionItems",label:"Action Items",get:r=>Array.isArray(r.actionItems)?r.actionItems.map(a=>`${a.task||""}${a.assignee?` (@${a.assignee})`:""}${a.dueDate?` due ${a.dueDate}`:""}`).join(" | "):""},
              {key:"status",label:"Status"},
            ]}
            rows={filtered}
          />
          {/* New MOM */}
          <button onClick={()=>setShowCreate(true)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:6,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcAdd size={13} color="white"/> New MOM
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
            {filtered.length===0&&<div style={{gridColumn:"1/-1",padding:"60px",textAlign:"center",color:T.t4,fontSize:13}}>No meetings found</div>}
          </div>
        )}

        {/* ACTION TRACKER VIEW */}
        {view==="actions"&&(
          <div>
            {overdueActions.length>0&&<div style={{padding:"9px 13px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:7,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
              <IcAlert size={13} color={T.red}/>
              <span style={{fontSize:12,fontWeight:700,color:T.red}}>{overdueActions.length} action items are overdue!</span>
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
              {allPendingActions.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4,fontSize:13}}>All action items completed!</div>}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selMOM&&<MOMDetailDrawer mom={selMOM} onClose={()=>setSelMOM(null)} onUpdate={updateMOM}/>}
      {showCreate&&<CreateMOMModal onClose={()=>setShowCreate(false)} onSave={mom=>setMoms(p=>[mom,...p])}/>}

      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:10px}
        select,input,textarea{font-family:'Segoe UI',system-ui,sans-serif}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

export default MOMModule;
