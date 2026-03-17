import { useState, useMemo, useRef, useEffect } from "react";

// ── ICONS ─────────────────────────────────────────────────────
const Ic=({d,size=18,color="currentColor",sw=1.8,fill="none"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const IcMenu =(p)=><Ic {...p} d="M4 6h16M4 12h16M4 18h16"/>;
const IcAdd  =(p)=><Ic {...p} d="M12 5v14M5 12h14"/>;
const IcX    =(p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcChk  =(p)=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcDL   =(p)=><Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>;
const IcPrint=(p)=><Ic {...p} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/>;
const IcFil  =(p)=><Ic {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>;
const IcSrch =(p)=><Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;
const IcUp   =(p)=><Ic {...p} d="M12 19V5M5 12l7-7 7 7"/>;
const IcDn   =(p)=><Ic {...p} d="M12 5v14M5 12l7 7 7-7"/>;
const IcEdit =(p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcSheet=(p)=><Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
const IcXLS  =(p)=><Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13l2 4 2-4 2 4"/>;
const IcBar  =(p)=><Ic {...p} d="M18 20V10M12 20V4M6 20v-6"/>;
const IcCalc =(p)=><Ic {...p} d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2V7a2 2 0 00-2-2H9zM9 7V4M15 7V4M9 12h6M9 16h3"/>;
const IcLoc  =(p)=><Ic {...p} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0"/>;
// ── SEARCHABLE SELECT (position:fixed dropdown, tab-navigable) ───────
function SearchSelect({options,value,onChange,placeholder,accent,style:extStyle,autoFocus,onTabNext}){
  const [open,setOpen]=useState(false);
  const [q,setQ]=useState("");
  const [pos,setPos]=useState({top:0,left:0,width:160});
  const wrapRef=useRef(null);
  const inpRef=useRef(null);
  const ac=accent||"#2563EB";
  const opts=Array.isArray(options)?options:[];
  const filtered=q?opts.filter(o=>String(o).toLowerCase().includes(q.toLowerCase())):opts;

  useEffect(()=>{
    const h=e=>{if(wrapRef.current&&!wrapRef.current.contains(e.target)){setOpen(false);setQ("");}};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  const openDrop=()=>{
    const r=inpRef.current?.getBoundingClientRect();
    if(r) setPos({top:r.bottom+2,left:r.left,width:Math.max(r.width,160)});
    setQ("");setOpen(true);
  };
  const pick=v=>{onChange(v);setQ("");setOpen(false);};
  const baseH=extStyle?.height||30;

  return(
    <div ref={wrapRef} style={{position:"relative",...extStyle}}>
      <input ref={el=>{inpRef.current=el;if(autoFocus&&el)el.focus();}}
        value={open?q:(value||"")}
        onChange={e=>{setQ(e.target.value);if(!open)openDrop();}}
        onFocus={openDrop}
        placeholder={placeholder||"Select..."}
        onKeyDown={e=>{
          if(e.key==="Escape"){setOpen(false);setQ("");}
          if(e.key==="Enter"&&filtered.length>0){e.preventDefault();pick(filtered[0]);}
          if(e.key==="Tab"){
            setOpen(false);setQ("");
            if(onTabNext){e.preventDefault();onTabNext();}
          }
        }}
        style={{width:"100%",height:baseH,padding:"0 20px 0 7px",borderRadius:5,
          border:`1.5px solid ${open?ac:"#E5E7EB"}`,fontSize:11.5,outline:"none",
          boxSizing:"border-box",fontFamily:"inherit",background:"#FFFFFF",cursor:"text"}}/>
      <span style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"#9CA3AF",fontSize:9}}>▼</span>
      {open&&(
        <div style={{position:"fixed",top:pos.top,left:pos.left,width:pos.width,
          background:"#FFFFFF",borderRadius:7,border:`1.5px solid ${ac}`,
          boxShadow:"0 8px 24px rgba(0,0,0,0.15)",zIndex:9999,maxHeight:190,overflowY:"auto"}}>
          {filtered.map((o,i)=>(
            <div key={i} onMouseDown={e=>{e.preventDefault();pick(o);}}
              style={{padding:"6px 10px",fontSize:12,cursor:"pointer",
                color:o===value?ac:"#111827",fontWeight:o===value?700:400,
                background:o===value?(ac+"18"):"transparent",
                borderBottom:i<filtered.length-1?"1px solid #F3F4F6":"none",whiteSpace:"nowrap"}}
              onMouseEnter={e=>e.currentTarget.style.background="#F1F5F9"}
              onMouseLeave={e=>e.currentTarget.style.background=o===value?(ac+"18"):"transparent"}>
              {o}
            </div>
          ))}
          {!filtered.length&&<div style={{padding:"8px 10px",fontSize:11,color:"#9CA3AF",textAlign:"center"}}>No match</div>}
        </div>
      )}
    </div>
  );
}



// ── THEME ─────────────────────────────────────────────────────
const T={
  bg:"#F4F6F9",surface:"#FFFFFF",surfaceB:"#F8F9FB",sb:"#0D1B2A",
  t1:"#111827",t2:"#374151",t3:"#6B7280",t4:"#9CA3AF",
  b1:"#E5E7EB",b2:"#D1D5DB",
  blu:"#2563EB",bluL:"#EFF6FF",bluM:"#BFDBFE",
  grn:"#059669",grnL:"#ECFDF5",grnM:"#A7F3D0",
  amb:"#D97706",ambL:"#FFFBEB",ambM:"#FDE68A",
  red:"#DC2626",redL:"#FEF2F2",redM:"#FECACA",
  slt:"#64748B",sltL:"#F1F5F9",
  pur:"#7C3AED",purL:"#F5F3FF",
};
const fmtN=n=>n==null?"—":Number(n).toLocaleString("en-IN");
const fmtRs=n=>"₹"+fmtN(Math.abs(n));
const fmtDate=s=>s?new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"-";
const fmtShort=s=>s?new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"-";
const TODAY="2026-03-16";

// ── MASTER DATA ───────────────────────────────────────────────
const SITES=["Shubham & NK 623","Tikendra Residence","Esther Risali","Amarendra Villa","Neha Sagar Office"];
const HEADS=["Material","Labour","Contractor","Site Expense","Subcontractor","Office","Equipment","Loan","PA Bill","Other"];
const MOPS=["Cash","Cheque","Bank Transfer","UPI","NEFT"];
const ACCOUNTS=["gb pnb","gb param","bb pnb","central cash","gb Sunny","gb neeraj"];
const PARTIES=["Nand Kishor Agrawal","Tikendra Banchhor","Esther Group","Amarendra Shrivastava","Neha Sagar Ltd",
  "Abhay Traders","Tata Steel","Ambuja Cement","National Bricks","Laxmi Electrical","Rupesh Sahu","Naresh",
  "Laxmikant","Sandeep C.","Vijay Sahu","Niranjan","Plumber Arun","Dr. Fixit Suppliers","Other"];

// ── CASH DATA (24 entries with party) ────────────────────────
const INIT_CASH=[
  {id:"C001",date:"2026-03-01",recAmt:150000,payAmt:0,   party:"Nand Kishor Agrawal",  desc:"2nd instalment payment",           account:"gb pnb",      head:"PA Bill",      mop:"Bank Transfer",site:"Shubham & NK 623"},
  {id:"C002",date:"2026-03-01",recAmt:0,    payAmt:38000,party:"Tata Steel",            desc:"TMT Steel 12mm",                   account:"gb pnb",      head:"Material",     mop:"Cheque",        site:"Shubham & NK 623"},
  {id:"C003",date:"2026-03-02",recAmt:0,    payAmt:4500, party:"Other",                 desc:"Labour nasta + water",             account:"central cash",head:"Site Expense",  mop:"Cash",          site:"Shubham & NK 623"},
  {id:"C004",date:"2026-03-03",recAmt:80000,payAmt:0,    party:"Tikendra Banchhor",     desc:"Advance receipt",                  account:"gb param",    head:"PA Bill",      mop:"UPI",           site:"Tikendra Residence"},
  {id:"C005",date:"2026-03-04",recAmt:0,    payAmt:19000,party:"Ambuja Cement",         desc:"OPC 53 Cement 50 bags",            account:"gb pnb",      head:"Material",     mop:"Cheque",        site:"Shubham & NK 623"},
  {id:"C006",date:"2026-03-05",recAmt:0,    payAmt:5000, party:"Niranjan",              desc:"Advance to site supervisor",       account:"gb param",    head:"Labour",       mop:"Cash",          site:"Shubham & NK 623"},
  {id:"C007",date:"2026-03-06",recAmt:200000,payAmt:0,   party:"Esther Group",          desc:"Milestone 4 receipt",              account:"bb pnb",      head:"PA Bill",      mop:"NEFT",          site:"Esther Risali"},
  {id:"C008",date:"2026-03-07",recAmt:0,    payAmt:45000,party:"Rupesh Sahu",           desc:"Civil contractor March payment",   account:"gb pnb",      head:"Contractor",   mop:"Cheque",        site:"Shubham & NK 623"},
  {id:"C009",date:"2026-03-08",recAmt:0,    payAmt:12500,party:"Abhay Traders",         desc:"River sand 5 CuM + 20mm aggregate",account:"central cash",head:"Material",     mop:"Cash",          site:"Shubham & NK 623"},
  {id:"C010",date:"2026-03-08",recAmt:0,    payAmt:8750, party:"Plumber Arun",          desc:"Plumbing work payment",            account:"gb param",    head:"Subcontractor",mop:"UPI",           site:"Amarendra Villa"},
  {id:"C011",date:"2026-03-10",recAmt:120000,payAmt:0,   party:"Amarendra Shrivastava", desc:"Advance receipt",                  account:"gb pnb",      head:"PA Bill",      mop:"Cheque",        site:"Amarendra Villa"},
  {id:"C012",date:"2026-03-10",recAmt:0,    payAmt:28000,party:"National Bricks",       desc:"Red bricks 5000 nos",             account:"gb pnb",      head:"Material",     mop:"Cheque",        site:"Tikendra Residence"},
  {id:"C013",date:"2026-03-11",recAmt:0,    payAmt:3200, party:"Other",                 desc:"Diesel + petrol site vehicle",     account:"central cash",head:"Site Expense",  mop:"Cash",          site:"Shubham & NK 623"},
  {id:"C014",date:"2026-03-12",recAmt:0,    payAmt:65000,party:"Laxmi Electrical",      desc:"Electrical bill no 4",             account:"gb pnb",      head:"Subcontractor",mop:"NEFT",          site:"Neha Sagar Office"},
  {id:"C015",date:"2026-03-13",recAmt:50000,payAmt:0,    party:"Neha Sagar Ltd",        desc:"Monthly instalment receipt",       account:"bb pnb",      head:"PA Bill",      mop:"Bank Transfer", site:"Neha Sagar Office"},
  {id:"C016",date:"2026-03-13",recAmt:0,    payAmt:9500, party:"Other",                 desc:"Safety helmets + PPE",             account:"central cash",head:"Site Expense",  mop:"Cash",          site:"Shubham & NK 623"},
  {id:"C017",date:"2026-03-14",recAmt:0,    payAmt:14000,party:"Other",                 desc:"Daily workers wages - 15 workers", account:"gb param",    head:"Labour",       mop:"Cash",          site:"Shubham & NK 623"},
  {id:"C018",date:"2026-03-14",recAmt:0,    payAmt:22000,party:"Dr. Fixit Suppliers",   desc:"Waterproofing material 200 sqm",   account:"gb pnb",      head:"Material",     mop:"Cheque",        site:"Shubham & NK 623"},
  {id:"C019",date:"2026-03-15",recAmt:0,    payAmt:5500, party:"Other",                 desc:"Office stationery + printing",     account:"central cash",head:"Office",        mop:"Cash",          site:"Shubham & NK 623"},
  {id:"C020",date:"2026-03-15",recAmt:0,    payAmt:7800, party:"Abhay Traders",         desc:"PVC conduit + wiring material",    account:"gb pnb",      head:"Material",     mop:"Cheque",        site:"Neha Sagar Office"},
  {id:"C021",date:"2026-03-15",recAmt:40000,payAmt:0,    party:"Tikendra Banchhor",     desc:"2nd instalment receipt",           account:"gb param",    head:"PA Bill",      mop:"UPI",           site:"Tikendra Residence"},
  {id:"C022",date:"2026-03-16",recAmt:0,    payAmt:35000,party:"Naresh",                desc:"March challan payment",            account:"gb pnb",      head:"Contractor",   mop:"Cheque",        site:"Tikendra Residence"},
  {id:"C023",date:"2026-03-16",recAmt:0,    payAmt:18500,party:"Vijay Sahu",            desc:"March salary payment",             account:"gb pnb",      head:"Labour",       mop:"Bank Transfer", site:"Shubham & NK 623"},
  {id:"C024",date:"2026-03-16",recAmt:0,    payAmt:4200, party:"Other",                 desc:"Miscellaneous site expenses",      account:"central cash",head:"Site Expense",  mop:"Cash",          site:"Esther Risali"},
];

// ── MATERIAL CHALLAN / PURCHASE REGISTER ─────────────────────
const MAT_HEADS=["Civil","Electrical","Plumbing","Finishing","Structural","Mechanical","Safety","General"];
const MAT_UNITS=["Bag","MT","CuM","Sqft","Nos","Ltr","Kg","RFt","Set","Box"];
const SUPPLIERS=["Abhay Traders","Tata Steel","Ambuja Cement","National Bricks","Laxmi Electrical",
  "Dr. Fixit Suppliers","Somany Tiles","Asian Paints","Shree Cement","Rajesh Electricals","Other"];

const INIT_MATERIAL=[
  {id:"M001",billDate:"2026-03-01",delivDate:"2026-03-01",
   materialName:"TMT Steel 12mm",matHead:"Structural",
   desc:"12mm Fe500 TMT bars for slab reinforcement",
   party:"Tata Steel",site:"Shubham & NK 623",
   qty:2000,unit:"Kg",price:58,total:116000,
   account:"gb pnb",mop:"Cheque",status:"Paid",remark:""},
  {id:"M002",billDate:"2026-03-04",delivDate:"2026-03-05",
   materialName:"OPC 53 Cement",matHead:"Civil",
   desc:"Ambuja OPC 53 grade for slab casting",
   party:"Ambuja Cement",site:"Shubham & NK 623",
   qty:50,unit:"Bag",price:380,total:19000,
   account:"gb pnb",mop:"Cheque",status:"Paid",remark:"50 bags delivered site godown"},
  {id:"M003",billDate:"2026-03-06",delivDate:"2026-03-07",
   materialName:"River Sand",matHead:"Civil",
   desc:"River sand for plastering and brickwork",
   party:"Abhay Traders",site:"Shubham & NK 623",
   qty:5,unit:"CuM",price:1800,total:9000,
   account:"central cash",mop:"Cash",status:"Paid",remark:""},
  {id:"M004",billDate:"2026-03-06",delivDate:"2026-03-07",
   materialName:"20mm Aggregate",matHead:"Civil",
   desc:"Coarse aggregate for concrete mix",
   party:"Abhay Traders",site:"Shubham & NK 623",
   qty:3,unit:"CuM",price:1100,total:3300,
   account:"central cash",mop:"Cash",status:"Paid",remark:""},
  {id:"M005",billDate:"2026-03-08",delivDate:"2026-03-09",
   materialName:"Red Clay Bricks",matHead:"Civil",
   desc:"Class A red bricks 9×4×3 inch",
   party:"National Bricks",site:"Tikendra Residence",
   qty:5000,unit:"Nos",price:5.6,total:28000,
   account:"gb pnb",mop:"Cheque",status:"Paid",remark:""},
  {id:"M006",billDate:"2026-03-10",delivDate:"2026-03-11",
   materialName:"Dr. Fixit Torchshield 4mm",matHead:"Civil",
   desc:"Waterproofing membrane for GF slab",
   party:"Dr. Fixit Suppliers",site:"Shubham & NK 623",
   qty:200,unit:"Sqft",price:110,total:22000,
   account:"gb pnb",mop:"Cheque",status:"Paid",remark:"GF slab waterproofing"},
  {id:"M007",billDate:"2026-03-12",delivDate:"2026-03-13",
   materialName:"PVC Conduit 25mm",matHead:"Electrical",
   desc:"ISI marked PVC conduit pipes for wiring",
   party:"Rajesh Electricals",site:"Neha Sagar Office",
   qty:120,unit:"RFt",price:45,total:5400,
   account:"gb pnb",mop:"Cheque",status:"Paid",remark:""},
  {id:"M008",billDate:"2026-03-12",delivDate:"2026-03-13",
   materialName:"FR Wiring 2.5mm",matHead:"Electrical",
   desc:"Polycab FR wiring for lighting circuit",
   party:"Rajesh Electricals",site:"Neha Sagar Office",
   qty:200,unit:"RFt",price:12,total:2400,
   account:"gb pnb",mop:"Cheque",status:"Paid",remark:""},
  {id:"M009",billDate:"2026-03-14",delivDate:"2026-03-14",
   materialName:"OPC 53 Cement",matHead:"Civil",
   desc:"Foundation concrete for Amarendra Villa",
   party:"Ambuja Cement",site:"Amarendra Villa",
   qty:80,unit:"Bag",price:380,total:30400,
   account:"gb pnb",mop:"Cheque",status:"Paid",remark:"Foundation casting"},
  {id:"M010",billDate:"2026-03-15",delivDate:"2026-03-16",
   materialName:"Somany 800×800 Tile",matHead:"Finishing",
   desc:"Ivory Matt GF living + kitchen",
   party:"Somany Tiles",site:"Esther Risali",
   qty:320,unit:"Sqft",price:68,total:21760,
   account:"bb pnb",mop:"Cheque",status:"Pending",remark:"Replacement for wrong batch"},
  {id:"M011",billDate:"2026-03-15",delivDate:"2026-03-16",
   materialName:"TMT Steel 8mm",matHead:"Structural",
   desc:"8mm bars for column cage Tikendra",
   party:"Tata Steel",site:"Tikendra Residence",
   qty:800,unit:"Kg",price:60,total:48000,
   account:"gb pnb",mop:"NEFT",status:"Pending",remark:""},
  {id:"M012",billDate:"2026-03-16",delivDate:"2026-03-16",
   materialName:"Safety Helmets ISI",matHead:"Safety",
   desc:"ISI mark helmets for site workers",
   party:"Other",site:"Shubham & NK 623",
   qty:15,unit:"Nos",price:350,total:5250,
   account:"central cash",mop:"Cash",status:"Paid",remark:"PPE compliance"},
];

// ── PROJECT PROGRESS DATA ─────────────────────────────────────
const PROJECTS=[
  {id:1,name:"Shubham & NK 623",  site:"Raipur",  start:"2025-01-10",target:"2026-07-31",contract:4250000,billed:2890000,received:2550000,expenses:1820000,progress:68, status:"Ongoing",
   phases:[{name:"Foundation",pct:100,status:"Done"},{name:"Structure",pct:72,status:"In Progress"},{name:"Brickwork",pct:55,status:"In Progress"},{name:"Plaster",pct:30,status:"In Progress"},{name:"Finishing",pct:0,status:"Pending"}]},
  {id:2,name:"Tikendra Residence",site:"Raipur",  start:"2025-06-01",target:"2026-10-31",contract:2800000,billed:1176000,received:1000000,expenses:740000, progress:42, status:"Ongoing",
   phases:[{name:"Foundation",pct:100,status:"Done"},{name:"Structure",pct:80,status:"In Progress"},{name:"Brickwork",pct:40,status:"In Progress"},{name:"Plaster",pct:0,status:"Pending"},{name:"Finishing",pct:0,status:"Pending"}]},
  {id:3,name:"Esther Risali",     site:"Bilaspur",start:"2024-05-15",target:"2026-04-30",contract:8750000,billed:7963000,received:7500000,expenses:5420000,progress:91, status:"Near Completion",
   phases:[{name:"Foundation",pct:100,status:"Done"},{name:"Structure",pct:100,status:"Done"},{name:"Brickwork",pct:100,status:"Done"},{name:"Plaster",pct:95,status:"In Progress"},{name:"Finishing",pct:65,status:"In Progress"}]},
  {id:4,name:"Amarendra Villa",   site:"Raipur",  start:"2025-12-01",target:"2027-06-30",contract:5500000,billed:1265000,received:1200000,expenses:870000, progress:23, status:"Ongoing",
   phases:[{name:"Foundation",pct:100,status:"Done"},{name:"Structure",pct:15,status:"In Progress"},{name:"Brickwork",pct:0,status:"Pending"},{name:"Plaster",pct:0,status:"Pending"},{name:"Finishing",pct:0,status:"Pending"}]},
  {id:5,name:"Neha Sagar Office", site:"Durg",    start:"2025-08-01",target:"2026-12-31",contract:3200000,billed:1760000,received:1600000,expenses:1100000,progress:55, status:"Ongoing",
   phases:[{name:"Foundation",pct:100,status:"Done"},{name:"Structure",pct:100,status:"Done"},{name:"Brickwork",pct:90,status:"In Progress"},{name:"Plaster",pct:60,status:"In Progress"},{name:"Finishing",pct:10,status:"In Progress"}]},
];

// ── HELPERS ───────────────────────────────────────────────────
const Pill=({label,c,bg})=>(
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20,whiteSpace:"nowrap"}}>{label}</span>
);

// Download CSV helper
function downloadCSV(filename, rows){
  const csv=rows.map(r=>r.map(c=>typeof c==="string"&&c.includes(",")?`"${c}"`:c).join(",")).join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();
}

// Print HTML helper
function printHTML(title, html){
  const w=window.open("","_blank","width=900,height=700");
  w.document.write(`<html><head><title>${title}</title>
  <style>
    *{font-family:Arial,sans-serif;font-size:11px;box-sizing:border-box}
    body{padding:20px;max-width:900px;margin:0 auto}
    h1{font-size:16px;color:#0D1B2A;margin:0 0 4px}
    h2{font-size:13px;color:#374151;margin:14px 0 6px}
    .header{background:#0D1B2A;color:white;padding:14px 18px;border-radius:6px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center}
    .header-sub{font-size:10px;color:rgba(255,255,255,0.6);margin-top:3px}
    table{width:100%;border-collapse:collapse;margin-bottom:14px}
    th{background:#F8F9FB;font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:.4px;color:#6B7280;padding:7px 10px;border:1px solid #E5E7EB;text-align:left}
    td{padding:7px 10px;border:1px solid #E5E7EB;vertical-align:top}
    tr:nth-child(even) td{background:#FAFAFA}
    .rec{color:#059669;font-weight:700}
    .pay{color:#DC2626;font-weight:700}
    .total-row td{background:#EFF6FF;font-weight:800;border-top:2px solid #2563EB}
    .day-header td{background:#F4F6F9;font-weight:700;color:#111827;border-top:2px solid #E5E7EB}
    .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
    .summary-box{padding:10px 14px;border-radius:6px;border:1px solid #E5E7EB;border-top-width:3px}
    .footer{font-size:9px;color:#9CA3AF;margin-top:20px;padding-top:10px;border-top:1px solid #E5E7EB;text-align:center}
    .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px}
    .sig-box{text-align:center;padding-top:30px;border-top:1px solid #E5E7EB;font-size:10px;color:#6B7280}
    @media print{body{padding:10px}}
  </style></head><body>${html}
  <p class="footer">GB Buildcon Construction Management · Generated: ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
  </body></html>`);
  w.document.close();setTimeout(()=>w.print(),500);
}

// ══════════════════════════════════════════════════════════════
// MODULE 1 — CASH BOOK + DAY BOOK
// ══════════════════════════════════════════════════════════════
function CashBookModule(){
  const [entries,setEntries]=useState(INIT_CASH);
  const [view,setView]=useState("cashbook"); // cashbook | daybook
  const [fSite,setFSite]=useState("All");
  const [fHead,setFHead]=useState("All");
  const [fMOP,setFMOP]=useState("All");
  const [fAcc,setFAcc]=useState("All");
  const [fParty,setFParty]=useState("All");
  const [fFrom,setFFrom]=useState("2026-03-01");
  const [fTo,setFTo]=useState("2026-03-16");
  const [search,setSearch]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [newRow,setNewRow]=useState({date:TODAY,recAmt:"",payAmt:"",party:"",desc:"",head:HEADS[0],site:SITES[0]});
  // Refs for tab navigation in add form
  const cashRefs={date:useRef(null),recAmt:useRef(null),payAmt:useRef(null),party:useRef(null),desc:useRef(null),head:useRef(null),site:useRef(null),save:useRef(null)};
  const cashOrder=["date","recAmt","payAmt","party","desc","head","site","save"];
  const focusNext=(cur)=>{const i=cashOrder.indexOf(cur);const nx=cashOrder[i+1];if(nx&&cashRefs[nx]?.current)cashRefs[nx].current.focus();};

  const filtered=useMemo(()=>entries.filter(e=>{
    if(fSite!=="All"&&e.site!==fSite) return false;
    if(fHead!=="All"&&e.head!==fHead) return false;
    if(fMOP!=="All"&&e.mop!==fMOP) return false;
    if(fAcc!=="All"&&e.account!==fAcc) return false;
    if(fParty!=="All"&&e.party!==fParty) return false;
    if(e.date<fFrom||e.date>fTo) return false;
    if(search&&!e.desc.toLowerCase().includes(search.toLowerCase())&&!e.party?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a,b)=>a.date.localeCompare(b.date)),[entries,fSite,fHead,fMOP,fAcc,fParty,fFrom,fTo,search]);

  // Running balance for cashbook
  let runBal=0;
  const withBal=filtered.map(e=>{runBal+=e.recAmt-e.payAmt;return{...e,runBal};});

  // Day-wise grouping for daybook
  const daybook=useMemo(()=>{
    const map={};
    filtered.forEach(e=>{
      if(!map[e.date]) map[e.date]={date:e.date,entries:[],rec:0,pay:0};
      map[e.date].entries.push(e);
      map[e.date].rec+=e.recAmt;
      map[e.date].pay+=e.payAmt;
    });
    let rb=0;
    return Object.values(map).sort((a,b)=>a.date.localeCompare(b.date)).map(d=>{rb+=d.rec-d.pay;return{...d,runBal:rb};});
  },[filtered]);

  const totalRec=filtered.reduce((s,e)=>s+e.recAmt,0);
  const totalPay=filtered.reduce((s,e)=>s+e.payAmt,0);
  const balance=totalRec-totalPay;

  const upd=k=>e=>setNewRow(p=>({...p,[k]:e.target.value}));

  const addEntry=()=>{
    if(!newRow.desc.trim()) return;
    const e={...newRow,id:`C${String(entries.length+1).padStart(3,"0")}`,recAmt:Number(newRow.recAmt)||0,payAmt:Number(newRow.payAmt)||0};
    setEntries(p=>[...p,e]);
    setNewRow({date:TODAY,recAmt:"",payAmt:"",party:"",desc:"",head:HEADS[0],site:SITES[0]});
    setTimeout(()=>cashRefs.date?.current?.focus(),30);
  };

  // Excel download — Cashbook
  const dlExcelCash=()=>{
    const rows=[
      ["GB Buildcon — Cash Book"],
      [`Period: ${fFrom} to ${fTo}  |  Site: ${fSite}  |  Generated: ${TODAY}`],
      [],
      ["#","Date","Party","Description","Account","Head","MOP","Site","Receipt (₹)","Payment (₹)","Balance (₹)"],
      ...withBal.map(e=>[e.id,e.date,e.party||"",e.desc,e.account,e.head,e.mop,e.site,e.recAmt||"",e.payAmt||"",e.runBal]),
      [],
      ["","","","","","","TOTAL",totalRec,totalPay,balance],
    ];
    downloadCSV(`CashBook_${fFrom}_${fTo}.csv`,rows);
  };

  // Excel download — Daybook
  const dlExcelDay=()=>{
    const rows=[
      ["GB Buildcon — Day Book"],
      [`Period: ${fFrom} to ${fTo}  |  Generated: ${TODAY}`],
      [],
      ["Date","Day Receipts (₹)","Day Payments (₹)","Day Balance (₹)","Running Balance (₹)","Entries"],
      ...daybook.map(d=>[d.date,d.rec,d.pay,d.rec-d.pay,d.runBal,d.entries.map(e=>e.desc).join(" | ")]),
      [],
      ["TOTAL",totalRec,totalPay,balance,"",""],
    ];
    downloadCSV(`DayBook_${fFrom}_${fTo}.csv`,rows);
  };

  const printCash=()=>{
    const rows=withBal.map((e,i)=>`
      <tr>
        <td>${fmtShort(e.date)}</td>
        <td style="font-weight:600">${e.party||"—"}</td>
        <td>${e.desc}</td>
        <td>${e.account}</td>
        <td><span style="font-size:9px;padding:2px 7px;border-radius:20px;background:${e.head==="Material"?"#EFF6FF":e.head==="Labour"?"#ECFDF5":e.head==="PA Bill"?"#F5F3FF":"#F8F9FB"};color:${e.head==="Material"?"#2563EB":e.head==="Labour"?"#059669":e.head==="PA Bill"?"#7C3AED":"#374151"}">${e.head}</span></td>
        <td>${e.mop}</td>
        <td class="rec">${e.recAmt>0?fmtRs(e.recAmt):""}</td>
        <td class="pay">${e.payAmt>0?fmtRs(e.payAmt):""}</td>
        <td style="font-weight:700;color:${e.runBal>=0?"#2563EB":"#DC2626"}">${fmtRs(e.runBal)}</td>
      </tr>`).join("");
    printHTML("Cash Book — GB Buildcon",`
      <div class="header">
        <div><h1>GB Buildcon — Cash Book</h1><div class="header-sub">Period: ${fFrom} to ${fTo}  &nbsp;|&nbsp;  Site: ${fSite}</div></div>
        <div style="text-align:right;font-size:11px;color:rgba(255,255,255,0.7)">Entries: ${filtered.length}<br/>Net Balance: ${fmtRs(balance)}</div>
      </div>
      <div class="summary-grid">
        <div class="summary-box" style="border-top-color:#059669"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Total Receipt</div><div style="font-size:16px;font-weight:800;color:#059669">${fmtRs(totalRec)}</div></div>
        <div class="summary-box" style="border-top-color:#DC2626"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Total Payment</div><div style="font-size:16px;font-weight:800;color:#DC2626">${fmtRs(totalPay)}</div></div>
        <div class="summary-box" style="border-top-color:${balance>=0?"#2563EB":"#DC2626"}"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Net Balance</div><div style="font-size:16px;font-weight:800;color:${balance>=0?"#2563EB":"#DC2626"}">${fmtRs(balance)}</div></div>
      </div>
      <table>
        <tr><th>Date</th><th>Party</th><th>Description</th><th>Account</th><th>Head</th><th>MOP</th><th>Receipt ₹</th><th>Payment ₹</th><th>Balance ₹</th></tr>
        ${rows}
        <tr class="total-row"><td colspan="6" style="text-align:right">TOTAL</td><td class="rec">${fmtRs(totalRec)}</td><td class="pay">${fmtRs(totalPay)}</td><td style="color:${balance>=0?"#2563EB":"#DC2626"};font-weight:800">${fmtRs(balance)}</td></tr>
      </table>`);
  };

  const printDay=()=>{
    const rows=daybook.map(d=>`
      <tr class="day-header"><td colspan="3"><strong>${fmtDate(d.date)}</strong></td><td class="rec">${fmtRs(d.rec)}</td><td class="pay">${fmtRs(d.pay)}</td><td style="font-weight:700;color:${d.runBal>=0?"#2563EB":"#DC2626"}">${fmtRs(d.runBal)}</td></tr>
      ${d.entries.map(e=>`<tr><td></td><td>${e.desc}</td><td>${e.account} · ${e.mop}</td><td class="rec" style="font-weight:400">${e.recAmt>0?fmtRs(e.recAmt):""}</td><td class="pay" style="font-weight:400">${e.payAmt>0?fmtRs(e.payAmt):""}</td><td></td></tr>`).join("")}
    `).join("");
    printHTML("Day Book — GB Buildcon",`
      <div class="header"><div><h1>GB Buildcon — Day Book</h1><div class="header-sub">Period: ${fFrom} to ${fTo}</div></div></div>
      <div class="summary-grid">
        <div class="summary-box" style="border-top-color:#059669"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Total Receipt</div><div style="font-size:16px;font-weight:800;color:#059669">${fmtRs(totalRec)}</div></div>
        <div class="summary-box" style="border-top-color:#DC2626"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Total Payment</div><div style="font-size:16px;font-weight:800;color:#DC2626">${fmtRs(totalPay)}</div></div>
        <div class="summary-box" style="border-top-color:#2563EB"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Working Days</div><div style="font-size:16px;font-weight:800;color:#2563EB">${daybook.length}</div></div>
      </div>
      <table>
        <tr><th></th><th>Description / Summary</th><th>Account · MOP</th><th>Receipt ₹</th><th>Payment ₹</th><th>Balance ₹</th></tr>
        ${rows}
        <tr class="total-row"><td colspan="3" style="text-align:right">TOTAL</td><td class="rec">${fmtRs(totalRec)}</td><td class="pay">${fmtRs(totalPay)}</td><td>${fmtRs(balance)}</td></tr>
      </table>`);
  };

  const selStyle={height:30,padding:"0 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,background:T.surface,fontSize:12,color:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"};

  return(
    <div>
      {/* Summary tiles */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
        {[{l:"Total Receipt",v:fmtRs(totalRec),c:T.grn},{l:"Total Payment",v:fmtRs(totalPay),c:T.red},{l:"Net Balance",v:fmtRs(Math.abs(balance)),c:balance>=0?T.blu:T.red},{l:"Entries",v:filtered.length,c:T.slt}].map((s,i)=>(
          <div key={i} style={{padding:"11px 14px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{s.l}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
            {i===2&&<div style={{fontSize:9.5,color:T.t4,marginTop:2}}>{balance>=0?"Surplus":"Deficit"}</div>}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"10px 12px",marginBottom:10}}>
        {/* Row 1: View toggle + date range */}
        <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
          <div style={{display:"flex",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,padding:3,gap:2}}>
            {[["cashbook","Cash Book"],["daybook","Day Book"]].map(([id,l])=>(
              <button key={id} onClick={()=>setView(id)}
                style={{padding:"5px 12px",borderRadius:5,border:"none",background:view===id?T.blu:"none",color:view===id?"white":T.t3,fontSize:12,fontWeight:view===id?700:400,cursor:"pointer"}}>
                {l}
              </button>
            ))}
          </div>
          <input type="date" value={fFrom} onChange={e=>setFFrom(e.target.value)} style={{...selStyle,width:130}}/>
          <span style={{fontSize:11,color:T.t4}}>to</span>
          <input type="date" value={fTo} onChange={e=>setFTo(e.target.value)} style={{...selStyle,width:130}}/>
          <div style={{position:"relative",flex:1,minWidth:160}}>
            <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSrch size={12} color={T.t4}/></span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search description..."
              style={{...selStyle,width:"100%",paddingLeft:24,boxSizing:"border-box"}}/>
          </div>
        </div>
        {/* Row 2: Filters + buttons */}
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <select value={fSite} onChange={e=>setFSite(e.target.value)} style={{...selStyle,borderColor:fSite!=="All"?T.blu:T.b1,background:fSite!=="All"?T.bluL:T.surface,color:fSite!=="All"?T.blu:T.t2}}>
            <option value="All">All Sites</option>{SITES.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={fHead} onChange={e=>setFHead(e.target.value)} style={{...selStyle,borderColor:fHead!=="All"?T.blu:T.b1,background:fHead!=="All"?T.bluL:T.surface,color:fHead!=="All"?T.blu:T.t2}}>
            <option value="All">All Heads</option>{HEADS.map(h=><option key={h}>{h}</option>)}
          </select>
          <select value={fMOP} onChange={e=>setFMOP(e.target.value)} style={{...selStyle,borderColor:fMOP!=="All"?T.blu:T.b1,background:fMOP!=="All"?T.bluL:T.surface,color:fMOP!=="All"?T.blu:T.t2}}>
            <option value="All">All MOP</option>{MOPS.map(m=><option key={m}>{m}</option>)}
          </select>
          <select value={fAcc} onChange={e=>setFAcc(e.target.value)} style={{...selStyle,borderColor:fAcc!=="All"?T.blu:T.b1,background:fAcc!=="All"?T.bluL:T.surface,color:fAcc!=="All"?T.blu:T.t2}}>
            <option value="All">All Accounts</option>{ACCOUNTS.map(a=><option key={a}>{a}</option>)}
          </select>
          <select value={fParty} onChange={e=>setFParty(e.target.value)} style={{...selStyle,borderColor:fParty!=="All"?T.pur:T.b1,background:fParty!=="All"?T.purL:T.surface,color:fParty!=="All"?T.pur:T.t2}}>
            <option value="All">All Parties</option>{PARTIES.map(p=><option key={p}>{p}</option>)}
          </select>
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            <button onClick={view==="cashbook"?dlExcelCash:dlExcelDay}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
              <IcXLS size={13} color={T.grn}/> Excel
            </button>
            <button onClick={view==="cashbook"?printCash:printDay}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
              <IcPrint size={13} color={T.blu}/> PDF / Print
            </button>
            <button onClick={()=>setShowAdd(s=>!s)}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
              <IcAdd size={12} color="white"/> Add Entry
            </button>
          </div>
        </div>
      </div>

      {/* Add entry form */}
      {showAdd&&(
        <div style={{background:T.surface,borderRadius:8,border:`1.5px solid ${T.bluM}`,padding:"12px 14px",marginBottom:10}}>
          <div style={{display:"grid",gridTemplateColumns:"110px 110px 110px 1fr 1fr 130px 150px auto",gap:7,alignItems:"end"}}>
            <div>
              <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:3}}>Date</label>
              <input ref={cashRefs.date} type="date" value={newRow.date} onChange={upd("date")}
                onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();focusNext("date");}}}
                style={{width:"100%",height:30,padding:"0 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <div>
              <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:3}}>Receipt ₹</label>
              <input ref={cashRefs.recAmt} type="number" value={newRow.recAmt} onChange={upd("recAmt")} placeholder="0"
                onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();focusNext("recAmt");}}}
                style={{width:"100%",height:30,padding:"0 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <div>
              <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:3}}>Payment ₹</label>
              <input ref={cashRefs.payAmt} type="number" value={newRow.payAmt} onChange={upd("payAmt")} placeholder="0"
                onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();focusNext("payAmt");}}}
                style={{width:"100%",height:30,padding:"0 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <div>
              <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:3}}>Party *</label>
              <SearchSelect options={PARTIES} value={newRow.party} onChange={v=>upd("party")({target:{value:v}})}
                placeholder="Party name..." accent={T.pur}
                style={{height:30}} onTabNext={()=>focusNext("party")}/>
            </div>
            <div>
              <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:3}}>Description *</label>
              <input ref={cashRefs.desc} value={newRow.desc} onChange={upd("desc")} placeholder="What is this for..."
                onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();focusNext("desc");}}}
                style={{width:"100%",height:30,padding:"0 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <div>
              <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:3}}>Head</label>
              <SearchSelect options={HEADS} value={newRow.head} onChange={v=>upd("head")({target:{value:v}})}
                style={{height:30}} onTabNext={()=>focusNext("head")}/>
            </div>
            <div>
              <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:3}}>Site</label>
              <SearchSelect options={SITES} value={newRow.site} onChange={v=>upd("site")({target:{value:v}})}
                style={{height:30}} onTabNext={()=>cashRefs.save?.current?.focus()}/>
            </div>
            <div style={{display:"flex",gap:5,alignItems:"flex-end"}}>
              <button ref={cashRefs.save} onClick={addEntry}
                onKeyDown={e=>{if(e.key==="Enter")addEntry();}}
                style={{height:30,padding:"0 12px",borderRadius:5,background:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>Save</button>
              <button onClick={()=>setShowAdd(false)} style={{height:30,padding:"0 10px",borderRadius:5,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,color:T.t3,cursor:"pointer"}}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CASH BOOK VIEW ── */}
      {view==="cashbook"&&(
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"80px 130px 1fr 110px 110px 95px 90px 90px 100px",padding:"7px 14px",background:T.sb}}>
            {["Date","Party","Description","Account","Head","MOP","Receipt ₹","Payment ₹","Balance ₹"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
            ))}
          </div>
          <div style={{maxHeight:420,overflowY:"auto"}}>
            {withBal.map((e,i)=>(
              <div key={e.id}
                style={{display:"grid",gridTemplateColumns:"80px 130px 1fr 110px 110px 95px 90px 90px 100px",padding:"8px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:i%2===0?"transparent":T.surfaceB,borderLeft:`3px solid ${e.recAmt>0?T.grn:T.red}55`}}
                onMouseEnter={ev=>ev.currentTarget.style.background=T.sltL} onMouseLeave={ev=>ev.currentTarget.style.background=i%2===0?"transparent":T.surfaceB}>
                <span style={{fontSize:11,color:T.t4,fontWeight:500}}>{fmtShort(e.date)}</span>
                <span style={{fontSize:11.5,color:T.pur,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.party||"—"}</span>
                <span style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.desc}</span>
                <span style={{fontSize:11,color:T.t3}}>{e.account}</span>
                <Pill label={e.head} c={T.slt} bg={T.sltL}/>
                <span style={{fontSize:11,color:T.t3}}>{e.mop}</span>
                <span style={{fontSize:12.5,fontWeight:e.recAmt>0?700:400,color:e.recAmt>0?T.grn:T.t4}}>{e.recAmt>0?fmtRs(e.recAmt):"—"}</span>
                <span style={{fontSize:12.5,fontWeight:e.payAmt>0?700:400,color:e.payAmt>0?T.red:T.t4}}>{e.payAmt>0?fmtRs(e.payAmt):"—"}</span>
                <span style={{fontSize:12,fontWeight:700,color:e.runBal>=0?T.blu:T.red}}>{fmtRs(e.runBal)}</span>
              </div>
            ))}
          </div>
          {/* Totals */}
          <div style={{display:"grid",gridTemplateColumns:"80px 130px 1fr 110px 110px 95px 90px 90px 100px",padding:"9px 14px",background:T.surfaceB,borderTop:`2px solid ${T.b2}`}}>
            <span/><span/><span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>TOTAL ({filtered.length} entries)</span>
            <span/><span/><span/>
            <span style={{fontSize:13,fontWeight:800,color:T.grn}}>{fmtRs(totalRec)}</span>
            <span style={{fontSize:13,fontWeight:800,color:T.red}}>{fmtRs(totalPay)}</span>
            <span style={{fontSize:13,fontWeight:800,color:balance>=0?T.blu:T.red}}>{fmtRs(balance)}</span>
          </div>
        </div>
      )}

      {/* ── DAY BOOK VIEW ── */}
      {view==="daybook"&&(
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"100px 120px 1fr 110px 95px 95px 105px",padding:"7px 14px",background:T.sb}}>
            {["Date","Party","Description","Account · MOP","Receipt ₹","Payment ₹","Balance ₹"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
            ))}
          </div>
          <div style={{maxHeight:480,overflowY:"auto"}}>
            {daybook.map((day,di)=>(
              <div key={day.date}>
                {/* Day header */}
                <div style={{display:"grid",gridTemplateColumns:"100px 120px 1fr 110px 95px 95px 105px",padding:"8px 14px",background:di%2===0?"#F0F4FF":"#E8F5E9",borderBottom:`1px solid ${T.b1}`,borderLeft:`4px solid ${T.blu}`}}>
                  <span style={{fontSize:12,fontWeight:800,color:T.t1}}>{fmtShort(day.date)}</span>
                  <span/>
                  <span style={{fontSize:11.5,fontWeight:600,color:T.t2}}>{day.entries.length} entr{day.entries.length>1?"ies":"y"}</span>
                  <span/>
                  <span style={{fontSize:12.5,fontWeight:700,color:T.grn}}>{day.rec>0?fmtRs(day.rec):"—"}</span>
                  <span style={{fontSize:12.5,fontWeight:700,color:T.red}}>{day.pay>0?fmtRs(day.pay):"—"}</span>
                  <span style={{fontSize:12.5,fontWeight:800,color:day.runBal>=0?T.blu:T.red}}>{fmtRs(day.runBal)}</span>
                </div>
                {/* Day entries indented */}
                {day.entries.map((e,i)=>(
                  <div key={e.id} style={{display:"grid",gridTemplateColumns:"100px 120px 1fr 110px 95px 95px 105px",padding:"6px 14px 6px 28px",borderBottom:`1px solid ${T.b1}`,background:i%2===0?T.surface:T.surfaceB,alignItems:"center"}}>
                    <span style={{fontSize:10,color:T.t4}}>{e.head}</span>
                    <span style={{fontSize:11,color:T.pur,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.party||"—"}</span>
                    <span style={{fontSize:11.5,color:T.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.desc}</span>
                    <span style={{fontSize:10.5,color:T.t3}}>{e.account} · {e.mop}</span>
                    <span style={{fontSize:11.5,color:e.recAmt>0?T.grn:T.t4}}>{e.recAmt>0?fmtRs(e.recAmt):"—"}</span>
                    <span style={{fontSize:11.5,color:e.payAmt>0?T.red:T.t4}}>{e.payAmt>0?fmtRs(e.payAmt):"—"}</span>
                    <span/>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Totals */}
          <div style={{display:"grid",gridTemplateColumns:"100px 120px 1fr 110px 95px 95px 105px",padding:"9px 14px",background:T.surfaceB,borderTop:`2px solid ${T.b2}`}}>
            <span style={{fontSize:12,fontWeight:700,color:T.t1}}>TOTAL</span>
            <span/>
            <span style={{fontSize:11.5,color:T.t3}}>{daybook.length} days · {filtered.length} entries</span>
            <span/>
            <span style={{fontSize:13,fontWeight:800,color:T.grn}}>{fmtRs(totalRec)}</span>
            <span style={{fontSize:13,fontWeight:800,color:T.red}}>{fmtRs(totalPay)}</span>
            <span style={{fontSize:13,fontWeight:800,color:balance>=0?T.blu:T.red}}>{fmtRs(balance)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODULE 2 — MATERIAL CHALLAN REGISTER
// ══════════════════════════════════════════════════════════════
function ChallanModule(){
  const [materials,setMaterials]=useState(INIT_MATERIAL);
  const [fSite,setFSite]=useState("All");
  const [fParty,setFParty]=useState("All");
  const [fHead,setFHead]=useState("All");
  const [fStatus,setFStatus]=useState("All");
  const [fMOP,setFMOP]=useState("All");
  const [fFrom,setFFrom]=useState("2026-03-01");
  const [fTo,setFTo]=useState("2026-03-16");
  const [search,setSearch]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const blank={billDate:TODAY,delivDate:TODAY,materialName:"",matHead:MAT_HEADS[0],
    desc:"",party:SUPPLIERS[0],site:SITES[0],qty:"",unit:MAT_UNITS[0],price:"",
    account:ACCOUNTS[0],mop:MOPS[0],status:"Pending",remark:""};
  const [form,setForm]=useState(blank);
  // Refs for tab navigation in material form
  const matBillRef=useRef(null);
  const matDelivRef=useRef(null);
  const matNameRef=useRef(null);
  const matQtyRef=useRef(null);
  const matPriceRef=useRef(null);
  const matDescRef=useRef(null);
  const matSaveRef=useRef(null);

  const upd=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const calcTotal=m=>Number(m.qty||0)*Number(m.price||0);

  const filtered=useMemo(()=>materials.filter(m=>{
    if(fSite!=="All"&&m.site!==fSite) return false;
    if(fParty!=="All"&&m.party!==fParty) return false;
    if(fHead!=="All"&&m.matHead!==fHead) return false;
    if(fStatus!=="All"&&m.status!==fStatus) return false;
    if(fMOP!=="All"&&m.mop!==fMOP) return false;
    if(m.billDate<fFrom||m.billDate>fTo) return false;
    if(search&&!m.materialName.toLowerCase().includes(search.toLowerCase())&&
       !m.party.toLowerCase().includes(search.toLowerCase())&&
       !m.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a,b)=>a.billDate.localeCompare(b.billDate)),[materials,fSite,fParty,fHead,fStatus,fMOP,fFrom,fTo,search]);

  const totalAmt=filtered.reduce((s,m)=>s+m.total,0);
  const totalPaid=filtered.filter(m=>m.status==="Paid").reduce((s,m)=>s+m.total,0);
  const totalPending=filtered.filter(m=>m.status==="Pending").reduce((s,m)=>s+m.total,0);

  const saveEntry=()=>{
    if(!form.materialName.trim()||!form.qty||!form.price) return;
    const t=Number(form.qty)*Number(form.price);
    const m={...form,id:`M${String(materials.length+1).padStart(3,"0")}`,
      qty:Number(form.qty),price:Number(form.price),total:t};
    setMaterials(p=>[...p,m]);
    setForm(blank);
    setTimeout(()=>matBillRef.current?.focus(),30);
  };

  const markPaid=id=>setMaterials(p=>p.map(m=>m.id===id?{...m,status:"Paid"}:m));

  const dlExcel=()=>{
    const rows=[
      ["GB Buildcon — Material Challan / Purchase Register"],
      [`Period: ${fFrom} to ${fTo}  |  Site: ${fSite}  |  Generated: ${TODAY}`],[],
      ["#","Bill Date","Delivery Date","Material Name","Head","Description","Party / Supplier",
       "Site","Qty","Unit","Price ₹","Total ₹","Account","MOP","Status","Remark"],
      ...filtered.map(m=>[m.id,m.billDate,m.delivDate,m.materialName,m.matHead,m.desc,
        m.party,m.site,m.qty,m.unit,m.price,m.total,m.account,m.mop,m.status,m.remark]),
      [],[" "," "," "," "," "," "," "," "," "," "," ","TOTAL → "+fmtRs(totalAmt),"","","",""],
    ];
    downloadCSV(`Material_Register_${fFrom}_${fTo}.csv`,rows);
  };

  const printAll=()=>{
    const rows=filtered.map(m=>`
      <tr>
        <td>${fmtDate(m.billDate)}</td>
        <td>${fmtDate(m.delivDate)}</td>
        <td style="font-weight:700">${m.materialName}</td>
        <td><span style="font-size:9px;padding:2px 7px;border-radius:20px;background:#EFF6FF;color:#2563EB">${m.matHead}</span></td>
        <td style="color:#6B7280;font-size:10px">${m.desc||"—"}</td>
        <td style="font-weight:600;color:#7C3AED">${m.party}</td>
        <td>${m.site}</td>
        <td style="text-align:right">${fmtN(m.qty)}</td>
        <td>${m.unit}</td>
        <td style="text-align:right">${fmtRs(m.price)}</td>
        <td style="text-align:right;font-weight:700;color:#059669">${fmtRs(m.total)}</td>
        <td>${m.account}</td>
        <td>${m.mop}</td>
        <td><span style="font-size:9px;padding:2px 7px;border-radius:20px;background:${m.status==="Paid"?"#ECFDF5":"#FFFBEB"};color:${m.status==="Paid"?"#059669":"#D97706"}">${m.status}</span></td>
      </tr>`).join("");
    printHTML("Material Purchase Register — GB Buildcon",`
      <div class="header">
        <div><h1>GB Buildcon — Material Purchase Register</h1>
          <div class="header-sub">Period: ${fFrom} to ${fTo} &nbsp;|&nbsp; Site: ${fSite} &nbsp;|&nbsp; ${filtered.length} entries</div></div>
        <div style="text-align:right;font-size:11px;color:rgba(255,255,255,0.7)">Total: ${fmtRs(totalAmt)}</div>
      </div>
      <div class="summary-grid">
        <div class="summary-box" style="border-top-color:#2563EB"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Total Value</div><div style="font-size:15px;font-weight:800;color:#2563EB">${fmtRs(totalAmt)}</div></div>
        <div class="summary-box" style="border-top-color:#059669"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Paid</div><div style="font-size:15px;font-weight:800;color:#059669">${fmtRs(totalPaid)}</div></div>
        <div class="summary-box" style="border-top-color:#D97706"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Pending</div><div style="font-size:15px;font-weight:800;color:#D97706">${fmtRs(totalPending)}</div></div>
      </div>
      <table>
        <tr><th>Bill Date</th><th>Deliv. Date</th><th>Material</th><th>Head</th><th>Description</th><th>Party</th><th>Site</th>
          <th style="text-align:right">Qty</th><th>Unit</th><th style="text-align:right">Price ₹</th>
          <th style="text-align:right">Total ₹</th><th>Account</th><th>MOP</th><th>Status</th></tr>
        ${rows}
        <tr class="total-row"><td colspan="10" style="text-align:right">GRAND TOTAL</td>
          <td style="text-align:right;color:#059669">${fmtRs(totalAmt)}</td><td colspan="3"></td></tr>
      </table>`);
  };

  const selStyle2={height:30,padding:"0 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,
    background:T.surface,fontSize:11.5,color:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"};

  const headColors={Civil:{c:T.blu,bg:T.bluL},Electrical:{c:"#D97706",bg:"#FFFBEB"},
    Plumbing:{c:"#0891B2",bg:"#ECFEFF"},Finishing:{c:T.pur,bg:T.purL},
    Structural:{c:T.grn,bg:T.grnL},Safety:{c:T.red,bg:T.redL},Mechanical:{c:T.slt,bg:T.sltL}};

  return(
    <div>
      {/* Summary tiles */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
        {[{l:"Total Value",v:fmtRs(totalAmt),c:T.blu,sub:`${filtered.length} entries`},
          {l:"Paid",v:fmtRs(totalPaid),c:T.grn,sub:`${filtered.filter(m=>m.status==="Paid").length} items`},
          {l:"Pending",v:fmtRs(totalPending),c:T.amb,sub:`${filtered.filter(m=>m.status==="Pending").length} items`},
          {l:"Avg. Unit Price",v:filtered.length?fmtRs(Math.round(totalAmt/filtered.length)):"—",c:T.slt,sub:"per entry"},
        ].map((s,i)=>(
          <div key={i} style={{padding:"11px 14px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{s.l}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,color:T.t4,marginTop:2}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter toolbar */}
      <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"10px 12px",marginBottom:10}}>
        {/* Row 1: date + search */}
        <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
          <span style={{fontSize:11,color:T.t4,fontWeight:600}}>Bill Date</span>
          <input type="date" value={fFrom} onChange={e=>setFFrom(e.target.value)} style={{...selStyle2,width:125}}/>
          <span style={{fontSize:11,color:T.t4}}>to</span>
          <input type="date" value={fTo} onChange={e=>setFTo(e.target.value)} style={{...selStyle2,width:125}}/>
          <div style={{position:"relative",flex:1,minWidth:200}}>
            <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSrch size={12} color={T.t4}/></span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search material, party, description..."
              style={{...selStyle2,width:"100%",paddingLeft:26,boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
            <button onClick={dlExcel}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
              <IcXLS size={13} color={T.grn}/> Excel
            </button>
            <button onClick={printAll}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
              <IcPrint size={13} color={T.blu}/> PDF / Print
            </button>
            <button onClick={()=>setShowAdd(s=>!s)}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 12px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
              <IcAdd size={12} color="white"/> Add Entry
            </button>
          </div>
        </div>
        {/* Row 2: filters */}
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <select value={fSite} onChange={e=>setFSite(e.target.value)}
            style={{...selStyle2,borderColor:fSite!=="All"?T.blu:T.b1,background:fSite!=="All"?T.bluL:T.surface,color:fSite!=="All"?T.blu:T.t2}}>
            <option value="All">All Sites</option>{SITES.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={fParty} onChange={e=>setFParty(e.target.value)}
            style={{...selStyle2,borderColor:fParty!=="All"?T.pur:T.b1,background:fParty!=="All"?T.purL:T.surface,color:fParty!=="All"?T.pur:T.t2}}>
            <option value="All">All Parties</option>{SUPPLIERS.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={fHead} onChange={e=>setFHead(e.target.value)}
            style={{...selStyle2,borderColor:fHead!=="All"?T.blu:T.b1,background:fHead!=="All"?T.bluL:T.surface,color:fHead!=="All"?T.blu:T.t2}}>
            <option value="All">All Heads</option>{MAT_HEADS.map(h=><option key={h}>{h}</option>)}
          </select>
          <select value={fMOP} onChange={e=>setFMOP(e.target.value)}
            style={{...selStyle2,borderColor:fMOP!=="All"?T.grn:T.b1,background:fMOP!=="All"?T.grnL:T.surface,color:fMOP!=="All"?T.grn:T.t2}}>
            <option value="All">All MOP</option>{MOPS.map(m=><option key={m}>{m}</option>)}
          </select>
          {["All","Paid","Pending"].map(s=>(
            <button key={s} onClick={()=>setFStatus(s)}
              style={{padding:"4px 11px",borderRadius:20,border:`1.5px solid ${fStatus===s?(s==="Paid"?T.grn:s==="Pending"?T.amb:T.blu):T.b1}`,
                background:fStatus===s?(s==="Paid"?T.grnL:s==="Pending"?T.ambL:T.bluL):"none",
                color:fStatus===s?(s==="Paid"?T.grn:s==="Pending"?T.amb:T.blu):T.t3,
                fontSize:11.5,fontWeight:fStatus===s?700:400,cursor:"pointer"}}>
              {s==="All"?"All Status":s}
            </button>
          ))}
          {(fSite!=="All"||fParty!=="All"||fHead!=="All"||fMOP!=="All"||fStatus!=="All"||search)&&(
            <button onClick={()=>{setFSite("All");setFParty("All");setFHead("All");setFMOP("All");setFStatus("All");setSearch("");}}
              style={{padding:"4px 10px",borderRadius:20,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:600,cursor:"pointer"}}>
              Clear All ✕
            </button>
          )}
        </div>
      </div>

      {showAdd&&(
        <div style={{background:T.surface,borderRadius:8,border:`1.5px solid ${T.bluM}`,padding:"14px 16px",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:10}}>New Material Entry</div>
          {/* Row 1: dates, name, head, party, site */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",gap:8,marginBottom:9}}>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Bill Date *</label>
              <input ref={matBillRef} type="date" value={form.billDate} onChange={upd("billDate")}
                onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();matDelivRef.current?.focus();}}}
                style={{width:"100%",height:30,padding:"0 7px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Delivery Date</label>
              <input ref={matDelivRef} type="date" value={form.delivDate} onChange={upd("delivDate")}
                onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();matNameRef.current?.focus();}}}
                style={{width:"100%",height:30,padding:"0 7px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Material Name *</label>
              <input ref={matNameRef} value={form.materialName} onChange={upd("materialName")} placeholder="e.g. OPC Cement 53 Grade"
                onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();matQtyRef.current?.focus();}}}
                style={{width:"100%",height:30,padding:"0 7px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Head *</label>
              <SearchSelect options={MAT_HEADS} value={form.matHead} onChange={v=>upd("matHead")({target:{value:v}})}
                style={{height:30}} onTabNext={()=>matQtyRef.current?.focus()}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Party / Supplier *</label>
              <SearchSelect options={SUPPLIERS} value={form.party} onChange={v=>upd("party")({target:{value:v}})}
                accent={T.pur} style={{height:30}} onTabNext={()=>matQtyRef.current?.focus()}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Site *</label>
              <SearchSelect options={SITES} value={form.site} onChange={v=>upd("site")({target:{value:v}})}
                style={{height:30}} onTabNext={()=>matQtyRef.current?.focus()}/>
            </div>
          </div>
          {/* Row 2: qty, unit, price, total, status */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:8,marginBottom:9}}>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Qty *</label>
              <input ref={matQtyRef} type="number" value={form.qty} onChange={upd("qty")} placeholder="e.g. 50"
                onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();matPriceRef.current?.focus();}}}
                style={{width:"100%",height:30,padding:"0 7px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Unit</label>
              <SearchSelect options={MAT_UNITS} value={form.unit} onChange={v=>upd("unit")({target:{value:v}})}
                style={{height:30}} onTabNext={()=>matPriceRef.current?.focus()}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Price ₹ *</label>
              <input ref={matPriceRef} type="number" value={form.price} onChange={upd("price")} placeholder="per unit"
                onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();matDescRef.current?.focus();}}}
                style={{width:"100%",height:30,padding:"0 7px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",marginBottom:3}}>Total ₹</label>
              <div style={{height:30,padding:"0 7px",borderRadius:6,border:`1.5px solid ${T.grnM}`,background:T.grnL,display:"flex",alignItems:"center",fontSize:13,fontWeight:800,color:T.grn}}>
                {form.qty&&form.price?fmtRs(Number(form.qty)*Number(form.price)):"Auto"}
              </div>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Status</label>
              <SearchSelect options={["Pending","Paid"]} value={form.status} onChange={v=>upd("status")({target:{value:v}})}
                style={{height:30}} onTabNext={()=>matDescRef.current?.focus()}/>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Description / Remark</label>
            <input ref={matDescRef} value={form.desc} onChange={upd("desc")} placeholder="Additional notes about this material purchase..."
              onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();matSaveRef.current?.focus();}if(e.key==="Enter"){e.preventDefault();saveEntry();}}}
              style={{width:"100%",height:30,padding:"0 7px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
              onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
          </div>
          <div style={{display:"flex",gap:7}}>
            <button onClick={()=>{setShowAdd(false);setForm(blank);}} style={{padding:"7px 14px",borderRadius:6,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
            <button ref={matSaveRef} onClick={saveEntry}
              onKeyDown={e=>{if(e.key==="Enter")saveEntry();}}
              style={{padding:"7px 18px",borderRadius:6,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>Save Entry</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        {/* Table header */}
        <div style={{display:"grid",gridTemplateColumns:"85px 85px 1fr 90px 1fr 120px 90px 90px 100px 80px",
          padding:"7px 14px",background:T.sb,gap:8}}>
          {["Bill Date","Deliv. Date","Material Name","Head","Description","Party","Site",
            "Qty / Unit","Total ₹","Status"].map((h,i)=>(
            <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
          ))}
        </div>

        <div style={{maxHeight:460,overflowY:"auto"}}>
          {filtered.map((m,i)=>{
            const hc=headColors[m.matHead]||{c:T.slt,bg:T.sltL};
            const sc=m.status==="Paid"?{c:T.grn,bg:T.grnL}:{c:T.amb,bg:T.ambL};
            return(
              <div key={m.id}
                style={{display:"grid",gridTemplateColumns:"85px 85px 1fr 90px 1fr 120px 90px 90px 100px 80px",
                  padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",gap:8,
                  background:i%2===0?"transparent":T.surfaceB,
                  borderLeft:`3px solid ${hc.c}44`,transition:"background .1s",cursor:"default"}}
                onMouseEnter={ev=>ev.currentTarget.style.background=T.sltL}
                onMouseLeave={ev=>ev.currentTarget.style.background=i%2===0?"transparent":T.surfaceB}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:T.t2}}>{fmtShort(m.billDate)}</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:T.t3}}>{fmtShort(m.delivDate)}</div>
                  {m.billDate!==m.delivDate&&<div style={{fontSize:9,color:T.amb}}>+{Math.round((new Date(m.delivDate)-new Date(m.billDate))/(86400000))}d</div>}
                </div>
                <div style={{fontSize:12.5,fontWeight:700,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.materialName}</div>
                <Pill label={m.matHead} c={hc.c} bg={hc.bg}/>
                <div style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.desc||"—"}</div>
                <div style={{fontSize:11.5,fontWeight:600,color:T.pur,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.party}</div>
                <div style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.site.split(" ")[0]}</div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{fmtN(m.qty)}</div>
                  <div style={{fontSize:9.5,color:T.t4}}>{m.unit} · ₹{fmtN(m.price)}</div>
                </div>
                <div style={{fontSize:13,fontWeight:800,color:T.grn}}>{fmtRs(m.total)}</div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <Pill label={m.status} c={sc.c} bg={sc.bg}/>
                  {m.status==="Pending"&&(
                    <button onClick={()=>markPaid(m.id)}
                      style={{fontSize:9.5,padding:"2px 7px",borderRadius:4,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,cursor:"pointer",fontWeight:600}}>
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length===0&&(
            <div style={{textAlign:"center",padding:"40px",color:T.t4}}>
              <div style={{fontSize:32,marginBottom:8}}>🔍</div>
              <div style={{fontSize:14,fontWeight:600,color:T.t3}}>No entries match the filters</div>
            </div>
          )}
        </div>

        {/* Footer totals */}
        <div style={{display:"grid",gridTemplateColumns:"85px 85px 1fr 90px 1fr 120px 90px 90px 100px 80px",
          padding:"9px 14px",background:T.surfaceB,borderTop:`2px solid ${T.b2}`,gap:8}}>
          <span style={{fontSize:12,fontWeight:700,color:T.t1,gridColumn:"1/8"}}>TOTAL &nbsp;({filtered.length} entries)</span>
          <span style={{fontSize:13,fontWeight:800,color:T.grn}}>{fmtRs(totalAmt)}</span>
          <span style={{fontSize:11,color:T.t3}}>Paid: {fmtRs(totalPaid)}</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODULE 3 — SITE PROGRESS + FINANCIAL REPORT
// ══════════════════════════════════════════════════════════════
function ProgressReportModule(){
  const [selProject,setSelProject]=useState(null);

  const totalContract=PROJECTS.reduce((s,p)=>s+p.contract,0);
  const totalBilled  =PROJECTS.reduce((s,p)=>s+p.billed,0);
  const totalReceived=PROJECTS.reduce((s,p)=>s+p.received,0);
  const totalExp     =PROJECTS.reduce((s,p)=>s+p.expenses,0);
  const totalProfit  =totalReceived-totalExp;
  const avgProgress  =Math.round(PROJECTS.reduce((s,p)=>s+p.progress,0)/PROJECTS.length);

  const dlExcelPortfolio=()=>{
    const rows=[
      ["GB Buildcon — Portfolio Financial Report"],
      [`Generated: ${TODAY}`],[],
      ["Project","Site","Status","Progress %","Contract Value ₹","Billed ₹","Received ₹","Expenses ₹","Net Margin ₹","Margin %","Start","Target"],
      ...PROJECTS.map(p=>[p.name,p.site,p.status,p.progress+"%",p.contract,p.billed,p.received,p.expenses,p.received-p.expenses,Math.round((p.received-p.expenses)/p.received*100)+"%",p.start,p.target]),
      [],
      ["TOTAL","","",avgProgress+"%",totalContract,totalBilled,totalReceived,totalExp,totalProfit,Math.round(totalProfit/totalReceived*100)+"%","",""],
    ];
    downloadCSV("GB_Portfolio_Report.csv",rows);
  };

  const dlExcelProject=p=>{
    const rows=[
      [`${p.name} — Progress & Financial Report`],[`Site: ${p.site} | Status: ${p.status} | Generated: ${TODAY}`],[],
      ["Metric","Value"],
      ["Contract Value",p.contract],["Billed",p.billed],["Received",p.received],["Expenses",p.expenses],
      ["Net Margin",p.received-p.expenses],["Margin %",Math.round((p.received-p.expenses)/p.received*100)+"%"],
      ["Overall Progress",p.progress+"%"],["Start Date",p.start],["Target Date",p.target],[],
      ["Phase","Progress %","Status"],
      ...p.phases.map(ph=>[ph.name,ph.pct+"%",ph.status]),
    ];
    downloadCSV(`${p.name.replace(/[^a-z0-9]/gi,"_")}_Report.csv`,rows);
  };

  const printPortfolio=()=>{
    const rows=PROJECTS.map(p=>{
      const margin=p.received-p.expenses;
      const marginPct=Math.round(margin/p.received*100);
      const phasesHtml=p.phases.map(ph=>`<span style="font-size:9px;padding:1px 6px;border-radius:20px;margin-right:3px;background:${ph.status==="Done"?"#ECFDF5":ph.status==="In Progress"?"#EFF6FF":"#F8F9FB"};color:${ph.status==="Done"?"#059669":ph.status==="In Progress"?"#2563EB":"#9CA3AF"}">${ph.name}: ${ph.pct}%</span>`).join("");
      return`<tr>
        <td style="font-weight:600">${p.name}</td>
        <td>${p.site}</td>
        <td><span style="font-size:9px;padding:2px 8px;border-radius:20px;background:${p.status==="Near Completion"?"#ECFDF5":"#EFF6FF"};color:${p.status==="Near Completion"?"#059669":"#2563EB"}">${p.status}</span></td>
        <td style="text-align:center">
          <div style="background:#E5E7EB;border-radius:4px;height:8px;width:100%;overflow:hidden"><div style="background:${p.progress>=80?"#059669":p.progress>=50?"#2563EB":"#D97706"};height:100%;width:${p.progress}%"></div></div>
          <div style="font-size:10px;font-weight:700;color:#111827;margin-top:2px">${p.progress}%</div>
        </td>
        <td style="text-align:right">${fmtRs(p.contract)}</td>
        <td style="text-align:right;color:#059669">${fmtRs(p.received)}</td>
        <td style="text-align:right;color:#DC2626">${fmtRs(p.expenses)}</td>
        <td style="text-align:right;font-weight:700;color:${margin>=0?"#059669":"#DC2626"}">${fmtRs(margin)}<br/><span style="font-weight:400;font-size:9px">(${marginPct}%)</span></td>
        <td>${phasesHtml}</td>
      </tr>`;
    }).join("");
    printHTML("Portfolio Report — GB Buildcon",`
      <div class="header">
        <div><h1>GB Buildcon — Portfolio Report</h1><div class="header-sub">As of ${TODAY} &nbsp;|&nbsp; ${PROJECTS.length} Projects</div></div>
      </div>
      <div class="summary-grid" style="grid-template-columns:repeat(5,1fr)">
        <div class="summary-box" style="border-top-color:#2563EB"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Portfolio</div><div style="font-size:14px;font-weight:800;color:#2563EB">${fmtRs(totalContract)}</div></div>
        <div class="summary-box" style="border-top-color:#7C3AED"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Billed</div><div style="font-size:14px;font-weight:800;color:#7C3AED">${fmtRs(totalBilled)}</div></div>
        <div class="summary-box" style="border-top-color:#059669"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Received</div><div style="font-size:14px;font-weight:800;color:#059669">${fmtRs(totalReceived)}</div></div>
        <div class="summary-box" style="border-top-color:#DC2626"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Expenses</div><div style="font-size:14px;font-weight:800;color:#DC2626">${fmtRs(totalExp)}</div></div>
        <div class="summary-box" style="border-top-color:${totalProfit>=0?"#059669":"#DC2626"}"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Net Margin</div><div style="font-size:14px;font-weight:800;color:${totalProfit>=0?"#059669":"#DC2626"}">${fmtRs(totalProfit)}</div></div>
      </div>
      <table>
        <tr><th>Project</th><th>Site</th><th>Status</th><th style="width:100px">Progress</th><th>Contract ₹</th><th>Received ₹</th><th>Expenses ₹</th><th>Margin ₹</th><th>Phases</th></tr>
        ${rows}
      </table>`);
  };

  const printProject=p=>{
    const margin=p.received-p.expenses;
    const marginPct=Math.round(margin/p.received*100);
    const phases=p.phases.map(ph=>`
      <tr>
        <td>${ph.name}</td>
        <td>
          <div style="background:#E5E7EB;border-radius:4px;height:10px;width:100%;overflow:hidden"><div style="background:${ph.status==="Done"?"#059669":ph.status==="In Progress"?"#2563EB":"#E5E7EB"};height:100%;width:${ph.pct}%"></div></div>
        </td>
        <td style="text-align:center;font-weight:700">${ph.pct}%</td>
        <td><span style="font-size:9px;padding:2px 8px;border-radius:20px;background:${ph.status==="Done"?"#ECFDF5":ph.status==="In Progress"?"#EFF6FF":"#F8F9FB"};color:${ph.status==="Done"?"#059669":ph.status==="In Progress"?"#2563EB":"#9CA3AF"}">${ph.status}</span></td>
      </tr>`).join("");
    printHTML(`${p.name} — Report`,`
      <div class="header">
        <div><h1>${p.name}</h1><div class="header-sub">${p.site} &nbsp;|&nbsp; ${p.status} &nbsp;|&nbsp; As of ${TODAY}</div></div>
        <div style="text-align:right;font-size:18px;font-weight:800;color:#93C5FD">${p.progress}% Complete</div>
      </div>
      <div class="summary-grid" style="grid-template-columns:repeat(4,1fr)">
        <div class="summary-box" style="border-top-color:#2563EB"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Contract Value</div><div style="font-size:14px;font-weight:800;color:#2563EB">${fmtRs(p.contract)}</div></div>
        <div class="summary-box" style="border-top-color:#059669"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Received</div><div style="font-size:14px;font-weight:800;color:#059669">${fmtRs(p.received)}</div></div>
        <div class="summary-box" style="border-top-color:#DC2626"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Expenses</div><div style="font-size:14px;font-weight:800;color:#DC2626">${fmtRs(p.expenses)}</div></div>
        <div class="summary-box" style="border-top-color:${margin>=0?"#059669":"#DC2626"}"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Net Margin (${marginPct}%)</div><div style="font-size:14px;font-weight:800;color:${margin>=0?"#059669":"#DC2626"}">${fmtRs(margin)}</div></div>
      </div>
      <div style="background:#E5E7EB;border-radius:6px;height:14px;overflow:hidden;margin-bottom:4px"><div style="background:${p.progress>=80?"#059669":p.progress>=50?"#2563EB":"#D97706"};height:100%;width:${p.progress}%;border-radius:6px"></div></div>
      <div style="font-size:12px;color:#374151;margin-bottom:14px"><strong>Overall Progress: ${p.progress}%</strong> &nbsp;|&nbsp; Start: ${p.start} &nbsp;|&nbsp; Target: ${p.target}</div>
      <h2>Phase-wise Progress</h2>
      <table><tr><th>Phase</th><th>Progress Bar</th><th style="text-align:center">%</th><th>Status</th></tr>${phases}</table>
      <div class="sig-row">
        <div class="sig-box">Site Engineer / PM<br/></div>
        <div class="sig-box">Authorised By<br/>GB Buildcon</div>
      </div>`);
  };

  return(
    <div>
      {/* Portfolio summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Portfolio",v:fmtRs(totalContract),c:T.blu},{l:"Billed",v:fmtRs(totalBilled),c:T.pur},{l:"Received",v:fmtRs(totalReceived),c:T.grn},{l:"Expenses",v:fmtRs(totalExp),c:T.red},{l:"Net Margin",v:fmtRs(Math.abs(totalProfit)),c:totalProfit>=0?T.grn:T.red}].map((s,i)=>(
          <div key={i} style={{padding:"11px 14px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{s.l}</div>
            <div style={{fontSize:15,fontWeight:800,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{display:"flex",gap:7,marginBottom:12}}>
        <button onClick={dlExcelPortfolio} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:12,fontWeight:600,cursor:"pointer"}}><IcXLS size={14} color={T.grn}/> Portfolio Excel</button>
        <button onClick={printPortfolio} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:12,fontWeight:600,cursor:"pointer"}}><IcPrint size={14} color={T.blu}/> Portfolio PDF</button>
      </div>

      {/* Project cards */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {PROJECTS.map(p=>{
          const margin=p.received-p.expenses;
          const marginPct=Math.round(margin/p.received*100);
          const isSel=selProject===p.id;
          const sc=p.status==="Near Completion"?{c:T.grn,bg:T.grnL}:p.status==="Ongoing"?{c:T.blu,bg:T.bluL}:{c:T.slt,bg:T.sltL};
          return(
            <div key={p.id} style={{background:T.surface,borderRadius:10,border:`1.5px solid ${isSel?T.blu:T.b1}`,overflow:"hidden",boxShadow:isSel?"0 0 0 3px rgba(37,99,235,0.1)":"0 1px 3px rgba(0,0,0,0.05)"}}>
              <div style={{padding:"13px 16px",cursor:"pointer",borderLeft:`4px solid ${T.blu}`}} onClick={()=>setSelProject(isSel?null:p.id)}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                      <span style={{fontSize:14,fontWeight:700,color:T.t1}}>{p.name}</span>
                      <Pill label={p.status} c={sc.c} bg={sc.bg}/>
                    </div>
                    <span style={{fontSize:11.5,color:T.t4}}>{p.site} · {p.start} → {p.target}</span>
                  </div>
                  <div style={{display:"flex",gap:7}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>dlExcelProject(p)} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 9px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcXLS size={11} color={T.grn}/> Excel</button>
                    <button onClick={()=>printProject(p)} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 9px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcPrint size={11} color={T.blu}/> PDF</button>
                  </div>
                </div>

                {/* Overall progress bar */}
                <div style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,color:T.t3}}>Overall Progress</span>
                    <span style={{fontSize:12,fontWeight:800,color:p.progress>=80?T.grn:p.progress>=50?T.blu:T.amb}}>{p.progress}%</span>
                  </div>
                  <div style={{height:8,background:T.b1,borderRadius:8,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${p.progress}%`,background:p.progress>=80?T.grn:p.progress>=50?T.blu:T.amb,borderRadius:8,transition:"width .5s"}}/>
                  </div>
                </div>

                {/* Financial row */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                  {[{l:"Contract",v:fmtRs(p.contract),c:T.t1},{l:"Received",v:fmtRs(p.received),c:T.grn},{l:"Expenses",v:fmtRs(p.expenses),c:T.red},{l:`Margin (${marginPct}%)`,v:fmtRs(Math.abs(margin)),c:margin>=0?T.grn:T.red}].map((s,i)=>(
                    <div key={i} style={{padding:"8px 10px",background:T.surfaceB,borderRadius:6,border:`1px solid ${T.b1}`}}>
                      <div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:1}}>{s.l}</div>
                      <div style={{fontSize:13,fontWeight:700,color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expanded: phase breakdown */}
              {isSel&&(
                <div style={{padding:"12px 16px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.t2,marginBottom:8}}>Phase-wise Progress</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {p.phases.map((ph,i)=>{
                      const phc=ph.status==="Done"?T.grn:ph.status==="In Progress"?T.blu:T.b2;
                      return(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:12,color:T.t2,width:100,flexShrink:0}}>{ph.name}</span>
                          <div style={{flex:1,height:6,background:T.b1,borderRadius:6,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${ph.pct}%`,background:phc,borderRadius:6}}/>
                          </div>
                          <span style={{fontSize:11.5,fontWeight:700,color:phc,width:38,textAlign:"right",flexShrink:0}}>{ph.pct}%</span>
                          <Pill label={ph.status} c={phc==="#E5E7EB"?T.slt:phc} bg={ph.status==="Done"?T.grnL:ph.status==="In Progress"?T.bluL:T.sltL}/>
                        </div>
                      );
                    })}
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

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
export default function ReportsModule(){
  const [tab,setTab]=useState("cash");

  const TABS=[
    {id:"cash",    l:"Cash Book + Day Book",  desc:"Date-wise receipts & payments",icon:IcCalc},
    {id:"challan", l:"Challan Register",       desc:"Site-wise contractor bills",   icon:IcSheet},
    {id:"progress",l:"Progress + Financial",  desc:"Site progress & finance report",icon:IcBar},
  ];

  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{background:T.sb,padding:"14px 22px",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#2563EB,#FF6F00)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/></svg>
        </div>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:"white",letterSpacing:"-.3px"}}>GB Buildcon</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"1px"}}>Reports & Accounts</div>
        </div>
        <div style={{flex:1}}/>
        {/* Tab bar in header */}
        {TABS.map(t=>{
          const TIcon=t.icon;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{display:"flex",alignItems:"center",gap:7,padding:"8px 14px",borderRadius:8,border:`1.5px solid ${tab===t.id?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.12)"}`,background:tab===t.id?"rgba(255,255,255,0.15)":"transparent",color:tab===t.id?"white":"rgba(255,255,255,0.55)",cursor:"pointer",fontSize:12.5,fontWeight:tab===t.id?700:400,transition:"all .15s"}}>
              <TIcon size={14} color="currentColor"/>
              <span>{t.l}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 22px"}}>
        {tab==="cash"     && <CashBookModule/>}
        {tab==="challan"  && <ChallanModule/>}
        {tab==="progress" && <ProgressReportModule/>}
      </div>

      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:10px}
        select,input{font-family:'Segoe UI',system-ui,sans-serif}
      `}</style>
    </div>
  );
}
