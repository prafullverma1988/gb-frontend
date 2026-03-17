import { useState } from "react";

// ── ICONS ────────────────────────────────────────────────────────────
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
const IcAdd   =(p)=><Ic {...p} d="M12 5v14M5 12h14"/>;
const IcDown  =(p)=><Ic {...p} d="M6 9l6 6 6-6"/>;
const IcX     =(p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcChk   =(p)=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcEye   =(p)=><Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0"/>;
const IcEyeX  =(p)=><Ic {...p} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>;
const IcTeam  =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>;
const IcCRM   =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a3 3 0 00-3-3M16 3.13a4 4 0 010 7.75"/>;
const IcMOM   =(p)=><Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>;
const IcPay   =(p)=><Ic {...p} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>;
const IcLib   =(p)=><Ic {...p} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>;
const IcPO    =(p)=><Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
const IcRFQ   =(p)=><Ic {...p} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>;
const IcMR    =(p)=><Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>;
const IcTruck =(p)=><Ic {...p} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>;
const IcShare =(p)=><Ic {...p} d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>;
const IcLock  =(p)=><Ic {...p} d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"/>;
const IcWA    =(p)=><Ic {...p} d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>;
const IcMail  =(p)=><Ic {...p} d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6"/>;
const IcSMS   =(p)=><Ic {...p} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>;
const IcEdit  =(p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcFlow  =(p)=><Ic {...p} d="M5 12h14M12 5l7 7-7 7"/>;
const IcApprv =(p)=><Ic {...p} d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>;
const IcGRN   =(p)=><Ic {...p} d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>;
const IcPen   =(p)=><Ic {...p} d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>;
const IcCopy  =(p)=><Ic {...p} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>;
const IcGrid  =(p)=><Ic {...p} d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>;
const IcListV =(p)=><Ic {...p} d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01"/>;
const IcAlert =(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;

// ── THEME ────────────────────────────────────────────────────────────
const C={p:"#1565C0",p2:"#1976D2",a:"#FF6F00",sb:"#0D1B2A",sbH:"#1E2E42",w:"#FFFFFF",bg:"#F1F4F8",t:"#1A2332",tm:"#4A5568",tl:"#8896A6",b:"#E2E8F0"};
const T={bg:"#F4F6F9",surface:"#FFFFFF",surfaceB:"#F8F9FB",t1:"#111827",t2:"#374151",t3:"#6B7280",t4:"#9CA3AF",b1:"#E5E7EB",b2:"#D1D5DB",blu:"#2563EB",bluL:"#EFF6FF",bluM:"#BFDBFE",grn:"#059669",grnL:"#ECFDF5",grnM:"#A7F3D0",amb:"#D97706",ambL:"#FFFBEB",ambM:"#FDE68A",red:"#DC2626",redL:"#FEF2F2",redM:"#FECACA",slt:"#64748B",sltL:"#F1F5F9",pur:"#7C3AED",purL:"#F5F3FF",purM:"#DDD6FE"};
const fmt=(n)=>n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:`${(n/1000).toFixed(0)}K`;
const fmtN=(n)=>Math.abs(n).toLocaleString("en-IN");

// ── NAV ──────────────────────────────────────────────────────────────
const NAV_GROUPS=[
  {section:null,items:[{id:"dashboard",label:"Dashboard",Icon:IcHome},{id:"projects",label:"Projects",Icon:IcProj},{id:"crm",label:"CRM",Icon:IcCRM},{id:"mom",label:"MOM",Icon:IcMOM},{id:"team",label:"Team Schedule",Icon:IcTeam},{id:"design",label:"Design",Icon:IcDes,badge:"NEW",bc:C.a}]},
  {section:"FINANCE & OPS",items:[{id:"finance",label:"Finance",Icon:IcFin},{id:"procurement",label:"Procurement",Icon:IcProc,badge:11,bc:C.p},{id:"warehouse",label:"Warehouse",Icon:IcWH},{id:"payroll",label:"Payroll",Icon:IcPay}]},
  {section:"REPORTS",items:[{id:"reports",label:"Reports",Icon:IcRep},{id:"library",label:"Library",Icon:IcLib},{id:"settings",label:"Settings",Icon:IcSet}]},
];

// ── DATA ─────────────────────────────────────────────────────────────
const PROJECTS=["Shubham & NK 623","Tikendra Residence","Esther Risali","Amarendra Villa","Neha Sagar Office","Bablu Farmhouse"];
const VENDORS=["Abhay Traders","Vaibhav Traders","Rajesh Steel Mart","Shyam Ji Materials","Ganesh Cement House","Lucky Hardware","Sri Ram Electricals","Agarwal Plumbing"];

const MR_DATA=[
  {id:"MR-14",date:"14 Mar",project:"Amarendra Villa",item:"Cement OPC 50kg",qty:200,unit:"Bags",requestedBy:"Vijay Sahu",status:"Approved",matStatus:"Pending"},
  {id:"MR-13",date:"13 Mar",project:"Tikendra Residence",item:"TMT Steel Fe500 12mm",qty:3,unit:"MT",requestedBy:"Niranjan",status:"Approved",matStatus:"Pending"},
  {id:"MR-12",date:"13 Mar",project:"Amarendra Villa",item:"M-Sand Fine",qty:8,unit:"Loads",requestedBy:"Vijay Sahu",status:"Approved",matStatus:"Pending"},
  {id:"MR-11",date:"12 Mar",project:"Esther Risali",item:"Plywood 18mm BWR",qty:50,unit:"Sheets",requestedBy:"Harsh Sahu",status:"Approved",matStatus:"Pending"},
  {id:"MR-10",date:"11 Mar",project:"Neha Sagar Office",item:"PVC Conduit 25mm",qty:500,unit:"Mtrs",requestedBy:"Priyanka",status:"Pending",matStatus:"Pending"},
  {id:"MR-09",date:"11 Mar",project:"Shubham & NK 623",item:"River Sand",qty:15,unit:"Loads",requestedBy:"Vijay Sahu",status:"Approved",matStatus:"Ordered",vendor:"Shyam Ji Materials",expectedDelivery:"18 Mar"},
  {id:"MR-08",date:"10 Mar",project:"Esther Risali",item:"AAC Blocks 600x200x150",qty:5000,unit:"Nos",requestedBy:"Harsh Sahu",status:"Approved",matStatus:"Ordered",vendor:"Abhay Traders",expectedDelivery:"16 Mar"},
  {id:"MR-07",date:"09 Mar",project:"Tikendra Residence",item:"Granite Flooring 2x2",qty:600,unit:"Sqft",requestedBy:"Niranjan",status:"Approved",matStatus:"Ordered",vendor:"Lucky Hardware",expectedDelivery:"17 Mar"},
  {id:"MR-06",date:"08 Mar",project:"Shubham & NK 623",item:"OPC Cement 50kg",qty:100,unit:"Bags",requestedBy:"Vijay Sahu",status:"Approved",matStatus:"Ordered",vendor:"Ganesh Cement House",expectedDelivery:"20 Mar"},
  {id:"MR-05",date:"07 Mar",project:"Bablu Farmhouse",item:"Ceramic Floor Tiles 2x2",qty:800,unit:"Sqft",requestedBy:"Vijay Sahu",status:"Approved",matStatus:"Received"},
  {id:"MR-04",date:"05 Mar",project:"Tikendra Residence",item:"Binding Wire",qty:50,unit:"Kg",requestedBy:"Niranjan",status:"Approved",matStatus:"Received"},
  {id:"MR-03",date:"03 Mar",project:"Esther Risali",item:"TMT Steel Fe500 10mm",qty:5,unit:"MT",requestedBy:"Harsh Sahu",status:"Approved",matStatus:"Received"},
  {id:"MR-02",date:"01 Mar",project:"Shubham & NK 623",item:"Coarse Aggregate 20mm",qty:20,unit:"Loads",requestedBy:"Vijay Sahu",status:"Approved",matStatus:"Received"},
  {id:"MR-01",date:"28 Feb",project:"Neha Sagar Office",item:"Ceramic Wall Tiles",qty:400,unit:"Sqft",requestedBy:"Priyanka",status:"Approved",matStatus:"Received"},
];

const PO_DATA=[
  {id:"PO-024",date:"12 Mar",vendor:"Abhay Traders",project:"Esther Risali",deliverySite:"Esther Site",poStatus:"Open",approval:"Approved",amount:182500,items:[{desc:"AAC Blocks 600x200x150",qty:5000,unit:"Nos",rate:36.5,amount:182500,hsn:"68053"}],linkedMR:"MR-05",delivery:"16 Mar"},
  {id:"PO-023",date:"10 Mar",vendor:"Rajesh Steel Mart",project:"Shubham & NK 623",deliverySite:"Shubham Site",poStatus:"Open",approval:"Approved",amount:315000,items:[{desc:"TMT Steel Fe500 10mm",qty:5,unit:"MT",rate:63000,amount:315000,hsn:"72142"}],linkedMR:"MR-07",delivery:"17 Mar"},
  {id:"PO-022",date:"08 Mar",vendor:"Shyam Ji Materials",project:"Shubham & NK 623",deliverySite:"Shubham Site",poStatus:"Open",approval:"Approved",amount:52500,items:[{desc:"River Sand",qty:15,unit:"Loads",rate:3500,amount:52500,hsn:"25051"}],linkedMR:"MR-06",delivery:"18 Mar"},
  {id:"PO-021",date:"05 Mar",vendor:"Ganesh Cement House",project:"Shubham & NK 623",deliverySite:"Shubham Site",poStatus:"Open",approval:"Draft",amount:38000,items:[{desc:"OPC Cement 50kg",qty:100,unit:"Bags",rate:380,amount:38000,hsn:"25232"}],linkedMR:"MR-01",delivery:"20 Mar"},
  {id:"PO-020",date:"28 Feb",vendor:"Lucky Hardware",project:"Bablu Farmhouse",deliverySite:"Farmhouse",poStatus:"Closed",approval:"Approved",amount:67200,items:[{desc:"Ceramic Tiles 2x2",qty:800,unit:"Sqft",rate:84,amount:67200,hsn:"69072"}],linkedMR:"MR-03",delivery:"07 Mar"},
  {id:"PO-019",date:"22 Feb",vendor:"Vaibhav Traders",project:"Tikendra Residence",deliverySite:"Tikendra Site",poStatus:"Closed",approval:"Approved",amount:4000,items:[{desc:"Binding Wire",qty:50,unit:"Kg",rate:80,amount:4000,hsn:"72172"}],linkedMR:"MR-02",delivery:"05 Mar"},
];

const RFQ_DATA=[
  {id:"RFQ-012",date:"13 Mar",project:"Amarendra Villa",status:"Published",bidStart:"13 Mar",bidEnd:"17 Mar",
   items:[{desc:"Cement OPC 50kg",hsn:"25232",qty:200,unit:"Bags",deliveryDate:"22 Mar"},{desc:"Fine Sand",hsn:"25051",qty:10,unit:"Loads",deliveryDate:"22 Mar"}],
   vendors:[
     {name:"Abhay Traders",status:"Submitted",rates:[{rate:385,remarks:"Stock ready"},{rate:3600,remarks:""}]},
     {name:"Ganesh Cement House",status:"Submitted",rates:[{rate:378,remarks:"Best price"},{rate:3750,remarks:"Premium quality"}]},
     {name:"Vaibhav Traders",status:"Pending",rates:[{rate:null,remarks:""},{rate:null,remarks:""}]},
   ],locked:null},
  {id:"RFQ-011",date:"10 Mar",project:"Tikendra Residence",status:"Published",bidStart:"10 Mar",bidEnd:"14 Mar",
   items:[{desc:"TMT Steel Fe500 12mm",hsn:"72142",qty:3,unit:"MT",deliveryDate:"19 Mar"}],
   vendors:[
     {name:"Rajesh Steel Mart",status:"Submitted",rates:[{rate:62500,remarks:"Ex-warehouse"}]},
     {name:"Abhay Traders",status:"Submitted",rates:[{rate:64000,remarks:""}]},
     {name:"Shyam Ji Materials",status:"Submitted",rates:[{rate:61800,remarks:"Mill rate"}]},
   ],locked:"Shyam Ji Materials"},
  {id:"RFQ-010",date:"05 Mar",project:"Shubham & NK 623",status:"Draft",bidStart:"",bidEnd:"",
   items:[{desc:"River Sand",hsn:"25051",qty:15,unit:"Loads",deliveryDate:"18 Mar"}],
   vendors:[],locked:null},
];

const GRN_DATA=[
  {id:"GRN-018",poId:"PO-020",date:"07 Mar",vendor:"Lucky Hardware",project:"Bablu Farmhouse",item:"Ceramic Tiles 2x2",qty:800,unit:"Sqft",receivedBy:"Vijay Sahu",quality:"Good",remark:""},
  {id:"GRN-017",poId:"PO-019",date:"05 Mar",vendor:"Vaibhav Traders",project:"Tikendra Residence",item:"Binding Wire",qty:50,unit:"Kg",receivedBy:"Niranjan",quality:"Good",remark:""},
];

// ── SHARED MINI COMPONENTS ────────────────────────────────────────────
const Pill=({label,c,bg,brd})=>(
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${brd||c+"33"}`,whiteSpace:"nowrap"}}>{label}</span>
);
const StatTile=({label,value,sub,color})=>(
  <div style={{padding:"13px 15px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,borderTop:`3px solid ${color}`,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
    <div style={{fontSize:10,color:T.t3,fontWeight:600,letterSpacing:".5px",textTransform:"uppercase",marginBottom:5}}>{label}</div>
    <div style={{fontSize:22,fontWeight:700,color:T.t1,letterSpacing:"-.5px",lineHeight:1}}>{value}</div>
    <div style={{fontSize:11,color:T.t4,marginTop:4}}>{sub}</div>
  </div>
);

// ── STATUS META ───────────────────────────────────────────────────────
const PO_STATUS={Open:{c:T.blu,bg:T.bluL,brd:T.bluM},Closed:{c:T.grn,bg:T.grnL,brd:T.grnM}};
const APPR_STATUS={Approved:{c:T.grn,bg:T.grnL,brd:T.grnM},Draft:{c:T.amb,bg:T.ambL,brd:T.ambM}};
const RFQ_STATUS={Published:{c:T.blu,bg:T.bluL,brd:T.bluM},Draft:{c:T.slt,bg:T.sltL,brd:T.b2}};
const MAT_STATUS={
  Pending:{c:T.slt,bg:T.sltL,brd:T.b2},
  Ordered:{c:T.blu,bg:T.bluL,brd:T.bluM},
  Received:{c:T.grn,bg:T.grnL,brd:T.grnM},
};

// ── MR MANUAL ORDER MODAL ─────────────────────────────────────────────
function ManualOrderModal({mr,onSave,onClose}){
  const [vendor,setVendor]=useState(mr.vendor||"");
  const [delivery,setDelivery]=useState(mr.expectedDelivery||"");
  const [custom,setCustom]=useState("");
  const vendorOptions=[...VENDORS,"Other (type below)"];
  const finalVendor=vendor==="Other (type below)"?custom:vendor;
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.22)",zIndex:301,width:420,fontFamily:"'Segoe UI',sans-serif",overflow:"hidden"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Mark as Ordered</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>{mr.id} · {mr.item}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{padding:"16px 18px"}}>
        <div style={{background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,padding:"9px 12px",marginBottom:14,display:"flex",gap:8,alignItems:"flex-start"}}>
          <IcMR size={14} color={T.amb} style={{flexShrink:0,marginTop:1}}/>
          <div style={{fontSize:11.5,color:T.amb}}><strong>No PO created.</strong> You are manually marking this material as ordered. Enter vendor details below.</div>
        </div>
        <div style={{marginBottom:13}}>
          <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Select Vendor</label>
          <select value={vendor} onChange={e=>setVendor(e.target.value)}
            style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
            <option value="">-- Select vendor --</option>
            {vendorOptions.map(v=><option key={v}>{v}</option>)}
          </select>
        </div>
        {vendor==="Other (type below)"&&(
          <div style={{marginBottom:13}}>
            <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Vendor Name</label>
            <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Enter vendor name..."
              style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
        )}
        <div style={{marginBottom:16}}>
          <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Expected Delivery Date</label>
          <input type="date" value={delivery} onChange={e=>setDelivery(e.target.value)}
            style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>onSave(mr.id,finalVendor,delivery)} disabled={!finalVendor||!delivery}
            style={{flex:2,padding:"9px",borderRadius:7,background:finalVendor&&delivery?T.blu:T.b1,color:finalVendor&&delivery?"white":T.t4,fontSize:12.5,fontWeight:700,border:"none",cursor:finalVendor&&delivery?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <IcTruck size={14} color="currentColor"/> Mark as Ordered
          </button>
        </div>
      </div>
    </div>
  </>);
}

// ── SHARE MODAL ───────────────────────────────────────────────────────
function ShareModal({rfq,onClose}){
  const [copied,setCopied]=useState(null);
  const fakeLink=`https://gbuildcon.in/rfq/${rfq.id}?token=xK9mP`;
  const copyLink=(v)=>{setCopied(v);setTimeout(()=>setCopied(null),2000);};
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.22)",zIndex:301,width:440,fontFamily:"'Segoe UI',sans-serif",overflow:"hidden"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Share Vendor Link</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>{rfq.id} · {rfq.project}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{padding:"16px 18px"}}>
        <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,padding:"9px 12px",marginBottom:14,fontSize:11.5,color:T.blu}}>
          Each vendor gets a unique link to fill their rates directly. No login required.
        </div>
        {rfq.vendors.length===0&&<div style={{fontSize:12,color:T.t4,marginBottom:12,textAlign:"center",padding:"20px"}}>No vendors added to this RFQ yet.</div>}
        {rfq.vendors.map((v,i)=>(
          <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,marginBottom:8,padding:"10px 12px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{v.name}</span>
              <Pill label={v.status} c={v.status==="Submitted"?T.grn:T.amb} bg={v.status==="Submitted"?T.grnL:T.ambL} brd={v.status==="Submitted"?T.grnM:T.ambM}/>
            </div>
            <div style={{fontSize:10.5,color:T.t4,background:T.surface,borderRadius:5,padding:"6px 9px",fontFamily:"monospace",marginBottom:8,wordBreak:"break-all"}}>{fakeLink}&vendor={i+1}</div>
            <div style={{display:"flex",gap:6}}>
              {[
                {Icon:IcWA,label:"WhatsApp",c:"#25D366",bg:"#E8FDF1"},
                {Icon:IcMail,label:"Email",c:T.blu,bg:T.bluL},
                {Icon:IcSMS,label:"SMS",c:T.pur,bg:T.purL},
                {Icon:IcCopy,label:copied===i?"Copied!":"Copy Link",c:T.slt,bg:T.sltL},
              ].map((btn,j)=>(
                <button key={j} onClick={()=>copyLink(i)}
                  style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,background:btn.bg,border:`1px solid ${btn.c}22`,color:btn.c,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                  <btn.Icon size={12} color="currentColor"/> {btn.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button onClick={onClose} style={{width:"100%",marginTop:4,padding:"9px",borderRadius:7,background:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer"}}>Done</button>
      </div>
    </div>
  </>);
}

// ── PUNCH QUOTATION MODAL ─────────────────────────────────────────────
function PunchQuoteModal({rfq,vendorIndex,onSave,onClose}){
  const vendor=rfq.vendors[vendorIndex];
  const [rates,setRates]=useState(rfq.items.map((_,i)=>({rate:vendor?.rates[i]?.rate||"",remark:vendor?.rates[i]?.remarks||""})));
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.22)",zIndex:301,width:480,fontFamily:"'Segoe UI',sans-serif",overflow:"hidden",maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Punch Quotation</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>Filling on behalf of: <strong style={{color:"white"}}>{vendor?.name}</strong></div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        <div style={{background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,padding:"8px 12px",marginBottom:12,fontSize:11.5,color:T.amb}}>Admin is entering rates on vendor's behalf.</div>
        {rfq.items.map((item,i)=>(
          <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:10}}>
            <div style={{fontSize:12.5,fontWeight:600,color:T.t1,marginBottom:2}}>{item.desc}</div>
            <div style={{fontSize:10.5,color:T.t4,marginBottom:10}}>HSN: {item.hsn} · {item.qty} {item.unit} · Delivery: {item.deliveryDate}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Rate per {item.unit} (₹)</label>
                <input type="number" value={rates[i].rate} onChange={e=>{const r=[...rates];r[i]={...r[i],rate:e.target.value};setRates(r);}}
                  placeholder="Enter rate..."
                  style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                {rates[i].rate&&<div style={{fontSize:10.5,color:T.grn,marginTop:3}}>Total: ₹{fmtN(Number(rates[i].rate)*item.qty)}</div>}
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Remarks</label>
                <input value={rates[i].remark} onChange={e=>{const r=[...rates];r[i]={...r[i],remark:e.target.value};setRates(r);}} placeholder="Optional..."
                  style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>onSave(vendorIndex,rates)} style={{flex:2,padding:"9px",borderRadius:7,background:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <IcChk size={14} color="white"/> Save Quotation
        </button>
      </div>
    </div>
  </>);
}

// ── PO DETAIL DRAWER ──────────────────────────────────────────────────
function PODetailDrawer({po,onClose,onApprove,onShare}){
  const apSm=APPR_STATUS[po.approval];const poSm=PO_STATUS[po.poStatus];
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:480,background:T.bg,zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{background:"#0D1B2A",padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontSize:15,fontWeight:700,color:"white"}}>{po.id}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
        </div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{po.vendor} · {po.project} · {po.date}</div>
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <Pill label={po.poStatus} c={poSm.c} bg={poSm.bg} brd={poSm.brd}/>
          <Pill label={po.approval} c={apSm.c} bg={apSm.bg} brd={apSm.brd}/>
          <span style={{background:"rgba(255,255,255,0.1)",color:"white",fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20}}>₹{fmtN(po.amount)}</span>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
        {/* Details */}
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>Purchase Order Details</div>
          {[["Vendor",po.vendor],["Delivery Site",po.deliverySite],["Delivery Date",po.delivery],["Linked MR",po.linkedMR],["PO Date",po.date]].map(([k,v])=>(
            <div key={k} style={{display:"flex",padding:"6px 0",borderBottom:`1px solid ${T.b1}`}}>
              <span style={{width:130,fontSize:11.5,color:T.t4,flexShrink:0}}>{k}</span>
              <span style={{fontSize:12,fontWeight:500,color:T.t1}}>{v}</span>
            </div>
          ))}
        </div>
        {/* Items */}
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:10}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
            <span style={{fontSize:11,fontWeight:700,color:T.t1}}>Items</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 50px 60px 70px 100px",padding:"6px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
            {["Description","Qty","Unit","Rate","Amount"].map((h,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
          </div>
          {po.items.map((it,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 50px 60px 70px 100px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center"}}>
              <div><div style={{fontSize:12.5,color:T.t1}}>{it.desc}</div><div style={{fontSize:10,color:T.t4}}>HSN: {it.hsn}</div></div>
              <span style={{fontSize:12,color:T.t2}}>{it.qty}</span>
              <span style={{fontSize:12,color:T.t3}}>{it.unit}</span>
              <span style={{fontSize:12,color:T.t2}}>₹{fmtN(it.rate)}</span>
              <span style={{fontSize:13,fontWeight:600,color:T.t1}}>₹{fmtN(it.amount)}</span>
            </div>
          ))}
          <div style={{display:"grid",gridTemplateColumns:"1fr 50px 60px 70px 100px",padding:"8px 14px",background:T.surfaceB,borderTop:`2px solid ${T.b2}`}}>
            <span style={{fontSize:12,fontWeight:700,color:T.t1}}>Total</span><span/><span/><span/>
            <span style={{fontSize:14,fontWeight:700,color:T.blu}}>₹{fmtN(po.amount)}</span>
          </div>
        </div>
      </div>
      {/* Footer */}
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:7,flexShrink:0}}>
        {po.approval==="Draft"&&<button onClick={()=>onApprove(po.id)} style={{flex:1,padding:"8px",borderRadius:7,background:T.grnL,color:T.grn,border:`1px solid ${T.grnM}`,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><IcApprv size={13} color={T.grn}/> Approve PO</button>}
        <button onClick={()=>onShare(po)} style={{flex:1,padding:"8px",borderRadius:7,background:T.bluL,color:T.blu,border:`1px solid ${T.bluM}`,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><IcShare size={13} color={T.blu}/> Share PO</button>
        <button style={{flex:1,padding:"8px",borderRadius:7,background:T.surfaceB,color:T.t3,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,cursor:"pointer"}}>Print / PDF</button>
      </div>
    </div>
  </>);
}

// ── RFQ DETAIL DRAWER ─────────────────────────────────────────────────
function RFQDetailDrawer({rfq,onClose,onPunch,onLock,onPublish}){
  // Find min/max rates per item index
  const getMinMax=(itemIdx)=>{
    const submitted=rfq.vendors.filter(v=>v.status==="Submitted"&&v.rates[itemIdx]?.rate!=null);
    if(submitted.length===0) return {min:null,max:null};
    const rates=submitted.map(v=>v.rates[itemIdx].rate);
    return {min:Math.min(...rates),max:Math.max(...rates)};
  };
  const totalByVendor=(v)=>rfq.items.reduce((s,item,i)=>s+(v.rates[i]?.rate||0)*item.qty,0);
  const allTotals=rfq.vendors.filter(v=>v.status==="Submitted").map(v=>totalByVendor(v));
  const minTotal=Math.min(...allTotals);
  const maxTotal=Math.max(...allTotals);

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:680,background:T.bg,zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontSize:15,fontWeight:700,color:"white"}}>{rfq.id} · {rfq.project}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Pill label={rfq.status} c={RFQ_STATUS[rfq.status].c} bg={RFQ_STATUS[rfq.status].bg} brd={RFQ_STATUS[rfq.status].brd}/>
          {rfq.bidEnd&&<span style={{fontSize:10.5,color:"rgba(255,255,255,0.5)"}}>Bidding: {rfq.bidStart} → {rfq.bidEnd}</span>}
          {rfq.locked&&<span style={{background:"rgba(5,150,105,0.25)",color:"#6EE7B7",fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20}}>Locked: {rfq.locked}</span>}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
        {/* Items */}
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}><span style={{fontSize:11,fontWeight:700,color:T.t1}}>Items Requested</span></div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 80px 60px 70px 110px",padding:"6px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
            {["Description","HSN","Qty","Unit","Delivery"].map((h,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
          </div>
          {rfq.items.map((it,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 80px 60px 70px 110px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center"}}>
              <span style={{fontSize:12.5,color:T.t1}}>{it.desc}</span>
              <span style={{fontSize:11,color:T.t4,fontFamily:"monospace"}}>{it.hsn}</span>
              <span style={{fontSize:12,color:T.t2,fontWeight:600}}>{it.qty}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{it.unit}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{it.deliveryDate}</span>
            </div>
          ))}
        </div>

        {/* Vendor Rate Comparison */}
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,fontWeight:700,color:T.t1}}>Vendor Rate Comparison</span>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.grn}}><span style={{width:8,height:8,borderRadius:2,background:T.grn,display:"inline-block"}}/>Cheapest</span>
              <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.red}}><span style={{width:8,height:8,borderRadius:2,background:T.red,display:"inline-block"}}/>Expensive</span>
            </div>
          </div>
          {/* Header row */}
          <div style={{display:"grid",gridTemplateColumns:`140px repeat(${rfq.items.length},1fr) 100px`,padding:"6px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
            <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>Vendor</span>
            {rfq.items.map((it,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.desc.split(" ").slice(0,2).join(" ")}</span>)}
            <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:"right"}}>Total</span>
          </div>
          {rfq.vendors.map((v,vi)=>{
            const vTotal=totalByVendor(v);
            const isBestTotal=v.status==="Submitted"&&vTotal===minTotal&&allTotals.length>0;
            const isWorstTotal=v.status==="Submitted"&&vTotal===maxTotal&&allTotals.length>1;
            const isLocked=rfq.locked===v.name;
            return(
              <div key={vi} style={{display:"grid",gridTemplateColumns:`140px repeat(${rfq.items.length},1fr) 100px`,padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:isLocked?"rgba(5,150,105,0.06)":"none",borderLeft:isLocked?`3px solid ${T.grn}`:"3px solid transparent"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:isLocked?T.grn:T.t1}}>{v.name}{isLocked&&<span style={{background:T.grn,color:"white",fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:3,marginLeft:5}}>LOCKED</span>}</div>
                  <Pill label={v.status} c={v.status==="Submitted"?T.grn:T.amb} bg={v.status==="Submitted"?T.grnL:T.ambL} brd={v.status==="Submitted"?T.grnM:T.ambM}/>
                </div>
                {rfq.items.map((item,ii)=>{
                  const {min,max}=getMinMax(ii);
                  const rate=v.rates[ii]?.rate;
                  const remark=v.rates[ii]?.remarks;
                  const isCheap=rate!=null&&rate===min&&min!==max;
                  const isExp=rate!=null&&rate===max&&min!==max;
                  return(
                    <div key={ii} style={{padding:"2px 4px"}}>
                      {rate!=null
                        ?<div style={{fontSize:13,fontWeight:700,color:isCheap?T.grn:isExp?T.red:T.t1,background:isCheap?T.grnL:isExp?T.redL:"none",borderRadius:5,padding:"2px 6px",display:"inline-block"}}>₹{fmtN(rate)}</div>
                        :<span style={{fontSize:11,color:T.t4}}>—</span>}
                      {remark&&<div style={{fontSize:9.5,color:T.t4,marginTop:1}}>{remark}</div>}
                    </div>
                  );
                })}
                <div style={{textAlign:"right"}}>
                  {v.status==="Submitted"
                    ?<span style={{fontSize:13,fontWeight:700,color:isBestTotal?T.grn:isWorstTotal?T.red:T.t1,background:isBestTotal?T.grnL:isWorstTotal?T.redL:"none",padding:"2px 7px",borderRadius:5,display:"inline-block"}}>₹{fmtN(vTotal)}</span>
                    :<span style={{fontSize:11,color:T.t4}}>Pending</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Vendor Actions */}
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}><span style={{fontSize:11,fontWeight:700,color:T.t1}}>Vendor Actions</span></div>
          {rfq.vendors.map((v,vi)=>(
            <div key={vi} style={{padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:10}}>
              <span style={{flex:1,fontSize:12.5,fontWeight:500,color:T.t1}}>{v.name}</span>
              <button onClick={()=>onPunch(vi)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.purL,border:`1px solid ${T.purM}`,color:T.pur,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcPen size={12} color={T.pur}/> Punch Quote</button>
              {!rfq.locked&&v.status==="Submitted"&&<button onClick={()=>onLock(v.name)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcLock size={12} color={T.grn}/> Lock Best Quote</button>}
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:7,flexShrink:0}}>
        {rfq.status==="Draft"&&<button onClick={()=>onPublish(rfq.id)} style={{flex:1,padding:"8px",borderRadius:7,background:T.bluL,color:T.blu,border:`1px solid ${T.bluM}`,fontSize:12,fontWeight:600,cursor:"pointer"}}>Publish RFQ</button>}
        {rfq.locked&&<button style={{flex:1,padding:"8px",borderRadius:7,background:`linear-gradient(135deg,${T.grn},#047857)`,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><IcPO size={13} color="white"/> Create PO from Locked Quote</button>}
        <button style={{flex:1,padding:"8px",borderRadius:7,background:T.surfaceB,color:T.t3,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,cursor:"pointer"}}>Close</button>
      </div>
    </div>
  </>);
}

// ── PROCUREMENT FLOW DRAWER ───────────────────────────────────────────
function FlowDrawer({onClose}){
  const steps=[
    {n:1,action:"Material Request approved from site",who:"Site Team",icon:IcMR,c:T.blu},
    {n:2,action:"Create RFQ — vendors ko link bhejo",who:"Procurement",icon:IcRFQ,c:T.pur},
    {n:3,action:"Vendors fill rates via unique link",who:"Vendors",icon:IcWA,c:"#25D366"},
    {n:4,action:"Best rate select → Lock → PO create",who:"Procurement",icon:IcLock,c:T.grn},
    {n:5,action:"PO Approve",who:"Admin",icon:IcApprv,c:T.grn},
    {n:6,action:"PO share karo (WhatsApp / Email)",who:"Procurement",icon:IcShare,c:T.blu},
    {n:7,action:"Material delivered → GRN entry",who:"Site Team",icon:IcGRN,c:T.amb},
    {n:8,action:"Material status auto = ORDERED",who:"System",icon:IcTruck,c:T.slt},
    {n:9,action:"Stock update at delivery site",who:"System",icon:IcWH,c:T.slt},
    {n:10,action:"Vendor bill → Unbilled → confirm → enter rate",who:"Accountant",icon:IcPO,c:T.amb},
    {n:11,action:"Payment → Cash Book entry",who:"Admin",icon:IcFin,c:T.grn},
  ];
  const altPath={n:"Alt",action:"Material ordered without PO → Manual status update → Enter vendor + delivery date",who:"Procurement",icon:IcEdit,c:T.red,alt:true};
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:420,background:T.bg,zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div><div style={{fontSize:14,fontWeight:700,color:"white"}}>Procurement Flow</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.45)",marginTop:2}}>End-to-end process</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
        {steps.map((s,i)=>(
          <div key={s.n} style={{display:"flex",gap:12,marginBottom:8}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:s.c+"18",border:`2px solid ${s.c}44`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <s.icon size={15} color={s.c}/>
              </div>
              {i<steps.length-1&&<div style={{width:2,flex:1,background:T.b2,margin:"4px 0",minHeight:16}}/>}
            </div>
            <div style={{paddingTop:5,paddingBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                <span style={{fontSize:9.5,fontWeight:700,color:"white",background:s.c,width:18,height:18,borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{s.n}</span>
                <span style={{fontSize:12.5,fontWeight:500,color:T.t1}}>{s.action}</span>
              </div>
              <span style={{fontSize:10.5,color:T.t4,marginLeft:25}}>→ {s.who}</span>
            </div>
          </div>
        ))}
        {/* Alt path */}
        <div style={{marginTop:4,padding:"12px 14px",background:T.redL,borderRadius:8,border:`1px solid ${T.redM}`,borderLeft:`3px solid ${T.red}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
            <span style={{fontSize:9.5,fontWeight:700,color:"white",background:T.red,padding:"1px 7px",borderRadius:10}}>ALT</span>
            <span style={{fontSize:12,fontWeight:600,color:T.red}}>Manual Order (No PO)</span>
          </div>
          <div style={{fontSize:11.5,color:T.red,lineHeight:1.5}}>{altPath.action}</div>
          <div style={{fontSize:10.5,color:T.red,opacity:0.7,marginTop:3}}>→ Procurement Team</div>
        </div>
      </div>
    </div>
  </>);
}

// ── GRN MODAL ─────────────────────────────────────────────────────────
function GRNModal({po,onClose,onSave}){
  const [received,setReceived]=useState(po.items.map(it=>({qty:it.qty,quality:"Good",remark:""})));
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.22)",zIndex:301,width:500,fontFamily:"'Segoe UI',sans-serif",overflow:"hidden",maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div><div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Goods Receipt Note (GRN)</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>{po.id} · {po.vendor}</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        {po.items.map((it,i)=>(
          <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:10}}>
            <div style={{fontSize:12.5,fontWeight:600,color:T.t1,marginBottom:10}}>{it.desc} <span style={{fontSize:11,color:T.t4}}>({it.qty} {it.unit} ordered)</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Qty Received</label>
                <input type="number" value={received[i].qty} onChange={e=>{const r=[...received];r[i]={...r[i],qty:e.target.value};setReceived(r);}}
                  style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Quality</label>
                <select value={received[i].quality} onChange={e=>{const r=[...received];r[i]={...r[i],quality:e.target.value};setReceived(r);}}
                  style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
                  <option>Good</option><option>Partial</option><option>Rejected</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Remark</label>
                <input value={received[i].remark} onChange={e=>{const r=[...received];r[i]={...r[i],remark:e.target.value};setReceived(r);}}
                  placeholder="Optional..." style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>onSave(po.id)} style={{flex:2,padding:"9px",borderRadius:7,background:T.grn,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <IcGRN size={14} color="white"/> Confirm GRN
        </button>
      </div>
    </div>
  </>);
}


// ── CREATE PO MODAL (Direct, without RFQ) ────────────────────────────
function CreatePOModal({onClose,onSave}){
  const [form,setForm]=useState({
    vendor:"",project:PROJECTS[0],deliverySite:"",delivery:"",notes:"",
    items:[{desc:"",hsn:"",qty:"",unit:"Bags",rate:""}],
  });
  const upd=(k,v)=>setForm(p=>({...p,[k]:v}));
  const updItem=(i,k,v)=>{const its=[...form.items];its[i]={...its[i],[k]:v};setForm(p=>({...p,items:its}));};
  const addItem=()=>setForm(p=>({...p,items:[...p.items,{desc:"",hsn:"",qty:"",unit:"Bags",rate:""}]}));
  const removeItem=(i)=>{if(form.items.length===1)return;const its=[...form.items];its.splice(i,1);setForm(p=>({...p,items:its}));};
  const total=form.items.reduce((s,it)=>s+(Number(it.qty)||0)*(Number(it.rate)||0),0);
  const UNITS=["Bags","MT","Nos","Loads","Sqft","Mtrs","Kg","Sheets","Ltrs","Cu.m"];
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.38)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 24px 64px rgba(0,0,0,0.22)",zIndex:301,width:600,fontFamily:"'Segoe UI',sans-serif",overflow:"hidden",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>Create Purchase Order</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.45)",marginTop:2}}>Direct PO — no RFQ required</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
        {/* Vendor + Project row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Vendor Name *</label>
            <select value={form.vendor} onChange={e=>upd("vendor",e.target.value)}
              style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${form.vendor?T.blu:T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
              <option value="">Select vendor...</option>
              {VENDORS.map(v=><option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Project *</label>
            <select value={form.project} onChange={e=>upd("project",e.target.value)}
              style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
              {PROJECTS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div>
            <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Delivery Site</label>
            <input value={form.deliverySite} onChange={e=>upd("deliverySite",e.target.value)} placeholder="e.g. Shubham Site"
              style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          <div>
            <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Expected Delivery</label>
            <input type="date" value={form.delivery} onChange={e=>upd("delivery",e.target.value)}
              style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
        </div>

        {/* Items table */}
        <div style={{marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <label style={{fontSize:10.5,fontWeight:700,color:T.t2,textTransform:"uppercase",letterSpacing:"0.5px"}}>Items</label>
          <button onClick={addItem} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>
            <IcAdd size={12} color={T.blu}/> Add Item
          </button>
        </div>
        {/* Header */}
        <div style={{display:"grid",gridTemplateColumns:"2.2fr 70px 70px 70px 80px 28px",gap:6,marginBottom:6}}>
          {["Description","HSN","Qty","Unit","Rate (₹)",""].map((h,i)=>(
            <span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px"}}>{h}</span>
          ))}
        </div>
        {form.items.map((it,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"2.2fr 70px 70px 70px 80px 28px",gap:6,marginBottom:7,alignItems:"center"}}>
            <input value={it.desc} onChange={e=>updItem(i,"desc",e.target.value)} placeholder="Material name..."
              style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
              onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            <input value={it.hsn} onChange={e=>updItem(i,"hsn",e.target.value)} placeholder="HSN"
              style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            <input type="number" value={it.qty} onChange={e=>updItem(i,"qty",e.target.value)} placeholder="Qty"
              style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            <select value={it.unit} onChange={e=>updItem(i,"unit",e.target.value)}
              style={{padding:"7px 6px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
              {UNITS.map(u=><option key={u}>{u}</option>)}
            </select>
            <input type="number" value={it.rate} onChange={e=>updItem(i,"rate",e.target.value)} placeholder="Rate"
              style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            <button onClick={()=>removeItem(i)} style={{width:26,height:26,borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <IcX size={12} color={T.red}/>
            </button>
          </div>
        ))}
        {/* Total */}
        {total>0&&(
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:8,padding:"8px 10px",background:T.bluL,borderRadius:7,border:`1px solid ${T.bluM}`}}>
            <span style={{fontSize:12,fontWeight:600,color:T.t3,marginRight:12}}>PO Total</span>
            <span style={{fontSize:15,fontWeight:700,color:T.blu}}>₹{total.toLocaleString("en-IN")}</span>
          </div>
        )}
        <div style={{marginTop:12}}>
          <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Notes (Optional)</label>
          <textarea value={form.notes} onChange={e=>upd("notes",e.target.value)} placeholder="Special instructions, terms..." rows={2}
            style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
        </div>
      </div>
      <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>{
          if(!form.vendor||!form.project) return;
          const newPO={
            id:`PO-${String(Math.floor(Math.random()*900)+100)}`,
            date:"14 Mar",vendor:form.vendor,project:form.project,
            deliverySite:form.deliverySite||form.project,poStatus:"Open",approval:"Draft",
            amount:total,
            items:form.items.filter(it=>it.desc).map(it=>({desc:it.desc,hsn:it.hsn||"—",qty:Number(it.qty)||0,unit:it.unit,rate:Number(it.rate)||0,amount:(Number(it.qty)||0)*(Number(it.rate)||0)})),
            linkedMR:"—",delivery:form.delivery||"TBD",
          };
          onSave(newPO);
        }} disabled={!form.vendor||!form.project||total===0}
          style={{flex:2,padding:"9px",borderRadius:7,background:form.vendor&&form.project&&total>0?T.blu:T.b1,color:form.vendor&&form.project&&total>0?"white":T.t4,fontSize:12.5,fontWeight:700,border:"none",cursor:form.vendor&&form.project&&total>0?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <IcPO size={14} color="currentColor"/> Create PO (Draft)
        </button>
      </div>
    </div>
  </>);
}

// ── PROCUREMENT MODULE ────────────────────────────────────────────────
function ProcurementModule(){
  const [tab,setTab]=useState("po");
  const [pos,setPOs]=useState(PO_DATA);
  const [rfqs,setRFQs]=useState(RFQ_DATA);
  const [mrs,setMRs]=useState(MR_DATA);
  // PO tab
  const [poSearch,setPoSearch]=useState("");const [poStatus,setPoStatus]=useState("All");const [poApproval,setPoApproval]=useState("All");
  const [selPO,setSelPO]=useState(null);const [shareTarget,setShareTarget]=useState(null);const [grnTarget,setGrnTarget]=useState(null);
  // RFQ tab
  const [selRFQ,setSelRFQ]=useState(null);const [shareRFQ,setShareRFQ]=useState(null);const [punchTarget,setPunchTarget]=useState(null);const [punchVendorIdx,setPunchVendorIdx]=useState(null);
  // MR tab
  const [mrProject,setMrProject]=useState("All");const [mrStatus,setMrStatus]=useState("All");const [mrMaterial,setMrMaterial]=useState("All");const [manualOrderTarget,setManualOrderTarget]=useState(null);
  // Flow drawer
  const [showFlow,setShowFlow]=useState(false);
  const [viewMode,setViewMode]=useState('tile'); // 'tile' | 'list'
  const [showCreatePO,setShowCreatePO]=useState(false);

  const pendingMRs=mrs.filter(m=>m.status==="Approved"&&m.matStatus==="Pending").length;

  const filteredPOs=pos.filter(p=>{
    if(poSearch&&!p.id.toLowerCase().includes(poSearch.toLowerCase())&&!p.vendor.toLowerCase().includes(poSearch.toLowerCase())&&!p.project.toLowerCase().includes(poSearch.toLowerCase())) return false;
    if(poStatus!=="All"&&p.poStatus!==poStatus) return false;
    if(poApproval!=="All"&&p.approval!==poApproval) return false;
    return true;
  });
  const filteredMRs=mrs.filter(m=>{
    if(mrProject!=="All"&&m.project!==mrProject) return false;
    if(mrStatus!=="All"&&m.matStatus!==mrStatus) return false;
    return true;
  });

  const approvePO=(id)=>setPOs(prev=>prev.map(p=>p.id===id?{...p,approval:"Approved"}:p));
  const lockRFQ=(rfqId,vendorName)=>setRFQs(prev=>prev.map(r=>r.id===rfqId?{...r,locked:vendorName}:r));
  const publishRFQ=(rfqId)=>setRFQs(prev=>prev.map(r=>r.id===rfqId?{...r,status:"Published",bidStart:"14 Mar",bidEnd:"18 Mar"}:r));
  const savePunch=(rfqId,vendorIdx,rates)=>{
    setRFQs(prev=>prev.map(r=>{
      if(r.id!==rfqId) return r;
      const newVendors=[...r.vendors];
      newVendors[vendorIdx]={...newVendors[vendorIdx],status:"Submitted",rates:rates.map((rt,i)=>({rate:Number(rt.rate)||null,remarks:rt.remark}))};
      return {...r,vendors:newVendors};
    }));
    setPunchTarget(null);setPunchVendorIdx(null);
  };
  const saveManualOrder=(mrId,vendor,delivery)=>{
    setMRs(prev=>prev.map(m=>m.id===mrId?{...m,matStatus:"Ordered",vendor,expectedDelivery:delivery}:m));
    setManualOrderTarget(null);
  };

  const TILE_SETS={
    po:[
      {l:"Total POs",v:pos.length,sub:`${pos.filter(p=>p.poStatus==="Open").length} open`,c:T.blu},
      {l:"Draft (Pending Approval)",v:pos.filter(p=>p.approval==="Draft").length,sub:"Need your sign-off",c:T.amb},
      {l:"Total PO Value",v:`₹${fmt(pos.reduce((s,p)=>s+p.amount,0))}`,sub:"All orders combined",c:T.grn},
      {l:"Open MR Requests",v:pendingMRs,sub:"Awaiting procurement",c:T.red},
    ],
    rfq:[
      {l:"Active RFQs",v:rfqs.filter(r=>r.status==="Published").length,sub:"Live bidding",c:T.blu},
      {l:"Draft RFQs",v:rfqs.filter(r=>r.status==="Draft").length,sub:"Not published yet",c:T.slt},
      {l:"Locked Quotes",v:rfqs.filter(r=>r.locked).length,sub:"Ready for PO",c:T.grn},
      {l:"Pending Vendor Responses",v:rfqs.flatMap(r=>r.vendors).filter(v=>v.status==="Pending").length,sub:"Awaiting rates",c:T.amb},
    ],
    mr:[
      {l:"Total MRs",v:mrs.length,sub:"All material requests",c:T.blu},
      {l:"Pending Order",v:mrs.filter(m=>m.matStatus==="Pending"&&m.status==="Approved").length,sub:"Need to be ordered",c:T.amb},
      {l:"Ordered",v:mrs.filter(m=>m.matStatus==="Ordered").length,sub:"In transit",c:T.blu},
      {l:"Received",v:mrs.filter(m=>m.matStatus==="Received").length,sub:"Delivered",c:T.grn},
    ],
  };
  const curTiles=TILE_SETS[tab]||TILE_SETS.po;
  const TABS=[
    {id:"po",l:`Purchase Orders${pos.filter(p=>p.approval==="Draft").length>0?` · ${pos.filter(p=>p.approval==="Draft").length} Draft`:""}`},
    {id:"rfq",l:`RFQ${rfqs.filter(r=>r.status==="Published").length>0?` · ${rfqs.filter(r=>r.status==="Published").length} Active`:""}`},
    {id:"mr",l:`Material Requests${pendingMRs>0?` · ${pendingMRs} Pending`:""}`},
  ];

  return(
    <div style={{background:T.bg,height:"100%",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* Stat Tiles — clickable for MR tab */}
      <div style={{padding:"14px 18px 10px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {curTiles.map((s,i)=>{
            const mrFilterKeys=["All","Pending","Ordered","Received"];
            const isMR=tab==="mr";
            const isActive=isMR&&mrStatus===mrFilterKeys[i];
            return isMR?(
              <div key={i} onClick={()=>setMrStatus(mrFilterKeys[i])} style={{padding:"13px 15px",background:isActive?s.bg:T.surface,border:`1.5px solid ${isActive?s.c+"44":T.b1}`,borderRadius:8,borderTop:`3px solid ${s.c}`,boxShadow:isActive?`0 2px 10px ${s.c}22`:"0 1px 3px rgba(0,0,0,0.04)",cursor:"pointer",transition:"all 0.15s"}}>
                <div style={{fontSize:10,color:isActive?s.c:T.t3,fontWeight:600,letterSpacing:".5px",textTransform:"uppercase",marginBottom:5}}>{s.l}</div>
                <div style={{fontSize:22,fontWeight:700,color:isActive?s.c:T.t1,letterSpacing:"-.5px",lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:11,color:isActive?s.c:T.t4,marginTop:4,opacity:isActive?1:0.8}}>{s.sub}</div>
                {isActive&&<div style={{height:2,background:s.c,borderRadius:2,marginTop:8}}/>}
              </div>
            ):(
              <StatTile key={i} label={s.l} value={s.v} sub={s.sub} color={s.c}/>
            );
          })}
        </div>
      </div>

      {/* Dark Tab Bar */}
      <div style={{margin:"0 18px",flexShrink:0}}>
        <div style={{background:"#0D1B2A",borderRadius:10,padding:"0 10px",display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 10px rgba(0,0,0,0.2)"}}>
          <div style={{display:"flex",flex:1}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{padding:"11px 15px",border:"none",background:"none",fontSize:12.5,fontWeight:tab===t.id?600:400,color:tab===t.id?"white":"rgba(255,255,255,0.45)",cursor:"pointer",borderBottom:tab===t.id?"2px solid #2563EB":"2px solid transparent",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                {t.l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:6,padding:"6px 0",alignItems:"center"}}>
            {/* View toggle */}
            <div style={{display:"flex",background:"rgba(255,255,255,0.07)",borderRadius:6,border:"1px solid rgba(255,255,255,0.15)",overflow:"hidden"}}>
              <button onClick={()=>setViewMode('tile')} title="Tile / Card view"
                style={{display:"flex",alignItems:"center",padding:"5px 8px",border:"none",background:viewMode==='tile'?"rgba(37,99,235,0.55)":"none",cursor:"pointer",transition:"background 0.15s"}}>
                <IcGrid size={14} color={viewMode==='tile'?"white":"rgba(255,255,255,0.45)"}/>
              </button>
              <button onClick={()=>setViewMode('list')} title="List / Table view"
                style={{display:"flex",alignItems:"center",padding:"5px 8px",border:"none",background:viewMode==='list'?"rgba(37,99,235,0.55)":"none",cursor:"pointer",transition:"background 0.15s"}}>
                <IcListV size={14} color={viewMode==='list'?"white":"rgba(255,255,255,0.45)"}/>
              </button>
            </div>
            <button onClick={()=>setShowFlow(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.07)",fontSize:11.5,fontWeight:600,color:"rgba(255,255,255,0.8)",cursor:"pointer"}}>
              <IcFlow size={13} color="currentColor"/> Flow
            </button>
            {tab==="po"&&<button onClick={()=>setShowCreatePO(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}><IcAdd size={13} color="white"/> Create PO</button>}
            {tab==="rfq"&&<button style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}><IcAdd size={13} color="white"/> New RFQ</button>}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",padding:"12px 18px 14px"}}>

        {/* ── PO TAB ── */}
        {tab==="po"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            {/* Filter bar */}
            <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:8,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
              <div style={{position:"relative",flex:1,minWidth:160}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input value={poSearch} onChange={e=>setPoSearch(e.target.value)} placeholder="Search PO#, vendor, project..."
                  style={{width:"100%",height:31,padding:"0 8px 0 27px",borderRadius:6,border:`1.5px solid ${poSearch?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:poSearch?T.bluL:T.surface}}/>
              </div>
              {[{val:poStatus,set:setPoStatus,opts:["All","Open","Closed"],def:"PO Status"},{val:poApproval,set:setPoApproval,opts:["All","Draft","Approved"],def:"Approval"}].map(({val,set,opts,def},i)=>(
                <div key={i} style={{position:"relative"}}>
                  <select value={val} onChange={e=>set(e.target.value)} style={{height:31,padding:"0 22px 0 9px",borderRadius:6,border:`1.5px solid ${val!=="All"?T.blu:T.b1}`,background:val!=="All"?T.bluL:T.surface,fontSize:11.5,color:val!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:val!=="All"?600:400,minWidth:100,appearance:"none",WebkitAppearance:"none"}}>
                    {opts.map(o=><option key={o} value={o}>{o==="All"?`All ${def}`:o}</option>)}
                  </select>
                  <IcDown size={10} color={T.t4} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
                </div>
              ))}
              {pendingMRs>0&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 11px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`}}>
                <IcMR size={13} color={T.red}/><span style={{fontSize:11.5,fontWeight:600,color:T.red}}>{pendingMRs} pending MRs</span>
              </div>}
              <span style={{fontSize:11,color:T.t4}}>{filteredPOs.length} POs</span>
            </div>

            {/* ── LIST VIEW ── */}
            {viewMode==='list'&&(
              <div style={{flex:1,overflowY:"auto",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"90px 160px 1fr 140px 90px 100px 120px 80px",padding:"7px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,position:"sticky",top:0,zIndex:10}}>
                  {["PO#","Vendor","Project","Delivery Site","Status","Approval","Amount","Actions"].map((h,i)=>(
                    <span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px"}}>{h}</span>
                  ))}
                </div>
                {filteredPOs.map(po=>{
                  const ps=PO_STATUS[po.poStatus];const as=APPR_STATUS[po.approval];
                  return(
                    <div key={po.id} style={{display:"grid",gridTemplateColumns:"90px 160px 1fr 140px 90px 100px 120px 80px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",transition:"background 0.1s",cursor:"pointer",borderLeft:po.approval==="Draft"?`3px solid ${T.amb}`:"3px solid transparent"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                      onMouseLeave={e=>e.currentTarget.style.background="none"}>
                      <button onClick={()=>setSelPO(po)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,color:T.blu,textAlign:"left",padding:0}}>{po.id}</button>
                      <span style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{po.vendor}</span>
                      <span style={{fontSize:11.5,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{po.project}</span>
                      <span style={{fontSize:11.5,color:T.t3}}>{po.deliverySite}</span>
                      <Pill label={po.poStatus} c={ps.c} bg={ps.bg} brd={ps.brd}/>
                      <Pill label={po.approval} c={as.c} bg={as.bg} brd={as.brd}/>
                      <span style={{fontSize:13,fontWeight:600,color:T.t1}}>₹{fmtN(po.amount)}</span>
                      <div style={{display:"flex",gap:4}}>
                        {po.approval==="Draft"&&<button onClick={()=>approvePO(po.id)} title="Approve" style={{width:26,height:26,borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcChk size={13} color={T.grn}/></button>}
                        <button onClick={()=>setShareTarget(po)} title="Share" style={{width:26,height:26,borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcShare size={13} color={T.blu}/></button>
                        {po.poStatus==="Open"&&<button onClick={()=>setGrnTarget(po)} title="GRN" style={{width:26,height:26,borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcGRN size={13} color={T.amb}/></button>}
                      </div>
                    </div>
                  );
                })}
                {filteredPOs.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}><IcPO size={32} color={T.b2}/><div style={{marginTop:10,fontSize:13,color:T.t3}}>No POs match filters</div></div>}
              </div>
            )}

            {/* ── TILE VIEW ── */}
            {viewMode==='tile'&&(
              <div style={{flex:1,overflowY:"auto"}}>
                {filteredPOs.length===0&&<div style={{textAlign:"center",padding:"48px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,color:T.t4}}><IcPO size={32} color={T.b2}/><div style={{marginTop:10,fontSize:13,color:T.t3}}>No POs match filters</div></div>}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:10}}>
                  {filteredPOs.map(po=>{
                    const ps=PO_STATUS[po.poStatus]; const as=APPR_STATUS[po.approval];
                    const accentColor=po.approval==="Draft"?T.amb:po.poStatus==="Closed"?T.grn:T.blu;
                    return(
                      <div key={po.id} onClick={()=>setSelPO(po)} style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden",cursor:"pointer",transition:"box-shadow 0.15s",borderLeft:`4px solid ${accentColor}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}
                        onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.1)"}
                        onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)"}>
                        <div style={{padding:"11px 13px 9px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                            <span style={{fontSize:12,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{po.id}</span>
                            <Pill label={po.poStatus} c={ps.c} bg={ps.bg} brd={ps.brd}/>
                            <Pill label={po.approval} c={as.c} bg={as.bg} brd={as.brd}/>
                          </div>
                          <div style={{fontSize:13.5,fontWeight:600,color:T.t1,marginBottom:3}}>{po.vendor}</div>
                          <div style={{fontSize:11.5,color:T.t3,marginBottom:8}}>{po.project} · {po.deliverySite}</div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <div style={{fontSize:10,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",fontWeight:600}}>PO Value</div>
                              <div style={{fontSize:18,fontWeight:700,color:T.t1,letterSpacing:"-0.5px"}}>₹{fmtN(po.amount)}</div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:10,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",fontWeight:600}}>Delivery</div>
                              <div style={{fontSize:12.5,fontWeight:600,color:T.t2}}>{po.delivery}</div>
                            </div>
                          </div>
                        </div>
                        <div style={{padding:"7px 13px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:6}}>
                          {po.approval==="Draft"&&<button onClick={e=>{e.stopPropagation();approvePO(po.id);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcChk size={12} color={T.grn}/> Approve</button>}
                          <button onClick={e=>{e.stopPropagation();setShareTarget(po);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcShare size={12} color={T.blu}/> Share</button>
                          {po.poStatus==="Open"&&<button onClick={e=>{e.stopPropagation();setGrnTarget(po);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcGRN size={12} color={T.amb}/> GRN</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── RFQ TAB ── */}
        {tab==="rfq"&&(
          <div style={{flex:1,overflowY:"auto"}}>
            {/* ── LIST VIEW ── */}
            {viewMode==='list'&&(
              <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"90px 160px 1fr 90px 100px 80px 80px 100px",padding:"7px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,position:"sticky",top:0,zIndex:10}}>
                  {["RFQ#","Project","Items","Status","Bid End","Vendors","Submitted","Actions"].map((h,i)=>(
                    <span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px"}}>{h}</span>
                  ))}
                </div>
                {rfqs.map(rfq=>{
                  const rs=RFQ_STATUS[rfq.status];
                  const submitted=rfq.vendors.filter(v=>v.status==="Submitted").length;
                  return(
                    <div key={rfq.id} onClick={()=>setSelRFQ(rfq)} style={{display:"grid",gridTemplateColumns:"90px 160px 1fr 90px 100px 80px 80px 100px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",transition:"background 0.1s",borderLeft:rfq.locked?`3px solid ${T.grn}`:"3px solid transparent"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                      onMouseLeave={e=>e.currentTarget.style.background="none"}>
                      <span style={{fontSize:12,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{rfq.id}</span>
                      <span style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{rfq.project}</span>
                      <span style={{fontSize:11.5,color:T.t3}}>{rfq.items.map(i=>i.desc.split(" ").slice(0,2).join(" ")).join(", ")}</span>
                      <Pill label={rfq.status} c={rs.c} bg={rs.bg} brd={rs.brd}/>
                      <span style={{fontSize:11.5,color:T.t4}}>{rfq.bidEnd||"—"}</span>
                      <span style={{fontSize:12,color:T.t2}}>{rfq.vendors.length}</span>
                      <span style={{fontSize:12,color:T.t2}}>{submitted}/{rfq.vendors.length}</span>
                      <div style={{display:"flex",gap:5}}>
                        {rfq.status==="Draft"&&<button onClick={e=>{e.stopPropagation();publishRFQ(rfq.id);}} style={{padding:"4px 9px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>Publish</button>}
                        {rfq.locked&&<button onClick={e=>e.stopPropagation()} style={{padding:"4px 9px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>→ PO</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* ── TILE VIEW ── */}
            {viewMode==='tile'&&rfqs.map(rfq=>{
              const rs=RFQ_STATUS[rfq.status];
              const totalVendors=rfq.vendors.length;
              const submitted=rfq.vendors.filter(v=>v.status==="Submitted").length;
              return(
                <div key={rfq.id} style={{background:T.surface,borderRadius:8,border:`1px solid ${rfq.locked?T.grnM:T.b1}`,marginBottom:8,overflow:"hidden",boxShadow:rfq.locked?"0 2px 8px rgba(5,150,105,0.1)":"0 1px 3px rgba(0,0,0,0.04)"}}>
                  <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",borderLeft:rfq.locked?`3px solid ${T.grn}`:"3px solid transparent"}} onClick={()=>setSelRFQ(rfq)}>
                    <div style={{width:40,height:40,borderRadius:9,background:rs.bg,border:`1px solid ${rs.brd}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <IcRFQ size={18} color={rs.c}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{rfq.id}</span>
                        <Pill label={rfq.status} c={rs.c} bg={rs.bg} brd={rs.brd}/>
                        {rfq.locked&&<span style={{background:T.grnL,color:T.grn,fontSize:9.5,fontWeight:700,padding:"1px 7px",borderRadius:20,border:`1px solid ${T.grnM}`}}>Locked: {rfq.locked}</span>}
                      </div>
                      <div style={{fontSize:11.5,color:T.t3}}>{rfq.project} · {rfq.items.length} item{rfq.items.length>1?"s":""}</div>
                      {rfq.bidEnd&&<div style={{fontSize:10.5,color:T.t4}}>Bidding: {rfq.bidStart} → {rfq.bidEnd}</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:11.5,color:T.t3}}>{submitted}/{totalVendors} vendors responded</div>
                      <div style={{height:4,background:T.b1,borderRadius:2,width:80,marginTop:5,overflow:"hidden"}}>
                        <div style={{height:"100%",width:totalVendors>0?`${(submitted/totalVendors)*100}%`:"0%",background:submitted===totalVendors?T.grn:T.blu,borderRadius:2}}/>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      {rfq.status==="Draft"&&<button onClick={e=>{e.stopPropagation();publishRFQ(rfq.id);}} style={{padding:"5px 11px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>Publish</button>}
                      {rfq.status==="Published"&&<button onClick={e=>{e.stopPropagation();setShareRFQ(rfq);}} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcShare size={12} color={T.grn}/> Share Links</button>}
                      {rfq.locked&&<button onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:`linear-gradient(135deg,${T.grn},#047857)`,color:"white",fontSize:11,fontWeight:700,border:"none",cursor:"pointer"}}><IcPO size={12} color="white"/> Create PO</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MR TAB — Flow Pipeline ── */}
        {tab==="mr"&&(()=>{
          const stages=[
            {key:"All",   label:"All Requests",  icon:IcMR,    c:T.slt, bg:T.sltL, brd:T.b2},
            {key:"Pending", label:"Pending Order", icon:IcAlert, c:T.amb, bg:T.ambL, brd:T.ambM,
              desc:"Approved — needs to be ordered"},
            {key:"Ordered", label:"Ordered",       icon:IcTruck, c:T.blu, bg:T.bluL, brd:T.bluM,
              desc:"PO raised or manually ordered"},
            {key:"Received",label:"Received",      icon:IcGRN,   c:T.grn, bg:T.grnL, brd:T.grnM,
              desc:"Delivered to site"},
          ];
          const stageData=stages.map(s=>({
            ...s,
            count:s.key==="All"?mrs.length:mrs.filter(m=>m.matStatus===s.key).length,
            items:s.key==="All"?mrs:mrs.filter(m=>m.matStatus===s.key),
          }));
          const activeStage=mrStatus;
          const displayMRs=mrs.filter(m=>{
            if(activeStage!=="All"&&m.matStatus!==activeStage) return false;
            if(mrProject!=="All"&&m.project!==mrProject) return false;
            if(mrMaterial&&mrMaterial!=="All"&&!m.item.toLowerCase().includes(mrMaterial.toLowerCase())) return false;
            return true;
          });

          return(
            <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
              {/* ── MR LIST VIEW ── */}
              {viewMode==='list'&&(
                <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,flexShrink:0}}>
                    <div style={{position:"relative"}}>
                      <select value={mrProject} onChange={e=>setMrProject(e.target.value)}
                        style={{height:30,padding:"0 22px 0 9px",borderRadius:6,border:`1.5px solid ${mrProject!=="All"?T.blu:T.b1}`,background:mrProject!=="All"?T.bluL:T.surface,fontSize:11.5,color:mrProject!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:mrProject!=="All"?600:400,minWidth:150,appearance:"none",WebkitAppearance:"none"}}>
                        <option value="All">All Projects</option>{PROJECTS.map(p=><option key={p}>{p}</option>)}
                      </select>
                      <IcDown size={10} color={T.t4} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
                    </div>
                    <div style={{position:"relative"}}>
                      <select value={mrStatus} onChange={e=>setMrStatus(e.target.value)}
                        style={{height:30,padding:"0 22px 0 9px",borderRadius:6,border:`1.5px solid ${mrStatus!=="All"?T.blu:T.b1}`,background:mrStatus!=="All"?T.bluL:T.surface,fontSize:11.5,color:mrStatus!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:mrStatus!=="All"?600:400,minWidth:130,appearance:"none",WebkitAppearance:"none"}}>
                        <option value="All">All Status</option>{["Pending","Ordered","Received"].map(s=><option key={s}>{s}</option>)}
                      </select>
                      <IcDown size={10} color={T.t4} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
                    </div>
                    <span style={{fontSize:11,color:T.t4}}>{mrs.filter(m=>(mrProject==="All"||m.project===mrProject)&&(mrStatus==="All"||m.matStatus===mrStatus)).length} items</span>
                    {/* material search */}
                    <div style={{position:"relative",flex:1,minWidth:150}}>
                      <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={12} color={T.t4}/></span>
                      <input value={mrMaterial} onChange={e=>setMrMaterial(e.target.value)} placeholder="Search material..."
                        style={{width:"100%",height:30,padding:"0 8px 0 25px",borderRadius:6,border:`1.5px solid ${mrMaterial&&mrMaterial!=="All"?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:mrMaterial&&mrMaterial!=="All"?T.bluL:T.surface}}/>
                    </div>
                  </div>
                  <div style={{flex:1,overflowY:"auto",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
                    <div style={{display:"grid",gridTemplateColumns:"80px 1fr 140px 90px 70px 100px 130px 100px",padding:"7px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,position:"sticky",top:0,zIndex:10}}>
                      {["MR#","Item","Project","Qty","Unit","Requested","Status","Action"].map((h,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px"}}>{h}</span>)}
                    </div>
                    {mrs.filter(m=>{
                      if(mrProject!=="All"&&m.project!==mrProject) return false;
                      if(mrStatus!=="All"&&m.matStatus!==mrStatus) return false;
                      if(mrMaterial&&mrMaterial!=="All"&&!m.item.toLowerCase().includes(mrMaterial.toLowerCase())) return false;
                      return true;
                    }).map(m=>{
                      const ms=MAT_STATUS[m.matStatus];
                      return(
                        <div key={m.id} style={{display:"grid",gridTemplateColumns:"80px 1fr 140px 90px 70px 100px 130px 100px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",transition:"background 0.1s"}}
                          onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                          onMouseLeave={e=>e.currentTarget.style.background="none"}>
                          <span style={{fontSize:11.5,fontWeight:700,color:T.blu}}>{m.id}</span>
                          <div><div style={{fontSize:12.5,color:T.t1}}>{m.item}</div>{m.matStatus==="Ordered"&&m.vendor&&<div style={{fontSize:10,color:T.t4}}>{m.vendor} · ETA {m.expectedDelivery}</div>}</div>
                          <span style={{fontSize:11.5,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.project.length>14?m.project.slice(0,13)+"…":m.project}</span>
                          <span style={{fontSize:12,fontWeight:600,color:T.t2}}>{m.qty}</span>
                          <span style={{fontSize:11.5,color:T.t3}}>{m.unit}</span>
                          <span style={{fontSize:12,color:T.t2}}>{m.requestedBy.split(" ")[0]}</span>
                          <Pill label={m.matStatus} c={ms.c} bg={ms.bg} brd={ms.brd}/>
                          <div>
                            {m.matStatus==="Pending"&&m.status==="Approved"&&(
                              <button onClick={()=>setManualOrderTarget(m)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:10.5,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                                <IcEdit size={11} color={T.amb}/> Order
                              </button>
                            )}
                            {m.matStatus==="Ordered"&&<span style={{fontSize:10,color:T.t4}}>ETA: {m.expectedDelivery||"TBD"}</span>}
                            {m.matStatus==="Received"&&<span style={{fontSize:10,color:T.grn,fontWeight:600}}>Delivered</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* ── MR TILE / PIPELINE VIEW ── */}
              {viewMode==='tile'&&<>

              {/* ── Filter bar: project + material search + count ── */}
              <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:8,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
                <div style={{position:"relative",flex:1,minWidth:160}}>
                  <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                  <input value={mrMaterial} onChange={e=>setMrMaterial(e.target.value)} placeholder="Search material..."
                    style={{width:"100%",height:30,padding:"0 8px 0 27px",borderRadius:6,border:`1.5px solid ${mrMaterial&&mrMaterial!=="All"?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:mrMaterial&&mrMaterial!=="All"?T.bluL:T.surface}}/>
                </div>
                <div style={{position:"relative"}}>
                  <select value={mrProject} onChange={e=>setMrProject(e.target.value)}
                    style={{height:30,padding:"0 22px 0 9px",borderRadius:6,border:`1.5px solid ${mrProject!=="All"?T.blu:T.b1}`,background:mrProject!=="All"?T.bluL:T.surface,fontSize:11.5,color:mrProject!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:mrProject!=="All"?600:400,minWidth:140,appearance:"none",WebkitAppearance:"none"}}>
                    <option value="All">All Projects</option>
                    {PROJECTS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                  <IcDown size={10} color={T.t4} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
                </div>
                <span style={{fontSize:11,color:T.t4}}>{displayMRs.length} items</span>
                {(mrStatus!=="All"||mrProject!=="All"||(mrMaterial&&mrMaterial!=="All"))&&(
                  <button onClick={()=>{setMrStatus("All");setMrProject("All");setMrMaterial("All");}} style={{fontSize:11,color:T.red,background:T.redL,border:`1px solid ${T.redM}`,borderRadius:5,padding:"3px 9px",cursor:"pointer"}}>
                    Clear all ×
                  </button>
                )}
              </div>

              {/* ── Cards ── */}
              <div style={{flex:1,overflowY:"auto"}}>
                {displayMRs.length===0&&(
                  <div style={{textAlign:"center",padding:"48px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
                    <IcMR size={32} color={T.b2}/><div style={{marginTop:10,fontSize:13,color:T.t3}}>No material requests found</div>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:10}}>
                  {displayMRs.map(m=>{
                    const ms=MAT_STATUS[m.matStatus];
                    const stageColors={Pending:{bar:T.amb,bg:T.ambL},Ordered:{bar:T.blu,bg:T.bluL},Received:{bar:T.grn,bg:T.grnL}};
                    const sc=stageColors[m.matStatus]||{bar:T.slt,bg:T.sltL};
                    return(
                      <div key={m.id} style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",transition:"box-shadow 0.15s",borderLeft:`4px solid ${sc.bar}`}}
                        onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.1)"}
                        onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)"}>
                        {/* Card header */}
                        <div style={{padding:"10px 13px 8px",display:"flex",alignItems:"flex-start",gap:10}}>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                              <span style={{fontSize:10.5,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{m.id}</span>
                              <Pill label={m.matStatus} c={ms.c} bg={ms.bg} brd={ms.brd}/>
                            </div>
                            <div style={{fontSize:13,fontWeight:600,color:T.t1,lineHeight:1.3}}>{m.item}</div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <div style={{fontSize:15,fontWeight:700,color:T.t1}}>{m.qty} <span style={{fontSize:10,fontWeight:400,color:T.t4}}>{m.unit}</span></div>
                          </div>
                        </div>
                        {/* Card meta */}
                        <div style={{padding:"0 13px 10px",display:"flex",gap:12,flexWrap:"wrap"}}>
                          <div style={{display:"flex",alignItems:"center",gap:5}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:T.t4,flexShrink:0}}/>
                            <span style={{fontSize:11,color:T.t3}}>{m.project}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:5}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:T.t4,flexShrink:0}}/>
                            <span style={{fontSize:11,color:T.t3}}>{m.requestedBy}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:5}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:T.t4,flexShrink:0}}/>
                            <span style={{fontSize:11,color:T.t4}}>{m.date}</span>
                          </div>
                        </div>
                        {/* Ordered info band */}
                        {m.matStatus==="Ordered"&&m.vendor&&(
                          <div style={{margin:"0 13px",marginBottom:10,padding:"7px 10px",background:T.bluL,borderRadius:6,border:`1px solid ${T.bluM}`,display:"flex",alignItems:"center",gap:8}}>
                            <IcTruck size={13} color={T.blu}/>
                            <div style={{flex:1}}>
                              <div style={{fontSize:11.5,fontWeight:600,color:T.blu}}>{m.vendor}</div>
                              <div style={{fontSize:10,color:T.t4}}>ETA: {m.expectedDelivery}</div>
                            </div>
                          </div>
                        )}
                        {m.matStatus==="Received"&&(
                          <div style={{margin:"0 13px",marginBottom:10,padding:"7px 10px",background:T.grnL,borderRadius:6,border:`1px solid ${T.grnM}`,display:"flex",alignItems:"center",gap:7}}>
                            <IcChk size={13} color={T.grn}/>
                            <span style={{fontSize:11.5,fontWeight:600,color:T.grn}}>Delivered to site</span>
                          </div>
                        )}
                        {/* Action footer */}
                        <div style={{padding:"8px 13px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:7,alignItems:"center"}}>
                          {m.matStatus==="Pending"&&m.status==="Approved"&&(<>
                            <button onClick={()=>setManualOrderTarget(m)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:600,cursor:"pointer",flex:1,justifyContent:"center"}}>
                              <IcEdit size={12} color={T.amb}/> Mark Ordered
                            </button>
                            <button style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer",flex:1,justifyContent:"center"}}>
                              <IcRFQ size={12} color={T.blu}/> Create RFQ
                            </button>
                          </>)}
                          {m.matStatus==="Ordered"&&(
                            <span style={{fontSize:11,color:T.t4,flex:1}}>PO raised or manually ordered</span>
                          )}
                          {m.matStatus==="Received"&&(
                            <span style={{fontSize:11,color:T.grn,fontWeight:600,flex:1}}>GRN completed</span>
                          )}
                          {m.matStatus==="Pending"&&m.status!=="Approved"&&(
                            <span style={{fontSize:11,color:T.amb,flex:1}}>Awaiting MR approval</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
            }
            </div>
          );
        })()}
      </div>

      {/* ── MODALS & DRAWERS ── */}
      {selPO&&<PODetailDrawer po={selPO} onClose={()=>setSelPO(null)} onApprove={(id)=>{approvePO(id);setSelPO(p=>p?{...p,approval:"Approved"}:p);}} onShare={(po)=>{setShareTarget(po);setSelPO(null);}}/>}
      {shareTarget&&<ShareModal rfq={{id:shareTarget.id,project:shareTarget.project,vendors:VENDORS.slice(0,3).map(n=>({name:n,status:"Pending",rates:[]}))}} onClose={()=>setShareTarget(null)}/>}
      {grnTarget&&<GRNModal po={grnTarget} onClose={()=>setGrnTarget(null)} onSave={(id)=>{setPOs(prev=>prev.map(p=>p.id===id?{...p,poStatus:"Closed"}:p));setGrnTarget(null);}}/>}
      {selRFQ&&<RFQDetailDrawer rfq={selRFQ} onClose={()=>setSelRFQ(null)}
        onPunch={(vi)=>{setPunchTarget(selRFQ);setPunchVendorIdx(vi);setSelRFQ(null);}}
        onLock={(vName)=>{lockRFQ(selRFQ.id,vName);setSelRFQ(r=>r?{...r,locked:vName}:r);}}
        onPublish={(id)=>{publishRFQ(id);setSelRFQ(r=>r?{...r,status:"Published",bidStart:"14 Mar",bidEnd:"18 Mar"}:r);}}/>}
      {shareRFQ&&<ShareModal rfq={shareRFQ} onClose={()=>setShareRFQ(null)}/>}
      {punchTarget&&punchVendorIdx!=null&&<PunchQuoteModal rfq={punchTarget} vendorIndex={punchVendorIdx} onSave={(vi,rates)=>savePunch(punchTarget.id,vi,rates)} onClose={()=>{setPunchTarget(null);setPunchVendorIdx(null);}}/>}
      {manualOrderTarget&&<ManualOrderModal mr={manualOrderTarget} onSave={saveManualOrder} onClose={()=>setManualOrderTarget(null)}/>}
      {showFlow&&<FlowDrawer onClose={()=>setShowFlow(false)}/>}
      {showCreatePO&&<CreatePOModal onClose={()=>setShowCreatePO(false)} onSave={(newPO)=>{setPOs(prev=>[newPO,...prev]);setShowCreatePO(false);}}/>}
    </div>
  );
}

export default ProcurementModule;
