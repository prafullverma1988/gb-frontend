import React, { useState, useEffect, useRef } from "react";
import api from "../../config/api";
import apiCache from "../../utils/apiCache";
import SearchSelect from "../../components/SearchSelect";
import LibrarySelect from "../../components/LibrarySelect";
import { T } from "../shared/tokens";

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
// P3: execution delay vs the planned finish. Prefer the FROZEN original
// baseline (so cascade/rebaseline doesn't hide slippage); fall back to the
// current plan (base_end). kind: late | early | ontime | running | none
function ptPlannedEnd(t){ return t.originalEnd || t.baseEnd || null; }
function ptFinishVar(t){
  const pe = ptPlannedEnd(t);
  if(!pe) return {kind:"none",days:0};
  const done = t.status==="Completed" || Number(t.progress)===100;
  if(done){
    if(!t.actualEnd) return {kind:"none",days:0};
    const d = Math.round((new Date(t.actualEnd)-new Date(pe))/86400000);
    if(d>0) return {kind:"late",days:d};
    if(d<0) return {kind:"early",days:-d};
    return {kind:"ontime",days:0};
  }
  const d = Math.round((new Date()-new Date(pe))/86400000);
  if(d>0) return {kind:"running",days:d};
  return {kind:"ontime",days:0};
}
// Phase-aware numbering: each top-level task = a PHASE (short code + colour);
// every descendant gets CODE-NN in pre-order. Self-describing on mobile / flat
// / filtered lists and pairs with phase filters. Pure display — DB task_no
// is never touched. Returns { [taskId]: {code, phaseCode, phaseColor, phaseName, isPhase} }.
const PT_PHASE_PALETTE=["#2563EB","#16A34A","#EA580C","#7C3AED","#DB2777","#0891B2","#65A30D","#CA8A04","#DC2626","#0D9488","#9333EA","#0EA5E9"];
function ptPhaseCodes(roots){
  const used=new Set(); const map={};
  const derive=(name)=>{
    const words=(name||"").toUpperCase().replace(/[^A-Z0-9 ]/g," ").split(/\s+/).filter(Boolean);
    let base = words[0] ? words[0].slice(0,3) : "TSK";
    if(base.length<2 && words[1]) base=(base+words[1]).slice(0,3);
    base = base.replace(/[^A-Z0-9]/g,"") || "TSK";
    let code=base, i=2; while(used.has(code)){ code=base+i; i++; } used.add(code); return code;
  };
  (roots||[]).forEach((phase,pi)=>{
    const pc=derive(phase.name); const color=PT_PHASE_PALETTE[pi%PT_PHASE_PALETTE.length];
    map[phase.id]={code:pc, phaseCode:pc, phaseColor:color, phaseName:phase.name, isPhase:true};
    let counter=0;
    const walk=(node)=>{ (node.children||[]).forEach(ch=>{ counter++; map[ch.id]={code:`${pc}-${String(counter).padStart(2,"0")}`, phaseCode:pc, phaseColor:color, phaseName:phase.name, isPhase:false}; walk(ch); }); };
    walk(phase);
  });
  return map;
}
// P4: structured delay reasons — fixed keys (AI-ready) + Hinglish labels + colour.
const PT_DELAY_REASONS=[
  {key:"material",   label:"Material late",     color:"#DC2626"},
  {key:"labour",     label:"Labour kam",        color:"#EA580C"},
  {key:"weather",    label:"Mausam / Baarish",  color:"#0891B2"},
  {key:"drawing",    label:"Drawing/Approval",  color:"#7C3AED"},
  {key:"client",     label:"Client change",     color:"#DB2777"},
  {key:"payment",    label:"Payment delay",     color:"#CA8A04"},
  {key:"machinery",  label:"Machine kharab",    color:"#475569"},
  {key:"contractor", label:"Thekedar issue",    color:"#9333EA"},
  {key:"other",      label:"Other",             color:"#64748B"},
];
const PT_REASON_MAP=Object.fromEntries(PT_DELAY_REASONS.map(r=>[r.key,r]));

function TabTasks({ projectId, isAdmin }) {
  const [tasks,setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile,setIsMobile]=useState(()=>window.innerWidth<768);
  useEffect(()=>{const fn=()=>setIsMobile(window.innerWidth<768);window.addEventListener("resize",fn);return()=>window.removeEventListener("resize",fn);},[]);

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

  // ── Schedule lifecycle: estimate → plan_locked → started ──
  const [proj, setProj] = useState(null); // {plan_locked, start_locked, start_date}
  const [startModal, setStartModal] = useState(null); // {mode:'anchor'|'lock'}
  const loadProj = async () => {
    if (!projectId) return;
    try { const r = await api.get("/projects/"+projectId); if (r.success) setProj(r.data); } catch(_){}
  };
  useEffect(()=>{ loadProj(); /* eslint-disable-next-line */ }, [projectId]);
  const canEditSchedule = isAdmin || !proj?.plan_locked;
  const lockPlan = async () => {
    if(!await window.confirmAsync("Plan lock karein? Iske baad sirf admin schedule (dates/duration/dependency) badal sakega.")) return;
    try { await api.post("/projects/"+projectId+"/lock-plan",{}); } catch(_){}
    loadProj();
  };
  const unlockPlan = async () => {
    const reason = await window.promptAsync("Plan unlock karne ka reason (min 5 char):"); if(!reason||reason.trim().length<5) return;
    try { await api.post("/projects/"+projectId+"/unlock-plan",{reason}); } catch(_){}
    loadProj();
  };
  const unlockStart = async () => {
    const reason = await window.promptAsync("Start date unlock karne ka reason (min 5 char):"); if(!reason||reason.trim().length<5) return;
    try { await api.post("/projects/"+projectId+"/unlock-start",{reason}); } catch(_){}
    loadProj();
  };

  // ── COLUMN RESIZE (Option A: drag-handle, per-user localStorage) ──
  const BASE_COL_KEYS     = ["toggle","no","name","status","progress","start","end","days","assigned"];
  const BASELINE_COL_KEYS = ["blStart","blEnd","slip"];
  const COL_KEYS     = showBaseline ? [...BASE_COL_KEYS, ...BASELINE_COL_KEYS] : BASE_COL_KEYS;
  const COL_LABELS   = {toggle:"", no:"Phase / Code", name:"Task Name", status:"Status", progress:"Progress", start:"Start", end:"End", days:"Days", assigned:"Assigned", blStart:"BL Start", blEnd:"BL End", slip:"Slip"};
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
          t.id = Number(t.id);
          t.no = t.task_no || String(t.id); // fallback: DB id if task_no missing
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
  const [fAsSchedule,setFAsSchedule] = useState(false);   // flat chronological sort view
  const [fToday,setFToday]           = useState(false);    // show only today's tasks
  const [fPhase,setFPhase]           = useState("All");    // root-task (phase) filter — mobile filter sheet
  const [fDateFrom,setFDateFrom]     = useState("");       // unified date range — from
  const [fDateTo,setFDateTo]         = useState("");       // unified date range — to
  const [showFilters,setShowFilters] = useState(false);
  const [savedFilters,setSavedFilters] = useState([
    {name:"Civil Ongoing",  f:{fCat:"Civil",fStatus:"Ongoing",fAssignee:"All",fDelayed:false,fAsSchedule:false,fToday:false,fDateFrom:"",fDateTo:""}},
    {name:"My Delayed",     f:{fCat:"All",fStatus:"All",fAssignee:"All",fDelayed:true, fAsSchedule:false,fToday:false,fDateFrom:"",fDateTo:""}},
    {name:"Today Schedule", f:{fCat:"All",fStatus:"All",fAssignee:"All",fDelayed:false,fAsSchedule:true, fToday:true, fDateFrom:"",fDateTo:""}},
  ]);
  const [filterSaveName,setFilterSaveName] = useState("");
  const [lastUsedFilter,setLastUsedFilter] = useState(null);
  const [levelFilter,setLevelFilter] = useState("All");
  const [ganttScale,setGanttScale]   = useState("month");
  const [ganttRange,setGanttRange]   = useState({from:"",to:""});
  const [infoTask,setInfoTask]       = useState(null);
  const [contextMenu,setContextMenu] = useState(null); // {x,y,task}
  const [dhyanTask,setDhyanTask]     = useState(null);
  const [pendingTask,setPendingTask] = useState(null);
  const [openTask,setOpenTask]       = useState(null);
  const [editTask,setEditTask]       = useState(null);
  const [addParent,setAddParent]     = useState(null);
  const [showAdd,setShowAdd]         = useState(false);
  const [depSearch,setDepSearch]     = useState("");
  const [cascadePreview,setCascadePreview]   = useState(null); // P2e: {taskId,base_start,base_end,changed,affected}
  const [cascadeApplying,setCascadeApplying] = useState(false);
  const [reasonMenu,setReasonMenu] = useState(null); // P4: {x,y,task}
  // ── Gantt: quick dep remove + cascade fix callbacks ────────────
  const ganttRemoveDep = async (taskId, depId) => {
    const t = allFlat.find(x=>x.id===Number(taskId));
    if(!t) return;
    let deps = Array.isArray(t.dependencies) ? t.dependencies.map(Number) : [];
    deps = deps.filter(d=>d!==Number(depId));
    try { await api.put("/tasks/"+taskId, {dependencies: deps}); } catch(_){}
    setTasks(updateInTree(tasks, Number(taskId), {dependencies: deps}));
  };
  const ganttAddDep = async (taskId, depId) => {
    const t = allFlat.find(x=>x.id===Number(taskId));
    if(!t) return;
    let deps = Array.isArray(t.dependencies) ? t.dependencies.map(Number) : [];
    if(deps.includes(Number(depId))) return;
    deps = [...deps, Number(depId)];
    try { await api.put("/tasks/"+taskId, {dependencies: deps}); } catch(_){}
    setTasks(updateInTree(tasks, Number(taskId), {dependencies: deps}));
  };
  const ganttCascadeFix = async (taskId, newStart) => {
    if(!newStart) return;
    setCascadeApplying(true);
    try {
      const r = await api.post("/tasks/"+taskId+"/reschedule", {base_start:newStart, base_end:null, mode:"apply"});
      if(r.success) await refetchTasks();
    } catch(_){}
    setCascadeApplying(false);
  };

  const setDelayReason = async (task, key) => {
    setReasonMenu(null);
    try { await api.put("/tasks/"+task.id, { delay_reason: key || "" }); } catch(_){}
    setTasks(updateInTree(tasks, task.id, { delay_reason: key || null }));
  };
  // P5: CPM data (critical path + slack) for the Gantt — fetched from the
  // verified backend engine when the Gantt view is open.
  const [cpmData,setCpmData] = useState(null); // {id: {is_critical, slack}}

  const allFlat = ptFlatten(tasks);
  const TEAM_PT = [...new Set(allFlat.map(t=>t.assignee).filter(Boolean))];
  const phaseCodeMap = ptPhaseCodes(tasks); // id -> {code, phaseColor, phaseName, isPhase}

  // ── Level filter metadata ─────────────────────────────────────
  // Count tasks at each depth by walking the tree recursively (ptFlatten
  // does NOT set .level, so we compute depth here directly from the tree).
  // Choosing "L N" shows all tasks from root down to depth N (cumulative).
  const levelMeta = (()=>{
    const depthCounts = {};  // depth (0-indexed) → count at that depth
    function walkDepth(list, depth){
      list.forEach(t=>{
        depthCounts[depth] = (depthCounts[depth]||0)+1;
        if(t.children?.length) walkDepth(t.children, depth+1);
      });
    }
    walkDepth(tasks, 0);
    const maxD = Math.min(6, Math.max(0, ...Object.keys(depthCounts).map(Number)));
    const DEPTH_LABELS = ["Phase","Package","Activity","Sub-Activity","Step","Detail","Micro"];
    // cumulative count: tasks visible when user selects "up to level d+1"
    let cum = 0;
    const levels = [];
    for (let d = 0; d <= maxD; d++) {
      cum += (depthCounts[d]||0);
      levels.push({ depth:d, label: DEPTH_LABELS[d]||`L${d+1}`, count: depthCounts[d]||0, cumCount: cum });
    }
    return { levels, maxD };
  })();

  // P5: fetch CPM (critical path + slack) when Gantt is shown / structure changes
  useEffect(()=>{
    if(view!=="gantt"||!projectId){ return; }
    let cancelled=false;
    api.get("/tasks/cpm?project_id="+projectId).then(r=>{
      if(cancelled||!r.success) return;
      const m={}; (r.data?.tasks||[]).forEach(t=>{ m[t.id]={is_critical:t.is_critical,slack:t.slack}; });
      setCpmData({ map:m, critical_path:r.data?.project?.critical_path||[] });
    }).catch(()=>{});
    return ()=>{ cancelled=true; };
  },[view,projectId,allFlat.length]);

  // Reload the full task tree from backend (used after cascade reschedule etc).
  const refetchTasks = async () => {
    const r = await api.get("/tasks?project_id=" + projectId);
    if (!r.success) return;
    const flat = (r.data || []).filter(t => !String(t.task_no || "").startsWith("TODO-"));
    const map = {};
    flat.forEach((t, idx) => {
      t.children=[]; t.id=Number(t.id); t.no=t.task_no||String(t.id);
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
  };

  // Apply a saved filter
  const applyFilter=(f)=>{
    setFCat(f.fCat||"All");setFStatus(f.fStatus||"All");
    setFTag(f.fTag||"All");setFAssignee(f.fAssignee||"All");
    setFDelayed(f.fDelayed||false);setFAsSchedule(f.fAsSchedule||false);
    setFToday(f.fToday||false);setFDateFrom(f.fDateFrom||"");setFDateTo(f.fDateTo||"");
    setLastUsedFilter(f);
  };
  const saveCurrentFilter=()=>{
    if(!filterSaveName.trim()) return;
    const f={fCat,fStatus,fTag,fAssignee,fDelayed,fAsSchedule,fToday,fDateFrom,fDateTo};
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

  function applyFilters(list,rootPhase){
    return list.map(t=>{
      const thisPhase=rootPhase!==undefined?rootPhase:t.name;
      const ch=t.children?applyFilters(t.children,thisPhase):[];
      const mPhase=fPhase==="All"||thisPhase===fPhase;
      const mCat=fCat==="All"||t.category===fCat;
      const mSt=fStatus==="All"||t.status===fStatus;
      const mTag=fTag==="All"||t.tag===fTag;
      const mAs=fAssignee==="All"||t.assignee===fAssignee;
      const mDel=!fDelayed||ptDelayDays(t)>0;
      // Today filter: task's planned range covers today
      let mToday=true;
      if(fToday){
        const tod=new Date().toISOString().split("T")[0];
        const bs=t.baseStart, be=t.baseEnd;
        mToday=bs&&be?(bs<=tod&&tod<=be):(bs?bs===tod:false);
      }
      // Date range filter: task overlaps with selected range
      let mDate=true;
      if(fDateFrom||fDateTo){
        const bs=t.baseStart, be=t.baseEnd||t.baseStart;
        mDate=bs?((!fDateFrom||be>=fDateFrom)&&(!fDateTo||bs<=fDateTo)):false;
      }
      const self=mPhase&&mCat&&mSt&&mTag&&mAs&&mDel&&mToday&&mDate;
      if(self||ch.length>0) return{...t,children:ch};
      return null;
    }).filter(Boolean);
  }
  const filtered=applyFilters(tasks,undefined);
  const flatFiltered=ptFlatten(filtered);
  // Schedule view: all matched tasks flattened + sorted by baseStart
  const scheduleFlat = fAsSchedule
    ? [...flatFiltered].filter(t=>t.baseStart).sort((a,b)=>a.baseStart.localeCompare(b.baseStart))
    : null;
  const allTags=[...new Set(allFlat.map(t=>t.tag).filter(Boolean))];
  const activeF=[fCat!=="All",fPhase!=="All",fStatus!=="All",fTag!=="All",fAssignee!=="All",fDelayed,fToday,!!(fDateFrom||fDateTo),fAsSchedule].filter(Boolean).length;

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

  const toggleCollapse=(id)=>{setCollapsed(p=>({...p,[id]:!p[id]}));setLevelFilter("custom");};
  // Level dropdown = "collapse to this level" preset; per-row toggles still drill in afterwards
  const applyLevel=(val)=>{
    setLevelFilter(val);
    if(val==="All") return setCollapsed({});
    if(val==="custom") return;
    const maxVisible=parseInt(val,10)-1;   // deepest depth kept open
    const c={};
    (function walk(list,d){ list.forEach(t=>{ if(t.children?.length){ if(d>=maxVisible) c[t.id]=true; walk(t.children,d+1); } }); })(tasks,0);
    setCollapsed(c);
  };

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
      fl.forEach((t,i) => { t.children=[]; t.id=Number(t.id); t.no=t.task_no||String(t.id); t.baseStart=t.base_start; t.baseEnd=t.base_end; t.actualStart=t.actual_start; t.actualEnd=t.actual_end; t.dhyanRakhen=t.dhyan_rakhen; t.lastUpdate=t.last_update; t.assignee=t.assignee_name||t.assigned_to||""; t.serial=i+1; map[t.id]=t; });
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

  function renderRow(t, depth=0, sno=[]){
    const hasKids=t.children?.length>0;
    const isOpen = !collapsed[t.id];
    const ss=STATUS_C[t.status]||STATUS_C["Not Started"];
    const delay=ptDelayDays(t);
    const lvlColors=[T.blu,T.grn,T.amb,"#7C3AED","#EC4899","#0891B2","#84CC16"];
    const pcd=phaseCodeMap[t.id]||{};
    const lvl=pcd.phaseColor||lvlColors[Math.min(depth,6)];
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

          {/* Phase code pill (B+C: code + colour-by-phase) */}
          <div style={{padding:"0 5px",display:"flex",alignItems:"center",...SEP}} title={pcd.phaseName||""}>
            <span style={{display:"inline-block",fontSize:pcd.isPhase?10:9.5,fontWeight:700,fontFamily:"monospace",letterSpacing:.2,color:"white",background:pcd.phaseColor||"#64748B",padding:pcd.isPhase?"2px 7px":"1.5px 6px",borderRadius:5,whiteSpace:"nowrap",lineHeight:1.4}}>{pcd.code||t.no}</span>
          </div>

          {/* Task Name + hover buttons */}
          <div style={{display:"flex",alignItems:"center",paddingLeft:6+indent,paddingRight:4,overflow:"hidden",...SEP,height:"100%",position:"relative"}}>
            <div onClick={(e)=>{e.stopPropagation();handleOpen(t);}} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",flex:1,minWidth:0}}>
              {t.dhyanRakhen&&<svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2} style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>}
              <span style={{fontSize:depth===0?13:12.5,fontWeight:depth===0?600:depth===1?500:400,color:"#1E293B",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
              {t.tag&&<span style={{background:"#FEF3C7",color:"#92400E",fontSize:8,fontWeight:600,padding:"1px 5px",borderRadius:3,flexShrink:0,whiteSpace:"nowrap"}}>{t.tag}</span>}
              {delay>0&&<span style={{background:"#FEE2E2",color:"#DC2626",fontSize:8,fontWeight:600,padding:"1px 4px",borderRadius:3,flexShrink:0}}>+{delay}d</span>}
              {(()=>{const fv=ptFinishVar(t);
                if(fv.kind==="late")   return <span style={{background:"#FEE2E2",color:"#DC2626",fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:3,flexShrink:0}}>✓ {fv.days}d late</span>;
                if(fv.kind==="early")  return <span style={{background:"#DCFCE7",color:"#16A34A",fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:3,flexShrink:0}}>✓ {fv.days}d early</span>;
                if(fv.kind==="ontime"&&(t.status==="Completed"||Number(t.progress)===100)) return <span style={{background:"#DCFCE7",color:"#16A34A",fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:3,flexShrink:0}}>✓ on time</span>;
                return null;})()}
              {/* P4: delay reason chip — shown on late tasks; click to set/change */}
              {(()=>{const fv=ptFinishVar(t); if(fv.kind!=="late"&&fv.kind!=="running") return null;
                const r=t.delay_reason?PT_REASON_MAP[t.delay_reason]:null;
                return r
                  ? <span onClick={e=>{e.stopPropagation();setReasonMenu({x:e.clientX,y:e.clientY,task:t});}} title="Delay kaaron — badalne ke liye click" style={{background:r.color,color:"white",fontSize:8,fontWeight:700,padding:"1px 6px",borderRadius:3,flexShrink:0,cursor:"pointer",whiteSpace:"nowrap"}}>{r.label}</span>
                  : <span onClick={e=>{e.stopPropagation();setReasonMenu({x:e.clientX,y:e.clientY,task:t});}} title="Delay ka kaaron set karo" style={{background:"#FEF3C7",color:"#92400E",border:"1px dashed #F59E0B",fontSize:8,fontWeight:700,padding:"0px 5px",borderRadius:3,flexShrink:0,cursor:"pointer",whiteSpace:"nowrap"}}>+ kaaron?</span>;
              })()}
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

          {/* Start — click opens date picker (locked → read-only) */}
          <div style={{padding:"0 6px",...SEP,display:"flex",alignItems:"center",height:"100%",cursor:canEditSchedule?"pointer":"default",position:"relative"}}
            onClick={e=>{if(!canEditSchedule)return;e.stopPropagation();const inp=e.currentTarget.querySelector("input");inp&&inp.showPicker&&inp.showPicker();}}>
            <span style={{fontSize:10,color:T.t3,whiteSpace:"nowrap",pointerEvents:"none"}}>{fmtDate(t.baseStart)||"—"}</span>
            {canEditSchedule && <input type="date" defaultValue={t.baseStart||""}
              style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%"}}
              onChange={async e=>{
                const v=e.target.value;
                await api.put("/tasks/"+t.id,{base_start:v});
                setTasks(updateInTree(tasks,t.id,{baseStart:v}));
              }}
              onClick={e=>e.stopPropagation()}/>}
          </div>

          {/* End — click opens date picker (locked → read-only) */}
          <div style={{padding:"0 6px",...SEP,display:"flex",alignItems:"center",height:"100%",cursor:canEditSchedule?"pointer":"default",position:"relative"}}
            onClick={e=>{if(!canEditSchedule)return;e.stopPropagation();const inp=e.currentTarget.querySelector("input");inp&&inp.showPicker&&inp.showPicker();}}>
            <span style={{fontSize:10,color:delay>0?T.red:T.t3,fontWeight:delay>0?700:400,whiteSpace:"nowrap",pointerEvents:"none"}}>{fmtDate(t.baseEnd)||"—"}</span>
            {canEditSchedule && <input type="date" defaultValue={t.baseEnd||""}
              style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%"}}
              onChange={async e=>{
                const v=e.target.value;
                await api.put("/tasks/"+t.id,{base_end:v});
                setTasks(updateInTree(tasks,t.id,{baseEnd:v}));
                // P2: if dependents exist, offer to cascade the shift
                const hasDependents = allFlat.some(x => (x.dependencies||[]).map(Number).includes(Number(t.id)));
                if (v && hasDependents) {
                  try {
                    const pv = await api.post(`/tasks/${t.id}/reschedule`, { base_start:t.baseStart||null, base_end:v, mode:"preview" });
                    if (pv.success && pv.data?.affected?.length) setCascadePreview({ taskId:t.id, base_start:t.baseStart||null, base_end:v, changed:pv.data.changed, affected:pv.data.affected });
                  } catch(_){}
                }
              }}
              onClick={e=>e.stopPropagation()}/>}
          </div>

          {/* Days */}
          <div style={{padding:"0 4px",...SEP,display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}>
            {(()=>{const d=t.duration>0?t.duration:(t.baseStart&&t.baseEnd?Math.round((new Date(t.baseEnd)-new Date(t.baseStart))/86400000)+1:0);return <span style={{fontSize:10,color:"#94A3B8",fontWeight:d>0?500:400}}>{d>0?d+"d":"—"}</span>;})()}
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
              {l:"Code",v:pcd.code||t.no||"—"},{l:"Phase",v:pcd.phaseName||"—"},
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
        {hasKids&&isOpen&&t.children.map(ch=>renderRow(ch,depth+1))}
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

  // ── P3+P4: execution-delay insight (ACTUAL dates) + delay-by-reason ──
  const delayInsight = (()=>{
    let doneLate=0, doneEarly=0, doneOnTime=0, running=0, slipSum=0, slipCnt=0;
    let worst=null, lateNoReason=0;
    const byReason={}; // key -> {count, days}
    allFlat.forEach(t=>{
      const fv=ptFinishVar(t);
      if(fv.kind==="late"){ doneLate++; slipSum+=fv.days; slipCnt++; if(!worst||fv.days>worst.days) worst={...fv,t}; }
      else if(fv.kind==="early"){ doneEarly++; slipSum-=fv.days; slipCnt++; }
      else if(fv.kind==="ontime" && (t.status==="Completed"||Number(t.progress)===100)) doneOnTime++;
      else if(fv.kind==="running"){ running++; if(!worst||fv.days>worst.days) worst={...fv,t}; }
      // delay-by-reason (over late + running tasks)
      if(fv.kind==="late"||fv.kind==="running"){
        if(t.delay_reason && PT_REASON_MAP[t.delay_reason]){ const k=t.delay_reason; byReason[k]=byReason[k]||{count:0,days:0}; byReason[k].count++; byReason[k].days+=fv.days; }
        else lateNoReason++;
      }
    });
    const reasonRows = Object.entries(byReason)
      .map(([k,v])=>({ key:k, ...PT_REASON_MAP[k], ...v }))
      .sort((a,b)=>b.days-a.days);
    const hasData = (doneLate+doneEarly+doneOnTime+running)>0;
    const anyActual = allFlat.some(t=>t.actualStart||t.actualEnd);
    return { doneLate, doneEarly, doneOnTime, running, avgSlip: slipCnt?Math.round(slipSum/slipCnt):0, worst, hasData, anyActual, reasonRows, lateNoReason };
  })();

  return(
    <div style={{padding:"14px 18px",fontFamily:"'Segoe UI',sans-serif"}}>

      {/* Schedule lifecycle: Estimate → Plan Locked → Started */}
      <ScheduleLifecycleStrip
        proj={proj} isAdmin={isAdmin}
        onSetStart={()=>setStartModal({mode:"anchor"})}
        onLockPlan={lockPlan} onUnlockPlan={unlockPlan}
        onLockStart={()=>setStartModal({mode:"lock"})} onUnlockStart={unlockStart}
      />

      {/* Start-date modal (anchor in estimate / lock on green flag) */}
      {startModal && <StartDateModal
        mode={startModal.mode} projectId={projectId}
        currentStart={proj?.start_date}
        phaseList={tasks.map(t=>({id:t.id, name:t.name, baseStart:t.baseStart}))}
        onClose={()=>setStartModal(null)}
        onDone={async()=>{ setStartModal(null); await loadProj(); await refetchTasks(); }}
      />}

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

      {/* P3: Delay Insight banner — plain-language schedule health */}
      {delayInsight.hasData && (delayInsight.doneLate>0 || delayInsight.running>0) ? (
        <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",marginBottom:12,background:"#FFF7ED",border:"1px solid #FED7AA",borderLeft:"4px solid #EA580C",borderRadius:8}}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth={2} style={{flexShrink:0,marginTop:1}}><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12.5,color:"#7C2D12",lineHeight:1.5}}>
              <b>Schedule alert:</b>
              {delayInsight.doneLate>0 && <> {delayInsight.doneLate} task late finish hue</>}
              {delayInsight.doneLate>0 && delayInsight.running>0 && <>,</>}
              {delayInsight.running>0 && <> {delayInsight.running} abhi schedule se peeche chal rahe</>}.
              {delayInsight.worst && <> Sabse bada slip: <b>{delayInsight.worst.t.no} {String(delayInsight.worst.t.name).slice(0,30)}</b> ({delayInsight.worst.days}d {delayInsight.worst.kind==="running"?"over":"late"}).</>}
              {!delayInsight.anyActual && <span style={{color:"#9A3412"}}> {" "}Tip: progress update karne pe actual dates auto capture hoti hain.</span>}
            </div>
            {/* P4: delay-by-reason breakdown */}
            {(delayInsight.reasonRows.length>0 || delayInsight.lateNoReason>0) && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:7,flexWrap:"wrap"}}>
                <span style={{fontSize:9.5,fontWeight:700,color:"#9A3412",textTransform:"uppercase",letterSpacing:".3px"}}>Kaaron:</span>
                {delayInsight.reasonRows.map(r=>(
                  <span key={r.key} title={`${r.count} task, ${r.days} din`} style={{display:"inline-flex",alignItems:"center",gap:4,background:"white",border:`1px solid ${r.color}`,borderRadius:11,padding:"1px 8px",fontSize:10.5,fontWeight:600,color:r.color}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:r.color}}/>{r.label} · {r.count} ({r.days}d)
                  </span>
                ))}
                {delayInsight.lateNoReason>0 && <span style={{fontSize:10.5,color:"#B45309",fontStyle:"italic"}}>+ {delayInsight.lateNoReason} bina kaaron (set karo)</span>}
              </div>
            )}
          </div>
        </div>
      ) : delayInsight.hasData ? (
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",marginBottom:12,background:"#F0FDF4",border:"1px solid #BBF7D0",borderLeft:"4px solid #16A34A",borderRadius:8}}>
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth={2.2} style={{flexShrink:0}}><path d="M20 6L9 17l-5-5"/></svg>
          <div style={{fontSize:12.5,color:"#14532D"}}><b>On track</b> — abhi tak koi delay nahi{delayInsight.doneOnTime>0?<> ({delayInsight.doneOnTime} task time pe complete)</>:null}{delayInsight.doneEarly>0?<>, {delayInsight.doneEarly} jaldi</>:null}.</div>
        </div>
      ) : null}

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

        {/* ── TODAY TOGGLE pill ── */}
        <button onClick={()=>setFToday(s=>!s)}
          style={{height:30,padding:"0 12px",borderRadius:6,display:"flex",alignItems:"center",gap:5,
            border:`1.5px solid ${fToday?T.blu:T.b1}`,background:fToday?T.blu:"transparent",
            color:fToday?"white":T.t3,fontSize:11.5,fontWeight:fToday?700:400,cursor:"pointer",
            whiteSpace:"nowrap",transition:"all .15s"}}>
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Today{fToday&&<svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>}
        </button>
        {/* ── UNIFIED DATE RANGE (list filter + gantt viewport) ── */}
        <div style={{display:"flex",alignItems:"center",gap:4,height:30,padding:"0 8px",borderRadius:7,
          border:`1.5px solid ${(fDateFrom||fDateTo)?T.bluM:T.b1}`,
          background:(fDateFrom||fDateTo)?T.bluL:T.surface}}>
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={(fDateFrom||fDateTo)?T.blu:T.t4} strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <input type="date" value={fDateFrom} onChange={e=>{setFDateFrom(e.target.value);if(view==="gantt")setGanttRange(p=>({...p,from:e.target.value}));}} placeholder="From"
            style={{border:"none",background:"transparent",fontSize:11,color:fDateFrom?T.blu:T.t3,outline:"none",width:102,fontFamily:"inherit"}}/>
          <span style={{color:T.t4,fontSize:10}}>–</span>
          <input type="date" value={fDateTo} onChange={e=>{setFDateTo(e.target.value);if(view==="gantt")setGanttRange(p=>({...p,to:e.target.value}));}} placeholder="To"
            style={{border:"none",background:"transparent",fontSize:11,color:fDateTo?T.blu:T.t3,outline:"none",width:102,fontFamily:"inherit"}}/>
          {(fDateFrom||fDateTo)&&<button onClick={()=>{setFDateFrom("");setFDateTo("");setGanttRange({from:"",to:""}); }}
            style={{background:"none",border:"none",cursor:"pointer",color:T.blu,padding:0,display:"flex"}}>
            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>}
        </div>

        <div style={{flex:1}}/>
        {dhyanCount>0&&<div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",background:T.redL,borderRadius:6,border:`1px solid ${T.redM}`}}>
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
          <span style={{fontSize:10.5,fontWeight:700,color:T.red}}>{dhyanCount} DHYAN alerts</span>
        </div>}
        {/* Gantt scale switcher — only when gantt is active */}
        {view==="gantt" && <div style={{display:"flex",alignItems:"center",gap:3,background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,padding:3}}>
          {[["week","Week"],["month","Month"],["quarter","Qtr"],["year","Year"]].map(([sc,lb])=>(
            <button key={sc} onClick={()=>setGanttScale(sc)}
              style={{padding:"4px 9px",borderRadius:5,border:"none",background:ganttScale===sc?T.blu:"none",color:ganttScale===sc?"white":T.t3,fontSize:11,fontWeight:ganttScale===sc?700:400,cursor:"pointer",whiteSpace:"nowrap"}}>
              {lb}
            </button>
          ))}
        </div>}
        {/* Gantt range synced from unified date range above */}
        {/* Level dropdown — All + L1(n) L2(n) ... */}
        <select value={levelFilter} onChange={e=>applyLevel(e.target.value)}
          style={{height:32,padding:"0 10px",borderRadius:6,border:`1.5px solid ${levelFilter!=="All"?T.blu:T.b1}`,background:levelFilter!=="All"?T.bluL:T.surface,color:levelFilter!=="All"?T.blu:T.t2,fontSize:11.5,fontWeight:levelFilter!=="All"?700:400,fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
          <option value="All">All Levels ({allFlat.length})</option>
          {levelMeta.levels.map(lv=>(
            <option key={lv.depth} value={String(lv.depth+1)}>
              L{lv.depth+1} — {lv.label}{lv.depth>0?" (upto)":""} ({lv.cumCount})
            </option>
          ))}
          {levelFilter==="custom"&&<option value="custom">Custom view</option>}
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

      {/* Filter panel — desktop inline */}
      {!isMobile&&showFilters&&(
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
              <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:4,display:"flex",alignItems:"center",gap:5}}>
                Delayed
                {delayed>0&&<span style={{background:T.red,color:"white",fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:10,lineHeight:1.4}}>{delayed}</span>}
              </div>
              <button onClick={()=>setFDelayed(s=>!s)}
                style={{height:30,minWidth:110,padding:"0 11px",borderRadius:6,display:"flex",alignItems:"center",gap:5,
                  border:`1.5px solid ${fDelayed?T.red:T.b1}`,background:fDelayed?T.redL:T.surface,
                  color:fDelayed?T.red:T.t3,fontSize:12,fontWeight:fDelayed?700:400,cursor:"pointer",
                  transition:"background .2s, border-color .2s, color .2s",whiteSpace:"nowrap"}}>
                {fDelayed
                  ? <><svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>Delayed Only</>
                  : <>All Tasks</>}
              </button>
            </div>
            {/* As Schedule toggle — flat chronological sort */}
            <div>
              <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:4}}>View Mode</div>
              <button onClick={()=>setFAsSchedule(s=>!s)}
                style={{height:30,padding:"0 11px",borderRadius:6,display:"flex",alignItems:"center",gap:5,
                  border:`1.5px solid ${fAsSchedule?T.grn:T.b1}`,background:fAsSchedule?T.grnL:T.surface,
                  color:fAsSchedule?T.grn:T.t3,fontSize:12,fontWeight:fAsSchedule?700:400,cursor:"pointer"}}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                {fAsSchedule?"Schedule View ON":"As Schedule"}
              </button>
            </div>
            {activeF>0&&<button onClick={()=>{setFCat("All");setFStatus("All");setFTag("All");setFAssignee("All");setFDelayed(false);setFAsSchedule(false);setFToday(false);setFDateFrom("");setFDateTo("");setGanttRange({from:"",to:""}); }}
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

      {/* Mobile filter bottom sheet — constrained to mobile viewport width, NOT full desktop screen */}
      {isMobile&&showFilters&&(<>
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300}}/>
        <div style={{position:"fixed",bottom:0,left:0,right:0,maxHeight:"82vh",overflowY:"auto",background:"white",borderRadius:"16px 16px 0 0",zIndex:301,paddingBottom:"env(safe-area-inset-bottom,0px)",animation:"slideUp .2s ease"}}>
          {/* Header */}
          <div style={{padding:"12px 16px 10px",borderBottom:"1px solid #F1F5F9",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"white",zIndex:1}}>
            <div style={{display:"flex",gap:0,background:"#F1F5F9",borderRadius:8,padding:3}}>
              {["Filter","Sort"].map((t,i)=>(
                <button key={t} style={{padding:"6px 20px",borderRadius:6,border:"none",background:i===0?"white":"transparent",fontSize:13,fontWeight:i===0?700:500,cursor:"pointer",color:"#1E293B",fontFamily:"inherit"}}>{t}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>{setFStatus("All");setFPhase("All");setFDelayed(false);setFToday(false);}} style={{padding:"6px 12px",borderRadius:6,background:"#FEE2E2",color:"#DC2626",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Clear All</button>
              <button onClick={()=>setShowFilters(false)} style={{width:30,height:30,borderRadius:8,border:"none",background:"#F1F5F9",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:"#64748B",fontFamily:"inherit"}}>×</button>
            </div>
          </div>
          {/* Body */}
          <div style={{padding:"14px 16px"}}>
            {/* STATUS */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8}}>STATUS</div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                {["All","Not Started","Ongoing","Completed","Hold"].map(s=>(
                  <button key={s} onClick={()=>setFStatus(s)}
                    style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${fStatus===s?"#2563EB":"#E2E8F0"}`,background:fStatus===s?"#2563EB":"white",color:fStatus===s?"white":"#374151",fontSize:12.5,fontWeight:fStatus===s?700:400,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                    {s==="All"?"All":s}
                  </button>
                ))}
              </div>
            </div>
            {/* PHASE */}
            {tasks.length>0&&(
              <div style={{marginBottom:18}}>
                <div style={{fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8}}>PHASE</div>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  {["All",...tasks.map(t=>t.name)].map(ph=>(
                    <button key={ph} onClick={()=>setFPhase(ph)}
                      style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${fPhase===ph?"#2563EB":"#E2E8F0"}`,background:fPhase===ph?"#2563EB":"white",color:fPhase===ph?"white":"#374151",fontSize:12,fontWeight:fPhase===ph?700:400,cursor:"pointer",fontFamily:"inherit",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",transition:"all .15s"}}>
                      {ph==="All"?"All Phases":ph}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* SHOW ONLY */}
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4}}>SHOW ONLY</div>
              {[
                {label:"Today's tasks",sub:"Base start → end ke beech aaj ka din ho",v:fToday,fn:setFToday,ic:"⏰"},
                {label:"Delayed tasks (late)",sub:"End date nikal gayi, abhi bhi incomplete",v:fDelayed,fn:setFDelayed,ic:"⚠️"},
              ].map(({label,sub,v,fn,ic})=>(
                <div key={label} onClick={()=>fn(s=>!s)} style={{display:"flex",alignItems:"center",gap:10,padding:"13px 0",borderBottom:"1px solid #F8FAFC",cursor:"pointer"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{ic}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:"#1E293B"}}>{label}</div>
                    <div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>{sub}</div>
                  </div>
                  <div style={{width:44,height:24,borderRadius:12,background:v?"#2563EB":"#E2E8F0",position:"relative",transition:"background .2s",flexShrink:0}}>
                    <div style={{position:"absolute",top:2,left:v?20:2,width:20,height:20,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Apply button */}
          <div style={{padding:"12px 16px 16px"}}>
            <button onClick={()=>setShowFilters(false)}
              style={{width:"100%",padding:"14px",borderRadius:10,background:"#2563EB",color:"white",fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"inherit"}}>
              Apply{activeF>0?` (${activeF} active)`:""}
            </button>
          </div>
        </div>
        <style>{`@keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      </>)}

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
            {fAsSchedule&&scheduleFlat
              /* ── SCHEDULE VIEW: flat, date-sorted ── */
              ? scheduleFlat.length===0
                ? <div style={{textAlign:"center",padding:"40px 0",color:T.t4,fontSize:13}}>Koi task nahi mila selected filters ke saath</div>
                : scheduleFlat.map((t,i)=>{
                    const ss=STATUS_C[t.status]||STATUS_C["Not Started"];
                    const delay=ptDelayDays(t);
                    const pcd=phaseCodeMap[t.id]||{};
                    const codeLbl=pcd.code||t.no||"";
                    const prevDate=i>0?scheduleFlat[i-1].baseStart:null;
                    const showDateHdr=t.baseStart&&t.baseStart!==prevDate;
                    const fmtD=d=>d?new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"";
                    return(
                      <div key={t.id}>
                        {showDateHdr&&(
                          <div style={{padding:"5px 14px 3px",background:"#F0F9FF",borderBottom:`1px solid ${T.bluL}`,
                            fontSize:10,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".5px",
                            display:"flex",alignItems:"center",gap:7,borderTop:`1px solid ${T.b1}`}}>
                            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={T.blu} strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            {fmtD(t.baseStart)}
                            {t.baseEnd&&t.baseEnd!==t.baseStart&&<span style={{color:T.t4,fontWeight:400,fontSize:9}}> → {fmtD(t.baseEnd)}</span>}
                          </div>
                        )}
                        <div style={{display:"grid",gridTemplateColumns:GRID_TEMPLATE,alignItems:"center",height:32,
                          borderBottom:`1px solid #F1F5F9`,background:"white",cursor:"pointer"}}
                          onClick={()=>{if(t.dhyanRakhen){setDhyanTask(t);setPendingTask(t);}else setOpenTask(t);}}
                          onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"}
                          onMouseLeave={e=>e.currentTarget.style.background="white"}>
                          <div style={{padding:"0 8px",display:"flex",alignItems:"center",gap:5,overflow:"hidden"}}>
                            {codeLbl&&<span style={{fontSize:9,fontWeight:700,color:"white",background:pcd.phaseColor||T.blu,
                              padding:"1px 5px",borderRadius:3,flexShrink:0,fontFamily:"monospace"}}>{codeLbl}</span>}
                            <span style={{fontSize:12,color:T.t1,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
                            {delay>0&&<span style={{fontSize:10,color:T.red,fontWeight:700,flexShrink:0,marginLeft:3}}>⚠{delay}d</span>}
                          </div>
                          {/* Status — colored dot only, no text (progress bar shows state) */}
                          <div style={{padding:"0 8px",display:"flex",alignItems:"center",gap:5}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:ss.c,flexShrink:0,boxShadow:`0 0 0 2px ${ss.bg}`}}/>
                            <span style={{fontSize:10,color:ss.c,fontWeight:600}}>{t.status==="Not Started"?"—":t.status}</span>
                          </div>
                          {/* Progress bar */}
                          <div style={{padding:"0 5px",display:"flex",alignItems:"center",gap:4}}>
                            <div style={{flex:1,height:6,borderRadius:3,background:T.b1,overflow:"hidden",minWidth:40}}>
                              <div style={{height:"100%",borderRadius:3,
                                background:t.status==="Completed"?T.grn:t.status==="Ongoing"?T.blu:T.b2,
                                width:`${t.progress||0}%`,transition:"width .3s"}}/>
                            </div>
                            <span style={{fontSize:10,color:T.t4,flexShrink:0,minWidth:24,textAlign:"right"}}>{t.progress||0}%</span>
                          </div>
                          <div style={{padding:"0 5px",fontSize:11,color:T.t2}}>{fmtD(t.baseStart)}</div>
                          <div style={{padding:"0 5px",fontSize:11,color:T.t2}}>{fmtD(t.baseEnd)}</div>
                          <div style={{padding:"0 5px",fontSize:11,color:T.t3}}>
                            {t.baseStart&&t.baseEnd?Math.round((new Date(t.baseEnd)-new Date(t.baseStart))/86400000)+1+"d":"—"}
                          </div>
                          <div style={{padding:"0 5px",fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.assignee||"—"}</div>
                        </div>
                      </div>
                    );
                  })
              /* ── NORMAL HIERARCHY VIEW ── */
              : filtered.map(t=>renderRow(t,0))
            }
          </div>
        </div>
      )}

      {/* GANTT VIEW */}
      {view==="gantt"&&(
        <div style={{overflowX:"auto",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
          <PTGantt
            tasks={filtered}
            cpm={cpmData}
            phaseCodeMap={phaseCodeMap}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
            ganttScale={ganttScale}
            ganttRange={ganttRange}
            onRemoveDep={ganttRemoveDep}
            onAddDep={ganttAddDep}
            onCascadeFix={ganttCascadeFix}
          />
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
              <div style={{fontSize:9.5,color:"#9CA3AF",fontFamily:"monospace"}}>{contextMenu.task.no}</div>
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
      {openTask&&<PTTaskDetail task={openTask} allTasks={allFlat} onClose={()=>setOpenTask(null)} projectId={projectId} onUpdate={(id,u)=>{setTasks(updateInTree(tasks,id,u));}} isMobile={isMobile}/>}
      {showTaskIssues&&<TaskIssueDrawer issues={taskIssues} loading={taskIssuesLoading} filter={taskIssueFilter} setFilter={setTaskIssueFilter} onClose={()=>setShowTaskIssues(false)} onStatusChange={(id,s)=>setTaskIssues(p=>p.map(x=>x.id===id?{...x,status:s}:x))}/>}

      {/* Edit Task drawer */}
      {editTask&&<PTEditTask task={editTask} allTasks={allFlat} onClose={()=>setEditTask(null)} onSave={async(id,u)=>{
        const orig = editTask;
        await api.put("/tasks/"+id, { name:u.name, category:u.category, tag:u.tag, status:u.status, progress:u.progress, base_start:u.baseStart, base_end:u.baseEnd, actual_start:u.actualStart||null, actual_end:u.actualEnd||null, duration:u.duration, delay_reason:u.delayReason||"", delay_note:u.delayNote||"", dependencies:u.dependencies, dhyan_rakhen:u.dhyanRakhen });
        setTasks(updateInTree(tasks,id,{...u, delay_reason:u.delayReason||null, delay_note:u.delayNote||null})); setEditTask(null);
        // P2e: if the dates moved AND other tasks depend on this one, offer to
        // cascade the shift. The task itself is already saved above; the
        // cascade (dependents) is an explicit, previewed, opt-in follow-up.
        const datesChanged = (u.baseStart||"") !== (orig.baseStart||"") || (u.baseEnd||"") !== (orig.baseEnd||"");
        const hasDependents = allFlat.some(t => (t.dependencies||[]).map(Number).includes(Number(id)));
        if (datesChanged && hasDependents) {
          try {
            const pv = await api.post(`/tasks/${id}/reschedule`, { base_start:u.baseStart||null, base_end:u.baseEnd||null, mode:"preview" });
            if (pv.success && pv.data?.affected?.length) {
              setCascadePreview({ taskId:id, base_start:u.baseStart||null, base_end:u.baseEnd||null, changed:pv.data.changed, affected:pv.data.affected });
            }
          } catch(_) { /* preview failed — task itself is already saved, no-op */ }
        }
      }}/>}

      {/* P4: delay-reason picker (floating) */}
      {reasonMenu && <>
        <div onClick={()=>setReasonMenu(null)} style={{position:"fixed",inset:0,zIndex:998}}/>
        <div style={{position:"fixed",left:Math.min(reasonMenu.x,window.innerWidth-210),top:Math.min(reasonMenu.y,window.innerHeight-330),zIndex:999,background:"white",borderRadius:9,boxShadow:"0 8px 28px rgba(0,0,0,0.18)",border:"1px solid #E5E7EB",width:200,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
          <div style={{padding:"8px 12px",borderBottom:"1px solid #F3F4F6",fontSize:10.5,fontWeight:700,color:"#92400E",textTransform:"uppercase",letterSpacing:".3px"}}>Delay ka kaaron?</div>
          <div style={{maxHeight:280,overflowY:"auto",padding:"4px 0"}}>
            {PT_DELAY_REASONS.map(r=>(
              <button key={r.key} onClick={()=>setDelayReason(reasonMenu.task,r.key)}
                style={{width:"100%",padding:"7px 12px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontSize:12.5,color:"#374151",textAlign:"left"}}
                onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                <span style={{width:9,height:9,borderRadius:"50%",background:r.color,flexShrink:0}}/>{r.label}
              </button>
            ))}
            {reasonMenu.task?.delay_reason&&<button onClick={()=>setDelayReason(reasonMenu.task,"")}
              style={{width:"100%",padding:"7px 12px",background:"none",border:"none",borderTop:"1px solid #F3F4F6",cursor:"pointer",fontSize:11.5,color:"#9CA3AF",textAlign:"left"}}>✕ Kaaron hatao</button>}
          </div>
        </div>
      </>}

      {/* Cascade reschedule preview (P2e) */}
      {cascadePreview && <CascadePreviewModal
        data={cascadePreview}
        applying={cascadeApplying}
        onClose={()=>setCascadePreview(null)}
        onApply={async()=>{
          setCascadeApplying(true);
          try {
            await api.post(`/tasks/${cascadePreview.taskId}/reschedule`, { base_start:cascadePreview.base_start, base_end:cascadePreview.base_end, mode:"apply" });
            await refetchTasks();
          } catch(e) { alert("Cascade failed: "+(e?.message||"error")); }
          setCascadeApplying(false);
          setCascadePreview(null);
        }}
      />}

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
          duration: form.duration || 0,
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
                t.children = []; t.id=Number(t.id); t.no=t.task_no||String(t.id);
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
                t.children=[]; t.id=Number(t.id); t.no=t.task_no||String(t.id);
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
                t.children=[]; t.id=Number(t.id); t.no=t.task_no||String(t.id);
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
// ── Schedule lifecycle strip (Estimate → Plan Locked → Started) ──
function ScheduleLifecycleStrip({ proj, isAdmin, onSetStart, onLockPlan, onUnlockPlan, onLockStart, onUnlockStart }){
  if(!proj) return null;
  const stage = proj.start_locked ? "started" : proj.plan_locked ? "plan_locked" : "estimate";
  const fmt = (d)=> d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
  const stages = [{key:"estimate",label:"Estimate",icon:"📝"},{key:"plan_locked",label:"Plan Locked",icon:"📌"},{key:"started",label:"Started",icon:"🚦"}];
  const curIdx = stages.findIndex(s=>s.key===stage);
  const Btn = ({onClick,bg,color,bd,children})=>(<button onClick={onClick} style={{padding:"6px 12px",borderRadius:6,background:bg,color,border:bd||"none",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{children}</button>);
  return(
    <div style={{background:"#FFFFFF",border:"1px solid #E2E8F0",borderRadius:8,padding:"9px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        {stages.map((s,i)=>(
          <React.Fragment key={s.key}>
            <div style={{display:"flex",alignItems:"center",gap:5,opacity:i<=curIdx?1:0.4}}>
              <span style={{width:20,height:20,borderRadius:"50%",background:i<curIdx?"#16A34A":i===curIdx?"#2563EB":"#E2E8F0",color:i<=curIdx?"white":"#94A3B8",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{i<curIdx?"✓":i+1}</span>
              <span style={{fontSize:11.5,fontWeight:i===curIdx?700:500,color:i===curIdx?"#1E293B":"#64748B"}}>{s.icon} {s.label}</span>
            </div>
            {i<stages.length-1 && <span style={{width:18,height:2,background:i<curIdx?"#16A34A":"#E2E8F0"}}/>}
          </React.Fragment>
        ))}
      </div>
      <div style={{flex:1,minWidth:200,fontSize:11,color:"#64748B"}}>
        {stage==="estimate" && <>Tentative plan — client ko timeline dikhao. Start date set karke dates auto banao.</>}
        {stage==="plan_locked" && <>Plan locked — sirf admin schedule badal sakta. Green flag aaye to start date lock karo.</>}
        {stage==="started" && <><b style={{color:"#16A34A"}}>Started: {fmt(proj.start_date)}</b> · dates locked 🔒</>}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {stage==="estimate" && isAdmin && <>
          <Btn onClick={onSetStart} bg="white" color="#1D4ED8" bd="1px solid #93C5FD">📅 Set Start Date</Btn>
          <Btn onClick={onLockPlan} bg="white" color="#5B21B6" bd="1px solid #A78BFA">🔒 Lock Plan</Btn>
        </>}
        {stage==="plan_locked" && isAdmin && <>
          <Btn onClick={onLockStart} bg="linear-gradient(135deg,#EA580C,#C2410C)" color="white">🚦 Lock Start Date</Btn>
          <Btn onClick={onUnlockPlan} bg="white" color="#64748B" bd="1px solid #CBD5E1">Unlock Plan</Btn>
        </>}
        {stage==="started" && isAdmin && <Btn onClick={onUnlockStart} bg="white" color="#64748B" bd="1px solid #CBD5E1">🔓 Unlock Start</Btn>}
        {!isAdmin && stage!=="started" && <span style={{fontSize:10.5,color:"#94A3B8",fontStyle:"italic"}}>Admin / PM only</span>}
      </div>
    </div>
  );
}

// ── Start-date modal: recalc (estimate) or lock (green flag) ──
function StartDateModal({ mode, projectId, currentStart, phaseList, onClose, onDone }){
  const isLock = mode==="lock";
  const [date,setDate] = useState(currentStart?String(currentStart).slice(0,10):"");
  const [preview,setPreview] = useState(null);
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState("");
  const endpoint = isLock?"lock-start":"anchor-schedule";
  const run = async (m)=>{
    if(!date){ setErr("Date select karo"); return null; }
    setErr(""); setLoading(true);
    try{ const r=await api.post(`/projects/${projectId}/${endpoint}`,{start_date:date,mode:m});
      if(!r.success) throw new Error(r.message); return r.data;
    }catch(e){ setErr(e.message||"Failed"); return null; } finally{ setLoading(false); }
  };
  const doPreview = async ()=>{ const d=await run("preview"); if(d) setPreview(d); };
  const doApply = async ()=>{ const d=await run("apply"); if(d) onDone(); };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(3px)"}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"white",borderRadius:14,width:520,maxWidth:"92%",boxShadow:"0 24px 64px rgba(0,0,0,0.4)",overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
        <div style={{background:isLock?"linear-gradient(135deg,#EA580C,#C2410C)":"linear-gradient(135deg,#2563EB,#1D4ED8)",padding:"16px 22px",color:"white"}}>
          <div style={{fontSize:16,fontWeight:700}}>{isLock?"🚦 Lock Project Start Date":"📅 Set / Recalculate Start Date"}</div>
          <div style={{fontSize:11,opacity:0.9,marginTop:3}}>{isLock?"Green flag — yeh date lock karne pe saari task dates isi se re-anchor ho jaayengi.":"Saari task dates is start se dependency ke hisaab se recalc hongi."}</div>
        </div>
        <div style={{padding:"18px 22px"}}>
          {err && <div style={{background:"#FEE2E2",color:"#991B1B",padding:"8px 12px",borderRadius:6,fontSize:12,marginBottom:12,border:"1px solid #FCA5A5"}}>{err}</div>}
          <label style={{fontSize:11,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>{isLock?"Real start date":"Start date"}</label>
          <input type="date" value={date} onChange={e=>{setDate(e.target.value);setPreview(null);}} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #D1D5DB",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
          {!preview && <button onClick={doPreview} disabled={loading||!date} style={{width:"100%",padding:"10px",borderRadius:7,background:date?"#0F172A":"#CBD5E1",color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:loading||!date?"default":"pointer"}}>{loading?"…":"Preview changes"}</button>}
          {preview && (()=>{
            const allChanges  = preview.changes||[];
            const totalChanged = preview.changed_count || allChanges.length;
            // Build a lookup: String(id) → change object from API
            const changeMap = {};
            allChanges.forEach(c=>{ changeMap[String(c.id)] = c; });
            const fmtD = d => d ? new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}) : "—";
            const list = phaseList||[];
            // Compute shift from first changed task — backend omits cascaded tasks from preview
            const firstC = allChanges.find(c=>c.old_start&&c.new_start&&c.old_start!==c.new_start);
            const shiftDays = firstC ? Math.round((new Date(firstC.new_start)-new Date(firstC.old_start))/86400000) : 0;
            const addDays = (ds,n)=>{ if(!ds)return null; const d=new Date(ds+"T00:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
            const subCount = Math.max(0, totalChanged - list.length);
            return(
              <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:8,padding:"10px 12px",marginBottom:4}}>
                <div style={{fontSize:11,fontWeight:700,color:"#374151",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z"/></svg>
                  Phase-wise schedule — {totalChanged} tasks badlenge
                  {shiftDays!==0&&<span style={{fontSize:10,fontWeight:600,color:shiftDays<0?"#16A34A":"#DC2626",
                    background:shiftDays<0?"#DCFCE7":"#FEE2E2",padding:"1px 7px",borderRadius:10}}>
                    {shiftDays>0?"+":""}{shiftDays} din
                  </span>}
                </div>
                {list.length===0
                  ? <div style={{fontSize:11,color:"#94A3B8",textAlign:"center",padding:"10px 0"}}>Apply karne pe sab dates update hongi</div>
                  : list.map((ph,i)=>{
                      const c        = changeMap[String(ph.id)];
                      const oldStart = c?.old_start || ph.baseStart;
                      const newStart = c?.new_start || (shiftDays!==0&&ph.baseStart ? addDays(ph.baseStart,shiftDays) : null);
                      const changed  = newStart && oldStart && oldStart!==newStart;
                      const isEst    = !c && changed;
                      return(
                        <div key={ph.id||i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                          padding:"7px 9px",borderRadius:6,marginBottom:3,
                          background:changed?"white":"#F8FAFC",
                          border:`1px solid ${changed?"#BFDBFE":"#E2E8F0"}`}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0,flex:1}}>
                            <div style={{width:8,height:8,borderRadius:2,background:changed?"#2563EB":"#CBD5E1",flexShrink:0}}/>
                            <span style={{fontSize:12,fontWeight:600,color:changed?"#1E293B":"#94A3B8",
                              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ph.name}</span>
                            {isEst&&<span style={{fontSize:9,color:"#94A3B8",flexShrink:0,fontStyle:"italic"}}>~</span>}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0,marginLeft:8,whiteSpace:"nowrap"}}>
                            {changed
                              ? <><span style={{fontSize:10.5,color:"#94A3B8",textDecoration:"line-through"}}>{fmtD(oldStart)}</span>
                                  <span style={{color:"#CBD5E1",fontSize:10,margin:"0 2px"}}>→</span>
                                  <span style={{fontSize:11.5,fontWeight:700,color:"#1D4ED8"}}>{fmtD(newStart)}</span></>
                              : <span style={{fontSize:10.5,color:"#CBD5E1"}}>—</span>}
                          </div>
                        </div>
                      );
                    })
                }
                {subCount>0&&<div style={{fontSize:10,color:"#94A3B8",marginTop:7,textAlign:"center",borderTop:"1px solid #F1F5F9",paddingTop:6}}>
                  + {subCount} sub-tasks ki dates bhi apply hone pe update hongi
                </div>}
              </div>
            );
          })()}
        </div>
        <div style={{padding:"0 22px 18px",display:"flex",gap:8}}>
          <button onClick={onClose} disabled={loading} style={{flex:1,padding:"10px",borderRadius:7,background:"#F1F5F9",color:"#475569",fontSize:12.5,fontWeight:700,border:"1px solid #E2E8F0",cursor:"pointer"}}>Cancel</button>
          <button onClick={doApply} disabled={loading||!preview} style={{flex:1.6,padding:"10px",borderRadius:7,background:preview?(isLock?"#C2410C":"#1D4ED8"):"#CBD5E1",color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:preview&&!loading?"pointer":"default"}}>{loading?"…":(isLock?"🔒 Lock & Set Dates":"Apply Dates")}</button>
        </div>
      </div>
    </div>
  );
}

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
  const [baselineDate, setBaselineDate] = useState(new Date().toISOString().slice(0,10));
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
        const r = await api.baseline.set(projectId, { reason, baseline_date: baselineDate || null });
        if (!r.success) throw new Error(r.message);
      } else {
        const body = { reason, mode: rbMode, baseline_date: baselineDate || null };
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
            <label style={{fontSize:11,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>Baseline Date</label>
            <input type="date" value={baselineDate} onChange={e=>setBaselineDate(e.target.value)}
              style={{width:"100%",padding:"9px 12px",border:"1.5px solid #D1D5DB",borderRadius:7,fontSize:12.5,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
            <div style={{fontSize:10,color:"#9CA3AF",marginTop:3}}>Is snapshot ki pehchaan/tareekh (label) — version {isSet?"v1":"+1"} ke saath save hoga</div>
          </div>

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
    if (!await window.confirmAsync(`"${tpl?.name}" load karein?\n\nProject ke maujooda Gantt tasks REPLACE ho jaayenge — sirf yeh template rahega. (To-Do tab affect nahi hota.)\n\nContinue?`)) return;
    setApplying(true);
    try {
      const body = { template_id: selected, wipe_existing: true, include_boq: includeBOQ };
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
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#374151",marginBottom:8,cursor:"pointer"}}>
                <input type="checkbox" checked={includeBOQ} onChange={e=>setIncludeBOQ(e.target.checked)}/>
                <span>Include BOQ items (recommended)</span>
              </label>
              <div style={{display:"flex",alignItems:"center",gap:7,fontSize:11.5,color:"#92400E",background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:6,padding:"7px 10px"}}>
                <span>🔄</span><span>Template load karne par project ke <b>maujooda Gantt tasks replace</b> ho jaayenge (sirf yeh template rahega). Start-date lock ke baad template change nahi hota.</span>
              </div>
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
function PTGantt({tasks, cpm, phaseCodeMap, collapsed, onToggleCollapse, ganttScale, ganttRange, onRemoveDep, onAddDep, onCascadeFix}){
  // HTML-overlay dep panel: hover shows preview, click PINS it so you can interact
  const [hoveredId, setHoveredId]   = React.useState(null);
  const [pinnedId,  setPinnedId]    = React.useState(null);
  const [panelPos,  setPanelPos]    = React.useState({x:0,y:0}); // locked when row entered
  const [addSearchQ, setAddSearchQ] = React.useState("");
  const mousePosRef = React.useRef({x:0,y:0}); // live ref, no re-render
  const leaveTimer  = React.useRef(null);
  const wrapRef     = React.useRef(null);

  const handleRowEnter = (id, clientY) => {
    clearTimeout(leaveTimer.current);
    setHoveredId(id);
    const rect = wrapRef.current?.getBoundingClientRect();
    const vw = typeof window!=="undefined"?window.innerWidth:1200;
    const vh = typeof window!=="undefined"?window.innerHeight:800;
    const idealX = rect ? rect.left + 245 : 245;
    setPanelPos({
      x: Math.min(idealX, vw - 270),
      y: Math.min((clientY||0) + 10, vh - 240),
    });
  };
  const handleRowLeave = () => {
    leaveTimer.current = setTimeout(()=>setHoveredId(null), 350);
  };
  const handlePanelEnter = () => clearTimeout(leaveTimer.current);
  const handlePanelLeave = () => { leaveTimer.current = setTimeout(()=>setHoveredId(null), 350); };
  const handleRowClick  = (id) => { setPinnedId(p=>p===id?null:id); setAddSearchQ(""); };

  const activeId = pinnedId ?? hoveredId; // pinned wins
  const cmap=(cpm&&cpm.map)||{};
  const pcm=phaseCodeMap||{};
  const hasCpm=cpm&&Object.keys(cmap).length>0;
  const scale = ganttScale || "month";
  // Flatten respecting the collapse map (level dropdown writes it; chevrons toggle it)
  const allFlat=(function flatD(list,depth=0,out=[]){
    list.forEach(t=>{
      out.push({...t,level:depth+1,_depth:depth});
      const isOpen = !(collapsed&&collapsed[t.id]);
      if(t.children?.length && isOpen) flatD(t.children,depth+1,out);
    });
    return out;
  })(tasks);

  // ── Date range computation ────────────────────────────────────
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);
  const MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const allDates = allFlat.flatMap(t=>[t.baseStart,t.baseEnd,t.actualStart].filter(Boolean)).map(d=>new Date(d).getTime()).filter(n=>!isNaN(n));
  allDates.push(today.getTime());
  const rawMin = allDates.length ? Math.min(...allDates) : today.getTime();
  const rawMax = allDates.length ? Math.max(...allDates) : today.getTime();

  // User date range override
  const rangeFrom = ganttRange?.from ? new Date(ganttRange.from).getTime() : null;
  const rangeTo   = ganttRange?.to   ? new Date(ganttRange.to).getTime()   : null;

  // pxPerDay by scale
  const PX_PER_DAY = {week:18, month:1.5, quarter:0.55, year:0.22}[scale] || 1.5;
  const pxPerMs = PX_PER_DAY / 86400000;

  // pStart / pEnd: user range > auto from data
  let pStart, pEnd;
  if(rangeFrom&&rangeTo){ pStart=new Date(rangeFrom); pEnd=new Date(rangeTo); }
  else {
    pStart=new Date(rawMin); pEnd=new Date(rawMax);
    if(scale==="week"){ pStart.setDate(pStart.getDate()-7);   pEnd.setDate(pEnd.getDate()+14); }
    else if(scale==="month"){ pStart.setDate(1); pStart.setMonth(pStart.getMonth()-1); pEnd.setDate(1); pEnd.setMonth(pEnd.getMonth()+2); }
    else if(scale==="quarter"){ pStart.setMonth(Math.floor(pStart.getMonth()/3)*3,1); pEnd.setMonth(Math.floor(pEnd.getMonth()/3)*3+6,1); }
    else { pStart.setMonth(0,1); pEnd.setMonth(12,1); }
  }

  // ── Build header CELLS based on scale ────────────────────────
  // Each cell = {key, label, start(Date), widthPx}
  const CELLS=[];
  if(scale==="week"){
    let d=new Date(pStart); d.setDate(d.getDate()-d.getDay()); // snap to Sunday
    while(d<=pEnd){
      const wNo = Math.ceil((d-new Date(d.getFullYear(),0,1))/604800000);
      const lbl=`W${wNo}`;
      CELLS.push({key:d.toISOString(),label:lbl,sublabel:`${MN[d.getMonth()]}`,start:new Date(d),widthPx:PX_PER_DAY*7,yr:d.getFullYear(),mo:d.getMonth()});
      d.setDate(d.getDate()+7);
    }
  } else if(scale==="month"){
    let d=new Date(pStart.getFullYear(),pStart.getMonth(),1);
    while(d<=pEnd){ const yr=d.getFullYear(),mo=d.getMonth(); CELLS.push({key:`${yr}-${mo}`,label:MN[mo],sublabel:String(yr),start:new Date(d),widthPx:PX_PER_DAY*new Date(yr,mo+1,0).getDate(),yr,mo}); d=new Date(yr,mo+1,1); }
  } else if(scale==="quarter"){
    let d=new Date(pStart.getFullYear(),Math.floor(pStart.getMonth()/3)*3,1);
    while(d<=pEnd){ const yr=d.getFullYear(),q=Math.floor(d.getMonth()/3); const qDays=[92,91,92,92][q]; CELLS.push({key:`${yr}-Q${q}`,label:`Q${q+1}`,sublabel:String(yr),start:new Date(d),widthPx:PX_PER_DAY*qDays,yr,mo:d.getMonth()}); d=new Date(yr,q*3+3,1); }
  } else { // year
    let d=new Date(pStart.getFullYear(),0,1);
    while(d<=pEnd){ const yr=d.getFullYear(); const leap=yr%4===0&&(yr%100!==0||yr%400===0); CELLS.push({key:`${yr}`,label:String(yr),sublabel:"",start:new Date(d),widthPx:PX_PER_DAY*(leap?366:365),yr,mo:0}); d=new Date(yr+1,0,1); }
  }
  if(!CELLS.length) CELLS.push({key:"empty",label:"",sublabel:"",start:new Date(pStart),widthPx:100,yr:today.getFullYear(),mo:today.getMonth()});

  // Build X-axis from cells
  const cellX=[];  // {start,x} for each cell start
  let cx=0; CELLS.forEach(c=>{ cellX.push({t:c.start.getTime(),x:cx}); cx+=c.widthPx; });
  const chartWidth = cx;
  const ROW_H=30, LBL_W=270, HDR_H=28, HDR2_H=18;
  const toX=(ds)=>{if(!ds)return null;const ms=new Date(ds).getTime()-pStart.getTime();if(isNaN(ms))return null;return LBL_W+ms*pxPerMs;};
  const todayX=toX(todayStr);
  const TOTAL_HEADER=HDR_H+HDR2_H;
  const TOTAL_W=LBL_W+chartWidth;
  const TOTAL_H=TOTAL_HEADER+allFlat.length*ROW_H;
  const pxPerDay=PX_PER_DAY;

  // ── Dependency maps (for hover highlight) ────────────────────
  // predsMap[id] = [dep ids this task depends on]
  // succMap[id]  = [ids that depend on this task]
  const predsMap={}, succMap={};
  allFlat.forEach(t=>{
    const deps=Array.isArray(t.dependencies)?t.dependencies.map(Number):[];
    predsMap[t.id]=deps;
    deps.forEach(d=>{ succMap[d]=succMap[d]||[]; succMap[d].push(t.id); });
  });
  // ── Broken dep detection — pred.end > succ.start = violation ──
  const brokenSet = new Set(); // "predId-succId" keys
  allFlat.forEach(t=>{
    (predsMap[t.id]||[]).forEach(depId=>{
      const pred = allFlat.find(x=>x.id===depId);
      if(pred && pred.baseEnd && t.baseStart && new Date(pred.baseEnd)>new Date(t.baseStart))
        brokenSet.add(`${depId}-${t.id}`);
    });
  });

  const hovPreds = activeId ? (predsMap[activeId]||[]) : [];
  const hovSuccs = activeId ? (succMap[activeId]||[])  : [];

  // bar positions for arrows
  const pos={};
  allFlat.forEach((t,i)=>{ pos[t.id]={y:TOTAL_HEADER+i*ROW_H+ROW_H/2, bx1:toX(t.baseStart), bx2:toX(t.baseEnd)}; });

  const phaseColors=["#1E3A5F","#1A4731","#4A1942","#3D2900","#1A2E4A","#2D1B4E","#1F3A2F"];

  const LG={display:"flex",alignItems:"center",gap:5,fontSize:11};
  return(
   <div ref={wrapRef}>
    {/* Legend */}
    <div style={{display:"flex",alignItems:"center",gap:14,padding:"8px 14px",fontSize:10.5,color:T.t3,borderBottom:`1px solid ${T.b1}`,flexWrap:"wrap",background:"#F8FAFC"}}>
      <span style={LG}><span style={{width:20,height:6,borderRadius:3,background:"#3B82F6",opacity:0.45,display:"inline-block"}}/>Planned</span>
      <span style={LG}><span style={{width:20,height:9,borderRadius:3,background:T.grn,opacity:0.9,display:"inline-block"}}/>Actual</span>
      <span style={LG}><span style={{width:20,height:6,borderRadius:3,background:"#DC2626",display:"inline-block"}}/><b style={{color:"#DC2626"}}>Critical</b></span>
      <span style={LG}><span style={{width:20,height:3,background:"#CBD5E1",display:"inline-block"}}/>Slack</span>
      <span style={LG}><svg width={22} height={10}><path d="M0,5 H14" stroke="#94A3B8" strokeWidth={1.5}/><path d="M14,2 L20,5 L14,8Z" fill="#94A3B8"/></svg>Dependency</span>
      {!hasCpm&&<span style={{color:"#F59E0B",fontSize:10,fontStyle:"italic"}}>⟳ critical path load ho raha…</span>}
      {allFlat.length===0&&<span style={{color:T.t4,fontSize:10,fontStyle:"italic"}}>Koi task nahi — dates set karo</span>}
    </div>

    <svg width={TOTAL_W} height={TOTAL_H} style={{display:"block",fontFamily:"'Segoe UI',sans-serif",minWidth:TOTAL_W}}>
      <defs>
        {/* Clip task names to label column — no overflow into bar area */}
        <clipPath id="gantt-lbl-clip">
          <rect x={0} y={0} width={LBL_W-6} height={TOTAL_H}/>
        </clipPath>
      </defs>
      {/* ── MONTH HEADER ── */}
      <rect x={0} y={0} width={TOTAL_W} height={TOTAL_HEADER} fill="#0D1B2A"/>
      <rect x={0} y={0} width={LBL_W} height={TOTAL_HEADER} fill="#0D1B2A"/>
      <text x={12} y={HDR_H/2+5} fontSize={10} fill="rgba(255,255,255,0.5)" fontWeight="600">PHASE / CODE</text>
      <text x={12} y={HDR_H+HDR2_H/2+4} fontSize={9} fill="rgba(255,255,255,0.35)">Task Name</text>
      {/* Dynamic scale cells */}
      {(()=>{
        let cx=LBL_W;
        return CELLS.map((cell,i)=>{
          const x=cx; cx+=cell.widthPx;
          const isCurrentPeriod=cell.yr===today.getFullYear()&&(scale!=="week"?cell.mo===today.getMonth():Math.abs(cell.start-today)<7*86400000);
          return(<g key={cell.key}>
            <rect x={x} y={0} width={cell.widthPx} height={HDR_H} fill={i%2===0?"#0D1B2A":"#13223A"}/>
            <rect x={x} y={HDR_H} width={cell.widthPx} height={HDR2_H} fill={i%2===0?"#162032":"#111827"}/>
            {cell.widthPx>16&&<text x={x+cell.widthPx/2} y={HDR_H/2+5} textAnchor="middle" fontSize={Math.min(9,cell.widthPx/3.5)} fontWeight="700" fill={isCurrentPeriod?"#FCD34D":"rgba(255,255,255,0.7)"}>{cell.label}</text>}
            {cell.widthPx>20&&cell.sublabel&&<text x={x+cell.widthPx/2} y={HDR_H+HDR2_H/2+4} textAnchor="middle" fontSize={7.5} fill="rgba(255,255,255,0.4)">{cell.sublabel}</text>}
            <line x1={x} y1={0} x2={x} y2={TOTAL_HEADER} stroke="rgba(255,255,255,0.06)" strokeWidth={1}/>
          </g>);
        });
      })()}
      <line x1={LBL_W} y1={0} x2={LBL_W} y2={TOTAL_H} stroke="rgba(255,255,255,0.12)" strokeWidth={1}/>

      {/* ── CHART AREA CLICK-TO-DISMISS — clicking bars/chart closes panel ── */}
      <rect x={LBL_W} y={TOTAL_HEADER} width={chartWidth} height={Math.max(0,TOTAL_H-TOTAL_HEADER)}
        fill="transparent"
        onClick={()=>{setPinnedId(null);setHoveredId(null);}}
        onMouseEnter={handleRowLeave}/>

      {/* ── TASK ROWS ── */}
      {allFlat.map((t,i)=>{
        const y=TOTAL_HEADER+i*ROW_H;
        const isPhase=t._depth===0;
        const isPkg=t._depth===1;
        const hasKids=t.children?.length>0;
        const isOpen=!(collapsed&&collapsed[t.id]);
        const bx1=toX(t.baseStart), bx2=toX(t.baseEnd);
        const ax1=toX(t.actualStart), ax2=t.actualEnd?toX(t.actualEnd):todayX;
        // min 4px so 1-day tasks always visible
        const bw=bx1!=null&&bx2!=null?Math.max(4,bx2-bx1):0;
        const prog=Number(t.progress)||0;
        const aw=ax1!=null&&ax2!=null?Math.max(4,(ax2-ax1)*prog/100):0;
        const indent=t._depth*14;
        const crit=cmap[t.id]?.is_critical;
        const slack=cmap[t.id]?.slack;
        const pcd=pcm[t.id]||{};
        const rowBg=isPhase?(phaseColors[allFlat.filter((x,j)=>j<i&&x._depth===0).length%phaseColors.length]||"#1E3A5F"):i%2===0?"#FAFBFC":"white";
        const textFill=isPhase?"rgba(255,255,255,0.9)":crit?"#DC2626":"#1E293B";
        const barColor=isPhase?"#60A5FA":crit?"#DC2626":T.blu;
        const name=t.name||"";
        const codeLbl=pcd.code||t.no||"";

        return(<g key={t.id}>
          {/* row background — hover/click handlers; leave handled at wrapper level */}
          {(()=>{
            const isPred = hovPreds.includes(t.id);
            const isSucc = hovSuccs.includes(t.id);
            const isAct  = activeId===t.id;
            const isPinned = pinnedId===t.id;
            const hlBg = isPinned?"#DBEAFE":isPred?"#EFF6FF":isSucc?"#FFF7ED":isAct?"#F0F9FF":rowBg;
            // Full-width background only — no pointer events (trigger rect rendered LAST so it's on top)
            return <rect x={0} y={y} width={TOTAL_W} height={ROW_H} fill={hlBg} style={{pointerEvents:"none"}}/>;
          })()}
          {/* dep highlight left rail */}
          {hovPreds.includes(t.id)&&<rect x={0} y={y} width={4} height={ROW_H} fill="#3B82F6"/>}
          {hovSuccs.includes(t.id)&&<rect x={0} y={y} width={4} height={ROW_H} fill="#F59E0B"/>}
          {/* phase left accent */}
          {isPhase&&<rect x={0} y={y} width={4} height={ROW_H} fill={pcd.phaseColor||"#3B82F6"}/>}
          {!isPhase&&crit&&!hovPreds.includes(t.id)&&!hovSuccs.includes(t.id)&&<rect x={0} y={y} width={3} height={ROW_H} fill="#DC2626"/>}
          {/* pin indicator */}
          {pinnedId===t.id&&<rect x={0} y={y} width={TOTAL_W} height={ROW_H} fill="none" stroke="#2563EB" strokeWidth={1.5} opacity={0.7}/>}
          {/* row bottom border */}
          <line x1={0} y1={y+ROW_H} x2={TOTAL_W} y2={y+ROW_H} stroke={isPhase?"rgba(255,255,255,0.08)":"#F1F5F9"} strokeWidth={isPhase?1:0.5}/>
          {/* month grid lines */}
          {(()=>{let cx2=0;return CELLS.map((c,mi)=>{const lx=LBL_W+cx2;cx2+=c.widthPx;return <line key={mi} x1={lx} y1={y} x2={lx} y2={y+ROW_H} stroke={isPhase?"rgba(255,255,255,0.04)":"#F1F5F9"} strokeWidth={0.5}/>;});})()}

          {/* collapse/expand triangle (phase + package) */}
          {hasKids&&onToggleCollapse&&(
            <g onClick={()=>onToggleCollapse(t.id)} style={{cursor:"pointer"}}>
              <rect x={indent+4} y={y+ROW_H/2-7} width={14} height={14} rx={3} fill={isPhase?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.06)"}/>
              <path d={isOpen?`M${indent+7},${y+ROW_H/2-2} L${indent+11},${y+ROW_H/2+3} L${indent+15},${y+ROW_H/2-2}`:`M${indent+8},${y+ROW_H/2-3} L${indent+14},${y+ROW_H/2+1} L${indent+8},${y+ROW_H/2+5}`} fill={isPhase?"white":T.t3} strokeWidth={0}/>
            </g>
          )}
          {!hasKids&&<circle cx={indent+11} cy={y+ROW_H/2} r={3} fill={pcd.phaseColor||"#94A3B8"} opacity={0.6}/>}

          {/* Phase code pill */}
          {codeLbl&&<g>
            <rect x={indent+22} y={y+ROW_H/2-8} width={codeLbl.length*6.5+8} height={16} rx={4} fill={isPhase?(pcd.phaseColor||"#3B82F6"):(pcd.phaseColor||"#E2E8F0")} opacity={isPhase?0.9:0.7}/>
            <text x={indent+22+codeLbl.length*3.25+4} y={y+ROW_H/2+4} textAnchor="middle" fontSize={isPhase?9.5:8.5} fontWeight="700" fill="white">{codeLbl}</text>
          </g>}

          {/* Task name — full text, clipped to label column */}
          <text x={indent+22+codeLbl.length*6.5+14} y={y+ROW_H/2+4} fontSize={isPhase?11:isPkg?10.5:10} fontWeight={isPhase?700:isPkg?600:400} fill={textFill} clipPath="url(#gantt-lbl-clip)"><title>{name}</title>{name}</text>

          {/* BARS */}
          {/* slack tail */}
          {!crit&&slack>0&&bx2!=null&&pxPerDay>0&&<rect x={bx2} y={y+ROW_H/2-1.5} width={Math.max(3,Math.min(slack*pxPerDay,pxPerDay*240))} height={3} rx={1.5} fill="#CBD5E1" opacity={0.8}/>}
          {/* planned bar */}
          {bx1!=null&&bw>0&&<rect x={bx1} y={y+ROW_H/2-(isPhase?4:3)} width={bw} height={isPhase?8:6} rx={isPhase?3:2} fill={barColor} fillOpacity={crit?0.55:isPhase?0.5:0.38}/>}
          {/* actual/progress fill on planned bar */}
          {bx1!=null&&bw>0&&prog>0&&<rect x={bx1} y={y+ROW_H/2-(isPhase?4:3)} width={Math.max(3,bw*prog/100)} height={isPhase?8:6} rx={isPhase?3:2} fill={t.status==="Completed"?T.grn:barColor} fillOpacity={0.9}/>}
          {/* actual bar (separate, when actual dates differ) */}
          {ax1!=null&&aw>0&&t.actualStart&&<rect x={ax1} y={y+ROW_H/2+2} width={aw} height={4} rx={2} fill={t.status==="Completed"?T.grn:T.blu} fillOpacity={0.85}/>}
          {/* dhyan dot */}
          {t.dhyanRakhen&&bx1!=null&&<circle cx={bx1-6} cy={y+ROW_H/2} r={3.5} fill="#F59E0B" opacity={0.9}/>}
          {/* ── HOVER TRIGGER — rendered LAST so it sits on top of all text/pills ── */}
          <rect x={0} y={y} width={LBL_W} height={ROW_H} fill="transparent"
            onMouseEnter={e=>handleRowEnter(t.id, e.clientY)}
            onMouseLeave={handleRowLeave}
            onClick={()=>handleRowClick(t.id)}
            style={{cursor:"pointer"}}/>
        </g>);
      })}

      {/* ── DEPENDENCY ARROWS — highlighted when hovered ── */}
      {allFlat.map(t=>{
        const deps=Array.isArray(t.dependencies)?t.dependencies:[];
        return deps.map(dep=>{
          const a=pos[Number(dep)], b=pos[t.id];
          if(!a||!b||a.bx2==null||b.bx1==null) return null;
          const x1=a.bx2, y1=a.y, x2=b.bx1, y2=b.y;
          const mx=x1+Math.max(10,(x2-x1)*0.4);
          // highlight if either endpoint is hovered
          const isBroken = brokenSet.has(`${dep}-${t.id}`);
          const isHl = hoveredId===t.id || hoveredId===Number(dep);
          const clr = isBroken?"#EF4444":hoveredId===Number(dep)?"#F59E0B":hoveredId===t.id?"#3B82F6":"#64748B";
          return(<g key={`${t.id}-${dep}`} opacity={isHl||isBroken?1:0.38}>
            <path d={`M${x1},${y1} H${mx} V${y2} H${x2-4}`} fill="none" stroke={clr} strokeWidth={isHl||isBroken?2:1.2} strokeDasharray={isBroken?"4,2":undefined}/>
            <path d={`M${x2-5},${y2-3} L${x2},${y2} L${x2-5},${y2+3}Z`} fill={clr}/>
            {isBroken&&<text x={(x1+x2)/2} y={Math.min(y1,y2)-3} textAnchor="middle" fontSize={8} fill="#EF4444" fontWeight="700">⚠</text>}
          </g>);
        });
      })}
      {/* ── TODAY LINE ── */}
      {todayX!=null&&<g>
        <line x1={todayX} y1={TOTAL_HEADER} x2={todayX} y2={TOTAL_H} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.8}/>
        <rect x={todayX-16} y={TOTAL_HEADER-14} width={32} height={13} rx={4} fill="#EF4444"/>
        <text x={todayX} y={TOTAL_HEADER-4} textAnchor="middle" fontSize={7.5} fill="white" fontWeight="800">TODAY</text>
      </g>}
    </svg>

    {/* ── HTML DEP PANEL — floats near cursor, stays alive on mouse-enter ── */}
    {(()=>{
      const tid = pinnedId ?? hoveredId;
      if(!tid) return null;
      const task = allFlat.find(t=>t.id===tid);
      if(!task) return null;
      const preds = (predsMap[tid]||[]).map(id=>allFlat.find(t=>t.id===id)).filter(Boolean);
      const succs = (succMap[tid]||[]).map(id=>allFlat.find(t=>t.id===id)).filter(Boolean);
      if(preds.length===0 && succs.length===0 && !pinnedId) return null;
      const isPinned = pinnedId===tid;
      const px = Math.min(panelPos.x+16, (typeof window!=="undefined"?window.innerWidth:1200)-290);
      const py = Math.min(panelPos.y+10,  (typeof window!=="undefined"?window.innerHeight:800)-220);
      const rmBtn = (onClick)=>(
        <button onClick={onClick} title="Hatao"
          style={{background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.35)",cursor:"pointer",color:"#F87171",padding:"1px 6px",borderRadius:4,fontSize:12,fontWeight:700,lineHeight:1,flexShrink:0}}>×</button>
      );
      return(
        <div onMouseEnter={handlePanelEnter} onMouseLeave={handlePanelLeave}
          style={{position:"fixed",left:px,top:py,zIndex:9999,background:"#1E293B",borderRadius:10,padding:"12px 14px",minWidth:248,maxWidth:300,
            boxShadow:"0 12px 36px rgba(0,0,0,0.5)",fontSize:12,color:"white",fontFamily:"'Segoe UI',sans-serif",pointerEvents:"all",
            border:isPinned?"1px solid rgba(59,130,246,0.5)":"1px solid rgba(255,255,255,0.08)"}}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:9}}>
            <div style={{fontWeight:700,fontSize:12,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:6}}>
              <span style={{opacity:.5,fontSize:10,fontFamily:"monospace",marginRight:4}}>{task.no||""}</span>{task.name}
            </div>
            {isPinned&&<button onClick={()=>setPinnedId(null)}
              style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.4)",display:"flex",padding:0,flexShrink:0}}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>}
            {!isPinned&&<span style={{fontSize:9,color:"rgba(255,255,255,0.3)",flexShrink:0}}>click = pin</span>}
          </div>

          {/* Depends on */}
          <div style={{marginBottom:8}}>
            <div style={{fontSize:9.5,fontWeight:700,color:"#60A5FA",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4}}>
              Depends on ({preds.length})
            </div>
            {preds.length===0
              ?<div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontStyle:"italic"}}>koi nahi</div>
              :preds.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{opacity:.45,fontSize:9,fontFamily:"monospace",flexShrink:0}}>{p.no||""}</span>
                  <span style={{flex:1,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                  {rmBtn(()=>onRemoveDep&&onRemoveDep(tid,p.id))}
                </div>
              ))
            }
          </div>

          {/* Required by */}
          <div style={{marginBottom:isPinned?10:0}}>
            <div style={{fontSize:9.5,fontWeight:700,color:"#FB923C",textTransform:"uppercase",letterSpacing:".6px",marginBottom:4}}>
              Required by ({succs.length})
            </div>
            {succs.length===0
              ?<div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontStyle:"italic"}}>koi nahi</div>
              :succs.map(s=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{opacity:.45,fontSize:9,fontFamily:"monospace",flexShrink:0}}>{s.no||""}</span>
                  <span style={{flex:1,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</span>
                  {rmBtn(()=>onRemoveDep&&onRemoveDep(s.id,tid))}
                </div>
              ))
            }
          </div>

          {/* Quick-add dep — only when pinned */}
          {isPinned&&(
            <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:9}}>
              <div style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:5}}>
                + Dependency add karo
              </div>
              <input value={addSearchQ} onChange={e=>setAddSearchQ(e.target.value)}
                placeholder="Task code ya naam type karo..."
                style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.07)",
                  color:"white",fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              {addSearchQ&&(
                <div style={{marginTop:4,maxHeight:130,overflowY:"auto"}}>
                  {allFlat
                    .filter(t=>t.id!==tid&&!(predsMap[tid]||[]).includes(t.id)
                      &&(t.name.toLowerCase().includes(addSearchQ.toLowerCase())||(t.no||"").toLowerCase().includes(addSearchQ.toLowerCase())))
                    .slice(0,8)
                    .map(t=>(
                      <div key={t.id} onClick={()=>{onAddDep&&onAddDep(tid,t.id);setAddSearchQ("");}}
                        style={{padding:"4px 7px",borderRadius:5,cursor:"pointer",fontSize:11,color:"rgba(255,255,255,0.85)",
                          display:"flex",alignItems:"center",gap:5}}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(59,130,246,0.25)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <span style={{opacity:.45,fontSize:9,fontFamily:"monospace",flexShrink:0}}>{t.no||""}</span>
                        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
                      </div>
                    ))
                  }
                  {allFlat.filter(t=>t.id!==tid&&!(predsMap[tid]||[]).includes(t.id)
                    &&(t.name.toLowerCase().includes(addSearchQ.toLowerCase())||(t.no||"").toLowerCase().includes(addSearchQ.toLowerCase()))).length===0
                    &&<div style={{fontSize:11,color:"rgba(255,255,255,0.35)",padding:"6px 4px"}}>Koi task nahi mila</div>
                  }
                </div>
              )}
            </div>
          )}
        </div>
      );
    })()}
   </div>
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
  const submittingRef=useRef(false);
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(460px,95vw)",background:"white",borderRadius:12,zIndex:401,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",fontFamily:"'Segoe UI',sans-serif",overflow:"hidden"}}>
      <div style={{background:"#1E3A5F",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>New Material Request</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>Task: {task.name} · {task.no}</div>
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
          <LibrarySelect type="material" value={form.item_name}
            onChange={v=>{
              const found=matLib.find(m=>m.name===v);
              setForm(p=>({...p,item_name:v,unit:found?found.unit||"Bag":p.unit}));
            }}
            onAdded={(m)=>{setMatLib(prev=>[...prev,m].sort((a,b)=>(a.name||"").localeCompare(b.name||"")));}}/>
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
            if(submittingRef.current) return; // hard guard
            if(!form.item_name.trim()||!form.quantity) return alert("Material name and quantity required");
            submittingRef.current=true;
            setSaving(true);
            const res=await api.post("/procurement/mrs",{
              project_id: projectId,
              item_name: form.item_name,
              quantity: Number(form.quantity),
              unit: form.unit,
              required_date: form.required_date||null,
              approx_amount: form.approx_amount||null,
              notes: form.notes ? form.notes+" [Task: "+task.name+"]" : "Task: "+task.name+" ("+task.no+")",
              task_id: task.id,
              task_name: task.name,
            });
            setSaving(false);
            submittingRef.current=false;
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
              apiCache.refreshApprovals();  // pre-warm badge
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(560px,96vw)",maxHeight:"85vh",background:"white",borderRadius:12,zIndex:401,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",fontFamily:"'Segoe UI',sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Header */}
      <div style={{background:"#0F172A",padding:"13px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>Record GRN — Material Received</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.4)",marginTop:2}}>Task: {task.name} · {task.no}</div>
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
                {(() => {
                  const matName = form.material_name || form.item_name || "";
                  const libMatch = grnMatLib.find(m => (m.name||"").trim().toLowerCase() === matName.trim().toLowerCase());
                  const isLocked = !!matName;
                  const displayUnit = libMatch?.unit || form.unit || "Nos";
                  return (
                    <>
                      <label style={{fontSize:9.5,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>
                        Unit{isLocked && <span style={{marginLeft:5,fontSize:9,color:"#9CA3AF",textTransform:"none",fontWeight:500}}>(from library)</span>}
                      </label>
                      {isLocked ? (
                        <div title="Library me change karein" style={{width:"100%",padding:"9px 11px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,color:"#374151",background:"#F8F9FB",fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:6,height:39,boxSizing:"border-box"}}>
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    {fullPhoto&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
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

function PTTaskDetail({task,allTasks,onClose,onUpdate,projectId,isMobile}){
  // ── Scrollspy: active nav section ───────────────────────────────────
  const [activeSection,setActiveSection]=useState("progress");
  const scrollRef=useRef(null);
  const progressRef=useRef(null);
  const materialsRef=useRef(null);
  const labourRef=useRef(null);
  const photosRef=useRef(null);
  const issuesRef=useRef(null);

  // Current user (for owner-only delete on used entries)
  const meUser = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const meId = Number(meUser?.id) || null;
  const meIsPriv = ["admin","super_admin","project_manager"].includes((meUser?.role || "").toLowerCase());
  const canDeleteUsed = (createdById) => meIsPriv || (createdById != null && Number(createdById) === meId);

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
  const [matLib,setMatLib]=useState([]);
  useEffect(()=>{ api.get("/library/materials").then(r=>{ if(r.success) setMatLib(r.data||[]); }).catch(()=>{}); },[]);

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
    {/* Backdrop — desktop only; on mobile the full-screen page has no click-outside-to-close */}
    {!isMobile&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300,backdropFilter:"blur(2px)"}}/>}

    {/* Full photo viewer */}
    {fullPhoto&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
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

      {/* ── HEADER ── */}
      {isMobile?(
        <div style={{background:"#1E293B",padding:"10px 16px 12px",flexShrink:0}}>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.7)",padding:"0 0 8px 0",display:"flex",alignItems:"center",gap:5}}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Back</span>
          </button>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15.5,fontWeight:700,color:"white",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:5,flexWrap:"wrap"}}>
                <span style={{background:sm.bg,color:sm.c,fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20}}>{autoStatus(prog)}</span>
                {task.category&&<span style={{fontSize:10.5,color:"rgba(255,255,255,0.4)"}}>{task.category}</span>}
                {task.dhyanRakhen&&<span style={{background:"#FEF3C7",color:"#92400E",fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4}}>⚠ DHYAN</span>}
                {delay>0&&<span style={{background:"#FEE2E2",color:"#DC2626",fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4}}>{delay}d delay</span>}
              </div>
            </div>
            <span style={{fontSize:26,fontWeight:800,color:prog===100?"#10B981":prog>0?"#60A5FA":"#94A3B8",flexShrink:0,lineHeight:1,marginTop:2}}>{prog}%</span>
          </div>
          <div style={{marginTop:10,height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:prog+"%",background:prog===100?"#10B981":"#3B82F6",borderRadius:2,transition:"width .3s"}}/>
          </div>
        </div>
      ):(
        <div style={{background:"#0F172A",padding:"12px 16px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:9.5,color:"rgba(255,255,255,0.35)",fontFamily:"monospace"}}>{task.no}</span>
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
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,height:5,background:"rgba(255,255,255,0.15)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:prog+"%",background:prog===100?"#10B981":"#3B82F6",borderRadius:3,transition:"width .3s"}}/>
            </div>
            <span style={{fontSize:12,fontWeight:700,color:prog===100?"#10B981":"white",minWidth:34}}>{prog}%</span>
          </div>
        </div>
      )}

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
          {id:"labour",   l:"Workers",   ic:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z", cnt:labours.length||null},
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
          {/* Quick % buttons */}
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
                  <input value={usedLogForm.material_name} onChange={e=>{
                      const v=e.target.value;
                      const m=matLib.find(x=>(x.name||"").trim().toLowerCase()===v.trim().toLowerCase());
                      setUsedLogForm(f=>({...f,material_name:v,unit:m?.unit||f.unit}));
                    }} placeholder="e.g. Cement" list="usedlog-matlib"
                    style={{width:"100%",padding:"9px 10px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  <datalist id="usedlog-matlib">{matLib.map(m=><option key={m.id} value={m.name}/>)}</datalist>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>Qty</label>
                  <input type="number" value={usedLogForm.used_qty} onChange={e=>setUsedLogForm(f=>({...f,used_qty:e.target.value}))} placeholder="0"
                    style={{width:"100%",padding:"9px 10px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div>
                  {(() => {
                    const matName = usedLogForm.material_name || "";
                    const libMatch = matLib.find(m => (m.name||"").trim().toLowerCase() === matName.trim().toLowerCase());
                    const isLocked = !!matName;
                    const displayUnit = libMatch?.unit || usedLogForm.unit || "Nos";
                    return (
                      <>
                        <label style={{fontSize:10,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>
                          Unit{isLocked && <span style={{marginLeft:5,fontSize:9,color:"#9CA3AF",textTransform:"none",fontWeight:500}}>(from library)</span>}
                        </label>
                        {isLocked ? (
                          <div title="Library me change karein" style={{width:"100%",padding:"9px 10px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,color:"#374151",background:"#F8F9FB",fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:6,height:39,boxSizing:"border-box"}}>
                            <span>🔒</span>{displayUnit}
                          </div>
                        ) : (
                          <select value={usedLogForm.unit} onChange={e=>setUsedLogForm(f=>({...f,unit:e.target.value}))}
                            style={{width:"100%",padding:"9px 10px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}>
                            {UNITS.map(u=><option key={u}>{u}</option>)}
                          </select>
                        )}
                      </>
                    );
                  })()}
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
              {usedLog.slice(0,3).map((u,i)=>{
                const showDel = u.id && canDeleteUsed(u.created_by);
                return (
                <div key={u.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 11px",background:"#F0FDF4",borderRadius:7,marginBottom:5,border:"1px solid #BBF7D0",gap:8}}>
                  <span style={{fontSize:12,fontWeight:600,color:"#065F46",flex:1,minWidth:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.material_name}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#16A34A"}}>{u.used_qty} {u.unit}</span>
                  {showDel?(
                    <button title="Delete this used entry"
                      onClick={async()=>{
                        if(!await window.confirmAsync("Is used entry ko delete kar dein? ("+u.used_qty+" "+(u.unit||"")+")")) return;
                        const r=await api.del("/tasks/"+task.id+"/used-log/"+u.id);
                        if(r.success){
                          setUsedLog(p=>p.filter(x=>x.id!==u.id));
                        } else {
                          alert(r.message||"Delete fail ho gaya");
                        }
                      }}
                      style={{background:"none",border:"none",cursor:"pointer",padding:3,borderRadius:4,color:"#DC2626",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/></svg>
                    </button>
                  ):null}
                </div>
                );
              })}
              {usedLog.length>3&&<div style={{textAlign:"center",fontSize:11,color:"#64748B",padding:"4px 0"}}>+{usedLog.length-3} more</div>}
            </div>
          )}
          {/* Material activity list */}
          {matLoading&&<div style={{textAlign:"center",padding:"24px 0",color:"#94A3B8",fontSize:13}}>Loading materials...</div>}
          {!matLoading&&materials.length>0&&(isMobile?(
            /* ── Mobile: compact TABLE view ── */
            <div style={{background:"white",borderRadius:10,border:"1px solid #E2E8F0",overflow:"hidden",marginBottom:8}}>
              {/* Table header */}
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",background:"#F8FAFC",borderBottom:"1px solid #E2E8F0",padding:"8px 12px"}}>
                {["ITEM","ALLOTTED","USED","LEFT"].map(h=>(
                  <span key={h} style={{fontSize:9.5,fontWeight:700,color:"#94A3B8",letterSpacing:".4px",textTransform:"uppercase"}}>{h}</span>
                ))}
              </div>
              {/* Table rows */}
              {materials.map((m,i)=>{
                const left=Number(m.required_qty||0)-Number(m.used_qty||0);
                const isOdd=i%2===1;
                return(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",padding:"10px 12px",background:isOdd?"#FAFAFA":"white",borderBottom:i<materials.length-1?"1px solid #F1F5F9":"none",alignItems:"center"}}>
                    <div style={{fontSize:12.5,fontWeight:600,color:"#1E293B",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.material_name}</div>
                    <div style={{fontSize:12,color:"#475569"}}>{m.required_qty||0} <span style={{fontSize:9,color:"#94A3B8"}}>{m.unit}</span></div>
                    <div style={{fontSize:12,fontWeight:600,color:Number(m.used_qty)>0?"#D97706":"#94A3B8"}}>{m.used_qty||0} <span style={{fontSize:9,color:"#94A3B8"}}>{m.unit}</span></div>
                    <div style={{fontSize:12,fontWeight:600,color:left>0?"#059669":left<0?"#DC2626":"#94A3B8"}}>{left} <span style={{fontSize:9,color:"#94A3B8"}}>{m.unit}</span></div>
                  </div>
                );
              })}
            </div>
          ):(
            /* ── Desktop: card view ── */
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
          ))}
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
          {/* Legacy flat list removed — the grouped-by-date "Attendance History"
              block above (line ~5244) already renders every labour row exactly
              once. Keeping this map duplicated each row with a different tag
              ("Company Labour" vs "Company"), which is why TSK000592 showed
              every entry twice. */}
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

      {/* ── COMMENTS — Fixed at bottom (mobile + desktop) ── */}
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
  const [form,setForm]=useState({name:task.name,category:task.category,tag:task.tag||"",assignee:task.assignee,status:task.status,progress:task.progress,baseStart:task.baseStart||"",baseEnd:task.baseEnd||"",actualStart:task.actualStart||"",actualEnd:task.actualEnd||"",duration:(task.baseStart&&task.baseEnd)?Math.round((new Date(task.baseEnd)-new Date(task.baseStart))/86400000)+1:(task.duration||0),delayReason:task.delay_reason||"",delayNote:task.delay_note||"",dependencies:[...(task.dependencies||[])],dhyanRakhen:task.dhyanRakhen||""});
  const [showDhyan,setShowDhyan]=useState(!!task.dhyanRakhen);
  const [depSrch,setDepSrch]=useState("");
  const upd=(k)=>(e)=>setForm(p=>({...p,[k]:e.target.type==="range"?Number(e.target.value):e.target.value}));
  // Duration ↔ dates bidirectional sync (duration = inclusive days)
  const _addD=(d,n)=>{if(!d)return"";const dt=new Date(d);dt.setDate(dt.getDate()+n);return dt.toISOString().slice(0,10);};
  const _span=(s,e)=>{if(!s||!e)return 0;return Math.round((new Date(e)-new Date(s))/86400000)+1;};
  const setStart=(v)=>setForm(p=>(p.duration>0&&v)?{...p,baseStart:v,baseEnd:_addD(v,p.duration-1)}:{...p,baseStart:v,duration:_span(v,p.baseEnd)});
  const setEnd=(v)=>setForm(p=>({...p,baseEnd:v,duration:_span(p.baseStart,v)}));
  const setDur=(v)=>{const n=Math.max(0,parseInt(v,10)||0);setForm(p=>({...p,duration:n,baseEnd:(p.baseStart&&n>0)?_addD(p.baseStart,n-1):p.baseEnd}));};
  const toggleDep=(id)=>setForm(p=>({...p,dependencies:p.dependencies.includes(id)?p.dependencies.filter(x=>x!==id):[...p.dependencies,id]}));
  const filteredForDep=allTasks.filter(t=>t.id!==task.id&&(!depSrch||t.name.toLowerCase().includes(depSrch.toLowerCase())||t.no.includes(depSrch)));
  const TEAM_PT=[];
  return(<>
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:350,backdropFilter:"blur(1px)"}}/>
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
        {/* Dates + Duration (bidirectional) */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 0.8fr",gap:9,marginBottom:5}}>
          <div><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Baseline Start</label>
            <input type="date" value={form.baseStart} onChange={e=>setStart(e.target.value)} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/></div>
          <div><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Baseline End</label>
            <input type="date" value={form.baseEnd} onChange={e=>setEnd(e.target.value)} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/></div>
          <div><label style={{fontSize:9.5,fontWeight:600,color:T.blu,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Duration (din)</label>
            <input type="number" min={0} value={form.duration||""} onChange={e=>setDur(e.target.value)} placeholder="0" style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.bluM}`,fontSize:12.5,fontWeight:700,color:T.blu,background:T.bluL,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/></div>
        </div>
        <div style={{fontSize:10,color:T.t4,marginBottom:10}}>💡 Duration daalo → End apne aap; ya Start/End badlo → Duration auto.</div>
        {/* Actual dates (P3) — auto-captured from progress, editable here */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:4}}>
          {[["Actual Start","actualStart"],["Actual End","actualEnd"]].map(([l,k])=>(
            <div key={k}><label style={{fontSize:9.5,fontWeight:600,color:"#0E7490",textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{l}</label>
              <input type="date" value={form[k]} onChange={upd(k)} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid #A5F3FC`,fontSize:12.5,color:T.t1,background:"#F0FDFF",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/></div>
          ))}
        </div>
        <div style={{fontSize:10,color:T.t4,marginBottom:10}}>Actual dates progress update karne pe apne aap bharti hain — yahan correct bhi kar sakte ho.</div>
        {/* P4: Delay reason + note */}
        <div style={{marginBottom:10,padding:"9px 11px",background:form.delayReason?"#FFF7ED":T.surfaceB,border:`1px solid ${form.delayReason?"#FED7AA":T.b1}`,borderRadius:7}}>
          <label style={{fontSize:9.5,fontWeight:600,color:form.delayReason?"#9A3412":T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:5}}>Delay ka kaaron (agar late)</label>
          <select value={form.delayReason} onChange={upd("delayReason")} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${form.delayReason?"#FDBA74":T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit",marginBottom:form.delayReason?7:0}}>
            <option value="">— koi nahi —</option>
            {PT_DELAY_REASONS.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          {form.delayReason&&<input value={form.delayNote} onChange={upd("delayNote")} placeholder="Detail / note (optional) — e.g. cement supply 5 din late" style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #FDBA74",fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>}
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
  const [form,setForm]=useState({name:"",category:"Civil",tag:"",assignee:"",baseStart:"",baseEnd:"",duration:0,dependencies:[],dhyanRakhen:""});
  const [showDhyan,setShowDhyan]=useState(false);
  const [depSrch,setDepSrch]=useState("");
  const upd=(k)=>(e)=>setForm(p=>({...p,[k]:e.target.value}));
  // Duration ↔ dates bidirectional sync (duration = inclusive days)
  const _addD=(d,n)=>{if(!d)return"";const dt=new Date(d);dt.setDate(dt.getDate()+n);return dt.toISOString().slice(0,10);};
  const _span=(s,e)=>{if(!s||!e)return 0;return Math.round((new Date(e)-new Date(s))/86400000)+1;};
  const setStart=(v)=>setForm(p=>(p.duration>0&&v)?{...p,baseStart:v,baseEnd:_addD(v,p.duration-1)}:{...p,baseStart:v,duration:_span(v,p.baseEnd)});
  const setEnd=(v)=>setForm(p=>({...p,baseEnd:v,duration:_span(p.baseStart,v)}));
  const setDur=(v)=>{const n=Math.max(0,parseInt(v,10)||0);setForm(p=>({...p,duration:n,baseEnd:(p.baseStart&&n>0)?_addD(p.baseStart,n-1):p.baseEnd}));};
  const toggleDep=(id)=>setForm(p=>({...p,dependencies:p.dependencies.includes(id)?p.dependencies.filter(x=>x!==id):[...p.dependencies,id]}));
  const filteredForDep=allTasks.filter(t=>!depSrch||t.name.toLowerCase().includes(depSrch.toLowerCase())||t.no.includes(depSrch));
  const TEAM_PT=[];
  const dur=form.duration||0;
  // P2d: suggested start = max(dependency end dates) + 1 day (Finish-to-Start)
  const autoStart=(()=>{
    if(!form.dependencies.length) return null;
    let mx=null;
    form.dependencies.forEach(id=>{
      const d=allTasks.find(t=>t.id===id);
      const end=d&&(d.baseEnd||d.base_end);
      if(end&&(!mx||new Date(end)>new Date(mx))) mx=end;
    });
    if(!mx) return null;
    const dt=new Date(mx); dt.setDate(dt.getDate()+1);
    return dt.toISOString().slice(0,10);
  })();
  // Gently auto-fill the start when a dependency is picked and start is still empty.
  // User can always edit; backend also fills this on save as a safety net.
  useEffect(()=>{ if(autoStart && !form.baseStart) setForm(p=>({...p,baseStart:autoStart,baseEnd:p.duration>0?_addD(autoStart,p.duration-1):p.baseEnd})); },[autoStart]);
  return(<>
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400,backdropFilter:"blur(1px)"}}/>
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
            <input type="date" value={form.baseStart} onChange={e=>setStart(e.target.value)} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/></div>
          <div><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Baseline End</label>
            <input type="date" value={form.baseEnd} onChange={e=>setEnd(e.target.value)} style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/></div>
          <div><label style={{fontSize:9.5,fontWeight:600,color:T.blu,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Duration (din)</label>
            <input type="number" min={0} value={form.duration||""} onChange={e=>setDur(e.target.value)} placeholder="0" style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.bluM}`,fontSize:12.5,fontWeight:700,color:T.blu,background:T.bluL,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/></div>
        </div>
        {autoStart&&<div style={{fontSize:11,color:"#0E7490",fontWeight:600,marginBottom:10,padding:"4px 10px",background:"#ECFEFF",border:"1px solid #A5F3FC",borderRadius:5,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#0E7490" strokeWidth={2}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          Dependency se auto start: <b>{autoStart}</b>
          {form.baseStart!==autoStart&&<button onClick={()=>setForm(p=>({...p,baseStart:autoStart}))} style={{background:"#0E7490",color:"white",border:"none",borderRadius:4,fontSize:10,fontWeight:700,padding:"2px 7px",cursor:"pointer"}}>Use</button>}
          <span style={{color:T.t4,fontWeight:400,fontSize:10}}>· edit kar sakte ho</span>
        </div>}
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

// ── Cascade reschedule preview (P2e) ──────────────────────────────
// Shows which dependent tasks will shift when a task's date changes, and
// lets the user apply the cascade or keep just the single-task edit.
function CascadePreviewModal({data,applying,onClose,onApply}){
  const {changed,affected}=data;
  const fmtD=(d)=>d?String(d).slice(0,10):"—";
  return(<>
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,width:"min(540px,95vw)",maxHeight:"85vh",boxShadow:"0 24px 64px rgba(0,0,0,0.3)",zIndex:501,overflow:"hidden",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:"#92400E",padding:"13px 18px",flexShrink:0}}>
        <div style={{fontSize:14,fontWeight:700,color:"white",display:"flex",alignItems:"center",gap:7}}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          Dependent tasks ko bhi shift karein?
        </div>
        <div style={{fontSize:11.5,color:"rgba(255,255,255,0.8)",marginTop:3,lineHeight:1.4}}>
          <b>{changed.task_no} {changed.name}</b> ki date badalne se <b>{affected.length}</b> aage wale task khisak rahe hain (sab apni duration bachakar).
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        {/* changed task */}
        <div style={{background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:8,padding:"9px 12px",marginBottom:12}}>
          <div style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:4}}>Aapne badla</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}><span style={{fontFamily:"monospace",fontSize:10,color:T.t4,marginRight:5}}>{changed.task_no}</span>{changed.name}</div>
            <div style={{fontSize:11.5,color:T.t2}}>{fmtD(changed.old_start)}–{fmtD(changed.old_end)} <span style={{color:"#92400E",fontWeight:700}}>→ {fmtD(changed.new_start)}–{fmtD(changed.new_end)}</span></div>
          </div>
        </div>
        {/* affected list */}
        <div style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Yeh {affected.length} task khisakenge</div>
        <div style={{border:`1px solid ${T.b1}`,borderRadius:8,overflow:"hidden"}}>
          {affected.map((a,i)=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",background:i%2?T.surfaceB:T.surface,borderTop:i?`1px solid ${T.b1}`:"none"}}>
              <div style={{fontSize:12.5,color:T.t1,minWidth:0,flex:1}}>
                <span style={{fontFamily:"monospace",fontSize:10,color:T.t4,marginRight:5}}>{a.task_no}</span>
                {String(a.name).slice(0,34)}{String(a.name).length>34?"…":""}
              </div>
              <div style={{fontSize:11.5,color:T.t2,whiteSpace:"nowrap",marginLeft:8}}>
                {fmtD(a.old_start)} <span style={{color:T.t4}}>→</span> <b style={{color:"#B45309"}}>{fmtD(a.new_start)}</b>
                {a.delta_days?<span style={{marginLeft:5,background:"#FEF3C7",color:"#92400E",fontSize:9.5,fontWeight:700,padding:"1px 6px",borderRadius:9}}>+{a.delta_days}d</span>:null}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onClose} disabled={applying} style={{flex:1,padding:"10px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:applying?"default":"pointer"}}>Sirf yeh task rakhein</button>
        <button onClick={onApply} disabled={applying} style={{flex:1.6,padding:"10px",borderRadius:7,background:applying?T.b2:"#B45309",color:"white",fontSize:12,fontWeight:700,border:"none",cursor:applying?"default":"pointer"}}>{applying?"Shift ho raha hai…":`Haan, ${affected.length} tasks shift karein`}</button>
      </div>
    </div>
  </>);
}

export default TabTasks;
