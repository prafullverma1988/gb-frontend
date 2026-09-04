import { useState, useMemo, useEffect, useCallback } from "react";
import api from "../config/api";
import SearchSelect from "../components/SearchSelect";
import { t, Rich } from "../i18n";

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
const LoadingSpinner=()=><div style={{textAlign:"center",padding:"60px 0",color:"#94A3B8"}}><div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>{t("common.loading")}</div>;
const ErrorRetry=({onRetry})=><div style={{textAlign:"center",padding:"60px 0",color:"#EF4444",fontSize:13}}>{t("payroll.failed_to_load")} <span style={{color:"#3B82F6",cursor:"pointer",textDecoration:"underline"}} onClick={onRetry}>{t("common.retry")}</span></div>;
const EmptyState=({icon,message,sub})=><div style={{textAlign:"center",padding:"50px 0",color:T.t4}}>{icon}<div style={{fontSize:13,marginTop:8}}>{message}</div>{sub&&<div style={{fontSize:11.5,color:T.t4,marginTop:3}}>{sub}</div>}</div>;

// ── NAV ────────────────────────────────────────────────────────────
const NAV=[
  {sec:null,items:[
    {id:"dashboard",get l() { return t("common.dashboard"); },I:IcHome},
    {id:"projects",get l() { return t("common.projects"); },I:IcProj},
    {id:"crm",l:"CRM",I:IcCRM},
    {id:"tasks",get l() { return t("common.tasks"); },I:IcTask},
    {id:"team",get l() { return t("common.team"); },I:IcTeam},
  ]},
  {sec:"FINANCE & OPS",items:[
    {id:"finance",get l() { return t("common.finance"); },I:IcFin},
    {id:"procurement",get l() { return t("common.procurement"); },I:IcProc},
    {id:"warehouse",get l() { return t("common.warehouse"); },I:IcWH},
    {id:"payroll",get l() { return t("common.payroll"); },I:IcPay},
  ]},
  {sec:"MORE",items:[
    {id:"reports",get l() { return t("common.reports"); },I:IcRep},
    {id:"settings",get l() { return t("common.settings"); },I:IcSet},
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
    if(!await window.confirmAsync(t("payroll.reject_this_auto_detected_location_it"))) return;
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
    if(!navigator.geolocation){ setErr(t("payroll.browser_gps_not_supported")); return; }
    navigator.geolocation.getCurrentPosition(
      pos=>setForm(p=>({...p,center_lat:pos.coords.latitude.toFixed(7),center_lng:pos.coords.longitude.toFixed(7)})),
      e=>setErr("GPS failed: "+e.message),
      { enableHighAccuracy:true,timeout:15000 }
    );
  };
  const save=async()=>{
    if(!form.label.trim()||!form.center_lat||!form.center_lng){
      setErr(t("payroll.label_latitude_longitude_required")); return;
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
    if(!await window.confirmAsync(t("payroll.soft_delete_this_geofence_will_not"))) return;
    try{ await api.del(`/geofences/${id}`); await reload(); }
    catch(e){ alert(e.message); }
  };
  const toggleActive=async(f)=>{
    try{ await api.put(`/geofences/${f.id}`,{active:!f.active?1:0}); await reload(); }
    catch(e){ alert(e.message); }
  };

  const inp={width:"100%",padding:"7px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};

  if(!isAdmin){
    return <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>{t("payroll.geofence_config_is_admin_only")}</div>;
  }

  return(
    <div>
      <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:9,padding:"10px 14px",marginBottom:14,fontSize:11.5,color:T.t2,lineHeight:1.5}}>
       {t("payroll.mobile_app_checks_each_punch_against")} <b>{t("payroll.inside")}</b> {t("payroll.auto_attendance")}
        <b style={{color:T.amb,marginLeft:5}}>{t("payroll.outside")}</b> {t("payroll.admin_review_queue_pending_approvals_tab")}
        <br/>
        <span style={{color:T.t3,fontSize:11}}>{t("payroll.tip_3_live_camera_photo_uploads")}</span>
      </div>

      {/* ─── AUTO-LEARNED SUGGESTIONS ─── */}
      {suggestions.length > 0 && (
        <div style={{background:T.purL,border:`2px dashed ${T.pur}`,borderRadius:10,padding:"12px 14px",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:18}}>🔮</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:T.pur}}>{t("payroll.auto_detected_locations_suggestions_new", { suggestions: suggestions.length })}</div>
              <div style={{fontSize:10.5,color:T.t3,marginTop:1}}>{t("payroll.team_ne_in_coordinates_pe_regular")}</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {suggestions.map(s=>(
              <div key={s.id} style={{background:T.surface,border:`1px solid ${T.purM}`,borderRadius:8,padding:"10px 12px",display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>
                    {s.project_name || t("payroll.generic_site")}
                    <span style={{marginLeft:8,fontSize:9.5,padding:"1px 7px",borderRadius:10,background:T.purL,color:T.pur,fontWeight:700}}>{t("payroll.s_confident", { s: s.confidence||0 })}</span>
                  </div>
                  <div style={{fontSize:10.5,color:T.t3,marginTop:3,fontFamily:"monospace"}}>
                    {Number(s.center_lat).toFixed(5)}, {Number(s.center_lng).toFixed(5)}
                  </div>
                  <div style={{fontSize:10.5,color:T.t4,marginTop:2}}>{s.label}</div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {/* Editable radius — defaults to auto-learned value */}
                  <div style={{display:"flex",alignItems:"center",gap:3,background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:6,padding:"3px 7px"}} title={t("payroll.radius_meters_edit_before_confirming")}>
                    <input type="number" min={20} max={1000}
                      value={sugRadius[s.id]!==undefined?sugRadius[s.id]:(s.radius_m||80)}
                      onChange={e=>setSugRadius(p=>({...p,[s.id]:e.target.value}))}
                      style={{width:52,border:"none",background:"transparent",fontSize:11.5,fontWeight:700,color:T.t1,outline:"none",textAlign:"right",fontFamily:"inherit"}}/>
                    <span style={{fontSize:10,color:T.t4}}>m</span>
                  </div>
                  <button onClick={()=>rejectSuggestion(s.id)}
                    style={{padding:"6px 11px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                   {t("common.reject")}
                  </button>
                  <button onClick={()=>confirmSuggestion(s.id)}
                    style={{padding:"6px 14px",borderRadius:6,background:T.pur,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
                   {t("payroll.confirm_site")}
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
            {editId?t("payroll.edit_geofence"):t("payroll.add_new_geofence")}
          </div>
          <div style={{display:"grid",gap:9}}>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("payroll.label")}</div>
              <input style={inp} value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} placeholder={t("payroll.e_g_raganee_house_site")}/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("payroll.project_optional")}</div>
              <select style={inp} value={form.project_id} onChange={e=>setForm(p=>({...p,project_id:e.target.value}))}>
                <option value="">{t("payroll.generic_not_project_linked")}</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}{p.city?` · ${p.city}`:""}</option>)}
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div>
                <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("payroll.latitude")}</div>
                <input style={inp} value={form.center_lat} onChange={e=>setForm(p=>({...p,center_lat:e.target.value}))} placeholder="21.2497"/>
              </div>
              <div>
                <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("payroll.longitude")}</div>
                <input style={inp} value={form.center_lng} onChange={e=>setForm(p=>({...p,center_lng:e.target.value}))} placeholder="81.6324"/>
              </div>
            </div>
            <button onClick={useMyLocation}
              style={{padding:"6px 10px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>
             {t("payroll.use_my_current_gps_location")}
            </button>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("payroll.radius")} <b style={{color:T.t1}}>{form.radius_m}m</b></div>
              <input type="range" min="30" max="500" step="10" value={form.radius_m}
                onChange={e=>setForm(p=>({...p,radius_m:Number(e.target.value)}))}
                style={{width:"100%"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:T.t4,marginTop:2}}>
                <span>30m</span><span>{t("payroll.80m_default")}</span><span>500m</span>
              </div>
            </div>
            {err && <div style={{padding:"7px 10px",background:T.redL,color:T.red,borderRadius:6,fontSize:11}}>{err}</div>}
            <div style={{display:"flex",gap:7}}>
              {editId && (
                <button onClick={openAdd} style={{flex:1,padding:"8px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,color:T.t3,fontSize:12,fontWeight:600,cursor:"pointer"}}>{t("common.cancel")}</button>
              )}
              <button onClick={save} disabled={saving}
                style={{flex:2,padding:"8px",borderRadius:6,background:saving?T.t4:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer"}}>
                {saving?t("common.saving_2"):(editId?t("common.save_changes"):t("payroll.add_geofence"))}
              </button>
            </div>
          </div>
        </div>

        {/* ─── List ─── */}
        <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,overflow:"hidden",minHeight:280}}>
          <div style={{padding:"10px 14px",background:T.sb,color:"white",fontSize:12.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>{t("payroll.active_geofences")} <span style={{color:"rgba(255,255,255,.5)",marginLeft:4,fontSize:11}}>({fences.length})</span></span>
          </div>
          {loading && <div style={{padding:"30px",textAlign:"center",color:T.t4,fontSize:12}}>{t("common.loading_2")}</div>}
          {!loading && fences.length===0 && (
            <div style={{padding:"35px 14px",textAlign:"center",color:T.t4,fontSize:12.5,lineHeight:1.5}}>
             {t("payroll.no_geofences_yet")}<br/>
              <span style={{fontSize:11}}>{t("payroll.until_you_add_at_least_one")}</span>
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
              <button onClick={()=>toggleActive(f)} title={f.active?t("payroll.deactivate"):t("payroll.activate")}
                style={{padding:"4px 9px",borderRadius:5,background:f.active?T.grnL:T.sltL,border:`1px solid ${f.active?T.grnM:T.b1}`,color:f.active?T.grn:T.t3,fontSize:10,fontWeight:700,cursor:"pointer"}}>
                {f.active?"ON":"OFF"}
              </button>
              <button onClick={()=>openEdit(f)}
                style={{padding:"4px 9px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10,fontWeight:600,cursor:"pointer"}}>
               {t("common.edit_2")}
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
        <span>{t("payroll.outside_geofence_punches_pending_review")} <span style={{color:"rgba(255,255,255,.6)",marginLeft:4,fontSize:11}}>({items.length})</span></span>
        <button onClick={reload} style={{background:"rgba(255,255,255,.18)",border:"none",color:"white",padding:"3px 9px",borderRadius:5,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>{t("common.refresh_2")}</button>
      </div>
      {loading && <div style={{padding:"25px",textAlign:"center",color:T.t4,fontSize:12}}>{t("common.loading_2")}</div>}
      {!loading && items.length===0 && (
        <div style={{padding:"25px 14px",textAlign:"center",color:T.grn,fontSize:12.5,fontWeight:600}}>{t("payroll.all_clean_no_outside_geofence_punches")}</div>
      )}
      {!loading && items.map(s=>(
        <div key={s.id} style={{padding:"11px 14px",borderTop:`1px solid ${T.b1}`,display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"center"}}>
          <div>
            <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{s.user_name} <span style={{fontSize:10,color:T.t4,fontWeight:500}}>· {s.user_phone||""}</span></div>
            <div style={{fontSize:11,color:T.t3,marginTop:3}}><Rich k="payroll.punched_in_at_vnew" params={{ vnew: new Date(s.punch_in_at).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",year:"2-digit"}) }} />{s.project_name && <> · {s.project_name}</>}
            </div>
            <div style={{fontSize:10,color:T.t4,marginTop:2,fontFamily:"monospace"}}>{t("payroll.gps_s_s2", { s: s.punch_in_lat?Number(s.punch_in_lat).toFixed(5):"—", s2: s.punch_in_lng?Number(s.punch_in_lng).toFixed(5):"—" })}</div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>review(s.id,"reject")} disabled={acting===s.id}
              style={{padding:"6px 12px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
             {t("common.reject")}
            </button>
            <button onClick={()=>review(s.id,"approve")} disabled={acting===s.id}
              style={{padding:"6px 14px",borderRadius:6,background:T.grn,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
             {t("common.approve")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── LEAVE TAB (Payroll v2 — Phase 3; HR-view rework 2026-07) ─────
// Sub-tabs: Pending Approvals (default) / All Leaves / Balance / Holidays.
// Self-service apply mobile app me hai; web par sirf on-behalf entry (modal).
function LeaveTab({staff,month,year,isAdmin,onAttendanceChanged,holidays,setHolidays}){
  const [subTab,setSubTab]=useState(isAdmin?"pending":"all");
  const [showApply,setShowApply]=useState(false);
  const [coverApp,setCoverApp]=useState(null);   // pending app being reviewed in Coverage Check modal
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
      setErr(t("payroll.sab_fields_zaroori_hain")); return;
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
        setShowApply(false);
        setSubTab("all");
      }else setErr(r.message||"Apply failed");
    }catch(e){ setErr(e.message||"Network error"); }
    setSubmitting(false);
  };

  const [reviewErr,setReviewErr]=useState({});  // {appId: message} — inline error on the card
  const review=async(id,action,note)=>{
    setReviewErr(p=>({...p,[id]:""}));
    try{
      const r=await api.patch(`/payroll/leave-applications/${id}/review`,{action,note:note||null});
      if(r.success){ await reload(); if(action==="approve"&&onAttendanceChanged) onAttendanceChanged(); }
      else setReviewErr(p=>({...p,[id]:r.message||"Review failed"}));
    }catch(e){ setReviewErr(p=>({...p,[id]:e.message||"Review failed"})); }
  };
  const cancel=async(id)=>{
    if(!await window.confirmAsync(t("payroll.cancel_this_leave_application"))) return;
    try{
      const r=await api.patch(`/payroll/leave-applications/${id}/cancel`,{});
      if(r.success) await reload();
      else alert(r.message);
    }catch(e){ alert(e.message); }
  };
  // Admin-only: cancel an APPROVED leave — restores balance + unmarks 'L' days
  const cancelApproved=async(a)=>{
    if(!await window.confirmAsync(`${a.staff_name} ki approved leave (${fmtDate(a.from_date)} → ${fmtDate(a.to_date)}) cancel karein? Balance restore hoga aur grid ke 'L' days unmark ho jayenge.`)) return;
    const reason=await window.promptAsync(t("payroll.cancel_reason_required"));
    if(reason===null) return;
    if(!String(reason).trim()){ alert(t("payroll.reason_required")); return; }
    try{
      const r=await api.patch(`/payroll/leave-applications/${a.id}/cancel-approved`,{reason:String(reason).trim()});
      if(r.success){ await reload(); if(onAttendanceChanged) onAttendanceChanged(); }
      else alert(r.message||"Cancel failed");
    }catch(e){ alert(e.message); }
  };

  const inp={width:"100%",padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};

  // Apply-form balance context — selected staff × type ka available balance
  // (allocated + carried_fwd − used, from already-loaded /leave-balances).
  const selType=types.find(t=>t.id===Number(form.leave_type_id))||null;
  const selBalance=(()=>{
    if(!form.staff_id||!selType||selType.is_unpaid) return null;   // LOP: no balance limit
    const b=balances.find(x=>x.staff_id===Number(form.staff_id)&&x.leave_type_id===selType.id);
    return b?Number(b.balance):0;
  })();
  const overBalance=selBalance!==null&&!preview.loading&&preview.days>selBalance;

  // ─── Sub-tabs strip ────────────────────────────────────
  const SUB_TABS=[
    {id:"pending", l:t("common.pending_approvals"), c:T.amb, badge:pendingApps.length, adminOnly:true},
    {id:"all",     l:t("payroll.all_leaves"), c:T.blu, badge:apps.length},
    {id:"balance", l:t("common.balance"), c:T.pur, badge:balances.length},
    {id:"holidays",l:t("payroll.holidays"), c:T.grn},
  ];

  return(
    <div>
      {/* Sub-tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14,borderBottom:`1px solid ${T.b1}`,paddingBottom:6,alignItems:"center"}}>
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
        <span style={{flex:1}}/>
        <button onClick={()=>setShowApply(true)}
          title={t("payroll.staff_phone_par_bataye_to_hr")}
          style={{padding:"6px 13px",borderRadius:7,border:`1px solid ${T.grn}44`,background:T.grnL,color:T.grn,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
          <IcAdd size={12}/> {t("payroll.leave_entry_on_behalf")}
        </button>
      </div>

      {loading && <div style={{textAlign:"center",padding:"30px 0",color:T.t4,fontSize:12}}>{t("common.loading_2")}</div>}

      {/* ─── ON-BEHALF LEAVE ENTRY (modal) ─── */}
      {showApply && (
        <div 
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9998,padding:16}}>
        <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:12,padding:16,width:640,maxWidth:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{t("payroll.leave_entry_on_behalf_2")}</div>
              <div style={{fontSize:10.5,color:T.t4,marginTop:2}}>{t("payroll.staff_ki_self_apply_mobile_app")}</div>
            </div>
            <button onClick={()=>!submitting&&setShowApply(false)} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.t4}}><IcX size={16}/></button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("payroll.staff_member")}</div>
              <select value={form.staff_id} onChange={e=>setForm(p=>({...p,staff_id:e.target.value}))} style={inp}>
                <option value="">{t("payroll.select")}</option>
                {staff.map(s=><option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("payroll.leave_type")}</div>
              <select value={form.leave_type_id} onChange={e=>setForm(p=>({...p,leave_type_id:e.target.value}))} style={inp}>
                <option value="">{t("payroll.select")}</option>
                {types.map(item=><option key={item.id} value={item.id}>{item.code} — {item.name}{item.is_unpaid?t("payroll.unpaid"):""}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("common.from")}</div>
              <input type="date" value={form.from_date} onChange={e=>setForm(p=>({...p,from_date:e.target.value,to_date:form.is_half_day?e.target.value:p.to_date}))} style={inp}/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("common.to")}</div>
              <input type="date" value={form.to_date} onChange={e=>setForm(p=>({...p,to_date:e.target.value}))} disabled={form.is_half_day} style={{...inp,opacity:form.is_half_day?0.5:1}}/>
            </div>
          </div>
          {selBalance!==null&&(
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={{fontSize:10.5,fontWeight:700,padding:"3px 9px",borderRadius:10,background:selBalance>0?T.grnL:T.redL,color:selBalance>0?T.grn:T.red,border:`1px solid ${selBalance>0?T.grnM:T.redM}`}}>{t("payroll.balance_selbalance_din", { selBalance })}</span>
              <span style={{fontSize:10,color:T.t4}}>{selType.code} · {selType.name}</span>
            </div>
          )}
          <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12,color:T.t2,marginBottom:10,cursor:"pointer"}}>
            <input type="checkbox" checked={form.is_half_day} onChange={e=>setForm(p=>({...p,is_half_day:e.target.checked,to_date:e.target.checked?p.from_date:p.to_date}))}/>
           {t("payroll.half_day_leave_single_date")}
          </label>
          {form.is_half_day && (
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("payroll.half_day_part")}</div>
              <select value={form.half_day_part} onChange={e=>setForm(p=>({...p,half_day_part:e.target.value}))} style={{...inp,maxWidth:200}}>
                <option value="first">{t("payroll.first_half_morning")}</option>
                <option value="second">{t("payroll.second_half_afternoon")}</option>
              </select>
            </div>
          )}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("common.reason")}</div>
            <textarea value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} rows={2}
              placeholder={t("payroll.brief_reason_optional")}
              style={{...inp,resize:"vertical"}}/>
          </div>

          {/* Preview */}
          {form.from_date && form.to_date && (
            <div style={{padding:"9px 12px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,marginBottom:10,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:11.5,color:T.t3}}>{t("payroll.computed_working_days")}</span>
              <span style={{fontSize:14,fontWeight:800,color:T.blu}}>{preview.loading?"…":preview.days}</span>
              <span style={{fontSize:10.5,color:T.t4,marginLeft:"auto"}}>{t("payroll.sundays_non_optional_holidays_auto_excluded")}</span>
            </div>
          )}
          {form.from_date && form.to_date && overBalance && (
            <div style={{padding:"8px 11px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,marginBottom:10,display:"flex",alignItems:"center",gap:7}}>
              <IcAlert size={13} color={T.amb}/>
              <span style={{fontSize:11.5,color:T.t2}}><Rich k="payroll.balance_se_zyada_days_din_maange" params={{ days: preview.days, selBalance }} /></span>
            </div>
          )}

          {err && <div style={{padding:"8px 11px",background:T.redL,color:T.red,borderRadius:6,fontSize:11.5,marginBottom:10}}>{err}</div>}
          <button onClick={submit} disabled={submitting||!form.staff_id||!form.leave_type_id||!form.from_date||!form.to_date}
            style={{padding:"9px 22px",borderRadius:7,background:submitting||!form.staff_id||!form.leave_type_id||!form.from_date||!form.to_date?T.t4:T.grn,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:submitting?"not-allowed":"pointer"}}>
            {submitting?t("common.submitting"):t("payroll.submit_application")}
          </button>
        </div>
        </div>
      )}

      {/* ─── ALL LEAVES list ─── */}
      {!loading && subTab==="all" && (
        <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"160px 140px 90px 110px 110px 90px 100px",padding:"8px 14px",background:T.sb,color:"rgba(255,255,255,.55)",fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".3px"}}>
            {["Staff","Type","Days","From","To","Status","Actions"].map((h,i)=><span key={i}>{h}</span>)}
          </div>
          {myApps.length===0&&<div style={{padding:"30px 14px",textAlign:"center",color:T.t4,fontSize:12.5}}>{t("payroll.no_leave_applications_yet")}</div>}
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
                  <div style={{fontSize:10.5,color:T.t4,marginTop:2}}>{a.leave_name}{a.is_unpaid?t("payroll.lop"):""}</div>
                </div>
                <span style={{fontSize:13,fontWeight:800,color:T.t1}}>{Number(a.days)}d{a.is_half_day?" ½":""}</span>
                <span style={{color:T.t2}}>{fmtDate(a.from_date)}</span>
                <span style={{color:T.t2}}>{fmtDate(a.to_date)}</span>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:bg,color:stC,fontWeight:700,justifySelf:"start"}}>{a.status}</span>
                <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                  {a.status==="Pending"&&(a.applied_by===currentUser.id||isAdmin)&&(
                    <button onClick={()=>cancel(a.id)} style={{padding:"3px 8px",borderRadius:5,background:T.sltL,border:`1px solid ${T.b1}`,color:T.t3,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>{t("common.cancel")}</button>
                  )}
                  {a.status==="Approved"&&isAdmin&&(
                    <button onClick={()=>cancelApproved(a)} title={t("payroll.balance_restore_l_days_unmark_honge")}
                      style={{padding:"3px 8px",borderRadius:5,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>{t("common.cancel")}</button>
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
              <div style={{fontSize:13,fontWeight:700,color:T.grn,marginBottom:4}}>{t("finance.all_caught_up")}</div>
              <div style={{fontSize:11.5,color:T.t3}}>{t("payroll.no_pending_leave_applications")}</div>
            </div>
          ):pendingApps.map(a=>(
            <div key={a.id} style={{background:T.surface,border:`1px solid ${T.ambM}`,borderRadius:9,padding:13,marginBottom:9,borderLeft:`4px solid ${T.amb}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{a.staff_name} <span style={{fontSize:10.5,color:T.t4,fontWeight:500}}>· {a.staff_role}</span></div>
                  <div style={{fontSize:11.5,color:T.t2,marginTop:3}}>
                    <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:700,marginRight:6}}>{a.leave_code}</span>
                    {a.leave_name}{a.is_unpaid?t("payroll.lop"):""} · <b>{Number(a.days)} day{Number(a.days)===1?"":"s"}</b>{a.is_half_day?t("payroll.half_day"):""}
                  </div>
                  <div style={{fontSize:11,color:T.t3,marginTop:3}}>{fmtDate(a.from_date)} → {fmtDate(a.to_date)}</div>
                  {a.reason&&<div style={{fontSize:11,color:T.t3,fontStyle:"italic",marginTop:5}}>"{a.reason}"</div>}
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={async ()=>review(a.id,"reject",await window.promptAsync(t("payroll.reject_reason_optional"))||null)}
                    style={{padding:"6px 12px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
                   {t("common.reject")}
                  </button>
                  <button onClick={()=>setCoverApp(a)}
                    title={t("payroll.coverage_check_ke_saath_review")}
                    style={{padding:"6px 14px",borderRadius:6,background:T.grn,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
                   {t("payroll.review")}
                  </button>
                </div>
              </div>
              {reviewErr[a.id]&&(
                <div style={{padding:"7px 10px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:6,fontSize:11.5,color:T.red,fontWeight:600}}>{reviewErr[a.id]}</div>
              )}
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
                  if(!await window.confirmAsync(t("payroll.allocate_year_balances_for_all_staff", { year }))) return;
                  try{
                    const r=await api.post("/payroll/leave-balances/allocate-year",{year});
                    if(r.success){ alert(t("payroll.added_balance_row_s_added", { added: r.added })); await reload(); }
                  }catch(e){ alert(e.message); }
                }}
                style={{padding:"6px 12px",borderRadius:7,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>{t("payroll.allocate_year_balances", { year })}</button>
              <button onClick={async()=>{
                  if(!await window.confirmAsync(`Carry-forward ${year-1} → ${year}? Carry-forward waale leave types ka bacha balance ${year} ke carried_fwd me SET hoga (idempotent — dobara chalane par double nahi hota).`)) return;
                  try{
                    const r=await api.post("/payroll/leave-balances/rollover",{from_year:year-1,to_year:year});
                    if(r.success){ alert(t("payroll.rolled_balance_row_s_rolled_forward", { rolled: r.rolled })); await reload(); }
                    else alert(r.message||"Rollover failed");
                  }catch(e){ alert(e.message); }
                }}
                style={{padding:"6px 12px",borderRadius:7,background:T.purL,border:`1px solid ${T.pur}33`,color:T.pur,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>{t("payroll.carry_forward_year_year2", { year: year-1, year2: year })}</button>
            </div>
          )}
          <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"180px 80px 1fr 70px 70px 70px 80px",padding:"8px 14px",background:T.sb,color:"rgba(255,255,255,.55)",fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".3px"}}>
              {["Staff","Type","Name","Allocated","Used","Carried","Balance"].map((h,i)=><span key={i}>{h}</span>)}
            </div>
            {myBalances.length===0&&<div style={{padding:"30px 14px",textAlign:"center",color:T.t4,fontSize:12.5}}>{t("payroll.no_balances_allocated_yet")}</div>}
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
                  <span style={{color:T.t3}}>{b.leave_name}{b.is_unpaid?t("payroll.lop"):""}</span>
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

      {/* ─── HOLIDAYS (Calendar merged here) ─── */}
      {!loading && subTab==="holidays" && (
        <HolidayCalendarTab holidays={holidays} setHolidays={setHolidays} month={month} year={year} isAdmin={isAdmin}/>
      )}

      {/* ─── COVERAGE CHECK (approve modal) ─── */}
      {coverApp && (
        <LeaveCoverageModal app={coverApp} onClose={()=>setCoverApp(null)}
          onDecide={async(action,note)=>{ await review(coverApp.id,action,note); setCoverApp(null); }}/>
      )}
    </div>
  );
}

// ── LEAVE COVERAGE CHECK MODAL ───────────────────────────────────
// Approve se pehle ek nazar: same project / same role me in dates par
// aur kaun leave pe hai + worst-day coverage risk. Data:
// GET /payroll/leave-applications/:id/context
function LeaveCoverageModal({app,onClose,onDecide}){
  const [ctx,setCtx]=useState(null);
  const [loading,setLoading]=useState(true);
  const [acting,setActing]=useState(false);
  useEffect(()=>{
    let dead=false;
    api.get(`/payroll/leave-applications/${app.id}/context`)
      .then(r=>{ if(!dead&&r.success) setCtx(r.data); })
      .catch(()=>{})
      .finally(()=>{ if(!dead) setLoading(false); });
    return ()=>{ dead=true; };
  },[app.id]);

  const risk=ctx?.risk||null;
  const Chip=({label,c=T.slt,bg=T.sltL})=>(
    <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:bg,color:c,fontWeight:700}}>{label}</span>
  );
  const Row=({l,v})=>(
    <div style={{display:"flex",justifyContent:"space-between",gap:10,padding:"7px 0",borderBottom:`1px solid ${T.b1}`}}>
      <span style={{fontSize:11.5,color:T.t3}}>{l}</span>
      <span style={{fontSize:12,fontWeight:700,color:T.t1,textAlign:"right"}}>{v}</span>
    </div>
  );
  const OverlapList=({title,items})=>(
    <div style={{marginBottom:12}}>
      <div style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>{title}</div>
      {items.length===0
        ? <div style={{fontSize:11.5,color:T.t4}}>{t("payroll.koi_nahi_clear")}</div>
        : items.map(o=>(
          <div key={o.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0"}}>
            <Avatar name={o.staff_name} size={24}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{o.staff_name} <span style={{fontSize:10.5,color:T.t4,fontWeight:500}}>· {o.staff_role||"—"}{o.staff_project?` · ${o.staff_project}`:""}</span></div>
              <div style={{fontSize:10.5,color:T.t4}}>{fmtDate(o.from_date)} → {fmtDate(o.to_date)} · {o.leave_code}</div>
            </div>
            <Chip label={o.status} c={o.status==="Approved"?T.grn:T.amb} bg={o.status==="Approved"?T.grnL:T.ambL}/>
          </div>
        ))}
    </div>
  );

  return(
    <div 
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.surface,borderRadius:12,width:760,maxWidth:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{fontSize:15,fontWeight:800,color:T.t1}}>{t("payroll.leave_approval_coverage_check")}</div>
          <button onClick={()=>!acting&&onClose()} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.t4}}><IcX size={18}/></button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
          {loading ? <div style={{textAlign:"center",padding:"40px 0",color:T.t4,fontSize:12}}>{t("payroll.coverage_check_ho_raha_hai")}</div> : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1.15fr",gap:18}}>
              {/* Left — application detail */}
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <Avatar name={app.staff_name} size={36}/>
                  <div>
                    <div style={{fontSize:13.5,fontWeight:800,color:T.t1}}>{app.staff_name}</div>
                    <div style={{display:"flex",gap:5,marginTop:3}}>
                      {app.staff_role&&<Chip label={app.staff_role} c={T.blu} bg={T.bluL}/>}
                      {ctx?.app?.staff_project&&<Chip label={ctx.app.staff_project} c={T.pur} bg={T.purL}/>}
                    </div>
                  </div>
                </div>
                <Row l="Leave Type" v={`${app.leave_code} ${app.is_unpaid?"(LOP)":"(Paid)"}`}/>
                <Row l="Dates" v={`${fmtDate(app.from_date)} → ${fmtDate(app.to_date)}`}/>
                <Row l="Days" v={`${Number(app.days)}${app.is_half_day?" (half-day)":""}`}/>
                {ctx?.balance!=null&&<Row l="Balance available" v={`${Number(ctx.balance)} din`}/>}
                {app.reason&&<Row l="Reason" v={app.reason}/>}
                {ctx?.balance!=null&&Number(app.days)>Number(ctx.balance)&&(
                  <div style={{marginTop:10,padding:"8px 11px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:7,fontSize:11.5,color:T.red,fontWeight:600}}>
                   {t("payroll.balance_se_zyada_approve_backend_par")}
                  </div>
                )}
              </div>
              {/* Right — coverage context */}
              <div>
                {risk&&(
                  <div style={{display:"flex",gap:8,padding:"10px 12px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:9,marginBottom:12}}>
                    <IcAlert size={15} color={T.red}/>
                    <span style={{fontSize:12,color:T.t1,fontWeight:600}}>{risk.message}</span>
                  </div>
                )}
                <OverlapList title={`Same project${ctx?.app?.staff_project?` (${ctx.app.staff_project})`:""} — in dates par leave`} items={ctx?.sameProject||[]}/>
                <OverlapList title={`Same role${app.staff_role?` (${app.staff_role})`:""} — company-wide`} items={ctx?.sameRole||[]}/>
              </div>
            </div>
          )}
        </div>
        <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",justifyContent:"flex-end",gap:8,flexShrink:0}}>
          <button disabled={acting} onClick={async()=>{
              const note=await window.promptAsync(t("payroll.reject_reason_optional"));
              setActing(true); await onDecide("reject",note||null); setActing(false);
            }}
            style={{padding:"8px 16px",borderRadius:7,background:T.surface,border:`1px solid ${T.redM}`,color:T.red,fontSize:12,fontWeight:700,cursor:"pointer"}}>
           {t("common.reject_2")}
          </button>
          <button disabled={acting||loading} onClick={async()=>{ setActing(true); await onDecide("approve",null); setActing(false); }}
            style={{padding:"8px 18px",borderRadius:7,background:risk?T.amb:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            {risk?<><IcAlert size={13} color="#fff"/> {t("payroll.phir_bhi_approve")}</>:<>{t("common.approve")}</>}
          </button>
        </div>
      </div>
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
    if(!form.holiday_date||!form.name.trim()){ alert(t("payroll.date_and_name_required")); return; }
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
    if(!await window.confirmAsync(t("payroll.delete_this_holiday"))) return;
    try{ await api.del(`/payroll/holidays/${id}`); await reload(); }
    catch(e){ alert(e.message); }
  };
  const bulkSeed=async()=>{
    if(!await window.confirmAsync(t("payroll.seed_cg_national_2026_holidays_will"))) return;
    try{
      const r=await api.post(`/payroll/holidays/bulk-seed?year=${year}`,{});
      if(r.success){ alert(t("payroll.added_holiday_s_seeded", { added: r.added })); await reload(); }
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
          {l:t("payroll.working_days"),  v:workingDays,           sub:t("payroll.month_year", { month: MONTHS[month], year }), c:T.grn},
          {l:t("payroll.sundays"),       v:sundays,               sub:t("payroll.weekly_off"),                c:T.t3},
          {l:t("payroll.holidays"),      v:monthConfirmed,        sub:t("payroll.confirmed_off"),             c:T.red},
          {l:t("common.optional"),      v:monthOptional,         sub:t("payroll.admin_discretion"),          c:T.amb},
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
        <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{t("payroll.month_view_months_year", { MONTHS: MONTHS[month], year })}</div>
        <div style={{flex:1}}/>
        {isAdmin&&(
          <button onClick={bulkSeed}
            style={{padding:"6px 12px",borderRadius:7,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
           {t("payroll.seed_2026_defaults")}
          </button>
        )}
        {isAdmin&&(
          <button onClick={()=>openAdd("")}
            style={{padding:"6px 12px",borderRadius:7,background:T.grn,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}>
           {t("payroll.add_holiday")}
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
                    {hol.is_optional&&<div style={{fontSize:8.5,fontWeight:500,color:T.amb,opacity:0.9}}>{t("common.optional")}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Year list */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",background:T.sb,color:"white",fontSize:12.5,fontWeight:700}}>{t("payroll.all_holidays_year_yearlist", { year, yearList: yearList.length })}</div>
        {yearList.length===0&&<div style={{padding:"30px 14px",textAlign:"center",color:T.t4,fontSize:12.5}}>{t("payroll.no_holidays_added_yet_click_seed")}</div>}
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
                  <button onClick={()=>openEdit(h)} style={{padding:"3px 8px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>{t("common.edit_2")}</button>
                  <button onClick={()=>del(h.id)} style={{padding:"3px 8px",borderRadius:5,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>×</button>
                </>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit modal */}
      {addOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,width:420,maxWidth:"100%",padding:20,boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
            <div style={{fontSize:15,fontWeight:800,color:T.t1,marginBottom:14}}>{editId?t("payroll.edit_holiday"):t("payroll.add_holiday_2")}</div>
            <div style={{display:"grid",gap:9}}>
              <div>
                <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("common.date")}</div>
                <input type="date" value={form.holiday_date} onChange={e=>setForm(p=>({...p,holiday_date:e.target.value}))}
                  style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div>
                <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("common.name_2")}</div>
                <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder={t("payroll.e_g_diwali")}
                  style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div>
                  <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("common.type")}</div>
                  <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}
                    style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
                    {["National","Festival","Regional","Optional","Custom"].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("payroll.region")}</div>
                  <select value={form.region} onChange={e=>setForm(p=>({...p,region:e.target.value}))}
                    style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
                    {["All-India","Chhattisgarh","Other"].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12,color:T.t2,cursor:"pointer"}}>
                <input type="checkbox" checked={form.is_optional} onChange={e=>setForm(p=>({...p,is_optional:e.target.checked}))}/>
               {t("payroll.optional_holiday_admin_can_still_mark")}
              </label>
              <div>
                <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("common.notes")}</div>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2}
                  style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:7,marginTop:14}}>
              <button onClick={()=>!saving&&setAddOpen(false)} disabled={saving}
                style={{flex:1,padding:"8px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,color:T.t3,fontSize:12,fontWeight:600,cursor:saving?"not-allowed":"pointer"}}>{t("common.cancel")}</button>
              <button onClick={save} disabled={saving}
                style={{flex:2,padding:"8px",borderRadius:7,background:saving?T.t4:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer"}}>
                {saving?t("common.saving_2"):(editId?t("common.save_changes"):t("payroll.add_holiday_2"))}
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
      <div style={{fontSize:12.5,fontWeight:800,color:"#0D9488",marginBottom:8}}>{t("payroll.punch_review_rows_geofence_ke_bahar", { rows: rows.length })}</div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {rows.map(s=>{
          const val=tl[s.id];
          return(
          <div key={s.id} style={{background:T.surface,border:"1px solid #99F6E4",borderRadius:8,padding:"8px 11px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:180}}>
                <div style={{fontSize:12,fontWeight:700,color:T.t1}}>{s.user_name||t("master_library.staff")} {s.project_name&&<span style={{fontWeight:400,color:T.t3}}>· {s.project_name}</span>}</div>
                <div style={{fontSize:10.5,color:T.t3,marginTop:1}}>
                  🕐 {s.punch_in_at?new Date(s.punch_in_at).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",year:"2-digit"}):"—"}
                  {s.punch_in_lat!=null&&<>
                    {" · "}
                    <a href={`https://www.google.com/maps?q=${s.punch_in_lat},${s.punch_in_lng}`} target="_blank" rel="noreferrer" style={{color:"#0D9488",fontWeight:600,textDecoration:"none"}}>{t("payroll.map")}</a>
                  </>}
                  {" · "}
                  <button onClick={()=>toggleTimeline(s.id)} style={{background:"none",border:"none",color:"#0D9488",fontWeight:600,fontSize:10.5,cursor:"pointer",padding:0}}>🗺️ {openId===s.id?t("payroll.hide_timeline"):t("payroll.din_ka_timeline")}</button>
                </div>
                {s.out_reason&&<div style={{fontSize:10.5,color:T.t2,marginTop:2}}>📝 <b>{t("common.reason_2")}</b> {s.out_reason}</div>}
              </div>
              <button disabled={acting===s.id} onClick={()=>act(s.id,"reject")}
                style={{padding:"5px 11px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>{t("common.reject")}</button>
              <button disabled={acting===s.id} onClick={()=>act(s.id,"approve")}
                style={{padding:"5px 13px",borderRadius:6,background:"#0D9488",border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>{acting===s.id?"…":t("common.approve")}</button>
            </div>
            {openId===s.id&&(
              <div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed #99F6E4"}}>
                {val&&val.loading?(
                  <div style={{fontSize:10.5,color:T.t4}}>{t("payroll.timeline_load_ho_raha")}</div>
                ):(val&&val.pings&&val.pings.length?(
                  <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:160,overflowY:"auto"}}>
                    <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:2}}>{t("payroll.us_din_ka_gps_timeline_t", { t: val.pings.length })}</div>
                    {val.pings.map((p,i)=>(
                      <div key={i} style={{fontSize:10,color:T.t3,fontFamily:"monospace",display:"flex",gap:8}}>
                        <span style={{color:T.t4}}>{p.ts?new Date(p.ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):("#"+(i+1))}</span>
                        <a href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" style={{color:"#0D9488",textDecoration:"none"}}>{Number(p.lat).toFixed(5)}, {Number(p.lng).toFixed(5)} ↗</a>
                      </div>
                    ))}
                  </div>
                ):(
                  <div style={{fontSize:10.5,color:T.t4}}>{t("payroll.koi_gps_ping_nahi_mili_is")}</div>
                ))}
              </div>
            )}
          </div>
        );})}
      </div>
    </div>
  );
}

// ── DAY ATTENDANCE VIEW (2026-07 rework) ─────────────────────────
// Din-wise marking — aaj ki date default, sabhi manual staff ki list,
// ek click me sahi status select (no cycle-toggle mistakes), bulk "sab P".
// App users (GPS punch) alag read-only table — unki attendance geo-tag
// se aati hai, yahan sirf dikhti hai; review PunchReviewStrip me hota hai.
function DayAttendanceView({staff,att,setAtt,month,year,onAttChange,holidays=[],punchDays={},notes={},dayLocks={},isAdmin,onLocksChanged}){
  const now=new Date();
  const isCurMonth=now.getMonth()===month&&now.getFullYear()===year;
  const daysInMonth=new Date(year,month+1,0).getDate();
  const isPastMonth=year<now.getFullYear()||(year===now.getFullYear()&&month<now.getMonth());
  const maxDay=isCurMonth?now.getDate():isPastMonth?daysInMonth:0;   // future month → 0 (no marking)
  const [day,setDay]=useState(isCurMonth?now.getDate():isPastMonth?daysInMonth:1);
  useEffect(()=>{
    const n=new Date();
    const cur=n.getMonth()===month&&n.getFullYear()===year;
    const dim=new Date(year,month+1,0).getDate();
    const past=year<n.getFullYear()||(year===n.getFullYear()&&month<n.getMonth());
    setDay(cur?n.getDate():past?dim:1);
  },[month,year]);

  const dateObj=new Date(year,month,day);
  const dateISO=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  const dow=dateObj.getDay();
  const holiday=holidays.find(h=>{const d=new Date(h.holiday_date);return d.getDate()===day&&d.getMonth()===month&&d.getFullYear()===year;});
  const lock=dayLocks[dateISO]||null;   // {status:'locked'|'approved',...}
  const blocked=(holiday&&!holiday.is_optional)||maxDay===0||!!lock;

  const manual=staff.filter(s=>!s.isAppUser);
  const appUsers=staff.filter(s=>s.isAppUser);
  const getStatus=(id)=>att[id]?.[day]??null;
  const mark=(empId,status,note)=>{
    if(blocked) return;
    setAtt(p=>({...p,[empId]:{...p[empId],[day]:status}}));
    if(onAttChange) onAttChange(empId,day,status,note);
  };
  // App user manual mark — reason compulsory (GPS punch system hote hue manual kyu, audit ke liye)
  const markAppUser=async(emp,status)=>{
    if(blocked) return;
    const reason=await window.promptAsync(t("payroll.name_app_user_hai_gps_punch", { name: emp.name, status }));
    if(reason===null) return;
    if(!String(reason).trim()){ alert(t("payroll.reason_zaroori_hai")); return; }
    mark(emp.id,status,String(reason).trim());
  };
  const [bulking,setBulking]=useState(false);
  const [locking,setLocking]=useState(false);
  const [showEditReq,setShowEditReq]=useState(false);
  const unmarkedManual=manual.filter(s=>!getStatus(s.id));
  const bulkPresent=async()=>{
    if(blocked||unmarkedManual.length===0) return;
    if(!await window.confirmAsync(`${unmarkedManual.length} unmarked staff ko ${fmtDate(dateObj)} ke liye Present mark karein?`)) return;
    setBulking(true);
    unmarkedManual.forEach(s=>mark(s.id,"P"));
    setBulking(false);
  };
  const lockDay=async()=>{
    const unm=staff.filter(s=>!getStatus(s.id)).length;
    if(!await window.confirmAsync(`${fmtDate(dateObj)} ka attendance lock karein?${unm>0?` (${unm} staff abhi unmarked hain — lock ke baad change sirf Edit Request se hoga)`:""} Admin approve karega.`)) return;
    setLocking(true);
    try{
      const r=await api.post("/payroll/attendance/day-locks",{date:dateISO});
      if(r.success){ onLocksChanged&&onLocksChanged(); }
      else alert(r.message||"Lock failed");
    }catch(e){ alert(e.message); }
    setLocking(false);
  };
  const approveDay=async()=>{
    if(!await window.confirmAsync(`${fmtDate(dateObj)} ka attendance approve karein? Approve ke baad bhi change Edit Request se hi hoga.`)) return;
    setLocking(true);
    try{
      const r=await api.patch("/payroll/attendance/day-locks/approve",{date:dateISO});
      if(r.success){ onLocksChanged&&onLocksChanged(); }
      else alert(r.message||"Approve failed");
    }catch(e){ alert(e.message); }
    setLocking(false);
  };
  const unlockDay=async()=>{
    if(!await window.confirmAsync(`${fmtDate(dateObj)} ka lock hatayein? Marking wapas khul jayegi.`)) return;
    setLocking(true);
    try{
      const r=await api.del(`/payroll/attendance/day-locks?date=${dateISO}`);
      if(r.success){ onLocksChanged&&onLocksChanged(); }
      else alert(r.message||"Unlock failed");
    }catch(e){ alert(e.message); }
    setLocking(false);
  };

  const counts=(list)=>{
    const c={P:0,A:0,H:0,L:0,U:0};
    list.forEach(s=>{const v=getStatus(s.id);if(v&&c[v]!=null)c[v]++;else if(!v)c.U++;});
    return c;
  };
  const cm=counts(manual), ca=counts(appUsers);
  const STATUS_META={P:{l:t("common.present"),c:T.grn,bg:T.grnL},A:{l:t("common.absent"),c:T.red,bg:T.redL},H:{l:t("common.half_day"),c:T.amb,bg:T.ambL},L:{l:t("app.leave"),c:T.blu,bg:T.bluL}};
  const Chip=({v})=>{
    const m=STATUS_META[v];
    return m
      ? <span style={{fontSize:10.5,fontWeight:800,padding:"3px 10px",borderRadius:10,background:m.bg,color:m.c}}>{v} · {m.l}</span>
      : <span style={{fontSize:10.5,fontWeight:700,padding:"3px 10px",borderRadius:10,background:T.sltL,color:T.t4}}>{t("payroll.unmarked")}</span>;
  };

  // Date strip — ‹ date › + weekday, clamp 1..maxDay
  const canPrev=day>1, canNext=day<maxDay;
  const DOW=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  return(
    <div style={{maxWidth:980}}>
      {/* Date strip */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,padding:"6px 10px"}}>
          <button disabled={!canPrev} onClick={()=>setDay(d=>d-1)} style={{border:"none",background:"none",cursor:canPrev?"pointer":"default",color:canPrev?T.t2:T.b2,fontSize:15,fontWeight:800,padding:"0 4px"}}>‹</button>
          <div style={{textAlign:"center",minWidth:150}}>
            <div style={{fontSize:13,fontWeight:800,color:T.t1}}>{fmtDate(dateObj)}{isCurMonth&&day===now.getDate()?t("payroll.aaj"):""}</div>
            <div style={{fontSize:10,color:dow===0?T.red:T.t4,fontWeight:600}}>{DOW[dow]}{dow===0?t("payroll.week_off"):""}</div>
          </div>
          <button disabled={!canNext} onClick={()=>setDay(d=>d+1)} style={{border:"none",background:"none",cursor:canNext?"pointer":"default",color:canNext?T.t2:T.b2,fontSize:15,fontWeight:800,padding:"0 4px"}}>›</button>
        </div>
        {holiday&&(
          <span style={{fontSize:11,fontWeight:700,padding:"5px 12px",borderRadius:9,background:holiday.is_optional?T.ambL:T.redL,color:holiday.is_optional?T.amb:T.red,border:`1px solid ${holiday.is_optional?T.ambM:T.redM}`}}>
            🎉 {holiday.name}{holiday.is_optional?t("payroll.optional"):t("payroll.holiday_marking_band")}
          </span>
        )}
        {lock&&(
          <span style={{fontSize:11,fontWeight:700,padding:"5px 12px",borderRadius:9,
            background:lock.status==="approved"?T.grnL:T.ambL,color:lock.status==="approved"?T.grn:T.amb,
            border:`1px solid ${lock.status==="approved"?T.grnM:T.ambM}`}}>
            {lock.status==="approved"
              ? `✓ Approved${lock.approved_by_name?` by ${lock.approved_by_name}`:""}`
              : `🔒 Locked${lock.locked_by_name?` by ${lock.locked_by_name}`:""} — admin approval pending`}
          </span>
        )}
        <span style={{flex:1}}/>
        <div style={{display:"flex",gap:6,alignItems:"center",fontSize:10.5,color:T.t3,fontWeight:600}}>
          <span style={{color:T.grn}}>{cm.P+ca.P} P</span>·<span style={{color:T.red}}>{cm.A+ca.A} A</span>·<span style={{color:T.amb}}>{cm.H+ca.H} H</span>·<span style={{color:T.blu}}>{cm.L+ca.L} L</span>·<span style={{color:T.t4}}>{cm.U+ca.U} unmarked</span>
        </div>
        {/* Lock-flow actions */}
        {maxDay>0&&!(holiday&&!holiday.is_optional)&&(
          !lock?(
            <button disabled={locking} onClick={lockDay}
              style={{fontSize:11,fontWeight:700,color:"#fff",background:T.sb,border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer"}}>
             {t("payroll.din_lock_karo")}
            </button>
          ):(
            <div style={{display:"flex",gap:6}}>
              {lock.status==="locked"&&isAdmin&&(
                <button disabled={locking} onClick={approveDay}
                  style={{fontSize:11,fontWeight:700,color:"#fff",background:T.grn,border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer"}}>
                 {t("payroll.approve_day")}
                </button>
              )}
              <button onClick={()=>setShowEditReq(true)}
                style={{fontSize:11,fontWeight:700,color:T.blu,background:T.bluL,border:`1px solid ${T.blu}33`,borderRadius:8,padding:"7px 14px",cursor:"pointer"}}>
               {t("payroll.edit_request")}
              </button>
              {isAdmin&&(
                <button disabled={locking} onClick={unlockDay} title={t("payroll.lock_hatao_marking_wapas_khulegi")}
                  style={{fontSize:11,fontWeight:700,color:T.t3,background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,padding:"7px 12px",cursor:"pointer"}}>
                 {t("payroll.unlock")}
                </button>
              )}
            </div>
          )
        )}
      </div>

      {showEditReq&&(
        <StaffAttEditModal staff={staff} date={dateISO} dateLabel={fmtDate(dateObj)} att={att} day={day}
          onClose={()=>setShowEditReq(false)}
          onSubmitted={()=>{ setShowEditReq(false); alert(t("payroll.edit_request_submit_admin_approve_karega")); }}/>
      )}

      {maxDay===0?(
        <div style={{textAlign:"center",padding:"50px 0",color:T.t4,fontSize:13}}>{t("payroll.future_month_attendance_abhi_mark_nahi")}</div>
      ):(
      <>
      {/* ── Manual staff — marking yahan hoti hai ── */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,overflow:"hidden",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,background:T.surfaceB}}>
          <div style={{fontSize:12,fontWeight:800,color:T.t1}}>{t("payroll.manual_attendance")} <span style={{fontWeight:600,color:T.t4}}>· {manual.length} staff</span></div>
          <span style={{flex:1}}/>
          {!blocked&&unmarkedManual.length>0&&(
            <button disabled={bulking} onClick={bulkPresent}
              style={{fontSize:11,fontWeight:700,color:T.grn,background:T.grnL,border:`1px solid ${T.grn}44`,borderRadius:7,padding:"5px 12px",cursor:"pointer"}}>{t("payroll.baaki_unmarkedmanual_ko_present_mark_karo", { unmarkedManual: unmarkedManual.length })}</button>
          )}
        </div>
        {manual.length===0&&<div style={{padding:"26px 14px",textAlign:"center",color:T.t4,fontSize:12}}>{t("payroll.koi_manual_staff_nahi_sab_app")}</div>}
        {manual.map((emp,i)=>{
          const v=getStatus(emp.id);
          const isLeave=v==="L";
          const note=notes[emp.id]?.[day];
          return(
            <div key={emp.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderTop:i>0?`1px solid ${T.b1}`:"none"}}>
              <Avatar name={emp.name} size={28}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}</div>
                <div style={{fontSize:10,color:T.t4}}>{emp.role||"—"}{note&&<span style={{color:T.amb,fontWeight:600}}> · 📝 {note}</span>}</div>
              </div>
              {isLeave?(
                <Chip v="L"/>
              ):blocked?(
                <Chip v={v}/>
              ):(
                <div style={{display:"flex",gap:5}}>
                  {["P","A","H"].map(s=>{
                    const m=STATUS_META[s];
                    const active=v===s;
                    return(
                      <button key={s} onClick={()=>mark(emp.id,s)} title={m.l}
                        style={{width:34,height:28,borderRadius:7,fontSize:11.5,fontWeight:800,cursor:"pointer",transition:"all .12s",
                          border:`1.5px solid ${active?m.c:T.b1}`,background:active?m.c:T.surface,color:active?"#fff":T.t3}}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── App users — GPS punch se auto, sirf review ── */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,background:T.surfaceB}}>
          <div style={{fontSize:12,fontWeight:800,color:T.t1}}>{t("payroll.app_users_gps_punch")} <span style={{fontWeight:600,color:T.t4}}>· {appUsers.length} staff</span></div>
          <div style={{fontSize:10,color:T.t4,marginTop:2}}>{t("payroll.attendance_mobile_geo_tag_punch_se")}</div>
        </div>
        {appUsers.length===0&&<div style={{padding:"26px 14px",textAlign:"center",color:T.t4,fontSize:12}}>{t("payroll.koi_app_user_nahi")}</div>}
        {appUsers.map((emp,i)=>{
          const v=getStatus(emp.id);
          const punched=!!punchDays[emp.id]?.[day];
          const note=notes[emp.id]?.[day];
          const isLeave=v==="L";
          return(
            <div key={emp.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderTop:i>0?`1px solid ${T.b1}`:"none"}}>
              <Avatar name={emp.name} size={28} color={T.slt}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}</div>
                <div style={{fontSize:10,color:T.t4}}>{emp.role||"—"}{note&&<span style={{color:T.amb,fontWeight:600}}> · 📝 {note}</span>}</div>
              </div>
              {punched&&<span style={{fontSize:9.5,fontWeight:700,color:"#0D9488",background:"#F0FDFA",border:"1px solid #99F6E4",borderRadius:10,padding:"2px 8px"}}>{t("payroll.gps_punch")}</span>}
              {isLeave||blocked?(
                <Chip v={v}/>
              ):(
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  {!v&&<span style={{fontSize:10,color:T.t4,marginRight:2}}>{t("payroll.manual_reason")}</span>}
                  {v&&<Chip v={v}/>}
                  {["P","A","H"].map(s=>{
                    const m=STATUS_META[s];
                    const active=v===s;
                    return(
                      <button key={s} onClick={()=>markAppUser(emp,s)} title={`${m.l} — reason ke saath manual mark`}
                        style={{width:30,height:26,borderRadius:7,fontSize:10.5,fontWeight:800,cursor:"pointer",transition:"all .12s",
                          border:`1.5px dashed ${active?m.c:T.b2}`,background:active?m.bg:T.surface,color:active?m.c:T.t4}}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}

// ── STAFF ATT EDIT REQUEST MODAL ─────────────────────────────────
// Locked/approved din ki attendance change ka rasta — wahi flow jo
// labour attendance me hai: request + reason → admin approve → apply.
function StaffAttEditModal({staff,date,dateLabel,att,day,onClose,onSubmitted}){
  const [rows,setRows]=useState([{staff_id:"",new_status:"P"}]);
  const [reason,setReason]=useState("");
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const inp={width:"100%",padding:"6px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
  const cur=(id)=>att[Number(id)]?.[day]||"—";
  const submit=async()=>{
    setErr("");
    const changes=rows.filter(r=>r.staff_id).map(r=>({staff_id:Number(r.staff_id),date,new_status:r.new_status}));
    if(changes.length===0){ setErr(t("payroll.kam_se_kam_ek_staff_select")); return; }
    if(!reason.trim()){ setErr(t("payroll.reason_zaroori_hai")); return; }
    setSaving(true);
    try{
      const r=await api.post("/payroll/attendance-edit-requests",{scope:"staff",date_from:date,date_to:date,changes,reason:reason.trim()});
      if(r.success) onSubmitted&&onSubmitted();
      else setErr(r.message||"Submit failed");
    }catch(e){ setErr(e.message||"Network error"); }
    setSaving(false);
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,width:520,maxWidth:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:14.5,fontWeight:800,color:T.t1}}>{t("payroll.attendance_edit_request")}</div>
            <div style={{fontSize:11,color:T.t4,marginTop:2}}>{t("payroll.datelabel_din_locked_hai_admin_approve", { dateLabel })}</div>
          </div>
          <button onClick={()=>!saving&&onClose()} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.t4}}><IcX size={16}/></button>
        </div>
        <div style={{padding:"14px 18px"}}>
          {rows.map((r,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 90px 90px 28px",gap:8,marginBottom:8,alignItems:"center"}}>
              <select value={r.staff_id} onChange={e=>setRows(p=>p.map((x,j)=>j===i?{...x,staff_id:e.target.value}:x))} style={inp}>
                <option value="">{t("payroll.staff")}</option>
                {staff.map(s=><option key={s.id} value={s.id}>{s.name}{s.isAppUser?" 📱":""}</option>)}
              </select>
              <div style={{fontSize:11,color:T.t3,textAlign:"center"}}>{t("payroll.abhi")} <b>{cur(r.staff_id)}</b></div>
              <select value={r.new_status} onChange={e=>setRows(p=>p.map((x,j)=>j===i?{...x,new_status:e.target.value}:x))} style={inp}>
                {["P","A","H","L"].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={()=>setRows(p=>p.length>1?p.filter((_,j)=>j!==i):p)} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,fontSize:15}}>×</button>
            </div>
          ))}
          <button onClick={()=>setRows(p=>[...p,{staff_id:"",new_status:"P"}])}
            style={{fontSize:11,fontWeight:600,color:T.blu,background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:12}}>{t("payroll.aur_staff_add_karo")}</button>
          <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{t("payroll.reason_zaroori")}</div>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2} placeholder={t("payroll.change_kyu_chahiye_e_g_galat")} style={{...inp,resize:"vertical"}}/>
          {err&&<div style={{marginTop:8,padding:"7px 10px",background:T.redL,color:T.red,borderRadius:6,fontSize:11.5}}>{err}</div>}
        </div>
        <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={()=>!saving&&onClose()} style={{padding:"7px 16px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,color:T.t3,fontSize:12,fontWeight:600,cursor:"pointer"}}>{t("common.cancel")}</button>
          <button onClick={submit} disabled={saving}
            style={{padding:"7px 18px",borderRadius:7,background:saving?T.t4:T.blu,color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            {saving?t("common.submitting"):t("common.submit_request")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── STAFF EDIT-REQUESTS STRIP (admin) — pending requests approve/reject ──
function StaffEditRequestsStrip({staff,onActed}){
  const [rows,setRows]=useState([]);
  const [acting,setActing]=useState(null);
  const load=useCallback(()=>{
    api.get("/payroll/attendance-edit-requests?status=pending&scope=staff")
      .then(r=>{ if(r.success) setRows(r.data||[]); })
      .catch(()=>{});
  },[]);
  useEffect(()=>{ load(); },[load]);
  const staffName=(id)=>staff.find(s=>s.id===Number(id))?.name||`#${id}`;
  const act=async(id,status)=>{
    const notes=status==="rejected"?(await window.promptAsync(t("payroll.reject_reason_optional"))||null):null;
    setActing(id);
    try{
      const r=await api.patch(`/payroll/attendance-edit-requests/${id}`,{status,approval_notes:notes});
      if(r.success){ setRows(p=>p.filter(x=>x.id!==id)); onActed&&onActed(); }
      else alert(r.message||"Failed");
    }catch(e){ alert(e.message); }
    setActing(null);
  };
  if(!rows.length) return null;
  return(
    <div style={{background:T.bluL,border:`2px dashed ${T.blu}66`,borderRadius:10,padding:"11px 14px",marginBottom:12}}>
      <div style={{fontSize:12.5,fontWeight:800,color:T.blu,marginBottom:8}}>{t("payroll.attendance_edit_requests_rows_pending", { rows: rows.length })}</div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {rows.map(r=>{
          const changes=Array.isArray(r.changes)?r.changes:[];
          return(
            <div key={r.id} style={{background:T.surface,border:`1px solid ${T.bluM}`,borderRadius:8,padding:"8px 11px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:12,fontWeight:700,color:T.t1}}>
                  {changes.map((c,i)=><span key={i}>{i>0&&", "}{staffName(c.staff_id)} → <b style={{color:T.blu}}>{c.new_status}</b></span>)}
                  <span style={{fontWeight:400,color:T.t3}}> · {fmtDate(r.date_from)}</span>
                </div>
                <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>📝 {r.reason||"—"} <span style={{color:T.t4}}>{t("payroll.by_r", { r: r.requester_name||"?" })}</span></div>
              </div>
              <button disabled={acting===r.id} onClick={()=>act(r.id,"rejected")}
                style={{padding:"5px 11px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>{t("common.reject")}</button>
              <button disabled={acting===r.id} onClick={()=>act(r.id,"approved")}
                style={{padding:"5px 13px",borderRadius:6,background:T.blu,border:"none",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>{acting===r.id?"…":t("common.approve_apply")}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyAttGrid({staff,att,setAtt,month,year,onAttChange,holidays=[],punchDays={},dayLocks={}}){
  const daysInMonth=new Date(year,month+1,0).getDate();
  // Locked/approved days is month me — cells read-only (change = edit request via Day View)
  const lockedDaySet=new Set(Object.keys(dayLocks).map(d=>{
    const x=new Date(d+"T00:00:00");
    return (x.getMonth()===month&&x.getFullYear()===year)?x.getDate():null;
  }).filter(Boolean));
  const now=new Date();const today=(now.getMonth()===month&&now.getFullYear()===year)?now.getDate():month<now.getMonth()||year<now.getFullYear()?daysInMonth:0;
  const ATT_COLORS={"P":{bg:"#ECFDF5",c:"#059669",label:"P"},"A":{bg:"#FEF2F2",c:"#DC2626",label:"A"},"H":{bg:"#FFFBEB",c:"#D97706",label:"H"},"L":{bg:"#EFF6FF",c:"#2563EB",label:"L"},null:{bg:T.surfaceB,c:T.t4,label:"·"}};

  // Half-day 'L' markers — approved is_half_day applications this month
  // (half-day apply single-date hoti hai, so from_date is the day).
  const [halfL,setHalfL]=useState({});   // {staffId: Set<day>}
  useEffect(()=>{
    let alive=true;
    const mfmt=String(month+1).padStart(2,"0");
    const lastD=new Date(year,month+1,0).getDate();
    api.get(`/payroll/leave-applications?status=Approved&from=${year}-${mfmt}-01&to=${year}-${mfmt}-${String(lastD).padStart(2,"0")}`)
      .then(r=>{
        if(!alive||!r.success) return;
        const map={};
        (r.data||[]).filter(a=>a.is_half_day).forEach(a=>{
          const d=new Date(a.from_date);
          if(d.getMonth()===month&&d.getFullYear()===year){
            if(!map[a.staff_id]) map[a.staff_id]=new Set();
            map[a.staff_id].add(d.getDate());
          }
        });
        setHalfL(map);
      }).catch(()=>{});
    return()=>{ alive=false; };
  },[month,year,att]);

  // Build a day → holiday lookup for current month/year
  const holidayByDay={};
  holidays.forEach(h=>{
    const d=new Date(h.holiday_date);
    if(d.getMonth()===month&&d.getFullYear()===year){ holidayByDay[d.getDate()]=h; }
  });
  const isHolidayCell=(day)=>!!holidayByDay[day]&&!holidayByDay[day].is_optional;

  // Click-cycle hataya (galti se status badal jaata tha) — ab click par
  // chhota dropdown khulta hai, deliberate select ke baad hi change hota hai.
  const [selCell,setSelCell]=useState(null);   // "empId_day" | null
  const setStatus=(empId,day,status)=>{
    setAtt(p=>({...p,[empId]:{...p[empId],[day]:status}}));
    if(onAttChange) onAttChange(empId,day,status);
    setSelCell(null);
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
              {lockedDaySet.has(d)&&<div style={{fontSize:6,lineHeight:1,marginTop:1}}>🔒</div>}
              {isSun&&!hol&&<div style={{width:4,height:4,borderRadius:"50%",background:isFuture?T.b2:T.red,margin:"1px auto 0"}}/>}
              {hol&&<div style={{width:4,height:4,borderRadius:"50%",background:hol.is_optional?T.amb:T.red,margin:"1px auto 0"}}/>}
            </div>
          );
        })}
        <div style={{width:100,textAlign:"center",fontSize:9.5,fontWeight:600,color:T.t4,padding:"3px 6px"}}>{t("payroll.summary")}</div>
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
              const isHalfL=status==="L"&&!!halfL[emp.id]?.has(d);
              const cellBg=isHolBlock?"#FEE2E2":isFuture?"transparent":isHalfL?"#FEF3C7":sc.bg;
              const cellColor=isHolBlock?T.red:isFuture?T.b2:isHalfL?"#B45309":sc.c;
              const isAppUser=!!emp.isAppUser;
              const isDayLocked=lockedDaySet.has(d);
              const editable=!isFuture&&!isHolBlock&&!isAppUser&&!isDayLocked;
              const cellKey=`${emp.id}_${d}`;
              const menuOpen=selCell===cellKey;
              return(
                <div key={d}
                  onClick={()=>editable&&setSelCell(menuOpen?null:cellKey)}
                  style={{position:"relative",width:28,height:28,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:cellBg,borderRadius:4,cursor:editable?"pointer":"default",fontSize:9.5,fontWeight:700,color:cellColor,border:`1px solid ${menuOpen?T.blu:isHolBlock?"#FCA5A5":isFuture?"transparent":isHalfL?"#FDE68A":sc.bg}`,transition:"all .1s",margin:"0 1px",zIndex:menuOpen?30:"auto"}}
                  title={hol?`Holiday: ${hol.name}${hol.is_optional?" (Optional)":""}`:isDayLocked?`${emp.name} - Day ${d} · 🔒 Din locked — change Edit Request se (Day View)`:isAppUser?`${emp.name} - Day ${d} · App user — GPS punch se auto; manual mark Day View me reason ke saath`:isHalfL?`${emp.name} - Day ${d} · Half-day leave`:punchDays[emp.id]?.[d]?`${emp.name} - Day ${d} · 📍 GPS punch (mobile)`:`${emp.name} - Day ${d}`}>
                  {isHolBlock?"H":isFuture?"":isHalfL?"L½":sc.label}
                  {/* GPS-punch source badge — auto-Present from mobile punch */}
                  {!isFuture&&!isHolBlock&&punchDays[emp.id]?.[d]&&(
                    <span style={{position:"absolute",top:-1,right:0,fontSize:7,lineHeight:1}}>📍</span>
                  )}
                  {/* Status dropdown — deliberate select, no accidental toggle */}
                  {menuOpen&&(
                    <>
                      <div onClick={e=>{e.stopPropagation();setSelCell(null);}} style={{position:"fixed",inset:0,zIndex:31,cursor:"default"}}/>
                      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:30,left:"50%",transform:"translateX(-50%)",zIndex:32,background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,.18)",padding:4,display:"flex",gap:3}}>
                        {[["P","Present",T.grn],["A","Absent",T.red],["H","Half Day",T.amb],["L","Leave",T.blu]].map(([k,lbl,c])=>(
                          <button key={k} title={lbl} onClick={()=>setStatus(emp.id,d,k)}
                            style={{width:26,height:26,borderRadius:6,border:`1.5px solid ${status===k?c:T.b1}`,background:status===k?c:T.surface,color:status===k?"#fff":c,fontSize:10.5,fontWeight:800,cursor:"pointer"}}>
                            {k}
                          </button>
                        ))}
                      </div>
                    </>
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

      {staff.length===0&&<EmptyState icon={<IcTeam size={32} color={T.b2}/>} message="No staff for attendance tracking" sub={t("payroll.add_monthly_staff_members_first")}/>}

      {/* Legend */}
      <div style={{display:"flex",gap:12,marginTop:10,padding:"6px 10px",background:T.surfaceB,borderRadius:6,width:"fit-content"}}>
        {[["P","Present",T.grn,T.grnL],["H","Half Day",T.amb,T.ambL],["A","Absent",T.red,T.redL],["L","Leave",T.blu,T.bluL],["L½","Half-day Leave","#B45309","#FEF3C7"]].map(([k,lbl,c,bg])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:18,height:18,borderRadius:4,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,fontWeight:700,color:c}}>{k}</div>
            <span style={{fontSize:10.5,color:T.t3}}>{lbl}</span>
          </div>
        ))}
        <div style={{fontSize:10.5,color:T.t4,borderLeft:`1px solid ${T.b1}`,paddingLeft:10}}>{t("payroll.cell_click_status_select_gps_punch")}</div>
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
  // ESI eligibility on wage (fullGross ≤ ₹21k), deduction on earned gross
  const esi=fullGross<=21000?Math.round(grossEarned*0.0075):0;
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(520px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{background:"#0D1B2A",padding:"13px 18px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <Avatar name={emp.name} size={38} color={T.blu}/>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>{emp.name}</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)"}}>{emp.id} · {emp.role} · {MONTHS[month]} {year}</div>
        </div>
        <button onClick={printSlip} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:6,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",color:"white",fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
          <IcPrint size={13} color="white"/> {t("payroll.print_slip")}
        </button>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
        {/* Attendance summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
          {[{l:t("common.present"),v:P,c:T.grn},{l:t("common.half_day"),v:H,c:T.amb},{l:t("common.absent"),v:A,c:T.red},{l:t("payroll.effective"),v:effective,c:T.blu}].map((s,i)=>(
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
              {isAttBased?t("payroll.attendance_based_pro_rata"):t("payroll.fixed_monthly_salary")}
            </span>
            {isAttBased
              ?<span style={{fontSize:11,color:T.pur,marginLeft:8}}>{t("payroll.fmtn_wd_days_effective_eff_days", { fmtN: fmtN(fullGross), WD, effective, fmtN2: fmtN(grossEarned) })}</span>
              :<span style={{fontSize:11,color:T.grn,marginLeft:8}}>{t("payroll.full_gross_paid_regardless_of_attendance", { P, H: H>0?`${H}H `:"", A: A>0?`${A}A`:"" })}</span>
            }
          </div>
        </div>

        {/* Two column layout: Earnings | Deductions */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          {/* Earnings */}
          <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{padding:"8px 12px",background:T.grnL,borderBottom:`1px solid ${T.grnM}`}}>
              <span style={{fontSize:11,fontWeight:700,color:T.grn,textTransform:"uppercase",letterSpacing:".4px"}}>{t("payroll.earnings")}</span>
            </div>
            {[["Basic",emp.basicSalary],["HRA",emp.hra],["Conveyance",emp.conveyance],["Medical",emp.medical],emp.phone?["Phone",emp.phone]:null].filter(Boolean).map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",borderBottom:`1px solid ${T.b1}`}}>
                <span style={{fontSize:12,color:T.t2}}>{l}</span>
                <span style={{fontSize:12,fontWeight:500,color:T.t1}}>₹{fmtN(v)}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",background:T.grnL}}>
              <span style={{fontSize:12.5,fontWeight:700,color:T.grn}}>{t("common.gross")}</span>
              <span style={{fontSize:13,fontWeight:800,color:T.grn}}>₹{fmtN(grossEarned)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{padding:"8px 12px",background:T.redL,borderBottom:`1px solid ${T.redM}`}}>
              <span style={{fontSize:11,fontWeight:700,color:T.red,textTransform:"uppercase",letterSpacing:".4px"}}>{t("payroll.deductions")}</span>
            </div>
            {[[`PF (12%)`,pf],esi>0?[`ESI (0.75%)`,esi]:null,tds>0?[`TDS`,tds]:null,advDeduction>0?[`Advance`,advDeduction]:null].filter(Boolean).map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",borderBottom:`1px solid ${T.b1}`}}>
                <span style={{fontSize:12,color:T.t2}}>{l}</span>
                <span style={{fontSize:12,fontWeight:500,color:T.red}}>-₹{fmtN(v)}</span>
              </div>
            ))}
            {totalDed===0&&<div style={{padding:"7px 12px",fontSize:12,color:T.t4}}>{t("payroll.no_deductions")}</div>}
            <div style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",background:T.redL}}>
              <span style={{fontSize:12.5,fontWeight:700,color:T.red}}>{t("payroll.total_deductions")}</span>
              <span style={{fontSize:13,fontWeight:800,color:T.red}}>-₹{fmtN(totalDed)}</span>
            </div>
          </div>
        </div>

        {/* Net Pay */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:`linear-gradient(135deg,${T.grn}18,${T.grn}08)`,border:`2px solid ${T.grnM}`,borderRadius:10}}>
          <div>
            <div style={{fontSize:11,color:T.grn,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{t("payroll.net_pay_months_year", { MONTHS: MONTHS[month], year })}</div>
            <div style={{fontSize:11,color:T.t4}}>{t("payroll.bank_bankacc_ifsc_ifsc", { bankAcc: emp.bankAcc, ifsc: emp.ifsc })}</div>
          </div>
          <div style={{fontSize:26,fontWeight:800,color:T.grn}}>₹{fmtN(netPay)}</div>
        </div>
      </div>

      <div style={{padding:"11px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:7,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>{t("common.close")}</button>
        <button onClick={printSlip} style={{flex:2,padding:"9px",borderRadius:7,background:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <IcPrint size={14} color="white"/> {t("payroll.print_download_slip")}
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
    if (!changes.length) { setErr(t("payroll.koi_change_nahi_mila")); return; }
    if (!reason.trim()) { setErr(t("payroll.reason_zaroori_hai")); return; }
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,width:"min(900px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.3)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{padding:"14px 18px",background:"#0D1B2A",color:"white",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:14,fontWeight:700}}>{t("payroll.edit_attendance_bulk_request")}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}>{t("payroll.changes_go_to_admin_for_approval")}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:18,cursor:"pointer"}}>×</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        {stage==="range"&&(
          <div>
            <div style={{fontSize:12,color:T.t3,marginBottom:10}}>{t("payroll.step_1_date_range_select_karo")}</div>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14}}>
              <label style={{fontSize:12,color:T.t2,fontWeight:600}}>{t("common.from")}</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{padding:"6px 10px",border:`1.5px solid ${T.b1}`,borderRadius:6,fontSize:12,fontFamily:"inherit"}}/>
              <label style={{fontSize:12,color:T.t2,fontWeight:600}}>{t("common.to")}</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{padding:"6px 10px",border:`1.5px solid ${T.b1}`,borderRadius:6,fontSize:12,fontFamily:"inherit"}}/>
              <button onClick={()=>{ if (fromD>toD) { setErr(t("payroll.from_date_to_date_se_pehle")); return; } setErr(""); setStage("grid"); }}
                style={{marginLeft:"auto",padding:"7px 16px",borderRadius:7,background:T.blu,color:"white",border:"none",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>
               {t("payroll.next_edit_cells")}
              </button>
            </div>
            {err&&<div style={{fontSize:12,color:T.red,fontWeight:600}}>{err}</div>}
          </div>
        )}

        {stage==="grid"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:12,color:T.t3}}>{t("payroll.step2_dropdown_status")} {changeCount>0&&<span style={{color:T.amb,fontWeight:700}}>{changeCount} changes</span>}</div>
              <button onClick={()=>setStage("range")} style={{padding:"5px 11px",borderRadius:6,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:11.5,color:T.t3,cursor:"pointer"}}>{t("common.back_2")}</button>
            </div>
            <div style={{overflowX:"auto",border:`1px solid ${T.b1}`,borderRadius:7,maxHeight:300}}>
              <table style={{borderCollapse:"collapse",fontSize:11.5,width:"100%"}}>
                <thead style={{background:T.surfaceB,position:"sticky",top:0}}>
                  <tr>
                    <th style={{padding:"7px 10px",textAlign:"left",borderBottom:`1px solid ${T.b1}`,minWidth:160}}>{t("payroll.worker")}</th>
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
              <label style={{fontSize:12,color:T.t2,fontWeight:600,display:"block",marginBottom:5}}>{t("payroll.reason_for_change_admin_ko_dikhega")}</label>
              <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2} placeholder={t("payroll.eg_site_visit_verified_dinesh_was")}
                style={{width:"100%",padding:"7px 10px",border:`1.5px solid ${T.b1}`,borderRadius:6,fontSize:12,fontFamily:"inherit",resize:"vertical"}}/>
            </div>
            {err&&<div style={{fontSize:12,color:T.red,fontWeight:600,marginTop:6}}>{err}</div>}
          </div>
        )}
      </div>

      {stage==="grid"&&(
        <div style={{padding:"11px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"8px 16px",borderRadius:6,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>{t("common.cancel")}</button>
          <button onClick={submit} disabled={submitting||changeCount===0}
            style={{padding:"8px 18px",borderRadius:6,background:changeCount>0?T.blu:T.b2,color:"white",border:"none",fontSize:12.5,fontWeight:700,cursor:changeCount>0?"pointer":"not-allowed"}}>
            {submitting?t("common.sending"):`Send for Approval (${changeCount})`}
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,width:"min(800px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.3)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{padding:"14px 18px",background:"#0D1B2A",color:"white",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:14,fontWeight:700}}>{t("payroll.attendance_edit_approvals_items_pending", { items: items.length })}</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:18,cursor:"pointer"}}>×</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        {loading&&<div style={{textAlign:"center",color:T.t4,padding:30}}>{t("common.loading_2")}</div>}
        {!loading&&items.length===0&&<div style={{textAlign:"center",color:T.t4,padding:30}}>{t("payroll.koi_pending_request_nahi")}</div>}
        {items.map(req=>(
          <div key={req.id} style={{border:`1px solid ${T.b1}`,borderRadius:8,padding:12,marginBottom:12,background:T.surfaceB}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:T.t1}}>{t("payroll.request_id_req_changes", { id: req.id, req: req.changes?.length||0 })}</div>
                <div style={{fontSize:11,color:T.t4}}>{t("payroll.by_req_vnew", { req: req.requester_name||"User", vnew: new Date(req.requested_at).toLocaleString("en-IN") })}</div>
                <div style={{fontSize:11,color:T.t3,marginTop:3}}>{t("payroll.range_string_string2", { String: String(req.date_from).split("T")[0], String2: String(req.date_to).split("T")[0] })}</div>
              </div>
            </div>
            {req.reason&&<div style={{fontSize:11.5,color:T.t2,padding:"6px 10px",background:T.surface,borderLeft:`3px solid ${T.amb}`,borderRadius:4,marginBottom:8}}><b>{t("common.reason_2")}</b> {req.reason}</div>}
            <div style={{maxHeight:140,overflowY:"auto",border:`1px solid ${T.b1}`,borderRadius:6,background:T.surface,marginBottom:8}}>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                <thead><tr style={{background:T.surfaceB}}><th style={{padding:"5px 8px",textAlign:"left"}}>{t("payroll.worker")}</th><th style={{padding:"5px 8px"}}>{t("common.date")}</th><th style={{padding:"5px 8px"}}>{t("payroll.old_new")}</th></tr></thead>
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
              <input value={notes[req.id]||""} onChange={e=>setNotes(p=>({...p,[req.id]:e.target.value}))} placeholder={t("common.note_optional")}
                style={{width:"100%",padding:"6px 10px",border:`1px solid ${T.b1}`,borderRadius:5,fontSize:11.5,marginBottom:6,fontFamily:"inherit"}}/>
              <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                <button disabled={actingId===req.id} onClick={()=>act(req.id,"rejected")} style={{padding:"6px 14px",borderRadius:6,background:T.redL,border:`1px solid ${T.red}`,color:T.red,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>{t("common.reject")}</button>
                <button disabled={actingId===req.id} onClick={()=>act(req.id,"approved")} style={{padding:"6px 14px",borderRadius:6,background:T.grn,border:"none",color:"white",fontSize:11.5,fontWeight:700,cursor:"pointer"}}>{actingId===req.id?"…":t("common.approve")}</button>
              </div>
            </>)}
            {!isAdmin&&<div style={{fontSize:11,color:T.t4,fontStyle:"italic"}}>{t("common.awaiting_admin_approval")}</div>}
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
          <option value="All">{t("common.all_projects")}</option>
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
            <IcDown size={12} color={T.t2}/> {t("common.export")}
          </button>
          <button onClick={doResync} disabled={syncing} title={t("payroll.re_sync_from_project_attendance")}
            style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:syncing?T.sltL:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:12,fontWeight:600,cursor:syncing?"wait":"pointer"}}>
            {syncing?t("payroll.syncing"):t("payroll.re_sync")}
          </button>
          <button onClick={()=>setShowEditModal(true)} title={t("payroll.bulk_edit_attendance_sends_to_admin")}
            style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:12,fontWeight:600,cursor:"pointer"}}>
           {t("payroll.edit_attendance")}
          </button>
          <button onClick={()=>setShowApprovalModal(true)} title={t("payroll.view_pending_approvals")}
            style={{position:"relative",display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:T.purL,border:`1px solid ${T.purM}`,color:T.pur,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            {t("payroll.approvals_tab")}
            {pendingCount>0&&<span style={{position:"absolute",top:-5,right:-5,background:T.red,color:"white",fontSize:9.5,fontWeight:700,padding:"1px 5px",borderRadius:9,minWidth:14,textAlign:"center"}}>{pendingCount}</span>}
          </button>
          {syncMsg&&<span style={{fontSize:11,color:syncMsg.startsWith("✓")?T.grn:T.red,fontWeight:600}}>{syncMsg}</span>}
          <div style={{padding:"6px 13px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:7}}>
            <span style={{fontSize:11,color:T.grn,fontWeight:600}}>{t("payroll.total_payable_till_today")} </span>
            <span style={{fontSize:14,fontWeight:800,color:T.grn}}>₹{fmtN(totalPayable)}</span>
          </div>
        </div>
      </div>

      {filteredWorkers.length===0&&<EmptyState icon={<IcTeam size={32} color={T.b2}/>} message="No daily workers found" sub={selProject!=="All"?`No workers for project "${selProject}"`:t("payroll.add_daily_wage_workers_to_track")}/>}

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
            <div style={{width:70,textAlign:"center",fontSize:9.5,color:T.t4,paddingLeft:4}}>{t("payroll.days")}</div>
            <div style={{width:50,textAlign:"center",fontSize:9.5,color:T.t4}}>{t("payroll.ot_hrs")}</div>
            <div style={{width:80,textAlign:"right",fontSize:9.5,color:T.t4,paddingRight:4}}>{t("payroll.pay")}</div>
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
           {t("payroll.sun_sat_weekly_grouping_direct_edit")}
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
                    <div style={{fontSize:9.5,color:T.t4}}>{t("payroll.rate_day")}</div>
                    <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>₹{fmtN(w.ratePerDay)}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                  {[{l:t("payroll.days"),v:presentDays,c:T.grn},{l:t("payroll.ot_hrs"),v:otHours||"—",c:T.pur},{l:t("payroll.payable"),v:`₹${fmtN(total)}`,c:T.blu}].map((s,i)=>(
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
                    <div style={{fontSize:10.5,fontWeight:700,color:T.pur,marginBottom:7}}>{t("payroll.ot_hours_per_day_rate_rateot", { rateOT: w.rateOT })}</div>
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

// Modal form helpers — MODULE scope par, component ke andar nahi.
// Andar define karne se har keystroke pe naya component-type banta tha
// → React input remount karta tha → cursor/focus ud jaata tha.
const ModalSect=({title,children})=>(
  <div style={{marginBottom:14}}>
    <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${T.b1}`}}>{title}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{children}</div>
  </div>
);
const ModalField=({label,children,full})=>(
  <div style={full?{gridColumn:"1 / -1"}:{}}>
    <div style={{fontSize:10,color:T.t4,fontWeight:600,marginBottom:3}}>{label}</div>
    {children}
  </div>
);

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
    project:     emp.project||"",
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
  const Sect=ModalSect, F=ModalField;   // module-scope helpers — focus-loss fix
  const inp={width:"100%",padding:"5px 8px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface};
  return(
    <div 
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.surface,borderRadius:12,width:560,maxWidth:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:T.t1}}>{t("payroll.edit_staff_master")}</div>
            <div style={{fontSize:11,color:T.t4,marginTop:2}}>{t("payroll.name_id_id", { name: emp.name, id: emp.id })}</div>
          </div>
          <button onClick={()=>!saving&&onClose()} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.t4}}>
            <IcX size={18}/>
          </button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
          <Sect title={t("payroll.personal")}>
            <F label={t("common.name_2")}><input style={inp} value={form.name} onChange={e=>set("name",e.target.value)}/></F>
            <F label={t("payroll.mobile")}><input style={inp} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder={t("payroll.10_digit")}/></F>
            <F label={t("common.email")}><input style={inp} value={form.email} onChange={e=>set("email",e.target.value)}/></F>
            <F label={t("payroll.aadhaar")}><input style={inp} value={form.aadhaar} onChange={e=>set("aadhaar",e.target.value)} placeholder={t("payroll.12_digit")}/></F>
            <F label={t("payroll.role_designation")}><input style={inp} value={form.role} onChange={e=>set("role",e.target.value)}/></F>
            <F label={t("payroll.department")}><input style={inp} value={form.dept} onChange={e=>set("dept",e.target.value)}/></F>
            {/* Dropdown (not free text) — Overview ki project-wise coverage typo se na toote */}
            <F label={t("payroll.posting_project")} full><SearchSelect value={form.project} options={PROJECTS||[]} onChange={v=>set("project",v)} placeholder={t("payroll.office_koi_project_nahi")}/></F>
          </Sect>
          <Sect title={t("payroll.salary_earnings_month")}>
            <F label={t("payroll.basic")}><input style={inp} type="number" value={form.basic_salary} onChange={e=>set("basic_salary",Number(e.target.value)||0)}/></F>
            <F label="HRA"><input style={inp} type="number" value={form.hra} onChange={e=>set("hra",Number(e.target.value)||0)}/></F>
            <F label={t("payroll.conveyance")}><input style={inp} type="number" value={form.conveyance} onChange={e=>set("conveyance",Number(e.target.value)||0)}/></F>
            <F label={t("payroll.medical")}><input style={inp} type="number" value={form.medical} onChange={e=>set("medical",Number(e.target.value)||0)}/></F>
            <F label={t("payroll.phone_allowance")}><input style={inp} type="number" value={form.phone_allowance} onChange={e=>set("phone_allowance",Number(e.target.value)||0)}/></F>
            <F label={t("payroll.petrol_allowance")}><input style={inp} type="number" value={form.petrol_allowance} onChange={e=>set("petrol_allowance",Number(e.target.value)||0)}/></F>
            <F label={t("payroll.special_allowance")} full><input style={inp} type="number" value={form.special_allowance} onChange={e=>set("special_allowance",Number(e.target.value)||0)}/></F>
          </Sect>
          <Sect title={t("payroll.pf_configuration")}>
            <F label={t("payroll.pf_applicable")}>
              <select style={inp} value={form.pf_applicable?"yes":"no"} onChange={e=>set("pf_applicable",e.target.value==="yes")}>
                <option value="yes">{t("payroll.yes")}</option><option value="no">{t("payroll.no")}</option>
              </select>
            </F>
            <F label={t("payroll.calculation_method")}>
              <select style={inp} value={form.pf_method} onChange={e=>set("pf_method",e.target.value)} disabled={!form.pf_applicable}>
                <option value="none">{t("payroll.none_0")}</option>
                <option value="capped_15k">{t("payroll.capped_at_15_000_12_of")}</option>
                <option value="full_basic">{t("payroll.full_basic_12_of_full_basic")}</option>
                <option value="custom">{t("payroll.custom_fixed_amount")}</option>
              </select>
            </F>
            {form.pf_method==="custom"&&form.pf_applicable&&(
              <F label={t("payroll.custom_pf_amount")}><input style={inp} type="number" value={form.pf_custom_amount} onChange={e=>set("pf_custom_amount",Number(e.target.value)||0)}/></F>
            )}
            <F label="UAN" full={form.pf_method!=="custom"}><input style={inp} value={form.pf_uan} onChange={e=>set("pf_uan",e.target.value)}/></F>
          </Sect>
          <Sect title={t("payroll.esic_configuration")}>
            <F label={t("payroll.esic_applicable")}>
              <select style={inp} value={form.esic_applicable?"yes":"no"} onChange={e=>set("esic_applicable",e.target.value==="yes")}>
                <option value="yes">{t("payroll.yes_auto_if_gross_21k")}</option><option value="no">{t("payroll.no")}</option>
              </select>
            </F>
            <F label={t("payroll.esic_number")}><input style={inp} value={form.esic_number} onChange={e=>set("esic_number",e.target.value)}/></F>
          </Sect>
          <Sect title={t("common.bank_details")}>
            <F label={t("payroll.bank_account_number")}><input style={inp} value={form.bank_acc} onChange={e=>set("bank_acc",e.target.value)}/></F>
            <F label="IFSC"><input style={inp} value={form.ifsc} onChange={e=>set("ifsc",e.target.value)}/></F>
            <F label="PAN" full><input style={inp} value={form.pan} onChange={e=>set("pan",e.target.value)}/></F>
          </Sect>
          <Sect title={t("payroll.payment_mode")}>
            <F label={t("payroll.salary_tracking")} full>
              <div style={{display:"flex",gap:8}}>
                {[{v:1,l:t("payroll.salary_on"),sub:t("payroll.appears_in_monthly_salary")},{v:0,l:t("payroll.salary_off"),sub:t("payroll.attendance_only_app_user")}].map(o=>(
                  <button key={o.v} type="button" onClick={()=>set("salary_enabled",o.v)}
                    style={{flex:1,padding:"9px 11px",borderRadius:8,border:`1.5px solid ${form.salary_enabled===o.v?(o.v?T.grn:T.amb):T.b1}`,background:form.salary_enabled===o.v?(o.v?T.grnL:T.ambL):T.surface,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:form.salary_enabled===o.v?(o.v?T.grn:T.amb):T.t2}}>{o.l}</div>
                    <div style={{fontSize:10,color:T.t4,marginTop:1}}>{o.sub}</div>
                  </button>
                ))}
              </div>
            </F>
            {!!form.salary_enabled && <F label={t("common.type")} full>
              <select style={inp} value={form.payment_type} onChange={e=>set("payment_type",e.target.value)}>
                <option value="fixed">{t("payroll.fixed_full_month_salary_regardless_of")}</option>
                <option value="attendance">{t("payroll.attendance_based_pro_rated_by_p")}</option>
              </select>
            </F>}
          </Sect>
        </div>
        <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          {err&&<span style={{flex:1,fontSize:11.5,color:T.red}}>{err}</span>}
          {!err&&<span style={{flex:1}}/>}
          <button onClick={()=>!saving&&onClose()} disabled={saving}
            style={{padding:"7px 16px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,color:T.t3,fontSize:12,fontWeight:600,cursor:saving?"not-allowed":"pointer"}}>{t("common.cancel")}</button>
          <button onClick={save} disabled={saving}
            style={{padding:"7px 18px",borderRadius:7,background:saving?T.t4:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer"}}>
            {saving?t("common.saving_2"):t("common.save_changes")}
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
  // Library → Staff Designation ki list. Yahin se chunte hain taaki naam
  // har jagah ek jaisa rahe.
  const [desigList,setDesigList]=useState([]);
  const [addingDesig,setAddingDesig]=useState(false);
  const [newDesig,setNewDesig]=useState("");
  const loadDesig=useCallback(async()=>{
    try{ const r=await api.get("/library/designations"); if(r.success) setDesigList(r.data||[]); }catch(e){}
  },[]);
  useEffect(()=>{ loadDesig(); },[loadDesig]);
  const saveNewDesig=async()=>{
    const nm=newDesig.trim(); if(!nm) return;
    try{
      const r=await api.post("/library/designations",{name:nm});
      if(r.success) await loadDesig();
      set("designation", r.success ? (r.data?.name||nm) : nm);   // pehle se ho to bas chun lo
    }catch(e){}
    setAddingDesig(false);
  };
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const [form,setForm]=useState({
    name:"", designation:"", phone:"", staff_subtype:"office",
    project:"",
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
    if(!form.name.trim()){ setErr(t("payroll.naam_zaroori_hai")); return; }
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
        project:form.project||null,
        join_date:new Date().toISOString().slice(0,10),
      });
      if(sRes.success){ onSaved&&onSaved(); }
      else setErr(sRes.message||"Staff add failed");
    }catch(e){ setErr(e.message||"Network error"); }
    setSaving(false);
  };

  const Sect=ModalSect, F=ModalField;   // module-scope helpers — focus-loss fix
  const inp={width:"100%",padding:"5px 8px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface};

  return(
    <div 
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.surface,borderRadius:12,width:560,maxWidth:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:T.t1}}>{t("payroll.add_staff_to_payroll")}</div>
            <div style={{fontSize:11,color:T.t4,marginTop:2}}>{t("payroll.library_se_fetch_karein_ya_naya")}</div>
          </div>
          <button onClick={()=>!saving&&onClose()} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.t4}}><IcX size={18}/></button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
          {/* ── Library search ── */}
          <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:9,padding:"11px 13px",marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:T.blu,marginBottom:5}}>{t("payroll.existing_staff_library_se_fetch_karein")}</div>
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
                  placeholder={t("payroll.naam_ya_designation_se_search")}
                  style={{...inp,fontSize:12.5}}/>
                {results.length>0&&(
                  <div style={{marginTop:6,background:T.surface,border:`1px solid ${T.b1}`,borderRadius:7,maxHeight:150,overflowY:"auto"}}>
                    {results.map(p=>(
                      <div key={p.party_id} onClick={()=>pickStaff(p)}
                        style={{padding:"7px 11px",cursor:"pointer",borderBottom:`1px solid ${T.b1}`,fontSize:12}}>
                        <b>{p.name}</b>{p.designation?<span style={{color:T.t3}}> — {p.designation}</span>:null}
                        <div style={{fontSize:10,color:T.t4,marginTop:1}}>{t("payroll.p_library", { p: p.staff_subtype==="wages"?"Daily wages":"Office staff" })}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{fontSize:10,color:T.t4,marginTop:5}}>
                 {t("payroll.naam_library_me_hai_to_fetch")}
                </div>
              </>
            )}
          </div>

          <Sect title={t("payroll.personal")}>
            <F label={t("common.name_2")}><input style={{...inp,...(picked?{background:T.surfaceB}:{})}} value={form.name} onChange={e=>set("name",e.target.value)} disabled={!!picked}/></F>
            <F label={t("payroll.mobile")}><input style={inp} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder={t("payroll.10_digit")}/></F>
            {/* Designation pehle free text tha — isi wajah se ek hi company me
                "ENGINEER" aur "Engineer" alag-alag gine jaate the. Ab Library
                ki list; usme na ho to "+ New" se wahin jud jaata hai. */}
            <F label={t("master_library.designation")}>
              {addingDesig ? (
                <div style={{display:"flex",gap:6}}>
                  <input autoFocus style={{...inp,flex:1}} value={newDesig} onChange={e=>setNewDesig(e.target.value)}
                    placeholder={t("master_library.e_g_site_engineer")}
                    onKeyDown={e=>{ if(e.key==="Enter"){e.preventDefault();saveNewDesig();} if(e.key==="Escape") setAddingDesig(false); }}/>
                  <button type="button" onClick={saveNewDesig} style={{padding:"0 12px",borderRadius:7,border:"none",background:T.blu,color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>{t("common.add")}</button>
                  <button type="button" onClick={()=>setAddingDesig(false)} style={{padding:"0 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,background:T.surface,color:T.t3,fontSize:12,cursor:"pointer"}}>{t("common.cancel")}</button>
                </div>
              ) : (
                <div style={{display:"flex",gap:6}}>
                  <select style={{...inp,flex:1}} value={form.designation} onChange={e=>set("designation",e.target.value)}>
                    <option value="">{t("master_library.select_designation")}</option>
                    {desigList.map(d=><option key={d.id||d.name} value={d.name}>{d.name}</option>)}
                    {/* Purana naam jo list me nahi hai — warna edit karte hi gayab ho jaata */}
                    {!!form.designation && !desigList.some(d=>d.name===form.designation) && <option value={form.designation}>{form.designation}</option>}
                  </select>
                  <button type="button" onClick={()=>{setNewDesig("");setAddingDesig(true);}}
                    style={{padding:"0 12px",borderRadius:7,border:`1.5px dashed ${T.b1}`,background:T.surface,color:T.t3,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>+ {t("common.new")}</button>
                </div>
              )}
            </F>
            <F label={t("master_library.subtype")}>
              <select style={inp} value={form.staff_subtype} onChange={e=>set("staff_subtype",e.target.value)} disabled={!!picked}>
                <option value="office">{t("payroll.office_staff")}</option>
                <option value="wages">{t("master_library.daily_wages_worker")}</option>
              </select>
            </F>
            {/* Dropdown (not free text) — Overview ki project-wise coverage typo se na toote */}
            <F label={t("payroll.posting_project")} full><SearchSelect value={form.project} options={PROJECTS||[]} onChange={v=>set("project",v)} placeholder={t("payroll.office_koi_project_nahi")}/></F>
          </Sect>
          <Sect title={t("payroll.salary_earnings_month")}>
            <F label={t("payroll.basic")}><input style={inp} type="number" value={form.basic_salary} onChange={e=>set("basic_salary",e.target.value)}/></F>
            <F label="HRA"><input style={inp} type="number" value={form.hra} onChange={e=>set("hra",e.target.value)}/></F>
            <F label={t("payroll.conveyance")}><input style={inp} type="number" value={form.conveyance} onChange={e=>set("conveyance",e.target.value)}/></F>
            <F label={t("payroll.medical")}><input style={inp} type="number" value={form.medical} onChange={e=>set("medical",e.target.value)}/></F>
            <F label={t("payroll.phone_allowance")}><input style={inp} type="number" value={form.phone_allowance} onChange={e=>set("phone_allowance",e.target.value)}/></F>
            <F label={t("payroll.petrol_allowance")}><input style={inp} type="number" value={form.petrol_allowance} onChange={e=>set("petrol_allowance",e.target.value)}/></F>
            <F label={t("payroll.special_allowance")} full><input style={inp} type="number" value={form.special_allowance} onChange={e=>set("special_allowance",e.target.value)}/></F>
          </Sect>
          <Sect title={t("payroll.pf_esic")}>
            <F label={t("payroll.pf_applicable")}>
              <select style={inp} value={form.pf_applicable?"yes":"no"} onChange={e=>set("pf_applicable",e.target.value==="yes")}>
                <option value="yes">{t("payroll.yes")}</option><option value="no">{t("payroll.no")}</option>
              </select>
            </F>
            <F label={t("payroll.pf_method")}>
              <select style={inp} value={form.pf_method} onChange={e=>set("pf_method",e.target.value)} disabled={!form.pf_applicable}>
                <option value="none">{t("common.none")}</option>
                <option value="capped_15k">{t("payroll.capped_at_15_000")}</option>
                <option value="full_basic">{t("payroll.full_basic_12")}</option>
                <option value="custom">{t("payroll.custom_amount")}</option>
              </select>
            </F>
            {form.pf_method==="custom"&&form.pf_applicable&&(
              <F label={t("payroll.custom_pf")}><input style={inp} type="number" value={form.pf_custom_amount} onChange={e=>set("pf_custom_amount",e.target.value)}/></F>
            )}
            <F label={t("payroll.esic_applicable")} full={form.pf_method!=="custom"}>
              <select style={inp} value={form.esic_applicable?"yes":"no"} onChange={e=>set("esic_applicable",e.target.value==="yes")}>
                <option value="yes">{t("payroll.yes_auto_if_gross_21k")}</option><option value="no">{t("payroll.no")}</option>
              </select>
            </F>
          </Sect>
          <Sect title={t("payroll.payment_mode")}>
            <F label={t("common.type")} full>
              <select style={inp} value={form.payment_type} onChange={e=>set("payment_type",e.target.value)}>
                <option value="fixed">{t("payroll.fixed_full_month_salary")}</option>
                <option value="attendance">{t("payroll.attendance_based_pro_rated")}</option>
              </select>
            </F>
          </Sect>
        </div>
        <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          {err?<span style={{flex:1,fontSize:11.5,color:T.red}}>{err}</span>:<span style={{flex:1}}/>}
          <button onClick={()=>!saving&&onClose()} disabled={saving}
            style={{padding:"7px 16px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,color:T.t3,fontSize:12,fontWeight:600,cursor:saving?"not-allowed":"pointer"}}>{t("common.cancel")}</button>
          <button onClick={save} disabled={saving}
            style={{padding:"7px 18px",borderRadius:7,background:saving?T.t4:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer"}}>
            {saving?t("common.saving_2"):t("payroll.add_to_payroll")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MONTHLY SALARY TAB ────────────────────────────────────────────
function MonthlySalaryTab({staff,att,month,year,onViewSlip,advances,workingDays,isAdmin,onStaffUpdate,holidays}){
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

  // ─── LOP day-map per staff for this month (Phase 3) ──────
  // Approved leave applications with is_unpaid=1 → mark those dates as
  // "L but unpaid". Fraction 0.5 for half-day LOP (worked half stays
  // payable), 1 for a full unpaid day — mirrors backend computeRun.
  const [lopDays,setLopDays]=useState({});  // {staffId: Map<dayNum,fraction>}
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
        if(!map[a.staff_id]) map[a.staff_id]=new Map();
        const f=new Date(a.from_date), t=new Date(a.to_date);
        const cur=new Date(f);
        while(cur<=t){
          if(cur.getFullYear()===year && cur.getMonth()===month) map[a.staff_id].set(cur.getDate(),a.is_half_day?0.5:1);
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

  const [filterDesig,setFilterDesig]=useState("All");

  // Salary list shows only salary-enabled staff. App-users with salary OFF
  // appear in Attendance but not here (until admin enables salary).
  const salaryOffCount = staff.filter(e=>e.salaryEnabled===false).length;

  // Designation ka filter — ginti yahin staff se banti hai, isliye jo naam
  // sach me kisi par laga hai wahi dikhta hai (Library ka ho ya purana
  // free text). Isse ek nazar me pata chalta hai kis designation par kitne.
  const desigCounts=useMemo(()=>{
    const m=new Map();
    for(const e of staff){
      if(e.salaryEnabled===false) continue;
      const d=String(e.designation||e.role||"").trim();
      if(!d) continue;
      m.set(d,(m.get(d)||0)+1);
    }
    return m;
  },[staff]);
  const desigOpts=useMemo(()=>[...desigCounts.keys()].sort((a,b)=>a.localeCompare(b)),[desigCounts]);

  const filtered=staff.filter(e=>e.salaryEnabled!==false)
    .filter(e=>filterDesig==="All"||String(e.designation||e.role||"").trim()===filterDesig)
    .filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase())||(e.role||"").toLowerCase().includes(search.toLowerCase()));

  const WD=workingDays||26;
  // Holidays payable (mirrors backend computeRun): non-optional, non-Sunday
  // holidays of this month are paid days for attendance-type staff.
  const payableHolidayDays=(holidays||[]).filter(h=>{
    const d=new Date(h.holiday_date);
    return d.getFullYear()===year&&d.getMonth()===month&&!h.is_optional&&d.getDay()!==0;
  }).map(h=>new Date(h.holiday_date).getDate());
  const calcNet=(emp)=>{
    const days=att[emp.id]||{};
    const P=Object.values(days).filter(v=>v==="P").length;
    const H=Object.values(days).filter(v=>v==="H").length;
    const A=Object.values(days).filter(v=>v==="A").length;
    // Paid leave counts as present; LOP (unpaid) leave does NOT.
    // lopDays[emp.id] holds Map<day,fraction> approved as LOP this month —
    // 0.5 for half-day LOP (worked half stays payable), 1 for full day.
    const lopSet=lopDays[emp.id]||new Map();
    let L_paid=0, L_unpaid=0, lopHalfCredit=0;
    Object.entries(days).forEach(([d,v])=>{ if(v==="L"){ const frac=lopSet.get(Number(d)); if(frac===undefined) L_paid++; else { L_unpaid+=frac; if(frac===0.5) lopHalfCredit+=0.5; } } });
    const pType=paymentTypes[emp.id]||emp.paymentType||"fixed";
    // Holidays on/after join date (mid-month joiners) — attendance staff only;
    // no cap at WD (extra Sunday work marked P legitimately exceeds WD).
    let joinDay=1;
    if(emp.joinDate){ const jd=new Date(emp.joinDate); if(jd.getFullYear()===year&&jd.getMonth()===month) joinDay=jd.getDate(); }
    const payableHolidays=pType==="attendance"?payableHolidayDays.filter(d=>d>=joinDay).length:0;
    const effective=P+(H*0.5)+L_paid+lopHalfCredit+payableHolidays;
    // Petrol + Special allowance added as part of gross (Phase 2 fields,
    // default 0 when not set so legacy rows keep working)
    const fullGross=emp.basicSalary+emp.hra+emp.conveyance+emp.medical+emp.phone+(emp.petrolAllowance||0)+(emp.specialAllowance||0);
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
    // ESI: eligibility on the monthly WAGE (fullGross ≤ ₹21k), deduction 0.75%
    // of earned gross — gross is already prorated, so no re-proration.
    const esi=(esicApplicable&&fullGross<=21000)?Math.round(gross*0.0075):0;
    // PF prorated for attendance-paid staff; 'fixed' staff full month value.
    const pf=pType==="fixed"?pfFull:Math.round((pfFull/WD)*effective);
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
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("payroll.search_employee")}
            style={{height:32,padding:"0 8px 0 26px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",width:"100%"}}/>
        </div>
        <select value={filterDesig} onChange={e=>setFilterDesig(e.target.value)}
          style={{height:32,padding:"0 8px",borderRadius:7,border:`1.5px solid ${filterDesig==="All"?T.b1:T.blu}`,fontSize:12,
                  color:filterDesig==="All"?T.t1:T.blu,background:filterDesig==="All"?T.surface:T.bluL,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
          <option value="All">{t("master_library.all_designations")}</option>
          {desigOpts.map(d=><option key={d} value={d}>{d} ({desigCounts.get(d)})</option>)}
        </select>
        <div style={{marginLeft:"auto",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{padding:"6px 13px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7}}>
            <span style={{fontSize:11,color:T.blu}}>{t("payroll.total_net_payroll")} </span>
            <span style={{fontSize:14,fontWeight:800,color:T.blu}}>₹{fmtN(totalNet)}</span>
          </div>
          <div style={{padding:"6px 13px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:7}}>
            <span style={{fontSize:11,color:T.grn}}>{t("payroll.paidcount_filtered_paid", { paidCount, filtered: filtered.length })}</span>
          </div>
          {isAdmin&&<button onClick={()=>setShowAddStaff(true)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcAdd size={13} color="white"/> {t("payroll.add_staff")}
          </button>}
          {isAdmin&&<button onClick={markAllPaid}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcChk size={13} color="white"/> {t("payroll.mark_all_paid")}
          </button>}
          <button onClick={()=>{
            const headers=["Employee","ID","Designation","Dept","Pay Type","Basic","Gross","PF","ESI","TDS","Net Pay"];
            const rows=filtered.map(emp=>{const c=calcNet(emp);return[emp.name,emp.id,emp.designation||emp.role||"",emp.dept,c.pType,emp.basicSalary,c.gross,c.pf,c.esi,c.tds||0,c.net];});
            exportCSV(headers,rows,`Monthly_Salary_${MONTHS[month]}_${year}.csv`);
          }} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:T.sltL,border:`1px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <IcDown size={12} color={T.t2}/> {t("common.export")}
          </button>
        </div>
      </div>

      {/* Pending Edit Approvals Banner (admin-only) */}
      {isAdmin && editReqs.filter(r=>r.status==="pending").length>0 && (
        <div style={{background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:9,padding:"10px 14px",marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:T.amb,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            <IcAlert size={14} color={T.amb}/>{t("payroll.editreqs_salary_edit_request_s_pending", { editReqs: editReqs.filter(r=>r.status==="pending").length })}</div>
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
                 {t("common.approve")}
                </button>
                <button onClick={()=>approveReq(r.id,"rejected")}
                  style={{padding:"4px 12px",borderRadius:6,background:T.redL,color:T.red,fontSize:11,fontWeight:700,border:`1px solid ${T.redM}`,cursor:"pointer"}}>
                 {t("common.reject")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length===0&&!search&&<EmptyState icon={<IcTeam size={32} color={T.b2}/>} message="No staff members added yet" sub={t("payroll.add_monthly_staff_to_see_salary")}/>}
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
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{emp.name}</div>
                  {!!(emp.designation||emp.role)&&(
                    <div style={{fontSize:10,color:T.t3,fontWeight:600,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={emp.designation||emp.role}>
                      {emp.designation||emp.role}
                    </div>
                  )}
                  <div style={{fontSize:10,color:T.t4}}>
                    {emp.id}
                    {isAttBased
                      ?<span style={{marginLeft:5,color:T.pur}}>{P}P {H>0?`${H}H `:""}{A>0?`${A}A `:""} = {effective}d</span>
                      :<span style={{marginLeft:5,color:T.grn}}>{t("payroll.full_month")}</span>
                    }
                  </div>
                </div>
              </div>

              {/* Pay Type toggle */}
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {isAdmin?<button
                  onClick={()=>togglePayType(emp.id)}
                  title={isAttBased?t("payroll.switch_to_fixed_monthly"):t("payroll.switch_to_attendance_based")}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:20,border:`1.5px solid ${isAttBased?T.pur:T.grn}`,background:isAttBased?T.purL:T.grnL,color:isAttBased?T.pur:T.grn,fontSize:10.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",transition:"all .2s"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:isAttBased?T.pur:T.grn,flexShrink:0}}/>
                  {isAttBased?t("payroll.attendance"):t("payroll.fixed")}
                </button>:<span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:20,border:`1.5px solid ${isAttBased?T.pur:T.grn}`,background:isAttBased?T.purL:T.grnL,color:isAttBased?T.pur:T.grn,fontSize:10.5,fontWeight:700,whiteSpace:"nowrap"}}><div style={{width:7,height:7,borderRadius:"50%",background:isAttBased?T.pur:T.grn,flexShrink:0}}/>{isAttBased?t("payroll.attendance"):t("payroll.fixed")}</span>}
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
                  title={t("payroll.manual_tds_for_this_month_saves")}
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
                        <div style={{fontSize:9,color:T.blu}} title={t("payroll.approved_edit")}>{t("payroll.edited_was_fmtn", { fmtN: fmtN(net) })}</div>
                      )}
                      {req && req.status === "pending" && (
                        <div style={{fontSize:9,color:T.amb}}>{t("payroll.edit_pending")}</div>
                      )}
                      {hasAdv && approvedOverride === null && (
                        <div style={{fontSize:9.5,color:T.amb}}>{t("payroll.fmtn_adv", { fmtN: fmtN(hasAdv.amount) })}</div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div>
                {isPaid
                  ?<span style={{display:"inline-flex",alignItems:"center",gap:4,background:T.grnL,color:T.grn,fontSize:10.5,fontWeight:700,padding:"3px 9px",borderRadius:20,border:`1px solid ${T.grnM}`}}><IcChk size={10} color={T.grn}/>{t("common.paid")}</span>
                  :<button onClick={()=>setPayStatus(p=>({...p,[emp.id]:"Paid"}))}
                    style={{padding:"4px 11px",borderRadius:20,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                   {t("finance.pay_now")}
                  </button>
                }
              </div>

              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>onViewSlip(emp,pType,paymentTypes)}
                  style={{display:"flex",alignItems:"center",gap:3,padding:"4px 9px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                  <IcEye size={11} color={T.blu}/> {t("payroll.slip")}
                </button>
                {isAdmin && (
                  <button onClick={()=>openEdit(emp,net)} title={t("payroll.request_salary_edit_needs_approval")}
                    style={{display:"flex",alignItems:"center",gap:3,padding:"4px 7px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    <IcEdit size={11} color={T.amb}/>
                  </button>
                )}
                {isAdmin && (
                  <button onClick={()=>setEditStaffEmp(emp)} title={t("payroll.edit_staff_master_pf_method_allowances")}
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
        <div 
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:T.surface,borderRadius:12,padding:20,width:440,maxWidth:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:T.t1}}>{t("payroll.request_salary_edit")}</div>
                <div style={{fontSize:11,color:T.t4,marginTop:2}}>{editModalEmp.name} — {MONTHS[month]} {year}</div>
              </div>
              <button onClick={()=>!editSubmitting&&setEditModalEmp(null)}
                style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.t4}}>
                <IcX size={18}/>
              </button>
            </div>

            <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:11,color:T.blu}}>
             {t("payroll.edit_will_be_submitted_for_approval")}
            </div>

            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>
               {t("payroll.current_calculated_net")}
              </label>
              <div style={{fontSize:14,fontWeight:700,color:T.t2,padding:"8px 12px",background:T.b1,borderRadius:7}}>
                ₹ {fmtN(calcNet(editModalEmp).net)}
              </div>
            </div>

            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>
               {t("payroll.new_final_salary_amount")} <span style={{color:T.red}}>*</span>
              </label>
              <input type="number" value={editNewAmt} onChange={e=>setEditNewAmt(e.target.value)}
                style={{width:"100%",padding:"9px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:14,fontWeight:700,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>
               {t("payroll.reason_for_edit")}
              </label>
              <textarea value={editReason} onChange={e=>setEditReason(e.target.value)} rows={3}
                placeholder={t("payroll.e_g_bonus_for_overtime_late")}
                style={{width:"100%",padding:"9px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
            </div>

            {reqErr && <div style={{background:T.redL,color:T.red,padding:"7px 10px",borderRadius:6,fontSize:11,marginBottom:10,border:`1px solid ${T.redM}`}}>{reqErr}</div>}

            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>!editSubmitting&&setEditModalEmp(null)} disabled={editSubmitting}
                style={{padding:"8px 16px",borderRadius:7,background:"none",border:`1.5px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
               {t("common.cancel")}
              </button>
              <button onClick={submitEdit} disabled={editSubmitting}
                style={{padding:"8px 18px",borderRadius:7,background:editSubmitting?T.b1:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:editSubmitting?"not-allowed":"pointer"}}>
                {editSubmitting?t("common.submitting_2"):t("common.submit_for_approval")}
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
            <span style={{fontSize:11,color:T.amb}}>{t("payroll.pending_recovery")} </span>
            <span style={{fontSize:14,fontWeight:800,color:T.amb}}>₹{fmtN(totalPending)}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{
            const headers=["Adv ID","Employee","Amount","Date","Reason","Status"];
            const rows=advances.map(a=>[a.id,a.name,a.amount,a.date,a.reason,a.status]);
            exportCSV(headers,rows,"Advances_Export.csv");
          }} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:T.sltL,border:`1px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <IcDown size={12} color={T.t2}/> {t("common.export")}
          </button>
          {isAdmin&&<button onClick={()=>setShowAdd(!showAdd)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcAdd size={13} color="white"/> {t("payroll.new_advance")}
          </button>}
        </div>
      </div>

      {/* Add form */}
      {showAdd&&(
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"13px 14px",marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:9,marginBottom:9}}>
            {[{l:t("common.name_2"),k:"name",ph:"Employee name"},{l:t("crm.amount"),k:"amount",ph:"Amount",type:"number"},{l:t("common.date"),k:"date",type:"date"},{l:t("common.reason"),k:"reason",ph:"Medical, personal..."}].map(f=>(
              <div key={f.k}><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{f.l}</label>
                <input type={f.type||"text"} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}
                  style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/></div>
            ))}
          </div>
          <div style={{display:"flex",gap:7}}>
            <button onClick={()=>setShowAdd(false)} style={{padding:"7px 14px",borderRadius:6,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>{t("common.cancel")}</button>
            <button onClick={addAdvance} style={{padding:"7px 14px",borderRadius:6,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>{t("payroll.save_advance")}</button>
          </div>
        </div>
      )}

      <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"90px 1fr 100px 120px 1fr 120px",padding:"7px 14px",background:T.sb}}>
          {["Adv ID","Employee","Amount","Date","Reason","Status"].map((h,i)=>(
            <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
          ))}
        </div>
        {advances.length===0&&<EmptyState icon={<IcFin size={32} color={T.b2}/>} message="No advance records" sub={t("payroll.no_salary_advances_have_been_recorded")}/>}
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
                <Pill label={adv.status==="Deducted"?t("payroll.deducted"):t("common.pending")} c={isPending?T.amb:T.grn} bg={isPending?T.ambL:T.grnL} brd={isPending?T.ambM:T.grnM}/>
                {isPending&&isAdmin&&<button onClick={async()=>{try{await api.patch("/payroll/advances/"+adv.id,{status:"Deducted"});}catch(err){console.error(err);}setAdvances(p=>p.map(a=>a.id===adv.id?{...a,status:"Deducted"}:a));}}
                  style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,cursor:"pointer",fontWeight:600}}>
                 {t("payroll.deduct")}
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
        {[{l:t("payroll.total_created"),v:`₹${fmtN(totalCreated)}`,c:T.blu},{l:t("common.paid"),v:`₹${fmtN(totalPaid)}`,c:T.grn},{l:t("common.pending"),v:`₹${fmtN(totalPending)}`,c:totalPending>0?T.amb:T.grn}].map((s,i)=>(
          <div key={i} style={{padding:"6px 14px",background:T.surface,border:`1.5px solid ${s.c}33`,borderRadius:8,borderLeft:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px"}}>{s.l}</div>
            <div style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</div>
          </div>
        ))}
        <div style={{marginLeft:"auto"}}>
          <button onClick={()=>setShowForm(s=>!s)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,background:T.blu,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",boxShadow:`0 3px 10px ${T.blu}44`}}>
            <IcAdd size={14} color="white"/> {t("payroll.create_salary")}
          </button>
        </div>
      </div>

      {/* CREATE FORM */}
      {showForm&&(
        <div style={{background:T.surface,borderRadius:10,border:`1.5px solid ${T.bluM}`,padding:"16px 18px",marginBottom:14,boxShadow:`0 2px 12px ${T.blu}11`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
            <IcSlip size={15} color={T.blu}/> {t("payroll.create_salary_entry")}
          </div>

          {/* Quick fill search */}
          <div style={{marginBottom:12,padding:"10px 12px",background:T.bluL,borderRadius:7,border:`1px solid ${T.bluM}`}}>
            <div style={{fontSize:10,color:T.blu,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>{t("payroll.quick_fill_from_existing_person")}</div>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={12} color={T.t4}/></span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("payroll.type_name_to_search")}
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
                {filteredQF.length===0&&<span style={{fontSize:11,color:T.t4}}>{t("payroll.no_match_fill_manually_below")}</span>}
              </div>
            )}
          </div>

          {/* Form grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            {[{l:t("crm.full_name"),k:"name",ph:"Employee / Worker name",col:1},{l:t("master_library.designation"),k:"designation",ph:"Role / Trade",col:1},{l:t("common.phone"),k:"phone",ph:"Mobile number",col:1}].map(f=>(
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
              <IcBank size={12} color={T.t3}/> {t("common.bank_details")}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
              {[{l:t("common.bank_name"),k:"bankName",ph:"SBI, HDFC..."},{l:t("master_library.account_no"),k:"accountNo",ph:"Account number"},{l:t("master_library.ifsc_code"),k:"ifsc",ph:"SBIN0001234"}].map(f=>(
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
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{t("payroll.days_present")}</label>
              <div style={{display:"flex",gap:5}}>
                <input value={form.daysPresent} onChange={upd("daysPresent")} placeholder={t("payroll.e_g_22_or_na")}
                  style={{flex:1,padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                <button onClick={()=>setForm(p=>({...p,daysPresent:"NA"}))}
                  style={{padding:"0 9px",borderRadius:7,background:form.daysPresent==="NA"?T.slt:T.sltL,color:form.daysPresent==="NA"?"white":T.slt,border:`1px solid ${T.b2}`,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                  NA
                </button>
              </div>
              {form.daysPresent==="NA"&&<div style={{fontSize:10,color:T.slt,marginTop:3}}>{t("payroll.fixed_salary_no_deduction")}</div>}
            </div>
            {/* Total / Working days */}
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{t("payroll.working_days")}</label>
              <input type="number" value={form.totalDays} onChange={upd("totalDays")}
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            {/* Amount */}
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{t("payroll.net_amount")}</label>
              <input type="number" value={form.amount} onChange={upd("amount")} placeholder={t("payroll.total_salary_to_pay")}
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${form.amount?T.grn:T.b1}`,fontSize:13,fontWeight:form.amount?700:400,color:form.amount?T.grn:T.t1,background:form.amount?T.grnL:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>{if(!form.amount)e.target.style.borderColor=T.b1;}}/>
              {form.amount&&<div style={{fontSize:10.5,color:T.grn,marginTop:2,fontWeight:600}}>₹ {fmtN(Number(form.amount))}</div>}
            </div>
            {/* Category */}
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{t("common.category")}</label>
              <SearchSelect value={form.category} options={["Monthly Staff","Daily Worker","Contractor","Consultant","Other"]} onChange={v=>upd("category")({target:{value:v}})} placeholder={t("common.select_category")}/>
            </div>
          </div>

          {/* Dates */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{t("payroll.salary_date")}</label>
              <input type="date" value={form.salaryDate} onChange={upd("salaryDate")}
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>
               {t("common.due_date")}
                <span style={{marginLeft:5,color:T.blu,fontSize:9,fontWeight:400}}>{t("payroll.editable_default_defaultduedaysd", { defaultDueDays })}</span>
              </label>
              <input type="date" value={form.dueDate} onChange={upd("dueDate")}
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.amb}`,fontSize:12.5,color:T.amb,background:T.ambL,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              {form.dueDate&&<div style={{fontSize:10,color:T.amb,marginTop:2}}>
                {daysDiff2(form.dueDate)>0?`Due in ${daysDiff2(form.dueDate)} days`:daysDiff2(form.dueDate)===0?t("payroll.due_today"):t("payroll.overdue")}
              </div>}
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{t("common.notes")}</label>
              <input value={form.notes} onChange={upd("notes")} placeholder={t("payroll.march_salary_contract_etc")}
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
          </div>

          {/* Finance link info */}
          <div style={{padding:"9px 12px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:7,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
            <IcFinLink size={13} color={T.grn}/>
            <span style={{fontSize:11.5,color:T.grn}}>
             {t("payroll.this_salary_will_automatically_appear_in")} <strong>{t("payroll.finance_pending_payments")}</strong> {t("payroll.on_due_date_warning_7_days")}
            </span>
          </div>

          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setShowForm(false);setForm(blank);}}
              style={{flex:1,padding:"10px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>
             {t("common.cancel")}
            </button>
            <button onClick={handleCreate} disabled={!form.name.trim()||!form.amount}
              style={{flex:2,padding:"10px",borderRadius:7,background:form.name.trim()&&form.amount?T.grn:T.b1,color:form.name.trim()&&form.amount?"white":T.t4,fontSize:13,fontWeight:700,border:"none",cursor:form.name.trim()&&form.amount?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
              <IcChk size={14} color={form.name.trim()&&form.amount?"white":T.t4}/> {t("payroll.create_salary_entry")}
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
            <div style={{fontSize:13,marginTop:8}}>{t("payroll.no_salary_entries_for_months_year", { MONTHS: MONTHS[month], year })}</div>
            <div style={{fontSize:11.5,color:T.t4,marginTop:3}}>{t("payroll.click_create_salary_to_add_entries")}</div>
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
                <div style={{fontSize:10.5,color:T.t4}}>{rec.designation} {rec.daysPresent!=="NA"?`· ${rec.daysPresent}/${rec.totalDays} days`:t("payroll.fixed_2")}</div>
              </div>
              <span style={{fontSize:11,color:T.t3}}>{rec.category}</span>
              <span style={{fontSize:13,fontWeight:700,color:T.t1}}>₹{fmtN(rec.amount)}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{rec.salaryDate}</span>
              <div>
                <div style={{fontSize:11.5,fontWeight:600,color:isOverdue?T.red:isDueSoon?T.amb:T.t3}}>{rec.dueDate}</div>
                {isOverdue&&<div style={{fontSize:9.5,color:T.red}}>{t("payroll.overdue_mathd", { Math: Math.abs(diff) })}</div>}
                {isDueSoon&&<div style={{fontSize:9.5,color:T.amb}}>{t("payroll.due_in_diffd", { diff })}</div>}
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
        amount:Number(it.net_amount)||0,
        settled:Number(it.settled)||0,
        status:it.pay_status==="paid"?"Paid":(it.pay_status==="partial"?"Partial":"Pending"),
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
      // Run-generated payment → settle the remaining via the salary ledger
      // (keeps staff_salary_ledger + pay_status in sync; partial-safe).
      const itemId=String(rec.id).replace("run-","");
      const remaining=Math.max(0,(Number(rec.amount)||0)-(Number(rec.settled)||0));
      try{
        const r=await api.post("/wallets/salary/settle",{run_item_id:Number(itemId),amount:remaining,payment_method:"manual",tx_ref:payForm.txRef||undefined});
        if(!r.success){ window.alert(r.message||"Settle failed"); setMarkPayModal(null); return; }
      }catch(err){ console.error("Mark paid (run):",err); window.alert(t("payroll.settle_failed")); setMarkPayModal(null); return; }
      setRunRecs(p=>p.map(r=>r.id===rec.id?{...r,status:"Paid",settled:rec.amount,paidDate:payForm.paidDate,txRef:payForm.txRef}:r));
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
          {l:t("payroll.total_salary"),v:`₹${fmt(totalCreated)}`,c:T.blu},
          {l:t("common.paid"),v:`₹${fmt(totalPaid)}`,c:T.grn},
          {l:t("common.pending"),v:`₹${fmt(totalPending)}`,c:totalPending>0?T.amb:T.grn},
          {l:t("common.overdue"),v:overdue,c:overdue>0?T.red:T.grn,isBig:true},
          {l:t("payroll.due_in_7_days"),v:dueSoon,c:dueSoon>0?T.amb:T.grn,isBig:true},
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
            <IcFinLink size={11} color={T.t4}/> {t("payroll.visible_in_finance_pending_payments")}
          </span>
        </div>
      )}

      {/* Controls */}
      <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
        {["All","Pending","Partial","Paid"].map(s=>(
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
        <span style={{fontSize:11,color:T.t4,marginLeft:4}}>{t("payroll.records_records_fmtn_total", { records: records.length, fmtN: fmtN(records.reduce((s,r)=>s+r.amount,0)) })}</span>
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
                  <span style={{fontSize:8.5,fontWeight:700,padding:"1px 6px",borderRadius:10,textTransform:"uppercase",letterSpacing:.3,color:rec.source==="Run"?T.blu:T.slt,background:rec.source==="Run"?T.bluL:T.sltL,border:`1px solid ${rec.source==="Run"?T.blu:T.slt}33`}}>{rec.source==="Run"?t("payroll.run"):t("common.manual")}</span>
                </div>
                <div style={{fontSize:10,color:T.t4}}>{rec.designation} · {rec.category||""} · {MONTHS[rec.month]} {rec.year}</div>
              </div>
              <span style={{fontSize:13,fontWeight:700,color:T.t1}}>₹{fmtN(rec.amount)}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{rec.salaryDate}</span>
              <div>
                <div style={{fontSize:11.5,fontWeight:600,color:isOverdue?T.red:isDueSoon?T.amb:T.t3}}>{rec.dueDate}</div>
                {isOverdue&&<div style={{fontSize:9,color:T.red,fontWeight:700}}>OVERDUE {Math.abs(diff)}d</div>}
                {isDueSoon&&<div style={{fontSize:9,color:T.amb,fontWeight:700}}>{t("payroll.due_in_diffd", { diff })}</div>}
              </div>
              <span style={{fontSize:11.5,color:T.t3}}>{rec.daysPresent==="NA"?t("payroll.fixed"):`${rec.daysPresent}/${rec.totalDays}`}</span>
              <div>
                <div style={{fontSize:11,color:T.t2}}>{rec.bankName||"—"}</div>
                <div style={{fontSize:9.5,color:T.t4}}>{rec.accountNo?rec.accountNo.slice(-6)+"...":"—"}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <Pill label={rec.status} c={statusC.c} bg={statusC.bg} brd={statusC.brd}/>
                {rec.status==="Pending"&&(
                  <button onClick={()=>setMarkPayModal(rec)}
                    style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,cursor:"pointer",fontWeight:700}}>
                   {t("payroll.mark_paid")}
                  </button>
                )}
                {rec.status==="Paid"&&rec.paidDate&&(
                  <div style={{fontSize:9,color:T.t4}}>{t("payroll.paid_paiddate", { paidDate: rec.paidDate })}</div>
                )}
              </div>
            </div>
          );
        })}
        {records.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4,fontSize:13}}>{t("payroll.no_records_match")}</div>}
      </div>

      {/* Mark Paid Modal */}
      {markPayModal&&(<>
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400,backdropFilter:"blur(1px)"}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,width:"min(420px,95vw)",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
          <div style={{background:T.sb,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"white"}}>{t("payroll.mark_as_paid")}</div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.45)"}}>{markPayModal.name} · ₹{fmtN(markPayModal.amount)}</div>
            </div>
            <button onClick={()=>setMarkPayModal(null)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={13}/></button>
          </div>
          <div style={{padding:"14px 16px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
              {[{l:t("payroll.paid_date"),k:"paidDate",type:"date"},{l:t("payroll.paid_by"),k:"paidBy",ph:"Who processed"},{l:t("payroll.tx_reference"),k:"txRef",ph:"UTR / Cheque no",col:2}].map(f=>(
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
              <IcFinLink size={11} color={T.grn} style={{marginRight:5}}/> {t("payroll.payment_will_sync_to_finance_module")}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setMarkPayModal(null)} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>{t("common.cancel")}</button>
              <button onClick={()=>markPaid(markPayModal)}
                style={{flex:2,padding:"9px",borderRadius:7,background:T.grn,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <IcChk size={14} color="white"/> {t("payroll.confirm_payment")}
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
            date:t.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}),
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
      time:timeStr,date:now.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}),
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
        <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>{t("payroll.site_attendance")}</div>
        <div style={{fontSize:28,fontWeight:800,color:"white",letterSpacing:"-1px"}}>
          {new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true})}
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:2}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
      </div>

      {/* Worker select */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,padding:"13px 16px",marginBottom:10}}>
        <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:6}}>{t("payroll.worker_employee")}</label>
        <SearchSelect value={workerName} options={ALL_WORKERS}
          onChange={v=>setWorkerName(v)} placeholder={t("payroll.select_worker")}/>
      </div>

      {/* Project select */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,padding:"13px 16px",marginBottom:10}}>
        <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:6}}>{t("finance.project_site")}</label>
        <SearchSelect value={selProject} options={PROJECTS}
          onChange={v=>setSelProject(v)} placeholder={t("common.select_project")}/>
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
                {location?t("payroll.location_captured"):t("payroll.gps_location")}
              </div>
              <div style={{fontSize:10.5,color:T.t4}}>{location?location.address:t("payroll.not_captured_yet")}</div>
            </div>
          </div>
          <button onClick={getLocation} disabled={locLoading}
            style={{padding:"7px 13px",borderRadius:7,background:location?T.grnL:T.blu,color:location?T.grn:"white",border:`1px solid ${location?T.grnM:"transparent"}`,fontSize:12,fontWeight:700,cursor:locLoading?"wait":"pointer"}}>
            {locLoading?t("payroll.detecting"):(location?t("payroll.re_capture"):t("payroll.capture_gps"))}
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
          onClick={()=>{if(!selProject){alert(t("payroll.please_select_a_project_first"));return;}doPunch("IN");}}
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
          {punchState==="in"?t("payroll.punched_in"):t("payroll.punch_in")}
          {punchState==="in"&&punchTime&&<span style={{fontSize:11,fontWeight:400}}>at {punchTime}</span>}
        </button>
        {/* PUNCH OUT */}
        <button
          onClick={()=>{if(!selProject){alert(t("payroll.please_select_a_project_first"));return;}doPunch("OUT");}}
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
          {punchState==="out"?t("payroll.not_punched"):t("payroll.punch_out")}
        </button>
      </div>

      {/* Today's punch log */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:12,fontWeight:700,color:T.t1}}>{t("payroll.today_s_punch_log")}</span>
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
          <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{t("payroll.salary_payment_settings")}</span>
        </div>
        <div style={{padding:"16px"}}>
          {/* Default due days */}
          <div style={{marginBottom:18}}>
            <label style={{fontSize:11,fontWeight:700,color:T.t1,display:"block",marginBottom:4}}>
             {t("payroll.default_payment_due_days")}
            </label>
            <div style={{fontSize:12,color:T.t3,marginBottom:8,lineHeight:1.6}}>
              {t("payroll.due_days_after_creation")}
              <br/><Rich k="payroll.example_salary_created_on_30_march" params={{ localDays, addDays: addDays("2026-03-30",Number(localDays)) }} /></div>
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
            <div style={{fontSize:11.5,fontWeight:700,color:T.amb,marginBottom:4}}>{t("payroll.finance_alert_settings")}</div>
            <div style={{fontSize:12,color:"#92400E",lineHeight:1.6}}>
             {t("payroll.salary_payments_appear_in_finance_pending")}
              <strong style={{color:T.amb,margin:"0 4px"}}>{t("payroll.7_days")}</strong>
             {t("payroll.fixed_overdue_payments_are_highlighted_in")}
            </div>
          </div>

          {/* Working days */}
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:700,color:T.t1,display:"block",marginBottom:4}}>{t("payroll.working_days_per_month")}</label>
            <div style={{fontSize:12,color:T.t3,marginBottom:6}}>{t("payroll.used_to_calculate_pro_rata_attendance")}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="number" min={20} max={31} value={localWorkDays} onChange={e=>setLocalWorkDays(e.target.value)}
                style={{width:70,padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:14,fontWeight:600,color:T.t1,outline:"none",textAlign:"center",fontFamily:"inherit"}}/>
              <span style={{fontSize:12,color:T.t3}}>{t("payroll.days_current_workingdays_days", { workingDays })}</span>
            </div>
          </div>

          <button onClick={save}
            style={{padding:"10px 24px",borderRadius:8,background:saved?T.grn:T.blu,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:7,transition:"background .2s"}}>
            {saved?<><IcChk size={14} color="white"/> {t("payroll.settings_saved")}</>:<><IcChk size={14} color="white"/> {t("payroll.save_settings")}</>}
          </button>
        </div>
      </div>

      {/* Finance pending payments preview */}
      <div style={{background:T.surface,borderRadius:10,border:`1.5px solid ${T.ambM}`,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",background:T.ambL,borderBottom:`1px solid ${T.ambM}`,display:"flex",alignItems:"center",gap:8}}>
          <IcFinLink size={14} color={T.amb}/>
          <span style={{fontSize:13,fontWeight:700,color:T.amb}}>{t("payroll.how_finance_integration_works")}</span>
        </div>
        <div style={{padding:"14px 16px"}}>
          {[
            {step:"1",title:t("payroll.salary_create_karo"),desc:t("payroll.payroll_manual_salary_tab_mein_entry"),c:T.blu},
            {step:"2",title:t("payroll.auto_finance_queue"),desc:t("payroll.due_date_7_days_se_kam"),c:T.amb},
            {step:"3",title:t("payroll.due_date_pe_red_alert"),desc:t("payroll.due_date_aa_gayi_finance_mein"),c:T.red},
            {step:"4",title:t("payroll.finance_settle_pay"),desc:t("payroll.finance_team_payment_kare_partial_bhi"),c:T.grn},
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
            <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{t("payroll.attendance_auto_punch_out")}</span>
          </div>
          <div style={{padding:"16px"}}>
            <div style={{fontSize:11.5,color:T.t3,marginBottom:8,lineHeight:1.6}}>
             {t("payroll.worker_din_bhar_site_se")} <b>{t("payroll.aata_jaata")}</b> {t("payroll.reh_sakta_hai_koi_auto_logout")} <b>{t("payroll.normal_shift_poori_hone_ke_baad")}</b> {t("payroll.agar_wo_site_chhod_de_to")} <b>{t("payroll.absolute_max")}</b> {t("payroll.backstop_har_auto_close")} <b>{t("payroll.hr_review_queue")}</b> {t("payroll.me_jata_hai")}
            </div>
            {[
              {tog:"autoclose_enabled",t:t("payroll.auto_punch_out"),d:t("payroll.master_switch_neeche_ka_poora_logic"),master:true},
              {num:"max_shift_hours",t:t("payroll.normal_shift"),d:t("payroll.itne_ghante_ke_baad_hi_site"),suf:"hours",mn:1,mx:24},
              {tog:"geo_exit_enabled",num:"geo_exit_minutes",t:t("payroll.shift_ke_baad_site_chhodne_pe"),d:t("payroll.shift_ke_baad_itne_min_continuous"),suf:"min",mn:1,mx:240},
              {num:"hard_cap_hours",t:t("payroll.absolute_max_safety"),d:t("payroll.itne_ghante_baad_har_haal_me"),suf:"hours",mn:1,mx:48},
            ].map((row,ri)=>{
              const masterOn=att.autoclose_enabled==="1";
              const dim=!row.master&&!masterOn;
              const togOn=row.tog?att[row.tog]==="1":true;
              const numOn=(row.master?true:masterOn)&&togOn;
              return(
                <div key={ri} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderTop:`1px solid ${T.b1}`,opacity:dim?0.45:1}}>
                  {row.tog?(
                    <label style={{position:"relative",display:"inline-block",width:38,height:22,flexShrink:0,marginTop:2}}>
                      <input type="checkbox" checked={att[row.tog]==="1"} onChange={e=>setA(row.tog,e.target.checked?"1":"0")} style={{opacity:0,width:0,height:0}}/>
                      <span style={{position:"absolute",cursor:"pointer",inset:0,background:att[row.tog]==="1"?T.grn:T.t4,borderRadius:22,transition:".2s"}}>
                        <span style={{position:"absolute",height:16,width:16,left:att[row.tog]==="1"?19:3,top:3,background:"white",borderRadius:"50%",transition:".2s"}}/>
                      </span>
                    </label>
                  ):<span style={{width:38,flexShrink:0}}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{row.t}</div>
                    <div style={{fontSize:11,color:T.t3,marginTop:2,lineHeight:1.5}}>{row.d}</div>
                  </div>
                  {row.num?(
                    <div style={{display:"flex",alignItems:"center",gap:5,opacity:numOn?1:0.4}}>
                      <input type="number" min={row.mn} max={row.mx} value={att[row.num]} disabled={!numOn}
                        onChange={e=>setA(row.num,e.target.value)}
                        style={{width:52,padding:"7px 8px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:14,fontWeight:700,color:T.t1,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                      <span style={{fontSize:11,color:T.t3,fontWeight:600}}>{row.suf}</span>
                    </div>
                  ):null}
                </div>
              );
            })}
            {/* Punch-out reminder — has a "when" mode */}
            <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderTop:`1px solid ${T.b1}`,opacity:att.autoclose_enabled==="1"?1:0.45}}>
              <label style={{position:"relative",display:"inline-block",width:38,height:22,flexShrink:0,marginTop:2}}>
                <input type="checkbox" checked={att.reminder_enabled==="1"} onChange={e=>setA("reminder_enabled",e.target.checked?"1":"0")} style={{opacity:0,width:0,height:0}}/>
                <span style={{position:"absolute",cursor:"pointer",inset:0,background:att.reminder_enabled==="1"?T.grn:T.t4,borderRadius:22,transition:".2s"}}>
                  <span style={{position:"absolute",height:16,width:16,left:att.reminder_enabled==="1"?19:3,top:3,background:"white",borderRadius:"50%",transition:".2s"}}/>
                </span>
              </label>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{t("payroll.punch_out_reminder")}</div>
                <div style={{fontSize:11,color:T.t3,marginTop:2,lineHeight:1.5}}>{t("payroll.worker_ko_still_punched_in_notification")} <b>{t("payroll.kab_bhejni_hai")}</b> {t("payroll.choose_karo")}</div>
                {att.reminder_enabled==="1" && (
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
                    <select value={att.reminder_mode||"after_hours"} onChange={e=>setA("reminder_mode",e.target.value)}
                      style={{padding:"7px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
                      <option value="after_hours">{t("payroll.punch_in_ke_baad_ghante")}</option>
                      <option value="at_shift_end">{t("payroll.shift_end_pe_normal_shift_poori")}</option>
                      <option value="fixed_time">{t("payroll.roz_fixed_time_pe")}</option>
                    </select>
                    {(att.reminder_mode||"after_hours")==="after_hours" && (
                      <span style={{display:"flex",alignItems:"center",gap:5}}>
                        <input type="number" min={1} max={24} value={att.reminder_after_hours} onChange={e=>setA("reminder_after_hours",e.target.value)}
                          style={{width:50,padding:"7px 8px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:14,fontWeight:700,color:T.t1,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                        <span style={{fontSize:11,color:T.t3,fontWeight:600}}>{t("payroll.hours_baad")}</span>
                      </span>
                    )}
                    {att.reminder_mode==="fixed_time" && (
                      <span style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{fontSize:11,color:T.t3,fontWeight:600}}>roz</span>
                        <input type="time" value={att.reminder_time||"18:00"} onChange={e=>setA("reminder_time",e.target.value)}
                          style={{padding:"6px 8px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:13,fontWeight:700,color:T.t1,outline:"none",fontFamily:"inherit"}}/>
                        <span style={{fontSize:11,color:T.t3,fontWeight:600}}>baje</span>
                      </span>
                    )}
                    {att.reminder_mode==="at_shift_end" && (
                      <span style={{fontSize:11,color:T.t4,fontWeight:600}}>= {att.max_shift_hours||12}h ke baad</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Punch-IN reminder (geofence arrival) */}
            <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderTop:`1px solid ${T.b1}`}}>
              <label style={{position:"relative",display:"inline-block",width:38,height:22,flexShrink:0,marginTop:2}}>
                <input type="checkbox" checked={att.punchin_reminder_enabled==="1"} onChange={e=>setA("punchin_reminder_enabled",e.target.checked?"1":"0")} style={{opacity:0,width:0,height:0}}/>
                <span style={{position:"absolute",cursor:"pointer",inset:0,background:att.punchin_reminder_enabled==="1"?T.grn:T.t4,borderRadius:22,transition:".2s"}}>
                  <span style={{position:"absolute",height:16,width:16,left:att.punchin_reminder_enabled==="1"?19:3,top:3,background:"white",borderRadius:"50%",transition:".2s"}}/>
                </span>
              </label>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{t("payroll.punch_in_reminder_site_pe_aate")}</div>
                <div style={{fontSize:11,color:T.t3,marginTop:2,lineHeight:1.5}}>{t("payroll.worker_site_fence_ke_andar_aaye")} <b>{t("payroll.soft_vibration")}</b> {t("payroll.reminder_punch_in_skip_app_khulne")}</div>
                {att.punchin_reminder_enabled==="1" && (
                  <div style={{display:"flex",alignItems:"center",gap:7,marginTop:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:T.t3,fontWeight:600}}>{t("payroll.window")}</span>
                    <input type="time" value={att.punchin_window_start||"06:00"} onChange={e=>setA("punchin_window_start",e.target.value)}
                      style={{padding:"6px 8px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:13,fontWeight:700,color:T.t1,outline:"none",fontFamily:"inherit"}}/>
                    <span style={{fontSize:11,color:T.t3}}>se</span>
                    <input type="time" value={att.punchin_window_end||"20:00"} onChange={e=>setA("punchin_window_end",e.target.value)}
                      style={{padding:"6px 8px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:13,fontWeight:700,color:T.t1,outline:"none",fontFamily:"inherit"}}/>
                    <span style={{fontSize:11,color:T.t3,fontWeight:600,marginLeft:4}}>{t("payroll.har")}</span>
                    <input type="number" min={1} max={12} value={att.punchin_cooldown_hours} onChange={e=>setA("punchin_cooldown_hours",e.target.value)}
                      style={{width:46,padding:"7px 8px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:14,fontWeight:700,color:T.t1,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                    <span style={{fontSize:11,color:T.t3,fontWeight:600}}>{t("payroll.ghante_me_ek_baar")}</span>
                  </div>
                )}
              </div>
            </div>
            {/* Daily punch-in reminder — fires even when app is fully closed */}
            <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderTop:`1px solid ${T.b1}`}}>
              <label style={{position:"relative",display:"inline-block",width:38,height:22,flexShrink:0,marginTop:2}}>
                <input type="checkbox" checked={att.punchin_daily_enabled==="1"} onChange={e=>setA("punchin_daily_enabled",e.target.checked?"1":"0")} style={{opacity:0,width:0,height:0}}/>
                <span style={{position:"absolute",cursor:"pointer",inset:0,background:att.punchin_daily_enabled==="1"?T.grn:T.t4,borderRadius:22,transition:".2s"}}>
                  <span style={{position:"absolute",height:16,width:16,left:att.punchin_daily_enabled==="1"?19:3,top:3,background:"white",borderRadius:"50%",transition:".2s"}}/>
                </span>
              </label>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{t("payroll.daily_punch_in_reminder")} <span style={{color:T.grn}}>{t("payroll.app_band_ho_tab_bhi")}</span></div>
                <div style={{fontSize:11,color:T.t3,marginTop:2,lineHeight:1.5}}>{t("payroll.roz_fixed_time_pe_punch_in")} <b>{t("payroll.bilkul_band")}</b> {t("payroll.ho_tab_bhi_baje_os_scheduled")}</div>
                {att.punchin_daily_enabled==="1" && (
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8}}>
                    <span style={{fontSize:11,color:T.t3,fontWeight:600}}>roz</span>
                    <input type="time" value={att.punchin_daily_time||"09:30"} onChange={e=>setA("punchin_daily_time",e.target.value)}
                      style={{padding:"6px 8px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:13,fontWeight:700,color:T.t1,outline:"none",fontFamily:"inherit"}}/>
                    <span style={{fontSize:11,color:T.t3,fontWeight:600}}>baje</span>
                  </div>
                )}
              </div>
            </div>
            <button onClick={saveAtt}
              style={{marginTop:14,padding:"10px 24px",borderRadius:8,background:attSaved?T.grn:T.blu,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:7}}>
              <IcChk size={14} color="white"/> {attSaved?t("finance.saved"):t("payroll.save_attendance_settings")}
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
    if(!d.name || !d.name.trim()){ setErr(t("payroll.name_is_required")); return; }
    if(!d.rate_per_day || Number(d.rate_per_day)<=0){ setErr(t("payroll.rate_per_day_required")); return; }
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
        // Rate gate — the stored rate may be the card rate, not what was
        // typed. Without this the field just "reverts" with no explanation.
        if(res.rate_pending && res.message) alert(res.message);
      }else{ setErr(res.message||"Save failed"); }
    }catch(e){ setErr(e.message||"Network error"); }
    setSaving(false);
  };

  const remove=async(w)=>{
    if(!await window.confirmAsync(t("payroll.remove_worker_name", { name: w.name }))) return;
    try{
      const res=await api.del(`/payroll/workers/${w.id}`);
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
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("payroll.search_by_name_or_skill")}
            style={{height:32,padding:"0 8px 0 26px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",width:"100%"}}/>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11.5,color:T.t3}}>{t("common.total_2")} <b style={{color:T.t1}}>{workers.length}</b></span>
          {isAdmin&&<button onClick={()=>open("add")}
            style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcAdd size={13} color="white"/> {t("common.add_worker")}
          </button>}
        </div>
      </div>

      {filtered.length===0&&<EmptyState icon={<div style={{fontSize:40}}>👷</div>} message={search?"No matching workers":"No workers yet"} sub={search?"":t("payroll.add_workers_to_start_tracking_attendance")}/>}

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
              <span style={{fontSize:11.5,color:T.t3}}>{w.contractor||t("payroll.self")}</span>
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
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:T.surface,borderRadius:12,padding:22,width:480,maxWidth:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:800,color:T.t1}}>
                {modal.mode==="add"?t("common.add_worker"):t("master_library.edit_worker")}
              </div>
              <button onClick={close} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.t4}}>
                <IcX size={18}/>
              </button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{gridColumn:"span 2"}}>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>{t("common.name")}</label>
                <input value={modal.data.name} onChange={e=>setModal({...modal,data:{...modal.data,name:e.target.value}})}
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>{t("payroll.skill")}</label>
                <SearchSelect value={modal.data.skill||""} options={SKILLS} onChange={v=>setModal({...modal,data:{...modal.data,skill:v}})} placeholder={t("payroll.select_skill")}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>{t("common.phone")}</label>
                <input value={modal.data.phone||""} onChange={e=>setModal({...modal,data:{...modal.data,phone:e.target.value}})}
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>{t("payroll.rate_per_day")}</label>
                <input type="number" value={modal.data.rate_per_day} onChange={e=>setModal({...modal,data:{...modal.data,rate_per_day:e.target.value}})}
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>{t("payroll.ot_rate_per_hour")}</label>
                <input type="number" value={modal.data.rate_ot||""} onChange={e=>setModal({...modal,data:{...modal.data,rate_ot:e.target.value}})}
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>{t("payroll.contractor")}</label>
                <input value={modal.data.contractor||""} onChange={e=>setModal({...modal,data:{...modal.data,contractor:e.target.value}})} placeholder={t("payroll.self")}
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>{t("common.project")}</label>
                <SearchSelect value={modal.data.project||""} options={PROJECTS||[]} onChange={v=>setModal({...modal,data:{...modal.data,project:v}})} placeholder={t("payroll.any_project")}/>
              </div>
            </div>

            {err && <div style={{background:T.redL,color:T.red,padding:"7px 10px",borderRadius:6,fontSize:11,marginTop:12,border:`1px solid ${T.redM}`}}>{err}</div>}

            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={close} disabled={saving}
                style={{padding:"8px 16px",borderRadius:7,background:"none",border:`1.5px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
               {t("common.cancel")}
              </button>
              <button onClick={save} disabled={saving}
                style={{padding:"8px 18px",borderRadius:7,background:saving?T.b1:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer"}}>
                {saving?t("common.saving"):t("common.save")}
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400}}/>
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(540px,95vw)",background:T.surface,boxShadow:"-12px 0 32px rgba(0,0,0,0.18)",zIndex:401,display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease-out"}}>
      {/* Header */}
      <div style={{padding:"15px 20px",background:"linear-gradient(135deg,#0D1B2A 0%,#1B2C3F 100%)",color:"white",display:"flex",alignItems:"center",gap:12}}>
        <Avatar name={worker.name} size={42} color={T.amb}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700}}>{worker.name}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}>{t("payroll.trade_fmtn_day_ot_fmtn2_hr", { trade: worker.trade, fmtN: fmtN(worker.ratePerDay), fmtN2: fmtN(worker.rateOT||0) })}</div>
        </div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:6,color:"white",fontSize:18,width:30,height:30,cursor:"pointer"}}>×</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
        {/* Date range */}
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
          <div style={{fontSize:11,color:T.t3,fontWeight:600}}>{t("payroll.period")}</div>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{padding:"5px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,fontFamily:"inherit"}}/>
          <span style={{fontSize:11,color:T.t4}}>to</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{padding:"5px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,fontFamily:"inherit"}}/>
          <button onClick={()=>{setFrom(iso(lastSunday));setTo(iso(today));}} style={{padding:"4px 10px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10.5,fontWeight:700,cursor:"pointer"}}>{t("payroll.last_sun_today")}</button>
        </div>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
          {[
            {l:t("common.present"),v:stats.P,c:T.grn,bg:T.grnL},
            {l:t("common.half_day"),v:stats.H,c:T.amb,bg:T.ambL},
            {l:t("common.absent"),v:stats.A,c:T.red,bg:T.redL},
            {l:t("payroll.ot_hrs_2"),v:stats.OT,c:T.pur,bg:T.purL},
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
            <div style={{fontSize:10,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>{t("payroll.period_payable")}</div>
            <div style={{fontSize:22,fontWeight:800,color:T.blu,marginTop:3}}>₹{fmtN(stats.total)}</div>
          </div>
          <div style={{padding:"12px 14px",background:`linear-gradient(135deg,${T.grn}12,${T.grn}06)`,borderRadius:8,border:`1.5px solid ${T.grnM}`}}>
            <div style={{fontSize:10,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>{t("payroll.already_paid")}</div>
            <div style={{fontSize:22,fontWeight:800,color:T.grn,marginTop:3}}>₹{fmtN(alreadyPaid)}</div>
          </div>
        </div>

        {/* Daily breakdown */}
        <div style={{fontSize:12,fontWeight:700,color:T.t2,marginBottom:6}}>{t("payroll.daily_breakdown")}</div>
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
          <div style={{fontSize:12,fontWeight:700,color:T.t2,marginBottom:6}}>{t("payroll.payment_records_matchingpayments", { matchingPayments: matchingPayments.length })}</div>
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
                  {p.status==="pending"&&isAdmin&&<button onClick={()=>onMarkPaid(p,"cash")} style={{padding:"4px 10px",borderRadius:5,background:T.grn,color:"white",border:"none",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>{t("payroll.mark_paid_2")}</button>}
                </div>
              );
            })}
          </div>
        </>)}

        {matchingPayments.length===0&&stats.total>0&&(
          <div style={{padding:12,background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,fontSize:11.5,color:T.amb}}>
           {t("payroll.is_period_ke_liye_payment_generate")}
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
    if(!await window.confirmAsync(t("payroll.generate_payments_from_from_to_to", { from, to }))) return;
    setGenerating(true);setErr("");
    try{
      const r=await api.post("/payroll/daily-labour/payments/generate",{
        period_start:from, period_end:to, cycle_type:cycle,
      });
      if(r.success){
        alert(t("payroll.generated_count_payment_records", { count: r.count }));
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
    if(!await window.confirmAsync(t("payroll.cancel_this_payment_record"))) return;
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
            <label style={{fontSize:11,color:T.t3}}>{t("payroll.from")}</label>
            <input type="date" value={from} onChange={e=>{setFrom(e.target.value);setCycle("custom");}}
              style={{padding:"6px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}/>
            <label style={{fontSize:11,color:T.t3}}>{t("payroll.to")}</label>
            <input type="date" value={to} onChange={e=>{setTo(e.target.value);setCycle("custom");}}
              style={{padding:"6px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}/>
          </div>

          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
              style={{padding:"6px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
              <option value="all">{t("payroll.all_statuses")}</option>
              <option value="pending">{t("common.pending")}</option>
              <option value="paid">{t("common.paid")}</option>
              <option value="cancelled">{t("common.cancelled")}</option>
            </select>
            {isAdmin&&<button onClick={generate} disabled={generating}
              style={{padding:"7px 16px",borderRadius:7,background:generating?T.b1:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:generating?"not-allowed":"pointer"}}>
              {generating?t("payroll.generating"):t("payroll.generate_payments")}
            </button>}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
        <div style={{padding:"11px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderLeft:`3px solid ${T.amb}`}}>
          <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>{t("payroll.pending_payable")}</div>
          <div style={{fontSize:18,fontWeight:700,color:T.amb,marginTop:3}}>₹{fmtN(totalPayable)}</div>
        </div>
        <div style={{padding:"11px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderLeft:`3px solid ${T.grn}`}}>
          <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>{t("common.paid")}</div>
          <div style={{fontSize:18,fontWeight:700,color:T.grn,marginTop:3}}>₹{fmtN(totalPaid)}</div>
        </div>
        <div style={{padding:"11px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderLeft:`3px solid ${T.blu}`}}>
          <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>{t("payroll.records")}</div>
          <div style={{fontSize:18,fontWeight:700,color:T.blu,marginTop:3}}>{payments.length}</div>
        </div>
      </div>

      {err && <div style={{background:T.redL,color:T.red,padding:"8px 12px",borderRadius:7,fontSize:12,marginBottom:10,border:`1px solid ${T.redM}`}}>{err}</div>}

      {/* Payments table */}
      {loading ? <LoadingSpinner/> :
        payments.length===0 ? <EmptyState icon={<div style={{fontSize:40}}>💰</div>} message="No payments in this period" sub={t("payroll.click_generate_payments_to_create_from")}/> :
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
                    <button onClick={()=>markPaid(p,"cash")} title={t("payroll.mark_paid_cash")}
                      style={{padding:"4px 9px",borderRadius:6,background:T.grn,color:"white",fontSize:10.5,fontWeight:700,border:"none",cursor:"pointer"}}>
                     {t("payroll.paid")}
                    </button>
                    <button onClick={()=>cancel(p)} title={t("common.cancel")}
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
          <div style={{fontSize:11,color:T.t3,fontWeight:600,marginBottom:6}}>{t("payroll.quick_view_click_any_worker_for")}</div>
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400}}/>
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(560px,95vw)",background:T.surface,boxShadow:"-12px 0 32px rgba(0,0,0,0.18)",zIndex:401,display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{padding:"15px 20px",background:"linear-gradient(135deg,#0D1B2A 0%,#1B2C3F 100%)",color:"white",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:42,height:42,borderRadius:10,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>👷</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700}}>{skill.role}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}><Rich k="payroll.skill_current_number_day" params={{ skill: skill.category||"—", Number: Number(skill.rate||0).toLocaleString("en-IN") }} /></div>
        </div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:6,color:"white",fontSize:18,width:30,height:30,cursor:"pointer"}}>×</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
        <div style={{fontSize:12,fontWeight:700,color:T.t2,marginBottom:8,letterSpacing:".3px",textTransform:"uppercase"}}>{t("payroll.rate_change_history")}</div>
        {loading&&<div style={{textAlign:"center",padding:40,color:T.t4}}><div style={{width:24,height:24,border:`2.5px solid ${T.b1}`,borderTopColor:T.blu,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 8px"}}/>{t("payroll.loading_history")}</div>}
        {!loading&&items.length===0&&(
          <div style={{textAlign:"center",padding:36,color:T.t4,fontSize:12.5,background:T.surfaceB,borderRadius:8,border:`1px dashed ${T.b1}`}}>
            <div style={{fontSize:30,marginBottom:8}}>📋</div>
           {t("payroll.abhi_tak_koi_rate_change_request")}
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
                  <span style={{fontSize:12,color:T.t3}}>{t("common.from")}</span>
                  <span style={{fontSize:14,fontWeight:700,color:T.t1,padding:"3px 10px",background:T.surfaceB,borderRadius:6,border:`1px solid ${T.b1}`}}>₹{Number(h.current_rate||0).toLocaleString("en-IN")}</span>
                  <span style={{fontSize:14,color:T.blu,fontWeight:700}}>→</span>
                  <span style={{fontSize:14,fontWeight:700,color:T.t1,padding:"3px 10px",background:T.bluL,borderRadius:6,border:`1px solid ${T.bluM}`}}>₹{Number(h.requested_rate||0).toLocaleString("en-IN")}</span>
                  <span style={{fontSize:11,fontWeight:700,color:delta>0?T.amb:T.grn,marginLeft:"auto"}}>{delta>0?"+":""}{delta.toLocaleString("en-IN")}</span>
                </div>
                {h.apply_scope&&(
                  <div style={{fontSize:10.5,color:h.apply_scope==="all"?T.amb:T.t3,fontWeight:600,marginBottom:6,padding:"3px 8px",background:h.apply_scope==="all"?T.ambL:T.surfaceB,borderRadius:5,display:"inline-block",border:`1px solid ${h.apply_scope==="all"?T.ambM:T.b1}`}}>
                    {h.apply_scope==="all"?t("payroll.applied_to_all_existing_workers"):t("payroll.applied_to_new_appointments_only")}
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
                    <div style={{fontSize:9,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".3px",marginBottom:2}}>{t("common.requested_by")}</div>
                    <div style={{fontSize:11.5,fontWeight:600,color:T.t1}}>{h.requested_by_name||"—"}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".3px",marginBottom:2}}>{h.status==="Approved"?t("payment_request.approved_by"):h.status==="Rejected"?t("payroll.rejected_by"):t("payroll.awaiting")}</div>
                    <div style={{fontSize:11.5,fontWeight:600,color:h.status==="Approved"?T.grn:h.status==="Rejected"?T.red:T.t4}}>
                      {h.approved_by_name||(h.status==="Pending"?t("payroll.admin_approval"):"—")}
                    </div>
                    {h.acted_at&&<div style={{fontSize:10,color:T.t4,marginTop:1}}>{fmtDate(h.acted_at)}</div>}
                  </div>
                </div>
                {h.action_remarks&&(
                  <div style={{marginTop:8,fontSize:11,color:T.t3,padding:"5px 9px",background:T.surfaceB,borderRadius:5}}>
                    <span style={{fontWeight:700,color:T.t4}}>{t("payroll.note")} </span>{h.action_remarks}
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
    if(!await window.confirmAsync(t("payroll.duplicate_skills_hata_du_same_role"))) return;
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
          <div style={{fontSize:14,fontWeight:800,color:T.t1}}>{t("payroll.default_rates_by_skill")}</div>
          <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:700,border:`1px solid ${T.bluM}`}}>{t("payroll.synced_with_library")}</span>
        </div>
        <div style={{fontSize:11,color:T.amb,marginBottom:14,padding:"6px 10px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:6}}>
         {t("payroll.base_rates_hain_ye_change_karne")} <b>{t("payroll.admin_approval")}</b> {t("payroll.chahiye_approvals_drawer_finance_tab_pe")}
        </div>
        {loading
          ? <div style={{padding:"20px 0",textAlign:"center",color:T.t4,fontSize:12}}>{t("payroll.loading_rates_from_library")}</div>
          : rates.length===0
            ? <div style={{padding:"20px 0",textAlign:"center",color:T.t4,fontSize:12.5}}>
               {t("payroll.library_mein_koi_labour_rate_nahi")} <b>{t("payroll.library_labour_rate_card")}</b> {t("payroll.mein_jaake_add_labour_rate_se")}
              </div>
            : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {rates.map(r=>(
                  <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px dashed ${T.b1}`}}>
                    <div onClick={()=>setHistorySkill(r)} title={t("payroll.click_to_see_rate_change_history")}
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
        <div style={{fontSize:14,fontWeight:800,color:T.t1,marginBottom:4}}>{t("payroll.default_payment_cycle")}</div>
        <div style={{fontSize:11,color:T.t4,marginBottom:12}}>{t("payroll.default_date_range_when_opening_the")}</div>
        <div style={{display:"flex",gap:10}}>
          {[
            {v:"weekly",l:t("payroll.weekly"),d:t("payroll.pay_every_week_mon_sun")},
            {v:"monthly",l:t("payroll.monthly"),d:t("payroll.pay_every_month_1st_last_day")},
            {v:"custom",l:t("crm.custom"),d:t("payroll.manual_date_range")},
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
         {t("payroll.save_payment_cycle")}
        </button>
        <span style={{fontSize:11,color:T.t4}}>{t("payroll.rate_change_admin_approval_needed")}</span>
      </div>

      {/* ── SCOPE CHOICE MODAL ── */}
      {scopeModal&&(<>
        <div onClick={()=>{setScopeModal(null);loadRates();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"white",borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",zIndex:301,width:520,maxWidth:"95vw",padding:0,overflow:"hidden"}}>
          <div style={{background:"#0D1B2A",padding:"14px 18px",color:"white"}}>
            <div style={{fontSize:14,fontWeight:700}}>{t("payroll.base_rate_change_scope")}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}>{scopeModal.item.role}: ₹{scopeModal.item.rate} → ₹{scopeModal.newRate}/day</div>
          </div>
          <div style={{padding:"16px 18px"}}>
            <div style={{fontSize:11,fontWeight:700,color:T.t4,marginBottom:10,letterSpacing:".4px"}}>{t("payroll.apply_this_rate_change_to")}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              <button onClick={()=>{const r=scopeModal;setScopeModal(null);submitRateChange(r.item,r.newRate,"new_only",r.reason);}}
                style={{padding:"12px 14px",border:`2px solid ${T.b1}`,borderRadius:9,background:"white",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.blu;e.currentTarget.style.background=T.bluL;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b1;e.currentTarget.style.background="white";}}>
                <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:3}}>{t("payroll.new_appointments_only")}</div>
                <div style={{fontSize:11,color:T.t4}}>{t("payroll.existing_workers_ke_individual_rates_same")}</div>
              </button>
              <button onClick={()=>{const r=scopeModal;setScopeModal(null);submitRateChange(r.item,r.newRate,"all",r.reason);}}
                style={{padding:"12px 14px",border:`2px solid ${T.amb}`,borderRadius:9,background:T.ambL,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                <div style={{fontSize:13,fontWeight:700,color:T.amb,marginBottom:3}}>{t("payroll.apply_to_all_existing_workers")}</div>
                <div style={{fontSize:11,color:T.t3}}>{t("payroll.approval_ke_baad_sab_projects_mein", { role: scopeModal.item.role })}</div>
              </button>
            </div>
            <div style={{borderTop:`1px solid ${T.b1}`,paddingTop:12}}>
              <div style={{fontSize:10.5,fontWeight:700,color:T.t4,marginBottom:5}}>{t("payroll.reason_optional")}</div>
              <input type="text" value={scopeModal.reason}
                onChange={e=>setScopeModal(p=>({...p,reason:e.target.value}))}
                placeholder={t("payroll.e_g_quarterly_review_market_correction")}
                style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}>
              <button onClick={()=>{setScopeModal(null);loadRates();}}
                style={{padding:"7px 14px",borderRadius:7,border:`1px solid ${T.b1}`,background:"white",fontSize:12,color:T.t3,cursor:"pointer"}}>{t("common.cancel")}</button>
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
  // Delta on the server-computed payable_days so holiday/half-LOP credits stay intact
  const payable=Number(emp.payable_days)+(target.P-emp.P)+(target.H-emp.H)*0.5;
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
              <div style={{fontSize:14,fontWeight:800,color:T.t1}}>{t("payroll.edit_attendance_name", { name: emp.name })}</div>
              <div style={{fontSize:11,color:T.t4}}>{emp.designation||""} · {MONTHS[month]} {year}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4}}><IcX size={17} color={T.t3}/></button>
        </div>
        <div style={{padding:"16px 18px"}}>
          {dayMap===null?<div style={{textAlign:"center",padding:"20px 0",color:T.t4,fontSize:12.5}}>{t("payroll.loading_attendance")}</div>:<>
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
              <div style={{fontSize:10.5,fontWeight:700,color:T.blu,marginBottom:4,textTransform:"uppercase",letterSpacing:.3,display:"flex",alignItems:"center",gap:3}}><IcClockIn size={11} color={T.blu}/> {t("payroll.ot_hours")}</div>
              <input type="number" min={0} style={{...inp,color:T.blu,borderColor:changedOt?T.blu:T.b2,background:changedOt?T.bluL:T.surface}}
                value={target.ot} onChange={e=>setTarget(s=>({...s,ot:Math.max(0,Number(e.target.value)||0)}))}/>
            </div>
            <div>
              <div style={{fontSize:10.5,fontWeight:700,color:T.pur,marginBottom:4,textTransform:"uppercase",letterSpacing:.3}}>{t("payroll.leave_read_only")}</div>
              <div style={{...inp,color:T.pur,background:T.surfaceB,borderColor:T.b1}}>{emp.paid_leave}P / {emp.unpaid_leave}LOP</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <div style={{flex:1,background:T.bluL,borderRadius:9,padding:"9px 12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:T.t3,fontWeight:600}}>{t("payroll.payable_days")}</div>
              <div style={{fontSize:16,fontWeight:800,color:T.blu}}>{payable} / {workingDays||26}</div>
            </div>
            <div style={{flex:1,background:T.grnL,borderRadius:9,padding:"9px 12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:T.t3,fontWeight:600}}>{t("payroll.ot_amount")}</div>
              <div style={{fontSize:16,fontWeight:800,color:T.grn}}>₹{fmtN(otAmt)}</div>
            </div>
          </div>
          {over&&<div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 12px",background:T.redL,border:`1px solid ${T.red}33`,borderRadius:8,marginBottom:12}}>
            <IcAlert size={13} color={T.red}/><span style={{fontSize:11.5,color:T.red,fontWeight:600}}>{t("payroll.marked_days_totalmarked_working_days_workingdays", { totalMarked, workingDays: workingDays||26 })}</span>
          </div>}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:T.t2,marginBottom:5}}>{t("payroll.reason_for_edit_2")} <span style={{color:T.red}}>*</span></div>
            <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2} placeholder={t("payroll.e_g_15_jun_gps_punch")}
              style={{width:"100%",padding:"9px 11px",border:`1px solid ${T.b2}`,borderRadius:8,fontSize:12.5,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
            <div style={{fontSize:10.5,color:T.t4,marginTop:4}}>{t("payroll.reason_audit_log_me_save_hoga")}</div>
          </div>
          <div style={{display:"flex",gap:9}}>
            <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${T.b2}`,background:T.surface,color:T.t2,fontSize:13,fontWeight:600,cursor:"pointer"}}>{t("common.cancel")}</button>
            <button disabled={(!changedCount&&!changedOt)||!reason.trim()||over} onClick={submit}
              style={{flex:2,padding:"10px",borderRadius:9,border:"none",background:((!changedCount&&!changedOt)||!reason.trim()||over)?T.b2:T.blu,color:"#fff",fontSize:13,fontWeight:700,cursor:((!changedCount&&!changedOt)||!reason.trim()||over)?"default":"pointer"}}>
             {t("payroll.add_to_review_list")}
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
    if(!await window.confirmAsync(t("payroll.month_year_payroll_finalize_lock_karein", { month: MONTHS[month], year }))) return;
    setBusy(true);
    try{
      const adjustments=Object.entries(adjs).filter(([,v])=>Number(v)).map(([staff_id,amount])=>({staff_id:Number(staff_id),amount:Number(amount),note:"One-time adjustment"}));
      const r=await api.post("/payroll/run/finalize",{month:apiMonth,year,adjustments});
      if(r.success){
        const ri=await api.get(`/payroll/run/${r.data.run_id}/items`);
        if(ri.success){ setFinalized(ri.data.run); setItems(ri.data.items||[]); }
        flash(t("payroll.payroll_finalized_locked"));
        if(onChanged) onChanged();
      }else flash(r.message||"Finalize failed");
    }catch(e){ flash(e?.response?.data?.message||"Finalize failed"); }
    setBusy(false);
  };
  const doRevert=async()=>{
    const reason=await window.promptAsync(t("payroll.revert_reason_period_unlock_ho_jayega"));
    if(reason===null) return;
    setBusy(true);
    try{
      const r=await api.post(`/payroll/run/${finalized.id}/revert`,{reason});
      if(r.success){
        flash(t("payroll.run_reverted_period_unlocked_deducted_advances"));
        setFinalized(null); setItems([]); setStep(0); await loadPre();
        if(onChanged) onChanged();
      }else flash(r.message||"Revert failed");
    }catch(e){ flash(e?.response?.data?.message||"Revert failed"); }
    setBusy(false);
  };
  // Settle modal — payments go through the salary ledger (partial allowed),
  // pay_status syncs backend-side (pending → partial → paid).
  const [settleIt,setSettleIt]=useState(null);
  const [settleForm,setSettleForm]=useState({amount:"",method:"bank_transfer",txRef:""});
  const openSettle=(it)=>{
    const remaining=Math.max(0,(Number(it.net_amount)||0)-(Number(it.settled)||0));
    setSettleForm({amount:String(remaining),method:"bank_transfer",txRef:""});
    setSettleIt(it);
  };
  const doSettle=async()=>{
    const amt=Number(settleForm.amount);
    if(!amt||amt<=0){ flash(t("finance.amount_sahi_bharo")); return; }
    setBusy(true);
    try{
      const r=await api.post("/wallets/salary/settle",{run_item_id:settleIt.id,amount:amt,payment_method:settleForm.method,tx_ref:settleForm.txRef||undefined});
      if(r.success){
        const ri=await api.get(`/payroll/run/${finalized.id}/items`);
        if(ri.success) setItems(ri.data.items||[]);
        flash(r.data?.pay_status==="paid"?"Paid ✓":"Partial settle ✓");
        setSettleIt(null);
        if(onChanged) onChanged();
      }else flash(r.message||"Settle failed");
    }catch(e){ flash(e?.response?.data?.message||"Settle failed"); }
    setBusy(false);
  };
  const openPayslip=async(it)=>{
    try{ const r=await api.get(`/payroll/run-items/${it.id}/payslip`); if(r.success) printRunPayslip(r.data.item,r.data.run); }catch(e){ flash(t("payroll.payslip_load_failed")); }
  };

  if(!isAdmin) return <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>{t("payroll.create_salary_run_is_only_accessible")}</div>;
  if(loading) return <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>{t("payroll.loading_payroll_run")}</div>;

  const errs=pre?(pre.pendingLeaves.length>0?1:0)+(pre.pendingAttEdits.length>0?1:0)+((pre.pendingReviews&&pre.pendingReviews.length>0)?1:0):0;
  const warns=pre?(pre.unmarkedStaff.length>0?1:0)+(pre.zeroSalaryStaff.length>0?1:0):0;

  return(
    <div>
      {/* header strip */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:T.t1}}>{t("payroll.create_salary_payroll_run")}</div>
          <div style={{fontSize:12,color:T.t3,marginTop:2}}>{t("payroll.month_end_processing_attendance_se_net")}</div>
        </div>
        <Pill label={finalized?t("payroll.finalized"):t("payroll.draft")} c={finalized?T.grn:T.amb} bg={finalized?T.grnL:T.ambL}/>
      </div>
      <RWStepper step={step}/>

      {/* STEP 0 — PRE-RUN CHECKS */}
      {step===0&&pre&&(
        <div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
            <RWKpi label={t("payroll.blocking_issues")} value={errs} color={T.red} bg={T.redL}/>
            <RWKpi label={t("payroll.warnings")} value={warns} color={T.amb} bg={T.ambL}/>
            <RWKpi label={t("payroll.gps_punches")} value={pre.punchSessionCount} sub={t("payroll.merged_in_grid")} color={T.grn} bg={T.grnL}/>
          </div>
          <RWCard>
            {[
              pre.pendingLeaves.length>0&&{type:"error",label:t("payroll.length_leave_application_s_pending_approval", { length: pre.pendingLeaves.length }),sub:pre.pendingLeaves.slice(0,3).map(l=>`${l.staff_name} (${l.leave_name})`).join(" · "),action:"Review Leaves",go:"office-leave"},
              pre.pendingAttEdits.length>0&&{type:"error",label:t("payroll.length_attendance_edit_request_s_pending", { length: pre.pendingAttEdits.length }),sub:t("payroll.approve_reject_in_attendance_tab"),action:"Open Attendance",go:"office-att"},
              pre.pendingReviews&&pre.pendingReviews.length>0&&{type:"error",label:t("payroll.length_outside_geofence_punch_es_review", { length: pre.pendingReviews.length }),sub:pre.pendingReviews.slice(0,3).map(r=>`${r.user_name}${r.out_reason?" ("+r.out_reason+")":""}`).join(" · ")+" — salary finalize ke liye review compulsory",action:"Review Punches",go:"office-att"},
              pre.unmarkedStaff.length>0&&{type:"warn",label:t("payroll.length_staff_ke_unmarked_days_hain", { length: pre.unmarkedStaff.length }),sub:pre.unmarkedStaff.slice(0,3).map(s=>`${s.name} (${s.unmarkedDays}d)`).join(" · ")+" — unmarked = no pay",action:"Open Attendance",go:"office-att"},
              pre.zeroSalaryStaff.length>0&&{type:"warn",label:t("payroll.length_staff_ki_salary_structure_incomplete", { length: pre.zeroSalaryStaff.length }),sub:pre.zeroSalaryStaff.slice(0,3).map(s=>s.name).join(" · ")+" — ₹0 salary banegi",action:"Edit Staff",go:"office-salary"},
              {type:"ok",label:t("payroll.gps_punch_data_synced"),sub:t("payroll.punchsessioncount_mobile_sessions_is_month_grid", { punchSessionCount: pre.punchSessionCount })},
              {type:"ok",label:t("payroll.length_holiday_s_set", { length: pre.holidays.length }),sub:pre.holidays.length?pre.holidays.map(h=>h.name).join(" · "):"Koi holiday nahi — Calendar tab me add karein"},
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
            <IcAlert size={15} color={T.amb}/><span style={{fontSize:12,color:T.t2}}>{t("payroll.red_items_resolve_karna_recommended_aage")} <b>unpaid</b> {t("payroll.aur_unmarked_days")} <b>{t("payroll.no_pay")}</b> {t("payroll.count_honge")}</span>
          </div>}
        </div>
      )}

      {/* STEP 1 — ATTENDANCE REVIEW */}
      {step===1&&(
        <div>
          {pending.length>0&&(
            <RWCard style={{marginBottom:14,border:`1.5px solid ${T.amb}55`,background:T.ambL}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:`1px solid ${T.amb}33`}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><IcAlert size={15} color={T.amb}/><span style={{fontSize:13,fontWeight:800,color:T.t1}}>{t("payroll.pending_attendance_editpending2_review_approve", { pending: pending.length, pending2: pending.length>1?"s":"" })}</span></div>
                <button disabled={busy} onClick={()=>applyEdits(pending)} style={{fontSize:12,fontWeight:700,color:"#fff",background:T.grn,border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><IcChk size={13} color="#fff"/> {t("payroll.approve_all_apply")}</button>
              </div>
              {pending.map((ed,i)=>(
                <div key={ed.staff_id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 16px",borderBottom:i<pending.length-1?`1px solid ${T.amb}22`:"none"}}>
                  <Avatar name={ed.name} size={26}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{ed.name}</div>
                    <div style={{fontSize:11.5,color:T.t2,marginTop:2}}>{ed.changes.map(c=><span key={c.field} style={{display:"inline-block",marginRight:10}}>{c.field}: <b style={{color:T.t3}}>{c.old}</b> → <b style={{color:T.blu}}>{c.new}</b></span>)}{ed.day_changes.length?<span style={{color:T.t4}}>{t("payroll.ed_din", { ed: ed.day_changes.length })}</span>:null}</div>
                    <div style={{fontSize:10.5,color:T.t4,marginTop:2,fontStyle:"italic"}}>"{ed.reason}"</div>
                  </div>
                  <button disabled={busy} onClick={()=>applyEdits([ed])} style={{fontSize:11,fontWeight:600,color:T.grn,background:T.grnL,border:`1px solid ${T.grn}33`,borderRadius:7,padding:"5px 11px",cursor:"pointer",flexShrink:0}}>{t("common.approve_2")}</button>
                  <button onClick={()=>setPending(p=>p.filter(x=>x.staff_id!==ed.staff_id))} style={{fontSize:11,fontWeight:600,color:T.red,background:T.redL,border:`1px solid ${T.red}33`,borderRadius:7,padding:"5px 11px",cursor:"pointer",flexShrink:0}}>{t("common.reject_2")}</button>
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
                      <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:9}}><Avatar name={e.name}/><div><div style={{fontWeight:600,color:T.t1}}>{e.name} {hasPending&&<Pill label={t("payroll.edit_pending_2")} c={T.amb} bg="#fff"/>}</div><div style={{fontSize:10.5,color:T.t4}}>{e.designation||e.payment_type}</div></div></div></td>
                      <td style={{textAlign:"center",fontWeight:700,color:T.grn}}>{e.P}</td>
                      <td style={{textAlign:"center",color:T.blu,fontSize:11.5}}>{e.gps_days>0?<span style={{display:"inline-flex",alignItems:"center",gap:3}}><IcGPS size={11} color={T.blu}/>{e.gps_days}</span>:"—"}</td>
                      <td style={{textAlign:"center",color:T.amb,fontWeight:600}}>{e.H||"—"}</td>
                      <td style={{textAlign:"center",color:T.pur,fontWeight:600}}>{e.paid_leave||"—"}</td>
                      <td style={{textAlign:"center",color:T.red,fontWeight:600}}>{e.unpaid_leave?(Number(e.unpaid_leave)%1!==0?<span>{Number(e.unpaid_leave)} <span style={{fontSize:9,padding:"1px 4px",borderRadius:6,background:"#FEF3C7",color:"#B45309",fontWeight:800}}>½</span></span>:Number(e.unpaid_leave)):"—"}</td>
                      <td style={{textAlign:"center",color:T.red,fontWeight:700}}>{e.A||"—"}</td>
                      <td style={{textAlign:"center",color:T.blu,fontWeight:700}}>{e.ot_hours||"—"}</td>
                      <td style={{textAlign:"center"}}><Pill label={`${e.payable_days} / ${workingDays||26}`} c={T.blu} bg={T.bluL}/></td>
                      <td style={{textAlign:"center"}}><button onClick={()=>setEditEmp(e)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:T.blu,background:T.bluL,border:`1px solid ${T.blu}33`,borderRadius:7,padding:"5px 11px",cursor:"pointer",fontWeight:600}}><IcEdit size={12} color={T.blu}/> {t("common.edit_2")}</button></td>
                    </tr>
                  );
                })}
                {!summary.length&&<tr><td colSpan={10} style={{textAlign:"center",padding:"24px",color:T.t4}}>{t("payroll.koi_salary_enabled_staff_nahi_mila")}</td></tr>}
              </tbody>
            </table>
          </RWCard>
          <div style={{fontSize:11.5,color:T.t3,marginTop:10}}>{t("payroll.payable_present_half_0_5_paid", { workingDays: workingDays||26 })}</div>
        </div>
      )}

      {/* STEP 2 — SALARY PREVIEW */}
      {step===2&&preview&&(
        <RunSalaryPreview preview={preview} adjs={adjs} setAdjs={setAdjs} workingDays={workingDays}/>
      )}

      {/* STEP 3 — FINALIZE / LOCKED VIEW */}
      {step===3&&(
        <RunFinalize preview={preview} adjs={adjs} finalized={finalized} items={items} month={month} year={year}
          busy={busy} onFinalize={doFinalize} onRevert={doRevert} onMarkPaid={openSettle} onPayslip={openPayslip} isAdmin={isAdmin}/>
      )}

      {/* SETTLE MODAL — salary payment via ledger (partial allowed) */}
      {settleIt&&(()=>{
        const net=Number(settleIt.net_amount)||0;
        const already=Number(settleIt.settled)||0;
        const remaining=Math.max(0,net-already);
        return(
          <div onClick={()=>setSettleIt(null)} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",zIndex:120,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,padding:"18px 20px",width:380,maxWidth:"92vw",boxShadow:"0 12px 40px rgba(0,0,0,0.25)"}}>
              <div style={{fontSize:14,fontWeight:800,color:T.t1,marginBottom:4}}>{t("payroll.settle_salary_staff_name", { staff_name: settleIt.staff_name })}</div>
              <div style={{fontSize:11.5,color:T.t3,marginBottom:12}}><Rich k="payroll.net_fmtnalready_remaining_fmtn2" params={{ fmtN: fmtN(net), already: already>0?` · ₹${fmtN(already)} settle ho chuka`:"", fmtN2: fmtN(remaining) }} /></div>
              <label style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:.4}}>{t("common.amount_2")}</label>
              <input type="number" value={settleForm.amount} onChange={e=>setSettleForm(f=>({...f,amount:e.target.value}))}
                style={{width:"100%",padding:"9px 11px",borderRadius:8,border:`1px solid ${T.b2}`,fontSize:13,fontWeight:700,boxSizing:"border-box",margin:"4px 0 10px"}}/>
              <label style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:.4}}>{t("payroll.payment_method")}</label>
              <select value={settleForm.method} onChange={e=>setSettleForm(f=>({...f,method:e.target.value}))}
                style={{width:"100%",padding:"9px 11px",borderRadius:8,border:`1px solid ${T.b2}`,fontSize:12.5,boxSizing:"border-box",margin:"4px 0 10px",background:T.surface}}>
                <option value="bank_transfer">{t("payroll.bank_transfer_neft")}</option>
                <option value="upi">UPI</option>
                <option value="cash">{t("common.cash")}</option>
                <option value="cheque">{t("common.cheque")}</option>
              </select>
              <label style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:.4}}>{t("payroll.tx_ref_optional")}</label>
              <input value={settleForm.txRef} onChange={e=>setSettleForm(f=>({...f,txRef:e.target.value}))} placeholder={t("payroll.utr_cheque_no")}
                style={{width:"100%",padding:"9px 11px",borderRadius:8,border:`1px solid ${T.b2}`,fontSize:12.5,boxSizing:"border-box",margin:"4px 0 14px"}}/>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={()=>setSettleIt(null)} style={{padding:"9px 16px",borderRadius:8,border:`1px solid ${T.b1}`,background:T.surface,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>{t("common.cancel")}</button>
                <button disabled={busy} onClick={doSettle} style={{padding:"9px 18px",borderRadius:8,border:"none",background:T.grn,color:"#fff",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{busy?t("common.saving_2"):"Settle ₹"+fmtN(Number(settleForm.amount)||0)}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* NAV */}
      {!finalized&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:18,gap:10}}>
          <button disabled={step===0} onClick={()=>goStep(step-1)} style={{padding:"10px 20px",borderRadius:9,border:`1px solid ${T.b2}`,background:T.surface,color:step===0?T.t4:T.t2,fontSize:13,fontWeight:600,cursor:step===0?"default":"pointer"}}>{t("common.back_2")}</button>
          {step===1&&pending.length>0&&<span style={{fontSize:11.5,color:T.amb,fontWeight:600}}>{t("payroll.pending_edit_approval_pending_continue_par", { pending: pending.length })}</span>}
          {step<3&&<button onClick={()=>goStep(step+1)} style={{padding:"10px 24px",borderRadius:9,border:"none",background:T.blu,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>{t("payroll.continue")}</button>}
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
        <RWKpi label={t("payroll.gross_payable")} value={`₹${fmtN(tot.g)}`}/>
        <RWKpi label={t("payroll.ot_payable")} value={`₹${fmtN(tot.ot)}`} color={T.blu}/>
        <RWKpi label={t("payroll.deductions")} value={`₹${fmtN(tot.d)}`} sub={t("payroll.pf_esi_tds_advance")} color={T.red}/>
        <RWKpi label={t("payroll.net_payout")} value={`₹${fmtN(tot.n)}`} color={T.grn} bg={T.grnL}/>
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
      <div style={{fontSize:11.5,color:T.t3,marginTop:10}}>{t("payroll.adjustment_me_one_time_bonus_ya")}</div>
    </div>
  );
}
function RWPreviewRow({it,open,setOpen,adj,setAdj,net}){
  const b=it.breakdown||{}; const e=b.earnings||{}; const ded=it.pf+it.esi+it.tds+it.advance_deducted;
  return(
    <>
      <tr style={{borderBottom:open?"none":`1px solid ${T.b1}`,background:it.full_gross===0?T.ambL:"transparent"}}>
        <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:9}}><Avatar name={it.staff_name}/><div><div style={{fontWeight:600,color:T.t1}}>{it.staff_name}</div><div style={{fontSize:10.5,color:T.t4}}>{it.designation}</div></div></div></td>
        <td style={{textAlign:"center"}}><Pill label={it.payment_type==="fixed"?t("payroll.fixed"):t("payroll.pro_rata")} c={it.payment_type==="fixed"?T.grn:T.pur} bg={it.payment_type==="fixed"?T.grnL:T.purL}/></td>
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
                <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:6}}>{t("payroll.earnings")}</div>
                {[["Basic",e.basic],["HRA",e.hra],["Conveyance",e.conveyance],["Medical",e.medical],["Phone",e.phone],["Petrol",e.petrol],["Special",e.special]].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"2.5px 0",color:T.t2}}><span>{l}</span><span>₹{fmtN(v)}</span></div>
                ))}
                {it.ot_amount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"2.5px 0",color:T.blu,fontWeight:600}}><span>{t("payroll.ot_ot_hours_hrs", { ot_hours: it.ot_hours })}</span><span>+₹{fmtN(it.ot_amount)}</span></div>}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",fontWeight:700,color:T.t1,borderTop:`1px solid ${T.b1}`,marginTop:4}}><span>{t("payroll.gross_earned_payable_daysd", { payable_days: it.payable_days })}</span><span>₹{fmtN(it.gross_earned+it.ot_amount)}</span></div>
              </div>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:6}}>{t("payroll.deductions")}</div>
                {[["PF",it.pf],["ESI",it.esi],["TDS",it.tds],["Advance",it.advance_deducted]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"2.5px 0",color:T.t2}}><span>{l}</span><span style={{color:v?T.red:T.t4}}>{v?`−₹${fmtN(v)}`:"—"}</span></div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",fontWeight:700,color:T.grn,borderTop:`1px solid ${T.b1}`,marginTop:4}}><span>{t("common.net")}</span><span>₹{fmtN(net)}</span></div>
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
        <div style={{fontSize:14,fontWeight:800,color:T.t1,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><IcCal size={16} color={T.blu}/>{t("payroll.months_year_payroll_run_summary", { MONTHS: MONTHS[month], year })}</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <RWKpi label={t("payroll.employees")} value={count}/>
          <RWKpi label={t("payroll.gross_ot")} value={`₹${fmtN(totG+totOt)}`}/>
          <RWKpi label={t("payroll.deductions")} value={`−₹${fmtN(totD)}`} color={T.red}/>
          <RWKpi label={t("payroll.adjustments")} value={`${totAdj>=0?"+":""}₹${fmtN(totAdj)}`} color={T.amb}/>
          <RWKpi label={t("payroll.net_payout")} value={`₹${fmtN(totN)}`} color={T.grn} bg={T.grnL}/>
        </div>
        {!finalized&&<div style={{marginTop:16,padding:"12px 14px",background:T.sltL||T.surfaceB,borderRadius:10,fontSize:12,color:T.t2,lineHeight:1.65}}>
          <b>{t("payroll.finalize_karne_par")}</b><br/>① Har employee ka attendance+OT+salary snapshot freeze (payroll_run_items)<br/><Rich k="payroll.months_attendance_lock_edit_sirf_revert" params={{ MONTHS: MONTHS[month] }} /><br/>{t("payroll.step3_payslips")}<br/>{t("payroll.step4_payment_status")}</div>}
      </RWCard>
      {!finalized?(
        <button disabled={busy||count===0} onClick={onFinalize} style={{width:"100%",padding:"14px",background:count===0?T.b2:T.grn,color:"#fff",border:"none",borderRadius:11,fontSize:14,fontWeight:800,cursor:count===0?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><IcLock size={16} color="#fff"/> {busy?t("payroll.finalizing"):`Finalize & Lock ${MONTHS[month]} ${year} Payroll`}</button>
      ):(
        <div>
          <div style={{padding:"14px",background:T.grnL,border:`1.5px solid ${T.grn}55`,borderRadius:11,display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:T.grn,display:"flex",alignItems:"center",justifyContent:"center"}}><IcChk size={16} color="#fff"/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:13.5,fontWeight:800,color:T.grn}}>{t("payroll.payroll_finalized_months_year", { MONTHS: MONTHS[month], year })}</div>
              <div style={{fontSize:11.5,color:T.t3}}>{t("payroll.count_payslips_net_fmtn_attendance_locked", { count, fmtN: fmtN(totN) })}</div>
            </div>
            {isAdmin&&<button disabled={busy} onClick={onRevert} style={{fontSize:12,fontWeight:700,color:T.red,background:T.redL,border:`1px solid ${T.red}55`,borderRadius:8,padding:"8px 14px",cursor:"pointer"}}>{t("payroll.revert_run")}</button>}
          </div>
          <RWCard>
            {items.map((it,i)=>(
              <div key={it.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderBottom:i<items.length-1?`1px solid ${T.b1}`:"none"}}>
                <Avatar name={it.staff_name} size={28}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{it.staff_name}</div>
                  <div style={{fontSize:10.5,color:T.t4}}>{t("payroll.net_fmtnit", { fmtN: fmtN(it.net_amount), it: it.ot_amount>0?` (incl. OT ₹${fmtN(it.ot_amount)})`:"" })}</div>
                </div>
                {(()=>{
                  const settled=Number(it.settled)||0, net=Number(it.net_amount)||0;
                  if(it.pay_status==="paid")   return <Pill label={t("common.paid")} c={T.grn} bg={T.grnL}/>;
                  if(it.pay_status==="hold")   return <Pill label={t("common.hold")} c={T.slt} bg={T.sltL||T.surfaceB}/>;
                  if(it.pay_status==="partial"||settled>0) return <Pill label={`Partial (₹${fmtN(settled)} of ₹${fmtN(net)})`} c={T.blu} bg={T.bluL}/>;
                  return <Pill label={t("common.pending")} c={T.amb} bg={T.ambL}/>;
                })()}
                {it.pay_status!=="paid"&&isAdmin&&<button onClick={()=>onMarkPaid(it)} style={{fontSize:11,fontWeight:600,color:T.grn,background:T.grnL,border:`1px solid ${T.grn}33`,borderRadius:7,padding:"5px 11px",cursor:"pointer"}}>{t("payroll.settle_pay")}</button>}
                <button onClick={()=>onPayslip(it)} style={{fontSize:11,fontWeight:600,color:T.blu,background:"none",border:"none",cursor:"pointer"}}>{t("payroll.payslip")}</button>
              </div>
            ))}
          </RWCard>
        </div>
      )}
    </div>
  );
}

// ── TEAM & HR OVERVIEW TAB ────────────────────────────────────────
// Landing dashboard: Action Center (pending kaam) + Manpower Outlook
// (aaj + agle 4 din — kaun leave pe, project coverage). Data:
// GET /payroll/overview (leaves overlap + staff project/role base).
function OverviewTab({isAdmin,setTab,onOpenSalary}){
  const [ov,setOv]=useState(null);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [selDay,setSelDay]=useState(null);   // index into ov.days — null = koi detail nahi
  const load=useCallback(()=>{
    setLoading(true);setErr("");
    api.get("/payroll/overview?days=5")
      .then(r=>{ if(r.success) setOv(r.data); else setErr(r.message||"Load failed"); })
      .catch(e=>setErr(e.message||"Network error"))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{ load(); },[load]);

  if(loading) return <div style={{textAlign:"center",padding:"50px 0",color:T.t4,fontSize:12}}>{t("payroll.overview_load_ho_raha_hai")}</div>;
  if(err||!ov) return <ErrorRetry onRetry={load}/>;

  const DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const dayLabel=(d,i)=>{
    const x=new Date(d.date+"T00:00:00");
    return `${DOW[x.getDay()]} ${String(x.getDate()).padStart(2,"0")}${i===0?" · Aaj":""}`;
  };
  const projName=(p)=>p||"Office / No project";

  // Coverage warnings for a day: project+role bucket me kitne absent vs total
  const dayWarnings=(day)=>{
    const buckets={};   // "proj||role" → Set(staff)
    day.onLeave.forEach(l=>{
      const k=`${(l.project||"").trim().toLowerCase()}||${(l.role||"").trim().toLowerCase()}`;
      (buckets[k]=buckets[k]||[]).push(l);
    });
    const warns=[];
    Object.values(buckets).forEach(list=>{
      const {project,role}=list[0];
      const pj=(ov.projects||[]).find(p=>(p.project||"").trim().toLowerCase()===(project||"").trim().toLowerCase());
      // Role totals case-insensitively summed — DB me "Supervisor"/"supervisor" dono hain
      const total=pj?Object.entries(pj.roles).reduce((s,[k,n])=>s+((k.trim().toLowerCase()===(role||"").trim().toLowerCase())?n:0),0):0;
      const absent=list.length;
      if(total>0&&absent/total>=0.5){
        warns.push({sev:absent>=total?"red":"amb",
          text:`${projName(project)}: ${total} me se ${absent} ${role||"staff"} leave pe${absent>=total?" — koi nahi bachega":""}`});
      }
    });
    return warns;
  };

  // Project coverage matrix — sirf named projects (office bucket alag row, end me)
  const covRows=(ov.projects||[]).filter(p=>p.total>0)
    .sort((a,b)=>(a.project?0:1)-(b.project?0:1)||b.total-a.total);
  const absentCount=(day,project)=>day.onLeave.filter(l=>(l.project||"").trim().toLowerCase()===(project||"").trim().toLowerCase()).length;

  const actions=ov.actions;
  const actionRows=actions?[
    actions.pendingLeaves>0&&{c:T.amb,l:`${actions.pendingLeaves} leave approval${actions.pendingLeaves>1?"s":""} pending`,btn:"Review",go:()=>setTab("office-leave")},
    actions.pendingAttEdits>0&&{c:T.blu,l:`${actions.pendingAttEdits} attendance edit request${actions.pendingAttEdits>1?"s":""}`,btn:"Review",go:()=>setTab("office-att")},
    actions.pendingReviews>0&&{c:T.red,l:t("payroll.pendingreviews_outside_geofence_punch_review_pending", { pendingReviews: actions.pendingReviews }),btn:"Review",go:()=>setTab("office-att")},
    actions.settleRequests.count>0&&{c:T.grn,l:`${actions.settleRequests.count} salary settle request${actions.settleRequests.count>1?"s":""} — ₹${fmtN(actions.settleRequests.amount)}`,sub:t("payroll.finance_staff_wallets_me_confirm_hote")},
    !actions.run.finalized&&{c:T.pur,l:t("payroll.months_payroll_run_pending", { MONTHS: MONTHS[actions.run.month-1] }),btn:"Start Run",go:()=>onOpenSalary("run")},
    actions.run.finalized&&{c:T.grn,l:t("payroll.months_payroll_finalized", { MONTHS: MONTHS[actions.run.month-1] }),btn:"View",go:()=>onOpenSalary("run")},
  ].filter(Boolean):[];

  const selected=selDay!=null?ov.days[selDay]:null;

  return(
    <div style={{display:"grid",gap:12,maxWidth:1080}}>

      {/* ─── ACTION CENTER ─── */}
      {isAdmin&&actions&&(
        <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:"4px 16px"}}>
          <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px",padding:"10px 0 4px"}}>{t("payroll.action_center")}</div>
          {actionRows.length===0&&<div style={{padding:"10px 0 14px",fontSize:12.5,color:T.grn,fontWeight:600}}>{t("payroll.sab_clear_koi_pending_action_nahi")}</div>}
          {actionRows.map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderTop:i>0?`1px solid ${T.b1}`:"none"}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:r.c,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <span style={{fontSize:12.5,color:T.t1,fontWeight:600}}>{r.l}</span>
                {r.sub&&<div style={{fontSize:10.5,color:T.t4,marginTop:1}}>{r.sub}</div>}
              </div>
              {r.btn&&<button onClick={r.go} style={{fontSize:11.5,fontWeight:700,color:T.blu,background:T.bluL,border:`1px solid ${T.blu}33`,borderRadius:7,padding:"5px 13px",cursor:"pointer",flexShrink:0}}>{r.btn} →</button>}
            </div>
          ))}
        </div>
      )}

      {/* ─── MANPOWER OUTLOOK ─── */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:16}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:800,color:T.t1}}>{t("payroll.manpower_outlook_next_4_days")}</div>
          <div style={{fontSize:10.5,color:T.t4}}>{t("payroll.din_par_click_karo_detail_neeche")}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${ov.days.length},1fr)`,gap:10}}>
          {ov.days.map((d,i)=>{
            const off=d.dow===0||d.holiday;
            const active=selDay===i;
            const nLeave=d.onLeave.length;
            return(
              <button key={d.date} onClick={()=>setSelDay(active?null:i)}
                style={{padding:"12px 8px",borderRadius:10,cursor:"pointer",textAlign:"center",fontFamily:"inherit",
                  border:`1.5px solid ${active?T.blu:T.b1}`,background:active?T.bluL:T.surfaceB,transition:"all .15s"}}>
                <div style={{fontSize:10.5,fontWeight:700,color:i===0?T.blu:T.t3}}>{dayLabel(d,i)}</div>
                {off?(
                  <>
                    <div style={{fontSize:20,fontWeight:800,color:T.t4,margin:"8px 0 2px"}}>—</div>
                    <div style={{fontSize:10.5,color:T.t4}}>{d.holiday||t("payroll.week_off_2")}</div>
                  </>
                ):(
                  <>
                    <div style={{fontSize:24,fontWeight:800,color:T.t1,margin:"6px 0 0",lineHeight:1.1}}>{d.available}</div>
                    <div style={{fontSize:10,color:T.t4,marginBottom:4}}>available</div>
                    {nLeave>0
                      ? <div style={{fontSize:10.5,fontWeight:700,color:T.amb}}>⚠ {nLeave} leave</div>
                      : <div style={{fontSize:10.5,fontWeight:700,color:T.grn}}>{t("payroll.full_team")}</div>}
                    {d.pending.length>0&&<div style={{fontSize:9.5,color:T.t4,marginTop:1}}>+{d.pending.length} pending</div>}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Day detail — click par */}
        {selected&&(
          <div style={{marginTop:12,border:`1px solid ${T.b1}`,borderRadius:10,padding:"12px 14px",background:T.surfaceB}}>
            <div style={{fontSize:12,fontWeight:800,color:T.t1,marginBottom:8}}>
              {fmtDate(selected.date)} — {selected.onLeave.length>0?`${selected.onLeave.length} staff leave par`:t("payroll.koi_approved_leave_nahi")}
              {selected.holiday&&<span style={{fontSize:10.5,fontWeight:600,color:T.amb,marginLeft:8}}>🎉 {selected.holiday}</span>}
            </div>
            {selected.onLeave.map(l=>(
              <div key={`a${l.app_id}`} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 0"}}>
                <Avatar name={l.name} size={26}/>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{l.name}</span>
                  <span style={{fontSize:10.5,color:T.t4,marginLeft:6}}>{l.leave_code} · {fmtDate(l.from_date)} → {fmtDate(l.to_date)}{l.is_half_day?" (½)":""}</span>
                </div>
                {l.role&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:700}}>{l.role}</span>}
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:T.purL,color:T.pur,fontWeight:700}}>{projName(l.project)}</span>
              </div>
            ))}
            {selected.pending.map(l=>(
              <div key={`p${l.app_id}`} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 0",opacity:.75}}>
                <Avatar name={l.name} size={26}/>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{l.name}</span>
                  <span style={{fontSize:10,fontWeight:700,color:T.amb,marginLeft:6}}>{t("payroll.pending_approval")}</span>
                </div>
                {l.role&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:700}}>{l.role}</span>}
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:T.purL,color:T.pur,fontWeight:700}}>{projName(l.project)}</span>
              </div>
            ))}
            {dayWarnings(selected).map((w,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:7,marginTop:8,padding:"7px 11px",borderRadius:7,
                background:w.sev==="red"?T.redL:T.ambL,border:`1px solid ${w.sev==="red"?T.redM:T.ambM}`}}>
                <IcAlert size={13} color={w.sev==="red"?T.red:T.amb}/>
                <span style={{fontSize:11.5,fontWeight:700,color:w.sev==="red"?T.red:T.amb}}>{w.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── PROJECT COVERAGE ─── */}
      {covRows.length>0&&(
        <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:16}}>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:800,color:T.t1}}>{t("payroll.project_coverage")}</div>
            <div style={{fontSize:10.5,color:T.t4}}>{t("payroll.next_4_days_basis_available_staff")}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:`minmax(160px,1.4fr) 70px repeat(${ov.days.length},1fr)`,gap:0,fontSize:11.5}}>
            <div style={{padding:"6px 8px",fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{t("common.project")}</div>
            <div style={{padding:"6px 8px",fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{t("master_library.staff")}</div>
            {ov.days.map((d,i)=><div key={d.date} style={{padding:"6px 4px",fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:"center"}}>{dayLabel(d,i).split(" · ")[0]}</div>)}
            {covRows.map(p=>(
              [
                <div key={p.project+"_n"} style={{padding:"8px",borderTop:`1px solid ${T.b1}`,fontWeight:700,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{projName(p.project)}</div>,
                <div key={p.project+"_t"} style={{padding:"8px",borderTop:`1px solid ${T.b1}`,color:T.t3,fontWeight:600}}>{p.total}</div>,
                ...ov.days.map(d=>{
                  const off=d.dow===0||d.holiday;
                  const abs=absentCount(d,p.project);
                  const avail=p.total-abs;
                  const c=off?T.t4:abs===0?T.grn:(abs/p.total>=0.5?T.red:T.amb);
                  return(
                    <div key={p.project+d.date} style={{padding:"8px 4px",borderTop:`1px solid ${T.b1}`,textAlign:"center",fontWeight:800,color:c}}>
                      {off?"—":avail}{!off&&abs>0&&<span style={{fontSize:9.5,fontWeight:600,color:c}}> (−{abs})</span>}
                    </div>
                  );
                })
              ]
            ))}
          </div>
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
    setTab(m==="office"?"office-overview":"daily-workers");
  };
  const [tab,setTab]=useState(()=>
    (localStorage.getItem("gb_payroll_mode")||"office")==="office"?"office-overview":"daily-workers"
  );
  // Sub-tab state for grouped tabs (Salary group + Settings gear)
  const [salarySub,setSalarySub]=useState("monthly");   // monthly | run | ledger
  const [settingsSub,setSettingsSub]=useState("config"); // config | sites
  const [month,setMonth]=useState(CUR_MONTH);
  const [year,setYear]=useState(CUR_YEAR);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [staff,setStaff]=useState([]);
  const [workers,setWorkers]=useState([]);
  const [advances,setAdvances]=useState([]);
  const [monthlyAtt,setMonthlyAtt]=useState({});
  const [punchDays,setPunchDays]=useState({});   // {staffId:{day:true}} — GPS punch source badge
  const [attNotes,setAttNotes]=useState({});     // {staffId:{day:note}} — app-user manual-mark reasons
  const [dayLocks,setDayLocks]=useState({});     // {"YYYY-MM-DD": lockRow} — day-lock/approve flow
  const [attFilter,setAttFilter]=useState("all"); // all | sal (salary staff) | app (app users)
  const [attSearch,setAttSearch]=useState("");
  const [attView,setAttView]=useState("day");     // day (aaj — marking) | grid (month overview)
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
    // designation = asli pad (Project Manager, Roller Driver, Cook).
    // `role` isse ALAG hai — wo login ka adhikar hai (admin/
    // supervisor/viewer). Salary screen par pad chahiye, adhikar nahi.
    designation:s.designation||"",
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
      const [mRes,dRes,lRes]=await Promise.all([
        api.get("/payroll/attendance/monthly?month="+month+"&year="+year),
        api.get("/payroll/attendance/daily?month="+month+"&year="+year),
        api.get("/payroll/attendance/day-locks?month="+month+"&year="+year).catch(()=>({data:{}})),
      ]);
      setMonthlyAtt(mRes.data||{});
      setPunchDays(mRes.punchDays||{});
      setAttNotes(mRes.notes||{});
      setDailyAtt(dRes.data||{});
      setDayLocks(lRes.data||{});
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
  const onMonthlyAttChange=(empId,day,status,note)=>{
    const m=month+1;const dateStr=`${year}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    api.post("/payroll/attendance/monthly",{staff_id:empId,date:dateStr,status,note:note||null})
      .then(r=>{ if(!r.success){ alert(r.message||"Attendance save failed"); loadAttendance(); } })
      .catch(err=>{ alert(err.message||"Attendance save failed — din locked ho sakta hai"); loadAttendance(); });
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
    // ESI eligibility on wage (fullGross), deduction on earned gross — no re-proration
    const esi=(esicApplicable&&fullGross<=21000)?Math.round(gross*0.0075):0;
    const pf=pType==="fixed"?pfFull:Math.round((pfFull/WD)*eff);
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

  // Office Staff mode — 5 tabs (Settings gear icon me, right side)
  const TABS_OFFICE=[
    {id:"office-overview", l:t("common.overview"),   sub:t("payroll.team_hr_dashboard")},
    {id:"office-att",      l:t("payroll.attendance"), sub:t("payroll.from_mobile_punch")},
    {id:"office-leave",    l:t("app.leave"),      sub:t("payroll.approvals_holidays")},
    {id:"office-salary",   l:t("finance.salary"),     sub:t("payroll.monthly_run_ledger")},
    {id:"office-advances", l:t("payroll.advances"),   sub:t("payroll.advance_tracking")},
  ];
  // Daily Wages Labour mode — 3 tabs (Settings gear me)
  const TABS_DAILY=[
    {id:"daily-workers",   l:t("common.workers"),           sub:t("payroll.labour_master")},
    {id:"daily-att",       l:t("payroll.daily_attendance"),  sub:t("fuel.project_wise")},
    {id:"daily-payments",  l:t("common.payments"),          sub:t("payroll.weekly_monthly")},
  ];
  const TABS = mode==="office" ? TABS_OFFICE : TABS_DAILY;
  const settingsTabId = mode==="office" ? "office-settings" : "daily-settings";

  // Pending payroll for the CURRENT month/year (real number):
  //   pending = max(0, totalMonthlyNet − paid for this month)
  //   pendingCount = staff who have no Paid record for this month
  const paidThisMonthRecs=salaryRecords.filter(r=>r.status==="Paid"&&r.month===month&&r.year===year);
  const paidThisMonthAmt=paidThisMonthRecs.reduce((s,r)=>s+(r.amount||0),0);
  const manualPending=Math.max(0,totalMonthlyNet-paidThisMonthAmt);
  const paidEmpIds=new Set(paidThisMonthRecs.map(r=>r.id));
  const pendingCount=Math.max(0,staff.length-paidEmpIds.size);

  const TILES_OFFICE=[
    {l:t("payroll.office_staff"),         v:staff.length,        sub:t("payroll.permanent_employees"),               c:T.blu},
    {l:t("payroll.monthly_net_payroll"),  v:`₹${fmt(totalMonthlyNet)}`,  sub:t("payroll.month_year", { month: MONTHS[month], year }),          c:T.grn},
    {l:t("payroll.pending_advances"),     v:`₹${fmt(pendingAdvances)}`,  sub:t("payroll.length_to_deduct", { length: advances.filter(a=>a.status==="Pending deduction").length }), c:T.pur},
    {l:t("payroll.salary_pending"),       v:`₹${fmt(manualPending)}`,    sub:`${pendingCount} ${pendingCount===1?"employee":"employees"} unpaid`, c:manualPending>0?T.amb:T.grn},
  ];
  const TILES_DAILY=[
    {l:t("payroll.daily_workers"),        v:workers.length,              sub:t("payroll.active_labour"),                     c:T.blu},
    {l:t("payroll.payable_this_month"),   v:`₹${fmt(totalDailyPayable)}`,sub:t("payroll.month_year", { month: MONTHS[month], year }),          c:T.grn},
    {l:t("payroll.projects_covered"),     v:(PROJECTS||[]).length,       sub:t("payroll.active_project_sites"),              c:T.pur},
    {l:t("payroll.pending_advances"),     v:`₹${fmt(pendingAdvances)}`,  sub:t("payroll.length_to_deduct", { length: advances.filter(a=>a.status==="Pending deduction").length }), c:T.amb},
  ];
  const TILES = mode==="office" ? TILES_OFFICE : TILES_DAILY;

  return(
    <div style={{background:T.bg,height:"100%",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* Mode Toggle — Office Staff / Daily Wages Labour */}
      <div style={{padding:"12px 18px 0",flexShrink:0}}>
        <div style={{display:"inline-flex",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:3,boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
          <button onClick={()=>setModeAndTab("office")}
            style={{display:"flex",alignItems:"center",gap:7,padding:"8px 18px",border:"none",background:mode==="office"?T.blu:"transparent",color:mode==="office"?"#fff":T.t3,borderRadius:8,fontSize:12.5,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
            <span style={{fontSize:14}}>👔</span> {t("payroll.office_staff")}
          </button>
          <button onClick={()=>setModeAndTab("daily")}
            style={{display:"flex",alignItems:"center",gap:7,padding:"8px 18px",border:"none",background:mode==="daily"?T.amb:"transparent",color:mode==="daily"?"#fff":T.t3,borderRadius:8,fontSize:12.5,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
            <span style={{fontSize:14}}>👷</span> {t("payroll.daily_wages_workers")}
          </button>
        </div>
      </div>

      {/* KPI Tiles — office me sirf Overview par (baaki tabs ko poori height) */}
      {(mode==="daily"||tab==="office-overview")&&<div style={{padding:"10px 18px 8px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {TILES.map((s,i)=>(
            <div key={i} style={{padding:"12px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderTop:`3px solid ${s.c}`}}>
              <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{s.l}</div>
              <div style={{fontSize:20,fontWeight:700,color:T.t1,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:10.5,color:T.t4,marginTop:3}}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>}

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
          {/* Settings — gear (config roz ka kaam nahi, isliye tab nahi) */}
          <button onClick={()=>setTab(settingsTabId)} title={t("common.settings")}
            style={{display:"flex",alignItems:"center",padding:"5px 8px",borderRadius:6,border:"none",background:tab===settingsTabId?"rgba(255,255,255,0.14)":"none",color:tab===settingsTabId?"white":"rgba(255,255,255,0.45)",cursor:"pointer"}}>
            <IcSet size={15} color="currentColor"/>
          </button>
          {/* Export */}
          <button onClick={()=>{
            if(tab==="office-salary"&&salarySub==="monthly"){
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
            }else if(tab==="office-salary"&&salarySub==="ledger"){
              exportCSV(["Name","Designation","Amount","Status","Salary Date","Due Date","Paid Date","Notes"],
                salaryRecords.filter(r=>r.month===month&&r.year===year).map(r=>[r.name,r.designation,r.amount,r.status,r.salaryDate,r.dueDate,r.paidDate||"",r.notes||""]),
                `salary_ledger_${MONTHS[month]}_${year}.csv`);
            }
          }} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.7)",fontSize:11.5,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
            <IcDown size={12} color="currentColor"/> {t("common.export")}
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
          {isAdmin&&<StaffEditRequestsStrip staff={staff} onActed={loadAttendance}/>}
          {/* View toggle + search — Day view (marking) | Month grid (overview) */}
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
            <div style={{display:"inline-flex",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,padding:3}}>
              {[{v:"day",l:t("payroll.aaj_day_view")},{v:"grid",l:t("payroll.month_grid")}].map(o=>(
                <button key={o.v} onClick={()=>setAttView(o.v)}
                  style={{padding:"6px 14px",borderRadius:7,border:"none",background:attView===o.v?T.blu:"transparent",color:attView===o.v?"#fff":T.t3,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                  {o.l}
                </button>
              ))}
            </div>
            {attView==="grid"&&[
              {v:"all",  l:t("common.all"),            n:staff.length},
              {v:"sal",  l:t("payroll.salary_staff"), n:staff.filter(s=>s.salaryEnabled!==false).length},
              {v:"app",  l:t("payroll.app_users"),    n:staff.filter(s=>s.isAppUser).length},
            ].map(f=>(
              <button key={f.v} onClick={()=>setAttFilter(f.v)}
                style={{padding:"5px 12px",borderRadius:14,border:`1.5px solid ${attFilter===f.v?T.blu:T.b1}`,background:attFilter===f.v?T.bluL:T.surface,color:attFilter===f.v?T.blu:T.t3,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                {f.l} <span style={{opacity:.6}}>({f.n})</span>
              </button>
            ))}
            <input value={attSearch} onChange={e=>setAttSearch(e.target.value)} placeholder={t("payroll.search_name")}
              style={{marginLeft:"auto",height:28,padding:"0 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",width:160}}/>
          </div>
          {attView==="day"?(
            <DayAttendanceView
              staff={staff.filter(s=>!attSearch||s.name.toLowerCase().includes(attSearch.toLowerCase()))}
              att={monthlyAtt} setAtt={setMonthlyAtt} month={month} year={year} onAttChange={onMonthlyAttChange} holidays={holidays} punchDays={punchDays}
              notes={attNotes} dayLocks={dayLocks} isAdmin={isAdmin} onLocksChanged={loadAttendance}/>
          ):(
            <MonthlyAttGrid
              staff={staff
                .filter(s=>attFilter==="all"?true:attFilter==="sal"?s.salaryEnabled!==false:s.isAppUser)
                .filter(s=>!attSearch||s.name.toLowerCase().includes(attSearch.toLowerCase()))}
              att={monthlyAtt} setAtt={setMonthlyAtt} month={month} year={year} onAttChange={onMonthlyAttChange} holidays={holidays} punchDays={punchDays}
              dayLocks={dayLocks}/>
          )}
          </>
        )}
        {mode==="office" && tab==="office-overview" && (
          <OverviewTab isAdmin={isAdmin} setTab={setTab}
            onOpenSalary={(sub)=>{ setSalarySub(sub); setTab("office-salary"); }}/>
        )}
        {mode==="office" && tab==="office-leave" && (
          <LeaveTab staff={staff} month={month} year={year} isAdmin={isAdmin} onAttendanceChanged={loadAttendance}
            holidays={holidays} setHolidays={setHolidays}/>
        )}
        {mode==="office" && tab==="office-salary" && (
          <div>
            {/* Salary group — Monthly / Create Salary / Ledger */}
            <div style={{display:"flex",gap:6,marginBottom:14,borderBottom:`1px solid ${T.b1}`,paddingBottom:6}}>
              {[
                {id:"monthly", l:t("payroll.monthly_salary"), c:T.blu},
                ...(isAdmin?[{id:"run", l:t("payroll.create_salary"), c:T.grn}]:[]),
                {id:"ledger",  l:t("payroll.salary_ledger"), c:T.pur},
              ].map(s=>(
                <button key={s.id} onClick={()=>setSalarySub(s.id)}
                  style={{padding:"6px 13px",borderRadius:7,border:"none",background:salarySub===s.id?s.c:"transparent",color:salarySub===s.id?"white":T.t3,fontSize:12,fontWeight:salarySub===s.id?700:500,cursor:"pointer",transition:"all .15s"}}>
                  {s.l}
                </button>
              ))}
            </div>
            {salarySub==="monthly" && (
              <MonthlySalaryTab staff={staff} att={monthlyAtt} month={month} year={year} advances={advances} workingDays={WORKING_DAYS} holidays={holidays} onViewSlip={(emp,pType)=>{setSelSlipEmp(emp);setSelSlipPayType(pType||emp.paymentType||"fixed");}} isAdmin={isAdmin} onStaffUpdate={loadAll}/>
            )}
            {salarySub==="run" && (
              isAdmin
                ? <PayrollRunWizard month={month} year={year} isAdmin={isAdmin} workingDays={workingDays}
                    setTab={(id)=>{ if(id==="office-salary") setSalarySub("monthly"); else setTab(id); }} onChanged={loadAll}/>
                : <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>{t("payroll.create_salary_run_is_only_accessible")}</div>
            )}
            {salarySub==="ledger" && (
              <SalaryLedgerTab salaryRecords={salaryRecords} setSalaryRecords={setSalaryRecords} month={month} year={year}/>
            )}
          </div>
        )}
        {mode==="office" && tab==="office-advances" && (
          <AdvancesTab advances={advances} setAdvances={setAdvances} isAdmin={isAdmin}/>
        )}
        {mode==="office" && tab==="office-settings" && (
          isAdmin ? (
            <div>
              {/* Settings group — Payroll Config / Sites & Geofences */}
              <div style={{display:"flex",gap:6,marginBottom:14,borderBottom:`1px solid ${T.b1}`,paddingBottom:6}}>
                {[
                  {id:"config", l:t("payroll.payroll_config"), c:T.blu},
                  {id:"sites",  l:t("payroll.sites_geofences"), c:T.grn},
                ].map(s=>(
                  <button key={s.id} onClick={()=>setSettingsSub(s.id)}
                    style={{padding:"6px 13px",borderRadius:7,border:"none",background:settingsSub===s.id?s.c:"transparent",color:settingsSub===s.id?"white":T.t3,fontSize:12,fontWeight:settingsSub===s.id?700:500,cursor:"pointer",transition:"all .15s"}}>
                    {s.l}
                  </button>
                ))}
              </div>
              {settingsSub==="config"
                ? <PayrollSettingsTab defaultDueDays={defaultDueDays} setDefaultDueDays={setDefaultDueDays} workingDays={workingDays} setWorkingDays={setWorkingDays}/>
                : <GeofenceAdminTab isAdmin={isAdmin}/>}
            </div>
          ) : <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>{t("payroll.settings_are_only_accessible_to_admins")}</div>
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
            : <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>{t("payroll.settings_are_only_accessible_to_admins")}</div>
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
