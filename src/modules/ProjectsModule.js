import { useState, useEffect } from "react";
import api from "../config/api";

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

const PROJECTS_DATA=[
  {id:1,name:"Shubham & Nand Kishor 623",client:"Nand Kishor Agrawal",city:"Raipur",type:"Residential",progress:68,status:"Ongoing",boq:4250000,expense:2890000,pm:"Vijay Sahu",start:"Jan 2025",end:"Aug 2025"},
  {id:2,name:"Tikendra Banchhor Residence",client:"Tikendra Banchhor",city:"Raipur",type:"Residential",progress:42,status:"Ongoing",boq:3100000,expense:1302000,pm:"Niranjan",start:"Mar 2025",end:"Dec 2025"},
  {id:3,name:"Esther Risali Commercial",client:"Esther Group",city:"Bilaspur",type:"Commercial",progress:91,status:"Ongoing",boq:8750000,expense:7963000,pm:"Harsh Sahu",start:"Jun 2024",end:"Apr 2025"},
  {id:4,name:"Amarendra Shrivastava Villa",client:"Amarendra Shrivastava",city:"Raipur",type:"Residential",progress:23,status:"Ongoing",boq:5600000,expense:1288000,pm:"Vijay Sahu",start:"May 2025",end:"Feb 2026"},
  {id:5,name:"Shyam Ji Township Phase 1",client:"Shyam Developers",city:"Bhilai",type:"Commercial",progress:100,status:"Completed",boq:12000000,expense:11200000,pm:"Niranjan",start:"Jan 2024",end:"Dec 2024"},
  {id:6,name:"Simran Kaur Bungalow",client:"Simran Kaur",city:"Raipur",type:"Residential",progress:0,status:"Not Started",boq:2800000,expense:0,pm:"Priyanka",start:"Jun 2025",end:"Mar 2026"},
  {id:7,name:"Neha Sagar Office Complex",client:"Neha Sagar Ltd",city:"Durg",type:"Commercial",progress:55,status:"Hold",boq:6400000,expense:3520000,pm:"Harsh Sahu",start:"Feb 2025",end:"Nov 2025"},
  {id:8,name:"Bablu Mehta Farmhouse",client:"Bablu Mehta",city:"Raipur",type:"Residential",progress:78,status:"Ongoing",boq:1900000,expense:1482000,pm:"Vijay Sahu",start:"Nov 2024",end:"May 2025"},
];
const TEAM=[
  {id:1,name:"Vijay Sahu",role:"Project Manager",color:"#1565C0",initials:"VS"},
  {id:2,name:"Harsh Sahu",role:"Project Manager",color:"#2E7D32",initials:"HS"},
  {id:3,name:"Niranjan",role:"Site Supervisor",color:"#6A1B9A",initials:"NJ"},
  {id:4,name:"Priyanka",role:"Project Manager",color:"#AD1457",initials:"PK"},
  {id:5,name:"Sunny",role:"Site Engineer",color:"#00695C",initials:"SN"},
];
const PULSE_FEED=[
  {id:1,type:"photo",user:"Vijay Sahu",role:"PM",site:"Shubham 623",time:"2h ago",img:"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=260&fit=crop",caption:"Slab casting complete — 3rd floor RCC done ✅",likes:12,comments:3,tag:"progress",ac:"#1565C0"},
  {id:2,type:"material",user:"Niranjan",role:"Supervisor",site:"Tikendra Residence",time:"3h ago",img:null,caption:"50 bags cement received from Abhay Traders 📦",likes:4,comments:1,tag:"material",ac:"#6A1B9A"},
  {id:3,type:"photo",user:"Harsh Sahu",role:"PM",site:"Esther Risali",time:"5h ago",img:"https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=260&fit=crop",caption:"Brickwork 2nd floor 80% done, pace is great 💪",likes:18,comments:5,tag:"progress",ac:"#2E7D32"},
  {id:4,type:"issue",user:"Priyanka",role:"PM",site:"Simran Bungalow",time:"6h ago",img:null,caption:"⚠️ Design approval pending — client revision awaited",likes:0,comments:2,tag:"issue",ac:"#AD1457"},
  {id:5,type:"photo",user:"Vijay Sahu",role:"PM",site:"Amarendra Villa",time:"1d ago",img:"https://images.unsplash.com/photo-1590725140246-20acddc1ec6d?w=400&h=260&fit=crop",caption:"Foundation waterproofing in progress 🏗️",likes:9,comments:2,tag:"progress",ac:"#1565C0"},
  {id:6,type:"photo",user:"Harsh Sahu",role:"PM",site:"Neha Sagar Office",time:"1d ago",img:"https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&h=260&fit=crop",caption:"False ceiling installation started — ground floor",likes:14,comments:4,tag:"progress",ac:"#2E7D32"},
  {id:7,type:"approval",user:"Niranjan",role:"Supervisor",site:"Tikendra Residence",time:"2d ago",img:null,caption:"✅ Labour payment PR-12 approved — ₹30,000",likes:2,comments:0,tag:"approval",ac:"#6A1B9A"},
  {id:8,type:"photo",user:"Vijay Sahu",role:"PM",site:"Bablu Farmhouse",time:"2d ago",img:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=260&fit=crop",caption:"Exterior plastering 90% done, paint starts Monday 🎨",likes:21,comments:7,tag:"progress",ac:"#1565C0"},
];
const STATUS_META={"Ongoing":{bg:C.gl,text:C.g},"Completed":{bg:C.bl,text:C.p},"Hold":{bg:C.ol,text:C.o},"Not Started":{bg:C.b,text:C.tl}};

// ── FINANCE DATA ─────────────────────────────────────────────────────
const ACCOUNTS=[
  {id:1,name:"HDFC Current",no:"••4821",balance:1823540,color:C.p,icon:"🏦"},
  {id:2,name:"SBI Current",no:"••2204",balance:945200,color:C.teal,icon:"🏦"},
  {id:3,name:"Petty Cash",no:null,balance:18500,color:C.g,icon:"💵"},
  {id:4,name:"ICICI OD",no:"••9012",balance:-230000,color:C.o,icon:"🏦"},
];
const WALLETS=[
  {id:1,name:"Vijay Sahu",role:"PM",balance:12500,limit:25000,initials:"VS",color:"#1565C0"},
  {id:2,name:"Harsh Sahu",role:"PM",balance:8200,limit:25000,initials:"HS",color:"#2E7D32"},
  {id:3,name:"Niranjan",role:"Supervisor",balance:4500,limit:10000,initials:"NJ",color:"#6A1B9A"},
  {id:4,name:"Priyanka",role:"PM",balance:6800,limit:15000,initials:"PK",color:"#AD1457"},
];
const PARTIES=[
  {id:1,name:"3 Eye CCTV Solution",type:"Other Vendor",balance:82166,balType:"Advance Paid"},
  {id:2,name:"Abhay Traders",type:"Material Supplier",balance:114328,balType:"To Pay"},
  {id:3,name:"Akashdeep Raipur",type:"Client",balance:2896400,balType:"Advance Received"},
  {id:4,name:"Amarendra Shrivastava",type:"Client",balance:542790,balType:"To Receive"},
  {id:5,name:"Amrit Builders",type:"Client",balance:770294,balType:"To Receive"},
  {id:6,name:"Ramesh Labour Cont.",type:"Sub-Con",balance:38000,balType:"To Pay"},
  {id:7,name:"Vaibhav Traders",type:"Material Supplier",balance:22500,balType:"To Pay"},
  {id:8,name:"Shyam Ji Raipur",type:"Client",balance:180000,balType:"To Receive"},
];
const PARTY_TXNS={
  3:[
    {id:1,date:"02 Feb 2026",note:"70 param account cash + phone pay to vijay",amount:100000,dr:false},
    {id:2,date:"12 Jan 2026",note:"by naveen sir to vijay",amount:50000,dr:false},
    {id:3,date:"31 Dec 2025",note:"Cash received at anand fashion",amount:250000,dr:false},
  ],
  2:[
    {id:1,date:"08 Mar 2026",note:"TMT Steel 2 MT — Esther Risali",amount:126775,dr:true,status:"unpaid",items:[{name:"TMT Steel Fe500",rate:"₹63,000/MT",qty:"2 MT",amt:126000},{name:"Binding Wire",rate:"₹80/kg",qty:"10 kg",amt:800}]},
    {id:2,date:"01 Mar 2026",note:"Cement 100 bags — Esther Risali",amount:38500,dr:true,status:"paid"},
    {id:3,date:"20 Feb 2026",note:"Sand 5 loads — Shubham 623",amount:17500,dr:true,status:"paid"},
  ],
};
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
const TRANSACTIONS_DATA=[
  {id:1,date:"09 Mar",ds:20260309,party:"Vijay Sahu → Hukumchand Trilok",sub:"Labour payment at slab casting",project:"Amarendra Villa",type:"Party Payment",account:"HDFC",amount:50000,dr:true,status:"paid"},
  {id:2,date:"08 Mar",ds:20260308,party:"Vijay Sahu",sub:"Murga jali for plaster",project:"Shubham 623",type:"Site Expense",account:"Petty Cash",amount:500,dr:true,status:"paid"},
  {id:3,date:"08 Mar",ds:20260308,party:"Abhay Traders",sub:"TMT Steel 2 MT",project:"Esther Risali",type:"Material Purchase",account:"HDFC",amount:126775,dr:true,status:"unpaid"},
  {id:4,date:"07 Mar",ds:20260307,party:"Shyam Ji Raipur",sub:"Client advance payment",project:"Shyam Township",type:"Payment In",account:"SBI",amount:500000,dr:false,status:"paid"},
  {id:5,date:"06 Mar",ds:20260306,party:"GBC Sunny",sub:"Harish tile vala",project:"Neha Sagar",type:"Site Expense",account:"Petty Cash",amount:5000,dr:true,status:"paid"},
  {id:6,date:"05 Mar",ds:20260305,party:"GBC Sunny",sub:"Granite vala",project:"Bablu Farmhouse",type:"Site Expense",account:"Petty Cash",amount:5000,dr:true,status:"paid"},
  {id:7,date:"04 Mar",ds:20260304,party:"Ramesh Labour Cont.",sub:"Brickwork 2nd floor",project:"Tikendra Residence",type:"Sub-Con Expense",account:"HDFC",amount:38000,dr:true,status:"unpaid"},
  {id:8,date:"03 Mar",ds:20260303,party:"Rajesh Electrical",sub:"Wiring materials",project:"Amarendra Villa",type:"Material Purchase",account:"HDFC",amount:22500,dr:true,status:"paid"},
  {id:9,date:"02 Mar",ds:20260302,party:"Abhay Traders",sub:"To be billed — unbilled",project:"Shubham 623",type:"Unbilled Material",account:"—",amount:18000,dr:true,status:"unbilled"},
  {id:10,date:"01 Mar",ds:20260301,party:"Akashdeep Raipur",sub:"Client payment received",project:"Shyam Township",type:"Payment In",account:"SBI",amount:200000,dr:false,status:"paid"},
];
const UNBILLED_PARTIES=[
  {id:1,name:"AAA Traders",items:1,project:"Shubham 623",billItems:[{name:"Bricks",qty:5000,unit:"Nos",rate:8,amt:40000}]},
  {id:2,name:"Shyam Ji Raipur",items:1,project:"Shubham 623",billItems:[{name:"Sand",qty:10,unit:"Loads",rate:3500,amt:35000}]},
  {id:3,name:"Shubham & NK 623",items:9,project:"Shubham 623",billItems:[{name:"Cement OPC",qty:120,unit:"Bags",rate:380,amt:45600},{name:"Sand",qty:5,unit:"Loads",rate:3200,amt:16000}]},
  {id:4,name:"Akashdeep",items:2,project:"Esther Risali",billItems:[{name:"Tiles 2x2",qty:200,unit:"Sqft",rate:65,amt:13000}]},
];
const PAY_REQS_DATA=[
  {id:12,no:"PR-12",date:"27 Feb",party:"Laxmi Electrical",project:"Neha Sagar",amount:1750,status:"Pending",by:"Harsh Sahu"},
  {id:10,no:"PR-10",date:"21 Feb",party:"Chandra Shekhar",project:"Tikendra",amount:30000,status:"Pending",by:"Niranjan"},
  {id:8,no:"PR-8",date:"24 Jan",party:"Vaibhav Traders",project:"Amarendra Villa",amount:22500,status:"Pending",by:"Vijay Sahu"},
  {id:11,no:"PR-11",date:"21 Feb",party:"Kuleshwar Patel Tile",project:"Esther Risali",amount:2500,status:"Approved",by:"Harsh Sahu"},
  {id:9,no:"PR-9",date:"30 Jan",party:"Shubham Ji Raipur",project:"Shubham 623",amount:20000,status:"Approved",by:"Vijay Sahu"},
];
const PEND_PMTS_DATA=[
  {id:1,type:"pr",no:"PR-11",party:"Kuleshwar Patel Tile",project:"Esther Risali",amount:2500,date:"21 Feb",overdue:false},
  {id:2,type:"pr",no:"PR-9",party:"Shubham Ji Raipur",project:"Shubham 623",amount:20000,date:"30 Jan",overdue:false},
  {id:3,type:"bill",no:"MP-38",party:"Abhay Traders",project:"Esther Risali",amount:126775,date:"10 Mar",overdue:true},
  {id:4,type:"bill",no:"SUB-22",party:"Ramesh Labour",project:"Tikendra",amount:38000,date:"15 Mar",overdue:false},
  {id:5,type:"bill",no:"MP-41",party:"Vaibhav Traders",project:"Amarendra Villa",amount:31200,date:"20 Mar",overdue:false},
];

function SitePulseDrawer({onClose}){
  const [site,setSite]=useState("All");const [type,setType]=useState("All");const [liked,setLiked]=useState({});
  const tagMeta={"progress":{c:C.g,b:C.gl},"material":{c:C.p,b:C.bl},"issue":{c:C.r,b:C.rl},"approval":{c:C.teal,b:C.tealL}};
  const filtered=PULSE_FEED.filter(f=>(site==="All"||f.site.includes(site))&&(type==="All"||f.type===type));
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.48)",zIndex:200,backdropFilter:"blur(2px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:390,background:C.bg,zIndex:201,boxShadow:"-8px 0 40px rgba(0,0,0,0.24)",display:"flex",flexDirection:"column",animation:"slideIn 0.22s ease",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:C.w,padding:"12px 14px 10px",borderBottom:`1px solid ${C.b}`,flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:C.g,boxShadow:`0 0 0 3px ${C.gl}`,animation:"livePulse 1.5s infinite"}}/>
            <span style={{fontSize:14,fontWeight:800,color:C.t}}>Site Pulse</span>
            <span style={{background:C.r,color:"white",fontSize:8,fontWeight:800,padding:"2px 5px",borderRadius:4,letterSpacing:"0.6px"}}>LIVE</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.tl,display:"flex"}}><IcX size={15}/></button>
        </div>
        <div style={{display:"flex",gap:6}}>
          <select value={site} onChange={e=>setSite(e.target.value)} style={{flex:1,padding:"6px 8px",borderRadius:7,border:`1.5px solid ${C.b}`,fontSize:11.5,background:C.bg,outline:"none",fontFamily:"inherit",color:C.t}}>
            <option>All</option>{["Shubham 623","Esther Risali","Amarendra Villa","Tikendra Residence","Neha Sagar Office","Bablu Farmhouse"].map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={type} onChange={e=>setType(e.target.value)} style={{flex:1,padding:"6px 8px",borderRadius:7,border:`1.5px solid ${C.b}`,fontSize:11.5,background:C.bg,outline:"none",fontFamily:"inherit",color:C.t}}>
            {["All","photo","material","issue","approval"].map(t=><option key={t} value={t}>{t==="All"?"All Types":t[0].toUpperCase()+t.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>
        {filtered.map(f=>{
          const tm=tagMeta[f.tag]||{c:C.tm,b:C.b};const isL=liked[f.id];
          return(
            <div key={f.id} style={{background:C.w,borderRadius:12,marginBottom:8,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
              <div style={{display:"flex",alignItems:"center",gap:9,padding:"10px 12px 7px"}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${f.ac},${f.ac}99)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"white",flexShrink:0,boxShadow:`0 0 0 2px ${f.ac}44`}}>{f.user.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:C.t}}>{f.user} <span style={{fontSize:10,fontWeight:400,color:C.tl}}>· {f.role}</span></div><div style={{fontSize:10,color:C.tl}}>📍 {f.site} · {f.time}</div></div>
                <span style={{background:tm.b,color:tm.c,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,textTransform:"capitalize"}}>{f.tag}</span>
              </div>
              {f.img&&<img src={f.img} alt="site" style={{width:"100%",height:180,objectFit:"cover",display:"block"}} onError={e=>{e.target.parentElement.innerHTML='<div style="height:180px;background:linear-gradient(135deg,#E3F2FD,#BBDEFB);display:flex;align-items:center;justify-content:center;font-size:40px">🏗️</div>';}}/>}
              {!f.img&&f.type==="issue"&&<div style={{margin:"0 12px 6px",background:C.rl,borderRadius:8,padding:"8px 11px",borderLeft:`3px solid ${C.r}`,display:"flex",gap:7,alignItems:"center"}}><IcWarn size={13} color={C.r}/><span style={{fontSize:11.5,color:C.r,fontWeight:500}}>Issue Flagged</span></div>}
              {!f.img&&f.type==="approval"&&<div style={{margin:"0 12px 6px",background:C.tealL,borderRadius:8,padding:"8px 11px",borderLeft:`3px solid ${C.teal}`,display:"flex",gap:7,alignItems:"center"}}><IcChk size={13} color={C.teal}/><span style={{fontSize:11.5,color:C.teal,fontWeight:500}}>Payment Approved</span></div>}
              {!f.img&&f.type==="material"&&<div style={{margin:"0 12px 6px",background:C.bl,borderRadius:8,padding:"8px 11px",borderLeft:`3px solid ${C.p}`,display:"flex",gap:7,alignItems:"center"}}><span style={{fontSize:16}}>📦</span><span style={{fontSize:11.5,color:C.p,fontWeight:500}}>Material Received</span></div>}
              <div style={{padding:"7px 12px 4px"}}><span style={{fontSize:12,color:C.t,lineHeight:1.45}}><strong>{f.user}</strong> {f.caption}</span></div>
              <div style={{padding:"5px 12px 10px",display:"flex",gap:14,alignItems:"center"}}>
                <button onClick={()=>setLiked(p=>({...p,[f.id]:!p[f.id]}))} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:isL?C.r:C.tl,padding:0,transition:"transform 0.15s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.18)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                  <IcHeart size={16} color={isL?C.r:C.tl} fill={isL?C.r:"none"}/><span style={{fontSize:11,fontWeight:600}}>{f.likes+(isL?1:0)}</span>
                </button>
                <button style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:C.tl,padding:0}}><IcMsg size={15} color={C.tl}/><span style={{fontSize:11,fontWeight:600}}>{f.comments}</span></button>
                <div style={{flex:1}}/><span style={{fontSize:9.5,color:C.tl}}>{f.time}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{padding:"10px 12px",background:C.w,borderTop:`1px solid ${C.b}`}}>
        <button style={{width:"100%",padding:"9px",borderRadius:8,background:`linear-gradient(135deg,${C.pur},#8E24AA)`,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>View Full Site Pulse →</button>
      </div>
    </div>
  </>);
}

// ── DUPLICATE MODAL ───────────────────────────────────────────────────

function NewProjectModal({onClose,onCreated}){
  const [form,setForm]=useState({name:"",client_name:"",city:"Raipur",type:"residential",boq_value:"",start_date:"",end_date:""});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));

  const handleCreate=async()=>{
    if(!form.name.trim()) return setError("Project name required");
    setLoading(true);setError("");
    try{
      const res=await api.post("/projects",{
        name:form.name.trim(),
        client_name:form.client_name.trim(),
        city:form.city,
        type:form.type,
        status:"not_started",
        boq_value:Number(form.boq_value)||0,
        start_date:form.start_date||null,
        end_date:form.end_date||null,
      });
      if(res.success&&res.data){
        onCreated(mapProject(res.data));
        onClose();
      }else{
        setError(res.message||"Failed to create project");
      }
    }catch(err){
      setError("Server error. Try again.");
    }
    setLoading(false);
  };

  const FIELDS=[
    {label:"Project Name *",key:"name",type:"text",full:true,ph:"e.g. Sharma Residence"},
    {label:"Client Name",key:"client_name",type:"text",full:false,ph:"Client full name"},
    {label:"City",key:"city",type:"text",full:false,ph:"City"},
    {label:"Type",key:"type",type:"select",opts:["residential","commercial","industrial"],full:false},
    {label:"BOQ Value (₹)",key:"boq_value",type:"number",full:false,ph:"e.g. 5000000"},
    {label:"Start Date",key:"start_date",type:"date",full:false},
    {label:"End Date",key:"end_date",type:"date",full:false},
  ];

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:998}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:460,background:T.surface,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,.25)",zIndex:999,overflow:"hidden"}}>
      <div style={{padding:"18px 22px",background:`linear-gradient(135deg,${T.blu},#1D4ED8)`,color:"white"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:9,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center"}}><IcAdd size={17} color="white"/></div>
            <div><div style={{fontSize:16,fontWeight:700}}>New Project</div><div style={{fontSize:11,opacity:0.7}}>Add a new construction project</div></div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"white",opacity:0.7}}><IcX size={18}/></button>
        </div>
      </div>
      <div style={{padding:"18px 22px",maxHeight:"60vh",overflowY:"auto"}}>
        {error&&<div style={{background:T.redL,color:T.red,padding:"8px 12px",borderRadius:7,fontSize:12,marginBottom:12,border:`1px solid ${T.redM}`}}>{error}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {FIELDS.map(f=>(
            <div key={f.key} style={{gridColumn:f.full?"1/3":"auto"}}>
              <label style={{fontSize:10.5,fontWeight:600,color:T.t3,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>{f.label}</label>
              {f.type==="select"?(
                <select value={form[f.key]} onChange={e=>setF(f.key,e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.bg,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
                  {f.opts.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                </select>
              ):(
                <input type={f.type} value={form[f.key]} onChange={e=>setF(f.key,e.target.value)} placeholder={f.ph||""}
                  style={{width:"100%",padding:"9px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.bg,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              )}
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"14px 22px",borderTop:`1px solid ${T.b1}`,display:"flex",justifyContent:"flex-end",gap:10}}>
        <button onClick={onClose} style={{padding:"9px 18px",borderRadius:7,border:`1px solid ${T.b1}`,background:"none",fontSize:13,color:T.t2,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
        <button onClick={handleCreate} disabled={loading} style={{padding:"9px 22px",borderRadius:7,border:"none",background:loading?T.t4:`linear-gradient(135deg,${T.blu},#1D4ED8)`,color:"white",fontSize:13,fontWeight:600,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit"}}>{loading?"Creating...":"Create Project"}</button>
      </div>
    </div>
  </>);
}

function DuplicateModal({project,onClose,onConfirm}){
  const [step,setStep]=useState(1);const [done,setDone]=useState(false);
  const [form,setForm]=useState({name:`${project.name} — Copy`,city:project.city,boq:project.boq,start:"",end:""});
  const [pm,setPM]=useState(project.pm);const [sup,setSup]=useState("Niranjan");
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
          {[{role:"Project Manager",val:pm,setter:setPM,prev:project.pm},{role:"Site Supervisor",val:sup,setter:setSup,prev:"Niranjan"}].map(({role,val,setter,prev})=>(
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
      if(res.success){ onDeleted(project.id,"archived"); onClose(); }
      else setError(res.message||"Archive failed");
    } catch(e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if(deleteText !== project.name) return setError("Project naam match nahi kiya");
    setSaving(true);
    try {
      const res = await api.del("/projects/"+project.id);
      if(res.success){ onDeleted(project.id,"deleted"); onClose(); }
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
    <select value={form[k]} onChange={e=>upd(k,e.target.value)}
      style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
      {opts.map(o=><option key={o}>{o}</option>)}
    </select>
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
                {inp("name","e.g. Tikendra Banchhor Residence")}
              </div>
              <div>
                {lbl("Client Name",true)}
                {inp("client_name","e.g. Tikendra Banchhor")}
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
                    <div style={{fontSize:12,color:T.red,marginBottom:8}}>Confirm karne ke liye project ka naam type karo: <strong>{project.name}</strong></div>
                    <input value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder={project.name}
                      style={{width:"100%",padding:"8px 11px",borderRadius:7,border:"1.5px solid "+T.redM,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:10}}/>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{setConfirmDelete(false);setDeleteText("");}} style={{flex:1,padding:"8px",borderRadius:7,background:T.surface,border:"1px solid "+T.b1,color:T.t3,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                      <button onClick={handleDelete} disabled={saving||deleteText!==project.name}
                        style={{flex:2,padding:"8px",borderRadius:7,background:deleteText===project.name?T.red:T.b1,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:deleteText===project.name?"pointer":"not-allowed"}}>
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
          <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>By {mr.requested_by||"Site Team"} · {mr.mr_number}</div>
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

function ApprovalsDrawer({onClose,initTab="mr"}){
  const [activeTab,setActiveTab]=useState(initTab); // "mr" | "pr"
  const [data,setData]=useState({procurement:[],finance:[]});
  const [loading,setLoading]=useState(true);
  const [acting,setActing]=useState({});
  const [rejectId,setRejectId]=useState(null);
  const [rejectNote,setRejectNote]=useState("");
  const [saveErr,setSaveErr]=useState("");

  const load=async()=>{
    setLoading(true);
    try{
      const [mrRes,prRes]=await Promise.all([
        api.get("/procurement/mrs?mr_status=Pending"),
        api.get("/finance/payment-requests"),
      ]);
      setData({
        procurement:(mrRes.success?mrRes.data:[]).filter(m=>m.mr_status==="Pending"||m.stage==="Requested"),
        finance:(prRes.success?prRes.data:[]).filter(p=>p.status==="pending"||p.status==="Pending"),
      });
    }catch(e){ setSaveErr("Data load failed"); }
    setLoading(false);
  };

  useEffect(()=>{load();},[]);

  const approveMR=async(id,approvedQty)=>{
    setSaveErr(""); setActing(p=>({...p,[id]:"approving"}));
    try{
      const mr=data.procurement.find(m=>m.id===id);
      const res=await api.patch("/procurement/mrs/"+id+"/approve",{
        action:"Approved",
        approved_qty:approvedQty||mr?.quantity||null,
      });
      if(res.success===false) { setSaveErr(res.message||"Approve failed"); }
      else { setData(p=>({...p,procurement:p.procurement.filter(m=>m.id!==id)})); }
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
      else { setData(p=>({...p,procurement:p.procurement.filter(m=>m.id!==id)})); }
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

  const totalCount=data.procurement.length+data.finance.length;
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

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.38)",zIndex:300,backdropFilter:"blur(2px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:440,background:T.bg,zIndex:301,boxShadow:"-4px 0 28px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>

      {/* Header */}
      <div style={{background:"#0D1B2A",padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <div style={{fontSize:15,fontWeight:700,color:"white"}}>Pending Approvals</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex",padding:4}}>
            <IcX size={15}/>
          </button>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{background:T.amb,color:"white",fontSize:11,fontWeight:700,padding:"2px 10px",borderRadius:20}}>{totalCount} pending</span>
          <span style={{fontSize:10.5,color:"rgba(255,255,255,0.4)"}}>All modules</span>
          <button onClick={load} style={{marginLeft:"auto",background:"rgba(255,255,255,0.1)",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",fontSize:10.5,padding:"3px 9px",borderRadius:5}}>↻ Refresh</button>
        </div>
        {/* Module tabs */}
        <div style={{display:"flex",gap:0,marginTop:10,borderRadius:8,overflow:"hidden",border:"1px solid rgba(255,255,255,0.12)"}}>
          {[
            {id:"mr", label:"Material Requests", count:data.procurement.length, color:"#F59E0B"},
            {id:"pr", label:"Payment Requests",  count:data.finance.length,     color:"#3B82F6"},
          ].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              style={{flex:1,padding:"7px 10px",border:"none",background:activeTab===t.id?"rgba(255,255,255,0.15)":"none",
                color:activeTab===t.id?"white":"rgba(255,255,255,0.5)",
                fontSize:11,fontWeight:activeTab===t.id?700:400,cursor:"pointer",
                borderBottom:activeTab===t.id?"2px solid "+t.color:"2px solid transparent",
                display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              {t.label}
              {t.count>0&&<span style={{background:t.color,color:"white",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:10}}>{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto"}}>
        {saveErr&&<div style={{margin:"8px 14px",padding:"8px 12px",background:T.redL,border:"1px solid "+T.redM,borderRadius:7,fontSize:12,color:T.red}}>{saveErr}</div>}
        {loading&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>Loading approvals...</div>}

        {!loading&&activeTab==="mr"&&data.procurement.length===0&&(
          <div style={{textAlign:"center",padding:"60px 20px"}}>
            <div style={{fontSize:32,marginBottom:8}}>✅</div>
            <div style={{fontSize:14,fontWeight:700,color:T.t2}}>Koi pending MR nahi!</div>
            <div style={{fontSize:12,color:T.t4,marginTop:4}}>Sab material requests clear hain</div>
          </div>
        )}
        {!loading&&activeTab==="pr"&&data.finance.length===0&&(
          <div style={{textAlign:"center",padding:"60px 20px"}}>
            <div style={{fontSize:32,marginBottom:8}}>✅</div>
            <div style={{fontSize:14,fontWeight:700,color:T.t2}}>Koi pending Payment Request nahi!</div>
            <div style={{fontSize:12,color:T.t4,marginTop:4}}>Sab payments clear hain</div>
          </div>
        )}

        {/* ── MATERIAL REQUESTS TAB ── */}
        {!loading&&activeTab==="mr"&&(
          <>
            <SectionHead label="Procurement — Material Requests" count={data.procurement.length} color={T.amb} bg={T.ambL} bdr={T.ambM}/>
            <div style={{padding:"8px 14px",display:"flex",flexDirection:"column",gap:8}}>
              {data.procurement.map(mr=>(
                <MRApprovalCard key={mr.id} mr={mr} onApprove={approveMR} onReject={rejectMR}/>
              ))}
            </div>
          </>
        )}

        {/* ── PAYMENT REQUESTS TAB ── */}
        {!loading&&activeTab==="pr"&&(
          <>
            <SectionHead label="Finance — Payment Requests" count={data.finance.length} color={T.blu} bg={T.bluL} bdr={T.bluM}/>
            <div style={{padding:"8px 14px",display:"flex",flexDirection:"column",gap:8}}>
              {data.finance.map(pr=>(
                <div key={pr.id} style={{background:T.surface,borderRadius:8,border:"1px solid "+T.b1,padding:"11px 13px",borderLeft:"3px solid "+T.blu}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{pr.party_name||pr.party||"—"}</div>
                      <div style={{fontSize:11,color:T.t4,marginTop:2}}>{pr.project_name||pr.project||"—"} · {pr.type||"Payment"}</div>
                      <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>{pr.description||pr.note||"—"} · PR-{pr.id}</div>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:T.blu,flexShrink:0}}>{fmtAmt(pr.amount||0)}</span>
                  </div>
                  <ApproveRejectBtns
                    id={pr.id}
                    prefix="pr"
                    onApprove={()=>approvePR(pr.id)}
                    onReject={()=>rejectPR(pr.id)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  </>);
}

function ProjectsPage({onSelectProject}){
  const [allProjects,setAllProjects]=useState([]);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState("tile");
  const [search,setSearch]=useState("");
  const [filterCity,setFilterCity]=useState("All");
  const [filterStatus,setFilterStatus]=useState("All");
  const [hideCompleted,setHideCompleted]=useState(true);
  const [sortBy,setSortBy]=useState("Default");
  const [showPulse,setShowPulse]=useState(false);
  const [dupOf,setDupOf]=useState(null);
  const [showNew,setShowNew]=useState(false);
  const [cardMenu,setCardMenu]=useState(null); // project id with open menu
  const [settingsOf,setSettingsOf]=useState(null); // project object for settings
  const [showApprovals,setShowApprovals]=useState(false);
  const [approvalInitTab,setApprovalInitTab]=useState("mr");
  const [showIssuesDrawer,setShowIssuesDrawer]=useState(false);
  const [allIssues,setAllIssues]=useState([]);
  const [issuesLoading,setIssuesLoading]=useState(false);
  const [issueFilter,setIssueFilter]=useState("Open"); // which tab to open
  const [approvalCount,setApprovalCount]=useState(0);
  const [mrPendingCount,setMrPendingCount]=useState(0);
  const [prPendingCount,setPrPendingCount]=useState(0);

  // Load real approval counts
  const loadApprovalCounts=async()=>{
    try{
      const [mrRes,prRes]=await Promise.all([
        api.get("/procurement/mrs?mr_status=Pending"),
        api.get("/finance/payment-requests"),
      ]);
      const mrCount=(mrRes.success?mrRes.data:[]).filter(m=>m.mr_status==="Pending"||m.stage==="Requested").length;
      const prCount=(prRes.success?prRes.data:[]).filter(p=>p.status==="pending"||p.status==="Pending").length;
      setMrPendingCount(mrCount);
      setPrPendingCount(prCount);
      setApprovalCount(mrCount+prCount);
    }catch(e){}
  };

  // Fetch projects from backend
  useEffect(()=>{
    const fetchProjects=async()=>{
      try{
        setLoading(true);
        const res=await api.get("/projects");
        if(res.success&&res.data){
          setAllProjects(res.data.map(mapProject));
        }else{
          // Fallback to hardcoded data
          setAllProjects(PROJECTS_DATA);
        }
      }catch(err){
        console.error("Failed to fetch projects:",err);
        setAllProjects(PROJECTS_DATA);
      }finally{
        setLoading(false);
      }
    };
    fetchProjects().then(()=>{ loadApprovalCounts(); });
    // Load issues independently — don't wait for projects
    api.get("/tasks/all-issues").then(r=>{
      if(r.success) setAllIssues(r.data||[]);
    }).catch(()=>{});
  },[]);

  const cities=["All",...new Set(allProjects.map(p=>p.city))];
  const progClr=pct=>pct===100?T.grn:pct>60?T.blu:pct>30?T.amb:T.red;

  const filtered=allProjects.filter(p=>{
    if(hideCompleted&&p.status==="Completed") return false;
    if(filterCity!=="All"&&p.city!==filterCity) return false;
    if(filterStatus!=="All"&&p.status!==filterStatus) return false;
    if(search&&!p.name.toLowerCase().includes(search.toLowerCase())&&!p.client.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a,b)=>sortBy==="A→Z"?a.name.localeCompare(b.name):sortBy==="End"?(a.end||"").localeCompare(b.end||""):sortBy==="↓%"?b.progress-a.progress:sortBy==="↑%"?a.progress-b.progress:0);

  const stats={total:allProjects.length,ongoing:allProjects.filter(p=>p.status==="Ongoing").length,hold:allProjects.filter(p=>p.status==="Hold").length,notStarted:allProjects.filter(p=>p.status==="Not Started").length,completed:allProjects.filter(p=>p.status==="Completed").length};

  const SM={"Ongoing":{c:T.grn,bg:T.grnL},"Completed":{c:T.blu,bg:T.bluL},"Hold":{c:T.amb,bg:T.ambL},"Not Started":{c:T.slt,bg:T.sltL}};

  const ACTION_TILES=[
    {label:"Pending Approvals",val:approvalCount,Icon:IcWarn,color:T.amb,bg:T.ambL,bdr:T.ambM,onClick:()=>{setApprovalInitTab("mr");setShowApprovals(true);}},
    {label:"Material Requests", val:mrPendingCount,Icon:IcProc,color:T.blu,bg:T.bluL,bdr:T.bluM,onClick:()=>{setApprovalInitTab("mr");setShowApprovals(true);}},
    {label:"My To-Do",          val:5,   Icon:IcClip,  color:T.grn,bg:T.grnL,bdr:T.grnM},
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
      <div style={{textAlign:"center",color:T.t3}}>
        <div style={{fontSize:16,fontWeight:600}}>Loading Projects...</div>
        <div style={{fontSize:12,marginTop:6,color:T.t4}}>Fetching from server</div>
      </div>
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

        {/* New Project */}
        <button onClick={()=>setShowNew(true)} style={{height:32,padding:"0 14px",borderRadius:6,background:`linear-gradient(135deg,${T.blu},#1D4ED8)`,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5,boxShadow:`0 3px 8px ${T.blu}44`,whiteSpace:"nowrap",flexShrink:0}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 5px 14px ${T.blu}55`}
          onMouseLeave={e=>e.currentTarget.style.boxShadow=`0 3px 8px ${T.blu}44`}>
          <IcAdd size={13} color="white"/> New Project
        </button>
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
          {filtered.map(p=>{
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
                          <button onClick={()=>{setCardMenu(null);setDupOf(p);}}
                            style={{width:"100%",padding:"8px 12px",border:"none",background:"none",textAlign:"left",fontSize:12,color:T.t1,cursor:"pointer",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid "+T.b1}}
                            onMouseEnter={e=>e.currentTarget.style.background=T.ambL} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                            <IcCopy size={13} color={T.amb}/> Copy Project
                          </button>
                          <button onClick={()=>{setCardMenu(null);setSettingsOf(p);}}
                            style={{width:"100%",padding:"8px 12px",border:"none",background:"none",textAlign:"left",fontSize:12,color:T.t1,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}
                            onMouseEnter={e=>e.currentTarget.style.background=T.sltL} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                            <IcSet size={13} color={T.slt}/> Settings
                          </button>
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
          {filtered.map(p=>{
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
                  <button onClick={e=>{e.stopPropagation();setDupOf(p);}} style={{background:"none",border:`1px solid ${T.b1}`,borderRadius:5,padding:"2px 6px",cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontSize:9.5,color:T.t3,transition:"all .12s"}} onMouseEnter={e=>{e.currentTarget.style.background=T.ambL;e.currentTarget.style.color=T.amb;e.currentTarget.style.borderColor=T.ambM;}} onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=T.t3;e.currentTarget.style.borderColor=T.b1;}}><IcCopy size={10} color="currentColor"/> Copy</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length===0&&<div style={{textAlign:"center",padding:"60px 20px",color:T.t4}}><div style={{fontSize:38,marginBottom:10}}>🔍</div><div style={{fontSize:15,fontWeight:600,color:T.t2}}>No projects found</div><div style={{fontSize:12,marginTop:4,color:T.t4}}>Try changing filters or search term</div></div>}
      {showPulse&&<SitePulseDrawer onClose={()=>setShowPulse(false)}/>}
      {showApprovals&&<ApprovalsDrawer onClose={()=>{setShowApprovals(false);loadApprovalCounts();}} initTab={approvalInitTab}/>}
      {showIssuesDrawer&&<IssuesDrawer issues={allIssues} loading={issuesLoading} filter={issueFilter} setFilter={setIssueFilter} onClose={()=>setShowIssuesDrawer(false)} onIssueClose={(id)=>setAllIssues(p=>p.map(x=>x.id===id?{...x,status:"Closed"}:x))}/>}
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
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    {fullPhoto&&(
      <div onClick={()=>setFullPhoto(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
        <img src={fullPhoto} style={{maxWidth:"95vw",maxHeight:"90vh",objectFit:"contain",borderRadius:8}}/>
        <button onClick={()=>setFullPhoto(null)} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    )}
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(520px,96vw)",background:"#F8FAFC",zIndex:301,boxShadow:"-6px 0 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease"}}>
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

export default ProjectsPage;
