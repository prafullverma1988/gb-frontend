import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import api, { API_BASE, getToken } from "../config/api";
import SearchSelect from "../components/SearchSelect";
import { Credit } from "../components/Credit";
import LeadDesignDrawer from "../components/LeadDesignDrawer";
import ShareDrawingDrawer from "../components/ShareDrawingDrawer";
import DesignOverviewDrawer from "../components/DesignOverviewDrawer";
import ExportMenu from "../components/DataExport";

// ── ICONS ──────────────────────────────────────────────────────────
const Ic=({d,size=18,color="currentColor",sw=1.8,fill="none"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const IcHome  =(p)=><Ic {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>;
const IcProj  =(p)=><Ic {...p} d="M3 7h18M3 12h18M3 17h18"/>;
const IcCRM   =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a3 3 0 00-3-3M16 3.13a4 4 0 010 7.75"/>;
const IcFin   =(p)=><Ic {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>;
const IcWH    =(p)=><Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/>;
const IcSet   =(p)=><Ic {...p} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcProc  =(p)=><Ic {...p} d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>;
const IcRep   =(p)=><Ic {...p} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>;
const IcTask  =(p)=><Ic {...p} d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>;
const IcMenu  =(p)=><Ic {...p} d="M4 6h16M4 12h16M4 18h16"/>;
const IcBell  =(p)=><Ic {...p} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>;
const IcAdd   =(p)=><Ic {...p} d="M12 5v14M5 12h14"/>;
const IcX     =(p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcChk   =(p)=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcPhone =(p)=><Ic {...p} d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.64A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>;
const IcWA    =(p)=><Ic {...p} fill={p.fill||"none"} d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>;
const IcMail  =(p)=><Ic {...p} d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6"/>;
const IcCal   =(p)=><Ic {...p} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>;
const IcEdit  =(p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcMove  =(p)=><Ic {...p} d="M5 12h14M12 5l7 7-7 7"/>;
const IcRs    =(p)=><Ic {...p} d="M6 3h12M6 8h12M6 13h6M6 18h4"/>;
const IcStar  =(p)=><Ic {...p} fill={p.fill||"none"} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>;
const IcAlert =(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;
const IcSearch=(p)=><Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;
const IcFilter=(p)=><Ic {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>;
const IcDrag  =(p)=><Ic {...p} d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01"/>;
const IcMsgSq =(p)=><Ic {...p} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>;
const IcLoc   =(p)=><Ic {...p} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcEye   =(p)=><Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z"/>;
const IcEyeX  =(p)=><Ic {...p} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>;
const IcPay   =(p)=><Ic {...p} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>;
const IcTeam  =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>;

// ── THEME ────────────────────────────────────────────────────────
const C={p:"#1565C0",a:"#FF6F00",sb:"#0D1B2A",sbH:"#1E2E42",w:"#FFF"};
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
  em:"#059669",  // emerald for converted
  wa:"#25D366",  // WhatsApp green
};
const fmt=(n)=>n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:String(n||0);
const fmtN=(n)=>n==null?"—":Number(n).toLocaleString("en-IN");

// ── PIPELINE STAGES ──────────────────────────────────────────────
const STAGES=[
  {id:"soft_lead",label:"Soft Lead",  color:"#F59E0B", bg:"#FFFBEB", desc:"Engaging with free design plan"},
  {id:"lead",     label:"Lead",       color:"#6366F1", bg:"#EEF2FF", desc:"New enquiry received"},
  {id:"followup", label:"Follow Up",  color:"#0891B2", bg:"#E0F2FE", desc:"Active conversation"},
  {id:"proposal", label:"Proposal",   color:"#D97706", bg:"#FFFBEB", desc:"Quotation sent"},
  {id:"converted",label:"Converted",  color:"#059669", bg:"#ECFDF5", desc:"Deal closed!"},
  {id:"lost",     label:"Lost",       color:"#6B7280", bg:"#F1F5F9", desc:"Not interested"},
  {id:"project",  label:"Converted to Project", color:"#1565C0", bg:"#E3F2FD", desc:"Active project"},
];

const SOURCES=["Direct Call","Reference","Site Visit","Facebook Ad","Instagram","Google","Newspaper","Banner","Just Dial","Builder Fair","Other"];
const PROJ_TYPES=["Residential","Commercial","Industrial","Interior","Renovation","Bungalow","Apartment","Villa","Township","Other"];

// Stages that require city_id + construction_type_id (so the quotation
// builder can match a rate package). Fresh "lead" or "soft_lead" allow
// missing FKs; transitioning to anything in this set forces them.
const NEEDS_RATES_STAGES = new Set(["followup", "proposal", "converted"]);
const stageNeedsRates = (stageId) => NEEDS_RATES_STAGES.has(stageId);
const leadHasRatesInfo = (lead) => !!(lead?.city_id && lead?.construction_type_id);
// ASSIGNED_TO will be fetched from API (/crm/team)

// ── NAV ──────────────────────────────────────────────────────────
const NAV=[
  {sec:null,items:[
    {id:"dashboard",l:"Dashboard",I:IcHome},
    {id:"projects",l:"Projects",I:IcProj},
    {id:"crm",l:"CRM",I:IcCRM,badge:3},
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
    {id:"reports",l:"Reports",I:IcRep},
    {id:"settings",l:"Settings",I:IcSet},
  ]},
];

// ── SHARED ───────────────────────────────────────────────────────
const Pill=({label,c,bg,brd})=>(
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${brd||c+"33"}`,whiteSpace:"nowrap"}}>{label}</span>
);
const PRIO_S={"High":{c:T.red,bg:T.redL,brd:T.redM},"Medium":{c:T.amb,bg:T.ambL,brd:T.ambM},"Low":{c:T.slt,bg:T.sltL,brd:T.b2}};

const daysDiff=(dateStr)=>{
  if(!dateStr) return null;
  return Math.round((new Date(dateStr)-new Date("2026-03-16"))/(1000*86400));
};


// ── CONTACT REMINDER POPUP ───────────────────────────────────────
function ContactReminderPopup({lead,onDismiss,onWhatsApp,onCall}){
  const diff=daysDiff(lead.contactDate);
  const isToday=diff===0;
  const isOverdue=diff<0;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(3px)"}}>
      <div style={{background:T.surface,borderRadius:16,width:420,boxShadow:"0 32px 80px rgba(0,0,0,0.3)",overflow:"hidden",fontFamily:"'Segoe UI',sans-serif",animation:"popIn .3s cubic-bezier(.34,1.56,.64,1)"}}>
        {/* Header */}
        <div style={{background:isOverdue?"#DC2626":isToday?"#D97706":"#0D1B2A",padding:"16px 20px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <IcCal size={22} color="white"/>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:2}}>
              {isOverdue?"OVERDUE — CONTACT NOW":isToday?"TODAY'S FOLLOW UP":"UPCOMING CONTACT"}
            </div>
            <div style={{fontSize:16,fontWeight:700,color:"white"}}>{lead.name}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:1}}>{lead.projType} · ₹{fmt(lead.budget)} · {lead.city}</div>
          </div>
          <button onClick={onDismiss} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
        </div>

        {/* Body */}
        <div style={{padding:"18px 20px"}}>
          {/* Contact date info */}
          <div style={{padding:"10px 13px",background:isOverdue?T.redL:isToday?T.ambL:T.bluL,border:`1px solid ${isOverdue?T.redM:isToday?T.ambM:T.bluM}`,borderRadius:8,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12.5,fontWeight:600,color:isOverdue?T.red:isToday?T.amb:T.blu}}>
              {isOverdue?`${Math.abs(diff)} day${Math.abs(diff)>1?"s":""} overdue`:isToday?"Scheduled for today":`In ${diff} days · ${lead.contactDate}`}
            </span>
            {lead.phone&&<span style={{fontSize:12,color:T.t3,fontFamily:"monospace"}}>{lead.phone}</span>}
          </div>

          {/* Last note */}
          {lead.followupHistory?.length>0&&(
            <div style={{padding:"9px 12px",background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:7,marginBottom:14}}>
              <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>Last note</div>
              <div style={{fontSize:12.5,color:T.t2}}>{lead.followupHistory[lead.followupHistory.length-1].note}</div>
              <div style={{fontSize:10.5,color:T.t4,marginTop:3}}>{lead.followupHistory[lead.followupHistory.length-1].date} · {lead.followupHistory[lead.followupHistory.length-1].by}</div>
            </div>
          )}

          {/* WhatsApp message preview */}
          <div style={{padding:"10px 12px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:8,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <IcWA size={14} color={T.wa}/>
              <span style={{fontSize:10.5,fontWeight:700,color:"#064E3B",textTransform:"uppercase",letterSpacing:".4px"}}>WhatsApp Message Preview</span>
            </div>
            <div style={{fontSize:12,color:"#065F46",lineHeight:1.6,fontStyle:"italic",background:"white",padding:"8px 10px",borderRadius:6,border:"1px solid #A7F3D0"}}>
              "Namaskar {lead.name.split(" ")[0]} ji 🙏 Aapne hmare saath {lead.projType} project ke liye baat ki thi. Kya aaj baat kar sakte hain? "
            </div>
          </div>

          {/* Action buttons */}
          <div style={{display:"flex",gap:8}}>
            <button onClick={onCall}
              style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"11px",borderRadius:9,background:`linear-gradient(135deg,${T.blu},#1d4ed8)`,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",boxShadow:`0 4px 12px ${T.blu}44`}}>
              <IcPhone size={15} color="white"/> Call Now
            </button>
            <button onClick={onWhatsApp}
              style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"11px",borderRadius:9,background:`linear-gradient(135deg,${T.wa},#128C7E)`,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",boxShadow:`0 4px 12px ${T.wa}44`}}>
              <IcWA size={15} color="white"/> WhatsApp
            </button>
            <button onClick={onDismiss}
              style={{flex:1,padding:"11px",borderRadius:9,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:13,fontWeight:600,color:T.t3,cursor:"pointer"}}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes popIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ── WHATSAPP SEND MODAL ──────────────────────────────────────────
function WhatsAppModal({lead,onClose}){
  const templates=[
    {id:"followup",label:"Follow Up",msg:`Namaskar ${lead.name.split(" ")[0]} ji 🙏\n\nAapne hmare saath ${lead.projType} project ke liye baat ki thi. Kya aaj kuch waqt hai baat karne ka?\n\nHum aapki requirements ke anusar best solution denge.\n\n📞 Contact us for details`},
    {id:"proposal",label:"Proposal Sent",msg:`Namaskar ${lead.name.split(" ")[0]} ji 🙏\n\nHumne aapka ${lead.projType} project estimate taiyar kar liya hai.\n\n💰 Estimated Budget: ₹${fmt(lead.budget)}\n\nKripya review karein aur hume apne vichar batayein.\n\nContact us for details`},
    {id:"reminder",label:"Reminder",msg:`Namaskar ${lead.name.split(" ")[0]} ji 🙏\n\nYaad dila dein - aapka ${lead.projType} project ke bare mein baat karna baaki hai.\n\nKya aaj ya kal koi suitable time hai?\n\nThank you`},
    {id:"custom",label:"Custom",msg:""},
  ];
  const [selTpl,setSelTpl]=useState("followup");
  const [msg,setMsg]=useState(templates[0].msg);

  const handleTpl=(id)=>{
    setSelTpl(id);
    const t=templates.find(t=>t.id===id);
    if(t.msg) setMsg(t.msg);
  };

  const sendWhatsApp=()=>{
    const encoded=encodeURIComponent(msg);
    const url=`https://wa.me/91${lead.phone}?text=${encoded}`;
    window.open(url,"_blank");
    onClose();
  };

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(500px,95vw)",maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:501,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{background:"#075E54",padding:"13px 18px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <IcWA size={18} color="white"/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:"white"}}>{lead.name}</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.6)"}}>+91 {lead.phone} · {lead.projType}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",display:"flex"}}><IcX size={14}/></button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        {/* Template selector */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:10.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>Message Template</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {templates.map(t=>(
              <button key={t.id} onClick={()=>handleTpl(t.id)}
                style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${selTpl===t.id?"#075E54":T.b1}`,background:selTpl===t.id?"#ECFDF5":"none",color:selTpl===t.id?"#064E3B":T.t3,fontSize:11.5,fontWeight:selTpl===t.id?700:400,cursor:"pointer"}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message editor — chat bubble style */}
        <div style={{background:"#E5DDD5",borderRadius:10,padding:"12px",marginBottom:12}}>
          <div style={{fontSize:9.5,color:"#6B7280",marginBottom:6}}>Preview · Edit before sending</div>
          <div style={{background:"#DCF8C6",borderRadius:"0 10px 10px 10px",padding:"10px 12px",boxShadow:"0 1px 2px rgba(0,0,0,0.1)"}}>
            <textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={7}
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:12.5,color:"#111",lineHeight:1.6,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
            <div style={{fontSize:10,color:"#6B7280",textAlign:"right",marginTop:4}}>📱 WhatsApp · {msg.length} chars</div>
          </div>
        </div>

        {/* Also send via */}
        <div style={{display:"flex",gap:8,alignItems:"center",padding:"8px 12px",background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:7}}>
          <IcMail size={13} color={T.t4}/>
          <span style={{fontSize:11.5,color:T.t3}}>Also send via Email: <strong style={{color:T.t1}}>{lead.email}</strong></span>
          <button style={{marginLeft:"auto",padding:"3px 9px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>Send Email</button>
        </div>
      </div>

      <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:8,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
        <button onClick={sendWhatsApp}
          style={{flex:2,padding:"10px",borderRadius:8,background:"linear-gradient(135deg,#25D366,#128C7E)",color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
          <IcWA size={15} color="white"/> Send on WhatsApp
        </button>
      </div>
    </div>
  </>);
}

// ── LEAD CARD (Kanban) ───────────────────────────────────────────
function LeadCard({lead,onOpen,onMove,onWhatsApp,onDesign,stages}){
  const diff=daysDiff(lead.contactDate);
  const isOverdue=diff!==null&&diff<0;
  const isToday=diff===0;
  const isDueSoon=diff!==null&&diff>0&&diff<=2;
  const stage=STAGES.find(s=>s.id===lead.stage);
  const ps=PRIO_S[lead.priority]||PRIO_S["Medium"];

  return(
    <div
      draggable
      onClick={()=>onOpen(lead)}
      style={{background:T.surface,borderRadius:10,border:`1.5px solid ${isOverdue?T.redM:isToday?T.ambM:T.b1}`,padding:"12px 13px",cursor:"pointer",transition:"all .15s",marginBottom:8,boxShadow:isOverdue?"0 2px 8px rgba(220,38,38,0.1)":isToday?"0 2px 8px rgba(217,119,6,0.1)":"0 1px 3px rgba(0,0,0,0.05)",borderLeft:`3px solid ${stage?.color||T.slt}`}}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
      onMouseLeave={e=>e.currentTarget.style.transform="none"}>

      {/* Top row */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
            {lead._type==="solar"&&<span style={{fontSize:9,fontWeight:800,color:"#E65100",background:"#FFF3E0",border:"1px solid #FFD54F",borderRadius:3,padding:"1px 5px",flexShrink:0}}>☀ Solar</span>}
            <div style={{fontSize:13,fontWeight:700,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.name}</div>
          </div>
          <div style={{fontSize:11,color:T.t4,display:"flex",alignItems:"center",gap:4}}>
            <IcLoc size={10} color={T.t4}/>{lead.city}
          </div>
        </div>
        <Pill label={lead.priority} c={ps.c} bg={ps.bg} brd={ps.brd}/>
      </div>

      {/* Project + Budget */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:11.5,color:T.t3}}>{lead.projType}</span>
        <span style={{fontSize:13,fontWeight:700,color:T.blu}}>₹{fmt(lead.budget)}</span>
      </div>

      {/* Source + Assigned */}
      <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
        <span style={{fontSize:10.5,background:T.sltL,color:T.slt,padding:"2px 7px",borderRadius:20,border:`1px solid ${T.b2}`}}>{lead.source}</span>
        <span style={{fontSize:10.5,background:T.purL,color:T.pur,padding:"2px 7px",borderRadius:20,border:`1px solid ${T.purM}`}}>{lead.assignedTo}</span>
        {lead.tags?.map(tg=><span key={tg} style={{fontSize:10.5,background:T.ambL,color:T.amb,padding:"2px 7px",borderRadius:20,border:`1px solid ${T.ambM}`}}>{tg}</span>)}
      </div>

      {/* Contact date */}
      {lead.contactDate&&(
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 9px",background:isOverdue?T.redL:isToday?T.ambL:isDueSoon?"#FEF9EC":T.surfaceB,border:`1px solid ${isOverdue?T.redM:isToday?T.ambM:isDueSoon?T.ambM:T.b1}`,borderRadius:6,marginBottom:8}}>
          <IcCal size={11} color={isOverdue?T.red:isToday?T.amb:T.t4}/>
          <span style={{fontSize:11,fontWeight:isOverdue||isToday?700:400,color:isOverdue?T.red:isToday?T.amb:T.t3}}>
            {isOverdue?`Overdue ${Math.abs(diff)}d`:isToday?"Contact today!":isDueSoon?`Due in ${diff}d`:lead.contactDate}
          </span>
          {(isOverdue||isToday)&&(
            <button onClick={e=>{e.stopPropagation();onWhatsApp(lead);}}
              style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:5,background:T.wa,color:"white",border:"none",cursor:"pointer",fontSize:10,fontWeight:700}}>
              <IcWA size={9} color="white"/> WA
            </button>
          )}
        </div>
      )}

      {/* Design button — appears on every stage */}
      {onDesign && (
        <div onClick={e=>e.stopPropagation()} style={{marginBottom:7}}>
          <button onClick={()=>onDesign(lead)}
            title="Design requests for this lead"
            style={{width:"100%",padding:"6px 10px",borderRadius:6,border:`1px dashed ${T.purM||"#DDD6FE"}`,background:T.purL||"#F5F3FF",color:T.pur||"#7C3AED",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all .12s"}}
            onMouseEnter={e=>e.currentTarget.style.background="#EDE9FE"}
            onMouseLeave={e=>e.currentTarget.style.background=T.purL||"#F5F3FF"}>
            <span>🎨</span>
            <span>Design Plan</span>
            {lead.design_count>0&&<span style={{background:T.pur||"#7C3AED",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8}}>{lead.design_count}</span>}
          </button>
        </div>
      )}

      {/* Footer: followup count + quick move */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:7,borderTop:`1px solid ${T.b1}`}}>
        <span style={{fontSize:10.5,color:T.t4}}>{lead.followupHistory?.length||0} follow-up{lead.followupHistory?.length!==1?"s":""}</span>
        <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>onWhatsApp(lead)}
            style={{width:24,height:24,borderRadius:5,background:"#DCFCE7",border:"1px solid #A7F3D0",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <IcWA size={11} color={T.wa}/>
          </button>
          <button onClick={()=>onMove(lead,-1)}
            style={{width:24,height:24,borderRadius:5,background:T.surfaceB,border:`1px solid ${T.b1}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>
            ←
          </button>
          <button onClick={()=>onMove(lead,1)}
            style={{width:24,height:24,borderRadius:5,background:T.surfaceB,border:`1px solid ${T.b1}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>
            →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── KANBAN BOARD ─────────────────────────────────────────────────
function KanbanBoard({leads,filters,onOpenLead,onMoveLead,onWhatsApp,onDesign,onAddLead}){
  const stagesShow=STAGES.filter(s=>(s.id!=="lost"&&s.id!=="project")||leads.some(l=>l.stage===s.id));

  const filterLeads=(stageId)=>leads.filter(l=>{
    if(l.stage!==stageId) return false;
    if(filters.assignedTo!=="All"&&l.assignedTo!==filters.assignedTo) return false;
    if(filters.source!=="All"&&l.source!==filters.source) return false;
    if(filters.projType!=="All"&&l.projType!==filters.projType) return false;
    if(filters.priority!=="All"&&l.priority!==filters.priority) return false;
    if(filters.search){
      const q=filters.search.toLowerCase();
      const nameHit=(l.name||"").toLowerCase().includes(q);
      const phoneHit=(l.phone||"").includes(filters.search);
      if(!nameHit&&!phoneHit) return false;
    }
    return true;
  });

  return(
    <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:12,height:"100%",alignItems:"flex-start"}}>
      {stagesShow.map(stage=>{
        const stageLeads=filterLeads(stage.id);
        const stageValue=stageLeads.reduce((s,l)=>s+(Number(l.budget)||0),0);
        const overdueInStage=stageLeads.filter(l=>daysDiff(l.contactDate)<0&&l.contactDate).length;
        return(
          <div key={stage.id}
            style={{minWidth:270,maxWidth:290,flexShrink:0,display:"flex",flexDirection:"column",height:"100%"}}>
            {/* Column header */}
            <div style={{borderRadius:"9px 9px 0 0",padding:"11px 13px",background:stage.color,marginBottom:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:13,fontWeight:700,color:"white"}}>{stage.label}</span>
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  {overdueInStage>0&&(
                    <span style={{background:"rgba(255,255,255,0.25)",color:"white",fontSize:9.5,fontWeight:800,padding:"1px 6px",borderRadius:10,border:"1px solid rgba(255,255,255,0.3)"}}>
                      {overdueInStage} overdue
                    </span>
                  )}
                  <span style={{background:"rgba(255,255,255,0.25)",color:"white",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{stageLeads.length}</span>
                </div>
              </div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.75)"}}>{stage.desc}</div>
              {stageValue>0&&<div style={{fontSize:11,color:"rgba(255,255,255,0.9)",fontWeight:600,marginTop:3}}>₹{fmt(stageValue)}</div>}
            </div>

            {/* Cards container */}
            <div style={{flex:1,overflowY:"auto",background:stage.bg,borderRadius:"0 0 9px 9px",border:`1px solid ${stage.color}44`,borderTop:"none",padding:"10px 9px",minHeight:200}}>
              {stageLeads.length===0&&(
                <div style={{textAlign:"center",padding:"24px 12px",color:`${stage.color}88`,fontSize:12}}>
                  No leads in this stage
                </div>
              )}
              {stageLeads.map(lead=>(
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onOpen={onOpenLead}
                  onMove={(l,dir)=>onMoveLead(l,dir)}
                  onWhatsApp={onWhatsApp}
                  onDesign={onDesign}
                  stages={STAGES}
                />
              ))}

              {/* Add lead shortcut */}
              {stage.id!=="lost"&&stage.id!=="project"&&(
                <button onClick={()=>onAddLead(stage.id)} style={{width:"100%",padding:"7px",borderRadius:7,border:`1.5px dashed ${stage.color}66`,background:"transparent",color:`${stage.color}BB`,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginTop:4}}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${stage.color}11`;}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                  <IcAdd size={12} color="currentColor"/> Add {stage.label}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── LEAD DETAIL DRAWER ───────────────────────────────────────────
function LeadDetailDrawer({lead,allLeads,onClose,onUpdate,onWhatsApp,initialTab}){
  const [tab,setTab]=useState(initialTab||"overview");
  const [newNote,setNewNote]=useState("");
  const [history,setHistory]=useState(lead.followupHistory||[]);
  const [editContact,setEditContact]=useState(lead.contactDate||"");
  const [contactSaved,setContactSaved]=useState(false);
  const [quotations,setQuotations]=useState([]);
  const [quotLoading,setQuotLoading]=useState(false);
  const [uploadPct,setUploadPct]=useState(0);
  const [uploading,setUploading]=useState(false);
  const [qForm,setQForm]=useState({title:"",amount:"",notes:""});
  const qFileRef=useRef(null);

  // ── Phase 5: builder-generated quotes ──────────────────────────
  const [builderQuotes,    setBuilderQuotes]    = useState([]);
  const [builderOpen,      setBuilderOpen]      = useState(null); // null | { quoteId? }
  const [builderLoading,   setBuilderLoading]   = useState(false);
  // Library lookups for the inline city/type picker shown in Build Quote tab
  const [bqCities,         setBqCities]         = useState([]);
  const [bqCTypes,         setBqCTypes]         = useState([]);
  // Picker state — null means "show pinned chips"; object means "edit mode"
  const [bqEdit,           setBqEdit]           = useState(null); // null | { cityId, typeId }
  const [bqSaving,         setBqSaving]         = useState(false);
  const reloadBuilderQuotes = async () => {
    setBuilderLoading(true);
    try {
      const r = await api.get("/library/leads/" + lead.id + "/quotations");
      if (r?.success) setBuilderQuotes(r.data || []);
    } catch (_) {}
    setBuilderLoading(false);
  };
  useEffect(() => { reloadBuilderQuotes(); /* eslint-disable-next-line */ }, [lead.id]);
  // Lazy-load city + construction-type lookups when Build Quote tab opens.
  useEffect(() => {
    if (tab !== "buildQuote") return;
    if (bqCities.length && bqCTypes.length) return;
    (async () => {
      try {
        const [cr, tr] = await Promise.all([
          api.get("/library/cities"),
          api.get("/library/construction-types"),
        ]);
        if (cr?.success) setBqCities(cr.data || []);
        if (tr?.success) setBqCTypes(tr.data || []);
      } catch (_) {}
    })();
    // eslint-disable-next-line
  }, [tab]);
  // Auto-open picker if lead is missing city/type so the user immediately
  // sees the inputs (no extra click needed).
  useEffect(() => {
    if (tab !== "buildQuote") return;
    if (!lead.city_id || !lead.construction_type_id) {
      setBqEdit({ cityId: lead.city_id || "", typeId: lead.construction_type_id || "" });
    } else {
      setBqEdit(null);
    }
    // eslint-disable-next-line
  }, [tab, lead.city_id, lead.construction_type_id]);

  // Save the picked city + type to the lead via the same PATCH path
  // updateLead uses → server PATCH + re-fetch → local state hydrates with
  // joined names. Independent of stage.
  const saveBuildQuoteRates = async () => {
    if (!bqEdit?.cityId || !bqEdit?.typeId) return;
    setBqSaving(true);
    try {
      await onUpdate(lead.id, {
        cityId:             Number(bqEdit.cityId),
        constructionTypeId: Number(bqEdit.typeId),
      });
      setBqEdit(null);
    } finally { setBqSaving(false); }
  };
  const stage=STAGES.find(s=>s.id===lead.stage);
  const ps=PRIO_S[lead.priority]||PRIO_S["Medium"];
  const diff=daysDiff(lead.contactDate);

  // ── Stage-transition guard for Follow-Up / Proposal / Converted ──
  // When the destination stage needs rate info (city + construction
  // type) and the lead is missing one, show an inline picker before
  // committing the transition. libCities/libCTypes load lazily on first
  // Move-Stage tab open to avoid an upfront fetch for every lead drawer.
  const [pendingMove,    setPendingMove]    = useState(null); // {stage} | null
  const [moveCityId,     setMoveCityId]     = useState("");
  const [moveTypeId,     setMoveTypeId]     = useState("");
  const [moveSaving,     setMoveSaving]     = useState(false);
  const [libCities,      setLibCities]      = useState([]);
  const [libCTypes,      setLibCTypes]      = useState([]);
  useEffect(() => {
    if (tab !== "move") return;
    if (libCities.length && libCTypes.length) return;
    (async () => {
      try {
        const [cr, tr] = await Promise.all([
          api.get("/library/cities"),
          api.get("/library/construction-types"),
        ]);
        if (cr?.success) setLibCities(cr.data || []);
        if (tr?.success) setLibCTypes(tr.data || []);
      } catch (_) {}
    })();
    // Prefill from lead's existing FKs (if any)
    setMoveCityId(lead.city_id || "");
    setMoveTypeId(lead.construction_type_id || "");
    // eslint-disable-next-line
  }, [tab]);
  const tryMoveStage = (newStage) => {
    if (stageNeedsRates(newStage) && !leadHasRatesInfo(lead)) {
      setPendingMove({ stage: newStage });
      return;
    }
    // M2: When moving to "converted", intercept → show "Create Project?"
    // panel (project name + optional final-quote selector + Skip). Direct
    // stage-only move stays available via the Skip path inside that panel.
    if (newStage === "converted" && !lead.converted_project_id) {
      setConvertOpen(true);
      return;
    }
    onUpdate(lead.id, { stage: newStage });
    onClose();
  };
  const confirmMoveWithRates = async () => {
    if (!pendingMove) return;
    if (!moveCityId || !moveTypeId) return;
    setMoveSaving(true);
    try {
      await onUpdate(lead.id, {
        stage:                pendingMove.stage,
        cityId:               Number(moveCityId),
        constructionTypeId:   Number(moveTypeId),
      });
      setPendingMove(null);
      // If user was actually trying to move to "converted", surface the
      // project-creation panel now that rates are set.
      if (pendingMove.stage === "converted") setConvertOpen(true);
      else onClose();
    } finally { setMoveSaving(false); }
  };

  // ── M2: Convert-to-project panel state ─────────────────────────
  const [convertOpen,   setConvertOpen]   = useState(false);
  const [convertForm,   setConvertForm]   = useState({});
  const [convertQuotes, setConvertQuotes] = useState([]);
  const [convertSaving, setConvertSaving] = useState(false);
  useEffect(() => {
    if (!convertOpen) return;
    setConvertForm({
      project_name: `${lead.name} — Project`,
      start_date:   new Date().toISOString().split("T")[0],
      end_date:     "",
      quote_id:     "",       // empty = no final quote selected
      boq_value:    lead.budget || 0,
    });
    // Lazy-load quotes (any status; user picks which is "final" — usually Accepted)
    (async () => {
      try {
        const r = await api.get("/library/leads/" + lead.id + "/quotations");
        if (r?.success) setConvertQuotes(r.data || []);
      } catch (_) {}
    })();
    // eslint-disable-next-line
  }, [convertOpen]);
  const cancelConvert = () => { if (!convertSaving) setConvertOpen(false); };
  const confirmConvertWithProject = async () => {
    if (!convertForm.project_name?.trim()) return;
    setConvertSaving(true);
    try {
      const body = {
        project_name: convertForm.project_name.trim(),
        start_date:   convertForm.start_date || null,
        end_date:     convertForm.end_date || null,
        boq_value:    Number(convertForm.boq_value) || 0,
      };
      if (convertForm.quote_id) body.quote_id = Number(convertForm.quote_id);
      const r = await api.post("/crm/leads/" + lead.id + "/convert-to-project", body);
      if (!r?.success) { alert(r?.message || "Could not convert"); setConvertSaving(false); return; }
      // Mirror lead.stage to 'converted' locally
      if (typeof onUpdate === "function") onUpdate(lead.id, { stage: "converted" });
      setConvertOpen(false);
      onClose();
    } catch (e) {
      alert("Convert failed: " + (e?.message || ""));
    } finally { setConvertSaving(false); }
  };
  const skipConvert = async () => {
    // Just mark stage='converted' without creating a project
    setConvertSaving(true);
    try {
      await onUpdate(lead.id, { stage: "converted" });
      setConvertOpen(false);
      onClose();
    } finally { setConvertSaving(false); }
  };

  // Load quotations
  useEffect(()=>{
    const loadQ=async()=>{
      setQuotLoading(true);
      try{
        const res=await api.get("/crm/leads/"+lead.id+"/quotations");
        if(res.success) setQuotations(res.data);
      }catch(e){}
      setQuotLoading(false);
    };
    loadQ();
  },[lead.id]);

  const uploadQuotation=async()=>{
    const file=qFileRef.current?.files?.[0];
    if(!file) return alert("Please select a PDF file");
    setUploading(true);setUploadPct(0);
    try{
      // Upload to Cloudinary
      const fd=new FormData();
      fd.append("file",file);
      fd.append("upload_preset","gb_buildcon_drawings");
      fd.append("folder","gb_buildcon/quotations");
      const cld=await new Promise((resolve,reject)=>{
        const xhr=new XMLHttpRequest();
        xhr.upload.onprogress=e=>{if(e.lengthComputable) setUploadPct(Math.round(e.loaded/e.total*90));};
        xhr.onload=()=>{const d=JSON.parse(xhr.responseText);xhr.status===200?resolve(d):reject(new Error(d.error?.message||"Upload failed"));};
        xhr.onerror=()=>reject(new Error("Network error"));
        xhr.open("POST","https://api.cloudinary.com/v1_1/dd632nqfm/raw/upload");
        xhr.send(fd);
      });
      setUploadPct(95);
      // Save metadata
      const res=await api.post("/crm/leads/"+lead.id+"/quotations",{
        title:qForm.title||`Quotation V${quotations.length+1}`,
        amount:Number(qForm.amount)||0,
        file_url:cld.secure_url,
        file_size:file.size>1048576?`${(file.size/1048576).toFixed(1)} MB`:`${Math.round(file.size/1024)} KB`,
        notes:qForm.notes||null,
      });
      if(res.success){setQuotations(p=>[res.data,...p]);setQForm({title:"",amount:"",notes:""});if(qFileRef.current) qFileRef.current.value="";}
      setUploadPct(100);
    }catch(e){alert(e.message||"Upload failed");}
    setUploading(false);setUploadPct(0);
  };

  const acceptQuotation=async(qid)=>{
    try{
      const res=await api.patch("/crm/quotations/"+qid+"/accept");
      if(res.success){
        setQuotations(p=>p.map(q=>({...q,status:q.id===qid?"accepted":"rejected"})));
        onUpdate(lead.id,{stage:"converted"});
      }
    }catch(e){alert(e.message||"Error accepting quotation");}
  };

  const deleteQuotation=async(qid)=>{
    if(!await window.confirmAsync("Delete this quotation?")) return;
    try{
      const res=await api.del("/crm/quotations/"+qid);
      if(res.success) setQuotations(p=>p.filter(q=>q.id!==qid));
    }catch(e){alert(e.message||"Error deleting");}
  };

  const addNote=async()=>{
    if(!newNote.trim()) return;
    try{
      const res=await api.post("/crm/leads/"+lead.id+"/followups",{note:newNote});
      if(res.success){
        setHistory(p=>[...p,res.data]);
        setNewNote("");
      }
    }catch(e){
      // Fallback to local
      const entry={date:new Date().toISOString().split("T")[0],note:newNote,by:"You"};
      setHistory(p=>[...p,entry]);
      setNewNote("");
    }
  };

  const saveContactDate=()=>{
    onUpdate(lead.id,{contactDate:editContact});
    setContactSaved(true);
    setTimeout(()=>setContactSaved(false),2000);
  };

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(560px,95vw)",background:T.bg,zIndex:301,boxShadow:"-6px 0 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease"}}>

      {/* Header */}
      <div style={{background:stage?.color||T.sb,padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{fontSize:10.5,fontWeight:700,color:"rgba(255,255,255,0.6)",fontFamily:"monospace"}}>{lead.id}</span>
              <span style={{background:"rgba(255,255,255,0.25)",color:"white",fontSize:10.5,fontWeight:700,padding:"1px 8px",borderRadius:20}}>{stage?.label}</span>
              <Pill label={lead.priority} c={ps.c} bg={ps.bg} brd={ps.brd}/>
            </div>
            <div style={{fontSize:17,fontWeight:700,color:"white",marginBottom:3}}>{lead.name}</div>
            <div style={{fontSize:11.5,color:"rgba(255,255,255,0.7)",display:"flex",gap:12,flexWrap:"wrap"}}>
              <span>📍 {lead.city}</span>
              <span>🏗️ {lead.projType}</span>
              <span>💰 ₹{fmt(lead.budget)}</span>
              <span>👤 {lead.assignedTo}</span>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",display:"flex"}}><IcX size={15}/></button>
        </div>

        {/* Quick contact bar */}
        <div style={{display:"flex",gap:7,marginTop:12}}>
          <button onClick={()=>window.open(`tel:+91${lead.phone}`)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.3)",color:"white",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <IcPhone size={13} color="white"/> {lead.phone}
          </button>
          <button onClick={()=>onWhatsApp(lead)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.wa,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            <IcWA size={13} color="white"/> WhatsApp
          </button>
          <button onClick={()=>window.open(`mailto:${lead.email}`)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",color:"white",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <IcMail size={13} color="white"/> Mail
          </button>
        </div>
      </div>

      {/* Inner tabs */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.b1}`,display:"flex",flexShrink:0,overflowX:"auto"}}>
        {[
          {id:"overview", l:"Overview"},
          {id:"followup", l:`Follow Ups (${history.length})`},
          {id:"buildQuote", l:`Build Quote (${builderQuotes.length})`},
          {id:"quotations", l:`PDF Quotes (${quotations.length})`},
          {id:"contact",  l:"Contact Date"},
          {id:"move",     l:"Move Stage"},
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"10px 14px",border:"none",background:"none",fontSize:12,fontWeight:tab===t.id?700:400,color:tab===t.id?T.blu:T.t3,borderBottom:tab===t.id?`2px solid ${T.blu}`:"2px solid transparent",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>

        {/* OVERVIEW */}
        {tab==="overview"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[{l:"Source",v:lead.source},{l:"Project Type",v:lead.projType},{l:"Budget",v:`₹${fmtN(lead.budget)}`},{l:"City",v:lead.city},{l:"Email",v:lead.email||"—"},{l:"Assigned To",v:lead.assignedTo},{l:"Created",v:lead.createdAt},{l:"Last Contact",v:lead.followupHistory?.[lead.followupHistory.length-1]?.date||"—"}].map(({l,v})=>(
                <div key={l} style={{padding:"8px 11px",background:T.surface,borderRadius:7,border:`1px solid ${T.b1}`}}>
                  <div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{l}</div>
                  <div style={{fontSize:12.5,fontWeight:500,color:T.t1}}>{v}</div>
                </div>
              ))}
            </div>
            {lead.notes&&<div style={{padding:"10px 13px",background:T.surfaceB,border:`1px solid ${T.b1}`,borderLeft:`4px solid ${stage?.color||T.slt}`,borderRadius:"0 7px 7px 0",marginBottom:12}}>
              <div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>Notes</div>
              <div style={{fontSize:12.5,color:T.t2,lineHeight:1.6}}>{lead.notes}</div>
            </div>}
            {lead.tags?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {lead.tags.map(tg=><span key={tg} style={{background:T.ambL,color:T.amb,fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,border:`1px solid ${T.ambM}`}}>{tg}</span>)}
            </div>}
          </div>
        )}

        {/* FOLLOW UPS */}
        {tab==="followup"&&(
          <div>
            {history.map((h,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:12}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:stage?.color||T.blu,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"white",fontSize:11,fontWeight:700}}>{h.by.charAt(0)}</div>
                  {i<history.length-1&&<div style={{width:2,flex:1,background:T.b1,margin:"3px 0"}}/>}
                </div>
                <div style={{flex:1,paddingBottom:i<history.length-1?12:0}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{h.by}</span>
                    <span style={{fontSize:10.5,color:T.t4}}>{h.date}</span>
                  </div>
                  <div style={{padding:"8px 11px",background:T.surface,borderRadius:"0 8px 8px 8px",border:`1px solid ${T.b1}`,fontSize:12.5,color:T.t2,lineHeight:1.5}}>{h.note}</div>
                </div>
              </div>
            ))}
            {history.length===0&&<div style={{padding:"30px",textAlign:"center",color:T.t4,fontSize:13}}>No follow-ups recorded yet</div>}
            <div style={{display:"flex",gap:7,marginTop:8}}>
              <input value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Add follow-up note..."
                style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}
                onKeyDown={e=>e.key==="Enter"&&addNote()}/>
              <button onClick={addNote} style={{padding:"9px 14px",borderRadius:8,background:T.blu,color:"white",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>Add</button>
            </div>
          </div>
        )}

        {/* QUOTATIONS */}
        {tab==="quotations"&&(
          <div>
            {/* Upload section */}
            <div style={{padding:"13px 14px",background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:9,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:T.t2,marginBottom:10}}>Upload Quotation (PDF)</div>
              <input ref={qFileRef} type="file" accept=".pdf" style={{display:"block",marginBottom:8,fontSize:12,color:T.t2}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div>
                  <label style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Title</label>
                  <input value={qForm.title} onChange={e=>setQForm(p=>({...p,title:e.target.value}))} placeholder={`Quotation V${quotations.length+1}`}
                    style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <div>
                  <label style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Amount (₹)</label>
                  <input type="number" value={qForm.amount} onChange={e=>setQForm(p=>({...p,amount:e.target.value}))} placeholder="e.g. 2500000"
                    style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
              </div>
              <input value={qForm.notes} onChange={e=>setQForm(p=>({...p,notes:e.target.value}))} placeholder="Notes (optional)"
                style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:8}}/>
              {uploading&&<div style={{marginBottom:8}}>
                <div style={{height:5,background:T.b1,borderRadius:5,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${uploadPct}%`,background:T.blu,borderRadius:5,transition:"width .3s"}}/>
                </div>
                <div style={{fontSize:10.5,color:T.blu,marginTop:3}}>{uploadPct}% uploading...</div>
              </div>}
              <button onClick={uploadQuotation} disabled={uploading}
                style={{padding:"8px 16px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:uploading?"not-allowed":"pointer",opacity:uploading?0.6:1}}>
                {uploading?"Uploading...":"Upload Quotation"}
              </button>
            </div>

            {/* Quotation list */}
            {quotLoading&&<div style={{textAlign:"center",padding:"20px",color:T.t4,fontSize:12}}>Loading quotations...</div>}
            {!quotLoading&&quotations.length===0&&<div style={{textAlign:"center",padding:"30px",color:T.t4,fontSize:13}}>No quotations uploaded yet</div>}
            {quotations.map(q=>{
              const STATUS_Q={"sent":{c:T.blu,bg:T.bluL,brd:T.bluM},"draft":{c:T.slt,bg:T.sltL,brd:T.b2},"accepted":{c:T.grn,bg:T.grnL,brd:T.grnM},"rejected":{c:T.red,bg:T.redL,brd:T.redM}};
              const ss=STATUS_Q[q.status]||STATUS_Q["sent"];
              return(
                <div key={q.id} style={{padding:"12px 14px",background:q.status==="accepted"?T.grnL:T.surface,border:`1.5px solid ${q.status==="accepted"?T.grnM:T.b1}`,borderRadius:9,marginBottom:8,borderLeft:`4px solid ${ss.c}`}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                        <span style={{fontSize:10.5,fontWeight:800,color:T.blu,background:T.bluL,padding:"1px 7px",borderRadius:4,fontFamily:"monospace"}}>V{q.version}</span>
                        <span style={{fontSize:13,fontWeight:600,color:T.t1}}>{q.title||`Quotation V${q.version}`}</span>
                        <span style={{display:"inline-block",background:ss.bg,color:ss.c,fontSize:9.5,fontWeight:700,padding:"1px 7px",borderRadius:20,border:`1px solid ${ss.brd}`}}>{q.status}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        {q.created_by_name && <Credit label="Created by" name={q.created_by_name} time={q.created_at}/>}
                        {q.file_size && <span style={{fontSize:11,color:T.t4}}>· {q.file_size}</span>}
                      </div>
                    </div>
                    {q.amount>0&&<div style={{fontSize:15,fontWeight:700,color:T.grn}}>₹{fmtN(q.amount)}</div>}
                  </div>
                  {q.notes&&<div style={{fontSize:11.5,color:T.t3,fontStyle:"italic",marginBottom:6}}>"{q.notes}"</div>}
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>window.open(q.file_url,"_blank")}
                      style={{padding:"5px 11px",borderRadius:5,border:`1px solid ${T.bluM}`,background:T.bluL,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                      View PDF
                    </button>
                    {lead.stage==="converted"&&q.status!=="accepted"&&(
                      <button onClick={()=>acceptQuotation(q.id)}
                        style={{padding:"5px 11px",borderRadius:5,border:`1px solid ${T.grnM}`,background:T.grnL,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                        ✓ Mark as Final
                      </button>
                    )}
                    {q.status==="accepted"&&<span style={{padding:"5px 11px",fontSize:11,fontWeight:700,color:T.grn}}>✓ Final Quotation</span>}
                    <button onClick={()=>deleteQuotation(q.id)}
                      style={{padding:"5px 11px",borderRadius:5,border:`1px solid ${T.redM}`,background:T.redL,color:T.red,fontSize:11,fontWeight:600,cursor:"pointer",marginLeft:"auto"}}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CONTACT DATE */}
        {tab==="contact"&&(
          <div>
            <div style={{padding:"13px 14px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:9,marginBottom:14}}>
              <div style={{fontSize:12,color:T.blu,lineHeight:1.6}}>
                <strong>Automated Reminder System</strong><br/>
                Jab aap contact date set karte ho → app popup aata hai on that date · WhatsApp message template ready milta hai · Phone ka shortcut directly available
              </div>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:10.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:7}}>Next Contact Date</label>
              <input type="date" value={editContact} onChange={e=>setEditContact(e.target.value)}
                style={{width:"100%",padding:"10px 13px",borderRadius:8,border:`1.5px solid ${editContact?T.blu:T.b1}`,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              {editContact&&daysDiff(editContact)!==null&&(
                <div style={{fontSize:11.5,color:daysDiff(editContact)<0?T.red:daysDiff(editContact)===0?T.amb:T.grn,marginTop:5,fontWeight:600}}>
                  {daysDiff(editContact)<0?`${Math.abs(daysDiff(editContact))} days overdue`:daysDiff(editContact)===0?"Today!":daysDiff(editContact)===1?"Tomorrow":`In ${daysDiff(editContact)} days`}
                </div>
              )}
            </div>

            {/* Quick presets */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>Quick Set</div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                {[["Today","2026-03-16"],["Tomorrow","2026-03-17"],["In 3 days","2026-03-19"],["In 1 week","2026-03-23"],["In 2 weeks","2026-03-30"]].map(([l,d])=>(
                  <button key={l} onClick={()=>setEditContact(d)}
                    style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${editContact===d?T.blu:T.b1}`,background:editContact===d?T.bluL:"none",color:editContact===d?T.blu:T.t3,fontSize:11.5,fontWeight:editContact===d?700:400,cursor:"pointer"}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification channels */}
            <div style={{padding:"12px 14px",background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:8,marginBottom:14}}>
              <div style={{fontSize:11.5,fontWeight:700,color:T.t2,marginBottom:9}}>When contact date arrives, remind via:</div>
              {[{l:"App Popup",d:"Full-screen popup on login",c:T.blu,on:true},{l:"WhatsApp Template",d:"Ready message to send client",c:T.wa,on:true},{l:"Browser Notification",d:"Desktop notification",c:T.pur,on:false}].map((ch,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:i<2?8:0}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:ch.on?ch.c:T.b2,flexShrink:0}}/>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500,color:T.t1}}>{ch.l}</div><div style={{fontSize:10.5,color:T.t4}}>{ch.d}</div></div>
                  <div style={{width:34,height:18,borderRadius:18,background:ch.on?ch.c:T.b2,position:"relative",cursor:"pointer"}}>
                    <div style={{width:13,height:13,borderRadius:"50%",background:"white",position:"absolute",top:2.5,left:ch.on?17:3,transition:"left .2s"}}/>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={saveContactDate}
              style={{width:"100%",padding:"11px",borderRadius:8,background:contactSaved?T.grn:T.blu,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,transition:"background .2s"}}>
              {contactSaved?<><IcChk size={15} color="white"/> Date Saved!</>:<><IcCal size={15} color="white"/> Save Contact Date & Enable Reminder</>}
            </button>
          </div>
        )}

        {/* BUILD QUOTE — Phase 5 */}
        {tab==="buildQuote"&&(() => {
          const hasRates = !!(lead.city_id && lead.construction_type_id);
          const STATUS_PILL = {
            Draft:    { bg:"#FEF3C7", fg:"#92400E", dot:"#F59E0B" },
            Sent:     { bg:"#DBEAFE", fg:"#1E40AF", dot:"#2563EB" },
            Accepted: { bg:"#D1FAE5", fg:"#065F46", dot:"#059669" },
            Rejected: { bg:"#FEE2E2", fg:"#991B1B", dot:"#DC2626" },
            Expired:  { bg:"#E5E7EB", fg:"#4B5563", dot:"#6B7280" },
          };
          const inr = (n) => Math.round(Number(n) || 0).toLocaleString("en-IN");
          const ageHuman = (dt) => {
            if (!dt) return "—";
            const d = new Date(dt);
            const days = Math.floor((Date.now() - d.getTime()) / 86400000);
            return days === 0 ? "today" : days === 1 ? "1 day ago" : days + " days ago";
          };
          // Phase 9: backend handles lead-stage side-effects + timeline log
          // on every status transition. Frontend just calls the endpoint
          // and reacts to the new lead_stage_after returned by the server.
          const transition = async (qid, status, confirmMsg) => {
            if (confirmMsg && !window.confirm(confirmMsg)) return;
            const r = await api.post("/library/quotations/" + qid + "/status", { status });
            if (!r?.success) return alert(r?.message || "Failed");
            // Mirror server-side lead stage change into local state.
            if (r.data?.lead_stage_after && r.data.lead_stage_after !== lead.stage) {
              if (typeof onUpdate === "function") onUpdate(lead.id, { stage: r.data.lead_stage_after });
            }
            reloadBuilderQuotes();
          };
          const sendQuote = async (qid) => {
            if (!window.confirm("Send this quotation to the client? It will become read-only after sending.")) return;
            await transition(qid, "Sent");
          };
          const reviseQuote = async (q) => {
            if (!window.confirm(`Create a revised copy of ${q.quote_no} as a new Draft?`)) return;
            const r = await api.post("/library/quotations/" + q.id + "/duplicate", {});
            if (!r?.success) return alert(r?.message || "Failed");
            reloadBuilderQuotes();
            // Open the new draft in the builder for immediate edits.
            if (r.data?.id) setBuilderOpen({ quoteId: r.data.id });
          };
          // WhatsApp share — opens wa.me with a Hinglish pre-filled message.
          // PDF link can't be embedded (download requires auth) — user
          // attaches the file manually on their device after downloading.
          const shareWhatsApp = (q) => {
            const phone = (lead.phone || "").replace(/\D/g, "");
            if (!phone) return alert("Lead has no phone number");
            const firstName = (lead.name || "").split(" ")[0] || "Sir/Ma'am";
            const total = "₹" + Math.round(Number(q.grand_total) || 0).toLocaleString("en-IN");
            const msg = [
              `Namaskar ${firstName} ji 🙏`,
              ``,
              `Aapka quotation taiyar hai:`,
              `• Quote No: *${q.quote_no}*`,
              `• Package: ${q.package_name || ""}`,
              `• Grand Total: *${total}*`,
              `• Validity: ${q.validity_days || 30} days`,
              ``,
              `PDF aapko alag se share karta hu. Kripya review karein aur apne vichar batayein.`,
              ``,
              `— GB Buildcon`,
            ].join("\n");
            const intlPhone = phone.length === 10 ? "91" + phone : phone;
            window.open("https://wa.me/" + intlPhone + "?text=" + encodeURIComponent(msg), "_blank");
          };
          const delQuote = async (qid) => {
            if (!window.confirm("Delete this quotation? This soft-deletes the row.")) return;
            const r = await api.del("/library/quotations/" + qid);
            if (r?.success) reloadBuilderQuotes();
            else alert(r?.message || "Failed");
          };
          const cityName = lead.city_name || bqCities.find(c => Number(c.id) === Number(lead.city_id))?.name || "—";
          const typeName = lead.construction_type_name || bqCTypes.find(c => Number(c.id) === Number(lead.construction_type_id))?.name || "—";
          return (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ fontSize:12.5, color:T.t2 }}>
                  Live quotations built from your rate library.
                </div>
                <button onClick={() => hasRates && setBuilderOpen({ quoteId: null })}
                  disabled={!hasRates}
                  title={hasRates ? "Open quote builder" : "Set City + Construction Type below first"}
                  style={{
                    padding:"8px 14px", borderRadius:7,
                    background: hasRates ? T.blu : "#E5E7EB",
                    color: hasRates ? "white" : "#9CA3AF",
                    border:"none", fontSize:12.5, fontWeight:700,
                    cursor: hasRates ? "pointer" : "not-allowed",
                    display:"flex", alignItems:"center", gap:6,
                  }}>
                  <IcAdd size={13} color={hasRates ? "white" : "#9CA3AF"}/> Create New Quote
                </button>
              </div>

              {/* ── City + Construction Type pinned panel ─────────────
                  Always visible at top of Build Quote tab. If lead has
                  both FKs set → shows chips with a "Change" link. If
                  missing → auto-opens dropdowns. Independent of pipeline
                  stage, so the user can build a quote at any stage. */}
              <div style={{ marginBottom:14, padding:"10px 12px",
                            background: bqEdit ? "#F0F9FF" : "#F8FAFC",
                            border:"1px solid " + (bqEdit ? "#BFDBFE" : "#E5E7EB"),
                            borderRadius:8 }}>
                {bqEdit ? (
                  <>
                    <div style={{ fontSize:10.5, fontWeight:700, color:T.t4,
                                  textTransform:"uppercase", letterSpacing:".4px", marginBottom:8 }}>
                      {hasRates ? "Change city / construction type" : "Set city + construction type"}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                      <div>
                        <label style={{ fontSize:9.5, fontWeight:600, color:T.t4, display:"block", marginBottom:3, textTransform:"uppercase" }}>City</label>
                        <select value={bqEdit.cityId} onChange={e => setBqEdit(p => ({ ...p, cityId: e.target.value }))}
                          style={{ width:"100%", padding:"7px 9px", borderRadius:6,
                                   border:`1.5px solid ${bqEdit.cityId ? T.b1 : "#FCA5A5"}`,
                                   background:bqEdit.cityId ? T.surface : "#FEF2F2",
                                   fontSize:12.5, color:T.t1, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}>
                          <option value="">Select city...</option>
                          {bqCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:9.5, fontWeight:600, color:T.t4, display:"block", marginBottom:3, textTransform:"uppercase" }}>Construction Type</label>
                        <select value={bqEdit.typeId} onChange={e => setBqEdit(p => ({ ...p, typeId: e.target.value }))}
                          style={{ width:"100%", padding:"7px 9px", borderRadius:6,
                                   border:`1.5px solid ${bqEdit.typeId ? T.b1 : "#FCA5A5"}`,
                                   background:bqEdit.typeId ? T.surface : "#FEF2F2",
                                   fontSize:12.5, color:T.t1, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}>
                          <option value="">Select type...</option>
                          {bqCTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                      {hasRates && (
                        <button onClick={() => setBqEdit(null)} disabled={bqSaving}
                          style={{ padding:"6px 12px", borderRadius:5, background:T.surface,
                                   border:`1px solid ${T.b1}`, fontSize:11.5, fontWeight:600,
                                   color:T.t3, cursor:bqSaving?"not-allowed":"pointer" }}>
                          Cancel
                        </button>
                      )}
                      <button onClick={saveBuildQuoteRates}
                        disabled={bqSaving || !bqEdit.cityId || !bqEdit.typeId}
                        style={{ padding:"6px 14px", borderRadius:5,
                                 background:(bqSaving||!bqEdit.cityId||!bqEdit.typeId)?T.b1:T.blu,
                                 color:(bqSaving||!bqEdit.cityId||!bqEdit.typeId)?T.t4:"white",
                                 border:"none", fontSize:11.5, fontWeight:700,
                                 cursor:(bqSaving||!bqEdit.cityId||!bqEdit.typeId)?"not-allowed":"pointer" }}>
                        {bqSaving ? "Saving…" : (hasRates ? "Save Changes" : "Save & Continue")}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11.5, padding:"4px 10px", borderRadius:5, background:"#E0F2FE", color:"#075985", fontWeight:600 }}>
                      📍 {cityName}
                    </span>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11.5, padding:"4px 10px", borderRadius:5, background:"#FCE7F3", color:"#9D174D", fontWeight:600 }}>
                      🏗️ {typeName}
                    </span>
                    <button onClick={() => setBqEdit({ cityId: lead.city_id || "", typeId: lead.construction_type_id || "" })}
                      style={{ marginLeft:"auto", background:"transparent", border:`1px solid ${T.b1}`,
                               color:T.t3, padding:"4px 10px", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                      Change
                    </button>
                  </div>
                )}
              </div>

              {builderLoading && builderQuotes.length === 0 && (
                <div style={{ padding:"18px", textAlign:"center", color:"#9CA3AF", fontSize:12 }}>Loading…</div>
              )}

              {!builderLoading && builderQuotes.length === 0 && (
                <div style={{ padding:"24px 14px", textAlign:"center", color:"#9CA3AF", fontSize:12.5,
                              border:"1px dashed #CBD5E1", borderRadius:8, background:"#F8FAFC" }}>
                  No quotations built yet for this lead.
                </div>
              )}

              {builderQuotes.map(q => {
                const pill = STATUS_PILL[q.status] || STATUS_PILL.Draft;
                const isDraft = q.status === "Draft";
                const isSent  = q.status === "Sent";
                return (
                  <div key={q.id}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px",
                             marginBottom:6, background:"white", border:`1px solid ${T.b1}`, borderRadius:7 }}>
                    <span style={{ padding:"2px 8px", fontSize:10.5, fontWeight:700, borderRadius:4,
                                   background:pill.bg, color:pill.fg, display:"inline-flex", gap:5, alignItems:"center", flexShrink:0 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:pill.dot }}/>
                      {q.status}
                    </span>
                    <div style={{ fontWeight:700, fontSize:12.5, color:"#0F172A", flexShrink:0, minWidth:115 }}>{q.quote_no}</div>
                    <div style={{ fontSize:12, color:"#475569", flex:1, minWidth:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {q.package_name || "—"}
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#059669", flexShrink:0 }}>
                      ₹{inr(q.grand_total)}
                    </div>
                    <div style={{ fontSize:10.5, color:"#94A3B8", flexShrink:0, minWidth:80, textAlign:"right" }}>{ageHuman(q.created_at)}</div>
                    {/* Action toolbar — PDF, WhatsApp share + status-specific actions */}
                    <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                      <button onClick={() => downloadQuotePdf(q.id, q.quote_no)}
                        title="Download PDF"
                        style={{ padding:"5px 8px", fontSize:13, fontWeight:600, borderRadius:5,
                                 background:"white", border:`1px solid ${T.b1}`, color:"#475569", cursor:"pointer", lineHeight:1 }}>
                        📄
                      </button>
                      {/* WhatsApp share — only when lead has a phone */}
                      {lead.phone && (
                        <button onClick={() => shareWhatsApp(q)}
                          title="Share via WhatsApp"
                          style={{ padding:"5px 8px", fontSize:13, fontWeight:600, borderRadius:5,
                                   background:"white", border:"1px solid #BBF7D0", color:"#15803D", cursor:"pointer", lineHeight:1 }}>
                          📱
                        </button>
                      )}
                      {isDraft && (
                        <>
                          <button onClick={() => setBuilderOpen({ quoteId: q.id })}
                            title="Edit draft"
                            style={{ padding:"5px 10px", fontSize:11, fontWeight:600, borderRadius:5,
                                     background:"white", border:`1px solid ${T.b1}`, color:T.t2, cursor:"pointer" }}>
                            Edit
                          </button>
                          <button onClick={() => sendQuote(q.id)}
                            title="Mark as Sent + move lead to Proposal"
                            style={{ padding:"5px 10px", fontSize:11, fontWeight:700, borderRadius:5,
                                     background:T.blu, border:"none", color:"white", cursor:"pointer" }}>
                            Send
                          </button>
                        </>
                      )}
                      {isSent && (
                        <>
                          <button onClick={() => transition(q.id, "Accepted", "Mark this quotation as Accepted by the client? Lead will move to Converted.")}
                            style={{ padding:"5px 10px", fontSize:11, fontWeight:700, borderRadius:5,
                                     background:"#10B981", border:"none", color:"white", cursor:"pointer" }}>
                            Accept
                          </button>
                          <button onClick={() => transition(q.id, "Rejected", "Mark this quotation as Rejected?")}
                            style={{ padding:"5px 10px", fontSize:11, fontWeight:600, borderRadius:5,
                                     background:"white", border:"1px solid #FCA5A5", color:"#DC2626", cursor:"pointer" }}>
                            Reject
                          </button>
                        </>
                      )}
                      {!isDraft && !isSent && (
                        <button onClick={() => setBuilderOpen({ quoteId: q.id })}
                          title="View"
                          style={{ padding:"5px 10px", fontSize:11, fontWeight:600, borderRadius:5,
                                   background:"white", border:`1px solid ${T.b1}`, color:T.t2, cursor:"pointer" }}>
                          View
                        </button>
                      )}
                      {/* Revise (duplicate) — available on every non-Draft status */}
                      {!isDraft && (
                        <button onClick={() => reviseQuote(q)}
                          title="Create a new Draft revised from this quote"
                          style={{ padding:"5px 10px", fontSize:11, fontWeight:600, borderRadius:5,
                                   background:"white", border:"1px solid #C4B5FD", color:"#5B21B6", cursor:"pointer" }}>
                          Revise
                        </button>
                      )}
                      {isDraft && (
                        <button onClick={() => delQuote(q.id)}
                          title="Delete draft"
                          style={{ padding:"5px 8px", fontSize:12, fontWeight:700, borderRadius:5,
                                   background:"transparent", border:"1px solid #FCA5A5", color:"#DC2626", cursor:"pointer" }}>
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* MOVE STAGE */}
        {tab==="move"&&(
          <div>
            <div style={{fontSize:12.5,color:T.t2,marginBottom:14}}>Move <strong>{lead.name}</strong> to a different pipeline stage:</div>

            {!pendingMove && !convertOpen && STAGES.map(s=>{
              const isCurrentStage=s.id===lead.stage;
              const needsRates  = stageNeedsRates(s.id) && !leadHasRatesInfo(lead);
              return(
                <button key={s.id} onClick={()=>{if(!isCurrentStage) tryMoveStage(s.id);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:9,border:`2px solid ${isCurrentStage?s.color:T.b1}`,background:isCurrentStage?s.bg:T.surface,marginBottom:8,cursor:isCurrentStage?"default":"pointer",transition:"all .15s"}}
                  onMouseEnter={e=>{if(!isCurrentStage){e.currentTarget.style.borderColor=s.color;e.currentTarget.style.background=s.bg;}}}
                  onMouseLeave={e=>{if(!isCurrentStage){e.currentTarget.style.borderColor=T.b1;e.currentTarget.style.background=T.surface;}}}>
                  <div style={{width:12,height:12,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                  <div style={{flex:1,textAlign:"left"}}>
                    <div style={{fontSize:13,fontWeight:600,color:isCurrentStage?s.color:T.t1}}>
                      {s.label} {isCurrentStage&&"← Current"}
                      {needsRates && (
                        <span style={{marginLeft:6,padding:"1px 7px",fontSize:9.5,fontWeight:700,background:"#FEF3C7",color:"#92400E",borderRadius:3,letterSpacing:".2px",verticalAlign:"middle"}}>
                          NEEDS CITY + TYPE
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:T.t4}}>{s.desc}</div>
                  </div>
                  {!isCurrentStage&&<IcMove size={14} color={T.t4}/>}
                </button>
              );
            })}

            {/* Inline rates picker — opens when the user picks a Follow-Up
                / Proposal / Converted destination on a lead that doesn't
                yet have city + construction type set. */}
            {pendingMove && (
              <div style={{padding:14,borderRadius:10,border:`2px solid ${T.blu}`,background:"#F0F9FF"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#0F172A",marginBottom:4}}>
                  Set City + Construction Type
                </div>
                <div style={{fontSize:11.5,color:"#475569",marginBottom:14}}>
                  Required to move to <strong>{STAGES.find(s=>s.id===pendingMove.stage)?.label}</strong> so we can match the right rate package for quotations.
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:10,fontWeight:700,color:T.t4,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".4px"}}>City *</label>
                  <select value={moveCityId} onChange={e => setMoveCityId(e.target.value)}
                    style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${moveCityId?T.b1:"#FCA5A5"}`,background:moveCityId?T.surface:"#FEF2F2",fontSize:12.5,color:T.t1,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
                    <option value="">Select city...</option>
                    {libCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:10,fontWeight:700,color:T.t4,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".4px"}}>Construction Type *</label>
                  <select value={moveTypeId} onChange={e => setMoveTypeId(e.target.value)}
                    style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${moveTypeId?T.b1:"#FCA5A5"}`,background:moveTypeId?T.surface:"#FEF2F2",fontSize:12.5,color:T.t1,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
                    <option value="">Select type...</option>
                    {libCTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={() => setPendingMove(null)} disabled={moveSaving}
                    style={{flex:1,padding:"9px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:moveSaving?"not-allowed":"pointer"}}>
                    Back
                  </button>
                  <button onClick={confirmMoveWithRates}
                    disabled={moveSaving || !moveCityId || !moveTypeId}
                    style={{flex:2,padding:"9px",borderRadius:7,
                            background:(moveSaving||!moveCityId||!moveTypeId)?T.b1:T.blu,
                            color:(moveSaving||!moveCityId||!moveTypeId)?T.t4:"white",
                            border:"none",fontSize:12.5,fontWeight:700,
                            cursor:(moveSaving||!moveCityId||!moveTypeId)?"not-allowed":"pointer"}}>
                    {moveSaving ? "Saving…" : "Set & Move"}
                  </button>
                </div>
              </div>
            )}

            {/* ─── M2: CONVERT → PROJECT PANEL ─────────────────────
                Opens when user clicks "Converted" stage. Lets them
                create the construction project (or skip). Quote
                dropdown is optional — saved on project.crm_quote_id
                so Estimate Builder can default to that quote. */}
            {convertOpen && (
              <div style={{padding:14,borderRadius:10,border:"2px solid #10B981",background:"#F0FDF4"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#065F46",marginBottom:4}}>
                  Convert to Project
                </div>
                <div style={{fontSize:11.5,color:"#047857",marginBottom:14}}>
                  Create a construction project carrying over <strong>{lead.name}</strong>'s info (city, type, customer).
                  Optionally pick a final quote — the Estimate Builder will start from it.
                </div>

                <div style={{marginBottom:10}}>
                  <label style={{fontSize:10,fontWeight:700,color:T.t4,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".4px"}}>Project Name *</label>
                  <input value={convertForm.project_name || ""}
                    onChange={e => setConvertForm(p => ({ ...p, project_name: e.target.value }))}
                    placeholder={`${lead.name} — Project`} autoFocus
                    style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${convertForm.project_name?.trim()?T.b1:"#FCA5A5"}`,background:convertForm.project_name?.trim()?T.surface:"#FEF2F2",fontSize:12.5,color:T.t1,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,color:T.t4,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".4px"}}>Start Date</label>
                    <input type="date" value={convertForm.start_date || ""}
                      onChange={e => setConvertForm(p => ({ ...p, start_date: e.target.value }))}
                      style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,color:T.t4,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".4px"}}>End Date</label>
                    <input type="date" value={convertForm.end_date || ""}
                      onChange={e => setConvertForm(p => ({ ...p, end_date: e.target.value }))}
                      style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                  </div>
                </div>

                {convertQuotes.length > 0 && (
                  <div style={{marginBottom:14}}>
                    <label style={{fontSize:10,fontWeight:700,color:T.t4,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".4px"}}>
                      Final Quote (optional)
                    </label>
                    <select value={convertForm.quote_id || ""}
                      onChange={e => setConvertForm(p => ({ ...p, quote_id: e.target.value }))}
                      style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,background:T.surface,fontSize:12.5,color:T.t1,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
                      <option value="">— None / decide later —</option>
                      {convertQuotes.map(q => (
                        <option key={q.id} value={q.id}>
                          {q.quote_no} · {q.status} · ₹{Math.round(Number(q.grand_total)||0).toLocaleString("en-IN")}
                        </option>
                      ))}
                    </select>
                    <div style={{fontSize:10.5,color:"#64748B",marginTop:4}}>
                      💡 Pick the quote you settled on. Estimate Builder will pre-fill from it.
                      Skip to keep all quotes available later.
                    </div>
                  </div>
                )}

                <div style={{display:"flex",gap:6}}>
                  <button onClick={cancelConvert} disabled={convertSaving}
                    style={{flex:1,padding:"9px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:convertSaving?"not-allowed":"pointer"}}>
                    Back
                  </button>
                  <button onClick={skipConvert} disabled={convertSaving}
                    title="Mark lead Converted without creating a project"
                    style={{flex:1,padding:"9px",borderRadius:7,background:"white",border:`1px dashed ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:convertSaving?"not-allowed":"pointer"}}>
                    Skip — Just Convert
                  </button>
                  <button onClick={confirmConvertWithProject}
                    disabled={convertSaving || !convertForm.project_name?.trim()}
                    style={{flex:2,padding:"9px",borderRadius:7,
                            background:(convertSaving||!convertForm.project_name?.trim())?"#9CA3AF":"#10B981",
                            color:"white",border:"none",fontSize:12.5,fontWeight:700,
                            cursor:(convertSaving||!convertForm.project_name?.trim())?"not-allowed":"pointer"}}>
                    {convertSaving ? "Creating…" : "Create Project & Convert"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

    {/* Phase 5: Quote Builder modal — opens full-screen over the drawer */}
    {builderOpen && (
      <QuoteBuilderModal
        lead={lead}
        quoteId={builderOpen.quoteId}
        onClose={() => setBuilderOpen(null)}
        onSaved={() => reloadBuilderQuotes()}
      />
    )}
  </>);
}

// ─────────────────────────────────────────────────────────────────
// QUOTE BUILDER MODAL  (Phase 5)
// Full-screen overlay. Two steps: package picker → builder.
// Package picker is filtered by lead's construction_type_id.
// Builder lets user edit section area + category area override +
// per-item rate/addon/description overrides + terms/notes.
// Live compute mirrors backend computeQuotationTotals.
// ─────────────────────────────────────────────────────────────────
const inrIN = (n) => Math.round(Number(n) || 0).toLocaleString("en-IN");
const isSet = (v) => v !== null && v !== undefined && v !== "";

// Download a quotation as PDF. fetch + blob + temp <a> click → triggers
// browser download with the quote_no as filename. We can't use a plain
// <a href> because the route requires the Authorization header (JWT).
async function downloadQuotePdf(quoteId, quoteNo) {
  try {
    const token = getToken();
    const res = await fetch(`${API_BASE}/library/quotations/${quoteId}/pdf`, {
      headers: token ? { Authorization: "Bearer " + token } : {},
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert("PDF download failed: " + (txt || res.status));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (quoteNo || "quotation") + ".pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (e) {
    alert("PDF download failed: " + (e?.message || e));
  }
}

function QuoteBuilderModal({ lead, quoteId: editQuoteId, onClose, onSaved }){
  // ── Step state ─────────────────────────────────────────────────
  const [step, setStep] = useState(editQuoteId ? "loading" : "package");
  const [loadError, setLoadError] = useState("");

  // ── Package picker state ───────────────────────────────────────
  const [allPackages, setAllPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);

  // ── Builder state ──────────────────────────────────────────────
  const [pkgStructures, setPkgStructures] = useState([]);
  const [pkgCategories, setPkgCategories] = useState([]);
  const [pkgItems, setPkgItems] = useState({});     // { [sid]: pcrRows[] }
  const [measurements, setMeasurements] = useState({ sections: {} });
  const [validity, setValidity] = useState(30);
  const [terms, setTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [quoteId, setQuoteId] = useState(editQuoteId || null);
  const [quoteNo, setQuoteNo] = useState("");
  const [status, setStatus] = useState("Draft");
  const [savedGrandTotal, setSavedGrandTotal] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // ── Save state ─────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [sendingStage, setSendingStage] = useState(false);

  // ── UI fold state ──────────────────────────────────────────────
  const [collapsedSections, setCollapsedSections] = useState({});
  const [collapsedCats, setCollapsedCats] = useState({});

  // ── Edit-mode toggle ───────────────────────────────────────────
  // Default = view mode (read-only base/add_on/description + + Add
  // buttons hidden). Area / per-item Qty stay editable regardless —
  // those are the QUOTE's primary inputs that a salesperson changes
  // per client. "✎ Edit Package" click flips into edit mode, where
  // structural changes (add section/category/item) + master rate
  // edits become available.
  const [editMode, setEditMode] = useState(false);

  // ── Inline-edit state (Add Section / Category / Item from builder) ──
  // All structural adds PERSIST to the library so future quotes also see
  // them. Per-item rate/qty tweaks stay quote-scoped in measurements.
  const [pkgEditOpen,     setPkgEditOpen]     = useState(false);
  const [pkgEditForm,     setPkgEditForm]     = useState({});
  const [pkgEditSaving,   setPkgEditSaving]   = useState(false);
  const [addSecModal,     setAddSecModal]     = useState(false);
  const [addSecForm,      setAddSecForm]      = useState({ name: "", default_qty: 0, unit: "sqft", per_item_qty: false });
  const [addSecSaving,    setAddSecSaving]    = useState(false);
  const [addCatDrawer,    setAddCatDrawer]    = useState(null); // {structure_id, section_name}
  const [addCatPicks,     setAddCatPicks]     = useState([]);   // ordered ids
  const [addCatNewForm,   setAddCatNewForm]   = useState(null);
  const [addCatSaving,    setAddCatSaving]    = useState(false);
  const [addItemDrawer,   setAddItemDrawer]   = useState(null); // {structure_id, category_id, ...}
  const [addItemPicks,    setAddItemPicks]    = useState([]);
  const [addItemSearch,   setAddItemSearch]   = useState("");
  const [addItemNewForm,  setAddItemNewForm]  = useState(null);
  const [addItemSaving,   setAddItemSaving]   = useState(false);
  // Master library lookups for the Add Category / Item drawers
  const [allWorkCats,     setAllWorkCats]     = useState([]);
  const [allBoqItems,     setAllBoqItems]     = useState([]);
  const [allUoms,         setAllUoms]         = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const [wc, bi, u] = await Promise.all([
          api.get("/library/work-categories"),
          api.get("/library/boq-items"),
          api.get("/library/uom").catch(() => ({ success: false })),
        ]);
        if (wc?.success) setAllWorkCats(wc.data || []);
        if (bi?.success) setAllBoqItems(bi.data || []);
        if (u?.success)  setAllUoms(u.data || []);
      } catch (_) {}
    })();
  }, []);
  const toggleCatPick  = (id) => setAddCatPicks(p => {
    const idx = p.indexOf(id); return idx >= 0 ? p.filter(x => x !== id) : [...p, id];
  });
  const toggleItemPick = (id) => setAddItemPicks(p => {
    const idx = p.indexOf(id); return idx >= 0 ? p.filter(x => x !== id) : [...p, id];
  });

  // ── Initial load: either fresh (need packages) or edit existing draft ──
  useEffect(() => {
    if (editQuoteId) {
      // Loading existing quote
      (async () => {
        try {
          const r = await api.get("/library/quotations/" + editQuoteId);
          if (!r?.success) throw new Error(r?.message || "Could not load quotation");
          const q = r.data;
          setQuoteId(q.id);
          setQuoteNo(q.quote_no);
          setStatus(q.status);
          setSavedGrandTotal(Number(q.grand_total) || 0);
          setValidity(Number(q.validity_days) || 30);
          setTerms(q.terms || "");
          setNotes(q.notes || "");
          // Hydrate package + sections + categories + items
          const pkgRes = await api.get("/library/rate-packages");
          const pkg = pkgRes.success
            ? (pkgRes.data || []).find(p => p.id === q.package_id)
            : null;
          setSelectedPackage(pkg || { id: q.package_id, name: q.package_name });
          await loadPackageTree(q.package_id, lead.city_id);
          setMeasurements(q.measurements && q.measurements.sections ? q.measurements : { sections: {} });
          setStep("build");
        } catch (e) {
          setLoadError(e.message || "Load failed");
          setStep("package");
        }
      })();
    } else {
      // Fresh quote — load packages, filter by construction_type
      (async () => {
        try {
          const r = await api.get("/library/rate-packages");
          if (r?.success) setAllPackages(r.data || []);
        } catch (_) {}
      })();
    }
    // eslint-disable-next-line
  }, []);

  // ── Load package tree (structures + categories + per-section items) ──
  const loadPackageTree = async (pkgId, cityId) => {
    const [sr, cr] = await Promise.all([
      api.get("/library/packages/" + pkgId + "/structures"),
      api.get("/library/packages/" + pkgId + "/categories"),
    ]);
    const structs = sr?.success ? (sr.data || []) : [];
    const catRows = cr?.success ? (cr.data || []) : [];
    setPkgStructures(structs);
    setPkgCategories(catRows);
    // Parallel item fetch per section
    const itemResults = await Promise.all(structs.map(s =>
      api.get(`/library/rate-matrix?package_id=${pkgId}&city_id=${cityId}&structure_id=${s.id}`)
        .then(r => [s.id, r?.success ? (r.data || []) : []])
        .catch(() => [s.id, []])
    ));
    const itemMap = {};
    for (const [sid, rows] of itemResults) itemMap[sid] = rows;
    setPkgItems(itemMap);
    return { structs, catRows };
  };
  // Refresh tree after structural edits (add section/category/item).
  // Preserves existing measurements for known sections/categories and
  // initialises defaults for newly-added ones.
  const refreshPackageTree = async () => {
    if (!selectedPackage) return;
    const { structs } = await loadPackageTree(selectedPackage.id, lead.city_id);
    setMeasurements(m => {
      const next = { ...m, sections: { ...(m.sections || {}) } };
      for (const s of structs) {
        if (!next.sections[s.id]) {
          next.sections[s.id] = { area: Number(s.default_qty) || 0, categories: {} };
        }
      }
      return next;
    });
  };

  // ── EDIT PACKAGE basics — name + sqft_rate + description ─────
  const openEditPkg = () => {
    if (!selectedPackage) return;
    setPkgEditForm({
      name:        selectedPackage.name || "",
      sqft_rate:   selectedPackage.sqft_rate || 0,
      description: selectedPackage.description || "",
    });
    setPkgEditOpen(true);
  };
  const saveEditPkg = async () => {
    if (!selectedPackage || !pkgEditForm.name?.trim()) return;
    setPkgEditSaving(true);
    const r = await api.put("/library/rate-packages/" + selectedPackage.id, {
      name:        pkgEditForm.name.trim(),
      sqft_rate:   Number(pkgEditForm.sqft_rate) || 0,
      description: pkgEditForm.description || "",
      construction_type_id: selectedPackage.construction_type_id,
    });
    setPkgEditSaving(false);
    if (r?.success) {
      setSelectedPackage(p => ({ ...p, ...pkgEditForm }));
      setPkgEditOpen(false);
    } else alert(r?.message || "Save failed");
  };

  // ── ADD SECTION — POSTs to library, then refresh tree ────────
  const openAddSec = () => {
    setAddSecForm({ name: "", default_qty: 0, unit: "sqft", per_item_qty: false });
    setAddSecModal(true);
  };
  const saveAddSec = async () => {
    if (!selectedPackage || !addSecForm.name?.trim()) return;
    setAddSecSaving(true);
    const r = await api.post("/library/packages/" + selectedPackage.id + "/structures", {
      name:         addSecForm.name.trim(),
      unit:         addSecForm.unit || "sqft",
      rate:         0,
      default_qty:  Number(addSecForm.default_qty) || 0,
      per_item_qty: !!addSecForm.per_item_qty,
    });
    setAddSecSaving(false);
    if (r?.success) {
      await refreshPackageTree();
      setAddSecModal(false);
    } else alert(r?.message || "Save failed");
  };

  // ── ADD CATEGORY drawer (per section) — multi-pick + create new ─
  const openAddCat = (sec) => {
    setAddCatPicks([]); setAddCatNewForm(null);
    setAddCatDrawer({ structure_id: sec.id, section_name: sec.name });
  };
  const confirmAddCat = async () => {
    if (!addCatDrawer || !selectedPackage) return;
    setAddCatSaving(true);
    // sort_order = append after existing in this section
    const existingMax = pkgCategories
      .filter(c => c.structure_id === addCatDrawer.structure_id)
      .reduce((mx, c) => Math.max(mx, Number(c.sort_order) || 0), 0);
    for (let i = 0; i < addCatPicks.length; i++) {
      const id = addCatPicks[i];
      const nm = allWorkCats.find(c => c.id === id)?.name;
      if (!nm) continue;
      await api.post("/library/packages/" + selectedPackage.id + "/categories", {
        structure_id:  addCatDrawer.structure_id,
        category_name: nm,
        sort_order:    existingMax + 1 + i,
      });
    }
    setAddCatSaving(false);
    await refreshPackageTree();
    setAddCatDrawer(null);
  };
  const createAndAddCat = async () => {
    if (!addCatNewForm?.name?.trim() || !addCatDrawer || !selectedPackage) return;
    setAddCatSaving(true);
    const wr = await api.post("/library/work-categories", {
      name: addCatNewForm.name.trim(),
      code: (addCatNewForm.code || "").trim(),
      description: (addCatNewForm.desc || "").trim(),
    });
    if (wr?.success) {
      const existingMax = pkgCategories
        .filter(c => c.structure_id === addCatDrawer.structure_id)
        .reduce((mx, c) => Math.max(mx, Number(c.sort_order) || 0), 0);
      await api.post("/library/packages/" + selectedPackage.id + "/categories", {
        structure_id:  addCatDrawer.structure_id,
        category_name: addCatNewForm.name.trim(),
        sort_order:    existingMax + 1,
      });
      const wcRes = await api.get("/library/work-categories");
      if (wcRes?.success) setAllWorkCats(wcRes.data || []);
      await refreshPackageTree();
      setAddCatNewForm(null);
    } else alert(wr?.message || "Failed");
    setAddCatSaving(false);
  };

  // ── ADD ITEM drawer (per category) — multi-pick + create new ───
  const openAddItem = (sec, cat) => {
    setAddItemPicks([]); setAddItemSearch(""); setAddItemNewForm(null);
    setAddItemDrawer({
      structure_id:  sec.id, section_name: sec.name,
      category_id:   cat.id, category_name: cat.name,
    });
  };
  const confirmAddItems = async () => {
    if (!addItemDrawer || !selectedPackage) return;
    setAddItemSaving(true);
    // Insert the picked items into package_city_rates via /rate-matrix/bulk.
    // We need to PRESERVE existing items in this section + APPEND new ones.
    const sid   = addItemDrawer.structure_id;
    const catId = addItemDrawer.category_id;
    const existing = (pkgItems[sid] || []).map(r => ({
      item_id:     r.item_id,
      category_id: r.category_id,
      base_rate:   (Number(r.rate) || 0) - (Number(r.add_on_rate) || 0),
      add_on_rate: Number(r.add_on_rate) || 0,
      description: r.description || "",
      qty:         Number(r.qty) || 0,
    }));
    const existingIds = new Set(existing.map(r => r.item_id));
    const fresh = addItemPicks
      .filter(id => !existingIds.has(id))
      .map(id => {
        const bi = allBoqItems.find(x => x.id === id);
        return {
          item_id:     id,
          category_id: catId,
          base_rate:   Number(bi?.base_rate) || 0,
          add_on_rate: 0,
          description: "",
          qty:         0,
        };
      });
    const all = [...existing, ...fresh];
    const r = await api.post("/library/rate-matrix/bulk", {
      package_id:   selectedPackage.id,
      city_id:      lead.city_id,
      structure_id: sid,
      items:        all,
    });
    setAddItemSaving(false);
    if (r?.success) {
      await refreshPackageTree();
      setAddItemDrawer(null);
    } else alert(r?.message || "Failed");
  };
  const createAndAddItem = async () => {
    if (!addItemNewForm?.name?.trim() || !addItemDrawer || !selectedPackage) return;
    setAddItemSaving(true);
    const cr = await api.post("/library/boq-items", {
      name:        addItemNewForm.name.trim(),
      category:    addItemNewForm.category || addItemDrawer.category_name,
      unit:        addItemNewForm.unit || "Sq.Ft",
      base_rate:   Number(addItemNewForm.base_rate) || 0,
      description: "",
    });
    if (cr?.success && cr.data) {
      // Refresh master library + immediately insert into the pcr scope
      setAllBoqItems(p => [cr.data, ...p]);
      const sid = addItemDrawer.structure_id;
      const catId = addItemDrawer.category_id;
      const existing = (pkgItems[sid] || []).map(r => ({
        item_id: r.item_id, category_id: r.category_id,
        base_rate: (Number(r.rate)||0) - (Number(r.add_on_rate)||0),
        add_on_rate: Number(r.add_on_rate) || 0,
        description: r.description || "",
        qty: Number(r.qty) || 0,
      }));
      existing.push({
        item_id: cr.data.id, category_id: catId,
        base_rate: Number(cr.data.base_rate) || 0,
        add_on_rate: 0, description: "", qty: 0,
      });
      await api.post("/library/rate-matrix/bulk", {
        package_id:   selectedPackage.id,
        city_id:      lead.city_id,
        structure_id: sid,
        items:        existing,
      });
      await refreshPackageTree();
      setAddItemNewForm(null);
    } else alert(cr?.message || "Save failed");
    setAddItemSaving(false);
  };

  // ── Per-item qty override patcher (quote-scoped) ──────────────
  const patchItemQtyOverride = (sid, cid, itemId, val) => {
    setMeasurements(m => {
      const sec = m.sections[sid] || { area: 0, categories: {} };
      const cat = sec.categories[cid] || {};
      const items = cat.items || {};
      const cur = items[itemId] || {};
      const next = { ...cur };
      if (val === "" || val === null) delete next.qty_override;
      else next.qty_override = val;
      const allEmpty = !isSet(next.base_rate_override) && !isSet(next.add_on_override)
                    && !isSet(next.description_override) && !isSet(next.qty_override);
      const nextItems = { ...items };
      if (allEmpty) delete nextItems[itemId];
      else nextItems[itemId] = next;
      return {
        sections: {
          ...m.sections,
          [sid]: { ...sec, categories: { ...sec.categories, [cid]: { ...cat, items: nextItems } } },
        },
      };
    });
  };

  // ── Package picked → load tree + initialize measurements ──────
  const pickPackage = async (pkg) => {
    setSelectedPackage(pkg);
    setStep("loading");
    const { structs } = await loadPackageTree(pkg.id, lead.city_id);
    // Default measurements: each section's area = its default_qty
    const initSections = {};
    for (const s of structs) {
      initSections[s.id] = {
        area: Number(s.default_qty) || 0,
        categories: {},
      };
    }
    setMeasurements({ sections: initSections });
    setStep("build");
  };

  // ── Measurement patchers ───────────────────────────────────────
  const patchSection = (sid, patch) => setMeasurements(m => ({
    sections: {
      ...m.sections,
      [sid]: { ...(m.sections[sid] || { area: 0, categories: {} }), ...patch },
    },
  }));
  const patchCategory = (sid, cid, patch) => setMeasurements(m => {
    const sec = m.sections[sid] || { area: 0, categories: {} };
    return {
      sections: {
        ...m.sections,
        [sid]: {
          ...sec,
          categories: {
            ...sec.categories,
            [cid]: { ...(sec.categories[cid] || {}), ...patch },
          },
        },
      },
    };
  });
  const patchItem = (sid, cid, itemId, patch) => setMeasurements(m => {
    const sec = m.sections[sid] || { area: 0, categories: {} };
    const cat = sec.categories[cid] || {};
    const items = cat.items || {};
    const cur = items[itemId] || {};
    const nextItem = { ...cur, ...patch };
    // Drop entry if all overrides cleared (cleaner JSON)
    const allEmpty = !isSet(nextItem.base_rate_override)
                  && !isSet(nextItem.add_on_override)
                  && !isSet(nextItem.description_override);
    const nextItems = { ...items };
    if (allEmpty) delete nextItems[itemId];
    else nextItems[itemId] = nextItem;
    return {
      sections: {
        ...m.sections,
        [sid]: {
          ...sec,
          categories: {
            ...sec.categories,
            [cid]: { ...cat, items: nextItems },
          },
        },
      },
    };
  });
  const resetItemRow = (sid, cid, itemId) => patchItem(sid, cid, itemId, {
    base_rate_override: null,
    add_on_override: null,
    description_override: null,
  });

  // ── Live compute (mirrors backend computeQuotationTotals) ──────
  const breakdown = useMemo(() => {
    if (step !== "build") return { grandTotal: 0, sections: [] };
    let grand = 0;
    const sections = pkgStructures.map(s => {
      const sm = measurements.sections[s.id] || {};
      const sArea = isSet(sm.area) ? Number(sm.area) || 0 : Number(s.default_qty || 0);
      const perItem = !!Number(s.per_item_qty);
      const sCats = pkgCategories
        .filter(c => c.structure_id === s.id)
        .sort((a,b) => (a.sort_order||0) - (b.sort_order||0) || a.id - b.id);
      let sTotal = 0;
      const catRows = sCats.map(c => {
        const cm = (sm.categories && sm.categories[c.id]) || {};
        const cArea = isSet(cm.area_override) ? Number(cm.area_override) || 0 : sArea;
        const items = (pkgItems[s.id] || []).filter(it => Number(it.category_id) === Number(c.id));
        const itemOverrides = cm.items || {};
        let cBase = 0, cAddOn = 0, cItemTotalSum = 0;
        const itemRows = items.map(it => {
          const ov = itemOverrides[it.item_id] || {};
          const masterBase  = (Number(it.rate) || 0) - (Number(it.add_on_rate) || 0);
          const masterAddOn = Number(it.add_on_rate) || 0;
          const masterDesc  = it.description || "";
          const masterQty   = Number(it.qty) || 0;
          const base  = isSet(ov.base_rate_override)   ? Number(ov.base_rate_override)   || 0 : masterBase;
          const addOn = isSet(ov.add_on_override)      ? Number(ov.add_on_override)      || 0 : masterAddOn;
          const desc  = isSet(ov.description_override) ? ov.description_override            : masterDesc;
          // Per-item mode: each item carries its own qty (override > pcr master).
          // Uniform mode: every item shares cArea.
          const effQty = perItem
            ? (isSet(ov.qty_override) ? Number(ov.qty_override) || 0 : masterQty)
            : cArea;
          const total = (base + addOn) * effQty;
          cBase += base; cAddOn += addOn; cItemTotalSum += total;
          return {
            item_id: it.item_id, base, addOn, desc, qty: effQty, total,
            masterBase, masterAddOn, masterDesc, masterQty,
            hasOverride: base !== masterBase || addOn !== masterAddOn || desc !== masterDesc
                       || (perItem && isSet(ov.qty_override) && Number(ov.qty_override) !== masterQty),
          };
        });
        // Category total: per-item mode → Σ item totals (each qty-weighted)
        //                 uniform mode → (Σ base + Σ addOn) × cArea
        const cTotal = perItem ? cItemTotalSum : (cBase + cAddOn) * cArea;
        sTotal += cTotal;
        return { ...c, area: cArea, base: cBase, addOn: cAddOn, total: cTotal, items: itemRows };
      });
      grand += sTotal;
      return { ...s, area: sArea, per_item_qty: perItem ? 1 : 0, total: sTotal, categories: catRows };
    });
    return { grandTotal: grand, sections };
    // eslint-disable-next-line
  }, [measurements, pkgStructures, pkgCategories, pkgItems, step]);

  // ── Save flows ─────────────────────────────────────────────────
  const saveDraft = async () => {
    if (!selectedPackage) return;
    setSaving(true);
    try {
      let res;
      if (quoteId) {
        res = await api.put("/library/quotations/" + quoteId, {
          measurements, validity_days: validity, terms, notes,
        });
      } else {
        res = await api.post("/library/quotations", {
          lead_id: lead.id, package_id: selectedPackage.id,
          measurements, validity_days: validity, terms, notes,
        });
      }
      if (!res?.success) { alert(res?.message || "Save failed"); return null; }
      const q = res.data;
      setQuoteId(q.id); setQuoteNo(q.quote_no);
      setStatus(q.status); setSavedGrandTotal(Number(q.grand_total) || 0);
      if (onSaved) onSaved();
      return q;
    } finally { setSaving(false); }
  };

  const saveAndSend = async () => {
    const q = await saveDraft();
    if (!q) return;
    // Backend handles the Sent → lead.stage='proposal' side-effect +
    // crm_followups timeline entry. We just call the status endpoint.
    setSendingStage(true);
    try {
      const sr = await api.post("/library/quotations/" + q.id + "/status", { status: "Sent" });
      if (!sr?.success) { alert(sr?.message || "Could not mark Sent"); return; }
      if (onSaved) onSaved();
      onClose();
    } finally { setSendingStage(false); }
  };

  // ── Disabled-state derivations ─────────────────────────────────
  const readOnly = status !== "Draft";
  // canEdit = user is in edit mode AND quote is not status-locked.
  // Controls master rate edits + + Add buttons. Area/Qty inputs ignore
  // canEdit and gate on !readOnly only (they're quote-essential).
  const canEdit  = editMode && !readOnly;
  const hasMeasurements = pkgStructures.length > 0;
  const canSave = hasMeasurements && !readOnly && !saving && !sendingStage;

  // ── Filtered packages for picker ───────────────────────────────
  const filteredPackages = allPackages.filter(p =>
    !lead.construction_type_id || Number(p.construction_type_id) === Number(lead.construction_type_id)
  );

  // ── PALETTE ────────────────────────────────────────────────────
  const COL_DARK    = "#0F172A";
  const COL_DARK2   = "#1E293B";
  const COL_CAT_BG  = "#F1F5F9";
  const COL_AMBER   = "#F59E0B";
  const COL_TEAL    = "#0D9488";
  const COL_TEAL_BG = "#CCFBF1";
  const COL_GREEN   = "#059669";
  const COL_BLUE    = "#2563EB";
  const COL_RED     = "#EF4444";

  // Status pill
  const statusColor = {
    Draft:    { bg:"#FEF3C7", fg:"#92400E", dot:"#F59E0B" },
    Sent:     { bg:"#DBEAFE", fg:"#1E40AF", dot:"#2563EB" },
    Accepted: { bg:"#D1FAE5", fg:"#065F46", dot:"#059669" },
    Rejected: { bg:"#FEE2E2", fg:"#991B1B", dot:"#DC2626" },
    Expired:  { bg:"#E5E7EB", fg:"#4B5563", dot:"#6B7280" },
  }[status] || { bg:"#FEF3C7", fg:"#92400E", dot:"#F59E0B" };

  return (
    <div style={{ position:"fixed", inset:0, background:"white", zIndex:900,
                  display:"flex", flexDirection:"column", fontFamily:"inherit" }}>
      {/* ─── HEADER ───────────────────────────────────────────── */}
      <div style={{ background:COL_DARK, padding:"12px 24px", color:"white",
                    display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, display:"flex", gap:10, alignItems:"center" }}>
            {step === "package" ? "New Quotation" : (quoteNo || "New Quotation")}
            {step === "build" && (
              <span style={{ padding:"2px 9px", fontSize:10.5, fontWeight:700, borderRadius:4,
                             background:statusColor.bg, color:statusColor.fg, display:"inline-flex", gap:5, alignItems:"center" }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:statusColor.dot }}/>
                {status}
              </span>
            )}
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:2 }}>
            {lead.name} · {lead.city_name || lead.city || "—"} · {lead.construction_type_name || lead.projType || "—"}
            {step === "build" && selectedPackage && <> · <strong style={{color:"white"}}>{selectedPackage.name}</strong></>}
          </div>
        </div>
        <button onClick={onClose} disabled={saving || sendingStage}
          style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)",
                   fontSize:26, cursor:(saving||sendingStage)?"not-allowed":"pointer", lineHeight:1 }}>×</button>
      </div>

      {/* ─── BODY ─────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", background:"#F8FAFC" }}>
        {step === "loading" && (
          <div style={{ padding:"60px 20px", textAlign:"center", color:"#64748B", fontSize:13 }}>
            Loading quotation…
          </div>
        )}

        {/* STEP 1: PACKAGE PICKER */}
        {step === "package" && (
          <div style={{ maxWidth:880, margin:"0 auto", padding:"24px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase",
                          letterSpacing:".5px", marginBottom:8 }}>
              Pick a package
            </div>
            {loadError && (
              <div style={{ padding:"10px 14px", background:"#FEE2E2", border:"1px solid #FECACA",
                            borderRadius:8, color:"#991B1B", fontSize:12.5, marginBottom:14 }}>
                ⚠️ {loadError}
              </div>
            )}
            {filteredPackages.length === 0 ? (
              <div style={{ padding:"30px 18px", background:"white", border:"1px dashed #CBD5E1",
                            borderRadius:10, textAlign:"center", color:"#64748B", fontSize:13 }}>
                No packages defined for <strong>{lead.construction_type_name || "this construction type"}</strong> yet.
                <div style={{ marginTop:6, fontSize:12, color:"#9CA3AF" }}>
                  Go to <strong>Library → Client BOQ Rate</strong> to set one up.
                </div>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:12 }}>
                {filteredPackages.map(pkg => (
                  <div key={pkg.id} onClick={() => pickPackage(pkg)}
                    style={{ padding:"16px 18px", background:"white", borderRadius:10,
                             border:"2px solid #E5E7EB", cursor:"pointer", transition:"all .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = COL_BLUE; e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.12)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#0F172A", marginBottom:4 }}>{pkg.name}</div>
                    {pkg.sqft_rate > 0 && (
                      <div style={{ fontSize:12, color:"#64748B" }}>Rs.{inrIN(pkg.sqft_rate)}/sqft</div>
                    )}
                    {pkg.description && (
                      <div style={{ fontSize:11, color:"#94A3B8", marginTop:6, lineHeight:1.4 }}>{pkg.description}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: BUILDER */}
        {step === "build" && (
          <div style={{ maxWidth:1180, margin:"0 auto", padding:"16px 20px 24px" }}>
            {/* Drift banner — backend computed_grand_total vs saved grand_total */}
            {quoteId && Math.abs(breakdown.grandTotal - savedGrandTotal) > 0.5 && !readOnly && (
              <div style={{ padding:"9px 14px", background:"#FFFBEB", border:"1px solid #FCD34D",
                            borderRadius:8, color:"#92400E", fontSize:12, marginBottom:12 }}>
                💡 Master rates or your edits changed since last save. Save Draft to sync.
              </div>
            )}

            {/* Quote settings (collapsible) */}
            <div style={{ background:"white", borderRadius:10, border:"1px solid #E5E7EB", marginBottom:14 }}>
              <div onClick={() => setShowSettings(s => !s)}
                style={{ padding:"10px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10,
                         borderBottom: showSettings ? "1px solid #E5E7EB" : "none" }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2.5}
                  style={{ transition:"transform .15s", transform: showSettings ? "rotate(90deg)" : "rotate(0deg)" }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <span style={{ fontSize:12, fontWeight:700, color:"#0F172A", textTransform:"uppercase", letterSpacing:".4px" }}>
                  Quote Settings
                </span>
                <span style={{ fontSize:11, color:"#64748B", marginLeft:"auto" }}>
                  Validity: {validity} days
                </span>
              </div>
              {showSettings && (
                <div style={{ padding:"14px" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"140px 1fr", gap:14, marginBottom:10 }}>
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4, textTransform:"uppercase" }}>Validity (days)</label>
                      <input type="number" value={validity}
                        onChange={e => setValidity(Number(e.target.value) || 0)}
                        disabled={readOnly}
                        style={{ width:"100%", padding:"7px 9px", borderRadius:6, border:"1.5px solid #D1D5DB", fontSize:12.5, outline:"none", fontFamily:"inherit", textAlign:"right", boxSizing:"border-box" }}/>
                    </div>
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4, textTransform:"uppercase" }}>Notes (internal)</label>
                      <input value={notes} onChange={e => setNotes(e.target.value)}
                        disabled={readOnly} placeholder="Optional"
                        style={{ width:"100%", padding:"7px 9px", borderRadius:6, border:"1.5px solid #D1D5DB", fontSize:12.5, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4, textTransform:"uppercase" }}>Terms &amp; Conditions</label>
                    <textarea value={terms} onChange={e => setTerms(e.target.value)}
                      disabled={readOnly} rows={3} placeholder="Payment terms, warranty, exclusions..."
                      style={{ width:"100%", padding:"7px 9px", borderRadius:6, border:"1.5px solid #D1D5DB", fontSize:12, outline:"none", fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
                  </div>
                </div>
              )}
            </div>

            {/* Package controls — Edit toggle + (when ON) basics modal + Add Section */}
            {!readOnly && (
              <div style={{ display:"flex", gap:8, justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <button onClick={() => setEditMode(m => !m)}
                    title={canEdit ? "Exit edit mode — back to quoting view" : "Unlock structural edits + master rate changes"}
                    style={{ padding:"6px 14px", borderRadius:6,
                             background: canEdit ? "#10B981" : "white",
                             border:"1.5px solid " + (canEdit ? "#10B981" : "#94A3B8"),
                             color: canEdit ? "white" : "#334155",
                             fontSize:11.5, fontWeight:700, cursor:"pointer",
                             display:"flex", alignItems:"center", gap:5 }}>
                    {canEdit ? "✓ Done Editing" : "✎ Edit Package"}
                  </button>
                  {canEdit && (
                    <button onClick={openEditPkg}
                      title="Edit package name / per-sqft rate / description"
                      style={{ padding:"6px 11px", borderRadius:6, background:"white",
                               border:"1px dashed #94A3B8", fontSize:11, fontWeight:600,
                               color:"#475569", cursor:"pointer" }}>
                      Package basics…
                    </button>
                  )}
                </div>
                {canEdit && (
                  <button onClick={openAddSec}
                    style={{ padding:"6px 12px", borderRadius:6, background:"white",
                             border:"1.5px solid " + COL_DARK, fontSize:11.5, fontWeight:700,
                             color: COL_DARK, cursor:"pointer" }}>
                    + Add Section
                  </button>
                )}
              </div>
            )}

            {/* Sections tree */}
            {breakdown.sections.length === 0 ? (
              <div style={{ padding:"30px 18px", background:"white", border:"1px dashed #CBD5E1",
                            borderRadius:10, textAlign:"center", color:"#64748B", fontSize:13 }}>
                This package has no sections yet. {!readOnly && <span>Click <strong>+ Add Section</strong> above.</span>}
              </div>
            ) : breakdown.sections.map(sec => {
              const sCollapsed = !!collapsedSections[sec.id];
              const noAreaHint = sec.area === 0;
              const secPerItem = !!sec.per_item_qty;
              return (
                <div key={sec.id}
                  style={{ background:"white", borderRadius:10, border:"1px solid #E5E7EB", marginBottom:12, overflow:"hidden" }}>
                  {/* Section header */}
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 16px", background:COL_DARK, color:"white" }}>
                    <span onClick={() => setCollapsedSections(p => ({ ...p, [sec.id]: !p[sec.id] }))}
                      style={{ cursor:"pointer", display:"flex" }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={2.5}
                        style={{ transition:"transform .15s", transform: sCollapsed ? "rotate(0deg)" : "rotate(90deg)" }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </span>
                    <span style={{ fontWeight:700, fontSize:14, color:"white" }}>{sec.name}</span>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.45)" }}>
                      · {sec.categories.length} categ{sec.categories.length === 1 ? "ory" : "ories"}
                    </span>
                    {noAreaHint && !readOnly && !secPerItem && (
                      <span style={{ marginLeft:6, padding:"2px 8px", fontSize:10.5, fontWeight:600,
                                     background:"rgba(252,211,77,0.18)", color:"#FCD34D", borderRadius:4, border:"1px solid rgba(252,211,77,0.35)" }}>
                        set area
                      </span>
                    )}
                    {secPerItem && (
                      <span style={{ marginLeft:6, padding:"2px 8px", fontSize:10, fontWeight:700,
                                     background:"rgba(245,158,11,0.22)", color:"#FCD34D",
                                     border:"1px solid #F59E0B", borderRadius:4,
                                     letterSpacing:".3px", textTransform:"uppercase" }}>
                        Per-item Qty
                      </span>
                    )}
                    <div style={{ marginLeft:"auto", display:"flex", gap:12, alignItems:"center", fontSize:11.5, fontWeight:600 }}>
                      {/* Aggregates only when in uniform mode — per-item mode
                          totals are item-by-item so per-sqft / aggregated Area
                          are mathematically meaningless. */}
                      {!secPerItem && (
                        <>
                          <span style={{ padding:"3px 9px", background:COL_TEAL_BG, color:COL_TEAL, borderRadius:4, fontWeight:700 }}>
                            Rs.{inrIN(sec.base + sec.addOn || 0)}/{sec.unit || "sqft"}
                          </span>
                          <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <span style={{ color:"rgba(255,255,255,0.55)", fontSize:11, textTransform:"uppercase" }}>Area</span>
                            {readOnly ? (
                              <span style={{ padding:"4px 8px", color:"white", fontWeight:700, fontSize:12 }}>{inrIN(sec.area)}</span>
                            ) : (
                              <input type="number" value={sec.area}
                                onChange={e => patchSection(sec.id, { area: e.target.value })}
                                style={{ width:80, padding:"5px 8px", borderRadius:5, textAlign:"right",
                                         fontFamily:"inherit", fontSize:12, fontWeight:700,
                                         border:"1.5px solid rgba(255,255,255,0.2)",
                                         background:"rgba(255,255,255,0.08)", color:"white", outline:"none" }}/>
                            )}
                          </span>
                        </>
                      )}
                      <span style={{ color:"rgba(255,255,255,0.6)" }}>Total <strong style={{ color:COL_TEAL_BG, fontSize:13 }}>Rs.{inrIN(sec.total)}</strong></span>
                    </div>
                  </div>

                  {/* Categories */}
                  {!sCollapsed && (
                    <div style={{ padding:10 }}>
                      {sec.categories.length === 0 && (
                        <div style={{ padding:"14px 12px", textAlign:"center", color:"#9CA3AF", fontSize:12.5 }}>
                          No categories.
                        </div>
                      )}
                      {sec.categories.map(cat => {
                        const catKey = `${sec.id}:${cat.id}`;
                        const catCollapsed = !!collapsedCats[catKey];
                        const cm = measurements.sections[sec.id]?.categories?.[cat.id] || {};
                        const overrideVal = isSet(cm.area_override) ? String(cm.area_override) : "";
                        return (
                          <div key={cat.id} style={{ marginBottom:10, border:"1px solid #E5E7EB", borderRadius:8, overflow:"hidden" }}>
                            {/* Category header */}
                            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:COL_CAT_BG, borderBottom: catCollapsed ? "none" : "1px solid #E5E7EB" }}>
                              <span onClick={() => setCollapsedCats(p => ({ ...p, [catKey]: !p[catKey] }))}
                                style={{ cursor:"pointer", display:"flex" }}>
                                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2.5}
                                  style={{ transition:"transform .15s", transform: catCollapsed ? "rotate(0deg)" : "rotate(90deg)" }}>
                                  <polyline points="9 18 15 12 9 6"/>
                                </svg>
                              </span>
                              <span style={{ fontWeight:700, fontSize:12.5, color:"#0F172A" }}>{cat.name}</span>
                              <span style={{ fontSize:10.5, color:"#94A3B8" }}>· {cat.items.length} item{cat.items.length === 1 ? "" : "s"}</span>
                              <div style={{ marginLeft:"auto", display:"flex", gap:10, alignItems:"center", fontSize:11, fontWeight:600 }}>
                                {/* Category Area override hidden when section uses per-item qty */}
                                {!secPerItem && (
                                  <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                                    <span style={{ color:"#64748B", fontSize:10.5, textTransform:"uppercase" }}>Area</span>
                                    {readOnly ? (
                                      <span style={{ padding:"3px 7px", color:"#0F172A", fontWeight:700, fontSize:12 }}>{inrIN(cat.area)}</span>
                                    ) : (
                                      <input type="number" value={overrideVal}
                                        onChange={e => patchCategory(sec.id, cat.id, { area_override: e.target.value === "" ? null : e.target.value })}
                                        placeholder={String(sec.area)}
                                        title={overrideVal ? "Override active — clear to inherit section's area" : `Inherits ${sec.area} from section`}
                                        style={{ width:70, padding:"4px 7px", borderRadius:5, textAlign:"right",
                                                 fontFamily:"inherit", fontSize:11.5, fontWeight:700,
                                                 border:"1.5px solid " + (overrideVal ? COL_AMBER : "#CBD5E1"),
                                                 background: overrideVal ? "#FFFBEB" : "white",
                                                 color: overrideVal ? "#92400E" : "#0F172A", outline:"none" }}/>
                                    )}
                                  </span>
                                )}
                                <span style={{ color:"#64748B" }}>Total <strong style={{ color:COL_GREEN }}>Rs.{inrIN(cat.total)}</strong></span>
                              </div>
                            </div>

                            {/* Items */}
                            {!catCollapsed && (
                              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                                <thead>
                                  <tr style={{ background:"#FAFAFA" }}>
                                    <th style={{ padding:"7px 12px", textAlign:"left", fontSize:10, fontWeight:700, color:"#64748B", textTransform:"uppercase" }}>Item</th>
                                    <th style={{ padding:"7px 12px", textAlign:"right", fontSize:10, fontWeight:700, color:"#64748B", textTransform:"uppercase", width:100 }}>Base</th>
                                    <th style={{ padding:"7px 12px", textAlign:"right", fontSize:10, fontWeight:700, color:COL_AMBER, textTransform:"uppercase", width:100 }}>Add-on</th>
                                    <th style={{ padding:"7px 12px", textAlign:"left", fontSize:10, fontWeight:700, color:"#64748B", textTransform:"uppercase" }}>Description</th>
                                    <th style={{ padding:"7px 12px", textAlign:"right", fontSize:10, fontWeight:700, color:COL_TEAL, textTransform:"uppercase", width:70 }}>Area</th>
                                    <th style={{ padding:"7px 12px", textAlign:"right", fontSize:10, fontWeight:700, color:COL_GREEN, textTransform:"uppercase", width:110 }}>Total</th>
                                    <th style={{ width:36 }}/>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cat.items.length === 0 && (
                                    <tr><td colSpan={7} style={{ padding:"12px", textAlign:"center", color:"#9CA3AF", fontSize:12 }}>No items.</td></tr>
                                  )}
                                  {cat.items.map((it, idx) => {
                                    // Look up master item name from boqItems? We don't have it here.
                                    // Instead use the pcr row's item_id mapping — we'd need to join.
                                    // Pull name from pkgItems master rows via a quick find.
                                    const pcr = (pkgItems[sec.id] || []).find(p => p.item_id === it.item_id) || {};
                                    const itemName = pcr.item_name || pcr.name || ("Item #" + it.item_id);
                                    const itemUnit = pcr.unit || "—";
                                    const overrideEntry = measurements.sections[sec.id]?.categories?.[cat.id]?.items?.[it.item_id] || {};
                                    const baseVal  = isSet(overrideEntry.base_rate_override)   ? overrideEntry.base_rate_override   : "";
                                    const addOnVal = isSet(overrideEntry.add_on_override)      ? overrideEntry.add_on_override      : "";
                                    const descVal  = isSet(overrideEntry.description_override) ? overrideEntry.description_override : "";
                                    return (
                                      <tr key={it.item_id} style={{ background: it.hasOverride ? "#FFFBEB" : (idx % 2 === 0 ? "white" : "#FAFAFA"), borderBottom:"1px solid #F3F4F6" }}>
                                        <td style={{ padding:"8px 12px", fontWeight:600, fontSize:12.5, color:"#0F172A" }}>
                                          {itemName}
                                          {it.hasOverride && (
                                            <span style={{ marginLeft:6, padding:"1px 6px", fontSize:9.5, fontWeight:700, background:COL_AMBER, color:"white", borderRadius:3 }}>EDITED</span>
                                          )}
                                          <div style={{ fontSize:10, color:"#94A3B8", marginTop:1 }}>{itemUnit}</div>
                                        </td>
                                        <td style={{ padding:"8px 12px", textAlign:"right" }}>
                                          {canEdit ? (
                                            <input type="number" value={baseVal} placeholder={String(it.masterBase)}
                                              onChange={e => patchItem(sec.id, cat.id, it.item_id, { base_rate_override: e.target.value === "" ? null : e.target.value })}
                                              title={`Master: Rs.${inrIN(it.masterBase)} · leave blank to use master`}
                                              style={{ width:90, padding:"5px 7px", borderRadius:5, textAlign:"right", fontFamily:"inherit", fontSize:12.5,
                                                       border:"1.5px solid " + (baseVal !== "" ? COL_AMBER : "#E5E7EB"),
                                                       background: baseVal !== "" ? "#FFFBEB" : "white", outline:"none",
                                                       color: baseVal !== "" ? "#92400E" : "#0F172A", fontWeight: baseVal !== "" ? 700 : 500 }}/>
                                          ) : (
                                            <span style={{ fontSize:12.5, fontWeight:600 }}>{inrIN(it.base)}</span>
                                          )}
                                        </td>
                                        <td style={{ padding:"8px 12px", textAlign:"right" }}>
                                          {canEdit ? (
                                            <input type="number" value={addOnVal} placeholder={String(it.masterAddOn)}
                                              onChange={e => patchItem(sec.id, cat.id, it.item_id, { add_on_override: e.target.value === "" ? null : e.target.value })}
                                              title={`Master: Rs.${inrIN(it.masterAddOn)} · leave blank to use master`}
                                              style={{ width:90, padding:"5px 7px", borderRadius:5, textAlign:"right", fontFamily:"inherit", fontSize:12.5,
                                                       border:"1.5px solid " + (addOnVal !== "" ? COL_AMBER : "#E5E7EB"),
                                                       background: addOnVal !== "" ? "#FFFBEB" : "white", outline:"none",
                                                       color: COL_AMBER, fontWeight: addOnVal !== "" ? 700 : 500 }}/>
                                          ) : (
                                            <span style={{ fontSize:12.5, fontWeight:600, color:COL_AMBER }}>{inrIN(it.addOn)}</span>
                                          )}
                                        </td>
                                        <td style={{ padding:"8px 12px" }}>
                                          {canEdit ? (
                                            <input type="text" value={descVal} placeholder={it.masterDesc || "Optional"}
                                              onChange={e => patchItem(sec.id, cat.id, it.item_id, { description_override: e.target.value || null })}
                                              title={it.masterDesc ? `Master: ${it.masterDesc}` : "Leave blank to use master"}
                                              style={{ width:"100%", padding:"5px 9px", borderRadius:5, fontFamily:"inherit", fontSize:11.5,
                                                       border:"1.5px solid " + (descVal ? COL_AMBER : "#E5E7EB"),
                                                       background: descVal ? "#FFFBEB" : "white", outline:"none", boxSizing:"border-box" }}/>
                                          ) : (
                                            <span style={{ fontSize:11.5, color:"#475569" }}>{it.desc || "—"}</span>
                                          )}
                                        </td>
                                        {/* Area / Qty column. Per-item mode + editable: amber qty input
                                            for THIS quote (stored as qty_override in measurements).
                                            Uniform mode: shows category/section area. */}
                                        <td style={{ padding:"8px 12px", textAlign:"right", fontSize:12, color:COL_TEAL, fontWeight:600 }}>
                                          {secPerItem && !readOnly ? (
                                            (() => {
                                              const itOv = measurements.sections[sec.id]?.categories?.[cat.id]?.items?.[it.item_id] || {};
                                              const qVal = isSet(itOv.qty_override) ? String(itOv.qty_override) : "";
                                              return (
                                                <input type="number" value={qVal}
                                                  onChange={e => patchItemQtyOverride(sec.id, cat.id, it.item_id, e.target.value)}
                                                  placeholder={String(it.masterQty || 0)}
                                                  title={`Master qty: ${it.masterQty || 0} — leave blank to use master`}
                                                  style={{ width:70, padding:"5px 7px", borderRadius:5, textAlign:"right",
                                                           fontFamily:"inherit", fontSize:12.5,
                                                           border:"1.5px solid " + (qVal ? COL_AMBER : "#E5E7EB"),
                                                           background: qVal ? "#FFFBEB" : "white", outline:"none",
                                                           color: COL_TEAL, fontWeight: 700 }}/>
                                              );
                                            })()
                                          ) : (
                                            inrIN(it.qty != null ? it.qty : cat.area)
                                          )}
                                        </td>
                                        <td style={{ padding:"8px 12px", textAlign:"right", fontSize:13, fontWeight:700, color:COL_GREEN }}>
                                          Rs.{inrIN(it.total)}
                                        </td>
                                        <td style={{ padding:"8px 6px", textAlign:"center" }}>
                                          {it.hasOverride && canEdit && (
                                            <button onClick={() => resetItemRow(sec.id, cat.id, it.item_id)}
                                              title="Reset to master rates"
                                              style={{ background:"transparent", border:"1px solid #E5E7EB", color:"#64748B", borderRadius:4, width:22, height:22, fontSize:11, cursor:"pointer" }}>
                                              ↺
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                            {/* + Add Item per category — only in edit mode */}
                            {!catCollapsed && canEdit && (
                              <div style={{ padding:"7px 12px", borderTop:"1px solid #F3F4F6", background:"#FAFAFA" }}>
                                <button onClick={() => openAddItem(sec, cat)}
                                  style={{ background:"transparent", border:"1px dashed #BFDBFE",
                                           color: COL_BLUE, borderRadius:5,
                                           padding:"4px 11px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                                  + Add Item to {cat.name}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* + Add Category at section bottom — only in edit mode */}
                      {canEdit && (
                        <div style={{ paddingTop:6, textAlign:"right" }}>
                          <button onClick={() => openAddCat(sec)}
                            style={{ background:"white", border:"1px dashed #94A3B8",
                                     color:"#475569", borderRadius:6,
                                     padding:"5px 13px", fontSize:11.5, fontWeight:700, cursor:"pointer" }}>
                            + Add Category
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Grand Total bar */}
            {breakdown.sections.length > 0 && (
              <div style={{ marginTop:10, padding:"14px 20px", background:COL_DARK, color:"white",
                            borderRadius:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:".4px", color:"rgba(255,255,255,0.7)" }}>
                  Grand Total
                </span>
                <span style={{ fontSize:20, fontWeight:700, color:COL_TEAL_BG }}>
                  Rs.{inrIN(breakdown.grandTotal)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      {step === "build" && (
        <div style={{ borderTop:"1px solid #E5E7EB", background:"white",
                      padding:"12px 24px", display:"flex", gap:8, alignItems:"center" }}>
          {!editQuoteId && !quoteId && (
            <button onClick={() => setStep("package")} disabled={saving || sendingStage}
              style={{ padding:"9px 16px", borderRadius:7, border:"1px solid #D1D5DB", background:"white",
                       fontSize:12.5, color:"#475569", fontWeight:600, cursor:(saving||sendingStage)?"not-allowed":"pointer" }}>
              ← Back to Packages
            </button>
          )}
          <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
            {/* PDF download + WhatsApp share — only when quote saved */}
            {quoteId && (
              <button onClick={() => downloadQuotePdf(quoteId, quoteNo)}
                title="Download as PDF"
                style={{ padding:"9px 14px", borderRadius:7, background:"white", border:"1.5px solid #94A3B8",
                         fontSize:12.5, fontWeight:700, color:"#334155", cursor:"pointer",
                         display:"flex", alignItems:"center", gap:6 }}>
                📄 Download PDF
              </button>
            )}
            {quoteId && lead.phone && (
              <button onClick={() => {
                  const phone = (lead.phone || "").replace(/\D/g, "");
                  if (!phone) return;
                  const firstName = (lead.name || "").split(" ")[0] || "Sir/Ma'am";
                  const total = "₹" + Math.round(Number(breakdown.grandTotal) || Number(savedGrandTotal) || 0).toLocaleString("en-IN");
                  const msg = [
                    `Namaskar ${firstName} ji 🙏`, ``,
                    `Aapka quotation taiyar hai:`,
                    `• Quote No: *${quoteNo}*`,
                    `• Package: ${selectedPackage?.name || ""}`,
                    `• Grand Total: *${total}*`,
                    `• Validity: ${validity || 30} days`, ``,
                    `PDF aapko alag se share karta hu. Kripya review karein aur apne vichar batayein.`, ``,
                    `— GB Buildcon`,
                  ].join("\n");
                  const intl = phone.length === 10 ? "91" + phone : phone;
                  window.open("https://wa.me/" + intl + "?text=" + encodeURIComponent(msg), "_blank");
                }}
                title="Share via WhatsApp"
                style={{ padding:"9px 14px", borderRadius:7, background:"#F0FDF4", border:"1.5px solid #86EFAC",
                         fontSize:12.5, fontWeight:700, color:"#166534", cursor:"pointer",
                         display:"flex", alignItems:"center", gap:6 }}>
                📱 WhatsApp
              </button>
            )}
            <button onClick={onClose} disabled={saving || sendingStage}
              style={{ padding:"9px 18px", borderRadius:7, background:"#F8FAFC", border:"1px solid #D1D5DB",
                       fontSize:12.5, fontWeight:600, color:"#374151", cursor:(saving||sendingStage)?"not-allowed":"pointer" }}>
              Cancel
            </button>
            {!readOnly && (
              <>
                <button onClick={saveDraft} disabled={!canSave}
                  style={{ padding:"9px 18px", borderRadius:7, background: canSave ? "white" : "#F1F5F9",
                           border:"1.5px solid " + (canSave ? COL_BLUE : "#D1D5DB"),
                           color: canSave ? COL_BLUE : "#9CA3AF",
                           fontSize:12.5, fontWeight:700, cursor: canSave ? "pointer" : "not-allowed" }}>
                  {saving ? "Saving…" : "Save Draft"}
                </button>
                <button onClick={saveAndSend} disabled={!canSave}
                  style={{ padding:"9px 22px", borderRadius:7,
                           background: canSave ? COL_BLUE : "#9CA3AF",
                           color:"white", border:"none", fontSize:12.5, fontWeight:700,
                           cursor: canSave ? "pointer" : "not-allowed" }}>
                  {sendingStage ? "Sending…" : "Save & Send"}
                </button>
              </>
            )}
            {readOnly && (
              <span style={{ padding:"9px 18px", fontSize:12, color:"#64748B" }}>
                This quote is <strong>{status}</strong>. Read-only.
              </span>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          EDIT PACKAGE MODAL — basics only (name + sqft_rate + description).
          For deep edits (sections / items / category renames) use Library.
      ═══════════════════════════════════════════════════════════════ */}
      {pkgEditOpen && (
        <>
          <div onClick={() => !pkgEditSaving && setPkgEditOpen(false)}
            style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:920 }}/>
          <div onClick={e => e.stopPropagation()}
            style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
                     width:"min(460px,95vw)", background:"white", borderRadius:12, zIndex:921,
                     boxShadow:"0 24px 64px rgba(0,0,0,0.35)" }}>
            <div style={{ background:COL_DARK, padding:"13px 18px", borderRadius:"12px 12px 0 0",
                          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"white" }}>Edit Package</div>
                <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.55)", marginTop:1 }}>
                  Changes save to library — affects future quotes too
                </div>
              </div>
              <button onClick={() => !pkgEditSaving && setPkgEditOpen(false)}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
            </div>
            <div style={{ padding:18 }}>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:3, textTransform:"uppercase" }}>Name *</label>
                <input autoFocus value={pkgEditForm.name || ""}
                  onChange={e => setPkgEditForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width:"100%", padding:"8px 11px", borderRadius:6, border:"1.5px solid #D1D5DB",
                           fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
              </div>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:3, textTransform:"uppercase" }}>Per-sqft Rate (Rs.)</label>
                <input type="number" value={pkgEditForm.sqft_rate ?? 0}
                  onChange={e => setPkgEditForm(p => ({ ...p, sqft_rate: e.target.value }))}
                  style={{ width:"100%", padding:"8px 11px", borderRadius:6, border:"1.5px solid #D1D5DB",
                           fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", textAlign:"right" }}/>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:3, textTransform:"uppercase" }}>Description</label>
                <input value={pkgEditForm.description || ""}
                  onChange={e => setPkgEditForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional"
                  style={{ width:"100%", padding:"8px 11px", borderRadius:6, border:"1.5px solid #D1D5DB",
                           fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
              </div>
            </div>
            <div style={{ padding:"12px 16px", borderTop:"1px solid #E5E7EB", display:"flex", gap:8, background:"#F9FAFB" }}>
              <button onClick={() => !pkgEditSaving && setPkgEditOpen(false)} disabled={pkgEditSaving}
                style={{ flex:1, padding:"9px", borderRadius:6, border:"1px solid #D1D5DB",
                         background:"white", fontSize:13, color:"#374151", cursor: pkgEditSaving ? "not-allowed":"pointer" }}>
                Cancel
              </button>
              <button onClick={saveEditPkg} disabled={pkgEditSaving || !pkgEditForm.name?.trim()}
                style={{ flex:2, padding:"9px", borderRadius:6,
                         background:(pkgEditSaving||!pkgEditForm.name?.trim())?"#9CA3AF":COL_BLUE,
                         color:"white", border:"none", fontSize:13, fontWeight:700,
                         cursor:(pkgEditSaving||!pkgEditForm.name?.trim())?"not-allowed":"pointer" }}>
                {pkgEditSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ADD SECTION MODAL (centered)
      ═══════════════════════════════════════════════════════════════ */}
      {addSecModal && (
        <>
          <div onClick={() => !addSecSaving && setAddSecModal(false)}
            style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:920 }}/>
          <div onClick={e => e.stopPropagation()}
            style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
                     width:"min(460px,95vw)", background:"white", borderRadius:12, zIndex:921,
                     boxShadow:"0 24px 64px rgba(0,0,0,0.35)" }}>
            <div style={{ background:COL_DARK, padding:"13px 18px", borderRadius:"12px 12px 0 0",
                          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"white" }}>Add Section</div>
                <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.55)", marginTop:1 }}>
                  Saves to library. Package: {selectedPackage?.name}
                </div>
              </div>
              <button onClick={() => !addSecSaving && setAddSecModal(false)}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
            </div>
            <div style={{ padding:18 }}>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:3, textTransform:"uppercase" }}>Name *</label>
                <input autoFocus value={addSecForm.name}
                  onChange={e => setAddSecForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Ground Floor, Other Civil Work"
                  style={{ width:"100%", padding:"8px 11px", borderRadius:6, border:"1.5px solid #D1D5DB",
                           fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:COL_TEAL, display:"block", marginBottom:3, textTransform:"uppercase" }}>Area / Qty</label>
                  <input type="number" value={addSecForm.default_qty}
                    onChange={e => setAddSecForm(p => ({ ...p, default_qty: e.target.value }))}
                    placeholder="0"
                    style={{ width:"100%", padding:"8px 11px", borderRadius:6, border:"1.5px solid " + COL_TEAL_BG,
                             fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", textAlign:"right", background:"#F0FDFA" }}/>
                </div>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:3, textTransform:"uppercase" }}>Unit</label>
                  <select value={addSecForm.unit}
                    onChange={e => setAddSecForm(p => ({ ...p, unit: e.target.value }))}
                    style={{ width:"100%", padding:"8px 11px", borderRadius:6, border:"1.5px solid #D1D5DB",
                             fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", background:"white" }}>
                    <option value="sqft">sqft</option>
                    <option value="lump_sum">lump sum</option>
                    <option value="rft">rft</option>
                    <option value="nos">nos</option>
                    <option value="cubic_ft">cubic ft</option>
                  </select>
                </div>
              </div>
              {/* Per-item qty toggle */}
              <div style={{ padding:"9px 11px", background: addSecForm.per_item_qty ? "#FFFBEB" : "#F9FAFB",
                            border:"1.5px solid " + (addSecForm.per_item_qty ? "#FCD34D" : "#E5E7EB"),
                            borderRadius:6, cursor:"pointer", userSelect:"none" }}
                onClick={() => setAddSecForm(p => ({ ...p, per_item_qty: !p.per_item_qty }))}>
                <label style={{ display:"flex", alignItems:"center", gap:9, cursor:"pointer" }}>
                  <input type="checkbox" checked={!!addSecForm.per_item_qty} onChange={() => {}}
                    style={{ width:15, height:15, cursor:"pointer", flexShrink:0 }}/>
                  <div>
                    <div style={{ fontSize:11.5, fontWeight:700, color:"#0F172A" }}>
                      Per-item quantity {addSecForm.per_item_qty ? "(ON)" : "(OFF — uniform area)"}
                    </div>
                    <div style={{ fontSize:10, color:"#6B7280", marginTop:1 }}>
                      Each item has its own qty. Best for mixed sections like Other Civil Work.
                    </div>
                  </div>
                </label>
              </div>
            </div>
            <div style={{ padding:"12px 16px", borderTop:"1px solid #E5E7EB", display:"flex", gap:8, background:"#F9FAFB" }}>
              <button onClick={() => !addSecSaving && setAddSecModal(false)} disabled={addSecSaving}
                style={{ flex:1, padding:"9px", borderRadius:6, border:"1px solid #D1D5DB",
                         background:"white", fontSize:13, color:"#374151", cursor: addSecSaving?"not-allowed":"pointer" }}>
                Cancel
              </button>
              <button onClick={saveAddSec} disabled={addSecSaving || !addSecForm.name?.trim()}
                style={{ flex:2, padding:"9px", borderRadius:6,
                         background:(addSecSaving||!addSecForm.name?.trim())?"#9CA3AF":COL_BLUE,
                         color:"white", border:"none", fontSize:13, fontWeight:700,
                         cursor:(addSecSaving||!addSecForm.name?.trim())?"not-allowed":"pointer" }}>
                {addSecSaving ? "Adding…" : "Add Section"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ADD CATEGORY DRAWER (right slide-over, multi-pick + create new)
      ═══════════════════════════════════════════════════════════════ */}
      {addCatDrawer && (() => {
        const alreadyInSection = new Set(
          pkgCategories.filter(c => c.structure_id === addCatDrawer.structure_id).map(c => c.category_name)
        );
        return (
          <>
            <div onClick={() => !addCatSaving && setAddCatDrawer(null)}
              style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.45)", zIndex:920 }}/>
            <div onClick={e => e.stopPropagation()}
              style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(400px,95vw)",
                       background:"white", zIndex:921, boxShadow:"-12px 0 32px rgba(0,0,0,0.18)",
                       display:"flex", flexDirection:"column" }}>
              <div style={{ background:COL_DARK, padding:"13px 16px", color:"white",
                            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700 }}>Add Category</div>
                  <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.55)", marginTop:1 }}>Section: {addCatDrawer.section_name}</div>
                </div>
                <button onClick={() => !addCatSaving && setAddCatDrawer(null)}
                  style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:12 }}>
                {allWorkCats.map(c => {
                  const exists = alreadyInSection.has(c.name);
                  const pickIdx = addCatPicks.indexOf(c.id);
                  const isPicked = pickIdx >= 0;
                  return (
                    <label key={c.id}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:6,
                               cursor: exists ? "not-allowed" : "pointer",
                               background: exists ? "#F3F4F6" : (isPicked ? "#EFF6FF" : "white"),
                               border: "1px solid " + (isPicked ? "#BFDBFE" : "#E5E7EB"),
                               marginBottom:5, opacity: exists ? 0.55 : 1 }}>
                      <input type="checkbox" disabled={exists} checked={isPicked}
                        onChange={() => toggleCatPick(c.id)}
                        style={{ width:16, height:16 }}/>
                      {isPicked && (
                        <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
                                       width:20, height:20, borderRadius:"50%", background:COL_BLUE,
                                       color:"white", fontSize:10.5, fontWeight:700, flexShrink:0 }}>
                          {pickIdx + 1}
                        </span>
                      )}
                      <span style={{ flex:1 }}>
                        <span style={{ fontSize:12.5, fontWeight:600, color:"#0F172A" }}>{c.name}</span>
                        {exists && <span style={{ marginLeft:8, fontSize:10, color:"#9CA3AF" }}>(already added)</span>}
                      </span>
                    </label>
                  );
                })}
                <div style={{ marginTop:12, paddingTop:12, borderTop:"1px dashed #E5E7EB" }}>
                  {addCatNewForm === null ? (
                    <button onClick={() => setAddCatNewForm({ name:"", code:"", desc:"" })}
                      style={{ width:"100%", padding:"8px 12px", background:"#F0FDF4",
                               border:"1px dashed #10B981", color:"#10B981",
                               borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      + Create new category
                    </button>
                  ) : (
                    <div style={{ padding:10, background:"#F9FAFB", borderRadius:6, border:"1px solid #E5E7EB" }}>
                      <input autoFocus value={addCatNewForm.name}
                        onChange={e => setAddCatNewForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Name"
                        style={{ width:"100%", padding:"6px 9px", borderRadius:5, border:"1.5px solid #D1D5DB",
                                 fontSize:12, marginBottom:6, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
                      <input value={addCatNewForm.code}
                        onChange={e => setAddCatNewForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        placeholder="Code (optional)"
                        style={{ width:"100%", padding:"6px 9px", borderRadius:5, border:"1.5px solid #D1D5DB",
                                 fontSize:12, marginBottom:6, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => setAddCatNewForm(null)}
                          style={{ flex:1, padding:6, borderRadius:5, background:"white",
                                   border:"1px solid #D1D5DB", fontSize:11.5, color:"#6B7280", cursor:"pointer" }}>
                          Cancel
                        </button>
                        <button onClick={createAndAddCat} disabled={addCatSaving || !addCatNewForm.name?.trim()}
                          style={{ flex:2, padding:6, borderRadius:5,
                                   background: (addCatSaving||!addCatNewForm.name?.trim())?"#9CA3AF":"#10B981",
                                   color:"white", border:"none", fontSize:11.5, fontWeight:700,
                                   cursor: (addCatSaving||!addCatNewForm.name?.trim())?"not-allowed":"pointer" }}>
                          {addCatSaving ? "Saving…" : "Create + Add"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ padding:"12px 14px", borderTop:"1px solid #E5E7EB", display:"flex", gap:8 }}>
                <button onClick={() => !addCatSaving && setAddCatDrawer(null)} disabled={addCatSaving}
                  style={{ flex:1, padding:"8px", borderRadius:6, border:"1px solid #D1D5DB",
                           background:"white", fontSize:12, color:"#374151", cursor: addCatSaving?"not-allowed":"pointer" }}>
                  Cancel
                </button>
                <button onClick={confirmAddCat} disabled={addCatSaving || addCatPicks.length === 0}
                  style={{ flex:2, padding:"8px", borderRadius:6,
                           background:(addCatSaving||addCatPicks.length===0)?"#9CA3AF":COL_BLUE,
                           color:"white", border:"none", fontSize:12, fontWeight:700,
                           cursor:(addCatSaving||addCatPicks.length===0)?"not-allowed":"pointer" }}>
                  {addCatSaving ? "Adding…" : `Add Selected (${addCatPicks.length})`}
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════
          ADD ITEM DRAWER (right slide-over, items grouped by master cat)
      ═══════════════════════════════════════════════════════════════ */}
      {addItemDrawer && (() => {
        const sid = addItemDrawer.structure_id;
        const alreadyHere = new Set((pkgItems[sid] || []).map(r => r.item_id));
        const q = addItemSearch.trim().toLowerCase();
        const filtered = allBoqItems.filter(i =>
          !q || (i.name || "").toLowerCase().includes(q) || (i.category || "").toLowerCase().includes(q)
        );
        const grouped = filtered.reduce((acc, i) => {
          const k = i.category || "Uncategorized";
          (acc[k] ||= []).push(i);
          return acc;
        }, {});
        return (
          <>
            <div onClick={() => !addItemSaving && setAddItemDrawer(null)}
              style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.45)", zIndex:920 }}/>
            <div onClick={e => e.stopPropagation()}
              style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(480px,95vw)",
                       background:"white", zIndex:921, boxShadow:"-12px 0 32px rgba(0,0,0,0.18)",
                       display:"flex", flexDirection:"column" }}>
              <div style={{ background:COL_DARK, padding:"13px 16px", color:"white",
                            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700 }}>Add Item</div>
                  <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.55)", marginTop:1,
                                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {addItemDrawer.section_name} › {addItemDrawer.category_name}
                  </div>
                </div>
                <button onClick={() => !addItemSaving && setAddItemDrawer(null)}
                  style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
              </div>
              <div style={{ padding:"10px 14px", borderBottom:"1px solid #E5E7EB", background:"#F9FAFB" }}>
                <input value={addItemSearch}
                  onChange={e => setAddItemSearch(e.target.value)}
                  placeholder="Search items…"
                  style={{ width:"100%", padding:"7px 11px", borderRadius:6,
                           border:"1.5px solid #E5E7EB", fontSize:12.5, outline:"none",
                           fontFamily:"inherit", boxSizing:"border-box" }}/>
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
                {Object.entries(grouped).sort((a,b) => a[0].localeCompare(b[0])).map(([catName, items]) => (
                  <div key={catName} style={{ marginBottom:4 }}>
                    <div style={{ padding:"6px 14px", fontSize:10.5, fontWeight:700,
                                  color:"#6B7280", textTransform:"uppercase",
                                  background:"#F3F4F6", letterSpacing:".4px" }}>
                      {catName} <span style={{ color:"#9CA3AF" }}>· {items.length}</span>
                    </div>
                    {items.map(i => {
                      const here = alreadyHere.has(i.id);
                      const pickIdx = addItemPicks.indexOf(i.id);
                      const isPicked = pickIdx >= 0;
                      return (
                        <label key={i.id}
                          style={{ display:"flex", alignItems:"center", gap:10,
                                   padding:"8px 14px", cursor: here ? "not-allowed" : "pointer",
                                   background: here ? "#F9FAFB" : (isPicked ? "#EFF6FF" : "white"),
                                   borderBottom:"1px solid #F3F4F6",
                                   opacity: here ? 0.55 : 1 }}>
                          <input type="checkbox" disabled={here} checked={isPicked}
                            onChange={() => toggleItemPick(i.id)}
                            style={{ width:16, height:16 }}/>
                          {isPicked && (
                            <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
                                           width:20, height:20, borderRadius:"50%", background:COL_BLUE,
                                           color:"white", fontSize:10.5, fontWeight:700, flexShrink:0 }}>
                              {pickIdx + 1}
                            </span>
                          )}
                          <span style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12.5, fontWeight:600, color:"#0F172A" }}>
                              {i.name}{here && <span style={{ marginLeft:8, fontSize:10, color:"#9CA3AF" }}>(already here)</span>}
                            </div>
                            <div style={{ fontSize:10.5, color:"#64748B", marginTop:1 }}>
                              base Rs.{inrIN(i.base_rate)} · {i.unit}
                            </div>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))}
                <div style={{ padding:"12px 14px", borderTop:"1px dashed #E5E7EB", marginTop:8 }}>
                  {addItemNewForm === null ? (
                    <button onClick={() => setAddItemNewForm({ name:"", unit:"Sq.Ft", category: addItemDrawer.category_name, base_rate:0 })}
                      style={{ width:"100%", padding:"8px 12px", background:"#F0FDF4",
                               border:"1px dashed #10B981", color:"#10B981",
                               borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      + Create new item
                    </button>
                  ) : (
                    <div style={{ padding:10, background:"#F9FAFB", borderRadius:6, border:"1px solid #E5E7EB" }}>
                      <input autoFocus value={addItemNewForm.name}
                        onChange={e => setAddItemNewForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Item name"
                        style={{ width:"100%", padding:"6px 9px", borderRadius:5, border:"1.5px solid #D1D5DB",
                                 fontSize:12, marginBottom:6, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
                        <select value={addItemNewForm.unit}
                          onChange={e => setAddItemNewForm(p => ({ ...p, unit: e.target.value }))}
                          style={{ padding:"6px 9px", borderRadius:5, border:"1.5px solid #D1D5DB", fontSize:12, fontFamily:"inherit", background:"white" }}>
                          {(allUoms.length > 0 ? allUoms.map(u => u.name) : ["Sq.Ft","Nos","Lump Sum","Running Ft","Kg","Point","Unit"]).map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <input type="number" value={addItemNewForm.base_rate}
                          onChange={e => setAddItemNewForm(p => ({ ...p, base_rate: e.target.value }))}
                          placeholder="Base rate"
                          style={{ padding:"6px 9px", borderRadius:5, border:"1.5px solid #D1D5DB", fontSize:12, fontFamily:"inherit", textAlign:"right", boxSizing:"border-box" }}/>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => setAddItemNewForm(null)}
                          style={{ flex:1, padding:6, borderRadius:5, background:"white",
                                   border:"1px solid #D1D5DB", fontSize:11.5, color:"#6B7280", cursor:"pointer" }}>
                          Cancel
                        </button>
                        <button onClick={createAndAddItem} disabled={addItemSaving || !addItemNewForm.name?.trim()}
                          style={{ flex:2, padding:6, borderRadius:5,
                                   background:(addItemSaving||!addItemNewForm.name?.trim())?"#9CA3AF":"#10B981",
                                   color:"white", border:"none", fontSize:11.5, fontWeight:700,
                                   cursor:(addItemSaving||!addItemNewForm.name?.trim())?"not-allowed":"pointer" }}>
                          {addItemSaving ? "Saving…" : "Create + Add"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ padding:"12px 14px", borderTop:"1px solid #E5E7EB", display:"flex", gap:8 }}>
                <button onClick={() => !addItemSaving && setAddItemDrawer(null)} disabled={addItemSaving}
                  style={{ flex:1, padding:"8px", borderRadius:6, border:"1px solid #D1D5DB",
                           background:"white", fontSize:12, color:"#374151", cursor: addItemSaving?"not-allowed":"pointer" }}>
                  Cancel
                </button>
                <button onClick={confirmAddItems} disabled={addItemSaving || addItemPicks.length === 0}
                  style={{ flex:2, padding:"8px", borderRadius:6,
                           background:(addItemSaving||addItemPicks.length===0)?"#9CA3AF":COL_BLUE,
                           color:"white", border:"none", fontSize:12, fontWeight:700,
                           cursor:(addItemSaving||addItemPicks.length===0)?"not-allowed":"pointer" }}>
                  {addItemSaving ? "Adding…" : `Add Selected (${addItemPicks.length})`}
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}

// ── ADD LEAD MODAL ───────────────────────────────────────────────
// Phase 4: City + Construction Type are library-sourced dropdowns,
// OPTIONAL at this stage (fresh leads often arrive with just name +
// phone). They become MANDATORY when the lead is moved to "Follow Up"
// or beyond — that guard lives in the Move-Stage flow. The lead row
// stores both FK ids (cityId, constructionTypeId) AND the legacy
// text columns (city, projType) so older reports keep working.
function AddLeadModal({onClose,onSave,assignedToList,defaultStage}){
  const ASSIGNED_TO=assignedToList||[];
  const [form,setForm]=useState({
    name:"", phone:"", email:"",
    city:"", cityId:"",
    projType:"", constructionTypeId:"",
    budget:"", source:"Direct Call",
    assignedTo:ASSIGNED_TO[0]||"", stage:defaultStage||"lead",
    priority:"Medium", contactDate:"", notes:"", tags:""
  });
  const [show,setShow]=useState(false);
  const upd=(k)=>e=>setForm(p=>({...p,[k]:e.target.value}));

  // Library lookups for city + construction-type dropdowns.
  const [libCities, setLibCities] = useState([]);
  const [libCTypes, setLibCTypes] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const [cr, tr] = await Promise.all([
          api.get("/library/cities"),
          api.get("/library/construction-types"),
        ]);
        if (cr?.success) setLibCities(cr.data || []);
        if (tr?.success) setLibCTypes(tr.data || []);
      } catch (_) {}
    })();
  }, []);

  // Helpers — keep id + name in sync.
  const pickCity = (cid) => {
    const c = libCities.find(x => String(x.id) === String(cid));
    setForm(p => ({ ...p, cityId: cid || "", city: c?.name || "" }));
  };
  const pickCType = (tid) => {
    const t = libCTypes.find(x => String(x.id) === String(tid));
    setForm(p => ({ ...p, constructionTypeId: tid || "", projType: t?.name || "" }));
  };

  const FIELDS=[
    {l:"Full Name *",k:"name",type:"input",ph:"Client full name",col:2},
    {l:"Phone *",k:"phone",type:"input",ph:"10-digit mobile",col:1},
    {l:"Email",k:"email",type:"input",ph:"email@gmail.com",col:1},
    {l:"Budget (₹)",k:"budget",type:"number",ph:"e.g. 3500000",col:1},
    {l:"Lead Source",k:"source",type:"select",opts:SOURCES,col:1},
    {l:"Assigned To",k:"assignedTo",type:"select",opts:ASSIGNED_TO,col:1},
    {l:"Initial Stage",k:"stage",type:"select",opts:STAGES.map(s=>s.id),col:1},
    {l:"Priority",k:"priority",type:"select",opts:["High","Medium","Low"],col:1},
  ];

  // Required gates — only name + phone are mandatory at fresh-lead time.
  // City + Construction Type are enforced when moving to Follow Up or beyond.
  const canSave = form.name.trim() && form.phone.trim();
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(560px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:T.sb,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div><div style={{fontSize:14,fontWeight:700,color:"white"}}>Add New Lead</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.4)",marginTop:1}}>New client enquiry into the pipeline</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          {FIELDS.map(f=>(
            <div key={f.k} style={{gridColumn:`span ${f.col}`}}>
              <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{f.l}</label>
              {f.type==="select"
                ?<SearchSelect value={form[f.k]} options={f.opts} onChange={v=>setForm(p=>({...p,[f.k]:v}))} placeholder={`Select ${f.l.replace(/\s*\*$/,"").toLowerCase()}...`}/>
                :<input type={f.type||"text"} value={form[f.k]} onChange={upd(f.k)} placeholder={f.ph}
                  style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
              }
            </div>
          ))}

          {/* ── City — library-sourced, optional at lead-creation ── */}
          <div>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>
              City
            </label>
            <select value={form.cityId} onChange={e => pickCity(e.target.value)}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,
                      border:`1.5px solid ${T.b1}`, background:T.surface,
                      fontSize:12.5,color:T.t1,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
              <option value="">Select city (optional)...</option>
              {libCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* ── Construction Type — library-sourced, optional at lead-creation ── */}
          <div>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>
              Construction Type
            </label>
            <select value={form.constructionTypeId} onChange={e => pickCType(e.target.value)}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,
                      border:`1.5px solid ${T.b1}`, background:T.surface,
                      fontSize:12.5,color:T.t1,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
              <option value="">Select type (optional)...</option>
              {libCTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {/* Soft hint — these become required at Follow-Up stage */}
        {(!form.cityId || !form.constructionTypeId) && (
          <div style={{padding:"7px 10px",background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:6,fontSize:11,color:"#92400E",marginBottom:10}}>
            💡 You can skip City + Construction Type for now. They'll be required when this lead moves to <strong>Follow Up</strong> so the quotation builder can match the right rate package.
          </div>
        )}

        {/* Contact date */}
        <div style={{marginBottom:10}}>
          <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Next Contact Date</label>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input type="date" value={form.contactDate} onChange={upd("contactDate")}
              style={{flex:1,padding:"8px 10px",borderRadius:7,border:`1.5px solid ${form.contactDate?T.grn:T.b1}`,fontSize:12.5,color:T.t1,background:form.contactDate?T.grnL:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            {form.contactDate&&<span style={{fontSize:11.5,color:T.grn,fontWeight:600}}>
              {daysDiff(form.contactDate)===0?"Today!":daysDiff(form.contactDate)===1?"Tomorrow":`In ${daysDiff(form.contactDate)} days`}
            </span>}
          </div>
          {form.contactDate&&<div style={{fontSize:11,color:T.grn,marginTop:3}}>✓ Auto reminder will be set for this date</div>}
        </div>

        {/* Notes + Tags */}
        <div style={{marginBottom:10}}>
          <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Initial Notes</label>
          <textarea value={form.notes} onChange={upd("notes")} placeholder="Requirement details, site info, client preferences..." rows={3}
            style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}
            onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
        </div>
        <div>
          <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Tags (comma separated)</label>
          <input value={form.tags} onChange={upd("tags")} placeholder="e.g. hot, 3bhk, premium"
            style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
      </div>
      <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>{if(canSave){onSave(form);onClose();}}} disabled={!canSave}
          style={{flex:2,padding:"10px",borderRadius:7,background:canSave?T.blu:T.b1,color:canSave?"white":T.t4,fontSize:12.5,fontWeight:700,border:"none",cursor:canSave?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <IcAdd size={14} color={canSave?"white":T.t4}/> Add to Pipeline
        </button>
      </div>
    </div>
  </>);
}

// ── SELECT FINAL QUOTATION (inline) ──────────────────────────────
function SelectFinalQuotation({leadId,onDone,onSkip}){
  const [quots,setQuots]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    (async()=>{
      try{const res=await api.get("/crm/leads/"+leadId+"/quotations");if(res.success)setQuots(res.data);}catch(e){}
      setLoading(false);
    })();
  },[leadId]);

  const accept=async(qid)=>{
    try{const res=await api.patch("/crm/quotations/"+qid+"/accept");if(res.success)onDone();}catch(e){alert("Error");}
  };

  if(loading) return <div style={{textAlign:"center",padding:"12px",color:T.t4,fontSize:12}}>Loading...</div>;
  if(quots.length===0) return(
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:12,color:T.t4,marginBottom:12}}>No quotations uploaded for this lead</div>
      <button onClick={onSkip} style={{padding:"9px 20px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>OK</button>
    </div>
  );
  return(
    <div>
      {quots.map(q=>(
        <div key={q.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:8,marginBottom:6,cursor:"pointer"}}
          onClick={()=>accept(q.id)}
          onMouseEnter={e=>e.currentTarget.style.borderColor=T.grn}
          onMouseLeave={e=>e.currentTarget.style.borderColor=T.b1}>
          <span style={{fontSize:10,fontWeight:800,color:T.blu,background:T.bluL,padding:"1px 6px",borderRadius:4,fontFamily:"monospace"}}>V{q.version}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{q.title||`Quotation V${q.version}`}</div>
            <div style={{fontSize:10.5,color:T.t4}}>{q.file_size||"—"}</div>
          </div>
          {q.amount>0&&<span style={{fontSize:13,fontWeight:700,color:T.grn}}>₹{fmtN(q.amount)}</span>}
          <span style={{fontSize:10,color:T.grn,fontWeight:700}}>Select →</span>
        </div>
      ))}
      <button onClick={onSkip} style={{width:"100%",padding:"8px",borderRadius:7,background:"transparent",border:`1px solid ${T.b1}`,fontSize:11.5,fontWeight:600,color:T.t4,cursor:"pointer",marginTop:6}}>Skip</button>
    </div>
  );
}

// ── TEMPLATE BUILDER MODAL ──────────────────────────────────────
function TemplateBuilderModal({onClose}){
  const [templates,setTemplates]=useState([]);
  const [selTpl,setSelTpl]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const emptyForm={name:"",company_name:"",company_address:"",company_phone:"",company_email:"",terms_conditions:"",notes:""};
  const [form,setForm]=useState({...emptyForm});
  const [items,setItems]=useState([{description:"",qty:1,unit:"SqFt",rate:0}]);
  const upd=(k)=>e=>setForm(p=>({...p,[k]:e.target.value}));

  useEffect(()=>{
    (async()=>{
      try{const res=await api.get("/crm/templates");if(res.success)setTemplates(res.data);}catch(e){}
      setLoading(false);
    })();
  },[]);

  const selectTemplate=(t)=>{
    setSelTpl(t);
    setForm({name:t.name||"",company_name:t.company_name||"",company_address:t.company_address||"",company_phone:t.company_phone||"",company_email:t.company_email||"",terms_conditions:t.terms_conditions||"",notes:t.notes||""});
    setItems(t.line_items?.length>0?t.line_items:[{description:"",qty:1,unit:"SqFt",rate:0}]);
  };

  const newTemplate=()=>{
    setSelTpl(null);
    setForm({...emptyForm});
    setItems([{description:"",qty:1,unit:"SqFt",rate:0}]);
  };

  // Auto-focus newly added row's description input
  const itemRefs=useRef({});
  const [pendingItemFocus,setPendingItemFocus]=useState(null);
  useEffect(()=>{
    if(pendingItemFocus!==null && itemRefs.current[pendingItemFocus]){
      itemRefs.current[pendingItemFocus].focus();
      setPendingItemFocus(null);
    }
  },[pendingItemFocus]);
  const addRow=()=>setItems(p=>{ const next=[...p,{description:"",qty:1,unit:"SqFt",rate:0}]; setPendingItemFocus(next.length-1); return next; });
  const removeRow=(i)=>setItems(p=>p.filter((_,j)=>j!==i));
  const updItem=(i,k,v)=>setItems(p=>p.map((it,j)=>j===i?{...it,[k]:v}:it));

  const total=items.reduce((s,it)=>s+(Number(it.qty)||0)*(Number(it.rate)||0),0);

  const save=async()=>{
    if(!form.name.trim()) return alert("Template name is required");
    setSaving(true);
    try{
      const payload={...form,line_items:items.map(it=>({...it,qty:Number(it.qty)||0,rate:Number(it.rate)||0,amount:(Number(it.qty)||0)*(Number(it.rate)||0)}))};
      if(selTpl){
        await api.patch("/crm/templates/"+selTpl.id,payload);
        setTemplates(p=>p.map(t=>t.id===selTpl.id?{...t,...payload,line_items:payload.line_items}:t));
      }else{
        const res=await api.post("/crm/templates",payload);
        if(res.success){setTemplates(p=>[res.data,...p]);setSelTpl(res.data);}
      }
    }catch(e){alert(e.message||"Error saving");}
    setSaving(false);
  };

  const deleteTpl=async(tid)=>{
    if(!await window.confirmAsync("Delete this template?")) return;
    try{
      await api.del("/crm/templates/"+tid);
      setTemplates(p=>p.filter(t=>t.id!==tid));
      if(selTpl?.id===tid) newTemplate();
    }catch(e){}
  };

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.bg,borderRadius:14,width:"min(860px,95vw)",height:"min(620px,90vh)",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,display:"flex",overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>

      {/* Left: Template List */}
      <div style={{width:220,flexShrink:0,background:T.sb,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
          <div style={{fontSize:14,fontWeight:700,color:"white",marginBottom:8}}>Templates</div>
          <button onClick={newTemplate} style={{width:"100%",padding:"7px",borderRadius:6,background:"rgba(255,255,255,0.1)",border:"1px dashed rgba(255,255,255,0.3)",color:"rgba(255,255,255,0.7)",fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
            + New Template
          </button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"8px"}}>
          {loading&&<div style={{color:"rgba(255,255,255,0.4)",fontSize:11,padding:"10px",textAlign:"center"}}>Loading...</div>}
          {templates.map(t=>(
            <div key={t.id} onClick={()=>selectTemplate(t)}
              style={{padding:"9px 11px",borderRadius:7,marginBottom:4,cursor:"pointer",background:selTpl?.id===t.id?"rgba(37,99,235,0.2)":"transparent",border:selTpl?.id===t.id?"1px solid rgba(37,99,235,0.4)":"1px solid transparent"}}
              onMouseEnter={e=>{if(selTpl?.id!==t.id)e.currentTarget.style.background="rgba(255,255,255,0.05)";}}
              onMouseLeave={e=>{if(selTpl?.id!==t.id)e.currentTarget.style.background="transparent";}}>
              <div style={{fontSize:12,fontWeight:600,color:"white",marginBottom:2}}>{t.name}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{t.line_items?.length||0} items · ₹{fmtN(t.line_items?.reduce((s,it)=>s+(it.amount||0),0)||0)}</div>
            </div>
          ))}
        </div>
        <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
          <button onClick={onClose} style={{width:"100%",padding:"8px",borderRadius:6,background:"rgba(255,255,255,0.08)",border:"none",color:"rgba(255,255,255,0.5)",fontSize:11.5,fontWeight:600,cursor:"pointer"}}>Close</button>
        </div>
      </div>

      {/* Right: Form */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.b1}`,background:T.surface,flexShrink:0}}>
          <div style={{fontSize:14,fontWeight:700,color:T.t1}}>{selTpl?"Edit Template":"New Template"}</div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
          {/* Template name */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Template Name *</label>
            <input value={form.name} onChange={upd("name")} placeholder="e.g. Standard Residential Quotation"
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:13,fontWeight:600,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          {/* Company info */}
          <div style={{padding:"12px 14px",background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:9,marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>Company Details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{l:"Company Name",k:"company_name",ph:"Your Company Name"},{l:"Phone",k:"company_phone",ph:"+91-XXXXX"},{l:"Email",k:"company_email",ph:"info@company.com"},{l:"Address",k:"company_address",ph:"Raipur, CG"}].map(f=>(
                <div key={f.k}>
                  <label style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:2}}>{f.l}</label>
                  <input value={form[f.k]} onChange={upd(f.k)} placeholder={f.ph}
                    style={{width:"100%",padding:"6px 9px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
              ))}
            </div>
          </div>

          {/* Line Items */}
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px"}}>Line Items</div>
              <button onClick={addRow} style={{padding:"4px 10px",borderRadius:5,border:`1px solid ${T.bluM}`,background:T.bluL,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>+ Add Row</button>
            </div>
            <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 70px 70px 90px 90px 30px",padding:"6px 10px",background:T.sb}}>
                {["Description","Qty","Unit","Rate","Amount",""].map((h,i)=>(
                  <span key={i} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
                ))}
              </div>
              {items.map((it,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 90px 30px",padding:"5px 10px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",gap:6}}>
                  <input ref={el=>{if(el) itemRefs.current[i]=el;}}
                    value={it.description} onChange={e=>updItem(i,"description",e.target.value)} placeholder="Work description"
                    style={{padding:"5px 7px",border:`1px solid ${T.b1}`,borderRadius:4,fontSize:11.5,color:T.t1,outline:"none",fontFamily:"inherit"}}/>
                  <input type="number" value={it.qty} onChange={e=>updItem(i,"qty",e.target.value)}
                    style={{padding:"5px 5px",border:`1px solid ${T.b1}`,borderRadius:4,fontSize:11.5,color:T.t1,outline:"none",width:"100%",fontFamily:"inherit",boxSizing:"border-box"}}/>
                  <SearchSelect value={it.unit} options={["SqFt","SqM","CuM","Rft","LS","Nos","KG","MT","Bags","Set"]} onChange={v=>updItem(i,"unit",v)} placeholder="Unit"/>
                  <input type="number" value={it.rate} onChange={e=>updItem(i,"rate",e.target.value)} placeholder="₹"
                    onKeyDown={e=>{if(e.key==="Enter" && i===items.length-1){e.preventDefault();addRow();}}}
                    style={{padding:"5px 5px",border:`1px solid ${T.b1}`,borderRadius:4,fontSize:11.5,color:T.t1,outline:"none",width:"100%",fontFamily:"inherit",boxSizing:"border-box"}}/>
                  <span style={{fontSize:12,fontWeight:600,color:T.blu,paddingLeft:4,fontVariantNumeric:"tabular-nums"}}>₹{fmtN((Number(it.qty)||0)*(Number(it.rate)||0))}</span>
                  {items.length>1&&<button onClick={()=>removeRow(i)} style={{background:"none",border:"none",cursor:"pointer",color:T.red,fontSize:14,padding:0}}>×</button>}
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"flex-end",padding:"8px 12px",background:T.surfaceB,borderTop:`1px solid ${T.b1}`}}>
                <span style={{fontSize:13,fontWeight:700,color:T.t1}}>Total: ₹{fmtN(total)}</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Terms & Conditions</label>
            <textarea value={form.terms_conditions} onChange={upd("terms_conditions")} rows={4} placeholder="Payment terms, validity, scope of work..."
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:8,flexShrink:0}}>
          {selTpl&&<button onClick={()=>deleteTpl(selTpl.id)} style={{padding:"9px 14px",borderRadius:7,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:12,fontWeight:600,cursor:"pointer"}}>Delete</button>}
          <div style={{flex:1}}/>
          <button onClick={save} disabled={saving}
            style={{padding:"9px 20px",borderRadius:7,background:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1}}>
            {saving?"Saving...":selTpl?"Update Template":"Save Template"}
          </button>
        </div>
      </div>
    </div>
  </>);
}

// ═══════════════════════════════════════════════════════════════════
// SOLAR EPC CRM — Lead Type Selector + Solar Lead Modal + Drawer
// ═══════════════════════════════════════════════════════════════════

const SOLAR_STAGES = [
  {id:"lead",      label:"Lead",      color:"#6366F1", bg:"#EEF2FF", desc:"New solar enquiry"},
  {id:"followup",  label:"Follow Up", color:"#0891B2", bg:"#E0F2FE", desc:"Site details collected"},
  {id:"proposal",  label:"Proposal",  color:"#D97706", bg:"#FFFBEB", desc:"Geo photo + quotation"},
  {id:"converted", label:"Converted", color:"#059669", bg:"#ECFDF5", desc:"Docs uploaded → ready"},
  {id:"lost",      label:"Lost",      color:"#6B7280", bg:"#F1F5F9", desc:"Not interested"},
  {id:"project",   label:"Converted to Project", color:"#1565C0", bg:"#E3F2FD", desc:"Active solar project"},
];

const KW_OPTIONS = ["1","2","3","4","5","6","7","8","9","10"];

// Upload photo to Cloudinary
const uploadToCloudinary = (file, type="image") => new Promise((resolve, reject) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "gb_buildcon_drawings");
  fd.append("folder", "gb_buildcon/solar");
  const endpoint = type === "doc"
    ? "https://api.cloudinary.com/v1_1/dd632nqfm/raw/upload"
    : "https://api.cloudinary.com/v1_1/dd632nqfm/image/upload";
  const xhr = new XMLHttpRequest();
  xhr.onload = () => {
    try {
      const d = JSON.parse(xhr.responseText);
      if (xhr.status === 200 && d.secure_url) resolve(d.secure_url);
      else reject(new Error(d.error?.message || "Upload failed"));
    } catch(e) { reject(new Error("Parse error")); }
  };
  xhr.onerror = () => reject(new Error("Network error"));
  xhr.open("POST", endpoint);
  xhr.send(fd);
});

// ── Lead Type Selector ────────────────────────────────────────────
function LeadTypeSelector({onSelect, onClose}) {
  return (<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:16,width:"min(420px,92vw)",boxShadow:"0 24px 64px rgba(0,0,0,0.28)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:"#0D1B2A",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:"white"}}>New Lead</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:2}}>Kaun sa lead hai?</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)"}}><IcX size={15}/></button>
      </div>
      <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
        <button onClick={()=>onSelect("construction")}
          style={{display:"flex",alignItems:"center",gap:16,padding:"16px 18px",borderRadius:12,border:`2px solid ${T.b1}`,background:"white",cursor:"pointer",textAlign:"left",transition:"all .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.blu;e.currentTarget.style.background=T.bluL;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b1;e.currentTarget.style.background="white";}}>
          <div style={{width:44,height:44,borderRadius:10,background:T.bluL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🏗️</div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.t1}}>Construction / Other</div>
            <div style={{fontSize:11.5,color:T.t3,marginTop:2}}>Residential, commercial, industrial project</div>
          </div>
        </button>
        <button onClick={()=>onSelect("solar")}
          style={{display:"flex",alignItems:"center",gap:16,padding:"16px 18px",borderRadius:12,border:"2px solid #FFD54F",background:"#FFFDE7",cursor:"pointer",textAlign:"left",transition:"all .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.background="#FFF8E1";e.currentTarget.style.borderColor="#FFC107";}}
          onMouseLeave={e=>{e.currentTarget.style.background="#FFFDE7";e.currentTarget.style.borderColor="#FFD54F";}}>
          <div style={{width:44,height:44,borderRadius:10,background:"#FFF3E0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>☀️</div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#E65100"}}>Solar EPC — PM Surya Ghar</div>
            <div style={{fontSize:11.5,color:"#BF360C",marginTop:2}}>Rooftop solar installation lead</div>
          </div>
        </button>
      </div>
    </div>
  </>);
}

// ── Add Solar Lead Modal ──────────────────────────────────────────
function AddSolarLeadModal({onClose, onSave, assignedToList, defaultStage}) {
  const ASSIGNED_TO = assignedToList || [];
  const [form, setForm] = useState({
    name:"", phone:"", city:"Raipur", location:"",
    requirement_kw:"3", source:"Direct Call",
    assignedTo:ASSIGNED_TO[0]||"",
    priority:"Medium", contactDate:"", notes:"",
    stage: defaultStage||"lead",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) return setErr("Name aur Phone required");
    setSaving(true); setErr("");
    try { await onSave(form); onClose(); }
    catch(e) { setErr("Error saving lead"); }
    setSaving(false);
  };

  const inp = (label, key, ph, type="text") => (
    <div>
      <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{label}</label>
      <input type={type} value={form[key]} onChange={e=>upd(key,e.target.value)} placeholder={ph}
        style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
        onFocus={e=>e.target.style.borderColor="#E65100"} onBlur={e=>e.target.style.borderColor=T.b1}/>
    </div>
  );

  return (<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:402}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(540px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.28)",zIndex:403,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#E65100,#FF8F00)",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:"white"}}>☀️ New Solar Lead</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.7)",marginTop:2}}>PM Surya Ghar — Rooftop Solar</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"white",opacity:0.7}}><IcX size={15}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        {err && <div style={{background:T.redL,color:T.red,padding:"8px 12px",borderRadius:7,fontSize:12,marginBottom:10,border:`1px solid ${T.redM}`}}>{err}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{gridColumn:"1/3"}}>{inp("Customer Name *","name","Full name")}</div>
          {inp("Mobile *","phone","10-digit number","tel")}
          {inp("City","city","Raipur, Durg...")}
          <div>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>System Size (kW)</label>
            <SearchSelect value={form.requirement_kw}
              options={KW_OPTIONS.map(k=>({key:k,label:`${k} kW`}))}
              onChange={v=>upd("requirement_kw",v)} placeholder="Select size..."/>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Lead Source</label>
            <SearchSelect value={form.source} options={SOURCES}
              onChange={v=>upd("source",v)} placeholder="Select source..."/>
          </div>
          <div style={{gridColumn:"1/3"}}>{inp("Location / Area","location","Approx location or landmark")}</div>
          <div>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Assigned To</label>
            <SearchSelect value={form.assignedTo} options={ASSIGNED_TO}
              onChange={v=>upd("assignedTo",v)} placeholder="Select assignee..."/>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Priority</label>
            <SearchSelect value={form.priority} options={["High","Medium","Low"]}
              onChange={v=>upd("priority",v)} placeholder="Select priority..."/>
          </div>
          <div style={{gridColumn:"1/3"}}>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Next Contact Date</label>
            <input type="date" value={form.contactDate} onChange={e=>upd("contactDate",e.target.value)}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${form.contactDate?T.grn:T.b1}`,fontSize:12.5,color:T.t1,background:form.contactDate?T.grnL:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          <div style={{gridColumn:"1/3"}}>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Notes</label>
            <textarea value={form.notes} onChange={e=>upd("notes",e.target.value)} placeholder="Site details, roof info, customer preferences..." rows={2}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
          </div>
        </div>
      </div>
      <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
        <button onClick={save} disabled={saving||!form.name.trim()||!form.phone.trim()}
          style={{flex:2,padding:"10px",borderRadius:7,background:saving||!form.name.trim()?"#FFA726":"linear-gradient(135deg,#E65100,#FF8F00)",color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          ☀️ {saving?"Saving...":"Add Solar Lead"}
        </button>
      </div>
    </div>
  </>);
}

// ── Follow-up Log Section — timeline of multiple calls ───────────
function FollowupLogSection({leadId, isActive, autoOpen=false}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(autoOpen); // auto-open if prop passed
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    call_date: new Date().toISOString().split("T")[0],
    summary: "",
    next_followup_date: "",
    additional_requirements: "",
    senior_consultant_needed: false,
  });

  useEffect(() => {
    api.get("/solar/leads/"+leadId+"/followup-logs")
      .then(r => { if(r.success) setLogs(r.data||[]); })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, [leadId]);

  const addLog = async () => {
    if (!form.summary.trim()) return;
    setSaving(true);
    try {
      const res = await api.post("/solar/leads/"+leadId+"/followup-logs", form);
      if (res.success) {
        setLogs(p=>[res.data,...p]);
        setForm({call_date:new Date().toISOString().split("T")[0],summary:"",next_followup_date:"",additional_requirements:"",senior_consultant_needed:false});
        setShowAdd(false);
      }
    } catch(e){}
    setSaving(false);
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "";

  return (
    <div style={{padding:"12px 13px",borderBottom:`1px solid ${T.b1}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:700,color:"#0891B2"}}>📞 Follow-up Log ({logs.length})</div>
        {isActive&&(
          <button onClick={()=>setShowAdd(s=>!s)}
            style={{padding:"4px 10px",borderRadius:5,background:showAdd?"#E0F2FE":"#0891B2",border:`1px solid #0891B2`,color:showAdd?"#0891B2":"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>
            {showAdd?"Cancel":"+ Add Entry"}
          </button>
        )}
      </div>

      {/* Add new log entry */}
      {showAdd&&(
        <div style={{background:"#F0F9FF",borderRadius:8,border:"1px solid #BAE6FD",padding:"10px 12px",marginBottom:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div>
              <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Call Date</label>
              <input type="date" value={form.call_date} onChange={e=>setForm(p=>({...p,call_date:e.target.value}))}
                style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Next Follow-up</label>
              <input type="date" value={form.next_followup_date} onChange={e=>setForm(p=>({...p,next_followup_date:e.target.value}))}
                style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${form.next_followup_date?T.grn:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:form.next_followup_date?T.grnL:"white"}}/>
            </div>
            <div style={{gridColumn:"1/3"}}>
              <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Conversation Summary *</label>
              <textarea value={form.summary} onChange={e=>setForm(p=>({...p,summary:e.target.value}))}
                autoFocus
                placeholder="Customer ne kya kaha, interest level, concerns..." rows={3}
                style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
            </div>
            <div style={{gridColumn:"1/3"}}>
              <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Additional Requirements</label>
              <textarea value={form.additional_requirements} onChange={e=>setForm(p=>({...p,additional_requirements:e.target.value}))}
                placeholder="Battery, special structure, shade issue, loan required..." rows={1}
                style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
            </div>
            <div style={{gridColumn:"1/3",display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}
              onClick={()=>setForm(p=>({...p,senior_consultant_needed:!p.senior_consultant_needed}))}>
              <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${form.senior_consultant_needed?"#E65100":T.b2}`,background:form.senior_consultant_needed?"#E65100":"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {form.senior_consultant_needed&&<span style={{color:"white",fontSize:11,fontWeight:800}}>✓</span>}
              </div>
              <span style={{fontSize:12,color:"#E65100",fontWeight:600}}>Senior Consultant Required</span>
            </div>
          </div>
          <button onClick={addLog} disabled={saving||!form.summary.trim()}
            style={{width:"100%",padding:"8px",borderRadius:6,background:saving||!form.summary.trim()?T.b1:"#0891B2",color:"white",border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {saving?"Saving...":"Save Follow-up Log"}
          </button>
        </div>
      )}

      {/* Log timeline */}
      {loading&&<div style={{fontSize:11,color:T.t4,textAlign:"center",padding:"8px"}}>Loading...</div>}
      {!loading&&logs.length===0&&<div style={{fontSize:11,color:T.t4,textAlign:"center",padding:"8px"}}>No follow-up entries yet</div>}
      {logs.map((log,i)=>(
        <div key={log.id} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"#0891B2",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:10,fontWeight:700}}>
              {logs.length-i}
            </div>
            {i<logs.length-1&&<div style={{width:2,flex:1,minHeight:12,background:"#BAE6FD",margin:"3px 0"}}/>}
          </div>
          <div style={{flex:1,background:"#F0F9FF",borderRadius:7,padding:"8px 10px",border:"1px solid #BAE6FD"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <span style={{fontSize:11,fontWeight:700,color:"#0891B2"}}>{fmtDate(log.call_date)}</span>
              {log.next_followup_date&&<span style={{fontSize:10,color:T.grn,fontWeight:600}}>Next: {fmtDate(log.next_followup_date)}</span>}
              {log.senior_consultant_needed===1&&<span style={{fontSize:9,fontWeight:700,color:"#E65100",background:"#FFF3E0",border:"1px solid #FFD54F",borderRadius:3,padding:"1px 5px"}}>Senior Req.</span>}
            </div>
            <div style={{fontSize:12,color:T.t1,lineHeight:1.5}}>{log.summary}</div>
            {log.additional_requirements&&<div style={{fontSize:11,color:T.t3,marginTop:3,fontStyle:"italic"}}>Requirements: {log.additional_requirements}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Solar Lead Detail Drawer — Construction CRM style ─────────────
function SolarLeadDetailDrawer({lead, onClose, onUpdate, onConvertToProject}) {
  const [data, setData] = useState(lead);
  const [tab, setTab] = useState(lead._openTab||"overview");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState({});

  // Quotations state
  const [brands, setBrands] = useState(
    lead.quotation_brands && lead.quotation_brands.length
      ? lead.quotation_brands
      : [{brand:"Brand 1",amount:"",file:""},{brand:"Brand 2",amount:"",file:""},{brand:"Brand 3",amount:"",file:""}]
  );
  const [geoPhoto, setGeoPhoto] = useState(lead.geo_photo_url||"");
  const [selectedBrand, setSelectedBrand] = useState(lead.selected_brand||"");

  // Converted docs state
  const [docs, setDocs] = useState({
    doc_ele_bill: lead.doc_ele_bill||"",
    doc_aadhaar:  lead.doc_aadhaar||"",
    doc_pan:      lead.doc_pan||"",
    doc_bank:     lead.doc_bank||"",
    doc_itr:      lead.doc_itr||"",
    loan_amount:  lead.loan_amount||"",
    loan_not_required: lead.loan_not_required||false,
  });

  // Contact date state
  const [contactDate, setContactDate] = useState(
    lead.contactDate || (lead.followup_date ? lead.followup_date.split("T")[0] : "")
  );

  // Overview form state (must be at top level — rules of hooks)
  const [ovForm, setOvForm] = useState({
    name: lead.name||"",
    phone: lead.phone||"",
    city: lead.city||"",
    location: lead.location||"",
    requirement_kw: lead.requirement_kw||"3",
    requirement_type: lead.requirement_type||"residential",
    source: lead.source||"Direct Call",
    exact_address: lead.exact_address||"",
    followup_notes: lead.followup_notes||"",
    senior_consultant_needed: lead.senior_consultant_needed||false,
  });

  const stage = SOLAR_STAGES.find(s=>s.id===data.stage)||SOLAR_STAGES[0];
  const stageIdx = SOLAR_STAGES.findIndex(s=>s.id===data.stage);

  const patchLead = async (updates) => {
    setSaving(true); setErr("");
    try {
      const res = await api.patch("/solar/leads/"+data.id, updates);
      if (res.success) {
        setData(p=>({...p,...updates,...(res.data||{})}));
        onUpdate(data.id, {...updates,...(res.data||{})});
      } else setErr(res.message||"Save failed");
    } catch(e) { setErr(e.message); }
    setSaving(false);
  };

  const moveStage = async (newStage) => {
    await patchLead({stage: newStage});
  };

  // Photo upload
  const uploadPhoto = async (e, field, setFn) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(p=>({...p,[field]:true})); setErr("");
    try {
      const url = await uploadToCloudinary(file, "image");
      setFn(url);
      api.patch("/solar/leads/"+data.id, {[field]:url}).catch(()=>{});
    } catch(ex) { setErr("Upload failed: "+ex.message); }
    setUploading(p=>({...p,[field]:false}));
  };

  // Doc upload
  const uploadDoc = async (e, docKey) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(p=>({...p,[docKey]:true})); setErr("");
    try {
      const url = await uploadToCloudinary(file, "doc");
      setDocs(p=>({...p,[docKey]:url}));
      api.patch("/solar/leads/"+data.id, {[docKey]:url}).catch(()=>{});
    } catch(ex) { setErr("Upload failed"); }
    setUploading(p=>({...p,[docKey]:false}));
  };

  const saveQuotations = (overrideBrands) => {
    const b = overrideBrands || brands;
    api.patch("/solar/leads/"+data.id, {
      geo_photo_url: geoPhoto,
      quotation_brands: b,
    }).catch(()=>{});
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "";

  const isProject = data.stage === "project";
  const TABS = [
    {id:"overview",  l:"Overview"},
    {id:"followups", l:"Follow Ups"},
    {id:"quotations",l:"Documents"},
    ...(!isProject ? [{id:"move", l:"Move Stage"}] : []),
  ];

  // Doc upload button
  const DocUploadBtn = ({label, key, value}) => (
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
        <span style={{fontSize:11.5,fontWeight:600,color:value?T.grn:T.t2}}>{value?"✓ ":""}{label}</span>
        {value&&<a href={value} target="_blank" rel="noreferrer" style={{fontSize:10.5,color:T.blu}}>View ↗</a>}
      </div>
      <div style={{display:"flex",gap:6}}>
        <label style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"7px",borderRadius:7,border:`1.5px dashed ${value?T.grnM:T.b1}`,background:value?T.grnL:"white",cursor:"pointer",fontSize:11.5,fontWeight:600,color:value?T.grn:T.t3}}>
          <input type="file" accept="image/*,application/pdf" capture="environment" onChange={e=>uploadDoc(e,key)} style={{display:"none"}} disabled={uploading[key]}/>
          {uploading[key]?"Uploading...":"📷 Camera"}
        </label>
        <label style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"7px",borderRadius:7,border:`1.5px dashed ${value?T.grnM:T.b1}`,background:value?T.grnL:"white",cursor:"pointer",fontSize:11.5,fontWeight:600,color:value?T.grn:T.t3}}>
          <input type="file" accept="image/*,application/pdf" onChange={e=>uploadDoc(e,key)} style={{display:"none"}} disabled={uploading[key]}/>
          {uploading[key]?"...":"📁 File"}
        </label>
      </div>
    </div>
  );

  return (<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(520px,96vw)",background:"#F8FAFC",zIndex:301,boxShadow:"-4px 0 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease"}}>

      {/* Header */}
      <div style={{background:stage.color,padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:10.5,fontWeight:800,color:"white",background:"rgba(255,255,255,0.2)",padding:"2px 8px",borderRadius:20}}>☀ Solar EPC</span>
            <span style={{fontSize:10.5,fontWeight:700,color:"rgba(255,255,255,0.9)",background:"rgba(255,255,255,0.2)",padding:"2px 8px",borderRadius:20}}>{stage.label}</span>
            <span style={{fontSize:10.5,fontWeight:700,color:"rgba(255,255,255,0.9)",background:"rgba(255,255,255,0.2)",padding:"2px 8px",borderRadius:20}}>{data.priority||"Medium"}</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"white",opacity:0.7}}><IcX size={15}/></button>
        </div>
        <div style={{fontSize:18,fontWeight:700,color:"white",marginBottom:4}}>{data.name}</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:8}}>
          {[data.city, data.requirement_type, `${data.requirement_kw||"?"}kW`, data.assignedTo].filter(Boolean).map((v,i)=>(
            <span key={i} style={{fontSize:11,color:"rgba(255,255,255,0.85)"}}>{i>0?"· ":""}{v}</span>
          ))}
        </div>
        {/* Action buttons */}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <a href={"tel:+91"+data.phone}
            style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:7,background:"rgba(255,255,255,0.15)",color:"white",fontSize:12,fontWeight:700,textDecoration:"none",border:"1px solid rgba(255,255,255,0.3)"}}>
            📞 Call
          </a>
          <a href={"https://api.whatsapp.com/send?phone=91"+data.phone} target="_blank" rel="noreferrer"
            style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:7,background:"#25D366",color:"white",fontSize:12,fontWeight:700,textDecoration:"none"}}>
            WhatsApp
          </a>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.75)",marginLeft:2}}>{data.phone}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${T.b1}`,background:"white",flexShrink:0,overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"10px 8px",border:"none",background:"none",fontSize:12,fontWeight:tab===t.id?700:400,color:tab===t.id?stage.color:T.t3,borderBottom:tab===t.id?`2.5px solid ${stage.color}`:"2.5px solid transparent",cursor:"pointer",whiteSpace:"nowrap"}}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
        {err&&<div style={{background:T.redL,color:T.red,padding:"8px 12px",borderRadius:7,fontSize:12,marginBottom:10,border:`1px solid ${T.redM}`}}>{err}</div>}

        {/* ── OVERVIEW ── */}
        {tab==="overview"&&isProject&&(
          <div>
            {/* Project badge */}
            <div style={{background:"#E3F2FD",borderRadius:9,border:"1.5px solid #90CAF9",padding:"12px 14px",marginBottom:10,textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#1565C0"}}>✅ Converted to Project</div>
              <div style={{fontSize:11,color:"#42A5F5",marginTop:3}}>This lead is now an active solar project. Data is read-only.</div>
              {data.converted_project_id&&<div style={{fontSize:11,color:"#1565C0",marginTop:4,fontWeight:600}}>Project ID: #{data.converted_project_id}</div>}
            </div>
            {/* Read-only details */}
            <div style={{background:"white",borderRadius:9,border:`1px solid ${T.b1}`,padding:"12px 14px"}}>
              <div style={{fontSize:12,fontWeight:700,color:T.t1,marginBottom:10}}>👤 Customer Details</div>
              {[
                ["Customer Name", data.name],
                ["Mobile", data.phone],
                ["City", data.city],
                ["Location", data.location||data.exact_address],
                ["System Size", `${data.requirement_kw||"?"}kW`],
                ["Type", data.requirement_type||"residential"],
                ["Lead Source", data.source||"—"],
                ["Assigned To", data.assignedTo||"—"],
                ["Address", data.exact_address||"—"],
                ["Site Notes", data.followup_notes||"—"],
              ].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.b1}`}}>
                  <span style={{fontSize:11,color:T.t4,fontWeight:600}}>{l}</span>
                  <span style={{fontSize:12,color:T.t1,fontWeight:500,textAlign:"right",maxWidth:"60%"}}>{v||"—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==="overview"&&!isProject&&(()=>{
          const upd = (k,v) => setOvForm(p=>({...p,[k]:v}));
          const inp = (label, key, ph, type="text") => (
            <div>
              <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>{label}</label>
              <input type={type} value={ovForm[key]} onChange={e=>upd(key,e.target.value)} placeholder={ph}
                style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=stage.color} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
          );
          return (
            <div>
              {/* Stage progress */}
              <div style={{background:"white",borderRadius:9,border:`1px solid ${T.b1}`,padding:"10px 14px",marginBottom:10}}>
                <div style={{display:"flex",gap:0}}>
                  {SOLAR_STAGES.filter(s=>s.id!=="lost"&&s.id!=="project").map((s,i)=>{
                    const done=stageIdx>i; const cur=stageIdx===i;
                    return (
                      <div key={s.id} style={{flex:1,textAlign:"center"}}>
                        <div style={{height:4,background:done?s.color:cur?s.color+"88":T.b1,borderRadius:i===0?"4px 0 0 4px":i===3?"0 4px 4px 0":"0"}}/>
                        <div style={{fontSize:9.5,color:done||cur?s.color:T.t4,fontWeight:done||cur?700:400,marginTop:4}}>{s.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Editable details */}
              <div style={{background:"white",borderRadius:9,border:`1px solid ${T.b1}`,padding:"12px 14px"}}>
                <div style={{fontSize:12,fontWeight:700,color:T.t1,marginBottom:10}}>👤 Customer Details</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <div style={{gridColumn:"1/3"}}>{inp("Customer Name","name","Full name")}</div>
                  {inp("Mobile","phone","10-digit","tel")}
                  {inp("City","city","Raipur...")}
                  {inp("Location / Area","location","Landmark")}
                  <div>
                    <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>System Size</label>
                    <SearchSelect value={ovForm.requirement_kw}
                      options={KW_OPTIONS.map(k=>({key:k,label:`${k} kW`}))}
                      onChange={v=>upd("requirement_kw",v)} placeholder="Select size..."/>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Type</label>
                    <SearchSelect value={ovForm.requirement_type}
                      options={[{key:"residential",label:"Residential"},{key:"commercial",label:"Commercial"}]}
                      onChange={v=>upd("requirement_type",v)} placeholder="Select type..."/>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Lead Source</label>
                    <SearchSelect value={ovForm.source} options={SOURCES}
                      onChange={v=>upd("source",v)} placeholder="Select source..."/>
                  </div>
                </div>
                <div style={{borderTop:`1px solid ${T.b1}`,paddingTop:10,marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:T.t1,marginBottom:8}}>📍 Site Details</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10}}>
                    <div>
                      <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Exact Site Address</label>
                      <textarea value={ovForm.exact_address} onChange={e=>upd("exact_address",e.target.value)} placeholder="House no., Street, Area, District, Pin..." rows={2}
                        style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}
                        onFocus={e=>e.target.style.borderColor=stage.color} onBlur={e=>e.target.style.borderColor=T.b1}/>
                    </div>
                    <div>
                      <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Site Notes</label>
                      <textarea value={ovForm.followup_notes} onChange={e=>upd("followup_notes",e.target.value)} placeholder="Roof type, shade, structure..." rows={2}
                        style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}
                        onFocus={e=>e.target.style.borderColor=stage.color} onBlur={e=>e.target.style.borderColor=T.b1}/>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#FFF8E1",borderRadius:7,border:"1px solid #FFD54F",cursor:"pointer"}}
                      onClick={()=>upd("senior_consultant_needed",!ovForm.senior_consultant_needed)}>
                      <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${ovForm.senior_consultant_needed?"#E65100":T.b2}`,background:ovForm.senior_consultant_needed?"#E65100":"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {ovForm.senior_consultant_needed&&<span style={{color:"white",fontSize:13,fontWeight:800}}>✓</span>}
                      </div>
                      <span style={{fontSize:12.5,fontWeight:600,color:"#E65100"}}>Senior Consultant Required</span>
                    </div>
                  </div>
                </div>
                <button onClick={()=>patchLead({...ovForm})} disabled={saving}
                  style={{width:"100%",padding:"10px",borderRadius:7,background:saving?T.b1:stage.color,color:"white",border:"none",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  {saving?"Saving...":"💾 Save Details"}
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── FOLLOW UPS ── */}
        {tab==="followups"&&(
          <FollowupLogSection leadId={data.id} isActive={true} autoOpen={true}/>
        )}

        {/* ── QUOTATIONS ── */}
        {tab==="quotations"&&isProject&&(
          <div>
            {/* ── READ-ONLY DOCUMENTS for project stage ── */}
            <div style={{background:"white",borderRadius:9,border:`1px solid ${T.b1}`,padding:"14px",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:4}}>📄 Documents</div>
              <div style={{fontSize:11.5,color:T.t3,marginBottom:12}}>Read-only — edit from Project module</div>
              {[
                {key:"doc_ele_bill", label:"Electricity Bill",   icon:"⚡"},
                {key:"doc_aadhaar",  label:"Aadhaar Card",       icon:"🪪"},
                {key:"doc_pan",      label:"PAN Card",           icon:"💳"},
                {key:"doc_bank",     label:"Bank Details",       icon:"🏦"},
                {key:"geo_photo_url",label:"Geo-tag Site Photo", icon:"📍", isPhoto:true},
                {key:"doc_itr",      label:"ITR / Form 16",      icon:"📋"},
              ].map(doc=>{
                const val = doc.isPhoto ? geoPhoto : docs[doc.key];
                return (
                  <div key={doc.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",marginBottom:4,borderRadius:7,background:val?T.grnL:T.surfaceB,border:`1px solid ${val?T.grnM:T.b1}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:16}}>{doc.icon}</span>
                      <span style={{fontSize:12,fontWeight:600,color:val?T.grn:T.t4}}>{val?"✓ ":""}{doc.label}</span>
                    </div>
                    {val?<a href={val} target="_blank" rel="noreferrer" style={{fontSize:11,color:T.blu,fontWeight:600,padding:"2px 8px",background:T.bluL,borderRadius:5,textDecoration:"none",border:`1px solid ${T.bluM}`}}>View ↗</a>
                      :<span style={{fontSize:10,color:T.t4}}>Not uploaded</span>}
                  </div>
                );
              })}
            </div>
            {/* ── Read-only Brand Quotations ── */}
            <div style={{background:"white",borderRadius:9,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:T.t1,marginBottom:10}}>💰 Brand Quotations</div>
              {brands.filter(b=>b.brand&&b.amount).map((b,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",marginBottom:6,borderRadius:8,background:selectedBrand===b.brand?T.grnL:T.surfaceB,border:`1.5px solid ${selectedBrand===b.brand?T.grnM:T.b1}`}}>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{b.brand} {selectedBrand===b.brand&&<span style={{color:T.grn}}>✓ Selected</span>}</div>
                    {b.file&&<a href={b.file} target="_blank" rel="noreferrer" style={{fontSize:10,color:T.blu}}>📄 Quotation PDF</a>}
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:T.grn}}>₹{Number(b.amount).toLocaleString("en-IN")}</span>
                </div>
              ))}
              {brands.filter(b=>b.brand&&b.amount).length===0&&<div style={{fontSize:12,color:T.t4}}>No quotations added</div>}
            </div>
          </div>
        )}
        {tab==="quotations"&&!isProject&&(
          <div>
            {/* ── ALL DOCUMENTS — accessible at any stage ── */}
            <div style={{background:"white",borderRadius:9,border:`1px solid ${T.b1}`,padding:"14px",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:4}}>📄 Documents</div>
              <div style={{fontSize:11.5,color:T.t3,marginBottom:12}}>Kisi bhi stage mein upload karo — jo available ho woh abhi daal do</div>
              {[
                {key:"doc_ele_bill", label:"Electricity Bill",   icon:"⚡", required:true},
                {key:"doc_aadhaar",  label:"Aadhaar Card",       icon:"🪪", required:true},
                {key:"doc_pan",      label:"PAN Card",           icon:"💳", required:true},
                {key:"doc_bank",     label:"Bank Details",       icon:"🏦", required:true},
                {key:"geo_photo_url",label:"Geo-tag Site Photo", icon:"📍", required:true, isPhoto:true},
                {key:"doc_itr",      label:"ITR / Form 16",      icon:"📋", required:false},
              ].map(doc=>{
                const val = doc.isPhoto ? geoPhoto : docs[doc.key];
                const setVal = doc.isPhoto
                  ? (url)=>{setGeoPhoto(url);api.patch("/solar/leads/"+data.id,{geo_photo_url:url}).catch(()=>{});}
                  : (url)=>{setDocs(p=>({...p,[doc.key]:url}));api.patch("/solar/leads/"+data.id,{[doc.key]:url}).catch(()=>{});};
                return (
                  <div key={doc.key} style={{marginBottom:10,padding:"10px 12px",background:val?T.grnL:T.surfaceB,borderRadius:8,border:`1.5px solid ${val?T.grnM:T.b1}`,transition:"all .2s"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:val?6:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:18}}>{doc.icon}</span>
                        <div>
                          <span style={{fontSize:12.5,fontWeight:700,color:val?T.grn:T.t1}}>{val?"✓ ":""}{doc.label}</span>
                          {doc.required&&!val&&<span style={{fontSize:10,color:T.red,marginLeft:5}}>Required</span>}
                          {!doc.required&&!val&&<span style={{fontSize:10,color:T.t4,marginLeft:5}}>Optional</span>}
                        </div>
                      </div>
                      {val&&<a href={val} target="_blank" rel="noreferrer"
                        style={{fontSize:11,color:T.blu,fontWeight:600,padding:"2px 8px",background:T.bluL,borderRadius:5,textDecoration:"none",border:`1px solid ${T.bluM}`}}>
                        View ↗
                      </a>}
                    </div>
                    {!val&&(
                      <div style={{display:"flex",gap:6}}>
                        <label style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"7px",borderRadius:6,border:`1.5px dashed ${T.b2}`,background:"white",cursor:"pointer",fontSize:11.5,fontWeight:600,color:T.t3}}>
                          <input type="file" accept={doc.isPhoto?"image/*":"image/*,application/pdf"} capture="environment"
                            onChange={async e=>{
                              const file=e.target.files?.[0]; if(!file) return;
                              setUploading(p=>({...p,[doc.key]:true})); setErr("");
                              try{ const url=await uploadToCloudinary(file,doc.isPhoto?"image":"doc"); setVal(url); }
                              catch(ex){ setErr(ex.message||"Upload failed"); }
                              setUploading(p=>({...p,[doc.key]:false}));
                            }} style={{display:"none"}} disabled={uploading[doc.key]}/>
                          {uploading[doc.key]?"Uploading...":"📷 Camera"}
                        </label>
                        <label style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"7px",borderRadius:6,border:`1.5px dashed ${T.b2}`,background:"white",cursor:"pointer",fontSize:11.5,fontWeight:600,color:T.t3}}>
                          <input type="file" accept={doc.isPhoto?"image/*":"image/*,application/pdf"}
                            onChange={async e=>{
                              const file=e.target.files?.[0]; if(!file) return;
                              setUploading(p=>({...p,[doc.key]:true})); setErr("");
                              try{ const url=await uploadToCloudinary(file,doc.isPhoto?"image":"doc"); setVal(url); }
                              catch(ex){ setErr(ex.message||"Upload failed"); }
                              setUploading(p=>({...p,[doc.key]:false}));
                            }} style={{display:"none"}} disabled={uploading[doc.key]}/>
                          {uploading[doc.key]?"...":"📁 File"}
                        </label>
                      </div>
                    )}
                    {val&&(
                      <label style={{display:"block",textAlign:"center",fontSize:11,color:T.blu,cursor:"pointer",marginTop:2}}>
                        <input type="file" accept={doc.isPhoto?"image/*":"image/*,application/pdf"}
                          onChange={async e=>{
                            const file=e.target.files?.[0]; if(!file) return;
                            setUploading(p=>({...p,[doc.key]:true})); setErr("");
                            try{ const url=await uploadToCloudinary(file,doc.isPhoto?"image":"doc"); setVal(url); }
                            catch(ex){ setErr(ex.message||"Upload failed"); }
                            setUploading(p=>({...p,[doc.key]:false}));
                          }} style={{display:"none"}} disabled={uploading[doc.key]}/>
                        {uploading[doc.key]?"Uploading...":"Replace"}
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Brand Quotations ── */}
            <div style={{background:"white",borderRadius:9,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:T.t1,marginBottom:10}}>💰 Brand Quotations</div>
              {brands.map((b,i)=>(
                <div key={i} style={{marginBottom:10,padding:"10px 12px",background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <div>
                      <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Brand Name</label>
                      <input value={b.brand} onChange={e=>setBrands(p=>p.map((x,j)=>j===i?{...x,brand:e.target.value}:x))}
                        onBlur={()=>saveQuotations()}
                        placeholder={`Brand ${i+1}`}
                        style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                    </div>
                    <div>
                      <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Amount (₹)</label>
                      <input type="number" value={b.amount} onChange={e=>setBrands(p=>p.map((x,j)=>j===i?{...x,amount:e.target.value}:x))}
                        onBlur={()=>saveQuotations()}
                        placeholder="e.g. 250000"
                        style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                    </div>
                  </div>
                  {/* PDF Quotation Upload */}
                  <div style={{marginBottom:8}}>
                    <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>📎 Quotation PDF</label>
                    {b.file?(
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <a href={b.file} target="_blank" rel="noreferrer"
                          style={{flex:1,display:"flex",alignItems:"center",gap:5,padding:"6px 9px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,fontSize:11.5,color:T.grn,textDecoration:"none",fontWeight:600}}>
                          📄 PDF Uploaded ✓
                        </a>
                        <button onClick={()=>{const updated=brands.map((x,j)=>j===i?{...x,file:""}:x);setBrands(updated);saveQuotations(updated);}}
                          style={{padding:"6px 8px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:10,cursor:"pointer",fontWeight:600}}>✕</button>
                      </div>
                    ):(
                      <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"7px",borderRadius:6,border:`1.5px dashed ${T.b1}`,fontSize:11.5,color:T.t3,cursor:uploading[`brand_${i}`]?"not-allowed":"pointer",background:"white"}}>
                        <input type="file" accept="application/pdf,image/*" style={{display:"none"}} disabled={uploading[`brand_${i}`]}
                          onChange={async e=>{
                            const file=e.target.files[0]; if(!file)return;
                            setUploading(p=>({...p,[`brand_${i}`]:true}));
                            try{
                              const url=await uploadToCloudinary(file,"doc");
                              const updated=brands.map((x,j)=>j===i?{...x,file:url}:x);
                              setBrands(updated);
                              saveQuotations(updated);
                            }catch(er){alert("Upload failed");}
                            setUploading(p=>({...p,[`brand_${i}`]:false}));
                            e.target.value="";
                          }}/>
                        {uploading[`brand_${i}`]?"Uploading...":"📤 Upload PDF / Image"}
                      </label>
                    )}
                  </div>
                  {b.amount&&b.brand&&(
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <button onClick={async()=>{
                        const amt=`₹${Number(b.amount).toLocaleString("en-IN")}`;
                        const kw=data.requirement_kw||"3";
                        let text=`Dear ${data.name},

Solar Quotation — PM Surya Ghar

Brand: ${b.brand}
System: ${kw}kW (${data.requirement_type||"Residential"})
Total: ${amt} (incl. GST + 5yr maintenance)`;
                        if(b.file) text+=`\n\nQuotation PDF: ${b.file}`;
                        text+=`\n\n— ${data.assignedTo||"Team"}`;
                        window.open("https://api.whatsapp.com/send?phone=91"+data.phone+"&text="+encodeURIComponent(text),"_blank");
                      }} style={{flex:1,padding:"6px",borderRadius:6,background:"#25D366",border:"none",color:"white",fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
                        WhatsApp ↗
                      </button>
                      <span style={{fontSize:12,fontWeight:700,color:T.grn}}>₹{Number(b.amount).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={saveQuotations}
                style={{width:"100%",padding:"8px",borderRadius:7,background:T.blu,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                💾 Save Quotations
              </button>
            </div>

            {/* Final selection + convert — only at proposal/converted stage */}
            {(data.stage==="converted"||data.stage==="proposal")&&(
              <div style={{background:"white",borderRadius:9,border:`1.5px solid ${T.grnM}`,padding:"12px 14px"}}>
                <div style={{fontSize:12,fontWeight:700,color:T.grn,marginBottom:10}}>✅ Final Quotation Selection</div>
                {brands.filter(b=>b.brand&&b.amount).map((b,i)=>(
                  <button key={i} onClick={()=>{setSelectedBrand(b.brand);api.patch("/solar/leads/"+data.id,{selected_brand:b.brand}).catch(()=>{});}}
                    style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderRadius:8,border:`2px solid ${selectedBrand===b.brand?T.grn:T.b1}`,background:selectedBrand===b.brand?T.grnL:"white",marginBottom:6,cursor:"pointer",transition:"all .15s"}}>
                    <span style={{fontSize:12.5,fontWeight:600,color:selectedBrand===b.brand?T.grn:T.t1}}>{b.brand}</span>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:13,fontWeight:700,color:T.grn}}>₹{Number(b.amount).toLocaleString("en-IN")}</span>
                      {selectedBrand===b.brand&&<span style={{fontSize:16}}>✓</span>}
                    </div>
                  </button>
                ))}
                {data.stage==="converted"&&(
                  <button onClick={async()=>{
                    const missing=[];
                    if(!docs.doc_ele_bill) missing.push("Electricity Bill");
                    if(!docs.doc_aadhaar) missing.push("Aadhaar");
                    if(!docs.doc_pan) missing.push("PAN");
                    if(!docs.doc_bank) missing.push("Bank Details");
                    if(!selectedBrand) missing.push("Final Quotation");
                    if(missing.length>0) return setErr("Required: "+missing.join(", "));
                    setSaving(true); setErr("");
                    try{
                      const res=await api.post("/solar/leads/"+data.id+"/convert",{});
                      if(res.success){alert("✅ Project created successfully!");onConvertToProject(res.data);onClose();}
                      else {setErr(res.message||"Conversion failed");alert("❌ "+(res.message||"Conversion failed"));}
                    }catch(e){setErr("Server error: "+e.message);alert("❌ Server error: "+e.message);}
                    setSaving(false);
                  }} disabled={saving}
                    style={{width:"100%",padding:"12px",borderRadius:8,background:saving?T.b1:"linear-gradient(135deg,#059669,#10B981)",color:"white",border:"none",fontSize:13,fontWeight:700,cursor:"pointer",marginTop:8}}>
                    {saving?"Creating Project...":"🚀 Convert to Solar Project"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MOVE STAGE ── */}
        {tab==="move"&&(
          <div>
            <div style={{fontSize:12.5,color:T.t2,marginBottom:12}}>
              Move <strong>{data.name}</strong> to a different stage:
            </div>
            {SOLAR_STAGES.filter(s=>s.id!=="project").map(s=>{
              const isCurrent = s.id===data.stage;
              return (
                <button key={s.id} onClick={async()=>{
                  if(isCurrent) return;
                  // Solar-specific validation
                  if(s.id==="proposal"&&!data.exact_address) return setErr("Site address required before moving to Proposal. Fill in Follow-up tab first.");
                  if(s.id==="converted"){
                    const hasQuot = brands.some(b=>b.brand&&b.amount);
                    if(!geoPhoto) return setErr("Geo-tagged roof photo required (upload in Quotations tab)");
                    if(!hasQuot) return setErr("Minimum 1 brand quotation required (fill in Quotations tab)");
                  }
                  setErr("");
                  await moveStage(s.id);
                }}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:9,border:`2px solid ${isCurrent?s.color:T.b1}`,background:isCurrent?s.bg:T.surface,marginBottom:8,cursor:isCurrent?"default":"pointer",transition:"all .15s"}}
                  onMouseEnter={e=>{if(!isCurrent){e.currentTarget.style.borderColor=s.color;e.currentTarget.style.background=s.bg;}}}
                  onMouseLeave={e=>{if(!isCurrent){e.currentTarget.style.borderColor=T.b1;e.currentTarget.style.background=T.surface;}}}>
                  <div style={{width:12,height:12,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                  <div style={{flex:1,textAlign:"left"}}>
                    <div style={{fontSize:13,fontWeight:600,color:isCurrent?s.color:T.t1}}>{s.label} {isCurrent&&"← Current"}</div>
                    <div style={{fontSize:11,color:T.t4}}>{s.desc}</div>
                  </div>
                  {!isCurrent&&<IcMove size={14} color={T.t4}/>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── STICKY MOVE STAGE FOOTER ── */}
      {data.stage!=="converted"&&data.stage!=="lost"&&data.stage!=="project"&&(()=>{
        const idx2=SOLAR_STAGES.findIndex(s=>s.id===data.stage);
        const nextStage=SOLAR_STAGES[idx2+1];
        if(!nextStage||nextStage.id==="lost") return null;
        return (
          <div style={{padding:"10px 14px",borderTop:`1.5px solid ${T.b1}`,background:"white",flexShrink:0,display:"flex",gap:8,alignItems:"center"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px"}}>Current Stage</div>
              <div style={{fontSize:12,fontWeight:700,color:stage.color}}>{stage.label}</div>
            </div>
            <button onClick={async()=>{
              setErr("");
              if(nextStage.id==="proposal"&&!data.exact_address) return setErr("Address fill karo — Follow Ups tab mein");
              if(nextStage.id==="converted"){
                const hasQuot=brands.some(b=>b.brand&&b.amount);
                if(!geoPhoto) return setErr("Geo photo required — Documents tab mein upload karo");
                if(!hasQuot) return setErr("Brand quotation required — Documents tab mein bharo");
              }
              await patchLead({stage:nextStage.id});
            }} disabled={saving}
              style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:8,background:saving?T.b1:nextStage.color,color:"white",border:"none",fontSize:12.5,fontWeight:700,cursor:saving?"not-allowed":"pointer",whiteSpace:"nowrap",flexShrink:0}}>
              {saving?"Moving...":"Move to "+nextStage.label+" →"}
            </button>
          </div>
        );
      })()}
    </div>
  </>);
}


// ── MAIN CRM MODULE ──────────────────────────────────────────────
function CRMModule(){
  const [leads,setLeads]=useState([]);
  const [solarLeads,setSolarLeads]=useState([]);
  const [selLead,setSelLead]=useState(null);
  const [selSolarLead,setSelSolarLead]=useState(null);
  const [waLead,setWaLead]=useState(null);
  const [designLead,setDesignLead]=useState(null);
  const [shareTarget,setShareTarget]=useState(null);
  const [showDesignOverview,setShowDesignOverview]=useState(false);
  const [showTypeSelector,setShowTypeSelector]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [showAddSolar,setShowAddSolar]=useState(false);
  const [addStage,setAddStage]=useState("lead");

  // Company module type — derived from stored user domain (never stale)
  const _storedUser = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const _domain = _storedUser.company_domain || "construction_individual";
  const canSolar = ["surya_ghar","surya_ghar_plus","solar_commercial"].includes(_domain);
  const canConstruction = !canSolar; // all non-solar domains are construction

  // Smart lead opener — bypasses type selector for single-module companies
  const openNewLead = (stageId) => {
    setAddStage(stageId || "lead");
    if (canSolar && !canConstruction) { setShowAddSolar(true); }        // Solar only
    else if (canConstruction && !canSolar) { setShowAdd(true); }         // Construction only
    else { setShowTypeSelector(true); }                                   // Both → show selector
  };
  const [reminderLead,setReminderLead]=useState(null);
  const [dismissedReminders,setDismissedReminders]=useState([]);
  const [quotPromptLead,setQuotPromptLead]=useState(null);
  const [selectFinalLead,setSelectFinalLead]=useState(null);
  const [showTemplates,setShowTemplates]=useState(false);
  const [loading,setLoading]=useState(true);
  const [teamMembers,setTeamMembers]=useState([]);

  // Filters
  const [search,setSearch]=useState("");
  const [fAssignee,setFAssignee]=useState("All");
  const [fSource,setFSource]=useState("All");
  const [fProjType,setFProjType]=useState("All");
  const [fPriority,setFPriority]=useState("All");
  const [showFilters,setShowFilters]=useState(false);

  const filters={search,assignedTo:fAssignee,source:fSource,projType:fProjType,priority:fPriority};
  const activeF=[fAssignee!=="All",fSource!=="All",fProjType!=="All",fPriority!=="All"].filter(Boolean).length;

  const ASSIGNED_TO=teamMembers.length>0?teamMembers.map(m=>m.name):[];

  // Load leads from API
  const loadLeads=useCallback(async()=>{
    setLoading(true);
    try{
      const res=await api.get("/crm/leads");
      if(res.success){
        const mapped=res.data.map(l=>({
          ...l,
          projType:l.proj_type||l.projType||"Residential",
          assignedTo:l.assigned_to_name||l.assignedTo||"—",
          budget:Number(l.budget)||0,
          contactDate:l.contact_date?new Date(l.contact_date).toISOString().split("T")[0]:null,
          createdAt:l.created_at?new Date(l.created_at).toISOString().split("T")[0]:null,
          followupHistory:l.followupHistory||[],
          tags:Array.isArray(l.tags)?l.tags:(typeof l.tags==="string"?JSON.parse(l.tags||"[]"):[]),
          convertedValue:l.converted_value!=null?Number(l.converted_value):(l.convertedValue!=null?Number(l.convertedValue):null),
          convertedDate:l.converted_date?new Date(l.converted_date).toISOString().split("T")[0]:null,
        }));
        setLeads(mapped);
      }
    }catch(e){console.error("Load leads error:",e);}
    setLoading(false);
  },[]);

  // Load team members
  const loadTeam=useCallback(async()=>{
    try{
      const res=await api.get("/crm/team");
      if(res.success) setTeamMembers(res.data);
    }catch(e){}
  },[]);

  useEffect(()=>{
    loadLeads();loadTeam();
    // Load solar leads
    api.get("/solar/leads").then(r=>{
      if(r.success) setSolarLeads(r.data.map(l=>({...l,_type:"solar",stage:l.stage||"lead",priority:l.priority||"Medium",source:l.source||"Direct Call",assignedTo:l.assigned_to_name||l.assignedTo||"—",budget:0,projType:`${l.requirement_kw||"?"}kW Solar`,city:l.city||"",contactDate:l.followup_date?new Date(l.followup_date).toISOString().split("T")[0]:null,tags:[],followupHistory:[]})));
    }).catch(()=>{});
  },[loadLeads,loadTeam]);

  // Auto-trigger reminder for today's contacts
  useEffect(()=>{
    const today=leads.find(l=>
      l.contactDate&&
      daysDiff(l.contactDate)<=0&&
      !dismissedReminders.includes(l.id)&&
      l.stage!=="converted"&&l.stage!=="lost"
    );
    if(today&&!reminderLead) setReminderLead(today);
  },[leads,dismissedReminders]);

  const moveLead=(lead,dir)=>{
    const idx=STAGES.findIndex(s=>s.id===lead.stage);
    const newIdx=Math.min(Math.max(0,idx+dir),STAGES.length-1);
    updateLead(lead.id,{stage:STAGES[newIdx].id});
  };

  const updateLead=async(id,update)=>{
    // Optimistic update — note camelCase keys (cityId, constructionTypeId)
    // will live alongside the snake_case ones in state until the re-fetch
    // below replaces them with authoritative server values + joined names.
    setLeads(p=>p.map(l=>l.id===id?{...l,...update}:l));
    if(selLead?.id===id) setSelLead(p=>({...p,...update}));
    try{
      await api.patch("/crm/leads/"+id,update);
      // Re-fetch authoritative state (with joined city_name +
      // construction_type_name + snake_case FK columns). This is what
      // makes city_id / construction_type_id propagate correctly into
      // local state — the optimistic spread above writes camelCase keys
      // that don't match the rest of the UI's snake_case reads.
      try {
        const fresh = await api.get("/crm/leads/" + id);
        if (fresh?.success && fresh.data) {
          setLeads(p=>p.map(l=>l.id===id?{...l,...fresh.data}:l));
          if(selLead?.id===id) setSelLead(p=>({...p,...fresh.data}));
        }
      } catch(_) {}
      // Stage change prompts (non-blocking — stage already changed)
      if(update.stage==="proposal"){
        const lead=leads.find(l=>l.id===id);
        if(lead) setQuotPromptLead({...lead,...update});
      }
      if(update.stage==="converted"){
        const lead=leads.find(l=>l.id===id);
        if(lead) setSelectFinalLead({...lead,...update});
      }
    }catch(e){console.error("Update lead error:",e);loadLeads();}
  };

  const addLead=async(form)=>{
    try{
      const res=await api.post("/crm/leads",{
        name:form.name,phone:form.phone,email:form.email,city:form.city,
        projType:form.projType,budget:Number(form.budget)||0,source:form.source,
        assignedTo:teamMembers.find(m=>m.name===form.assignedTo)?.id||null,
        stage:form.stage,priority:form.priority,
        contactDate:form.contactDate||null,notes:form.notes||null,
        tags:form.tags?form.tags.split(",").map(t=>t.trim()).filter(Boolean):[],
      });
      if(res.success){
        loadLeads(); // Reload from API
      }
    }catch(e){console.error("Add lead error:",e);}
  };

  const addSolarLead = async (form) => {
    try {
      const res = await api.post("/solar/leads", {
        name:form.name, phone:form.phone, city:form.city,
        location:form.location, requirement_kw:form.requirement_kw,
        source:form.source, priority:form.priority,
        assigned_to: teamMembers.find(m=>m.name===form.assignedTo)?.id||null,
        followup_date:form.contactDate||null, notes:form.notes||null,
        stage:"lead",
      });
      if(res.success && res.data){
        const mapped = {...res.data,_type:"solar",stage:"lead",priority:form.priority||"Medium",source:form.source,assignedTo:form.assignedTo,budget:0,projType:`${form.requirement_kw||"3"}kW Solar`,city:form.city,contactDate:form.contactDate||null,tags:[],followupHistory:[]};
        setSolarLeads(p=>[mapped,...p]);
      }
    } catch(e){ console.error("Add solar lead error:",e); }
  };

  // Merge all leads for KPI counts
  const allLeads = [...(canConstruction?leads:[]),...(canSolar?solarLeads:[])];
  const todayDueCount=allLeads.filter(l=>l.contactDate&&daysDiff(l.contactDate)<=0&&!dismissedReminders.includes(l.id)&&l.stage!=="converted"&&l.stage!=="project"&&l.stage!=="lost").length;
  const pipelineValue=leads.filter(l=>l.stage!=="lost"&&l.stage!=="project").reduce((s,l)=>s+(Number(l.budget)||0),0);
  const convertedValue=leads.filter(l=>l.stage==="converted"||l.stage==="project").reduce((s,l)=>s+(Number(l.convertedValue)||Number(l.budget)||0),0);
  const conversionRate=allLeads.length?Math.round((allLeads.filter(l=>l.stage==="converted"||l.stage==="project").length/allLeads.length)*100):0;

  const TILES=[
    {l:"Total Leads",v:leads.length,sub:`${leads.filter(l=>l.stage==="lead").length} new · ${leads.filter(l=>l.stage==="followup").length} followup`,c:T.blu,I:IcCRM},
    {l:"Pipeline Value",v:`₹${fmt(pipelineValue)}`,sub:"Active leads combined",c:T.pur,I:IcRs},
    {l:"Converted",v:`₹${fmt(convertedValue)}`,sub:`${leads.filter(l=>l.stage==="converted").length} deals · ${conversionRate}% rate`,c:T.grn,I:IcChk},
    {l:"Follow Up Today",v:todayDueCount,sub:"Contact date due",c:todayDueCount>0?T.red:T.grn,I:IcCal},
  ];

  if(loading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:14}}>
      <div style={{width:36,height:36,border:"3px solid #E2E8F0",borderTopColor:"#1565C0",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
      <div style={{fontSize:13,color:"#8896A6"}}>Loading CRM...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{background:T.bg,height:"100%",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* KPI Tiles */}
      <div style={{padding:"12px 18px 8px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {TILES.map((s,i)=>(
            <div key={i} style={{padding:"12px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderTop:`3px solid ${s.c}`,display:"flex",alignItems:"flex-start",gap:11}}>
              <div style={{width:34,height:34,borderRadius:8,background:s.c+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <s.I size={16} color={s.c}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{s.l}</div>
                <div style={{fontSize:20,fontWeight:700,color:T.t1,lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:10.5,color:T.t4,marginTop:3}}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{padding:"0 18px 8px",flexShrink:0}}>
        <div style={{background:"#0D1B2A",borderRadius:10,padding:"0 10px",display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 10px rgba(0,0,0,0.2)"}}>
          <div style={{position:"relative",flex:1,maxWidth:220,margin:"8px 0"}}>
            <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={12} color="rgba(255,255,255,0.3)"/></span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or phone..."
              style={{width:"100%",height:30,padding:"0 8px 0 26px",borderRadius:6,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.1)",fontSize:12,color:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          <button onClick={()=>setShowFilters(s=>!s)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:6,border:`1px solid ${activeF>0?"rgba(255,171,0,0.5)":"rgba(255,255,255,0.18)"}`,background:activeF>0?"rgba(255,171,0,0.15)":"rgba(255,255,255,0.07)",color:activeF>0?"#FDE68A":"rgba(255,255,255,0.7)",fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
            <IcFilter size={12} color="currentColor"/> Filters {activeF>0&&<span style={{background:T.amb,color:"white",fontSize:9,fontWeight:800,padding:"0 5px",borderRadius:10}}>{activeF}</span>}
          </button>
          <div style={{flex:1}}/>
          {todayDueCount>0&&<div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",background:"rgba(217,119,6,0.2)",borderRadius:6,border:"1px solid rgba(217,119,6,0.4)"}}>
            <IcAlert size={11} color={T.amb}/>
            <span style={{fontSize:10.5,fontWeight:700,color:T.ambM}}>{todayDueCount} due today</span>
          </div>}
          <button onClick={()=>setShowDesignOverview(true)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:6,background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.4)",color:"#C4B5FD",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            🎨 Design Status
          </button>
          <ExportMenu
            filename="crm-leads"
            title="CRM Leads"
            columns={[
              {key:"name",label:"Name"},
              {key:"phone",label:"Phone"},
              {key:"email",label:"Email"},
              {key:"city",label:"City"},
              {key:"projType",label:"Project Type"},
              {key:"budget",label:"Budget",get:r=>r.budget?`₹${r.budget}`:""},
              {key:"source",label:"Source"},
              {key:"assignedTo",label:"Assigned To"},
              {key:"stage",label:"Stage",get:r=>STAGES.find(s=>s.id===r.stage)?.label||r.stage||""},
              {key:"priority",label:"Priority"},
              {key:"contactDate",label:"Next Contact"},
              {key:"createdAt",label:"Created"},
              {key:"notes",label:"Notes"},
            ]}
            rows={[...(canConstruction?leads:[]),...(canSolar?solarLeads:[])]}
            onImport={async(rows)=>{
              if(!rows.length){alert("No rows to import");return;}
              if(!window.confirm(`Import ${rows.length} lead${rows.length>1?"s":""}?`))return;
              let ok=0,fail=0;
              for(const r of rows){
                try{
                  const res=await api.post("/crm/leads",{
                    name:r.Name||r.name||"",
                    phone:r.Phone||r.phone||"",
                    email:r.Email||r.email||"",
                    city:r.City||r.city||"",
                    projType:r["Project Type"]||r.projType||"Residential",
                    budget:Number(String(r.Budget||r.budget||"").replace(/[^\d.]/g,""))||0,
                    source:r.Source||r.source||"",
                    stage:"lead",priority:r.Priority||r.priority||"Medium",
                    notes:r.Notes||r.notes||"",
                  });
                  if(res.success)ok++;else fail++;
                }catch{fail++;}
              }
              alert(`Imported: ${ok}${fail?` · Failed: ${fail}`:""}`);
              loadLeads();
            }}
          />
          <button onClick={()=>setShowTemplates(true)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:6,background:T.surfaceB,border:`1px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            📋 Templates
          </button>
          <button onClick={()=>openNewLead("lead")}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:6,background:canSolar&&!canConstruction?"linear-gradient(135deg,#E65100,#FF8F00)":T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcAdd size={13} color="white"/> {canSolar&&!canConstruction?"☀ New Solar Lead":"New Lead"}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters&&(
          <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"10px 14px",marginTop:6,display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            {[{l:"Assigned",v:fAssignee,fn:setFAssignee,opts:["All",...ASSIGNED_TO]},
              {l:"Source",v:fSource,fn:setFSource,opts:["All",...SOURCES]},
              {l:"Project Type",v:fProjType,fn:setFProjType,opts:["All",...PROJ_TYPES]},
              {l:"Priority",v:fPriority,fn:setFPriority,opts:["All","High","Medium","Low"]},
            ].map(({l,v,fn,opts})=>(
              <div key={l}>
                <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:3}}>{l}</div>
                <select value={v} onChange={e=>fn(e.target.value)}
                  style={{height:30,padding:"0 10px",borderRadius:6,border:`1.5px solid ${v!=="All"?T.blu:T.b1}`,background:v!=="All"?T.bluL:T.surface,fontSize:12,color:v!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  {opts.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            {activeF>0&&<button onClick={()=>{setFAssignee("All");setFSource("All");setFProjType("All");setFPriority("All");}}
              style={{height:30,padding:"0 11px",borderRadius:6,border:`1px solid ${T.b1}`,background:T.surfaceB,color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer",alignSelf:"flex-end"}}>
              Clear
            </button>}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div style={{flex:1,overflowY:"auto",padding:"0 18px 16px"}}>
        <KanbanBoard
          leads={[...(canConstruction?leads:[]),...(canSolar?solarLeads:[])]}
          filters={filters}
          onOpenLead={(lead)=>lead._type==="solar"?setSelSolarLead(lead):setSelLead(lead)}
          onMoveLead={moveLead}
          onWhatsApp={(lead)=>setWaLead(lead)}
          onDesign={(lead)=>setDesignLead(lead)}
          onAddLead={(stageId)=>openNewLead(stageId)}
        />
      </div>

      {/* Modals & Drawers */}
      {reminderLead&&(
        <ContactReminderPopup
          lead={reminderLead}
          onDismiss={()=>{setDismissedReminders(p=>[...p,reminderLead.id]);setReminderLead(null);}}
          onWhatsApp={()=>{setWaLead(reminderLead);setReminderLead(null);}}
          onCall={()=>{window.open(`tel:+91${reminderLead.phone}`);setReminderLead(null);}}
        />
      )}
      {selLead&&(
        <LeadDetailDrawer
          lead={selLead}
          allLeads={leads}
          onClose={()=>setSelLead(null)}
          onUpdate={updateLead}
          onWhatsApp={(l)=>{setWaLead(l);setSelLead(null);}}
          initialTab={selLead._openTab||"overview"}
        />
      )}
      {selSolarLead&&(
        <SolarLeadDetailDrawer
          lead={selSolarLead}
          onClose={()=>setSelSolarLead(null)}
          onUpdate={(id,updates)=>{
            setSolarLeads(p=>p.map(l=>l.id===id?{...l,...updates}:l));
            setSelSolarLead(p=>p?{...p,...updates}:p);
            // Show quotation prompt when moved to proposal
            if(updates.stage==="proposal") setQuotPromptLead({...selSolarLead,...updates,_isSolar:true});
          }}
          onConvertToProject={(project)=>{ setSolarLeads(p=>p.map(l=>l.id===selSolarLead.id?{...l,stage:"project",converted_project_id:project.id||project.project_id}:l)); setSelSolarLead(null); }}
        />
      )}
      {showTypeSelector&&(
        <LeadTypeSelector
          onClose={()=>setShowTypeSelector(false)}
          onSelect={(type)=>{
            setShowTypeSelector(false);
            if(type==="solar"){ setShowAddSolar(true); }
            else { setShowAdd(true); }
          }}
        />
      )}
      {showAdd&&<AddLeadModal onClose={()=>setShowAdd(false)} onSave={addLead} assignedToList={ASSIGNED_TO} defaultStage={addStage}/>}
      {showAddSolar&&<AddSolarLeadModal onClose={()=>setShowAddSolar(false)} onSave={addSolarLead} assignedToList={ASSIGNED_TO} defaultStage={addStage}/>}
      {waLead&&<WhatsAppModal lead={waLead} onClose={()=>setWaLead(null)}/>}
      {/* Lead Design Drawer */}
      <LeadDesignDrawer
        lead={designLead}
        onClose={()=>setDesignLead(null)}
        onShareClick={(target)=>setShareTarget({...target,lead_phone:designLead?.phone})}
      />
      {/* Share Drawing Drawer */}
      <ShareDrawingDrawer
        target={shareTarget}
        onClose={()=>setShareTarget(null)}
      />
      {/* Company-wide Design Overview */}
      <DesignOverviewDrawer
        open={showDesignOverview}
        onClose={()=>setShowDesignOverview(false)}
        onOpenLead={(leadId)=>{
          const l = leads.find(x=>x.id===leadId);
          if(l) setSelLead(l);
        }}
        onShareClick={(target)=>setShareTarget(target)}
      />

      {/* Proposal stage prompt */}
      {quotPromptLead&&(<>
        <div onClick={()=>setQuotPromptLead(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:500,backdropFilter:"blur(1px)"}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(400px,90vw)",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",zIndex:501,overflow:"hidden",animation:"popIn .2s ease",fontFamily:"'Segoe UI',sans-serif"}}>
          <div style={{background:"#D97706",padding:"16px 20px",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:6}}>📋</div>
            <div style={{fontSize:15,fontWeight:700,color:"white"}}>Lead moved to Proposal!</div>
            <div style={{fontSize:11.5,color:"rgba(255,255,255,0.8)",marginTop:3}}>{quotPromptLead.name}</div>
          </div>
          <div style={{padding:"18px 20px",textAlign:"center"}}>
            <div style={{fontSize:13,color:T.t2,marginBottom:16}}>Kya aap is lead ke liye quotation upload karna chahte ho?</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setQuotPromptLead(null)}
                style={{flex:1,padding:"10px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>
                Baad mein
              </button>
              <button onClick={()=>{
                if(quotPromptLead._isSolar){ setSelSolarLead({...quotPromptLead,_openTab:"quotations"}); }
                else { setSelLead({...quotPromptLead,_openTab:"quotations"}); }
                setQuotPromptLead(null);
              }}
                style={{flex:2,padding:"10px",borderRadius:7,background:"#D97706",color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer"}}>
                Upload Now
              </button>
            </div>
          </div>
        </div>
      </>)}

      {/* Converted stage — select final quotation */}
      {selectFinalLead&&(<>
        <div onClick={()=>setSelectFinalLead(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:500,backdropFilter:"blur(1px)"}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(420px,90vw)",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",zIndex:501,overflow:"hidden",animation:"popIn .2s ease",fontFamily:"'Segoe UI',sans-serif"}}>
          <div style={{background:"#059669",padding:"16px 20px",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:6}}>🎉</div>
            <div style={{fontSize:15,fontWeight:700,color:"white"}}>Deal Converted!</div>
            <div style={{fontSize:11.5,color:"rgba(255,255,255,0.8)",marginTop:3}}>{selectFinalLead.name}</div>
          </div>
          <div style={{padding:"18px 20px"}}>
            <div style={{fontSize:13,color:T.t2,marginBottom:12,textAlign:"center"}}>Final quotation select karo ya skip karo:</div>
            <SelectFinalQuotation leadId={selectFinalLead.id} onDone={()=>{setSelectFinalLead(null);loadLeads();}} onSkip={()=>setSelectFinalLead(null)}/>
          </div>
        </div>
      </>)}

      {/* Template Builder */}
      {showTemplates&&<TemplateBuilderModal onClose={()=>setShowTemplates(false)}/>}

      <style>{`
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes popIn{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:10px}
        select,input,textarea{font-family:'Segoe UI',system-ui,sans-serif}
      `}</style>
    </div>
  );
}

export default CRMModule;
