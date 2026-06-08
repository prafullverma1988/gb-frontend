import React from "react";
import { T, fmt, STAGES, STAGE_S } from "../shared/tokens";
import { Pill, PBar, Stat, Panel, PHead } from "../shared/ui";

const D = { milestones:[], expBreakdown:[], tasks:[], attendance:[], dpr:[] };

function TabOverview({proj, onRequestPayment}) {
  const margin = proj.boq - proj.expense;
  const expTotal = D.expBreakdown.reduce((s,e)=>s+e.amt,0);

  // Live data derived from other tabs
  const ongoingTasks = D.tasks.filter(t=>t.status==="In Progress");
  const todayAtt = D.attendance[0] || {workers:[]};
  const presentToday = todayAtt.workers.filter(w=>w.present).length;
  const matByStage = STAGES.reduce((a,s)=>({...a,[s]:0}),{});
  const pendingMat = [];

  return (
    <div style={{padding:"16px 18px", display:"flex", flexDirection:"column", gap:14}}>

      {/* ── QUICK ACTIONS — site team raise a payment request ── */}
      {onRequestPayment && (
        <div style={{display:"flex", gap:10, alignItems:"center", justifyContent:"flex-end"}}>
          <button onClick={onRequestPayment}
            style={{padding:"8px 16px", borderRadius:8, border:"none", background:T.blu, color:"#fff", fontSize:12.5, fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:7, fontFamily:"inherit", boxShadow:`0 2px 8px ${T.blu}40`}}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            Request Payment
          </button>
        </div>
      )}

      {/* ── ROW 1 — KPI STATS ── */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10}}>
        <Stat label="Progress"    value={`${proj.progress}%`}         note="Physical completion"                         color={T.blu}/>
        <Stat label="BOQ Value"   value={`₹${fmt(proj.boq)}`}         note="Total contract"                              color={T.slt}/>
        <Stat label="Spent"       value={`₹${fmt(proj.expense)}`}     note={`${proj.boq?Math.round(proj.expense/proj.boq*100):0}% utilised`} color={T.amb}/>
        <Stat label="Margin"      value={`₹${fmt(margin)}`}           note={`${proj.boq?Math.round(margin/proj.boq*100):0}% buffer`} color={T.grn}/>
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
              <div><span style={{fontSize:11, color:T.t4}}>Weather: </span><span style={{fontSize:12, color:T.t2}}>{(D.dpr[0] || {}).weather || "—"}</span></div>
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

export default TabOverview;
