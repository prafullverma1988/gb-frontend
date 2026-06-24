import { useState, useMemo, useEffect, useCallback } from "react";
import api from "../config/api";
import SearchSelect from "../components/SearchSelect";

// ── ICONS ──────────────────────────────────────────────────────────
const Ic=({d,size=18,color="currentColor",sw=1.8,fill="none"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const IcHome =(p)=><Ic {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>;
const IcProj =(p)=><Ic {...p} d="M3 7h18M3 12h18M3 17h18"/>;
const IcFin  =(p)=><Ic {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>;
const IcWH   =(p)=><Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/>;
const IcPay  =(p)=><Ic {...p} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>;
const IcSet  =(p)=><Ic {...p} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcProc =(p)=><Ic {...p} d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>;
const IcRep  =(p)=><Ic {...p} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>;
const IcTask =(p)=><Ic {...p} d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>;
const IcMenu =(p)=><Ic {...p} d="M4 6h16M4 12h16M4 18h16"/>;
const IcBell =(p)=><Ic {...p} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>;
const IcAdd  =(p)=><Ic {...p} d="M12 5v14M5 12h14"/>;
const IcX    =(p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcChk  =(p)=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcLock =(p)=><Ic {...p} d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"/>;
const IcChev =(p)=><Ic {...p} d="M9 18l6-6-6-6"/>;
const IcEdit =(p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcDown =(p)=><Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>;
const IcPrint=(p)=><Ic {...p} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/>;
const IcTeam =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>;
const IcCRM  =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a3 3 0 00-3-3M16 3.13a4 4 0 010 7.75"/>;
const IcCal  =(p)=><Ic {...p} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>;
const IcEye  =(p)=><Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z"/>;
const IcEyeX =(p)=><Ic {...p} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>;
const IcAlert=(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;
const IcSearch=(p)=><Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;

// ── THEME ─────────────────────────────────────────────────────────
const C={p:"#1565C0",a:"#FF6F00",sb:"#0D1B2A",w:"#FFF"};
const T={
  bg:"#F4F6F9",surface:"#FFFFFF",surfaceB:"#F8F9FB",sb:"#0D1B2A",sbH:"#162032",
  t1:"#111827",t2:"#374151",t3:"#6B7280",t4:"#9CA3AF",
  b1:"#E5E7EB",b2:"#D1D5DB",
  blu:"#2563EB",bluL:"#EFF6FF",bluM:"#BFDBFE",
  grn:"#059669",grnL:"#ECFDF5",grnM:"#A7F3D0",
  amb:"#D97706",ambL:"#FFFBEB",ambM:"#FDE68A",
  red:"#DC2626",redL:"#FEF2F2",redM:"#FECACA",
  slt:"#64748B",sltL:"#F1F5F9",
  pur:"#7C3AED",purL:"#F5F3FF",purM:"#DDD6FE",
};
const fmtN=(n)=>n==null?"—":Number(n).toLocaleString("en-IN");
const fmt=(n)=>n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:String(n||0);
// Module-level date formatter (also re-defined inside PayrollModule
// with same shape — kept here so Leave/Geofence sub-components can use it)
const fmtDate=(d)=>{ if(!d) return "—"; try{ return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}); }catch{return String(d).split("T")[0];} };

// ── SPIN CSS ──────────────────────────────────────────────────────
if(!document.getElementById("gb-spin-css")){const s=document.createElement("style");s.id="gb-spin-css";s.textContent="@keyframes spin{to{transform:rotate(360deg)}}";document.head.appendChild(s);}

// ── CSV EXPORT ────────────────────────────────────────────────────
const exportCSV = (headers, rows, filename) => {
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ── LOADING / ERROR / EMPTY HELPERS ───────────────────────────────
const LoadingSpinner=()=><div style={{textAlign:"center",padding:"60px 0",color:"#94A3B8"}}><div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>Loading...</div>;
const ErrorRetry=({onRetry})=><div style={{textAlign:"center",padding:"60px 0",color:"#EF4444",fontSize:13}}>Failed to load. <span style={{color:"#3B82F6",cursor:"pointer",textDecoration:"underline"}} onClick={onRetry}>Retry</span></div>;
const EmptyState=({icon,message,sub})=><div style={{textAlign:"center",padding:"50px 0",color:T.t4}}>{icon}<div style={{fontSize:13,marginTop:8}}>{message}</div>{sub&&<div style={{fontSize:11.5,color:T.t4,marginTop:3}}>{sub}</div>}</div>;

// ── NAV ────────────────────────────────────────────────────────────
const NAV=[
  {sec:null,items:[
    {id:"dashboard",l:"Dashboard",I:IcHome},
    {id:"projects",l:"Projects",I:IcProj},
    {id:"crm",l:"CRM",I:IcCRM},
    {id:"tasks",l:"Tasks",I:IcTask},
    {id:"team",l:"Team",I:IcTeam},
  ]},
  {sec:"FINANCE & OPS",items:[
    {id:"finance",l:"Finance",I:IcFin},
    {id:"procurement",l:"Procurement",I:IcProc},
    {id:"warehouse",l:"Warehouse",I:IcWH},
    {id:"payroll",l:"Payroll",I:IcPay},
  ]},
  {sec:"MORE",items:[
    {id:"reports",l:"Reports",I:IcRep},
    {id:"settings",l:"Settings",I:IcSet},
  ]},
];

// ── MONTHS ─────────────────────────────────────────────────────────
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const CUR_MONTH=new Date().getMonth();
const CUR_YEAR=new Date().getFullYear();
const WORKING_DAYS=26; // working days in month
let PROJECTS=[];

// ── EMPLOYEE DATA (loaded from API) ────────────────────────────────
let MONTHLY_STAFF=[];

// ── ATTENDANCE (loaded from API) ─────────────────────────────────────

let DAILY_WORKERS=[];
let ADVANCE_DATA=[];

// ── SHARED COMPONENTS ─────────────────────────────────────────────
const Pill=({label,c,bg,brd})=>(
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${brd||c+"33"}`,whiteSpace:"nowrap"}}>{label}</span>
);

function Avatar({name,size=32,color=T.blu}){
  const initials=name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return(
    <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${color},${color}99)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:700,color:"white",flexShrink:0}}>
      {initials}
    </div>
  );
}


// ── MONTHLY ATTENDANCE GRID ───────────────────────────────────────
// ── GEOFENCE ADMIN TAB (Payroll v2 — Phase 5) ────────────────────
// Lets admin add / edit / delete site geofences. Each geofence is a
// (lat, lng, radius_m) tied to a project; mobile punch checks these
// to determine inside/outside-fence state.
function GeofenceAdminTab({isAdmin}){
  const [fences,setFences]=useState([]);
  const [suggestions,setSuggestions]=useState([]);
  const [projects,setProjects]=useState([]);
  const [loading,setLoading]=useState(true);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({project_id:"",label:"",center_lat:"",center_lng:"",radius_m:80});
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");

  const reload=useCallback(async()=>{
    setLoading(true);
    try{
      const [fRes,sRes,pRes]=await Promise.all([
        api.get("/geofences?include_inactive=1"),
        api.get("/geofences/suggestions"),
        api.get("/team-schedule/sites"),
      ]);
      if(fRes.success) setFences(fRes.data||[]);
      if(sRes.success) setSuggestions(sRes.data||[]);
      if(pRes.success) setProjects(pRes.data||[]);
    }catch(e){ /* silent */ }
    setLoading(false);
  },[]);
  useEffect(()=>{ reload(); },[reload]);

  // Per-suggestion radius override — admin can correct the auto-learned
  // radius before confirming (photo spread under/over-estimates real site).
  const [sugRadius,setSugRadius]=useState({});   // {suggestionId: radius}
  const confirmSuggestion=async(id)=>{
    try{
      const body={};
      const r0=Number(sugRadius[id]);
      if(r0>0) body.radius_m=r0;
      const r=await api.put(`/geofences/${id}/confirm`,body);
      if(r.success) await reload();
    }catch(e){ alert(e.message); }
  };
  const rejectSuggestion=async(id)=>{
    if(!await window.confirmAsync("Reject this auto-detected location? It will not appear again until 3+ new photo uploads accumulate near these coords.")) return;
    try{
      const r=await api.del(`/geofences/${id}?hard=1`);
      if(r.success) await reload();
    }catch(e){ alert(e.message); }
  };

  const openAdd=()=>{
    setEditId(null);
    setForm({project_id:"",label:"",center_lat:"",center_lng:"",radius_m:80});
    setErr("");
  };
  const openEdit=(f)=>{
    setEditId(f.id);
    setForm({
      project_id:f.project_id||"",
      label:f.label||"",
      center_lat:f.center_lat||"",
      center_lng:f.center_lng||"",
      radius_m:f.radius_m||80,
    });
    setErr("");
  };
  const useMyLocation=()=>{
    if(!navigator.geolocation){ setErr("Browser GPS not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      pos=>setForm(p=>({...p,center_lat:pos.coords.latitude.toFixed(7),center_lng:pos.coords.longitude.toFixed(7)})),
      e=>setErr("GPS failed: "+e.message),
      { enableHighAccuracy:true,timeout:15000 }
    );
  };
  const save=async()=>{
    if(!form.label.trim()||!form.center_lat||!form.center_lng){
      setErr("Label + latitude + longitude required"); return;
    }
    setSaving(true); setErr("");
    try{
      const body={
        project_id:form.project_id||null,
        label:form.label.trim(),
        center_lat:Number(form.center_lat),
        center_lng:Number(form.center_lng),
        radius_m:Number(form.radius_m)||80,
      };
      const r=editId
        ? await api.put(`/geofences/${editId}`,body)
        : await api.post("/geofences",body);
      if(r.success){ await reload(); openAdd(); }
      else setErr(r.message||"Save failed");
    }catch(e){ setErr(e.message||"Network error"); }
    setSaving(false);
  };
  const remove=async(id)=>{
    if(!await window.confirmAsync("Soft-delete this geofence? (Will not affect past punches)")) return;
    try{ await api.del(`/geofences/${id}`); await reload(); }
    catch(e){ alert(e.message); }
  };
  const toggleActive=async(f)=>{
    try{ await api.put(`/geofences/${f.id}`,{active:!f.active?1:0}); await reload(); }
    catch(e){ alert(e.message); }
  };

  const inp={width:"100%",padding:"7px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};

  if(!isAdmin){
    return <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>Geofence config is admin-only.</div>;
  }

  return(
    <div>
      <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:9,padding:"10px 14px",marginBottom:14,fontSize:11.5,color:T.t2,lineHeight:1.5}}>
        Mobile app checks each punch against active geofences. <b>Inside</b> → auto-attendance.
        <b style={{color:T.amb,marginLeft:5}}>Outside</b> → admin review queue (Pending Approvals tab).
        <br/>
        <span style={{color:T.t3,fontSize:11}}>💡 Tip: 3+ live-camera photo uploads from the same site auto-suggest a location below.</span>
      </div>

      {/* ─── AUTO-LEARNED SUGGESTIONS ─── */}
      {suggestions.length > 0 && (
        <div style={{background:T.purL,border:`2px dashed ${T.pur}`,borderRadius:10,padding:"12px 14px",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:18}}>🔮</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:T.pur}}>Auto-Detected Locations — {suggestions.length} new</div>
              <div style={{fontSize:10.5,color:T.t3,marginTop:1}}>Team ne in coordinates pe regular photos upload kiye — site location lagti hai</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {suggestions.map(s=>(
              <div key={s.id} style={{background:T.surface,border:`1px solid ${T.purM}`,borderRadius:8,padding:"10px 12px",display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>
                    {s.project_name || "Generic site"}
                    <span style={{marginLeft:8,fontSize:9.5,padding:"1px 7px",borderRadius:10,background:T.purL,color:T.pur,fontWeight:700}}>
                      {s.confidence||0}% confident
                    </span>
                  </div>
                  <div style={{fontSize:10.5,color:T.t3,marginTop:3,fontFamily:"monospace"}}>
                    {Number(s.center_lat).toFixed(5)}, {Number(s.center_lng).toFixed(5)}
                  </div>
                  <div style={{fontSize:10.5,color:T.t4,marginTop:2}}>{s.label}</div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {/* Editable radius — defaults to auto-learned value */}
                  <div style={{display:"flex",alignItems:"center",gap:3,background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:6,padding:"3px 7px"}} title="Radius (meters) — edit before confirming">
                    <input type="number" min={20} max={1000}
                      value={sugRadius[s.id]!==undefined?sugRadius[s.id]:(s.radius_m||80)}
                      onChange={e=>setSugRadius(p=>({...p,[s.id]:e.target.value}))}
                      style={{width:52,border:"none",background:"transparent",fontSize:11.5,fontWeight:700,color:T.t1,outline:"none",textAlign:"right",fontFamily:"inherit"}}/>
                    <span style={{fontSize:10,color:T.t4}}>m</span>
                  </div>
                  <button onClick={()=>rejectSuggestion(s.id)}
                    style={{padding:"6px 11px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                    ✕ Reject
                  </button>
                  <button onClick={()=>confirmSuggestion(s.id)}
                    style={{padding:"6px 14px",borderRadius:6,background:T.pur,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
                    ✓ Confirm Site
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        {/* ─── Form ─── */}
        <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,padding:14}}>
          <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:10}}>
            {editId?"Edit Geofence":"Add New Geofence"}
          </div>
          <div style={{display:"grid",gap:9}}>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Label *</div>
              <input style={inp} value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} placeholder="e.g. Raganee House Site"/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Project (optional)</div>
              <select style={inp} value={form.project_id} onChange={e=>setForm(p=>({...p,project_id:e.target.value}))}>
                <option value="">— Generic (not project-linked) —</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}{p.city?` · ${p.city}`:""}</option>)}
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div>
                <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Latitude *</div>
                <input style={inp} value={form.center_lat} onChange={e=>setForm(p=>({...p,center_lat:e.target.value}))} placeholder="21.2497"/>
              </div>
              <div>
                <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Longitude *</div>
                <input style={inp} value={form.center_lng} onChange={e=>setForm(p=>({...p,center_lng:e.target.value}))} placeholder="81.6324"/>
              </div>
            </div>
            <button onClick={useMyLocation}
              style={{padding:"6px 10px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>
              📍 Use my current GPS location
            </button>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Radius: <b style={{color:T.t1}}>{form.radius_m}m</b></div>
              <input type="range" min="30" max="500" step="10" value={form.radius_m}
                onChange={e=>setForm(p=>({...p,radius_m:Number(e.target.value)}))}
                style={{width:"100%"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:T.t4,marginTop:2}}>
                <span>30m</span><span>80m default</span><span>500m</span>
              </div>
            </div>
            {err && <div style={{padding:"7px 10px",background:T.redL,color:T.red,borderRadius:6,fontSize:11}}>{err}</div>}
            <div style={{display:"flex",gap:7}}>
              {editId && (
                <button onClick={openAdd} style={{flex:1,padding:"8px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,color:T.t3,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
              )}
              <button onClick={save} disabled={saving}
                style={{flex:2,padding:"8px",borderRadius:6,background:saving?T.t4:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer"}}>
                {saving?"Saving…":(editId?"Save Changes":"Add Geofence")}
              </button>
            </div>
          </div>
        </div>

        {/* ─── List ─── */}
        <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,overflow:"hidden",minHeight:280}}>
          <div style={{padding:"10px 14px",background:T.sb,color:"white",fontSize:12.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>Active Geofences <span style={{color:"rgba(255,255,255,.5)",marginLeft:4,fontSize:11}}>({fences.length})</span></span>
          </div>
          {loading && <div style={{padding:"30px",textAlign:"center",color:T.t4,fontSize:12}}>Loading…</div>}
          {!loading && fences.length===0 && (
            <div style={{padding:"35px 14px",textAlign:"center",color:T.t4,fontSize:12.5,lineHeight:1.5}}>
              No geofences yet.<br/>
              <span style={{fontSize:11}}>Until you add at least one site, all punches will be accepted without review.</span>
            </div>
          )}
          {!loading && fences.map(f=>(
            <div key={f.id} style={{padding:"11px 14px",borderTop:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12.5,fontWeight:700,color:f.active?T.t1:T.t4,textDecoration:f.active?"none":"line-through"}}>{f.label}</span>
                  {f.project_name && <span style={{fontSize:9.5,padding:"1px 6px",borderRadius:9,background:T.bluL,color:T.blu,fontWeight:700}}>{f.project_name}</span>}
                  {f.source==="auto_learned" && <span style={{fontSize:9,padding:"1px 6px",borderRadius:9,background:T.purL,color:T.pur,fontWeight:700}}>AUTO</span>}
                </div>
                <div style={{fontSize:10.5,color:T.t4,marginTop:2,fontFamily:"monospace"}}>
                  {Number(f.center_lat).toFixed(5)}, {Number(f.center_lng).toFixed(5)} · {f.radius_m}m
                </div>
              </div>
              <button onClick={()=>toggleActive(f)} title={f.active?"Deactivate":"Activate"}
                style={{padding:"4px 9px",borderRadius:5,background:f.active?T.grnL:T.sltL,border:`1px solid ${f.active?T.grnM:T.b1}`,color:f.active?T.grn:T.t3,fontSize:10,fontWeight:700,cursor:"pointer"}}>
                {f.active?"ON":"OFF"}
              </button>
              <button onClick={()=>openEdit(f)}
                style={{padding:"4px 9px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10,fontWeight:600,cursor:"pointer"}}>
                Edit
              </button>
              <button onClick={()=>remove(f.id)}
                style={{padding:"4px 8px",borderRadius:5,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:10,fontWeight:700,cursor:"pointer"}}>
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pending review queue */}
      <PendingReviewQueue onChanged={reload}/>
    </div>
  );
}

// ── PENDING REVIEW QUEUE (Phase 5) ───────────────────────────────
// Sessions where staff punched in outside every active geofence.
function PendingReviewQueue({onChanged}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [acting,setActing]=useState(null);
  const reload=async()=>{
    setLoading(true);
    try{
      const r=await api.get("/attendance/pending-review");
      if(r.success) setItems(r.data||[]);
    }catch(e){ /* silent */ }
    setLoading(false);
  };
  useEffect(()=>{ reload(); },[]);
  const review=async(id,action)=>{
    setActing(id);
    try{
      const r=await api.patch(`/attendance/sessions/${id}/review`,{action});
      if(r.success){ await reload(); if(onChanged) onChanged(); }
      else alert(r.message);
    }catch(e){ alert(e.message); }
    setActing(null);
  };
  return(
    <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",background:T.amb,color:"white",fontSize:12.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span>Outside-Geofence Punches — Pending Review <span style={{color:"rgba(255,255,255,.6)",marginLeft:4,fontSize:11}}>({items.length})</span></span>
        <button onClick={reload} style={{background:"rgba(255,255,255,.18)",border:"none",color:"white",padding:"3px 9px",borderRadius:5,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>↻ Refresh</button>
      </div>
      {loading && <div style={{padding:"25px",textAlign:"center",color:T.t4,fontSize:12}}>Loading…</div>}
      {!loading && items.length===0 && (
        <div style={{padding:"25px 14px",textAlign:"center",color:T.grn,fontSize:12.5,fontWeight:600}}>✓ All clean — no outside-geofence punches pending</div>
      )}
      {!loading && items.map(s=>(
        <div key={s.id} style={{padding:"11px 14px",borderTop:`1px solid ${T.b1}`,display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"center"}}>
          <div>
            <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{s.user_name} <span style={{fontSize:10,color:T.t4,fontWeight:500}}>· {s.user_phone||""}</span></div>
            <div style={{fontSize:11,color:T.t3,marginTop:3}}>
              Punched in at <b>{new Date(s.punch_in_at).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</b>
              {s.project_name && <> · {s.project_name}</>}
            </div>
            <div style={{fontSize:10,color:T.t4,marginTop:2,fontFamily:"monospace"}}>
              GPS: {s.punch_in_lat?Number(s.punch_in_lat).toFixed(5):"—"}, {s.punch_in_lng?Number(s.punch_in_lng).toFixed(5):"—"}
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>review(s.id,"reject")} disabled={acting===s.id}
              style={{padding:"6px 12px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
              ✕ Reject
            </button>
            <button onClick={()=>review(s.id,"approve")} disabled={acting===s.id}
              style={{padding:"6px 14px",borderRadius:6,background:T.grn,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
              ✓ Approve
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── LEAVE TAB (Payroll v2 — Phase 3) ─────────────────────────────
// Sub-tabs: Apply / My Leaves / Pending Approvals / Balance
function LeaveTab({staff,month,year,isAdmin,onAttendanceChanged}){
  const [subTab,setSubTab]=useState("apply");
  const [types,setTypes]=useState([]);
  const [apps,setApps]=useState([]);
  const [balances,setBalances]=useState([]);
  const [loading,setLoading]=useState(true);
  const currentUser=(()=>{ try{return JSON.parse(localStorage.getItem("gb_user")||"{}");}catch{return{};} })();

  const reload=useCallback(async()=>{
    setLoading(true);
    try{
      const [tRes,aRes,bRes]=await Promise.all([
        api.get("/payroll/leave-types"),
        api.get(`/payroll/leave-applications?year=${year}`),
        api.get(`/payroll/leave-balances?year=${year}`),
      ]);
      if(tRes.success) setTypes(tRes.data||[]);
      if(aRes.success) setApps(aRes.data||[]);
      if(bRes.success) setBalances(bRes.data||[]);
    }catch(e){ /* silent */ }
    setLoading(false);
  },[year]);
  useEffect(()=>{ reload(); },[reload]);

  const pendingApps=apps.filter(a=>a.status==="Pending");
  const myApps=apps; // For admin: all apps; for non-admin tu apne hi dikh sakte (no staff_id link yet — show all)
  const myBalances=balances; // same

  // ─── Apply form ────────────────────────────────────────
  const [form,setForm]=useState({
    staff_id:"", leave_type_id:"",
    from_date:"", to_date:"",
    is_half_day:false, half_day_part:"first",
    reason:"",
  });
  const [preview,setPreview]=useState({days:0,loading:false});
  const [submitting,setSubmitting]=useState(false);
  const [err,setErr]=useState("");

  useEffect(()=>{
    if(!form.from_date||!form.to_date){ setPreview({days:0,loading:false}); return; }
    let cancelled=false;
    setPreview(p=>({...p,loading:true}));
    api.get(`/payroll/leave-applications/preview?from_date=${form.from_date}&to_date=${form.to_date}&is_half_day=${form.is_half_day?"true":"false"}`)
      .then(r=>{ if(!cancelled&&r.success) setPreview({days:r.data.days,loading:false}); })
      .catch(()=>{ if(!cancelled) setPreview({days:0,loading:false}); });
    return ()=>{ cancelled=true; };
  },[form.from_date,form.to_date,form.is_half_day]);

  const submit=async()=>{
    setErr("");
    if(!form.staff_id||!form.leave_type_id||!form.from_date||!form.to_date){
      setErr("Sab fields zaroori hain"); return;
    }
    setSubmitting(true);
    try{
      const r=await api.post("/payroll/leave-applications",{
        staff_id:Number(form.staff_id),
        leave_type_id:Number(form.leave_type_id),
        from_date:form.from_date, to_date:form.to_date,
        is_half_day:form.is_half_day, half_day_part:form.half_day_part,
        reason:form.reason||null,
      });
      if(r.success){
        setForm({staff_id:"",leave_type_id:"",from_date:"",to_date:"",is_half_day:false,half_day_part:"first",reason:""});
        setPreview({days:0,loading:false});
        await reload();
        setSubTab("my");
      }else setErr(r.message||"Apply failed");
    }catch(e){ setErr(e.message||"Network error"); }
    setSubmitting(false);
  };

  const review=async(id,action,note)=>{
    try{
      const r=await api.patch(`/payroll/leave-applications/${id}/review`,{action,note:note||null});
      if(r.success){ await reload(); if(action==="approve"&&onAttendanceChanged) onAttendanceChanged(); }
      else alert(r.message||"Review failed");
    }catch(e){ alert(e.message); }
  };
  const cancel=async(id)=>{
    if(!await window.confirmAsync("Cancel this leave application?")) return;
    try{
      const r=await api.patch(`/payroll/leave-applications/${id}/cancel`,{});
      if(r.success) await reload();
      else alert(r.message);
    }catch(e){ alert(e.message); }
  };

  const inp={width:"100%",padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};

  // ─── Sub-tabs strip ────────────────────────────────────
  const SUB_TABS=[
    {id:"apply", l:"Apply", c:T.grn},
    {id:"my",    l:"My Leaves", c:T.blu, badge:apps.length},
    {id:"pending", l:"Pending Approvals", c:T.amb, badge:pendingApps.length, adminOnly:true},
    {id:"balance", l:"Balance", c:T.pur, badge:balances.length},
  ];

  return(
    <div>
      {/* Sub-tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14,borderBottom:`1px solid ${T.b1}`,paddingBottom:6}}>
        {SUB_TABS.filter(s=>!s.adminOnly||isAdmin).map(s=>{
          const active=subTab===s.id;
          return(
            <button key={s.id} onClick={()=>setSubTab(s.id)}
              style={{padding:"6px 13px",borderRadius:7,border:"none",background:active?s.c:"transparent",color:active?"white":T.t3,fontSize:12,fontWeight:active?700:500,cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"all .15s"}}>
              {s.l}
              {s.badge>0&&<span style={{background:active?"rgba(255,255,255,.25)":s.c+"22",color:active?"white":s.c,fontSize:9.5,fontWeight:700,padding:"1px 6px",borderRadius:10}}>{s.badge}</span>}
            </button>
          );
        })}
      </div>

      {loading && <div style={{textAlign:"center",padding:"30px 0",color:T.t4,fontSize:12}}>Loading…</div>}

      {/* ─── APPLY ─── */}
      {!loading && subTab==="apply" && (
        <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,padding:16,maxWidth:640}}>
          <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:10}}>Apply for Leave</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Staff Member</div>
              <select value={form.staff_id} onChange={e=>setForm(p=>({...p,staff_id:e.target.value}))} style={inp}>
                <option value="">— Select —</option>
                {staff.map(s=><option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Leave Type</div>
              <select value={form.leave_type_id} onChange={e=>setForm(p=>({...p,leave_type_id:e.target.value}))} style={inp}>
                <option value="">— Select —</option>
                {types.map(t=><option key={t.id} value={t.id}>{t.code} — {t.name}{t.is_unpaid?" (Unpaid)":""}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>From</div>
              <input type="date" value={form.from_date} onChange={e=>setForm(p=>({...p,from_date:e.target.value,to_date:form.is_half_day?e.target.value:p.to_date}))} style={inp}/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>To</div>
              <input type="date" value={form.to_date} onChange={e=>setForm(p=>({...p,to_date:e.target.value}))} disabled={form.is_half_day} style={{...inp,opacity:form.is_half_day?0.5:1}}/>
            </div>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12,color:T.t2,marginBottom:10,cursor:"pointer"}}>
            <input type="checkbox" checked={form.is_half_day} onChange={e=>setForm(p=>({...p,is_half_day:e.target.checked,to_date:e.target.checked?p.from_date:p.to_date}))}/>
            Half-day leave (single date)
          </label>
          {form.is_half_day && (
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Half-day Part</div>
              <select value={form.half_day_part} onChange={e=>setForm(p=>({...p,half_day_part:e.target.value}))} style={{...inp,maxWidth:200}}>
                <option value="first">First half (morning)</option>
                <option value="second">Second half (afternoon)</option>
              </select>
            </div>
          )}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Reason</div>
            <textarea value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} rows={2}
              placeholder="Brief reason (optional)"
              style={{...inp,resize:"vertical"}}/>
          </div>

          {/* Preview */}
          {form.from_date && form.to_date && (
            <div style={{padding:"9px 12px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,marginBottom:10,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:11.5,color:T.t3}}>Computed working days:</span>
              <span style={{fontSize:14,fontWeight:800,color:T.blu}}>{preview.loading?"…":preview.days}</span>
              <span style={{fontSize:10.5,color:T.t4,marginLeft:"auto"}}>Sundays + non-optional holidays auto-excluded</span>
            </div>
          )}

          {err && <div style={{padding:"8px 11px",background:T.redL,color:T.red,borderRadius:6,fontSize:11.5,marginBottom:10}}>{err}</div>}
          <button onClick={submit} disabled={submitting||!form.staff_id||!form.leave_type_id||!form.from_date||!form.to_date}
            style={{padding:"9px 22px",borderRadius:7,background:submitting||!form.staff_id||!form.leave_type_id||!form.from_date||!form.to_date?T.t4:T.grn,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:submitting?"not-allowed":"pointer"}}>
            {submitting?"Submitting…":"Submit Application"}
          </button>
        </div>
      )}

      {/* ─── MY LEAVES / ALL LEAVES list ─── */}
      {!loading && subTab==="my" && (
        <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"160px 140px 90px 110px 110px 90px 100px",padding:"8px 14px",background:T.sb,color:"rgba(255,255,255,.55)",fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".3px"}}>
            {["Staff","Type","Days","From","To","Status","Actions"].map((h,i)=><span key={i}>{h}</span>)}
          </div>
          {myApps.length===0&&<div style={{padding:"30px 14px",textAlign:"center",color:T.t4,fontSize:12.5}}>No leave applications yet</div>}
          {myApps.map((a,i)=>{
            const stC={"Pending":T.amb,"Approved":T.grn,"Rejected":T.red,"Cancelled":T.t4}[a.status]||T.t4;
            const bg={"Pending":T.ambL,"Approved":T.grnL,"Rejected":T.redL,"Cancelled":T.sltL}[a.status]||T.sltL;
            return(
              <div key={a.id} style={{display:"grid",gridTemplateColumns:"160px 140px 90px 110px 110px 90px 100px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",fontSize:11.5,background:i%2===0?"transparent":T.surfaceB}}>
                <div>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{a.staff_name}</div>
                  <div style={{fontSize:10,color:T.t4}}>{a.staff_role}</div>
                </div>
                <div>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:700}}>{a.leave_code}</span>
                  <div style={{fontSize:10.5,color:T.t4,marginTop:2}}>{a.leave_name}{a.is_unpaid?" (LOP)":""}</div>
                </div>
                <span style={{fontSize:13,fontWeight:800,color:T.t1}}>{Number(a.days)}d{a.is_half_day?" ½":""}</span>
                <span style={{color:T.t2}}>{fmtDate(a.from_date)}</span>
                <span style={{color:T.t2}}>{fmtDate(a.to_date)}</span>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:bg,color:stC,fontWeight:700,justifySelf:"start"}}>{a.status}</span>
                <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                  {a.status==="Pending"&&(a.applied_by===currentUser.id||isAdmin)&&(
                    <button onClick={()=>cancel(a.id)} style={{padding:"3px 8px",borderRadius:5,background:T.sltL,border:`1px solid ${T.b1}`,color:T.t3,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── PENDING APPROVALS (admin) ─── */}
      {!loading && subTab==="pending" && isAdmin && (
        <div>
          {pendingApps.length===0?(
            <div style={{background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:9,padding:30,textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:T.grn,marginBottom:4}}>All caught up</div>
              <div style={{fontSize:11.5,color:T.t3}}>No pending leave applications</div>
            </div>
          ):pendingApps.map(a=>(
            <div key={a.id} style={{background:T.surface,border:`1px solid ${T.ambM}`,borderRadius:9,padding:13,marginBottom:9,borderLeft:`4px solid ${T.amb}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{a.staff_name} <span style={{fontSize:10.5,color:T.t4,fontWeight:500}}>· {a.staff_role}</span></div>
                  <div style={{fontSize:11.5,color:T.t2,marginTop:3}}>
                    <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:700,marginRight:6}}>{a.leave_code}</span>
                    {a.leave_name}{a.is_unpaid?" (LOP)":""} · <b>{Number(a.days)} day{Number(a.days)===1?"":"s"}</b>{a.is_half_day?" (half-day)":""}
                  </div>
                  <div style={{fontSize:11,color:T.t3,marginTop:3}}>{fmtDate(a.from_date)} → {fmtDate(a.to_date)}</div>
                  {a.reason&&<div style={{fontSize:11,color:T.t3,fontStyle:"italic",marginTop:5}}>"{a.reason}"</div>}
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={async ()=>review(a.id,"reject",await window.promptAsync("Reject reason (optional):")||null)}
                    style={{padding:"6px 12px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
                    ✕ Reject
                  </button>
                  <button onClick={()=>review(a.id,"approve")}
                    style={{padding:"6px 14px",borderRadius:6,background:T.grn,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
                    ✓ Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── BALANCE ─── */}
      {!loading && subTab==="balance" && (
        <div>
          {isAdmin && (
            <div style={{marginBottom:10,display:"flex",gap:8}}>
              <button onClick={async()=>{
                  if(!await window.confirmAsync(`Allocate ${year} balances for all staff × leave types (idempotent)?`)) return;
                  try{
                    const r=await api.post("/payroll/leave-balances/allocate-year",{year});
                    if(r.success){ alert(`${r.added} balance row(s) added`); await reload(); }
                  }catch(e){ alert(e.message); }
                }}
                style={{padding:"6px 12px",borderRadius:7,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
                Allocate {year} Balances
              </button>
            </div>
          )}
          <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"180px 80px 1fr 70px 70px 70px 80px",padding:"8px 14px",background:T.sb,color:"rgba(255,255,255,.55)",fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".3px"}}>
              {["Staff","Type","Name","Allocated","Used","Carried","Balance"].map((h,i)=><span key={i}>{h}</span>)}
            </div>
            {myBalances.length===0&&<div style={{padding:"30px 14px",textAlign:"center",color:T.t4,fontSize:12.5}}>No balances allocated yet</div>}
            {myBalances.map((b,i)=>{
              const bal=Number(b.balance);
              const balColor=bal<=0?T.red:bal<3?T.amb:T.grn;
              return(
                <div key={b.id} style={{display:"grid",gridTemplateColumns:"180px 80px 1fr 70px 70px 70px 80px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",fontSize:11.5,background:i%2===0?"transparent":T.surfaceB}}>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{b.staff_name}</div>
                    <div style={{fontSize:10,color:T.t4}}>{b.staff_role}</div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:700,justifySelf:"start"}}>{b.code}</span>
                  <span style={{color:T.t3}}>{b.leave_name}{b.is_unpaid?" (LOP)":""}</span>
                  <span style={{color:T.t2,fontWeight:600}}>{Number(b.allocated)}</span>
                  <span style={{color:T.red,fontWeight:600}}>-{Number(b.used)}</span>
                  <span style={{color:T.t3}}>{Number(b.carried_fwd)}</span>
                  <span style={{color:balColor,fontWeight:800,fontSize:13}}>{bal}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── HOLIDAY CALENDAR TAB (Payroll v2 — Phase 4) ──────────────────
// Month view with holidays + leaves marked. Admin can add / edit /
// delete holidays + bulk-seed 2026 defaults.
function HolidayCalendarTab({holidays,setHolidays,month,year,isAdmin}){
  const [addOpen,setAddOpen]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({holiday_date:"",name:"",type:"Custom",is_optional:false,region:"All-India",notes:""});
  const [saving,setSaving]=useState(false);

  const reload=async()=>{
    try{
      const r=await api.get(`/payroll/holidays?year=${year}`);
      if(r.success) setHolidays(r.data||[]);
    }catch(e){ /* silent */ }
  };

  const openAdd=(date)=>{
    setEditId(null);
    setForm({holiday_date:date||"",name:"",type:"Custom",is_optional:false,region:"All-India",notes:""});
    setAddOpen(true);
  };
  const openEdit=(h)=>{
    setEditId(h.id);
    setForm({
      holiday_date:h.holiday_date?h.holiday_date.split("T")[0]:"",
      name:h.name||"", type:h.type||"Custom",
      is_optional:!!h.is_optional, region:h.region||"All-India", notes:h.notes||"",
    });
    setAddOpen(true);
  };
  const save=async()=>{
    if(!form.holiday_date||!form.name.trim()){ alert("Date and name required"); return; }
    setSaving(true);
    try{
      if(editId){
        await api.patch(`/payroll/holidays/${editId}`,form);
      }else{
        await api.post("/payroll/holidays",form);
      }
      await reload();
      setAddOpen(false);
    }catch(e){ alert(e.message||"Save failed"); }
    setSaving(false);
  };
  const del=async(id)=>{
    if(!await window.confirmAsync("Delete this holiday?")) return;
    try{ await api.del(`/payroll/holidays/${id}`); await reload(); }
    catch(e){ alert(e.message); }
  };
  const bulkSeed=async()=>{
    if(!await window.confirmAsync(`Seed CG + National 2026 holidays? Will skip dates already present.`)) return;
    try{
      const r=await api.post(`/payroll/holidays/bulk-seed?year=${year}`,{});
      if(r.success){ alert(`${r.added} holiday(s) seeded`); await reload(); }
    }catch(e){ alert(e.message); }
  };

  // Build month view
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDow=new Date(year,month,1).getDay();
  const holidayByDay={};
  holidays.forEach(h=>{
    const d=new Date(h.holiday_date);
    if(d.getMonth()===month&&d.getFullYear()===year){ holidayByDay[d.getDate()]=h; }
  });
  // Aggregate stats
  const monthHolidays=holidays.filter(h=>{
    const d=new Date(h.holiday_date);
    return d.getMonth()===month&&d.getFullYear()===year;
  });
  const monthConfirmed=monthHolidays.filter(h=>!h.is_optional).length;
  const monthOptional=monthHolidays.filter(h=>h.is_optional).length;
  // Count working days = total - sundays - confirmed holidays (not optional)
  let sundays=0, workingDays=0;
  for(let d=1;d<=daysInMonth;d++){
    const dow=new Date(year,month,d).getDay();
    if(dow===0) sundays++;
    else if(holidayByDay[d]&&!holidayByDay[d].is_optional) {/* count separately */}
    else workingDays++;
  }
  workingDays-=monthConfirmed;
  workingDays=Math.max(0,workingDays);

  const yearList=holidays.filter(h=>new Date(h.holiday_date).getFullYear()===year)
    .sort((a,b)=>new Date(a.holiday_date)-new Date(b.holiday_date));

  return(
    <div>
      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
        {[
          {l:"Working Days",  v:workingDays,           sub:`${MONTHS[month]} ${year}`, c:T.grn},
          {l:"Sundays",       v:sundays,               sub:"Weekly off",                c:T.t3},
          {l:"Holidays",      v:monthConfirmed,        sub:"Confirmed off",             c:T.red},
          {l:"Optional",      v:monthOptional,         sub:"Admin discretion",          c:T.amb},
        ].map((s,i)=>(
          <div key={i} style={{background:T.surface,border:`1px solid ${T.b1}`,borderTop:`3px solid ${s.c}`,borderRadius:8,padding:"11px 13px"}}>
            <div style={{fontSize:10,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{s.l}</div>
            <div style={{fontSize:20,fontWeight:800,color:T.t1,lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:10.5,color:T.t4,marginTop:3}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
        <div style={{fontSize:13,fontWeight:700,color:T.t1}}>Month view — {MONTHS[month]} {year}</div>
        <div style={{flex:1}}/>
        {isAdmin&&(
          <button onClick={bulkSeed}
            style={{padding:"6px 12px",borderRadius:7,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
            Seed 2026 Defaults
          </button>
        )}
        {isAdmin&&(
          <button onClick={()=>openAdd("")}
            style={{padding:"6px 12px",borderRadius:7,background:T.grn,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
            + Add Holiday
          </button>
        )}
      </div>

      {/* Month grid */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,padding:12,marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:5}}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>(
            <div key={d} style={{fontSize:10.5,fontWeight:700,color:i===0?T.red:T.t3,textAlign:"center",padding:"4px 0"}}>{d}</div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {Array.from({length:firstDow},(_,i)=><div key={`b${i}`}/>)}
          {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
            const dow=new Date(year,month,d).getDay();
            const isSun=dow===0;
            const hol=holidayByDay[d];
            const bg=hol&&!hol.is_optional?"#FEE2E2":hol&&hol.is_optional?T.ambL:isSun?T.sltL:T.surface;
            const border=hol&&!hol.is_optional?"#FCA5A5":hol?T.ambM:isSun?T.b1:T.b1;
            return(
              <div key={d} onClick={()=>{
                  if(hol&&isAdmin) openEdit(hol);
                  else if(!hol&&isAdmin){
                    const ds=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                    openAdd(ds);
                  }
                }}
                style={{background:bg,border:`1px solid ${border}`,borderRadius:7,padding:"7px 8px",minHeight:60,cursor:isAdmin?"pointer":"default",transition:"all .15s"}}
                onMouseEnter={e=>{if(isAdmin) e.currentTarget.style.boxShadow=`0 0 0 2px ${T.bluM}`;}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";}}>
                <div style={{fontSize:13,fontWeight:700,color:isSun?T.red:hol&&!hol.is_optional?T.red:T.t1}}>{d}</div>
                {hol&&(
                  <div style={{fontSize:9.5,color:hol.is_optional?T.amb:T.red,fontWeight:600,marginTop:3,lineHeight:1.2}}>
                    {hol.name}
                    {hol.is_optional&&<div style={{fontSize:8.5,fontWeight:500,color:T.amb,opacity:0.9}}>Optional</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Year list */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",background:T.sb,color:"white",fontSize:12.5,fontWeight:700}}>
          All Holidays — {year} ({yearList.length})
        </div>
        {yearList.length===0&&<div style={{padding:"30px 14px",textAlign:"center",color:T.t4,fontSize:12.5}}>No holidays added yet. Click "Seed 2026 Defaults" to bulk-load CG + National holidays.</div>}
        {yearList.map(h=>{
          const d=new Date(h.holiday_date);
          const dow=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
          return(
            <div key={h.id} style={{display:"grid",gridTemplateColumns:"110px 1fr 100px 100px 90px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",fontSize:12}}>
              <div style={{color:T.t1,fontWeight:600}}>{d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}<span style={{fontSize:10,color:T.t4,marginLeft:4}}>{dow}</span></div>
              <div style={{color:T.t1,fontWeight:600}}>{h.name}</div>
              <span style={{fontSize:10.5,padding:"2px 8px",borderRadius:12,background:T.bluL,color:T.blu,fontWeight:600,justifySelf:"start"}}>{h.type}</span>
              <span style={{fontSize:10.5,color:T.t3}}>{h.region}</span>
              <div style={{display:"flex",gap:5,justifyContent:"flex-end"}}>
                {h.is_optional&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:T.ambL,color:T.amb,fontWeight:700}}>OPT</span>}
                {isAdmin&&<>
                  <button onClick={()=>openEdit(h)} style={{padding:"3px 8px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>del(h.id)} style={{padding:"3px 8px",borderRadius:5,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>×</button>
                </>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit modal */}
      {addOpen && (
        <div onClick={()=>!saving&&setAddOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,width:420,maxWidth:"100%",padding:20,boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
            <div style={{fontSize:15,fontWeight:800,color:T.t1,marginBottom:14}}>{editId?"Edit Holiday":"Add Holiday"}</div>
            <div style={{display:"grid",gap:9}}>
              <div>
                <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Date</div>
                <input type="date" value={form.holiday_date} onChange={e=>setForm(p=>({...p,holiday_date:e.target.value}))}
                  style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div>
                <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Name</div>
                <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Diwali"
                  style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div>
                  <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Type</div>
                  <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}
                    style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
                    {["National","Festival","Regional","Optional","Custom"].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Region</div>
                  <select value={form.region} onChange={e=>setForm(p=>({...p,region:e.target.value}))}
                    style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
                    {["All-India","Chhattisgarh","Other"].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12,color:T.t2,cursor:"pointer"}}>
                <input type="checkbox" checked={form.is_optional} onChange={e=>setForm(p=>({...p,is_optional:e.target.checked}))}/>
                Optional holiday (admin can still mark attendance)
              </label>
              <div>
                <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>Notes</div>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2}
                  style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:7,marginTop:14}}>
              <button onClick={()=>!saving&&setAddOpen(false)} disabled={saving}
                style={{flex:1,padding:"8px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,color:T.t3,fontSize:12,fontWeight:600,cursor:saving?"not-allowed":"pointer"}}>Cancel</button>
              <button onClick={save} disabled={saving}
                style={{flex:2,padding:"8px",borderRadius:7,background:saving?T.t4:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer"}}>
                {saving?"Saving…":(editId?"Save Changes":"Add Holiday")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PUNCH REVIEW STRIP — out-of-geofence punches awaiting HR review ──
// Same data as Pending Approvals → Finance → Attendance Review; surfaced
// here too because HR lives in Payroll. Approve = Present stays, Reject = A.
function PunchReviewStrip({onActed}){
  const [rows,setRows]=useState([]);
  const [acting,setActing]=useState(null);
  const [openId,setOpenId]=useState(null);          // session whose day-timeline is expanded
  const [tl,setTl]=useState({});                    // { [sessionId]: {loading,pings} }
  const load=useCallback(()=>{
    api.get("/attendance-sessions/pending-review").then(r=>{
      if(r.success) setRows(r.data||[]);
    }).catch(()=>{});
  },[]);
  useEffect(()=>{load();},[load]);
  const act=async(id,action)=>{
    setActing(id);
    try{
      const r=await api.patch(`/attendance-sessions/sessions/${id}/review`,{action});
      if(r.success){ setRows(p=>p.filter(x=>x.id!==id)); onActed&&onActed(); }
      else alert(r.message||"Failed");
    }catch(e){ alert(e.message); }
    setActing(null);
  };
  const toggleTimeline=async(id)=>{
    if(openId===id){ setOpenId(null); return; }
    setOpenId(id);
    if(!tl[id]){
      setTl(p=>({...p,[id]:{loading:true,pings:[]}}));
      try{
        const r=await api.get(`/attendance-sessions/timeline/${id}`);
        setTl(p=>({...p,[id]:{loading:false,pings:(r.success&&r.data&&r.data.pings)||[]}}));
      }catch(e){ setTl(p=>({...p,[id]:{loading:false,pings:[]}})); }
    }
  };
  if(!rows.length) return null;
  return(
    <div style={{background:"#F0FDFA",border:"2px dashed #0D9488",borderRadius:10,padding:"11px 14px",marginBottom:12}}>
      <div style={{fontSize:12.5,fontWeight:800,color:"#0D9488",marginBottom:8}}>
        📍 Punch Review — {rows.length} geofence ke bahar
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {rows.map(s=>{
          const t=tl[s.id];
          return(
          <div key={s.id} style={{background:T.surface,border:"1px solid #99F6E4",borderRadius:8,padding:"8px 11px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:180}}>
                <div style={{fontSize:12,fontWeight:700,color:T.t1}}>{s.user_name||"Staff"} {s.project_name&&<span style={{fontWeight:400,color:T.t3}}>· {s.project_name}</span>}</div>
                <div style={{fontSize:10.5,color:T.t3,marginTop:1}}>
                  🕐 {s.punch_in_at?new Date(s.punch_in_at).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"—"}
                  {s.punch_in_lat!=null&&<>
                    {" · "}
                    <a href={`https://www.google.com/maps?q=${s.punch_in_lat},${s.punch_in_lng}`} target="_blank" rel="noreferrer" style={{color:"#0D9488",fontWeight:600,textDecoration:"none"}}>📍 map ↗</a>
                  </>}
                  {" · "}
                  <button onClick={()=>toggleTimeline(s.id)} style={{background:"none",border:"none",color:"#0D9488",fontWeight:600,fontSize:10.5,cursor:"pointer",padding:0}}>🗺️ {openId===s.id?"hide timeline":"din ka timeline"}</button>
                </div>
                {s.out_reason&&<div style={{fontSize:10.5,color:T.t2,marginTop:2}}>📝 <b>Reason:</b> {s.out_reason}</div>}
              </div>
              <button disabled={acting===s.id} onClick={()=>act(s.id,"reject")}
                style={{padding:"5px 11px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>✕ Reject</button>
              <button disabled={acting===s.id} onClick={()=>act(s.id,"approve")}
                style={{padding:"5px 13px",borderRadius:6,background:"#0D9488",border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>{acting===s.id?"…":"✓ Approve"}</button>
            </div>
            {openId===s.id&&(
              <div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed #99F6E4"}}>
                {t&&t.loading?(
                  <div style={{fontSize:10.5,color:T.t4}}>Timeline load ho raha…</div>
                ):(t&&t.pings&&t.pings.length?(
                  <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:160,overflowY:"auto"}}>
                    <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:2}}>Us din ka GPS timeline ({t.pings.length} points):</div>
                    {t.pings.map((p,i)=>(
                      <div key={i} style={{fontSize:10,color:T.t3,fontFamily:"monospace",display:"flex",gap:8}}>
                        <span style={{color:T.t4}}>{p.ts?new Date(p.ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):("#"+(i+1))}</span>
                        <a href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" style={{color:"#0D9488",textDecoration:"none"}}>{Number(p.lat).toFixed(5)}, {Number(p.lng).toFixed(5)} ↗</a>
                      </div>
                    ))}
                  </div>
                ):(
                  <div style={{fontSize:10.5,color:T.t4}}>Koi GPS ping nahi mili is session me (sirf punch-in location upar map link me hai).</div>
                ))}
              </div>
            )}
          </div>
        );})}
      </div>
    </div>
  );
}

function MonthlyAttGrid({staff,att,setAtt,month,year,onAttChange,holidays=[],punchDays={}}){
  const daysInMonth=new Date(year,month+1,0).getDate();
  const now=new Date();const today=(now.getMonth()===month&&now.getFullYear()===year)?now.getDate():month<now.getMonth()||year<now.getFullYear()?daysInMonth:0;
  const ATT_COLORS={"P":{bg:"#ECFDF5",c:"#059669",label:"P"},"A":{bg:"#FEF2F2",c:"#DC2626",label:"A"},"H":{bg:"#FFFBEB",c:"#D97706",label:"H"},"L":{bg:"#EFF6FF",c:"#2563EB",label:"L"},null:{bg:T.surfaceB,c:T.t4,label:"·"}};

  // Build a day → holiday lookup for current month/year
  const holidayByDay={};
  holidays.forEach(h=>{
    const d=new Date(h.holiday_date);
    if(d.getMonth()===month&&d.getFullYear()===year){ holidayByDay[d.getDate()]=h; }
  });
  const isHolidayCell=(day)=>!!holidayByDay[day]&&!holidayByDay[day].is_optional;

  const toggleAtt=(empId,day)=>{
    if(day>today) return;
    if(isHolidayCell(day)) return;  // block toggle on confirmed holidays
    const cur=att[empId]?.[day];
    const cycle=["P","A","H","L"];
    const next=cur===null||!cycle.includes(cur)?"P":cycle[(cycle.indexOf(cur)+1)%cycle.length];
    setAtt(p=>({...p,[empId]:{...p[empId],[day]:next}}));
    if(onAttChange) onAttChange(empId,day,next);
  };

  const getStats=(empId)=>{
    const days=att[empId]||{};
    const P=Object.values(days).filter(v=>v==="P").length;
    const H=Object.values(days).filter(v=>v==="H").length;
    const A=Object.values(days).filter(v=>v==="A").length;
    const L=Object.values(days).filter(v=>v==="L").length;
    return{P,H,A,L,effective:P+(H*0.5)};
  };

  return(
    <div style={{overflowX:"auto"}}>
      {/* Days header */}
      <div style={{display:"flex",gap:0,marginBottom:4,paddingLeft:200}}>
        {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
          const isToday=d===today;
          const isFuture=d>today;
          const dow=new Date(year,month,d).getDay();
          const isSun=dow===0;
          const hol=holidayByDay[d];
          return(
            <div key={d} title={hol?hol.name+(hol.is_optional?" (Optional)":""):""}
              style={{width:28,flexShrink:0,textAlign:"center",fontSize:9.5,fontWeight:isToday?800:isSun||hol?600:400,color:isToday?T.blu:hol&&!hol.is_optional?T.red:hol?T.amb:isSun?T.red:isFuture?T.b2:T.t4,padding:"3px 0"}}>
              {d}
              {isSun&&!hol&&<div style={{width:4,height:4,borderRadius:"50%",background:isFuture?T.b2:T.red,margin:"1px auto 0"}}/>}
              {hol&&<div style={{width:4,height:4,borderRadius:"50%",background:hol.is_optional?T.amb:T.red,margin:"1px auto 0"}}/>}
            </div>
          );
        })}
        <div style={{width:100,textAlign:"center",fontSize:9.5,fontWeight:600,color:T.t4,padding:"3px 6px"}}>Summary</div>
      </div>

      {/* Staff rows */}
      {staff.map((emp,ei)=>{
        const st=getStats(emp.id);
        const deptColor=emp.dept==="Management"?T.pur:emp.dept==="Civil"?T.blu:emp.dept==="Design"?T.grn:emp.dept==="Electrical"?T.amb:T.slt;
        return(
          <div key={emp.id} style={{display:"flex",gap:0,marginBottom:3,alignItems:"center",background:ei%2===0?T.surface:T.surfaceB,borderRadius:6,padding:"4px 0"}}>
            {/* Name cell */}
            <div style={{width:200,flexShrink:0,display:"flex",alignItems:"center",gap:8,padding:"0 10px"}}>
              <Avatar name={emp.name} size={26} color={deptColor}/>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}</div>
                <div style={{fontSize:9.5,color:T.t4}}>{emp.role}</div>
              </div>
            </div>
            {/* Day cells */}
            {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
              const status=att[emp.id]?.[d];
              const sc=ATT_COLORS[status]||ATT_COLORS[null];
              const isFuture=d>today;
              const hol=holidayByDay[d];
              const isHolBlock=isHolidayCell(d);
              const cellBg=isHolBlock?"#FEE2E2":isFuture?"transparent":sc.bg;
              const cellColor=isHolBlock?T.red:isFuture?T.b2:sc.c;
              return(
                <div key={d}
                  onClick={()=>!isFuture&&!isHolBlock&&toggleAtt(emp.id,d)}
                  style={{position:"relative",width:28,height:28,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:cellBg,borderRadius:4,cursor:isFuture||isHolBlock?"default":"pointer",fontSize:9.5,fontWeight:700,color:cellColor,border:`1px solid ${isHolBlock?"#FCA5A5":isFuture?"transparent":sc.bg}`,transition:"all .1s",margin:"0 1px"}}
                  title={hol?`Holiday: ${hol.name}${hol.is_optional?" (Optional)":""}`:punchDays[emp.id]?.[d]?`${emp.name} - Day ${d} · 📍 GPS punch (mobile)`:`${emp.name} - Day ${d}`}>
                  {isHolBlock?"H":isFuture?"":sc.label}
                  {/* GPS-punch source badge — auto-Present from mobile punch */}
                  {!isFuture&&!isHolBlock&&punchDays[emp.id]?.[d]&&(
                    <span style={{position:"absolute",top:-1,right:0,fontSize:7,lineHeight:1}}>📍</span>
                  )}
                </div>
              );
            })}
            {/* Summary */}
            <div style={{width:100,flexShrink:0,padding:"0 6px",display:"flex",gap:5,alignItems:"center",justifyContent:"flex-end"}}>
              <span style={{fontSize:10,color:T.grn,fontWeight:700}}>{st.P}P</span>
              {st.H>0&&<span style={{fontSize:10,color:T.amb,fontWeight:700}}>{st.H}H</span>}
              {st.A>0&&<span style={{fontSize:10,color:T.red,fontWeight:700}}>{st.A}A</span>}
              <span style={{fontSize:10,color:T.t4}}>={st.effective}d</span>
            </div>
          </div>
        );
      })}

      {staff.length===0&&<EmptyState icon={<IcTeam size={32} color={T.b2}/>} message="No staff for attendance tracking" sub="Add monthly staff members first"/>}

      {/* Legend */}
      <div style={{display:"flex",gap:12,marginTop:10,padding:"6px 10px",background:T.surfaceB,borderRadius:6,width:"fit-content"}}>
        {[["P","Present",T.grn,T.grnL],["H","Half Day",T.amb,T.ambL],["A","Absent",T.red,T.redL],["L","Leave",T.blu,T.bluL]].map(([k,lbl,c,bg])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:18,height:18,borderRadius:4,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,fontWeight:700,color:c}}>{k}</div>
            <span style={{fontSize:10.5,color:T.t3}}>{lbl}</span>
          </div>
        ))}
        <div style={{fontSize:10.5,color:T.t4,borderLeft:`1px solid ${T.b1}`,paddingLeft:10}}>Click cell to toggle</div>
      </div>
    </div>
  );
}

// ── SALARY SLIP MODAL ─────────────────────────────────────────────
function SalarySlipModal({emp,att,month,year,onClose,paymentType,workingDays}){
  const WD=workingDays||26;
  const days=att[emp.id]||{};
  const P=Object.values(days).filter(v=>v==="P").length;
  const H=Object.values(days).filter(v=>v==="H").length;
  const A=Object.values(days).filter(v=>v==="A").length;
  const effective=P+(H*0.5);
  const fullGross=emp.basicSalary+emp.hra+emp.conveyance+emp.medical+emp.phone;
  const pType=paymentType||emp.paymentType||"fixed";
  const grossEarned=pType==="fixed"
    ? fullGross
    : Math.round((fullGross/WD)*effective);
  const pf=Math.round(emp.basicSalary*0.12);
  const esi=emp.basicSalary<=21000?Math.round(grossEarned*0.0075):0;
  const tds=grossEarned>15000?Math.round(grossEarned*0.05):0;
  const advDed=ADVANCE_DATA.find(a=>a.empId===emp.id&&a.status==="Pending deduction");
  const advDeduction=advDed?.amount||0;
  const totalDed=pf+esi+tds+advDeduction;
  const netPay=grossEarned-totalDed;
  const isAttBased=pType==="attendance";

  const printSlip=()=>{
    const w=window.open("","_blank","width=600,height=700");
    const calcRow = isAttBased
      ? "<tr><td>Calculation</td><td>\u20b9" + fmtN(fullGross) + " \u00f7 " + WD + " \u00d7 " + effective + " = \u20b9" + fmtN(grossEarned) + "</td></tr>"
      : "<tr><td>Calculation</td><td>Full monthly salary (attendance not deducted)</td></tr>";
    const salaryTypeColor = isAttBased ? "#7C3AED" : "#059669";
    const salaryTypeLabel = isAttBased ? "Attendance Based (Pro-rata)" : "Fixed Monthly Salary";
    const esiRow = esi > 0 ? "<tr><td>ESI (0.75%)</td><td>\u20b9" + fmtN(esi) + "</td></tr>" : "";
    const tdsRow = tds > 0 ? "<tr><td>TDS</td><td>\u20b9" + fmtN(tds) + "</td></tr>" : "";
    const advRow = advDeduction > 0 ? "<tr><td>Advance Recovery</td><td>\u20b9" + fmtN(advDeduction) + "</td></tr>" : "";
    w.document.write(`<html><head><title>Salary Slip</title>
    <style>*{font-family:Arial,sans-serif;font-size:12px}body{padding:20px}
    .header{background:#1565C0;color:white;padding:14px;border-radius:6px;margin-bottom:14px}
    table{width:100%;border-collapse:collapse}td,th{padding:7px 10px;border:1px solid #E5E7EB}
    th{background:#F8F9FB;font-weight:600}
    .net{background:#ECFDF5;font-size:15px;font-weight:800;color:#059669}
    </style></head><body>
    <div class="header"><h2 style="margin:0">Salary Slip</h2><p style="margin:4px 0 0">Month: ${MONTHS[month]} ${year}</p></div>
    <table><tr><th colspan="2">Employee Details</th></tr>
    <tr><td>Name</td><td><b>${emp.name}</b></td></tr>
    <tr><td>Employee ID</td><td>${emp.id}</td></tr>
    <tr><td>Designation</td><td>${emp.role}</td></tr>
    <tr><td>Department</td><td>${emp.dept}</td></tr>
    <tr><td>Bank A/C</td><td>${emp.bankAcc}</td></tr>
    <tr><td>IFSC</td><td>${emp.ifsc}</td></tr>
    <tr><th colspan="2">Attendance</th></tr>
    <tr><td>Salary Type</td><td><b style="color:${salaryTypeColor}">${salaryTypeLabel}</b></td></tr>
    <tr><td>Working Days</td><td>${WD}</td></tr>
    <tr><td>Present</td><td>${P} days (+ ${H} Half days)</td></tr>
    <tr><td>Effective Days</td><td>${effective}</td></tr>
    ${calcRow}
    <tr><th colspan="2">Earnings</th></tr>
    <tr><td>Basic Salary</td><td>&#8377;${fmtN(emp.basicSalary)}</td></tr>
    <tr><td>HRA</td><td>&#8377;${fmtN(emp.hra)}</td></tr>
    <tr><td>Conveyance</td><td>&#8377;${fmtN(emp.conveyance)}</td></tr>
    <tr><td>Medical Allowance</td><td>&#8377;${fmtN(emp.medical)}</td></tr>
    <tr><td>Phone Allowance</td><td>&#8377;${fmtN(emp.phone)}</td></tr>
    <tr><td><b>Gross Earned</b></td><td><b>&#8377;${fmtN(grossEarned)}</b></td></tr>
    <tr><th colspan="2">Deductions</th></tr>
    <tr><td>PF (12%)</td><td>&#8377;${fmtN(pf)}</td></tr>
    ${esiRow}${tdsRow}${advRow}
    <tr><td><b>Total Deductions</b></td><td><b>&#8377;${fmtN(totalDed)}</b></td></tr>
    <tr><td class="net"><b>NET PAY</b></td><td class="net"><b>&#8377;${fmtN(netPay)}</b></td></tr>
    </table><p style="margin-top:20px;font-size:10px;color:#6B7280">Generated by Payroll System &middot; ${new Date().toLocaleDateString("en-IN")}</p>
    </body></html>`);
    w.document.close();
    setTimeout(()=>w.print(),400);
  };

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(520px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{background:"#0D1B2A",padding:"13px 18px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <Avatar name={emp.name} size={38} color={T.blu}/>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>{emp.name}</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)"}}>{emp.id} · {emp.role} · {MONTHS[month]} {year}</div>
        </div>
        <button onClick={printSlip} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:6,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",color:"white",fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
          <IcPrint size={13} color="white"/> Print Slip
        </button>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
        {/* Attendance summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
          {[{l:"Present",v:P,c:T.grn},{l:"Half Day",v:H,c:T.amb},{l:"Absent",v:A,c:T.red},{l:"Effective",v:effective,c:T.blu}].map((s,i)=>(
            <div key={i} style={{padding:"9px 10px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,borderTop:`3px solid ${s.c}`,textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
              <div style={{fontSize:9.5,color:T.t4,marginTop:1}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Salary type info bar */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:isAttBased?T.purL:T.grnL,border:`1px solid ${isAttBased?T.purM:T.grnM}`,borderRadius:8,marginBottom:12}}>
          <div style={{width:9,height:9,borderRadius:"50%",background:isAttBased?T.pur:T.grn,flexShrink:0}}/>
          <div style={{flex:1}}>
            <span style={{fontSize:12,fontWeight:700,color:isAttBased?T.pur:T.grn}}>
              {isAttBased?"Attendance Based (Pro-rata)":"Fixed Monthly Salary"}
            </span>
            {isAttBased
              ?<span style={{fontSize:11,color:T.pur,marginLeft:8}}>
                ₹{fmtN(fullGross)} ÷ {WD} days × {effective} eff. days = ₹{fmtN(grossEarned)}
              </span>
              :<span style={{fontSize:11,color:T.grn,marginLeft:8}}>
                Full gross paid regardless of attendance ({P}P {H>0?`${H}H `:""}{A>0?`${A}A`:""})
              </span>
            }
          </div>
        </div>

        {/* Two column layout: Earnings | Deductions */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          {/* Earnings */}
          <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{padding:"8px 12px",background:T.grnL,borderBottom:`1px solid ${T.grnM}`}}>
              <span style={{fontSize:11,fontWeight:700,color:T.grn,textTransform:"uppercase",letterSpacing:".4px"}}>Earnings</span>
            </div>
            {[["Basic",emp.basicSalary],["HRA",emp.hra],["Conveyance",emp.conveyance],["Medical",emp.medical],emp.phone?["Phone",emp.phone]:null].filter(Boolean).map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",borderBottom:`1px solid ${T.b1}`}}>
                <span style={{fontSize:12,color:T.t2}}>{l}</span>
                <span style={{fontSize:12,fontWeight:500,color:T.t1}}>₹{fmtN(v)}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",background:T.grnL}}>
              <span style={{fontSize:12.5,fontWeight:700,color:T.grn}}>Gross</span>
              <span style={{fontSize:13,fontWeight:800,color:T.grn}}>₹{fmtN(grossEarned)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{padding:"8px 12px",background:T.redL,borderBottom:`1px solid ${T.redM}`}}>
              <span style={{fontSize:11,fontWeight:700,color:T.red,textTransform:"uppercase",letterSpacing:".4px"}}>Deductions</span>
            </div>
            {[[`PF (12%)`,pf],esi>0?[`ESI (0.75%)`,esi]:null,tds>0?[`TDS`,tds]:null,advDeduction>0?[`Advance`,advDeduction]:null].filter(Boolean).map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",borderBottom:`1px solid ${T.b1}`}}>
                <span style={{fontSize:12,color:T.t2}}>{l}</span>
                <span style={{fontSize:12,fontWeight:500,color:T.red}}>-₹{fmtN(v)}</span>
              </div>
            ))}
            {totalDed===0&&<div style={{padding:"7px 12px",fontSize:12,color:T.t4}}>No deductions</div>}
            <div style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",background:T.redL}}>
              <span style={{fontSize:12.5,fontWeight:700,color:T.red}}>Total Deductions</span>
              <span style={{fontSize:13,fontWeight:800,color:T.red}}>-₹{fmtN(totalDed)}</span>
            </div>
          </div>
        </div>

        {/* Net Pay */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:`linear-gradient(135deg,${T.grn}18,${T.grn}08)`,border:`2px solid ${T.grnM}`,borderRadius:10}}>
          <div>
            <div style={{fontSize:11,color:T.grn,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>Net Pay — {MONTHS[month]} {year}</div>
            <div style={{fontSize:11,color:T.t4}}>Bank: {emp.bankAcc} · IFSC: {emp.ifsc}</div>
          </div>
          <div style={{fontSize:26,fontWeight:800,color:T.grn}}>₹{fmtN(netPay)}</div>
        </div>
      </div>

      <div style={{padding:"11px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:7,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Close</button>
        <button onClick={printSlip} style={{flex:2,padding:"9px",borderRadius:7,background:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <IcPrint size={14} color="white"/> Print / Download Slip
        </button>
      </div>
    </div>
  </>);
}

// ── EDIT ATTENDANCE MODAL ─────────────────────────────────────────
function EditAttendanceModal({workers,att,month,year,onClose,onSubmitted}){
  const [stage,setStage]=useState("range"); // range → grid
  const ymd=(d,m,y)=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const [from,setFrom]=useState(ymd(1,month,year));
  const lastDay=new Date(year,month+1,0).getDate();
  const [to,setTo]=useState(ymd(Math.min(10,lastDay),month,year));
  const [edits,setEdits]=useState({}); // {wid:{day:{status,ot}}}
  const [reason,setReason]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [err,setErr]=useState("");

  const fromD=Number(from.split("-")[2]||1);
  const toD=Number(to.split("-")[2]||1);
  const days=Array.from({length:Math.max(0,toD-fromD+1)},(_,i)=>fromD+i);

  const cur=(wid,d)=>edits[wid]?.[d]?.status ?? (att[wid]?.[d]?.status || "");
  const orig=(wid,d)=>att[wid]?.[d]?.status || "";
  const setCell=(wid,d,val)=>{
    setEdits(p=>{
      const cp={...p,[wid]:{...(p[wid]||{}),[d]:{...(p[wid]?.[d]||{}),status:val}}};
      // Drop cell if matches original (no edit needed)
      if (val === orig(wid,d)) { delete cp[wid][d]; if (!Object.keys(cp[wid]).length) delete cp[wid]; }
      return cp;
    });
  };

  const collectChanges=()=>{
    const out=[];
    for (const wid of Object.keys(edits)) {
      const w=workers.find(x=>String(x.id)===String(wid));
      if (!w) continue;
      for (const d of Object.keys(edits[wid])) {
        const ns=edits[wid][d].status;
        const os=att[wid]?.[d]?.status || "";
        if (ns===os) continue;
        out.push({
          worker_id:Number(wid),
          worker_name:w.name,
          date:ymd(Number(d),month,year),
          old_status:os||null,
          new_status:ns,
          old_ot:Number(att[wid]?.[d]?.ot)||0,
          new_ot:0,
        });
      }
    }
    return out;
  };

  const submit=async()=>{
    setErr("");
    const changes=collectChanges();
    if (!changes.length) { setErr("Koi change nahi mila"); return; }
    if (!reason.trim()) { setErr("Reason zaroori hai"); return; }
    setSubmitting(true);
    try{
      const r=await api.post("/payroll/attendance-edit-requests",{date_from:from,date_to:to,changes,reason:reason.trim()});
      if (r.success) { onSubmitted?.(); onClose(); }
      else setErr(r.message||"Submit failed");
    }catch(e){ setErr(e.message); }
    setSubmitting(false);
  };

  const STATUSES=[["P","Present",T.grn],["A","Absent",T.red],["H","Half",T.amb]];
  const changeCount=collectChanges().length;

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,width:"min(900px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.3)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{padding:"14px 18px",background:"#0D1B2A",color:"white",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:14,fontWeight:700}}>✏️ Edit Attendance — Bulk Request</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}>Changes go to admin for approval</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:18,cursor:"pointer"}}>×</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        {stage==="range"&&(
          <div>
            <div style={{fontSize:12,color:T.t3,marginBottom:10}}>Step 1 — Date range select karo (us range ke worker × day cells edit hone ke liye open honge)</div>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14}}>
              <label style={{fontSize:12,color:T.t2,fontWeight:600}}>From</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{padding:"6px 10px",border:`1.5px solid ${T.b1}`,borderRadius:6,fontSize:12,fontFamily:"inherit"}}/>
              <label style={{fontSize:12,color:T.t2,fontWeight:600}}>To</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{padding:"6px 10px",border:`1.5px solid ${T.b1}`,borderRadius:6,fontSize:12,fontFamily:"inherit"}}/>
              <button onClick={()=>{ if (fromD>toD) { setErr("From date To date se pehle honi chahiye"); return; } setErr(""); setStage("grid"); }}
                style={{marginLeft:"auto",padding:"7px 16px",borderRadius:7,background:T.blu,color:"white",border:"none",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>
                Next → Edit Cells
              </button>
            </div>
            {err&&<div style={{fontSize:12,color:T.red,fontWeight:600}}>{err}</div>}
          </div>
        )}

        {stage==="grid"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:12,color:T.t3}}>Step 2 — Cells me dropdown se status badlo. {changeCount>0&&<span style={{color:T.amb,fontWeight:700}}>{changeCount} changes</span>}</div>
              <button onClick={()=>setStage("range")} style={{padding:"5px 11px",borderRadius:6,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:11.5,color:T.t3,cursor:"pointer"}}>← Back</button>
            </div>
            <div style={{overflowX:"auto",border:`1px solid ${T.b1}`,borderRadius:7,maxHeight:300}}>
              <table style={{borderCollapse:"collapse",fontSize:11.5,width:"100%"}}>
                <thead style={{background:T.surfaceB,position:"sticky",top:0}}>
                  <tr>
                    <th style={{padding:"7px 10px",textAlign:"left",borderBottom:`1px solid ${T.b1}`,minWidth:160}}>Worker</th>
                    {days.map(d=><th key={d} style={{padding:"7px 4px",textAlign:"center",borderBottom:`1px solid ${T.b1}`,minWidth:62}}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {workers.map(w=>(
                    <tr key={w.id} style={{borderBottom:`1px solid ${T.b1}`}}>
                      <td style={{padding:"5px 10px",fontWeight:600,color:T.t1}}>{w.name}<div style={{fontSize:9.5,color:T.t4,fontWeight:400}}>{w.trade}</div></td>
                      {days.map(d=>{
                        const c=cur(w.id,d), o=orig(w.id,d), changed=c!==o;
                        return(
                          <td key={d} style={{padding:"3px 2px",textAlign:"center",background:changed?T.ambL:"transparent"}}>
                            <select value={c} onChange={e=>setCell(w.id,d,e.target.value)}
                              style={{padding:"3px 4px",fontSize:11,border:`1px solid ${changed?T.amb:T.b1}`,borderRadius:4,background:"white",cursor:"pointer",fontFamily:"inherit",width:54}}>
                              <option value="">—</option>
                              {STATUSES.map(([s,l])=><option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:14}}>
              <label style={{fontSize:12,color:T.t2,fontWeight:600,display:"block",marginBottom:5}}>Reason for change (admin ko dikhega)</label>
              <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2} placeholder="Eg: Site visit verified — Dinesh was actually present"
                style={{width:"100%",padding:"7px 10px",border:`1.5px solid ${T.b1}`,borderRadius:6,fontSize:12,fontFamily:"inherit",resize:"vertical"}}/>
            </div>
            {err&&<div style={{fontSize:12,color:T.red,fontWeight:600,marginTop:6}}>{err}</div>}
          </div>
        )}
      </div>

      {stage==="grid"&&(
        <div style={{padding:"11px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"8px 16px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
          <button onClick={submit} disabled={submitting||changeCount===0}
            style={{padding:"8px 18px",borderRadius:6,background:changeCount>0?T.blu:T.b2,color:"white",border:"none",fontSize:12.5,fontWeight:700,cursor:changeCount>0?"pointer":"not-allowed"}}>
            {submitting?"Sending…":`Send for Approval (${changeCount})`}
          </button>
        </div>
      )}
    </div>
  </>);
}

// ── PENDING APPROVALS DRAWER (admin) ──────────────────────────────
function ApprovalQueueModal({onClose,onProcessed,isAdmin}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [actingId,setActingId]=useState(null);
  const [notes,setNotes]=useState({});
  const load=async()=>{
    setLoading(true);
    try{ const r=await api.get("/payroll/attendance-edit-requests?status=pending"); if(r.success) setItems(r.data||[]); }catch(_){}
    setLoading(false);
  };
  useEffect(()=>{load();},[]);
  const act=async(id,status)=>{
    setActingId(id);
    try{
      const r=await api.patch(`/payroll/attendance-edit-requests/${id}`,{status,approval_notes:notes[id]||null});
      if(r.success){ setItems(p=>p.filter(x=>x.id!==id)); onProcessed?.(); }
    }catch(_){}
    setActingId(null);
  };
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,width:"min(800px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.3)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{padding:"14px 18px",background:"#0D1B2A",color:"white",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:14,fontWeight:700}}>📋 Attendance Edit Approvals ({items.length} pending)</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:18,cursor:"pointer"}}>×</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        {loading&&<div style={{textAlign:"center",color:T.t4,padding:30}}>Loading…</div>}
        {!loading&&items.length===0&&<div style={{textAlign:"center",color:T.t4,padding:30}}>Koi pending request nahi</div>}
        {items.map(req=>(
          <div key={req.id} style={{border:`1px solid ${T.b1}`,borderRadius:8,padding:12,marginBottom:12,background:T.surfaceB}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:T.t1}}>Request #{req.id} · {req.changes?.length||0} changes</div>
                <div style={{fontSize:11,color:T.t4}}>By {req.requester_name||"User"} · {new Date(req.requested_at).toLocaleString("en-IN")}</div>
                <div style={{fontSize:11,color:T.t3,marginTop:3}}>Range: {String(req.date_from).split("T")[0]} → {String(req.date_to).split("T")[0]}</div>
              </div>
            </div>
            {req.reason&&<div style={{fontSize:11.5,color:T.t2,padding:"6px 10px",background:T.surface,borderLeft:`3px solid ${T.amb}`,borderRadius:4,marginBottom:8}}><b>Reason:</b> {req.reason}</div>}
            <div style={{maxHeight:140,overflowY:"auto",border:`1px solid ${T.b1}`,borderRadius:6,background:T.surface,marginBottom:8}}>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                <thead><tr style={{background:T.surfaceB}}><th style={{padding:"5px 8px",textAlign:"left"}}>Worker</th><th style={{padding:"5px 8px"}}>Date</th><th style={{padding:"5px 8px"}}>Old → New</th></tr></thead>
                <tbody>
                  {(req.changes||[]).map((c,i)=>(
                    <tr key={i} style={{borderTop:`1px solid ${T.b1}`}}>
                      <td style={{padding:"4px 8px",color:T.t1}}>{c.worker_name}</td>
                      <td style={{padding:"4px 8px",textAlign:"center",color:T.t3}}>{String(c.date).split("T")[0]}</td>
                      <td style={{padding:"4px 8px",textAlign:"center"}}><span style={{color:T.t4}}>{c.old_status||"—"}</span> → <span style={{color:T.grn,fontWeight:700}}>{c.new_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isAdmin&&(<>
              <input value={notes[req.id]||""} onChange={e=>setNotes(p=>({...p,[req.id]:e.target.value}))} placeholder="Note (optional)"
                style={{width:"100%",padding:"6px 10px",border:`1px solid ${T.b1}`,borderRadius:5,fontSize:11.5,marginBottom:6,fontFamily:"inherit"}}/>
              <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                <button disabled={actingId===req.id} onClick={()=>act(req.id,"rejected")} style={{padding:"6px 14px",borderRadius:6,background:T.redL,border:`1px solid ${T.red}`,color:T.red,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>✕ Reject</button>
                <button disabled={actingId===req.id} onClick={()=>act(req.id,"approved")} style={{padding:"6px 14px",borderRadius:6,background:T.grn,border:"none",color:"white",fontSize:11.5,fontWeight:700,cursor:"pointer"}}>{actingId===req.id?"…":"✓ Approve"}</button>
              </div>
            </>)}
            {!isAdmin&&<div style={{fontSize:11,color:T.t4,fontStyle:"italic"}}>Awaiting admin approval</div>}
          </div>
        ))}
      </div>
    </div>
  </>);
}

// ── DAILY WAGES SECTION ───────────────────────────────────────────
function DailyWagesTab({workers,att,setAtt,selProject,setSelProject,month,year,onDailyAttChange,isAdmin,onResync}){
  const [selWorker,setSelWorker]=useState(null);
  const [view,setView]=useState("grid");
  const [syncing,setSyncing]=useState(false);
  const [syncMsg,setSyncMsg]=useState("");
  const [showEditModal,setShowEditModal]=useState(false);
  const [showApprovalModal,setShowApprovalModal]=useState(false);
  const [pendingCount,setPendingCount]=useState(0);
  const loadPendingCount=useCallback(async()=>{
    try{ const r=await api.get("/payroll/attendance-edit-requests?status=pending"); if(r.success) setPendingCount((r.data||[]).length); }catch(_){}
  },[]);
  useEffect(()=>{loadPendingCount();},[loadPendingCount]);
  const doResync=async()=>{
    setSyncing(true);setSyncMsg("");
    try{
      const r=await api.post("/projects/sync-attendance-to-payroll",{});
      if(r.success){
        setSyncMsg(`✓ Synced ${r.data?.synced||0} entries`);
        if(onResync) await onResync();
      } else setSyncMsg("Sync failed: "+(r.message||"unknown"));
    }catch(e){setSyncMsg("Sync error: "+e.message);}
    setSyncing(false);
    setTimeout(()=>setSyncMsg(""),4000);
  };
  const now=new Date();const today=(now.getMonth()===month&&now.getFullYear()===year)?now.getDate():month<now.getMonth()||year<now.getFullYear()?new Date(year,month+1,0).getDate():0;

  const filteredWorkers=selProject==="All"?workers:workers.filter(w=>w.project===selProject||w.project==="Multiple"||w.project===null);

  const calcWorkerPay=(w)=>{
    const days=att[w.id]||{};
    let total=0,presentDays=0,otHours=0;
    Object.entries(days).forEach(([d,v])=>{
      if(!v) return;
      if(v.status==="P"){total+=w.ratePerDay+(v.ot||0)*w.rateOT;presentDays++;otHours+=v.ot||0;}
      else if(v.status==="H"){total+=w.ratePerDay/2;presentDays+=0.5;}
    });
    return{total,presentDays,otHours};
  };

  const toggleDailyAtt=(wId,day,field,val)=>{
    setAtt(p=>{
      const cur=p[wId]?.[day]||{status:"A",ot:0};
      const updated={...cur,[field]:val};
      if(onDailyAttChange) onDailyAttChange(wId,day,updated.status,updated.ot||0);
      return{...p,[wId]:{...p[wId],[day]:updated}};
    });
  };

  const cycleDayStatus=(wId,day)=>{
    if(day>today) return;
    const cur=(att[wId]?.[day]?.status)||"A";
    const cycle=["P","H","A"];
    const next=cycle[(cycle.indexOf(cur)+1)%cycle.length];
    toggleDailyAtt(wId,day,"status",next);
  };

  const ATT_C={"P":{bg:T.grnL,c:T.grn},"H":{bg:T.ambL,c:T.amb},"A":{bg:T.redL,c:T.red}};

  const totalPayable=filteredWorkers.reduce((s,w)=>s+calcWorkerPay(w).total,0);

  return(
    <div>
      {/* Controls */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        <select value={selProject} onChange={e=>setSelProject(e.target.value)}
          style={{height:32,padding:"0 10px",borderRadius:7,border:`1.5px solid ${selProject!=="All"?T.blu:T.b1}`,background:selProject!=="All"?T.bluL:T.surface,fontSize:12,color:selProject!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
          <option value="All">All Projects</option>
          {PROJECTS.map(p=><option key={p}>{p}</option>)}
        </select>
        <div style={{display:"flex",gap:2,background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,padding:3}}>
          {[["grid","List View"],["worker","Worker View"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setView(id)}
              style={{padding:"4px 10px",borderRadius:5,border:"none",background:view===id?T.blu:"none",color:view===id?"white":T.t3,fontSize:11.5,fontWeight:view===id?700:400,cursor:"pointer"}}>
              {lbl}
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>{
            const headers=["Worker","Trade","Project","Rate/Day","Rate OT","Days Present","OT Hours","Total Pay"];
            const rows=filteredWorkers.map(w=>{const c=calcWorkerPay(w);return[w.name,w.trade,w.project,w.ratePerDay,w.rateOT,c.presentDays,c.otHours,c.total];});
            exportCSV(headers,rows,`Daily_Wages_${MONTHS[month]}_${year}.csv`);
          }} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:T.sltL,border:`1px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <IcDown size={12} color={T.t2}/> Export
          </button>
          <button onClick={doResync} disabled={syncing} title="Re-sync from project attendance"
            style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:syncing?T.sltL:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:12,fontWeight:600,cursor:syncing?"wait":"pointer"}}>
            {syncing?"⏳ Syncing…":"🔄 Re-sync"}
          </button>
          <button onClick={()=>setShowEditModal(true)} title="Bulk edit attendance — sends to admin for approval"
            style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            ✏️ Edit Attendance
          </button>
          <button onClick={()=>setShowApprovalModal(true)} title="View pending approvals"
            style={{position:"relative",display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:T.purL,border:`1px solid ${T.purM}`,color:T.pur,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            📋 Approvals
            {pendingCount>0&&<span style={{position:"absolute",top:-5,right:-5,background:T.red,color:"white",fontSize:9.5,fontWeight:700,padding:"1px 5px",borderRadius:9,minWidth:14,textAlign:"center"}}>{pendingCount}</span>}
          </button>
          {syncMsg&&<span style={{fontSize:11,color:syncMsg.startsWith("✓")?T.grn:T.red,fontWeight:600}}>{syncMsg}</span>}
          <div style={{padding:"6px 13px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:7}}>
            <span style={{fontSize:11,color:T.grn,fontWeight:600}}>Total Payable (till today): </span>
            <span style={{fontSize:14,fontWeight:800,color:T.grn}}>₹{fmtN(totalPayable)}</span>
          </div>
        </div>
      </div>

      {filteredWorkers.length===0&&<EmptyState icon={<IcTeam size={32} color={T.b2}/>} message="No daily workers found" sub={selProject!=="All"?`No workers for project "${selProject}"`:"Add daily wage workers to track attendance"}/>}

      {/* GRID VIEW — calendar grid for each worker */}
      {view==="grid"&&(()=>{
        const daysInMonth=new Date(year,month+1,0).getDate();
        const dowOf=(d)=>new Date(year,month,d).getDay(); // 0=Sun, 6=Sat
        const cellMargin=(d)=>dowOf(d)===0 && d!==1 ? "0 0.5px 0 10px" : "0 0.5px"; // wider gap before each Sunday
        const cellTint=(d)=>{const dow=dowOf(d);return dow===0?T.redL:dow===6?T.surfaceB:"transparent";};
        return(
        <div style={{overflowX:"auto"}}>
          {/* Week markers */}
          <div style={{display:"flex",paddingLeft:180,marginBottom:1,fontSize:8.5,color:T.t4,fontWeight:600}}>
            {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
              const dow=dowOf(d);
              const isSunStart=dow===0||d===1;
              return <div key={d} style={{width:32,flexShrink:0,textAlign:"center",margin:cellMargin(d)}}>{isSunStart?`Wk${Math.ceil((d+dowOf(1))/7)}`:""}</div>;
            })}
          </div>
          {/* Days header */}
          <div style={{display:"flex",marginBottom:3,paddingLeft:180}}>
            {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
              const dow=dowOf(d);
              const dowLetter=["S","M","T","W","T","F","S"][dow];
              const isWeekend=dow===0||dow===6;
              return(
                <div key={d} style={{width:32,flexShrink:0,textAlign:"center",fontSize:9.5,fontWeight:d===today?700:isWeekend?600:400,color:d===today?T.blu:dow===0?T.red:isWeekend?T.t3:T.t4,margin:cellMargin(d),background:cellTint(d),borderRadius:3,padding:"1px 0"}}>
                  <div>{d}</div>
                  <div style={{fontSize:7.5,opacity:.7,marginTop:-1}}>{dowLetter}</div>
                </div>
              );
            })}
            <div style={{width:70,textAlign:"center",fontSize:9.5,color:T.t4,paddingLeft:4}}>Days</div>
            <div style={{width:50,textAlign:"center",fontSize:9.5,color:T.t4}}>OT Hrs</div>
            <div style={{width:80,textAlign:"right",fontSize:9.5,color:T.t4,paddingRight:4}}>Pay (₹)</div>
          </div>

          {filteredWorkers.map((w,wi)=>{
            const {total,presentDays,otHours}=calcWorkerPay(w);
            return(
              <div key={w.id} style={{display:"flex",alignItems:"center",marginBottom:3,background:wi%2===0?T.surface:T.surfaceB,borderRadius:6,padding:"3px 0"}}>
                {/* Name */}
                <div style={{width:180,flexShrink:0,padding:"0 9px",cursor:"pointer"}} onClick={()=>setSelWorker(selWorker?.id===w.id?null:w)}>
                  <div style={{fontSize:12,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{w.name}</div>
                  <div style={{fontSize:9.5,color:T.t4}}>{w.trade} · ₹{fmtN(w.ratePerDay)}/day</div>
                </div>

                {/* Day cells */}
                {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
                  const dayAtt=att[w.id]?.[d];
                  const status=dayAtt?.status||"A";
                  const sc=ATT_C[status]||ATT_C["A"];
                  return(
                    <div key={d}
                      style={{width:32,height:28,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:sc.bg,borderRadius:4,fontSize:9.5,fontWeight:700,color:sc.c,border:`1px solid transparent`,margin:cellMargin(d)}}
                      title={`${w.name} Day ${d}: ${status} — Use ✏️ Edit Attendance to change`}>
                      {status}
                    </div>
                  );
                })}

                {/* Stats */}
                <div style={{width:70,flexShrink:0,textAlign:"center",fontSize:11.5,fontWeight:600,color:T.grn}}>{presentDays}</div>
                <div style={{width:50,flexShrink:0,textAlign:"center"}}>
                  {otHours>0?<span style={{fontSize:11,color:T.pur,fontWeight:600}}>{otHours}h</span>:<span style={{fontSize:11,color:T.t4}}>—</span>}
                </div>
                <div style={{width:80,flexShrink:0,textAlign:"right",paddingRight:8,fontSize:13,fontWeight:700,color:T.t1}}>₹{fmtN(total)}</div>
              </div>
            );
          })}

          {/* Hint */}
          <div style={{marginTop:8,fontSize:10.5,color:T.t4,padding:"5px 10px",background:T.surfaceB,borderRadius:5,display:"inline-block"}}>
            Sun-Sat weekly grouping · Direct edit disabled — Click ✏️ Edit Attendance for bulk edit (admin approval) · OT → click worker name
          </div>
        </div>
        );})()}

      {/* WORKER VIEW — detailed per worker */}
      {view==="worker"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
          {filteredWorkers.map(w=>{
            const {total,presentDays,otHours}=calcWorkerPay(w);
            const isSelected=selWorker?.id===w.id;
            return(
              <div key={w.id}
                onClick={()=>setSelWorker(isSelected?null:w)}
                style={{background:T.surface,borderRadius:9,border:`1.5px solid ${isSelected?T.blu:T.b1}`,padding:"12px 14px",cursor:"pointer",transition:"all .15s",boxShadow:isSelected?"0 0 0 3px rgba(37,99,235,0.1)":"0 1px 3px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{w.name}</div>
                    <div style={{fontSize:11,color:T.t4}}>{w.trade} · {w.project}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:9.5,color:T.t4}}>Rate/Day</div>
                    <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>₹{fmtN(w.ratePerDay)}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                  {[{l:"Days",v:presentDays,c:T.grn},{l:"OT Hrs",v:otHours||"—",c:T.pur},{l:"Payable",v:`₹${fmtN(total)}`,c:T.blu}].map((s,i)=>(
                    <div key={i} style={{padding:"6px 8px",background:T.surfaceB,borderRadius:5,textAlign:"center"}}>
                      <div style={{fontSize:11.5,fontWeight:700,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:9,color:T.t4,marginTop:1}}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Mini attendance strip */}
                <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
                  {Array.from({length:new Date(year,month+1,0).getDate()},(_,i)=>i+1).map(d=>{
                    const status=att[w.id]?.[d]?.status||"A";
                    const c=status==="P"?T.grn:status==="H"?T.amb:T.red;
                    return<div key={d} style={{width:14,height:14,borderRadius:3,background:c+"33",border:`1px solid ${c}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:c}}>{d}</div>;
                  })}
                </div>

                {/* Expanded OT editor */}
                {isSelected&&(
                  <div style={{marginTop:10,padding:"10px 11px",background:T.purL,border:`1px solid ${T.purM}`,borderRadius:7}} onClick={e=>e.stopPropagation()}>
                    <div style={{fontSize:10.5,fontWeight:700,color:T.pur,marginBottom:7}}>OT Hours per day (rate: ₹{w.rateOT}/hr)</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {Array.from({length:new Date(year,month+1,0).getDate()},(_,i)=>i+1).map(d=>{
                        const dayAtt=att[w.id]?.[d];
                        if(!dayAtt||dayAtt.status!=="P") return null;
                        return(
                          <div key={d} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                            <div style={{fontSize:9,color:T.pur}}>D{d}</div>
                            <input type="number" min={0} max={4} value={dayAtt.ot||0}
                              onChange={e=>toggleDailyAtt(w.id,d,"ot",Number(e.target.value))}
                              style={{width:30,height:22,borderRadius:4,border:`1px solid ${T.purM}`,background:"white",textAlign:"center",fontSize:10.5,outline:"none",fontFamily:"inherit"}}/>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showEditModal&&<EditAttendanceModal workers={filteredWorkers} att={att} month={month} year={year}
        onClose={()=>setShowEditModal(false)}
        onSubmitted={()=>{loadPendingCount();setSyncMsg("✓ Request sent for approval");setTimeout(()=>setSyncMsg(""),4000);}}/>}
      {showApprovalModal&&<ApprovalQueueModal isAdmin={isAdmin}
        onClose={()=>setShowApprovalModal(false)}
        onProcessed={()=>{loadPendingCount(); if(onResync) onResync();}}/>}
    </div>
  );
}

// ── EDIT STAFF MASTER MODAL (Payroll v2 — Phase 2) ──────────────
// Admin can edit personal, salary structure, PF/ESIC config from here.
// All fields map to columns on payroll_staff. Saves via PATCH /payroll/staff/:id.
function EditStaffModal({emp,onClose,onSaved}){
  const [form,setForm]=useState({
    name:        emp.name||"",
    phone:       emp.mobile||"",
    email:       emp.email||"",
    aadhaar:     emp.aadhaar||"",
    role:        emp.role||"",
    dept:        emp.dept||"",
    salary_enabled: emp.salaryEnabled===false?0:1,
    payment_type:emp.paymentType||"fixed",
    basic_salary:    emp.basicSalary||0,
    hra:             emp.hra||0,
    conveyance:      emp.conveyance||0,
    medical:         emp.medical||0,
    phone_allowance: emp.phoneAllowance||emp.phone||0,
    petrol_allowance: emp.petrolAllowance||0,
    special_allowance:emp.specialAllowance||0,
    pf_applicable:    emp.pfApplicable!==false,
    pf_method:        emp.pfMethod||"capped_15k",
    pf_custom_amount: emp.pfCustomAmount||0,
    pf_uan:           emp.pfUan||"",
    esic_applicable:  emp.esicApplicable!==false,
    esic_number:      emp.esicNumber||"",
    bank_acc:         emp.bankAcc||"",
    ifsc:             emp.ifsc||"",
    pan:              emp.pan||"",
  });
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const save=async()=>{
    setSaving(true); setErr("");
    try{
      const r=await api.patch(`/payroll/staff/${emp.id}`,form);
      if(r.success){ onSaved&&onSaved(r.data); onClose(); }
      else setErr(r.message||"Save failed");
    }catch(e){ setErr(e.message||"Network error"); }
    setSaving(false);
  };
  const Sect=({title,children})=>(
    <div style={{marginBottom:14}}>
      <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${T.b1}`}}>{title}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{children}</div>
    </div>
  );
  const F=({label,children,full})=>(
    <div style={full?{gridColumn:"1 / -1"}:{}}>
      <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{label}</div>
      {children}
    </div>
  );
  const inp={width:"100%",padding:"5px 8px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface};
  return(
    <div onClick={()=>!saving&&onClose()}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.surface,borderRadius:12,width:560,maxWidth:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:T.t1}}>Edit Staff Master</div>
            <div style={{fontSize:11,color:T.t4,marginTop:2}}>{emp.name} · ID {emp.id}</div>
          </div>
          <button onClick={()=>!saving&&onClose()} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.t4}}>
            <IcX size={18}/>
          </button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
          <Sect title="Personal">
            <F label="Name"><input style={inp} value={form.name} onChange={e=>set("name",e.target.value)}/></F>
            <F label="Mobile"><input style={inp} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="10-digit"/></F>
            <F label="Email"><input style={inp} value={form.email} onChange={e=>set("email",e.target.value)}/></F>
            <F label="Aadhaar"><input style={inp} value={form.aadhaar} onChange={e=>set("aadhaar",e.target.value)} placeholder="12-digit"/></F>
            <F label="Role / Designation"><input style={inp} value={form.role} onChange={e=>set("role",e.target.value)}/></F>
            <F label="Department"><input style={inp} value={form.dept} onChange={e=>set("dept",e.target.value)}/></F>
          </Sect>
          <Sect title="Salary — Earnings (₹/month)">
            <F label="Basic"><input style={inp} type="number" value={form.basic_salary} onChange={e=>set("basic_salary",Number(e.target.value)||0)}/></F>
            <F label="HRA"><input style={inp} type="number" value={form.hra} onChange={e=>set("hra",Number(e.target.value)||0)}/></F>
            <F label="Conveyance"><input style={inp} type="number" value={form.conveyance} onChange={e=>set("conveyance",Number(e.target.value)||0)}/></F>
            <F label="Medical"><input style={inp} type="number" value={form.medical} onChange={e=>set("medical",Number(e.target.value)||0)}/></F>
            <F label="Phone Allowance"><input style={inp} type="number" value={form.phone_allowance} onChange={e=>set("phone_allowance",Number(e.target.value)||0)}/></F>
            <F label="Petrol Allowance"><input style={inp} type="number" value={form.petrol_allowance} onChange={e=>set("petrol_allowance",Number(e.target.value)||0)}/></F>
            <F label="Special Allowance" full><input style={inp} type="number" value={form.special_allowance} onChange={e=>set("special_allowance",Number(e.target.value)||0)}/></F>
          </Sect>
          <Sect title="PF Configuration">
            <F label="PF Applicable">
              <select style={inp} value={form.pf_applicable?"yes":"no"} onChange={e=>set("pf_applicable",e.target.value==="yes")}>
                <option value="yes">Yes</option><option value="no">No</option>
              </select>
            </F>
            <F label="Calculation Method">
              <select style={inp} value={form.pf_method} onChange={e=>set("pf_method",e.target.value)} disabled={!form.pf_applicable}>
                <option value="none">None (₹0)</option>
                <option value="capped_15k">Capped at ₹15,000 — 12% of min(basic, 15k)</option>
                <option value="full_basic">Full Basic — 12% of full basic</option>
                <option value="custom">Custom fixed amount</option>
              </select>
            </F>
            {form.pf_method==="custom"&&form.pf_applicable&&(
              <F label="Custom PF Amount (₹)"><input style={inp} type="number" value={form.pf_custom_amount} onChange={e=>set("pf_custom_amount",Number(e.target.value)||0)}/></F>
            )}
            <F label="UAN" full={form.pf_method!=="custom"}><input style={inp} value={form.pf_uan} onChange={e=>set("pf_uan",e.target.value)}/></F>
          </Sect>
          <Sect title="ESIC Configuration">
            <F label="ESIC Applicable">
              <select style={inp} value={form.esic_applicable?"yes":"no"} onChange={e=>set("esic_applicable",e.target.value==="yes")}>
                <option value="yes">Yes (auto if gross ≤ ₹21k)</option><option value="no">No</option>
              </select>
            </F>
            <F label="ESIC Number"><input style={inp} value={form.esic_number} onChange={e=>set("esic_number",e.target.value)}/></F>
          </Sect>
          <Sect title="Bank Details">
            <F label="Bank Account Number"><input style={inp} value={form.bank_acc} onChange={e=>set("bank_acc",e.target.value)}/></F>
            <F label="IFSC"><input style={inp} value={form.ifsc} onChange={e=>set("ifsc",e.target.value)}/></F>
            <F label="PAN" full><input style={inp} value={form.pan} onChange={e=>set("pan",e.target.value)}/></F>
          </Sect>
          <Sect title="Payment Mode">
            <F label="Salary Tracking" full>
              <div style={{display:"flex",gap:8}}>
                {[{v:1,l:"✓ Salary ON",sub:"appears in Monthly Salary"},{v:0,l:"Salary OFF",sub:"attendance only (app user)"}].map(o=>(
                  <button key={o.v} type="button" onClick={()=>set("salary_enabled",o.v)}
                    style={{flex:1,padding:"9px 11px",borderRadius:8,border:`1.5px solid ${form.salary_enabled===o.v?(o.v?T.grn:T.amb):T.b1}`,background:form.salary_enabled===o.v?(o.v?T.grnL:T.ambL):T.surface,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:form.salary_enabled===o.v?(o.v?T.grn:T.amb):T.t2}}>{o.l}</div>
                    <div style={{fontSize:10,color:T.t4,marginTop:1}}>{o.sub}</div>
                  </button>
                ))}
              </div>
            </F>
            {!!form.salary_enabled && <F label="Type" full>
              <select style={inp} value={form.payment_type} onChange={e=>set("payment_type",e.target.value)}>
                <option value="fixed">Fixed (full month salary regardless of attendance)</option>
                <option value="attendance">Attendance-based (pro-rated by P/H days)</option>
              </select>
            </F>}
          </Sect>
        </div>
        <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          {err&&<span style={{flex:1,fontSize:11.5,color:T.red}}>{err}</span>}
          {!err&&<span style={{flex:1}}/>}
          <button onClick={()=>!saving&&onClose()} disabled={saving}
            style={{padding:"7px 16px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,color:T.t3,fontSize:12,fontWeight:600,cursor:saving?"not-allowed":"pointer"}}>Cancel</button>
          <button onClick={save} disabled={saving}
            style={{padding:"7px 18px",borderRadius:7,background:saving?T.t4:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer"}}>
            {saving?"Saving…":"Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ADD STAFF MODAL (Payroll v2 patch) ───────────────────────────
// Adds a staff member to Monthly Salary. Fetches from the Party
// Library — same search-existing-staff UX as Settings → Users. If a
// library party is picked, name/designation come from it and the row
// links via party_id. If a new name is typed (not in library), a
// staff-party is created first, then the payroll row links to it.
function AddStaffModal({onClose,onSaved}){
  const [staffSearch,setStaffSearch]=useState("");
  const [results,setResults]=useState([]);
  const [picked,setPicked]=useState(null);   // {party_id,name,designation,...} or null
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const [form,setForm]=useState({
    name:"", designation:"", phone:"", staff_subtype:"office",
    payment_type:"fixed",
    basic_salary:0, hra:0, conveyance:0, medical:0, phone_allowance:0,
    petrol_allowance:0, special_allowance:0,
    pf_applicable:true, pf_method:"capped_15k", pf_custom_amount:0,
    esic_applicable:true,
  });
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  // Debounced library search
  useEffect(()=>{
    if(picked){ setResults([]); return; }
    const q=staffSearch.trim();
    if(!q){ setResults([]); return; }
    let cancelled=false;
    const t=setTimeout(async()=>{
      try{
        const r=await api.get("/payroll/library-staff?q="+encodeURIComponent(q));
        if(!cancelled&&r.success) setResults(r.data||[]);
      }catch(e){ /* silent */ }
    },300);
    return ()=>{ cancelled=true; clearTimeout(t); };
  },[staffSearch,picked]);

  const pickStaff=(p)=>{
    setPicked(p);
    setForm(f=>({...f,name:p.name,designation:p.designation||"",phone:p.phone||"",staff_subtype:p.staff_subtype||"office"}));
    setStaffSearch(""); setResults([]);
  };
  const clearPick=()=>{ setPicked(null); setForm(f=>({...f,name:"",designation:""})); };

  const save=async()=>{
    if(!form.name.trim()){ setErr("Naam zaroori hai"); return; }
    setSaving(true); setErr("");
    try{
      let partyId=picked?.party_id||null;
      // No library party picked → create a staff-party first (Mode-B style)
      if(!partyId){
        const pRes=await api.post("/finance/parties",{
          is_staff:true, name:form.name.trim(),
          staff_subtype:form.staff_subtype||"office",
          designation:form.designation||null, phone:form.phone||null,
        });
        if(!pRes.success){
          setErr(pRes.code==="duplicate_staff_party"
            ? "Is naam ka staff library me already hai — upar search karke pick karein."
            : (pRes.message||"Party create failed"));
          setSaving(false); return;
        }
        partyId=pRes.data?.id;
      }
      const sRes=await api.post("/payroll/staff",{
        party_id:partyId,
        name:form.name.trim(), designation:form.designation||null,
        phone:form.phone||null, payment_type:form.payment_type,
        basic_salary:Number(form.basic_salary)||0, hra:Number(form.hra)||0,
        conveyance:Number(form.conveyance)||0, medical:Number(form.medical)||0,
        phone_allowance:Number(form.phone_allowance)||0,
        petrol_allowance:Number(form.petrol_allowance)||0,
        special_allowance:Number(form.special_allowance)||0,
        pf_applicable:form.pf_applicable?1:0, pf_method:form.pf_method,
        pf_custom_amount:Number(form.pf_custom_amount)||0,
        esic_applicable:form.esic_applicable?1:0,
        join_date:new Date().toISOString().slice(0,10),
      });
      if(sRes.success){ onSaved&&onSaved(); }
      else setErr(sRes.message||"Staff add failed");
    }catch(e){ setErr(e.message||"Network error"); }
    setSaving(false);
  };

  const Sect=({title,children})=>(
    <div style={{marginBottom:14}}>
      <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${T.b1}`}}>{title}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{children}</div>
    </div>
  );
  const F=({label,children,full})=>(
    <div style={full?{gridColumn:"1 / -1"}:{}}>
      <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{label}</div>
      {children}
    </div>
  );
  const inp={width:"100%",padding:"5px 8px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface};

  return(
    <div onClick={()=>!saving&&onClose()}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.surface,borderRadius:12,width:560,maxWidth:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:T.t1}}>Add Staff to Payroll</div>
            <div style={{fontSize:11,color:T.t4,marginTop:2}}>Library se fetch karein ya naya add karein</div>
          </div>
          <button onClick={()=>!saving&&onClose()} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.t4}}><IcX size={18}/></button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
          {/* ── Library search ── */}
          <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:9,padding:"11px 13px",marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:T.blu,marginBottom:5}}>🔍 Existing staff library se fetch karein</div>
            {picked ? (
              <div style={{display:"flex",alignItems:"center",gap:8,background:T.surface,border:`1.5px solid ${T.blu}`,borderRadius:7,padding:"7px 11px"}}>
                <div style={{flex:1,fontSize:12.5}}>
                  <b>{picked.name}</b>{picked.designation?<span style={{color:T.t3}}> — {picked.designation}</span>:null}
                </div>
                <button onClick={clearPick} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:T.t4,lineHeight:1,padding:2}}>×</button>
              </div>
            ) : (
              <>
                <input value={staffSearch} onChange={e=>setStaffSearch(e.target.value)}
                  placeholder="Naam ya designation se search..."
                  style={{...inp,fontSize:12.5}}/>
                {results.length>0&&(
                  <div style={{marginTop:6,background:T.surface,border:`1px solid ${T.b1}`,borderRadius:7,maxHeight:150,overflowY:"auto"}}>
                    {results.map(p=>(
                      <div key={p.party_id} onClick={()=>pickStaff(p)}
                        style={{padding:"7px 11px",cursor:"pointer",borderBottom:`1px solid ${T.b1}`,fontSize:12}}>
                        <b>{p.name}</b>{p.designation?<span style={{color:T.t3}}> — {p.designation}</span>:null}
                        <div style={{fontSize:10,color:T.t4,marginTop:1}}>
                          {p.staff_subtype==="wages"?"Daily wages":"Office staff"} · Library
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{fontSize:10,color:T.t4,marginTop:5}}>
                  Naam library me hai to fetch ho jayega. Naya naam type karein to nayi staff-party ban jayegi.
                </div>
              </>
            )}
          </div>

          <Sect title="Personal">
            <F label="Name"><input style={{...inp,...(picked?{background:T.surfaceB}:{})}} value={form.name} onChange={e=>set("name",e.target.value)} disabled={!!picked}/></F>
            <F label="Mobile"><input style={inp} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="10-digit"/></F>
            <F label="Designation"><input style={inp} value={form.designation} onChange={e=>set("designation",e.target.value)} placeholder="e.g. Site Supervisor"/></F>
            <F label="Subtype">
              <select style={inp} value={form.staff_subtype} onChange={e=>set("staff_subtype",e.target.value)} disabled={!!picked}>
                <option value="office">Office Staff</option>
                <option value="wages">Daily Wages Worker</option>
              </select>
            </F>
          </Sect>
          <Sect title="Salary — Earnings (₹/month)">
            <F label="Basic"><input style={inp} type="number" value={form.basic_salary} onChange={e=>set("basic_salary",e.target.value)}/></F>
            <F label="HRA"><input style={inp} type="number" value={form.hra} onChange={e=>set("hra",e.target.value)}/></F>
            <F label="Conveyance"><input style={inp} type="number" value={form.conveyance} onChange={e=>set("conveyance",e.target.value)}/></F>
            <F label="Medical"><input style={inp} type="number" value={form.medical} onChange={e=>set("medical",e.target.value)}/></F>
            <F label="Phone Allowance"><input style={inp} type="number" value={form.phone_allowance} onChange={e=>set("phone_allowance",e.target.value)}/></F>
            <F label="Petrol Allowance"><input style={inp} type="number" value={form.petrol_allowance} onChange={e=>set("petrol_allowance",e.target.value)}/></F>
            <F label="Special Allowance" full><input style={inp} type="number" value={form.special_allowance} onChange={e=>set("special_allowance",e.target.value)}/></F>
          </Sect>
          <Sect title="PF / ESIC">
            <F label="PF Applicable">
              <select style={inp} value={form.pf_applicable?"yes":"no"} onChange={e=>set("pf_applicable",e.target.value==="yes")}>
                <option value="yes">Yes</option><option value="no">No</option>
              </select>
            </F>
            <F label="PF Method">
              <select style={inp} value={form.pf_method} onChange={e=>set("pf_method",e.target.value)} disabled={!form.pf_applicable}>
                <option value="none">None</option>
                <option value="capped_15k">Capped at ₹15,000</option>
                <option value="full_basic">Full Basic 12%</option>
                <option value="custom">Custom amount</option>
              </select>
            </F>
            {form.pf_method==="custom"&&form.pf_applicable&&(
              <F label="Custom PF (₹)"><input style={inp} type="number" value={form.pf_custom_amount} onChange={e=>set("pf_custom_amount",e.target.value)}/></F>
            )}
            <F label="ESIC Applicable" full={form.pf_method!=="custom"}>
              <select style={inp} value={form.esic_applicable?"yes":"no"} onChange={e=>set("esic_applicable",e.target.value==="yes")}>
                <option value="yes">Yes (auto if gross ≤ ₹21k)</option><option value="no">No</option>
              </select>
            </F>
          </Sect>
          <Sect title="Payment Mode">
            <F label="Type" full>
              <select style={inp} value={form.payment_type} onChange={e=>set("payment_type",e.target.value)}>
                <option value="fixed">Fixed (full month salary)</option>
                <option value="attendance">Attendance-based (pro-rated)</option>
              </select>
            </F>
          </Sect>
        </div>
        <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          {err?<span style={{flex:1,fontSize:11.5,color:T.red}}>{err}</span>:<span style={{flex:1}}/>}
          <button onClick={()=>!saving&&onClose()} disabled={saving}
            style={{padding:"7px 16px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,color:T.t3,fontSize:12,fontWeight:600,cursor:saving?"not-allowed":"pointer"}}>Cancel</button>
          <button onClick={save} disabled={saving}
            style={{padding:"7px 18px",borderRadius:7,background:saving?T.t4:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer"}}>
            {saving?"Saving…":"Add to Payroll"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MONTHLY SALARY TAB ────────────────────────────────────────────
function MonthlySalaryTab({staff,att,month,year,onViewSlip,advances,workingDays,isAdmin,onStaffUpdate}){
  const [search,setSearch]=useState("");
  const [payStatus,setPayStatus]=useState({});
  // local paymentType overrides — can be toggled per employee
  const [paymentTypes,setPaymentTypes]=useState(()=>{
    const m={};
    staff.forEach(e=>{m[e.id]=e.paymentType||"fixed";});
    return m;
  });

  // ─── Salary Edit Approval (Phase 2) ──────────────────────
  const [editReqs,setEditReqs]=useState([]);      // all requests for current month
  const [editModalEmp,setEditModalEmp]=useState(null);
  const [editNewAmt,setEditNewAmt]=useState("");
  const [editReason,setEditReason]=useState("");
  const [editSubmitting,setEditSubmitting]=useState(false);
  const [reqErr,setReqErr]=useState("");

  // ─── Edit Staff Master (Payroll v2 — Phase 2) ────────────
  const [editStaffEmp,setEditStaffEmp]=useState(null);  // emp object or null
  const [showAddStaff,setShowAddStaff]=useState(false); // Add Staff modal

  // ─── Manual TDS per staff/month (Payroll v2 — Phase 2) ───
  const [tdsByEmpMonth,setTdsByEmpMonth]=useState({});  // {staffId: amount}
  const loadTds=async()=>{
    try{
      const r=await api.get(`/payroll/tds?month=${month}&year=${year}`);
      if(r.success){
        const m={};
        (r.data||[]).forEach(t=>{m[t.staff_id]=Number(t.tds_amount)||0;});
        setTdsByEmpMonth(m);
      }
    }catch(e){ /* endpoint comes online with Phase 2 backend — silent */ }
  };

  // ─── LOP day-set per staff for this month (Phase 3) ──────
  // Approved leave applications with is_unpaid=1 → mark those dates as
  // "L but unpaid" so calcNet treats them like A (no salary).
  const [lopDays,setLopDays]=useState({});  // {staffId: Set<dayNum>}
  const loadLopDays=async()=>{
    try{
      const yfmt=year, mfmt=String(month+1).padStart(2,"0");
      const monthStart=`${yfmt}-${mfmt}-01`;
      const lastDay=new Date(year,month+1,0).getDate();
      const monthEnd=`${yfmt}-${mfmt}-${String(lastDay).padStart(2,"0")}`;
      const r=await api.get(`/payroll/leave-applications?status=Approved&from=${monthStart}&to=${monthEnd}`);
      if(!r.success) return;
      const lopOnly=(r.data||[]).filter(a=>a.is_unpaid);
      const map={};
      lopOnly.forEach(a=>{
        if(!map[a.staff_id]) map[a.staff_id]=new Set();
        const f=new Date(a.from_date), t=new Date(a.to_date);
        const cur=new Date(f);
        while(cur<=t){
          if(cur.getFullYear()===year && cur.getMonth()===month) map[a.staff_id].add(cur.getDate());
          cur.setDate(cur.getDate()+1);
        }
      });
      setLopDays(map);
    }catch(e){ /* silent */ }
  };
  const saveTds=async(staffId,amount)=>{
    setTdsByEmpMonth(p=>({...p,[staffId]:Number(amount)||0}));
    try{
      await api.post("/payroll/tds",{staff_id:staffId,month_num:month,year_num:year,tds_amount:Number(amount)||0});
    }catch(e){ /* best-effort; UI already updated */ }
  };

  const loadRequests=async()=>{
    try{
      const r=await api.get(`/payroll/salary-edit-requests?month=${month}&year=${year}`);
      if(r.success) setEditReqs(r.data||[]);
    }catch(e){ /* table might not exist yet — silent */ }
  };
  useEffect(()=>{ loadRequests(); loadTds(); loadLopDays(); /* eslint-disable-next-line */ },[month,year]);

  // Get latest request for a staff member (approved takes priority, else pending, else rejected)
  const reqFor=(sid)=>{
    const list=editReqs.filter(r=>r.staff_id===sid);
    return list.find(r=>r.status==="approved")||list.find(r=>r.status==="pending")||list[0]||null;
  };

  const openEdit=(emp,currentNet)=>{
    setEditModalEmp(emp);
    setEditNewAmt(String(currentNet));
    setEditReason("");
    setReqErr("");
  };
  const submitEdit=async()=>{
    if(!editModalEmp) return;
    const newAmt=Number(editNewAmt);
    if(isNaN(newAmt)||newAmt<0){ setReqErr("Invalid amount"); return; }
    setEditSubmitting(true);setReqErr("");
    try{
      const oldAmt=calcNet(editModalEmp).net;
      const r=await api.post("/payroll/salary-edit-requests",{
        staff_id:editModalEmp.id,
        month_num:month,
        year_num:year,
        old_amount:oldAmt,
        new_amount:newAmt,
        reason:editReason||null,
      });
      if(r.success){
        setEditModalEmp(null);
        await loadRequests();
      }else{ setReqErr(r.message||"Failed"); }
    }catch(e){ setReqErr(e.message||"Network error"); }
    setEditSubmitting(false);
  };
  const approveReq=async(id,status)=>{
    try{
      const r=await api.patch(`/payroll/salary-edit-requests/${id}`,{status});
      if(r.success) await loadRequests();
    }catch(e){ alert(e.message); }
  };

  const togglePayType=(empId)=>{
    setPaymentTypes(p=>({...p,[empId]:p[empId]==="fixed"?"attendance":"fixed"}));
  };

  // Salary list shows only salary-enabled staff. App-users with salary OFF
  // appear in Attendance but not here (until admin enables salary).
  const salaryOffCount = staff.filter(e=>e.salaryEnabled===false).length;
  const filtered=staff.filter(e=>e.salaryEnabled!==false).filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase())||(e.role||"").toLowerCase().includes(search.toLowerCase()));

  const WD=workingDays||26;
  const calcNet=(emp)=>{
    const days=att[emp.id]||{};
    const P=Object.values(days).filter(v=>v==="P").length;
    const H=Object.values(days).filter(v=>v==="H").length;
    const A=Object.values(days).filter(v=>v==="A").length;
    // Paid leave counts as present; LOP (unpaid) leave does NOT.
    // lopDays[emp.id] holds the set of day-numbers approved as LOP this month.
    const lopSet=lopDays[emp.id]||new Set();
    let L_paid=0, L_unpaid=0;
    Object.entries(days).forEach(([d,v])=>{ if(v==="L"){ if(lopSet.has(Number(d))) L_unpaid++; else L_paid++; } });
    const effective=P+(H*0.5)+L_paid;
    // Petrol + Special allowance added as part of gross (Phase 2 fields,
    // default 0 when not set so legacy rows keep working)
    const fullGross=emp.basicSalary+emp.hra+emp.conveyance+emp.medical+emp.phone+(emp.petrolAllowance||0)+(emp.specialAllowance||0);
    const pType=paymentTypes[emp.id]||emp.paymentType||"fixed";
    const gross=pType==="fixed"
      ? fullGross
      : Math.round((fullGross/WD)*effective);
    // PF — method-aware (Phase 2); fall back to legacy capped_15k when unset
    const pfMethod=emp.pfMethod||"capped_15k";
    const pfApplicable=emp.pfApplicable===undefined?true:!!emp.pfApplicable;
    let pfFull=0;
    if(pfApplicable){
      if(pfMethod==="none") pfFull=0;
      else if(pfMethod==="full_basic") pfFull=Math.round(emp.basicSalary*0.12);
      else if(pfMethod==="custom") pfFull=Math.round(emp.pfCustomAmount||0);
      else pfFull=Math.round(Math.min(emp.basicSalary,15000)*0.12); // capped_15k
    }
    const esicApplicable=emp.esicApplicable===undefined?true:!!emp.esicApplicable;
    const esiFull=(esicApplicable&&gross<=21000)?Math.round(gross*0.0075):0;
    // Prorate deductions for attendance-paid staff (else cap at full
    // gross days). For 'fixed' staff, PF/ESI is full month value.
    const pf=pType==="fixed"?pfFull:Math.round((pfFull/WD)*effective);
    const esi=pType==="fixed"?esiFull:Math.round((esiFull/WD)*effective);
    const adv=(advances||[]).find(a=>a.empId===emp.id&&a.status==="Pending deduction")?.amount||0;
    // Manual TDS for this month (looked up from `tdsByEmpMonth` if set)
    const tds=Math.round((tdsByEmpMonth&&tdsByEmpMonth[emp.id])||0);
    const net=Math.max(0,gross-pf-esi-adv-tds);
    return{gross,net,effective,pf,esi,tds,pType,P,H,A,fullGross};
  };

  const totalNet=filtered.reduce((s,e)=>s+calcNet(e).net,0);
  const paidCount=filtered.filter(e=>payStatus[e.id]==="Paid").length;

  const markAllPaid=()=>{
    const upd={};
    filtered.forEach(e=>{upd[e.id]="Paid";});
    setPayStatus(p=>({...p,...upd}));
  };

  return(
    <div>
      {/* Summary bar */}
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",minWidth:200}}>
          <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={12} color={T.t4}/></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employee..."
            style={{height:32,padding:"0 8px 0 26px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",width:"100%"}}/>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{padding:"6px 13px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7}}>
            <span style={{fontSize:11,color:T.blu}}>Total Net Payroll: </span>
            <span style={{fontSize:14,fontWeight:800,color:T.blu}}>₹{fmtN(totalNet)}</span>
          </div>
          <div style={{padding:"6px 13px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:7}}>
            <span style={{fontSize:11,color:T.grn}}>{paidCount}/{filtered.length} Paid</span>
          </div>
          {isAdmin&&<button onClick={()=>setShowAddStaff(true)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcAdd size={13} color="white"/> Add Staff
          </button>}
          {isAdmin&&<button onClick={markAllPaid}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcChk size={13} color="white"/> Mark All Paid
          </button>}
          <button onClick={()=>{
            const headers=["Employee","ID","Dept","Pay Type","Basic","Gross","PF","ESI","TDS","Net Pay"];
            const rows=filtered.map(emp=>{const c=calcNet(emp);return[emp.name,emp.id,emp.dept,c.pType,emp.basicSalary,c.gross,c.pf,c.esi,c.tds||0,c.net];});
            exportCSV(headers,rows,`Monthly_Salary_${MONTHS[month]}_${year}.csv`);
          }} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:T.sltL,border:`1px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <IcDown size={12} color={T.t2}/> Export
          </button>
        </div>
      </div>

      {/* Pending Edit Approvals Banner (admin-only) */}
      {isAdmin && editReqs.filter(r=>r.status==="pending").length>0 && (
        <div style={{background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:9,padding:"10px 14px",marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:T.amb,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            <IcAlert size={14} color={T.amb}/> {editReqs.filter(r=>r.status==="pending").length} Salary Edit Request(s) — Pending Your Approval
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {editReqs.filter(r=>r.status==="pending").map(r=>(
              <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,background:T.surface,padding:"7px 10px",borderRadius:7,border:`1px solid ${T.ambM}`}}>
                <div style={{flex:1,fontSize:11.5,color:T.t2}}>
                  <b style={{color:T.t1}}>{r.staff_name||`Staff #${r.staff_id}`}</b>
                  &nbsp;— &nbsp;₹{fmtN(Number(r.old_amount))} → <b style={{color:T.grn}}>₹{fmtN(Number(r.new_amount))}</b>
                  {r.reason&&<span style={{color:T.t4,fontStyle:"italic"}}> &nbsp;({r.reason})</span>}
                </div>
                <button onClick={()=>approveReq(r.id,"approved")}
                  style={{padding:"4px 12px",borderRadius:6,background:T.grn,color:"white",fontSize:11,fontWeight:700,border:"none",cursor:"pointer"}}>
                  ✓ Approve
                </button>
                <button onClick={()=>approveReq(r.id,"rejected")}
                  style={{padding:"4px 12px",borderRadius:6,background:T.redL,color:T.red,fontSize:11,fontWeight:700,border:`1px solid ${T.redM}`,cursor:"pointer"}}>
                  ✕ Reject
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length===0&&!search&&<EmptyState icon={<IcTeam size={32} color={T.b2}/>} message="No staff members added yet" sub="Add monthly staff to see salary data"/>}
      {filtered.length===0&&search&&<EmptyState icon={<IcSearch size={32} color={T.b2}/>} message={`No results for "${search}"`}/>}

      {/* Table */}
      <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"210px 100px 90px 110px 70px 70px 80px 100px 110px 110px",padding:"7px 14px",background:"#0D1B2A"}}>
          {["Employee","Pay Type","Basic","Gross","PF","ESI","TDS","Net Pay","Status","Actions"].map((h,i)=>(
            <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
          ))}
        </div>
        {filtered.map((emp,ei)=>{
          const {gross,net,effective,pf,esi,pType,P,H,A,fullGross}=calcNet(emp);
          const isPaid=payStatus[emp.id]==="Paid";
          const hasAdv=(advances||[]).find(a=>a.empId===emp.id&&a.status==="Pending deduction");
          const deptColor=emp.dept==="Management"?T.pur:emp.dept==="Civil"?T.blu:emp.dept==="Design"?T.grn:emp.dept==="Electrical"?T.amb:T.slt;
          const isAttBased=pType==="attendance";
          return(
            <div key={emp.id} style={{display:"grid",gridTemplateColumns:"210px 100px 90px 110px 70px 70px 80px 100px 110px 110px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:ei%2===0?"transparent":T.surfaceB,borderLeft:`3px solid ${isAttBased?T.pur:T.grn}33`,transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.bluL+"55"}
              onMouseLeave={e=>e.currentTarget.style.background=ei%2===0?"transparent":T.surfaceB}>

              {/* Employee */}
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <Avatar name={emp.name} size={30} color={deptColor}/>
                <div>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{emp.name}</div>
                  <div style={{fontSize:10,color:T.t4}}>
                    {emp.id}
                    {isAttBased
                      ?<span style={{marginLeft:5,color:T.pur}}>{P}P {H>0?`${H}H `:""}{A>0?`${A}A `:""} = {effective}d</span>
                      :<span style={{marginLeft:5,color:T.grn}}>Full month</span>
                    }
                  </div>
                </div>
              </div>

              {/* Pay Type toggle */}
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {isAdmin?<button
                  onClick={()=>togglePayType(emp.id)}
                  title={isAttBased?"Switch to Fixed Monthly":"Switch to Attendance Based"}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:20,border:`1.5px solid ${isAttBased?T.pur:T.grn}`,background:isAttBased?T.purL:T.grnL,color:isAttBased?T.pur:T.grn,fontSize:10.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",transition:"all .2s"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:isAttBased?T.pur:T.grn,flexShrink:0}}/>
                  {isAttBased?"Attendance":"Fixed"}
                </button>:<span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:20,border:`1.5px solid ${isAttBased?T.pur:T.grn}`,background:isAttBased?T.purL:T.grnL,color:isAttBased?T.pur:T.grn,fontSize:10.5,fontWeight:700,whiteSpace:"nowrap"}}><div style={{width:7,height:7,borderRadius:"50%",background:isAttBased?T.pur:T.grn,flexShrink:0}}/>{isAttBased?"Attendance":"Fixed"}</span>}
                {isAttBased&&(
                  <div style={{fontSize:9,color:T.t4,textAlign:"center"}}>
                    ₹{fmtN(Math.round(fullGross/WD))}/day
                  </div>
                )}
              </div>

              <span style={{fontSize:12.5,color:T.t2}}>₹{fmt(emp.basicSalary)}</span>

              {/* Gross — show diff if attendance cuts */}
              <div>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>₹{fmt(gross)}</div>
                {isAttBased&&gross<fullGross&&(
                  <div style={{fontSize:9.5,color:T.red}}>-₹{fmtN(fullGross-gross)} cut</div>
                )}
              </div>

              <span style={{fontSize:12,color:T.red}}>-₹{fmtN(pf)}</span>
              <span style={{fontSize:12,color:esi>0?T.red:T.t4}}>{esi>0?`-₹${fmtN(esi)}`:"—"}</span>

              {/* TDS — inline editable for admins, read-only otherwise */}
              {isAdmin ? (
                <input
                  type="number" min="0"
                  value={tdsByEmpMonth[emp.id]||""}
                  onChange={e=>setTdsByEmpMonth(p=>({...p,[emp.id]:Number(e.target.value)||0}))}
                  onBlur={e=>saveTds(emp.id,Number(e.target.value)||0)}
                  placeholder="0"
                  style={{width:70,padding:"3px 6px",borderRadius:5,border:`1.5px solid ${(tdsByEmpMonth[emp.id]||0)>0?T.redM:T.b1}`,fontSize:11.5,color:(tdsByEmpMonth[emp.id]||0)>0?T.red:T.t2,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:(tdsByEmpMonth[emp.id]||0)>0?T.redL:T.surface,textAlign:"right"}}
                  title="Manual TDS for this month (saves on blur)"
                />
              ) : (
                <span style={{fontSize:12,color:(tdsByEmpMonth[emp.id]||0)>0?T.red:T.t4}}>{(tdsByEmpMonth[emp.id]||0)>0?`-₹${fmtN(tdsByEmpMonth[emp.id])}`:"—"}</span>
              )}

              <div>
                {(() => {
                  const req = reqFor(emp.id);
                  const approvedOverride = req && req.status === "approved" ? Number(req.new_amount) : null;
                  const displayNet = approvedOverride !== null ? approvedOverride : net;
                  return (
                    <>
                      <div style={{fontSize:13,fontWeight:800,color:approvedOverride!==null?T.blu:T.grn}}>
                        ₹{fmtN(displayNet)}
                      </div>
                      {approvedOverride!==null && (
                        <div style={{fontSize:9,color:T.blu}} title="Approved edit">
                          edited (was ₹{fmtN(net)})
                        </div>
                      )}
                      {req && req.status === "pending" && (
                        <div style={{fontSize:9,color:T.amb}}>edit pending</div>
                      )}
                      {hasAdv && approvedOverride === null && (
                        <div style={{fontSize:9.5,color:T.amb}}>-₹{fmtN(hasAdv.amount)} adv.</div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div>
                {isPaid
                  ?<span style={{display:"inline-flex",alignItems:"center",gap:4,background:T.grnL,color:T.grn,fontSize:10.5,fontWeight:700,padding:"3px 9px",borderRadius:20,border:`1px solid ${T.grnM}`}}><IcChk size={10} color={T.grn}/>Paid</span>
                  :<button onClick={()=>setPayStatus(p=>({...p,[emp.id]:"Paid"}))}
                    style={{padding:"4px 11px",borderRadius:20,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                    Pay Now
                  </button>
                }
              </div>

              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>onViewSlip(emp,pType,paymentTypes)}
                  style={{display:"flex",alignItems:"center",gap:3,padding:"4px 9px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                  <IcEye size={11} color={T.blu}/> Slip
                </button>
                {isAdmin && (
                  <button onClick={()=>openEdit(emp,net)} title="Request salary edit (needs approval)"
                    style={{display:"flex",alignItems:"center",gap:3,padding:"4px 7px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    <IcEdit size={11} color={T.amb}/>
                  </button>
                )}
                {isAdmin && (
                  <button onClick={()=>setEditStaffEmp(emp)} title="Edit staff master (PF method, allowances, contact)"
                    style={{display:"flex",alignItems:"center",gap:3,padding:"4px 7px",borderRadius:6,background:T.purL,border:`1px solid ${T.purM}`,color:T.pur,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    <IcSet size={11} color={T.pur}/>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Staff Master Edit Modal (Phase 2) ─── */}
      {editStaffEmp && (
        <EditStaffModal
          emp={editStaffEmp}
          onClose={()=>setEditStaffEmp(null)}
          onSaved={()=>{ if(onStaffUpdate) onStaffUpdate(); }}
        />
      )}

      {/* ─── Add Staff Modal (library-fetch) ─── */}
      {showAddStaff && (
        <AddStaffModal
          onClose={()=>setShowAddStaff(false)}
          onSaved={()=>{ setShowAddStaff(false); if(onStaffUpdate) onStaffUpdate(); }}
        />
      )}

      {/* ─── Salary Edit Request Modal ─── */}
      {editModalEmp && (
        <div onClick={()=>!editSubmitting&&setEditModalEmp(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:T.surface,borderRadius:12,padding:20,width:440,maxWidth:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:T.t1}}>Request Salary Edit</div>
                <div style={{fontSize:11,color:T.t4,marginTop:2}}>{editModalEmp.name} — {MONTHS[month]} {year}</div>
              </div>
              <button onClick={()=>!editSubmitting&&setEditModalEmp(null)}
                style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.t4}}>
                <IcX size={18}/>
              </button>
            </div>

            <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:11,color:T.blu}}>
              ⓘ Edit will be submitted for approval. Admin/Super-admin must approve before it takes effect.
            </div>

            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>
                Current Calculated Net
              </label>
              <div style={{fontSize:14,fontWeight:700,color:T.t2,padding:"8px 12px",background:T.b1,borderRadius:7}}>
                ₹ {fmtN(calcNet(editModalEmp).net)}
              </div>
            </div>

            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>
                New Final Salary Amount <span style={{color:T.red}}>*</span>
              </label>
              <input type="number" value={editNewAmt} onChange={e=>setEditNewAmt(e.target.value)}
                style={{width:"100%",padding:"9px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:14,fontWeight:700,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>
                Reason for Edit
              </label>
              <textarea value={editReason} onChange={e=>setEditReason(e.target.value)} rows={3}
                placeholder="e.g. Bonus for overtime, late mark waiver, etc."
                style={{width:"100%",padding:"9px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
            </div>

            {reqErr && <div style={{background:T.redL,color:T.red,padding:"7px 10px",borderRadius:6,fontSize:11,marginBottom:10,border:`1px solid ${T.redM}`}}>{reqErr}</div>}

            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>!editSubmitting&&setEditModalEmp(null)} disabled={editSubmitting}
                style={{padding:"8px 16px",borderRadius:7,background:"none",border:`1.5px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={submitEdit} disabled={editSubmitting}
                style={{padding:"8px 18px",borderRadius:7,background:editSubmitting?T.b1:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:editSubmitting?"not-allowed":"pointer"}}>
                {editSubmitting?"Submitting...":"Submit for Approval"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ADVANCES TAB ──────────────────────────────────────────────────
function AdvancesTab({advances,setAdvances,isAdmin}){
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:"",amount:"",date:new Date().toISOString().split("T")[0],reason:""});

  const addAdvance=async()=>{
    if(!form.name||!form.amount) return;
    try{
      const res=await api.post("/payroll/advances",{name:form.name,amount:Number(form.amount),date:form.date,reason:form.reason});
      const d=res.data?.data;
      if(d) setAdvances(p=>[{id:d.id,empId:d.emp_id,name:d.name,amount:Number(d.amount),date:d.date?d.date.split("T")[0]:"",reason:d.reason,status:d.status},...p]);
    }catch(err){console.error("Add advance:",err);}
    setForm({name:"",amount:"",date:new Date().toISOString().split("T")[0],reason:""});setShowAdd(false);
  };

  const totalPending=advances.filter(a=>a.status==="Pending deduction").reduce((s,a)=>s+a.amount,0);

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{display:"flex",gap:10}}>
          <div style={{padding:"6px 13px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7}}>
            <span style={{fontSize:11,color:T.amb}}>Pending Recovery: </span>
            <span style={{fontSize:14,fontWeight:800,color:T.amb}}>₹{fmtN(totalPending)}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{
            const headers=["Adv ID","Employee","Amount","Date","Reason","Status"];
            const rows=advances.map(a=>[a.id,a.name,a.amount,a.date,a.reason,a.status]);
            exportCSV(headers,rows,"Advances_Export.csv");
          }} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:T.sltL,border:`1px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <IcDown size={12} color={T.t2}/> Export
          </button>
          {isAdmin&&<button onClick={()=>setShowAdd(!showAdd)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcAdd size={13} color="white"/> New Advance
          </button>}
        </div>
      </div>

      {/* Add form */}
      {showAdd&&(
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"13px 14px",marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:9,marginBottom:9}}>
            {[{l:"Name",k:"name",ph:"Employee name"},{l:"Amount (₹)",k:"amount",ph:"Amount",type:"number"},{l:"Date",k:"date",type:"date"},{l:"Reason",k:"reason",ph:"Medical, personal..."}].map(f=>(
              <div key={f.k}><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{f.l}</label>
                <input type={f.type||"text"} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}
                  style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/></div>
            ))}
          </div>
          <div style={{display:"flex",gap:7}}>
            <button onClick={()=>setShowAdd(false)} style={{padding:"7px 14px",borderRadius:6,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
            <button onClick={addAdvance} style={{padding:"7px 14px",borderRadius:6,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>Save Advance</button>
          </div>
        </div>
      )}

      <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"90px 1fr 100px 120px 1fr 120px",padding:"7px 14px",background:T.sb}}>
          {["Adv ID","Employee","Amount","Date","Reason","Status"].map((h,i)=>(
            <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
          ))}
        </div>
        {advances.length===0&&<EmptyState icon={<IcFin size={32} color={T.b2}/>} message="No advance records" sub="No salary advances have been recorded yet"/>}
        {advances.map((adv,i)=>{
          const isPending=adv.status==="Pending deduction";
          return(
            <div key={adv.id} style={{display:"grid",gridTemplateColumns:"90px 1fr 100px 120px 1fr 120px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",borderLeft:`3px solid ${isPending?T.amb:T.grn}44`,transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:11,fontFamily:"monospace",color:T.t4}}>{adv.id}</span>
              <span style={{fontSize:12.5,fontWeight:500,color:T.t1}}>{adv.name}</span>
              <span style={{fontSize:13,fontWeight:700,color:isPending?T.amb:T.grn}}>₹{fmtN(adv.amount)}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{adv.date}</span>
              <span style={{fontSize:12,color:T.t2,fontStyle:"italic"}}>{adv.reason}</span>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <Pill label={adv.status==="Deducted"?"Deducted":"Pending"} c={isPending?T.amb:T.grn} bg={isPending?T.ambL:T.grnL} brd={isPending?T.ambM:T.grnM}/>
                {isPending&&isAdmin&&<button onClick={async()=>{try{await api.patch("/payroll/advances/"+adv.id,{status:"Deducted"});}catch(err){console.error(err);}setAdvances(p=>p.map(a=>a.id===adv.id?{...a,status:"Deducted"}:a));}}
                  style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,cursor:"pointer",fontWeight:600}}>
                  Deduct
                </button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NEW ADDITIONS — Manual Salary, Ledger, Mobile Punch, Settings
// ═══════════════════════════════════════════════════════════

// Extra icons needed
const IcGPS   =(p)=><Ic {...p} d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7zm0 4a3 3 0 100 6 3 3 0 000-6z"/>;
const IcClockIn=(p)=><Ic {...p} d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 5v5l3.5 2"/>;
const IcBank  =(p)=><Ic {...p} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10"/>;
const IcSlip  =(p)=><Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
const IcFinLink=(p)=><Ic {...p} d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>;

const TODAY=new Date().toISOString().split("T")[0];
const addDays=(dateStr,n)=>{
  const d=new Date(dateStr);d.setDate(d.getDate()+n);
  return d.toISOString().split("T")[0];
};
const daysDiff2=(dateStr)=>{
  if(!dateStr) return null;
  return Math.round((new Date(dateStr)-new Date(TODAY))/(1000*86400));
};

// ── MANUAL SALARY TAB ──────────────────────────────────────
function ManualSalaryTab({salaryRecords,setSalaryRecords,defaultDueDays,month,year}){
  const blank={
    name:"",designation:"",phone:"",
    bankName:"",accountNo:"",ifsc:"",
    daysPresent:"NA",totalDays:26,
    amount:"",salaryDate:TODAY,
    dueDate:addDays(TODAY,defaultDueDays),
    notes:"",category:"Other"
  };
  const [form,setForm]=useState(blank);
  const [showForm,setShowForm]=useState(false);
  const [search,setSearch]=useState("");
  const upd=(k)=>e=>setForm(p=>{
    const updated={...p,[k]:e.target.value};
    // auto recalc dueDate when salaryDate changes
    if(k==="salaryDate") updated.dueDate=addDays(e.target.value,defaultDueDays);
    return updated;
  });

  // Existing people from monthly staff + daily workers as quick-fill
  const QUICK_FILL=[
    ...MONTHLY_STAFF.map(e=>({name:e.name,designation:e.role,bankName:e.bankAcc?.split(" ")[0]||"",accountNo:e.bankAcc||"",ifsc:e.ifsc||"",category:"Monthly Staff"})),
    ...DAILY_WORKERS.map(w=>({name:w.name,designation:w.trade,bankName:"",accountNo:"",ifsc:"",category:"Daily Worker"})),
    {name:"Sunny",designation:"Contract Worker",bankName:"",accountNo:"",ifsc:"",category:"Other"},
  ];
  const filteredQF=search?QUICK_FILL.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())):QUICK_FILL;

  const fillFrom=(person)=>{
    setForm(p=>({...p,name:person.name,designation:person.designation,bankName:person.bankName,accountNo:person.accountNo,ifsc:person.ifsc,category:person.category}));
    setSearch("");
  };

  const handleCreate=async()=>{
    if(!form.name.trim()||!form.amount) return;
    try{
      const res=await api.post("/payroll/salary-records",{
        name:form.name,designation:form.designation,phone:form.phone,
        bank_name:form.bankName,account_no:form.accountNo,ifsc:form.ifsc,
        days_present:form.daysPresent,total_days:form.totalDays,
        amount:Number(form.amount),salary_date:form.salaryDate,
        due_date:form.dueDate,notes:form.notes,category:form.category,
        month_num:month,year_num:year,
      });
      const d=res.data?.data;
      if(d){
        const rec={
          id:d.id,name:d.name,designation:d.designation,phone:d.phone,
          bankName:d.bank_name,accountNo:d.account_no,ifsc:d.ifsc,
          daysPresent:d.days_present,totalDays:d.total_days,
          amount:Number(d.amount),salaryDate:d.salary_date?d.salary_date.split("T")[0]:"",
          dueDate:d.due_date?d.due_date.split("T")[0]:"",notes:d.notes,category:d.category,
          month:d.month_num,year:d.year_num,status:d.status,
          createdAt:d.created_at,paidDate:d.paid_date,paidBy:d.paid_by,txRef:d.tx_ref,
        };
        setSalaryRecords(p=>[rec,...p]);
      }
    }catch(err){console.error("Create salary:",err);}
    setForm(blank);setShowForm(false);
  };

  const monthRecords=salaryRecords.filter(r=>r.month===month&&r.year===year);
  const totalCreated=monthRecords.reduce((s,r)=>s+r.amount,0);
  const totalPaid=monthRecords.filter(r=>r.status==="Paid").reduce((s,r)=>s+r.amount,0);
  const totalPending=monthRecords.filter(r=>r.status==="Pending").reduce((s,r)=>s+r.amount,0);

  return(
    <div>
      {/* Summary bar */}
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        {[{l:"Total Created",v:`₹${fmtN(totalCreated)}`,c:T.blu},{l:"Paid",v:`₹${fmtN(totalPaid)}`,c:T.grn},{l:"Pending",v:`₹${fmtN(totalPending)}`,c:totalPending>0?T.amb:T.grn}].map((s,i)=>(
          <div key={i} style={{padding:"6px 14px",background:T.surface,border:`1.5px solid ${s.c}33`,borderRadius:8,borderLeft:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px"}}>{s.l}</div>
            <div style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</div>
          </div>
        ))}
        <div style={{marginLeft:"auto"}}>
          <button onClick={()=>setShowForm(s=>!s)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,background:T.blu,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",boxShadow:`0 3px 10px ${T.blu}44`}}>
            <IcAdd size={14} color="white"/> Create Salary
          </button>
        </div>
      </div>

      {/* CREATE FORM */}
      {showForm&&(
        <div style={{background:T.surface,borderRadius:10,border:`1.5px solid ${T.bluM}`,padding:"16px 18px",marginBottom:14,boxShadow:`0 2px 12px ${T.blu}11`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
            <IcSlip size={15} color={T.blu}/> Create Salary Entry
          </div>

          {/* Quick fill search */}
          <div style={{marginBottom:12,padding:"10px 12px",background:T.bluL,borderRadius:7,border:`1px solid ${T.bluM}`}}>
            <div style={{fontSize:10,color:T.blu,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Quick Fill from Existing Person</div>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={12} color={T.t4}/></span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Type name to search..."
                style={{width:"100%",height:30,padding:"0 8px 0 26px",borderRadius:6,border:`1px solid ${T.bluM}`,fontSize:12,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            {search&&(
              <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:5}}>
                {filteredQF.map((p,i)=>(
                  <button key={i} onClick={()=>fillFrom(p)}
                    style={{padding:"4px 10px",borderRadius:20,background:"white",border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
                    {p.name} <span style={{opacity:.6,fontSize:10}}>({p.category})</span>
                  </button>
                ))}
                {filteredQF.length===0&&<span style={{fontSize:11,color:T.t4}}>No match — fill manually below</span>}
              </div>
            )}
          </div>

          {/* Form grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            {[{l:"Full Name *",k:"name",ph:"Employee / Worker name",col:1},{l:"Designation",k:"designation",ph:"Role / Trade",col:1},{l:"Phone",k:"phone",ph:"Mobile number",col:1}].map(f=>(
              <div key={f.k}>
                <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{f.l}</label>
                <input value={form[f.k]} onChange={upd(f.k)} placeholder={f.ph}
                  style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
              </div>
            ))}
          </div>

          {/* Bank details */}
          <div style={{padding:"10px 12px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,marginBottom:10}}>
            <div style={{fontSize:10,color:T.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7,display:"flex",alignItems:"center",gap:6}}>
              <IcBank size={12} color={T.t3}/> Bank Details
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
              {[{l:"Bank Name",k:"bankName",ph:"SBI, HDFC..."},{l:"Account No",k:"accountNo",ph:"Account number"},{l:"IFSC Code",k:"ifsc",ph:"SBIN0001234"}].map(f=>(
                <div key={f.k}>
                  <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{f.l}</label>
                  <input value={form[f.k]} onChange={upd(f.k)} placeholder={f.ph}
                    style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                    onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
              ))}
            </div>
          </div>

          {/* Salary calculation */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
            {/* Days Present */}
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Days Present</label>
              <div style={{display:"flex",gap:5}}>
                <input value={form.daysPresent} onChange={upd("daysPresent")} placeholder="e.g. 22 or NA"
                  style={{flex:1,padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                <button onClick={()=>setForm(p=>({...p,daysPresent:"NA"}))}
                  style={{padding:"0 9px",borderRadius:7,background:form.daysPresent==="NA"?T.slt:T.sltL,color:form.daysPresent==="NA"?"white":T.slt,border:`1px solid ${T.b2}`,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                  NA
                </button>
              </div>
              {form.daysPresent==="NA"&&<div style={{fontSize:10,color:T.slt,marginTop:3}}>Fixed salary — no deduction</div>}
            </div>
            {/* Total / Working days */}
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Working Days</label>
              <input type="number" value={form.totalDays} onChange={upd("totalDays")}
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            {/* Amount */}
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Net Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={upd("amount")} placeholder="Total salary to pay"
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${form.amount?T.grn:T.b1}`,fontSize:13,fontWeight:form.amount?700:400,color:form.amount?T.grn:T.t1,background:form.amount?T.grnL:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>{if(!form.amount)e.target.style.borderColor=T.b1;}}/>
              {form.amount&&<div style={{fontSize:10.5,color:T.grn,marginTop:2,fontWeight:600}}>₹ {fmtN(Number(form.amount))}</div>}
            </div>
            {/* Category */}
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Category</label>
              <SearchSelect value={form.category} options={["Monthly Staff","Daily Worker","Contractor","Consultant","Other"]} onChange={v=>upd("category")({target:{value:v}})} placeholder="Select category..."/>
            </div>
          </div>

          {/* Dates */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Salary Date</label>
              <input type="date" value={form.salaryDate} onChange={upd("salaryDate")}
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>
                Due Date
                <span style={{marginLeft:5,color:T.blu,fontSize:9,fontWeight:400}}>← Editable (default +{defaultDueDays}d)</span>
              </label>
              <input type="date" value={form.dueDate} onChange={upd("dueDate")}
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.amb}`,fontSize:12.5,color:T.amb,background:T.ambL,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              {form.dueDate&&<div style={{fontSize:10,color:T.amb,marginTop:2}}>
                {daysDiff2(form.dueDate)>0?`Due in ${daysDiff2(form.dueDate)} days`:daysDiff2(form.dueDate)===0?"Due today!":"Overdue!"}
              </div>}
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Notes</label>
              <input value={form.notes} onChange={upd("notes")} placeholder="March salary, contract etc."
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
          </div>

          {/* Finance link info */}
          <div style={{padding:"9px 12px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:7,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
            <IcFinLink size={13} color={T.grn}/>
            <span style={{fontSize:11.5,color:T.grn}}>
              This salary will automatically appear in <strong>Finance → Pending Payments</strong> on due date (warning 7 days before)
            </span>
          </div>

          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setShowForm(false);setForm(blank);}}
              style={{flex:1,padding:"10px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>
              Cancel
            </button>
            <button onClick={handleCreate} disabled={!form.name.trim()||!form.amount}
              style={{flex:2,padding:"10px",borderRadius:7,background:form.name.trim()&&form.amount?T.grn:T.b1,color:form.name.trim()&&form.amount?"white":T.t4,fontSize:13,fontWeight:700,border:"none",cursor:form.name.trim()&&form.amount?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
              <IcChk size={14} color={form.name.trim()&&form.amount?"white":T.t4}/> Create Salary Entry
            </button>
          </div>
        </div>
      )}

      {/* SALARY LIST for this month */}
      <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"100px 1fr 100px 120px 120px 120px 100px",padding:"7px 14px",background:T.sb}}>
          {["Sal ID","Name / Role","Category","Amount","Salary Date","Due Date","Status"].map((h,i)=>(
            <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
          ))}
        </div>
        {monthRecords.length===0&&(
          <div style={{padding:"40px",textAlign:"center",color:T.t4}}>
            <IcSlip size={32} color={T.b2}/>
            <div style={{fontSize:13,marginTop:8}}>No salary entries for {MONTHS[month]} {year}</div>
            <div style={{fontSize:11.5,color:T.t4,marginTop:3}}>Click "Create Salary" to add entries</div>
          </div>
        )}
        {monthRecords.map((rec,i)=>{
          const diff=daysDiff2(rec.dueDate);
          const isOverdue=diff!==null&&diff<0&&rec.status==="Pending";
          const isDueSoon=diff!==null&&diff>=0&&diff<=7&&rec.status==="Pending";
          const statusC=rec.status==="Paid"?{c:T.grn,bg:T.grnL,brd:T.grnM}:isOverdue?{c:T.red,bg:T.redL,brd:T.redM}:isDueSoon?{c:T.amb,bg:T.ambL,brd:T.ambM}:{c:T.slt,bg:T.sltL,brd:T.b2};
          return(
            <div key={rec.id} style={{display:"grid",gridTemplateColumns:"100px 1fr 100px 120px 120px 120px 100px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:i%2===0?"transparent":T.surfaceB,borderLeft:`3px solid ${statusC.c}44`,transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.sltL}
              onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":T.surfaceB}>
              <span style={{fontSize:10.5,fontFamily:"monospace",color:T.t4}}>{rec.id.slice(-6)}</span>
              <div>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{rec.name}</div>
                <div style={{fontSize:10.5,color:T.t4}}>{rec.designation} {rec.daysPresent!=="NA"?`· ${rec.daysPresent}/${rec.totalDays} days`:"· Fixed"}</div>
              </div>
              <span style={{fontSize:11,color:T.t3}}>{rec.category}</span>
              <span style={{fontSize:13,fontWeight:700,color:T.t1}}>₹{fmtN(rec.amount)}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{rec.salaryDate}</span>
              <div>
                <div style={{fontSize:11.5,fontWeight:600,color:isOverdue?T.red:isDueSoon?T.amb:T.t3}}>{rec.dueDate}</div>
                {isOverdue&&<div style={{fontSize:9.5,color:T.red}}>Overdue {Math.abs(diff)}d</div>}
                {isDueSoon&&<div style={{fontSize:9.5,color:T.amb}}>Due in {diff}d ⚠</div>}
              </div>
              <Pill label={rec.status} c={statusC.c} bg={statusC.bg} brd={statusC.brd}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── SALARY LEDGER TAB ──────────────────────────────────────────────
function SalaryLedgerTab({salaryRecords,setSalaryRecords,month,year}){
  const [filterStatus,setFilterStatus]=useState("All");
  const [filterMonth,setFilterMonth]=useState("current"); // current | all
  const [markPayModal,setMarkPayModal]=useState(null);
  const [payForm,setPayForm]=useState({paidDate:TODAY,paidBy:localStorage.getItem("gb_user_name")||"",txRef:""});

  // Run-generated payments (finalized payroll runs) merged in, tagged source:"Run".
  const [runRecs,setRunRecs]=useState([]);
  useEffect(()=>{
    let alive=true;
    api.get(`/payroll/run-payments?year=${year}`).then(r=>{
      if(!alive||!r.success) return;
      setRunRecs((r.data||[]).map(it=>({
        id:"run-"+it.id, name:it.staff_name, designation:it.designation||"", role:it.designation||"",
        amount:Number(it.net_amount)||0, status:it.pay_status==="paid"?"Paid":"Pending",
        salaryDate:it.finalized_at?String(it.finalized_at).split("T")[0]:"", dueDate:null,
        paidDate:it.paid_at?String(it.paid_at).split("T")[0]:null, txRef:it.tx_ref||"",
        month:(it.month_num||1)-1, year:it.year_num, source:"Run",
      })));
    }).catch(()=>{});
    return()=>{ alive=false; };
  },[year]);
  // Manual records (legacy) tagged source:"Manual"; Run records appended.
  const combined=[...salaryRecords.map(r=>({...r,source:r.source||"Manual"})),...runRecs];

  const records=combined.filter(r=>{
    if(filterMonth==="current"&&(r.month!==month||r.year!==year)) return false;
    if(filterStatus!=="All"&&r.status!==filterStatus) return false;
    return true;
  });

  // Summary
  const allRecs=filterMonth==="current"?combined.filter(r=>r.month===month&&r.year===year):combined;
  const totalCreated=allRecs.reduce((s,r)=>s+r.amount,0);
  const totalPaid=allRecs.filter(r=>r.status==="Paid").reduce((s,r)=>s+r.amount,0);
  const totalPending=allRecs.filter(r=>r.status==="Pending").reduce((s,r)=>s+r.amount,0);
  const overdue=allRecs.filter(r=>r.status==="Pending"&&daysDiff2(r.dueDate)<0).length;
  const dueSoon=allRecs.filter(r=>r.status==="Pending"&&daysDiff2(r.dueDate)>=0&&daysDiff2(r.dueDate)<=7).length;

  const markPaid=async(rec)=>{
    if(rec.source==="Run"){
      // Run-generated payment → update payroll_run_items
      const itemId=String(rec.id).replace("run-","");
      try{ await api.patch("/payroll/run-items/"+itemId,{pay_status:"paid",payment_method:"manual",tx_ref:payForm.txRef}); }catch(err){console.error("Mark paid (run):",err);}
      setRunRecs(p=>p.map(r=>r.id===rec.id?{...r,status:"Paid",paidDate:payForm.paidDate,txRef:payForm.txRef}:r));
      setMarkPayModal(null);
      return;
    }
    try{
      await api.patch("/payroll/salary-records/"+rec.id,{status:"Paid",paid_date:payForm.paidDate,paid_by:payForm.paidBy,tx_ref:payForm.txRef});
    }catch(err){console.error("Mark paid:",err);}
    setSalaryRecords(p=>p.map(r=>r.id===rec.id?{...r,status:"Paid",paidDate:payForm.paidDate,paidBy:payForm.paidBy,txRef:payForm.txRef}:r));
    setMarkPayModal(null);
  };

  return(
    <div>
      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:12}}>
        {[
          {l:"Total Salary",v:`₹${fmt(totalCreated)}`,c:T.blu},
          {l:"Paid",v:`₹${fmt(totalPaid)}`,c:T.grn},
          {l:"Pending",v:`₹${fmt(totalPending)}`,c:totalPending>0?T.amb:T.grn},
          {l:"Overdue",v:overdue,c:overdue>0?T.red:T.grn,isBig:true},
          {l:"Due in 7 days",v:dueSoon,c:dueSoon>0?T.amb:T.grn,isBig:true},
        ].map((s,i)=>(
          <div key={i} style={{padding:"10px 13px",background:T.surface,border:`1.5px solid ${s.c}22`,borderRadius:8,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{s.l}</div>
            <div style={{fontSize:s.isBig?22:16,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Finance link notice */}
      {(overdue>0||dueSoon>0)&&(
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 13px",background:overdue>0?T.redL:T.ambL,border:`1px solid ${overdue>0?T.redM:T.ambM}`,borderRadius:7,marginBottom:10}}>
          <IcAlert size={13} color={overdue>0?T.red:T.amb}/>
          <span style={{fontSize:12,fontWeight:600,color:overdue>0?T.red:T.amb}}>
            {overdue>0?`${overdue} salary payments overdue!`:""} {dueSoon>0?`${dueSoon} payments due within 7 days — check Finance module`:""}
          </span>
          <span style={{marginLeft:"auto",fontSize:10.5,color:T.t4,display:"flex",alignItems:"center",gap:4}}>
            <IcFinLink size={11} color={T.t4}/> Visible in Finance → Pending Payments
          </span>
        </div>
      )}

      {/* Controls */}
      <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
        {["All","Pending","Paid"].map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)}
            style={{padding:"5px 13px",borderRadius:20,border:`1.5px solid ${filterStatus===s?T.blu:T.b1}`,background:filterStatus===s?T.bluL:"none",color:filterStatus===s?T.blu:T.t3,fontSize:11.5,fontWeight:filterStatus===s?700:400,cursor:"pointer"}}>
            {s} {s!=="All"&&<span style={{fontWeight:800}}>{allRecs.filter(r=>r.status===s).length}</span>}
          </button>
        ))}
        <div style={{display:"flex",gap:2,background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,padding:3,marginLeft:8}}>
          {[["current","This Month"],["all","All Time"]].map(([id,l])=>(
            <button key={id} onClick={()=>setFilterMonth(id)}
              style={{padding:"4px 10px",borderRadius:5,border:"none",background:filterMonth===id?T.blu:"none",color:filterMonth===id?"white":T.t3,fontSize:11.5,fontWeight:filterMonth===id?700:400,cursor:"pointer"}}>
              {l}
            </button>
          ))}
        </div>
        <span style={{fontSize:11,color:T.t4,marginLeft:4}}>{records.length} records · ₹{fmtN(records.reduce((s,r)=>s+r.amount,0))} total</span>
      </div>

      {/* Table */}
      <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 90px 110px 110px 110px 120px 90px",padding:"7px 14px",background:T.sb}}>
          {["Name / Role","Amount","Salary Date","Due Date","Days","Bank","Status"].map((h,i)=>(
            <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
          ))}
        </div>
        {records.map((rec,i)=>{
          const diff=daysDiff2(rec.dueDate);
          const isOverdue=diff!==null&&diff<0&&rec.status==="Pending";
          const isDueSoon=diff!==null&&diff>=0&&diff<=7&&rec.status==="Pending";
          const statusC=rec.status==="Paid"?{c:T.grn,bg:T.grnL,brd:T.grnM}:isOverdue?{c:T.red,bg:T.redL,brd:T.redM}:isDueSoon?{c:T.amb,bg:T.ambL,brd:T.ambM}:{c:T.slt,bg:T.sltL,brd:T.b2};
          return(
            <div key={rec.id} style={{display:"grid",gridTemplateColumns:"1fr 90px 110px 110px 110px 120px 90px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:i%2===0?"transparent":T.surfaceB,borderLeft:`3px solid ${statusC.c}55`}}
              onMouseEnter={e=>e.currentTarget.style.background=T.sltL}
              onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":T.surfaceB}>
              <div>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1,display:"flex",alignItems:"center",gap:6}}>
                  {rec.name}
                  <span style={{fontSize:8.5,fontWeight:700,padding:"1px 6px",borderRadius:10,textTransform:"uppercase",letterSpacing:.3,color:rec.source==="Run"?T.blu:T.slt,background:rec.source==="Run"?T.bluL:T.sltL,border:`1px solid ${rec.source==="Run"?T.blu:T.slt}33`}}>{rec.source==="Run"?"Run":"Manual"}</span>
                </div>
                <div style={{fontSize:10,color:T.t4}}>{rec.designation} · {rec.category||""} · {MONTHS[rec.month]} {rec.year}</div>
              </div>
              <span style={{fontSize:13,fontWeight:700,color:T.t1}}>₹{fmtN(rec.amount)}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{rec.salaryDate}</span>
              <div>
                <div style={{fontSize:11.5,fontWeight:600,color:isOverdue?T.red:isDueSoon?T.amb:T.t3}}>{rec.dueDate}</div>
                {isOverdue&&<div style={{fontSize:9,color:T.red,fontWeight:700}}>OVERDUE {Math.abs(diff)}d</div>}
                {isDueSoon&&<div style={{fontSize:9,color:T.amb,fontWeight:700}}>DUE IN {diff}d</div>}
              </div>
              <span style={{fontSize:11.5,color:T.t3}}>{rec.daysPresent==="NA"?"Fixed":`${rec.daysPresent}/${rec.totalDays}`}</span>
              <div>
                <div style={{fontSize:11,color:T.t2}}>{rec.bankName||"—"}</div>
                <div style={{fontSize:9.5,color:T.t4}}>{rec.accountNo?rec.accountNo.slice(-6)+"...":"—"}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <Pill label={rec.status} c={statusC.c} bg={statusC.bg} brd={statusC.brd}/>
                {rec.status==="Pending"&&(
                  <button onClick={()=>setMarkPayModal(rec)}
                    style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,cursor:"pointer",fontWeight:700}}>
                    Mark Paid
                  </button>
                )}
                {rec.status==="Paid"&&rec.paidDate&&(
                  <div style={{fontSize:9,color:T.t4}}>Paid {rec.paidDate}</div>
                )}
              </div>
            </div>
          );
        })}
        {records.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4,fontSize:13}}>No records match</div>}
      </div>

      {/* Mark Paid Modal */}
      {markPayModal&&(<>
        <div onClick={()=>setMarkPayModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400,backdropFilter:"blur(1px)"}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,width:"min(420px,95vw)",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
          <div style={{background:T.sb,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"white"}}>Mark as Paid</div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.45)"}}>{markPayModal.name} · ₹{fmtN(markPayModal.amount)}</div>
            </div>
            <button onClick={()=>setMarkPayModal(null)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={13}/></button>
          </div>
          <div style={{padding:"14px 16px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
              {[{l:"Paid Date",k:"paidDate",type:"date"},{l:"Paid By",k:"paidBy",ph:"Who processed"},{l:"Tx Reference",k:"txRef",ph:"UTR / Cheque no",col:2}].map(f=>(
                <div key={f.k} style={{gridColumn:f.col===2?"span 2":"span 1"}}>
                  <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{f.l}</label>
                  <input type={f.type||"text"} value={payForm[f.k]} onChange={e=>setPayForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}
                    style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                    onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
              ))}
            </div>
            {/* Finance sync note */}
            <div style={{padding:"7px 10px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:6,marginBottom:12,fontSize:11.5,color:T.grn}}>
              <IcFinLink size={11} color={T.grn} style={{marginRight:5}}/> Payment will sync to Finance module automatically
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setMarkPayModal(null)} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>markPaid(markPayModal)}
                style={{flex:2,padding:"9px",borderRadius:7,background:T.grn,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <IcChk size={14} color="white"/> Confirm Payment
              </button>
            </div>
          </div>
        </div>
      </>)}
    </div>
  );
}


// ── MOBILE PUNCH IN/OUT ───────────────────────────────────────────
function MobilePunchTab(){
  const [punchState,setPunchState]=useState("out");
  const [selProject,setSelProject]=useState("");
  const [location,setLocation]=useState(null);
  const [locLoading,setLocLoading]=useState(false);
  const [punchLog,setPunchLog]=useState([]);
  const [workerName,setWorkerName]=useState("");
  const [punchTime,setPunchTime]=useState(null);

  useEffect(()=>{
    (async()=>{
      try{
        const res=await api.get("/payroll/punch-logs");
        setPunchLog((res.data?.data||[]).map(p=>{
          const t=p.punch_time?new Date(p.punch_time):new Date();
          return{id:p.id,name:p.name,action:p.action,project:p.project||"",
            time:t.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}),
            date:t.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
            lat:p.lat,lng:p.lng,location:p.location||""};
        }));
      }catch(err){console.error(err);}
    })();
  },[]);

  useEffect(()=>{
    const allW=[...MONTHLY_STAFF.map(e=>e.name),...DAILY_WORKERS.map(w=>w.name)];
    if(allW.length>0&&!workerName) setWorkerName(allW[0]);
  },[workerName]);

  const getLocation=()=>{
    setLocLoading(true);
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        pos=>{setLocation({lat:pos.coords.latitude,lng:pos.coords.longitude,address:`${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E`});setLocLoading(false);},
        ()=>{setLocation({lat:0,lng:0,address:"Location permission denied"});setLocLoading(false);},
        {timeout:10000}
      );
    }else{setLocation({lat:0,lng:0,address:"GPS not available"});setLocLoading(false);}
  };

  const doPunch=async(action)=>{
    const now=new Date();
    const timeStr=now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
    const entry={
      id:Date.now(),name:workerName,action,project:selProject||"Unknown",
      time:timeStr,date:now.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
      lat:location?.lat||0,lng:location?.lng||0,
      location:location?.address||"Location not captured",
    };
    setPunchLog(p=>[entry,...p]);
    setPunchState(action==="IN"?"in":"out");
    setPunchTime(timeStr);
    try{
      await api.post("/payroll/punch-logs",{name:workerName,action,project:selProject||null,punch_time:now.toISOString(),lat:location?.lat||null,lng:location?.lng||null,location:location?.address||null});
    }catch(err){console.error("Punch:",err);}
  };

  const ALL_WORKERS=[...MONTHLY_STAFF.map(e=>e.name),...DAILY_WORKERS.map(w=>w.name)];

  return(
    <div style={{maxWidth:480,margin:"0 auto"}}>
      {/* Mobile-style header */}
      <div style={{background:T.sb,borderRadius:12,padding:"16px 20px",marginBottom:14,textAlign:"center"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Site Attendance</div>
        <div style={{fontSize:28,fontWeight:800,color:"white",letterSpacing:"-1px"}}>
          {new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true})}
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:2}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
      </div>

      {/* Worker select */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,padding:"13px 16px",marginBottom:10}}>
        <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:6}}>Worker / Employee</label>
        <SearchSelect value={workerName} options={ALL_WORKERS}
          onChange={v=>setWorkerName(v)} placeholder="Select worker..."/>
      </div>

      {/* Project select */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,padding:"13px 16px",marginBottom:10}}>
        <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:6}}>Project / Site</label>
        <SearchSelect value={selProject} options={PROJECTS}
          onChange={v=>setSelProject(v)} placeholder="Select project..."/>
      </div>

      {/* GPS Location */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${location?T.grnM:T.b1}`,padding:"13px 16px",marginBottom:14,transition:"border .2s"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:location?T.grnL:T.sltL,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <IcGPS size={15} color={location?T.grn:T.slt}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:location?T.grn:T.t2}}>
                {location?"Location Captured":"GPS Location"}
              </div>
              <div style={{fontSize:10.5,color:T.t4}}>{location?location.address:"Not captured yet"}</div>
            </div>
          </div>
          <button onClick={getLocation} disabled={locLoading}
            style={{padding:"7px 13px",borderRadius:7,background:location?T.grnL:T.blu,color:location?T.grn:"white",border:`1px solid ${location?T.grnM:"transparent"}`,fontSize:12,fontWeight:700,cursor:locLoading?"wait":"pointer"}}>
            {locLoading?"Detecting...":(location?"Re-capture":"Capture GPS")}
          </button>
        </div>
        {location&&<div style={{marginTop:6,fontSize:10,color:T.t4,fontFamily:"monospace"}}>
          {location.lat.toFixed(4)}° N, {location.lng.toFixed(4)}° E
        </div>}
      </div>

      {/* PUNCH BUTTONS — big mobile-friendly */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {/* PUNCH IN */}
        <button
          onClick={()=>{if(!selProject){alert("Please select a project first");return;}doPunch("IN");}}
          disabled={punchState==="in"}
          style={{
            padding:"24px 16px",borderRadius:14,
            background:punchState==="in"?T.grnL:`linear-gradient(135deg,${T.grn},#047857)`,
            color:punchState==="in"?T.grn:"white",
            border:punchState==="in"?`2px solid ${T.grnM}`:"none",
            cursor:punchState==="in"?"default":"pointer",
            fontSize:15,fontWeight:800,
            boxShadow:punchState==="in"?"none":"0 8px 24px rgba(5,150,105,0.4)",
            transition:"all .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:8
          }}>
          <IcClockIn size={28} color={punchState==="in"?T.grn:"white"}/>
          {punchState==="in"?"PUNCHED IN":"PUNCH IN"}
          {punchState==="in"&&punchTime&&<span style={{fontSize:11,fontWeight:400}}>at {punchTime}</span>}
        </button>
        {/* PUNCH OUT */}
        <button
          onClick={()=>{if(!selProject){alert("Please select a project first");return;}doPunch("OUT");}}
          disabled={punchState==="out"}
          style={{
            padding:"24px 16px",borderRadius:14,
            background:punchState==="out"?T.sltL:`linear-gradient(135deg,${T.red},#b91c1c)`,
            color:punchState==="out"?T.slt:"white",
            border:punchState==="out"?`2px solid ${T.b2}`:"none",
            cursor:punchState==="out"?"default":"pointer",
            fontSize:15,fontWeight:800,
            boxShadow:punchState==="out"?"none":"0 8px 24px rgba(220,38,38,0.4)",
            transition:"all .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:8
          }}>
          <IcClockIn size={28} color={punchState==="out"?T.slt:"white"}/>
          {punchState==="out"?"NOT PUNCHED":"PUNCH OUT"}
        </button>
      </div>

      {/* Today's punch log */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:12,fontWeight:700,color:T.t1}}>Today's Punch Log</span>
          <span style={{fontSize:10.5,color:T.t4}}>{punchLog.length} entries</span>
        </div>
        {punchLog.slice(0,6).map((p,i)=>(
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderBottom:i<punchLog.length-1?`1px solid ${T.b1}`:"none"}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:p.action==="IN"?T.grnL:T.redL,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <IcClockIn size={13} color={p.action==="IN"?T.grn:T.red}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{p.name}</span>
                <span style={{fontSize:10.5,fontWeight:700,color:p.action==="IN"?T.grn:T.red}}>{p.action}</span>
                <span style={{fontSize:10.5,color:T.t4}}>{p.time}</span>
              </div>
              <div style={{fontSize:10.5,color:T.t4,display:"flex",alignItems:"center",gap:4,marginTop:1}}>
                <IcGPS size={9} color={T.t4}/>{p.location}
              </div>
            </div>
            <div style={{fontSize:10.5,color:T.t4,textAlign:"right"}}>
              <div>{p.project.slice(0,15)}{p.project.length>15?"…":""}</div>
              <div>{p.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PAYROLL SETTINGS SECTION ──────────────────────────────────────
function PayrollSettingsTab({defaultDueDays,setDefaultDueDays,workingDays,setWorkingDays}){
  const [saved,setSaved]=useState(false);
  const [localDays,setLocalDays]=useState(defaultDueDays);
  const [localWorkDays,setLocalWorkDays]=useState(workingDays);

  const save=async()=>{
    setDefaultDueDays(Number(localDays));
    if(setWorkingDays) setWorkingDays(Number(localWorkDays));
    try{await api.put("/payroll/settings",{default_due_days:Number(localDays),working_days:Number(localWorkDays)});}catch(err){console.error("Save settings:",err);}
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  // Attendance auto-punch-out settings (separate endpoint).
  const [att,setAtt]=useState(null);
  const [attSaved,setAttSaved]=useState(false);
  useEffect(()=>{ api.get("/attendance-sessions/settings").then(r=>{ if(r&&r.success) setAtt(r.data); }).catch(()=>{}); },[]);
  const setA=(k,v)=>setAtt(p=>({...p,[k]:v}));
  const saveAtt=async()=>{
    try{ const r=await api.put("/attendance-sessions/settings",att); if(r&&r.success) setAtt(r.data); }catch(e){ console.error("Save att settings:",e); }
    setAttSaved(true); setTimeout(()=>setAttSaved(false),2000);
  };

  return(
    <div style={{maxWidth:600}}>
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:14}}>
        <div style={{padding:"12px 16px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:8}}>
          <IcPay size={14} color={T.blu}/>
          <span style={{fontSize:13,fontWeight:700,color:T.t1}}>Salary Payment Settings</span>
        </div>
        <div style={{padding:"16px"}}>
          {/* Default due days */}
          <div style={{marginBottom:18}}>
            <label style={{fontSize:11,fontWeight:700,color:T.t1,display:"block",marginBottom:4}}>
              Default Payment Due Days
            </label>
            <div style={{fontSize:12,color:T.t3,marginBottom:8,lineHeight:1.6}}>
              After salary creation date, how many days later should payment be due?
              <br/>Example: Salary created on 30 March + <strong>{localDays} days</strong> = Due on {addDays("2026-03-30",Number(localDays))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <input type="range" min={1} max={30} value={localDays} onChange={e=>setLocalDays(e.target.value)}
                style={{flex:1,accentColor:T.blu}}/>
              <div style={{display:"flex",alignItems:"center",gap:6,background:T.bluL,border:`1.5px solid ${T.bluM}`,borderRadius:8,padding:"6px 12px"}}>
                <input type="number" min={1} max={30} value={localDays} onChange={e=>setLocalDays(e.target.value)}
                  style={{width:40,border:"none",background:"transparent",fontSize:18,fontWeight:800,color:T.blu,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                <span style={{fontSize:12,color:T.blu,fontWeight:600}}>days</span>
              </div>
            </div>

            {/* Quick presets */}
            <div style={{display:"flex",gap:7,marginTop:8,flexWrap:"wrap"}}>
              {[[5,"5 Days"],[7,"1 Week"],[10,"10 Days"],[15,"15 Days"],[30,"Month End"]].map(([d,l])=>(
                <button key={d} onClick={()=>setLocalDays(d)}
                  style={{padding:"4px 12px",borderRadius:20,border:`1.5px solid ${Number(localDays)===d?T.blu:T.b1}`,background:Number(localDays)===d?T.bluL:"none",color:Number(localDays)===d?T.blu:T.t3,fontSize:11.5,fontWeight:Number(localDays)===d?700:400,cursor:"pointer"}}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Warning period */}
          <div style={{padding:"12px 14px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:8,marginBottom:16}}>
            <div style={{fontSize:11.5,fontWeight:700,color:T.amb,marginBottom:4}}>Finance Alert Settings</div>
            <div style={{fontSize:12,color:"#92400E",lineHeight:1.6}}>
              Salary payments appear in Finance → Pending Payments when due date is within
              <strong style={{color:T.amb,margin:"0 4px"}}>7 days</strong>
              (fixed). Overdue payments are highlighted in red immediately.
            </div>
          </div>

          {/* Working days */}
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:700,color:T.t1,display:"block",marginBottom:4}}>Working Days Per Month</label>
            <div style={{fontSize:12,color:T.t3,marginBottom:6}}>Used to calculate pro-rata attendance-based salaries</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="number" min={20} max={31} value={localWorkDays} onChange={e=>setLocalWorkDays(e.target.value)}
                style={{width:70,padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:14,fontWeight:600,color:T.t1,outline:"none",textAlign:"center",fontFamily:"inherit"}}/>
              <span style={{fontSize:12,color:T.t3}}>days (current: {workingDays} days)</span>
            </div>
          </div>

          <button onClick={save}
            style={{padding:"10px 24px",borderRadius:8,background:saved?T.grn:T.blu,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:7,transition:"background .2s"}}>
            {saved?<><IcChk size={14} color="white"/> Settings Saved!</>:<><IcChk size={14} color="white"/> Save Settings</>}
          </button>
        </div>
      </div>

      {/* Finance pending payments preview */}
      <div style={{background:T.surface,borderRadius:10,border:`1.5px solid ${T.ambM}`,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",background:T.ambL,borderBottom:`1px solid ${T.ambM}`,display:"flex",alignItems:"center",gap:8}}>
          <IcFinLink size={14} color={T.amb}/>
          <span style={{fontSize:13,fontWeight:700,color:T.amb}}>How Finance Integration Works</span>
        </div>
        <div style={{padding:"14px 16px"}}>
          {[
            {step:"1",title:"Salary Create karo",desc:"Payroll → Manual Salary tab mein entry banao — name, amount, due date set karo",c:T.blu},
            {step:"2",title:"Auto Finance Queue",desc:"Due date 7 days se kam bacha → Finance → Pending Payments mein amber warning",c:T.amb},
            {step:"3",title:"Due Date pe Red Alert",desc:"Due date aa gayi → Finance mein red urgent highlight",c:T.red},
            {step:"4",title:"Finance Mark Paid",desc:"Finance team payment kare → Salary Ledger mein Paid update ho jaata hai",c:T.grn},
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:12,marginBottom:i<3?12:0}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:s.c,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:800,color:"white"}}>{s.step}</div>
              <div><div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{s.title}</div><div style={{fontSize:11.5,color:T.t3,marginTop:2}}>{s.desc}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance & Auto Punch-Out settings */}
      {att && (
        <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,overflow:"hidden",marginTop:14}}>
          <div style={{padding:"12px 16px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:15}}>📍</span>
            <span style={{fontSize:13,fontWeight:700,color:T.t1}}>Attendance & Auto Punch-Out</span>
          </div>
          <div style={{padding:"16px"}}>
            <div style={{fontSize:11.5,color:T.t3,marginBottom:6,lineHeight:1.6}}>
              Worker punch-out karna bhool jaye to system khud handle karega — har auto-close <b>HR review queue</b> me jata hai (Attendance tab), salary se pehle review zaroori.
            </div>
            {[
              {k:"autoclose_enabled",nk:"max_shift_hours",t:"Auto-close long sessions",d:"Itne ghante se zyada open session khud band (out-time = last GPS ping)",suf:"hours",mn:1,mx:24},
              {k:"geo_exit_enabled",nk:"geo_exit_minutes",t:"Site se bahar → auto punch-out",d:"Fence se itne min continuous bahar = auto punch-out (exit time pe)",suf:"min",mn:1,mx:240},
              {k:"reminder_enabled",nk:"reminder_after_hours",t:"Punch-out reminder",d:"Itne ghante baad worker ko 'still punched in' notification",suf:"hours",mn:1,mx:24},
            ].map(row=>(
              <div key={row.k} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderTop:`1px solid ${T.b1}`}}>
                <label style={{position:"relative",display:"inline-block",width:38,height:22,flexShrink:0,marginTop:2}}>
                  <input type="checkbox" checked={att[row.k]==="1"} onChange={e=>setA(row.k,e.target.checked?"1":"0")} style={{opacity:0,width:0,height:0}}/>
                  <span style={{position:"absolute",cursor:"pointer",inset:0,background:att[row.k]==="1"?T.grn:T.t4,borderRadius:22,transition:".2s"}}>
                    <span style={{position:"absolute",height:16,width:16,left:att[row.k]==="1"?19:3,top:3,background:"white",borderRadius:"50%",transition:".2s"}}/>
                  </span>
                </label>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{row.t}</div>
                  <div style={{fontSize:11,color:T.t3,marginTop:2,lineHeight:1.5}}>{row.d}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,opacity:att[row.k]==="1"?1:0.4}}>
                  <input type="number" min={row.mn} max={row.mx} value={att[row.nk]} disabled={att[row.k]!=="1"}
                    onChange={e=>setA(row.nk,e.target.value)}
                    style={{width:52,padding:"7px 8px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:14,fontWeight:700,color:T.t1,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                  <span style={{fontSize:11,color:T.t3,fontWeight:600}}>{row.suf}</span>
                </div>
              </div>
            ))}
            <button onClick={saveAtt}
              style={{marginTop:14,padding:"10px 24px",borderRadius:8,background:attSaved?T.grn:T.blu,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:7}}>
              <IcChk size={14} color="white"/> {attSaved?"Saved!":"Save Attendance Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── DAILY WAGES LABOUR: Workers CRUD Tab (Phase 3) ───────────────
// ══════════════════════════════════════════════════════════════════
function DailyWorkersTab({workers,setWorkers,isAdmin}){
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null); // {mode:"add"|"edit", data:{}}
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");

  const SKILLS=["Mason","Helper","Electrician","Plumber","Painter","Carpenter","Steel Fixer","Welder","Supervisor","Other"];

  const open=(mode,data)=>{
    setModal({mode,data: data || {name:"",skill:"",rate_per_day:"",rate_ot:"",phone:"",contractor:"",project:""}});
    setErr("");
  };
  const close=()=>{ if(!saving){ setModal(null); setErr(""); } };

  const save=async()=>{
    const d=modal.data;
    if(!d.name || !d.name.trim()){ setErr("Name is required"); return; }
    if(!d.rate_per_day || Number(d.rate_per_day)<=0){ setErr("Rate per day required"); return; }
    setSaving(true);setErr("");
    try{
      const payload={
        name:d.name.trim(),
        skill:d.skill||null,
        trade:d.skill||null,
        rate_per_day:Number(d.rate_per_day)||0,
        rate_ot:Number(d.rate_ot)||0,
        phone:d.phone||null,
        contractor:d.contractor||null,
        project:d.project||null,
      };
      let res;
      if(modal.mode==="add"){
        res=await api.post("/payroll/workers",payload);
      }else{
        res=await api.patch(`/payroll/workers/${d.id}`,payload);
      }
      if(res.success){
        // Reload workers list
        const r=await api.get("/payroll/workers");
        if(r.success){
          setWorkers((r.data?.data||r.data||[]).map(w=>({
            id:w.id,name:w.name,trade:w.trade||w.skill||"",skill:w.skill||w.trade||"",
            ratePerDay:Number(w.rate_per_day)||0,rateOT:Number(w.rate_ot)||0,
            rate_per_day:Number(w.rate_per_day)||0,rate_ot:Number(w.rate_ot)||0,
            project:w.project||"",contractor:w.contractor||"Self",phone:w.phone||"",
          })));
        }
        setModal(null);
      }else{ setErr(res.message||"Save failed"); }
    }catch(e){ setErr(e.message||"Network error"); }
    setSaving(false);
  };

  const remove=async(w)=>{
    if(!await window.confirmAsync(`Remove worker "${w.name}"?`)) return;
    try{
      const res=await api.delete(`/payroll/workers/${w.id}`);
      if(res.success) setWorkers(p=>p.filter(x=>x.id!==w.id));
    }catch(e){ alert(e.message); }
  };

  const filtered=workers.filter(w=>!search||
    (w.name||"").toLowerCase().includes(search.toLowerCase())||
    (w.skill||w.trade||"").toLowerCase().includes(search.toLowerCase()));

  return(
    <div>
      {/* Header */}
      <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",minWidth:240}}>
          <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={12} color={T.t4}/></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or skill..."
            style={{height:32,padding:"0 8px 0 26px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",width:"100%"}}/>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11.5,color:T.t3}}>Total: <b style={{color:T.t1}}>{workers.length}</b></span>
          {isAdmin&&<button onClick={()=>open("add")}
            style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcAdd size={13} color="white"/> Add Worker
          </button>}
        </div>
      </div>

      {filtered.length===0&&<EmptyState icon={<div style={{fontSize:40}}>👷</div>} message={search?"No matching workers":"No workers yet"} sub={search?"":"Add workers to start tracking attendance"}/>}

      {/* Table */}
      {filtered.length>0&&(
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 1fr 1.3fr 1fr 100px",padding:"8px 14px",background:"#0D1B2A"}}>
            {["Worker","Skill","Rate/Day","OT Rate","Contractor","Phone","Actions"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
            ))}
          </div>
          {filtered.map((w,i)=>(
            <div key={w.id} style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 1fr 1.3fr 1fr 100px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:i%2===0?"transparent":T.surfaceB}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <Avatar name={w.name} size={28} color={T.amb}/>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{w.name}</div>
              </div>
              <span style={{fontSize:11.5,color:T.t2}}>{w.skill||w.trade||"—"}</span>
              <span style={{fontSize:12,fontWeight:600,color:T.t1}}>₹{fmtN(w.ratePerDay||w.rate_per_day||0)}</span>
              <span style={{fontSize:12,color:T.t3}}>₹{fmtN(w.rateOT||w.rate_ot||0)}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{w.contractor||"Self"}</span>
              <span style={{fontSize:11,color:T.t4}}>{w.phone||"—"}</span>
              <div style={{display:"flex",gap:5}}>
                {isAdmin&&<>
                  <button onClick={()=>open("edit",{...w,rate_per_day:w.ratePerDay||w.rate_per_day,rate_ot:w.rateOT||w.rate_ot,skill:w.skill||w.trade})}
                    style={{padding:"4px 8px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    <IcEdit size={11} color={T.blu}/>
                  </button>
                  <button onClick={()=>remove(w)}
                    style={{padding:"4px 8px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    <IcX size={11} color={T.red}/>
                  </button>
                </>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div onClick={close} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:T.surface,borderRadius:12,padding:22,width:480,maxWidth:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:800,color:T.t1}}>
                {modal.mode==="add"?"Add Worker":"Edit Worker"}
              </div>
              <button onClick={close} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.t4}}>
                <IcX size={18}/>
              </button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{gridColumn:"span 2"}}>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>Name *</label>
                <input value={modal.data.name} onChange={e=>setModal({...modal,data:{...modal.data,name:e.target.value}})}
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>Skill</label>
                <SearchSelect value={modal.data.skill||""} options={SKILLS} onChange={v=>setModal({...modal,data:{...modal.data,skill:v}})} placeholder="Select skill..."/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>Phone</label>
                <input value={modal.data.phone||""} onChange={e=>setModal({...modal,data:{...modal.data,phone:e.target.value}})}
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>Rate per Day *</label>
                <input type="number" value={modal.data.rate_per_day} onChange={e=>setModal({...modal,data:{...modal.data,rate_per_day:e.target.value}})}
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>OT Rate (per hour)</label>
                <input type="number" value={modal.data.rate_ot||""} onChange={e=>setModal({...modal,data:{...modal.data,rate_ot:e.target.value}})}
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>Contractor</label>
                <input value={modal.data.contractor||""} onChange={e=>setModal({...modal,data:{...modal.data,contractor:e.target.value}})} placeholder="Self"
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>Project</label>
                <SearchSelect value={modal.data.project||""} options={PROJECTS||[]} onChange={v=>setModal({...modal,data:{...modal.data,project:v}})} placeholder="— Any project —"/>
              </div>
            </div>

            {err && <div style={{background:T.redL,color:T.red,padding:"7px 10px",borderRadius:6,fontSize:11,marginTop:12,border:`1px solid ${T.redM}`}}>{err}</div>}

            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={close} disabled={saving}
                style={{padding:"8px 16px",borderRadius:7,background:"none",border:`1.5px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                style={{padding:"8px 18px",borderRadius:7,background:saving?T.b1:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer"}}>
                {saving?"Saving...":"Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── DAILY WAGES LABOUR: Payments Tab (Phase 3) ───────────────────
// ══════════════════════════════════════════════════════════════════
// ── WORKER PAYMENT DRAWER (right slide) ──────────────────────────
function WorkerPaymentDrawer({worker,attMonth,month,year,onClose,onMarkPaid,paymentsForWorker,isAdmin}){
  const today=new Date();
  const iso=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const lastSunday=(()=>{const x=new Date(today);x.setDate(x.getDate()-x.getDay());return x;})();
  const [from,setFrom]=useState(iso(lastSunday));
  const [to,setTo]=useState(iso(today));

  // Stats: parse from attMonth (current month attendance)
  const stats=useMemo(()=>{
    const fromD=new Date(from), toD=new Date(to);
    let P=0,H=0,A=0,OT=0,total=0;
    const breakdown=[];
    for (let dt=new Date(fromD); dt<=toD; dt.setDate(dt.getDate()+1)) {
      const d=dt.getDate(), m=dt.getMonth(), y=dt.getFullYear();
      let entry=null;
      if (m===month && y===year) {
        entry=attMonth[worker.id]?.[d]||null;
      }
      const status=entry?.status||"";
      const ot=Number(entry?.ot)||0;
      let dayPay=0;
      if (status==="P") { P++; dayPay=Number(worker.ratePerDay)+ot*Number(worker.rateOT||0); OT+=ot; }
      else if (status==="H") { H++; dayPay=Number(worker.ratePerDay)/2; }
      else if (status==="A") A++;
      total+=dayPay;
      breakdown.push({date:iso(dt),status:status||"—",ot,pay:dayPay,dow:dt.getDay()});
    }
    return {P,H,A,OT,total,breakdown};
  },[from,to,attMonth,worker,month,year]);

  // Existing payments for this worker in range
  const matchingPayments=(paymentsForWorker||[]).filter(p=>{
    const ps=String(p.period_start||"").split("T")[0];
    const pe=String(p.period_end||"").split("T")[0];
    return ps>=from || pe<=to || (ps<=to && pe>=from);
  });
  const alreadyPaid=matchingPayments.filter(p=>p.status==="paid").reduce((s,p)=>s+Number(p.net_amount||0),0);

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400}}/>
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(540px,95vw)",background:T.surface,boxShadow:"-12px 0 32px rgba(0,0,0,0.18)",zIndex:401,display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease-out"}}>
      {/* Header */}
      <div style={{padding:"15px 20px",background:"linear-gradient(135deg,#0D1B2A 0%,#1B2C3F 100%)",color:"white",display:"flex",alignItems:"center",gap:12}}>
        <Avatar name={worker.name} size={42} color={T.amb}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700}}>{worker.name}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}>{worker.trade} · ₹{fmtN(worker.ratePerDay)}/day · OT ₹{fmtN(worker.rateOT||0)}/hr</div>
        </div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:6,color:"white",fontSize:18,width:30,height:30,cursor:"pointer"}}>×</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
        {/* Date range */}
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
          <div style={{fontSize:11,color:T.t3,fontWeight:600}}>Period:</div>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{padding:"5px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,fontFamily:"inherit"}}/>
          <span style={{fontSize:11,color:T.t4}}>to</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{padding:"5px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,fontFamily:"inherit"}}/>
          <button onClick={()=>{setFrom(iso(lastSunday));setTo(iso(today));}} style={{padding:"4px 10px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10.5,fontWeight:700,cursor:"pointer"}}>Last Sun → today</button>
        </div>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
          {[
            {l:"Present",v:stats.P,c:T.grn,bg:T.grnL},
            {l:"Half Day",v:stats.H,c:T.amb,bg:T.ambL},
            {l:"Absent",v:stats.A,c:T.red,bg:T.redL},
            {l:"OT hrs",v:stats.OT,c:T.pur,bg:T.purL},
          ].map((s,i)=>(
            <div key={i} style={{padding:"10px 8px",background:s.bg,borderRadius:7,border:`1px solid ${s.c}33`,textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
              <div style={{fontSize:9.5,color:s.c,fontWeight:600,marginTop:1,textTransform:"uppercase"}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Total + Already paid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          <div style={{padding:"12px 14px",background:`linear-gradient(135deg,${T.blu}12,${T.blu}06)`,borderRadius:8,border:`1.5px solid ${T.bluM}`}}>
            <div style={{fontSize:10,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>Period Payable</div>
            <div style={{fontSize:22,fontWeight:800,color:T.blu,marginTop:3}}>₹{fmtN(stats.total)}</div>
          </div>
          <div style={{padding:"12px 14px",background:`linear-gradient(135deg,${T.grn}12,${T.grn}06)`,borderRadius:8,border:`1.5px solid ${T.grnM}`}}>
            <div style={{fontSize:10,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>Already Paid</div>
            <div style={{fontSize:22,fontWeight:800,color:T.grn,marginTop:3}}>₹{fmtN(alreadyPaid)}</div>
          </div>
        </div>

        {/* Daily breakdown */}
        <div style={{fontSize:12,fontWeight:700,color:T.t2,marginBottom:6}}>Daily breakdown</div>
        <div style={{maxHeight:240,overflowY:"auto",border:`1px solid ${T.b1}`,borderRadius:7,marginBottom:14}}>
          <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse"}}>
            <thead style={{background:T.surfaceB,position:"sticky",top:0}}>
              <tr><th style={{padding:"6px 10px",textAlign:"left",fontSize:10,color:T.t4,fontWeight:600}}>DATE</th><th style={{padding:"6px 8px",textAlign:"center",fontSize:10,color:T.t4,fontWeight:600}}>DAY</th><th style={{padding:"6px 8px",textAlign:"center",fontSize:10,color:T.t4,fontWeight:600}}>STATUS</th><th style={{padding:"6px 8px",textAlign:"center",fontSize:10,color:T.t4,fontWeight:600}}>OT</th><th style={{padding:"6px 10px",textAlign:"right",fontSize:10,color:T.t4,fontWeight:600}}>PAY</th></tr>
            </thead>
            <tbody>
              {stats.breakdown.map((b,i)=>{
                const sColor=b.status==="P"?T.grn:b.status==="H"?T.amb:b.status==="A"?T.red:T.t4;
                const dayName=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][b.dow];
                return(
                  <tr key={i} style={{borderTop:`1px solid ${T.b1}`,background:b.dow===0?T.redL+"55":"transparent"}}>
                    <td style={{padding:"5px 10px",color:T.t1}}>{b.date}</td>
                    <td style={{padding:"5px 8px",textAlign:"center",color:b.dow===0?T.red:T.t3}}>{dayName}</td>
                    <td style={{padding:"5px 8px",textAlign:"center"}}><span style={{fontWeight:700,color:sColor}}>{b.status}</span></td>
                    <td style={{padding:"5px 8px",textAlign:"center",color:T.t3}}>{b.ot||"—"}</td>
                    <td style={{padding:"5px 10px",textAlign:"right",fontWeight:600,color:b.pay>0?T.t1:T.t4}}>{b.pay>0?`₹${fmtN(b.pay)}`:"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Existing payment records */}
        {matchingPayments.length>0&&(<>
          <div style={{fontSize:12,fontWeight:700,color:T.t2,marginBottom:6}}>Payment records ({matchingPayments.length})</div>
          <div style={{border:`1px solid ${T.b1}`,borderRadius:7,marginBottom:14}}>
            {matchingPayments.map((p,i)=>{
              const stColor=p.status==="paid"?T.grn:p.status==="cancelled"?T.slt:T.amb;
              const stBg=p.status==="paid"?T.grnL:p.status==="cancelled"?T.sltL:T.ambL;
              return(
                <div key={p.id} style={{padding:"9px 12px",borderTop:i>0?`1px solid ${T.b1}`:"none",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11.5,fontWeight:600,color:T.t1}}>₹{fmtN(p.net_amount)} <span style={{color:T.t4,fontWeight:400}}>({Number(p.days_worked||0)}d, {Number(p.ot_hours||0)}h OT)</span></div>
                    <div style={{fontSize:10.5,color:T.t4,marginTop:1}}>{String(p.period_start).split("T")[0]} → {String(p.period_end).split("T")[0]}</div>
                  </div>
                  <span style={{padding:"3px 9px",borderRadius:11,background:stBg,color:stColor,fontSize:10,fontWeight:700,textTransform:"capitalize",border:`1px solid ${stColor}33`}}>{p.status}</span>
                  {p.status==="pending"&&isAdmin&&<button onClick={()=>onMarkPaid(p,"cash")} style={{padding:"4px 10px",borderRadius:5,background:T.grn,color:"white",border:"none",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>✓ Mark Paid</button>}
                </div>
              );
            })}
          </div>
        </>)}

        {matchingPayments.length===0&&stats.total>0&&(
          <div style={{padding:12,background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,fontSize:11.5,color:T.amb}}>
            ⚡ Is period ke liye payment generate nahi hua. Payments tab pe "Generate Payments" button click karo.
          </div>
        )}
      </div>
    </div>
    <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
  </>);
}

function DailyPaymentsTab({workers,isAdmin,attMonth,month,year}){
  // Cycle presets
  const today=new Date();
  // TZ-safe local date string
  const iso=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  // Sunday-start week (matches user's mental model)
  const startOfWeek=(d)=>{const x=new Date(d); x.setDate(x.getDate()-x.getDay()); return x;};
  const startOfMonth=(d)=>new Date(d.getFullYear(),d.getMonth(),1);
  const endOfMonth=(d)=>new Date(d.getFullYear(),d.getMonth()+1,0);
  const [drawerWorker,setDrawerWorker]=useState(null);

  const [cycle,setCycle]=useState("weekly"); // weekly | monthly | custom
  const [from,setFrom]=useState(iso(startOfWeek(today)));
  const [to,setTo]=useState(iso(today));
  const [payments,setPayments]=useState([]);
  const [loading,setLoading]=useState(false);
  const [generating,setGenerating]=useState(false);
  const [err,setErr]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");

  const applyCycle=(c)=>{
    setCycle(c);
    if(c==="weekly"){ setFrom(iso(startOfWeek(today))); setTo(iso(today)); }
    else if(c==="monthly"){ setFrom(iso(startOfMonth(today))); setTo(iso(endOfMonth(today))); }
  };

  const load=useCallback(async()=>{
    setLoading(true);setErr("");
    try{
      const r=await api.get(`/payroll/daily-labour/payments?from=${from}&to=${to}${statusFilter!=="all"?"&status="+statusFilter:""}`);
      if(r.success) setPayments(r.data||[]);
    }catch(e){ setErr(e.message||"Load failed"); }
    setLoading(false);
  },[from,to,statusFilter]);
  useEffect(()=>{load();},[load]);

  const generate=async()=>{
    if(!await window.confirmAsync(`Generate payments from ${from} to ${to}?\n\nThis will compute payable amount per worker based on attendance in this period.`)) return;
    setGenerating(true);setErr("");
    try{
      const r=await api.post("/payroll/daily-labour/payments/generate",{
        period_start:from, period_end:to, cycle_type:cycle,
      });
      if(r.success){
        alert(`Generated ${r.count} payment records`);
        load();
      }else{ setErr(r.message||"Generation failed"); }
    }catch(e){ setErr(e.message||"Network error"); }
    setGenerating(false);
  };

  const markPaid=async(p,method)=>{
    try{
      const r=await api.patch(`/payroll/daily-labour/payments/${p.id}`,{status:"paid",payment_method:method});
      if(r.success) load();
    }catch(e){ alert(e.message); }
  };
  const cancel=async(p)=>{
    if(!await window.confirmAsync("Cancel this payment record?")) return;
    try{
      const r=await api.patch(`/payroll/daily-labour/payments/${p.id}`,{status:"cancelled"});
      if(r.success) load();
    }catch(e){ alert(e.message); }
  };

  const totalPayable=payments.filter(p=>p.status==="pending").reduce((s,p)=>s+Number(p.net_amount||0),0);
  const totalPaid=payments.filter(p=>p.status==="paid").reduce((s,p)=>s+Number(p.net_amount||0),0);

  return(
    <div>
      {/* Cycle presets + date range */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,padding:12,marginBottom:12}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:4,background:T.b1,padding:3,borderRadius:7}}>
            {["weekly","monthly","custom"].map(c=>(
              <button key={c} onClick={()=>applyCycle(c)}
                style={{padding:"6px 14px",border:"none",background:cycle===c?T.surface:"transparent",color:cycle===c?T.blu:T.t3,borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer",textTransform:"capitalize",boxShadow:cycle===c?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>
                {c}
              </button>
            ))}
          </div>

          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <label style={{fontSize:11,color:T.t3}}>From:</label>
            <input type="date" value={from} onChange={e=>{setFrom(e.target.value);setCycle("custom");}}
              style={{padding:"6px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}/>
            <label style={{fontSize:11,color:T.t3}}>To:</label>
            <input type="date" value={to} onChange={e=>{setTo(e.target.value);setCycle("custom");}}
              style={{padding:"6px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}/>
          </div>

          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
              style={{padding:"6px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {isAdmin&&<button onClick={generate} disabled={generating}
              style={{padding:"7px 16px",borderRadius:7,background:generating?T.b1:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:generating?"not-allowed":"pointer"}}>
              {generating?"Generating...":"⚡ Generate Payments"}
            </button>}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
        <div style={{padding:"11px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderLeft:`3px solid ${T.amb}`}}>
          <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>Pending Payable</div>
          <div style={{fontSize:18,fontWeight:700,color:T.amb,marginTop:3}}>₹{fmtN(totalPayable)}</div>
        </div>
        <div style={{padding:"11px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderLeft:`3px solid ${T.grn}`}}>
          <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>Paid</div>
          <div style={{fontSize:18,fontWeight:700,color:T.grn,marginTop:3}}>₹{fmtN(totalPaid)}</div>
        </div>
        <div style={{padding:"11px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderLeft:`3px solid ${T.blu}`}}>
          <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>Records</div>
          <div style={{fontSize:18,fontWeight:700,color:T.blu,marginTop:3}}>{payments.length}</div>
        </div>
      </div>

      {err && <div style={{background:T.redL,color:T.red,padding:"8px 12px",borderRadius:7,fontSize:12,marginBottom:10,border:`1px solid ${T.redM}`}}>{err}</div>}

      {/* Payments table */}
      {loading ? <LoadingSpinner/> :
        payments.length===0 ? <EmptyState icon={<div style={{fontSize:40}}>💰</div>} message="No payments in this period" sub="Click Generate Payments to create from attendance"/> :
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1.3fr 0.8fr 0.8fr 1.1fr 1.1fr 1fr 140px",padding:"8px 14px",background:"#0D1B2A"}}>
            {["Worker","Period","Days","OT hrs","Gross","Net","Status","Actions"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
            ))}
          </div>
          {payments.map((p,i)=>{
            const st=p.status;
            const stColor=st==="paid"?T.grn:st==="cancelled"?T.slt:T.amb;
            const stBg=st==="paid"?T.grnL:st==="cancelled"?T.sltL:T.ambL;
            return(
              <div key={p.id} style={{display:"grid",gridTemplateColumns:"2fr 1.3fr 0.8fr 0.8fr 1.1fr 1.1fr 1fr 140px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:i%2===0?"transparent":T.surfaceB,cursor:"pointer",transition:"background .1s"}}
                   onClick={()=>{const w=workers.find(x=>String(x.id)===String(p.worker_id)||x.name===p.worker_name); if(w)setDrawerWorker(w);}}
                   onMouseEnter={el=>el.currentTarget.style.background=T.bluL}
                   onMouseLeave={el=>el.currentTarget.style.background=i%2===0?"transparent":T.surfaceB}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Avatar name={p.worker_name||"?"} size={28} color={T.amb}/>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{p.worker_name} <span style={{fontSize:10,color:T.blu,fontWeight:500}}>›</span></div>
                    {p.project&&<div style={{fontSize:10,color:T.t4}}>{p.project}</div>}
                  </div>
                </div>
                <span style={{fontSize:10.5,color:T.t3}}>
                  {p.period_start?.split("T")[0]}<br/>{p.period_end?.split("T")[0]}
                </span>
                <span style={{fontSize:12,color:T.t2}}>{Number(p.days_worked||0)}</span>
                <span style={{fontSize:12,color:T.t3}}>{Number(p.ot_hours||0)}</span>
                <span style={{fontSize:12,color:T.t2}}>₹{fmtN(p.gross_amount)}</span>
                <span style={{fontSize:13,fontWeight:800,color:st==="paid"?T.grn:T.t1}}>₹{fmtN(p.net_amount)}</span>
                <span style={{display:"inline-flex",padding:"3px 9px",borderRadius:12,background:stBg,color:stColor,fontSize:10.5,fontWeight:700,border:`1px solid ${stColor}44`,textTransform:"capitalize",alignSelf:"flex-start"}}>{st}</span>
                <div style={{display:"flex",gap:5}} onClick={e=>e.stopPropagation()}>
                  {st==="pending"&&isAdmin&&<>
                    <button onClick={()=>markPaid(p,"cash")} title="Mark Paid (Cash)"
                      style={{padding:"4px 9px",borderRadius:6,background:T.grn,color:"white",fontSize:10.5,fontWeight:700,border:"none",cursor:"pointer"}}>
                      ✓ Paid
                    </button>
                    <button onClick={()=>cancel(p)} title="Cancel"
                      style={{padding:"4px 7px",borderRadius:6,background:T.redL,color:T.red,fontSize:10.5,fontWeight:700,border:`1px solid ${T.redM}`,cursor:"pointer"}}>
                      <IcX size={10} color={T.red}/>
                    </button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      }

      {/* Worker quick-pick — view drawer for any worker even if no payment row yet */}
      {workers.length>0&&(
        <div style={{marginTop:14,padding:"10px 14px",background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:9}}>
          <div style={{fontSize:11,color:T.t3,fontWeight:600,marginBottom:6}}>Quick view — click any worker for full breakdown</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {workers.slice(0,20).map(w=>(
              <button key={w.id} onClick={()=>setDrawerWorker(w)}
                style={{padding:"5px 11px",borderRadius:14,background:T.surface,border:`1px solid ${T.b1}`,fontSize:11,color:T.t2,cursor:"pointer",fontFamily:"inherit",transition:"all .1s"}}
                onMouseEnter={el=>{el.currentTarget.style.background=T.bluL;el.currentTarget.style.borderColor=T.blu;el.currentTarget.style.color=T.blu;}}
                onMouseLeave={el=>{el.currentTarget.style.background=T.surface;el.currentTarget.style.borderColor=T.b1;el.currentTarget.style.color=T.t2;}}>
                {w.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {drawerWorker&&<WorkerPaymentDrawer worker={drawerWorker} attMonth={attMonth||{}} month={month} year={year}
        onClose={()=>setDrawerWorker(null)}
        onMarkPaid={(p,m)=>{markPaid(p,m);setDrawerWorker(null);}}
        paymentsForWorker={payments.filter(p=>String(p.worker_id)===String(drawerWorker.id)||p.worker_name===drawerWorker.name)}
        isAdmin={isAdmin}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── DAILY WAGES LABOUR: Settings Tab (Phase 3) ───────────────────
// ══════════════════════════════════════════════════════════════════
// ── RATE HISTORY DRAWER (right slide) ──────────────────────────────
// Shows full audit trail for a skill's rate changes — who requested, who approved
function RateHistoryDrawer({skill,onClose}){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    setLoading(true);
    api.get(`/library/labour-rates/${skill.id}/history`)
      .then(r=>{ if(r.success) setData(r.data); })
      .finally(()=>setLoading(false));
  },[skill.id]);

  const STATUS_C={
    Pending:{c:T.amb,bg:T.ambL,brd:T.ambM,icon:"⏳"},
    Approved:{c:T.grn,bg:T.grnL,brd:T.grnM,icon:"✓"},
    Rejected:{c:T.red,bg:T.redL,brd:T.redM,icon:"✕"},
  };
  const fmtDate=(d)=>{ if(!d) return "—"; try{ return new Date(d).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); }catch{return String(d).split("T")[0];} };
  const items = data?.history || [];

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400}}/>
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(560px,95vw)",background:T.surface,boxShadow:"-12px 0 32px rgba(0,0,0,0.18)",zIndex:401,display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{padding:"15px 20px",background:"linear-gradient(135deg,#0D1B2A 0%,#1B2C3F 100%)",color:"white",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:42,height:42,borderRadius:10,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>👷</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700}}>{skill.role}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}>
            {skill.category||"—"} · Current: <b style={{color:"white"}}>₹{Number(skill.rate||0).toLocaleString("en-IN")}/day</b>
          </div>
        </div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:6,color:"white",fontSize:18,width:30,height:30,cursor:"pointer"}}>×</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
        <div style={{fontSize:12,fontWeight:700,color:T.t2,marginBottom:8,letterSpacing:".3px",textTransform:"uppercase"}}>Rate Change History</div>
        {loading&&<div style={{textAlign:"center",padding:40,color:T.t4}}><div style={{width:24,height:24,border:`2.5px solid ${T.b1}`,borderTopColor:T.blu,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 8px"}}/>Loading history…</div>}
        {!loading&&items.length===0&&(
          <div style={{textAlign:"center",padding:36,color:T.t4,fontSize:12.5,background:T.surfaceB,borderRadius:8,border:`1px dashed ${T.b1}`}}>
            <div style={{fontSize:30,marginBottom:8}}>📋</div>
            Abhi tak koi rate change request nahi hua hai
          </div>
        )}
        {!loading&&items.map((h,i)=>{
          const st=STATUS_C[h.status]||STATUS_C.Pending;
          const delta=Number(h.requested_rate||0)-Number(h.current_rate||0);
          const isFirst=i===0;
          return(
            <div key={h.id} style={{position:"relative",marginBottom:12,background:T.surface,borderRadius:9,border:`1.5px solid ${st.brd}`,boxShadow:isFirst?`0 2px 8px ${st.c}22`:"none"}}>
              {/* Top status badge */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 13px",background:st.bg,borderBottom:`1px solid ${st.brd}`,borderRadius:"7.5px 7.5px 0 0"}}>
                <span style={{fontSize:11,fontWeight:700,color:st.c,textTransform:"uppercase",letterSpacing:".4px",display:"flex",alignItems:"center",gap:5}}>
                  <span>{st.icon}</span> {h.status}
                  {isFirst&&<span style={{marginLeft:5,fontSize:9,padding:"1px 6px",borderRadius:8,background:st.c,color:"white",letterSpacing:".3px"}}>LATEST</span>}
                </span>
                <span style={{fontSize:10.5,color:T.t3}}>{fmtDate(h.created_at)}</span>
              </div>
              {/* Rate change diff */}
              <div style={{padding:"10px 13px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:12,color:T.t3}}>From</span>
                  <span style={{fontSize:14,fontWeight:700,color:T.t1,padding:"3px 10px",background:T.surfaceB,borderRadius:6,border:`1px solid ${T.b1}`}}>₹{Number(h.current_rate||0).toLocaleString("en-IN")}</span>
                  <span style={{fontSize:14,color:T.blu,fontWeight:700}}>→</span>
                  <span style={{fontSize:14,fontWeight:700,color:T.t1,padding:"3px 10px",background:T.bluL,borderRadius:6,border:`1px solid ${T.bluM}`}}>₹{Number(h.requested_rate||0).toLocaleString("en-IN")}</span>
                  <span style={{fontSize:11,fontWeight:700,color:delta>0?T.amb:T.grn,marginLeft:"auto"}}>{delta>0?"+":""}{delta.toLocaleString("en-IN")}</span>
                </div>
                {h.apply_scope&&(
                  <div style={{fontSize:10.5,color:h.apply_scope==="all"?T.amb:T.t3,fontWeight:600,marginBottom:6,padding:"3px 8px",background:h.apply_scope==="all"?T.ambL:T.surfaceB,borderRadius:5,display:"inline-block",border:`1px solid ${h.apply_scope==="all"?T.ambM:T.b1}`}}>
                    {h.apply_scope==="all"?"🔄 Applied to ALL existing workers":"📋 Applied to new appointments only"}
                  </div>
                )}
                {h.reason&&(
                  <div style={{fontSize:11.5,color:T.t2,fontStyle:"italic",padding:"6px 10px",background:T.surfaceB,borderLeft:`3px solid ${T.amb}`,borderRadius:4,marginBottom:8}}>
                    "{h.reason}"
                  </div>
                )}
                {/* Audit trail — requested by + approver */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,paddingTop:8,borderTop:`1px solid ${T.b1}`}}>
                  <div>
                    <div style={{fontSize:9,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".3px",marginBottom:2}}>Requested by</div>
                    <div style={{fontSize:11.5,fontWeight:600,color:T.t1}}>{h.requested_by_name||"—"}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".3px",marginBottom:2}}>{h.status==="Approved"?"Approved by":h.status==="Rejected"?"Rejected by":"Awaiting"}</div>
                    <div style={{fontSize:11.5,fontWeight:600,color:h.status==="Approved"?T.grn:h.status==="Rejected"?T.red:T.t4}}>
                      {h.approved_by_name||(h.status==="Pending"?"admin approval":"—")}
                    </div>
                    {h.acted_at&&<div style={{fontSize:10,color:T.t4,marginTop:1}}>{fmtDate(h.acted_at)}</div>}
                  </div>
                </div>
                {h.action_remarks&&(
                  <div style={{marginTop:8,fontSize:11,color:T.t3,padding:"5px 9px",background:T.surfaceB,borderRadius:5}}>
                    <span style={{fontWeight:700,color:T.t4}}>Note: </span>{h.action_remarks}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </>);
}

function DailyWagesSettingsTab(){
  // Sync with Library → Labour Rate Card (single source of truth)
  const [rates,setRates]=useState([]);  // Array of {id, role, rate, ot_rate, category, description}
  const [loading,setLoading]=useState(true);
  const [cycle,setCycle]=useState(()=>localStorage.getItem("gb_daily_wages_cycle")||"weekly");
  const [savedMsg,setSavedMsg]=useState("");
  const [savingRow,setSavingRow]=useState(null);

  const loadRates=async()=>{
    setLoading(true);
    try{
      const res=await api.get("/library/labour-rates");
      if(res.success) setRates(res.data||[]);
    }catch(e){}
    setLoading(false);
  };
  useEffect(()=>{ loadRates(); },[]);

  const [scopeModal, setScopeModal] = useState(null); // {item, newRate}
  const [historySkill, setHistorySkill] = useState(null);
  const submitRateChange = async (item, newRate, scope, reason) => {
    setSavingRow(item.id);
    try{
      const res=await api.post("/library/labour-rates/"+item.id+"/request-change",{
        requested_rate:Number(newRate)||0,
        reason: reason || "Base rate update",
        apply_scope: scope,
      });
      if(res.success){
        const scopeMsg = scope === "all" ? "(applies to ALL existing workers)" : "(new appointments only)";
        setSavedMsg("Approval submitted: "+item.role+" → ₹"+newRate+" "+scopeMsg);
        setTimeout(()=>setSavedMsg(""),4000);
      } else {
        alert(res.message || "Failed to submit");
        loadRates();
      }
    }catch(e){ alert("Error: "+e.message); loadRates(); }
    setSavingRow(null);
  };

  const updateRate=(item,newRate)=>{
    if(Number(newRate)===Number(item.rate)) return;
    setScopeModal({ item, newRate, reason: "Quarterly review" });
  };

  const dedupe=async()=>{
    if(!await window.confirmAsync("Duplicate skills hata du? (Same role+category waale rakhe ek)")) return;
    const res=await api.post("/library/labour-rates/dedupe");
    if(res.success){
      setSavedMsg(`✓ Cleaned up — kept ${res.data.kept}, removed ${res.data.deduped} duplicates`);
      setTimeout(()=>setSavedMsg(""),3000);
      loadRates();
    }
  };

  const saveCycle=()=>{
    localStorage.setItem("gb_daily_wages_cycle",cycle);
    setSavedMsg("Payment cycle saved ✓");
    setTimeout(()=>setSavedMsg(""),2000);
  };

  return(
    <div style={{maxWidth:760}}>
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:18,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:14,fontWeight:800,color:T.t1}}>Default Rates by Skill</div>
          <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:700,border:`1px solid ${T.bluM}`}}>📋 Synced with Library</span>
        </div>
        <div style={{fontSize:11,color:T.amb,marginBottom:14,padding:"6px 10px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:6}}>
          ⚠️ Base rates hain ye — change karne ke liye <b>admin approval</b> chahiye. Approvals drawer → Finance tab pe approve karna padega.
        </div>
        {loading
          ? <div style={{padding:"20px 0",textAlign:"center",color:T.t4,fontSize:12}}>Loading rates from library…</div>
          : rates.length===0
            ? <div style={{padding:"20px 0",textAlign:"center",color:T.t4,fontSize:12.5}}>
                Library mein koi labour rate nahi hai. <b>Library → Labour Rate Card</b> mein jaake "Add Labour Rate" se add karo.
              </div>
            : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {rates.map(r=>(
                  <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px dashed ${T.b1}`}}>
                    <div onClick={()=>setHistorySkill(r)} title="Click to see rate change history"
                      style={{flex:1,cursor:"pointer",padding:"3px 6px",borderRadius:5,transition:"background .12s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.bluL}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{fontSize:12.5,color:T.t1,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>{r.role}<span style={{fontSize:9.5,color:T.blu,fontWeight:500,marginLeft:2}}>›</span></div>
                      {r.category&&<div style={{fontSize:10,color:T.t4}}>{r.category}</div>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:12,color:T.t4}}>₹</span>
                      <input type="number" defaultValue={r.rate||""}
                        onBlur={e=>{ if(Number(e.target.value)!==Number(r.rate)) updateRate(r,e.target.value); }}
                        placeholder="0" disabled={savingRow===r.id}
                        style={{width:90,padding:"6px 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",textAlign:"right",opacity:savingRow===r.id?.5:1}}/>
                      <span style={{fontSize:10.5,color:T.t4}}>/day</span>
                    </div>
                  </div>
                ))}
              </div>
        }
        {savedMsg&&<div style={{marginTop:10,fontSize:11.5,color:T.grn,fontWeight:600}}>✓ {savedMsg}</div>}
      </div>

      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:18,marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:800,color:T.t1,marginBottom:4}}>Default Payment Cycle</div>
        <div style={{fontSize:11,color:T.t4,marginBottom:12}}>Default date range when opening the Payments tab.</div>
        <div style={{display:"flex",gap:10}}>
          {[
            {v:"weekly",l:"Weekly",d:"Pay every week (Mon-Sun)"},
            {v:"monthly",l:"Monthly",d:"Pay every month (1st-last day)"},
            {v:"custom",l:"Custom",d:"Manual date range"},
          ].map(o=>(
            <label key={o.v} style={{flex:1,cursor:"pointer",padding:"12px 14px",border:`2px solid ${cycle===o.v?T.blu:T.b1}`,background:cycle===o.v?T.bluL:"transparent",borderRadius:9,transition:"all .15s"}}>
              <input type="radio" name="cycle" value={o.v} checked={cycle===o.v} onChange={()=>setCycle(o.v)} style={{marginRight:8}}/>
              <span style={{fontSize:12.5,fontWeight:700,color:cycle===o.v?T.blu:T.t1}}>{o.l}</span>
              <div style={{fontSize:10.5,color:T.t4,marginTop:3,marginLeft:19}}>{o.d}</div>
            </label>
          ))}
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <button onClick={saveCycle}
          style={{padding:"9px 22px",borderRadius:7,background:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer"}}>
          Save Payment Cycle
        </button>
        <span style={{fontSize:11,color:T.t4}}>Rate change → admin approval needed</span>
      </div>

      {/* ── SCOPE CHOICE MODAL ── */}
      {scopeModal&&(<>
        <div onClick={()=>{setScopeModal(null);loadRates();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"white",borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",zIndex:301,width:520,maxWidth:"95vw",padding:0,overflow:"hidden"}}>
          <div style={{background:"#0D1B2A",padding:"14px 18px",color:"white"}}>
            <div style={{fontSize:14,fontWeight:700}}>Base Rate Change — Scope?</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}>{scopeModal.item.role}: ₹{scopeModal.item.rate} → ₹{scopeModal.newRate}/day</div>
          </div>
          <div style={{padding:"16px 18px"}}>
            <div style={{fontSize:11,fontWeight:700,color:T.t4,marginBottom:10,letterSpacing:".4px"}}>APPLY THIS RATE CHANGE TO:</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              <button onClick={()=>{const r=scopeModal;setScopeModal(null);submitRateChange(r.item,r.newRate,"new_only",r.reason);}}
                style={{padding:"12px 14px",border:`2px solid ${T.b1}`,borderRadius:9,background:"white",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.blu;e.currentTarget.style.background=T.bluL;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b1;e.currentTarget.style.background="white";}}>
                <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:3}}>📋 New Appointments Only</div>
                <div style={{fontSize:11,color:T.t4}}>Existing workers ke individual rates same rahenge. Naye appointments mein new base rate apply hoga.</div>
              </button>
              <button onClick={()=>{const r=scopeModal;setScopeModal(null);submitRateChange(r.item,r.newRate,"all",r.reason);}}
                style={{padding:"12px 14px",border:`2px solid ${T.amb}`,borderRadius:9,background:T.ambL,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                <div style={{fontSize:13,fontWeight:700,color:T.amb,marginBottom:3}}>🔄 Apply to All Existing Workers</div>
                <div style={{fontSize:11,color:T.t3}}>Approval ke baad sab projects mein {scopeModal.item.role} ke saare workers ka rate update + naye appointments bhi.</div>
              </button>
            </div>
            <div style={{borderTop:`1px solid ${T.b1}`,paddingTop:12}}>
              <div style={{fontSize:10.5,fontWeight:700,color:T.t4,marginBottom:5}}>REASON (optional)</div>
              <input type="text" value={scopeModal.reason}
                onChange={e=>setScopeModal(p=>({...p,reason:e.target.value}))}
                placeholder="e.g. Quarterly review, Market correction"
                style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}>
              <button onClick={()=>{setScopeModal(null);loadRates();}}
                style={{padding:"7px 14px",borderRadius:7,border:`1px solid ${T.b1}`,background:"white",fontSize:12,color:T.t3,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>
        </div>
      </>)}

      {/* Rate change history drawer (right slide) */}
      {historySkill&&<RateHistoryDrawer skill={historySkill} onClose={()=>setHistorySkill(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CREATE SALARY — month-end payroll run wizard (admin only)
// 4 steps: Pre-Run Checks → Attendance Review → Salary Preview → Finalize
// month prop is 0-indexed (module convention); run APIs use month+1 (1-12).
// ══════════════════════════════════════════════════════════════════
const RW_STEPS=["Pre-Run Checks","Attendance Review","Salary Preview","Finalize & Lock"];

function RWStepper({step}){
  return(
    <div style={{display:"flex",alignItems:"center",padding:"14px 4px",overflowX:"auto"}}>
      {RW_STEPS.map((s,i)=>(
        <div key={s} style={{display:"flex",alignItems:"center",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,
              background:i<step?T.grn:i===step?T.blu:T.surface,color:i<=step?"#fff":T.t4,border:`1.5px solid ${i<step?T.grn:i===step?T.blu:T.b2}`}}>
              {i<step?<IcChk size={13} color="#fff"/>:i+1}
            </div>
            <span style={{fontSize:12.5,fontWeight:i===step?700:500,color:i===step?T.t1:i<step?T.grn:T.t4,whiteSpace:"nowrap"}}>{s}</span>
          </div>
          {i<RW_STEPS.length-1&&<div style={{width:30,height:2,background:i<step?T.grn:T.b1,margin:"0 9px",borderRadius:2}}/>}
        </div>
      ))}
    </div>
  );
}

function RWKpi({label,value,sub,color=T.t1,bg}){
  return(
    <div style={{flex:1,minWidth:110,background:bg||T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:"12px 14px"}}>
      <div style={{fontSize:11,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:.3}}>{label}</div>
      <div style={{fontSize:20,fontWeight:800,color,marginTop:3}}>{value}</div>
      {sub&&<div style={{fontSize:10.5,color:T.t4,marginTop:2}}>{sub}</div>}
    </div>
  );
}
const RWCard=({children,style})=><div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:12,...style}}>{children}</div>;

// Attendance correction modal — day-level edits (P/H/A) + OT hours.
// Count deltas are mapped to concrete dates so the backend stores day_changes;
// leave (paid/unpaid) is driven by the Leave module and shown read-only.
function RunAttEditModal({emp,month,year,holidaySet,workingDays,onClose,onSave}){
  const [dayMap,setDayMap]=useState(null);     // {day: 'P'|'H'|'A'|'L'} current effective
  const [target,setTarget]=useState({P:emp.P,H:emp.H,A:emp.A,ot:emp.ot_hours});
  const [reason,setReason]=useState("");
  const lastDay=new Date(year,month+1,0).getDate();
  // working days = not Sunday, not holiday
  const workDayNums=[];
  for(let d=1;d<=lastDay;d++){ if(new Date(year,month,d).getDay()===0) continue; if(holidaySet.has(d)) continue; workDayNums.push(d); }

  // load current day-map once (existing endpoint uses 0-indexed month)
  useEffect(()=>{
    let alive=true;
    api.get(`/payroll/attendance/monthly?month=${month}&year=${year}`).then(r=>{
      if(!alive) return;
      const raw=(r.data&&r.data[emp.staff_id])||{};
      const m={}; for(const[d,v]of Object.entries(raw)) m[Number(d)]=v;
      setDayMap(m);
    }).catch(()=>{ if(alive) setDayMap({}); });
    return()=>{ alive=false; };
  },[emp.staff_id,month,year]);

  const inp={width:"100%",padding:"8px 10px",border:`1px solid ${T.b2}`,borderRadius:8,fontSize:13,fontWeight:700,textAlign:"center",fontFamily:"inherit"};
  const fields=[["P","Present",T.grn],["H","Half Day",T.amb],["A","Absent",T.red]];
  const payable=target.P+target.H*0.5+emp.paid_leave;
  const otAmt=emp.full_gross>0?Math.round((emp.full_gross/(workingDays||26)/8)*target.ot):0;
  const changedCount=target.P!==emp.P||target.H!==emp.H||target.A!==emp.A;
  const changedOt=target.ot!==emp.ot_hours;
  const totalMarked=target.P+target.H+target.A+emp.paid_leave+emp.unpaid_leave;
  const over=totalMarked>(workingDays||26);

  // map count deltas to concrete day_changes against current day-map
  const buildDayChanges=()=>{
    if(!changedCount||!dayMap) return [];
    const arr=workDayNums.map(d=>{ const v=dayMap[d]; return {day:d,status:(v==="P"||v==="H"||v==="A")?v:(v==="L"?"L":"U")}; });
    const cnt=s=>arr.filter(x=>x.status===s).length;
    const need={P:target.P-cnt("P"),H:target.H-cnt("H"),A:target.A-cnt("A")};
    const out=[];
    for(const want of ["P","H","A"]){
      while(need[want]>0){
        let donor=arr.find(x=>x.status==="U");                       // unmarked first
        if(!donor) donor=arr.find(x=>need[x.status]<0);              // then a surplus status
        if(!donor) break;
        if(donor.status!=="U") need[donor.status]++;
        donor.status=want; need[want]--;
        const dd=String(donor.day).padStart(2,"0");
        out.push({date:`${year}-${String(month+1).padStart(2,"0")}-${dd}`,status:want});
      }
    }
    return out;
  };

  const submit=()=>{
    const day_changes=buildDayChanges();
    const changes=[];
    if(target.P!==emp.P) changes.push({field:"present",old:emp.P,new:target.P});
    if(target.H!==emp.H) changes.push({field:"half",old:emp.H,new:target.H});
    if(target.A!==emp.A) changes.push({field:"absent",old:emp.A,new:target.A});
    if(changedOt) changes.push({field:"ot_hours",old:emp.ot_hours,new:target.ot});
    onSave({staff_id:emp.staff_id,name:emp.name,changes,day_changes,reason,target});
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(13,27,42,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:90,padding:16}}>
      <div style={{background:T.surface,borderRadius:14,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"15px 18px",borderBottom:`1px solid ${T.b1}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Avatar name={emp.name} size={32}/>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:T.t1}}>Edit Attendance — {emp.name}</div>
              <div style={{fontSize:11,color:T.t4}}>{emp.designation||""} · {MONTHS[month]} {year}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4}}><IcX size={17} color={T.t3}/></button>
        </div>
        <div style={{padding:"16px 18px"}}>
          {dayMap===null?<div style={{textAlign:"center",padding:"20px 0",color:T.t4,fontSize:12.5}}>Loading attendance…</div>:<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            {fields.map(([k,l,c])=>(
              <div key={k}>
                <div style={{fontSize:10.5,fontWeight:700,color:c,marginBottom:4,textTransform:"uppercase",letterSpacing:.3}}>{l}</div>
                <input type="number" min={0} style={{...inp,color:c,borderColor:target[k]!==emp[k]?c:T.b2,background:target[k]!==emp[k]?c+"0D":T.surface}}
                  value={target[k]} onChange={e=>setTarget(s=>({...s,[k]:Math.max(0,Number(e.target.value)||0)}))}/>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <div style={{fontSize:10.5,fontWeight:700,color:T.blu,marginBottom:4,textTransform:"uppercase",letterSpacing:.3,display:"flex",alignItems:"center",gap:3}}><IcClockIn size={11} color={T.blu}/> OT Hours</div>
              <input type="number" min={0} style={{...inp,color:T.blu,borderColor:changedOt?T.blu:T.b2,background:changedOt?T.bluL:T.surface}}
                value={target.ot} onChange={e=>setTarget(s=>({...s,ot:Math.max(0,Number(e.target.value)||0)}))}/>
            </div>
            <div>
              <div style={{fontSize:10.5,fontWeight:700,color:T.pur,marginBottom:4,textTransform:"uppercase",letterSpacing:.3}}>Leave (read-only)</div>
              <div style={{...inp,color:T.pur,background:T.surfaceB,borderColor:T.b1}}>{emp.paid_leave}P / {emp.unpaid_leave}LOP</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <div style={{flex:1,background:T.bluL,borderRadius:9,padding:"9px 12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:T.t3,fontWeight:600}}>PAYABLE DAYS</div>
              <div style={{fontSize:16,fontWeight:800,color:T.blu}}>{payable} / {workingDays||26}</div>
            </div>
            <div style={{flex:1,background:T.grnL,borderRadius:9,padding:"9px 12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:T.t3,fontWeight:600}}>OT AMOUNT</div>
              <div style={{fontSize:16,fontWeight:800,color:T.grn}}>₹{fmtN(otAmt)}</div>
            </div>
          </div>
          {over&&<div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 12px",background:T.redL,border:`1px solid ${T.red}33`,borderRadius:8,marginBottom:12}}>
            <IcAlert size={13} color={T.red}/><span style={{fontSize:11.5,color:T.red,fontWeight:600}}>Marked days ({totalMarked}) working days ({workingDays||26}) se zyada</span>
          </div>}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:T.t2,marginBottom:5}}>Reason for edit <span style={{color:T.red}}>*</span></div>
            <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2} placeholder="e.g. 15 Jun GPS punch miss hua, site par tha · 4 hrs OT finishing work"
              style={{width:"100%",padding:"9px 11px",border:`1px solid ${T.b2}`,borderRadius:8,fontSize:12.5,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
            <div style={{fontSize:10.5,color:T.t4,marginTop:4}}>Reason audit log me save hoga — payslip dispute me kaam aata hai. Days unmarked se auto-pick honge.</div>
          </div>
          <div style={{display:"flex",gap:9}}>
            <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${T.b2}`,background:T.surface,color:T.t2,fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
            <button disabled={(!changedCount&&!changedOt)||!reason.trim()||over} onClick={submit}
              style={{flex:2,padding:"10px",borderRadius:9,border:"none",background:((!changedCount&&!changedOt)||!reason.trim()||over)?T.b2:T.blu,color:"#fff",fontSize:13,fontWeight:700,cursor:((!changedCount&&!changedOt)||!reason.trim()||over)?"default":"pointer"}}>
              Add to Review List
            </button>
          </div>
          </>}
        </div>
      </div>
    </div>
  );
}

// Open a printable payslip window from a finalized run item.
function printRunPayslip(item,run){
  const b=typeof item.breakdown_json==="string"?JSON.parse(item.breakdown_json||"{}"):(item.breakdown_json||{});
  const e=b.earnings||{}, d=b.deductions||{};
  const mName=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][(run?.month_num||1)-1];
  const row=(l,v,neg)=>`<tr><td style="padding:4px 0">${l}</td><td style="text-align:right;padding:4px 0;color:${neg?"#DC2626":"#111"}">${neg?"−":""}₹${Number(v||0).toLocaleString("en-IN")}</td></tr>`;
  const html=`<html><head><title>Payslip — ${item.staff_name}</title></head><body style="font-family:Segoe UI,sans-serif;max-width:540px;margin:24px auto;color:#111">
    <h2 style="margin:0">GB Buildcon — Payslip</h2>
    <div style="color:#666;font-size:13px;margin:2px 0 16px">${mName} ${run?.year_num||""} · ${item.staff_name} (${item.designation||""})</div>
    <div style="display:flex;gap:24px">
      <div style="flex:1"><b>Earnings</b><table style="width:100%;font-size:13px">
        ${row("Basic",e.basic)}${row("HRA",e.hra)}${row("Conveyance",e.conveyance)}${row("Medical",e.medical)}${e.phone?row("Phone",e.phone):""}${e.petrol?row("Petrol",e.petrol):""}${e.special?row("Special",e.special):""}
        ${row("Gross earned ("+item.payable_days+" days)",e.grossEarned)}${item.ot_amount?row("OT ("+item.ot_hours+" hrs)",item.ot_amount):""}
      </table></div>
      <div style="flex:1"><b>Deductions</b><table style="width:100%;font-size:13px">
        ${row("PF",d.pf,1)}${row("ESI",d.esi,1)}${row("TDS",d.tds,1)}${row("Advance",d.advance,1)}
      </table></div>
    </div>
    ${item.adjustment?`<div style="font-size:13px;margin-top:8px">Adjustment: ${item.adjustment>0?"+":""}₹${Number(item.adjustment).toLocaleString("en-IN")} ${item.adjustment_note?"("+item.adjustment_note+")":""}</div>`:""}
    <div style="margin-top:16px;padding-top:12px;border-top:2px solid #111;font-size:18px;font-weight:800;display:flex;justify-content:space-between"><span>Net Pay</span><span>₹${Number(item.net_amount||0).toLocaleString("en-IN")}</span></div>
    <div style="color:#999;font-size:11px;margin-top:24px">Computer-generated payslip. Attendance: ${item.days_present}P ${item.days_half}H ${item.days_absent}A · ${item.gps_days} GPS days.</div>
    <script>window.print()</script></body></html>`;
  const w=window.open("","_blank","width=620,height=720");
  if(w){ w.document.write(html); w.document.close(); }
}

function PayrollRunWizard({month,year,isAdmin,workingDays,setTab,onChanged}){
  const [step,setStep]=useState(0);
  const [loading,setLoading]=useState(true);
  const [pre,setPre]=useState(null);            // prechecks payload
  const [summary,setSummary]=useState([]);      // attendance-summary staff[]
  const [preview,setPreview]=useState(null);    // salary-preview payload
  const [pending,setPending]=useState([]);      // local attendance edits awaiting approve
  const [adjs,setAdjs]=useState({});            // {staff_id: amount}
  const [editEmp,setEditEmp]=useState(null);
  const [finalized,setFinalized]=useState(null);// finalized run header
  const [items,setItems]=useState([]);          // finalized run items
  const [toast,setToast]=useState(null);
  const [busy,setBusy]=useState(false);
  const apiMonth=month+1;
  const flash=(m)=>{ setToast(m); setTimeout(()=>setToast(null),3000); };
  const holidaySet=new Set((pre?.holidays||[]).map(h=>h.day));

  // initial load — prechecks; if a finalized run exists, jump to locked view
  const loadPre=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await api.get(`/payroll/run/prechecks?month=${apiMonth}&year=${year}`);
      if(r.success){
        setPre(r.data);
        if(r.data.locked&&r.data.run){
          const ri=await api.get(`/payroll/run/${r.data.run.id}/items`);
          if(ri.success){ setFinalized(ri.data.run); setItems(ri.data.items||[]); setStep(3); }
        }
      }
    }catch(e){ /* */ }
    setLoading(false);
  },[apiMonth,year]);
  // reset + reload whenever month/year changes
  useEffect(()=>{ setStep(0); setFinalized(null); setItems([]); setPending([]); setAdjs({}); setPreview(null); setSummary([]); loadPre(); },[loadPre]);

  const loadSummary=async()=>{
    try{ const r=await api.get(`/payroll/run/attendance-summary?month=${apiMonth}&year=${year}`); if(r.success) setSummary(r.data.staff||[]); }catch(e){}
  };
  const loadPreview=async()=>{
    try{ const r=await api.get(`/payroll/run/salary-preview?month=${apiMonth}&year=${year}`); if(r.success){ setPreview(r.data); setAdjs(a=>{const n={...a}; (r.data.items||[]).forEach(it=>{ if(n[it.staff_id]===undefined) n[it.staff_id]=0; }); return n;}); } }catch(e){}
  };

  const goStep=async(s)=>{
    if(s===1&&!summary.length) await loadSummary();
    if(s===2) await loadPreview();
    setStep(s);
  };

  // approve attendance edits → POST per staff, then refetch summary
  const applyEdits=async(edits)=>{
    setBusy(true);
    try{
      for(const ed of edits){
        await api.post("/payroll/run/attendance-edit",{staff_id:ed.staff_id,month:apiMonth,year,reason:ed.reason,changes:ed.changes,day_changes:ed.day_changes});
      }
      setPending(p=>p.filter(x=>!edits.some(e=>e.staff_id===x.staff_id)));
      await loadSummary();
      flash(`${edits.length} edit${edits.length>1?"s":""} approved & applied ✓`);
      if(onChanged) onChanged();
    }catch(e){ flash(e?.response?.data?.message||"Edit failed"); }
    setBusy(false);
  };
  const onSaveEdit=(edit)=>{ setPending(p=>[...p.filter(x=>x.staff_id!==edit.staff_id),edit]); setEditEmp(null); };

  const doFinalize=async()=>{
    if(!await window.confirmAsync(`${MONTHS[month]} ${year} payroll finalize & lock karein? Attendance lock ho jayegi (revert se hi edit hogi).`)) return;
    setBusy(true);
    try{
      const adjustments=Object.entries(adjs).filter(([,v])=>Number(v)).map(([staff_id,amount])=>({staff_id:Number(staff_id),amount:Number(amount),note:"One-time adjustment"}));
      const r=await api.post("/payroll/run/finalize",{month:apiMonth,year,adjustments});
      if(r.success){
        const ri=await api.get(`/payroll/run/${r.data.run_id}/items`);
        if(ri.success){ setFinalized(ri.data.run); setItems(ri.data.items||[]); }
        flash("Payroll finalized & locked 🔒");
        if(onChanged) onChanged();
      }else flash(r.message||"Finalize failed");
    }catch(e){ flash(e?.response?.data?.message||"Finalize failed"); }
    setBusy(false);
  };
  const doRevert=async()=>{
    const reason=await window.promptAsync("Revert reason? (period unlock ho jayega)");
    if(reason===null) return;
    setBusy(true);
    try{
      await api.post(`/payroll/run/${finalized.id}/revert`,{reason});
      flash("Run reverted — period unlocked");
      setFinalized(null); setItems([]); setStep(0); await loadPre();
      if(onChanged) onChanged();
    }catch(e){ flash(e?.response?.data?.message||"Revert failed"); }
    setBusy(false);
  };
  const markPaid=async(it)=>{
    try{ const r=await api.patch(`/payroll/run-items/${it.id}`,{pay_status:"paid"}); if(r.success) setItems(p=>p.map(x=>x.id===it.id?r.data:x)); }catch(e){ flash("Update failed"); }
  };
  const openPayslip=async(it)=>{
    try{ const r=await api.get(`/payroll/run-items/${it.id}/payslip`); if(r.success) printRunPayslip(r.data.item,r.data.run); }catch(e){ flash("Payslip load failed"); }
  };

  if(!isAdmin) return <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>Create Salary run is only accessible to admins.</div>;
  if(loading) return <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>Loading payroll run…</div>;

  const errs=pre?(pre.pendingLeaves.length>0?1:0)+(pre.pendingAttEdits.length>0?1:0)+((pre.pendingReviews&&pre.pendingReviews.length>0)?1:0):0;
  const warns=pre?(pre.unmarkedStaff.length>0?1:0)+(pre.zeroSalaryStaff.length>0?1:0):0;

  return(
    <div>
      {/* header strip */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:T.t1}}>Create Salary — Payroll Run</div>
          <div style={{fontSize:12,color:T.t3,marginTop:2}}>Month-end processing · attendance se net payout tak</div>
        </div>
        <Pill label={finalized?"Finalized 🔒":"Draft"} c={finalized?T.grn:T.amb} bg={finalized?T.grnL:T.ambL}/>
      </div>
      <RWStepper step={step}/>

      {/* STEP 0 — PRE-RUN CHECKS */}
      {step===0&&pre&&(
        <div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
            <RWKpi label="Blocking Issues" value={errs} color={T.red} bg={T.redL}/>
            <RWKpi label="Warnings" value={warns} color={T.amb} bg={T.ambL}/>
            <RWKpi label="GPS Punches" value={pre.punchSessionCount} sub="merged in grid" color={T.grn} bg={T.grnL}/>
          </div>
          <RWCard>
            {[
              pre.pendingLeaves.length>0&&{type:"error",label:`${pre.pendingLeaves.length} leave application(s) pending approval`,sub:pre.pendingLeaves.slice(0,3).map(l=>`${l.staff_name} (${l.leave_name})`).join(" · "),action:"Review Leaves",go:"office-leave"},
              pre.pendingAttEdits.length>0&&{type:"error",label:`${pre.pendingAttEdits.length} attendance edit request(s) pending`,sub:"Approve/reject in Attendance tab",action:"Open Attendance",go:"office-att"},
              pre.pendingReviews&&pre.pendingReviews.length>0&&{type:"error",label:`${pre.pendingReviews.length} outside-geofence punch(es) review pending`,sub:pre.pendingReviews.slice(0,3).map(r=>`${r.user_name}${r.out_reason?" ("+r.out_reason+")":""}`).join(" · ")+" — salary finalize ke liye review compulsory",action:"Review Punches",go:"office-att"},
              pre.unmarkedStaff.length>0&&{type:"warn",label:`${pre.unmarkedStaff.length} staff ke unmarked days hain`,sub:pre.unmarkedStaff.slice(0,3).map(s=>`${s.name} (${s.unmarkedDays}d)`).join(" · ")+" — unmarked = no pay",action:"Open Attendance",go:"office-att"},
              pre.zeroSalaryStaff.length>0&&{type:"warn",label:`${pre.zeroSalaryStaff.length} staff ki salary structure incomplete`,sub:pre.zeroSalaryStaff.slice(0,3).map(s=>s.name).join(" · ")+" — ₹0 salary banegi",action:"Edit Staff",go:"office-salary"},
              {type:"ok",label:"GPS punch data synced",sub:`${pre.punchSessionCount} mobile sessions is month — grid me merged`},
              {type:"ok",label:`${pre.holidays.length} holiday(s) set`,sub:pre.holidays.length?pre.holidays.map(h=>h.name).join(" · "):"Koi holiday nahi — Calendar tab me add karein"},
            ].filter(Boolean).map((c,i,arr)=>{
              const col=c.type==="error"?T.red:c.type==="warn"?T.amb:T.grn;
              const bgL=c.type==="error"?T.redL:c.type==="warn"?T.ambL:T.grnL;
              return(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"13px 16px",borderBottom:i<arr.length-1?`1px solid ${T.b1}`:"none"}}>
                  <div style={{width:28,height:28,borderRadius:8,background:bgL,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                    {c.type==="ok"?<IcChk size={14} color={col}/>:<IcAlert size={14} color={col}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:T.t1}}>{c.label}</div>
                    <div style={{fontSize:11.5,color:T.t3,marginTop:2}}>{c.sub}</div>
                  </div>
                  {c.action&&<button onClick={()=>setTab(c.go)} style={{fontSize:11.5,fontWeight:600,color:T.blu,background:T.bluL,border:`1px solid ${T.blu}33`,borderRadius:7,padding:"6px 12px",cursor:"pointer",flexShrink:0}}>{c.action}</button>}
                </div>
              );
            })}
          </RWCard>
          {errs>0&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:12,padding:"10px 14px",background:T.ambL,border:`1px solid ${T.amb}33`,borderRadius:10}}>
            <IcAlert size={15} color={T.amb}/><span style={{fontSize:12,color:T.t2}}>Red items resolve karna recommended. Aage badhne par pending leaves <b>unpaid</b> aur unmarked days <b>no-pay</b> count honge.</span>
          </div>}
        </div>
      )}

      {/* STEP 1 — ATTENDANCE REVIEW */}
      {step===1&&(
        <div>
          {pending.length>0&&(
            <RWCard style={{marginBottom:14,border:`1.5px solid ${T.amb}55`,background:T.ambL}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:`1px solid ${T.amb}33`}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><IcAlert size={15} color={T.amb}/><span style={{fontSize:13,fontWeight:800,color:T.t1}}>{pending.length} Attendance Edit{pending.length>1?"s":""} — Review & Approve</span></div>
                <button disabled={busy} onClick={()=>applyEdits(pending)} style={{fontSize:12,fontWeight:700,color:"#fff",background:T.grn,border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><IcChk size={13} color="#fff"/> Approve All & Apply</button>
              </div>
              {pending.map((ed,i)=>(
                <div key={ed.staff_id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 16px",borderBottom:i<pending.length-1?`1px solid ${T.amb}22`:"none"}}>
                  <Avatar name={ed.name} size={26}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{ed.name}</div>
                    <div style={{fontSize:11.5,color:T.t2,marginTop:2}}>{ed.changes.map(c=><span key={c.field} style={{display:"inline-block",marginRight:10}}>{c.field}: <b style={{color:T.t3}}>{c.old}</b> → <b style={{color:T.blu}}>{c.new}</b></span>)}{ed.day_changes.length?<span style={{color:T.t4}}>({ed.day_changes.length} din)</span>:null}</div>
                    <div style={{fontSize:10.5,color:T.t4,marginTop:2,fontStyle:"italic"}}>"{ed.reason}"</div>
                  </div>
                  <button disabled={busy} onClick={()=>applyEdits([ed])} style={{fontSize:11,fontWeight:600,color:T.grn,background:T.grnL,border:`1px solid ${T.grn}33`,borderRadius:7,padding:"5px 11px",cursor:"pointer",flexShrink:0}}>Approve</button>
                  <button onClick={()=>setPending(p=>p.filter(x=>x.staff_id!==ed.staff_id))} style={{fontSize:11,fontWeight:600,color:T.red,background:T.redL,border:`1px solid ${T.red}33`,borderRadius:7,padding:"5px 11px",cursor:"pointer",flexShrink:0}}>Reject</button>
                </div>
              ))}
            </RWCard>
          )}
          <RWCard style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,minWidth:820}}>
              <thead><tr style={{background:T.surfaceB}}>
                {["Employee","Present","GPS 📍","Half","Paid Lv","LOP","Absent","OT Hrs","Payable","Action"].map(h=>(
                  <th key={h} style={{textAlign:h==="Employee"?"left":"center",padding:"10px 12px",fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:.4,borderBottom:`1px solid ${T.b1}`}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {summary.map(e=>{
                  const hasPending=pending.some(p=>p.staff_id===e.staff_id);
                  return(
                    <tr key={e.staff_id} style={{borderBottom:`1px solid ${T.b1}`,background:hasPending?T.ambL:"transparent"}}>
                      <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:9}}><Avatar name={e.name}/><div><div style={{fontWeight:600,color:T.t1}}>{e.name} {hasPending&&<Pill label="Edit pending" c={T.amb} bg="#fff"/>}</div><div style={{fontSize:10.5,color:T.t4}}>{e.designation||e.payment_type}</div></div></div></td>
                      <td style={{textAlign:"center",fontWeight:700,color:T.grn}}>{e.P}</td>
                      <td style={{textAlign:"center",color:T.blu,fontSize:11.5}}>{e.gps_days>0?<span style={{display:"inline-flex",alignItems:"center",gap:3}}><IcGPS size={11} color={T.blu}/>{e.gps_days}</span>:"—"}</td>
                      <td style={{textAlign:"center",color:T.amb,fontWeight:600}}>{e.H||"—"}</td>
                      <td style={{textAlign:"center",color:T.pur,fontWeight:600}}>{e.paid_leave||"—"}</td>
                      <td style={{textAlign:"center",color:T.red,fontWeight:600}}>{e.unpaid_leave||"—"}</td>
                      <td style={{textAlign:"center",color:T.red,fontWeight:700}}>{e.A||"—"}</td>
                      <td style={{textAlign:"center",color:T.blu,fontWeight:700}}>{e.ot_hours||"—"}</td>
                      <td style={{textAlign:"center"}}><Pill label={`${e.payable_days} / ${workingDays||26}`} c={T.blu} bg={T.bluL}/></td>
                      <td style={{textAlign:"center"}}><button onClick={()=>setEditEmp(e)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:T.blu,background:T.bluL,border:`1px solid ${T.blu}33`,borderRadius:7,padding:"5px 11px",cursor:"pointer",fontWeight:600}}><IcEdit size={12} color={T.blu}/> Edit</button></td>
                    </tr>
                  );
                })}
                {!summary.length&&<tr><td colSpan={10} style={{textAlign:"center",padding:"24px",color:T.t4}}>Koi salary-enabled staff nahi mila.</td></tr>}
              </tbody>
            </table>
          </RWCard>
          <div style={{fontSize:11.5,color:T.t3,marginTop:10}}>Payable = Present + (Half × 0.5) + Paid Leave. OT × per-hour rate (Gross ÷ {workingDays||26} ÷ 8) salary me add. Leave Leave-tab se manage hoti hai.</div>
        </div>
      )}

      {/* STEP 2 — SALARY PREVIEW */}
      {step===2&&preview&&(
        <RunSalaryPreview preview={preview} adjs={adjs} setAdjs={setAdjs} workingDays={workingDays}/>
      )}

      {/* STEP 3 — FINALIZE / LOCKED VIEW */}
      {step===3&&(
        <RunFinalize preview={preview} adjs={adjs} finalized={finalized} items={items} month={month} year={year}
          busy={busy} onFinalize={doFinalize} onRevert={doRevert} onMarkPaid={markPaid} onPayslip={openPayslip} isAdmin={isAdmin}/>
      )}

      {/* NAV */}
      {!finalized&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:18,gap:10}}>
          <button disabled={step===0} onClick={()=>goStep(step-1)} style={{padding:"10px 20px",borderRadius:9,border:`1px solid ${T.b2}`,background:T.surface,color:step===0?T.t4:T.t2,fontSize:13,fontWeight:600,cursor:step===0?"default":"pointer"}}>← Back</button>
          {step===1&&pending.length>0&&<span style={{fontSize:11.5,color:T.amb,fontWeight:600}}>⚠ {pending.length} edit approval pending — continue par skip honge</span>}
          {step<3&&<button onClick={()=>goStep(step+1)} style={{padding:"10px 24px",borderRadius:9,border:"none",background:T.blu,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Continue →</button>}
        </div>
      )}

      {editEmp&&<RunAttEditModal emp={editEmp} month={month} year={year} holidaySet={holidaySet} workingDays={workingDays} onClose={()=>setEditEmp(null)} onSave={onSaveEdit}/>}
      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#0D1B2A",color:"#fff",fontSize:12.5,fontWeight:600,padding:"11px 20px",borderRadius:10,boxShadow:"0 6px 24px rgba(0,0,0,0.25)",zIndex:95}}>{toast}</div>}
    </div>
  );
}

// Step 2 body — preview table with expandable breakdown + adjustments
function RunSalaryPreview({preview,adjs,setAdjs,workingDays}){
  const [open,setOpen]=useState(null);
  const items=preview.items||[];
  const netOf=(it)=>Math.max(0,it.net_amount+(Number(adjs[it.staff_id])||0));
  const tot=items.reduce((a,it)=>({g:a.g+it.gross_earned,ot:a.ot+it.ot_amount,d:a.d+it.pf+it.esi+it.tds+it.advance_deducted,n:a.n+netOf(it)}),{g:0,ot:0,d:0,n:0});
  return(
    <div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
        <RWKpi label="Gross Payable" value={`₹${fmtN(tot.g)}`}/>
        <RWKpi label="OT Payable" value={`₹${fmtN(tot.ot)}`} color={T.blu}/>
        <RWKpi label="Deductions" value={`₹${fmtN(tot.d)}`} sub="PF+ESI+TDS+Advance" color={T.red}/>
        <RWKpi label="Net Payout" value={`₹${fmtN(tot.n)}`} color={T.grn} bg={T.grnL}/>
      </div>
      <RWCard style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,minWidth:820}}>
          <thead><tr style={{background:T.surfaceB}}>
            {["Employee","Type","Days","Gross","OT","Deductions","Adjust (±)","Net",""].map(h=>(
              <th key={h} style={{textAlign:h==="Employee"?"left":"center",padding:"10px 12px",fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:.4,borderBottom:`1px solid ${T.b1}`}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.map(it=>(
              <RWPreviewRow key={it.staff_id} it={it} open={open===it.staff_id} setOpen={()=>setOpen(open===it.staff_id?null:it.staff_id)} adj={adjs[it.staff_id]||0} setAdj={v=>setAdjs(a=>({...a,[it.staff_id]:v}))} net={netOf(it)}/>
            ))}
          </tbody>
        </table>
      </RWCard>
      <div style={{fontSize:11.5,color:T.t3,marginTop:10}}>Adjustment me one-time bonus (+) ya deduction (−) — sirf is month, structure change nahi hota.</div>
    </div>
  );
}
function RWPreviewRow({it,open,setOpen,adj,setAdj,net}){
  const b=it.breakdown||{}; const e=b.earnings||{}; const ded=it.pf+it.esi+it.tds+it.advance_deducted;
  return(
    <>
      <tr style={{borderBottom:open?"none":`1px solid ${T.b1}`,background:it.full_gross===0?T.ambL:"transparent"}}>
        <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:9}}><Avatar name={it.staff_name}/><div><div style={{fontWeight:600,color:T.t1}}>{it.staff_name}</div><div style={{fontSize:10.5,color:T.t4}}>{it.designation}</div></div></div></td>
        <td style={{textAlign:"center"}}><Pill label={it.payment_type==="fixed"?"Fixed":"Pro-rata"} c={it.payment_type==="fixed"?T.grn:T.pur} bg={it.payment_type==="fixed"?T.grnL:T.purL}/></td>
        <td style={{textAlign:"center",fontWeight:600,color:T.t2}}>{it.payable_days}</td>
        <td style={{textAlign:"center",fontWeight:600,color:T.t1}}>₹{fmtN(it.gross_earned)}</td>
        <td style={{textAlign:"center",fontWeight:600,color:it.ot_amount?T.blu:T.t4}}>{it.ot_amount?`+₹${fmtN(it.ot_amount)}`:"—"}</td>
        <td style={{textAlign:"center",color:T.red}}>−₹{fmtN(ded)}</td>
        <td style={{textAlign:"center"}}><input type="number" value={adj} onChange={ev=>setAdj(Number(ev.target.value)||0)} style={{width:74,padding:"5px 7px",border:`1px solid ${T.b2}`,borderRadius:7,fontSize:12,textAlign:"right",color:adj>0?T.grn:adj<0?T.red:T.t2,fontWeight:600,fontFamily:"inherit"}}/></td>
        <td style={{textAlign:"center",fontWeight:800,color:T.grn,fontSize:13.5}}>₹{fmtN(net)}</td>
        <td style={{textAlign:"center"}}><button onClick={setOpen} style={{background:"none",border:"none",cursor:"pointer",transform:open?"rotate(90deg)":"none",transition:"transform .15s"}}><IcChev size={15} color={T.t3}/></button></td>
      </tr>
      {open&&(
        <tr style={{borderBottom:`1px solid ${T.b1}`}}>
          <td colSpan={9} style={{padding:"0 12px 14px"}}>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",background:T.surfaceB,borderRadius:10,padding:"12px 16px"}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:6}}>Earnings</div>
                {[["Basic",e.basic],["HRA",e.hra],["Conveyance",e.conveyance],["Medical",e.medical],["Phone",e.phone],["Petrol",e.petrol],["Special",e.special]].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"2.5px 0",color:T.t2}}><span>{l}</span><span>₹{fmtN(v)}</span></div>
                ))}
                {it.ot_amount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"2.5px 0",color:T.blu,fontWeight:600}}><span>OT ({it.ot_hours} hrs)</span><span>+₹{fmtN(it.ot_amount)}</span></div>}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",fontWeight:700,color:T.t1,borderTop:`1px solid ${T.b1}`,marginTop:4}}><span>Gross earned ({it.payable_days}d)</span><span>₹{fmtN(it.gross_earned+it.ot_amount)}</span></div>
              </div>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:6}}>Deductions</div>
                {[["PF",it.pf],["ESI",it.esi],["TDS",it.tds],["Advance",it.advance_deducted]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"2.5px 0",color:T.t2}}><span>{l}</span><span style={{color:v?T.red:T.t4}}>{v?`−₹${fmtN(v)}`:"—"}</span></div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",fontWeight:700,color:T.grn,borderTop:`1px solid ${T.b1}`,marginTop:4}}><span>Net</span><span>₹{fmtN(net)}</span></div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Step 3 / locked body
function RunFinalize({preview,adjs,finalized,items,month,year,busy,onFinalize,onRevert,onMarkPaid,onPayslip,isAdmin}){
  // pre-finalize summary uses live preview + local adjustments; locked uses items
  let totG=0,totOt=0,totD=0,totAdj=0,totN=0,count=0;
  if(finalized){
    count=items.length;
    items.forEach(it=>{ totG+=Number(it.gross_earned); totOt+=Number(it.ot_amount); totD+=Number(it.pf)+Number(it.esi)+Number(it.tds)+Number(it.advance_deducted); totAdj+=Number(it.adjustment); totN+=Number(it.net_amount); });
  }else if(preview){
    const list=preview.items||[]; count=list.length;
    list.forEach(it=>{ const adj=Number(adjs[it.staff_id])||0; totG+=it.gross_earned; totOt+=it.ot_amount; totD+=it.pf+it.esi+it.tds+it.advance_deducted; totAdj+=adj; totN+=Math.max(0,it.net_amount+adj); });
  }
  return(
    <div>
      <RWCard style={{padding:"20px 22px",marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:800,color:T.t1,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><IcCal size={16} color={T.blu}/> {MONTHS[month]} {year} — Payroll Run Summary</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <RWKpi label="Employees" value={count}/>
          <RWKpi label="Gross + OT" value={`₹${fmtN(totG+totOt)}`}/>
          <RWKpi label="Deductions" value={`−₹${fmtN(totD)}`} color={T.red}/>
          <RWKpi label="Adjustments" value={`${totAdj>=0?"+":""}₹${fmtN(totAdj)}`} color={T.amb}/>
          <RWKpi label="Net Payout" value={`₹${fmtN(totN)}`} color={T.grn} bg={T.grnL}/>
        </div>
        {!finalized&&<div style={{marginTop:16,padding:"12px 14px",background:T.sltL||T.surfaceB,borderRadius:10,fontSize:12,color:T.t2,lineHeight:1.65}}>
          <b>Finalize karne par:</b><br/>① Har employee ka attendance+OT+salary snapshot freeze (payroll_run_items)<br/>② {MONTHS[month]} attendance <b>lock</b> — edit sirf revert se<br/>③ Payslips generate honge<br/>④ Payment status "Pending" — bank transfer ke baad "Mark Paid"</div>}
      </RWCard>
      {!finalized?(
        <button disabled={busy||count===0} onClick={onFinalize} style={{width:"100%",padding:"14px",background:count===0?T.b2:T.grn,color:"#fff",border:"none",borderRadius:11,fontSize:14,fontWeight:800,cursor:count===0?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><IcLock size={16} color="#fff"/> {busy?"Finalizing…":`Finalize & Lock ${MONTHS[month]} ${year} Payroll`}</button>
      ):(
        <div>
          <div style={{padding:"14px",background:T.grnL,border:`1.5px solid ${T.grn}55`,borderRadius:11,display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:T.grn,display:"flex",alignItems:"center",justifyContent:"center"}}><IcChk size={16} color="#fff"/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:13.5,fontWeight:800,color:T.grn}}>Payroll Finalized — {MONTHS[month]} {year} 🔒</div>
              <div style={{fontSize:11.5,color:T.t3}}>{count} payslips · Net ₹{fmtN(totN)} · Attendance locked</div>
            </div>
            {isAdmin&&<button disabled={busy} onClick={onRevert} style={{fontSize:12,fontWeight:700,color:T.red,background:T.redL,border:`1px solid ${T.red}55`,borderRadius:8,padding:"8px 14px",cursor:"pointer"}}>Revert Run</button>}
          </div>
          <RWCard>
            {items.map((it,i)=>(
              <div key={it.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderBottom:i<items.length-1?`1px solid ${T.b1}`:"none"}}>
                <Avatar name={it.staff_name} size={28}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{it.staff_name}</div>
                  <div style={{fontSize:10.5,color:T.t4}}>Net ₹{fmtN(it.net_amount)}{it.ot_amount>0?` (incl. OT ₹${fmtN(it.ot_amount)})`:""}</div>
                </div>
                <Pill label={it.pay_status==="paid"?"Paid":"Pending"} c={it.pay_status==="paid"?T.grn:T.amb} bg={it.pay_status==="paid"?T.grnL:T.ambL}/>
                {it.pay_status!=="paid"&&isAdmin&&<button onClick={()=>onMarkPaid(it)} style={{fontSize:11,fontWeight:600,color:T.grn,background:T.grnL,border:`1px solid ${T.grn}33`,borderRadius:7,padding:"5px 11px",cursor:"pointer"}}>Mark Paid</button>}
                <button onClick={()=>onPayslip(it)} style={{fontSize:11,fontWeight:600,color:T.blu,background:"none",border:"none",cursor:"pointer"}}>Payslip</button>
              </div>
            ))}
          </RWCard>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAYROLL MODULE ───────────────────────────────────────────
function PayrollModule(){
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const isAdmin = ["admin","super_admin","project_manager"].includes(currentUser.role);

  // Mode: "office" (permanent staff) | "daily" (daily wages labour)
  const [mode,setMode]=useState(()=>localStorage.getItem("gb_payroll_mode")||"office");
  const setModeAndTab=(m)=>{
    setMode(m);
    localStorage.setItem("gb_payroll_mode",m);
    // Reset to first tab of the new mode
    setTab(m==="office"?"office-att":"daily-workers");
  };
  const [tab,setTab]=useState(()=>
    (localStorage.getItem("gb_payroll_mode")||"office")==="office"?"office-att":"daily-workers"
  );
  const [month,setMonth]=useState(CUR_MONTH);
  const [year,setYear]=useState(CUR_YEAR);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [staff,setStaff]=useState([]);
  const [workers,setWorkers]=useState([]);
  const [advances,setAdvances]=useState([]);
  const [monthlyAtt,setMonthlyAtt]=useState({});
  const [punchDays,setPunchDays]=useState({});   // {staffId:{day:true}} — GPS punch source badge
  const [attFilter,setAttFilter]=useState("all"); // all | sal (salary staff) | app (app users)
  const [attSearch,setAttSearch]=useState("");
  const [dailyAtt,setDailyAtt]=useState({});
  const [selSlipEmp,setSelSlipEmp]=useState(null);
  const [selSlipPayType,setSelSlipPayType]=useState("fixed");
  const [selProject,setSelProject]=useState("All");
  const [salaryRecords,setSalaryRecords]=useState([]);
  const [defaultDueDays,setDefaultDueDays]=useState(10);
  const [workingDays,setWorkingDays]=useState(26);
  // Payroll v2 — Phase 4: holidays for current year
  const [holidays,setHolidays]=useState([]);

  // Map API staff row to frontend format
  const mapStaff=s=>({
    id:s.id,name:s.name,role:s.role||"",dept:s.dept||"",
    paymentType:s.payment_type||"fixed",
    basicSalary:Number(s.basic_salary)||0,hra:Number(s.hra)||0,
    conveyance:Number(s.conveyance)||0,medical:Number(s.medical)||0,
    phone:Number(s.phone_allowance)||0,         // legacy: phone *allowance* amount (used in calcNet)
    phoneAllowance:Number(s.phone_allowance)||0,// alias for clarity
    // Phase 2 — additional allowances
    petrolAllowance:Number(s.petrol_allowance)||0,
    specialAllowance:Number(s.special_allowance)||0,
    // Phase 1 — contact + identity
    mobile:s.phone||"",                          // contact mobile (DB column `phone`)
    email:s.email||"",
    aadhaar:s.aadhaar||"",
    // Phase 2 — PF configuration
    pfApplicable:s.pf_applicable===undefined?true:!!s.pf_applicable,
    pfMethod:s.pf_method||"capped_15k",
    pfCustomAmount:Number(s.pf_custom_amount)||0,
    pfUan:s.pf_uan||"",
    // Phase 2 — ESIC configuration
    esicApplicable:s.esic_applicable===undefined?true:!!s.esic_applicable,
    esicNumber:s.esic_number||"",
    // Bank + legacy
    bankAcc:s.bank_acc||"",ifsc:s.ifsc||"",pan:s.pan||"",
    joinDate:s.join_date?s.join_date.split("T")[0]:"",project:s.project||"",photo:s.photo||"",
    // Phase 5 forward-compat
    shiftTemplateId:s.shift_template_id||null,
    // User↔Staff integration: login link + salary toggle
    userId:s.user_id||null,
    salaryEnabled:s.salary_enabled===undefined?true:!!s.salary_enabled,
    isAppUser:!!s.user_id,
  });
  const mapWorker=w=>({
    id:w.id,name:w.name,trade:w.trade||"",
    ratePerDay:Number(w.rate_per_day)||0,rateOT:Number(w.rate_ot)||0,
    project:w.project||"",contractor:w.contractor||"Self",phone:w.phone||"",
  });
  const mapSalaryRec=d=>({
    id:d.id,name:d.name,designation:d.designation,phone:d.phone,
    bankName:d.bank_name,accountNo:d.account_no,ifsc:d.ifsc,
    daysPresent:d.days_present,totalDays:d.total_days,
    amount:Number(d.amount),
    salaryDate:d.salary_date?d.salary_date.split("T")[0]:"",
    dueDate:d.due_date?d.due_date.split("T")[0]:"",
    notes:d.notes,category:d.category,
    month:d.month_num,year:d.year_num,status:d.status,
    createdAt:d.created_at,paidDate:d.paid_date?d.paid_date.split("T")[0]:null,
    paidBy:d.paid_by,txRef:d.tx_ref,
  });
  const mapAdvance=a=>({
    id:a.id,empId:a.emp_id,name:a.name,
    amount:Number(a.amount),
    date:a.date?a.date.split("T")[0]:"",
    reason:a.reason,status:a.status,
  });

  const loadAll=useCallback(async()=>{
    setError(null);setLoading(true);
    try{
      const [staffRes,workerRes,advRes,salRes,settRes,projRes]=await Promise.all([
        api.get("/payroll/staff"),
        api.get("/payroll/workers"),
        api.get("/payroll/advances"),
        api.get("/payroll/salary-records"),
        api.get("/payroll/settings"),
        api.get("/team-schedule/sites"),
      ]);
      const staffData=(staffRes.data?.data||staffRes.data||[]).map(mapStaff);
      const workerData=(workerRes.data?.data||workerRes.data||[]).map(mapWorker);
      MONTHLY_STAFF=staffData;setStaff(staffData);
      DAILY_WORKERS=workerData;setWorkers(workerData);
      ADVANCE_DATA=(advRes.data?.data||advRes.data||[]).map(mapAdvance);
      setAdvances(ADVANCE_DATA);
      setSalaryRecords((salRes.data?.data||salRes.data||[]).map(mapSalaryRec));
      const sett=settRes.data?.data||settRes.data||{};
      setDefaultDueDays(sett.default_due_days||10);
      setWorkingDays(sett.working_days||26);
      PROJECTS=(projRes.data?.data||projRes.data||[]).map(p=>p.name);
    }catch(err){console.error("Load payroll:",err);setError(err.message||"Failed to load payroll data");}
    finally{setLoading(false);}
  },[]);

  // Load attendance when month/year changes
  const loadAttendance=useCallback(async()=>{
    try{
      const [mRes,dRes]=await Promise.all([
        api.get("/payroll/attendance/monthly?month="+month+"&year="+year),
        api.get("/payroll/attendance/daily?month="+month+"&year="+year),
      ]);
      setMonthlyAtt(mRes.data||{});
      setPunchDays(mRes.punchDays||{});
      setDailyAtt(dRes.data||{});
    }catch(err){console.error("Load attendance:",err);}
  },[month,year]);

  // Payroll v2 — Phase 4: load holidays for current year
  const loadHolidays=useCallback(async()=>{
    try{
      const r=await api.get(`/payroll/holidays?year=${year}`);
      if(r.success) setHolidays(r.data||[]);
    }catch(e){ /* table may not exist yet — silent */ }
  },[year]);

  useEffect(()=>{loadAll();},[loadAll]);
  useEffect(()=>{loadAttendance();},[loadAttendance]);
  useEffect(()=>{loadHolidays();},[loadHolidays]);

  // Attendance API callbacks
  const onMonthlyAttChange=(empId,day,status)=>{
    const m=month+1;const dateStr=`${year}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    api.post("/payroll/attendance/monthly",{staff_id:empId,date:dateStr,status}).catch(err=>console.error(err));
  };
  const onDailyAttChange=(wId,day,status,ot)=>{
    const m=month+1;const dateStr=`${year}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    api.post("/payroll/attendance/daily",{worker_id:wId,date:dateStr,status,ot_hours:ot||0}).catch(err=>console.error(err));
  };

  if(loading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",background:T.bg}}>
      <LoadingSpinner/>
    </div>
  );

  if(error) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",background:T.bg}}>
      <ErrorRetry onRetry={loadAll}/>
    </div>
  );

  // Summary KPIs
  const WORKING_DAYS=workingDays;
  const totalMonthlyNet=staff.reduce((s,emp)=>{
    const days=monthlyAtt[emp.id]||{};
    const P=Object.values(days).filter(v=>v==="P").length;
    const H=Object.values(days).filter(v=>v==="H").length;
    // Paid leave (L not in LOP) counts as present at company level too.
    // We don't have LOP day-set at parent scope yet — approximate by
    // counting ALL L as paid. The MonthlySalaryTab tab itself shows the
    // precise number; this tile is a summary.
    const L=Object.values(days).filter(v=>v==="L").length;
    const eff=P+(H*0.5)+L;
    const WD=WORKING_DAYS||26;
    const fullGross=emp.basicSalary+emp.hra+emp.conveyance+emp.medical+emp.phone+(emp.petrolAllowance||0)+(emp.specialAllowance||0);
    const pType=emp.paymentType||"fixed";
    const gross=pType==="fixed"?fullGross:Math.round((fullGross/WD)*eff);
    // PF — method-aware
    const pfMethod=emp.pfMethod||"capped_15k";
    const pfApplicable=emp.pfApplicable===undefined?true:!!emp.pfApplicable;
    let pfFull=0;
    if(pfApplicable){
      if(pfMethod==="none") pfFull=0;
      else if(pfMethod==="full_basic") pfFull=Math.round(emp.basicSalary*0.12);
      else if(pfMethod==="custom") pfFull=Math.round(emp.pfCustomAmount||0);
      else pfFull=Math.round(Math.min(emp.basicSalary,15000)*0.12);
    }
    const esicApplicable=emp.esicApplicable===undefined?true:!!emp.esicApplicable;
    const esiFull=(esicApplicable&&gross<=21000)?Math.round(gross*0.0075):0;
    const pf=pType==="fixed"?pfFull:Math.round((pfFull/WD)*eff);
    const esi=pType==="fixed"?esiFull:Math.round((esiFull/WD)*eff);
    // Clamp net at 0 — never display negative payroll
    return s+Math.max(0,gross-pf-esi);
  },0);

  const totalDailyPayable=workers.reduce((s,w)=>{
    let total=0;
    Object.entries(dailyAtt[w.id]||{}).forEach(([d,v])=>{
      if(!v) return;
      if(v.status==="P") total+=w.ratePerDay+(v.ot||0)*w.rateOT;
      else if(v.status==="H") total+=w.ratePerDay/2;
    });
    return s+total;
  },0);

  const pendingAdvances=advances.filter(a=>a.status==="Pending deduction").reduce((s,a)=>s+a.amount,0);

  // Office Staff mode — 8 tabs
  const TABS_OFFICE=[
    {id:"office-att",      l:"Attendance",        sub:"From Mobile Punch"},
    {id:"office-salary",   l:"Monthly Salary",    sub:"Auto-calculated"},
    ...(isAdmin?[{id:"office-run", l:"Create Salary", sub:"Month-end payroll run"}]:[]),
    {id:"office-ledger",   l:"Salary Ledger",     sub:"Payment history"},
    {id:"office-advances", l:"Advances",          sub:"Advance tracking"},
    {id:"office-leave",    l:"Leave",             sub:"Apply & approve"},
    {id:"office-calendar", l:"Calendar",          sub:"Holidays & leaves"},
    {id:"office-sites",    l:"Sites",             sub:"Geofences & review"},
    {id:"office-settings", l:"Settings",          sub:"Payroll config"},
  ];
  // Daily Wages Labour mode — 4 tabs
  const TABS_DAILY=[
    {id:"daily-workers",   l:"Workers",           sub:"Labour master"},
    {id:"daily-att",       l:"Daily Attendance",  sub:"Project-wise"},
    {id:"daily-payments",  l:"Payments",          sub:"Weekly / monthly"},
    {id:"daily-settings",  l:"Settings",          sub:"Rates & cycle"},
  ];
  const TABS = mode==="office" ? TABS_OFFICE : TABS_DAILY;

  // Pending payroll for the CURRENT month/year (real number):
  //   pending = max(0, totalMonthlyNet − paid for this month)
  //   pendingCount = staff who have no Paid record for this month
  const paidThisMonthRecs=salaryRecords.filter(r=>r.status==="Paid"&&r.month===month&&r.year===year);
  const paidThisMonthAmt=paidThisMonthRecs.reduce((s,r)=>s+(r.amount||0),0);
  const manualPending=Math.max(0,totalMonthlyNet-paidThisMonthAmt);
  const paidEmpIds=new Set(paidThisMonthRecs.map(r=>r.id));
  const pendingCount=Math.max(0,staff.length-paidEmpIds.size);

  const TILES_OFFICE=[
    {l:"Office Staff",         v:staff.length,        sub:"Permanent employees",               c:T.blu},
    {l:"Monthly Net Payroll",  v:`₹${fmt(totalMonthlyNet)}`,  sub:`${MONTHS[month]} ${year}`,          c:T.grn},
    {l:"Pending Advances",     v:`₹${fmt(pendingAdvances)}`,  sub:`${advances.filter(a=>a.status==="Pending deduction").length} to deduct`, c:T.pur},
    {l:"Salary Pending",       v:`₹${fmt(manualPending)}`,    sub:`${pendingCount} ${pendingCount===1?"employee":"employees"} unpaid`, c:manualPending>0?T.amb:T.grn},
  ];
  const TILES_DAILY=[
    {l:"Daily Workers",        v:workers.length,              sub:"Active labour",                     c:T.blu},
    {l:"Payable This Month",   v:`₹${fmt(totalDailyPayable)}`,sub:`${MONTHS[month]} ${year}`,          c:T.grn},
    {l:"Projects Covered",     v:(PROJECTS||[]).length,       sub:"Active project sites",              c:T.pur},
    {l:"Pending Advances",     v:`₹${fmt(pendingAdvances)}`,  sub:`${advances.filter(a=>a.status==="Pending deduction").length} to deduct`, c:T.amb},
  ];
  const TILES = mode==="office" ? TILES_OFFICE : TILES_DAILY;

  return(
    <div style={{background:T.bg,height:"100%",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* Mode Toggle — Office Staff / Daily Wages Labour */}
      <div style={{padding:"12px 18px 0",flexShrink:0}}>
        <div style={{display:"inline-flex",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:3,boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
          <button onClick={()=>setModeAndTab("office")}
            style={{display:"flex",alignItems:"center",gap:7,padding:"8px 18px",border:"none",background:mode==="office"?T.blu:"transparent",color:mode==="office"?"#fff":T.t3,borderRadius:8,fontSize:12.5,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
            <span style={{fontSize:14}}>👔</span> Office Staff
          </button>
          <button onClick={()=>setModeAndTab("daily")}
            style={{display:"flex",alignItems:"center",gap:7,padding:"8px 18px",border:"none",background:mode==="daily"?T.amb:"transparent",color:mode==="daily"?"#fff":T.t3,borderRadius:8,fontSize:12.5,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
            <span style={{fontSize:14}}>👷</span> Daily Wages Workers
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div style={{padding:"10px 18px 8px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {TILES.map((s,i)=>(
            <div key={i} style={{padding:"12px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderTop:`3px solid ${s.c}`}}>
              <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{s.l}</div>
              <div style={{fontSize:20,fontWeight:700,color:T.t1,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:10.5,color:T.t4,marginTop:3}}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dark tab bar with month picker */}
      <div style={{margin:"0 18px",flexShrink:0}}>
        <div style={{background:"#0D1B2A",borderRadius:10,padding:"0 10px",display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 10px rgba(0,0,0,0.2)"}}>
          <div style={{display:"flex",flex:1,overflowX:"auto"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{display:"flex",alignItems:"center",gap:5,padding:"11px 13px",border:"none",background:"none",fontSize:12.5,fontWeight:tab===t.id?600:400,color:tab===t.id?"white":"rgba(255,255,255,0.45)",cursor:"pointer",borderBottom:tab===t.id?"2px solid #2563EB":"2px solid transparent",transition:"all .15s",whiteSpace:"nowrap"}}>
                {t.l}
                {t.badge>0&&<span style={{background:T.amb,color:"white",fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:10}}>{t.badge}</span>}
              </button>
            ))}
          </div>
          {/* Export */}
          <button onClick={()=>{
            if(tab==="office-salary"){
              const WD=workingDays||26;
              exportCSV(["Name","Role","Dept","Basic","HRA","Conv","Medical","Phone","Days Present","Gross","PF","Net"],
                staff.map(emp=>{const days=monthlyAtt[emp.id]||{};const P=Object.values(days).filter(v=>v==="P").length;const H=Object.values(days).filter(v=>v==="H").length;const eff=P+(H*0.5);const perDay=(emp.basicSalary+emp.hra+emp.conveyance+emp.medical+emp.phone)/(WD);const gross=Math.round(perDay*eff);const pf=Math.round(emp.basicSalary*0.12);return[emp.name,emp.role,emp.dept,emp.basicSalary,emp.hra,emp.conveyance,emp.medical,emp.phone,eff,gross,pf,gross-pf];}),
                `monthly_salary_${MONTHS[month]}_${year}.csv`);
            }else if(tab==="daily-att"){
              exportCSV(["Name","Trade","Rate/Day","OT Rate","Project","Days","OT Hours","Total"],
                workers.map(w=>{let days=0,ot=0,total=0;Object.entries(dailyAtt[w.id]||{}).forEach(([d,v])=>{if(v?.status==="P"){days++;total+=w.ratePerDay+(v.ot||0)*w.rateOT;ot+=(v.ot||0);}else if(v?.status==="H"){days+=0.5;total+=w.ratePerDay/2;}});return[w.name,w.trade,w.ratePerDay,w.rateOT,w.project,days,ot,total];}),
                `daily_wages_${MONTHS[month]}_${year}.csv`);
            }else if(tab==="office-advances"){
              exportCSV(["Name","Amount","Date","Reason","Status"],advances.map(a=>[a.name,a.amount,a.date,a.reason,a.status]),`advances_${MONTHS[month]}_${year}.csv`);
            }else if(tab==="office-ledger"){
              exportCSV(["Name","Designation","Amount","Status","Salary Date","Due Date","Paid Date","Notes"],
                salaryRecords.filter(r=>r.month===month&&r.year===year).map(r=>[r.name,r.designation,r.amount,r.status,r.salaryDate,r.dueDate,r.paidDate||"",r.notes||""]),
                `salary_ledger_${MONTHS[month]}_${year}.csv`);
            }
          }} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.7)",fontSize:11.5,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
            <IcDown size={12} color="currentColor"/> Export
          </button>

          {/* Month + Year picker */}
          <div style={{display:"flex",gap:5,padding:"6px 0",alignItems:"center"}}>
            <IcCal size={13} color="rgba(255,255,255,0.5)"/>
            <select value={month} onChange={e=>setMonth(Number(e.target.value))}
              style={{height:28,padding:"0 8px",borderRadius:6,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.1)",color:"white",fontSize:11.5,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
              {MONTHS.map((m,i)=><option key={i} value={i} style={{color:T.t1,background:T.surface}}>{m}</option>)}
            </select>
            <select value={year} onChange={e=>setYear(Number(e.target.value))}
              style={{height:28,padding:"0 8px",borderRadius:6,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.1)",color:"white",fontSize:11.5,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
              {[2025,2026,2027].map(y=><option key={y} style={{color:T.t1,background:T.surface}}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 18px 16px"}}>
        {/* ─── OFFICE STAFF MODE ─── */}
        {mode==="office" && tab==="office-att" && (
          <>
          <PunchReviewStrip onActed={loadAttendance}/>
          {/* Filter bar — one attendance place, filterable */}
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
            {[
              {v:"all",  l:"All",            n:staff.length},
              {v:"sal",  l:"💰 Salary staff", n:staff.filter(s=>s.salaryEnabled!==false).length},
              {v:"app",  l:"📱 App users",    n:staff.filter(s=>s.isAppUser).length},
            ].map(f=>(
              <button key={f.v} onClick={()=>setAttFilter(f.v)}
                style={{padding:"5px 12px",borderRadius:14,border:`1.5px solid ${attFilter===f.v?T.blu:T.b1}`,background:attFilter===f.v?T.bluL:T.surface,color:attFilter===f.v?T.blu:T.t3,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                {f.l} <span style={{opacity:.6}}>({f.n})</span>
              </button>
            ))}
            <input value={attSearch} onChange={e=>setAttSearch(e.target.value)} placeholder="Search name…"
              style={{marginLeft:"auto",height:28,padding:"0 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",width:160}}/>
          </div>
          <MonthlyAttGrid
            staff={staff
              .filter(s=>attFilter==="all"?true:attFilter==="sal"?s.salaryEnabled!==false:s.isAppUser)
              .filter(s=>!attSearch||s.name.toLowerCase().includes(attSearch.toLowerCase()))}
            att={monthlyAtt} setAtt={setMonthlyAtt} month={month} year={year} onAttChange={onMonthlyAttChange} holidays={holidays} punchDays={punchDays}/>
          </>
        )}
        {mode==="office" && tab==="office-leave" && (
          <LeaveTab staff={staff} month={month} year={year} isAdmin={isAdmin} onAttendanceChanged={loadAttendance}/>
        )}
        {mode==="office" && tab==="office-calendar" && (
          <HolidayCalendarTab holidays={holidays} setHolidays={setHolidays} month={month} year={year} isAdmin={isAdmin}/>
        )}
        {mode==="office" && tab==="office-sites" && (
          <GeofenceAdminTab isAdmin={isAdmin}/>
        )}
        {mode==="office" && tab==="office-salary" && (
          <MonthlySalaryTab staff={staff} att={monthlyAtt} month={month} year={year} advances={advances} workingDays={WORKING_DAYS} onViewSlip={(emp,pType)=>{setSelSlipEmp(emp);setSelSlipPayType(pType||emp.paymentType||"fixed");}} isAdmin={isAdmin} onStaffUpdate={loadAll}/>
        )}
        {mode==="office" && tab==="office-run" && (
          isAdmin
            ? <PayrollRunWizard month={month} year={year} isAdmin={isAdmin} workingDays={workingDays} setTab={setTab} onChanged={loadAll}/>
            : <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>Create Salary run is only accessible to admins.</div>
        )}
        {mode==="office" && tab==="office-ledger" && (
          <SalaryLedgerTab salaryRecords={salaryRecords} setSalaryRecords={setSalaryRecords} month={month} year={year}/>
        )}
        {mode==="office" && tab==="office-advances" && (
          <AdvancesTab advances={advances} setAdvances={setAdvances} isAdmin={isAdmin}/>
        )}
        {mode==="office" && tab==="office-settings" && (
          isAdmin
            ? <PayrollSettingsTab defaultDueDays={defaultDueDays} setDefaultDueDays={setDefaultDueDays} workingDays={workingDays} setWorkingDays={setWorkingDays}/>
            : <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>Settings are only accessible to admins.</div>
        )}

        {/* ─── DAILY WAGES MODE ─── */}
        {mode==="daily" && tab==="daily-workers" && (
          <DailyWorkersTab workers={workers} setWorkers={setWorkers} isAdmin={isAdmin}/>
        )}
        {mode==="daily" && tab==="daily-att" && (
          <DailyWagesTab workers={workers} att={dailyAtt} setAtt={setDailyAtt} selProject={selProject} setSelProject={setSelProject} month={month} year={year} onDailyAttChange={onDailyAttChange} isAdmin={isAdmin} onResync={loadAttendance}/>
        )}
        {mode==="daily" && tab==="daily-payments" && (
          <DailyPaymentsTab workers={workers} isAdmin={isAdmin} attMonth={dailyAtt} month={month} year={year}/>
        )}
        {mode==="daily" && tab==="daily-settings" && (
          isAdmin
            ? <DailyWagesSettingsTab/>
            : <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>Settings are only accessible to admins.</div>
        )}
      </div>

      {/* Salary slip modal */}
      {selSlipEmp&&<SalarySlipModal emp={selSlipEmp} att={monthlyAtt} month={month} year={year} onClose={()=>setSelSlipEmp(null)} paymentType={selSlipPayType} workingDays={workingDays}/>}

      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:10px}
        select,input{font-family:'Segoe UI',system-ui,sans-serif}
      `}</style>
    </div>
  );
}

export default PayrollModule;
