import React, { useState, useEffect } from "react";
import api from "../../config/api";
import SearchSelect from "../../components/SearchSelect";
import { T } from "../shared/tokens";
import { Pill, Panel, AddBtn } from "../shared/ui";

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

export default TabTodo;
