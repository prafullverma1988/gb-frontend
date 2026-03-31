import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../config/api";

// ── DESIGN TOKENS — Balanced palette ─────────────────────────────────
const T = {
  // Surfaces
  bg:       "#F4F6F9",
  surface:  "#FFFFFF",
  surfaceB: "#F8F9FB",
  // Text
  t1:  "#111827",
  t2:  "#374151",
  t3:  "#6B7280",
  t4:  "#9CA3AF",
  // Borders
  b1:  "#E5E7EB",
  b2:  "#D1D5DB",
  // Primary blue
  blu:  "#2563EB",
  bluL: "#EFF6FF",
  bluM: "#BFDBFE",
  // Green
  grn:  "#059669",
  grnL: "#ECFDF5",
  grnM: "#A7F3D0",
  // Amber
  amb:  "#D97706",
  ambL: "#FFFBEB",
  ambM: "#FDE68A",
  // Red
  red:  "#DC2626",
  redL: "#FEF2F2",
  redM: "#FECACA",
  // Slate (neutral)
  slt:  "#64748B",
  sltL: "#F1F5F9",
  // Purple
  pur:  "#7C3AED",
  purL: "#F5F3FF",
};

const fmt  = (n) => n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:`${(n/1000).toFixed(0)}K`;
const fmtN = (n) => Math.abs(n).toLocaleString("en-IN");

// ── MINI COMPONENTS ───────────────────────────────────────────────────

// Pill badge — slightly rounded, colored border
const Pill = ({label, c, bg, border}) => (
  <span style={{display:"inline-block", background:bg, color:c, fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:20, border:`1px solid ${border||c+"44"}`, whiteSpace:"nowrap"}}>{label}</span>
);

// Progress bar
const PBar = ({pct, color, h=4}) => (
  <div style={{height:h, background:T.b1, borderRadius:h, overflow:"hidden"}}>
    <div style={{height:"100%", width:`${Math.min(pct,100)}%`, background:color||T.blu, borderRadius:h, transition:"width .5s"}}/>
  </div>
);

// Stat card — white card with top color accent
const Stat = ({label, value, note, color}) => (
  <div style={{padding:"13px 15px", background:T.surface, border:`1px solid ${T.b1}`, borderRadius:8, borderTop:`3px solid ${color||T.blu}`}}>
    <div style={{fontSize:10, color:T.t3, fontWeight:600, letterSpacing:".5px", textTransform:"uppercase", marginBottom:5}}>{label}</div>
    <div style={{fontSize:21, fontWeight:700, color:T.t1, letterSpacing:"-.5px", lineHeight:1}}>{value}</div>
    {note&&<div style={{fontSize:11, color:T.t4, marginTop:4}}>{note}</div>}
  </div>
);

// Panel card
const Panel = ({children, style}) => (
  <div style={{background:T.surface, border:`1px solid ${T.b1}`, borderRadius:8, overflow:"hidden", ...style}}>{children}</div>
);

// Panel header
const PHead = ({title, action}) => (
  <div style={{padding:"10px 15px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:T.surfaceB}}>
    <span style={{fontSize:12.5, fontWeight:700, color:T.t1, letterSpacing:"-.1px"}}>{title}</span>
    {action}
  </div>
);

// Table header row
const THead = ({cols, headers}) => (
  <div style={{display:"grid", gridTemplateColumns:cols, padding:"7px 15px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}`}}>
    {headers.map((h,i)=>(
      <span key={i} style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".6px"}}>{h}</span>
    ))}
  </div>
);

// Add button
const AddBtn = ({label, onClick}) => (
  <button onClick={onClick} style={{display:"inline-flex", alignItems:"center", gap:5, padding:"5px 12px", border:`1px solid ${T.blu}`, borderRadius:6, background:T.bluL, color:T.blu, fontSize:11.5, fontWeight:600, cursor:"pointer", transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background=T.blu;e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.background=T.bluL;e.currentTarget.style.color=T.blu;}}>
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
    {label}
  </button>
);

// Secondary button
const SecBtn = ({label, onClick}) => (
  <button onClick={onClick} style={{display:"inline-flex", alignItems:"center", gap:4, padding:"5px 11px", border:`1px solid ${T.b2}`, borderRadius:6, background:T.surface, color:T.t2, fontSize:11.5, fontWeight:500, cursor:"pointer"}}>{label}</button>
);

// Filter tabs
const FilterTabs = ({options, active, onChange}) => (
  <div style={{display:"flex", gap:2, background:T.bg, borderRadius:7, padding:3, border:`1px solid ${T.b1}`}}>
    {options.map(o=>{
      const isA = active===o.id;
      return <button key={o.id} onClick={()=>onChange(o.id)} style={{padding:"4px 11px", borderRadius:5, border:"none", background:isA?T.surface:"none", color:isA?T.blu:T.t3, fontSize:11.5, fontWeight:isA?700:400, cursor:"pointer", boxShadow:isA?"0 1px 3px rgba(0,0,0,.08)":"none", transition:"all .15s", whiteSpace:"nowrap"}}>{o.label}{o.count!=null&&<span style={{marginLeft:4, background:isA?T.blu:T.b2, color:isA?"#fff":T.t3, fontSize:9, fontWeight:700, padding:"0 5px", borderRadius:10}}>{o.count}</span>}</button>;
    })}
  </div>
);

// ── DATA ──────────────────────────────────────────────────────────────
const PROJ = {
  id:1, name:"Shubham & Nand Kishor 623", client:"Nand Kishor Agrawal",
  city:"Raipur", type:"Residential", progress:68, status:"Ongoing",
  boq:4250000, expense:2890000, pm:"Vijay Sahu", sup:"Niranjan",
  start:"Jan 2025", end:"Aug 2025", address:"Plot 623, Tatibandh, Raipur",
  area:"2,400 sqft", floors:"G+2",
};
const STATUS_S = {
  "Ongoing":     {c:T.grn, bg:T.grnL},
  "Completed":   {c:T.blu, bg:T.bluL},
  "Hold":        {c:T.amb, bg:T.ambL},
  "Not Started": {c:T.slt, bg:T.sltL},
};
const D = {
  milestones:[
    {label:"Foundation & PCC",      pct:100,done:true, date:"Feb 2025"},
    {label:"Ground Floor Slab",     pct:100,done:true, date:"Mar 2025"},
    {label:"1st Floor Structure",   pct:100,done:true, date:"Apr 2025"},
    {label:"2nd Floor Slab",        pct:100,done:true, date:"May 2025"},
    {label:"Brickwork All Floors",  pct:80, done:false,date:"Jun 2025"},
    {label:"Plaster & Finishing",   pct:30, done:false,date:"Jul 2025"},
    {label:"Flooring & Tiling",     pct:0,  done:false,date:"Aug 2025"},
    {label:"Handover",              pct:0,  done:false,date:"Aug 2025"},
  ],
  expBreakdown:[
    {label:"Material Purchase", amt:1340000, color:T.blu,  sub:"TMT, Cement, Bricks, Sand…"},
    {label:"Sub-Contractor",    amt:870000,  color:T.pur,  sub:"Ramesh Labour, Rajesh Elec."},
    {label:"Direct Labour",     amt:420000,  color:T.grn,  sub:"Daily wage workers"},
    {label:"Site Expenses",     amt:180000,  color:T.amb,  sub:"Tools, transport, misc"},
    {label:"Equipment Hire",    amt:80000,   color:"#0891B2", sub:"Scaffolding, Transit Mixer"},
  ],
  drawings:[
    {id:1,title:"Ground Floor Plan",     type:"2D",cat:"Architectural",ver:"v3",status:"Approved",by:"Harsh Sahu",  date:"15 Jan",size:"2.4 MB",pins:3},
    {id:2,title:"1st Floor Plan",        type:"2D",cat:"Architectural",ver:"v2",status:"Approved",by:"Harsh Sahu",  date:"15 Jan",size:"2.1 MB",pins:1},
    {id:3,title:"3D Elevation Front",    type:"3D",cat:"Architectural",ver:"v1",status:"Approved",by:"Harsh Sahu",  date:"10 Jan",size:"8.7 MB",pins:0},
    {id:4,title:"Structural Drawing GF", type:"2D",cat:"Structural",   ver:"v2",status:"Revision",by:"External",    date:"20 Jan",size:"3.2 MB",pins:2},
    {id:5,title:"Electrical Layout",     type:"2D",cat:"Electrical",   ver:"v1",status:"Pending", by:"Rajesh Elec.",date:"01 Feb",size:"1.8 MB",pins:0},
    {id:6,title:"Plumbing Schematic",    type:"2D",cat:"Plumbing",     ver:"v1",status:"Pending", by:"External",    date:"01 Feb",size:"1.2 MB",pins:0},
  ],
  boqSections:[
    {id:1,name:"Civil Structure",items:[
      {no:"1.1",desc:"Excavation & PCC",      unit:"CuM", qty:120,rate:850, amount:102000, done:100},
      {no:"1.2",desc:"RCC Foundation",         unit:"CuM", qty:45, rate:6500,amount:292500, done:100},
      {no:"1.3",desc:"RCC Column & Beam",      unit:"CuM", qty:38, rate:7200,amount:273600, done:85},
      {no:"1.4",desc:"RCC Slab G+1+2",         unit:"CuM", qty:96, rate:6800,amount:652800, done:75},
    ]},
    {id:2,name:"Brickwork & Plaster",items:[
      {no:"2.1",desc:'Brick Masonry 4.5"',     unit:"CuM", qty:280,rate:2800,amount:784000, done:60},
      {no:"2.2",desc:"External Plaster 20mm",  unit:"SqM", qty:520,rate:180, amount:93600,  done:40},
      {no:"2.3",desc:"Internal Plaster 12mm",  unit:"SqM", qty:1400,rate:120,amount:168000, done:30},
    ]},
    {id:3,name:"Flooring",items:[
      {no:"3.1",desc:"Vitrified Tile 800x800", unit:"SqFt",qty:2400,rate:95, amount:228000, done:0},
      {no:"3.2",desc:"Anti-Skid Kitchen Tile", unit:"SqFt",qty:300, rate:85, amount:25500,  done:0},
    ]},
    {id:4,name:"Electrical",items:[
      {no:"4.1",desc:"Concealed Wiring",       unit:"Point",qty:180,rate:850, amount:153000, done:45},
      {no:"4.2",desc:"DB Box & MCBs",          unit:"Nos",  qty:4,  rate:8500,amount:34000,  done:20},
    ]},
  ],
  invoices:[
    {no:"INV-001",desc:"Mobilization Advance", pct:10,amount:425000, date:"Jan 2025",status:"Paid"},
    {no:"INV-002",desc:"Foundation Complete",   pct:20,amount:850000, date:"Feb 2025",status:"Paid"},
    {no:"INV-003",desc:"Ground Floor Slab",     pct:20,amount:850000, date:"Mar 2025",status:"Paid"},
    {no:"INV-004",desc:"1st Floor Complete",    pct:20,amount:850000, date:"Apr 2025",status:"Paid"},
    {no:"INV-005",desc:"2nd Floor Slab",        pct:15,amount:637500, date:"May 2025",status:"Pending"},
    {no:"INV-006",desc:"Finishing Stage",       pct:10,amount:425000, date:"Jul 2025",status:"Upcoming"},
    {no:"INV-007",desc:"Handover",              pct:5, amount:212500, date:"Aug 2025",status:"Upcoming"},
  ],
  parties:[
    {id:1,name:"Nand Kishor Agrawal", type:"Client",           balance:2896400,balLabel:"Advance Received",balPositive:true},
    {id:2,name:"Abhay Traders",       type:"Material Supplier",balance:114328, balLabel:"To Pay",         balPositive:false},
    {id:3,name:"Ramesh Labour Cont.", type:"Sub-Contractor",   balance:38000,  balLabel:"To Pay",         balPositive:false},
    {id:4,name:"Vaibhav Traders",     type:"Material Supplier",balance:22500,  balLabel:"To Pay",         balPositive:false},
    {id:5,name:"AAA Traders",         type:"Material Supplier",balance:40000,  balLabel:"To Pay",         balPositive:false},
  ],
  partyTxns:{
    1:[{date:"02 Feb",note:"Client advance payment",   type:"Payment In",  amount:250000,cr:true},
       {date:"15 Jan",note:"Client advance — 2nd",     type:"Payment In",  amount:850000,cr:true},
       {date:"28 Dec",note:"Mobilization advance",     type:"Payment In",  amount:425000,cr:true}],
    2:[{date:"28 Jan",note:"TMT Steel 2 MT",           type:"Material Bill",amount:126775,cr:false},
       {date:"10 Jan",note:"Binding Wire 20 kg",       type:"Material Bill",amount:1600,  cr:false},
       {date:"05 Jan",note:"Payment made",             type:"Payment Out",  amount:50000, cr:true}],
    3:[{date:"20 Jan",note:"Brickwork GF labour",      type:"Sub-Con Bill", amount:38000, cr:false}],
    4:[{date:"15 Jan",note:"Cement 50 bags",           type:"Material Bill",amount:17500, cr:false},
       {date:"15 Jan",note:"Payment made",             type:"Payment Out",  amount:17500, cr:true}],
    5:[{date:"01 Mar",note:"Bricks 5000 Nos",          type:"Material Bill",amount:40000, cr:false}],
  },
  transactions:[
    {id:1,date:"09 Mar",party:"Vijay Sahu",     note:"Labour payment slab",   type:"Site Expense",     amount:50000, dr:true},
    {id:2,date:"08 Mar",party:"Vijay Sahu",     note:"Murga jali for plaster",type:"Site Expense",     amount:500,   dr:true},
    {id:3,date:"08 Mar",party:"Abhay Traders",  note:"TMT Steel 2 MT",        type:"Material Purchase",amount:126775,dr:true},
    {id:4,date:"02 Feb",party:"Nand Kishor",    note:"Client advance",        type:"Payment In",       amount:250000,dr:false},
    {id:5,date:"20 Jan",party:"Ramesh Labour",  note:"Brickwork GF",          type:"Sub-Con",          amount:38000, dr:true},
    {id:6,date:"15 Jan",party:"Nand Kishor",    note:"Client advance 2",      type:"Payment In",       amount:850000,dr:false},
    {id:7,date:"10 Jan",party:"Vaibhav Traders",note:"Cement 50 bags",        type:"Material Purchase",amount:17500, dr:true},
  ],
  todos:[
    {id:1,text:"Confirm tile design with client",     priority:"High",  assignee:"Vijay Sahu",done:false,due:"10 Mar"},
    {id:2,text:"Get revised structural drawing",      priority:"High",  assignee:"Harsh Sahu",done:false,due:"08 Mar"},
    {id:3,text:"Order TMT Steel for 2nd floor",       priority:"High",  assignee:"Vijay Sahu",done:true, due:"01 Mar"},
    {id:4,text:"Submit client invoice INV-005",       priority:"Medium",assignee:"Prafull",   done:false,due:"15 Mar"},
    {id:5,text:"Schedule electrical inspection",      priority:"Medium",assignee:"Niranjan",  done:false,due:"20 Mar"},
    {id:6,text:"Get plumber quote for 1st floor",     priority:"Low",   assignee:"Niranjan",  done:false,due:"25 Mar"},
    {id:7,text:"Photo shoot 2nd floor slab",          priority:"Low",   assignee:"Vijay Sahu",done:true, due:"28 Feb"},
  ],
  tasks:[
    {id:1,name:"Foundation & PCC",        progress:100,status:"Done",       assignee:"Niranjan",  open:false,subtasks:[
      {id:11,name:"Excavation",            progress:100,status:"Done",       assignee:"Ramesh",  start:"Jan 1", end:"Jan 10"},
      {id:12,name:"PCC Laying",            progress:100,status:"Done",       assignee:"Ramesh",  start:"Jan 11",end:"Jan 20"},
      {id:13,name:"Footing RCC",           progress:100,status:"Done",       assignee:"Niranjan",start:"Jan 21",end:"Feb 5"},
    ]},
    {id:2,name:"Ground Floor Structure",  progress:100,status:"Done",       assignee:"Vijay Sahu",open:false,subtasks:[
      {id:21,name:"Column Casting GF",     progress:100,status:"Done",       assignee:"Niranjan",start:"Feb 6", end:"Feb 20"},
      {id:22,name:"Beam & Slab GF",        progress:100,status:"Done",       assignee:"Niranjan",start:"Feb 21",end:"Mar 10"},
    ]},
    {id:3,name:"1F & 2F Structure",        progress:100,status:"Done",       assignee:"Vijay Sahu",open:false,subtasks:[
      {id:31,name:"Column Casting 1F",     progress:100,status:"Done",       assignee:"Niranjan",start:"Mar 11",end:"Mar 30"},
      {id:32,name:"Slab 1st Floor",        progress:100,status:"Done",       assignee:"Niranjan",start:"Apr 1", end:"Apr 20"},
      {id:33,name:"Slab 2nd Floor",        progress:100,status:"Done",       assignee:"Niranjan",start:"May 11",end:"May 30"},
    ]},
    {id:4,name:"Brickwork",                progress:65, status:"In Progress",assignee:"Vijay Sahu",open:true, subtasks:[
      {id:41,name:"Brickwork GF",          progress:100,status:"Done",       assignee:"Ramesh",  start:"Jun 1", end:"Jun 15"},
      {id:42,name:"Brickwork 1F",          progress:80, status:"In Progress",assignee:"Ramesh",  start:"Jun 16",end:"Jun 30"},
      {id:43,name:"Brickwork 2F",          progress:20, status:"In Progress",assignee:"Ramesh",  start:"Jul 1", end:"Jul 20"},
    ]},
    {id:5,name:"Plaster & Finishing",      progress:20, status:"In Progress",assignee:"Vijay Sahu",open:true, subtasks:[
      {id:51,name:"External Plaster",      progress:30, status:"In Progress",assignee:"Niranjan",start:"Jul 1", end:"Jul 20"},
      {id:52,name:"Internal Plaster",      progress:15, status:"In Progress",assignee:"Niranjan",start:"Jul 10",end:"Aug 5"},
      {id:53,name:"Flooring",              progress:0,  status:"Not Started", assignee:"Niranjan",start:"Aug 1", end:"Aug 20"},
    ]},
  ],
  attendance:[
    {date:"08 Mar",day:"Sat",note:"Brickwork 1F continued",workers:[
      {name:"Ramesh (Head Mason)",role:"Mason", present:true, hours:8},
      {name:"Suresh",             role:"Mason", present:true, hours:8},
      {name:"Mahesh",             role:"Labour",present:true, hours:8},
      {name:"Raju",               role:"Labour",present:true, hours:8},
      {name:"Pintu",              role:"Helper",present:false,hours:0},
    ]},
    {date:"07 Mar",day:"Fri",note:"Good progress",workers:[
      {name:"Ramesh (Head Mason)",role:"Mason", present:true, hours:9},
      {name:"Suresh",             role:"Mason", present:true, hours:9},
      {name:"Mahesh",             role:"Labour",present:true, hours:9},
      {name:"Raju",               role:"Labour",present:true, hours:9},
      {name:"Pintu",              role:"Helper",present:true, hours:9},
    ]},
    {date:"06 Mar",day:"Thu",note:"Raju absent",workers:[
      {name:"Ramesh (Head Mason)",role:"Mason", present:true, hours:8},
      {name:"Suresh",             role:"Mason", present:true, hours:8},
      {name:"Mahesh",             role:"Labour",present:true, hours:8},
      {name:"Raju",               role:"Labour",present:false,hours:0},
      {name:"Pintu",              role:"Helper",present:true, hours:8},
    ]},
  ],
  materials:[
    {id:1,name:"TMT Steel Fe500",        qty:"4 MT",       stage:"Used",     by:"Vijay Sahu",date:"15 Jan",vendor:"Abhay Traders", amt:253550},
    {id:2,name:"Binding Wire",           qty:"20 KG",      stage:"Used",     by:"Niranjan",  date:"10 Jan",vendor:"Abhay Traders", amt:1600},
    {id:3,name:"Cement OPC 53",          qty:"200 Bags",   stage:"Received", by:"Vijay Sahu",date:"01 Mar",vendor:"Shyam Traders", amt:77000},
    {id:4,name:"River Sand",             qty:"10 Loads",   stage:"Received", by:"Niranjan",  date:"28 Feb",vendor:"Bajrang Traders",amt:32000},
    {id:5,name:"Bricks",                 qty:"10,000 Nos", stage:"Ordered",  by:"Vijay Sahu",date:"01 Mar",vendor:"AAA Traders",   amt:90000},
    {id:6,name:"Aggregate 20mm",         qty:"5 Brass",    stage:"Approved", by:"Niranjan",  date:"05 Mar",vendor:null,            amt:24000},
    {id:7,name:"Vitrified Tiles 800x800",qty:"2400 SqFt",  stage:"Requested",by:"Vijay Sahu",date:"08 Mar",vendor:null,            amt:228000},
    {id:8,name:"Plaster Sand",           qty:"5 Loads",    stage:"Requested",by:"Vijay Sahu",date:"09 Mar",vendor:null,            amt:16000},
  ],
  subcons:[
    {id:1,no:"SC-001",contractor:"Ramesh Labour Cont.",work:"RCC & Masonry — All Floors",
     totalValue:580000,paid:420000,status:"Active",start:"Jan 2025",
     bills:[{desc:"Foundation RCC",     unit:"CuM", qty:45,rate:1200,amt:54000, status:"Paid"},
            {desc:"GF Slab Casting",    unit:"CuM", qty:32,rate:1400,amt:44800, status:"Paid"},
            {desc:"1F Brickwork",       unit:"CuM", qty:80,rate:1800,amt:144000,status:"Paid"},
            {desc:"2F Brickwork",       unit:"CuM", qty:60,rate:1800,amt:108000,status:"Pending"}]},
    {id:2,no:"SC-002",contractor:"Rajesh Electrical",work:"Complete Electrical Work",
     totalValue:153000,paid:45000,status:"Active",start:"Mar 2025",
     bills:[{desc:"Concealed Wiring Ph.1",unit:"Lump",qty:1,rate:45000,amt:45000,status:"Paid"},
            {desc:"Concealed Wiring Ph.2",unit:"Lump",qty:1,rate:60000,amt:60000,status:"Pending"},
            {desc:"DB & Fittings",        unit:"Lump",qty:1,rate:48000,amt:48000,status:"Pending"}]},
  ],
  equipment:[
    {id:1,name:"Concrete Mixer 10/7",owner:"Own",  rate:800, days:[{date:"08 Mar",hours:6,note:"1F columns"},{date:"07 Mar",hours:8,note:"Full day"},{date:"06 Mar",hours:5,note:"Half day"}]},
    {id:2,name:"Scaffolding Set",    owner:"Hired",rate:1200,days:[{date:"08 Mar",hours:8,note:"Full day"},{date:"07 Mar",hours:8,note:"Full day"},{date:"06 Mar",hours:8,note:"Full day"}]},
    {id:3,name:"Bar Bending Machine",owner:"Own",  rate:500, days:[{date:"08 Mar",hours:4,note:"TMT cutting"},{date:"07 Mar",hours:0,note:"—"},{date:"06 Mar",hours:3,note:"Lintel bars"}]},
    {id:4,name:"Transit Mixer",      owner:"Hired",rate:4500,days:[{date:"08 Mar",hours:3,note:"2 trips"},{date:"06 Mar",hours:2,note:"1 trip"}]},
  ],
  folders:[
    {id:1,name:"Drawings",   count:6, color:T.blu, files:[{name:"GF_Plan_v3.dwg",      type:"DWG",size:"2.4 MB",date:"15 Jan",by:"Harsh Sahu"},{name:"3D_Elevation.skp",type:"3D",size:"8.7 MB",date:"10 Jan",by:"Harsh Sahu"}]},
    {id:2,name:"Site Photos",count:24,color:T.grn, files:[{name:"Slab_2F_casting.jpg", type:"JPG",size:"3.1 MB",date:"01 Jun",by:"Vijay Sahu"},{name:"Foundation_done.jpg",type:"JPG",size:"2.8 MB",date:"05 Feb",by:"Vijay Sahu"}]},
    {id:3,name:"Documents",  count:8, color:T.amb, files:[{name:"Client_Agreement.pdf",type:"PDF",size:"1.2 MB",date:"15 Dec",by:"Prafull"},{name:"BOQ_Approved.xlsx",   type:"XLS",size:"0.8 MB",date:"20 Dec",by:"Prafull"}]},
    {id:4,name:"Invoices",   count:4, color:T.pur, files:[{name:"INV-001.pdf",          type:"PDF",size:"0.3 MB",date:"25 Jan",by:"Prafull"},{name:"INV-002.pdf",         type:"PDF",size:"0.3 MB",date:"10 Feb",by:"Prafull"}]},
  ],
  dpr:[
    {date:"08 Mar 2025",weather:"Sunny 34°C",labourCount:14,machinery:3,workDone:["Brickwork 1F — North & East wall completed","TMT cutting for lintel","Column shuttering 2F started"],materials:["Cement 10 bags","Sand 1 load","Bricks 500 nos"],issues:["Water supply pipe cracked — fixed","Bricks delivery late by 2 hrs"],photos:2,by:"Vijay Sahu"},
    {date:"07 Mar 2025",weather:"Partly Cloudy 31°C",labourCount:16,machinery:3,workDone:["Brickwork 1F — West wall started","Shuttering removed from slab","Curing continues"],materials:["Cement 8 bags","Sand 1 load"],issues:[],photos:3,by:"Vijay Sahu"},
    {date:"06 Mar 2025",weather:"Sunny 35°C",labourCount:14,machinery:2,workDone:["Internal plastering GF started","RCC lintel 1F cast"],materials:["Cement 12 bags","TMT 100 kg"],issues:["One labour absent"],photos:1,by:"Niranjan"},
  ],
  moms:[
    {id:1,no:"MOM-004",date:"05 Mar 2025",type:"Site Visit",    status:"Closed",attendees:["Nand Kishor Agrawal","Vijay Sahu","Prafull"],venue:"Site",agenda:["Review tile selection","Discuss 2nd floor layout change","Timeline review"],decisions:["Client approved white Somany tiles 800x800","No layout change — reconfirm in 2 weeks","Target handover remains Aug 2025"],next:"20 Mar 2025"},
    {id:2,no:"MOM-003",date:"15 Feb 2025",type:"Progress Meeting",status:"Closed",attendees:["Vijay Sahu","Niranjan","Harsh Sahu"],venue:"Office",agenda:["1F slab completion review","Material planning","Labour issues"],decisions:["1F slab completed on schedule","Order 2 MT TMT for 2F","Increase labour by 5"],next:"05 Mar 2025"},
    {id:3,no:"MOM-002",date:"20 Jan 2025",type:"Design Review",  status:"Closed",attendees:["Nand Kishor Agrawal","Harsh Sahu","Prafull"],venue:"Office",agenda:["Electrical layout review","Confirm door-window schedule","Change requests"],decisions:["Electrical layout approved","Door schedule finalized","Extra window on west — approved"],next:"15 Feb 2025"},
    {id:4,no:"MOM-005",date:"20 Mar 2025",type:"Site Visit",    status:"Planned",attendees:[],venue:"Site",agenda:["Tile selection confirmation","2nd floor progress review"],decisions:[],next:null},
  ],
};

// ═══════════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW
// ═══════════════════════════════════════════════════════════════════
const STAGES = ["Requested","Approved","Ordered","Received","Used"];
const STAGE_S = {"Requested":{c:T.slt,bg:T.sltL},"Approved":{c:T.pur,bg:T.purL},"Ordered":{c:T.amb,bg:T.ambL},"Received":{c:T.blu,bg:T.bluL},"Used":{c:T.grn,bg:T.grnL}};

function TabOverview({proj}) {
  const margin = proj.boq - proj.expense;
  const expTotal = D.expBreakdown.reduce((s,e)=>s+e.amt,0);

  // Live data derived from other tabs
  const ongoingTasks = D.tasks.filter(t=>t.status==="In Progress");
  const todayAtt = D.attendance[0];
  const presentToday = todayAtt.workers.filter(w=>w.present).length;
  const matByStage = STAGES.reduce((a,s)=>({...a,[s]:0}),{});
  const pendingMat = [];

  return (
    <div style={{padding:"16px 18px", display:"flex", flexDirection:"column", gap:14}}>

      {/* ── ROW 1 — KPI STATS ── */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10}}>
        <Stat label="Progress"    value={`${proj.progress}%`}         note="Physical completion"                         color={T.blu}/>
        <Stat label="BOQ Value"   value={`₹${fmt(proj.boq)}`}         note="Total contract"                              color={T.slt}/>
        <Stat label="Spent"       value={`₹${fmt(proj.expense)}`}     note={`${Math.round(proj.expense/proj.boq*100)}% utilised`} color={T.amb}/>
        <Stat label="Margin"      value={`₹${fmt(margin)}`}           note={`${Math.round(margin/proj.boq*100)}% buffer`} color={T.grn}/>
        <Stat label="Days Left"   value="54"                          note="Till Aug 2025"                               color={T.pur}/>
        <Stat label="Open Issues" value="3"                           note="Require action"                              color={T.red}/>
      </div>

      {/* ── ROW 2 — MILESTONES + EXPENSE BREAKDOWN ── */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>

        {/* Milestones */}
        <Panel>
          <PHead title="Project Milestones"/>
          <div style={{padding:"13px 15px"}}>
            <div style={{display:"flex", gap:14, alignItems:"flex-start"}}>
              <div style={{flexShrink:0}}>
                <svg width={76} height={76} viewBox="0 0 76 76">
                  <circle r={30} cx={38} cy={38} fill="none" stroke={T.b1} strokeWidth={8}/>
                  <circle r={30} cx={38} cy={38} fill="none" stroke={T.blu} strokeWidth={8} strokeLinecap="round"
                    strokeDasharray={`${proj.progress/100*2*Math.PI*30} 999`}
                    transform="rotate(-90 38 38)" style={{transition:"stroke-dasharray .8s"}}/>
                  <text x={38} y={42} textAnchor="middle" fontSize={14} fontWeight={700} fill={T.t1}>{proj.progress}%</text>
                </svg>
              </div>
              <div style={{flex:1, paddingTop:2}}>
                {D.milestones.map((m,i)=>(
                  <div key={i} style={{marginBottom:7}}>
                    <div style={{display:"flex", alignItems:"center", gap:7, marginBottom:m.pct>0&&!m.done?3:0}}>
                      <div style={{width:15, height:15, borderRadius:4, border:`1.5px solid ${m.done?T.grn:m.pct>0?T.blu:T.b2}`, background:m.done?T.grn:m.pct>0?T.bluL:"transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center"}}>
                        {m.done&&<svg width={9} height={9} viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth={2.2}><path d="M2 5l2.5 2.5L8 3"/></svg>}
                        {!m.done&&m.pct>0&&<div style={{width:5,height:5,borderRadius:"50%",background:T.blu}}/>}
                      </div>
                      <span style={{flex:1, fontSize:11.5, color:m.done?T.t4:T.t1, fontWeight:m.pct>0&&!m.done?700:400, textDecoration:m.done?"line-through":"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{m.label}</span>
                      <span style={{fontSize:10.5, color:T.t4, flexShrink:0}}>{m.date}</span>
                    </div>
                    {m.pct>0&&!m.done&&(
                      <div style={{marginLeft:22, height:4, background:T.b1, borderRadius:4, overflow:"hidden"}}>
                        <div style={{height:"100%", width:`${m.pct}%`, background:T.blu, borderRadius:4, transition:"width .5s"}}/>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* Expense Breakdown — category wise */}
        <Panel>
          <PHead title="Expense Breakdown" action={
            <span style={{fontSize:11, color:T.t4}}>Total: <strong style={{color:T.t1}}>₹{fmt(expTotal)}</strong></span>
          }/>
          <div style={{padding:"13px 15px"}}>
            {D.expBreakdown.map((e,i)=>{
              const pct = Math.round(e.amt/expTotal*100);
              return (
                <div key={i} style={{marginBottom:11}}>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:4, alignItems:"flex-start"}}>
                    <div style={{display:"flex", alignItems:"center", gap:7}}>
                      <div style={{width:9, height:9, borderRadius:3, background:e.color, flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:12.5, fontWeight:600, color:T.t1, lineHeight:1.2}}>{e.label}</div>
                        <div style={{fontSize:10.5, color:T.t4}}>{e.sub}</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right", flexShrink:0}}>
                      <div style={{fontSize:13, fontWeight:700, color:T.t1, fontVariantNumeric:"tabular-nums"}}>₹{fmt(e.amt)}</div>
                      <div style={{fontSize:10.5, color:T.t4}}>{pct}%</div>
                    </div>
                  </div>
                  <PBar pct={pct} color={e.color} h={5}/>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* ── ROW 3 — ONGOING TASKS + MATERIAL + ATTENDANCE ── */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14}}>

        {/* Ongoing Tasks */}
        <Panel>
          <PHead title="Ongoing Tasks" action={
            <Pill label={`${ongoingTasks.length} active`} c={T.blu} bg={T.bluL}/>
          }/>
          <div style={{padding:"0 0 4px"}}>
            {ongoingTasks.map(task=>(
              <div key={task.id} style={{padding:"9px 15px", borderBottom:`1px solid ${T.b1}`, borderLeft:`3px solid ${T.blu}44`}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5}}>
                  <span style={{fontSize:12.5, fontWeight:600, color:T.t1}}>{task.name}</span>
                  <span style={{fontSize:12, fontWeight:700, color:T.blu}}>{task.progress}%</span>
                </div>
                <PBar pct={task.progress} color={task.progress>70?T.grn:T.blu} h={4}/>
                <div style={{display:"flex", justifyContent:"space-between", marginTop:5}}>
                  <span style={{fontSize:11, color:T.t4}}>{task.assignee}</span>
                  <span style={{fontSize:11, color:T.t3}}>
                    {task.subtasks.filter(s=>s.status==="Done").length}/{task.subtasks.length} subtasks done
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Material Status */}
        <Panel>
          <PHead title="Material Status" action={
            pendingMat.length>0
              ? <Pill label={`${pendingMat.length} pending action`} c={T.amb} bg={T.ambL}/>
              : <Pill label="All clear" c={T.grn} bg={T.grnL}/>
          }/>
          {/* Stage summary pills */}
          <div style={{padding:"10px 15px", borderBottom:`1px solid ${T.b1}`, display:"flex", gap:6, flexWrap:"wrap"}}>
            {STAGES.map(s=>{
              const ss = STAGE_S[s]; const cnt = matByStage[s]||0;
              if(!cnt) return null;
              return <Pill key={s} label={`${s} (${cnt})`} c={ss.c} bg={ss.bg}/>;
            })}
          </div>
          {/* Pending items */}
          <div style={{padding:"6px 0 4px"}}>
            {pendingMat.length===0
              ? <div style={{padding:"16px 15px", fontSize:12.5, color:T.t4, textAlign:"center"}}>No pending approvals</div>
              : pendingMat.map(m=>{
                const ss = STAGE_S[m.stage];
                return (
                  <div key={m.id} style={{padding:"7px 15px", borderBottom:`1px solid ${T.b1}`, display:"flex", justifyContent:"space-between", alignItems:"center", borderLeft:`3px solid ${ss.c}44`}}>
                    <div>
                      <div style={{fontSize:12, fontWeight:500, color:T.t1}}>{m.name}</div>
                      <div style={{fontSize:11, color:T.t4}}>{m.qty} · {m.by}</div>
                    </div>
                    <Pill label={m.stage} c={ss.c} bg={ss.bg}/>
                  </div>
                );
              })
            }
          </div>
        </Panel>

        {/* Today's Attendance */}
        <Panel>
          <PHead title={`Attendance — ${todayAtt.date}`} action={
            <Pill label={`${presentToday}/${todayAtt.workers.length} present`} c={presentToday===todayAtt.workers.length?T.grn:T.amb} bg={presentToday===todayAtt.workers.length?T.grnL:T.ambL}/>
          }/>
          {/* Summary bar */}
          <div style={{padding:"10px 15px", borderBottom:`1px solid ${T.b1}`}}>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
              <span style={{fontSize:11, color:T.t3}}>Present</span>
              <span style={{fontSize:11, color:T.t3}}>{presentToday} of {todayAtt.workers.length}</span>
            </div>
            <div style={{height:6, background:T.b1, borderRadius:4, overflow:"hidden"}}>
              <div style={{height:"100%", width:`${Math.round(presentToday/todayAtt.workers.length*100)}%`, background:T.grn, borderRadius:4}}/>
            </div>
            <div style={{display:"flex", gap:14, marginTop:8}}>
              <div><span style={{fontSize:11, color:T.t4}}>Total hrs: </span><span style={{fontSize:12, fontWeight:700, color:T.t1}}>{todayAtt.workers.reduce((s,w)=>s+w.hours,0)}h</span></div>
              <div><span style={{fontSize:11, color:T.t4}}>Weather: </span><span style={{fontSize:12, color:T.t2}}>{D.dpr[0].weather}</span></div>
            </div>
          </div>
          {/* Worker list */}
          <div style={{padding:"4px 0"}}>
            {todayAtt.workers.map((w,i)=>(
              <div key={i} style={{padding:"6px 15px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", borderLeft:`3px solid ${w.present?T.grn:T.red}44`}}>
                <div>
                  <div style={{fontSize:12, fontWeight:500, color:T.t1}}>{w.name}</div>
                  <div style={{fontSize:11, color:T.t4}}>{w.role}</div>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  {w.hours>0&&<span style={{fontSize:11.5, color:T.t3, fontVariantNumeric:"tabular-nums"}}>{w.hours}h</span>}
                  <Pill label={w.present?"P":"A"} c={w.present?T.grn:T.red} bg={w.present?T.grnL:T.redL}/>
                </div>
              </div>
            ))}
          </div>
          {todayAtt.note&&<div style={{margin:"8px 15px", padding:"7px 10px", background:T.ambL, borderRadius:5, border:`1px solid ${T.ambM}`, borderLeft:`3px solid ${T.amb}`, fontSize:11.5, color:T.amb}}>Note: {todayAtt.note}</div>}
        </Panel>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2 — DESIGN
// ═══════════════════════════════════════════════════════════════════
// ── DESIGN REQUEST MODAL — outside TabDesign to prevent cursor jump ──────

// ── TitleDropdown — select title from library, auto-fills category+type ──
function TitleDropdown({ value, titles, onSelect, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  // Sync search when value changes externally
  useEffect(() => { setSearch(value || ""); }, [value]);

  const filtered = titles.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.category||"").toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  const handleInput = (e) => {
    setSearch(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const handleSelect = (t) => {
    setSearch(t.title);
    onSelect(t);
    setOpen(false);
  };

  return (
    <div style={{position:"relative"}}>
      <div style={{position:"relative"}}>
        <input
          value={search}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder="Type or select from library..."
          style={{width:"100%",padding:"8px 32px 8px 10px",borderRadius:7,border:"1.5px solid #E5E7EB",fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
        />
        <span onClick={() => setOpen(o => !o)}
          style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",cursor:"pointer",color:"#9CA3AF",fontSize:14}}>▼</span>
      </div>
      {open && filtered.length > 0 && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:9999,background:"white",border:"1.5px solid #E5E7EB",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",maxHeight:220,overflowY:"auto",marginTop:2}}>
          {filtered.map(t => (
            <div key={t.id} onMouseDown={() => handleSelect(t)}
              style={{padding:"8px 12px",cursor:"pointer",borderBottom:"1px solid #F3F4F6"}}
              onMouseEnter={e => e.currentTarget.style.background="#F0F9FF"}
              onMouseLeave={e => e.currentTarget.style.background="white"}>
              <div style={{fontWeight:600,fontSize:13,color:"#111827"}}>{t.title}</div>
              <div style={{fontSize:11,color:"#6B7280",marginTop:1}}>
                {t.category && <span style={{background:"#DBEAFE",color:"#1D4ED8",padding:"1px 6px",borderRadius:4,marginRight:5}}>{t.category}</span>}
                {t.type    && <span style={{background:"#EDE9FE",color:"#6D28D9",padding:"1px 6px",borderRadius:4}}>{t.type}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DesignRequestModal({ show, onClose, editReq, reqForm, setReqForm, onSave, saving, dbTitles=[], dbCats=[], dbTypes=[] }) {
  const CATS  = dbCats.length  > 0 ? dbCats.map(c=>c.name)  : ["Architectural","Structural","Electrical","Plumbing","Interior","Landscape","MEP"];
  const TYPES = dbTypes.length > 0 ? dbTypes.map(t=>t.name) : ["Plan","Elevation","Section","Detail","3D","Diagram"];
  if (!show) return null;
  return (
    <>
      <div onClick={()=>!saving&&onClose()}
        style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400,backdropFilter:"blur(2px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        background:"#FFFFFF",borderRadius:12,boxShadow:"0 24px 64px rgba(0,0,0,0.22)",
        zIndex:401,width:480,maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
        <div style={{background:"#0D1B2A",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>{editReq?"Edit Request":"New Design Request"}</div>
          {!saving&&<button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:20,lineHeight:1}}>×</button>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
          <div style={{marginBottom:12,position:"relative"}}>
            <label style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase",display:"block",marginBottom:4}}>Kya drawing chahiye? *</label>
            <TitleDropdown
              value={reqForm.title}
              titles={dbTitles}
              onSelect={t => setReqForm(p=>({...p, title:t.title, category:t.category||p.category, drawing_type:t.type||p.drawing_type}))}
              onChange={v => setReqForm(p=>({...p, title:v}))}
            />
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase",display:"block",marginBottom:4}}>Category</label>
              <select value={reqForm.category} onChange={e=>setReqForm(p=>({...p,category:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid #E5E7EB",fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase",display:"block",marginBottom:4}}>Priority</label>
              <select value={reqForm.priority} onChange={e=>setReqForm(p=>({...p,priority:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid #E5E7EB",fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
                {["Low","Normal","High","Urgent"].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase",display:"block",marginBottom:4}}>Assign To (optional)</label>
            <input value={reqForm.assigned_to||""} onChange={e=>setReqForm(p=>({...p,assigned_to:e.target.value}))}
              placeholder="Designer ka naam, e.g. Harsh Sahu"
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid #E5E7EB",fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase",display:"block",marginBottom:4}}>Due Date (optional)</label>
            <input type="date" value={reqForm.due_date||""} onChange={e=>setReqForm(p=>({...p,due_date:e.target.value}))}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid #E5E7EB",fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase",display:"block",marginBottom:4}}>Description / Reference</label>
            <textarea value={reqForm.description||""} onChange={e=>setReqForm(p=>({...p,description:e.target.value}))}
              placeholder="Scale, reference, specific details..." rows={3}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid #E5E7EB",fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none"}}/>
          </div>
        </div>
        <div style={{padding:"11px 16px",borderTop:"1px solid #E5E7EB",background:"#F9FAFB",display:"flex",gap:8,flexShrink:0}}>
          <button onClick={onClose} disabled={saving}
            style={{flex:1,padding:"8px",borderRadius:7,background:"white",border:"1px solid #E5E7EB",fontSize:12.5,fontWeight:600,color:"#6B7280",cursor:"pointer"}}>Cancel</button>
          <button onClick={onSave} disabled={saving||!reqForm.title.trim()}
            style={{flex:2,padding:"8px",borderRadius:7,background:saving||!reqForm.title.trim()?"#E5E7EB":"#2563EB",border:"none",color:"white",fontSize:12.5,fontWeight:700,cursor:saving?"not-allowed":"pointer"}}>
            {saving?"Saving...":editReq?"Update":"Submit Request"}
          </button>
        </div>
      </div>
    </>
  );
}

function TabDesign({ project }) {
  const projectId   = project?.id;
  const projectName = project?.name || "Project";
  const CLOUD_NAME  = "dd632nqfm";
  const UPLOAD_PRESET = "gb_buildcon_drawings";
  // State
  const CATS_DEFAULT = ["Architectural","Structural","Electrical","Plumbing","Interior","Landscape","MEP"];
  const TYPES_DEFAULT = ["2D","3D","Detail","Section","Elevation","Site Plan","Working Drawing"];

  const [mainTab,  setMainTab]      = useState("drawings"); // "drawings" | "requests"
  const [drawings, setDrawings]     = useState([]);
  const [requests, setRequests]     = useState([]);
  const [loading,  setLoading]      = useState(true);
  const [dbCats,   setDbCats]       = useState([]);
  const [dbTypes,  setDbTypes]      = useState([]);
  const [dbTitles, setDbTitles]     = useState([]);

  // Computed options (library data or fallback)
  const CATS  = dbCats.length  > 0 ? dbCats.map(c=>c.name)  : CATS_DEFAULT;
  const TYPES = dbTypes.length > 0 ? dbTypes.map(t=>t.name) : TYPES_DEFAULT;

  // Filters - drawings
  const [filter,      setFilter]      = useState("All");
  const [filterStatus,setFilterStatus]= useState("All");
  const [filterType,  setFilterType]  = useState("All");
  const [searchDraw,  setSearchDraw]  = useState("");

  // Filters - requests
  const [filterReqStatus, setFilterReqStatus] = useState("All");
  const [hideUploadedReq, setHideUploadedReq] = useState(true); // hide Uploaded/Rejected by default
  const [filterReqCat,    setFilterReqCat]    = useState("All");
  const [searchReq,       setSearchReq]       = useState("");

  const [sel,      setSel]          = useState(null);
  const [showUpload,  setShowUpload]  = useState(false);
  const [showRevQ,    setShowRevQ]    = useState(false);
  const [showVer,     setShowVer]     = useState(null);
  const [showPins,    setShowPins]    = useState(null);
  const [showReqForm, setShowReqForm] = useState(false);
  const [editReq,     setEditReq]     = useState(null);
  const [reqForm,     setReqForm]     = useState({title:"",category:"Architectural",description:"",priority:"Normal",due_date:"",assigned_to:""});
  const [reqSaving,   setReqSaving]   = useState(false);
  const [pendingReqId, setPendingReqId] = useState(null); // request to mark "Uploaded" after drawing saved

  // Upload form state
  const [uForm, setUForm]   = useState({ title:"", category:"Architectural", drawing_type:"2D", note:"" });
  const [uFile, setUFile]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadErr, setUploadErr] = useState("");

  // Revision state
  const [revForm,   setRevForm]   = useState({ reason:"", pinX:"", pinY:"" });
  const [revSaving, setRevSaving] = useState(false);

  // Action state
  const [acting, setActing] = useState({});
  const [actionErr, setActionErr] = useState("");

  const statusMeta = {
    "Pending":  { c:T.slt, bg:T.sltL, brd:T.b2 },
    "Approved": { c:T.grn, bg:T.grnL, brd:T.grnM },
    "Revision": { c:T.amb, bg:T.ambL, brd:T.ambM },
    "Rejected": { c:T.red, bg:T.redL, brd:T.redM },
  };

  // Load drawings
  const loadDrawings = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.get("/design/drawings?project_id=" + projectId);
      if (res.success) setDrawings(res.data || []);
    } catch(e) {}
    setLoading(false);
  };
  const loadRequests = async () => {
    if (!projectId) return;
    try {
      const res = await api.get("/design/requests?project_id=" + projectId);
      if (res.success) setRequests(res.data || []);
    } catch(e) {}
  };

  const loadCategories = async () => {
    try {
      const [catRes, typeRes, titRes] = await Promise.all([
        api.get("/design/categories?type=category"),
        api.get("/design/categories?type=drawing_type"),
        api.get("/design/titles"),
      ]);
      if (catRes.success  && catRes.data.length)  setDbCats(catRes.data);
      if (typeRes.success && typeRes.data.length)  setDbTypes(typeRes.data);
      if (titRes.success  && titRes.data.length)   setDbTitles(titRes.data);
    } catch(e) {}
  };

  // Load titles immediately on mount (separate from categories for speed)
  useEffect(() => {
    if (!projectId) return;
    api.get("/design/titles").then(r=>{ if(r.success&&r.data.length) setDbTitles(r.data); }).catch(()=>{});
    api.get("/design/categories?type=category").then(r=>{ if(r.success&&r.data.length) setDbCats(r.data); }).catch(()=>{});
    api.get("/design/categories?type=drawing_type").then(r=>{ if(r.success&&r.data.length) setDbTypes(r.data); }).catch(()=>{});
    loadDrawings();
    loadRequests();
  }, [projectId]);

  const filtered = drawings.filter(d => {
    if (filter !== "All" && d.category !== filter) return false;
    if (filterStatus !== "All" && d.status !== filterStatus) return false;
    if (filterType   !== "All" && (d.drawing_type||d.type) !== filterType) return false;
    if (searchDraw && !d.title.toLowerCase().includes(searchDraw.toLowerCase())) return false;
    return true;
  });

  const catCounts = CATS.reduce((acc, c) => ({
    ...acc, [c]: drawings.filter(d => d.category === c).length
  }), {});

  const revQueue = drawings.filter(d => d.status === "Revision");

  // ── Request handlers ─────────────────────────────────────────────
  const handleSaveRequest = async () => {
    if (!reqForm.title.trim()) return;
    setReqSaving(true);
    try {
      if (editReq) {
        const res = await api.patch("/design/requests/" + editReq.id, reqForm);
        if (res.success) setRequests(p => p.map(r => r.id === editReq.id ? res.data : r));
      } else {
        const res = await api.post("/design/requests", {
          ...reqForm,
          project_id:   projectId,
          project_name: projectName,
          requested_by: "Site Team",
        });
        if (res.success) setRequests(p => [res.data, ...p]);
      }
      setShowReqForm(false);
      setReqForm({title:"",category:"Architectural",description:"",priority:"Normal",due_date:""});
      setEditReq(null);
    } catch(e) {}
    setReqSaving(false);
  };

  const handleUpdateReqStatus = async (id, status) => {
    try {
      const res = await api.patch("/design/requests/" + id, { status });
      if (res.success) setRequests(p => p.map(r => r.id === id ? res.data : r));
    } catch(e) {}
  };

  const handleDeleteReq = async (id) => {
    if (!window.confirm("Delete this request?")) return;
    try {
      await api.del("/design/requests/" + id);
      setRequests(p => p.filter(r => r.id !== id));
    } catch(e) {}
  };

  // ── Cloudinary Upload ─────────────────────────────────────────────
  const uploadToCloudinary = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("folder", "gb_buildcon/drawings");
    const xhr = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 80));
      };
      xhr.onload = () => {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status === 200) resolve(data);
        else reject(new Error(data.error?.message || "Upload failed"));
      };
      xhr.onerror = () => reject(new Error("Network error"));
      // PDF/DWG → raw, images → image
      const isPDF = file.type === "application/pdf" || file.name.match(/\.(pdf|dwg|dxf)$/i);
      const resType = isPDF ? "raw" : "image";
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resType}/upload`);
      xhr.send(fd);
    });
  };

  const handleUpload = async () => {
    if (!uForm.title.trim()) { setUploadErr("Title required"); return; }
    if (!uFile) { setUploadErr("File select karo"); return; }
    setUploading(true); setUploadErr(""); setUploadPct(5);
    try {
      // 1. Upload to Cloudinary
      const cld = await uploadToCloudinary(uFile);
      setUploadPct(85);
      // 2. Save to backend
      const res = await api.post("/design/drawings", {
        project_id:   projectId,
        project_name: projectName,
        title:        uForm.title,
        category:     uForm.category,
        drawing_type: uForm.drawing_type,
        note:         uForm.note || null,
        file_url:     cld.secure_url,
        file_size:    Math.round(uFile.size / 1024) + " KB",
      });
      setUploadPct(100);
      if (res.success) {
        setDrawings(p => [res.data, ...p]);
        setShowUpload(false);
        setUForm({ title:"", category:"Architectural", drawing_type:"2D", note:"" });
        setUFile(null); setUploadPct(0);
        // Mark linked request as Uploaded
        if (pendingReqId) {
          handleUpdateReqStatus(pendingReqId, "Uploaded");
          setPendingReqId(null);
        }
      } else {
        setUploadErr(res.message || "Save failed");
      }
    } catch(e) { setUploadErr(e.message); }
    setUploading(false);
  };

  // ── New Version Upload ────────────────────────────────────────────
  const handleNewVersion = async (drawingId, file, note) => {
    if (!file) return;
    setActing(p => ({...p, ["ver"+drawingId]: true}));
    try {
      const cld = await uploadToCloudinary(file);
      const res = await api.post("/design/drawings/" + drawingId + "/versions", {
        file_url:  cld.secure_url,
        file_size: Math.round(file.size / 1024) + " KB",
        note:      note || null,
      });
      if (res.success) {
        // Force fresh reload from backend
        await loadDrawings();
        setShowRevQ(false);
        setShowVer(null);
        // Brief delay then reopen revision queue if needed
        setTimeout(() => {}, 100);
      } else {
        setActionErr(res.message || "Version upload failed");
      }
    } catch(e) { setActionErr(e.message); }
    setActing(p => ({...p, ["ver"+drawingId]: false}));
  };

  // ── Admin Actions ─────────────────────────────────────────────────
  const handleStatus = async (id, status, note) => {
    setActing(p => ({...p, [id]: status}));
    setActionErr("");
    try {
      const res = await api.patch("/design/drawings/" + id + "/status", { status, note: note || null });
      if (res.success) {
        setDrawings(p => p.map(d => d.id === id ? { ...d, status } : d));
        setSel(null);
      } else { setActionErr(res.message || "Failed"); }
    } catch(e) { setActionErr(e.message); }
    setActing(p => ({...p, [id]: null}));
  };

  // ── Add Revision Pin ──────────────────────────────────────────────
  const handleAddPin = async (drawingId) => {
    if (!revForm.reason) return;
    setRevSaving(true);
    try {
      await api.post("/design/drawings/" + drawingId + "/pins", {
        label: revForm.reason,
        x_pct: parseFloat(revForm.pinX) || 50,
        y_pct: parseFloat(revForm.pinY) || 50,
      });
      setRevForm({ reason:"", pinX:"", pinY:"" });
      loadDrawings();
    } catch(e) {}
    setRevSaving(false);
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}) : "—";

  // DesignRequestModal is defined outside TabDesign

  // ── UPLOAD MODAL ──────────────────────────────────────────────────
  const UploadModal = () => (
    <>
      <div onClick={()=>!uploading&&setShowUpload(false)}
        style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400,backdropFilter:"blur(2px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        background:T.surface,borderRadius:12,boxShadow:"0 24px 64px rgba(0,0,0,0.22)",
        zIndex:401,width:520,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Header */}
        <div style={{background:"#0D1B2A",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"white"}}>Upload Drawing</div>
            <div style={{fontSize:10.5,color:"rgba(255,255,255,0.45)",marginTop:1}}>{projectName}</div>
          </div>
          {!uploading&&<button onClick={()=>setShowUpload(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:20,lineHeight:1}}>×</button>}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
          {/* Form fields */}
          <div style={{marginBottom:12,position:"relative"}}>
            <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Drawing Title *</label>
            <TitleDropdown
              value={uForm.title}
              titles={dbTitles}
              onSelect={t => setUForm(p=>({...p, title:t.title, category:t.category||p.category, drawing_type:t.type||p.drawing_type}))}
              onChange={v => setUForm(p=>({...p, title:v}))}
            />
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Category</label>
              <select value={uForm.category} onChange={e=>setUForm(p=>({...p,category:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Type</label>
              <select value={uForm.drawing_type} onChange={e=>setUForm(p=>({...p,drawing_type:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
                {TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* File drop zone */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>File *</label>
            <label style={{display:"block",border:"2px dashed "+(uFile?T.grn:T.b2),borderRadius:9,padding:"20px 16px",
              textAlign:"center",background:uFile?T.grnL:T.surfaceB,cursor:"pointer",transition:"all 0.2s"}}>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf,.svg" style={{display:"none"}}
                onChange={e=>{ if(e.target.files[0]){ setUFile(e.target.files[0]); setUploadErr(""); }}}/>
              {uFile ? (
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:T.grn}}>✓ {uFile.name}</div>
                  <div style={{fontSize:11,color:T.t4,marginTop:3}}>{(uFile.size/1024).toFixed(0)} KB</div>
                </div>
              ) : (
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:T.t2}}>📁 File choose karo ya drop karo</div>
                  <div style={{fontSize:11,color:T.t4,marginTop:3}}>PDF, PNG, JPG, DWG, DXF · Max 50MB</div>
                </div>
              )}
            </label>
          </div>

          {/* Note */}
          <div>
            <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Notes (optional)</label>
            <textarea value={uForm.note} onChange={e=>setUForm(p=>({...p,note:e.target.value}))}
              placeholder="Reviewer ke liye notes..." rows={2}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none"}}/>
          </div>

          {/* Upload progress */}
          {uploading&&(
            <div style={{marginTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:11,color:T.t3}}>Uploading...</span>
                <span style={{fontSize:11,fontWeight:700,color:T.blu}}>{uploadPct}%</span>
              </div>
              <div style={{height:6,background:T.b1,borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:uploadPct+"%",background:T.blu,borderRadius:4,transition:"width 0.3s"}}/>
              </div>
            </div>
          )}
          {uploadErr&&<div style={{marginTop:8,padding:"7px 10px",background:T.redL,border:"1px solid "+T.redM,borderRadius:6,fontSize:12,color:T.red}}>{uploadErr}</div>}
        </div>

        <div style={{padding:"11px 16px",borderTop:"1px solid "+T.b1,background:T.surfaceB,display:"flex",gap:8,flexShrink:0}}>
          <button onClick={()=>setShowUpload(false)} disabled={uploading}
            style={{flex:1,padding:"8px",borderRadius:7,background:T.surface,border:"1px solid "+T.b1,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>
            Cancel
          </button>
          <button onClick={handleUpload} disabled={uploading||!uFile||!uForm.title}
            style={{flex:2,padding:"8px",borderRadius:7,background:uploading||!uFile||!uForm.title?T.b1:T.blu,border:"none",color:"white",fontSize:12.5,fontWeight:700,cursor:uploading?"not-allowed":"pointer"}}>
            {uploading?"Uploading...":"⬆ Upload Drawing"}
          </button>
        </div>
      </div>
    </>
  );

  // ── Revision Pin Form ────────────────────────────────────────────
  const RevPinForm = ({ drawingId, onAdded }) => {
    const [pinNote, setPinNote] = useState("");
    const [saving,  setSaving]  = useState(false);
    const [added,   setAdded]   = useState(false);
    const submit = async () => {
      if (!pinNote.trim()) return;
      setSaving(true);
      try {
        await api.post("/design/drawings/" + drawingId + "/pins", {
          label: pinNote, x_pct: 50, y_pct: 50,
        });
        setPinNote(""); setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        onAdded();
      } catch(e) {}
      setSaving(false);
    };
    return(
      <div style={{marginTop:8}}>
        <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>📍 Add Revision Pin / Comment</label>
        <div style={{display:"flex",gap:6}}>
          <input value={pinNote} onChange={e=>setPinNote(e.target.value)}
            placeholder="e.g. Column dimension ghalat hai..."
            style={{flex:1,padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
          <button onClick={submit} disabled={saving||!pinNote.trim()}
            style={{padding:"6px 11px",borderRadius:6,background:pinNote.trim()?T.amb:T.b1,border:"none",color:"white",fontSize:11,fontWeight:700,cursor:pinNote.trim()?"pointer":"not-allowed",whiteSpace:"nowrap"}}>
            {added?"✓ Added":saving?"...":"Add Pin"}
          </button>
        </div>
      </div>
    );
  };

  // ── REVISION QUEUE PANEL ──────────────────────────────────────────
  const RevisionQueue = () => (
    <>
      <div onClick={()=>setShowRevQ(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:400}}/>
      <div style={{position:"fixed",right:0,top:0,bottom:0,width:440,background:T.bg,zIndex:401,
        boxShadow:"-4px 0 24px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column"}}>
        <div style={{background:"#D97706",padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"white"}}>Revision Queue</div>
            <div style={{fontSize:10.5,color:"rgba(255,255,255,0.7)",marginTop:1}}>{revQueue.length} drawings need revision</div>
          </div>
          <button onClick={()=>setShowRevQ(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.7)",fontSize:20}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px"}}>
          {revQueue.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4}}>No drawings in revision queue</div>}
          {revQueue.map(d=>(
            <div key={d.id} style={{background:T.surface,borderRadius:8,border:"1px solid "+T.ambM,padding:"12px",marginBottom:10,borderLeft:"3px solid "+T.amb}}>
              <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{d.title}</div>
              <div style={{fontSize:11,color:T.t4,marginTop:2}}>{d.category} · {d.current_version} · {fmtDate(d.updated_at)}</div>
              {d.note&&<div style={{fontSize:11.5,color:T.amb,marginTop:5,padding:"5px 8px",background:T.ambL,borderRadius:5}}>📝 {d.note}</div>}
              {/* Revision reason / note */}
              {d.note&&<div style={{fontSize:11.5,color:T.amb,marginTop:6,padding:"6px 9px",background:"rgba(217,119,6,0.08)",borderRadius:6,borderLeft:"3px solid "+T.amb}}>
                💬 {d.note}
              </div>}
              {/* Add Pin */}
              <RevPinForm drawingId={d.id} onAdded={loadDrawings}/>
              {/* Upload new version */}
              <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid "+T.b1}}>
                <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:5}}>Upload Revised Version</label>
                <label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",
                  border:"1.5px dashed "+(acting["ver"+d.id]?T.blu:T.b2),borderRadius:6,
                  cursor:acting["ver"+d.id]?"not-allowed":"pointer",
                  background:acting["ver"+d.id]?T.bluL:T.surfaceB,transition:"all 0.2s"}}>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf" style={{display:"none"}}
                    disabled={!!acting["ver"+d.id]}
                    onChange={e=>{ if(e.target.files[0]) handleNewVersion(d.id, e.target.files[0], null); }}/>
                  {acting["ver"+d.id] ? (
                    <div style={{width:"100%"}}>
                      <div style={{fontSize:11.5,color:T.blu,fontWeight:600,marginBottom:4}}>⏳ Uploading...</div>
                      <div style={{height:4,background:T.b1,borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",width:uploadPct+"%",background:T.blu,borderRadius:4,transition:"width 0.3s"}}/>
                      </div>
                    </div>
                  ) : (
                    <span style={{fontSize:11.5,color:T.blu,fontWeight:600}}>⬆ Upload New Version</span>
                  )}
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  // ── VERSION HISTORY MODAL ─────────────────────────────────────────
  const VersionModal = ({ drawing }) => {
    const [versions, setVersions] = useState([]);
    const [vLoading, setVLoading] = useState(true);
    useEffect(()=>{
      api.get("/design/drawings/"+drawing.id).then(res=>{
        if(res.success) setVersions(res.data.versions||[]);
        setVLoading(false);
      });
    },[]);
    return(
      <>
        <div onClick={()=>setShowVer(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
          background:T.surface,borderRadius:12,zIndex:401,width:480,maxHeight:"80vh",
          display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
          <div style={{background:"#0D1B2A",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div style={{fontSize:13,fontWeight:700,color:"white"}}>Version History — {drawing.title}</div>
            <button onClick={()=>setShowVer(null)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:18}}>×</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"12px"}}>
            {vLoading&&<div style={{textAlign:"center",padding:"30px",color:T.t4}}>Loading...</div>}
            {versions.map((v,i)=>(
              <div key={v.id} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:i===0?T.blu:T.b1,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:11,fontWeight:700,color:i===0?"white":T.t3}}>{v.version_number}</span>
                </div>
                <div style={{flex:1,background:T.surfaceB,borderRadius:7,padding:"8px 10px",border:"1px solid "+T.b1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11.5,fontWeight:600,color:T.t1}}>{v.uploaded_by_name||"—"}</span>
                    <span style={{fontSize:10,color:T.t4}}>{fmtDate(v.created_at)}</span>
                  </div>
                  {v.note&&<div style={{fontSize:11,color:T.t3,marginTop:3}}>{v.note}</div>}
                  {v.file_url&&<a href={v.file_url} target="_blank" rel="noreferrer"
                    style={{fontSize:11,color:T.blu,textDecoration:"none",marginTop:4,display:"inline-block"}}>
                    📄 View File
                  </a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  // ── APPROVE / REVISION / REJECT panel (selected drawing) ─────────
  const ActionPanel = ({ d }) => {
    const [revNote,    setRevNote]    = useState("");
    const [rejNote,    setRejNote]    = useState("");
    const [showRevForm,setShowRevForm]= useState(false);
    const [showRejForm,setShowRejForm]= useState(false);
    const sm = statusMeta[d.status] || statusMeta["Pending"];
    return(
      <div style={{margin:"8px 0",padding:"12px 15px",background:sm.bg,borderRadius:8,border:"1px solid "+sm.brd}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{d.title}</div>
            <div style={{fontSize:11,color:T.t4}}>{d.category} · {d.current_version} · {d.uploaded_by_name||"—"} · {fmtDate(d.updated_at)}</div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {d.file_url&&<a href={d.file_url} target="_blank" rel="noreferrer"
              style={{padding:"5px 10px",borderRadius:6,background:T.bluL,border:"1px solid "+T.bluM,color:T.blu,fontSize:11,fontWeight:600,textDecoration:"none"}}>
              👁 View
            </a>}
            {d.file_url&&<a href={d.file_url} download target="_blank" rel="noreferrer"
              style={{padding:"5px 10px",borderRadius:6,background:T.surfaceB,border:"1px solid "+T.b1,color:T.t3,fontSize:11,fontWeight:600,textDecoration:"none"}}>
              ⬇ Download
            </a>}
            <button onClick={()=>setShowVer(d)} style={{padding:"5px 10px",borderRadius:6,background:T.surfaceB,border:"1px solid "+T.b1,color:T.t3,fontSize:11,cursor:"pointer"}}>
              🕐 History
            </button>
            <button onClick={()=>setSel(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,fontSize:16}}>×</button>
          </div>
        </div>

        {actionErr&&<div style={{padding:"6px 10px",background:T.redL,border:"1px solid "+T.redM,borderRadius:6,fontSize:11.5,color:T.red,marginBottom:8}}>{actionErr}</div>}

        {d.status!=="Approved"&&(
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {/* Approve */}
            <button onClick={()=>handleStatus(d.id,"Approved",null)} disabled={!!acting[d.id]}
              style={{padding:"7px 16px",borderRadius:7,background:acting[d.id]==="Approved"?T.b1:T.grn,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
              ✓ Approve
            </button>
            {/* Request Revision */}
            <button onClick={()=>{setShowRevForm(!showRevForm);setShowRejForm(false);}}
              style={{padding:"7px 16px",borderRadius:7,background:T.ambL,border:"1px solid "+T.ambM,color:T.amb,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              🔄 Request Revision
            </button>
            {/* Reject */}
            <button onClick={()=>{setShowRejForm(!showRejForm);setShowRevForm(false);}}
              style={{padding:"7px 16px",borderRadius:7,background:T.redL,border:"1px solid "+T.redM,color:T.red,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              ✕ Reject
            </button>
          </div>
        )}

        {d.status==="Approved"&&(
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:T.grn,fontWeight:600}}>✓ Approved</span>
            <button onClick={()=>handleStatus(d.id,"Pending","Reopened for revision")}
              style={{padding:"5px 12px",borderRadius:6,background:T.ambL,border:"1px solid "+T.ambM,color:T.amb,fontSize:11,cursor:"pointer"}}>
              Reopen
            </button>
          </div>
        )}

        {/* Revision form */}
        {showRevForm&&(
          <div style={{marginTop:10,padding:"10px",background:T.ambL,borderRadius:7,border:"1px solid "+T.ambM}}>
            <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:5}}>Revision Reason *</label>
            <textarea value={revNote} onChange={e=>setRevNote(e.target.value)}
              placeholder="Kya change karna hai..." rows={2}
              style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.ambM,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none"}}/>
            <div style={{display:"flex",gap:6,marginTop:7}}>
              <button onClick={()=>setShowRevForm(false)} style={{flex:1,padding:"6px",borderRadius:6,background:T.surface,border:"1px solid "+T.b1,fontSize:11,cursor:"pointer",color:T.t3}}>Cancel</button>
              <button onClick={()=>{ if(revNote) handleStatus(d.id,"Revision",revNote); setShowRevForm(false); }}
                style={{flex:2,padding:"6px",borderRadius:6,background:T.amb,border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                Send to Revision Queue
              </button>
            </div>
          </div>
        )}

        {/* Reject form */}
        {showRejForm&&(
          <div style={{marginTop:10,padding:"10px",background:T.redL,borderRadius:7,border:"1px solid "+T.redM}}>
            <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:5}}>Rejection Reason *</label>
            <textarea value={rejNote} onChange={e=>setRejNote(e.target.value)}
              placeholder="Rejection ka reason..." rows={2}
              style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.redM,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none"}}/>
            <div style={{display:"flex",gap:6,marginTop:7}}>
              <button onClick={()=>setShowRejForm(false)} style={{flex:1,padding:"6px",borderRadius:6,background:T.surface,border:"1px solid "+T.b1,fontSize:11,cursor:"pointer",color:T.t3}}>Cancel</button>
              <button onClick={()=>{ if(rejNote) handleStatus(d.id,"Rejected",rejNote); setShowRejForm(false); }}
                style={{flex:2,padding:"6px",borderRadius:6,background:T.red,border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                Confirm Reject
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── MAIN RENDER ───────────────────────────────────────────────────
  return (
    <div style={{padding:"14px 18px"}}>

      {/* Modals */}
      {showUpload && <UploadModal />}
      {showRevQ   && <RevisionQueue />}
      {showVer    && <VersionModal drawing={showVer} />}
      <DesignRequestModal show={showReqForm} onClose={()=>setShowReqForm(false)} editReq={editReq} reqForm={reqForm} setReqForm={setReqForm} onSave={handleSaveRequest} saving={reqSaving} dbTitles={dbTitles} dbCats={dbCats} dbTypes={dbTypes}/>

      {/* Main tab switcher: Drawings | Requests */}
      <div style={{display:"flex",gap:0,marginBottom:14,borderBottom:"2px solid "+T.b1}}>
        {[
          {id:"drawings", label:"Drawings", count:drawings.length},
          {id:"requests", label:"Design Requests", count:requests.filter(r=>r.status==="Pending").length},
        ].map(t=>(
          <button key={t.id} onClick={()=>setMainTab(t.id)}
            style={{padding:"8px 18px",border:"none",background:"none",
              color:mainTab===t.id?T.blu:T.t3,fontSize:13,fontWeight:mainTab===t.id?700:400,
              cursor:"pointer",borderBottom:mainTab===t.id?"2px solid "+T.blu:"2px solid transparent",
              marginBottom:"-2px",display:"flex",alignItems:"center",gap:6}}>
            {t.label}
            {t.count>0&&<span style={{background:mainTab===t.id?T.blu:T.b1,color:mainTab===t.id?"white":T.t3,fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:10}}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── DRAWINGS TAB ── */}
      {mainTab==="drawings"&&<>
      {/* Header toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:5,flex:1,flexWrap:"wrap"}}>
          {["All",...CATS].map(c=>(
            <button key={c} onClick={()=>setFilter(c)}
              style={{padding:"4px 10px",borderRadius:20,border:"1.5px solid "+(filter===c?T.blu:T.b1),
                background:filter===c?T.bluL:"none",color:filter===c?T.blu:T.t3,
                fontSize:11,fontWeight:filter===c?700:400,cursor:"pointer",whiteSpace:"nowrap"}}>
              {c}{c!=="All"&&catCounts[c]>0&&<span style={{marginLeft:4,fontSize:10}}>{catCounts[c]}</span>}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {/* Search + filters */}
          <div style={{position:"relative"}}>
            <input value={searchDraw} onChange={e=>setSearchDraw(e.target.value)}
              placeholder="Search..."
              style={{padding:"5px 9px 5px 27px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:11.5,outline:"none",fontFamily:"inherit",width:130}}/>
            <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",fontSize:12,color:T.t4}}>🔍</span>
          </div>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{padding:"5px 8px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:11.5,outline:"none",fontFamily:"inherit",cursor:"pointer",background:T.surface}}>
            {["All Status","Pending","Approved","Revision","Rejected"].map(s=><option key={s} value={s==="All Status"?"All":s}>{s}</option>)}
          </select>
          {revQueue.length>0&&(
            <button onClick={()=>setShowRevQ(true)}
              style={{padding:"6px 12px",borderRadius:7,background:T.ambL,border:"1px solid "+T.ambM,
                color:T.amb,fontSize:11.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
              🔄 Revision Queue
              <span style={{background:T.amb,color:"white",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:10}}>{revQueue.length}</span>
            </button>
          )}
          <button onClick={()=>setShowUpload(true)}
            style={{padding:"6px 14px",borderRadius:7,background:T.blu,border:"none",color:"white",
              fontSize:11.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            ⬆ Upload Drawing
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>Loading drawings...</div>}

      {/* Empty state */}
      {!loading&&drawings.length===0&&(
        <div style={{textAlign:"center",padding:"60px 20px",color:T.t4}}>
          <div style={{fontSize:40,marginBottom:10}}>📐</div>
          <div style={{fontSize:14,fontWeight:600,color:T.t2}}>Koi drawing nahi hai abhi</div>
          <div style={{fontSize:12,marginTop:4}}>Upload Drawing button se pehli drawing add karo</div>
        </div>
      )}

      {/* Drawing list */}
      {!loading&&filtered.length>0&&(
        <Panel>
          <THead cols="2fr 80px 120px 55px 100px 90px 60px" headers={["Title","Type","Category","Ver.","Status","Uploaded","Size"]}/>
          {filtered.map(d=>{
            const sm = statusMeta[d.status] || statusMeta["Pending"];
            const isS = sel?.id===d.id;
            return(
              <div key={d.id}>
                <div onClick={()=>setSel(isS?null:d)}
                  style={{display:"grid",gridTemplateColumns:"2fr 80px 120px 55px 100px 90px 60px",
                    padding:"9px 14px",borderBottom:"1px solid "+T.b1,alignItems:"center",cursor:"pointer",
                    background:isS?T.bluL:"none",borderLeft:isS?"3px solid "+T.blu:"3px solid transparent",transition:"all .1s"}}
                  onMouseEnter={e=>{if(!isS)e.currentTarget.style.background=T.surfaceB;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=isS?T.bluL:"none";}}>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:isS?700:500,color:isS?T.blu:T.t1}}>{d.title}</div>
                    {d.note&&<div style={{fontSize:10.5,color:T.t4,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.note}</div>}
                  </div>
                  <Pill label={d.drawing_type||d.type||"2D"} c={d.drawing_type==="3D"?T.pur:T.slt} bg={d.drawing_type==="3D"?T.purL:T.sltL}/>
                  <span style={{fontSize:11.5,color:T.t2}}>{d.category}</span>
                  <span style={{fontSize:11,color:T.t4,fontFamily:"monospace"}}>{d.current_version||"v1"}</span>
                  <Pill label={d.status} c={sm.c} bg={sm.bg}/>
                  <span style={{fontSize:11,color:T.t3}}>{d.uploaded_by_name||"—"}</span>
                  <span style={{fontSize:11,color:T.t4}}>{d.file_size||"—"}</span>
                </div>
                {isS&&<ActionPanel d={d}/>}
              </div>
            );
          })}
        </Panel>
      )}
      </>} {/* end drawings tab */}

      {/* ── REQUESTS TAB ── */}
      {mainTab==="requests"&&(
        <div>
          {/* Toolbar */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:12,color:T.t3}}>{requests.length} total requests</div>
            <button onClick={()=>{setEditReq(null);setReqForm({title:"",category:"Architectural",description:"",priority:"Normal",due_date:""});setShowReqForm(true);}}
              style={{padding:"6px 14px",borderRadius:7,background:T.blu,border:"none",color:"white",fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
              + New Request
            </button>
          </div>

          {/* Empty state */}
          {requests.length===0&&(
            <div style={{textAlign:"center",padding:"60px 20px",color:T.t4}}>
              <div style={{fontSize:36,marginBottom:8}}>📋</div>
              <div style={{fontSize:14,fontWeight:600,color:T.t2}}>Koi design request nahi</div>
              <div style={{fontSize:12,marginTop:4}}>New Request button se request karo</div>
            </div>
          )}

          {/* Request cards */}
          {/* Request filters */}
          <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{position:"relative",flex:1,minWidth:160}}>
              <input value={searchReq} onChange={e=>setSearchReq(e.target.value)}
                placeholder="Search requests..."
                style={{width:"100%",padding:"7px 10px 7px 30px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:T.t4}}>🔍</span>
            </div>
            <select value={filterReqStatus} onChange={e=>setFilterReqStatus(e.target.value)}
              style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",fontFamily:"inherit",cursor:"pointer",background:T.surface}}>
              {["All Status","Pending","In Progress","Uploaded","Rejected"].map(s=><option key={s} value={s==="All Status"?"All":s}>{s}</option>)}
            </select>
            <select value={filterReqCat} onChange={e=>setFilterReqCat(e.target.value)}
              style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",fontFamily:"inherit",cursor:"pointer",background:T.surface}}>
              <option value="All">All Categories</option>
              {CATS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>

          {requests.filter(req=>{
            if(hideUploadedReq && (req.status==="Uploaded"||req.status==="Rejected")) return false;
            if(filterReqStatus!=="All" && req.status!==filterReqStatus) return false;
            if(filterReqCat!=="All" && req.category!==filterReqCat) return false;
            if(searchReq && !req.title.toLowerCase().includes(searchReq.toLowerCase()) && !(req.description||"").toLowerCase().includes(searchReq.toLowerCase())) return false;
            return true;
          }).map(req=>{
            const prioMeta = {
              "Urgent": {c:T.red,   bg:T.redL},
              "High":   {c:T.amb,   bg:T.ambL},
              "Normal": {c:T.blu,   bg:T.bluL},
              "Low":    {c:T.t4,    bg:T.surfaceB},
            };
            const statusMeta2 = {
              "Pending":     {c:T.amb, bg:T.ambL},
              "In Progress": {c:T.blu, bg:T.bluL},
              "Uploaded":    {c:T.grn, bg:T.grnL},
              "Rejected":    {c:T.red, bg:T.redL},
            };
            const pm = prioMeta[req.priority]    || prioMeta["Normal"];
            const sm = statusMeta2[req.status]   || statusMeta2["Pending"];
            return(
              <div key={req.id} style={{background:T.surface,borderRadius:9,border:"1px solid "+T.b1,
                padding:"12px 14px",marginBottom:8,borderLeft:"3px solid "+pm.c}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{req.title}</div>
                    <div style={{fontSize:11,color:T.t4,marginTop:2}}>
                      {req.category}
                      {req.due_date&&<span style={{marginLeft:8}}>· Due: {fmtDate(req.due_date)}</span>}
                      {req.requested_by&&<span style={{marginLeft:8}}>· By: {req.requested_by}</span>}
                    </div>
                    {req.description&&<div style={{fontSize:11.5,color:T.t2,marginTop:5,lineHeight:1.4}}>{req.description}</div>}
                    {req.assigned_to&&<div style={{fontSize:11,color:T.blu,marginTop:4}}>👤 Assigned to: {req.assigned_to}</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:pm.bg,color:pm.c}}>{req.priority}</span>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:sm.bg,color:sm.c}}>{req.status}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                  {req.status==="Pending"&&<>
                    <button onClick={()=>{setEditReq(req);setReqForm({title:req.title,category:req.category,description:req.description||"",priority:req.priority,due_date:req.due_date||"",assigned_to:req.assigned_to||""});setShowReqForm(true);}}
                      style={{padding:"4px 10px",borderRadius:6,background:T.bluL,border:"1px solid "+T.bluM,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                      👤 Assign
                    </button>
                    <button onClick={()=>{
                      setUForm({title:req.title+" Drawing",category:req.category,drawing_type:"2D",note:req.description||""});
                      setPendingReqId(req.id);
                      setMainTab("drawings"); setShowUpload(true);
                      handleUpdateReqStatus(req.id,"In Progress");
                    }}
                      style={{padding:"4px 10px",borderRadius:6,background:T.grnL,border:"1px solid "+T.grnM,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                      ⬆ Upload Direct
                    </button>
                  </>}
                  {req.status==="In Progress"&&(
                    <button onClick={()=>{
                      setUForm({title:req.title+" Drawing",category:req.category,drawing_type:"2D",note:req.description||""});
                      setPendingReqId(req.id);
                      setMainTab("drawings"); setShowUpload(true);
                    }}
                      style={{padding:"4px 10px",borderRadius:6,background:T.grnL,border:"1px solid "+T.grnM,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                      ⬆ Upload Drawing
                    </button>
                  )}
                  <button onClick={()=>{setEditReq(req);setReqForm({title:req.title,category:req.category,description:req.description||"",priority:req.priority,due_date:req.due_date||"",assigned_to:req.assigned_to||""});setShowReqForm(true);}}
                    style={{padding:"4px 10px",borderRadius:6,background:T.surfaceB,border:"1px solid "+T.b1,color:T.t3,fontSize:11,cursor:"pointer"}}>
                    Edit
                  </button>
                  <button onClick={()=>handleDeleteReq(req.id)}
                    style={{padding:"4px 10px",borderRadius:6,background:T.redL,border:"1px solid "+T.redM,color:T.red,fontSize:11,cursor:"pointer"}}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3 — ESTIMATE
// ═══════════════════════════════════════════════════════════════════
function TabEstimate() {
  const [subTab, setSubTab] = useState("boq");
  const [openSec, setOpenSec] = useState({1:true,2:true,3:false,4:false});

  // computed
  const grandTotal  = D.boqSections.flatMap(s=>s.items).reduce((s,i)=>s+i.amount,0);
  const donePct     = Math.round(D.boqSections.flatMap(s=>s.items).reduce((s,i)=>s+(i.amount*(i.done/100)),0)/grandTotal*100)||0;
  const paidTotal   = D.invoices.filter(i=>i.status==="Paid").reduce((s,i)=>s+i.amount,0);
  const pendingAmt  = D.invoices.find(i=>i.status==="Pending")?.amount||0;
  const upcomingAmt = D.invoices.filter(i=>i.status==="Upcoming").reduce((s,i)=>s+i.amount,0);
  const collected   = paidTotal;
  const balance     = grandTotal - collected;
  const invS={"Paid":{c:T.grn,bg:T.grnL,brd:T.grnM},"Pending":{c:T.amb,bg:T.ambL,brd:T.ambM},"Upcoming":{c:T.slt,bg:T.sltL,brd:T.b2}};

  const SUBTABS=[
    {id:"boq",  l:"BOQ / Estimate"},
    {id:"payment",l:"Payments"},
    {id:"milestone",l:"Milestones"},
    {id:"invoice",l:"Invoices"},
  ];

  return(
    <div style={{padding:"14px 18px"}}>

      {/* ── Left + Right layout ── */}
      <div style={{display:"grid",gridTemplateColumns:"240px 1fr",gap:14}}>

        {/* Left summary card */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:T.surface,borderRadius:9,padding:"13px 14px",border:`1.5px solid ${T.blu}`,borderLeft:`4px solid ${T.blu}`,boxShadow:"0 2px 10px rgba(37,99,235,0.08)"}}>
            <div style={{fontSize:10,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Contract Summary</div>
            {[
              {l:"Contract Value",v:`₹${fmt(grandTotal)}`,c:T.slt,bold:true},
              {l:"Work Done",     v:`${donePct}%`,          c:T.blu},
              {l:"Collected",     v:`₹${fmt(collected)}`,   c:T.grn},
              {l:"Balance Due",   v:`₹${fmt(balance)}`,     c:T.red},
              {l:"Sections",      v:D.boqSections.length,   c:T.slt},
              {l:"Total Items",   v:D.boqSections.flatMap(s=>s.items).length, c:T.slt},
            ].map((r,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:i<5?`1px solid ${T.b1}`:"none"}}>
                <span style={{fontSize:11,color:T.t4}}>{r.l}</span>
                <span style={{fontSize:r.bold?14:12.5,fontWeight:r.bold?700:600,color:r.c}}>{r.v}</span>
              </div>
            ))}
            {/* Progress bar */}
            <div style={{marginTop:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:10,color:T.t3}}>Work Progress</span>
                <span style={{fontSize:11,fontWeight:700,color:T.blu}}>{donePct}%</span>
              </div>
              <div style={{height:6,background:T.b1,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${donePct}%`,background:`linear-gradient(90deg,${T.blu},#60a5fa)`,borderRadius:3}}/>
              </div>
            </div>
            <div style={{marginTop:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:10,color:T.t3}}>Payment Collected</span>
                <span style={{fontSize:11,fontWeight:700,color:T.grn}}>{Math.round(collected/grandTotal*100)}%</span>
              </div>
              <div style={{height:6,background:T.b1,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.round(collected/grandTotal*100)}%`,background:`linear-gradient(90deg,${T.grn},#34d399)`,borderRadius:3}}/>
              </div>
            </div>
          </div>

          {/* Invoice status mini */}
          <div style={{background:T.surface,borderRadius:9,padding:"12px 14px",border:`1px solid ${T.b1}`}}>
            <div style={{fontSize:10,fontWeight:700,color:T.t2,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Invoice Status</div>
            {[{l:"Paid",v:`₹${fmt(paidTotal)}`,c:T.grn,bg:T.grnL},{l:"Pending",v:`₹${fmt(pendingAmt)}`,c:T.amb,bg:T.ambL},{l:"Upcoming",v:`₹${fmt(upcomingAmt)}`,c:T.slt,bg:T.sltL}].map((s,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",borderRadius:6,background:s.bg,marginBottom:5}}>
                <span style={{fontSize:11,fontWeight:600,color:s.c}}>{s.l}</span>
                <span style={{fontSize:12.5,fontWeight:700,color:s.c}}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right detail panel */}
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {/* Panel header */}
          <div style={{padding:"11px 16px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:13.5,fontWeight:700,color:T.t1}}>Estimate & BOQ</div>
            <div style={{display:"flex",gap:10}}>
              {[{l:"BOQ Total",v:`₹${fmt(grandTotal)}`,c:T.slt},{l:`Done ${donePct}%`,v:`₹${fmt(Math.round(grandTotal*donePct/100))}`,c:T.blu},{l:"Collected",v:`₹${fmt(collected)}`,c:T.grn},{l:"Balance",v:`₹${fmt(balance)}`,c:T.red}].map(({l,v,c})=>(
                <div key={l} style={{textAlign:"right"}}>
                  <div style={{fontSize:9,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",marginBottom:1}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:700,color:c}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Inner tabs */}
          <div style={{display:"flex",borderBottom:`1px solid ${T.b1}`,background:T.surfaceB,flexShrink:0}}>
            {SUBTABS.map(t=>(
              <button key={t.id} onClick={()=>setSubTab(t.id)}
                style={{padding:"8px 14px",border:"none",background:"none",color:subTab===t.id?T.blu:T.t3,fontWeight:subTab===t.id?700:400,fontSize:12,cursor:"pointer",borderBottom:subTab===t.id?`2px solid ${T.blu}`:"2px solid transparent",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .15s"}}>
                {t.l}
              </button>
            ))}
            <div style={{flex:1}}/>
            <div style={{display:"flex",alignItems:"center",paddingRight:12}}>
              <AddBtn label={subTab==="boq"?"Add Item":subTab==="invoice"?"New Invoice":subTab==="milestone"?"Add Milestone":"Record Payment"}/>
            </div>
          </div>

          <div style={{flex:1,overflowY:"auto"}}>

            {/* ── BOQ TAB ── */}
            {subTab==="boq"&&(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"50px 1fr 60px 70px 90px 115px 80px",padding:"6px 16px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,position:"sticky",top:0}}>
                  {["S.No","Description","Unit","Qty","Rate","Amount","Done%"].map((h,i)=>(
                    <span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px"}}>{h}</span>
                  ))}
                </div>
                {D.boqSections.map(sec=>{
                  const secTotal=sec.items.reduce((s,i)=>s+i.amount,0);
                  const secDone=sec.items.reduce((s,i)=>s+(i.amount*(i.done/100)),0);
                  const isO=openSec[sec.id]!==false;
                  return(
                    <div key={sec.id}>
                      <div onClick={()=>setOpenSec(p=>({...p,[sec.id]:!p[sec.id]}))}
                        style={{display:"grid",gridTemplateColumns:"50px 1fr 60px 70px 90px 115px 80px",padding:"9px 16px",background:T.bluL,borderBottom:`1px solid ${T.bluM}`,cursor:"pointer",alignItems:"center",borderLeft:`3px solid ${T.blu}`}}>
                        <svg width={10} height={10} viewBox="0 0 12 12" fill="none" stroke={T.blu} strokeWidth={2} style={{transform:isO?"none":"rotate(-90deg)",transition:"transform .2s"}}><path d="M2 4l4 4 4-4"/></svg>
                        <span style={{fontSize:13,fontWeight:700,color:T.blu}}>{sec.name}</span>
                        <span/><span/><span/>
                        <span style={{fontSize:13,fontWeight:700,color:T.blu}}>₹{fmtN(secTotal)}</span>
                        <div>
                          <span style={{fontSize:10,fontWeight:600,color:T.blu}}>{Math.round(secDone/secTotal*100)||0}%</span>
                          <div style={{height:3,background:T.bluM,borderRadius:2,overflow:"hidden",marginTop:2}}>
                            <div style={{height:"100%",width:`${Math.round(secDone/secTotal*100)||0}%`,background:T.blu,borderRadius:2}}/>
                          </div>
                        </div>
                      </div>
                      {isO&&sec.items.map(item=>(
                        <div key={item.no} style={{display:"grid",gridTemplateColumns:"50px 1fr 60px 70px 90px 115px 80px",padding:"8px 16px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",transition:"background .1s"}}
                          onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <span style={{fontSize:11,color:T.t4,fontFamily:"monospace"}}>{item.no}</span>
                          <span style={{fontSize:12.5,color:T.t1}}>{item.desc}</span>
                          <span style={{fontSize:11.5,color:T.t3}}>{item.unit}</span>
                          <span style={{fontSize:12,color:T.t2,textAlign:"right",paddingRight:8,fontVariantNumeric:"tabular-nums"}}>{item.qty}</span>
                          <span style={{fontSize:12,color:T.t2,textAlign:"right",paddingRight:8,fontVariantNumeric:"tabular-nums"}}>₹{item.rate.toLocaleString("en-IN")}</span>
                          <span style={{fontSize:12.5,fontWeight:600,color:T.t1,fontVariantNumeric:"tabular-nums"}}>₹{item.amount.toLocaleString("en-IN")}</span>
                          <div>
                            <div style={{fontSize:10.5,color:item.done===100?T.grn:T.t3,fontWeight:600,marginBottom:2}}>{item.done}%</div>
                            <PBar pct={item.done} color={item.done===100?T.grn:item.done>60?T.blu:T.amb} h={4}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {/* Grand total */}
                <div style={{display:"grid",gridTemplateColumns:"50px 1fr 60px 70px 90px 115px 80px",padding:"10px 16px",background:T.surfaceB,borderTop:`2px solid ${T.b2}`,position:"sticky",bottom:0}}>
                  <span/><span style={{fontSize:13,fontWeight:700,color:T.t1}}>Grand Total</span><span/><span/><span/>
                  <span style={{fontSize:15,fontWeight:700,color:T.blu,fontVariantNumeric:"tabular-nums"}}>₹{fmtN(grandTotal)}</span>
                  <span style={{fontSize:11.5,fontWeight:600,color:T.grn}}>{donePct}% done</span>
                </div>
              </div>
            )}

            {/* ── PAYMENTS TAB ── */}
            {subTab==="payment"&&(
              <div style={{padding:"14px 16px"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
                  {[{l:"Contract Value",v:`₹${fmt(grandTotal)}`,c:T.slt},{l:"Collected",v:`₹${fmt(collected)}`,c:T.grn},{l:"Balance Due",v:`₹${fmt(balance)}`,c:T.red}].map((s,i)=>(
                    <div key={i} style={{padding:"10px 13px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,borderTop:`3px solid ${s.c}`}}>
                      <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{s.l}</div>
                      <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginBottom:14,padding:"11px 14px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:12,fontWeight:600,color:T.t2}}>Collection Progress</span>
                    <span style={{fontSize:12,fontWeight:700,color:T.grn}}>{Math.round(collected/grandTotal*100)}%</span>
                  </div>
                  <div style={{height:8,background:T.b1,borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.round(collected/grandTotal*100)}%`,background:`linear-gradient(90deg,${T.grn},#34d399)`,borderRadius:4}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                    <span style={{fontSize:10.5,color:T.grn}}>Collected ₹{fmt(collected)}</span>
                    <span style={{fontSize:10.5,color:T.red}}>Remaining ₹{fmt(balance)}</span>
                  </div>
                </div>
                <Panel>
                  <THead cols="80px 1fr 130px 80px" headers={["Date","Invoice","Amount","Status"]}/>
                  {D.invoices.filter(i=>i.status==="Paid").map((inv,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"80px 1fr 130px 80px",padding:"9px 15px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",transition:"background .1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span style={{fontSize:11.5,color:T.t4}}>{inv.date}</span>
                      <span style={{fontSize:12.5,color:T.t1}}>{inv.desc}</span>
                      <span style={{fontSize:13,fontWeight:700,color:T.grn,fontVariantNumeric:"tabular-nums"}}>₹{fmtN(inv.amount)}</span>
                      <Pill label="Paid" c={T.grn} bg={T.grnL}/>
                    </div>
                  ))}
                </Panel>
              </div>
            )}

            {/* ── MILESTONES TAB ── */}
            {subTab==="milestone"&&(
              <div style={{padding:"14px 16px"}}>
                {D.invoices.map((inv,i)=>{
                  const ms=invS[inv.status]||invS["Upcoming"];
                  return(
                    <div key={i} style={{background:T.surface,borderRadius:8,border:`1px solid ${ms.brd}`,marginBottom:8,padding:"11px 14px",display:"flex",alignItems:"center",gap:12,boxShadow:inv.status==="Pending"?`0 2px 8px ${T.amb}18`:"0 1px 3px rgba(0,0,0,0.04)"}}>
                      <div style={{width:36,height:36,borderRadius:8,background:ms.bg,border:`1px solid ${ms.brd}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontSize:13,fontWeight:700,color:ms.c}}>{i+1}</span>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                          <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{inv.desc}</span>
                          <Pill label={inv.status} c={ms.c} bg={ms.bg} brd={ms.brd}/>
                          <span style={{fontSize:10.5,color:T.t4}}>{inv.pct}% of contract</span>
                        </div>
                        <div style={{fontSize:10.5,color:T.t4}}>Target: {inv.date}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:15,fontWeight:700,color:inv.status==="Paid"?T.grn:T.t1,fontVariantNumeric:"tabular-nums"}}>₹{fmtN(inv.amount)}</div>
                        {inv.status==="Pending"&&(
                          <button style={{marginTop:6,padding:"4px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}>Collect</button>
                        )}
                        {inv.status==="Upcoming"&&(
                          <div style={{marginTop:4,fontSize:10,color:T.t4}}>Not yet due</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── INVOICES TAB ── */}
            {subTab==="invoice"&&(
              <div style={{padding:"14px 16px"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
                  {[
                    {l:"Total Contract",v:`₹${fmt(grandTotal)}`,c:T.slt},
                    {l:"Invoiced",      v:`₹${fmt(D.invoices.reduce((s,i)=>s+i.amount,0))}`,c:T.blu},
                    {l:"Collected",     v:`₹${fmt(paidTotal)}`,  c:T.grn},
                    {l:"Pending",       v:`₹${fmt(pendingAmt)}`, c:T.amb},
                  ].map((s,i)=>(
                    <div key={i} style={{padding:"10px 13px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,borderTop:`3px solid ${s.c}`}}>
                      <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{s.l}</div>
                      <div style={{fontSize:16,fontWeight:700,color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <Panel>
                  <THead cols="95px 1fr 50px 130px 95px 90px" headers={["Invoice#","Description","PCT","Amount","Date","Status"]}/>
                  {D.invoices.map((inv,i)=>{
                    const ss=invS[inv.status]||invS["Upcoming"];
                    return(
                      <div key={i} style={{display:"grid",gridTemplateColumns:"95px 1fr 50px 130px 95px 90px",padding:"10px 15px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",borderLeft:inv.status==="Pending"?`3px solid ${T.amb}`:inv.status==="Paid"?`3px solid ${T.grn}`:"3px solid transparent",transition:"background .1s"}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <span style={{fontSize:12,fontFamily:"monospace",color:T.blu,fontWeight:600}}>{inv.no}</span>
                        <span style={{fontSize:12.5,color:T.t1}}>{inv.desc}</span>
                        <span style={{fontSize:12,color:T.t3}}>{inv.pct}%</span>
                        <span style={{fontSize:13,fontWeight:700,color:T.t1,fontVariantNumeric:"tabular-nums"}}>₹{fmtN(inv.amount)}</span>
                        <span style={{fontSize:11.5,color:T.t3}}>{inv.date}</span>
                        <Pill label={inv.status} c={ss.c} bg={ss.bg} brd={ss.brd}/>
                      </div>
                    );
                  })}
                </Panel>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// TAB 4 — PARTY
// ═══════════════════════════════════════════════════════════════════
function TabParty() {
  const [selP, setSelP] = useState(null);
  const typeS = {"Client":{c:T.grn,bg:T.grnL},"Material Supplier":{c:T.blu,bg:T.bluL},"Sub-Contractor":{c:T.slt,bg:T.sltL}};

  return (
    <div style={{padding:"16px 18px", display:"flex", gap:14, height:"100%"}}>
      <div style={{width:290, flexShrink:0}}>
        <Panel style={{overflow:"hidden"}}>
          <PHead title="Parties" action={<AddBtn label="Add Party"/>}/>
          {D.parties.map(p=>{
            const ts = typeS[p.type]||{c:T.slt,bg:T.sltL};
            const isS = selP?.id===p.id;
            return (
              <div key={p.id} onClick={()=>setSelP(p)}
                style={{padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${T.b1}`, background:isS?T.bluL:"transparent", borderLeft:isS?`3px solid ${T.blu}`:"3px solid transparent", transition:"all .12s"}}
                onMouseEnter={e=>{if(!isS)e.currentTarget.style.background=T.surfaceB;}} onMouseLeave={e=>{if(!isS)e.currentTarget.style.background="transparent";}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5}}>
                  <span style={{fontSize:12.5, fontWeight:isS?700:500, color:isS?T.blu:T.t1, flex:1, paddingRight:6, lineHeight:1.3}}>{p.name}</span>
                  <span style={{fontSize:13, fontWeight:700, color:p.balPositive?T.grn:T.red, flexShrink:0, fontVariantNumeric:"tabular-nums"}}>₹{fmt(p.balance)}</span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <Pill label={p.type} c={ts.c} bg={ts.bg}/>
                  <span style={{fontSize:10.5, color:T.t4}}>{p.balLabel}</span>
                </div>
              </div>
            );
          })}
        </Panel>
      </div>

      <div style={{flex:1}}>
        <Panel style={{height:"100%", overflow:"hidden", display:"flex", flexDirection:"column"}}>
          {selP?(
            <>
              <PHead title={selP.name} action={<SecBtn label="Export PDF"/>}/>
              <div style={{padding:"8px 15px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, display:"flex", gap:20}}>
                {[["Type",selP.type],["Balance",`₹${fmtN(selP.balance)}`],["Status",selP.balLabel]].map(([l,v])=>(
                  <div key={l} style={{display:"flex", gap:6, alignItems:"center"}}>
                    <span style={{fontSize:11, color:T.t4}}>{l}:</span>
                    <span style={{fontSize:12.5, fontWeight:600, color:T.t1}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{flex:1, overflowY:"auto"}}>
                <THead cols="70px 1fr 130px 110px" headers={["Date","Description","Type","Amount"]}/>
                {(D.partyTxns[selP.id]||[]).map((txn,i)=>(
                  <div key={i} style={{display:"grid", gridTemplateColumns:"70px 1fr 130px 110px", padding:"9px 15px", borderBottom:`1px solid ${T.b1}`, alignItems:"center", borderLeft:`3px solid ${txn.cr?T.grn:T.red}33`, transition:"background .1s"}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <span style={{fontSize:11.5, color:T.t4}}>{txn.date}</span>
                    <span style={{fontSize:12.5, color:T.t1, fontWeight:500}}>{txn.note}</span>
                    <Pill label={txn.type} c={T.slt} bg={T.sltL}/>
                    <span style={{fontSize:13, fontWeight:700, color:txn.cr?T.grn:T.red, fontVariantNumeric:"tabular-nums"}}>{txn.cr?"+":"−"} ₹{fmtN(txn.amount)}</span>
                  </div>
                ))}
                {!(D.partyTxns[selP.id]||[]).length&&<div style={{padding:"40px 20px", textAlign:"center", color:T.t4, fontSize:13}}>No transactions yet</div>}
              </div>
              <div style={{padding:"9px 15px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:8}}>
                <button style={{flex:1, padding:"7px", border:`1px solid ${T.grnM}`, borderRadius:6, background:T.grnL, color:T.grn, fontSize:12, fontWeight:600, cursor:"pointer"}}>+ Receipt</button>
                <button style={{flex:1, padding:"7px", border:`1px solid ${T.redM}`, borderRadius:6, background:T.redL, color:T.red, fontSize:12, fontWeight:600, cursor:"pointer"}}>+ Payment</button>
                <button style={{flex:1, padding:"7px", border:`1px solid ${T.b2}`, borderRadius:6, background:T.surface, color:T.t2, fontSize:12, fontWeight:600, cursor:"pointer"}}>+ Bill</button>
              </div>
            </>
          ):(
            <div style={{display:"flex", alignItems:"center", justifyContent:"center", flex:1, color:T.t4, fontSize:13}}>Select a party to view ledger</div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 5 — TRANSACTION
// ═══════════════════════════════════════════════════════════════════
function TabTransaction() {
  const [fType,  setFType]  = useState("All");
  const [fParty, setFParty] = useState("All");
  const [fAcct,  setFAcct]  = useState("All");
  const [fStatus,setFStatus]= useState("All");
  const [fPayout,setFPayout]= useState("All"); // All / inflow / outflow
  const [amtMin, setAmtMin] = useState("");
  const [amtMax, setAmtMax] = useState("");
  const [fInvoice,setFInvoice]=useState("All");
  const [showFilters,setShowFilters]=useState(false);
  const [search, setSearch] = useState("");
  const [selParty,setSelParty]=useState("All"); // dropdown search

  const TYPES   = ["All","Payment In","Payment Out","Material Purchase","Site Expense","Sub-Con","Sales Invoice","Advance"];
  const PARTIES = ["All",...[...new Set(D.transactions.map(t=>t.party))]];
  const ACCOUNTS= ["All","HDFC","SBI","Petty Cash","ICICI OD"];
  const STATUSES= ["All","paid","unpaid","unbilled"];
  const INVOICES= ["All",...D.invoices.map(i=>i.no)];
  const PAYOUTS  = ["All","Inflow (Money In)","Outflow (Money Out)"];

  const typeS={"Payment In":{c:T.grn,bg:T.grnL},"Payment Out":{c:T.red,bg:T.redL},"Material Purchase":{c:T.blu,bg:T.bluL},"Site Expense":{c:T.amb,bg:T.ambL},"Sub-Con":{c:T.pur,bg:T.purL},"Sales Invoice":{c:T.grn,bg:T.grnL},"Advance":{c:"#0891B2",bg:"#E0F2FE"}};
  const acctColor={"HDFC":T.blu,"SBI":T.grn,"Petty Cash":T.amb,"ICICI OD":T.red};

  // account balances
  const ACCT_BAL={"HDFC":1823540,"SBI":945200,"Petty Cash":18500,"ICICI OD":-230000};
  const activeFilters=[fType,fParty,fAcct,fStatus,fInvoice,fPayout,selParty].filter(v=>v!=="All").length+(amtMin||amtMax||search?1:0);

  const filtered=D.transactions.filter(t=>{
    if(fType!=="All"&&t.type!==fType) return false;
    if(fParty!=="All"&&t.party!==fParty) return false;
    if(selParty!=="All"&&t.party!==selParty) return false;
    if(fAcct!=="All"&&(t.account||"—")!==fAcct) return false;
    if(fStatus!=="All"&&(t.status||"paid")!==fStatus) return false;
    if(fPayout==="Inflow (Money In)"&&t.dr) return false;
    if(fPayout==="Outflow (Money Out)"&&!t.dr) return false;
    if(search&&!t.party.toLowerCase().includes(search.toLowerCase())&&!t.note.toLowerCase().includes(search.toLowerCase())) return false;
    if(amtMin&&t.amount<Number(amtMin)) return false;
    if(amtMax&&t.amount>Number(amtMax)) return false;
    return true;
  });

  const tIn    = filtered.filter(t=>!t.dr).reduce((s,t)=>s+t.amount,0);
  const tOut   = filtered.filter(t=>t.dr).reduce((s,t)=>s+t.amount,0);
  const tUnpaid= filtered.filter(t=>(t.status||"paid")==="unpaid").reduce((s,t)=>s+t.amount,0);
  const tNet   = tIn - tOut;

  const clearAll=()=>{setFType("All");setFParty("All");setSelParty("All");setFAcct("All");setFStatus("All");setFPayout("All");setFInvoice("All");setAmtMin("");setAmtMax("");setSearch("");};

  // Sel helper
  const Sel=({val,set,opts,def,minW=100})=>(
    <div style={{position:"relative"}}>
      <select value={val} onChange={e=>set(e.target.value)}
        style={{height:29,padding:"0 20px 0 9px",borderRadius:6,border:`1.5px solid ${val!=="All"?T.blu:T.b1}`,background:val!=="All"?T.bluL:T.surface,fontSize:11.5,color:val!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:val!=="All"?600:400,minWidth:minW,appearance:"none",WebkitAppearance:"none"}}>
        {opts.map(o=><option key={o} value={o}>{o==="All"?def:o}</option>)}
      </select>
      <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={2} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><path d="M6 9l6 6 6-6"/></svg>
    </div>
  );

  return(
    <div style={{padding:"14px 18px"}}>

      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
        {[
          {l:"Total Inflow",  v:`₹${fmtN(tIn)}`,   c:T.grn},
          {l:"Total Outflow", v:`₹${fmtN(tOut)}`,   c:T.red},
          {l:"Net",           v:`₹${fmtN(tNet)}`,   c:tNet>=0?T.grn:T.red},
          {l:"Unpaid Bills",  v:`₹${fmtN(tUnpaid)}`,c:T.amb},
        ].map((s,i)=>(
          <div key={i} style={{padding:"10px 13px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:4}}>{s.l}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filter toolbar */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,padding:"8px 12px",marginBottom:8}}>
        {/* Row 1 */}
        <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
          {/* Text search */}
          <div style={{position:"relative",minWidth:160,flex:1}}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} strokeLinecap="round" style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search party or note..."
              style={{width:"100%",height:30,padding:"0 8px 0 27px",borderRadius:6,border:`1.5px solid ${search?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:search?T.bluL:T.surface}}/>
          </div>
          {/* Party dropdown */}
          <Sel val={selParty} set={setSelParty} opts={PARTIES} def="All Parties" minW={130}/>
          {/* Account dropdown */}
          <Sel val={fAcct} set={setFAcct} opts={ACCOUNTS} def="All Accounts" minW={120}/>
          {/* Payout direction */}
          <Sel val={fPayout} set={setFPayout} opts={PAYOUTS} def="IN / OUT" minW={120}/>
          {/* Type quick pills */}
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {["All","Payment In","Material Purchase","Site Expense"].map(tp=>(
              <button key={tp} onClick={()=>setFType(tp===fType?"All":tp)}
                style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${fType===tp?T.blu:T.b1}`,background:fType===tp?T.bluL:T.surface,color:fType===tp?T.blu:T.t3,fontSize:11,fontWeight:fType===tp?700:400,cursor:"pointer",whiteSpace:"nowrap"}}>
                {tp==="All"?"All Types":tp}
              </button>
            ))}
          </div>
          <button onClick={()=>setShowFilters(!showFilters)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:6,border:`1.5px solid ${(showFilters||activeFilters>0)?T.blu:T.b1}`,background:(showFilters||activeFilters>0)?T.bluL:T.surface,color:(showFilters||activeFilters>0)?T.blu:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer",flexShrink:0}}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3"/></svg>
            More{activeFilters>0&&<span style={{background:T.blu,color:"white",fontSize:9,fontWeight:800,padding:"0 5px",borderRadius:10}}>{activeFilters}</span>}
          </button>
          <AddBtn label="Add Transaction"/>
          {activeFilters>0&&<button onClick={clearAll} style={{fontSize:11,color:T.red,background:T.redL,border:`1px solid ${T.redM}`,borderRadius:5,padding:"3px 9px",cursor:"pointer"}}>Clear ×</button>}
        </div>

        {/* Expanded filters */}
        {showFilters&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr) 1.4fr",gap:8,marginTop:10,paddingTop:10,borderTop:`1px solid ${T.b1}`}}>
            {[
              {label:"Account",val:fAcct,set:setFAcct,opts:ACCOUNTS,def:"All Accounts"},
              {label:"Status", val:fStatus,set:setFStatus,opts:STATUSES,def:"All Status"},
              {label:"Invoice",val:fInvoice,set:setFInvoice,opts:INVOICES,def:"All Invoices"},
              {label:"Type",   val:fType,set:setFType,opts:TYPES,def:"All Types"},
            ].map(({label,val,set,opts,def},i)=>(
              <div key={i}>
                <div style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:4}}>{label}</div>
                <select value={val} onChange={e=>set(e.target.value)}
                  style={{width:"100%",height:29,padding:"0 8px",borderRadius:6,border:`1.5px solid ${val!=="All"?T.blu:T.b1}`,background:val!=="All"?T.bluL:T.surface,fontSize:11.5,color:val!=="All"?T.blu:T.t2,outline:"none",fontFamily:"inherit",fontWeight:val!=="All"?600:400}}>
                  {opts.map(o=><option key={o} value={o}>{o==="All"?def:o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <div style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:4}}>Amount Range (₹)</div>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                <input type="number" value={amtMin} onChange={e=>setAmtMin(e.target.value)} placeholder="Min"
                  style={{flex:1,height:29,padding:"0 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",background:T.surface}}/>
                <span style={{fontSize:11,color:T.t4}}>—</span>
                <input type="number" value={amtMax} onChange={e=>setAmtMax(e.target.value)} placeholder="Max"
                  style={{flex:1,height:29,padding:"0 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",background:T.surface}}/>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{fontSize:11,color:T.t4,marginBottom:6}}>{filtered.length} transaction{filtered.length!==1?"s":""}</div>

      <Panel>
        <THead cols="70px 1fr 1.2fr 160px 100px 120px 90px" headers={["Date","Party","Note","Type","Account","Amount","Status"]}/>
        {filtered.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4,fontSize:13}}>No transactions match filters</div>}
        {filtered.map(txn=>{
          const ts=typeS[txn.type]||{c:T.slt,bg:T.sltL};
          const st=txn.status||"paid";
          const ac=acctColor[txn.account||""]||T.slt;
          return(
            <div key={txn.id} style={{display:"grid",gridTemplateColumns:"70px 1fr 1.2fr 160px 100px 120px 90px",padding:"9px 15px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",borderLeft:`3px solid ${txn.dr?T.red:T.grn}44`,transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:11.5,color:T.t4}}>{txn.date}</span>
              <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{txn.party}</span>
              <span style={{fontSize:12,color:T.t2}}>{txn.note}</span>
              <Pill label={txn.type} c={ts.c} bg={ts.bg}/>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:ac,flexShrink:0}}/>
                <span style={{fontSize:11.5,color:T.t2}}>{txn.account||"—"}</span>
              </div>
              <span style={{fontSize:13,fontWeight:700,color:txn.dr?T.red:T.grn,fontVariantNumeric:"tabular-nums"}}>{txn.dr?"−":"+"} ₹{fmtN(txn.amount)}</span>
              <span style={{background:st==="paid"?T.grnL:st==="unbilled"?T.purL:T.redL,color:st==="paid"?T.grn:st==="unbilled"?T.pur:T.red,fontSize:9.5,fontWeight:700,padding:"2px 7px",borderRadius:20,border:`1px solid ${st==="paid"?T.grnM:T.redM}`}}>{st}</span>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

// TAB 6 — TO-DO
// ═══════════════════════════════════════════════════════════════════
function TabTodo() {
  const TEAM=["Vijay Sahu","Niranjan","Harsh Sahu","Priyanka","Sunny"];
  const CATS=["Civil","Electrical","Plumbing","Finishing","Documentation","Admin","Other"];
  const PRIS=["High","Medium","Low"];
  const priS={"High":{c:T.red,bg:T.redL,brd:T.redM},"Medium":{c:T.amb,bg:T.ambL,brd:T.ambM},"Low":{c:T.slt,bg:T.sltL,brd:T.b2}};
  const catC={"Civil":T.blu,"Electrical":T.amb,"Plumbing":"#0891B2","Finishing":T.pur,"Documentation":T.slt,"Admin":T.grn,"Other":T.slt};

  const [todos,setTodos]=useState([
    {id:1,text:"Order TMT Steel for 2F columns",priority:"High",assignee:"Vijay Sahu",due:"12 Mar",cat:"Civil",done:false,attachments:[],checklist:[{t:"Check current stock",done:true},{t:"Get 3 vendor quotes",done:false},{t:"Place order",done:false}]},
    {id:2,text:"Get electrical wiring drawings approved",priority:"High",assignee:"Harsh Sahu",due:"14 Mar",cat:"Electrical",done:false,attachments:[],checklist:[]},
    {id:3,text:"Arrange water tanker for curing",priority:"Medium",assignee:"Niranjan",due:"10 Mar",cat:"Civil",done:false,attachments:[],checklist:[]},
    {id:4,text:"Client meeting for tile selection",priority:"Medium",assignee:"Vijay Sahu",due:"15 Mar",cat:"Admin",done:false,attachments:[],checklist:[]},
    {id:5,text:"Submit INV-005 to client",priority:"High",assignee:"Vijay Sahu",due:"11 Mar",cat:"Documentation",done:true,attachments:[],checklist:[]},
    {id:6,text:"Fix water pipe crack — GF bathroom",priority:"Low",assignee:"Niranjan",due:"",cat:"Plumbing",done:true,attachments:[],checklist:[{t:"Identify crack location",done:true},{t:"Buy repair material",done:true},{t:"Fix & test",done:true}]},
  ]);

  const [showAdd,setShowAdd]=useState(false);
  const [expandId,setExpandId]=useState(null);
  const [fCat,setFCat]=useState("All");
  const [fPri,setFPri]=useState("All");
  const [newForm,setNewForm]=useState({text:"",priority:"Medium",assignee:TEAM[0],due:"",cat:"Civil",checklist:[]});
  const [newCheckText,setNewCheckText]=useState("");

  const toggle=(id)=>setTodos(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t));
  const toggleCheck=(todoId,ci)=>setTodos(p=>p.map(t=>t.id===todoId?{...t,checklist:t.checklist.map((c,i)=>i===ci?{...c,done:!c.done}:c)}:t));
  const addTodo=()=>{
    if(!newForm.text.trim()) return;
    setTodos(p=>[{id:Date.now(),...newForm,done:false,attachments:[]},  ...p]);
    setNewForm({text:"",priority:"Medium",assignee:TEAM[0],due:"",cat:"Civil",checklist:[]});
    setShowAdd(false);
  };
  const addCheck=()=>{
    if(!newCheckText.trim()) return;
    setNewForm(p=>({...p,checklist:[...p.checklist,{t:newCheckText,done:false}]}));
    setNewCheckText("");
  };

  const display=todos.filter(t=>(fCat==="All"||t.cat===fCat)&&(fPri==="All"||t.priority===fPri));
  const pending=display.filter(t=>!t.done), done=display.filter(t=>t.done);

  return(
    <div style={{padding:"14px 18px",maxWidth:720}}>
      {/* Header row */}
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flex:1}}>
          {/* Summary pills */}
          {[{l:"Pending",v:todos.filter(t=>!t.done).length,c:T.amb},{l:"Done",v:todos.filter(t=>t.done).length,c:T.grn},{l:"Total",v:todos.length,c:T.slt}].map(x=>(
            <div key={x.l} style={{display:"flex",alignItems:"center",gap:5,background:T.surface,border:`1px solid ${T.b1}`,borderRadius:20,padding:"4px 11px"}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:x.c}}/>
              <span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{x.v}</span>
              <span style={{fontSize:11,color:T.t4}}>{x.l}</span>
            </div>
          ))}
        </div>
        {/* Category filter */}
        <select value={fCat} onChange={e=>setFCat(e.target.value)}
          style={{height:30,padding:"0 10px",borderRadius:6,border:`1.5px solid ${fCat!=="All"?T.blu:T.b1}`,background:fCat!=="All"?T.bluL:T.surface,fontSize:11.5,color:fCat!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
          <option value="All">All Categories</option>
          {CATS.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={fPri} onChange={e=>setFPri(e.target.value)}
          style={{height:30,padding:"0 10px",borderRadius:6,border:`1.5px solid ${fPri!=="All"?T.blu:T.b1}`,background:fPri!=="All"?T.bluL:T.surface,fontSize:11.5,color:fPri!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
          <option value="All">All Priority</option>
          {PRIS.map(p=><option key={p}>{p}</option>)}
        </select>
        <AddBtn label="Add Todo" onClick={()=>setShowAdd(!showAdd)}/>
      </div>

      {/* Add form */}
      {showAdd&&(
        <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:9,padding:"13px 15px",marginBottom:12}}>
          <div style={{fontSize:11.5,fontWeight:700,color:T.blu,marginBottom:10}}>New Todo Item</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div style={{gridColumn:"1/-1"}}>
              <textarea value={newForm.text} onChange={e=>setNewForm(p=>({...p,text:e.target.value}))} placeholder="What needs to be done?" rows={2}
                style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.blu}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none"}}/>
            </div>
            {[
              {l:"Category",key:"cat",opts:CATS,type:"select"},
              {l:"Priority",key:"priority",opts:PRIS,type:"select"},
              {l:"Assigned To",key:"assignee",opts:TEAM,type:"select"},
              {l:"Due Date",key:"due",type:"date"},
            ].map(f=>(
              <div key={f.key}>
                <div style={{fontSize:9.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:4}}>{f.l}</div>
                {f.type==="date"
                  ?<input type="date" value={newForm[f.key]} onChange={e=>setNewForm(p=>({...p,[f.key]:e.target.value}))}
                      style={{width:"100%",height:30,padding:"0 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface}}/>
                  :<select value={newForm[f.key]} onChange={e=>setNewForm(p=>({...p,[f.key]:e.target.value}))}
                      style={{width:"100%",height:30,padding:"0 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface}}>
                      {f.opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                }
              </div>
            ))}
          </div>
          {/* Checklist builder */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Checklist (optional)</div>
            {newForm.checklist.map((c,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <div style={{width:14,height:14,borderRadius:3,background:T.grnL,border:`1px solid ${T.grnM}`,flexShrink:0}}/>
                <span style={{fontSize:12,color:T.t1,flex:1}}>{c.t}</span>
                <button onClick={()=>setNewForm(p=>({...p,checklist:p.checklist.filter((_,j)=>j!==i)}))} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,fontSize:12}}>×</button>
              </div>
            ))}
            <div style={{display:"flex",gap:6}}>
              <input value={newCheckText} onChange={e=>setNewCheckText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCheck()} placeholder="Add checklist item..."
                style={{flex:1,height:28,padding:"0 8px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:12,outline:"none",fontFamily:"inherit",background:T.surface}}/>
              <button onClick={addCheck} style={{padding:"0 10px",borderRadius:5,background:T.blu,color:"white",border:"none",cursor:"pointer",fontSize:11,fontWeight:600}}>Add</button>
            </div>
          </div>
          {/* Upload note */}
          <div style={{display:"flex",gap:7,marginBottom:10}}>
            {[{l:"Photo",icon:"📷"},{l:"Camera",icon:"📸"},{l:"Document",icon:"📎"}].map(btn=>(
              <button key={btn.l} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,color:T.t3,fontSize:11.5,fontWeight:500,cursor:"pointer"}}>
                <span>{btn.icon}</span>{btn.l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"7px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
            <button onClick={addTodo} style={{flex:2,padding:"7px",borderRadius:6,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>Add Todo</button>
          </div>
        </div>
      )}

      {/* Pending todos */}
      <Panel style={{marginBottom:8}}>
        {pending.length===0&&<div style={{padding:"24px",textAlign:"center",color:T.t4,fontSize:13}}>No pending items{fCat!=="All"||fPri!=="All"?" matching filters":""}</div>}
        {pending.map(todo=>{
          const ps=priS[todo.priority]||priS["Medium"];
          const cc=catC[todo.cat]||T.slt;
          const isExp=expandId===todo.id;
          const checkDone=todo.checklist.filter(c=>c.done).length;
          return(
            <div key={todo.id} style={{borderBottom:`1px solid ${T.b1}`,borderLeft:`3px solid ${ps.c}44`}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                {/* Checkbox */}
                <div onClick={()=>toggle(todo.id)} style={{width:17,height:17,borderRadius:5,border:`1.5px solid ${T.b2}`,cursor:"pointer",flexShrink:0,marginTop:2,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=T.grn}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=T.b2}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:T.t1,fontWeight:500,marginBottom:4,lineHeight:1.4}}>{todo.text}</div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
                    <Pill label={todo.cat} c={cc} bg={cc+"18"}/>
                    <Pill label={todo.priority} c={ps.c} bg={ps.bg}/>
                    <span style={{fontSize:11,color:T.t4}}>@{todo.assignee.split(" ")[0]}</span>
                    {todo.due&&<span style={{fontSize:11,color:T.t4}}>Due {todo.due}</span>}
                    {todo.checklist.length>0&&(
                      <span style={{fontSize:10.5,color:checkDone===todo.checklist.length?T.grn:T.t4,fontWeight:600}}>
                        ☑ {checkDone}/{todo.checklist.length}
                      </span>
                    )}
                  </div>
                  {/* Checklist preview */}
                  {isExp&&todo.checklist.length>0&&(
                    <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.b1}`}}>
                      {todo.checklist.map((c,ci)=>(
                        <div key={ci} onClick={()=>toggleCheck(todo.id,ci)} style={{display:"flex",alignItems:"center",gap:7,padding:"3px 0",cursor:"pointer"}}>
                          <div style={{width:14,height:14,borderRadius:3,background:c.done?T.grn:T.surface,border:`1.5px solid ${c.done?T.grn:T.b2}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {c.done&&<svg width={8} height={8} viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth={2.5}><path d="M2 5l2.5 2.5L8 3"/></svg>}
                          </div>
                          <span style={{fontSize:12,color:c.done?T.t4:T.t1,textDecoration:c.done?"line-through":"none"}}>{c.t}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={()=>setExpandId(isExp?null:todo.id)}
                  style={{background:"none",border:"none",cursor:"pointer",color:T.t4,padding:3,marginTop:1,flexShrink:0}}>
                  <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d={isExp?"M2 5l5 5 5-5":"M2 9l5-5 5 5"}/>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </Panel>

      {/* Completed */}
      {done.length>0&&(
        <>
          <div style={{fontSize:10.5,fontWeight:600,color:T.t4,letterSpacing:".5px",textTransform:"uppercase",margin:"12px 0 7px"}}>Completed ({done.length})</div>
          <Panel>
            {done.map(todo=>(
              <div key={todo.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,opacity:.6,transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div onClick={()=>toggle(todo.id)} style={{width:17,height:17,borderRadius:5,background:T.grn,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width={9} height={9} viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth={2.2}><path d="M2 5l2.5 2.5L8 3"/></svg>
                </div>
                <span style={{flex:1,fontSize:12.5,color:T.t3,textDecoration:"line-through"}}>{todo.text}</span>
                <span style={{fontSize:10.5,color:T.t4}}>@{todo.assignee.split(" ")[0]}</span>
                {todo.checklist.length>0&&<span style={{fontSize:10,color:T.grn}}>✓ {todo.checklist.length}/{todo.checklist.length}</span>}
              </div>
            ))}
          </Panel>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 7 — TASKS  (3-level hierarchy, dependencies, DHYAN RAKHEN, filters)
// ═══════════════════════════════════════════════════════════════════
const PROJECT_TASKS=[
  {id:"1",no:"1",level:1,name:"Civil Structure",category:"Civil",tag:"critical",
   status:"Ongoing",progress:72,assignee:"Vijay Sahu",
   baseStart:"2025-01-15",baseEnd:"2025-06-30",actualStart:"2025-01-15",actualEnd:null,
   duration:165,dependencies:[],dhyanRakhen:"Foundation mein M20 grade concrete mandatory hai. Client ne site engineer approval required hai har pour ke pehle.",lastUpdate:"2026-03-10",
   children:[
    {id:"1.1",no:"1.1",level:2,name:"Foundation & PCC",category:"Civil",tag:"critical",
     status:"Completed",progress:100,assignee:"Niranjan",
     baseStart:"2025-01-15",baseEnd:"2025-03-05",actualStart:"2025-01-15",actualEnd:"2025-03-05",
     duration:49,dependencies:[],dhyanRakhen:null,lastUpdate:"2025-03-05",
     children:[
      {id:"1.1.1",no:"1.1.1",level:3,name:"Excavation & Earth Work",category:"Civil",tag:"",status:"Completed",progress:100,assignee:"Niranjan",baseStart:"2025-01-15",baseEnd:"2025-01-28",actualStart:"2025-01-15",actualEnd:"2025-01-28",duration:13,dependencies:[],dhyanRakhen:null,lastUpdate:"2025-01-28",children:[]},
      {id:"1.1.2",no:"1.1.2",level:3,name:"PCC M10 Lean Concrete",category:"Civil",tag:"critical",status:"Completed",progress:100,assignee:"Niranjan",baseStart:"2025-01-29",baseEnd:"2025-02-05",actualStart:"2025-01-29",actualEnd:"2025-02-05",duration:7,dependencies:["1.1.1"],dhyanRakhen:null,lastUpdate:"2025-02-05",children:[]},
      {id:"1.1.3",no:"1.1.3",level:3,name:"RCC Foundation M20",category:"Civil",tag:"critical",status:"Completed",progress:100,assignee:"Niranjan",baseStart:"2025-02-06",baseEnd:"2025-03-05",actualStart:"2025-02-06",actualEnd:"2025-03-05",duration:27,dependencies:["1.1.2"],dhyanRakhen:"M20 grade mix design approval mandatory. Cube test report submit karo.",lastUpdate:"2025-03-05",children:[]},
     ]},
    {id:"1.2",no:"1.2",level:2,name:"RCC Columns & Beams",category:"Civil",tag:"critical",
     status:"Ongoing",progress:85,assignee:"Niranjan",
     baseStart:"2025-03-06",baseEnd:"2025-05-10",actualStart:"2025-03-08",actualEnd:null,
     duration:65,dependencies:["1.1"],dhyanRakhen:null,lastUpdate:"2026-03-10",
     children:[
      {id:"1.2.1",no:"1.2.1",level:3,name:"GF Columns Casting",category:"Civil",tag:"",status:"Completed",progress:100,assignee:"Niranjan",baseStart:"2025-03-06",baseEnd:"2025-03-25",actualStart:"2025-03-08",actualEnd:"2025-03-26",duration:19,dependencies:["1.1.3"],dhyanRakhen:null,lastUpdate:"2025-03-26",children:[]},
      {id:"1.2.2",no:"1.2.2",level:3,name:"GF Slab & Beam",category:"Civil",tag:"critical",status:"Completed",progress:100,assignee:"Niranjan",baseStart:"2025-03-26",baseEnd:"2025-04-15",actualStart:"2025-03-27",actualEnd:"2025-04-16",duration:20,dependencies:["1.2.1"],dhyanRakhen:"Slab pour ek din mein complete karna hai — interrupted pour allowed nahi.",lastUpdate:"2025-04-16",children:[]},
      {id:"1.2.3",no:"1.2.3",level:3,name:"1F & 2F Structure",category:"Civil",tag:"",status:"Ongoing",progress:65,assignee:"Vijay Sahu",baseStart:"2025-04-16",baseEnd:"2025-05-10",actualStart:"2025-04-18",actualEnd:null,duration:24,dependencies:["1.2.2"],dhyanRakhen:null,lastUpdate:"2026-03-10",children:[]},
     ]},
    {id:"1.3",no:"1.3",level:2,name:"Brick Masonry",category:"Civil",tag:"",
     status:"Ongoing",progress:55,assignee:"Vijay Sahu",
     baseStart:"2025-04-20",baseEnd:"2025-06-30",actualStart:"2025-04-22",actualEnd:null,
     duration:71,dependencies:["1.2.2"],dhyanRakhen:null,lastUpdate:"2026-03-08",
     children:[
      {id:"1.3.1",no:"1.3.1",level:3,name:"GF Brickwork",category:"Civil",tag:"",status:"Completed",progress:100,assignee:"Vijay Sahu",baseStart:"2025-04-20",baseEnd:"2025-05-10",actualStart:"2025-04-22",actualEnd:"2025-05-12",duration:20,dependencies:[],dhyanRakhen:null,lastUpdate:"2025-05-12",children:[]},
      {id:"1.3.2",no:"1.3.2",level:3,name:"1F Brickwork",category:"Civil",tag:"",status:"Ongoing",progress:75,assignee:"Vijay Sahu",baseStart:"2025-05-11",baseEnd:"2025-06-05",actualStart:"2025-05-13",actualEnd:null,duration:25,dependencies:["1.3.1"],dhyanRakhen:null,lastUpdate:"2026-03-10",children:[]},
      {id:"1.3.3",no:"1.3.3",level:3,name:"2F Brickwork",category:"Civil",tag:"",status:"Not Started",progress:0,assignee:"Vijay Sahu",baseStart:"2025-06-06",baseEnd:"2025-06-30",actualStart:null,actualEnd:null,duration:24,dependencies:["1.3.2"],dhyanRakhen:null,lastUpdate:null,children:[]},
     ]},
  ]},
  {id:"2",no:"2",level:1,name:"Electrical Work",category:"Electrical",tag:"priority",
   status:"Ongoing",progress:35,assignee:"Priyanka",
   baseStart:"2025-04-01",baseEnd:"2025-08-15",actualStart:"2025-04-05",actualEnd:null,
   duration:136,dependencies:["1.2"],dhyanRakhen:"ISI mark wire mandatory. Client ne Havells wire specifically approve kiya hai.",lastUpdate:"2026-03-08",
   children:[
    {id:"2.1",no:"2.1",level:2,name:"Conduit & Wiring",category:"Electrical",tag:"",status:"Ongoing",progress:60,assignee:"Priyanka",baseStart:"2025-04-01",baseEnd:"2025-06-30",actualStart:"2025-04-05",actualEnd:null,duration:90,dependencies:[],dhyanRakhen:null,lastUpdate:"2026-03-08",
     children:[
      {id:"2.1.1",no:"2.1.1",level:3,name:"GF Concealed Conduit",category:"Electrical",tag:"",status:"Completed",progress:100,assignee:"Priyanka",baseStart:"2025-04-01",baseEnd:"2025-04-20",actualStart:"2025-04-05",actualEnd:"2025-04-22",duration:19,dependencies:["1.2.1"],dhyanRakhen:null,lastUpdate:"2025-04-22",children:[]},
      {id:"2.1.2",no:"2.1.2",level:3,name:"1F & 2F Conduit",category:"Electrical",tag:"",status:"Ongoing",progress:40,assignee:"Priyanka",baseStart:"2025-04-21",baseEnd:"2025-05-25",actualStart:"2025-04-23",actualEnd:null,duration:34,dependencies:["2.1.1"],dhyanRakhen:null,lastUpdate:"2026-03-10",children:[]},
      {id:"2.1.3",no:"2.1.3",level:3,name:"Wire Pulling All Floors",category:"Electrical",tag:"",status:"Not Started",progress:0,assignee:"Priyanka",baseStart:"2025-05-26",baseEnd:"2025-06-30",actualStart:null,actualEnd:null,duration:35,dependencies:["2.1.2"],dhyanRakhen:"ISI mark wire mandatory. DO NOT substitute.",lastUpdate:null,children:[]},
     ]},
   ]},
  {id:"3",no:"3",level:1,name:"Plaster & Finishing",category:"Finishing",tag:"",
   status:"Not Started",progress:0,assignee:"Harsh Sahu",
   baseStart:"2025-07-01",baseEnd:"2025-09-30",actualStart:null,actualEnd:null,
   duration:91,dependencies:["1.3"],dhyanRakhen:null,lastUpdate:null,
   children:[
    {id:"3.1",no:"3.1",level:2,name:"Internal & External Plaster",category:"Finishing",tag:"",status:"Not Started",progress:0,assignee:"Harsh Sahu",baseStart:"2025-07-01",baseEnd:"2025-08-15",actualStart:null,actualEnd:null,duration:45,dependencies:["1.3.3"],dhyanRakhen:"Plaster thickness 12mm internal, 20mm external. Chicken mesh use karo junctions pe.",lastUpdate:null,
     children:[
      {id:"3.1.1",no:"3.1.1",level:3,name:"External Plaster",category:"Finishing",tag:"",status:"Not Started",progress:0,assignee:"Harsh Sahu",baseStart:"2025-07-01",baseEnd:"2025-07-20",actualStart:null,actualEnd:null,duration:19,dependencies:[],dhyanRakhen:null,lastUpdate:null,children:[]},
      {id:"3.1.2",no:"3.1.2",level:3,name:"Internal Plaster All Floors",category:"Finishing",tag:"",status:"Not Started",progress:0,assignee:"Harsh Sahu",baseStart:"2025-07-05",baseEnd:"2025-08-15",actualStart:null,actualEnd:null,duration:41,dependencies:["3.1.1"],dhyanRakhen:null,lastUpdate:null,children:[]},
     ]},
   ]},
];

function ptFlatten(tasks,out=[]){tasks.forEach(t=>{out.push(t);if(t.children?.length)ptFlatten(t.children,out)});return out;}
function fmtDate(d){
  if(!d) return "—";
  const s=String(d).slice(0,10);
  if(!s||s==="—") return "—";
  const [y,m,dd]=s.split("-");
  return dd+"/"+m+"/"+y;
}
function ptDelayDays(t){if(t.status==="Completed"||!t.baseEnd) return 0;const d=Math.round((new Date("2026-03-15")-new Date(t.baseEnd))/(1000*86400));return d>0?d:0;}

function TabTasks({ projectId }) {
  const [tasks,setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    api.get("/tasks?project_id=" + projectId).then(r => {
      if (r.success) {
        // Build tree from flat list
        const flat = r.data || [];
        const map = {};
        flat.forEach((t, idx) => {
          t.children = [];
          t.no = t.task_no;
          t.tsk_no = "TSK" + String(t.id).padStart(6, "0");
          t.baseStart = t.base_start;
          t.baseEnd = t.base_end;
          t.actualStart = t.actual_start;
          t.actualEnd = t.actual_end;
          t.dhyanRakhen = t.dhyan_rakhen;
          t.lastUpdate = t.last_update;
          t.assignee = t.assignee_name || t.assigned_to || "";
          t.serial = idx + 1;
          map[t.id] = t;
        });
        const roots = [];
        flat.forEach(t => {
          if (t.parent_id && map[t.parent_id]) map[t.parent_id].children.push(t);
          else roots.push(t);
        });
        setTasks(roots);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);
  const [view,setView]       = useState("list");
  const [collapsed,setCollapsed] = useState({});
  const [fCat,setFCat]       = useState("All");
  const [fStatus,setFStatus] = useState("All");
  const [fTag,setFTag]       = useState("All");
  const [fAssignee,setFAssignee] = useState("All");
  const [fDelayed,setFDelayed]   = useState(false);
  const [fAsSchedule,setFAsSchedule] = useState("");
  const [showFilters,setShowFilters] = useState(false);
  const [savedFilters,setSavedFilters] = useState([
    {name:"Civil Ongoing",  f:{fCat:"Civil",fStatus:"Ongoing",fAssignee:"All",fDelayed:false,fAsSchedule:""}},
    {name:"My Delayed",     f:{fCat:"All",fStatus:"All",fAssignee:"Vijay Sahu",fDelayed:true,fAsSchedule:""}},
    {name:"Today Schedule", f:{fCat:"All",fStatus:"All",fAssignee:"All",fDelayed:false,fAsSchedule:"2026-03-16"}},
  ]);
  const [filterSaveName,setFilterSaveName] = useState("");
  const [lastUsedFilter,setLastUsedFilter] = useState(null);
  const [levelFilter,setLevelFilter] = useState("All"); // All | 1 | 2 | 3 | 4 | 5 | 6 | 7
  const [infoTask,setInfoTask]       = useState(null);
  const [contextMenu,setContextMenu] = useState(null); // {x,y,task}
  const [dhyanTask,setDhyanTask]     = useState(null);
  const [pendingTask,setPendingTask] = useState(null);
  const [openTask,setOpenTask]       = useState(null);
  const [editTask,setEditTask]       = useState(null);
  const [addParent,setAddParent]     = useState(null);
  const [showAdd,setShowAdd]         = useState(false);
  const [depSearch,setDepSearch]     = useState("");

  const allFlat = ptFlatten(tasks);
  const TEAM_PT = ["Vijay Sahu","Niranjan","Harsh Sahu","Priyanka","Ramesh"];

  // Apply a saved filter
  const applyFilter=(f)=>{
    setFCat(f.fCat||"All");setFStatus(f.fStatus||"All");
    setFTag(f.fTag||"All");setFAssignee(f.fAssignee||"All");
    setFDelayed(f.fDelayed||false);setFAsSchedule(f.fAsSchedule||"");
    setLastUsedFilter(f);
  };
  const saveCurrentFilter=()=>{
    if(!filterSaveName.trim()) return;
    const f={fCat,fStatus,fTag,fAssignee,fDelayed,fAsSchedule};
    setSavedFilters(p=>[{name:filterSaveName,f},...p.filter(x=>x.name!==filterSaveName)]);
    setLastUsedFilter(f);
    setFilterSaveName("");
  };

  // Scheduled start from dependencies
  function getSchedStart(t){
    if(!t.dependencies?.length) return t.baseStart;
    let latest=null;
    t.dependencies.forEach(depId=>{
      const dep=allFlat.find(x=>x.id===depId);
      if(!dep) return;
      const candidate=dep.baseEnd||dep.baseStart;
      if(!latest||new Date(candidate)>new Date(latest)) latest=candidate;
    });
    return latest||t.baseStart;
  }

  function applyFilters(list){
    return list.map(t=>{
      const ch=t.children?applyFilters(t.children):[];
      const mCat=fCat==="All"||t.category===fCat;
      const mSt=fStatus==="All"||t.status===fStatus;
      const mTag=fTag==="All"||t.tag===fTag;
      const mAs=fAssignee==="All"||t.assignee===fAssignee;
      const mDel=!fDelayed||ptDelayDays(t)>0;
      let mSched=true;
      if(fAsSchedule){
        const sd=getSchedStart(t);
        mSched=sd?Math.abs((new Date(sd)-new Date(fAsSchedule))/(1000*86400))<=3:false;
      }
      const self=mCat&&mSt&&mTag&&mAs&&mDel&&mSched;
      if(self||ch.length>0) return{...t,children:ch};
      return null;
    }).filter(Boolean);
  }
  const filtered=applyFilters(tasks);
  const flatFiltered=ptFlatten(filtered);
  const allTags=[...new Set(allFlat.map(t=>t.tag).filter(Boolean))];
  const activeF=[fCat!=="All",fStatus!=="All",fTag!=="All",fAssignee!=="All",fDelayed,!!fAsSchedule].filter(Boolean).length;

  const ongoing=allFlat.filter(t=>t.status==="Ongoing").length;
  const completed=allFlat.filter(t=>t.status==="Completed").length;
  const delayed=allFlat.filter(t=>ptDelayDays(t)>0).length;
  const dhyanCount=allFlat.filter(t=>t.dhyanRakhen).length;

  const toggleCollapse=(id)=>setCollapsed(p=>({...p,[id]:!p[id]}));

  const handleOpen=(t)=>{
    if(t.dhyanRakhen){setPendingTask(t);setDhyanTask(t);}
    else setOpenTask(t);
  };

  // Move task up/down within siblings
  const moveTask = async (taskId, dir) => {
    const flat = ptFlatten(tasks);
    const idx = flat.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= flat.length) return;
    const a = flat[idx], b = flat[swapIdx];
    // Swap sort_order
    await Promise.all([
      api.put("/tasks/" + a.id, {sort_order: b.sort_order ?? swapIdx}),
      api.put("/tasks/" + b.id, {sort_order: a.sort_order ?? idx}),
    ]);
    // Reload
    const r = await api.get("/tasks?project_id=" + projectId);
    if (r.success) {
      const fl = r.data || []; const map = {};
      fl.forEach((t,i) => { t.children=[]; t.no=t.task_no; t.tsk_no="T"+String(t.id).padStart(4,"0"); t.baseStart=t.base_start; t.baseEnd=t.base_end; t.dhyanRakhen=t.dhyan_rakhen; t.assignee=t.assignee_name||""; t.serial=i+1; map[t.id]=t; });
      const roots=[]; fl.forEach(t => { if(t.parent_id&&map[t.parent_id]) map[t.parent_id].children.push(t); else roots.push(t); });
      setTasks(roots);
    }
  };

  function updateInTree(list,id,upd){
    return list.map(t=>{
      if(t.id===id) return{...t,...upd,lastUpdate:"2026-03-15"};
      return{...t,children:updateInTree(t.children||[],id,upd)};
    });
  }

  const STATUS_C={"Completed":{c:T.grn,bg:T.grnL,brd:T.grnM},"Ongoing":{c:T.blu,bg:T.bluL,brd:T.bluM},"Not Started":{c:T.slt,bg:T.sltL,brd:T.b2},"Hold":{c:T.amb,bg:T.ambL,brd:T.ambM}};
  const CAT_C={"Civil":{c:T.blu,bg:T.bluL},"Electrical":{c:T.amb,bg:T.ambL},"Plumbing":{c:"#0891B2",bg:"#E0F2FE"},"Finishing":{c:T.pur,bg:T.purL},"Custom":{c:T.slt,bg:T.sltL}};

  // Flatten with depth info for level filter
  function flattenWithDepth(list, depth=0, out=[]) {
    list.forEach(t => { out.push({...t, _depth: depth}); if(t.children?.length) flattenWithDepth(t.children, depth+1, out); });
    return out;
  }

  function renderRow(t, depth=0, sno=[], maxDepth=undefined){
    const hasKids=t.children?.length>0;
    const isOpen=!collapsed[t.id];
    const ss=STATUS_C[t.status]||STATUS_C["Not Started"];
    const delay=ptDelayDays(t);
    const lvlColors=[T.blu,T.grn,T.amb,"#7C3AED","#EC4899","#0891B2","#84CC16"];
    const lvl=lvlColors[Math.min(depth,6)];
    const indent=depth*16;
    const GRID="26px 52px 1fr 85px 100px 80px 80px 44px 70px";
    const SEP={borderRight:"1px solid "+T.b1};
    const [showAct,setShowAct]=React.useState(false);
    const [editStart,setEditStart]=React.useState(false);
    const [editEnd,setEditEnd]=React.useState(false);

    return(
      <div key={t.id} onContextMenu={e=>{e.preventDefault();setContextMenu({x:e.clientX,y:e.clientY,task:t});}} style={{position:"relative"}}>
        <div style={{display:"grid",gridTemplateColumns:GRID,alignItems:"center",height:34,borderBottom:"1px solid "+T.b1,background:depth===0?T.surfaceB+"55":"transparent",borderLeft:"3px solid "+lvl,transition:"background .12s"}}
          onMouseEnter={e=>{e.currentTarget.style.background=T.bluL+"44";setShowAct(true);}}
          onMouseLeave={e=>{e.currentTarget.style.background=depth===0?T.surfaceB+"55":"transparent";setShowAct(false);}}>

          {/* Toggle */}
          <div onClick={()=>hasKids&&toggleCollapse(t.id)} style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",cursor:hasKids?"pointer":"default",...SEP}}>
            {hasKids
              ?<div style={{width:14,height:14,borderRadius:3,background:isOpen?lvl:T.surfaceB,border:"1px solid "+(isOpen?lvl:T.b2),display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width={7} height={7} viewBox="0 0 12 12" fill="none" stroke={isOpen?"white":T.t4} strokeWidth={2.5}><path d={isOpen?"M2 4l4 4 4-4":"M4 2l4 4-4 4"}/></svg>
               </div>
              :<div style={{width:5,height:5,borderRadius:"50%",background:lvl}}/>
            }
          </div>

          {/* S.No T0001 */}
          <div style={{padding:"0 5px",display:"flex",flexDirection:"column",justifyContent:"center",...SEP}}>
            <span style={{fontSize:11,fontWeight:700,color:T.t1,lineHeight:1.2}}>{t.no}</span>
            <span style={{fontSize:8.5,color:T.slt,fontFamily:"monospace",lineHeight:1.2}}>{t.tsk_no||""}</span>
          </div>

          {/* Task Name + hover buttons */}
          <div style={{display:"flex",alignItems:"center",paddingLeft:6+indent,paddingRight:4,overflow:"hidden",...SEP,height:"100%",position:"relative"}}>
            <div onClick={(e)=>{e.stopPropagation();handleOpen(t);}} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",flex:1,minWidth:0}}>
              {t.dhyanRakhen&&<svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth={2} style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>}
              <span style={{fontSize:depth===0?13:12.5,fontWeight:depth===0?700:depth===1?600:400,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
              {t.tag&&<span style={{background:T.ambL,color:T.amb,fontSize:8,fontWeight:600,padding:"1px 4px",borderRadius:3,flexShrink:0,whiteSpace:"nowrap"}}>{t.tag}</span>}
              {delay>0&&<span style={{background:T.redL,color:T.red,fontSize:8,fontWeight:700,padding:"1px 3px",borderRadius:3,flexShrink:0}}>+{delay}d</span>}
            </div>
            {/* Buttons on hover — inline React state */}
            {showAct&&(
              <div onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:3,flexShrink:0,paddingLeft:5,background:"linear-gradient(to right,transparent,"+T.bluL+"dd 15%)"}}>
                <button onClick={()=>setInfoTask(infoTask?.id===t.id?null:t)} title="Info"
                  style={{width:22,height:22,borderRadius:4,background:infoTask?.id===t.id?"#FEF3C7":T.surface,border:"1px solid "+(infoTask?.id===t.id?"#FCD34D":T.b1),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={infoTask?.id===t.id?"#D97706":T.t3} strokeWidth={2}><circle cx={12} cy={12} r={10}/><path d="M12 16v-4M12 8h.01"/></svg>
                </button>
                {depth<6&&<button onClick={()=>{setAddParent(t);setShowAdd(true);}} title="Add Subtask"
                  style={{width:22,height:22,borderRadius:4,background:T.surface,border:"1px solid "+T.b1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.grn} strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
                </button>}
                <button onClick={()=>setEditTask(t)} title="Edit"
                  style={{width:22,height:22,borderRadius:4,background:T.surface,border:"1px solid "+T.b1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.blu} strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            )}
          </div>

          {/* Status */}
          <div style={{padding:"0 6px",...SEP,display:"flex",alignItems:"center",height:"100%"}}>
            <span style={{background:ss.bg,color:ss.c,fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:20,whiteSpace:"nowrap"}}>{t.status}</span>
          </div>

          {/* Progress */}
          <div style={{padding:"0 8px",...SEP,display:"flex",flexDirection:"column",justifyContent:"center",height:"100%"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
              <span style={{fontSize:10,fontWeight:700,color:t.progress===100?T.grn:t.progress>0?T.blu:T.t4}}>{t.progress}%</span>
            </div>
            <div style={{height:4,background:T.b1,borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:t.progress+"%",background:t.progress===100?T.grn:T.blu,borderRadius:2}}/>
            </div>
          </div>

          {/* Start — click to edit inline */}
          <div style={{padding:"0 6px",...SEP,display:"flex",alignItems:"center",height:"100%",cursor:"pointer"}}
            onClick={e=>{e.stopPropagation();setEditStart(true);}}>
            {editStart
              ?<input type="date" autoFocus defaultValue={t.baseStart||""}
                  style={{width:"100%",fontSize:10,border:"none",outline:"none",background:"transparent",color:T.blu,fontFamily:"inherit"}}
                  onBlur={async e=>{
                    setEditStart(false);
                    if(e.target.value!==t.baseStart){
                      await api.put("/tasks/"+t.id,{base_start:e.target.value});
                      setTasks(updateInTree(tasks,t.id,{baseStart:e.target.value,base_start:e.target.value}));
                    }
                  }}
                  onClick={e=>e.stopPropagation()}/>
              :<span style={{fontSize:10,color:T.t3,whiteSpace:"nowrap"}}>{fmtDate(t.baseStart)}</span>
            }
          </div>

          {/* End — click to edit inline */}
          <div style={{padding:"0 6px",...SEP,display:"flex",alignItems:"center",height:"100%",cursor:"pointer"}}
            onClick={e=>{e.stopPropagation();setEditEnd(true);}}>
            {editEnd
              ?<input type="date" autoFocus defaultValue={t.baseEnd||""}
                  style={{width:"100%",fontSize:10,border:"none",outline:"none",background:"transparent",color:delay>0?T.red:T.blu,fontFamily:"inherit"}}
                  onBlur={async e=>{
                    setEditEnd(false);
                    if(e.target.value!==t.baseEnd){
                      await api.put("/tasks/"+t.id,{base_end:e.target.value});
                      setTasks(updateInTree(tasks,t.id,{baseEnd:e.target.value,base_end:e.target.value}));
                    }
                  }}
                  onClick={e=>e.stopPropagation()}/>
              :<span style={{fontSize:10,color:delay>0?T.red:T.t3,fontWeight:delay>0?700:400,whiteSpace:"nowrap"}}>{fmtDate(t.baseEnd)}</span>
            }
          </div>

          {/* Days */}
          <div style={{padding:"0 4px",...SEP,display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}>
            <span style={{fontSize:10,color:T.t4}}>{t.duration>0?t.duration:"—"}</span>
          </div>

          {/* Assigned */}
          <div style={{padding:"0 6px",display:"flex",alignItems:"center",height:"100%"}}>
            <span style={{fontSize:10,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(t.assignee||"").split(" ")[0]||"—"}</span>
          </div>
        </div>

        {/* Info panel */}
        {infoTask?.id===t.id&&(
          <div style={{padding:"10px 18px",background:"#FFFBEB",borderBottom:"1px solid #FDE68A",borderLeft:"3px solid "+lvl,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {[
              {l:"Task No",v:t.no||"—"},{l:"TSK",v:t.tsk_no||"—"},
              {l:"Category",v:t.category||"—"},{l:"Status",v:t.status||"—"},
              {l:"Progress",v:(t.progress||0)+"%"},{l:"Assigned",v:t.assignee||"—"},
              {l:"Start",v:fmtDate(t.baseStart)},{l:"End",v:fmtDate(t.baseEnd)},
              {l:"Duration",v:t.duration>0?t.duration+"d":"—"},{l:"Tag",v:t.tag||"—"},
              {l:"Last Update",v:fmtDate(t.lastUpdate)},{l:"Dhyan Alert",v:t.dhyanRakhen?"Yes":"No"},
            ].map(({l,v})=>(
              <div key={l}>
                <div style={{fontSize:9,fontWeight:700,color:"#92400E",textTransform:"uppercase",letterSpacing:".3px",marginBottom:1}}>{l}</div>
                <div style={{fontSize:12,fontWeight:600,color:"#1C1917"}}>{v}</div>
              </div>
            ))}
          </div>
        )}
        {hasKids&&isOpen&&(maxDepth===undefined||depth+1<=maxDepth)&&t.children.map(ch=>renderRow(ch,depth+1,undefined,maxDepth))}
      </div>
    );
  }

  return(
    <div style={{padding:"14px 18px",fontFamily:"'Segoe UI',sans-serif"}}>

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:9,marginBottom:12}}>
        {[
          {l:"Total Tasks",v:allFlat.length,c:T.slt},
          {l:"Ongoing",v:ongoing,c:T.blu},
          {l:"Completed",v:completed,c:T.grn},
          {l:"Delayed",v:delayed,c:delayed>0?T.red:T.grn},
          {l:"DHYAN Alerts",v:dhyanCount,c:T.red},
        ].map((s,i)=>(
          <div key={i} style={{padding:"9px 12px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:7,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:9,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{s.l}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
        {/* View toggle */}
        <div style={{display:"flex",gap:2,background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,padding:3}}>
          {[["list","List"],["gantt","Gantt"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setView(id)}
              style={{padding:"5px 11px",borderRadius:5,border:"none",background:view===id?T.blu:"none",color:view===id?"white":T.t3,fontSize:11.5,fontWeight:view===id?700:400,cursor:"pointer"}}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Filter button */}
        <button onClick={()=>setShowFilters(s=>!s)}
          style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:6,border:`1.5px solid ${activeF>0?T.amb:T.b1}`,background:activeF>0?T.ambL:T.surface,color:activeF>0?T.amb:T.t3,fontSize:11.5,fontWeight:activeF>0?600:400,cursor:"pointer"}}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
          Filters {activeF>0&&<span style={{background:T.amb,color:"white",fontSize:9,fontWeight:700,padding:"0 5px",borderRadius:10}}>{activeF}</span>}
        </button>

        {/* ── AS SCHEDULE — always visible date pill ── */}
        <div style={{display:"flex",alignItems:"center",gap:0,background:fAsSchedule?T.grnL:T.surfaceB,border:`1.5px solid ${fAsSchedule?T.grnM:T.b1}`,borderRadius:7,overflow:"hidden",height:30}}>
          {/* Calendar icon + label */}
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"0 9px",borderRight:`1px solid ${fAsSchedule?T.grnM:T.b1}`,height:"100%",cursor:"default"}}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={fAsSchedule?T.grn:T.slt} strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span style={{fontSize:11,fontWeight:600,color:fAsSchedule?T.grn:T.t3,whiteSpace:"nowrap"}}>As Schedule</span>
            {fAsSchedule&&<span style={{background:T.grn,color:"white",fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:3}}>ON</span>}
          </div>
          {/* Date input */}
          <input type="date" value={fAsSchedule} onChange={e=>setFAsSchedule(e.target.value)}
            style={{height:"100%",padding:"0 8px",border:"none",background:"transparent",fontSize:11.5,color:fAsSchedule?T.grn:T.t2,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer",width:fAsSchedule?130:120}}/>
          {/* Today shortcut */}
          <button onClick={()=>setFAsSchedule("2026-03-16")}
            style={{padding:"0 7px",height:"100%",border:"none",borderLeft:`1px solid ${fAsSchedule?T.grnM:T.b1}`,background:fAsSchedule?"transparent":T.surface,color:fAsSchedule?T.grn:T.t4,fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
            Today
          </button>
          {/* Clear X */}
          {fAsSchedule&&<button onClick={()=>setFAsSchedule("")}
            style={{padding:"0 7px",height:"100%",border:"none",borderLeft:`1px solid ${T.grnM}`,background:"transparent",color:T.grn,fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center"}}>
            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>}
        </div>
        {/* As Schedule active info */}
        {fAsSchedule&&<div style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:6}}>
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={T.grn} strokeWidth={2}><path d="M20 6L9 17l-5-5"/></svg>
          <span style={{fontSize:10.5,color:T.grn,fontWeight:600}}>{flatFiltered.length} tasks · {flatFiltered.filter(t=>t.status==="Not Started").length} not started</span>
        </div>}

        <div style={{flex:1}}/>
        {dhyanCount>0&&<div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",background:T.redL,borderRadius:6,border:`1px solid ${T.redM}`}}>
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
          <span style={{fontSize:10.5,fontWeight:700,color:T.red}}>{dhyanCount} DHYAN alerts</span>
        </div>}
        {/* Level filter */}
        <select value={levelFilter} onChange={e=>setLevelFilter(e.target.value)}
          style={{height:32,padding:"0 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t2,background:T.surface,fontFamily:"inherit",cursor:"pointer"}}>
          <option value="All">All Levels</option>
          {[1,2,3,4,5,6,7].map(l=><option key={l} value={l}>Level {l}</option>)}
        </select>
        {/* Excel Export */}
        <button onClick={()=>{
          const flat=ptFlatten(tasks);
          const rows=[["Task No","Name","Category","Status","Progress%","Assigned To","Start Date","End Date","Tag"]];
          flat.forEach(t=>rows.push([t.no,t.name,t.category,t.status,t.progress,t.assignee||"",t.baseStart||"",t.baseEnd||"",t.tag||""]));
          const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\n");
          const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download="tasks.csv";a.click();
        }} title="Export to Excel"
          style={{height:32,padding:"0 12px",borderRadius:6,border:`1.5px solid ${T.b1}`,background:T.surface,fontSize:12,color:T.t2,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Export
        </button>
        {/* Excel Import */}
        <label title="Import from Excel/CSV"
          style={{height:32,padding:"0 12px",borderRadius:6,border:`1.5px solid ${T.b1}`,background:T.surface,fontSize:12,color:T.t2,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          Import
          <input type="file" accept=".csv" style={{display:"none"}} onChange={async e=>{
            const file=e.target.files[0]; if(!file) return;
            const text=await file.text();
            const lines=text.split("\n").filter(Boolean);
            const headers=lines[0].split(",").map(h=>h.replace(/"/g,"").trim());
            const rows=lines.slice(1).map(line=>{
              const vals=line.split(",").map(v=>v.replace(/"/g,"").trim());
              const obj={}; headers.forEach((h,i)=>obj[h]=vals[i]||""); return obj;
            });
            for(const row of rows){
              if(!row["Name"]&&!row["name"]) continue;
              await api.post("/tasks",{
                project_id:projectId,
                name:row["Name"]||row["name"],
                category:row["Category"]||row["category"]||"Civil",
                tag:row["Tag"]||row["tag"]||"",
                base_start:row["Start Date"]||row["start_date"]||null,
                base_end:row["End Date"]||row["end_date"]||null,
                status:row["Status"]||"Not Started",
              });
            }
            // Reload
            const r=await api.get("/tasks?project_id="+projectId);
            if(r.success){
              const flat=r.data||[];const map={};
              flat.forEach(t=>{t.children=[];t.no=t.task_no;t.baseStart=t.base_start;t.baseEnd=t.base_end;t.dhyanRakhen=t.dhyan_rakhen;t.assignee=t.assignee_name||"";map[t.id]=t;});
              const roots=[];flat.forEach(t=>{if(t.parent_id&&map[t.parent_id])map[t.parent_id].children.push(t);else roots.push(t);});
              setTasks(roots);
            }
            alert("Import complete!");
            e.target.value="";
          }}/>
        </label>
        <button onClick={()=>{setAddParent(null);setShowAdd(true);}}
          style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg> Add Task
        </button>
      </div>

      {/* Filter panel — 2 rows */}
      {showFilters&&(
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:10}}>
          {/* Row 1 */}
          <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap",marginBottom:10}}>
            {[{l:"Category",v:fCat,fn:setFCat,opts:["All","Civil","Electrical","Plumbing","Finishing","Custom"],def:"All Categories"},
              {l:"Status",v:fStatus,fn:setFStatus,opts:["All","Ongoing","Completed","Not Started","Hold"],def:"All Status"},
              {l:"Tag",v:fTag,fn:setFTag,opts:["All",...allTags],def:"All Tags"},
              {l:"Assigned To",v:fAssignee,fn:setFAssignee,opts:["All",...TEAM_PT],def:"All"},
            ].map(({l,v,fn,opts,def})=>(
              <div key={l}>
                <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:4}}>{l}</div>
                <select value={v} onChange={e=>fn(e.target.value)}
                  style={{height:30,padding:"0 10px",borderRadius:6,border:`1.5px solid ${v!=="All"?T.blu:T.b1}`,background:v!=="All"?T.bluL:T.surface,fontSize:12,color:v!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                  {opts.map(o=><option key={o} value={o}>{o==="All"?def:o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:4}}>Delayed</div>
              <button onClick={()=>setFDelayed(s=>!s)}
                style={{height:30,padding:"0 11px",borderRadius:6,border:`1.5px solid ${fDelayed?T.red:T.b1}`,background:fDelayed?T.redL:T.surface,color:fDelayed?T.red:T.t3,fontSize:12,fontWeight:fDelayed?700:400,cursor:"pointer"}}>
                {fDelayed?"Delayed Only":"All Tasks"}
              </button>
            </div>
            {activeF>0&&<button onClick={()=>{setFCat("All");setFStatus("All");setFTag("All");setFAssignee("All");setFDelayed(false);setFAsSchedule("");}}
              style={{height:30,padding:"0 10px",borderRadius:6,border:`1px solid ${T.b1}`,background:T.surfaceB,color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer",alignSelf:"flex-end"}}>
              Clear All
            </button>}
          </div>

          {/* Row 2 — Saved Filters + Last Used */}
          <div style={{borderTop:`1px solid ${T.b1}`,paddingTop:10,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {/* Saved filter chips */}
            <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",flexShrink:0}}>Saved</div>
            {savedFilters.map((sf,i)=>{
              const isLast=lastUsedFilter&&JSON.stringify(lastUsedFilter)===JSON.stringify(sf.f);
              return(
                <button key={i} onClick={()=>applyFilter(sf.f)}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,border:`1px solid ${isLast?T.blu:T.b1}`,background:isLast?T.bluL:T.surfaceB,color:isLast?T.blu:T.t3,fontSize:11.5,fontWeight:isLast?700:400,cursor:"pointer",transition:"all .1s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=T.blu;e.currentTarget.style.color=T.blu;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=isLast?T.blu:T.b1;e.currentTarget.style.color=isLast?T.blu:T.t3;}}>
                  {isLast&&<svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>}
                  {sf.name}
                  {isLast&&<span style={{background:T.blu,color:"white",fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:3}}>LAST</span>}
                </button>
              );
            })}

            {/* Vertical divider */}
            <div style={{width:1,height:20,background:T.b1,flexShrink:0}}/>

            {/* Save current filter */}
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <input value={filterSaveName} onChange={e=>setFilterSaveName(e.target.value)}
                placeholder="Save filter as..."
                style={{height:28,padding:"0 9px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,color:T.t1,outline:"none",width:130,fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}
                onKeyDown={e=>e.key==="Enter"&&saveCurrentFilter()}/>
              <button onClick={saveCurrentFilter}
                style={{height:28,padding:"0 11px",borderRadius:6,background:filterSaveName.trim()?T.blu:T.b1,color:filterSaveName.trim()?"white":T.t4,border:"none",cursor:filterSaveName.trim()?"pointer":"default",fontSize:11.5,fontWeight:700}}>
                Save
              </button>
            </div>

            {activeF>0&&<span style={{fontSize:11,color:T.t4,marginLeft:"auto"}}>{flatFiltered.length} tasks match</span>}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view==="list"&&(
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:"26px 52px 1fr 85px 100px 80px 80px 44px 70px",background:"#0D1B2A"}}>
            {["","No / TSK","Task Name","Status","Progress","Start","End","Days","Assigned"].map((h,i)=>(
              <div key={i} style={{padding:"7px 5px",borderRight:i<8?"1px solid rgba(255,255,255,0.08)":"none"}}>
                <span style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:".4px",whiteSpace:"nowrap"}}>{h}</span>
              </div>
            ))}
          </div>
          <div style={{maxHeight:480,overflowY:"auto"}}>
            {levelFilter==="All"
              ? filtered.map(t=>renderRow(t,0))
              : filtered.map(t=>renderRow(t,0,undefined,parseInt(levelFilter)-1))
            }
          </div>
        </div>
      )}

      {/* GANTT VIEW — simple inline */}
      {view==="gantt"&&(
        <div style={{overflowX:"auto",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
          <PTGantt tasks={filtered}/>
        </div>
      )}

      {/* DHYAN RAKHEN popup */}
      {dhyanTask&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(3px)"}}>
          <div style={{background:T.surface,borderRadius:14,width:440,boxShadow:"0 24px 64px rgba(0,0,0,0.4)",overflow:"hidden",animation:"slideIn .25s ease",fontFamily:"'Segoe UI',sans-serif"}}>
            <div style={{background:"linear-gradient(135deg,#DC2626,#B91C1C)",padding:"18px 22px",display:"flex",gap:14,alignItems:"center"}}>
              <div style={{width:44,height:44,borderRadius:10,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.7)",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:3}}>⚠ DHYAN RAKHEN</div>
                <div style={{fontSize:14,fontWeight:700,color:"white"}}>{dhyanTask.name}</div>
                <div style={{fontSize:10.5,color:"rgba(255,255,255,0.6)",marginTop:2}}>{dhyanTask.no} · {dhyanTask.category}</div>
              </div>
            </div>
            <div style={{padding:"18px 22px"}}>
              <div style={{background:T.redL,border:`1px solid ${T.redM}`,borderLeft:`4px solid ${T.red}`,borderRadius:7,padding:"12px 14px",marginBottom:14}}>
                <div style={{fontSize:13.5,color:T.red,lineHeight:1.6,fontWeight:500}}>{dhyanTask.dhyanRakhen}</div>
              </div>
              <div style={{fontSize:11.5,color:T.t4,marginBottom:14,textAlign:"center"}}>Is task ko kholne se pehle upar likhi baat dhyan se padh lein</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setDhyanTask(null);setPendingTask(null);}}
                  style={{flex:1,padding:"10px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Wapas Jao</button>
                <button onClick={()=>{setOpenTask(pendingTask);setDhyanTask(null);setPendingTask(null);}}
                  style={{flex:2,padding:"10px",borderRadius:7,background:`linear-gradient(135deg,${T.grn},#047857)`,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer"}}>
                  ✓ Samajh Gaya — Kholein
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:14}}>Loading tasks...</div>}
      {!loading && tasks.length===0 && <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:14}}>No tasks yet — click + Add Task to create</div>}

      {/* Context Menu */}
      {contextMenu && <>
        <div onClick={()=>setContextMenu(null)} style={{position:"fixed",inset:0,zIndex:998}}/>
        <div style={{position:"fixed",left:contextMenu.x,top:contextMenu.y,zIndex:999,background:"white",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",border:"1px solid #E5E7EB",minWidth:200,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
          <div style={{padding:"6px 0"}}>
            {/* Task info header */}
            <div style={{padding:"8px 14px 6px",borderBottom:"1px solid #F3F4F6",marginBottom:4}}>
              <div style={{fontSize:11,fontWeight:700,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{contextMenu.task.name}</div>
              <div style={{fontSize:9.5,color:"#9CA3AF",fontFamily:"monospace"}}>{contextMenu.task.tsk_no} · {contextMenu.task.no}</div>
            </div>
            {[
              {icon:"M5 15l7-7 7 7",label:"Move Up",action:()=>{moveTask(contextMenu.task.id,"up");setContextMenu(null);}},
              {icon:"M19 9l-7 7-7-7",label:"Move Down",action:()=>{moveTask(contextMenu.task.id,"down");setContextMenu(null);}},
              null, // divider
              {icon:"M12 5v14M5 12h14",label:"Add Subtask",action:()=>{setAddParent(contextMenu.task);setShowAdd(true);setContextMenu(null);},color:"#10B981"},
              {icon:"M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",label:"Edit Task",action:()=>{setEditTask(contextMenu.task);setContextMenu(null);}},
              {icon:"M20 6L9 17l-5-5",label:"Mark Complete",action:async()=>{await api.put("/tasks/"+contextMenu.task.id,{progress:100});setTasks(updateInTree(tasks,contextMenu.task.id,{progress:100,status:"Completed"}));setContextMenu(null);}},
              null,
              {icon:"M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",label:"Delete Task",action:async()=>{if(window.confirm("Delete this task?")){{await api.del("/tasks/"+contextMenu.task.id);setTasks(ptFlatten(tasks).filter(t=>t.id!==contextMenu.task.id));setContextMenu(null);}};},color:"#EF4444"},
            ].map((item,i)=>
              item === null
              ? <div key={i} style={{height:1,background:"#F3F4F6",margin:"4px 0"}}/>
              : <button key={i} onClick={item.action}
                  style={{width:"100%",padding:"8px 14px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:9,fontSize:13,color:item.color||"#374151",textAlign:"left"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={item.color||"#6B7280"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                  {item.label}
                </button>
            )}
          </div>
        </div>
      </>}

      {/* Task Detail drawer */}
      {openTask&&<PTTaskDetail task={openTask} allTasks={allFlat} onClose={()=>setOpenTask(null)} projectId={projectId} onUpdate={(id,u)=>{setTasks(updateInTree(tasks,id,u));}}/>}

      {/* Edit Task drawer */}
      {editTask&&<PTEditTask task={editTask} allTasks={allFlat} onClose={()=>setEditTask(null)} onSave={async(id,u)=>{
        await api.put("/tasks/"+id, { name:u.name, category:u.category, tag:u.tag, status:u.status, progress:u.progress, base_start:u.baseStart, base_end:u.baseEnd, dependencies:u.dependencies, dhyan_rakhen:u.dhyanRakhen });
        setTasks(updateInTree(tasks,id,u)); setEditTask(null);
      }}/>}

      {/* Add Task modal */}
      {showAdd&&<PTAddTask parent={addParent} allTasks={allFlat} onClose={()=>{setShowAdd(false);setAddParent(null);}} onSave={async(form)=>{
        const res = await api.post("/tasks", {
          project_id: projectId,
          parent_id: addParent?.id || null,
          name: form.name,
          category: form.category,
          tag: form.tag || "",
          assigned_to: null,
          base_start: form.baseStart || null,
          base_end: form.baseEnd || null,
          duration: form.baseStart && form.baseEnd ? Math.round((new Date(form.baseEnd)-new Date(form.baseStart))/(1000*86400)) : 0,
          dependencies: form.dependencies || [],
          dhyan_rakhen: form.dhyanRakhen || null,
        });
        if (res.success) {
          // Reload tasks from backend
          const r2 = await api.get("/tasks?project_id=" + projectId);
          if (r2.success) {
            const flat = r2.data || [];
            const map = {};
            flat.forEach(t => { t.children=[]; t.no=t.task_no; t.baseStart=t.base_start; t.baseEnd=t.base_end; t.dhyanRakhen=t.dhyan_rakhen; t.assignee=t.assignee_name||""; map[t.id]=t; });
            const roots = [];
            flat.forEach(t => { if(t.parent_id&&map[t.parent_id]) map[t.parent_id].children.push(t); else roots.push(t); });
            setTasks(roots);
          }
        } else alert(res.message || "Save failed");
        setShowAdd(false); setAddParent(null);
      }}/>}
    </div>
  );
}

// ── Inline Gantt for project detail ──────────────────────────────
function PTGantt({tasks}){
  const allFlat=ptFlatten(tasks);
  const MONTHS=[];
  let d=new Date("2025-01-01");
  while(d<=new Date("2026-10-01")){MONTHS.push({y:d.getFullYear(),m:d.getMonth(),lbl:`${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}${d.getFullYear()===2026?"'26":""}`});d=new Date(d.getFullYear(),d.getMonth()+1,1);}
  const ROW_H=26,LBL_W=180,MO_W=36,HDR_H=28,TOTAL_W=LBL_W+MONTHS.length*MO_W,TOTAL_H=HDR_H+allFlat.length*ROW_H;
  const pStart=new Date("2025-01-01");
  const toX=(ds)=>{if(!ds)return null;const dd=(new Date(ds)-pStart)/(1000*86400);const tot=(new Date("2026-10-01")-pStart)/(1000*86400);return LBL_W+dd/tot*(MONTHS.length*MO_W);};
  const todayX=toX("2026-03-15");
  return(
    <svg width={TOTAL_W} height={TOTAL_H} style={{display:"block",fontFamily:"'Segoe UI',sans-serif",minWidth:TOTAL_W}}>
      <rect x={0} y={0} width={TOTAL_W} height={HDR_H} fill="#0D1B2A"/>
      <text x={10} y={HDR_H/2+4} fontSize={9.5} fill="rgba(255,255,255,0.55)" fontWeight="600">Task</text>
      {MONTHS.map((mo,i)=>(
        <g key={i}><rect x={LBL_W+i*MO_W} y={0} width={MO_W} height={HDR_H} fill={i%2===0?"#0D1B2A":"#162032"}/>
        <text x={LBL_W+i*MO_W+MO_W/2} y={HDR_H/2+4} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.5)">{mo.lbl}</text></g>
      ))}
      {allFlat.map((t,i)=>{
        const y=HDR_H+i*ROW_H;
        const bx1=toX(t.baseStart),bx2=toX(t.baseEnd);
        const ax1=toX(t.actualStart),ax2=t.actualEnd?toX(t.actualEnd):todayX;
        const bw=bx1&&bx2?Math.max(2,bx2-bx1):0;
        const aw=ax1?Math.max(2,(ax2-ax1)*t.progress/100):0;
        const indent=t.level*10;
        return(
          <g key={t.id}>
            <rect x={0} y={y} width={TOTAL_W} height={ROW_H} fill={i%2===0?T.surface:T.surfaceB}/>
            <line x1={0} y1={y+ROW_H} x2={TOTAL_W} y2={y+ROW_H} stroke={T.b1} strokeWidth={0.5}/>
            {MONTHS.map((_,mi)=><line key={mi} x1={LBL_W+mi*MO_W} y1={y} x2={LBL_W+mi*MO_W} y2={y+ROW_H} stroke={T.b1} strokeWidth={0.5}/>)}
            <text x={8+indent} y={y+ROW_H/2+4} fontSize={t.level===1?11:t.level===2?10:9.5} fontWeight={t.level===1?700:t.level===2?600:400} fill={T.t1}>{t.no} {t.name.slice(0,t.level===1?18:15)}{t.name.length>(t.level===1?18:15)?"…":""}</text>
            {bx1&&bw>0&&<rect x={bx1} y={y+ROW_H/2-3} width={bw} height={5} rx={2} fill={T.blu} fillOpacity={0.35}/>}
            {ax1&&aw>0&&<rect x={ax1} y={y+ROW_H/2-5} width={aw} height={9} rx={2} fill={t.status==="Completed"?T.grn:T.grn} fillOpacity={0.8}/>}
            {t.dhyanRakhen&&bx1&&<circle cx={bx1-5} cy={y+ROW_H/2} r={3.5} fill="#F59E0B"/>}
          </g>
        );
      })}
      {todayX&&<g><line x1={todayX} y1={HDR_H} x2={todayX} y2={TOTAL_H} stroke={T.red} strokeWidth={1.5} strokeDasharray="4,3"/><rect x={todayX-13} y={HDR_H-14} width={26} height={13} rx={3} fill={T.red}/><text x={todayX} y={HDR_H-4} textAnchor="middle" fontSize={7.5} fill="white" fontWeight="700">TODAY</text></g>}
    </svg>
  );
}

// ── PT Task Detail ────────────────────────────────────────────────
function PTTaskDetail({task,allTasks,onClose,onUpdate,projectId}){
  const [tab,setTab]=useState("progress");
  const [prog,setProg]=useState(task.progress||0);
  const [saving,setSaving]=useState(false);

  // Materials state
  const [materials,setMaterials]=useState([]);
  const [showMatForm,setShowMatForm]=useState(false);
  const [matForm,setMatForm]=useState({material_name:"",required_qty:"",used_qty:"",unit:"Bag",remark:""});

  // Labour state
  const [labours,setLabours]=useState([]);
  const [showLabForm,setShowLabForm]=useState(false);
  const [labForm,setLabForm]=useState({labour_name:"",role:"Mason",count:1,work_date:new Date().toISOString().split("T")[0],hours:8,remark:""});

  // Site Photos state
  const [photos,setPhotos]=useState([]);
  const [uploading,setUploading]=useState(false);

  // Issues state
  const [issues,setIssues]=useState([]);
  const [showIssueForm,setShowIssueForm]=useState(false);
  const [issueForm,setIssueForm]=useState({title:"",description:"",priority:"Medium",assigned_to:""});

  // Comments state
  const [comments,setComments]=useState([]);
  const [commentText,setCommentText]=useState("");

  // Load data on tab change
  useEffect(()=>{
    if(tab==="materials") api.get("/tasks/"+task.id+"/materials").then(r=>{if(r.success)setMaterials(r.data||[]);}).catch(()=>{});
    if(tab==="labour")    api.get("/tasks/"+task.id+"/labour").then(r=>{if(r.success)setLabours(r.data||[]);}).catch(()=>{});
    if(tab==="photos")    api.get("/tasks/"+task.id+"/photos").then(r=>{if(r.success)setPhotos(r.data||[]);}).catch(()=>{});
    if(tab==="issues")    api.get("/tasks/"+task.id+"/issues").then(r=>{if(r.success)setIssues(r.data||[]);}).catch(()=>{});
    if(tab==="comments")  api.get("/tasks/"+task.id+"/comments").then(r=>{if(r.success)setComments(r.data||[]);}).catch(()=>{});
  },[tab]);

  // Auto status from progress
  const autoStatus=(p)=>{ if(p===0) return "Not Started"; if(p===100) return "Completed"; return "Ongoing"; };

  const ss={"Completed":{c:T.grn,bg:T.grnL,brd:T.grnM},"Ongoing":{c:T.blu,bg:T.bluL,brd:T.bluM},"Not Started":{c:T.slt,bg:T.sltL,brd:T.b2},"Hold":{c:T.amb,bg:T.ambL,brd:T.ambM}};
  const sm=ss[autoStatus(prog)]||ss["Not Started"];
  const delay=ptDelayDays(task);

  const UNITS=["Bag","Kg","CFT","Sq.Ft","Piece","Meter","Litre","MT","Running Ft","Nos"];
  const ROLES=["Mason","Labour","Helper","Electrician","Plumber","Carpenter","Painter","Supervisor","Other"];
  const PRIORITIES=["Low","Medium","High","Critical"];
  const ISSUE_STATUS=["Open","In Progress","Resolved","Closed"];
  const issueColors={"Open":{c:T.red,bg:T.redL},"In Progress":{c:T.blu,bg:T.bluL},"Resolved":{c:T.grn,bg:T.grnL},"Closed":{c:T.slt,bg:T.sltL}};
  const priColors={"Low":{c:T.slt,bg:T.sltL},"Medium":{c:T.amb,bg:T.ambL},"High":{c:T.red,bg:T.redL},"Critical":{c:"#7C3AED",bg:"#EDE9FE"}};

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,backdropFilter:"blur(2px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(580px,96vw)",background:T.bg,zIndex:301,boxShadow:"-8px 0 40px rgba(0,0,0,0.25)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease"}}>

      {/* ── HEADER ── */}
      <div style={{background:"#0D1B2A",padding:"14px 16px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,flexWrap:"wrap"}}>
              <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>{task.no}</span>
              <span style={{background:sm.bg,color:sm.c,fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{autoStatus(prog)}</span>
              {task.dhyanRakhen&&<span style={{background:"#FEF3C7",color:"#92400E",fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:20}}>DHYAN</span>}
              {delay>0&&<span style={{background:T.redL,color:T.red,fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{delay}d delayed</span>}
            </div>
            <div style={{fontSize:15,fontWeight:700,color:"white",lineHeight:1.3}}>{task.name}</div>
            <div style={{fontSize:10.5,color:"rgba(255,255,255,0.45)",marginTop:4}}>{task.category}{task.assignee?" · @"+task.assignee:""}{task.baseStart?" · "+task.baseStart+" → "+(task.baseEnd||"?"):""}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex",padding:4}}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        {/* Progress bar */}
        <div style={{marginTop:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>Progress</span>
            <span style={{fontSize:12,fontWeight:700,color:prog===100?T.grn:"white"}}>{prog}%</span>
          </div>
          <div style={{height:5,background:"rgba(255,255,255,0.15)",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:prog+"%",background:prog===100?T.grn:T.blu,borderRadius:3,transition:"width .3s"}}/>
          </div>
        </div>
      </div>

      {/* DHYAN banner */}
      {task.dhyanRakhen&&<div style={{padding:"8px 14px",background:"#FEF3C7",borderBottom:"1px solid #FDE68A",flexShrink:0,display:"flex",gap:7,alignItems:"flex-start"}}>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth={2} style={{marginTop:1,flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
        <div><div style={{fontSize:9.5,fontWeight:700,color:"#78350F",textTransform:"uppercase",letterSpacing:".5px",marginBottom:2}}>DHYAN RAKHEN</div><div style={{fontSize:11.5,color:"#92400E",lineHeight:1.5}}>{task.dhyanRakhen}</div></div>
      </div>}

      {/* ── TABS ── */}
      <div style={{background:T.surface,borderBottom:"1px solid "+T.b1,padding:"0 12px",flexShrink:0,display:"flex",gap:0,overflowX:"auto"}}>
        {[
          {id:"progress",l:"Progress"},
          {id:"materials",l:"Materials"},
          {id:"labour",l:"Labour"},
          {id:"photos",l:"Site Photos"},
          {id:"issues",l:"Issues"},
          {id:"comments",l:"Comments"},
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"10px 12px",border:"none",background:"none",fontSize:12.5,fontWeight:tab===t.id?700:400,color:tab===t.id?T.blu:T.t3,borderBottom:tab===t.id?"2px solid "+T.blu:"2px solid transparent",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>

        {/* ── PROGRESS ── */}
        {tab==="progress"&&(
          <div>
            <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px",marginBottom:12}}>Update Progress</div>
            <div style={{background:T.surface,borderRadius:10,padding:"18px",border:"1px solid "+T.b1,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:600,color:T.t1}}>Completion</span>
                <span style={{fontSize:20,fontWeight:800,color:prog===100?T.grn:prog>0?T.blu:T.slt}}>{prog}%</span>
              </div>
              <input type="range" min={0} max={100} step={5} value={prog} onChange={e=>setProg(Number(e.target.value))}
                style={{width:"100%",accentColor:T.blu,height:6,cursor:"pointer"}}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                <span style={{fontSize:10,color:T.t4}}>0%</span>
                <span style={{fontSize:10,color:T.t4}}>50%</span>
                <span style={{fontSize:10,color:T.t4}}>100%</span>
              </div>
            </div>
            {/* Status preview */}
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:sm.bg,border:"1.5px solid "+sm.brd,borderRadius:8,marginBottom:16}}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={sm.c} strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
              <div>
                <div style={{fontSize:11,color:sm.c,fontWeight:700}}>Status will be set to: {autoStatus(prog)}</div>
                <div style={{fontSize:10.5,color:T.t3,marginTop:1}}>
                  {prog===0?"Task not started yet":prog===100?"Task completed!":"Task in progress"}
                </div>
              </div>
            </div>
            {/* Quick buttons */}
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {[0,25,50,75,100].map(p=>(
                <button key={p} onClick={()=>setProg(p)}
                  style={{padding:"6px 14px",borderRadius:6,border:"1.5px solid "+(prog===p?T.blu:T.b1),background:prog===p?T.bluL:"white",color:prog===p?T.blu:T.t3,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                  {p}%
                </button>
              ))}
            </div>
            <button onClick={async()=>{
              setSaving(true);
              const res=await api.put("/tasks/"+task.id,{progress:prog});
              setSaving(false);
              if(res.success){onUpdate(task.id,{progress:prog,status:autoStatus(prog)});onClose();}
              else alert(res.message||"Save failed");
            }} disabled={saving}
              style={{width:"100%",padding:"12px",borderRadius:8,background:saving?"#9CA3AF":T.blu,color:"white",fontSize:14,fontWeight:700,border:"none",cursor:saving?"default":"pointer"}}>
              {saving?"Saving...":"Save Progress"}
            </button>
          </div>
        )}

        {/* ── MATERIALS ── */}
        {tab==="materials"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px"}}>Materials</div>
              <button onClick={()=>setShowMatForm(s=>!s)}
                style={{padding:"6px 14px",borderRadius:6,background:T.blu,color:"white",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {showMatForm?"Cancel":"+ Add"}
              </button>
            </div>
            {showMatForm&&(
              <div style={{background:T.surface,borderRadius:8,padding:"13px",border:"1px solid "+T.b1,marginBottom:12}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Material Name *</label>
                    <input value={matForm.material_name} onChange={e=>setMatForm(p=>({...p,material_name:e.target.value}))}
                      placeholder="e.g. OPC Cement 53 Grade"
                      style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Required Qty</label>
                    <input type="number" value={matForm.required_qty} onChange={e=>setMatForm(p=>({...p,required_qty:e.target.value}))}
                      style={{width:"100%",padding:"7px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Used Qty</label>
                    <input type="number" value={matForm.used_qty} onChange={e=>setMatForm(p=>({...p,used_qty:e.target.value}))}
                      style={{width:"100%",padding:"7px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Unit</label>
                    <select value={matForm.unit} onChange={e=>setMatForm(p=>({...p,unit:e.target.value}))}
                      style={{width:"100%",padding:"7px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:"white",outline:"none",fontFamily:"inherit"}}>
                      {UNITS.map(u=><option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Remark</label>
                    <input value={matForm.remark} onChange={e=>setMatForm(p=>({...p,remark:e.target.value}))}
                      placeholder="Optional"
                      style={{width:"100%",padding:"7px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  </div>
                </div>
                <button onClick={async()=>{
                  if(!matForm.material_name.trim()) return alert("Material name required");
                  const res=await api.post("/tasks/"+task.id+"/materials",matForm);
                  if(res.success){setMaterials(p=>[...p,res.data]);setMatForm({material_name:"",required_qty:"",used_qty:"",unit:"Bag",remark:""});setShowMatForm(false);}
                  else alert(res.message||"Failed");
                }} style={{width:"100%",padding:"9px",borderRadius:6,background:T.blu,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer"}}>Add Material</button>
              </div>
            )}
            {materials.length===0?<div style={{textAlign:"center",padding:"40px 0",color:T.t4,fontSize:13}}>No materials added yet</div>
            :materials.map((m,i)=>{
              const pct=m.required_qty>0?Math.min(100,Math.round((m.used_qty/m.required_qty)*100)):0;
              const over=m.used_qty>m.required_qty;
              return(
                <div key={m.id} style={{background:T.surface,borderRadius:8,padding:"12px 13px",border:"1px solid "+T.b1,marginBottom:8,borderLeft:"3px solid "+(over?T.red:pct===100?T.grn:T.blu)}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{m.material_name}</div>
                      <div style={{fontSize:11,color:T.t3,marginTop:2}}>Required: {m.required_qty} {m.unit} · Used: <span style={{fontWeight:700,color:over?T.red:T.grn}}>{m.used_qty} {m.unit}</span></div>
                      {m.remark&&<div style={{fontSize:11,color:T.t4,marginTop:2}}>{m.remark}</div>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:10}}>
                      <span style={{fontSize:12,fontWeight:700,color:over?T.red:pct===100?T.grn:T.blu}}>{pct}%</span>
                      <button onClick={async()=>{const r=await api.del("/tasks/"+task.id+"/materials/"+m.id);if(r.success)setMaterials(p=>p.filter(x=>x.id!==m.id));}}
                        style={{background:"none",border:"none",cursor:"pointer",color:T.red,display:"flex",padding:2}}>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                  {m.required_qty>0&&<div style={{marginTop:8,height:4,background:T.b1,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:Math.min(100,pct)+"%",background:over?T.red:pct===100?T.grn:T.blu,borderRadius:2,transition:"width .3s"}}/>
                  </div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── LABOUR ── */}
        {tab==="labour"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px"}}>Labour Entries</div>
              <button onClick={()=>setShowLabForm(s=>!s)}
                style={{padding:"6px 14px",borderRadius:6,background:T.blu,color:"white",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {showLabForm?"Cancel":"+ Add"}
              </button>
            </div>
            {showLabForm&&(
              <div style={{background:T.surface,borderRadius:8,padding:"13px",border:"1px solid "+T.b1,marginBottom:12}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div>
                    <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Labour Name *</label>
                    <input value={labForm.labour_name} onChange={e=>setLabForm(p=>({...p,labour_name:e.target.value}))}
                      placeholder="e.g. Ramesh Kumar"
                      style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Role</label>
                    <select value={labForm.role} onChange={e=>setLabForm(p=>({...p,role:e.target.value}))}
                      style={{width:"100%",padding:"7px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:"white",outline:"none",fontFamily:"inherit"}}>
                      {ROLES.map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Count</label>
                    <input type="number" min={1} value={labForm.count} onChange={e=>setLabForm(p=>({...p,count:parseInt(e.target.value)||1}))}
                      style={{width:"100%",padding:"7px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Work Date</label>
                    <input type="date" value={labForm.work_date} onChange={e=>setLabForm(p=>({...p,work_date:e.target.value}))}
                      style={{width:"100%",padding:"7px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Hours</label>
                    <input type="number" min={1} max={24} value={labForm.hours} onChange={e=>setLabForm(p=>({...p,hours:parseFloat(e.target.value)||8}))}
                      style={{width:"100%",padding:"7px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Remark</label>
                    <input value={labForm.remark} onChange={e=>setLabForm(p=>({...p,remark:e.target.value}))} placeholder="Optional"
                      style={{width:"100%",padding:"7px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  </div>
                </div>
                <button onClick={async()=>{
                  if(!labForm.labour_name.trim()) return alert("Labour name required");
                  const res=await api.post("/tasks/"+task.id+"/labour",labForm);
                  if(res.success){setLabours(p=>[res.data,...p]);setLabForm({labour_name:"",role:"Mason",count:1,work_date:new Date().toISOString().split("T")[0],hours:8,remark:""});setShowLabForm(false);}
                  else alert(res.message||"Failed");
                }} style={{width:"100%",padding:"9px",borderRadius:6,background:T.blu,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer"}}>Add Labour Entry</button>
              </div>
            )}
            {/* Summary */}
            {labours.length>0&&<div style={{display:"flex",gap:10,marginBottom:12}}>
              {[{l:"Total Workers",v:labours.reduce((s,l)=>s+(l.count||1),0),c:T.blu},{l:"Total Man-Hours",v:labours.reduce((s,l)=>s+(l.hours||8)*(l.count||1),0),c:T.grn},{l:"Entries",v:labours.length,c:T.slt}].map(s=>(
                <div key={s.l} style={{flex:1,background:T.surface,borderRadius:7,padding:"9px 11px",border:"1px solid "+T.b1,borderTop:"3px solid "+s.c,textAlign:"center"}}>
                  <div style={{fontSize:17,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:9.5,color:T.t4,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>}
            {labours.length===0?<div style={{textAlign:"center",padding:"40px 0",color:T.t4,fontSize:13}}>No labour entries yet</div>
            :labours.map(l=>(
              <div key={l.id} style={{background:T.surface,borderRadius:8,padding:"12px 13px",border:"1px solid "+T.b1,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,"+T.blu+","+T.pur+")",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:11,fontWeight:700,flexShrink:0}}>{l.labour_name.charAt(0)}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{l.labour_name}</div>
                      <div style={{fontSize:11,color:T.t3}}>{l.role} · {l.count} workers · {l.hours}h</div>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:T.t4,marginLeft:36}}>{l.work_date}{l.remark?" · "+l.remark:""}</div>
                </div>
                <button onClick={async()=>{const r=await api.del("/tasks/"+task.id+"/labour/"+l.id);if(r.success)setLabours(p=>p.filter(x=>x.id!==l.id));}}
                  style={{background:"none",border:"none",cursor:"pointer",color:T.red,display:"flex",padding:4}}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── SITE PHOTOS ── */}
        {tab==="photos"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px"}}>Site Photos</div>
              <label style={{padding:"6px 14px",borderRadius:6,background:T.blu,color:"white",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {uploading?"Uploading...":"+ Upload"}
                <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={async(e)=>{
                  const file=e.target.files[0]; if(!file) return;
                  setUploading(true);
                  // Get geolocation
                  let lat=null,lng=null;
                  if(navigator.geolocation){
                    await new Promise(resolve=>navigator.geolocation.getCurrentPosition(p=>{lat=p.coords.latitude;lng=p.coords.longitude;resolve();},resolve,{timeout:5000}));
                  }
                  // Upload to Cloudinary
                  const fd=new FormData(); fd.append("file",file); fd.append("upload_preset","gb_buildcon_drawings"); fd.append("folder","site_photos");
                  try{
                    const cr=await fetch("https://api.cloudinary.com/v1_1/dd632nqfm/image/upload",{method:"POST",body:fd});
                    const cd=await cr.json();
                    const res=await api.post("/tasks/"+task.id+"/photos",{photo_url:cd.secure_url,caption:"",lat,lng});
                    if(res.success) setPhotos(p=>[res.data,...p]);
                  }catch(e){alert("Upload failed");}
                  setUploading(false);
                }}/>
              </label>
            </div>
            {photos.length===0?<div style={{textAlign:"center",padding:"40px 0",color:T.t4,fontSize:13}}>No site photos yet — tap Upload to add</div>
            :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {photos.map(p=>(
                <div key={p.id} style={{background:T.surface,borderRadius:8,overflow:"hidden",border:"1px solid "+T.b1,position:"relative"}}>
                  <img src={p.photo_url} alt="site" style={{width:"100%",height:130,objectFit:"cover",display:"block"}}/>
                  {(p.lat||p.lng)&&<div style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.65)",borderRadius:20,padding:"3px 8px",display:"flex",alignItems:"center",gap:4}}>
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx={12} cy={10} r={3}/></svg>
                    <span style={{fontSize:9,color:"white",fontFamily:"monospace"}}>{Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)}</span>
                  </div>}
                  <div style={{padding:"7px 9px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:10.5,color:T.t3}}>{new Date(p.created_at).toLocaleDateString("en-IN")}</span>
                    <button onClick={async()=>{const r=await api.del("/tasks/"+task.id+"/photos/"+p.id);if(r.success)setPhotos(prev=>prev.filter(x=>x.id!==p.id));}}
                      style={{background:"none",border:"none",cursor:"pointer",color:T.red,display:"flex",padding:2}}>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>}
          </div>
        )}

        {/* ── ISSUES ── */}
        {tab==="issues"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px"}}>Issues ({issues.length})</div>
              <button onClick={()=>setShowIssueForm(s=>!s)}
                style={{padding:"6px 14px",borderRadius:6,background:T.red,color:"white",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {showIssueForm?"Cancel":"+ Create Issue"}
              </button>
            </div>
            {showIssueForm&&(
              <div style={{background:"#FFF5F5",borderRadius:8,padding:"13px",border:"1.5px solid "+T.redM,marginBottom:12}}>
                <div style={{marginBottom:8}}>
                  <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Issue Title *</label>
                  <input value={issueForm.title} onChange={e=>setIssueForm(p=>({...p,title:e.target.value}))}
                    placeholder="Describe the issue briefly"
                    style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid "+T.redM,fontSize:13,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <div style={{marginBottom:8}}>
                  <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Description</label>
                  <textarea value={issueForm.description} onChange={e=>setIssueForm(p=>({...p,description:e.target.value}))} rows={2} placeholder="Details..."
                    style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:13,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none"}}/>
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:9.5,fontWeight:600,color:T.t4,display:"block",marginBottom:3,textTransform:"uppercase"}}>Priority</label>
                  <div style={{display:"flex",gap:6}}>
                    {PRIORITIES.map(p=>(
                      <button key={p} onClick={()=>setIssueForm(prev=>({...prev,priority:p}))}
                        style={{padding:"5px 12px",borderRadius:6,border:"1.5px solid "+(issueForm.priority===p?priColors[p].c:T.b1),background:issueForm.priority===p?priColors[p].bg:"white",color:issueForm.priority===p?priColors[p].c:T.t3,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={async()=>{
                  if(!issueForm.title.trim()) return alert("Title required");
                  const res=await api.post("/tasks/"+task.id+"/issues",issueForm);
                  if(res.success){setIssues(p=>[res.data,...p]);setIssueForm({title:"",description:"",priority:"Medium",assigned_to:""});setShowIssueForm(false);}
                  else alert(res.message||"Failed");
                }} style={{width:"100%",padding:"9px",borderRadius:6,background:T.red,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer"}}>Create Issue</button>
              </div>
            )}
            {issues.length===0?<div style={{textAlign:"center",padding:"40px 0",color:T.t4,fontSize:13}}>No issues reported</div>
            :issues.map(issue=>{
              const ic=issueColors[issue.status]||issueColors["Open"];
              const pc=priColors[issue.priority]||priColors["Medium"];
              return(
                <div key={issue.id} style={{background:T.surface,borderRadius:8,padding:"12px 13px",border:"1px solid "+T.b1,marginBottom:8,borderLeft:"3px solid "+ic.c}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div style={{flex:1,marginRight:8}}>
                      <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:3}}>{issue.title}</div>
                      {issue.description&&<div style={{fontSize:11.5,color:T.t3,lineHeight:1.4}}>{issue.description}</div>}
                    </div>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      <span style={{background:pc.bg,color:pc.c,fontSize:9.5,fontWeight:700,padding:"2px 7px",borderRadius:20}}>{issue.priority}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    {ISSUE_STATUS.map(s=>(
                      <button key={s} onClick={async()=>{
                        const r=await api.put("/tasks/"+task.id+"/issues/"+issue.id,{status:s});
                        if(r.success) setIssues(p=>p.map(x=>x.id===issue.id?{...x,status:s}:x));
                      }}
                        style={{padding:"3px 9px",borderRadius:20,border:"1.5px solid "+(issue.status===s?issueColors[s].c:T.b1),background:issue.status===s?issueColors[s].bg:"white",color:issue.status===s?issueColors[s].c:T.t4,fontSize:10,fontWeight:issue.status===s?700:400,cursor:"pointer"}}>
                        {s}
                      </button>
                    ))}
                    <button onClick={async()=>{const r=await api.del("/tasks/"+task.id+"/issues/"+issue.id);if(r.success)setIssues(p=>p.filter(x=>x.id!==issue.id));}}
                      style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:T.red,display:"flex"}}>
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── COMMENTS ── */}
        {tab==="comments"&&(
          <div>
            <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px",marginBottom:12}}>Comments ({comments.length})</div>
            {comments.length===0&&<div style={{textAlign:"center",padding:"30px 0",color:T.t4,fontSize:13}}>No comments yet</div>}
            {comments.map(c=>(
              <div key={c.id} style={{display:"flex",gap:9,marginBottom:12}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,"+T.blu+","+T.pur+")",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"white",fontSize:11,fontWeight:700}}>
                  {(c.user_name||"?").charAt(0)}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:7,marginBottom:3}}>
                    <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{c.user_name||"User"}</span>
                    <span style={{fontSize:10.5,color:T.t4}}>{new Date(c.created_at).toLocaleDateString("en-IN")}</span>
                  </div>
                  <div style={{padding:"9px 11px",background:T.surface,borderRadius:"0 8px 8px 8px",border:"1px solid "+T.b1,fontSize:12.5,color:T.t2,lineHeight:1.5}}>{c.text}</div>
                </div>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <input value={commentText} onChange={e=>setCommentText(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={async e=>{if(e.key==="Enter"&&commentText.trim()){const r=await api.post("/tasks/"+task.id+"/comments",{text:commentText});if(r.success){setComments(p=>[...p,r.data]);setCommentText("");}}}
                }
                style={{flex:1,padding:"9px 11px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
              <button onClick={async()=>{
                if(!commentText.trim()) return;
                const r=await api.post("/tasks/"+task.id+"/comments",{text:commentText});
                if(r.success){setComments(p=>[...p,r.data]);setCommentText("");}
              }} style={{padding:"9px 14px",borderRadius:7,background:T.blu,color:"white",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>Send</button>
            </div>
          </div>
        )}

      </div>
    </div>
  </>);
}

function PTEditTask({task,allTasks,onClose,onSave}){
  const [form,setForm]=useState({name:task.name,category:task.category,tag:task.tag||"",assignee:task.assignee,status:task.status,progress:task.progress,baseStart:task.baseStart||"",baseEnd:task.baseEnd||"",dependencies:[...(task.dependencies||[])],dhyanRakhen:task.dhyanRakhen||""});
  const [showDhyan,setShowDhyan]=useState(!!task.dhyanRakhen);
  const [depSrch,setDepSrch]=useState("");
  const upd=(k)=>(e)=>setForm(p=>({...p,[k]:e.target.type==="range"?Number(e.target.value):e.target.value}));
  const toggleDep=(id)=>setForm(p=>({...p,dependencies:p.dependencies.includes(id)?p.dependencies.filter(x=>x!==id):[...p.dependencies,id]}));
  const filteredForDep=allTasks.filter(t=>t.id!==task.id&&(!depSrch||t.name.toLowerCase().includes(depSrch.toLowerCase())||t.no.includes(depSrch)));
  const TEAM_PT=["Vijay Sahu","Niranjan","Harsh Sahu","Priyanka","Ramesh"];
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:350,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(480px,95vw)",background:T.bg,zIndex:351,boxShadow:"-6px 0 32px rgba(0,0,0,0.2)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease"}}>
      <div style={{background:"#0D1B2A",padding:"12px 16px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontSize:13,fontWeight:700,color:"white"}}>Edit Task</div><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"monospace",marginTop:1}}>{task.no} — {task.name.slice(0,30)}</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"13px 16px"}}>
        {/* Name */}
        <div style={{marginBottom:10}}><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Task Name</label>
          <input value={form.name} onChange={upd("name")} style={{width:"100%",padding:"8px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/></div>
        {/* Category + Tag */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
          {[{l:"Category",k:"category",type:"select",opts:["Civil","Electrical","Plumbing","Finishing","Custom"]},{l:"Tag",k:"tag",type:"input",ph:"e.g. critical"}].map(f=>(
            <div key={f.k}><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{f.l}</label>
              {f.type==="select"?<select value={form[f.k]} onChange={upd(f.k)} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>{f.opts.map(o=><option key={o}>{o}</option>)}</select>
              :<input value={form[f.k]} onChange={upd(f.k)} placeholder={f.ph} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>}
            </div>
          ))}
        </div>
        {/* Assignee + Status */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
          {[{l:"Assigned To",k:"assignee",opts:TEAM_PT},{l:"Status",k:"status",opts:["Not Started","Ongoing","Hold","Completed"]}].map(f=>(
            <div key={f.k}><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{f.l}</label>
              <select value={form[f.k]} onChange={upd(f.k)} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>{f.opts.map(o=><option key={o}>{o}</option>)}</select>
            </div>
          ))}
        </div>
        {/* Progress */}
        <div style={{marginBottom:10}}><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:5}}>Progress — {form.progress}%</label>
          <div style={{display:"flex",gap:9,alignItems:"center"}}>
            <input type="range" min={0} max={100} step={5} value={form.progress} onChange={upd("progress")} style={{flex:1,accentColor:T.blu}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.blu,minWidth:32,textAlign:"right"}}>{form.progress}%</span>
          </div>
          <div style={{height:4,background:T.b1,borderRadius:2,overflow:"hidden",marginTop:4}}><div style={{height:"100%",width:`${form.progress}%`,background:Number(form.progress)===100?T.grn:T.blu,borderRadius:2,transition:"width .3s"}}/></div>
        </div>
        {/* Dates */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
          {[["Baseline Start","baseStart"],["Baseline End","baseEnd"]].map(([l,k])=>(
            <div key={k}><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{l}</label>
              <input type="date" value={form[k]} onChange={upd(k)} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/></div>
          ))}
        </div>
        {/* Dependencies with search */}
        <div style={{marginBottom:10}}>
          <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:5}}>
            Dependencies {form.dependencies.length>0&&<span style={{marginLeft:5,background:T.blu,color:"white",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:10}}>{form.dependencies.length}</span>}
          </label>
          {/* Search box */}
          <div style={{position:"relative",marginBottom:5}}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
            <input value={depSrch} onChange={e=>setDepSrch(e.target.value)} placeholder="Search task to link as dependency..."
              style={{width:"100%",height:30,padding:"0 8px 0 25px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
              onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            {depSrch&&<button onClick={()=>setDepSrch("")} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.t4,display:"flex"}}><svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg></button>}
          </div>
          <div style={{background:T.surfaceB,borderRadius:6,border:`1px solid ${T.b1}`,padding:"7px 9px",maxHeight:130,overflowY:"auto"}}>
            {filteredForDep.length===0?<div style={{fontSize:11,color:T.t4,textAlign:"center",padding:"6px 0"}}>No tasks match "{depSrch}"</div>
            :filteredForDep.map(t=>{
              const sel=form.dependencies.includes(t.id);
              return(<button key={t.id} onClick={()=>toggleDep(t.id)}
                style={{display:"inline-flex",alignItems:"center",gap:4,margin:"2px 2px",padding:"3px 8px",borderRadius:5,background:sel?T.blu:T.surface,color:sel?"white":T.t3,border:`1px solid ${sel?T.blu:T.b1}`,fontSize:11,fontWeight:sel?600:400,cursor:"pointer",transition:"all .1s"}}>
                {sel&&<svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>}
                <span style={{opacity:.6,fontSize:9,fontFamily:"monospace"}}>{t.no}</span>{t.name.slice(0,20)}{t.name.length>20?"…":""}
              </button>);
            })}
          </div>
          {form.dependencies.length>0&&<div style={{marginTop:5,display:"flex",flexWrap:"wrap",gap:4}}>
            {form.dependencies.map(depId=>{const dt=allTasks.find(t=>t.id===depId);if(!dt)return null;
              return(<div key={depId} style={{display:"flex",alignItems:"center",gap:4,background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:5,padding:"2px 7px"}}>
                <span style={{fontSize:11,color:T.blu,fontWeight:600}}>{dt.no}</span>
                <button onClick={()=>toggleDep(depId)} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,display:"flex",padding:0}}>
                  <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke={T.blu} strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>);
            })}
          </div>}
        </div>
        {/* DHYAN RAKHEN */}
        <div style={{padding:"9px 11px",background:showDhyan?"#FEF3C7":T.surfaceB,border:`1px solid ${showDhyan?"#FDE68A":T.b1}`,borderRadius:7}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:showDhyan?8:0}}>
            <span style={{fontSize:12,fontWeight:600,color:showDhyan?"#92400E":T.t2}}>DHYAN RAKHEN Alert</span>
            <button onClick={()=>{setShowDhyan(s=>!s);if(showDhyan)setForm(p=>({...p,dhyanRakhen:""}));}}
              style={{width:34,height:18,borderRadius:18,background:showDhyan?"#F59E0B":T.b2,border:"none",cursor:"pointer",position:"relative",transition:"background .2s"}}>
              <div style={{width:13,height:13,borderRadius:"50%",background:"white",position:"absolute",top:2.5,left:showDhyan?17:3,transition:"left .2s"}}/>
            </button>
          </div>
          {showDhyan&&<textarea value={form.dhyanRakhen} onChange={upd("dhyanRakhen")} placeholder="Important alert shown as popup when task is opened..." rows={3}
            style={{width:"100%",padding:"7px 9px",borderRadius:5,border:"1.5px solid #FDE68A",fontSize:12.5,color:"#92400E",background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>}
        </div>
      </div>
      <div style={{padding:"11px 16px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:7,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:6,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>onSave(task.id,{...form,dhyanRakhen:showDhyan?form.dhyanRakhen:null,progress:Number(form.progress)})}
          style={{flex:2,padding:"9px",borderRadius:6,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>Save Changes</button>
      </div>
    </div>
  </>);
}

// ── PT Add Task ───────────────────────────────────────────────────
function PTAddTask({parent,allTasks,onClose,onSave}){
  const [form,setForm]=useState({name:"",category:"Civil",tag:"",assignee:"Vijay Sahu",baseStart:"",baseEnd:"",dependencies:[],dhyanRakhen:""});
  const [showDhyan,setShowDhyan]=useState(false);
  const [depSrch,setDepSrch]=useState("");
  const upd=(k)=>(e)=>setForm(p=>({...p,[k]:e.target.value}));
  const toggleDep=(id)=>setForm(p=>({...p,dependencies:p.dependencies.includes(id)?p.dependencies.filter(x=>x!==id):[...p.dependencies,id]}));
  const filteredForDep=allTasks.filter(t=>!depSrch||t.name.toLowerCase().includes(depSrch.toLowerCase())||t.no.includes(depSrch));
  const TEAM_PT=["Vijay Sahu","Niranjan","Harsh Sahu","Priyanka","Ramesh"];
  const dur=form.baseStart&&form.baseEnd?Math.round((new Date(form.baseEnd)-new Date(form.baseStart))/(1000*86400)):0;
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,width:"min(480px,95vw)",maxHeight:"90vh",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:"#0D1B2A",padding:"12px 16px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontSize:13,fontWeight:700,color:"white"}}>{parent?`Add subtask under "${parent.name.slice(0,25)}"`: "Add New Task"}</div>{parent&&<div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:1}}>Level {parent.level+1} task</div>}</div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"13px 16px"}}>
        <div style={{marginBottom:10}}><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Task Name *</label>
          <input value={form.name} onChange={upd("name")} placeholder="e.g. RCC Foundation Casting" style={{width:"100%",padding:"8px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
          {[{l:"Category",k:"category",type:"select",opts:["Civil","Electrical","Plumbing","Finishing","Custom"]},{l:"Tag",k:"tag",type:"input",ph:"e.g. critical"},{l:"Assigned To",k:"assignee",type:"select",opts:TEAM_PT}].map(f=>(
            <div key={f.k}><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{f.l}</label>
              {f.type==="select"?<select value={form[f.k]} onChange={upd(f.k)} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>{f.opts.map(o=><option key={o}>{o}</option>)}</select>
              :<input value={form[f.k]} onChange={upd(f.k)} placeholder={f.ph} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>}
            </div>
          ))}
          <div><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Baseline Start</label>
            <input type="date" value={form.baseStart} onChange={upd("baseStart")} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/></div>
          <div><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Baseline End</label>
            <input type="date" value={form.baseEnd} onChange={upd("baseEnd")} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/></div>
        </div>
        {dur>0&&<div style={{fontSize:11,color:T.blu,fontWeight:600,marginBottom:10,padding:"3px 9px",background:T.bluL,borderRadius:5,display:"inline-block"}}>Duration: {dur} days</div>}
        {/* Dependencies with search */}
        <div style={{marginBottom:10}}>
          <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:5}}>Dependencies {form.dependencies.length>0&&<span style={{marginLeft:5,background:T.blu,color:"white",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:10}}>{form.dependencies.length}</span>}</label>
          <div style={{position:"relative",marginBottom:5}}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
            <input value={depSrch} onChange={e=>setDepSrch(e.target.value)} placeholder="Search task to link..."
              style={{width:"100%",height:28,padding:"0 8px 0 24px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
              onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
          </div>
          <div style={{background:T.surfaceB,borderRadius:6,border:`1px solid ${T.b1}`,padding:"6px 8px",maxHeight:110,overflowY:"auto"}}>
            {filteredForDep.map(t=>{const sel=form.dependencies.includes(t.id);return(
              <button key={t.id} onClick={()=>toggleDep(t.id)}
                style={{display:"inline-flex",alignItems:"center",gap:4,margin:"2px",padding:"3px 8px",borderRadius:5,background:sel?T.blu:T.surface,color:sel?"white":T.t3,border:`1px solid ${sel?T.blu:T.b1}`,fontSize:11,fontWeight:sel?600:400,cursor:"pointer"}}>
                {sel&&<svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>}
                <span style={{opacity:.6,fontSize:9,fontFamily:"monospace"}}>{t.no}</span>{t.name.slice(0,20)}{t.name.length>20?"…":""}
              </button>
            );})}
          </div>
        </div>
        {/* DHYAN RAKHEN */}
        <div style={{padding:"9px 11px",background:showDhyan?"#FEF3C7":T.surfaceB,border:`1px solid ${showDhyan?"#FDE68A":T.b1}`,borderRadius:7}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:12,fontWeight:600,color:showDhyan?"#92400E":T.t2}}>Add DHYAN RAKHEN Alert</span>
            <button onClick={()=>setShowDhyan(s=>!s)} style={{width:34,height:18,borderRadius:18,background:showDhyan?"#F59E0B":T.b2,border:"none",cursor:"pointer",position:"relative",transition:"background .2s"}}>
              <div style={{width:13,height:13,borderRadius:"50%",background:"white",position:"absolute",top:2.5,left:showDhyan?17:3,transition:"left .2s"}}/>
            </button>
          </div>
          {showDhyan&&<textarea value={form.dhyanRakhen} onChange={upd("dhyanRakhen")} placeholder="Important instruction for this task..." rows={3}
            style={{width:"100%",marginTop:7,padding:"7px 9px",borderRadius:5,border:"1.5px solid #FDE68A",fontSize:12.5,color:"#92400E",background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>}
        </div>
      </div>
      <div style={{padding:"11px 16px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:7,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:6,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>{if(form.name.trim())onSave({...form,dhyanRakhen:showDhyan?form.dhyanRakhen:null});}} disabled={!form.name.trim()}
          style={{flex:2,padding:"9px",borderRadius:6,background:form.name.trim()?T.blu:T.b1,color:form.name.trim()?"white":T.t4,fontSize:12,fontWeight:700,border:"none",cursor:form.name.trim()?"pointer":"not-allowed"}}>Add Task</button>
      </div>
    </div>
  </>);
}

// ═══════════════════════════════════════════════════════════════════
// TAB 8 — ATTENDANCE
// ═══════════════════════════════════════════════════════════════════
function TabAttendance() {
  const SUBCONS_LIST=["Ramesh Labour Cont.","Rajesh Electrical","New Subcontractor..."];
  const [selDate,  setSelDate]  = useState(D.attendance[0].date);
  const [editMode, setEditMode] = useState(false);
  const [attMode,  setAttMode]  = useState("named"); // named | count
  const [attendance,setAttendance]=useState(D.attendance);
  // Count mode state
  const [countForm,setCountForm]=useState({subcon:"Ramesh Labour Cont.",present:0,total:0,dailyRate:600,note:""});
  const [newSubcon,setNewSubcon]=useState("");
  const [showSubconField,setShowSubconField]=useState(false);
  // Add labour modal
  const [showAddLabour,setShowAddLabour]=useState(false);
  const [newLabour,setNewLabour]=useState({name:"",role:"Labour",subcon:"Ramesh Labour Cont.",dailyRate:600});

  const entry=attendance.find(a=>a.date===selDate)||attendance[0];
  const present=entry.workers.filter(w=>w.present).length;
  const totalHrs=entry.workers.reduce((s,w)=>s+w.hours,0);
  const totalWages=entry.workers.filter(w=>w.present).reduce((s,w)=>s+(w.dailyRate||600),0);

  const toggleWorker=(name)=>{
    setAttendance(prev=>prev.map(a=>a.date===selDate?{...a,workers:a.workers.map(w=>w.name===name?{...w,present:!w.present,hours:!w.present?8:0}:w)}:a));
  };
  const updateHours=(name,hrs)=>{
    setAttendance(prev=>prev.map(a=>a.date===selDate?{...a,workers:a.workers.map(w=>w.name===name?{...w,hours:Number(hrs)}:w)}:a));
  };
  const addLabour=()=>{
    if(!newLabour.name.trim()) return;
    setAttendance(prev=>prev.map(a=>({...a,workers:[...a.workers,{name:newLabour.name,role:newLabour.role,present:true,hours:8,subcon:newLabour.subcon,dailyRate:Number(newLabour.dailyRate)}]})));
    setNewLabour({name:"",role:"Labour",subcon:"Ramesh Labour Cont.",dailyRate:600});
    setShowAddLabour(false);
  };

  // Group by subcon for named view
  const bySubcon={};
  entry.workers.forEach(w=>{
    const key=w.subcon||"Direct Labour";
    if(!bySubcon[key]) bySubcon[key]=[];
    bySubcon[key].push(w);
  });

  return(
    <div style={{padding:"14px 18px"}}>
      {/* Date filter + mode toggle + actions */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <FilterTabs options={attendance.map(a=>({id:a.date,label:`${a.date} (${a.day})`}))} active={selDate} onChange={setSelDate}/>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          {/* Mode toggle */}
          <div style={{display:"flex",background:T.bg,borderRadius:6,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            {[{id:"named",label:"By Name"},{id:"count",label:"By Count"}].map(m=>(
              <button key={m.id} onClick={()=>setAttMode(m.id)}
                style={{padding:"5px 11px",border:"none",background:attMode===m.id?T.blu:"none",color:attMode===m.id?"white":T.t3,cursor:"pointer",fontSize:11.5,fontWeight:attMode===m.id?600:400,transition:"all .15s"}}>
                {m.label}
              </button>
            ))}
          </div>
          {attMode==="named"&&<>
            <button onClick={()=>setEditMode(!editMode)}
              style={{padding:"5px 12px",borderRadius:6,border:`1.5px solid ${editMode?T.blu:T.b1}`,background:editMode?T.bluL:T.surface,color:editMode?T.blu:T.t3,fontSize:11.5,fontWeight:editMode?700:500,cursor:"pointer"}}>
              {editMode?"Done":"Edit"}
            </button>
            <AddBtn label="Add Labour" onClick={()=>setShowAddLabour(true)}/>
          </>}
          <AddBtn label="Mark Attendance"/>
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
        {[
          {l:"Present",      v:present,              c:T.grn},
          {l:"Absent",       v:entry.workers.length-present, c:T.red},
          {l:"Total Labour", v:entry.workers.length,  c:T.slt},
          {l:"Total Hours",  v:`${totalHrs}h`,         c:T.blu},
          {l:"Daily Wages",  v:`₹${fmtN(totalWages)}`, c:T.amb},
        ].map((s,i)=>(
          <div key={i} style={{padding:"10px 13px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:4}}>{s.l}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* ── BY NAME VIEW ── */}
      {attMode==="named"&&(
        <>
          {Object.entries(bySubcon).map(([subcon,workers])=>{
            const scPresent=workers.filter(w=>w.present).length;
            const scWages=workers.filter(w=>w.present).reduce((s,w)=>s+(w.dailyRate||600),0);
            return(
              <div key={subcon} style={{marginBottom:12}}>
                {/* Subcon header */}
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 13px",background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:"8px 8px 0 0",borderBottom:"none"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:T.blu,flexShrink:0}}/>
                  <span style={{fontSize:12.5,fontWeight:700,color:T.t1,flex:1}}>{subcon}</span>
                  <span style={{fontSize:11.5,color:T.grn,fontWeight:600}}>{scPresent}/{workers.length} present</span>
                  <span style={{fontSize:11.5,color:T.amb,fontWeight:600}}>₹{fmtN(scWages)}</span>
                </div>
                <Panel style={{borderRadius:"0 0 8px 8px"}}>
                  <THead cols="1fr 90px 100px 100px 80px 80px" headers={["Worker","Role","Status","Hours","OT","Daily Rate"]}/>
                  {workers.map((w,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 90px 100px 100px 80px 80px",padding:"9px 15px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",borderLeft:`3px solid ${w.present?T.grn:T.red}44`,transition:"background .1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{w.name}</span>
                      <span style={{fontSize:12,color:T.t2}}>{w.role}</span>
                      {editMode
                        ?<button onClick={()=>toggleWorker(w.name)} style={{padding:"3px 9px",borderRadius:20,border:`1px solid ${w.present?T.grnM:T.redM}`,background:w.present?T.grnL:T.redL,color:w.present?T.grn:T.red,fontSize:11,fontWeight:600,cursor:"pointer"}}>{w.present?"Present":"Absent"}</button>
                        :<Pill label={w.present?"Present":"Absent"} c={w.present?T.grn:T.red} bg={w.present?T.grnL:T.redL}/>
                      }
                      {editMode
                        ?<input type="number" value={w.hours} onChange={e=>updateHours(w.name,e.target.value)} min={0} max={14}
                            style={{width:56,height:27,padding:"0 7px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                        :<span style={{fontSize:12.5,color:w.present?T.t1:T.t4}}>{w.hours>0?`${w.hours}h`:"—"}</span>
                      }
                      <span style={{fontSize:12,color:T.t4}}>{w.hours>8?`${w.hours-8}h`:"—"}</span>
                      <span style={{fontSize:12,color:T.t2}}>₹{w.dailyRate||600}</span>
                    </div>
                  ))}
                </Panel>
              </div>
            );
          })}
        </>
      )}

      {/* ── BY COUNT VIEW ── */}
      {attMode==="count"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {/* Count form */}
          <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,padding:"14px 16px"}}>
            <div style={{fontSize:12,fontWeight:700,color:T.t1,marginBottom:12}}>Mark by Count</div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>Subcontractor</div>
              <select value={countForm.subcon} onChange={e=>{if(e.target.value==="New Subcontractor..."){setShowSubconField(true);}else{setCountForm(p=>({...p,subcon:e.target.value}));setShowSubconField(false);}}}
                style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
                {SUBCONS_LIST.map(s=><option key={s}>{s}</option>)}
              </select>
              {showSubconField&&(
                <div style={{display:"flex",gap:7,marginTop:8}}>
                  <input value={newSubcon} onChange={e=>setNewSubcon(e.target.value)} placeholder="Enter new subcontractor name..."
                    style={{flex:1,padding:"7px 10px",borderRadius:7,border:`1.5px solid ${T.blu}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}/>
                  <button onClick={()=>{if(newSubcon.trim()){setCountForm(p=>({...p,subcon:newSubcon.trim()}));setShowSubconField(false);setNewSubcon("");}}}
                    style={{padding:"7px 12px",borderRadius:7,background:T.blu,color:"white",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>Add</button>
                </div>
              )}
            </div>
            {[
              {label:"Labour Present (count)",key:"present",type:"number",placeholder:"e.g. 8"},
              {label:"Total Labour (count)",  key:"total",  type:"number",placeholder:"e.g. 10"},
              {label:"Daily Rate per Labour (₹)",key:"dailyRate",type:"number",placeholder:"e.g. 600"},
              {label:"Notes",key:"note",type:"text",placeholder:"Optional work note..."},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>{f.label}</div>
                <input type={f.type} value={countForm[f.key]} onChange={e=>setCountForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
                  style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
              </div>
            ))}
            <button style={{width:"100%",padding:"9px",borderRadius:7,background:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",marginTop:4}}>
              Save Attendance
            </button>
          </div>

          {/* Summary card */}
          <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,padding:"14px 16px"}}>
            <div style={{fontSize:12,fontWeight:700,color:T.t1,marginBottom:12}}>Today's Summary</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              {[
                {l:"Present",v:countForm.present||0,c:T.grn},
                {l:"Absent", v:Math.max(0,(Number(countForm.total)||0)-(Number(countForm.present)||0)),c:T.red},
                {l:"Total",  v:countForm.total||0,  c:T.slt},
                {l:"Wages",  v:`₹${fmtN((Number(countForm.present)||0)*(Number(countForm.dailyRate)||600))}`,c:T.amb},
              ].map((s,i)=>(
                <div key={i} style={{padding:"10px",background:T.surfaceB,borderRadius:7,borderLeft:`3px solid ${s.c}`,textAlign:"center"}}>
                  <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,color:T.t4,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
            {countForm.subcon&&(
              <div style={{padding:"9px 12px",background:T.bluL,borderRadius:7,border:`1px solid ${T.bluM}`,marginBottom:10}}>
                <div style={{fontSize:11,color:T.t4,marginBottom:2}}>Subcontractor</div>
                <div style={{fontSize:13,fontWeight:600,color:T.blu}}>{countForm.subcon}</div>
              </div>
            )}
            {countForm.note&&(
              <div style={{padding:"8px 12px",background:T.ambL,borderRadius:6,border:`1px solid ${T.ambM}`,fontSize:12,color:T.amb,borderLeft:`3px solid ${T.amb}`}}>
                {countForm.note}
              </div>
            )}
            {/* Attendance % bar */}
            {countForm.total>0&&(
              <div style={{marginTop:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,color:T.t3}}>Attendance Rate</span>
                  <span style={{fontSize:12,fontWeight:700,color:T.grn}}>{Math.round((Number(countForm.present)/Number(countForm.total))*100)||0}%</span>
                </div>
                <div style={{height:6,background:T.b1,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.min(Math.round((Number(countForm.present)/Number(countForm.total))*100)||0,100)}%`,background:T.grn,borderRadius:3}}/>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Labour Modal */}
      {showAddLabour&&(<>
        <div onClick={()=>setShowAddLabour(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:300}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",zIndex:301,width:380,fontFamily:"'Segoe UI',sans-serif",overflow:"hidden"}}>
          <div style={{background:"#0D1B2A",padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Add Labour to Project</div>
            <button onClick={()=>setShowAddLabour(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{padding:"14px 16px"}}>
            {[
              {l:"Name",key:"name",type:"text",ph:"Labour / Worker name"},
              {l:"Role",key:"role",type:"select",opts:["Labour","Helper","Mason","Carpenter","Electrician","Plumber","Supervisor"]},
              {l:"Subcontractor",key:"subcon",type:"select",opts:SUBCONS_LIST.filter(s=>s!=="New Subcontractor...")},
              {l:"Daily Rate (₹)",key:"dailyRate",type:"number",ph:"e.g. 600"},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:11}}>
                <div style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>{f.l}</div>
                {f.type==="select"
                  ?<select value={newLabour[f.key]} onChange={e=>setNewLabour(p=>({...p,[f.key]:e.target.value}))}
                      style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
                      {f.opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                  :<input type={f.type} value={newLabour[f.key]} onChange={e=>setNewLabour(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph}
                      style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                      onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                }
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button onClick={()=>setShowAddLabour(false)} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
              <button onClick={addLabour} style={{flex:2,padding:"9px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>Add to Project</button>
            </div>
          </div>
        </div>
      </>)}

      {entry.note&&<div style={{marginTop:10,padding:"8px 13px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:6,fontSize:12.5,color:T.amb,borderLeft:`3px solid ${T.amb}`}}>Note: {entry.note}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 9 — MATERIAL (Site Stock)
// ═══════════════════════════════════════════════════════════════════
function TabMaterial({ project }) {
  const projectId   = project?.id || 1;
  const projectName = project?.name || "Project";

  const [materials, setMaterials] = useState([]);
  const [fStage,    setFStage]    = useState("All");
  const [fMaterial, setFMaterial] = useState("All");
  const [search,    setSearch]    = useState("");
  const [viewMode,  setViewMode]  = useState("tile");
  const [showModal,  setShowModal]  = useState(false);
  const [showGRN,    setShowGRN]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState({ item_name:"", quantity:"", unit:"Bags", required_date:"", approx_amount:"", notes:"" });

  // GRN state
  const [grnTab,     setGrnTab]     = useState("ordered"); // "ordered" | "direct"
  const [orderedMRs, setOrderedMRs] = useState([]);
  const [grnRows,    setGrnRows]    = useState({});    // {mrId: {challan, received_qty}}
  const [directRows, setDirectRows] = useState([{id:1, item_name:"", qty:"", unit:"Bags", vendor:"", challan:""}]);
  const [grnSaving,  setGrnSaving]  = useState(false);
  const [grnDone,    setGrnDone]    = useState([]);   // successfully received mr ids

  const UNITS_MR = ["Bags","MT","Nos","Loads","Sqft","Mtrs","Kg","Sheets","Ltrs","Cu.m","Ton","RFT","Brass"];
  const MAT_LIB  = ["TMT Steel Fe500 8mm","TMT Steel Fe500 10mm","TMT Steel Fe500 12mm",
    "OPC 53 Cement","OPC 43 Cement","PPC Cement",
    "River Sand","M-Sand","P-Sand","20mm Aggregate","10mm Aggregate",
    "Red Brick 9x4x3","Fly Ash Brick","AAC Block 4\"",
    "Vitrified Tile 600x600","Vitrified Tile 800x800","Anti-Skid Tile",
    "PVC Pipe 1\"","PVC Pipe 2\"","FR Wiring 1.5mm","FR Wiring 2.5mm",
    "Plywood 18mm","Plywood 12mm","GI Sheet",
    "Asian Paints Apex","Putty","Primer","Distemper",
    "Binding Wire","Diesel","Safety Helmet","Centering Plate"];

  // Load ordered MRs for GRN
  useEffect(() => {
    if (!showGRN || !projectId) return;
    api.get("/procurement/mrs?project_id=" + projectId + "&stage=Ordered")
      .then(res => {
        if (res.success) setOrderedMRs(res.data||[]);
      }).catch(()=>{});
  }, [showGRN, projectId]);

  useEffect(() => {
    if (!projectId) return;
    api.get("/procurement/mrs?project_id=" + projectId)
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setMaterials(res.data.map(m => ({
            id:     m.id,
            name:   m.item_name,
            qty:    (parseFloat(m.quantity)||0) + " " + (m.unit||""),
            stage:  m.stage || "Requested",
            by:     m.requested_by || "Site Team",
            date:   m.created_at ? new Date(m.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) : "—",
            vendor: m.linked_vendor || null,
            amt:    parseFloat(m.approx_amount) || 0,
          })));
        } else {
          setMaterials([]); // empty — no dummy fallback
        }
      })
      .catch(() => setMaterials([]));
  }, [projectId]);

  // ── GRN Handlers ──────────────────────────────────────────
  const handleReceiveMR = async (mrId) => {
    const row = grnRows[mrId] || {};
    if (!row.challan) { alert("Challan number required"); return; }
    setGrnSaving(true);
    try {
      const mr = orderedMRs.find(m => m.id === mrId);
      const res = await api.patch("/procurement/mrs/" + mrId + "/mark-received", {
        challan_no:   row.challan,
        received_qty: parseFloat(row.received_qty) || parseFloat(mr?.quantity) || 0,
      });
      if (res.success) {
        setGrnDone(p => [...p, mrId]);
        setMaterials(prev => prev.map(m =>
          m.id === mrId ? { ...m, stage: "Received" } : m
        ));
      } else {
        alert(res.message || "Failed");
      }
    } catch(e) { alert(e.message); }
    setGrnSaving(false);
  };

  const handleDirectReceive = async () => {
    const validRows = directRows.filter(r => r.item_name && r.qty && r.challan);
    if (!validRows.length) { alert("Item name, qty aur challan required hai"); return; }
    setGrnSaving(true);
    try {
      // Create GRN entry directly
      const res = await api.post("/procurement/grns", {
        po_id:         null,
        vendor_name:   validRows[0].vendor || null,
        project_id:    projectId,
        project_name:  projectName,
        challan_no:    validRows[0].challan,
        received_date: new Date().toISOString().split("T")[0],
        items: validRows.map(r => ({
          po_item_id:   null,
          description:  r.item_name,
          ordered_qty:  parseFloat(r.qty),
          received_qty: parseFloat(r.qty),
          unit:         r.unit || "Bags",
        })),
      });
      if (res.success) {
        alert("GRN created: " + res.grn_number);
        setShowGRN(false);
        setDirectRows([{id:1, item_name:"", qty:"", unit:"Bags", vendor:"", challan:""}]);
      } else {
        alert(res.message || "GRN failed");
      }
    } catch(e) { alert(e.message); }
    setGrnSaving(false);
  };

  const handleSubmit = async () => {
    if (!form.item_name || !form.quantity) return;
    setSaving(true);
    try {
      const res = await api.post("/procurement/mrs", {
        project_id:    projectId,
        project_name:  projectName,
        item_name:     form.item_name,
        quantity:      parseFloat(form.quantity),
        unit:          form.unit,
        required_date: form.required_date || null,
        approx_amount: form.approx_amount ? parseFloat(form.approx_amount) : null,
        notes:         form.notes || null,
        requested_by:  "Site Team",
      });
      if (res.success) {
        const m = res.data;
        setMaterials(prev => [{
          id:     m.id,
          name:   m.item_name,
          qty:    m.quantity + " " + m.unit,
          stage:  "Requested",
          by:     "Site Team",
          date:   new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
          vendor: null,
          amt:    parseFloat(m.approx_amount) || 0,
        }, ...prev]);
        setForm({ item_name:"", quantity:"", unit:"Bags", required_date:"", approx_amount:"", notes:"" });
        setShowModal(false);
      }
    } catch(e) { alert("Error: " + e.message); }
    finally { setSaving(false); }
  };

  const MATERIAL_NAMES = ["All", ...[...new Set(materials.map(m => m.name))]];
  const filtered = materials.filter(m => {
    if (fStage !== "All" && m.stage !== fStage) return false;
    if (fMaterial !== "All" && m.name !== fMaterial) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const stageData = STAGES.map(s => ({ stage:s, ...STAGE_S[s], count: materials.filter(m=>m.stage===s).length }));
  const totalAmt = filtered.reduce((s,m) => s + (m.amt||0), 0);
  const activeFilters = (fStage!=="All"?1:0) + (fMaterial!=="All"?1:0) + (search?1:0);

  return (
    <div style={{padding:"14px 18px"}}>

      {/* NEW REQUEST MODAL */}
      {showModal && (<>
        <div onClick={()=>setShowModal(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.32)",zIndex:400,backdropFilter:"blur(2px)"}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:10,boxShadow:"0 20px 60px rgba(0,0,0,0.18)",zIndex:401,width:440,fontFamily:"'Segoe UI',sans-serif",overflow:"hidden"}}>
          <div style={{background:"#0D1B2A",padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>New Material Request</div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.45)",marginTop:1}}>{projectName}</div>
            </div>
            <button onClick={()=>setShowModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:20,lineHeight:1}}>x</button>
          </div>
          <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:T.ambL,border:"1px solid " + T.ambM,borderRadius:7,padding:"8px 11px",fontSize:11.5,color:T.amb}}>
              Request Procurement mein jayegi — Admin approve karenge phir order hoga
            </div>
            <div>
              <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Material Name *</label>
              <input value={form.item_name} onChange={e=>setForm(p=>({...p,item_name:e.target.value}))} placeholder="e.g. Cement OPC 50kg..."
                style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid " + T.b1,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Quantity *</label>
                <input type="number" value={form.quantity} onChange={e=>setForm(p=>({...p,quantity:e.target.value}))} placeholder="200"
                  style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid " + T.b1,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div>
                <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Unit</label>
                <select value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))}
                  style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid " + T.b1,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
                  {UNITS_MR.map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Required By</label>
                <input type="date" value={form.required_date} onChange={e=>setForm(p=>({...p,required_date:e.target.value}))}
                  style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid " + T.b1,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div>
                <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Approx. Amount</label>
                <input type="number" value={form.approx_amount} onChange={e=>setForm(p=>({...p,approx_amount:e.target.value}))} placeholder="76000"
                  style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid " + T.b1,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
            </div>
            <div>
              <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Notes</label>
              <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Special requirements..."
                style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid " + T.b1,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
            </div>
          </div>
          <div style={{padding:"11px 16px",borderTop:"1px solid " + T.b1,background:T.surfaceB,display:"flex",gap:8}}>
            <button onClick={()=>setShowModal(false)} style={{flex:1,padding:"8px",borderRadius:7,background:T.surface,border:"1px solid " + T.b1,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving||!form.item_name||!form.quantity}
              style={{flex:2,padding:"8px",borderRadius:7,background:(saving||!form.item_name||!form.quantity)?T.b1:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:(saving||!form.item_name||!form.quantity)?"not-allowed":"pointer"}}>
              {saving?"Saving...":"Submit Request"}
            </button>
          </div>
        </div>
      </>)}

      {/* Stage pipeline tiles */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(" + STAGES.length + ",1fr)",gap:8,marginBottom:12}}>
        {stageData.map((s,i)=>{
          const isA=fStage===s.stage;
          return(
            <div key={s.stage} onClick={()=>setFStage(isA?"All":s.stage)}
              style={{padding:"9px 12px",background:isA?s.bg:T.surface,border:"1.5px solid " + (isA?s.c:T.b1),borderRadius:8,borderTop:"3px solid " + s.c,cursor:"pointer",transition:"all .15s",textAlign:"center"}}>
              {i>0&&<div style={{display:"flex",justifyContent:"center",marginBottom:3}}>
                <svg width={12} height={8} viewBox="0 0 12 8" fill="none"><path d="M1 4h8M6 1l3 3-3 3" stroke={isA?s.c:T.b2} strokeWidth={1.5} strokeLinecap="round"/></svg>
              </div>}
              <div style={{fontSize:18,fontWeight:700,color:isA?s.c:T.t1}}>{s.count}</div>
              <div style={{fontSize:11,fontWeight:600,color:isA?s.c:T.t2}}>{s.stage}</div>
            </div>
          );
        })}
      </div>


      {/* ── GRN MODAL ───────────────────────────────────────────── */}
      {showGRN&&(<>
        <div onClick={()=>setShowGRN(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.38)",zIndex:400,backdropFilter:"blur(2px)"}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 24px 64px rgba(0,0,0,0.22)",zIndex:401,width:580,maxHeight:"85vh",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",overflow:"hidden"}}>
          <div style={{background:"#0D1B2A",padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"white"}}>Record GRN — Material Received</div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.45)",marginTop:2}}>{projectName}</div>
            </div>
            <button onClick={()=>setShowGRN(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:20,lineHeight:1}}>×</button>
          </div>
          <div style={{display:"flex",borderBottom:"1px solid "+T.b1,flexShrink:0}}>
            {[{id:"ordered",label:"Ordered Materials"},{id:"direct",label:"Direct Receive"}].map(t=>(
              <button key={t.id} onClick={()=>setGrnTab(t.id)}
                style={{flex:1,padding:"10px",border:"none",background:grnTab===t.id?T.surface:T.surfaceB,color:grnTab===t.id?T.blu:T.t3,fontSize:12.5,fontWeight:grnTab===t.id?700:400,cursor:"pointer",borderBottom:grnTab===t.id?"2px solid "+T.blu:"2px solid transparent"}}>
                {t.label}
                {t.id==="ordered"&&orderedMRs.length>0&&<span style={{background:T.amb,color:"white",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:10,marginLeft:5}}>{orderedMRs.length}</span>}
              </button>
            ))}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
            {grnTab==="ordered"&&(
              <div>
                {orderedMRs.length===0&&(
                  <div style={{textAlign:"center",padding:"40px",color:T.t4}}>
                    <div style={{fontSize:13,fontWeight:600,color:T.t2,marginBottom:4}}>Koi ordered material nahi hai</div>
                    <div style={{fontSize:12,marginTop:4}}>Procurement se order karo, ya Direct Receive tab use karo</div>
                  </div>
                )}
                {orderedMRs.map(mr=>{
                  const isDone=grnDone.includes(mr.id);
                  const row=grnRows[mr.id]||{};
                  return(
                    <div key={mr.id} style={{background:isDone?T.grnL:T.surface,border:"1px solid "+(isDone?T.grnM:T.b1),borderRadius:8,padding:"12px 14px",marginBottom:8,borderLeft:"3px solid "+(isDone?T.grn:T.amb)}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:isDone?0:10}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:isDone?T.grn:T.t1}}>{mr.item_name}</div>
                          <div style={{fontSize:11,color:T.t4,marginTop:2}}>
                            Ordered: {mr.quantity} {mr.unit}
                            {mr.linked_vendor&&<span style={{marginLeft:8,color:T.blu}}>· {mr.linked_vendor}</span>}
                          </div>
                        </div>
                        {isDone&&<span style={{fontSize:11,fontWeight:700,color:T.grn,background:T.grnL,padding:"3px 10px",borderRadius:20,border:"1px solid "+T.grnM}}>✓ Received</span>}
                      </div>
                      {!isDone&&(
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"flex-end"}}>
                          <div>
                            <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Challan No. *</label>
                            <input value={row.challan||""} onChange={e=>setGrnRows(p=>({...p,[mr.id]:{...p[mr.id],challan:e.target.value}}))}
                              placeholder="e.g. CH-445"
                              style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                          </div>
                          <div>
                            <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Received Qty</label>
                            <input type="number" value={row.received_qty||""} onChange={e=>setGrnRows(p=>({...p,[mr.id]:{...p[mr.id],received_qty:e.target.value}}))}
                              placeholder={String(mr.quantity)}
                              style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                          </div>
                          <button onClick={()=>handleReceiveMR(mr.id)} disabled={!row.challan||grnSaving}
                            style={{padding:"7px 14px",borderRadius:6,background:row.challan?T.grn:T.b1,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:row.challan?"pointer":"not-allowed",whiteSpace:"nowrap"}}>
                            {grnSaving?"...":"✓ Receive"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {grnTab==="direct"&&(
              <div>
                <div style={{background:T.bluL,border:"1px solid "+T.bluM,borderRadius:7,padding:"8px 11px",fontSize:11.5,color:T.blu,marginBottom:12}}>
                  Bina PO ke directly site pe aaya material — challan se receive karo
                </div>
                {directRows.map((row,i)=>(
                  <div key={row.id} style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,padding:"12px",marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <span style={{fontSize:11,fontWeight:600,color:T.t3}}>Item {i+1}</span>
                      {directRows.length>1&&<button onClick={()=>setDirectRows(p=>p.filter(r=>r.id!==row.id))} style={{background:"none",border:"none",cursor:"pointer",color:T.red,fontSize:18,lineHeight:1}}>×</button>}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                      <div>
                        <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Material Name *</label>
                        <input value={row.item_name} onChange={e=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,item_name:e.target.value}:r))}
                          placeholder="e.g. Cement OPC 53"
                          list={"mat_lib_"+row.id}
                          style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                        <datalist id={"mat_lib_"+row.id}>{MAT_LIB.map(m=><option key={m} value={m}/>)}</datalist>
                      </div>
                      <div>
                        <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Vendor</label>
                        <input value={row.vendor} onChange={e=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,vendor:e.target.value}:r))}
                          placeholder="Vendor name"
                          style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr",gap:8}}>
                      <div>
                        <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Qty *</label>
                        <input type="number" value={row.qty} onChange={e=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,qty:e.target.value}:r))}
                          placeholder="0"
                          style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                      </div>
                      <div>
                        <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Unit</label>
                        <select value={row.unit} onChange={e=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,unit:e.target.value}:r))}
                          style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
                          {UNITS_MR.map(u=><option key={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Challan No. *</label>
                        <input value={row.challan} onChange={e=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,challan:e.target.value}:r))}
                          placeholder="e.g. CH-445"
                          style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={()=>setDirectRows(p=>[...p,{id:Date.now(),item_name:"",qty:"",unit:"Bags",vendor:"",challan:""}])}
                  style={{width:"100%",padding:"8px",borderRadius:7,border:"1.5px dashed "+T.b2,background:"none",color:T.t4,fontSize:12,cursor:"pointer",marginTop:4}}>
                  + Add Another Item
                </button>
              </div>
            )}
          </div>
          <div style={{padding:"11px 16px",borderTop:"1px solid "+T.b1,background:T.surfaceB,display:"flex",gap:8,flexShrink:0}}>
            <button onClick={()=>setShowGRN(false)} style={{flex:1,padding:"8px",borderRadius:7,background:T.surface,border:"1px solid "+T.b1,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Close</button>
            {grnTab==="direct"&&(
              <button onClick={handleDirectReceive} disabled={grnSaving}
                style={{flex:2,padding:"8px",borderRadius:7,background:grnSaving?T.b1:T.grn,border:"none",color:"white",fontSize:12.5,fontWeight:700,cursor:grnSaving?"not-allowed":"pointer"}}>
                {grnSaving?"Saving...":"Submit GRN"}
              </button>
            )}
            {grnTab==="ordered"&&grnDone.length>0&&(
              <button onClick={()=>{setShowGRN(false);}}
                style={{flex:2,padding:"8px",borderRadius:7,background:T.grn,border:"none",color:"white",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>
                Done ✓ ({grnDone.length} received)
              </button>
            )}
          </div>
        </div>
      </>)}

      {/* Filter bar */}
      <div style={{background:T.surface,border:"1px solid " + T.b1,borderRadius:8,padding:"7px 10px",marginBottom:8,display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:140}}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} strokeLinecap="round" style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search material..."
            style={{width:"100%",height:29,padding:"0 8px 0 27px",borderRadius:6,border:"1.5px solid " + (search?T.blu:T.b1),fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:search?T.bluL:T.surface}}/>
        </div>
        <div style={{position:"relative"}}>
          <select value={fMaterial} onChange={e=>setFMaterial(e.target.value)}
            style={{height:29,padding:"0 22px 0 9px",borderRadius:6,border:"1.5px solid " + (fMaterial!=="All"?T.blu:T.b1),background:fMaterial!=="All"?T.bluL:T.surface,fontSize:11.5,color:fMaterial!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:fMaterial!=="All"?600:400,minWidth:160,appearance:"none",WebkitAppearance:"none"}}>
            {MATERIAL_NAMES.map(n=><option key={n} value={n}>{n==="All"?"All Materials":n}</option>)}
          </select>
          <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={2} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <span style={{fontSize:11,color:T.t4}}>{filtered.length} items</span>
        <div style={{display:"flex",background:T.bg,borderRadius:6,border:"1px solid " + T.b1,overflow:"hidden"}}>
          {[{id:"tile",icon:"tile"},{id:"list",icon:"list"}].map(v=>(
            <button key={v.id} onClick={()=>setViewMode(v.id)}
              style={{padding:"4px 9px",border:"none",background:viewMode===v.id?T.blu:"none",color:viewMode===v.id?"white":T.t3,cursor:"pointer",fontSize:11,transition:"all .15s"}}>
              {v.id==="tile"?"⊞":"☰"}
            </button>
          ))}
        </div>
        {activeFilters>0&&<button onClick={()=>{setFStage("All");setFMaterial("All");setSearch("");}} style={{fontSize:11,color:T.red,background:T.redL,border:"1px solid " + T.redM,borderRadius:5,padding:"3px 9px",cursor:"pointer"}}>Clear x</button>}
        <AddBtn label="New Request" onClick={()=>setShowModal(true)}/>
        <button onClick={()=>{setShowGRN(true);setGrnDone([]);setGrnRows({});}}
          style={{padding:"5px 12px",borderRadius:6,background:T.grnL,border:"1px solid "+T.grnM,color:T.grn,fontSize:11.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M9 12l2 2 4-4M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
          Record GRN
        </button>
      </div>

      {/* TILE VIEW */}
      {viewMode==="tile"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
          {filtered.map(m=>{
            const ss=STAGE_S[m.stage]||STAGE_S["Requested"];
            return(
              <div key={m.id} style={{background:T.surface,borderRadius:9,border:"1px solid " + T.b1,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.04)",borderLeft:"4px solid " + ss.c}}>
                <div style={{padding:"10px 12px 8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                    <Pill label={m.stage} c={ss.c} bg={ss.bg}/>
                    <span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{m.qty}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:T.t1,lineHeight:1.3,marginBottom:5}}>{m.name}</div>
                  <div style={{display:"flex",gap:8,fontSize:11,color:T.t4}}>
                    <span>{m.vendor||"No vendor"}</span><span>.</span><span>{m.date}</span>
                  </div>
                </div>
                <div style={{padding:"7px 12px",borderTop:"1px solid " + T.b1,background:T.surfaceB,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:T.t4}}>By {(m.by||"—").split(" ")[0]}</span>
                  <span style={{fontSize:13,fontWeight:700,color:T.t1}}>Rs.{fmtN(m.amt||0)}</span>
                </div>
              </div>
            );
          })}
          {filtered.length===0&&<div style={{gridColumn:"1/-1",padding:"48px",textAlign:"center",color:T.t4,background:T.surface,borderRadius:8,border:"1px solid " + T.b1}}>No materials found</div>}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode==="list"&&(
        <Panel>
          <THead cols="2fr 90px 110px 130px 110px 110px" headers={["Material","Qty","Stage","Vendor","Requested By","Amount"]}/>
          {filtered.map(m=>{
            const ss=STAGE_S[m.stage]||STAGE_S["Requested"];
            return(
              <div key={m.id} style={{display:"grid",gridTemplateColumns:"2fr 90px 110px 130px 110px 110px",padding:"9px 15px",borderBottom:"1px solid " + T.b1,alignItems:"center",borderLeft:"3px solid " + ss.c + "44",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{m.name}</span>
                <span style={{fontSize:12,color:T.t2}}>{m.qty}</span>
                <Pill label={m.stage} c={ss.c} bg={ss.bg}/>
                <span style={{fontSize:12,color:T.t2}}>{m.vendor||"—"}</span>
                <span style={{fontSize:12,color:T.t2}}>{(m.by||"—").split(" ")[0]}</span>
                <span style={{fontSize:13,fontWeight:600,color:T.t1}}>Rs.{fmtN(m.amt||0)}</span>
              </div>
            );
          })}
          {filtered.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4}}>No materials found</div>}
        </Panel>
      )}
    </div>
  );
}

function TabSubcon() {
  const [sel,  setSel]  = useState(SC_DATA[0]);
  const [subTab,setSubTab]=useState("wo");
  const [showNewWO,setShowNewWO]=useState(false);
  const [openSections,setOpenSections]=useState({"s1":true,"s2":true,"e1":true});
  const [openSubsecs,setOpenSubsecs]=useState({"s1a":true,"s1b":true,"s2a":true,"e1a":true});

  // Work order computed totals
  const woTotal=(sc)=>sc.workOrder.sections.flatMap(s=>s.subsections.flatMap(ss=>ss.items)).reduce((s,it)=>s+it.amount,0);
  const woDone=(sc)=>{
    const items=sc.workOrder.sections.flatMap(s=>s.subsections.flatMap(ss=>ss.items));
    const doneAmt=items.reduce((s,it)=>s+(it.amount*(it.done/100)),0);
    return {amt:doneAmt,pct:items.length>0?Math.round(doneAmt/items.reduce((s,it)=>s+it.amount,0)*100):0};
  };

  const toggleSec=(id)=>setOpenSections(p=>({...p,[id]:!p[id]}));
  const toggleSub=(id)=>setOpenSubsecs(p=>({...p,[id]:!p[id]}));

  // ── Work Order Builder Modal ──────────────────────────────────────
  const WorkOrderBuilder=()=>{
    const [sections,setSections]=useState([
      {id:"ns1",title:"Section 1",subsections:[
        {id:"nss1",title:"Subsection 1",items:[
          {id:1,desc:"",unit:"CuM",qty:"",rate:"",amount:0,done:0}
        ]}
      ]}
    ]);
    const [form,setForm]=useState({contractor:SC_DATA[0].contractor,startDate:"",endDate:"",notes:""});

    const calcAmt=(qty,rate)=>Math.round((Number(qty)||0)*(Number(rate)||0));
    const totalAmt=sections.flatMap(s=>s.subsections.flatMap(ss=>ss.items)).reduce((s,it)=>s+it.amount,0);

    const addSection=()=>setSections(p=>[...p,{id:"ns"+Date.now(),title:"New Section",subsections:[{id:"nss"+Date.now(),title:"Subsection 1",items:[{id:Date.now(),desc:"",unit:"CuM",qty:"",rate:"",amount:0,done:0}]}]}]);
    const addSubsec=(sId)=>setSections(p=>p.map(s=>s.id===sId?{...s,subsections:[...s.subsections,{id:"nss"+Date.now(),title:"New Subsection",items:[{id:Date.now(),desc:"",unit:"CuM",qty:"",rate:"",amount:0,done:0}]}]}:s));
    const addItem=(sId,ssId)=>setSections(p=>p.map(s=>s.id===sId?{...s,subsections:s.subsections.map(ss=>ss.id===ssId?{...ss,items:[...ss.items,{id:Date.now(),desc:"",unit:"CuM",qty:"",rate:"",amount:0,done:0}]}:ss)}:s));
    const updateItem=(sId,ssId,iId,key,val)=>setSections(p=>p.map(s=>s.id===sId?{...s,subsections:s.subsections.map(ss=>ss.id===ssId?{...ss,items:ss.items.map(it=>{
      if(it.id!==iId) return it;
      const upd={...it,[key]:val};
      upd.amount=calcAmt(key==="qty"?val:upd.qty,key==="rate"?val:upd.rate);
      return upd;
    })}:ss)}:s));
    const updateSecTitle=(sId,title)=>setSections(p=>p.map(s=>s.id===sId?{...s,title}:s));
    const updateSubTitle=(sId,ssId,title)=>setSections(p=>p.map(s=>s.id===sId?{...s,subsections:s.subsections.map(ss=>ss.id===ssId?{...ss,title}:ss)}:s));
    const removeItem=(sId,ssId,iId)=>setSections(p=>p.map(s=>s.id===sId?{...s,subsections:s.subsections.map(ss=>ss.id===ssId?{...ss,items:ss.items.filter(it=>it.id!==iId)}:ss)}:s));

    const UNITS=["CuM","SqM","SqFt","Mtrs","Nos","KG","MT","Bags","Lump","Point","Rft"];

    return(<>
      <div onClick={()=>setShowNewWO(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,backdropFilter:"blur(1px)"}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(720px,90vw)",background:T.bg,zIndex:301,boxShadow:"-6px 0 32px rgba(0,0,0,0.2)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn 0.2s ease"}}>
        {/* Header */}
        <div style={{background:"#0D1B2A",padding:"14px 18px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"white"}}>New Work Order</div>
            <div style={{fontSize:10.5,color:"rgba(255,255,255,0.45)",marginTop:2}}>Define scope, items, quantities and rates</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{padding:"5px 12px",background:"rgba(255,255,255,0.1)",borderRadius:6,fontSize:12,fontWeight:600,color:"white"}}>Total: ₹{fmtN(totalAmt)}</div>
            <button onClick={()=>setShowNewWO(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Basic details */}
        <div style={{background:T.surface,borderBottom:`1px solid ${T.b1}`,padding:"12px 18px",flexShrink:0}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:12}}>
            {[
              {l:"Contractor",key:"contractor",type:"select",opts:SC_DATA.map(s=>s.contractor)},
              {l:"Start Date",key:"startDate",type:"date"},
              {l:"End Date",key:"endDate",type:"date"},
            ].map(f=>(
              <div key={f.key}>
                <div style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:4}}>{f.l}</div>
                {f.type==="select"
                  ?<select value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                      style={{width:"100%",height:30,padding:"0 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
                      {f.opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                  :<input type="date" value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                      style={{width:"100%",height:30,padding:"0 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                }
              </div>
            ))}
          </div>
        </div>

        {/* Sections builder */}
        <div style={{flex:1,overflowY:"auto",padding:"12px 18px"}}>
          {sections.map((sec,si)=>(
            <div key={sec.id} style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,marginBottom:12,overflow:"hidden"}}>
              {/* Section header */}
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.bluL,borderBottom:`1px solid ${T.bluM}`}}>
                <div style={{width:24,height:24,borderRadius:6,background:T.blu,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:11,fontWeight:700,color:"white"}}>{si+1}</span>
                </div>
                <input value={sec.title} onChange={e=>updateSecTitle(sec.id,e.target.value)}
                  style={{flex:1,background:"none",border:"none",outline:"none",fontSize:13,fontWeight:700,color:T.blu,fontFamily:"inherit"}}
                  placeholder="Section title..."/>
                <span style={{fontSize:11,color:T.blu,fontWeight:600}}>
                  ₹{fmtN(sec.subsections.flatMap(ss=>ss.items).reduce((s,it)=>s+it.amount,0))}
                </span>
              </div>

              {sec.subsections.map((ss,ssi)=>(
                <div key={ss.id} style={{borderBottom:`1px solid ${T.b1}`}}>
                  {/* Subsection header */}
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px 8px 28px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
                    <span style={{fontSize:10,color:T.t4,fontWeight:600}}>{si+1}.{ssi+1}</span>
                    <input value={ss.title} onChange={e=>updateSubTitle(sec.id,ss.id,e.target.value)}
                      style={{flex:1,background:"none",border:"none",outline:"none",fontSize:12.5,fontWeight:600,color:T.t2,fontFamily:"inherit"}}
                      placeholder="Subsection title..."/>
                    <span style={{fontSize:11,color:T.t3,fontWeight:600}}>
                      ₹{fmtN(ss.items.reduce((s,it)=>s+it.amount,0))}
                    </span>
                  </div>

                  {/* Table header */}
                  <div style={{display:"grid",gridTemplateColumns:"30px 1fr 70px 70px 70px 90px 60px 28px",padding:"5px 14px 5px 28px",background:T.surfaceB}}>
                    {["#","Description","Unit","Qty","Rate","Amount","Done%",""].map((h,i)=>(
                      <span key={i} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
                    ))}
                  </div>

                  {/* Items */}
                  {ss.items.map((it,ii)=>(
                    <div key={it.id} style={{display:"grid",gridTemplateColumns:"30px 1fr 70px 70px 70px 90px 60px 28px",padding:"6px 14px 6px 28px",borderBottom:`1px dashed ${T.b1}`,alignItems:"center",gap:4}}>
                      <span style={{fontSize:10,color:T.t4}}>{si+1}.{ssi+1}.{ii+1}</span>
                      <input value={it.desc} onChange={e=>updateItem(sec.id,ss.id,it.id,"desc",e.target.value)}
                        placeholder="Item description..." style={{padding:"4px 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:12,color:T.t1,outline:"none",fontFamily:"inherit",background:T.surface,width:"100%",boxSizing:"border-box"}}
                        onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                      <select value={it.unit} onChange={e=>updateItem(sec.id,ss.id,it.id,"unit",e.target.value)}
                        style={{height:28,padding:"0 4px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
                        {UNITS.map(u=><option key={u}>{u}</option>)}
                      </select>
                      {["qty","rate"].map(k=>(
                        <input key={k} type="number" value={it[k]} onChange={e=>updateItem(sec.id,ss.id,it.id,k,e.target.value)}
                          placeholder={k==="qty"?"0":"0.00"} style={{padding:"4px 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:12,color:T.t1,outline:"none",fontFamily:"inherit",background:T.surface,width:"100%",boxSizing:"border-box"}}
                          onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                      ))}
                      <span style={{fontSize:12.5,fontWeight:600,color:it.amount>0?T.blu:T.t4,fontVariantNumeric:"tabular-nums"}}>₹{fmtN(it.amount)}</span>
                      <input type="number" value={it.done} onChange={e=>updateItem(sec.id,ss.id,it.id,"done",Math.min(100,Math.max(0,Number(e.target.value))))}
                        min={0} max={100} style={{padding:"4px 5px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11,color:T.t1,outline:"none",fontFamily:"inherit",background:T.surface,width:"100%",boxSizing:"border-box"}}/>
                      <button onClick={()=>removeItem(sec.id,ss.id,it.id)}
                        style={{width:24,height:24,borderRadius:5,background:T.redL,border:`1px solid ${T.redM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}

                  {/* Add item */}
                  <button onClick={()=>addItem(sec.id,ss.id)}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"6px 28px",width:"100%",border:"none",background:"none",cursor:"pointer",color:T.blu,fontSize:11.5,fontWeight:600,borderTop:`1px dashed ${T.b1}`}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bluL}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
                    Add Item
                  </button>
                </div>
              ))}

              {/* Add subsection */}
              <button onClick={()=>addSubsec(sec.id)}
                style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",width:"100%",border:"none",background:T.surfaceB,cursor:"pointer",color:T.slt,fontSize:11.5,fontWeight:600}}
                onMouseEnter={e=>e.currentTarget.style.background=T.b1}
                onMouseLeave={e=>e.currentTarget.style.background=T.surfaceB}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
                Add Subsection
              </button>
            </div>
          ))}

          {/* Add section */}
          <button onClick={addSection}
            style={{display:"flex",alignItems:"center",gap:7,padding:"10px 16px",width:"100%",border:`2px dashed ${T.b2}`,borderRadius:9,background:"none",cursor:"pointer",color:T.slt,fontSize:12.5,fontWeight:600,justifyContent:"center"}}
            onMouseEnter={e=>{e.currentTarget.style.background=T.surfaceB;e.currentTarget.style.borderColor=T.blu;e.currentTarget.style.color=T.blu;}}
            onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.borderColor=T.b2;e.currentTarget.style.color=T.slt;}}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
            Add Section
          </button>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{fontSize:13,color:T.t2}}>
            Total: <span style={{fontSize:16,fontWeight:700,color:T.blu}}>₹{fmtN(totalAmt)}</span>
            <span style={{fontSize:11,color:T.t4,marginLeft:8}}>{sections.flatMap(s=>s.subsections.flatMap(ss=>ss.items)).length} items</span>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowNewWO(false)} style={{padding:"8px 18px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
            <button style={{padding:"8px 20px",borderRadius:7,background:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer"}}>Save Work Order</button>
          </div>
        </div>
      </div>
    </>);
  };

  // ── Subcon list card ──────────────────────────────────────────────
  const wo=sel?.workOrder;
  const allItems=wo?.sections.flatMap(s=>s.subsections.flatMap(ss=>ss.items))||[];
  const woGrand=allItems.reduce((s,it)=>s+it.amount,0);
  const woDoneAmt=allItems.reduce((s,it)=>s+(it.amount*(it.done/100)),0);
  const woDonePct=woGrand>0?Math.round(woDoneAmt/woGrand*100):0;

  const SUBTABS=[
    {id:"wo",l:"Work Order"},
    {id:"payments",l:"Payments"},
    {id:"milestones",l:"Milestones"},
    {id:"bills",l:"Bills"},
    {id:"material",l:"Material Issued"},
  ];

  return(
    <div style={{padding:"14px 18px"}}>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
        <button onClick={()=>setShowNewWO(true)}
          style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 14px",border:`1px solid ${T.blu}`,borderRadius:6,background:T.bluL,color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer",transition:"all .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.background=T.blu;e.currentTarget.style.color="#fff";}}
          onMouseLeave={e=>{e.currentTarget.style.background=T.bluL;e.currentTarget.style.color=T.blu;}}>
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          New Work Order
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:14}}>
        {/* Left: subcon list */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {SC_DATA.map(sc=>{
            const isSel=sel?.id===sc.id;
            const scPct=Math.round(sc.paid/sc.totalValue*100);
            return(
              <div key={sc.id} onClick={()=>{setSel(sc);setSubTab("wo");}}
                style={{background:T.surface,borderRadius:9,padding:"12px 14px",border:`1.5px solid ${isSel?T.blu:T.b1}`,cursor:"pointer",borderLeft:`4px solid ${isSel?T.blu:T.b1}`,transition:"all .15s",boxShadow:isSel?"0 2px 10px rgba(37,99,235,0.1)":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <span style={{fontSize:12.5,fontWeight:700,color:isSel?T.blu:T.t1,lineHeight:1.3}}>{sc.contractor}</span>
                  <Pill label={sc.status} c={T.grn} bg={T.grnL}/>
                </div>
                <div style={{fontSize:11,color:T.t3,marginBottom:2}}>{sc.no} · {sc.type}</div>
                <div style={{fontSize:11,color:T.t4,marginBottom:10}}>{sc.work}</div>
                <div style={{display:"flex",gap:12,marginBottom:8}}>
                  {[["Contract",`₹${fmt(sc.totalValue)}`,T.slt],["Paid",`₹${fmt(sc.paid)}`,T.grn],["Balance",`₹${fmt(sc.totalValue-sc.paid)}`,T.red]].map(([l,v,vc])=>(
                    <div key={l}><div style={{fontSize:9,color:T.t4,textTransform:"uppercase",marginBottom:1}}>{l}</div><div style={{fontSize:12.5,fontWeight:700,color:vc}}>{v}</div></div>
                  ))}
                </div>
                <PBar pct={scPct} color={T.grn}/>
                <div style={{fontSize:10,color:T.t4,marginTop:2}}>{scPct}% paid</div>
              </div>
            );
          })}
        </div>

        {/* Right: detail panel */}
        {sel&&(
          <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            {/* Panel header */}
            <div style={{padding:"11px 16px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:13.5,fontWeight:700,color:T.t1}}>{sel.contractor}</div>
                <div style={{fontSize:10.5,color:T.t4}}>{sel.no} · {sel.start} → {sel.end}</div>
              </div>
              <div style={{display:"flex",gap:10}}>
                {[["WO Value",`₹${fmt(woGrand)}`,T.slt],[`Done ${woDonePct}%`,`₹${fmt(woDoneAmt)}`,T.blu],["Paid",`₹${fmt(sel.paid)}`,T.grn],["Balance",`₹${fmt(sel.totalValue-sel.paid)}`,T.red]].map(([l,v,c])=>(
                  <div key={l} style={{textAlign:"right"}}>
                    <div style={{fontSize:9,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",marginBottom:1}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inner tabs */}
            <div style={{display:"flex",borderBottom:`1px solid ${T.b1}`,background:T.surfaceB,flexShrink:0}}>
              {SUBTABS.map(t=>(
                <button key={t.id} onClick={()=>setSubTab(t.id)}
                  style={{padding:"8px 14px",border:"none",background:"none",color:subTab===t.id?T.blu:T.t3,fontWeight:subTab===t.id?700:400,fontSize:12,cursor:"pointer",borderBottom:subTab===t.id?`2px solid ${T.blu}`:"2px solid transparent",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .15s"}}>
                  {t.l}
                </button>
              ))}
            </div>

            <div style={{flex:1,overflowY:"auto"}}>

              {/* ── WORK ORDER TAB ── */}
              {subTab==="wo"&&(
                <div>
                  {wo.sections.map((sec,si)=>{
                    const secTotal=sec.subsections.flatMap(ss=>ss.items).reduce((s,it)=>s+it.amount,0);
                    const secDone=sec.subsections.flatMap(ss=>ss.items).reduce((s,it)=>s+(it.amount*(it.done/100)),0);
                    const isSecOpen=openSections[sec.id]!==false;
                    return(
                      <div key={sec.id}>
                        {/* Section row */}
                        <div onClick={()=>toggleSec(sec.id)}
                          style={{display:"grid",gridTemplateColumns:"20px 1fr 90px 90px 60px",padding:"9px 16px",background:T.bluL,borderBottom:`1px solid ${T.bluM}`,cursor:"pointer",alignItems:"center",borderLeft:`3px solid ${T.blu}`}}>
                          <svg width={10} height={10} viewBox="0 0 12 12" fill="none" stroke={T.blu} strokeWidth={2} style={{transform:isSecOpen?"none":"rotate(-90deg)",transition:"transform .2s"}}><path d="M2 4l4 4 4-4"/></svg>
                          <span style={{fontSize:13,fontWeight:700,color:T.blu}}>{si+1}. {sec.title}</span>
                          <span style={{fontSize:11.5,fontWeight:600,color:T.t3,textAlign:"right"}}>{Math.round(secDone/secTotal*100)||0}% done</span>
                          <span style={{fontSize:13,fontWeight:700,color:T.blu,textAlign:"right"}}>₹{fmtN(secTotal)}</span>
                          <span/>
                        </div>

                        {isSecOpen&&sec.subsections.map((ss,ssi)=>{
                          const ssTotal=ss.items.reduce((s,it)=>s+it.amount,0);
                          const isSSOpen=openSubsecs[ss.id]!==false;
                          return(
                            <div key={ss.id}>
                              {/* Subsection row */}
                              <div onClick={()=>toggleSub(ss.id)}
                                style={{display:"grid",gridTemplateColumns:"20px 1fr 90px 90px 60px",padding:"7px 16px 7px 28px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,cursor:"pointer",alignItems:"center"}}>
                                <svg width={9} height={9} viewBox="0 0 12 12" fill="none" stroke={T.t4} strokeWidth={2} style={{transform:isSSOpen?"none":"rotate(-90deg)",transition:"transform .2s"}}><path d="M2 4l4 4 4-4"/></svg>
                                <span style={{fontSize:12,fontWeight:600,color:T.t2}}>{si+1}.{ssi+1} {ss.title}</span>
                                <span/>
                                <span style={{fontSize:12,fontWeight:600,color:T.t2,textAlign:"right"}}>₹{fmtN(ssTotal)}</span>
                                <span/>
                              </div>

                              {isSSOpen&&(
                                <>
                                  {/* Items table header */}
                                  <div style={{display:"grid",gridTemplateColumns:"50px 1fr 70px 70px 70px 100px 70px",padding:"5px 16px 5px 36px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
                                    {["Item#","Description","Unit","Qty","Rate","Amount","Done%"].map((h,i)=>(
                                      <span key={i} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
                                    ))}
                                  </div>
                                  {ss.items.map((it,ii)=>{
                                    const donePct=it.done;
                                    const doneAmt=Math.round(it.amount*donePct/100);
                                    return(
                                      <div key={it.id} style={{display:"grid",gridTemplateColumns:"50px 1fr 70px 70px 70px 100px 70px",padding:"8px 16px 8px 36px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",transition:"background .1s"}}
                                        onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                        <span style={{fontSize:10,color:T.t4,fontFamily:"monospace"}}>{si+1}.{ssi+1}.{ii+1}</span>
                                        <span style={{fontSize:12.5,color:T.t1}}>{it.desc}</span>
                                        <span style={{fontSize:11.5,color:T.t3}}>{it.unit}</span>
                                        <span style={{fontSize:12,color:T.t2,fontVariantNumeric:"tabular-nums"}}>{it.qty}</span>
                                        <span style={{fontSize:12,color:T.t2,fontVariantNumeric:"tabular-nums"}}>₹{fmtN(it.rate)}</span>
                                        <span style={{fontSize:13,fontWeight:600,color:T.t1,fontVariantNumeric:"tabular-nums"}}>₹{fmtN(it.amount)}</span>
                                        <div>
                                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                                            <span style={{fontSize:10,color:donePct===100?T.grn:T.t4,fontWeight:600}}>{donePct}%</span>
                                          </div>
                                          <div style={{height:4,background:T.b1,borderRadius:2,overflow:"hidden"}}>
                                            <div style={{height:"100%",width:`${donePct}%`,background:donePct===100?T.grn:T.blu,borderRadius:2}}/>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Grand total row */}
                  <div style={{display:"grid",gridTemplateColumns:"50px 1fr 70px 70px 70px 100px 70px",padding:"10px 16px",background:T.surfaceB,borderTop:`2px solid ${T.b2}`,position:"sticky",bottom:0}}>
                    <span/>
                    <span style={{fontSize:13,fontWeight:700,color:T.t1}}>Grand Total</span>
                    <span/><span/><span/>
                    <span style={{fontSize:15,fontWeight:700,color:T.blu,fontVariantNumeric:"tabular-nums"}}>₹{fmtN(woGrand)}</span>
                    <div>
                      <span style={{fontSize:11,fontWeight:600,color:T.grn}}>{woDonePct}%</span>
                      <div style={{height:4,background:T.b1,borderRadius:2,overflow:"hidden",marginTop:2}}>
                        <div style={{height:"100%",width:`${woDonePct}%`,background:T.grn,borderRadius:2}}/>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PAYMENTS TAB ── */}
              {subTab==="payments"&&(
                <div style={{padding:"14px 16px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
                    {[{l:"Work Order",v:`₹${fmt(woGrand)}`,c:T.slt},{l:"Paid",v:`₹${fmt(sel.paid)}`,c:T.grn},{l:"Balance Due",v:`₹${fmt(sel.totalValue-sel.paid)}`,c:T.red}].map((s,i)=>(
                      <div key={i} style={{padding:"10px 13px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,borderTop:`3px solid ${s.c}`}}>
                        <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{s.l}</div>
                        <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Payment progress */}
                  <div style={{marginBottom:14,padding:"11px 14px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:12,fontWeight:600,color:T.t2}}>Payment Progress</span>
                      <span style={{fontSize:12,fontWeight:700,color:T.grn}}>{Math.round(sel.paid/sel.totalValue*100)}%</span>
                    </div>
                    <div style={{height:8,background:T.b1,borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.round(sel.paid/sel.totalValue*100)}%`,background:`linear-gradient(90deg,${T.grn},#34d399)`,borderRadius:4}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                      <span style={{fontSize:10.5,color:T.grn}}>Paid ₹{fmt(sel.paid)}</span>
                      <span style={{fontSize:10.5,color:T.red}}>Remaining ₹{fmt(sel.totalValue-sel.paid)}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,alignItems:"center"}}>
                    <span style={{fontSize:12,fontWeight:600,color:T.t1}}>Payment History</span>
                    <AddBtn label="Record Payment"/>
                  </div>
                  <Panel>
                    <THead cols="80px 1fr 130px 80px" headers={["Date","Description","Amount","Status"]}/>
                    {sel.bills.filter(b=>b.status==="Paid").map((b,i)=>(
                      <div key={i} style={{display:"grid",gridTemplateColumns:"80px 1fr 130px 80px",padding:"9px 15px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",transition:"background .1s"}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <span style={{fontSize:11.5,color:T.t4}}>{b.date}</span>
                        <span style={{fontSize:12.5,color:T.t1}}>{b.desc}</span>
                        <span style={{fontSize:13,fontWeight:700,color:T.grn}}>₹{fmtN(b.amount)}</span>
                        <Pill label="Paid" c={T.grn} bg={T.grnL}/>
                      </div>
                    ))}
                  </Panel>
                </div>
              )}

              {/* ── MILESTONES TAB ── */}
              {subTab==="milestones"&&(
                <div style={{padding:"14px 16px"}}>
                  <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
                    <AddBtn label="Add Milestone"/>
                  </div>
                  {sel.milestones.map((m,i)=>{
                    const ms=m.status==="Paid"?{c:T.grn,bg:T.grnL,brd:T.grnM}:m.status==="Pending"?{c:T.amb,bg:T.ambL,brd:T.ambM}:{c:T.slt,bg:T.sltL,brd:T.b2};
                    return(
                      <div key={m.id} style={{background:T.surface,borderRadius:8,border:`1px solid ${ms.brd}`,marginBottom:8,padding:"11px 14px",display:"flex",alignItems:"center",gap:12,boxShadow:m.status==="Pending"?`0 2px 8px ${T.amb}18`:"0 1px 3px rgba(0,0,0,0.04)"}}>
                        <div style={{width:36,height:36,borderRadius:8,background:ms.bg,border:`1px solid ${ms.brd}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:13,fontWeight:700,color:ms.c}}>{i+1}</span>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                            <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{m.title}</span>
                            <Pill label={m.status} c={ms.c} bg={ms.bg} brd={ms.brd}/>
                            <span style={{fontSize:10.5,color:T.t4}}>{m.pct}% of contract</span>
                          </div>
                          <div style={{fontSize:10.5,color:T.t4}}>Target: {m.date}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:15,fontWeight:700,color:m.status==="Paid"?T.grn:T.t1}}>₹{fmtN(m.amount)}</div>
                          {m.status==="Pending"&&<button style={{marginTop:6,padding:"4px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}>Mark Paid</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── BILLS TAB ── */}
              {subTab==="bills"&&(
                <div style={{padding:"14px 16px"}}>
                  <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
                    <AddBtn label="New Bill"/>
                  </div>
                  <Panel>
                    <THead cols="80px 1fr 130px 90px 80px" headers={["Date","Description","Amount","Status","Action"]}/>
                    {sel.bills.map((b,i)=>{
                      const bs=b.status==="Paid"?{c:T.grn,bg:T.grnL}:{c:T.red,bg:T.redL};
                      return(
                        <div key={i} style={{display:"grid",gridTemplateColumns:"80px 1fr 130px 90px 80px",padding:"10px 15px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",borderLeft:`3px solid ${bs.c}44`,transition:"background .1s"}}
                          onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <span style={{fontSize:11.5,color:T.t4}}>{b.date}</span>
                          <span style={{fontSize:12.5,fontWeight:500,color:T.t1}}>{b.desc}</span>
                          <span style={{fontSize:13,fontWeight:700,color:T.t1,fontVariantNumeric:"tabular-nums"}}>₹{fmtN(b.amount)}</span>
                          <Pill label={b.status} c={bs.c} bg={bs.bg}/>
                          {b.status==="Unpaid"
                            ?<button style={{padding:"4px 10px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}>Pay</button>
                            :<span style={{fontSize:11,color:T.t4}}>—</span>
                          }
                        </div>
                      );
                    })}
                  </Panel>
                </div>
              )}

              {/* ── MATERIAL ISSUED TAB ── */}
              {subTab==="material"&&(
                <div style={{padding:"14px 16px"}}>
                  <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
                    <AddBtn label="Issue Material"/>
                  </div>
                  {sel.materials.length===0
                    ?<div style={{padding:"48px",textAlign:"center",color:T.t4,fontSize:13}}>No material issued yet</div>
                    :<Panel>
                      <THead cols="80px 1fr 130px 130px" headers={["Date","Item","Qty Issued","Issued By"]}/>
                      {sel.materials.map((m,i)=>(
                        <div key={i} style={{display:"grid",gridTemplateColumns:"80px 1fr 130px 130px",padding:"10px 15px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",transition:"background .1s"}}
                          onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <span style={{fontSize:11.5,color:T.t4}}>{m.date}</span>
                          <span style={{fontSize:12.5,fontWeight:500,color:T.t1}}>{m.item}</span>
                          <span style={{fontSize:12.5,fontWeight:600,color:T.t2}}>{m.qty}</span>
                          <span style={{fontSize:12,color:T.t3}}>{m.issuedBy}</span>
                        </div>
                      ))}
                    </Panel>
                  }
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Work Order Builder Modal */}
      {showNewWO&&<WorkOrderBuilder/>}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// TAB 11 — EQUIPMENT
// ═══════════════════════════════════════════════════════════════════
function TabEquipment() {
  const [selEq, setSelEq] = useState(D.equipment[0]);

  return (
    <div style={{padding:"16px 18px"}}>
      <div style={{display:"flex", justifyContent:"flex-end", marginBottom:12}}><AddBtn label="Add Equipment"/></div>
      <div style={{display:"grid", gridTemplateColumns:"290px 1fr", gap:14}}>
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {D.equipment.map(eq=>(
            <div key={eq.id} onClick={()=>setSelEq(eq)}
              style={{background:T.surface, borderRadius:8, padding:"11px 13px", border:`1.5px solid ${selEq?.id===eq.id?T.blu:T.b1}`, cursor:"pointer", borderLeft:`4px solid ${selEq?.id===eq.id?T.blu:T.b1}`, transition:"all .15s"}}>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:7}}>
                <span style={{fontSize:12.5, fontWeight:600, color:selEq?.id===eq.id?T.blu:T.t1}}>{eq.name}</span>
                <Pill label={eq.owner} c={eq.owner==="Own"?T.grn:T.amb} bg={eq.owner==="Own"?T.grnL:T.ambL}/>
              </div>
              <div style={{display:"flex", gap:16}}>
                <div><div style={{fontSize:9.5, color:T.t4, textTransform:"uppercase", marginBottom:2}}>Today</div><div style={{fontSize:16, fontWeight:700, color:T.blu}}>{eq.days[0]?.hours||0}h</div></div>
                <div><div style={{fontSize:9.5, color:T.t4, textTransform:"uppercase", marginBottom:2}}>Day Rate</div><div style={{fontSize:13, fontWeight:600, color:T.t1}}>₹{fmtN(eq.rate)}</div></div>
                <div><div style={{fontSize:9.5, color:T.t4, textTransform:"uppercase", marginBottom:2}}>Total Cost</div><div style={{fontSize:13, fontWeight:600, color:T.grn}}>₹{fmtN(eq.days.reduce((s,d)=>s+Math.round(eq.rate/8*d.hours),0))}</div></div>
              </div>
            </div>
          ))}
        </div>
        {selEq&&(
          <Panel style={{overflow:"hidden"}}>
            <PHead title={`${selEq.name} — Usage Log`} action={<AddBtn label="Log Today"/>}/>
            <THead cols="100px 70px 90px 1fr" headers={["Date","Hours","Cost","Note"]}/>
            {selEq.days.map((d,i)=>(
              <div key={i} style={{display:"grid", gridTemplateColumns:"100px 70px 90px 1fr", padding:"9px 15px", borderBottom:`1px solid ${T.b1}`, alignItems:"center", transition:"background .1s"}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:12.5, color:T.t1}}>{d.date}</span>
                <span style={{fontSize:13, fontWeight:700, color:d.hours>0?T.blu:T.t4}}>{d.hours>0?`${d.hours}h`:"—"}</span>
                <span style={{fontSize:12.5, color:T.t1, fontVariantNumeric:"tabular-nums"}}>{d.hours>0?`₹${fmtN(Math.round(selEq.rate/8*d.hours))}`:"—"}</span>
                <span style={{fontSize:12, color:T.t2}}>{d.note}</span>
              </div>
            ))}
          </Panel>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 12 — FILES
// ═══════════════════════════════════════════════════════════════════
function TabFiles() {
  const [selFolder, setSelFolder] = useState(D.folders[0]);
  const typeS = {"PDF":{c:T.red,bg:T.redL},"DWG":{c:T.blu,bg:T.bluL},"3D":{c:T.pur,bg:T.purL},"JPG":{c:T.grn,bg:T.grnL},"XLS":{c:"#065F46",bg:"#ECFDF5"}};

  return (
    <div style={{padding:"16px 18px"}}>
      <div style={{display:"flex", justifyContent:"flex-end", marginBottom:12}}><AddBtn label="Upload File"/></div>
      <div style={{display:"grid", gridTemplateColumns:"210px 1fr", gap:14}}>
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {D.folders.map(f=>(
            <button key={f.id} onClick={()=>setSelFolder(f)} style={{padding:"10px 13px", border:`1.5px solid ${selFolder?.id===f.id?f.color:T.b1}`, borderRadius:7, background:selFolder?.id===f.id?`${f.color}0D`:T.surface, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"all .14s", textAlign:"left", borderLeft:`4px solid ${selFolder?.id===f.id?f.color:T.b1}`}}>
              <span style={{fontSize:12.5, fontWeight:600, color:selFolder?.id===f.id?f.color:T.t1}}>{f.name}</span>
              <span style={{fontSize:11, color:T.t4, background:T.surfaceB, padding:"1px 7px", borderRadius:20, border:`1px solid ${T.b1}`}}>{f.count}</span>
            </button>
          ))}
        </div>
        {selFolder&&(
          <Panel style={{overflow:"hidden"}}>
            <PHead title={selFolder.name} action={<AddBtn label="Upload"/>}/>
            <THead cols="1fr 60px 70px 110px 70px" headers={["File Name","Type","Size","Uploaded By","Date"]}/>
            {selFolder.files.map((f,i)=>{
              const ft = typeS[f.type]||{c:T.slt,bg:T.sltL};
              return (
                <div key={i} style={{display:"grid", gridTemplateColumns:"1fr 60px 70px 110px 70px", padding:"10px 15px", borderBottom:`1px solid ${T.b1}`, alignItems:"center", cursor:"pointer", transition:"background .1s"}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontSize:12.5, fontWeight:500, color:T.blu}}>{f.name}</span>
                  <Pill label={f.type} c={ft.c} bg={ft.bg}/>
                  <span style={{fontSize:11.5, color:T.t4}}>{f.size}</span>
                  <span style={{fontSize:12, color:T.t2}}>{f.by}</span>
                  <span style={{fontSize:11.5, color:T.t4}}>{f.date}</span>
                </div>
              );
            })}
          </Panel>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 13 — SITE / DPR
// ═══════════════════════════════════════════════════════════════════
function TabSite() {
  const [selDPR, setSelDPR] = useState(D.dpr[0]);
  const [view, setView]     = useState("overview");

  const VIEWS = [
    {id:"overview", l:"Overview"},
    {id:"work",     l:"Work Done"},
    {id:"material", l:"Materials"},
    {id:"tasks",    l:"Tasks"},
    {id:"photos",   l:"Photos"},
    {id:"issues",   l:"Issues"},
  ];

  // dummy photos for site
  const PHOTOS = [
    {id:1,caption:"Brickwork 1F — North wall",date:"08 Mar",by:"Vijay Sahu",color:T.blu},
    {id:2,caption:"2F column shuttering ready",date:"08 Mar",by:"Niranjan",color:T.grn},
    {id:3,caption:"Slab curing in progress",date:"07 Mar",by:"Vijay Sahu",color:T.amb},
    {id:4,caption:"Brickwork 1F — West wall",date:"07 Mar",by:"Vijay Sahu",color:T.pur},
    {id:5,caption:"Lintel casting done",date:"06 Mar",by:"Niranjan",color:T.slt},
  ];

  // tasks snapshot — from D.tasks
  const allTasks = D.tasks.flatMap(t=>t.subtasks);
  const inProgress = allTasks.filter(t=>t.status==="In Progress");
  const notStarted = allTasks.filter(t=>t.status==="Not Started");
  const done       = allTasks.filter(t=>t.status==="Done");

  if(!selDPR) return null;

  return(
    <div style={{padding:"14px 18px"}}>

      {/* Header: date switcher + Submit DPR */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <FilterTabs
          options={D.dpr.map(e=>({id:e.date,label:e.date.split(" ").slice(0,2).join(" ")}))}
          active={selDPR.date}
          onChange={d=>setSelDPR(D.dpr.find(e=>e.date===d))}/>
        <div style={{display:"flex",gap:7}}>
          <SecBtn label="Export PDF"/>
          <AddBtn label="Submit DPR"/>
        </div>
      </div>

      {/* KPI tiles — always visible */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:12}}>
        {[
          {l:"Labour",  v:selDPR.labourCount, c:T.blu},
          {l:"Machinery",v:selDPR.machinery,   c:T.slt},
          {l:"Photos",  v:selDPR.photos,       c:T.grn},
          {l:"Issues",  v:selDPR.issues.length,c:selDPR.issues.length>0?T.red:T.grn},
          {l:"Weather", v:selDPR.weather.split(" ")[0], c:T.amb},
        ].map((s,i)=>(
          <div key={i} style={{padding:"9px 12px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{s.l}</div>
            <div style={{fontSize:17,fontWeight:700,color:s.c,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Toggle bar — like material / transaction style */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,padding:"4px",marginBottom:12,display:"flex",gap:2}}>
        {VIEWS.map(v=>{
          const isA=view===v.id;
          // Badge counts
          const badge = v.id==="issues"&&selDPR.issues.length>0?selDPR.issues.length
            :v.id==="work"?selDPR.workDone.length
            :v.id==="material"?selDPR.materials.length
            :v.id==="tasks"?inProgress.length
            :v.id==="photos"?PHOTOS.length
            :null;
          return(
            <button key={v.id} onClick={()=>setView(v.id)}
              style={{flex:1,padding:"7px 10px",borderRadius:6,border:"none",background:isA?T.blu:"none",color:isA?"white":T.t3,fontSize:12,fontWeight:isA?700:400,cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:5,whiteSpace:"nowrap"}}>
              {v.l}
              {badge!=null&&<span style={{background:isA?"rgba(255,255,255,0.25)":T.b1,color:isA?"white":T.t3,fontSize:9.5,fontWeight:700,padding:"1px 6px",borderRadius:10,minWidth:18,textAlign:"center"}}>{badge}</span>}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW ── */}
      {view==="overview"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {/* Work summary */}
          <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{padding:"9px 14px",background:T.grnL,borderBottom:`1px solid ${T.grnM}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:12.5,fontWeight:700,color:T.grn}}>Work Done Today</span>
              <span style={{fontSize:10.5,color:T.grn}}>{selDPR.workDone.length} items</span>
            </div>
            <div style={{padding:"10px 14px"}}>
              {selDPR.workDone.map((w,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:7}}>
                  <div style={{width:15,height:15,borderRadius:4,background:T.grnL,border:`1px solid ${T.grnM}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                    <svg width={8} height={8} viewBox="0 0 10 10" fill="none" stroke={T.grn} strokeWidth={2.2}><path d="M2 5l2.5 2.5L8 3"/></svg>
                  </div>
                  <span style={{fontSize:12,color:T.t1,lineHeight:1.4}}>{w}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Materials used */}
          <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{padding:"9px 14px",background:T.bluL,borderBottom:`1px solid ${T.bluM}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:12.5,fontWeight:700,color:T.blu}}>Materials Used</span>
              <span style={{fontSize:10.5,color:T.blu}}>{selDPR.materials.length} items</span>
            </div>
            <div style={{padding:"10px 14px"}}>
              {selDPR.materials.map((m,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:T.blu,flexShrink:0}}/>
                  <span style={{fontSize:12.5,color:T.t1}}>{m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks snapshot */}
          <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{padding:"9px 14px",background:T.purL,borderBottom:`1px solid ${T.purM}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:12.5,fontWeight:700,color:T.pur}}>Active Tasks</span>
              <span style={{fontSize:10.5,color:T.pur}}>{inProgress.length} in progress</span>
            </div>
            <div style={{padding:"10px 14px"}}>
              {inProgress.slice(0,4).map((t,i)=>(
                <div key={i} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:12,color:T.t1,fontWeight:500}}>{t.name}</span>
                    <span style={{fontSize:11,fontWeight:600,color:T.blu}}>{t.progress}%</span>
                  </div>
                  <div style={{height:4,background:T.b1,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${t.progress}%`,background:T.blu,borderRadius:2}}/>
                  </div>
                  <div style={{fontSize:10,color:T.t4,marginTop:2}}>@{t.assignee.split(" ")[0]}</div>
                </div>
              ))}
              {inProgress.length===0&&<div style={{fontSize:12,color:T.t4}}>No tasks in progress</div>}
            </div>
          </div>

          {/* Photos + Issues combined */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {/* Photos mini */}
            <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
              <div style={{padding:"9px 14px",background:"#F0FDF4",borderBottom:`1px solid ${T.grnM}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:12.5,fontWeight:700,color:T.grn}}>Site Photos</span>
                <div style={{display:"flex",gap:6}}>
                  <button style={{fontSize:10.5,color:T.grn,background:"none",border:`1px solid ${T.grnM}`,borderRadius:5,padding:"2px 8px",cursor:"pointer"}}>Camera</button>
                  <button style={{fontSize:10.5,color:T.grn,background:"none",border:`1px solid ${T.grnM}`,borderRadius:5,padding:"2px 8px",cursor:"pointer"}}>Upload</button>
                </div>
              </div>
              <div style={{padding:"10px 14px",display:"flex",gap:8}}>
                {PHOTOS.slice(0,3).map((p,i)=>(
                  <div key={i} style={{width:64,height:64,borderRadius:7,background:p.color+"22",border:`2px solid ${p.color}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",fontSize:18}}>
                    📷
                  </div>
                ))}
                {PHOTOS.length>3&&<div style={{width:64,height:64,borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"}}>
                  <span style={{fontSize:11.5,fontWeight:600,color:T.t3}}>+{PHOTOS.length-3}</span>
                </div>}
              </div>
            </div>
            {/* Issues */}
            {selDPR.issues.length>0&&(
              <div style={{padding:"10px 13px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:9,borderLeft:`4px solid ${T.red}`}}>
                <div style={{fontSize:11.5,fontWeight:700,color:T.red,marginBottom:6}}>Issues / Snags</div>
                {selDPR.issues.map((issue,i)=>(
                  <div key={i} style={{fontSize:12,color:T.red,marginBottom:3,display:"flex",gap:6}}>
                    <span>•</span><span>{issue}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Submitted by */}
            <div style={{padding:"8px 12px",background:T.surface,borderRadius:7,border:`1px solid ${T.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11.5,color:T.t4}}>Submitted by <strong style={{color:T.t1}}>{selDPR.by}</strong></span>
              <span style={{fontSize:11,color:T.t4}}>{selDPR.date}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── WORK DONE ── */}
      {view==="work"&&(
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{padding:"9px 14px",background:T.grnL,borderBottom:`1px solid ${T.grnM}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:700,color:T.grn}}>Work Done — {selDPR.date}</span>
            <AddBtn label="Add Work Item"/>
          </div>
          <div style={{padding:"12px 16px"}}>
            {selDPR.workDone.map((w,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 0",borderBottom:`1px solid ${T.b1}`}}>
                <div style={{width:18,height:18,borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                  <svg width={9} height={9} viewBox="0 0 10 10" fill="none" stroke={T.grn} strokeWidth={2.2}><path d="M2 5l2.5 2.5L8 3"/></svg>
                </div>
                <span style={{fontSize:13,color:T.t1,lineHeight:1.5,flex:1}}>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MATERIALS ── */}
      {view==="material"&&(
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{padding:"9px 14px",background:T.bluL,borderBottom:`1px solid ${T.bluM}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:700,color:T.blu}}>Materials Used — {selDPR.date}</span>
            <AddBtn label="Add Material"/>
          </div>
          <div style={{padding:"12px 16px"}}>
            {selDPR.materials.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${T.b1}`}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:T.blu,flexShrink:0}}/>
                <span style={{fontSize:13,color:T.t1,flex:1}}>{m}</span>
                <SecBtn label="Edit"/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TASKS ── */}
      {view==="tasks"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {[{l:"In Progress",v:inProgress.length,c:T.blu},{l:"Done",v:done.length,c:T.grn},{l:"Not Started",v:notStarted.length,c:T.slt}].map((s,i)=>(
              <div key={i} style={{padding:"10px 13px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,borderTop:`3px solid ${s.c}`}}>
                <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{s.l}</div>
                <div style={{fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>
          {/* In Progress tasks */}
          {inProgress.length>0&&(
            <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
              <div style={{padding:"9px 14px",background:T.bluL,borderBottom:`1px solid ${T.bluM}`}}>
                <span style={{fontSize:12.5,fontWeight:700,color:T.blu}}>In Progress ({inProgress.length})</span>
              </div>
              {inProgress.map((t,i)=>(
                <div key={i} style={{padding:"10px 15px",borderBottom:`1px solid ${T.b1}`,transition:"background .1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{t.name}</span>
                    <span style={{fontSize:12,fontWeight:700,color:T.blu}}>{t.progress}%</span>
                  </div>
                  <div style={{height:5,background:T.b1,borderRadius:3,overflow:"hidden",marginBottom:5}}>
                    <div style={{height:"100%",width:`${t.progress}%`,background:T.blu,borderRadius:3}}/>
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <span style={{fontSize:11,color:T.t4}}>@{t.assignee}</span>
                    <span style={{fontSize:11,color:T.t4}}>{t.start} → {t.end}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Not started */}
          {notStarted.length>0&&(
            <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
              <div style={{padding:"9px 14px",background:T.sltL,borderBottom:`1px solid ${T.b2}`}}>
                <span style={{fontSize:12.5,fontWeight:700,color:T.slt}}>Not Started ({notStarted.length})</span>
              </div>
              {notStarted.map((t,i)=>(
                <div key={i} style={{padding:"9px 15px",borderBottom:`1px solid ${T.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center",transition:"background .1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:500,color:T.t2,marginBottom:2}}>{t.name}</div>
                    <div style={{fontSize:10.5,color:T.t4}}>@{t.assignee} · {t.start} → {t.end}</div>
                  </div>
                  <Pill label="Not Started" c={T.slt} bg={T.sltL}/>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PHOTOS ── */}
      {view==="photos"&&(
        <div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <button style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:7,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              📷 Take Photo
            </button>
            <button style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:7,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              📁 Upload from Gallery
            </button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
            {PHOTOS.map((p,i)=>(
              <div key={i} style={{borderRadius:9,overflow:"hidden",border:`1px solid ${T.b1}`,background:T.surface,cursor:"pointer",transition:"box-shadow .15s"}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.1)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                {/* Photo placeholder */}
                <div style={{height:130,background:`linear-gradient(135deg,${p.color}22,${p.color}44)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>📷</div>
                <div style={{padding:"8px 10px"}}>
                  <div style={{fontSize:11.5,fontWeight:600,color:T.t1,marginBottom:2}}>{p.caption}</div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:10.5,color:T.t4}}>{p.by.split(" ")[0]}</span>
                    <span style={{fontSize:10.5,color:T.t4}}>{p.date}</span>
                  </div>
                </div>
              </div>
            ))}
            {/* Add photo placeholder */}
            <div style={{height:192,borderRadius:9,border:`2px dashed ${T.b2}`,background:T.surfaceB,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:8,transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.blu;e.currentTarget.style.background=T.bluL;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b2;e.currentTarget.style.background=T.surfaceB;}}>
              <span style={{fontSize:28}}>📷</span>
              <span style={{fontSize:12,color:T.t4,fontWeight:500}}>Add Photo</span>
            </div>
          </div>
        </div>
      )}

      {/* ── ISSUES ── */}
      {view==="issues"&&(
        <div>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
            <AddBtn label="Report Issue"/>
          </div>
          {selDPR.issues.length===0
            ?<div style={{padding:"48px",textAlign:"center",background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,color:T.grn}}>
                <div style={{fontSize:28,marginBottom:10}}>✓</div>
                <div style={{fontSize:13,fontWeight:600}}>No issues reported today</div>
              </div>
            :<div>
              {selDPR.issues.map((issue,i)=>(
                <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"11px 14px",background:T.surface,borderRadius:8,border:`1px solid ${T.redM}`,borderLeft:`4px solid ${T.red}`,marginBottom:8,boxShadow:`0 1px 4px ${T.red}18`}}>
                  <div style={{width:28,height:28,borderRadius:7,background:T.redL,border:`1px solid ${T.redM}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:T.red,fontWeight:500,lineHeight:1.4}}>{issue}</div>
                    <div style={{fontSize:10.5,color:T.t4,marginTop:4}}>{selDPR.date} · {selDPR.by}</div>
                  </div>
                  <button style={{padding:"4px 10px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:10.5,fontWeight:600,cursor:"pointer",flexShrink:0}}>Resolve</button>
                </div>
              ))}
            </div>
          }
        </div>
      )}

    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// TAB 14 — MOM
// ═══════════════════════════════════════════════════════════════════
function TabMOM() {
  const [sel, setSel] = useState(D.moms[0]);
  const momS = {"Closed":{c:T.grn,bg:T.grnL},"Planned":{c:T.amb,bg:T.ambL},"Draft":{c:T.slt,bg:T.sltL}};

  return (
    <div style={{padding:"16px 18px", display:"flex", gap:14, height:"100%"}}>
      <div style={{width:270, flexShrink:0, display:"flex", flexDirection:"column", gap:8}}>
        <AddBtn label="New MOM"/>
        <div style={{marginTop:4}}/>
        {D.moms.map(m=>{
          const ms = momS[m.status]||{c:T.slt,bg:T.sltL};
          const isS = sel?.id===m.id;
          return (
            <div key={m.id} onClick={()=>setSel(m)} style={{background:T.surface, borderRadius:7, padding:"10px 13px", border:`1.5px solid ${isS?T.blu:T.b1}`, cursor:"pointer", borderLeft:`4px solid ${isS?T.blu:T.b1}`, transition:"all .14s"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5}}>
                <span style={{fontSize:12.5, fontWeight:700, color:isS?T.blu:T.t1}}>{m.no}</span>
                <Pill label={m.status} c={ms.c} bg={ms.bg}/>
              </div>
              <div style={{fontSize:11.5, color:T.t2, marginBottom:3}}>{m.type}</div>
              <div style={{fontSize:11.5, color:T.t3, marginBottom:4}}>{m.date}</div>
              <div style={{fontSize:11, color:T.t4}}>{m.attendees.length>0?m.attendees.slice(0,2).join(", ")+(m.attendees.length>2?` +${m.attendees.length-2}`:""): "No attendees yet"}</div>
            </div>
          );
        })}
      </div>

      {sel&&(
        <Panel style={{flex:1, overflow:"hidden", display:"flex", flexDirection:"column"}}>
          <PHead title={`${sel.no} — ${sel.type}`} action={
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <span style={{fontSize:11.5, color:T.t3}}>{sel.date} · {sel.venue}</span>
              {sel.next&&<span style={{fontSize:11.5, color:T.blu, fontWeight:600}}>Next: {sel.next}</span>}
              <SecBtn label="Export PDF"/>
            </div>
          }/>
          <div style={{flex:1, overflowY:"auto", padding:"16px 18px"}}>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".6px", marginBottom:8}}>Attendees</div>
              {sel.attendees.length>0?(
                <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                  {sel.attendees.map((a,i)=>(
                    <span key={i} style={{background:T.surfaceB, color:T.t1, fontSize:12.5, fontWeight:500, padding:"4px 12px", borderRadius:20, border:`1px solid ${T.b1}`}}>{a}</span>
                  ))}
                </div>
              ):<span style={{fontSize:12.5, color:T.t4, fontStyle:"italic"}}>No attendees recorded</span>}
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
              <div>
                <div style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".6px", marginBottom:8}}>Agenda</div>
                {sel.agenda.map((a,i)=>(
                  <div key={i} style={{display:"flex", gap:8, marginBottom:8, padding:"8px 11px", background:T.surfaceB, borderRadius:6, border:`1px solid ${T.b1}`, alignItems:"flex-start"}}>
                    <span style={{width:18, height:18, borderRadius:4, background:T.bluL, color:T.blu, fontSize:10, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>{i+1}</span>
                    <span style={{fontSize:12.5, color:T.t1, lineHeight:1.4}}>{a}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".6px", marginBottom:8}}>Decisions / Action Items</div>
                {sel.decisions.length>0?sel.decisions.map((d,i)=>(
                  <div key={i} style={{display:"flex", gap:8, marginBottom:8, padding:"8px 11px", background:T.grnL, borderRadius:6, border:`1px solid ${T.grnM}`, alignItems:"flex-start", borderLeft:`3px solid ${T.grn}`}}>
                    <div style={{width:16,height:16,borderRadius:4,background:T.grn,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <svg width={9} height={9} viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth={2.2}><path d="M2 5l2.5 2.5L8 3"/></svg>
                    </div>
                    <span style={{fontSize:12.5, color:T.t1, lineHeight:1.4}}>{d}</span>
                  </div>
                )):<div style={{padding:"14px", background:T.surfaceB, borderRadius:6, border:`1px solid ${T.b1}`, color:T.t4, fontSize:12.5, fontStyle:"italic"}}>No decisions — meeting is {sel.status.toLowerCase()}</div>}
              </div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PROJECT DETAIL PAGE — SHELL
// ═══════════════════════════════════════════════════════════════════
const TABS = [
  {id:"overview",   label:"Overview"},
  {id:"design",     label:"Design"},
  {id:"estimate",   label:"Estimate"},
  {id:"party",      label:"Party"},
  {id:"transaction",label:"Transaction"},
  {id:"todo",       label:"To Do"},
  {id:"task",       label:"Tasks"},
  {id:"attendance", label:"Attendance"},
  {id:"material",   label:"Material"},
  {id:"subcon",     label:"Subcon"},
  {id:"equipment",  label:"Equipment"},
  {id:"files",      label:"Files"},
  {id:"site",       label:"Site / DPR"},
  {id:"mom",        label:"MOM"},
];

function ProjectDetailPage({project=PROJ, onBack}) {
  const [tab, setTab] = useState("overview");
  const sm = STATUS_S[project.status]||{c:T.slt, bg:T.sltL};
  const margin = project.boq - project.expense;

  const tabContent = {
    overview:   <TabOverview    proj={project}/>,
    design:     <TabDesign project={project}/>,
    estimate:   <TabEstimate/>,
    party:      <TabParty/>,
    transaction:<TabTransaction/>,
    todo:       <TabTodo/>,
    task:       <TabTasks projectId={project.id}/>,
    attendance: <TabAttendance/>,
    material:   <TabMaterial project={project}/>,
    subcon:     <TabSubcon/>,
    equipment:  <TabEquipment/>,
    files:      <TabFiles/>,
    site:       <TabSite/>,
    mom:        <TabMOM/>,
  };

  return (
    <div style={{display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif", background:T.bg}}>

      {/* ── HEADER ── */}
      <div style={{background:"#1E293B", flexShrink:0}}>
        <div style={{padding:"13px 20px 11px"}}>
          <div style={{display:"flex", alignItems:"flex-start", gap:14}}>
            {onBack&&(
              <button onClick={onBack} style={{display:"inline-flex", alignItems:"center", gap:5, padding:"5px 11px", border:"1px solid rgba(255,255,255,.15)", borderRadius:6, background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.7)", fontSize:11.5, fontWeight:500, cursor:"pointer", flexShrink:0, marginTop:3, transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                All Projects
              </button>
            )}
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap"}}>
                <span style={{fontSize:17, fontWeight:700, color:"#FFFFFF", letterSpacing:"-.3px", lineHeight:1.2}}>{project.name}</span>
                <Pill label={project.status} c={sm.c} bg={`rgba(255,255,255,.1)`}/>
              </div>
              <div style={{display:"flex", gap:16, flexWrap:"wrap"}}>
                {[[project.client,"Client"],[project.city,"City"],[project.type,"Type"],[`PM: ${project.pm}`,"PM"],[`${project.start} – ${project.end}`,""]].map(([v,l],i)=>(
                  <span key={i} style={{fontSize:11.5, color:"rgba(255,255,255,.45)"}}>{v}</span>
                ))}
              </div>
            </div>
            {/* Financial chips */}
            <div style={{display:"flex", gap:12, flexShrink:0}}>
              {[["BOQ",`₹${fmt(project.boq)}`,T.sltL,T.t4],["Spent",`₹${fmt(project.expense)}`,"#FFF7ED","#D97706"],["Margin",`₹${fmt(Math.abs(margin))}`,margin>0?"#F0FDF4":"#FEF2F2",margin>0?"#059669":"#DC2626"]].map(([l,v,bg,vc])=>(
                <div key={l} style={{background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, padding:"7px 13px", textAlign:"right"}}>
                  <div style={{fontSize:9.5, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:3}}>{l}</div>
                  <div style={{fontSize:14, fontWeight:700, color:"rgba(255,255,255,.9)", fontVariantNumeric:"tabular-nums"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Progress bar */}
          <div style={{marginTop:11, display:"flex", alignItems:"center", gap:10}}>
            <span style={{fontSize:10.5, color:"rgba(255,255,255,.3)", width:60}}>Progress</span>
            <div style={{flex:1, height:4, background:"rgba(255,255,255,.1)", borderRadius:3, overflow:"hidden"}}>
              <div style={{height:"100%", width:`${project.progress}%`, background:T.blu, borderRadius:3, transition:"width .6s"}}/>
            </div>
            <span style={{fontSize:11, fontWeight:700, color:"rgba(255,255,255,.7)", fontVariantNumeric:"tabular-nums", width:32, textAlign:"right"}}>{project.progress}%</span>
          </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{background:T.surface, borderBottom:`1px solid ${T.b1}`, display:"flex", overflowX:"auto", flexShrink:0}}>
        <style>{`* { scrollbar-width: none; } *::-webkit-scrollbar { display: none; }`}</style>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"10px 16px", border:"none", background:"none", cursor:"pointer", color:tab===t.id?T.blu:T.t3, fontWeight:tab===t.id?700:400, fontSize:12.5, whiteSpace:"nowrap", borderBottom:tab===t.id?`2.5px solid ${T.blu}`:"2.5px solid transparent", transition:"all .15s", flexShrink:0, fontFamily:"inherit", letterSpacing:0}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{flex:1, overflowY:"auto", background:T.bg}}>
        {tabContent[tab]}
      </div>
    </div>
  );
}

export default ProjectDetailPage;
