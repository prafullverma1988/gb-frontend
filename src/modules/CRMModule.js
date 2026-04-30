import { useState, useEffect, useRef, useCallback } from "react";
import api from "../config/api";
import SearchSelect from "../components/SearchSelect";
import { Credit } from "../components/Credit";
import LeadDesignDrawer from "../components/LeadDesignDrawer";
import ShareDrawingDrawer from "../components/ShareDrawingDrawer";
import DesignOverviewDrawer from "../components/DesignOverviewDrawer";

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
      style={{background:T.surface,borderRadius:9,border:`1px solid ${isOverdue?T.redM:isToday?T.ambM:T.b1}`,padding:"9px 10px",cursor:"pointer",transition:"all .15s",marginBottom:7,boxShadow:isOverdue?"0 2px 8px rgba(220,38,38,0.08)":isToday?"0 2px 8px rgba(217,119,6,0.08)":"0 1px 2px rgba(15,23,42,0.04)",borderLeft:`3px solid ${stage?.color||T.slt}`}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 4px 12px rgba(15,23,42,0.08)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=isOverdue?"0 2px 8px rgba(220,38,38,0.08)":isToday?"0 2px 8px rgba(217,119,6,0.08)":"0 1px 2px rgba(15,23,42,0.04)";}}>

      {/* Top row: name + priority */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:6,marginBottom:5}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}>
            {lead._type==="solar"&&<span style={{fontSize:8.5,fontWeight:800,color:"#E65100",background:"#FFF3E0",border:"1px solid #FFD54F",borderRadius:3,padding:"1px 4px",flexShrink:0}}>☀</span>}
            <div style={{fontSize:12.5,fontWeight:700,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.name}</div>
          </div>
          <div style={{fontSize:10.5,color:T.t4,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            <IcLoc size={9} color={T.t4}/><span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{lead.city||"—"}</span>
            {lead.projType&&<span style={{color:T.b2}}>·</span>}
            {lead.projType&&<span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{lead.projType}</span>}
          </div>
        </div>
        <Pill label={lead.priority} c={ps.c} bg={ps.bg} brd={ps.brd}/>
      </div>

      {/* Budget — prominent */}
      {lead.budget>0&&(
        <div style={{fontSize:14,fontWeight:800,color:T.blu,marginBottom:6,letterSpacing:"-.2px"}}>
          ₹{fmt(lead.budget)}
        </div>
      )}

      {/* Source + Assigned (compact) */}
      <div style={{display:"flex",gap:4,marginBottom:6,flexWrap:"wrap"}}>
        {lead.source&&<span style={{fontSize:10,background:T.sltL,color:T.slt,padding:"1px 6px",borderRadius:20,border:`1px solid ${T.b2}`,whiteSpace:"nowrap"}}>{lead.source}</span>}
        {lead.assignedTo&&lead.assignedTo!=="—"&&<span style={{fontSize:10,background:T.purL,color:T.pur,padding:"1px 6px",borderRadius:20,border:`1px solid ${T.purM}`,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:110}}>👤 {lead.assignedTo}</span>}
        {lead.tags?.slice(0,1).map(tg=><span key={tg} style={{fontSize:10,background:T.ambL,color:T.amb,padding:"1px 6px",borderRadius:20,border:`1px solid ${T.ambM}`,whiteSpace:"nowrap"}}>{tg}</span>)}
      </div>

      {/* Contact date */}
      {lead.contactDate&&(
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 8px",background:isOverdue?T.redL:isToday?T.ambL:isDueSoon?"#FEF9EC":T.surfaceB,border:`1px solid ${isOverdue?T.redM:isToday?T.ambM:isDueSoon?T.ambM:T.b1}`,borderRadius:5,marginBottom:6}}>
          <IcCal size={10} color={isOverdue?T.red:isToday?T.amb:T.t4}/>
          <span style={{fontSize:10.5,fontWeight:isOverdue||isToday?700:500,color:isOverdue?T.red:isToday?T.amb:T.t3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1,minWidth:0}}>
            {isOverdue?`Overdue ${Math.abs(diff)}d`:isToday?"Contact today!":isDueSoon?`Due in ${diff}d`:lead.contactDate}
          </span>
          {(isOverdue||isToday)&&(
            <button onClick={e=>{e.stopPropagation();onWhatsApp(lead);}}
              style={{display:"flex",alignItems:"center",justifyContent:"center",width:18,height:18,borderRadius:4,background:T.wa,color:"white",border:"none",cursor:"pointer",flexShrink:0}}>
              <IcWA size={10} color="white"/>
            </button>
          )}
        </div>
      )}

      {/* Design button — compact */}
      {onDesign && (
        <div onClick={e=>e.stopPropagation()} style={{marginBottom:6}}>
          <button onClick={()=>onDesign(lead)}
            title="Design requests for this lead"
            style={{width:"100%",padding:"5px 8px",borderRadius:5,border:`1px dashed ${T.purM||"#DDD6FE"}`,background:T.purL||"#F5F3FF",color:T.pur||"#7C3AED",fontSize:10.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all .12s"}}
            onMouseEnter={e=>e.currentTarget.style.background="#EDE9FE"}
            onMouseLeave={e=>e.currentTarget.style.background=T.purL||"#F5F3FF"}>
            <span>🎨</span><span>Design Plan</span>
            {lead.design_count>0&&<span style={{background:T.pur||"#7C3AED",color:"#fff",fontSize:9,fontWeight:800,padding:"0 5px",borderRadius:8}}>{lead.design_count}</span>}
          </button>
        </div>
      )}

      {/* Footer: followup count + quick actions */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:5,borderTop:`1px solid ${T.b1}`,gap:4}}>
        <span style={{fontSize:10,color:T.t4,whiteSpace:"nowrap"}}>💬 {lead.followupHistory?.length||0}</span>
        <div style={{display:"flex",gap:3}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>onWhatsApp(lead)} title="WhatsApp"
            style={{width:22,height:22,borderRadius:4,background:"#DCFCE7",border:"1px solid #A7F3D0",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <IcWA size={10} color={T.wa}/>
          </button>
          <button onClick={()=>onMove(lead,-1)} title="Previous stage"
            style={{width:22,height:22,borderRadius:4,background:T.surfaceB,border:`1px solid ${T.b1}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:T.t3}}>
            ←
          </button>
          <button onClick={()=>onMove(lead,1)} title="Next stage"
            style={{width:22,height:22,borderRadius:4,background:T.surfaceB,border:`1px solid ${T.b1}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:T.t3}}>
            →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── KANBAN BOARD ─────────────────────────────────────────────────
function KanbanBoard({leads,filters,onOpenLead,onMoveLead,onWhatsApp,onDesign,onAddLead,showLost=false}){
  // Active 5 stages always — Lost optional, Project hidden from kanban
  const ACTIVE_IDS = ["soft_lead","lead","followup","proposal","converted"];
  const stagesShow = STAGES.filter(s =>
    ACTIVE_IDS.includes(s.id) || (s.id === "lost" && showLost)
  );

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

  const colCount = stagesShow.length;
  return(
    <div style={{display:"grid",gridTemplateColumns:`repeat(${colCount}, minmax(0, 1fr))`,gap:10,paddingBottom:12,height:"100%",alignItems:"flex-start"}}>
      {stagesShow.map(stage=>{
        const stageLeads=filterLeads(stage.id);
        const stageValue=stageLeads.reduce((s,l)=>s+(Number(l.budget)||0),0);
        const overdueInStage=stageLeads.filter(l=>daysDiff(l.contactDate)<0&&l.contactDate).length;
        return(
          <div key={stage.id}
            style={{minWidth:0,display:"flex",flexDirection:"column",height:"100%"}}>
            {/* Column header — softer, accent dot + count */}
            <div style={{borderRadius:"10px 10px 0 0",padding:"9px 11px",background:stage.bg,borderBottom:`2px solid ${stage.color}`,position:"relative"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2,gap:6}}>
                <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:stage.color,flexShrink:0}}/>
                  <span style={{fontSize:12.5,fontWeight:700,color:stage.color,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{stage.label}</span>
                </div>
                <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                  {overdueInStage>0&&(
                    <span title={`${overdueInStage} overdue`} style={{background:"#FEE2E2",color:"#DC2626",fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:10,border:"1px solid #FECACA"}}>
                      ⚠ {overdueInStage}
                    </span>
                  )}
                  <span style={{background:stage.color,color:"#fff",fontSize:10.5,fontWeight:800,padding:"1px 7px",borderRadius:20,minWidth:18,textAlign:"center"}}>{stageLeads.length}</span>
                </div>
              </div>
              <div style={{fontSize:10,color:`${stage.color}AA`,fontWeight:500,letterSpacing:".1px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{stage.desc}</div>
              {stageValue>0&&<div style={{fontSize:10.5,color:stage.color,fontWeight:700,marginTop:2}}>₹{fmt(stageValue)}</div>}
            </div>

            {/* Cards container */}
            <div style={{flex:1,overflowY:"auto",background:"#FAFBFC",borderRadius:"0 0 10px 10px",border:`1px solid ${T.b1}`,borderTop:"none",padding:"9px 8px",minHeight:200}}>
              {stageLeads.length===0&&(
                <div style={{textAlign:"center",padding:"18px 8px",color:`${stage.color}88`,fontSize:11,opacity:0.7}}>
                  Empty
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
                <button onClick={()=>onAddLead(stage.id)} style={{width:"100%",padding:"6px",borderRadius:6,border:`1.5px dashed ${stage.color}55`,background:"transparent",color:`${stage.color}CC`,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginTop:4}}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${stage.color}11`;e.currentTarget.style.color=stage.color;}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=`${stage.color}CC`;}}>
                  <IcAdd size={11} color="currentColor"/> Add {stage.label}
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
  const stage=STAGES.find(s=>s.id===lead.stage);
  const ps=PRIO_S[lead.priority]||PRIO_S["Medium"];
  const diff=daysDiff(lead.contactDate);

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
        {[{id:"overview",l:"Overview"},{id:"followup",l:`Follow Ups (${history.length})`},{id:"quotations",l:`Quotations (${quotations.length})`},{id:"contact",l:"Contact Date"},{id:"move",l:"Move Stage"}].map(t=>(
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

        {/* MOVE STAGE */}
        {tab==="move"&&(
          <div>
            <div style={{fontSize:12.5,color:T.t2,marginBottom:14}}>Move <strong>{lead.name}</strong> to a different pipeline stage:</div>
            {STAGES.map(s=>{
              const isCurrentStage=s.id===lead.stage;
              return(
                <button key={s.id} onClick={()=>{if(!isCurrentStage){onUpdate(lead.id,{stage:s.id});onClose();}}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:9,border:`2px solid ${isCurrentStage?s.color:T.b1}`,background:isCurrentStage?s.bg:T.surface,marginBottom:8,cursor:isCurrentStage?"default":"pointer",transition:"all .15s"}}
                  onMouseEnter={e=>{if(!isCurrentStage){e.currentTarget.style.borderColor=s.color;e.currentTarget.style.background=s.bg;}}}
                  onMouseLeave={e=>{if(!isCurrentStage){e.currentTarget.style.borderColor=T.b1;e.currentTarget.style.background=T.surface;}}}>
                  <div style={{width:12,height:12,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                  <div style={{flex:1,textAlign:"left"}}>
                    <div style={{fontSize:13,fontWeight:600,color:isCurrentStage?s.color:T.t1}}>{s.label} {isCurrentStage&&"← Current"}</div>
                    <div style={{fontSize:11,color:T.t4}}>{s.desc}</div>
                  </div>
                  {!isCurrentStage&&<IcMove size={14} color={T.t4}/>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
    <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
  </>);
}

// ── ADD LEAD MODAL ───────────────────────────────────────────────
function AddLeadModal({onClose,onSave,assignedToList,defaultStage}){
  const ASSIGNED_TO=assignedToList||[];
  const [form,setForm]=useState({name:"",phone:"",email:"",city:"",projType:"Residential",budget:"",source:"Direct Call",assignedTo:ASSIGNED_TO[0]||"",stage:defaultStage||"lead",priority:"Medium",contactDate:"",notes:"",tags:""});
  const [show,setShow]=useState(false);
  const upd=(k)=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const FIELDS=[
    {l:"Full Name *",k:"name",type:"input",ph:"Client full name",col:2},
    {l:"Phone *",k:"phone",type:"input",ph:"10-digit mobile",col:1},
    {l:"Email",k:"email",type:"input",ph:"email@gmail.com",col:1},
    {l:"City",k:"city",type:"input",ph:"Raipur, Durg...",col:1},
    {l:"Budget (₹)",k:"budget",type:"number",ph:"e.g. 3500000",col:1},
    {l:"Project Type",k:"projType",type:"select",opts:PROJ_TYPES,col:1},
    {l:"Lead Source",k:"source",type:"select",opts:SOURCES,col:1},
    {l:"Assigned To",k:"assignedTo",type:"select",opts:ASSIGNED_TO,col:1},
    {l:"Initial Stage",k:"stage",type:"select",opts:STAGES.map(s=>s.id),col:1},
    {l:"Priority",k:"priority",type:"select",opts:["High","Medium","Low"],col:1},
  ];
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
        </div>

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
        <button onClick={()=>{if(form.name.trim()&&form.phone.trim()){onSave(form);onClose();}}} disabled={!form.name.trim()||!form.phone.trim()}
          style={{flex:2,padding:"10px",borderRadius:7,background:form.name.trim()?T.blu:T.b1,color:form.name.trim()?"white":T.t4,fontSize:12.5,fontWeight:700,border:"none",cursor:form.name.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <IcAdd size={14} color={form.name.trim()?"white":T.t4}/> Add to Pipeline
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
            <select value={form.requirement_kw} onChange={e=>upd("requirement_kw",e.target.value)}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
              {KW_OPTIONS.map(k=><option key={k} value={k}>{k} kW</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Lead Source</label>
            <select value={form.source} onChange={e=>upd("source",e.target.value)}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
              {SOURCES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{gridColumn:"1/3"}}>{inp("Location / Area","location","Approx location or landmark")}</div>
          <div>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Assigned To</label>
            <select value={form.assignedTo} onChange={e=>upd("assignedTo",e.target.value)}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
              {ASSIGNED_TO.map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Priority</label>
            <select value={form.priority} onChange={e=>upd("priority",e.target.value)}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
              {["High","Medium","Low"].map(p=><option key={p}>{p}</option>)}
            </select>
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
                    <select value={ovForm.requirement_kw} onChange={e=>upd("requirement_kw",e.target.value)}
                      style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:"white",outline:"none",fontFamily:"inherit"}}>
                      {KW_OPTIONS.map(k=><option key={k} value={k}>{k} kW</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Type</label>
                    <select value={ovForm.requirement_type} onChange={e=>upd("requirement_type",e.target.value)}
                      style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:"white",outline:"none",fontFamily:"inherit"}}>
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3}}>Lead Source</label>
                    <select value={ovForm.source} onChange={e=>upd("source",e.target.value)}
                      style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:"white",outline:"none",fontFamily:"inherit"}}>
                      {SOURCES.map(s=><option key={s}>{s}</option>)}
                    </select>
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
  const [showLost,setShowLost]=useState(false);
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
    // Optimistic update
    setLeads(p=>p.map(l=>l.id===id?{...l,...update}:l));
    if(selLead?.id===id) setSelLead(p=>({...p,...update}));
    try{
      await api.patch("/crm/leads/"+id,update);
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
          {leads.filter(l=>l.stage==="lost").length>0&&(
            <button onClick={()=>setShowLost(s=>!s)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:6,background:showLost?"rgba(107,114,128,0.25)":"rgba(255,255,255,0.07)",border:`1px solid ${showLost?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.18)"}`,color:showLost?"#fff":"rgba(255,255,255,0.7)",fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
              {showLost?"Hide":"Show"} Lost
              <span style={{background:showLost?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.15)",color:"#fff",fontSize:9.5,fontWeight:800,padding:"1px 5px",borderRadius:10}}>
                {leads.filter(l=>l.stage==="lost").length}
              </span>
            </button>
          )}
          <button onClick={()=>setShowDesignOverview(true)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:6,background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.4)",color:"#C4B5FD",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            🎨 Design Status
          </button>
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
          showLost={showLost}
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
