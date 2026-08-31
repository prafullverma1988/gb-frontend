import { useState, useMemo, useRef, useEffect } from "react";
import api from "../config/api";
import { t } from "../i18n";

const COMPANY_NAME = "Company";

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
        placeholder={placeholder||t("reports.select")}
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
          {!filtered.length&&<div style={{padding:"8px 10px",fontSize:11,color:"#9CA3AF",textAlign:"center"}}>{t("reports.no_match")}</div>}
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
// Signed money — negative balances show a leading "-" (pair with red colour).
const fmtBal=n=>(n<0?"-₹":"₹")+fmtN(Math.abs(n));
const fmtDate=s=>s?new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"-";
const fmtShort=s=>s?new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"-";
const TODAY=new Date().toISOString().split("T")[0];

// ── MASTER DATA ───────────────────────────────────────────────
const SITES=[];
const HEADS=["Material","Labour","Contractor","Site Expense","Subcontractor","Office","Equipment","Loan","PA Bill","Other"];
const MOPS=["Cash","Cheque","Bank Transfer","UPI","NEFT"];
const ACCOUNTS=[];
const PARTIES=[];

// ── CASH DATA ────────────────────────────────────────────────
const INIT_CASH=[];

// ── MATERIAL CHALLAN / PURCHASE REGISTER ─────────────────────
const MAT_HEADS=["Civil","Electrical","Plumbing","Finishing","Structural","Mechanical","Safety","General"];
const MAT_UNITS=["Bag","MT","CuM","Sqft","Nos","Ltr","Kg","RFt","Set","Box"];
const SUPPLIERS=[];

const INIT_MATERIAL=[];

// ── PROJECT PROGRESS DATA ─────────────────────────────────────
const PROJECTS=[];

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
  <p class="footer">${COMPANY_NAME} · Construction Management · Generated: ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
  </body></html>`);
  w.document.close();setTimeout(()=>w.print(),500);
}

// ══════════════════════════════════════════════════════════════
// MODULE 1 — CASH BOOK + DAY BOOK
// ══════════════════════════════════════════════════════════════
function CashBookModule(){
  // ── Live data — same source as Finance → Cash Book tab ──────
  // Reports is VIEW-ONLY: no Add/Edit/Delete here. Use the Finance
  // module for mutations; this screen pulls the same /finance/
  // transactions list (filtered for cash events) and renders Cash
  // Book + Day Book + PDF/Excel export.
  const [entries,setEntries]=useState([]);
  const [loading,setLoading]=useState(true);
  // Cash-event filter — receipts, payments, transfers (the same
  // whitelist Finance uses for its Cash Book tab). Excludes bills
  // (material_purchase / subcon_expense as bills / sales_invoice)
  // because those are liabilities, not money movements.
  const CASH_TYPES = new Set(["receipt", "payment", "party_payment",
    "site_expense", "bank_transfer", "wallet_payment", "wallet_topup"]);
  // map backend txn.type → cash-book "head" label.
  const TYPE_TO_HEAD = {
    receipt: "Other", payment: "Other", party_payment: "Other",
    site_expense: "Site Expense", subcon_expense: "Subcontractor",
    material_purchase: "Material", bank_transfer: "Other",
    wallet_payment: "Other", wallet_topup: "Other",
  };
  useEffect(() => {
    setLoading(true);
    api.get("/finance/transactions?limit=1000")
      .then(r => {
        if (!r?.success || !Array.isArray(r.data)) return;
        const rows = r.data
          .filter(t => CASH_TYPES.has(t.type) && (t.status || "") !== "cancelled")
          .map(t => {
            const isCR = t.type === "receipt" ||
              (t.type === "bank_transfer" && /Bank Transfer IN/i.test(t.description || ""));
            const amt = parseFloat(t.amount) || 0;
            const date = (t.date ? new Date(t.date) : new Date()).toISOString().slice(0, 10);
            return {
              id: t.id,
              date,
              party: t.party_name || "",
              desc: t.description || t.note || t.type,
              // Wallet-origin rows ka koi company account nahi hota —
              // account_display "<Staff> (Wallet)" bhejta hai.
              account: t.account_display || t.account_name || "",
              head: t.head_name || TYPE_TO_HEAD[t.type] || "Other",
              mop: (t.mop || "cash").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
              site: t.project_name || "",
              recAmt: isCR ? amt : 0,
              payAmt: isCR ? 0 : amt,
            };
          });
        setEntries(rows);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  // Derive filter dropdown options from the live data so we never
  // show "All Sites" with no sites under it.
  const SITES_LIVE   = useMemo(() => Array.from(new Set(entries.map(e => e.site).filter(Boolean))).sort(), [entries]);
  const ACCOUNTS_LIVE= useMemo(() => Array.from(new Set(entries.map(e => e.account).filter(Boolean))).sort(), [entries]);
  const PARTIES_LIVE = useMemo(() => Array.from(new Set(entries.map(e => e.party).filter(Boolean))).sort(), [entries]);

  const [view,setView]=useState("cashbook"); // cashbook | daybook
  const [fSite,setFSite]=useState("All");
  const [fHead,setFHead]=useState("All");
  const [fMOP,setFMOP]=useState("All");
  const [fAcc,setFAcc]=useState("All");
  const [fParty,setFParty]=useState("All");
  // Default range: last 30 days through today — covers most recent
  // activity without the user having to set dates every visit.
  const [fFrom,setFFrom]=useState(() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); });
  const [fTo,setFTo]=useState(TODAY);
  const [search,setSearch]=useState("");

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

  // Excel download — Cashbook
  const dlExcelCash=()=>{
    const rows=[
      [COMPANY_NAME+" — Cash Book"],
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
      [COMPANY_NAME+" — Day Book"],
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
    printHTML("Cash Book — "+COMPANY_NAME,`
      <div class="header">
        <div><h1>${COMPANY_NAME} — Cash Book</h1><div class="header-sub">Period: ${fFrom} to ${fTo}  &nbsp;|&nbsp;  Site: ${fSite}</div></div>
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
      <tr class="day-header"><td colspan="3"><strong>${fmtDate(d.date)}</strong></td><td class="rec">${fmtRs(d.rec)}</td><td class="pay">${fmtRs(d.pay)}</td><td style="font-weight:700;color:${(d.rec-d.pay)>=0?"#059669":"#DC2626"}">${fmtBal(d.rec-d.pay)}</td><td style="font-weight:700;color:${d.runBal>=0?"#2563EB":"#DC2626"}">${fmtBal(d.runBal)}</td></tr>
      ${d.entries.map(e=>`<tr><td></td><td>${e.desc}</td><td>${e.account} · ${e.mop}</td><td class="rec" style="font-weight:400">${e.recAmt>0?fmtRs(e.recAmt):""}</td><td class="pay" style="font-weight:400">${e.payAmt>0?fmtRs(e.payAmt):""}</td><td></td><td></td></tr>`).join("")}
    `).join("");
    printHTML("Day Book — "+COMPANY_NAME,`
      <div class="header"><div><h1>${COMPANY_NAME} — Day Book</h1><div class="header-sub">Period: ${fFrom} to ${fTo}</div></div></div>
      <div class="summary-grid">
        <div class="summary-box" style="border-top-color:#059669"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Total Receipt</div><div style="font-size:16px;font-weight:800;color:#059669">${fmtRs(totalRec)}</div></div>
        <div class="summary-box" style="border-top-color:#DC2626"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Total Payment</div><div style="font-size:16px;font-weight:800;color:#DC2626">${fmtRs(totalPay)}</div></div>
        <div class="summary-box" style="border-top-color:#2563EB"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Working Days</div><div style="font-size:16px;font-weight:800;color:#2563EB">${daybook.length}</div></div>
      </div>
      <table>
        <tr><th></th><th>Description / Summary</th><th>Account · MOP</th><th>Receipt ₹</th><th>Payment ₹</th><th>Day Bal ₹</th><th>Ledger Bal ₹</th></tr>
        ${rows}
        <tr class="total-row"><td colspan="3" style="text-align:right">TOTAL</td><td class="rec">${fmtRs(totalRec)}</td><td class="pay">${fmtRs(totalPay)}</td><td style="color:${balance>=0?"#059669":"#DC2626"};font-weight:800">${fmtBal(balance)}</td><td style="color:${balance>=0?"#2563EB":"#DC2626"};font-weight:800">${fmtBal(balance)}</td></tr>
      </table>`);
  };

  const selStyle={height:30,padding:"0 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,background:T.surface,fontSize:12,color:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"};

  return(
    <div>
      {/* Summary tiles */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
        {[{l:t("reports.total_receipt"),v:fmtRs(totalRec),c:T.grn},{l:t("reports.total_payment"),v:fmtRs(totalPay),c:T.red},{l:t("reports.net_balance"),v:fmtRs(Math.abs(balance)),c:balance>=0?T.blu:T.red},{l:t("reports.entries"),v:filtered.length,c:T.slt}].map((s,i)=>(
          <div key={i} style={{padding:"11px 14px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{s.l}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
            {i===2&&<div style={{fontSize:9.5,color:T.t4,marginTop:2}}>{balance>=0?t("reports.surplus"):t("reports.deficit")}</div>}
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
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("reports.search_description")}
              style={{...selStyle,width:"100%",paddingLeft:24,boxSizing:"border-box"}}/>
          </div>
        </div>
        {/* Row 2: Filters + buttons */}
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <select value={fSite} onChange={e=>setFSite(e.target.value)} style={{...selStyle,borderColor:fSite!=="All"?T.blu:T.b1,background:fSite!=="All"?T.bluL:T.surface,color:fSite!=="All"?T.blu:T.t2}}>
            <option value="All">{t("common.all_sites")}</option>{SITES_LIVE.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={fHead} onChange={e=>setFHead(e.target.value)} style={{...selStyle,borderColor:fHead!=="All"?T.blu:T.b1,background:fHead!=="All"?T.bluL:T.surface,color:fHead!=="All"?T.blu:T.t2}}>
            <option value="All">{t("finance.all_heads")}</option>{HEADS.map(h=><option key={h}>{h}</option>)}
          </select>
          <select value={fMOP} onChange={e=>setFMOP(e.target.value)} style={{...selStyle,borderColor:fMOP!=="All"?T.blu:T.b1,background:fMOP!=="All"?T.bluL:T.surface,color:fMOP!=="All"?T.blu:T.t2}}>
            <option value="All">{t("finance.all_mop")}</option>{MOPS.map(m=><option key={m}>{m}</option>)}
          </select>
          <select value={fAcc} onChange={e=>setFAcc(e.target.value)} style={{...selStyle,borderColor:fAcc!=="All"?T.blu:T.b1,background:fAcc!=="All"?T.bluL:T.surface,color:fAcc!=="All"?T.blu:T.t2}}>
            <option value="All">{t("finance.all_accounts")}</option>{ACCOUNTS_LIVE.map(a=><option key={a}>{a}</option>)}
          </select>
          <select value={fParty} onChange={e=>setFParty(e.target.value)} style={{...selStyle,borderColor:fParty!=="All"?T.pur:T.b1,background:fParty!=="All"?T.purL:T.surface,color:fParty!=="All"?T.pur:T.t2}}>
            <option value="All">{t("finance.all_parties")}</option>{PARTIES_LIVE.map(p=><option key={p}>{p}</option>)}
          </select>
          {/* Reports = VIEW-ONLY. Excel + PDF only. Add/Edit/Delete
              moved out — those live in Finance → Cash Book where the
              backend ledger is the source of truth. */}
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            <button onClick={view==="cashbook"?dlExcelCash:dlExcelDay}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
              <IcXLS size={13} color={T.grn}/> {t("common.excel")}
            </button>
            <button onClick={view==="cashbook"?printCash:printDay}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
              <IcPrint size={13} color={T.blu}/> {t("finance.pdf_print")}
            </button>
          </div>
        </div>
      </div>

      {/* Add-entry form removed — Reports is view-only. To record a
          new transaction, use Finance → Cash Book → Receipt/Payment. */}

      {loading && (
        <div style={{padding:"30px",textAlign:"center",fontSize:12,color:T.t4,background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,marginBottom:10}}>
         {t("reports.loading_transactions")}
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
                <span style={{fontSize:12,fontWeight:700,color:e.runBal>=0?T.blu:T.red}}>{fmtBal(e.runBal)}</span>
              </div>
            ))}
          </div>
          {/* Totals */}
          <div style={{display:"grid",gridTemplateColumns:"80px 130px 1fr 110px 110px 95px 90px 90px 100px",padding:"9px 14px",background:T.surfaceB,borderTop:`2px solid ${T.b2}`}}>
            <span/><span/><span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{t("reports.total_filtered_entries", { filtered: filtered.length })}</span>
            <span/><span/><span/>
            <span style={{fontSize:13,fontWeight:800,color:T.grn}}>{fmtRs(totalRec)}</span>
            <span style={{fontSize:13,fontWeight:800,color:T.red}}>{fmtRs(totalPay)}</span>
            <span style={{fontSize:13,fontWeight:800,color:balance>=0?T.blu:T.red}}>{fmtBal(balance)}</span>
          </div>
        </div>
      )}

      {/* ── DAY BOOK VIEW ── */}
      {view==="daybook"&&(
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"95px 110px 1fr 100px 85px 85px 95px 100px",padding:"7px 14px",background:T.sb}}>
            {["Date","Party","Description","Account · MOP","Receipt ₹","Payment ₹","Day Bal ₹","Ledger Bal ₹"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
            ))}
          </div>
          <div style={{maxHeight:480,overflowY:"auto"}}>
            {daybook.map((day,di)=>(
              <div key={day.date}>
                {/* Day header */}
                <div style={{display:"grid",gridTemplateColumns:"95px 110px 1fr 100px 85px 85px 95px 100px",padding:"8px 14px",background:di%2===0?"#F0F4FF":"#E8F5E9",borderBottom:`1px solid ${T.b1}`,borderLeft:`4px solid ${T.blu}`}}>
                  <span style={{fontSize:12,fontWeight:800,color:T.t1}}>{fmtShort(day.date)}</span>
                  <span/>
                  <span style={{fontSize:11.5,fontWeight:600,color:T.t2}}>{day.entries.length} entr{day.entries.length>1?"ies":"y"}</span>
                  <span/>
                  <span style={{fontSize:12.5,fontWeight:700,color:T.grn}}>{day.rec>0?fmtRs(day.rec):"—"}</span>
                  <span style={{fontSize:12.5,fontWeight:700,color:T.red}}>{day.pay>0?fmtRs(day.pay):"—"}</span>
                  <span style={{fontSize:12.5,fontWeight:800,color:(day.rec-day.pay)>=0?T.grn:T.red}}>{fmtBal(day.rec-day.pay)}</span>
                  <span style={{fontSize:12.5,fontWeight:800,color:day.runBal>=0?T.blu:T.red}}>{fmtBal(day.runBal)}</span>
                </div>
                {/* Day entries indented */}
                {day.entries.map((e,i)=>(
                  <div key={e.id} style={{display:"grid",gridTemplateColumns:"95px 110px 1fr 100px 85px 85px 95px 100px",padding:"6px 14px 6px 28px",borderBottom:`1px solid ${T.b1}`,background:i%2===0?T.surface:T.surfaceB,alignItems:"center"}}>
                    <span style={{fontSize:10,color:T.t4}}>{e.head}</span>
                    <span style={{fontSize:11,color:T.pur,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.party||"—"}</span>
                    <span style={{fontSize:11.5,color:T.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.desc}</span>
                    <span style={{fontSize:10.5,color:T.t3}}>{e.account} · {e.mop}</span>
                    <span style={{fontSize:11.5,color:e.recAmt>0?T.grn:T.t4}}>{e.recAmt>0?fmtRs(e.recAmt):"—"}</span>
                    <span style={{fontSize:11.5,color:e.payAmt>0?T.red:T.t4}}>{e.payAmt>0?fmtRs(e.payAmt):"—"}</span>
                    <span/>
                    <span/>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Totals */}
          <div style={{display:"grid",gridTemplateColumns:"95px 110px 1fr 100px 85px 85px 95px 100px",padding:"9px 14px",background:T.surfaceB,borderTop:`2px solid ${T.b2}`}}>
            <span style={{fontSize:12,fontWeight:700,color:T.t1}}>TOTAL</span>
            <span/>
            <span style={{fontSize:11.5,color:T.t3}}>{t("reports.daybook_days_filtered_entries", { daybook: daybook.length, filtered: filtered.length })}</span>
            <span/>
            <span style={{fontSize:13,fontWeight:800,color:T.grn}}>{fmtRs(totalRec)}</span>
            <span style={{fontSize:13,fontWeight:800,color:T.red}}>{fmtRs(totalPay)}</span>
            <span style={{fontSize:13,fontWeight:800,color:balance>=0?T.grn:T.red}}>{fmtBal(balance)}</span>
            <span style={{fontSize:13,fontWeight:800,color:balance>=0?T.blu:T.red}}>{fmtBal(balance)}</span>
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
  // ── Live data: GRNs flattened to one row per material item ──
  // Source: /procurement/grns?exclude_auto=1 (real site receipts only,
  // no auto-bill synthetic GRNs). Each GRN's items[] is expanded so
  // each material/qty/unit becomes its own row. Category + base rate
  // come from material_master via library lookup.
  // Reports = view-only — no add/edit/delete here.
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [matLibMap,setMatLibMap]=useState({}); // name(lower) → {category_name, base_rate, last_rate, unit}

  useEffect(()=>{
    setLoading(true);
    Promise.all([
      api.get("/procurement/grns?exclude_auto=1"),
      api.get("/library/materials").catch(()=>({data:[]})),
    ]).then(([grnRes, libRes])=>{
      const lib = {};
      const libRows = (libRes?.data || libRes?.rows || []);
      libRows.forEach(m => {
        const k = String(m.name || "").trim().toLowerCase();
        if (k) lib[k] = {
          category_name: m.category_name || "—",
          base_rate: Number(m.base_rate)||0,
          last_rate: Number(m.last_rate)||0,
          unit: m.unit || "",
        };
      });
      setMatLibMap(lib);

      if (!grnRes?.success || !Array.isArray(grnRes.data)) {
        setRows([]); setLoading(false); return;
      }
      // ── Flatten: each GRN × each item → one report row ──────────
      //
      // Each row is also tagged with a `flowType` so the report can
      // aggregate three different ways without double-counting:
      //
      //   "vendor_to_project"  (a) — direct delivery, full ₹
      //   "vendor_to_warehouse"(b) — stocking, full ₹ (vendor billed)
      //   "warehouse_to_project"(c)— issue from stock, qty-only (₹
      //                              already counted in b)
      //   "warehouse_to_warehouse"(d) — transfer, internal, no ₹
      //
      // For internal flows (c, d) we DON'T show rate/total even if
      // billed_at is set — those rows are pre-billed shadow GRNs whose
      // cost was captured at the vendor-side (b) row.
      //
      // For Procurement-source rows we use the project_name to decide
      // a vs b: if the destination project is "Warehouse" (any name
      // containing warehouse) → b, else → a.
      const flat = [];
      for (const g of grnRes.data) {
        const dateRaw = g.received_date || g.created_at;
        const date = dateRaw ? new Date(dateRaw).toISOString().slice(0,10) : "";
        const items = Array.isArray(g.items) ? g.items : [];
        if (items.length === 0) continue;
        const isBilled = !!g.billed_at;
        const src = g.source || "Procurement";
        const projLower = (g.project_name || "").toLowerCase();
        const isWarehouseDest = projLower === "warehouse" || projLower.includes("warehouse");
        let flowType;
        if (src === "WarehouseIssue") flowType = "warehouse_to_project";
        else if (src === "WarehouseTransfer") flowType = "warehouse_to_warehouse";
        else if (isWarehouseDest) flowType = "vendor_to_warehouse";
        else flowType = "vendor_to_project";
        // Rate priority (highest to lowest):
        //   1. it.rate (stored in grn_items) — for warehouse-issue rows
        //      this is the actual FIFO / manually-selected batch rate
        //      stamped at issue time (warehouse.js line 1117-1119).
        //   2. Library last_rate / base_rate — proxy fallback when no
        //      stored rate (legacy data, or unbilled vendor GRNs).
        // Unbilled vendor flows still get 0 (rate not locked until bill
        // posts); warehouse-issue/transfer always have stored rate from
        // the FIFO consume at issue time.
        const isVendorFlow = flowType === "vendor_to_project" || flowType === "vendor_to_warehouse";
        for (const it of items) {
          const matName = it.description || "";
          const libHit = lib[matName.trim().toLowerCase()] || {};
          const storedRate = Number(it.rate) || 0;
          const libRate = libHit.last_rate || libHit.base_rate || 0;
          let rate;
          if (isVendorFlow) {
            rate = isBilled ? (storedRate || libRate) : 0;
          } else {
            // FIFO/manual batch rate stamped at issue time; library only
            // as backup for legacy data without stored rate.
            rate = storedRate || libRate;
          }
          const qty = Number(it.received_qty) || 0;
          flat.push({
            id: `${g.id}-${it.id}`,
            grnId: g.id,
            date,
            vendor: g.vendor_name || "—",
            site: g.project_name || "—",
            challan: g.challan_no || "—",
            grnNumber: g.grn_number || "",
            material: matName,
            category: libHit.category_name || "—",
            qty,
            unit: it.unit || libHit.unit || "",
            rate,
            total: rate * qty,
            status: isBilled ? "Billed" : "Unbilled",
            grnType: g.grn_type || "—",
            source: src,
            flowType,
          });
        }
      }
      setRows(flat);
    }).catch(()=>setRows([])).finally(()=>setLoading(false));
  }, []);

  // ── Filter state ──
  // view: which aggregation rule to apply
  //   all      — Everything (a+b+c+d); rate visible per-row; total
  //              still uses vendor-billed sum to avoid double-counting
  //   vendor   — Vendor Purchases (a+b): vendor billed, full ₹
  //   project  — Project Receipts (a+c): qty into projects, c = qty-only
  //   warehouse— Warehouse Flow (b+c+d): everything touching warehouse
  const [view,setView]=useState("all");
  const [fSite,setFSite]=useState("All");
  const [fParty,setFParty]=useState("All");
  const [fHead,setFHead]=useState("All");
  const [fStatus,setFStatus]=useState("All");
  const [fFrom,setFFrom]=useState(() => { const d = new Date(); d.setDate(d.getDate()-90); return d.toISOString().slice(0,10); });
  const [fTo,setFTo]=useState(TODAY);
  const [search,setSearch]=useState("");

  // Map view → set of flowTypes that view should include
  const ALL_FLOWS = new Set(["vendor_to_project", "vendor_to_warehouse",
    "warehouse_to_project", "warehouse_to_warehouse"]);
  const VIEW_FLOWS = {
    all:      ALL_FLOWS,
    vendor:   new Set(["vendor_to_project", "vendor_to_warehouse"]),
    project:  new Set(["vendor_to_project", "warehouse_to_project"]),
    warehouse:new Set(["vendor_to_warehouse", "warehouse_to_project", "warehouse_to_warehouse"]),
  };
  // Per-view rate visibility rules.
  // - All view shows ₹ on every row (raw register).
  // - Vendor view shows ₹ on vendor-billed rows (a, b)
  // - Project view shows ₹ on a (vendor direct) AND c (warehouse-issued,
  //   value = allocated library cost). This is what answers "kis project
  //   par kitne ka maal gaya".
  // - Warehouse view shows ₹ on b (in) and c (out, allocated). d (transfer)
  //   has no cost movement, just qty.
  const VIEW_RATE_FLOWS = {
    all:      ALL_FLOWS,
    vendor:   new Set(["vendor_to_project", "vendor_to_warehouse"]),
    project:  new Set(["vendor_to_project", "warehouse_to_project"]),
    warehouse:new Set(["vendor_to_warehouse", "warehouse_to_project"]),
  };
  const showRateForRow = (r) => (VIEW_RATE_FLOWS[view] || VIEW_RATE_FLOWS.vendor).has(r.flowType) && r.rate > 0;
  const FLOW_LABEL = {
    vendor_to_project:    { short: "Direct",      bg: T.grnL, c: T.grn },
    vendor_to_warehouse:  { short: "WH In",       bg: T.bluL, c: T.blu },
    warehouse_to_project: { short: "WH→Project",  bg: T.ambL, c: T.amb },
    warehouse_to_warehouse:{ short: "WH→WH",      bg: T.sltL, c: T.slt },
  };

  // Derive filter options from live data so dropdowns only show what
  // actually exists.
  const SITES_LIVE   = useMemo(() => Array.from(new Set(rows.map(r => r.site).filter(s => s && s !== "—"))).sort(), [rows]);
  const VENDORS_LIVE = useMemo(() => Array.from(new Set(rows.map(r => r.vendor).filter(v => v && v !== "—"))).sort(), [rows]);
  const CATS_LIVE    = useMemo(() => Array.from(new Set(rows.map(r => r.category).filter(c => c && c !== "—"))).sort(), [rows]);

  const filtered=useMemo(()=>{
    const allowedFlows = VIEW_FLOWS[view] || VIEW_FLOWS.vendor;
    return rows.filter(r=>{
      // View-level flow filter (the big aggregation rule)
      if (!allowedFlows.has(r.flowType)) return false;
      if(fSite!=="All"&&r.site!==fSite) return false;
      if(fParty!=="All"&&r.vendor!==fParty) return false;
      if(fHead!=="All"&&r.category!==fHead) return false;
      if(fStatus!=="All"&&r.status!==fStatus) return false;
      if(r.date<fFrom||r.date>fTo) return false;
      if(search){
        const q=search.toLowerCase();
        if(!r.material.toLowerCase().includes(q) &&
           !r.vendor.toLowerCase().includes(q) &&
           !(r.challan||"").toLowerCase().includes(q) &&
           !(r.site||"").toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a,b)=>a.date.localeCompare(b.date));
  },[rows,view,fSite,fParty,fHead,fStatus,fFrom,fTo,search]);

  // Totals respect view-aware rate visibility. A row whose rate is
  // hidden in the current view contributes 0 to the total (e.g., d
  // rows in Warehouse view).
  // SPECIAL: "All" view shows every row's rate, but the TOTAL still
  // only counts vendor-billed rows (a+b) — internal moves (c+d) are
  // not new spend so adding them would double-count.
  const isVendorBilled = (r) => r.flowType === "vendor_to_project" || r.flowType === "vendor_to_warehouse";
  const totalSumFlows = view === "all"
    ? (r) => isVendorBilled(r) && showRateForRow(r)
    : (r) => showRateForRow(r);
  const totalAmt=filtered.reduce((s,m)=>s+(totalSumFlows(m)?(m.total||0):0),0);
  const totalPaid=filtered.filter(m=>m.status==="Billed").reduce((s,m)=>s+(totalSumFlows(m)?(m.total||0):0),0);
  const totalPending=filtered.filter(m=>m.status==="Unbilled").reduce((s,m)=>s+(totalSumFlows(m)?(m.total||0):0),0);
  const rateRowCount=filtered.filter(totalSumFlows).length;
  const avgUnit=rateRowCount?totalAmt/rateRowCount:0;

  const dlExcel=()=>{
    const viewLabel = view==="all"?"All Flows (a+b+c+d)":view==="vendor"?"Vendor Purchases (a+b)":view==="project"?"Project Receipts (a+c)":"Warehouse Flow (b+c+d)";
    const xRows=[
      [COMPANY_NAME+" — Material Register"],
      [`View: ${viewLabel}  |  Period: ${fFrom} to ${fTo}  |  Site: ${fSite}  |  Generated: ${TODAY}`],[],
      ["#","Date","Vendor","Site","Flow","Challan / GRN","Material","Category",
       "Qty","Unit","Rate ₹","Total ₹","Status"],
      ...filtered.map((r,i)=>[
        i+1, r.date, r.vendor, r.site,
        (FLOW_LABEL[r.flowType]||{short:"—"}).short,
        (r.challan||"—") + (r.grnNumber ? ` / ${r.grnNumber}` : ""),
        r.material, r.category,
        r.qty, r.unit,
        showRateForRow(r) ? r.rate : "—",
        showRateForRow(r) ? r.total : "—",
        r.status,
      ]),
      [],
      ["","","","","","","","","","","TOTAL →", totalAmt, ""],
    ];
    downloadCSV(`Material_Register_${view}_${fFrom}_${fTo}.csv`,xRows);
  };

  const printAll=()=>{
    const tbody=filtered.map(r=>{
      const showR = showRateForRow(r);
      return `
      <tr>
        <td>${fmtShort(r.date)}</td>
        <td style="font-weight:600;color:#7C3AED">${r.vendor}</td>
        <td>${r.site}</td>
        <td style="font-size:10px;color:#6B7280">${r.challan||"—"}${r.grnNumber?`<br/>${r.grnNumber}`:""}</td>
        <td style="font-weight:700">${r.material}</td>
        <td><span style="font-size:9px;padding:2px 7px;border-radius:20px;background:#EFF6FF;color:#2563EB">${r.category}</span></td>
        <td style="text-align:right">${fmtN(r.qty)}</td>
        <td>${r.unit}</td>
        <td style="text-align:right">${showR?fmtRs(r.rate):"—"}</td>
        <td style="text-align:right;font-weight:700;color:#059669">${showR?fmtRs(r.total):"—"}</td>
        <td><span style="font-size:9px;padding:2px 7px;border-radius:20px;background:${r.status==="Billed"?"#ECFDF5":"#FFFBEB"};color:${r.status==="Billed"?"#059669":"#D97706"}">${r.status}</span></td>
      </tr>`;
    }).join("");
    printHTML("Material Register — "+COMPANY_NAME,`
      <div class="header">
        <div><h1>${COMPANY_NAME} — Material Register</h1>
          <div class="header-sub">Period: ${fFrom} to ${fTo} &nbsp;|&nbsp; Site: ${fSite} &nbsp;|&nbsp; ${filtered.length} entries</div></div>
        <div style="text-align:right;font-size:11px;color:rgba(255,255,255,0.7)">Total: ${fmtRs(totalAmt)}</div>
      </div>
      <div class="summary-grid">
        <div class="summary-box" style="border-top-color:#2563EB"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Total Value</div><div style="font-size:15px;font-weight:800;color:#2563EB">${fmtRs(totalAmt)}</div></div>
        <div class="summary-box" style="border-top-color:#059669"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Billed</div><div style="font-size:15px;font-weight:800;color:#059669">${fmtRs(totalPaid)}</div></div>
        <div class="summary-box" style="border-top-color:#D97706"><div style="font-size:9px;color:#6B7280;text-transform:uppercase">Unbilled</div><div style="font-size:15px;font-weight:800;color:#D97706">${fmtRs(totalPending)}</div></div>
      </div>
      <table>
        <tr><th>Date</th><th>Vendor</th><th>Site</th><th>Challan / GRN</th><th>Material</th><th>Category</th>
          <th style="text-align:right">Qty</th><th>Unit</th><th style="text-align:right">Rate ₹</th>
          <th style="text-align:right">Total ₹</th><th>Status</th></tr>
        ${tbody}
        <tr class="total-row"><td colspan="9" style="text-align:right">GRAND TOTAL</td>
          <td style="text-align:right;color:#059669">${fmtRs(totalAmt)}</td><td></td></tr>
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
      {/* Unbilled tile shows count only ("rate pending") since the
          per-row total is 0 until the bill posts. */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
        {(()=>{
          const billedCount = filtered.filter(m=>m.status==="Billed").length;
          const unbilledCount = filtered.filter(m=>m.status==="Unbilled").length;
          const avgBilled = billedCount ? totalPaid / billedCount : 0;
          return [
            {l:t("common.total_value"),v:fmtRs(totalAmt),c:T.blu,sub:t("reports.length_entries_billed_side_only", { length: filtered.length })},
            {l:t("common.billed"),v:fmtRs(totalPaid),c:T.grn,sub:t("reports.billedcount_items", { billedCount })},
            {l:t("common.unbilled"),v:unbilledCount?`${unbilledCount} item${unbilledCount===1?"":"s"}`:"—",c:T.amb,sub:t("reports.rate_pending")},
            {l:t("reports.avg_per_billed"),v:avgBilled?fmtRs(Math.round(avgBilled)):"—",c:T.slt,sub:t("reports.only_billed_lines")},
          ];
        })().map((s,i)=>(
          <div key={i} style={{padding:"11px 14px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{s.l}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,color:T.t4,marginTop:2}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* View toggle — three semantically different aggregations.
          Each view filters the underlying rows to avoid double-counting
          when summing rates × qty across the warehouse boundary. */}
      <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"10px 12px",marginBottom:10}}>
        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
          <span style={{fontSize:10.5,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",marginRight:4}}>{t("common.view_2")}</span>
          {[
            {k:"all",      l:t("common.all"),              d:t("reports.raw_register_every_grn_row_every")},
            {k:"vendor",   l:t("reports.vendor_purchases"), d:t("reports.vendor_billed_a_b_full")},
            {k:"project",  l:t("reports.project_receipts"), d:t("reports.what_reached_projects_a_c_c")},
            {k:"warehouse",l:t("reports.warehouse_flow"),   d:t("reports.in_out_transfers_b_c_d")},
          ].map(v => (
            <button key={v.k} onClick={()=>setView(v.k)}
              title={v.d}
              style={{padding:"5px 12px",borderRadius:6,border:`1.5px solid ${view===v.k?T.blu:T.b1}`,background:view===v.k?T.bluL:T.surface,color:view===v.k?T.blu:T.t3,fontSize:12,fontWeight:view===v.k?700:500,cursor:"pointer",fontFamily:"inherit"}}>
              {v.l}
            </button>
          ))}
          <span style={{fontSize:10.5,color:T.t4,marginLeft:8,fontStyle:"italic"}}>
            {view==="all"      && t("reports.every_row_visible_total_uses_vendor")}
            {view==="vendor"   && t("reports.total_sum_of_vendor_bills_no")}
            {view==="project"  && t("reports.project_consumption_warehouse_issues_show_fifo")}
            {view==="warehouse"&& t("reports.stock_movements_receipts_in_issues_out")}
          </span>
        </div>

        {/* Row 1: date + search */}
        <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
          <span style={{fontSize:11,color:T.t4,fontWeight:600}}>{t("common.bill_date")}</span>
          <input type="date" value={fFrom} onChange={e=>setFFrom(e.target.value)} style={{...selStyle2,width:125}}/>
          <span style={{fontSize:11,color:T.t4}}>to</span>
          <input type="date" value={fTo} onChange={e=>setFTo(e.target.value)} style={{...selStyle2,width:125}}/>
          <div style={{position:"relative",flex:1,minWidth:200}}>
            <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSrch size={12} color={T.t4}/></span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("reports.search_material_party_description")}
              style={{...selStyle2,width:"100%",paddingLeft:26,boxSizing:"border-box"}}/>
          </div>
          {/* Reports = view-only. Add Entry removed; new GRNs come
              from Warehouse / Procurement workflows. */}
          <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
            <button onClick={dlExcel}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
              <IcXLS size={13} color={T.grn}/> {t("common.excel")}
            </button>
            <button onClick={printAll}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
              <IcPrint size={13} color={T.blu}/> {t("finance.pdf_print")}
            </button>
          </div>
        </div>
        {/* Row 2: filters */}
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <select value={fSite} onChange={e=>setFSite(e.target.value)}
            style={{...selStyle2,borderColor:fSite!=="All"?T.blu:T.b1,background:fSite!=="All"?T.bluL:T.surface,color:fSite!=="All"?T.blu:T.t2}}>
            <option value="All">{t("common.all_sites")}</option>{SITES_LIVE.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={fParty} onChange={e=>setFParty(e.target.value)}
            style={{...selStyle2,borderColor:fParty!=="All"?T.pur:T.b1,background:fParty!=="All"?T.purL:T.surface,color:fParty!=="All"?T.pur:T.t2}}>
            <option value="All">{t("reports.all_vendors")}</option>{VENDORS_LIVE.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={fHead} onChange={e=>setFHead(e.target.value)}
            style={{...selStyle2,borderColor:fHead!=="All"?T.blu:T.b1,background:fHead!=="All"?T.bluL:T.surface,color:fHead!=="All"?T.blu:T.t2}}>
            <option value="All">{t("common.all_categories")}</option>{CATS_LIVE.map(h=><option key={h}>{h}</option>)}
          </select>
          {/* MOP dropdown removed — GRNs don't have a payment method
              at GRN time; that lives on the eventual bill payment txn. */}
          {["All","Billed","Unbilled"].map(s=>(
            <button key={s} onClick={()=>setFStatus(s)}
              style={{padding:"4px 11px",borderRadius:20,border:`1.5px solid ${fStatus===s?(s==="Billed"?T.grn:s==="Unbilled"?T.amb:T.blu):T.b1}`,
                background:fStatus===s?(s==="Billed"?T.grnL:s==="Unbilled"?T.ambL:T.bluL):"none",
                color:fStatus===s?(s==="Billed"?T.grn:s==="Unbilled"?T.amb:T.blu):T.t3,
                fontSize:11.5,fontWeight:fStatus===s?700:400,cursor:"pointer"}}>
              {s==="All"?t("common.all_status"):s}
            </button>
          ))}
          {(fSite!=="All"||fParty!=="All"||fHead!=="All"||fStatus!=="All"||search)&&(
            <button onClick={()=>{setFSite("All");setFParty("All");setFHead("All");setFStatus("All");setSearch("");}}
              style={{padding:"4px 10px",borderRadius:20,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:600,cursor:"pointer"}}>
             {t("reports.clear_all")}
            </button>
          )}
        </div>
      </div>

      {/* Add-entry form removed — Reports is view-only. GRN/Challan
          entries come from the Procurement / Warehouse workflows. */}

      {loading && (
        <div style={{padding:"30px",textAlign:"center",fontSize:12,color:T.t4,background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,marginBottom:10}}>
         {t("reports.loading_material_register")}
        </div>
      )}

      {/* Table — GRN material register, line-item level */}
      <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        {/* Columns: Date | Vendor | Site | Flow | Challan/GRN | Material | Category | Qty/Unit | Rate | Total | Status */}
        <div style={{display:"grid",gridTemplateColumns:"75px 115px 90px 95px 100px 1fr 90px 80px 85px 90px 75px",
          padding:"7px 14px",background:T.sb,gap:7}}>
          {["Date","Vendor","Site","Flow","Challan / GRN","Material","Category",
            "Qty / Unit","Rate ₹","Total ₹","Status"].map((h,i)=>(
            <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
          ))}
        </div>

        <div style={{maxHeight:460,overflowY:"auto"}}>
          {filtered.map((r,i)=>{
            const sc=r.status==="Billed"?{c:T.grn,bg:T.grnL}:{c:T.amb,bg:T.ambL};
            const fl=FLOW_LABEL[r.flowType] || {short:"—",bg:T.b1,c:T.t3};
            return(
              <div key={r.id}
                style={{display:"grid",gridTemplateColumns:"75px 115px 90px 95px 100px 1fr 90px 80px 85px 90px 75px",
                  padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",gap:7,
                  background:i%2===0?"transparent":T.surfaceB,
                  transition:"background .1s",cursor:"default"}}
                onMouseEnter={ev=>ev.currentTarget.style.background=T.sltL}
                onMouseLeave={ev=>ev.currentTarget.style.background=i%2===0?"transparent":T.surfaceB}>
                <div style={{fontSize:11,fontWeight:600,color:T.t2}}>{fmtShort(r.date)}</div>
                <div style={{fontSize:11.5,fontWeight:600,color:T.pur,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.vendor}>{r.vendor}</div>
                <div style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.site}>{r.site}</div>
                <Pill label={fl.short} c={fl.c} bg={fl.bg}/>
                <div style={{fontSize:10.5,color:T.t3,overflow:"hidden"}}>
                  <div style={{fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.challan||"—"}</div>
                  {r.grnNumber && <div style={{fontSize:9,color:T.t4}}>{r.grnNumber}</div>}
                </div>
                <div style={{fontSize:12.5,fontWeight:700,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.material}>{r.material}</div>
                <Pill label={r.category} c={T.blu} bg={T.bluL}/>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{fmtN(r.qty)}</div>
                  <div style={{fontSize:9.5,color:T.t4}}>{r.unit||"—"}</div>
                </div>
                <div style={{fontSize:11.5,fontWeight:600,color:T.t2,textAlign:"right"}}>
                  {showRateForRow(r) ? fmtRs(r.rate) : <span style={{color:T.t4}}>—</span>}
                </div>
                <div style={{fontSize:13,fontWeight:800,color:showRateForRow(r)?T.grn:T.t4,textAlign:"right"}}>
                  {showRateForRow(r) ? fmtRs(r.total) : "—"}
                </div>
                <Pill label={r.status} c={sc.c} bg={sc.bg}/>
              </div>
            );
          })}
          {!loading && filtered.length===0&&(
            <div style={{textAlign:"center",padding:"40px",color:T.t4}}>
              <div style={{fontSize:32,marginBottom:8}}>🔍</div>
              <div style={{fontSize:14,fontWeight:600,color:T.t3}}>{t("reports.no_entries_match_the_filters")}</div>
              <div style={{fontSize:11,color:T.t4,marginTop:4}}>
                {rows.length === 0 ? t("reports.no_grn_data_yet_record_receipts") : t("reports.adjust_date_range_or_clear_filters")}
              </div>
            </div>
          )}
        </div>

        {/* Footer totals — TOTAL only counts billed lines (unbilled
            rate is unknown until bill posts). For Project view, also
            counts only direct (a) flows because (c) is qty-only. */}
        <div style={{display:"grid",gridTemplateColumns:"75px 115px 90px 95px 100px 1fr 90px 80px 85px 90px 75px",
          padding:"9px 14px",background:T.surfaceB,borderTop:`2px solid ${T.b2}`,gap:7}}>
          <span style={{fontSize:12,fontWeight:700,color:T.t1,gridColumn:"1/10"}}>{t("reports.total_filtered_entries_view", { filtered: filtered.length, view: view==="all"?"All Flows":view==="vendor"?"Vendor Purchases":view==="project"?"Project Receipts":"Warehouse Flow" })}</span>
          <span style={{fontSize:13,fontWeight:800,color:T.grn,textAlign:"right"}}>{fmtRs(totalAmt)}</span>
          <span style={{fontSize:10.5,color:T.t3}}>{view==="all"?t("reports.vendor_a_b_only"):view==="project"?t("reports.direct_only"):t("reports.billed_only")}</span>
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
  const [projects,setProjects]=useState([]);
  const [loading,setLoading]=useState(true);

  // ── Live data: /projects + /finance/transactions, aggregated per project ──
  // - contract = contract_value || boq_value
  // - received = SUM(receipt amount) where project_id = p.id
  // - billed   = SUM(sales_invoice amount) where project_id = p.id
  // - expenses = projects.total_expense (already maintained server-side)
  // - progress = projects.progress_pct
  // Phases / milestones loaded lazily when a project card is expanded.
  useEffect(()=>{
    setLoading(true);
    Promise.all([
      api.get("/projects"),
      api.get("/finance/transactions?limit=2000"),
    ]).then(([projRes, txnRes])=>{
      if (!projRes?.success || !Array.isArray(projRes.data)) {
        setProjects([]); setLoading(false); return;
      }
      const txns = (txnRes?.success && Array.isArray(txnRes.data)) ? txnRes.data : [];
      // Aggregate received + billed per project_id
      const aggr = {};
      txns.forEach(t => {
        if (!t.project_id) return;
        if (t.status === "cancelled") return;
        if (!aggr[t.project_id]) aggr[t.project_id] = { received: 0, billed: 0 };
        const amt = parseFloat(t.amount) || 0;
        if (t.type === "receipt") aggr[t.project_id].received += amt;
        else if (t.type === "sales_invoice") aggr[t.project_id].billed += amt;
      });
      const list = projRes.data.map(p => {
        const a = aggr[p.id] || { received: 0, billed: 0 };
        const contract = parseFloat(p.contract_value) || parseFloat(p.boq_value) || 0;
        const expenses = parseFloat(p.total_expense) || 0;
        return {
          id: p.id,
          name: p.name,
          site: p.city || p.site_address || "—",
          status: p.status || "ongoing",
          progress: parseInt(p.progress_pct) || 0,
          contract, billed: a.billed, received: a.received, expenses,
          start: p.start_date || "",
          target: p.end_date || "",
          phases: [], // populated on expand (lazy load)
        };
      });
      setProjects(list);
    }).catch(()=>setProjects([])).finally(()=>setLoading(false));
  }, []);

  // Lazy-load milestones when a project is expanded
  useEffect(()=>{
    if (!selProject) return;
    const p = projects.find(x => x.id === selProject);
    if (!p || p.phases.length > 0) return; // already loaded
    api.get("/projects/" + selProject + "/milestones").then(r => {
      if (r?.success && Array.isArray(r.data)) {
        setProjects(prev => prev.map(x => x.id === selProject ? {
          ...x,
          phases: r.data.map(m => ({
            name: m.title || m.name || "Phase",
            pct: parseInt(m.progress_pct) || 0,
            status: m.status === "completed" ? "Done"
                  : m.status === "in_progress" ? "In Progress"
                  : "Pending",
          })),
        } : x));
      }
    }).catch(()=>{});
  }, [selProject, projects]);

  const totalContract=projects.reduce((s,p)=>s+p.contract,0);
  const totalBilled  =projects.reduce((s,p)=>s+p.billed,0);
  const totalReceived=projects.reduce((s,p)=>s+p.received,0);
  const totalExp     =projects.reduce((s,p)=>s+p.expenses,0);
  const totalProfit  =totalReceived-totalExp;
  const avgProgress  =projects.length?Math.round(projects.reduce((s,p)=>s+p.progress,0)/projects.length):0;

  const dlExcelPortfolio=()=>{
    const rows=[
      [COMPANY_NAME+" — Portfolio Financial Report"],
      [`Generated: ${TODAY}`],[],
      ["Project","Site","Status","Progress %","Contract Value ₹","Billed ₹","Received ₹","Expenses ₹","Net Margin ₹","Margin %","Start","Target"],
      ...projects.map(p=>[p.name,p.site,p.status,p.progress+"%",p.contract,p.billed,p.received,p.expenses,p.received-p.expenses,p.received?Math.round((p.received-p.expenses)/p.received*100)+"%":"—",p.start,p.target]),
      [],
      ["TOTAL","","",avgProgress+"%",totalContract,totalBilled,totalReceived,totalExp,totalProfit,totalReceived?Math.round(totalProfit/totalReceived*100)+"%":"—","",""],
    ];
    downloadCSV("GB_Portfolio_Report.csv",rows);
  };

  const dlExcelProject=p=>{
    const rows=[
      [`${p.name} — Progress & Financial Report`],[`Site: ${p.site} | Status: ${p.status} | Generated: ${TODAY}`],[],
      ["Metric","Value"],
      ["Contract Value",p.contract],["Billed",p.billed],["Received",p.received],["Expenses",p.expenses],
      ["Net Margin",p.received-p.expenses],["Margin %",p.received?Math.round((p.received-p.expenses)/p.received*100)+"%":"—"],
      ["Overall Progress",p.progress+"%"],["Start Date",p.start],["Target Date",p.target],[],
      ["Phase","Progress %","Status"],
      ...(p.phases||[]).map(ph=>[ph.name,ph.pct+"%",ph.status]),
    ];
    downloadCSV(`${p.name.replace(/[^a-z0-9]/gi,"_")}_Report.csv`,rows);
  };

  const printPortfolio=()=>{
    const rows=projects.map(p=>{
      const margin=p.received-p.expenses;
      const marginPct=p.received?Math.round(margin/p.received*100):0;
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
    printHTML("Portfolio Report — "+COMPANY_NAME,`
      <div class="header">
        <div><h1>${COMPANY_NAME} — Portfolio Report</h1><div class="header-sub">As of ${TODAY} &nbsp;|&nbsp; ${projects.length} Projects</div></div>
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
    const marginPct=p.received?Math.round(margin/p.received*100):0;
    const phases=(p.phases||[]).map(ph=>`
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
        <div class="sig-box">Authorised By<br/>${COMPANY_NAME}</div>
      </div>`);
  };

  return(
    <div>
      {/* Portfolio summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
        {[{l:t("reports.portfolio"),v:fmtRs(totalContract),c:T.blu},{l:t("common.billed"),v:fmtRs(totalBilled),c:T.pur},{l:t("common.received"),v:fmtRs(totalReceived),c:T.grn},{l:t("reports.expenses"),v:fmtRs(totalExp),c:T.red},{l:t("reports.net_margin"),v:fmtRs(Math.abs(totalProfit)),c:totalProfit>=0?T.grn:T.red}].map((s,i)=>(
          <div key={i} style={{padding:"11px 14px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{s.l}</div>
            <div style={{fontSize:15,fontWeight:800,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{display:"flex",gap:7,marginBottom:12}}>
        <button onClick={dlExcelPortfolio} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:12,fontWeight:600,cursor:"pointer"}}><IcXLS size={14} color={T.grn}/> {t("reports.portfolio_excel")}</button>
        <button onClick={printPortfolio} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:12,fontWeight:600,cursor:"pointer"}}><IcPrint size={14} color={T.blu}/> {t("reports.portfolio_pdf")}</button>
      </div>

      {/* Project cards */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {loading && (
          <div style={{padding:"30px",textAlign:"center",fontSize:12,color:T.t4,background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
           {t("common.loading_projects")}
          </div>
        )}
        {!loading && projects.length === 0 && (
          <div style={{padding:"30px",textAlign:"center",fontSize:13,color:T.t3,background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
           {t("reports.no_projects_yet_create_projects_via")}
          </div>
        )}
        {projects.map(p=>{
          const margin=p.received-p.expenses;
          const marginPct=p.received?Math.round(margin/p.received*100):0;
          const isSel=selProject===p.id;
          // Backend status enum: ongoing | hold | completed | not_started
          const _stat = String(p.status||"").toLowerCase();
          const sc = _stat==="completed"?{c:T.grn,bg:T.grnL}
                   : _stat==="ongoing"  ?{c:T.blu,bg:T.bluL}
                   : _stat==="hold"     ?{c:T.amb,bg:T.ambL}
                   :                     {c:T.slt,bg:T.sltL};
          const statusLabel = _stat ? _stat.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase()) : "—";
          return(
            <div key={p.id} style={{background:T.surface,borderRadius:10,border:`1.5px solid ${isSel?T.blu:T.b1}`,overflow:"hidden",boxShadow:isSel?"0 0 0 3px rgba(37,99,235,0.1)":"0 1px 3px rgba(0,0,0,0.05)"}}>
              <div style={{padding:"13px 16px",cursor:"pointer",borderLeft:`4px solid ${T.blu}`}} onClick={()=>setSelProject(isSel?null:p.id)}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                      <span style={{fontSize:14,fontWeight:700,color:T.t1}}>{p.name}</span>
                      <Pill label={statusLabel} c={sc.c} bg={sc.bg}/>
                    </div>
                    <span style={{fontSize:11.5,color:T.t4}}>{p.site} · {p.start} → {p.target}</span>
                  </div>
                  <div style={{display:"flex",gap:7}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>dlExcelProject(p)} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 9px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcXLS size={11} color={T.grn}/> {t("common.excel")}</button>
                    <button onClick={()=>printProject(p)} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 9px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcPrint size={11} color={T.blu}/> PDF</button>
                  </div>
                </div>

                {/* Overall progress bar */}
                <div style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,color:T.t3}}>{t("reports.overall_progress")}</span>
                    <span style={{fontSize:12,fontWeight:800,color:p.progress>=80?T.grn:p.progress>=50?T.blu:T.amb}}>{p.progress}%</span>
                  </div>
                  <div style={{height:8,background:T.b1,borderRadius:8,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${p.progress}%`,background:p.progress>=80?T.grn:p.progress>=50?T.blu:T.amb,borderRadius:8,transition:"width .5s"}}/>
                  </div>
                </div>

                {/* Financial row */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                  {[{l:t("reports.contract"),v:fmtRs(p.contract),c:T.t1},{l:t("common.received"),v:fmtRs(p.received),c:T.grn},{l:t("reports.expenses"),v:fmtRs(p.expenses),c:T.red},{l:t("reports.margin_marginpct", { marginPct }),v:fmtRs(Math.abs(margin)),c:margin>=0?T.grn:T.red}].map((s,i)=>(
                    <div key={i} style={{padding:"8px 10px",background:T.surfaceB,borderRadius:6,border:`1px solid ${T.b1}`}}>
                      <div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:1}}>{s.l}</div>
                      <div style={{fontSize:13,fontWeight:700,color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expanded: phase breakdown (lazy-loaded from /projects/:id/milestones) */}
              {isSel&&(
                <div style={{padding:"12px 16px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.t2,marginBottom:8}}>{t("reports.phase_wise_progress")}</div>
                  {!p.phases || p.phases.length === 0 ? (
                    <div style={{fontSize:11.5,color:T.t4,padding:"8px 4px",textAlign:"center"}}>
                     {t("reports.no_phases_milestones_defined_for_this")}
                    </div>
                  ) : (
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
                  )}
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
    {id:"cash",    l:t("reports.cash_book_day_book"),  desc:t("reports.date_wise_receipts_payments"),icon:IcCalc},
    {id:"challan", l:t("reports.material_register"),      desc:t("reports.grn_level_material_movement_vendor_project"), icon:IcSheet},
    {id:"progress",l:t("reports.progress_financial"),  desc:t("reports.site_progress_finance_report"),icon:IcBar},
  ];

  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{background:T.sb,padding:"14px 22px",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#2563EB,#FF6F00)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/></svg>
        </div>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:"white",letterSpacing:"-.3px"}}>{COMPANY_NAME}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"1px"}}>{t("reports.reports_accounts")}</div>
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
