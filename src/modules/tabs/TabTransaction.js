import React, { useState, useEffect } from "react";
import api from "../../config/api";
import { CreateTransactionModal } from "../FinanceModule";
import { T, fmtN } from "../shared/tokens";
import { Pill, Panel, AddBtn } from "../shared/ui";

const D = { invoices:[] };
// Shared grid template so the header and every row column stay aligned.
const TXN_GRID = "66px 1.2fr 1.6fr 150px 130px 120px 92px";

// Raw backend txn type → finance-style display label (mirrors FinanceModule).
const TXN_TYPE_MAP={
  receipt:"Payment In", payment:"Payment Out", material_purchase:"Material Purchase",
  site_expense:"Site Expense", party_payment:"Party Payment", subcon_expense:"Sub-Con",
  material_return:"Material Return", sales_invoice:"Sales Invoice",
  unbilled_material:"Unbilled Material", wallet_payment:"Wallet Payment",
  wallet_topup:"Wallet Top-up", bank_transfer:"Bank Transfer", advance:"Advance",
};
const BACK_DEBIT=["payment","material_purchase","site_expense","party_payment",
  "subcon_expense","wallet_payment","wallet_topup","bank_transfer"];
const mapTxn=t=>{
  const d=t.date?new Date(t.date):new Date();
  return {
    id:t.id,
    date:d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
    party:t.party_name||t.party||"—",
    // ONLY the user's actual note. The auto-generated description is
    // "Type — Party — Project", all of which already have their own columns.
    note:(t.note&&t.note.trim())?t.note.trim():"",
    type:TXN_TYPE_MAP[t.type]||(t.dr?"Payment Out":"Payment In"),
    account:t.account_name||t.account||"",
    amount:parseFloat(t.amount)||0,
    dr:BACK_DEBIT.includes(t.type)||t.dr===true,
    status:t.status||"paid",
  };
};

function TabTransaction({projectId, projectName}) {
  const [transactions, setTransactions] = useState([]);
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

  // Create Transaction dropdown + modal state
  const [showCreateTxn, setShowCreateTxn] = useState(false);
  const [projTxnType,   setProjTxnType]   = useState(null);
  const [txnParties,    setTxnParties]    = useState([]);
  const [txnAccounts,   setTxnAccounts]   = useState([]);
  const [txnProjects,   setTxnProjects]   = useState([]);

  useEffect(()=>{
    if(!projectId) return;
    Promise.all([
      api.get("/finance/parties"),
      api.get("/finance/accounts"),
      api.get("/projects"),
      api.get("/finance/transactions?project_id=" + projectId + "&limit=2000"),
    ]).then(([pRes,aRes,prRes,tRes])=>{
      const allP = (pRes?.success&&Array.isArray(pRes.data)) ? pRes.data : [];
      const projTxns = (tRes?.success&&Array.isArray(tRes.data)) ? tRes.data : [];
      // Store the real project transactions for the table (this was the bug —
      // the list rendered a hardcoded empty array, so it always showed zero).
      setTransactions(projTxns.map(mapTxn));
      // Only parties that have at least 1 transaction on this project
      // (same logic as TabParty). Fallback to all parties if project has no txns yet.
      const projPartyIds = new Set(projTxns.map(t=>Number(t.party_id)).filter(Boolean));
      setTxnParties(projPartyIds.size > 0 ? allP.filter(p=>projPartyIds.has(Number(p.id))) : allP);
      if(aRes?.success&&Array.isArray(aRes.data))   setTxnAccounts(aRes.data);
      if(prRes?.success&&Array.isArray(prRes.data)) setTxnProjects(prRes.data.map(p=>p.name));
    }).catch(()=>{});
  },[projectId]);

  const TYPES   = ["All","Payment In","Payment Out","Material Purchase","Site Expense","Sub-Con","Sales Invoice","Advance"];
  const PARTIES = ["All",...[...new Set(transactions.map(t=>t.party).filter(Boolean))]];
  const ACCOUNTS= ["All","HDFC","SBI","Petty Cash","ICICI OD"];
  const STATUSES= ["All","paid","unpaid","unbilled"];
  const INVOICES= ["All",...D.invoices.map(i=>i.no)];
  const PAYOUTS  = ["All","Inflow (Money In)","Outflow (Money Out)"];

  const typeS={"Payment In":{c:T.grn,bg:T.grnL},"Payment Out":{c:T.red,bg:T.redL},"Material Purchase":{c:T.blu,bg:T.bluL},"Site Expense":{c:T.amb,bg:T.ambL},"Sub-Con":{c:T.pur,bg:T.purL},"Sales Invoice":{c:T.grn,bg:T.grnL},"Advance":{c:"#0891B2",bg:"#E0F2FE"}};
  const acctColor={"HDFC":T.blu,"SBI":T.grn,"Petty Cash":T.amb,"ICICI OD":T.red};

  // account balances
  const ACCT_BAL={"HDFC":1823540,"SBI":945200,"Petty Cash":18500,"ICICI OD":-230000};
  const activeFilters=[fType,fParty,fAcct,fStatus,fInvoice,fPayout,selParty].filter(v=>v!=="All").length+(amtMin||amtMax||search?1:0);

  const filtered=transactions.filter(t=>{
    if(fType!=="All"&&t.type!==fType) return false;
    if(fParty!=="All"&&t.party!==fParty) return false;
    if(selParty!=="All"&&t.party!==selParty) return false;
    if(fAcct!=="All"&&(t.account||"—")!==fAcct) return false;
    if(fStatus!=="All"&&(t.status||"paid")!==fStatus) return false;
    if(fPayout==="Inflow (Money In)"&&t.dr) return false;
    if(fPayout==="Outflow (Money Out)"&&!t.dr) return false;
    if(search&&!(t.party||"").toLowerCase().includes(search.toLowerCase())&&!(t.note||"").toLowerCase().includes(search.toLowerCase())) return false;
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
          {/* Add Transaction dropdown */}
          <div style={{position:"relative"}}>
            <AddBtn label="Add Transaction" onClick={()=>setShowCreateTxn(v=>!v)}/>
            {showCreateTxn&&(<>
              <div onClick={()=>setShowCreateTxn(false)} style={{position:"fixed",inset:0,zIndex:140}}/>
              <div style={{position:"absolute",right:0,top:"calc(100% + 6px)",background:T.surface,borderRadius:10,boxShadow:"0 8px 28px rgba(0,0,0,0.18)",border:`1px solid ${T.b1}`,zIndex:150,width:265,overflow:"hidden"}}>
                {[
                  {section:"Cash & Bank",items:[
                    {l:"Payment Received",    sub:"Client payment in",      c:T.grn, bg:T.grnL},
                    {l:"Payment Made",        sub:"Pay vendor / labour",    c:T.red, bg:T.redL},
                    {l:"Petty Cash Expense",  sub:"Site / misc expense",    c:T.amb, bg:T.ambL},
                  ]},
                  {section:"Billing & Purchases",items:[
                    {l:"Material Purchase Bill", sub:"Record supplier bill", c:T.blu, bg:T.bluL},
                    {l:"Sales Invoice",           sub:"Raise client invoice", c:T.grn, bg:T.grnL},
                    {l:"Sub-Con Bill",            sub:"Labour / subcon work", c:T.slt, bg:T.sltL},
                    {l:"Advance Payment",         sub:"Advance to party",     c:T.pur, bg:T.purL},
                  ]},
                  {section:"Adjustments",items:[
                    {l:"Journal Entry", sub:"Manual debit / credit", c:T.slt, bg:T.sltL},
                    {l:"Credit Note",   sub:"Party balance adjust",  c:T.pur, bg:T.purL},
                  ]},
                ].map((grp,gi)=>(
                  <div key={gi}>
                    <div style={{padding:"7px 12px 3px",background:T.surfaceB,borderTop:gi>0?`1px solid ${T.b1}`:"none"}}>
                      <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.7px"}}>{grp.section}</span>
                    </div>
                    {grp.items.map((item,ii)=>(
                      <button key={ii}
                        onClick={()=>{setShowCreateTxn(false);setProjTxnType(item.l);}}
                        style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"7px 12px",border:"none",background:"none",cursor:"pointer",textAlign:"left"}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                        onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <div style={{width:28,height:28,borderRadius:7,background:item.bg,border:`1px solid ${item.c}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:item.c}}/>
                        </div>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{item.l}</div>
                          <div style={{fontSize:10,color:T.t4}}>{item.sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>)}
          </div>
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
        {/* Column header — Amount + Status right-aligned to match the cells */}
        <div style={{display:"grid",gridTemplateColumns:TXN_GRID,padding:"8px 15px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,alignItems:"center"}}>
          {["Date","Party","Note","Type","Account","Amount","Status"].map((h,i)=>(
            <span key={i} style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".6px",textAlign:i>=5?"right":"left"}}>{h}</span>
          ))}
        </div>
        {filtered.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4,fontSize:13}}>No transactions match filters</div>}
        {filtered.map(txn=>{
          const ts=typeS[txn.type]||{c:T.slt,bg:T.sltL};
          const st=txn.status||"paid";
          const ac=acctColor[txn.account||""]||T.slt;
          const stCol=st==="paid"?{c:T.grn,bg:T.grnL,b:T.grnM}:st==="unbilled"?{c:T.pur,bg:T.purL,b:T.purM}:{c:T.red,bg:T.redL,b:T.redM};
          return(
            <div key={txn.id} style={{display:"grid",gridTemplateColumns:TXN_GRID,padding:"10px 15px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",borderLeft:`3px solid ${txn.dr?T.red:T.grn}44`,transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:11.5,color:T.t4,whiteSpace:"nowrap"}}>{txn.date}</span>
              <span style={{fontSize:12.5,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:10}}>{txn.party}</span>
              <span style={{fontSize:12,color:txn.note?T.t2:T.t4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:10}}>{txn.note||"—"}</span>
              <div style={{minWidth:0}}><Pill label={txn.type} c={ts.c} bg={ts.bg}/></div>
              <div style={{display:"flex",alignItems:"center",gap:5,minWidth:0}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:ac,flexShrink:0}}/>
                <span style={{fontSize:11.5,color:T.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{txn.account||"—"}</span>
              </div>
              <span style={{fontSize:13,fontWeight:700,color:txn.dr?T.red:T.grn,fontVariantNumeric:"tabular-nums",textAlign:"right",whiteSpace:"nowrap"}}>{txn.dr?"−":"+"} ₹{fmtN(txn.amount)}</span>
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <span style={{background:stCol.bg,color:stCol.c,fontSize:9.5,fontWeight:700,padding:"2px 9px",borderRadius:20,border:`1px solid ${stCol.b}`,textTransform:"uppercase",letterSpacing:".3px"}}>{st}</span>
              </div>
            </div>
          );
        })}
      </Panel>

      {/* Create Transaction Modal — project pre-filled & locked */}
      {projTxnType&&(
        <CreateTransactionModal
          type={projTxnType}
          projectId={projectId}
          preProject={projectName}
          lockProject={true}
          onClose={()=>setProjTxnType(null)}
          dbParties={txnParties}
          dbAccounts={txnAccounts}
          dbProjects={txnProjects}
          onSaved={()=>setProjTxnType(null)}
        />
      )}
    </div>
  );
}

export default TabTransaction;
