import { useState, useEffect, useRef, useCallback } from "react";
import api from "../config/api";

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
  {id:"lead",     label:"Lead",       color:"#6366F1", bg:"#EEF2FF", desc:"New enquiry received"},
  {id:"followup", label:"Follow Up",  color:"#0891B2", bg:"#E0F2FE", desc:"Active conversation"},
  {id:"proposal", label:"Proposal",   color:"#D97706", bg:"#FFFBEB", desc:"Quotation sent"},
  {id:"converted",label:"Converted",  color:"#059669", bg:"#ECFDF5", desc:"Deal closed!"},
  {id:"lost",     label:"Lost",       color:"#6B7280", bg:"#F1F5F9", desc:"Not interested"},
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
              "Namaskar {lead.name.split(" ")[0]} ji 🙏 Aapne hmare saath {lead.projType} project ke liye baat ki thi. Kya aaj baat kar sakte hain? — GB Buildcon (Prafull ji)"
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
    {id:"followup",label:"Follow Up",msg:`Namaskar ${lead.name.split(" ")[0]} ji 🙏\n\nAapne hmare saath ${lead.projType} project ke liye baat ki thi. Kya aaj kuch waqt hai baat karne ka?\n\nHum aapki requirements ke anusar best solution denge.\n\n- GB Buildcon, Prafull ji\n📞 9XX-XXXXXXX`},
    {id:"proposal",label:"Proposal Sent",msg:`Namaskar ${lead.name.split(" ")[0]} ji 🙏\n\nHumne aapka ${lead.projType} project estimate taiyar kar liya hai.\n\n💰 Estimated Budget: ₹${fmt(lead.budget)}\n\nKripya review karein aur hume apne vichar batayein.\n\n- GB Buildcon\n📞 9XX-XXXXXXX`},
    {id:"reminder",label:"Reminder",msg:`Namaskar ${lead.name.split(" ")[0]} ji 🙏\n\nYaad dila dein - aapka ${lead.projType} project ke bare mein baat karna baaki hai.\n\nKya aaj ya kal koi suitable time hai?\n\n- GB Buildcon, Raipur`},
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
function LeadCard({lead,onOpen,onMove,onWhatsApp,stages}){
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
function KanbanBoard({leads,filters,onOpenLead,onMoveLead,onWhatsApp,onAddLead}){
  const stagesShow=STAGES.filter(s=>s.id!=="lost"||leads.some(l=>l.stage==="lost"));

  const filterLeads=(stageId)=>leads.filter(l=>{
    if(l.stage!==stageId) return false;
    if(filters.assignedTo!=="All"&&l.assignedTo!==filters.assignedTo) return false;
    if(filters.source!=="All"&&l.source!==filters.source) return false;
    if(filters.projType!=="All"&&l.projType!==filters.projType) return false;
    if(filters.priority!=="All"&&l.priority!==filters.priority) return false;
    if(filters.search&&!l.name.toLowerCase().includes(filters.search.toLowerCase())&&!l.phone.includes(filters.search)) return false;
    return true;
  });

  return(
    <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:12,height:"100%",alignItems:"flex-start"}}>
      {STAGES.map(stage=>{
        const stageLeads=filterLeads(stage.id);
        const stageValue=stageLeads.reduce((s,l)=>s+l.budget,0);
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
                  stages={STAGES}
                />
              ))}

              {/* Add lead shortcut */}
              {stage.id!=="lost"&&(
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
    if(!window.confirm("Delete this quotation?")) return;
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
                      <div style={{fontSize:11,color:T.t4}}>{q.created_by_name||"—"} · {q.created_at?new Date(q.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—"} · {q.file_size||"—"}</div>
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
  const ASSIGNED_TO=assignedToList||["Prafull","Vijay Sahu","Niranjan","Harsh Sahu","Priyanka"];
  const [form,setForm]=useState({name:"",phone:"",email:"",city:"",projType:"Residential",budget:"",source:"Direct Call",assignedTo:ASSIGNED_TO[0]||"Prafull",stage:defaultStage||"lead",priority:"Medium",contactDate:"",notes:"",tags:""});
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
                ?<select value={form[f.k]} onChange={upd(f.k)} style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
                  {f.opts.map(o=><option key={o}>{o}</option>)}
                </select>
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

  const addRow=()=>setItems(p=>[...p,{description:"",qty:1,unit:"SqFt",rate:0}]);
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
    if(!window.confirm("Delete this template?")) return;
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
              {[{l:"Company Name",k:"company_name",ph:"GB Buildcon"},{l:"Phone",k:"company_phone",ph:"+91-XXXXX"},{l:"Email",k:"company_email",ph:"info@gbbuildcon.com"},{l:"Address",k:"company_address",ph:"Raipur, CG"}].map(f=>(
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
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 70px 70px 90px 90px 30px",padding:"5px 10px",borderBottom:`1px solid ${T.b1}`,alignItems:"center"}}>
                  <input value={it.description} onChange={e=>updItem(i,"description",e.target.value)} placeholder="Work description"
                    style={{padding:"5px 7px",border:`1px solid ${T.b1}`,borderRadius:4,fontSize:11.5,color:T.t1,outline:"none",fontFamily:"inherit"}}/>
                  <input type="number" value={it.qty} onChange={e=>updItem(i,"qty",e.target.value)}
                    style={{padding:"5px 5px",border:`1px solid ${T.b1}`,borderRadius:4,fontSize:11.5,color:T.t1,outline:"none",width:"90%",fontFamily:"inherit"}}/>
                  <select value={it.unit} onChange={e=>updItem(i,"unit",e.target.value)}
                    style={{padding:"4px 2px",border:`1px solid ${T.b1}`,borderRadius:4,fontSize:11,color:T.t2,outline:"none",fontFamily:"inherit"}}>
                    {["SqFt","SqM","CuM","Rft","LS","Nos","KG","MT","Bags","Set"].map(u=><option key={u}>{u}</option>)}
                  </select>
                  <input type="number" value={it.rate} onChange={e=>updItem(i,"rate",e.target.value)} placeholder="₹"
                    style={{padding:"5px 5px",border:`1px solid ${T.b1}`,borderRadius:4,fontSize:11.5,color:T.t1,outline:"none",width:"90%",fontFamily:"inherit"}}/>
                  <span style={{fontSize:12,fontWeight:600,color:T.blu,paddingLeft:4}}>₹{fmtN((Number(it.qty)||0)*(Number(it.rate)||0))}</span>
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
  {id:"converted", label:"Converted", color:"#059669", bg:"#ECFDF5", desc:"Docs uploaded → Project"},
  {id:"lost",      label:"Lost",      color:"#6B7280", bg:"#F1F5F9", desc:"Not interested"},
];

const KW_OPTIONS = ["1","2","3","4","5","6","7","8","9","10"];

// Upload photo to Cloudinary
const uploadToCloudinary = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "gb_buildcon_uploads");
  const res = await fetch("https://api.cloudinary.com/v1_1/dd632nqfm/image/upload", {method:"POST",body:fd});
  const data = await res.json();
  return data.secure_url;
};

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
  const ASSIGNED_TO = assignedToList || ["Prafull","Vijay Sahu","Niranjan","Harsh Sahu","Priyanka"];
  const [form, setForm] = useState({
    name:"", phone:"", city:"Raipur", location:"",
    requirement_kw:"3", source:"Direct Call",
    assignedTo:ASSIGNED_TO[0]||"Prafull",
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

// ── Solar Lead Detail Drawer ──────────────────────────────────────
function SolarLeadDetailDrawer({lead, onClose, onUpdate, onConvertToProject}) {
  const [data, setData] = useState(lead);
  const [activeTab, setActiveTab] = useState("stage");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const [err, setErr] = useState("");

  // Stage-specific form states
  const [followupForm, setFollowupForm] = useState({
    exact_address: lead.exact_address||"",
    requirement_kw: lead.requirement_kw||"3",
    requirement_type: lead.requirement_type||"residential",
    followup_notes: lead.followup_notes||"",
  });
  const [proposalForm, setProposalForm] = useState({
    geo_photo_url: lead.geo_photo_url||"",
    brands: lead.quotation_brands || [{brand:"Brand 1",amount:""},{brand:"Brand 2",amount:""},{brand:"Brand 3",amount:""}],
  });
  const [convertForm, setConvertForm] = useState({
    selected_brand: lead.selected_brand||"",
    loan_amount: lead.loan_amount||"",
    loan_not_required: lead.loan_not_required||false,
    doc_ele_bill: lead.doc_ele_bill||"",
    doc_aadhaar: lead.doc_aadhaar||"",
    doc_pan: lead.doc_pan||"",
    doc_bank: lead.doc_bank||"",
    doc_itr: lead.doc_itr||"",
  });

  const stage = SOLAR_STAGES.find(s=>s.id===data.stage)||SOLAR_STAGES[0];
  const stageIdx = SOLAR_STAGES.findIndex(s=>s.id===data.stage);

  const save = async (updates) => {
    setSaving(true); setErr("");
    try {
      const res = await api.patch("/solar/leads/"+data.id, updates);
      if (res.success) { setData(p=>({...p,...updates,...res.data})); onUpdate(data.id,{...updates,...res.data}); }
      else setErr(res.message||"Save failed");
    } catch(e) { setErr(e.message); }
    setSaving(false);
  };

  const advanceStage = async (nextStage, extraData={}) => {
    await save({stage:nextStage,...extraData});
  };

  // Upload photo — camera or file
  const handlePhotoUpload = async (e, field, setFn) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(p=>({...p,[field]:true}));
    try {
      const url = await uploadToCloudinary(file);
      setFn(p=>({...p,[field]:url}));
      await save({[field]:url});
    } catch(ex) { setErr("Upload failed"); }
    setUploading(p=>({...p,[field]:false}));
  };

  const handleDocUpload = async (e, docKey) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(p=>({...p,[docKey]:true}));
    try {
      const url = await uploadToCloudinary(file);
      setConvertForm(p=>({...p,[docKey]:url}));
      await save({[docKey]:url});
    } catch(ex) { setErr("Upload failed"); }
    setUploading(p=>({...p,[docKey]:false}));
  };

  // Convert to project — validate docs first
  const convertToProject = async () => {
    const missing = [];
    if (!convertForm.doc_ele_bill) missing.push("Electricity Bill");
    if (!convertForm.doc_aadhaar)  missing.push("Aadhaar");
    if (!convertForm.doc_pan)      missing.push("PAN");
    if (!convertForm.doc_bank)     missing.push("Bank Details");
    if (!convertForm.selected_brand) missing.push("Final Quotation (select one brand)");
    if (missing.length > 0) return setErr("Required: "+missing.join(", "));
    setSaving(true); setErr("");
    try {
      const res = await api.post("/solar/leads/"+data.id+"/convert", {});
      if (res.success) { onConvertToProject(res.data); onClose(); }
      else setErr(res.message||"Conversion failed");
    } catch(e) { setErr(e.message||"Server error"); }
    setSaving(false);
  };

  const UploadBtn = ({label, field, value, loading:l, onPick}) => (
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:11,fontWeight:600,color:T.t3}}>{label}</span>
        {value && <a href={value} target="_blank" rel="noreferrer" style={{fontSize:10,color:T.blu}}>View ↗</a>}
      </div>
      <div style={{display:"flex",gap:6}}>
        <label style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"7px",borderRadius:7,border:`1.5px dashed ${value?T.grn:T.b1}`,background:value?T.grnL:"white",cursor:"pointer",fontSize:11.5,fontWeight:600,color:value?T.grn:T.t3}}>
          <input type="file" accept="image/*,application/pdf" capture="environment" onChange={onPick} style={{display:"none"}} disabled={l}/>
          {l?"Uploading...":value?"✓ "+label:"📷 Camera"}
        </label>
        <label style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"7px",borderRadius:7,border:`1.5px dashed ${value?T.grn:T.b1}`,background:value?T.grnL:"white",cursor:"pointer",fontSize:11.5,fontWeight:600,color:value?T.grn:T.t3}}>
          <input type="file" accept="image/*,application/pdf" onChange={onPick} style={{display:"none"}} disabled={l}/>
          {l?"...":"📁 File"}
        </label>
      </div>
    </div>
  );

  const TABS = [{id:"stage",l:"Stage Flow"},{id:"followup",l:"Follow Ups"},{id:"info",l:"Details"}];

  return (<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(520px,96vw)",background:"#F8FAFC",zIndex:301,boxShadow:"-4px 0 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease"}}>

      {/* Header */}
      <div style={{background:stage.color,padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,fontWeight:800,color:"white",background:"rgba(255,255,255,0.2)",padding:"2px 8px",borderRadius:20}}>☀ Solar EPC</span>
            <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.9)",background:"rgba(255,255,255,0.2)",padding:"2px 8px",borderRadius:20}}>{stage.label}</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"white",opacity:0.7}}><IcX size={15}/></button>
        </div>
        <div style={{fontSize:16,fontWeight:700,color:"white"}}>{data.name}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginTop:2}}>{data.phone} · {data.city} · {data.requirement_kw||"?"}kW</div>

        {/* Stage progress bar */}
        <div style={{display:"flex",gap:4,marginTop:10}}>
          {SOLAR_STAGES.filter(s=>s.id!=="lost").map((s,i)=>(
            <div key={s.id} style={{flex:1,height:3,borderRadius:3,background:stageIdx>=i?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.3)"}}/>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:"flex",borderBottom:`1px solid ${T.b1}`,background:"white",flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{flex:1,padding:"10px 6px",border:"none",background:"none",fontSize:12,fontWeight:activeTab===t.id?700:400,color:activeTab===t.id?stage.color:T.t3,borderBottom:activeTab===t.id?`2.5px solid ${stage.color}`:"2.5px solid transparent",cursor:"pointer"}}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
        {err&&<div style={{background:T.redL,color:T.red,padding:"8px 12px",borderRadius:7,fontSize:12,marginBottom:10,border:`1px solid ${T.redM}`}}>{err}</div>}

        {/* ── STAGE FLOW TAB ── */}
        {activeTab==="stage"&&(<>

          {/* STAGE 1 — Lead Info */}
          <div style={{background:"white",borderRadius:10,border:`1.5px solid ${data.stage==="lead"?stage.color:T.grnM}`,marginBottom:10,overflow:"hidden"}}>
            <div style={{padding:"10px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.b1}`,background:data.stage==="lead"?"#EEF2FF":"#ECFDF5"}}>
              <span style={{fontSize:12,fontWeight:700,color:data.stage==="lead"?"#6366F1":T.grn}}>Stage 1 — Lead Capture</span>
              <span style={{fontSize:10,fontWeight:700,color:data.stage==="lead"?"#6366F1":T.grn,background:data.stage==="lead"?"#E0E7FF":"#D1FAE5",padding:"2px 8px",borderRadius:10}}>
                {data.stage==="lead"?"Current":"✓ Done"}
              </span>
            </div>
            <div style={{padding:"10px 13px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["Name",data.name],["Phone",data.phone],["City",data.city],["System",`${data.requirement_kw||"?"}kW`],["Source",data.source||"—"],["Assigned",data.assignedTo||"—"]].map(([l,v])=>(
                <div key={l}><div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".3px"}}>{l}</div><div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{v}</div></div>
              ))}
              {data.location&&<div style={{gridColumn:"1/3"}}><div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".3px"}}>Location</div><div style={{fontSize:12.5,color:T.t1}}>{data.location}</div></div>}
            </div>
            {data.stage==="lead"&&(
              <div style={{padding:"10px 13px",borderTop:`1px solid ${T.b1}`,background:"#F8F9FF"}}>
                <button onClick={()=>advanceStage("followup")} disabled={saving}
                  style={{width:"100%",padding:"9px",borderRadius:7,background:saving?T.b1:"#6366F1",color:"white",border:"none",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>
                  Move to Follow-up →
                </button>
              </div>
            )}
          </div>

          {/* STAGE 2 — Follow-up */}
          {stageIdx>=1&&(
            <div style={{background:"white",borderRadius:10,border:`1.5px solid ${data.stage==="followup"?"#0891B2":data.stage==="lead"?T.b1:T.grnM}`,marginBottom:10,overflow:"hidden",opacity:data.stage==="lead"?0.5:1}}>
              <div style={{padding:"10px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.b1}`,background:data.stage==="followup"?"#E0F2FE":data.stage==="lead"?"#F8FAFC":"#ECFDF5"}}>
                <span style={{fontSize:12,fontWeight:700,color:data.stage==="followup"?"#0891B2":data.stage==="lead"?T.t3:T.grn}}>Stage 2 — Follow Up Details</span>
                <span style={{fontSize:10,fontWeight:700,color:data.stage==="followup"?"#0891B2":data.stage==="lead"?T.t4:T.grn,background:data.stage==="followup"?"#BAE6FD":data.stage==="lead"?T.b1:"#D1FAE5",padding:"2px 8px",borderRadius:10}}>
                  {data.stage==="followup"?"Current":data.stage==="lead"?"Pending":"✓ Done"}
                </span>
              </div>
              {data.stage==="followup"&&(
                <div style={{padding:"12px 13px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                    <div style={{gridColumn:"1/3"}}>
                      <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Exact Site Address *</label>
                      <textarea value={followupForm.exact_address} onChange={e=>setFollowupForm(p=>({...p,exact_address:e.target.value}))} placeholder="House no., Street, Area, District, Pin code" rows={2}
                        style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
                    </div>
                    <div>
                      <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Confirmed kW *</label>
                      <select value={followupForm.requirement_kw} onChange={e=>setFollowupForm(p=>({...p,requirement_kw:e.target.value}))}
                        style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
                        {KW_OPTIONS.map(k=><option key={k} value={k}>{k} kW</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Type *</label>
                      <select value={followupForm.requirement_type} onChange={e=>setFollowupForm(p=>({...p,requirement_type:e.target.value}))}
                        style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                      </select>
                    </div>
                    <div style={{gridColumn:"1/3"}}>
                      <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Follow-up Notes</label>
                      <textarea value={followupForm.followup_notes} onChange={e=>setFollowupForm(p=>({...p,followup_notes:e.target.value}))} placeholder="Customer requirements, site notes..." rows={2}
                        style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
                    </div>
                  </div>
                  <button onClick={()=>{ if(!followupForm.exact_address.trim()) return setErr("Exact address required"); advanceStage("proposal",{...followupForm}); }} disabled={saving}
                    style={{width:"100%",padding:"9px",borderRadius:7,background:saving?T.b1:"#0891B2",color:"white",border:"none",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>
                    Save & Move to Proposal →
                  </button>
                </div>
              )}
              {stageIdx>1&&data.exact_address&&(
                <div style={{padding:"10px 13px"}}>
                  <div style={{fontSize:12,color:T.t2}}><b>Address:</b> {data.exact_address}</div>
                  <div style={{fontSize:12,color:T.t3,marginTop:3}}>{data.requirement_kw}kW · {data.requirement_type}</div>
                </div>
              )}
            </div>
          )}

          {/* STAGE 3 — Proposal */}
          {stageIdx>=2&&(
            <div style={{background:"white",borderRadius:10,border:`1.5px solid ${data.stage==="proposal"?"#D97706":data.stage==="lead"||data.stage==="followup"?T.b1:T.grnM}`,marginBottom:10,overflow:"hidden",opacity:stageIdx<2?0.5:1}}>
              <div style={{padding:"10px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.b1}`,background:data.stage==="proposal"?"#FFFBEB":stageIdx<2?"#F8FAFC":"#ECFDF5"}}>
                <span style={{fontSize:12,fontWeight:700,color:data.stage==="proposal"?"#D97706":stageIdx<2?T.t3:T.grn}}>Stage 3 — Site Visit & Quotation</span>
                <span style={{fontSize:10,fontWeight:700,color:data.stage==="proposal"?"#D97706":stageIdx<2?T.t4:T.grn,background:data.stage==="proposal"?"#FDE68A":stageIdx<2?T.b1:"#D1FAE5",padding:"2px 8px",borderRadius:10}}>
                  {data.stage==="proposal"?"Current":stageIdx<2?"Pending":"✓ Done"}
                </span>
              </div>
              {data.stage==="proposal"&&(
                <div style={{padding:"12px 13px"}}>
                  {/* Geo-tagged roof photo */}
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:T.t1,marginBottom:6}}>📍 Geo-tagged Roof Photo *</div>
                    {proposalForm.geo_photo_url
                      ? <div style={{position:"relative"}}>
                          <img src={proposalForm.geo_photo_url} alt="roof" style={{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:8,border:`2px solid ${T.grnM}`}}/>
                          <span style={{position:"absolute",top:6,right:6,background:T.grn,color:"white",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10}}>✓ Uploaded</span>
                          <label style={{display:"block",marginTop:6,textAlign:"center",fontSize:11,color:T.blu,cursor:"pointer"}}>
                            <input type="file" accept="image/*" capture="environment" onChange={e=>handlePhotoUpload(e,"geo_photo_url",setProposalForm)} style={{display:"none"}}/>
                            Replace photo
                          </label>
                        </div>
                      : <div style={{display:"flex",gap:8}}>
                          <label style={{flex:1,padding:"16px",border:"2px dashed #FFC107",borderRadius:8,background:"#FFFDE7",cursor:"pointer",textAlign:"center"}}>
                            <input type="file" accept="image/*" capture="environment" onChange={e=>handlePhotoUpload(e,"geo_photo_url",setProposalForm)} style={{display:"none"}}/>
                            <div style={{fontSize:22}}>📷</div>
                            <div style={{fontSize:11.5,fontWeight:600,color:"#E65100",marginTop:4}}>{uploading.geo_photo_url?"Uploading...":"Camera"}</div>
                          </label>
                          <label style={{flex:1,padding:"16px",border:"2px dashed #FFC107",borderRadius:8,background:"#FFFDE7",cursor:"pointer",textAlign:"center"}}>
                            <input type="file" accept="image/*" onChange={e=>handlePhotoUpload(e,"geo_photo_url",setProposalForm)} style={{display:"none"}}/>
                            <div style={{fontSize:22}}>📁</div>
                            <div style={{fontSize:11.5,fontWeight:600,color:"#E65100",marginTop:4}}>File Upload</div>
                          </label>
                        </div>
                    }
                  </div>

                  {/* 3 Brand Quotations */}
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:T.t1,marginBottom:8}}>💰 Quotations (min 1 required)</div>
                    {proposalForm.brands.map((b,i)=>(
                      <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginBottom:8,alignItems:"center"}}>
                        <input value={b.brand} onChange={e=>setProposalForm(p=>({...p,brands:p.brands.map((x,j)=>j===i?{...x,brand:e.target.value}:x)}))}
                          placeholder={`Brand ${i+1} name`}
                          style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit"}}/>
                        <input type="number" value={b.amount} onChange={e=>setProposalForm(p=>({...p,brands:p.brands.map((x,j)=>j===i?{...x,amount:e.target.value}:x)}))}
                          placeholder="Amount (₹)"
                          style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit"}}/>
                        <button onClick={async()=>{
                            const brand=b.brand||`Brand ${i+1}`;
                            const kw=data.requirement_kw||"3";
                            const amt=b.amount?`₹${Number(b.amount).toLocaleString("en-IN")}`:"TBD";
                            const text=`Dear ${data.name},\n\nThank you for your interest in PM Surya Ghar rooftop solar.\n\nQuotation Details:\nBrand: ${brand}\nSystem Size: ${kw} kW\nTotal Amount: ${amt} (incl. GST)\n\nThis includes supply, installation, commissioning, 5-year maintenance, net meter, and subsidy assistance.\n\nFor details contact: [Your Phone]\n\n*Sunshine Solaar Systems*`;
                            const url=`https://api.whatsapp.com/send?phone=91${data.phone}&text=${encodeURIComponent(text)}`;
                            window.open(url,"_blank");
                          }}
                          style={{padding:"7px 10px",borderRadius:6,background:"#25D366",border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                          WhatsApp
                        </button>
                      </div>
                    ))}
                  </div>

                  <button onClick={()=>{
                    if(!proposalForm.geo_photo_url) return setErr("Geo-tagged roof photo required");
                    const hasQuot = proposalForm.brands.some(b=>b.brand&&b.amount);
                    if(!hasQuot) return setErr("Minimum 1 quotation with brand + amount required");
                    setErr("");
                    advanceStage("converted",{
                      geo_photo_url:proposalForm.geo_photo_url,
                      quotation_brands:proposalForm.brands,
                    });
                  }} disabled={saving}
                    style={{width:"100%",padding:"9px",borderRadius:7,background:saving?T.b1:"#D97706",color:"white",border:"none",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>
                    Move to Converted →
                  </button>
                </div>
              )}
              {stageIdx>2&&(
                <div style={{padding:"10px 13px",display:"flex",gap:8,alignItems:"center"}}>
                  {data.geo_photo_url&&<img src={data.geo_photo_url} alt="roof" style={{width:48,height:48,objectFit:"cover",borderRadius:6,border:`1px solid ${T.b1}`,flexShrink:0}}/>}
                  <div>
                    <div style={{fontSize:12,color:T.t2,fontWeight:600}}>Geo photo uploaded</div>
                    <div style={{fontSize:11,color:T.t3}}>3 brand quotations prepared</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STAGE 4 — Converted: Documents + Loan */}
          {stageIdx>=3&&data.stage==="converted"&&(
            <div style={{background:"white",borderRadius:10,border:`2px solid #059669`,marginBottom:10,overflow:"hidden"}}>
              <div style={{padding:"10px 13px",borderBottom:`1px solid ${T.b1}`,background:"#ECFDF5",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,fontWeight:700,color:T.grn}}>Stage 4 — Converted: Upload Docs</span>
                <span style={{fontSize:10,fontWeight:700,color:T.grn,background:"#D1FAE5",padding:"2px 8px",borderRadius:10}}>Current</span>
              </div>
              <div style={{padding:"12px 13px"}}>

                {/* Final quotation selection */}
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11.5,fontWeight:700,color:T.t1,marginBottom:7}}>✅ Select Final Quotation *</div>
                  {(data.quotation_brands||proposalForm.brands).filter(b=>b.brand&&b.amount).map((b,i)=>(
                    <button key={i} onClick={()=>{setConvertForm(p=>({...p,selected_brand:b.brand}));save({selected_brand:b.brand});}}
                      style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderRadius:8,border:`2px solid ${convertForm.selected_brand===b.brand?T.grn:T.b1}`,background:convertForm.selected_brand===b.brand?T.grnL:"white",marginBottom:6,cursor:"pointer",transition:"all .15s"}}>
                      <span style={{fontSize:12.5,fontWeight:600,color:convertForm.selected_brand===b.brand?T.grn:T.t1}}>{b.brand}</span>
                      <span style={{fontSize:13,fontWeight:700,color:T.grn}}>₹{Number(b.amount).toLocaleString("en-IN")}</span>
                      {convertForm.selected_brand===b.brand&&<span style={{fontSize:18}}>✓</span>}
                    </button>
                  ))}
                </div>

                {/* Loan details */}
                <div style={{marginBottom:12,padding:"10px 12px",background:"#FFF8E1",borderRadius:8,border:"1px solid #FFD54F"}}>
                  <div style={{fontSize:11.5,fontWeight:700,color:"#E65100",marginBottom:8}}>💰 Loan Details</div>
                  {!convertForm.loan_not_required
                    ? <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input type="number" value={convertForm.loan_amount} onChange={e=>setConvertForm(p=>({...p,loan_amount:e.target.value}))}
                          placeholder="Loan Amount (₹)" style={{flex:1,padding:"8px 10px",borderRadius:7,border:`1.5px solid #FFD54F`,fontSize:12.5,outline:"none",fontFamily:"inherit"}}
                          onBlur={()=>save({loan_amount:convertForm.loan_amount})}/>
                        <button onClick={()=>{setConvertForm(p=>({...p,loan_not_required:true,loan_amount:""}));save({loan_not_required:true,loan_amount:null});}}
                          style={{padding:"8px 12px",borderRadius:7,border:"1px solid #FFD54F",background:"white",color:"#E65100",fontSize:11.5,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                          No Loan
                        </button>
                      </div>
                    : <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{fontSize:12.5,fontWeight:600,color:T.grn}}>✓ No Loan Required</span>
                        <button onClick={()=>{setConvertForm(p=>({...p,loan_not_required:false}));save({loan_not_required:false});}}
                          style={{fontSize:11,color:T.blu,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Undo</button>
                      </div>
                  }
                  {Number(convertForm.loan_amount)>200000&&<div style={{fontSize:10.5,color:"#BF360C",marginTop:5}}>⚠ Loan &gt;₹2L — ITR / Form 16 required</div>}
                </div>

                {/* Compulsory documents */}
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11.5,fontWeight:700,color:T.t1,marginBottom:8}}>📄 Compulsory Documents</div>
                  {[
                    {key:"doc_ele_bill",label:"Electricity Bill *",req:true},
                    {key:"doc_aadhaar", label:"Aadhaar Card *",   req:true},
                    {key:"doc_pan",     label:"PAN Card *",        req:true},
                    {key:"doc_bank",    label:"Bank Details *",    req:true},
                    {key:"doc_itr",     label:`ITR / Form 16${Number(convertForm.loan_amount)>200000?" *":""}`, req:Number(convertForm.loan_amount)>200000},
                  ].map(doc=>(
                    <UploadBtn key={doc.key} label={doc.label} field={doc.key} value={convertForm[doc.key]} loading={uploading[doc.key]}
                      onPick={e=>handleDocUpload(e,doc.key)}/>
                  ))}
                </div>

                {/* Convert to project button */}
                <button onClick={convertToProject} disabled={saving}
                  style={{width:"100%",padding:"12px",borderRadius:8,background:saving?T.b1:"linear-gradient(135deg,#059669,#10B981)",color:"white",border:"none",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 12px rgba(5,150,105,0.35)"}}>
                  {saving?"Creating Project...":"🚀 Convert to Solar Project"}
                </button>
                <div style={{fontSize:10.5,color:T.t4,textAlign:"center",marginTop:6}}>All compulsory docs must be uploaded before conversion</div>
              </div>
            </div>
          )}
        </>)}

        {/* ── FOLLOW UPS TAB ── */}
        {activeTab==="followup"&&(
          <div style={{textAlign:"center",padding:"40px 20px",color:T.t4}}>
            <div style={{fontSize:32,marginBottom:8}}>📞</div>
            <div style={{fontSize:13,fontWeight:600,color:T.t2}}>Follow-up history</div>
            <div style={{fontSize:12,color:T.t4,marginTop:4}}>Contact logs yahaan dikhenge</div>
          </div>
        )}

        {/* ── DETAILS TAB ── */}
        {activeTab==="info"&&(
          <div style={{background:"white",borderRadius:10,border:`1px solid ${T.b1}`,padding:"14px"}}>
            {[["Name",data.name],["Phone",data.phone],["City",data.city||"—"],["Location",data.location||"—"],["System Size",`${data.requirement_kw||"?"}kW`],["Type",data.requirement_type||"—"],["Source",data.source||"—"],["Assigned To",data.assignedTo||"—"],["Priority",data.priority||"—"]].map(([l,v])=>(
              <div key={l} style={{display:"flex",padding:"7px 0",borderBottom:`1px solid ${T.b1}`}}>
                <span style={{width:130,fontSize:11.5,color:T.t3,flexShrink:0}}>{l}</span>
                <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
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
  const [showTypeSelector,setShowTypeSelector]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [showAddSolar,setShowAddSolar]=useState(false);
  const [addStage,setAddStage]=useState("lead");

  // Company module type — controls which lead types are available
  const companyModule = localStorage.getItem("gb_company_module") || "construction";
  const canConstruction = companyModule === "construction" || companyModule === "both";
  const canSolar = companyModule === "solar_epc" || companyModule === "both";

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

  const ASSIGNED_TO=teamMembers.length>0?teamMembers.map(m=>m.name):["Prafull","Vijay Sahu","Niranjan","Harsh Sahu","Priyanka"];

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
          contactDate:l.contact_date?new Date(l.contact_date).toISOString().split("T")[0]:null,
          createdAt:l.created_at?new Date(l.created_at).toISOString().split("T")[0]:null,
          followupHistory:l.followupHistory||[],
          tags:Array.isArray(l.tags)?l.tags:(typeof l.tags==="string"?JSON.parse(l.tags||"[]"):[]),
          convertedValue:l.converted_value||l.convertedValue||null,
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
  const todayDueCount=allLeads.filter(l=>l.contactDate&&daysDiff(l.contactDate)<=0&&!dismissedReminders.includes(l.id)&&l.stage!=="converted"&&l.stage!=="lost").length;
  const pipelineValue=leads.filter(l=>l.stage!=="lost").reduce((s,l)=>s+l.budget,0);
  const convertedValue=leads.filter(l=>l.stage==="converted").reduce((s,l)=>s+(l.convertedValue||l.budget),0);
  const conversionRate=allLeads.length?Math.round((allLeads.filter(l=>l.stage==="converted").length/allLeads.length)*100):0;

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
          onUpdate={(id,updates)=>setSolarLeads(p=>p.map(l=>l.id===id?{...l,...updates}:l))}
          onConvertToProject={(project)=>{ setSolarLeads(p=>p.map(l=>l.id===selSolarLead.id?{...l,stage:"converted"}:l)); setSelSolarLead(null); }}
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
              <button onClick={()=>{setSelLead({...quotPromptLead,_openTab:"quotations"});setQuotPromptLead(null);}}
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
