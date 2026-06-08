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
import TabSubcon from "./tabs/TabSubcon";
import TabMaterial from "./tabs/TabMaterial";
import TabAttendance from "./tabs/TabAttendance";
import TabOverview from "./tabs/TabOverview";
import TabDesign from "./tabs/TabDesign";
import TabParty from "./tabs/TabParty";
import TabTransaction from "./tabs/TabTransaction";

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

// ═══════════════════════════════════════════════════════════════════
// TAB 2 — DESIGN
// ═══════════════════════════════════════════════════════════════════
// ── DESIGN REQUEST MODAL — outside TabDesign to prevent cursor jump ──────

// ── TitleDropdown — select title from library, auto-fills category+type ──

// ═══════════════════════════════════════════════════════════════════
// TAB 3 — ESTIMATE
// ═══════════════════════════════════════════════════════════════════

// TAB 4 — PARTY
// ═══════════════════════════════════════════════════════════════════

// Reuse the full-featured Create Transaction modal from FinanceModule
// (with bank account, MOP, duplicate-payment guard, GRN-link logic).
// ═══════════════════════════════════════════════════════════════════
// TAB 5 — TRANSACTION
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
// TAB 9 — MATERIAL (Site Stock)
// ═══════════════════════════════════════════════════════════════════




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
