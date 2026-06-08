import React, { useState } from "react";
import { T } from "../shared/tokens";
import { Pill, AddBtn, SecBtn, FilterTabs } from "../shared/ui";

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

export default TabSite;
