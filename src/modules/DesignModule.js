import { useState } from "react";

// ── ICON BASE ────────────────────────────────────────────────────────
const Ic=({d,d2,size=18,color="currentColor",sw=1.8,fill="none"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>{d2&&<path d={d2}/>}
  </svg>
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
const IcAdd   =(p)=><Ic {...p} d="M12 5v14M5 12h14"/>;
const IcDown  =(p)=><Ic {...p} d="M6 9l6 6 6-6"/>;
const IcUp2   =(p)=><Ic {...p} d="M18 15l-6-6-6 6"/>;
const IcEye   =(p)=><Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0"/>;
const IcEyeX  =(p)=><Ic {...p} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>;
const IcTeam  =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>;
const IcCRM   =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a3 3 0 00-3-3M16 3.13a4 4 0 010 7.75"/>;
const IcMOM   =(p)=><Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>;
const IcPay   =(p)=><Ic {...p} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>;
const IcLib   =(p)=><Ic {...p} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>;
const IcX     =(p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcChk   =(p)=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcUpload=(p)=><Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>;
const IcFile  =(p)=><Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
const IcDraw  =(p)=><Ic {...p} d="M2 20h20M5 20V8l7-6 7 6v12M9 20v-5h6v5"/>;
const IcTask  =(p)=><Ic {...p} d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>;
const IcApprv =(p)=><Ic {...p} d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>;
const IcHist  =(p)=><Ic {...p} d="M12 8v4l3 3M3.05 11A9 9 0 102 12M3 4v4l2.5 2.5"/>;
const IcRevise=(p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcPin   =(p)=><Ic {...p} d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0zM12 10m-1 0a1 1 0 102 0 1 1 0 10-2 0" fill={p.fill||"none"}/>;
const IcFolder=(p)=><Ic {...p} d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>;
const IcAlert =(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;
const IcMsg   =(p)=><Ic {...p} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>;
const IcSort  =(p)=><Ic {...p} d="M3 6h18M7 12h10M11 18h2"/>;
const IcSend  =(p)=><Ic {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>;
const IcFlag  =(p)=><Ic {...p} d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>;

// ── COLOR SYSTEM ─────────────────────────────────────────────────────
const C={
  p:"#1565C0",p2:"#1976D2",a:"#FF6F00",
  sb:"#0D1B2A",sbH:"#1E2E42",
  w:"#FFFFFF",bg:"#F1F4F8",t:"#1A2332",tm:"#4A5568",tl:"#8896A6",b:"#E2E8F0",
};
const T={
  bg:"#F4F6F9",surface:"#FFFFFF",surfaceB:"#F8F9FB",
  t1:"#111827",t2:"#374151",t3:"#6B7280",t4:"#9CA3AF",
  b1:"#E5E7EB",b2:"#D1D5DB",
  blu:"#2563EB",bluL:"#EFF6FF",bluM:"#BFDBFE",
  grn:"#059669",grnL:"#ECFDF5",grnM:"#A7F3D0",
  amb:"#D97706",ambL:"#FFFBEB",ambM:"#FDE68A",
  red:"#DC2626",redL:"#FEF2F2",redM:"#FECACA",
  slt:"#64748B",sltL:"#F1F5F9",
  pur:"#7C3AED",purL:"#F5F3FF",purM:"#DDD6FE",
};

// ── NAV ──────────────────────────────────────────────────────────────
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

// ── DESIGN DATA ──────────────────────────────────────────────────────
const PROJECTS=["Shubham & NK 623","Tikendra Residence","Esther Risali","Amarendra Villa","Neha Sagar Office","Bablu Farmhouse"];

const DRAWINGS=[
  {id:1,title:"Ground Floor Plan",project:"Shubham & NK 623",cat:"Architectural",type:"2D",status:"Approved",ver:"v3",by:"Harsh Sahu",date:"08 Mar",size:"2.4 MB",pins:3,note:"Final approved — client sign-off done"},
  {id:2,title:"RCC Column Layout",project:"Shubham & NK 623",cat:"Structural",type:"2D",status:"Approved",ver:"v2",by:"Vijay Sahu",date:"05 Mar",size:"1.8 MB",pins:1,note:""},
  {id:3,title:"First Floor Elevation",project:"Shubham & NK 623",cat:"Architectural",type:"2D",status:"Revision",ver:"v2",by:"Harsh Sahu",date:"10 Mar",size:"3.1 MB",pins:2,note:"Client wants window size change on east side"},
  {id:4,title:"Electrical Wiring Schematic",project:"Tikendra Residence",cat:"Electrical",type:"2D",status:"Pending",ver:"v1",by:"Priyanka",date:"11 Mar",size:"890 KB",pins:0,note:"Awaiting review from client"},
  {id:5,title:"3D Exterior Render",project:"Tikendra Residence",cat:"Architectural",type:"3D",status:"Approved",ver:"v4",by:"Harsh Sahu",date:"01 Mar",size:"18 MB",pins:0,note:""},
  {id:6,title:"Plumbing Layout GF",project:"Esther Risali",cat:"Plumbing",type:"2D",status:"Rejected",ver:"v1",by:"Niranjan",date:"28 Feb",size:"1.2 MB",pins:4,note:"Pipe routing conflicts with structural beam — redo"},
  {id:7,title:"Commercial Lobby 3D",project:"Esther Risali",cat:"Architectural",type:"3D",status:"Approved",ver:"v2",by:"Harsh Sahu",date:"20 Feb",size:"24 MB",pins:0,note:""},
  {id:8,title:"Foundation Detail",project:"Amarendra Villa",cat:"Structural",type:"2D",status:"Pending",ver:"v1",by:"Vijay Sahu",date:"12 Mar",size:"1.5 MB",pins:0,note:"Pending structural engineer review"},
  {id:9,title:"Villa Floor Plan",project:"Amarendra Villa",cat:"Architectural",type:"2D",status:"Revision",ver:"v3",by:"Harsh Sahu",date:"09 Mar",size:"2.9 MB",pins:5,note:"Add servant quarter as per client request"},
  {id:10,title:"Office False Ceiling",project:"Neha Sagar Office",cat:"Interior",type:"2D",status:"Approved",ver:"v1",by:"Priyanka",date:"15 Feb",size:"980 KB",pins:1,note:""},
  {id:11,title:"Staircase Detail",project:"Bablu Farmhouse",cat:"Structural",type:"2D",status:"Pending",ver:"v1",by:"Vijay Sahu",date:"13 Mar",size:"760 KB",pins:0,note:""},
  {id:12,title:"Farmhouse 3D View",project:"Bablu Farmhouse",cat:"Architectural",type:"3D",status:"Approved",ver:"v2",by:"Harsh Sahu",date:"07 Mar",size:"21 MB",pins:2,note:""},
];

// ── REVISION PINS DATA ── (pre-loaded pins for Revision drawings)
const INIT_REVISION_PINS={
  3:[
    {id:1,location:"East elevation — window row",note:"Increase all windows from 3ft to 4ft width as client discussed",by:"Prafull (Admin)",date:"10 Mar",priority:"High",done:false},
    {id:2,location:"North wall — bedroom 2",note:"Shift window 2ft south to align with bathroom opening",by:"Client — Shubham",date:"10 Mar",priority:"Medium",done:false},
  ],
  9:[
    {id:1,location:"North-west corner — ground floor",note:"Add servant quarter 12x10 ft with attached toilet as per site visit",by:"Prafull (Admin)",date:"09 Mar",priority:"High",done:false},
    {id:2,location:"Main lobby",note:"Increase lobby width by 2ft — current 8ft feels narrow",by:"Prafull (Admin)",date:"09 Mar",priority:"Medium",done:false},
    {id:3,location:"Master bedroom",note:"Shift attached bath 3ft inward to create walk-in closet space",by:"Client — Amarendra",date:"10 Mar",priority:"High",done:false},
    {id:4,location:"Staircase",note:"Change staircase from straight run to L-shape — saves 40 sqft",by:"Vijay Sahu",date:"11 Mar",priority:"Low",done:false},
    {id:5,location:"Car porch",note:"Extend car porch by 4ft to fit 2 cars side by side",by:"Client — Amarendra",date:"09 Mar",priority:"Medium",done:false},
  ],
};

// ── REVISION COMMENTS DATA
const INIT_REVISION_COMMENTS={
  3:[
    {id:1,by:"Prafull (Admin)",date:"10 Mar 14:22",text:"Harsh, please revise all east elevation windows — client confirmed 4ft width in today's site meeting. Also update the elevation PDF and DWG both.",avatar:"P",color:"#1565C0"},
    {id:2,by:"Harsh Sahu",date:"10 Mar 16:45",text:"Understood. Will update the DWG and regenerate the elevation view. Should be done by tomorrow morning. The north wall window shift will also be taken care of.",avatar:"H",color:"#2E7D32"},
  ],
  9:[
    {id:1,by:"Prafull (Admin)",date:"09 Mar 10:15",text:"Harsh — major revision needed. Client wants servant quarter added, lobby widened, and master bath reworked. All pin details added. Please call me before starting.",avatar:"P",color:"#1565C0"},
    {id:2,by:"Vijay Sahu",date:"09 Mar 11:30",text:"I've added a staircase revision pin too — changing to L-shape will help with the space. Discuss with Harsh.",avatar:"V",color:"#6A1B9A"},
    {id:3,by:"Harsh Sahu",date:"10 Mar 09:00",text:"Starting revisions today. Will take 2 days for all changes. Will upload v4 by 12 Mar.",avatar:"H",color:"#2E7D32"},
    {id:4,by:"Prafull (Admin)",date:"10 Mar 09:30",text:"Good. Prioritise the servant quarter and car porch first — those are client's top requirements.",avatar:"P",color:"#1565C0"},
  ],
};

const VERSION_HISTORY=[
  {drawingId:1,title:"Ground Floor Plan",project:"Shubham & NK 623",ver:"v3",date:"08 Mar 2026",by:"Harsh Sahu",size:"2.4 MB",status:"Approved",note:"Final version after 2 revisions"},
  {drawingId:1,title:"Ground Floor Plan",project:"Shubham & NK 623",ver:"v2",date:"28 Feb 2026",by:"Harsh Sahu",size:"2.2 MB",status:"Revision",note:"Client requested bedroom size increase"},
  {drawingId:1,title:"Ground Floor Plan",project:"Shubham & NK 623",ver:"v1",date:"10 Feb 2026",by:"Vijay Sahu",size:"2.0 MB",status:"Rejected",note:"Layout did not match site dimensions"},
  {drawingId:3,title:"First Floor Elevation",project:"Shubham & NK 623",ver:"v2",date:"10 Mar 2026",by:"Harsh Sahu",size:"3.1 MB",status:"Revision",note:"Window size revision requested"},
  {drawingId:3,title:"First Floor Elevation",project:"Shubham & NK 623",ver:"v1",date:"01 Mar 2026",by:"Harsh Sahu",size:"2.8 MB",status:"Rejected",note:"Facade proportion incorrect"},
  {drawingId:5,title:"3D Exterior Render",project:"Tikendra Residence",ver:"v4",date:"01 Mar 2026",by:"Harsh Sahu",size:"18 MB",status:"Approved",note:""},
  {drawingId:5,title:"3D Exterior Render",project:"Tikendra Residence",ver:"v3",date:"20 Feb 2026",by:"Harsh Sahu",size:"16 MB",status:"Revision",note:"Change roof color and add garden"},
  {drawingId:6,title:"Plumbing Layout GF",project:"Esther Risali",ver:"v1",date:"28 Feb 2026",by:"Niranjan",size:"1.2 MB",status:"Rejected",note:"Conflicts with structural beam"},
  {drawingId:9,title:"Villa Floor Plan",project:"Amarendra Villa",ver:"v3",date:"09 Mar 2026",by:"Harsh Sahu",size:"2.9 MB",status:"Revision",note:"Add servant quarter"},
  {drawingId:9,title:"Villa Floor Plan",project:"Amarendra Villa",ver:"v2",date:"22 Feb 2026",by:"Harsh Sahu",size:"2.6 MB",status:"Revision",note:"Master bedroom layout change"},
  {drawingId:9,title:"Villa Floor Plan",project:"Amarendra Villa",ver:"v1",date:"05 Feb 2026",by:"Vijay Sahu",size:"2.3 MB",status:"Rejected",note:"Client not satisfied with room sizes"},
];

const DESIGN_TASKS=[
  {id:1,task:"Revise First Floor Elevation — east window",project:"Shubham & NK 623",cat:"Architectural",assignedTo:"Harsh Sahu",priority:"High",status:"In Progress",due:"15 Mar"},
  {id:2,task:"Electrical layout for 2nd floor",project:"Tikendra Residence",cat:"Electrical",assignedTo:"Priyanka",priority:"Medium",status:"Pending",due:"18 Mar"},
  {id:3,task:"Add servant quarter to villa plan",project:"Amarendra Villa",cat:"Architectural",assignedTo:"Harsh Sahu",priority:"High",status:"In Progress",due:"16 Mar"},
  {id:4,task:"Redo plumbing layout avoiding beam",project:"Esther Risali",cat:"Plumbing",assignedTo:"Niranjan",priority:"High",status:"Pending",due:"14 Mar"},
  {id:5,task:"Foundation detail review with SE",project:"Amarendra Villa",cat:"Structural",assignedTo:"Vijay Sahu",priority:"Medium",status:"Pending",due:"17 Mar"},
  {id:6,task:"Office pantry layout drawing",project:"Neha Sagar Office",cat:"Interior",assignedTo:"Priyanka",priority:"Low",status:"Pending",due:"20 Mar"},
  {id:7,task:"Staircase detail v2 upload",project:"Bablu Farmhouse",cat:"Structural",assignedTo:"Vijay Sahu",priority:"Medium",status:"Pending",due:"19 Mar"},
  {id:8,task:"3D render update — add landscaping",project:"Tikendra Residence",cat:"Architectural",assignedTo:"Harsh Sahu",priority:"Low",status:"Completed",due:"05 Mar"},
  {id:9,task:"Electrical conduit path review",project:"Shubham & NK 623",cat:"Electrical",assignedTo:"Priyanka",priority:"Medium",status:"Completed",due:"01 Mar"},
];

// ── STATUS / PRIORITY META ───────────────────────────────────────────
const STATUS_META={
  "Approved": {c:T.grn,bg:T.grnL,brd:T.grnM},
  "Pending":  {c:T.slt,bg:T.sltL,brd:T.b2},
  "Revision": {c:T.amb,bg:T.ambL,brd:T.ambM},
  "Rejected": {c:T.red,bg:T.redL,brd:T.redM},
};
const PRIORITY_META={
  "High":   {c:T.red,bg:T.redL},
  "Medium": {c:T.amb,bg:T.ambL},
  "Low":    {c:T.slt,bg:T.sltL},
};
const TASK_STATUS_META={
  "In Progress": {c:T.blu,bg:T.bluL},
  "Pending":     {c:T.amb,bg:T.ambL},
  "Completed":   {c:T.grn,bg:T.grnL},
};
const CAT_COLORS={
  "Architectural":{c:T.blu,bg:T.bluL},
  "Structural":   {c:T.pur,bg:T.purL},
  "Electrical":   {c:T.amb,bg:T.ambL},
  "Plumbing":     {c:"#0369A1",bg:"#E0F2FE"},
  "Interior":     {c:"#BE185D",bg:"#FCE7F3"},
};

// ── SHARED COMPONENTS ────────────────────────────────────────────────
const Pill=({label,c,bg,brd})=>(
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,whiteSpace:"nowrap",border:`1px solid ${brd||bg}`}}>{label}</span>
);


// ── VERSION HISTORY DRAWER ───────────────────────────────────────────
function VersionDrawer({drawing,allVersions,onClose}){
  const versions=allVersions.filter(v=>v.drawingId===drawing.id);
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:200}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:400,background:T.bg,zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn 0.2s ease"}}>
      <div style={{background:T.surface,padding:"12px 16px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:700,color:T.t1}}>{drawing.title}</div><div style={{fontSize:10.5,color:T.t4}}>Version History · {versions.length} versions</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px"}}>
        {versions.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No history available</div>}
        {versions.map((v,i)=>{
          const sm=STATUS_META[v.status];
          return(
            <div key={i} style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"11px 14px",marginBottom:8,borderLeft:`3px solid ${sm.c}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                <span style={{fontSize:13,fontWeight:800,color:T.t1,fontFamily:"monospace"}}>{v.ver}</span>
                <Pill label={v.status} c={sm.c} bg={sm.bg} brd={sm.brd}/>
                <span style={{fontSize:10.5,color:T.t4,marginLeft:"auto"}}>{v.date}</span>
              </div>
              <div style={{fontSize:11.5,color:T.t2,marginBottom:3}}>Uploaded by {v.by} · {v.size}</div>
              {v.note&&<div style={{fontSize:11,color:T.t3,padding:"4px 8px",background:T.surfaceB,borderRadius:5,marginTop:4}}>{v.note}</div>}
            </div>
          );
        })}
      </div>
    </div>
  </>);
}

// ── UPLOAD DRAWER ────────────────────────────────────────────────────
function UploadDrawer({onClose}){
  const [form,setForm]=useState({title:"",project:"Shubham & NK 623",cat:"Architectural",type:"2D",note:""});
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:400,background:T.bg,zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:T.surface,padding:"12px 16px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:700,color:T.t1}}>Upload Drawing</div><div style={{fontSize:10.5,color:T.t4}}>Add new drawing to a project</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
        {[{label:"Drawing Title",key:"title",type:"input",placeholder:"e.g. Ground Floor Plan"},{label:"Project",key:"project",type:"select",options:PROJECTS},{label:"Category",key:"cat",type:"select",options:["Architectural","Structural","Electrical","Plumbing","Interior"]},{label:"Drawing Type",key:"type",type:"select",options:["2D","3D"]},].map(f=>(
          <div key={f.key} style={{marginBottom:13}}>
            <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>{f.label}</label>
            {f.type==="input"
              ?<input value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
              :<select value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>{f.options.map(o=><option key={o}>{o}</option>)}</select>
            }
          </div>
        ))}
        <div style={{border:`2px dashed ${T.b2}`,borderRadius:9,padding:"28px 16px",textAlign:"center",background:T.surfaceB,marginBottom:13,cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.blu;e.currentTarget.style.background=T.bluL;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b2;e.currentTarget.style.background=T.surfaceB;}}>
          <IcUpload size={28} color={T.t4}/>
          <div style={{fontSize:13,fontWeight:600,color:T.t2,marginTop:8}}>Drop file or click to browse</div>
          <div style={{fontSize:11,color:T.t4,marginTop:4}}>PDF, DWG, DXF, PNG, JPG · Max 50MB</div>
        </div>
        <div>
          <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Notes / Comments</label>
          <textarea value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Optional notes for reviewer..." rows={3} style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
        </div>
      </div>
      <div style={{padding:"12px 14px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
        <button onClick={onClose} style={{flex:2,padding:"9px",borderRadius:7,background:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><IcUpload size={14} color="white"/> Upload Drawing</button>
      </div>
    </div>
  </>);
}

// ── REVISION QUEUE TAB ───────────────────────────────────────────────
function RevisionQueueTab({revisionDrawings,drawings,setDrawings,seedComments={}}){
  const [revPins,setRevPins]=useState(INIT_REVISION_PINS);
  const [revComments,setRevComments]=useState(()=>{
    // Merge INIT + any seed comments passed from parent
    const merged={...INIT_REVISION_COMMENTS};
    Object.entries(seedComments).forEach(([id,cs])=>{merged[id]=[...(merged[id]||[]),...cs];});
    return merged;
  });

  // Sync new seedComments from parent (e.g. when a drawing is newly revised)
  const prevSeedRef=useState(seedComments);
  useState(()=>{
    // simple sync: merge any new entries not yet in revComments
    setRevComments(prev=>{
      const next={...prev};
      Object.entries(seedComments).forEach(([id,cs])=>{
        const existing=new Set((next[id]||[]).map(c=>c.id));
        const newOnes=cs.filter(c=>!existing.has(c.id));
        if(newOnes.length>0) next[id]=[...(next[id]||[]),...newOnes];
      });
      return next;
    });
  });
  const [expandedId,setExpandedId]=useState(null);
  const [activePanel,setActivePanel]=useState({}); // drawingId -> "pins" | "comments"
  const [newPinForms,setNewPinForms]=useState({});
  const [newCommentText,setNewCommentText]=useState({});
  const [rProject,setRProject]=useState("All");
  const [sortBy,setSortBy]=useState("date"); // date | title | project | pins
  const [sortDir,setSortDir]=useState("desc");

  const approveDrawing=id=>setDrawings(p=>p.map(d=>d.id===id?{...d,status:"Approved"}:d));

  const filtered=revisionDrawings
    .filter(d=>rProject==="All"||d.project===rProject)
    .sort((a,b)=>{
      let va,vb;
      if(sortBy==="title"){va=a.title;vb=b.title;}
      else if(sortBy==="project"){va=a.project;vb=b.project;}
      else if(sortBy==="pins"){va=a.pins;vb=b.pins;}
      else {va=a.date;vb=b.date;}
      if(typeof va==="string") return sortDir==="asc"?va.localeCompare(vb):vb.localeCompare(va);
      return sortDir==="asc"?va-vb:vb-va;
    });

  const getPins=id=>revPins[id]||[];
  const getComments=id=>revComments[id]||[];
  const donePins=id=>getPins(id).filter(p=>p.done).length;

  const addPin=(drawingId)=>{
    const f=newPinForms[drawingId]||{location:"",note:"",priority:"High"};
    if(!f.location.trim()||!f.note.trim()) return;
    const pin={id:Date.now(),location:f.location,note:f.note,priority:f.priority,by:"Prafull (Admin)",date:"Now",done:false};
    setRevPins(p=>({...p,[drawingId]:[...(p[drawingId]||[]),pin]}));
    setNewPinForms(p=>({...p,[drawingId]:{location:"",note:"",priority:"High"}}));
  };
  const togglePin=(drawingId,pinId)=>{
    setRevPins(p=>({...p,[drawingId]:p[drawingId].map(pin=>pin.id===pinId?{...pin,done:!pin.done}:pin)}));
  };
  const deletePin=(drawingId,pinId)=>{
    setRevPins(p=>({...p,[drawingId]:p[drawingId].filter(pin=>pin.id!==pinId)}));
  };
  const addComment=(drawingId)=>{
    const text=newCommentText[drawingId]||"";
    if(!text.trim()) return;
    const c={id:Date.now(),by:"Prafull (Admin)",date:"Now",text,avatar:"P",color:"#1565C0"};
    setRevComments(p=>({...p,[drawingId]:[...(p[drawingId]||[]),c]}));
    setNewCommentText(p=>({...p,[drawingId]:""}));
  };
  const setPanel=(id,panel)=>setActivePanel(p=>({...p,[id]:p[id]===panel?null:panel}));

  const SORT_OPTS=[{v:"date",l:"Date"},{v:"title",l:"Title"},{v:"project",l:"Project"},{v:"pins",l:"Pins"}];

  if(revisionDrawings.length===0){
    return(
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center",color:T.t4}}>
          <IcChk size={44} color={T.grnM}/>
          <div style={{fontSize:15,fontWeight:700,color:T.grn,marginTop:12}}>No drawings in revision queue!</div>
          <div style={{fontSize:12,color:T.t4,marginTop:5}}>All drawings are either approved or pending.</div>
        </div>
      </div>
    );
  }

  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
      {/* Toolbar */}
      <div style={{background:T.surface,borderRadius:8,padding:"8px 12px",marginBottom:10,border:`1px solid ${T.ambM}`,display:"flex",gap:8,alignItems:"center",flexShrink:0,borderLeft:`3px solid ${T.amb}`}}>
        <IcAlert size={15} color={T.amb}/>
        <span style={{fontSize:12,fontWeight:700,color:T.amb}}>{filtered.length} drawing{filtered.length!==1?"s":""} need revision</span>
        <div style={{flex:1}}/>
        {/* Project filter */}
        <select value={rProject} onChange={e=>setRProject(e.target.value)}
          style={{height:30,padding:"0 22px 0 9px",borderRadius:6,border:`1.5px solid ${rProject!=="All"?T.blu:T.b1}`,background:rProject!=="All"?T.bluL:T.surface,fontSize:11.5,color:rProject!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:rProject!=="All"?600:400,minWidth:130,appearance:"none",WebkitAppearance:"none"}}>
          <option value="All">All Projects</option>
          {PROJECTS.map(p=><option key={p}>{p}</option>)}
        </select>
        {/* Sort */}
        <div style={{display:"flex",alignItems:"center",gap:4,background:T.surfaceB,borderRadius:6,border:`1px solid ${T.b1}`,padding:"2px 4px"}}>
          <IcSort size={13} color={T.t4}/>
          {SORT_OPTS.map(s=>(
            <button key={s.v} onClick={()=>{if(sortBy===s.v)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortBy(s.v);setSortDir("desc");}}}
              style={{padding:"3px 8px",borderRadius:4,border:"none",background:sortBy===s.v?T.amb:"none",color:sortBy===s.v?"white":T.t3,fontSize:11,fontWeight:sortBy===s.v?700:400,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
              {s.l}{sortBy===s.v&&(sortDir==="desc"?<IcDown size={9} color="white"/>:<IcUp2 size={9} color="white"/>)}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(d=>{
          const pins=getPins(d.id);
          const comments=getComments(d.id);
          const done=donePins(d.id);
          const total=pins.length;
          const pct=total>0?Math.round(done/total*100):0;
          const cc=CAT_COLORS[d.cat]||{c:T.slt,bg:T.sltL};
          const panel=activePanel[d.id];
          const isOpen=expandedId===d.id;
          const pinForm=newPinForms[d.id]||{location:"",note:"",priority:"High"};

          return(
            <div key={d.id} style={{background:T.surface,borderRadius:10,border:`1.5px solid ${panel?T.ambM:T.b1}`,overflow:"hidden",boxShadow:panel?"0 4px 16px rgba(217,119,6,0.1)":"0 1px 4px rgba(0,0,0,0.05)",transition:"all 0.2s"}}>

              {/* Card Header */}
              <div style={{padding:"13px 16px",display:"flex",alignItems:"center",gap:12,borderBottom:panel?`1px solid ${T.b1}`:"none",background:panel?`linear-gradient(90deg,${T.ambL},${T.surface})`:T.surface}}>
                {/* Left accent */}
                <div style={{width:4,height:44,borderRadius:2,background:T.amb,flexShrink:0}}/>
                {/* Icon */}
                <div style={{width:40,height:40,borderRadius:9,background:T.ambL,border:`1px solid ${T.ambM}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <IcRevise size={18} color={T.amb}/>
                </div>
                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{fontSize:13.5,fontWeight:700,color:T.t1}}>{d.title}</span>
                    <Pill label="Revision" c={T.amb} bg={T.ambL} brd={T.ambM}/>
                    <Pill label={d.cat} c={cc.c} bg={cc.bg}/>
                    <Pill label={d.ver} c={T.slt} bg={T.sltL}/>
                  </div>
                  <div style={{fontSize:11.5,color:T.t3}}>{d.project} · {d.by} · {d.date} · {d.size}</div>
                  {d.note&&(
                    <div style={{fontSize:12,color:T.t2,marginTop:6,padding:"5px 10px",background:T.ambL,borderRadius:6,borderLeft:`3px solid ${T.amb}`,display:"flex",alignItems:"flex-start",gap:6}}>
                      <IcFlag size={13} color={T.amb} style={{flexShrink:0,marginTop:1}}/>
                      <span>{d.note}</span>
                    </div>
                  )}
                </div>
                {/* Progress ring & actions */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}>
                  {/* Pin progress */}
                  {total>0&&(
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{fontSize:10.5,color:T.t4}}>{done}/{total} pins done</div>
                      <div style={{width:80,height:6,background:T.b1,borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:pct===100?T.grn:T.amb,borderRadius:3,transition:"width 0.4s"}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,color:pct===100?T.grn:T.amb}}>{pct}%</span>
                    </div>
                  )}
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setPanel(d.id,"pins")}
                      style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,background:panel==="pins"?T.pur:T.purL,border:`1px solid ${panel==="pins"?T.pur:T.purM}`,color:panel==="pins"?"white":T.pur,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
                      <IcPin size={13} color="currentColor" fill={panel==="pins"?"white":"none"}/> Pins {total>0&&<span style={{background:panel==="pins"?"rgba(255,255,255,0.3)":T.pur,color:"white",fontSize:9,padding:"0 5px",borderRadius:10,fontWeight:800}}>{total}</span>}
                    </button>
                    <button onClick={()=>setPanel(d.id,"comments")}
                      style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,background:panel==="comments"?T.blu:T.bluL,border:`1px solid ${panel==="comments"?T.blu:T.bluM}`,color:panel==="comments"?"white":T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
                      <IcMsg size={13} color="currentColor"/> Comments {comments.length>0&&<span style={{background:panel==="comments"?"rgba(255,255,255,0.3)":T.blu,color:"white",fontSize:9,padding:"0 5px",borderRadius:10,fontWeight:800}}>{comments.length}</span>}
                    </button>
                    {pct===100&&(
                      <button onClick={()=>approveDrawing(d.id)}
                        style={{display:"flex",alignItems:"center",gap:4,padding:"5px 12px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
                        <IcChk size={13} color={T.grn}/> Mark Revised
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── PINS PANEL ── */}
              {panel==="pins"&&(
                <div style={{background:T.purL,borderBottom:`1px solid ${T.purM}`,padding:"12px 16px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.pur,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                    <IcPin size={13} color={T.pur}/> Revision Pins — specific locations & changes required
                    <span style={{fontSize:9.5,color:T.t4,fontWeight:400,marginLeft:4}}>Tick each pin when corrected</span>
                  </div>
                  {pins.length===0&&<div style={{fontSize:12,color:T.t4,padding:"8px 0",marginBottom:8}}>No pins added yet. Add below to mark specific locations for change.</div>}
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                    {pins.map((pin,pi)=>{
                      const pm=PRIORITY_META[pin.priority];
                      return(
                        <div key={pin.id} style={{background:T.surface,borderRadius:8,padding:"9px 12px",border:`1px solid ${pin.done?T.grnM:T.purM}`,display:"flex",gap:10,alignItems:"flex-start",opacity:pin.done?0.65:1,transition:"all 0.2s"}}>
                          {/* Checkbox */}
                          <button onClick={()=>togglePin(d.id,pin.id)}
                            style={{width:20,height:20,borderRadius:5,border:`2px solid ${pin.done?T.grn:T.pur}`,background:pin.done?T.grn:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",marginTop:1}}>
                            {pin.done&&<IcChk size={10} color="white"/>}
                          </button>
                          {/* Pin number */}
                          <div style={{width:22,height:22,borderRadius:"50%",background:T.pur,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,flexShrink:0}}>
                            {pi+1}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                              <span style={{fontSize:12,fontWeight:700,color:pin.done?T.t4:T.t1,textDecoration:pin.done?"line-through":"none"}}>{pin.location}</span>
                              <Pill label={pin.priority} c={pm.c} bg={pm.bg}/>
                            </div>
                            <div style={{fontSize:11.5,color:pin.done?T.t4:T.t2,textDecoration:pin.done?"line-through":"none"}}>{pin.note}</div>
                            <div style={{fontSize:10,color:T.t4,marginTop:3}}>— {pin.by} · {pin.date}</div>
                          </div>
                          <button onClick={()=>deletePin(d.id,pin.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,padding:2,display:"flex",flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.color=T.red} onMouseLeave={e=>e.currentTarget.style.color=T.t4}>
                            <IcX size={13} color="currentColor"/>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {/* Add pin form */}
                  <div style={{background:T.surface,borderRadius:8,border:`1.5px solid ${T.purM}`,padding:"10px 12px"}}>
                    <div style={{fontSize:10.5,fontWeight:700,color:T.pur,marginBottom:8}}>+ Add New Pin</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 100px",gap:8,marginBottom:8}}>
                      <div>
                        <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:3}}>Location *</label>
                        <input value={pinForm.location}
                          onChange={e=>setNewPinForms(p=>({...p,[d.id]:{...pinForm,location:e.target.value}}))}
                          placeholder="e.g. East wall, Room 2, Staircase..."
                          style={{width:"100%",height:29,padding:"0 8px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:11.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                          onFocus={e=>e.target.style.borderColor=T.pur} onBlur={e=>e.target.style.borderColor=T.b1}/>
                      </div>
                      <div>
                        <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:3}}>What to change *</label>
                        <input value={pinForm.note}
                          onChange={e=>setNewPinForms(p=>({...p,[d.id]:{...pinForm,note:e.target.value}}))}
                          placeholder="Describe the required change..."
                          style={{width:"100%",height:29,padding:"0 8px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:11.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                          onFocus={e=>e.target.style.borderColor=T.pur} onBlur={e=>e.target.style.borderColor=T.b1}/>
                      </div>
                      <div>
                        <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:3}}>Priority</label>
                        <select value={pinForm.priority} onChange={e=>setNewPinForms(p=>({...p,[d.id]:{...pinForm,priority:e.target.value}}))}
                          style={{width:"100%",height:29,padding:"0 7px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit"}}>
                          <option>High</option><option>Medium</option><option>Low</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={()=>addPin(d.id)}
                      style={{padding:"6px 16px",borderRadius:6,background:T.pur,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                      <IcPin size={12} color="white" fill="white"/> Add Pin
                    </button>
                  </div>
                </div>
              )}

              {/* ── COMMENTS PANEL ── */}
              {panel==="comments"&&(
                <div style={{background:T.bluL,borderBottom:`1px solid ${T.bluM}`,padding:"12px 16px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.blu,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                    <IcMsg size={13} color={T.blu}/> Team Discussion
                    <span style={{fontSize:9.5,color:T.t4,fontWeight:400}}>Comments visible to whole design team</span>
                  </div>
                  {/* Comment thread */}
                  <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:12}}>
                    {getComments(d.id).length===0&&<div style={{fontSize:12,color:T.t4,padding:"6px 0"}}>No comments yet. Start the thread below.</div>}
                    {getComments(d.id).map(c=>(
                      <div key={c.id} style={{display:"flex",gap:9,alignItems:"flex-start"}}>
                        <div style={{width:30,height:30,borderRadius:"50%",background:c.color,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{c.avatar}</div>
                        <div style={{background:T.surface,borderRadius:8,padding:"8px 11px",flex:1,border:`1px solid ${T.bluM}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontSize:11.5,fontWeight:700,color:T.t1}}>{c.by}</span>
                            <span style={{fontSize:10,color:T.t4}}>{c.date}</span>
                          </div>
                          <div style={{fontSize:12,color:T.t2,lineHeight:1.5}}>{c.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* New comment */}
                  <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                    <div style={{width:30,height:30,borderRadius:"50%",background:"#1565C0",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>P</div>
                    <div style={{flex:1,background:T.surface,borderRadius:8,border:`1.5px solid ${T.bluM}`,overflow:"hidden"}}>
                      <textarea value={newCommentText[d.id]||""}
                        onChange={e=>setNewCommentText(p=>({...p,[d.id]:e.target.value}))}
                        placeholder="Write a comment for the design team..."
                        rows={2}
                        style={{width:"100%",padding:"8px 10px",border:"none",outline:"none",fontSize:12,fontFamily:"inherit",resize:"none",background:"none"}}
                        onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addComment(d.id);}}}
                      />
                      <div style={{display:"flex",justifyContent:"flex-end",padding:"4px 8px",borderTop:`1px solid ${T.b1}`}}>
                        <button onClick={()=>addComment(d.id)}
                          style={{display:"flex",alignItems:"center",gap:4,padding:"4px 12px",borderRadius:5,background:T.blu,color:"white",fontSize:11,fontWeight:700,border:"none",cursor:"pointer"}}>
                          <IcSend size={11} color="white"/> Send
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DESIGN MODULE ────────────────────────────────────────────────────
function DesignModule(){
  const [tab,setTab]=useState("drawings");
  const [dProject,setDProject]=useState("All");
  const [dCat,setDCat]=useState("All");
  const [dStatus,setDStatus]=useState("All");
  const [dSearch,setDSearch]=useState("");
  const [dSortBy,setDSortBy]=useState("date");
  const [dSortDir,setDSortDir]=useState("desc");
  const [selDrawing,setSelDrawing]=useState(null);
  const [showVersions,setShowVersions]=useState(false);
  const [showUpload,setShowUpload]=useState(false);
  const [tProject,setTProject]=useState("All");
  const [tStatus,setTStatus]=useState("All");
  const [tPriority,setTPriority]=useState("All");
  const [tSortBy,setTSortBy]=useState("priority");
  const [tSortDir,setTSortDir]=useState("desc");
  const [aProject,setAProject]=useState("All");
  const [drawings,setDrawings]=useState(DRAWINGS);
  const [vProject,setVProject]=useState("All");
  const [vSearch,setVSearch]=useState("");
  const [vSortDir,setVSortDir]=useState("desc");

  const revisionDrawings=drawings.filter(d=>d.status==="Revision");
  const revCount=revisionDrawings.length;

  // Sort helper
  const sortItems=(arr,by,dir,fields)=>{
    return[...arr].sort((a,b)=>{
      const va=a[by]||"",vb=b[by]||"";
      const cmp=typeof va==="number"?va-vb:String(va).localeCompare(String(vb));
      return dir==="asc"?cmp:-cmp;
    });
  };

  const filteredDrawings=sortItems(
    drawings.filter(d=>{
      if(dProject!=="All"&&d.project!==dProject) return false;
      if(dCat!=="All"&&d.cat!==dCat) return false;
      if(dStatus!=="All"&&d.status!==dStatus) return false;
      if(dSearch&&!d.title.toLowerCase().includes(dSearch.toLowerCase())) return false;
      return true;
    }),dSortBy,dSortDir
  );

  const pendingApprovals=drawings.filter(d=>d.status==="Pending");
  const filteredApprovals=pendingApprovals.filter(d=>aProject==="All"||d.project===aProject);

  const filteredVersions=[...VERSION_HISTORY]
    .filter(v=>{
      if(vProject!=="All"&&v.project!==vProject) return false;
      if(vSearch&&!v.title.toLowerCase().includes(vSearch.toLowerCase())) return false;
      return true;
    })
    .sort((a,b)=>vSortDir==="desc"?b.date.localeCompare(a.date):a.date.localeCompare(b.date));

  const PRIORITY_ORDER={"High":0,"Medium":1,"Low":2};
  const filteredTasks=sortItems(
    DESIGN_TASKS.filter(t=>{
      if(tProject!=="All"&&t.project!==tProject) return false;
      if(tStatus!=="All"&&t.status!==tStatus) return false;
      if(tPriority!=="All"&&t.priority!==tPriority) return false;
      return true;
    }),tSortBy,tSortDir
  ).sort((a,b)=>{
    if(tSortBy==="priority") return tSortDir==="asc"?PRIORITY_ORDER[a.priority]-PRIORITY_ORDER[b.priority]:PRIORITY_ORDER[b.priority]-PRIORITY_ORDER[a.priority];
    return 0;
  });

  const TILES={
    drawings:[
      {l:"Total Drawings",v:drawings.length,sub:`${[...new Set(drawings.map(d=>d.project))].length} projects`,c:T.blu},
      {l:"Approved",v:drawings.filter(d=>d.status==="Approved").length,sub:"Finalised",c:T.grn},
      {l:"Pending Review",v:drawings.filter(d=>d.status==="Pending").length,sub:"Awaiting decision",c:T.slt},
      {l:"Revision / Rejected",v:drawings.filter(d=>d.status==="Revision"||d.status==="Rejected").length,sub:"Needs rework",c:T.red},
    ],
    tasks:[
      {l:"Total Tasks",v:DESIGN_TASKS.length,sub:"All design work",c:T.blu},
      {l:"In Progress",v:DESIGN_TASKS.filter(t=>t.status==="In Progress").length,sub:"Active work",c:T.pur},
      {l:"Pending",v:DESIGN_TASKS.filter(t=>t.status==="Pending").length,sub:"Not started",c:T.amb},
      {l:"Completed",v:DESIGN_TASKS.filter(t=>t.status==="Completed").length,sub:"Done",c:T.grn},
    ],
    revision:[
      {l:"In Revision Queue",v:revCount,sub:"Need rework",c:T.amb},
      {l:"Pins Added",v:Object.values(INIT_REVISION_PINS).flat().length,sub:"Change markers",c:T.pur},
      {l:"High Priority",v:Object.values(INIT_REVISION_PINS).flat().filter(p=>p.priority==="High").length,sub:"Urgent changes",c:T.red},
      {l:"Projects Affected",v:[...new Set(revisionDrawings.map(d=>d.project))].length,sub:"Under revision",c:T.blu},
    ],
    approvals:[
      {l:"Awaiting Approval",v:pendingApprovals.length,sub:"Need decision",c:T.amb},
      {l:"Approved",v:drawings.filter(d=>d.status==="Approved").length,sub:"Finalised",c:T.grn},
      {l:"Revision Sent",v:revCount,sub:"Rework in progress",c:T.pur},
      {l:"Rejected",v:drawings.filter(d=>d.status==="Rejected").length,sub:"Rejected drawings",c:T.red},
    ],
    versions:[
      {l:"Total Versions",v:VERSION_HISTORY.length,sub:"Across all drawings",c:T.blu},
      {l:"Latest Uploads",v:VERSION_HISTORY.filter(v=>v.date.includes("Mar 2026")).length,sub:"This month",c:T.grn},
      {l:"Revision Versions",v:VERSION_HISTORY.filter(v=>v.status==="Revision").length,sub:"Rework iterations",c:T.amb},
      {l:"Rejected Versions",v:VERSION_HISTORY.filter(v=>v.status==="Rejected").length,sub:"Scrapped",c:T.red},
    ],
  };
  const curTiles=TILES[tab]||TILES.drawings;

  const approveDrawing=id=>setDrawings(p=>p.map(d=>d.id===id?{...d,status:"Approved"}:d));
  const rejectDrawing=id=>setDrawings(p=>p.map(d=>d.id===id?{...d,status:"Rejected"}:d));

  // ── Revise with compulsory comment ─────────────────────────
  const [reviseModal,setReviseModal]=useState(null); // {drawing} | null
  const [reviseComment,setReviseComment]=useState("");
  const [reviseError,setReviseError]=useState(false);

  const openReviseModal=d=>{setReviseModal(d);setReviseComment("");setReviseError(false);};
  const closeReviseModal=()=>{setReviseModal(null);setReviseComment("");setReviseError(false);};

  const confirmRevise=()=>{
    if(!reviseComment.trim()){setReviseError(true);return;}
    const d=reviseModal;
    setDrawings(p=>p.map(dr=>dr.id===d.id?{...dr,status:"Revision",note:reviseComment.trim()}:dr));
    // Auto-add comment to revision panel so team sees it immediately
    const newC={id:Date.now(),by:"Prafull (Admin)",date:"Now",text:reviseComment.trim(),avatar:"P",color:"#1565C0"};
    // We pass it via a shared state update via RevisionQueueTab's own state — 
    // simplest: store in a global-ish init override via a side-channel ref approach
    // Instead just update the drawing note; RevisionQueueTab reads INIT_ on mount
    // For live update, store pending seed comments separately
    setSeedComments(p=>({...p,[d.id]:[...(p[d.id]||[]),newC]}));
    closeReviseModal();
  };

  const [seedComments,setSeedComments]=useState({});

  const TABS=[
    {id:"drawings",l:"All Drawings"},
    {id:"revision",l:"Revision Queue",badge:revCount,badgeC:T.amb},
    {id:"tasks",l:"Design Tasks"},
    {id:"approvals",l:`Approvals${pendingApprovals.length>0?` (${pendingApprovals.length})`:""}`},
    {id:"versions",l:"Version History"},
  ];

  // Sort button component
  const SortBtn=({label,val,cur,dir,onClick})=>(
    <button onClick={()=>onClick(val)}
      style={{display:"flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:4,border:"none",background:cur===val?T.blu:"none",color:cur===val?"white":T.t3,fontSize:11,fontWeight:cur===val?700:400,cursor:"pointer"}}>
      {label}{cur===val&&(dir==="desc"?<IcDown size={9} color="white"/>:<IcUp2 size={9} color="white"/>)}
    </button>
  );

  return(
    <div style={{background:T.bg,height:"100%",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* Stat Tiles */}
      <div style={{padding:"14px 18px 10px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {curTiles.map((s,i)=>(
            <div key={i} style={{padding:"13px 15px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,borderTop:`3px solid ${s.c}`}}>
              <div style={{fontSize:10,color:T.t3,fontWeight:600,letterSpacing:".5px",textTransform:"uppercase",marginBottom:5}}>{s.l}</div>
              <div style={{fontSize:22,fontWeight:700,color:T.t1,letterSpacing:"-.5px",lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:11,color:T.t4,marginTop:4}}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dark Tab Bar */}
      <div style={{margin:"0 18px 0",flexShrink:0}}>
        <div style={{background:"#0D1B2A",borderRadius:10,padding:"0 10px",display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 10px rgba(0,0,0,0.2)"}}>
          <div style={{display:"flex",flex:1}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{padding:"11px 14px",border:"none",background:"none",fontSize:12.5,fontWeight:tab===t.id?600:400,color:tab===t.id?"white":"rgba(255,255,255,0.45)",cursor:"pointer",borderBottom:tab===t.id?`2px solid ${t.badgeC||"#2563EB"}`:"2px solid transparent",transition:"all 0.15s",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6}}>
                {t.l}
                {t.badge>0&&<span style={{background:t.badgeC||T.blu,color:"white",fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:10}}>{t.badge}</span>}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:6,padding:"6px 0"}}>
            <button onClick={()=>setShowUpload(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
              <IcUpload size={13} color="white"/> Upload
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",padding:"12px 18px 14px"}}>

        {/* ── ALL DRAWINGS TAB ── */}
        {tab==="drawings"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:8,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
              <div style={{position:"relative",flex:1,minWidth:160}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input value={dSearch} onChange={e=>setDSearch(e.target.value)} placeholder="Search drawings..."
                  style={{width:"100%",height:31,padding:"0 8px 0 27px",borderRadius:6,border:`1.5px solid ${dSearch?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:dSearch?T.bluL:T.surface}}/>
              </div>
              {[{val:dProject,set:setDProject,opts:["All",...PROJECTS],def:"All Projects"},{val:dCat,set:setDCat,opts:["All","Architectural","Structural","Electrical","Plumbing","Interior"],def:"All Categories"},{val:dStatus,set:setDStatus,opts:["All","Approved","Pending","Revision","Rejected"],def:"All Status"}].map(({val,set,opts,def},i)=>(
                <div key={i} style={{position:"relative"}}>
                  <select value={val} onChange={e=>set(e.target.value)} style={{height:31,padding:"0 22px 0 9px",borderRadius:6,border:`1.5px solid ${val!=="All"?T.blu:T.b1}`,background:val!=="All"?T.bluL:T.surface,fontSize:11.5,color:val!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:val!=="All"?600:400,minWidth:100,appearance:"none",WebkitAppearance:"none"}}>
                    {opts.map(o=><option key={o}>{o==="All"?def:o}</option>)}
                  </select>
                  <IcDown size={10} color={T.t4} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
                </div>
              ))}
              {/* Sort bar */}
              <div style={{display:"flex",alignItems:"center",gap:4,background:T.surfaceB,borderRadius:6,border:`1px solid ${T.b1}`,padding:"2px 4px",flexShrink:0}}>
                <IcSort size={13} color={T.t4}/>
                {[{v:"date",l:"Date"},{v:"title",l:"Title"},{v:"status",l:"Status"},{v:"cat",l:"Cat"},{v:"project",l:"Project"}].map(s=>(
                  <SortBtn key={s.v} label={s.l} val={s.v} cur={dSortBy} dir={dSortDir} onClick={v=>{if(dSortBy===v)setDSortDir(d=>d==="asc"?"desc":"asc");else{setDSortBy(v);setDSortDir("desc");}}}/>
                ))}
              </div>
              <span style={{fontSize:11,color:T.t4,marginLeft:2}}>{filteredDrawings.length}</span>
            </div>

            <div style={{flex:1,overflowY:"auto",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"2.5fr 130px 120px 50px 100px 80px 50px 70px",padding:"7px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,position:"sticky",top:0,zIndex:10}}>
                {["Title","Project","Category","Type","Status","Uploaded","Size","Pins"].map((h,i)=>(
                  <span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px"}}>{h}</span>
                ))}
              </div>
              {filteredDrawings.map(d=>{
                const sm=STATUS_META[d.status];const cc=CAT_COLORS[d.cat]||{c:T.slt,bg:T.sltL};const isS=selDrawing?.id===d.id;
                return(
                  <div key={d.id} onClick={()=>setSelDrawing(isS?null:d)}
                    style={{display:"grid",gridTemplateColumns:"2.5fr 130px 120px 50px 100px 80px 50px 70px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:isS?T.bluL:"none",borderLeft:isS?`3px solid ${T.blu}`:"3px solid transparent",transition:"background 0.1s",cursor:"pointer"}}
                    onMouseEnter={e=>{if(!isS)e.currentTarget.style.background=T.surfaceB;}}
                    onMouseLeave={e=>{if(!isS)e.currentTarget.style.background="none";}}>
                    <div>
                      <div style={{fontSize:12.5,fontWeight:500,color:isS?T.blu:T.t1}}>{d.title}</div>
                      {d.note&&<div style={{fontSize:10.5,color:T.t4,marginTop:2,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.note}</div>}
                    </div>
                    <span style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.project.length>15?d.project.slice(0,14)+"…":d.project}</span>
                    <Pill label={d.cat} c={cc.c} bg={cc.bg}/>
                    <span style={{fontSize:11.5,color:T.t3,fontWeight:600}}>{d.type}</span>
                    <Pill label={d.status} c={sm.c} bg={sm.bg} brd={sm.brd}/>
                    <span style={{fontSize:11,color:T.t3}}>{d.by.split(" ")[0]} · {d.date}</span>
                    <span style={{fontSize:11,color:T.t4}}>{d.size}</span>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      {d.pins>0&&<><IcPin size={12} color={T.pur}/><span style={{fontSize:11.5,color:T.pur,fontWeight:600}}>{d.pins}</span></>}
                      {isS&&<button onClick={e=>{e.stopPropagation();setShowVersions(true);}} style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:T.blu,color:"white",border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>History</button>}
                    </div>
                  </div>
                );
              })}
              {filteredDrawings.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}><IcDraw size={32} color={T.b2}/><div style={{marginTop:10,fontSize:13,fontWeight:500,color:T.t3}}>No drawings match filters</div></div>}
            </div>
          </div>
        )}

        {/* ── REVISION QUEUE TAB ── */}
        {tab==="revision"&&(
          <RevisionQueueTab
            revisionDrawings={revisionDrawings}
            drawings={drawings}
            setDrawings={setDrawings}
            seedComments={seedComments}
          />
        )}

        {/* ── TASKS TAB ── */}
        {tab==="tasks"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:8,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
              {[{val:tProject,set:setTProject,opts:["All",...PROJECTS],def:"All Projects"},{val:tStatus,set:setTStatus,opts:["All","In Progress","Pending","Completed"],def:"All Status"},{val:tPriority,set:setTPriority,opts:["All","High","Medium","Low"],def:"All Priority"}].map(({val,set,opts,def},i)=>(
                <div key={i} style={{position:"relative"}}>
                  <select value={val} onChange={e=>set(e.target.value)} style={{height:31,padding:"0 22px 0 9px",borderRadius:6,border:`1.5px solid ${val!=="All"?T.blu:T.b1}`,background:val!=="All"?T.bluL:T.surface,fontSize:11.5,color:val!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:val!=="All"?600:400,minWidth:100,appearance:"none",WebkitAppearance:"none"}}>
                    {opts.map(o=><option key={o}>{o==="All"?def:o}</option>)}
                  </select>
                  <IcDown size={10} color={T.t4} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
                </div>
              ))}
              {/* Sort */}
              <div style={{display:"flex",alignItems:"center",gap:4,background:T.surfaceB,borderRadius:6,border:`1px solid ${T.b1}`,padding:"2px 4px"}}>
                <IcSort size={13} color={T.t4}/>
                {[{v:"priority",l:"Priority"},{v:"due",l:"Due"},{v:"status",l:"Status"},{v:"assignedTo",l:"Assigned"}].map(s=>(
                  <SortBtn key={s.v} label={s.l} val={s.v} cur={tSortBy} dir={tSortDir} onClick={v=>{if(tSortBy===v)setTSortDir(d=>d==="asc"?"desc":"asc");else{setTSortBy(v);setTSortDir("desc");}}}/>
                ))}
              </div>
              <span style={{fontSize:11,color:T.t4,marginLeft:2}}>{filteredTasks.length} tasks</span>
            </div>
            <div style={{flex:1,overflowY:"auto",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 140px 110px 90px 90px 80px 80px",padding:"7px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,position:"sticky",top:0,zIndex:10}}>
                {["Task","Project","Category","Assigned","Priority","Due","Status"].map((h,i)=>(
                  <span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px"}}>{h}</span>
                ))}
              </div>
              {filteredTasks.map(t=>{
                const ts=TASK_STATUS_META[t.status];const pr=PRIORITY_META[t.priority];const cc=CAT_COLORS[t.cat]||{c:T.slt,bg:T.sltL};
                return(
                  <div key={t.id} style={{display:"grid",gridTemplateColumns:"2fr 140px 110px 90px 90px 80px 80px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",transition:"background 0.1s",cursor:"pointer",borderLeft:t.priority==="High"?`3px solid ${T.red}`:"3px solid transparent"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <div style={{fontSize:12.5,fontWeight:500,color:T.t1,paddingRight:8,lineHeight:1.4}}>{t.task}</div>
                    <span style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.project.length>16?t.project.slice(0,15)+"…":t.project}</span>
                    <Pill label={t.cat} c={cc.c} bg={cc.bg}/>
                    <span style={{fontSize:11.5,color:T.t2}}>{t.assignedTo.split(" ")[0]}</span>
                    <Pill label={t.priority} c={pr.c} bg={pr.bg}/>
                    <span style={{fontSize:11,color:T.t4}}>{t.due}</span>
                    <Pill label={t.status} c={ts.c} bg={ts.bg}/>
                  </div>
                );
              })}
              {filteredTasks.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}><IcTask size={32} color={T.b2}/><div style={{marginTop:10,fontSize:13,fontWeight:500,color:T.t3}}>No tasks match filters</div></div>}
            </div>
          </div>
        )}

        {/* ── APPROVALS TAB ── */}
        {tab==="approvals"&&(
          <div style={{flex:1,overflowY:"auto"}}>
            <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:10,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
              <div style={{position:"relative"}}>
                <select value={aProject} onChange={e=>setAProject(e.target.value)} style={{height:31,padding:"0 22px 0 9px",borderRadius:6,border:`1.5px solid ${aProject!=="All"?T.blu:T.b1}`,background:aProject!=="All"?T.bluL:T.surface,fontSize:11.5,color:aProject!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:aProject!=="All"?600:400,minWidth:140,appearance:"none",WebkitAppearance:"none"}}>
                  <option value="All">All Projects</option>{PROJECTS.map(p=><option key={p}>{p}</option>)}
                </select>
                <IcDown size={10} color={T.t4} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
              </div>
              <span style={{fontSize:11,color:T.t4}}>{filteredApprovals.length} drawings need attention</span>
            </div>
            {filteredApprovals.length===0&&<div style={{textAlign:"center",padding:"60px",color:T.t4}}><IcApprv size={40} color={T.grnM}/><div style={{fontSize:14,fontWeight:600,color:T.grn,marginTop:10}}>All caught up!</div><div style={{fontSize:12,color:T.t4,marginTop:4}}>No drawings pending approval</div></div>}
            {[...new Set(filteredApprovals.map(d=>d.project))].map(proj=>{
              const projDrawings=filteredApprovals.filter(d=>d.project===proj);
              return(
                <div key={proj} style={{marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                    <IcDraw size={13} color={T.t4}/>
                    <span style={{fontSize:11.5,fontWeight:700,color:T.t2}}>{proj}</span>
                    <span style={{background:T.ambL,color:T.amb,fontSize:9.5,fontWeight:700,padding:"1px 7px",borderRadius:20,border:`1px solid ${T.ambM}`}}>{projDrawings.length}</span>
                  </div>
                  {projDrawings.map(d=>{
                    const sm=STATUS_META[d.status];
                    return(
                      <div key={d.id} style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,marginBottom:7,overflow:"hidden"}}>
                        <div style={{padding:"11px 14px",display:"flex",alignItems:"center",gap:12}}>
                          <div style={{width:38,height:38,borderRadius:8,background:sm.bg,border:`1px solid ${sm.brd}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <IcFile size={17} color={sm.c}/>
                          </div>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                              <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{d.title}</span>
                              <Pill label={d.status} c={sm.c} bg={sm.bg} brd={sm.brd}/>
                              <Pill label={d.cat} c={CAT_COLORS[d.cat]?.c||T.slt} bg={CAT_COLORS[d.cat]?.bg||T.sltL}/>
                            </div>
                            <div style={{fontSize:11,color:T.t4}}>{d.ver} · by {d.by} · {d.date} · {d.size}</div>
                            {d.note&&<div style={{fontSize:11.5,color:T.t3,marginTop:4,padding:"5px 8px",background:T.sltL,borderRadius:5,borderLeft:`3px solid ${T.slt}`,display:"inline-block"}}>{d.note}</div>}
                          </div>
                          <div style={{display:"flex",gap:6,flexShrink:0}}>
                            <button onClick={()=>approveDrawing(d.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11.5,fontWeight:600,cursor:"pointer"}}><IcChk size={13} color={T.grn}/> Approve</button>
                            <button onClick={()=>openReviseModal(d)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11.5,fontWeight:600,cursor:"pointer"}}><IcRevise size={13} color={T.amb}/> Revise</button>
                            <button onClick={()=>rejectDrawing(d.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11.5,fontWeight:600,cursor:"pointer"}}><IcX size={13} color={T.red}/> Reject</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ── VERSION HISTORY TAB ── */}
        {tab==="versions"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:8,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
              <div style={{position:"relative",flex:1,minWidth:160}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input value={vSearch} onChange={e=>setVSearch(e.target.value)} placeholder="Search drawings..."
                  style={{width:"100%",height:31,padding:"0 8px 0 27px",borderRadius:6,border:`1.5px solid ${vSearch?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:vSearch?T.bluL:T.surface}}/>
              </div>
              <div style={{position:"relative"}}>
                <select value={vProject} onChange={e=>setVProject(e.target.value)} style={{height:31,padding:"0 22px 0 9px",borderRadius:6,border:`1.5px solid ${vProject!=="All"?T.blu:T.b1}`,background:vProject!=="All"?T.bluL:T.surface,fontSize:11.5,color:vProject!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:vProject!=="All"?600:400,minWidth:130,appearance:"none",WebkitAppearance:"none"}}>
                  <option value="All">All Projects</option>{PROJECTS.map(p=><option key={p}>{p}</option>)}
                </select>
                <IcDown size={10} color={T.t4} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
              </div>
              <button onClick={()=>setVSortDir(d=>d==="asc"?"desc":"asc")}
                style={{display:"flex",alignItems:"center",gap:4,height:31,padding:"0 10px",borderRadius:6,background:T.surfaceB,border:`1px solid ${T.b1}`,color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
                <IcSort size={13} color={T.t4}/> Date {vSortDir==="desc"?<IcDown size={10} color={T.t4}/>:<IcUp2 size={10} color={T.t4}/>}
              </button>
              <span style={{fontSize:11,color:T.t4}}>{filteredVersions.length} versions</span>
            </div>
            <div style={{flex:1,overflowY:"auto",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"110px 2fr 120px 50px 100px 90px 55px 90px",padding:"7px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,position:"sticky",top:0,zIndex:10}}>
                {["Date","Drawing Title","Project","Ver.","Status","Uploaded By","Size","Note"].map((h,i)=>(
                  <span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px"}}>{h}</span>
                ))}
              </div>
              {filteredVersions.map((v,i)=>{
                const sm=STATUS_META[v.status];
                return(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"110px 2fr 120px 50px 100px 90px 55px 90px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",transition:"background 0.1s",cursor:"pointer"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <span style={{fontSize:11,color:T.t4,fontWeight:500}}>{v.date.split(" ").slice(0,2).join(" ")}</span>
                    <div style={{fontSize:12.5,fontWeight:500,color:T.t1}}>{v.title}</div>
                    <span style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.project.length>14?v.project.slice(0,13)+"…":v.project}</span>
                    <span style={{fontSize:12,fontWeight:700,color:T.t2,fontFamily:"monospace"}}>{v.ver}</span>
                    <Pill label={v.status} c={sm.c} bg={sm.bg} brd={sm.brd}/>
                    <span style={{fontSize:11.5,color:T.t2}}>{v.by.split(" ")[0]}</span>
                    <span style={{fontSize:11,color:T.t4}}>{v.size}</span>
                    <span style={{fontSize:10.5,color:T.t4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontStyle:v.note?"italic":"normal"}}>{v.note||"—"}</span>
                  </div>
                );
              })}
              {filteredVersions.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}><IcHist size={32} color={T.b2}/><div style={{marginTop:10,fontSize:13,fontWeight:500,color:T.t3}}>No version history found</div></div>}
            </div>
          </div>
        )}
      </div>

      {/* ── Revise Comment Modal ── */}
      {reviseModal&&(<>
        <div onClick={closeReviseModal} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.52)",zIndex:400,backdropFilter:"blur(3px)"}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,width:500,maxWidth:"95vw",zIndex:401,boxShadow:"0 24px 70px rgba(0,0,0,0.3)",overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
          {/* Header */}
          <div style={{background:T.amb,padding:"13px 16px",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:9,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <IcRevise size={17} color="white"/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:"white"}}>Send for Revision</div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.75)"}}>{reviseModal.title} · {reviseModal.project}</div>
            </div>
            <button onClick={closeReviseModal} style={{background:"rgba(255,255,255,0.18)",border:"none",cursor:"pointer",color:"white",padding:"5px 7px",borderRadius:6,display:"flex"}}><IcX size={14}/></button>
          </div>
          {/* Body */}
          <div style={{padding:"18px 20px"}}>
            <div style={{background:T.ambL,borderRadius:8,padding:"10px 13px",marginBottom:14,border:`1px solid ${T.ambM}`,display:"flex",gap:8,alignItems:"flex-start"}}>
              <IcAlert size={15} color={T.amb} style={{flexShrink:0,marginTop:1}}/>
              <div style={{fontSize:12,color:T.amb,lineHeight:1.5}}>
                Comment is <strong>compulsory</strong> — drawing team ko clearly pata hona chahiye kya aur kahan change karna hai. Yeh comment Revision Queue ke comments mein automatically add hoga.
              </div>
            </div>
            <label style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:6}}>
              Revision Instruction *
            </label>
            <textarea
              value={reviseComment}
              onChange={e=>{setReviseComment(e.target.value);if(reviseError&&e.target.value.trim())setReviseError(false);}}
              placeholder="e.g. East side ke saare windows 3ft se 4ft karo. North wall bedroom 2 ka window 2ft south shift karo. Client ki site visit ke baad confirm hua..."
              rows={5}
              autoFocus
              style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${reviseError?T.red:reviseComment.trim()?T.amb:T.b1}`,fontSize:12.5,color:T.t1,background:reviseError?T.redL:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",lineHeight:1.6,transition:"border 0.15s"}}
              onFocus={e=>e.target.style.borderColor=reviseError?T.red:T.amb}
              onBlur={e=>e.target.style.borderColor=reviseError?T.red:reviseComment.trim()?T.amb:T.b1}
            />
            {reviseError&&<div style={{fontSize:11.5,color:T.red,marginTop:5,display:"flex",alignItems:"center",gap:5}}>
              <IcAlert size={13} color={T.red}/> Comment likhna zaroori hai — blank nahi chhod sakte.
            </div>}
            <div style={{fontSize:11,color:T.t4,marginTop:6}}>{reviseComment.trim().length} characters</div>
          </div>
          {/* Footer */}
          <div style={{padding:"12px 20px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:8,background:T.surfaceB}}>
            <button onClick={closeReviseModal} style={{flex:1,padding:"9px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
            <button onClick={confirmRevise}
              style={{flex:2,padding:"9px",borderRadius:7,background:reviseComment.trim()?T.amb:T.b2,color:reviseComment.trim()?"white":T.t4,fontSize:12.5,fontWeight:700,border:"none",cursor:reviseComment.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"background 0.2s"}}>
              <IcRevise size={14} color="currentColor"/> Send for Revision
            </button>
          </div>
        </div>
      </>)}

      {/* Drawers */}
      {showVersions&&selDrawing&&<VersionDrawer drawing={selDrawing} allVersions={VERSION_HISTORY} onClose={()=>setShowVersions(false)}/>}
      {showUpload&&<UploadDrawer onClose={()=>setShowUpload(false)}/>}
    </div>
  );
}

export default DesignModule;
