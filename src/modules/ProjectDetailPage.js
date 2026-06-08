import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api, { API_BASE } from "../config/api";
import apiCache from "../utils/apiCache";
import { Avatar, Credit } from "../components/Credit";
import PaymentRequestDrawer from "../components/PaymentRequestDrawer";
import SearchSelect from "../components/SearchSelect";
import LibrarySelect from "../components/LibrarySelect";
import MaterialFlowDrawer from "../components/MaterialFlowDrawer";
import MRDetailDrawer from "../components/MRDetailDrawer";
import MaterialTransferTab from "../components/MaterialTransferTab";
import MaterialLedgerDrawer from "../components/MaterialLedgerDrawer";
import uploadManager from "../utils/uploadManager";
import EstimateBuilderModal from "./EstimateBuilderModal";
import MOMModule from "./MOMModule";
import { T, fmt, fmtN, localYMD, PROJ, STATUS_S, STAGES, STAGE_S } from "./shared/tokens";
import { Pill, PBar, Stat, Panel, PHead, THead, AddBtn, SecBtn, FilterTabs, TabIc } from "./shared/ui";
import TabEstimate from "./tabs/TabEstimate";
import TabTasks from "./tabs/TabTasks";

// ── DATA ──────────────────────────────────────────────────────────────
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
  // Fallbacks mirror the seeded taxonomy in case /design/categories hasn't loaded yet
  const CATS  = Array.from(new Set(dbCats.length  > 0 ? dbCats.map(c=>c.name)  : ["Architectural","Structural","Electrical","Plumbing","Interior","HVAC","Landscape","Approval"]));
  const TYPES = Array.from(new Set(dbTypes.length > 0 ? dbTypes.map(t=>t.name) : ["Plan","Elevation","Section","Detail","Schedule","Diagram","3D"]));
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
            <SearchSelect
              value={reqForm.title}
              options={(Array.isArray(dbTitles) ? dbTitles : []).map(t => ({
                key:   t.title,
                label: t.category ? `${t.title}  ·  ${t.category}${t.type?" / "+t.type:""}` : t.title,
              }))}
              onChange={v => {
                // Pull the rich row to auto-fill Category + Type when picking from library
                const found = (dbTitles || []).find(t => t.title === v);
                setReqForm(p => ({
                  ...p,
                  title: v,
                  category:     found?.category || p.category,
                  drawing_type: found?.type     || p.drawing_type,
                }));
              }}
              placeholder="Type or select from library..."
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
  // State — fallbacks match seeded taxonomy (8 cats / 7 types)
  const CATS_DEFAULT = ["Architectural","Structural","Electrical","Plumbing","Interior","HVAC","Landscape","Approval"];
  const TYPES_DEFAULT = ["Plan","Elevation","Section","Detail","Schedule","Diagram","3D"];

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
    // Falls back to `title` for drawing_titles rows (which don't have a
    // `name` field). Without this fallback, every title row was being
    // dropped — Design Request dropdown showed "No options yet".
    const seen = new Set();
    return (arr||[]).filter(item => {
      const k = String(item.name||item.title||"").trim().toLowerCase();
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
        apiCache.refreshApprovals();  // pre-warm Pending Approvals badge
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

        {/* Drawing is in client review — admin actions are gated until the
            client signs off. Show a status pill instead of Approve/Reject. */}
        {d.status!=="Approved" && (d.client_status==="PendingShare" || d.client_status==="SharedWithClient") && (
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:14,
              border:`1px solid ${d.client_status==="PendingShare"?T.ambM:T.bluM}`,
              background:d.client_status==="PendingShare"?T.ambL:T.bluL,
              color:d.client_status==="PendingShare"?T.amb:T.blu,
              fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {d.client_status==="PendingShare" ? "Pending Client Share" : "Pending Client Approval"}
            </span>
            <span style={{fontSize:11,color:T.t4}}>
              Client se approval ke baad admin review available hoga — Design module &gt; Client Approval tab.
            </span>
          </div>
        )}

        {d.status!=="Approved" && d.client_status!=="PendingShare" && d.client_status!=="SharedWithClient" && (
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
            // When the drawing is still routing through client review, show
            // a client-flavoured pill instead of the generic admin status.
            const inClientFlow = d.client_status === "PendingShare" || d.client_status === "SharedWithClient";
            const sm = inClientFlow
              ? { c: d.client_status === "PendingShare" ? T.amb : T.blu,
                  bg: d.client_status === "PendingShare" ? T.ambL : T.bluL }
              : (statusMeta[d.status] || statusMeta["Pending"]);
            const statusLabel = inClientFlow
              ? (d.client_status === "PendingShare" ? "Pending Client Share" : "Pending Client Approval")
              : d.status;
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
                  <Pill label={statusLabel} c={sm.c} bg={sm.bg}/>
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

// TAB 4 — PARTY
// ═══════════════════════════════════════════════════════════════════

// Reuse the full-featured Create Transaction modal from FinanceModule
// (with bank account, MOP, duplicate-payment guard, GRN-link logic).
// Project Detail Party tab passes lockParty+lockProject so those
// fields stay read-only — same modal, restricted context.
import { CreateTransactionModal } from "./FinanceModule";

// ── Lightweight Add-Party modal (kept inline) ────────────────────
// Only used for the "+ Add Party" action — the full Finance modal
// doesn't have a party-creation flow at its root, so a small inline
// form covers that. Receipt / Payment / Bill go through the full
// CreateTransactionModal imported above (with bank account + MOP).
function AddPartyModal({ open, onClose, onSaved }) {
  // Sirf name + type compulsory; baki sabhi optional. Backend
  // /finance/parties POST handles full payload (phone, email, gstin,
  // pan, address, city, bank fields, opening_balance, credit_days).
  const blank = {
    name: "", type: "Supplier",
    phone: "", email: "", gstin: "", pan: "",
    address: "", city: "",
    bank_name: "", bank_account: "", ifsc: "",
    opening_balance: "", credit_days: "",
  };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  useEffect(() => {
    if (open) { setForm(blank); setErr(""); setSaving(false); setShowOptional(false); }
  }, [open]);

  if (!open) return null;

  const set = (k) => (e) => setForm(p => ({...p, [k]: e.target.value}));

  const submit = async () => {
    if (!form.name.trim()) { setErr("Party name zaroori hai"); return; }
    setSaving(true); setErr("");
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        // Optional fields — null when blank so backend keeps defaults
        phone:        form.phone.trim()        || null,
        email:        form.email.trim()        || null,
        gstin:        form.gstin.trim()        || null,
        pan:          form.pan.trim()          || null,
        address:      form.address.trim()      || null,
        city:         form.city.trim()         || null,
        bank_name:    form.bank_name.trim()    || null,
        bank_account: form.bank_account.trim() || null,
        ifsc:         form.ifsc.trim()         || null,
        opening_balance: form.opening_balance ? parseFloat(form.opening_balance) : 0,
        credit_days:     form.credit_days     ? parseInt(form.credit_days)       : 7,
      };
      const r = await api.post("/finance/parties", payload);
      if (!r?.success) { setErr(r?.message || "Save failed"); setSaving(false); return; }
      onSaved && onSaved();
      onClose();
    } catch (e) { setErr(e?.message || "Save failed"); setSaving(false); }
  };

  const lbl = (txt) => (
    <label style={{fontSize:10.5, fontWeight:600, color:T.t4, textTransform:"uppercase", letterSpacing:.4, display:"block", marginBottom:4}}>{txt}</label>
  );
  const ip = {width:"100%", padding:"8px 10px", borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:12.5, outline:"none", boxSizing:"border-box", fontFamily:"inherit"};

  return (
    <div onClick={onClose}
      style={{position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", zIndex:300,
        display:"flex", alignItems:"center", justifyContent:"center", padding:14}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.surface, borderRadius:12, padding:"18px 20px", width:560, maxWidth:"96vw",
          maxHeight:"90vh", overflowY:"auto",
          boxShadow:"0 12px 40px rgba(0,0,0,0.25)", borderTop:`4px solid ${T.blu}`}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14}}>
          <div>
            <div style={{fontSize:15, fontWeight:700, color:T.t1}}>Add New Party</div>
            <div style={{fontSize:11, color:T.t4, marginTop:2}}>Sirf Name + Type compulsory · baki sab optional</div>
          </div>
          <button onClick={onClose} style={{background:"none", border:"none", cursor:"pointer", fontSize:20, color:T.t4, lineHeight:1}}>×</button>
        </div>

        {/* Required basics */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12}}>
          <div>
            {lbl("Party Name *")}
            <input value={form.name} onChange={set("name")} placeholder="e.g. abhay traders" autoFocus style={ip}/>
          </div>
          <div>
            {lbl("Type *")}
            <select value={form.type} onChange={set("type")} style={{...ip, background:T.surface}}>
              {["Client","Supplier","Material Supplier","Sub-Con","Labour Vendor","Other Vendor"].map(t =>
                <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Toggle optional sections */}
        <button onClick={()=>setShowOptional(s=>!s)}
          style={{width:"100%", padding:"7px 10px", marginBottom:12, borderRadius:7, border:`1px dashed ${T.b1}`, background:T.surfaceB, color:T.blu, fontSize:11.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit"}}>
          {showOptional ? "− Hide optional details" : "+ Add optional details (contact, GST, bank, etc)"}
        </button>

        {showOptional && (
          <>
            <div style={{fontSize:10.5, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:.5, marginBottom:6}}>Contact & Tax</div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8}}>
              <div>{lbl("Phone")}<input value={form.phone} onChange={set("phone")} placeholder="10-digit" style={ip}/></div>
              <div>{lbl("Email")}<input value={form.email} onChange={set("email")} placeholder="optional" style={ip}/></div>
              <div>{lbl("GSTIN")}<input value={form.gstin} onChange={set("gstin")} placeholder="15-char GSTIN" style={ip}/></div>
              <div>{lbl("PAN")}<input value={form.pan} onChange={set("pan")} placeholder="optional" style={ip}/></div>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:14}}>
              <div>{lbl("Address")}<input value={form.address} onChange={set("address")} placeholder="street / locality" style={ip}/></div>
              <div>{lbl("City")}<input value={form.city} onChange={set("city")} placeholder="optional" style={ip}/></div>
            </div>

            <div style={{fontSize:10.5, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:.5, marginBottom:6}}>Bank (optional)</div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14}}>
              <div>{lbl("Bank Name")}<input value={form.bank_name} onChange={set("bank_name")} placeholder="e.g. HDFC" style={ip}/></div>
              <div>{lbl("Account No.")}<input value={form.bank_account} onChange={set("bank_account")} placeholder="account" style={ip}/></div>
              <div>{lbl("IFSC")}<input value={form.ifsc} onChange={set("ifsc")} placeholder="branch IFSC" style={ip}/></div>
            </div>

            <div style={{fontSize:10.5, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:.5, marginBottom:6}}>Finance (optional)</div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12}}>
              <div>
                {lbl("Opening Balance (₹)")}
                <input type="number" value={form.opening_balance} onChange={set("opening_balance")} placeholder="0" style={ip}/>
                <div style={{fontSize:10, color:T.t4, marginTop:3}}>Pichla owed amount — backend ise live_balance me jod deta hai</div>
              </div>
              <div>
                {lbl("Credit Days")}
                <input type="number" value={form.credit_days} onChange={set("credit_days")} placeholder="7" style={ip}/>
                <div style={{fontSize:10, color:T.t4, marginTop:3}}>Default 7 din — bill ka due-date is se calculate hota hai</div>
              </div>
            </div>
          </>
        )}

        <div style={{fontSize:10.5, color:T.t4, background:T.surfaceB, padding:"7px 10px", borderRadius:6, border:`1px solid ${T.b1}`, marginBottom:12}}>
          Party banane ke baad iss tab me appear hone ke liye iske saath at-least ek transaction (Receipt / Payment / Bill) is project pe karna padega.
        </div>

        {err && <div style={{marginBottom:10, padding:"8px 10px", borderRadius:6, background:T.redL, border:`1px solid ${T.redM}`, color:T.red, fontSize:11.5}}>{err}</div>}

        <div style={{display:"flex", gap:8}}>
          <button onClick={onClose} disabled={saving}
            style={{flex:1, padding:"9px", border:`1px solid ${T.b2}`, borderRadius:7, background:T.surface, color:T.t3, fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit"}}>Cancel</button>
          <button onClick={submit} disabled={saving}
            style={{flex:2, padding:"9px", border:"none", borderRadius:7, background:T.blu, color:"#fff", fontSize:12.5, fontWeight:700, cursor:saving?"wait":"pointer", fontFamily:"inherit", opacity:saving?0.7:1}}>
            {saving ? "Saving..." : "Add Party"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabParty({ projectId, projectName }) {
  // ── Live data: parties + this-project's transactions ─────────
  // Party tab on a project detail page shows only parties that have
  // activity (any txn) on this project. Balance + ledger entries are
  // computed from project-scoped transactions, not the party's
  // company-wide balance.
  const [selP, setSelP] = useState(null);
  const [allParties, setAllParties] = useState([]);
  const [projTxns, setProjTxns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  // Two distinct modals:
  //  - txnModal {type, partyName}  → full CreateTransactionModal with
  //                                  party + project locked
  //  - showAddParty (bool)         → inline AddPartyModal
  const [txnModal, setTxnModal] = useState(null);
  const [showAddParty, setShowAddParty] = useState(false);
  const typeS = {
    "Client":{c:T.grn,bg:T.grnL},
    "client":{c:T.grn,bg:T.grnL},
    "Material Supplier":{c:T.blu,bg:T.bluL},
    "Supplier":{c:T.blu,bg:T.bluL},
    "supplier":{c:T.blu,bg:T.bluL},
    "Sub-Contractor":{c:T.slt,bg:T.sltL},
    "Sub-Con":{c:T.slt,bg:T.sltL},
    "Subcon":{c:T.slt,bg:T.sltL},
    "subcon":{c:T.slt,bg:T.sltL},
    "Labour Vendor":{c:T.pur,bg:T.purL},
    "staff":{c:T.amb,bg:T.ambL},
  };

  const reload = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      api.get("/finance/parties"),
      api.get("/finance/transactions?project_id=" + projectId + "&limit=2000"),
      api.get("/finance/accounts"),
      api.get("/projects"),
    ]).then(([pRes, tRes, aRes, prRes]) => {
      if (pRes?.success && Array.isArray(pRes.data)) setAllParties(pRes.data);
      if (tRes?.success && Array.isArray(tRes.data)) setProjTxns(tRes.data);
      if (aRes?.success && Array.isArray(aRes.data)) setAccounts(aRes.data);
      if (prRes?.success && Array.isArray(prRes.data)) setProjectsList(prRes.data.map(p=>p.name));
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  // Classify txn impact on party balance — vendor side (we owe them
  // when bill is raised, owe less when we pay) vs client side (they
  // owe us when we invoice, owe less when they pay).
  const isVendorType = (t) => {
    const x = String(t||"").toLowerCase();
    return x.includes("vendor") || x.includes("supplier") || x.includes("sub-con") || x.includes("subcon") || x.includes("staff");
  };

  // Per-party project-scoped data
  const partyRows = useMemo(() => {
    return allParties.map(p => {
      const myTxns = projTxns.filter(t => Number(t.party_id) === Number(p.id));
      if (myTxns.length === 0) return null; // skip parties with no activity on this project
      const isVendor = isVendorType(p.type);
      // Sort chronologically OLDEST first so running balance accumulates
      // naturally top-down (proper ledger view).
      const sortedTxns = [...myTxns].sort((a,b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        if (da !== db) return da - db;
        return (a.id||0) - (b.id||0);
      });
      // Direction convention:
      //   Vendor side  → CR = bill / purchase (we owe more)
      //                  DR = payment (we paid)
      //                  running balance = Σ CR − Σ DR  (positive = To Pay)
      //   Client side  → DR = invoice raised (they owe)
      //                  CR = receipt received (they paid)
      //                  running balance = Σ DR − Σ CR  (positive = To Receive)
      let credit = 0, debit = 0;
      let running = 0;
      const txnRows = [];
      for (const t of sortedTxns) {
        const amt = parseFloat(t.amount) || 0;
        const type = t.type || "";
        let isCR;
        if (isVendor) {
          // payment / party_payment = DR (we paid); bills = CR (we owe)
          if (type === "payment" || type === "party_payment") isCR = false;
          else if (type === "material_purchase" || type === "subcon_expense" || type === "site_expense") isCR = true;
          else if (type === "receipt") isCR = true; // money in from staff/vendor reimbursement
          else isCR = true; // default bill-like
        } else {
          // Client: receipt = CR, sales_invoice = DR
          if (type === "receipt") isCR = true;
          else if (type === "sales_invoice") isCR = false;
          else isCR = false;
        }
        if (isCR) credit += amt; else debit += amt;
        // Running balance — accumulates in the party's natural direction
        if (isVendor) running += isCR ? amt : -amt;
        else          running += isCR ? -amt : amt;
        txnRows.push({
          id: t.id,
          date: t.date ? new Date(t.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}) : "",
          project: t.project_name || "",         // project tag for ledger column
          // Only show the USER-typed note. `description` is auto-generated
          // ("Payment Made — party — project") which would duplicate the
          // Type / Project / (party-already-selected) columns. Empty → "—".
          note: (t.note || "").trim(),
          type: type.replace(/_/g," ").replace(/\b\w/g, c=>c.toUpperCase()),
          amount: amt,
          cr: isCR,
          runBal: running,    // signed: positive = To Pay (vendor) / To Receive (client)
        });
      }
      const net = running;
      const balance = Math.abs(net);
      const balPositive = isVendor ? net <= 0 : net >= 0;
      const balLabel = isVendor
        ? (net > 0 ? "To Pay" : net < 0 ? "Advance Paid" : "Settled")
        : (net > 0 ? "To Receive" : net < 0 ? "Advance Received" : "Settled");
      return {
        id: p.id,
        name: p.name,
        type: p.type || "Other",
        isVendor,
        balance, balPositive, balLabel,
        txnRows,   // already chronological — oldest first for ledger
      };
    }).filter(Boolean).sort((a,b)=>b.balance-a.balance);
  }, [allParties, projTxns]);

  // Keep selection in sync when partyRows recompute. Dep on partyRows
  // (not just .length) so the ledger refreshes after a new txn is added
  // to an EXISTING party — otherwise selP.txnRows would stay stale.
  useEffect(() => {
    if (!selP) return;
    const match = partyRows.find(p => p.id === selP.id);
    if (!match) setSelP(null);
    else if (match !== selP) setSelP(match);
  }, [partyRows]);

  // Small HTML-entity escaper for safe template-literal injection
  // (party names, types, descriptions can contain quotes / brackets).
  const escapeHTML = (s) => String(s||"").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  // ── PDF export: open print window with project-party ledger ─────
  // Self-contained — no Reports module dependency. Sender / receiver
  // direction (CR / DR) already computed on selP.txnRows.
  const exportPartyLedgerPDF = (party, project) => {
    if (!party) return;
    const today = new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
    const isVendor = !!party.isVendor;
    // Per-row CR / DR / Running Balance — sign convention matches the UI.
    const rows = party.txnRows.map(t => {
      const balAbs = Math.abs(t.runBal||0);
      const balGood= isVendor ? (t.runBal<=0) : (t.runBal>=0);
      const balSfx = (t.runBal||0)===0 ? "" :
                     isVendor ? (t.runBal>0 ? "Cr" : "Dr")
                              : (t.runBal>0 ? "Dr" : "Cr");
      const proj   = t.project || project || "";
      const hasNote= !!(t.note && t.note.trim());
      return `
      <tr>
        <td>${t.date}</td>
        <td style="color:#6B7280">${escapeHTML(proj) || "—"}</td>
        <td style="${hasNote ? "" : "color:#9CA3AF;font-style:italic"}">${hasNote ? escapeHTML(t.note) : "—"}</td>
        <td><span style="font-size:9.5px;padding:2px 7px;border-radius:10px;background:#F8F9FB;color:#4B5563">${escapeHTML(t.type)}</span></td>
        <td style="text-align:right;font-weight:600;color:${t.cr ? "#059669" : "#CBD5E1"};font-variant-numeric:tabular-nums">
          ${t.cr ? `₹${(t.amount||0).toLocaleString("en-IN")}` : "—"}
        </td>
        <td style="text-align:right;font-weight:600;color:${!t.cr ? "#DC2626" : "#CBD5E1"};font-variant-numeric:tabular-nums">
          ${!t.cr ? `₹${(t.amount||0).toLocaleString("en-IN")}` : "—"}
        </td>
        <td style="text-align:right;font-weight:700;color:${balAbs===0?"#9CA3AF":(balGood?"#059669":"#DC2626")};font-variant-numeric:tabular-nums">
          ${balAbs===0 ? "₹0.00" : `₹${balAbs.toLocaleString("en-IN")} ${balSfx}`}
        </td>
      </tr>`;
    }).join("");
    const totalCR = party.txnRows.filter(t=>t.cr).reduce((s,t)=>s+(t.amount||0),0);
    const totalDR = party.txnRows.filter(t=>!t.cr).reduce((s,t)=>s+(t.amount||0),0);
    const lastBal = party.txnRows.length ? (party.txnRows[party.txnRows.length-1].runBal||0) : 0;
    const closeAbs= Math.abs(lastBal);
    const closeGood= isVendor ? (lastBal<=0) : (lastBal>=0);
    const closeSfx = lastBal===0 ? "" :
                     isVendor ? (lastBal>0 ? "Cr" : "Dr")
                              : (lastBal>0 ? "Dr" : "Cr");
    const w = window.open("", "_blank");
    if (!w) { window.alert("Print window blocked — allow pop-ups for this site."); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
      <title>${escapeHTML(party.name)} — ${escapeHTML(project||"Project")}</title>
      <style>
        body{font-family:'Segoe UI',system-ui,sans-serif;color:#111827;margin:24px;font-size:13px}
        h1{font-size:18px;margin:0 0 4px}
        .sub{font-size:11px;color:#6B7280;margin-bottom:16px}
        .meta{display:flex;gap:24px;margin-bottom:14px;padding:10px 14px;background:#F8F9FB;border-radius:6px;border:1px solid #E5E7EB}
        .meta div{display:flex;gap:5px;align-items:center}
        .meta .l{font-size:10.5px;color:#6B7280;text-transform:uppercase;letter-spacing:.3px}
        .meta .v{font-size:12.5px;font-weight:600}
        table{width:100%;border-collapse:collapse;font-size:11.5px}
        th{background:#F8F9FB;color:#374151;font-weight:600;text-align:left;padding:8px 10px;border-bottom:2px solid #E5E7EB;font-size:10.5px;text-transform:uppercase;letter-spacing:.3px}
        td{padding:8px 10px;border-bottom:1px solid #F3F4F6}
        tr:last-child td{border-bottom:none}
        .totals{margin-top:14px;display:flex;justify-content:flex-end;gap:30px;font-size:11.5px;padding:10px 14px;background:#F8F9FB;border-radius:6px;border:1px solid #E5E7EB}
        .totals .cr{color:#059669;font-weight:700}
        .totals .dr{color:#DC2626;font-weight:700}
        .totals .net{color:${party.balPositive?"#059669":"#DC2626"};font-weight:800}
        .footer{margin-top:24px;font-size:10px;color:#9CA3AF;text-align:center}
        @media print { body{margin:12mm} }
      </style></head><body>
        <h1>${escapeHTML(party.name)}</h1>
        <div class="sub">Party Ledger — ${escapeHTML(project||"Project")} · Generated ${today}</div>
        <div class="meta">
          <div><span class="l">Type:</span> <span class="v">${escapeHTML(party.type)}</span></div>
          <div><span class="l">Status:</span> <span class="v">${escapeHTML(party.balLabel)}</span></div>
          <div><span class="l">Balance:</span> <span class="v" style="color:${party.balPositive?"#059669":"#DC2626"}">₹${(party.balance||0).toLocaleString("en-IN")}</span></div>
          <div><span class="l">Entries:</span> <span class="v">${party.txnRows.length}</span></div>
        </div>
        <table>
          <tr>
            <th style="width:70px">Date</th>
            <th style="width:110px">Project</th>
            <th>Note</th>
            <th style="width:100px">Type</th>
            <th style="text-align:right;width:85px">CR ₹</th>
            <th style="text-align:right;width:85px">DR ₹</th>
            <th style="text-align:right;width:115px">Balance</th>
          </tr>
          ${party.txnRows.length ? `<tr style="background:#F8F9FB"><td colspan="6" style="font-style:italic;color:#6B7280">Opening Balance</td><td style="text-align:right;font-weight:600;color:#6B7280">₹0.00</td></tr>` : ""}
          ${rows || `<tr><td colspan="7" style="text-align:center;padding:30px;color:#9CA3AF">No transactions</td></tr>`}
          ${party.txnRows.length ? `<tr style="background:#F8F9FB;border-top:2px solid #D1D5DB">
            <td colspan="4" style="font-weight:700;text-transform:uppercase;letter-spacing:.3px;font-size:10.5px">Closing Balance</td>
            <td style="text-align:right;font-weight:700;color:#059669">₹${totalCR.toLocaleString("en-IN")}</td>
            <td style="text-align:right;font-weight:700;color:#DC2626">₹${totalDR.toLocaleString("en-IN")}</td>
            <td style="text-align:right;font-weight:800;color:${closeAbs===0?"#9CA3AF":(closeGood?"#059669":"#DC2626")}">
              ${closeAbs===0 ? "₹0.00" : `₹${closeAbs.toLocaleString("en-IN")} ${closeSfx}`}
            </td>
          </tr>` : ""}
        </table>
        <div class="totals">
          <div>Total Credits: <span class="cr">₹${totalCR.toLocaleString("en-IN")}</span></div>
          <div>Total Debits: <span class="dr">₹${totalDR.toLocaleString("en-IN")}</span></div>
          <div>Net Balance: <span class="net">${party.balPositive?"":"−"}₹${party.balance.toLocaleString("en-IN")} (${escapeHTML(party.balLabel)})</span></div>
        </div>
        <div class="footer">Generated by GB Buildcon · Project-scoped ledger</div>
      </body></html>`);
    w.document.close();
    setTimeout(()=>w.print(), 400);
  };

  // Map button kind → the actual transaction "type" string that
  // CreateTransactionModal expects. Vendor / client direction is
  // resolved INSIDE the modal based on the party's library type,
  // so we just need the right top-level type per button kind.
  const txnTypeFor = (kind, party) => {
    const isVendor = String(party?.type||"").toLowerCase();
    const isSupplier = isVendor.includes("supplier") || (isVendor.includes("material") && !isVendor.includes("subcon"));
    const isSubcon = isVendor.includes("subcon") || isVendor.includes("sub-con");
    if (kind === "receipt") return "Payment Received";
    if (kind === "payment") return "Payment Made";
    // bill kind → choose between Material Purchase Bill / Sub-Con Bill / Sales Invoice
    if (kind === "bill") {
      if (isSubcon) return "Sub-Con Bill";
      if (isSupplier) return "Material Purchase Bill";
      return "Sales Invoice";  // client → invoice
    }
    return "Payment Made";
  };

  return (
    <div style={{padding:"16px 18px", display:"flex", gap:14, height:"100%"}}>
      {/* + Add Party modal */}
      <AddPartyModal open={showAddParty} onClose={()=>setShowAddParty(false)} onSaved={reload}/>
      {/* Full Create Transaction modal — same one Finance tab uses,
          with party + project pinned to the current context. */}
      {txnModal && (
        <CreateTransactionModal
          type={txnModal.type}
          preParty={txnModal.partyName}
          preProject={projectName}
          lockParty={true}
          lockProject={true}
          onClose={()=>setTxnModal(null)}
          dbParties={allParties}
          dbAccounts={accounts}
          dbProjects={projectsList}
          onSaved={()=>{ setTxnModal(null); reload(); }}
        />
      )}
      <div style={{width:290, flexShrink:0}}>
        <Panel style={{overflow:"hidden"}}>
          <PHead title={`Parties (${partyRows.length})`} action={<AddBtn label="Add Party" onClick={()=>setShowAddParty(true)}/>}/>
          {loading && (
            <div style={{padding:"30px 16px", textAlign:"center", color:T.t4, fontSize:12}}>Loading parties...</div>
          )}
          {!loading && partyRows.length === 0 && (
            <div style={{padding:"30px 16px", textAlign:"center", color:T.t4, fontSize:12}}>
              No parties with activity on this project yet.
              <div style={{fontSize:10.5, marginTop:4}}>Create a transaction tagged to this project to add a party here.</div>
            </div>
          )}
          {partyRows.map(p=>{
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
              <PHead title={`${selP.name}  ·  ${projectName||"Project"}`} action={<SecBtn label="Export PDF" onClick={()=>exportPartyLedgerPDF(selP, projectName)}/>}/>
              <div style={{padding:"8px 15px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, display:"flex", gap:20}}>
                {[["Type",selP.type],["Balance",`₹${fmtN(selP.balance)}`],["Status",selP.balLabel]].map(([l,v])=>(
                  <div key={l} style={{display:"flex", gap:6, alignItems:"center"}}>
                    <span style={{fontSize:11, color:T.t4}}>{l}:</span>
                    <span style={{fontSize:12.5, fontWeight:600, color:T.t1}}>{v}</span>
                  </div>
                ))}
                <div style={{marginLeft:"auto", fontSize:10.5, color:T.t4, fontStyle:"italic"}}>
                  Ledger for this project only · {selP.txnRows.length} txn(s)
                </div>
              </div>
              <div style={{flex:1, overflowY:"auto"}}>
                {(() => {
                  // 7-column grid: Date | Project | Note | Type | CR | DR | Balance
                  const COLS = "72px 110px 1fr 105px 92px 92px 118px";
                  return (
                    <>
                      <THead cols={COLS} headers={["Date","Project","Note","Type","CR ₹","DR ₹","Balance"]}/>
                      {/* Opening balance row — project-scoped ledger always starts at 0 */}
                      {selP.txnRows.length>0 && (
                        <div style={{display:"grid", gridTemplateColumns:COLS, padding:"7px 15px", borderBottom:`1px solid ${T.b1}`, alignItems:"center", background:T.surfaceB}}>
                          <span style={{fontSize:11, color:T.t4, fontStyle:"italic"}}>—</span>
                          <span style={{fontSize:11, color:T.t4, fontStyle:"italic"}}>—</span>
                          <span style={{fontSize:12, color:T.t3, fontStyle:"italic", fontWeight:500}}>Opening Balance</span>
                          <span style={{fontSize:10.5, color:T.t4, fontStyle:"italic"}}>—</span>
                          <span style={{fontSize:12, color:T.t4, textAlign:"right"}}>—</span>
                          <span style={{fontSize:12, color:T.t4, textAlign:"right"}}>—</span>
                          <span style={{fontSize:12, fontWeight:600, color:T.t4, fontVariantNumeric:"tabular-nums", textAlign:"right"}}>₹0.00</span>
                        </div>
                      )}
                      {selP.txnRows.map((txn,i)=>{
                        // Ledger sign convention (party-side):
                        //   vendor: runBal > 0 → "Cr" (we owe them)        → red
                        //   vendor: runBal < 0 → "Dr" (advance paid)        → green
                        //   client: runBal > 0 → "Dr" (they owe us)         → green
                        //   client: runBal < 0 → "Cr" (advance received)    → red
                        const balAbs = Math.abs(txn.runBal||0);
                        const balGood = selP.isVendor ? (txn.runBal<=0) : (txn.runBal>=0);
                        const balSfx  = txn.runBal===0 ? "" :
                                        selP.isVendor
                                          ? (txn.runBal>0 ? "Cr" : "Dr")
                                          : (txn.runBal>0 ? "Dr" : "Cr");
                        const proj = txn.project || projectName || "";
                        const hasNote = !!txn.note;
                        return (
                          <div key={i} style={{display:"grid", gridTemplateColumns:COLS, padding:"9px 15px", borderBottom:`1px solid ${T.b1}`, alignItems:"center", borderLeft:`3px solid ${txn.cr?T.grn:T.red}33`, transition:"background .1s"}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <span style={{fontSize:11.5, color:T.t4}}>{txn.date}</span>
                            <span style={{fontSize:11.5, color:T.t3, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={proj}>{proj || "—"}</span>
                            <span style={{fontSize:12.5, color:hasNote?T.t1:T.t4, fontWeight:hasNote?500:400, fontStyle:hasNote?"normal":"italic", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={txn.note}>
                              {hasNote ? txn.note : "—"}
                            </span>
                            <Pill label={txn.type} c={T.slt} bg={T.sltL}/>
                            <span style={{fontSize:12.5, fontWeight:600, color:txn.cr?T.grn:T.b2, fontVariantNumeric:"tabular-nums", textAlign:"right"}}>
                              {txn.cr ? `₹${fmtN(txn.amount)}` : "—"}
                            </span>
                            <span style={{fontSize:12.5, fontWeight:600, color:!txn.cr?T.red:T.b2, fontVariantNumeric:"tabular-nums", textAlign:"right"}}>
                              {!txn.cr ? `₹${fmtN(txn.amount)}` : "—"}
                            </span>
                            <span style={{fontSize:12.5, fontWeight:700, color:balAbs===0?T.t4:(balGood?T.grn:T.red), fontVariantNumeric:"tabular-nums", textAlign:"right"}}>
                              {balAbs===0 ? "₹0.00" : `₹${fmtN(balAbs)} ${balSfx}`}
                            </span>
                          </div>
                        );
                      })}
                      {/* Closing total row */}
                      {selP.txnRows.length>0 && (()=>{
                        const lastBal = selP.txnRows[selP.txnRows.length-1].runBal||0;
                        const totalCR = selP.txnRows.filter(t=>t.cr).reduce((s,t)=>s+(t.amount||0),0);
                        const totalDR = selP.txnRows.filter(t=>!t.cr).reduce((s,t)=>s+(t.amount||0),0);
                        const closeAbs = Math.abs(lastBal);
                        const closeGood = selP.isVendor ? (lastBal<=0) : (lastBal>=0);
                        const closeSfx  = lastBal===0 ? "" :
                                          selP.isVendor
                                            ? (lastBal>0 ? "Cr" : "Dr")
                                            : (lastBal>0 ? "Dr" : "Cr");
                        return (
                          <div style={{display:"grid", gridTemplateColumns:COLS, padding:"10px 15px", borderTop:`2px solid ${T.b2}`, alignItems:"center", background:T.surfaceB, fontWeight:700}}>
                            <span/>
                            <span/>
                            <span style={{fontSize:12, color:T.t2, fontWeight:700, textTransform:"uppercase", letterSpacing:.3}}>Closing Balance</span>
                            <span/>
                            <span style={{fontSize:12.5, color:T.grn, fontVariantNumeric:"tabular-nums", textAlign:"right"}}>₹{fmtN(totalCR)}</span>
                            <span style={{fontSize:12.5, color:T.red, fontVariantNumeric:"tabular-nums", textAlign:"right"}}>₹{fmtN(totalDR)}</span>
                            <span style={{fontSize:13, fontWeight:800, color:closeAbs===0?T.t4:(closeGood?T.grn:T.red), fontVariantNumeric:"tabular-nums", textAlign:"right"}}>
                              {closeAbs===0 ? "₹0.00" : `₹${fmtN(closeAbs)} ${closeSfx}`}
                            </span>
                          </div>
                        );
                      })()}
                      {selP.txnRows.length===0&&<div style={{padding:"40px 20px", textAlign:"center", color:T.t4, fontSize:13}}>No transactions on this project</div>}
                    </>
                  );
                })()}
              </div>
              <div style={{padding:"9px 15px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:8}}>
                <button onClick={()=>setTxnModal({type:txnTypeFor("receipt", selP), partyName:selP.name})}
                  style={{flex:1, padding:"7px", border:`1px solid ${T.grnM}`, borderRadius:6, background:T.grnL, color:T.grn, fontSize:12, fontWeight:600, cursor:"pointer"}}>+ Receipt</button>
                <button onClick={()=>setTxnModal({type:txnTypeFor("payment", selP), partyName:selP.name})}
                  style={{flex:1, padding:"7px", border:`1px solid ${T.redM}`, borderRadius:6, background:T.redL, color:T.red, fontSize:12, fontWeight:600, cursor:"pointer"}}>+ Payment</button>
                <button onClick={()=>setTxnModal({type:txnTypeFor("bill", selP), partyName:selP.name})}
                  style={{flex:1, padding:"7px", border:`1px solid ${T.b2}`, borderRadius:6, background:T.surface, color:T.t2, fontSize:12, fontWeight:600, cursor:"pointer"}}>+ Bill</button>
              </div>
            </>
          ):(
            <div style={{display:"flex", alignItems:"center", justifyContent:"center", flex:1, color:T.t4, fontSize:13}}>
              {partyRows.length === 0 ? "Add a party to start" : "Select a party to view its project-scoped ledger"}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 5 — TRANSACTION
// ═══════════════════════════════════════════════════════════════════
function TabTransaction({projectId, projectName}) {
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
      // Only parties that have at least 1 transaction on this project
      // (same logic as TabParty). Fallback to all parties if project has no txns yet.
      const projPartyIds = new Set(projTxns.map(t=>Number(t.party_id)).filter(Boolean));
      setTxnParties(projPartyIds.size > 0 ? allP.filter(p=>projPartyIds.has(Number(p.id))) : allP);
      if(aRes?.success&&Array.isArray(aRes.data))   setTxnAccounts(aRes.data);
      if(prRes?.success&&Array.isArray(prRes.data)) setTxnProjects(prRes.data.map(p=>p.name));
    }).catch(()=>{});
  },[projectId]);

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
  const [pinging,setPinging]=useState(null); // todo id currently being pinged

  // Parse a todo row from API into local shape.
  // Handles BOTH `project_task` and `company_todo` source rows — backend
  // `/projects/all-todos` returns a `_source` discriminator we preserve so
  // mutations can be routed to the right endpoint.
  const parseTodo=(t)=>{
    let cl=[];
    try{ cl=typeof t.checklist==="string"?JSON.parse(t.checklist):(t.checklist||[]); }catch(e){ cl=[]; }
    // Canonical key on read — tolerate legacy {t}/{title}/{item}/{label}/{name}.
    cl=(Array.isArray(cl)?cl:[]).map(c=>({
      text: c.text || c.t || c.title || c.item || c.label || c.name || "",
      done: !!c.done,
    }));
    return {
      id:t.id,
      text:t.title||t.name||"",
      description:t.description||"",
      priority:t.priority||"Medium",
      assignee:t.assigned_name||"Unassigned",
      assigneeId:t.assigned_to||null,
      due:t.due_date||"",
      cat:t.category||"Other",
      done:t.status==="done"||t.status==="Completed",
      checklist:cl,
      // Unified-todo metadata (mirrors mobile)
      _source: t._source || "project_task",
      project_id: t.project_id,
      raisedBy: t.created_by_name || "",
      raisedAt: t.created_at || "",
    };
  };

  // Source-aware endpoint helpers — same pattern as Home → TodoDrawer.
  const apiBaseFor=(t)=>(
    t._source==="company_todo"
      ? "/projects/company-todos/"+t.id
      : "/projects/"+projectId+"/tasks/"+t.id
  );
  const pingPathFor=(t)=>(
    t._source==="company_todo" || (t._source!=="project_task" && !t.project_id)
      ? "/projects/company-todos/"+t.id+"/ping"
      : "/tasks/"+t.id+"/ping"
  );

  // Format a created_at timestamp as `DD MMM · HH:MM AM` (mirrors mobile).
  const fmtCreatedAt=(s)=>{
    if(!s) return "";
    try{
      const d=new Date(s);
      const date=d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
      const time=d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
      return date+" · "+time;
    }catch(_){ return ""; }
  };

  // Fetch todos (BOTH sources) + team on mount.
  // Switched from /projects/:id/tasks → /projects/all-todos so company_todos
  // scoped to this project also show up here (matches mobile ProjectScreen).
  useEffect(()=>{
    if(!projectId) return;
    const load=async()=>{
      setLoading(true);
      try{
        const [todoRes,teamRes]=await Promise.all([
          api.get("/projects/all-todos"),
          api.get("/projects/team-members")
        ]);
        if(todoRes.success){
          const filtered=(todoRes.data||[]).filter(r=>Number(r.project_id)===Number(projectId));
          setTodos(filtered.map(parseTodo));
        }
        if(teamRes.success) setTeam(teamRes.data||[]);
      }catch(e){ console.error("Todo load error:",e); }
      setLoading(false);
    };
    load();
  },[projectId]);

  // Toggle done/undone — source-aware.
  const toggle=async(id)=>{
    const todo=todos.find(t=>t.id===id);
    if(!todo) return;
    const newStatus=todo.done?"todo":"done";
    setTodos(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t));
    try{
      await api.put(apiBaseFor(todo),{status:newStatus});
    }catch(e){
      setTodos(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t)); // revert
    }
  };

  // Inverse of progressFromStatus — derive status from checklist completion %.
  const statusFromPct=(pct)=>{
    if(pct>=100) return "Completed";
    if(pct>0)    return "In Progress";
    return "Not Started";
  };

  // Toggle a checklist item — emits canonical {text, done} on write AND
  // auto-promotes/demotes the todo's status when completion crosses a
  // threshold (0 → Not Started, 1-99% → In Progress, 100% → Completed).
  // One combined PUT keeps the checklist and status in lockstep server-side.
  const toggleCheck=async(todoId,ci)=>{
    const todo=todos.find(t=>t.id===todoId);
    if(!todo) return;
    const updated=todo.checklist.map((c,i)=>({
      text:c.text||"",
      done: i===ci ? !c.done : !!c.done,
    }));
    const body={checklist:updated};
    const patch={checklist:updated};
    if(updated.length>0){
      const pct=Math.round((updated.filter(c=>c.done).length/updated.length)*100);
      const derived=statusFromPct(pct);
      const currentStatus=todo.done?"Completed":(todo.status||"Not Started");
      if(derived!==currentStatus){
        body.status=derived;
        patch.done=derived==="Completed";
        patch.status=derived;
      }
    }
    setTodos(p=>p.map(t=>t.id===todoId?{...t,...patch}:t));
    try{
      await api.put(apiBaseFor(todo),body);
    }catch(e){
      setTodos(p=>p.map(t=>t.id===todoId?{...t,checklist:todo.checklist,done:todo.done}:t));
    }
  };

  // Ping the assignee — source-aware endpoint.
  const handlePing=async(t)=>{
    if(pinging===t.id) return;
    setPinging(t.id);
    try{ await api.post(pingPathFor(t),{}); }catch(_){}
    setPinging(null);
  };

  // Add new todo — always lands in project_tasks (this tab is project-scoped).
  // Emits canonical {text,done} checklist on write.
  const addTodo=async()=>{
    if(!newForm.text.trim()||saving) return;
    setSaving(true);
    try{
      const cl=newForm.checklist.length>0
        ? newForm.checklist.map(c=>({text:c.text||c.t||"",done:!!c.done})).filter(c=>c.text)
        : null;
      const res=await api.post(`/projects/${projectId}/tasks`,{
        title:newForm.text,
        priority:newForm.priority,
        assigned_to:newForm.assigneeId||null,
        due_date:newForm.due||null,
        category:newForm.cat,
        checklist:cl
      });
      if(res.success&&res.data){
        setTodos(p=>[parseTodo({...res.data,_source:"project_task"}),...p]);
        setNewForm({text:"",priority:"Medium",assigneeId:team[0]?.id||"",due:"",cat:"Civil",checklist:[]});
        setShowAdd(false);
      }
    }catch(e){ console.error("Add todo error:",e); }
    setSaving(false);
  };

  const addCheck=()=>{
    if(!newCheckText.trim()) return;
    // Canonical key — {text, done}.
    setNewForm(p=>({...p,checklist:[...p.checklist,{text:newCheckText.trim(),done:false}]}));
    setNewCheckText("");
  };

  // Delete todo — source-aware.
  const deleteTodo=async(id)=>{
    const todo=todos.find(t=>t.id===id);
    setTodos(p=>p.filter(t=>t.id!==id));
    if(!todo) return;
    try{
      if(todo._source==="company_todo"){
        await api.del("/projects/company-todos/"+id);
      }else{
        await api.del(`/projects/${projectId}/tasks/${id}`);
      }
    }catch(e){}
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
                <span style={{fontSize:12,color:T.t1,flex:1}}>{c.text||c.t||""}</span>
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
                  {isExp&&(
                    <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.b1}`}}>
                      {/* Raised-by row — created_by_name + created_at (mobile parity) */}
                      {(todo.raisedBy||todo.raisedAt)&&(
                        <div style={{fontSize:11,color:T.t4,marginBottom:8}}>
                          <span style={{fontWeight:600,color:T.t3}}>🙋 Raised by</span>{" "}
                          {todo.raisedBy||"—"}{todo.raisedAt?" · "+fmtCreatedAt(todo.raisedAt):""}
                          {todo._source==="company_todo"&&(
                            <span style={{marginLeft:6,padding:"1px 6px",borderRadius:8,background:T.purL,color:T.pur,fontSize:9.5,fontWeight:700,letterSpacing:".3px"}}>COMPANY</span>
                          )}
                        </div>
                      )}
                      {/* Description (if any) */}
                      {todo.description&&(
                        <div style={{fontSize:12,color:T.t2,marginBottom:8,padding:"6px 9px",background:T.surfaceB,borderRadius:6,whiteSpace:"pre-wrap"}}>
                          {todo.description}
                        </div>
                      )}
                      {/* Checklist + progress bar (drives task status) */}
                      {todo.checklist.length>0&&(() => {
                        const cDone=todo.checklist.filter(c=>c.done).length;
                        const cTotal=todo.checklist.length;
                        const cPct=Math.round((cDone/cTotal)*100);
                        return (
                          <div style={{marginBottom:todo.assigneeId?8:0}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                              <div style={{fontSize:10,fontWeight:700,color:T.t4,letterSpacing:".4px"}}>☑ CHECKLIST</div>
                              <span style={{fontSize:10.5,fontWeight:700,color:cPct===100?T.grn:T.blu}}>{cDone}/{cTotal}</span>
                            </div>
                            {/* Progress bar — drives status via toggleCheck */}
                            <div style={{height:4,background:T.b1,borderRadius:2,marginBottom:8,overflow:"hidden"}}>
                              <div style={{height:"100%",width:cPct+"%",background:cPct===100?T.grn:T.blu,borderRadius:2,transition:"width .3s"}}/>
                            </div>
                            {todo.checklist.map((c,ci)=>(
                              <div key={ci} onClick={()=>toggleCheck(todo.id,ci)} style={{display:"flex",alignItems:"center",gap:7,padding:"3px 0",cursor:"pointer"}}>
                                <div style={{width:14,height:14,borderRadius:3,background:c.done?T.grn:T.surface,border:`1.5px solid ${c.done?T.grn:T.b2}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  {c.done&&<svg width={8} height={8} viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth={2.5}><path d="M2 5l2.5 2.5L8 3"/></svg>}
                                </div>
                                <span style={{fontSize:12,color:c.done?T.t4:T.t1,textDecoration:c.done?"line-through":"none"}}>{c.text||c.t||"Item"}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {/* Ping button — only when there's an assignee. Backend
                          gates pinger==assignee and silently no-ops. */}
                      {todo.assigneeId&&(
                        <button onClick={(e)=>{e.stopPropagation();handlePing(todo);}}
                          disabled={pinging===todo.id}
                          style={{padding:"5px 10px",borderRadius:6,border:"none",background:T.amb,color:"white",fontSize:11,fontWeight:700,cursor:pinging===todo.id?"wait":"pointer",display:"inline-flex",alignItems:"center",gap:4,opacity:pinging===todo.id?0.7:1}}>
                          <span>{pinging===todo.id?"Pinging…":"Ping"}</span>
                          {pinging!==todo.id&&<span>🔔</span>}
                        </button>
                      )}
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
  const todayStr = localYMD();
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
  const TYPE_LABELS = { company:"Company Workers", subcon:"Subcontractor", vendor:"Labour Vendor" };
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
    return localYMD(d);
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
        apiCache.refreshApprovals();  // pre-warm badge
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
              Add Worker
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
                  No {TYPE_LABELS[labType]} registered yet.<br/>Click <b>"+ Add Worker"</b> above to register workforce for this project.
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

  // Current logged-in user (for owner-only delete on used entries)
  const meUser = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const meId = Number(meUser?.id) || null;
  const meIsPriv = ["admin","super_admin","project_manager"].includes((meUser?.role || "").toLowerCase());
  const canDeleteUsed = (createdById) => meIsPriv || (createdById != null && Number(createdById) === meId);

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
  const mrSubmitRef = useRef(false);
  // Multi-item MR — each row is a separate material+qty+amount.
  // required_date / notes / photos are shared across the whole batch.
  const [form, setForm] = useState({
    items: [{ item_name:"", quantity:"", unit:"Bags", approx_amount:"" }],
    required_date:"", notes:"", photos: [],
  });
  // Duplicate-MR pipeline check — when user picks a material, query if the
  // same item is already in-flight for THIS project (Pending / Approved /
  // Ordered / Partial). Warning UI sits under the row; submit requires an
  // explicit force-confirm if hits exist.
  const [mrPipelineByIdx, setMrPipelineByIdx] = useState({});
  const checkMrPipeline = async (idx, matName) => {
    if (!matName) {
      setMrPipelineByIdx(p => { const n = {...p}; delete n[idx]; return n; });
      return;
    }
    try {
      const r = await api.get(`/warehouse/mr-pipeline-check?type=project&project_id=${projectId}&name=${encodeURIComponent(matName)}`);
      if (r?.success && r.data?.in_pipeline) setMrPipelineByIdx(p => ({...p,[idx]:r.data}));
      else setMrPipelineByIdx(p => { const n = {...p}; delete n[idx]; return n; });
    } catch (_) {}
  };
  const [showAddLib, setShowAddLib] = useState(false);
  const [libNewName, setLibNewName] = useState("");
  const [libNewUnit, setLibNewUnit] = useState("Nos");
  const [libSaving, setLibSaving] = useState(false);
  // Auto-focus the LibrarySelect on the freshly-added row so user can
  // start typing the next material name without reaching for the mouse.
  const itemRowRefs = useRef([]);
  const addItemRow = () => {
    setForm(p => {
      const next = [...p.items, { item_name:"", quantity:"", unit:"Bags", approx_amount:"" }];
      setTimeout(() => {
        const el = itemRowRefs.current[next.length - 1];
        if (el && typeof el.focus === "function") el.focus();
      }, 0);
      return { ...p, items: next };
    });
  };
  const removeItemRow = (idx) => setForm(p => ({ ...p, items: p.items.length > 1 ? p.items.filter((_,i)=>i!==idx) : p.items }));
  const updItem = (idx, patch) => setForm(p => ({ ...p, items: p.items.map((it,i)=> i===idx ? { ...it, ...patch } : it) }));
  const saveLibMaterial = async () => {
    const name = (libNewName||"").trim();
    if (!name) return;
    setLibSaving(true);
    try {
      const r = await api.post("/library/materials", { name, unit: libNewUnit || "Nos" });
      if (r?.success) {
        const m = r.data || { id: Date.now(), name, unit: libNewUnit };
        setMatLibReal(prev => [...prev, m].sort((a,b)=>(a.name||"").localeCompare(b.name||"")));
        setLibNewName("");
        setLibNewUnit("Nos");
        setShowAddLib(false);
      } else {
        window.alert(r?.message || "Failed to add to library");
      }
    } catch (e) { window.alert(e?.message || "Network error"); }
    setLibSaving(false);
  };
  const [grnTab, setGrnTab] = useState("ordered");
  const [orderedMRs, setOrderedMRs] = useState([]);
  const [grnRows, setGrnRows] = useState({});
  // Vendor-grouped receive — shared challan/date/received_by per vendor
  // card so user enters them ONCE per delivery instead of per material.
  // Shape: { [vendor_name]: { challan, date, received_by } }
  const [vendorReceive, setVendorReceive] = useState({});
  // Direct Receive — vendor + challan + date moved to global (one per
  // submission) since a single delivery is always from ONE vendor.
  const [directGlobal, setDirectGlobal] = useState({ vendor: "", challan: "", date: new Date().toLocaleDateString('en-CA'), received_by: "" });
  const [directRows, setDirectRows] = useState([{id:1, item_name:"", qty:"", unit:"Bags", vendor:"", challan:"", received_by:""}]);
  const [grnPhotos, setGrnPhotos] = useState([]);
  // Company-level GRN photo policy — true = at least one photo mandatory
  const [grnPhotoRequired, setGrnPhotoRequired] = useState(false);
  useEffect(() => {
    api.get("/settings/company").then(r => {
      if (r?.success && r.data) setGrnPhotoRequired(Number(r.data.grn_photo_required) === 1);
    }).catch(() => {});
  }, []);
  // (Add-new-vendor flow now handled inside <LibrarySelect type="supplier"/>)
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
  // Material Inventory accordion — per-material row filter + inline Mark-Used
  const [ledgerRowFilter, setLedgerRowFilter] = useState("all"); // all | grn | used
  const [ledgerMarkUsedFor, setLedgerMarkUsedFor] = useState(null); // material_name being marked-used
  // Material clicked → opens the side ledger drawer (GRN / Used / MR tabs)
  const [ledgerDrawerMat, setLedgerDrawerMat] = useState(null);
  const [ledgerSearch, setLedgerSearch] = useState("");
  // Flow drawer state — opens when user clicks a GRN row in Material Ledger
  const [flowGrnId, setFlowGrnId] = useState(null);
  const [flowEditMR, setFlowEditMR] = useState(null);
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

      // Build a set of all MR material names BEFORE building direct entries.
      // We use it to decide whether a GRN is *truly* direct (= walk-in receipt
      // with no MR ever filed for it) vs a procurement-flow receipt that just
      // happens to be saved without po_id / linked_mr_id.
      const norm = s => (s || "").toString().trim().toLowerCase();
      const allMrMaterials = new Set(mrEntries.map(m => norm(m.name)));

      // GRNs without PO/MR link → either Direct receipts OR Auto-Bill (synthesized
       // when finance team added an extra material row inside a bill). Both should
       // surface in the Requests view as Received items, with different badges so
       // the user can tell where a material came from.
      const directEntries = [];
      if (grnRes.success && Array.isArray(grnRes.data)) {
        grnRes.data
          .filter(g => !g.po_id && !g.linked_mr_id)
          .forEach(g => {
            (g.items || []).forEach((item, i) => {
              const matName = item.description || item.item_name || "Material";
              const hasMatchingMr = allMrMaterials.has(norm(matName));
              const isAutoBill = g.grn_type === "Auto-Bill";
              directEntries.push({
                id: (isAutoBill ? "ab-" : "d-") + g.id + "-" + i,
                name: matName,
                qty: (Number.isInteger(Number(item.received_qty)) ? Number(item.received_qty) : parseFloat(item.received_qty||0)) + " " + (item.unit || ""),
                stage: "Received",
                by: g.received_by || (isAutoBill ? "Finance" : "Site"),
                date: g.received_date ? new Date(g.received_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) : "—",
                vendor: g.vendor_name || null,
                amt: 0,
                // "Direct" badge: only when NO MR exists for this material AND not an Auto-Bill.
                // Auto-Bill rows get a separate "via Bill" badge below.
                isDirect: !hasMatchingMr && !isAutoBill,
                isViaBill: isAutoBill,
                challan: g.challan_no,
                grn_number: g.grn_number,
                _autoBillGrnId: isAutoBill ? g.id : null,
              });
            });
          });
      }

      // Dedupe: if a Direct GRN exists for the same material (case-insensitive)
      // AND an MR for the same material is sitting in "Received" status, drop
      // the MR card. The GRN card represents the actual receipt — keeping both
      // makes it look like the same delivery happened twice (user reported
      // Distemper showing twice while Inventory was correct).
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

  // Project switch — TabMaterial does NOT re-mount, it just gets a new
  // `project` prop, so all material state stays stale. Wipe it whenever
  // projectId changes so the load effect below re-fetches for the new
  // project instead of showing the previous one's ledger.
  useEffect(() => {
    setLedger([]); setLedgerLoaded(false); setLedgerLoading(false);
    setInventory([]); setInvLoaded(false); setInvLoading(false);
    setExpandedMat(null); setLedgerDrawerMat(null);
    setLedgerSearch(""); setLedgerVendor("All");
  }, [projectId]);

  // Load ledger on tab switch / project switch. projectId + the loaded
  // flags are in the deps so a freshly-reset state (after project switch)
  // triggers a re-fetch.
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
  }, [activeTab, projectId, ledgerLoaded, invLoaded]);

  // Pending incoming transfers TO this project (warehouse → site receive flow)
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [trReceiveDone, setTrReceiveDone] = useState([]);
  const [trReceiveQty, setTrReceiveQty] = useState({});
  const [trReceiving, setTrReceiving] = useState(false);
  // Pending issues from warehouse TO this project
  const [pendingIssues, setPendingIssues] = useState([]);
  const [issueReceiveDone, setIssueReceiveDone] = useState([]);
  const [issueReceiveQty, setIssueReceiveQty] = useState({});
  const [issueReceiving, setIssueReceiving] = useState(false);

  const loadPendingTransfers = useCallback(() => {
    if (!projectId) return;
    api.get(`/warehouse/transfers?status=Pending&to_project_id=${projectId}`).then(r => {
      if (r.success) setPendingTransfers(r.data || []);
    }).catch(()=>{});
    api.get(`/warehouse/transfers?status=Partial&to_project_id=${projectId}`).then(r => {
      if (r.success) setPendingTransfers(prev => {
        const ids = new Set(prev.map(t=>t.id));
        return [...prev, ...(r.data||[]).filter(t=>!ids.has(t.id))];
      });
    }).catch(()=>{});
  }, [projectId]);

  const loadPendingIssues = useCallback(() => {
    if (!projectId) return;
    api.get(`/warehouse/issues?status=Pending&project_id=${projectId}`).then(r => {
      if (r.success) setPendingIssues(r.data || []);
    }).catch(()=>{});
    api.get(`/warehouse/issues?status=Partial&project_id=${projectId}`).then(r => {
      if (r.success) setPendingIssues(prev => {
        const ids = new Set(prev.map(i=>i.id));
        return [...prev, ...(r.data||[]).filter(i=>!ids.has(i.id))];
      });
    }).catch(()=>{});
  }, [projectId]);

  useEffect(() => {
    if (!showGRN || !projectId) return;
    // Fetch both fully-Ordered AND PartialReceived MRs — both still need more material
    Promise.all([
      api.get("/procurement/mrs?project_id=" + projectId + "&stage=Ordered"),
      api.get("/procurement/mrs?project_id=" + projectId + "&mat_status=PartialReceived"),
    ]).then(([r1, r2]) => {
      const m1 = r1?.success  ? (r1.data||[]) : [];
      const m2 = r2?.success  ? (r2.data||[]) : [];
      const seen = new Set();
      setOrderedMRs([...m1, ...m2].filter(m => { if(seen.has(m.id)) return false; seen.add(m.id); return true; }));
    }).catch(()=>{});
    loadPendingTransfers();
    loadPendingIssues();
    setTrReceiveDone([]);
    setTrReceiveQty({});
    setIssueReceiveDone([]);
    setIssueReceiveQty({});
  }, [showGRN, projectId, loadPendingTransfers, loadPendingIssues]);

  const handleReceiveTransfer = async (tr) => {
    if (grnPhotoRequired && grnPhotos.length === 0) {
      alert("Company policy: GRN ke saath kam se kam ek photo attach karo (challan / material).");
      return;
    }
    setTrReceiving(true);
    try {
      const items = (tr.items || []).map(it => ({
        id: it.id,
        received_qty: Number(trReceiveQty[`${tr.id}_${it.id}`] ?? it.qty) || 0,
      }));
      const res = await api.post(`/warehouse/transfers/${tr.id}/receive`, { items, photo_urls: grnPhotos.length ? grnPhotos : null });
      if (res.success) {
        setTrReceiveDone(p => [...p, tr.id]);
        api.get("/tasks/project/" + projectId + "/material-ledger").then(r => {
          if (r.success) { setLedger(r.data || []); setLedgerLoaded(true); }
        }).catch(()=>{});
      } else {
        alert(res.message || "Receive failed");
      }
    } catch (e) { alert(e.message); }
    setTrReceiving(false);
  };

  const handleReceiveIssue = async (iss) => {
    if (grnPhotoRequired && grnPhotos.length === 0) {
      alert("Company policy: GRN ke saath kam se kam ek photo attach karo (challan / material).");
      return;
    }
    setIssueReceiving(true);
    try {
      const items = (iss.items || []).map(it => ({
        id: it.id,
        received_qty: Number(issueReceiveQty[`${iss.id}_${it.id}`] ?? it.qty) || 0,
      }));
      const res = await api.post(`/warehouse/issues/${iss.id}/receive`, { items, photo_urls: grnPhotos.length ? grnPhotos : null });
      if (res.success) {
        setIssueReceiveDone(p => [...p, iss.id]);
        api.get("/tasks/project/" + projectId + "/material-ledger").then(r => {
          if (r.success) { setLedger(r.data || []); setLedgerLoaded(true); }
        }).catch(()=>{});
      } else {
        alert(res.message || "Receive failed");
      }
    } catch (e) { alert(e.message); }
    setIssueReceiving(false);
  };

  // GRN handlers
  const handleReceiveMR = async (mrId) => {
    const row = grnRows[mrId] || {};
    if (!row.challan) { alert("Challan number required"); return; }
    if (grnPhotoRequired && grnPhotos.length === 0) {
      alert("Company policy: GRN ke saath kam se kam ek photo attach karo (challan / material).");
      return;
    }
    setGrnSaving(true);
    try {
      const mr = orderedMRs.find(m => m.id === mrId);
      const res = await api.patch("/procurement/mrs/" + mrId + "/mark-received", {
        challan_no: row.challan,
        received_qty: parseFloat(row.received_qty) || parseFloat(mr?.quantity) || 0,
        photo_urls: grnPhotos.length ? grnPhotos : null,
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

  // Vendor-grouped receive — one delivery from a vendor can carry multiple
  // MRs (TMT 12mm + 8mm + 10mm in one truck). Loops mark-received per MR
  // with the shared challan + date so the user only enters info once.
  // Skips rows where received_qty is 0/blank → those stay pending for
  // the next delivery.
  const handleReceiveVendor = async (vendor) => {
    const meta = vendorReceive[vendor] || {};
    if (!meta.challan || !meta.challan.trim()) { alert("Challan number required"); return; }
    if (grnPhotoRequired && grnPhotos.length === 0) {
      alert("Company policy: GRN ke saath kam se kam ek photo attach karo (challan / material).");
      return;
    }
    const targetMRs = orderedMRs.filter(mr =>
      (mr.linked_vendor || "— Unassigned —") === vendor &&
      !grnDone.includes(mr.id) &&
      Number((grnRows[mr.id] || {}).received_qty || 0) > 0
    );
    if (targetMRs.length === 0) { alert("Kam se kam ek material ka received qty fill karo"); return; }
    setGrnSaving(true);
    let okCount = 0, failures = [];
    for (const mr of targetMRs) {
      const recvQty = parseFloat((grnRows[mr.id] || {}).received_qty) || 0;
      try {
        const res = await api.patch("/procurement/mrs/" + mr.id + "/mark-received", {
          challan_no: meta.challan,
          received_qty: recvQty,
          received_date: meta.date || new Date().toLocaleDateString('en-CA'),
          received_by: meta.received_by || meUser?.name || undefined,
          photo_urls: grnPhotos.length ? grnPhotos : null,
        });
        if (res.success) { setGrnDone(p => [...p, mr.id]); okCount += 1; }
        else failures.push(`${mr.item_name}: ${res.message||"failed"}`);
      } catch (e) { failures.push(`${mr.item_name}: ${e.message}`); }
    }
    // Single reload after the whole vendor batch
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
    setGrnSaving(false);
    if (failures.length > 0) {
      alert(`Received ${okCount}/${targetMRs.length}. Errors:\n${failures.join("\n")}`);
    }
  };

  const handleDirectReceive = async () => {
    // Global vendor/challan/date — Direct Receive is single-vendor.
    if (!directGlobal.vendor) { alert("Vendor select karo"); return; }
    if (!directGlobal.challan) { alert("Challan number daalo"); return; }
    const validRows = directRows.filter(r => r.item_name && Number(r.qty) > 0);
    if (!validRows.length) { alert("Kam se kam ek material + qty required hai"); return; }
    if (grnPhotoRequired && grnPhotos.length === 0) {
      alert("Company policy: GRN ke saath kam se kam ek photo attach karo (challan / material).");
      return;
    }
    setGrnSaving(true);
    try {
      const res = await api.post("/procurement/grns", {
        po_id: null,
        vendor_name: directGlobal.vendor,
        project_id: projectId,
        project_name: projectName,
        challan_no: directGlobal.challan,
        received_by: directGlobal.received_by || meUser?.name || null,
        received_date: directGlobal.date || new Date().toISOString().split("T")[0],
        photo_urls: grnPhotos.length ? grnPhotos : null,
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
        setDirectRows([{id:1, item_name:"", qty:"", unit:"Bags"}]);
        setDirectGlobal({vendor:"", challan:"", date: new Date().toLocaleDateString('en-CA'), received_by:""});
        setGrnPhotos([]);
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
    if (mrSubmitRef.current) return; // hard guard against double-fire
    // Validate at least one filled row
    const validItems = (form.items || []).filter(it => it.item_name?.trim() && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      alert("At least one material with quantity is required");
      return;
    }
    // Pipeline-duplicate force confirm — if any picked material is
    // already in-flight for this project, list them and require an
    // explicit Continue. Cancel = abort.
    const pipeHits = Object.values(mrPipelineByIdx).filter(p => p && p.in_pipeline);
    if (pipeHits.length > 0) {
      const lines = pipeHits.flatMap(h => h.entries.map(e => `  • ${e.mr_no} — ${e.status} — ${e.pending_qty} ${e.unit||""}`));
      const ok = window.confirm(
        `⚠ Iss project me ye material(s) already pipeline me hai:\n\n${lines.join("\n")}\n\nFir bhi naya MR raise karna hai? (Continue = force, Cancel = wait)`
      );
      if (!ok) return;
    }
    mrSubmitRef.current = true;
    setSaving(true);
    try {
      // Each row creates its own MR. Sequential so we get a stable order
      // and a single rejection doesn't lose the rest.
      const newMaterialRows = [];
      for (const it of validItems) {
        const res = await api.post("/procurement/mrs", {
          project_id: projectId, project_name: projectName,
          item_name: it.item_name.trim(),
          quantity: parseFloat(it.quantity),
          unit: it.unit || "Nos",
          required_date: form.required_date || null,
          approx_amount: it.approx_amount ? parseFloat(it.approx_amount) : null,
          notes: form.notes || null,
          photo_urls: form.photos && form.photos.length ? form.photos : null,
        });
        if (res?.success) {
          api.post("/approvals/submit", {
            module: "Material Request",
            ref_id: res.data.id,
            ref_no: res.data.mr_number || "",
            title: it.item_name + " (" + it.quantity + " " + (it.unit||"Nos") + ")",
            amount: Number(it.approx_amount) || 0,
            project_id: projectId,
            project_name: projectName || "",
          }).catch(e => console.error("Approval submit:", e));
          const m = res.data;
          newMaterialRows.push({
            id:m.id, name:m.item_name, qty:m.quantity+" "+m.unit,
            stage:"Requested", by: m.requested_by || "—",
            date:new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
            vendor:null, amt:parseFloat(m.approx_amount)||0,
          });
        }
      }
      if (newMaterialRows.length > 0) {
        setMaterials(prev => [...newMaterialRows, ...prev]);
        setForm({
          items: [{ item_name:"", quantity:"", unit:"Bags", approx_amount:"" }],
          required_date:"", notes:"", photos: [],
        });
        setShowModal(false);
        // One refresh after the whole batch — pre-warm the badge once.
        apiCache.refreshApprovals();
      }
    } catch(e) { alert("Error: " + e.message); }
    finally { setSaving(false); mrSubmitRef.current = false; }
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

  // Inventory tab merged into Material Inventory — the ledger accordion
  // already shows per-material Received/Used/Balance + GRN/Used entries,
  // plus an inline Mark-Used form. Separate Inventory tab dropped.
  const TABS = [{id:"requests",l:"Requests"},{id:"ledger",l:"Material Inventory"},{id:"transfer",l:"Transfer"}];

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

        {/* NEW REQUEST — side-slide drawer */}
        {showModal && (<>
          <style>{`@keyframes mrSlideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
          <div onClick={()=>setShowModal(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.42)",zIndex:400,backdropFilter:"blur(3px)"}}/>
          <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(560px,96vw)",background:T.bg,zIndex:401,boxShadow:"-8px 0 40px rgba(0,0,0,0.22)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"mrSlideIn .22s ease-out"}}>

            {/* ── Header ─────────────────────────────────────────── */}
            <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:"white",letterSpacing:"-.2px"}}>📦 New Material Request</div>
                <div style={{fontSize:10.5,color:"rgba(255,255,255,0.42)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{projectName}</div>
              </div>
              <button onClick={()=>setShowAddLib(s=>!s)}
                style={{padding:"5px 11px",borderRadius:6,background:showAddLib?"rgba(168,85,247,0.35)":"rgba(168,85,247,0.15)",border:"1px solid rgba(168,85,247,0.55)",color:"#C4B5FD",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all .15s",flexShrink:0,whiteSpace:"nowrap"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(168,85,247,0.3)"}
                onMouseLeave={e=>e.currentTarget.style.background=showAddLib?"rgba(168,85,247,0.35)":"rgba(168,85,247,0.15)"}>
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                {showAddLib ? "Cancel" : "+ Library"}
              </button>
              <button onClick={()=>setShowModal(false)}
                style={{width:28,height:28,borderRadius:6,background:"rgba(255,255,255,0.08)",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.2)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}>
                ×
              </button>
            </div>

            {/* ── Workflow info strip ─────────────────────────────── */}
            <div style={{padding:"8px 18px",background:"#FFFBEB",borderBottom:"1px solid #FDE68A",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <span style={{fontSize:13}}>📋</span>
              <span style={{fontSize:11.5,color:"#92400E",lineHeight:1.4}}>Request → Admin approves → Purchase Order → Received at site</span>
            </div>

            {/* ── Scrollable body ─────────────────────────────────── */}
            <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:14}}>

              {/* Add-to-library inline form */}
              {showAddLib && (
                <div style={{padding:"12px 14px",background:T.purL,border:`1.5px solid ${T.purM}`,borderRadius:9}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.pur,marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.pur} strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    Add new material to Library
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 100px 76px",gap:8,alignItems:"center"}}>
                    <input value={libNewName} onChange={e=>setLibNewName(e.target.value)} placeholder="Material name *" autoFocus
                      style={{padding:"8px 10px",borderRadius:6,border:`1.5px solid ${T.purM}`,fontSize:12.5,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                    <select value={libNewUnit} onChange={e=>setLibNewUnit(e.target.value)}
                      style={{padding:"8px 9px",borderRadius:6,border:`1.5px solid ${T.purM}`,fontSize:12,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box",cursor:"pointer"}}>
                      <option value="">Unit</option>
                      {UNITS_MR.map(u=><option key={u}>{u}</option>)}
                    </select>
                    <button onClick={saveLibMaterial} disabled={!libNewName.trim()||libSaving}
                      style={{padding:"8px 0",borderRadius:6,background:libNewName.trim()?T.pur:T.b1,color:libNewName.trim()?"white":T.t4,border:"none",fontSize:12,fontWeight:700,cursor:libNewName.trim()?"pointer":"not-allowed",fontFamily:"inherit"}}>
                      {libSaving?"…":"Save"}
                    </button>
                  </div>
                  <div style={{fontSize:10,color:T.pur,marginTop:6,opacity:.72}}>Save hone ke baad item rows mein immediately available hoga.</div>
                </div>
              )}

              {/* ── Items table ──────────────────────────────────── */}
              <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
                {/* Table header bar */}
                <div style={{background:"#0D1B2A",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:12,fontWeight:700,color:"white"}}>Items</span>
                    <span style={{fontSize:10,color:"rgba(255,255,255,0.38)"}}>Library se pick karein · unit auto-locked</span>
                  </div>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600,flexShrink:0}}>
                    {form.items.filter(it=>it.item_name?.trim()).length}/{form.items.length} filled
                  </span>
                </div>
                {/* Column labels */}
                <div style={{display:"grid",gridTemplateColumns:"2.2fr 72px 88px 88px 30px",gap:6,padding:"7px 14px",background:"#1B2A3A"}}>
                  {["Material","Qty","Unit","Approx ₹",""].map((h,i)=>(
                    <span key={i} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".5px"}}>{h}</span>
                  ))}
                </div>
                {/* Item rows */}
                {form.items.map((it,idx)=>{
                  const libMatch = matLibReal.find(m => (m.name||"").trim().toLowerCase() === (it.item_name||"").trim().toLowerCase());
                  const isLocked = !!it.item_name;
                  const displayUnit = libMatch?.unit || it.unit || "—";
                  const pipe = mrPipelineByIdx[idx];
                  return (
                    <React.Fragment key={idx}>
                      <div style={{display:"grid",gridTemplateColumns:"2.2fr 72px 88px 88px 30px",gap:6,padding:"8px 14px",alignItems:"center",borderBottom:`1px solid ${T.b1}`,background:idx%2===0?T.surface:T.surfaceB,transition:"background .1s"}}>
                        <LibrarySelect type="material" value={it.item_name}
                          hideAddNew compact
                          inputRef={el=>{ if(el) itemRowRefs.current[idx] = el; }}
                          onChange={v=>{
                            const found = matLibReal.find(m=>m.name===v);
                            updItem(idx, { item_name:v||"", unit: found?.unit || it.unit });
                            checkMrPipeline(idx, v||"");
                          }}
                          placeholder="Pick material..."/>
                        <input type="number" inputMode="decimal" min={0} step="any" value={it.quantity}
                          onKeyDown={e=>{if(e.key==="-"||e.key==="e"||e.key==="E"||e.key==="+") e.preventDefault();}}
                          onChange={e=>{
                            const v=e.target.value;
                            if(v===""){updItem(idx,{quantity:""});return;}
                            const n=parseFloat(v);
                            if(!isNaN(n)&&n>=0) updItem(idx,{quantity:v});
                          }}
                          placeholder="0"
                          style={{padding:"7px 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",textAlign:"right",width:"100%"}}
                          onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                        {isLocked ? (
                          <div title="Unit Material Library se aata hai"
                            style={{padding:"7px 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t2,background:"#F5F7FA",fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:4,justifyContent:"center",cursor:"not-allowed",boxSizing:"border-box"}}>
                            <span style={{fontSize:9,opacity:.5}}>🔒</span>{displayUnit}
                          </div>
                        ) : (
                          <select value={it.unit} onChange={e=>updItem(idx,{unit:e.target.value})}
                            style={{padding:"7px 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer",width:"100%"}}>
                            {UNITS_MR.map(u=><option key={u}>{u}</option>)}
                          </select>
                        )}
                        <input type="number" value={it.approx_amount} onChange={e=>updItem(idx,{approx_amount:e.target.value})} placeholder="0"
                          style={{padding:"7px 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",width:"100%"}}
                          onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                        <button onClick={()=>{removeItemRow(idx); setMrPipelineByIdx(p=>{const n={...p};delete n[idx];return n;});}} disabled={form.items.length===1}
                          style={{width:26,height:26,borderRadius:6,background:form.items.length===1?"transparent":T.redL,border:`1px solid ${form.items.length===1?T.b1:T.redM}`,cursor:form.items.length===1?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:form.items.length===1?.3:1,flexShrink:0}}>
                          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth={2.4} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                      {pipe && pipe.in_pipeline && (
                        <div style={{margin:"2px 14px 8px",padding:"7px 11px",borderRadius:6,background:"#FFFBEB",border:`1.5px solid #FDE68A`,fontSize:11,color:"#92400E",lineHeight:1.5}}>
                          <div style={{fontWeight:700,marginBottom:3}}>⚠ Already in pipeline · Pending: <b>{pipe.total_pending_qty} {pipe.unit||""}</b></div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {pipe.entries.map((e,k)=>(
                              <span key={k} style={{background:"white",border:`1px solid #FDE68A`,borderRadius:20,padding:"2px 8px",fontSize:10.5,color:T.t2}}>
                                <span style={{color:T.blu,fontFamily:"monospace"}}>{e.mr_no}</span>
                                <span style={{color:T.t4,margin:"0 3px"}}>·</span>{e.status}
                                <span style={{color:T.t4,margin:"0 3px"}}>·</span><b>{e.pending_qty} {e.unit||""}</b>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
                {/* Add row button */}
                <div style={{padding:"8px 14px",background:T.surfaceB,borderTop:`1px solid ${T.b1}`}}>
                  <button onClick={addItemRow}
                    style={{width:"100%",padding:"8px 12px",borderRadius:7,background:"transparent",border:`1.5px dashed ${T.blu}44`,color:T.blu,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .12s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=T.bluL;e.currentTarget.style.borderColor=T.blu;}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=`${T.blu}44`;}}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    Add another item
                  </button>
                </div>
              </div>

              {/* Required By + Notes — side by side */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>
                    Required By <span style={{fontSize:9,fontWeight:500,textTransform:"none",color:T.t4}}>(all items)</span>
                  </label>
                  <input type="date" value={form.required_date} onChange={e=>setForm(p=>({...p,required_date:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>Notes</label>
                  <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={1} placeholder="Special requirements…"
                    style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none",minHeight:38}}/>
                </div>
              </div>

              {/* Photos */}
              <div>
                <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:7}}>
                  Photos <span style={{fontSize:9,fontWeight:500,textTransform:"none"}}>(optional)</span>
                </label>
                <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
                  {(form.photos||[]).map((url,idx)=>(
                    <div key={idx} style={{position:"relative",width:60,height:60,borderRadius:7,overflow:"hidden",border:`1px solid ${T.b1}`}}>
                      <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      <button onClick={()=>setForm(p=>({...p,photos:(p.photos||[]).filter((_,i)=>i!==idx)}))}
                        style={{position:"absolute",top:2,right:2,width:16,height:16,borderRadius:"50%",background:"rgba(0,0,0,0.65)",color:"white",border:"none",fontSize:10,cursor:"pointer",padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                    </div>
                  ))}
                  <label style={{width:60,height:60,borderRadius:7,border:`1.5px dashed ${T.b2}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexDirection:"column",gap:2,color:T.t3}}>
                    <span style={{fontSize:18}}>📷</span>
                    <span style={{fontSize:10,fontWeight:600}}>Add</span>
                    <input type="file" accept="image/*" capture="environment" multiple style={{display:"none"}}
                      onChange={e=>{
                        const files = Array.from(e.target.files||[]);
                        files.forEach(file=>{
                          uploadManager.add({
                            file, folder:"gb_buildcon/mr",
                            label:"MR photo: "+file.name,
                            onDone:(url)=>setForm(p=>({...p,photos:[...(p.photos||[]),url]})),
                          });
                        });
                        e.target.value="";
                      }}/>
                  </label>
                  <span style={{fontSize:10,color:T.t4}}>Camera opens on mobile · multi-select ok</span>
                </div>{/* end photos flex row */}
              </div>{/* end photos section */}

            </div>{/* end scrollable body */}

            {/* ── Sticky footer ──────────────────────────────────── */}
            <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
              {(()=>{
                const validCount = (form.items||[]).filter(it => it.item_name?.trim() && Number(it.quantity) > 0).length;
                const canSubmit = !saving && validCount > 0;
                return (<>
                  <button onClick={()=>setShowModal(false)}
                    style={{padding:"9px 18px",borderRadius:8,background:"white",border:`1.5px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer",flexShrink:0}}>
                    Cancel
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    {validCount > 0
                      ? <div style={{fontSize:10.5,color:T.blu,fontWeight:600}}>{validCount} item{validCount!==1?"s":""} ready · {(form.items||[]).filter(it=>!it.item_name?.trim()).length > 0 && <span style={{color:T.t4,fontWeight:400}}>unfilled rows will be skipped</span>}</div>
                      : <div style={{fontSize:10.5,color:T.t4}}>Pick at least one item to submit</div>
                    }
                  </div>
                  <button onClick={handleSubmitMR} disabled={!canSubmit}
                    style={{padding:"9px 22px",borderRadius:8,background:canSubmit?"#0D1B2A":"#CBD5E1",color:"white",border:"none",fontSize:12.5,fontWeight:700,cursor:canSubmit?"pointer":"not-allowed",transition:"all .15s",flexShrink:0,minWidth:150}}>
                    {saving ? "Submitting…" : canSubmit ? `Submit${validCount>1?" "+validCount+" Requests":" Request"}` : "Select items first"}
                  </button>
                </>);
              })()}
            </div>

          </div>{/* end drawer */}
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
                    <div style={{display:"grid",gridTemplateColumns:"85px 1fr 75px 90px 1fr 32px",background:"#1E293B",padding:"7px 16px",gap:8}}>
                      {["Date","Material","Qty","Used By","Remark/Task",""].map((h,hi)=>(
                        <div key={hi} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:".4px"}}>{h}</div>
                      ))}
                    </div>
                    {filtered.map((u,i)=>{
                      const showDel = u.id && u.task_id && canDeleteUsed(u.created_by_id ?? u.created_by);
                      return (
                      <div key={u.id||i} style={{display:"grid",gridTemplateColumns:"85px 1fr 75px 90px 1fr 32px",padding:"9px 16px",gap:8,borderBottom:"1px solid "+T.b1,alignItems:"center",background:i%2===0?T.surface:"white"}}>
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
                        <div style={{display:"flex",justifyContent:"center"}}>
                          {showDel?(
                            <button title="Delete this usage entry"
                              onClick={async()=>{
                                if(!window.confirm("Is used entry ko delete kar dein? ("+u.used_qty+" "+(u.unit||"")+")")) return;
                                const r=await api.del("/tasks/"+u.task_id+"/used-log/"+u.id);
                                if(r.success){
                                  setUsedLog(prev=>prev.filter(x=>x.id!==u.id));
                                  setLedgerLoaded(false);
                                } else {
                                  alert(r.message||"Delete fail ho gaya");
                                }
                              }}
                              style={{background:"none",border:"none",cursor:"pointer",padding:4,borderRadius:4,color:T.red,display:"flex",alignItems:"center",justifyContent:"center"}}
                              onMouseEnter={e=>e.currentTarget.style.background=T.redL}
                              onMouseLeave={e=>e.currentTarget.style.background="none"}>
                              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/></svg>
                            </button>
                          ):null}
                        </div>
                      </div>
                      );
                    })}
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
          <style>{`@keyframes grnSlideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
          <div onClick={()=>setShowGRN(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(3px)"}}/>
          <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(640px,96vw)",background:T.bg,zIndex:401,boxShadow:"-8px 0 40px rgba(0,0,0,0.22)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"grnSlideIn .22s ease-out"}}>

            {/* Header */}
            <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:"white",letterSpacing:"-.2px"}}>📥 Record GRN — Material Received</div>
                <div style={{fontSize:10.5,color:"rgba(255,255,255,0.42)",marginTop:2}}>{projectName}</div>
              </div>
              <button onClick={()=>setShowGRN(false)}
                style={{width:28,height:28,borderRadius:6,background:"rgba(255,255,255,0.08)",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.2)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}>
                ×
              </button>
            </div>

            {/* Tab bar */}
            <div style={{display:"flex",background:"#111E2C",flexShrink:0}}>
              {[{id:"ordered",label:"Ordered Materials"},{id:"direct",label:"Direct Receive"}].map(t=>{
                const isActive=grnTab===t.id;
                const badge=t.id==="ordered"?(orderedMRs.length+pendingTransfers.length+pendingIssues.length):0;
                return(
                  <button key={t.id} onClick={()=>setGrnTab(t.id)}
                    style={{flex:1,padding:"11px 14px",border:"none",background:isActive?"#1E3048":"none",color:isActive?"white":"rgba(255,255,255,0.45)",fontSize:12.5,fontWeight:isActive?700:400,cursor:"pointer",borderBottom:isActive?"2px solid "+T.blu:"2px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .15s"}}>
                    {t.label}
                    {badge>0&&<span style={{background:T.amb,color:"white",fontSize:9,fontWeight:800,padding:"1px 7px",borderRadius:10,lineHeight:"16px"}}>{badge}</span>}
                  </button>
                );
              })}
            </div>

            {/* Scrollable body */}
            <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
              {grnTab==="ordered"&&(
                <div>
                  {/* ── PENDING ISSUES from Warehouse ──────────────────── */}
                  {pendingIssues.length>0&&(
                    <div style={{marginBottom:14}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 11px",background:T.ambL,border:"1px solid "+T.ambM,borderRadius:7,marginBottom:8}}>
                        <span style={{fontSize:14}}>📦</span>
                        <span style={{fontSize:11.5,fontWeight:700,color:T.amb}}>Issues from Warehouse — site team receive karega ({pendingIssues.length})</span>
                      </div>
                      {pendingIssues.map(iss=>{
                        const isDone=issueReceiveDone.includes(iss.id);
                        const totalQty=(iss.items||[]).reduce((s,it)=>s+Number(it.qty||0),0);
                        const totalValue=Number(iss.total_value||iss.total||0);
                        return(
                          <div key={iss.id} style={{background:isDone?T.grnL:T.surface,border:"1px solid "+(isDone?T.grnM:T.ambM),borderRadius:8,padding:"12px 14px",marginBottom:8,borderLeft:"3px solid "+(isDone?T.grn:T.amb)}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:isDone?0:10}}>
                              <div>
                                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                                  <span style={{fontSize:12,fontWeight:700,color:T.amb,fontFamily:"monospace"}}>{iss.issue_no}</span>
                                  <span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:T.ambL,color:T.amb,fontWeight:600,border:"1px solid "+T.ambM}}>Material In</span>
                                  {iss.status==="Partial"&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:600}}>Partial</span>}
                                </div>
                                <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>From: 🔒 Warehouse</div>
                                <div style={{fontSize:11,color:T.t4,marginTop:2}}>Qty: {totalQty.toFixed(2)} · Value: ₹{totalValue.toLocaleString("en-IN")} · issued to {iss.issued_to_name||"—"} · by {iss.issued_by_name||"—"}</div>
                              </div>
                              {isDone&&<span style={{fontSize:11,fontWeight:700,color:T.grn,background:T.grnL,padding:"3px 10px",borderRadius:20,border:"1px solid "+T.grnM}}>✓ Received</span>}
                            </div>
                            {!isDone&&(
                              <>
                                <div style={{background:T.surfaceB,borderRadius:7,padding:"8px 10px",marginBottom:9,border:"1px solid "+T.b1}}>
                                  <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>Items received</div>
                                  {(iss.items||[]).map(it=>{
                                    const key=`${iss.id}_${it.id}`;
                                    const recvVal=issueReceiveQty[key]??it.qty;
                                    const sent=Number(it.qty||0);
                                    const recv=Number(recvVal||0);
                                    const short=recv<sent;
                                    return(
                                      <div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 70px 90px 70px",gap:7,alignItems:"center",marginBottom:5}}>
                                        <div>
                                          <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{it.name||it.material_name}</div>
                                          <div style={{fontSize:10,color:T.t4}}>Sent: {sent.toFixed(2)} {it.unit}</div>
                                        </div>
                                        <div style={{fontSize:11,color:T.t4,textAlign:"right"}}>@ ₹{Number(it.rate||0).toLocaleString("en-IN")}</div>
                                        <input type="number" value={recvVal} max={sent}
                                          onChange={e=>setIssueReceiveQty(p=>({...p,[key]:e.target.value}))}
                                          style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+(short?T.amb:T.b1),fontSize:12,textAlign:"right",fontFamily:"inherit",outline:"none",background:short?T.ambL:T.surface,color:short?T.amb:T.t1}}/>
                                        <div style={{fontSize:10.5,color:T.t4,textAlign:"right"}}>{it.unit}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div style={{display:"flex",justifyContent:"flex-end"}}>
                                  <button onClick={()=>handleReceiveIssue(iss)} disabled={issueReceiving}
                                    style={{padding:"7px 16px",borderRadius:6,background:T.grn,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:issueReceiving?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:5}}>
                                    {issueReceiving?"...":"✓ Receive — GRN bana do"}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {(orderedMRs.length+pendingTransfers.length)>0&&<div style={{height:1,background:T.b1,margin:"14px 0 10px"}}/>}
                    </div>
                  )}
                  {/* ── INCOMING TRANSFERS (project-to-project) ────────── */}
                  {pendingTransfers.length>0&&(
                    <div style={{marginBottom:14}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 11px",background:T.cynL,border:"1px solid "+T.cynM,borderRadius:7,marginBottom:8}}>
                        <span style={{fontSize:14}}>🔄</span>
                        <span style={{fontSize:11.5,fontWeight:700,color:T.cyn}}>Incoming transfers — kisi aur project se aaya material ({pendingTransfers.length})</span>
                      </div>
                      {pendingTransfers.map(tr=>{
                        const isDone=trReceiveDone.includes(tr.id);
                        const totalQty=(tr.items||[]).reduce((s,it)=>s+Number(it.qty||0),0);
                        const totalValue=Number(tr.total_value||0);
                        return(
                          <div key={tr.id} style={{background:isDone?T.grnL:T.surface,border:"1px solid "+(isDone?T.grnM:T.cynM),borderRadius:8,padding:"12px 14px",marginBottom:8,borderLeft:"3px solid "+(isDone?T.grn:T.cyn)}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:isDone?0:10}}>
                              <div>
                                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                                  <span style={{fontSize:12,fontWeight:700,color:T.cyn,fontFamily:"monospace"}}>{tr.transfer_no}</span>
                                  <span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:T.cynL,color:T.cyn,fontWeight:600,border:"1px solid "+T.cynM}}>Transfer in</span>
                                  {tr.status==="Partial"&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:600}}>Partial</span>}
                                </div>
                                <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>From: {tr.from_project_name||tr.from_location||"—"}</div>
                                <div style={{fontSize:11,color:T.t4,marginTop:2}}>Qty: {totalQty.toFixed(2)} · Value: ₹{totalValue.toLocaleString("en-IN")} · by {tr.transferred_by_name||"—"}</div>
                              </div>
                              {isDone&&<span style={{fontSize:11,fontWeight:700,color:T.grn,background:T.grnL,padding:"3px 10px",borderRadius:20,border:"1px solid "+T.grnM}}>✓ Received</span>}
                            </div>
                            {!isDone&&(
                              <>
                                <div style={{background:T.surfaceB,borderRadius:7,padding:"8px 10px",marginBottom:9,border:"1px solid "+T.b1}}>
                                  <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>Items received</div>
                                  {(tr.items||[]).map(it=>{
                                    const key=`${tr.id}_${it.id}`;
                                    const recvVal=trReceiveQty[key]??it.qty;
                                    const sent=Number(it.qty||0);
                                    const recv=Number(recvVal||0);
                                    const short=recv<sent;
                                    return(
                                      <div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 70px 90px 70px",gap:7,alignItems:"center",marginBottom:5}}>
                                        <div>
                                          <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{it.material_name}</div>
                                          <div style={{fontSize:10,color:T.t4}}>Sent: {sent.toFixed(2)} {it.unit}</div>
                                        </div>
                                        <div style={{fontSize:11,color:T.t4,textAlign:"right"}}>@ ₹{Number(it.rate||0).toLocaleString("en-IN")}</div>
                                        <input type="number" value={recvVal} max={sent}
                                          onChange={e=>setTrReceiveQty(p=>({...p,[key]:e.target.value}))}
                                          style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+(short?T.amb:T.b1),fontSize:12,textAlign:"right",fontFamily:"inherit",outline:"none",background:short?T.ambL:T.surface,color:short?T.amb:T.t1}}/>
                                        <div style={{fontSize:10.5,color:T.t4,textAlign:"right"}}>{it.unit}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div style={{display:"flex",justifyContent:"flex-end"}}>
                                  <button onClick={()=>handleReceiveTransfer(tr)} disabled={trReceiving}
                                    style={{padding:"7px 16px",borderRadius:6,background:T.grn,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:trReceiving?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:5}}>
                                    {trReceiving?"...":"✓ Receive — GRN bana do"}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {orderedMRs.length>0&&<div style={{height:1,background:T.b1,margin:"14px 0 10px"}}/>}
                    </div>
                  )}
                  {orderedMRs.length===0&&pendingTransfers.length===0&&pendingIssues.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4}}><div style={{fontSize:13,fontWeight:600,color:T.t2,marginBottom:4}}>Koi ordered material, transfer, ya warehouse issue pending nahi</div></div>}
                  {/* Vendor-grouped receive — one delivery from a vendor
                      typically carries multiple materials (TMT 12mm + 8mm
                      + 10mm in one truck). Group by linked_vendor, share
                      challan + date inputs across all materials from same
                      vendor, single "Receive" button processes the batch. */}
                  {(() => {
                    // Group active (not-yet-done) MRs by linked_vendor
                    const groups = {};
                    orderedMRs.forEach(mr => {
                      if (grnDone.includes(mr.id)) return;
                      const v = mr.linked_vendor || "— Unassigned —";
                      if (!groups[v]) groups[v] = [];
                      groups[v].push(mr);
                    });
                    const vendorList = Object.keys(groups).sort();
                    const doneMRs = orderedMRs.filter(mr => grnDone.includes(mr.id));
                    return (
                      <>
                        {vendorList.map(vendor => {
                          const mrs = groups[vendor];
                          const meta = vendorReceive[vendor] || {};
                          const filledCount = mrs.filter(mr => Number((grnRows[mr.id]||{}).received_qty||0) > 0).length;
                          return (
                            <div key={vendor} style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,marginBottom:10,borderLeft:"3px solid "+T.blu,overflow:"hidden"}}>
                              {/* Vendor header */}
                              <div style={{padding:"10px 14px",background:T.bluL+"66",borderBottom:"1px solid "+T.b1,display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:14}}>🏭</span>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{vendor}</div>
                                  <div style={{fontSize:10.5,color:T.t4,marginTop:1}}>{mrs.length} pending material{mrs.length>1?"s":""}</div>
                                </div>
                                {filledCount>0&&<span style={{fontSize:10.5,fontWeight:700,color:T.grn,background:T.grnL,border:"1px solid "+T.grnM,padding:"2px 9px",borderRadius:20}}>{filledCount} qty filled</span>}
                              </div>
                              {/* Shared challan + date + received_by */}
                              <div style={{padding:"10px 14px",background:T.surfaceB,borderBottom:"1px solid "+T.b1,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                                <div>
                                  <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Challan No. *</label>
                                  <input value={meta.challan||""} onChange={e=>setVendorReceive(p=>({...p,[vendor]:{...p[vendor],challan:e.target.value}}))}
                                    placeholder="e.g. CH-445"
                                    style={{width:"100%",padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                                </div>
                                <div>
                                  <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Delivery Date</label>
                                  <input type="date" value={meta.date||new Date().toLocaleDateString('en-CA')} onChange={e=>setVendorReceive(p=>({...p,[vendor]:{...p[vendor],date:e.target.value}}))}
                                    style={{width:"100%",padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                                </div>
                                <div>
                                  <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Received By</label>
                                  <input
                                    value={meta.received_by !== undefined ? meta.received_by : (meUser?.name || "")}
                                    onChange={e=>setVendorReceive(p=>({...p,[vendor]:{...p[vendor],received_by:e.target.value}}))}
                                    placeholder={meUser?.name || "Site person"}
                                    title="Default: logged-in user. Override karne ke liye type karein."
                                    style={{width:"100%",padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                                </div>
                              </div>
                              {/* Per-material rows */}
                              <div style={{padding:"4px 14px 10px"}}>
                                <div style={{display:"grid",gridTemplateColumns:"100px 1fr 90px 110px 70px",gap:7,padding:"6px 0",fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px"}}>
                                  <span>MR No</span><span>Material</span><span style={{textAlign:"right"}}>Pending</span><span style={{textAlign:"right"}}>Receive Qty</span><span></span>
                                </div>
                                {mrs.map(mr => {
                                  const row = grnRows[mr.id] || {};
                                  const alreadyReceived = Number(mr.received_qty || 0);
                                  const orderedQty     = Number(mr.quantity || 0);
                                  const pendingQty     = Math.max(0, orderedQty - alreadyReceived);
                                  const isPartial      = mr.mat_status === "PartialReceived";
                                  const recv = Number(row.received_qty||0);
                                  const over = recv > pendingQty;
                                  return (
                                    <div key={mr.id} style={{display:"grid",gridTemplateColumns:"100px 1fr 90px 110px 70px",gap:7,padding:"7px 0",borderTop:"1px dashed "+T.b1,alignItems:"center"}}>
                                      <div>
                                        <span style={{fontSize:11,color:T.amb,fontWeight:700,fontFamily:"monospace"}}>{mr.mr_number||`MR-${mr.id}`}</span>
                                        {isPartial&&<div style={{fontSize:9,color:T.amb,fontWeight:700,background:T.ambL,border:"1px solid "+T.ambM,borderRadius:4,padding:"1px 5px",marginTop:2,display:"inline-block"}}>Partial</div>}
                                      </div>
                                      <div style={{minWidth:0}}>
                                        <div style={{fontSize:12,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{mr.item_name}</div>
                                        {isPartial
                                          ? <div style={{fontSize:10,color:T.amb}}>Ordered {orderedQty} · Received {alreadyReceived} · <b>Pending {pendingQty}</b></div>
                                          : mr.approx_amount>0&&<div style={{fontSize:10,color:T.t4}}>@ ₹{Math.round(Number(mr.approx_amount)/Number(mr.quantity||1)).toLocaleString("en-IN")}/{mr.unit}</div>
                                        }
                                      </div>
                                      <span style={{fontSize:11.5,color:isPartial?T.amb:T.t2,fontWeight:700,textAlign:"right"}}>{pendingQty} {mr.unit}</span>
                                      <input type="number" value={row.received_qty||""}
                                        onChange={e=>setGrnRows(p=>({...p,[mr.id]:{...p[mr.id],received_qty:e.target.value}}))}
                                        placeholder={String(pendingQty)}
                                        style={{padding:"6px 8px",borderRadius:5,border:"1.5px solid "+(over?T.red:T.b1),fontSize:11.5,textAlign:"right",fontFamily:"inherit",outline:"none",background:over?T.redL:T.surface,color:over?T.red:T.t1}}/>
                                      <span style={{fontSize:10.5,color:T.t4}}>{mr.unit}</span>
                                    </div>
                                  );
                                })}
                                {/* Single Receive button — vendor batch */}
                                <div style={{display:"flex",justifyContent:"flex-end",marginTop:10,paddingTop:8,borderTop:"1.5px solid "+T.b1}}>
                                  <button onClick={()=>handleReceiveVendor(vendor)} disabled={grnSaving||!meta.challan||filledCount===0}
                                    title={!meta.challan?"Challan no daalo":filledCount===0?"Kam se kam ek material ka qty fill karo":""}
                                    style={{padding:"8px 18px",borderRadius:6,background:(meta.challan&&filledCount>0)?T.grn:T.b1,border:"none",color:"white",fontSize:12.5,fontWeight:700,cursor:(meta.challan&&filledCount>0)?"pointer":"not-allowed",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
                                    {grnSaving?"...":`✓ Receive (${filledCount} item${filledCount===1?"":"s"})`}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {/* Completed (received) MRs — collapsed summary */}
                        {doneMRs.length>0&&(
                          <div style={{marginTop:10,padding:"8px 12px",background:T.grnL,border:"1px solid "+T.grnM,borderRadius:7,fontSize:11.5,color:T.grn,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:13}}>✓</span>
                            <span>{doneMRs.length} material{doneMRs.length>1?"s":""} received this session — {doneMRs.map(m=>m.item_name).join(", ")}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              {grnTab==="direct"&&(
                <div>
                  <div style={{background:T.bluL,border:"1px solid "+T.bluM,borderRadius:7,padding:"8px 11px",fontSize:11.5,color:T.blu,marginBottom:12}}>
                    Bina PO ke directly site pe aaya material — ek vendor ka multiple items ek hi GRN me receive karo
                  </div>
                  {/* Global vendor + challan + date — one per submission */}
                  <div style={{background:T.surface,border:"1.5px solid "+T.bluM,borderRadius:8,padding:"12px",marginBottom:12,borderLeft:"3px solid "+T.blu}}>
                    <div style={{fontSize:10.5,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>🏭 Delivery details (single vendor, one challan)</div>
                    <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr 1fr",gap:8}}>
                      <div>
                        <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Vendor *</label>
                        <LibrarySelect type="supplier" value={directGlobal.vendor}
                          onChange={v=>setDirectGlobal(p=>({...p,vendor:v||""}))}
                          onAdded={(v)=>setVendorList(prev=>[...prev,v].sort((a,b)=>(a.name||"").localeCompare(b.name||"")))}/>
                      </div>
                      <div>
                        <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Challan No. *</label>
                        <input value={directGlobal.challan} onChange={e=>setDirectGlobal(p=>({...p,challan:e.target.value}))} placeholder="e.g. CH-445"
                          style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                      </div>
                      <div>
                        <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Date</label>
                        <input type="date" value={directGlobal.date} onChange={e=>setDirectGlobal(p=>({...p,date:e.target.value}))}
                          style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                      </div>
                      <div>
                        <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Received By</label>
                        <input
                          value={directGlobal.received_by !== undefined && directGlobal.received_by !== "" ? directGlobal.received_by : (meUser?.name || "")}
                          onChange={e=>setDirectGlobal(p=>({...p,received_by:e.target.value}))}
                          placeholder={meUser?.name || "Site person"}
                          title="Default: logged-in user. Override karne ke liye type karein."
                          style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                      </div>
                    </div>
                  </div>
                  {/* Items table — multiple materials in one delivery */}
                  <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>📦 Items received <span style={{textTransform:"none",letterSpacing:0,color:T.t4,fontWeight:500}}>· same vendor / same challan</span></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 80px 90px 28px",gap:7,padding:"5px 8px",background:T.surfaceB,borderRadius:6,border:"1px solid "+T.b1,marginBottom:5}}>
                    {["Material Name *","Qty *","Unit","",].map((h,i)=>(<span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>))}
                  </div>
                  {directRows.map((row,i)=>{
                    const libMatch = matLibReal.find(m => (m.name||"").trim().toLowerCase() === (row.item_name||"").trim().toLowerCase());
                    const isLocked = !!row.item_name;
                    const displayUnit = libMatch?.unit || row.unit || "Bags";
                    return (
                      <div key={row.id} style={{display:"grid",gridTemplateColumns:"1fr 80px 90px 28px",gap:7,padding:"6px 8px",alignItems:"center",borderBottom:i<directRows.length-1?"1px dashed "+T.b1:"none"}}>
                        <div>
                          <input value={row.item_name} onChange={e=>{
                              const v=e.target.value;
                              const m=matLibReal.find(x=>(x.name||"").trim().toLowerCase()===v.trim().toLowerCase());
                              setDirectRows(p=>p.map(r=>r.id===row.id?{...r,item_name:v,unit:m?.unit||r.unit}:r));
                            }}
                            placeholder="e.g. Cement OPC 53" list={"mat_lib_"+row.id}
                            style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                          <datalist id={"mat_lib_"+row.id}>{MAT_LIB.map(m=><option key={m} value={m}/>)}</datalist>
                        </div>
                        <input type="number" value={row.qty} onChange={e=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,qty:e.target.value}:r))} placeholder="0"
                          style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                        {isLocked ? (
                          <div title="Library me change karein" style={{padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t2,background:T.surfaceB,fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:5,height:33,boxSizing:"border-box",justifyContent:"center"}}>
                            <span style={{fontSize:9}}>🔒</span>{displayUnit}
                          </div>
                        ) : (
                          <select value={row.unit} onChange={e=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,unit:e.target.value}:r))}
                            style={{padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
                            {UNITS_MR.map(u=><option key={u}>{u}</option>)}
                          </select>
                        )}
                        {directRows.length>1?(
                          <button onClick={()=>setDirectRows(p=>p.filter(r=>r.id!==row.id))} title="Remove row"
                            style={{width:26,height:26,borderRadius:6,background:T.redL,border:"1px solid "+T.redM,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth={2.4} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        ):<span/>}
                      </div>
                    );
                  })}
                  <button onClick={()=>setDirectRows(p=>[...p,{id:Date.now(),item_name:"",qty:"",unit:"Bags"}])}
                    style={{width:"100%",padding:"9px",borderRadius:7,border:"1.5px dashed "+T.bluM,background:"transparent",color:T.blu,fontSize:12,cursor:"pointer",marginTop:6,fontWeight:600,fontFamily:"inherit"}}>
                    + Add Another Item
                  </button>
                </div>
              )}

              {/* ── Photos section (inside scroll body) ── */}
              <div style={{marginTop:18,borderTop:"1px solid "+T.b1,paddingTop:14}}>
                <div style={{fontSize:10.5,fontWeight:700,color:grnPhotoRequired&&grnPhotos.length===0?T.amb:T.t3,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  📷 GRN Photos
                  <span style={{textTransform:"none",fontSize:10,fontWeight:500,color:T.t4}}>(challan / material / quality)</span>
                  {grnPhotoRequired&&(
                    <span style={{textTransform:"none",fontSize:9.5,fontWeight:700,color:grnPhotos.length===0?T.red:T.grn,background:grnPhotos.length===0?T.redL:T.grnL,padding:"2px 8px",borderRadius:10,border:`1px solid ${grnPhotos.length===0?T.redM:T.grnM}`}}>
                      {grnPhotos.length===0?"⚠ Required":"✓ Attached"}
                    </span>
                  )}
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {grnPhotos.map((url,idx)=>(
                    <div key={idx} style={{position:"relative",width:64,height:64,borderRadius:7,overflow:"hidden",border:"1px solid "+T.b1,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                      <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      <button onClick={()=>setGrnPhotos(p=>p.filter((_,i)=>i!==idx))}
                        style={{position:"absolute",top:3,right:3,width:18,height:18,borderRadius:"50%",background:"rgba(0,0,0,0.65)",color:"white",border:"none",fontSize:10,cursor:"pointer",lineHeight:1,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                    </div>
                  ))}
                  <label style={{width:64,height:64,borderRadius:7,border:"1.5px dashed "+T.b2,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexDirection:"column",gap:2,transition:"border-color .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=T.blu}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=T.b2}>
                    <span style={{fontSize:18}}>📷</span>
                    <span style={{fontSize:10,color:T.t4,fontWeight:600}}>Add</span>
                    <input type="file" accept="image/*" capture="environment" multiple style={{display:"none"}}
                      onChange={e=>{
                        const files=Array.from(e.target.files||[]);
                        files.forEach(file=>{
                          uploadManager.add({
                            file, folder:"gb_buildcon/grn",
                            label:"GRN photo: "+file.name,
                            onDone:(url)=>setGrnPhotos(p=>[...p,url]),
                          });
                        });
                        e.target.value="";
                      }}/>
                  </label>
                </div>
                <div style={{marginTop:5,fontSize:10,color:T.t4}}>Camera opens on mobile · Multi-select supported</div>
              </div>

            </div>{/* end scroll body */}

            {/* ── Sticky footer ── */}
            <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,background:T.bg,display:"flex",gap:10,flexShrink:0}}>
              <button onClick={()=>setShowGRN(false)}
                style={{flex:1,padding:"9px",borderRadius:7,background:T.surface,border:"1px solid "+T.b1,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer",fontFamily:"inherit"}}>
                Close
              </button>
              {grnTab==="direct"&&(
                <button onClick={handleDirectReceive} disabled={grnSaving}
                  style={{flex:2,padding:"9px",borderRadius:7,background:grnSaving?"#ccc":T.grn,border:"none",color:"white",fontSize:13,fontWeight:700,cursor:grnSaving?"not-allowed":"pointer",fontFamily:"inherit",letterSpacing:"-.1px"}}>
                  {grnSaving?"Saving…":"✅ Submit GRN"}
                </button>
              )}
              {grnTab==="ordered"&&grnDone.length>0&&(
                <button onClick={()=>setShowGRN(false)}
                  style={{flex:2,padding:"9px",borderRadius:7,background:T.grn,border:"none",color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  Done ✓ ({grnDone.length} received)
                </button>
              )}
            </div>

          </div>{/* end drawer */}
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
                      {m.isViaBill&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:"#FEF3C7",color:"#92400E",border:"1px solid #FDE68A"}}>Via Bill</span>}
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
                  <span style={{fontSize:12,color:T.t2}}>{m.vendor||"—"}
                    {m.isDirect&&<span style={{marginLeft:5,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"#DCFCE7",color:"#16A34A"}}>Direct</span>}
                    {m.isViaBill&&<span style={{marginLeft:5,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"#FEF3C7",color:"#92400E"}}>Via Bill</span>}
                  </span>
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
                // Expanded inline view replaced by the side ledger drawer —
                // isOpen pinned false so the old accordion body is dead code.
                const isOpen=false;
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
                    <div onClick={()=>setLedgerDrawerMat(mat)}
                      style={{padding:"11px 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",background:T.surface,transition:"background .15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.bluL+"55"}
                      onMouseLeave={e=>e.currentTarget.style.background=T.surface}>
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
                    {isOpen&&(()=>{
                      // Per-material filter — show GRN-only / Used-only / All
                      const visibleRows = allRows.filter(r =>
                        ledgerRowFilter==="all" ? true :
                        ledgerRowFilter==="grn" ? r._type==="grn" : r._type==="used");
                      const markUsedOpen = ledgerMarkUsedFor===mat.material_name;
                      const today = new Date().toISOString().split("T")[0];
                      const uForm = invUsedForm[mat.material_name]||{qty:"",remark:"",used_date:today};
                      return (
                      <div>
                        {/* Toolbar — filter chips + Mark Used */}
                        <div style={{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",background:"#0F172A",borderTop:"1px solid #1E293B"}}>
                          {[["all","All"],["grn","GRN only"],["used","Used only"]].map(([k,l])=>(
                            <button key={k} onClick={()=>setLedgerRowFilter(k)}
                              style={{padding:"3px 11px",borderRadius:12,fontSize:10.5,fontWeight:700,cursor:"pointer",border:"1px solid "+(ledgerRowFilter===k?T.blu:"#334155"),background:ledgerRowFilter===k?T.blu:"transparent",color:ledgerRowFilter===k?"white":"rgba(255,255,255,.6)"}}>
                              {l}
                            </button>
                          ))}
                          <div style={{flex:1}}/>
                          {mat.balance>0&&(
                            <button onClick={()=>{
                              setLedgerMarkUsedFor(markUsedOpen?null:mat.material_name);
                              if(!markUsedOpen) setInvUsedForm(p=>({...p,[mat.material_name]:{qty:"",remark:"",used_date:today}}));
                            }}
                              style={{padding:"4px 12px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",border:"1px solid "+(markUsedOpen?"#4ADE80":T.grn),background:markUsedOpen?T.grn:"transparent",color:markUsedOpen?"white":"#4ADE80"}}>
                              {markUsedOpen?"▲ Cancel":"▼ Mark Used"}
                            </button>
                          )}
                        </div>

                        {/* Inline Mark-Used form */}
                        {markUsedOpen&&mat.balance>0&&(
                          <div style={{padding:"11px 14px",background:T.grnL,borderBottom:"1px solid "+T.grnM}}>
                            <div style={{display:"grid",gridTemplateColumns:"110px 130px 1fr 110px",gap:8,alignItems:"end"}}>
                              <div>
                                <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Qty Used *</label>
                                <input type="number" value={uForm.qty}
                                  onChange={e=>setInvUsedForm(p=>({...p,[mat.material_name]:{...uForm,qty:e.target.value}}))}
                                  placeholder={"max "+mat.balance}
                                  style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:13,fontWeight:700,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                              </div>
                              <div>
                                <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Date</label>
                                <input type="date" value={uForm.used_date}
                                  onChange={e=>setInvUsedForm(p=>({...p,[mat.material_name]:{...uForm,used_date:e.target.value}}))}
                                  style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                              </div>
                              <div>
                                <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Remark</label>
                                <input value={uForm.remark}
                                  onChange={e=>setInvUsedForm(p=>({...p,[mat.material_name]:{...uForm,remark:e.target.value}}))}
                                  placeholder="Optional"
                                  style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                              </div>
                              <button onClick={async()=>{
                                if(!uForm.qty||parseFloat(uForm.qty)<=0) return alert("Qty required");
                                if(parseFloat(uForm.qty)>mat.balance) return alert("Qty exceeds balance ("+mat.balance+")");
                                setInvUsedSaving(mat.material_name);
                                try{
                                  const res=await api.post("/tasks/project/"+projectId+"/mark-used",{
                                    material_name:mat.material_name,
                                    used_qty:parseFloat(uForm.qty),
                                    unit:mat.unit,
                                    remark:uForm.remark||null,
                                    used_date:uForm.used_date,
                                  });
                                  if(res.success){
                                    setLedgerMarkUsedFor(null);
                                    const rr=await api.get("/tasks/project/"+projectId+"/material-ledger");
                                    if(rr.success) setLedger(rr.data||[]);
                                  } else alert(res.message||"Failed");
                                }catch(e){alert(e.message);}
                                setInvUsedSaving(null);
                              }} disabled={invUsedSaving===mat.material_name}
                                style={{padding:"7px",borderRadius:6,background:invUsedSaving===mat.material_name?T.b1:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
                                {invUsedSaving===mat.material_name?"Saving...":"✓ Save Used"}
                              </button>
                            </div>
                          </div>
                        )}

                      <div style={{overflowX:"auto"}}>
                        {/* Column headers */}
                        <div style={{display:"grid",gridTemplateColumns:"85px 130px 85px 1fr 85px 85px 85px 85px 90px 36px",background:"#1E293B",padding:"7px 14px",gap:8,minWidth:936}}>
                          {["Date","Vendor","Challan","Remark / Task","Ref#","Cr (In)","Dr (Out)","Balance","By",""].map((h,hi)=>(
                            <div key={hi} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:".5px",textAlign:hi>=5&&hi<=7?"right":"left"}}>{h}</div>
                          ))}
                        </div>

                        {/* Rows */}
                        {visibleRows.length===0&&(
                          <div style={{padding:"24px",textAlign:"center",color:T.t4,fontSize:12}}>No entries{ledgerRowFilter!=="all"?` (${ledgerRowFilter})`:""} yet</div>
                        )}
                        {visibleRows.map((row,ri)=>{
                          const isGRN=row._type==="grn";
                          const balNeg=row.runBal<0;
                          const balLow=row.runBal>=0&&row.runBal<mat.total_received*0.2;
                          const balColor=balNeg?T.red:balLow?T.amb:T.grn;
                          const dateStr=row._date?row._date.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"—";
                          const showDel = !isGRN && row.used_log_id && row.task_id && canDeleteUsed(row.created_by_id);
                          return(
                            <div key={ri}
                              onClick={()=>{ if(isGRN && row.grn_id) setFlowGrnId(row.grn_id); }}
                              style={{display:"grid",gridTemplateColumns:"85px 130px 85px 1fr 85px 85px 85px 85px 90px 36px",padding:"9px 14px",gap:8,borderBottom:"1px solid "+T.b1,alignItems:"center",background:ri%2===0?T.surface:"#F8FAFC",minWidth:936,borderLeft:"3px solid "+(isGRN?T.grn:T.amb),cursor:isGRN&&row.grn_id?"pointer":"default",transition:"background .1s"}}
                              onMouseEnter={e=>{ if(isGRN && row.grn_id) e.currentTarget.style.background=T.bluL+"66"; }}
                              onMouseLeave={e=>{ e.currentTarget.style.background=ri%2===0?T.surface:"#F8FAFC"; }}>
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
                              {/* Delete (only owner can delete a usage entry) */}
                              <div style={{display:"flex",justifyContent:"center"}}>
                                {showDel?(
                                  <button title="Delete this usage entry"
                                    onClick={async(e)=>{
                                      e.stopPropagation();
                                      if(!window.confirm("Is used entry ko delete kar dein? ("+row.qty+" "+(row.unit||mat.unit||"")+" — "+(row.task_name||"Project level")+")")) return;
                                      const r=await api.del("/tasks/"+row.task_id+"/used-log/"+row.used_log_id);
                                      if(r.success){
                                        const rr=await api.get("/tasks/project/"+projectId+"/material-ledger");
                                        if(rr.success) setLedger(rr.data||[]);
                                      } else {
                                        alert(r.message||"Delete fail ho gaya");
                                      }
                                    }}
                                    style={{background:"none",border:"none",cursor:"pointer",padding:4,borderRadius:4,color:T.red,display:"flex",alignItems:"center",justifyContent:"center"}}
                                    onMouseEnter={e=>e.currentTarget.style.background=T.redL}
                                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/></svg>
                                  </button>
                                ):null}
                              </div>
                            </div>
                          );
                        })}

                        {/* Footer summary */}
                        <div style={{display:"grid",gridTemplateColumns:"85px 130px 85px 1fr 85px 85px 85px 85px 90px 36px",padding:"8px 14px",gap:8,background:"#0F172A",minWidth:936,borderTop:"2px solid "+T.b1}}>
                          <div style={{gridColumn:"1/6",fontSize:10.5,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:".4px"}}>Total</div>
                          <div style={{fontSize:13,fontWeight:800,color:"#4ADE80",textAlign:"right"}}>{mat.total_received}</div>
                          <div style={{fontSize:13,fontWeight:800,color:"#F87171",textAlign:"right"}}>{mat.total_used}</div>
                          <div style={{fontSize:13,fontWeight:800,color:mat.balance<=0?"#F87171":"#4ADE80",textAlign:"right"}}>{mat.balance}</div>
                          <div/>
                          <div/>
                        </div>
                      </div>
                      </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 3 (retired): INVENTORY — merged into Material Inventory
      ══════════════════════════════════════════════════════ */}
      {false&&(
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

      {/* ══════════════════════════════════════════════════════
          TAB 4: TRANSFER — site-to-site material transfer with approval
      ══════════════════════════════════════════════════════ */}
      {activeTab==="transfer"&&(
        <MaterialTransferTab projectId={projectId} projectName={projectName} isAdmin={meIsPriv}/>
      )}

      {/* ── MATERIAL LEDGER DRAWER (material click → GRN/Used/MR tabs) ── */}
      <MaterialLedgerDrawer
        material={ledgerDrawerMat}
        projectId={projectId}
        onClose={()=>setLedgerDrawerMat(null)}
        canDeleteUsed={canDeleteUsed}
        onGrnClick={(grnId)=>{ setLedgerDrawerMat(null); setFlowGrnId(grnId); }}
        onChanged={async()=>{
          try {
            const r = await api.get("/tasks/project/"+projectId+"/material-ledger");
            if (r.success) setLedger(r.data || []);
          } catch {}
        }}
      />

      {/* ── MATERIAL FLOW DRAWER (Material Ledger row click) ── */}
      <MaterialFlowDrawer
        grnId={flowGrnId}
        onClose={()=>setFlowGrnId(null)}
        onChanged={async()=>{
          try {
            const r = await api.get("/tasks/project/"+projectId+"/material-ledger");
            if (r.success) setLedger(r.data || []);
          } catch {}
        }}
        onEditMR={(mr)=>{ setFlowEditMR(mr); setFlowGrnId(null); }}
      />
      {/* ── MR Edit Drawer (opened from Material Flow's Edit button) ── */}
      <MRDetailDrawer
        mr={flowEditMR}
        onClose={()=>setFlowEditMR(null)}
        onChanged={async()=>{
          try {
            const [r1, r2] = await Promise.all([
              api.get("/tasks/project/"+projectId+"/material-ledger"),
              api.get("/tasks/project/"+projectId+"/inventory"),
            ]);
            if (r1.success) setLedger(r1.data || []);
            if (r2.success) setInventory(r2.data || []);
          } catch {}
        }}
      />
    </div>
  );
}


function TabSubcon({ projectId, project }) {
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
  const billSubmitRef = useRef(false);
  const [showEditWO, setShowEditWO] = useState(false);
  const [amendments, setAmendments] = useState([]);
  const [expandedBill, setExpandedBill] = useState(null);
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [editBillSaving, setEditBillSaving] = useState(false);
  const [billItems, setBillItems] = useState({});
  const [billForm, setBillForm] = useState({ bill_date: new Date().toISOString().split("T")[0], remark:"", items:[] });
  const [payForm, setPayForm] = useState({ amount_paid:"", payment_date: new Date().toISOString().split("T")[0], payment_mode:"Bank Transfer", reference_no:"", remark:"" });
  const [showManualRaBill, setShowManualRaBill] = useState(false);
  const [manualBillForm, setManualBillForm] = useState({ bill_date: localYMD(), remark:"", items:[{description:"",qty:"",rate:""}] });
  const [manualBillSaving, setManualBillSaving] = useState(false);

  // ── Milestone billing (Phase 1 backend already shipped; this is the UI side) ──
  // Subcon WOs default to billing_method='manual'. Switch via the chip in the WO
  // header. milestone_rate uses per-item milestones with cum_rate; milestone_percent
  // uses WO-value stages with pct. Shares the milestone_templates store with library.
  const [woMilestones, setWoMilestones] = useState({ rate_by_item: {}, percent: [] });
  const [showSetMs, setShowSetMs]       = useState(false);
  const [msForm, setMsForm] = useState({
    kind: "rate",            // 'rate' | 'percent'
    wo_item_id: null,        // legacy single-item (kept for backward compat)
    rateMs: [{ seq: 0, name: "", cum_rate: "" }],
    pctMs:  [{ seq: 0, name: "", pct: "" }],
    pickedItemIds: [],       // multi-item picker (new Estimate-style flow)
    itemStages: {},          // { [wo_item_id]: [{seq,name,cum_rate}] }
    expandedItemId: null,
  });
  const [templates, setTemplates] = useState([]);
  const [woItemPickerOpen,   setWoItemPickerOpen]   = useState(false);
  const [woItemPickerSearch, setWoItemPickerSearch] = useState("");

  // ── Payment Schedule tab state ──────────────────────────────────────────
  const [billingLedger,      setBillingLedger]      = useState(null);
  const [ledgerLoading,      setLedgerLoading]      = useState(false);
  const [linkedTasks,        setLinkedTasks]        = useState({});   // {[ms_id]: {task_id,task_name,progress,trigger_pct,eligible}}
  const [linkedTasksLoading, setLinkedTasksLoading] = useState(false);
  const [msChooserOpen,      setMsChooserOpen]      = useState(false);
  // Task picker for linking milestones
  const [taskPickerFor,      setTaskPickerFor]      = useState(null); // ms_id being linked
  const [projectTasksSub,    setProjectTasksSub]    = useState([]);   // project task list
  const [taskPickerSearch,   setTaskPickerSearch]   = useState("");
  const [taskPickerExpSub,   setTaskPickerExpSub]   = useState({});
  const [linkTrigPct,        setLinkTrigPct]        = useState(100);
  const [linkSelTaskId,      setLinkSelTaskId]      = useState(null);
  const [linkingTask,        setLinkingTask]        = useState(false);

  const loadBillingLedger = async (woId) => {
    if (!woId) return;
    setLedgerLoading(true);
    const r = await api.get("/subcon/wo/"+woId+"/billing-ledger").catch(()=>({success:false}));
    setLedgerLoading(false);
    if (r?.success) setBillingLedger(r.data);
  };

  const loadLinkedTasksSub = async (woId) => {
    if (!woId) return;
    setLinkedTasksLoading(true);
    const r = await api.get("/subcon/wo/"+woId+"/linked-tasks").catch(()=>({success:false}));
    setLinkedTasksLoading(false);
    if (r?.success) setLinkedTasks(r.data || {});
    if (projectId) {
      api.get("/tasks?project_id="+projectId).then(r2=>{ if(r2?.success) setProjectTasksSub(r2.data||[]); }).catch(()=>{});
    }
  };

  const openTaskPickerSub = async (msId) => {
    const existing = linkedTasks[msId];
    setLinkSelTaskId(existing?.task_id || null);
    setLinkTrigPct(existing?.trigger_pct ?? 100);
    setTaskPickerSearch(""); setTaskPickerExpSub({});
    setTaskPickerFor(msId);
    const r = await api.get("/tasks?project_id="+projectId).catch(()=>({success:false}));
    if (r?.success) setProjectTasksSub(r.data || []);
  };

  const confirmLinkTaskSub = async () => {
    if (!taskPickerFor || !linkSelTaskId) return;
    setLinkingTask(true);
    const r = await api.put("/subcon/wo/"+selWo.id+"/milestones/rate/"+taskPickerFor+"/link",
      { task_id: linkSelTaskId, trigger_pct: linkTrigPct }
    ).catch(e=>({ success:false, message:e.message }));
    setLinkingTask(false);
    if (!r?.success) { alert(r?.message || "Link failed"); return; }
    setTaskPickerFor(null);
    await loadLinkedTasksSub(selWo.id);
    await loadBillingLedger(selWo.id);
  };

  const unlinkTaskSub = async (msId) => {
    if (!window.confirm("Unlink this milestone from its task?")) return;
    await api.del("/subcon/wo/"+selWo.id+"/milestones/rate/"+msId+"/link").catch(()=>{});
    await loadLinkedTasksSub(selWo.id);
    await loadBillingLedger(selWo.id);
  };

  const deleteRateScheduleSub = async (woItemId, desc) => {
    if (!window.confirm("Delete all milestones for \"" + desc + "\"?")) return;
    await api.del("/subcon/wo/"+selWo.id+"/milestones/rate/"+woItemId).catch(()=>{});
    await reloadWo();
  };

  const deletePercentScheduleSub = async () => {
    if (!window.confirm("Delete all % milestones?")) return;
    await api.del("/subcon/wo/"+selWo.id+"/milestones/percent").catch(()=>{});
    await reloadWo();
  };

  useEffect(()=>{
    loadWOs();
    api.get("/library/subcontractors").then(r=>{ if(r.success) setSubcons(r.data||[]); }).catch(()=>{});
    api.get("/subcon/milestone-templates").then(r=>{ if(r.success) setTemplates(r.data||[]); }).catch(()=>{});
  },[projectId]);

  // Auto-load billing ledger + linked tasks when Payment Schedule tab is active
  const selWoId = selWo?.id;
  useEffect(()=>{
    if (subTab === "schedule" && selWoId) {
      loadBillingLedger(selWoId);
      loadLinkedTasksSub(selWoId);
    }
  },[subTab, selWoId]); // loadBillingLedger/loadLinkedTasksSub are stable (no deps from render)

  const loadWOs = async () => {
    setLoading(true);
    const r = await api.get("/subcon/work-orders?project_id="+projectId).catch(()=>({success:false}));
    if(r.success) setWos(r.data||[]);
    setLoading(false);
  };

  const selectWo = async (wo) => {
    setSelWo(wo); setSubTab("wo");
    setBillingLedger(null); setLinkedTasks({});
    const [bRes, sRes, aRes, mRes, dRes] = await Promise.all([
      api.get("/subcon/ra-bills?wo_id="+wo.id).catch(()=>({success:false})),
      api.get("/subcon/work-orders/"+wo.id+"/summary").catch(()=>({success:false})),
      api.get("/subcon/amendments?wo_id="+wo.id).catch(()=>({success:false})),
      api.get("/subcon/wo/"+wo.id+"/milestones").catch(()=>({success:false})),
      // Fresh WO detail so billing_method stays in sync after PUT /billing-method.
      api.get("/subcon/work-orders/"+wo.id).catch(()=>({success:false})),
    ]);
    if(bRes.success) setBills(bRes.data||[]);
    if(sRes.success) setSummary(sRes.data);
    if(aRes.success) setAmendments(aRes.data||[]);
    if(mRes.success) setWoMilestones(mRes.data || { rate_by_item:{}, percent:[] });
    if(dRes.success) setSelWo(prev => prev ? { ...prev, ...dRes.data } : prev);
  };

  const reloadWo = async () => { if (selWo) await selectWo(selWo); };

  // ── BILLING-METHOD SWITCH ──
  const switchBillingMethod = async (method) => {
    if (!selWo) return;
    if (selWo.billing_method === method) return;
    const r = await api.put("/subcon/wo/"+selWo.id+"/billing-method", { billing_method: method }).catch(()=>({success:false}));
    if (r.success) await reloadWo();
    else alert(r.message || "Switch failed (incompatible bills?)");
  };

  // ── SET MILESTONES / PAYMENT SCHEDULE (rate or percent) ──
  const resetMsForm = () => setMsForm({ kind:"rate", wo_item_id:null, rateMs:[{seq:0,name:"",cum_rate:""}], pctMs:[{seq:0,name:"",pct:""}], pickedItemIds:[], itemStages:{}, expandedItemId:null });

  const submitMilestones = async () => {
    if (!selWo) return;
    setSaving(true);
    let r;
    if (msForm.kind === "rate") {
      // New multi-item flow
      const items = (msForm.pickedItemIds || []).map(itemId => ({
        wo_item_id: itemId,
        milestones: (msForm.itemStages[itemId] || [])
          .filter(m => m.name && m.cum_rate)
          .map((m, i) => ({ seq: i, name: m.name, cum_rate: parseFloat(m.cum_rate) })),
      })).filter(x => x.milestones.length > 0);

      if (!items.length) { setSaving(false); return alert("Pick at least one WO item and add stages"); }
      if (selWo.billing_method !== "milestone_rate") {
        await api.put("/subcon/wo/"+selWo.id+"/billing-method", { billing_method: "milestone_rate" }, { timeoutMs: 30000 });
      }
      // Large WOs (10+ items) can take 20-30s on Railway DB — give 90s
      r = await api.post("/subcon/wo/"+selWo.id+"/milestones/rate", { items }, { timeoutMs: 90000 }).catch(()=>({success:false}));
    } else {
      const ms = msForm.pctMs.filter(m => m.name && m.pct)
        .map((m,i) => ({ seq:i, name:m.name, pct: parseFloat(m.pct) }));
      if (!ms.length) { setSaving(false); return alert("Add at least one milestone"); }
      if (selWo.billing_method !== "milestone_percent") {
        await api.put("/subcon/wo/"+selWo.id+"/billing-method", { billing_method: "milestone_percent" }, { timeoutMs: 30000 });
      }
      r = await api.post("/subcon/wo/"+selWo.id+"/milestones/percent", { milestones: ms }, { timeoutMs: 30000 }).catch(()=>({success:false}));
    }
    setSaving(false);
    if (r.success) {
      setShowSetMs(false);
      resetMsForm();
      if (r.data?.warnings?.length) alert("Saved with warnings:\n" + r.data.warnings.join("\n"));
      await reloadWo();
      await loadBillingLedger(selWo.id);
    } else alert(r.message || "Failed");
  };

  // ── APPLY TEMPLATE to a WO item (template uses cum_pct × item.rate) ──
  const applyTemplateToItem = async (woItemId, templateId) => {
    const r = await api.post("/subcon/wo/"+selWo.id+"/items/"+woItemId+"/apply-template",
      { template_id: templateId }).catch(()=>({success:false}));
    if (r.success) {
      if (selWo.billing_method !== "milestone_rate") {
        await api.put("/subcon/wo/"+selWo.id+"/billing-method", { billing_method: "milestone_rate" });
      }
      await reloadWo();
    } else alert(r.message || "Apply template failed");
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
  // Branches on selWo.billing_method:
  //   manual           → existing behaviour, items map all WO items with cumulative_qty
  //   milestone_rate   → billForm.items already in {milestone_id, cumulative_qty} shape
  //   milestone_percent→ billForm.items already in {milestone_id} shape (just tick)
  // submitBill now receives full payload from NewRaBillModal
  const submitBill = async (payload) => {
    if(billSubmitRef.current) return;
    if(!selWo) return;
    billSubmitRef.current = true;
    setSaving(true);

    const postOne = (body) =>
      api.post("/subcon/ra-bills", { wo_id: selWo.id, ...body }, { timeoutMs: 60000 })
        .catch(() => ({ success: false }));

    const onSuccess = (billData) => {
      api.post("/approvals/submit", {
        module: "RA Bill",
        ref_id: billData.id,
        ref_no: billData.bill_no || "",
        title: (selWo.subcon_name||selWo.name||"") + " - RA Bill",
        amount: billData.total_amount || billData.gross_amount || 0,
        project_id: projectId,
        project_name: project?.name || "",
      }).catch(e => console.error("Approval submit:", e));
      apiCache.refreshApprovals();
    };

    let res;
    // ── Split logic — mirrors Estimate exactly ──────────────────────────
    if (payload._isSplit) {
      const { normalItems, overItems, over_bill_mode, over_bill_reason, bill_date, remark } = payload;
      const base = { bill_date, remark };

      // CASE A: nothing
      if (!normalItems.length && !overItems.length) {
        setSaving(false); billSubmitRef.current = false;
        return alert("Nothing to bill.");
      }
      // CASE B: only normal (no over-billing)
      if (overItems.length === 0) {
        res = await postOne({ ...base, items: normalItems });
      }
      // CASE C: only over (entire qty is beyond remaining — fully over-billed)
      else if (normalItems.length === 0) {
        if (!over_bill_mode) {
          setSaving(false); billSubmitRef.current = false;
          return alert("⚠ One or more milestones are fully billed but you've entered extra qty.\n\nTurn on Over-Billing Mode + add a reason to proceed.");
        }
        res = await postOne({ ...base, items: overItems, over_bill_mode: 1, over_bill_reason });
      }
      // CASE D: split — normal portion first, over-bill linked second
      else {
        if (!over_bill_mode) {
          setSaving(false); billSubmitRef.current = false;
          return alert("⚠ Some quantities exceed WO remaining.\n\nTurn on Over-Billing Mode + add a reason to proceed.\n\nSystem will auto-split into 2 linked RA bills (WO portion + over-bill portion).");
        }
        const r1 = await postOne({ ...base, items: normalItems });
        if (!r1.success || !r1.data?.id) {
          setSaving(false); billSubmitRef.current = false;
          return alert("Normal portion save failed: " + (r1.message || "Server error"));
        }
        onSuccess(r1.data);
        res = await postOne({ ...base, items: overItems, over_bill_mode: 1, over_bill_reason, linked_bill_id: r1.data.id });
      }
    } else {
      // Simple path: manual or milestone_percent (no split needed)
      res = await postOne(payload);
    }

    setSaving(false);
    billSubmitRef.current = false;

    if(res.success){
      onSuccess(res.data);
      if (res.data?.warnings?.length) alert("Saved with warnings:\n" + res.data.warnings.join("\n"));
      setShowNewBill(false);
      setBillForm({ bill_date: new Date().toISOString().split("T")[0], remark:"", items:[] });
      selectWo(selWo);
    }
    else alert(res.message||"Failed");
  };

  // ── SUBMIT MANUAL (FREE FORM) RA BILL ──────────────────────────────────
  const submitManualRaBill = async () => {
    if (!selWo) return;
    const validItems = manualBillForm.items.filter(it =>
      it.description.trim() && parseFloat(it.qty) > 0 && parseFloat(it.rate) >= 0
    );
    if (!validItems.length) return alert("Add at least one item with Description, Qty and Rate.");
    setManualBillSaving(true);
    const res = await api.post("/subcon/ra-bills", {
      wo_id: selWo.id,
      source: "free_form",
      bill_date: manualBillForm.bill_date,
      remark: manualBillForm.remark,
      items: validItems.map(it => ({
        description: it.description.trim(),
        qty:  parseFloat(it.qty),
        rate: parseFloat(it.rate),
      })),
    }).catch(() => ({ success:false }));
    setManualBillSaving(false);
    if (res.success) {
      setShowManualRaBill(false);
      setManualBillForm({ bill_date: localYMD(), remark:"", items:[{description:"",qty:"",rate:""}] });
      selectWo(selWo);
    } else {
      alert(res.message || "Failed to save manual RA bill.");
    }
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
                <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2,display:"flex",alignItems:"center",gap:8}}>
                  <span>{selWo.description||selWo.subcon_category}</span>
                  {/* Billing-method chip — drives which UI the New RA Bill modal renders. */}
                  <span style={{
                    background: selWo.billing_method==="manual" ? "rgba(148,163,184,0.2)"
                              : selWo.billing_method==="milestone_rate" ? "rgba(96,165,250,0.2)"
                              : "rgba(167,139,250,0.2)",
                    color: selWo.billing_method==="manual" ? "#CBD5E1"
                         : selWo.billing_method==="milestone_rate" ? "#60A5FA"
                         : "#A78BFA",
                    padding:"1px 8px", borderRadius:4, fontWeight:700, fontSize:10,
                  }}>
                    {selWo.billing_method==="milestone_rate" ? "MILESTONE (rate)"
                      : selWo.billing_method==="milestone_percent" ? "MILESTONE (%)"
                      : "MANUAL BILLING"}
                  </span>
                </div>
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
          <div style={{display:"flex",borderBottom:"1px solid "+T.b1,background:T.surfaceB,flexShrink:0,alignItems:"center"}}>
            {[
              {id:"wo",label:"Work Order"},
              {id:"schedule",label:"Payment Schedule"},
              {id:"bills",label:`RA Bills (${bills.length})`},
              {id:"pay",label:"Payments"},
              {id:"amend",label:"Amendments"+(amendments.filter(a=>a.status==="Pending").length>0 ? ` 🔴${amendments.filter(a=>a.status==="Pending").length}` : ` (${amendments.length})`)},
            ].map(t=>(
              <button key={t.id} onClick={()=>setSubTab(t.id)}
                style={{padding:"8px 16px",border:"none",background:"transparent",color:subTab===t.id?T.blu:T.t3,fontSize:12,fontWeight:subTab===t.id?700:400,cursor:"pointer",borderBottom:subTab===t.id?"2px solid "+T.blu:"2px solid transparent"}}>
                {t.label}
              </button>
            ))}
            <div style={{flex:1}}/>
            {/* Payment Schedule tab toolbar — mirrors Estimate */}
            {subTab==="schedule" && (<>
              {selWo?.billing_method === "milestone_rate" && (
                <button onClick={async()=>{
                    await loadLinkedTasksSub(selWo.id);
                    if (selWo.auto_bill_on_complete) {
                      const sw = await api.post("/subcon/wo/"+selWo.id+"/auto-bill-sweep").catch(()=>({success:false}));
                      if (sw?.success && sw.data?.created?.length > 0) {
                        alert(sw.data.created.length + " draft RA bill(s) created for eligible milestones. Review in RA Bills tab.");
                        await reloadWo();
                      }
                    }
                  }}
                  disabled={linkedTasksLoading}
                  style={{background:"white",color:T.t3,border:"1px solid "+T.b1,borderRadius:14,padding:"4px 10px",fontSize:10.5,fontWeight:600,cursor:linkedTasksLoading?"default":"pointer",display:"flex",alignItems:"center",gap:4,marginRight:4}}>
                  {linkedTasksLoading ? "Refreshing…" : "↻ Refresh progress"}
                </button>
              )}
              <button onClick={async()=>{
                  const next = !selWo.auto_bill_on_complete;
                  if (next && !window.confirm(
                    "Turn ON auto-billing?\n\nWhen a task linked to a milestone is marked Complete, the system will auto-create a DRAFT RA bill.\n\nDrafts need your review before paying. You can turn this off anytime."
                  )) return;
                  const r = await api.patch("/subcon/wo/"+selWo.id+"/auto-bill", { enabled: next }).catch(()=>({success:false}));
                  if (!r?.success) { alert(r?.message || "Failed"); return; }
                  setSelWo(p => p ? { ...p, auto_bill_on_complete: next ? 1 : 0 } : p);
                  if (next) {
                    const sw = await api.post("/subcon/wo/"+selWo.id+"/auto-bill-sweep").catch(()=>({success:false}));
                    if (sw?.success && sw.data?.created?.length > 0) {
                      alert("Auto-billing ON.\n\n" + sw.data.created.length + " draft RA bill(s) created for already-eligible milestones.");
                      await reloadWo();
                    }
                  }
                }}
                style={{
                  background: selWo?.auto_bill_on_complete ? "#DCFCE7" : T.surfaceB,
                  color:      selWo?.auto_bill_on_complete ? "#15803D" : T.t3,
                  border:"1px solid " + (selWo?.auto_bill_on_complete ? "#86EFAC" : T.b1),
                  borderRadius:14,padding:"4px 10px",fontSize:10.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,marginRight:4,
                }}>
                🤖 Auto-bill {selWo?.auto_bill_on_complete ? "ON" : "OFF"}
              </button>
              <div style={{position:"relative",marginRight:8}}>
                <button onClick={()=>setMsChooserOpen(o=>!o)}
                  style={{background:T.bluL,color:T.blu,border:"1px solid "+T.bluM,borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  + Set Schedule ▾
                </button>
                {msChooserOpen && (<>
                  <div onClick={()=>setMsChooserOpen(false)} style={{position:"fixed",inset:0,zIndex:200}}/>
                  <div style={{position:"absolute",top:30,right:0,width:270,background:"white",border:"1px solid "+T.b1,borderRadius:8,boxShadow:"0 12px 32px rgba(0,0,0,0.18)",zIndex:201,overflow:"hidden"}}>
                    <div style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",borderBottom:"1px solid "+T.b1,background:T.surfaceB}}>
                      Choose billing mode
                    </div>
                    <div onClick={()=>{ setMsForm(p=>({...p,kind:"rate",wo_item_id:null})); setShowSetMs(true); setMsChooserOpen(false); }}
                      style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid "+T.b1}}
                      onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"} onMouseLeave={e=>e.currentTarget.style.background="white"}>
                      <div style={{fontSize:12,fontWeight:700,color:T.t1}}>📋 Item-wise</div>
                      <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>Define billing stages per WO item (₹/unit)</div>
                    </div>
                    <div onClick={()=>{ setMsForm(p=>({...p,kind:"percent"})); setShowSetMs(true); setMsChooserOpen(false); }}
                      style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid "+T.b1}}
                      onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"} onMouseLeave={e=>e.currentTarget.style.background="white"}>
                      <div style={{fontSize:12,fontWeight:700,color:T.t1}}>📊 % of WO Value</div>
                      <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>Define milestones as % of total WO value</div>
                    </div>
                    <div onClick={async()=>{ setMsChooserOpen(false); if(selWo.billing_method==="manual") return; if(!window.confirm("Switch to Manual mode?")) return; await switchBillingMethod("manual"); }}
                      style={{padding:"10px 12px",cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#FAF5FF"} onMouseLeave={e=>e.currentTarget.style.background="white"}>
                      <div style={{fontSize:12,fontWeight:700,color:T.t1}}>✍️ Manual (Cumulative)</div>
                      <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>No preset stages — bill cumulative qty per item</div>
                    </div>
                  </div>
                </>)}
              </div>
            </>)}
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

            {/* PAYMENT SCHEDULE TAB */}
            {subTab==="schedule"&&(
              <div>
                {/* Manual billing message */}
                {(!selWo.billing_method || selWo.billing_method==="manual") && (
                  <div style={{padding:"24px",textAlign:"center",color:T.t3,background:T.surface,border:"1px dashed "+T.b1,borderRadius:8}}>
                    <div style={{fontSize:13,marginBottom:6}}>This WO uses <b>manual</b> billing (per-item cumulative qty).</div>
                    <div style={{fontSize:11.5,color:T.t4}}>Click <b>+ Set Schedule</b> to switch to milestone-based (item-wise rate or % of WO value).</div>
                  </div>
                )}

                {/* RATE-BASED milestones: Section → Item → Milestones */}
                {selWo.billing_method==="milestone_rate" && (() => {
                  // Build set of items that have milestones
                  const itemsWithMs = new Set(
                    Object.entries(woMilestones.rate_by_item || {})
                      .filter(([,ms]) => ms && ms.length)
                      .map(([id]) => parseInt(id))
                  );
                  if (!itemsWithMs.size) return (
                    <div style={{padding:"24px",textAlign:"center",color:T.t3,background:T.surface,border:"1px dashed "+T.b1,borderRadius:8}}>
                      <div style={{fontSize:12}}>No milestones set yet. Click <b>+ Set Schedule → Item-wise</b> to add stages.</div>
                    </div>
                  );

                  // Build itemId → item lookup from billing ledger
                  const ledgerItems = {};
                  if (billingLedger?.mode === "milestone_rate") {
                    for (const it of (billingLedger.items || [])) ledgerItems[it.item_id] = it;
                  }
                  const ledgerByMsId = {};
                  if (billingLedger?.mode === "milestone_rate") {
                    for (const it of (billingLedger.items || [])) {
                      for (const m of (it.milestones || [])) ledgerByMsId[m.milestone_id] = m;
                    }
                  }

                  // ── ITEM CARD (shared renderer) ──────────────────────────────
                  const renderItemCard = (item_id, ms) => {
                    const ledItem   = ledgerItems[item_id] || null;
                    const boqQty    = ledItem ? Number(ledItem.item_qty)       : 0;
                    const boqRate   = ledItem ? Number(ledItem.item_rate)      : (ms[0] ? Number(ms[0].cum_rate) : 0);
                    const boqValue  = boqQty * boqRate;
                    const billedQty = ledItem ? Number(ledItem.total_billed)   : 0;
                    const remainQty = ledItem ? Number(ledItem.total_remaining): boqQty;
                    const billedVal = billedQty * boqRate;
                    const remainVal = remainQty * boqRate;
                    const pctBilled = boqQty > 0 ? Math.min(100, billedQty / boqQty * 100) : 0;
                    const isFull    = pctBilled >= 99.99;
                    const itemDesc  = ledItem?.description || ("Item #" + item_id);
                    return (
                      <div key={item_id} style={{marginBottom:10,background:T.surface,border:"1px solid "+T.b1,borderRadius:8,overflow:"hidden"}}>
                        {/* Item header */}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",background:T.surfaceB,borderBottom:"1px solid "+T.b1}}>
                          <div>
                            <span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{itemDesc}</span>
                            {boqQty > 0 && <span style={{fontSize:10.5,color:T.t4,marginLeft:8}}>· {boqQty} {ledItem?.unit||""} @ {fmtC(boqRate)}/unit = {fmtC(boqValue)}</span>}
                          </div>
                          <div style={{display:"flex",gap:5}}>
                            <button onClick={()=>{ setMsForm(p=>({...p,kind:"rate",wo_item_id:item_id})); setShowSetMs(true); }} title="Edit schedule"
                              style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:5,width:24,height:24,fontSize:11,cursor:"pointer",lineHeight:1}}>✎</button>
                            <button onClick={()=>deleteRateScheduleSub(item_id, itemDesc)} title="Delete"
                              style={{background:T.redL,border:"1px solid "+T.redM,color:T.red,borderRadius:5,width:24,height:24,fontSize:11,cursor:"pointer",lineHeight:1}}>🗑</button>
                          </div>
                        </div>
                        {/* Billed / Remaining progress */}
                        {ledItem && (
                          <div style={{padding:"8px 14px",background:T.surfaceB,borderBottom:"1px solid "+T.b1}}>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:6}}>
                              {[
                                {l:"Total (WO)",v:`${boqQty} ${ledItem.unit||""}`,v2:fmtC(boqValue),  c:T.t1},
                                {l:"Billed",    v:`${billedQty} ${ledItem.unit||""}`,v2:fmtC(billedVal),c:billedQty>0?T.amb:T.t4},
                                {l:"Remaining", v:`${remainQty} ${ledItem.unit||""}`,v2:fmtC(remainVal),c:remainQty>0?T.grn:T.t4},
                              ].map(s=>(
                                <div key={s.l}>
                                  <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px"}}>{s.l}</div>
                                  <div style={{fontSize:12,fontWeight:700,color:s.c}}>{s.v}</div>
                                  <div style={{fontSize:10.5,color:s.c}}>{s.v2}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{flex:1,height:5,background:T.b1,borderRadius:3,overflow:"hidden"}}>
                                <div style={{width:pctBilled+"%",height:"100%",background:isFull?T.amb:(pctBilled>=50?T.blu:T.grn),transition:"width .3s"}}/>
                              </div>
                              <span style={{fontSize:10.5,fontWeight:700,color:isFull?T.amb:T.t3,minWidth:42,textAlign:"right"}}>
                                {isFull ? "✓ FULL" : pctBilled.toFixed(0)+"%"}
                              </span>
                            </div>
                          </div>
                        )}
                        {/* Milestone rows */}
                        <div style={{padding:"0 14px 8px"}}>
                          <div style={{display:"grid",gridTemplateColumns:"26px 1fr 70px 80px 100px",gap:6,padding:"6px 0 4px",borderBottom:"1px solid "+T.b1}}>
                            {["#","Stage","Qty","Rate","Bill Value"].map((h,i)=>(
                              <span key={h} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:i>=2?"right":"left"}}>{h}</span>
                            ))}
                          </div>
                          {ms.map(m=>{
                            const mLed    = ledgerByMsId[m.id] || null;
                            const mBill   = mLed ? Number(mLed.billed_qty)    : 0;
                            const mRem    = mLed ? Number(mLed.remaining_qty) : 0;
                            const mSt     = mLed?.status || "pending";
                            const linked  = linkedTasks[m.id];
                            const mQty    = boqQty;
                            const mRate   = Number(m.inc_rate) || 0;
                            const billVal = mQty * mRate;
                            return (
                              <div key={m.id} style={{padding:"5px 0",borderBottom:"1px solid "+T.b1}}>
                                <div style={{display:"grid",gridTemplateColumns:"26px 1fr 70px 80px 100px",gap:6,alignItems:"center"}}>
                                  <span style={{color:T.t4,fontSize:12}}>{(m.seq||0)+1}</span>
                                  <span style={{color:T.t1,fontWeight:600,fontSize:12}}>{m.name}</span>
                                  <span style={{color:T.t2,textAlign:"right",fontSize:11}}>{mQty}</span>
                                  <span style={{color:T.t2,textAlign:"right",fontSize:11}}>{fmtC(mRate)}</span>
                                  <span style={{color:T.grn,textAlign:"right",fontWeight:700,fontSize:11}}>{fmtC(billVal)}</span>
                                </div>
                                {mLed && mBill > 0 && (
                                  <div style={{paddingLeft:26,paddingTop:2,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                                    <span style={{padding:"1px 7px",fontSize:10,fontWeight:700,borderRadius:10,
                                      background:mSt==="fully_billed"?"#FEF3C7":T.grnL,
                                      color:mSt==="fully_billed"?"#92400E":T.grn,
                                      border:"1px solid "+(mSt==="fully_billed"?"#FCD34D":T.grnM)}}>
                                      {mSt==="fully_billed"?"✓ FULLY BILLED":"PARTIAL"}
                                    </span>
                                    <span style={{fontSize:10.5,color:T.t3}}>Billed <b style={{color:T.amb}}>{mBill}</b> = <b style={{color:T.amb}}>{fmtC(mBill*mRate)}</b></span>
                                    {mRem>0&&<span style={{fontSize:10.5,color:T.t3}}>· Remaining <b style={{color:T.grn}}>{mRem}</b> = <b style={{color:T.grn}}>{fmtC(mRem*mRate)}</b></span>}
                                  </div>
                                )}
                                <div style={{paddingLeft:26,paddingTop:4,paddingBottom:2,display:"flex",alignItems:"center",gap:8}}>
                                  {linked ? (<>
                                    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 8px",borderRadius:14,
                                      background:linked.eligible?"#DCFCE7":T.bluL,
                                      border:"1px solid "+(linked.eligible?"#86EFAC":T.bluM),
                                      fontSize:10.5,fontWeight:600,color:linked.eligible?"#15803D":T.blu}}>
                                      🔗 {linked.task_name}
                                      <span style={{color:linked.eligible?"#15803D":T.t3,fontWeight:500}}>· {linked.progress}% / trigger @ {linked.trigger_pct}%</span>
                                      {linked.eligible&&<span style={{fontSize:10}}>✓ ready to bill</span>}
                                    </span>
                                    <button onClick={()=>openTaskPickerSub(m.id)} style={{background:"none",border:"none",color:T.t3,fontSize:11,cursor:"pointer",padding:"0 4px"}}>✎</button>
                                    <button onClick={()=>unlinkTaskSub(m.id)} style={{background:"none",border:"none",color:T.red,fontSize:12,cursor:"pointer",padding:"0 4px"}}>×</button>
                                  </>) : (
                                    <button onClick={()=>openTaskPickerSub(m.id)}
                                      style={{background:"transparent",border:"1px dashed "+T.b1,color:T.t3,borderRadius:14,padding:"3px 10px",fontSize:10.5,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}>
                                      🔗 Link to task
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  };

                  // ── SECTION-GROUPED RENDER (mirrors Estimate hierarchy) ───────
                  // Build sections from selWo.sections (same structure WO detail returns)
                  const woSections = selWo.sections || [];
                  const woUnsectioned = (selWo.unsectioned || []).filter(it => itemsWithMs.has(it.id));

                  // Any section that has at least one item with milestones
                  const sectionsToRender = woSections
                    .map(sec => ({
                      ...sec,
                      _msItems: (sec.items || []).filter(it => itemsWithMs.has(it.id)),
                    }))
                    .filter(sec => sec._msItems.length > 0);

                  // If no sections structure (all unsectioned), fall back to flat render
                  if (!sectionsToRender.length && !woUnsectioned.length) {
                    // Fallback: render from rate_by_item map directly
                    return Object.entries(woMilestones.rate_by_item || {})
                      .filter(([,ms]) => ms && ms.length)
                      .map(([itemId, ms]) => renderItemCard(parseInt(itemId), ms));
                  }

                  return (<>
                    {sectionsToRender.map(sec => {
                      // Section-level totals from ledger
                      const secTotal = sec._msItems.reduce((s, it) => {
                        const l = ledgerItems[it.id];
                        return s + (l ? Number(l.item_qty) * Number(l.item_rate) : 0);
                      }, 0);
                      return (
                        <div key={sec.id || sec.title} style={{marginBottom:16}}>
                          {/* Section header — blue, same as Estimate */}
                          <div style={{
                            padding:"8px 14px",
                            background:"#1E3A5F",
                            borderRadius:"6px 6px 0 0",
                            display:"flex",justifyContent:"space-between",alignItems:"center",
                            marginBottom:0,
                          }}>
                            <span style={{fontSize:12,fontWeight:700,color:"white",textTransform:"uppercase",letterSpacing:".5px"}}>
                              {sec.title}
                            </span>
                            {secTotal > 0 && (
                              <span style={{fontSize:12,fontWeight:700,color:"#93C5FD"}}>{fmtC(secTotal)}</span>
                            )}
                          </div>
                          {/* Items in this section */}
                          <div style={{border:"1px solid #BFDBFE",borderTop:"none",borderRadius:"0 0 6px 6px",overflow:"hidden",padding:"10px 10px 4px"}}>
                            {sec._msItems.map(it => {
                              const ms = woMilestones.rate_by_item[it.id] || [];
                              return renderItemCard(it.id, ms);
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {/* Unsectioned items */}
                    {woUnsectioned.length > 0 && (
                      <div style={{marginBottom:16}}>
                        <div style={{padding:"8px 14px",background:T.slt,borderRadius:"6px 6px 0 0",display:"flex",justifyContent:"space-between"}}>
                          <span style={{fontSize:12,fontWeight:700,color:"white",textTransform:"uppercase",letterSpacing:".5px"}}>Other Items</span>
                        </div>
                        <div style={{border:"1px solid "+T.b1,borderTop:"none",borderRadius:"0 0 6px 6px",padding:"10px 10px 4px"}}>
                          {woUnsectioned.map(it => renderItemCard(it.id, woMilestones.rate_by_item[it.id]||[]))}
                        </div>
                      </div>
                    )}
                  </>);
                })()}

                {/* PERCENT milestones */}
                {selWo.billing_method==="milestone_percent" && (
                  <div style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,padding:"12px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>Payment Milestones (% of WO value)</div>
                      {woMilestones.percent.length > 0 && (
                        <div style={{display:"flex",gap:5}}>
                          <button onClick={()=>{ setMsForm(p=>({...p,kind:"percent"})); setShowSetMs(true); }} title="Edit"
                            style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:5,width:26,height:26,fontSize:12,cursor:"pointer",lineHeight:1}}>✎</button>
                          <button onClick={deletePercentScheduleSub} title="Delete"
                            style={{background:T.redL,border:"1px solid "+T.redM,color:T.red,borderRadius:5,width:26,height:26,fontSize:12,cursor:"pointer",lineHeight:1}}>🗑</button>
                        </div>
                      )}
                    </div>
                    {woMilestones.percent.length === 0 && <div style={{fontSize:11.5,color:T.t4,fontStyle:"italic"}}>No milestones set. Use + Set Schedule.</div>}
                    {woMilestones.percent.length > 0 && (
                      <div style={{display:"grid",gridTemplateColumns:"30px 1fr 80px 130px",gap:6,padding:"4px 0",borderBottom:"1px solid "+T.b1,marginBottom:4}}>
                        {["#","Milestone","%","Amount"].map(h=><span key={h} style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
                      </div>
                    )}
                    {woMilestones.percent.map(m=>{
                      const mLed = billingLedger?.mode==="milestone_percent"
                        ? (billingLedger.stages||[]).find(s=>s.milestone_id===m.id) : null;
                      const billAmt = mLed ? Number(mLed.billed_amount) : 0;
                      const remAmt  = mLed ? Number(mLed.remaining_amount) : Number(m.amount)||0;
                      const mSt     = mLed?.status || "pending";
                      return (
                        <div key={m.id} style={{padding:"6px 0",borderBottom:"1px solid "+T.b1}}>
                          <div style={{display:"grid",gridTemplateColumns:"30px 1fr 80px 130px",gap:6,fontSize:12,alignItems:"center"}}>
                            <span style={{color:T.t4}}>{(m.seq||0)+1}</span>
                            <span style={{color:T.t1}}>{m.name}</span>
                            <span style={{color:T.t2,textAlign:"right",paddingRight:8}}>{parseFloat(m.pct)}%</span>
                            <span style={{color:T.grn,textAlign:"right",fontWeight:600}}>{fmtC(m.amount)}</span>
                          </div>
                          {mLed && billAmt > 0 && (
                            <div style={{paddingLeft:30,paddingTop:2,display:"flex",gap:8,alignItems:"center"}}>
                              <span style={{padding:"1px 7px",fontSize:10,fontWeight:700,borderRadius:10,
                                background:mSt==="fully_billed"?"#FEF3C7":T.grnL,
                                color:mSt==="fully_billed"?"#92400E":T.grn,
                                border:"1px solid "+(mSt==="fully_billed"?"#FCD34D":T.grnM)}}>
                                {mSt==="fully_billed"?"✓ FULLY BILLED":"PARTIAL"}
                              </span>
                              <span style={{fontSize:10.5,color:T.t3}}>Billed <b style={{color:T.amb}}>{fmtC(billAmt)}</b>{remAmt>0 && <> · Remaining <b style={{color:T.grn}}>{fmtC(remAmt)}</b></>}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* RA BILLS TAB */}
            {subTab==="bills"&&(
              <div>
                <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:12}}>
                  <button onClick={()=>{setManualBillForm({bill_date:localYMD(),remark:"",items:[{description:"",qty:"",rate:""}]});setShowManualRaBill(true);}}
                    style={{background:"white",color:"#7C3AED",border:"2px dashed #7C3AED",borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    📝 Manual Bill
                  </button>
                  <button onClick={()=>setShowNewBill(true)}
                    style={{background:T.blu,color:"white",border:"none",borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    + New RA Bill
                  </button>
                </div>
                {bills.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No bills raised yet</div>}
                {bills.map(b=>{
                  const stC=b.status==="Paid"?T.grn:b.status==="Approved"?T.blu:b.status==="Submitted"?T.amb:b.status==="Draft"?"#7C3AED":T.t4;
                  const isAutoDraft = b.source==="auto" && b.status==="Draft";
                  return(
                    <div key={b.id} style={{background:T.surface,border:isAutoDraft?"1.5px solid #C4B5FD":"1px solid "+T.b1,borderRadius:8,padding:"12px 14px",marginBottom:8,borderLeft:"3px solid "+stC}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{b.bill_no}</span>
                          {b.source==="auto" && <span style={{fontSize:9.5,fontWeight:700,padding:"2px 6px",borderRadius:3,background:"#EDE9FE",color:"#6D28D9",border:"1px solid #C4B5FD"}}>🤖 AUTO</span>}
                          {b.source==="free_form" && <span style={{fontSize:9.5,fontWeight:700,padding:"2px 6px",borderRadius:3,background:"#F3E8FF",color:"#7C3AED",border:"1px solid #C4B5FD"}}>📝 MANUAL</span>}
                          {b.over_bill_mode==1 && <span title={b.over_bill_reason||"Over-bill RA bill"} style={{fontSize:9.5,fontWeight:700,padding:"2px 6px",borderRadius:3,background:"#FEE2E2",color:"#991B1B",border:"1px solid #FCA5A5"}}>🔴 OVER-BILL</span>}
                          <span style={{fontSize:10.5,color:T.t4}}>{b.bill_date?new Date(b.bill_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"—"}</span>
                        </div>
                        <span style={{fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:4,background:stC+"22",color:stC}}>{b.status}</span>
                      </div>
                      {isAutoDraft && (
                        <div style={{padding:"7px 10px",background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:6,marginBottom:8,fontSize:11,color:"#5B21B6",lineHeight:1.45}}>
                          ⏳ Auto-generated from task progress. Review and confirm before submitting.
                        </div>
                      )}
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8}}>
                        {[{l:"Gross",v:fmtC(b.gross_amount),c:T.t1},{l:"Retention",v:fmtC(b.retention_amt),c:T.amb},{l:"TDS",v:fmtC(b.tds_amt),c:T.red},{l:"Net Payable",v:fmtC(b.net_payable),c:T.grn}].map(s=>(
                          <div key={s.l} style={{textAlign:"center",background:T.surfaceB,borderRadius:6,padding:"6px 8px"}}>
                            <div style={{fontSize:9,color:T.t4,textTransform:"uppercase"}}>{s.l}</div>
                            <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                        {b.status==="Draft"&&<button onClick={async()=>{await api.patch("/subcon/ra-bills/"+b.id+"/status",{status:"Submitted"});selectWo(selWo);}} style={{flex:1,minWidth:100,padding:"6px",borderRadius:5,background:T.blu,color:"white",border:"none",fontSize:11,fontWeight:700,cursor:"pointer"}}>✓ Confirm & Submit</button>}
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
                        {/* Over-bill banner — shown when this RA bill has over_bill_mode=1 */}
                        {b.over_bill_mode==1 && (
                          <div style={{margin:"0 0 12px",padding:"12px 14px",borderRadius:8,background:"#FEF2F2",border:"1px solid #FCA5A5"}}>
                            <div style={{fontSize:12,fontWeight:800,color:"#991B1B",letterSpacing:".3px",textTransform:"uppercase",marginBottom:5,display:"flex",alignItems:"center",gap:6}}>
                              🔴 OVER-BILL RA BILL
                            </div>
                            <div style={{fontSize:11.5,color:"#7F1D1D",lineHeight:1.5}}>
                              <b>Reason:</b> {b.over_bill_reason || "(no reason recorded)"}
                            </div>
                            <div style={{fontSize:10,color:"#991B1B",marginTop:6,fontStyle:"italic"}}>
                              Quantities in this bill exceed the Work Order scope. Approved by project admin.
                            </div>
                          </div>
                        )}
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
                          {(items||[]).map(it=>{
                            const isFree = !it.wo_item_id;
                            return (
                            <div key={it.id} style={{display:"grid",gridTemplateColumns:"2fr 50px 64px 64px 64px 70px 80px",padding:"8px 10px",gap:6,borderTop:`1px solid ${T.b1}`,alignItems:"center"}}>
                              <div style={{fontSize:11.5,color:T.t1}}>{it.description}</div>
                              <div style={{fontSize:11,color:T.t3}}>{it.unit||""}</div>
                              <div style={{fontSize:11,color:T.t2,textAlign:"right"}}>{isFree?"—":parseFloat(it.wo_qty||0)}</div>
                              <div style={{fontSize:11,color:T.t3,textAlign:"right"}}>{isFree?"—":parseFloat(it.prev_cumulative||0)>0?parseFloat(it.prev_cumulative||0):"—"}</div>
                              <div style={{fontSize:11,fontWeight:700,color:T.t1,textAlign:"right"}}>{parseFloat(it.this_bill_qty||0)}</div>
                              <div style={{fontSize:11,color:T.blu,textAlign:"right",fontWeight:600}}>₹{parseFloat(it.rate||0).toLocaleString("en-IN")}</div>
                              <div style={{fontSize:11,fontWeight:700,color:T.grn,textAlign:"right"}}>{fmtC(it.this_bill_amount)}</div>
                            </div>
                            );
                          })}
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

      {/* ── PAYMENT SCHEDULE SETUP MODAL ─────────────────────────────────
          Mirrors Estimate's "Payment Schedule Setup" exactly.
          Item-wise: multi-item picker from WO items + per-item cum_rate stages.
          % of WO Value: quick presets + distribute-remaining, identical to Estimate.
      */}
      {showSetMs && selWo && (() => {
        // Flatten all WO items for the picker
        const allWoItems = [
          ...(selWo.sections||[]).flatMap(sec => (sec.items||[]).map(it => ({ ...it, _sectionTitle: sec.title }))),
          ...(selWo.unsectioned||[]).map(it => ({ ...it, _sectionTitle: "" })),
        ];

        // ── Item-wise helpers ──
        const patchItemStages = (itemId, updater) => {
          setMsForm(p => {
            const cur = p.itemStages[itemId] || [{ seq:0, name:"", cum_rate:"" }];
            return { ...p, itemStages: { ...p.itemStages, [itemId]: updater(cur) } };
          });
        };
        const removePicked = (itemId) => {
          setMsForm(p => ({
            ...p,
            pickedItemIds: p.pickedItemIds.filter(id => id !== itemId),
            itemStages: Object.fromEntries(Object.entries(p.itemStages).filter(([k]) => parseInt(k) !== itemId)),
            expandedItemId: p.expandedItemId === itemId ? null : p.expandedItemId,
          }));
        };

        // ── % helpers ──
        const woValue = parseFloat(selWo.total_value) || 0;
        const pctSum = msForm.pctMs.reduce((s, m) => s + (parseFloat(m.pct) || 0), 0);
        const remaining = +(100 - pctSum).toFixed(2);
        const sumOk = Math.abs(pctSum - 100) < 0.01;
        const applyPreset = (splits, names) => setMsForm(p => ({
          ...p, pctMs: splits.map((pct, i) => ({ seq:i, name: names[i]||("Milestone "+(i+1)), pct: String(pct) }))
        }));
        const distributeRemaining = () => {
          if (Math.abs(remaining) < 0.01) return;
          const blanks = msForm.pctMs.filter(m => !parseFloat(m.pct)).length;
          setMsForm(p => {
            const arr = [...p.pctMs];
            if (blanks > 0) {
              const each = +(remaining / blanks).toFixed(2);
              return { ...p, pctMs: arr.map(m => parseFloat(m.pct) ? m : { ...m, pct: String(each) }) };
            }
            if (!arr.length) return p;
            const last = arr[arr.length-1];
            arr[arr.length-1] = { ...last, pct: String(+(parseFloat(last.pct||0) + remaining).toFixed(2)) };
            return { ...p, pctMs: arr };
          });
        };

        return (<>
          <div onClick={()=>setShowSetMs(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300}}/>
          <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:640,maxWidth:"95vw",maxHeight:"90vh",background:T.surface,borderRadius:12,zIndex:301,boxShadow:"0 24px 64px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column"}}>
            {/* Header */}
            <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:15,fontWeight:700,color:T.t1}}>Payment Schedule Setup</div>
              <button onClick={()=>setShowSetMs(false)} style={{background:"none",border:"none",fontSize:18,color:T.t3,cursor:"pointer"}}>×</button>
            </div>
            {/* Body */}
            <div style={{padding:"16px 18px",overflowY:"auto",flex:1}}>
              {/* Mode tabs */}
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <button onClick={()=>setMsForm(p=>({...p,kind:"rate"}))}
                  style={{padding:"7px 14px",borderRadius:6,background:msForm.kind==="rate"?T.blu:T.surfaceB,color:msForm.kind==="rate"?"white":T.t2,border:"1px solid "+(msForm.kind==="rate"?T.blu:T.b1),fontSize:12,fontWeight:700,cursor:"pointer"}}>📋 Item-wise</button>
                <button onClick={()=>setMsForm(p=>({...p,kind:"percent"}))}
                  style={{padding:"7px 14px",borderRadius:6,background:msForm.kind==="percent"?T.blu:T.surfaceB,color:msForm.kind==="percent"?"white":T.t2,border:"1px solid "+(msForm.kind==="percent"?T.blu:T.b1),fontSize:12,fontWeight:700,cursor:"pointer"}}>📊 % of WO Value</button>
              </div>

              {/* ── ITEM-WISE MODE ── */}
              {msForm.kind === "rate" && (() => {
                const pickedItems = (msForm.pickedItemIds||[]).map(id => allWoItems.find(x => x.id === id)).filter(Boolean);
                return (<>
                  {pickedItems.length === 0 ? (
                    <div style={{padding:"22px 16px",background:T.surfaceB,border:"1.5px dashed "+T.b1,borderRadius:8,textAlign:"center",marginBottom:12}}>
                      <div style={{fontSize:12.5,color:T.t3,marginBottom:8}}>No items picked yet</div>
                      <button onClick={()=>{ setWoItemPickerSearch(""); setWoItemPickerOpen(true); }}
                        style={{background:T.blu,color:"white",border:"none",borderRadius:6,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                        📋 Pick Items from WO
                      </button>
                    </div>
                  ) : (
                    <div style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,gap:8}}>
                        <span style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px"}}>
                          Picked Items ({pickedItems.length})
                        </span>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>{
                              setMsForm(p => {
                                const next = { ...p.itemStages };
                                for (const itm of pickedItems) {
                                  next[itm.id] = [{ seq:0, name:"Complete", cum_rate: String(parseFloat(itm.rate)||0) }];
                                }
                                return { ...p, itemStages: next };
                              });
                            }}
                            title="Each item → 1 milestone at full rate"
                            style={{background:"#FEF3C7",color:"#92400E",border:"1px dashed #FCD34D",borderRadius:5,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                            ✓ All = 1 milestone each
                          </button>
                          <button onClick={()=>{ setWoItemPickerSearch(""); setWoItemPickerOpen(true); }}
                            style={{background:T.bluL,color:T.blu,border:"1px solid "+T.bluM,borderRadius:5,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                            + Pick More
                          </button>
                        </div>
                      </div>

                      {pickedItems.map((it, idx) => {
                        const stages   = msForm.itemStages[it.id] || [{ seq:0, name:"", cum_rate:"" }];
                        const expanded = msForm.expandedItemId === it.id;
                        const filledCount = stages.filter(s => s.name && s.cum_rate).length;
                        const itemRate  = parseFloat(it.rate) || 0;
                        const itemQty   = parseFloat(it.qty)  || 0;
                        const itemTotal = itemRate * itemQty;
                        const lastCum   = parseFloat(stages[stages.length-1]?.cum_rate) || 0;
                        const balanced  = stages.length > 0 && Math.abs(lastCum - itemRate) <= 0.01;

                        return (
                          <div key={it.id} style={{border:"1px solid "+T.b1,borderRadius:7,marginBottom:6,overflow:"hidden",background:"white"}}>
                            {/* Accordion header */}
                            <div onClick={()=>setMsForm(p=>({...p,expandedItemId: expanded ? null : it.id}))}
                              style={{padding:"8px 12px",background: expanded ? T.bluL : T.surfaceB,borderBottom: expanded ? "1px solid "+T.bluM : "none",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                              <span style={{width:20,height:20,borderRadius:"50%",background:T.blu,color:"white",fontSize:10.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{idx+1}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:700,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.description}</div>
                                <div style={{fontSize:10,color:T.t4,marginTop:1}}>
                                  Item rate <b style={{color:T.t2}}>₹{itemRate}/unit</b> × {itemQty} {it.unit||""} = <b style={{color:T.t2}}>{fmtC(itemTotal)}</b>
                                  {filledCount > 0 && <span style={{color:T.grn,marginLeft:6,fontWeight:600}}>· {filledCount} stage{filledCount>1?"s":""}</span>}
                                  {filledCount > 0 && balanced && <span style={{color:T.grn,marginLeft:6,fontWeight:600}}>✓ balanced</span>}
                                </div>
                              </div>
                              <button onClick={(e)=>{ e.stopPropagation(); removePicked(it.id); }}
                                style={{background:T.redL,color:T.red,border:"none",borderRadius:4,width:22,height:22,fontSize:13,cursor:"pointer"}}>×</button>
                              <span style={{fontSize:10,color:T.t4}}>{expanded ? "▴" : "▾"}</span>
                            </div>

                            {expanded && (
                              <div style={{padding:"10px 12px"}}>
                                <div style={{display:"grid",gridTemplateColumns:"30px 1fr 130px 100px 30px",gap:6,marginBottom:4}}>
                                  {["#","Stage Name","Cum Rate ₹/unit","Stage Value",""].map((h,i)=>(
                                    <span key={h} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:i>=2?"right":"left"}}>{h}</span>
                                  ))}
                                </div>
                                {stages.map((m, mi) => {
                                  const prevCum = mi > 0 ? (parseFloat(stages[mi-1]?.cum_rate)||0) : 0;
                                  const incRate = (parseFloat(m.cum_rate)||0) - prevCum;
                                  const stageVal = incRate * itemQty;
                                  return (
                                    <div key={mi} style={{display:"grid",gridTemplateColumns:"30px 1fr 130px 100px 30px",gap:6,marginBottom:4,alignItems:"center"}}>
                                      <span style={{fontSize:11,color:T.t4}}>{mi+1}</span>
                                      <input value={m.name}
                                        onChange={e=>patchItemStages(it.id, arr=>{ const n=[...arr]; n[mi]={...n[mi],name:e.target.value}; return n; })}
                                        placeholder="e.g. Footing" style={{...inpStyle,padding:"5px 8px",fontSize:11.5}}/>
                                      <input type="number" value={m.cum_rate||""}
                                        onChange={e=>patchItemStages(it.id, arr=>{ const n=[...arr]; n[mi]={...n[mi],cum_rate:e.target.value}; return n; })}
                                        placeholder={"₹/unit (cum)"} style={{...inpStyle,padding:"5px 8px",fontSize:11.5,textAlign:"right"}}/>
                                      <span style={{fontSize:11.5,fontWeight:700,color:T.grn,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{stageVal>0?fmtC(stageVal):"—"}</span>
                                      <button onClick={()=>patchItemStages(it.id, arr=>{ const n=arr.filter((_,i)=>i!==mi); return n.length?n:[{seq:0,name:"",cum_rate:""}]; })}
                                        style={{background:T.redL,color:T.red,border:"none",borderRadius:4,fontSize:13,cursor:"pointer"}}>×</button>
                                    </div>
                                  );
                                })}
                                {/* Live allocation bar */}
                                <div style={{marginTop:6,padding:"7px 10px",borderRadius:6,
                                  background:balanced?"#ECFDF5":T.surfaceB,
                                  border:"1px solid "+(balanced?T.grnM:T.b1),
                                  display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11}}>
                                  <span style={{color:balanced?"#065F46":T.t3,fontWeight:600}}>
                                    Last cum_rate: {fmtC(lastCum)} / {fmtC(itemRate)}
                                  </span>
                                  <span style={{fontWeight:700,color:balanced?T.grn:T.amb}}>
                                    {balanced ? "✓ Matches item rate" : `Diff: ${fmtC(Math.abs(lastCum - itemRate))}`}
                                  </span>
                                </div>
                                <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                                  <button onClick={()=>patchItemStages(it.id, arr=>[...arr, {seq:arr.length, name:"", cum_rate:""}])}
                                    style={{background:T.bluL,color:T.blu,border:"1px dashed "+T.bluM,borderRadius:4,padding:"4px 10px",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>
                                    + Add Stage
                                  </button>
                                  <button onClick={()=>patchItemStages(it.id, ()=>[{seq:0,name:"Complete",cum_rate:String(itemRate)}])}
                                    style={{background:"#FEF3C7",color:"#92400E",border:"1px dashed #FCD34D",borderRadius:4,padding:"4px 10px",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>
                                    ✓ Use whole item as 1 milestone
                                  </button>
                                  {templates.length > 0 && (
                                    <select onChange={async e=>{
                                        const tid = parseInt(e.target.value); if (!tid) return;
                                        e.target.value = "";
                                        await applyTemplateToItem(it.id, tid);
                                        setShowSetMs(false);
                                      }}
                                      style={{padding:"4px 8px",fontSize:10.5,borderRadius:4,border:"1px solid "+T.b1,background:"white",cursor:"pointer",color:T.t3}}>
                                      <option value="">Apply template…</option>
                                      {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>);
              })()}

              {/* ── % OF WO VALUE MODE ── (exact copy of Estimate) */}
              {msForm.kind === "percent" && (<>
                <div style={{padding:"7px 10px",background:T.surfaceB,borderRadius:6,fontSize:11,color:T.t3,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
                  <span>WO value</span>
                  <span style={{fontWeight:700,color:T.t1}}>{fmtC(woValue)}</span>
                </div>
                {/* Quick presets */}
                <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px"}}>Quick:</span>
                  {[
                    { label:"30 / 40 / 30",      splits:[30,40,30],     names:["Advance","On Progress","On Handover"] },
                    { label:"40 / 30 / 20 / 10", splits:[40,30,20,10],  names:["Booking","Slab","Finishing","Handover"] },
                    { label:"25 / 25 / 25 / 25", splits:[25,25,25,25],  names:["Stage 1","Stage 2","Stage 3","Stage 4"] },
                    { label:"50 / 50",            splits:[50,50],        names:["Advance","Completion"] },
                  ].map(p=>(
                    <button key={p.label} onClick={()=>applyPreset(p.splits,p.names)}
                      style={{background:"white",color:T.blu,border:"1px solid "+T.bluM,borderRadius:14,padding:"3px 9px",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                      {p.label}
                    </button>
                  ))}
                </div>
                {/* Table header */}
                <div style={{display:"grid",gridTemplateColumns:"40px 1fr 80px 120px 32px",gap:6,marginBottom:6}}>
                  {["#","Milestone Name","%","₹ amount",""].map(h=><span key={h} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
                </div>
                {msForm.pctMs.map((m, mi) => {
                  const pctVal = parseFloat(m.pct) || 0;
                  const amt    = (woValue * pctVal) / 100;
                  return (
                    <div key={mi} style={{display:"grid",gridTemplateColumns:"40px 1fr 80px 120px 32px",gap:6,marginBottom:4,alignItems:"center"}}>
                      <span style={{fontSize:12,color:T.t4,paddingTop:8}}>{mi+1}</span>
                      <input value={m.name} onChange={e=>{const arr=[...msForm.pctMs];arr[mi]={...arr[mi],name:e.target.value};setMsForm(p=>({...p,pctMs:arr}));}} placeholder="e.g. Foundation" style={inpStyle}/>
                      <input type="number" value={m.pct} onChange={e=>{const arr=[...msForm.pctMs];arr[mi]={...arr[mi],pct:e.target.value};setMsForm(p=>({...p,pctMs:arr}));}} placeholder="%" style={{...inpStyle,textAlign:"right"}}/>
                      <span style={{padding:"7px 10px",background:T.surfaceB,borderRadius:6,fontSize:12,fontWeight:600,color:T.t1,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtC(amt)}</span>
                      <button onClick={()=>{const arr=msForm.pctMs.filter((_,i)=>i!==mi);setMsForm(p=>({...p,pctMs:arr.length?arr:[{seq:0,name:"",pct:""}]}));}} style={{background:T.redL,color:T.red,border:"none",borderRadius:5,fontSize:14,cursor:"pointer"}}>×</button>
                    </div>
                  );
                })}
                <button onClick={()=>setMsForm(p=>({...p,pctMs:[...p.pctMs,{seq:p.pctMs.length,name:"",pct:""}]}))} style={{marginTop:6,background:T.bluL,color:T.blu,border:"1px dashed "+T.bluM,borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add Milestone</button>
                {/* Live total row */}
                <div style={{marginTop:12,padding:"9px 12px",borderRadius:7,
                  background: sumOk ? T.grnL : "#FFFBEB",
                  border:"1px solid "+(sumOk ? T.grnM : "#FCD34D"),
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11.5,fontWeight:700,color:sumOk?T.grn:"#92400E"}}>
                    {sumOk ? "✓ Total 100% — schedule covers full WO value"
                          : `Total ${pctSum.toFixed(2)}% — ${remaining>0?remaining.toFixed(2)+"% remaining":Math.abs(remaining).toFixed(2)+"% over"}`}
                  </span>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:12,fontWeight:700,color:sumOk?T.grn:"#92400E",fontVariantNumeric:"tabular-nums"}}>{fmtC(woValue*pctSum/100)}</span>
                    {!sumOk && Math.abs(remaining)>0.01 && (
                      <button onClick={distributeRemaining}
                        style={{background:"#FEF3C7",border:"1px solid #FCD34D",color:"#92400E",borderRadius:5,padding:"3px 9px",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>
                        {remaining>0?"↻ Distribute remaining":"↻ Trim excess"}
                      </button>
                    )}
                  </div>
                </div>
              </>)}
            </div>

            {/* Footer */}
            <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setShowSetMs(false)} style={{padding:"7px 16px",borderRadius:6,background:T.surfaceB,border:"1px solid "+T.b1,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
              <button onClick={submitMilestones} disabled={saving} style={{padding:"7px 18px",borderRadius:6,background:saving?T.t4:T.blu,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:saving?"default":"pointer"}}>{saving?"Saving…":"Save Schedule"}</button>
            </div>
          </div>
        </>);
      })()}

      {/* ── WO ITEM PICKER SIDE-SLIDE ────────────────────────────────────── */}
      {woItemPickerOpen && selWo && (() => {
        const q = woItemPickerSearch.trim().toLowerCase();
        const sections = (selWo.sections||[]).map(sec => {
          const items = (sec.items||[]).filter(it =>
            !q || (it.description||"").toLowerCase().includes(q)
          );
          return { title: sec.title, items };
        }).filter(s => s.items.length > 0);
        const unsect = (selWo.unsectioned||[]).filter(it =>
          !q || (it.description||"").toLowerCase().includes(q)
        );
        const totalFiltered = sections.reduce((n,s)=>n+s.items.length,0) + unsect.length;
        const togglePick = (itemId) => {
          setMsForm(p => {
            const isPicked = p.pickedItemIds.includes(itemId);
            if (isPicked) {
              return {
                ...p,
                pickedItemIds: p.pickedItemIds.filter(id => id !== itemId),
                itemStages: Object.fromEntries(Object.entries(p.itemStages).filter(([k])=>parseInt(k)!==itemId)),
              };
            }
            return {
              ...p,
              pickedItemIds: [...p.pickedItemIds, itemId],
              itemStages: { ...p.itemStages, [itemId]: p.itemStages[itemId] || [{ seq:0, name:"", cum_rate:"" }] },
              expandedItemId: p.expandedItemId || itemId,
            };
          });
        };
        const renderItem = (it) => {
          const pickIdx = msForm.pickedItemIds.indexOf(it.id);
          const isPicked = pickIdx >= 0;
          return (
            <div key={it.id} onClick={()=>togglePick(it.id)}
              style={{padding:"8px 18px",borderBottom:"1px solid "+T.b1,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:isPicked?"#EFF6FF":"white"}}
              onMouseEnter={e=>{ if(!isPicked) e.currentTarget.style.background="#F8FAFC"; }}
              onMouseLeave={e=>{ if(!isPicked) e.currentTarget.style.background="white"; }}>
              {isPicked ? (
                <span style={{width:22,height:22,borderRadius:"50%",background:T.blu,color:"white",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {pickIdx+1}
                </span>
              ) : (
                <span style={{width:22,height:22,borderRadius:4,border:"1.5px solid "+T.b1,flexShrink:0}}/>
              )}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.description}</div>
                <div style={{fontSize:10,color:T.t4,marginTop:1}}>{fmtC(it.rate)}/{it.unit} · qty {parseFloat(it.qty)||0}</div>
              </div>
            </div>
          );
        };
        return (<>
          <div onClick={()=>setWoItemPickerOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:320}}/>
          <div style={{position:"fixed",top:0,right:0,bottom:0,width:420,maxWidth:"95vw",background:"white",boxShadow:"-8px 0 24px rgba(0,0,0,0.2)",zIndex:321,display:"flex",flexDirection:"column"}}>
            {/* Header */}
            <div style={{padding:"14px 18px",background:T.t1,color:"white",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{fontSize:14,fontWeight:700}}>Pick Items for Schedule</div>
                <button onClick={()=>setWoItemPickerOpen(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.65)",fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
              </div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.55)"}}>
                {totalFiltered} item{totalFiltered===1?"":"s"}
                {(msForm.pickedItemIds||[]).length > 0 && <> · <span style={{color:"#FCD34D",fontWeight:600}}>{msForm.pickedItemIds.length} picked</span></>}
              </div>
            </div>
            {/* Search */}
            <div style={{padding:"10px 18px",borderBottom:"1px solid "+T.b1,flexShrink:0}}>
              <input value={woItemPickerSearch} onChange={e=>setWoItemPickerSearch(e.target.value)}
                placeholder="Search WO items…" autoFocus
                style={{width:"100%",padding:"7px 11px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            {/* List */}
            <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
              {totalFiltered === 0 && (
                <div style={{padding:"40px 20px",textAlign:"center",color:T.t4,fontSize:12.5}}>
                  {woItemPickerSearch ? `No items match "${woItemPickerSearch}"` : "No items in this WO"}
                </div>
              )}
              {sections.map(sec => (
                <div key={sec.title}>
                  <div style={{padding:"6px 18px",background:T.bluL,borderTop:"1px solid "+T.bluM,borderBottom:"1px solid "+T.bluM,fontSize:10,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".5px"}}>
                    {sec.title} · {sec.items.length}
                  </div>
                  {sec.items.map(renderItem)}
                </div>
              ))}
              {unsect.map(renderItem)}
            </div>
            {/* Footer */}
            <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:T.surfaceB}}>
              <button onClick={()=>setWoItemPickerOpen(false)}
                style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                Done
              </button>
              <span style={{fontSize:11.5,color:T.t3}}>{(msForm.pickedItemIds||[]).length} item{(msForm.pickedItemIds||[]).length===1?"":"s"} selected</span>
            </div>
          </div>
        </>);
      })()}

      {/* NEW WO MODAL */}
      {showNewWO&&(
        <NewWOModal
          subcons={subcons} setSubcons={setSubcons} projectId={projectId} project={project} fmtC={fmtC}
          inpStyle={inpStyle} lblStyle={lblStyle} saving={saving} setSaving={setSaving}
          onClose={()=>setShowNewWO(false)}
          onSaved={()=>{ setShowNewWO(false); loadWOs(); }}
        />
      )}

      {/* NEW RA BILL MODAL */}
      {showNewBill&&selWo&&(
        <NewRaBillModal wo={selWo} milestones={woMilestones}
          projectId={projectId} fmtC={fmtC} inpStyle={inpStyle} lblStyle={lblStyle}
          saving={saving}
          onClose={()=>setShowNewBill(false)} onSave={submitBill}/>
      )}

      {/* MANUAL (FREE-FORM) RA BILL MODAL */}
      {showManualRaBill && selWo && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"white",borderRadius:10,width:"min(640px,96vw)",maxHeight:"92vh",overflowY:"auto",padding:20,boxShadow:"0 20px 50px rgba(0,0,0,0.25)",border:"2px solid #7C3AED"}}>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#7C3AED"}}>📝 Manual RA Bill</div>
                <div style={{fontSize:11,color:"#6B7280",marginTop:2}}>Bill items NOT in the Work Order / BOQ scope</div>
              </div>
              <button onClick={()=>setShowManualRaBill(false)} style={{background:"none",border:"none",cursor:"pointer",color:"#6B7280",fontSize:20,lineHeight:1}}>×</button>
            </div>

            {/* Date + Remark */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10,marginBottom:14}}>
              <div>
                <label style={lblStyle}>Bill Date</label>
                <input type="date" value={manualBillForm.bill_date}
                  onChange={e=>setManualBillForm(p=>({...p,bill_date:e.target.value}))} style={inpStyle}/>
              </div>
              <div>
                <label style={lblStyle}>Remark / Notes</label>
                <input type="text" value={manualBillForm.remark}
                  onChange={e=>setManualBillForm(p=>({...p,remark:e.target.value}))}
                  style={inpStyle} placeholder="Optional notes..."/>
              </div>
            </div>

            {/* Line Items */}
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <label style={lblStyle}>Line Items</label>
                <button onClick={()=>setManualBillForm(p=>({...p,items:[...p.items,{description:"",qty:"",rate:""}]}))}
                  style={{background:"#F3E8FF",color:"#7C3AED",border:"1px solid #C4B5FD",borderRadius:5,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  + Add Row
                </button>
              </div>
              {/* Header row */}
              <div style={{display:"grid",gridTemplateColumns:"2fr 80px 80px 90px 28px",gap:6,padding:"5px 8px",background:"#1E293B",borderRadius:"6px 6px 0 0"}}>
                {["Description","Qty","Rate (₹)","Amount",""].map((h,i)=>(
                  <div key={h} style={{fontSize:8.5,fontWeight:700,color:"rgba(255,255,255,.6)",textTransform:"uppercase",textAlign:i>=1&&i<=3?"right":"left"}}>{h}</div>
                ))}
              </div>
              {manualBillForm.items.map((it,idx)=>{
                const qty  = parseFloat(it.qty)  || 0;
                const rate = parseFloat(it.rate) || 0;
                const amt  = qty * rate;
                return (
                  <div key={idx} style={{display:"grid",gridTemplateColumns:"2fr 80px 80px 90px 28px",gap:6,padding:"6px 8px",borderBottom:"1px solid #E2E8F0",alignItems:"center",background:"white"}}>
                    <input type="text" value={it.description} placeholder="Description of work"
                      onChange={e=>{const a=[...manualBillForm.items];a[idx]={...a[idx],description:e.target.value};setManualBillForm(p=>({...p,items:a}));}}
                      style={{...inpStyle,padding:"5px 7px",fontSize:11}}/>
                    <input type="number" value={it.qty} placeholder="0" min={0}
                      onChange={e=>{const a=[...manualBillForm.items];a[idx]={...a[idx],qty:e.target.value};setManualBillForm(p=>({...p,items:a}));}}
                      style={{...inpStyle,padding:"5px 7px",fontSize:11,textAlign:"right"}}/>
                    <input type="number" value={it.rate} placeholder="0" min={0}
                      onChange={e=>{const a=[...manualBillForm.items];a[idx]={...a[idx],rate:e.target.value};setManualBillForm(p=>({...p,items:a}));}}
                      style={{...inpStyle,padding:"5px 7px",fontSize:11,textAlign:"right"}}/>
                    <div style={{fontSize:12,fontWeight:700,color:amt>0?"#059669":"#9CA3AF",textAlign:"right",paddingRight:4}}>
                      {amt>0?fmtC(amt):"—"}
                    </div>
                    <button onClick={()=>{const a=manualBillForm.items.filter((_,i)=>i!==idx);setManualBillForm(p=>({...p,items:a.length?a:[{description:"",qty:"",rate:""}]}));}}
                      style={{background:"#FEE2E2",color:"#DC2626",border:"none",borderRadius:4,width:22,height:22,fontSize:14,cursor:"pointer",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                  </div>
                );
              })}
              {/* Total row */}
              {manualBillForm.items.some(it=>parseFloat(it.qty)>0&&parseFloat(it.rate)>0) && (
                <div style={{display:"grid",gridTemplateColumns:"2fr 80px 80px 90px 28px",gap:6,padding:"8px 8px",background:"#F0FDF4",borderRadius:"0 0 6px 6px",borderTop:"2px solid #BBF7D0"}}>
                  <div style={{fontSize:11.5,fontWeight:700,color:"#1E293B",gridColumn:"1/4"}}>Total</div>
                  <div style={{fontSize:13,fontWeight:800,color:"#059669",textAlign:"right"}}>
                    {fmtC(manualBillForm.items.reduce((s,it)=>s+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0))}
                  </div>
                  <div/>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
              <button onClick={()=>setShowManualRaBill(false)}
                style={{padding:"8px 18px",borderRadius:6,background:"#F1F5F9",color:"#475569",border:"1px solid #CBD5E1",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={submitManualRaBill} disabled={manualBillSaving}
                style={{padding:"8px 20px",borderRadius:6,background:manualBillSaving?"#A78BFA":"#7C3AED",color:"white",border:"none",fontSize:12,fontWeight:700,cursor:manualBillSaving?"not-allowed":"pointer"}}>
                {manualBillSaving?"Saving…":"💾 Save Manual Bill"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT RA BILL MODAL */}
      {showEditBillModal && editBill && (() => {
        // ── helpers to recompute net from current retention/TDS ──
        const recalcNet = (g, retPct, tdsPct) => {
          const retAmt = Math.round(g * retPct) / 100;
          const tdsAmt = Math.round((g - retAmt) * tdsPct) / 100;
          return { retention_amt: retAmt, tds_amt: tdsAmt, net_payable: Math.round((g - retAmt - tdsAmt) * 100) / 100 };
        };
        // Recompute gross from edited item cumulative qtys
        const recalcGross = (items) => {
          return items.reduce((s, it) => {
            const rate = parseFloat(it.rate || 0);
            const cum  = parseFloat(it._editCum ?? it.cumulative_qty ?? 0);
            const prev = parseFloat(it.prev_cumulative || 0);
            return s + Math.max(0, cum - prev) * rate;
          }, 0);
        };

        const editItems = (editBill.items || []).filter(it => it.is_active !== 0);
        const showItems = editItems.length > 0;

        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:T.surface,borderRadius:10,width:"min(640px,96vw)",maxHeight:"92vh",overflowY:"auto",padding:20,boxShadow:"0 20px 50px rgba(0,0,0,0.2)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontSize:14,fontWeight:700,color:T.t1}}>Edit RA Bill — {editBill.bill_no}</div>
                <button onClick={()=>{setShowEditBillModal(false);setEditBill(null);}} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,fontSize:18}}>×</button>
              </div>

              {/* Date + Status */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>
                  <label style={lblStyle}>Bill Date</label>
                  <input type="date" value={(editBill.bill_date||"").split("T")[0]}
                    onChange={e=>setEditBill(p=>({...p,bill_date:e.target.value}))} style={inpStyle}/>
                </div>
                <div>
                  <label style={lblStyle}>Status</label>
                  <SearchSelect value={editBill.status||"Submitted"} options={["Draft","Submitted","Approved","Rejected"]}
                    onChange={v=>setEditBill(p=>({...p,status:v}))} placeholder="Select status..."/>
                </div>
              </div>

              {/* ── Item Quantities ── */}
              {showItems && (
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.t2,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>
                    Item Quantities (cumulative)
                  </div>
                  <div style={{border:"1px solid "+T.b1,borderRadius:7,overflow:"hidden"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 85px 90px",gap:6,padding:"6px 10px",background:T.surfaceB,borderBottom:"1px solid "+T.b1}}>
                      {["Description","Unit","Prev Cum","This Cum ▼","This Bill Amt"].map((h,i)=>(
                        <span key={h} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:i>=2?"right":"left"}}>{h}</span>
                      ))}
                    </div>
                    {editItems.map((it,idx) => {
                      const prev    = parseFloat(it.prev_cumulative || 0);
                      const cumVal  = parseFloat(it._editCum ?? it.cumulative_qty ?? 0);
                      const rate    = parseFloat(it.rate || 0);
                      const thisQty = Math.max(0, cumVal - prev);
                      const amt     = Math.round(thisQty * rate * 100) / 100;
                      const overWO  = it.wo_qty && cumVal > parseFloat(it.wo_qty);
                      return (
                        <div key={it.id||idx} style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 85px 90px",gap:6,padding:"7px 10px",borderBottom:"1px solid "+T.b1,alignItems:"center",background:overWO?"#FEF2F2":"white"}}>
                          <span style={{fontSize:11.5,color:T.t1,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.description||("Item #"+it.wo_item_id)}</span>
                          <span style={{fontSize:11,color:T.t4,textAlign:"right"}}>{it.unit||""}</span>
                          <span style={{fontSize:11,color:T.t3,textAlign:"right"}}>{prev}</span>
                          <input type="number" value={it._editCum ?? it.cumulative_qty ?? ""}
                            onChange={e => {
                              const newItems = editItems.map((x,i) => i===idx ? {...x, _editCum: e.target.value} : x);
                              const newGross = Math.round(recalcGross(newItems) * 100) / 100;
                              const retPct = parseFloat(editBill.retention_pct ?? 0);
                              const tdsPct = parseFloat(editBill.tds_pct ?? 0);
                              setEditBill(p => ({
                                ...p,
                                items: newItems,
                                gross_amount: newGross,
                                ...recalcNet(newGross, retPct, tdsPct),
                              }));
                            }}
                            style={{...inpStyle,padding:"5px 7px",fontSize:11,textAlign:"right",
                              borderColor: overWO ? T.red : T.b1,
                              color: overWO ? T.red : T.t1}}/>
                          <span style={{fontSize:12,fontWeight:700,color:amt>0?T.grn:T.t4,textAlign:"right"}}>{amt>0?fmtC(amt):"—"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Gross / Retention / TDS / Net */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>
                  <label style={lblStyle}>Gross Amount</label>
                  <input type="number" value={editBill.gross_amount ?? 0}
                    onChange={e=>{
                      const g = parseFloat(e.target.value) || 0;
                      const retPct = parseFloat(editBill.retention_pct ?? 0);
                      const tdsPct = parseFloat(editBill.tds_pct ?? 0);
                      setEditBill(p=>({...p, gross_amount:g, ...recalcNet(g, retPct, tdsPct)}));
                    }} style={inpStyle}/>
                </div>
                <div>
                  <label style={lblStyle}>Net Payable (auto)</label>
                  <input type="number" value={editBill.net_payable ?? 0} disabled
                    style={{...inpStyle,background:T.surfaceB,color:T.t3,fontWeight:700}}/>
                </div>
                <div>
                  <label style={lblStyle}>Retention %</label>
                  <input type="number" min={0} max={100}
                    value={editBill.retention_pct ?? ""}
                    onChange={e=>{
                      const r = parseFloat(e.target.value) || 0;
                      const g = parseFloat(editBill.gross_amount) || 0;
                      const tdsPct = parseFloat(editBill.tds_pct ?? 0);
                      setEditBill(p=>({...p, retention_pct:r, ...recalcNet(g, r, tdsPct)}));
                    }}
                    placeholder="0"
                    style={inpStyle}/>
                </div>
                <div>
                  <label style={lblStyle}>TDS %</label>
                  <input type="number" min={0} max={100}
                    value={editBill.tds_pct ?? ""}
                    onChange={e=>{
                      const t = parseFloat(e.target.value) || 0;
                      const g = parseFloat(editBill.gross_amount) || 0;
                      const retPct = parseFloat(editBill.retention_pct ?? 0);
                      setEditBill(p=>({...p, tds_pct:t, ...recalcNet(g, retPct, t)}));
                    }}
                    placeholder="0"
                    style={inpStyle}/>
                </div>
              </div>

              {/* Remark */}
              <div style={{marginBottom:14}}>
                <label style={lblStyle}>Remark / Notes</label>
                <textarea value={editBill.remark||""} onChange={e=>setEditBill(p=>({...p,remark:e.target.value}))}
                  style={{...inpStyle,minHeight:55,resize:"vertical"}} placeholder="Optional notes..."/>
              </div>

              {/* Summary bar */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14,padding:"10px",background:T.surfaceB,borderRadius:7,border:"1px solid "+T.b1}}>
                {[
                  {l:"Gross",  v:fmtC(editBill.gross_amount||0),    c:T.t1},
                  {l:"Ret.",   v:fmtC(editBill.retention_amt||0),   c:T.amb},
                  {l:"TDS",    v:fmtC(editBill.tds_amt||0),         c:T.red},
                  {l:"Net Pay",v:fmtC(editBill.net_payable||0),     c:T.grn},
                ].map(s=>(
                  <div key={s.l} style={{textAlign:"center"}}>
                    <div style={{fontSize:9,color:T.t4,textTransform:"uppercase",fontWeight:700}}>{s.l}</div>
                    <div style={{fontSize:13,fontWeight:800,color:s.c,fontVariantNumeric:"tabular-nums"}}>{s.v}</div>
                  </div>
                ))}
              </div>

              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setShowEditBillModal(false);setEditBill(null);}}
                  style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>
                  Cancel
                </button>
                <button onClick={async()=>{
                    setEditBillSaving(true);
                    try {
                      const payload = {
                        bill_date:      editBill.bill_date,
                        gross_amount:   parseFloat(editBill.gross_amount)   || 0,
                        retention_pct:  parseFloat(editBill.retention_pct)  ?? 0,
                        retention_amt:  parseFloat(editBill.retention_amt)  || 0,
                        tds_pct:        parseFloat(editBill.tds_pct)        ?? 0,
                        tds_amt:        parseFloat(editBill.tds_amt)        || 0,
                        net_payable:    parseFloat(editBill.net_payable)    || 0,
                        status:         editBill.status,
                        remark:         editBill.remark,
                      };
                      // Send edited items only if quantities were changed
                      const editedItems = editItems.filter(it => it._editCum !== undefined);
                      if (editedItems.length > 0) {
                        payload.items = editItems.map(it => ({
                          milestone_id:    it.milestone_id || null,
                          wo_item_id:      it.wo_item_id   || null,
                          cumulative_qty:  parseFloat(it._editCum ?? it.cumulative_qty ?? 0),
                          rate:            parseFloat(it.rate || 0),
                        }));
                      }
                      const res = await api.put("/subcon/ra-bills/"+editBill.id, payload, { timeoutMs: 30000 });
                      if (res.success) {
                        setShowEditBillModal(false); setEditBill(null); selectWo(selWo);
                      } else alert(res.message || "Update failed");
                    } catch(e) { alert("Error: "+e.message); }
                    setEditBillSaving(false);
                  }} disabled={editBillSaving}
                  style={{flex:2,padding:"9px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",opacity:editBillSaving?0.6:1}}>
                  {editBillSaving ? "Saving…" : "💾 Save Changes"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* ── TASK PICKER DRAWER (link milestone to project task) ─────────── */}
      {taskPickerFor !== null && (() => {
        const q = taskPickerSearch.trim().toLowerCase();
        const byId = {};
        for (const t of projectTasksSub) byId[t.id] = { ...t, _children: [] };
        const roots = [];
        for (const t of projectTasksSub) {
          const node = byId[t.id];
          if (t.parent_id && byId[t.parent_id]) byId[t.parent_id]._children.push(node);
          else roots.push(node);
        }
        const displayRows = [];
        if (q) {
          for (const t of projectTasksSub) {
            if ((t.title||t.name||"").toLowerCase().includes(q)) displayRows.push({ node: byId[t.id], depth: 0 });
          }
        } else {
          const walk = (node, depth) => {
            displayRows.push({ node, depth });
            if (node._children.length && taskPickerExpSub[node.id]) {
              for (const c of node._children) walk(c, depth + 1);
            }
          };
          for (const r of roots) walk(r, 0);
        }
        return (<>
          <div onClick={()=>setTaskPickerFor(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:330}}/>
          <div style={{position:"fixed",top:0,right:0,bottom:0,width:440,maxWidth:"95vw",background:"white",boxShadow:"-8px 0 24px rgba(0,0,0,0.2)",zIndex:331,display:"flex",flexDirection:"column"}}>
            <div style={{padding:"14px 18px",background:T.t1,color:"white",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{fontSize:14,fontWeight:700}}>Link to Project Task</div>
                <button onClick={()=>setTaskPickerFor(null)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.65)",fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
              </div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.55)"}}>Pick a task and set the % completion that triggers billing</div>
            </div>
            {/* Trigger % */}
            <div style={{padding:"12px 18px",background:T.surfaceB,borderBottom:"1px solid "+T.b1,flexShrink:0}}>
              <label style={{fontSize:10,fontWeight:700,color:T.t3,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".4px"}}>Trigger at task completion %</label>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="range" min={0} max={100} step={5} value={linkTrigPct} onChange={e=>setLinkTrigPct(parseInt(e.target.value)||0)} style={{flex:1}}/>
                <input type="number" min={0} max={100} value={linkTrigPct} onChange={e=>setLinkTrigPct(Math.min(100,Math.max(0,parseInt(e.target.value)||0)))}
                  style={{width:60,padding:"4px 7px",borderRadius:5,border:"1.5px solid "+T.b1,fontSize:12,textAlign:"right",fontFamily:"inherit"}}/>
                <span style={{fontSize:12,fontWeight:700,color:T.blu}}>%</span>
              </div>
              <div style={{display:"flex",gap:5,marginTop:6}}>
                {[25,50,75,100].map(p=>(
                  <button key={p} onClick={()=>setLinkTrigPct(p)}
                    style={{flex:1,background:linkTrigPct===p?T.blu:"white",color:linkTrigPct===p?"white":T.t3,border:"1px solid "+(linkTrigPct===p?T.blu:T.b1),borderRadius:4,padding:"3px 6px",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                    {p}%
                  </button>
                ))}
              </div>
            </div>
            {/* Search */}
            <div style={{padding:"10px 18px",borderBottom:"1px solid "+T.b1,flexShrink:0}}>
              <input value={taskPickerSearch} onChange={e=>setTaskPickerSearch(e.target.value)}
                placeholder="Search tasks…" autoFocus
                style={{width:"100%",padding:"7px 11px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            {/* Task list */}
            <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
              {projectTasksSub.length === 0 && (
                <div style={{padding:"36px 20px",textAlign:"center",color:T.t3,fontSize:12.5}}>No tasks in this project yet.</div>
              )}
              {projectTasksSub.length > 0 && displayRows.length === 0 && (
                <div style={{padding:"30px 20px",textAlign:"center",color:T.t4,fontSize:12.5}}>No tasks match "{taskPickerSearch}"</div>
              )}
              {displayRows.map(({ node: t, depth }) => {
                const isSel = linkSelTaskId === t.id;
                const taskName = t.title || t.name;
                const progress = Number(t.progress) || 0;
                const stC2 = t.status==="Completed"?T.grn:t.status==="Ongoing"?T.blu:t.status==="Hold"?T.red:T.t4;
                const hasKids = (t._children||[]).length > 0;
                return (
                  <div key={t.id} onClick={()=>setLinkSelTaskId(t.id)}
                    style={{padding:"10px 18px 10px "+(18+depth*18)+"px",borderBottom:"1px solid "+T.b1,cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:isSel?"#EFF6FF":"white"}}
                    onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background="#F8FAFC"; }}
                    onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.background="white"; }}>
                    {hasKids ? (
                      <button onClick={e=>{ e.stopPropagation(); setTaskPickerExpSub(p=>({...p,[t.id]:!p[t.id]})); }}
                        style={{background:"none",border:"none",cursor:"pointer",color:T.t3,fontSize:10,width:16,flexShrink:0,padding:0}}>
                        {taskPickerExpSub[t.id]?"▼":"▶"}
                      </button>
                    ) : <span style={{width:16,flexShrink:0}}/>}
                    <span style={{width:18,height:18,borderRadius:"50%",border:"2px solid "+(isSel?T.blu:T.b1),background:isSel?T.blu:"white",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {isSel && <span style={{width:6,height:6,borderRadius:"50%",background:"white"}}/>}
                    </span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12.5,fontWeight:hasKids?700:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{taskName}</div>
                      <div style={{fontSize:10,color:T.t4,marginTop:2,display:"flex",gap:6}}>
                        <span style={{padding:"1px 6px",borderRadius:3,background:stC2+"22",color:stC2,fontWeight:600}}>{t.status||"Not Started"}</span>
                        <span>· {progress}%</span>
                      </div>
                      <div style={{marginTop:5,height:4,background:T.b1,borderRadius:2,overflow:"hidden"}}>
                        <div style={{width:progress+"%",height:"100%",background:progress>=linkTrigPct?T.grn:T.blu,transition:"width .2s"}}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Footer */}
            <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:T.surfaceB,gap:8}}>
              <button onClick={()=>setTaskPickerFor(null)} disabled={linkingTask}
                style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
              <button onClick={confirmLinkTaskSub} disabled={linkingTask||!linkSelTaskId}
                style={{background:(!linkSelTaskId||linkingTask)?T.t4:T.blu,color:"white",border:"none",borderRadius:6,padding:"7px 18px",fontSize:12,fontWeight:700,cursor:(!linkSelTaskId||linkingTask)?"default":"pointer"}}>
                {linkingTask?"Linking…":"Link Task"}
              </button>
            </div>
          </div>
        </>);
      })()}
    </div>
  );
}

function NewWOModal({ subcons, setSubcons, projectId, project, fmtC, inpStyle, lblStyle, saving, setSaving, onClose, onSaved }) {
  const CATS       = ["Civil","Electrical","Plumbing","Finishing","Structural","MEP","Waterproofing","Painting","Tiling","Other"];
  const TRADE_CATS = ["Civil","Electrical","Plumbing","Finishing","Tile","MEP","Waterproofing","Painting","Other"];
  const blankSection = () => ({ title:"", items:[{ description:"", unit:"", qty:"", rate:"", isLibrary:false }] });

  // ── WO Type ────────────────────────────────────────────────────────────
  // "manual"    → existing manual entry (sections + items typed by hand)
  // "package"   → pick subcon rate card package → sections+items auto-load
  // "item_wise" → browse work items from library → tick + qty
  const [woType, setWoType] = useState("manual");

  // ── Package mode state ─────────────────────────────────────────────────
  // Reads project.city_id + project.construction_type_id for auto-detect
  const [pkgConTypes,  setPkgConTypes]  = useState([]);
  const [pkgCities,    setPkgCities]    = useState([]);
  const [pkgSelType,   setPkgSelType]   = useState(null);
  const [pkgSelCity,   setPkgSelCity]   = useState(null);
  const [pkgTrade,     setPkgTrade]     = useState(null);
  const [pkgList,      setPkgList]      = useState([]);
  const [pkgSelPkg,    setPkgSelPkg]    = useState(null);
  const [pkgStructures,setPkgStructures]= useState([]);
  const [pkgCategories,setPkgCategories]= useState([]);
  const [pkgSecItems,  setPkgSecItems]  = useState({}); // {sid:[rows]}
  const [pkgAreas,     setPkgAreas]     = useState({}); // {sid: area override}
  const [pkgCollapsed, setPkgCollapsed] = useState({});

  // ── Item-wise mode state ───────────────────────────────────────────────
  const [iwItems,      setIwItems]      = useState([]); // all work items for city+type
  const [iwLoading,    setIwLoading]    = useState(false);
  const [iwTradeFilter,setIwTradeFilter]= useState("All");
  const [iwPicked,     setIwPicked]     = useState({}); // {id: qty}
  const [iwShowPicker, setIwShowPicker] = useState(false);
  const [iwSearch,     setIwSearch]     = useState("");
  const [iwManualItems,setIwManualItems]= useState([]); // [{description,unit,qty,rate}]

  // ── Package builder extras (estimate-like UX) ──────────────────────────
  const [pkgShowInfo,        setPkgShowInfo]        = useState(true);
  const [pkgEditMode,        setPkgEditMode]        = useState(false);
  const [pkgCatCollapsed,    setPkgCatCollapsed]    = useState({});   // {`${sid}:${catId}`:true}
  const [pkgCatAreas,        setPkgCatAreas]        = useState({});   // {`${sid}:${catId}`:area_override}
  const [pkgItemEdits,       setPkgItemEdits]       = useState({});   // {`${sid}:${catId}:${iid}`:{base,addOn,qty}}
  const [pkgExcludedItems,   setPkgExcludedItems]   = useState({});   // {`${sid}:${catId}:${iid}`:true}
  const [pkgAddedItems,      setPkgAddedItems]      = useState({});   // {`${sid}:${catId}`:[{name,unit,qty,rate}]}
  const [pkgAddItemForm,     setPkgAddItemForm]     = useState(null); // {sid,catId,catName,form:{}} | null
  const [pkgAddedCats,       setPkgAddedCats]       = useState({});   // {[sid]:[{catName, perItem, items:[{name,unit,qty,rate}]}]}
  const [pkgAddedSections,   setPkgAddedSections]   = useState([]);   // [{title,items:[{name,unit,qty,rate}]}]
  const [pkgAddSecOpen,      setPkgAddSecOpen]      = useState(false);
  const [pkgAddSecForm,      setPkgAddSecForm]      = useState({title:"",items:[{name:"",unit:"Sqft",qty:"",rate:""}]});
  // Cloudinary attachment (same pattern as EstimateBuilderModal)
  const CLOUD_NAME    = "dd632nqfm";
  const UPLOAD_PRESET = "gb_buildcon_drawings";
  const [woAttachUrl,  setWoAttachUrl]  = useState("");
  const [woAttachName, setWoAttachName] = useState("");
  const [woAttachSize, setWoAttachSize] = useState("");
  const [woAttaching,  setWoAttaching]  = useState(false);
  const uploadWoAttachment = async (file) => {
    setWoAttaching(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      fd.append("folder", "gb_buildcon/subcon_wo");
      const isPDF = file.type === "application/pdf" || /\.(pdf|dwg|dxf|doc|docx|xls|xlsx)$/i.test(file.name);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${isPDF?"raw":"image"}/upload`, { method:"POST", body:fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Upload failed");
      setWoAttachUrl(data.secure_url);
      setWoAttachName(file.name);
      setWoAttachSize(Math.round(file.size / 1024) + " KB");
    } catch(e) { alert(e.message || "Upload failed"); }
    finally { setWoAttaching(false); }
  };

  // Load base data for package/item-wise mode when modal opens
  useEffect(() => {
    if (woType === "manual") return;
    api.get("/library/construction-types").then(r => {
      if (!r.success) return;
      setPkgConTypes(r.data||[]);
      // Auto-select from project
      if (project?.construction_type_id) {
        const match = (r.data||[]).find(t => Number(t.id)===Number(project.construction_type_id));
        if (match) setPkgSelType(match);
      }
    });
    api.get("/library/cities").then(r => {
      if (!r.success) return;
      setPkgCities(r.data||[]);
      if (project?.city_id) {
        const match = (r.data||[]).find(c => Number(c.id)===Number(project.city_id));
        if (match) setPkgSelCity(match);
      }
    });
    // eslint-disable-next-line
  }, [woType]);

  // Load packages when type + trade selected
  useEffect(() => {
    if (!pkgSelType || !pkgTrade) { setPkgList([]); setPkgSelPkg(null); return; }
    api.get(`/library/rate-packages?for=subcon&trade_category=${encodeURIComponent(pkgTrade)}&type_id=${pkgSelType.id}`)
      .then(r => { if (r.success) setPkgList(r.data||[]); });
    setPkgSelPkg(null);
    // eslint-disable-next-line
  }, [pkgSelType?.id, pkgTrade]);

  // Load package tree when pkg + city selected
  useEffect(() => {
    if (!pkgSelPkg || !pkgSelCity) { setPkgStructures([]); setPkgCategories([]); setPkgSecItems({}); return; }
    Promise.all([
      api.get(`/library/packages/${pkgSelPkg.id}/structures`),
      api.get(`/library/packages/${pkgSelPkg.id}/categories`),
    ]).then(([sr, cr]) => {
      const structs = sr.success ? sr.data||[] : [];
      setPkgStructures(structs);
      if (cr.success) setPkgCategories(cr.data||[]);
      if (structs.length) {
        Promise.all(structs.map(s =>
          api.get(`/library/rate-matrix?package_id=${pkgSelPkg.id}&city_id=${pkgSelCity.id}&structure_id=${s.id}`)
            .then(r => [s.id, r.success ? r.data||[] : []])
            .catch(() => [s.id, []])
        )).then(results => {
          const map = {}; const aMap = {};
          for (const [sid, rows] of results) {
            map[sid] = rows;
            // Pre-fill area from section default_qty
            const sec = structs.find(x => x.id === sid);
            if (sec?.default_qty) aMap[sid] = String(sec.default_qty);
          }
          setPkgSecItems(map);
          setPkgAreas(aMap);
        });
      }
    });
    // eslint-disable-next-line
  }, [pkgSelPkg?.id, pkgSelCity?.id]);

  // Load work items for item-wise mode
  useEffect(() => {
    if (woType !== "item_wise" || !pkgSelCity || !pkgSelType) { setIwItems([]); return; }
    setIwLoading(true);
    api.get(`/library/subcon-work-items?city_id=${pkgSelCity.id}&type_id=${pkgSelType.id}`)
      .then(r => { if (r.success) setIwItems(r.data||[]); })
      .catch(() => {})
      .finally(() => setIwLoading(false));
    // eslint-disable-next-line
  }, [woType, pkgSelCity?.id, pkgSelType?.id]);

  // Build sections from package mode for submit.
  // Maps 3-level (library section → category → item) to 2-level WO.
  // Each category becomes a WO section: "Section — Category" title.
  // Respects pkgExcludedItems (deleted) and pkgAddedItems (added in builder).
  const buildPackageSections = () => {
    const libSections = pkgStructures.flatMap(sec => {
      const area    = parseFloat(pkgAreas[sec.id] || sec.default_qty || 0);
      const perItem = !!Number(sec.per_item_qty);
      const cats    = pkgCategories.filter(c => c.structure_id === sec.id);
      return cats.map(cat => {
        const catKey     = `${sec.id}:${cat.id}`;
        const catArea    = pkgCatAreas[catKey] != null ? parseFloat(pkgCatAreas[catKey]) : area;
        const catRows    = (pkgSecItems[sec.id]||[]).filter(r =>
          Number(r.category_id)===Number(cat.id) || r.category_name===cat.category_name
        );
        // Library items (minus excluded)
        const libItems = catRows
          .filter(r => !pkgExcludedItems[`${sec.id}:${cat.id}:${r.item_id}`])
          .map(r => {
            const base  = getPkgItemBase(sec.id, cat.id, r.item_id, r);
            const addOn = getPkgItemAddOn(sec.id, cat.id, r.item_id, r);
            const qty   = perItem ? getPkgItemQty(sec.id, cat.id, r.item_id, r, area, true) : catArea;
            return { description: r.item_name || r.name, unit: r.unit || "Sqft", qty, rate: base + addOn };
          }).filter(i => i.description && i.rate > 0);
        // WO-added items for this category
        const addedItems = (pkgAddedItems[catKey]||[]).map(i => ({
          description: i.name, unit: i.unit||"Sqft", qty: parseFloat(i.qty)||0, rate: parseFloat(i.rate)||0,
        })).filter(i => i.description && i.rate > 0);
        const items = [...libItems, ...addedItems];
        const title = cat.category_name === sec.name ? cat.category_name : `${sec.name} — ${cat.category_name}`;
        return { title, items };
      }).filter(s => s.items.length > 0);
    });
    // Extra manual sections added in WO builder
    const extraSections = pkgAddedSections.map(sec => ({
      title: sec.title,
      items: sec.items.filter(i => i.name && parseFloat(i.rate||0)>0).map(i => ({
        description: i.name, unit: i.unit||"Sqft", qty: parseFloat(i.qty||0), rate: parseFloat(i.rate||0),
      })),
    })).filter(s => s.items.length > 0);
    return [...libSections, ...extraSections];
  };

  // Build sections from item-wise picks + manual items for submit
  const buildItemSections = () => {
    // Library-picked items grouped by category
    const groups = {};
    for (const [id, qty] of Object.entries(iwPicked).filter(([,q]) => parseFloat(q||0) > 0)) {
      const item = iwItems.find(i => String(i.id)===String(id));
      if (!item) continue;
      const cat = item.trade_category || "Work Items";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ description:item.name, unit:item.unit||"Sqft", qty:parseFloat(qty), rate:parseFloat(item.rate||0) });
    }
    const sections = Object.entries(groups).map(([title, items]) => ({ title, items }));
    // Manual items appended as their own section
    const manuals = iwManualItems.filter(it => it.description.trim() && parseFloat(it.rate||0) > 0);
    if (manuals.length) sections.push({ title:"Manual Items", items: manuals.map(it => ({
      description: it.description.trim(), unit: it.unit||"Sqft",
      qty: parseFloat(it.qty||0), rate: parseFloat(it.rate||0),
    }))});
    return sections;
  };

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
  const [showAddSc, setShowAddSc] = useState(false);  // inline new-subcon modal
  const toggleSecCollapse = (si) => setSecCollapsed(p=>({...p,[si]:!p[si]}));

  // ── Library-backed subcon match: when user types/picks a name that
  //    matches an entry in /library/subcontractors, surface its
  //    labour_strength + trade as a chip, and auto-fill the category.
  const matchedSubcon = (subcons || []).find(
    s => (s.name || "").trim().toLowerCase() === (form.subcon_name || "").trim().toLowerCase()
  );
  useEffect(() => {
    if (matchedSubcon && matchedSubcon.trade) {
      // Best-effort map library "trade" to WO "category". If the trade
      // string contains one of CATS, use it; else leave whatever the
      // user picked.
      const hit = CATS.find(c => (matchedSubcon.trade || "").toLowerCase().includes(c.toLowerCase()));
      if (hit && hit !== form.subcon_category) setForm(p => ({ ...p, subcon_category: hit }));
    }
    // eslint-disable-next-line
  }, [matchedSubcon?.id]);

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
  const addItem = (si) => {
    setForm(p=>({...p, sections:p.sections.map((s,i)=>i===si?{...s,items:[...s.items,{description:"",unit:"",qty:"",rate:"",isLibrary:false}]}:s)}));
    // After React paints the new row, auto-focus its description field
    // so a keyboard-driven user can keep typing without reaching for
    // the mouse. setTimeout(0) defers until after the commit phase.
    setTimeout(() => {
      const sec = form.sections[si];
      if (!sec) return;
      // length BEFORE setForm settled = index of the brand-new row
      const newIdx = sec.items.length;
      const el = document.querySelector(`[data-wo-desc="new-${si}-${newIdx}"]`);
      if (el) el.focus();
    }, 0);
  };
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

    // Build sections based on wo_type
    let finalSections = [];
    if (woType === "package") {
      finalSections = buildPackageSections();
      if (!finalSections.length) return alert("Package has no items with rates — set rates in Library → Subcon Rate Card first");
    } else if (woType === "item_wise") {
      finalSections = buildItemSections();
      if (!finalSections.length) return alert("Select at least one item with qty > 0 (from library or manual)");
    } else {
      // manual
      finalSections = form.sections.filter(s=>s.title.trim() && s.items.some(i=>i.description&&i.qty&&i.rate));
      if (!finalSections.length) return alert("At least 1 section with items required");
    }

    setSaving(true);
    const payload = {
      project_id:      projectId,
      wo_type:         woType,
      subcon_name:     form.subcon_name,
      subcon_category: form.subcon_category,
      description:     form.description,
      retention_pct:   parseFloat(form.retention_pct||5),
      tds_pct:         parseFloat(form.tds_pct||2),
      start_date:      form.start_date||null,
      end_date:        form.end_date||null,
      sections: finalSections.map(s=>({
        title: s.title,
        items: s.items
          .filter(i => i.description && parseFloat(i.rate||0) > 0)
          .map(i=>({
            description: i.description,
            unit:        i.unit||"Sqft",
            qty:         parseFloat(i.qty||0),
            rate:        parseFloat(i.rate),
          })),
      })).filter(s=>s.items.length>0),
    };
    const res = await api.post("/subcon/work-orders", payload)
      .catch(e=>({success:false,message:e?.message||"Network error"}));
    setSaving(false);
    if(res.success) {
      onSaved();
    } else {
      const errMsg = res.message || res.error || `Server error (${res._status||500})`;
      alert("Create Work Order failed:\n" + errMsg);
    }
  };

  const filteredLib = libItems.filter(i=>
    !libSearch || i.name.toLowerCase().includes(libSearch.toLowerCase())
  );

  // True when package is selected and we show full-screen builder
  const pkgBuilderMode = woType === "package" && pkgSelPkg !== null;
  // Helper: effective rate for a rate-matrix row
  const effR = (r) => r.base_rate != null
    ? parseFloat(r.base_rate||0) + parseFloat(r.add_on_rate||0)
    : parseFloat(r.rate||0);
  // Package builder math helpers
  const getPkgItemBase  = (sid,catId,iid,row) => pkgItemEdits[`${sid}:${catId}:${iid}`]?.base   ?? (row.base_rate != null ? parseFloat(row.base_rate||0) : parseFloat(row.rate||0) - parseFloat(row.add_on_rate||0));
  const getPkgItemAddOn = (sid,catId,iid,row) => pkgItemEdits[`${sid}:${catId}:${iid}`]?.addOn  ?? parseFloat(row.add_on_rate||0);
  const getPkgItemQty   = (sid,catId,iid,row,secArea,perItem) => perItem
    ? (pkgItemEdits[`${sid}:${catId}:${iid}`]?.qty ?? parseFloat(row.qty||0))
    : secArea;
  const patchPkgItem = (sid,catId,iid,patch) =>
    setPkgItemEdits(p=>({...p,[`${sid}:${catId}:${iid}`]:{...(p[`${sid}:${catId}:${iid}`]||{}),...patch}}));
  // Compute package grand total for footer
  const pkgGrandTotal = pkgStructures.reduce((gt,sec)=>{
    const area = parseFloat(pkgAreas[sec.id]||sec.default_qty||0);
    const perItem = !!Number(sec.per_item_qty);
    const cats = pkgCategories.filter(c=>c.structure_id===sec.id);
    return gt + cats.reduce((st,cat)=>{
      const rows = (pkgSecItems[sec.id]||[]).filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name));
      return st + rows.reduce((ct,r)=>{
        const base=getPkgItemBase(sec.id,cat.id,r.item_id,r);
        const addOn=getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
        const qty=getPkgItemQty(sec.id,cat.id,r.item_id,r,area,perItem);
        const catAreaKey=`${sec.id}:${cat.id}`;
        const catArea=pkgCatAreas[catAreaKey]!=null?parseFloat(pkgCatAreas[catAreaKey]):area;
        return ct+(base+addOn)*(perItem?qty:catArea);
      },0);
    },0);
  },0);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surface,borderRadius:pkgBuilderMode?0:12,
        width:pkgBuilderMode?"100vw":"min(780px,96vw)",
        height:pkgBuilderMode?"100vh":"auto",
        maxHeight:pkgBuilderMode?"100vh":"90vh",
        display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
        {/* Header */}
        <div style={{background:"#0F172A",padding:"13px 18px",borderRadius:pkgBuilderMode?"0":"12px 12px 0 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"white",marginBottom:8}}>New Work Order</div>
            {/* WO Type toggle */}
            <div style={{display:"flex",gap:6}}>
              {[
                {id:"manual",    icon:"✏️", label:"Manual"},
                {id:"package",   icon:"📐", label:"Package"},
                {id:"item_wise", icon:"🔧", label:"Item-wise"},
              ].map(m=>(
                <button key={m.id} onClick={()=>setWoType(m.id)} style={{
                  padding:"5px 12px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer",
                  border:`1.5px solid ${woType===m.id?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.2)"}`,
                  background:woType===m.id?"rgba(255,255,255,0.2)":"transparent",
                  color:woType===m.id?"white":"rgba(255,255,255,0.5)",
                  display:"flex", alignItems:"center", gap:5,
                }}>
                  {m.icon} {m.label}
                </button>
              ))}
              <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",alignSelf:"center",marginLeft:4}}>
                {woType==="manual" ? "Type items manually" : woType==="package" ? "Load from Subcon Rate Card" : "Pick individual items from library"}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:20,cursor:"pointer",lineHeight:1,marginTop:2}}>×</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:pkgBuilderMode?"0":"16px"}}>
          {/* ── PACKAGE BUILDER: estimate-style full-screen body ─── */}
          {pkgBuilderMode && (
            <div style={{maxWidth:1200,margin:"0 auto",padding:"16px 20px 24px"}}>
              {/* Info Panel */}
              <div style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",marginBottom:14}}>
                <div onClick={()=>setPkgShowInfo(s=>!s)}
                  style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,
                    borderBottom:pkgShowInfo?"1px solid #E5E7EB":"none"}}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2.5}
                    style={{transition:"transform .15s",transform:pkgShowInfo?"rotate(90deg)":"rotate(0deg)"}}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                  <span style={{fontSize:12,fontWeight:700,color:"#0F172A",textTransform:"uppercase",letterSpacing:".4px"}}>WO Settings</span>
                  <span style={{fontSize:11,color:"#64748B",marginLeft:"auto"}}>
                    Retention {form.retention_pct}% · TDS {form.tds_pct}%{woAttachUrl?" · 📎 Attached":""}
                  </span>
                </div>
                {pkgShowInfo && (() => {
                  const inpC={width:"100%",padding:"5px 8px",borderRadius:5,border:"1.5px solid #D1D5DB",fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"};
                  const lblC={fontSize:9.5,fontWeight:700,color:"#6B7280",display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:".4px"};
                  return (
                    <div style={{padding:"12px 14px"}}>
                      {/* Row 1: Subcon + Description */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:9}}>
                        <div>
                          <label style={lblC}>Subcontractor <span style={{color:"#DC2626"}}>*</span></label>
                          <div style={{display:"flex",gap:6}}>
                            <input list="sc-list-wo-pkg" value={form.subcon_name}
                              onChange={e=>setForm(p=>({...p,subcon_name:e.target.value}))}
                              placeholder="Select from library or type..."
                              style={{...inpC,flex:1,border:`1.5px solid ${!form.subcon_name?"#FCA5A5":"#D1D5DB"}`}}/>
                            <datalist id="sc-list-wo-pkg">
                              {subcons.map(s=><option key={s.id} value={s.name}/>)}
                            </datalist>
                          </div>
                        </div>
                        <div>
                          <label style={lblC}>Description / Note</label>
                          <input value={form.description||""} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                            placeholder="Optional scope summary" style={inpC}/>
                        </div>
                      </div>
                      {/* Row 2: Retention / TDS / Start / End */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1.3fr 1.3fr",gap:10,marginBottom:9}}>
                        <div><label style={lblC}>Retention %</label>
                          <input type="number" value={form.retention_pct} onChange={e=>setForm(p=>({...p,retention_pct:e.target.value}))} style={{...inpC,textAlign:"right"}}/></div>
                        <div><label style={lblC}>TDS %</label>
                          <input type="number" value={form.tds_pct} onChange={e=>setForm(p=>({...p,tds_pct:e.target.value}))} style={{...inpC,textAlign:"right"}}/></div>
                        <div><label style={lblC}>Start Date</label>
                          <input type="date" value={form.start_date||""} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} style={inpC}/></div>
                        <div><label style={lblC}>End Date</label>
                          <input type="date" value={form.end_date||""} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} style={inpC}/></div>
                      </div>
                      {/* Row 3: Attachment + Category */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        <div>
                          <label style={lblC}>Attachment</label>
                          {!woAttachUrl ? (
                            <label style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:5,
                              border:"1.5px dashed #94A3B8",background:"white",cursor:woAttaching?"not-allowed":"pointer",fontSize:11.5,color:"#475569",fontWeight:600}}>
                              <span style={{fontSize:13}}>📎</span>
                              {woAttaching?"Uploading…":"Attach PDF / image / DWG"}
                              <input type="file" accept=".pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,image/*"
                                onChange={e=>{const f=e.target.files?.[0];if(f)uploadWoAttachment(f);e.target.value="";}}
                                disabled={woAttaching} style={{display:"none"}}/>
                            </label>
                          ) : (
                            <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:5,border:"1.5px solid #93C5FD",background:"#EFF6FF",fontSize:11.5,color:"#1D4ED8"}}>
                              <a href={woAttachUrl} target="_blank" rel="noreferrer"
                                style={{flex:1,color:"#1D4ED8",textDecoration:"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                📎 {woAttachName} <span style={{color:"#64748B"}}>· {woAttachSize}</span>
                              </a>
                              <button onClick={()=>{setWoAttachUrl("");setWoAttachName("");setWoAttachSize("");}}
                                style={{background:"none",border:"none",color:"#DC2626",cursor:"pointer",fontSize:14,lineHeight:1,padding:0}}>×</button>
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={lblC}>Trade Category</label>
                          <div style={{fontSize:12,color:T.t3,fontWeight:600,padding:"5px 0"}}>{pkgTrade} — {pkgSelPkg?.name}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Package picker compact row */}
              <div style={{background:"white",borderRadius:8,border:"1px solid #E5E7EB",padding:"10px 14px",marginBottom:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".4px"}}>{pkgSelType?.name} · {pkgSelCity?.name}</span>
                <span style={{color:"#CBD5E1"}}>›</span>
                {pkgList.map(p=>(
                  <button key={p.id} onClick={()=>setPkgSelPkg(p)} style={{
                    padding:"4px 12px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",
                    border:`2px solid ${pkgSelPkg?.id===p.id?"#2563EB":"#E5E7EB"}`,
                    background:pkgSelPkg?.id===p.id?"#EFF6FF":"white",
                    color:pkgSelPkg?.id===p.id?"#2563EB":"#374151"}}>
                    {p.name}{p.sqft_rate>0&&<span style={{fontSize:10,fontWeight:500,marginLeft:4,opacity:.7}}>Rs.{Number(p.sqft_rate).toLocaleString()}/sqft</span>}
                  </button>
                ))}
              </div>

              {/* ── Section / Category / Item tree — estimate-style ── */}
              {pkgSelPkg && (<>
                {pkgStructures.length>0 && pkgStructures.every(sec=>(pkgSecItems[sec.id]||[]).every(r=>effR(r)===0)) && (
                  <div style={{background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:8,padding:"9px 13px",marginBottom:10,fontSize:12,color:"#92400E",display:"flex",alignItems:"center",gap:8}}>
                    ⚠ Rates not set — go to <b>Library → Subcon Rate Card</b>, select this package, set rates and Save Rates first.
                  </div>
                )}
                {pkgStructures.length>0 && (
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                    <button onClick={()=>setPkgEditMode(m=>!m)}
                      style={{padding:"5px 13px",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer",
                        background:pkgEditMode?"#10B981":"white",border:"1.5px solid "+(pkgEditMode?"#10B981":"#94A3B8"),
                        color:pkgEditMode?"white":"#334155",display:"flex",alignItems:"center",gap:5}}>
                      {pkgEditMode?"✓ Done Editing":"✎ Edit Package"}
                    </button>
                    <span style={{fontSize:10.5,color:"#64748B"}}>{pkgEditMode?"Override rates/qty per item":"Click to override rates or qty for this WO"}</span>
                  </div>
                )}
                {pkgStructures.map(sec=>{
                  const secArea=parseFloat(pkgAreas[sec.id]||sec.default_qty||0);
                  const perItem=!!Number(sec.per_item_qty);
                  const sCol=!!pkgCollapsed[sec.id];
                  const cats=pkgCategories.filter(c=>c.structure_id===sec.id);
                  const secBase=cats.reduce((sb,cat)=>sb+(pkgSecItems[sec.id]||[]).filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name)).reduce((b,r)=>b+getPkgItemBase(sec.id,cat.id,r.item_id,r),0),0);
                  const secAddOn=cats.reduce((sa,cat)=>sa+(pkgSecItems[sec.id]||[]).filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name)).reduce((a,r)=>a+getPkgItemAddOn(sec.id,cat.id,r.item_id,r),0),0);
                  const secTotal=cats.reduce((st,cat)=>{
                    const ck=`${sec.id}:${cat.id}`;
                    const ca=pkgCatAreas[ck]!=null?parseFloat(pkgCatAreas[ck]):secArea;
                    return st+(pkgSecItems[sec.id]||[]).filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name)).reduce((ct,r)=>{
                      const b=getPkgItemBase(sec.id,cat.id,r.item_id,r);
                      const a=getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
                      const q=perItem?getPkgItemQty(sec.id,cat.id,r.item_id,r,secArea,true):ca;
                      return ct+(b+a)*q;
                    },0);
                  },0);
                  return(
                    <div key={sec.id} style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",marginBottom:12,overflow:"hidden"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",background:"#0F172A",color:"white"}}>
                        <span onClick={()=>setPkgCollapsed(p=>({...p,[sec.id]:!p[sec.id]}))} style={{cursor:"pointer",display:"flex"}}>
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={2.5}
                            style={{transition:"transform .15s",transform:sCol?"rotate(0deg)":"rotate(90deg)"}}>
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </span>
                        <span style={{fontWeight:700,fontSize:14,flex:1}}>{sec.name}</span>
                        <span style={{fontSize:11,color:"rgba(255,255,255,0.45)"}}>· {cats.length} {cats.length===1?"category":"categories"}</span>
                        {perItem&&<span style={{fontSize:9,color:"#FCD34D",background:"rgba(245,158,11,0.2)",padding:"2px 7px",borderRadius:4,fontWeight:700}}>Per-item Qty</span>}
                        <div style={{display:"flex",gap:10,alignItems:"center",fontSize:11.5,fontWeight:600}}>
                          {!perItem&&<>
                            <span style={{color:"rgba(255,255,255,0.6)"}}>Base <strong style={{color:"white"}}>Rs.{Math.round(secBase).toLocaleString("en-IN")}</strong></span>
                            <span style={{color:"rgba(255,255,255,0.6)"}}>Add-on <strong style={{color:"#F59E0B"}}>Rs.{Math.round(secAddOn).toLocaleString("en-IN")}</strong></span>
                            <span style={{padding:"3px 9px",background:"#CCFBF1",color:"#0D9488",borderRadius:4,fontWeight:700}}>Rs.{Math.round(secBase+secAddOn).toLocaleString("en-IN")}/sqft</span>
                            <span style={{display:"flex",alignItems:"center",gap:4}}>
                              <span style={{color:"rgba(255,255,255,0.55)",fontSize:11}}>Area</span>
                              <input type="number" value={pkgAreas[sec.id]||""} onChange={e=>setPkgAreas(p=>({...p,[sec.id]:e.target.value}))}
                                onClick={e=>e.stopPropagation()} placeholder="0"
                                style={{width:80,padding:"5px 8px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12,fontWeight:700,
                                  border:"1.5px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",color:"white",outline:"none"}}/>
                            </span>
                          </>}
                          <span style={{color:"rgba(255,255,255,0.6)"}}>Total <strong style={{color:"#CCFBF1",fontSize:13}}>Rs.{Math.round(secTotal).toLocaleString("en-IN")}</strong></span>
                        </div>
                      </div>
                      {!sCol&&(
                        <div style={{padding:10}}>
                          {cats.length===0&&<div style={{padding:"14px",textAlign:"center",color:"#9CA3AF",fontSize:12.5}}>No categories — add via Library → Subcon Rate Card</div>}
                          {cats.map(cat=>{
                            const ck=`${sec.id}:${cat.id}`;
                            const catCol=!!pkgCatCollapsed[ck];
                            const catAOv=pkgCatAreas[ck];
                            const catArea=catAOv!=null?parseFloat(catAOv):secArea;
                            const catRows=(pkgSecItems[sec.id]||[]).filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name));
                            const catBase=catRows.reduce((b,r)=>b+getPkgItemBase(sec.id,cat.id,r.item_id,r),0);
                            const catAddOn=catRows.reduce((a,r)=>a+getPkgItemAddOn(sec.id,cat.id,r.item_id,r),0);
                            const catTotal=catRows.reduce((ct,r)=>{
                              const b=getPkgItemBase(sec.id,cat.id,r.item_id,r);
                              const a=getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
                              const q=perItem?getPkgItemQty(sec.id,cat.id,r.item_id,r,secArea,true):catArea;
                              return ct+(b+a)*q;
                            },0);
                            return(
                              <div key={ck} style={{marginBottom:10,border:"1px solid #E5E7EB",borderRadius:8,overflow:"hidden"}}>
                                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#F1F5F9",borderBottom:catCol?"none":"1px solid #E5E7EB"}}>
                                  <span onClick={()=>setPkgCatCollapsed(p=>({...p,[ck]:!p[ck]}))} style={{cursor:"pointer",display:"flex"}}>
                                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2.5}
                                      style={{transition:"transform .15s",transform:catCol?"rotate(0deg)":"rotate(90deg)"}}>
                                      <polyline points="9 18 15 12 9 6"/>
                                    </svg>
                                  </span>
                                  <span style={{fontWeight:700,fontSize:12.5,color:"#0F172A",flex:1}}>{cat.category_name}</span>
                                  <span style={{fontSize:10.5,color:"#94A3B8"}}>· {catRows.length} item{catRows.length===1?"":"s"}</span>
                                  <div style={{display:"flex",gap:10,alignItems:"center",fontSize:11,fontWeight:600}}>
                                    {!perItem&&<>
                                      <span style={{color:"#64748B"}}>Base <strong style={{color:"#0F172A"}}>Rs.{Math.round(catBase).toLocaleString("en-IN")}</strong></span>
                                      <span style={{color:"#64748B"}}>Add-on <strong style={{color:"#F59E0B"}}>Rs.{Math.round(catAddOn).toLocaleString("en-IN")}</strong></span>
                                      <span style={{display:"flex",alignItems:"center",gap:4}}>
                                        <span style={{color:"#64748B",fontSize:10.5}}>Area</span>
                                        <input type="number" value={catAOv!=null?catAOv:""} onChange={e=>setPkgCatAreas(p=>({...p,[ck]:e.target.value===""?null:e.target.value}))}
                                          placeholder={String(secArea)}
                                          style={{width:70,padding:"4px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:11.5,fontWeight:700,
                                            border:"1.5px solid "+(catAOv?"#F59E0B":"#CBD5E1"),background:catAOv?"#FFFBEB":"white",
                                            color:catAOv?"#92400E":"#0F172A",outline:"none"}}/>
                                      </span>
                                    </>}
                                    <span style={{color:"#64748B"}}>Total <strong style={{color:"#059669"}}>Rs.{Math.round(catTotal).toLocaleString("en-IN")}</strong></span>
                                  </div>
                                </div>
                                {!catCol&&(
                                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                                    <thead>
                                      <tr style={{background:"#FAFAFA"}}>
                                        <th style={{padding:"7px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase"}}>Item</th>
                                        <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",width:100}}>Base</th>
                                        <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#F59E0B",textTransform:"uppercase",width:100}}>Add-on</th>
                                        <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#0D9488",textTransform:"uppercase",width:80}}>{perItem?"Qty":"Area"}</th>
                                        <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#059669",textTransform:"uppercase",width:110}}>Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {catRows.length===0&&!(pkgAddedItems[ck]||[]).length&&<tr><td colSpan={pkgEditMode?6:5} style={{padding:"12px",textAlign:"center",color:"#9CA3AF",fontSize:12}}>No items — click + Add Item to add</td></tr>}
                                      {catRows.map((r,idx)=>{
                                        const excKey=`${sec.id}:${cat.id}:${r.item_id}`;
                                        if(pkgExcludedItems[excKey]) return null;
                                        const base=getPkgItemBase(sec.id,cat.id,r.item_id,r);
                                        const addOn=getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
                                        const qty=perItem?getPkgItemQty(sec.id,cat.id,r.item_id,r,secArea,true):catArea;
                                        const tot=(base+addOn)*qty;
                                        return(
                                          <tr key={r.item_id} style={{background:idx%2===0?"white":"#FAFAFA",borderBottom:"1px solid #F3F4F6"}}>
                                            <td style={{padding:"8px 12px",fontWeight:600,fontSize:12.5,color:"#0F172A"}}>
                                              {r.item_name||r.name}
                                              <div style={{fontSize:10,color:"#94A3B8",marginTop:1}}>{r.unit||"—"}</div>
                                            </td>
                                            <td style={{padding:"8px 12px",textAlign:"right"}}>
                                              {pkgEditMode?<input type="number" value={pkgItemEdits[`${sec.id}:${cat.id}:${r.item_id}`]?.base??""}
                                                  placeholder={String(Math.round(r.base_rate!=null?parseFloat(r.base_rate||0):parseFloat(r.rate||0)-parseFloat(r.add_on_rate||0)))}
                                                  onChange={e=>patchPkgItem(sec.id,cat.id,r.item_id,{base:e.target.value===""?undefined:parseFloat(e.target.value)||0})}
                                                  style={{width:90,padding:"5px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12.5,border:"1.5px solid #E5E7EB",background:"white",outline:"none"}}/>
                                                :<span style={{fontSize:12.5,fontWeight:600}}>Rs.{Math.round(base).toLocaleString("en-IN")}</span>}
                                            </td>
                                            <td style={{padding:"8px 12px",textAlign:"right"}}>
                                              {pkgEditMode?<input type="number" value={pkgItemEdits[`${sec.id}:${cat.id}:${r.item_id}`]?.addOn??""}
                                                  placeholder={String(Math.round(parseFloat(r.add_on_rate||0)))}
                                                  onChange={e=>patchPkgItem(sec.id,cat.id,r.item_id,{addOn:e.target.value===""?undefined:parseFloat(e.target.value)||0})}
                                                  style={{width:90,padding:"5px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12.5,border:"1.5px solid #E5E7EB",background:"white",outline:"none",color:"#F59E0B",fontWeight:600}}/>
                                                :<span style={{fontSize:12.5,fontWeight:600,color:"#F59E0B"}}>{addOn>0?`Rs.${Math.round(addOn).toLocaleString("en-IN")}`:"—"}</span>}
                                            </td>
                                            <td style={{padding:"8px 12px",textAlign:"right",fontSize:12,color:"#0D9488",fontWeight:600}}>
                                              {perItem&&pkgEditMode?<input type="number" value={pkgItemEdits[`${sec.id}:${cat.id}:${r.item_id}`]?.qty??""}
                                                  placeholder={String(parseFloat(r.qty||0))}
                                                  onChange={e=>patchPkgItem(sec.id,cat.id,r.item_id,{qty:e.target.value===""?undefined:parseFloat(e.target.value)||0})}
                                                  style={{width:70,padding:"5px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12.5,border:"1.5px solid #E5E7EB",background:"white",outline:"none",color:"#0D9488",fontWeight:700}}/>
                                                :Math.round(qty).toLocaleString("en-IN")}
                                            </td>
                                            <td style={{padding:"8px 12px",textAlign:"right",fontSize:13,fontWeight:700,color:"#059669"}}>
                                              Rs.{Math.round(tot).toLocaleString("en-IN")}
                                            </td>
                                            {/* × Delete column — only in edit mode */}
                                            {pkgEditMode&&<td style={{padding:"6px 10px",textAlign:"center"}}>
                                              <button onClick={()=>setPkgExcludedItems(p=>({...p,[excKey]:true}))}
                                                title="Remove from this WO"
                                                style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",fontSize:15,lineHeight:1,padding:2}}>×</button>
                                            </td>}
                                          </tr>
                                        );
                                      })}
                                      {/* WO-added items for this category */}
                                      {(pkgAddedItems[ck]||[]).map((ai,aidx)=>{
                                        const aiRate=parseFloat(ai.rate||0);
                                        const aiQty=parseFloat(ai.qty||0);
                                        return(
                                          <tr key={`added-${aidx}`} style={{background:"#EFF6FF",borderBottom:"1px solid #BFDBFE"}}>
                                            <td style={{padding:"8px 12px",fontWeight:600,fontSize:12.5,color:"#1D4ED8"}}>
                                              {ai.name} <span style={{fontSize:9,background:"#2563EB",color:"white",borderRadius:3,padding:"1px 5px",marginLeft:4}}>NEW</span>
                                              <div style={{fontSize:10,color:"#93C5FD",marginTop:1}}>{ai.unit}</div>
                                            </td>
                                            <td style={{padding:"8px 12px",textAlign:"right",fontSize:12.5,fontWeight:600,color:"#1D4ED8"}}>Rs.{Math.round(aiRate).toLocaleString("en-IN")}</td>
                                            <td style={{padding:"8px 12px",textAlign:"right",color:"#9CA3AF"}}>—</td>
                                            <td style={{padding:"8px 12px",textAlign:"right",fontSize:12,color:"#0D9488",fontWeight:600}}>{aiQty.toLocaleString()}</td>
                                            <td style={{padding:"8px 12px",textAlign:"right",fontSize:13,fontWeight:700,color:"#059669"}}>Rs.{Math.round(aiRate*aiQty).toLocaleString("en-IN")}</td>
                                            {pkgEditMode&&<td style={{padding:"6px 10px",textAlign:"center"}}>
                                              <button onClick={()=>setPkgAddedItems(p=>({...p,[ck]:(p[ck]||[]).filter((_,i)=>i!==aidx)}))}
                                                style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",fontSize:15,lineHeight:1,padding:2}}>×</button>
                                            </td>}
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                                {/* + Add Item button — only in edit mode */}
                                {pkgEditMode&&!catCol&&(
                                  <button onClick={()=>setPkgAddItemForm({sid:sec.id,catId:cat.id,catName:cat.category_name,secName:sec.name,perItem,
                                      form:{name:"",unit:perItem?"No":"Sqft",qty:perItem?"1":"",rate:""}})}
                                    style={{width:"100%",padding:"7px",fontSize:11.5,fontWeight:700,color:"#2563EB",background:"#EFF6FF",
                                      border:"1.5px dashed #93C5FD",borderTop:"none",cursor:"pointer",borderRadius:"0 0 6px 6px",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                                    + Add Item to {cat.category_name}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* + Add Section (manual) — only in edit mode */}
                {pkgEditMode&&(
                  <button onClick={()=>{setPkgAddedSections(p=>[...p,{title:"",items:[{name:"",unit:"Sqft",qty:"",rate:""}]}]);}}
                    style={{width:"100%",padding:"10px",marginTop:4,fontSize:12,fontWeight:700,color:"#2563EB",background:"white",
                      border:"1.5px dashed #93C5FD",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    + Add New Section
                  </button>
                )}

                {/* Extra manual sections added in builder */}
                {pkgAddedSections.map((ms,msi)=>(
                  <div key={`ms-${msi}`} style={{background:"white",borderRadius:10,border:"1.5px solid #93C5FD",marginBottom:12,marginTop:8,overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",background:"#1E3A5F",display:"flex",alignItems:"center",gap:10}}>
                      <input value={ms.title} onChange={e=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,title:e.target.value}:s))}
                        placeholder="Section name (e.g. Extra Civil Work)"
                        style={{flex:1,padding:"5px 9px",borderRadius:5,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.1)",color:"white",fontSize:13,fontWeight:700,outline:"none",fontFamily:"inherit"}}/>
                      <button onClick={()=>setPkgAddedSections(p=>p.filter((_,i)=>i!==msi))}
                        style={{background:"rgba(239,68,68,0.2)",border:"1px solid #EF4444",color:"#FCA5A5",borderRadius:5,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                        × Remove Section
                      </button>
                    </div>
                    <div style={{padding:10}}>
                      <table style={{width:"100%",borderCollapse:"collapse",marginBottom:8}}>
                        <thead>
                          <tr style={{background:"#F8FAFC"}}>
                            {["Item Description","Unit","Qty","Rate","Total",""].map(h=>(
                              <th key={h} style={{padding:"6px 10px",textAlign:h==="Total"||h==="Qty"||h==="Rate"?"right":"left",fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ms.items.map((it,iti)=>(
                            <tr key={iti} style={{borderBottom:"1px solid #F3F4F6"}}>
                              <td style={{padding:"6px 8px"}}><input value={it.name} onChange={e=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,items:s.items.map((x,j)=>j===iti?{...x,name:e.target.value}:x)}:s))} placeholder="Item description" style={{width:"100%",padding:"5px 8px",borderRadius:4,border:"1.5px solid #E5E7EB",fontSize:12.5,outline:"none",fontFamily:"inherit"}}/></td>
                              <td style={{padding:"6px 8px"}}><select value={it.unit} onChange={e=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,items:s.items.map((x,j)=>j===iti?{...x,unit:e.target.value}:x)}:s))} style={{padding:"5px 8px",borderRadius:4,border:"1.5px solid #E5E7EB",fontSize:12,background:"white",outline:"none"}}>
                                {["Sqft","Cft","No","Running Ft","Unit","Kg","Lump Sum"].map(u=><option key={u}>{u}</option>)}</select></td>
                              <td style={{padding:"6px 8px"}}><input type="number" value={it.qty} onChange={e=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,items:s.items.map((x,j)=>j===iti?{...x,qty:e.target.value}:x)}:s))} placeholder="0" style={{width:70,padding:"5px 7px",borderRadius:4,border:"1.5px solid #E5E7EB",fontSize:12.5,textAlign:"right",outline:"none",fontFamily:"inherit"}}/></td>
                              <td style={{padding:"6px 8px"}}><input type="number" value={it.rate} onChange={e=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,items:s.items.map((x,j)=>j===iti?{...x,rate:e.target.value}:x)}:s))} placeholder="0" style={{width:80,padding:"5px 7px",borderRadius:4,border:"1.5px solid #E5E7EB",fontSize:12.5,textAlign:"right",outline:"none",fontFamily:"inherit"}}/></td>
                              <td style={{padding:"6px 8px",textAlign:"right",fontWeight:700,color:"#059669",fontSize:12.5}}>Rs.{Math.round((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0)).toLocaleString("en-IN")}</td>
                              <td style={{padding:"6px 8px",textAlign:"center"}}><button onClick={()=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,items:s.items.filter((_,j)=>j!==iti)}:s))} style={{background:"none",border:"none",color:"#EF4444",cursor:"pointer",fontSize:14,lineHeight:1}}>×</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button onClick={()=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,items:[...s.items,{name:"",unit:"Sqft",qty:"",rate:""}]}:s))}
                        style={{padding:"6px 14px",fontSize:11.5,fontWeight:700,color:"#2563EB",background:"#EFF6FF",border:"1.5px dashed #93C5FD",borderRadius:5,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                        + Add Item
                      </button>
                    </div>
                  </div>
                ))}

                {pkgGrandTotal>0&&(
                  <div style={{marginTop:10,padding:"14px 20px",background:"#0F172A",color:"white",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",color:"rgba(255,255,255,0.7)"}}>Grand Total</span>
                    <span style={{fontSize:20,fontWeight:700,color:"#CCFBF1"}}>Rs.{Math.round(pkgGrandTotal).toLocaleString("en-IN")}</span>
                  </div>
                )}

                {/* Add Item modal */}
                {pkgAddItemForm&&(
                  <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setPkgAddItemForm(null)}>
                    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(4px)"}}/>
                    <div style={{position:"relative",width:400,maxWidth:"94vw",background:"white",borderRadius:12,boxShadow:"0 24px 64px rgba(0,0,0,0.3)",overflow:"hidden",fontFamily:"inherit"}} onClick={e=>e.stopPropagation()}>
                      <div style={{padding:"14px 18px",background:"#0F172A",color:"white",fontSize:13,fontWeight:700}}>
                        + Add Item — {pkgAddItemForm.catName}
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginTop:2,fontWeight:400}}>{pkgAddItemForm.secName}</div>
                      </div>
                      <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:10}}>
                        {[
                          {label:"Item Name *",key:"name",type:"text",ph:"e.g. Extra RCC Work"},
                          {label:"Unit",key:"unit",type:"select",opts:["Sqft","Cft","No","Running Ft","Unit","Kg","Lump Sum"]},
                          {label:pkgAddItemForm.perItem?"Quantity":"Qty (Area)",key:"qty",type:"number",ph:"0"},
                          {label:"Rate (₹)",key:"rate",type:"number",ph:"0"},
                        ].map(f=>(
                          <div key={f.key}>
                            <label style={{fontSize:11,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>{f.label}</label>
                            {f.type==="select"
                              ?<select value={pkgAddItemForm.form[f.key]} onChange={e=>setPkgAddItemForm(p=>({...p,form:{...p.form,[f.key]:e.target.value}}))}
                                  style={{width:"100%",padding:"9px 12px",borderRadius:7,border:"1.5px solid #E5E7EB",fontSize:13,outline:"none",background:"white",fontFamily:"inherit"}}>
                                  {f.opts.map(o=><option key={o}>{o}</option>)}
                                </select>
                              :<input type={f.type} value={pkgAddItemForm.form[f.key]} onChange={e=>setPkgAddItemForm(p=>({...p,form:{...p.form,[f.key]:e.target.value}}))}
                                  placeholder={f.ph} autoFocus={f.key==="name"}
                                  style={{width:"100%",padding:"9px 12px",borderRadius:7,border:"1.5px solid #E5E7EB",fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                            }
                          </div>
                        ))}
                      </div>
                      <div style={{padding:"12px 18px",borderTop:"1px solid #E5E7EB",display:"flex",gap:8,justifyContent:"flex-end"}}>
                        <button onClick={()=>setPkgAddItemForm(null)} style={{padding:"8px 16px",borderRadius:7,border:"1px solid #E5E7EB",background:"#F8FAFC",fontSize:12.5,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                        <button disabled={!pkgAddItemForm.form.name?.trim()||!pkgAddItemForm.form.rate}
                          onClick={()=>{
                            const catKey=`${pkgAddItemForm.sid}:${pkgAddItemForm.catId}`;
                            setPkgAddedItems(p=>({...p,[catKey]:[...(p[catKey]||[]),{...pkgAddItemForm.form}]}));
                            setPkgAddItemForm(null);
                          }}
                          style={{padding:"8px 20px",borderRadius:7,background:!pkgAddItemForm.form.name?.trim()||!pkgAddItemForm.form.rate?"#D1D5DB":"#2563EB",
                            color:!pkgAddItemForm.form.name?.trim()||!pkgAddItemForm.form.rate?"#9CA3AF":"white",border:"none",fontSize:12.5,fontWeight:700,cursor:!pkgAddItemForm.form.name?.trim()||!pkgAddItemForm.form.rate?"not-allowed":"pointer",fontFamily:"inherit"}}>
                          Add Item
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>)}
            </div>
          )}

          {/* ── Package / Item-wise picker (compact, shown when NOT in full builder) ── */}
          {woType!=="manual" && !pkgBuilderMode && (
            <div style={{marginBottom:14,padding:"12px 14px",background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`}}>
              <div style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>
                {woType==="package" ? "Select Rate Card Package" : "Select Items from Library"}
                {pkgSelCity && pkgSelType && <span style={{fontWeight:400,textTransform:"none",marginLeft:6,color:T.t4}}>— {pkgSelType.name} × {pkgSelCity.name}</span>}
              </div>

              {/* Type + City row */}
              <div style={{display:"flex",gap:16,marginBottom:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:180}}>
                  <div style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:5}}>Construction Type</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {pkgConTypes.map(ct=>(
                      <button key={ct.id} onClick={()=>setPkgSelType(ct)} style={{
                        padding:"5px 12px",borderRadius:16,fontSize:12,fontWeight:600,cursor:"pointer",
                        border:`1.5px solid ${pkgSelType?.id===ct.id?T.blu:T.b1}`,
                        background:pkgSelType?.id===ct.id?T.blu:T.surface,
                        color:pkgSelType?.id===ct.id?"white":T.t2,
                      }}>{ct.name}</button>
                    ))}
                  </div>
                </div>
                <div style={{flex:1,minWidth:180}}>
                  <div style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:5}}>City</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {pkgCities.map(c=>(
                      <button key={c.id} onClick={()=>setPkgSelCity(c)} style={{
                        padding:"5px 12px",borderRadius:16,fontSize:12,fontWeight:600,cursor:"pointer",
                        border:`1.5px solid ${pkgSelCity?.id===c.id?"#0D9488":T.b1}`,
                        background:pkgSelCity?.id===c.id?"#0D9488":T.surface,
                        color:pkgSelCity?.id===c.id?"white":T.t2,
                      }}>{c.name}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Package mode: Trade + Package picker ── */}
              {woType==="package" && pkgSelType && pkgSelCity && (<>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:5}}>Trade Category</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {TRADE_CATS.map(t=>(
                      <button key={t} onClick={()=>setPkgTrade(t)} style={{
                        padding:"4px 11px",borderRadius:16,fontSize:11.5,fontWeight:600,cursor:"pointer",
                        border:`1.5px solid ${pkgTrade===t?"#7C3AED":T.b1}`,
                        background:pkgTrade===t?"#7C3AED":T.surface,
                        color:pkgTrade===t?"white":T.t3,
                      }}>{t}</button>
                    ))}
                  </div>
                </div>
                {pkgTrade && (
                  <div style={{marginBottom:pkgSelPkg?10:0}}>
                    <div style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:5}}>Rate Card</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {pkgList.map(p=>(
                        <button key={p.id} onClick={()=>setPkgSelPkg(p)} style={{
                          padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",
                          border:`2px solid ${pkgSelPkg?.id===p.id?T.blu:T.b1}`,
                          background:pkgSelPkg?.id===p.id?T.bluL:T.surface,
                          color:pkgSelPkg?.id===p.id?T.blu:T.t1,
                        }}>
                          {p.name}{p.sqft_rate>0?<span style={{fontSize:10,fontWeight:500,marginLeft:5,opacity:.7}}>₹{Number(p.sqft_rate).toLocaleString()}/sqft</span>:null}
                        </button>
                      ))}
                      {pkgList.length===0 && <span style={{fontSize:11,color:T.t4}}>No packages for {pkgTrade} — add in Library → Subcon Rate Card</span>}
                    </div>
                  </div>
                )}

                {/* Section tree moved to pkgBuilderMode body above */}
                {false && pkgSelPkg && (<>
                  {/* 0-rate warning */}
                  {pkgStructures.length>0 && pkgStructures.every(sec=>(pkgSecItems[sec.id]||[]).every(r=>effR(r)===0)) && (
                    <div style={{background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:8,padding:"9px 13px",marginTop:10,fontSize:12,color:"#92400E",display:"flex",alignItems:"center",gap:8}}>
                      ⚠ Rates not set — go to <b>Library → Subcon Rate Card</b>, select this package, set rates and Save Rates first.
                    </div>
                  )}

                  {/* Edit Package toggle */}
                  {pkgStructures.length>0 && (
                    <div style={{display:"flex",gap:8,alignItems:"center",marginTop:10,marginBottom:8}}>
                      <button onClick={()=>setPkgEditMode(m=>!m)}
                        style={{padding:"5px 13px",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer",
                          background:pkgEditMode?"#10B981":"white",border:"1.5px solid "+(pkgEditMode?"#10B981":"#94A3B8"),
                          color:pkgEditMode?"white":"#334155",display:"flex",alignItems:"center",gap:5}}>
                        {pkgEditMode?"✓ Done Editing":"✎ Edit Package"}
                      </button>
                      <span style={{fontSize:10.5,color:T.t4}}>
                        {pkgEditMode?"Override rates / qty per item for this WO":"Click to override rates or qty"}
                      </span>
                    </div>
                  )}

                  {/* Section tree */}
                  {pkgStructures.map(sec=>{
                    const secArea   = parseFloat(pkgAreas[sec.id]||sec.default_qty||0);
                    const perItem   = !!Number(sec.per_item_qty);
                    const sCollapsed= !!pkgCollapsed[sec.id];
                    const cats      = pkgCategories.filter(c=>c.structure_id===sec.id);
                    // Section totals
                    const secBase = cats.reduce((sb,cat)=>sb+(pkgSecItems[sec.id]||[])
                      .filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name))
                      .reduce((b,r)=>b+getPkgItemBase(sec.id,cat.id,r.item_id,r),0),0);
                    const secAddOn= cats.reduce((sa,cat)=>sa+(pkgSecItems[sec.id]||[])
                      .filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name))
                      .reduce((a,r)=>a+getPkgItemAddOn(sec.id,cat.id,r.item_id,r),0),0);
                    const secTotal= cats.reduce((st,cat)=>{
                      const catAreaKey=`${sec.id}:${cat.id}`;
                      const catArea=pkgCatAreas[catAreaKey]!=null?parseFloat(pkgCatAreas[catAreaKey]):secArea;
                      return st+(pkgSecItems[sec.id]||[])
                        .filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name))
                        .reduce((ct,r)=>{
                          const base=getPkgItemBase(sec.id,cat.id,r.item_id,r);
                          const addOn=getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
                          const qty=perItem?getPkgItemQty(sec.id,cat.id,r.item_id,r,secArea,true):catArea;
                          return ct+(base+addOn)*qty;
                        },0);
                    },0);
                    const itemCount=(pkgSecItems[sec.id]||[]).length;

                    return (
                      <div key={sec.id} style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",marginBottom:12,overflow:"hidden",marginTop:8}}>
                        {/* Section header — dark */}
                        <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",background:"#0F172A",color:"white"}}>
                          <span onClick={()=>setPkgCollapsed(p=>({...p,[sec.id]:!p[sec.id]}))} style={{cursor:"pointer",display:"flex"}}>
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={2.5}
                              style={{transition:"transform .15s",transform:sCollapsed?"rotate(0deg)":"rotate(90deg)"}}>
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </span>
                          <span style={{fontWeight:700,fontSize:14,flex:1}}>{sec.name}</span>
                          <span style={{fontSize:11,color:"rgba(255,255,255,0.45)"}}>· {cats.length} {cats.length===1?"category":"categories"}</span>
                          {perItem && <span style={{fontSize:9,color:"#FCD34D",background:"rgba(245,158,11,0.2)",padding:"2px 7px",borderRadius:4,fontWeight:700}}>Per-item Qty</span>}
                          {/* Right: Base | AddOn | /sqft | Area | Total */}
                          <div style={{display:"flex",gap:10,alignItems:"center",fontSize:11.5,fontWeight:600}}>
                            {!perItem&&<>
                              <span style={{color:"rgba(255,255,255,0.6)"}}>Base <strong style={{color:"white"}}>Rs.{Math.round(secBase).toLocaleString("en-IN")}</strong></span>
                              <span style={{color:"rgba(255,255,255,0.6)"}}>Add-on <strong style={{color:"#F59E0B"}}>Rs.{Math.round(secAddOn).toLocaleString("en-IN")}</strong></span>
                              <span style={{padding:"3px 9px",background:"#CCFBF1",color:"#0D9488",borderRadius:4,fontWeight:700}}>
                                Rs.{Math.round(secBase+secAddOn).toLocaleString("en-IN")}/sqft
                              </span>
                              <span style={{display:"flex",alignItems:"center",gap:4}}>
                                <span style={{color:"rgba(255,255,255,0.55)",fontSize:11}}>Area</span>
                                <input type="number" value={pkgAreas[sec.id]||""} onChange={e=>setPkgAreas(p=>({...p,[sec.id]:e.target.value}))}
                                  onClick={e=>e.stopPropagation()} placeholder="0"
                                  style={{width:80,padding:"5px 8px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12,fontWeight:700,
                                    border:"1.5px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",color:"white",outline:"none"}}/>
                              </span>
                            </>}
                            <span style={{color:"rgba(255,255,255,0.6)"}}>Total <strong style={{color:"#CCFBF1",fontSize:13}}>Rs.{Math.round(secTotal).toLocaleString("en-IN")}</strong></span>
                          </div>
                        </div>

                        {/* Categories */}
                        {!sCollapsed && (
                          <div style={{padding:10}}>
                            {cats.length===0 && <div style={{padding:"14px 12px",textAlign:"center",color:"#9CA3AF",fontSize:12.5}}>No categories — add via Library → Subcon Rate Card</div>}
                            {cats.map(cat=>{
                              const catKey=`${sec.id}:${cat.id}`;
                              const catCollapsed=!!pkgCatCollapsed[catKey];
                              const catAreaOverride=pkgCatAreas[catKey];
                              const catArea=catAreaOverride!=null?parseFloat(catAreaOverride):secArea;
                              const catRows=(pkgSecItems[sec.id]||[]).filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name));
                              const catBase=catRows.reduce((b,r)=>b+getPkgItemBase(sec.id,cat.id,r.item_id,r),0);
                              const catAddOn=catRows.reduce((a,r)=>a+getPkgItemAddOn(sec.id,cat.id,r.item_id,r),0);
                              const catTotal=catRows.reduce((ct,r)=>{
                                const base=getPkgItemBase(sec.id,cat.id,r.item_id,r);
                                const addOn=getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
                                const qty=perItem?getPkgItemQty(sec.id,cat.id,r.item_id,r,secArea,true):catArea;
                                return ct+(base+addOn)*qty;
                              },0);
                              return (
                                <div key={catKey} style={{marginBottom:10,border:"1px solid #E5E7EB",borderRadius:8,overflow:"hidden"}}>
                                  {/* Category header */}
                                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#F1F5F9",borderBottom:catCollapsed?"none":"1px solid #E5E7EB"}}>
                                    <span onClick={()=>setPkgCatCollapsed(p=>({...p,[catKey]:!p[catKey]}))} style={{cursor:"pointer",display:"flex"}}>
                                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2.5}
                                        style={{transition:"transform .15s",transform:catCollapsed?"rotate(0deg)":"rotate(90deg)"}}>
                                        <polyline points="9 18 15 12 9 6"/>
                                      </svg>
                                    </span>
                                    <span style={{fontWeight:700,fontSize:12.5,color:"#0F172A",flex:1}}>{cat.category_name}</span>
                                    <span style={{fontSize:10.5,color:"#94A3B8"}}>· {catRows.length} item{catRows.length===1?"":"s"}</span>
                                    <div style={{display:"flex",gap:10,alignItems:"center",fontSize:11,fontWeight:600}}>
                                      {!perItem&&<>
                                        <span style={{color:"#64748B"}}>Base <strong style={{color:"#0F172A"}}>Rs.{Math.round(catBase).toLocaleString("en-IN")}</strong></span>
                                        <span style={{color:"#64748B"}}>Add-on <strong style={{color:"#F59E0B"}}>Rs.{Math.round(catAddOn).toLocaleString("en-IN")}</strong></span>
                                        <span style={{display:"flex",alignItems:"center",gap:4}}>
                                          <span style={{color:"#64748B",fontSize:10.5}}>Area</span>
                                          <input type="number"
                                            value={catAreaOverride!=null?catAreaOverride:""}
                                            onChange={e=>setPkgCatAreas(p=>({...p,[catKey]:e.target.value===""?null:e.target.value}))}
                                            placeholder={String(secArea)}
                                            title={catAreaOverride?`Override active — clear to inherit ${secArea} from section`:`Inherits ${secArea} from section`}
                                            style={{width:70,padding:"4px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:11.5,fontWeight:700,
                                              border:"1.5px solid "+(catAreaOverride?"#F59E0B":"#CBD5E1"),
                                              background:catAreaOverride?"#FFFBEB":"white",
                                              color:catAreaOverride?"#92400E":"#0F172A",outline:"none"}}/>
                                        </span>
                                      </>}
                                      <span style={{color:"#64748B"}}>Total <strong style={{color:"#059669"}}>Rs.{Math.round(catTotal).toLocaleString("en-IN")}</strong></span>
                                    </div>
                                  </div>

                                  {/* Item table */}
                                  {!catCollapsed && (
                                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                                      <thead>
                                        <tr style={{background:"#FAFAFA"}}>
                                          <th style={{padding:"7px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase"}}>Item</th>
                                          <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",width:100}}>Base</th>
                                          <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#F59E0B",textTransform:"uppercase",width:100}}>Add-on</th>
                                          <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#0D9488",textTransform:"uppercase",width:80}}>{perItem?"Qty":"Area"}</th>
                                          <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#059669",textTransform:"uppercase",width:110}}>Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {catRows.length===0 && <tr><td colSpan={5} style={{padding:"12px",textAlign:"center",color:"#9CA3AF",fontSize:12}}>No items</td></tr>}
                                        {catRows.map((r,idx)=>{
                                          const base   = getPkgItemBase(sec.id,cat.id,r.item_id,r);
                                          const addOn  = getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
                                          const qty    = perItem?getPkgItemQty(sec.id,cat.id,r.item_id,r,secArea,true):catArea;
                                          const total  = (base+addOn)*qty;
                                          return (
                                            <tr key={r.item_id} style={{background:idx%2===0?"white":"#FAFAFA",borderBottom:"1px solid #F3F4F6"}}>
                                              <td style={{padding:"8px 12px",fontWeight:600,fontSize:12.5,color:"#0F172A"}}>
                                                {r.item_name||r.name}
                                                <div style={{fontSize:10,color:"#94A3B8",marginTop:1}}>{r.unit||"—"}</div>
                                              </td>
                                              <td style={{padding:"8px 12px",textAlign:"right"}}>
                                                {pkgEditMode
                                                  ? <input type="number"
                                                      value={pkgItemEdits[`${sec.id}:${cat.id}:${r.item_id}`]?.base ?? ""}
                                                      placeholder={String(Math.round(r.base_rate!=null?parseFloat(r.base_rate||0):parseFloat(r.rate||0)-parseFloat(r.add_on_rate||0)))}
                                                      onChange={e=>patchPkgItem(sec.id,cat.id,r.item_id,{base:e.target.value===""?undefined:parseFloat(e.target.value)||0})}
                                                      style={{width:90,padding:"5px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12.5,
                                                        border:"1.5px solid #E5E7EB",background:"white",outline:"none"}}/>
                                                  : <span style={{fontSize:12.5,fontWeight:600}}>Rs.{Math.round(base).toLocaleString("en-IN")}</span>
                                                }
                                              </td>
                                              <td style={{padding:"8px 12px",textAlign:"right"}}>
                                                {pkgEditMode
                                                  ? <input type="number"
                                                      value={pkgItemEdits[`${sec.id}:${cat.id}:${r.item_id}`]?.addOn ?? ""}
                                                      placeholder={String(Math.round(parseFloat(r.add_on_rate||0)))}
                                                      onChange={e=>patchPkgItem(sec.id,cat.id,r.item_id,{addOn:e.target.value===""?undefined:parseFloat(e.target.value)||0})}
                                                      style={{width:90,padding:"5px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12.5,
                                                        border:"1.5px solid #E5E7EB",background:"white",outline:"none",color:"#F59E0B",fontWeight:600}}/>
                                                  : <span style={{fontSize:12.5,fontWeight:600,color:"#F59E0B"}}>{addOn>0?`Rs.${Math.round(addOn).toLocaleString("en-IN")}`:"—"}</span>
                                                }
                                              </td>
                                              <td style={{padding:"8px 12px",textAlign:"right",fontSize:12,color:"#0D9488",fontWeight:600}}>
                                                {perItem && pkgEditMode
                                                  ? <input type="number"
                                                      value={pkgItemEdits[`${sec.id}:${cat.id}:${r.item_id}`]?.qty ?? ""}
                                                      placeholder={String(parseFloat(r.qty||0))}
                                                      onChange={e=>patchPkgItem(sec.id,cat.id,r.item_id,{qty:e.target.value===""?undefined:parseFloat(e.target.value)||0})}
                                                      style={{width:70,padding:"5px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12.5,
                                                        border:"1.5px solid #E5E7EB",background:"white",outline:"none",color:"#0D9488",fontWeight:700}}/>
                                                  : Math.round(qty).toLocaleString("en-IN")
                                                }
                                              </td>
                                              <td style={{padding:"8px 12px",textAlign:"right",fontSize:13,fontWeight:700,color:"#059669"}}>
                                                Rs.{Math.round(total).toLocaleString("en-IN")}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Grand Total bar */}
                  {pkgGrandTotal>0 && (
                    <div style={{marginTop:10,padding:"14px 20px",background:"#0F172A",color:"white",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",color:"rgba(255,255,255,0.7)"}}>Grand Total</span>
                      <span style={{fontSize:20,fontWeight:700,color:"#CCFBF1"}}>Rs.{Math.round(pkgGrandTotal).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </>)}
              </>)}

              {/* ── Item-wise mode: side-slide picker + picked summary ── */}
              {woType==="item_wise" && pkgSelType && pkgSelCity && (
                <div>
                  {/* Top bar: count + Browse button */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontSize:11,color:T.t3}}>
                      {Object.values(iwPicked).filter(q=>parseFloat(q||0)>0).length + iwManualItems.filter(it=>it.description.trim()&&parseFloat(it.rate||0)>0).length} item(s) · <span style={{color:T.grn,fontWeight:700}}>
                        {fmtC(Object.entries(iwPicked).reduce((s,[id,qty])=>{const it=iwItems.find(i=>String(i.id)===String(id));return s+(parseFloat(it?.rate||0)*parseFloat(qty||0));},0)+iwManualItems.reduce((s,it)=>s+(parseFloat(it.qty||0)*parseFloat(it.rate||0)),0))}
                      </span>
                    </div>
                    <button onClick={()=>{setIwShowPicker(true);setIwSearch("");}}
                      style={{padding:"6px 14px",borderRadius:6,background:T.blu,color:"white",border:"none",fontSize:11.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                      📋 Browse &amp; Pick Items
                    </button>
                  </div>

                  {/* Picked library items */}
                  {Object.keys(iwPicked).length>0 && (
                    <div style={{border:`1px solid ${T.b1}`,borderRadius:7,overflow:"hidden",marginBottom:8}}>
                      <div style={{background:"#1E293B",padding:"5px 10px",display:"grid",gridTemplateColumns:"2fr 55px 68px 80px 80px 22px",gap:5}}>
                        {["Item","Unit","Rate","Qty","Amount",""].map(h=><span key={h} style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase"}}>{h}</span>)}
                      </div>
                      {Object.entries(iwPicked).map(([id,qty])=>{
                        const item=iwItems.find(i=>String(i.id)===String(id));
                        if(!item) return null;
                        const amt=parseFloat(item.rate||0)*parseFloat(qty||0);
                        return(
                          <div key={id} style={{display:"grid",gridTemplateColumns:"2fr 55px 68px 80px 80px 22px",gap:5,padding:"7px 10px",borderTop:`1px solid ${T.b1}`,alignItems:"center",background:"white"}}>
                            <div>
                              <div style={{fontSize:11.5,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                              <div style={{fontSize:9.5,color:T.t4}}>{item.trade_category||""}</div>
                            </div>
                            <span style={{fontSize:11,color:T.t3}}>{item.unit}</span>
                            <span style={{fontSize:11,color:T.blu,fontWeight:600}}>₹{Number(item.rate||0).toLocaleString("en-IN")}</span>
                            <input type="number" value={qty} placeholder="Qty"
                              onChange={e=>setIwPicked(p=>({...p,[id]:e.target.value}))}
                              style={{padding:"4px 6px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:11,textAlign:"right",outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
                            <span style={{fontSize:11,fontWeight:700,color:amt>0?T.grn:T.t4,textAlign:"right"}}>{amt>0?fmtC(amt):"—"}</span>
                            <button onClick={()=>setIwPicked(p=>{const n={...p};delete n[id];return n;})}
                              style={{background:"#FEE2E2",color:"#DC2626",border:"none",borderRadius:3,width:18,height:18,fontSize:12,cursor:"pointer",lineHeight:"18px",textAlign:"center",padding:0}}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Manual items rows */}
                  {iwManualItems.length>0 && (
                    <div style={{border:`1.5px dashed #C4B5FD`,borderRadius:7,overflow:"hidden",marginBottom:8}}>
                      <div style={{background:"#F3E8FF",padding:"5px 10px",display:"grid",gridTemplateColumns:"2fr 80px 80px 80px 80px 22px",gap:5,borderBottom:"1px solid #DDD6FE"}}>
                        {["Manual Item","Unit","Rate","Qty","Amount",""].map(h=><span key={h} style={{fontSize:8,fontWeight:700,color:"#6D28D9",textTransform:"uppercase"}}>{h}</span>)}
                      </div>
                      {iwManualItems.map((it,idx)=>{
                        const amt=parseFloat(it.qty||0)*parseFloat(it.rate||0);
                        return(
                          <div key={idx} style={{display:"grid",gridTemplateColumns:"2fr 80px 80px 80px 80px 22px",gap:5,padding:"6px 8px",borderTop:idx>0?"1px solid #EDE9FE":"none",alignItems:"center",background:"white"}}>
                            <input type="text" value={it.description} placeholder="Item description"
                              onChange={e=>{const a=[...iwManualItems];a[idx]={...a[idx],description:e.target.value};setIwManualItems(a);}}
                              style={{padding:"4px 6px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:11,outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
                            <select value={it.unit||"Sqft"} onChange={e=>{const a=[...iwManualItems];a[idx]={...a[idx],unit:e.target.value};setIwManualItems(a);}}
                              style={{padding:"4px 5px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11,outline:"none",background:"white",width:"100%"}}>
                              {["Sqft","Cft","No","Running Ft","Unit","Kg","Lump Sum"].map(u=><option key={u}>{u}</option>)}
                            </select>
                            <input type="number" value={it.rate} placeholder="Rate"
                              onChange={e=>{const a=[...iwManualItems];a[idx]={...a[idx],rate:e.target.value};setIwManualItems(a);}}
                              style={{padding:"4px 6px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:11,textAlign:"right",outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
                            <input type="number" value={it.qty} placeholder="Qty"
                              onChange={e=>{const a=[...iwManualItems];a[idx]={...a[idx],qty:e.target.value};setIwManualItems(a);}}
                              style={{padding:"4px 6px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:11,textAlign:"right",outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
                            <span style={{fontSize:11,fontWeight:700,color:amt>0?"#059669":T.t4,textAlign:"right"}}>{amt>0?fmtC(amt):"—"}</span>
                            <button onClick={()=>setIwManualItems(p=>p.filter((_,i)=>i!==idx))}
                              style={{background:"#FEE2E2",color:"#DC2626",border:"none",borderRadius:3,width:18,height:18,fontSize:12,cursor:"pointer",lineHeight:"18px",textAlign:"center",padding:0}}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Empty state */}
                  {Object.keys(iwPicked).length===0 && iwManualItems.length===0 && (
                    <div style={{textAlign:"center",padding:"18px 0",color:T.t4,fontSize:12,border:`1px dashed ${T.b1}`,borderRadius:7,marginBottom:8}}>
                      No items yet — click <b>Browse &amp; Pick Items</b> to select from library, or add manual items below.
                    </div>
                  )}

                  {/* + Manual Item button */}
                  <button onClick={()=>setIwManualItems(p=>[...p,{description:"",unit:"Sqft",qty:"",rate:""}])}
                    style={{padding:"5px 13px",fontSize:11.5,fontWeight:700,color:"#7C3AED",background:"#F3E8FF",border:"1.5px dashed #C4B5FD",borderRadius:5,cursor:"pointer"}}>
                    + Manual Item
                  </button>

                  {/* ── SIDE SLIDE PICKER ─────────────────────── */}
                  {iwShowPicker && (<>
                    <div onClick={()=>setIwShowPicker(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:520,backdropFilter:"blur(2px)"}}/>
                    <div style={{position:"fixed",right:0,top:0,bottom:0,width:520,maxWidth:"95vw",background:"white",zIndex:521,boxShadow:"-6px 0 36px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column",animation:"slideInRight .18s ease-out"}}>
                      {/* Picker header */}
                      <div style={{background:"#0F172A",padding:"14px 16px",flexShrink:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <div style={{fontSize:14,fontWeight:700,color:"white"}}>📋 Library Items</div>
                          <button onClick={()=>setIwShowPicker(false)}
                            style={{background:"#10B981",border:"none",color:"white",padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>✓ Done</button>
                        </div>
                        <input type="text" value={iwSearch} placeholder="Search items…" autoFocus
                          onChange={e=>setIwSearch(e.target.value)}
                          style={{width:"100%",padding:"8px 11px",borderRadius:6,border:"none",fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                        <div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
                          {["All",...TRADE_CATS].map(t=>(
                            <button key={t} onClick={()=>setIwTradeFilter(t)} style={{
                              padding:"3px 9px",borderRadius:12,fontSize:10.5,fontWeight:600,cursor:"pointer",border:"none",
                              background:iwTradeFilter===t?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.08)",
                              color:iwTradeFilter===t?"white":"rgba(255,255,255,0.5)",
                            }}>{t}</button>
                          ))}
                        </div>
                      </div>
                      {/* Picker body — category-grouped */}
                      <div style={{flex:1,overflowY:"auto"}}>
                        {iwLoading && <div style={{textAlign:"center",padding:"40px",color:"#94A3B8",fontSize:12}}>Loading…</div>}
                        {!iwLoading && (()=>{
                          const filtered=(iwTradeFilter==="All"?iwItems:iwItems.filter(i=>i.trade_category===iwTradeFilter))
                            .filter(i=>!iwSearch||i.name.toLowerCase().includes(iwSearch.toLowerCase()));
                          if(!filtered.length) return(
                            <div style={{textAlign:"center",padding:"40px 20px",color:"#94A3B8",fontSize:12}}>
                              {iwItems.length===0
                                ?`No items for ${pkgSelType?.name} × ${pkgSelCity?.name} — add in Library → Subcon Rate Card → Work Item Rates`
                                :"No items match your search"}
                            </div>
                          );
                          const cats=[...new Set(filtered.map(i=>i.trade_category||"Work Items"))];
                          return cats.map(cat=>{
                            const catItems=filtered.filter(i=>(i.trade_category||"Work Items")===cat);
                            return(
                              <div key={cat}>
                                <div style={{padding:"7px 14px",background:"#F1F5F9",fontSize:9.5,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".5px",borderBottom:"1px solid #E2E8F0",borderTop:"1px solid #E2E8F0",position:"sticky",top:0}}>
                                  {cat} <span style={{fontWeight:400,color:"#94A3B8"}}>({catItems.length})</span>
                                </div>
                                {catItems.map(item=>{
                                  const isPicked=iwPicked[item.id]!==undefined;
                                  return(
                                    <div key={item.id}
                                      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:"1px solid #F1F5F9",cursor:"pointer",background:isPicked?"#EFF6FF":"white",transition:"background .1s"}}
                                      onClick={()=>{
                                        if(isPicked) setIwPicked(p=>{const n={...p};delete n[item.id];return n;});
                                        else setIwPicked(p=>({...p,[item.id]:""}));
                                      }}>
                                      <div style={{width:17,height:17,borderRadius:4,border:`2px solid ${isPicked?"#2563EB":"#CBD5E1"}`,background:isPicked?"#2563EB":"white",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                        {isPicked&&<span style={{color:"white",fontSize:11,lineHeight:1}}>✓</span>}
                                      </div>
                                      <div style={{flex:1,minWidth:0}}>
                                        <div style={{fontSize:12.5,fontWeight:isPicked?700:500,color:"#0F172A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                                        <div style={{fontSize:10,color:"#64748B",marginTop:1}}>{item.unit} · ₹{Number(item.rate||0).toLocaleString("en-IN")}/unit</div>
                                      </div>
                                      {isPicked&&(
                                        <input type="number" value={iwPicked[item.id]||""} placeholder="Qty"
                                          onChange={e=>{e.stopPropagation();setIwPicked(p=>({...p,[item.id]:e.target.value}));}}
                                          onClick={e=>e.stopPropagation()}
                                          style={{width:72,padding:"5px 8px",borderRadius:5,border:"1.5px solid #3B82F6",fontSize:12,textAlign:"right",outline:"none",fontFamily:"inherit",background:"white"}}/>
                                      )}
                                      <div style={{fontSize:12,fontWeight:700,color:"#475569",minWidth:60,textAlign:"right"}}>
                                        ₹{Number(item.rate||0).toLocaleString("en-IN")}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          });
                        })()}
                      </div>
                      {/* Picker footer */}
                      <div style={{padding:"12px 16px",background:"#0F172A",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>
                          {Object.values(iwPicked).filter(q=>parseFloat(q||0)>0).length} selected · {fmtC(Object.entries(iwPicked).reduce((s,[id,qty])=>{const it=iwItems.find(i=>String(i.id)===String(id));return s+(parseFloat(it?.rate||0)*parseFloat(qty||0));},0))}
                        </div>
                        <button onClick={()=>setIwShowPicker(false)}
                          style={{padding:"7px 20px",borderRadius:6,background:"#10B981",color:"white",border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>✓ Done Picking</button>
                      </div>
                    </div>
                  </>)}
                </div>
              )}
            </div>
          )}

          {/* Basic Info — only for manual / item-wise modes (package mode has its own info panel) */}
          {woType!=="package" && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:14}}>
            <div style={{gridColumn:"1/3"}}>
              <label style={lblStyle}>Subcontractor *</label>
              <div style={{display:"flex",gap:6,alignItems:"stretch"}}>
                <input list="sc-list-wo" value={form.subcon_name}
                  onChange={e=>setForm(p=>({...p,subcon_name:e.target.value}))}
                  placeholder="Select from library or type new..."
                  style={{...inpStyle,flex:1}}/>
                <datalist id="sc-list-wo">
                  {subcons.map(s=>(
                    <option key={s.id} value={s.name}>
                      {s.trade || ""}{s.labour_strength?` • ${s.labour_strength} labour`:""}
                    </option>
                  ))}
                </datalist>
                <button type="button" onClick={()=>setShowAddSc(true)}
                  title="Add new subcontractor to master library"
                  style={{padding:"0 10px",borderRadius:6,border:`1.5px solid ${T.blu}`,background:T.bluL,color:T.blu,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                  + New
                </button>
              </div>
              {/* Labour strength chip — appears when typed name matches a library entry */}
              {matchedSubcon && (
                <div style={{marginTop:5,display:"flex",gap:6,flexWrap:"wrap",fontSize:10.5}}>
                  {matchedSubcon.trade && (
                    <span style={{padding:"2px 8px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:700}}>
                      {matchedSubcon.trade}
                    </span>
                  )}
                  {matchedSubcon.labour_strength > 0 && (
                    <span style={{padding:"2px 8px",borderRadius:10,background:"#DCFCE7",color:"#15803D",fontWeight:700}}>
                      👷 {matchedSubcon.labour_strength} labour
                    </span>
                  )}
                  {matchedSubcon.phone && (
                    <span style={{padding:"2px 8px",borderRadius:10,background:T.surfaceB,color:T.t3,fontWeight:600}}>
                      📞 {matchedSubcon.phone}
                    </span>
                  )}
                  {matchedSubcon.city && (
                    <span style={{padding:"2px 8px",borderRadius:10,background:T.surfaceB,color:T.t3,fontWeight:600}}>
                      📍 {matchedSubcon.city}
                    </span>
                  )}
                </div>
              )}
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
          }

          {/* Sections & Grand Total — manual / item-wise mode only */}
          {woType!=="package" && (<>
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
                            placeholder="Item description"
                            data-wo-desc={`new-${si}-${ii}`}
                            style={{...inpStyle,paddingRight:28}}/>
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
          </>)}
        </div>

        {/* Footer */}
        <div style={{padding:"12px 20px",borderTop:"1px solid #E5E7EB",display:"flex",gap:8,flexShrink:0,alignItems:"center",background:"white"}}>
          {/* PDF download — only in package builder mode */}
          {pkgBuilderMode && (
            <button onClick={()=>window.print()} title="Download PDF of current view"
              style={{padding:"8px 14px",borderRadius:7,border:"1.5px solid #94A3B8",background:"white",fontSize:12,fontWeight:600,color:"#334155",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
              📥 PDF
            </button>
          )}
          {/* Subtotal display */}
          {pkgBuilderMode && pkgGrandTotal>0 && (
            <span style={{fontSize:12,color:"#64748B",fontWeight:500}}>
              Subtotal: <strong style={{color:"#0F172A"}}>Rs.{Math.round(pkgGrandTotal).toLocaleString("en-IN")}</strong>
            </span>
          )}
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <button onClick={onClose} style={{padding:"9px 18px",borderRadius:7,border:"1px solid #D1D5DB",background:"#F8FAFC",fontSize:12.5,fontWeight:600,color:"#374151",cursor:"pointer"}}>Cancel</button>
            <button onClick={submit} disabled={saving}
              style={{padding:"9px 22px",borderRadius:7,background:saving?"#9CA3AF":"#2563EB",color:"white",border:"none",fontSize:12.5,fontWeight:700,cursor:saving?"not-allowed":"pointer"}}>
              {saving?"Creating…":"Create Work Order"}
            </button>
          </div>
        </div>
      </div>

      {/* Add new subcontractor → master library */}
      {showAddSc && (
        <SubconLibraryFormModal
          onClose={()=>setShowAddSc(false)}
          onSaved={(newSc)=>{
            // 1. Append to local list so the datalist + chip updates immediately
            if (setSubcons) setSubcons(prev => [newSc, ...(prev || [])]);
            // 2. Auto-select the new subcontractor in the WO form
            setForm(p => ({
              ...p,
              subcon_name: newSc.name,
              // If the library entry's trade matches a WO category, prefill it
              subcon_category: (function() {
                const t = (newSc.trade || "").toLowerCase();
                const cats = ["Civil","Electrical","Plumbing","Finishing","Structural","MEP","Waterproofing","Painting","Tiling","Other"];
                return cats.find(c => t.includes(c.toLowerCase())) || p.subcon_category;
              })(),
            }));
            setShowAddSc(false);
          }}
          inpStyle={inpStyle}
          lblStyle={lblStyle}
        />
      )}

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


// ─────────────────────────────────────────────────────────────────────
// SubconLibraryFormModal — inline "Add new subcontractor" form opened
// from inside NewWOModal / EditWOModal. Mirrors the field set used by
// MasterLibraryModule's SubcontractorSection so the master library
// stays consistent regardless of where the subcon was first created.
//
// POSTs to /library/subcontractors (the same endpoint MasterLibrary
// uses), then calls onSaved(newRow) so the caller can:
//   1. Append the row to its local `subcons` list (no full re-fetch)
//   2. Auto-select the new entry in the WO form
// ─────────────────────────────────────────────────────────────────────
function SubconLibraryFormModal({ onClose, onSaved, inpStyle, lblStyle }) {
  const TRADES = [
    "RCC & Civil","Electrical Work","Plumbing","Painting","Tiles & Flooring",
    "Fabrication","Carpentry","Waterproofing","False Ceiling","HVAC",
    "Landscaping","Demolition","Other",
  ];
  const [form, setForm] = useState({
    name: "", owner: "", trade: "RCC & Civil", phone: "", city: "",
    labour_strength: 0, gstin: "", status: "Active",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { setErr("Firm / Company name is required"); return; }
    setSaving(true); setErr("");
    try {
      const res = await api.post("/library/subcontractors", form);
      setSaving(false);
      if (res?.success === false) { setErr(res.message || "Save failed"); return; }
      onSaved && onSaved(res.data || { ...form, id: Date.now() });
    } catch (e) {
      setSaving(false);
      setErr(e?.message || "Network error");
    }
  };

  return (
    <div onClick={onClose}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.surface,borderRadius:12,width:"min(560px,95vw)",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.35)"}}>
        {/* Header */}
        <div style={{background:"#0F172A",padding:"13px 18px",borderRadius:"12px 12px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"white"}}>Add Subcontractor to Library</div>
            <div style={{fontSize:10.5,color:"rgba(255,255,255,0.55)",marginTop:1}}>Saved to master library so it appears across all projects</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {err && (
            <div style={{padding:"7px 10px",borderRadius:6,background:"#FEE2E2",color:"#B91C1C",fontSize:11.5,fontWeight:600,marginBottom:10}}>
              {err}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={lblStyle}>Firm / Company Name *</label>
              <input value={form.name} onChange={e=>upd("name", e.target.value)}
                placeholder="e.g. Raj Construction" style={inpStyle} autoFocus/>
            </div>
            <div>
              <label style={lblStyle}>Owner / Contact Person</label>
              <input value={form.owner} onChange={e=>upd("owner", e.target.value)}
                placeholder="Owner name" style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>Trade / Specialty *</label>
              <select value={form.trade} onChange={e=>upd("trade", e.target.value)} style={inpStyle}>
                {TRADES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lblStyle}>Phone</label>
              <input value={form.phone} onChange={e=>upd("phone", e.target.value)}
                placeholder="+91 XXXXX XXXXX" style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>City</label>
              <input value={form.city} onChange={e=>upd("city", e.target.value)}
                placeholder="Raipur" style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>Labour Strength</label>
              <input type="number" min={0} value={form.labour_strength || ""}
                onChange={e=>upd("labour_strength", parseInt(e.target.value) || 0)}
                placeholder="e.g. 15" style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>GSTIN</label>
              <input value={form.gstin} onChange={e=>upd("gstin", e.target.value)}
                placeholder="If registered" style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>Status</label>
              <select value={form.status} onChange={e=>upd("status", e.target.value)} style={inpStyle}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Blacklisted">Blacklisted</option>
              </select>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{padding:"12px 16px",borderTop:"1px solid "+T.b1,display:"flex",gap:8}}>
          <button onClick={onClose}
            style={{flex:1,padding:"9px",borderRadius:7,border:"1px solid "+T.b1,background:T.surface,fontSize:12,cursor:"pointer"}}>
            Cancel
          </button>
          <button onClick={save} disabled={saving || !form.name.trim()}
            style={{flex:2,padding:"9px",borderRadius:7,background:(saving||!form.name.trim())?T.t4:T.blu,color:"white",border:"none",fontSize:13,fontWeight:700,cursor:(saving||!form.name.trim())?"not-allowed":"pointer"}}>
            {saving ? "Saving…" : "Save & Use"}
          </button>
        </div>
      </div>
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
  const addItem = (si) => {
    setSections(p=>p.map((s,i)=>i===si?{...s,items:[...s.items,blankItem()]}:s));
    // Auto-focus new description input — keyboard-friendly (same UX as
    // NewWOModal). Defers to setTimeout so the row is in the DOM first.
    setTimeout(() => {
      const sec = sections[si];
      if (!sec) return;
      const newIdx = sec.items.length;
      const el = document.querySelector(`[data-wo-desc="edit-${si}-${newIdx}"]`);
      if (el) el.focus();
    }, 0);
  };
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
      apiCache.refreshApprovals();  // pre-warm badge
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
                            placeholder="Item description"
                            data-wo-desc={`edit-${si}-${ii}`}
                            style={{...inpStyle,paddingRight:28}}/>
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

// Small helper — async-fetches a WO's items and renders them as <option> nodes.
// Used by the Set Milestones modal's WO Item dropdown.
function WoItemOptions({ woId, fmtC }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/subcon/work-orders/"+woId).then(r => {
      if (r.success) {
        const all = [];
        (r.data.sections||[]).forEach(s => (s.items||[]).forEach(it => all.push(it)));
        (r.data.unsectioned||[]).forEach(it => all.push(it));
        setItems(all);
      }
    }).catch(()=>{});
  }, [woId]);
  return items.map(it => (
    <option key={it.id} value={it.id}>{it.description} ({fmtC(it.rate)}/{it.unit||"-"}, qty {it.qty})</option>
  ));
}

function NewRaBillModal({ wo, milestones, fmtC, inpStyle, lblStyle, saving, onClose, onSave }) {
  const woId   = wo?.id;
  const method = wo?.billing_method || "manual";
  const retPct = parseFloat(wo?.retention_pct || 5);
  const tdsPct = parseFloat(wo?.tds_pct || 2);

  // ── Form state ─────────────────────────────────────────────────────────
  const [billDate,      setBillDate]      = useState(localYMD());
  const [remark,        setRemark]        = useState("");
  const [overBillMode,  setOverBillMode]  = useState(false);
  const [overBillReason,setOverBillReason]= useState("");
  const [pickedItems,   setPickedItems]   = useState({}); // {[ms_id or item_id]: {checked, cumulative_qty}}

  // ── Data state ─────────────────────────────────────────────────────────
  const [billingLedger, setBillingLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [sections,      setSections]      = useState([]);  // manual mode
  const [cumQtys,       setCumQtys]       = useState({});  // manual mode

  useEffect(() => {
    if (!woId) return;
    if (method === "milestone_rate" || method === "milestone_percent") {
      // Load billing ledger for ledger-aware UI
      setLedgerLoading(true);
      api.get("/subcon/wo/" + woId + "/billing-ledger")
        .then(r => { if (r?.success) setBillingLedger(r.data); })
        .catch(() => {})
        .finally(() => setLedgerLoading(false));
    } else {
      // Manual: load WO items + prev cumulative
      setLedgerLoading(true);
      api.get("/subcon/work-orders/" + woId).then(async r => {
        if (!r.success) { setLedgerLoading(false); return; }
        const secs = r.data.sections || [];
        const unsec = r.data.unsectioned || [];
        const allItems = [...secs.flatMap(s => s.items||[]), ...unsec];
        const pr = await api.get("/subcon/prev-cumulative-bulk?wo_id=" + woId).catch(() => ({success:false}));
        const prevMap = {};
        const serverMap = pr?.data?.prev_cum || {};
        for (const it of allItems) prevMap[it.id] = parseFloat(serverMap[it.id]||0)||0;
        const builtSecs = secs.map(s => ({ ...s, items: (s.items||[]).map(it => ({...it, prev_cum: prevMap[it.id]||0})) }));
        if (unsec.length) builtSecs.push({ title:"Other Items", items: unsec.map(it=>({...it,prev_cum:prevMap[it.id]||0})) });
        setSections(builtSecs);
        const initCums = {};
        allItems.forEach(it => { initCums[it.id] = String(prevMap[it.id]||""); });
        setCumQtys(initCums);
      }).catch(()=>{}).finally(()=>setLedgerLoading(false));
    }
  }, [woId, method]);

  // ── Live gross calculation ─────────────────────────────────────────────
  let gross = 0;
  if (method === "manual") {
    gross = sections.reduce((st, sec) => st + sec.items.reduce((s, it) => {
      const cum = parseFloat(cumQtys[it.id]||0);
      return s + Math.max(0, cum - (it.prev_cum||0)) * parseFloat(it.rate||0);
    }, 0), 0);
  } else if (method === "milestone_rate" && billingLedger?.mode === "milestone_rate") {
    for (const it of (billingLedger.items || [])) {
      for (const m of (it.milestones || [])) {
        const p = pickedItems[m.milestone_id];
        if (!p?.checked) continue;
        const thisQty = Math.max(0, parseFloat(p.this_qty || 0));
        gross += thisQty * (Number(m.rate) || 0);
      }
    }
  } else if (method === "milestone_percent" && billingLedger?.mode === "milestone_percent") {
    for (const s of (billingLedger.stages || [])) {
      if (pickedItems[s.milestone_id]?.checked) gross += Number(s.planned_amount) || 0;
    }
  }
  const grossR  = Math.round(gross * 100) / 100;
  const retAmt  = Math.round(grossR * retPct) / 100;
  const tdsAmt  = Math.round(grossR * tdsPct) / 100;
  const netPay  = Math.round((grossR - retAmt - tdsAmt) * 100) / 100;

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (overBillMode && !overBillReason.trim()) {
      alert("Over-Billing mode is ON. Please add a reason — it's compulsory for audit trail.");
      return;
    }
    if (method === "manual") {
      const items = sections.flatMap(sec => sec.items.map(it => ({
        wo_item_id: it.id,
        cumulative_qty: parseFloat(cumQtys[it.id]||0),
        rate: parseFloat(it.rate),
      })));
      onSave({ bill_date: billDate, remark, items, over_bill_mode: 0, over_bill_reason: "" });
      return;
    }
    if (method === "milestone_percent") {
      const items = [];
      for (const s of (billingLedger?.stages || [])) {
        if (pickedItems[s.milestone_id]?.checked) items.push({ milestone_id: s.milestone_id });
      }
      onSave({ bill_date: billDate, remark, items, over_bill_mode: 0, over_bill_reason: "" });
      return;
    }

    // ── milestone_rate: auto-split into normal + over-bill (mirrors Estimate exactly) ──
    // For each picked milestone, compute normal vs over portions.
    // CASE B: only normal → single call
    // CASE C: only over   → single over-bill call (over_bill_mode=1)
    // CASE D: both        → 2 calls; second linked to first
    const normalItems = [];
    const overItems   = [];
    for (const it of (billingLedger?.items || [])) {
      for (const m of (it.milestones || [])) {
        const p = pickedItems[m.milestone_id];
        if (!p?.checked) continue;
        const prevBilledMs = Number(m.billed_qty) || 0;
        const remainingQty = Number(m.remaining_qty) || 0;
        const thisQty      = Math.max(0, parseFloat(p.this_qty || 0));
        const normalQ      = Math.min(thisQty, Math.max(0, remainingQty));
        const overQ        = Math.max(0, thisQty - Math.max(0, remainingQty));
        if (normalQ > 0) normalItems.push({ milestone_id: m.milestone_id, cumulative_qty: prevBilledMs + normalQ });
        if (overQ   > 0) overItems.push({   milestone_id: m.milestone_id, cumulative_qty: prevBilledMs + normalQ + overQ });
      }
    }

    if (normalItems.length === 0 && overItems.length === 0) {
      alert("Nothing to bill — enter qty for at least one milestone.");
      return;
    }

    onSave({
      bill_date: billDate, remark,
      normalItems, overItems,
      over_bill_mode: overBillMode ? 1 : 0,
      over_bill_reason: overBillReason.trim(),
      _isSplit: true,
    });
  };

  const inpS = { ...inpStyle };
  const lblS = { ...lblStyle };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surface,borderRadius:12,width:"min(760px,96vw)",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>

        {/* ── Header ── */}
        <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontSize:15,fontWeight:700,color:T.t1}}>New RA Bill (from milestones)</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,color:T.t3,cursor:"pointer"}}>×</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>

          {/* ── Date + Remark ── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12,marginBottom:14}}>
            <div>
              <label style={lblS}>Bill Date *</label>
              <input type="date" value={billDate} onChange={e=>setBillDate(e.target.value)} style={inpS}/>
            </div>
            <div>
              <label style={lblS}>Remark</label>
              <input value={remark} onChange={e=>setRemark(e.target.value)} style={inpS} placeholder="e.g. Bill for plinth work completion…"/>
            </div>
          </div>

          {/* ── Over-Billing Mode toggle (mirrors Estimate exactly) ── */}
          {(method === "milestone_rate" || method === "manual") && (
            <div style={{marginBottom:14,padding:"10px 12px",borderRadius:7,
              background: overBillMode ? "#FEF2F2" : T.surfaceB,
              border:"1px solid "+(overBillMode?"#FCA5A5":T.b1)}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:overBillMode?"#991B1B":T.t1}}>
                    {overBillMode ? "⚠ OVER-BILLING MODE ENABLED" : "Normal billing mode"}
                  </div>
                  <div style={{fontSize:10.5,color:overBillMode?"#991B1B":T.t3,marginTop:2,lineHeight:1.45}}>
                    {overBillMode
                      ? "Fully-billed milestones selectable. Qty can exceed WO item qty. Reason compulsory."
                      : "WO-capped. Click toggle if extra work / site change needs over-billing."}
                  </div>
                </div>
                <button onClick={()=>{ setOverBillMode(p=>!p); if(overBillMode) setOverBillReason(""); }}
                  style={{padding:"6px 12px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",border:"none",
                    background:overBillMode?"#DC2626":T.bluL,color:overBillMode?"white":T.blu}}>
                  {overBillMode ? "Turn OFF" : "+ Over-Billing"}
                </button>
              </div>
              {overBillMode && (
                <div style={{marginTop:10}}>
                  <label style={{...lblS,color:"#991B1B",fontWeight:700}}>
                    Reason <span style={{color:"#DC2626"}}>*</span> <span style={{fontWeight:400,fontSize:10}}>(compulsory — shown on bill + audit trail)</span>
                  </label>
                  <textarea value={overBillReason} onChange={e=>setOverBillReason(e.target.value)}
                    placeholder="e.g. Extra work due to design change — client approval dated 28-May-2026"
                    rows={2}
                    style={{...inpS,minHeight:50,resize:"vertical",fontFamily:"inherit",borderColor:overBillReason.trim()?T.b1:"#FCA5A5"}}/>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>
                    {["Extra work due to design change","Site condition change","Client requested addition","Material wastage compensation"].map(t=>(
                      <button key={t} onClick={()=>setOverBillReason(p=>p?p:t)}
                        style={{padding:"3px 8px",fontSize:9.5,fontWeight:600,background:"white",color:"#991B1B",border:"1px solid #FCA5A5",borderRadius:4,cursor:"pointer"}}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {ledgerLoading && <div style={{padding:"30px",textAlign:"center",color:T.t4,fontSize:12}}>Loading billing ledger…</div>}

          {/* ── MILESTONE RATE — ledger-aware per-item + per-milestone ── */}
          {!ledgerLoading && method === "milestone_rate" && billingLedger?.mode === "milestone_rate" && (() => {
            const overbillOK = overBillMode;
            const allLedgerItems = billingLedger.items || [];
            if (!allLedgerItems.length) return (
              <div style={{padding:"30px",textAlign:"center",color:T.t4,fontSize:12,background:T.surfaceB,borderRadius:7}}>
                No milestones set yet. Close and use <b>+ Set Schedule → Item-wise</b>.
              </div>
            );

            // Match ledger items back to WO sections for grouping
            const ledgerById = {};
            for (const it of allLedgerItems) ledgerById[it.item_id] = it;

            // Build section groups from milestones prop (has sections) or flat
            const wsSections = wo?.sections || [];
            const wsUnsec    = wo?.unsectioned || [];

            const renderItemBlock = (ledgerItem) => {
              if (!ledgerItem) return null;
              const milestoneRows = ledgerItem.milestones || [];
              const pctBilled = ledgerItem.total_planned > 0
                ? Math.min(100, (ledgerItem.total_billed / ledgerItem.total_planned) * 100) : 0;
              return (
                <div key={ledgerItem.item_id} style={{marginBottom:12,border:"1px solid "+T.b1,borderRadius:7,background:"white",overflow:"hidden"}}>
                  {/* Item header */}
                  <div style={{padding:"8px 12px",background:T.surfaceB,borderBottom:"1px solid "+T.b1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{ledgerItem.description}</span>
                      <span style={{fontSize:10.5,color:T.t3}}>
                        Planned <b style={{color:T.t1}}>{ledgerItem.total_planned}</b> {ledgerItem.unit}
                        · Billed <b style={{color:T.amb}}>{ledgerItem.total_billed}</b>
                        · Remaining <b style={{color:ledgerItem.total_remaining>0?T.grn:T.t4}}>{ledgerItem.total_remaining}</b>
                      </span>
                    </div>
                    <div style={{height:4,background:T.b1,borderRadius:2,overflow:"hidden"}}>
                      <div style={{width:pctBilled+"%",height:"100%",background:pctBilled>=100?T.t4:T.blu,transition:"width .2s"}}/>
                    </div>
                  </div>
                  {/* Milestone rows */}
                  {milestoneRows.map(m => {
                    const isFully        = m.status === "fully_billed";
                    const isDisabled     = isFully && !overbillOK;
                    const p              = pickedItems[m.milestone_id];
                    const checked        = !!p?.checked;
                    const enteredQty     = parseFloat(p?.this_qty || 0);
                    const remainingQty   = Number(m.remaining_qty) || 0;
                    const incRate        = Number(m.rate) || 0;
                    const lineAmt        = enteredQty * incRate;
                    const exceedsRemaining = enteredQty > remainingQty;
                    const normalPortion  = Math.min(enteredQty, Math.max(0, remainingQty));
                    const overPortion    = Math.max(0, enteredQty - Math.max(0, remainingQty));
                    const isSplit        = exceedsRemaining && remainingQty > 0 && overPortion > 0;
                    const isFullOver     = isFully && enteredQty > 0;
                    const showOverWarn   = exceedsRemaining && !overBillMode;

                    return (
                      <div key={m.milestone_id} style={{borderTop:"1px dashed "+T.b1,opacity:isDisabled?0.55:1}}>
                        <div style={{display:"grid",gridTemplateColumns:"24px 1fr 80px 130px 110px",gap:6,alignItems:"center",padding:"7px 12px"}}>
                          <input type="checkbox" checked={checked} disabled={isDisabled}
                            onChange={e => {
                              const defaultQty = remainingQty > 0 ? String(remainingQty) : "";
                              setPickedItems(prev => ({
                                ...prev,
                                [m.milestone_id]: e.target.checked
                                  ? { checked: true, this_qty: defaultQty }
                                  : { checked: false, this_qty: "" },
                              }));
                            }}/>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div>
                            <div style={{fontSize:10,color:T.t4,marginTop:1,display:"flex",gap:6,flexWrap:"wrap"}}>
                              {isFully
                                ? <span style={{padding:"1px 6px",background:overbillOK?"#FEE2E2":T.surfaceB,color:overbillOK?"#991B1B":T.t3,borderRadius:3,fontWeight:600}}>
                                    {overbillOK?"🔴 Fully billed — over-bill enabled":"✓ Fully billed"}
                                  </span>
                                : m.status === "partial"
                                  ? <span>{m.billed_qty}/{m.planned_qty} billed · {m.remaining_qty} left</span>
                                  : <span>{m.planned_qty} {ledgerItem.unit}</span>}
                              {m.linked_task && (
                                <span style={{padding:"1px 6px",background:T.bluL,color:T.blu,borderRadius:3,fontWeight:600}}>
                                  🔗 task @ {m.linked_task.progress}%
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{fontSize:11,color:T.t3,textAlign:"right",paddingRight:6,fontVariantNumeric:"tabular-nums"}}>{fmtC(incRate)}/unit</span>
                          <div>
                            <input type="number" disabled={!checked||isDisabled}
                              placeholder={String(remainingQty)}
                              value={p?.this_qty || ""}
                              onChange={e => {
                                const v = e.target.value;
                                setPickedItems(prev => ({...prev,[m.milestone_id]:{...prev[m.milestone_id],this_qty:v}}));
                              }}
                              style={{...inpS,padding:"5px 8px",fontSize:11.5,
                                borderColor: exceedsRemaining ? "#DC2626" : T.b1,
                                borderWidth: exceedsRemaining ? 2 : 1,
                                background: exceedsRemaining ? "#FEF2F2" : "white",
                                color: exceedsRemaining ? "#991B1B" : T.t1,
                                fontWeight: exceedsRemaining ? 700 : 400}}/>
                          </div>
                          <span style={{fontSize:12,fontWeight:700,textAlign:"right",fontVariantNumeric:"tabular-nums",
                            color:checked&&enteredQty>0?(exceedsRemaining?"#991B1B":T.grn):T.t4}}>
                            {checked && enteredQty > 0 ? fmtC(lineAmt) : "—"}
                            {isSplit && (
                              <div style={{fontSize:8.5,color:"#991B1B",fontWeight:700,marginTop:1,lineHeight:1.3}}>
                                🔴 SPLIT: {normalPortion} BOQ + {overPortion} over
                              </div>
                            )}
                            {isFullOver && !isSplit && (
                              <div style={{fontSize:8.5,color:"#991B1B",fontWeight:700,marginTop:1}}>
                                🔴 ALL OVER-BILL ({overPortion} qty)
                              </div>
                            )}
                          </span>
                        </div>
                        {/* Over-bill inline warning — exact same as Estimate */}
                        {showOverWarn && (
                          <div style={{margin:"4px 0 6px 26px",padding:"7px 10px",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:6,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                            <span style={{fontSize:14}}>⚠️</span>
                            <div style={{flex:1,minWidth:180}}>
                              <div style={{fontSize:11.5,fontWeight:700,color:"#991B1B"}}>
                                Over-billing detected — {enteredQty} {ledgerItem.unit} entered, only {remainingQty} available
                              </div>
                              <div style={{fontSize:10.5,color:"#7F1D1D",marginTop:2}}>
                                Either reduce qty to {remainingQty}, or enable Over-Billing Mode + provide a reason explaining the extra work.
                              </div>
                            </div>
                            <button onClick={()=>setOverBillMode(true)}
                              style={{padding:"5px 10px",borderRadius:5,background:"#DC2626",color:"white",border:"none",fontSize:10.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                              Turn ON Over-Billing
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            };

            // Section-grouped output
            const sectionsWithItems = wsSections
              .map(sec => ({ ...sec, _ledgerItems: (sec.items||[]).map(it=>ledgerById[it.id]).filter(Boolean) }))
              .filter(sec => sec._ledgerItems.length > 0);
            const unsecItems = wsUnsec.map(it=>ledgerById[it.id]).filter(Boolean);

            if (!sectionsWithItems.length && !unsecItems.length) {
              // Fallback: flat list from ledger
              return allLedgerItems.map(renderItemBlock);
            }

            return (<>
              <div style={{fontSize:11,color:T.t3,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
                <span>Tick milestones to bill. Qty = this bill qty; defaults to remaining qty.</span>
                {overbillOK && <span style={{padding:"2px 7px",fontSize:9.5,fontWeight:700,background:"#FEE2E2",color:"#991B1B",borderRadius:3}}>OVER-BILL ENABLED</span>}
              </div>
              {sectionsWithItems.map(sec => (
                <div key={sec.id||sec.title} style={{marginBottom:14}}>
                  <div style={{padding:"7px 12px",background:"#1E3A5F",borderRadius:"6px 6px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11.5,fontWeight:700,color:"white",textTransform:"uppercase",letterSpacing:".4px"}}>{sec.title}</span>
                    <span style={{fontSize:11,color:"#93C5FD"}}>{sec._ledgerItems.length} item{sec._ledgerItems.length!==1?"s":""}</span>
                  </div>
                  <div style={{border:"1px solid #BFDBFE",borderTop:"none",borderRadius:"0 0 6px 6px",overflow:"hidden",padding:"8px 8px 2px"}}>
                    {sec._ledgerItems.map(renderItemBlock)}
                  </div>
                </div>
              ))}
              {unsecItems.length > 0 && (
                <div style={{marginBottom:14}}>
                  <div style={{padding:"7px 12px",background:T.slt,borderRadius:"6px 6px 0 0"}}>
                    <span style={{fontSize:11.5,fontWeight:700,color:"white"}}>Other Items</span>
                  </div>
                  <div style={{border:"1px solid "+T.b1,borderTop:"none",borderRadius:"0 0 6px 6px",padding:"8px 8px 2px"}}>
                    {unsecItems.map(renderItemBlock)}
                  </div>
                </div>
              )}
            </>);
          })()}

          {/* ── MILESTONE PERCENT ── */}
          {!ledgerLoading && method === "milestone_percent" && billingLedger?.mode === "milestone_percent" && (() => {
            const stages = billingLedger.stages || [];
            if (!stages.length) return (
              <div style={{padding:"30px",textAlign:"center",color:T.t4,fontSize:12,background:T.surfaceB,borderRadius:7}}>
                No %-stages set. Close and use <b>+ Set Schedule → % of WO Value</b>.
              </div>
            );
            return (<>
              <div style={{fontSize:11,color:T.t3,marginBottom:8}}>Tick stages to bill. Each stage can only be billed once.</div>
              {stages.map(s => {
                const isFully = s.status === "fully_billed";
                const checked = !!pickedItems[s.milestone_id]?.checked;
                return (
                  <div key={s.milestone_id} style={{display:"grid",gridTemplateColumns:"24px 1fr 70px 130px 100px",gap:6,alignItems:"center",padding:"8px 10px",borderBottom:"1px solid "+T.b1,opacity:isFully?0.55:1}}>
                    <input type="checkbox" checked={checked} disabled={isFully}
                      onChange={e => setPickedItems(p => ({...p,[s.milestone_id]:{checked:e.target.checked}}))}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{s.name}</div>
                      <div style={{fontSize:10,color:T.t4,marginTop:1}}>
                        {isFully
                          ? <span style={{padding:"1px 6px",background:T.surfaceB,color:T.t3,borderRadius:3,fontWeight:600}}>✓ Already billed</span>
                          : s.status==="partial"
                            ? <span>{fmtC(s.billed_amount)} billed · {fmtC(s.remaining_amount)} left</span>
                            : <span>{fmtC(s.planned_amount)} planned</span>}
                      </div>
                    </div>
                    <span style={{fontSize:11.5,color:T.t3,textAlign:"right",paddingRight:8}}>{s.pct}%</span>
                    <span style={{fontSize:13,fontWeight:700,color:T.grn,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtC(s.planned_amount)}</span>
                    <span style={{fontSize:11,color:T.t4,textAlign:"right"}}>{checked && <span style={{color:T.grn,fontWeight:700}}>✓ selected</span>}</span>
                  </div>
                );
              })}
            </>);
          })()}

          {/* ── MANUAL billing — per-item cumulative qty ── */}
          {!ledgerLoading && method === "manual" && (<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 55px 70px 70px 70px 75px 85px",background:"#1E293B",padding:"7px 12px",gap:8,borderRadius:"7px 7px 0 0"}}>
              {["Item","Unit","WO Qty","Prev Cum","Rate","This Cum ▼","This Bill Amt"].map((h,i)=>(
                <div key={h} style={{fontSize:8.5,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",textAlign:i>1?"right":"left"}}>{h}</div>
              ))}
            </div>
            {sections.map((sec,si)=>{
              const secAmt = sec.items.reduce((s,it)=>{
                const cum=parseFloat(cumQtys[it.id]||0);
                return s+Math.max(0,cum-(it.prev_cum||0))*parseFloat(it.rate||0);
              },0);
              return(
                <div key={si}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 55px 70px 70px 70px 75px 85px",padding:"6px 12px",gap:8,background:"#374151",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                    <div style={{gridColumn:"1/7",fontSize:11,fontWeight:700,color:"white"}}>{si+1}. {sec.title}</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#4ADE80",textAlign:"right"}}>{fmtC(secAmt)}</div>
                  </div>
                  {sec.items.map(it=>{
                    const cum=parseFloat(cumQtys[it.id]||0);
                    const thisBill=Math.max(0,cum-(it.prev_cum||0));
                    const thisAmt=thisBill*parseFloat(it.rate||0);
                    const overLimit=cum>parseFloat(it.qty||0);
                    return(
                      <div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 55px 70px 70px 70px 75px 85px",padding:"8px 12px",gap:8,borderBottom:"1px solid "+T.b1,alignItems:"center",background:overLimit?"#FEF2F2":T.surface}}>
                        <div style={{fontSize:11.5,color:T.t1,fontWeight:500}}>{it.description}</div>
                        <div style={{fontSize:11,color:T.t4,textAlign:"right"}}>{it.unit}</div>
                        <div style={{fontSize:12,color:T.t2,textAlign:"right",fontWeight:500}}>{it.qty}</div>
                        <div style={{fontSize:12,color:T.t3,textAlign:"right"}}>{it.prev_cum||0}</div>
                        <div style={{fontSize:12,fontWeight:700,color:T.blu,textAlign:"right"}}>₹{parseFloat(it.rate||0).toLocaleString("en-IN")}</div>
                        <div>
                          <input type="number" value={cumQtys[it.id]||""} min={0}
                            onChange={e=>setCumQtys(p=>({...p,[it.id]:e.target.value}))}
                            style={{...inpS,textAlign:"right",fontWeight:700,padding:"5px 8px",
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
          </>)}

          {/* ── Bill Summary ── */}
          {grossR > 0 && (
            <div style={{marginTop:14,background:"#0F172A",borderRadius:8,padding:14,flexShrink:0}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",marginBottom:10}}>Bill Summary</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[
                  {l:"Gross Amount",              v:fmtC(grossR), c:"#E2E8F0"},
                  {l:`Retention (${retPct}%)`,    v:fmtC(retAmt), c:"#FCD34D"},
                  {l:`TDS (${tdsPct}%)`,          v:fmtC(tdsAmt), c:"#F87171"},
                  {l:"Net Payable",               v:fmtC(netPay), c:"#4ADE80"},
                ].map(s=>(
                  <div key={s.l} style={{textAlign:"center",background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"8px"}}>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginBottom:3}}>{s.l}</div>
                    <div style={{fontSize:14,fontWeight:800,color:s.c,fontVariantNumeric:"tabular-nums"}}>{s.v}</div>
                  </div>
                ))}
              </div>
              {overBillMode && (
                <div style={{marginTop:8,padding:"6px 10px",background:"rgba(220,38,38,0.15)",borderRadius:5,fontSize:10.5,color:"#FCA5A5",fontWeight:600}}>
                  ⚠ Over-bill mode active — will be flagged for admin review
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",gap:8,flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,border:"1px solid "+T.b1,background:T.surface,fontSize:12,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving||grossR===0}
            style={{flex:2,padding:"9px",borderRadius:7,
              background:saving||grossR===0?T.t4:overBillMode?"#DC2626":T.blu,
              color:"white",border:"none",fontSize:13,fontWeight:700,
              cursor:saving||grossR===0?"not-allowed":"pointer"}}>
            {saving ? "Submitting…" : grossR > 0 ? (overBillMode?"⚠ Submit Over-Bill — ":"Submit RA Bill — ")+fmtC(grossR) : "Select milestones to proceed"}
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


// Project-level equipment deployment tracking — period (from/to dates)
// + status (On Site / Returned). Matches the mobile EquipmentTab UX.
// Backed by /library/project-equipment.
function TabEquipment({ projectId }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  // Add-form state
  const [name,    setName]    = useState("");
  const [vendor,  setVendor]  = useState("Self");
  const [fromD,   setFromD]   = useState("");
  const [toD,     setToD]     = useState("");
  const [stat,    setStat]    = useState("On Site");
  const [rate,    setRate]    = useState("");
  const [saving,  setSaving]  = useState(false);

  // ── New equipment-module state ──────────────────────────────────
  const [usageRows, setUsageRows] = useState([]);
  const [usageLoading, setUsageLoading] = useState(true);
  const [masterList, setMasterList] = useState([]);
  const [partiesList, setPartiesList] = useState([]);
  const [reqList, setReqList] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showReqForm, setShowReqForm] = useState(false);
  // collapse state for each new section
  const [openUsage, setOpenUsage] = useState(true);
  const [openLegacy, setOpenLegacy] = useState(false);
  const [openReqs, setOpenReqs] = useState(false);
  const [openReserved, setOpenReserved] = useState(false);

  // Log-usage form
  const emptyLog = {
    equipment_id: "", equipment_name: "", vendor_name: "",
    usage_date: localYMD(), start_time: "", end_time: "",
    hours_or_days: "", rate_used: "", trip_charge: "", lump_amount: "",
    settlement_side: "company", vendor_id: "", subcon_id: "",
    fuel_qty: "", fuel_cost: "", operator_name: "", meter_start: "", meter_end: "",
  };
  const [logForm, setLogForm] = useState(emptyLog);
  const [logSaving, setLogSaving] = useState(false);
  const [logErr, setLogErr] = useState("");
  const updLog = (k, v) => setLogForm(p => ({ ...p, [k]: v }));

  // Request form
  const emptyReq = { equipment_type: "Earthwork", capacity: "", from_date: "", to_date: "", duration_approx: "", reason: "" };
  const [reqForm, setReqForm] = useState(emptyReq);
  const [reqSaving, setReqSaving] = useState(false);
  const updReq = (k, v) => setReqForm(p => ({ ...p, [k]: v }));

  const SC = { "On Site": { c: T.grn, bg: T.grnL }, "Returned": { c: T.t3, bg: T.surfaceB } };
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtD = (raw) => {
    if (!raw) return "—";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  };

  const load = () => {
    if (!projectId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    api.get("/library/project-equipment?project_id=" + projectId)
      .then(r => setRows(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  const loadUsage = useCallback(() => {
    if (!projectId) { setUsageRows([]); setUsageLoading(false); return; }
    setUsageLoading(true);
    api.get("/equipment/usage?project_id=" + projectId)
      .then(r => setUsageRows(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setUsageRows([]))
      .finally(() => setUsageLoading(false));
  }, [projectId]);

  const loadRequests = useCallback(() => {
    if (!projectId) { setReqList([]); return; }
    api.get("/equipment/request?project_id=" + projectId)
      .then(r => setReqList(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setReqList([]));
  }, [projectId]);

  const loadReservations = useCallback(() => {
    if (!projectId) { setReservations([]); return; }
    api.get("/equipment/reservation?project_id=" + projectId)
      .then(r => setReservations(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setReservations([]));
  }, [projectId]);

  useEffect(() => {
    loadUsage(); loadRequests(); loadReservations();
  }, [loadUsage, loadRequests, loadReservations]);

  useEffect(() => {
    api.get("/equipment/master").then(r => {
      if (r && r.success) setMasterList(r.data || []);
    }).catch(() => {});
    api.get("/finance/parties").then(r => {
      if (r && r.success) setPartiesList(r.data || []);
    }).catch(() => {});
  }, []);

  const totalCost = usageRows
    .filter(u => u.finance_status === "confirmed")
    .reduce((s, u) => s + (Number(u.total_amount) || 0), 0);
  const confirmedCount = usageRows.filter(u => u.finance_status === "confirmed").length;

  const saveUsage = async () => {
    if (!projectId) { setLogErr("Project missing"); return; }
    if (!logForm.equipment_id && !logForm.equipment_name.trim()) {
      setLogErr("Select equipment or enter a name");
      return;
    }
    setLogSaving(true); setLogErr("");
    const body = {
      project_id: projectId,
      usage_date: logForm.usage_date,
      paid_by_contractor: false,
      settlement_side: logForm.settlement_side,
    };
    if (logForm.equipment_id) body.equipment_id = parseInt(logForm.equipment_id, 10);
    else body.equipment_name = logForm.equipment_name.trim();
    if (logForm.vendor_name) body.vendor_name = logForm.vendor_name;
    if (logForm.start_time) body.start_time = logForm.start_time;
    if (logForm.end_time) body.end_time = logForm.end_time;
    if (logForm.hours_or_days !== "") body.hours_or_days = parseFloat(logForm.hours_or_days) || 0;
    if (logForm.rate_used !== "") body.rate_used = parseFloat(logForm.rate_used) || 0;
    if (logForm.trip_charge !== "") body.trip_charge = parseFloat(logForm.trip_charge) || 0;
    if (logForm.lump_amount !== "") body.lump_amount = parseFloat(logForm.lump_amount) || 0;
    if (logForm.vendor_id) body.vendor_id = parseInt(logForm.vendor_id, 10);
    if (logForm.subcon_id) body.subcon_id = parseInt(logForm.subcon_id, 10);
    if (logForm.fuel_qty !== "") body.fuel_qty = parseFloat(logForm.fuel_qty) || 0;
    if (logForm.fuel_cost !== "") body.fuel_cost = parseFloat(logForm.fuel_cost) || 0;
    if (logForm.operator_name) body.operator_name = logForm.operator_name;
    if (logForm.meter_start !== "") body.meter_start = parseFloat(logForm.meter_start) || 0;
    if (logForm.meter_end !== "") body.meter_end = parseFloat(logForm.meter_end) || 0;

    try {
      const res = await api.post("/equipment/usage", body);
      if (res && res.success) {
        setShowLogModal(false);
        setLogForm(emptyLog);
        loadUsage();
      } else {
        setLogErr((res && res.message) || "Save failed");
      }
    } catch (e) {
      setLogErr(e.message || "Save failed");
    }
    setLogSaving(false);
  };

  const saveRequest = async () => {
    if (!projectId) return;
    if (!reqForm.equipment_type) return;
    setReqSaving(true);
    try {
      const res = await api.post("/equipment/request", {
        project_id: projectId,
        equipment_type: reqForm.equipment_type,
        capacity: reqForm.capacity,
        from_date: reqForm.from_date || null,
        to_date: reqForm.to_date || null,
        duration_approx: reqForm.duration_approx,
        reason: reqForm.reason,
      });
      if (res && res.success) {
        setShowReqForm(false);
        setReqForm(emptyReq);
        loadRequests();
      } else {
        window.alert((res && res.message) || "Save failed");
      }
    } catch (e) { window.alert(e.message || "Save failed"); }
    setReqSaving(false);
  };

  const finStatusPill = (status, approval) => {
    if (status === "confirmed") return <Pill label="Confirmed" c={T.grn} bg={T.grnL} />;
    if (status === "log_only") return <Pill label="Log only" c={T.t3} bg={T.sltL} />;
    if (status === "suggested" || !status) {
      if (approval === "pending") return <Pill label="Approval pending" c={T.amb} bg={T.ambL} />;
      if (approval === "rejected") return <Pill label="Rate rejected" c={T.red} bg={T.redL} />;
      return <Pill label="Suggested" c={T.amb} bg={T.ambL} />;
    }
    return <Pill label={status} c={T.t3} bg={T.sltL} />;
  };

  const reqStatusPill = (s) => {
    if (s === "fulfilled") return <Pill label="Fulfilled" c={T.grn} bg={T.grnL} />;
    if (s === "rejected") return <Pill label="Rejected" c={T.red} bg={T.redL} />;
    return <Pill label="Pending" c={T.amb} bg={T.ambL} />;
  };

  const vendorParties = partiesList.filter(p => {
    const t = String(p.type || "").toLowerCase();
    return t.includes("vendor") || t === "supplier" || t === "material supplier";
  });
  const subconParties = partiesList.filter(p => {
    const t = String(p.type || "").toLowerCase();
    return t === "subcon" || t === "sub-con" || t === "subcontractor";
  });

  const dispDuration = (u) => {
    if (u.measurement_mode === "fixed") return "Fixed";
    const n = Number(u.hours_or_days) || 0;
    if (u.measurement_mode === "daily") return `${n} day${n !== 1 ? "s" : ""}`;
    return `${n} hr`;
  };

  // Collapsible section helper (inline)
  const SectionHeader = ({ title, open, onToggle, action, count }) => (
    <div onClick={onToggle}
      style={{ padding: "10px 15px", borderBottom: open ? `1px solid ${T.b1}` : "none",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: T.surfaceB, cursor: "pointer", userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={T.t3} strokeWidth={2.4}
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s" }}>
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{title}</span>
        {typeof count === "number" && (
          <span style={{ fontSize: 11, fontWeight: 600, color: T.t3, background: T.surface, border: `1px solid ${T.b1}`, padding: "1px 8px", borderRadius: 20 }}>{count}</span>
        )}
      </div>
      <div onClick={e => e.stopPropagation()}>{action}</div>
    </div>
  );

  const toggleStatus = async (eq) => {
    const next = eq.status === "Returned" ? "On Site" : "Returned";
    setRows(prev => prev.map(x => x.id === eq.id ? { ...x, status: next } : x));
    const r = await api.patch("/library/project-equipment/" + eq.id, { status: next });
    if (!r || r.success === false) { window.alert((r && r.message) || "Update failed"); load(); }
  };
  const removeEq = async (eq) => {
    if (!window.confirm(`Remove ${eq.name}?`)) return;
    const r = await api.del("/library/project-equipment/" + eq.id);
    if (!r || r.success === false) { window.alert((r && r.message) || "Delete failed"); return; }
    load();
  };
  const resetForm = () => { setName(""); setVendor("Self"); setFromD(""); setToD(""); setStat("On Site"); setRate(""); };
  const saveNew = async () => {
    if (!name.trim()) { window.alert("Equipment name required"); return; }
    setSaving(true);
    const r = await api.post("/library/project-equipment", {
      project_id: projectId,
      name: name.trim(),
      vendor: vendor.trim() || "Self",
      from_date: fromD || null,
      to_date: toD || null,
      status: stat,
      rate_per_day: rate || null,
    });
    setSaving(false);
    if (!r || r.success === false) { window.alert((r && r.message) || "Save failed"); return; }
    resetForm();
    setShowAdd(false);
    load();
  };

  const inp = { width: "100%", padding: "9px 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`,
    fontSize: 13, outline: "none", fontFamily: "inherit", color: T.t1, background: T.surface, boxSizing: "border-box" };

  const onSite   = rows.filter(r => r.status !== "Returned").length;
  const returned = rows.filter(r => r.status === "Returned").length;

  return (
    <div style={{ padding: "16px 18px" }}>
      {/* ── KPI: Total equipment cost ─────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        <Stat label="Total Equipment Cost" value={`₹${fmtN(Math.round(totalCost))}`}
          note={`${confirmedCount} confirmed entr${confirmedCount === 1 ? "y" : "ies"}`}
          color={T.blu} />
        <Stat label="Usage Entries" value={usageRows.length}
          note={`${usageRows.filter(u => (u.finance_status || "suggested") === "suggested").length} awaiting review`}
          color={T.amb} />
        <Stat label="Active Requests" value={reqList.filter(r => r.status === "pending").length}
          note={`${reservations.length} reserved`}
          color={T.pur} />
      </div>

      {/* ── 1. USAGE LOG ──────────────────────────────────────────── */}
      <Panel style={{ marginBottom: 12 }}>
        <SectionHeader title="Usage Log" open={openUsage} onToggle={() => setOpenUsage(v => !v)}
          count={usageRows.length}
          action={<AddBtn label="Log usage" onClick={() => { setLogForm(emptyLog); setLogErr(""); setShowLogModal(true); }} />} />
        {openUsage && (
          <div>
            {usageLoading && <div style={{ textAlign: "center", padding: "30px 0", color: T.t4, fontSize: 13 }}>Loading usage...</div>}
            {!usageLoading && usageRows.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 20px", color: T.t4, fontSize: 13 }}>No usage entries logged yet.</div>
            )}
            {!usageLoading && usageRows.length > 0 && (
              <>
                <THead cols="100px 1.6fr 1fr 90px 80px 100px 1.1fr 1fr"
                  headers={["Date", "Equipment", "Mode / Dur.", "Rate", "Trip", "Total", "Route", "Status"]} />
                {usageRows.map(u => {
                  const route = u.confirmed_route || u.suggested_route || "—";
                  const routeLabel = route === "vendor" ? "Vendor" : route === "subcon" ? "Sub-con" : route === "owned" ? "Owned" : route === "log_only" ? "Log only" : route;
                  return (
                    <div key={u.id} style={{ display: "grid", gridTemplateColumns: "100px 1.6fr 1fr 90px 80px 100px 1.1fr 1fr",
                      padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11.5, color: T.t2 }}>{fmtD(u.usage_date)}</span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{u.equipment_name || "—"}</div>
                        {u.vendor_party_name && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1 }}>{u.vendor_party_name}</div>}
                      </div>
                      <span style={{ fontSize: 11.5, color: T.t2 }}>{dispDuration(u)}</span>
                      <span style={{ fontSize: 12, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{u.rate_used ? "₹" + fmtN(u.rate_used) : "—"}</span>
                      <span style={{ fontSize: 11.5, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{u.trip_charge ? "₹" + fmtN(u.trip_charge) : "—"}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>₹{fmtN(u.total_amount || 0)}</span>
                      <span style={{ fontSize: 11.5, color: T.t2 }}>{routeLabel}</span>
                      <span>{finStatusPill(u.finance_status, u.approval_status)}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </Panel>

      {/* ── 4. EQUIPMENT REQUESTS ─────────────────────────────────── */}
      <Panel style={{ marginBottom: 12 }}>
        <SectionHeader title="Equipment Requests" open={openReqs} onToggle={() => setOpenReqs(v => !v)}
          count={reqList.length}
          action={<AddBtn label="Request equipment" onClick={() => setShowReqForm(v => !v)} />} />
        {openReqs && (
          <div>
            {showReqForm && (
              <div style={{ padding: "12px 15px", borderBottom: `1px solid ${T.b1}`, background: T.bluL + "55" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Equipment Type</div>
                    <select value={reqForm.equipment_type} onChange={e => updReq("equipment_type", e.target.value)} style={inp}>
                      {["Earthwork","Lifting","Concrete","Steel","Safety","Transport","Pumping","Compaction"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Capacity</div>
                    <input value={reqForm.capacity} onChange={e => updReq("capacity", e.target.value)} placeholder="e.g. 1 cum" style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>From</div>
                    <input type="date" value={reqForm.from_date} onChange={e => updReq("from_date", e.target.value)} style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>To</div>
                    <input type="date" value={reqForm.to_date} onChange={e => updReq("to_date", e.target.value)} style={inp} />
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Reason / Notes</div>
                  <input value={reqForm.reason} onChange={e => updReq("reason", e.target.value)} placeholder="Site needs JCB for excavation" style={inp} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                  <button onClick={() => { setShowReqForm(false); setReqForm(emptyReq); }} type="button"
                    style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  <button onClick={saveRequest} disabled={reqSaving} type="button"
                    style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: reqSaving ? T.b1 : T.blu, color: reqSaving ? T.t4 : "white", fontSize: 12, fontWeight: 700, cursor: reqSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    {reqSaving ? "Saving..." : "Submit request"}
                  </button>
                </div>
              </div>
            )}
            {reqList.length === 0 && !showReqForm && (
              <div style={{ textAlign: "center", padding: "30px 20px", color: T.t4, fontSize: 13 }}>No requests yet.</div>
            )}
            {reqList.length > 0 && (
              <>
                <THead cols="1.4fr 1fr 1fr 1.4fr 110px" headers={["Type / Capacity", "From", "To", "Reason", "Status"]} />
                {reqList.map(rq => (
                  <div key={rq.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.4fr 110px",
                    padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", gap: 6 }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{rq.equipment_type || "—"}</div>
                      {rq.capacity && <div style={{ fontSize: 10.5, color: T.t4 }}>{rq.capacity}</div>}
                    </div>
                    <span style={{ fontSize: 11.5, color: T.t2 }}>{fmtD(rq.from_date)}</span>
                    <span style={{ fontSize: 11.5, color: T.t2 }}>{fmtD(rq.to_date)}</span>
                    <span style={{ fontSize: 11.5, color: T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rq.reason || "—"}</span>
                    <span>{reqStatusPill(rq.status)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </Panel>

      {/* ── 5. RESERVED EQUIPMENT ─────────────────────────────────── */}
      <Panel style={{ marginBottom: 12 }}>
        <SectionHeader title="Reserved Equipment" open={openReserved} onToggle={() => setOpenReserved(v => !v)}
          count={reservations.length} />
        {openReserved && (
          <div>
            {reservations.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 20px", color: T.t4, fontSize: 13 }}>No reservations.</div>
            )}
            {reservations.map(rv => {
              const eq = masterList.find(m => m.id === rv.equipment_id);
              return (
                <div key={rv.id} style={{ padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{eq?.name || `Equipment #${rv.equipment_id}`}</div>
                    {rv.note && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1 }}>{rv.note}</div>}
                  </div>
                  <span style={{ fontSize: 11.5, color: T.t2 }}>
                    Reserved {fmtD(rv.from_date)} → {fmtD(rv.to_date)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── LEGACY: Period & Status (project_equipment) ───────────── */}
      <Panel style={{ marginBottom: 12 }}>
        <SectionHeader title="Period & Status (legacy)" open={openLegacy} onToggle={() => setOpenLegacy(v => !v)}
          count={rows.length}
          action={<AddBtn label="Add Equipment" onClick={() => setShowAdd(true)} />} />
        {openLegacy && (
          <div style={{ padding: "10px 15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 18 }}>
          <div><div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 600 }}>Total</div><div style={{ fontSize: 19, fontWeight: 700, color: T.t1 }}>{rows.length}</div></div>
          <div><div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 600 }}>On Site</div><div style={{ fontSize: 19, fontWeight: 700, color: T.grn }}>{onSite}</div></div>
          <div><div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 600 }}>Returned</div><div style={{ fontSize: 19, fontWeight: 700, color: T.t3 }}>{returned}</div></div>
        </div>
      </div>

      {showAdd && (
        <Panel style={{ marginBottom: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 10 }}>Add Equipment</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Name *</div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="JCB Excavator" style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Vendor</div>
              <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder='"Self" for company-owned' style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>From</div>
              <input type="date" value={fromD} onChange={e => setFromD(e.target.value)} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>To</div>
              <input type="date" value={toD} onChange={e => setToD(e.target.value)} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Status</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["On Site", "Returned"].map(s => {
                  const on = stat === s;
                  const sm = SC[s];
                  return (
                    <button key={s} onClick={() => setStat(s)} type="button"
                      style={{ flex: 1, padding: "8px", borderRadius: 7,
                        border: `1.5px solid ${on ? sm.c : T.b1}`,
                        background: on ? sm.bg : "transparent",
                        color: on ? sm.c : T.t3, fontSize: 12, fontWeight: on ? 700 : 500,
                        cursor: "pointer", fontFamily: "inherit" }}>{s}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Day Rate (optional)</div>
              <input value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 5000" style={inp} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button onClick={() => { resetForm(); setShowAdd(false); }} type="button"
              style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={saveNew} disabled={saving || !name.trim()} type="button"
              style={{ padding: "8px 16px", borderRadius: 7, border: "none",
                background: (saving || !name.trim()) ? T.b1 : T.blu,
                color: (saving || !name.trim()) ? T.t4 : "white",
                fontSize: 12, fontWeight: 700,
                cursor: (saving || !name.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {saving ? "Saving..." : "Add Equipment"}
            </button>
          </div>
        </Panel>
      )}

      {loading && <div style={{ textAlign: "center", padding: "40px 0", color: T.t4, fontSize: 13 }}>Loading...</div>}

      {!loading && rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 20px", color: T.t4, fontSize: 13 }}>
          No equipment deployed yet — click "Add Equipment" to track one.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <Panel style={{ overflow: "hidden" }}>
          <THead cols="2fr 1.4fr 1.6fr 110px 110px 60px" headers={["Equipment", "Vendor", "Period", "Day Rate", "Status", ""]} />
          {rows.map(eq => {
            const sm = SC[eq.status] || SC["On Site"];
            return (
              <div key={eq.id}
                style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1.6fr 110px 110px 60px",
                  padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{eq.name}</div>
                  {eq.equipment_code && <div style={{ fontSize: 10, color: T.t4, marginTop: 1 }}>{eq.equipment_code}</div>}
                </div>
                <span style={{ fontSize: 12, color: T.t2 }}>{eq.vendor || "Self"}</span>
                <span style={{ fontSize: 11.5, color: T.t2 }}>
                  {eq.from_date ? fmtD(eq.from_date) : "—"}
                  {eq.to_date ? <> &nbsp;→&nbsp; {fmtD(eq.to_date)}</> : ""}
                </span>
                <span style={{ fontSize: 12.5, color: T.t1, fontVariantNumeric: "tabular-nums" }}>
                  {eq.rate_per_day ? "₹" + fmtN(eq.rate_per_day) : "—"}
                </span>
                <button onClick={() => toggleStatus(eq)} type="button"
                  style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
                    background: sm.bg, color: sm.c, border: "none", cursor: "pointer",
                    fontFamily: "inherit", justifySelf: "start" }}>
                  {eq.status}
                </button>
                <button onClick={() => removeEq(eq)} type="button"
                  title="Remove"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: T.t4, fontSize: 16, fontFamily: "inherit", justifySelf: "end" }}>
                  ×
                </button>
              </div>
            );
          })}
        </Panel>
      )}
          </div>
        )}
      </Panel>

      {/* ── Log Usage Modal ───────────────────────────────────────── */}
      {showLogModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowLogModal(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
          <div style={{ position: "relative", width: 720, maxWidth: "94vw", maxHeight: "92vh", background: T.surface, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 22px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>Log Equipment Usage</div>
              <button onClick={() => setShowLogModal(false)} style={{ background: T.surfaceB, border: "none", borderRadius: 6, padding: 6, cursor: "pointer", display: "flex" }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.t3} strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: "16px 22px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Equipment (from master)</div>
                  <select value={logForm.equipment_id} onChange={e => updLog("equipment_id", e.target.value)} style={inp}>
                    <option value="">— Select / leave empty for ad-hoc —</option>
                    {masterList.map(m => <option key={m.id} value={m.id}>{m.name}{m.code ? ` (${m.code})` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>OR Ad-hoc equipment name</div>
                  <input value={logForm.equipment_name} onChange={e => updLog("equipment_name", e.target.value)} placeholder="e.g. Borrowed JCB" style={inp} disabled={!!logForm.equipment_id} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Usage Date</div>
                  <input type="date" value={logForm.usage_date} onChange={e => updLog("usage_date", e.target.value)} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Vendor name (ad-hoc, optional)</div>
                  <input value={logForm.vendor_name} onChange={e => updLog("vendor_name", e.target.value)} placeholder="If no party set" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Start Time</div>
                  <input type="time" value={logForm.start_time} onChange={e => updLog("start_time", e.target.value)} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>End Time</div>
                  <input type="time" value={logForm.end_time} onChange={e => updLog("end_time", e.target.value)} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Hours or Days</div>
                  <input value={logForm.hours_or_days} onChange={e => updLog("hours_or_days", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 4" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Rate Used (₹)</div>
                  <input value={logForm.rate_used} onChange={e => updLog("rate_used", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Trip Charge (₹)</div>
                  <input value={logForm.trip_charge} onChange={e => updLog("trip_charge", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Lump Amount (Fixed mode)</div>
                  <input value={logForm.lump_amount} onChange={e => updLog("lump_amount", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
                </div>
                <div style={{ gridColumn: "1 / 3" }}>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Settlement Side</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ k: "company", l: "Company pays" }, { k: "subcon", l: "Subcon pays" }].map(o => {
                      const on = logForm.settlement_side === o.k;
                      return (
                        <button key={o.k} onClick={() => updLog("settlement_side", o.k)} type="button"
                          style={{ flex: 1, padding: "9px", borderRadius: 7,
                            border: `1.5px solid ${on ? T.blu : T.b1}`,
                            background: on ? T.bluL : T.surface,
                            color: on ? T.blu : T.t3, fontSize: 12.5, fontWeight: on ? 700 : 500,
                            cursor: "pointer", fontFamily: "inherit" }}>{o.l}</button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Vendor (party)</div>
                  <select value={logForm.vendor_id} onChange={e => updLog("vendor_id", e.target.value)} style={inp}>
                    <option value="">—</option>
                    {vendorParties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Subcon (party)</div>
                  <select value={logForm.subcon_id} onChange={e => updLog("subcon_id", e.target.value)} style={inp}>
                    <option value="">—</option>
                    {subconParties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Fuel Qty (L)</div>
                  <input value={logForm.fuel_qty} onChange={e => updLog("fuel_qty", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Fuel Cost (₹)</div>
                  <input value={logForm.fuel_cost} onChange={e => updLog("fuel_cost", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Operator Name</div>
                  <input value={logForm.operator_name} onChange={e => updLog("operator_name", e.target.value)} placeholder="e.g. Ramesh Kumar" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Meter Start / End (optional)</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={logForm.meter_start} onChange={e => updLog("meter_start", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="start" style={inp} />
                    <input value={logForm.meter_end} onChange={e => updLog("meter_end", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="end" style={inp} />
                  </div>
                </div>
              </div>
              {logErr && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 6, fontWeight: 600 }}>{logErr}</div>
              )}
            </div>
            <div style={{ padding: "12px 22px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowLogModal(false)} type="button"
                style={{ padding: "9px 16px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12.5, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={saveUsage} disabled={logSaving} type="button"
                style={{ padding: "9px 20px", borderRadius: 7, border: "none", background: logSaving ? T.b1 : T.blu, color: logSaving ? T.t4 : "white", fontSize: 12.5, fontWeight: 700, cursor: logSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {logSaving ? "Saving..." : "Save Usage"}
              </button>
            </div>
          </div>
        </div>
      )}
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
// TAB 14 — MOM  (wired to /api/mom?project_id=...)
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// TAB 14 — MOM
// ═══════════════════════════════════════════════════════════════════
function TabMOM({ project }) {
  // Reuse the company-level MOMModule scoped to this project.
  // Same stats / cards / Action Tracker / Create flow — just filtered to project_id.
  return (
    <div style={{height:"100%", overflow:"auto"}}>
      <MOMModule projectId={project?.id} projectName={project?.name} embedded/>
    </div>
  );
}

// (legacy demo-data TabMOM removed — see project tab uses MOMModule above)
function _TabMOM_legacy_unused() {
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
              <div style={{fontSize:11, color:T.t4}}>{m.attendees.length>0?m.attendees.slice(0,2).join(", ")+(m.attendees.length>2?` +${m.attendees.length-2}`:""):"No attendees yet"}</div>
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
// PROJECT DETAIL PAGE — SHELL
// ═══════════════════════════════════════════════════════════════════

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


// ── ProjectSwitcher — clickable project name in the top breadcrumb ──
// Dropdown uses position:fixed (anchored to the trigger via getBoundingClientRect)
// so it escapes the breadcrumb's overflow:hidden — earlier the popup got clipped
// and the user just saw a sliver of the search input.
function ProjectSwitcher({ current, onSwitch }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popRef = useRef(null);

  // Close on outside click + recompute position on resize/scroll
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const updatePos = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 6, left: r.left });
    };
    updatePos();
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  const loadProjects = async () => {
    if (list.length) return;
    setLoading(true);
    try {
      const r = await api.get("/projects");
      const arr = Array.isArray(r?.data) ? r.data : [];
      setList(arr);
    } catch (_) {}
    setLoading(false);
  };

  const filtered = list
    .filter(p => String(p.id) !== String(current?.id))
    .filter(p => !search || String(p.name||"").toLowerCase().includes(search.toLowerCase())
                          || String(p.client||p.client_name||"").toLowerCase().includes(search.toLowerCase()));

  const onPick = (p) => {
    if (typeof onSwitch === "function") onSwitch(p);
    setOpen(false);
    setSearch("");
  };

  const onToggle = () => {
    if (!open) {
      loadProjects();
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(o => !o);
  };

  return (
    <>
      <button ref={btnRef} onClick={onToggle} title="Switch project"
        style={{
          display:"inline-flex", alignItems:"center", gap:5, flexShrink:0,
          padding:"4px 9px 4px 10px", borderRadius:7, border:"1px solid rgba(255,255,255,.12)",
          background: open ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)",
          color:"#fff", cursor:"pointer", fontFamily:"inherit", maxWidth:260,
          transition:"background .12s",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,.1)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}>
        <span title={current?.name} style={{fontSize:13.5, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:200}}>{current?.name}</span>
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{opacity:.7, transform: open ? "rotate(180deg)" : "none", transition:"transform .15s"}}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div ref={popRef} style={{
          position:"fixed", top:pos.top, left:pos.left, zIndex:9999,
          minWidth:320, maxWidth:380, maxHeight:440, overflowY:"auto",
          background:"#fff", borderRadius:9, boxShadow:"0 14px 36px rgba(0,0,0,.22)",
          border:"1px solid #E5E7EB", display:"flex", flexDirection:"column",
        }}>
          <div style={{padding:"9px 11px", borderBottom:"1px solid #F1F5F9", position:"sticky", top:0, background:"#fff"}}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search project or client..."
              style={{width:"100%", padding:"7px 10px", borderRadius:6, border:"1.5px solid #E5E7EB", fontSize:12.5, outline:"none", boxSizing:"border-box", fontFamily:"inherit"}}/>
          </div>
          {loading && <div style={{padding:"18px 14px", textAlign:"center", fontSize:12, color:"#94A3B8"}}>Loading projects...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{padding:"22px 14px", textAlign:"center", fontSize:12.5, color:"#64748B"}}>
              {search ? "No projects match." : "No other projects."}
            </div>
          )}
          {!loading && filtered.map(p => (
            <button key={p.id} onClick={() => onPick(p)}
              style={{
                display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                border:"none", borderTop:"1px solid #F1F5F9", background:"#fff", cursor:"pointer",
                textAlign:"left", fontFamily:"inherit", transition:"background .1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#F0F9FF"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <div style={{width:30, height:30, borderRadius:7, background:"#EEF2FF", color:"#4338CA", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, flexShrink:0}}>
                {String(p.name||"?").charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13, fontWeight:700, color:"#0F172A", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.name}</div>
                <div style={{fontSize:10.5, color:"#94A3B8", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                  {p.client_name || p.client || "—"}{p.city ? ` · ${p.city}` : ""}{p.status ? ` · ${p.status}` : ""}
                </div>
              </div>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2.4} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function ProjectDetailPage({project=PROJ, onBack, onSwitchProject}) {
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
    overview:    <TabOverview    proj={project} onRequestPayment={()=>setPaymentReq({})}/>,
    design:      <TabDesign project={project} isAdmin={isAdmin}/>,
    estimate:    <TabEstimate project={project}/>,
    party:       <TabParty projectId={project.id} projectName={project.name}/>,
    transaction: <TabTransaction projectId={project.id} projectName={project.name}/>,
    todo:        <TabTodo projectId={project.id}/>,
    task:        <TabTasks projectId={project.id} isAdmin={isAdmin}/>,
    attendance:  <TabAttendance project={project}/>,
    material:    <TabMaterial project={project}/>,
    subcon:      <TabSubcon projectId={project.id} project={project}/>,
    equipment:   <TabEquipment projectId={project.id}/>,
    files:       <TabFiles projectId={project.id}/>,
    site:        <TabSite/>,
    mom:         <TabMOM project={project}/>,
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
          {/* Left: breadcrumb — project name is a switcher dropdown */}
          <div style={{flex:1, minWidth:0, display:"flex", alignItems:"center", gap:8, overflow:"hidden"}}>
            <ProjectSwitcher current={project} onSwitch={onSwitchProject}/>
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
      {/* (MaterialFlowDrawer + MRDetailDrawer mounted inside TabMaterial — they
           depend on flowGrnId / flowEditMR state declared in that component.) */}
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

  const MOD_COLORS = { "Material Request": T.amb, "Design Approval": "#7C3AED", "Purchase Order (PO)": T.blu, "RA Bill": "#0891B2", "Subcon WO Amendment": "#EA580C", "Customer Estimate Amendment": "#DB2777", "Customer Invoice Draft": "#6D28D9", "Payment Request": T.blu, "Material Site Transfer": "#059669", "Material Issue": "#059669" };

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
