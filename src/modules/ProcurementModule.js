import { useState } from "react";

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
const IcBan   =(p)=><Ic {...p} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>;
const IcReceipt=(p)=><Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4"/>;
const IcRupee =(p)=><Ic {...p} d="M6 3h12M6 8h12M15 21L9 13h3a4 4 0 000-8"/>;
const IcClock =(p)=><Ic {...p} d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2"/>;
const IcHalf  =(p)=><Ic {...p} d="M12 2a10 10 0 010 20V2z" fill="currentColor" sw={0}/>;

// ── THEME ─────────────────────────────────────────────────────────────
const T={bg:"#F4F6F9",surface:"#FFFFFF",surfaceB:"#F8F9FB",t1:"#111827",t2:"#374151",t3:"#6B7280",t4:"#9CA3AF",b1:"#E5E7EB",b2:"#D1D5DB",blu:"#2563EB",bluL:"#EFF6FF",bluM:"#BFDBFE",grn:"#059669",grnL:"#ECFDF5",grnM:"#A7F3D0",amb:"#D97706",ambL:"#FFFBEB",ambM:"#FDE68A",red:"#DC2626",redL:"#FEF2F2",redM:"#FECACA",slt:"#64748B",sltL:"#F1F5F9",pur:"#7C3AED",purL:"#F5F3FF",purM:"#DDD6FE"};
const fmt=(n)=>n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:`${(n/1000).toFixed(0)}K`;
const fmtN=(n)=>Math.abs(n).toLocaleString("en-IN");
const calcDueDate=(invoiceDate,days)=>{const d=new Date(invoiceDate);d.setDate(d.getDate()+days);return d.toISOString().split("T")[0];};

// ── MOCK DATA ─────────────────────────────────────────────────────────
const PROJECTS=["Shubham & NK 623","Tikendra Residence","Esther Risali","Amarendra Villa","Neha Sagar Office","Bablu Farmhouse"];
const VENDORS=["Abhay Traders","Vaibhav Traders","Rajesh Steel Mart","Shyam Ji Materials","Ganesh Cement House","Lucky Hardware","Sri Ram Electricals","Agarwal Plumbing"];
const UNITS=["Bags","MT","Nos","Loads","Sqft","Mtrs","Kg","Sheets","Ltrs","Cu.m","Ton","RFT"];

const MR_DATA=[
  {id:"MR-14",date:"14 Mar",project:"Amarendra Villa",item:"Cement OPC 50kg",qty:200,unit:"Bags",requestedBy:"Vijay Sahu",mrStatus:"Approved",matStatus:"Pending"},
  {id:"MR-13",date:"13 Mar",project:"Tikendra Residence",item:"TMT Steel Fe500 12mm",qty:3,unit:"MT",requestedBy:"Niranjan",mrStatus:"Approved",matStatus:"Pending"},
  {id:"MR-12",date:"13 Mar",project:"Amarendra Villa",item:"M-Sand Fine",qty:8,unit:"Loads",requestedBy:"Vijay Sahu",mrStatus:"Approved",matStatus:"Pending"},
  {id:"MR-11",date:"12 Mar",project:"Esther Risali",item:"Plywood 18mm BWR",qty:50,unit:"Sheets",requestedBy:"Harsh Sahu",mrStatus:"Approved",matStatus:"Pending"},
  {id:"MR-10",date:"11 Mar",project:"Neha Sagar Office",item:"PVC Conduit 25mm",qty:500,unit:"Mtrs",requestedBy:"Priyanka",mrStatus:"Pending",matStatus:"Pending"},
  {id:"MR-09",date:"11 Mar",project:"Shubham & NK 623",item:"River Sand",qty:15,unit:"Loads",requestedBy:"Vijay Sahu",mrStatus:"Approved",matStatus:"Ordered",vendor:"Shyam Ji Materials",expectedDelivery:"18 Mar"},
  {id:"MR-08",date:"10 Mar",project:"Esther Risali",item:"AAC Blocks 600x200x150",qty:5000,unit:"Nos",requestedBy:"Harsh Sahu",mrStatus:"Approved",matStatus:"Ordered",vendor:"Abhay Traders",expectedDelivery:"16 Mar"},
  {id:"MR-07",date:"09 Mar",project:"Tikendra Residence",item:"Granite Flooring 2x2",qty:600,unit:"Sqft",requestedBy:"Niranjan",mrStatus:"Approved",matStatus:"Ordered",vendor:"Lucky Hardware",expectedDelivery:"17 Mar"},
  {id:"MR-06",date:"08 Mar",project:"Shubham & NK 623",item:"OPC Cement 50kg",qty:100,unit:"Bags",requestedBy:"Vijay Sahu",mrStatus:"Approved",matStatus:"Ordered",vendor:"Ganesh Cement House",expectedDelivery:"20 Mar"},
  {id:"MR-05",date:"07 Mar",project:"Bablu Farmhouse",item:"Ceramic Floor Tiles 2x2",qty:800,unit:"Sqft",requestedBy:"Vijay Sahu",mrStatus:"Approved",matStatus:"Received",receivedQty:800,orderedQty:800},
  {id:"MR-04",date:"05 Mar",project:"Tikendra Residence",item:"Binding Wire",qty:50,unit:"Kg",requestedBy:"Niranjan",mrStatus:"Approved",matStatus:"PartialReceived",receivedQty:30,orderedQty:50,vendor:"Vaibhav Traders"},
  {id:"MR-03",date:"03 Mar",project:"Esther Risali",item:"TMT Steel Fe500 10mm",qty:5,unit:"MT",requestedBy:"Harsh Sahu",mrStatus:"Approved",matStatus:"Received",receivedQty:5,orderedQty:5},
  {id:"MR-02",date:"01 Mar",project:"Shubham & NK 623",item:"Coarse Aggregate 20mm",qty:20,unit:"Loads",requestedBy:"Vijay Sahu",mrStatus:"Approved",matStatus:"Received",receivedQty:20,orderedQty:20},
  {id:"MR-01",date:"28 Feb",project:"Neha Sagar Office",item:"Ceramic Wall Tiles",qty:400,unit:"Sqft",requestedBy:"Priyanka",mrStatus:"Approved",matStatus:"Received",receivedQty:400,orderedQty:400},
  {id:"MR-00",date:"25 Feb",project:"Tikendra Residence",item:"White Cement 25kg",qty:50,unit:"Bags",requestedBy:"Niranjan",mrStatus:"Rejected",matStatus:"Pending",rejectedReason:"Item not in BOQ — use OPC instead"},
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
   vendors:[{name:"Abhay Traders",status:"Submitted",rates:[{rate:385,remarks:"Stock ready"},{rate:3600,remarks:""}]},{name:"Ganesh Cement House",status:"Submitted",rates:[{rate:378,remarks:"Best price"},{rate:3750,remarks:"Premium quality"}]},{name:"Vaibhav Traders",status:"Pending",rates:[{rate:null,remarks:""},{rate:null,remarks:""}]}],locked:null},
  {id:"RFQ-011",date:"10 Mar",project:"Tikendra Residence",status:"Published",bidStart:"10 Mar",bidEnd:"14 Mar",
   items:[{desc:"TMT Steel Fe500 12mm",hsn:"72142",qty:3,unit:"MT",deliveryDate:"19 Mar"}],
   vendors:[{name:"Rajesh Steel Mart",status:"Submitted",rates:[{rate:62500,remarks:"Ex-warehouse"}]},{name:"Abhay Traders",status:"Submitted",rates:[{rate:64000,remarks:""}]},{name:"Shyam Ji Materials",status:"Submitted",rates:[{rate:61800,remarks:"Mill rate"}]}],locked:"Shyam Ji Materials"},
  {id:"RFQ-010",date:"05 Mar",project:"Shubham & NK 623",status:"Draft",bidStart:"",bidEnd:"",items:[{desc:"River Sand",hsn:"25051",qty:15,unit:"Loads",deliveryDate:"18 Mar"}],vendors:[],locked:null},
];

const GRN_DATA=[
  {id:"GRN-018",poId:"PO-020",date:"07 Mar",vendor:"Lucky Hardware",project:"Bablu Farmhouse",item:"Ceramic Tiles 2x2",qty:800,unit:"Sqft",receivedBy:"Vijay Sahu",quality:"Good",remark:""},
  {id:"GRN-017",poId:"PO-019",date:"05 Mar",vendor:"Vaibhav Traders",project:"Tikendra Residence",item:"Binding Wire",qty:30,orderedQty:50,unit:"Kg",receivedBy:"Niranjan",quality:"Good",remark:"Balance 20 Kg pending",grnType:"Partial"},
];

const UNBILLED_DATA=[
  {id:1,source:"PO",ref:"PO-020",supplier:"Lucky Hardware",project:"Bablu Farmhouse",site:"Farmhouse",amount:67200,status:"Awaiting Invoice",date:"07 Mar"},
  {id:2,source:"Manual",ref:"MR-04",supplier:"Vaibhav Traders",project:"Tikendra Residence",site:"Tikendra Site",amount:4000,status:"Awaiting Invoice",date:"05 Mar"},
  {id:3,source:"Direct",ref:"DR-001",supplier:"Ramesh Sand",project:"Amarendra Villa",site:"Amarendra Site",amount:15000,status:"Awaiting Invoice",date:"12 Mar"},
  {id:4,source:"PO",ref:"PO-019",supplier:"Vaibhav Traders",project:"Tikendra Residence",site:"Tikendra Site",amount:4000,status:"Awaiting Invoice",date:"05 Mar"},
];

const PENDING_PAYMENTS_DATA=[
  {id:1,payableNo:"PAY-001",vendor:"Lucky Hardware",project:"Bablu Farmhouse",billableAmount:67200,paidAmount:0,outstanding:67200,invoiceNo:"LH-2025-089",invoiceDate:"10 Mar",dueDate:"2025-03-25",paymentTerms:"Net 15",status:"Invoice Received",urgency:"overdue",daysOverdue:5},
  {id:2,payableNo:"PAY-002",vendor:"Abhay Traders",project:"Esther Risali",billableAmount:182500,paidAmount:50000,outstanding:132500,invoiceNo:"AT-892",invoiceDate:"14 Mar",dueDate:"2025-03-21",paymentTerms:"Net 7",status:"Partially Paid",urgency:"due_today",daysOverdue:0},
  {id:3,payableNo:"PAY-003",vendor:"Rajesh Steel Mart",project:"Shubham & NK 623",billableAmount:315000,paidAmount:0,outstanding:315000,invoiceNo:"RSM-441",invoiceDate:"15 Mar",dueDate:"2025-03-28",paymentTerms:"Net 15",status:"Invoice Received",urgency:"due_this_week",daysOverdue:-7},
  {id:4,payableNo:"PAY-004",vendor:"Shyam Ji Materials",project:"Shubham & NK 623",billableAmount:52500,paidAmount:0,outstanding:52500,invoiceNo:null,invoiceDate:null,dueDate:"2025-04-10",paymentTerms:"Net 30",status:"Invoice Received",urgency:"upcoming",daysOverdue:-20},
];

// ── STATUS META ───────────────────────────────────────────────────────
const PO_STATUS={Open:{c:T.blu,bg:T.bluL,brd:T.bluM},Closed:{c:T.grn,bg:T.grnL,brd:T.grnM},Cancelled:{c:T.red,bg:T.redL,brd:T.redM}};
const APPR_STATUS={Approved:{c:T.grn,bg:T.grnL,brd:T.grnM},Draft:{c:T.amb,bg:T.ambL,brd:T.ambM}};
const RFQ_STATUS={Published:{c:T.blu,bg:T.bluL,brd:T.bluM},Draft:{c:T.slt,bg:T.sltL,brd:T.b2}};

// MR Status meta — 5 statuses
const MR_TABS=[
  {key:"Pending",   label:"Pending",    color:T.amb, bg:T.ambL, brd:T.ambM,  dot:"#F59E0B"},
  {key:"Approved",  label:"Approved",   color:T.blu, bg:T.bluL, brd:T.bluM,  dot:T.blu},
  {key:"Ordered",   label:"Ordered",    color:"#7C3AED", bg:T.purL, brd:T.purM, dot:"#7C3AED"},
  {key:"Received",  label:"Received",   color:T.grn, bg:T.grnL, brd:T.grnM,  dot:T.grn},
  {key:"Rejected",  label:"Rejected",   color:T.red, bg:T.redL, brd:T.redM,  dot:T.red},
];

const URGENCY_META={
  overdue:      {label:"Overdue",       c:T.red,  bg:T.redL,  brd:T.redM},
  due_today:    {label:"Due Today",     c:T.amb,  bg:T.ambL,  brd:T.ambM},
  due_this_week:{label:"Due This Week", c:"#B45309",bg:"#FFFBEB",brd:"#FDE68A"},
  upcoming:     {label:"Upcoming",      c:T.grn,  bg:T.grnL,  brd:T.grnM},
  no_due_date:  {label:"No Due Date",   c:T.slt,  bg:T.sltL,  brd:T.b2},
};

// ── SHARED COMPONENTS ─────────────────────────────────────────────────
const Pill=({label,c,bg,brd})=>(
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${brd||c+"33"}`,whiteSpace:"nowrap"}}>{label}</span>
);
const StatTile=({label,value,sub,color,onClick,active})=>(
  <div onClick={onClick} style={{padding:"13px 15px",background:active?color+"18":T.surface,border:`1.5px solid ${active?color:T.b1}`,borderRadius:8,borderTop:`3px solid ${color}`,boxShadow:active?`0 2px 10px ${color}22`:"0 1px 3px rgba(0,0,0,0.04)",cursor:onClick?"pointer":"default",transition:"all 0.15s",flex:1,minWidth:120}}>
    <div style={{fontSize:10,color:active?color:T.t3,fontWeight:600,letterSpacing:".5px",textTransform:"uppercase",marginBottom:5}}>{label}</div>
    <div style={{fontSize:22,fontWeight:700,color:active?color:T.t1,letterSpacing:"-.5px",lineHeight:1}}>{value}</div>
    <div style={{fontSize:11,color:active?color:T.t4,marginTop:4}}>{sub}</div>
  </div>
);

// ── MODAL SHELL ───────────────────────────────────────────────────────
function Modal({onClose,width=480,children}){
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.38)",zIndex:300,backdropFilter:"blur(2px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 24px 64px rgba(0,0,0,0.22)",zIndex:301,width,fontFamily:"'Segoe UI',sans-serif",overflow:"hidden",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
      {children}
    </div>
  </>);
}
const ModalHeader=({title,sub,onClose})=>(
  <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
    <div><div style={{fontSize:14,fontWeight:700,color:"white"}}>{title}</div>{sub&&<div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>{sub}</div>}</div>
    <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
  </div>
);
const ModalBody=({children,style={}})=>(
  <div style={{flex:1,overflowY:"auto",padding:"16px 18px",...style}}>{children}</div>
);
const ModalFooter=({children})=>(
  <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:8,flexShrink:0}}>{children}</div>
);
const Btn=({onClick,disabled,color=T.blu,bg,children,icon,outline,full,small})=>{
  const bStyle={display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:small?"5px 11px":"9px 16px",borderRadius:7,fontSize:small?11:12.5,fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,border:"none",transition:"opacity 0.15s",width:full?"100%":undefined};
  if(outline) return <button onClick={onClick} disabled={disabled} style={{...bStyle,background:bg||color+"15",color,border:`1px solid ${color}44`}}>{icon&&<span style={{display:"flex"}}>{icon}</span>}{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={{...bStyle,background:disabled?T.b1:color,color:"white"}}>{icon&&<span style={{display:"flex"}}>{icon}</span>}{children}</button>;
};
const Field=({label,children,required})=>(
  <div><label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>{label}{required&&<span style={{color:T.red}}> *</span>}</label>{children}</div>
);
const Input=({value,onChange,placeholder,type="text",min})=>(
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min}
    style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
    onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
);
const Select=({value,onChange,children})=>(
  <select value={value} onChange={onChange}
    style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
    {children}
  </select>
);

// ── MANUAL ORDER MODAL ─────────────────────────────────────────────────
function ManualOrderModal({mr,onSave,onClose}){
  const [vendor,setVendor]=useState(mr.vendor||"");
  const [delivery,setDelivery]=useState("");
  const [amount,setAmount]=useState("");
  const [challan,setChallan]=useState("");
  const [custom,setCustom]=useState("");
  const finalVendor=vendor==="Other"?custom:vendor;
  const waText=`GB Buildcon Order\n${mr.item} - ${mr.qty} ${mr.unit}\nSite: ${mr.project}\nDelivery by: ${delivery||"TBD"}\nPlease confirm. — Admin`;
  return(
    <Modal onClose={onClose} width={420}>
      <ModalHeader title="Mark as Ordered" sub={`${mr.id} · ${mr.item}`} onClose={onClose}/>
      <ModalBody>
        <div style={{background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,padding:"9px 12px",marginBottom:14,fontSize:11.5,color:T.amb}}>
          <strong>No PO created.</strong> Manually marking as ordered via Call / WhatsApp.
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="Select Vendor" required>
            <Select value={vendor} onChange={e=>setVendor(e.target.value)}>
              <option value="">-- Select vendor --</option>
              {VENDORS.map(v=><option key={v}>{v}</option>)}
              <option value="Other">Other (type below)</option>
            </Select>
          </Field>
          {vendor==="Other"&&<Field label="Vendor Name"><Input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Enter vendor name..."/></Field>}
          <Field label="Expected Delivery Date" required>
            <Input type="date" value={delivery} onChange={e=>setDelivery(e.target.value)}/>
          </Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Approx. Amount (₹)">
              <Input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 38000"/>
            </Field>
            <Field label="Challan No. (if any)">
              <Input value={challan} onChange={e=>setChallan(e.target.value)} placeholder="e.g. DC-1234"/>
            </Field>
          </div>
          {finalVendor&&(
            <div style={{background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:7,padding:"10px 12px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:11,fontWeight:600,color:T.grn}}>WhatsApp Template</span>
                <button onClick={()=>{const num=prompt("Vendor phone number (10 digits):");if(num)window.open(`https://wa.me/91${num.replace(/\D/g,"")}?text=${encodeURIComponent(waText)}`)}}
                  style={{display:"flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:5,background:"#25D366",border:"none",color:"white",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                  <IcWA size={11} color="white"/> Send WA
                </button>
              </div>
              <div style={{fontSize:10.5,color:T.grn,whiteSpace:"pre-line",lineHeight:1.6}}>{waText}</div>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={()=>onSave(mr.id,finalVendor,delivery,amount,challan)} disabled={!finalVendor||!delivery} color={T.amb} full icon={<IcTruck size={14} color="white"/>}>Mark as Ordered</Btn>
      </ModalFooter>
    </Modal>
  );
}

// ── DIRECT RECEIPT MODAL (Case 3 — NEW) ──────────────────────────────
function DirectReceiptModal({onSave,onClose}){
  const [form,setForm]=useState({project:PROJECTS[0],supplier:"",phone:"",item:"",qty:"",unit:"Bags",challan:"",receivedBy:"",date:"",approxAmount:"",notes:""});
  const upd=(k,v)=>setForm(p=>({...p,[k]:v}));
  return(
    <Modal onClose={onClose} width={520}>
      <ModalHeader title="Direct Receipt Entry" sub="Case 3 — No MR / No PO" onClose={onClose}/>
      <ModalBody>
        <div style={{background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,padding:"9px 12px",marginBottom:14,fontSize:11.5,color:T.amb}}>
          Site team ne directly material receive kiya. Ye entry Finance Unbilled mein jayegi.
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <Field label="Project" required>
            <Select value={form.project} onChange={e=>upd("project",e.target.value)}>
              {PROJECTS.map(p=><option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Received Date" required>
            <Input type="date" value={form.date} onChange={e=>upd("date",e.target.value)}/>
          </Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <Field label="Supplier Name" required>
            <Input value={form.supplier} onChange={e=>upd("supplier",e.target.value)} placeholder="e.g. Ramesh Sand Traders"/>
          </Field>
          <Field label="Supplier Phone">
            <Input value={form.phone} onChange={e=>upd("phone",e.target.value)} placeholder="9876543210"/>
          </Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:12}}>
          <Field label="Item / Material" required>
            <Input value={form.item} onChange={e=>upd("item",e.target.value)} placeholder="e.g. River Sand"/>
          </Field>
          <Field label="Quantity" required>
            <Input type="number" value={form.qty} onChange={e=>upd("qty",e.target.value)} placeholder="15"/>
          </Field>
          <Field label="Unit">
            <Select value={form.unit} onChange={e=>upd("unit",e.target.value)}>
              {UNITS.map(u=><option key={u}>{u}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <Field label="Challan No.">
            <Input value={form.challan} onChange={e=>upd("challan",e.target.value)} placeholder="e.g. DC-2025-001"/>
          </Field>
          <Field label="Approx. Amount (₹)">
            <Input type="number" value={form.approxAmount} onChange={e=>upd("approxAmount",e.target.value)} placeholder="e.g. 15000"/>
          </Field>
        </div>
        <Field label="Received By">
          <Input value={form.receivedBy} onChange={e=>upd("receivedBy",e.target.value)} placeholder="Site supervisor name"/>
        </Field>
        <div style={{marginTop:10}}>
          <Field label="Notes (Optional)">
            <textarea value={form.notes} onChange={e=>upd("notes",e.target.value)} rows={2} placeholder="Any remarks..."
              style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
          </Field>
        </div>
      </ModalBody>
      <ModalFooter>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={()=>onSave(form)} disabled={!form.supplier||!form.item||!form.qty||!form.date} color={T.grn} full icon={<IcReceipt size={14} color="white"/>}>Save Receipt → Unbilled</Btn>
      </ModalFooter>
    </Modal>
  );
}

// ── MARK RECEIVED MODAL ───────────────────────────────────────────────
function MarkReceivedModal({mr,onSave,onClose}){
  const [challan,setChallan]=useState("");
  const [receivedQty,setReceivedQty]=useState(String(mr.qty));
  const isPartial=parseFloat(receivedQty)<mr.qty;
  return(
    <Modal onClose={onClose} width={400}>
      <ModalHeader title="Mark as Received" sub={`${mr.id} · ${mr.item}`} onClose={onClose}/>
      <ModalBody>
        <div style={{background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:7,padding:"9px 12px",marginBottom:14}}>
          <div style={{fontSize:11.5,fontWeight:600,color:T.grn,marginBottom:2}}>Delivery at site confirm karo</div>
          <div style={{fontSize:11,color:T.grn}}>Ordered: <strong>{mr.qty} {mr.unit}</strong> from {mr.vendor||"vendor"}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="Quantity Received" required>
            <Input type="number" value={receivedQty} onChange={e=>setReceivedQty(e.target.value)} placeholder={String(mr.qty)}/>
            {isPartial&&parseFloat(receivedQty)>0&&(
              <div style={{marginTop:5,display:"flex",alignItems:"center",gap:6,padding:"5px 9px",background:T.ambL,borderRadius:5,border:`1px solid ${T.ambM}`}}>
                <IcHalf size={12} color={T.amb}/>
                <span style={{fontSize:10.5,color:T.amb,fontWeight:500}}>Partial receipt — {mr.qty-parseFloat(receivedQty)} {mr.unit} baaki rahega</span>
              </div>
            )}
          </Field>
          <Field label="Challan No." required>
            <Input value={challan} onChange={e=>setChallan(e.target.value)} placeholder="Supplier ka challan/DC number"/>
          </Field>
        </div>
      </ModalBody>
      <ModalFooter>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={()=>onSave(mr.id,receivedQty,challan)} disabled={!receivedQty||!challan} color={T.grn} full icon={<IcChk size={14} color="white"/>}>
          {isPartial?"Mark Partial Received":"Mark Fully Received"}
        </Btn>
      </ModalFooter>
    </Modal>
  );
}

// ── GRN MODAL (with partial support + challan) ────────────────────────
function GRNModal({po,onClose,onSave}){
  const [challan,setChallan]=useState("");
  const [received,setReceived]=useState(po.items.map(it=>({qty:String(it.qty),quality:"Good",remark:""})));
  const isPartial=received.some((r,i)=>parseFloat(r.qty)<po.items[i].qty);
  return(
    <Modal onClose={onClose} width={520}>
      <ModalHeader title="Goods Receipt Note" sub={`${po.id} · ${po.vendor}`} onClose={onClose}/>
      <ModalBody>
        <div style={{marginBottom:12}}>
          <Field label="Challan / DC Number" required>
            <Input value={challan} onChange={e=>setChallan(e.target.value)} placeholder="Vendor ka delivery challan no."/>
          </Field>
        </div>
        {po.items.map((it,i)=>(
          <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:10}}>
            <div style={{fontSize:12.5,fontWeight:600,color:T.t1,marginBottom:10}}>
              {it.desc} <span style={{fontSize:11,color:T.t4,fontWeight:400}}>({it.qty} {it.unit} ordered)</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Qty Received</label>
                <input type="number" value={received[i].qty} onChange={e=>{const r=[...received];r[i]={...r[i],qty:e.target.value};setReceived(r);}}
                  max={it.qty}
                  style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                {parseFloat(received[i].qty)<it.qty&&parseFloat(received[i].qty)>0&&(
                  <div style={{fontSize:9.5,color:T.amb,marginTop:3}}>Partial — {it.qty-parseFloat(received[i].qty)} {it.unit} pending</div>
                )}
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
                <input value={received[i].remark} onChange={e=>{const r=[...received];r[i]={...r[i],remark:e.target.value};setReceived(r);}} placeholder="Optional..."
                  style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
            </div>
          </div>
        ))}
        {isPartial&&(
          <div style={{padding:"9px 12px",background:T.ambL,borderRadius:7,border:`1px solid ${T.ambM}`,display:"flex",alignItems:"center",gap:8}}>
            <IcAlert size={14} color={T.amb}/>
            <span style={{fontSize:11.5,color:T.amb,fontWeight:500}}>Partial GRN — PO open rahega, baaki delivery ke liye doosra GRN banega</span>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={()=>onSave(po.id,challan,received)} disabled={!challan} color={T.grn} full icon={<IcGRN size={14} color="white"/>}>
          {isPartial?"Confirm Partial GRN":"Confirm Full GRN"}
        </Btn>
      </ModalFooter>
    </Modal>
  );
}

// ── BILL ENTRY MODAL (NEW — with due_date) ────────────────────────────
function BillEntryModal({item,onSave,onClose}){
  const [form,setForm]=useState({invoiceNo:"",invoiceDate:"",invoiceAmount:String(item.amount||""),dueDate:"",paymentTerms:"",notes:""});
  const upd=(k,v)=>setForm(p=>({...p,[k]:v}));
  const quickDue=(days)=>{if(form.invoiceDate)upd("dueDate",calcDueDate(form.invoiceDate,days));};
  const varAmount=form.invoiceAmount&&item.amount?parseFloat(form.invoiceAmount)-item.amount:0;
  return(
    <Modal onClose={onClose} width={500}>
      <ModalHeader title="Bill Entry" sub={`${item.ref} · ${item.supplier}`} onClose={onClose}/>
      <ModalBody>
        <div style={{background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,padding:"10px 12px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{item.supplier}</div>
              <div style={{fontSize:11,color:T.t3}}>{item.project} · {item.site||"—"}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:T.t4}}>Expected Amount</div>
              <div style={{fontSize:15,fontWeight:700,color:T.t1}}>₹{fmtN(item.amount)}</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Invoice Number" required><Input value={form.invoiceNo} onChange={e=>upd("invoiceNo",e.target.value)} placeholder="e.g. INV-2025-089"/></Field>
            <Field label="Invoice Date" required><Input type="date" value={form.invoiceDate} onChange={e=>upd("invoiceDate",e.target.value)}/></Field>
          </div>
          <Field label="Invoice Amount (₹)" required>
            <Input type="number" value={form.invoiceAmount} onChange={e=>upd("invoiceAmount",e.target.value)} placeholder={String(item.amount)}/>
            {varAmount!==0&&form.invoiceAmount&&(
              <div style={{marginTop:4,padding:"4px 9px",borderRadius:5,background:varAmount>0?T.redL:T.grnL,border:`1px solid ${varAmount>0?T.redM:T.grnM}`,display:"flex",alignItems:"center",gap:6}}>
                <IcAlert size={12} color={varAmount>0?T.red:T.grn}/>
                <span style={{fontSize:10.5,color:varAmount>0?T.red:T.grn,fontWeight:500}}>
                  {varAmount>0?"Rate Variance: vendor ne ₹":"Saved: ₹"}{fmtN(Math.abs(varAmount))}{varAmount>0?" zyada charge kiya — approval needed":"less charged"}
                </span>
              </div>
            )}
          </Field>
          <Field label="Payment Due Date ★" required>
            <Input type="date" value={form.dueDate} onChange={e=>upd("dueDate",e.target.value)} min={form.invoiceDate}/>
            <div style={{display:"flex",gap:5,marginTop:5}}>
              {[7,15,30,45].map(d=>(
                <button key={d} onClick={()=>quickDue(d)}
                  style={{padding:"3px 9px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                  {d} days
                </button>
              ))}
            </div>
          </Field>
          <Field label="Payment Terms">
            <Select value={form.paymentTerms} onChange={e=>upd("paymentTerms",e.target.value)}>
              <option value="">-- Select --</option>
              <option>Immediate</option><option>Net 7</option><option>Net 15</option><option>Net 30</option><option>Net 45</option>
            </Select>
          </Field>
        </div>
      </ModalBody>
      <ModalFooter>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={()=>onSave({...form,payableId:item.id})} disabled={!form.invoiceNo||!form.invoiceDate||!form.dueDate||!form.invoiceAmount} color={T.pur} full icon={<IcChk size={14} color="white"/>}>Save Bill → Pending Payments</Btn>
      </ModalFooter>
    </Modal>
  );
}

// ── PAY NOW MODAL (NEW) ───────────────────────────────────────────────
function PayNowModal({item,onSave,onClose}){
  const [form,setForm]=useState({amount:String(item.outstanding),mode:"NEFT",ref:"",date:"",narration:""});
  const upd=(k,v)=>setForm(p=>({...p,[k]:v}));
  const isPartial=parseFloat(form.amount)<item.outstanding;
  return(
    <Modal onClose={onClose} width={420}>
      <ModalHeader title="Record Payment" sub={`${item.payableNo} · ${item.vendor}`} onClose={onClose}/>
      <ModalBody>
        <div style={{background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,padding:"10px 12px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:11.5,fontWeight:600,color:T.t1}}>{item.vendor}</div>
              <div style={{fontSize:11,color:T.t3}}>{item.project}</div>
              {item.invoiceNo&&<div style={{fontSize:10.5,color:T.t4}}>Inv: {item.invoiceNo}</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:T.t4}}>Outstanding</div>
              <div style={{fontSize:16,fontWeight:700,color:T.red}}>₹{fmtN(item.outstanding)}</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="Payment Amount (₹)" required>
            <Input type="number" value={form.amount} onChange={e=>upd("amount",e.target.value)} placeholder={String(item.outstanding)}/>
            {isPartial&&parseFloat(form.amount)>0&&(
              <div style={{marginTop:4,fontSize:10.5,color:T.amb,padding:"3px 8px",background:T.ambL,borderRadius:5,border:`1px solid ${T.ambM}`}}>
                Partial payment — ₹{fmtN(item.outstanding-parseFloat(form.amount))} baaki rahega
              </div>
            )}
          </Field>
          <Field label="Payment Date" required>
            <Input type="date" value={form.date} onChange={e=>upd("date",e.target.value)}/>
          </Field>
          <Field label="Payment Mode" required>
            <Select value={form.mode} onChange={e=>upd("mode",e.target.value)}>
              {["NEFT","RTGS","IMPS","UPI","Cheque","Cash","Bank Transfer"].map(m=><option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label={form.mode==="Cheque"?"Cheque No.":form.mode==="UPI"?"UPI Ref.":"UTR / Reference No."}>
            <Input value={form.ref} onChange={e=>upd("ref",e.target.value)} placeholder={form.mode==="Cheque"?"Cheque number":form.mode==="Cash"?"Not applicable":"UTR number"}/>
          </Field>
          <Field label="Narration (Optional)">
            <Input value={form.narration} onChange={e=>upd("narration",e.target.value)} placeholder="e.g. First installment"/>
          </Field>
        </div>
      </ModalBody>
      <ModalFooter>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={()=>onSave(item.id,form)} disabled={!form.amount||!form.date||!form.mode} color={T.grn} full icon={<IcChk size={14} color="white"/>}>
          {isPartial?"Record Partial Payment":"Mark as Paid"}
        </Btn>
      </ModalFooter>
    </Modal>
  );
}

// ── SHARE MODAL ───────────────────────────────────────────────────────
function ShareModal({rfq,onClose}){
  const [copied,setCopied]=useState(null);
  const fakeLink=`https://gbuildcon.in/rfq/${rfq.id}?token=xK9mP`;
  return(
    <Modal onClose={onClose} width={440}>
      <ModalHeader title="Share Vendor Link" sub={`${rfq.id} · ${rfq.project}`} onClose={onClose}/>
      <ModalBody>
        <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,padding:"9px 12px",marginBottom:14,fontSize:11.5,color:T.blu}}>
          Each vendor gets a unique link to fill their rates directly. No login required.
        </div>
        {rfq.vendors.length===0&&<div style={{fontSize:12,color:T.t4,textAlign:"center",padding:"20px"}}>No vendors added yet.</div>}
        {rfq.vendors.map((v,i)=>(
          <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,marginBottom:8,padding:"10px 12px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{v.name}</span>
              <Pill label={v.status} c={v.status==="Submitted"?T.grn:T.amb} bg={v.status==="Submitted"?T.grnL:T.ambL} brd={v.status==="Submitted"?T.grnM:T.ambM}/>
            </div>
            <div style={{fontSize:10.5,color:T.t4,background:T.surface,borderRadius:5,padding:"6px 9px",fontFamily:"monospace",marginBottom:8,wordBreak:"break-all"}}>{fakeLink}&v={i+1}</div>
            <div style={{display:"flex",gap:6}}>
              {[{Icon:IcWA,label:"WhatsApp",c:"#25D366",bg:"#E8FDF1"},{Icon:IcMail,label:"Email",c:T.blu,bg:T.bluL},{Icon:IcCopy,label:copied===i?"Copied!":"Copy",c:T.slt,bg:T.sltL}].map((btn,j)=>(
                <button key={j} onClick={()=>setCopied(i)}
                  style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,background:btn.bg,border:`1px solid ${btn.c}22`,color:btn.c,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                  <btn.Icon size={12} color="currentColor"/> {btn.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <Btn onClick={onClose} color={T.blu} full>Done</Btn>
      </ModalBody>
    </Modal>
  );
}

// ── PUNCH QUOTE MODAL ─────────────────────────────────────────────────
function PunchQuoteModal({rfq,vendorIndex,onSave,onClose}){
  const vendor=rfq.vendors[vendorIndex];
  const [rates,setRates]=useState(rfq.items.map((_,i)=>({rate:vendor?.rates[i]?.rate||"",remark:vendor?.rates[i]?.remarks||""})));
  return(
    <Modal onClose={onClose} width={480}>
      <ModalHeader title="Punch Quotation" sub={`On behalf of: ${vendor?.name}`} onClose={onClose}/>
      <ModalBody>
        <div style={{background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,padding:"8px 12px",marginBottom:12,fontSize:11.5,color:T.amb}}>Admin is entering rates on vendor's behalf.</div>
        {rfq.items.map((item,i)=>(
          <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:10}}>
            <div style={{fontSize:12.5,fontWeight:600,color:T.t1,marginBottom:2}}>{item.desc}</div>
            <div style={{fontSize:10.5,color:T.t4,marginBottom:10}}>HSN: {item.hsn} · {item.qty} {item.unit}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Rate per {item.unit} (₹)</label>
                <input type="number" value={rates[i].rate} onChange={e=>{const r=[...rates];r[i]={...r[i],rate:e.target.value};setRates(r);}} placeholder="Enter rate..."
                  style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
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
      </ModalBody>
      <ModalFooter>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={()=>onSave(vendorIndex,rates)} color={T.blu} full icon={<IcChk size={14} color="white"/>}>Save Quotation</Btn>
      </ModalFooter>
    </Modal>
  );
}

// ── PO DETAIL DRAWER ──────────────────────────────────────────────────
function PODetailDrawer({po,onClose,onApprove,onShare,onGRN}){
  const apSm=APPR_STATUS[po.approval];const poSm=PO_STATUS[po.poStatus]||PO_STATUS.Open;
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:480,background:T.bg,zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontSize:15,fontWeight:700,color:"white"}}>{po.id}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
        </div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{po.vendor} · {po.project} · {po.date}</div>
        <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
          <Pill label={po.poStatus} c={poSm.c} bg={poSm.bg} brd={poSm.brd}/>
          <Pill label={po.approval} c={apSm.c} bg={apSm.bg} brd={apSm.brd}/>
          <span style={{background:"rgba(255,255,255,0.1)",color:"white",fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20}}>₹{fmtN(po.amount)}</span>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>PO Details</div>
          {[["Vendor",po.vendor],["Delivery Site",po.deliverySite],["Delivery Date",po.delivery],["Linked MR",po.linkedMR],["PO Date",po.date]].map(([k,v])=>(
            <div key={k} style={{display:"flex",padding:"6px 0",borderBottom:`1px solid ${T.b1}`}}>
              <span style={{width:130,fontSize:11.5,color:T.t4,flexShrink:0}}>{k}</span>
              <span style={{fontSize:12,fontWeight:500,color:T.t1}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:10}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}><span style={{fontSize:11,fontWeight:700,color:T.t1}}>Items</span></div>
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
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:7,flexShrink:0,flexWrap:"wrap"}}>
        {po.approval==="Draft"&&<button onClick={()=>onApprove(po.id)} style={{flex:1,padding:"8px",borderRadius:7,background:T.grnL,color:T.grn,border:`1px solid ${T.grnM}`,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><IcApprv size={13} color={T.grn}/> Approve PO</button>}
        <button onClick={()=>onShare(po)} style={{flex:1,padding:"8px",borderRadius:7,background:T.bluL,color:T.blu,border:`1px solid ${T.bluM}`,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><IcShare size={13} color={T.blu}/> Share PO</button>
        {po.poStatus==="Open"&&po.approval==="Approved"&&<button onClick={()=>onGRN(po)} style={{flex:1,padding:"8px",borderRadius:7,background:T.ambL,color:T.amb,border:`1px solid ${T.ambM}`,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><IcGRN size={13} color={T.amb}/> GRN</button>}
      </div>
    </div>
  </>);
}

// ── RFQ DETAIL DRAWER ─────────────────────────────────────────────────
function RFQDetailDrawer({rfq,onClose,onPunch,onLock,onPublish}){
  const getMinMax=(idx)=>{const s=rfq.vendors.filter(v=>v.status==="Submitted"&&v.rates[idx]?.rate!=null);if(!s.length)return{min:null,max:null};const r=s.map(v=>v.rates[idx].rate);return{min:Math.min(...r),max:Math.max(...r)};};
  const totalByVendor=(v)=>rfq.items.reduce((s,it,i)=>s+(v.rates[i]?.rate||0)*it.qty,0);
  const allTotals=rfq.vendors.filter(v=>v.status==="Submitted").map(v=>totalByVendor(v));
  const minTotal=Math.min(...allTotals);const maxTotal=Math.max(...allTotals);
  const rs=RFQ_STATUS[rfq.status]||RFQ_STATUS.Draft;
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:680,background:T.bg,zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontSize:15,fontWeight:700,color:"white"}}>{rfq.id} · {rfq.project}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <Pill label={rfq.status} c={rs.c} bg={rs.bg} brd={rs.brd}/>
          {rfq.bidEnd&&<span style={{fontSize:10.5,color:"rgba(255,255,255,0.5)"}}>Bidding: {rfq.bidStart} → {rfq.bidEnd}</span>}
          {rfq.locked&&<span style={{background:"rgba(5,150,105,0.25)",color:"#6EE7B7",fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20}}>Locked: {rfq.locked}</span>}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}><span style={{fontSize:11,fontWeight:700,color:T.t1}}>Items</span></div>
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
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,fontWeight:700,color:T.t1}}>Rate Comparison</span>
            <div style={{display:"flex",gap:6}}>
              <span style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:T.grn}}><span style={{width:8,height:8,borderRadius:2,background:T.grn,display:"inline-block"}}/>Cheapest</span>
              <span style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:T.red}}><span style={{width:8,height:8,borderRadius:2,background:T.red,display:"inline-block"}}/>Expensive</span>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:`140px repeat(${rfq.items.length},1fr) 100px`,padding:"6px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
            <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>Vendor</span>
            {rfq.items.map((it,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.desc.split(" ").slice(0,2).join(" ")}</span>)}
            <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:"right"}}>Total</span>
          </div>
          {rfq.vendors.map((v,vi)=>{
            const vTotal=totalByVendor(v);
            const isBest=v.status==="Submitted"&&vTotal===minTotal&&allTotals.length>0;
            const isWorst=v.status==="Submitted"&&vTotal===maxTotal&&allTotals.length>1;
            const isLocked=rfq.locked===v.name;
            return(
              <div key={vi} style={{display:"grid",gridTemplateColumns:`140px repeat(${rfq.items.length},1fr) 100px`,padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:isLocked?"rgba(5,150,105,0.06)":"none",borderLeft:isLocked?`3px solid ${T.grn}`:"3px solid transparent"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:isLocked?T.grn:T.t1}}>{v.name}{isLocked&&<span style={{background:T.grn,color:"white",fontSize:8,padding:"1px 5px",borderRadius:3,marginLeft:5}}>LOCKED</span>}</div>
                  <Pill label={v.status} c={v.status==="Submitted"?T.grn:T.amb} bg={v.status==="Submitted"?T.grnL:T.ambL} brd={v.status==="Submitted"?T.grnM:T.ambM}/>
                </div>
                {rfq.items.map((item,ii)=>{
                  const {min,max}=getMinMax(ii);const rate=v.rates[ii]?.rate;const remark=v.rates[ii]?.remarks;
                  const isCheap=rate!=null&&rate===min&&min!==max;const isExp=rate!=null&&rate===max&&min!==max;
                  return(<div key={ii} style={{padding:"2px 4px"}}>
                    {rate!=null?<div style={{fontSize:13,fontWeight:700,color:isCheap?T.grn:isExp?T.red:T.t1,background:isCheap?T.grnL:isExp?T.redL:"none",borderRadius:5,padding:"2px 6px",display:"inline-block"}}>₹{fmtN(rate)}</div>:<span style={{fontSize:11,color:T.t4}}>—</span>}
                    {remark&&<div style={{fontSize:9.5,color:T.t4,marginTop:1}}>{remark}</div>}
                  </div>);
                })}
                <div style={{textAlign:"right"}}>{v.status==="Submitted"?<span style={{fontSize:13,fontWeight:700,color:isBest?T.grn:isWorst?T.red:T.t1,background:isBest?T.grnL:isWorst?T.redL:"none",padding:"2px 7px",borderRadius:5,display:"inline-block"}}>₹{fmtN(vTotal)}</span>:<span style={{fontSize:11,color:T.t4}}>Pending</span>}</div>
              </div>
            );
          })}
        </div>
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}><span style={{fontSize:11,fontWeight:700,color:T.t1}}>Vendor Actions</span></div>
          {rfq.vendors.map((v,vi)=>(
            <div key={vi} style={{padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:10}}>
              <span style={{flex:1,fontSize:12.5,fontWeight:500,color:T.t1}}>{v.name}</span>
              <button onClick={()=>onPunch(vi)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.purL,border:`1px solid ${T.purM}`,color:T.pur,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcPen size={12} color={T.pur}/> Punch Quote</button>
              {!rfq.locked&&v.status==="Submitted"&&<button onClick={()=>onLock(v.name)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcLock size={12} color={T.grn}/> Lock Quote</button>}
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:7,flexShrink:0}}>
        {rfq.status==="Draft"&&<button onClick={()=>onPublish(rfq.id)} style={{flex:1,padding:"8px",borderRadius:7,background:T.bluL,color:T.blu,border:`1px solid ${T.bluM}`,fontSize:12,fontWeight:600,cursor:"pointer"}}>Publish RFQ</button>}
        {rfq.locked&&<button style={{flex:1,padding:"8px",borderRadius:7,background:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><IcPO size={13} color="white"/> Create PO from Quote</button>}
        <button onClick={onClose} style={{flex:1,padding:"8px",borderRadius:7,background:T.surfaceB,color:T.t3,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,cursor:"pointer"}}>Close</button>
      </div>
    </div>
  </>);
}

// ── CREATE PO MODAL ───────────────────────────────────────────────────
function CreatePOModal({onClose,onSave}){
  const [form,setForm]=useState({vendor:"",project:PROJECTS[0],deliverySite:"",delivery:"",notes:"",items:[{desc:"",hsn:"",qty:"",unit:"Bags",rate:""}]});
  const upd=(k,v)=>setForm(p=>({...p,[k]:v}));
  const updItem=(i,k,v)=>{const its=[...form.items];its[i]={...its[i],[k]:v};setForm(p=>({...p,items:its}));};
  const addItem=()=>setForm(p=>({...p,items:[...p.items,{desc:"",hsn:"",qty:"",unit:"Bags",rate:""}]}));
  const removeItem=(i)=>{if(form.items.length===1)return;const its=[...form.items];its.splice(i,1);setForm(p=>({...p,items:its}));};
  const total=form.items.reduce((s,it)=>s+(Number(it.qty)||0)*(Number(it.rate)||0),0);
  return(
    <Modal onClose={onClose} width={600}>
      <ModalHeader title="Create Purchase Order" sub="Direct PO — no RFQ required" onClose={onClose}/>
      <ModalBody>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <Field label="Vendor" required>
            <Select value={form.vendor} onChange={e=>upd("vendor",e.target.value)}>
              <option value="">Select vendor...</option>{VENDORS.map(v=><option key={v}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Project" required>
            <Select value={form.project} onChange={e=>upd("project",e.target.value)}>{PROJECTS.map(p=><option key={p}>{p}</option>)}</Select>
          </Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <Field label="Delivery Site"><Input value={form.deliverySite} onChange={e=>upd("deliverySite",e.target.value)} placeholder="e.g. Shubham Site"/></Field>
          <Field label="Expected Delivery"><Input type="date" value={form.delivery} onChange={e=>upd("delivery",e.target.value)}/></Field>
        </div>
        <div style={{marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <label style={{fontSize:10.5,fontWeight:700,color:T.t2,textTransform:"uppercase",letterSpacing:"0.5px"}}>Items</label>
          <button onClick={addItem} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcAdd size={12} color={T.blu}/> Add Item</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"2.2fr 70px 70px 70px 80px 28px",gap:6,marginBottom:6}}>
          {["Description","HSN","Qty","Unit","Rate (₹)",""].map((h,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
        </div>
        {form.items.map((it,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"2.2fr 70px 70px 70px 80px 28px",gap:6,marginBottom:7,alignItems:"center"}}>
            <input value={it.desc} onChange={e=>updItem(i,"desc",e.target.value)} placeholder="Material name..." style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            <input value={it.hsn} onChange={e=>updItem(i,"hsn",e.target.value)} placeholder="HSN" style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            <input type="number" value={it.qty} onChange={e=>updItem(i,"qty",e.target.value)} placeholder="Qty" style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            <select value={it.unit} onChange={e=>updItem(i,"unit",e.target.value)} style={{padding:"7px 6px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>{UNITS.map(u=><option key={u}>{u}</option>)}</select>
            <input type="number" value={it.rate} onChange={e=>updItem(i,"rate",e.target.value)} placeholder="Rate" style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            <button onClick={()=>removeItem(i)} style={{width:26,height:26,borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcX size={12} color={T.red}/></button>
          </div>
        ))}
        {total>0&&<div style={{display:"flex",justifyContent:"flex-end",padding:"8px 10px",background:T.bluL,borderRadius:7,border:`1px solid ${T.bluM}`,marginTop:8}}><span style={{fontSize:12,fontWeight:600,color:T.t3,marginRight:12}}>PO Total</span><span style={{fontSize:15,fontWeight:700,color:T.blu}}>₹{total.toLocaleString("en-IN")}</span></div>}
        <div style={{marginTop:12}}><Field label="Notes"><textarea value={form.notes} onChange={e=>upd("notes",e.target.value)} rows={2} placeholder="Special instructions..." style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/></Field></div>
      </ModalBody>
      <ModalFooter>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={()=>{if(!form.vendor||!form.project||total===0)return;const newPO={id:`PO-${String(Math.floor(Math.random()*900)+100)}`,date:"Today",vendor:form.vendor,project:form.project,deliverySite:form.deliverySite||form.project,poStatus:"Open",approval:"Draft",amount:total,items:form.items.filter(it=>it.desc).map(it=>({desc:it.desc,hsn:it.hsn||"—",qty:Number(it.qty)||0,unit:it.unit,rate:Number(it.rate)||0,amount:(Number(it.qty)||0)*(Number(it.rate)||0)})),linkedMR:"—",delivery:form.delivery||"TBD"};onSave(newPO);}} disabled={!form.vendor||!form.project||total===0} color={T.blu} full icon={<IcPO size={14} color="white"/>}>Create PO (Draft)</Btn>
      </ModalFooter>
    </Modal>
  );
}

// ── MR CARD COMPONENT ────────────────────────────────────────────────
function MRCard({m,onMarkOrdered,onMarkReceived,onApprove,onReject}){
  const pct=m.receivedQty&&m.orderedQty?Math.round((m.receivedQty/m.orderedQty)*100):null;
  const isPartial=m.matStatus==="PartialReceived";

  const borderColor={
    Pending:T.amb, Approved:T.blu, Ordered:"#7C3AED",
    Received:T.grn, PartialReceived:"#059669", Rejected:T.red
  }[m.matStatus]||T.slt;

  return(
    <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",transition:"box-shadow 0.15s",borderLeft:`4px solid ${borderColor}`}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.1)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)"}>
      {/* Header */}
      <div style={{padding:"10px 13px 8px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
              <span style={{fontSize:10.5,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{m.id}</span>
              {/* MR approval status */}
              {m.mrStatus==="Pending"&&<span style={{fontSize:9.5,fontWeight:600,padding:"1px 6px",borderRadius:10,background:T.ambL,color:T.amb,border:`1px solid ${T.ambM}`}}>Awaiting Approval</span>}
              {m.mrStatus==="Rejected"&&<span style={{fontSize:9.5,fontWeight:600,padding:"1px 6px",borderRadius:10,background:T.redL,color:T.red,border:`1px solid ${T.redM}`}}>MR Rejected</span>}
              {/* Material status pill */}
              {m.matStatus==="PartialReceived"?(
                <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"#D1FAE5",color:"#065F46",border:"1px solid #A7F3D0"}}>
                  <IcHalf size={10} color="#065F46"/> Partial {pct}%
                </span>
              ):(
                <Pill
                  label={{Pending:"Pending",Approved:"Approved",Ordered:"Ordered",Received:"Received",Rejected:"Rejected"}[m.matStatus]||m.matStatus}
                  c={{Pending:T.amb,Approved:T.blu,Ordered:"#7C3AED",Received:T.grn,Rejected:T.red}[m.matStatus]||T.slt}
                  bg={{Pending:T.ambL,Approved:T.bluL,Ordered:T.purL,Received:T.grnL,Rejected:T.redL}[m.matStatus]||T.sltL}
                  brd={{Pending:T.ambM,Approved:T.bluM,Ordered:T.purM,Received:T.grnM,Rejected:T.redM}[m.matStatus]||T.b2}
                />
              )}
            </div>
            <div style={{fontSize:13,fontWeight:600,color:T.t1,lineHeight:1.3}}>{m.item}</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:15,fontWeight:700,color:T.t1}}>{m.qty} <span style={{fontSize:10,fontWeight:400,color:T.t4}}>{m.unit}</span></div>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div style={{padding:"0 13px 8px",display:"flex",gap:12,flexWrap:"wrap"}}>
        {[m.project,m.requestedBy,m.date].map((v,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:T.t4,flexShrink:0}}/>
            <span style={{fontSize:11,color:T.t3}}>{v}</span>
          </div>
        ))}
      </div>

      {/* Partial received progress bar */}
      {isPartial&&(
        <div style={{margin:"0 13px 10px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:10.5,color:"#065F46",fontWeight:500}}>Received: {m.receivedQty} {m.unit}</span>
            <span style={{fontSize:10.5,color:T.amb,fontWeight:500}}>Pending: {m.orderedQty-m.receivedQty} {m.unit}</span>
          </div>
          <div style={{height:6,background:T.b1,borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg, ${T.grn}, #34D399)`,borderRadius:3,transition:"width 0.5s ease"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
            <span style={{fontSize:9.5,color:T.t4}}>{pct}% received</span>
            {m.vendor&&<span style={{fontSize:9.5,color:T.t4}}>Vendor: {m.vendor}</span>}
          </div>
        </div>
      )}

      {/* Info bands */}
      {m.matStatus==="Ordered"&&m.vendor&&(
        <div style={{margin:"0 13px",marginBottom:10,padding:"7px 10px",background:T.purL,borderRadius:6,border:`1px solid ${T.purM}`,display:"flex",alignItems:"center",gap:8}}>
          <IcTruck size={13} color={T.pur}/>
          <div style={{flex:1}}>
            <div style={{fontSize:11.5,fontWeight:600,color:T.pur}}>{m.vendor}</div>
            <div style={{fontSize:10,color:T.t4}}>ETA: {m.expectedDelivery||"TBD"}</div>
          </div>
        </div>
      )}
      {m.matStatus==="Received"&&(
        <div style={{margin:"0 13px",marginBottom:10,padding:"7px 10px",background:T.grnL,borderRadius:6,border:`1px solid ${T.grnM}`,display:"flex",alignItems:"center",gap:7}}>
          <IcChk size={13} color={T.grn}/>
          <span style={{fontSize:11.5,fontWeight:600,color:T.grn}}>Fully received · GRN done</span>
        </div>
      )}
      {m.matStatus==="Rejected"&&m.rejectedReason&&(
        <div style={{margin:"0 13px",marginBottom:10,padding:"7px 10px",background:T.redL,borderRadius:6,border:`1px solid ${T.redM}`,display:"flex",alignItems:"flex-start",gap:7}}>
          <IcBan size={13} color={T.red} style={{flexShrink:0,marginTop:1}}/>
          <span style={{fontSize:11,color:T.red}}>{m.rejectedReason}</span>
        </div>
      )}

      {/* Action footer */}
      <div style={{padding:"8px 13px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:7,alignItems:"center"}}>
        {/* Pending MR: needs admin approval */}
        {m.mrStatus==="Pending"&&(
          <>
            <button onClick={()=>onApprove(m.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer",flex:1,justifyContent:"center"}}>
              <IcChk size={12} color={T.grn}/> Approve MR
            </button>
            <button onClick={()=>onReject(m.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:600,cursor:"pointer",flex:1,justifyContent:"center"}}>
              <IcX size={12} color={T.red}/> Reject
            </button>
          </>
        )}
        {/* Approved: ready to order */}
        {m.mrStatus==="Approved"&&m.matStatus==="Pending"&&(
          <>
            <button onClick={()=>onMarkOrdered(m)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:600,cursor:"pointer",flex:1,justifyContent:"center"}}>
              <IcEdit size={12} color={T.amb}/> Mark Ordered
            </button>
            <button style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer",flex:1,justifyContent:"center"}}>
              <IcRFQ size={12} color={T.blu}/> Create RFQ
            </button>
          </>
        )}
        {/* Ordered: waiting delivery */}
        {m.matStatus==="Ordered"&&(
          <>
            <span style={{fontSize:11,color:T.pur,flex:1,fontWeight:500}}>Ordered — awaiting delivery</span>
            <button onClick={()=>onMarkReceived(m)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}>
              <IcChk size={12} color={T.grn}/> Received
            </button>
          </>
        )}
        {/* Partial received: more coming */}
        {m.matStatus==="PartialReceived"&&(
          <>
            <span style={{fontSize:11,color:"#065F46",flex:1,fontWeight:500}}>Partial — next delivery pending</span>
            <button onClick={()=>onMarkReceived(m)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}>
              <IcChk size={12} color={T.grn}/> Update Receipt
            </button>
          </>
        )}
        {m.matStatus==="Received"&&<span style={{fontSize:11,color:T.grn,fontWeight:600,flex:1}}>GRN completed</span>}
        {m.mrStatus==="Rejected"&&<span style={{fontSize:11,color:T.red,flex:1,fontWeight:500}}>MR rejected — raise new MR if needed</span>}
      </div>
    </div>
  );
}

// ── MAIN PROCUREMENT MODULE ───────────────────────────────────────────
function ProcurementModule(){
  const [tab,setTab]=useState("po");
  const [pos,setPOs]=useState(PO_DATA);
  const [rfqs,setRFQs]=useState(RFQ_DATA);
  const [mrs,setMRs]=useState(MR_DATA);
  const [unbilled,setUnbilled]=useState(UNBILLED_DATA);
  const [pendingPayments,setPendingPayments]=useState(PENDING_PAYMENTS_DATA);

  // PO tab state
  const [poSearch,setPoSearch]=useState("");
  const [poStatus,setPoStatus]=useState("All");
  const [poApproval,setPoApproval]=useState("All");
  const [selPO,setSelPO]=useState(null);
  const [shareTarget,setShareTarget]=useState(null);
  const [grnTarget,setGrnTarget]=useState(null);

  // RFQ state
  const [selRFQ,setSelRFQ]=useState(null);
  const [shareRFQ,setShareRFQ]=useState(null);
  const [punchTarget,setPunchTarget]=useState(null);
  const [punchVendorIdx,setPunchVendorIdx]=useState(null);

  // MR tab state
  const [mrTab,setMrTab]=useState("Pending");
  const [mrProject,setMrProject]=useState("All");
  const [mrSearch,setMrSearch]=useState("");
  const [manualOrderTarget,setManualOrderTarget]=useState(null);
  const [markReceivedTarget,setMarkReceivedTarget]=useState(null);

  // Finance tabs state
  const [billEntryTarget,setBillEntryTarget]=useState(null);
  const [payNowTarget,setPayNowTarget]=useState(null);
  const [ppUrgency,setPpUrgency]=useState("All");

  // Misc
  const [viewMode,setViewMode]=useState("tile");
  const [showCreatePO,setShowCreatePO]=useState(false);
  const [showDirectReceipt,setShowDirectReceipt]=useState(false);

  // Computed
  const pendingMRs=mrs.filter(m=>m.mrStatus==="Approved"&&m.matStatus==="Pending").length;
  const overdueCount=pendingPayments.filter(p=>p.urgency==="overdue").length;
  const dueTodayCount=pendingPayments.filter(p=>p.urgency==="due_today").length;

  const filteredPOs=pos.filter(p=>{
    if(poSearch&&!p.id.toLowerCase().includes(poSearch.toLowerCase())&&!p.vendor.toLowerCase().includes(poSearch.toLowerCase())&&!p.project.toLowerCase().includes(poSearch.toLowerCase()))return false;
    if(poStatus!=="All"&&p.poStatus!==poStatus)return false;
    if(poApproval!=="All"&&p.approval!==poApproval)return false;
    return true;
  });

  // MR tab filter: map tab key to mrStatus or matStatus
  const filteredMRs=mrs.filter(m=>{
    const tabKey=mrTab;
    if(tabKey==="Pending"&&!(m.mrStatus==="Pending"))return false;
    if(tabKey==="Approved"&&!(m.mrStatus==="Approved"&&m.matStatus==="Pending"))return false;
    if(tabKey==="Ordered"&&!(m.matStatus==="Ordered"))return false;
    if(tabKey==="Received"&&!(m.matStatus==="Received"||m.matStatus==="PartialReceived"))return false;
    if(tabKey==="Rejected"&&!(m.mrStatus==="Rejected"))return false;
    if(mrProject!=="All"&&m.project!==mrProject)return false;
    if(mrSearch&&!m.item.toLowerCase().includes(mrSearch.toLowerCase()))return false;
    return true;
  });

  const filteredPP=pendingPayments.filter(p=>ppUrgency==="All"||p.urgency===ppUrgency);

  // Actions
  const approvePO=(id)=>setPOs(prev=>prev.map(p=>p.id===id?{...p,approval:"Approved"}:p));
  const lockRFQ=(rfqId,vendorName)=>setRFQs(prev=>prev.map(r=>r.id===rfqId?{...r,locked:vendorName}:r));
  const publishRFQ=(rfqId)=>setRFQs(prev=>prev.map(r=>r.id===rfqId?{...r,status:"Published",bidStart:"Today",bidEnd:"+5 days"}:r));
  const savePunch=(rfqId,vendorIdx,rates)=>{
    setRFQs(prev=>prev.map(r=>{
      if(r.id!==rfqId)return r;
      const nv=[...r.vendors];
      nv[vendorIdx]={...nv[vendorIdx],status:"Submitted",rates:rates.map(rt=>({rate:Number(rt.rate)||null,remarks:rt.remark}))};
      return{...r,vendors:nv};
    }));
    setPunchTarget(null);setPunchVendorIdx(null);
  };
  const saveManualOrder=(mrId,vendor,delivery,amount,challan)=>{
    setMRs(prev=>prev.map(m=>m.id===mrId?{...m,matStatus:"Ordered",mrStatus:"Approved",vendor,expectedDelivery:delivery,approxAmount:amount,challan}:m));
    setManualOrderTarget(null);
    setMrTab("Ordered");
  };
  const saveMarkReceived=(mrId,receivedQty,challan)=>{
    setMRs(prev=>prev.map(m=>{
      if(m.id!==mrId)return m;
      const rQty=parseFloat(receivedQty);
      const isPartial=rQty<m.qty;
      return{...m,matStatus:isPartial?"PartialReceived":"Received",receivedQty:rQty,orderedQty:m.qty,challan};
    }));
    // Add to unbilled
    const m=mrs.find(x=>x.id===mrId);
    if(m){
      const newEntry={id:Date.now(),source:"Manual",ref:mrId,supplier:m.vendor||"Unknown",project:m.project,site:m.project,amount:m.approxAmount||0,status:"Awaiting Invoice",date:"Today"};
      setUnbilled(prev=>[newEntry,...prev]);
    }
    setMarkReceivedTarget(null);
    setMrTab("Received");
  };
  const approveMR=(id)=>setMRs(prev=>prev.map(m=>m.id===id?{...m,mrStatus:"Approved"}:m));
  const rejectMR=(id)=>{
    const reason=prompt("Reason for rejection:");
    if(reason!==null)setMRs(prev=>prev.map(m=>m.id===id?{...m,mrStatus:"Rejected",rejectedReason:reason||"Rejected by admin"}:m));
  };
  const saveGRN=(poId,challan,received)=>{
    const isPartial=received.some((r,i)=>parseFloat(r.qty)<pos.find(p=>p.id===poId)?.items[i]?.qty);
    if(!isPartial)setPOs(prev=>prev.map(p=>p.id===poId?{...p,poStatus:"Closed"}:p));
    const po=pos.find(p=>p.id===poId);
    if(po){
      const newEntry={id:Date.now(),source:"PO",ref:po.id,supplier:po.vendor,project:po.project,site:po.deliverySite,amount:po.amount,status:"Awaiting Invoice",date:"Today"};
      setUnbilled(prev=>[newEntry,...prev]);
    }
    setGrnTarget(null);
  };
  const saveBillEntry=(data)=>{
    setUnbilled(prev=>prev.filter(u=>u.id!==data.payableId));
    const newPP={id:Date.now(),payableNo:`PAY-${String(pendingPayments.length+1).padStart(3,"0")}`,vendor:unbilled.find(u=>u.id===data.payableId)?.supplier||"—",project:unbilled.find(u=>u.id===data.payableId)?.project||"—",billableAmount:parseFloat(data.invoiceAmount),paidAmount:0,outstanding:parseFloat(data.invoiceAmount),invoiceNo:data.invoiceNo,invoiceDate:data.invoiceDate,dueDate:data.dueDate,paymentTerms:data.paymentTerms,status:"Invoice Received",urgency:"upcoming",daysOverdue:-30};
    setPendingPayments(prev=>[newPP,...prev]);
    setBillEntryTarget(null);
    setTab("pending");
  };
  const savePayment=(ppId,form)=>{
    setPendingPayments(prev=>prev.map(p=>{
      if(p.id!==ppId)return p;
      const newPaid=p.paidAmount+parseFloat(form.amount);
      const newOutstanding=p.outstanding-parseFloat(form.amount);
      return{...p,paidAmount:newPaid,outstanding:Math.max(0,newOutstanding),status:newOutstanding<=0?"Paid":"Partially Paid"};
    }).filter(p=>p.status!=="Paid"));
    setPayNowTarget(null);
  };
  const saveDirectReceipt=(form)=>{
    const newEntry={id:Date.now(),source:"Direct",ref:`DR-${String(Date.now()).slice(-3)}`,supplier:form.supplier,project:form.project,site:form.project,amount:parseFloat(form.approxAmount)||0,status:"Awaiting Invoice",date:"Today"};
    setUnbilled(prev=>[newEntry,...prev]);
    setShowDirectReceipt(false);
    setTab("unbilled");
  };

  // Tab counts
  const mrTabCounts={
    Pending:mrs.filter(m=>m.mrStatus==="Pending").length,
    Approved:mrs.filter(m=>m.mrStatus==="Approved"&&m.matStatus==="Pending").length,
    Ordered:mrs.filter(m=>m.matStatus==="Ordered").length,
    Received:mrs.filter(m=>m.matStatus==="Received"||m.matStatus==="PartialReceived").length,
    Rejected:mrs.filter(m=>m.mrStatus==="Rejected").length,
  };

  const MAIN_TABS=[
    {id:"po",l:`Purchase Orders${pos.filter(p=>p.approval==="Draft").length>0?` · ${pos.filter(p=>p.approval==="Draft").length}`:""}`},
    {id:"rfq",l:`RFQ${rfqs.filter(r=>r.status==="Published").length>0?` · ${rfqs.filter(r=>r.status==="Published").length}`:""}`},
    {id:"mr",l:`Material Requests${pendingMRs>0?` · ${pendingMRs}`:""}`},
    {id:"unbilled",l:`Unbilled${unbilled.length>0?` · ${unbilled.length}`:""}`},
    {id:"pending",l:`Pending Payments${overdueCount>0?` · ${overdueCount} Overdue`:dueTodayCount>0?` · ${dueTodayCount} Today`:""}`},
  ];

  const TILE_SETS={
    po:[{l:"Total POs",v:pos.length,sub:`${pos.filter(p=>p.poStatus==="Open").length} open`,c:T.blu},{l:"Pending Approval",v:pos.filter(p=>p.approval==="Draft").length,sub:"Need sign-off",c:T.amb},{l:"PO Value",v:`₹${fmt(pos.reduce((s,p)=>s+p.amount,0))}`,sub:"All orders",c:T.grn},{l:"Open MRs",v:pendingMRs,sub:"Need ordering",c:T.red}],
    rfq:[{l:"Active RFQs",v:rfqs.filter(r=>r.status==="Published").length,sub:"Live bidding",c:T.blu},{l:"Draft RFQs",v:rfqs.filter(r=>r.status==="Draft").length,sub:"Not published",c:T.slt},{l:"Locked Quotes",v:rfqs.filter(r=>r.locked).length,sub:"Ready for PO",c:T.grn},{l:"Pending Response",v:rfqs.flatMap(r=>r.vendors).filter(v=>v.status==="Pending").length,sub:"Awaiting rates",c:T.amb}],
    mr:[{l:"Pending MRs",v:mrTabCounts.Pending,sub:"Need approval",c:T.amb},{l:"Ready to Order",v:mrTabCounts.Approved,sub:"Approved MRs",c:T.blu},{l:"In Transit",v:mrTabCounts.Ordered,sub:"Ordered",c:"#7C3AED"},{l:"Received",v:mrTabCounts.Received,sub:"At site",c:T.grn}],
    unbilled:[{l:"Unbilled Items",v:unbilled.length,sub:"Awaiting bill entry",c:T.pur},{l:"PO Route",v:unbilled.filter(u=>u.source==="PO").length,sub:"Formal PO",c:T.blu},{l:"Manual Order",v:unbilled.filter(u=>u.source==="Manual").length,sub:"No PO",c:T.grn},{l:"Direct Receipt",v:unbilled.filter(u=>u.source==="Direct").length,sub:"Case 3",c:T.amb}],
    pending:[{l:"Overdue",v:pendingPayments.filter(p=>p.urgency==="overdue").length,sub:`₹${fmt(pendingPayments.filter(p=>p.urgency==="overdue").reduce((s,p)=>s+p.outstanding,0))}`,c:T.red},{l:"Due Today",v:pendingPayments.filter(p=>p.urgency==="due_today").length,sub:"Pay today",c:T.amb},{l:"Due This Week",v:pendingPayments.filter(p=>p.urgency==="due_this_week").length,sub:"In 7 days",c:"#B45309"},{l:"Total Outstanding",v:`₹${fmt(pendingPayments.reduce((s,p)=>s+p.outstanding,0))}`,sub:"All pending",c:T.pur}],
  };
  const curTiles=TILE_SETS[tab]||TILE_SETS.po;

  return(
    <div style={{background:T.bg,height:"100%",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:"hidden"}}>

      {/* Stat tiles */}
      <div style={{padding:"14px 18px 10px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {curTiles.map((s,i)=><StatTile key={i} label={s.l} value={s.v} sub={s.sub} color={s.c}/>)}
        </div>
      </div>

      {/* Dark tab bar */}
      <div style={{margin:"0 18px",flexShrink:0}}>
        <div style={{background:"#0D1B2A",borderRadius:10,padding:"0 10px",display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 10px rgba(0,0,0,0.2)"}}>
          <div style={{display:"flex",flex:1,overflowX:"auto"}}>
            {MAIN_TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{padding:"11px 14px",border:"none",background:"none",fontSize:12,fontWeight:tab===t.id?600:400,color:tab===t.id?"white":"rgba(255,255,255,0.45)",cursor:"pointer",borderBottom:tab===t.id?"2px solid #2563EB":"2px solid transparent",transition:"all 0.15s",whiteSpace:"nowrap",flexShrink:0}}>
                {t.l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:5,padding:"6px 0",alignItems:"center",flexShrink:0}}>
            <div style={{display:"flex",background:"rgba(255,255,255,0.07)",borderRadius:6,border:"1px solid rgba(255,255,255,0.15)",overflow:"hidden"}}>
              {["tile","list"].map(m=>(
                <button key={m} onClick={()=>setViewMode(m)} title={m==="tile"?"Card view":"List view"}
                  style={{display:"flex",alignItems:"center",padding:"5px 8px",border:"none",background:viewMode===m?"rgba(37,99,235,0.55)":"none",cursor:"pointer"}}>
                  {m==="tile"?<IcGrid size={14} color={viewMode===m?"white":"rgba(255,255,255,0.45)"}/>:<IcListV size={14} color={viewMode===m?"white":"rgba(255,255,255,0.45)"}/>}
                </button>
              ))}
            </div>
            {tab==="po"&&<button onClick={()=>setShowCreatePO(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}><IcAdd size={13} color="white"/> Create PO</button>}
            {tab==="rfq"&&<button style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}><IcAdd size={13} color="white"/> New RFQ</button>}
            {tab==="unbilled"&&<button onClick={()=>setShowDirectReceipt(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:T.amb,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}><IcAdd size={13} color="white"/> Direct Receipt</button>}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",padding:"10px 18px 14px"}}>

        {/* ═══ PO TAB ═══ */}
        {tab==="po"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:8,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
              <div style={{position:"relative",flex:1,minWidth:160}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input value={poSearch} onChange={e=>setPoSearch(e.target.value)} placeholder="Search PO#, vendor, project..."
                  style={{width:"100%",height:31,padding:"0 8px 0 27px",borderRadius:6,border:`1.5px solid ${poSearch?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:poSearch?T.bluL:T.surface}}/>
              </div>
              {[{val:poStatus,set:setPoStatus,opts:["All","Open","Closed"],def:"Status"},{val:poApproval,set:setPoApproval,opts:["All","Draft","Approved"],def:"Approval"}].map(({val,set,opts,def},i)=>(
                <div key={i} style={{position:"relative"}}>
                  <select value={val} onChange={e=>set(e.target.value)} style={{height:31,padding:"0 22px 0 9px",borderRadius:6,border:`1.5px solid ${val!=="All"?T.blu:T.b1}`,background:val!=="All"?T.bluL:T.surface,fontSize:11.5,color:val!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:val!=="All"?600:400,minWidth:100,appearance:"none",WebkitAppearance:"none"}}>
                    {opts.map(o=><option key={o} value={o}>{o==="All"?`All ${def}`:o}</option>)}
                  </select>
                  <IcDown size={10} color={T.t4} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
                </div>
              ))}
              <span style={{fontSize:11,color:T.t4}}>{filteredPOs.length} POs</span>
            </div>

            {viewMode==="list"&&(
              <div style={{flex:1,overflowY:"auto",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"90px 160px 1fr 130px 90px 100px 120px 80px",padding:"7px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,position:"sticky",top:0,zIndex:10}}>
                  {["PO#","Vendor","Project","Site","Status","Approval","Amount","Actions"].map((h,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
                </div>
                {filteredPOs.map(po=>{
                  const ps=PO_STATUS[po.poStatus]||PO_STATUS.Open;const as=APPR_STATUS[po.approval];
                  return(<div key={po.id} style={{display:"grid",gridTemplateColumns:"90px 160px 1fr 130px 90px 100px 120px 80px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",borderLeft:po.approval==="Draft"?`3px solid ${T.amb}`:"3px solid transparent"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <button onClick={()=>setSelPO(po)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,color:T.blu,textAlign:"left",padding:0}}>{po.id}</button>
                    <span style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{po.vendor}</span>
                    <span style={{fontSize:11.5,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{po.project}</span>
                    <span style={{fontSize:11.5,color:T.t3}}>{po.deliverySite}</span>
                    <Pill label={po.poStatus} c={ps.c} bg={ps.bg} brd={ps.brd}/>
                    <Pill label={po.approval} c={as.c} bg={as.bg} brd={as.brd}/>
                    <span style={{fontSize:13,fontWeight:600,color:T.t1}}>₹{fmtN(po.amount)}</span>
                    <div style={{display:"flex",gap:4}}>
                      {po.approval==="Draft"&&<button onClick={()=>approvePO(po.id)} title="Approve" style={{width:26,height:26,borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcChk size={13} color={T.grn}/></button>}
                      {po.poStatus==="Open"&&po.approval==="Approved"&&<button onClick={()=>setGrnTarget(po)} title="GRN" style={{width:26,height:26,borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcGRN size={13} color={T.amb}/></button>}
                    </div>
                  </div>);
                })}
                {filteredPOs.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}><IcPO size={32} color={T.b2}/><div style={{marginTop:10,fontSize:13}}>No POs match filters</div></div>}
              </div>
            )}

            {viewMode==="tile"&&(
              <div style={{flex:1,overflowY:"auto"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:10}}>
                  {filteredPOs.map(po=>{
                    const ps=PO_STATUS[po.poStatus]||PO_STATUS.Open;const as=APPR_STATUS[po.approval];
                    const accentColor=po.approval==="Draft"?T.amb:po.poStatus==="Closed"?T.grn:T.blu;
                    return(<div key={po.id} onClick={()=>setSelPO(po)} style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden",cursor:"pointer",transition:"box-shadow 0.15s",borderLeft:`4px solid ${accentColor}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}
                      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.1)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)"}>
                      <div style={{padding:"11px 13px 9px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <span style={{fontSize:12,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{po.id}</span>
                          <Pill label={po.poStatus} c={ps.c} bg={ps.bg} brd={ps.brd}/>
                          <Pill label={po.approval} c={as.c} bg={as.bg} brd={as.brd}/>
                        </div>
                        <div style={{fontSize:13.5,fontWeight:600,color:T.t1,marginBottom:3}}>{po.vendor}</div>
                        <div style={{fontSize:11.5,color:T.t3,marginBottom:8}}>{po.project} · {po.deliverySite}</div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div><div style={{fontSize:10,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",fontWeight:600}}>PO Value</div><div style={{fontSize:18,fontWeight:700,color:T.t1,letterSpacing:"-0.5px"}}>₹{fmtN(po.amount)}</div></div>
                          <div style={{textAlign:"right"}}><div style={{fontSize:10,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",fontWeight:600}}>Delivery</div><div style={{fontSize:12.5,fontWeight:600,color:T.t2}}>{po.delivery}</div></div>
                        </div>
                      </div>
                      <div style={{padding:"7px 13px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:6}}>
                        {po.approval==="Draft"&&<button onClick={e=>{e.stopPropagation();approvePO(po.id);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcChk size={12} color={T.grn}/> Approve</button>}
                        {po.poStatus==="Open"&&po.approval==="Approved"&&<button onClick={e=>{e.stopPropagation();setGrnTarget(po);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcGRN size={12} color={T.amb}/> GRN</button>}
                        <button onClick={e=>{e.stopPropagation();setShareTarget(po);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcShare size={12} color={T.blu}/> Share</button>
                      </div>
                    </div>);
                  })}
                  {filteredPOs.length===0&&<div style={{textAlign:"center",padding:"48px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,color:T.t4,gridColumn:"1/-1"}}><IcPO size={32} color={T.b2}/><div style={{marginTop:10,fontSize:13}}>No POs match filters</div></div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ RFQ TAB ═══ */}
        {tab==="rfq"&&(
          <div style={{flex:1,overflowY:"auto"}}>
            {rfqs.map(rfq=>{
              const rs=RFQ_STATUS[rfq.status]||RFQ_STATUS.Draft;
              const submitted=rfq.vendors.filter(v=>v.status==="Submitted").length;
              return(<div key={rfq.id} style={{background:T.surface,borderRadius:8,border:`1px solid ${rfq.locked?T.grnM:T.b1}`,marginBottom:8,overflow:"hidden",boxShadow:rfq.locked?"0 2px 8px rgba(5,150,105,0.1)":"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",borderLeft:rfq.locked?`3px solid ${T.grn}`:"3px solid transparent"}} onClick={()=>setSelRFQ(rfq)}>
                  <div style={{width:40,height:40,borderRadius:9,background:rs.bg,border:`1px solid ${rs.brd}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><IcRFQ size={18} color={rs.c}/></div>
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
                    <div style={{fontSize:11.5,color:T.t3}}>{submitted}/{rfq.vendors.length} responded</div>
                    <div style={{height:4,background:T.b1,borderRadius:2,width:80,marginTop:5,overflow:"hidden"}}>
                      <div style={{height:"100%",width:rfq.vendors.length?`${(submitted/rfq.vendors.length)*100}%`:"0%",background:T.blu,borderRadius:2}}/>
                    </div>
                    {rfq.status==="Draft"&&<button onClick={e=>{e.stopPropagation();publishRFQ(rfq.id);}} style={{marginTop:6,padding:"3px 10px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>Publish</button>}
                    {rfq.locked&&<button onClick={e=>e.stopPropagation()} style={{marginTop:6,padding:"3px 10px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>→ Create PO</button>}
                  </div>
                </div>
              </div>);
            })}
          </div>
        )}

        {/* ═══ MR TAB ═══ */}
        {tab==="mr"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            {/* 5-status tab bar */}
            <div style={{display:"flex",gap:4,marginBottom:10,flexShrink:0,flexWrap:"wrap"}}>
              {MR_TABS.map(t=>{
                const cnt=mrTabCounts[t.key];
                const isActive=mrTab===t.key;
                return(<button key={t.key} onClick={()=>setMrTab(t.key)}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:7,border:`1.5px solid ${isActive?t.color:T.b1}`,background:isActive?t.bg:T.surface,color:isActive?t.color:T.t3,fontSize:12,fontWeight:isActive?700:400,cursor:"pointer",transition:"all 0.15s"}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:isActive?t.color:T.b2,flexShrink:0}}/>
                  {t.label}
                  {cnt>0&&<span style={{background:isActive?t.color:T.b1,color:isActive?"white":T.t3,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:10,minWidth:18,textAlign:"center"}}>{cnt}</span>}
                </button>);
              })}
            </div>

            {/* Filter bar */}
            <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:8,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
              <div style={{position:"relative",flex:1,minWidth:150}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input value={mrSearch} onChange={e=>setMrSearch(e.target.value)} placeholder="Search material..."
                  style={{width:"100%",height:30,padding:"0 8px 0 27px",borderRadius:6,border:`1.5px solid ${mrSearch?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:mrSearch?T.bluL:T.surface}}/>
              </div>
              <div style={{position:"relative"}}>
                <select value={mrProject} onChange={e=>setMrProject(e.target.value)} style={{height:30,padding:"0 22px 0 9px",borderRadius:6,border:`1.5px solid ${mrProject!=="All"?T.blu:T.b1}`,background:mrProject!=="All"?T.bluL:T.surface,fontSize:11.5,color:mrProject!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",minWidth:140,appearance:"none",WebkitAppearance:"none"}}>
                  <option value="All">All Projects</option>{PROJECTS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
                <IcDown size={10} color={T.t4} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
              </div>
              <span style={{fontSize:11,color:T.t4}}>{filteredMRs.length} items</span>
              {mrTab==="Approved"&&<button onClick={()=>setShowDirectReceipt(true)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                <IcAdd size={12} color={T.amb}/> Direct Receipt
              </button>}
            </div>

            {/* MR Cards */}
            <div style={{flex:1,overflowY:"auto"}}>
              {filteredMRs.length===0&&(
                <div style={{textAlign:"center",padding:"48px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,color:T.t4}}>
                  <IcMR size={32} color={T.b2}/><div style={{marginTop:10,fontSize:13,color:T.t3}}>No {mrTab.toLowerCase()} material requests</div>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:10}}>
                {filteredMRs.map(m=>(
                  <MRCard key={m.id} m={m}
                    onMarkOrdered={setManualOrderTarget}
                    onMarkReceived={setMarkReceivedTarget}
                    onApprove={approveMR}
                    onReject={rejectMR}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ UNBILLED TAB ═══ */}
        {tab==="unbilled"&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {unbilled.length===0&&(
              <div style={{textAlign:"center",padding:"60px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,color:T.t4}}>
                <IcReceipt size={36} color={T.b2}/><div style={{marginTop:12,fontSize:14,fontWeight:600,color:T.t3}}>No unbilled items</div>
                <div style={{fontSize:12,marginTop:4}}>GRN complete hone pe ya manual receipt ke baad yahan dikhega</div>
              </div>
            )}
            <div style={{flex:1,overflowY:"auto"}}>
              {/* Source legend */}
              {unbilled.length>0&&(
                <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                  {[{l:"PO Route",c:T.blu,bg:T.bluL},{l:"Manual Order",c:T.grn,bg:T.grnL},{l:"Direct Receipt",c:T.amb,bg:T.ambL}].map((s,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:20,background:s.bg,border:`1px solid ${s.c}22`}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:s.c}}/>
                      <span style={{fontSize:10.5,fontWeight:600,color:s.c}}>{s.l}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {unbilled.map(item=>{
                  const sourceColor={PO:T.blu,Manual:T.grn,Direct:T.amb}[item.source]||T.slt;
                  const sourceBg={PO:T.bluL,Manual:T.grnL,Direct:T.ambL}[item.source]||T.sltL;
                  return(<div key={item.id} style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",display:"flex",alignItems:"center",padding:"14px 16px",gap:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                    {/* Source badge */}
                    <div style={{width:44,height:44,borderRadius:10,background:sourceBg,border:`1px solid ${sourceColor}22`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:8.5,fontWeight:700,color:sourceColor,textTransform:"uppercase"}}>{item.source}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontSize:13,fontWeight:600,color:T.t1}}>{item.supplier}</span>
                        <span style={{fontSize:10.5,fontWeight:600,color:sourceColor,background:sourceBg,padding:"1px 7px",borderRadius:10}}>{item.ref}</span>
                      </div>
                      <div style={{fontSize:11.5,color:T.t3}}>{item.project} · {item.site||"—"} · {item.date}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:10,color:T.t4,marginBottom:2}}>Est. Amount</div>
                      <div style={{fontSize:16,fontWeight:700,color:T.t1}}>₹{fmtN(item.amount)}</div>
                    </div>
                    <button onClick={()=>setBillEntryTarget(item)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:7,background:T.pur,border:"none",color:"white",fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
                      <IcPO size={13} color="white"/> Enter Bill
                    </button>
                  </div>);
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ PENDING PAYMENTS TAB ═══ */}
        {tab==="pending"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            {/* Urgency filter pills */}
            <div style={{display:"flex",gap:6,marginBottom:10,flexShrink:0,flexWrap:"wrap"}}>
              {[{key:"All",label:"All",c:T.slt,bg:T.sltL},{key:"overdue",label:"Overdue",c:T.red,bg:T.redL},{key:"due_today",label:"Due Today",c:T.amb,bg:T.ambL},{key:"due_this_week",label:"Due This Week",c:"#B45309",bg:"#FFFBEB"},{key:"upcoming",label:"Upcoming",c:T.grn,bg:T.grnL}].map(f=>(
                <button key={f.key} onClick={()=>setPpUrgency(f.key)}
                  style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${ppUrgency===f.key?f.c:T.b1}`,background:ppUrgency===f.key?f.bg:T.surface,color:ppUrgency===f.key?f.c:T.t3,fontSize:11.5,fontWeight:ppUrgency===f.key?600:400,cursor:"pointer",transition:"all 0.15s"}}>
                  {f.label}
                  {f.key!=="All"&&<span style={{marginLeft:5,background:ppUrgency===f.key?f.c:T.b1,color:ppUrgency===f.key?"white":T.t3,fontSize:9.5,fontWeight:700,padding:"0 5px",borderRadius:8}}>
                    {pendingPayments.filter(p=>p.urgency===f.key).length}
                  </span>}
                </button>
              ))}
            </div>

            <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
              {filteredPP.length===0&&(
                <div style={{textAlign:"center",padding:"60px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,color:T.t4}}>
                  <IcRupee size={36} color={T.b2}/><div style={{marginTop:12,fontSize:14,fontWeight:600,color:T.t3}}>No pending payments</div>
                  <div style={{fontSize:12,marginTop:4}}>Bill entry ke baad yahan aayega</div>
                </div>
              )}
              {filteredPP.map(pp=>{
                const um=URGENCY_META[pp.urgency]||URGENCY_META.no_due_date;
                const paidPct=pp.billableAmount?Math.round((pp.paidAmount/pp.billableAmount)*100):0;
                return(<div key={pp.id} style={{background:T.surface,borderRadius:8,border:`1px solid ${pp.urgency==="overdue"?T.redM:pp.urgency==="due_today"?T.ambM:T.b1}`,overflow:"hidden",boxShadow:pp.urgency==="overdue"?"0 2px 8px rgba(220,38,38,0.08)":"0 1px 3px rgba(0,0,0,0.04)"}}>
                  <div style={{padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:12}}>
                    {/* Urgency indicator */}
                    <div style={{width:44,height:44,borderRadius:9,background:um.bg,border:`1px solid ${um.brd}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {pp.urgency==="overdue"?<IcAlert size={18} color={um.c}/>:pp.urgency==="due_today"?<IcClock size={18} color={um.c}/>:<IcRupee size={18} color={um.c}/>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{pp.vendor}</span>
                        <Pill label={um.label} c={um.c} bg={um.bg} brd={um.brd}/>
                        {pp.urgency==="overdue"&&<span style={{fontSize:10,color:T.red,fontWeight:600}}>{pp.daysOverdue} days overdue</span>}
                      </div>
                      <div style={{fontSize:11.5,color:T.t3,marginBottom:6}}>{pp.project} · {pp.invoiceNo||"No invoice"} · Due: {pp.dueDate}</div>
                      {/* Payment progress */}
                      {pp.paidAmount>0&&(
                        <div style={{marginBottom:6}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                            <span style={{fontSize:10,color:T.grn}}>Paid: ₹{fmtN(pp.paidAmount)}</span>
                            <span style={{fontSize:10,color:T.red}}>Outstanding: ₹{fmtN(pp.outstanding)}</span>
                          </div>
                          <div style={{height:4,background:T.b1,borderRadius:2,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${paidPct}%`,background:T.grn,borderRadius:2}}/>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:10,color:T.t4}}>Outstanding</div>
                      <div style={{fontSize:20,fontWeight:700,color:pp.urgency==="overdue"?T.red:T.t1,letterSpacing:"-0.5px"}}>₹{fmt(pp.outstanding)}</div>
                      <div style={{fontSize:10.5,color:T.t4}}>of ₹{fmt(pp.billableAmount)}</div>
                    </div>
                  </div>
                  <div style={{padding:"8px 14px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{fontSize:10.5,color:T.t4,flex:1}}>Terms: {pp.paymentTerms||"—"} · {pp.payableNo}</span>
                    <button onClick={()=>setPayNowTarget(pp)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:6,background:T.grn,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      <IcRupee size={13} color="white"/> Pay Now
                    </button>
                  </div>
                </div>);
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ ALL MODALS ═══ */}
      {selPO&&<PODetailDrawer po={selPO} onClose={()=>setSelPO(null)} onApprove={(id)=>{approvePO(id);setSelPO(p=>p?{...p,approval:"Approved"}:p);}} onShare={(po)=>{setShareTarget(po);setSelPO(null);}} onGRN={(po)=>{setGrnTarget(po);setSelPO(null);}}/>}
      {shareTarget&&<ShareModal rfq={{id:shareTarget.id,project:shareTarget.project,vendors:VENDORS.slice(0,3).map(n=>({name:n,status:"Pending",rates:[]}))}} onClose={()=>setShareTarget(null)}/>}
      {grnTarget&&<GRNModal po={grnTarget} onClose={()=>setGrnTarget(null)} onSave={saveGRN}/>}
      {selRFQ&&<RFQDetailDrawer rfq={selRFQ} onClose={()=>setSelRFQ(null)} onPunch={(vi)=>{setPunchTarget(selRFQ);setPunchVendorIdx(vi);setSelRFQ(null);}} onLock={(vName)=>{lockRFQ(selRFQ.id,vName);setSelRFQ(r=>r?{...r,locked:vName}:r);}} onPublish={(id)=>{publishRFQ(id);setSelRFQ(r=>r?{...r,status:"Published",bidStart:"Today",bidEnd:"+5 days"}:r);}}/>}
      {shareRFQ&&<ShareModal rfq={shareRFQ} onClose={()=>setShareRFQ(null)}/>}
      {punchTarget&&punchVendorIdx!=null&&<PunchQuoteModal rfq={punchTarget} vendorIndex={punchVendorIdx} onSave={(vi,rates)=>savePunch(punchTarget.id,vi,rates)} onClose={()=>{setPunchTarget(null);setPunchVendorIdx(null);}}/>}
      {manualOrderTarget&&<ManualOrderModal mr={manualOrderTarget} onSave={saveManualOrder} onClose={()=>setManualOrderTarget(null)}/>}
      {markReceivedTarget&&<MarkReceivedModal mr={markReceivedTarget} onSave={saveMarkReceived} onClose={()=>setMarkReceivedTarget(null)}/>}
      {showDirectReceipt&&<DirectReceiptModal onSave={saveDirectReceipt} onClose={()=>setShowDirectReceipt(false)}/>}
      {showCreatePO&&<CreatePOModal onClose={()=>setShowCreatePO(false)} onSave={(newPO)=>{setPOs(prev=>[newPO,...prev]);setShowCreatePO(false);}}/>}
      {billEntryTarget&&<BillEntryModal item={billEntryTarget} onSave={saveBillEntry} onClose={()=>setBillEntryTarget(null)}/>}
      {payNowTarget&&<PayNowModal item={payNowTarget} onSave={savePayment} onClose={()=>setPayNowTarget(null)}/>}
    </div>
  );
}

export default ProcurementModule;
