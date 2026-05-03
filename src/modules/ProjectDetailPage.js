import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api, { API_BASE } from "../config/api";
import { Avatar, Credit } from "../components/Credit";
import PaymentRequestDrawer from "../components/PaymentRequestDrawer";
import SearchSelect from "../components/SearchSelect";

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
  id:0, name:"", client:"",
  city:"", type:"", progress:0, status:"",
  boq:0, expense:0, pm:"", sup:"",
  start:"", end:"", address:"",
  area:"", floors:"",
};
const STATUS_S = {
  "Ongoing":     {c:T.grn, bg:T.grnL},
  "Completed":   {c:T.blu, bg:T.bluL},
  "Hold":        {c:T.amb, bg:T.ambL},
  "Not Started": {c:T.slt, bg:T.sltL},
};
const D = {
  milestones:[],
  expBreakdown:[],
  drawings:[],
  boqSections:[],
  invoices:[],
  parties:[],
  partyTxns:{},
  transactions:[],
  todos:[],
  tasks:[],
  attendance:[],
  materials:[],
  subcons:[],
  equipment:[],
  folders:[],
  dpr:[],
  moms:[],
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
  const todayAtt = D.attendance[0] || {workers:[]};
  const presentToday = todayAtt.workers.filter(w=>w.present).length;
  const matByStage = STAGES.reduce((a,s)=>({...a,[s]:0}),{});
  const pendingMat = [];

  return (
    <div style={{padding:"16px 18px", display:"flex", flexDirection:"column", gap:14}}>

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
  const CATS  = Array.from(new Set(dbCats.length  > 0 ? dbCats.map(c=>c.name)  : ["Architectural","Structural","Electrical","Plumbing","Interior","Landscape","MEP"]));
  const TYPES = Array.from(new Set(dbTypes.length > 0 ? dbTypes.map(t=>t.name) : ["Plan","Elevation","Section","Detail","3D","Diagram"]));
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
              <SearchSelect value={reqForm.category} options={CATS}
                onChange={v=>setReqForm(p=>({...p,category:v}))} placeholder="Select category..."/>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase",display:"block",marginBottom:4}}>Priority</label>
              <SearchSelect value={reqForm.priority} options={["Low","Normal","High","Urgent"]}
                onChange={v=>setReqForm(p=>({...p,priority:v}))} placeholder="Select priority..."/>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase",display:"block",marginBottom:4}}>Assign To (optional)</label>
            <input value={reqForm.assigned_to||""} onChange={e=>setReqForm(p=>({...p,assigned_to:e.target.value}))}
              placeholder="Designer name"
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

function TabDesign({ project, isAdmin }) {
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
  const CATS  = Array.from(new Set(dbCats.length  > 0 ? dbCats.map(c=>c.name)  : CATS_DEFAULT));
  const TYPES = Array.from(new Set(dbTypes.length > 0 ? dbTypes.map(t=>t.name) : TYPES_DEFAULT));

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
  const [expandedReqId,    setExpandedReqId]   = useState(null);

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

  // Dedupe helper — collapse rows with same case-insensitive name (keep first)
  const dedupeByName = (arr) => {
    const seen = new Set();
    return (arr||[]).filter(item => {
      const k = String(item.name||"").trim().toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  const loadCategories = async () => {
    try {
      const [catRes, typeRes, titRes] = await Promise.all([
        api.get("/design/categories?type=category"),
        api.get("/design/categories?type=drawing_type"),
        api.get("/design/titles"),
      ]);
      if (catRes.success  && catRes.data.length)  setDbCats(dedupeByName(catRes.data));
      if (typeRes.success && typeRes.data.length)  setDbTypes(dedupeByName(typeRes.data));
      if (titRes.success  && titRes.data.length)   setDbTitles(dedupeByName(titRes.data));
    } catch(e) {}
  };

  // Load titles immediately on mount (separate from categories for speed)
  useEffect(() => {
    if (!projectId) return;
    api.get("/design/titles").then(r=>{ if(r.success&&r.data.length) setDbTitles(dedupeByName(r.data)); }).catch(()=>{});
    api.get("/design/categories?type=category").then(r=>{ if(r.success&&r.data.length) setDbCats(dedupeByName(r.data)); }).catch(()=>{});
    api.get("/design/categories?type=drawing_type").then(r=>{ if(r.success&&r.data.length) setDbTypes(dedupeByName(r.data)); }).catch(()=>{});
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
    if (!await window.confirmAsync("Delete this request?")) return;
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
        api.post("/approvals/submit", {
          module: "Design Approval",
          ref_id: res.data.id,
          ref_no: res.data.drawing_no || "",
          title: res.data.title || uForm.title || "Drawing",
          amount: 0,
          project_id: projectId || res.data.project_id,
          project_name: projectName || res.data.project_name || "",
        }).catch(e => console.error("Approval submit:", e));
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
      } else { setActionErr(res.message || "Failed to update status"); }
    } catch(e) {
      const msg = String(e?.message || "");
      if (/ECONNRESET|Failed to fetch|NetworkError|timeout/i.test(msg)) {
        setActionErr("Connection issue — please try again");
      } else {
        setActionErr(msg || "Something went wrong");
      }
    }
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
              <SearchSelect value={uForm.category} options={CATS}
                onChange={v=>setUForm(p=>({...p,category:v}))} placeholder="Select category..."/>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Type</label>
              <SearchSelect value={uForm.drawing_type} options={TYPES}
                onChange={v=>setUForm(p=>({...p,drawing_type:v}))} placeholder="Select type..."/>
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
            {vLoading&&<div style={{textAlign:"center",padding:"30px",color:T.t4}}><div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>Loading...</div>}
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
    const isApproved = d.status === "Approved";
    return(
      <div style={{margin:"6px 0 8px",padding:"11px 14px",background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,borderLeft:`3px solid ${isApproved?T.grn:T.blu}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.title}</div>
            <div style={{fontSize:11,color:T.t4,marginTop:1}}>{d.category} · {d.current_version} · {d.uploaded_by_name||"—"} · {fmtDate(d.updated_at)}</div>
          </div>
          <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
            {d.file_url&&<a href={d.file_url} target="_blank" rel="noreferrer"
              style={{padding:"5px 10px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,color:T.blu,fontSize:11,fontWeight:600,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:5,transition:"all .12s",fontFamily:"inherit"}}
              onMouseEnter={el=>{el.currentTarget.style.background=T.bluL;el.currentTarget.style.borderColor=T.bluM;}}
              onMouseLeave={el=>{el.currentTarget.style.background=T.surface;el.currentTarget.style.borderColor=T.b1;}}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View
            </a>}
            {d.file_url&&<a href={d.file_url} download target="_blank" rel="noreferrer"
              style={{padding:"5px 10px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,color:T.t2,fontSize:11,fontWeight:600,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:5,transition:"all .12s",fontFamily:"inherit"}}
              onMouseEnter={el=>{el.currentTarget.style.background=T.bluL;el.currentTarget.style.borderColor=T.bluM;el.currentTarget.style.color=T.blu;}}
              onMouseLeave={el=>{el.currentTarget.style.background=T.surface;el.currentTarget.style.borderColor=T.b1;el.currentTarget.style.color=T.t2;}}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Download
            </a>}
            <button onClick={()=>setShowVer(d)}
              style={{padding:"5px 10px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,color:T.t2,fontSize:11,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,transition:"all .12s",fontFamily:"inherit"}}
              onMouseEnter={el=>{el.currentTarget.style.background=T.bluL;el.currentTarget.style.borderColor=T.bluM;el.currentTarget.style.color=T.blu;}}
              onMouseLeave={el=>{el.currentTarget.style.background=T.surface;el.currentTarget.style.borderColor=T.b1;el.currentTarget.style.color=T.t2;}}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              History
            </button>
            <button onClick={()=>setSel(null)} title="Close"
              style={{width:26,height:26,borderRadius:6,border:"none",background:"transparent",color:T.t4,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",transition:"background .12s",marginLeft:2}}
              onMouseEnter={el=>{el.currentTarget.style.background=T.b1;el.currentTarget.style.color=T.t2;}}
              onMouseLeave={el=>{el.currentTarget.style.background="transparent";el.currentTarget.style.color=T.t4;}}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {actionErr&&<div style={{padding:"7px 11px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:6,fontSize:11.5,color:T.red,marginBottom:8,display:"flex",alignItems:"center",gap:7}}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{flex:1}}>{actionErr}</span>
          <button onClick={()=>setActionErr("")} style={{background:"none",border:"none",cursor:"pointer",color:T.red,padding:0,display:"flex",opacity:.7}} title="Dismiss">
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>}

        {d.status!=="Approved"&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {/* Approve */}
            <button onClick={()=>handleStatus(d.id,"Approved",null)} disabled={!!acting[d.id]}
              style={{padding:"6px 14px",borderRadius:6,background:T.grn,border:"none",color:"white",fontSize:11.5,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit",boxShadow:`0 2px 5px ${T.grn}33`,transition:"all .12s",opacity:acting[d.id]?.6:1}}
              onMouseEnter={el=>{if(!acting[d.id])el.currentTarget.style.background="#047857";}}
              onMouseLeave={el=>{el.currentTarget.style.background=T.grn;}}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Approve
            </button>
            {/* Request Revision */}
            <button onClick={()=>{setShowRevForm(!showRevForm);setShowRejForm(false);}}
              style={{padding:"6px 14px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,color:T.amb,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all .12s"}}
              onMouseEnter={el=>{el.currentTarget.style.background=T.ambL;el.currentTarget.style.borderColor=T.ambM;}}
              onMouseLeave={el=>{el.currentTarget.style.background=T.surface;el.currentTarget.style.borderColor=T.b1;}}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
              Request Revision
            </button>
            {/* Reject */}
            <button onClick={()=>{setShowRejForm(!showRejForm);setShowRevForm(false);}}
              style={{padding:"6px 14px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,color:T.red,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all .12s"}}
              onMouseEnter={el=>{el.currentTarget.style.background=T.redL;el.currentTarget.style.borderColor=T.redM;}}
              onMouseLeave={el=>{el.currentTarget.style.background=T.surface;el.currentTarget.style.borderColor=T.b1;}}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              Reject
            </button>
          </div>
        )}

        {d.status==="Approved"&&(
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:14,border:`1px solid ${T.grnM}`,background:T.grnL,color:T.grn,fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Approved
            </span>
            <button onClick={()=>handleStatus(d.id,"Pending","Reopened for revision")}
              style={{padding:"4px 11px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,color:T.amb,fontSize:11,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all .12s"}}
              onMouseEnter={el=>{el.currentTarget.style.background=T.ambL;el.currentTarget.style.borderColor=T.ambM;}}
              onMouseLeave={el=>{el.currentTarget.style.background=T.surface;el.currentTarget.style.borderColor=T.b1;}}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
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

      {/* Main tab switcher — segmented pill */}
      <div style={{display:"inline-flex",padding:3,background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:10,marginBottom:14,gap:0}}>
        {[
          {id:"drawings", label:"Drawings", count:drawings.length},
          {id:"requests", label:"Design Requests", count:requests.filter(r=>r.status==="Pending").length},
        ].map(t=>{
          const active = mainTab===t.id;
          return(
            <button key={t.id} onClick={()=>setMainTab(t.id)}
              style={{padding:"6px 16px",border:"none",borderRadius:7,
                background:active?T.surface:"transparent",
                color:active?T.t1:T.t3,
                fontSize:12.5,fontWeight:active?700:500,fontFamily:"inherit",
                cursor:"pointer",display:"flex",alignItems:"center",gap:7,
                boxShadow:active?"0 1px 3px rgba(0,0,0,.08)":"none",
                transition:"all .12s"}}>
              {t.label}
              {t.count>0&&<span style={{background:active?T.blu:T.b1,color:active?"white":T.t3,fontSize:9.5,fontWeight:700,padding:"1px 6px",borderRadius:10,fontVariantNumeric:"tabular-nums"}}>{t.count}</span>}
            </button>
          );
        })}
      </div>

      {/* ── DRAWINGS TAB ── */}
      {mainTab==="drawings"&&<>
      {/* Header toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:5,flex:1,flexWrap:"wrap"}}>
          {["All",...CATS].map(c=>{
            const active = filter===c;
            const count = c!=="All" ? (catCounts[c]||0) : drawings.length;
            return(
              <button key={c} onClick={()=>setFilter(c)}
                style={{padding:"4px 11px",borderRadius:14,border:`1px solid ${active?T.blu:T.b1}`,
                  background:active?T.bluL:T.surface,color:active?T.blu:T.t3,
                  fontSize:11,fontWeight:active?700:500,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:5,transition:"all .12s"}}
                onMouseEnter={el=>{if(!active){el.currentTarget.style.borderColor=T.b2;el.currentTarget.style.background=T.surfaceB;}}}
                onMouseLeave={el=>{if(!active){el.currentTarget.style.borderColor=T.b1;el.currentTarget.style.background=T.surface;}}}>
                {c}
                {count>0&&<span style={{fontSize:9.5,fontWeight:700,padding:"1px 5px",borderRadius:8,background:active?T.blu:T.b1,color:active?"white":T.t3,fontVariantNumeric:"tabular-nums"}}>{count}</span>}
              </button>
            );
          })}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {/* Search + filters */}
          <div style={{position:"relative"}}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={2} strokeLinecap="round" style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
            <input value={searchDraw} onChange={e=>setSearchDraw(e.target.value)}
              placeholder="Search drawings..."
              style={{padding:"6px 9px 6px 28px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",width:160,color:T.t1,background:T.surface,boxSizing:"border-box",transition:"border-color .12s"}}
              onFocus={el=>el.target.style.borderColor=T.b2}
              onBlur={el=>el.target.style.borderColor=T.b1}/>
          </div>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{padding:"6px 9px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",cursor:"pointer",background:T.surface,color:T.t2}}>
            {["All Status","Pending","Approved","Revision","Rejected"].map(s=><option key={s} value={s==="All Status"?"All":s}>{s}</option>)}
          </select>
          {revQueue.length>0&&(
            <button onClick={()=>setShowRevQ(true)}
              style={{padding:"6px 11px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,
                color:T.amb,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
              Revision Queue
              <span style={{background:T.amb,color:"white",fontSize:9.5,fontWeight:700,padding:"1px 6px",borderRadius:10,fontVariantNumeric:"tabular-nums"}}>{revQueue.length}</span>
            </button>
          )}
          <button onClick={()=>setShowUpload(true)}
            style={{padding:"7px 14px",borderRadius:6,background:T.blu,border:"none",color:"white",
              fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit",boxShadow:`0 2px 6px ${T.blu}33`,transition:"all .12s"}}
            onMouseEnter={el=>el.currentTarget.style.background="#1D4ED8"}
            onMouseLeave={el=>el.currentTarget.style.background=T.blu}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            Upload Drawing
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>Loading drawings...</div>}

      {/* Empty state */}
      {!loading&&drawings.length===0&&(
        <div style={{textAlign:"center",padding:"70px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
          <div style={{width:64,height:64,borderRadius:"50%",border:`1.5px dashed ${T.b2}`,display:"flex",alignItems:"center",justifyContent:"center",color:T.t4}}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:T.t1}}>No drawings yet</div>
          <div style={{fontSize:12,color:T.t3,maxWidth:300,lineHeight:1.5}}>Click <b>Upload Drawing</b> to add the first drawing for this project.</div>
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
      {mainTab==="requests"&&(()=>{
        return(
        <div>
          {/* Single-line toolbar — count + filters + new request */}
          <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:11.5,color:T.t3,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>
              <b style={{color:T.t1,fontVariantNumeric:"tabular-nums"}}>{requests.length}</b> total
            </span>
            <div style={{position:"relative",flex:1,minWidth:200}}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={2} strokeLinecap="round" style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
              <input value={searchReq} onChange={e=>setSearchReq(e.target.value)}
                placeholder="Search requests..."
                style={{width:"100%",padding:"6px 9px 6px 28px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",color:T.t1,background:T.surface,transition:"border-color .12s"}}
                onFocus={el=>el.target.style.borderColor=T.b2}
                onBlur={el=>el.target.style.borderColor=T.b1}/>
            </div>
            <select value={filterReqStatus} onChange={e=>setFilterReqStatus(e.target.value)}
              style={{padding:"6px 9px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",cursor:"pointer",background:T.surface,color:T.t2,flexShrink:0}}>
              {["All Status","Pending","In Progress","Uploaded","Rejected"].map(s=><option key={s} value={s==="All Status"?"All":s}>{s}</option>)}
            </select>
            <select value={filterReqCat} onChange={e=>setFilterReqCat(e.target.value)}
              style={{padding:"6px 9px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",cursor:"pointer",background:T.surface,color:T.t2,flexShrink:0}}>
              <option value="All">All Categories</option>
              {CATS.map(c=><option key={c}>{c}</option>)}
            </select>
            {isAdmin&&<button onClick={()=>{setEditReq(null);setReqForm({title:"",category:"Architectural",description:"",priority:"Normal",due_date:""});setShowReqForm(true);}}
              style={{padding:"7px 14px",borderRadius:6,background:T.blu,border:"none",color:"white",fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",boxShadow:`0 2px 6px ${T.blu}33`,flexShrink:0,transition:"background .12s"}}
              onMouseEnter={el=>el.currentTarget.style.background="#1D4ED8"}
              onMouseLeave={el=>el.currentTarget.style.background=T.blu}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              New Request
            </button>}
          </div>

          {/* Empty state */}
          {requests.length===0&&(
            <div style={{textAlign:"center",padding:"70px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
              <div style={{width:64,height:64,borderRadius:"50%",border:`1.5px dashed ${T.b2}`,display:"flex",alignItems:"center",justifyContent:"center",color:T.t4}}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><path d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              </div>
              <div style={{fontSize:14,fontWeight:700,color:T.t1}}>No design requests yet</div>
              <div style={{fontSize:12,color:T.t3,maxWidth:300,lineHeight:1.5}}>Click <b>+ New Request</b> to ask for a drawing from the design team.</div>
            </div>
          )}

          {requests.filter(req=>{
            if(hideUploadedReq && (req.status==="Uploaded"||req.status==="Rejected")) return false;
            if(filterReqStatus!=="All" && req.status!==filterReqStatus) return false;
            if(filterReqCat!=="All" && req.category!==filterReqCat) return false;
            if(searchReq && !req.title.toLowerCase().includes(searchReq.toLowerCase()) && !(req.description||"").toLowerCase().includes(searchReq.toLowerCase())) return false;
            return true;
          }).map(req=>{
            const prioMeta = {
              "Urgent": {c:T.red,   bg:T.redL, brd:T.redM},
              "High":   {c:T.amb,   bg:T.ambL, brd:T.ambM},
              "Normal": {c:T.blu,   bg:T.bluL, brd:T.bluM},
              "Low":    {c:T.t4,    bg:T.surfaceB, brd:T.b1},
            };
            const statusMeta2 = {
              "Pending":     {c:T.amb, bg:T.ambL, brd:T.ambM},
              "In Progress": {c:T.blu, bg:T.bluL, brd:T.bluM},
              "Uploaded":    {c:T.grn, bg:T.grnL, brd:T.grnM},
              "Rejected":    {c:T.red, bg:T.redL, brd:T.redM},
            };
            const pm = prioMeta[req.priority]    || prioMeta["Normal"];
            const sm = statusMeta2[req.status]   || statusMeta2["Pending"];
            const isExpanded = expandedReqId === req.id;
            return(
              <div key={req.id} style={{background:T.surface,borderRadius:9,border:`1px solid ${isExpanded?T.b2:T.b1}`,marginBottom:7,borderLeft:`3px solid ${pm.c}`,overflow:"hidden",transition:"border-color .12s"}}>
                {/* Compact row — single line summary */}
                <div onClick={()=>setExpandedReqId(isExpanded?null:req.id)}
                  style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:isExpanded?T.surfaceB:"transparent",transition:"background .12s"}}
                  onMouseEnter={el=>{if(!isExpanded)el.currentTarget.style.background=T.surfaceB;}}
                  onMouseLeave={el=>{if(!isExpanded)el.currentTarget.style.background="transparent";}}>
                  {/* Requester avatar */}
                  <Avatar name={req.requested_by||"?"} size={26} title={`Requested by ${req.requested_by||"unknown"}`}/>
                  {/* Title + meta */}
                  <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:2}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{req.title}</div>
                    <div style={{fontSize:10.5,color:T.t4,display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      <span>{req.category}</span>
                      {req.due_date&&<><span>·</span><span>Due {fmtDate(req.due_date)}</span></>}
                      {req.assigned_to&&<><span>·</span><span style={{display:"inline-flex",alignItems:"center",gap:4}}><Avatar name={req.assigned_to} size={14}/>{req.assigned_to}</span></>}
                    </div>
                  </div>
                  {/* Status pills */}
                  <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    <span style={{fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:14,background:pm.bg,color:pm.c,border:`1px solid ${pm.brd}`,letterSpacing:".3px",textTransform:"uppercase"}}>{req.priority}</span>
                    <span style={{fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:14,background:sm.bg,color:sm.c,border:`1px solid ${sm.brd}`,letterSpacing:".3px",textTransform:"uppercase"}}>{req.status}</span>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{transform:isExpanded?"rotate(180deg)":"none",transition:"transform .15s"}}><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>

                {/* Expanded details — compact */}
                {isExpanded && (
                  <div style={{padding:"10px 14px 12px",background:T.surfaceB,borderTop:`1px solid ${T.b1}`,display:"flex",flexDirection:"column",gap:9}}>
                    {req.description && (
                      <div style={{maxWidth:560,padding:"7px 10px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,fontSize:11.5,color:T.t2,lineHeight:1.45}}>{req.description}</div>
                    )}
                    {/* Compact credits — only Requested by + Uploaded by */}
                    <div style={{display:"flex",alignItems:"center",gap:18,flexWrap:"wrap"}}>
                      <Credit label="Requested by" name={req.requested_by} time={req.created_at}/>
                      {req.status==="Uploaded" && <Credit label="Uploaded by" name={req.updated_by||req.assigned_to} time={req.updated_at}/>}
                    </div>
                    {/* Action buttons */}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {req.status==="Pending"&&<>
                        <button onClick={(e)=>{e.stopPropagation();setEditReq(req);setReqForm({title:req.title,category:req.category,description:req.description||"",priority:req.priority,due_date:req.due_date||"",assigned_to:req.assigned_to||""});setShowReqForm(true);}}
                          style={{padding:"5px 11px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
                          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
                          Assign
                        </button>
                        <button onClick={(e)=>{
                          e.stopPropagation();
                          setUForm({title:req.title+" Drawing",category:req.category,drawing_type:"2D",note:req.description||""});
                          setPendingReqId(req.id);
                          setMainTab("drawings"); setShowUpload(true);
                          handleUpdateReqStatus(req.id,"In Progress");
                        }}
                          style={{padding:"5px 11px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all .12s"}}
                          onMouseEnter={el=>{el.currentTarget.style.background=T.bluL; el.currentTarget.style.borderColor=T.bluM;}}
                          onMouseLeave={el=>{el.currentTarget.style.background=T.surface; el.currentTarget.style.borderColor=T.b1;}}>
                          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                          Upload Direct
                        </button>
                      </>}
                      {req.status==="In Progress"&&(
                        <button onClick={(e)=>{
                          e.stopPropagation();
                          setUForm({title:req.title+" Drawing",category:req.category,drawing_type:"2D",note:req.description||""});
                          setPendingReqId(req.id);
                          setMainTab("drawings"); setShowUpload(true);
                        }}
                          style={{padding:"5px 11px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all .12s"}}
                          onMouseEnter={el=>{el.currentTarget.style.background=T.bluL; el.currentTarget.style.borderColor=T.bluM;}}
                          onMouseLeave={el=>{el.currentTarget.style.background=T.surface; el.currentTarget.style.borderColor=T.b1;}}>
                          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                          Upload Drawing
                        </button>
                      )}
                      {isAdmin&&<button onClick={(e)=>{e.stopPropagation();setEditReq(req);setReqForm({title:req.title,category:req.category,description:req.description||"",priority:req.priority,due_date:req.due_date||"",assigned_to:req.assigned_to||""});setShowReqForm(true);}}
                        style={{padding:"5px 11px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,color:T.t3,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                        Edit
                      </button>}
                      {isAdmin&&<button onClick={(e)=>{e.stopPropagation();handleDeleteReq(req.id);}}
                        style={{padding:"5px 11px",borderRadius:6,background:T.surface,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                        Delete
                      </button>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        );
      })()}
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
function TabTodo({projectId}) {
  const CATS=["Civil","Electrical","Plumbing","Finishing","Documentation","Admin","Other"];
  const PRIS=["High","Medium","Low"];
  const priS={"High":{c:T.red,bg:T.redL,brd:T.redM},"Medium":{c:T.amb,bg:T.ambL,brd:T.ambM},"Low":{c:T.slt,bg:T.sltL,brd:T.b2}};
  const catC={"Civil":T.blu,"Electrical":T.amb,"Plumbing":"#0891B2","Finishing":T.pur,"Documentation":T.slt,"Admin":T.grn,"Other":T.slt};

  const [todos,setTodos]=useState([]);
  const [team,setTeam]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [expandId,setExpandId]=useState(null);
  const [fCat,setFCat]=useState("All");
  const [fPri,setFPri]=useState("All");
  const [newForm,setNewForm]=useState({text:"",priority:"Medium",assigneeId:"",due:"",cat:"Civil",checklist:[]});
  const [newCheckText,setNewCheckText]=useState("");

  // Parse a task row from API into local todo shape
  const parseTask=(t)=>{
    let cl=[];
    try{ cl=typeof t.checklist==="string"?JSON.parse(t.checklist):(t.checklist||[]); }catch(e){ cl=[]; }
    return {
      id:t.id,
      text:t.title||t.name||"",
      priority:t.priority||"Medium",
      assignee:t.assigned_name||"Unassigned",
      assigneeId:t.assigned_to||null,
      due:t.due_date||"",
      cat:t.category||"Other",
      done:t.status==="done"||t.status==="Completed",
      checklist:cl
    };
  };

  // Fetch todos + team on mount
  useEffect(()=>{
    if(!projectId) return;
    const load=async()=>{
      setLoading(true);
      try{
        const [taskRes,teamRes]=await Promise.all([
          api.get(`/projects/${projectId}/tasks`),
          api.get("/projects/team-members")
        ]);
        if(taskRes.success) setTodos((taskRes.data||[]).map(parseTask));
        if(teamRes.success) setTeam(teamRes.data||[]);
      }catch(e){ console.error("Todo load error:",e); }
      setLoading(false);
    };
    load();
  },[projectId]);

  // Toggle done/undone
  const toggle=async(id)=>{
    const todo=todos.find(t=>t.id===id);
    if(!todo) return;
    const newStatus=todo.done?"todo":"done";
    setTodos(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t));
    try{
      await api.put(`/projects/${projectId}/tasks/${id}`,{status:newStatus});
    }catch(e){
      setTodos(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t)); // revert
    }
  };

  // Toggle checklist item
  const toggleCheck=async(todoId,ci)=>{
    const todo=todos.find(t=>t.id===todoId);
    if(!todo) return;
    const updated=todo.checklist.map((c,i)=>i===ci?{...c,done:!c.done}:c);
    setTodos(p=>p.map(t=>t.id===todoId?{...t,checklist:updated}:t));
    try{
      await api.put(`/projects/${projectId}/tasks/${todoId}`,{checklist:updated});
    }catch(e){
      setTodos(p=>p.map(t=>t.id===todoId?{...t,checklist:todo.checklist}:t));
    }
  };

  // Add new todo
  const addTodo=async()=>{
    if(!newForm.text.trim()||saving) return;
    setSaving(true);
    try{
      const res=await api.post(`/projects/${projectId}/tasks`,{
        title:newForm.text,
        priority:newForm.priority,
        assigned_to:newForm.assigneeId||null,
        due_date:newForm.due||null,
        category:newForm.cat,
        checklist:newForm.checklist.length>0?newForm.checklist:null
      });
      if(res.success&&res.data){
        setTodos(p=>[parseTask(res.data),...p]);
        setNewForm({text:"",priority:"Medium",assigneeId:team[0]?.id||"",due:"",cat:"Civil",checklist:[]});
        setShowAdd(false);
      }
    }catch(e){ console.error("Add todo error:",e); }
    setSaving(false);
  };

  const addCheck=()=>{
    if(!newCheckText.trim()) return;
    setNewForm(p=>({...p,checklist:[...p.checklist,{t:newCheckText,done:false}]}));
    setNewCheckText("");
  };

  // Delete todo
  const deleteTodo=async(id)=>{
    setTodos(p=>p.filter(t=>t.id!==id));
    try{ await api.del(`/projects/${projectId}/tasks/${id}`); }catch(e){}
  };

  const display=todos.filter(t=>(fCat==="All"||t.cat===fCat)&&(fPri==="All"||t.priority===fPri));
  const pending=display.filter(t=>!t.done), done=display.filter(t=>t.done);

  if(loading) return(
    <div style={{padding:"40px",textAlign:"center",color:T.t4,fontSize:13}}>
      <div style={{width:22,height:22,border:"2.5px solid "+T.b1,borderTopColor:T.blu,borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto 10px"}}/>
      Loading todos...
    </div>
  );

  return(
    <div style={{padding:"14px 18px",maxWidth:720}}>
      {/* Header row */}
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flex:1}}>
          {[{l:"Pending",v:todos.filter(t=>!t.done).length,c:T.amb},{l:"Done",v:todos.filter(t=>t.done).length,c:T.grn},{l:"Total",v:todos.length,c:T.slt}].map(x=>(
            <div key={x.l} style={{display:"flex",alignItems:"center",gap:5,background:T.surface,border:`1px solid ${T.b1}`,borderRadius:20,padding:"4px 11px"}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:x.c}}/>
              <span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{x.v}</span>
              <span style={{fontSize:11,color:T.t4}}>{x.l}</span>
            </div>
          ))}
        </div>
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
              {l:"Category",key:"cat",opts:CATS.map(c=>({key:c,label:c})),type:"search"},
              {l:"Priority",key:"priority",opts:PRIS.map(p=>({key:p,label:p})),type:"search"},
              {l:"Assigned To",key:"assigneeId",opts:team.map(m=>({key:String(m.id),label:m.name})),type:"search"},
              {l:"Due Date",key:"due",type:"date"},
            ].map(f=>(
              <div key={f.key}>
                <div style={{fontSize:9.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:4}}>{f.l}</div>
                {f.type==="date"
                  ?<input type="date" value={newForm[f.key]} onChange={e=>setNewForm(p=>({...p,[f.key]:e.target.value}))}
                      style={{width:"100%",height:30,padding:"0 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface}}/>
                  :<SearchSelect value={newForm[f.key]} options={f.opts} compact
                      onChange={v=>setNewForm(p=>({...p,[f.key]:v}))} placeholder="Select..."/>
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
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"7px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
            <button onClick={addTodo} disabled={saving} style={{flex:2,padding:"7px",borderRadius:6,background:saving?"#93C5FD":T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:saving?"wait":"pointer"}}>{saving?"Saving...":"Add Todo"}</button>
          </div>
        </div>
      )}

      {/* Pending todos */}
      <Panel style={{marginBottom:8}}>
        {pending.length===0&&<div style={{padding:"24px",textAlign:"center",color:T.t4,fontSize:13}}>{todos.length===0?"No todos yet — add your first one!":"No pending items"+(fCat!=="All"||fPri!=="All"?" matching filters":"")}</div>}
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
                <div onClick={()=>toggle(todo.id)} style={{width:17,height:17,borderRadius:5,border:`1.5px solid ${T.b2}`,cursor:"pointer",flexShrink:0,marginTop:2,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=T.grn}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=T.b2}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:T.t1,fontWeight:500,marginBottom:4,lineHeight:1.4}}>{todo.text}</div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
                    <Pill label={todo.cat} c={cc} bg={cc+"18"}/>
                    <Pill label={todo.priority} c={ps.c} bg={ps.bg}/>
                    <span style={{fontSize:11,color:T.t4}}>@{(todo.assignee||"").split(" ")[0]||"--"}</span>
                    {todo.due&&<span style={{fontSize:11,color:T.t4}}>Due {new Date(todo.due).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>}
                    {todo.checklist.length>0&&(
                      <span style={{fontSize:10.5,color:checkDone===todo.checklist.length?T.grn:T.t4,fontWeight:600}}>
                        ☑ {checkDone}/{todo.checklist.length}
                      </span>
                    )}
                  </div>
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
                <div style={{display:"flex",gap:2,flexShrink:0,marginTop:1}}>
                  <button onClick={()=>deleteTodo(todo.id)} title="Delete"
                    style={{background:"none",border:"none",cursor:"pointer",color:T.t4,padding:3,opacity:.5,transition:"opacity .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.opacity=1}
                    onMouseLeave={e=>e.currentTarget.style.opacity=.5}>
                    <svg width={13} height={13} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 4h8M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M6 7v3M8 7v3M4 4l.5 7a1 1 0 001 1h3a1 1 0 001-1L10 4"/></svg>
                  </button>
                  <button onClick={()=>setExpandId(isExp?null:todo.id)}
                    style={{background:"none",border:"none",cursor:"pointer",color:T.t4,padding:3}}>
                    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d={isExp?"M2 5l5 5 5-5":"M2 9l5-5 5 5"}/>
                    </svg>
                  </button>
                </div>
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
                <span style={{fontSize:10.5,color:T.t4}}>@{(todo.assignee||"").split(" ")[0]||"--"}</span>
                {todo.checklist.length>0&&<span style={{fontSize:10,color:T.grn}}>✓ {todo.checklist.length}/{todo.checklist.length}</span>}
                <button onClick={()=>deleteTodo(todo.id)} title="Delete"
                  style={{background:"none",border:"none",cursor:"pointer",color:T.t4,padding:3,opacity:.4,flexShrink:0}}
                  onMouseEnter={e=>e.currentTarget.style.opacity=1}
                  onMouseLeave={e=>e.currentTarget.style.opacity=.4}>
                  <svg width={12} height={12} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 4h8M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M6 7v3M8 7v3M4 4l.5 7a1 1 0 001 1h3a1 1 0 001-1L10 4"/></svg>
                </button>
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
const PROJECT_TASKS=[];

function ptFlatten(tasks,out=[]){tasks.forEach(t=>{out.push(t);if(t.children?.length)ptFlatten(t.children,out)});return out;}
function fmtDate(d){
  if(!d) return "—";
  const s=String(d).slice(0,10);
  if(!s||s==="—") return "—";
  const [y,m,dd]=s.split("-");
  return dd+"/"+m+"/"+y;
}
function ptDelayDays(t){if(t.status==="Completed"||!t.baseEnd) return 0;const d=Math.round((new Date()-new Date(t.baseEnd))/(1000*86400));return d>0?d:0;}

function TabTasks({ projectId, isAdmin }) {
  const [tasks,setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);

  // ── BASELINE STATE ─────────────────────────────────────────────
  const [baselineStatus, setBaselineStatus] = useState(null); // {is_set, current, task_total, ...}
  const [showBaseline, setShowBaseline] = useState(()=>{
    try { return localStorage.getItem("gb_show_baseline_cols")==="1"; } catch(e) { return false; }
  });
  const [showRebaseModal, setShowRebaseModal] = useState(false);
  const [showBaselineHistory, setShowBaselineHistory] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const toggleShowBaseline = () => {
    setShowBaseline(v => { const n=!v; try { localStorage.setItem("gb_show_baseline_cols", n?"1":"0"); } catch(e){} return n; });
  };

  const loadBaselineStatus = async () => {
    if (!projectId) return;
    try {
      const r = await api.baseline.status(projectId);
      if (r.success) setBaselineStatus(r.data);
    } catch(e) { /* ignore — probably backend not deployed yet */ }
  };
  useEffect(()=>{ loadBaselineStatus(); /* eslint-disable-next-line */ }, [projectId]);

  // ── COLUMN RESIZE (Option A: drag-handle, per-user localStorage) ──
  const BASE_COL_KEYS     = ["toggle","no","name","status","progress","start","end","days","assigned"];
  const BASELINE_COL_KEYS = ["blStart","blEnd","slip"];
  const COL_KEYS     = showBaseline ? [...BASE_COL_KEYS, ...BASELINE_COL_KEYS] : BASE_COL_KEYS;
  const COL_LABELS   = {toggle:"", no:"No / TSK", name:"Task Name", status:"Status", progress:"Progress", start:"Start", end:"End", days:"Days", assigned:"Assigned", blStart:"BL Start", blEnd:"BL End", slip:"Slip"};
  const COL_DEFAULTS = {toggle:26, no:52, name:320, status:85, progress:100, start:82, end:82, days:44, assigned:80, blStart:82, blEnd:82, slip:64};
  const COL_RESIZABLE= {toggle:false, no:false, name:true, status:true, progress:true, start:true, end:true, days:false, assigned:true, blStart:true, blEnd:true, slip:false};
  const COL_MIN = 60, COL_MAX = 600, COL_STORE = "gb_task_col_widths_v1";

  const [colWidths, setColWidths] = useState(()=>{
    try { const s=localStorage.getItem(COL_STORE); if(s) return {...COL_DEFAULTS, ...JSON.parse(s)}; } catch(e){}
    return {...COL_DEFAULTS};
  });
  const GRID_TEMPLATE = COL_KEYS.map(k => (colWidths[k]||COL_DEFAULTS[k]) + "px").join(" ");
  const isCustomWidths = COL_KEYS.some(k => colWidths[k] !== COL_DEFAULTS[k]);

  const persistWidths = (w) => { try { localStorage.setItem(COL_STORE, JSON.stringify(w)); } catch(e){} };
  const resetColWidths = () => { setColWidths({...COL_DEFAULTS}); persistWidths({...COL_DEFAULTS}); };

  const startResize = (colKey) => (e) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[colKey] || COL_DEFAULTS[colKey];
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    let latest = startW;
    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      latest = Math.max(COL_MIN, Math.min(COL_MAX, startW + delta));
      setColWidths(prev => ({...prev, [colKey]: latest}));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setColWidths(prev => { const next = {...prev, [colKey]: latest}; persistWidths(next); return next; });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    api.get("/tasks?project_id=" + projectId).then(r => {
      if (r.success) {
        // Build tree from flat list — exclude todo rows (task_no starts with TODO-)
        const flat = (r.data || []).filter(t => !String(t.task_no || "").startsWith("TODO-"));
        const map = {};
        flat.forEach((t, idx) => {
          t.children = [];
          t.no = t.task_no;
          t.tsk_no = "TSK" + String(t.id).padStart(6, "0");
          t.baseStart = t.base_start;
          t.baseEnd = t.base_end;
          t.actualStart = t.actual_start;
          t.actualEnd = t.actual_end;
          t.originalStart         = t.original_start;
          t.originalEnd           = t.original_end;
          t.currentBaselineStart  = t.current_baseline_start;
          t.currentBaselineEnd    = t.current_baseline_end;
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
    {name:"My Delayed",     f:{fCat:"All",fStatus:"All",fAssignee:"",fDelayed:true,fAsSchedule:""}},
    {name:"Today Schedule", f:{fCat:"All",fStatus:"All",fAssignee:"All",fDelayed:false,fAsSchedule:new Date().toISOString().split("T")[0]}},
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
  const TEAM_PT = [...new Set(allFlat.map(t=>t.assignee).filter(Boolean))];

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
  const [showTaskIssues,setShowTaskIssues]=useState(false);
  const [taskIssues,setTaskIssues]=useState([]);
  const [taskIssuesLoading,setTaskIssuesLoading]=useState(false);
  const [taskIssueFilter,setTaskIssueFilter]=useState("Open");

  const loadTaskIssues=()=>{
    setTaskIssuesLoading(true);
    api.get("/tasks/all-issues?project_id="+projectId).then(r=>{
      if(r.success) setTaskIssues(r.data||[]);
      setTaskIssuesLoading(false);
    }).catch(()=>setTaskIssuesLoading(false));
  };
  useEffect(()=>{ if(projectId) loadTaskIssues(); },[projectId]);

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
      const fl = (r.data || []).filter(t => !String(t.task_no || "").startsWith("TODO-")); const map = {};
      fl.forEach((t,i) => { t.children=[]; t.no=t.task_no; t.tsk_no="TSK"+String(t.id).padStart(6,"0"); t.baseStart=t.base_start; t.baseEnd=t.base_end; t.actualStart=t.actual_start; t.actualEnd=t.actual_end; t.dhyanRakhen=t.dhyan_rakhen; t.lastUpdate=t.last_update; t.assignee=t.assignee_name||t.assigned_to||""; t.serial=i+1; map[t.id]=t; });
      const roots=[]; fl.forEach(t => { if(t.parent_id&&map[t.parent_id]) map[t.parent_id].children.push(t); else roots.push(t); });
      setTasks(roots);
    }
  };

  function updateInTree(list,id,upd){
    return list.map(t=>{
      if(t.id===id) return{...t,...upd,lastUpdate:new Date().toISOString().split("T")[0]};
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
    const GRID=GRID_TEMPLATE;
    const SEP={borderRight:"1px solid #F1F5F9"};

    return(
      <div key={t.id} onContextMenu={e=>{e.preventDefault();setContextMenu({x:e.clientX,y:e.clientY,task:t});}} style={{position:"relative"}}>
        <div style={{display:"grid",gridTemplateColumns:GRID,alignItems:"center",height:32,borderBottom:"1px solid #F1F5F9",background:depth===0?"#F8FAFC":"white",transition:"background .1s"}}
          onMouseEnter={e=>{
            e.currentTarget.style.background="#EFF6FF";
            const a=e.currentTarget.querySelector(".tsk-act");
            if(a) a.style.display="flex";
          }}
          onMouseLeave={e=>{
            e.currentTarget.style.background=depth===0?"#F8FAFC":"white";
            const a=e.currentTarget.querySelector(".tsk-act");
            if(a) a.style.display="none";
          }}>

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
            <span style={{fontSize:10.5,fontWeight:700,color:"#1E293B",lineHeight:1.3}}>{t.no}</span>
            <span style={{fontSize:8,color:"#94A3B8",fontFamily:"monospace",lineHeight:1.3}}>{t.tsk_no||""}</span>
          </div>

          {/* Task Name + hover buttons */}
          <div style={{display:"flex",alignItems:"center",paddingLeft:6+indent,paddingRight:4,overflow:"hidden",...SEP,height:"100%",position:"relative"}}>
            <div onClick={(e)=>{e.stopPropagation();handleOpen(t);}} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",flex:1,minWidth:0}}>
              {t.dhyanRakhen&&<svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2} style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>}
              <span style={{fontSize:depth===0?13:12.5,fontWeight:depth===0?600:depth===1?500:400,color:"#1E293B",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
              {t.tag&&<span style={{background:"#FEF3C7",color:"#92400E",fontSize:8,fontWeight:600,padding:"1px 5px",borderRadius:3,flexShrink:0,whiteSpace:"nowrap"}}>{t.tag}</span>}
              {delay>0&&<span style={{background:"#FEE2E2",color:"#DC2626",fontSize:8,fontWeight:600,padding:"1px 4px",borderRadius:3,flexShrink:0}}>+{delay}d</span>}
            </div>
            {/* Buttons on hover */}
            <div className="tsk-act" onClick={e=>e.stopPropagation()} style={{display:"none",alignItems:"center",gap:3,flexShrink:0,paddingLeft:5,background:"linear-gradient(to right,transparent,"+T.bluL+"dd 15%)"}}>
                <button onClick={()=>setInfoTask(infoTask?.id===t.id?null:t)} title="Info"
                  style={{width:22,height:22,borderRadius:4,background:infoTask?.id===t.id?"#FEF3C7":T.surface,border:"1px solid "+(infoTask?.id===t.id?"#FCD34D":T.b1),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={infoTask?.id===t.id?"#D97706":T.t3} strokeWidth={2}><circle cx={12} cy={12} r={10}/><path d="M12 16v-4M12 8h.01"/></svg>
                </button>
                {isAdmin&&depth<6&&<button onClick={()=>{setAddParent(t);setShowAdd(true);}} title="Add Subtask"
                  style={{width:22,height:22,borderRadius:4,background:T.surface,border:"1px solid "+T.b1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.grn} strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
                </button>}
                {isAdmin&&<button onClick={()=>setEditTask(t)} title="Edit"
                  style={{width:22,height:22,borderRadius:4,background:T.surface,border:"1px solid "+T.b1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.blu} strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>}
            </div>
          </div>

          {/* Status */}
          <div style={{padding:"0 6px",...SEP,display:"flex",alignItems:"center",height:"100%"}}>
            <span style={{background:ss.bg,color:ss.c,fontSize:9.5,fontWeight:600,padding:"2px 8px",borderRadius:4,whiteSpace:"nowrap",border:"1px solid "+ss.brd}}>{t.status}</span>
          </div>

          {/* Progress */}
          <div style={{padding:"0 8px",...SEP,display:"flex",flexDirection:"column",justifyContent:"center",height:"100%"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
              <div style={{flex:1,height:4,background:"#E2E8F0",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:t.progress+"%",background:t.progress===100?"#10B981":t.progress>0?"#3B82F6":"#E2E8F0",borderRadius:2,transition:"width .3s"}}/>
              </div>
              <span style={{fontSize:10,fontWeight:600,color:t.progress===100?"#10B981":t.progress>0?"#3B82F6":"#94A3B8",flexShrink:0,minWidth:24,textAlign:"right"}}>{t.progress}%</span>
            </div>
          </div>

          {/* Start — click opens date picker */}
          <div style={{padding:"0 6px",...SEP,display:"flex",alignItems:"center",height:"100%",cursor:"pointer",position:"relative"}}
            onClick={e=>{e.stopPropagation();e.currentTarget.querySelector("input").showPicker&&e.currentTarget.querySelector("input").showPicker();}}>
            <span style={{fontSize:10,color:T.t3,whiteSpace:"nowrap",pointerEvents:"none"}}>{fmtDate(t.baseStart)||"—"}</span>
            <input type="date" defaultValue={t.baseStart||""}
              style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%"}}
              onChange={async e=>{
                const v=e.target.value;
                await api.put("/tasks/"+t.id,{base_start:v});
                setTasks(updateInTree(tasks,t.id,{baseStart:v}));
              }}
              onClick={e=>e.stopPropagation()}/>
          </div>

          {/* End — click opens date picker */}
          <div style={{padding:"0 6px",...SEP,display:"flex",alignItems:"center",height:"100%",cursor:"pointer",position:"relative"}}
            onClick={e=>{e.stopPropagation();e.currentTarget.querySelector("input").showPicker&&e.currentTarget.querySelector("input").showPicker();}}>
            <span style={{fontSize:10,color:delay>0?T.red:T.t3,fontWeight:delay>0?700:400,whiteSpace:"nowrap",pointerEvents:"none"}}>{fmtDate(t.baseEnd)||"—"}</span>
            <input type="date" defaultValue={t.baseEnd||""}
              style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%"}}
              onChange={async e=>{
                const v=e.target.value;
                await api.put("/tasks/"+t.id,{base_end:v});
                setTasks(updateInTree(tasks,t.id,{baseEnd:v}));
              }}
              onClick={e=>e.stopPropagation()}/>
          </div>

          {/* Days */}
          <div style={{padding:"0 4px",...SEP,display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}>
            <span style={{fontSize:10,color:"#94A3B8",fontWeight:t.duration>0?500:400}}>{t.duration>0?t.duration+"d":"—"}</span>
          </div>

          {/* Assigned */}
          <div style={{padding:"0 6px",display:"flex",alignItems:"center",height:"100%",...(showBaseline?SEP:{})}}>
            <span style={{fontSize:10,color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(t.assignee||"").split(" ")[0]||"—"}</span>
          </div>

          {/* Baseline columns (toggleable) */}
          {showBaseline && (()=>{
            const blS = t.current_baseline_start || t.currentBaselineStart;
            const blE = t.current_baseline_end   || t.currentBaselineEnd;
            const slip = (blE && t.baseEnd) ? Math.round((new Date(t.baseEnd) - new Date(blE)) / 86400000) : null;
            return (
              <>
                <div style={{padding:"0 6px",...SEP,display:"flex",alignItems:"center",height:"100%"}}>
                  <span style={{fontSize:10,color:"#64748B",whiteSpace:"nowrap"}}>{fmtDate(blS)||"—"}</span>
                </div>
                <div style={{padding:"0 6px",...SEP,display:"flex",alignItems:"center",height:"100%"}}>
                  <span style={{fontSize:10,color:"#64748B",whiteSpace:"nowrap"}}>{fmtDate(blE)||"—"}</span>
                </div>
                <div style={{padding:"0 4px",display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}>
                  {slip===null ? <span style={{fontSize:10,color:"#CBD5E1"}}>—</span>
                    : <span style={{fontSize:10,fontWeight:700,color:slip>0?T.red:slip<0?T.grn:T.t3}}>{slip>0?`+${slip}d`:slip<0?`${slip}d`:"0"}</span>}
                </div>
              </>
            );
          })()}
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

  // ── Baseline metrics (computed from tasks flat) ─────────────
  const blMetrics = (()=>{
    if (!baselineStatus?.is_set) return null;
    let withBL=0, onTime=0, slipSum=0, origSum=0, origCnt=0;
    allFlat.forEach(t=>{
      if (t.currentBaselineEnd) {
        withBL++;
        if (t.baseEnd) {
          const diff = Math.round((new Date(t.baseEnd) - new Date(t.currentBaselineEnd))/86400000);
          slipSum += diff;
          if (diff <= 0) onTime++;
        }
      }
      if (t.originalEnd && t.baseEnd) {
        const d = Math.round((new Date(t.baseEnd) - new Date(t.originalEnd))/86400000);
        origSum += d;
        origCnt++;
      }
    });
    return {
      onTimePct: withBL>0 ? Math.round(onTime/withBL*100) : 0,
      avgSlip:   withBL>0 ? (slipSum/withBL).toFixed(1) : "0",
      origDelay: origCnt>0 ? Math.round(origSum/origCnt) : 0,
      version: baselineStatus.current?.version || 0,
    };
  })();

  return(
    <div style={{padding:"14px 18px",fontFamily:"'Segoe UI',sans-serif"}}>

      {/* Baseline Strip */}
      <BaselineStrip
        status={baselineStatus}
        showCols={showBaseline}
        onToggleCols={toggleShowBaseline}
        onSet={()=>setShowRebaseModal("set")}
        onRebaseline={()=>setShowRebaseModal("rebaseline")}
        onHistory={()=>setShowBaselineHistory(true)}
      />

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:blMetrics?"repeat(8,1fr)":"repeat(5,1fr)",gap:9,marginBottom:12}}>
        {[
          {l:"Total Tasks",v:allFlat.length,c:T.slt},
          {l:"Ongoing",v:ongoing,c:T.blu},
          {l:"Completed",v:completed,c:T.grn},
          {l:"Delayed",v:delayed,c:delayed>0?T.red:T.grn},
        ].map((s,i)=>(
          <div key={i} style={{padding:"9px 12px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:7,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:9,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{s.l}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
          </div>
        ))}
        {/* Open Issues — clickable card */}
        <div onClick={()=>{setShowTaskIssues(true);loadTaskIssues();}}
          style={{padding:"9px 12px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:7,borderTop:`3px solid ${T.red}`,cursor:"pointer",transition:"box-shadow .15s"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 3px 12px rgba(220,38,38,.15)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
          <div style={{fontSize:9,color:T.red,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>Open Issues</div>
          <div style={{fontSize:18,fontWeight:700,color:T.red}}>{taskIssues.filter(i=>i.status==="Open"||i.status==="In Progress").length||0}</div>
        </div>

        {/* Baseline metrics — only when baseline is set */}
        {blMetrics && <>
          <div style={{padding:"9px 12px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:7,borderTop:`3px solid #7C3AED`}}>
            <div style={{fontSize:9,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>On-Time % (v{blMetrics.version})</div>
            <div style={{fontSize:18,fontWeight:700,color:blMetrics.onTimePct>=80?T.grn:blMetrics.onTimePct>=50?T.amb:T.red}}>{blMetrics.onTimePct}%</div>
          </div>
          <div style={{padding:"9px 12px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:7,borderTop:`3px solid #7C3AED`}}>
            <div style={{fontSize:9,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>Avg Slip</div>
            <div style={{fontSize:18,fontWeight:700,color:parseFloat(blMetrics.avgSlip)>0?T.red:T.grn}}>{parseFloat(blMetrics.avgSlip)>0?"+":""}{blMetrics.avgSlip}d</div>
          </div>
          <div style={{padding:"9px 12px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:7,borderTop:`3px solid #EC4899`}}>
            <div style={{fontSize:9,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>Original Delay (v1)</div>
            <div style={{fontSize:18,fontWeight:700,color:blMetrics.origDelay>0?T.red:T.grn}}>{blMetrics.origDelay>0?"+":""}{blMetrics.origDelay}d</div>
          </div>
        </>}
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
          <button onClick={()=>setFAsSchedule(new Date().toISOString().split("T")[0])}
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
        {/* CSV Export */}
        <button onClick={()=>{
          const flat=ptFlatten(tasks);
          const headers=["Task No","Name","Category","Status","Assignee","Base Start","Base End","Actual Start","Actual End"];
          const rows=flat.map(t=>[t.task_no||t.no||"",t.name,t.category||"",t.status||"",t.assignee||"",t.baseStart||"",t.baseEnd||"",t.actualStart||"",t.actualEnd||""]);
          const csv=[headers,...rows].map(r=>r.map(c=>`"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
          const blob=new Blob([csv],{type:"text/csv"});
          const url=URL.createObjectURL(blob);
          const a=document.createElement("a");a.href=url;a.download="tasks_export.csv";a.click();
          URL.revokeObjectURL(url);
        }} title="Export to CSV"
          style={{height:32,padding:"0 12px",borderRadius:6,border:`1.5px solid ${T.b1}`,background:T.surface,fontSize:12,color:T.t2,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Export
        </button>
        {/* Excel Import */}
        {isAdmin&&<label title="Import from Excel/CSV"
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
              const flat=(r.data||[]).filter(t=>!String(t.task_no||"").startsWith("TODO-"));const map={};
              flat.forEach(t=>{t.children=[];t.no=t.task_no;t.baseStart=t.base_start;t.baseEnd=t.base_end;t.dhyanRakhen=t.dhyan_rakhen;t.assignee=t.assignee_name||"";map[t.id]=t;});
              const roots=[];flat.forEach(t=>{if(t.parent_id&&map[t.parent_id])map[t.parent_id].children.push(t);else roots.push(t);});
              setTasks(roots);
            }
            alert("Import complete!");
            e.target.value="";
          }}/>
        </label>}
        {isAdmin&&<button onClick={()=>setShowTemplatePicker(true)}
          style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:6,background:"linear-gradient(135deg,#EC4899,#BE185D)",color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
          📋 Load Template
        </button>}
        {isAdmin&&<button onClick={()=>{setAddParent(null);setShowAdd(true);}}
          style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg> Add Task
        </button>}
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
      {view==="list"&&!loading&&(
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",position:"relative"}}>
          {/* Reset widths (only when customised) */}
          {isCustomWidths && (
            <button onClick={resetColWidths} title="Reset column widths"
              style={{position:"absolute",top:4,right:4,zIndex:3,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.8)",fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:4,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.2)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}>
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M3 12a9 9 0 109-9M3 12l4-4M3 12l4 4"/></svg>
              Reset
            </button>
          )}
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:GRID_TEMPLATE,background:"#0D1B2A"}}>
            {COL_KEYS.map((k,i)=>(
              <div key={k} style={{padding:"7px 5px",borderRight:i<COL_KEYS.length-1?"1px solid rgba(255,255,255,0.08)":"none",position:"relative",overflow:"hidden"}}>
                <span style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:".4px",whiteSpace:"nowrap"}}>{COL_LABELS[k]}</span>
                {COL_RESIZABLE[k] && (
                  <div onMouseDown={startResize(k)} title="Drag to resize column"
                    style={{position:"absolute",right:-4,top:4,bottom:4,width:9,cursor:"col-resize",zIndex:5,transition:"background .1s",display:"flex",alignItems:"center",justifyContent:"center"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(59,130,246,0.7)";e.currentTarget.firstChild.style.background="white";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.firstChild.style.background="rgba(255,255,255,0.25)";}}>
                    <div style={{width:2,height:"60%",background:"rgba(255,255,255,0.25)",borderRadius:1,pointerEvents:"none",transition:"background .1s"}}/>
                  </div>
                )}
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

      {/* Skeleton loader */}
      {loading && (
        <div style={{background:"white",borderRadius:8,border:"1px solid "+T.b1,overflow:"hidden",marginTop:4}}>
          <div style={{display:"grid",gridTemplateColumns:GRID_TEMPLATE,background:"#0D1B2A",padding:"7px 4px"}}>
            {COL_KEYS.map(k=>(
              <div key={k} style={{padding:"0 5px"}}><span style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.4)",textTransform:"uppercase"}}>{COL_LABELS[k]}</span></div>
            ))}
          </div>
          <TaskSkeleton gridTemplate={GRID_TEMPLATE}/>
        </div>
      )}
      {!loading && tasks.length===0 && <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:14}}>
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={T.b2} strokeWidth={1.5} style={{margin:"0 auto 10px",display:"block"}}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        No tasks yet. Create your first task to start tracking work.
      </div>}

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
              {icon:"M12 5v14M5 12h14",label:"Add Subtask",action:()=>{setAddParent(contextMenu.task);setShowAdd(true);setContextMenu(null);},color:"#10B981",admin:true},
              {icon:"M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",label:"Edit Task",action:()=>{setEditTask(contextMenu.task);setContextMenu(null);},admin:true},
              {icon:"M20 6L9 17l-5-5",label:"Mark Complete",action:async()=>{await api.put("/tasks/"+contextMenu.task.id,{progress:100});setTasks(updateInTree(tasks,contextMenu.task.id,{progress:100,status:"Completed"}));setContextMenu(null);}},
              null,
              {icon:"M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",label:"Delete Task",action:async()=>{if(await window.confirmAsync("Delete this task?")){await api.del("/tasks/"+contextMenu.task.id);const removeFromTree=(list,id)=>list.filter(t=>t.id!==id).map(t=>({...t,children:removeFromTree(t.children||[],id)}));setTasks(removeFromTree(tasks,contextMenu.task.id));setContextMenu(null);}},color:"#EF4444",admin:true},
            ].filter(item=>item===null||!item.admin||isAdmin).map((item,i)=>
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
      {showTaskIssues&&<TaskIssueDrawer issues={taskIssues} loading={taskIssuesLoading} filter={taskIssueFilter} setFilter={setTaskIssueFilter} onClose={()=>setShowTaskIssues(false)} onStatusChange={(id,s)=>setTaskIssues(p=>p.map(x=>x.id===id?{...x,status:s}:x))}/>}

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
            const flat = (r2.data || []).filter(t => !String(t.task_no || "").startsWith("TODO-"));
            const map = {};
            flat.forEach(t => { t.children=[]; t.no=t.task_no; t.baseStart=t.base_start; t.baseEnd=t.base_end; t.dhyanRakhen=t.dhyan_rakhen; t.assignee=t.assignee_name||""; map[t.id]=t; });
            const roots = [];
            flat.forEach(t => { if(t.parent_id&&map[t.parent_id]) map[t.parent_id].children.push(t); else roots.push(t); });
            setTasks(roots);
          }
        } else alert(res.message || "Save failed");
        setShowAdd(false); setAddParent(null);
      }}/>}

      {/* Rebaseline / Set Baseline modal */}
      {showRebaseModal && (
        <RebaselineModal
          mode={showRebaseModal}   /* "set" or "rebaseline" */
          projectId={projectId}
          onClose={()=>setShowRebaseModal(false)}
          onSuccess={async()=>{
            setShowRebaseModal(false);
            await loadBaselineStatus();
            // Reload tasks to get updated baseline fields
            const r = await api.get("/tasks?project_id=" + projectId);
            if (r.success) {
              const flat = (r.data || []).filter(t => !String(t.task_no || "").startsWith("TODO-"));
              const map = {};
              flat.forEach((t, idx) => {
                t.children = []; t.no=t.task_no; t.tsk_no="TSK"+String(t.id).padStart(6,"0");
                t.baseStart=t.base_start; t.baseEnd=t.base_end;
                t.originalStart=t.original_start; t.originalEnd=t.original_end;
                t.currentBaselineStart=t.current_baseline_start; t.currentBaselineEnd=t.current_baseline_end;
                t.actualStart=t.actual_start; t.actualEnd=t.actual_end;
                t.dhyanRakhen=t.dhyan_rakhen; t.lastUpdate=t.last_update;
                t.assignee=t.assignee_name||t.assigned_to||""; t.serial=idx+1;
                map[t.id]=t;
              });
              const roots=[];
              flat.forEach(t => { if(t.parent_id&&map[t.parent_id]) map[t.parent_id].children.push(t); else roots.push(t); });
              setTasks(roots);
            }
          }}
        />
      )}

      {/* Task Template Picker modal */}
      {showTemplatePicker && (
        <TaskTemplatePickerModal
          projectId={projectId}
          onClose={()=>setShowTemplatePicker(false)}
          onApplied={async()=>{
            setShowTemplatePicker(false);
            // Reload tasks so new WBS shows
            const r = await api.get("/tasks?project_id=" + projectId);
            if (r.success) {
              const flat = (r.data || []).filter(t => !String(t.task_no || "").startsWith("TODO-"));
              const map = {};
              flat.forEach((t, idx) => {
                t.children=[]; t.no=t.task_no; t.tsk_no="TSK"+String(t.id).padStart(6,"0");
                t.baseStart=t.base_start; t.baseEnd=t.base_end;
                t.originalStart=t.original_start; t.originalEnd=t.original_end;
                t.currentBaselineStart=t.current_baseline_start; t.currentBaselineEnd=t.current_baseline_end;
                t.actualStart=t.actual_start; t.actualEnd=t.actual_end;
                t.dhyanRakhen=t.dhyan_rakhen; t.lastUpdate=t.last_update;
                t.assignee=t.assignee_name||t.assigned_to||""; t.serial=idx+1;
                map[t.id]=t;
              });
              const roots=[];
              flat.forEach(t => { if(t.parent_id&&map[t.parent_id]) map[t.parent_id].children.push(t); else roots.push(t); });
              setTasks(roots);
            }
          }}
        />
      )}

      {/* Baseline History modal */}
      {showBaselineHistory && (
        <BaselineHistoryModal
          projectId={projectId}
          canBaseline={!!baselineStatus?.can_baseline}
          onClose={()=>setShowBaselineHistory(false)}
          onDeleted={async()=>{
            setShowBaselineHistory(false);
            await loadBaselineStatus();
            // reload tasks so cached baseline cols reset
            const r = await api.get("/tasks?project_id=" + projectId);
            if (r.success) {
              const flat = (r.data || []).filter(t => !String(t.task_no || "").startsWith("TODO-"));
              const map = {};
              flat.forEach((t, idx) => {
                t.children=[]; t.no=t.task_no; t.tsk_no="TSK"+String(t.id).padStart(6,"0");
                t.baseStart=t.base_start; t.baseEnd=t.base_end;
                t.originalStart=t.original_start; t.originalEnd=t.original_end;
                t.currentBaselineStart=t.current_baseline_start; t.currentBaselineEnd=t.current_baseline_end;
                t.actualStart=t.actual_start; t.actualEnd=t.actual_end;
                t.dhyanRakhen=t.dhyan_rakhen; t.lastUpdate=t.last_update;
                t.assignee=t.assignee_name||t.assigned_to||""; t.serial=idx+1;
                map[t.id]=t;
              });
              const roots=[];
              flat.forEach(t => { if(t.parent_id&&map[t.parent_id]) map[t.parent_id].children.push(t); else roots.push(t); });
              setTasks(roots);
            }
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BASELINE STRIP — header card showing current baseline status
// ═══════════════════════════════════════════════════════════════
function BaselineStrip({ status, showCols, onToggleCols, onSet, onRebaseline, onHistory }) {
  if (!status) {
    return (
      <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#64748B"}}>
        Loading baseline status…
      </div>
    );
  }
  const canBaseline = !!status.can_baseline;
  if (!status.is_set) {
    return (
      <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:8,padding:"9px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11.5,fontWeight:600,color:"#475569",marginBottom:2,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:13}}>📋</span> Planned schedule active — no baseline yet
          </div>
          <div style={{fontSize:10.5,color:"#64748B"}}>Create a baseline jab delay ho — current dates lock ho jayengi aur aage ki variance track hogi.</div>
        </div>
        {canBaseline ? (
          <button onClick={onSet} style={{padding:"6px 12px",borderRadius:6,background:"white",color:"#5B21B6",fontSize:11,fontWeight:700,border:"1px solid #A78BFA",cursor:"pointer",whiteSpace:"nowrap"}}
            onMouseEnter={e=>{e.currentTarget.style.background="#F5F3FF";}}
            onMouseLeave={e=>{e.currentTarget.style.background="white";}}>
            📌 Create Baseline
          </button>
        ) : (
          <span style={{fontSize:10.5,color:"#94A3B8",fontStyle:"italic"}}>Admin / PM only</span>
        )}
      </div>
    );
  }
  const cur = status.current;
  const when = cur?.set_at ? new Date(cur.set_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
  return (
    <div style={{background:"linear-gradient(90deg,#EDE9FE,#DDD6FE)",border:"1px solid #A78BFA",borderRadius:8,padding:"10px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:220}}>
        <div style={{fontSize:12,fontWeight:700,color:"#5B21B6",marginBottom:2,display:"flex",alignItems:"center",gap:8}}>
          📌 Baseline v{cur?.version} (current)
          <span style={{background:"#7C3AED",color:"white",fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:10,letterSpacing:".4px"}}>{status.task_with_baseline}/{status.task_total} TASKS</span>
        </div>
        <div style={{fontSize:10.5,color:"#5B21B6"}}>Set {when} by <b>{cur?.set_by_name||"—"}</b></div>
        {cur?.reason && <div style={{fontSize:10.5,color:"#6D28D9",marginTop:3,fontStyle:"italic"}}>"{cur.reason}"</div>}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <button onClick={onToggleCols} title={showCols?"Hide baseline columns":"Show baseline columns"}
          style={{padding:"6px 11px",borderRadius:6,background:showCols?"#7C3AED":"white",color:showCols?"white":"#5B21B6",fontSize:11,fontWeight:700,border:`1px solid #7C3AED`,cursor:"pointer"}}>
          {showCols?"✓ Columns":"👁 Columns"}
        </button>
        <button onClick={onHistory} style={{padding:"6px 11px",borderRadius:6,background:"white",color:"#5B21B6",fontSize:11,fontWeight:700,border:`1px solid #7C3AED`,cursor:"pointer"}}>📜 History</button>
        {canBaseline && <button onClick={onRebaseline} style={{padding:"6px 11px",borderRadius:6,background:"linear-gradient(135deg,#7C3AED,#5B21B6)",color:"white",fontSize:11,fontWeight:700,border:"none",cursor:"pointer"}}>🔄 Rebaseline</button>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REBASELINE / SET BASELINE MODAL
// ═══════════════════════════════════════════════════════════════
function RebaselineModal({ mode, projectId, onClose, onSuccess }) {
  const isSet = mode === "set";
  const [reason, setReason] = useState("");
  const [rbMode, setRbMode] = useState("auto");
  const [shiftDays, setShiftDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (reason.trim().length < 5) { setError("Reason must be at least 5 characters"); return; }
    setLoading(true);
    try {
      if (isSet) {
        const r = await api.baseline.set(projectId, { reason });
        if (!r.success) throw new Error(r.message);
      } else {
        const body = { reason, mode: rbMode };
        if (rbMode === "auto") body.shift_days = parseInt(shiftDays,10) || 0;
        else body.task_overrides = []; // UI for manual per-task is future work; submits empty to force validation
        const r = await api.baseline.rebaseline(projectId, body);
        if (!r.success) throw new Error(r.message);
      }
      onSuccess();
    } catch(e) { setError(e.message || "Failed"); }
    setLoading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(3px)"}}>
      <div style={{background:"white",borderRadius:14,width:520,maxWidth:"92%",boxShadow:"0 24px 64px rgba(0,0,0,0.4)",overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
        <div style={{background:"linear-gradient(135deg,#7C3AED,#5B21B6)",padding:"16px 22px",color:"white"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",opacity:0.8,marginBottom:3}}>{isSet?"CREATE BASELINE":"REBASELINE"}</div>
          <div style={{fontSize:16,fontWeight:700}}>{isSet?"📌 Create Baseline v1":"🔄 Create New Baseline Version"}</div>
          <div style={{fontSize:11,opacity:0.85,marginTop:3}}>{isSet?"Typically done when delay hota hai — current planned dates snapshot ho jayengi aur aage ki variance track hogi.":"Completed tasks keep their previous baseline. Remaining tasks get the new schedule."}</div>
        </div>
        <div style={{padding:"18px 22px"}}>
          {error && <div style={{background:"#FEE2E2",color:"#991B1B",padding:"8px 12px",borderRadius:6,fontSize:12,marginBottom:12,border:"1px solid #FCA5A5"}}>{error}</div>}

          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>Reason <span style={{color:"#EF4444"}}>*</span></label>
            <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder={isSet?"e.g. Project kickoff — locking initial schedule":"e.g. Monsoon delay, client scope change..."}
              rows={3} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #D1D5DB",borderRadius:7,fontSize:12.5,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            <div style={{fontSize:10,color:"#9CA3AF",marginTop:3}}>Min 5 characters — audit log me save hoga</div>
          </div>

          {!isSet && (
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>Mode</label>
              <div style={{display:"flex",gap:8}}>
                <label style={{flex:1,padding:"10px 12px",border:`2px solid ${rbMode==="auto"?"#7C3AED":"#E5E7EB"}`,borderRadius:7,cursor:"pointer",background:rbMode==="auto"?"#F5F3FF":"white"}}>
                  <input type="radio" checked={rbMode==="auto"} onChange={()=>setRbMode("auto")} style={{marginRight:6}}/>
                  <span style={{fontSize:12,fontWeight:600}}>Auto-shift</span>
                  <div style={{fontSize:10,color:"#6B7280",marginLeft:20}}>Shift all remaining tasks by N days</div>
                </label>
                <label style={{flex:1,padding:"10px 12px",border:`2px solid ${rbMode==="manual"?"#7C3AED":"#E5E7EB"}`,borderRadius:7,cursor:"pointer",background:rbMode==="manual"?"#F5F3FF":"white",opacity:.5}}>
                  <input type="radio" checked={rbMode==="manual"} onChange={()=>{}} disabled style={{marginRight:6}}/>
                  <span style={{fontSize:12,fontWeight:600}}>Manual (coming soon)</span>
                  <div style={{fontSize:10,color:"#6B7280",marginLeft:20}}>Edit each task individually</div>
                </label>
              </div>

              {rbMode==="auto" && (
                <div style={{marginTop:10,padding:"10px 12px",background:"#F9FAFB",borderRadius:7,border:"1px solid #E5E7EB"}}>
                  <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>Shift remaining tasks by</label>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <input type="number" value={shiftDays} onChange={e=>setShiftDays(e.target.value)} style={{width:80,padding:"6px 10px",border:"1.5px solid #D1D5DB",borderRadius:6,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
                    <span style={{fontSize:12,color:"#6B7280"}}>days</span>
                    <span style={{fontSize:10,color:"#9CA3AF",marginLeft:8}}>(+ delays, − pulls earlier)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{display:"flex",gap:8,marginTop:20}}>
            <button onClick={onClose} disabled={loading}
              style={{flex:1,padding:"10px",borderRadius:7,background:"#F3F4F6",border:"1px solid #D1D5DB",fontSize:12.5,fontWeight:600,color:"#374151",cursor:loading?"not-allowed":"pointer"}}>Cancel</button>
            <button onClick={submit} disabled={loading}
              style={{flex:2,padding:"10px",borderRadius:7,background:loading?"#C4B5FD":"linear-gradient(135deg,#7C3AED,#5B21B6)",color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:loading?"not-allowed":"pointer"}}>
              {loading?"Saving...":isSet?"🔒 Confirm & Lock Baseline":"🔄 Confirm Rebaseline"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BASELINE HISTORY MODAL
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// TASK TEMPLATE PICKER MODAL
// ═══════════════════════════════════════════════════════════════
function TaskTemplatePickerModal({ projectId, onClose, onApplied }) {
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [wipeExisting, setWipeExisting] = useState(false);
  const [includeBOQ, setIncludeBOQ] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.taskTemplates.list().then(r => {
      if (r.success) setList(r.data || []);
      else setError(r.message || "Could not load templates");
    }).catch(e => setError(e.message));
  }, []);

  const apply = async () => {
    setError("");
    if (!selected) { setError("Pick a template first"); return; }
    const tpl = list.find(t => t.id === selected);
    if (wipeExisting && !await window.confirmAsync(`⚠️ This will DELETE all existing Gantt tasks for this project before loading "${tpl?.name}".\n\nTodos (in the To-Do tab) are not affected.\n\nContinue?`)) return;
    setApplying(true);
    try {
      const body = { template_id: selected, wipe_existing: wipeExisting, include_boq: includeBOQ };
      if (startDate) body.start_date = startDate;
      const r = await api.taskTemplates.apply(projectId, body);
      if (!r.success) throw new Error(r.message || "Apply failed");
      setResult(r.data);
      setTimeout(() => onApplied(), 1500);   // show success briefly
    } catch (e) { setError(e.message); }
    setApplying(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(3px)"}}>
      <div style={{background:"white",borderRadius:14,width:640,maxWidth:"94%",maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.4)",fontFamily:"'Segoe UI',sans-serif"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#EC4899,#BE185D)",padding:"16px 22px",color:"white",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",opacity:0.85,marginBottom:3}}>PROJECT TASK TEMPLATES</div>
            <div style={{fontSize:16,fontWeight:800}}>📋 Load Task Template</div>
            <div style={{fontSize:11,opacity:0.9,marginTop:3}}>Pre-built WBS with dependencies, durations, and BOQ — auto-adjusted to project start date.</div>
          </div>
          <button onClick={onClose} disabled={applying} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:6,cursor:applying?"not-allowed":"pointer",fontSize:14,fontWeight:700}}>✕</button>
        </div>

        {/* Body */}
        <div style={{padding:"16px 22px",overflowY:"auto",flex:1}}>
          {error && <div style={{background:"#FEE2E2",color:"#991B1B",padding:"9px 12px",borderRadius:6,fontSize:12,marginBottom:12,border:"1px solid #FCA5A5"}}>{error}</div>}
          {result && <div style={{background:"#D1FAE5",color:"#065F46",padding:"11px 14px",borderRadius:7,fontSize:12.5,marginBottom:12,border:"1px solid #6EE7B7",fontWeight:600}}>
            ✓ Template applied — {result.tasks_inserted} tasks, {result.boq_inserted || 0} BOQ items, {result.total_duration_days} days
          </div>}

          {!list && !error && <div style={{padding:24,textAlign:"center",color:"#94A3B8",fontSize:12}}>Loading templates…</div>}

          {list && list.length === 0 && <div style={{padding:24,textAlign:"center",color:"#94A3B8",fontSize:12}}>No templates available yet.</div>}

          {list && list.map(t => {
            const isSelected = selected === t.id;
            return (
              <div key={t.id} onClick={() => !applying && setSelected(t.id)}
                style={{padding:"12px 14px",marginBottom:9,borderRadius:8,border:`2px solid ${isSelected?"#EC4899":"#E5E7EB"}`,background:isSelected?"#FDF2F8":"white",cursor:applying?"wait":"pointer",transition:"all .15s"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13.5,fontWeight:700,color:isSelected?"#BE185D":"#111827",marginBottom:3}}>{t.name}</div>
                    <div style={{fontSize:11.5,color:"#6B7280",lineHeight:1.45,marginBottom:6}}>{t.description}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:10.5}}>
                      <span style={{background:"#FCE7F3",color:"#9D174D",padding:"2px 8px",borderRadius:10,fontWeight:700}}>{t.phase_count} phases</span>
                      <span style={{background:"#E0F2FE",color:"#075985",padding:"2px 8px",borderRadius:10,fontWeight:700}}>{t.package_count} packages</span>
                      <span style={{background:"#DCFCE7",color:"#14532D",padding:"2px 8px",borderRadius:10,fontWeight:700}}>{t.activity_count} activities</span>
                      <span style={{background:"#FEF3C7",color:"#78350F",padding:"2px 8px",borderRadius:10,fontWeight:700}}>{t.boq_count} BOQ items</span>
                    </div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5}}>
                      {(t.tags || []).map(tg => <span key={tg} style={{background:"#F3F4F6",color:"#6B7280",fontSize:9.5,fontWeight:600,padding:"2px 7px",borderRadius:4}}>{tg}</span>)}
                    </div>
                  </div>
                  {isSelected && <div style={{color:"#EC4899",fontSize:20}}>✓</div>}
                </div>
              </div>
            );
          })}

          {/* Options */}
          {selected && !result && (
            <div style={{marginTop:16,padding:"12px 14px",background:"#F9FAFB",borderRadius:8,border:"1px solid #E5E7EB"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:".5px",marginBottom:9}}>Apply Options</div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>Start date (optional)</label>
                <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                  style={{width:"100%",padding:"7px 10px",border:"1.5px solid #D1D5DB",borderRadius:6,fontSize:12.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                <div style={{fontSize:10,color:"#9CA3AF",marginTop:3}}>Leave blank to use the project's own start date.</div>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#374151",marginBottom:6,cursor:"pointer"}}>
                <input type="checkbox" checked={includeBOQ} onChange={e=>setIncludeBOQ(e.target.checked)}/>
                <span>Include BOQ items (recommended)</span>
              </label>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#B91C1C",fontWeight:600,cursor:"pointer"}}>
                <input type="checkbox" checked={wipeExisting} onChange={e=>setWipeExisting(e.target.checked)}/>
                <span>⚠ Delete existing Gantt tasks before loading</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"14px 22px",borderTop:"1px solid #E5E7EB",background:"#F9FAFB",display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onClose} disabled={applying} style={{padding:"8px 14px",borderRadius:6,background:"white",border:"1px solid #D1D5DB",fontSize:12.5,fontWeight:600,color:"#374151",cursor:applying?"not-allowed":"pointer"}}>Cancel</button>
          <button onClick={apply} disabled={!selected || applying || result} style={{padding:"8px 16px",borderRadius:6,background:(!selected||applying||result)?"#F9A8D4":"linear-gradient(135deg,#EC4899,#BE185D)",color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:(!selected||applying||result)?"not-allowed":"pointer"}}>
            {applying ? "Applying…" : result ? "Done ✓" : "🚀 Apply Template"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BaselineHistoryModal({ projectId, canBaseline, onClose, onDeleted }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.baseline.history(projectId).then(r => {
      if (r.success) setHistory(r.data || []);
      else setError(r.message || "Failed to load");
    }).catch(e => setError(e.message));
  }, [projectId]);

  const handleDelete = async () => {
    setError("");
    if (deleteReason.trim().length < 5) { setError("Reason must be at least 5 characters"); return; }
    setDeleting(true);
    try {
      const r = await api.baseline.clear(projectId, { reason: deleteReason });
      if (!r.success) throw new Error(r.message);
      if (onDeleted) onDeleted();
    } catch(e) { setError(e.message || "Delete failed"); }
    setDeleting(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(3px)"}}>
      <div style={{background:"white",borderRadius:14,width:640,maxWidth:"92%",maxHeight:"85vh",boxShadow:"0 24px 64px rgba(0,0,0,0.4)",overflow:"hidden",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
        <div style={{background:"linear-gradient(135deg,#7C3AED,#5B21B6)",padding:"16px 22px",color:"white",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",opacity:0.8,marginBottom:3}}>PROJECT BASELINE</div>
            <div style={{fontSize:16,fontWeight:700}}>📜 History</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:6,cursor:"pointer",fontSize:14,fontWeight:700}}>✕</button>
        </div>
        <div style={{padding:"18px 22px",overflow:"auto"}}>
          {error && <div style={{padding:12,background:"#FEE2E2",color:"#991B1B",borderRadius:7,fontSize:12}}>{error}</div>}
          {!history && !error && <div style={{padding:24,textAlign:"center",color:"#94A3B8",fontSize:12}}>Loading…</div>}
          {history && history.length === 0 && <div style={{padding:24,textAlign:"center",color:"#94A3B8",fontSize:12}}>No baselines yet.</div>}
          {history && history.map(b => (
            <div key={b.id} style={{padding:"12px 14px",marginBottom:8,background:b.is_current?"#F5F3FF":"#F9FAFB",border:`1px solid ${b.is_current?"#A78BFA":"#E5E7EB"}`,borderLeft:`4px solid ${b.is_current?"#7C3AED":"#9CA3AF"}`,borderRadius:7}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <span style={{fontSize:14,fontWeight:800,color:b.is_current?"#5B21B6":"#374151"}}>Baseline v{b.version}</span>
                {b.is_current && <span style={{background:"#7C3AED",color:"white",fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:10,letterSpacing:".4px"}}>CURRENT</span>}
                <span style={{fontSize:10,color:"#6B7280",marginLeft:"auto"}}>{b.task_count} tasks</span>
              </div>
              <div style={{fontSize:11,color:"#6B7280",marginBottom:4}}>
                {b.set_at ? new Date(b.set_at).toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"}
                {" · by "}<b>{b.set_by_name || "—"}</b>
              </div>
              {b.reason && <div style={{fontSize:12,color:"#374151",fontStyle:"italic",background:"white",padding:"6px 10px",borderRadius:5,border:"1px solid #E5E7EB"}}>"{b.reason}"</div>}
            </div>
          ))}

          {/* Danger zone — admin/PM only, collapsed by default */}
          {canBaseline && history && history.length > 0 && (
            <div style={{marginTop:18,paddingTop:14,borderTop:"1px dashed #E5E7EB"}}>
              {!showDelete ? (
                <button onClick={()=>setShowDelete(true)} style={{fontSize:10.5,color:"#94A3B8",background:"none",border:"none",cursor:"pointer",textDecoration:"underline",padding:"4px 0"}}>
                  Need to delete all baselines? (admin / PM)
                </button>
              ) : (
                <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:7,padding:"12px 14px"}}>
                  <div style={{fontSize:11.5,fontWeight:700,color:"#991B1B",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>⚠ Delete all baselines</div>
                  <div style={{fontSize:10.5,color:"#7F1D1D",marginBottom:10}}>Ye action saari baseline versions ({history.length}) aur per-task snapshots ko hata dega. Planned dates unchanged rahengi. <b>Ye undo nahi ho sakta.</b></div>
                  {error && <div style={{fontSize:11,color:"#991B1B",marginBottom:8,fontWeight:600}}>{error}</div>}
                  <label style={{fontSize:10,fontWeight:700,color:"#7F1D1D",textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Reason <span style={{color:"#DC2626"}}>*</span></label>
                  <input value={deleteReason} onChange={e=>setDeleteReason(e.target.value)} placeholder="Why deleting baselines?"
                    style={{width:"100%",padding:"7px 10px",border:"1.5px solid #FCA5A5",borderRadius:6,fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:10}}/>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{setShowDelete(false);setDeleteReason("");setError("");}} disabled={deleting}
                      style={{flex:1,padding:"7px",borderRadius:6,background:"white",border:"1px solid #D1D5DB",fontSize:11.5,fontWeight:600,color:"#374151",cursor:deleting?"not-allowed":"pointer"}}>Cancel</button>
                    <button onClick={handleDelete} disabled={deleting}
                      style={{flex:1,padding:"7px",borderRadius:6,background:deleting?"#FCA5A5":"linear-gradient(135deg,#DC2626,#991B1B)",color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:deleting?"not-allowed":"pointer"}}>
                      {deleting?"Deleting...":"🗑 Delete All Baselines"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inline Gantt for project detail ──────────────────────────────
function PTGantt({tasks}){
  const allFlat=(function flatD(list,depth=0,out=[]){list.forEach(t=>{out.push({...t,level:depth+1});if(t.children?.length)flatD(t.children,depth+1,out);});return out;})(tasks);
  const MONTHS=[];
  let d=new Date("2025-01-01");
  while(d<=new Date("2026-10-01")){MONTHS.push({y:d.getFullYear(),m:d.getMonth(),lbl:`${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}${d.getFullYear()===2026?"'26":""}`});d=new Date(d.getFullYear(),d.getMonth()+1,1);}
  const ROW_H=26,LBL_W=180,MO_W=36,HDR_H=28,TOTAL_W=LBL_W+MONTHS.length*MO_W,TOTAL_H=HDR_H+allFlat.length*ROW_H;
  const pStart=new Date("2025-01-01");
  const toX=(ds)=>{if(!ds)return null;const dd=(new Date(ds)-pStart)/(1000*86400);const tot=(new Date("2026-10-01")-pStart)/(1000*86400);return LBL_W+dd/tot*(MONTHS.length*MO_W);};
  const todayX=toX(new Date().toISOString().split("T")[0]);
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
            {ax1&&aw>0&&<rect x={ax1} y={y+ROW_H/2-5} width={aw} height={9} rx={2} fill={t.status==="Completed"?T.grn:t.status==="Ongoing"?T.blu:T.amb} fillOpacity={0.8}/>}
            {t.dhyanRakhen&&bx1&&<circle cx={bx1-5} cy={y+ROW_H/2} r={3.5} fill="#F59E0B"/>}
          </g>
        );
      })}
      {todayX&&<g><line x1={todayX} y1={HDR_H} x2={todayX} y2={TOTAL_H} stroke={T.red} strokeWidth={1.5} strokeDasharray="4,3"/><rect x={todayX-13} y={HDR_H-14} width={26} height={13} rx={3} fill={T.red}/><text x={todayX} y={HDR_H-4} textAnchor="middle" fontSize={7.5} fill="white" fontWeight="700">TODAY</text></g>}
    </svg>
  );
}

// ── Task MR Modal ──────────────────────────────────────────────────
function TaskMRModal({task, prefill, projectId, onClose, onSaved}){
  const [form,setForm]=useState({
    item_name: prefill?.material_name||"",
    quantity: prefill?.required_qty||"",
    unit: prefill?.unit||"Bag",
    required_date:"",
    approx_amount:"",
    notes:"",
  });
  const [saving,setSaving]=useState(false);
  const [matLib,setMatLib]=useState([]);
  const [showAddMat,setShowAddMat]=useState(false);
  const [newMatName,setNewMatName]=useState("");
  const [newMatUnit,setNewMatUnit]=useState("Nos");
  const [newMatSaving,setNewMatSaving]=useState(false);
  const UNITS=["Bag","Kg","CFT","Sq.Ft","Piece","Meter","Litre","MT","Running Ft","Nos","Cu.M","Sq.M"];

  useEffect(()=>{
    // Fetch material library
    if(projectId){
      api.get("/library/materials").then(r=>{
        if(r.success) setMatLib(r.data||[]);
      }).catch(()=>{});
    }
    // Fallback static list always available
  },[projectId]);

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(460px,95vw)",background:"white",borderRadius:12,zIndex:401,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",fontFamily:"'Segoe UI',sans-serif",overflow:"hidden"}}>
      <div style={{background:"#1E3A5F",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>New Material Request</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>Task: {task.name} · {task.tsk_no||task.no}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",display:"flex"}}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div style={{padding:"16px 18px"}}>
        <div style={{background:"#FEF9C3",border:"1px solid #FDE047",borderRadius:7,padding:"8px 12px",marginBottom:14,fontSize:11.5,color:"#713F12"}}>
          Request Procurement mein jayegi — Admin approve karenge phir order hoga
        </div>
        <div style={{marginBottom:10}}>
          <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Material Name *</label>
          <select value={form.item_name} onChange={e=>{
              const found=matLib.find(m=>m.name===e.target.value);
              setForm(p=>({...p,item_name:e.target.value,unit:found?found.unit||"Bag":p.unit}));
            }}
            style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"white",cursor:"pointer"}}
            onFocus={e=>e.target.style.borderColor="#3B82F6"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}>
            <option value="">-- Select Material --</option>
            {matLib.map(m=><option key={m.name} value={m.name}>{m.name} ({m.unit||"Nos"})</option>)}
          </select>
          {!showAddMat ? (
            <button type="button" onClick={()=>{setShowAddMat(true);setNewMatName("");setNewMatUnit("Nos");}}
              style={{marginTop:6,padding:"4px 10px",borderRadius:5,background:"transparent",border:"1px dashed #CBD5E1",color:"#64748B",fontSize:10.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              + Add New Material to Library
            </button>
          ) : (
            <div style={{marginTop:6,padding:"10px 11px",borderRadius:7,border:"1px solid #BFDBFE",background:"#EFF6FF"}}>
              <div style={{fontSize:10.5,fontWeight:700,color:"#2563EB",marginBottom:7}}>🆕 Add new material to library</div>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:7,marginBottom:7}}>
                <input value={newMatName} onChange={e=>setNewMatName(e.target.value)} autoFocus placeholder="Material name *"
                  style={{padding:"6px 9px",borderRadius:5,border:"1.5px solid #E2E8F0",fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"white"}}/>
                <select value={newMatUnit} onChange={e=>setNewMatUnit(e.target.value)}
                  style={{padding:"6px 9px",borderRadius:5,border:"1.5px solid #E2E8F0",fontSize:12,outline:"none",fontFamily:"inherit",background:"white",cursor:"pointer"}}>
                  {UNITS.map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button type="button" onClick={()=>{setShowAddMat(false);setNewMatName("");}}
                  style={{padding:"5px 10px",borderRadius:5,border:"1px solid #E2E8F0",background:"white",color:"#64748B",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                <button type="button" disabled={newMatSaving||!newMatName.trim()}
                  onClick={async()=>{
                    const name=newMatName.trim();
                    if(!name) return;
                    if(matLib.some(m=>m.name.toLowerCase()===name.toLowerCase())){alert("This material already exists");return;}
                    setNewMatSaving(true);
                    try{
                      const res=await api.post("/library/materials",{name,unit:newMatUnit});
                      if(res.success){
                        const newMat=res.data||{name,unit:newMatUnit};
                        setMatLib(prev=>[...prev,newMat].sort((a,b)=>a.name.localeCompare(b.name)));
                        setForm(p=>({...p,item_name:name,unit:newMatUnit}));
                        setShowAddMat(false);
                        setNewMatName("");
                      }else alert(res.message||"Failed");
                    }catch(e){alert("Network error");}
                    setNewMatSaving(false);
                  }}
                  style={{flex:1,padding:"5px 10px",borderRadius:5,border:"none",background:newMatSaving||!newMatName.trim()?"#94A3B8":"#2563EB",color:"white",fontSize:11,fontWeight:700,cursor:newMatSaving||!newMatName.trim()?"not-allowed":"pointer",fontFamily:"inherit"}}>
                  {newMatSaving?"Saving...":"Save & use"}
                </button>
              </div>
            </div>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div>
            <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Quantity *</label>
            <input type="number" inputMode="decimal" min={0} step="any" value={form.quantity}
              onKeyDown={e=>{if(e.key==="-"||e.key==="e"||e.key==="E"||e.key==="+") e.preventDefault();}}
              onChange={e=>{
                const v=e.target.value;
                if(v===""){setForm(p=>({...p,quantity:""}));return;}
                const n=parseFloat(v);
                if(!isNaN(n)&&n>=0) setForm(p=>({...p,quantity:v}));
              }}
              placeholder="0"
              style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
              onFocus={e=>e.target.style.borderColor="#3B82F6"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
          </div>
          <div>
            {(() => {
              const libMatch = matLib.find(m => (m.name||"").trim().toLowerCase() === (form.item_name||"").trim().toLowerCase());
              const isLocked = !!form.item_name;
              const displayUnit = libMatch?.unit || form.unit || "Nos";
              return (
                <>
                  <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>
                    Unit{isLocked && <span style={{marginLeft:5,fontSize:9,color:"#9CA3AF",textTransform:"none",fontWeight:500}}>(from library)</span>}
                  </label>
                  {isLocked ? (
                    <div style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,color:"#374151",background:"#F8F9FB",fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:6,height:39,boxSizing:"border-box"}}>
                      <span>🔒</span>{displayUnit}
                    </div>
                  ) : (
                    <select value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))}
                      style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit",background:"white"}}>
                      {UNITS.map(u=><option key={u}>{u}</option>)}
                    </select>
                  )}
                </>
              );
            })()}
          </div>
          <div>
            <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Required By</label>
            <input type="date" value={form.required_date} onChange={e=>setForm(p=>({...p,required_date:e.target.value}))}
              style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          <div>
            <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Approx. Amount</label>
            <input type="number" value={form.approx_amount} onChange={e=>setForm(p=>({...p,approx_amount:e.target.value}))} placeholder="₹"
              style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Notes</label>
          <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Special requirements..."
            style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none"}}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:7,background:"#F1F5F9",color:"#64748B",border:"none",cursor:"pointer",fontSize:13,fontWeight:600}}>Cancel</button>
          <button onClick={async()=>{
            if(!form.item_name.trim()||!form.quantity) return alert("Material name and quantity required");
            setSaving(true);
            const res=await api.post("/procurement/mrs",{
              project_id: projectId,
              item_name: form.item_name,
              quantity: Number(form.quantity),
              unit: form.unit,
              required_date: form.required_date||null,
              approx_amount: form.approx_amount||null,
              notes: form.notes ? form.notes+" [Task: "+task.name+"]" : "Task: "+task.name+" ("+task.tsk_no+")",
              task_id: task.id,
              task_name: task.name,
            });
            setSaving(false);
            if(res.success){
              api.post("/approvals/submit", {
                module: "Material Request",
                ref_id: res.data.id,
                ref_no: res.data.mr_number || "",
                title: form.item_name + " (" + form.quantity + " " + form.unit + ")",
                amount: Number(form.approx_amount) || 0,
                project_id: projectId,
                project_name: "",
              }).catch(e => console.error("Approval submit:", e));
              onSaved();
            }
            else alert(res.message||"Failed");
          }} disabled={saving}
            style={{flex:2,padding:"10px",borderRadius:7,background:saving?"#94A3B8":"#2563EB",color:"white",border:"none",cursor:saving?"default":"pointer",fontSize:13,fontWeight:700}}>
            {saving?"Submitting...":"Submit Request"}
          </button>
        </div>
      </div>
    </div>
  </>);
}

// ── Task GRN Modal ──────────────────────────────────────────────────
function TaskGRNModal({task, prefill, projectId, onClose, onSaved}){
  const [grnTab,setGrnTab]=useState("ordered"); // ordered | direct
  const [orderedMRs,setOrderedMRs]=useState([]);
  const [grnRows,setGrnRows]=useState({}); // {mrId: {challan, received_qty}}
  const [grnDone,setGrnDone]=useState([]);
  const [grnSaving,setGrnSaving]=useState(false);
  const [form,setForm]=useState({
    material_name: prefill?.material_name||"",
    received_qty:"",
    unit: prefill?.unit||"Bag",
    vendor_name:"",
    challan_no:"",
    received_date: new Date().toISOString().split("T")[0],
    quality:"Good",
    remark:"",
  });
  const [saving,setSaving]=useState(false);
  const [grnMatLib,setGrnMatLib]=useState([]);
  const UNITS=["Bag","Kg","CFT","Sq.Ft","Piece","Meter","Litre","MT","Running Ft","Nos","Cu.M","Sq.M"];

  // Load ordered MRs + material library
  useEffect(()=>{
    if(!projectId) return;
    api.get("/library/materials").then(r=>{if(r.success)setGrnMatLib(r.data||[]);}).catch(()=>{});
    api.get("/procurement/mrs?project_id="+projectId+"&mr_status=Approved&mat_status=Ordered").then(r=>{
      if(r.success){
        const mrs=(r.data||[]).filter(m=>m.mat_status==="Ordered"||m.mat_status==="Pending");
        setOrderedMRs(mrs);
        const rows={};
        mrs.forEach(m=>{ rows[m.id]={challan:"",received_qty:m.quantity||0}; });
        setGrnRows(rows);
      }
    }).catch(()=>{});
  },[projectId]);

  const handleOrderedReceive=async(mr)=>{
    const row=grnRows[mr.id]||{};
    if(!row.challan) return alert("Challan number required");
    setGrnSaving(true);
    try{
      // Use mark-received which properly updates MR mat_status to Received
      const res=await api.patch("/procurement/mrs/"+mr.id+"/mark-received",{
        challan_no: row.challan,
        received_qty: Number(row.received_qty||mr.quantity),
      });
      if(res.success){
        setGrnDone(p=>[...p,mr.id]);
        onSaved();
      } else alert(res.message||"Failed");
    }catch(e){alert(e.message);}
    setGrnSaving(false);
  };

  const handleDirectSave=async()=>{
    if(!form.material_name.trim()||!form.received_qty) return alert("Material name and received qty required");
    setSaving(true);
    const res=await api.post("/procurement/grns",{
      project_id: projectId,
      vendor_name: form.vendor_name||"Direct",
      received_by: "Site",
      received_date: form.received_date,
      challan_no: form.challan_no||null,
      quality: form.quality,
      remark: form.remark||null,
      task_id: task.id,
      items:[{
        description: form.material_name,
        received_qty: Number(form.received_qty),
        unit: form.unit,
        ordered_qty: Number(form.received_qty),
      }]
    });
    setSaving(false);
    if(res.success) onSaved();
    else alert(res.message||"Failed");
  };

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(560px,96vw)",maxHeight:"85vh",background:"white",borderRadius:12,zIndex:401,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",fontFamily:"'Segoe UI',sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Header */}
      <div style={{background:"#0F172A",padding:"13px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>Record GRN — Material Received</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.4)",marginTop:2}}>Task: {task.name} · {task.tsk_no||task.no}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",display:"flex"}}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:"white",borderBottom:"1px solid #E2E8F0",flexShrink:0}}>
        {[
          {id:"ordered",l:"Ordered Materials",count:orderedMRs.filter(m=>!grnDone.includes(m.id)).length},
          {id:"direct",l:"Direct Receive",count:0},
        ].map(t=>(
          <button key={t.id} onClick={()=>setGrnTab(t.id)}
            style={{flex:1,padding:"11px",border:"none",background:"none",fontSize:13,fontWeight:grnTab===t.id?700:400,color:grnTab===t.id?"#2563EB":"#64748B",borderBottom:grnTab===t.id?"2px solid #2563EB":"2px solid transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            {t.l}
            {t.count>0&&<span style={{background:"#2563EB",color:"white",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:10}}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>

        {/* Ordered Materials tab */}
        {grnTab==="ordered"&&(
          <div>
            {orderedMRs.length===0&&(
              <div style={{textAlign:"center",padding:"40px 0",color:"#94A3B8"}}>
                <div style={{fontSize:13,marginBottom:4}}>No ordered materials pending</div>
                <div style={{fontSize:11}}>MR raise karo aur approve/order hone do</div>
              </div>
            )}
            {orderedMRs.map(mr=>{
              const done=grnDone.includes(mr.id);
              const row=grnRows[mr.id]||{};
              return(
                <div key={mr.id} style={{background:done?"#F0FDF4":"white",borderRadius:10,padding:"12px 14px",border:"1px solid "+(done?"#BBF7D0":"#E2E8F0"),marginBottom:10,borderLeft:"3px solid "+(done?"#16A34A":"#F59E0B")}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#1E293B"}}>{mr.item_name}</div>
                      <div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>
                        Ordered: {mr.quantity} {mr.unit}
                        {mr.project_name&&<span style={{color:"#64748B"}}> · {mr.project_name}</span>}
                      </div>
                    </div>
                    {done&&<span style={{fontSize:11,fontWeight:700,color:"#16A34A",background:"#DCFCE7",padding:"3px 9px",borderRadius:20}}>✓ Received</span>}
                  </div>
                  {!done&&(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"flex-end"}}>
                      <div>
                        <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:3,textTransform:"uppercase"}}>Challan No *</label>
                        <input value={row.challan||""} onChange={e=>setGrnRows(p=>({...p,[mr.id]:{...p[mr.id],challan:e.target.value}}))}
                          placeholder="e.g. CH-445"
                          style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                          onFocus={e=>e.target.style.borderColor="#2563EB"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
                      </div>
                      <div>
                        <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:3,textTransform:"uppercase"}}>Received Qty</label>
                        <input type="number" value={row.received_qty||""} onChange={e=>setGrnRows(p=>({...p,[mr.id]:{...p[mr.id],received_qty:e.target.value}}))}
                          style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                      </div>
                      <button onClick={()=>handleOrderedReceive(mr)} disabled={grnSaving}
                        style={{padding:"8px 14px",borderRadius:6,background:grnSaving?"#94A3B8":"#16A34A",color:"white",border:"none",cursor:grnSaving?"default":"pointer",fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>
                        ✓ Receive
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Direct Receive tab */}
        {grnTab==="direct"&&(
          <div>
            <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:7,padding:"8px 12px",marginBottom:14,fontSize:11.5,color:"#14532D"}}>
              Direct site delivery — Stock register mein add hoga
            </div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Material Name *</label>
              <input value={form.material_name} onChange={e=>setForm(p=>({...p,material_name:e.target.value}))}
                placeholder="e.g. OPC Cement 53 Grade" list="grn-mat-list"
                style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor="#16A34A"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
              <datalist id="grn-mat-list">
                {grnMatLib.map(m=><option key={m.name} value={m.name}/>)}
              </datalist>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Received Qty *</label>
                <input type="number" value={form.received_qty} onChange={e=>setForm(p=>({...p,received_qty:e.target.value}))} placeholder="0"
                  style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div>
                <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Unit</label>
                <select value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))}
                  style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit",background:"white"}}>
                  {UNITS.map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Vendor Name</label>
                <input value={form.vendor_name} onChange={e=>setForm(p=>({...p,vendor_name:e.target.value}))} placeholder="Supplier name"
                  style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div>
                <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Challan No</label>
                <input value={form.challan_no} onChange={e=>setForm(p=>({...p,challan_no:e.target.value}))} placeholder="Optional"
                  style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div>
                <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Received Date</label>
                <input type="date" value={form.received_date} onChange={e=>setForm(p=>({...p,received_date:e.target.value}))}
                  style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div>
                <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Quality</label>
                <select value={form.quality} onChange={e=>setForm(p=>({...p,quality:e.target.value}))}
                  style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit",background:"white"}}>
                  {["Good","Average","Rejected"].map(q=><option key={q}>{q}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Remark</label>
              <input value={form.remark} onChange={e=>setForm(p=>({...p,remark:e.target.value}))} placeholder="Optional"
                style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{padding:"12px 18px",borderTop:"1px solid #E2E8F0",flexShrink:0,display:"flex",gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:7,background:"#F1F5F9",color:"#64748B",border:"none",cursor:"pointer",fontSize:13,fontWeight:600}}>Close</button>
        {grnTab==="direct"&&(
          <button onClick={handleDirectSave} disabled={saving}
            style={{flex:2,padding:"10px",borderRadius:7,background:saving?"#94A3B8":"#16A34A",color:"white",border:"none",cursor:saving?"default":"pointer",fontSize:13,fontWeight:700}}>
            {saving?"Saving...":"Record GRN"}
          </button>
        )}
      </div>
    </div>
  </>);
}

// ── Task Issue Drawer ────────────────────────────────────────────────
function TaskIssueDrawer({issues, loading, filter, setFilter, onClose, onStatusChange}){
  const priC={"Low":{c:"#64748B",bg:"#F1F5F9"},"Medium":{c:"#D97706",bg:"#FEF3C7"},"High":{c:"#DC2626",bg:"#FEE2E2"},"Critical":{c:"#7C3AED",bg:"#EDE9FE"}};
  const issC={"Open":{c:"#DC2626",bg:"#FEE2E2"},"In Progress":{c:"#2563EB",bg:"#DBEAFE"},"Resolved":{c:"#16A34A",bg:"#DCFCE7"},"Closed":{c:"#64748B",bg:"#F1F5F9"}};
  const FILTERS=["All","Open","In Progress","Resolved","Closed"];
  const filtered=filter==="All"?issues:issues.filter(i=>i.status===filter);
  const fmtD=d=>d?new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"";
  const [expandedChat,setExpandedChat]=useState(null);
  const [fullPhoto,setFullPhoto]=useState(null);
  const [closingId,setClosingId]=useState(null);

  // Group by task
  const byTask = filtered.reduce((acc,i)=>{
    const key=(i.task_no||"")+" "+(i.task_name||"Unknown Task");
    if(!acc[key]) acc[key]=[];
    acc[key].push(i);
    return acc;
  },{});

  const handleClose=async(issueId)=>{
    setClosingId(issueId);
    const r=await api.put("/tasks/issues/"+issueId,{status:"Closed"}).catch(()=>null);
    if(r?.success) onStatusChange(issueId,"Closed");
    setClosingId(null);
  };

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    {fullPhoto&&(
      <div onClick={()=>setFullPhoto(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
        <img src={fullPhoto} style={{maxWidth:"95vw",maxHeight:"90vh",objectFit:"contain",borderRadius:8}}/>
        <button onClick={()=>setFullPhoto(null)} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    )}
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(520px,96vw)",background:"#F8FAFC",zIndex:401,boxShadow:"-6px 0 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease"}}>
      {/* Header */}
      <div style={{background:"#0F172A",padding:"13px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"white"}}>Issues — This Project</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2}}>{filtered.length} issue{filtered.length!==1?"s":""} · task-wise</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {/* Filter tabs */}
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {FILTERS.map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{padding:"4px 10px",borderRadius:20,border:"none",background:filter===f?"white":"rgba(255,255,255,0.1)",color:filter===f?"#0F172A":"rgba(255,255,255,0.6)",fontSize:11,fontWeight:filter===f?700:400,cursor:"pointer"}}>
              {f}{f!=="All"&&<span style={{marginLeft:4,fontSize:10,opacity:.8}}>{issues.filter(i=>i.status===f).length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
        {loading&&<div style={{textAlign:"center",padding:"60px 0",color:"#94A3B8"}}><div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>Loading...</div>}
        {!loading&&filtered.length===0&&<div style={{textAlign:"center",padding:"50px 0",color:"#94A3B8",fontSize:13}}>No issues found for this project.</div>}

        {Object.entries(byTask).map(([taskLabel,taskIssues])=>(
          <div key={taskLabel} style={{marginBottom:14}}>
            {/* Task header */}
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7,padding:"5px 10px",background:"#1E293B",borderRadius:7}}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg>
              <span style={{fontSize:11.5,fontWeight:700,color:"white"}}>{taskLabel.trim()||"Unknown Task"}</span>
              <span style={{marginLeft:"auto",fontSize:10,color:"#94A3B8"}}>{taskIssues.length} issue{taskIssues.length!==1?"s":""}</span>
            </div>

            {taskIssues.map(issue=>{
              const pc=priC[issue.priority]||priC["Medium"];
              const ic=issC[issue.status]||issC["Open"];
              const isClosed=issue.status==="Closed"||issue.status==="Resolved";
              return(
                <div key={issue.id} style={{background:"white",borderRadius:9,padding:"11px 13px",marginBottom:8,border:"1px solid #E2E8F0",borderLeft:`3px solid ${ic.c}`,opacity:isClosed?.7:1}}>
                  {/* Title + badges */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#1E293B",flex:1,marginRight:8}}>{issue.title}</div>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      <span style={{background:pc.bg,color:pc.c,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4}}>{issue.priority}</span>
                      <span style={{background:ic.bg,color:ic.c,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4}}>{issue.status}</span>
                    </div>
                  </div>
                  {/* Photo + assigned + category */}
                  <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
                    {issue.photo_url&&(
                      <img src={issue.photo_url} alt="issue" onClick={()=>setFullPhoto(issue.photo_url)}
                        style={{width:44,height:44,borderRadius:6,objectFit:"cover",border:"1px solid #E2E8F0",cursor:"zoom-in",flexShrink:0}}/>
                    )}
                    <div style={{flex:1,display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                      {issue.assigned_to&&<span style={{fontSize:10,color:"#2563EB",background:"#DBEAFE",borderRadius:4,padding:"1px 7px",fontWeight:600}}>👤 {issue.assigned_to}</span>}
                      {issue.work_category&&<span style={{fontSize:10,color:"#7C3AED",background:"#EDE9FE",borderRadius:4,padding:"1px 7px",fontWeight:600}}>🔧 {issue.work_category}</span>}
                      <span style={{fontSize:10,color:"#94A3B8",marginLeft:"auto"}}>{fmtD(issue.created_at)}</span>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setExpandedChat(expandedChat===issue.id?null:issue.id)}
                      style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:6,border:"1px solid #E2E8F0",background:expandedChat===issue.id?"#DBEAFE":"white",cursor:"pointer",fontSize:11,color:expandedChat===issue.id?"#2563EB":"#64748B",fontWeight:600}}>
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                      Message
                    </button>
                    {!isClosed&&(
                      <button onClick={()=>handleClose(issue.id)} disabled={closingId===issue.id}
                        style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:6,border:"1px solid #D1FAE5",background:"#ECFDF5",cursor:"pointer",fontSize:11,color:"#16A34A",fontWeight:600,marginLeft:"auto"}}>
                        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
                        {closingId===issue.id?"Closing...":"Close Issue"}
                      </button>
                    )}
                  </div>
                  {/* Chat */}
                  {expandedChat===issue.id&&<div style={{marginTop:8}}><TaskIssueChat issueId={issue.id}/></div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  </>);
}

// ── Issue Chat Component ─────────────────────────────────────────────
function TaskIssueChat({issueId}){
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
    <div style={{background:"#F8FAFC",borderRadius:8,padding:"10px 12px",marginBottom:10,border:"1px solid #E2E8F0"}}>
      <div style={{fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        Chat ({comments.length})
      </div>
      {!loaded&&<div style={{textAlign:"center",padding:"10px 0",color:"#94A3B8"}}><div style={{width:20,height:20,border:"2px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 6px"}}></div><span style={{fontSize:11}}>Loading...</span></div>}
      {loaded&&comments.length===0&&<div style={{fontSize:11,color:"#CBD5E1",textAlign:"center",padding:"4px 0"}}>No messages yet — start the conversation</div>}
      <div style={{maxHeight:160,overflowY:"auto",marginBottom:8}}>
        {comments.map(c=>(
          <div key={c.id} style={{display:"flex",gap:7,marginBottom:8}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#2563EB,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:700,color:"white"}}>
              {(c.user_name||"?").charAt(0).toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                <span style={{fontSize:11,fontWeight:700,color:"#1E293B"}}>{c.user_name||"—"}</span>
                <span style={{fontSize:9.5,color:"#94A3B8"}}>{fmtD(c.created_at)} {fmtT(c.created_at)}</span>
              </div>
              <div style={{padding:"6px 9px",background:"white",borderRadius:"0 8px 8px 8px",border:"1px solid #E2E8F0",fontSize:12,color:"#334155",lineHeight:1.5}}>{c.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:6}}>
        <input value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&!sending&&send()}
          placeholder="Type message... (Enter to send)"
          style={{flex:1,padding:"7px 10px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:12,color:"#1E293B",outline:"none",fontFamily:"inherit",background:"white"}}/>
        <button onClick={send} disabled={sending||!text.trim()}
          style={{padding:"7px 13px",borderRadius:7,background:!text.trim()?"#E2E8F0":"#2563EB",color:!text.trim()?"#94A3B8":"white",border:"none",cursor:text.trim()?"pointer":"default",fontSize:12,fontWeight:600,flexShrink:0}}>
          {sending?"...":"Send"}
        </button>
      </div>
    </div>
  );
}

function PTTaskDetail({task,allTasks,onClose,onUpdate,projectId}){
  // ── Scrollspy: active nav section ───────────────────────────────────
  const [activeSection,setActiveSection]=useState("progress");
  const scrollRef=useRef(null);
  const progressRef=useRef(null);
  const materialsRef=useRef(null);
  const labourRef=useRef(null);
  const photosRef=useRef(null);
  const issuesRef=useRef(null);

  const [prog,setProg]=useState(task.progress||0);
  const [saving,setSaving]=useState(false);

  // Materials
  const [materials,setMaterials]=useState([]);
  const [showMRModal,setShowMRModal]=useState(false);
  const [showGRNModal,setShowGRNModal]=useState(false);
  const [mrMaterial,setMrMaterial]=useState(null);
  const [matLoading,setMatLoading]=useState(true);
  const [showUsedModal,setShowUsedModal]=useState(false);
  const [usedEntries,setUsedEntries]=useState({});
  const [matTab,setMatTab]=useState("summary");
  const [inventory,setInventory]=useState([]);
  const [invLoading,setInvLoading]=useState(true);
  const [usedLog,setUsedLog]=useState([]);
  const [usedLogLoading,setUsedLogLoading]=useState(true);
  const [showUsedLogForm,setShowUsedLogForm]=useState(false);
  const [usedLogForm,setUsedLogForm]=useState({material_name:"",used_qty:"",unit:"Nos",remark:"",used_date:new Date().toISOString().split("T")[0]});
  const [usedLogSaving,setUsedLogSaving]=useState(false);

  // Labour
  const [labours,setLabours]=useState([]);
  const [labLoading,setLabLoading]=useState(true);
  const [showLabForm,setShowLabForm]=useState(false);
  const [labForm,setLabForm]=useState({labour_type:"Direct",labour_name:"",vendor_name:"",work_date:new Date().toISOString().split("T")[0],hours:8,remark:""});
  const [labSkillRows,setLabSkillRows]=useState([{role:"Mason",count:1}]);
  const [compLabLib,setCompLabLib]=useState([]);
  const [subconLib,setSubconLib]=useState([]);
  const [vendorLib,setVendorLib]=useState([]);
  const [labSearchQ,setLabSearchQ]=useState("");
  const [labSearchOpen,setLabSearchOpen]=useState(false);
  const [showCreateLab,setShowCreateLab]=useState(false);
  const [newLabName,setNewLabName]=useState("");
  const [labIsNew,setLabIsNew]=useState(false); // true = typed new name, will save to library
  // Attendance settings from localStorage (set in Settings → Attendance)
  const [attSett] = useState(()=>{ try{ const s=JSON.parse(localStorage.getItem("gb_att_settings")||"{}"); return {company:{mode:"name",paymentCycle:"monthly",...(s.company||{})},subcon:{mode:"count",...(s.subcon||{})},vendor:{mode:"count",trackPayment:true,...(s.vendor||{})}}; }catch{return {company:{mode:"name",paymentCycle:"monthly"},subcon:{mode:"count"},vendor:{mode:"count",trackPayment:true}};} });
  // Active labour type tab
  const [labType,setLabType]=useState("Direct");
  // Selected date for attendance entry
  const [labDate,setLabDate]=useState(new Date().toISOString().split("T")[0]);
  // Name-wise attendance workers for today (Company Labour)
  const [dayWorkers,setDayWorkers]=useState([]); // [{lib_id,name,role,daily_rate,status:"P"|"A"|"H",hours:8,ot_hours:0}]
  // Selected subcon/vendor for attendance
  const [labDaySubcon,setLabDaySubcon]=useState("");
  const [labDayVendor,setLabDayVendor]=useState("");
  // Count rows (for count mode subcon/vendor)
  const [labCountRows,setLabCountRows]=useState([{role:"Mason",count:0,rate:0}]);
  // Saving attendance
  const [labSaving,setLabSaving]=useState(false);
  // Show add-worker-to-day panel
  const [showAddDayWorker,setShowAddDayWorker]=useState(false);
  // Subcon workers (name-wise for subcon)
  const [daySubconWorkers,setDaySubconWorkers]=useState([]);

  // Photos
  const [photos,setPhotos]=useState([]);
  const [phLoading,setPhLoading]=useState(true);
  const [uploading,setUploading]=useState(false);
  const [fullPhoto,setFullPhoto]=useState(null);

  // Issues
  const [issues,setIssues]=useState([]);
  const [issLoading,setIssLoading]=useState(true);
  const [showIssueForm,setShowIssueForm]=useState(false);
  const [issueForm,setIssueForm]=useState({title:"",description:"",priority:"Medium",assigned_to:"",work_category:""});
  const [issueUploading,setIssueUploading]=useState(false);
  const [expandedIssue,setExpandedIssue]=useState(null);
  const [expandedIssueChat,setExpandedIssueChat]=useState(null);
  const [issueWorkCats,setIssueWorkCats]=useState([]);
  const [issueTeam,setIssueTeam]=useState([]);

  // Comments
  const [comments,setComments]=useState([]);
  const [commentText,setCommentText]=useState("");
  const [sendingComment,setSendingComment]=useState(false);

  const autoStatus=(p)=>{ if(p===0) return "Not Started"; if(p===100) return "Completed"; return "Ongoing"; };
  const ss={"Completed":{c:T.grn,bg:T.grnL,brd:T.grnM},"Ongoing":{c:T.blu,bg:T.bluL,brd:T.bluM},"Not Started":{c:T.slt,bg:T.sltL,brd:T.b2},"Hold":{c:T.amb,bg:T.ambL,brd:T.ambM}};
  const sm=ss[autoStatus(prog)]||ss["Not Started"];
  const delay=ptDelayDays(task);

  const UNITS=["Bag","Kg","CFT","Sq.Ft","Piece","Meter","Litre","MT","Running Ft","Nos","Cu.M","Sq.M"];
  const ROLES=["Mason","Labour","Helper","Electrician","Plumber","Carpenter","Painter","Supervisor","Other"];
  const PRIORITIES=["Low","Medium","High","Critical"];
  const ISSUE_STATUS=["Open","In Progress","Resolved","Closed"];
  const priC={"Low":{c:"#64748B",bg:"#F1F5F9"},"Medium":{c:"#D97706",bg:"#FEF3C7"},"High":{c:"#DC2626",bg:"#FEE2E2"},"Critical":{c:"#7C3AED",bg:"#EDE9FE"}};
  const issC={"Open":{c:"#DC2626",bg:"#FEE2E2"},"In Progress":{c:"#2563EB",bg:"#DBEAFE"},"Resolved":{c:"#16A34A",bg:"#DCFCE7"},"Closed":{c:"#64748B",bg:"#F1F5F9"}};

  // ── Load all data on mount ───────────────────────────────────────────
  useEffect(()=>{
    api.get("/tasks/"+task.id+"/comments").then(r=>{if(r.success)setComments(r.data||[]);}).catch(()=>{});
    // Materials
    api.get("/tasks/"+task.id+"/material-summary").then(r=>{if(r.success)setMaterials(r.data||[]);setMatLoading(false);}).catch(()=>setMatLoading(false));
    api.get("/tasks/project/"+projectId+"/inventory").then(r=>{if(r.success)setInventory(r.data||[]);setInvLoading(false);}).catch(()=>setInvLoading(false));
    api.get("/tasks/"+task.id+"/used-log").then(r=>{if(r.success)setUsedLog(r.data||[]);setUsedLogLoading(false);}).catch(()=>setUsedLogLoading(false));
    // Labour
    api.get("/tasks/"+task.id+"/labour").then(r=>{if(r.success)setLabours(r.data||[]);setLabLoading(false);}).catch(()=>setLabLoading(false));
    api.get("/library/workers").then(r=>{if(r.success)setCompLabLib(r.data||[]);}).catch(()=>{});
    api.get("/finance/parties?type=Subcontractor").then(r=>{if(r.success)setSubconLib(r.data||[]);}).catch(()=>{});
    api.get("/procurement/vendors").then(r=>{if(r.success)setVendorLib(r.data||[]);}).catch(()=>{});
    // Photos
    api.get("/tasks/"+task.id+"/photos").then(r=>{if(r.success)setPhotos(r.data||[]);setPhLoading(false);}).catch(()=>setPhLoading(false));
    // Issues
    api.get("/tasks/"+task.id+"/issues").then(r=>{if(r.success)setIssues(r.data||[]);setIssLoading(false);}).catch(()=>setIssLoading(false));
    api.get("/library/work-categories").then(r=>{if(r.success)setIssueWorkCats((r.data||[]).map(c=>c.name));}).catch(()=>{});
    api.get("/settings/users").then(r=>{if(r.success)setIssueTeam((r.data||[]).map(u=>u.name));}).catch(()=>{});
  },[]);

  // ── Scrollspy via IntersectionObserver ──────────────────────────────
  useEffect(()=>{
    const root=scrollRef.current; if(!root) return;
    const refs=[
      {id:"progress",ref:progressRef},
      {id:"materials",ref:materialsRef},
      {id:"labour",ref:labourRef},
      {id:"photos",ref:photosRef},
      {id:"issues",ref:issuesRef},
    ];
    const observer=new IntersectionObserver((entries)=>{
      // pick the entry closest to top that is intersecting
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
      if(visible.length>0) setActiveSection(visible[0].target.dataset.section);
    },{root,threshold:0.15,rootMargin:"-10% 0px -60% 0px"});
    refs.forEach(({ref})=>{ if(ref.current) observer.observe(ref.current); });
    return()=>observer.disconnect();
  },[]);

  const sendComment=async()=>{
    if(!commentText.trim()) return;
    setSendingComment(true);
    const r=await api.post("/tasks/"+task.id+"/comments",{text:commentText});
    if(r.success){setComments(p=>[...p,r.data]);setCommentText("");}
    setSendingComment(false);
  };

  const uploadToCloudinary=async(file,folder)=>{
    const fd=new FormData(); fd.append("file",file); fd.append("upload_preset","gb_buildcon_drawings"); fd.append("folder",folder);
    const cr=await fetch("https://api.cloudinary.com/v1_1/dd632nqfm/image/upload",{method:"POST",body:fd});
    return await cr.json();
  };

  const scrollToSection=(id)=>{
    const refs={progress:progressRef,materials:materialsRef,labour:labourRef,photos:photosRef,issues:issuesRef};
    refs[id]?.current?.scrollIntoView({behavior:"smooth",block:"start"});
    setActiveSection(id);
  };

  return(<>
    {/* Backdrop */}
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300,backdropFilter:"blur(2px)"}}/>

    {/* Full photo viewer */}
    {fullPhoto&&(
      <div onClick={()=>setFullPhoto(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
        <img src={fullPhoto.photo_url} style={{maxWidth:"95vw",maxHeight:"90vh",objectFit:"contain",borderRadius:8}}/>
        {(fullPhoto.lat||fullPhoto.lng)&&<div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.7)",borderRadius:20,padding:"6px 14px",color:"white",fontSize:11,display:"flex",alignItems:"center",gap:6}}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx={12} cy={10} r={3}/></svg>
          {Number(fullPhoto.lat).toFixed(6)}, {Number(fullPhoto.lng).toFixed(6)}
        </div>}
        <button onClick={()=>setFullPhoto(null)} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:40,height:40,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    )}

    {/* ── DRAWER ── */}
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(600px,100vw)",background:"#F8FAFC",zIndex:301,boxShadow:"-8px 0 40px rgba(0,0,0,0.2)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease"}}>

      {/* ── HEADER (fixed) ── */}
      <div style={{background:"#0F172A",padding:"12px 16px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
              <span style={{fontSize:9.5,color:"rgba(255,255,255,0.35)",fontFamily:"monospace"}}>{task.tsk_no||task.no}</span>
              <span style={{background:sm.bg,color:sm.c,fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:4}}>{autoStatus(prog)}</span>
              {task.dhyanRakhen&&<span style={{background:"#FEF3C7",color:"#92400E",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:4}}>⚠ DHYAN</span>}
              {delay>0&&<span style={{background:"#FEE2E2",color:"#DC2626",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:4}}>{delay}d delayed</span>}
            </div>
            <div style={{fontSize:15,fontWeight:700,color:"white",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.name}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:3}}>{task.category}{task.assignee?" · "+task.assignee:""}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.8)",padding:8,display:"flex",borderRadius:8,flexShrink:0}}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {/* Progress bar */}
        <div style={{marginTop:10,display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,height:5,background:"rgba(255,255,255,0.15)",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:prog+"%",background:prog===100?"#10B981":"#3B82F6",borderRadius:3,transition:"width .3s"}}/>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:prog===100?"#10B981":"white",minWidth:34}}>{prog}%</span>
        </div>
      </div>

      {/* DHYAN banner */}
      {task.dhyanRakhen&&<div style={{padding:"8px 14px",background:"#FEF3C7",borderBottom:"1px solid #FDE68A",flexShrink:0,display:"flex",gap:7}}>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth={2} style={{marginTop:1,flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
        <div style={{fontSize:11.5,color:"#92400E",lineHeight:1.5}}>{task.dhyanRakhen}</div>
      </div>}

      {/* ── SCROLLSPY NAV (sticky) ── */}
      <div style={{background:"white",borderBottom:"2px solid #E2E8F0",padding:"0 10px",flexShrink:0,display:"flex",overflowX:"auto",gap:2,WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
        {[
          {id:"progress", l:"Progress",  ic:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",       cnt:null},
          {id:"materials",l:"Materials", ic:"M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", cnt:materials.length||null},
          {id:"labour",   l:"Labour",    ic:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z", cnt:labours.length||null},
          {id:"photos",   l:"Photos",    ic:"M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z", cnt:photos.length||null},
          {id:"issues",   l:"Issues",    ic:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01", cnt:issues.filter(i=>i.status==="Open"||i.status==="In Progress").length||null},
        ].map(t=>{
          const active=activeSection===t.id;
          return(
            <button key={t.id} onClick={()=>scrollToSection(t.id)}
              style={{padding:"11px 10px",border:"none",background:"none",fontSize:12,fontWeight:active?700:500,
                color:active?"#2563EB":"#64748B",
                borderBottom:active?"3px solid #2563EB":"3px solid transparent",
                cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
                display:"flex",alignItems:"center",gap:5,
                minHeight:44,transition:"color .15s,border-color .15s"}}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d={t.ic}/></svg>
              {t.l}
              {t.cnt>0&&<span style={{background:active?"#2563EB":"#E2E8F0",color:active?"white":"#64748B",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:10,lineHeight:1.6,transition:"all .15s"}}>{t.cnt}</span>}
            </button>
          );
        })}
      </div>

      {/* ── SCROLLABLE CONTENT (all sections) ── */}
      <div ref={scrollRef} style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

        {/* Modals (rendered inside scroll area to avoid z-index issues) */}
        {showMRModal&&(
          <TaskMRModal task={task} prefill={mrMaterial} projectId={projectId}
            onClose={()=>{setShowMRModal(false);setMrMaterial(null);}}
            onSaved={()=>{
              setShowMRModal(false);setMrMaterial(null);
              api.get("/tasks/"+task.id+"/material-summary").then(r=>{if(r.success)setMaterials(r.data||[]);});
            }}/>
        )}
        {showGRNModal&&(
          <TaskGRNModal task={task} prefill={mrMaterial} projectId={projectId}
            onClose={()=>{setShowGRNModal(false);setMrMaterial(null);}}
            onSaved={()=>{
              setShowGRNModal(false);setMrMaterial(null);
              api.get("/tasks/"+task.id+"/material-summary").then(r=>{if(r.success)setMaterials(r.data||[]);});
              api.get("/tasks/project/"+projectId+"/inventory").then(r=>{if(r.success)setInventory(r.data||[]);});
            }}/>
        )}

        {/* ════════════ PROGRESS SECTION ════════════ */}
        <div ref={progressRef} data-section="progress" style={{padding:"16px 14px 6px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <div style={{width:3,height:18,borderRadius:2,background:"#2563EB"}}/>
            <span style={{fontSize:12,fontWeight:700,color:"#1E293B",textTransform:"uppercase",letterSpacing:".5px"}}>Progress</span>
          </div>
          <div style={{background:"white",borderRadius:12,padding:16,border:"1px solid #E2E8F0",marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontSize:14,fontWeight:600,color:"#1E293B"}}>Completion</span>
              <span style={{fontSize:26,fontWeight:800,color:prog===100?"#10B981":prog>0?"#2563EB":"#94A3B8",lineHeight:1}}>{prog}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={prog} onChange={e=>setProg(Number(e.target.value))}
              style={{width:"100%",accentColor:"#2563EB",cursor:"pointer",height:8}}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
              <span style={{fontSize:9,color:"#94A3B8"}}>0%</span>
              <span style={{fontSize:9,color:"#94A3B8"}}>50%</span>
              <span style={{fontSize:9,color:"#94A3B8"}}>100%</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:sm.bg,border:"1px solid "+sm.brd,borderRadius:10,marginBottom:12}}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={sm.c} strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
            <div>
              <div style={{fontSize:12,color:sm.c,fontWeight:700}}>Status: {autoStatus(prog)}</div>
              <div style={{fontSize:11,color:"#64748B"}}>{prog===0?"Not started yet":prog===100?"Task complete!":"In progress"}</div>
            </div>
          </div>
          {/* Quick % buttons — bigger for mobile touch */}
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[0,25,50,75,100].map(p=>(
              <button key={p} onClick={()=>setProg(p)}
                style={{flex:1,padding:"12px 0",borderRadius:9,border:"1.5px solid "+(prog===p?"#2563EB":"#E2E8F0"),background:prog===p?"#2563EB":"white",color:prog===p?"white":"#64748B",fontSize:13,fontWeight:prog===p?700:500,cursor:"pointer",transition:"all .15s"}}>
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
            style={{width:"100%",padding:"14px",borderRadius:10,background:saving?"#94A3B8":"#2563EB",color:"white",fontSize:15,fontWeight:700,border:"none",cursor:saving?"default":"pointer",letterSpacing:".2px"}}>
            {saving?"Saving...":"Save Progress"}
          </button>
        </div>

        {/* ════════════ MATERIALS SECTION ════════════ */}
        <div ref={materialsRef} data-section="materials" style={{padding:"20px 14px 6px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <div style={{width:3,height:18,borderRadius:2,background:"#059669"}}/>
            <span style={{fontSize:12,fontWeight:700,color:"#1E293B",textTransform:"uppercase",letterSpacing:".5px"}}>Materials</span>
            {materials.length>0&&<span style={{background:"#D1FAE5",color:"#065F46",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{materials.length} items</span>}
          </div>
          {/* 3 action buttons */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            <button onClick={()=>setMatTab(matTab==="usedlog"?"none":"usedlog")}
              style={{padding:"12px 6px",borderRadius:10,border:"1.5px solid "+(matTab==="usedlog"?"#16A34A":"#BBF7D0"),background:matTab==="usedlog"?"#DCFCE7":"#F0FDF4",color:"#16A34A",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 12h6M9 16h4"/></svg>
              Mark Used
            </button>
            <button onClick={()=>setShowMRModal(true)}
              style={{padding:"12px 6px",borderRadius:10,border:"1.5px solid #BFDBFE",background:"#EFF6FF",color:"#2563EB",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14"/></svg>
              New MR
            </button>
            <button onClick={()=>setShowGRNModal(true)}
              style={{padding:"12px 6px",borderRadius:10,border:"1.5px solid #A7F3D0",background:"#ECFDF5",color:"#059669",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              GRN
            </button>
          </div>
          {/* Mark Used panel */}
          {matTab==="usedlog"&&(
            <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,padding:"14px",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:"#15803D",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>Mark Material Used</span>
                <button onClick={()=>setMatTab("none")} style={{background:"none",border:"none",cursor:"pointer",color:"#94A3B8",fontSize:22,lineHeight:1,padding:0}}>×</button>
              </div>
              {invLoading&&<div style={{textAlign:"center",padding:"12px 0",color:"#94A3B8",fontSize:12}}>Loading inventory...</div>}
              {!invLoading&&inventory.filter(i=>Number(i.balance||0)>0).length>0&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10.5,color:"#64748B",fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:".4px"}}>Select from stock</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,maxHeight:180,overflowY:"auto"}}>
                    {inventory.filter(i=>Number(i.balance||0)>0).map((item,i)=>{
                      const isSel=usedLogForm.material_name===item.material_name;
                      return(
                        <div key={i} onClick={()=>setUsedLogForm(f=>({...f,material_name:item.material_name,unit:item.unit||"Nos"}))}
                          style={{padding:"10px",borderRadius:8,border:"1.5px solid "+(isSel?"#16A34A":"#BBF7D0"),background:isSel?"#DCFCE7":"white",cursor:"pointer"}}>
                          <div style={{fontSize:12,fontWeight:700,color:isSel?"#15803D":"#1E293B"}}>{item.material_name}</div>
                          <div style={{fontSize:10.5,color:"#64748B"}}>Bal: {item.balance} {item.unit}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8,marginBottom:10}}>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Material Name</label>
                  <input value={usedLogForm.material_name} onChange={e=>setUsedLogForm(f=>({...f,material_name:e.target.value}))} placeholder="e.g. Cement"
                    style={{width:"100%",padding:"9px 10px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Qty</label>
                  <input type="number" value={usedLogForm.used_qty} onChange={e=>setUsedLogForm(f=>({...f,used_qty:e.target.value}))} placeholder="0"
                    style={{width:"100%",padding:"9px 10px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Unit</label>
                  <select value={usedLogForm.unit} onChange={e=>setUsedLogForm(f=>({...f,unit:e.target.value}))}
                    style={{width:"100%",padding:"9px 10px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}>
                    {UNITS.map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Date</label>
                  <input type="date" value={usedLogForm.used_date} onChange={e=>setUsedLogForm(f=>({...f,used_date:e.target.value}))}
                    style={{width:"100%",padding:"9px 10px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
              </div>
              <input value={usedLogForm.remark} onChange={e=>setUsedLogForm(f=>({...f,remark:e.target.value}))} placeholder="Remark (optional)"
                style={{width:"100%",padding:"9px 10px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:10}}/>
              <button disabled={usedLogSaving||!usedLogForm.material_name||!usedLogForm.used_qty} onClick={async()=>{
                if(!usedLogForm.material_name||!usedLogForm.used_qty) return;
                setUsedLogSaving(true);
                const res=await api.post("/tasks/"+task.id+"/used-log",usedLogForm);
                if(res.success){
                  setUsedLog(p=>[res.data,...p]);
                  setUsedLogForm({material_name:"",used_qty:"",unit:"Nos",remark:"",used_date:new Date().toISOString().split("T")[0]});
                  setMatTab("none");
                } else alert(res.message||"Failed");
                setUsedLogSaving(false);
              }} style={{width:"100%",padding:"12px",borderRadius:8,background:usedLogSaving?"#94A3B8":"#16A34A",color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer"}}>
                {usedLogSaving?"Saving...":"✓ Log Usage"}
              </button>
            </div>
          )}
          {/* Used log recent */}
          {usedLog.length>0&&matTab!=="usedlog"&&(
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Recent Usage</div>
              {usedLog.slice(0,3).map((u,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 11px",background:"#F0FDF4",borderRadius:7,marginBottom:5,border:"1px solid #BBF7D0"}}>
                  <span style={{fontSize:12,fontWeight:600,color:"#065F46"}}>{u.material_name}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#16A34A"}}>{u.used_qty} {u.unit}</span>
                </div>
              ))}
              {usedLog.length>3&&<div style={{textAlign:"center",fontSize:11,color:"#64748B",padding:"4px 0"}}>+{usedLog.length-3} more</div>}
            </div>
          )}
          {/* Material activity list */}
          {matLoading&&<div style={{textAlign:"center",padding:"24px 0",color:"#94A3B8",fontSize:13}}>Loading materials...</div>}
          {!matLoading&&materials.length>0&&(
            <div>
              <div style={{fontSize:10,fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>Material Activity ({materials.length})</div>
              {materials.map((m,i)=>{
                const mrC=m.mat_status==="Received"||m.mat_status==="PartialReceived"?"#16A34A":m.mat_status==="Ordered"?"#D97706":m.mr_status==="Approved"?"#2563EB":"#64748B";
                const mrL=m.mat_status==="Received"?"Received":m.mat_status==="PartialReceived"?"Partial Rcvd":m.mat_status==="Ordered"?"Ordered":m.mr_status==="Approved"?"Approved":m.mr_status||"Pending";
                return(
                  <div key={i} style={{background:"white",borderRadius:9,padding:"10px 12px",border:"1px solid #E2E8F0",marginBottom:7,borderLeft:"3px solid "+mrC}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#1E293B"}}>{m.material_name}</div>
                      <span style={{fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:4,background:mrC+"22",color:mrC}}>{mrL}</span>
                    </div>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                      {m.required_qty>0&&<span style={{fontSize:11,color:"#94A3B8"}}>Req: <b style={{color:"#475569"}}>{m.required_qty} {m.unit}</b></span>}
                      {m.received_qty>0&&<span style={{fontSize:11,color:"#94A3B8"}}>Rcvd: <b style={{color:"#16A34A"}}>{m.received_qty} {m.unit}</b></span>}
                      {m.used_qty>0&&<span style={{fontSize:11,color:"#94A3B8"}}>Used: <b style={{color:"#D97706"}}>{m.used_qty} {m.unit}</b></span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!matLoading&&materials.length===0&&usedLog.length===0&&(
            <div style={{textAlign:"center",padding:"32px 0",color:"#94A3B8"}}>
              <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.5} style={{margin:"0 auto 8px",display:"block"}}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              <div style={{fontSize:13}}>No material activity yet</div>
            </div>
          )}
        </div>

        {/* ════════════ LABOUR ATTENDANCE SECTION ════════════ */}
        <div ref={labourRef} data-section="labour" style={{padding:"20px 14px 6px"}}>
          {/* ── Header ── */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:3,height:18,borderRadius:2,background:"#2563EB"}}/>
              <span style={{fontSize:12,fontWeight:700,color:"#1E293B",textTransform:"uppercase",letterSpacing:".5px"}}>Labour Attendance</span>
              {labours.length>0&&<span style={{background:"#DBEAFE",color:"#1D4ED8",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{labours.length}</span>}
            </div>
            <button onClick={()=>setShowLabForm(s=>!s)}
              style={{padding:"9px 16px",borderRadius:8,background:showLabForm?"#F1F5F9":"#2563EB",color:showLabForm?"#64748B":"white",border:"none",fontSize:13,fontWeight:600,cursor:"pointer",minHeight:40}}>
              {showLabForm?"Cancel":"+ Add"}
            </button>
          </div>

          {/* ── TYPE TABS ── */}
          <div style={{display:"flex",gap:0,background:"#F1F5F9",borderRadius:9,padding:3,marginBottom:12}}>
            {[{v:"Direct",ic:"👷",l:"Company"},{v:"Subcon",ic:"🏗",l:"Subcon"},{v:"Vendor",ic:"🏢",l:"Vendor"}].map(t=>(
              <button key={t.v} onClick={()=>{setLabType(t.v);setLabCountRows([{role:"Mason",count:0,rate:0}]);}}
                style={{flex:1,padding:"8px 6px",borderRadius:7,border:"none",background:labType===t.v?"white":"transparent",color:labType===t.v?"#2563EB":"#64748B",fontSize:12,fontWeight:labType===t.v?700:500,cursor:"pointer",transition:"all .15s",boxShadow:labType===t.v?"0 1px 4px rgba(0,0,0,.08)":"none"}}>
                {t.ic} {t.l}
              </button>
            ))}
          </div>

          {/* ── DATE NAVIGATOR ── */}
          {(()=>{
            const today=new Date(); const days=[];
            for(let i=-3;i<=3;i++){const d=new Date(today);d.setDate(today.getDate()+i);days.push(d.toISOString().split("T")[0]);}
            const fmt=(ds)=>{const d=new Date(ds+"T00:00");return {day:d.toLocaleDateString("en-IN",{weekday:"short"}),date:d.getDate()};};
            return(
              <div style={{display:"flex",gap:4,marginBottom:14,alignItems:"center"}}>
                <button onClick={()=>setLabDate(d=>{const n=new Date(d+"T00:00");n.setDate(n.getDate()-1);return n.toISOString().split("T")[0];})}
                  style={{width:28,height:28,borderRadius:6,border:"1px solid #E2E8F0",background:"white",cursor:"pointer",fontSize:12,color:"#64748B",flexShrink:0}}>◀</button>
                <div style={{flex:1,display:"flex",gap:3,overflowX:"auto"}}>
                  {days.map(d=>{const {day,date}=fmt(d);const isToday=d===new Date().toISOString().split("T")[0];const isSel=d===labDate;const hasDat=labours.some(l=>l.work_date===d);
                    return(<button key={d} onClick={()=>setLabDate(d)} style={{flex:1,minWidth:36,padding:"5px 2px",borderRadius:7,border:`1.5px solid ${isSel?"#2563EB":isToday?"#BFDBFE":"#E2E8F0"}`,background:isSel?"#2563EB":isToday?"#EFF6FF":"white",cursor:"pointer",position:"relative"}}>
                      <div style={{fontSize:9,color:isSel?"rgba(255,255,255,.7)":isToday?"#2563EB":"#94A3B8",fontWeight:600}}>{day}</div>
                      <div style={{fontSize:13,fontWeight:700,color:isSel?"white":isToday?"#2563EB":"#1E293B"}}>{date}</div>
                      {hasDat&&<div style={{width:4,height:4,borderRadius:"50%",background:isSel?"rgba(255,255,255,.6)":"#2563EB",margin:"2px auto 0"}}/>}
                    </button>);
                  })}
                </div>
                <button onClick={()=>setLabDate(d=>{const n=new Date(d+"T00:00");n.setDate(n.getDate()+1);return n.toISOString().split("T")[0];})}
                  style={{width:28,height:28,borderRadius:6,border:"1px solid #E2E8F0",background:"white",cursor:"pointer",fontSize:12,color:"#64748B",flexShrink:0}}>▶</button>
              </div>
            );
          })()}

          {/* ── COMPANY LABOUR — NAME MODE ── */}
          {labType==="Direct"&&attSett.company.mode==="name"&&(
            <div>
              {/* Day workers list */}
              {dayWorkers.length===0&&!showAddDayWorker&&(
                <div style={{textAlign:"center",padding:"20px 0",color:"#94A3B8",fontSize:12}}>
                  No workers added for this day
                </div>
              )}
              {dayWorkers.map((w,i)=>(
                <div key={i} style={{background:"white",borderRadius:10,padding:"10px 12px",border:"1px solid #E2E8F0",marginBottom:7}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:w.status==="P"?8:0}}>
                    <div style={{width:30,height:30,borderRadius:"50%",background:"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#16A34A",flexShrink:0}}>
                      {(w.name||"?")[0].toUpperCase()}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#1E293B"}}>{w.name}</div>
                      <div style={{fontSize:10,color:"#94A3B8"}}>{w.role}{w.daily_rate>0?` · ₹${w.daily_rate}/day`:""}</div>
                    </div>
                    {/* P / A / H buttons */}
                    <div style={{display:"flex",gap:4}}>
                      {[{s:"P",c:"#16A34A",bg:"#DCFCE7"},{s:"A",c:"#DC2626",bg:"#FEE2E2"},{s:"H",c:"#D97706",bg:"#FEF3C7"}].map(opt=>(
                        <button key={opt.s} onClick={()=>setDayWorkers(p=>p.map((x,j)=>j===i?{...x,status:opt.s,hours:opt.s==="H"?4:8}:x))}
                          style={{width:28,height:28,borderRadius:6,border:`1.5px solid ${w.status===opt.s?opt.c:"#E2E8F0"}`,background:w.status===opt.s?opt.bg:"white",color:w.status===opt.s?opt.c:"#94A3B8",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                          {opt.s}
                        </button>
                      ))}
                    </div>
                    <button onClick={()=>setDayWorkers(p=>p.filter((_,j)=>j!==i))}
                      style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",padding:4,fontSize:14,lineHeight:1}}>×</button>
                  </div>
                  {/* Hours + OT row — only for Present */}
                  {w.status==="P"&&(
                    <div style={{display:"flex",gap:8,paddingLeft:38}}>
                      <div style={{flex:1}}>
                        <label style={{fontSize:9,fontWeight:600,color:"#94A3B8",display:"block",marginBottom:2}}>HOURS</label>
                        <input type="number" min={1} max={24} value={w.hours}
                          onChange={e=>setDayWorkers(p=>p.map((x,j)=>j===i?{...x,hours:parseFloat(e.target.value)||8}:x))}
                          style={{width:"100%",padding:"5px 8px",borderRadius:6,border:"1px solid #E2E8F0",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                      <div style={{flex:1}}>
                        <label style={{fontSize:9,fontWeight:600,color:"#94A3B8",display:"block",marginBottom:2}}>OT HRS</label>
                        <input type="number" min={0} max={12} value={w.ot_hours}
                          onChange={e=>setDayWorkers(p=>p.map((x,j)=>j===i?{...x,ot_hours:parseFloat(e.target.value)||0}:x))}
                          style={{width:"100%",padding:"5px 8px",borderRadius:6,border:"1px solid #E2E8F0",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                      <div style={{flex:1}}>
                        <label style={{fontSize:9,fontWeight:600,color:"#94A3B8",display:"block",marginBottom:2}}>WAGE</label>
                        <div style={{padding:"5px 8px",fontSize:12,fontWeight:600,color:"#16A34A"}}>
                          ₹{((w.daily_rate||0)*(w.status==="H"?0.5:1)+((w.daily_rate||0)/8*1.5*(w.ot_hours||0))).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {/* Add worker from library */}
              {showAddDayWorker&&(
                <div style={{background:"#F8FAFC",borderRadius:10,padding:"10px",border:"1px solid #E2E8F0",marginBottom:8}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#64748B",marginBottom:6}}>Select from Library</div>
                  <div style={{maxHeight:140,overflowY:"auto"}}>
                    {compLabLib.filter(w=>!dayWorkers.some(d=>d.name===w.name)).map((w,i)=>(
                      <div key={i} onMouseDown={()=>{setDayWorkers(p=>[...p,{lib_id:w.id,name:w.name,role:w.role||"Labour",daily_rate:w.daily_rate||0,status:"P",hours:8,ot_hours:0}]);setShowAddDayWorker(false);}}
                        style={{padding:"7px 10px",borderRadius:7,cursor:"pointer",display:"flex",alignItems:"center",gap:8,marginBottom:3,background:"white",border:"1px solid #E2E8F0"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"}
                        onMouseLeave={e=>e.currentTarget.style.background="white"}>
                        <span style={{fontSize:11,fontWeight:600,color:"#1E293B"}}>{w.name}</span>
                        <span style={{fontSize:10,color:"#94A3B8"}}>{w.role}</span>
                        {w.daily_rate>0&&<span style={{marginLeft:"auto",fontSize:10,color:"#16A34A",fontWeight:600}}>₹{w.daily_rate}/day</span>}
                      </div>
                    ))}
                    {compLabLib.filter(w=>!dayWorkers.some(d=>d.name===w.name)).length===0&&(
                      <div style={{textAlign:"center",padding:"12px",color:"#94A3B8",fontSize:11}}>All library workers already added</div>
                    )}
                  </div>
                  <button onClick={()=>setShowAddDayWorker(false)} style={{marginTop:6,fontSize:11,color:"#64748B",background:"none",border:"none",cursor:"pointer"}}>✕ Close</button>
                </div>
              )}
              <div style={{display:"flex",gap:7,marginBottom:10}}>
                <button onClick={()=>setShowAddDayWorker(s=>!s)}
                  style={{flex:1,padding:"8px",borderRadius:8,border:"1.5px solid #2563EB",background:"#EFF6FF",color:"#2563EB",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                  + Add Worker
                </button>
              </div>
              {/* Day summary */}
              {dayWorkers.length>0&&(()=>{
                const present=dayWorkers.filter(w=>w.status==="P");
                const half=dayWorkers.filter(w=>w.status==="H");
                const totalWage=dayWorkers.reduce((s,w)=>{
                  if(w.status==="A") return s;
                  const base=(w.daily_rate||0)*(w.status==="H"?0.5:1);
                  const ot=(w.daily_rate||0)/8*1.5*(w.ot_hours||0);
                  return s+base+ot;
                },0);
                const totalOT=dayWorkers.reduce((s,w)=>s+(w.ot_hours||0),0);
                return(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
                    {[{l:"Present",v:present.length,c:"#16A34A"},{l:"Absent",v:dayWorkers.filter(w=>w.status==="A").length,c:"#DC2626"},{l:"Half Day",v:half.length,c:"#D97706"},{l:"OT Hours",v:totalOT+"h",c:"#2563EB"},{l:"Day Wages",v:"₹"+Math.round(totalWage).toLocaleString(),c:"#16A34A"}].slice(0,4).map(k=>(
                      <div key={k.l} style={{background:"white",borderRadius:8,padding:"8px",border:"1px solid #E2E8F0",textAlign:"center"}}>
                        <div style={{fontSize:16,fontWeight:800,color:k.c}}>{k.v}</div>
                        <div style={{fontSize:9,color:"#94A3B8",marginTop:2}}>{k.l}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {/* Save */}
              {dayWorkers.length>0&&dayWorkers.some(w=>w.status!==undefined)&&(
                <button onClick={async()=>{
                  setLabSaving(true);
                  const added=[];
                  for(const w of dayWorkers){
                    const payload={labour_type:"Direct",labour_name:w.name,role:w.role,count:1,status:w.status,hours:w.status==="H"?4:w.hours,ot_hours:w.ot_hours||0,daily_rate:w.daily_rate||0,work_date:labDate,remark:""};
                    const res=await api.post("/tasks/"+task.id+"/labour",payload);
                    if(res.success) added.push(res.data);
                  }
                  if(added.length>0){setLabours(p=>[...added,...p.filter(l=>l.work_date!==labDate||l.labour_type!=="Direct")]);setDayWorkers([]);}
                  setLabSaving(false);
                }} style={{width:"100%",padding:"11px",borderRadius:8,background:"#2563EB",color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",marginBottom:10}}>
                  {labSaving?"Saving...":"✓ Save Attendance — "+new Date(labDate+"T00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                </button>
              )}
            </div>
          )}

          {/* ── COMPANY LABOUR — COUNT MODE ── */}
          {labType==="Direct"&&attSett.company.mode==="count"&&showLabForm&&(
            <div style={{background:"white",borderRadius:10,padding:"12px",border:"1px solid #E2E8F0",marginBottom:10}}>
              {labCountRows.map((row,i)=>(
                <div key={i} style={{display:"flex",gap:7,alignItems:"center",marginBottom:7}}>
                  <select value={row.role} onChange={e=>setLabCountRows(p=>p.map((r,j)=>j===i?{...r,role:e.target.value}:r))}
                    style={{flex:2,padding:"8px",borderRadius:7,border:"1px solid #E2E8F0",fontSize:12,outline:"none"}}>
                    {ROLES.map(r=><option key={r}>{r}</option>)}
                  </select>
                  <input type="number" min={0} value={row.count} onChange={e=>setLabCountRows(p=>p.map((r,j)=>j===i?{...r,count:parseInt(e.target.value)||0}:r))}
                    style={{flex:1,padding:"8px",borderRadius:7,border:"1px solid #E2E8F0",fontSize:12,outline:"none",textAlign:"center"}} placeholder="Count"/>
                  {labCountRows.length>1&&<button onClick={()=>setLabCountRows(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",fontSize:14}}>×</button>}
                </div>
              ))}
              <button onClick={()=>setLabCountRows(p=>[...p,{role:"Labour",count:0,rate:0}])} style={{fontSize:11,color:"#2563EB",background:"none",border:"none",cursor:"pointer",fontWeight:600,marginBottom:8}}>+ Add Row</button>
              <button onClick={async()=>{
                setLabSaving(true);const added=[];
                for(const row of labCountRows){if(!row.count) continue;
                  const res=await api.post("/tasks/"+task.id+"/labour",{labour_type:"Direct",labour_name:"Company Labour",role:row.role,count:row.count,status:"P",hours:8,ot_hours:0,work_date:labDate,remark:""});
                  if(res.success) added.push(res.data);
                }
                if(added.length>0){setLabours(p=>[...added,...p]);setLabCountRows([{role:"Mason",count:0,rate:0}]);setShowLabForm(false);}
                setLabSaving(false);
              }} style={{width:"100%",padding:"10px",borderRadius:8,background:"#2563EB",color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer"}}>
                {labSaving?"Saving...":"Save Count"}
              </button>
            </div>
          )}

          {/* ── SUBCON ── */}
          {labType==="Subcon"&&showLabForm&&(
            <div style={{background:"white",borderRadius:10,padding:"12px",border:"1px solid #E2E8F0",marginBottom:10}}>
              {/* Subcon selector */}
              <div style={{marginBottom:10}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Subcontractor</label>
                <select value={labDaySubcon} onChange={e=>{setLabDaySubcon(e.target.value);setDaySubconWorkers([]);}}
                  style={{width:"100%",padding:"9px",borderRadius:7,border:"1px solid #E2E8F0",fontSize:13,outline:"none"}}>
                  <option value="">— Select Subcontractor —</option>
                  {subconLib.map((s,i)=><option key={i} value={s.name||s.firm_name||s.party_name||s}>{s.name||s.firm_name||s.party_name||s}</option>)}
                </select>
              </div>
              {/* Mode from settings */}
              {labDaySubcon&&attSett.subcon.mode==="count"&&(
                <>
                  {labCountRows.map((row,i)=>(
                    <div key={i} style={{display:"flex",gap:7,alignItems:"center",marginBottom:7}}>
                      <select value={row.role} onChange={e=>setLabCountRows(p=>p.map((r,j)=>j===i?{...r,role:e.target.value}:r))} style={{flex:2,padding:"8px",borderRadius:7,border:"1px solid #E2E8F0",fontSize:12,outline:"none"}}>{ROLES.map(r=><option key={r}>{r}</option>)}</select>
                      <input type="number" min={0} value={row.count} onChange={e=>setLabCountRows(p=>p.map((r,j)=>j===i?{...r,count:parseInt(e.target.value)||0}:r))} style={{flex:1,padding:"8px",borderRadius:7,border:"1px solid #E2E8F0",fontSize:12,outline:"none",textAlign:"center"}} placeholder="Count"/>
                      {labCountRows.length>1&&<button onClick={()=>setLabCountRows(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",fontSize:14}}>×</button>}
                    </div>
                  ))}
                  <button onClick={()=>setLabCountRows(p=>[...p,{role:"Labour",count:0,rate:0}])} style={{fontSize:11,color:"#2563EB",background:"none",border:"none",cursor:"pointer",fontWeight:600,marginBottom:8}}>+ Add Row</button>
                </>
              )}
              {labDaySubcon&&attSett.subcon.mode==="name"&&(
                <>
                  {daySubconWorkers.map((w,i)=>(
                    <div key={i} style={{background:"#F8FAFC",borderRadius:8,padding:"8px 10px",marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                      <span style={{flex:1,fontSize:12,fontWeight:600,color:"#1E293B"}}>{w.name}</span>
                      <span style={{fontSize:10,color:"#94A3B8"}}>{w.role}</span>
                      <div style={{display:"flex",gap:3}}>
                        {[{s:"P",c:"#16A34A",bg:"#DCFCE7"},{s:"A",c:"#DC2626",bg:"#FEE2E2"},{s:"H",c:"#D97706",bg:"#FEF3C7"}].map(opt=>(
                          <button key={opt.s} onClick={()=>setDaySubconWorkers(p=>p.map((x,j)=>j===i?{...x,status:opt.s}:x))}
                            style={{width:26,height:26,borderRadius:5,border:`1.5px solid ${w.status===opt.s?opt.c:"#E2E8F0"}`,background:w.status===opt.s?opt.bg:"white",color:w.status===opt.s?opt.c:"#94A3B8",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                            {opt.s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>setDaySubconWorkers(p=>[...p,{name:"Worker "+(p.length+1),role:"Labour",status:"P"}])} style={{fontSize:11,color:"#2563EB",background:"none",border:"none",cursor:"pointer",fontWeight:600,marginBottom:8}}>+ Add Worker</button>
                </>
              )}
              {labDaySubcon&&(
                <button onClick={async()=>{
                  setLabSaving(true);const added=[];
                  if(attSett.subcon.mode==="count"){
                    for(const row of labCountRows){if(!row.count) continue;
                      const res=await api.post("/tasks/"+task.id+"/labour",{labour_type:"Subcon",labour_name:labDaySubcon,vendor_name:labDaySubcon,role:row.role,count:row.count,status:"P",hours:8,ot_hours:0,work_date:labDate,remark:""});
                      if(res.success) added.push(res.data);}
                  } else {
                    for(const w of daySubconWorkers){
                      const res=await api.post("/tasks/"+task.id+"/labour",{labour_type:"Subcon",labour_name:w.name,vendor_name:labDaySubcon,role:w.role,count:1,status:w.status||"P",hours:8,ot_hours:0,work_date:labDate,remark:""});
                      if(res.success) added.push(res.data);}
                  }
                  if(added.length>0){setLabours(p=>[...added,...p]);setLabCountRows([{role:"Mason",count:0,rate:0}]);setDaySubconWorkers([]);setShowLabForm(false);}
                  setLabSaving(false);
                }} style={{width:"100%",padding:"10px",borderRadius:8,background:"#2563EB",color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer"}}>
                  {labSaving?"Saving...":"Save Subcon Attendance"}
                </button>
              )}
            </div>
          )}

          {/* ── VENDOR ── */}
          {labType==="Vendor"&&showLabForm&&(
            <div style={{background:"white",borderRadius:10,padding:"12px",border:"1px solid #E2E8F0",marginBottom:10}}>
              {/* Vendor selector */}
              <div style={{marginBottom:10}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Labour Vendor</label>
                <select value={labDayVendor} onChange={e=>setLabDayVendor(e.target.value)}
                  style={{width:"100%",padding:"9px",borderRadius:7,border:"1px solid #E2E8F0",fontSize:13,outline:"none"}}>
                  <option value="">— Select Vendor —</option>
                  {vendorLib.map((v,i)=><option key={i} value={v.name||v.vendor_name||v.party_name||v}>{v.name||v.vendor_name||v.party_name||v}</option>)}
                </select>
              </div>
              {labDayVendor&&(
                <>
                  {labCountRows.map((row,i)=>(
                    <div key={i} style={{display:"flex",gap:7,alignItems:"center",marginBottom:7}}>
                      <select value={row.role} onChange={e=>setLabCountRows(p=>p.map((r,j)=>j===i?{...r,role:e.target.value}:r))} style={{flex:2,padding:"8px",borderRadius:7,border:"1px solid #E2E8F0",fontSize:12,outline:"none"}}>{ROLES.map(r=><option key={r}>{r}</option>)}</select>
                      <input type="number" min={0} value={row.count} onChange={e=>setLabCountRows(p=>p.map((r,j)=>j===i?{...r,count:parseInt(e.target.value)||0}:r))} style={{flex:1,padding:"8px",borderRadius:7,border:"1px solid #E2E8F0",fontSize:12,outline:"none",textAlign:"center"}} placeholder="Count"/>
                      <input type="number" min={0} value={row.rate} onChange={e=>setLabCountRows(p=>p.map((r,j)=>j===i?{...r,rate:parseInt(e.target.value)||0}:r))} style={{flex:1,padding:"8px",borderRadius:7,border:"1px solid #E2E8F0",fontSize:12,outline:"none",textAlign:"center"}} placeholder="₹/day"/>
                      {labCountRows.length>1&&<button onClick={()=>setLabCountRows(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",fontSize:14}}>×</button>}
                    </div>
                  ))}
                  <button onClick={()=>setLabCountRows(p=>[...p,{role:"Labour",count:0,rate:0}])} style={{fontSize:11,color:"#2563EB",background:"none",border:"none",cursor:"pointer",fontWeight:600,marginBottom:4}}>+ Add Row</button>
                  {attSett.vendor.trackPayment&&(
                    <div style={{background:"#F0FDF4",borderRadius:8,padding:"8px 10px",marginBottom:8,fontSize:12}}>
                      <span style={{color:"#64748B"}}>Day total due: </span>
                      <span style={{fontWeight:700,color:"#16A34A"}}>₹{labCountRows.reduce((s,r)=>s+r.count*r.rate,0).toLocaleString()}</span>
                    </div>
                  )}
                  <button onClick={async()=>{
                    setLabSaving(true);const added=[];
                    for(const row of labCountRows){if(!row.count) continue;
                      const res=await api.post("/tasks/"+task.id+"/labour",{labour_type:"Vendor",labour_name:labDayVendor,vendor_name:labDayVendor,role:row.role,count:row.count,rate:row.rate||0,status:"P",hours:8,ot_hours:0,work_date:labDate,remark:""});
                      if(res.success) added.push(res.data);}
                    if(added.length>0){setLabours(p=>[...added,...p]);setLabCountRows([{role:"Mason",count:0,rate:0}]);setShowLabForm(false);}
                    setLabSaving(false);
                  }} style={{width:"100%",padding:"10px",borderRadius:8,background:"#2563EB",color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer"}}>
                    {labSaving?"Saving...":"Save Vendor Attendance"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── HISTORY ── */}
          {labLoading&&<div style={{textAlign:"center",padding:"20px 0",color:"#94A3B8",fontSize:13}}>Loading...</div>}
          {!labLoading&&labours.length>0&&(()=>{
            // Group by date
            const byDate={};
            labours.forEach(l=>{const d=l.work_date||"";if(!byDate[d])byDate[d]=[];byDate[d].push(l);});
            return(
              <div style={{marginTop:4}}>
                <div style={{fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Attendance History</div>
                {Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,entries])=>(
                  <div key={date} style={{marginBottom:10}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#64748B",marginBottom:5,display:"flex",alignItems:"center",gap:6}}>
                      <span>{new Date(date+"T00:00").toLocaleDateString("en-IN",{weekday:"short",day:"2-digit",month:"short"})}</span>
                      <span style={{background:"#F1F5F9",borderRadius:10,padding:"1px 7px",color:"#94A3B8"}}>{entries.reduce((s,l)=>s+Number(l.count||1),0)} workers</span>
                    </div>
                    {entries.map(l=>(
                      <div key={l.id} style={{background:"white",borderRadius:9,padding:"9px 12px",border:"1px solid #E2E8F0",marginBottom:5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:28,height:28,borderRadius:"50%",background:l.labour_type==="Subcon"?"#DBEAFE":l.labour_type==="Vendor"?"#F1F5F9":"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>
                            {l.labour_type==="Subcon"?"🏗":l.labour_type==="Vendor"?"🏢":"👷"}
                          </div>
                          <div>
                            <div style={{fontSize:12,fontWeight:600,color:"#1E293B"}}>{l.labour_name}</div>
                            <div style={{fontSize:10,color:"#94A3B8"}}>{l.role} · {l.count} {l.status?`· ${l.status}`:""} {l.hours?`· ${l.hours}h`:""}{l.ot_hours>0?` +${l.ot_hours}h OT`:""}</div>
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          {l.status&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:l.status==="P"?"#DCFCE7":l.status==="A"?"#FEE2E2":"#FEF3C7",color:l.status==="P"?"#16A34A":l.status==="A"?"#DC2626":"#D97706"}}>{l.status==="P"?"Present":l.status==="A"?"Absent":"Half Day"}</span>}
                          <span style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:4,background:l.labour_type==="Direct"?"#DCFCE7":l.labour_type==="Subcon"?"#DBEAFE":"#F1F5F9",color:l.labour_type==="Direct"?"#16A34A":l.labour_type==="Subcon"?"#2563EB":"#475569"}}>{l.labour_type==="Direct"?"Company":l.labour_type}</span>
                          <button onClick={async()=>{const r=await api.del("/tasks/"+task.id+"/labour/"+l.id);if(r.success)setLabours(p=>p.filter(x=>x.id!==l.id));}}
                            style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",padding:4,display:"flex"}}>
                            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
          {!labLoading&&labours.length===0&&(
            <div style={{textAlign:"center",padding:"28px 0",color:"#94A3B8",fontSize:12}}>No attendance entries yet</div>
          )}
          {false&&(
            <div>
              {/* ── Name — library searchable ── */}
              <div style={{marginBottom:12,position:"relative"}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>
                  {labForm.labour_type==="Direct"?"Worker Name *":labForm.labour_type==="Subcon"?"Subcontractor *":"Labour Vendor *"}
                </label>
                {(labForm.labour_type==="Direct"?labForm.labour_name:labForm.vendor_name) ? (
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:8,border:"1.5px solid #2563EB",background:"#DBEAFE"}}>
                    <span style={{flex:1,fontSize:13,color:"#1E40AF",fontWeight:600}}>{labForm.labour_type==="Direct"?labForm.labour_name:labForm.vendor_name}</span>
                    {labIsNew&&labForm.labour_type==="Direct"&&(
                      <span style={{fontSize:10,fontWeight:600,color:"#16A34A",background:"#DCFCE7",padding:"2px 7px",borderRadius:8,whiteSpace:"nowrap"}}>New → Library</span>
                    )}
                    <button onClick={()=>{setLabForm(p=>({...p,labour_name:"",vendor_name:""}));setLabIsNew(false);setLabSearchQ("");setShowCreateLab(false);}} style={{background:"none",border:"none",cursor:"pointer",color:"#64748B",fontSize:18,lineHeight:1,padding:0}}>×</button>
                  </div>
                ) : (
                  <>
                    <input value={labSearchQ} onChange={e=>{setLabSearchQ(e.target.value);setLabSearchOpen(true);}}
                      onFocus={()=>setLabSearchOpen(true)}
                      placeholder={labForm.labour_type==="Direct"?"Search or type worker name…":labForm.labour_type==="Subcon"?"Search subcontractor…":"Search vendor…"}
                      style={{width:"100%",padding:"10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                    {labSearchOpen&&(
                      <div style={{position:"absolute",top:"100%",left:0,right:0,background:"white",border:"1px solid #E2E8F0",borderRadius:8,zIndex:50,marginTop:2,boxShadow:"0 4px 16px rgba(0,0,0,.12)",maxHeight:160,overflowY:"auto"}}>
                        {(labForm.labour_type==="Direct"?compLabLib:labForm.labour_type==="Subcon"?subconLib:vendorLib)
                          .filter(item=>{const n=item.name||item.vendor_name||item.party_name||"";return !labSearchQ||n.toLowerCase().includes(labSearchQ.toLowerCase());})
                          .map((item,i)=>{
                            const n=item.name||item.vendor_name||item.party_name||"";
                            return(
                              <div key={i} onMouseDown={()=>{setLabForm(p=>labForm.labour_type==="Direct"?{...p,labour_name:n}:{...p,vendor_name:n});setLabIsNew(false);setLabSearchQ("");setLabSearchOpen(false);setShowCreateLab(false);}}
                                style={{padding:"9px 12px",fontSize:13,color:"#1E293B",cursor:"pointer",borderBottom:"0.5px solid #F1F5F9"}}
                                onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"}
                                onMouseLeave={e=>e.currentTarget.style.background="white"}>
                                {n}
                              </div>
                            );
                          })}
                        <div onMouseDown={()=>{setShowCreateLab(true);setLabSearchOpen(false);setNewLabName(labSearchQ);}}
                          style={{padding:"9px 12px",fontSize:12,color:"#2563EB",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,borderTop:"1px solid #E2E8F0"}}
                          onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"}
                          onMouseLeave={e=>e.currentTarget.style.background="white"}>
                          <span style={{fontSize:16,lineHeight:1}}>+</span> Create new {labForm.labour_type==="Direct"?"worker":labForm.labour_type==="Subcon"?"subcontractor":"vendor"}…
                        </div>
                      </div>
                    )}
                    {showCreateLab&&(
                      <div style={{marginTop:6,display:"flex",gap:6}}>
                        <input value={newLabName} onChange={e=>setNewLabName(e.target.value)} autoFocus
                          placeholder="Enter name..."
                          style={{flex:1,padding:"9px",borderRadius:8,border:"1.5px solid #2563EB",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
                        <button onClick={()=>{
                          if(!newLabName.trim()) return;
                          const n=newLabName.trim();
                          setLabForm(p=>labForm.labour_type==="Direct"?{...p,labour_name:n}:{...p,vendor_name:n});
                          setLabIsNew(true);
                          setShowCreateLab(false);setNewLabName("");
                        }} style={{padding:"9px 14px",borderRadius:8,background:"#2563EB",color:"white",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}>Add</button>
                        <button onClick={()=>{setShowCreateLab(false);setNewLabName("");}} style={{padding:"9px 12px",borderRadius:8,background:"#F1F5F9",color:"#64748B",border:"none",fontSize:12,cursor:"pointer"}}>✕</button>
                      </div>
                    )}
                  </>
                )}
              </div>
              {/* ── Skill-wise Count rows ── */}
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase"}}>Skill-wise Count</label>
                  <button onClick={()=>setLabSkillRows(p=>[...p,{role:"Labour",count:1}])}
                    style={{padding:"3px 10px",borderRadius:6,background:"#EFF6FF",color:"#2563EB",border:"1px solid #BFDBFE",fontSize:11,fontWeight:600,cursor:"pointer"}}>+ Add Row</button>
                </div>
                {labSkillRows.map((row,i)=>(
                  <div key={i} style={{display:"flex",gap:7,alignItems:"center",marginBottom:6}}>
                    <select value={row.role} onChange={e=>setLabSkillRows(p=>p.map((r,j)=>j===i?{...r,role:e.target.value}:r))}
                      style={{flex:2,padding:"9px 8px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:12,outline:"none",fontFamily:"inherit"}}>
                      {ROLES.map(r=><option key={r}>{r}</option>)}
                    </select>
                    <input type="number" min={1} value={row.count} onChange={e=>setLabSkillRows(p=>p.map((r,j)=>j===i?{...r,count:parseInt(e.target.value)||1}:r))}
                      style={{flex:1,padding:"9px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",textAlign:"center"}}/>
                    <span style={{fontSize:10,color:"#94A3B8",minWidth:18,flexShrink:0}}>nos</span>
                    {labSkillRows.length>1&&(
                      <button onClick={()=>setLabSkillRows(p=>p.filter((_,j)=>j!==i))}
                        style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",padding:4,display:"flex",flexShrink:0}}>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                  </div>
                ))}
                <div style={{fontSize:10,color:"#94A3B8",marginTop:2}}>
                  Total: {labSkillRows.reduce((s,r)=>s+r.count,0)} workers
                </div>
              </div>
              {/* ── Date / Hours / Remark ── */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Date</label>
                  <input type="date" value={labForm.work_date} onChange={e=>setLabForm(p=>({...p,work_date:e.target.value}))}
                    style={{width:"100%",padding:"10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Hours/Day</label>
                  <input type="number" min={1} max={24} value={labForm.hours} onChange={e=>setLabForm(p=>({...p,hours:parseFloat(e.target.value)||8}))}
                    style={{width:"100%",padding:"10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Remark</label>
                  <input value={labForm.remark} onChange={e=>setLabForm(p=>({...p,remark:e.target.value}))} placeholder="Optional"
                    style={{width:"100%",padding:"10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
              </div>
              {/* ── Submit ── */}
              <button onClick={async()=>{
                const name=labForm.labour_type==="Direct"?labForm.labour_name:labForm.vendor_name;
                if(!name.trim()) return alert(labForm.labour_type==="Direct"?"Worker name required":"Name required");
                // ── Auto-save new Company Labour worker to Library ──
                if(labIsNew && labForm.labour_type==="Direct"){
                  const primaryRole=labSkillRows[0]?.role||"Labour";
                  const libRes=await api.post("/library/workers",{name,role:primaryRole,category:{Mason:"Skilled",Electrician:"Skilled",Plumber:"Skilled",Carpenter:"Skilled",Welder:"Skilled","Tile Fixer":"Skilled","Bar Bender":"Skilled",Shuttering:"Skilled",Polisher:"Skilled",Painter:"Semi-Skilled",Supervisor:"Supervisor",Labour:"Unskilled",Helper:"Unskilled",Other:"Semi-Skilled"}[primaryRole]||"Unskilled",daily_rate:0,status:"Active"});
                  if(libRes.success) setCompLabLib(p=>[libRes.data,...p]);
                }
                // ── Save labour entries (one per skill row) ──
                const added=[];
                for(const row of labSkillRows){
                  const payload={...labForm,labour_name:name,role:row.role,count:row.count};
                  const res=await api.post("/tasks/"+task.id+"/labour",payload);
                  if(res.success) added.push(res.data);
                }
                if(added.length>0){
                  setLabours(p=>[...added,...p]);
                  setLabForm({labour_type:"Direct",labour_name:"",vendor_name:"",work_date:new Date().toISOString().split("T")[0],hours:8,remark:""});
                  setLabSkillRows([{role:"Mason",count:1}]);
                  setLabSearchQ("");setShowCreateLab(false);setNewLabName("");setLabIsNew(false);setShowLabForm(false);
                } else alert("Failed to save");
              }} style={{width:"100%",padding:"13px",borderRadius:9,background:"#2563EB",color:"white",fontSize:14,fontWeight:700,border:"none",cursor:"pointer"}}>
                + Add Labour Entry
              </button>
            </div>
          )}
          {labLoading&&<div style={{textAlign:"center",padding:"24px 0",color:"#94A3B8",fontSize:13}}>Loading...</div>}
          {!labLoading&&labours.length===0&&!showLabForm&&<div style={{textAlign:"center",padding:"32px 0",color:"#94A3B8",fontSize:13}}>No labour entries yet</div>}
          {labours.map(l=>(
            <div key={l.id} style={{background:"white",borderRadius:10,padding:"12px 14px",border:"1px solid #E2E8F0",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:l.labour_type==="Subcon"?"#DBEAFE":l.labour_type==="Vendor"?"#F1F5F9":"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
                    {l.labour_type==="Subcon"?"🏗":l.labour_type==="Vendor"?"🏢":"👷"}
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#1E293B"}}>{l.labour_name}</div>
                    <div style={{fontSize:11,color:"#64748B"}}>{l.role} · {l.count} workers · {l.hours}h/day</div>
                  </div>
                  <span style={{marginLeft:"auto",fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:4,background:l.labour_type==="Direct"?"#DCFCE7":l.labour_type==="Subcon"?"#DBEAFE":"#F1F5F9",color:l.labour_type==="Direct"?"#16A34A":l.labour_type==="Subcon"?"#2563EB":"#475569"}}>{l.labour_type==="Direct"?"Company Labour":l.labour_type||"Company Labour"}</span>
                </div>
                <div style={{fontSize:10.5,color:"#94A3B8",paddingLeft:40}}>{fmtDate(l.work_date)}{l.remark?" · "+l.remark:""}</div>
              </div>
              <button onClick={async()=>{const r=await api.del("/tasks/"+task.id+"/labour/"+l.id);if(r.success)setLabours(p=>p.filter(x=>x.id!==l.id));}}
                style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",padding:8,display:"flex",flexShrink:0}}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          ))}
        </div>

        {/* ════════════ PHOTOS SECTION ════════════ */}
        <div ref={photosRef} data-section="photos" style={{padding:"20px 14px 6px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:3,height:18,borderRadius:2,background:"#EA580C"}}/>
              <span style={{fontSize:12,fontWeight:700,color:"#1E293B",textTransform:"uppercase",letterSpacing:".5px"}}>Photos</span>
              {photos.length>0&&<span style={{background:"#FEF3C7",color:"#92400E",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{photos.length}</span>}
            </div>
            <label style={{padding:"9px 16px",borderRadius:8,background:uploading?"#94A3B8":"#EA580C",color:"white",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,minHeight:40,boxSizing:"border-box"}}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx={12} cy={13} r={4}/></svg>
              {uploading?"Uploading...":"📷 Add Photo"}
              <input type="file" accept="image/*" capture="environment" style={{display:"none"}} disabled={uploading} onChange={async(e)=>{
                const file=e.target.files[0]; if(!file) return;
                setUploading(true);
                let lat=null,lng=null;
                if(navigator.geolocation){
                  await new Promise(resolve=>navigator.geolocation.getCurrentPosition(p=>{lat=p.coords.latitude;lng=p.coords.longitude;resolve();},resolve,{timeout:5000}));
                }
                try{
                  const cd=await uploadToCloudinary(file,"site_photos");
                  const res=await api.post("/tasks/"+task.id+"/photos",{photo_url:cd.secure_url,caption:"",lat,lng});
                  if(res.success) setPhotos(p=>[res.data,...p]);
                }catch(e){alert("Upload failed");}
                setUploading(false);e.target.value="";
              }}/>
            </label>
          </div>
          {phLoading&&<div style={{textAlign:"center",padding:"24px 0",color:"#94A3B8",fontSize:13}}>Loading photos...</div>}
          {!phLoading&&photos.length===0&&(
            <div style={{textAlign:"center",padding:"40px 0",color:"#94A3B8"}}>
              <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.5} style={{marginBottom:8}}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx={12} cy={13} r={4}/></svg>
              <div style={{fontSize:13}}>No photos yet</div>
              <div style={{fontSize:11,marginTop:4,color:"#CBD5E1"}}>Tap "Add Photo" to upload</div>
            </div>
          )}
          {!phLoading&&photos.length>0&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {photos.map(p=>(
                <div key={p.id} style={{borderRadius:12,overflow:"hidden",border:"1px solid #E2E8F0",background:"white",cursor:"zoom-in"}} onClick={()=>setFullPhoto(p)}>
                  <div style={{position:"relative"}}>
                    <img src={p.photo_url} alt="site" style={{width:"100%",height:130,objectFit:"cover",display:"block"}}/>
                    {(p.lat||p.lng)&&<div style={{position:"absolute",bottom:5,left:5,background:"rgba(0,0,0,.6)",borderRadius:10,padding:"2px 8px",display:"flex",alignItems:"center",gap:3}}>
                      <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx={12} cy={10} r={3}/></svg>
                      <span style={{fontSize:8,color:"white",fontWeight:600}}>GPS</span>
                    </div>}
                  </div>
                  <div style={{padding:"7px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:10.5,color:"#94A3B8"}}>{new Date(p.created_at).toLocaleDateString("en-IN")}</span>
                    <button onClick={async e=>{e.stopPropagation();if(await window.confirmAsync("Delete photo?")){const r=await api.del("/tasks/"+task.id+"/photos/"+p.id);if(r.success)setPhotos(prev=>prev.filter(x=>x.id!==p.id));}}}
                      style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",padding:4,display:"flex"}}>
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ════════════ ISSUES SECTION ════════════ */}
        <div ref={issuesRef} data-section="issues" style={{padding:"20px 14px 20px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:3,height:18,borderRadius:2,background:"#DC2626"}}/>
              <span style={{fontSize:12,fontWeight:700,color:"#1E293B",textTransform:"uppercase",letterSpacing:".5px"}}>Issues</span>
              {issues.length>0&&<span style={{background:"#FEE2E2",color:"#DC2626",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{issues.filter(i=>i.status==="Open"||i.status==="In Progress").length} open</span>}
            </div>
            <button onClick={()=>setShowIssueForm(s=>!s)}
              style={{padding:"9px 16px",borderRadius:8,background:showIssueForm?"#F1F5F9":"#DC2626",color:showIssueForm?"#64748B":"white",border:"none",fontSize:13,fontWeight:600,cursor:"pointer",minHeight:40}}>
              {showIssueForm?"Cancel":"+ Issue"}
            </button>
          </div>
          {showIssueForm&&(
            <div style={{background:"white",borderRadius:12,padding:"16px",border:"1.5px solid #FECACA",marginBottom:12}}>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Title *</label>
                <input value={issueForm.title} onChange={e=>setIssueForm(p=>({...p,title:e.target.value}))} placeholder="Describe the issue"
                  style={{width:"100%",padding:"10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Description</label>
                <textarea value={issueForm.description} onChange={e=>setIssueForm(p=>({...p,description:e.target.value}))} rows={2} placeholder="More details..."
                  style={{width:"100%",padding:"10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none"}}/>
              </div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:6,textTransform:"uppercase"}}>Priority</label>
                <div style={{display:"flex",gap:6}}>
                  {PRIORITIES.map(p=>(
                    <button key={p} onClick={()=>setIssueForm(prev=>({...prev,priority:p}))}
                      style={{flex:1,padding:"8px",borderRadius:7,border:"1.5px solid "+(issueForm.priority===p?priC[p].c:"#E2E8F0"),background:issueForm.priority===p?priC[p].bg:"white",color:issueForm.priority===p?priC[p].c:"#64748B",fontSize:11,fontWeight:issueForm.priority===p?700:400,cursor:"pointer"}}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Assign To</label>
                  <SearchSelect value={issueForm.assigned_to} options={issueTeam}
                    onChange={v=>setIssueForm(p=>({...p,assigned_to:v}))} placeholder="-- Select --"/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Category</label>
                  <SearchSelect value={issueForm.work_category} options={issueWorkCats}
                    onChange={v=>setIssueForm(p=>({...p,work_category:v}))} placeholder="-- Select --"/>
                </div>
              </div>
              {/* Photo upload */}
              <label style={{display:"flex",alignItems:"center",gap:7,padding:"9px 14px",borderRadius:8,border:"1.5px dashed #E2E8F0",cursor:"pointer",marginBottom:12,color:"#64748B",fontSize:12,fontWeight:500}}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth={2}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx={12} cy={13} r={4}/></svg>
                {issueUploading?"Uploading...":"Attach a photo (optional)"}
                <input type="file" accept="image/*" style={{display:"none"}} disabled={issueUploading} onChange={async(e)=>{
                  const file=e.target.files[0]; if(!file) return;
                  setIssueUploading(true);
                  try{const cd=await uploadToCloudinary(file,"issue_photos");setIssueForm(p=>({...p,photo_url:cd.secure_url}));}catch{alert("Upload failed");}
                  setIssueUploading(false);e.target.value="";
                }}/>
              </label>
              {issueForm.photo_url&&<img src={issueForm.photo_url} style={{width:"100%",borderRadius:8,marginBottom:12,maxHeight:160,objectFit:"cover"}}/>}
              <button onClick={async()=>{
                if(!issueForm.title.trim()) return alert("Title required");
                const res=await api.post("/tasks/"+task.id+"/issues",issueForm);
                if(res.success){setIssues(p=>[res.data,...p]);setIssueForm({title:"",description:"",priority:"Medium",assigned_to:"",work_category:""});setShowIssueForm(false);}
                else alert(res.message||"Failed");
              }} style={{width:"100%",padding:"13px",borderRadius:9,background:"#DC2626",color:"white",fontSize:14,fontWeight:700,border:"none",cursor:"pointer"}}>
                + Create Issue
              </button>
            </div>
          )}
          {issLoading&&<div style={{textAlign:"center",padding:"24px 0",color:"#94A3B8",fontSize:13}}>Loading issues...</div>}
          {!issLoading&&issues.length===0&&!showIssueForm&&(
            <div style={{textAlign:"center",padding:"32px 0",color:"#94A3B8"}}>
              <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.5} style={{marginBottom:8}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
              <div style={{fontSize:13}}>No issues logged</div>
            </div>
          )}
          {issues.map(issue=>{
            const pc=priC[issue.priority]||priC["Medium"];
            const ic=issC[issue.status]||issC["Open"];
            const isExp=expandedIssue===issue.id;
            return(
              <div key={issue.id} style={{background:"white",borderRadius:10,border:"1px solid #E2E8F0",marginBottom:8,overflow:"hidden",borderLeft:"3px solid "+ic.c}}>
                <div style={{padding:"12px 13px",cursor:"pointer"}} onClick={()=>setExpandedIssue(isExp?null:issue.id)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1,marginRight:8}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#1E293B",marginBottom:3}}>{issue.title}</div>
                      {issue.description&&!isExp&&<div style={{fontSize:11,color:"#64748B",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{issue.description}</div>}
                      {!isExp&&(issue.assigned_to||issue.work_category)&&(
                        <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
                          {issue.assigned_to&&<span style={{fontSize:10,color:"#2563EB",background:"#DBEAFE",borderRadius:4,padding:"2px 7px",fontWeight:600}}>👤 {issue.assigned_to}</span>}
                          {issue.work_category&&<span style={{fontSize:10,color:"#7C3AED",background:"#EDE9FE",borderRadius:4,padding:"2px 7px",fontWeight:600}}>🔧 {issue.work_category}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
                      {issue.photo_url&&!isExp&&<img src={issue.photo_url} style={{width:38,height:38,borderRadius:6,objectFit:"cover",border:"1px solid #E2E8F0"}} onClick={e=>{e.stopPropagation();setFullPhoto({photo_url:issue.photo_url,created_at:issue.created_at});}}/>}
                      <span style={{background:pc.bg,color:pc.c,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4}}>{issue.priority}</span>
                      <span style={{background:ic.bg,color:ic.c,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4}}>{issue.status}</span>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2}><path d={isExp?"M18 15l-6-6-6 6":"M6 9l6 6 6-6"}/></svg>
                    </div>
                  </div>
                </div>
                {isExp&&(
                  <div style={{padding:"0 13px 14px",borderTop:"1px solid #F1F5F9"}}>
                    {issue.description&&<div style={{fontSize:12,color:"#475569",lineHeight:1.5,marginBottom:9,marginTop:9}}>{issue.description}</div>}
                    {(issue.assigned_to||issue.work_category)&&(
                      <div style={{display:"flex",gap:6,marginBottom:9,flexWrap:"wrap"}}>
                        {issue.assigned_to&&<span style={{fontSize:11,color:"#2563EB",background:"#DBEAFE",borderRadius:4,padding:"3px 9px",fontWeight:600}}>👤 {issue.assigned_to}</span>}
                        {issue.work_category&&<span style={{fontSize:11,color:"#7C3AED",background:"#EDE9FE",borderRadius:4,padding:"3px 9px",fontWeight:600}}>🔧 {issue.work_category}</span>}
                      </div>
                    )}
                    {issue.photo_url&&<img src={issue.photo_url} style={{width:"100%",borderRadius:8,marginBottom:10,cursor:"zoom-in",maxHeight:180,objectFit:"cover"}} onClick={()=>setFullPhoto({photo_url:issue.photo_url})}/>}
                    <TaskIssueChat issueId={issue.id}/>
                    <div style={{marginBottom:9}}>
                      <div style={{fontSize:10,fontWeight:600,color:"#94A3B8",marginBottom:6,textTransform:"uppercase",letterSpacing:".4px"}}>Change Status</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {ISSUE_STATUS.map(s=>(
                          <button key={s} onClick={async()=>{const r=await api.put("/tasks/"+task.id+"/issues/"+issue.id,{status:s});if(r.success)setIssues(p=>p.map(x=>x.id===issue.id?{...x,status:s}:x));}}
                            style={{padding:"6px 12px",borderRadius:20,border:"1.5px solid "+(issue.status===s?issC[s].c:"#E2E8F0"),background:issue.status===s?issC[s].bg:"white",color:issue.status===s?issC[s].c:"#64748B",fontSize:11,fontWeight:issue.status===s?700:400,cursor:"pointer"}}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={async()=>{if(await window.confirmAsync("Delete issue?")){const r=await api.del("/tasks/"+task.id+"/issues/"+issue.id);if(r.success){setIssues(p=>p.filter(x=>x.id!==issue.id));setExpandedIssue(null);}}}}
                      style={{fontSize:11,color:"#EF4444",background:"none",border:"none",cursor:"pointer",padding:0}}>Delete Issue</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>{/* end scrollable body */}

      {/* ── COMMENTS — Fixed at bottom ── */}
      <div style={{borderTop:"1px solid #E2E8F0",background:"white",flexShrink:0}}>
        {comments.length>0&&(
          <div style={{maxHeight:110,overflowY:"auto",padding:"8px 14px 4px"}}>
            {comments.slice(-20).map(c=>(
              <div key={c.id} style={{display:"flex",gap:8,marginBottom:7}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,#2563EB,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:10,fontWeight:700,flexShrink:0}}>
                  {(c.user_name||"?").charAt(0)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{fontSize:11,fontWeight:600,color:"#1E293B"}}>{c.user_name||"User"} </span>
                  <span style={{fontSize:10,color:"#94A3B8"}}>{new Date(c.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>
                  <div style={{fontSize:12.5,color:"#334155",marginTop:1,lineHeight:1.4}}>{c.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:8,padding:"8px 12px 10px",alignItems:"center"}}>
          <input value={commentText} onChange={e=>setCommentText(e.target.value)}
            placeholder="Add a comment..."
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendComment();}}}
            style={{flex:1,padding:"10px 14px",borderRadius:22,border:"1.5px solid #E2E8F0",fontSize:13,color:"#1E293B",background:"#F8FAFC",outline:"none",fontFamily:"inherit"}}
            onFocus={e=>e.target.style.borderColor="#3B82F6"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
          <button onClick={sendComment} disabled={sendingComment||!commentText.trim()}
            style={{width:40,height:40,borderRadius:"50%",background:commentText.trim()?"#2563EB":"#E2E8F0",border:"none",cursor:commentText.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
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
  const TEAM_PT=[];
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
              {f.type==="select"
                ?<SearchSelect value={form[f.k]} options={f.opts} onChange={v=>setForm(p=>({...p,[f.k]:v}))} placeholder={`Select ${f.l.toLowerCase()}...`}/>
                :<input value={form[f.k]} onChange={upd(f.k)} placeholder={f.ph} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>}
            </div>
          ))}
        </div>
        {/* Assignee + Status */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
          {[{l:"Assigned To",k:"assignee",opts:TEAM_PT},{l:"Status",k:"status",opts:["Not Started","Ongoing","Hold","Completed"]}].map(f=>(
            <div key={f.k}><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{f.l}</label>
              <SearchSelect value={form[f.k]} options={f.opts} onChange={v=>setForm(p=>({...p,[f.k]:v}))} placeholder={`Select ${f.l.toLowerCase()}...`}/>
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
  const [form,setForm]=useState({name:"",category:"Civil",tag:"",assignee:"",baseStart:"",baseEnd:"",dependencies:[],dhyanRakhen:""});
  const [showDhyan,setShowDhyan]=useState(false);
  const [depSrch,setDepSrch]=useState("");
  const upd=(k)=>(e)=>setForm(p=>({...p,[k]:e.target.value}));
  const toggleDep=(id)=>setForm(p=>({...p,dependencies:p.dependencies.includes(id)?p.dependencies.filter(x=>x!==id):[...p.dependencies,id]}));
  const filteredForDep=allTasks.filter(t=>!depSrch||t.name.toLowerCase().includes(depSrch.toLowerCase())||t.no.includes(depSrch));
  const TEAM_PT=[];
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
function TabAttendance({ project }) {
  const projectId = project?.id || 1;

  // ── Settings from localStorage ──────────────────────────────────
  const [attSett] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("gb_att_settings") || "{}");
      return {
        company: { mode: "name", paymentCycle: "monthly", ...(s.company || {}) },
        subcon:  { mode: "count", ...(s.subcon || {}) },
        vendor:  { mode: "count", trackPayment: true, useRateCard: true, ...(s.vendor || {}) },
      };
    } catch {
      return { company: { mode:"name", paymentCycle:"monthly" }, subcon: { mode:"count" }, vendor: { mode:"count", trackPayment:true, useRateCard:true } };
    }
  });

  // ── Core state ──────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split("T")[0];
  const [labType,      setLabType]      = useState("company"); // company | subcon | vendor
  const [attDate,      setAttDate]      = useState(todayStr);
  const [showWfPanel,  setShowWfPanel]  = useState(false); // collapsed by default — focus on attendance
  const [showHistory,  setShowHistory]  = useState(false);
  const [editingAtt,   setEditingAtt]   = useState(false);
  const [attSaving,    setAttSaving]    = useState(false);
  // Subcon selector (direct from library, no registration needed)
  const [selSubconId,  setSelSubconId]  = useState("");
  // Vendor selector (direct from library, like subcon)
  const [selVendorId,  setSelVendorId]  = useState("");
  // Subcon skills (per-subcon skill catalog)
  const [subconSkills, setSubconSkills] = useState([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [skillSaving, setSkillSaving] = useState(false);
  // Skills picker drawer (used for both subcon AND vendor)
  const [showSkillDrawer, setShowSkillDrawer] = useState(false);
  const [drawerMode, setDrawerMode] = useState("subcon"); // 'subcon' | 'vendor'
  const [drawerSelected, setDrawerSelected] = useState(new Set());
  const [drawerSearch, setDrawerSearch] = useState("");
  const [drawerNewSkill, setDrawerNewSkill] = useState("");
  // History expand state
  const [expandedHistIdx, setExpandedHistIdx] = useState(null);
  // Add/Edit Labour Vendor modal state
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vForm, setVForm] = useState({ name:"", owner:"", phone:"", email:"", city:"", gstin:"", trade:"", notes:"" });
  const [vSkills, setVSkills] = useState([]);  // [{skill, rate, card_rate}]
  const [vSaving, setVSaving] = useState(false);

  // ── Libraries ───────────────────────────────────────────────────
  const [workerLib, setWorkerLib] = useState([]);
  const [subconLib, setSubconLib] = useState([]);
  const [vendorLib, setVendorLib] = useState([]);
  const [rateCard,  setRateCard]  = useState([]);

  // ── Project workforce ────────────────────────────────────────────
  const [workforce, setWorkforce] = useState({ company:[], subcon:[], vendor:[] });
  const [wfLoading, setWfLoading] = useState(false);

  // ── Attendance records ───────────────────────────────────────────
  const [attRecs,   setAttRecs]   = useState([]);

  // ── Name-wise attendance rows ────────────────────────────────────
  const [todayEntries,   setTodayEntries]   = useState([]);
  // ── Count-wise rows ─────────────────────────────────────────────
  const [todayCountRows, setTodayCountRows] = useState([]);
  // ── Worker search (filter rows by name/role) ────────────────────
  const [workerSearch,   setWorkerSearch]   = useState("");

  // ── Add workforce modal ──────────────────────────────────────────
  const [showAddWf,      setShowAddWf]      = useState(false);
  const [libSearch,      setLibSearch]      = useState("");
  const [selectedLibIds, setSelectedLibIds] = useState(new Set()); // multi-select checklist
  const [showNewWf,      setShowNewWf]      = useState(false);     // inline new worker form
  const [wfForm,         setWfForm]         = useState({ name:"", role:"Labour", category:"Unskilled", dailyRate:"", phone:"", city:"" });
  const [wfSaving,       setWfSaving]       = useState(false);

  // ── Rate change approval modal ───────────────────────────────────
  const [showRateModal,  setShowRateModal]  = useState(false);
  const [rateReqWorker,  setRateReqWorker]  = useState(null);
  const [newRateVal,     setNewRateVal]     = useState("");
  const [rateReason,     setRateReason]     = useState("");
  const [rateSaving,     setRateSaving]     = useState(false);

  const ROLES = ["Labour","Mason","Helper","Electrician","Plumber","Carpenter","Painter","Supervisor","Welder","Tile Fixer","Polisher","Bar Bender","Shuttering","Other"];
  const TYPE_LABELS = { company:"Company Labour", subcon:"Subcontractor", vendor:"Labour Vendor" };
  const TYPE_COLORS = { company:T.blu, subcon:T.grn, vendor:T.amb };
  const TYPE_BG     = { company:T.bluL, subcon:T.grnL, vendor:T.ambL };
  const TYPE_BM     = { company:T.bluM, subcon:T.grnM, vendor:T.ambM };

  // ── Load libraries + rate card on mount ─────────────────────────
  useEffect(() => {
    api.get("/library/workers").then(r=>{ if(r.success) setWorkerLib(r.data||[]); }).catch(()=>{});
    api.get("/finance/parties?type=Subcontractor").then(r=>{ if(r.success) setSubconLib(r.data||[]); }).catch(()=>{});
    api.get("/labour-vendors").then(r=>{ if(r.success) setVendorLib(r.data||[]); }).catch(()=>{});
    api.get("/library/labour-rates").then(r=>{ if(r.success) setRateCard(r.data||[]); }).catch(()=>{});
  }, []);

  // ── Load workforce + attendance for project ──────────────────────
  useEffect(() => {
    if(!projectId) return;
    setWfLoading(true);
    api.get(`/projects/${projectId}/workforce`).then(r => {
      if(r.success && r.data) {
        const d = r.data;
        setWorkforce({
          company: Array.isArray(d) ? d.filter(w=>w.type==="company") : (d.company||[]),
          subcon:  Array.isArray(d) ? d.filter(w=>w.type==="subcon")  : (d.subcon||[]),
          vendor:  Array.isArray(d) ? d.filter(w=>w.type==="vendor")  : (d.vendor||[]),
        });
      }
    }).catch(()=>{}).finally(()=>setWfLoading(false));
    api.get(`/projects/${projectId}/attendance`).then(r => {
      if(r.success) setAttRecs(r.data||[]);
    }).catch(()=>{});
  }, [projectId]);

  // ── Prep today's entry rows whenever type/date/workforce/subcon changes ─
  const mode = attSett[labType]?.mode || (labType==="company"?"name":"count");
  useEffect(() => {
    const workers = workforce[labType] || [];
    // For subcon/vendor: match by date + type + selected id so each entity has independent rows
    const existing = labType==="subcon"
      ? (()=>{
          const sc = subconLib.find(s=>String(s.id||s.name)===selSubconId);
          const sName = sc?.name || sc?.company_name;
          return attRecs.find(r=>{
            if (String(r.date||"").split("T")[0] !== attDate || r.type !== labType) return false;
            if (r.subcon_id && sc?.id && String(r.subcon_id) === String(sc.id)) return true;
            if (r.subcon_name && sName && r.subcon_name === sName) return true;
            return false;
          });
        })()
      : labType==="vendor"
        ? (()=>{
            const vd = vendorLib.find(v=>String(v.id||v.name)===selVendorId);
            const vName = vd?.name || vd?.company_name;
            return attRecs.find(r=>{
              if (String(r.date||"").split("T")[0] !== attDate || r.type !== labType) return false;
              if (r.vendor_id && vd?.id && String(r.vendor_id) === String(vd.id)) return true;
              if (r.vendor_name && vName && r.vendor_name === vName) return true;
              return false;
            });
          })()
        : attRecs.find(r=>String(r.date||"").split("T")[0]===attDate && r.type===labType);
    if(mode==="name") {
      setTodayEntries(workers.map(w => {
        const found = existing?.entries?.find(e=>e.worker_id===w.id||e.name===w.name);
        // Default status = "" (unmarked) — user clicks P/A/H to mark each worker
        return { worker_id:w.id, name:w.name, role:w.role, dailyRate:w.dailyRate||w.daily_rate||0,
                 status:found?.status||"", hours:found?.hours??(found?.status==="A"?0:found?.status==="H"?4:8),
                 ot:found?.ot||0, remark:found?.remark||"", rateStatus:w.rateStatus||"card" };
      }));
    } else {
      // For subcon: pre-fill from subcon's skill catalog (count-only, no rate)
      if(labType==="subcon" && selSubconId) {
        if(subconSkills.length) {
          const rows = subconSkills.map(s => {
            const found = existing?.entries?.find(e => e.role === s.skill);
            return { role: s.skill, present: found?.present || 0, count: found?.count || 0, rate: 0 };
          });
          setTodayCountRows(rows);
        } else {
          setTodayCountRows([]);
        }
      }
      // For vendor: pre-fill from selected vendor's skill list (vendor-specific rates)
      else if(labType==="vendor" && selVendorId) {
        const vd = vendorLib.find(v => String(v.id||v.name) === selVendorId);
        const vendorSkills = vd?.skills || [];
        if(vendorSkills.length) {
          const rows = vendorSkills.map(s => {
            const found = existing?.entries?.find(e => e.role === s.skill);
            return {
              role: s.skill, present: found?.present || 0, count: found?.count || 0,
              rate: Number(s.rate) || 0,
              rate_status: s.rate_status || "card",
              skill_id: s.id,
            };
          });
          setTodayCountRows(rows);
        } else {
          setTodayCountRows([{ role:"Labour", count:0, present:0, rate:0, rate_status:"card" }]);
        }
      } else if(existing?.entries?.length) {
        setTodayCountRows(existing.entries);
      } else {
        setTodayCountRows([{ role:"Labour", count:0, present:0, rate: 0 }]);
      }
    }
    setEditingAtt(false);
  }, [labType, attDate, workforce, attRecs, selSubconId, selVendorId, rateCard, subconSkills]);

  // ── Reset attendance rows immediately when subcon selection changes ─
  useEffect(() => {
    if(labType!=="subcon") return;
    setEditingAtt(false);
    // Fetch subcon's skills catalog
    if(selSubconId) {
      api.get("/labour-vendors/subcon-skills/"+selSubconId)
        .then(r=>{ if(r.success) setSubconSkills(r.data||[]); })
        .catch(()=>setSubconSkills([]));
    } else {
      setSubconSkills([]);
    }
  }, [selSubconId, labType]);

  // ── Clear selSubconId / selVendorId when switching tabs ────────
  useEffect(() => {
    if(labType!=="subcon") setSelSubconId("");
    if(labType!=="vendor") setSelVendorId("");
  }, [labType]);

  // ── Get rate from rate card by role ─────────────────────────────
  const getRateForRole = (role) => {
    if(!role||!rateCard.length) return 0;
    const r2 = String(role).toLowerCase().trim();
    const rc = rateCard.find(r => {
      const rRole = String(r.role||r.name||r.skill||"").toLowerCase().trim();
      return rRole === r2;
    });
    if (!rc) return 0;
    return Number(rc.rate||rc.daily_rate||rc.dailyRate||rc.base_rate)||0;
  };

  // ── 7-day date range ─────────────────────────────────────────────
  const days7 = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-(6-i));
    return d.toISOString().split("T")[0];
  });

  // ── Save attendance ──────────────────────────────────────────────
  const saveAttendance = async () => {
    if(labType==="subcon"&&!selSubconId) return;
    if(labType==="vendor"&&!selVendorId) return;
    setAttSaving(true);
    const sc = labType==="subcon" ? subconLib.find(s=>String(s.id||s.name)===selSubconId) : null;
    const vd = labType==="vendor" ? vendorLib.find(v=>String(v.id||v.name)===selVendorId) : null;
    const payload = {
      project_id: projectId, date: attDate, type: labType, mode,
      entries: mode==="name" ? todayEntries : todayCountRows,
      subcon_id:   sc?.id   || null,
      subcon_name: sc?.name || sc?.company_name || null,
      vendor_id:   vd?.id   || null,
      vendor_name: vd?.name || vd?.company_name || null,
    };
    try {
      const r = await api.post(`/projects/${projectId}/attendance`, payload);
      if(r.success) {
        setAttRecs(prev=>[...prev.filter(rec=>{
          const rd = String(rec.date||"").split("T")[0];
          return !(rd===attDate&&rec.type===labType
            &&(rec.subcon_id||null)===(sc?.id||null)
            &&(rec.vendor_id||null)===(vd?.id||null));
        }), {...payload, id:r.data?.id}]);
        setEditingAtt(false);
      }
    } catch(e) {}
    setAttSaving(false);
  };

  // ── Appoint selected library workers to project (bulk) ──────────────
  const appointSelected = async () => {
    if(!selectedLibIds.size) return;
    setWfSaving(true);
    const toAdd = workerLib.filter(w => selectedLibIds.has(w.id));
    const alreadyIds = new Set((workforce.company||[]).map(w=>w.lib_id||w.worker_id));
    const newOnes = toAdd.filter(w => !alreadyIds.has(w.id));
    const added = [];
    for(const w of newOnes) {
      const cardRate = getRateForRole(w.role||w.trade||"Labour");
      const rate = Number(w.daily_rate||w.rate_per_day)||cardRate;
      try {
        const r = await api.post(`/projects/${projectId}/workforce`, {
          project_id: projectId, type:"company",
          lib_id: w.id, name: w.name, role: w.role||w.trade||"Labour",
          daily_rate: rate, phone: w.phone||"", rateStatus:"card",
        });
        if(r.success) added.push({...w, id:r.data?.id||Date.now(), dailyRate:rate, daily_rate:rate, rateStatus:"card"});
      } catch(e){}
    }
    setWorkforce(prev=>({...prev, company:[...prev.company, ...added]}));
    setSelectedLibIds(new Set());
    setShowAddWf(false);
    setWfSaving(false);
  };

  // ── Add new worker (not in library) ─────────────────────────────────
  const addNewWorker = async () => {
    if(!wfForm.name.trim()) return;
    setWfSaving(true);
    try {
      // Save to library (payroll_workers) first
      const libRes = await api.post("/library/workers", {
        name: wfForm.name.trim(), role: wfForm.role, category: wfForm.category,
        daily_rate: Number(wfForm.dailyRate)||0, phone: wfForm.phone, city: wfForm.city, status:"Active",
      });
      const libId = libRes.data?.id || null;
      const cardRate = getRateForRole(wfForm.role);
      const rate = Number(wfForm.dailyRate)||cardRate||0;
      // Appoint to project
      const r = await api.post(`/projects/${projectId}/workforce`, {
        project_id: projectId, type:"company",
        lib_id: libId, name: wfForm.name.trim(), role: wfForm.role,
        daily_rate: rate, phone: wfForm.phone, rateStatus:"card",
      });
      if(r.success) {
        setWorkforce(prev=>({...prev, company:[...prev.company,{...wfForm,id:r.data?.id||Date.now(),dailyRate:rate,daily_rate:rate,rateStatus:"card"}]}));
        // Refresh library
        api.get("/library/workers").then(res=>{ if(res.success) setWorkerLib(res.data||[]); });
        setWfForm({name:"",role:"Labour",category:"Unskilled",dailyRate:"",phone:"",city:""});
        setShowNewWf(false);
      }
    } catch(e){}
    setWfSaving(false);
  };

  // ── Submit rate change approval ──────────────────────────────────
  const submitRateApproval = async () => {
    if(!rateReqWorker||!newRateVal) return;
    setRateSaving(true);
    try {
      const res = await api.post("/approvals/labour-rate", {
        project_id: projectId,
        worker_id: rateReqWorker.id,
        worker_name: rateReqWorker.name,
        worker_role: rateReqWorker.role,
        labour_type: labType, // company | vendor
        current_rate: rateReqWorker.dailyRate || rateReqWorker.daily_rate || 0,
        requested_rate: Number(newRateVal),
        reason: rateReason,
      });
      if (res.success) {
        setWorkforce(prev=>({...prev,[labType]:prev[labType].map(w=>w.id===rateReqWorker.id?{...w,rateStatus:"pending",pendingRate:Number(newRateVal)}:w)}));
        setShowRateModal(false); setRateReqWorker(null); setNewRateVal(""); setRateReason("");
      } else {
        alert(res.message || "Failed to submit");
      }
    } catch(e) { alert("Error: " + e.message); }
    setRateSaving(false);
  };

  // ── Derived stats ────────────────────────────────────────────────
  const currentWF   = workforce[labType]||[];
  const presentCount= mode==="name" ? todayEntries.filter(e=>e.status==="P").length : todayCountRows.reduce((s,r)=>s+(Number(r.present)||0),0);
  const halfCount   = mode==="name" ? todayEntries.filter(e=>e.status==="H").length : 0;
  const totalCount  = mode==="name" ? todayEntries.length : todayCountRows.reduce((s,r)=>s+(Number(r.count)||0),0);
  const totalWages  = mode==="name"
    ? todayEntries.reduce((s,e)=>s+(e.status==="P"?Number(e.dailyRate)||0:e.status==="H"?(Number(e.dailyRate)||0)/2:0),0)
    : todayCountRows.reduce((s,r)=>s+(Number(r.present)||0)*(Number(r.rate)||0),0);

  // ── Rate badge sub-component ─────────────────────────────────────
  const RateBadge = ({worker}) => {
    if(worker.rateStatus==="pending") return <span style={{padding:"2px 7px",background:T.ambL,color:T.amb,borderRadius:20,fontSize:10,fontWeight:600,border:`1px solid ${T.ambM}`}}>🟡 Pending</span>;
    if(worker.rateStatus==="approved") return <span style={{padding:"2px 7px",background:T.grnL,color:T.grn,borderRadius:20,fontSize:10,fontWeight:600,border:`1px solid ${T.grnM}`}}>✓ Approved</span>;
    return <span style={{padding:"2px 7px",background:T.sltL,color:T.slt,borderRadius:20,fontSize:10,fontWeight:600,border:`1px solid ${T.b2}`}}>📋 Rate Card</span>;
  };

  const historyRecs = (()=>{
    let recs = attRecs.filter(r => r.type === labType);
    // Filter by selected subcon/vendor for proper per-entity history
    if (labType === "subcon" && selSubconId) {
      const sc = subconLib.find(s=>String(s.id||s.name)===selSubconId);
      const sName = sc?.name || sc?.company_name;
      recs = recs.filter(r =>
        (r.subcon_id && sc?.id && String(r.subcon_id) === String(sc.id)) ||
        (r.subcon_name && sName && r.subcon_name === sName)
      );
    } else if (labType === "vendor" && selVendorId) {
      const vd = vendorLib.find(v=>String(v.id||v.name)===selVendorId);
      const vName = vd?.name || vd?.company_name;
      recs = recs.filter(r =>
        (r.vendor_id && vd?.id && String(r.vendor_id) === String(vd.id)) ||
        (r.vendor_name && vName && r.vendor_name === vName)
      );
    }
    return recs.sort((a,b)=>{
      const ad = String(a.date||"").split("T")[0];
      const bd = String(b.date||"").split("T")[0];
      return bd.localeCompare(ad);
    }).slice(0,14);
  })();

  // placeholder — original code references below replaced by new render
  const [_unused] = useState(false);

  return(
    <div style={{padding:"14px 18px",fontFamily:"'Segoe UI',sans-serif"}}>

      {/* ── TYPE TABS + ACTIONS ──────────────────────────────────────── */}
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:6}}>
          {["company","subcon","vendor"].map(t=>(
            <button key={t} onClick={()=>setLabType(t)}
              style={{padding:"7px 15px",borderRadius:20,border:`1.5px solid ${labType===t?TYPE_COLORS[t]:T.b1}`,background:labType===t?TYPE_BG[t]:T.surface,color:labType===t?TYPE_COLORS[t]:T.t3,fontSize:12,fontWeight:labType===t?700:500,cursor:"pointer",transition:"all .15s"}}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          {/* Only Company has workforce panel + Add button (subcon/vendor use selector) */}
          {labType==="company"&&<>
            <button onClick={()=>setShowWfPanel(p=>!p)}
              style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${T.b1}`,background:showWfPanel?T.surfaceB:T.surface,color:T.t3,fontSize:11.5,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Workforce {showWfPanel?"▲":"▼"}
            </button>
            <button onClick={()=>{ setShowAddWf(true); setLibSearch(""); setSelectedLibIds(new Set()); setShowNewWf(false); setWfForm({name:"",role:"Labour",category:"Unskilled",dailyRate:"",phone:"",city:""}); }}
              style={{padding:"6px 13px",borderRadius:6,background:TYPE_COLORS[labType],color:"white",border:"none",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
              Add Labour
            </button>
          </>}
          <button onClick={()=>setShowHistory(p=>!p)}
            style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${showHistory?TYPE_COLORS[labType]:T.b1}`,background:showHistory?TYPE_BG[labType]:T.surface,color:showHistory?TYPE_COLORS[labType]:T.t3,fontSize:11.5,cursor:"pointer"}}>
            History
          </button>
        </div>
      </div>

      {/* ── SUBCON SELECTOR (replaces workforce panel for subcon) ─────── */}
      {labType==="subcon"&&(
        <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,marginBottom:14,padding:"8px 12px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px",flexShrink:0}}>Subcontractor</span>
          {subconLib.length===0
            ?<span style={{fontSize:12,color:T.t4}}>No subcontractors in library. Add via <b>Master Library → Subcontractors</b>.</span>
            :<div style={{display:"flex",gap:6,flexWrap:"wrap",flex:1}}>
              {subconLib.map(s=>{
                const sid = s.id||s.name;
                const isSelected = selSubconId===String(sid);
                return(
                  <button key={sid} onClick={()=>setSelSubconId(isSelected?"":String(sid))}
                    title={s.phone||s.trade||""}
                    style={{padding:"4px 11px",borderRadius:14,border:`1px solid ${isSelected?T.grn:T.b1}`,background:isSelected?T.grnL:T.surface,color:isSelected?T.grn:T.t2,fontSize:12,fontWeight:isSelected?700:500,cursor:"pointer",transition:"all .12s",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit"}}
                    onMouseEnter={el=>{if(!isSelected){el.currentTarget.style.borderColor=T.b2; el.currentTarget.style.background=T.surfaceB;}}}
                    onMouseLeave={el=>{if(!isSelected){el.currentTarget.style.borderColor=T.b1; el.currentTarget.style.background=T.surface;}}}>
                    {isSelected&&<span style={{width:6,height:6,borderRadius:"50%",background:T.grn,display:"inline-block"}}/>}
                    {s.name||s.company_name}
                  </button>
                );
              })}
            </div>
          }
          {/* Request Payment — auto-fills selected subcon if any */}
          {selSubconId&&(()=>{
            const sc = subconLib.find(x=>String(x.id||x.name)===String(selSubconId));
            const scName = sc?.name||sc?.company_name||sc?.firm_name||sc?.party_name||"";
            return(
              <button onClick={()=>setPaymentReq({type:"subcon",party:sc?{id:sc.id,name:scName}:null})}
                title={`Request payment for ${scName||"this subcontractor"}`}
                style={{padding:"5px 12px",borderRadius:6,border:"none",background:T.blu,color:"#fff",fontSize:11.5,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit",boxShadow:`0 2px 6px ${T.blu}33`,flexShrink:0,transition:"background .12s"}}
                onMouseEnter={el=>el.currentTarget.style.background="#1D4ED8"}
                onMouseLeave={el=>el.currentTarget.style.background=T.blu}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                Request Payment
              </button>
            );
          })()}
        </div>
      )}

      {/* ── VENDOR SELECTOR (mirrors subcon flow + Add new vendor) ───── */}
      {labType==="vendor"&&(
        <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,marginBottom:14,padding:"8px 12px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px",flexShrink:0}}>Labour Vendor</span>
          {vendorLib.length===0
            ?<span style={{fontSize:12,color:T.t4}}>No labour vendors yet. Click <b>Add Vendor</b> →</span>
            :<div style={{display:"flex",gap:6,flexWrap:"wrap",flex:1}}>
              {vendorLib.map(v=>{
                const vid = v.id||v.name;
                const isSelected = selVendorId===String(vid);
                const skillCount = (v.skills||[]).length;
                return(
                  <button key={vid} onClick={()=>setSelVendorId(isSelected?"":String(vid))}
                    title={[v.owner,v.phone,v.city].filter(Boolean).join(" · ")}
                    style={{padding:"4px 11px",borderRadius:14,border:`1px solid ${isSelected?T.amb:T.b1}`,background:isSelected?T.ambL:T.surface,color:isSelected?T.amb:T.t2,fontSize:12,fontWeight:isSelected?700:500,cursor:"pointer",transition:"all .12s",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit"}}
                    onMouseEnter={el=>{if(!isSelected){el.currentTarget.style.borderColor=T.b2; el.currentTarget.style.background=T.surfaceB;}}}
                    onMouseLeave={el=>{if(!isSelected){el.currentTarget.style.borderColor=T.b1; el.currentTarget.style.background=T.surface;}}}>
                    {isSelected&&<span style={{width:6,height:6,borderRadius:"50%",background:T.amb,display:"inline-block"}}/>}
                    {v.name||v.company_name}
                    {skillCount>0&&<span style={{fontSize:9.5,padding:"1px 5px",background:isSelected?T.amb:T.b1,color:isSelected?"white":T.t3,borderRadius:8,fontWeight:700}}>{skillCount}</span>}
                  </button>
                );
              })}
            </div>
          }
          <button onClick={()=>{
              setVForm({name:"",owner:"",phone:"",email:"",city:"",gstin:"",trade:"",notes:""});
              const first = rateCard[0];
              if (first) {
                const skill = first.role||first.name||first.skill;
                const rate  = getRateForRole(skill) || 0;
                setVSkills([{ skill, rate, card_rate:rate }]);
              } else {
                setVSkills([]);
              }
              setShowAddVendor(true);
            }}
            title="Add new labour vendor"
            style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${T.b1}`,background:T.surface,color:T.t2,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit",flexShrink:0,transition:"all .12s"}}
            onMouseEnter={el=>{el.currentTarget.style.background=T.surfaceB; el.currentTarget.style.borderColor=T.b2;}}
            onMouseLeave={el=>{el.currentTarget.style.background=T.surface; el.currentTarget.style.borderColor=T.b1;}}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M12 5v14M5 12h14"/></svg>
            Add Vendor
          </button>
        </div>
      )}

      {/* ── WORKFORCE PANEL (Company only) ───────────────────────────── */}
      {labType==="company"&&showWfPanel&&(<>
        <style>{`@keyframes gbSlideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        <div onClick={()=>setShowWfPanel(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200}}/>
        <div style={{position:"fixed",top:0,right:0,height:"100vh",width:620,maxWidth:"95vw",background:T.surface,boxShadow:"-8px 0 30px rgba(0,0,0,0.15)",zIndex:201,display:"flex",flexDirection:"column",animation:"gbSlideInRight .25s ease-out",fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif"}}>
          {/* Header */}
          <div style={{padding:"12px 16px",background:"#0D1B2A",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div>
              <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Registered Workforce</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>{TYPE_LABELS[labType]} · {currentWF.length} registered · Mode: {mode==="name"?"Name-wise":"Count-wise"}</div>
            </div>
            <button onClick={()=>setShowWfPanel(false)} title="Close"
              style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",padding:6,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .12s"}}
              onMouseEnter={el=>el.currentTarget.style.background="rgba(255,255,255,0.1)"}
              onMouseLeave={el=>el.currentTarget.style.background="none"}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          {/* Body */}
          <div style={{flex:1,overflowY:"auto"}}>
            {wfLoading
              ?<div style={{padding:"32px 18px",textAlign:"center",color:T.t4,fontSize:12.5}}>Loading…</div>
              :currentWF.length===0
                ?<div style={{padding:"40px 18px",textAlign:"center",color:T.t4,fontSize:12.5}}>
                  No {TYPE_LABELS[labType]} registered yet.<br/>Click <b>"+ Add Labour"</b> above to register workforce for this project.
                 </div>
                :<>
                  <THead cols="2fr 1fr 90px 100px 100px" headers={["Name","Role","Daily Rate","Rate Status","Action"]}/>
                  {currentWF.map((w,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 90px 100px 100px",padding:"9px 15px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",fontSize:12.5,gap:8}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span style={{fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.name}</span>
                      <span style={{color:T.t2,fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.role||"—"}</span>
                      <span style={{fontWeight:600,color:T.t1,fontVariantNumeric:"tabular-nums"}}>₹{w.dailyRate||w.daily_rate||0}</span>
                      <RateBadge worker={w}/>
                      <button onClick={()=>{setRateReqWorker(w);setNewRateVal("");setRateReason("");setShowRateModal(true);}}
                        style={{padding:"3px 9px",borderRadius:5,border:`1px solid ${T.b2}`,background:T.surface,color:T.t3,fontSize:11,cursor:"pointer",width:"max-content",fontFamily:"inherit"}}>
                        Change Rate
                      </button>
                    </div>
                  ))}
                 </>
            }
          </div>
        </div>
      </>)}

      {/* ── DATE NAVIGATOR ───────────────────────────────────────────── */}
      <div style={{display:"flex",gap:6,marginBottom:14,alignItems:"center",overflowX:"auto",paddingBottom:2}}>
        <span style={{fontSize:11,color:T.t4,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>DATE</span>
        {days7.map(d=>{
          const isToday=d===todayStr, isSel=d===attDate;
          const hasData=attRecs.some(r=>String(r.date||"").split("T")[0]===d&&r.type===labType);
          const dd=new Date(d);
          const dow=dd.getDay(); // 0=Sun, 6=Sat
          const isWeekend=dow===0||dow===6;
          const labelColor = isSel ? TYPE_COLORS[labType] : (isWeekend ? T.t4 : T.t3);
          return(
            <button key={d} onClick={()=>setAttDate(d)}
              title={isToday ? "Today" : (hasData ? "Attendance marked" : "")}
              style={{padding:"6px 11px 8px",borderRadius:7,border:`1.5px solid ${isSel?TYPE_COLORS[labType]:T.b1}`,background:isSel?TYPE_BG[labType]:T.surface,color:isSel?TYPE_COLORS[labType]:T.t2,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1,minWidth:46,position:"relative",flexShrink:0,transition:"all .15s",boxShadow:isToday&&!isSel?`inset 0 -2px 0 ${T.blu}`:"none"}}>
              <span style={{fontSize:9.5,fontWeight:isSel?700:500,textTransform:"uppercase",color:labelColor,letterSpacing:".3px"}}>
                {dd.toLocaleDateString("en-IN",{weekday:"short"})}
              </span>
              <span style={{fontSize:13,fontWeight:isSel?700:600,color:isSel?TYPE_COLORS[labType]:(isWeekend?T.t3:T.t1)}}>{dd.getDate()}</span>
              {hasData&&<span title="Attendance marked" style={{width:5,height:5,borderRadius:"50%",background:T.grn,position:"absolute",top:5,right:5}}/>}
            </button>
          );
        })}
        <input type="date" value={attDate} onChange={e=>setAttDate(e.target.value)} max={todayStr}
          style={{marginLeft:4,padding:"5px 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,color:T.t2,background:T.surface,outline:"none",fontFamily:"inherit",flexShrink:0}}/>
        {/* Legend */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:"auto",fontSize:10.5,color:T.t4,flexShrink:0}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:5}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:T.grn}}/>Marked
          </span>
          <span style={{display:"inline-flex",alignItems:"center",gap:5}}>
            <span style={{width:14,height:2,borderRadius:1,background:T.blu}}/>Today
          </span>
        </div>
      </div>

      {/* ── KPI STRIP ────────────────────────────────────────────────── */}
      {labType==="subcon"
        /* Subcon: only present count per role, no wages tracking */
        ?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
          {[
            {l:"Total Present",v:presentCount,c:T.grn},
            {l:"Roles Working", v:todayCountRows.filter(r=>r.present>0).length, c:T.blu},
            {l:"Mode",         v:"Count-wise",c:T.slt},
          ].map((s,i)=>(
            <div key={i} style={{padding:"12px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,display:"flex",flexDirection:"column",gap:6}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:s.c,flexShrink:0}}/>
                <span style={{fontSize:10,color:T.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"}}>{s.l}</span>
              </div>
              <div style={{fontSize:22,fontWeight:700,color:T.t1,lineHeight:1.1,fontVariantNumeric:"tabular-nums"}}>{s.v}</div>
            </div>
          ))}
        </div>
        /* Company / Vendor: full KPI */
        :<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
          {[
            {l:"Present",    v:presentCount,                                     c:T.grn},
            {l:"Half Day",   v:halfCount,                                        c:T.amb},
            {l:"Absent",     v:Math.max(0,totalCount-presentCount-halfCount),    c:T.red},
            {l:"Daily Wages",v:`₹${fmtN(totalWages)}`,                           c:T.blu},
          ].map((s,i)=>(
            <div key={i} style={{padding:"12px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,display:"flex",flexDirection:"column",gap:6}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:s.c,flexShrink:0}}/>
                <span style={{fontSize:10,color:T.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"}}>{s.l}</span>
              </div>
              <div style={{fontSize:22,fontWeight:700,color:T.t1,lineHeight:1.1,fontVariantNumeric:"tabular-nums"}}>{s.v}</div>
            </div>
          ))}
        </div>
      }

      {/* ── ATTENDANCE ENTRY PANEL ───────────────────────────────────── */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,marginBottom:14,overflow:"hidden"}}>
        <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <span style={{fontSize:12.5,fontWeight:700,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {new Date(attDate+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"2-digit",month:"short",year:"numeric"})}
          </span>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            {labType==="subcon"&&!selSubconId
              ?<span style={{fontSize:11.5,color:T.amb,fontWeight:600}}>⬆ Pehle subcontractor select karo</span>
              :labType==="vendor"&&!selVendorId
              ?<span style={{fontSize:11.5,color:T.amb,fontWeight:600}}>⬆ Pehle labour vendor select karo</span>
              :mode==="count"
              ?(()=>{
                // ── Count-wise mode (subcon/vendor): simple Mark Attendance / Save toggle ──
                const totalCount = todayCountRows.reduce((s,r)=>s+(Number(r.present)||0),0);
                const savedRecCount = attRecs.find(r=>{
                  const rd = String(r.date||"").split("T")[0];
                  if (rd!==attDate||r.type!==labType) return false;
                  if (labType==="subcon") return String(r.subcon_id||r.subcon_name||"")===String(selSubconId);
                  if (labType==="vendor") return String(r.vendor_id||r.vendor_name||"")===String(selVendorId);
                  return true;
                });
                if (!editingAtt) return(
                  <>
                    {savedRecCount&&<span style={{fontSize:10.5,padding:"2px 8px",borderRadius:10,background:T.grnL,color:T.grn,fontWeight:700,border:`1px solid ${T.grnM}`}}>✓ SAVED</span>}
                    {totalCount>0&&<span style={{fontSize:11.5,color:T.t3,fontWeight:600}}>Total: <b style={{color:T.grn}}>{totalCount}</b></span>}
                    <button onClick={()=>setEditingAtt(true)}
                      style={{padding:"7px 16px",borderRadius:7,border:`1.5px solid ${TYPE_COLORS[labType]}`,background:TYPE_BG[labType],color:TYPE_COLORS[labType],fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                      ✏️ {savedRecCount?"Edit":"Mark"} Attendance
                    </button>
                  </>
                );
                return(
                  <>
                    <button onClick={()=>{ setEditingAtt(false); /* reset rows */ }}
                      style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${T.b1}`,background:T.surface,color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
                      Cancel
                    </button>
                    <button onClick={saveAttendance} disabled={attSaving}
                      style={{padding:"7px 18px",borderRadius:7,border:"none",background:TYPE_COLORS[labType],color:"white",fontSize:12.5,fontWeight:700,cursor:"pointer",opacity:attSaving?.6:1,boxShadow:`0 2px 8px ${TYPE_COLORS[labType]}55`}}>
                      {attSaving?"Saving…":`💾 Save${totalCount>0?` (${totalCount})`:""}`}
                    </button>
                  </>
                );
              })()
              :(()=>{
                const markedCount = todayEntries.filter(e=>e.status).length;
                const total = todayEntries.length;
                const allMarked = total>0 && markedCount===total;
                // Detect unsaved changes: compare current state to last saved attRecs
                const savedRec = attRecs.find(r=>{
                  const recDate = String(r.date||"").split("T")[0];
                  return recDate===attDate&&r.type===labType&&!r.subcon_id&&!r.vendor_id;
                });
                const clearDate = async () => {
                  if(!await window.confirmAsync(`${attDate} ki attendance delete karoge? Payroll mein bhi hatega.`)) return;
                  try {
                    const res = await api.del(`/projects/${projectId}/attendance?date=${attDate}&type=${labType}`);
                    if(res.success) {
                      setAttRecs(prev=>prev.filter(r=>{
                        const rd = String(r.date||"").split("T")[0];
                        return !(rd===attDate&&r.type===labType&&!r.subcon_id&&!r.vendor_id);
                      }));
                      // Reset rows to unmarked
                      setTodayEntries(prev=>prev.map(e=>({...e,status:"",hours:0,ot:0,remark:""})));
                    }
                  } catch(_){}
                };
                const isDirty = (()=>{
                  if (!savedRec) return markedCount > 0; // never saved → dirty if any marks
                  const savedById = {};
                  (savedRec.entries||[]).forEach(s => { savedById[s.worker_id||s.name] = s; });
                  for (const e of todayEntries) {
                    const s = savedById[e.worker_id||e.name];
                    if (!s) return e.status ? true : false;
                    if ((s.status||"")!==(e.status||"") || (Number(s.hours)||0)!==(Number(e.hours)||0) ||
                        (Number(s.ot)||0)!==(Number(e.ot)||0) || (s.remark||"")!==(e.remark||"")) return true;
                  }
                  return false;
                })();
                return(
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:11.5,color:isDirty?T.amb:T.t4,fontWeight:600}}>
                      {markedCount}/{total} marked
                      {isDirty&&<span style={{marginLeft:6,padding:"1px 7px",borderRadius:10,background:T.ambL,color:T.amb,fontSize:9.5,fontWeight:700,border:`1px solid ${T.ambM}`}}>● UNSAVED</span>}
                      {!isDirty&&savedRec&&<span style={{marginLeft:6,padding:"1px 7px",borderRadius:10,background:T.grnL,color:T.grn,fontSize:9.5,fontWeight:700,border:`1px solid ${T.grnM}`}}>✓ SAVED</span>}
                    </span>
                    {labType==="company"&&currentWF.length>0&&markedCount<total&&(
                      <button onClick={()=>setTodayEntries(prev=>prev.map(e=>e.status?e:({...e,status:"P",hours:8})))}
                        style={{padding:"6px 12px",borderRadius:6,border:`1.5px solid ${T.grn}`,background:T.grnL,color:T.grn,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
                        ✓ Mark Remaining Present
                      </button>
                    )}
                    {savedRec&&!isDirty&&(
                      <button onClick={async()=>{
                        // Unfreeze: enable editing by clearing all statuses
                        if(!await window.confirmAsync("Edit attendance for this date? Tum sab P/A/H phir se mark kar sakoge.")) return;
                        setTodayEntries(prev=>prev.map(e=>({...e,status:"",hours:0,ot:0,remark:""})));
                      }}
                        title="Re-mark attendance for this date"
                        style={{padding:"6px 12px",borderRadius:6,border:`1.5px solid ${T.blu}`,background:T.bluL,color:T.blu,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
                        ✏️ Edit Attendance
                      </button>
                    )}
                    {markedCount>0&&(
                      <button onClick={saveAttendance} disabled={attSaving||!allMarked||!isDirty}
                        title={!allMarked?"Mark all workers first":(!isDirty?"No changes to save":"Save attendance")}
                        style={{padding:"7px 18px",borderRadius:7,border:"none",background:(allMarked&&isDirty)?TYPE_COLORS[labType]:"#ccc",color:"white",fontSize:12.5,fontWeight:700,cursor:(allMarked&&isDirty)?"pointer":"not-allowed",opacity:attSaving?.6:1,boxShadow:(allMarked&&isDirty)?`0 2px 8px ${TYPE_COLORS[labType]}55`:"none"}}>
                        {attSaving?"Saving…":!isDirty?"✓ Saved":allMarked?`💾 Save (${total})`:`Mark all first`}
                      </button>
                    )}
                  </div>
                );
              })()
            }
          </div>
        </div>

        {/* NAME-WISE VIEW */}
        {mode==="name"&&(()=>{
          // Compute saved/dirty state for this date
          const savedRec2 = attRecs.find(r=>{
            const recDate = String(r.date||"").split("T")[0];
            return recDate===attDate&&r.type===labType&&!r.subcon_id&&!r.vendor_id;
          });
          const isDirty2 = (()=>{
            if (!savedRec2) return todayEntries.some(e=>e.status);
            const savedById = {};
            (savedRec2.entries||[]).forEach(s => { savedById[s.worker_id||s.name] = s; });
            for (const e of todayEntries) {
              const s = savedById[e.worker_id||e.name];
              if (!s) return e.status ? true : false;
              if ((s.status||"")!==(e.status||"") || (Number(s.hours)||0)!==(Number(e.hours)||0) ||
                  (Number(s.ot)||0)!==(Number(e.ot)||0) || (s.remark||"")!==(e.remark||"")) return true;
            }
            return false;
          })();
          const isFrozen = !!savedRec2 && !isDirty2;
          return currentWF.length===0
            ?<div style={{padding:"22px 15px",textAlign:"center",color:T.t4,fontSize:12.5}}>Register workforce first to mark name-wise attendance.</div>
            :<div>
              {isFrozen&&(
                <div style={{padding:"6px 14px",background:T.grnL,borderBottom:`1px solid ${T.grnM}`,fontSize:11,color:T.grn,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  Saved & locked — click <b style={{margin:"0 2px"}}>Edit Attendance</b> above to change
                </div>
              )}
              {/* Worker search bar */}
              {currentWF.length>3 && (
                <div style={{padding:"7px 14px 8px",borderBottom:`1px solid ${T.b1}`,background:T.surface,display:"flex",alignItems:"center",gap:8}}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={2} strokeLinecap="round"><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
                  <input value={workerSearch} onChange={el=>setWorkerSearch(el.target.value)} placeholder="Search by name or role..."
                    style={{flex:1,padding:"3px 0",border:"none",outline:"none",fontSize:12,color:T.t1,background:"transparent",fontFamily:"inherit"}}/>
                  {workerSearch && (
                    <button onClick={()=>setWorkerSearch("")} title="Clear"
                      style={{padding:"2px 6px",border:"none",background:"transparent",color:T.t4,cursor:"pointer",fontSize:14,lineHeight:1,fontFamily:"inherit"}}>×</button>
                  )}
                </div>
              )}
              <THead cols="2fr 1fr 160px 95px 100px" headers={["Name","Role","Status","Daily Rate","Action"]}/>
              {todayEntries.map((e,idx)=>{
                const isLocked = !!e.status;
                const borderColor = e.status==="P"?T.grn:e.status==="H"?T.amb:e.status==="A"?T.red:T.b1;
                const bgTint = e.status==="P"?T.grnL+"55":e.status==="H"?T.ambL+"55":e.status==="A"?T.redL+"55":"transparent";
                // Filter by search
                const q = workerSearch.trim().toLowerCase();
                if (q && !(String(e.name||"").toLowerCase().includes(q) || String(e.role||"").toLowerCase().includes(q))) return null;
                return(
                <div key={idx}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 160px 95px 100px",padding:"9px 15px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",borderLeft:`4px solid ${borderColor}`,background:bgTint,transition:"all .2s",gap:10}}>
                  <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{e.name}</span>
                  <span style={{fontSize:12,color:T.t3}}>{e.role}</span>

                  {/* Status — pill when frozen, buttons when editing */}
                  {isFrozen ? (
                    <Pill label={e.status==="P"?"✓ Present":e.status==="H"?"½ Half Day":"✗ Absent"}
                      c={e.status==="P"?T.grn:e.status==="H"?T.amb:T.red}
                      bg={e.status==="P"?T.grnL:e.status==="H"?T.ambL:T.redL}/>
                  ) : (
                    <div style={{display:"inline-flex", padding:2, background:"#F1F5F9", border:`1px solid ${T.b1}`, borderRadius:8, gap:0}}>
                      {[
                        {s:"P", label:"Present",  c:T.grn},
                        {s:"A", label:"Absent",   c:T.red},
                        {s:"H", label:"Half Day", c:T.amb},
                      ].map(opt=>{
                        const active = e.status === opt.s;
                        const dimmed = isLocked && !active;
                        return(
                          <button key={opt.s} disabled={isLocked && !active}
                            title={opt.label}
                            onClick={()=>{ if(isLocked) return; setTodayEntries(prev=>prev.map((en,i)=>i===idx?{
                              ...en, status:opt.s,
                              hours: opt.s==="P"?8:opt.s==="H"?4:0,
                              remark: opt.s==="A" ? (en.remark||"") : "",
                            }:en)); }}
                            style={{
                              padding:"5px 14px", minWidth:38, borderRadius:6, border:"none",
                              background: active ? opt.c : "transparent",
                              color: active ? "#fff" : (dimmed ? "#CBD5E1" : T.t3),
                              fontSize:12, fontWeight:700, fontFamily:"inherit",
                              cursor: isLocked ? "default" : "pointer",
                              boxShadow: active ? "0 1px 2px rgba(0,0,0,.12)" : "none",
                              transition:"background .12s, color .12s",
                            }}
                            onMouseEnter={el=>{ if(!isLocked && !active){ el.currentTarget.style.background = opt.c + "14"; el.currentTarget.style.color = opt.c; } }}
                            onMouseLeave={el=>{ if(!isLocked && !active){ el.currentTarget.style.background = "transparent"; el.currentTarget.style.color = dimmed ? "#CBD5E1" : T.t3; } }}>
                            {opt.s}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <span style={{fontSize:12.5,color:T.t1,fontWeight:600,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>₹{e.dailyRate||0}</span>

                  {/* Edit/Lock indicator */}
                  {isFrozen
                    ?<span title="Saved & locked" style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:14,border:`1px solid ${T.grnM}`,background:T.grnL,color:T.grn,fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>
                        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        Saved
                      </span>
                    :isLocked
                      ?<button onClick={()=>setTodayEntries(prev=>prev.map((en,i)=>i===idx?{...en,status:"",hours:0,ot:0,remark:""}:en))}
                          title="Edit / change status"
                          style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:6,border:`1px solid ${T.b2}`,background:T.surface,color:T.t3,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .12s"}}
                          onMouseEnter={el=>{el.currentTarget.style.background=T.surfaceB; el.currentTarget.style.borderColor=T.b1; el.currentTarget.style.color=T.t2;}}
                          onMouseLeave={el=>{el.currentTarget.style.background=T.surface; el.currentTarget.style.borderColor=T.b2; el.currentTarget.style.color=T.t3;}}>
                          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Edit
                        </button>
                      :<span title="Not yet marked" style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:14,border:`1px dashed ${T.b2}`,background:"transparent",color:T.t4,fontSize:10.5,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px"}}>
                          <span style={{width:6,height:6,borderRadius:"50%",border:`1.5px solid ${T.t4}`,display:"inline-block"}}/>
                          Pending
                        </span>
                  }
                </div>
                {/* Remark for absent — only when locked as A */}
                {isLocked && e.status==="A" && (
                  <div style={{padding:"2px 16px 10px 22px",borderBottom:`1px solid ${T.b1}`}}>
                    <input type="text" value={e.remark||""}
                      onChange={el=>setTodayEntries(prev=>prev.map((en,i)=>i===idx?{...en,remark:el.target.value}:en))}
                      placeholder="Reason for absence (optional)"
                      style={{width:"100%",maxWidth:380,padding:"5px 10px",borderRadius:5,border:`1px solid ${T.b1}`,background:T.surface,fontSize:11.5,color:T.t2,outline:"none",fontFamily:"inherit",boxSizing:"border-box",transition:"border-color .12s"}}
                      onFocus={el=>el.target.style.borderColor=T.t4}
                      onBlur={el=>el.target.style.borderColor=T.b1}/>
                  </div>
                )}
                </div>
                );
              })}
            </div>;
        })()}

        {/* COUNT-WISE VIEW */}
        {mode==="count"&&(
          <div style={{padding:"14px 16px"}}>
            {/* ── SUBCON: prompt to select subcon ── */}
            {labType==="subcon" && !selSubconId && (
              <div style={{padding:"30px 18px",textAlign:"center",color:T.t4,fontSize:13}}>
                ⬆ Pehle subcontractor select karo, phir attendance mark kar sakte ho.
              </div>
            )}

            {/* ── SUBCON: skill catalog + count per skill ── */}
            {labType==="subcon" && selSubconId && (
              <>
                {/* Manage Skills — top right (label removed, count inline) */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:8,gap:10}}>
                  <span style={{fontSize:11,color:T.t4,fontWeight:500}}>{subconSkills.length} skill{subconSkills.length!==1?"s":""}</span>
                  <button onClick={()=>{
                      setDrawerSelected(new Set(subconSkills.map(s=>s.skill)));
                      setDrawerSearch("");
                      setDrawerNewSkill("");
                      setShowSkillDrawer(true);
                    }}
                    style={{padding:"5px 11px",borderRadius:6,border:`1px solid ${T.b1}`,background:T.surface,color:T.t2,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"all .12s",fontFamily:"inherit"}}
                    onMouseEnter={el=>{el.currentTarget.style.background=T.surfaceB; el.currentTarget.style.borderColor=T.b2; el.currentTarget.style.color=T.t1;}}
                    onMouseLeave={el=>{el.currentTarget.style.background=T.surface; el.currentTarget.style.borderColor=T.b1; el.currentTarget.style.color=T.t2;}}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14"/></svg>
                    Manage Skills
                  </button>
                </div>

                {subconSkills.length===0 ? (
                  <div style={{padding:"30px 18px",textAlign:"center",border:`1.5px dashed ${T.b1}`,borderRadius:10,background:T.surfaceB}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:5}}>🎯 No skills configured yet</div>
                    <div style={{fontSize:11.5,color:T.t3,marginBottom:14}}>Click <b>"Manage Skills"</b> above to setup what this subcontractor supplies.</div>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div style={{display:"grid",gridTemplateColumns:"2fr 130px",gap:10,marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${T.b1}`}}>
                      <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>Skill</div>
                      <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",textAlign:"center"}}>Count Today</div>
                    </div>
                    {todayCountRows.map((row,i)=>(
                      <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 130px",gap:10,marginBottom:6,alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${T.b1}`}}>
                        <span style={{fontSize:13,fontWeight:600,color:T.t1}}>{row.role}</span>
                        <input type="number" value={row.present||""} disabled={!editingAtt} placeholder="0" min={0}
                          onChange={e=>setTodayCountRows(prev=>prev.map((rw,idx)=>idx===i?{...rw,present:Number(e.target.value),count:Number(e.target.value)}:rw))}
                          style={{padding:"7px 10px",borderRadius:6,border:`1px solid ${editingAtt?T.b1:"transparent"}`,fontSize:14,fontWeight:700,color:row.present>0?T.t1:T.t4,outline:"none",fontFamily:"inherit",background:editingAtt?T.surface:T.surfaceB,opacity:1,boxSizing:"border-box",textAlign:"center",cursor:editingAtt?"text":"default",transition:"border-color .12s"}}
                          onFocus={el=>{if(editingAtt)el.target.style.borderColor=T.blu;}}
                          onBlur={el=>{if(editingAtt)el.target.style.borderColor=T.b1;}}/>
                      </div>
                    ))}
                    {!editingAtt && todayCountRows.every(r=>!r.present) && (
                      <div style={{textAlign:"center",color:T.t4,fontSize:12.5,padding:"18px 0"}}>No count marked yet. Click "Mark Attendance" to enter.</div>
                    )}
                    {/* Total summary */}
                    {!editingAtt && todayCountRows.some(r=>r.present>0) && (()=>{
                      const total = todayCountRows.reduce((s,r)=>s+(Number(r.present)||0),0);
                      return(
                        <div style={{marginTop:10,padding:"10px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div style={{display:"flex",alignItems:"center",gap:7}}>
                            <span style={{width:6,height:6,borderRadius:"50%",background:T.grn}}/>
                            <span style={{fontSize:10.5,color:T.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"}}>Total Labour Today</span>
                          </div>
                          <span style={{fontSize:20,fontWeight:700,color:T.t1,fontVariantNumeric:"tabular-nums"}}>{total}</span>
                        </div>
                      );
                    })()}
                  </>
                )}
              </>
            )}

            {/* ── SUBCON HISTORY SUMMARY: Total per skill till date ── */}
            {labType==="subcon" && selSubconId && !editingAtt && (()=>{
              // Aggregate skill totals across all dates for this subcon
              const totals = {};
              attRecs
                .filter(r=>r.type==="subcon"&&String(r.subcon_id||r.subcon_name||"")===String(selSubconId))
                .forEach(rec=>{
                  (rec.entries||[]).forEach(e=>{
                    if(!e.role) return;
                    totals[e.role] = (totals[e.role]||0) + (Number(e.present)||0);
                  });
                });
              const skillTotals = Object.entries(totals).filter(([,v])=>v>0);
              if(skillTotals.length===0) return null;
              const grandTotal = skillTotals.reduce((s,[,v])=>s+v,0);
              return(
                <div style={{marginTop:12,padding:"12px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:9}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:T.blu}}/>
                      <span style={{fontSize:10.5,color:T.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"}}>Total Till Date — by Skill</span>
                    </div>
                    <span style={{fontSize:12,color:T.t3,fontWeight:600}}>Grand Total <b style={{color:T.t1,marginLeft:4,fontVariantNumeric:"tabular-nums"}}>{grandTotal}</b></span>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {skillTotals.map(([skill,count])=>(
                      <div key={skill} style={{padding:"4px 10px",background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:14,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:11.5,color:T.t2,fontWeight:500}}>{skill}</span>
                        <span style={{fontSize:12,fontWeight:700,color:T.t1,fontVariantNumeric:"tabular-nums"}}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── VENDOR: skills come from vendor onboarding (edit vendor to change) ── */}
            {labType==="vendor"&&selVendorId&&(()=>{
              const vd = vendorLib.find(v=>String(v.id||v.name)===selVendorId);
              const vSkillsCount = (vd?.skills||[]).length;
              return(
              <>
                {/* Skill count + edit hint (compact, label removed) */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:8,gap:10}}>
                  <span style={{fontSize:11,color:T.t4,fontWeight:500}}>{vSkillsCount} skill{vSkillsCount!==1?"s":""} · rates locked at onboarding</span>
                  {vSkillsCount===0&&<span style={{fontSize:11,color:T.t4,fontStyle:"italic"}}>Edit vendor to add skills</span>}
                </div>

                {vSkillsCount===0?(
                  <div style={{padding:"30px 18px",textAlign:"center",border:`1.5px dashed ${T.b1}`,borderRadius:10,background:T.surfaceB,marginBottom:10}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:5}}>🎯 No skills configured yet</div>
                    <div style={{fontSize:11.5,color:T.t3}}>Skills + agreed rates onboarding ke time set hote hain. Vendor list mein vendor edit karke skills add karo.</div>
                  </div>
                ):(<>
                {/* Header row */}
                <div style={{display:"grid",gridTemplateColumns:"1.5fr 110px 100px 110px",gap:10,marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${T.b1}`}}>
                  <div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",fontWeight:700}}>Skill</div>
                  <div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",fontWeight:700,textAlign:"center"}}>Count Today</div>
                  <div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",fontWeight:700,textAlign:"right"}}>Rate</div>
                  <div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",fontWeight:700,textAlign:"right"}}>Wages</div>
                </div>
                {todayCountRows.map((row,i)=>{
                  const rate = Number(row.rate)||0;
                  const wages = (Number(row.present)||0) * rate;
                  const isPending = row.rate_status === "pending";
                  return(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1.5fr 110px 100px 110px",gap:10,marginBottom:6,alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${T.b1}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:13,fontWeight:600,color:T.t1}}>{row.role}</span>
                      {isPending&&<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:9.5,padding:"2px 7px",borderRadius:10,background:T.ambL,color:T.amb,fontWeight:700,border:`1px solid ${T.ambM}`}}><span style={{width:5,height:5,borderRadius:"50%",background:T.amb}}/>Rate Pending</span>}
                      {row.rate_status==="approved"&&<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:9.5,padding:"2px 7px",borderRadius:10,background:T.grnL,color:T.grn,fontWeight:700,border:`1px solid ${T.grnM}`}}><svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Approved</span>}
                    </div>
                    <input type="number" value={row.present||""} disabled={!editingAtt} placeholder="0" min={0}
                      onChange={e=>setTodayCountRows(prev=>prev.map((rw,idx)=>idx===i?{...rw,present:Number(e.target.value),count:Number(e.target.value)}:rw))}
                      style={{padding:"7px 10px",borderRadius:6,border:`1px solid ${editingAtt?T.b1:"transparent"}`,fontSize:14,fontWeight:700,color:row.present>0?T.t1:T.t4,outline:"none",fontFamily:"inherit",background:editingAtt?T.surface:T.surfaceB,opacity:1,boxSizing:"border-box",textAlign:"center",cursor:editingAtt?"text":"default",transition:"border-color .12s"}}
                      onFocus={el=>{if(editingAtt)el.target.style.borderColor=T.blu;}}
                      onBlur={el=>{if(editingAtt)el.target.style.borderColor=T.b1;}}/>
                    <span style={{fontSize:12.5,fontWeight:600,color:T.t3,textAlign:"right",paddingRight:4,fontVariantNumeric:"tabular-nums"}}>₹{rate}/day</span>
                    <span style={{fontSize:13.5,fontWeight:700,color:wages>0?T.t1:T.t4,textAlign:"right",paddingRight:4,fontVariantNumeric:"tabular-nums"}}>
                      {wages>0?`₹${wages.toLocaleString()}`:"—"}
                    </span>
                  </div>
                );})}
                {!editingAtt&&todayCountRows.every(r=>!r.present)&&(
                  <div style={{textAlign:"center",color:T.t4,fontSize:12.5,padding:"16px 0"}}>No count recorded yet. Click "Mark Attendance" to enter.</div>
                )}
                {/* Vendor wages summary */}
                {!editingAtt&&todayCountRows.some(r=>r.present>0)&&(()=>{
                  const totalLab = todayCountRows.reduce((s,r)=>s+(Number(r.present)||0),0);
                  const totalWg  = todayCountRows.reduce((s,r)=>s+(Number(r.present)||0)*(Number(r.rate)||0),0);
                  return(
                    <div style={{marginTop:12,padding:"10px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:T.amb}}/>
                        <span style={{fontSize:10.5,color:T.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"}}>Vendor Daily Total</span>
                      </div>
                      <div style={{display:"flex",gap:20,alignItems:"baseline"}}>
                        <span style={{display:"inline-flex",alignItems:"baseline",gap:6,fontSize:11,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px"}}>Labour <b style={{color:T.t1,fontSize:18,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{totalLab}</b></span>
                        <span style={{display:"inline-flex",alignItems:"baseline",gap:6,fontSize:11,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px"}}>Wages <b style={{color:T.grn,fontSize:18,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>₹{totalWg.toLocaleString()}</b></span>
                      </div>
                    </div>
                  );
                })()}
                </>)}
              </>
            );})()}
          </div>
        )}
      </div>

      {/* ── HISTORY DRAWER (side-slide from right) ───────────────────── */}
      {showHistory&&(<>
        <style>{`@keyframes gbSlideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        <div onClick={()=>setShowHistory(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,animation:"fadeIn .15s ease-out"}}/>
        <div style={{position:"fixed",top:0,right:0,height:"100vh",width:560,maxWidth:"95vw",background:T.surface,boxShadow:"-8px 0 30px rgba(0,0,0,0.15)",zIndex:201,display:"flex",flexDirection:"column",animation:"gbSlideInRight .25s ease-out",fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif"}}>
          {/* Header */}
          <div style={{padding:"12px 16px",background:"#0D1B2A",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div>
              <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Attendance History</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>{TYPE_LABELS[labType]} · {historyRecs.length} record{historyRecs.length!==1?"s":""}</div>
            </div>
            <button onClick={()=>setShowHistory(false)} title="Close (Esc)"
              style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",padding:6,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .12s"}}
              onMouseEnter={el=>el.currentTarget.style.background="rgba(255,255,255,0.1)"}
              onMouseLeave={el=>el.currentTarget.style.background="none"}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          {/* Body */}
          <div style={{flex:1,overflowY:"auto"}}>
          {historyRecs.length===0
            ?<div style={{padding:"40px 18px",textAlign:"center",color:T.t4,fontSize:12.5}}>No history found.</div>
            :historyRecs.map((rec,i)=>{
              const recMode = rec.mode || mode; // use record's own mode
              const rPresent=recMode==="name"?(rec.entries||[]).filter(e=>e.status==="P").length:(rec.entries||[]).reduce((s,r)=>s+(Number(r.present)||0),0);
              const rHalf   =recMode==="name"?(rec.entries||[]).filter(e=>e.status==="H").length:0;
              const rTotal  =recMode==="name"?(rec.entries||[]).length:(rec.entries||[]).reduce((s,r)=>s+(Number(r.count)||0),0);
              const rWages  =recMode==="name"
                ?(rec.entries||[]).reduce((s,e)=>s+(e.status==="P"?Number(e.dailyRate)||0:e.status==="H"?(Number(e.dailyRate)||0)/2:0),0)
                :(rec.entries||[]).reduce((s,r)=>s+(Number(r.present)||0)*(Number(r.rate)||0),0);
              const isExpanded = expandedHistIdx === i;
              const recId = rec.id || rec.date || i;
              return(
                <div key={recId} style={{borderBottom:`1px solid ${T.b1}`}}>
                  <div onClick={()=>setExpandedHistIdx(isExpanded?null:i)}
                    style={{padding:"10px 15px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",background:isExpanded?T.surfaceB:"transparent"}}
                    onMouseEnter={el=>{if(!isExpanded)el.currentTarget.style.background=T.surfaceB;}}
                    onMouseLeave={el=>{if(!isExpanded)el.currentTarget.style.background="transparent";}}>
                    <div style={{minWidth:85}}>
                      {(()=>{
                        const raw = rec.date || rec.att_date || rec.created_at;
                        if (!raw) return <div style={{fontSize:12,color:T.t4}}>—</div>;
                        const datePart = String(raw).split("T")[0];
                        const d = new Date(datePart + "T00:00:00");
                        if (isNaN(d.getTime())) return <div style={{fontSize:12,color:T.t4}}>—</div>;
                        return <>
                          <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</div>
                          <div style={{fontSize:10.5,color:T.t4}}>{d.toLocaleDateString("en-IN",{weekday:"short",year:"2-digit"})}</div>
                        </>;
                      })()}
                    </div>
                    <div style={{flex:1,display:"flex",gap:12,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,color:T.grn,fontWeight:600}}>✓ {rPresent} Present</span>
                      {rHalf>0&&<span style={{fontSize:12,color:T.amb,fontWeight:600}}>½ {rHalf} Half</span>}
                      <span style={{fontSize:12,color:T.red}}>✗ {Math.max(0,rTotal-rPresent-rHalf)} Absent</span>
                      <span style={{fontSize:12,color:T.slt,fontWeight:600}}>₹{fmtN(rWages)}</span>
                    </div>
                    <Pill label={recMode==="name"?"Name-wise":"Count-wise"} c={TYPE_COLORS[labType]} bg={TYPE_BG[labType]}/>
                    <span style={{fontSize:11,color:T.t4,marginLeft:4}}>{isExpanded?"▲":"▼"}</span>
                  </div>
                  {isExpanded&&(
                    <div style={{padding:"10px 15px 14px",background:T.surfaceB,borderTop:`1px solid ${T.b1}`}}>
                      {(rec.entries||[]).length===0
                        ?<div style={{textAlign:"center",color:T.t4,fontSize:12,padding:"10px"}}>No entries recorded</div>
                        :recMode==="name"
                          ?<>
                            <div style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 90px 65px 60px 90px",gap:8,padding:"6px 8px",borderBottom:`1px solid ${T.b1}`,fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px"}}>
                              <div>Name</div><div>Role</div><div style={{textAlign:"center"}}>Status</div><div style={{textAlign:"center"}}>Hours</div><div style={{textAlign:"center"}}>OT</div><div style={{textAlign:"right"}}>Daily Rate</div>
                            </div>
                            {rec.entries.map((e,ei)=>(
                              <div key={ei}>
                                <div style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 90px 65px 60px 90px",gap:8,padding:"7px 8px",borderBottom:e.remark?"none":`1px dashed ${T.b1}`,fontSize:12,alignItems:"center",borderLeft:`3px solid ${e.status==="P"?T.grn+"55":e.status==="H"?T.amb+"55":T.red+"55"}`}}>
                                  <span style={{fontWeight:600,color:T.t1}}>{e.name}</span>
                                  <span style={{color:T.t3}}>{e.role||"—"}</span>
                                  <Pill label={e.status==="P"?"Present":e.status==="H"?"Half":"Absent"} c={e.status==="P"?T.grn:e.status==="H"?T.amb:T.red} bg={e.status==="P"?T.grnL:e.status==="H"?T.ambL:T.redL}/>
                                  <span style={{textAlign:"center",color:e.status!=="A"?T.t1:T.t4}}>{e.hours>0?e.hours+"h":"—"}</span>
                                  <span style={{textAlign:"center",color:T.t4}}>{e.ot>0?e.ot+"h":"—"}</span>
                                  <span style={{textAlign:"right",fontWeight:600,color:T.t1}}>₹{e.dailyRate||0}</span>
                                </div>
                                {e.status==="A" && e.remark && (
                                  <div style={{padding:"3px 8px 7px",borderBottom:`1px dashed ${T.b1}`,fontSize:11,color:T.red,fontStyle:"italic",borderLeft:`3px solid ${T.red+"55"}`}}>📝 {e.remark}</div>
                                )}
                              </div>
                            ))}
                          </>
                          :<>
                            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:8,padding:"6px 8px",borderBottom:`1px solid ${T.b1}`,fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px"}}>
                              <div>Skill / Role</div><div style={{textAlign:"center"}}>Present</div><div style={{textAlign:"right"}}>Rate</div><div style={{textAlign:"right"}}>Wages</div>
                            </div>
                            {rec.entries.map((e,ei)=>{
                              const wg = (Number(e.present)||0) * (Number(e.rate)||0);
                              return(
                                <div key={ei} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:8,padding:"7px 8px",borderBottom:`1px dashed ${T.b1}`,fontSize:12,alignItems:"center"}}>
                                  <span style={{fontWeight:600,color:T.t1}}>{e.role}</span>
                                  <span style={{textAlign:"center",fontWeight:700,color:T.amb}}>{e.present||0}</span>
                                  <span style={{textAlign:"right",color:T.t2}}>₹{e.rate||0}/day</span>
                                  <span style={{textAlign:"right",fontWeight:700,color:wg>0?T.grn:T.t4}}>{wg>0?`₹${wg.toLocaleString()}`:"—"}</span>
                                </div>
                              );
                            })}
                          </>
                      }
                      {rec.subcon_name&&<div style={{padding:"6px 8px",fontSize:11,color:T.t4}}>Subcontractor: <b style={{color:T.t2}}>{rec.subcon_name}</b></div>}
                      {rec.vendor_name&&<div style={{padding:"6px 8px",fontSize:11,color:T.t4}}>Labour Vendor: <b style={{color:T.t2}}>{rec.vendor_name}</b></div>}
                    </div>
                  )}
                </div>
              );
            })
          }
          </div>
        </div>
      </>)}

      {/* ── ADD WORKFORCE MODAL ───────────────────────────────────────── */}
      {showAddWf&&labType==="company"&&(<>
        <div onClick={()=>setShowAddWf(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",zIndex:301,width:480,maxWidth:"95vw",fontFamily:"'Segoe UI',sans-serif",overflow:"hidden",maxHeight:"88vh",display:"flex",flexDirection:"column"}}>
          {/* Header */}
          <div style={{background:"#0D1B2A",padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div>
              <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Appoint Labour to Project</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>Tick workers from library → they appear in daily attendance</div>
            </div>
            <button onClick={()=>setShowAddWf(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)"}}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Search */}
          <div style={{padding:"12px 16px 8px",flexShrink:0,borderBottom:`1px solid ${T.b1}`}}>
            <input value={libSearch} onChange={e=>setLibSearch(e.target.value)} placeholder="Search by name or role…" autoFocus
              style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surfaceB,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            {selectedLibIds.size>0&&<div style={{fontSize:11.5,color:T.blu,fontWeight:600,marginTop:6}}>{selectedLibIds.size} worker{selectedLibIds.size>1?"s":""} selected</div>}
          </div>

          {/* Checklist */}
          <div style={{overflowY:"auto",flex:1,padding:"8px 0"}}>
            {(()=>{
              const alreadyIds = new Set((workforce.company||[]).map(w=>w.lib_id||w.worker_id||w.id));
              const filtered = workerLib.filter(w=>
                !libSearch.trim() ||
                (w.name||"").toLowerCase().includes(libSearch.toLowerCase()) ||
                (w.role||w.trade||"").toLowerCase().includes(libSearch.toLowerCase())
              );
              if(!filtered.length) return(
                <div style={{padding:"24px 16px",textAlign:"center",color:T.t4,fontSize:12.5}}>
                  No workers in library.
                  <button onClick={()=>setShowNewWf(true)} style={{display:"block",margin:"10px auto 0",padding:"7px 16px",borderRadius:7,border:`1.5px dashed ${T.blu}`,background:T.bluL,color:T.blu,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                    + Add New Worker to Library
                  </button>
                </div>
              );
              return filtered.map((w,i)=>{
                const wid = w.id;
                const isAppointed = alreadyIds.has(wid);
                const isSelected  = selectedLibIds.has(wid);
                const rate = Number(w.daily_rate||w.rate_per_day)||0;
                return(
                  <div key={i} onClick={()=>{ if(isAppointed) return;
                    setSelectedLibIds(prev=>{ const s=new Set(prev); s.has(wid)?s.delete(wid):s.add(wid); return s; }); }}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"9px 16px",cursor:isAppointed?"default":"pointer",
                      background:isSelected?T.bluL:isAppointed?"#F8FAFC":"transparent",
                      borderBottom:`1px solid ${T.b1}`,opacity:isAppointed?.55:1,transition:"background .12s"}}
                    onMouseEnter={e=>{ if(!isAppointed&&!isSelected) e.currentTarget.style.background=T.surfaceB; }}
                    onMouseLeave={e=>{ if(!isAppointed&&!isSelected) e.currentTarget.style.background="transparent"; }}>
                    {/* Checkbox */}
                    <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${isAppointed?"#CBD5E1":isSelected?T.blu:T.b2}`,
                      background:isSelected?T.blu:isAppointed?"#F1F5F9":"white",
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {(isSelected||isAppointed)&&<svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    {/* Avatar */}
                    <div style={{width:32,height:32,borderRadius:"50%",background:isSelected?T.blu:"#334155",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>
                      {(w.name||"?")[0].toUpperCase()}
                    </div>
                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.name}</div>
                      <div style={{fontSize:11,color:T.t4}}>{w.role||w.trade||"Labour"}{w.category?" · "+w.category:""}</div>
                    </div>
                    {/* Rate */}
                    <div style={{textAlign:"right",flexShrink:0}}>
                      {rate>0&&<div style={{fontSize:12.5,fontWeight:700,color:T.grn}}>₹{rate}/day</div>}
                      {isAppointed&&<div style={{fontSize:10,color:T.t4,fontWeight:600}}>Already added</div>}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Add New Worker inline form */}
          {showNewWf&&(
            <div style={{padding:"12px 16px",borderTop:`1.5px solid ${T.blu}`,background:T.bluL,flexShrink:0}}>
              <div style={{fontSize:11,fontWeight:700,color:T.blu,marginBottom:8}}>NEW WORKER (saved to Library + appointed to project)</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <input value={wfForm.name} onChange={e=>setWfForm(p=>({...p,name:e.target.value}))} placeholder="Worker name *"
                  style={{padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit",gridColumn:"1/-1"}}/>
                <SearchSelect value={wfForm.role} options={ROLES}
                  onChange={v=>setWfForm(p=>({...p,role:v,dailyRate:p.dailyRate||getRateForRole(v)||""}))} placeholder="Select role..."/>
                <SearchSelect value={wfForm.category} options={["Unskilled","Semi-Skilled","Skilled","Highly Skilled"]}
                  onChange={v=>setWfForm(p=>({...p,category:v}))} placeholder="Select category..."/>
                <input type="number" value={wfForm.dailyRate} onChange={e=>setWfForm(p=>({...p,dailyRate:e.target.value}))}
                  placeholder={`Daily Rate ₹ (Card: ${getRateForRole(wfForm.role)||"—"})`}
                  style={{padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit"}}/>
                <input value={wfForm.phone} onChange={e=>setWfForm(p=>({...p,phone:e.target.value}))} placeholder="Phone (optional)"
                  style={{padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit"}}/>
                <input value={wfForm.city} onChange={e=>setWfForm(p=>({...p,city:e.target.value}))} placeholder="City (optional)"
                  style={{padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div style={{display:"flex",gap:7}}>
                <button onClick={()=>setShowNewWf(false)} style={{flex:1,padding:"7px",borderRadius:6,border:`1px solid ${T.b1}`,background:"white",fontSize:12,cursor:"pointer",color:T.t3}}>Cancel</button>
                <button onClick={addNewWorker} disabled={wfSaving||!wfForm.name.trim()}
                  style={{flex:2,padding:"7px",borderRadius:6,border:"none",background:wfForm.name.trim()?T.blu:"#ccc",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",opacity:wfSaving?.7:1}}>
                  {wfSaving?"Saving…":"Save & Appoint"}
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{padding:"11px 16px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:8,alignItems:"center",flexShrink:0,background:T.surface}}>
            <button onClick={()=>setShowNewWf(p=>!p)}
              style={{padding:"7px 14px",borderRadius:7,border:`1.5px dashed ${T.blu}`,background:showNewWf?T.bluL:"transparent",color:T.blu,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              + New Worker
            </button>
            <div style={{flex:1}}/>
            <button onClick={()=>setShowAddWf(false)} style={{padding:"7px 14px",borderRadius:7,border:`1px solid ${T.b1}`,background:T.surface,fontSize:12,color:T.t3,cursor:"pointer"}}>Cancel</button>
            <button onClick={appointSelected} disabled={wfSaving||!selectedLibIds.size}
              style={{padding:"7px 18px",borderRadius:7,border:"none",background:selectedLibIds.size?T.blu:"#ccc",color:"white",fontSize:12,fontWeight:700,cursor:selectedLibIds.size?"pointer":"not-allowed",opacity:wfSaving?.7:1}}>
              {wfSaving?"Appointing…":`Appoint${selectedLibIds.size?" ("+selectedLibIds.size+")":""}`}
            </button>
          </div>
        </div>
      </>)}

      {/* Old vendor/subcon Add modal (non-company) */}
      {showAddWf&&labType!=="company"&&(<>
        <div onClick={()=>setShowAddWf(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.22)",zIndex:301,width:420,fontFamily:"'Segoe UI',sans-serif",overflow:"hidden",maxHeight:"90vh",overflowY:"auto"}}>
          <div style={{background:"#0D1B2A",padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0}}>
            <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Add {TYPE_LABELS[labType]} to Project</div>
            <button onClick={()=>setShowAddWf(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)"}}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{padding:"14px 16px"}}>
            {[
              {l:"Name *",key:"name",type:"text",ph:TYPE_LABELS[labType]+" name"},
              {l:"Role",key:"role",type:"select",opts:ROLES},
              {l:"Daily Rate (₹)",key:"dailyRate",type:"number",ph:`Rate Card: ₹${getRateForRole(wfForm.role)||"—"}`},
              {l:"Phone",key:"phone",type:"text",ph:"Optional"},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>{f.l}</div>
                {f.type==="select"
                  ?<select value={wfForm[f.key]||""} onChange={e=>{const v=e.target.value;setWfForm(p=>({...p,role:v,dailyRate:p.dailyRate||getRateForRole(v)||""}));}}
                      style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
                      {f.opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                  :<input type={f.type} value={wfForm[f.key]||""} onChange={e=>setWfForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph}
                      style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>}
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:6}}>
              <button onClick={()=>setShowAddWf(false)} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
              <button onClick={async()=>{
                if(!wfForm.name.trim()) return; setWfSaving(true);
                const cardRate=getRateForRole(wfForm.role);
                const payload={project_id:projectId,type:labType,name:wfForm.name,role:wfForm.role,daily_rate:Number(wfForm.dailyRate)||cardRate,phone:wfForm.phone,rateStatus:"card"};
                const r=await api.post(`/projects/${projectId}/workforce`,payload);
                if(r.success){setWorkforce(prev=>({...prev,[labType]:[...prev[labType],{...payload,id:r.data?.id||Date.now(),dailyRate:payload.daily_rate}]}));setShowAddWf(false);}
                setWfSaving(false);
              }} disabled={wfSaving||!wfForm.name.trim()}
                style={{flex:2,padding:"9px",borderRadius:7,background:wfForm.name.trim()?TYPE_COLORS[labType]:"#ccc",color:"white",fontSize:12,fontWeight:700,border:"none",cursor:wfForm.name.trim()?"pointer":"not-allowed",opacity:wfSaving?.7:1}}>
                {wfSaving?"Adding…":"Add to Workforce"}
              </button>
            </div>
          </div>
        </div>
      </>)}

      {/* ── SKILLS LIBRARY DRAWER (subcon only — vendor uses Add Vendor modal) ── */}
      {showSkillDrawer && selSubconId && labType==="subcon" && (<>
        <div onClick={()=>setShowSkillDrawer(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,backdropFilter:"blur(2px)"}}/>
        <div style={{position:"fixed",top:0,right:0,bottom:0,width:460,maxWidth:"95vw",background:"white",boxShadow:"-8px 0 32px rgba(0,0,0,0.18)",zIndex:301,display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .25s ease-out"}}>
          <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
          {/* Header (subcon green) */}
          <div style={{padding:"16px 20px",borderBottom:`2px solid ${T.grn}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <button onClick={()=>setShowSkillDrawer(false)}
              style={{background:"none",border:"none",cursor:"pointer",color:T.t3,padding:6,display:"flex",borderRadius:6}}
              onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div style={{fontSize:14.5,fontWeight:700,color:T.t1,letterSpacing:".3px"}}>SUBCON SKILLS</div>
            <button onClick={async()=>{
                setSkillSaving(true);
                const existingSkills = new Set(subconSkills.map(s=>s.skill));
                const toAdd = [...drawerSelected].filter(s=>!existingSkills.has(s));
                const toRemove = subconSkills.filter(s=>!drawerSelected.has(s.skill));
                for (const sk of toAdd) {
                  try {
                    const r = await api.post("/labour-vendors/subcon-skills/"+selSubconId,{skill:sk});
                    if(r.success) setSubconSkills(p=>[...p,r.data]);
                  } catch(_){}
                }
                for (const sk of toRemove) {
                  try {
                    await api.del("/labour-vendors/subcon-skills/"+selSubconId+"/"+sk.id);
                    setSubconSkills(p=>p.filter(x=>x.id!==sk.id));
                  } catch(_){}
                }
                setSkillSaving(false);
                setShowSkillDrawer(false);
              }} disabled={skillSaving}
              style={{padding:"7px 18px",borderRadius:7,border:"none",background:T.grn,color:"white",fontSize:12.5,fontWeight:700,cursor:"pointer",opacity:skillSaving?.6:1,boxShadow:`0 2px 8px ${T.grn}55`}}>
              {skillSaving?"Saving…":"Save"}
            </button>
          </div>

          {/* Search */}
          <div style={{padding:"14px 20px",flexShrink:0}}>
            <div style={{position:"relative"}}>
              <input value={drawerSearch} onChange={e=>setDrawerSearch(e.target.value)} placeholder="Search Skill" autoFocus
                style={{width:"100%",padding:"10px 38px 10px 14px",borderRadius:9,border:`1.5px solid ${T.b1}`,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box",background:T.surfaceB}}
                onFocus={e=>e.target.style.borderColor=T.grn}
                onBlur={e=>e.target.style.borderColor=T.b1}/>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={2}
                style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)"}}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </div>
          </div>

          {/* Selection counter + Add new */}
          <div style={{padding:"0 20px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <span style={{fontSize:12,color:T.t3,fontWeight:600}}>
              Select <b style={{color:T.grn}}>({drawerSelected.size})</b>
            </span>
            <button onClick={()=>{
                const s = window.prompt("New skill name:");
                if(s && s.trim()) {
                  setDrawerSelected(p=>new Set([...p, s.trim()]));
                  setDrawerNewSkill(s.trim());
                }
              }}
              style={{background:"none",border:"none",color:T.grn,fontSize:12,fontWeight:600,cursor:"pointer",padding:"4px 8px",borderRadius:5,display:"flex",alignItems:"center",gap:4}}
              onMouseEnter={e=>e.currentTarget.style.background=T.grnL}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <span style={{fontSize:14}}>+</span> New Skill
            </button>
          </div>

          {/* Skill list */}
          <div style={{flex:1,overflowY:"auto",padding:"0 20px 20px"}}>
            {(()=>{
              const allSkills = [...new Set([
                ...ROLES.filter(r=>r!=="Other"),
                ...subconSkills.map(s=>s.skill),
                ...(drawerNewSkill ? [drawerNewSkill] : []),
              ])];
              const filtered = allSkills.filter(s =>
                !drawerSearch.trim() || s.toLowerCase().includes(drawerSearch.toLowerCase())
              );
              if(!filtered.length) return(
                <div style={{padding:"30px 12px",textAlign:"center",color:T.t4,fontSize:12.5}}>
                  No skills match "{drawerSearch}"
                </div>
              );
              return filtered.map((skill,i)=>{
                const isSelected = drawerSelected.has(skill);
                return(
                  <div key={skill} onClick={()=>setDrawerSelected(prev=>{
                      const s = new Set(prev);
                      s.has(skill) ? s.delete(skill) : s.add(skill);
                      return s;
                    })}
                    style={{display:"flex",alignItems:"center",gap:13,padding:"13px 14px",cursor:"pointer",borderRadius:9,marginBottom:6,background:isSelected?T.grnL:"transparent",border:`1.5px solid ${isSelected?T.grn+"55":"transparent"}`,transition:"all .12s"}}
                    onMouseEnter={el=>{ if(!isSelected) el.currentTarget.style.background=T.surfaceB; }}
                    onMouseLeave={el=>{ if(!isSelected) el.currentTarget.style.background="transparent"; }}>
                    <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${isSelected?T.grn:T.b2}`,background:isSelected?T.grn:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .12s"}}>
                      {isSelected&&<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3.5}><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    <span style={{flex:1,fontSize:13.5,fontWeight:600,color:isSelected?T.grn:T.t1}}>{skill}</span>
                    {!ROLES.includes(skill)&&<span style={{fontSize:9.5,padding:"2px 8px",borderRadius:10,background:T.purL,color:T.pur,fontWeight:700,letterSpacing:".3px"}}>CUSTOM</span>}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </>)}

      {/* ── ADD LABOUR VENDOR MODAL ──────────────────────────────────── */}
      {showAddVendor&&(<>
        <style>{`@keyframes gbSlideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        <div onClick={()=>setShowAddVendor(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300}}/>
        <div style={{position:"fixed",top:0,right:0,height:"100vh",width:620,maxWidth:"95vw",background:T.surface,boxShadow:"-8px 0 30px rgba(0,0,0,0.18)",zIndex:301,fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column",animation:"gbSlideInRight .25s ease-out"}}>
          <div style={{background:"#0D1B2A",padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div>
              <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Add Labour Vendor</div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>Vendor info + skills they supply with rates (auto from rate card)</div>
            </div>
            <button onClick={()=>setShowAddVendor(false)} title="Close"
              style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",padding:6,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .12s"}}
              onMouseEnter={el=>el.currentTarget.style.background="rgba(255,255,255,0.1)"}
              onMouseLeave={el=>el.currentTarget.style.background="none"}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{padding:"14px 18px",overflowY:"auto",flex:1}}>
            {/* Vendor info */}
            <div style={{fontSize:11,fontWeight:700,color:T.amb,marginBottom:10,letterSpacing:".4px"}}>1. VENDOR DETAILS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div style={{gridColumn:"1/-1"}}>
                <div style={{fontSize:10,fontWeight:600,color:T.t3,marginBottom:4}}>VENDOR / FIRM NAME *</div>
                <input value={vForm.name} onChange={e=>setVForm(p=>({...p,name:e.target.value}))} placeholder="e.g. ABC Manpower Supply"
                  style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:T.t3,marginBottom:4}}>OWNER / CONTACT</div>
                <input value={vForm.owner} onChange={e=>setVForm(p=>({...p,owner:e.target.value}))} placeholder="Owner name"
                  style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:T.t3,marginBottom:4}}>PHONE</div>
                <input value={vForm.phone} onChange={e=>setVForm(p=>({...p,phone:e.target.value}))} placeholder="+91 XXXXX XXXXX"
                  style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:T.t3,marginBottom:4}}>CITY</div>
                <input value={vForm.city} onChange={e=>setVForm(p=>({...p,city:e.target.value}))} placeholder="City"
                  style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:T.t3,marginBottom:4}}>GSTIN</div>
                <input value={vForm.gstin} onChange={e=>setVForm(p=>({...p,gstin:e.target.value}))} placeholder="22AABC..."
                  style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
            </div>

            {/* Skills */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,paddingTop:6,borderTop:`1px solid ${T.b1}`}}>
              <div style={{fontSize:11,fontWeight:700,color:T.amb,letterSpacing:".4px",marginTop:8}}>2. SKILLS SUPPLIED + RATES</div>
              <span style={{fontSize:10.5,color:T.t4}}>Rate ≠ Card → admin approval needed</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1.5fr 100px 100px 28px",gap:8,marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${T.b1}`}}>
              <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".3px"}}>Skill</div>
              <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".3px",textAlign:"right"}}>Card Rate</div>
              <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".3px",textAlign:"right"}}>Vendor Rate</div>
              <div/>
            </div>
            {/* Available skills come from Labour Rate Card */}
            {(()=>{
              const usedSkills = new Set(vSkills.map(s => s.skill));
              const availableRC = rateCard.filter(rc => {
                const rname = rc.role || rc.name || rc.skill;
                return rname && !usedSkills.has(rname);
              });
              return null; // just for closure
            })()}
            {vSkills.map((s,i)=>{
              const cardRate = getRateForRole(s.skill);
              const differs  = cardRate>0 && Number(s.rate) !== cardRate;
              // Skills already used in other rows (to disable in dropdown)
              const otherUsed = new Set(vSkills.filter((_,idx)=>idx!==i).map(x=>x.skill));
              return(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1.5fr 100px 100px 28px",gap:8,marginBottom:6,alignItems:"center"}}>
                  <select value={s.skill}
                    onChange={e=>{ const sk=e.target.value; const cr=getRateForRole(sk)||0; setVSkills(prev=>prev.map((sx,idx)=>idx===i?{...sx,skill:sk,card_rate:cr,rate:cr||sx.rate}:sx)); }}
                    style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit",background:"white"}}>
                    {/* If current skill not in rate card, still keep it visible */}
                    {!rateCard.some(rc => (rc.role||rc.name||rc.skill) === s.skill) && s.skill && (
                      <option value={s.skill}>{s.skill} (no card)</option>
                    )}
                    {rateCard.length === 0 && <option value="">— No rate card entries —</option>}
                    {rateCard.map(rc => {
                      const rname = rc.role || rc.name || rc.skill;
                      if (!rname) return null;
                      const disabled = otherUsed.has(rname);
                      return <option key={rc.id} value={rname} disabled={disabled}>
                        {rname}{disabled ? " (already added)" : ""}
                      </option>;
                    })}
                  </select>
                  <input type="number" value={cardRate||""} disabled placeholder="—"
                    title="From Library → Labour Rate Card"
                    style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,fontWeight:600,color:cardRate>0?T.grn:T.t4,outline:"none",fontFamily:"inherit",background:cardRate>0?T.grnL:T.surfaceB,boxSizing:"border-box",textAlign:"right"}}/>
                  <input type="number" value={s.rate||""} placeholder="0" min={0}
                    onChange={e=>setVSkills(prev=>prev.map((sx,idx)=>idx===i?{...sx,rate:Number(e.target.value)}:sx))}
                    style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${differs?T.ambM:T.b1}`,fontSize:13,fontWeight:700,color:differs?T.amb:T.t1,outline:"none",fontFamily:"inherit",background:differs?T.ambL:"white",boxSizing:"border-box",textAlign:"right"}}/>
                  <button onClick={()=>setVSkills(prev=>prev.filter((_,idx)=>idx!==i))}
                    style={{width:28,height:28,borderRadius:6,border:`1px solid ${T.redM}`,background:T.redL,color:T.red,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                </div>
              );
            })}
            {rateCard.length === 0 && (
              <div style={{padding:"10px 13px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:6,marginTop:8,fontSize:12,color:T.red}}>
                ⚠️ Labour Rate Card khali hai. Pehle <b>Library → Labour Rate Card</b> mein skills + rates add karo, phir vendor add karo.
              </div>
            )}
            {vSkills.some(s=>{ const cr=getRateForRole(s.skill); return cr>0 && Number(s.rate)!==cr; })&&(
              <div style={{padding:"7px 11px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:6,marginTop:8,fontSize:11.5,color:T.amb}}>
                ⚠️ Some rates differ from rate card — these will need admin approval before getting "approved" status
              </div>
            )}
            <button onClick={()=>{
                const usedSkills = new Set(vSkills.map(s=>s.skill));
                const firstAvailable = rateCard.find(rc => {
                  const rname = rc.role||rc.name||rc.skill;
                  return rname && !usedSkills.has(rname);
                });
                const skill = firstAvailable ? (firstAvailable.role||firstAvailable.name||firstAvailable.skill) : "";
                const cardRate = skill ? getRateForRole(skill) : 0;
                setVSkills(prev=>[...prev,{ skill, rate:cardRate, card_rate:cardRate }]);
              }} disabled={rateCard.length === 0}
              style={{padding:"6px 14px",borderRadius:6,border:`1.5px dashed ${T.amb}`,background:T.ambL,color:T.amb,fontSize:12,fontWeight:600,cursor:rateCard.length?"pointer":"not-allowed",marginTop:8,opacity:rateCard.length?1:.5}}>
              + Add Skill {rateCard.length === 0 ? "(rate card empty)" : ""}
            </button>
          </div>
          {/* Footer */}
          <div style={{padding:"11px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:8,flexShrink:0,background:T.surface}}>
            <button onClick={()=>setShowAddVendor(false)} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
            <button onClick={async()=>{
              if(!vForm.name.trim()) return alert("Vendor name required");
              const validSkills = vSkills.filter(s=>s.skill && Number(s.rate)>0);
              if(!validSkills.length) return alert("Add at least one skill with rate");
              setVSaving(true);
              try {
                const res = await api.post("/labour-vendors", {
                  ...vForm, name: vForm.name.trim(),
                  skills: validSkills.map(s=>({ skill:s.skill, rate:Number(s.rate), card_rate:getRateForRole(s.skill)||0 })),
                });
                if(res.success) {
                  // refresh vendor list
                  const r = await api.get("/labour-vendors");
                  if(r.success) setVendorLib(r.data||[]);
                  setSelVendorId(String(res.data.id));
                  setShowAddVendor(false);
                } else {
                  alert(res.message || "Save failed");
                }
              } catch(e) { alert("Error: " + e.message); }
              setVSaving(false);
            }} disabled={vSaving||!vForm.name.trim()}
              style={{flex:2,padding:"9px",borderRadius:7,background:vForm.name.trim()?T.amb:"#ccc",color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:vForm.name.trim()?"pointer":"not-allowed",opacity:vSaving?.7:1}}>
              {vSaving?"Saving...":"Save Vendor + Skills"}
            </button>
          </div>
        </div>
      </>)}

      {/* ── RATE CHANGE APPROVAL MODAL ────────────────────────────────── */}
      {showRateModal&&rateReqWorker&&(<>
        <div onClick={()=>setShowRateModal(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.22)",zIndex:301,width:380,fontFamily:"'Segoe UI',sans-serif",overflow:"hidden"}}>
          <div style={{background:"#0D1B2A",padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Request Rate Change</div>
            <button onClick={()=>setShowRateModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)"}}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{padding:"14px 16px"}}>
            <div style={{padding:"10px 13px",background:T.surfaceB,borderRadius:7,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${T.b1}`}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{rateReqWorker.name}</div>
                <div style={{fontSize:11.5,color:T.t4}}>{rateReqWorker.role} · {TYPE_LABELS[labType]}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10.5,color:T.t4}}>Current Rate</div>
                <div style={{fontSize:16,fontWeight:700,color:T.t1}}>₹{rateReqWorker.dailyRate||rateReqWorker.daily_rate||0}/day</div>
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>New Rate (₹/day) *</div>
              <input type="number" value={newRateVal} onChange={e=>setNewRateVal(e.target.value)} placeholder="Enter new daily rate…"
                style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.amb} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>Reason (optional)</div>
              <textarea value={rateReason} onChange={e=>setRateReason(e.target.value)} placeholder="Reason for rate change…" rows={2}
                style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none"}}
                onFocus={e=>e.target.style.borderColor=T.amb} onBlur={e=>e.target.style.borderColor=T.b1}/>
            </div>
            <div style={{padding:"8px 11px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:6,marginBottom:12,fontSize:11.5,color:T.amb}}>
              This request will be sent to admin for approval. Current rate continues to apply until approved.
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowRateModal(false)} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
              <button onClick={submitRateApproval} disabled={rateSaving||!newRateVal}
                style={{flex:2,padding:"9px",borderRadius:7,background:newRateVal?T.amb:"#ccc",color:"white",fontSize:12,fontWeight:700,border:"none",cursor:newRateVal?"pointer":"not-allowed",opacity:rateSaving?.7:1}}>
                {rateSaving?"Sending…":"Submit for Approval"}
              </button>
            </div>
          </div>
        </div>
      </>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 9 — MATERIAL (Site Stock)
// ═══════════════════════════════════════════════════════════════════
function TabMaterial({ project }) {
  const projectId   = project?.id || 1;
  const projectName = project?.name || "Project";

  // ── Tab state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("requests"); // requests | ledger | inventory

  // ── Requests tab state (existing) ──────────────────────────
  const [materials, setMaterials] = useState([]);
  const [fStage, setFStage] = useState("All");
  const [fMaterial, setFMaterial] = useState("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("tile");
  const [showModal, setShowModal] = useState(false);
  const [showAddMat, setShowAddMat] = useState(false);
  const [newMatName, setNewMatName] = useState("");
  const [newMatUnit, setNewMatUnit] = useState("Nos");
  const [newMatSaving, setNewMatSaving] = useState(false);
  const [showGRN, setShowGRN] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ item_name:"", quantity:"", unit:"Bags", required_date:"", approx_amount:"", notes:"" });
  const [grnTab, setGrnTab] = useState("ordered");
  const [orderedMRs, setOrderedMRs] = useState([]);
  const [grnRows, setGrnRows] = useState({});
  const [directRows, setDirectRows] = useState([{id:1, item_name:"", qty:"", unit:"Bags", vendor:"", challan:"", received_by:""}]);
  const [grnSaving, setGrnSaving] = useState(false);
  const [grnDone, setGrnDone] = useState([]);
  const [directGrns, setDirectGrns] = useState([]); // Direct GRNs without MR
  const [vendorList, setVendorList] = useState([]);
  const [usedLog, setUsedLog] = useState([]);
  const [usedLogLoading, setUsedLogLoading] = useState(false);
  const [showUsedLog, setShowUsedLog] = useState(false);
  const [ulFilterMat, setUlFilterMat] = useState("");
  const [ulFilterTask, setUlFilterTask] = useState("");
  const [ulFilterBy, setUlFilterBy] = useState("");
  const [ulFilterFrom, setUlFilterFrom] = useState("");
  const [ulFilterTo, setUlFilterTo] = useState("");
  const [invExpandedMat, setInvExpandedMat] = useState(null);
  const [invUsedForm, setInvUsedForm] = useState({});
  const [invUsedSaving, setInvUsedSaving] = useState(false);
  const UNITS_MR = ["Bags","MT","Nos","Loads","Sqft","Mtrs","Kg","Sheets","Ltrs","Cu.m","Ton","RFT","Brass"];
  const [matLibReal, setMatLibReal] = useState([]);
  const MAT_LIB = matLibReal.map(m => m.name);

  // ── Ledger tab state ────────────────────────────────────────
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerLoaded, setLedgerLoaded] = useState(false);
  const [expandedMat, setExpandedMat] = useState(null);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerVendor, setLedgerVendor] = useState("All");

  // ── Inventory tab state ─────────────────────────────────────
  const [inventory, setInventory] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invLoaded, setInvLoaded] = useState(false);

  const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}) : "—";
  const fmtN = n => n >= 10000000 ? (n/10000000).toFixed(1)+"Cr" : n >= 100000 ? (n/100000).toFixed(1)+"L" : n >= 1000 ? (n/1000).toFixed(1)+"K" : String(n||0);

  useEffect(() => {
    api.get("/library/materials").then(r => {
      if (r.success && r.data?.length > 0) setMatLibReal(r.data);
    }).catch(() => {});
    api.get("/procurement/vendors").then(r => {
      if (r.success) setVendorList(r.data || []);
    }).catch(() => {});
  }, [projectId]);

  const loadMRs = () => {
    // Fetch both MRs and direct GRNs (no linked MR) in parallel
    Promise.all([
      api.get("/procurement/mrs?project_id=" + projectId),
      api.get("/procurement/grns?project_id=" + projectId),
    ]).then(([mrRes, grnRes]) => {
      const mrEntries = (mrRes.success && Array.isArray(mrRes.data))
        ? mrRes.data.map(m => ({
            id: m.id, name: m.item_name,
            qty: (parseFloat(m.quantity)||0) + " " + (m.unit||""),
            stage: m.stage || "Requested",
            by: m.requested_by || "Site Team",
            date: m.created_at ? new Date(m.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) : "—",
            vendor: m.linked_vendor || null,
            amt: parseFloat(m.approx_amount) || 0,
          }))
        : [];

      // Direct GRNs = grn_entries with po_id=null (no PO/MR linked).
      // Exclude Auto-Bill GRNs — those are synthesized by the bill flow; they live
      // in inventory but don't represent a separate site receipt here, so showing
      // them as Direct cards visually duplicates the original GRN row.
      const directEntries = [];
      if (grnRes.success && Array.isArray(grnRes.data)) {
        grnRes.data
          .filter(g => !g.po_id && !g.linked_mr_id && g.grn_type !== "Auto-Bill")
          .forEach(g => {
            (g.items || []).forEach((item, i) => {
              directEntries.push({
                id: "d-" + g.id + "-" + i,
                name: item.description || item.item_name || "Material",
                qty: (Number.isInteger(Number(item.received_qty)) ? Number(item.received_qty) : parseFloat(item.received_qty||0)) + " " + (item.unit || ""),
                stage: "Received",
                by: g.received_by || "Site",
                date: g.received_date ? new Date(g.received_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) : "—",
                vendor: g.vendor_name || null,
                amt: 0,
                isDirect: true,
                challan: g.challan_no,
                grn_number: g.grn_number,
              });
            });
          });
      }

      // Dedupe: if a Direct GRN exists for the same material (case-insensitive)
      // AND an MR for the same material is sitting in "Received" status, drop
      // the MR card. The GRN card represents the actual receipt — keeping both
      // makes it look like the same delivery happened twice (user reported
      // Distemper showing twice while Inventory was correct).
      const norm = s => (s || "").toString().trim().toLowerCase();
      const receivedDirectMaterials = new Set(
        directEntries.map(d => norm(d.name))
      );
      const dedupedMrEntries = mrEntries.filter(m => {
        const isReceivedStage = norm(m.stage) === "received";
        if (!isReceivedStage) return true;            // pending / approved / ordered → keep
        return !receivedDirectMaterials.has(norm(m.name));
      });

      setMaterials([...directEntries, ...dedupedMrEntries]);
    }).catch(() => {});
  };

  useEffect(() => {
    if (!projectId) return;
    loadMRs();
  }, [projectId]);

  // Load ledger on tab switch
  useEffect(() => {
    if (activeTab === "ledger" && !ledgerLoaded && projectId) {
      setLedgerLoading(true);
      api.get("/tasks/project/" + projectId + "/material-ledger").then(r => {
        if (r.success) setLedger(r.data || []);
        setLedgerLoaded(true);
        setLedgerLoading(false);
      }).catch(() => setLedgerLoading(false));
    }
    if (activeTab === "inventory" && !invLoaded && projectId) {
      setInvLoading(true);
      api.get("/tasks/project/" + projectId + "/inventory").then(r => {
        if (r.success) setInventory(r.data || []);
        setInvLoaded(true);
        setInvLoading(false);
      }).catch(() => setInvLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (!showGRN || !projectId) return;
    api.get("/procurement/mrs?project_id=" + projectId + "&stage=Ordered")
      .then(res => { if (res.success) setOrderedMRs(res.data||[]); }).catch(()=>{});
  }, [showGRN, projectId]);

  // GRN handlers
  const handleReceiveMR = async (mrId) => {
    const row = grnRows[mrId] || {};
    if (!row.challan) { alert("Challan number required"); return; }
    setGrnSaving(true);
    try {
      const mr = orderedMRs.find(m => m.id === mrId);
      const res = await api.patch("/procurement/mrs/" + mrId + "/mark-received", {
        challan_no: row.challan,
        received_qty: parseFloat(row.received_qty) || parseFloat(mr?.quantity) || 0,
      });
      if (res.success) {
        setGrnDone(p => [...p, mrId]);
        // Reload ledger + requests directly
        api.get("/tasks/project/" + projectId + "/material-ledger").then(r => {
          if (r.success) { setLedger(r.data || []); setLedgerLoaded(true); }
        }).catch(() => {});
        api.get("/procurement/mrs?project_id=" + projectId).then(res2 => {
          if (res2.success && Array.isArray(res2.data)) {
            setMaterials(res2.data.map(m => ({
              id: m.id, name: m.item_name,
              qty: (parseFloat(m.quantity)||0) + " " + (m.unit||""),
              stage: m.stage || "Requested",
              by: m.requested_by || "Site Team",
              date: m.created_at ? new Date(m.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) : "—",
              vendor: m.linked_vendor || null, amt: parseFloat(m.approx_amount) || 0,
            })));
          }
        }).catch(() => {});
      }
      else alert(res.message || "Failed");
    } catch(e) { alert(e.message); }
    setGrnSaving(false);
  };

  const handleDirectReceive = async () => {
    const validRows = directRows.filter(r => r.item_name && r.qty && r.challan && r.vendor);
    if (!validRows.length) { alert("Material name, qty, vendor aur challan — sab required hain"); return; }
    const missingVendor = directRows.find(r => (r.item_name || r.qty || r.challan) && !r.vendor);
    if (missingVendor) { alert("Vendor name compulsory hai — har row me set karo"); return; }
    setGrnSaving(true);
    try {
      const res = await api.post("/procurement/grns", {
        po_id: null,
        vendor_name: validRows[0].vendor || null,
        project_id: projectId,
        project_name: projectName,
        challan_no: validRows[0].challan,
        received_by: validRows[0].received_by || null,
        received_date: new Date().toISOString().split("T")[0],
        items: validRows.map(r => ({
          po_item_id: null,
          description: r.item_name,
          ordered_qty: parseFloat(r.qty),
          received_qty: parseFloat(r.qty),
          unit: r.unit || "Bags",
        })),
      });
      if (res.success) {
        setShowGRN(false);
        setDirectRows([{id:1, item_name:"", qty:"", unit:"Bags", vendor:"", challan:"", received_by:""}]);
        // Reload MRs + direct GRNs + ledger + inventory
        loadMRs();
        // Reload ledger + inventory
        setLedgerLoading(true);
        api.get("/tasks/project/" + projectId + "/material-ledger").then(r => {
          if (r.success) setLedger(r.data || []);
          setLedgerLoaded(true);
          setLedgerLoading(false);
        }).catch(() => setLedgerLoading(false));
        setInvLoading(true);
        api.get("/tasks/project/" + projectId + "/inventory").then(r => {
          if (r.success) setInventory(r.data || []);
          setInvLoaded(true);
          setInvLoading(false);
        }).catch(() => setInvLoading(false));
        alert("GRN created: " + res.grn_number);
      } else {
        alert(res.message || "GRN failed");
      }
    } catch(e) { alert(e.message); }
    setGrnSaving(false);
  };

  const handleSubmitMR = async () => {
    if (!form.item_name || !form.quantity) return;
    setSaving(true);
    try {
      const res = await api.post("/procurement/mrs", {
        project_id: projectId, project_name: projectName,
        item_name: form.item_name, quantity: parseFloat(form.quantity),
        unit: form.unit, required_date: form.required_date || null,
        approx_amount: form.approx_amount ? parseFloat(form.approx_amount) : null,
        notes: form.notes || null, requested_by: "Site Team",
      });
      if (res.success) {
        api.post("/approvals/submit", {
          module: "Material Request",
          ref_id: res.data.id,
          ref_no: res.data.mr_number || "",
          title: form.item_name + " (" + form.quantity + " " + form.unit + ")",
          amount: Number(form.approx_amount) || 0,
          project_id: projectId,
          project_name: projectName || "",
        }).catch(e => console.error("Approval submit:", e));
        const m = res.data;
        setMaterials(prev => [{ id:m.id, name:m.item_name, qty:m.quantity+" "+m.unit,
          stage:"Requested", by:"Site Team",
          date:new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
          vendor:null, amt:parseFloat(m.approx_amount)||0 }, ...prev]);
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

  // Ledger filtered
  const allVendors = ["All", ...new Set(ledger.flatMap(m => m.receipts.map(r => r.vendor_name)).filter(v => v && v !== "—"))];
  const ledgerFiltered = ledger.filter(m => {
    if (ledgerSearch && !m.material_name.toLowerCase().includes(ledgerSearch.toLowerCase())) return false;
    if (ledgerVendor !== "All" && !m.receipts.some(r => r.vendor_name === ledgerVendor)) return false;
    return true;
  });

  const TABS = [{id:"requests",l:"Requests"},{id:"ledger",l:"Material Ledger"},{id:"inventory",l:"Inventory"}];

  return (
    <div style={{padding:"14px 18px"}}>

      {/* ── TAB SWITCHER ── */}
      <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:"2px solid "+T.b1}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{padding:"9px 16px",border:"none",background:"none",fontSize:13,fontWeight:activeTab===t.id?700:400,
              color:activeTab===t.id?T.blu:T.t3,borderBottom:activeTab===t.id?"2px solid "+T.blu:"2px solid transparent",
              cursor:"pointer",marginBottom:-2,transition:"all .15s"}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1: REQUESTS (existing UI — unchanged)
      ══════════════════════════════════════════════════════ */}
      {activeTab==="requests"&&(<>

        {/* NEW REQUEST MODAL */}
        {showModal && (<>
          <div onClick={()=>setShowModal(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.32)",zIndex:400,backdropFilter:"blur(2px)"}}/>
          <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:10,boxShadow:"0 20px 60px rgba(0,0,0,0.18)",zIndex:401,width:440,fontFamily:"'Segoe UI',sans-serif",overflow:"hidden"}}>
            <div style={{background:"#0D1B2A",padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>New Material Request</div>
                <div style={{fontSize:10.5,color:"rgba(255,255,255,0.45)",marginTop:1}}>{projectName}</div>
              </div>
              <button onClick={()=>setShowModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:20,lineHeight:1}}>×</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:T.ambL,border:"1px solid "+T.ambM,borderRadius:7,padding:"8px 11px",fontSize:11.5,color:T.amb}}>
                Request Procurement mein jayegi — Admin approve karenge phir order hoga
              </div>
              <div>
                <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Material Name *</label>
                <SearchSelect value={form.item_name}
                  options={matLibReal.map(m=>({key:m.name,label:`${m.name}${m.unit?` (${m.unit})`:""}`}))}
                  onChange={v=>{const found=matLibReal.find(m=>m.name===v);setForm(p=>({...p,item_name:v,unit:found?.unit||p.unit}));}}
                  placeholder="Search material from library..."/>
                {!showAddMat ? (
                  <button type="button" onClick={()=>{setShowAddMat(true);setNewMatName("");setNewMatUnit("Nos");}}
                    style={{marginTop:6,padding:"4px 10px",borderRadius:5,background:"transparent",border:`1px dashed ${T.b2}`,color:T.t3,fontSize:10.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4}}>
                    + Add New Material to Library
                  </button>
                ) : (
                  <div style={{marginTop:6,padding:"10px 11px",borderRadius:7,border:`1px solid ${T.bluM||"#BFDBFE"}`,background:T.bluL||"#EFF6FF"}}>
                    <div style={{fontSize:10.5,fontWeight:700,color:T.blu,marginBottom:7}}>🆕 Add new material to library</div>
                    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:7,marginBottom:7}}>
                      <input value={newMatName} onChange={e=>setNewMatName(e.target.value)} autoFocus placeholder="Material name *"
                        style={{padding:"6px 9px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"white"}}/>
                      <select value={newMatUnit} onChange={e=>setNewMatUnit(e.target.value)}
                        style={{padding:"6px 9px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",fontFamily:"inherit",background:"white",cursor:"pointer"}}>
                        {UNITS_MR.map(u=><option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button type="button" onClick={()=>{setShowAddMat(false);setNewMatName("");}}
                        style={{padding:"5px 10px",borderRadius:5,border:`1px solid ${T.b1}`,background:"white",color:T.t3,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                      <button type="button" disabled={newMatSaving||!newMatName.trim()}
                        onClick={async()=>{
                          const name = newMatName.trim();
                          if(!name) return;
                          if(matLibReal.some(m=>m.name.toLowerCase()===name.toLowerCase())){
                            alert("This material already exists in library");return;
                          }
                          setNewMatSaving(true);
                          try{
                            const res = await api.post("/library/materials", {name, unit:newMatUnit});
                            if(res.success){
                              const newMat = res.data || {name, unit:newMatUnit};
                              setMatLibReal(prev=>[...prev, newMat].sort((a,b)=>a.name.localeCompare(b.name)));
                              setForm(p=>({...p, item_name:name, unit:newMatUnit}));
                              setShowAddMat(false);
                              setNewMatName("");
                            }else{
                              alert(res.message||"Failed to add material");
                            }
                          }catch(e){alert("Network error: "+e.message);}
                          setNewMatSaving(false);
                        }}
                        style={{flex:1,padding:"5px 10px",borderRadius:5,border:"none",background:newMatSaving||!newMatName.trim()?"#9CA3AF":T.blu,color:"white",fontSize:11,fontWeight:700,cursor:newMatSaving||!newMatName.trim()?"not-allowed":"pointer",fontFamily:"inherit"}}>
                        {newMatSaving?"Saving...":"Save & use in this MR"}
                      </button>
                    </div>
                    <div style={{fontSize:10,color:T.t4,marginTop:6}}>
                      Library me save hoga aur is MR me automatic select ho jayega
                    </div>
                  </div>
                )}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Quantity *</label>
                  <input type="number" inputMode="decimal" min={0} step="any" value={form.quantity}
                    onKeyDown={e=>{if(e.key==="-"||e.key==="e"||e.key==="E"||e.key==="+") e.preventDefault();}}
                    onChange={e=>{
                      const v=e.target.value;
                      if(v===""){setForm(p=>({...p,quantity:""}));return;}
                      const n=parseFloat(v);
                      if(!isNaN(n)&&n>=0) setForm(p=>({...p,quantity:v}));
                    }}
                    placeholder="200"
                    style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <div>
                  {(() => {
                    // Material is library-only (SearchSelect / Add-New both write to library).
                    // So unit ALWAYS locks once a material is picked. Display: lib-entry unit, fall back to form.unit.
                    const libMatch = matLibReal.find(m => (m.name||"").trim().toLowerCase() === (form.item_name||"").trim().toLowerCase());
                    const isLocked = !!form.item_name; // material picked → unit locked
                    const displayUnit = libMatch?.unit || form.unit || "Nos";
                    return (
                      <>
                        <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>
                          Unit{isLocked && <span style={{marginLeft:5,fontSize:9.5,color:T.t4,textTransform:"none",fontWeight:500}}>(from library)</span>}
                        </label>
                        {isLocked ? (
                          <div style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t2,background:T.surfaceB,fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:6,height:38,boxSizing:"border-box"}}>
                            <span>🔒</span>{displayUnit}
                          </div>
                        ) : (
                          <select value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))}
                            style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
                            {UNITS_MR.map(u=><option key={u}>{u}</option>)}
                          </select>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Required By</label>
                  <input type="date" value={form.required_date} onChange={e=>setForm(p=>({...p,required_date:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <div>
                  <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Approx. Amount</label>
                  <input type="number" value={form.approx_amount} onChange={e=>setForm(p=>({...p,approx_amount:e.target.value}))} placeholder="76000"
                    style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
              </div>
              <div>
                <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Notes</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Special requirements..."
                  style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
              </div>
            </div>
            <div style={{padding:"11px 16px",borderTop:"1px solid "+T.b1,background:T.surfaceB,display:"flex",gap:8}}>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:"8px",borderRadius:7,background:T.surface,border:"1px solid "+T.b1,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
              <button onClick={handleSubmitMR} disabled={saving||!form.item_name||!form.quantity}
                style={{flex:2,padding:"8px",borderRadius:7,background:(saving||!form.item_name||!form.quantity)?T.b1:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:(saving||!form.item_name||!form.quantity)?"not-allowed":"pointer"}}>
                {saving?"Saving...":"Submit Request"}
              </button>
            </div>
          </div>
        </>)}

        {/* Stage pipeline */}
        <div style={{display:"grid",gridTemplateColumns:"repeat("+STAGES.length+",1fr)",gap:8,marginBottom:12}}>
          {stageData.map((s,i)=>{
            const isA=fStage===s.stage;
            return(
              <div key={s.stage} onClick={()=>{
                if(s.stage==="Used"){
                  setUsedLogLoading(true);
                  setShowUsedLog(true);
                  api.get("/tasks/project/"+projectId+"/used-history").then(r=>{
                    if(r.success) setUsedLog(r.data||[]);
                    setUsedLogLoading(false);
                  }).catch(()=>setUsedLogLoading(false));
                } else {
                  setFStage(isA?"All":s.stage);
                }
              }}
                style={{padding:"9px 12px",background:isA?s.bg:T.surface,border:"1.5px solid "+(isA?s.c:T.b1),borderRadius:8,borderTop:"3px solid "+s.c,cursor:"pointer",transition:"all .15s",textAlign:"center"}}>
                {i>0&&<div style={{display:"flex",justifyContent:"center",marginBottom:3}}>
                  <svg width={12} height={8} viewBox="0 0 12 8" fill="none"><path d="M1 4h8M6 1l3 3-3 3" stroke={isA?s.c:T.b2} strokeWidth={1.5} strokeLinecap="round"/></svg>
                </div>}
                <div style={{fontSize:18,fontWeight:700,color:isA?s.c:T.t1}}>{s.count}</div>
                <div style={{fontSize:11,fontWeight:600,color:isA?s.c:T.t2}}>{s.stage}</div>
              </div>
            );
          })}
        </div>

        {/* USED LOG DRAWER */}
        {showUsedLog&&(<>
          <div onClick={()=>setShowUsedLog(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:400}}/>
          <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(580px,96vw)",background:T.surface,zIndex:401,boxShadow:"-6px 0 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
            {/* Header */}
            <div style={{background:"#0F172A",padding:"13px 18px",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontSize:15,fontWeight:700,color:"white"}}>Material Used Log</div>
                <button onClick={()=>setShowUsedLog(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{projectName} · {usedLog.length} entries</div>
            </div>
            {/* Filters */}
            <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.b1,background:"#F8FAFC",flexShrink:0}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:7}}>
                <input value={ulFilterMat} onChange={e=>setUlFilterMat(e.target.value)} placeholder="Filter by material..."
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
                <input value={ulFilterTask} onChange={e=>setUlFilterTask(e.target.value)} placeholder="Filter by task..."
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
                <input value={ulFilterBy} onChange={e=>setUlFilterBy(e.target.value)} placeholder="Used by..."
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
                <input type="date" value={ulFilterFrom} onChange={e=>setUlFilterFrom(e.target.value)}
                  title="From date"
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11,outline:"none",fontFamily:"inherit"}}/>
                <input type="date" value={ulFilterTo} onChange={e=>setUlFilterTo(e.target.value)}
                  title="To date"
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11,outline:"none",fontFamily:"inherit"}}/>
              </div>
              {(ulFilterMat||ulFilterTask||ulFilterBy||ulFilterFrom||ulFilterTo)&&(
                <button onClick={()=>{setUlFilterMat("");setUlFilterTask("");setUlFilterBy("");setUlFilterFrom("");setUlFilterTo("");}}
                  style={{marginTop:6,background:"none",border:"none",cursor:"pointer",color:T.red,fontSize:11,padding:0,fontWeight:600}}>
                  × Clear filters
                </button>
              )}
            </div>
            {/* Table */}
            <div style={{flex:1,overflowY:"auto"}}>
              {usedLogLoading&&<div style={{textAlign:"center",padding:"60px 0",color:T.t4}}><div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>Loading...</div>}
              {!usedLogLoading&&(()=>{
                const filtered=usedLog.filter(u=>{
                  if(ulFilterMat&&!u.material_name?.toLowerCase().includes(ulFilterMat.toLowerCase())) return false;
                  if(ulFilterTask&&!(u.task_name||"").toLowerCase().includes(ulFilterTask.toLowerCase())) return false;
                  if(ulFilterBy&&!(u.user_name||"").toLowerCase().includes(ulFilterBy.toLowerCase())) return false;
                  if(ulFilterFrom&&u.used_date&&u.used_date<ulFilterFrom) return false;
                  if(ulFilterTo&&u.used_date&&u.used_date>ulFilterTo) return false;
                  return true;
                });
                return filtered.length===0?(
                  <div style={{textAlign:"center",padding:"60px",color:T.t4,fontSize:13}}>
                    {usedLog.length===0?"No used entries yet":"No entries match filters"}
                  </div>
                ):(
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"85px 1fr 75px 90px 1fr",background:"#1E293B",padding:"7px 16px",gap:8}}>
                      {["Date","Material","Qty","Used By","Remark/Task"].map(h=>(
                        <div key={h} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:".4px"}}>{h}</div>
                      ))}
                    </div>
                    {filtered.map((u,i)=>(
                      <div key={u.id||i} style={{display:"grid",gridTemplateColumns:"85px 1fr 75px 90px 1fr",padding:"9px 16px",gap:8,borderBottom:"1px solid "+T.b1,alignItems:"center",background:i%2===0?T.surface:"white"}}>
                        <div style={{fontSize:11.5,color:T.t3}}>{u.used_date?new Date(u.used_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"—"}</div>
                        <div>
                          <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{u.material_name}</div>
                          <div style={{fontSize:10,color:T.t4}}>{u.unit}</div>
                        </div>
                        <div style={{fontSize:13,fontWeight:700,color:T.amb}}>{u.used_qty}</div>
                        <div style={{fontSize:11.5,color:T.t2}}>{u.user_name||"Site"}</div>
                        <div style={{fontSize:11,color:T.t3}}>
                          {u.task_name&&<div style={{color:T.blu,fontWeight:600,fontSize:10.5}}>{u.task_no} {u.task_name}</div>}
                          {u.remark&&<div>{u.remark}</div>}
                          {!u.task_name&&!u.remark&&"—"}
                        </div>
                      </div>
                    ))}
                    {/* Summary footer */}
                    <div style={{padding:"8px 16px",background:"#0F172A",borderTop:"2px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{filtered.length} entries shown</span>
                      <span style={{fontSize:13,fontWeight:800,color:T.amb}}>
                        Total: {filtered.reduce((s,u)=>s+Number(u.used_qty||0),0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>)}

        {/* GRN MODAL */}
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
                  {orderedMRs.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4}}><div style={{fontSize:13,fontWeight:600,color:T.t2,marginBottom:4}}>Koi ordered material nahi hai</div></div>}
                  {orderedMRs.map(mr=>{
                    const isDone=grnDone.includes(mr.id);
                    const row=grnRows[mr.id]||{};
                    return(
                      <div key={mr.id} style={{background:isDone?T.grnL:T.surface,border:"1px solid "+(isDone?T.grnM:T.b1),borderRadius:8,padding:"12px 14px",marginBottom:8,borderLeft:"3px solid "+(isDone?T.grn:T.amb)}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:isDone?0:10}}>
                          <div>
                            <div style={{fontSize:13,fontWeight:700,color:isDone?T.grn:T.t1}}>{mr.item_name}</div>
                            <div style={{fontSize:11,color:T.t4,marginTop:2}}>Ordered: {mr.quantity} {mr.unit}{mr.linked_vendor&&<span style={{marginLeft:8,color:T.blu}}>· {mr.linked_vendor}</span>}</div>
                          </div>
                          {isDone&&<span style={{fontSize:11,fontWeight:700,color:T.grn,background:T.grnL,padding:"3px 10px",borderRadius:20,border:"1px solid "+T.grnM}}>✓ Received</span>}
                        </div>
                        {!isDone&&(
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"flex-end"}}>
                            <div>
                              <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Challan No. *</label>
                              <input value={row.challan||""} onChange={e=>setGrnRows(p=>({...p,[mr.id]:{...p[mr.id],challan:e.target.value}}))} placeholder="e.g. CH-445"
                                style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                            </div>
                            <div>
                              <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Received Qty</label>
                              <input type="number" value={row.received_qty||""} onChange={e=>setGrnRows(p=>({...p,[mr.id]:{...p[mr.id],received_qty:e.target.value}}))} placeholder={String(mr.quantity)}
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
                            placeholder="e.g. Cement OPC 53" list={"mat_lib_"+row.id}
                            style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                          <datalist id={"mat_lib_"+row.id}>{MAT_LIB.map(m=><option key={m} value={m}/>)}</datalist>
                        </div>
                        <div>
                          <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Vendor *</label>
                          <input value={row.vendor} onChange={e=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,vendor:e.target.value}:r))}
                            placeholder="Vendor name (required)" list="vendor-list-grn"
                            style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${row.vendor?T.b1:T.redM}`,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:row.vendor?T.surface:T.redL}}/>
                          <datalist id="vendor-list-grn">
                            {vendorList.map(v=><option key={v.id} value={v.name}>{v.name}{v.city?" — "+v.city:""}</option>)}
                          </datalist>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr 1fr",gap:8,marginBottom:8}}>
                        <div>
                          <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Qty *</label>
                          <input type="number" value={row.qty} onChange={e=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,qty:e.target.value}:r))} placeholder="0"
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
                          <input value={row.challan} onChange={e=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,challan:e.target.value}:r))} placeholder="e.g. CH-445"
                            style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                        </div>
                        <div>
                          <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Received By</label>
                          <input value={row.received_by||""} onChange={e=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,received_by:e.target.value}:r))} placeholder="Site person"
                            style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>setDirectRows(p=>[...p,{id:Date.now(),item_name:"",qty:"",unit:"Bags",vendor:"",challan:"",received_by:""}])}
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
                <button onClick={()=>setShowGRN(false)}
                  style={{flex:2,padding:"8px",borderRadius:7,background:T.grn,border:"none",color:"white",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>
                  Done ✓ ({grnDone.length} received)
                </button>
              )}
            </div>
          </div>
        </>)}

        {/* Toolbar */}
        <div style={{background:T.surface,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",border:"1px solid "+T.b1}}>
          <div style={{position:"relative",flex:1,minWidth:180}}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search material..."
              style={{width:"100%",padding:"7px 9px 7px 28px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
              onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
          </div>
          <select value={fMaterial} onChange={e=>setFMaterial(e.target.value)}
            style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
            {MATERIAL_NAMES.map(n=><option key={n}>{n}</option>)}
          </select>
          <div style={{display:"flex",gap:3,background:T.surfaceB,borderRadius:6,padding:3}}>
            {[["tile","⊞"],["list","☰"]].map(([id,icon])=>(
              <button key={id} onClick={()=>setViewMode(id)}
                style={{padding:"4px 9px",borderRadius:4,border:"none",background:viewMode===id?T.blu:"none",color:viewMode===id?"white":T.t3,fontSize:13,cursor:"pointer"}}>
                {icon}
              </button>
            ))}
          </div>
          <span style={{fontSize:11,color:T.t4}}>{filtered.length} items · Rs.{fmtN(totalAmt)}</span>
          <button onClick={()=>setShowModal(true)}
            style={{padding:"7px 13px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
            New Request
          </button>
          <button onClick={()=>setShowGRN(true)}
            style={{padding:"7px 13px",borderRadius:7,background:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
            Record GRN
          </button>
        </div>

        {/* TILE VIEW */}
        {viewMode==="tile"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
            {filtered.map(m=>{
              const ss=STAGE_S[m.stage]||STAGE_S["Requested"];
              return(
                <div key={m.id} style={{background:T.surface,borderRadius:10,overflow:"hidden",border:"1px solid "+T.b1,borderTop:"3px solid "+ss.c,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
                  <div style={{padding:"12px 14px 10px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div style={{fontSize:13.5,fontWeight:700,color:T.t1,lineHeight:1.3,flex:1,marginRight:6}}>{m.name}</div>
                      <Pill label={m.stage} c={ss.c} bg={ss.bg}/>
                    </div>
                    <div style={{fontSize:20,fontWeight:800,color:T.t1,marginBottom:2}}>{m.qty}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                      {m.vendor&&<span style={{fontSize:11,color:T.blu}}>🏪 {m.vendor}</span>}
                      {m.isDirect&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:"#DCFCE7",color:"#16A34A",border:"1px solid #BBF7D0"}}>Direct</span>}
                      {m.challan&&<span style={{fontSize:9,color:T.t4}}>CH: {m.challan}</span>}
                    </div>
                    <div style={{fontSize:11,color:T.t4}}>{m.date} · {m.by}</div>
                  </div>
                  <div style={{padding:"7px 12px",borderTop:"1px solid "+T.b1,background:T.surfaceB,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,color:T.t4}}>By {(m.by||"—").split(" ")[0]}</span>
                    <span style={{fontSize:13,fontWeight:700,color:T.t1}}>Rs.{fmtN(m.amt||0)}</span>
                  </div>
                </div>
              );
            })}
            {filtered.length===0&&<div style={{gridColumn:"1/-1",padding:"48px",textAlign:"center",color:T.t4,background:T.surface,borderRadius:8,border:"1px solid "+T.b1}}>No materials found</div>}
          </div>
        )}

        {/* LIST VIEW */}
        {viewMode==="list"&&(
          <Panel>
            <THead cols="2fr 90px 110px 130px 110px 110px" headers={["Material","Qty","Stage","Vendor","Requested By","Amount"]}/>
            {filtered.map(m=>{
              const ss=STAGE_S[m.stage]||STAGE_S["Requested"];
              return(
                <div key={m.id} style={{display:"grid",gridTemplateColumns:"2fr 90px 110px 130px 110px 110px",padding:"9px 15px",borderBottom:"1px solid "+T.b1,alignItems:"center",borderLeft:"3px solid "+ss.c+"44",transition:"background .1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{m.name}</span>
                  <span style={{fontSize:12,color:T.t2}}>{m.qty}</span>
                  <Pill label={m.stage} c={ss.c} bg={ss.bg}/>
                  <span style={{fontSize:12,color:T.t2}}>{m.vendor||"—"}{m.isDirect&&<span style={{marginLeft:5,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"#DCFCE7",color:"#16A34A"}}>Direct</span>}</span>
                  <span style={{fontSize:12,color:T.t2}}>{(m.by||"—").split(" ")[0]}</span>
                  <span style={{fontSize:13,fontWeight:600,color:T.t1}}>Rs.{fmtN(m.amt||0)}</span>
                </div>
              );
            })}
            {filtered.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4}}>No materials found</div>}
          </Panel>
        )}
      </>)}

      {/* ══════════════════════════════════════════════════════
          TAB 2: MATERIAL LEDGER
      ══════════════════════════════════════════════════════ */}
      {activeTab==="ledger"&&(
        <div>
          {ledgerLoading&&<div style={{textAlign:"center",padding:"50px 0",color:T.t4,fontSize:13}}>Loading ledger...</div>}
          {!ledgerLoading&&(
            <div>
              {/* Search + Vendor filter */}
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                <div style={{position:"relative",flex:1}}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)"}}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
                  <input value={ledgerSearch} onChange={e=>setLedgerSearch(e.target.value)} placeholder="Search material..."
                    style={{width:"100%",padding:"7px 9px 7px 28px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <select value={ledgerVendor} onChange={e=>setLedgerVendor(e.target.value)}
                  style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,color:T.t1,background:"white",fontFamily:"inherit",cursor:"pointer"}}>
                  {allVendors.map(v=><option key={v}>{v}</option>)}
                </select>
              </div>

              {ledgerFiltered.length===0&&<div style={{textAlign:"center",padding:"50px 0",color:T.t4,fontSize:13}}>No material data — Record GRN to see ledger</div>}

              {/* Material accordion */}
              {ledgerFiltered.map((mat,mi)=>{
                const isOpen=expandedMat===mat.material_name;
                const balColor=mat.balance<=0?T.red:mat.balance<mat.total_received*0.2?T.amb:T.grn;

                // Build chronological rows with running balance
                const allRows=[];
                let runBal=0;
                const allEntries=[
                  ...(mat.receipts||[]).map(r=>({...r,_type:"grn",_date:new Date(r.received_date||0)})),
                  ...(mat.usage||[]).map(u=>({...u,_type:"used",_date:new Date(u.used_date||0)})),
                ].sort((a,b)=>a._date-b._date);
                allEntries.forEach((e,i)=>{
                  if(e._type==="grn"){
                    runBal+=Number(e.qty||0);
                    allRows.push({...e,runBal,idx:i});
                  } else {
                    runBal-=Number(e.qty||0);
                    allRows.push({...e,runBal,idx:i});
                  }
                });

                return(
                  <div key={mat.material_name} style={{marginBottom:10,background:T.surface,borderRadius:10,border:"1px solid "+T.b1,overflow:"hidden"}}>
                    {/* Accordion header */}
                    <div onClick={()=>setExpandedMat(isOpen?null:mat.material_name)}
                      style={{padding:"11px 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",background:isOpen?"#0F172A":T.surface,transition:"background .15s"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={isOpen?"white":T.t3} strokeWidth={2.5} style={{transition:"transform .2s",transform:isOpen?"rotate(90deg)":"rotate(0deg)"}}><path d="M9 18l6-6-6-6"/></svg>
                        <div>
                          <span style={{fontSize:13,fontWeight:700,color:isOpen?"white":T.t1}}>{mat.material_name}</span>
                          <span style={{fontSize:10.5,color:isOpen?"rgba(255,255,255,0.5)":T.t4,marginLeft:8}}>{mat.unit} · {mat.receipts?.length||0} GRN · {mat.usage?.length||0} used entries</span>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:20,alignItems:"center"}}>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:10,color:isOpen?"rgba(255,255,255,0.4)":T.t4}}>Received</div>
                          <div style={{fontSize:14,fontWeight:700,color:isOpen?"#4ADE80":T.grn}}>{mat.total_received}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:10,color:isOpen?"rgba(255,255,255,0.4)":T.t4}}>Used</div>
                          <div style={{fontSize:14,fontWeight:700,color:isOpen?"#FCD34D":T.amb}}>{mat.total_used}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:10,color:isOpen?"rgba(255,255,255,0.4)":T.t4}}>Balance</div>
                          <div style={{fontSize:14,fontWeight:800,color:mat.balance<=0?"#F87171":isOpen?"white":balColor}}>{mat.balance}</div>
                        </div>
                      </div>
                    </div>

                    {/* Finance-style ledger table */}
                    {isOpen&&(
                      <div style={{overflowX:"auto"}}>
                        {/* Column headers */}
                        <div style={{display:"grid",gridTemplateColumns:"85px 130px 85px 1fr 85px 85px 85px 85px 90px",background:"#1E293B",padding:"7px 14px",gap:8,minWidth:900}}>
                          {["Date","Vendor","Challan","Remark / Task","Ref#","Cr (In)","Dr (Out)","Balance","By"].map((h,hi)=>(
                            <div key={h} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:".5px",textAlign:hi>=5&&hi<=7?"right":"left"}}>{h}</div>
                          ))}
                        </div>

                        {/* Rows */}
                        {allRows.length===0&&(
                          <div style={{padding:"24px",textAlign:"center",color:T.t4,fontSize:12}}>No entries yet</div>
                        )}
                        {allRows.map((row,ri)=>{
                          const isGRN=row._type==="grn";
                          const balNeg=row.runBal<0;
                          const balLow=row.runBal>=0&&row.runBal<mat.total_received*0.2;
                          const balColor=balNeg?T.red:balLow?T.amb:T.grn;
                          const dateStr=row._date?row._date.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"—";
                          return(
                            <div key={ri} style={{display:"grid",gridTemplateColumns:"85px 130px 85px 1fr 85px 85px 85px 85px 90px",padding:"9px 14px",gap:8,borderBottom:"1px solid "+T.b1,alignItems:"center",background:ri%2===0?T.surface:"#F8FAFC",minWidth:900,borderLeft:"3px solid "+(isGRN?T.grn:T.amb)}}>
                              {/* Date */}
                              <div style={{fontSize:11.5,color:T.t3,fontWeight:500}}>{dateStr}</div>
                              {/* Vendor */}
                              <div style={{fontSize:12,color:T.t2,fontWeight:isGRN?500:400}}>{isGRN?(row.vendor_name||"—"):"—"}</div>
                              {/* Challan */}
                              <div style={{fontSize:11,color:T.blu,fontFamily:"monospace"}}>{isGRN?(row.challan_no||"—"):"—"}</div>
                              {/* Remark/Task */}
                              <div style={{fontSize:12,color:T.t1}}>
                                {isGRN
                                  ? <span style={{fontSize:10.5,padding:"2px 7px",borderRadius:3,background:T.grnL,color:T.grn,fontWeight:600}}>GRN Received</span>
                                  : <span>{row.task_name?<span style={{fontSize:10,color:T.t4,marginRight:4}}>{row.task_no}</span>:""}{row.task_name||""}{row.remark?<span style={{color:T.t3}}>{row.task_name?" · ":""}{row.remark}</span>:<span style={{color:T.t4,fontSize:10}}>{!row.task_name?"Project level":""}</span>}</span>
                                }
                              </div>
                              {/* Ref# */}
                              <div style={{fontSize:11,fontWeight:700,color:isGRN?T.grn:T.amb,fontFamily:"monospace"}}>{isGRN?(row.grn_number||"—"):("USE-"+(ri+1))}</div>
                              {/* Cr (In) */}
                              <div style={{fontSize:13,fontWeight:800,color:isGRN?T.grn:T.t4,textAlign:"right"}}>{isGRN?row.qty:"—"}</div>
                              {/* Dr (Out) */}
                              <div style={{fontSize:13,fontWeight:800,color:!isGRN?T.red:T.t4,textAlign:"right"}}>{!isGRN?row.qty:"—"}</div>
                              {/* Running Balance */}
                              <div style={{fontSize:13,fontWeight:800,color:balColor,textAlign:"right",background:balNeg?T.redL:"transparent",borderRadius:4,padding:"1px 4px"}}>{row.runBal}</div>
                              {/* By */}
                              <div style={{fontSize:11.5,color:T.t2}}>{isGRN?(row.received_by||"—"):(row.used_by||row.user_name||"—")}</div>
                            </div>
                          );
                        })}

                        {/* Footer summary */}
                        <div style={{display:"grid",gridTemplateColumns:"85px 130px 85px 1fr 85px 85px 85px 85px 90px",padding:"8px 14px",gap:8,background:"#0F172A",minWidth:900,borderTop:"2px solid "+T.b1}}>
                          <div style={{gridColumn:"1/6",fontSize:10.5,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:".4px"}}>Total</div>
                          <div style={{fontSize:13,fontWeight:800,color:"#4ADE80",textAlign:"right"}}>{mat.total_received}</div>
                          <div style={{fontSize:13,fontWeight:800,color:"#F87171",textAlign:"right"}}>{mat.total_used}</div>
                          <div style={{fontSize:13,fontWeight:800,color:mat.balance<=0?"#F87171":"#4ADE80",textAlign:"right"}}>{mat.balance}</div>
                          <div/>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 3: INVENTORY (live stock)
      ══════════════════════════════════════════════════════ */}
      {activeTab==="inventory"&&(
        <div>
          {invLoading&&<div style={{textAlign:"center",padding:"50px 0",color:T.t4,fontSize:13}}>Loading inventory...</div>}
          {!invLoading&&inventory.length===0&&(
            <div style={{textAlign:"center",padding:"60px 0",color:T.t4}}>
              <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.5} style={{margin:"0 auto 12px",display:"block"}}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              <div style={{fontSize:14,fontWeight:600,color:T.t3}}>No inventory yet</div>
              <div style={{fontSize:12,marginTop:4}}>Record GRN to see live stock</div>
            </div>
          )}
          {!invLoading&&inventory.length>0&&(
            <div>
              {/* Summary stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:14}}>
                {[
                  {l:"Total Materials",v:inventory.length,c:T.slt},
                  {l:"Low / Exhausted",v:inventory.filter(i=>i.status==="Low"||i.status==="Exhausted").length,c:T.red},
                  {l:"Available",v:inventory.filter(i=>i.status==="Available").length,c:T.grn},
                ].map(s=>(
                  <div key={s.l} style={{padding:"10px 12px",background:T.surface,border:"1px solid "+T.b1,borderRadius:8,borderTop:"3px solid "+s.c,textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:10,color:T.t3,marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
              {/* Cards grid */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:9}}>
                {inventory.map((item,i)=>{
                  const rec=Number(item.total_received||0);
                  const used=Number(item.total_used||0);
                  const bal=Number(item.balance||0);
                  const pct=rec>0?Math.min(100,Math.round((used/rec)*100)):0;
                  const stC=item.status==="Exhausted"?T.red:item.status==="Low"?T.amb:T.grn;
                  const stBg=item.status==="Exhausted"?T.redL:item.status==="Low"?T.ambL:T.grnL;
                  const isExpanded = invExpandedMat===item.material_name;
                  const today = new Date().toISOString().split("T")[0];
                  const uForm = invUsedForm[item.material_name]||{qty:"",remark:"",used_date:today};
                  return(
                    <div key={i} style={{background:T.surface,borderRadius:9,border:"1.5px solid "+(isExpanded?T.grn:T.b1),padding:"11px 13px",borderTop:"3px solid "+stC,transition:"border .2s"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:1}}>
                        <div style={{fontSize:12,fontWeight:700,color:T.t1}}>{item.material_name}</div>
                        <span style={{fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:4,background:stBg,color:stC}}>{item.status}</span>
                      </div>
                      <div style={{fontSize:10,color:T.t4,marginBottom:8}}>{item.unit}</div>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:15,fontWeight:800,color:T.grn}}>{rec}</div>
                          <div style={{fontSize:8.5,color:T.t4}}>Received</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:15,fontWeight:800,color:T.amb}}>{used}</div>
                          <div style={{fontSize:8.5,color:T.t4}}>Used</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:15,fontWeight:800,color:stC}}>{bal}</div>
                          <div style={{fontSize:8.5,color:T.t4}}>Balance</div>
                        </div>
                      </div>
                      {rec>0&&<div style={{height:4,background:T.b1,borderRadius:2,overflow:"hidden",marginBottom:8}}>
                        <div style={{height:"100%",width:pct+"%",background:pct>=100?T.red:pct>60?T.amb:T.grn,borderRadius:2,transition:"width .4s"}}/>
                      </div>}
                      {/* Mark Used button */}
                      {bal>0&&<button onClick={()=>{
                        setInvExpandedMat(isExpanded?null:item.material_name);
                        if(!isExpanded) setInvUsedForm(p=>({...p,[item.material_name]:{qty:"",remark:"",used_date:today}}));
                      }}
                        style={{width:"100%",padding:"5px",borderRadius:6,border:"1.5px solid "+(isExpanded?T.grn:T.grnM),background:isExpanded?T.grn:T.grnL,color:isExpanded?"white":T.grn,fontSize:11,fontWeight:700,cursor:"pointer",marginBottom:isExpanded?8:0,transition:"all .15s"}}>
                        {isExpanded?"▲ Cancel":"▼ Mark Used"}
                      </button>}
                      {/* Inline form */}
                      {isExpanded&&bal>0&&(
                        <div style={{borderTop:"1px solid "+T.grnM,paddingTop:8}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:7}}>
                            <div>
                              <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Qty Used *</label>
                              <input type="number" value={uForm.qty}
                                onChange={e=>setInvUsedForm(p=>({...p,[item.material_name]:{...uForm,qty:e.target.value}}))}
                                placeholder={"max "+bal}
                                style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:13,fontWeight:700,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                            </div>
                            <div>
                              <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Date</label>
                              <input type="date" value={uForm.used_date}
                                onChange={e=>setInvUsedForm(p=>({...p,[item.material_name]:{...uForm,used_date:e.target.value}}))}
                                style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                            </div>
                          </div>
                          <input value={uForm.remark}
                            onChange={e=>setInvUsedForm(p=>({...p,[item.material_name]:{...uForm,remark:e.target.value}}))}
                            placeholder="Remark (optional)"
                            style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:7}}/>
                          <button onClick={async()=>{
                            if(!uForm.qty||parseFloat(uForm.qty)<=0) return alert("Qty required");
                            if(parseFloat(uForm.qty)>bal) return alert("Qty exceeds balance ("+bal+")");
                            setInvUsedSaving(item.material_name);
                            try{
                              const res=await api.post("/tasks/project/"+projectId+"/mark-used",{
                                material_name:item.material_name,
                                used_qty:parseFloat(uForm.qty),
                                unit:item.unit,
                                remark:uForm.remark||null,
                                used_date:uForm.used_date,
                              });
                              if(res.success){
                                setInvExpandedMat(null);
                                // Reload inventory
                                setInvLoading(true);
                                api.get("/tasks/project/"+projectId+"/inventory").then(r=>{
                                  if(r.success)setInventory(r.data||[]);
                                  setInvLoading(false);
                                });
                                setLedgerLoaded(false);
                              } else alert(res.message||"Failed");
                            }catch(e){alert(e.message);}
                            setInvUsedSaving(null);
                          }} disabled={invUsedSaving===item.material_name}
                            style={{width:"100%",padding:"7px",borderRadius:6,background:invUsedSaving===item.material_name?T.b1:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
                            {invUsedSaving===item.material_name?"Saving...":"✓ Save Used Entry"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}


function TabSubcon({ projectId }) {
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selWo, setSelWo] = useState(null);
  const [subTab, setSubTab] = useState("wo");
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [subcons, setSubcons] = useState([]);
  const [showNewWO, setShowNewWO] = useState(false);
  const [showNewBill, setShowNewBill] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEditWO, setShowEditWO] = useState(false);
  const [amendments, setAmendments] = useState([]);
  const [expandedBill, setExpandedBill] = useState(null);
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [editBillSaving, setEditBillSaving] = useState(false);
  const [billItems, setBillItems] = useState({});
  const [billForm, setBillForm] = useState({ bill_date: new Date().toISOString().split("T")[0], remark:"", items:[] });
  const [payForm, setPayForm] = useState({ amount_paid:"", payment_date: new Date().toISOString().split("T")[0], payment_mode:"Bank Transfer", reference_no:"", remark:"" });

  useEffect(()=>{
    loadWOs();
    api.get("/library/subcontractors").then(r=>{ if(r.success) setSubcons(r.data||[]); }).catch(()=>{});
  },[projectId]);

  const loadWOs = async () => {
    setLoading(true);
    const r = await api.get("/subcon/work-orders?project_id="+projectId).catch(()=>({success:false}));
    if(r.success) setWos(r.data||[]);
    setLoading(false);
  };

  const selectWo = async (wo) => {
    setSelWo(wo); setSubTab("wo");
    const [bRes, sRes, aRes] = await Promise.all([
      api.get("/subcon/ra-bills?wo_id="+wo.id).catch(()=>({success:false})),
      api.get("/subcon/work-orders/"+wo.id+"/summary").catch(()=>({success:false})),
      api.get("/subcon/amendments?wo_id="+wo.id).catch(()=>({success:false})),
    ]);
    if(bRes.success) setBills(bRes.data||[]);
    if(sRes.success) setSummary(sRes.data);
    if(aRes.success) setAmendments(aRes.data||[]);
  };

  const fmtC = (v) => "₹"+(parseFloat(v)||0).toLocaleString("en-IN",{maximumFractionDigits:0});

  // ── NEW WO SUBMIT ──
  const submitWO = async () => {
    const validItems = woForm.items.filter(i=>i.description&&i.qty&&i.rate);
    if(!woForm.subcon_name || validItems.length===0) return alert("Subcontractor and at least 1 item required");
    setSaving(true);
    const res = await api.post("/subcon/work-orders",{
      project_id: projectId,
      subcon_name: woForm.subcon_name,
      description: woForm.description,
      retention_pct: parseFloat(woForm.retention_pct||5),
      tds_pct: parseFloat(woForm.tds_pct||2),
      start_date: woForm.start_date||null,
      end_date: woForm.end_date||null,
      items: validItems.map(i=>({ description:i.description, unit:i.unit, qty:parseFloat(i.qty), rate:parseFloat(i.rate) })),
    }).catch(()=>({success:false}));
    setSaving(false);
    if(res.success){ setShowNewWO(false); loadWOs(); setWoForm({subcon_id:"",subcon_name:"",description:"",retention_pct:5,tds_pct:2,start_date:"",end_date:"",items:[{description:"",unit:"",qty:"",rate:""}]}); }
    else alert(res.message||"Failed");
  };

  // ── NEW RA BILL SUBMIT ──
  const submitBill = async () => {
    if(!selWo) return;
    setSaving(true);
    const woDetail = await api.get("/subcon/work-orders/"+selWo.id).catch(()=>({success:false}));
    // Flatten all items from sections
    const allItems = [];
    if(woDetail.success){
      (woDetail.data.sections||[]).forEach(sec=>{
        (sec.items||[]).forEach(it=>allItems.push(it));
      });
      // Also unsectioned items
      (woDetail.data.unsectioned||[]).forEach(it=>allItems.push(it));
    }
    const res = await api.post("/subcon/ra-bills",{
      wo_id: selWo.id,
      bill_date: billForm.bill_date,
      remark: billForm.remark,
      items: allItems.map((it)=>({
        wo_item_id: it.id,
        cumulative_qty: parseFloat(billForm.items.find(bi=>bi.wo_item_id===it.id)?.cumulative_qty||0),
        rate: parseFloat(it.rate),
      })),
    }).catch(()=>({success:false}));
    setSaving(false);
    if(res.success){
      api.post("/approvals/submit", {
        module: "RA Bill",
        ref_id: res.data.id,
        ref_no: res.data.bill_no || "",
        title: (selWo.subcon_name||selWo.name||"") + " - RA Bill",
        amount: res.data.total_amount || 0,
        project_id: projectId,
        project_name: projectName || "",
      }).catch(e => console.error("Approval submit:", e));
      setShowNewBill(false); selectWo(selWo);
    }
    else alert(res.message||"Failed");
  };

  // ── RECORD PAYMENT ──
  const submitPayment = async (billId) => {
    if(!payForm.amount_paid) return alert("Amount required");
    setSaving(true);
    const res = await api.post("/subcon/payments",{
      bill_id: billId, wo_id: selWo.id,
      amount_paid: parseFloat(payForm.amount_paid),
      payment_date: payForm.payment_date,
      payment_mode: payForm.payment_mode,
      reference_no: payForm.reference_no,
      remark: payForm.remark,
    }).catch(()=>({success:false}));
    setSaving(false);
    if(res.success){ setShowPayModal(false); selectWo(selWo); setPayForm({amount_paid:"",payment_date:new Date().toISOString().split("T")[0],payment_mode:"Bank Transfer",reference_no:"",remark:""}); }
    else alert(res.message||"Failed");
  };

  const inpStyle = {padding:"7px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"};
  const lblStyle = {fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3};

  return (
    <div style={{display:"flex",gap:0,height:"100%",minHeight:500}}>
      {/* LEFT — WO List */}
      <div style={{width:220,borderRight:"1px solid "+T.b1,background:T.surfaceB,flexShrink:0}}>
        <div style={{padding:"10px 12px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:11,fontWeight:700,color:T.t1}}>Work Orders ({wos.length})</span>
          <button onClick={()=>setShowNewWO(true)} style={{background:T.blu,color:"white",border:"none",borderRadius:5,padding:"4px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>+ New</button>
        </div>
        {loading&&<div style={{textAlign:"center",padding:"60px 0",color:T.t4}}><div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>Loading...</div>}
        {!loading&&wos.length===0&&<div style={{padding:"24px 12px",textAlign:"center",color:T.t4,fontSize:12}}>No work orders yet</div>}
        {wos.map(wo=>{
          const isSel=selWo?.id===wo.id;
          const stC=wo.status==="Active"?T.grn:wo.status==="Completed"?T.blu:T.t4;
          return(
            <div key={wo.id} onClick={()=>selectWo(wo)}
              style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid "+T.b1,background:isSel?"#EFF6FF":T.surfaceB,borderLeft:isSel?"3px solid "+T.blu:"3px solid transparent"}}>
              <div style={{fontSize:12,fontWeight:700,color:isSel?T.blu:T.t1,marginBottom:2}}>{wo.subcon_name}</div>
              <div style={{fontSize:10,color:T.t4,marginBottom:4}}>{wo.subcon_category||"Civil"}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:10,fontWeight:700,color:T.grn}}>{fmtC(wo.total_value)}</span>
                <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:stC+"22",color:stC}}>{wo.status}</span>
              </div>
              {wo.bill_count>0&&<div style={{fontSize:9.5,color:T.t4,marginTop:3}}>{wo.bill_count} bill{wo.bill_count>1?"s":""}</div>}
            </div>
          );
        })}
      </div>

      {/* RIGHT — WO Detail */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {!selWo&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:T.t4,flexDirection:"column",gap:8}}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.5}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <div style={{fontSize:13,color:T.t3}}>Select a work order</div>
          </div>
        )}

        {selWo&&(<>
          {/* Header */}
          <div style={{padding:"12px 16px",borderBottom:"1px solid "+T.b1,background:"#0F172A",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"white"}}>{selWo.subcon_name}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>{selWo.description||selWo.subcon_category}</div>
              </div>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                {summary&&[
                  {l:"WO Value",v:fmtC(summary.wo_value),c:"#94A3B8"},
                  {l:"Billed",v:fmtC(summary.total_billed),c:"#60A5FA"},
                  {l:"Paid",v:fmtC(summary.total_paid),c:"#4ADE80"},
                  {l:"Retention",v:fmtC(summary.retention_held),c:"#FCD34D"},
                  {l:"Balance",v:fmtC(summary.balance),c:"#F87171"},
                ].map(s=>(
                  <div key={s.l} style={{textAlign:"right"}}>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",textTransform:"uppercase"}}>{s.l}</div>
                    <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                  </div>
                ))}
                <button onClick={()=>setShowEditWO(true)}
                  style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>
                  ✏ Edit
                </button>
              </div>
            </div>
          </div>

          {/* Sub Tabs */}
          <div style={{display:"flex",borderBottom:"1px solid "+T.b1,background:T.surfaceB,flexShrink:0}}>
            {[
              {id:"wo",label:"Work Order"},
              {id:"bills",label:`RA Bills (${bills.length})`},
              {id:"pay",label:"Payments"},
              {id:"amend",label:"Amendments"+(amendments.filter(a=>a.status==="Pending").length>0 ? ` 🔴${amendments.filter(a=>a.status==="Pending").length}` : ` (${amendments.length})`)},
            ].map(t=>(
              <button key={t.id} onClick={()=>setSubTab(t.id)}
                style={{padding:"8px 16px",border:"none",background:"transparent",color:subTab===t.id?T.blu:T.t3,fontSize:12,fontWeight:subTab===t.id?700:400,cursor:"pointer",borderBottom:subTab===t.id?"2px solid "+T.blu:"2px solid transparent"}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
            {/* WORK ORDER TAB */}
            {subTab==="wo"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.t2}}>Retention: {selWo.retention_pct}% · TDS: {selWo.tds_pct}%</div>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:T.grnL,color:T.grn}}>Total: {fmtC(selWo.total_value)}</span>
                </div>
                {/* WO items table - load from API */}
                <WoItemsTable woId={selWo.id} fmtC={fmtC}/>
              </div>
            )}

            {/* RA BILLS TAB */}
            {subTab==="bills"&&(
              <div>
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
                  <button onClick={()=>setShowNewBill(true)}
                    style={{background:T.blu,color:"white",border:"none",borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    + New RA Bill
                  </button>
                </div>
                {bills.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No bills raised yet</div>}
                {bills.map(b=>{
                  const stC=b.status==="Paid"?T.grn:b.status==="Approved"?T.blu:b.status==="Submitted"?T.amb:T.t4;
                  return(
                    <div key={b.id} style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,padding:"12px 14px",marginBottom:8,borderLeft:"3px solid "+stC}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <div>
                          <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{b.bill_no}</span>
                          <span style={{fontSize:10.5,color:T.t4,marginLeft:8}}>{b.bill_date?new Date(b.bill_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"—"}</span>
                        </div>
                        <span style={{fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:4,background:stC+"22",color:stC}}>{b.status}</span>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8}}>
                        {[{l:"Gross",v:fmtC(b.gross_amount),c:T.t1},{l:"Retention",v:fmtC(b.retention_amt),c:T.amb},{l:"TDS",v:fmtC(b.tds_amt),c:T.red},{l:"Net Payable",v:fmtC(b.net_payable),c:T.grn}].map(s=>(
                          <div key={s.l} style={{textAlign:"center",background:T.surfaceB,borderRadius:6,padding:"6px 8px"}}>
                            <div style={{fontSize:9,color:T.t4,textTransform:"uppercase"}}>{s.l}</div>
                            <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                        {b.status==="Submitted"&&<button onClick={async()=>{await api.patch("/subcon/ra-bills/"+b.id+"/status",{status:"Approved"});selectWo(selWo);}} style={{flex:1,minWidth:100,padding:"6px",borderRadius:5,background:T.blu,color:"white",border:"none",fontSize:11,fontWeight:700,cursor:"pointer"}}>✓ Approve</button>}
                        {(b.status==="Approved"||b.status==="Submitted")&&<button onClick={()=>{setShowPayModal(b.id);}} style={{flex:1,minWidth:100,padding:"6px",borderRadius:5,background:T.grn,color:"white",border:"none",fontSize:11,fontWeight:700,cursor:"pointer"}}>₹ Record Payment</button>}
                        {/* Edit + Delete (not for Paid) */}
                        {b.status!=="Paid"&&(
                          <button onClick={async()=>{
                              // Load bill items for editing
                              const r = await api.get("/subcon/ra-bills/"+b.id);
                              if(r.success){
                                setEditBill({...r.data, _itemsLoaded:true});
                                setShowEditBillModal(true);
                              }
                            }}
                            style={{padding:"6px 12px",borderRadius:5,background:T.bluL,color:T.blu,border:`1px solid ${T.bluM}`,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                            ✏️ Edit
                          </button>
                        )}
                        {b.status!=="Paid"&&(
                          <button onClick={async()=>{
                              if(!await window.confirmAsync(`Delete ${b.bill_no}? This will permanently remove the bill.`)) return;
                              const res = await api.del("/subcon/ra-bills/"+b.id);
                              if(res.success){
                                selectWo(selWo); // reload bills
                              } else {
                                alert(res.message || "Delete failed");
                              }
                            }}
                            style={{padding:"6px 12px",borderRadius:5,background:T.redL,color:T.red,border:`1px solid ${T.redM}`,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                            🗑 Delete
                          </button>
                        )}
                      </div>

                      {/* View Item Detail — opens a side slide drawer */}
                      <button
                        onClick={async()=>{
                          setExpandedBill(b.id);
                          if(!billItems[b.id]){
                            const r = await api.get("/subcon/ra-bills/"+b.id);
                            if(r.success) setBillItems(p=>({...p,[b.id]:r.data.items||[]}));
                          }
                        }}
                        style={{background:"none",border:"none",color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:4}}
                      >
                        <span style={{fontSize:11}}>›</span>
                        View Item Detail
                      </button>
                    </div>
                  );
                })}

                {/* ── Item Detail SIDE SLIDE drawer ────────────────── */}
                {expandedBill && (() => {
                  const b = bills.find(x=>x.id===expandedBill);
                  if (!b) return null;
                  const items = billItems[expandedBill];
                  const stC = b.status==="Paid"?T.grn:b.status==="Approved"?T.blu:b.status==="Submitted"?T.amb:T.t4;
                  return (<>
                    <div onClick={()=>setExpandedBill(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:310,backdropFilter:"blur(2px)"}}/>
                    <div style={{position:"fixed",right:0,top:0,bottom:0,width:580,maxWidth:"95vw",background:T.bg,zIndex:311,boxShadow:"-6px 0 36px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideInRight .18s ease-out"}}>
                      {/* Header */}
                      <div style={{background:"#0891B2",padding:"14px 18px",flexShrink:0,color:"white"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,opacity:0.7,textTransform:"uppercase",letterSpacing:"0.5px"}}>RA Bill · Item Detail</div>
                            <div style={{fontSize:17,fontWeight:700,marginTop:2}}>{b.bill_no}</div>
                          </div>
                          <button onClick={()=>setExpandedBill(null)} style={{background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",color:"white",padding:"6px 9px",borderRadius:6,fontSize:13,fontWeight:700}}>✕</button>
                        </div>
                        <div style={{display:"flex",gap:10,alignItems:"center",fontSize:11.5,opacity:0.9}}>
                          {b.bill_date && <span>{new Date(b.bill_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</span>}
                          <span style={{marginLeft:"auto",background:stC+"33",border:`1px solid ${stC}55`,padding:"2px 9px",borderRadius:12,fontSize:10,fontWeight:700,color:"white"}}>{b.status}</span>
                        </div>
                      </div>
                      {/* Body */}
                      <div style={{flex:1,overflowY:"auto",padding:14}}>
                        {/* KPI tiles */}
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
                          {[
                            {l:"Gross",       v:fmtC(b.gross_amount),  c:T.t1},
                            {l:"Retention",   v:fmtC(b.retention_amt), c:T.amb},
                            {l:"TDS",         v:fmtC(b.tds_amt),       c:T.red},
                            {l:"Net Payable", v:fmtC(b.net_payable),   c:T.grn},
                          ].map(s=>(
                            <div key={s.l} style={{textAlign:"center",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,padding:"10px 8px"}}>
                              <div style={{fontSize:9,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:3}}>{s.l}</div>
                              <div style={{fontSize:13.5,fontWeight:800,color:s.c}}>{s.v}</div>
                            </div>
                          ))}
                        </div>
                        {/* Items table */}
                        <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,overflow:"hidden"}}>
                          <div style={{display:"grid",gridTemplateColumns:"2fr 50px 64px 64px 64px 70px 80px",background:"#1E293B",padding:"7px 10px",gap:6}}>
                            {["Description","Unit","WO Qty","Prev Cum","This Bill","Rate","Amount"].map((h,i)=>(
                              <div key={h} style={{fontSize:8.5,fontWeight:700,color:"rgba(255,255,255,.55)",textAlign:i>1?"right":"left",textTransform:"uppercase"}}>{h}</div>
                            ))}
                          </div>
                          {!items && (
                            <div style={{textAlign:"center",padding:"30px 0",color:T.t4,fontSize:12}}>
                              <div style={{width:22,height:22,border:"2px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 8px"}}/>
                              Loading…
                            </div>
                          )}
                          {items && items.length===0 && (
                            <div style={{textAlign:"center",padding:"22px 0",color:T.t4,fontSize:12}}>No item breakdown</div>
                          )}
                          {(items||[]).map(it=>(
                            <div key={it.id} style={{display:"grid",gridTemplateColumns:"2fr 50px 64px 64px 64px 70px 80px",padding:"8px 10px",gap:6,borderTop:`1px solid ${T.b1}`,alignItems:"center"}}>
                              <div style={{fontSize:11.5,color:T.t1}}>{it.description}</div>
                              <div style={{fontSize:11,color:T.t3}}>{it.unit}</div>
                              <div style={{fontSize:11,color:T.t2,textAlign:"right"}}>{parseFloat(it.wo_qty||0)}</div>
                              <div style={{fontSize:11,color:T.t3,textAlign:"right"}}>{parseFloat(it.prev_cumulative||0)>0?parseFloat(it.prev_cumulative||0):"—"}</div>
                              <div style={{fontSize:11,fontWeight:700,color:T.t1,textAlign:"right"}}>{parseFloat(it.this_bill_qty||0)}</div>
                              <div style={{fontSize:11,color:T.blu,textAlign:"right",fontWeight:600}}>₹{parseFloat(it.rate||0).toLocaleString("en-IN")}</div>
                              <div style={{fontSize:11,fontWeight:700,color:T.grn,textAlign:"right"}}>{fmtC(it.this_bill_amount)}</div>
                            </div>
                          ))}
                          {items && items.length>0 && (
                            <div style={{display:"grid",gridTemplateColumns:"2fr 50px 64px 64px 64px 70px 80px",padding:"9px 10px",gap:6,background:T.surfaceB,borderTop:`1.5px solid ${T.b2}`}}>
                              <div style={{fontSize:11.5,fontWeight:700,color:T.t1,gridColumn:"1/7"}}>Total</div>
                              <div style={{fontSize:12.5,fontWeight:800,color:T.grn,textAlign:"right"}}>{fmtC(b.gross_amount)}</div>
                            </div>
                          )}
                        </div>
                        {b.remark && (
                          <div style={{marginTop:14,padding:"10px 12px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,fontSize:12,color:T.t2}}>
                            <div style={{fontSize:9.5,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:3}}>Remarks</div>
                            {b.remark}
                          </div>
                        )}
                      </div>
                    </div>
                    <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
                  </>);
                })()}
              </div>
            )}

            {/* PAYMENTS TAB */}
            {subTab==="pay"&&(
              <PaymentsTab woId={selWo.id} fmtC={fmtC}/>
            )}

            {/* AMENDMENTS TAB */}
            {subTab==="amend"&&(
              <AmendmentsTab amendments={amendments} fmtC={fmtC} onRefresh={()=>selectWo(selWo)}/>
            )}
          </div>
        </>)}
      </div>

      {/* EDIT WO MODAL */}
      {showEditWO&&selWo&&(
        <EditWOModal
          wo={selWo} subcons={subcons} fmtC={fmtC}
          inpStyle={inpStyle} lblStyle={lblStyle}
          onClose={()=>setShowEditWO(false)}
          onSaved={()=>{ setShowEditWO(false); loadWOs(); selectWo(selWo); }}
        />
      )}

      {/* NEW WO MODAL */}
      {showNewWO&&(
        <NewWOModal
          subcons={subcons} projectId={projectId} fmtC={fmtC}
          inpStyle={inpStyle} lblStyle={lblStyle} saving={saving} setSaving={setSaving}
          onClose={()=>setShowNewWO(false)}
          onSaved={()=>{ setShowNewWO(false); loadWOs(); }}
        />
      )}

      {/* NEW RA BILL MODAL */}
      {showNewBill&&selWo&&(
        <NewRaBillModal woId={selWo.id} fmtC={fmtC} inpStyle={inpStyle} lblStyle={lblStyle}
          billForm={billForm} setBillForm={setBillForm} saving={saving}
          onClose={()=>setShowNewBill(false)} onSave={submitBill}/>
      )}

      {/* EDIT RA BILL MODAL */}
      {showEditBillModal && editBill && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:T.surface,borderRadius:10,width:"min(560px,94vw)",maxHeight:"92vh",overflowY:"auto",padding:20,boxShadow:"0 20px 50px rgba(0,0,0,0.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:T.t1}}>Edit RA Bill — {editBill.bill_no}</div>
              <button onClick={()=>{setShowEditBillModal(false);setEditBill(null);}} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,fontSize:18}}>×</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div>
                <label style={lblStyle}>Bill Date</label>
                <input type="date" value={(editBill.bill_date||"").split("T")[0]} onChange={e=>setEditBill(p=>({...p,bill_date:e.target.value}))} style={inpStyle}/>
              </div>
              <div>
                <label style={lblStyle}>Status</label>
                <SearchSelect value={editBill.status||"Submitted"} options={["Submitted","Approved","Rejected"]}
                  onChange={v=>setEditBill(p=>({...p,status:v}))} placeholder="Select status..."/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div>
                <label style={lblStyle}>Gross Amount</label>
                <input type="number" value={editBill.gross_amount||0} onChange={e=>{
                  const g = Number(e.target.value)||0;
                  const ret = g * (Number(editBill.retention_pct)||5)/100;
                  const tds = (g-ret) * (Number(editBill.tds_pct)||2)/100;
                  setEditBill(p=>({...p,gross_amount:g,retention_amt:ret,tds_amt:tds,net_payable:g-ret-tds}));
                }} style={inpStyle}/>
              </div>
              <div>
                <label style={lblStyle}>Net Payable</label>
                <input type="number" value={editBill.net_payable||0} disabled style={{...inpStyle,background:T.surfaceB,color:T.t3}}/>
              </div>
              <div>
                <label style={lblStyle}>Retention %</label>
                <input type="number" value={editBill.retention_pct||5} onChange={e=>{
                  const r = Number(e.target.value)||0;
                  const g = Number(editBill.gross_amount)||0;
                  const ret = g * r/100;
                  const tds = (g-ret) * (Number(editBill.tds_pct)||2)/100;
                  setEditBill(p=>({...p,retention_pct:r,retention_amt:ret,tds_amt:tds,net_payable:g-ret-tds}));
                }} style={inpStyle}/>
              </div>
              <div>
                <label style={lblStyle}>TDS %</label>
                <input type="number" value={editBill.tds_pct||2} onChange={e=>{
                  const t = Number(e.target.value)||0;
                  const g = Number(editBill.gross_amount)||0;
                  const ret = Number(editBill.retention_amt)||0;
                  const tds = (g-ret) * t/100;
                  setEditBill(p=>({...p,tds_pct:t,tds_amt:tds,net_payable:g-ret-tds}));
                }} style={inpStyle}/>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={lblStyle}>Remark / Notes</label>
              <textarea value={editBill.remark||""} onChange={e=>setEditBill(p=>({...p,remark:e.target.value}))}
                style={{...inpStyle,minHeight:60,resize:"vertical"}} placeholder="Optional notes..."/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setShowEditBillModal(false);setEditBill(null);}}
                style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
              <button onClick={async()=>{
                  setEditBillSaving(true);
                  try {
                    const res = await api.put("/subcon/ra-bills/"+editBill.id, {
                      bill_date: editBill.bill_date,
                      gross_amount: Number(editBill.gross_amount)||0,
                      retention_pct: Number(editBill.retention_pct)||0,
                      retention_amt: Number(editBill.retention_amt)||0,
                      tds_pct: Number(editBill.tds_pct)||0,
                      tds_amt: Number(editBill.tds_amt)||0,
                      net_payable: Number(editBill.net_payable)||0,
                      status: editBill.status,
                      remark: editBill.remark,
                    });
                    if (res.success) {
                      setShowEditBillModal(false);
                      setEditBill(null);
                      selectWo(selWo); // reload
                    } else {
                      alert(res.message || "Update failed");
                    }
                  } catch(e) { alert("Error: "+e.message); }
                  setEditBillSaving(false);
                }} disabled={editBillSaving}
                style={{flex:2,padding:"9px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",opacity:editBillSaving?.6:1}}>
                {editBillSaving?"Saving…":"💾 Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPayModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:T.surface,borderRadius:10,width:"min(400px,94vw)",padding:20,boxShadow:"0 20px 50px rgba(0,0,0,0.2)"}}>
            <div style={{fontSize:14,fontWeight:700,color:T.t1,marginBottom:14}}>Record Payment</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
              <div>
                <label style={lblStyle}>Amount *</label>
                <input type="number" value={payForm.amount_paid} onChange={e=>setPayForm(p=>({...p,amount_paid:e.target.value}))} style={inpStyle} placeholder="0"/>
              </div>
              <div>
                <label style={lblStyle}>Date</label>
                <input type="date" value={payForm.payment_date} onChange={e=>setPayForm(p=>({...p,payment_date:e.target.value}))} style={inpStyle}/>
              </div>
              <div>
                <label style={lblStyle}>Mode</label>
                <SearchSelect value={payForm.payment_mode} options={["Bank Transfer","Cheque","Cash","NEFT","RTGS","UPI"]}
                  onChange={v=>setPayForm(p=>({...p,payment_mode:v}))} placeholder="Select mode..."/>
              </div>
              <div>
                <label style={lblStyle}>Reference No.</label>
                <input value={payForm.reference_no} onChange={e=>setPayForm(p=>({...p,reference_no:e.target.value}))} style={inpStyle} placeholder="UTR/Cheque no."/>
              </div>
            </div>
            <input value={payForm.remark} onChange={e=>setPayForm(p=>({...p,remark:e.target.value}))} placeholder="Remark (optional)" style={{...inpStyle,marginBottom:12}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowPayModal(false)} style={{flex:1,padding:"8px",borderRadius:6,border:"1px solid "+T.b1,background:T.surface,cursor:"pointer",fontSize:12}}>Cancel</button>
              <button onClick={()=>submitPayment(showPayModal)} disabled={saving} style={{flex:2,padding:"8px",borderRadius:6,background:saving?T.t4:T.grn,color:"white",border:"none",fontSize:13,fontWeight:700,cursor:"pointer"}}>{saving?"Saving...":"Save Payment"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewWOModal({ subcons, projectId, fmtC, inpStyle, lblStyle, saving, setSaving, onClose, onSaved }) {
  const CATS = ["Civil","Electrical","Plumbing","Finishing","Structural","MEP","Waterproofing","Painting","Tiling","Other"];
  const blankSection = () => ({ title:"", items:[{ description:"", unit:"", qty:"", rate:"", isLibrary:false }] });

  const [form, setForm] = useState({
    subcon_name:"", subcon_category:"Civil",
    description:"", retention_pct:5, tds_pct:2,
    start_date:"", end_date:"",
    sections:[ blankSection() ],
  });
  const [libItems, setLibItems] = useState([]);
  const [showLibFor, setShowLibFor] = useState(null); // {secIdx, itemIdx}
  const [libSearch, setLibSearch] = useState("");
  const [secCollapsed, setSecCollapsed] = useState({});
  const toggleSecCollapse = (si) => setSecCollapsed(p=>({...p,[si]:!p[si]}));

  // Load library items when category changes
  useEffect(()=>{
    api.get("/library/materials").then(r=>{
      if(r.success) setLibItems(r.data||[]);
    }).catch(()=>{});
  },[]);

  // Section helpers
  const addSection = () => setForm(p=>({...p, sections:[...p.sections, blankSection()]}));
  const removeSection = (si) => setForm(p=>({...p, sections:p.sections.filter((_,i)=>i!==si)}));
  const updateSection = (si, key, val) => setForm(p=>({...p, sections:p.sections.map((s,i)=>i===si?{...s,[key]:val}:s)}));
  const addItem = (si) => setForm(p=>({...p, sections:p.sections.map((s,i)=>i===si?{...s,items:[...s.items,{description:"",unit:"",qty:"",rate:"",isLibrary:false}]}:s)}));
  const removeItem = (si,ii) => setForm(p=>({...p, sections:p.sections.map((s,i)=>i===si?{...s,items:s.items.filter((_,j)=>j!==ii)}:s)}));
  const updateItem = (si,ii,key,val) => setForm(p=>({...p, sections:p.sections.map((s,i)=>i===si?{...s,items:s.items.map((it,j)=>j===ii?{...it,[key]:val}:it)}:s)}));

  // Pick from library
  const pickLibItem = (item) => {
    if(!showLibFor) return;
    const {secIdx,itemIdx} = showLibFor;
    updateItem(secIdx,itemIdx,"description",item.name);
    updateItem(secIdx,itemIdx,"unit",item.unit||"");
    updateItem(secIdx,itemIdx,"rate",item.rate||"");
    updateItem(secIdx,itemIdx,"isLibrary",true);
    setShowLibFor(null); setLibSearch("");
  };

  const grandTotal = form.sections.reduce((st,sec)=>
    st + sec.items.reduce((s,it)=>s+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0), 0
  );

  const submit = async () => {
    if(!form.subcon_name) return alert("Subcontractor required");
    const validSecs = form.sections.filter(s=>s.title.trim() && s.items.some(i=>i.description&&i.qty&&i.rate));
    if(validSecs.length===0) return alert("At least 1 section with items required");
    setSaving(true);
    const res = await api.post("/subcon/work-orders",{
      project_id: projectId,
      subcon_name: form.subcon_name,
      subcon_category: form.subcon_category,
      description: form.description,
      retention_pct: parseFloat(form.retention_pct||5),
      tds_pct: parseFloat(form.tds_pct||2),
      start_date: form.start_date||null,
      end_date: form.end_date||null,
      sections: validSecs.map(s=>({
        title: s.title,
        items: s.items.filter(i=>i.description&&i.qty&&i.rate).map(i=>({
          description:i.description, unit:i.unit||"", qty:parseFloat(i.qty), rate:parseFloat(i.rate),
        })),
      })),
    }).catch(()=>({success:false,message:"Network error"}));
    setSaving(false);
    if(res.success) onSaved();
    else alert(res.message||"Failed");
  };

  const filteredLib = libItems.filter(i=>
    !libSearch || i.name.toLowerCase().includes(libSearch.toLowerCase())
  );

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surface,borderRadius:12,width:"min(760px,96vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
        {/* Header */}
        <div style={{background:"#0F172A",padding:"13px 18px",borderRadius:"12px 12px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>New Work Order</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {/* Basic Info */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:14}}>
            <div style={{gridColumn:"1/3"}}>
              <label style={lblStyle}>Subcontractor *</label>
              <input list="sc-list-wo" value={form.subcon_name} onChange={e=>setForm(p=>({...p,subcon_name:e.target.value}))} placeholder="Select or type..." style={inpStyle}/>
              <datalist id="sc-list-wo">{subcons.map(s=><option key={s.id} value={s.name}/>)}</datalist>
            </div>
            <div>
              <label style={lblStyle}>Category</label>
              <SearchSelect value={form.subcon_category} options={CATS}
                onChange={v=>setForm(p=>({...p,subcon_category:v}))} placeholder="Select category..."/>
            </div>
            <div>
              <label style={lblStyle}>Retention %</label>
              <input type="number" value={form.retention_pct} onChange={e=>setForm(p=>({...p,retention_pct:e.target.value}))} style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>TDS %</label>
              <input type="number" value={form.tds_pct} onChange={e=>setForm(p=>({...p,tds_pct:e.target.value}))} style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>Start Date</label>
              <input type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} style={inpStyle}/>
            </div>
          </div>

          {/* Sections */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:T.t2,textTransform:"uppercase",letterSpacing:".4px"}}>Sections & BOQ Items</div>
            <button onClick={addSection}
              style={{background:T.blu,color:"white",border:"none",borderRadius:5,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
              + Add Section
            </button>
          </div>

          {form.sections.map((sec,si)=>{
            const secTotal = sec.items.reduce((s,it)=>s+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0);
            return(
              <div key={si} style={{background:T.surfaceB,border:"1.5px solid "+T.b1,borderRadius:9,marginBottom:12,overflow:"hidden"}}>
                {/* Section header */}
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#1E293B",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                  <div onClick={()=>toggleSecCollapse(si)} style={{cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center"}}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={2.5}
                      style={{transition:"transform .2s",transform:!secCollapsed[si]?"rotate(90deg)":"rotate(0deg)"}}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",minWidth:20}}>#{si+1}</span>
                  <input value={sec.title} onChange={e=>updateSection(si,"title",e.target.value)}
                    onClick={e=>e.stopPropagation()}
                    placeholder="Section name (e.g. Plinth Work, Lintel Level, Slab...)"
                    style={{flex:1,padding:"5px 9px",borderRadius:5,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.08)",color:"white",fontSize:12.5,outline:"none",fontFamily:"inherit"}}/>
                  <span style={{fontSize:11,fontWeight:700,color:"#4ADE80",minWidth:80,textAlign:"right"}}>{fmtC(secTotal)}</span>
                  {form.sections.length>1&&(
                    <button onClick={()=>removeSection(si)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>×</button>
                  )}
                </div>

                {/* Items — hidden when collapsed */}
                {!secCollapsed[si]&&(<div style={{padding:"10px 12px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 34px 28px",gap:6,marginBottom:5}}>
                    {["Description","Unit","Qty","Rate/Unit","Amt",""].map(h=><div key={h} style={{fontSize:8.5,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>{h}</div>)}
                  </div>
                  {sec.items.map((it,ii)=>{
                    const amt=(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0);
                    return(
                      <div key={ii} style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 34px 28px",gap:6,marginBottom:6,alignItems:"center"}}>
                        <div style={{position:"relative"}}>
                          <input value={it.description} onChange={e=>updateItem(si,ii,"description",e.target.value)}
                            placeholder="Item description" style={{...inpStyle,paddingRight:28}}/>
                          <button onClick={()=>{setShowLibFor({secIdx:si,itemIdx:ii});setLibSearch("");}}
                            title="Pick from library"
                            style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.blu,fontSize:14,lineHeight:1,padding:0}}>📚</button>
                        </div>
                        <input value={it.unit} onChange={e=>updateItem(si,ii,"unit",e.target.value)} placeholder="Sqft" style={inpStyle}/>
                        <input type="number" value={it.qty} onChange={e=>updateItem(si,ii,"qty",e.target.value)} placeholder="0" style={inpStyle}/>
                        <input type="number" value={it.rate} onChange={e=>updateItem(si,ii,"rate",e.target.value)} placeholder="0" style={inpStyle}/>
                        <div style={{fontSize:11,fontWeight:700,color:T.grn,textAlign:"right"}}>{amt>0?fmtC(amt):""}</div>
                        <button onClick={()=>removeItem(si,ii)} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:15,padding:0,lineHeight:1}}>×</button>
                      </div>
                    );
                  })}
                  <button onClick={()=>addItem(si)}
                    style={{background:"none",border:"1px dashed "+T.b1,color:T.blu,cursor:"pointer",fontSize:11,fontWeight:600,padding:"5px 10px",borderRadius:5,width:"100%",marginTop:2}}>
                    + Add Item
                  </button>
                </div>)}
              </div>
            );
          })}

          {/* Grand Total */}
          <div style={{textAlign:"right",fontSize:14,fontWeight:800,color:T.grn,padding:"6px 0"}}>
            Grand Total: {fmtC(grandTotal)}
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 16px",borderTop:"1px solid "+T.b1,display:"flex",gap:8,flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,border:"1px solid "+T.b1,background:T.surface,fontSize:12,cursor:"pointer"}}>Cancel</button>
          <button onClick={submit} disabled={saving}
            style={{flex:2,padding:"9px",borderRadius:7,background:saving?T.t4:T.blu,color:"white",border:"none",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            {saving?"Creating...":"Create Work Order"}
          </button>
        </div>
      </div>

      {/* Library picker modal */}
      {showLibFor&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setShowLibFor(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:10,width:"min(420px,92vw)",maxHeight:"70vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 50px rgba(0,0,0,0.3)"}}>
            <div style={{background:"#0F172A",padding:"10px 14px",borderRadius:"10px 10px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:"white"}}>Library — {form.subcon_category}</div>
              <button onClick={()=>setShowLibFor(null)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:18,cursor:"pointer"}}>×</button>
            </div>
            <div style={{padding:"10px 12px",borderBottom:"1px solid "+T.b1}}>
              <input value={libSearch} onChange={e=>setLibSearch(e.target.value)} placeholder="Search items..."
                style={{...inpStyle,marginBottom:0}}/>
            </div>
            <div style={{flex:1,overflowY:"auto"}}>
              {filteredLib.length===0&&<div style={{padding:"20px",textAlign:"center",color:T.t4,fontSize:12}}>No items found</div>}
              {filteredLib.map(item=>(
                <div key={item.id} onClick={()=>pickLibItem(item)}
                  style={{padding:"9px 14px",borderBottom:"1px solid "+T.b1,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{item.name}</div>
                    <div style={{fontSize:10.5,color:T.t4}}>{item.unit||"—"}</div>
                  </div>
                  {item.rate&&<div style={{fontSize:12,fontWeight:700,color:T.grn}}>₹{item.rate}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function EditWOModal({ wo, subcons, fmtC, inpStyle, lblStyle, onClose, onSaved }) {
  const CATS = ["Civil","Electrical","Plumbing","Finishing","Structural","MEP","Waterproofing","Painting","Tiling","Other"];
  const blankItem = () => ({ description:"", unit:"", qty:"", rate:"", isNew:true });
  const blankSection = () => ({ id: null, title:"", items:[blankItem()], isNew:true });

  const [form, setForm] = useState({
    subcon_name: wo.subcon_name||"",
    subcon_category: wo.subcon_category||"Civil",
    description: wo.description||"",
    retention_pct: wo.retention_pct||5,
    tds_pct: wo.tds_pct||2,
    start_date: wo.start_date ? wo.start_date.split("T")[0] : "",
    end_date: wo.end_date ? wo.end_date.split("T")[0] : "",
    status: wo.status||"Active",
  });
  const [sections, setSections] = useState([]);
  const [loadingSecs, setLoadingSecs] = useState(true);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [secCollapsed, setSecCollapsed] = useState({});
  const [libItems, setLibItems] = useState([]);
  const [showLibFor, setShowLibFor] = useState(null);
  const [libSearch, setLibSearch] = useState("");

  useEffect(()=>{
    api.get("/subcon/work-orders/"+wo.id).then(r=>{
      if(r.success){
        const secs = (r.data.sections||[]).map(s=>({
          ...s, items: (s.items||[]).map(it=>({...it, isNew:false})), isNew:false
        }));
        setSections(secs);
      }
      setLoadingSecs(false);
    }).catch(()=>setLoadingSecs(false));
    api.get("/library/materials").then(r=>{ if(r.success) setLibItems(r.data||[]); }).catch(()=>{});
  },[wo.id]);

  // Section helpers
  const addSection = () => setSections(p=>[...p, blankSection()]);
  const removeSection = (si) => setSections(p=>p.filter((_,i)=>i!==si));
  const updateSection = (si,key,val) => setSections(p=>p.map((s,i)=>i===si?{...s,[key]:val}:s));
  const addItem = (si) => setSections(p=>p.map((s,i)=>i===si?{...s,items:[...s.items,blankItem()]}:s));
  const removeItem = (si,ii) => setSections(p=>p.map((s,i)=>i===si?{...s,items:s.items.filter((_,j)=>j!==ii)}:s));
  const updateItem = (si,ii,key,val) => setSections(p=>p.map((s,i)=>i===si?{...s,items:s.items.map((it,j)=>j===ii?{...it,[key]:val}:it)}:s));
  const pickLibItem = (item) => {
    if(!showLibFor) return;
    const {si,ii} = showLibFor;
    updateItem(si,ii,"description",item.name);
    updateItem(si,ii,"unit",item.unit||"");
    updateItem(si,ii,"rate",item.rate||"");
    setShowLibFor(null); setLibSearch("");
  };

  const grandTotal = sections.reduce((st,sec)=>st+sec.items.reduce((s,it)=>s+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0),0);

  const submit = async () => {
    if(!form.subcon_name) return alert("Subcontractor required");
    if(!reason.trim()) return alert("Change reason required for approval");
    const validSecs = sections.filter(s=>s.title.trim());
    setSaving(true);
    const res = await api.post("/subcon/work-orders/"+wo.id+"/amendment",{
      proposed_form: form,
      proposed_sections: validSecs.map(s=>({
        id: s.id||null,
        title: s.title,
        items: s.items.filter(i=>i.description&&i.qty&&i.rate).map(i=>({
          id: i.id||null,
          description:i.description, unit:i.unit||"", qty:parseFloat(i.qty), rate:parseFloat(i.rate)
        }))
      })),
      reason,
    }).catch(()=>({success:false,message:"Network error"}));
    setSaving(false);
    if(res.success){
      api.post("/approvals/submit", {
        module: "Subcon WO Amendment",
        ref_id: res.data.id,
        ref_no: res.data.amendment_no || wo.wo_number || "",
        title: (form.subcon_name||"") + " - WO Amendment",
        amount: grandTotal || 0,
        project_id: wo.project_id || projectId,
        project_name: wo.project_name || "",
        notes: reason || "",
      }).catch(e => console.error("Approval submit:", e));
      onSaved();
    }
    else alert(res.message||"Failed");
  };

  const filteredLib = libItems.filter(i=>!libSearch||i.name.toLowerCase().includes(libSearch.toLowerCase()));

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surface,borderRadius:12,width:"min(800px,97vw)",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.35)"}}>

        {/* Header */}
        <div style={{background:"#0F172A",padding:"13px 18px",borderRadius:"12px 12px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"white"}}>Edit Work Order</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2}}>Changes will require admin approval before applying</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:22,cursor:"pointer",lineHeight:1}}>×</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:16}}>

          {/* Basic Info */}
          <div style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Basic Details</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:16,background:T.surfaceB,padding:12,borderRadius:8,border:"1px solid "+T.b1}}>
            <div style={{gridColumn:"1/3"}}>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Subcontractor *</label>
              <input list="sc-edit-list" value={form.subcon_name} onChange={e=>setForm(p=>({...p,subcon_name:e.target.value}))} style={inpStyle}/>
              <datalist id="sc-edit-list">{subcons.map(s=><option key={s.id} value={s.name}/>)}</datalist>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Category</label>
              <SearchSelect value={form.subcon_category} options={CATS}
                onChange={v=>setForm(p=>({...p,subcon_category:v}))} placeholder="Select category..."/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Status</label>
              <SearchSelect value={form.status} options={["Active","On Hold","Completed","Cancelled"]}
                onChange={v=>setForm(p=>({...p,status:v}))} placeholder="Select status..."/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Retention %</label>
              <input type="number" value={form.retention_pct} onChange={e=>setForm(p=>({...p,retention_pct:e.target.value}))} style={inpStyle}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>TDS %</label>
              <input type="number" value={form.tds_pct} onChange={e=>setForm(p=>({...p,tds_pct:e.target.value}))} style={inpStyle}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Start Date</label>
              <input type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} style={inpStyle}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>End Date</label>
              <input type="date" value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} style={inpStyle}/>
            </div>
            <div style={{gridColumn:"1/4"}}>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Description / Remark</label>
              <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={inpStyle} placeholder="Optional"/>
            </div>
          </div>

          {/* Sections & BOQ */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px"}}>
              Sections & BOQ Items
              <span style={{marginLeft:8,fontSize:10,fontWeight:700,color:T.grn}}>Grand Total: {fmtC(grandTotal)}</span>
            </div>
            <button onClick={addSection}
              style={{background:T.blu,color:"white",border:"none",borderRadius:5,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
              + Add Section
            </button>
          </div>

          {loadingSecs&&<div style={{textAlign:"center",padding:"20px",color:T.t4,fontSize:12}}>Loading sections...</div>}

          {sections.map((sec,si)=>{
            const secTotal = sec.items.reduce((s,it)=>s+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0);
            const isOpen = !secCollapsed[si];
            return(
              <div key={si} style={{background:T.surfaceB,border:"1.5px solid "+(sec.isNew?T.blu:T.b1),borderRadius:9,marginBottom:10,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#1E293B",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                  <div onClick={()=>setSecCollapsed(p=>({...p,[si]:!p[si]}))} style={{cursor:"pointer",flexShrink:0}}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={2.5}
                      style={{transition:"transform .2s",transform:isOpen?"rotate(90deg)":"rotate(0deg)"}}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                  {sec.isNew&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"#1D4ED8",color:"white"}}>NEW</span>}
                  <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",minWidth:20}}>#{si+1}</span>
                  <input value={sec.title} onChange={e=>updateSection(si,"title",e.target.value)}
                    onClick={e=>e.stopPropagation()}
                    placeholder="Section name..."
                    style={{flex:1,padding:"5px 9px",borderRadius:5,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.08)",color:"white",fontSize:12.5,outline:"none",fontFamily:"inherit"}}/>
                  <span style={{fontSize:11,fontWeight:700,color:"#4ADE80",minWidth:80,textAlign:"right"}}>{fmtC(secTotal)}</span>
                  <button onClick={()=>removeSection(si)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>×</button>
                </div>

                {isOpen&&(<div style={{padding:"10px 12px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 34px 28px",gap:6,marginBottom:5}}>
                    {["Description","Unit","Qty","Rate/Unit","Amt",""].map(h=><div key={h} style={{fontSize:8.5,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>{h}</div>)}
                  </div>
                  {sec.items.map((it,ii)=>{
                    const amt=(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0);
                    return(
                      <div key={ii} style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 34px 28px",gap:6,marginBottom:6,alignItems:"center",
                        background:it.isNew?"#EFF6FF":"transparent",borderRadius:it.isNew?4:0,padding:it.isNew?"2px 4px":"0"}}>
                        <div style={{position:"relative"}}>
                          <input value={it.description} onChange={e=>updateItem(si,ii,"description",e.target.value)}
                            placeholder="Item description" style={{...inpStyle,paddingRight:28}}/>
                          <button onClick={()=>{setShowLibFor({si,ii});setLibSearch("");}}
                            style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.blu,fontSize:14,lineHeight:1,padding:0}}>📚</button>
                        </div>
                        <input value={it.unit} onChange={e=>updateItem(si,ii,"unit",e.target.value)} placeholder="Sqft" style={inpStyle}/>
                        <input type="number" value={it.qty} onChange={e=>updateItem(si,ii,"qty",e.target.value)} placeholder="0" style={inpStyle}/>
                        <input type="number" value={it.rate} onChange={e=>updateItem(si,ii,"rate",e.target.value)} placeholder="0" style={inpStyle}/>
                        <div style={{fontSize:11,fontWeight:700,color:T.grn,textAlign:"right"}}>{amt>0?fmtC(amt):""}</div>
                        <button onClick={()=>removeItem(si,ii)} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:15,padding:0,lineHeight:1}}>×</button>
                      </div>
                    );
                  })}
                  <button onClick={()=>addItem(si)}
                    style={{background:"none",border:"1px dashed "+T.b1,color:T.blu,cursor:"pointer",fontSize:11,fontWeight:600,padding:"5px 10px",borderRadius:5,width:"100%",marginTop:2}}>
                    + Add Item
                  </button>
                </div>)}
              </div>
            );
          })}

          {/* Change Reason */}
          <div style={{marginTop:14,background:"#FFF7ED",border:"1.5px solid #FED7AA",borderRadius:8,padding:12}}>
            <div style={{fontSize:10,fontWeight:700,color:"#92400E",textTransform:"uppercase",marginBottom:6}}>⚠ Change Reason (Required for Approval)</div>
            <textarea value={reason} onChange={e=>setReason(e.target.value)}
              placeholder="Reason for this change (e.g. Scope change — added FF slab work, rate revision approved by PM...)"
              style={{width:"100%",minHeight:60,padding:"8px 10px",borderRadius:6,border:"1.5px solid #FED7AA",fontSize:12,outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",background:"white"}}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 16px",borderTop:"1px solid "+T.b1,display:"flex",gap:8,flexShrink:0,background:T.surfaceB}}>
          <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,border:"1px solid "+T.b1,background:T.surface,fontSize:12,cursor:"pointer"}}>Cancel</button>
          <button onClick={submit} disabled={saving||!reason.trim()}
            style={{flex:2,padding:"9px",borderRadius:7,background:saving||!reason.trim()?T.t4:"#D97706",color:"white",border:"none",fontSize:13,fontWeight:700,cursor:saving||!reason.trim()?"not-allowed":"pointer"}}>
            {saving?"Submitting...":"Submit for Approval"}
          </button>
        </div>

        {/* Library picker */}
        {showLibFor&&(
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.3)",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:T.surface,borderRadius:10,width:"min(400px,94vw)",maxHeight:"70vh",display:"flex",flexDirection:"column",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.b1,display:"flex",gap:8,alignItems:"center"}}>
                <input value={libSearch} onChange={e=>setLibSearch(e.target.value)} autoFocus
                  placeholder="Search materials..." style={{...inpStyle,flex:1}}/>
                <button onClick={()=>setShowLibFor(null)} style={{background:"none",border:"none",color:T.t3,cursor:"pointer",fontSize:18}}>×</button>
              </div>
              <div style={{flex:1,overflowY:"auto"}}>
                {filteredLib.map(item=>(
                  <div key={item.id} onClick={()=>pickLibItem(item)}
                    style={{padding:"9px 14px",borderBottom:"1px solid "+T.b1,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#F0F9FF"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{item.name}</div>
                      <div style={{fontSize:10,color:T.t4}}>{item.unit} · {item.category_name}</div>
                    </div>
                    {item.rate&&<div style={{fontSize:12,fontWeight:700,color:T.grn}}>₹{item.rate}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AmendmentsTab({ amendments, fmtC, onRefresh }) {
  const [actioning, setActioning] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const action = async (id, status) => {
    setActioning(id+status);
    await api.patch("/subcon/amendments/"+id+"/action", {status}).catch(()=>{});
    setActioning(null);
    onRefresh();
  };

  if(amendments.length===0) return(
    <div style={{textAlign:"center",padding:"48px 20px",color:T.t4}}>
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.5} style={{margin:"0 auto 10px",display:"block"}}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <div style={{fontSize:13,color:T.t3}}>No amendments yet</div>
      <div style={{fontSize:11,color:T.t4,marginTop:4}}>Edit WO pe click karo changes propose karne ke liye</div>
    </div>
  );

  return(
    <div>
      {amendments.map(a=>{
        const stC = a.status==="Approved"?T.grn:a.status==="Rejected"?T.red:T.amb;
        const isExp = expandedId===a.id;
        let proposed = {};
        try { proposed = typeof a.proposed_data==="string" ? JSON.parse(a.proposed_data) : a.proposed_data; } catch(e){}
        return(
          <div key={a.id} style={{border:"1px solid "+T.b1,borderRadius:8,marginBottom:8,overflow:"hidden",borderLeft:"3px solid "+stC}}>
            <div onClick={()=>setExpandedId(isExp?null:a.id)}
              style={{padding:"10px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",background:T.surfaceB}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:T.t1}}>Amendment #{a.id}</div>
                <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>{a.reason}</div>
                <div style={{fontSize:10,color:T.t4,marginTop:2}}>{a.created_at ? new Date(a.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"}) : "—"}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:stC+"22",color:stC}}>{a.status}</span>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={T.t3} strokeWidth={2.5}
                  style={{transform:isExp?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            {isExp&&(
              <div style={{padding:"12px 14px",borderTop:"1px solid "+T.b1}}>
                {/* Proposed basic changes */}
                {proposed.proposed_form&&(
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:6}}>Proposed Changes</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                      {[
                        {l:"Subcontractor",v:proposed.proposed_form.subcon_name},
                        {l:"Category",v:proposed.proposed_form.subcon_category},
                        {l:"Status",v:proposed.proposed_form.status},
                        {l:"Retention",v:proposed.proposed_form.retention_pct+"%"},
                        {l:"TDS",v:proposed.proposed_form.tds_pct+"%"},
                        {l:"Start",v:proposed.proposed_form.start_date||"—"},
                      ].map(f=>(
                        <div key={f.l} style={{background:T.surfaceB,borderRadius:5,padding:"6px 8px"}}>
                          <div style={{fontSize:9,color:T.t4,textTransform:"uppercase"}}>{f.l}</div>
                          <div style={{fontSize:11,fontWeight:600,color:T.t1}}>{f.v||"—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Sections summary */}
                {proposed.proposed_sections&&proposed.proposed_sections.length>0&&(
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:6}}>Sections ({proposed.proposed_sections.length})</div>
                    {proposed.proposed_sections.map((sec,si)=>{
                      const secTotal = (sec.items||[]).reduce((s,it)=>s+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0);
                      return(
                        <div key={si} style={{background:T.surfaceB,border:"1px solid "+T.b1,borderRadius:6,marginBottom:6,overflow:"hidden"}}>
                          <div style={{padding:"6px 10px",background:"#1E293B",display:"flex",justifyContent:"space-between"}}>
                            <span style={{fontSize:11,fontWeight:700,color:"white"}}>{si+1}. {sec.title}</span>
                            <span style={{fontSize:11,fontWeight:700,color:"#4ADE80"}}>{fmtC(secTotal)}</span>
                          </div>
                          {(sec.items||[]).map((it,ii)=>(
                            <div key={ii} style={{display:"grid",gridTemplateColumns:"1fr 60px 70px 80px 80px",padding:"5px 10px",gap:6,borderBottom:"1px solid "+T.b1,fontSize:11}}>
                              <span style={{color:T.t1}}>{it.description}</span>
                              <span style={{color:T.t3}}>{it.unit}</span>
                              <span style={{color:T.t2,textAlign:"right"}}>{it.qty}</span>
                              <span style={{color:T.t2,textAlign:"right"}}>{fmtC(it.rate)}</span>
                              <span style={{fontWeight:700,color:T.grn,textAlign:"right"}}>{fmtC((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0))}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Approve/Reject buttons */}
                {a.status==="Pending"&&(
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>action(a.id,"Rejected")} disabled={!!actioning}
                      style={{flex:1,padding:"7px",borderRadius:6,border:"1px solid "+T.red,background:"white",color:T.red,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      ✕ Reject
                    </button>
                    <button onClick={()=>action(a.id,"Approved")} disabled={!!actioning}
                      style={{flex:2,padding:"7px",borderRadius:6,background:actioning?T.t4:T.grn,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      {actioning===a.id+"Approved"?"Applying...":"✓ Approve & Apply"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WoItemsTable({ woId, fmtC }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState({});
  useEffect(()=>{
    setLoading(true);
    api.get("/subcon/work-orders/"+woId).then(r=>{
      if(r.success) setSections(r.data.sections||[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[woId]);

  const toggleSec = (id) => setCollapsed(p=>({...p,[id]:!p[id]}));

  if(loading) return <div style={{textAlign:"center",padding:"60px 0",color:T.t4}}><div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>Loading...</div>;
  if(sections.length===0) return <div style={{textAlign:"center",padding:"24px",color:T.t4,fontSize:12}}>No BOQ items</div>;

  const grandTotal = sections.reduce((st,sec)=>st+(sec.items||[]).reduce((s,it)=>s+parseFloat(it.amount||0),0),0);

  return(
    <div>
      {sections.map((sec,si)=>{
        const secTotal = (sec.items||[]).reduce((s,it)=>s+parseFloat(it.amount||0),0);
        const isOpen = !collapsed[sec.id];
        return(
          <div key={sec.id} style={{marginBottom:8,border:"1px solid "+T.b1,borderRadius:8,overflow:"hidden"}}>
            {/* Section header — clickable to collapse */}
            <div onClick={()=>toggleSec(sec.id)}
              style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"#1E293B",cursor:"pointer",userSelect:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {/* Chevron */}
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2.5}
                  style={{transition:"transform .2s",transform:isOpen?"rotate(90deg)":"rotate(0deg)"}}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <span style={{fontSize:12.5,fontWeight:700,color:"white"}}>{si+1}. {sec.title}</span>
                <span style={{fontSize:9.5,color:"rgba(255,255,255,0.4)",fontWeight:400}}>{(sec.items||[]).length} items</span>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:"#4ADE80"}}>{fmtC(secTotal)}</span>
            </div>
            {/* Items — hidden when collapsed */}
            {isOpen&&(<>
              <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 90px",background:"#374151",padding:"5px 12px",gap:8}}>
                {["Description","Unit","Qty","Rate","Amount"].map((h,i)=>(
                  <div key={h} style={{fontSize:8.5,fontWeight:700,color:"rgba(255,255,255,.4)",textTransform:"uppercase",textAlign:i>1?"right":"left"}}>{h}</div>
                ))}
              </div>
              {(sec.items||[]).map((it,i)=>(
                <div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 90px",padding:"7px 12px",gap:8,borderBottom:"1px solid "+T.b1,background:i%2===0?T.surface:"#F8FAFC"}}>
                  <div style={{fontSize:12,color:T.t1}}>{it.description}</div>
                  <div style={{fontSize:11,color:T.t3}}>{it.unit}</div>
                  <div style={{fontSize:12,color:T.t2,textAlign:"right"}}>{it.qty}</div>
                  <div style={{fontSize:12,color:T.t2,textAlign:"right"}}>{fmtC(it.rate)}</div>
                  <div style={{fontSize:12,fontWeight:700,color:T.grn,textAlign:"right"}}>{fmtC(it.amount)}</div>
                </div>
              ))}
            </>)}
          </div>
        );
      })}
      <div style={{textAlign:"right",fontSize:13,fontWeight:800,color:T.grn,padding:"6px 0"}}>
        Grand Total: {fmtC(grandTotal)}
      </div>
    </div>
  );
}

function NewRaBillModal({ woId, fmtC, inpStyle, lblStyle, billForm, setBillForm, saving, onClose, onSave }) {
  const [sections, setSections] = useState([]); // [{title, items:[{id,description,unit,qty,rate,prev_cum}]}]
  const [loadingWO, setLoadingWO] = useState(true);
  const [cumQtys, setCumQtys] = useState({}); // {item_id: cumulative_qty_string}

  useEffect(()=>{
    setLoadingWO(true);
    api.get("/subcon/work-orders/"+woId).then(async r=>{
      if(!r.success){ setLoadingWO(false); return; }
      const secs = r.data.sections||[];
      const unsec = r.data.unsectioned||[];

      // Flatten all items to get prev cumulatives
      const allItems = [];
      secs.forEach(s=>(s.items||[]).forEach(it=>allItems.push(it)));
      unsec.forEach(it=>allItems.push(it));

      // Fetch prev cumulative per item from last bill
      const prevMap = {};
      await Promise.all(allItems.map(async it=>{
        try{
          const pr = await api.get("/subcon/prev-cumulative?wo_item_id="+it.id+"&wo_id="+woId);
          prevMap[it.id] = parseFloat(pr.data?.prev_cum||0);
        } catch(e){ prevMap[it.id]=0; }
      }));

      // Build sections with prev_cum
      const builtSecs = secs.map(s=>({
        ...s,
        items:(s.items||[]).map(it=>({...it, prev_cum: prevMap[it.id]||0}))
      }));
      if(unsec.length>0) builtSecs.push({ title:"Other Items", items: unsec.map(it=>({...it, prev_cum: prevMap[it.id]||0})) });

      setSections(builtSecs);
      // Init cumQtys = prev_cum (so user starts from where last bill ended)
      const initCums = {};
      allItems.forEach(it=>{ initCums[it.id] = String(prevMap[it.id]||""); });
      setCumQtys(initCums);
      // Also update billForm items for submit
      setBillForm(p=>({...p, items: allItems.map(it=>({ wo_item_id:it.id, cumulative_qty: prevMap[it.id]||0, rate:it.rate }))}));
      setLoadingWO(false);
    }).catch(()=>setLoadingWO(false));
  },[woId]);

  // When user updates a cumQty, sync to billForm.items
  const updateCum = (itemId, val) => {
    setCumQtys(p=>({...p,[itemId]:val}));
    setBillForm(p=>({
      ...p,
      items: p.items.map(bi=>bi.wo_item_id===itemId ? {...bi, cumulative_qty: parseFloat(val)||0} : bi)
    }));
  };

  // Live gross calculation
  const gross = sections.reduce((st,sec)=>
    st + sec.items.reduce((s,it)=>{
      const cum = parseFloat(cumQtys[it.id]||0);
      const thisBill = Math.max(0, cum - (it.prev_cum||0));
      return s + thisBill * parseFloat(it.rate||0);
    },0)
  ,0);

  // Get WO retention/tds — from first section item or default
  const allWoItems = sections.flatMap(s=>s.items);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surface,borderRadius:12,width:"min(740px,96vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>

        {/* Header */}
        <div style={{background:"#0F172A",padding:"13px 16px",borderRadius:"12px 12px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"white"}}>New RA Bill</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:1}}>Running Account Bill — enter cumulative qty up to this bill</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:20,cursor:"pointer"}}>×</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:16}}>

          {/* Date + Remark */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10,marginBottom:16}}>
            <div>
              <label style={lblStyle}>Bill Date *</label>
              <input type="date" value={billForm.bill_date} onChange={e=>setBillForm(p=>({...p,bill_date:e.target.value}))} style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>Remark</label>
              <input value={billForm.remark||""} onChange={e=>setBillForm(p=>({...p,remark:e.target.value}))} style={inpStyle} placeholder="e.g. Bill for plinth work completion..."/>
            </div>
          </div>

          {/* Column headers */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 55px 70px 70px 70px 75px 85px",background:"#1E293B",padding:"7px 12px",gap:8,borderRadius:"7px 7px 0 0"}}>
            {["Item","Unit","WO Qty","Prev Cum","Rate","This Cum ▼","This Bill Amt"].map((h,i)=>(
              <div key={h} style={{fontSize:8.5,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",textAlign:i>1?"right":"left"}}>{h}</div>
            ))}
          </div>

          {loadingWO&&<div style={{padding:"24px",textAlign:"center",color:T.t4,fontSize:12}}>Loading WO items...</div>}

          {!loadingWO&&sections.map((sec,si)=>{
            const secThisBillAmt = sec.items.reduce((s,it)=>{
              const cum=parseFloat(cumQtys[it.id]||0);
              return s + Math.max(0,cum-(it.prev_cum||0))*parseFloat(it.rate||0);
            },0);
            return(
              <div key={si}>
                {/* Section header */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 55px 70px 70px 70px 75px 85px",padding:"6px 12px",gap:8,background:"#374151",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                  <div style={{gridColumn:"1/7",fontSize:11,fontWeight:700,color:"white"}}>{si+1}. {sec.title}</div>
                  <div style={{fontSize:11,fontWeight:700,color:"#4ADE80",textAlign:"right"}}>{fmtC(secThisBillAmt)}</div>
                </div>
                {sec.items.map(it=>{
                  const cum = parseFloat(cumQtys[it.id]||0);
                  const thisBill = Math.max(0, cum-(it.prev_cum||0));
                  const thisAmt = thisBill * parseFloat(it.rate||0);
                  const overLimit = cum > parseFloat(it.qty||0);
                  return(
                    <div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 55px 70px 70px 70px 75px 85px",padding:"8px 12px",gap:8,borderBottom:"1px solid "+T.b1,alignItems:"center",background:overLimit?"#FEF2F2":T.surface}}>
                      <div style={{fontSize:11.5,color:T.t1,fontWeight:500}}>{it.description}</div>
                      <div style={{fontSize:11,color:T.t4,textAlign:"right"}}>{it.unit}</div>
                      <div style={{fontSize:12,color:T.t2,textAlign:"right",fontWeight:500}}>{it.qty}</div>
                      <div style={{fontSize:12,color:T.t3,textAlign:"right"}}>{it.prev_cum||0}</div>
                      <div style={{fontSize:12,fontWeight:700,color:T.blu,textAlign:"right"}}>₹{parseFloat(it.rate||0).toLocaleString("en-IN")}</div>
                      <div>
                        <input type="number" value={cumQtys[it.id]||""} min={0}
                          onChange={e=>updateCum(it.id, e.target.value)}
                          style={{...inpStyle,textAlign:"right",fontWeight:700,padding:"5px 8px",
                            border:"1.5px solid "+(overLimit?T.red:cum>(it.prev_cum||0)?T.blu:T.b1),
                            color:overLimit?T.red:T.t1}}/>
                        {overLimit&&<div style={{fontSize:9,color:T.red,marginTop:1,textAlign:"right"}}>Exceeds WO!</div>}
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:12,fontWeight:700,color:thisAmt>0?T.grn:T.t4}}>{thisAmt>0?fmtC(thisAmt):"—"}</div>
                        {thisBill>0&&<div style={{fontSize:9,color:T.t4,marginTop:1}}>{thisBill} {it.unit}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Bill Summary */}
          {gross>0&&(
            <div style={{marginTop:14,background:"#0F172A",borderRadius:8,padding:14}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",marginBottom:10}}>Bill Summary</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[
                  {l:"Gross Amount",v:fmtC(gross),c:"#94A3B8"},
                  {l:"Retention (5%)",v:fmtC(gross*0.05),c:"#FCD34D"},
                  {l:"TDS (2%)",v:fmtC(gross*0.02),c:"#F87171"},
                  {l:"Net Payable",v:fmtC(gross*0.93),c:"#4ADE80"},
                ].map(s=>(
                  <div key={s.l} style={{textAlign:"center",background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"8px"}}>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginBottom:3}}>{s.l}</div>
                    <div style={{fontSize:14,fontWeight:800,color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"12px 16px",borderTop:"1px solid "+T.b1,display:"flex",gap:8,flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,border:"1px solid "+T.b1,background:T.surface,fontSize:12,cursor:"pointer"}}>Cancel</button>
          <button onClick={onSave} disabled={saving||gross===0}
            style={{flex:2,padding:"9px",borderRadius:7,background:saving||gross===0?T.t4:T.blu,color:"white",border:"none",fontSize:13,fontWeight:700,cursor:saving||gross===0?"not-allowed":"pointer"}}>
            {saving?"Submitting...":gross>0?"Submit RA Bill — "+fmtC(gross):"Enter quantities to proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentsTab({ woId, fmtC }) {
  const [payments, setPayments] = useState([]);
  useEffect(()=>{
    api.get("/subcon/payments?wo_id="+woId).then(r=>{ if(r.success) setPayments(r.data||[]); }).catch(()=>{});
  },[woId]);
  if(payments.length===0) return <div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No payments recorded yet</div>;
  const total = payments.reduce((s,p)=>s+parseFloat(p.amount_paid||0),0);
  return(
    <div>
      {payments.map((p,i)=>(
        <div key={p.id} style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,padding:"10px 14px",marginBottom:8,borderLeft:"3px solid "+T.grn,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:T.grn}}>{fmtC(p.amount_paid)}</div>
            <div style={{fontSize:10.5,color:T.t4,marginTop:2}}>{p.payment_mode} · {p.payment_date?new Date(p.payment_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"—"}</div>
          </div>
          <div style={{textAlign:"right"}}>
            {p.reference_no&&<div style={{fontSize:11,color:T.blu,fontFamily:"monospace"}}>{p.reference_no}</div>}
            {p.remark&&<div style={{fontSize:11,color:T.t3}}>{p.remark}</div>}
          </div>
        </div>
      ))}
      <div style={{textAlign:"right",fontSize:14,fontWeight:800,color:T.grn,marginTop:8}}>Total Paid: {fmtC(total)}</div>
    </div>
  );
}


function TabEquipment() {
  const [selEq, setSelEq] = useState(D.equipment[0] || null);

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
function TabFiles({ projectId }) {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selFolder, setSelFolder] = useState("all");

  useEffect(() => {
    setLoading(true);
    api.get("/solar/projects/" + projectId + "/all-files").then(r => {
      if (r.success) { setFiles(r.data || []); setFolders(r.folders || []); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  const typeS = { PDF:{c:T.red,bg:T.redL,icon:"📄"}, IMG:{c:T.grn,bg:T.grnL,icon:"🖼"}, VID:{c:T.pur,bg:T.purL,icon:"🎥"} };
  const folderIcons = {"KYC Documents":"📁","Site Photos":"📷","Stage Documents":"📋","Quotations":"💰","Installation Photos":"🔧","Videos":"🎥"};
  const folderColors = {
    "KYC Documents":{c:"#7C3AED",bg:"#F5F3FF",bdr:"#C084FC"},
    "Site Photos":{c:"#2563EB",bg:"#EFF6FF",bdr:"#93C5FD"},
    "Stage Documents":{c:"#059669",bg:"#ECFDF5",bdr:"#6EE7B7"},
    "Quotations":{c:"#D97706",bg:"#FFFBEB",bdr:"#FDE68A"},
    "Installation Photos":{c:"#EA580C",bg:"#FFF7ED",bdr:"#FDBA74"},
    "Videos":{c:"#7C3AED",bg:"#F5F3FF",bdr:"#C084FC"},
  };

  const uploadedCount = files.filter(f=>f.uploaded).length;
  const pendingCount = files.filter(f=>!f.uploaded).length;
  const filtered = selFolder==="all"?files:files.filter(f=>f.folder===selFolder);

  if (loading) return <div style={{textAlign:"center",padding:"60px",color:T.t4}}>Loading files...</div>;

  return (
    <div style={{padding:"16px 0"}}>
      {/* Summary row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div onClick={()=>setSelFolder("all")} style={{padding:"12px 14px",borderRadius:9,border:`1.5px solid ${selFolder==="all"?T.blu:T.b1}`,background:selFolder==="all"?T.bluL:T.surface,cursor:"pointer"}}>
          <div style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase"}}>Total Files</div>
          <div style={{fontSize:22,fontWeight:700,color:T.t1}}>{files.length}</div>
        </div>
        <div style={{padding:"12px 14px",borderRadius:9,border:`1px solid ${T.b1}`,background:T.surface}}>
          <div style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase"}}>Uploaded</div>
          <div style={{fontSize:22,fontWeight:700,color:T.grn}}>{uploadedCount}</div>
        </div>
        <div style={{padding:"12px 14px",borderRadius:9,border:`1px solid ${T.b1}`,background:T.surface}}>
          <div style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase"}}>Pending</div>
          <div style={{fontSize:22,fontWeight:700,color:pendingCount?T.red:T.grn}}>{pendingCount}</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:14}}>
        {/* ── Folder sidebar ── */}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {folders.map(fol=>{
            const fc=folderColors[fol.name]||{c:T.slt,bg:T.sltL,bdr:T.b1};
            const active=selFolder===fol.name;
            const pct=fol.total?Math.round(fol.uploaded/fol.total*100):0;
            return(
              <button key={fol.name} onClick={()=>setSelFolder(active?"all":fol.name)}
                style={{padding:"10px 12px",border:`1.5px solid ${active?fc.c:T.b1}`,borderRadius:8,background:active?fc.bg:T.surface,cursor:"pointer",textAlign:"left",borderLeft:`4px solid ${active?fc.c:T.b1}`,transition:"all .15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:14}}>{folderIcons[fol.name]||"📁"}</span>
                  <span style={{fontSize:11.5,fontWeight:700,color:active?fc.c:T.t1,flex:1}}>{fol.name}</span>
                  <span style={{fontSize:10,color:T.t4,background:T.surfaceB,padding:"1px 7px",borderRadius:20,border:`1px solid ${T.b1}`}}>{fol.uploaded}/{fol.total}</span>
                </div>
                <div style={{height:3,background:T.b1,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:pct===100?T.grn:fc.c,borderRadius:3,transition:"width .3s"}}/>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── File list ── */}
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden",alignSelf:"start"}}>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:"28px 1fr 130px 50px 90px",padding:"8px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px"}}>
            <span>#</span><span>File Name</span><span>Used In</span><span>Type</span><span>Actions</span>
          </div>
          {filtered.length===0&&(
            <div style={{padding:"30px",textAlign:"center",color:T.t4,fontSize:12}}>{selFolder==="all"?"No files found":"No files in this folder"}</div>
          )}
          {filtered.map((f,i)=>{
            const ft=typeS[f.type]||{c:T.slt,bg:T.sltL,icon:"📎"};
            return(
              <div key={i} style={{display:"grid",gridTemplateColumns:"28px 1fr 130px 50px 90px",padding:"8px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",
                background:f.uploaded?"white":"#FEF2F2",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=f.uploaded?T.surfaceB:"#FEE2E2"}
                onMouseLeave={e=>e.currentTarget.style.background=f.uploaded?"white":"#FEF2F2"}>
                <span style={{fontSize:11,color:T.t4,fontWeight:600}}>{i+1}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:f.uploaded?T.t1:T.red,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {f.uploaded?"":"⚠ "}{f.name}
                  </div>
                  {f.uploaded_at&&<div style={{fontSize:9.5,color:T.t4,marginTop:1}}>{new Date(f.uploaded_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>}
                </div>
                <div style={{fontSize:10,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={f.used_in||""}>
                  {f.used_in||"—"}
                </div>
                <span style={{fontSize:10,fontWeight:700,color:ft.c,background:ft.bg,padding:"2px 6px",borderRadius:8,textAlign:"center"}}>
                  {f.type||"—"}
                </span>
                <div style={{display:"flex",gap:4}}>
                  {f.uploaded&&f.file_url?(
                    <>
                      <a href={f.file_url} target="_blank" rel="noreferrer"
                        style={{padding:"3px 8px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10,fontWeight:600,textDecoration:"none"}}>
                        View
                      </a>
                      <a href={f.file_url} download target="_blank" rel="noreferrer"
                        style={{padding:"3px 8px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:10,fontWeight:600,textDecoration:"none"}}>
                        ⬇
                      </a>
                    </>
                  ):(
                    <span style={{fontSize:10,color:T.red,fontWeight:600}}>Pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 13 — SITE / DPR
// ═══════════════════════════════════════════════════════════════════
function TabSite() {
  const [selDPR, setSelDPR] = useState(D.dpr[0] || null);
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
  const PHOTOS = [];

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
  const [sel, setSel] = useState(D.moms[0] || null);
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
// ─── SKELETON LOADER ─────────────────────────────────────────────
function Sk({ w="100%", h=14, r=6, mb=0 }) {
  return <div style={{width:w,height:h,borderRadius:r,marginBottom:mb,background:"linear-gradient(90deg,#E5E7EB 25%,#F3F4F6 50%,#E5E7EB 75%)",backgroundSize:"200% 100%",animation:"skShimmer 1.4s infinite"}}/>;
}
if(typeof document!=="undefined"&&!document.getElementById("sk-style")){const s=document.createElement("style");s.id="sk-style";s.textContent="@keyframes skShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}";document.head.appendChild(s);}

function TaskSkeleton({gridTemplate}={}){
  const GRID = gridTemplate || "26px 52px 320px 85px 100px 82px 82px 44px 80px";
  return(
    <div style={{padding:"0 0"}}>
      {[1,2,3,4,5,6,7,8].map(i=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:GRID,alignItems:"center",height:34,borderBottom:"1px solid #F3F4F6",paddingLeft:4,opacity:Math.max(0.2,1-i*0.1)}}>
          <Sk w={14} h={14} r={3}/>
          <div style={{padding:"0 5px"}}><Sk w="80%" h={10} mb={3}/><Sk w="55%" h={8}/></div>
          <div style={{padding:"0 8px"}}><Sk w={i%3===0?"55%":i%2===0?"70%":"85%"} h={11}/></div>
          <div style={{padding:"0 6px"}}><Sk w={58} h={18} r={20}/></div>
          <div style={{padding:"0 8px"}}><Sk w="65%" h={8} mb={4}/><Sk w="65%" h={4} r={2}/></div>
          <div style={{padding:"0 6px"}}><Sk w={52} h={10}/></div>
          <div style={{padding:"0 6px"}}><Sk w={52} h={10}/></div>
          <div style={{padding:"0 4px"}}><Sk w={24} h={10}/></div>
          <div style={{padding:"0 6px"}}><Sk w={40} h={10}/></div>
        </div>
      ))}
    </div>
  );
}

// PROJECT DETAIL PAGE — SHELL
// ═══════════════════════════════════════════════════════════════════

// ── Tab icons (inline SVG, single path each) ──
const TabIc = ({d, size=16, color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const IcOverview  = (p) => <TabIc {...p} d="M3 12l2-2 4 4 6-6 6 6M3 21h18"/>;
const IcDesign    = (p) => <TabIc {...p} d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/>;
const IcEstimate  = (p) => <TabIc {...p} d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM16 8H8m0 4h8m-8 4h5"/>;
const IcParty     = (p) => <TabIc {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>;
const IcTrans     = (p) => <TabIc {...p} d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/>;
const IcTodo      = (p) => <TabIc {...p} d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>;
const IcTask      = (p) => <TabIc {...p} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>;
const IcAttend    = (p) => <TabIc {...p} d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18m-9 4l2 2 4-4"/>;
const IcMaterial  = (p) => <TabIc {...p} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12l8.73-5.04M12 22V12"/>;
const IcSubcon    = (p) => <TabIc {...p} d="M2 18h20M4 18v-6a8 8 0 0116 0v6M12 4v2M9 5l1 2M15 5l-1 2"/>;
const IcEquip     = (p) => <TabIc {...p} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>;
const IcFiles     = (p) => <TabIc {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
const IcSite      = (p) => <TabIc {...p} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcMOM       = (p) => <TabIc {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>;
const IcSolar     = (p) => <TabIc {...p} d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 7a5 5 0 100 10 5 5 0 000-10z"/>;
const IcSolarInst = (p) => <TabIc {...p} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>;
const IcSubsidy   = (p) => <TabIc {...p} d="M19 5L5 19M6.5 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM17.5 14.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>;

const TABS = [
  {id:"overview",   label:"Overview",    key:"o", Icon:IcOverview},
  {id:"design",     label:"Design",      key:"d", Icon:IcDesign},
  {id:"estimate",   label:"Estimate",    key:"e", Icon:IcEstimate},
  {id:"party",      label:"Party",       key:"p", Icon:IcParty},
  {id:"transaction",label:"Transaction", key:"t", Icon:IcTrans},
  {id:"todo",       label:"To Do",       key:"k", Icon:IcTodo},
  {id:"task",       label:"Tasks",       key:"j", Icon:IcTask},
  {id:"attendance", label:"Attendance",  key:"a", Icon:IcAttend},
  {id:"material",   label:"Material",    key:"m", Icon:IcMaterial},
  {id:"subcon",     label:"Subcon",      key:"b", Icon:IcSubcon},
  {id:"equipment",  label:"Equipment",   key:"q", Icon:IcEquip},
  {id:"files",      label:"Files",       key:"i", Icon:IcFiles},
  {id:"site",       label:"Site / DPR",  key:"y", Icon:IcSite},
  {id:"mom",        label:"MOM",         key:"n", Icon:IcMOM},
];

// ── SOLAR EPC TABS (only for project_type = 'solar_epc') ──────────
const SOLAR_TABS = [
  {id:"overview",      label:"Overview",        key:"o", Icon:IcOverview},
  {id:"solar_stages",  label:"Surya Ghar",      key:"s", Icon:IcSolar},
  {id:"solar_boq",     label:"BOQ / Quotation", key:"e", Icon:IcEstimate},
  {id:"solar_install", label:"Installation",    key:"i", Icon:IcSolarInst},
  {id:"solar_subsidy", label:"Subsidy",         key:"u", Icon:IcSubsidy},
  {id:"material",      label:"Material",        key:"m", Icon:IcMaterial},
  {id:"transaction",   label:"Finance",         key:"t", Icon:IcTrans},
  {id:"design",        label:"Design",          key:"d", Icon:IcDesign},
  {id:"party",         label:"Party",           key:"p", Icon:IcParty},
  {id:"todo",          label:"To Do",           key:"k", Icon:IcTodo},
  {id:"task",          label:"Tasks",           key:"j", Icon:IcTask},
  {id:"files",         label:"Files",           key:"f", Icon:IcFiles},
];

// ──────────────────────────────────────────────────────────────────
// SOLAR TAB COMPONENTS
// ──────────────────────────────────────────────────────────────────

// Stage status colors (solar)
const SOLAR_STAGE_S = {
  pending:     {c:"#6B7280",bg:"#F3F4F6",bdr:"#D1D5DB"},
  in_progress: {c:"#D97706",bg:"#FFFBEB",bdr:"#FDE68A"},
  completed:   {c:"#059669",bg:"#ECFDF5",bdr:"#A7F3D0"},
  skipped:     {c:"#3B82F6",bg:"#EFF6FF",bdr:"#BFDBFE"},
};

// Stage hints — what each step needs
const STAGE_HINTS = {
  1: "Mobile number + Name for PM Surya Ghar portal login",
  2: "Electricity bill + Residential/Commercial proof upload",
  3: "DISCOM auto-generates feasibility → upload here",
  4: "Bank details (from lead docs) + Subsidy slab entry",
  5: "Agreement template auto-fill → download → sign",
  6: "PM Surya Ghar portal generates → upload here",
  7: "Site photo, PAN, Aadhaar, Ele bill needed. Skip if no loan",
  8: "Create print-ready folder with all loan docs for bank",
  9: "Enter 70% of sanctioned loan amount",
  10: "Confirm receiving 70% payment from customer",
  11: "3 procurement requests: Kit + Structure + Electrical",
  12: "Track: Requested → Ordered/Transferred → Delivered",
  13: "Cross-check against PO. Confirm receipt item-wise",
  14: "Set installation date and assign team",
  15: "Upload 9 step-by-step photos (leg → panel → serial nos)",
  16: "11 documents needed for grid sync application to DISCOM",
  17: "Upload: meter photo in running condition",
  18: "Verify DCR certificate + Panel/Inverter serial numbers",
  19: "Remaining ~30% loan disbursement entry",
  20: "Final payment confirmation → Project Complete ✅",
};

// ── Tab: Surya Ghar Stage Tracker ────────────────────────────────
function TabSuryaGhar({ projectId }) {
  const [stages, setStages] = useState([]);
  const [solar, setSolar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [noteFor, setNoteFor] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [docFor, setDocFor] = useState(null);
  const [docUrl, setDocUrl] = useState("");
  const [docName, setDocName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [portalMobile, setPortalMobile] = useState("");
  const [bpNumber, setBpNumber] = useState("");
  const [err, setErr] = useState("");
  const [mrs, setMrs] = useState([]);
  const [grnFor, setGrnFor] = useState(null);
  const [grnChallan, setGrnChallan] = useState("");
  const [grnQty, setGrnQty] = useState("");
  const [grnSaving, setGrnSaving] = useState(false);
  // Stage 14 — Installation Team
  const [subcons, setSubcons] = useState([]);
  const [installerSubconId, setInstallerSubconId] = useState("");
  const [installerName, setInstallerName] = useState("");
  const [installerPhone, setInstallerPhone] = useState("");
  const [installDate, setInstallDate] = useState("");
  const [installNotes, setInstallNotes] = useState("");
  // Stage 15 — Installation Photos
  const [installPhotos, setInstallPhotos] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(null); // step_number being uploaded
  const [addStepName, setAddStepName] = useState("");
  const [addingStep, setAddingStep] = useState(false);
  // Stage 16 — Net Metering Doc Checklist
  const [netMeterDocs, setNetMeterDocs] = useState([]);
  const [nmDocUploading, setNmDocUploading] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    // Each call independent so 404 on one doesn't block others
    let solarData = null;
    let stageList = [];
    try {
      const sRes = await api.get("/solar/projects/" + projectId);
      if (sRes && sRes.success) solarData = sRes.data;
    } catch(e) { /* 404 expected for un-initialized project */ }
    try {
      const stRes = await api.get("/solar/projects/" + projectId + "/stages");
      if (stRes && stRes.success) stageList = stRes.data || [];
    } catch(e) { /* ignore */ }

    // Auto-init if no stages OR no solar_projects row yet
    if (!stageList.length || !solarData) {
      try {
        const initRes = await api.post("/solar/projects/" + projectId + "/init", {});
        if (initRes && initRes.success) {
          stageList = initRes.data || stageList;
          // Re-fetch solar summary (init creates the row if missing)
          try {
            const s2 = await api.get("/solar/projects/" + projectId);
            if (s2 && s2.success) solarData = s2.data;
          } catch(e) {}
        }
      } catch(e) {
        setErr("Init failed: " + (e.message || "unknown"));
      }
    }

    setSolar(solarData);
    if(solarData){
      setPortalMobile(solarData.portal_mobile||"");
      setBpNumber(solarData.bp_number||"");
      // Pre-fill Stage 14 installer data if exists
      setInstallerName(solarData.installer_name||"");
      setInstallerPhone(solarData.installer_phone||"");
      setInstallerSubconId(solarData.installer_subcon_id||"");
      setInstallDate(solarData.installation_date?solarData.installation_date.split("T")[0]:"");
      setInstallNotes(solarData.installation_notes||"");
    }
    setStages(stageList);
    // Fetch material requests for this project
    try{const mr=await api.get("/procurement/mrs?project_id="+projectId);if(mr.success)setMrs(mr.data||[]);}catch(e){}
    // Fetch subcontractors for Stage 14 installer selection
    try{const sc=await api.get("/library/subcontractors");if(sc.success)setSubcons(sc.data||[]);}catch(e){}
    // Fetch installation photos for Stage 15
    try{const ip=await api.get("/solar/projects/"+projectId+"/install-photos");if(ip.success)setInstallPhotos(ip.data||[]);}catch(e){}
    // Fetch net metering doc checklist for Stage 16
    try{const nm=await api.get("/solar/projects/"+projectId+"/net-meter-docs");if(nm.success)setNetMeterDocs(nm.data||[]);}catch(e){}
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]);

  const markStage = async (stageNum, status) => {
    setActing(stageNum); setErr("");
    try {
      const body = { status, notes: noteFor === stageNum ? noteText : undefined };
      // Stage 1: send portal_mobile + bp_number
      if (stageNum === 1 && status === "completed") {
        body.portal_mobile = portalMobile || solar?.portal_mobile || "";
        body.bp_number = bpNumber || solar?.bp_number || "";
      }
      // Stage 14: send installer data
      if (stageNum === 14 && status === "completed") {
        body.installer_name = installerName;
        body.installer_phone = installerPhone;
        body.installer_subcon_id = installerSubconId || null;
        body.installation_date = installDate;
        body.installation_notes = installNotes || (noteFor===stageNum?noteText:"");
      }
      const res = await api.patch(
        `/solar/projects/${projectId}/stages/${stageNum}`,
        body
      );
      if (res.success) {
        setStages(p => p.map(s => s.stage_number === stageNum ? res.data : s));
        if (noteFor === stageNum) { setNoteFor(null); setNoteText(""); }
        // Refresh solar data after Stage 1 (portal_mobile/bp saved) or Stage 14 (installer saved)
        if (stageNum === 1 || stageNum === 14) {
          try { const s2 = await api.get("/solar/projects/"+projectId); if(s2.success) setSolar(s2.data); } catch(e){}
        }
        // Refresh MRs after Stage 10 (auto-generated) or stages 11-13
        if ([10,11,12,13].includes(stageNum)) {
          try{const mr=await api.get("/procurement/mrs?project_id="+projectId);if(mr.success)setMrs(mr.data||[]);}catch(e){}
        }
      } else { setErr(res.message || "Failed"); }
    } catch(e) { setErr(e.message); }
    setActing(null);
  };

  const addDoc = async (stageNum, url) => {
    const finalUrl = url || docUrl;
    if (!finalUrl.trim()) return;
    setErr("");
    try {
      await api.post(`/solar/projects/${projectId}/stages/${stageNum}/documents`, {
        document_type: "upload",
        document_name: docName || "Document",
        file_url: finalUrl,
      });
      setDocFor(null); setDocUrl(""); setDocName("");
      load();
    } catch(e) { setErr(e.message); }
  };

  const replaceDoc = async (file, docId) => {
    setUploading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "gb_buildcon_drawings");
      fd.append("folder", "gb_buildcon/solar_docs");
      const cld = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => { const d = JSON.parse(xhr.responseText); xhr.status===200 ? resolve(d) : reject(new Error(d.error?.message||"Upload failed")); };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("POST", "https://api.cloudinary.com/v1_1/dd632nqfm/auto/upload");
        xhr.send(fd);
      });
      await api.put(`/solar/projects/${projectId}/stage-docs/${docId}`, { file_url: cld.secure_url });
      load();
    } catch(e) { setErr(e.message || "Replace failed"); }
    setUploading(false);
  };

  // Stage 15 — upload install photo via Cloudinary file picker
  const uploadInstallPhoto = async (stepNum, file) => {
    setPhotoUploading(stepNum);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "gb_buildcon_drawings");
      fd.append("folder", "gb_buildcon/install_photos");
      const cld = await fetch("https://api.cloudinary.com/v1_1/dd632nqfm/image/upload", { method: "POST", body: fd });
      const cldData = await cld.json();
      if (!cldData.secure_url) { setErr("Upload failed"); setPhotoUploading(null); return; }
      const res = await api.put(`/solar/projects/${projectId}/install-photos/${stepNum}`, { photo_url: cldData.secure_url });
      if (res.success) {
        setInstallPhotos(p => p.map(s => s.step_number === stepNum ? res.data : s));
      } else { setErr(res.message || "Save failed"); }
    } catch (e) { setErr(e.message); }
    setPhotoUploading(null);
  };

  // Stage 16 — upload net metering doc
  const uploadNetMeterDoc = async (docName, file) => {
    setNmDocUploading(docName);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "gb_buildcon_drawings");
      fd.append("folder", "gb_buildcon/net_meter_docs");
      const cld = await fetch("https://api.cloudinary.com/v1_1/dd632nqfm/auto/upload", { method: "POST", body: fd });
      const cldData = await cld.json();
      if (!cldData.secure_url) { setErr("Upload failed"); setNmDocUploading(null); return; }
      // Save as stage 16 document
      const res = await api.post(`/solar/projects/${projectId}/stages/16/documents`, {
        document_name: docName, document_type: "net_meter_doc", file_url: cldData.secure_url
      });
      if (res.success) {
        // Refresh checklist
        const nm = await api.get("/solar/projects/"+projectId+"/net-meter-docs");
        if (nm.success) setNetMeterDocs(nm.data||[]);
      } else { setErr(res.message || "Save failed"); }
    } catch (e) { setErr(e.message); }
    setNmDocUploading(null);
  };

  // Add custom step to project
  const addCustomStep = async () => {
    if (!addStepName.trim()) return;
    setAddingStep(true);
    try {
      const res = await api.post(`/solar/projects/${projectId}/install-photos/add-step`, { step_name: addStepName.trim() });
      if (res.success) { setInstallPhotos(res.data); setAddStepName(""); }
      else { setErr(res.message || "Failed"); }
    } catch (e) { setErr(e.message); }
    setAddingStep(false);
  };

  const receiveGrn = async (mrId) => {
    setGrnSaving(true);
    try {
      const body = { challan_no: grnChallan || undefined };
      if (grnQty) body.received_qty = parseFloat(grnQty);
      const res = await api.patch(`/procurement/mrs/${mrId}/mark-received`, body);
      if (res.success) {
        setMrs(p => p.map(m => m.id === mrId ? { ...m, mat_status: res.mat_status || "Received", challan_no: grnChallan } : m));
        setGrnFor(null); setGrnChallan(""); setGrnQty("");
        // Refresh stages — stage 13 may have been auto-completed by backend
        try{const st=await api.get("/solar/projects/"+projectId+"/stages");if(st.success)setStages(st.data||[]);}catch(e){}
      } else { setErr(res.message || "GRN failed"); }
    } catch (e) { setErr(e.message || "GRN failed"); }
    setGrnSaving(false);
  };

  const uploadFile = async (file, stageNum) => {
    setUploading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "gb_buildcon_drawings");
      fd.append("folder", "gb_buildcon/solar_docs");
      const cld = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => { const d = JSON.parse(xhr.responseText); xhr.status===200 ? resolve(d) : reject(new Error(d.error?.message||"Upload failed")); };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("POST", "https://api.cloudinary.com/v1_1/dd632nqfm/auto/upload");
        xhr.send(fd);
      });
      await addDoc(stageNum, cld.secure_url);
    } catch(e) { setErr(e.message || "Upload failed"); }
    setUploading(false);
  };

  const toggleLoan = async () => {
    if (!solar) return;
    const newVal = !solar.loan_required;
    try {
      const res = await api.post(`/solar/projects/${projectId}/toggle-loan`, { loan_required: newVal });
      if (res.success) {
        setSolar(p => ({ ...p, loan_required: newVal ? 1 : 0 }));
        load();
      }
    } catch(e) { setErr(e.message); }
  };

  if (loading) return (
    <div style={{textAlign:"center",padding:"60px 0",color:T.t4}}>Loading stages...</div>
  );

  const completed = stages.filter(s => s.status === "completed").length;
  const pct = stages.length ? Math.round((completed / stages.length) * 100) : 0;

  return (
    <div style={{padding:"16px 0"}}>
      {err && <div style={{background:T.redL,color:T.red,padding:"8px 12px",borderRadius:7,fontSize:12,marginBottom:12,border:`1px solid ${T.redM}`}}>{err}</div>}

      {/* Progress header */}
      <div style={{background:T.surface,borderRadius:10,padding:"14px 16px",border:`1px solid ${T.b1}`,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontSize:13,fontWeight:700,color:T.t1}}>PM Surya Ghar Progress</div>
          <div style={{fontSize:14,fontWeight:800,color:T.grn}}>{pct}% Complete</div>
        </div>
        <div style={{height:6,background:T.b1,borderRadius:6,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:pct===100?T.grn:T.blu,borderRadius:6,transition:"width .5s"}}/>
        </div>
        <div style={{fontSize:11,color:T.t4,marginTop:6}}>{completed} of {stages.length} stages completed</div>
        {solar && (
          <div style={{display:"flex",gap:16,marginTop:10,paddingTop:10,borderTop:`1px solid ${T.b1}`,flexWrap:"wrap",alignItems:"center"}}>
            {[
              ["System",solar.system_kw ? solar.system_kw+"kW" : "—"],
              ["Type",solar.system_type||"—"],
              ["Portal Mobile",solar.portal_mobile||"—"],
              ["App No.",solar.portal_app_no||"—"],
            ].map(([l,v])=>(
              <div key={l}>
                <div style={{fontSize:9.5,color:T.t4,textTransform:"uppercase",letterSpacing:".4px"}}>{l}</div>
                <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{v}</div>
              </div>
            ))}
            {/* Loan Toggle */}
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:10,fontWeight:600,color:T.t3}}>Bank Loan</span>
              <button onClick={toggleLoan}
                style={{width:44,height:22,borderRadius:11,padding:2,border:"none",cursor:"pointer",
                  background:solar.loan_required?"#059669":"#D1D5DB",transition:"background .2s",
                  display:"flex",alignItems:"center"}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:"white",
                  transform:solar.loan_required?"translateX(22px)":"translateX(0)",
                  transition:"transform .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
              </button>
              <span style={{fontSize:10,fontWeight:700,color:solar.loan_required?T.grn:T.t4}}>
                {solar.loan_required?"Required":"Not Required"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stage list */}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {stages.map((stage, idx) => {
          const ss = SOLAR_STAGE_S[stage.status] || SOLAR_STAGE_S.pending;
          const isActing = acting === stage.stage_number;
          const isDone = stage.status === "completed";
          const isSkipped = stage.status === "skipped";
          const isActive = !isDone && !isSkipped && idx === stages.findIndex(s => s.status !== "completed" && s.status !== "skipped");
          const docList = stage.doc_names ? stage.doc_names.split("||").filter(Boolean) : [];
          const urlList = stage.doc_urls  ? stage.doc_urls.split("||").filter(Boolean)  : [];
          const idList  = stage.doc_ids   ? String(stage.doc_ids).split("||").filter(Boolean) : [];

          return (
            <div key={stage.id} style={{
              background:T.surface, borderRadius:9,
              border:`1.5px solid ${isActive?T.blu:ss.bdr}`,
              overflow:"hidden",
              boxShadow:isActive?"0 0 0 3px "+T.bluM:"none",
              opacity: isSkipped ? 0.6 : 1,
            }}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 13px"}}>
                {/* Step number */}
                <div style={{
                  width:28,height:28,borderRadius:"50%",flexShrink:0,
                  background:isDone?T.grn:isSkipped?T.blu:isActive?T.blu:T.b1,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:10,fontWeight:700,
                  color:isDone||isSkipped||isActive?"white":T.t3,
                }}>
                  {isDone ? "✓" : stage.stage_number}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{stage.stage_name}</span>
                    {stage.is_skippable===1&&<span style={{fontSize:9,color:T.blu,background:T.bluL,padding:"1px 6px",borderRadius:10,border:`1px solid ${T.bluM}`}}>Optional</span>}
                    <span style={{fontSize:9.5,fontWeight:700,background:ss.bg,color:ss.c,padding:"1px 8px",borderRadius:10,border:`1px solid ${ss.bdr}`,marginLeft:"auto"}}>{stage.status.replace("_"," ")}</span>
                  </div>
                  {isActive && STAGE_HINTS[stage.stage_number] && (
                    <div style={{fontSize:10.5,color:T.blu,marginTop:2}}>💡 {STAGE_HINTS[stage.stage_number]}</div>
                  )}
                  {stage.completed_date&&<div style={{fontSize:10.5,color:T.t4}}>Completed: {new Date(stage.completed_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</div>}
                  {stage.notes&&<div style={{fontSize:11,color:T.t3,marginTop:2,fontStyle:"italic"}}>"{stage.notes}"</div>}
                  {/* Documents */}
                  {docList.length>0&&(
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>
                      {docList.map((name,i)=>(
                        <div key={i} style={{display:"inline-flex",alignItems:"center",gap:0,borderRadius:4,overflow:"hidden",border:`1px solid ${T.bluM}`}}>
                          <a href={urlList[i]||"#"} target="_blank" rel="noreferrer"
                            style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,color:T.blu,background:T.bluL,padding:"2px 7px",textDecoration:"none"}}>
                            📎 {name}
                          </a>
                          {!isDone&&!isSkipped&&idList[i]&&(
                            <label title="Replace this document" style={{display:"inline-flex",alignItems:"center",padding:"2px 6px",background:"#FEF3C7",borderLeft:`1px solid ${T.bluM}`,cursor:uploading?"not-allowed":"pointer",fontSize:10,color:"#92400E"}}>
                              <input type="file" accept="image/*,application/pdf" style={{display:"none"}} disabled={uploading}
                                onChange={e=>{const f=e.target.files[0];if(f)replaceDoc(f,idList[i]);e.target.value="";}}/>
                              🔄
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* ══ Material Flow Panel — Stages 11-13 ══ */}
                  {/* ══ Stage 16 — Net Metering Document Checklist ══ */}
                  {stage.stage_number===16&&netMeterDocs.length>0&&(()=>{
                    const available=netMeterDocs.filter(d=>d.file_url).length;
                    const total=netMeterDocs.length;
                    const pct=total?Math.round(available/total*100):0;
                    const isDone16=stage.status==="completed";
                    return(
                      <div style={{marginTop:8,borderRadius:9,border:"1.5px solid #F59E0B",overflow:"hidden",background:"white"}}>
                        {/* Header */}
                        <div style={{padding:"8px 12px",background:"#FFFBEB",display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:16}}>📋</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:11.5,fontWeight:700,color:"#D97706"}}>Net Metering — Document Checklist</div>
                            <div style={{fontSize:10,color:"#D9770699"}}>{available}/{total} ready · {pct}%</div>
                          </div>
                          <div style={{width:60,height:6,borderRadius:3,background:"#FDE68A44"}}>
                            <div style={{width:`${pct}%`,height:"100%",borderRadius:3,background:pct===100?"#059669":"#D97706",transition:"width .3s"}}/>
                          </div>
                        </div>
                        {/* Document rows */}
                        <div style={{padding:"4px 0"}}>
                          {netMeterDocs.map((doc,i)=>{
                            const hasFile=!!doc.file_url;
                            const fromPrev=!!doc.source;
                            return(
                              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderBottom:i<netMeterDocs.length-1?`1px solid ${T.b1}`:"none",
                                background:hasFile?"#F0FDF4":"white"}}>
                                {/* Status icon */}
                                <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,
                                  background:hasFile?T.grnL:T.redL,color:hasFile?T.grn:T.red,border:`1.5px solid ${hasFile?T.grnM:T.redM}`,fontWeight:700}}>
                                  {hasFile?"✓":"!"}
                                </div>
                                {/* Doc info */}
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:11.5,fontWeight:600,color:T.t1}}>{i+1}. {doc.name}</div>
                                  <div style={{fontSize:9.5,color:hasFile?(fromPrev?"#059669":"#2563EB"):"#DC2626",fontWeight:500,marginTop:1}}>
                                    {hasFile?(fromPrev?`✅ ${doc.source_label}`:"✅ Uploaded"):`❌ ${doc.source_label}`}
                                  </div>
                                </div>
                                {/* View / Upload actions */}
                                <div style={{display:"flex",gap:4,flexShrink:0}}>
                                  {hasFile&&(
                                    <a href={doc.file_url} target="_blank" rel="noreferrer"
                                      style={{padding:"3px 10px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10,fontWeight:600,textDecoration:"none"}}>
                                      View
                                    </a>
                                  )}
                                  {!isDone16&&(
                                    <label style={{padding:"3px 10px",borderRadius:5,background:hasFile?"#FEF3C7":"#FEE2E2",border:`1px solid ${hasFile?"#FDE68A":"#FECACA"}`,
                                      color:hasFile?"#D97706":"#DC2626",fontSize:10,fontWeight:600,cursor:"pointer"}}>
                                      {nmDocUploading===doc.name?"...":(hasFile?"Replace":"Upload")}
                                      <input type="file" accept="image/*,.pdf" style={{display:"none"}}
                                        onChange={e=>{if(e.target.files[0])uploadNetMeterDoc(doc.name,e.target.files[0]);}}/>
                                    </label>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Footer summary */}
                        <div style={{padding:"6px 12px 8px",borderTop:"1px solid #FDE68A44",background:"#FFFBEB88",display:"flex",justifyContent:"space-between"}}>
                          <span style={{fontSize:10,fontWeight:600,color:pct===100?"#059669":"#DC2626"}}>
                            {pct===100?"✅ All documents ready":`⚠ ${total-available} document${total-available>1?"s":""} missing`}
                          </span>
                          <span style={{fontSize:9,color:"#D9770088"}}>Upload missing docs to proceed</span>
                        </div>
                      </div>
                    );
                  })()}
                  {/* ══ Stage 14 — Installation Info Display ══ */}
                  {stage.stage_number===14&&solar?.installer_name&&(
                    <div style={{marginTop:8,borderRadius:9,border:"1.5px solid #C084FC",overflow:"hidden",background:"white"}}>
                      <div style={{padding:"8px 12px",background:"#F3E8FF",display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:16}}>🔧</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11.5,fontWeight:700,color:"#7C3AED"}}>Installation Team Details</div>
                        </div>
                      </div>
                      <div style={{padding:"10px 12px"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <div>
                            <div style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",marginBottom:2}}>Team / Subcontractor</div>
                            <div style={{fontSize:12,fontWeight:700,color:T.t1}}>{solar.installer_name}</div>
                          </div>
                          <div>
                            <div style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",marginBottom:2}}>Contact</div>
                            <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{solar.installer_phone||"—"}</div>
                          </div>
                          <div>
                            <div style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",marginBottom:2}}>Installation Date</div>
                            <div style={{fontSize:12,fontWeight:600,color:T.blu}}>{solar.installation_date?new Date(solar.installation_date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"—"}</div>
                          </div>
                          <div>
                            <div style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",marginBottom:2}}>Notes</div>
                            <div style={{fontSize:11,color:T.t2}}>{solar.installation_notes||"—"}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* ══ Stage 15 — Installation Photos Grid ══ */}
                  {stage.stage_number===15&&installPhotos.length>0&&(()=>{
                    const uploaded=installPhotos.filter(p=>p.photo_url).length;
                    const total=installPhotos.length;
                    const pct=total?Math.round(uploaded/total*100):0;
                    const isDone=stage.status==="completed";
                    return(
                      <div style={{marginTop:8,borderRadius:9,border:"1.5px solid #93C5FD",overflow:"hidden",background:"white"}}>
                        {/* Header */}
                        <div style={{padding:"8px 12px",background:"#EFF6FF",display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:16}}>📸</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:11.5,fontWeight:700,color:"#2563EB"}}>Installation Photos</div>
                            <div style={{fontSize:10,color:"#2563EB99"}}>{uploaded}/{total} uploaded · {pct}%</div>
                          </div>
                          <div style={{width:60,height:6,borderRadius:3,background:"#93C5FD44"}}>
                            <div style={{width:`${pct}%`,height:"100%",borderRadius:3,background:pct===100?"#059669":"#2563EB",transition:"width .3s"}}/>
                          </div>
                        </div>
                        {/* Photo grid */}
                        <div style={{padding:"8px 10px",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                          {installPhotos.map(step=>(
                            <div key={step.step_number} style={{borderRadius:7,border:`1.5px solid ${step.photo_url?T.grnM:T.b1}`,overflow:"hidden",background:step.photo_url?"#F0FDF4":"white",position:"relative"}}>
                              {/* Photo preview or upload placeholder */}
                              {step.photo_url?(
                                <a href={step.photo_url} target="_blank" rel="noreferrer" style={{display:"block"}}>
                                  <img src={step.photo_url} alt={step.step_name}
                                    style={{width:"100%",height:80,objectFit:"cover",display:"block"}}
                                    onError={e=>{e.target.style.display="none";}}/>
                                </a>
                              ):(
                                <label style={{display:"flex",alignItems:"center",justifyContent:"center",height:80,background:T.sltL,cursor:isDone?"default":"pointer",flexDirection:"column",gap:2}}>
                                  {photoUploading===step.step_number?(
                                    <span style={{fontSize:10,color:T.blu,fontWeight:600}}>Uploading...</span>
                                  ):(
                                    <>
                                      <span style={{fontSize:20,color:T.t4}}>📷</span>
                                      <span style={{fontSize:9,color:T.t4}}>Click to upload</span>
                                    </>
                                  )}
                                  {!isDone&&<input type="file" accept="image/*" style={{display:"none"}}
                                    onChange={e=>{if(e.target.files[0])uploadInstallPhoto(step.step_number,e.target.files[0]);}}/>}
                                </label>
                              )}
                              {/* Replace button */}
                              {step.photo_url&&!isDone&&(
                                <label style={{position:"absolute",top:4,right:4,width:22,height:22,borderRadius:"50%",background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:11,color:"white"}}>
                                  🔄
                                  <input type="file" accept="image/*" style={{display:"none"}}
                                    onChange={e=>{if(e.target.files[0])uploadInstallPhoto(step.step_number,e.target.files[0]);}}/>
                                </label>
                              )}
                              {/* Step name + status */}
                              <div style={{padding:"5px 7px",borderTop:`1px solid ${step.photo_url?T.grnM:T.b1}`}}>
                                <div style={{fontSize:9.5,fontWeight:700,color:T.t1,lineHeight:1.2}}>{step.step_number}. {step.step_name}</div>
                                <div style={{fontSize:8.5,color:step.photo_url?T.grn:T.t4,fontWeight:600,marginTop:1}}>
                                  {step.photo_url?"✓ Uploaded":"⏳ Required"}
                                </div>
                                {step.is_ocr_step===1&&<div style={{fontSize:8,color:"#D97706",marginTop:1}}>⚡ OCR</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Add custom step */}
                        {!isDone&&(
                          <div style={{padding:"6px 10px 8px",borderTop:"1px solid #93C5FD44",background:"#F8FAFF",display:"flex",gap:6,alignItems:"center"}}>
                            <input value={addStepName} onChange={e=>setAddStepName(e.target.value)}
                              placeholder="Add custom photo step..."
                              style={{flex:1,padding:"5px 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11,outline:"none",fontFamily:"inherit"}}/>
                            <button onClick={addCustomStep} disabled={addingStep||!addStepName.trim()}
                              style={{padding:"5px 12px",borderRadius:6,background:addingStep||!addStepName.trim()?T.b1:T.blu,border:"none",color:"white",fontSize:10.5,fontWeight:700,cursor:addingStep?"not-allowed":"pointer"}}>
                              {addingStep?"Adding...":"+ Add Step"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {[11,12,13].includes(stage.stage_number)&&(()=>{
                    const stageColors={11:{bg:"#F3E8FF",bdr:"#C084FC",c:"#7C3AED",icon:"📋"},12:{bg:"#FEF3C7",bdr:"#FCD34D",c:"#D97706",icon:"🚚"},13:{bg:"#ECFDF5",bdr:"#6EE7B7",c:"#059669",icon:"📥"}};
                    const sc=stageColors[stage.stage_number];
                    // Filter MRs for each stage
                    const stageMrs={
                      11:mrs,
                      12:mrs.filter(m=>m.mr_status==="Approved"||m.mat_status==="Ordered"||m.mat_status==="Dispatched"||m.mat_status==="Received"),
                      13:mrs.filter(m=>m.mr_status==="Approved"||m.mat_status==="Ordered"||m.mat_status==="Received"||m.mat_status==="PartialReceived"),
                    }[stage.stage_number]||[];
                    if(!stageMrs.length&&!mrs.length) return(
                      <div style={{marginTop:8,padding:"10px 12px",borderRadius:8,background:"#FFF7ED",border:"1px dashed #FDBA74",textAlign:"center"}}>
                        <div style={{fontSize:11,color:"#EA580C",fontWeight:600}}>📦 No material requests yet</div>
                        <div style={{fontSize:10,color:"#FB923C",marginTop:2}}>Complete Stage 10 to auto-generate 3 kits</div>
                      </div>
                    );
                    // Progress calc
                    const progress={
                      11:{done:mrs.filter(m=>m.mr_status==="Approved").length,total:mrs.length,label:"approved"},
                      12:{done:mrs.filter(m=>["Ordered","Dispatched","Received","PartialReceived"].includes(m.mat_status)).length,total:mrs.filter(m=>m.mr_status==="Approved").length||mrs.length,label:"ordered"},
                      13:{done:mrs.filter(m=>m.mat_status==="Received").length,total:mrs.filter(m=>["Ordered","Received","PartialReceived"].includes(m.mat_status)||m.mr_status==="Approved").length||mrs.length,label:"received"},
                    }[stage.stage_number];
                    const pct=progress.total?Math.round((progress.done/progress.total)*100):0;
                    return(
                      <div style={{marginTop:10,borderRadius:9,border:`1.5px solid ${sc.bdr}`,overflow:"hidden",background:"white"}}>
                        {/* Header bar */}
                        <div style={{padding:"8px 12px",background:sc.bg,display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:16}}>{sc.icon}</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:11.5,fontWeight:700,color:sc.c}}>
                              {stage.stage_number===11?"Material Requests":stage.stage_number===12?"Order & Dispatch":"GRN — Goods Received"}
                            </div>
                            <div style={{fontSize:10,color:sc.c+"BB"}}>{progress.done}/{progress.total} {progress.label} · {pct}%</div>
                          </div>
                          {/* Mini progress bar */}
                          <div style={{width:60,height:6,borderRadius:3,background:sc.bdr+"44"}}>
                            <div style={{width:`${pct}%`,height:"100%",borderRadius:3,background:sc.c,transition:"width .3s"}}/>
                          </div>
                        </div>
                        {/* MR list */}
                        <div style={{padding:"6px 8px"}}>
                          {stageMrs.map(mr=>{
                            // Status chip per stage
                            const chip=(()=>{
                              if(stage.stage_number===11){
                                if(mr.mr_status==="Approved") return {t:"Approved",bg:"#DCFCE7",c:"#16A34A",bdr:"#86EFAC"};
                                if(mr.mr_status==="Rejected") return {t:"Rejected",bg:"#FEE2E2",c:"#DC2626",bdr:"#FCA5A5"};
                                return {t:"Pending",bg:"#FEF9C3",c:"#CA8A04",bdr:"#FDE047"};
                              }
                              if(stage.stage_number===12){
                                if(mr.mat_status==="Received") return {t:"Delivered",bg:"#DCFCE7",c:"#16A34A",bdr:"#86EFAC"};
                                if(mr.mat_status==="Ordered"||mr.mat_status==="Dispatched") return {t:mr.mat_status,bg:"#DBEAFE",c:"#2563EB",bdr:"#93C5FD"};
                                return {t:"Awaiting PO",bg:"#FEF9C3",c:"#CA8A04",bdr:"#FDE047"};
                              }
                              // stage 13
                              if(mr.mat_status==="Received") return {t:"✓ Received",bg:"#DCFCE7",c:"#16A34A",bdr:"#86EFAC"};
                              if(mr.mat_status==="PartialReceived") return {t:"Partial",bg:"#FEF9C3",c:"#CA8A04",bdr:"#FDE047"};
                              return {t:"Pending GRN",bg:"#EFF6FF",c:"#2563EB",bdr:"#93C5FD"};
                            })();
                            const canReceive=stage.stage_number===13&&(mr.mat_status==="Ordered"||mr.mat_status==="Dispatched");
                            const isReceived=mr.mat_status==="Received";
                            return(
                              <div key={mr.id} style={{marginBottom:5,borderRadius:7,border:`1px solid ${isReceived?T.grnM:T.b1}`,overflow:"hidden",background:isReceived?"#F0FDF4":"white"}}>
                                {/* Main row */}
                                <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px"}}>
                                  <div style={{width:6,height:6,borderRadius:"50%",background:chip.c,flexShrink:0}}/>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:11.5,fontWeight:700,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{mr.item_name}</div>
                                    {mr.notes&&<div style={{fontSize:9.5,color:T.t4,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{mr.notes.substring(0,60)}...</div>}
                                  </div>
                                  <div style={{textAlign:"right",flexShrink:0}}>
                                    <div style={{fontSize:10.5,fontWeight:600,color:T.t2}}>{mr.quantity} {mr.unit}</div>
                                    <span style={{fontSize:9,fontWeight:700,color:chip.c,background:chip.bg,padding:"1px 6px",borderRadius:10,border:`1px solid ${chip.bdr}`,whiteSpace:"nowrap"}}>{chip.t}</span>
                                  </div>
                                  {canReceive&&(
                                    <button onClick={()=>{setGrnFor(grnFor===mr.id?null:mr.id);setGrnChallan("");setGrnQty(String(mr.quantity||""));}}
                                      style={{padding:"4px 10px",borderRadius:6,background:"linear-gradient(135deg,#059669,#10B981)",color:"white",border:"none",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 1px 3px rgba(5,150,105,0.3)"}}>
                                      📥 Receive GRN
                                    </button>
                                  )}
                                </div>
                                {/* Received info */}
                                {isReceived&&(
                                  <div style={{padding:"0 10px 6px",display:"flex",gap:10,fontSize:9.5,color:T.t4}}>
                                    {mr.challan_no&&<span>📄 DC: {mr.challan_no}</span>}
                                    <span>✅ Received</span>
                                    <span style={{fontSize:9,color:T.t4}}>{mr.mr_number}</span>
                                  </div>
                                )}
                                {/* GRN Form — only in Stage 13 for ordered materials */}
                                {grnFor===mr.id&&stage.stage_number===13&&(
                                  <div style={{padding:"8px 10px 10px",borderTop:`1px solid ${T.b1}`,background:"linear-gradient(180deg,#F0FDF4,#ECFDF5)"}}>
                                    <div style={{fontSize:11,fontWeight:700,color:T.grn,marginBottom:6}}>📥 Receive Material — GRN</div>
                                    <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:6,marginBottom:8}}>
                                      <div>
                                        <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:2}}>Challan / DC Number</label>
                                        <input value={grnChallan} onChange={e=>setGrnChallan(e.target.value)} placeholder="e.g. DC-2024-001"
                                          style={{width:"100%",padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.grnM}`,fontSize:11.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box",background:"white"}}/>
                                      </div>
                                      <div>
                                        <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:2}}>Qty ({mr.unit})</label>
                                        <input type="number" value={grnQty} onChange={e=>setGrnQty(e.target.value)} placeholder={String(mr.quantity)}
                                          style={{width:"100%",padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.grnM}`,fontSize:11.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box",background:"white"}}/>
                                      </div>
                                    </div>
                                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                                      <span style={{fontSize:10,color:T.t4}}>Ordered: {mr.quantity} {mr.unit}</span>
                                      {grnQty&&parseFloat(grnQty)<parseFloat(mr.quantity)&&<span style={{fontSize:10,color:"#D97706",fontWeight:600}}>⚠ Partial receipt</span>}
                                      <div style={{flex:1}}/>
                                      <button onClick={()=>setGrnFor(null)}
                                        style={{padding:"6px 12px",borderRadius:6,background:"white",border:`1px solid ${T.b1}`,color:T.t3,fontSize:11,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                                      <button onClick={()=>receiveGrn(mr.id)} disabled={grnSaving}
                                        style={{padding:"6px 16px",borderRadius:6,background:grnSaving?T.b1:"linear-gradient(135deg,#059669,#10B981)",color:"white",border:"none",fontSize:11.5,fontWeight:700,cursor:grnSaving?"not-allowed":"pointer",boxShadow:"0 2px 6px rgba(5,150,105,0.3)"}}>
                                        {grnSaving?"Processing...":"✓ Confirm GRN"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {/* Footer summary */}
                        <div style={{padding:"6px 12px 8px",borderTop:`1px solid ${sc.bdr}44`,background:sc.bg+"88",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <span style={{fontSize:10,fontWeight:600,color:sc.c}}>
                            {pct===100?`✅ All ${progress.label}`:`⏳ ${progress.total-progress.done} pending`}
                          </span>
                          <span style={{fontSize:9,color:sc.c+"99"}}>{mrs.length} total items · {mrs.map(m=>m.mr_number).filter(Boolean).join(", ")}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Action bar — only for active/pending stages */}
              {!isDone && !isSkipped && (
                <div style={{padding:"8px 13px 10px 51px",display:"flex",gap:7,flexWrap:"wrap",alignItems:"center",borderTop:`1px solid ${T.b1}`,background:T.surfaceB}}>
                  {stage.stage_number===1&&(
                    <>
                      <input value={portalMobile} onChange={e=>setPortalMobile(e.target.value)} placeholder="Portal Mobile No."
                        style={{padding:"5px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",width:140}}/>
                      <input value={bpNumber} onChange={e=>setBpNumber(e.target.value)} placeholder="BP Number"
                        style={{padding:"5px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",width:130}}/>
                    </>
                  )}
                  {/* ══ Stage 14 — Installation Team Selection ══ */}
                  {stage.stage_number===14&&(
                    <div style={{width:"100%",marginBottom:6}}>
                      <div style={{fontSize:11,fontWeight:700,color:T.pur,marginBottom:6}}>🔧 Installation Team Setup</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                        <div>
                          <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:2}}>Installation Team / Subcontractor *</label>
                          <select value={installerSubconId} onChange={e=>{
                            const id=e.target.value;
                            setInstallerSubconId(id);
                            if(id){
                              const sc=subcons.find(s=>String(s.id)===String(id));
                              if(sc){setInstallerName(sc.name||sc.owner||"");setInstallerPhone(sc.phone||"");}
                            } else { setInstallerName("");setInstallerPhone(""); }
                          }}
                            style={{width:"100%",padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.purL?T.b1:T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box",background:"white"}}>
                            <option value="">— Select from Library —</option>
                            {subcons.map(sc=>(
                              <option key={sc.id} value={sc.id}>{sc.name}{sc.trade?` (${sc.trade})`:""}{sc.city?` — ${sc.city}`:""}</option>
                            ))}
                            <option value="__manual__">✏️ Enter Manually</option>
                          </select>
                        </div>
                        <div>
                          <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:2}}>Team Name *</label>
                          <input value={installerName} onChange={e=>setInstallerName(e.target.value)}
                            placeholder="Installer / Team name"
                            readOnly={installerSubconId && installerSubconId!=="__manual__"}
                            style={{width:"100%",padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box",
                              background:installerSubconId&&installerSubconId!=="__manual__"?T.sltL:"white"}}/>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                        <div>
                          <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:2}}>Contact Number {installerSubconId&&installerSubconId!=="__manual__"?"(auto-fetched)":"*"}</label>
                          <input value={installerPhone} onChange={e=>setInstallerPhone(e.target.value)}
                            placeholder="Phone number"
                            readOnly={installerSubconId && installerSubconId!=="__manual__" && !!installerPhone}
                            style={{width:"100%",padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box",
                              background:installerSubconId&&installerSubconId!=="__manual__"&&installerPhone?T.sltL:"white"}}/>
                        </div>
                        <div>
                          <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:2}}>Installation Date *</label>
                          <input type="date" value={installDate} onChange={e=>setInstallDate(e.target.value)}
                            style={{width:"100%",padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                        </div>
                      </div>
                      <div>
                        <label style={{fontSize:9,fontWeight:600,color:T.t4,textTransform:"uppercase",display:"block",marginBottom:2}}>Installation Notes *</label>
                        <textarea value={installNotes} onChange={e=>setInstallNotes(e.target.value)}
                          placeholder="Roof type, access details, special instructions..."
                          rows={2}
                          style={{width:"100%",padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box",resize:"vertical"}}/>
                      </div>
                    </div>
                  )}
                  {stage.stage_number===5&&(
                    <button onClick={async()=>{
                      try{
                        const token=localStorage.getItem("gb_token");
                        const resp=await fetch(`${API_BASE}/solar/projects/${projectId}/agreement-docx`,{
                          headers:{Authorization:`Bearer ${token}`}
                        });
                        if(!resp.ok){const e=await resp.json();alert(e.message||"Download failed");return;}
                        const blob=await resp.blob();
                        const url=window.URL.createObjectURL(blob);
                        const a=document.createElement("a");
                        a.href=url;
                        a.download=`Vendor_Agreement_${solar?.consumer_name||"Consumer"}.docx`;
                        document.body.appendChild(a);a.click();a.remove();
                        window.URL.revokeObjectURL(url);
                      }catch(e){alert("Download failed: "+e.message);}
                    }}
                      style={{padding:"5px 14px",borderRadius:6,background:"linear-gradient(135deg,#7C3AED,#9333EA)",border:"none",color:"white",fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
                      📄 Download Agreement
                    </button>
                  )}
                  <button onClick={()=>markStage(stage.stage_number,"completed")} disabled={isActing}
                    style={{padding:"5px 14px",borderRadius:6,background:isActing?T.b1:T.grn,border:"none",color:"white",fontSize:11.5,fontWeight:700,cursor:isActing?"not-allowed":"pointer"}}>
                    {isActing?"...":"✓ Mark Complete"}
                  </button>
                  {stage.is_skippable===1&&(
                    <button onClick={()=>markStage(stage.stage_number,"skipped")} disabled={isActing}
                      style={{padding:"5px 12px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
                      Skip (No Loan)
                    </button>
                  )}
                  <button onClick={()=>setNoteFor(noteFor===stage.stage_number?null:stage.stage_number)}
                    style={{padding:"5px 10px",borderRadius:6,background:"none",border:`1px solid ${T.b1}`,color:T.t3,fontSize:11,cursor:"pointer"}}>
                    + Note
                  </button>
                  <button onClick={()=>setDocFor(docFor===stage.stage_number?null:stage.stage_number)}
                    style={{padding:"5px 10px",borderRadius:6,background:"none",border:`1px solid ${T.b1}`,color:T.t3,fontSize:11,cursor:"pointer"}}>
                    📎 Upload Doc
                  </button>
                </div>
              )}

              {/* Note input */}
              {noteFor===stage.stage_number&&(
                <div style={{padding:"8px 51px 10px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:6}}>
                  <input value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Stage note..."
                    style={{flex:1,padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                  <button onClick={()=>markStage(stage.stage_number,"completed")}
                    style={{padding:"6px 12px",borderRadius:6,background:T.grn,border:"none",color:"white",fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
                    Save & Complete
                  </button>
                </div>
              )}

              {/* Doc upload input */}
              {docFor===stage.stage_number&&(
                <div style={{padding:"8px 51px 10px",borderTop:`1px solid ${T.b1}`}}>
                  <div style={{display:"flex",gap:6,marginBottom:6}}>
                    <input value={docName} onChange={e=>setDocName(e.target.value)} placeholder="Document name (e.g. DISCOM Feasibility)"
                      style={{flex:1,padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <label style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:6,background:uploading?T.b1:T.blu,color:"white",fontSize:11.5,fontWeight:700,cursor:uploading?"not-allowed":"pointer",border:"none",flexShrink:0}}>
                      <input type="file" accept="image/*,application/pdf" style={{display:"none"}} disabled={uploading}
                        onChange={e=>{
                          const f=e.target.files?.[0];
                          if(f){
                            if(!docName) setDocName(f.name.replace(/\.[^.]+$/,""));
                            uploadFile(f,stage.stage_number);
                          }
                        }}/>
                      {uploading?"Uploading...":"📎 Upload File"}
                    </label>
                    <span style={{fontSize:10,color:T.t4}}>or paste URL:</span>
                    <input value={docUrl} onChange={e=>setDocUrl(e.target.value)} placeholder="https://..."
                      style={{flex:1,padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                    <button onClick={()=>addDoc(stage.stage_number)} disabled={!docUrl.trim()}
                      style={{padding:"6px 12px",borderRadius:6,background:docUrl.trim()?T.grn:T.b1,border:"none",color:"white",fontSize:11.5,fontWeight:700,cursor:docUrl.trim()?"pointer":"not-allowed"}}>
                      Save
                    </button>
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

// ── Tab: Solar BOQ & Quotation ───────────────────────────────────
function TabSolarBOQ({ projectId }) {
  const [presets, setPresets] = useState([]);
  const [solar, setSolar] = useState(null);
  const [activeKw, setActiveKw] = useState(null);
  const [activeKit, setActiveKit] = useState("A");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/solar/projects/" + projectId),
      api.get("/solar/boq-presets"),
    ]).then(([sRes, bRes]) => {
      if (sRes.success) { setSolar(sRes.data); setActiveKw(sRes.data.system_kw || 3); }
      if (bRes.success) setPresets(bRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  const kws = [...new Set(presets.map(p => p.system_kw))].sort((a,b)=>a-b);
  const activePresets = presets.filter(p => p.system_kw === activeKw);
  const currentPreset = activePresets.find(p => p.kit_type === activeKit);

  const startEdit = () => {
    if (!currentPreset) return;
    setEditItems(currentPreset.items.map(i => ({...i})));
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!currentPreset) return;
    setSaving(true);
    try {
      const res = await api.put("/solar/boq-presets/" + currentPreset.id + "/items", { items: editItems });
      if (res.success) {
        setPresets(p => p.map(pr => pr.id === currentPreset.id ? {...pr, items: res.data} : pr));
        setEditing(false);
      }
    } catch(e) {}
    setSaving(false);
  };

  const KIT_LABELS = { A:"Solar Kit", B:"Structure", C:"Electrical" };
  const KIT_COLORS = { A:{c:"#D97706",bg:"#FFFBEB",bdr:"#FDE68A"}, B:{c:"#059669",bg:"#ECFDF5",bdr:"#A7F3D0"}, C:{c:"#2563EB",bg:"#EFF6FF",bdr:"#BFDBFE"} };

  if (loading) return <div style={{textAlign:"center",padding:"60px",color:T.t4}}>Loading BOQ...</div>;

  return (
    <div style={{padding:"16px 0"}}>
      {/* System size tabs */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <span style={{fontSize:11,color:T.t4,fontWeight:600}}>System Size:</span>
        {kws.map(kw=>(
          <button key={kw} onClick={()=>setActiveKw(kw)}
            style={{padding:"5px 14px",borderRadius:20,border:`1.5px solid ${activeKw===kw?"#F59E0B":"#E5E7EB"}`,
              background:activeKw===kw?"#FFFBEB":"#fff",color:activeKw===kw?"#D97706":T.t3,
              fontSize:12,fontWeight:activeKw===kw?700:400,cursor:"pointer"}}>
            {kw}kW {solar?.system_kw===kw && <span style={{fontSize:9}}>(This Project)</span>}
          </button>
        ))}
        <span style={{fontSize:10,color:T.t4,marginLeft:4}}>* Edit preset → applies to all future projects of same size</span>
      </div>

      {/* Kit tabs */}
      <div style={{display:"flex",gap:1,marginBottom:14,background:T.surfaceB,borderRadius:8,padding:3,border:`1px solid ${T.b1}`,width:"fit-content"}}>
        {["A","B","C"].map(kit=>{
          const kc = KIT_COLORS[kit];
          return (
            <button key={kit} onClick={()=>{setActiveKit(kit);setEditing(false);}}
              style={{padding:"7px 18px",borderRadius:6,border:"none",
                background:activeKit===kit?kc.bg:"none",
                color:activeKit===kit?kc.c:T.t3,
                fontSize:12,fontWeight:activeKit===kit?700:400,cursor:"pointer",
                borderBottom:activeKit===kit?`2px solid ${kc.c}`:"2px solid transparent"}}>
              Kit {kit} — {KIT_LABELS[kit]}
            </button>
          );
        })}
      </div>

      {/* Items table */}
      {currentPreset ? (
        <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.b1}`,background:T.surfaceB}}>
            <div style={{fontSize:13,fontWeight:700,color:T.t1}}>Kit {activeKit} — {KIT_LABELS[activeKit]} | {activeKw}kW</div>
            {!editing
              ? <button onClick={startEdit} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${T.b1}`,background:"none",fontSize:11.5,fontWeight:600,color:T.t2,cursor:"pointer"}}>✏ Edit Items</button>
              : <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>setEditing(false)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${T.b1}`,background:"none",fontSize:11.5,color:T.t3,cursor:"pointer"}}>Cancel</button>
                  <button onClick={saveEdit} disabled={saving} style={{padding:"5px 14px",borderRadius:6,background:saving?T.b1:T.grn,border:"none",color:"white",fontSize:11.5,fontWeight:700,cursor:"pointer"}}>{saving?"Saving...":"Save"}</button>
                </div>
            }
          </div>

          {/* Header row */}
          <div style={{display:"grid",gridTemplateColumns:editing?"2fr 1.2fr 80px 60px 32px":"2fr 1.2fr 80px 60px",padding:"7px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
            {["Item Description","Brand","Qty","Unit",...(editing?[""]:[])].map((h,i)=>(
              <span key={i} style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px"}}>{h}</span>
            ))}
          </div>

          {/* Items */}
          {(editing ? editItems : currentPreset.items).map((item, idx) => (
            <div key={item.id||idx} style={{display:"grid",gridTemplateColumns:editing?"2fr 1.2fr 80px 60px 32px":"2fr 1.2fr 80px 60px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center"}}>
              {editing ? (
                <>
                  <input value={item.item_name} onChange={e=>setEditItems(p=>p.map((x,i)=>i===idx?{...x,item_name:e.target.value}:x))}
                    style={{padding:"4px 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                  <input value={item.brand||""} onChange={e=>setEditItems(p=>p.map((x,i)=>i===idx?{...x,brand:e.target.value}:x))}
                    style={{padding:"4px 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                  <input type="number" value={item.quantity||""} onChange={e=>setEditItems(p=>p.map((x,i)=>i===idx?{...x,quantity:e.target.value}:x))}
                    style={{padding:"4px 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:12,outline:"none",fontFamily:"inherit",textAlign:"center"}}/>
                  <input value={item.unit||""} onChange={e=>setEditItems(p=>p.map((x,i)=>i===idx?{...x,unit:e.target.value}:x))}
                    style={{padding:"4px 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                  <button onClick={()=>setEditItems(p=>p.filter((_,i)=>i!==idx))}
                    style={{background:"none",border:"none",cursor:"pointer",color:T.red,fontSize:14,padding:0}}>✕</button>
                </>
              ) : (
                <>
                  <span style={{fontSize:12.5,color:T.t1}}>{item.item_name}</span>
                  <span style={{fontSize:12,color:T.t3}}>{item.brand||"—"}</span>
                  <span style={{fontSize:12,fontWeight:700,color:T.t2,textAlign:"center"}}>{item.quantity}</span>
                  <span style={{fontSize:12,color:T.t3}}>{item.unit}</span>
                </>
              )}
            </div>
          ))}

          {editing && (
            <div style={{padding:"10px 14px",borderTop:`1px solid ${T.b1}`}}>
              <button onClick={()=>setEditItems(p=>[...p,{item_name:"",brand:"",quantity:"",unit:"Nos"}])}
                style={{padding:"6px 14px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
                + Add Item
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{textAlign:"center",padding:"40px",color:T.t4}}>No preset found for {activeKw}kW Kit {activeKit}</div>
      )}
    </div>
  );
}

// ── Tab: Solar Documents ─────────────────────────────────────────
function TabSolarDocs({ projectId }) {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/solar/projects/" + projectId + "/stages").then(r => {
      if (r.success) setStages(r.data.filter(s => s.doc_count > 0 || s.status === "completed"));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div style={{textAlign:"center",padding:"60px",color:T.t4}}>Loading docs...</div>;

  const allDocs = stages.flatMap(s => {
    const names = s.doc_names ? s.doc_names.split("||").filter(Boolean) : [];
    const urls  = s.doc_urls  ? s.doc_urls.split("||").filter(Boolean)  : [];
    return names.map((name, i) => ({ stage: s.stage_number, stageName: s.stage_name, name, url: urls[i]||"" }));
  });

  if (allDocs.length === 0) return (
    <div style={{textAlign:"center",padding:"80px 0"}}>
      <div style={{fontSize:36,marginBottom:8}}>📂</div>
      <div style={{fontSize:14,fontWeight:600,color:T.t2}}>No documents yet</div>
      <div style={{fontSize:12,color:T.t4,marginTop:4}}>Documents uploaded in Surya Ghar stages will appear here</div>
    </div>
  );

  // Group by stage
  const byStage = {};
  for (const doc of allDocs) {
    const key = `${doc.stage}. ${doc.stageName}`;
    if (!byStage[key]) byStage[key] = [];
    byStage[key].push(doc);
  }

  return (
    <div style={{padding:"16px 0"}}>
      {Object.entries(byStage).map(([stageName, docs]) => (
        <div key={stageName} style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px",marginBottom:7}}>Stage {stageName}</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {docs.map((doc, i) => (
              <div key={i} style={{background:T.surface,borderRadius:7,border:`1px solid ${T.b1}`,padding:"9px 13px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>📄</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{doc.name}</div>
                </div>
                <a href={doc.url} target="_blank" rel="noreferrer"
                  style={{padding:"4px 12px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,fontWeight:600,textDecoration:"none"}}>
                  View
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Solar Installation Photos ───────────────────────────────
function TabSolarInstall({ projectId }) {
  const [solar, setSolar] = useState(null);
  const [steps, setSteps] = useState([]);
  const [serials, setSerials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadFor, setUploadFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editSerials, setEditSerials] = useState([]);
  const [showSerialEdit, setShowSerialEdit] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [sRes2, pRes, sRes] = await Promise.all([
      api.get("/solar/projects/" + projectId),
      api.get("/solar/projects/" + projectId + "/install-photos"),
      api.get("/solar/projects/" + projectId + "/serial-numbers"),
    ]);
    if (sRes2.success) setSolar(sRes2.data);
    if (pRes.success) setSteps(pRes.data);
    if (sRes.success) setSerials(sRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]);

  // Upload photo via Cloudinary file picker
  const uploadPhotoFile = async (stepNum, file) => {
    setSaving(true); setUploadFor(stepNum);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "gb_buildcon_drawings");
      fd.append("folder", "gb_buildcon/install_photos");
      const cld = await fetch("https://api.cloudinary.com/v1_1/dd632nqfm/image/upload", { method: "POST", body: fd });
      const cldData = await cld.json();
      if (!cldData.secure_url) { setSaving(false); setUploadFor(null); return; }
      const res = await api.put(`/solar/projects/${projectId}/install-photos/${stepNum}`, { photo_url: cldData.secure_url });
      if (res.success) {
        setSteps(p => p.map(s => s.step_number === stepNum ? res.data : s));
      }
    } catch(e) {}
    setSaving(false); setUploadFor(null);
  };

  // Upload feedback video
  const uploadFeedbackVideo = async (file) => {
    setVideoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "gb_buildcon_drawings");
      fd.append("folder", "gb_buildcon/feedback_videos");
      fd.append("resource_type", "video");
      const cld = await fetch("https://api.cloudinary.com/v1_1/dd632nqfm/video/upload", { method: "POST", body: fd });
      const cldData = await cld.json();
      if (cldData.secure_url) {
        const res = await api.put("/solar/projects/" + projectId, { feedback_video_url: cldData.secure_url });
        if (res.success) setSolar(res.data);
      }
    } catch(e) {}
    setVideoUploading(false);
  };

  const saveSerials = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/solar/projects/${projectId}/serial-numbers`, { serials: editSerials });
      if (res.success) { setSerials(res.data); setShowSerialEdit(false); setEditSerials([]); }
    } catch(e) {}
    setSaving(false);
  };

  const completed = steps.filter(s => s.photo_url).length;
  // Find first uploaded photo date as installation date reference
  const firstPhotoDate = steps.filter(s=>s.uploaded_at).map(s=>s.uploaded_at).sort()[0];

  if (loading) return <div style={{textAlign:"center",padding:"60px",color:T.t4}}>Loading...</div>;

  return (
    <div style={{padding:"16px 0"}}>
      {/* ══ Installation Team Details ══ */}
      {solar && (solar.installer_name || solar.installation_date) && (
        <div style={{background:T.surface,borderRadius:9,border:`1.5px solid #C084FC`,overflow:"hidden",marginBottom:14}}>
          <div style={{padding:"10px 14px",background:"#F3E8FF",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>🔧</span>
            <span style={{fontSize:13,fontWeight:700,color:"#7C3AED"}}>Installation Team Details</span>
          </div>
          <div style={{padding:"12px 14px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {solar.installer_name&&(
                <div>
                  <div style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".5px"}}>Team / Subcontractor</div>
                  <div style={{fontSize:13,fontWeight:700,color:T.t1,marginTop:2}}>{solar.installer_name}</div>
                </div>
              )}
              {solar.installer_phone&&(
                <div>
                  <div style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".5px"}}>Contact Number</div>
                  <div style={{fontSize:13,fontWeight:600,color:T.t1,marginTop:2}}>
                    <a href={`tel:${solar.installer_phone}`} style={{color:T.blu,textDecoration:"none"}}>{solar.installer_phone}</a>
                  </div>
                </div>
              )}
              <div>
                <div style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".5px"}}>Installation Date</div>
                <div style={{fontSize:13,fontWeight:700,color:T.blu,marginTop:2}}>
                  {solar.installation_date?new Date(solar.installation_date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"—"}
                </div>
                {firstPhotoDate&&(
                  <div style={{fontSize:9.5,color:T.t4,marginTop:1}}>
                    📷 First photo: {new Date(firstPhotoDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                  </div>
                )}
              </div>
              {solar.installation_notes&&(
                <div>
                  <div style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".5px"}}>Notes</div>
                  <div style={{fontSize:12,color:T.t2,marginTop:2}}>{solar.installation_notes}</div>
                </div>
              )}
            </div>
            {/* Consumer info row */}
            <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${T.b1}`,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase"}}>Consumer</div>
                <div style={{fontSize:12,fontWeight:600,color:T.t1,marginTop:1}}>{solar.consumer_name||"—"}</div>
              </div>
              <div>
                <div style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase"}}>System</div>
                <div style={{fontSize:12,fontWeight:600,color:T.t1,marginTop:1}}>{solar.system_kw||3} kW {solar.system_type||"Residential"}</div>
              </div>
              <div>
                <div style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase"}}>Site</div>
                <div style={{fontSize:11,color:T.t2,marginTop:1}}>{solar.consumer_address?solar.consumer_address.substring(0,60):"—"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Progress bar ══ */}
      <div style={{background:T.surface,borderRadius:9,padding:"12px 14px",border:`1px solid ${T.b1}`,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:13,fontWeight:700,color:T.t1}}>Installation Photos</span>
          <span style={{fontSize:13,fontWeight:700,color:completed===steps.length?T.grn:T.amb}}>{completed}/{steps.length} uploaded</span>
        </div>
        <div style={{height:5,background:T.b1,borderRadius:5,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${steps.length?Math.round(completed/steps.length*100):0}%`,background:T.grn,borderRadius:5}}/>
        </div>
      </div>

      {/* ══ Serial numbers section ══ */}
      {serials.length > 0 && (
        <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:9,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#D97706",marginBottom:8}}>☀ Serial Numbers Extracted ({serials.length})</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {serials.map(s=>(
              <div key={s.id} style={{background:"white",border:"1px solid #FDE68A",borderRadius:5,padding:"3px 9px",fontSize:11,color:"#92400E"}}>
                <span style={{fontWeight:700}}>{s.component_type==="panel"?"Panel":"Inverter"}:</span> {s.brand?s.brand+" — ":""}{s.serial_number}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ Serial edit modal ══ */}
      {showSerialEdit && (
        <div style={{background:T.surface,border:`1.5px solid ${T.blu}`,borderRadius:10,padding:"14px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:10}}>Review OCR Extracted Serial Numbers</div>
          {editSerials.map((s,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr 24px",gap:6,marginBottom:6,alignItems:"center"}}>
              <select value={s.component_type} onChange={e=>setEditSerials(p=>p.map((x,j)=>j===i?{...x,component_type:e.target.value}:x))}
                style={{padding:"4px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11,outline:"none",fontFamily:"inherit"}}>
                <option value="panel">Panel</option>
                <option value="inverter">Inverter</option>
              </select>
              <input value={s.brand||""} onChange={e=>setEditSerials(p=>p.map((x,j)=>j===i?{...x,brand:e.target.value}:x))}
                placeholder="Brand (e.g. Adani)" style={{padding:"4px 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11,outline:"none",fontFamily:"inherit"}}/>
              <input value={s.serial_number} onChange={e=>setEditSerials(p=>p.map((x,j)=>j===i?{...x,serial_number:e.target.value}:x))}
                placeholder="Serial number" style={{padding:"4px 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11,outline:"none",fontFamily:"inherit"}}/>
              <button onClick={()=>setEditSerials(p=>p.filter((_,j)=>j!==i))}
                style={{background:"none",border:"none",cursor:"pointer",color:T.red,fontSize:13}}>✕</button>
            </div>
          ))}
          <div style={{display:"flex",gap:6,marginTop:8}}>
            <button onClick={()=>setEditSerials(p=>[...p,{component_type:"panel",brand:"",serial_number:""}])}
              style={{padding:"5px 12px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,cursor:"pointer"}}>
              + Add Row
            </button>
            <button onClick={saveSerials} disabled={saving}
              style={{padding:"5px 16px",borderRadius:6,background:saving?T.b1:T.grn,border:"none",color:"white",fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
              {saving?"Saving...":"✓ Confirm & Save"}
            </button>
          </div>
        </div>
      )}

      {/* ══ Photo steps — with file upload ══ */}
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {steps.map(step=>(
          <div key={step.id} style={{background:T.surface,borderRadius:9,border:`1.5px solid ${step.photo_url?T.grnM:T.b1}`,overflow:"hidden"}}>
            <div style={{display:"flex",gap:10,padding:"10px 13px",alignItems:"center"}}>
              <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,background:step.photo_url?T.grn:T.b1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:step.photo_url?"white":T.t4}}>
                {step.photo_url?"✓":step.step_number}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{step.step_name}</div>
                {step.is_ocr_step===1&&<div style={{fontSize:10,color:"#D97706",marginTop:1}}>⚡ OCR Serial Number Extraction</div>}
                {step.uploaded_at&&<div style={{fontSize:9.5,color:T.t4,marginTop:1}}>📷 {new Date(step.uploaded_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>}
              </div>
              {step.photo_url && (
                <a href={step.photo_url} target="_blank" rel="noreferrer">
                  <img src={step.photo_url} alt="step" style={{width:48,height:48,objectFit:"cover",borderRadius:6,border:`1px solid ${T.b1}`}} onError={e=>e.target.style.display="none"}/>
                </a>
              )}
              {/* Upload / Replace button — file picker */}
              <label style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${step.photo_url?T.grnM:T.b1}`,background:step.photo_url?T.grnL:"none",color:step.photo_url?T.grn:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
                {uploadFor===step.step_number&&saving?"Uploading...":(step.photo_url?"Replace":"Upload")}
                <input type="file" accept="image/*" style={{display:"none"}}
                  onChange={e=>{if(e.target.files[0])uploadPhotoFile(step.step_number,e.target.files[0]);}}/>
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* ══ Consumer Feedback Video (optional) ══ */}
      <div style={{background:T.surface,borderRadius:9,border:`1.5px solid ${solar?.feedback_video_url?"#A78BFA":T.b1}`,overflow:"hidden",marginTop:14}}>
        <div style={{padding:"10px 14px",background:solar?.feedback_video_url?"#F5F3FF":T.surfaceB,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>🎥</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12.5,fontWeight:700,color:solar?.feedback_video_url?"#7C3AED":T.t2}}>Consumer Feedback Video</div>
            <div style={{fontSize:10,color:T.t4}}>{solar?.feedback_video_url?"Video uploaded":"Optional — record consumer testimonial"}</div>
          </div>
          {solar?.feedback_video_url&&(
            <a href={solar.feedback_video_url} target="_blank" rel="noreferrer"
              style={{padding:"4px 12px",borderRadius:6,background:"#7C3AED",color:"white",fontSize:11,fontWeight:600,textDecoration:"none"}}>
              ▶ Play
            </a>
          )}
          <label style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${T.b1}`,background:"none",color:T.t3,fontSize:11.5,fontWeight:600,cursor:videoUploading?"not-allowed":"pointer"}}>
            {videoUploading?"Uploading...":(solar?.feedback_video_url?"Replace Video":"Upload Video")}
            <input type="file" accept="video/*" style={{display:"none"}} disabled={videoUploading}
              onChange={e=>{if(e.target.files[0])uploadFeedbackVideo(e.target.files[0]);}}/>
          </label>
        </div>
        {solar?.feedback_video_url&&(
          <div style={{padding:"8px 14px"}}>
            <video src={solar.feedback_video_url} controls style={{width:"100%",maxHeight:300,borderRadius:8,background:"black"}}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Solar Subsidy ───────────────────────────────────────────
function TabSolarSubsidy({ projectId }) {
  const [solar, setSolar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/solar/projects/" + projectId).then(r => {
      if (r.success) { setSolar(r.data); setForm({ subsidy_amount: r.data.subsidy_amount||"", subsidy_status: r.data.subsidy_status||"not_applied", loan_required: r.data.loan_required||0, loan_bank: r.data.loan_bank||"", loan_sanction_amount: r.data.loan_sanction_amount||"", loan_disbursed_70: r.data.loan_disbursed_70||"", loan_disbursed_30: r.data.loan_disbursed_30||"" }); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put("/solar/projects/" + projectId, form);
      if (res.success) { setSolar(res.data); setEditing(false); }
    } catch(e) {}
    setSaving(false);
  };

  const SUBSIDY_S = { not_applied:{c:T.t3,bg:T.sltL,l:"Not Applied"}, applied:{c:T.amb,bg:T.ambL,l:"Applied"}, approved:{c:T.blu,bg:T.bluL,l:"Approved"}, disbursed:{c:T.grn,bg:T.grnL,l:"Disbursed"} };
  const kw = solar?.system_kw||0;
  // PM Surya Ghar subsidy calculation
  const subsidyCalc = kw <= 2 ? kw*18000 : kw <= 3 ? 2*18000+(kw-2)*9000 : 36000+9000;

  if (loading) return <div style={{textAlign:"center",padding:"60px",color:T.t4}}>Loading...</div>;

  const ss = SUBSIDY_S[solar?.subsidy_status||"not_applied"]||SUBSIDY_S.not_applied;

  return (
    <div style={{padding:"16px 0"}}>
      {/* Subsidy card */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,padding:"16px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:T.t1}}>Subsidy Details</div>
          {!editing
            ? <button onClick={()=>setEditing(true)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${T.b1}`,background:"none",fontSize:11.5,fontWeight:600,color:T.t2,cursor:"pointer"}}>✏ Edit</button>
            : <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setEditing(false)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${T.b1}`,background:"none",fontSize:11.5,color:T.t3,cursor:"pointer"}}>Cancel</button>
                <button onClick={save} disabled={saving} style={{padding:"5px 14px",borderRadius:6,background:saving?T.b1:T.grn,border:"none",color:"white",fontSize:11.5,fontWeight:700,cursor:"pointer"}}>{saving?"Saving...":"Save"}</button>
              </div>
          }
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{background:"#FFF8E1",borderRadius:7,padding:"10px 12px",border:"1px solid #FFD54F"}}>
            <div style={{fontSize:10,color:"#E65100",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Estimated Subsidy ({kw}kW)</div>
            <div style={{fontSize:18,fontWeight:800,color:"#E65100"}}>₹{subsidyCalc.toLocaleString("en-IN")}</div>
            <div style={{fontSize:10,color:"#BF360C",marginTop:2}}>₹18k/kW (≤2kW) + ₹9k/kW (next 1kW)</div>
          </div>
          <div style={{background:ss.bg,borderRadius:7,padding:"10px 12px",border:`1px solid ${ss.c}33`}}>
            <div style={{fontSize:10,color:ss.c,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Subsidy Status</div>
            {editing
              ? <select value={form.subsidy_status} onChange={e=>setForm(p=>({...p,subsidy_status:e.target.value}))}
                  style={{padding:"6px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:13,width:"100%",outline:"none",fontFamily:"inherit"}}>
                  {Object.entries(SUBSIDY_S).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
                </select>
              : <div style={{fontSize:16,fontWeight:700,color:ss.c}}>{ss.l}</div>
            }
          </div>
          <div>
            <div style={{fontSize:10,color:T.t4,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Actual Subsidy Amount</div>
            {editing
              ? <input type="number" value={form.subsidy_amount} onChange={e=>setForm(p=>({...p,subsidy_amount:e.target.value}))} placeholder="₹"
                  style={{width:"100%",padding:"7px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              : <div style={{fontSize:14,fontWeight:700,color:T.grn}}>₹{solar?.subsidy_amount?Number(solar.subsidy_amount).toLocaleString("en-IN"):"—"}</div>
            }
          </div>
        </div>
      </div>

      {/* Loan card */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,padding:"16px"}}>
        <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:12}}>Loan Details</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[
            {l:"Loan Required",v:solar?.loan_required?"Yes":"No"},
            {l:"Bank",v:solar?.loan_bank||"—"},
            {l:"Sanction Amount",v:solar?.loan_sanction_amount?`₹${Number(solar.loan_sanction_amount).toLocaleString("en-IN")}`:"—"},
            {l:"Disbursed 70%",v:solar?.loan_disbursed_70?`₹${Number(solar.loan_disbursed_70).toLocaleString("en-IN")}`:"—"},
            {l:"Disbursed 30%",v:solar?.loan_disbursed_30?`₹${Number(solar.loan_disbursed_30).toLocaleString("en-IN")}`:"—"},
          ].map(({l,v})=>(
            <div key={l}>
              <div style={{fontSize:10,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{l}</div>
              <div style={{fontSize:13,fontWeight:600,color:T.t1}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function ProjectDetailPage({project=PROJ, onBack}) {
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const isAdmin = ["admin","super_admin","project_manager"].includes(currentUser.role);
  if(!document.getElementById("gb-spin-css")){const s=document.createElement("style");s.id="gb-spin-css";s.textContent="@keyframes spin{to{transform:rotate(360deg)}}";document.head.appendChild(s);}
  // Optional initial tab from parent (e.g. todo drawer → Todo tab)
  const [tab, setTab] = useState(project.initialTab || "overview");

  // ── Solar EPC detection — construction tabs untouched ──────────
  const isSolar = project._raw?.project_type === "solar_epc" || project.project_type === "solar_epc";
  const activeTabs = isSolar ? SOLAR_TABS : TABS;

  const sm = STATUS_S[project.status]||{c:T.slt, bg:T.sltL};
  const margin = project.boq - project.expense;

  // Approval counts for this project
  const [approvalCount, setApprovalCount] = useState(0);
  const [approvalsByModule, setApprovalsByModule] = useState([]);
  const [showApprovalDrawer, setShowApprovalDrawer] = useState(false);
  const [showSitePulse, setShowSitePulse] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showProjectNotifs, setShowProjectNotifs] = useState(false);
  // Payment Request: { type, party } when triggered with prefill
  const [paymentReq, setPaymentReq] = useState(null);
  const loadApprovalCounts=()=>{
    if(!project?.id) return;
    api.get("/approvals/counts?project_id="+project.id).then(r=>{
      if(r.success&&r.data){
        setApprovalCount(r.data.total||0);
        setApprovalsByModule(r.data.byModule||[]);
      }
    }).catch(()=>{});
  };
  useEffect(()=>{ loadApprovalCounts(); },[project?.id]);

  // ── Layout mode (horizontal tabs vs sidebar) — synced with Settings ──
  const [layoutMode, setLayoutMode] = useState(() => {
    try { return localStorage.getItem("gb_project_layout") || "horizontal"; }
    catch { return "horizontal"; }
  });
  // Default: sidebar open. Auto-fold only on Task tab (needs more space).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (project.initialTab || "overview") === "task");
  useEffect(() => {
    const onLayoutChange = (e) => setLayoutMode(e.detail || "horizontal");
    const onStorageChange = (e) => {
      if (e.key === "gb_project_layout") setLayoutMode(e.newValue || "horizontal");
    };
    window.addEventListener("gb-layout-change", onLayoutChange);
    window.addEventListener("storage", onStorageChange);
    return () => {
      window.removeEventListener("gb-layout-change", onLayoutChange);
      window.removeEventListener("storage", onStorageChange);
    };
  }, []);
  // Auto-fold sidebar on Task tab; expand on every other tab.
  useEffect(() => {
    setSidebarCollapsed(tab === "task");
  }, [tab]);
  const toggleSidebar = () => setSidebarCollapsed(c => !c);

  // ── Broadcast "inside a project" so App shell can collapse its chrome in sidebar mode ──
  useEffect(() => {
    window.__gbInProject = true;
    window.dispatchEvent(new Event("gb-project-state-change"));
    return () => {
      window.__gbInProject = false;
      window.dispatchEvent(new Event("gb-project-state-change"));
    };
  }, []);

  const switchTab = (t) => setTab(t);

  // ── Ctrl+key tab shortcuts ──────────────────────────────────────
  useEffect(()=>{
    const handler=(e)=>{
      const tag=document.activeElement?.tagName;
      if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT") return;
      if(!e.ctrlKey) return;
      const match=activeTabs.find(t=>t.key===e.key.toLowerCase());
      if(match){e.preventDefault();setTab(match.id);}
    };
    const escHandler=(e)=>{
      if(e.key==="Escape"&&onBack) onBack();
    };
    window.addEventListener("keydown",handler);
    window.addEventListener("keydown",escHandler);
    return()=>{
      window.removeEventListener("keydown",handler);
      window.removeEventListener("keydown",escHandler);
    };
  },[onBack, activeTabs]);

  const tabContent = {
    // ── Construction tabs (unchanged) ──
    overview:    <TabOverview    proj={project}/>,
    design:      <TabDesign project={project} isAdmin={isAdmin}/>,
    estimate:    <TabEstimate/>,
    party:       <TabParty/>,
    transaction: <TabTransaction/>,
    todo:        <TabTodo projectId={project.id}/>,
    task:        <TabTasks projectId={project.id} isAdmin={isAdmin}/>,
    attendance:  <TabAttendance project={project}/>,
    material:    <TabMaterial project={project}/>,
    subcon:      <TabSubcon projectId={project.id}/>,
    equipment:   <TabEquipment/>,
    files:       <TabFiles projectId={project.id}/>,
    site:        <TabSite/>,
    mom:         <TabMOM/>,
    // ── Solar EPC tabs ──
    solar_stages:  <TabSuryaGhar  projectId={project.id}/>,
    solar_boq:     <TabSolarBOQ   projectId={project.id}/>,
    solar_docs:    <TabSolarDocs  projectId={project.id}/>,
    solar_install: <TabSolarInstall projectId={project.id}/>,
    solar_subsidy: <TabSolarSubsidy projectId={project.id}/>,
  };

  // ── Sidebar layout (Layout B) ──
  const sidebarWidth = sidebarCollapsed ? 60 : 220;
  const currentTabLabel = activeTabs.find(t => t.id === tab)?.label || "";
  const Chip = ({label, value, color, bg, border}) => (
    <div style={{display:"flex", alignItems:"baseline", gap:5, padding:"4px 10px", borderRadius:14, border:`1px solid ${border||T.b1}`, background:bg||T.surfaceB, fontSize:11, fontWeight:600, color:color||T.t2, whiteSpace:"nowrap", flexShrink:0}}>
      <span style={{fontSize:9.5, textTransform:"uppercase", letterSpacing:".4px", opacity:.7}}>{label}</span>
      <span style={{fontVariantNumeric:"tabular-nums"}}>{value}</span>
    </div>
  );
  const sidebarLayout = (
    <div style={{display:"flex", height:"100vh", overflow:"hidden", fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif", background:T.bg}}>
      <style>{`.gb-sb-scroll::-webkit-scrollbar{width:4px}.gb-sb-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:2px}`}</style>

      {/* ── PROJECT SIDEBAR ── */}
      <aside style={{width:sidebarWidth, background:"#1E293B", color:"#fff", display:"flex", flexDirection:"column", flexShrink:0, transition:"width .2s ease", overflow:"hidden"}}>

        {/* Header — hamburger toggle + company name */}
        <div style={{padding: sidebarCollapsed?"10px 0":"10px 12px", borderBottom:"1px solid rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent: sidebarCollapsed?"center":"flex-start", gap:10, minHeight:48}}>
          <button onClick={toggleSidebar} title={sidebarCollapsed?"Open sidebar":"Close sidebar"}
            style={{width:32, height:32, borderRadius:6, border:"none", background:"rgba(255,255,255,.06)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.14)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          {!sidebarCollapsed && (
            <div title={currentUser.company_name||"Company"} style={{flex:1, minWidth:0, display:"flex", flexDirection:"column", overflow:"hidden"}}>
              <span style={{fontSize:13.5, fontWeight:700, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", letterSpacing:"-.1px"}}>{currentUser.company_name||"Company"}</span>
              <span style={{fontSize:9.5, fontWeight:600, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".5px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{currentUser.role||"User"}</span>
            </div>
          )}
        </div>

        {/* Back to projects */}
        <div style={{padding: sidebarCollapsed?"6px 0":"8px 10px"}}>
          {onBack&&(
            <button onClick={onBack} title="All Projects (Esc)"
              style={{width:"100%", display:"inline-flex", alignItems:"center", justifyContent: sidebarCollapsed?"center":"flex-start", gap:6, padding: sidebarCollapsed?"6px 0":"6px 10px", border:"1px solid rgba(255,255,255,.1)", borderRadius:6, background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.7)", fontSize:11.5, fontWeight:500, cursor:"pointer", transition:"background .15s", height:30}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.1)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.04)"}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              {!sidebarCollapsed && <span>Projects</span>}
            </button>
          )}
        </div>

        {/* Tab list */}
        <nav className="gb-sb-scroll" style={{flex:1, overflowY:"auto", padding:"6px 0", borderTop:"1px solid rgba(255,255,255,.06)", marginTop:4}}>
          {activeTabs.map(t=>{
            const active = tab===t.id;
            const Icon = t.Icon;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                title={`${t.label}  (Ctrl+${t.key.toUpperCase()})`}
                style={{
                  width:"100%", display:"flex", alignItems:"center", gap:11,
                  padding: sidebarCollapsed ? "10px 0" : "8px 12px",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  border:"none",
                  background: active ? "rgba(37,99,235,.18)" : "transparent",
                  borderLeft: active ? "3px solid #3B82F6" : "3px solid transparent",
                  color: active ? "#fff" : "rgba(255,255,255,.65)",
                  fontSize:12.5, fontWeight: active?600:450, cursor:"pointer", textAlign:"left",
                  transition:"all .12s", fontFamily:"inherit",
                }}
                onMouseEnter={e=>{ if(!active) e.currentTarget.style.background="rgba(255,255,255,.05)"; }}
                onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
                {Icon && <Icon size={16} color={active?"#fff":"rgba(255,255,255,.6)"}/>}
                {!sidebarCollapsed && (
                  <>
                    <span style={{flex:1, whiteSpace:"nowrap"}}>{t.label}</span>
                    <span style={{fontSize:9.5, color:"rgba(255,255,255,.3)", fontWeight:500}}>^{t.key.toUpperCase()}</span>
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── RIGHT: top strip + content ── */}
      <div style={{flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden", background:T.bg}}>
        {/* Dark top bar — floating card with rounded edges */}
        <div style={{margin:"10px 12px 0", padding:"8px 14px", background:"#1E293B", borderRadius:10, boxShadow:"0 2px 10px rgba(15,23,42,0.18)", display:"flex", alignItems:"center", gap:12, flexShrink:0, minHeight:48}}>
          {/* Left: breadcrumb */}
          <div style={{flex:1, minWidth:0, display:"flex", alignItems:"center", gap:8, overflow:"hidden"}}>
            <span title={project.name} style={{fontSize:13.5, fontWeight:700, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:240}}>{project.name}</span>
            <span style={{fontSize:12, color:"rgba(255,255,255,.35)", fontWeight:400}}>/</span>
            <span style={{fontSize:12.5, fontWeight:600, color:"rgba(255,255,255,.85)", whiteSpace:"nowrap"}}>{currentTabLabel}</span>
            <Pill label={project.status} c={sm.c} bg="rgba(255,255,255,.1)"/>
            {isSolar && <span style={{fontSize:9.5,fontWeight:800,color:"#FBBF24",background:"rgba(251,191,36,.12)",border:"1px solid rgba(251,191,36,.3)",borderRadius:4,padding:"2px 7px",letterSpacing:".3px"}}>☀ SOLAR</span>}
          </div>

          {/* Right: action icon buttons */}
          <div style={{display:"flex", alignItems:"center", gap:2, flexShrink:0}}>
            {(() => {
              const IconBtn = ({title, onClick, badge, badgeColor, children}) => (
                <button onClick={onClick} title={title}
                  style={{position:"relative", width:34, height:34, borderRadius:7, border:"none", background:"transparent", color:"rgba(255,255,255,.7)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"background .12s, color .12s", flexShrink:0}}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.08)"; e.currentTarget.style.color="#fff";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,.7)";}}>
                  {children}
                  {badge>0 && (
                    <span style={{position:"absolute", top:4, right:4, minWidth:14, height:14, padding:"0 3px", borderRadius:8, background:badgeColor||"#F59E0B", color:"#fff", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #1E293B", fontVariantNumeric:"tabular-nums", lineHeight:1}}>{badge>9?"9+":badge}</span>
                  )}
                </button>
              );
              return (<>
                {/* Request Payment */}
                <IconBtn title="Request Payment — for subcon, labour or expense" onClick={()=>setPaymentReq({})}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                </IconBtn>
                {/* Site Pulse */}
                <IconBtn title="Site Pulse — live activity feed" onClick={()=>setShowSitePulse(true)}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </IconBtn>
                {/* Approvals */}
                <IconBtn title={`Pending Approvals${approvalCount>0?` (${approvalCount})`:""}`} onClick={()=>setShowApprovalDrawer(true)} badge={approvalCount} badgeColor="#F59E0B">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </IconBtn>
                {/* Notifications */}
                <IconBtn title="Project Notifications" onClick={()=>setShowProjectNotifs(true)}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                </IconBtn>
                {/* Project Settings */}
                <IconBtn title="Project Settings" onClick={()=>setShowProjectSettings(true)}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                </IconBtn>
              </>);
            })()}
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1, overflowY:"auto", background:T.bg, marginTop:10}}>
          {tabContent[tab]}
        </div>
      </div>
    </div>
  );

  // ── Horizontal layout (Layout A — default) ──
  const horizontalLayout = (
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
              {approvalCount>0&&(
                <div onClick={()=>setShowApprovalDrawer(true)} style={{background:"rgba(217,119,6,0.15)",border:"1px solid rgba(217,119,6,0.3)",borderRadius:8,padding:"7px 13px",textAlign:"right",cursor:"pointer",transition:"background .15s"}} title="Click to view pending approvals"
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(217,119,6,0.28)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(217,119,6,0.15)"}>
                  <div style={{fontSize:9.5,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:3}}>Approvals</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#FBBF24",fontVariantNumeric:"tabular-nums"}}>{approvalCount} pending</div>
                </div>
              )}
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
        {isSolar&&<div style={{display:"flex",alignItems:"center",padding:"0 12px",borderRight:`1px solid ${T.b1}`,flexShrink:0}}><span style={{fontSize:9.5,fontWeight:800,color:"#E65100",background:"#FFF8E1",border:"1px solid #FFD54F",borderRadius:4,padding:"2px 7px",letterSpacing:".3px",whiteSpace:"nowrap"}}>☀ Solar EPC</span></div>}
        {activeTabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            title={`${t.label}  (Ctrl+${t.key.toUpperCase()})`}
            style={{padding:"10px 16px 8px", border:"none", background:"none", cursor:"pointer", color:tab===t.id?T.blu:T.t3, fontWeight:tab===t.id?700:400, fontSize:12.5, whiteSpace:"nowrap", borderBottom:tab===t.id?`2.5px solid ${T.blu}`:"2.5px solid transparent", transition:"all .15s", flexShrink:0, fontFamily:"inherit", letterSpacing:0, display:"flex", flexDirection:"column", alignItems:"center", gap:1}}>
            {t.label}
            <span style={{fontSize:8, color:tab===t.id?T.blu:T.t4, opacity:tab===t.id?0.6:0.35, fontWeight:400, lineHeight:1}}>^{t.key.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{flex:1, overflowY:"auto", background:T.bg}}>
        {tabContent[tab]}
      </div>
    </div>
  );

  // Reusable simple side drawer (right slide-in)
  const SimpleDrawer = ({title, subtitle, onClose, children}) => (
    <>
      <style>{`@keyframes gbSlideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200}}/>
      <div style={{position:"fixed",top:0,right:0,height:"100vh",width:520,maxWidth:"95vw",background:T.surface,boxShadow:"-8px 0 30px rgba(0,0,0,0.15)",zIndex:201,display:"flex",flexDirection:"column",animation:"gbSlideInRight .25s ease-out",fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif"}}>
        <div style={{padding:"12px 16px",background:"#0D1B2A",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>{title}</div>
            {subtitle && <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>{subtitle}</div>}
          </div>
          <button onClick={onClose} title="Close"
            style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",padding:6,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .12s"}}
            onMouseEnter={el=>el.currentTarget.style.background="rgba(255,255,255,0.1)"}
            onMouseLeave={el=>el.currentTarget.style.background="none"}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>{children}</div>
      </div>
    </>
  );

  const PlaceholderEmpty = ({icon, title, desc}) => (
    <div style={{padding:"60px 30px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
      <div style={{width:56,height:56,borderRadius:"50%",border:`1.5px dashed ${T.b2}`,display:"flex",alignItems:"center",justifyContent:"center",color:T.t4}}>{icon}</div>
      <div style={{fontSize:14,fontWeight:700,color:T.t1}}>{title}</div>
      <div style={{fontSize:12,color:T.t3,maxWidth:340,lineHeight:1.5}}>{desc}</div>
    </div>
  );

  return (
    <>
      {layoutMode === "sidebar" ? sidebarLayout : horizontalLayout}
      {/* ── PROJECT APPROVAL DRAWER ── */}
      {showApprovalDrawer&&(
        <ProjectApprovalDrawer projectId={project.id} projectName={project.name} onClose={()=>{setShowApprovalDrawer(false);loadApprovalCounts();}}/>
      )}
      {/* ── SITE PULSE DRAWER ── */}
      {showSitePulse && (
        <SimpleDrawer title="Site Pulse" subtitle={`${project.name} · live activity feed`} onClose={()=>setShowSitePulse(false)}>
          <PlaceholderEmpty
            icon={<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
            title="Live activity feed coming soon"
            desc="Real-time updates from the site — attendance check-ins, material movements, transactions, photos uploaded by team members will stream here."
          />
        </SimpleDrawer>
      )}
      {/* ── PROJECT NOTIFICATIONS DRAWER ── */}
      {showProjectNotifs && (
        <SimpleDrawer title="Notifications" subtitle={`${project.name}`} onClose={()=>setShowProjectNotifs(false)}>
          <PlaceholderEmpty
            icon={<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>}
            title="No notifications yet"
            desc="Project-specific notifications — overdue tasks, low stock alerts, pending approvals updates, mentions in chats — will appear here."
          />
        </SimpleDrawer>
      )}
      {/* ── PROJECT SETTINGS DRAWER ── */}
      {showProjectSettings && (
        <SimpleDrawer title="Project Settings" subtitle={`${project.name}`} onClose={()=>setShowProjectSettings(false)}>
          <PlaceholderEmpty
            icon={<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>}
            title="Project settings"
            desc="Edit project name, dates, PM, BOQ value, status, and team members. This panel will host all per-project configuration."
          />
        </SimpleDrawer>
      )}
      {/* ── PAYMENT REQUEST DRAWER ── */}
      <PaymentRequestDrawer
        open={!!paymentReq}
        onClose={()=>setPaymentReq(null)}
        project={{id:project.id, name:project.name}}
        prefillType={paymentReq?.type}
        prefillParty={paymentReq?.party}
        onSaved={()=>{ loadApprovalCounts(); }}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PROJECT-LEVEL APPROVAL DRAWER — self-contained, no shared imports
   ═══════════════════════════════════════════════════════════════════ */
function ProjectApprovalDrawer({projectId, projectName, onClose}){
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState({});
  const [errMsg, setErrMsg] = useState("");

  const load = async () => {
    setLoading(true); setErrMsg("");
    try {
      const res = await api.get("/approvals/pending?project_id=" + projectId);
      setItems(res.success ? res.data || [] : []);
    } catch (e) { setErrMsg("Failed to load approvals"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [projectId]);

  const fmtAmt = n => n >= 100000 ? "₹" + (n / 100000).toFixed(1) + "L" : n >= 1000 ? "₹" + (n / 1000).toFixed(0) + "K" : "₹" + n;

  // Universal action handler for all source types
  const handleAction = async (item, actionType) => {
    const key = item.id;
    const src = item._source;
    const isRej = actionType === "reject" || actionType === "Rejected";
    setErrMsg(""); setActing(p => ({ ...p, [key]: isRej ? "rejecting" : "approving" }));
    try {
      let res;
      if (src === "design") {
        const status = actionType === "Revision" ? "Revision" : isRej ? "Rejected" : "Approved";
        res = await api.patch("/design/drawings/" + item._source_id + "/status", { status, note: status === "Revision" ? "Revision requested" : undefined });
      } else if (src === "material_request") {
        res = await api.patch("/procurement/mrs/" + item._source_id + "/approve", { action: isRej ? "Rejected" : "Approved", approved_qty: item.quantity || null });
      } else if (src === "payment_request") {
        res = await api.put("/finance/payment-requests/" + item._source_id + "/approve", { action: isRej ? "reject" : "approve" });
      } else if (src === "purchase_order") {
        res = await api.patch("/procurement/pos/" + item._source_id + "/approve", { approved_by: "" });
      } else if (src === "ra_bill") {
        res = await api.patch("/subcon/ra-bills/" + item._source_id + "/status", { status: isRej ? "Rejected" : "Approved" });
      } else if (src === "wo_amendment") {
        res = await api.patch("/subcon/amendments/" + item._source_id + "/action", { status: isRej ? "Rejected" : "Approved" });
      } else {
        res = await api.patch("/approvals/" + item.id + "/action", { action: isRej ? "reject" : "approve" });
      }
      if (res && res.success !== false) setItems(p => p.filter(i => i.id !== item.id));
      else setErrMsg((res && res.message) || "Failed");
    } catch (e) { setErrMsg(e.message); }
    setActing(p => ({ ...p, [key]: null }));
  };

  const MOD_COLORS = { "Material Request": T.amb, "Design Approval": "#7C3AED", "Purchase Order (PO)": T.blu, "RA Bill": "#0891B2", "Subcon WO Amendment": "#EA580C", "Payment Request": T.blu, "Material Site Transfer": "#059669", "Material Issue": "#059669" };

  return (<>
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.38)", zIndex: 300, backdropFilter: "blur(2px)" }} />
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 420, background: T.bg, zIndex: 301, boxShadow: "-4px 0 28px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#0D1B2A", padding: "14px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>Pending Approvals</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 18, padding: 4 }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ background: T.amb, color: "white", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>{items.length} pending</span>
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>{projectName}</span>
          <button onClick={load} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 10.5, padding: "3px 9px", borderRadius: 5 }}>↻ Refresh</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px" }}>
        {errMsg && <div style={{ margin: "4px 0 8px", padding: "8px 12px", background: T.redL, border: "1px solid " + T.redM, borderRadius: 7, fontSize: 12, color: T.red }}>{errMsg}</div>}
        {loading && <div style={{ textAlign: "center", padding: "40px", color: T.t4, fontSize: 13 }}>Loading approvals...</div>}
        {!loading && items.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.t2 }}>No pending approvals!</div>
            <div style={{ fontSize: 12, color: T.t4, marginTop: 4 }}>All approval requests are clear</div>
          </div>
        )}
        {!loading && items.map(item => {
          const mc = MOD_COLORS[item.module] || T.slt;
          const act = acting[item.id];
          const src = item._source;
          return (
            <div key={item.id} style={{ background: T.surface, borderRadius: 8, border: "1px solid " + T.b1, padding: "11px 13px", borderLeft: "3px solid " + mc, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: mc, background: mc + "18", padding: "1px 7px", borderRadius: 10, textTransform: "uppercase" }}>{item.module}</span>
                    <span style={{ fontSize: 9.5, color: T.t4 }}>{item.ref_no}</span>
                    {src === "design" && item.category && <span style={{ fontSize: 9, color: T.t4 }}>{item.category} · {item.drawing_type || "2D"}</span>}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{item.title}</div>
                  <div style={{ fontSize: 10.5, color: T.t4, marginTop: 2 }}>{item.project_name || "—"} · by {item.submitted_by_name}{!src ? " · L" + item.current_level + "/" + item.max_level : ""}</div>
                </div>
                {item.amount > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: mc, flexShrink: 0 }}>{fmtAmt(item.amount)}</span>}
              </div>
              {/* Level progress for centralized items */}
              {!src && item.max_level > 0 && (
                <div style={{ display: "flex", gap: 4, margin: "6px 0", alignItems: "center" }}>
                  {Array.from({ length: item.max_level }, (_, i) => {
                    const lvl = i + 1; const done = lvl < item.current_level; const pending = lvl === item.current_level;
                    return <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: done ? "#059669" : pending ? mc : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: done || pending ? "white" : "#9CA3AF" }}>{done ? "✓" : "L" + lvl}</div>
                      {i < item.max_level - 1 && <div style={{ width: 16, height: 2, background: done ? "#059669" : "#E5E7EB" }} />}
                    </div>;
                  })}
                  <span style={{ fontSize: 9.5, color: T.t4, marginLeft: 4 }}>Pending: {item.pending_role || "—"}</span>
                </div>
              )}
              {/* Action buttons */}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                {src !== "purchase_order" && (
                  <button onClick={() => handleAction(item, "reject")} disabled={!!act}
                    style={{ flex: 1, padding: "6px", borderRadius: 6, background: T.redL, border: "1px solid " + T.redM, color: T.red, fontSize: 11, fontWeight: 700, cursor: act ? "not-allowed" : "pointer" }}>
                    {act === "rejecting" ? "..." : "✕ Reject"}
                  </button>
                )}
                {src === "design" && (
                  <button onClick={() => handleAction(item, "Revision")} disabled={!!act}
                    style={{ flex: 1, padding: "6px", borderRadius: 6, background: "#DBEAFE", border: "1px solid #93C5FD", color: "#1D4ED8", fontSize: 11, fontWeight: 700, cursor: act ? "not-allowed" : "pointer" }}>
                    ↻ Revision
                  </button>
                )}
                <button onClick={() => handleAction(item, "approve")} disabled={!!act}
                  style={{ flex: 2, padding: "6px", borderRadius: 6, background: act === "approving" ? T.b1 : T.grn, border: "none", color: "white", fontSize: 11, fontWeight: 700, cursor: act ? "not-allowed" : "pointer" }}>
                  {act === "approving" ? "Approving..." : "✓ Approve"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </>);
}

export default ProjectDetailPage;
