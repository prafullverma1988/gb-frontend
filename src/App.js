import { useState, useEffect } from "react";
import api, { getUser, getToken, clearAuth } from "./config/api";
import apiCache from "./utils/apiCache";
import FinanceModule from "./modules/FinanceModule";
import ProcurementModule from "./modules/ProcurementModule";
import DesignModule from "./modules/DesignModule";
import ClientPreview3D from "./pages/ClientPreview3D";
import PayrollModule from "./modules/PayrollModule";
import SettingsModule from "./modules/SettingsModule";
import CRMModule from "./modules/CRMModule";
import TeamScheduleModule from "./modules/TeamScheduleModule";
import MOMModule from "./modules/MOMModule";
import MasterLibraryModule from "./modules/MasterLibraryModule";
import WarehouseModule from "./modules/WarehouseModule";
import ReportsModule from "./modules/ReportsModule";
import ProjectDetailPage from "./modules/ProjectDetailPage";
import ProjectsPage from "./modules/ProjectsModule";
import SaaSModule from "./modules/SaaSModule";

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

// ── THEME ─────────────────────────────────────────────────────────────
const C={p:"#1565C0",p2:"#1976D2",a:"#FF6F00",sb:"#0D1B2A",sbH:"#1E2E42",w:"#FFFFFF",bg:"#F1F4F8",t:"#1A2332",tm:"#4A5568",tl:"#8896A6",b:"#E2E8F0"};
const T={bg:"#F4F6F9",surface:"#FFFFFF",surfaceB:"#F8F9FB",t1:"#111827",t2:"#374151",t3:"#6B7280",t4:"#9CA3AF",b1:"#E5E7EB",b2:"#D1D5DB",blu:"#2563EB",bluL:"#EFF6FF",bluM:"#BFDBFE",grn:"#059669",grnL:"#ECFDF5",grnM:"#A7F3D0",amb:"#D97706",ambL:"#FFFBEB",ambM:"#FDE68A",red:"#DC2626",redL:"#FEF2F2",redM:"#FECACA",slt:"#64748B",sltL:"#F1F5F9",pur:"#7C3AED",purL:"#F5F3FF",purM:"#DDD6FE"};
const fmt=(n)=>n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:`${(n/1000).toFixed(0)}K`;
const fmtN=(n)=>Math.abs(n).toLocaleString("en-IN");

// ── NAV GROUPS ────────────────────────────────────────────────────────
const NAV_GROUPS=[
  {section:null,items:[{id:"dashboard",label:"Dashboard",Icon:IcHome},{id:"projects",label:"Projects",Icon:IcProj},{id:"crm",label:"CRM",Icon:IcCRM},{id:"mom",label:"MOM",Icon:IcMOM},{id:"team",label:"Team Schedule",Icon:IcTeam},{id:"design",label:"Design",Icon:IcDes,badge:"NEW",bc:C.a}]},
  {section:"FINANCE & OPS",items:[{id:"finance",label:"Finance",Icon:IcFin},{id:"procurement",label:"Procurement",Icon:IcProc,badge:11,bc:C.p},{id:"warehouse",label:"Warehouse",Icon:IcWH},{id:"payroll",label:"Payroll",Icon:IcPay}]},
  {section:"REPORTS",items:[{id:"reports",label:"Reports",Icon:IcRep},{id:"library",label:"Library",Icon:IcLib},{id:"settings",label:"Settings",Icon:IcSet},{id:"saas",label:"SaaS Admin",Icon:IcStar,badge:"SA",bc:"#7C3AED"}]},
];

// Modules that are always ON — cannot be toggled off
const ALWAYS_ON = ["dashboard","projects","finance","procurement","reports","library","settings"];


// ── DASHBOARD DATA ─────────────────────────────────────────────────────
const PROJECTS_DATA=[
  {id:1,name:"Shubham & NK 623",client:"Nand Kishor Agrawal",city:"Raipur",type:"Residential",progress:68,status:"Ongoing",boq:4250000,expense:2890000,pm:"Vijay Sahu",start:"Jan 2025",end:"Aug 2025"},
  {id:2,name:"Tikendra Residence",client:"Tikendra Banchhor",city:"Raipur",type:"Residential",progress:42,status:"Ongoing",boq:3100000,expense:1302000,pm:"Niranjan",start:"Mar 2025",end:"Dec 2025"},
  {id:3,name:"Esther Risali",client:"Esther Group",city:"Bilaspur",type:"Commercial",progress:91,status:"Ongoing",boq:8750000,expense:7963000,pm:"Harsh Sahu",start:"Jun 2024",end:"Apr 2025"},
  {id:4,name:"Amarendra Villa",client:"Amarendra Shrivastava",city:"Raipur",type:"Residential",progress:23,status:"Ongoing",boq:5600000,expense:1288000,pm:"Vijay Sahu",start:"May 2025",end:"Feb 2026"},
  {id:5,name:"Shyam Ji Township",client:"Shyam Developers",city:"Bhilai",type:"Commercial",progress:100,status:"Completed",boq:12000000,expense:11200000,pm:"Niranjan",start:"Jan 2024",end:"Dec 2024"},
  {id:6,name:"Simran Bungalow",client:"Simran Kaur",city:"Raipur",type:"Residential",progress:0,status:"Not Started",boq:2800000,expense:0,pm:"Priyanka",start:"Jun 2025",end:"Mar 2026"},
  {id:7,name:"Neha Sagar Office",client:"Neha Sagar Ltd",city:"Durg",type:"Commercial",progress:55,status:"Hold",boq:6400000,expense:3520000,pm:"Harsh Sahu",start:"Feb 2025",end:"Nov 2025"},
  {id:8,name:"Bablu Farmhouse",client:"Bablu Mehta",city:"Raipur",type:"Residential",progress:78,status:"Ongoing",boq:1900000,expense:1482000,pm:"Vijay Sahu",start:"Nov 2024",end:"May 2025"},
];
const CASHFLOW_DATA=[
  {month:"Oct",in:320000,out:280000},{month:"Nov",in:540000,out:410000},
  {month:"Dec",in:890000,out:620000},{month:"Jan",in:420000,out:510000},
  {month:"Feb",in:760000,out:580000},{month:"Mar",in:700000,out:265775},
];
const ACTIVITY_FEED=[
  {id:1,type:"payment",icon:IcCash,color:T.grn,title:"Payment Received",desc:"Shyam Ji Raipur — ₹5,00,000",project:"Shyam Township",time:"2h ago",amount:500000,dir:"in"},
  {id:2,type:"po",icon:IcPO,color:T.blu,title:"PO Approved",desc:"PO-024 · Abhay Traders — AAC Blocks",project:"Esther Risali",time:"3h ago",amount:182500,dir:"out"},
  {id:3,type:"expense",icon:IcTruck,color:T.amb,title:"Site Expense",desc:"Vijay Sahu — Murga jali for plaster",project:"Shubham 623",time:"5h ago",amount:500,dir:"out"},
  {id:4,type:"payment",icon:IcCash,color:T.grn,title:"Payment Received",desc:"Akashdeep Raipur — ₹2,00,000",project:"Shyam Township",time:"8h ago",amount:200000,dir:"in"},
  {id:5,type:"material",icon:IcTruck,color:T.slt,title:"GRN Completed",desc:"Ceramic Tiles received at site",project:"Bablu Farmhouse",time:"1d ago",amount:67200,dir:"out"},
  {id:6,type:"approval",icon:IcApprv,color:T.pur,title:"Drawing Approved",desc:"Ground Floor Plan v3",project:"Shubham 623",time:"1d ago",amount:null,dir:null},
  {id:7,type:"payment",icon:IcCash,color:T.red,title:"Bill Unpaid",desc:"Abhay Traders — TMT Steel",project:"Esther Risali",time:"2d ago",amount:126775,dir:"out"},
  {id:8,type:"pr",icon:IcCalc,color:T.amb,title:"Payment Request",desc:"PR-12 · Laxmi Electrical · ₹1,750",project:"Neha Sagar",time:"2d ago",amount:1750,dir:"pending"},
];
const PENDING_ACTIONS=[
  {id:1,type:"pr",label:"Payment Request",desc:"PR-12 — Laxmi Electrical · Neha Sagar",amount:1750,priority:"medium",color:T.amb,bg:T.ambL,brd:T.ambM,Icon:IcCalc},
  {id:2,type:"pr",label:"Payment Request",desc:"PR-10 — Chandra Shekhar · Tikendra",amount:30000,priority:"high",color:T.red,bg:T.redL,brd:T.redM,Icon:IcCalc},
  {id:3,type:"pr",label:"Payment Request",desc:"PR-8 — Vaibhav Traders · Amarendra",amount:22500,priority:"high",color:T.red,bg:T.redL,brd:T.redM,Icon:IcCalc},
  {id:4,type:"po",label:"PO Approval",desc:"PO-021 — Ganesh Cement · Shubham 623",amount:38000,priority:"medium",color:T.amb,bg:T.ambL,brd:T.ambM,Icon:IcPO},
  {id:5,type:"drawing",label:"Drawing Review",desc:"Amarendra Villa Floor Plan v3",amount:null,priority:"medium",color:T.blu,bg:T.bluL,brd:T.bluM,Icon:IcDes},
  {id:6,type:"drawing",label:"Drawing Review",desc:"Esther Risali Plumbing Layout",amount:null,priority:"high",color:T.red,bg:T.redL,brd:T.redM,Icon:IcDes},
];
const ALERTS=[
  {id:1,type:"overdue",msg:"Abhay Traders bill ₹1.27L overdue — Esther Risali",color:T.red,bg:T.redL,brd:T.redM,Icon:IcAlert},
  {id:2,type:"overdue",msg:"Ramesh Labour Sub-Con bill ₹38K due today",color:T.red,bg:T.redL,brd:T.redM,Icon:IcAlert},
  {id:3,type:"material",msg:"4 Material Requests pending order > 2 days",color:T.amb,bg:T.ambL,brd:T.ambM,Icon:IcTruck},
  {id:4,type:"drawing",msg:"Esther Risali plumbing drawing rejected — needs rework",color:T.amb,bg:T.ambL,brd:T.ambM,Icon:IcDes},
  {id:5,type:"progress",msg:"Esther Risali at 91% — handover due Apr 2025",color:T.blu,bg:T.bluL,brd:T.bluM,Icon:IcApprv},
];
const MATERIAL_STATUS={pending:4,ordered:4,received:5,total:13};
const STATUS_META={"Ongoing":{c:T.grn,bg:T.grnL,brd:T.grnM},"Completed":{c:T.blu,bg:T.bluL,brd:T.bluM},"Hold":{c:T.amb,bg:T.ambL,brd:T.ambM},"Not Started":{c:T.slt,bg:T.sltL,brd:T.b2}};

// ── SHARED MINI COMPONENTS ────────────────────────────────────────────
const Pill=({label,c,bg,brd})=>(
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${brd||c+"33"}`,whiteSpace:"nowrap"}}>{label}</span>
);
function KpiTile({label,value,sub,color,Icon,trend,trendVal,onClick}){
  return(
    <div onClick={onClick} style={{padding:"14px 16px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,borderTop:`3px solid ${color}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",cursor:onClick?"pointer":"default",transition:"box-shadow 0.15s",minWidth:0}}
      onMouseEnter={e=>{if(onClick)e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.1)";}}
      onMouseLeave={e=>{if(onClick)e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)";}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
        <div style={{width:34,height:34,borderRadius:8,background:color+"18",border:`1px solid ${color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon size={16} color={color}/></div>
        {trend&&<div style={{display:"flex",alignItems:"center",gap:3,fontSize:10.5,fontWeight:600,color:trend==="up"?T.grn:T.red}}>{trend==="up"?<IcTrend size={11} color={T.grn}/>:<IcTrendD size={11} color={T.red}/>}{trendVal}</div>}
      </div>
      <div style={{fontSize:22,fontWeight:700,color:T.t1,letterSpacing:"-0.5px",lineHeight:1,marginBottom:4}}>{value}</div>
      <div style={{fontSize:11,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:2}}>{label}</div>
      {sub&&<div style={{fontSize:10.5,color:T.t4}}>{sub}</div>}
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
  const maxVal=Math.max(...data.flatMap(d=>[d.in,d.out]));
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
  let cumDeg=-90;
  const total=slices.reduce((s,sl)=>s+sl.value,0);
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
  const maxV=Math.max(...data.flatMap(d=>[d.in,d.out]));
  const W=360,pad={top:10,bottom:22,left:8,right:8};
  const cW=W-pad.left-pad.right; const cH=height-pad.top-pad.bottom;
  const n=data.length;
  const px=(i)=>pad.left+(i/(n-1))*cW;
  const py=(v)=>pad.top+cH-(v/maxV)*cH;
  const linePoints=(key)=>data.map((d,i)=>`${px(i)},${py(d[key])}`).join(' ');
  const areaPath=(key,fillY)=>{const pts=data.map((d,i)=>`${px(i)},${py(d[key])}`);return `M${px(0)},${fillY} L${pts.join(' L')} L${px(n-1)},${fillY} Z`;};
  return(<svg width="100%" viewBox={`0 0 ${W} ${height}`} style={{overflow:"visible"}}>{[0,0.5,1].map((p,i)=>(<line key={i} x1={pad.left} y1={pad.top+cH*p} x2={W-pad.right} y2={pad.top+cH*p} stroke={T.b1} strokeWidth={0.7} strokeDasharray={p===0?"0":"3,3"}/>))}<path d={areaPath("in",pad.top+cH)} fill={T.grn} opacity={0.1}/><polyline points={linePoints("in")} fill="none" stroke={T.grn} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><path d={areaPath("out",pad.top+cH)} fill={T.red} opacity={0.1}/><polyline points={linePoints("out")} fill="none" stroke={T.red} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,2"/>{data.map((d,i)=>(<g key={i}><circle cx={px(i)} cy={py(d.in)} r={3} fill={T.grn}/><circle cx={px(i)} cy={py(d.out)} r={3} fill={T.red}/><text x={px(i)} y={height-5} textAnchor="middle" fontSize={9} fill={T.t4} fontFamily="'Segoe UI',sans-serif">{d.month}</text></g>))}</svg>);
}
function FinanceBarChart({data,height=130}){
  const maxV=Math.max(...data.map(d=>Math.max(d.sales,d.expense)));
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
  const [email,setEmail]=useState("admin@gbbuildcon.com");
  const [pass,setPass]=useState("Admin@123");
  const [show,setShow]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const handleLogin=async()=>{
    setLoading(true);setError("");
    try{
      const res=await api.login(email,pass);
      if(res.success){onLogin(res.user);}
      else{setError(res.message||"Login failed");}
    }catch(err){setError("Server not reachable. Please try again.");}
    setLoading(false);
  };
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.sb} 0%,#1B3A5C 50%,${C.p} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:"rgba(255,255,255,0.97)",borderRadius:20,padding:"44px 40px",width:400,boxShadow:"0 32px 80px rgba(0,0,0,0.35)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:62,height:62,borderRadius:16,background:`linear-gradient(135deg,${C.p},${C.a})`,marginBottom:14}}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/></svg></div>
          <div style={{fontSize:21,fontWeight:800,color:C.t}}>GB Buildcon</div>
          <div style={{fontSize:12,color:C.tl,marginTop:3}}>Construction Management Platform</div>
        </div>
        {error&&<div style={{background:T.redL,color:T.red,padding:"10px 14px",borderRadius:8,fontSize:12.5,marginBottom:16,border:`1px solid ${T.redM}`}}>{error}</div>}
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:600,color:C.tm,letterSpacing:"0.6px",textTransform:"uppercase",display:"block",marginBottom:6}}>Email</label>
          <input type="text" value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%",padding:"11px 14px",borderRadius:9,border:`1.5px solid ${C.b}`,fontSize:13,color:C.t,background:T.sltL,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
        </div>
        <div style={{marginBottom:26}}>
          <label style={{fontSize:11,fontWeight:600,color:C.tm,letterSpacing:"0.6px",textTransform:"uppercase",display:"block",marginBottom:6}}>Password</label>
          <div style={{position:"relative"}}>
            <input type={show?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} style={{width:"100%",padding:"11px 40px 11px 14px",borderRadius:9,border:`1.5px solid ${C.b}`,fontSize:13,color:C.t,background:T.sltL,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
            <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.tl,display:"flex"}}>{show?<IcEyeX size={17}/>:<IcEye size={17}/>}</button>
          </div>
        </div>
        <button onClick={handleLogin} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:9,background:loading?C.tl:`linear-gradient(135deg,${C.p},${C.p2})`,color:"white",fontSize:14,fontWeight:700,border:"none",cursor:loading?"not-allowed":"pointer"}}>{loading?"Logging in...":"Login to Dashboard"}</button>
      </div>
    </div>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────────
function Sidebar({active,setActive,collapsed,setCollapsed,user,onLogout,enabledModules}){
  // Filter nav items — disabled modules hidden from sidebar
  const isVisible=(id)=>{
    if(id==="saas") return user?.role==="super_admin";
    if(ALWAYS_ON.includes(id)) return true;
    if(!enabledModules) return true; // still loading
    return enabledModules[id]!==false;
  };
  return(
    <div style={{width:collapsed?62:232,minHeight:"100vh",background:C.sb,display:"flex",flexDirection:"column",transition:"width 0.25s cubic-bezier(.4,0,.2,1)",overflow:"hidden",flexShrink:0,boxShadow:"2px 0 16px rgba(0,0,0,0.28)",zIndex:100}}>
      <div style={{padding:collapsed?"18px 0":"18px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid rgba(255,255,255,0.07)",minHeight:66,justifyContent:collapsed?"center":"flex-start"}}>
        <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${C.p},${C.a})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/></svg></div>
        {!collapsed&&<div><div style={{color:"white",fontWeight:800,fontSize:14}}>GB Buildcon</div><div style={{color:"rgba(255,255,255,0.32)",fontSize:9,letterSpacing:"0.8px",textTransform:"uppercase"}}>Construction</div></div>}
      </div>
      <nav style={{flex:1,padding:"10px 0",overflowY:"auto"}}>
        {NAV_GROUPS.map((grp,gi)=>{
          const visibleItems=grp.items.filter(item=>isVisible(item.id));
          if(!visibleItems.length) return null;
          return(
            <div key={gi}>
              {grp.section&&!collapsed&&<div style={{marginTop:gi>0?4:0}}><div style={{height:1,background:"rgba(255,255,255,0.06)",margin:"0 12px 2px"}}/><div style={{color:"rgba(255,255,255,0.28)",fontSize:9,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",padding:"8px 16px 4px"}}>{grp.section}</div></div>}
              {visibleItems.map(item=>{
                const isA=active===item.id;
                return(
                  <button key={item.id} onClick={()=>setActive(item.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:collapsed?"10px 0":"9px 16px",background:isA?`linear-gradient(90deg,${C.p}DD,${C.p}88)`:"none",border:"none",cursor:"pointer",color:isA?"white":"rgba(255,255,255,0.52)",transition:"all 0.14s",position:"relative",justifyContent:collapsed?"center":"flex-start",borderLeft:isA&&!collapsed?`3px solid ${C.a}`:"3px solid transparent"}}
                    onMouseEnter={e=>{if(!isA){e.currentTarget.style.background=C.sbH;e.currentTarget.style.color="white";}}}
                    onMouseLeave={e=>{if(!isA){e.currentTarget.style.background="none";e.currentTarget.style.color="rgba(255,255,255,0.52)";}}}
                  >
                    <item.Icon size={17} color="currentColor"/>
                    {!collapsed&&<span style={{fontSize:13,fontWeight:isA?600:400,flex:1,whiteSpace:"nowrap"}}>{item.label}</span>}
                    {!collapsed&&item.badge&&<span style={{background:item.bc,color:"white",fontSize:typeof item.badge==="number"?9:8,fontWeight:700,padding:"1px 6px",borderRadius:10}}>{item.badge}</span>}
                    {isA&&collapsed&&<div style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",width:3,height:22,background:C.a,borderRadius:"2px 0 0 2px"}}/>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
      {/* User profile + logout */}
      <div style={{padding:collapsed?"10px 0":"10px 14px",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:9,justifyContent:collapsed?"center":"flex-start"}}>
        <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${C.a},#FF8F00)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,fontWeight:700,color:"white"}}>{(user?.name||"U")[0].toUpperCase()}</div>
        {!collapsed&&<div style={{flex:1,overflow:"hidden"}}><div style={{color:"white",fontSize:12.5,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name||"User"}</div><div style={{color:"rgba(255,255,255,0.32)",fontSize:10}}>{user?.role||"User"}</div></div>}
        {!collapsed&&onLogout&&(
          <button onClick={onLogout} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,cursor:"pointer",color:"rgba(255,255,255,0.55)",padding:"5px 8px",display:"flex",alignItems:"center",gap:4,fontSize:11,transition:"all 0.15s"}} title="Logout"
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(220,38,38,0.2)";e.currentTarget.style.color="white";e.currentTarget.style.borderColor="rgba(220,38,38,0.4)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.color="rgba(255,255,255,0.55)";e.currentTarget.style.borderColor="rgba(255,255,255,0.15)";}}>
            <IcX size={13}/>
            <span>Logout</span>
          </button>
        )}
      </div>
    </div>
  );
}


// ── TOPBAR ────────────────────────────────────────────────────────────
function TopBar({title,sub,collapsed,setCollapsed,alertCount,user,onLogout}){
  return(
    <div style={{height:60,background:T.surface,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",padding:"0 20px",gap:14,flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
      <button onClick={()=>setCollapsed(!collapsed)} style={{background:"none",border:"none",cursor:"pointer",color:T.t3,padding:7,borderRadius:7,display:"flex"}} onMouseEnter={e=>e.currentTarget.style.background=T.sltL} onMouseLeave={e=>e.currentTarget.style.background="none"}><IcMenu size={19}/></button>
      <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:T.t1}}>{title}</div>{sub&&<div style={{fontSize:11,color:T.t3}}>{sub}</div>}</div>
      <button style={{background:"none",border:"none",cursor:"pointer",color:T.t3,padding:7,borderRadius:7,position:"relative"}} onMouseEnter={e=>e.currentTarget.style.background=T.sltL} onMouseLeave={e=>e.currentTarget.style.background="none"}>
        <IcBell size={19}/>
        {alertCount>0&&<div style={{position:"absolute",top:4,right:4,width:16,height:16,borderRadius:"50%",background:T.red,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"white",border:"2px solid white"}}>{alertCount}</div>}
      </button>
      <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.a},#FF8F00)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"white",cursor:"pointer"}}>{(user?.name||"U")[0].toUpperCase()}</div>
    </div>
  );
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

function DashboardModule(){
  const [range,setRange]=useState("month");
  const [selProject,setSelProject]=useState("All");
  const [expandedProjId,setExpandedProjId]=useState(null);
  const [dismissedAlerts,setDismissedAlerts]=useState([]);
  const [showAllActivity,setShowAllActivity]=useState(false);
  const [showAllActions,setShowAllActions]=useState(false);
  const activeAlerts=ALERTS.filter(a=>!dismissedAlerts.includes(a.id));
  const projects=["All",...PROJECTS_DATA.map(p=>p.name)];
  const filteredProjects=selProject==="All"?PROJECTS_DATA:PROJECTS_DATA.filter(p=>p.name===selProject);
  const totalBOQ=filteredProjects.reduce((s,p)=>s+p.boq,0);
  const totalExp=filteredProjects.reduce((s,p)=>s+p.expense,0);
  const totalMargin=totalBOQ-totalExp;
  const marginPct=totalBOQ>0?((totalMargin/totalBOQ)*100).toFixed(1):0;
  const cashBalance=2557240;
  const activeCount=filteredProjects.filter(p=>p.status==="Ongoing").length;
  const avgProgress=filteredProjects.length>0?Math.round(filteredProjects.reduce((s,p)=>s+p.progress,0)/filteredProjects.length):0;
  const overdueAmt=164775;
  const pendingCount=PENDING_ACTIONS.length;
  const cfData=range==="week"?CASHFLOW_DATA.slice(-2):range==="month"?CASHFLOW_DATA.slice(-3):CASHFLOW_DATA;
  const totalIn=cfData.reduce((s,d)=>s+d.in,0);
  const totalOut=cfData.reduce((s,d)=>s+d.out,0);
  const financeBarData=CASHFLOW_DATA.map(d=>({month:d.month,sales:Math.round(d.in*(selProject==="All"?1:0.35)),expense:Math.round(d.out*(selProject==="All"?1:0.35))}));
  const expSlices=[{label:"Material Purchase",value:totalExp*0.46,color:T.blu},{label:"Sub-Contractor",value:totalExp*0.30,color:T.pur},{label:"Direct Labour",value:totalExp*0.15,color:T.grn},{label:"Site Expenses",value:totalExp*0.06,color:T.amb},{label:"Equipment",value:totalExp*0.03,color:T.slt}].filter(s=>s.value>0);
  const activityToShow=showAllActivity?ACTIVITY_FEED:ACTIVITY_FEED.slice(0,4);
  const actionsToShow=showAllActions?PENDING_ACTIONS:PENDING_ACTIONS.slice(0,4);

  return(
    <div style={{padding:"16px 20px",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Alerts */}
      {activeAlerts.length>0&&<div style={{marginBottom:12,display:"flex",flexDirection:"column",gap:6}}>
        {activeAlerts.map(a=>(<div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:a.bg,border:`1px solid ${a.brd}`,borderRadius:8,borderLeft:`3px solid ${a.color}`}}>
          <a.Icon size={14} color={a.color}/><span style={{flex:1,fontSize:12.5,color:a.color,fontWeight:500}}>{a.msg}</span>
          <button onClick={()=>setDismissedAlerts(p=>[...p,a.id])} style={{background:"none",border:"none",cursor:"pointer",color:a.color,opacity:.6,display:"flex",padding:2}}><IcX size={13}/></button>
        </div>))}
      </div>}
      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:12}}>
        <KpiTile label="Total BOQ" value={`₹${fmt(totalBOQ)}`} sub={`${filteredProjects.length} projects`} color={T.slt} Icon={IcMargin} trend="up" trendVal="+12%"/>
        <KpiTile label="Total Spent" value={`₹${fmt(totalExp)}`} sub={`${((totalExp/totalBOQ)*100).toFixed(0)}% of BOQ`} color={T.amb} Icon={IcTruck}/>
        <KpiTile label="Gross Margin" value={`₹${fmt(totalMargin)}`} sub={`${marginPct}% margin`} color={totalMargin>0?T.grn:T.red} Icon={IcTrend} trend={totalMargin>0?"up":"down"} trendVal={`${marginPct}%`}/>
        <KpiTile label="Cash Balance" value={`₹${fmt(cashBalance)}`} sub="All accounts" color={T.blu} Icon={IcCash}/>
        <KpiTile label="Active Projects" value={activeCount} sub={`Avg ${avgProgress}% progress`} color={T.pur} Icon={IcProj}/>
        <KpiTile label="Pending Actions" value={pendingCount} sub={`₹${fmt(overdueAmt)} overdue`} color={T.red} Icon={IcAlert}/>
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
          <div style={{padding:"14px 16px"}}><CashLineChart data={CASHFLOW_DATA} height={90}/><div style={{display:"flex",gap:14,marginTop:10}}>{[{l:"IN",v:CASHFLOW_DATA.reduce((s,d)=>s+d.in,0),c:T.grn},{l:"OUT",v:CASHFLOW_DATA.reduce((s,d)=>s+d.out,0),c:T.red}].map((s,i)=>(<div key={i}><div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:2}}>{s.l}</div><div style={{fontSize:13.5,fontWeight:700,color:s.c}}>₹{fmt(s.v)}</div></div>))}</div></div>
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
                const sm=STATUS_META[p.status]||STATUS_META["Ongoing"];
                const margin=p.boq-p.expense; const mPct=p.boq>0?((margin/p.boq)*100).toFixed(1):0;
                const spentPct=p.boq>0?((p.expense/p.boq)*100).toFixed(0):0;
                const pColor=p.progress===100?T.grn:p.progress>60?T.blu:p.progress>30?T.amb:T.red;
                const isExp=expandedProjId===p.id;
                return(<>
                  <tr key={p.id} onClick={()=>setExpandedProjId(isExp?null:p.id)} style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 110px 80px 90px 90px 90px 70px 80px 40px",padding:"10px 14px",borderBottom:`1px solid ${isExp?T.bluM:T.b1}`,alignItems:"center",cursor:"pointer",background:isExp?T.bluL:"none",borderLeft:isExp?`3px solid ${T.blu}`:"3px solid transparent",transition:"all 0.1s"}} onMouseEnter={e=>{if(!isExp)e.currentTarget.style.background=T.surfaceB;}} onMouseLeave={e=>{if(!isExp)e.currentTarget.style.background="none";}}>
                    <td style={{display:"contents"}}>
                      <div style={{minWidth:0}}><div style={{fontSize:12.5,fontWeight:600,color:isExp?T.blu:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div><div style={{fontSize:10.5,color:T.t4}}>{p.city} · {p.type}</div></div>
                      <span style={{fontSize:11.5,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.client.split(" ").slice(0,2).join(" ")}</span>
                      <span style={{display:"inline-block"}}><span style={{background:sm.bg,color:sm.c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${sm.brd}`,whiteSpace:"nowrap"}}>{p.status}</span></span>
                      <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:10,fontWeight:700,color:pColor}}>{p.progress}%</span></div><div style={{height:5,background:T.b1,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${p.progress}%`,background:pColor,borderRadius:3}}/></div></div>
                      <span style={{fontSize:12,fontWeight:600,color:T.t1}}>₹{fmt(p.boq)}</span>
                      <div><span style={{fontSize:12,fontWeight:600,color:T.amb}}>₹{fmt(p.expense)}</span><div style={{height:3,background:T.b1,borderRadius:2,marginTop:3,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(spentPct,100)}%`,background:Number(spentPct)>90?T.red:T.amb,borderRadius:2}}/></div></div>
                      <span style={{fontSize:12,fontWeight:700,color:margin>=0?T.grn:T.red}}>₹{fmt(Math.abs(margin))}</span>
                      <span style={{fontSize:12,fontWeight:700,color:Number(mPct)>=20?T.grn:Number(mPct)>=10?T.amb:T.red}}>{mPct}%</span>
                      <span style={{fontSize:11.5,color:T.t3}}>{p.pm.split(" ")[0]}</span>
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
        <Panel title={<span>Pending Actions <span style={{background:T.redL,color:T.red,fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,marginLeft:5,border:`1px solid ${T.redM}`}}>{PENDING_ACTIONS.length}</span></span>} action={<button onClick={()=>setShowAllActions(!showAllActions)} style={{fontSize:11,color:T.blu,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>{showAllActions?"Less":"All"}</button>}>
          <div style={{overflowY:"auto",maxHeight:260}}>{actionsToShow.map((a,i)=>(<div key={a.id} style={{padding:"9px 14px",borderBottom:i<actionsToShow.length-1?`1px solid ${T.b1}`:"none",display:"flex",alignItems:"center",gap:10,cursor:"pointer",transition:"background 0.1s"}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="none"}><div style={{width:30,height:30,borderRadius:7,background:a.bg,border:`1px solid ${a.brd}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><a.Icon size={13} color={a.color}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:11.5,fontWeight:600,color:T.t1,marginBottom:1}}>{a.label}</div><div style={{fontSize:10.5,color:T.t4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.desc}</div></div><div style={{textAlign:"right",flexShrink:0}}>{a.amount&&<div style={{fontSize:12,fontWeight:700,color:T.t1}}>₹{fmtN(a.amount)}</div>}<div style={{width:7,height:7,borderRadius:"50%",background:a.color,marginLeft:"auto",marginTop:a.amount?4:0}}/></div></div>))}</div>
        </Panel>
        <Panel title="Recent Activity" action={<button onClick={()=>setShowAllActivity(!showAllActivity)} style={{fontSize:11,color:T.blu,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>{showAllActivity?"Collapse":"View all"}</button>}>
          <div style={{overflowY:"auto",maxHeight:260}}>{activityToShow.map((a,i)=>(<div key={a.id} style={{padding:"9px 14px",borderBottom:i<activityToShow.length-1?`1px solid ${T.b1}`:"none",display:"flex",alignItems:"center",gap:10,cursor:"pointer",transition:"background 0.1s"}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="none"}><div style={{width:32,height:32,borderRadius:8,background:a.color+"15",border:`1px solid ${a.color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><a.icon size={14} color={a.color}/></div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{a.title}</span>{a.dir&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:20,background:a.dir==="in"?T.grnL:a.dir==="pending"?T.ambL:T.redL,color:a.dir==="in"?T.grn:a.dir==="pending"?T.amb:T.red}}>{a.dir==="in"?"IN":a.dir==="pending"?"PENDING":"OUT"}</span>}</div><div style={{fontSize:10.5,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:1}}>{a.desc}</div><div style={{fontSize:10,color:T.t4}}>{a.project} · {a.time}</div></div>{a.amount&&<div style={{fontSize:12.5,fontWeight:700,color:a.dir==="in"?T.grn:a.dir==="pending"?T.amb:T.red,flexShrink:0}}>{a.dir==="in"?"+":"−"}₹{fmtN(a.amount)}</div>}</div>))}</div>
        </Panel>
      </div>
    </div>
  );
}

// ── PROJECTS WRAPPER ──────────────────────────────────────────────────
function ProjectsWrapper(){
  const [selectedProject,setSelectedProject]=useState(null);
  if(selectedProject) return <ProjectDetailPage project={selectedProject} onBack={()=>setSelectedProject(null)}/>;
  return <ProjectsPage onSelectProject={setSelectedProject}/>;
}


// ── APP ───────────────────────────────────────────────────────────────
export default function App(){
  // Public route — 3D client preview (no login needed)
  if(window.location.pathname.startsWith("/3d-preview/")){
    return <ClientPreview3D/>;
  }

  const [user,setUser]=useState(()=>getUser());
  const [nav,setNav]=useState("dashboard");
  const [collapsed,setCollapsed]=useState(false);
  // enabledModules: null=loading, {}=map of key→boolean
  const [enabledModules,setEnabledModules]=useState(null);

  // Wake up Railway backend on app load — prevents cold start delay
  useEffect(()=>{
    fetch("https://gb-backend-production-7bd2.up.railway.app/api/health").catch(()=>{});
  },[]);

  const loggedIn=!!user&&!!getToken();

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

  const handleLogin=(userData)=>{setUser(userData);};
  const handleLogout=()=>{apiCache.clear();clearAuth();setUser(null);setEnabledModules(null);};

  if(!loggedIn) return <LoginScreen onLogin={handleLogin}/>;

  const PAGES={
    dashboard:{title:"Dashboard",sub:"Company Overview"},
    projects:{title:"Projects",sub:"All Construction Projects"},
    crm:{title:"CRM",sub:"Clients & Leads"},
    mom:{title:"MOM",sub:"Minutes of Meeting"},
    team:{title:"Team Schedule",sub:"Gantt · Timesheets"},
    design:{title:"Design",sub:"Drawings & Tasks"},
    finance:{title:"Finance",sub:"Cash Book · Transactions"},
    procurement:{title:"Procurement",sub:"PO · RFQ · Materials"},
    warehouse:{title:"Warehouse",sub:"Central Stock"},
    payroll:{title:"Payroll",sub:"Staff Payments"},
    reports:{title:"Reports",sub:"All Reports"},
    library:{title:"Library",sub:"Master Data"},
    settings:{title:"Settings",sub:"Configuration"},
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
    team:      guard("team",     "Team Schedule",  <TeamScheduleModule/>),
    mom:       guard("mom",      "MOM",            <MOMModule/>),
    library:   guard("library",  "Library",        <MasterLibraryModule/>),
    warehouse: guard("warehouse","Warehouse",      <WarehouseModule/>),
    reports:   guard("reports",  "Reports",        <ReportsModule/>),
    settings:  <SettingsModule/>,
    saas:     <SaaSModule/>,
  };

  const page=PAGES[nav]||PAGES.dashboard;

  return(
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:T.bg,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:10px}
        select,input{font-family:'Segoe UI',system-ui,sans-serif}
      `}</style>
      <Sidebar active={nav} setActive={setNav} collapsed={collapsed} setCollapsed={setCollapsed} user={user} onLogout={handleLogout} enabledModules={enabledModules}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <TopBar title={page.title} sub={page.sub} collapsed={collapsed} setCollapsed={setCollapsed} alertCount={ALERTS.length} user={user} onLogout={handleLogout}/>
        <div style={{flex:1,overflowY:"auto"}}>
          {MODULE_MAP[nav]||<DashboardModule/>}
        </div>
      </div>
    </div>
  );
}
