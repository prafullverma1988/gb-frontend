import React, { useState, useEffect, useMemo } from "react";
import api from "../../config/api";
import { T, fmt, STAGES, STAGE_S } from "../shared/tokens";
import { Pill, PBar, Stat, Panel, PHead } from "../shared/ui";

/* ────────────────────────────────────────────────────────────────────
   Project Overview — mirrors the company dashboard's depth at the
   single-project level, with a Finance / Operations & Team toggle.
   All data is project-scoped and pulled live from the same endpoints
   the individual tabs use, so the numbers stay in sync.
   ──────────────────────────────────────────────────────────────────── */

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
// Canonical money direction (matches FinanceModule TYPE_META).
const IN_TYPES  = ["receipt","sales_invoice","material_return"];
const OUT_TYPES = ["payment","material_purchase","site_expense","party_payment","subcon_expense","wallet_payment"];
const num = (v)=>Number(v)||0;

/* ── Self-contained charts (no shared chart deps — keeps the tab portable) ── */
function DonutChart({slices, size=118, r=40, inner=24}){
  const cx=size/2, cy=size/2;
  const valid=(slices||[]).filter(s=>s.value>0);
  if(!valid.length) return (
    <div style={{width:size,height:size,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:T.t4,fontSize:10.5,border:`1.5px dashed ${T.b2}`,borderRadius:"50%",gap:4}}>
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-9-9v9z"/><path d="M21 12a9 9 0 00-9-9v9h9z"/></svg>
      <span style={{fontWeight:600}}>No spend yet</span>
    </div>
  );
  const total=valid.reduce((s,sl)=>s+sl.value,0)||1;
  const toRad=d=>d*Math.PI/180;
  const arc=(a,b,oR,iR)=>{
    const s={x:cx+oR*Math.cos(toRad(a)),y:cy+oR*Math.sin(toRad(a))};
    const e={x:cx+oR*Math.cos(toRad(b)),y:cy+oR*Math.sin(toRad(b))};
    const si={x:cx+iR*Math.cos(toRad(b)),y:cy+iR*Math.sin(toRad(b))};
    const ei={x:cx+iR*Math.cos(toRad(a)),y:cy+iR*Math.sin(toRad(a))};
    const lg=(b-a)>180?1:0;
    return `M ${s.x} ${s.y} A ${oR} ${oR} 0 ${lg} 1 ${e.x} ${e.y} L ${si.x} ${si.y} A ${iR} ${iR} 0 ${lg} 0 ${ei.x} ${ei.y} Z`;
  };
  let cum=-90;
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {valid.map((sl,i)=>{const deg=(sl.value/total)*360;const a=cum;cum+=deg;return <path key={i} d={arc(a,cum-0.6,r,inner)} fill={sl.color} opacity={0.92}/>;})}
      <circle cx={cx} cy={cy} r={inner-1} fill={T.surface}/>
    </svg>
  );
}

function CashBars({data, height=160}){
  if(!data||!data.length) return (
    <div style={{padding:"40px 16px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
      <div style={{width:38,height:38,borderRadius:"50%",border:`1.5px dashed ${T.b2}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-6"/></svg>
      </div>
      <div style={{fontSize:11.5,color:T.t3,fontWeight:600}}>No transactions yet</div>
      <div style={{fontSize:10.5,color:T.t4}}>Money in / out will chart here</div>
    </div>
  );
  const n=data.length;
  const maxV=Math.max(...data.map(d=>Math.max(d.sales,d.expense)),1);
  // Widen bars + gaps when there are few months so the chart fills the panel
  // instead of rendering as a thin sliver (and so it never over-stretches).
  const bW = n<=2?40 : n<=4?28 : 20; const gap=8; const groupGap = n<=2?70 : n<=4?44 : 28;
  const W=n*(bW*2+gap+groupGap)+20;
  const pad={top:16,bottom:22,left:8,right:8}; const cH=height-pad.top-pad.bottom;
  const sy=v=>pad.top+cH-(v/maxV)*cH; const bH=v=>(v/maxV)*cH;
  let x=pad.left+6;
  return(
    // Explicit height + preserveAspectRatio so the SVG can never balloon vertically.
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet" style={{overflow:"visible", display:"block"}}>
      {[0,0.5,1].map((p,i)=>(<line key={i} x1={pad.left} y1={pad.top+cH*p} x2={W-pad.right} y2={pad.top+cH*p} stroke={T.b1} strokeWidth={0.8} strokeDasharray={p===0?"0":"3,3"}/>))}
      {data.map((d,i)=>{
        const x1=x, x2=x+bW+gap; const cxL=x+bW+gap/2; x+=bW*2+gap+groupGap;
        return(<g key={i}>
          {d.sales>0   && <rect x={x1} y={sy(d.sales)}   width={bW} height={bH(d.sales)}   rx={3} fill={T.grn} opacity={0.85}/>}
          {d.expense>0 && <rect x={x2} y={sy(d.expense)} width={bW} height={bH(d.expense)} rx={3} fill={T.red} opacity={0.8}/>}
          <text x={cxL} y={height-5} textAnchor="middle" fontSize={9} fill={T.t4} fontFamily="'Segoe UI',sans-serif">{d.month}</text>
        </g>);
      })}
    </svg>
  );
}

function TabOverview({proj, onRequestPayment}) {
  const [view, setView]   = useState("operations"); // operations | finance
  const [txns, setTxns]   = useState([]);
  const [tasks, setTasks] = useState([]);
  const [mrs, setMrs]     = useState([]);
  const [team, setTeam]   = useState([]);
  const [payReqs, setPayReqs] = useState([]);
  // Site media — photos shot from Overview AND inside a task, merged by the
  // backend. Office needs the same picture the site sees, without hunting
  // through the Pulse feed.
  const [media, setMedia] = useState(null);      // null = loading
  const [mBucket, setMBucket] = useState("Last week");
  const [mView, setMView] = useState(-1);        // index into the visible list
  // Hatane ka haq server tay karta hai (admin/PM, ya apni daali hui cheez).
  // Client sirf button chhupata hai — asli rok backend par hai.
  const [mCan, setMCan] = useState(false);
  const [pnl, setPnl]     = useState(null); // accrual P&L for this project (shared /finance/project-pnl formula)
  const [pipe, setPipe]   = useState(null); // tender site: is site ki pipeline ka MB-progress
  const [loading, setLoading] = useState(true);

  // Tender se judi site par ek extra sach: pipeline kitni bichhi (MB se) —
  // paisa isi ankde par tay hota hai, task % par nahi. Tender na ho to ye
  // effect chup-chaap kuch nahi karta.
  useEffect(()=>{
    let dead = false;
    if (!proj?.tender_id || !proj?.id) { setPipe(null); return; }
    api.get(`/tenders/${proj.tender_id}/alignments-progress`).then(r=>{
      if (dead || !r?.success) return;
      const s = r.data?.by_site?.[proj.id];
      if (s && s.length_m > 0) setPipe(s);
    }).catch(()=>{});
    return ()=>{ dead = true; };
  }, [proj?.tender_id, proj?.id]);

  useEffect(()=>{
    const pid = proj?.id;
    if(!pid){ setLoading(false); return; }
    let alive=true;
    Promise.all([
      api.get(`/finance/transactions?project_id=${pid}&limit=2000`).catch(()=>null),
      api.get(`/tasks?project_id=${pid}`).catch(()=>null),
      api.get(`/procurement/mrs?project_id=${pid}`).catch(()=>null),
      api.get(`/projects/${pid}/workforce`).catch(()=>null),
      api.get(`/finance/payment-requests?project_id=${pid}`).catch(()=>null),
      api.get(`/finance/project-pnl?project_id=${pid}`).catch(()=>null),
    ]).then(([t,tk,m,wf,pr,pl])=>{
      if(!alive) return;
      if(t?.success)  setTxns(t.data||[]);
      if(tk?.success) setTasks((tk.data||[]).filter(x=>!String(x.task_no||"").startsWith("TODO-")));
      if(m?.success)  setMrs(m.data||[]);
      if(wf?.success){
        const d=wf.data;
        setTeam(Array.isArray(d)?d:[...(d?.company||[]),...(d?.subcon||[]),...(d?.vendor||[])]);
      }
      if(pr?.success) setPayReqs(pr.data||[]);
      if(pl?.success) setPnl(pl.data?.items?.[0]||null);
    }).finally(()=>{ if(alive) setLoading(false); });
    // Separate from the Promise.all above so a slow media list never holds up
    // the KPI row.
    api.get(`/projects/${pid}/media?type=all`)
      .then(r=>{ if(alive){ setMedia(r?.success && Array.isArray(r.data) ? r.data : []); setMCan(!!r?.can_remove); } })
      .catch(()=>{ if(alive) setMedia([]); });
    return ()=>{ alive=false; };
  },[proj?.id]);

  /* ── Site media helpers ── */
  // "Hatao" = archive (is_active=0), mitana nahi. Site ki photo saboot hoti
  // hai — Files tab ke Archive me padi rehti hai aur wapas aa sakti hai.
  const archiveMedia = async (ref) => {
    if(!ref) return;
    const ask = window.confirmAsync || (async (msg) => window.confirm(msg));
    if(!await ask("Ye photo hata dein? Files tab ke Archive me chali jayegi, mitegi nahi.")) return;
    const r = await api.del(`/projects/${proj.id}/media/${ref}`);
    if(!r?.success){ window.alert(r?.message || "Hataya nahi ja saka"); return; }
    setMView(-1);
    setMedia(list => (list||[]).filter(x => (x.ref||x.id) !== ref));
  };

  const isVid = (m) => m.kind==="video" || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(m.url||"");
  const bucketOf = (d)=>{
    const dt=new Date(d); if(isNaN(dt)) return "Older";
    const days=(Date.now()-dt.getTime())/86400000;
    return days<=7 ? "Last week" : days<=30 ? "Last month" : "Older";
  };
  const mediaBuckets = useMemo(()=>{
    const g={"Last week":[],"Last month":[],"Older":[]};
    (media||[]).forEach(m=>{ g[bucketOf(m.created_at)].push(m); });
    return g;
  },[media]);
  const mediaShown = mediaBuckets[mBucket]||[];

  /* ── FINANCE derivations ── */
  const fin = useMemo(()=>{
    const isIn=t=>IN_TYPES.includes(t.type), isOut=t=>OUT_TYPES.includes(t.type);
    const received=txns.filter(isIn).reduce((s,t)=>s+num(t.amount),0);
    const spent=txns.filter(isOut).reduce((s,t)=>s+num(t.amount),0);
    const bm={};
    txns.forEach(t=>{
      const k=String(t.date||"").slice(0,7); if(!k) return;
      if(!bm[k]) bm[k]={in:0,out:0};
      if(isIn(t)) bm[k].in+=num(t.amount); else if(isOut(t)) bm[k].out+=num(t.amount);
    });
    const bars=Object.keys(bm).sort().slice(-6).map(k=>({month:MONTHS[Number(k.split("-")[1])-1]||k, sales:bm[k].in, expense:bm[k].out}));
    const cat=(keys)=>txns.filter(t=>keys.includes(t.type)).reduce((s,t)=>s+num(t.amount),0);
    const slices=[
      {label:"Material Purchase", value:cat(["material_purchase"]),       color:T.blu},
      {label:"Sub-Contractor",    value:cat(["subcon_expense"]),          color:T.pur},
      {label:"Labour / Payments", value:cat(["payment","party_payment"]), color:T.grn},
      {label:"Site Expense",      value:cat(["site_expense"]),            color:T.amb},
      {label:"Other / Wallet",    value:cat(["wallet_payment"]),          color:T.slt},
    ].filter(s=>s.value>0);
    const recent=[...txns].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))).slice(0,6);
    const pendingPay=payReqs.filter(p=>["pending","approved"].includes(String(p.status||"").toLowerCase()));
    const payable=pendingPay.reduce((s,p)=>s+num(p.amount),0);
    return {received, spent, bars, slices, recent, pendingPay, payable};
  },[txns, payReqs]);

  /* ── OPERATIONS derivations ── */
  const ops = useMemo(()=>{
    const done=s=>/done|complete/i.test(s||"");
    const open=tasks.filter(t=>!done(t.status));
    const ongoing=tasks.filter(t=>/progress/i.test(t.status||""));
    const overdue=open.filter(t=>{ const e=t.base_end||t.actual_end||t.end_date; return e && new Date(e) < new Date(); });
    const stageOf=(m)=>{
      const ms=(m.mat_status||"").toLowerCase(); const rs=(m.mr_status||"").toLowerCase();
      if(ms.includes("used")) return "Used";
      if(ms.includes("received")) return "Received";
      if(ms.includes("ordered")) return "Ordered";
      if(rs.includes("approve")) return "Approved";
      return "Requested";
    };
    const byStage={}; STAGES.forEach(s=>byStage[s]=0);
    mrs.forEach(m=>{ const s=stageOf(m); byStage[s]=(byStage[s]||0)+1; });
    const matPending=mrs.filter(m=>["Requested","Approved","Ordered"].includes(stageOf(m))).length;
    return {open, ongoing, overdue, byStage, matPending};
  },[tasks, mrs]);

  const margin = num(proj?.boq) - num(proj?.expense);
  const signed = (n)=>`${n<0?"−":""}₹${fmt(Math.abs(n))}`; // clean ±₹ display
  const endDate = proj?.end_date || proj?.endDate || proj?.end;
  let daysLeft="—", daysNote="No end date set";
  if(endDate){
    const dl=Math.ceil((new Date(endDate)-new Date())/86400000);
    daysLeft = dl<0 ? `${Math.abs(dl)}d over` : String(dl);
    daysNote = "Till "+new Date(endDate).toLocaleDateString("en-IN",{month:"short",year:"numeric"});
  }
  const expTotal = fin.slices.reduce((s,e)=>s+e.value,0);

  /* ── Toggle switch ── */
  const Switch=(
    <div style={{display:"inline-flex", background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:3}}>
      {[{v:"operations",l:"Operations & Team",c:T.pur},{v:"finance",l:"Finance",c:T.blu}].map(t=>(
        <button key={t.v} onClick={()=>setView(t.v)}
          style={{padding:"8px 18px", border:"none", background:view===t.v?t.c:"transparent", color:view===t.v?"#fff":T.t3, borderRadius:8, fontSize:12.5, fontWeight:700, cursor:"pointer", transition:"all .15s", fontFamily:"inherit"}}>
          {t.l}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{padding:"16px 18px", display:"flex", flexDirection:"column", gap:14}}>

      {/* ── Header: toggle + request payment ── */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap"}}>
        {Switch}
        {onRequestPayment && (
          <button onClick={onRequestPayment}
            style={{padding:"8px 16px", borderRadius:8, border:"none", background:T.blu, color:"#fff", fontSize:12.5, fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:7, fontFamily:"inherit", boxShadow:`0 2px 8px ${T.blu}40`}}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            Request Payment
          </button>
        )}
      </div>

      {/* ══════════════════ OPERATIONS & TEAM ══════════════════ */}
      {view==="operations" && (<>
        {/* KPI row */}
        <div style={{display:"grid", gridTemplateColumns:`repeat(${pipe?7:6},1fr)`, gap:10}}>
          <Stat label="Progress"      value={`${proj?.progress||0}%`}   note="Physical completion" color={T.blu}/>
          {/* Tender site: MB wala sach alag tile me — bill isi se banta hai */}
          {pipe && <Stat label="Pipeline (MB se)" value={`${pipe.pct||0}%`}
            note={`${pipe.done_m>=1000?(pipe.done_m/1000).toFixed(2)+" km":Math.round(pipe.done_m)+" m"} / ${pipe.length_m>=1000?(pipe.length_m/1000).toFixed(2)+" km":Math.round(pipe.length_m)+" m"}`}
            color={T.ind}/>}
          <Stat label="Days Left"     value={daysLeft}                  note={daysNote}            color={T.pur}/>
          <Stat label="Open Tasks"    value={String(ops.open.length)}   note={`${ops.ongoing.length} in progress`} color={T.amb}/>
          <Stat label="Team On Site"  value={String(team.length)}       note="Workforce assigned"  color={T.grn}/>
          <Stat label="Material Due"  value={String(ops.matPending)}    note="Requests in pipeline" color={T.slt}/>
          <Stat label="Overdue"       value={String(ops.overdue.length)} note="Tasks need action"  color={ops.overdue.length?T.red:T.grn}/>
        </div>

        {/* Progress + Ongoing tasks */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1.4fr", gap:14}}>
          {/* Progress donut */}
          <Panel>
            <PHead title="Project Progress"/>
            <div style={{padding:"16px 15px", display:"flex", gap:16, alignItems:"center"}}>
              <svg width={92} height={92} viewBox="0 0 92 92" style={{flexShrink:0}}>
                <circle r={36} cx={46} cy={46} fill="none" stroke={T.b1} strokeWidth={9}/>
                <circle r={36} cx={46} cy={46} fill="none" stroke={T.blu} strokeWidth={9} strokeLinecap="round"
                  strokeDasharray={`${(proj?.progress||0)/100*2*Math.PI*36} 999`}
                  transform="rotate(-90 46 46)" style={{transition:"stroke-dasharray .8s"}}/>
                <text x={46} y={51} textAnchor="middle" fontSize={18} fontWeight={700} fill={T.t1}>{proj?.progress||0}%</text>
              </svg>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:8}}>
                  <span style={{fontSize:11, color:T.t4}}>Tasks done</span>
                  <span style={{fontSize:12, fontWeight:700, color:T.t1}}>{tasks.length-ops.open.length}/{tasks.length}</span>
                </div>
                <PBar pct={tasks.length?Math.round((tasks.length-ops.open.length)/tasks.length*100):0} color={T.grn} h={6}/>
                <div style={{display:"flex", gap:14, marginTop:12}}>
                  <div><div style={{fontSize:10, color:T.t4, textTransform:"uppercase", letterSpacing:".4px"}}>In progress</div><div style={{fontSize:15, fontWeight:700, color:T.blu}}>{ops.ongoing.length}</div></div>
                  <div><div style={{fontSize:10, color:T.t4, textTransform:"uppercase", letterSpacing:".4px"}}>Overdue</div><div style={{fontSize:15, fontWeight:700, color:ops.overdue.length?T.red:T.t3}}>{ops.overdue.length}</div></div>
                  <div><div style={{fontSize:10, color:T.t4, textTransform:"uppercase", letterSpacing:".4px"}}>Total</div><div style={{fontSize:15, fontWeight:700, color:T.t1}}>{tasks.length}</div></div>
                </div>
              </div>
            </div>
          </Panel>

          {/* Ongoing tasks list */}
          <Panel>
            <PHead title="Ongoing Tasks" action={<Pill label={`${ops.ongoing.length} active`} c={T.blu} bg={T.bluL}/>}/>
            <div style={{maxHeight:230, overflowY:"auto"}}>
              {ops.ongoing.length===0
                ? <div style={{padding:"28px 15px", fontSize:12.5, color:T.t4, textAlign:"center"}}>{loading?"Loading…":"No tasks in progress"}</div>
                : ops.ongoing.slice(0,8).map((t,i)=>{
                    const pct=num(t.progress??t.progress_pct);
                    return (
                      <div key={t.id||i} style={{padding:"9px 15px", borderBottom:`1px solid ${T.b1}`, borderLeft:`3px solid ${T.blu}44`}}>
                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5, gap:8}}>
                          <span style={{fontSize:12.5, fontWeight:600, color:T.t1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{t.name||t.title||t.task_name||`Task ${t.no||t.id}`}</span>
                          <span style={{fontSize:12, fontWeight:700, color:T.blu, flexShrink:0}}>{pct}%</span>
                        </div>
                        <PBar pct={pct} color={pct>70?T.grn:T.blu} h={4}/>
                        <div style={{display:"flex", justifyContent:"space-between", marginTop:5}}>
                          <span style={{fontSize:11, color:T.t4}}>{t.assignee||t.assigned_to_name||t.owner||"Unassigned"}</span>
                          {(t.base_end||t.end_date)&&<span style={{fontSize:11, color:T.t3}}>Due {new Date(t.base_end||t.end_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</span>}
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </Panel>
        </div>

        {/* Material + Team */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
          {/* Material pipeline */}
          <Panel>
            <PHead title="Material Status" action={
              ops.matPending>0 ? <Pill label={`${ops.matPending} in pipeline`} c={T.amb} bg={T.ambL}/> : <Pill label="All clear" c={T.grn} bg={T.grnL}/>
            }/>
            <div style={{padding:"12px 15px"}}>
              <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:mrs.length?12:0}}>
                {STAGES.map(s=>{ const ss=STAGE_S[s]; const c=ops.byStage[s]||0; if(!c) return null;
                  return <Pill key={s} label={`${s} · ${c}`} c={ss.c} bg={ss.bg}/>; })}
              </div>
              {mrs.length===0
                ? <div style={{padding:"18px 0", fontSize:12.5, color:T.t4, textAlign:"center"}}>{loading?"Loading…":"No material requests yet"}</div>
                : (
                  <div style={{display:"flex", flexDirection:"column", gap:7}}>
                    {mrs.slice(0,5).map((m,i)=>{
                      const stage=(()=>{ const ms=(m.mat_status||"").toLowerCase(),rs=(m.mr_status||"").toLowerCase();
                        if(ms.includes("used"))return"Used"; if(ms.includes("received"))return"Received"; if(ms.includes("ordered"))return"Ordered"; if(rs.includes("approve"))return"Approved"; return"Requested"; })();
                      const ss=STAGE_S[stage]||STAGE_S.Requested;
                      return (
                        <div key={m.id||i} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 10px", background:T.surfaceB, borderRadius:7, borderLeft:`3px solid ${ss.c}`}}>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:12, fontWeight:600, color:T.t1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{m.item_name||m.material_name||"Material"}</div>
                            <div style={{fontSize:10.5, color:T.t4}}>{m.quantity?`${m.quantity} ${m.unit||""}`:""}{m.requested_by?` · ${m.requested_by}`:""}</div>
                          </div>
                          <Pill label={stage} c={ss.c} bg={ss.bg}/>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          </Panel>

          {/* Team / workforce */}
          <Panel>
            <PHead title="Team On Site" action={<Pill label={`${team.length} assigned`} c={T.pur} bg={T.purL}/>}/>
            <div style={{padding:"6px 0 4px", maxHeight:240, overflowY:"auto"}}>
              {team.length===0
                ? <div style={{padding:"28px 15px", fontSize:12.5, color:T.t4, textAlign:"center"}}>{loading?"Loading…":"No workforce assigned yet"}</div>
                : team.slice(0,8).map((w,i)=>{
                    const name=w.name||w.worker_name||w.company_name||w.subcon_name||"Member";
                    const role=w.role||w.skill||w.type||"";
                    const init=name.split(" ").map(s=>s[0]).slice(0,2).join("").toUpperCase();
                    return (
                      <div key={w.id||i} style={{padding:"7px 15px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", gap:10}}>
                        <div style={{width:30, height:30, borderRadius:"50%", background:T.purL, color:T.pur, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0}}>{init}</div>
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{fontSize:12, fontWeight:600, color:T.t1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{name}</div>
                          {role&&<div style={{fontSize:10.5, color:T.t4, textTransform:"capitalize"}}>{role}</div>}
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </Panel>
        </div>

        {/* ── SITE PHOTOS & VIDEOS (full width, bottom) ── */}
        <Panel>
          <PHead title="Site Photos & Videos" action={
            <div style={{display:"flex", gap:6}}>
              {["Last week","Last month","Older"].map(b=>(
                <button key={b} onClick={()=>setMBucket(b)}
                  style={{padding:"4px 10px", borderRadius:14, border:`1px solid ${mBucket===b?T.pur:T.b1}`,
                    background:mBucket===b?T.purL:T.surface, color:mBucket===b?T.pur:T.t3,
                    fontSize:10.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit"}}>
                  {b}{mediaBuckets[b]?.length ? ` · ${mediaBuckets[b].length}` : ""}
                </button>
              ))}
            </div>
          }/>
          <div style={{padding:"10px 15px 14px"}}>
            {media===null && <div style={{padding:"24px 0", fontSize:12.5, color:T.t4, textAlign:"center"}}>Loading…</div>}
            {media!==null && mediaShown.length===0 && (
              <div style={{padding:"24px 0", fontSize:12.5, color:T.t4, textAlign:"center"}}>
                {mBucket} me koi site photo nahi.
              </div>
            )}
            {mediaShown.length>0 && (
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:8}}>
                {mediaShown.map((m,i)=>(
                  <div key={m.id} onClick={()=>setMView(i)} title={m.task_name||m.caption||""}
                    style={{position:"relative", paddingTop:"75%", background:T.b1, borderRadius:8, overflow:"hidden", cursor:"zoom-in", border:`1px solid ${T.b1}`}}>
                    {isVid(m)
                      ? <><video src={m.url} muted preload="metadata" style={{position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover"}}/>
                          <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.28)"}}>
                            <svg width={22} height={22} viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                          </div></>
                      : <img src={m.url} alt="" loading="lazy" style={{position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover"}}/>}
                    {m.task_name && (
                      <div style={{position:"absolute", left:0, right:0, bottom:0, padding:"12px 6px 4px",
                        background:"linear-gradient(transparent, rgba(0,0,0,.75))", color:"white", fontSize:9.5,
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{m.task_name}</div>
                    )}
                    {mCan && (
                      <button onClick={(e)=>{e.stopPropagation(); archiveMedia(m.ref||m.id);}} title="Hatao (archive)"
                        style={{position:"absolute", top:5, right:5, width:21, height:21, borderRadius:"50%",
                          border:"none", background:"rgba(15,23,42,.62)", color:"white", fontSize:11, fontWeight:700,
                          lineHeight:"21px", padding:0, cursor:"pointer", fontFamily:"inherit"}}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {mView>=0 && mediaShown[mView] && (
          <MediaLightbox items={mediaShown} index={mView} onIndex={setMView} onClose={()=>setMView(-1)} isVid={isVid}
            onRemove={mCan ? archiveMedia : null}/>
        )}
      </>)}

      {/* ══════════════════ FINANCE ══════════════════ */}
      {view==="finance" && (<>
        {/* KPI row */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10}}>
          <Stat label="BOQ Value"   value={`₹${fmt(num(proj?.boq))}`}        note="Total contract"      color={T.slt}/>
          <Stat label="Received"    value={`₹${fmt(fin.received)}`}          note={num(proj?.boq)?`${Math.round(fin.received/num(proj.boq)*100)}% of BOQ`:"Money in"} color={T.grn}/>
          <Stat label="Spent"       value={`₹${fmt(num(proj?.expense)||fin.spent)}`} note={num(proj?.boq)?`${Math.round((num(proj?.expense)||fin.spent)/num(proj.boq)*100)}% utilised`:"Money out"} color={T.amb}/>
          <Stat label="Margin"      value={signed(margin)}                  note={num(proj?.boq)?`${Math.round(margin/num(proj.boq)*100)}% buffer`:""} color={margin>=0?T.grn:T.red}/>
          <Stat label="Receivable"  value={`₹${fmt(Math.max(0,num(proj?.boq)-fin.received))}`} note="Yet to collect" color={T.blu}/>
          <Stat label="Payable"     value={`₹${fmt(fin.payable)}`}           note={`${fin.pendingPay.length} request${fin.pendingPay.length===1?"":"s"}`} color={fin.payable?T.red:T.grn}/>
        </div>

        {/* Project P&L (invoice-basis) — actual profit/loss, distinct from BOQ "Margin" above.
            Numbers come from /finance/project-pnl (same shared formula as the Sahayak bot). */}
        {pnl && (
          <Panel>
            <PHead title="Project P&L — Invoice basis" action={
              <Pill label={pnl.pnl>=0?"Profit / Labh":"Loss / Haani"} c={pnl.pnl>=0?T.grn:T.red} bg={pnl.pnl>=0?T.grnL:T.redL}/>
            }/>
            <div style={{display:"flex",alignItems:"center",padding:"14px 16px",gap:16,flexWrap:"wrap"}}>
              <div style={{minWidth:120}}>
                <div style={{fontSize:10.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",fontWeight:600}}>Revenue (Invoiced)</div>
                <div style={{fontSize:18,fontWeight:800,color:T.grn,marginTop:3}}>₹{fmt(num(pnl.revenue))}</div>
              </div>
              <div style={{fontSize:18,color:T.t4,fontWeight:600}}>−</div>
              <div style={{minWidth:120}}>
                <div style={{fontSize:10.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",fontWeight:600}}>Cost</div>
                <div style={{fontSize:18,fontWeight:800,color:T.amb,marginTop:3}}>₹{fmt(num(pnl.cost))}</div>
              </div>
              <div style={{fontSize:18,color:T.t4,fontWeight:600}}>=</div>
              <div style={{minWidth:130,background:pnl.pnl>=0?T.grnL:T.redL,borderRadius:8,padding:"7px 13px"}}>
                <div style={{fontSize:10.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",fontWeight:600}}>Net P&L</div>
                <div style={{fontSize:20,fontWeight:800,color:pnl.pnl>=0?T.grn:T.red,marginTop:2}}>{signed(num(pnl.pnl))}</div>
              </div>
              <div style={{flex:1,minWidth:200,fontSize:11,color:T.t4,lineHeight:1.55,alignSelf:"center"}}>
                Revenue = is project ki <b>invoice</b> (kaam ka bill). Cost = material + sub-con + site + equipment + transfer − material-return.
                Payment/receipt <b>isme nahi</b> (wo cash flow hai). Upar wala <b>"Margin"</b> alag hai — wo BOQ − spent.
              </div>
            </div>
          </Panel>
        )}

        {/* Cashflow + Expense breakdown */}
        <div style={{display:"grid", gridTemplateColumns:"1.7fr 1fr", gap:14}}>
          <Panel>
            <PHead title="Cash Flow — Monthly" action={
              <div style={{display:"flex", gap:12}}>
                <span style={{fontSize:10.5}}><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:T.grn,marginRight:4}}/><span style={{color:T.t4}}>In</span></span>
                <span style={{fontSize:10.5}}><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:T.red,marginRight:4}}/><span style={{color:T.t4}}>Out</span></span>
              </div>
            }/>
            <div style={{padding:"12px 15px"}}>
              <CashBars data={fin.bars}/>
              <div style={{display:"flex", justifyContent:"space-around", marginTop:10, paddingTop:10, borderTop:`1px solid ${T.b1}`}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:10, color:T.t4, textTransform:"uppercase", letterSpacing:".4px"}}>Received</div><div style={{fontSize:15, fontWeight:700, color:T.grn}}>₹{fmt(fin.received)}</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:10, color:T.t4, textTransform:"uppercase", letterSpacing:".4px"}}>Spent</div><div style={{fontSize:15, fontWeight:700, color:T.red}}>₹{fmt(num(proj?.expense)||fin.spent)}</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:10, color:T.t4, textTransform:"uppercase", letterSpacing:".4px"}}>Net</div><div style={{fontSize:15, fontWeight:700, color:fin.received-(num(proj?.expense)||fin.spent)>=0?T.blu:T.red}}>{signed(fin.received-(num(proj?.expense)||fin.spent))}</div></div>
              </div>
            </div>
          </Panel>

          <Panel>
            <PHead title="Expense Breakdown" action={<span style={{fontSize:11, color:T.t4}}>Total: <strong style={{color:T.t1}}>₹{fmt(expTotal)}</strong></span>}/>
            <div style={{padding:"14px 15px", display:"flex", gap:14, alignItems:"center"}}>
              <DonutChart slices={fin.slices}/>
              <div style={{flex:1, minWidth:0}}>
                {fin.slices.length===0
                  ? <div style={{fontSize:12, color:T.t4}}>{loading?"Loading…":"No expenses recorded"}</div>
                  : fin.slices.map((s,i)=>(
                    <div key={i} style={{display:"flex", alignItems:"center", gap:7, marginBottom:7}}>
                      <div style={{width:9, height:9, borderRadius:3, background:s.color, flexShrink:0}}/>
                      <span style={{flex:1, fontSize:11.5, color:T.t2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{s.label}</span>
                      <span style={{fontSize:11.5, fontWeight:700, color:T.t1}}>₹{fmt(s.value)}</span>
                      <span style={{fontSize:10, color:T.t4, width:30, textAlign:"right"}}>{Math.round(s.value/(expTotal||1)*100)}%</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </Panel>
        </div>

        {/* Recent transactions + payment requests */}
        <div style={{display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:14}}>
          <Panel>
            <PHead title="Recent Transactions" action={<Pill label={`${txns.length} total`} c={T.slt} bg={T.sltL}/>}/>
            <div>
              {fin.recent.length===0
                ? <div style={{padding:"28px 15px", fontSize:12.5, color:T.t4, textAlign:"center"}}>{loading?"Loading…":"No transactions yet"}</div>
                : fin.recent.map((t,i)=>{
                    const isIn=IN_TYPES.includes(t.type);
                    return (
                      <div key={t.id||i} style={{padding:"9px 15px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10}}>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:12, fontWeight:600, color:T.t1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{t.party_name||t.description||t.head_name||"Transaction"}</div>
                          <div style={{fontSize:10.5, color:T.t4}}>{t.date?new Date(t.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):""}{t.type?` · ${t.type.replace(/_/g," ")}`:""}</div>
                        </div>
                        <span style={{fontSize:12.5, fontWeight:700, color:isIn?T.grn:T.red, flexShrink:0, fontVariantNumeric:"tabular-nums"}}>{isIn?"+":"−"}₹{fmt(num(t.amount))}</span>
                      </div>
                    );
                  })
              }
            </div>
          </Panel>

          <Panel>
            <PHead title="Payment Requests" action={
              fin.pendingPay.length>0 ? <Pill label={`${fin.pendingPay.length} pending`} c={T.amb} bg={T.ambL}/> : <Pill label="None" c={T.grn} bg={T.grnL}/>
            }/>
            <div>
              {fin.pendingPay.length===0
                ? <div style={{padding:"28px 15px", fontSize:12.5, color:T.t4, textAlign:"center"}}>{loading?"Loading…":"No pending payment requests"}</div>
                : fin.pendingPay.slice(0,6).map((p,i)=>{
                    const st=String(p.status||"").toLowerCase();
                    const sc=st==="approved"?{c:T.blu,bg:T.bluL}:{c:T.amb,bg:T.ambL};
                    return (
                      <div key={p.id||i} style={{padding:"9px 15px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10}}>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:12, fontWeight:600, color:T.t1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.purpose||p.description||p.party_name||"Payment request"}</div>
                          <div style={{fontSize:10.5, color:T.t4}}>{p.priority?`${p.priority} · `:""}{p.needed_by_date?`by ${new Date(p.needed_by_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}`:(p.requested_by||"")}</div>
                        </div>
                        <div style={{display:"flex", alignItems:"center", gap:8, flexShrink:0}}>
                          <span style={{fontSize:12.5, fontWeight:700, color:T.t1}}>₹{fmt(num(p.amount))}</span>
                          <Pill label={st} c={sc.c} bg={sc.bg}/>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </Panel>
        </div>
      </>)}

    </div>
  );
}

/* ── Lightbox with real zoom ──────────────────────────────────────
   A site photo is only useful if you can get close enough to read a crack,
   a bar spacing or a level mark, so this zooms properly: scroll wheel to
   scale around the pointer, drag to pan once zoomed, arrow keys to move
   between shots, Esc to close. */
function MediaLightbox({items, index, onIndex, onClose, isVid, onRemove}){
  const m = items[index];
  const [z, setZ] = useState(1);
  const [off, setOff] = useState({x:0,y:0});
  const drag = React.useRef(null);

  useEffect(()=>{ setZ(1); setOff({x:0,y:0}); },[index]);
  useEffect(()=>{
    const onKey=(e)=>{
      if(e.key==="Escape") onClose();
      if(e.key==="ArrowRight" && index<items.length-1) onIndex(index+1);
      if(e.key==="ArrowLeft"  && index>0)              onIndex(index-1);
    };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[index,items.length,onIndex,onClose]);

  const onWheel=(e)=>{
    if(isVid(m)) return;
    e.preventDefault();
    setZ(prev=>{
      // 10x — office often has to read the photo (crack, bar spacing, challan
      // number), not just look at it.
      const nz=Math.min(10, Math.max(1, prev * (e.deltaY<0 ? 1.15 : 1/1.15)));
      if(nz===1) setOff({x:0,y:0});
      return nz;
    });
  };
  const onDown=(e)=>{ if(z>1) drag.current={x:e.clientX,y:e.clientY,ox:off.x,oy:off.y}; };
  const onMove=(e)=>{ if(drag.current) setOff({x:drag.current.ox+(e.clientX-drag.current.x), y:drag.current.oy+(e.clientY-drag.current.y)}); };
  const stop=()=>{ drag.current=null; };

  return (
    <div onClick={onClose}
      style={{position:"fixed", inset:0, background:"rgba(0,0,0,.93)", zIndex:1400, display:"flex", flexDirection:"column"}}>
      <div onClick={e=>e.stopPropagation()}
        style={{display:"flex", alignItems:"center", gap:12, padding:"12px 18px", color:"white", flexShrink:0}}>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:13, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
            {m.task_name || m.caption || "Site photo"}
          </div>
          <div style={{fontSize:11, color:"rgba(255,255,255,.55)", marginTop:2}}>
            {new Date(m.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}
            {" · "}{new Date(m.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
            {m.by?` · ${m.by}`:""} · {index+1}/{items.length}
          </div>
          {/* Coordinates rather than an address — reverse geocoding would be an
              API call per photo, and the fix is what proves where it was shot. */}
          {m.lat!=null && m.lng!=null && (
            <div style={{fontSize:10.5, color:"rgba(255,255,255,.42)", marginTop:2, fontFamily:"monospace"}}>
              📍 {Number(m.lat).toFixed(5)}, {Number(m.lng).toFixed(5)}
            </div>
          )}
        </div>
        {!isVid(m) && (
          <>
            <span style={{fontSize:11.5, color:"rgba(255,255,255,.6)"}}>{z.toFixed(1)}×</span>
            <button onClick={()=>{setZ(1);setOff({x:0,y:0});}} style={lbBtn}>Reset</button>
          </>
        )}
        {onRemove && (
          <button onClick={()=>onRemove(m.ref||m.id)} style={{...lbBtn, background:"rgba(220,38,38,.85)"}}>Hatao</button>
        )}
        <button onClick={onClose} style={lbBtn}>Band</button>
      </div>

      <div onClick={e=>e.stopPropagation()} onWheel={onWheel}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={stop} onMouseLeave={stop}
        style={{flex:1, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center",
          cursor: isVid(m) ? "default" : (z>1 ? (drag.current?"grabbing":"grab") : "zoom-in")}}>
        {isVid(m)
          ? <video src={m.url} controls autoPlay style={{maxWidth:"92%", maxHeight:"100%"}}/>
          : <img src={m.url} alt="" draggable={false}
              style={{maxWidth:"92%", maxHeight:"100%", objectFit:"contain",
                transform:`translate(${off.x}px,${off.y}px) scale(${z})`,
                transition: drag.current?"none":"transform .12s ease-out"}}/>}
      </div>

      <div onClick={e=>e.stopPropagation()}
        style={{display:"flex", alignItems:"center", justifyContent:"center", gap:16, padding:"10px 0 16px", flexShrink:0}}>
        <button onClick={()=>index>0&&onIndex(index-1)} disabled={index===0} style={{...lbBtn, opacity:index===0?.35:1}}>← Pichhla</button>
        <span style={{fontSize:11, color:"rgba(255,255,255,.4)"}}>
          {isVid(m) ? "Video" : "Scroll se zoom · drag se ghumayein"}
        </span>
        <button onClick={()=>index<items.length-1&&onIndex(index+1)} disabled={index===items.length-1} style={{...lbBtn, opacity:index===items.length-1?.35:1}}>Agla →</button>
      </div>
    </div>
  );
}
const lbBtn = {background:"rgba(255,255,255,.15)", border:"none", color:"white", borderRadius:7, padding:"6px 13px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit"};

export default TabOverview;
